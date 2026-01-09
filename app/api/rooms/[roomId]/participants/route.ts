import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    
    const { data: participants, error } = await supabaseAdmin
      .from('room_participants')
      .select(`
        *,
        users:user_id (
          id,
          username,
          is_online
        )
      `)
      .eq('room_id', roomId);

    if (error) throw error;

    return NextResponse.json(participants);
  } catch (error) {
    console.error('Get participants error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi lấy danh sách thành viên' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const { userId, isCameraOn, isMicOn } = await request.json();

    // Kiểm tra user đã join chưa
    const { data: existing } = await supabaseAdmin
      .from('room_participants')
      .select('id')
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      // Update existing participant
      const { data: participant, error } = await supabaseAdmin
        .from('room_participants')
        .update({ is_camera_on: isCameraOn, is_mic_on: isMicOn })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(participant);
    } else {
      // Add new participant
      const { data: participant, error } = await supabaseAdmin
        .from('room_participants')
        .insert({
          room_id: roomId,
          user_id: userId,
          is_camera_on: isCameraOn,
          is_mic_on: isMicOn,
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(participant);
    }
  } catch (error) {
    console.error('Join room error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi tham gia phòng' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const { userId } = await request.json();

    const { error } = await supabaseAdmin
      .from('room_participants')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', userId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Leave room error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi rời phòng' },
      { status: 500 }
    );
  }
}