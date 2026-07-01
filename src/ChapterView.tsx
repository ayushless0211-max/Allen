import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from './firebase';
import { doc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { CourseBatch, Subject, Chapter, VideoLecture, NoteItem, PracticeTest } from './types';
import LoadingScreen from './LoadingScreen';
import { SAMPLE_BATCHES } from './Dashboard';
import { 
  PlayCircle, FileText, Verified, ExternalLink, Activity, ArrowLeft, 
  Trash2, Sparkles, BookOpen, Award, CheckCircle, RotateCw 
} from 'lucide-react';

export default function ChapterView() {
  const { batchId, subjectId, chapterId } = useParams();
  const navigate = useNavigate();
  const { profile, user, loading: authLoading } = useAuth();
  
  const [batch, setBatch] = useState<CourseBatch | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [activeVideo, setActiveVideo] = useState<VideoLecture | null>(null);
  const [activeTab, setActiveTab] = useState<'video' | 'notes' | 'practice' | 'revise'>('video');
  const [flippedCardIndex, setFlippedCardIndex] = useState<number | null>(null);
  const [activeTest, setActiveTest] = useState<PracticeTest | null>(null);
  const [testAnswers, setTestAnswers] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<{score: number, total: number, percentage: number} | null>(null);

  useEffect(() => {
    if (!batchId || !subjectId || !chapterId) return;
    const unsub = onSnapshot(doc(db, 'batches', batchId), (docSnap) => {
      if (docSnap.exists()) {
        const b = { id: docSnap.id, ...docSnap.data() } as CourseBatch;
        setBatch(b);
        const sub = b.subjects?.find(s => s.id === subjectId) || null;
        setSubject(sub);
        const chap = sub?.chapters?.find(c => c.id === chapterId) || null;
        setChapter(chap);
        
        // Auto-select first lecture if not set
        if (chap && chap.lectures && chap.lectures.length > 0 && !activeVideo) {
          setActiveVideo(chap.lectures[0]);
        }
      } else {
        const seed = SAMPLE_BATCHES.find(b => b.id === batchId);
        if (seed) {
          setBatch(seed);
          const sub = seed.subjects?.find(s => s.id === subjectId) || null;
          setSubject(sub);
          const chap = sub?.chapters?.find(c => c.id === chapterId) || null;
          setChapter(chap);
          if (chap && chap.lectures && chap.lectures.length > 0 && !activeVideo) {
            setActiveVideo(chap.lectures[0]);
          }
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
        const chap = sub?.chapters?.find(c => c.id === chapterId) || null;
        setChapter(chap);
        if (chap && chap.lectures && chap.lectures.length > 0 && !activeVideo) {
          setActiveVideo(chap.lectures[0]);
        }
      }
      setLoading(false);
    });
    return () => unsub();
  }, [batchId, subjectId, chapterId]);

  if (authLoading || loading) return <LoadingScreen />;
  if (!batch || !subject || !chapter) {
    return (
      <div className="p-8 text-white text-center max-w-lg mx-auto">
        <h2 className="text-xl font-bold mb-4">Chapter not found</h2>
        <button 
          onClick={() => navigate(-1)} 
          className="bg-zinc-800 text-white px-4 py-2 rounded-full flex items-center gap-2 mx-auto"
        >
          <ArrowLeft className="w-4 h-4" /> Go Back
        </button>
      </div>
    );
  }

  const isPurchased = profile?.hasLifetimeAccess || profile?.purchasedCourseIds?.includes(batch.id) ||
    (profile?.adAccess && profile.adAccess[batch.id] && profile.adAccess[batch.id] > Date.now());
  const isAdmin = profile?.role === 'admin';

  if (!isPurchased && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-4 p-6">
        <h2 className="text-2xl font-bold text-white">Enrollment Required</h2>
        <p className="text-zinc-400">You must be enrolled in "{batch.name}" to view this chapter.</p>
        <button
          onClick={() => navigate(`/batch/${batch.id}`)}
          className="bg-white text-black px-6 py-2 rounded-full font-medium"
        >
          Go to Course Details
        </button>
      </div>
    );
  }

  const parseVideoUrl = (rawUrl: string) => {
    const url = (rawUrl || '').trim();
    if (!url) return '';

    // Handle Google Drive
    if (url.includes('drive.google.com/file/d/')) {
      const parts = url.split('file/d/');
      if (parts[1]) {
        const id = parts[1].split('/')[0].split('?')[0];
        return `https://drive.google.com/file/d/${id}/preview`;
      }
    }
    if (url.includes('drive.google.com/open') || url.includes('drive.google.com/uc')) {
      try {
        const urlObj = new URL(url);
        const id = urlObj.searchParams.get('id');
        if (id) {
          return `https://drive.google.com/file/d/${id}/preview`;
        }
      } catch (e) {}
    }
    if (url.includes('docs.google.com/file/d/')) {
      const parts = url.split('file/d/');
      if (parts[1]) {
        const id = parts[1].split('/')[0].split('?')[0];
        return `https://drive.google.com/file/d/${id}/preview`;
      }
    }

    // Handle YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      let videoId = '';
      if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0]?.split('&')[0] || '';
      } else if (url.includes('youtube.com/embed/')) {
        videoId = url.split('youtube.com/embed/')[1]?.split('?')[0]?.split('&')[0] || '';
      } else if (url.includes('youtube.com/shorts/')) {
        videoId = url.split('youtube.com/shorts/')[1]?.split('?')[0]?.split('&')[0] || '';
      } else if (url.includes('v=')) {
        videoId = url.split('v=')[1]?.split('&')[0]?.split('?')[0] || '';
      } else if (url.includes('youtube.com/watch')) {
        try {
          const urlObj = new URL(url);
          videoId = urlObj.searchParams.get('v') || '';
        } catch (e) {}
      }
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?origin=${window.location.origin}`;
      }
    }

    // Direct 11-character YouTube video ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
      return `https://www.youtube.com/embed/${url}`;
    }

    return url;
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!window.confirm('Delete video?')) return;
    try {
      const batchRef = doc(db, 'batches', batch.id);
      const batchDoc = await getDoc(batchRef);
      const currentBatchData = batchDoc.data() as CourseBatch;

      if (!currentBatchData.subjects) throw new Error('Subjects not found');

      const updatedSubjects = currentBatchData.subjects.map(s => {
        if (s.id !== subject.id) return s;
        return {
          ...s,
          chapters: s.chapters?.map(c => {
            if (c.id !== chapter.id) return c;
            return { ...c, lectures: c.lectures?.filter(v => v.id !== videoId) };
          })
        };
      });

      await updateDoc(batchRef, { subjects: updatedSubjects });
      console.log('Video deleted successfully.');
    } catch(err) {
      console.error('Error deleting video:', err);
      alert('Failed to delete video');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!window.confirm('Delete note?')) return;
    try {
      const batchRef = doc(db, 'batches', batch.id);
      const batchDoc = await getDoc(batchRef);
      const currentBatchData = batchDoc.data() as CourseBatch;

      if (!currentBatchData.subjects) throw new Error('Subjects not found');

      const updatedSubjects = currentBatchData.subjects.map(s => {
        if (s.id !== subject.id) return s;
        return {
          ...s,
          chapters: s.chapters?.map(c => {
            if (c.id !== chapter.id) return c;
            return { ...c, notes: c.notes?.filter(n => n.id !== noteId) };
          })
        };
      });
      
      await updateDoc(batchRef, { subjects: updatedSubjects });
      console.log('Note deleted successfully.');
    } catch(err) {
      console.error('Error deleting note:', err);
      alert('Failed to delete note');
    }
  };

  const handleDeleteTest = async (testId: string) => {
    if (!window.confirm('Delete test?')) return;
    try {
      const batchRef = doc(db, 'batches', batch.id);
      const batchDoc = await getDoc(batchRef);
      const currentBatchData = batchDoc.data() as CourseBatch;

      if (!currentBatchData.subjects) throw new Error('Subjects not found');

      const updatedSubjects = currentBatchData.subjects.map(s => {
        if (s.id !== subject.id) return s;
        return {
          ...s,
          chapters: s.chapters?.map(c => {
            if (c.id !== chapter.id) return c;
            return { ...c, tests: c.tests?.filter(t => t.id !== testId) };
          })
        };
      });
      
      await updateDoc(batchRef, { subjects: updatedSubjects });
      console.log('Test deleted successfully.');
    } catch(err) {
      console.error('Error deleting test:', err);
      alert('Failed to delete test');
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 text-white flex flex-col min-w-0">
      {/* Top Header */}
      <div className="border-b border-white/5 pb-3 sm:pb-4 sm:border-b-0 flex flex-col items-start gap-1">
        <span className="text-[10px] sm:text-xs font-bold text-emerald-400 uppercase tracking-widest block">{batch.name}</span>
        <h1 className="text-lg sm:text-2xl font-black tracking-tight text-white mt-0.5">{chapter.name}</h1>
      </div>

      {/* Video Lecture Player */}
      <div className="bg-black/80 border border-white/10 rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl relative w-full">
        {activeVideo ? (
          <div className="w-full">
            <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 bg-black/75 backdrop-blur-md px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full border border-white/10 flex items-center gap-1.5 max-w-[90%]">
              <PlayCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-[10px] sm:text-xs font-semibold text-white truncate max-w-[120px] xs:max-w-[180px] sm:max-w-xs">{activeVideo.title}</span>
            </div>
            <ResponsiveIframe 
              src={parseVideoUrl(activeVideo.videoUrl)} 
              title={activeVideo.title} 
            />
            <div className="p-3.5 sm:p-5 bg-zinc-950/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-t border-white/5">
              <div className="flex-1 min-w-0">
                <h2 className="text-sm sm:text-lg font-bold text-white leading-snug truncate">{activeVideo.title}</h2>
                <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5 sm:mt-1">{activeVideo.duration || '45 mins'} • Streaming in High Definition</p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
                <a
                  href={activeVideo.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white rounded-xl text-[10px] sm:text-xs font-semibold transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Open Video</span>
                </a>
                <span className="px-2.5 py-1 bg-white/10 border border-white/20 text-white rounded-full text-[10px] sm:text-xs font-bold shrink-0">
                  Active Lecture
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="aspect-video flex flex-col items-center justify-center p-6 sm:p-8 text-center text-zinc-400 gap-3 w-full">
            <PlayCircle className="w-12 h-12 sm:w-16 sm:h-16 text-zinc-600 animate-pulse" />
            <h3 className="font-bold text-white text-sm sm:text-lg">No Active Video</h3>
            <p className="text-[11px] sm:text-xs max-w-sm">Select a video from the lecture menu below to start learning.</p>
          </div>
        )}
      </div>

      {/* NAVIGATION TABS MENU (Following screenshot reference: grey text, white active, blue/indigo bottom bar) */}
      <div className="bg-white/[0.02] border border-white/5 rounded-xl sm:rounded-2xl p-1.5 sm:p-2 flex flex-col gap-3 sm:gap-4 w-full max-w-full min-w-0 overflow-hidden">
        <div className="flex border-b border-white/5 pb-0.5 overflow-x-auto scrollbar-none gap-1 sm:gap-2 px-1 sm:px-2 pt-1 w-full" id="chapter_sub_tabs">
          {(['video', 'notes', 'practice', 'revise'] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setFlippedCardIndex(null);
                }}
                className={`px-3 sm:px-4 pb-2.5 sm:pb-3 text-xs sm:text-sm font-semibold capitalize relative transition-all duration-200 cursor-pointer whitespace-nowrap ${
                  isActive ? 'text-white font-bold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-1.5 sm:gap-2">
                  {tab === 'video' && <PlayCircle className="w-4 h-4" />}
                  {tab === 'notes' && <BookOpen className="w-4 h-4" />}
                  {tab === 'practice' && <Award className="w-4 h-4" />}
                  {tab === 'revise' && <Sparkles className="w-4 h-4" />}
                  {tab}
                </span>
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2.5px] sm:h-[3px] bg-white rounded-full animate-fade-in" />
                )}
              </button>
            );
          })}
        </div>

        {/* Dynamic Content Display depending on selected Tab */}
        <div className="p-1 sm:p-4 min-h-[220px] w-full min-w-0">
          {activeTab === 'video' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs sm:text-sm font-bold text-zinc-400 uppercase tracking-wider">Video Lectures ({chapter.lectures?.length || 0})</h3>
              </div>
              {chapter.lectures && chapter.lectures.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {chapter.lectures.map((video, vidx) => {
                    const isPlaying = activeVideo?.id === video.id;
                    return (
                      <div 
                        key={video.id || `v-${vidx}`}
                        onClick={() => {
                          setActiveVideo(video);
                          setActiveTest(null);
                        }}
                        className={`p-3.5 sm:p-4 rounded-xl border flex gap-3 sm:gap-4 cursor-pointer group transition-all duration-200 items-center ${
                          isPlaying 
                            ? 'bg-white/10 border-white/30 shadow-[0_0_15px_rgba(255,255,255,0.05)]' 
                            : 'bg-black/50 border-white/5 hover:border-white/20'
                        }`}
                      >
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                          isPlaying ? 'bg-white/15' : 'bg-white/5'
                        }`}>
                          <PlayCircle className={`w-4.5 h-4.5 sm:w-5 sm:h-5 ${isPlaying ? 'text-emerald-400 animate-pulse' : 'text-white'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-xs sm:text-sm text-zinc-200 group-hover:text-white transition-colors truncate">{video.title}</h4>
                          <p className="text-[10px] sm:text-xs text-zinc-500 mt-0.5 sm:mt-1">{video.duration || '45 mins'}</p>
                        </div>
                        {isAdmin && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteVideo(video.id);
                            }}
                            className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors shrink-0 cursor-pointer"
                            title="Delete Video"
                          >
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 sm:py-12 text-zinc-500 text-xs sm:text-sm">
                  No video lectures available for this chapter yet.
                </div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-4">
              <h3 className="text-xs sm:text-sm font-bold text-zinc-400 uppercase tracking-wider">Study Notes & PDFs ({chapter.notes?.length || 0})</h3>
              {chapter.notes && chapter.notes.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {chapter.notes.map((note, nidx) => (
                    <a 
                      key={note.id || `n-${nidx}`}
                      href={note.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-black/50 hover:bg-white/[0.04] border border-white/5 p-3.5 sm:p-4 rounded-xl flex items-center justify-between group transition-all duration-200 cursor-pointer gap-2"
                    >
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <FileText className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-white shrink-0" />
                        <span className="font-semibold text-xs sm:text-sm text-zinc-200 group-hover:text-white truncate max-w-[150px] sm:max-w-[180px]">{note.title}</span>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        {isAdmin && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeleteNote(note.id);
                            }}
                            className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors cursor-pointer"
                            title="Delete Note"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-500 group-hover:text-white transition-colors" />
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 sm:py-12 text-zinc-500 text-xs sm:text-sm">
                  No study notes or PDF material available for this chapter yet.
                </div>
              )}
            </div>
          )}

          {activeTab === 'practice' && (
            <div className="space-y-6">
              {!activeTest ? (
                <div className="space-y-4">
                  <h3 className="text-xs sm:text-sm font-bold text-zinc-400 uppercase tracking-wider">Practice Assessments ({chapter.tests?.length || 0})</h3>
                  {chapter.tests && chapter.tests.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3">
                      {chapter.tests.map((test, tidx) => (
                        <div 
                          key={test.id || `t-${tidx}`}
                          className="bg-black/50 border border-white/5 p-4 sm:p-5 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full"
                        >
                          <div className="flex-1">
                            <h4 className="font-bold text-white text-sm sm:text-base">{test.title}</h4>
                            <p className="text-[10px] sm:text-xs text-zinc-400 mt-1">{test.questions?.length || 0} Multiple Choice Questions • +4 Marks for Correct, -1 for Incorrect</p>
                          </div>
                          
                          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                            {isAdmin && (
                              <button 
                                onClick={() => handleDeleteTest(test.id)}
                                className="p-2.5 text-zinc-500 bg-white/5 hover:bg-red-500/10 hover:text-red-400 border border-white/5 hover:border-red-500/20 rounded-full transition cursor-pointer"
                                title="Delete Test"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setActiveTest(test);
                                setTestAnswers({});
                                setTestResult(null);
                              }}
                              className="flex-1 sm:flex-none w-full sm:w-auto bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-4 py-2.5 sm:px-5 rounded-full text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                            >
                              <Activity className="w-4 h-4" /> Start Practice Attempt
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 sm:py-12 text-zinc-500 text-xs sm:text-sm">
                      No mock tests or practice exams available for this chapter yet.
                    </div>
                  )}
                </div>
              ) : (
                /* INTERACTIVE TEST ENVIRONMENT */
                <div className="bg-white/[0.01] border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-8 space-y-6 sm:space-y-8 relative">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/5 pb-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm sm:text-lg font-bold text-white tracking-tight break-words">{activeTest.title}</h4>
                      <p className="text-[10px] sm:text-xs text-zinc-400 mt-0.5 sm:mt-1">Practice workspace • Marks will be calculated on submit</p>
                    </div>
                    <button 
                      onClick={() => { setActiveTest(null); setTestResult(null); }}
                      className="text-[11px] sm:text-xs bg-white/5 hover:bg-white/10 border border-white/10 px-3.5 py-2 rounded-full text-zinc-300 transition-colors cursor-pointer font-medium whitespace-nowrap self-end sm:self-auto"
                    >
                      Exit Test
                    </button>
                  </div>

                  <div className="space-y-8 sm:space-y-10">
                    {activeTest.questions.map((q, qIdx) => (
                      <div key={`q-${qIdx}`} className="space-y-3.5 sm:space-y-4 border-b border-white/[0.03] pb-5 last:border-0">
                        <h5 className="text-sm sm:text-base text-zinc-200 leading-relaxed font-semibold flex items-start gap-2">
                          <span className="text-white shrink-0 font-bold">Q{qIdx + 1}.</span> 
                          <span>{q.question}</span>
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pl-2 sm:pl-6">
                          {q.options.map((opt, oIdx) => {
                            const isSelected = testAnswers[qIdx] === opt;
                            const isSubmitted = testResult !== null;
                            const isCorrect = q.options[q.correctOption] === opt || q.correctAnswer === opt;
                            const showGreen = isSubmitted && isCorrect;
                            const showRed = isSubmitted && isSelected && !isCorrect;

                            return (
                              <label 
                                key={oIdx} 
                                className={`
                                  flex items-center gap-2.5 sm:gap-3 p-3.5 sm:p-4 rounded-xl border text-xs sm:text-sm transition-all duration-200
                                  ${isSubmitted ? 'cursor-default' : 'cursor-pointer hover:bg-white/5'}
                                  ${isSelected && !isSubmitted ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/5 bg-black/50'}
                                  ${showGreen ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-semibold' : ''}
                                  ${showRed ? 'border-red-500 bg-red-500/10 text-red-500' : ''}
                                  ${isSubmitted && !showGreen && !showRed ? 'opacity-50' : ''}
                                `}
                              >
                                <input 
                                  type="radio" 
                                  name={`question-${qIdx}`} 
                                  value={opt}
                                  disabled={isSubmitted}
                                  checked={isSelected}
                                  onChange={() => setTestAnswers({...testAnswers, [qIdx]: opt})}
                                  className="hidden" 
                                />
                                <div className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border flex items-center justify-center shrink-0
                                  ${isSelected ? 'border-emerald-500' : 'border-zinc-600'}
                                  ${showGreen ? 'border-emerald-500 bg-emerald-500' : ''}
                                  ${showRed ? 'border-red-500 bg-red-500' : ''}
                                `}>
                                  {(isSelected && !isSubmitted) && <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500" />}
                                  {showGreen && <Verified className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />}
                                </div>
                                <span className="leading-snug">{opt}</span>
                              </label>
                            );
                          })}
                        </div>
                        
                        {testResult && q.explanation && (
                          <div className="pl-2 sm:pl-6 pt-2">
                            <div className="p-3.5 sm:p-4 bg-white/5 border border-white/10 rounded-xl">
                              <span className="block font-bold mb-1.5 text-white uppercase tracking-widest text-[9px] sm:text-[10px]">Solution Explanation:</span>
                              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed text-opacity-90">{q.explanation}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-white/5 flex flex-col items-center justify-center">
                    {testResult ? (
                      <div className="p-5 sm:p-8 text-center bg-white/[0.02] rounded-2xl border border-white/5 w-full max-w-md">
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 block">Practice Result Analyzed</span>
                        <div className="text-3xl sm:text-4xl font-black text-white mb-2">
                          {testResult.score} <span className="text-base sm:text-lg text-zinc-500 font-medium">/ {testResult.total} Marks</span>
                        </div>
                        <p className="text-xs sm:text-sm text-emerald-400 font-bold">Accuracy Score: {testResult.percentage}%</p>
                        <button
                          onClick={() => {
                            setTestAnswers({});
                            setTestResult(null);
                          }}
                          className="mt-4 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs py-2 px-4 rounded-full transition-colors cursor-pointer"
                        >
                          Re-Attempt Test
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          let score = 0;
                          activeTest.questions.forEach((q, idx) => {
                            const ans = testAnswers[idx];
                            const correctOptText = q.options[q.correctOption];
                            if (ans === correctOptText) score += 4;
                            else if (ans) score -= 1;
                          });
                          const totalMarks = activeTest.questions.length * 4;
                          setTestResult({
                            score,
                            total: totalMarks,
                            percentage: Math.round((score / totalMarks) * 100)
                          });
                        }}
                        disabled={Object.keys(testAnswers).length !== activeTest.questions.length}
                        className="w-full sm:w-64 bg-white hover:bg-zinc-200 text-black py-3 sm:py-3.5 rounded-full text-xs sm:text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg text-center"
                      >
                        Submit Practice Paper
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'revise' && (
            <div className="space-y-6">
              {/* Revision Intro Card */}
              <div className="bg-white/[0.03] border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 sm:p-16 bg-white/5 blur-3xl rounded-full" />
                <h4 className="text-sm sm:text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-white animate-pulse" />
                  High-Yield Formula & Concept Board
                </h4>
                <p className="text-[11px] sm:text-xs text-zinc-400 mt-1 max-w-xl">
                  Quick study notes, formulas, and visual micro-flashcards optimized for examination memory retention of <strong>{chapter.name}</strong>.
                </p>
              </div>

              {/* Dynamic Key Points & Flashcards */}
              {(() => {
                const chapterName = chapter.name.toLowerCase();
                let keyPoints = [
                  "Verify boundary conditions carefully before making approximations.",
                  "Draw clear free body / state diagrams to map algebraic signs accurately.",
                  "Focus on logical patterns in solutions rather than memorizing numbers."
                ];
                let formulas: { name: string; formula: string; desc: string }[] = [];
                let flashcards: { q: string; a: string }[] = [];

                if (chapterName.includes('electrostatics') || chapterName.includes('coulomb') || chapterName.includes('charge')) {
                  keyPoints = [
                    "Coulomb's Law states force behaves as 1/r² between point charges.",
                    "Electric field inside any hollow charged conductor is ALWAYS zero under static equilibrium.",
                    "Gauss's Law is extremely powerful for spheres, cylinders, and infinite sheets of charge.",
                    "Electric potential V represents work done per unit positive test charge. It is a scalar field."
                  ];
                  formulas = [
                    { name: "Coulomb Force", formula: "F = k * (|q₁q₂| / r²)", desc: "k = 1 / 4πε₀ ≈ 9 × 10⁹ N·m²/C²" },
                    { name: "Electric Field Intensity", formula: "E = F / q = k * Q / r²", desc: "Force experienced per unit charge." },
                    { name: "Electric Potential", formula: "V = k * Q / r", desc: "Potential at distance r from a point charge." },
                    { name: "Gauss's Theorem", formula: "∮ E · dA = Q_enclosed / ε₀", desc: "Net flux through any closed Gaussian surface." }
                  ];
                  flashcards = [
                    { q: "What is the electric potential inside a charged conducting hollow sphere?", a: "It is uniform and equal to the potential at the surface of the sphere (V = kQ/R)." },
                    { q: "Why do electric field lines never cross?", a: "If they intersected, there would be two directions of electric field at that point, which is physically impossible." },
                    { q: "How does the electric field of an electric dipole scale with distance at far points?", a: "E scales as 1/r³ on both axial and equatorial axes, rather than 1/r² like a single point charge." }
                  ];
                } else if (chapterName.includes('kinematics') || chapterName.includes('projectile') || chapterName.includes('motion')) {
                  keyPoints = [
                    "Horizontal speed is constant in projectile motion if air resistance is neglected.",
                    "Vertical velocity is zero at the absolute apex of flight.",
                    "Equations of motion apply ONLY if acceleration remains constant."
                  ];
                  formulas = [
                    { name: "Constant Accel. Equations", formula: "v = u + at  |  s = ut + ½at²  |  v² = u² + 2as", desc: "Fundamental rectilinear motion equations." },
                    { name: "Projectile Flight Time", formula: "T = 2u sin(θ) / g", desc: "Total time spent flying in the air." },
                    { name: "Projectile Max Height", formula: "H = u² sin²(θ) / 2g", desc: "Maximum altitude reached above launch level." },
                    { name: "Projectile Range", formula: "R = u² sin(20) / g", desc: "Max range occurs at θ = 45 degrees." }
                  ];
                  flashcards = [
                    { q: "What is the angle of projection to achieve equal height and range?", a: "θ = tan⁻¹(4) ≈ 76 degrees." },
                    { q: "Does a heavy ball fall faster than a feather in a vacuum?", a: "No. In vacuum, all bodies accelerate downward at the exact same rate 'g' regardless of mass." },
                    { q: "State the velocity vector of a projectile at its highest point.", a: "v = u * cos(θ) î (horizontal speed only; vertical speed is zero)." }
                  ];
                } else if (chapterName.includes('organic') || chapterName.includes('goc') || chapterName.includes('inductive') || chapterName.includes('isomerism')) {
                  keyPoints = [
                    "Inductive effect acts through sigma bonds and diminishes rapidly across 3 carbons.",
                    "Acidic strength increases with the presence of electron-withdrawing groups (-I, -M).",
                    "Carbocation stability is determined by hyperconjugation and positive inductive (+I) groups."
                  ];
                  formulas = [
                    { name: "Carbocation Order", formula: "3° > 2° > 1° > Methyl", desc: "Due to hyperconjugation and alkyl +I shifts." },
                    { name: "Carbanion Order", formula: "Methyl > 1° > 2° > 3°", desc: "Alkyl groups destabilize carbanions via electron dispersion (+I)." },
                    { name: "Acid Strength Formula", formula: "K_a = [H⁺][A⁻] / [HA]", desc: "Higher K_a / lower pK_a means a stronger acid." }
                  ];
                  flashcards = [
                    { q: "What is hyperconjugation also known as?", a: "No-bond resonance or Baker-Nathan effect." },
                    { q: "Which group has a stronger acidic effect: Phenol or Ethanol?", a: "Phenol is much more acidic because its conjugate phenoxide ion is stabilized by resonance across the benzene ring." },
                    { q: "Is the inductive effect permanent or temporary?", a: "It is a permanent electronic displacement operating through sigma bonds." }
                  ];
                } else if (chapterName.includes('limit') || chapterName.includes('calculus') || chapterName.includes('derivative')) {
                  keyPoints = [
                    "L'Hopital's Rule can only be applied directly on 0/0 or ∞/∞ indeterminate forms.",
                    "Squeeze Theorem is used when functions are bounded between two other converging functions.",
                    "A function is continuous at a point if its left limit, right limit, and function value are equal."
                  ];
                  formulas = [
                    { name: "Standard Trigonometric Limit", formula: "lim (x→0) [sin(x) / x] = 1", desc: "Angles must be strictly in radians." },
                    { name: "Standard Exponential Limit", formula: "lim (x→0) [(e^x - 1) / x] = 1", desc: "Core calculus exponential definition limit." },
                    { name: "Euler's Limit", formula: "lim (x→0) (1 + x)^(1/x) = e", desc: "e ≈ 2.718" }
                  ];
                  flashcards = [
                    { q: "What is L'Hopital's Rule equation?", a: "lim [f(x)/g(x)] = lim [f'(x)/g'(x)] when direct substitution yields 0/0 or ∞/∞." },
                    { q: "State the Squeeze Theorem briefly.", a: "If f(x) ≤ g(x) ≤ h(x) and lim f(x) = lim h(x) = L, then lim g(x) = L." },
                    { q: "What is lim (x→∞) [sin(x) / x]?", a: "0, because sin(x) is bounded between -1 and 1, while denominator goes to infinity." }
                  ];
                } else {
                  // General fallback based on subject name
                  const subName = subject.name.toLowerCase();
                  if (subName.includes('phys')) {
                    keyPoints = [
                      "Verify system forces, energy conservation, and system variables first.",
                      "Verify dimensions to prevent algebra errors.",
                      "Ensure sign conventions match coordinate axes consistently."
                    ];
                    formulas = [
                      { name: "Conservation of Energy", formula: "K_i + U_i = K_f + U_f", desc: "Total mechanical energy remains conserved in a conservative field." },
                      { name: "Newton's 2nd Law", formula: "F_net = m * a", desc: "Net force is direct cause of linear acceleration." }
                    ];
                    flashcards = [
                      { q: "What defines a conservative force?", a: "Work done by a conservative force is independent of path and depends only on initial and final states." },
                      { q: "What does the area under a Force-Time graph represent?", a: "Impulse, which equals change in momentum (Δp)." }
                    ];
                  } else if (subName.includes('chem')) {
                    keyPoints = [
                      "Draw molecular orbital diagrams and calculate hybridization states.",
                      "Check thermodynamic variables (H, S, G) to see reaction spontaneity.",
                      "Recognize catalytic conditions and rate laws during calculations."
                    ];
                    formulas = [
                      { name: "Gibbs Free Energy Equation", formula: "ΔG = ΔH - T * ΔS", desc: "ΔG < 0 for spontaneous processes." },
                      { name: "Ideal Gas Law", formula: "P * V = n * R * T", desc: "R ≈ 0.0821 L·atm/(mol·K) or 8.314 J/(mol·K)." }
                    ];
                    flashcards = [
                      { q: "State Le Chatelier's Principle in simple words.", a: "If a system at equilibrium is disturbed, it adjusts to minimize that disturbance and restore equilibrium." },
                      { q: "What is activation energy?", a: "The minimum kinetic energy reacting molecules must possess to undergo a successful chemical reaction." }
                    ];
                  } else {
                    keyPoints = [
                      "Review standard formulas and identities carefully.",
                      "Test boundary values (0, 1, infinity) for quick sanity checks.",
                      "Make sure formulas are written down and cross-checked step-by-step."
                    ];
                    formulas = [
                      { name: "Quadratic Roots", formula: "x = [-b ± √(b² - 4ac)] / 2a", desc: "Discriminant D = b² - 4ac." },
                      { name: "Euler's Formula", formula: "e^(iθ) = cos(θ) + i sin(θ)", desc: "Beautiful connection between trig and complex powers." }
                    ];
                    flashcards = [
                      { q: "What is a function called if f(-x) = -f(x)?", a: "An odd function. Its graph is symmetric with respect to the origin." },
                      { q: "State the fundamental theorem of algebra.", a: "Every non-zero single-variable polynomial of degree n has exactly n complex roots, counted with multiplicity." }
                    ];
                  }
                }

                return (
                  <div className="space-y-6">
                    {/* Important Key points */}
                    <div className="space-y-3">
                      <h4 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-white">High-Yield Key Insights</h4>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
                        {keyPoints.map((point, pIdx) => (
                          <li key={pIdx} className="bg-black/40 border border-white/5 p-3.5 sm:p-4 rounded-xl flex items-start gap-2.5 sm:gap-3">
                            <span className="w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                              <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" />
                            </span>
                            <span className="text-xs sm:text-sm text-zinc-300 leading-relaxed">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Important Formulae Grid */}
                    {formulas.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-white">Cheat Sheet Formulas</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                          {formulas.map((f, fIdx) => (
                            <div key={fIdx} className="bg-black/50 border border-white/5 p-3.5 sm:p-4 rounded-xl space-y-2">
                              <span className="text-[10px] sm:text-xs font-semibold text-zinc-400 block">{f.name}</span>
                              <div className="p-3 bg-zinc-950 rounded-lg text-center font-mono text-sm sm:text-base text-white font-bold border border-white/[0.03] overflow-x-auto whitespace-nowrap scrollbar-none">
                                {f.formula}
                              </div>
                              <p className="text-[10px] sm:text-xs text-zinc-500 leading-snug">{f.desc}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Interactive Flashcards */}
                    {flashcards.length > 0 && (
                      <div className="space-y-3 sm:space-y-4">
                        <h4 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-white">Interactive Flashcards</h4>
                        <p className="text-[10px] sm:text-xs text-zinc-500">Click on any card to flip and reveal the correct answer.</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
                          {flashcards.map((card, cidx) => {
                            const isFlipped = flippedCardIndex === cidx;
                            return (
                              <div 
                                key={cidx}
                                onClick={() => setFlippedCardIndex(isFlipped ? null : cidx)}
                                className={`min-h-[140px] sm:min-h-[160px] p-4 sm:p-5 rounded-xl border cursor-pointer select-none transition-all duration-300 flex flex-col justify-between relative group ${
                                  isFlipped 
                                    ? 'bg-zinc-900 border-white/20 shadow-[0_4px_20px_rgba(255,255,255,0.02)]' 
                                    : 'bg-black/50 border-white/5 hover:border-white/10'
                                }`}
                              >
                                {isFlipped ? (
                                  <div className="space-y-1.5 sm:space-y-2 text-center my-auto">
                                    <span className="text-[9px] sm:text-[10px] font-bold text-white uppercase tracking-widest block mb-1">Answer</span>
                                    <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed font-medium">{card.a}</p>
                                  </div>
                                ) : (
                                  <div className="space-y-1.5 sm:space-y-2 text-center my-auto">
                                    <span className="text-[9px] sm:text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Flashcard #{cidx+1}</span>
                                    <p className="text-xs sm:text-sm font-bold text-white leading-snug">{card.q}</p>
                                  </div>
                                )}
                                
                                <div className="mt-3 pt-2 border-t border-white/[0.03] flex items-center justify-between text-[9px] sm:text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
                                  <span>{isFlipped ? 'Reveal Question' : 'Tap to Reveal'}</span>
                                  <RotateCw className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ResponsiveIframeProps {
  src: string;
  title: string;
}

function ResponsiveIframe({ src, title }: ResponsiveIframeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number>(0);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width > 0) {
      setWidth(rect.width);
    }

    const updateSize = (entries: ResizeObserverEntry[]) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 0) {
          setWidth(w);
        }
      }
    };

    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  const isGoogleDrive = src.includes('drive.google.com') || src.includes('docs.google.com');
  
  // Google Drive mobile preview switch starts cropping/zooming at viewport widths under 800px.
  // We bypass this by rendering the Google Drive preview inside a virtual desktop window (1024x576)
  // and dynamically scaling it down to fit the physical viewport width using a CSS scale transform.
  // CRITICAL: We keep a single static DOM structure for the iframe to prevent any unmounting/remounting
  // which causes Google Drive to reload and trigger "An unexpected error occurred" rate-limit screens.
  const baseDesktopWidth = 1024;
  const baseDesktopHeight = 576;
  const shouldScale = isGoogleDrive && width > 0 && width < 800;
  
  const scaleFactor = shouldScale ? (width / baseDesktopWidth) : 1;
  const responsiveHeight = shouldScale ? (width * 9) / 16 : undefined;

  return (
    <div 
      ref={containerRef} 
      className="relative w-full aspect-video bg-black rounded-t-xl sm:rounded-t-2xl overflow-hidden"
      style={shouldScale ? { height: `${responsiveHeight}px`, aspectRatio: 'auto' } : undefined}
    >
      <div 
        style={shouldScale ? {
          width: `${baseDesktopWidth}px`,
          height: `${baseDesktopHeight}px`,
          transform: `scale(${scaleFactor})`,
          transformOrigin: 'top left',
          position: 'absolute',
          top: 0,
          left: 0,
        } : {
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      >
        <iframe 
          className="w-full h-full border-0"
          src={src} 
          title={title}
          width="100%"
          height="100%"
          allowFullScreen
          scrolling="no"
          referrerPolicy="strict-origin-when-cross-origin"
          style={{ width: '100%', height: '100%' }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      </div>
    </div>
  );
}
