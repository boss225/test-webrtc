import { NextResponse } from 'next/server';
import messageStore from '@/lib/messageStore';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, text } = body;

    if (!username || !text) {
      return NextResponse.json(
        { error: 'Username và message là bắt buộc' },
        { status: 400 }
      );
    }

    const message = messageStore.addMessage({
      username,
      text,
      timestamp: new Date(),
    });

    return NextResponse.json(message);
  } catch (error) {
    return NextResponse.json(
      { error: 'Lỗi khi gửi tin nhắn' },
      { status: 500 }
    );
  }
}