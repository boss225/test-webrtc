import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const ICE_SERVERS = {
  iceServers: [{ urls: "stun:openrelay.metered.ca:80" }],
};

const Room = () => {
  const [micActive, setMicActive] = useState(true);
  const [cameraActive, setCameraActive] = useState(true);

  const router = useRouter();
  const userVideoRef = useRef();
  const peerVideoRef = useRef();
  const rtcConnectionRef = useRef(null);
  const socketRef = useRef();
  const userStreamRef = useRef();
  const hostRef = useRef(false);

  const { id: roomName } = router.query;
  useEffect(() => {
    socketRef.current = io(undefined, {
      path: "/api/socket",
    });
    // First we join a room
    socketRef.current.emit("join", roomName);

    socketRef.current.on("joined", handleRoomJoined);
    // If the room didn't exist, the server would emit the room was 'created'
    socketRef.current.on("created", handleRoomCreated);
    // Whenever the next person joins, the server emits 'ready'
    socketRef.current.on("ready", initiateCall);

    // Emitted when a peer leaves the room
    socketRef.current.on("leave", onPeerLeave);

    // If the room is full, we show an alert
    socketRef.current.on("full", () => {
      window.location.href = "/";
    });

    // Event called when a remote user initiating the connection and
    socketRef.current.on("offer", handleReceivedOffer);
    socketRef.current.on("answer", handleAnswer);
    socketRef.current.on("ice-candidate", handlerNewIceCandidateMsg);

    // clear up after
    return () => socketRef.current.disconnect();
  }, [roomName]);

  const handleRoomJoined = () => {
    navigator.mediaDevices
      .getUserMedia({
        audio: true,
        video: { width: 500, height: 500 },
      })
      .then((stream) => {
        /* use the stream */
        userStreamRef.current = stream;
        userVideoRef.current.srcObject = stream;
        userVideoRef.current.onloadedmetadata = () => {
          userVideoRef.current.play();
        };
        socketRef.current.emit("ready", roomName);
      })
      .catch((err) => {
        /* handle the error */
        console.log("error", err);
      });
  };

  const handleRoomCreated = () => {
    hostRef.current = true;
    navigator.mediaDevices
      .getUserMedia({
        audio: true,
        video: { width: 500, height: 500 },
      })
      .then((stream) => {
        /* use the stream */
        userStreamRef.current = stream;
        userVideoRef.current.srcObject = stream;
        userVideoRef.current.onloadedmetadata = () => {
          userVideoRef.current.play();
        };
      })
      .catch((err) => {
        /* handle the error */
        console.log(err);
      });
  };

  const initiateCall = () => {
    if (hostRef.current) {
      rtcConnectionRef.current = createPeerConnection();
      rtcConnectionRef.current.addTrack(
        userStreamRef.current.getTracks()[0],
        userStreamRef.current
      );
      rtcConnectionRef.current.addTrack(
        userStreamRef.current.getTracks()[1],
        userStreamRef.current
      );
      rtcConnectionRef.current
        .createOffer()
        .then((offer) => {
          rtcConnectionRef.current.setLocalDescription(offer);
          socketRef.current.emit("offer", offer, roomName);
        })
        .catch((error) => {
          console.log(error);
        });
    }
  };

  const onPeerLeave = () => {
    // This person is now the creator because they are the only person in the room.
    hostRef.current = true;
    if (peerVideoRef.current.srcObject) {
      peerVideoRef.current.srcObject
        .getTracks()
        .forEach((track) => track.stop()); // Stops receiving all track of Peer.
    }

    // Safely closes the existing connection established with the peer who left.
    if (rtcConnectionRef.current) {
      rtcConnectionRef.current.ontrack = null;
      rtcConnectionRef.current.onicecandidate = null;
      rtcConnectionRef.current.close();
      rtcConnectionRef.current = null;
    }
  };

  /**
   * Takes a userid which is also the socketid and returns a WebRTC Peer
   *
   * @param  {string} userId Represents who will receive the offer
   * @returns {RTCPeerConnection} peer
   */

  const createPeerConnection = () => {
    // We create a RTC Peer Connection
    const connection = new RTCPeerConnection(ICE_SERVERS);

    // We implement our onicecandidate method for when we received a ICE candidate from the STUN server
    connection.onicecandidate = handleICECandidateEvent;

    // We implement our onTrack method for when we receive tracks
    connection.ontrack = handleTrackEvent;
    return connection;
  };

  const handleReceivedOffer = (offer) => {
    if (!hostRef.current) {
      rtcConnectionRef.current = createPeerConnection();
      rtcConnectionRef.current.addTrack(
        userStreamRef.current.getTracks()[0],
        userStreamRef.current
      );
      rtcConnectionRef.current.addTrack(
        userStreamRef.current.getTracks()[1],
        userStreamRef.current
      );
      rtcConnectionRef.current.setRemoteDescription(offer);

      rtcConnectionRef.current
        .createAnswer()
        .then((answer) => {
          rtcConnectionRef.current.setLocalDescription(answer);
          socketRef.current.emit("answer", answer, roomName);
        })
        .catch((error) => {
          console.log(error);
        });
    }
  };

  const handleAnswer = (answer) => {
    rtcConnectionRef.current
      .setRemoteDescription(answer)
      .catch((err) => console.log(err));
  };

  const handleICECandidateEvent = (event) => {
    if (event.candidate) {
      socketRef.current.emit("ice-candidate", event.candidate, roomName);
    }
  };

  const handlerNewIceCandidateMsg = (incoming) => {
    // We cast the incoming candidate to RTCIceCandidate
    const candidate = new RTCIceCandidate(incoming);
    rtcConnectionRef.current
      .addIceCandidate(candidate)
      .catch((e) => console.log(e));
  };

  const handleTrackEvent = (event) => {
    // eslint-disable-next-line prefer-destructuring
    peerVideoRef.current.srcObject = event.streams[0];
  };

  const toggleMediaStream = (type, state) => {
    userStreamRef.current.getTracks().forEach((track) => {
      if (track.kind === type) {
        // eslint-disable-next-line no-param-reassign
        track.enabled = !state;
      }
    });
  };

  const toggleMic = () => {
    toggleMediaStream("audio", micActive);
    setMicActive((prev) => !prev);
  };

  const toggleCamera = () => {
    toggleMediaStream("video", cameraActive);
    setCameraActive((prev) => !prev);
  };

  const leaveRoom = () => {
    socketRef.current.emit("leave", roomName); // Let's the server know that user has left the room.

    if (userVideoRef.current.srcObject) {
      userVideoRef.current.srcObject
        .getTracks()
        .forEach((track) => track.stop()); // Stops receiving all track of User.
    }
    if (peerVideoRef.current.srcObject) {
      peerVideoRef.current.srcObject
        .getTracks()
        .forEach((track) => track.stop()); // Stops receiving audio track of Peer.
    }

    // Checks if there is peer on the other side and safely closes the existing connection established with the peer.
    if (rtcConnectionRef.current) {
      rtcConnectionRef.current.ontrack = null;
      rtcConnectionRef.current.onicecandidate = null;
      rtcConnectionRef.current.close();
      rtcConnectionRef.current = null;
    }
    router.push("/");
  };

  return (
    <div>
      <video autoPlay ref={userVideoRef} />
      <video autoPlay ref={peerVideoRef} />
      <button onClick={toggleMic} type="button">
        {micActive ? "Mute Mic" : "UnMute Mic"}
      </button>
      <button onClick={leaveRoom} type="button">
        Leave
      </button>
      <button onClick={toggleCamera} type="button">
        {cameraActive ? "Stop Camera" : "Start Camera"}
      </button>
    </div>
  );
};

