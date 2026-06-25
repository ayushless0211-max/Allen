import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from './firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { UserProfile } from './types';

export default function CreateGroupContacts() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  useEffect(() => {
    const q = collection(db, 'users');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: UserProfile[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as UserProfile);
      });
      setUsers(list);
    });
    return () => unsubscribe();
  }, []);

  const toggleMember = (uid: string) => {
    setSelectedMembers(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white p-6">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate('/new-message')} className="p-2 hover:bg-white/10 rounded-full">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h2 className="text-xl font-bold">Add Members</h2>
          <div className="text-sm text-white/50">{selectedMembers.length} selected</div>
        </div>
      </div>

      <div className="space-y-2 mb-20">
        {users.map(user => (
          <div 
            key={user.uid}
            onClick={() => toggleMember(user.uid)}
            className={`p-4 rounded-2xl flex items-center gap-4 cursor-pointer ${selectedMembers.includes(user.uid) ? 'bg-emerald-500/20' : 'hover:bg-white/5'}`}
          >
            <img src={user.photoURL} alt={user.displayName} className="w-12 h-12 rounded-full" />
            <div className="font-bold">{user.displayName}</div>
          </div>
        ))}
      </div>

      <button 
        onClick={() => navigate('/create-group-details', { state: { members: selectedMembers } })}
        className="fixed bottom-8 right-8 w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
      >
        <ArrowRight className="w-8 h-8" />
      </button>
    </div>
  );
}
