'use client';

import { Participant } from '@/types';
import VideoTile from './VideoTile';

interface VideoGridProps {
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  participants: Participant[];
  currentUserId: string;
  currentUsername: string;
  isCameraOn: boolean;
  isMicOn: boolean;
}

export default function VideoGrid({
  localStream,
  remoteStreams,
  participants,
  currentUserId,
  currentUsername,
  isCameraOn,
  isMicOn,
}: VideoGridProps) {
  const allParticipants = [
    {
      id: currentUserId,
      username: currentUsername,
      isCameraOn,
      isMicOn,
      stream: localStream,
      isLocal: true,
    },
    ...participants.map(p => ({
      ...p,
      stream: remoteStreams.get(p.id),
      isLocal: false,
    })),
  ];

  return (
    <div className={`grid gap-2 p-4 h-full ${
      allParticipants.length === 1 ? 'grid-cols-1' :
      allParticipants.length === 2 ? 'grid-cols-2' :
      allParticipants.length <= 4 ? 'grid-cols-2 grid-rows-2' :
      allParticipants.length <= 6 ? 'grid-cols-3 grid-rows-2' :
      'grid-cols-4 auto-rows-fr'
    }`}>
      {allParticipants.map((participant) => (
        <VideoTile
          key={participant.id}
          participant={participant}
          stream={participant.stream}
          isLocal={participant.isLocal}
        />
      ))}
    </div>
  );
}