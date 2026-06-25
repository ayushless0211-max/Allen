import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { ArrowLeft, Users, MessageSquare, Plus } from 'lucide-react';

export default function NewMessageMenu() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const isAdmin = profile?.role === 'admin' || user?.email === 'ayushless0211@gmail.com';

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white p-6">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate('/chat')} className="p-2 hover:bg-white/10 rounded-full">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold">New Message</h2>
      </div>

      <div className="space-y-2">
        {isAdmin && (
          <button 
            onClick={() => navigate('/create-group-contacts')}
            className="w-full text-left p-4 hover:bg-white/5 rounded-2xl flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
            </div>
            <div>
                <div className="font-bold">New Group</div>
                <div className="text-sm text-white/50">Up to 200,000 members</div>
            </div>
          </button>
        )}
        <button 
          onClick={() => navigate('/dashboard')}
          className="w-full text-left p-4 hover:bg-white/5 rounded-2xl flex items-center gap-4"
        >
          <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="font-bold">New Chat</div>
            <div className="text-sm text-white/50">Chat with a person</div>
          </div>
        </button>
        <button className="w-full text-left p-4 hover:bg-white/5 rounded-2xl flex items-center gap-4 opacity-50 cursor-not-allowed">
          <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
              <Plus className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="font-bold">Join Group</div>
            <div className="text-sm text-white/50">Coming Soon</div>
          </div>
        </button>
      </div>
    </div>
  );
}
