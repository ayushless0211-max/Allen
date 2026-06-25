import React, { useEffect, useRef, useState } from 'react';
import { db } from './firebase';
import { doc, setDoc, getDoc, onSnapshot, collection, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { PhoneOff, Mic, MicOff, Video as VideoIcon, VideoOff, MonitorUp, MonitorOff } from 'lucide-react';

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

interface VideoCallProps {
  chatId: string;
  userId: string;
  isInitiator: boolean;
  onEndCall: () => void;
}

export default function VideoCall({ chatId, userId, isInitiator, onEndCall }: VideoCallProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pc = useRef<RTCPeerConnection | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isScreenShareSupported, setIsScreenShareSupported] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [hasRemoteUserJoined, setHasRemoteUserJoined] = useState(false);
  const candidatesQueue = useRef<RTCIceCandidateInit[]>([]);

  useEffect(() => {
    let isMounted = true;
    pc.current = new RTCPeerConnection(servers);

    // Check if screen sharing is supported and not on a mobile/tablet device
    const checkScreenShareSupport = () => {
      const hasDisplayMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
      setIsScreenShareSupported(hasDisplayMedia && !isMobile);
    };
    checkScreenShareSupport();

    const setupMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!isMounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        stream.getTracks().forEach((track) => {
          if (pc.current?.signalingState !== 'closed') {
            const sender = pc.current?.addTrack(track, stream);
            if (track.kind === 'video' && sender) {
              try {
                const params = sender.getParameters();
                // @ts-ignore - degradationPreference might not be in all TS DOM lib versions
                params.degradationPreference = 'maintain-framerate';
                sender.setParameters(params).catch(e => console.error("Error setting sender parameters:", e));
              } catch (e) {
                console.error("Could not set degradation preference", e);
              }
            }
          }
        });

        const rStream = new MediaStream();
        setRemoteStream(rStream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = rStream;
        }

        if (pc.current) {
          pc.current.ontrack = (event) => {
            event.streams[0].getTracks().forEach((track) => {
              rStream.addTrack(track);
            });
            setHasRemoteUserJoined(true);
          };
        }

        if (isInitiator) {
          startCall();
        } else {
          joinCall();
        }
      } catch (error) {
        console.error("Error accessing media devices:", error);
        alert("Could not access camera or microphone.");
        onEndCall();
      }
    };

    setupMedia();

    let hasConnected = false;
    const callDoc = doc(db, 'chats', chatId, 'call', 'current');
    const unsubscribe = onSnapshot(callDoc, (snapshot) => {
      if (snapshot.exists()) {
        hasConnected = true;
      } else if (hasConnected && isMounted) {
        // Call ended by the other party
        hangup(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
      hangup(true);
    };
  }, []);

  const startCall = async () => {
    if (!pc.current) return;
    const callDoc = doc(db, 'chats', chatId, 'call', 'current');
    const offerCandidates = collection(callDoc, 'offerCandidates');
    const answerCandidates = collection(callDoc, 'answerCandidates');

    pc.current.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(offerCandidates, event.candidate.toJSON());
      }
    };

    const offerDescription = await pc.current.createOffer();
    await pc.current.setLocalDescription(offerDescription);

    const offer = {
      sdp: offerDescription.sdp,
      type: offerDescription.type,
    };

    await setDoc(callDoc, { offer, callerId: userId, timestamp: Date.now() });

    onSnapshot(callDoc, async (snapshot) => {
      const data = snapshot.data();
      if (pc.current && !pc.current.currentRemoteDescription && data?.answer) {
        const answerDescription = new RTCSessionDescription(data.answer);
        await pc.current.setRemoteDescription(answerDescription);
        
        candidatesQueue.current.forEach(c => {
          pc.current?.addIceCandidate(new RTCIceCandidate(c)).catch(e => console.error(e));
        });
        candidatesQueue.current = [];
      }
    });

    onSnapshot(answerCandidates, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' && pc.current) {
          const data = change.doc.data() as RTCIceCandidateInit;
          if (pc.current.remoteDescription) {
            pc.current.addIceCandidate(new RTCIceCandidate(data)).catch(e => console.error(e));
          } else {
            candidatesQueue.current.push(data);
          }
        }
      });
    });
  };

  const joinCall = async () => {
    if (!pc.current) return;
    const callDoc = doc(db, 'chats', chatId, 'call', 'current');
    const offerCandidates = collection(callDoc, 'offerCandidates');
    const answerCandidates = collection(callDoc, 'answerCandidates');

    pc.current.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(answerCandidates, event.candidate.toJSON());
      }
    };

    const callData = (await getDoc(callDoc)).data();
    if (!callData?.offer) return;

    const offerDescription = callData.offer;
    await pc.current.setRemoteDescription(new RTCSessionDescription(offerDescription));

    const answerDescription = await pc.current.createAnswer();
    await pc.current.setLocalDescription(answerDescription);

    const answer = {
      type: answerDescription.type,
      sdp: answerDescription.sdp,
    };

    await updateDoc(callDoc, { answer });

    candidatesQueue.current.forEach(c => {
      pc.current?.addIceCandidate(new RTCIceCandidate(c)).catch(e => console.error(e));
    });
    candidatesQueue.current = [];

    onSnapshot(offerCandidates, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' && pc.current) {
          const data = change.doc.data() as RTCIceCandidateInit;
          if (pc.current.remoteDescription) {
            pc.current.addIceCandidate(new RTCIceCandidate(data)).catch(e => console.error(e));
          } else {
            candidatesQueue.current.push(data);
          }
        }
      });
    });
  };

  const hangup = async (isUnmounting = false) => {
    if (pc.current) {
      pc.current.close();
      pc.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
    }
    
    try {
      const callDoc = doc(db, 'chats', chatId, 'call', 'current');
      const docSnap = await getDoc(callDoc);
      if (docSnap.exists()) {
        await deleteDoc(callDoc);
      }
    } catch (error) {
      console.error("Error deleting call doc:", error);
    }

    if (!isUnmounting) {
      onEndCall();
    }
  };

  const toggleMic = () => {
    if (localStream) {
      localStream.getAudioTracks()[0].enabled = !isMicOn;
      setIsMicOn(!isMicOn);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks()[0].enabled = !isVideoOn;
      setIsVideoOn(!isVideoOn);
    }
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
          alert("Screen sharing is not supported on this browser or device. If you are using a mobile device, screen sharing may not be available.");
          return;
        }

        const sStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = sStream.getVideoTracks()[0];
        
        if (pc.current) {
          const sender = pc.current.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(screenTrack);
            try {
              const params = sender.getParameters();
              // @ts-ignore
              params.degradationPreference = 'maintain-resolution';
              sender.setParameters(params).catch(e => console.error(e));
            } catch (e) {
              console.error("Could not set degradation preference", e);
            }
          }
        }
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = sStream;
        }
        
        setScreenStream(sStream);
        setIsScreenSharing(true);

        screenTrack.onended = () => {
          stopScreenShare();
        };
      } catch (error) {
        console.error("Error sharing screen:", error);
        alert("Could not start screen sharing. Please check your browser permissions.");
      }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = () => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
    }
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (pc.current) {
        const sender = pc.current.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(videoTrack);
          try {
            const params = sender.getParameters();
            // @ts-ignore
            params.degradationPreference = 'maintain-framerate';
            sender.setParameters(params).catch(e => console.error(e));
          } catch (e) {
            console.error("Could not set degradation preference", e);
          }
        }
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }
    }
    setIsScreenSharing(false);
  };

  return (
    <div className="absolute inset-0 z-50 bg-[#050505] flex flex-col rounded-[2.5rem] overflow-hidden">
      <div className="flex-1 relative bg-black">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-contain"
        />
        {!hasRemoteUserJoined && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-white/50 animate-pulse">
              {isInitiator ? "Waiting for other user to join..." : "Connecting to call..."}
            </p>
          </div>
        )}
        <div className="absolute top-6 right-6 w-32 h-48 sm:w-48 sm:h-72 bg-gray-900 rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl z-10">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${!isScreenSharing ? 'scale-x-[-1]' : ''}`}
          />
        </div>
      </div>
      <div className="h-24 bg-[#0a0a0a] border-t border-white/10 flex items-center justify-center gap-4 sm:gap-6">
        <button onClick={toggleMic} className={`p-3 sm:p-4 rounded-full transition-colors ${isMicOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'}`}>
          {isMicOn ? <Mic className="w-5 h-5 sm:w-6 sm:h-6" /> : <MicOff className="w-5 h-5 sm:w-6 sm:h-6" />}
        </button>
        <button onClick={toggleVideo} className={`p-3 sm:p-4 rounded-full transition-colors ${isVideoOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'}`}>
          {isVideoOn ? <VideoIcon className="w-5 h-5 sm:w-6 sm:h-6" /> : <VideoOff className="w-5 h-5 sm:w-6 sm:h-6" />}
        </button>
        {isScreenShareSupported && (
          <button onClick={toggleScreenShare} className={`p-3 sm:p-4 rounded-full transition-colors ${isScreenSharing ? 'bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30' : 'bg-white/10 hover:bg-white/20 text-white'}`}>
            {isScreenSharing ? <MonitorOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <MonitorUp className="w-5 h-5 sm:w-6 sm:h-6" />}
          </button>
        )}
        <button onClick={() => hangup(false)} className="p-3 sm:p-4 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20">
          <PhoneOff className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </div>
    </div>
  );
}
