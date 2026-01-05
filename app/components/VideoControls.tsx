'use client';

import { useState } from 'react';

interface VideoControlsProps {
  isCameraOn: boolean;
  isMicOn: boolean;
  onToggleCamera: () => void;
  onToggleMic: () => void;
  disabled?: boolean;
}

export default function VideoControls({
  isCameraOn,
  isMicOn,
  onToggleCamera,
  onToggleMic,
  disabled,
}: VideoControlsProps) {
  const [isTogglingCamera, setIsTogglingCamera] = useState(false);
  const [isTogglingMic, setIsTogglingMic] = useState(false);

  const handleToggleCamera = async () => {
    if (isTogglingCamera) return;
    setIsTogglingCamera(true);
    try {
      await onToggleCamera();
    } finally {
      setTimeout(() => setIsTogglingCamera(false), 300);
    }
  };

  const handleToggleMic = async () => {
    if (isTogglingMic) return;
    setIsTogglingMic(true);
    try {
      await onToggleMic();
    } finally {
      setTimeout(() => setIsTogglingMic(false), 300);
    }
  };

  return (
    <div className="flex justify-center gap-4 p-4 bg-gray-800">
      <button
        onClick={handleToggleMic}
        disabled={disabled || isTogglingMic}
        className={`p-4 rounded-full transition-all relative ${
          isMicOn
            ? 'bg-gray-700 hover:bg-gray-600'
            : 'bg-red-500 hover:bg-red-600'
        } text-white disabled:opacity-50`}
        title={isMicOn ? 'Tắt mic' : 'Bật mic'}
      >
        {isTogglingMic && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        {isMicOn ? (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
            <line x1="4" y1="4" x2="16" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        )}
        {/* Indicator */}
        <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
          isMicOn ? 'bg-green-400' : 'bg-red-400'
        }`}></span>
      </button>

      <button
        onClick={handleToggleCamera}
        disabled={disabled || isTogglingCamera}
        className={`p-4 rounded-full transition-all relative ${
          isCameraOn
            ? 'bg-gray-700 hover:bg-gray-600'
            : 'bg-red-500 hover:bg-red-600'
        } text-white disabled:opacity-50`}
        title={isCameraOn ? 'Tắt camera' : 'Bật camera'}
      >
        {isTogglingCamera && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        {isCameraOn ? (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
            <line x1="2" y1="2" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        )}
        {/* Indicator */}
        <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
          isCameraOn ? 'bg-green-400' : 'bg-red-400'
        }`}></span>
      </button>

      {/* Status text */}
      <div className="flex items-center gap-2 ml-4">
        <div className="flex items-center gap-1">
          <span className={`w-2 h-2 rounded-full ${isMicOn ? 'bg-green-400' : 'bg-red-400'}`}></span>
          <span className="text-white text-sm">{isMicOn ? 'Mic On' : 'Mic Off'}</span>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <span className={`w-2 h-2 rounded-full ${isCameraOn ? 'bg-green-400' : 'bg-red-400'}`}></span>
          <span className="text-white text-sm">{isCameraOn ? 'Cam On' : 'Cam Off'}</span>
        </div>
      </div>
    </div>
  );
}