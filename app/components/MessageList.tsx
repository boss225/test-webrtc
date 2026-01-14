'use client';

import { Message } from '@/types';
import { useEffect, useRef, useMemo, memo } from 'react';
import MessageItem from './MessageItem';

interface MessageListProps {
  messages: Message[];
  currentUsername: string;
  isLoading?: boolean;
}

const MessageList = memo(function MessageList({ messages, currentUsername, isLoading }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(0);

  // Only scroll if new message was added
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      prevMessagesLengthRef.current = messages.length;
    }
  }, [messages.length]);

  // Memoize message items with their display properties
  const messageItems = useMemo(() => {
    return messages.map((message, index) => {
      const isOwnMessage = message.username === currentUsername;
      const showAvatar = index === 0 || messages[index - 1].username !== message.username;
      const isLastFromUser = index === messages.length - 1 || messages[index + 1].username !== message.username;
      
      return (
        <MessageItem
          key={message.id}
          message={message}
          isOwnMessage={isOwnMessage}
          showAvatar={showAvatar}
          isLastFromUser={isLastFromUser}
        />
      );
    });
  }, [messages, currentUsername]);

  return (
    <div 
      ref={containerRef}
      className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-gray-50 to-gray-100"
      style={{ maxHeight: 'calc(100vh - 14.3rem)' }}
    >
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Đang tải tin nhắn...</p>
          </div>
        </div>
      ) : messages.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-gray-400">
            <svg
              className="w-16 h-16 mx-auto mb-4 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p className="text-lg font-medium">Chưa có tin nhắn nào</p>
            <p className="text-sm mt-1">Hãy bắt đầu cuộc trò chuyện!</p>
          </div>
        </div>
      ) : (
        <>
          {messageItems}
          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  );
});

export default MessageList;