import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { hashPassword } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { 
      name, 
      description, 
      password, 
      isPrivate, 
      maxParticipants, 
      userId 
    } = await request.json();

    // Validation
    if (!name || !userId) {
      return NextResponse.json(
        { error: 'Tên phòng và userId là bắt buộc' },
        { status: 400 }
      );
    }

    if (name.length < 3 || name.length > 50) {
      return NextResponse.json(
        { error: 'Tên phòng phải từ 3-50 ký tự' },
        { status: 400 }
      );
    }

    // Hash password if provided
    let passwordHash = null;
    if (password && password.trim()) {
      if (password.length < 4) {
        return NextResponse.json(
          { error: 'Mật khẩu phòng phải có ít nhất 4 ký tự' },
          { status: 400 }
        );
      }
      passwordHash = await hashPassword(password);
    }

    // Create room
    const { data: room, error } = await supabaseAdmin
      .from('rooms')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        password_hash: passwordHash,
        is_private: isPrivate ?? false,
        max_participants: maxParticipants || 10,
        created_by: userId,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Create room error:', error);
      throw error;
    }

    // Auto-join creator to the room
    await supabaseAdmin
      .from('room_participants')
      .insert({
        room_id: room.id,
        user_id: userId,
        is_camera_on: false,
        is_mic_on: true,
      });

    return NextResponse.json(room);
  } catch (error) {
    console.error('Create room error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi tạo phòng' },
      { status: 500 }
    );
  }
}