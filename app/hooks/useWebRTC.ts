import { useEffect, useRef, useState, useCallback } from 'react';
import { Participant, SignalData } from '@/types';

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
};

export function useWebRTC(userId: string, username: string) {
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [isCameraOn, setIsCameraOn] = useState(false);
    const [isMicOn, setIsMicOn] = useState(false);
    const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
    const [isInitialized, setIsInitialized] = useState(false);

    const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
    const signalingConnection = useRef<EventSource | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);

    // Khởi tạo local stream
    const initializeMedia = useCallback(async (video: boolean, audio: boolean) => {
        try {
            // Dừng stream cũ nếu có
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
                    autoGainControl: true
                } : false,
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);

            localStreamRef.current = stream;
            setLocalStream(stream);
            setIsCameraOn(video);
            setIsMicOn(audio);
            setIsInitialized(true);

            console.log('Media initialized:', { video, audio, tracks: stream.getTracks().length });

            // Cập nhật tracks cho các peer connections hiện tại
            peerConnections.current.forEach((pc) => {
                // Xóa tất cả senders cũ
                pc.getSenders().forEach(sender => pc.removeTrack(sender));

                // Thêm tracks mới
                stream.getTracks().forEach(track => {
                    pc.addTrack(track, stream);
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
                // Khởi tạo stream với camera
                await initializeMedia(true, isMicOn);

                // Cập nhật server
                await fetch('/api/update-media-state', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, isCameraOn: true, isMicOn }),
                });
                return;
            }

            const videoTrack = localStreamRef.current.getVideoTracks()[0];

            if (videoTrack) {
                // Nếu có video track, toggle enabled
                const newState = !isCameraOn;
                videoTrack.enabled = newState;
                setIsCameraOn(newState);

                console.log('Video track toggled:', newState);

                // Cập nhật server
                await fetch('/api/update-media-state', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, isCameraOn: newState, isMicOn }),
                });
            } else {
                // Nếu chưa có video track, tạo mới
                const videoStream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 640 },
                        height: { ideal: 480 },
                        facingMode: 'user'
                    }
                });

                const newVideoTrack = videoStream.getVideoTracks()[0];
                localStreamRef.current.addTrack(newVideoTrack);

                // Cập nhật state
                setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
                setIsCameraOn(true);

                // Thêm track vào peer connections
                peerConnections.current.forEach((pc) => {
                    const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                    if (sender) {
                        sender.replaceTrack(newVideoTrack);
                    } else {
                        pc.addTrack(newVideoTrack, localStreamRef.current!);
                    }
                });

                console.log('Video track added');

                // Cập nhật server
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

    // Toggle microphone - FIX
    const toggleMic = useCallback(async () => {
        console.log('Toggle mic - Current state:', isMicOn);

        try {
            if (!localStreamRef.current) {
                // Khởi tạo stream với audio
                await initializeMedia(isCameraOn, true);

                // Cập nhật server
                await fetch('/api/update-media-state', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, isCameraOn, isMicOn: true }),
                });
                return;
            }

            const audioTrack = localStreamRef.current.getAudioTracks()[0];

            if (audioTrack) {
                // Nếu có audio track, toggle enabled
                const newState = !isMicOn;
                audioTrack.enabled = newState;
                setIsMicOn(newState);

                console.log('Audio track toggled:', newState, 'Track enabled:', audioTrack.enabled);

                // Cập nhật server
                await fetch('/api/update-media-state', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, isCameraOn, isMicOn: newState }),
                });
            } else {
                // Nếu chưa có audio track, tạo mới
                const audioStream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    }
                });

                const newAudioTrack = audioStream.getAudioTracks()[0];
                localStreamRef.current.addTrack(newAudioTrack);

                // Cập nhật state
                setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
                setIsMicOn(true);

                // Thêm track vào peer connections
                peerConnections.current.forEach((pc) => {
                    const sender = pc.getSenders().find(s => s.track?.kind === 'audio');
                    if (sender) {
                        sender.replaceTrack(newAudioTrack);
                    } else {
                        pc.addTrack(newAudioTrack, localStreamRef.current!);
                    }
                });

                console.log('Audio track added');

                // Cập nhật server
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

    // Tạo peer connection
    const createPeerConnection = useCallback((targetUserId: string) => {
        const pc = new RTCPeerConnection(ICE_SERVERS);

        // Add local tracks nếu có
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                console.log('Adding track to peer:', track.kind, track.enabled);
                pc.addTrack(track, localStreamRef.current!);
            });
        }

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                fetch('/api/signal', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'ice-candidate',
                        from: userId,
                        to: targetUserId,
                        data: event.candidate,
                    }),
                });
            }
        };

        // Handle remote stream
        pc.ontrack = (event) => {
            console.log('Received remote track:', event.track.kind, 'from:', targetUserId);
            setRemoteStreams(prev => {
                const newMap = new Map(prev);
                newMap.set(targetUserId, event.streams[0]);
                return newMap;
            });
        };

        // Connection state monitoring
        pc.onconnectionstatechange = () => {
            console.log(`Connection state with ${targetUserId}:`, pc.connectionState);
        };

        peerConnections.current.set(targetUserId, pc);
        return pc;
    }, [userId]);

    // Tạo offer
    const createOffer = useCallback(async (targetUserId: string) => {
        try {
            const pc = createPeerConnection(targetUserId);
            const offer = await pc.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
            });
            await pc.setLocalDescription(offer);

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
        } catch (error) {
            console.error('Error creating offer:', error);
        }
    }, [createPeerConnection, userId]);

    // Handle offer
    const handleOffer = useCallback(async (from: string, offer: RTCSessionDescriptionInit) => {
        try {
            const pc = createPeerConnection(from);
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

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
        } catch (error) {
            console.error('Error handling offer:', error);
        }
    }, [createPeerConnection, userId]);

    // Handle answer
    const handleAnswer = useCallback(async (from: string, answer: RTCSessionDescriptionInit) => {
        try {
            const pc = peerConnections.current.get(from);
            if (pc && pc.signalingState !== 'stable') {
                await pc.setRemoteDescription(new RTCSessionDescription(answer));
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
            }
        } catch (error) {
            console.error('Error handling ICE candidate:', error);
        }
    }, []);

    // Setup signaling
    useEffect(() => {
        const setupSignaling = async () => {
            // Khởi tạo media mặc định (chỉ audio)
            try {
                await initializeMedia(false, true);
            } catch (error) {
                console.error('Failed to initialize media:', error);
            }

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

            eventSource.onmessage = async (event) => {
                const data = JSON.parse(event.data);

                switch (data.type) {
                    case 'initial-participants':
                        setParticipants(data.participants.filter((p: Participant) => p.id !== userId));
                        // Tạo offer cho tất cả participants hiện có
                        for (const p of data.participants) {
                            if (p.id !== userId) {
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
            };

            eventSource.onerror = (error) => {
                console.error('Signaling error:', error);
            };
        };

        setupSignaling();

        return () => {
            // Cleanup
            signalingConnection.current?.close();
            peerConnections.current.forEach(pc => pc.close());
            peerConnections.current.clear();

            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
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
    };
}