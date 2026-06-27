import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from './firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { CourseBatch, Subject, Chapter } from './types';
import LoadingScreen from './LoadingScreen';
import { SAMPLE_BATCHES } from './Dashboard';
import { ChevronRight, ArrowLeft, Trash2, BookOpen } from 'lucide-react';

export default function SubjectView() {
  const { batchId, subjectId } = useParams();
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useAuth();
  
  const [batch, setBatch] = useState<CourseBatch | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!batchId || !subjectId) return;
    const unsub = onSnapshot(doc(db, 'batches', batchId), (docSnap) => {
      if (docSnap.exists()) {
        const b = { id: docSnap.id, ...docSnap.data() } as CourseBatch;
        setBatch(b);
        const sub = b.subjects?.find(s => s.id === subjectId) || null;
        setSubject(sub);
      } else {
        const seed = SAMPLE_BATCHES.find(b => b.id === batchId);
        if (seed) {
          setBatch(seed);
          const sub = seed.subjects?.find(s => s.id === subjectId) || null;
          setSubject(sub);
        } else {
          setBatch(null);
          setSubject(null);
        }
      }
      setLoading(false);
    }, (err) => {
      console.warn("Could not query Firestore, using offline fallback:", err);
      const seed = SAMPLE_BATCHES.find(b => b.id === batchId);
      if (seed) {
        setBatch(seed);
        const sub = seed.subjects?.find(s => s.id === subjectId) || null;
        setSubject(sub);
      } else {
        setBatch(null);
        setSubject(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [batchId, subjectId]);

  if (authLoading || loading) return <LoadingScreen />;
  if (!batch || !subject) return <div className="p-8 text-white text-center">Subject not found.</div>;

  const isPurchased = profile?.purchasedCourseIds?.includes(batch.id) || 
    (profile?.adAccess && profile.adAccess[batch.id] && profile.adAccess[batch.id] > now);
  const isAdmin = profile?.role === 'admin';

  const adAccessExpiry = profile?.adAccess?.[batch.id] || 0;
  const hasActiveAdAccess = adAccessExpiry > now && !profile?.purchasedCourseIds?.includes(batch.id);
  const remainingMs = adAccessExpiry - now;

  const formatTime = (ms: number) => {
    if (ms <= 0) return "Expired";
    const totalSecs = Math.floor(ms / 1000);
    const secs = totalSecs % 60;
    const mins = Math.floor(totalSecs / 60) % 60;
    const hours = Math.floor(totalSecs / 3600);
    const pad = (num: number) => String(num).padStart(2, '0');
    return `${hours > 0 ? pad(hours) + ':' : ''}${pad(mins)}:${pad(secs)}`;
  };

  if (!isPurchased && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-4">
        <h2 className="text-2xl font-bold text-white">Enrollment Required</h2>
        <p className="text-zinc-400">You must be enrolled in "{batch.name}" to access {subject.name}.</p>
        <button
          onClick={() => navigate(`/batch/${batch.id}`)}
          className="bg-white text-black px-6 py-2 rounded-full font-medium"
        >
          Go to Course Details
        </button>
      </div>
    );
  }

  const handleDeleteSubject = async () => {
    if (!batch || !subject) return;
    if (!window.confirm(`Delete entire subject "${subject.name}"?`)) return;
    const updatedSubjects = batch.subjects?.filter(s => s.id !== subject.id) || [];
    try {
      await updateDoc(doc(db, 'batches', batch.id), { subjects: updatedSubjects });
      navigate(`/batch/${batch.id}`);
    } catch(err) {
      console.error(err);
      alert('Failed to delete subject');
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto w-full text-white">
      {/* Back to batch */}
      <button 
        onClick={() => navigate(`/batch/${batch.id}`)}
        className="flex items-center gap-2 text-zinc-400 hover:text-white self-start transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="text-sm font-medium">Back to Bookshelf</span>
      </button>

      {/* Header banner */}
      <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-32 bg-white/5 blur-[100px] pointer-events-none rounded-full" />
        <div>
          <span className="text-sm font-medium text-emerald-400 block mb-2">{batch.name}</span>
          <div className="flex items-center gap-4">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">{subject.name}</h1>
            {isAdmin && (
              <button 
                onClick={handleDeleteSubject}
                className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded-full transition cursor-pointer"
                title="Delete Subject"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        <div className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-full text-sm font-semibold border border-emerald-500/20">
          Enrolled
        </div>
      </div>

      {/* Ad Access Countdown Banner */}
      {hasActiveAdAccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <p className="text-sm font-medium text-left">
              You have <span className="font-semibold text-white">Temporary Ad Access</span> active for this batch.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-emerald-500/20 px-4 py-1.5 rounded-full border border-emerald-500/30">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">Time Left:</span>
            <span className="font-mono font-bold text-white text-sm">{formatTime(remainingMs)}</span>
          </div>
        </div>
      )}

      {/* Chapter List */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-white" />
          Select Chapter
        </h2>
        <div className="grid grid-cols-1 gap-3">
          {subject.chapters?.map((chap, idx) => (
            <div 
              key={chap.id || `chap-${chap.name}-${idx}`} 
              onClick={() => navigate(`/batch/${batch.id}/subject/${subject.id}/chapter/${chap.id}`)}
              className="border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/20 rounded-2xl p-6 flex justify-between items-center cursor-pointer transition-all duration-300 group shadow-md"
            >
              <div>
                <h3 className="text-lg font-semibold text-white group-hover:text-white transition-colors leading-snug">
                  {chap.name}
                </h3>
                <p className="text-xs text-zinc-400 mt-1.5">
                  {chap.lectures?.length || 0} Lectures • {chap.notes?.length || 0} Notes • {chap.tests?.length || 0} Practice Exams
                </p>
              </div>
              <div className="bg-white/5 group-hover:bg-white/10 p-2.5 rounded-full transition-colors shrink-0">
                <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:text-white transition-colors" />
              </div>
            </div>
          ))}
          {(!subject.chapters || subject.chapters.length === 0) && (
            <div className="text-center py-12 text-zinc-500 bg-white/[0.02] rounded-2xl border border-white/5">
              No chapters content available yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
