import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Globe, Plus } from 'lucide-react';

interface ChatPreview {
  chatId: string;
  isGroup?: boolean;
  groupName?: string;
  otherUser?: {
    uid: string;
    name: string;
    skillHave: string;
  };
}

export default function ChatList() {
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'chats'), where('participants', 'array-contains', user.uid));
    
    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      try {
        const chatPreviews: ChatPreview[] = [];
        const seenUids = new Set<string>();
        
        for (const chatDoc of querySnapshot.docs) {
          const data = chatDoc.data();
          
          if (data.isGroup) {
            chatPreviews.push({
              chatId: chatDoc.id,
              isGroup: true,
              groupName: data.groupName
            });
          } else {
            const otherUid = data.participants.find((id: string) => id !== user.uid);
            
            if (otherUid && !seenUids.has(otherUid)) {
              seenUids.add(otherUid);
              const userDoc = await getDoc(doc(db, 'users', otherUid));
              if (userDoc.exists()) {
                chatPreviews.push({
                  chatId: chatDoc.id,
                  otherUser: {
                    uid: otherUid,
                    name: userDoc.data().name,
                    skillHave: userDoc.data().skillHave
                  }
                });
              }
            }
          }
        }
        setChats(chatPreviews);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching chats:", error);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <div className="w-full px-6 sm:px-12 relative min-h-screen">
      <h2 className="text-4xl font-medium tracking-tight mb-10">Your Messages</h2>
      
      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white/[0.03] border border-white/5 rounded-[2.5rem]">
            <div className="relative flex items-center justify-center">
              <div className="absolute w-24 h-24 bg-white/5 rounded-full blur-xl animate-pulse" />
              <Globe className="w-12 h-12 text-white/80 animate-[spin_3s_linear_infinite]" strokeWidth={1.5} />
            </div>
            <p className="mt-6 text-white/40 tracking-widest text-sm uppercase font-medium animate-pulse">
              Loading Chats
            </p>
          </div>
        ) : chats.length === 0 ? (
          <div className="text-center py-20 bg-white/[0.03] border border-white/5 rounded-[2.5rem]">
            <MessageSquare className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/50 text-lg">No active chats yet.</p>
            <button 
              onClick={() => navigate('/dashboard')}
              className="mt-6 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-full text-sm font-medium transition-colors cursor-pointer"
            >
              Explore Profiles
            </button>
          </div>
        ) : (
          chats.map((chat) => (
            <div 
              key={chat.chatId}
              onClick={() => navigate(chat.isGroup ? `/chat/${chat.chatId}` : `/chat/${chat.otherUser?.uid}`)}
              className="p-6 bg-white/[0.03] border border-white/5 rounded-3xl hover:bg-white/[0.06] transition-colors cursor-pointer flex items-center justify-between group"
            >
              <div>
                <h3 className="text-xl font-medium tracking-tight mb-1">
                  {chat.isGroup ? chat.groupName : chat.otherUser?.name}
                </h3>
                <p className="text-xs text-white/40 uppercase tracking-widest font-semibold">
                  {chat.isGroup ? "Group Chat" : chat.otherUser?.skillHave}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/50 group-hover:bg-white group-hover:text-black transition-colors">
                <MessageSquare className="w-5 h-5" />
              </div>
            </div>
          ))
        )}
      </div>

      <button
        onClick={() => navigate('/new-message')}
        className="fixed bottom-8 right-8 w-14 h-14 bg-white text-black rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
      >
        <Plus className="w-8 h-8" />
      </button>
    </div>
  );
}