export default Room;

// import { useRouter } from "next/router";
// import { useEffect, useRef, useState } from "react";
// import { io } from "socket.io-client";
// import useSocket from "../../hooks/useSocket";

// const ICE_SERVERS = {
//   iceServers: [{ urls: "stun:openrelay.metered.ca:80" }],
// };

// const Room = () => {
//   useSocket();
//   const [micActive, setMicActive] = useState(true);
//   const [cameraActive, setCameraActive] = useState(true);

//   const router = useRouter();
//   const userVideoRef = useRef();
//   const peerVideoRefs = useRef({});
//   const rtcConnections = useRef({});
//   const socketRef = useRef();
//   const userStreamRef = useRef();
//   const hostRef = useRef(false);

//   const { id: roomName } = router.query;

//   useEffect(() => {
//     socketRef.current = io();

//     socketRef.current.emit("join", roomName);

//     socketRef.current.on("joined", handleRoomJoined);
//     socketRef.current.on("created", handleRoomCreated);
//     socketRef.current.on("ready", initiateCall);
//     socketRef.current.on("leave", onPeerLeave);
//     socketRef.current.on("full", () => {
//       window.location.href = "/";
//     });

//     socketRef.current.on("offer", handleReceivedOffer);
//     socketRef.current.on("answer", handleAnswer);
//     socketRef.current.on("ice-candidate", handleNewIceCandidateMsg);

