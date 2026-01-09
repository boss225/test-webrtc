'use client';

import { useEffect, useState, useCallback } from 'react';
import { Message, Room } from '@/types';
import AppHeader from './AppHeader';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import VideoGrid from './VideoGrid';
import VideoControls from './VideoControls';
import RoomAdminPanel from './RoomAdminPanel';
import { useWebRTC } from '../hooks/useWebRTC';
import { useAuth } from '../contexts/AuthContext';

interface ChatRoomProps {
  initialRoom?: Room;
  onBack?: () => void;
}

export default function ChatRoom({ initialRoom, onBack }: ChatRoomProps) {
  const { userId, username, supabaseUserId } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [showVideo, setShowVideo] = useState(true);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(initialRoom || null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  const {
    localStream,
    remoteStreams,
    participants,
    isCameraOn,
    isMicOn,
    toggleCamera,
    toggleMic,
  } = useWebRTC(userId!, username!);

  const isRoomOwner = currentRoom?.created_by === supabaseUserId;

  console.log('[ChatRoom] Current room:', currentRoom?.id);
  console.log('[ChatRoom] Messages count:', messages.length);

  // Subscribe to messages
  useEffect(() => {
    if (!currentRoom) {
      console.log('[ChatRoom] No room selected');
      return;
    }

    console.log('[ChatRoom] Setting up SSE for room:', currentRoom.id);
    setIsLoadingMessages(true);
    setMessages([]); // Clear old messages

    const eventSource = new EventSource(`/api/sse?roomId=${currentRoom.id}`);

    eventSource.onopen = () => {
      setIsConnected(true);
      console.log('[ChatRoom] SSE Connected to room:', currentRoom.name);
    };

    eventSource.onerror = (error) => {
      console.error('[ChatRoom] SSE Error:', error);
      setIsConnected(false);
      setIsLoadingMessages(false);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[ChatRoom] SSE Message:', data.type, data);

        if (data.type === 'initial') {
          console.log('[ChatRoom] Initial messages:', data.messages?.length || 0);
          setMessages(data.messages || []);
          setIsLoadingMessages(false);
        } else if (data.id && data.text) {
          // New message
          console.log('[ChatRoom] New message:', data.id);
          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(m => m.id === data.id)) {
              return prev;
            }
            return [...prev, data];
          });
        }
      } catch (error) {
        console.error('[ChatRoom] Parse error:', error);
      }
    };

    return () => {
      console.log('[ChatRoom] Closing SSE connection');
      eventSource.close();
      setIsConnected(false);
    };
  }, [currentRoom]);

  // Join room với better error handling
  useEffect(() => {
    if (!currentRoom || !supabaseUserId) {
      console.log('[ChatRoom] Missing room or user:', {
        hasRoom: !!currentRoom,
        hasUserId: !!supabaseUserId
      });
      return;
    }

    const joinRoom = async () => {
      try {
        console.log('[ChatRoom] Joining room:', {
          roomId: currentRoom.id,
          roomName: currentRoom.name,
          userId: supabaseUserId,
          isCameraOn,
          isMicOn,
        });

        const response = await fetch(`/api/rooms/${currentRoom.id}/participants`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: supabaseUserId,
            isCameraOn,
            isMicOn,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          console.error('[ChatRoom] Join room error:', {
            status: response.status,
            error: data.error,
            details: data.details
          });

          // Show user-friendly error
          if (response.status === 404) {
            alert('User hoặc phòng không tồn tại. Vui lòng đăng nhập lại.');
          } else if (response.status === 403) {
            alert('Phòng đã đầy.');
          } else {
            alert(`Lỗi: ${data.error || 'Không thể tham gia phòng'}`);
          }
          return;
        }

        console.log('[ChatRoom] Joined room successfully:', data);
      } catch (error) {
        console.error('[ChatRoom] Network error joining room:', error);
        alert('Lỗi kết nối. Vui lòng kiểm tra internet và thử lại.');
      }
    };

    joinRoom();

    return () => {
      if (!currentRoom || !supabaseUserId) return;

      console.log('[ChatRoom] Leaving room:', currentRoom.id);

      fetch(`/api/rooms/${currentRoom.id}/participants`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: supabaseUserId }),
      }).catch(error => {
        console.error('[ChatRoom] Error leaving room:', error);
      });
    };
  }, [currentRoom?.id, supabaseUserId]); // Remove isCameraOn, isMicOn from deps

  const sendMessage = useCallback(async (text: string) => {
    if (!currentRoom || !text.trim()) {
      console.log('[ChatRoom] Cannot send message:', { currentRoom, text });
      return;
    }

    console.log('[ChatRoom] Sending message:', text.substring(0, 50));

    try {
      const response = await fetch('/api/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          text: text.trim(),
          roomId: currentRoom.id,
          userId: supabaseUserId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('[ChatRoom] Send message error:', data);
        throw new Error(data.error || 'Failed to send message');
      }

      console.log('[ChatRoom] Message sent:', data.id);
    } catch (error) {
      console.error('[ChatRoom] Send message error:', error);
      alert('Lỗi khi gửi tin nhắn. Vui lòng thử lại.');
    }
  }, [username, currentRoom, supabaseUserId]);
  
  if (!currentRoom) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center bg-white p-8 rounded-2xl shadow-lg">
          <svg
            className="w-16 h-16 mx-auto text-gray-300 mb-4"
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
          <p className="text-gray-600 mb-4">Vui lòng chọn một phòng</p>
          {onBack && (
            <button
              onClick={onBack}
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all"
            >
              Về danh sách phòng
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <AppHeader
        title={currentRoom.name}
        subtitle={currentRoom.description || `${participants.length + 1} thành viên • ${messages.length} tin nhắn`}
        actions={
          <>
            {/* Back button */}
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 hover:bg-white/20 backdrop-blur-sm rounded-lg transition-all"
                title="Về danh sách phòng"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
            )}

            {/* Status badges */}
            <div className="flex items-center gap-2">
              <span className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium backdrop-blur-sm ${isConnected
                  ? 'bg-green-500/20 text-green-100'
                  : 'bg-red-500/20 text-red-100'
                }`}>
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-300' : 'bg-red-300'
                  }`}></span>
                {isConnected ? 'Online' : 'Offline'}
              </span>

              <span className="flex items-center gap-2 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
                {participants.length + 1}
              </span>
            </div>

            {/* Toggle Video/Chat */}
            <button
              onClick={() => setShowVideo(!showVideo)}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg transition-all flex items-center gap-2 font-medium"
            >
              {showVideo ? (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                  </svg>
                  Chỉ Chat
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                  </svg>
                  Hiện Video
                </>
              )}
            </button>

            {/* Admin button */}
            {isRoomOwner && (
              <button
                onClick={() => setShowAdminPanel(true)}
                className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 backdrop-blur-sm text-yellow-100 rounded-lg transition-all flex items-center gap-2 font-medium"
                title="Quản lý phòng"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
                Quản lý
              </button>
            )}
          </>
        }
      />

      <div className="flex-1 max-w-7xl mx-auto w-full flex overflow-hidden">
        {/* Video Section */}
        <div className={`flex flex-col bg-gray-900 ${showVideo ? 'w-2/3' : 'w-0'
          } transition-all duration-300 overflow-hidden`}>
          <div className="flex-1 overflow-hidden">
            <VideoGrid
              localStream={localStream}
              remoteStreams={remoteStreams}
              participants={participants}
              currentUserId={userId!}
              currentUsername={username!}
              isCameraOn={isCameraOn}
              isMicOn={isMicOn}
            />
          </div>
          <VideoControls
            isCameraOn={isCameraOn}
            isMicOn={isMicOn}
            onToggleCamera={toggleCamera}
            onToggleMic={toggleMic}
            disabled={!isConnected}
          />
        </div>

        {/* Chat Section */}
        <div className={`flex flex-col bg-white ${showVideo ? 'w-1/3' : 'w-full'
          } transition-all duration-300 border-l shadow-lg`}>
          <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
            <h2 className="font-semibold flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
              </svg>
              Tin nhắn nhóm
            </h2>
            <p className="text-xs text-blue-100 mt-1">
              {participants.length + 1} thành viên • {messages.length} tin nhắn
            </p>
          </div>

          <MessageList
            messages={messages}
            currentUsername={username!}
            isLoading={isLoadingMessages}
          />

          <MessageInput
            username={username!}
            onSendMessage={sendMessage}
            disabled={!isConnected || !currentRoom}
          />
        </div>
      </div>

      {/* Admin Panel Modal */}
      {showAdminPanel && currentRoom && (
        <RoomAdminPanel
          room={currentRoom}
          currentUserId={supabaseUserId!}
          onClose={() => setShowAdminPanel(false)}
          onRoomDeleted={() => {
            setShowAdminPanel(false);
            onBack?.();
          }}
        />
      )}
    </div>
  );
}