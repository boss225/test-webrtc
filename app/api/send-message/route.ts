import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import type { Database, MessageRow } from '@/lib/supabase-types';

type UserRow = Database['public']['Tables']['users']['Row'];
type RoomRow = Database['public']['Tables']['rooms']['Row'];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, text, roomId, userId } = body;

    // Validation
    if (!username || !text || !roomId) {
      return NextResponse.json(
        { error: 'Username, text và roomId là bắt buộc' },
        { status: 400 }
      );
    }

    if (!text.trim()) {
      return NextResponse.json(
        { error: 'Message không được để trống' },
        { status: 400 }
      );
    }

    // Validate roomId format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(roomId)) {
      return NextResponse.json(
        { error: 'RoomId không hợp lệ' },
        { status: 400 }
      );
    }

    // Verify room exists
    const { data: room, error: roomError } = await supabaseAdmin
      .from('rooms')
      .select('id, name')
      .eq('id', roomId)
      .maybeSingle() as { data: Pick<RoomRow, 'id' | 'name'> | null; error: Error | null };

    if (roomError || !room) {
      return NextResponse.json(
        { error: 'Room không tồn tại' },
        { status: 404 }
      );
    }

    // Get user ID if not provided
    let finalUserId = userId;
    
    if (!finalUserId) {
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('username', username)
        .maybeSingle() as { data: Pick<UserRow, 'id'> | null; error: Error | null };

      finalUserId = user?.id;
    }

    const { data: message, error } = await supabaseAdmin
      .from('messages')
      // @ts-expect-error - Supabase type inference issue with Database types
      .insert({
        room_id: roomId,
        user_id: finalUserId,
        username: username,
        text: text.trim(),
      })
      .select()
      .single() as { data: MessageRow | null; error: Error | null };

    if (error || !message) {
      return NextResponse.json(
        { 
          error: 'Lỗi khi lưu tin nhắn', 
          details: error?.message || 'Failed to create message'
        },
        { status: 500 }
      );
    }

    return NextResponse.json(message);
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Lỗi không mong muốn', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}