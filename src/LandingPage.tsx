import React, { useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { auth, googleProvider } from './firebase';
import { signInWithPopup } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import LoadingScreen from './LoadingScreen';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (user && !loading) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/dashboard');
    } catch (error) {
      console.error('Error signing in:', error);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen text-white font-sans selection:bg-white/20 relative overflow-hidden flex flex-col">
      {/* Video Background */}
      <div className="fixed inset-0 z-0 overflow-hidden bg-black pointer-events-none">
        <video
          src="https://cdn.pixabay.com/video/2020/05/25/40141-424168018_large.mp4"
          autoPlay
          muted
          loop
          playsInline
          className="absolute top-1/2 left-1/2 w-[100vw] h-[56.25vw] min-h-[100vh] min-w-[177.77vh] -translate-x-1/2 -translate-y-1/2 opacity-30 object-cover scale-110"
        />
      </div>
      
      {/* Dark Overlay for Readability */}
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-[#050505]/90 via-[#050505]/60 to-[#050505]/90 pointer-events-none" />

      {/* Background Glow */}
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-white/[0.08] to-transparent blur-[120px] pointer-events-none rounded-full z-0" />

      {/* Navbar */}
      <nav className="fixed top-0 w-full border-b border-white/5 bg-[#050505]/80 backdrop-blur-2xl z-40">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-black">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-xl font-semibold tracking-tight">Allun</span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/how-it-works')}
              className="text-white/70 hover:text-white text-sm font-medium transition-colors cursor-pointer hidden sm:block"
            >
              How it Works
            </button>
            <button 
              onClick={handleLogin}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-full text-sm font-medium transition-all cursor-pointer"
            >
              <span>Sign In / Sign Up</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center px-6 relative z-10 pt-24">
        <div className="max-w-3xl text-center">
          <h1 className="text-6xl sm:text-7xl md:text-[7rem] font-medium tracking-tighter leading-[0.9] mb-8">
            Rob The Rich.<br/>
            <span className="text-white/30">Feed The Poor.</span>
          </h1>
          <p className="text-xl md:text-2xl text-white/50 max-w-xl mx-auto leading-relaxed font-light tracking-tight mb-12">
            Join a curated network of professionals exchanging knowledge. Find what you need, teach what you know.
          </p>
          <button 
            onClick={handleLogin}
            className="bg-white text-black px-10 py-5 rounded-full text-lg font-semibold hover:scale-105 transition-transform cursor-pointer"
          >
            Get Started for Free
          </button>
        </div>
      </main>
    </div>
  );
}
