'use client';

interface ConnectionStatusProps {
  connectionStates: Map<string, RTCPeerConnectionState>;
  participants: Array<{ id: string; username: string }>;
}

export default function ConnectionStatus({ connectionStates, participants }: ConnectionStatusProps) {
  return (
    <div className="fixed bottom-20 right-4 bg-black/80 text-white p-4 rounded-lg text-xs max-w-xs space-y-2">
      <h3 className="font-bold mb-2">Connection Status</h3>
      {participants.map(p => {
        const state = connectionStates.get(p.id) || 'new';
        const color = 
          state === 'connected' ? 'text-green-400' :
          state === 'connecting' ? 'text-yellow-400' :
          state === 'failed' || state === 'disconnected' ? 'text-red-400' :
          'text-gray-400';
        
        return (
          <div key={p.id} className="flex items-center justify-between">
            <span>{p.username}</span>
            <span className={color}>● {state}</span>
          </div>
        );
      })}
    </div>
  );
}