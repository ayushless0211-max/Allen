import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, doc, setDoc, onSnapshot, getDocs, getDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { CourseBatch, Subject, Chapter, VideoLecture, NoteItem, PracticeTest, RevisionResource } from './types';
import { SAMPLE_BATCHES } from './Dashboard';
import { 
  Sparkles, Plus, BookOpen, Layers, Video, Save, 
  Trash, Trash2, FileText, CheckCircle, AlertTriangle, Cpu, ListCollapse
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminView() {
  const [batches, setBatches] = useState<CourseBatch[]>([]);
  const [loading, setLoading] = useState(true);

  // Selector states
  const [selectedBatch, setSelectedBatch] = useState<CourseBatch | null>(null);
  const [selectedSub, setSelectedSub] = useState<Subject | null>(null);
  const [selectedChapId, setSelectedChapId] = useState<string>('');
  const [showCreateBatch, setShowCreateBatch] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [addType, setAddType] = useState<'quiz' | 'video' | 'notes' | 'revis'>('notes'); // Default to notes since it's the first in list

  // Course Batch Creator states
  const [newBatchName, setNewBatchName] = useState('');
  const [newBatchDesc, setNewBatchDesc] = useState('');
  const [newBatchPrice, setNewBatchPrice] = useState(10);
  const [newBatchImage, setNewBatchImage] = useState('');
  const [newBatchSubjects, setNewBatchSubjects] = useState<string>('Physics, Chemistry, Mathematics');

  // Subject & Chapter Creator state
  const [newSubName, setNewSubName] = useState('');
  const [newChapName, setNewChapName] = useState('');

  // Video Lecture Creator state
  const [videoTitle, setVideoTitle] = useState('');
  const [videoUrlInput, setVideoUrlInput] = useState(''); // Google Drive Video URL
  const [videoDuration, setVideoDuration] = useState('45 mins');
  const [isFetchingYoutubeInfo, setIsFetchingYoutubeInfo] = useState(false);
  const [isAddingVideos, setIsAddingVideos] = useState(false);

  const handleFetchYoutubeInfo = async () => {
    if (!videoUrlInput || (!videoUrlInput.includes("youtube.com") && !videoUrlInput.includes("youtu.be"))) {
      triggerFeedback('error', 'Please enter a valid YouTube URL first');
      return;
    }
    setIsFetchingYoutubeInfo(true);
    try {
      const response = await fetch('/api/youtube-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: videoUrlInput }),
      });
      if (!response.ok) {
        throw new Error('Failed to fetch YouTube info');
      }
      const data = await response.json();
      if (data.title && data.title !== 'Unknown Title') setVideoTitle(data.title);
      if (data.duration && data.duration !== 'Unknown') setVideoDuration(data.duration);
      triggerFeedback('success', 'YouTube info extracted successfully!');
    } catch (err: any) {
      triggerFeedback('error', err.message || 'Failed to extract info');
    } finally {
      setIsFetchingYoutubeInfo(false);
    }
  };

  // Notes Creator state
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [notePdfUrl, setNotePdfUrl] = useState('');

  // AI Quiz Creator states
  const [aiTopic, setAiTopic] = useState('');
  const [aiLevel, setAiLevel] = useState('JEE Advanced');
  const [aiQuestionCount, setAiQuestionCount] = useState(4);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [generatedQuiz, setGeneratedQuiz] = useState<any | null>(null);

  // Manual Practice PDF states
  const [practicePdfTitle, setPracticePdfTitle] = useState('');
  const [practicePdfUrl, setPracticePdfUrl] = useState('');

  // Revision Creator states
  const [revTitle, setRevTitle] = useState('');
  const [revSummary, setRevSummary] = useState('');
  const [revFormulas, setRevFormulas] = useState('');

  // Feedback states
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Lifetime Access states
  const [lifetimeEmail, setLifetimeEmail] = useState('');
  const [targetUser, setTargetUser] = useState<any>(null);
  const [searchUserLoading, setSearchUserLoading] = useState(false);

  // Load of Batches dynamically from firestore on snapshot
  useEffect(() => {
    const batchesCol = collection(db, 'batches');
    const unsubscribe = onSnapshot(batchesCol, (snapshot) => {
      const list: CourseBatch[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as CourseBatch);
      });
      setBatches(list);
      setLoading(false);
    }, (error) => {
      console.warn("Firestore permissions query failed, running with local caches:", error);
      setBatches(SAMPLE_BATCHES);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter and set selected references when batches reload
  useEffect(() => {
    if (selectedBatch) {
      const updated = batches.find(b => b.id === selectedBatch.id);
      if (updated) {
        setSelectedBatch(updated);
        // Sync selected subject
        if (selectedSub) {
          const updatedSub = (updated.subjects || []).find(s => s.id === selectedSub.id);
          setSelectedSub(updatedSub || null);
        }
      }
    }
  }, [batches]);

  const triggerFeedback = (type: 'success' | 'error', msg: string) => {
    if (type === 'success') {
      setSuccessMsg(msg);
      setErrorMsg('');
    } else {
      setErrorMsg(msg);
      setSuccessMsg('');
    }
    setTimeout(() => {
      setSuccessMsg('');
      setErrorMsg('');
    }, 4500);
  };

  // ----------------------------------------------------
  // ACTION: ADD NEW COURSE BATCH TO FIRESTORE
  // ----------------------------------------------------
  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatchName || !newBatchPrice) {
      triggerFeedback('error', 'Batch Name and Price are critical fields');
      return;
    }

    const batchId = `batch_${Date.now()}`;
    const mappedSubjects: Subject[] = newBatchSubjects
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(subName => ({
        id: subName.toLowerCase().replace(/[^a-z0-9]/g, ''),
        name: subName,
        chapters: []
    }));

    const newBatch: CourseBatch = {
      id: batchId,
      name: newBatchName,
      description: newBatchDesc || 'Comprehensive online preparation syllabus customized for the modern JEE exam pattern.',
      price: Number(newBatchPrice),
      image: newBatchImage || 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=600',
      subjects: mappedSubjects,
      highlights: ["100+ Syllabus Lectures Included", "Detailed Chapters Study Material Notes", "JEE Main & Advanced High-Yield Practice Quizzes", "Dynamic AI Assessment Engine Setup"],
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'batches', batchId), newBatch);
      setNewBatchName('');
      setNewBatchDesc('');
      setNewBatchImage('');
      triggerFeedback('success', `Course "${newBatch.name}" created successfully inside cloud storage!`);
    } catch (err: any) {
      console.error(err);
      triggerFeedback('error', `Failed to persist: ${err.message}`);
    }
  };

  // ----------------------------------------------------
  // ACTION: DELETE COURSE BATCH FROM FIRESTORE
  // ----------------------------------------------------
  const handleDeleteCourse = async (batchId: string) => {
    if (deletingId !== batchId) {
      setDeletingId(batchId);
      triggerFeedback('success', 'Click delete again within 4 seconds to confirm permanent deletion of this course!');
      setTimeout(() => {
        setDeletingId(null);
      }, 4000);
      return;
    }

    try {
      await deleteDoc(doc(db, 'batches', batchId));
      setSelectedBatch(null);
      setSelectedSub(null);
      setSelectedChapId('');
      setDeletingId(null);
      triggerFeedback('success', 'Course and all registered modules deleted successfully!');
    } catch (err: any) {
      console.error(err);
      triggerFeedback('error', `Failed to delete course: ${err.message}`);
    }
  };

  // ----------------------------------------------------
  // ACTION: ADD NEW SUBJECT TO BATCH
  // ----------------------------------------------------
  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch || !newSubName) {
      triggerFeedback('error', 'Select a course and enter a Subject title first');
      return;
    }

    const newSubId = newSubName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const currentSubjects = selectedBatch.subjects || [];
    
    // check if it exists
    if (currentSubjects.find(s => s.id === newSubId)) {
      triggerFeedback('error', 'A subject with a similar name already exists in this course');
      return;
    }

    const newSub: Subject = {
      id: newSubId,
      name: newSubName,
      chapters: []
    };

    const updatedSubjects = [...currentSubjects, newSub];

    try {
      await updateDoc(doc(db, 'batches', selectedBatch.id), {
        subjects: updatedSubjects
      });
      setNewSubName('');
      triggerFeedback('success', `Subject "${newSubName}" added to the course successfully!`);
    } catch (err: any) {
      triggerFeedback('error', err.message);
    }
  };

  // ----------------------------------------------------
  // ACTION: ADD NEW CHAPTER TO SUBJECT
  // ----------------------------------------------------
  const handleAddChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch || !selectedSub || !newChapName) {
      triggerFeedback('error', 'Select a course, subject and enter a Chapter title first');
      return;
    }

    const newChapId = `chap_${Date.now()}`;
    const newChap: Chapter = {
      id: newChapId,
      name: newChapName,
      lectures: [],
      notes: [],
      tests: [],
      revision: []
    };

    // Construct updated subjects tree
    const updatedSubjects = (selectedBatch.subjects || []).map(sub => {
      if (sub.id === selectedSub.id) {
        return {
          ...sub,
          chapters: [...(sub.chapters || []), newChap]
        };
      }
      return sub;
    });

    try {
      await updateDoc(doc(db, 'batches', selectedBatch.id), {
        subjects: updatedSubjects
      });
      setNewChapName('');
      setSelectedChapId(newChapId);
      triggerFeedback('success', `Chapter "${newChapName}" registered successfully!`);
    } catch (err: any) {
      triggerFeedback('error', err.message);
    }
  };

  // ----------------------------------------------------
  // ACTION: ADD VIDEO LECTURE TO CHAPTER
  // ----------------------------------------------------
  const handleAddLecture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch || !selectedSub || !selectedChapId || !videoUrlInput) {
      triggerFeedback('error', 'Video URL is required');
      return;
    }

    const urls = videoUrlInput.split(/[\n,]+/).map(u => u.trim()).filter(Boolean);
    
    if (urls.length === 0) {
      triggerFeedback('error', 'Please enter at least one valid URL');
      return;
    }

    if (urls.length === 1 && !videoTitle) {
      triggerFeedback('error', 'Please provide a title for the video');
      return;
    }

    setIsAddingVideos(true);
    
    try {
      const newLectures: VideoLecture[] = [];
      for (const [index, url] of urls.entries()) {
        let title = videoTitle;
        let duration = videoDuration;

        if (urls.length > 1 || !title) {
          if (url.includes("youtube.com") || url.includes("youtu.be")) {
             try {
               const response = await fetch('/api/youtube-info', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ url: url }),
               });
               const data = await response.json();
               if (data.title && data.title !== 'Unknown Title') title = data.title;
               else title = `Lecture ${Date.now() + index}`;
               if (data.duration && data.duration !== 'Unknown') duration = data.duration;
               else duration = '45 mins';
             } catch {
               title = `Lecture ${Date.now() + index}`;
               duration = '45 mins';
             }
          } else {
             title = `Lecture ${Date.now() + index}`;
             duration = '45 mins';
          }
        }

        newLectures.push({
          id: `lec_${Date.now()}_${index}`,
          title: title,
          videoUrl: url,
          duration: duration
        });
      }

      const updatedSubjects = (selectedBatch.subjects || []).map(sub => {
        if (sub.id === selectedSub.id) {
          return {
            ...sub,
            chapters: (sub.chapters || []).map(ch => {
              if (ch.id === selectedChapId) {
                return {
                  ...ch,
                  lectures: [...(ch.lectures || []), ...newLectures]
                };
              }
              return ch;
            })
          };
        }
        return sub;
      });

      await updateDoc(doc(db, 'batches', selectedBatch.id), {
        subjects: updatedSubjects
      });
      setVideoTitle('');
      setVideoUrlInput('');
      triggerFeedback('success', `Added ${newLectures.length} lecture(s) to classroom!`);
    } catch (err: any) {
      triggerFeedback('error', err.message);
    } finally {
      setIsAddingVideos(false);
    }
  };

  // ----------------------------------------------------
  // ACTION: ADD STUDY NOTES TO CHAPTER
  // ----------------------------------------------------
  const handleAddNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch || !selectedSub || !selectedChapId || !noteTitle) {
      triggerFeedback('error', 'Note title is required');
      return;
    }
    if (!noteContent && !notePdfUrl) {
      triggerFeedback('error', 'Please provide either notes content or a PDF URL');
      return;
    }

    const newNote: NoteItem = {
      id: `note_${Date.now()}`,
      title: noteTitle,
      content: noteContent || undefined,
      pdfUrl: notePdfUrl || undefined
    };

    const updatedSubjects = (selectedBatch.subjects || []).map(sub => {
      if (sub.id === selectedSub.id) {
        return {
          ...sub,
          chapters: (sub.chapters || []).map(ch => {
            if (ch.id === selectedChapId) {
              return {
                ...ch,
                notes: [...(ch.notes || []), newNote]
              };
            }
            return ch;
          })
        };
      }
      return sub;
    });

    try {
      await updateDoc(doc(db, 'batches', selectedBatch.id), {
        subjects: updatedSubjects
      });
      setNoteTitle('');
      setNoteContent('');
      setNotePdfUrl('');
      triggerFeedback('success', `Study Notes "${newNote.title}" appended successfully!`);
    } catch (err: any) {
      triggerFeedback('error', err.message);
    }
  };

  // ----------------------------------------------------
  // ACTION: ADD HIGH-YIELD REVISION SHEET TO CHAPTER
  // ----------------------------------------------------
  const handleAddRevisionCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch || !selectedSub || !selectedChapId || !revTitle || !revSummary) {
      triggerFeedback('error', 'Title and summary are mandatory revision fields');
      return;
    }

    const formulasArray = revFormulas ? revFormulas.split('\n').filter(line => line.trim() !== '') : [];

    const newRevCard: RevisionResource = {
      id: `rev_${Date.now()}`,
      title: revTitle,
      summary: revSummary,
      formulas: formulasArray
    };

    const updatedSubjects = (selectedBatch.subjects || []).map(sub => {
      if (sub.id === selectedSub.id) {
        return {
          ...sub,
          chapters: (sub.chapters || []).map(ch => {
            if (ch.id === selectedChapId) {
              return {
                ...ch,
                revision: [...(ch.revision || []), newRevCard]
              };
            }
            return ch;
          })
        };
      }
      return sub;
    });

    try {
      await updateDoc(doc(db, 'batches', selectedBatch.id), {
        subjects: updatedSubjects
      });
      setRevTitle('');
      setRevSummary('');
      setRevFormulas('');
      triggerFeedback('success', `Revision formulation card "${newRevCard.title}" added!`);
    } catch (err: any) {
      triggerFeedback('error', err.message);
    }
  };

  // ----------------------------------------------------
  // ACTION: AI GEMINI TEST GENERATION CALL
  // ----------------------------------------------------
  const handleAIGenerateQuiz = async () => {
    if (!selectedBatch || !selectedSub || !selectedChapId || !aiTopic) {
      triggerFeedback('error', 'Select a target Chapter and enter an AI quiz Topic first');
      return;
    }

    setAiGenerating(true);
    setGeneratedQuiz(null);
    try {
      const response = await fetch("/api/gemini/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: aiTopic,
          difficulty: aiLevel, // 'JEE Main' or 'JEE Advanced'
          subject: selectedSub.name,
          questionCount: aiQuestionCount
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.details || errData.error || "Generation query failed");
      }

      const quizData = await response.json();
      setGeneratedQuiz(quizData);
      triggerFeedback('success', `AI successfully compiled JEE level quiz: "${quizData.testTitle}"! Review below.`);
    } catch (err: any) {
      console.error(err);
      triggerFeedback('error', `AI Compile Error: ${err.message || err}`);
    } finally {
      setAiGenerating(false);
    }
  };

  // ----------------------------------------------------
  // BIND AI GENERATED QUIZ TO CURRENT EXP_CHAPTER
  // ----------------------------------------------------
  const handleBindAIQuiz = async () => {
    if (!selectedBatch || !selectedSub || !selectedChapId || !generatedQuiz) return;

    const newPracticeTest: PracticeTest = {
      id: `test_${Date.now()}`,
      title: generatedQuiz.testTitle || `AI Practice: ${aiTopic}`,
      questions: generatedQuiz.questions
    };

    const updatedSubjects = (selectedBatch.subjects || []).map(sub => {
      if (sub.id === selectedSub.id) {
        return {
          ...sub,
          chapters: (sub.chapters || []).map(ch => {
            if (ch.id === selectedChapId) {
              return {
                ...ch,
                tests: [...(ch.tests || []), newPracticeTest]
              };
            }
            return ch;
          })
        };
      }
      return sub;
    });

    try {
      await updateDoc(doc(db, 'batches', selectedBatch.id), {
        subjects: updatedSubjects
      });
      setGeneratedQuiz(null);
      setAiTopic('');
      triggerFeedback('success', `AI generated quiz successfully bound to Chapter's practice database!`);
    } catch (err: any) {
      triggerFeedback('error', err.message);
    }
  };

  const handleAddPracticePdf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch || !selectedSub || !selectedChapId || !practicePdfTitle || !practicePdfUrl) {
      triggerFeedback('error', 'All fields are required to add a practice PDF');
      return;
    }

    const newPracticeTest: PracticeTest = {
      id: `test_${Date.now()}`,
      title: practicePdfTitle,
      pdfUrl: practicePdfUrl
    };

    const updatedSubjects = (selectedBatch.subjects || []).map(sub => {
      if (sub.id === selectedSub.id) {
        return {
          ...sub,
          chapters: (sub.chapters || []).map(ch => {
            if (ch.id === selectedChapId) {
              return {
                ...ch,
                tests: [...(ch.tests || []), newPracticeTest]
              };
            }
            return ch;
          })
        };
      }
      return sub;
    });

    try {
      await updateDoc(doc(db, 'batches', selectedBatch.id), {
        subjects: updatedSubjects
      });
      setPracticePdfTitle('');
      setPracticePdfUrl('');
      triggerFeedback('success', `Practice PDF "${newPracticeTest.title}" added successfully!`);
    } catch (err: any) {
      triggerFeedback('error', err.message);
    }
  };

  const handleDeleteLecture = async (videoId: string) => {
    if (!window.confirm('Delete video?')) return;
    try {
      const batchRef = doc(db, 'batches', selectedBatch!.id);
      const batchDoc = await getDoc(batchRef);
      const currentBatchData = batchDoc.data() as CourseBatch;

      const updatedSubjects = currentBatchData.subjects?.map(s => {
        if (s.id !== selectedSub!.id) return s;
        return {
          ...s,
          chapters: s.chapters?.map(c => {
            if (c.id !== selectedChapId) return c;
            return { ...c, lectures: c.lectures?.filter(v => v.id !== videoId) };
          })
        };
      }) || [];

      await updateDoc(batchRef, { subjects: updatedSubjects });
      triggerFeedback('success', 'Video deleted successfully.');
    } catch(err) {
      console.error('Error deleting video:', err);
      triggerFeedback('error', 'Failed to delete video');
    }
  };

  const handleDeleteNoteItem = async (noteId: string) => {
    if (!window.confirm('Delete note?')) return;
    try {
      const batchRef = doc(db, 'batches', selectedBatch!.id);
      const batchDoc = await getDoc(batchRef);
      const currentBatchData = batchDoc.data() as CourseBatch;

      const updatedSubjects = currentBatchData.subjects?.map(s => {
        if (s.id !== selectedSub!.id) return s;
        return {
          ...s,
          chapters: s.chapters?.map(c => {
            if (c.id !== selectedChapId) return c;
            return { ...c, notes: c.notes?.filter(n => n.id !== noteId) };
          })
        };
      }) || [];
      
      await updateDoc(batchRef, { subjects: updatedSubjects });
      triggerFeedback('success', 'Note deleted successfully.');
    } catch(err) {
      console.error('Error deleting note:', err);
      triggerFeedback('error', 'Failed to delete note');
    }
  };

  const handleDeleteTestItem = async (testId: string) => {
    if (!window.confirm('Delete test?')) return;
    try {
      const batchRef = doc(db, 'batches', selectedBatch!.id);
      const batchDoc = await getDoc(batchRef);
      const currentBatchData = batchDoc.data() as CourseBatch;

      const updatedSubjects = currentBatchData.subjects?.map(s => {
        if (s.id !== selectedSub!.id) return s;
        return {
          ...s,
          chapters: s.chapters?.map(c => {
            if (c.id !== selectedChapId) return c;
            return { ...c, tests: s.chapters!.flatMap(c => c.tests!).filter(t => t.id !== testId) };
          })
        };
      }) || [];
      
      await updateDoc(batchRef, { subjects: updatedSubjects });
      triggerFeedback('success', 'Test deleted successfully.');
    } catch(err) {
      console.error('Error deleting test:', err);
      triggerFeedback('error', 'Failed to delete test');
    }
  };

  const handleDeleteRevisionItem = async (revId: string) => {
    if (!window.confirm('Delete revision card?')) return;
    try {
      const batchRef = doc(db, 'batches', selectedBatch!.id);
      const batchDoc = await getDoc(batchRef);
      const currentBatchData = batchDoc.data() as CourseBatch;

      const updatedSubjects = currentBatchData.subjects?.map(s => {
        if (s.id !== selectedSub!.id) return s;
        return {
          ...s,
          chapters: s.chapters?.map(c => {
            if (c.id !== selectedChapId) return c;
            return { ...c, revision: c.revision?.filter(r => r.id !== revId) };
          })
        };
      }) || [];
      
      await updateDoc(batchRef, { subjects: updatedSubjects });
      triggerFeedback('success', 'Revision card deleted successfully.');
    } catch(err) {
      console.error('Error deleting revision card:', err);
      triggerFeedback('error', 'Failed to delete revision card');
    }
  };

  // ----------------------------------------------------
  // ACTION: LIFETIME ACCESS MANAGEMENT
  // ----------------------------------------------------
  const handleSearchUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lifetimeEmail) return;
    setSearchUserLoading(true);
    setTargetUser(null);
    try {
      const q = query(collection(db, 'users'), where('email', '==', lifetimeEmail.toLowerCase()));
      const snap = await getDocs(q);
      if (snap.empty) {
        triggerFeedback('error', 'No user found with this email.');
      } else {
        const userDoc = snap.docs[0];
        setTargetUser({ id: userDoc.id, ...userDoc.data() });
      }
    } catch (err: any) {
      triggerFeedback('error', 'Error searching user: ' + err.message);
    } finally {
      setSearchUserLoading(false);
    }
  };

  const handleToggleLifetimeAccess = async () => {
    if (!targetUser) return;
    try {
      const newValue = !targetUser.hasLifetimeAccess;
      await updateDoc(doc(db, 'users', targetUser.id), {
        hasLifetimeAccess: newValue
      });
      setTargetUser({ ...targetUser, hasLifetimeAccess: newValue });
      triggerFeedback('success', `Lifetime access ${newValue ? 'granted' : 'halted'} successfully!`);
    } catch (err: any) {
      triggerFeedback('error', 'Failed to update access: ' + err.message);
    }
  };

  // ----------------------------------------------------
  // RENDER INTERFACE
  // ----------------------------------------------------
  return (
    <div className="p-4 flex flex-col gap-6 text-sm font-sans normal-case">
      
      {/* Global Alerts Feedbacks */}
      {successMsg && (
        <div className="p-3 bg-[#0d220f]/60 text-green-400 border border-green-500/35 rounded-xl text-xs font-sans font-medium text-center">
          Success: {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-3 bg-[#240c0f]/60 text-rose-400 border border-rose-500/35 rounded-xl text-xs font-sans font-medium text-center">
          Terminal Alert: {errorMsg}
        </div>
      )}

      {/* LIFETIME ACCESS MANAGEMENT CARD */}
      <div className="bg-zinc-950 border border-emerald-500/20 rounded-[2rem] p-6 shadow-2xl space-y-4 font-sans text-left">
        <div className="flex items-center gap-2 pb-2 border-b border-white/5">
          <Sparkles className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400">Lifetime Access Management</h3>
        </div>
        
        <form onSubmit={handleSearchUser} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input 
              type="email" 
              placeholder="Enter user email..."
              value={lifetimeEmail}
              onChange={(e) => setLifetimeEmail(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500/50"
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={searchUserLoading}
            className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 px-6 rounded-xl text-xs tracking-wider shrink-0 cursor-pointer disabled:opacity-50 transition"
          >
            {searchUserLoading ? 'Searching...' : 'Find User'}
          </button>
        </form>

        {targetUser && (
          <div className="bg-black/50 border border-white/5 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4 mt-2">
            <div>
              <p className="text-sm text-white font-medium">{targetUser.displayName || 'Unknown Name'}</p>
              <p className="text-xs text-zinc-400">{targetUser.email}</p>
              {targetUser.hasLifetimeAccess && (
                <span className="inline-block mt-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Lifetime Access Active
                </span>
              )}
            </div>
            
            <button
              onClick={handleToggleLifetimeAccess}
              className={`font-bold py-2.5 px-5 rounded-xl text-xs tracking-wider uppercase transition cursor-pointer shrink-0 ${
                targetUser.hasLifetimeAccess 
                  ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/30' 
                  : 'bg-emerald-500 text-black hover:bg-emerald-400'
              }`}
            >
              {targetUser.hasLifetimeAccess ? 'Hault Lifetime Access' : 'Grant Lifetime Access'}
            </button>
          </div>
        )}
      </div>

      {/* 1. SECTOR TOP ROW: SELECT COURSE + PLUS TOGGLE TO CREATE COURSE */}
      <div className="flex flex-col gap-3 font-sans">
        <label className="block text-[10px] text-zinc-500 font-sans uppercase font-black tracking-wider">
          Course / Target Curriculum
        </label>
        <div className="flex gap-3 items-center">
          <div className="flex-1">
            <select 
              value={selectedBatch?.id || ''}
              id="admin_select_course"
              onChange={(e) => {
                const b = batches.find(x => x.id === e.target.value);
                setSelectedBatch(b || null);
                setSelectedSub(null);
                setSelectedChapId('');
                setDeletingId(null);
              }}
              className="w-full bg-zinc-950 border border-white/10 rounded-2xl px-4 py-3.5 text-xs sm:text-sm text-white focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition"
            >
              <option value="">-- Dropdown menu to select course --</option>
              {batches.map((b, idx) => (
                <option key={`${b.id}-${idx}`} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          {selectedBatch && (
            <button
              id="btn_delete_selected_course"
              type="button"
              onClick={() => handleDeleteCourse(selectedBatch.id)}
              className={`p-3.5 rounded-2xl border transition-all duration-300 flex items-center justify-center shrink-0 cursor-pointer gap-1.5 ${
                deletingId === selectedBatch.id
                  ? 'bg-red-600 border-red-600 text-white animate-pulse px-4'
                  : 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 hover:border-red-500/30'
              }`}
              title={deletingId === selectedBatch.id ? "Click again to confirm delete" : "Delete Selected Course"}
            >
              <Trash2 className="w-5 h-5" />
              {deletingId === selectedBatch.id && (
                <span className="text-[10px] font-black uppercase tracking-wider">Confirm Delete?</span>
              )}
            </button>
          )}
          <button
            id="btn_toggle_create_course"
            type="button"
            onClick={() => setShowCreateBatch(!showCreateBatch)}
            className={`p-3.5 rounded-2xl border transition-all duration-300 flex items-center justify-center shrink-0 cursor-pointer ${
              showCreateBatch 
                ? 'bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20' 
                : 'bg-white hover:bg-zinc-200 text-black border-white'
            }`}
            title={showCreateBatch ? "Close Create Course Form" : "Create New Course Batch"}
          >
            <Plus className={`w-5 h-5 transition-transform duration-300 ${showCreateBatch ? 'rotate-45' : ''}`} />
          </button>
        </div>
      </div>

      {/* Conditionally reveal Course Batch Creator form */}
      <AnimatePresence>
        {showCreateBatch && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden bg-zinc-950 border border-white/10 rounded-[2rem] p-6 space-y-4 shadow-xl"
          >
            <div className="flex items-center gap-2 pb-2 border-b border-white/5">
              <Layers className="w-4 h-4 text-zinc-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">Create New Course Batch</h3>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleCreateBatch(e); setShowCreateBatch(false); }} className="space-y-4 text-left">
              <div>
                <label className="block text-[10px] text-zinc-500 font-sans uppercase font-black tracking-wider mb-1">Batch Title / Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Lakshya JEE 2026: Physics Elite"
                  value={newBatchName}
                  onChange={(e) => setNewBatchName(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-white text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-zinc-500 font-sans uppercase font-black tracking-wider mb-1">Cost Price (INR)</label>
                  <input 
                    type="number" 
                    placeholder="₹1499"
                    value={newBatchPrice}
                    onChange={(e) => setNewBatchPrice(Number(e.target.value))}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-white text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500 font-sans uppercase font-black tracking-wider mb-1">Batch Image Link</label>
                  <input 
                    type="text" 
                    placeholder="Unsplash picture link..."
                    value={newBatchImage}
                    onChange={(e) => setNewBatchImage(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-white text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-zinc-500 font-sans uppercase font-black tracking-wider mb-1">Detailed Description Summary</label>
                <textarea 
                  placeholder="Syllabus coverage highlights and objectives..."
                  value={newBatchDesc}
                  onChange={(e) => setNewBatchDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-white text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] text-zinc-500 font-sans uppercase font-black tracking-wider mb-1">Initial Subjects (Comma Separated)</label>
                <input 
                  type="text" 
                  placeholder="e.g. Physics, Chemistry, Mathematics"
                  value={newBatchSubjects}
                  onChange={(e) => setNewBatchSubjects(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-white text-white"
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-white hover:bg-zinc-200 text-black text-xs font-bold uppercase py-2.5 rounded-xl tracking-wider select-none cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1"
              >
                <Plus className="w-4 h-4" /> Save Course to Cloud Batch
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. DIRECTORIES & TYPE SELECT TERMINAL CARD */}
      <div id="course_terminal_card" className="bg-zinc-950 border border-white/10 rounded-[2rem] p-6 shadow-2xl space-y-6 font-sans text-left">
        {/* Option 2.A: Select Subject */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-[10px] text-zinc-500 font-sans uppercase font-black tracking-wider">Select Subject</label>
            {selectedBatch && (
              <span className="text-[9px] text-zinc-600 font-sans">{selectedBatch.subjects?.length || 0} Registered</span>
            )}
          </div>
          <select 
            disabled={!selectedBatch}
            value={selectedSub?.id || ''}
            id="admin_select_subject"
            onChange={(e) => {
              const s = selectedBatch ? (selectedBatch.subjects || []).find(x => x.id === e.target.value) : undefined;
              setSelectedSub(s || null);
              setSelectedChapId('');
            }}
            className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-xs sm:text-sm text-white focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <option value="">-- Choose Subject --</option>
            {selectedBatch && (selectedBatch.subjects || []).map((s, idx) => (
              <option key={`${s.id}-${idx}`} value={s.id}>{s.name}</option>
            ))}
          </select>

          {/* Direct Subject Creator inner Form */}
          {selectedBatch && (
            <form onSubmit={handleAddSubject} className="mt-2.5 flex gap-2">
              <input 
                type="text" 
                placeholder="Draft new subject title..."
                value={newSubName}
                onChange={(e) => setNewSubName(e.target.value)}
                className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              />
              <button 
                type="submit" 
                className="bg-white hover:bg-zinc-200 text-black font-extrabold uppercase py-2 px-4 rounded-xl text-[10px] tracking-wider shrink-0 cursor-pointer active:scale-95 transition"
              >
                Create
              </button>
            </form>
          )}
        </div>

        {/* Option 2.B: Select Chapter */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-[10px] text-zinc-500 font-sans uppercase font-black tracking-wider">Select Chapter</label>
            {selectedSub && (
              <span className="text-[9px] text-zinc-600 font-sans">{selectedSub.chapters?.length || 0} Registered</span>
            )}
          </div>
          <select 
            disabled={!selectedBatch || !selectedSub}
            value={selectedChapId}
            id="admin_select_chapter"
            onChange={(e) => setSelectedChapId(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-xs sm:text-sm text-white focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <option value="">-- Choose Chapter --</option>
            {selectedSub && (selectedSub.chapters || []).map((ch, idx) => (
              <option key={`${ch.id}-${idx}`} value={ch.id}>{ch.name}</option>
            ))}
          </select>

          {/* Direct Chapter Creator inner Form */}
          {selectedBatch && selectedSub && (
            <form onSubmit={handleAddChapter} className="mt-2.5 flex gap-2">
              <input 
                type="text" 
                placeholder="Draft new chapter title..."
                value={newChapName}
                onChange={(e) => setNewChapName(e.target.value)}
                className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              />
              <button 
                type="submit" 
                className="bg-white hover:bg-zinc-200 text-black font-extrabold uppercase py-2 px-4 rounded-xl text-[10px] tracking-wider shrink-0 cursor-pointer active:scale-95 transition"
              >
                Create
              </button>
            </form>
          )}
        </div>

        {/* Option 2.C: Add Type Selection */}
        <div>
          <label className="block text-[10px] text-zinc-500 font-sans uppercase font-black tracking-wider mb-2">
            Add Type ( Notes, Videos, Quiz, Revis )
          </label>
          <select 
            disabled={!selectedBatch || !selectedSub || !selectedChapId}
            value={addType}
            id="admin_select_add_type"
            onChange={(e) => setAddType(e.target.value as any)}
            className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-xs sm:text-sm text-white focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <option value="notes">Notes</option>
            <option value="video">Videos</option>
            <option value="quiz">Quiz</option>
            <option value="revis">Revis</option>
          </select>
        </div>
      </div>

        {/* 3. DOCK APPEND INTERFACE FOR SELECTED CONTENT TYPE */}
      {selectedBatch && selectedSub && selectedChapId ? (
        <div className="space-y-6">
          
          {/* A. NOTES WRITER VIEW */}
          {addType === 'notes' && (
            <div className="bg-zinc-950 border border-white/10 rounded-[2rem] p-6 space-y-4 shadow-xl text-left">
              <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                <FileText className="w-5 h-5 text-zinc-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">Upload Subject Chapter Notes</h3>
              </div>
              
              <div className="space-y-2">
                 <h4 className="text-[10px] text-zinc-500 font-black uppercase tracking-wider">Existing Notes</h4>
                 {selectedSub.chapters?.find(c => c.id === selectedChapId)?.notes?.map(note => (
                   <div key={note.id} className="flex justify-between items-center bg-zinc-900 rounded-xl p-3 text-xs text-white">
                      <span>{note.title}</span>
                      <button onClick={() => handleDeleteNoteItem(note.id)} className="text-red-400 hover:text-red-200"><Trash2 className="w-4 h-4" /></button>
                   </div>
                 ))}
              </div>

              <form onSubmit={handleAddNotes} className="space-y-4 pt-4 border-t border-white/5">
                <div>
                  <label className="block text-[10px] text-zinc-500 font-sans uppercase font-black tracking-wider mb-1">Notes Document Title</label>
                  <input 
                    type="text" 
                    placeholder="e.g. High-Yield Electrostatics Revision Capsule"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-white text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-zinc-500 font-sans uppercase font-black tracking-wider mb-1">Notes Structured Contents</label>
                  <textarea 
                    placeholder="Insert markdown formulas, core mechanisms, step study notes..."
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    rows={6}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-white text-white font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-zinc-500 font-sans uppercase font-black tracking-wider mb-1">Notes PDF URL (Optional if content is provided)</label>
                  <input 
                    type="url" 
                    placeholder="e.g. https://drive.google.com/file/d/... or direct pdf link"
                    value={notePdfUrl}
                    onChange={(e) => setNotePdfUrl(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-white text-white"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-white hover:bg-zinc-200 text-black text-xs font-bold py-2.5 rounded-xl cursor-pointer select-none active:scale-95 transition"
                >
                  Save Notes sheet
                </button>
              </form>
            </div>
          )}          
          
          {/* B. VIDEOS ATTACH VIEW */}
          {addType === 'video' && (
            <div className="bg-zinc-950 border border-white/10 rounded-[2rem] p-6 space-y-4 shadow-xl text-left">
              <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                <Video className="w-5 h-5 text-zinc-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">Append Video Lecture</h3>
              </div>

              <div className="space-y-2">
                 <h4 className="text-[10px] text-zinc-500 font-black uppercase tracking-wider">Existing Lectures</h4>
                 {selectedSub.chapters?.find(c => c.id === selectedChapId)?.lectures?.map(lec => (
                   <div key={lec.id} className="flex justify-between items-center bg-zinc-900 rounded-xl p-3 text-xs text-white">
                      <span>{lec.title}</span>
                      <button onClick={() => handleDeleteLecture(lec.id)} className="text-red-400 hover:text-red-200"><Trash2 className="w-4 h-4" /></button>
                   </div>
                 ))}
              </div>

              <form onSubmit={handleAddLecture} className="space-y-4 pt-4 border-t border-white/5">
                <div>
                  <label className="block text-[10px] text-zinc-500 font-sans uppercase font-black tracking-wider mb-1">Lecture Title (Optional for Bulk)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. L2: Gauss Law and solid sphere field"
                    value={videoTitle}
                    onChange={(e) => setVideoTitle(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-white text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] text-zinc-500 font-sans uppercase font-black tracking-wider">Video URLs (One per line)</label>
                      {videoUrlInput.includes("youtu") && (
                        <button
                          type="button"
                          onClick={handleFetchYoutubeInfo}
                          disabled={isFetchingYoutubeInfo}
                          className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold uppercase tracking-wider disabled:opacity-50"
                        >
                          {isFetchingYoutubeInfo ? 'Extracting...' : 'Extract Info'}
                        </button>
                      )}
                    </div>
                    <textarea 
                      placeholder="e.g. https://youtu.be/...&#10;https://youtu.be/..."
                      value={videoUrlInput}
                      onChange={(e) => setVideoUrlInput(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-white text-white font-sans min-h-[80px]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-500 font-sans uppercase font-black tracking-wider mb-1">Duration Description</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 50 mins"
                      value={videoDuration}
                      onChange={(e) => setVideoDuration(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-white text-white"
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isAddingVideos}
                  className="w-full bg-white hover:bg-zinc-200 text-black text-xs font-bold py-2.5 rounded-xl cursor-pointer select-none active:scale-95 transition disabled:opacity-50"
                >
                  {isAddingVideos ? 'Adding Videos...' : 'Append video(s) to lectures playlist'}
                </button>
              </form>
            </div>
          )}

          {/* C. QUIZ GENERATOR VIEW */}
          {addType === 'quiz' && (
            <div className="bg-zinc-950 border border-white/15 rounded-[2rem] p-6 space-y-4 shadow-xl relative overflow-hidden text-left">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
              
              <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                <Cpu className="w-5 h-5 text-white animate-pulse" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white font-sans">JEE AI Test Generator</h3>
              </div>

              <div className="space-y-2 pb-4">
                 <h4 className="text-[10px] text-zinc-500 font-black uppercase tracking-wider">Existing Quizzes</h4>
                 {selectedSub.chapters?.find(c => c.id === selectedChapId)?.tests?.map(test => (
                   <div key={test.id} className="flex justify-between items-center bg-zinc-900 rounded-xl p-3 text-xs text-white">
                      <span>{test.title}</span>
                      <button onClick={() => handleDeleteTestItem(test.id)} className="text-red-400 hover:text-red-200"><Trash2 className="w-4 h-4" /></button>
                   </div>
                 ))}
              </div>

              <p className="text-[11px] text-zinc-500 leading-relaxed font-sans pt-4 border-t border-white/5">
                Generates mathematically robust multiple choice tests covering concepts, formula derivations, and deep answer solution details matching modern JEE Mains / Advanced patterns.
              </p>

              <div className="space-y-4 pt-2 pb-4 border-b border-white/5">
                <h4 className="text-[10px] text-zinc-500 font-black uppercase tracking-wider mb-2">Option A: Manual PDF Test</h4>
                <form onSubmit={handleAddPracticePdf} className="space-y-3">
                  <div>
                    <label className="block text-[10px] text-zinc-500 font-sans uppercase font-black tracking-wider mb-1">Test Title</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Chapter Test 1 - Mechanics"
                      value={practicePdfTitle}
                      onChange={(e) => setPracticePdfTitle(e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-500 font-sans uppercase font-black tracking-wider mb-1">Test PDF URL</label>
                    <input 
                      type="url" 
                      placeholder="e.g. https://drive.google.com/file/d/..."
                      value={practicePdfUrl}
                      onChange={(e) => setPracticePdfUrl(e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold py-2.5 rounded-xl cursor-pointer select-none transition"
                  >
                    Add Manual PDF Test
                  </button>
                </form>
              </div>

              <div className="space-y-4 pt-2">
                <h4 className="text-[10px] text-zinc-500 font-black uppercase tracking-wider mb-2">Option B: AI Generation</h4>
                <div>
                  <label className="block text-[10px] text-zinc-500 font-sans uppercase font-black tracking-wider mb-1">Chapter Concept Topic</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Gauss Law, Electronegativity, Integration by parts"
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-zinc-500 font-sans uppercase font-[900] tracking-wider mb-1">Exam Difficulty</label>
                    <select
                      value={aiLevel}
                      onChange={(e) => setAiLevel(e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-xl px-2 py-2 text-xs text-white"
                    >
                      <option value="JEE Main">JEE Main (Conceptual)</option>
                      <option value="JEE Advanced">JEE Advanced (Multistep)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-500 font-sans uppercase font-[900] tracking-wider mb-1">Question Count</label>
                    <select
                      value={aiQuestionCount}
                      onChange={(e) => setAiQuestionCount(Number(e.target.value))}
                      className="w-full bg-black border border-white/10 rounded-xl px-2 py-2 text-xs text-white font-sans"
                    >
                      <option value="3">3 questions</option>
                      <option value="5">5 questions</option>
                      <option value="8">8 questions</option>
                    </select>
                  </div>
                </div>

                {/* Quiz Generator Actions */}
                {aiGenerating ? (
                  <div className="py-4 text-center flex flex-col items-center gap-2">
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <p className="text-[10px] text-zinc-400 font-sans uppercase tracking-widest animate-pulse">Gemini AI solving math matrices...</p>
                  </div>
                ) : (
                  <button
                    onClick={handleAIGenerateQuiz}
                    className="w-full bg-white hover:bg-zinc-200 text-black text-xs font-black uppercase py-2.5 rounded-xl tracking-wider cursor-pointer"
                  >
                    ⚡ Execute AI Test formulation
                  </button>
                )}
              </div>

              {/* PREVIEW OF GENERATED AI TEST */}
              {generatedQuiz && (
                <div className="mt-4 p-4 border border-zinc-700 rounded-2xl bg-black space-y-3 font-sans">
                  <div className="flex justify-between items-center bg-white/5 p-2 rounded-xl">
                    <h4 className="text-[11px] font-bold text-white uppercase tracking-wider">{generatedQuiz.testTitle}</h4>
                    <span className="text-[9px] bg-white text-black px-1 rounded uppercase font-extrabold font-sans">AI STAMPED</span>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-3.5 divide-y divide-zinc-800 pr-1 text-[11px]">
                    {generatedQuiz.questions && generatedQuiz.questions.map((q: any, i: number) => (
                      <div key={i} className="pt-3 first:pt-0 text-left normal-case">
                        <p className="font-bold text-zinc-200">Q{i+1}: {q.question}</p>
                        <ul className="pl-4 mt-1.5 text-zinc-400 space-y-0.5 list-disc text-[10px]">
                          {q.options?.map((o: string, idx: number) => (
                            <li key={idx} className={idx === q.correctOption ? 'text-green-400 font-extrabold' : ''}>
                              {['A','B','C','D'][idx]}. {o}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 flex gap-2">
                    <button
                      onClick={handleBindAIQuiz}
                      className="flex-1 bg-green-500 text-black font-extrabold uppercase text-xs py-2.5 rounded-xl cursor-pointer"
                    >
                      Bind Test to chapter practice
                    </button>
                    <button
                      onClick={() => setGeneratedQuiz(null)}
                      className="bg-zinc-800 text-zinc-400 font-bold uppercase text-[10px] px-3 rounded-xl hover:text-white cursor-pointer"
                    >
                      Discard
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* D. REVISION VIEW */}
          {addType === 'revis' && (
            <div className="bg-zinc-950 border border-white/10 rounded-[2rem] p-6 space-y-4 shadow-xl text-left">
              <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                <Sparkles className="w-5 h-5 text-zinc-300" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">Append Revision Card for chapter</h3>
              </div>

              <div className="space-y-2 pb-4">
                 <h4 className="text-[10px] text-zinc-500 font-black uppercase tracking-wider">Existing Revision Cards</h4>
                 {selectedSub.chapters?.find(c => c.id === selectedChapId)?.revision?.map(rev => (
                   <div key={rev.id} className="flex justify-between items-center bg-zinc-900 rounded-xl p-3 text-xs text-white">
                      <span>{rev.title}</span>
                      <button onClick={() => handleDeleteRevisionItem(rev.id)} className="text-red-400 hover:text-red-200"><Trash2 className="w-4 h-4" /></button>
                   </div>
                 ))}
              </div>

              <form onSubmit={handleAddRevisionCard} className="space-y-4 pt-4 border-t border-white/5">
                <div>
                  <label className="block text-[10px] text-zinc-500 font-sans uppercase font-black tracking-wider mb-1">Revision Topic Header</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Coulomb's Law & Core Symmetries"
                    value={revTitle}
                    onChange={(e) => setRevTitle(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-white text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-zinc-500 font-sans uppercase font-black tracking-wider mb-1">Summary (High-Yield Key Details / Shortcuts)</label>
                  <textarea 
                    placeholder="Indicate key behaviors, properties and patterns..."
                    value={revSummary}
                    onChange={(e) => setRevSummary(e.target.value)}
                    rows={3}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-white text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-zinc-500 font-sans uppercase font-black tracking-wider mb-1">Formulas (one calculation per line)</label>
                  <textarea 
                    placeholder="e.g. F = k * q1 * q2 / r^2&#10;E = k * Q / x^2"
                    value={revFormulas}
                    onChange={(e) => setRevFormulas(e.target.value)}
                    rows={3}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-white text-white font-sans"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-white hover:bg-zinc-200 text-black text-xs font-bold py-2.5 rounded-xl cursor-pointer select-none active:scale-95 transition"
                >
                  Draft Revision formulations
                </button>
              </form>
            </div>
          )}

        </div>
      ) : (
        <div className="p-8 text-center border border-dashed border-white/10 rounded-[2rem] bg-white/[0.01]">
          <AlertTriangle className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
          <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest font-sans">Chapter Content locked</h4>
          <p className="text-[10px] text-zinc-500 font-sans mt-2 max-w-xs mx-auto leading-relaxed">
            Select a Target Course, Subject, and Chapter above to unlock Notes sheets, Video uploads, Quiz AI generators, and formulas revision creator forms.
          </p>
        </div>
      )}
    </div>
  );
}
