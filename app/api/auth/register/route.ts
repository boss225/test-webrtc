import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  hashPassword,
  generateToken,
  validateEmail,
  validatePassword,
  validateUsername,
} from '@/lib/auth';
import type { Database } from '@/lib/supabase-types';

type UserRow = Database['public']['Tables']['users']['Row'];

export async function POST(request: Request) {
  try {
    const { email, username, password } = await request.json();

    // Validation
    if (!email || !username || !password) {
      return NextResponse.json(
        { error: 'Email, username và password là bắt buộc' },
        { status: 400 }
      );
    }

    // Validate email
    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: 'Email không hợp lệ' },
        { status: 400 }
      );
    }

    // Validate username
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.isValid) {
      return NextResponse.json(
        { error: usernameValidation.error },
        { status: 400 }
      );
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { error: passwordValidation.error },
        { status: 400 }
      );
    }

    // Check if email already exists
    const { data: existingEmail } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingEmail) {
      return NextResponse.json(
        { error: 'Email đã được sử dụng' },
        { status: 409 }
      );
    }

    // Check if username already exists
    const { data: existingUsername } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUsername) {
      return NextResponse.json(
        { error: 'Username đã được sử dụng' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const { data: user, error } = await supabaseAdmin
      .from('users')
      // @ts-expect-error - Supabase type inference issue with Database types
      .insert({
        email: email.toLowerCase(),
        username,
        password_hash: passwordHash,
        is_online: false,
      })
      .select()
      .single() as { data: UserRow | null; error: Error | null };

    if (error || !user) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Lỗi khi tạo tài khoản' },
        { status: 500 }
      );
    }

    // Generate token
    const token = generateToken(user.id, user.email);

    // Remove sensitive data
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      user: userWithoutPassword,
      token,
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi đăng ký tài khoản' },
      { status: 500 }
    );
  }
}