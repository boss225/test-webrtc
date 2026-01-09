import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import type { Database } from '@/lib/supabase-types';

type RoomRow = Database['public']['Tables']['rooms']['Row'];
type RoomWithRelations = RoomRow & {
  creator?: { id: string; username: string; email: string; avatar_url: string | null };
  participants?: Array<unknown>;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const showAll = searchParams.get('showAll') === 'true';

    let query = supabaseAdmin
      .from('rooms')
      .select(`
        *,
        creator:created_by(id, username, email, avatar_url),
        participants:room_participants(count)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    // If not showing all, only show public rooms or rooms user created
    if (!showAll && userId) {
      query = query.or(`is_private.eq.false,created_by.eq.${userId}`);
    } else if (!showAll) {
      query = query.eq('is_private', false);
    }

    const { data: rooms, error } = await query as { data: RoomWithRelations[] | null; error: Error | null };

    if (error) throw error;

    // Add participants count
    const roomsWithCount = rooms?.map((room: RoomWithRelations) => ({
      ...room,
      participants_count: Array.isArray(room.participants) ? room.participants.length : 0,
    }));

    return NextResponse.json(roomsWithCount || []);
  } catch (error) {
    console.error('List rooms error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi lấy danh sách phòng' },
      { status: 500 }
    );
  }
}