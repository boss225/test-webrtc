'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import ChatRoom from '@/app/components/ChatRoom';
import JoinRoomModal from '@/app/components/JoinRoomModal';
import { Room } from '@/types';
import AuthForm from '@/app/components/AuthForm';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, isLoading, supabaseUserId } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [isLoadingRoom, setIsLoadingRoom] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

  const roomId = params?.roomId as string;

  // Check if user has access to the room
  const checkRoomAccess = async (roomData: Room) => {
    if (!supabaseUserId) {
      setIsCheckingAccess(false);
      return;
    }

    try {
      // Check if user is already a participant
      const participantsResponse = await fetch(`/api/rooms/${roomId}/participants`);
      if (participantsResponse.ok) {
        const participants = await participantsResponse.json();
        const isParticipant = participants.some((p: { user_id: string }) => p.user_id === supabaseUserId);
        
        if (isParticipant) {
          // User is already in room, allow access
          setIsCheckingAccess(false);
          return;
        }
      }

      // If room has password and user is not a participant, show password modal
      if (roomData.password_hash) {
        setShowPasswordModal(true);
        setIsCheckingAccess(false);
      } else {
        // No password, try to join automatically
        await joinRoom(null);
      }
    } catch {
      setIsCheckingAccess(false);
    }
  };

  const joinRoom = async (password: string | null) => {
    if (!supabaseUserId) return;

    try {
      const response = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          userId: supabaseUserId,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          alert(data.error || 'Mật khẩu không đúng');
          setShowPasswordModal(true);
        } else {
          setError(data.error || 'Không thể tham gia phòng');
          setShowPasswordModal(false);
        }
        return;
      }

      setShowPasswordModal(false);
      setIsCheckingAccess(false);
      localStorage.setItem('currentRoomId', roomId);
    } catch {
      setError('Lỗi kết nối. Vui lòng thử lại.');
      setShowPasswordModal(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || isLoading) {
      return;
    }

    if (!roomId) {
      setError('Room ID không hợp lệ');
      setIsLoadingRoom(false);
      setIsCheckingAccess(false);
      return;
    }

    const loadRoom = async () => {
      try {
        setIsLoadingRoom(true);
        setError(null);
        setIsCheckingAccess(true);

        const response = await fetch(`/api/rooms/${roomId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Phòng không tồn tại');
          } else {
            setError('Lỗi khi tải thông tin phòng');
          }
          setIsLoadingRoom(false);
          setIsCheckingAccess(false);
          return;
        }

        const roomData = await response.json();
        setRoom(roomData);
        
        // Check if user has access
        await checkRoomAccess(roomData);
      } catch {
        setError('Lỗi kết nối. Vui lòng thử lại.');
        setIsCheckingAccess(false);
      } finally {
        setIsLoadingRoom(false);
      }
    };

    loadRoom();
  }, [roomId, isAuthenticated, isLoading, supabaseUserId]);

  const handleBack = () => {
    localStorage.removeItem('currentRoomId');
    router.push('/');
  };

  if (isLoading || isLoadingRoom || isCheckingAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Đang tải phòng...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthForm />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center bg-white p-8 rounded-2xl shadow-lg max-w-md">
          <svg
            className="w-16 h-16 mx-auto text-red-300 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Không tìm thấy phòng</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={handleBack}
            className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all"
          >
            Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  if (!room) {
    return null;
  }

  // Show password modal if room has password and user hasn't joined
  if (showPasswordModal && room.password_hash) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="text-center bg-white p-8 rounded-2xl shadow-lg max-w-md">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">{room.name}</h2>
            <p className="text-gray-600 mb-4">Phòng này yêu cầu mật khẩu</p>
            <button
              onClick={handleBack}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
            >
              Quay lại
            </button>
          </div>
        </div>
        <JoinRoomModal
          room={room}
          onClose={handleBack}
          onJoin={(password) => joinRoom(password)}
        />
      </>
    );
  }

  // Only show ChatRoom if user has access (no password or already joined)
  return <ChatRoom initialRoom={room} onBack={handleBack} />;
}
