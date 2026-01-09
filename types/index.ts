// Re-export Supabase types
export type {
    UserPublic,
    UserSelect,
    RoomRow,
    RoomWithCreator,
    ParticipantRow,
    ParticipantWithUser,
    MessageRow,
    BlacklistRow,
    BlacklistWithUser,
    InvitationRow,
    InvitationWithDetails,
    ApiResponse,
  } from '@/lib/supabase-types';
  
  // Frontend-specific types
  export interface Message {
    id: string;
    room_id: string;
    user_id: string;
    username: string;
    text: string;
    created_at: string;
  }
  
  export interface User {
    id: string;
    username: string;
    email: string;
    created_at: string;
    last_seen: string;
    is_online: boolean;
    avatar_url?: string;
  }
  
  export interface Participant {
    id: string;
    username: string;
    isCameraOn: boolean;
    isMicOn: boolean;
    userId?: string;
    role?: 'owner' | 'admin' | 'member';
  }
  
  // Room participant with user details (from API)
  export interface RoomParticipant {
    id: string;
    room_id: string;
    user_id: string;
    joined_at: string;
    is_camera_on: boolean;
    is_mic_on: boolean;
    role: 'owner' | 'admin' | 'member';
    users?: {
      id: string;
      username: string;
      email?: string;
      is_online: boolean;
    };
  }
  
  export interface SignalData {
    type: 'offer' | 'answer' | 'ice-candidate' | 'user-joined' | 'user-left' | 'media-state-changed';
    from: string;
    to?: string;
    data?: any;
    participant?: Participant;
  }
  
  export interface Room {
    id: string;
    name: string;
    description?: string;
    created_at: string;
    created_by?: string;
    is_private: boolean;
    is_active: boolean;
    max_participants: number;
    password_hash?: string;
    participants_count?: number;
    creator?: User;
  }
  
  export interface RoomBlacklist {
    id: string;
    room_id: string;
    blocked_user_id?: string;
    blocked_email?: string;
    blocked_by: string;
    reason?: string;
    created_at: string;
    blocked_user?: User;
  }
  
  export interface RoomInvitation {
    id: string;
    room_id: string;
    invited_by: string;
    invited_email: string;
    invited_user_id?: string;
    invitation_token: string;
    status: 'pending' | 'accepted' | 'declined' | 'expired';
    created_at: string;
    expires_at: string;
    accepted_at?: string;
    room?: Room;
    inviter?: User;
  }