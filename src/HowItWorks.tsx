import React from 'react';
import { MessageSquare, Video, MonitorUp, Users, ArrowRight, Sparkles, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function HowItWorks() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-white/20 relative overflow-hidden">
      {/* Background Glow */}
      <div className="fixed top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-white/[0.08] to-transparent blur-[120px] pointer-events-none rounded-full z-0" />

      {/* Navbar */}
      <nav className="fixed top-0 w-full border-b border-white/5 bg-[#050505]/80 backdrop-blur-2xl z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <button 
            onClick={() => navigate(user ? '/dashboard' : '/')}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-black">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-xl font-semibold tracking-tight hidden sm:block">Allun</span>
          </button>
          
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>
      </nav>

      <main className="pt-32 pb-24 px-6 max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 mb-6">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight text-white mb-6">
            How Allun Works
          </h1>
          <p className="text-xl text-white/60 max-w-2xl mx-auto leading-relaxed">
            Trade skills, not money. Connect with professionals worldwide to exchange knowledge through chat, video calls, and screen sharing.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-12 relative before:absolute before:inset-0 before:ml-8 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
          
          {/* Step 1 */}
          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-16 h-16 rounded-full border-4 border-[#050505] bg-white/10 text-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-xl z-10">
              <Users className="w-6 h-6" />
            </div>
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-6 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors ml-6 md:ml-0">
              <div className="text-emerald-400 text-sm font-bold tracking-widest uppercase mb-2">Step 1</div>
              <h3 className="text-2xl font-medium text-white mb-3">Find Your Match</h3>
              <p className="text-white/60 leading-relaxed">
                Discover people who have the skills you want to learn, and who want to learn the skills you already have. It's a perfect 1-to-1 exchange.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-16 h-16 rounded-full border-4 border-[#050505] bg-white/10 text-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-xl z-10">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-6 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors ml-6 md:ml-0">
              <div className="text-emerald-400 text-sm font-bold tracking-widest uppercase mb-2">Step 2</div>
              <h3 className="text-2xl font-medium text-white mb-3">Connect & Chat</h3>
              <p className="text-white/60 leading-relaxed">
                Break the ice using our built-in real-time chat. Discuss your goals, set expectations, and schedule a time for your skill exchange session.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-16 h-16 rounded-full border-4 border-[#050505] bg-white/10 text-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-xl z-10">
              <Video className="w-6 h-6" />
            </div>
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-6 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors ml-6 md:ml-0">
              <div className="text-emerald-400 text-sm font-bold tracking-widest uppercase mb-2">Step 3</div>
              <h3 className="text-2xl font-medium text-white mb-3">Video Call & Screen Share</h3>
              <p className="text-white/60 leading-relaxed">
                Jump into a high-quality video call directly from the chat. Share your screen to provide hands-on guidance, review code, or demonstrate techniques live.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-16 h-16 rounded-full border-4 border-[#050505] bg-white/10 text-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-xl z-10">
              <MonitorUp className="w-6 h-6" />
            </div>
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-6 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors ml-6 md:ml-0">
              <div className="text-emerald-400 text-sm font-bold tracking-widest uppercase mb-2">Step 4</div>
              <h3 className="text-2xl font-medium text-white mb-3">Grow Together</h3>
              <p className="text-white/60 leading-relaxed">
                Learn at your own pace while helping someone else achieve their goals. Build your network and level up your career without spending a dime.
              </p>
            </div>
          </div>

        </div>

        {/* CTA */}
        <div className="mt-20 text-center">
          <button 
            onClick={() => navigate(user ? '/dashboard' : '/')}
            className="inline-flex items-center gap-2 bg-white text-black px-8 py-4 rounded-full text-lg font-semibold hover:scale-105 transition-transform shadow-xl shadow-white/10 cursor-pointer"
          >
            {user ? 'Start Exploring' : 'Get Started'}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </main>
    </div>
  );
}
