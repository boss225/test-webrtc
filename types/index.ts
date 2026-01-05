export interface Message {
    id: string;
    username: string;
    text: string;
    timestamp: Date;
}

export interface User {
    id: string;
    username: string;
}

export interface Participant {
    id: string;
    username: string;
    isCameraOn: boolean;
    isMicOn: boolean;
}

export interface SignalData {
    type: 'offer' | 'answer' | 'ice-candidate' | 'user-joined' | 'user-left' | 'media-state-changed';
    from: string;
    to?: string;
    data?: unknown;
    participant?: Participant;
}