import { supabaseAdmin, supabaseRealtime } from '@/lib/supabase';
import type { Database } from '@/lib/supabase-types';

type RoomRow = Database['public']['Tables']['rooms']['Row'];

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const roomId = url.searchParams.get('roomId');

  if (!roomId) {
    return new Response('Missing roomId parameter', { status: 400 });
  }

  // Validate roomId format (UUID)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(roomId)) {
    return new Response('Invalid roomId format', { status: 400 });
  }

  const responseStream = new ReadableStream({
    async start(controller) {
      try {
        // Verify room exists
        const { data: room, error: roomError } = await supabaseAdmin
          .from('rooms')
          .select('id, name')
          .eq('id', roomId)
          .single() as { data: Pick<RoomRow, 'id' | 'name'> | null; error: Error | null };

        if (roomError || !room) {
          const errorData = `data: ${JSON.stringify({ 
            type: 'error', 
            message: 'Room not found' 
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(errorData));
          controller.close();
          return;
        }

        // Lấy messages từ database - FILTER BY ROOM_ID
        const { data: messages, error } = await supabaseAdmin
          .from('messages')
          .select('*')
          .eq('room_id', roomId)
          .order('created_at', { ascending: true })
          .limit(100);

        if (error) {
          // Silent fail, continue with empty messages
        }

        // Gửi messages hiện có
        const initialData = `data: ${JSON.stringify({ 
          type: 'initial', 
          messages: messages || [],
          roomId: roomId,
          roomName: room.name
        })}\n\n`;
        controller.enqueue(new TextEncoder().encode(initialData));

        // Subscribe to realtime changes - FILTER BY ROOM_ID
        // Use supabaseRealtime (anon key) instead of supabaseAdmin for realtime subscriptions
        const channelName = `room_${roomId}_messages_${Date.now()}`;

        let channel: ReturnType<typeof supabaseRealtime.channel> | null = null;
        let subscriptionRetries = 0;
        const maxSubscriptionRetries = 3;

        const setupRealtimeSubscription = () => {
          if (!channel) {
            channel = supabaseRealtime
              .channel(channelName, {
                config: {
                  broadcast: { self: false },
                  presence: { key: roomId },
                },
              })
              .on(
                'postgres_changes',
                {
                  event: 'INSERT',
                  schema: 'public',
                  table: 'messages',
                  filter: `room_id=eq.${roomId}`, // ← IMPORTANT: Filter by room
                },
                (payload) => {
                  // Double check room_id
                  if (payload.new.room_id === roomId) {
                    const messageData = {
                      id: payload.new.id,
                      room_id: payload.new.room_id,
                      user_id: payload.new.user_id,
                      username: payload.new.username,
                      text: payload.new.text,
                      created_at: payload.new.created_at,
                    };
                    const data = `data: ${JSON.stringify(messageData)}\n\n`;
                    try {
                      controller.enqueue(new TextEncoder().encode(data));
                    } catch {
                      // Silent fail
                    }
                  }
                }
              )
              .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                  subscriptionRetries = 0;
                } else if (status === 'CHANNEL_ERROR') {
                  if (subscriptionRetries < maxSubscriptionRetries) {
                    subscriptionRetries++;
                    setTimeout(() => {
                      if (channel) {
                        channel.unsubscribe();
                        channel = null;
                        setupRealtimeSubscription();
                      }
                    }, 2000);
                  }
                } else if (status === 'TIMED_OUT') {
                  if (subscriptionRetries < maxSubscriptionRetries) {
                    subscriptionRetries++;
                    setTimeout(() => {
                      if (channel) {
                        channel.unsubscribe();
                        channel = null;
                        setupRealtimeSubscription();
                      }
                    }, 2000);
                  }
                }
              });
          }
        };

        // Initial subscription
        setupRealtimeSubscription();

        // Monitor channel health
        const healthCheck = setInterval(() => {
          if (channel) {
            const channelState = channel.state;
            if (channelState === 'closed' || channelState === 'errored') {
              channel.unsubscribe();
              channel = null;
              setupRealtimeSubscription();
            }
          }
        }, 60000);

        // Heartbeat
        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(new TextEncoder().encode(':heartbeat\n\n'));
          } catch {
            clearInterval(heartbeat);
            if (channel) {
              channel.unsubscribe();
              channel = null;
            }
          }
        }, 30000);

        // Cleanup
        request.signal.addEventListener('abort', () => {
          clearInterval(heartbeat);
          clearInterval(healthCheck);
          if (channel) {
            channel.unsubscribe();
            channel = null;
          }
          try {
            controller.close();
          } catch {
            // Already closed
          }
        });
      } catch {
        const errorData = `data: ${JSON.stringify({ 
          type: 'error', 
          message: 'Setup error' 
        })}\n\n`;
        try {
          controller.enqueue(new TextEncoder().encode(errorData));
          controller.close();
        } catch {
          // Ignore
        }
      }
    },
  });

  return new Response(responseStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}