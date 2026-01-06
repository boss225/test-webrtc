'use client';

import { useEffect, useRef } from 'react';

interface VideoTileProps {
  participant: {
    id: string;
    username: string;
    isCameraOn: boolean;
    isMicOn: boolean;
  };
  stream: MediaStream | null | undefined;
  isLocal: boolean;
}

export default function VideoTile({ participant, stream, isLocal }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Check if stream has video track
  const hasVideoTrack = stream && stream.getVideoTracks().length > 0;
  const videoTrackEnabled = hasVideoTrack && stream.getVideoTracks().some(track => track.enabled && track.readyState === 'live');

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      // Ensure video plays
      videoRef.current.play().catch(err => {
        console.warn('Error playing video:', err);
      });
    } else if (videoRef.current && !stream) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  useEffect(() => {
    // Log video track state for debugging
    if (stream) {
      const videoTracks = stream.getVideoTracks();
      console.log(`VideoTile ${participant.username}:`, {
        hasVideoTrack: videoTracks.length > 0,
        videoTrackEnabled: videoTracks.some(t => t.enabled && t.readyState === 'live'),
        participantIsCameraOn: participant.isCameraOn,
        tracks: videoTracks.map(t => ({ enabled: t.enabled, readyState: t.readyState }))
      });
    }
  }, [stream, participant.isCameraOn, participant.username]);

  return (
    <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
      {/* Always render video element if stream exists (for audio and video) */}
      {stream && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={`w-full h-full object-cover ${!videoTrackEnabled ? 'hidden' : ''}`}
        />
      )}
      
      {/* Show placeholder when no video track or video track disabled */}
      {!videoTrackEnabled && (
        <div className="w-full h-full flex items-center justify-center absolute inset-0">
          <div className="w-24 h-24 rounded-full bg-blue-500 flex items-center justify-center text-white text-4xl font-bold">
            {participant.username.charAt(0).toUpperCase()}
          </div>
        </div>
      )}

      {/* User info overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
        <div className="flex items-center justify-between">
          <span className="text-white font-medium">
            {participant.username} {isLocal && '(You)'}
          </span>
          <div className="flex gap-2">
            {!participant.isMicOn && (
              <span className="bg-red-500 text-white px-2 py-1 rounded text-xs">
                🔇 Muted
              </span>
            )}
            {!participant.isCameraOn && (
              <span className="bg-red-500 text-white px-2 py-1 rounded text-xs">
                📷 Off
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}