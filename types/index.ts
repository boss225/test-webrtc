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
    created_at: string;
    last_seen: string;
    is_online: boolean;
  }
  
  export interface Participant {
    id: string;
    username: string;
    isCameraOn: boolean;
    isMicOn: boolean;
    userId?: string;
  }
  
  export interface SignalData {
    type: 'offer' | 'answer' | 'ice-candidate' | 'user-joined' | 'user-left' | 'media-state-changed';
    from: string;
    to?: string;
    data?: unknown;
    participant?: Participant;
  }
  
  export interface Room {
    id: string;
    name: string;
    created_at: string;
    created_by?: string;
  }