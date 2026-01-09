import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { comparePassword } from '@/lib/auth';
import type { Database } from '@/lib/supabase-types';

type RoomRow = Database['public']['Tables']['rooms']['Row'];
type UserRow = Database['public']['Tables']['users']['Row'];

export async function POST(request: Request) {
  try {
    const { roomId, userId, password } = await request.json();

    if (!roomId || !userId) {
      return NextResponse.json(
        { error: 'roomId và userId là bắt buộc' },
        { status: 400 }
      );
    }

    // Get room
    const { data: room, error: roomError } = await supabaseAdmin
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .eq('is_active', true)
      .single() as { data: RoomRow | null; error: Error | null };

    if (roomError || !room) {
      return NextResponse.json(
        { error: 'Phòng không tồn tại hoặc đã bị khóa' },
        { status: 404 }
      );
    }

    // Get user info
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('id', userId)
      .single() as { data: Pick<UserRow, 'id' | 'email'> | null; error: Error | null };

    if (!user) {
      return NextResponse.json(
        { error: 'User không tồn tại' },
        { status: 404 }
      );
    }

    // ✅ CHECK BLACKLIST
    // @ts-expect-error - Supabase RPC type inference issue - function signature not properly typed
    const { data: isBlacklisted } = await supabaseAdmin.rpc('is_user_blacklisted', {
      p_room_id: roomId,
      p_user_id: userId,
      p_email: user.email
    });

    if (isBlacklisted) {
      return NextResponse.json(
        { error: 'Bạn đã bị chặn khỏi phòng này' },
        { status: 403 }
      );
    }

    // Check password if room is private
    if (room.password_hash) {
      if (!password) {
        return NextResponse.json(
          { error: 'Phòng này yêu cầu mật khẩu' },
          { status: 401 }
        );
      }

      const isValidPassword = await comparePassword(password, room.password_hash);
      if (!isValidPassword) {
        return NextResponse.json(
          { error: 'Mật khẩu không đúng' },
          { status: 401 }
        );
      }
    }

    // Check if room is full
    const { count } = await supabaseAdmin
      .from('room_participants')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', roomId);

    if (count && count >= room.max_participants) {
      return NextResponse.json(
        { error: 'Phòng đã đầy' },
        { status: 403 }
      );
    }

    // Check if user already in room
    const { data: existing } = await supabaseAdmin
      .from('room_participants')
      .select('id')
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ 
        success: true, 
        message: 'Bạn đã ở trong phòng này',
        room 
      });
    }

    // Join room
    await supabaseAdmin
      .from('room_participants')
      // @ts-expect-error - Supabase type inference issue with Database types
      .insert({
        room_id: roomId,
        user_id: userId,
        is_camera_on: false,
        is_mic_on: true,
        role: 'member',
      });

    return NextResponse.json({ 
      success: true, 
      room 
    });
  } catch (error) {
    console.error('Join room error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi tham gia phòng' },
      { status: 500 }
    );
  }
}