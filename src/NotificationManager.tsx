import React, { useEffect, useRef, useState } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc, orderBy, limit } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Video, PhoneOff, MessageSquare, X } from 'lucide-react';
import { playNotificationSound } from './utils/audio';

export default function NotificationManager() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const activeChatListeners = useRef<Set<string>>(new Set());
  const unsubscribeFunctions = useRef<Map<string, () => void>>(new Map());
  const notifiedMessages = useRef<Set<string>>(new Set());
  const notifiedCalls = useRef<Set<string>>(new Set());
  
  const [incomingCall, setIncomingCall] = useState<{chatId: string, callerName: string, callId: string} | null>(null);
  const [incomingSwap, setIncomingSwap] = useState<{chatId: string, senderName: string, msgId: string} | null>(null);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'chats'), where('participants', 'array-contains', user.uid));
    
    const unsubscribeChats = onSnapshot(q, (querySnapshot) => {
      querySnapshot.docs.forEach((chatDoc) => {
        const chatId = chatDoc.id;
        
        // If we are already listening to this chat, skip
        if (activeChatListeners.current.has(chatId)) return;
        
        activeChatListeners.current.add(chatId);
        const data = chatDoc.data();
        const otherUid = data.participants.find((id: string) => id !== user.uid);

        if (!otherUid) return;

        // Listen for new messages
        const messagesRef = collection(db, 'chats', chatId, 'messages');
        const messagesQuery = query(messagesRef, orderBy('timestamp', 'desc'), limit(1));
        
        let isInitialMessages = true;
        const unsubMessages = onSnapshot(messagesQuery, async (msgSnapshot) => {
          if (isInitialMessages) {
            isInitialMessages = false;
            // Mark existing message as seen/notified so we don't pop them up on page load
            msgSnapshot.docs.forEach((doc) => {
              notifiedMessages.current.add(doc.id);
            });
            return;
          }

          msgSnapshot.docChanges().forEach(async (change) => {
            if (change.type === 'added') {
              const msgData = change.doc.data();
              const msgId = change.doc.id;

              // Only notify if the message is from the other user and we haven't notified yet
              if (msgData.senderId !== user.uid && !notifiedMessages.current.has(msgId)) {
                notifiedMessages.current.add(msgId);
                
                // Absolute timeframe difference check to securely guard against local machine clock out-of-sync
                if (Math.abs(Date.now() - msgData.timestamp) < 45000) {
                  const userDoc = await getDoc(doc(db, 'users', otherUid));
                  const senderName = userDoc.exists() ? userDoc.data().name : 'Someone';
                  
                  if (msgData.type === 'swap_started' && !location.pathname.includes(`/chat/${otherUid}`)) {
                    setIncomingSwap({ chatId, senderName, msgId });
                    playNotificationSound('message');
                    
                    // Auto-dismiss the swap notification after 10 seconds
                    setTimeout(() => {
                      setIncomingSwap(prev => prev?.msgId === msgId ? null : prev);
                    }, 10000);
                  } else {
                    // Regular message sound
                    playNotificationSound('message');
                  }
                  
                  if ('Notification' in window && Notification.permission === 'granted') {
                    let title = `New message from ${senderName}`;
                    let body = msgData.text.includes('https://meet.jit.si/') ? '🎥 Video Call Link' : msgData.text;
                    
                    if (msgData.type === 'swap_started') {
                      title = `🚀 Swap Started!`;
                      body = `${senderName} is ready for your scheduled swap.`;
                    }
                    
                    new Notification(title, {
                      body,
                      icon: '/favicon.ico'
                    });
                  }
                }
              }
            }
          });
        });
        
        // Listen for incoming calls
        const callDocRef = doc(db, 'chats', chatId, 'call', 'current');
        let isInitialCall = true;
        
        const unsubCall = onSnapshot(callDocRef, async (callSnapshot) => {
          if (isInitialCall) {
            isInitialCall = false;
            if (callSnapshot.exists()) {
              const callData = callSnapshot.data();
              const callId = `${chatId}_${callData.timestamp || callData.callerId}`; 
              notifiedCalls.current.add(callId);
            }
            return;
          }

          if (callSnapshot.exists()) {
            const callData = callSnapshot.data();
            // Use timestamp to uniquely identify the call attempt if available, otherwise fallback to callerId
            const callId = `${chatId}_${callData.timestamp || callData.callerId}`; 
            
            if (callData.callerId !== user.uid) {
              // Only notify if the call was initiated recently (within 45 seconds, absolute values logic)
              if (!callData.timestamp || Math.abs(Date.now() - callData.timestamp) < 45000) {
                const userDoc = await getDoc(doc(db, 'users', otherUid));
                const callerName = userDoc.exists() ? userDoc.data().name : 'Someone';
                
                // Show in-app notification if we are not already in that specific chat room
                if (!location.pathname.includes(`/chat/${otherUid}`)) {
                  setIncomingCall({ chatId, callerName, callId });
                }

                if (!notifiedCalls.current.has(callId)) {
                  notifiedCalls.current.add(callId);
                  playNotificationSound('call');

                  if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification(`Incoming Video Call`, {
                      body: `${callerName} is calling you.`,
                      icon: '/favicon.ico'
                    });
                  }
                }
              }
            }
          } else {
            // Call ended or rejected
            setIncomingCall(prev => prev?.chatId === chatId ? null : prev);
          }
        });

        unsubscribeFunctions.current.set(`${chatId}_messages`, unsubMessages);
        unsubscribeFunctions.current.set(`${chatId}_call`, unsubCall);
      });
    });

    return () => {
      unsubscribeChats();
      unsubscribeFunctions.current.forEach(unsub => unsub());
      unsubscribeFunctions.current.clear();
      activeChatListeners.current.clear();
    };
  }, [user, location.pathname]);

  if (!incomingCall && !incomingSwap) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] p-4 flex flex-col gap-2 pointer-events-none">
      {incomingCall && (
        <div className="bg-[#1a1a1a] border border-white/10 p-4 rounded-2xl shadow-2xl flex items-center gap-3 sm:gap-4 w-full max-w-md mx-auto pointer-events-auto animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-500/20 rounded-full flex items-center justify-center animate-pulse shrink-0">
            <Video className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-white font-medium truncate">{incomingCall.callerName}</h4>
            <p className="text-white/60 text-sm truncate">Incoming video call...</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button 
              onClick={() => setIncomingCall(null)}
              className="w-10 h-10 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-full flex items-center justify-center transition-colors"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
            <button 
              onClick={() => {
                setIncomingCall(null);
                const otherUid = incomingCall.chatId.replace(user?.uid || '', '').replace('_', '');
                navigate(`/chat/${otherUid}`);
              }}
              className="w-10 h-10 bg-emerald-500 text-white hover:bg-emerald-600 rounded-full flex items-center justify-center transition-colors shadow-lg shadow-emerald-500/20"
            >
              <Video className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {incomingSwap && (
        <div className="bg-[#1a1a1a] border border-white/10 p-4 rounded-2xl shadow-2xl flex items-center gap-3 sm:gap-4 w-full max-w-md mx-auto pointer-events-auto animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/20 rounded-full flex items-center justify-center animate-bounce shrink-0">
            <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-white font-medium truncate">🚀 Swap Started!</h4>
            <p className="text-white/60 text-sm truncate">{incomingSwap.senderName} is ready.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button 
              onClick={() => setIncomingSwap(null)}
              className="w-10 h-10 bg-white/5 text-white/40 hover:bg-white/10 hover:text-white rounded-full flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <button 
              onClick={() => {
                setIncomingSwap(null);
                const otherUid = incomingSwap.chatId.replace(user?.uid || '', '').replace('_', '');
                navigate(`/chat/${otherUid}`);
              }}
              className="px-4 h-10 bg-blue-500 text-white hover:bg-blue-600 rounded-xl flex items-center justify-center transition-colors shadow-lg shadow-blue-500/20 font-medium text-sm"
            >
              Join
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
