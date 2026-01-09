import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const roomId = url.searchParams.get('roomId');

  const responseStream = new ReadableStream({
    async start(controller) {
      // Lấy messages từ database
      const { data: messages, error } = await supabaseAdmin
        .from('messages')
        .select('*')
        .eq('room_id', roomId || '')
        .order('created_at', { ascending: true })
        .limit(100);

      if (!error && messages) {
        const initialData = `data: ${JSON.stringify({ 
          type: 'initial', 
          messages 
        })}\n\n`;
        controller.enqueue(new TextEncoder().encode(initialData));
      }

      // Subscribe to realtime changes
      const channel = supabaseAdmin
        .channel(`room:${roomId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `room_id=eq.${roomId}`,
          },
          (payload) => {
            const data = `data: ${JSON.stringify(payload.new)}\n\n`;
            try {
              controller.enqueue(new TextEncoder().encode(data));
            } catch (error) {
              console.error('Error sending message:', error);
            }
          }
        )
        .subscribe();

      // Heartbeat
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(':heartbeat\n\n'));
        } catch (error) {
          clearInterval(heartbeat);
          channel.unsubscribe();
        }
      }, 30000);

      // Cleanup
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        channel.unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(responseStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}