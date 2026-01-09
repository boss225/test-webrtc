import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { randomBytes } from 'crypto';
import type { Database } from '@/lib/supabase-types';

type RoomRow = Database['public']['Tables']['rooms']['Row'];
type UserRow = Database['public']['Tables']['users']['Row'];
type InvitationRow = Database['public']['Tables']['room_invitations']['Row'];

// Helper to send email (you'll need to implement actual email sending)
async function sendInvitationEmail(
  email: string,
  roomName: string,
  inviterName: string,
  invitationToken: string
) {
  // TODO: Implement actual email sending with services like:
  // - SendGrid
  // - AWS SES
  // - Resend
  // - Nodemailer
  
  const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invitationToken}`;
  
  console.log('=== EMAIL INVITATION ===');
  console.log('To:', email);
  console.log('Subject: Lời mời tham gia phòng chat', roomName);
  console.log('Link:', invitationLink);
  console.log('========================');

  // For now, just log. You should implement actual email sending here
  return true;
}

export async function POST(request: Request) {
  try {
    const { roomId, invitedEmail, userId } = await request.json();

    if (!roomId || !invitedEmail || !userId) {
      return NextResponse.json(
        { error: 'roomId, email và userId là bắt buộc' },
        { status: 400 }
      );
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(invitedEmail)) {
      return NextResponse.json(
        { error: 'Email không hợp lệ' },
        { status: 400 }
      );
    }

    // Get room
    const { data: room, error: roomError } = await supabaseAdmin
      .from('rooms')
      .select('*, users:created_by(username)')
      .eq('id', roomId)
      .single() as { data: (RoomRow & { users?: { username: string } }) | null; error: Error | null };

    if (roomError || !room) {
      return NextResponse.json(
        { error: 'Phòng không tồn tại' },
        { status: 404 }
      );
    }

    // Get inviter
    const { data: inviter } = await supabaseAdmin
      .from('users')
      .select('username, email')
      .eq('id', userId)
      .single() as { data: Pick<UserRow, 'username' | 'email'> | null; error: Error | null };

    // Check if email already has pending invitation
    const { data: existingInvite } = await supabaseAdmin
      .from('room_invitations')
      .select('*')
      .eq('room_id', roomId)
      .eq('invited_email', invitedEmail.toLowerCase())
      .eq('status', 'pending')
      .maybeSingle();

    if (existingInvite) {
      return NextResponse.json(
        { error: 'Email này đã được mời vào phòng' },
        { status: 409 }
      );
    }

    // Check if user with this email exists and is already in room
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', invitedEmail.toLowerCase())
      .maybeSingle() as { data: Pick<UserRow, 'id'> | null; error: Error | null };

    if (existingUser) {
      const { data: participant } = await supabaseAdmin
        .from('room_participants')
        .select('id')
        .eq('room_id', roomId)
        .eq('user_id', existingUser.id)
        .maybeSingle();

      if (participant) {
        return NextResponse.json(
          { error: 'User này đã ở trong phòng' },
          { status: 409 }
        );
      }
    }

    // Generate invitation token
    const token = randomBytes(32).toString('hex');

    // Create invitation
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('room_invitations')
      // @ts-expect-error - Supabase type inference issue with Database types
      .insert({
        room_id: roomId,
        invited_by: userId,
        invited_email: invitedEmail.toLowerCase(),
        invited_user_id: existingUser?.id || null,
        invitation_token: token,
        status: 'pending',
      })
      .select()
      .single() as { data: InvitationRow | null; error: Error | null };

    if (inviteError) {
      console.error('Create invitation error:', inviteError);
      throw inviteError;
    }

    // Send email
    await sendInvitationEmail(
      invitedEmail,
      room.name,
      inviter?.username || 'Someone',
      token
    );

    return NextResponse.json({
      success: true,
      invitation,
      message: 'Lời mời đã được gửi qua email',
    });
  } catch (error) {
    console.error('Invite error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi gửi lời mời' },
      { status: 500 }
    );
  }
}