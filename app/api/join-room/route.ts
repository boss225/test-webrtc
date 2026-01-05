import { NextResponse } from 'next/server';
import messageStore from '@/lib/messageStore';

export async function POST(request: Request) {
  try {
    const participant = await request.json();
    messageStore.addParticipant(participant);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Lỗi khi tham gia phòng' },
      { status: 500 }
    );
  }
}