//     socketRef.current.on("user-joined", handleUserJoined);
//     socketRef.current.on("user-left", handleUserLeft);

//     return () => socketRef.current.disconnect();
//   }, [roomName]);

//   const handleRoomJoined = () => {
//     navigator.mediaDevices
//       .getUserMedia({
//         audio: true,
//         video: { width: 500, height: 500 },
//       })
//       .then((stream) => {
//         userStreamRef.current = stream;
//         userVideoRef.current.srcObject = stream;
//         userVideoRef.current.onloadedmetadata = () => {
//           userVideoRef.current.play();
//         };
//         socketRef.current.emit("ready", roomName);
//       })
//       .catch((err) => {
//         console.log("error", err);
//       });
//   };

//   const handleRoomCreated = () => {
//     hostRef.current = true;
//     navigator.mediaDevices
//       .getUserMedia({
//         audio: true,
//         video: { width: 500, height: 500 },
//       })
//       .then((stream) => {
//         userStreamRef.current = stream;
//         userVideoRef.current.srcObject = stream;
//         userVideoRef.current.onloadedmetadata = () => {
//           userVideoRef.current.play();
//         };
//       })
//       .catch((err) => {
//         console.log(err);
//       });
//   };

//   const initiateCall = () => {
//     if (hostRef.current) {
//       socketRef.current.emit("ready", roomName);
//     }
//   };

//   const onPeerLeave = () => {
//     hostRef.current = true;
//     Object.values(peerVideoRefs.current).forEach((videoRef) => {
//       if (videoRef.srcObject) {
//         videoRef.srcObject.getTracks().forEach((track) => track.stop());
//       }
//     });

//     Object.values(rtcConnections.current).forEach((connection) => {
//       connection.ontrack = null;
//       connection.onicecandidate = null;
//       connection.close();
//     });

//     peerVideoRefs.current = {};
//     rtcConnections.current = {};
//   };

//   const handleUserJoined = (userId) => {
//     if (userId === socketRef.current.id) return;
//     const connection = createPeerConnection(userId);
//     rtcConnections.current[userId] = connection;
//     userStreamRef.current.getTracks().forEach((track) => {
//       connection.addTrack(track, userStreamRef.current);
//     });
//   };

//   const handleUserLeft = (userId) => {
//     if (peerVideoRefs.current[userId]) {
//       peerVideoRefs.current[userId].srcObject.getTracks().forEach((track) => track.stop());
//       delete peerVideoRefs.current[userId];
//     }
//     if (rtcConnections.current[userId]) {
//       rtcConnections.current[userId].ontrack = null;
//       rtcConnections.current[userId].onicecandidate = null;
//       rtcConnections.current[userId].close();
//       delete rtcConnections.current[userId];
//     }
//   };

