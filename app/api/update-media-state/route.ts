import { NextResponse } from 'next/server';
import messageStore from '@/lib/messageStore';

export async function POST(request: Request) {
  try {
    const { userId, isCameraOn, isMicOn } = await request.json();
    messageStore.updateParticipantMediaState(userId, isCameraOn, isMicOn);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Lỗi khi cập nhật trạng thái media' },
      { status: 500 }
    );
  }
}