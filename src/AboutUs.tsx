import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Code, Heart, Zap, Globe, Rocket } from 'lucide-react';

export default function AboutUs() {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto pb-20 px-4 sm:px-6">
      <div className="flex items-center gap-4 mb-12">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      <div className="relative">
        {/* Background glow effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-white/5 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-[250px] h-[250px] bg-white/5 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="text-center mb-16 relative z-10">
          <div className="inline-flex items-center justify-center p-3 bg-white/5 rounded-2xl mb-6 border border-white/10 shadow-xl backdrop-blur-md">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-5xl sm:text-7xl font-black tracking-tighter mb-6 bg-gradient-to-br from-white via-white/90 to-white/40 bg-clip-text text-transparent">
            Crafted by <span className="text-white">AyushLess</span>
          </h1>
          <p className="text-xl text-white/60 max-w-2xl mx-auto font-light leading-relaxed">
            We believe that everyone has something valuable to teach, and everyone has something wonderful to learn. Our mission is to connect curious minds globally.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          <div className="bg-white/[0.02] border border-white/10 p-8 rounded-3xl backdrop-blur-md hover:bg-white/[0.04] transition-colors group">
            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Code className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-3 text-white/90">The Vision</h3>
            <p className="text-white/50 leading-relaxed">
              Built from the ground up to break down the barriers of traditional education. We envision a world where skills are currency, and knowledge flows freely between passionate individuals.
            </p>
          </div>

          <div className="bg-white/[0.02] border border-white/10 p-8 rounded-3xl backdrop-blur-md hover:bg-white/[0.04] transition-colors group">
            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-3 text-white/90">Community First</h3>
            <p className="text-white/50 leading-relaxed">
              Every feature, from the scheduling system to the real-time video calls, is designed to foster genuine human connection and mutual growth.
            </p>
          </div>

          <div className="bg-white/[0.02] border border-white/10 p-8 rounded-3xl backdrop-blur-md hover:bg-white/[0.04] transition-colors group">
            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-3 text-white/90">Global Reach</h3>
            <p className="text-white/50 leading-relaxed">
              Whether you're in Tokyo learning Spanish, or in Brazil teaching Python, our platform bridges the geographical gap instantly.
            </p>
          </div>

          <div className="bg-white/[0.02] border border-white/10 p-8 rounded-3xl backdrop-blur-md hover:bg-white/[0.04] transition-colors group">
            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Rocket className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-3 text-white/90">Future Ready</h3>
            <p className="text-white/50 leading-relaxed">
              Constantly evolving. We're always tinkering, always improving, and always listening to our community to build the ultimate skill-sharing ecosystem.
            </p>
          </div>
        </div>

        <div className="mt-20 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-full backdrop-blur-md">
            <Zap className="w-4 h-4 text-white" />
            <span className="text-sm font-medium text-white/70">Powered by passion. Built by AyushLess.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
