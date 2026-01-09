import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import type { BlacklistWithUser, ParticipantRow } from '@/lib/supabase-types';
import { errorResponse, successResponse, USER_SELECT_FIELDS } from '@/lib/api-helpers';

// Get blacklist
export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;

    const { data: blacklist, error } = await supabaseAdmin
      .from('room_blacklist')
      .select(`
        *,
        blocked_user:blocked_user_id(${USER_SELECT_FIELDS}),
        blocker:blocked_by(username)
      `)
      .eq('room_id', roomId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(successResponse(blacklist || []));
  } catch (error) {
    console.error('Get blacklist error:', error);
    return NextResponse.json(
      errorResponse('Lỗi khi lấy danh sách chặn'),
      { status: 500 }
    );
  }
}

// Add to blacklist
export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const { adminUserId, targetUserId, targetEmail, reason } = await request.json();

    console.log('[Add Blacklist] Request:', { 
      roomId, 
      adminUserId, 
      targetUserId, 
      targetEmail 
    });

    // Validate
    if (!targetUserId && !targetEmail) {
      return NextResponse.json(
        errorResponse('Phải cung cấp targetUserId hoặc targetEmail'),
        { status: 400 }
      );
    }

    // Check admin permission
    const { data: adminParticipant } = await supabaseAdmin
      .from('room_participants')
      .select('role')
      .eq('room_id', roomId)
      .eq('user_id', adminUserId)
      .maybeSingle() as { data: Pick<ParticipantRow, 'role'> | null; error: Error | null };

    if (!adminParticipant || !['owner', 'admin'].includes(adminParticipant.role)) {
      return NextResponse.json(
        errorResponse('Bạn không có quyền chặn thành viên'),
        { status: 403 }
      );
    }

    // Check if already blacklisted
    let existingQuery = supabaseAdmin
      .from('room_blacklist')
      .select('id')
      .eq('room_id', roomId);

    if (targetUserId) {
      existingQuery = existingQuery.eq('blocked_user_id', targetUserId);
    } else if (targetEmail) {
      existingQuery = existingQuery.eq('blocked_email', targetEmail);
    }

    const { data: existing } = await existingQuery.maybeSingle();

    if (existing) {
      return NextResponse.json(
        errorResponse('User/Email này đã bị chặn'),
        { status: 409 }
      );
    }

    // Add to blacklist
    const { data: rawBlacklistEntry, error } = await supabaseAdmin
      .from('room_blacklist')
      // @ts-expect-error - Supabase type inference issue with Database types
      .insert({
        room_id: roomId,
        blocked_user_id: targetUserId || null,
        blocked_email: targetEmail?.toLowerCase() || null,
        blocked_by: adminUserId,
        reason: reason || null,
      })
      .select(`
        *,
        blocked_user:blocked_user_id(${USER_SELECT_FIELDS})
      `)
      .single();

    if (error) throw error;

    // Type assertion
    const blacklistEntry = rawBlacklistEntry as unknown as BlacklistWithUser;

    // Kick user if in room
    if (targetUserId) {
      await supabaseAdmin
        .from('room_participants')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', targetUserId);
    }

    console.log('[Add Blacklist] Success:', blacklistEntry.id);

    return NextResponse.json(
      successResponse(blacklistEntry, 'Đã chặn user thành công')
    );
  } catch (error) {
    console.error('Add blacklist error:', error);
    return NextResponse.json(
      errorResponse('Lỗi khi thêm vào blacklist'),
      { status: 500 }
    );
  }
}

// Remove from blacklist
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const { adminUserId, blacklistId } = await request.json();

    console.log('[Remove Blacklist] Request:', { roomId, adminUserId, blacklistId });

    // Check admin permission
    const { data: adminParticipant } = await supabaseAdmin
      .from('room_participants')
      .select('role')
      .eq('room_id', roomId)
      .eq('user_id', adminUserId)
      .maybeSingle() as { data: Pick<ParticipantRow, 'role'> | null; error: Error | null };

    if (!adminParticipant || !['owner', 'admin'].includes(adminParticipant.role)) {
      return NextResponse.json(
        errorResponse('Bạn không có quyền bỏ chặn'),
        { status: 403 }
      );
    }

    // Remove from blacklist
    const { error } = await supabaseAdmin
      .from('room_blacklist')
      .delete()
      .eq('id', blacklistId)
      .eq('room_id', roomId);

    if (error) throw error;

    console.log('[Remove Blacklist] Success:', blacklistId);

    return NextResponse.json(
      successResponse({ blacklistId }, 'Đã bỏ chặn thành công')
    );
  } catch (error) {
    console.error('Remove blacklist error:', error);
    return NextResponse.json(
      errorResponse('Lỗi khi bỏ chặn'),
      { status: 500 }
    );
  }
}