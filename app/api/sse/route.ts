import messageStore from '@/lib/messageStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const responseStream = new ReadableStream({
    async start(controller) {
      // Gửi tất cả tin nhắn hiện có
      const existingMessages = messageStore.getMessages();
      const initialData = `data: ${JSON.stringify({ 
        type: 'initial', 
        messages: existingMessages 
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(initialData));

      // Thêm client vào store
      messageStore.addClient(controller);

      // Gửi heartbeat mỗi 30 giây
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(':heartbeat\n\n'));
        } catch (error) {
          clearInterval(heartbeat);
          messageStore.removeClient(controller);
        }
      }, 30000);

      // Cleanup khi client ngắt kết nối
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        messageStore.removeClient(controller);
        controller.close();
      });
    },
  });

  return new Response(responseStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable Nginx buffering
    },
  });
}