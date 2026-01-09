import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Types
export interface User {
  id: string;
  username: string;
  email: string;
  password_hash?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  last_seen: string;
  is_online: boolean;
}

export interface Room {
  id: string;
  name: string;
  created_at: string;
  created_by?: string;
}

export interface RoomParticipant {
  id: string;
  room_id: string;
  user_id: string;
  joined_at: string;
  is_camera_on: boolean;
  is_mic_on: boolean;
  users?: User;
}

export interface Message {
  id: string;
  room_id: string;
  user_id: string;
  username: string;
  text: string;
  created_at: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
  token?: string;
}