import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Camera, Check } from 'lucide-react';
import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from './AuthContext';

export default function CreateGroupDetails() {
  const navigate = useNavigate();
  const location = useLocation();
  const { members } = location.state as { members: string[] };
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const createGroup = async () => {
    if (!name || !user) return;
    try {
      await addDoc(collection(db, 'chats'), {
        participants: [...members, user.uid],
        isGroup: true,
        groupName: name,
        description: description,
        createdAt: serverTimestamp(),
      });
      alert(`Group "${name}" created!`);
      navigate('/chat');
    } catch (e) {
      console.error("Error creating group:", e);
      alert("Failed to create group.");
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white p-6">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/10 rounded-full">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold">Group Details</h2>
      </div>

      <div className="flex justify-center mb-8">
        <div className="w-32 h-32 bg-white/10 rounded-full flex items-center justify-center relative">
            <Camera className="w-12 h-12 text-white/50" />
            <button className="absolute bottom-0 right-0 p-2 bg-emerald-500 rounded-full">
                <Camera className="w-4 h-4 text-white" />
            </button>
        </div>
      </div>

      <input 
        type="text" 
        placeholder="Group Name" 
        className="w-full bg-[#1a1a1a] border-b border-white/10 px-4 py-3 text-white mb-4 text-lg focus:outline-none"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input 
        type="text" 
        placeholder="Description" 
        className="w-full bg-[#1a1a1a] border-b border-white/10 px-4 py-3 text-white mb-8 text-lg focus:outline-none"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <button 
        onClick={createGroup}
        className="fixed bottom-8 right-8 w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
      >
        <Check className="w-8 h-8" />
      </button>
    </div>
  );
}
