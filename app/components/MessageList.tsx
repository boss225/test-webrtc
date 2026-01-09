'use client';

import { Message } from '@/types';
import { useEffect, useRef } from 'react';

interface MessageListProps {
  messages: Message[];
  currentUsername: string;
  isLoading?: boolean;
}

export default function MessageList({ messages, currentUsername, isLoading }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  console.log('[MessageList] Rendering', messages.length, 'messages');

  return (
    <div 
      ref={containerRef}
      className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-gray-50 to-gray-100"
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
          {messages.map((message, index) => {
            const isOwnMessage = message.username === currentUsername;
            const showAvatar = index === 0 || messages[index - 1].username !== message.username;
            const isLastFromUser = index === messages.length - 1 || messages[index + 1].username !== message.username;
            
            return (
              <div
                key={message.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} animate-slideIn`}
              >
                <div className={`flex items-end gap-2 max-w-[70%] ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Avatar */}
                  {!isOwnMessage && showAvatar && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-sm shadow-md">
                      {message.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  
                  {!isOwnMessage && !showAvatar && (
                    <div className="w-8 h-8 flex-shrink-0" />
                  )}

                  {/* Message bubble */}
                  <div className="flex flex-col">
                    {/* Username (chỉ hiện khi đầu tiên của user) */}
                    {!isOwnMessage && showAvatar && (
                      <span className="text-xs font-semibold text-gray-600 mb-1 ml-3">
                        {message.username}
                      </span>
                    )}

                    {/* Bubble */}
                    <div
                      className={`relative px-4 py-2 shadow-sm ${
                        isOwnMessage
                          ? `bg-gradient-to-br from-blue-500 to-blue-600 text-white ${
                              isLastFromUser ? 'rounded-br-sm' : 'rounded-br-lg'
                            } rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl`
                          : `bg-white text-gray-800 border border-gray-200 ${
                              isLastFromUser ? 'rounded-bl-sm' : 'rounded-bl-lg'
                            } rounded-tl-2xl rounded-tr-2xl rounded-br-2xl`
                      }`}
                    >
                      {/* Message text */}
                      <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                        {message.text}
                      </p>

                      {/* Timestamp */}
                      <div className={`flex items-center gap-1 mt-1 ${
                        isOwnMessage ? 'justify-end' : 'justify-start'
                      }`}>
                        <span className={`text-xs ${
                          isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {new Date(message.created_at).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        
                        {/* Check mark cho tin nhắn của mình */}
                        {isOwnMessage && (
                          <svg
                            className="w-4 h-4 text-blue-100"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  );
}