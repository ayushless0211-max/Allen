import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { db } from './firebase';
import { doc, getDoc, arrayUnion, collection, addDoc, updateDoc, setDoc } from 'firebase/firestore';
import { CourseBatch } from './types';
import { SAMPLE_BATCHES } from './Dashboard';
import { 
  Play, BookOpen, CheckSquare, RefreshCw, FileText, 
  CreditCard, Sparkles, Trophy, CheckCircle2, ChevronRight, Lock, Calendar, HelpCircle, Link as LinkIcon
} from 'lucide-react';

const BOOK_COLORS = [
  'bg-gradient-to-br from-indigo-400 to-indigo-600',
  'bg-gradient-to-br from-teal-400 to-teal-600',
  'bg-gradient-to-br from-purple-400 to-purple-600',
  'bg-gradient-to-br from-blue-400 to-blue-600',
  'bg-gradient-to-br from-emerald-400 to-emerald-600',
];

export default function BatchView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, profile, updateProfile } = useAuth();

  const [batch, setBatch] = useState<CourseBatch | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Payment states
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);

  // Ad Access States
  const [showAdOptions, setShowAdOptions] = useState(false);
  const [adLinkLoading, setAdLinkLoading] = useState(false);
  const [claimingToken, setClaimingToken] = useState(false);
  const [showAccessGranted, setShowAccessGranted] = useState(false);

  // Resize state
  const [itemsPerRow, setItemsPerRow] = useState(3);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) setItemsPerRow(2);
      else if (window.innerWidth < 1024) setItemsPerRow(3);
      else setItemsPerRow(4);
    };
    handleResize(); // trigger immediately
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle Token Claim if redirected from Ad Process
  useEffect(() => {
    const claimToken = async () => {
      const adToken = searchParams.get('verify_token');
      if (adToken && user && profile && !claimingToken) {
        setClaimingToken(true);
        try {
          // Read token from Firestore
          const tokenRef = doc(db, 'ad_tokens', adToken);
          const tokenSnap = await getDoc(tokenRef);
          
          if (tokenSnap.exists()) {
            const tokenData = tokenSnap.data();
            
            // ULTRA SECURE VALIDATION
            if (tokenData.userId !== user.uid) {
              alert("Security Alert: This ad token belongs to another user. Access denied.");
            } else if (tokenData.status !== 'pending') {
              alert("This ad link has already been used or expired. You cannot reuse it.");
            } else if (tokenData.batchId !== id) {
              alert("This ad token is for a different batch.");
            } else {
              // 1. Mark as claimed immediately to prevent reuse
              await updateDoc(tokenRef, { status: 'claimed' });
              
              // 2. Add 48 hours access
              const expiry = Date.now() + (48 * 60 * 60 * 1000);
              const currentAdAccess = profile.adAccess || {};
              await updateProfile({
                adAccess: {
                  ...currentAdAccess,
                  [id as string]: expiry
                }
              });
              
              setPurchaseSuccess(true);
              setShowAccessGranted(true);
            }
          } else {
            alert("Invalid or broken token.");
          }
        } catch (err) {
          console.error("Error claiming token:", err);
          alert("Failed to verify ad token.");
        } finally {
          searchParams.delete('verify_token');
          setSearchParams(searchParams);
          setClaimingToken(false);
        }
      }
    };
    claimToken();
  }, [searchParams, user, profile, id]);

  // Fetch Batch details from Firebase or Fallback
  useEffect(() => {
    if (!id) return;
    const fetchBatch = async () => {
      try {
        const docRef = doc(db, 'batches', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setBatch({ id: docSnap.id, ...docSnap.data() } as CourseBatch);
        } else {
          // Fallback to sample seed batches matching ID
          const seed = SAMPLE_BATCHES.find(b => b.id === id);
          if (seed) {
            setBatch(seed);
          } else {
            setBatch(null);
          }
        }
      } catch (error) {
        console.warn("Could not query Firestore batch, using offline fallback:", error);
        const seed = SAMPLE_BATCHES.find(b => b.id === id);
        setBatch(seed || null);
      } finally {
        setLoading(false);
      }
    };
    fetchBatch();
  }, [id]);

  if (loading) {
    return (
      <div className="py-32 flex flex-col items-center justify-center gap-3">
        <span className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">Acquiring Course Batch</p>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-zinc-400">Course batch could not be found.</p>
        <button onClick={() => navigate('/')} className="mt-4 bg-white text-black text-xs uppercase tracking-wider font-bold p-2 px-4 rounded-xl">
          Return Home
        </button>
      </div>
    );
  }

  // Check if course is owned or has active ad access
  const isPurchased = profile?.purchasedCourseIds?.includes(batch?.id || "") || 
    (profile?.adAccess && profile.adAccess[batch?.id || ""] && profile.adAccess[batch?.id || ""] > Date.now());

  // ----------------------------------------------------
  // LOGGING & PROFILE UPDATING TRANSACTION
  // ----------------------------------------------------
  const processSuccessfulPurchase = async (method: "razorpay" | "bypass_test", transactionId: string = '') => {
    if (!user || !batch) return;
    setPurchaseLoading(true);
    try {
      // 1. Log payment event to purchases database
      const purchaseData = {
        userId: user.uid,
        userEmail: user.email || 'anonymous',
        batchId: batch.id,
        batchName: batch.name,
        price: batch.price,
        method: method,
        timestamp: new Date().toISOString(),
        razorpayOrderId: transactionId || `local_${Date.now()}`
      };
      await addDoc(collection(db, 'purchases'), purchaseData);

      // 2. Append purchased ID to user's profile database
      await updateProfile({
        purchasedCourseIds: arrayUnion(batch.id) as unknown as string[]
      });

      setPurchaseSuccess(true);
    } catch (error) {
      console.error("Failed to records purchase validation inside database:", error);
      alert("Purchase went through but update failed! Contact support with receipt.");
    } finally {
      setPurchaseLoading(false);
    }
  };

  const handleGenerateAdLink = async (provider: 'shrinkme' | 'linkshortify') => {
    if (!user || !batch) return;
    setAdLinkLoading(true);
    try {
      if (provider !== 'shrinkme') {
        alert("This provider is coming soon.");
        setAdLinkLoading(false);
        return;
      }
      
      // 1. Generate unique ad token locally
      const tokenId = `ad_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      // 2. Persist to Firestore instantly
      const tokenRef = doc(db, 'ad_tokens', tokenId);
      await setDoc(tokenRef, {
        userId: user.uid,
        batchId: batch.id,
        status: 'pending',
        createdAt: Date.now()
      });
      
      // 3. Create target URL to return back to this page with token
      const targetUrl = `${window.location.origin}/batch/${batch.id}?verify_token=${tokenId}`;
      
      // 4. Generate Short URL via CORS proxy to bypass Vercel server limits
      const shrinkmeApiUrl = `https://shrinkme.io/api?api=405b1b2a840f356e2909c00826fba076788f7041&url=${encodeURIComponent(targetUrl)}`;
      
      let data;
      try {
        // Try direct fetch first (if CORS is enabled by provider)
        const response = await fetch(shrinkmeApiUrl);
        data = await response.json();
      } catch (directErr) {
        try {
          // Fallback to a reliable CORS proxy
          const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(shrinkmeApiUrl)}`;
          const response = await fetch(proxyUrl);
          data = await response.json();
        } catch (proxyErr) {
          // Second fallback
          const proxyUrl2 = `https://corsproxy.io/?${encodeURIComponent(shrinkmeApiUrl)}`;
          const response = await fetch(proxyUrl2);
          data = await response.json();
        }
      }
      
      if (data && data.status === 'success' && data.shortenedUrl) {
        window.location.href = data.shortenedUrl;
      } else {
        alert('Failed to generate ad link: ' + (data?.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error generating link:', err);
      alert('Error connecting to ad service. Please try again.');
    } finally {
      setAdLinkLoading(false);
    }
  };

  const handleUnenroll = async () => {
    if (!user || !batch || !profile) return;
    const confirmUnenroll = window.confirm("Are you sure you want to unenroll from this batch?");
    if (!confirmUnenroll) return;

    try {
      const currentPurchased = profile.purchasedCourseIds || [];
      const currentAdAccess = profile.adAccess || {};
      
      const newPurchased = currentPurchased.filter(id => id !== batch.id);
      const newAdAccess = { ...currentAdAccess };
      delete newAdAccess[batch.id];
      
      await updateProfile({
        purchasedCourseIds: newPurchased,
        adAccess: newAdAccess
      });
      
      alert("Successfully unenrolled.");
    } catch (err) {
      console.error("Error unenrolling:", err);
      alert("Failed to unenroll.");
    }
  };

  // ----------------------------------------------------
  // REAL TIME CORE RAZORPAY PAYMENT TRIGGER
  // ----------------------------------------------------
  const handleRazorpayPurchase = async () => {
    if (!user) {
      // Direct sign in trigger
      navigate('/');
      return;
    }

    setPurchaseLoading(true);
    try {
      // Call our secure backend to create order
      const response = await fetch("/api/create-razorpay-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: batch.price }),
      });

      if (!response.ok) {
        throw new Error("Unable to create secure Razorpay order on server");
      }

      const orderData = await response.json();

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_YourKeyId", 
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Allun",
        description: `Enrollment into ${batch.name}`,
        order_id: orderData.id,
        handler: function (response: any) {
          processSuccessfulPurchase("razorpay", response.razorpay_payment_id);
        },
        prefill: {
          name: user.displayName || "Student",
          email: user.email || "",
        },
        theme: {
          color: "#000000",
        },
      };

      if ((window as any).Razorpay) {
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else {
        alert("Razorpay payment gateway script not loaded. Please connect to internet or use test bypass below.");
        setPurchaseLoading(false);
      }
    } catch (err: any) {
      console.error("Razorpay workflow crash:", err);
      alert(`Razorpay Checkout Error: ${err.message || err}. Reverting to local bypass.`);
      setPurchaseLoading(false);
    }
  };

  // ----------------------------------------------------
  // UNIFIED RENDER (With Library Shelf)
  // ----------------------------------------------------

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto w-full">
      
      {/* Banner with Course Thumbnail */}
      <div className="relative h-64 sm:h-80 rounded-3xl overflow-hidden bg-zinc-900 border border-white/10">
        <img 
          src={batch.image} 
          alt={batch.name} 
          className="w-full h-full object-cover grayscale opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute top-6 right-6">
          {isPurchased && (
            <span className="bg-emerald-500 text-black px-3 py-1.5 rounded-full font-bold text-sm">
              Enrolled
            </span>
          )}
        </div>
        <div className="absolute bottom-6 left-6 right-6">
          {!isPurchased && (
            <span className="text-xs bg-white text-black px-2 py-1 rounded font-semibold tracking-wide">
              Enroll Now
            </span>
          )}
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mt-3 text-white">{batch.name}</h1>
        </div>
      </div>

      {/* Purchase Info Card (Only if not purchased) */}
      {!isPurchased && (
        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-8 relative overflow-hidden">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-5">
            <div>
              <span className="text-sm text-zinc-400 block mb-1">Lifetime Access</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white tracking-tight">₹{batch.price}</span>
                <span className="text-sm text-zinc-500 line-through">₹{(batch.price * 2.5).toFixed(0)}</span>
              </div>
            </div>
            {/* Countdown Badge UI */}
            <div className="text-right">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded">60% OFF Today</span>
              <p className="text-xs text-zinc-400 mt-2">Sale ends in <span className="text-white font-mono">14:28:05</span></p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white">Course Overview</h3>
            <p className="text-zinc-300 leading-relaxed text-sm md:text-base">
              {batch.description}
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest block mb-4">Included in Package</h4>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(batch.highlights || ["Full Syllabus Videos", "Revision Notes Integration", "High-Yield Practice Qs", "Expert Resolution"]).map((hl, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-zinc-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span>{hl}</span>
                </li>
              ))}
            </ul>
          </div>

          <hr className="border-white/10" />

          {/* Purchase operations buttons */}
          <div className="pt-4 space-y-4">
            
            {purchaseSuccess ? (
              <div className="p-6 rounded-2xl bg-white/10 text-center border border-white/20">
                <Trophy className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                <h4 className="text-lg font-semibold text-white">Enrollment Successful</h4>
                <p className="text-sm text-zinc-400 mt-2">Workspace loading...</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="mt-6 bg-white text-black font-semibold py-3 px-6 rounded-full cursor-pointer hover:bg-zinc-200 transition-colors"
                >
                  Enter Classroom
                </button>
              </div>
            ) : (
              <>
                {/* Razorpay Button */}
                <button
                  id="checkout_razorpay"
                  disabled={purchaseLoading}
                  onClick={handleRazorpayPurchase}
                  className="w-full bg-white hover:bg-zinc-200 text-black font-semibold py-4 px-6 rounded-full text-base transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {purchaseLoading ? (
                    <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" /> Secure Checkout
                    </>
                  )}
                </button>

                {/* Token Access / Ad Options */}
                {user ? (
                  <div className="space-y-3">
                    <button
                      onClick={() => setShowAdOptions(!showAdOptions)}
                      className="w-full bg-black hover:bg-white/5 border border-white/10 text-zinc-400 hover:text-white text-sm py-3 rounded-full transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" /> Get 48 Hours Access for Free
                    </button>
                    
                    {showAdOptions && (
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 animate-in fade-in slide-in-from-top-4">
                        <p className="text-xs text-zinc-400 text-center mb-2">Complete a quick ad process to unlock this batch for 48 hours.</p>
                        <div className="grid grid-cols-1 gap-3">
                          <button
                            onClick={() => handleGenerateAdLink('shrinkme')}
                            disabled={adLinkLoading}
                            className="bg-[#2A2B2E] hover:bg-[#34353A] border border-white/5 text-white font-semibold py-3 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                          >
                            {adLinkLoading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <LinkIcon className="w-4 h-4" />}
                            Unlock via ShrinkMe.io
                          </button>
                          
                          <button
                            disabled
                            className="bg-[#2A2B2E]/50 border border-white/5 text-zinc-500 font-semibold py-3 px-4 rounded-xl text-sm cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            <LinkIcon className="w-4 h-4 opacity-50" />
                            Unlock via LinkShortify (Coming Soon)
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    id="auth_redirect"
                    onClick={() => navigate('/')}
                    className="w-full bg-transparent border border-white/20 text-zinc-400 hover:text-white py-3 rounded-full text-sm transition-colors text-center cursor-pointer"
                  >
                    Sign in required to enroll
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Overview Block for Enrolled users */}
      {isPurchased && (
        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 space-y-4 relative">
          <div className="flex justify-between items-start">
            <h3 className="text-xl font-semibold text-white">Course Overview</h3>
            <button
              onClick={handleUnenroll}
              className="text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 px-3 py-1.5 rounded-full font-semibold transition-colors cursor-pointer"
            >
              Unenroll
            </button>
          </div>
          <p className="text-zinc-300 leading-relaxed text-sm md:text-base">
            {batch.description}
          </p>
        </div>
      )}

      {/* Bookshelf Library section */}
      <div className="space-y-12 pb-12 pt-4">
        <h2 className="text-2xl font-bold text-white px-2 mb-8">
          Library
        </h2>
        
        <div className="space-y-16">
          {batch.subjects && batch.subjects.length > 0 ? (
            // Group into itemsPerRow per shelf
            Array.from({ length: Math.ceil(batch.subjects.length / itemsPerRow) }).map((_, shelfIdx) => {
              const rowSubjects = batch.subjects!.slice(shelfIdx * itemsPerRow, shelfIdx * itemsPerRow + itemsPerRow);
              return (
                <div key={shelfIdx} className="relative flex justify-center gap-6 sm:gap-16 pb-2">
                  {/* The shelf line */}
                  <div className="absolute bottom-0 left-0 right-0 h-4 bg-white/10 rounded-full shadow-[0_4px_20px_rgba(255,255,255,0.05)] border-b-2 border-white/20" />
                  
                  {rowSubjects.map((sub, idx) => {
                    const colorIndex = (shelfIdx * itemsPerRow + idx) % BOOK_COLORS.length;
                    return (
                      <div 
                        key={sub.id} 
                        title={isPurchased ? "Open Subject" : "Enrollment required"}
                        onClick={() => navigate(`/batch/${batch.id}/subject/${sub.id}`)}
                        className={`relative shrink-0 w-28 sm:w-36 h-36 sm:h-48 ${BOOK_COLORS[colorIndex]} rounded-r-2xl rounded-l-md shadow-2xl cursor-pointer hover:-translate-y-4 hover:rotate-1 transition-all duration-300 flex flex-col justify-end p-4 sm:p-5 border-l-[12px] sm:border-l-[16px] border-black/30 z-10 box-border group`}
                      >
                        {/* Inner page edge lines on right side */}
                        <div className="absolute top-2 bottom-2 right-0 w-2 sm:w-3 bg-white/10 rounded-l-md border-l border-white/20" />
                        
                        {/* Lock Icon for unenrolled */}
                        {!isPurchased && (
                          <div className="absolute top-3 right-5 text-white/50 group-hover:text-white transition-colors">
                            <Lock className="w-4 h-4" />
                          </div>
                        )}
                        
                        <h4 className="text-white font-bold text-sm sm:text-base leading-tight tracking-tight drop-shadow-md z-10 text-center mb-1 line-clamp-2">
                          {sub.name}
                        </h4>
                      </div>
                    );
                  })}
                </div>
              );
            })
          ) : (
            <p className="text-zinc-500 text-center">No subjects available in the library yet.</p>
          )}
        </div>
      </div>
      {/* Access Granted Overlay Modal */}
      {showAccessGranted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-zinc-900 border border-white/10 p-8 sm:p-12 rounded-[2rem] max-w-md w-full text-center space-y-6 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            {/* Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200%] aspect-square bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2" />
            
            <div className="relative z-10 space-y-6">
              <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 mx-auto rounded-full flex items-center justify-center border border-emerald-500/30">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-3xl font-bold text-white tracking-tight">Access Granted</h3>
                <p className="text-zinc-400 text-sm">
                  You have successfully unlocked <span className="text-white font-medium">{batch.name}</span> for 48 hours. Enjoy learning!
                </p>
              </div>

              <button 
                onClick={() => {
                  setShowAccessGranted(false);
                  window.location.reload(); // Reload to refresh state
                }}
                className="w-full bg-white hover:bg-zinc-200 text-black py-4 rounded-xl font-bold transition-colors cursor-pointer"
              >
                Enter Classroom
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
