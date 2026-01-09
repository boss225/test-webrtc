// ============================================
// DATABASE TYPES - Generated from Supabase
// ============================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          username: string
          email: string
          password_hash: string
          avatar_url: string | null
          created_at: string
          updated_at: string
          last_seen: string
          is_online: boolean
        }
        Insert: {
          id?: string
          username: string
          email: string
          password_hash: string
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
          last_seen?: string
          is_online?: boolean
        }
        Update: {
          id?: string
          username?: string
          email?: string
          password_hash?: string
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
          last_seen?: string
          is_online?: boolean
        }
      }
      rooms: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
          created_by: string | null
          is_private: boolean
          is_active: boolean
          max_participants: number
          password_hash: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
          created_by?: string | null
          is_private?: boolean
          is_active?: boolean
          max_participants?: number
          password_hash?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
          created_by?: string | null
          is_private?: boolean
          is_active?: boolean
          max_participants?: number
          password_hash?: string | null
        }
      }
      room_participants: {
        Row: {
          id: string
          room_id: string
          user_id: string
          joined_at: string
          is_camera_on: boolean
          is_mic_on: boolean
          role: 'owner' | 'admin' | 'member'
        }
        Insert: {
          id?: string
          room_id: string
          user_id: string
          joined_at?: string
          is_camera_on?: boolean
          is_mic_on?: boolean
          role?: 'owner' | 'admin' | 'member'
        }
        Update: {
          id?: string
          room_id?: string
          user_id?: string
          joined_at?: string
          is_camera_on?: boolean
          is_mic_on?: boolean
          role?: 'owner' | 'admin' | 'member'
        }
      }
      messages: {
        Row: {
          id: string
          room_id: string
          user_id: string
          username: string
          text: string
          created_at: string
        }
        Insert: {
          id?: string
          room_id: string
          user_id: string
          username: string
          text: string
          created_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          user_id?: string
          username?: string
          text?: string
          created_at?: string
        }
      }
      room_blacklist: {
        Row: {
          id: string
          room_id: string
          blocked_user_id: string | null
          blocked_email: string | null
          blocked_by: string
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          room_id: string
          blocked_user_id?: string | null
          blocked_email?: string | null
          blocked_by: string
          reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          blocked_user_id?: string | null
          blocked_email?: string | null
          blocked_by?: string
          reason?: string | null
          created_at?: string
        }
      }
      room_invitations: {
        Row: {
          id: string
          room_id: string
          invited_by: string
          invited_email: string
          invited_user_id: string | null
          invitation_token: string
          status: 'pending' | 'accepted' | 'declined' | 'expired'
          created_at: string
          expires_at: string
          accepted_at: string | null
        }
        Insert: {
          id?: string
          room_id: string
          invited_by: string
          invited_email: string
          invited_user_id?: string | null
          invitation_token: string
          status?: 'pending' | 'accepted' | 'declined' | 'expired'
          created_at?: string
          expires_at?: string
          accepted_at?: string | null
        }
        Update: {
          id?: string
          room_id?: string
          invited_by?: string
          invited_email?: string
          invited_user_id?: string | null
          invitation_token?: string
          status?: 'pending' | 'accepted' | 'declined' | 'expired'
          created_at?: string
          expires_at?: string
          accepted_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_user_blacklisted: {
        Args: {
          p_room_id: string
          p_user_id?: string
          p_email?: string
        }
        Returns: boolean
      }
      is_room_admin: {
        Args: {
          p_room_id: string
          p_user_id: string
        }
        Returns: boolean
      }
    }
  }
}

// ============================================
// HELPER TYPES FOR API RESPONSES
// ============================================

// User types
export type UserPublic = Omit<Database['public']['Tables']['users']['Row'], 'password_hash'>

export type UserSelect = {
  id: string
  username: string
  email: string
  avatar_url?: string | null
}

// Room types
export type RoomRow = Database['public']['Tables']['rooms']['Row']

export type RoomWithCreator = RoomRow & {
  creator?: UserSelect
  participants_count?: number
}

// Participant types
export type ParticipantRow = Database['public']['Tables']['room_participants']['Row']

export type ParticipantWithUser = ParticipantRow & {
  users: UserSelect
}

// Message types
export type MessageRow = Database['public']['Tables']['messages']['Row']

// Blacklist types
export type BlacklistRow = Database['public']['Tables']['room_blacklist']['Row']

export type BlacklistWithUser = BlacklistRow & {
  blocked_user?: UserSelect
  blocker?: { username: string }
}

// Invitation types
export type InvitationRow = Database['public']['Tables']['room_invitations']['Row']

export type InvitationWithDetails = InvitationRow & {
  room?: RoomRow
  inviter?: UserSelect
}

// ============================================
// API RESPONSE TYPES
// ============================================

export type ApiResponse<T = any> = {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export type PaginatedResponse<T> = {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

// ============================================
// QUERY RESULT TYPES
// ============================================

export type QueryResult<T> = {
  data: T | null
  error: Error | null
}

export type QueryListResult<T> = {
  data: T[] | null
  error: Error | null
  count?: number
}