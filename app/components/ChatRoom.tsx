'use client';

import { useEffect, useState, useCallback } from 'react';
import { Message } from '@/types';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import VideoGrid from './VideoGrid';
import VideoControls from './VideoControls';
import UserProfile from './UserProfile';
import { useWebRTC } from '../hooks/useWebRTC';
import { useAuth } from '../contexts/AuthContext';

export default function ChatRoom() {
  const { userId, username, logout } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [showVideo, setShowVideo] = useState(true);

  const {
    localStream,
    remoteStreams,
    participants,
    isCameraOn,
    isMicOn,
    toggleCamera,
    toggleMic,
  } = useWebRTC(userId!, username!);

  useEffect(() => {
    const eventSource = new EventSource('/api/sse');

    eventSource.onopen = () => {
      setIsConnected(true);
      console.log('SSE Connected');
    };

    eventSource.onerror = (error) => {
      console.error('SSE Error:', error);
      setIsConnected(false);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'initial') {
          setMessages(data.messages);
        } else {
          setMessages(prev => [...prev, data]);
        }
      } catch (error) {
        console.error('Parse error:', error);
      }
    };

    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    try {
      const response = await fetch('/api/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, text }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Send message error:', error);
    }
  }, [username]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <header className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold">Video Chat Room</h1>
            </div>
            
            <div className="flex items-center gap-2">
              <span className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                isConnected 
                  ? 'bg-green-500/20 text-green-100' 
                  : 'bg-red-500/20 text-red-100'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-300' : 'bg-red-300'
                }`}></span>
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
              
              <span className="flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-full text-sm font-medium">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
                {participants.length + 1}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowVideo(!showVideo)}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all flex items-center gap-2 font-medium"
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

            <UserProfile />
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl mx-auto w-full flex overflow-hidden">
        {/* Video Section */}
        <div className={`flex flex-col bg-gray-900 ${
          showVideo ? 'w-2/3' : 'w-0'
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
        <div className={`flex flex-col bg-white ${
          showVideo ? 'w-1/3' : 'w-full'
        } transition-all duration-300 border-l shadow-lg`}>
          {/* Chat header */}
          <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
            <h2 className="font-semibold flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
              </svg>
              Tin nhắn nhóm
            </h2>
            <p className="text-xs text-blue-100 mt-1">
              {participants.length + 1} thành viên
            </p>
          </div>

          <MessageList messages={messages} currentUsername={username!} />
          <MessageInput
            username={username!}
            onSendMessage={sendMessage}
            disabled={!isConnected}
          />
        </div>
      </div>
    </div>
  );
}