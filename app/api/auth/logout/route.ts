import { NextResponse } from 'next/server';
import sessionStore from '@/lib/sessionStore';
import messageStore from '@/lib/messageStore';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }

    // Xóa session
    sessionStore.deleteSession(userId);

    // Xóa participant
    messageStore.removeParticipant(userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi đăng xuất' },
      { status: 500 }
    );
  }
}