//   const createPeerConnection = (userId) => {
//     const connection = new RTCPeerConnection(ICE_SERVERS);

//     connection.onicecandidate = (event) => handleICECandidateEvent(event, userId);
//     connection.ontrack = (event) => handleTrackEvent(event, userId);

//     return connection;
//   };

//   const handleReceivedOffer = (offer, userId) => {
//     const connection = createPeerConnection(userId);
//     rtcConnections.current[userId] = connection;
//     connection.setRemoteDescription(new RTCSessionDescription(offer));

//     userStreamRef.current.getTracks().forEach((track) => {
//       connection.addTrack(track, userStreamRef.current);
//     });

//     connection.createAnswer().then((answer) => {
//       connection.setLocalDescription(answer);
//       socketRef.current.emit("answer", answer, roomName, userId);
//     });
//   };

//   const handleAnswer = (answer, userId) => {
//     const connection = rtcConnections.current[userId];
//     connection.setRemoteDescription(new RTCSessionDescription(answer));
//   };

//   const handleICECandidateEvent = (event, userId) => {
//     if (event.candidate) {
//       socketRef.current.emit("ice-candidate", event.candidate, roomName, userId);
//     }
//   };

//   const handleNewIceCandidateMsg = (candidate, userId) => {
//     const connection = rtcConnections.current[userId];
//     connection.addIceCandidate(new RTCIceCandidate(candidate));
//   };

//   const handleTrackEvent = (event, userId) => {
//     if (!peerVideoRefs.current[userId]) {
//       peerVideoRefs.current[userId] = document.createElement("video");
//       peerVideoRefs.current[userId].autoPlay = true;
//       document.body.appendChild(peerVideoRefs.current[userId]);
//     }
//     peerVideoRefs.current[userId].srcObject = event.streams[0];
//   };

//   const toggleMediaStream = (type, state) => {
//     userStreamRef.current.getTracks().forEach((track) => {
//       if (track.kind === type) {
//         track.enabled = !state;
//       }
//     });
//   };

//   const toggleMic = () => {
//     toggleMediaStream("audio", micActive);
//     setMicActive((prev) => !prev);
//   };

//   const toggleCamera = () => {
//     toggleMediaStream("video", cameraActive);
//     setCameraActive((prev) => !prev);
//   };

//   const leaveRoom = () => {
//     socketRef.current.emit("leave", roomName);

//     if (userVideoRef.current.srcObject) {
//       userVideoRef.current.srcObject.getTracks().forEach((track) => track.stop());
//     }

//     Object.values(peerVideoRefs.current).forEach((videoRef) => {
//       if (videoRef.srcObject) {
//         videoRef.srcObject.getTracks().forEach((track) => track.stop());
//       }
//     });

//     Object.values(rtcConnections.current).forEach((connection) => {
//       connection.ontrack = null;
//       connection.onicecandidate = null;
//       connection.close();
//     });

//     peerVideoRefs.current = {};
//     rtcConnections.current = {};
//     router.push("/");
//   };

//   return (
//     <div>
//       <video autoPlay ref={userVideoRef} />
//       <div id="peer-videos">
//         {Object.values(peerVideoRefs.current).map((videoRef, index) => (
//           <video key={index} autoPlay ref={videoRef} />
//         ))}
//       </div>
//       <button onClick={toggleMic} type="button">
//         {micActive ? "Mute Mic" : "Unmute Mic"}
//       </button>
//       <button onClick={leaveRoom} type="button">
//         Leave
//       </button>
//       <button onClick={toggleCamera} type="button">
//         {cameraActive ? "Stop Camera" : "Start Camera"}
//       </button>
//     </div>
//   );
// };

// export default Room;
