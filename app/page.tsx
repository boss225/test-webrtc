'use client';

import { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import AuthForm from './components/AuthForm';
import RoomList from './components/RoomList';
import ChatRoom from './components/ChatRoom';
import { Room } from '@/types';

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthForm />;
  }

  if (selectedRoom) {
    return <ChatRoom initialRoom={selectedRoom} onBack={() => setSelectedRoom(null)} />;
  }

  return <RoomList onRoomSelect={setSelectedRoom} />;
}