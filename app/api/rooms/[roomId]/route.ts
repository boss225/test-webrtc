import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Get room details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    
    const { data: room, error } = await supabaseAdmin
      .from('rooms')
      .select(`
        *,
        creator:created_by(id, username, email, avatar_url)
      `)
      .eq('id', roomId)
      .single();

    if (error) throw error;

    return NextResponse.json(room);
  } catch (error) {
    console.error('Get room error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi lấy thông tin phòng' },
      { status: 500 }
    );
  }
}

// Update room (only owner)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const { userId, name, description, maxParticipants, isActive } = await request.json();

    // Check if user is room owner
    const { data: room } = await supabaseAdmin
      .from('rooms')
      .select('created_by')
      .eq('id', roomId)
      .single();

    if (room?.created_by !== userId) {
      return NextResponse.json(
        { error: 'Chỉ chủ phòng mới có thể chỉnh sửa' },
        { status: 403 }
      );
    }

    const updates: any = {};
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (maxParticipants) updates.max_participants = maxParticipants;
    if (isActive !== undefined) updates.is_active = isActive;

    const { data: updatedRoom, error } = await supabaseAdmin
      .from('rooms')
      .update(updates)
      .eq('id', roomId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(updatedRoom);
  } catch (error) {
    console.error('Update room error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi cập nhật phòng' },
      { status: 500 }
    );
  }
}

// Delete room (only owner)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const { userId } = await request.json();

    console.log('[Delete Room] Request:', { roomId, userId });

    // Check if user is room owner
    const { data: room } = await supabaseAdmin
      .from('rooms')
      .select('created_by, name')
      .eq('id', roomId)
      .single();

    if (!room) {
      return NextResponse.json(
        { error: 'Phòng không tồn tại' },
        { status: 404 }
      );
    }

    if (room.created_by !== userId) {
      return NextResponse.json(
        { error: 'Chỉ chủ phòng mới có thể xóa phòng' },
        { status: 403 }
      );
    }

    // Delete room (cascade will delete participants, messages, etc.)
    const { error } = await supabaseAdmin
      .from('rooms')
      .delete()
      .eq('id', roomId);

    if (error) throw error;

    console.log('[Delete Room] Success:', roomId);

    return NextResponse.json({ 
      success: true,
      message: `Đã xóa phòng "${room.name}"`
    });
  } catch (error) {
    console.error('Delete room error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi xóa phòng' },
      { status: 500 }
    );
  }
}