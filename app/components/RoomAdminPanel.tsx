'use client';

import { useState, useEffect, useCallback } from 'react';
import { Room, RoomParticipant, RoomBlacklist } from '@/types';

interface RoomAdminPanelProps {
  room: Room;
  currentUserId: string;
  onClose: () => void;
  onRoomDeleted?: () => void;
}

export default function RoomAdminPanel({ 
  room, 
  currentUserId, 
  onClose,
  onRoomDeleted 
}: RoomAdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'participants' | 'blacklist' | 'settings'>('participants');
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [blacklist, setBlacklist] = useState<RoomBlacklist[]>([]);
  const [loading, setLoading] = useState(false);
  const [newBlacklistEmail, setNewBlacklistEmail] = useState('');
  const [blacklistReason, setBlacklistReason] = useState('');

  const isOwner = room.created_by === currentUserId;

  const loadParticipants = useCallback(async () => {
    try {
      const response = await fetch(`/api/rooms/${room.id}/participants`);
      const data = await response.json();
      setParticipants(data);
    } catch (error) {
      console.error('Error loading participants:', error);
    }
  }, [room.id]);

  const loadBlacklist = useCallback(async () => {
    try {
      const response = await fetch(`/api/rooms/${room.id}/blacklist`);
      const data = await response.json();
      setBlacklist(data);
    } catch (error) {
      console.error('Error loading blacklist:', error);
    }
  }, [room.id]);

  useEffect(() => {
    loadParticipants();
    loadBlacklist();
  }, [loadParticipants, loadBlacklist]);

  const handleKickUser = async (targetUserId: string) => {
    const participant = participants.find(p => p.user_id === targetUserId);
    
    if (!confirm(`Bạn có chắc muốn loại bỏ ${participant?.users?.username} khỏi phòng?`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/rooms/${room.id}/kick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUserId: currentUserId,
          targetUserId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Không thể loại bỏ user');
        return;
      }

      alert(data.message);
      loadParticipants();
    } catch (error) {
      console.error('Kick user error:', error);
      alert('Lỗi khi loại bỏ user');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToBlacklist = async (targetUserId?: string, targetEmail?: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/rooms/${room.id}/blacklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUserId: currentUserId,
          targetUserId,
          targetEmail,
          reason: blacklistReason || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Không thể chặn');
        return;
      }

      alert(data.message);
      setNewBlacklistEmail('');
      setBlacklistReason('');
      loadBlacklist();
      loadParticipants();
    } catch (error) {
      console.error('Add blacklist error:', error);
      alert('Lỗi khi chặn user');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromBlacklist = async (blacklistId: string) => {
    if (!confirm('Bạn có chắc muốn bỏ chặn?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/rooms/${room.id}/blacklist`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUserId: currentUserId,
          blacklistId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Không thể bỏ chặn');
        return;
      }

      alert(data.message);
      loadBlacklist();
    } catch (error) {
      console.error('Remove blacklist error:', error);
      alert('Lỗi khi bỏ chặn');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoom = async () => {
    if (!confirm(`⚠️ BẠN CÓ CHẮC MUỐN XÓA PHÒNG "${room.name}"?\n\nHành động này không thể hoàn tác!`)) {
      return;
    }

    if (!confirm('Xác nhận lần cuối: Tất cả tin nhắn và dữ liệu sẽ bị xóa vĩnh viễn!')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/rooms/${room.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Không thể xóa phòng');
        return;
      }

      alert(data.message);
      onRoomDeleted?.();
    } catch (error) {
      console.error('Delete room error:', error);
      alert('Lỗi khi xóa phòng');
    } finally {
      setLoading(false);
    }
  };

  if (!isOwner) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md">
          <p className="text-center text-gray-600">Chỉ chủ phòng mới có quyền quản lý</p>
          <button
            onClick={onClose}
            className="w-full mt-4 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            Đóng
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Quản lý phòng</h2>
            <p className="text-sm text-gray-600 mt-1">{room.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('participants')}
            className={`flex-1 py-4 text-center font-medium transition-all ${
              activeTab === 'participants'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            👥 Thành viên ({participants.length})
          </button>
          <button
            onClick={() => setActiveTab('blacklist')}
            className={`flex-1 py-4 text-center font-medium transition-all ${
              activeTab === 'blacklist'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            🚫 Danh sách chặn ({blacklist.length})
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-4 text-center font-medium transition-all ${
              activeTab === 'settings'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            ⚙️ Cài đặt
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* Participants Tab */}
          {activeTab === 'participants' && (
            <div className="space-y-3">
              {participants.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Chưa có thành viên nào</p>
              ) : (
                participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                        {participant.users?.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {participant.users?.username}
                          {participant.role === 'owner' && (
                            <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded">
                              👑 Chủ phòng
                            </span>
                          )}
                          {participant.role === 'admin' && (
                            <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded">
                              ⭐ Admin
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-600">{participant.users?.email}</p>
                      </div>
                    </div>

                    {participant.role !== 'owner' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleKickUser(participant.user_id)}
                          disabled={loading}
                          className="px-3 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition-all text-sm disabled:opacity-50"
                        >
                          Loại bỏ
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Chặn ${participant.users?.username}?`)) {
                              handleAddToBlacklist(participant.user_id);
                            }
                          }}
                          disabled={loading}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-all text-sm disabled:opacity-50"
                        >
                          Chặn
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Blacklist Tab */}
          {activeTab === 'blacklist' && (
            <div className="space-y-4">
              {/* Add to blacklist form */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3">Thêm vào blacklist</h3>
                <div className="space-y-3">
                  <input
                    type="email"
                    value={newBlacklistEmail}
                    onChange={(e) => setNewBlacklistEmail(e.target.value)}
                    placeholder="Email cần chặn"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    value={blacklistReason}
                    onChange={(e) => setBlacklistReason(e.target.value)}
                    placeholder="Lý do (tùy chọn)"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => handleAddToBlacklist(undefined, newBlacklistEmail)}
                    disabled={loading || !newBlacklistEmail}
                    className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all disabled:opacity-50"
                  >
                    Chặn email này
                  </button>
                </div>
              </div>

              {/* Blacklist entries */}
              <div className="space-y-3">
                {blacklist.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">Chưa có ai bị chặn</p>
                ) : (
                  blacklist.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {entry.blocked_user?.username || entry.blocked_email}
                        </p>
                        {entry.reason && (
                          <p className="text-sm text-gray-600 mt-1">Lý do: {entry.reason}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          Chặn lúc {new Date(entry.created_at).toLocaleString('vi-VN')}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveFromBlacklist(entry.id)}
                        disabled={loading}
                        className="px-3 py-1 bg-white text-red-700 border border-red-300 rounded hover:bg-red-50 transition-all text-sm disabled:opacity-50"
                      >
                        Bỏ chặn
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Thông tin phòng</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>Tên: <span className="font-medium text-gray-900">{room.name}</span></p>
                  {room.description && (
                    <p>Mô tả: <span className="font-medium text-gray-900">{room.description}</span></p>
                  )}
                  <p>Số người tối đa: <span className="font-medium text-gray-900">{room.max_participants}</span></p>
                  <p>Loại: <span className="font-medium text-gray-900">{room.is_private ? 'Riêng tư' : 'Công khai'}</span></p>
                  <p>Tạo lúc: <span className="font-medium text-gray-900">{new Date(room.created_at).toLocaleString('vi-VN')}</span></p>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                <h3 className="font-semibold text-red-900 mb-2">⚠️ Vùng nguy hiểm</h3>
                <p className="text-sm text-red-700 mb-4">
                  Xóa phòng sẽ xóa vĩnh viễn tất cả tin nhắn, thành viên và dữ liệu liên quan. Hành động này không thể hoàn tác!
                </p>
                <button
                  onClick={handleDeleteRoom}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all disabled:opacity-50 font-medium"
                >
                  🗑️ Xóa phòng vĩnh viễn
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}