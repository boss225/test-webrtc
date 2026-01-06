import { useEffect, useRef, useState, useCallback } from 'react';
import { Participant, SignalData } from '@/types';

// TURN servers cho production
const ICE_SERVERS = {
  iceServers: [
    // Google STUN servers
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    
    // Free TURN server (Metered - cần đăng ký để có credentials tốt hơn)
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  iceTransportPolicy: 'all' as RTCIceTransportPolicy,
  iceCandidatePoolSize: 10,
};

export function useWebRTC(userId: string, username: string) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isInitialized, setIsInitialized] = useState(false);
  const [connectionStates, setConnectionStates] = useState<Map<string, RTCPeerConnectionState>>(new Map());

  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const signalingConnection = useRef<EventSource | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Khởi tạo local stream
  const initializeMedia = useCallback(async (video: boolean, audio: boolean) => {
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: video ? { 
          width: { ideal: 640 }, 
          height: { ideal: 480 },
          facingMode: 'user'
        } : false,
        audio: audio ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
        } : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsCameraOn(video);
      setIsMicOn(audio);
      setIsInitialized(true);

      console.log('Media initialized:', { 
        video, 
        audio, 
        tracks: stream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled }))
      });

      // Cập nhật tracks cho các peer connections hiện tại
      peerConnections.current.forEach((pc, peerId) => {
        console.log('Updating tracks for peer:', peerId);
        
        // Xóa tất cả senders cũ
        pc.getSenders().forEach(sender => {
          try {
            pc.removeTrack(sender);
          } catch (e) {
            console.warn('Error removing track:', e);
          }
        });
        
        // Thêm tracks mới
        stream.getTracks().forEach(track => {
          try {
            pc.addTrack(track, stream);
            console.log('Added track:', track.kind, 'to peer:', peerId);
          } catch (e) {
            console.warn('Error adding track:', e);
          }
        });
      });

      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }, []);

  // Toggle camera
  const toggleCamera = useCallback(async () => {
    console.log('Toggle camera - Current state:', isCameraOn);
    
    try {
      if (!localStreamRef.current) {
        await initializeMedia(true, isMicOn);
        
        await fetch('/api/update-media-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, isCameraOn: true, isMicOn }),
        });
        return;
      }

      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      
      if (videoTrack) {
        const newState = !isCameraOn;
        videoTrack.enabled = newState;
        setIsCameraOn(newState);
        
        console.log('Video track toggled:', newState);
        
        await fetch('/api/update-media-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, isCameraOn: newState, isMicOn }),
        });
      } else {
        const videoStream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 640 }, 
            height: { ideal: 480 },
            facingMode: 'user'
          } 
        });
        
        const newVideoTrack = videoStream.getVideoTracks()[0];
        localStreamRef.current.addTrack(newVideoTrack);
        
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
        setIsCameraOn(true);
        
        peerConnections.current.forEach((pc) => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(newVideoTrack);
          } else {
            pc.addTrack(newVideoTrack, localStreamRef.current!);
          }
        });
        
        await fetch('/api/update-media-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, isCameraOn: true, isMicOn }),
        });
      }
    } catch (error) {
      console.error('Error toggling camera:', error);
    }
  }, [isCameraOn, isMicOn, userId, initializeMedia]);

  // Toggle microphone
  const toggleMic = useCallback(async () => {
    console.log('Toggle mic - Current state:', isMicOn);
    
    try {
      if (!localStreamRef.current) {
        await initializeMedia(isCameraOn, true);
        
        await fetch('/api/update-media-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, isCameraOn, isMicOn: true }),
        });
        return;
      }

      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      
      if (audioTrack) {
        const newState = !isMicOn;
        audioTrack.enabled = newState;
        setIsMicOn(newState);
        
        console.log('Audio track toggled:', newState, 'Track enabled:', audioTrack.enabled);
        
        await fetch('/api/update-media-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, isCameraOn, isMicOn: newState }),
        });
      } else {
        const audioStream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000,
          } 
        });
        
        const newAudioTrack = audioStream.getAudioTracks()[0];
        localStreamRef.current.addTrack(newAudioTrack);
        
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
        setIsMicOn(true);
        
        peerConnections.current.forEach((pc) => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'audio');
          if (sender) {
            sender.replaceTrack(newAudioTrack);
          } else {
            pc.addTrack(newAudioTrack, localStreamRef.current!);
          }
        });
        
        await fetch('/api/update-media-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, isCameraOn, isMicOn: true }),
        });
      }
    } catch (error) {
      console.error('Error toggling microphone:', error);
    }
  }, [isMicOn, isCameraOn, userId, initializeMedia]);

  // Tạo peer connection với detailed logging
  const createPeerConnection = useCallback((targetUserId: string) => {
    console.log('Creating peer connection for:', targetUserId);
    
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local tracks nếu có
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        console.log('Adding local track to peer:', track.kind, track.enabled, 'for:', targetUserId);
        const sender = pc.addTrack(track, localStreamRef.current!);
        console.log('Track added, sender:', sender.track?.kind);
      });
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('ICE candidate for:', targetUserId, event.candidate.type);
        fetch('/api/signal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'ice-candidate',
            from: userId,
            to: targetUserId,
            data: event.candidate,
          }),
        }).catch(err => console.error('Failed to send ICE candidate:', err));
      }
    };

    // Handle remote stream
    pc.ontrack = (event) => {
      console.log('Received remote track:', event.track.kind, 'enabled:', event.track.enabled, 'from:', targetUserId);
      console.log('Remote stream tracks:', event.streams[0].getTracks().map(t => ({ kind: t.kind, enabled: t.enabled })));
      
      setRemoteStreams(prev => {
        const newMap = new Map(prev);
        newMap.set(targetUserId, event.streams[0]);
        return newMap;
      });
    };

    // Connection state monitoring
    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${targetUserId}:`, pc.connectionState);
      setConnectionStates(prev => {
        const newMap = new Map(prev);
        newMap.set(targetUserId, pc.connectionState);
        return newMap;
      });

      // Reconnect logic
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        console.warn(`Connection ${pc.connectionState} with ${targetUserId}, attempting to reconnect...`);
        
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }

        reconnectTimeoutRef.current = setTimeout(() => {
          pc.restartIce();
        }, 2000);
      }
    };

    // ICE connection state
    pc.oniceconnectionstatechange = () => {
      console.log(`ICE connection state with ${targetUserId}:`, pc.iceConnectionState);
    };

    // ICE gathering state
    pc.onicegatheringstatechange = () => {
      console.log(`ICE gathering state with ${targetUserId}:`, pc.iceGatheringState);
    };

    // Signaling state
    pc.onsignalingstatechange = () => {
      console.log(`Signaling state with ${targetUserId}:`, pc.signalingState);
    };

    peerConnections.current.set(targetUserId, pc);
    return pc;
  }, [userId]);

  // Tạo offer
  const createOffer = useCallback(async (targetUserId: string) => {
    try {
      console.log('Creating offer for:', targetUserId);
      const pc = createPeerConnection(targetUserId);
      
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      
      await pc.setLocalDescription(offer);
      console.log('Offer created and set as local description for:', targetUserId);

      await fetch('/api/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'offer',
          from: userId,
          to: targetUserId,
          data: offer,
        }),
      });
      
      console.log('Offer sent to:', targetUserId);
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  }, [createPeerConnection, userId]);

  // Handle offer
  const handleOffer = useCallback(async (from: string, offer: RTCSessionDescriptionInit) => {
    try {
      console.log('Handling offer from:', from);
      const pc = createPeerConnection(from);
      
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      console.log('Remote description set for offer from:', from);
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log('Answer created and set as local description for:', from);

      await fetch('/api/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'answer',
          from: userId,
          to: from,
          data: answer,
        }),
      });
      
      console.log('Answer sent to:', from);
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  }, [createPeerConnection, userId]);

  // Handle answer
  const handleAnswer = useCallback(async (from: string, answer: RTCSessionDescriptionInit) => {
    try {
      console.log('Handling answer from:', from);
      const pc = peerConnections.current.get(from);
      
      if (pc && pc.signalingState !== 'stable') {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        console.log('Remote description set for answer from:', from);
      } else {
        console.warn('Cannot set remote description, signaling state:', pc?.signalingState);
      }
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  }, []);

  // Handle ICE candidate
  const handleIceCandidate = useCallback(async (from: string, candidate: RTCIceCandidateInit) => {
    try {
      const pc = peerConnections.current.get(from);
      
      if (pc && pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
        console.log('ICE candidate added for:', from);
      } else {
        console.warn('Cannot add ICE candidate, remote description not set for:', from);
      }
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  }, []);

  // Setup signaling
  useEffect(() => {
    let isSubscribed = true;

    const setupSignaling = async () => {
      try {
        // Khởi tạo media mặc định
        await initializeMedia(false, true);

        // Join room
        await fetch('/api/join-room', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: userId,
            username,
            isCameraOn: false,
            isMicOn: true,
          }),
        });

        // Connect to signaling server
        const eventSource = new EventSource(`/api/signaling?userId=${userId}`);
        signalingConnection.current = eventSource;

        eventSource.onopen = () => {
          console.log('Signaling connection opened');
        };

        eventSource.onmessage = async (event) => {
          if (!isSubscribed) return;

          try {
            const data = JSON.parse(event.data);
            console.log('Signaling message received:', data.type, 'from:', data.from);

            switch (data.type) {
              case 'initial-participants':
                setParticipants(data.participants.filter((p: Participant) => p.id !== userId));
                // Tạo offer cho tất cả participants hiện có với delay
                for (const p of data.participants) {
                  if (p.id !== userId) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    await createOffer(p.id);
                  }
                }
                break;

              case 'user-joined':
                if (data.participant.id !== userId) {
                  setParticipants(prev => [...prev, data.participant]);
                }
                break;

              case 'user-left':
                setParticipants(prev => prev.filter(p => p.id !== data.from));
                setRemoteStreams(prev => {
                  const newMap = new Map(prev);
                  newMap.delete(data.from);
                  return newMap;
                });
                const pc = peerConnections.current.get(data.from);
                if (pc) {
                  pc.close();
                  peerConnections.current.delete(data.from);
                }
                break;

              case 'media-state-changed':
                setParticipants(prev => 
                  prev.map(p => p.id === data.from ? data.participant : p)
                );
                break;

              case 'offer':
                await handleOffer(data.from, data.data);
                break;

              case 'answer':
                await handleAnswer(data.from, data.data);
                break;

              case 'ice-candidate':
                await handleIceCandidate(data.from, data.data);
                break;
            }
          } catch (error) {
            console.error('Error processing signaling message:', error);
          }
        };

        eventSource.onerror = (error) => {
          console.error('Signaling error:', error);
          eventSource.close();
          
          // Reconnect after delay
          if (isSubscribed) {
            setTimeout(() => {
              console.log('Attempting to reconnect signaling...');
              setupSignaling();
            }, 5000);
          }
        };
      } catch (error) {
        console.error('Setup signaling error:', error);
      }
    };

    setupSignaling();

    return () => {
      isSubscribed = false;
      
      // Cleanup
      signalingConnection.current?.close();
      
      peerConnections.current.forEach(pc => {
        pc.close();
      });
      peerConnections.current.clear();
      
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [userId, username, createOffer, handleOffer, handleAnswer, handleIceCandidate, initializeMedia]);

  return {
    localStream,
    remoteStreams,
    participants,
    isCameraOn,
    isMicOn,
    toggleCamera,
    toggleMic,
    initializeMedia,
    isInitialized,
    connectionStates,
  };
}