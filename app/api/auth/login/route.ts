import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { comparePassword, generateToken } from '@/lib/auth';
import sessionStore from '@/lib/sessionStore';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email và password là bắt buộc' },
        { status: 400 }
      );
    }

    // Find user by email
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: 'Email hoặc mật khẩu không đúng' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password_hash);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Email hoặc mật khẩu không đúng' },
        { status: 401 }
      );
    }

    // Update online status
    await supabaseAdmin
      .from('users')
      .update({ is_online: true, last_seen: new Date().toISOString() })
      .eq('id', user.id);

    // Generate session ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create session in memory
    await sessionStore.createSession(sessionId, user.username, user.id);

    // Generate token
    const token = generateToken(user.id, user.email);

    // Remove sensitive data
    const { password_hash, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      user: userWithoutPassword,
      token,
      sessionId,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi đăng nhập' },
      { status: 500 }
    );
  }
}