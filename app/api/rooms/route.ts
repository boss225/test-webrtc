import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Get all rooms
export async function GET() {
  try {
    const { data: rooms, error } = await supabaseAdmin
      .from('rooms')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json(rooms);
  } catch (error) {
    console.error('Get rooms error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi lấy danh sách phòng' },
      { status: 500 }
    );
  }
}

// Create new room
export async function POST(request: Request) {
  try {
    const { name, userId } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Tên phòng là bắt buộc' },
        { status: 400 }
      );
    }

    const { data: room, error } = await supabaseAdmin
      .from('rooms')
      // @ts-expect-error - Supabase type inference issue with Database types
      .insert({ name, created_by: userId })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(room);
  } catch (error) {
    console.error('Create room error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi tạo phòng' },
      { status: 500 }
    );
  }
}