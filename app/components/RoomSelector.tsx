'use client';

import { Room } from '@/types';
import { useState } from 'react';

interface RoomSelectorProps {
  rooms: Room[];
  currentRoom: Room | null;
  onRoomChange: (room: Room) => void;
}

export default function RoomSelector({ rooms, currentRoom, onRoomChange }: RoomSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-all"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
        </svg>
        <span className="text-sm font-medium">
          {currentRoom?.name || 'Chọn phòng'}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
          <div className="absolute top-full mt-2 left-0 bg-white rounded-lg shadow-xl z-20 min-w-[200px] overflow-hidden">
            {rooms.map(room => (
              <button
                key={room.id}
                onClick={() => {
                  onRoomChange(room);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-3 hover:bg-gray-100 transition-colors ${
                  currentRoom?.id === room.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                }`}
              >
                <div className="font-medium">{room.name}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(room.created_at).toLocaleDateString()}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}