import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import type { ParticipantWithUser } from '@/lib/supabase-types';
import { errorResponse, successResponse, extractUsername, USER_SELECT_FIELDS } from '@/lib/api-helpers';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const { adminUserId, targetUserId, reason } = await request.json();

    console.log('[Kick User] Request:', { roomId, adminUserId, targetUserId });

    // Validate inputs
    if (!adminUserId || !targetUserId) {
      return NextResponse.json(
        errorResponse('adminUserId và targetUserId là bắt buộc'),
        { status: 400 }
      );
    }

    // Check if admin is room owner or admin
    const { data: adminParticipant } = await supabaseAdmin
      .from('room_participants')
      .select('role')
      .eq('room_id', roomId)
      .eq('user_id', adminUserId)
      .maybeSingle();

    if (!adminParticipant || !['owner', 'admin'].includes(adminParticipant.role)) {
      return NextResponse.json(
        errorResponse('Bạn không có quyền loại bỏ thành viên'),
        { status: 403 }
      );
    }

    // Get target participant with user info
    const { data: rawParticipant, error: targetError } = await supabaseAdmin
      .from('room_participants')
      .select(`
        role,
        users:user_id (${USER_SELECT_FIELDS})
      `)
      .eq('room_id', roomId)
      .eq('user_id', targetUserId)
      .single();

    if (targetError || !rawParticipant) {
      console.error('[Kick User] Target not found:', targetError);
      return NextResponse.json(
        errorResponse('User không có trong phòng'),
        { status: 404 }
      );
    }

    // Type assertion
    const targetParticipant = rawParticipant as unknown as ParticipantWithUser;

    // Cannot kick owner
    if (targetParticipant.role === 'owner') {
      return NextResponse.json(
        errorResponse('Không thể loại bỏ chủ phòng'),
        { status: 403 }
      );
    }

    // Extract username safely
    const targetUsername = extractUsername(targetParticipant.users);

    // Remove from room
    const { error: kickError } = await supabaseAdmin
      .from('room_participants')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', targetUserId);

    if (kickError) {
      console.error('[Kick User] Delete error:', kickError);
      throw kickError;
    }

    console.log('[Kick User] Success:', targetUserId);

    return NextResponse.json(
      successResponse(
        { kicked_user_id: targetUserId },
        `Đã loại bỏ ${targetUsername} khỏi phòng`
      )
    );
  } catch (error) {
    console.error('[Kick User] Unexpected error:', error);
    return NextResponse.json(
      errorResponse(
        'Lỗi khi loại bỏ user',
        error instanceof Error ? error.message : undefined
      ),
      { status: 500 }
    );
  }
}