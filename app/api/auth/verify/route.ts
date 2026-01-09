import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import sessionStore from '@/lib/sessionStore';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const { sessionId } = await request.json();

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ valid: false }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ valid: false }, { status: 401 });
    }

    // Verify session
    const session = sessionStore.getSession(sessionId);

    if (!session) {
      return NextResponse.json({ valid: false });
    }

    // Get user from database
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, username, email, avatar_url, created_at, updated_at, last_seen, is_online')
      .eq('id', session.supabaseUserId)
      .single();

    if (error || !user) {
      return NextResponse.json({ valid: false });
    }

    return NextResponse.json({
      valid: true,
      user,
    });
  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.json({ valid: false });
  }
}