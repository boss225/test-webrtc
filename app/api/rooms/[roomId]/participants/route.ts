import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import type { Database } from '@/lib/supabase-types';

type ParticipantRow = Database['public']['Tables']['room_participants']['Row'];
type RoomRow = Database['public']['Tables']['rooms']['Row'];

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

    if (error) {
      throw error;
    }

    return NextResponse.json(participants || []);
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Lỗi khi lấy danh sách thành viên',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
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
    const body = await request.json();
    const { userId, isCameraOn, isMicOn } = body;

    // Validate inputs
    if (!userId) {
      return NextResponse.json(
        { error: 'userId là bắt buộc' },
        { status: 400 }
      );
    }

    if (!roomId) {
      return NextResponse.json(
        { error: 'roomId không hợp lệ' },
        { status: 400 }
      );
    }

    // Verify user exists
    const { data: userExists, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, username')
      .eq('id', userId)
      .maybeSingle();

    if (userError) {
      return NextResponse.json(
        { error: 'Lỗi khi kiểm tra user', details: userError.message },
        { status: 500 }
      );
    }

    if (!userExists) {
      return NextResponse.json(
        { error: 'User không tồn tại', userId },
        { status: 404 }
      );
    }

    // Verify room exists
    const { data: roomExists, error: roomError } = await supabaseAdmin
      .from('rooms')
      .select('id, name, max_participants')
      .eq('id', roomId)
      .maybeSingle();

    if (roomError) {
      return NextResponse.json(
        { error: 'Lỗi khi kiểm tra room', details: roomError.message },
        { status: 500 }
      );
    }

    if (!roomExists) {
      return NextResponse.json(
        { error: 'Room không tồn tại', roomId },
        { status: 404 }
      );
    }

    // Check if participant already exists
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('room_participants')
      .select('id, is_camera_on, is_mic_on')
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .maybeSingle() as { data: Pick<ParticipantRow, 'id' | 'is_camera_on' | 'is_mic_on'> | null; error: Error | null };

    if (checkError) {
      return NextResponse.json(
        { error: 'Lỗi khi kiểm tra participant', details: checkError.message },
        { status: 500 }
      );
    }

    if (existing) {

      // Update existing participant
      const { data: participant, error: updateError } = await supabaseAdmin
        .from('room_participants')
        // @ts-expect-error - Supabase type inference issue with Database types
        .update({
          is_camera_on: isCameraOn ?? existing.is_camera_on ?? false,
          is_mic_on: isMicOn ?? existing.is_mic_on ?? true
        })
        .eq('id', existing.id)
        .select(`
          *,
          users:user_id (
            id,
            username,
            is_online
          )
        `)
        .single();

      if (updateError) {
        return NextResponse.json(
          { error: 'Lỗi khi cập nhật participant', details: updateError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        participant,
        message: 'Đã cập nhật thông tin'
      });
    } else {

      // Check if room is full
      const { count } = await supabaseAdmin
        .from('room_participants')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', roomId);

      const maxParticipants = (roomExists as RoomRow)?.max_participants ?? 0;
      if (count && count >= maxParticipants) {
        return NextResponse.json(
          { error: 'Phòng đã đầy' },
          { status: 403 }
        );
      }

      const { data: room } = await supabaseAdmin
        .from('rooms')
        .select('created_by')
        .eq('id', roomId)
        .single() as { data: Pick<RoomRow, 'created_by'> | null; error: Error | null };

      const role = room?.created_by === userId ? 'owner' : 'member';

      // Add new participant
      const { data: participant, error: insertError } = await supabaseAdmin
        .from('room_participants')
        // @ts-expect-error - Supabase type inference issue with Database types
        .insert({
          room_id: roomId,
          user_id: userId,
          is_camera_on: isCameraOn ?? false,
          is_mic_on: isMicOn ?? true,
          role: role,
        })
        .select(`
        *,
        users:user_id (
          id,
          username,
          is_online
        )
      `)
        .single();

      if (insertError) {
        return NextResponse.json(
          { error: 'Lỗi khi tạo participant', details: insertError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        participant,
        message: 'Đã tham gia phòng'
      });
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Lỗi không mong muốn khi tham gia phòng',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
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
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId là bắt buộc' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('room_participants')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', userId);

    if (error) {
      return NextResponse.json(
        { error: 'Lỗi khi rời phòng', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Lỗi không mong muốn khi rời phòng',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}