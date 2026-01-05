import { NextResponse } from 'next/server';
import sessionStore from '@/lib/sessionStore';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { valid: false },
        { status: 400 }
      );
    }

    const session = sessionStore.getSession(userId);

    if (!session) {
      return NextResponse.json({ valid: false });
    }

    return NextResponse.json({
      valid: true,
      username: session.username,
      userId: session.userId,
    });
  } catch (error) {
    return NextResponse.json({ valid: false });
  }
}