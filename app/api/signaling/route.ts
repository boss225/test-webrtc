import messageStore from '@/lib/messageStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');

  if (!userId) {
    return new Response('Missing userId', { status: 400 });
  }

  const responseStream = new ReadableStream({
    async start(controller) {
      // Gửi danh sách participants hiện tại
      const participants = messageStore.getParticipants();
      const initialData = `data: ${JSON.stringify({ 
        type: 'initial-participants', 
        participants 
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(initialData));

      // Thêm signaling client
      messageStore.addSignalingClient(userId, controller);

      // Heartbeat
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(':heartbeat\n\n'));
        } catch (error) {
          clearInterval(heartbeat);
          messageStore.removeSignalingClient(userId);
        }
      }, 30000);

      // Cleanup
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        messageStore.removeSignalingClient(userId);
        messageStore.removeParticipant(userId);
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