import { createClient } from '@supabase/supabase-js';
import type { Database } from './supabase-types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client-side Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Server-side admin client
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Realtime client (uses anon key for realtime subscriptions)
export const supabaseRealtime = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

// Type exports
export type { Database } from './supabase-types';
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
  PaginatedResponse,
} from './supabase-types';