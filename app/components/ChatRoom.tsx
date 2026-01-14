'use client';

import { useEffect, useCallback, useRef, useTransition, useMemo, memo } from 'react';
import { Message, Room } from '@/types';
import AppHeader from './AppHeader';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import VideoGrid from './VideoGrid';
import VideoControls from './VideoControls';
import RoomAdminPanel from './RoomAdminPanel';
import { useWebRTC } from '../hooks/useWebRTC';
import { useAuth } from '../contexts/AuthContext';
import { useMessageStore } from '@/lib/stores/messageStore';
import { useRoomStore } from '@/lib/stores/roomStore';
import { useSSE } from '../hooks/useSSE';

interface ChatRoomProps {
  initialRoom?: Room;
  onBack?: () => void;
}

const CURRENT_ROOM_KEY = 'currentRoomId';

const ChatRoom = memo(function ChatRoom({ initialRoom, onBack }: ChatRoomProps) {
  const { userId, username, supabaseUserId } = useAuth();
  const [, startTransition] = useTransition();
  
  // Zustand stores
  const { messages, isLoading: isLoadingMessages, isConnected } = useMessageStore();
  const { currentRoom, showVideo, showAdminPanel, setCurrentRoom, setShowVideo, setShowAdminPanel } = useRoomStore();
  
  // Refs to avoid re-renders
  const currentRoomRef = useRef<Room | null>(initialRoom || null);
  const onBackRef = useRef(onBack);
  
  // Update refs when props change
  useEffect(() => {
    currentRoomRef.current = initialRoom || null;
    onBackRef.current = onBack;
  }, [initialRoom, onBack]);

  // Initialize room in store and clear messages when room changes
  useEffect(() => {
    if (initialRoom) {
      const prevRoom = currentRoomRef.current;
      if (prevRoom?.id !== initialRoom.id) {
        // Room changed, clear messages
        useMessageStore.getState().clearMessages();
      }
      setCurrentRoom(initialRoom);
      currentRoomRef.current = initialRoom;
    }
  }, [initialRoom, setCurrentRoom]);

  // Save room to localStorage (non-urgent update)
  useEffect(() => {
    if (currentRoom) {
      startTransition(() => {
        localStorage.setItem(CURRENT_ROOM_KEY, currentRoom.id);
      });
    }
  }, [currentRoom]);

  // WebRTC hook
  const {
    localStream,
    remoteStreams,
    participants,
    isCameraOn,
    isMicOn,
    toggleCamera,
    toggleMic,
  } = useWebRTC(userId!, username!);

  // SSE hook for messages
  useSSE({
    roomId: currentRoom?.id || '',
    enabled: !!currentRoom,
  });

  const isRoomOwner = useMemo(
    () => currentRoom?.created_by === supabaseUserId,
    [currentRoom?.created_by, supabaseUserId]
  );

  // Join room effect
  useEffect(() => {
    if (!currentRoom || !supabaseUserId) return;

    const joinRoom = async () => {
      try {
        await fetch(`/api/rooms/${currentRoom.id}/participants`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: supabaseUserId,
            isCameraOn,
            isMicOn,
          }),
        });
      } catch {
        // Silent fail
      }
    };

    joinRoom();

    return () => {
      if (!currentRoom || !supabaseUserId) return;
      fetch(`/api/rooms/${currentRoom.id}/participants`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: supabaseUserId }),
      }).catch(() => {
        // Silent fail
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRoom?.id, supabaseUserId, isCameraOn, isMicOn]); // Intentionally exclude currentRoom object to avoid re-joining

  // Optimized sendMessage with Zustand
  const sendMessage = useCallback(async (text: string) => {
    if (!currentRoom || !text.trim() || !supabaseUserId) return;

    const trimmedText = text.trim();
    const { addMessage, removeMessage, replaceOptimisticMessage } = useMessageStore.getState();

    // Create optimistic message
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const optimisticMessage: Message = {
      id: tempId,
      room_id: currentRoom.id,
      user_id: supabaseUserId,
      username: username!,
      text: trimmedText,
      created_at: new Date().toISOString(),
    };

    // Add immediately (optimistic update)
    addMessage(optimisticMessage);

    try {
      const response = await fetch('/api/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          text: trimmedText,
          roomId: currentRoom.id,
          userId: supabaseUserId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        removeMessage(tempId);
        alert(data.error || 'Lỗi khi gửi tin nhắn. Vui lòng thử lại.');
        return;
      }

      // Replace optimistic message with real one
      replaceOptimisticMessage(tempId, data);
    } catch {
      removeMessage(tempId);
      alert('Lỗi kết nối. Vui lòng thử lại.');
    }
  }, [currentRoom, supabaseUserId, username]);

  // Memoized handlers
  const handleToggleVideo = useCallback(() => {
    startTransition(() => {
      setShowVideo(!showVideo);
    });
  }, [showVideo, setShowVideo]);

  const handleShowAdminPanel = useCallback(() => {
    setShowAdminPanel(true);
  }, [setShowAdminPanel]);

  const handleCloseAdminPanel = useCallback(() => {
    setShowAdminPanel(false);
  }, [setShowAdminPanel]);

  const handleRoomDeleted = useCallback(() => {
    setShowAdminPanel(false);
    onBackRef.current?.();
  }, [setShowAdminPanel]);

  // Memoized values
  const subtitle = useMemo(
    () => currentRoom?.description || `${participants.length + 1} thành viên • ${messages.length} tin nhắn`,
    [currentRoom?.description, participants.length, messages.length]
  );

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
      <AppHeader
        title={currentRoom.name}
        subtitle={subtitle}
        actions={
          <ChatRoomActions
            onBack={onBack}
            isConnected={isConnected}
            participantsCount={participants.length}
            showVideo={showVideo}
            onToggleVideo={handleToggleVideo}
            isRoomOwner={isRoomOwner}
            onShowAdminPanel={handleShowAdminPanel}
          />
        }
      />

      <div className="flex-1 max-w-7xl mx-auto w-full flex overflow-hidden">
        <VideoSection
          showVideo={showVideo}
          localStream={localStream}
          remoteStreams={remoteStreams}
          participants={participants}
          currentUserId={userId!}
          currentUsername={username!}
          isCameraOn={isCameraOn}
          isMicOn={isMicOn}
          isConnected={isConnected}
          toggleCamera={toggleCamera}
          toggleMic={toggleMic}
        />

        <ChatSection
          showVideo={showVideo}
          participantsCount={participants.length}
          messagesCount={messages.length}
          messages={messages}
          currentUsername={username!}
          isLoading={isLoadingMessages}
          isConnected={isConnected}
          onSendMessage={sendMessage}
        />
      </div>

      {showAdminPanel && currentRoom && (
        <RoomAdminPanel
          room={currentRoom}
          currentUserId={supabaseUserId!}
          onClose={handleCloseAdminPanel}
          onRoomDeleted={handleRoomDeleted}
        />
      )}
    </div>
  );
});

