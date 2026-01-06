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
  const iceCandidateQueue = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

  // Cấu hình audio codec để có chất lượng tốt nhất
  const configureAudioCodec = useCallback(async (sender: RTCRtpSender, params: RTCRtpSendParameters) => {
    // Ưu tiên Opus codec với bitrate cao cho voice quality tốt
    const opusCodec = params.codecs.find(codec => 
      codec.mimeType.toLowerCase().includes('opus')
    );
    
    if (opusCodec) {
      // Sắp xếp lại để Opus lên đầu
      params.codecs = [
        opusCodec,
        ...params.codecs.filter(c => c !== opusCodec)
      ];
    }

    // Cấu hình bitrate cho audio (32-64 kbps là tốt cho voice)
    if (params.encodings && params.encodings.length > 0) {
      params.encodings[0].maxBitrate = 64000; // 64 kbps cho chất lượng voice tốt
    }

    await sender.setParameters(params);
    console.log('Audio sender configured with codec:', opusCodec?.mimeType || 'default');
  }, []);

  // Cấu hình audio sender để có chất lượng tốt nhất
  const configureAudioSender = useCallback(async (sender: RTCRtpSender) => {
    try {
      const params = sender.getParameters();
      if (!params.codecs || params.codecs.length === 0) {
        // Nếu chưa có codecs, đợi một chút rồi thử lại
        setTimeout(async () => {
          try {
            const retryParams = sender.getParameters();
            await configureAudioCodec(sender, retryParams);
          } catch (e) {
            console.warn('Error configuring audio on retry:', e);
          }
        }, 100);
        return;
      }
      await configureAudioCodec(sender, params);
    } catch (error) {
      console.warn('Error configuring audio sender:', error);
    }
  }, [configureAudioCodec]);

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
          channelCount: { ideal: 1, min: 1 },
          // Tối ưu cho voice (Chrome-specific properties)
          ...({
            googEchoCancellation: true,
            googNoiseSuppression: true,
            googAutoGainControl: true,
            googHighpassFilter: true,
            googTypingNoiseDetection: true,
          } as Record<string, unknown>),
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
            const sender = pc.addTrack(track, stream);
            console.log('Added track:', track.kind, 'to peer:', peerId);
            
            // Cấu hình audio quality nếu là audio track
            if (track.kind === 'audio') {
              // Đợi một chút để peer connection sẵn sàng
              setTimeout(() => {
                configureAudioSender(sender).catch(e => 
                  console.warn('Error configuring audio sender:', e)
                );
              }, 200);
            }
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
  }, [configureAudioSender]);

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
        
        // Add video track to all peer connections and renegotiate
        for (const [peerId, pc] of peerConnections.current.entries()) {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            // Replace existing video track
            await sender.replaceTrack(newVideoTrack);
            // Renegotiate if connection is stable
            if (pc.signalingState === 'stable') {
              try {
                const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
                await pc.setLocalDescription(offer);
                await fetch('/api/signal', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    type: 'offer',
                    from: userId,
                    to: peerId,
                    data: offer,
                  }),
                });
                console.log('Renegotiated offer sent for video track to:', peerId);
              } catch (err) {
                console.error('Error renegotiating for video:', err);
              }
            }
          } else {
            // Add new video track
            pc.addTrack(newVideoTrack, localStreamRef.current!);
            // Renegotiate if connection is stable
            if (pc.signalingState === 'stable') {
              try {
                const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
                await pc.setLocalDescription(offer);
                await fetch('/api/signal', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    type: 'offer',
                    from: userId,
                    to: peerId,
                    data: offer,
                  }),
                });
                console.log('Renegotiated offer sent for new video track to:', peerId);
              } catch (err) {
                console.error('Error renegotiating for new video:', err);
              }
            }
          }
        }
        
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
            channelCount: { ideal: 1, min: 1 },
            // Tối ưu cho voice (Chrome-specific properties)
            ...({
              googEchoCancellation: true,
              googNoiseSuppression: true,
              googAutoGainControl: true,
              googHighpassFilter: true,
              googTypingNoiseDetection: true,
            } as Record<string, unknown>),
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
            // Reconfigure audio quality
            configureAudioSender(sender).catch(e => console.warn('Error reconfiguring audio:', e));
          } else {
            const newSender = pc.addTrack(newAudioTrack, localStreamRef.current!);
            // Configure audio quality
            configureAudioSender(newSender).catch(e => console.warn('Error configuring new audio:', e));
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
  }, [isMicOn, isCameraOn, userId, initializeMedia, configureAudioSender]);

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
        
        // Cấu hình audio quality nếu là audio track
        if (track.kind === 'audio') {
          // Đợi một chút để peer connection sẵn sàng
          setTimeout(() => {
            configureAudioSender(sender).catch(e => 
              console.warn('Error configuring audio sender in createPeerConnection:', e)
            );
          }, 200);
        }
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
      console.log('Remote stream tracks:', event.streams[0]?.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled })));
      
      if (event.streams && event.streams.length > 0) {
        const remoteStream = event.streams[0];
        
        // Listen for track ended
        event.track.onended = () => {
          console.log('Remote track ended:', event.track.kind, 'from:', targetUserId);
        };
        
        setRemoteStreams(prev => {
          const newMap = new Map(prev);
          // Merge tracks if stream already exists
          const existingStream = newMap.get(targetUserId);
          if (existingStream) {
            // Add new track to existing stream
            event.track.onended = () => {
              console.log('Remote track ended:', event.track.kind, 'from:', targetUserId);
            };
            existingStream.addTrack(event.track);
            newMap.set(targetUserId, existingStream);
          } else {
            newMap.set(targetUserId, remoteStream);
          }
          return newMap;
        });
      }
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
  }, [userId, configureAudioSender]);

  // Tạo offer
  const createOffer = useCallback(async (targetUserId: string) => {
    try {
      console.log('Creating offer for:', targetUserId);
      
      // Check if peer connection already exists and is in a valid state
      let pc = peerConnections.current.get(targetUserId);
      if (pc) {
        if (pc.signalingState === 'stable' || pc.signalingState === 'closed') {
          // Connection is stable or closed, we can create a new offer
          if (pc.signalingState === 'closed') {
            pc.close();
            pc = createPeerConnection(targetUserId);
          }
        } else {
          // Connection is in progress, don't create duplicate offer
          console.log('Offer already in progress for:', targetUserId, 'state:', pc.signalingState);
          return;
        }
      } else {
        pc = createPeerConnection(targetUserId);
      }
      
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
      
      // Check if peer connection already exists
      let pc = peerConnections.current.get(from);
      if (!pc) {
        pc = createPeerConnection(from);
      } else if (pc.signalingState === 'stable') {
        // This is a renegotiation offer, we can handle it
        console.log('Renegotiation offer received from:', from);
      } else if (pc.signalingState !== 'have-local-offer') {
        // Connection is in an invalid state, recreate it
        console.warn('Peer connection exists but in invalid state, closing and recreating:', pc.signalingState);
        pc.close();
        pc = createPeerConnection(from);
      }
      
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      console.log('Remote description set for offer from:', from);
      
      // Process queued ICE candidates
      const queuedCandidates = iceCandidateQueue.current.get(from) || [];
      if (queuedCandidates.length > 0) {
        console.log('Processing', queuedCandidates.length, 'queued ICE candidates for:', from);
        for (const candidate of queuedCandidates) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.warn('Error adding queued ICE candidate:', err);
          }
        }
        iceCandidateQueue.current.delete(from);
      }
      
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
      
      if (!pc) {
        console.warn('No peer connection found for:', from);
        return;
      }

      if (pc.signalingState === 'have-local-offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        console.log('Remote description set for answer from:', from);
        
        // Process queued ICE candidates
        const queuedCandidates = iceCandidateQueue.current.get(from) || [];
        if (queuedCandidates.length > 0) {
          console.log('Processing', queuedCandidates.length, 'queued ICE candidates for:', from);
          for (const candidate of queuedCandidates) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
              console.warn('Error adding queued ICE candidate:', err);
            }
          }
          iceCandidateQueue.current.delete(from);
        }
      } else {
        console.warn('Cannot set remote description, signaling state:', pc.signalingState);
      }
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  }, []);

  // Handle ICE candidate
  const handleIceCandidate = useCallback(async (from: string, candidate: RTCIceCandidateInit) => {
    try {
      const pc = peerConnections.current.get(from);
      
      if (!pc) {
        console.warn('No peer connection found for ICE candidate from:', from);
        return;
      }

      if (pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
        console.log('ICE candidate added for:', from);
      } else {
        // Queue the candidate if remote description isn't set yet
        console.log('Queueing ICE candidate for:', from, 'remote description not set yet');
        const queue = iceCandidateQueue.current.get(from) || [];
        queue.push(candidate);
        iceCandidateQueue.current.set(from, queue);
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
                  setParticipants(prev => {
                    // Avoid duplicates
                    if (prev.find(p => p.id === data.participant.id)) {
                      return prev;
                    }
                    return [...prev, data.participant];
                  });
                  // Create offer for the newly joined user
                  // Wait a bit to ensure media is initialized
                  setTimeout(async () => {
                    if (isSubscribed && isInitialized) {
                      await createOffer(data.participant.id);
                    }
                  }, 1000);
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
                // Clean up ICE candidate queue
                iceCandidateQueue.current.delete(data.from);
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
      iceCandidateQueue.current.clear();
      
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