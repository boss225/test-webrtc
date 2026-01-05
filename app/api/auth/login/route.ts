import { NextResponse } from 'next/server';
import sessionStore from '@/lib/sessionStore';

export async function POST(request: Request) {
  try {
    const { username } = await request.json();

    if (!username || username.trim().length < 2) {
      return NextResponse.json(
        { error: 'Username phải có ít nhất 2 ký tự' },
        { status: 400 }
      );
    }

    const trimmedUsername = username.trim();

    // Kiểm tra username đã tồn tại
    if (sessionStore.isUsernameTaken(trimmedUsername)) {
      return NextResponse.json(
        { error: 'Username đã được sử dụng. Vui lòng chọn tên khác.' },
        { status: 409 }
      );
    }

    // Tạo userId unique
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Tạo session
    const session = sessionStore.createSession(userId, trimmedUsername);

    return NextResponse.json({
      success: true,
      userId: session.userId,
      username: session.username,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi đăng nhập' },
      { status: 500 }
    );
  }
}