import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import { Search, Mail, MessageCircle, Users, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface UserProfile {
  uid: string;
  name: string;
  contact: string;
  contactType: 'email' | 'whatsapp';
  skillHave: string;
  skillWant: string;
}

export default function Match() {
  const [matches, setMatches] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMatches = async () => {
      if (!user || !profile?.skillWant) {
        setLoading(false);
        return;
      }

      try {
        const q = query(collection(db, 'users'), where('uid', '!=', user.uid));
        const querySnapshot = await getDocs(q);
        
        const myWantedSkills = profile.skillWant.split(',').map(s => s.trim().toLowerCase()).filter(s => s);
        
        const fetchedMatches: UserProfile[] = [];
        querySnapshot.forEach((doc) => {
          const otherProfile = doc.data() as UserProfile;
          const theirSkillHave = otherProfile.skillHave?.toLowerCase() || '';
          
          // Check if any of my wanted skills are in their "skillHave"
          const isMatch = myWantedSkills.some(skill => theirSkillHave.includes(skill));
          
          if (isMatch) {
            fetchedMatches.push(otherProfile);
          }
        });
        
        setMatches(fetchedMatches);
      } catch (error) {
        console.error("Error fetching matches:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [user, profile]);

  const handleConnect = (matchedProfile: UserProfile) => {
    navigate(`/profile/${matchedProfile.uid}`);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white"></div></div>;
  }

  return (
    <div>
      <div className="mb-12">
        <h2 className="text-4xl font-medium tracking-tight mb-4 flex items-center gap-4">
          <Users className="w-10 h-10 text-emerald-400" />
          Your Matches
        </h2>
        <p className="text-white/50 text-lg max-w-2xl">
          Based on the skills you want to learn, we found these people who can teach you.
        </p>
      </div>

      {!profile?.skillWant ? (
        <div className="text-center py-20 bg-white/[0.03] border border-white/5 rounded-[2.5rem]">
          <h3 className="text-2xl font-medium tracking-tight mb-4">No skills to learn</h3>
          <p className="text-white/40 mb-8">Add skills you want to learn in your profile to see matches.</p>
          <button 
            onClick={() => navigate('/profile')}
            className="px-8 py-4 rounded-full bg-white text-black font-semibold hover:scale-105 transition-transform"
          >
            Update Profile
          </button>
        </div>
      ) : matches.length === 0 ? (
        <div className="text-center py-20 bg-white/[0.03] border border-white/5 rounded-[2.5rem]">
          <h3 className="text-2xl font-medium tracking-tight mb-4">No matches found yet</h3>
          <p className="text-white/40">We couldn't find anyone teaching the skills you want to learn right now. Check back later!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {matches.map((match) => (
              <motion.div
                key={match.uid}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group relative p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-white/10 transition-all duration-500 flex flex-col"
              >
                <div className="flex justify-between items-start gap-4 mb-10">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-3xl font-medium tracking-tight mb-2 break-words">{match.name}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 uppercase tracking-widest font-semibold">
                      Perfect Match
                    </div>
                  </div>
                  <button 
                    onClick={() => handleConnect(match)}
                    className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-white/50 group-hover:bg-white group-hover:text-black transition-colors duration-500 shrink-0 cursor-pointer"
                    title="View Profile"
                  >
                    <ArrowRight className="w-6 h-6 transition-transform duration-500 group-hover:-rotate-45" />
                  </button>
                </div>

                <div className="space-y-8 flex-grow">
                  <div>
                    <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-3">Can Teach You</div>
                    <div className="inline-flex items-center px-5 py-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-medium break-words max-w-full">
                      {match.skillHave}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
