'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Room } from '@/types';
import { useAuth } from '../contexts/AuthContext';
import AppHeader from './AppHeader';
import CreateRoomModal from './CreateRoomModal';
import JoinRoomModal from './JoinRoomModal';
import InviteModal from './InviteModal';
import { BRAND_CONFIG } from '../config/brand';

export default function RoomList() {
  const router = useRouter();
  const { supabaseUserId, username } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [filter, setFilter] = useState<'all' | 'my' | 'public'>('all');

  const loadRooms = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/rooms/list?userId=${supabaseUserId}&showAll=true`);
      const data = await response.json();
      setRooms(data);
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, [supabaseUserId]);

  const handleCreateRoom = (roomId: string) => {
    setShowCreateModal(false);
    loadRooms();
    // Navigate to the newly created room
    router.push(`/room/${roomId}`);
  };

  const handleJoinRoom = (room: Room) => {
    setSelectedRoom(room);

    if (room.password_hash) {
      setShowJoinModal(true);
    } else {
      joinRoom(room.id, null);
    }
  };

  const joinRoom = async (roomId: string, password: string | null) => {
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
        alert(data.error || 'Không thể tham gia phòng');
        return;
      }

      setShowJoinModal(false);
      // Navigate to room page
      router.push(`/room/${roomId}`);
    } catch {
      alert('Lỗi khi tham gia phòng');
    }
  };

  const handleInvite = (room: Room) => {
    setSelectedRoom(room);
    setShowInviteModal(true);
  };

  const filteredRooms = rooms.filter(room => {
    if (filter === 'my') return room.created_by === supabaseUserId;
    if (filter === 'public') return !room.is_private;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Đang tải phòng...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <AppHeader
        title={BRAND_CONFIG.name}
        subtitle={BRAND_CONFIG.tagline}
        actions={
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg transition-all shadow-md hover:shadow-lg flex items-center gap-2 font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Tạo phòng mới
          </button>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-4 lg:px-4 py-8">
        {/* Filters */}
        <div className="mb-8 flex flex-wrap gap-3">
          <button
            onClick={() => setFilter('all')}
            className={`px-5 py-2.5 rounded-lg font-medium transition-all ${filter === 'all'
              ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md transform scale-105'
              : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm hover:shadow-md'
              }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
              </svg>
              Tất cả
              <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                {rooms.length}
              </span>
            </span>
          </button>

          <button
            onClick={() => setFilter('my')}
            className={`px-5 py-2.5 rounded-lg font-medium transition-all ${filter === 'my'
              ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md transform scale-105'
              : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm hover:shadow-md'
              }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
              </svg>
              Của tôi
              <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                {rooms.filter(r => r.created_by === supabaseUserId).length}
              </span>
            </span>
          </button>

          <button
            onClick={() => setFilter('public')}
            className={`px-5 py-2.5 rounded-lg font-medium transition-all ${filter === 'public'
              ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md transform scale-105'
              : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm hover:shadow-md'
              }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
              </svg>
              Công khai
              <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                {rooms.filter(r => !r.is_private).length}
              </span>
            </span>
          </button>
        </div>

        {/* Room Grid */}
        {filteredRooms.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm">
            <div className="max-w-md mx-auto px-4">
              <svg
                className="w-24 h-24 mx-auto text-gray-300 mb-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Chưa có phòng nào
              </h3>
              <p className="text-gray-600 mb-8">
                {filter === 'my'
                  ? 'Bạn chưa tạo phòng nào. Tạo phòng đầu tiên của bạn!'
                  : filter === 'public'
                    ? 'Chưa có phòng công khai nào'
                    : 'Tạo phòng mới để bắt đầu trò chuyện!'}
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg font-semibold"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Tạo phòng mới
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredRooms.map(room => (
              <RoomCard
                key={room.id}
                room={room}
                currentUserId={supabaseUserId!}
                onJoin={() => handleJoinRoom(room)}
                onInvite={() => handleInvite(room)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateRoomModal
          userId={supabaseUserId!}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateRoom}
        />
      )}

      {showJoinModal && selectedRoom && (
        <JoinRoomModal
          room={selectedRoom}
          onClose={() => setShowJoinModal(false)}
          onJoin={(password) => joinRoom(selectedRoom.id, password)}
        />
      )}

      {showInviteModal && selectedRoom && (
        <InviteModal
          room={selectedRoom}
          userId={supabaseUserId!}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </div>
  );
}

// ===== IMPROVED ROOM CARD COMPONENT =====
function RoomCard({
  room,
  currentUserId,
  onJoin,
  onInvite,
}: {
  room: Room;
  currentUserId: string;
  onJoin: () => void;
  onInvite: () => void;
}) {
  const isOwner = room.created_by === currentUserId;
  const isFull = (room.participants_count || 0) >= room.max_participants;
  const participantPercentage = ((room.participants_count || 0) / room.max_participants) * 100;

  return (
    <div className="group bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-blue-200 flex flex-col h-full">
      {/* Header - Fixed height */}
      <div className="relative bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 p-5 text-white h-25 flex flex-col">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '24px 24px'
          }}></div>
        </div>

        {/* Content */}
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-bold text-lg leading-tight line-clamp-2 flex-1">
              {room.name}
            </h3>

            {/* Badges */}
            <div className="flex gap-1 flex-shrink-0">
              {room.password_hash && (
                <div className="w-8 h-8 bg-yellow-400/20 backdrop-blur-sm rounded-lg flex items-center justify-center" title="Có mật khẩu">
                  <svg className="w-4 h-4 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
              {isOwner && (
                <div className="w-8 h-8 bg-yellow-400/20 backdrop-blur-sm rounded-lg flex items-center justify-center" title="Phòng của bạn">
                  <svg className="w-4 h-4 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Description area - Fixed height */}
        <div className="relative h-10">
          {room.description ? (
            <p className="text-sm text-blue-50 line-clamp-2 leading-tight">
              {room.description}
            </p>
          ) : (
            <p className="text-sm text-blue-100/50 italic">
              Không có mô tả
            </p>
          )}
        </div>
      </div>

      {/* Body - Flexible */}
      <div className="flex-1 p-5 flex flex-col">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Participants */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-3 border border-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
              <span className="text-xs font-semibold text-gray-700">Thành viên</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-blue-600">
                {room.participants_count || 0}
              </span>
              <span className="text-sm text-gray-500">/ {room.max_participants}</span>
            </div>
            {/* Progress bar */}
            <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${participantPercentage >= 80 ? 'bg-red-500' :
                  participantPercentage >= 50 ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}
                style={{ width: `${Math.min(participantPercentage, 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Privacy */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-3 border border-purple-100">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
              </svg>
              <span className="text-xs font-semibold text-gray-700">Trạng thái</span>
            </div>
            <div className="text-sm font-bold text-purple-600">
              {room.is_private ? 'Riêng tư' : 'Công khai'}
            </div>
          </div>
        </div>

        {/* Creator Info */}
        {room.creator && (
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
              {room.creator.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 font-medium">Chủ phòng</p>
              <p className="text-sm font-semibold text-gray-900 truncate">
                {isOwner ? 'Bạn' : room.creator.username}
              </p>
            </div>
          </div>
        )}

        {/* Created time */}
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-auto">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            {new Date(room.created_at).toLocaleDateString('vi-VN', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })}
          </span>
        </div>
      </div>

      {/* Footer - Fixed height */}
      <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200">
        <div className="flex gap-2">
          <button
            onClick={onJoin}
            disabled={isFull}
            className={`flex-1 px-4 py-2.5 rounded-xl font-semibold transition-all transform ${isFull
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0'
              }`}
          >
            {isFull ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                </svg>
                Đã đầy
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Tham gia
              </span>
            )}
          </button>

          {isOwner && (
            <button
              onClick={onInvite}
              className="px-4 py-2.5 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-blue-300 transition-all shadow-sm hover:shadow-md"
              title="Mời người khác"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}