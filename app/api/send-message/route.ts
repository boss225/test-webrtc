import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import sessionStore from '@/lib/sessionStore';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, text, roomId = null } = body;

    if (!username || !text) {
      return NextResponse.json(
        { error: 'Username và message là bắt buộc' },
        { status: 400 }
      );
    }

    // Lấy user từ database
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User không tồn tại' },
        { status: 404 }
      );
    }

    // Lấy default room nếu không có roomId
    let finalRoomId = roomId;
    if (!finalRoomId) {
      const { data: defaultRoom } = await supabaseAdmin
        .from('rooms')
        .select('id')
        .eq('name', 'General Room')
        .single();

      finalRoomId = defaultRoom?.id;
    }

    // Lưu message vào database
    const { data: message, error } = await supabaseAdmin
      .from('messages')
      .insert({
        room_id: finalRoomId,
        user_id: user.id,
        username,
        text,
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Lỗi khi lưu tin nhắn' },
        { status: 500 }
      );
    }

    return NextResponse.json(message);
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi gửi tin nhắn' },
      { status: 500 }
    );
  }
}