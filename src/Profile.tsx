import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { db, auth } from './firebase';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { 
  User, Mail, ChevronRight, Star, Coins, LogOut, Shield, Smile, Pencil, ArrowLeft, Check, Compass, ShieldAlert, Navigation, Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Common quick selection emojis
const EMOJIS = ['😄', '😎', '🤓', '💻', '🎨', '🚀', '🔥', '🎸', '🧠', '🌟', '🍵', '🐼', '🍕', '⚽', '💡', '🤖', '👑', '🌈'];

export default function Profile() {
  const { profile, user, updateProfile, toggleAdminRole } = useAuth();
  const navigate = useNavigate();

  // Navigation settings inside the Profile component
  const [activeSection, setActiveSection] = useState<'menu' | 'personal' | 'skills'>('menu');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form Fields States
  const [nameInput, setNameInput] = useState('');
  const [contactInput, setContactInput] = useState('');
  const [contactTypeInput, setContactTypeInput] = useState<'email' | 'whatsapp'>('email');
  const [latInput, setLatInput] = useState('');
  const [lngInput, setLngInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [skillHaveInput, setSkillHaveInput] = useState('');
  const [skillWantInput, setSkillWantInput] = useState('');
  const [customEmojiInput, setCustomEmojiInput] = useState('');

  // Loaded real-time reviews metrics
  const [reviewsCount, setReviewsCount] = useState(0);
  const [avgRating, setAvgRating] = useState('5.0');
  const [isSaving, setIsSaving] = useState(false);
  const [isDetectingLoc, setIsDetectingLoc] = useState(false);

  // If not logged in, navigate to Auth
  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Read reviews metrics dynamically from firestore
  useEffect(() => {
    if (!user) return;

    const reviewsRef = collection(db, 'users', user.uid, 'reviews');
    const unsubReviews = onSnapshot(reviewsRef, (snapshot) => {
      let sum = 0;
      let count = 0;
      snapshot.forEach(doc => {
        const data = doc.data();
        if (typeof data.rating === 'number') {
          sum += data.rating;
          count++;
        }
      });
      const avg = count > 0 ? (sum / count).toFixed(1) : "5.0";
      setAvgRating(avg);
      setReviewsCount(count);
    }, (error) => {
      console.warn("Could not query reviews/rating metrics:", error);
    });

    return () => {
      unsubReviews();
    };
  }, [user]);

  // Load profile values into inputs when opening sections
  useEffect(() => {
    if (profile) {
      setNameInput(profile.name || profile.displayName || '');
      setContactInput(profile.contact || '');
      setContactTypeInput(profile.contactType || 'email');
      
      if (profile.location) {
        setLatInput(String(profile.location.lat));
        setLngInput(String(profile.location.lng));
      } else {
        setLatInput('');
        setLngInput('');
      }

      setUsernameInput(profile.username || '');
      setSkillHaveInput(profile.skillHave || '');
      setSkillWantInput(profile.skillWant || '');
    }
  }, [profile, activeSection]);

  const triggerFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/', { replace: true });
    } catch (err) {
      console.error("Sign out process failed:", err);
    }
  };

  // Change user avatar emoji/photoURL
  const handleSelectAvatar = async (emojiOrUrl: string) => {
    setIsSaving(true);
    try {
      await updateProfile({ photoURL: emojiOrUrl });
      setShowAvatarPicker(false);
      triggerFeedback('success', 'Avatar updated successfully!');
    } catch (err: any) {
      triggerFeedback('error', err.message || 'Failed to update avatar.');
    } finally {
      setIsSaving(false);
    }
  };

  // Save Name, Contact and Location to Firestore
  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      triggerFeedback('error', 'Display name cannot be empty');
      return;
    }

    setIsSaving(true);
    try {
      const latNum = parseFloat(latInput);
      const lngNum = parseFloat(lngInput);
      const locationData = (!isNaN(latNum) && !isNaN(lngNum)) 
        ? { lat: latNum, lng: lngNum } 
        : undefined;

      await updateProfile({
        name: nameInput.trim(),
        displayName: nameInput.trim(), // Keep both in sync for fallback
        username: usernameInput.trim(),
        contact: contactInput.trim(),
        contactType: contactTypeInput,
        location: locationData
      });

      triggerFeedback('success', 'Personal details saved successfully!');
      setTimeout(() => setActiveSection('menu'), 600);
    } catch (err: any) {
      triggerFeedback('error', err.message || 'Failed to save personal information.');
    } finally {
      setIsSaving(false);
    }
  };

  // Save Teaching and Wanted Skills to Firestore
  const handleSaveSkills = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateProfile({
        skillHave: skillHaveInput.trim(),
        skillWant: skillWantInput.trim()
      });
      triggerFeedback('success', 'Teaching and learning preferences updated!');
      setTimeout(() => setActiveSection('menu'), 600);
    } catch (err: any) {
      triggerFeedback('error', err.message || 'Failed to save skills preferences.');
    } finally {
      setIsSaving(false);
    }
  };

  // Detect location via GPS coordinates
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      triggerFeedback('error', 'Geolocation is not supported by your browser.');
      return;
    }
    setIsDetectingLoc(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatInput(position.coords.latitude.toFixed(6));
        setLngInput(position.coords.longitude.toFixed(6));
        setIsDetectingLoc(false);
        triggerFeedback('success', 'Location coordinates successfully loaded!');
      },
      (error) => {
        console.error("GPS detection failed:", error);
        setIsDetectingLoc(false);
        triggerFeedback('error', 'Could not fetch GPS coords. Enter coordinates manually.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  if (!profile) {
    return (
      <div className="py-32 flex flex-col items-center justify-center gap-3">
        <span className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">Constructing Profile</p>
      </div>
    );
  }

  // Determine avatar visual content (emoji text vs photo display)
  const isEmojiPhoto = profile.photoURL && !profile.photoURL.startsWith('http') && !profile.photoURL.startsWith('data:');

  return (
    <div className="min-h-[85vh] text-white flex flex-col items-center py-8 px-4 sm:px-6 relative">
      {/* Toast Feedback notifications */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className={`fixed top-20 z-50 px-5 py-3 rounded-2xl shadow-xl text-xs sm:text-sm font-semibold flex items-center gap-2 border ${
              feedback.type === 'success' 
                ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' 
                : 'bg-red-500/20 border-red-500/30 text-red-400'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-current animate-pulse mb-0.5" />
            {feedback.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-md flex flex-col">
        <AnimatePresence mode="wait">
          
          {/* ==================================================== */}
          {/* 1. MAIN PROFILE CARD VIEW                           */}
          {/* ==================================================== */}
          {activeSection === 'menu' && (
            <motion.div
              key="profile-menu"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col text-center"
            >
              {/* Avatar section with overlap edit pencil button */}
              <div className="relative self-center group mt-4">
                <div className="w-28 h-28 rounded-full overflow-hidden bg-zinc-900/40 border border-white/5 shadow-inner flex items-center justify-center relative select-none">
                  {isEmojiPhoto ? (
                    <span id="profile_avatar_emoji" className="text-5xl select-none leading-none pt-1">
                      {profile.photoURL}
                    </span>
                  ) : (
                    <img 
                      id="profile_avatar_img"
                      src={profile.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user?.uid}`} 
                      alt={profile.displayName || 'Profile'}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                
                {/* Pencil overlap button */}
                <button
                  onClick={() => setShowAvatarPicker(true)}
                  className="absolute bottom-0 right-0 bg-white hover:bg-zinc-200 text-zinc-900 p-2 rounded-full border border-zinc-200/50 hover:scale-110 active:scale-95 shadow-md transition-all duration-200 cursor-pointer flex items-center justify-center"
                  title="Change avatar emoji"
                  id="btn_edit_avatar"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>

              {/* Display Name */}
              <h2 id="profile_name" className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-5">
                {profile.name || profile.displayName}
              </h2>

              {/* Email representation with mail icon */}
              <div id="profile_email_container" className="text-zinc-500 text-xs sm:text-sm mt-1.5 flex items-center justify-center gap-1.5">
                <Mail className="w-4 h-4 text-zinc-600 mb-0.5" />
                <span id="profile_email_text">{profile.email}</span>
              </div>

              {/* Two Column Metric Dashboard Cards */}
              <div className="grid grid-cols-2 gap-4 mt-8">
                {/* Card A: Skill Coins */}
                <div 
                  id="card_skill_coins"
                  onClick={() => navigate('/coin-store')}
                  className="bg-zinc-900/40 border border-white/5 rounded-3xl p-5 py-6 flex flex-col items-center justify-center text-center gap-1 hover:bg-zinc-900/60 transition-colors duration-300 cursor-pointer group relative overflow-hidden"
                >
                  <Coins className="w-6 h-6 text-yellow-500 group-hover:scale-110 transition-transform duration-300" />
                  <span id="coins_count" className="text-3xl font-extrabold text-white mt-1.5">
                    {profile.coins ?? 50}
                  </span>
                  <span className="text-[9px] tracking-widest text-zinc-500 font-mono font-extrabold uppercase mt-1">
                    Skill Coins
                  </span>
                </div>

                {/* Card B: Average Rating */}
                <div 
                  id="card_rating"
                  className="bg-zinc-900/40 border border-white/5 rounded-3xl p-5 py-6 flex flex-col items-center justify-center text-center gap-1 group relative overflow-hidden"
                >
                  <Star className="w-6 h-6 text-emerald-400 fill-emerald-400 group-hover:scale-110 transition-transform duration-300" />
                  <span id="avg_rating_display" className="text-3xl font-extrabold text-white mt-1.5">
                    {avgRating}
                  </span>
                  <span className="text-[9px] tracking-widest text-zinc-500 font-mono font-extrabold uppercase mt-1">
                    {reviewsCount > 0 ? `${reviewsCount} Ratings` : 'Average Rating'}
                  </span>
                </div>
              </div>

              {/* Settings list header */}
              <div className="mt-10 mb-3 text-left">
                <span className="text-[9px] tracking-wider text-zinc-500 font-mono font-bold uppercase">
                  Profile Settings
                </span>
              </div>

              {/* Settings Rows */}
              <div className="flex flex-col gap-3">
                
                {/* 1. Personal Information */}
                <button
                  id="item_personal_info"
                  onClick={() => setActiveSection('personal')}
                  className="bg-zinc-900/30 border border-white/5 hover:bg-zinc-900/60 px-5 py-4.5 rounded-[1.5rem] flex items-center justify-between transition-all duration-300 group cursor-pointer text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 group-hover:text-white transition-colors">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">Personal Information</h4>
                      <p className="text-xs text-zinc-500 mt-0.5">Name, contact, and location</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400 group-hover:translate-x-1 transition-all" />
                </button>

                {/* 2. Skills & Preferences */}
                <button
                  id="item_skills_prefs"
                  onClick={() => setActiveSection('skills')}
                  className="bg-zinc-900/30 border border-white/5 hover:bg-zinc-900/60 px-5 py-4.5 rounded-[1.5rem] flex items-center justify-between transition-all duration-300 group cursor-pointer text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 group-hover:text-white transition-colors">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">Skills & Preferences</h4>
                      <p className="text-xs text-zinc-500 mt-0.5">What you teach and want to learn</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400 group-hover:translate-x-1 transition-all" />
                </button>

                {/* Red accent Logout card */}
                <button
                  id="item_logout"
                  onClick={handleLogout}
                  className="bg-red-500/10 border border-red-500/20 hover:bg-red-500/15 px-5 py-4.5 rounded-[1.5rem] flex items-center gap-4 transition-all duration-300 cursor-pointer text-left mt-4"
                >
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
                    <LogOut className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-red-400">Log Out</h4>
                    <p className="text-xs text-red-500/65 mt-0.5">Sign out of your Allun account</p>
                  </div>
                </button>
              </div>

              {/* Developer options */}
              {user?.email === 'ayushless0211@gmail.com' && (
                <div className="mt-12 pt-6 border-t border-white/5 flex flex-col items-center gap-4">
                  <span className="text-[8px] font-mono tracking-widest text-zinc-600 uppercase">
                    Developer Options
                  </span>
                  
                  <div className="flex items-center gap-3 bg-zinc-900/20 border border-white/5 rounded-2xl p-3.5 w-full justify-between">
                    <div className="flex items-center gap-2.5">
                      <ShieldAlert className="w-4 h-4 text-zinc-500" />
                      <div className="text-left text-xs">
                        <p className="text-zinc-400 font-medium">Toggle System Access</p>
                        <p className="text-[10px] text-zinc-500 capitalize">{profile.role} account</p>
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        await toggleAdminRole();
                        triggerFeedback('success', 'User access role toggled successfully!');
                      }}
                      className="bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-lg text-[10px] font-bold text-white transition-colors cursor-pointer"
                    >
                      Set as {profile.role === 'admin' ? 'Student' : 'Admin'}
                    </button>
                  </div>
                </div>
              )}

            </motion.div>
          )}

          {/* ==================================================== */}
          {/* 2. PERSONAL INFORMATION EDIT VIEW                   */}
          {/* ==================================================== */}
          {activeSection === 'personal' && (
            <motion.div
              key="personal-form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="w-full"
            >
              <div className="flex items-center gap-3 mb-8">
                <button 
                  onClick={() => setActiveSection('menu')}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors cursor-pointer text-zinc-400 hover:text-white"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-2xl font-bold tracking-tight">Personal Information</h1>
              </div>

              <form onSubmit={handleSavePersonal} className="space-y-6 text-left">
                {/* Full Name */}
                <div className="space-y-2">
                  <label className="text-[10px] text-zinc-500 font-mono uppercase font-black tracking-wider block">
                    Full Name
                  </label>
                  <input 
                    type="text" 
                    required
                    placeholder="Enter your display name..."
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="w-full bg-zinc-900/60 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition"
                  />
                </div>

                {/* Username */}
                <div className="space-y-2">
                  <label className="text-[10px] text-zinc-500 font-mono uppercase font-black tracking-wider block">
                    Username
                  </label>
                  <input 
                    type="text" 
                    placeholder="Enter a unique username..."
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    className="w-full bg-zinc-900/60 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition"
                  />
                </div>

                {/* Contact Detail */}
                <div className="space-y-2">
                  <label className="text-[10px] text-zinc-500 font-mono uppercase font-black tracking-wider block">
                    Contact Target
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. hello@example.com or WhatsApp number"
                    value={contactInput}
                    onChange={(e) => setContactInput(e.target.value)}
                    className="w-full bg-zinc-900/60 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition"
                  />
                </div>

                {/* Contact Type Toggle */}
                <div className="space-y-2">
                  <label className="text-[10px] text-zinc-500 font-mono uppercase font-black tracking-wider block">
                    Preferred Contact Channel
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setContactTypeInput('email')}
                      className={`py-3 rounded-2xl border text-xs font-semibold cursor-pointer transition ${
                        contactTypeInput === 'email'
                          ? 'bg-white border-white text-zinc-900'
                          : 'bg-transparent border-white/10 text-zinc-400 hover:bg-white/5'
                      }`}
                    >
                      Email Channel
                    </button>
                    <button
                      type="button"
                      onClick={() => setContactTypeInput('whatsapp')}
                      className={`py-3 rounded-2xl border text-xs font-semibold cursor-pointer transition ${
                        contactTypeInput === 'whatsapp'
                          ? 'bg-white border-white text-zinc-900'
                          : 'bg-transparent border-white/10 text-zinc-400 hover:bg-white/5'
                      }`}
                    >
                      WhatsApp Channel
                    </button>
                  </div>
                </div>

                {/* Location Coordinates block with auto detect */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] text-zinc-500 font-mono uppercase font-black tracking-wider">
                      Location Gps Coordinates
                    </label>
                    <button
                      type="button"
                      onClick={handleDetectLocation}
                      disabled={isDetectingLoc}
                      className="text-[10px] text-emerald-400 hover:text-emerald-350 flex items-center gap-1 font-mono font-bold uppercase transition disabled:opacity-50"
                    >
                      <Navigation className="w-3 h-3" />
                      {isDetectingLoc ? 'Detecting...' : 'Auto-Detect GL'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <input 
                        type="number" 
                        step="any"
                        placeholder="Latitude coord"
                        value={latInput}
                        onChange={(e) => setLatInput(e.target.value)}
                        className="w-full bg-zinc-900/60 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-white transition"
                      />
                    </div>
                    <div>
                      <input 
                        type="number" 
                        step="any"
                        placeholder="Longitude coord"
                        value={lngInput}
                        onChange={(e) => setLngInput(e.target.value)}
                        className="w-full bg-zinc-900/60 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-white transition"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-zinc-500 font-sans italic mt-1 leading-relaxed">
                    Latitude and Longitude values are used to show you to other members on the interactive map.
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setActiveSection('menu')}
                    className="flex-1 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 font-semibold py-3.5 rounded-2xl text-xs sm:text-sm transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 bg-white hover:bg-zinc-200 text-zinc-900 font-bold py-3.5 rounded-2xl text-xs sm:text-sm shadow-md transition cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? 'Saving Changes...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* ==================================================== */}
          {/* 3. SKILLS & PREFERENCES EDIT VIEW                   */}
          {/* ==================================================== */}
          {activeSection === 'skills' && (
            <motion.div
              key="skills-form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="w-full"
            >
              <div className="flex items-center gap-3 mb-8">
                <button 
                  onClick={() => setActiveSection('menu')}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors cursor-pointer text-zinc-400 hover:text-white"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-2xl font-bold tracking-tight">Skills & Preferences</h1>
              </div>

              <form onSubmit={handleSaveSkills} className="space-y-6 text-left">
                {/* Skills Can Teach */}
                <div className="space-y-2">
                  <label className="text-[10px] text-zinc-500 font-mono uppercase font-black tracking-wider block">
                    Skills You Can Teach
                  </label>
                  <textarea 
                    rows={3}
                    placeholder="e.g. Physics, Calculus, Spanish lessons, Web Development..."
                    value={skillHaveInput}
                    onChange={(e) => setSkillHaveInput(e.target.value)}
                    className="w-full bg-zinc-900/60 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition"
                  />
                  <p className="text-[10px] text-zinc-500">
                    Separate subjects with commas. This identifies what matches you show up in!
                  </p>
                </div>

                {/* Skills Want To Learn */}
                <div className="space-y-2">
                  <label className="text-[10px] text-zinc-500 font-mono uppercase font-black tracking-wider block">
                    Skills You Want To Learn
                  </label>
                  <textarea 
                    rows={3}
                    placeholder="e.g. Classical Guitar, Pottery, Python, Japanese..."
                    value={skillWantInput}
                    onChange={(e) => setSkillWantInput(e.target.value)}
                    className="w-full bg-zinc-900/60 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition"
                  />
                  <p className="text-[10px] text-zinc-500">
                    We match you automatically with peers who teach what you list here.
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setActiveSection('menu')}
                    className="flex-1 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 font-semibold py-3.5 rounded-2xl text-xs sm:text-sm transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 bg-white hover:bg-zinc-200 text-zinc-900 font-bold py-3.5 rounded-2xl text-xs sm:text-sm shadow-md transition cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? 'Saving Changes...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ==================================================== */}
      {/* 4. MODAL/OVERLAY EMOJI AVATAR PICKER                 */}
      {/* ==================================================== */}
      <AnimatePresence>
        {showAvatarPicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop blurring ambient layer */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAvatarPicker(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            {/* Modal Dialog container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              className="bg-zinc-950 border border-white/10 rounded-[2rem] w-full max-w-sm p-6 sm:p-8 relative z-10 shadow-2xl overflow-hidden flex flex-col"
            >
              <h3 className="text-xl font-bold tracking-tight text-left mb-2 text-white">
                Choose Avatar Emoji
              </h3>
              <p className="text-zinc-500 text-left text-xs mb-6">
                Pick an emoji face or submit a custom one to style your avatar representation.
              </p>

              {/* Grid of default beautiful presets */}
              <div className="grid grid-cols-6 gap-2 mt-2">
                {EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => handleSelectAvatar(emoji)}
                    className="aspect-square text-3xl flex items-center justify-center hover:bg-white/10 rounded-2xl cursor-pointer active:scale-95 transition"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Custom Input */}
              <div className="space-y-2 mt-6 text-left">
                <label className="text-[9px] text-zinc-500 font-mono uppercase font-black tracking-wider block">
                  Or use standard custom image URL or single character
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Paste URL or type emoji..."
                    value={customEmojiInput}
                    onChange={(e) => setCustomEmojiInput(e.target.value)}
                    className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      if (customEmojiInput.trim()) {
                        handleSelectAvatar(customEmojiInput.trim());
                      }
                    }}
                    className="bg-white text-zinc-950 px-3.5 rounded-xl text-xs font-bold transition hover:bg-zinc-200 active:scale-95 cursor-pointer"
                  >
                    Set
                  </button>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setShowAvatarPicker(false)}
                className="mt-6 w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-semibold cursor-pointer transition"
              >
                Close Picker
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
