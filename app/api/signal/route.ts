import { NextResponse } from 'next/server';
import messageStore from '@/lib/messageStore';

export async function POST(request: Request) {
  try {
    const signal = await request.json();
    messageStore.sendSignal(signal);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Lỗi khi gửi signal' },
      { status: 500 }
    );
  }
}