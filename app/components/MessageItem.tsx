'use client';

import { memo } from 'react';
import { Message } from '@/types';

interface MessageItemProps {
  message: Message;
  isOwnMessage: boolean;
  showAvatar: boolean;
  isLastFromUser: boolean;
}

const MessageItem = memo(function MessageItem({
  message,
  isOwnMessage,
  showAvatar,
  isLastFromUser,
}: MessageItemProps) {
  const isPending = message.id.startsWith('temp-');

  return (
    <div
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
          {/* Username */}
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
                  } rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl ${
                    isPending ? 'opacity-80' : ''
                  }`
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
              
              {/* Status indicator */}
              {isOwnMessage && (
                isPending ? (
                  <svg
                    className="w-4 h-4 text-blue-100 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                ) : (
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
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for better performance
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.text === nextProps.message.text &&
    prevProps.isOwnMessage === nextProps.isOwnMessage &&
    prevProps.showAvatar === nextProps.showAvatar &&
    prevProps.isLastFromUser === nextProps.isLastFromUser
  );
});

export default MessageItem;
