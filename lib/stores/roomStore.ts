import { create } from 'zustand';
import { Room } from '@/types';

interface RoomStore {
  currentRoom: Room | null;
  showVideo: boolean;
  showAdminPanel: boolean;
  
  // Actions
  setCurrentRoom: (room: Room | null) => void;
  setShowVideo: (show: boolean) => void;
  setShowAdminPanel: (show: boolean) => void;
  clearRoom: () => void;
}

export const useRoomStore = create<RoomStore>((set) => ({
  currentRoom: null,
  showVideo: true,
  showAdminPanel: false,

  setCurrentRoom: (room) => set({ currentRoom: room }),
  setShowVideo: (show) => set({ showVideo: show }),
  setShowAdminPanel: (show) => set({ showAdminPanel: show }),
  clearRoom: () => set({ 
    currentRoom: null, 
    showVideo: true, 
    showAdminPanel: false 
  }),
}));
