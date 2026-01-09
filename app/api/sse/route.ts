import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const roomId = url.searchParams.get('roomId');

  console.log('[SSE] New connection for room:', roomId);

  if (!roomId) {
    console.error('[SSE] Missing roomId parameter');
    return new Response('Missing roomId parameter', { status: 400 });
  }

  // Validate roomId format (UUID)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(roomId)) {
    console.error('[SSE] Invalid roomId format:', roomId);
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
          .single();

        if (roomError || !room) {
          console.error('[SSE] Room not found:', roomId, roomError);
          const errorData = `data: ${JSON.stringify({ 
            type: 'error', 
            message: 'Room not found' 
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(errorData));
          controller.close();
          return;
        }

        console.log('[SSE] Room verified:', room.name);

        // Lấy messages từ database - FILTER BY ROOM_ID
        const { data: messages, error } = await supabaseAdmin
          .from('messages')
          .select('*')
          .eq('room_id', roomId) // ← IMPORTANT: Filter by room
          .order('created_at', { ascending: true })
          .limit(100);

        if (error) {
          console.error('[SSE] Error loading messages:', error);
        } else {
          console.log('[SSE] Loaded', messages?.length || 0, 'messages for room:', roomId);
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
        const channelName = `room_${roomId}_messages`;
        console.log('[SSE] Creating channel:', channelName);

        const channel = supabaseAdmin
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              filter: `room_id=eq.${roomId}`, // ← IMPORTANT: Filter by room
            },
            (payload) => {
              console.log('[SSE] New message received:', {
                id: payload.new.id,
                room_id: payload.new.room_id,
                username: payload.new.username,
                text: payload.new.text?.substring(0, 50)
              });

              // Double check room_id
              if (payload.new.room_id === roomId) {
                const data = `data: ${JSON.stringify(payload.new)}\n\n`;
                try {
                  controller.enqueue(new TextEncoder().encode(data));
                  console.log('[SSE] Message sent to client');
                } catch (error) {
                  console.error('[SSE] Error sending message to client:', error);
                }
              } else {
                console.warn('[SSE] Received message for different room:', payload.new.room_id);
              }
            }
          )
          .subscribe((status) => {
            console.log('[SSE] Subscription status:', status, 'for room:', roomId);
          });

        // Heartbeat
        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(new TextEncoder().encode(':heartbeat\n\n'));
          } catch (error) {
            console.error('[SSE] Heartbeat error:', error);
            clearInterval(heartbeat);
            channel.unsubscribe();
          }
        }, 30000);

        // Cleanup
        request.signal.addEventListener('abort', () => {
          console.log('[SSE] Connection closed for room:', roomId);
          clearInterval(heartbeat);
          channel.unsubscribe();
          try {
            controller.close();
          } catch (e) {
            // Already closed
          }
        });
      } catch (error) {
        console.error('[SSE] Setup error:', error);
        const errorData = `data: ${JSON.stringify({ 
          type: 'error', 
          message: 'Setup error' 
        })}\n\n`;
        try {
          controller.enqueue(new TextEncoder().encode(errorData));
          controller.close();
        } catch (e) {
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