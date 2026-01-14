'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './contexts/AuthContext';
import AuthForm from './components/AuthForm';
import RoomList from './components/RoomList';

const CURRENT_ROOM_KEY = 'currentRoomId';

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Redirect to saved room if exists
  useEffect(() => {
    if (!isAuthenticated || isLoading) {
      return;
    }

    const savedRoomId = localStorage.getItem(CURRENT_ROOM_KEY);
    if (savedRoomId) {
      router.push(`/room/${savedRoomId}`);
    }
  }, [isAuthenticated, isLoading, router]);

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

  return <RoomList />;
}