// Memoized sub-components
const ChatRoomActions = memo(function ChatRoomActions({
  onBack,
  isConnected,
  participantsCount,
  showVideo,
  onToggleVideo,
  isRoomOwner,
  onShowAdminPanel,
}: {
  onBack?: () => void;
  isConnected: boolean;
  participantsCount: number;
  showVideo: boolean;
  onToggleVideo: () => void;
  isRoomOwner: boolean;
  onShowAdminPanel: () => void;
}) {
  return (
    <>
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

      <div className="flex items-center gap-2">
        <span className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium backdrop-blur-sm ${
          isConnected ? 'bg-green-500/20 text-green-100' : 'bg-red-500/20 text-red-100'
        }`}>
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-300' : 'bg-red-300'}`}></span>
          {isConnected ? 'Online' : 'Offline'}
        </span>

        <span className="flex items-center gap-2 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
          </svg>
          {participantsCount + 1}
        </span>
      </div>

      <button
        onClick={onToggleVideo}
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

      {isRoomOwner && (
        <button
          onClick={onShowAdminPanel}
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
  );
});

const VideoSection = memo(function VideoSection({
  showVideo,
  localStream,
  remoteStreams,
  participants,
  currentUserId,
  currentUsername,
  isCameraOn,
  isMicOn,
  isConnected,
  toggleCamera,
  toggleMic,
}: {
  showVideo: boolean;
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  participants: Array<{ id: string; username: string; isCameraOn: boolean; isMicOn: boolean }>;
  currentUserId: string;
  currentUsername: string;
  isCameraOn: boolean;
  isMicOn: boolean;
  isConnected: boolean;
  toggleCamera: () => void;
  toggleMic: () => void;
}) {
  return (
    <div className={`flex flex-col bg-gray-900 ${showVideo ? 'w-2/3' : 'w-0'} transition-all duration-300 overflow-hidden`}>
      <div className="flex-1 overflow-hidden">
        <VideoGrid
          localStream={localStream}
          remoteStreams={remoteStreams}
          participants={participants}
          currentUserId={currentUserId}
          currentUsername={currentUsername}
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
  );
});

const ChatSection = memo(function ChatSection({
  showVideo,
  participantsCount,
  messagesCount,
  messages,
  currentUsername,
  isLoading,
  isConnected,
  onSendMessage,
}: {
  showVideo: boolean;
  participantsCount: number;
  messagesCount: number;
  messages: Message[];
  currentUsername: string;
  isLoading: boolean;
  isConnected: boolean;
  onSendMessage: (text: string) => void;
}) {
  return (
    <div className={`flex flex-col bg-white ${showVideo ? 'w-1/3' : 'w-full'} transition-all duration-300 border-l shadow-lg`}>
      <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
        <h2 className="font-semibold flex items-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
          </svg>
          Tin nhắn nhóm
        </h2>
        <p className="text-xs text-blue-100 mt-1">
          {participantsCount + 1} thành viên • {messagesCount} tin nhắn
        </p>
      </div>

      <MessageList
        messages={messages}
        currentUsername={currentUsername}
        isLoading={isLoading}
      />

      <MessageInput
        username={currentUsername}
        onSendMessage={onSendMessage}
        disabled={!isConnected}
      />
    </div>
  );
});

export default ChatRoom;
