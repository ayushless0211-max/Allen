import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { BookOpen, User, ShieldAlert, ChevronLeft, Sparkles, MessageCircle } from 'lucide-react';

export default function Layout() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine current active navigation tab
  const getActiveTab = () => {
    if (location.pathname === '/' || location.pathname === '/dashboard') return 'courses';
    if (location.pathname.startsWith('/profile')) return 'profile';
    if (location.pathname.startsWith('/admin')) return 'admin';
    if (location.pathname.startsWith('/chat')) return 'chat';
    return '';
  };

  const activeTab = getActiveTab();

  // Do not show fixed navigation dock or header on the public Landing Page and How It Works page
  const isAppView = location.pathname !== '/' && location.pathname !== '/how-it-works';

  if (!isAppView) {
    return (
      <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-white/20 overflow-x-hidden antialiased">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans overflow-x-hidden antialiased flex flex-col">
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 w-full border-b border-white/5 bg-[#050505]/80 backdrop-blur-2xl z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {location.pathname !== '/dashboard' && (
              <button 
                id="back_btn"
                onClick={() => navigate('/dashboard')} 
                className="p-2 mr-2 rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all flex items-center justify-center cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
              <div className="bg-emerald-500 rounded-lg p-1.5 hidden sm:block">
                <Sparkles className="w-4 h-4 text-black" fill="currentColor" />
              </div>
              <span className="text-xl font-semibold tracking-tight">Allun</span>
            </div>
          </div>

          <div className="flex items-center gap-6 sm:gap-8">
            <button 
              id="nav_courses"
              onClick={() => navigate('/dashboard')}
              className={`flex items-center text-base sm:text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'courses' ? 'text-white' : 'text-zinc-500 hover:text-white'
              }`}
            >
              <BookOpen className="w-6 h-6 sm:hidden" />
              <span className="hidden sm:block">Browse Courses</span>
            </button>

            <button 
              id="nav_chat"
              onClick={() => navigate('/chat')}
              className={`flex items-center text-base sm:text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'chat' ? 'text-white' : 'text-zinc-500 hover:text-white'
              }`}
            >
              <MessageCircle className="w-6 h-6 sm:hidden" />
              <span className="hidden sm:block">Chat</span>
            </button>

            {profile?.role === 'admin' && user?.email === 'ayushless0211@gmail.com' && (
              <button 
                id="nav_admin"
                onClick={() => navigate('/admin')}
                className={`flex items-center text-base sm:text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === 'admin' ? 'text-white' : 'text-zinc-500 hover:text-white'
                }`}
              >
                <ShieldAlert className="w-6 h-6 sm:hidden" />
                <span className="hidden sm:block">Admin</span>
              </button>
            )}

            <button 
              id="nav_profile"
              onClick={() => navigate('/profile')}
              className={`flex items-center text-base sm:text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'profile' ? 'text-white' : 'text-zinc-500 hover:text-white'
              }`}
            >
              <User className="w-6 h-6 sm:hidden" />
              <span className="hidden sm:block">{user ? 'My Profile' : 'Sign In'}</span>
            </button>
          </div>
        </div>
      </nav>

      {/* CORE VIEWPORT */}
      <main className="flex-1 w-full flex flex-col relative pt-4 pb-20">
        <Outlet />
      </main>
    </div>
  );
}
