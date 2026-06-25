import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, query, where, getDocs, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';
import { Star, MessageCircle, ArrowLeft, Mail, CalendarClock, ChevronDown } from 'lucide-react';

interface UserProfile {
  uid: string;
  name: string;
  contact: string;
  contactType: 'email' | 'whatsapp';
  skillHave: string;
  skillWant: string;
  photoURL?: string;
}

interface Review {
  id: string;
  reviewerId: string;
  reviewerName: string;
  rating: number;
  comment: string;
  createdAt: any;
}

export default function UserProfileView() {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const { user, profile: currentUserProfile } = useAuth();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [isWritingReview, setIsWritingReview] = useState(false);

  const [scheduleDay, setScheduleDay] = useState('M');
  const [scheduleHour, setScheduleHour] = useState('12');
  const [scheduleMinute, setScheduleMinute] = useState('00');
  const [swapType, setSwapType] = useState('In-person');
  const [isScheduling, setIsScheduling] = useState(false);

  const days = ['M', 'T', 'W', 'Th', 'F', 'Sa', 'S'];
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = ['00', '15', '30', '45'];
  const swapTypes = ['In-person', 'Video Call', 'Voice Call', 'Chat'];

  const handleScheduleSwap = async () => {
    if (!user || !currentUserProfile || !profile || !uid) return;
    setIsScheduling(true);
    try {
      await addDoc(collection(db, 'scheduled_swaps'), {
        participants: [user.uid, uid],
        participantNames: {
          [user.uid]: currentUserProfile.name,
          [uid]: profile.name
        },
        createdBy: user.uid,
        swapType,
        scheduleDay,
        scheduleHour,
        scheduleMinute,
        status: 'scheduled',
        createdAt: serverTimestamp()
      });
      alert(`Successfully scheduled a ${swapType} swap for ${scheduleDay} at ${scheduleHour}:${scheduleMinute}`);
    } catch (error) {
      console.error("Error scheduling swap:", error);
      alert("Failed to schedule swap. Please try again.");
    } finally {
      setIsScheduling(false);
    }
  };

  const RotaryDial = ({ options, value, onChange, label }: { options: string[], value: string, onChange: (v: string) => void, label: string }) => {
    const [rotation, setRotation] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const startAngleRef = React.useRef(0);
    const currentRotationRef = React.useRef(0);

    const numOptions = options.length;
    const anglePerOption = 360 / numOptions;

    React.useEffect(() => {
      if (!isDragging) {
        const index = options.indexOf(value);
        if (index !== -1) {
          const targetRotation = -index * anglePerOption;
          setRotation(targetRotation);
          currentRotationRef.current = targetRotation;
        }
      }
    }, [value, options, isDragging, anglePerOption]);

    const getAngle = (clientX: number, clientY: number) => {
      if (!containerRef.current) return 0;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const x = clientX - centerX;
      const y = clientY - centerY;
      return Math.atan2(y, x) * (180 / Math.PI);
    };

    const handlePointerDown = (e: React.PointerEvent) => {
      setIsDragging(true);
      const angle = getAngle(e.clientX, e.clientY);
      startAngleRef.current = angle - currentRotationRef.current;
      e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
      if (!isDragging) return;
      const angle = getAngle(e.clientX, e.clientY);
      let newRotation = angle - startAngleRef.current;
      setRotation(newRotation);
      currentRotationRef.current = newRotation;
    };

    const handlePointerUp = (e: React.PointerEvent) => {
      if (!isDragging) return;
      setIsDragging(false);
      e.currentTarget.releasePointerCapture(e.pointerId);

      let normalizedRotation = currentRotationRef.current % 360;
      if (normalizedRotation > 0) normalizedRotation -= 360;
      
      let index = Math.round(-normalizedRotation / anglePerOption);
      if (index < 0) index += numOptions;
      if (index >= numOptions) index -= numOptions;

      onChange(options[index]);
    };

    let normalizedRotation = rotation % 360;
    if (normalizedRotation > 0) normalizedRotation -= 360;
    let currentIndex = Math.round(-normalizedRotation / anglePerOption);
    if (currentIndex < 0) currentIndex += numOptions;
    if (currentIndex >= numOptions) currentIndex -= numOptions;
    const displayValue = options[currentIndex];

    return (
      <div className="flex flex-col items-center w-full max-w-[100px] sm:max-w-[140px] flex-1">
        <div 
          ref={containerRef}
          className="w-full aspect-square rounded-full border-2 border-white/10 bg-gradient-to-br from-zinc-800 to-black relative flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.5)] cursor-grab active:cursor-grabbing touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {/* The rotating disc */}
          <div 
            className="absolute inset-1 sm:inset-2 rounded-full border border-white/5 bg-zinc-950 shadow-inner flex items-center justify-center"
            style={{ 
              transform: `rotate(${rotation}deg)`,
              transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}
          >
            {/* Tick marks */}
            {options.map((opt, i) => {
              const angle = i * anglePerOption;
              const isMajor = i % Math.ceil(numOptions / 12) === 0;
              return (
                <div 
                  key={i}
                  className="absolute inset-0 flex items-start justify-center pt-1 sm:pt-2 pointer-events-none"
                  style={{ transform: `rotate(${angle}deg)` }}
                >
                  <div className={`w-1 rounded-full ${isMajor ? 'h-3 sm:h-4 bg-white/40' : 'h-1.5 sm:h-2 bg-white/10'}`}></div>
                </div>
              );
            })}
            
            {/* Inner knob detail */}
            <div className="w-3/5 h-3/5 rounded-full bg-gradient-to-br from-white/10 to-transparent border border-white/10 shadow-lg flex items-center justify-center pointer-events-none">
              <div className="w-full h-full rounded-full bg-black/40 shadow-inner flex items-start justify-center pt-2 sm:pt-3">
                 <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.8)]"></div>
              </div>
            </div>
          </div>

          {/* Selected Value Overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-sm sm:text-xl font-bold text-white whitespace-nowrap">{displayValue}</span>
          </div>
        </div>
        <span className="text-[10px] sm:text-xs uppercase tracking-widest text-white/40 font-bold mt-4 sm:mt-5">{label}</span>
      </div>
    );
  };

  useEffect(() => {
    const fetchProfileAndReviews = async () => {
      if (!uid) return;
      try {
        const docRef = doc(db, 'users', uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        }

        const reviewsRef = collection(db, 'users', uid, 'reviews');
        const q = query(reviewsRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const fetchedReviews: Review[] = [];
        querySnapshot.forEach((doc) => {
          fetchedReviews.push({ id: doc.id, ...doc.data() } as Review);
        });
        setReviews(fetchedReviews);
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndReviews();
  }, [uid]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !uid || !currentUserProfile) return;
    
    setSubmittingReview(true);
    try {
      const reviewsRef = collection(db, 'users', uid, 'reviews');
      const newReview = {
        reviewerId: user.uid,
        reviewerName: currentUserProfile.name || 'Anonymous',
        rating,
        comment,
        createdAt: serverTimestamp()
      };
      const docRef = await addDoc(reviewsRef, newReview);
      setReviews([{ id: docRef.id, ...newReview, createdAt: new Date() }, ...reviews]);
      setComment('');
      setRating(5);
    } catch (error) {
      console.error("Error submitting review:", error);
      alert("Failed to submit review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white"></div></div>;
  }

  if (!profile) {
    return <div className="text-center py-20">Profile not found</div>;
  }

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : 'No ratings yet';

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-white/50 hover:text-white mb-8 transition-colors text-sm font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Top Section */}
      <div className="mb-12">
        <div className="flex flex-row gap-6 sm:gap-10">
          {/* Left Column */}
          <div className="w-24 sm:w-32 shrink-0 flex flex-col items-center gap-5">
            {/* Profile Picture Placeholder */}
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-white/10 to-transparent border border-white/10 shadow-xl flex items-center justify-center overflow-hidden shrink-0">
              {profile.photoURL && !profile.photoURL.startsWith('http') && !profile.photoURL.startsWith('data:') ? (
                <span className="text-4xl sm:text-6xl">{profile.photoURL}</span>
              ) : (
                <div className="text-4xl sm:text-5xl font-medium text-white/60">
                  {profile.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            
            {/* Ratings */}
            <div className="flex flex-col items-center text-center">
              <div className="text-[10px] sm:text-xs uppercase tracking-widest font-bold text-white/40 mb-1.5">Ratings</div>
              <div className="flex items-center gap-1 text-yellow-400 mb-1.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${i < Math.round(Number(averageRating) || 0) ? 'fill-current' : 'text-white/10'}`} />
                ))}
              </div>
              <div className="text-sm font-semibold text-white/90">
                {averageRating !== 'No ratings yet' ? averageRating : '0'}
              </div>
              <div className="text-xs text-white/40 mt-0.5">({reviews.length} reviews)</div>
            </div>
          </div>

          {/* Right Column */}
          <div className="flex-1 flex flex-col gap-5 sm:gap-6 pt-1 sm:pt-2 min-w-0">
            {/* Name */}
            <h2 className="text-3xl font-medium tracking-tight text-white/90 truncate">{profile.name.split(' ')[0]}</h2>
            
            {/* Contact Type & Message */}
            <div className="flex flex-wrap items-center gap-3">
              {user?.uid !== uid && (
                <button 
                  onClick={() => navigate(`/chat/${uid}`)}
                  className="flex items-center gap-2 px-5 py-2 rounded-full bg-white text-black text-sm font-semibold hover:scale-105 transition-transform shadow-lg"
                >
                  <MessageCircle className="w-4 h-4" />
                  Message
                </button>
              )}
            </div>

            {/* Skills */}
            <div className="grid grid-cols-2 gap-4 sm:gap-8 mt-4 sm:mt-6">
              <div className="pl-4 border-l border-white/10 min-w-0">
                <div className="text-[10px] sm:text-xs uppercase tracking-widest font-bold mb-1.5 sm:mb-2 text-white/40">Can Teach</div>
                <div className="text-base sm:text-xl font-medium text-white/90 truncate">
                  {profile.skillHave || 'Not specified'}
                </div>
              </div>
              <div className="pl-4 border-l border-white/10 min-w-0">
                <div className="text-[10px] sm:text-xs uppercase tracking-widest font-bold mb-1.5 sm:mb-2 text-white/40">Wants to Learn</div>
                <div className="text-base sm:text-xl font-medium text-white/90 truncate">
                  {profile.skillWant || 'Not specified'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Swap Section */}
      {user?.uid !== uid && (
        <div className="py-10 border-t border-white/10">
          <div className="flex items-center gap-3 mb-8">
            <CalendarClock className="w-6 h-6 text-white/70" />
            <h3 className="text-2xl font-semibold tracking-tight text-white/90">Schedule Swap</h3>
          </div>
          
          <div className="bg-white/[0.02] border border-white/5 p-6 sm:p-8 rounded-3xl shadow-xl">
            <div className="flex flex-col gap-8">
              
              {/* Rotating Discs */}
              <div className="flex flex-row justify-center gap-4 sm:gap-8 w-full">
                <RotaryDial options={days} value={scheduleDay} onChange={setScheduleDay} label="Day" />
                <RotaryDial options={hours} value={scheduleHour} onChange={setScheduleHour} label="Hour" />
                <RotaryDial options={minutes} value={scheduleMinute} onChange={setScheduleMinute} label="Minute" />
              </div>

              {/* Swap Type & Schedule Button */}
              <div className="flex flex-col gap-5 w-full">
                <div className="relative">
                  <label className="text-[10px] sm:text-xs uppercase tracking-widest text-white/40 font-bold mb-2 block">Swap Type</label>
                  <div className="relative">
                    <select 
                      value={swapType}
                      onChange={(e) => setSwapType(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl pl-4 pr-10 py-3.5 text-sm text-white focus:outline-none focus:border-white/40 transition-colors appearance-none cursor-pointer"
                    >
                      {swapTypes.map(t => <option key={t} value={t} className="bg-zinc-900">{t}</option>)}
                    </select>
                    <ChevronDown className="w-4 h-4 text-white/40 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
                
                <button 
                  onClick={handleScheduleSwap}
                  disabled={isScheduling}
                  className="w-full px-6 py-3.5 rounded-xl bg-white text-black text-sm font-bold hover:scale-[1.02] transition-transform shadow-lg mt-2 disabled:opacity-50 disabled:hover:scale-100"
                >
                  {isScheduling ? 'Scheduling...' : 'Schedule'}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Bottom Section */}
      <div className="pt-10 border-t border-white/10">
        <h3 className="text-2xl font-semibold tracking-tight mb-8 text-white/90">Reviews</h3>
        
        <div className="space-y-4 mb-8">
          {reviews.length === 0 ? (
            <div className="text-white/40 py-8 text-center bg-white/[0.02] border border-white/5 rounded-2xl">
              No reviews yet
            </div>
          ) : (
            reviews.map((review) => (
              <div key={review.id} className="bg-white/[0.02] border border-white/5 p-5 sm:p-6 rounded-2xl transition-colors hover:bg-white/[0.03]">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-medium text-base text-white/90">{review.reviewerName}</div>
                    <div className="text-xs text-white/40 mt-1">
                      {review.createdAt?.toDate ? review.createdAt.toDate().toLocaleDateString() : 'Just now'}
                    </div>
                  </div>
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-current' : 'text-white/10'}`} />
                    ))}
                  </div>
                </div>
                <p className="text-white/70 text-sm leading-relaxed">{review.comment}</p>
              </div>
            ))
          )}
        </div>

        {user?.uid !== uid && (
          <div className="flex justify-end mt-8">
            {!isWritingReview ? (
              <button
                onClick={() => setIsWritingReview(true)}
                className="px-6 py-2.5 rounded-full bg-white text-black text-sm font-semibold hover:scale-105 transition-transform shadow-lg"
              >
                Write a Review
              </button>
            ) : (
              <form onSubmit={handleSubmitReview} className="w-full max-w-lg ml-auto bg-white/[0.02] border border-white/5 p-6 sm:p-8 rounded-3xl space-y-6 shadow-xl">
                <div>
                  <label className="text-xs uppercase tracking-widest text-white/50 font-bold mb-3 block">Rating</label>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className={`p-1 ${rating >= star ? 'text-yellow-400' : 'text-white/10'} hover:text-yellow-300 transition-colors`}
                      >
                        <Star className={`w-7 h-7 ${rating >= star ? 'fill-current' : ''}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-white/50 font-bold mb-3 block">Review</label>
                  <textarea
                    required
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/40 transition-colors min-h-[120px]"
                    placeholder="Write your review here..."
                  />
                </div>
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsWritingReview(false);
                      setComment('');
                      setRating(5);
                    }}
                    className="px-6 py-2.5 rounded-full bg-transparent hover:bg-white/10 text-white text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="px-6 py-2.5 rounded-full bg-white text-black text-sm font-semibold hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 shadow-lg"
                  >
                    {submittingReview ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
