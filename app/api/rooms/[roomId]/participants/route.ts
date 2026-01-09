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
    console.log('[GET Participants] Room ID:', roomId);

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
      console.error('[GET Participants] Database error:', error);
      throw error;
    }

    console.log('[GET Participants] Success:', participants?.length || 0, 'participants');
    return NextResponse.json(participants || []);
  } catch (error) {
    console.error('[GET Participants] Error:', error);
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

    console.log('[POST Participants] Request:', {
      roomId,
      userId,
      isCameraOn,
      isMicOn
    });

    // Validate inputs
    if (!userId) {
      console.error('[POST Participants] Missing userId');
      return NextResponse.json(
        { error: 'userId là bắt buộc' },
        { status: 400 }
      );
    }

    if (!roomId) {
      console.error('[POST Participants] Missing roomId');
      return NextResponse.json(
        { error: 'roomId không hợp lệ' },
        { status: 400 }
      );
    }

    // Verify user exists
    console.log('[POST Participants] Verifying user exists:', userId);
    const { data: userExists, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, username')
      .eq('id', userId)
      .maybeSingle();

    if (userError) {
      console.error('[POST Participants] User query error:', userError);
      return NextResponse.json(
        { error: 'Lỗi khi kiểm tra user', details: userError.message },
        { status: 500 }
      );
    }

    if (!userExists) {
      console.error('[POST Participants] User not found:', userId);
      return NextResponse.json(
        { error: 'User không tồn tại', userId },
        { status: 404 }
      );
    }

    console.log('[POST Participants] User found:', userExists);

    // Verify room exists
    console.log('[POST Participants] Verifying room exists:', roomId);
    const { data: roomExists, error: roomError } = await supabaseAdmin
      .from('rooms')
      .select('id, name, max_participants')
      .eq('id', roomId)
      .maybeSingle();

    if (roomError) {
      console.error('[POST Participants] Room query error:', roomError);
      return NextResponse.json(
        { error: 'Lỗi khi kiểm tra room', details: roomError.message },
        { status: 500 }
      );
    }

    if (!roomExists) {
      console.error('[POST Participants] Room not found:', roomId);
      return NextResponse.json(
        { error: 'Room không tồn tại', roomId },
        { status: 404 }
      );
    }

    console.log('[POST Participants] Room found:', roomExists);

    // Check if participant already exists
    console.log('[POST Participants] Checking existing participant');
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('room_participants')
      .select('id, is_camera_on, is_mic_on')
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .maybeSingle() as { data: Pick<ParticipantRow, 'id' | 'is_camera_on' | 'is_mic_on'> | null; error: Error | null };

    if (checkError) {
      console.error('[POST Participants] Check error:', checkError);
      return NextResponse.json(
        { error: 'Lỗi khi kiểm tra participant', details: checkError.message },
        { status: 500 }
      );
    }

    if (existing) {
      console.log('[POST Participants] Participant exists, updating:', existing.id);

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
        console.error('[POST Participants] Update error:', updateError);
        return NextResponse.json(
          { error: 'Lỗi khi cập nhật participant', details: updateError.message },
          { status: 500 }
        );
      }

      console.log('[POST Participants] Updated successfully:', participant);
      return NextResponse.json({
        success: true,
        participant,
        message: 'Đã cập nhật thông tin'
      });
    } else {
      console.log('[POST Participants] Creating new participant');

      // Check if room is full
      const { count } = await supabaseAdmin
        .from('room_participants')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', roomId);

      const maxParticipants = (roomExists as RoomRow)?.max_participants ?? 0;
      if (count && count >= maxParticipants) {
        console.error('[POST Participants] Room is full');
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
        console.error('[POST Participants] Insert error:', insertError);
        return NextResponse.json(
          { error: 'Lỗi khi tạo participant', details: insertError.message },
          { status: 500 }
        );
      }

      console.log('[POST Participants] Created successfully:', participant);
      return NextResponse.json({
        success: true,
        participant,
        message: 'Đã tham gia phòng'
      });
    }
  } catch (error) {
    console.error('[POST Participants] Unexpected error:', error);
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

    console.log('[DELETE Participants] Request:', { roomId, userId });

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
      console.error('[DELETE Participants] Error:', error);
      return NextResponse.json(
        { error: 'Lỗi khi rời phòng', details: error.message },
        { status: 500 }
      );
    }

    console.log('[DELETE Participants] Success');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE Participants] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Lỗi không mong muốn khi rời phòng',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}