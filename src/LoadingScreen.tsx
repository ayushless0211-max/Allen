import React from 'react';

export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white font-sans">
      <div className="relative flex items-center justify-center">
        {/* Ambient background aura glow */}
        <div className="absolute w-44 h-44 bg-white/5 rounded-full blur-2xl animate-pulse" />
        <div className="absolute w-32 h-32 bg-emerald-500/5 rounded-full blur-xl" />

        {/* 3D Rotating Globe Container */}
        <div className="relative w-28 h-28 rounded-full overflow-hidden border border-white/20 shadow-[inset_0_4px_12px_rgba(255,255,255,0.15),0_10px_25px_-5px_rgba(0,0,0,0.7)] flex items-center justify-center">
          
          {/* Globe grid wrapper carrying the horizontal scroll */}
          <div className="absolute inset-0 w-[200%] h-full flex animate-[globe-rotate_6s_linear_infinite] opacity-60">
            {/* First Segment */}
            <svg className="w-1/2 h-full shrink-0" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="0.5">
              {/* Grid Latitudes */}
              <path d="M 0,20 H 100 M 0,35 H 100 M 0,50 H 100 M 0,65 H 100 M 0,80 H 100" className="stroke-white/10" />
              {/* Grid Longitudes/Meridians */}
              <path d="M 12.5,0 C 12.5,0 12.5,100 12.5,100" className="stroke-white/5" />
              <path d="M 25,0 C 25,0 25,100 25,100" className="stroke-white/5" />
              <path d="M 37.5,0 C 37.5,0 37.5,100 37.5,100" className="stroke-white/5" />
              <path d="M 50,0 C 50,0 50,100 50,100" className="stroke-white/10" />
              <path d="M 62.5,0 C 62.5,0 62.5,100 62.5,100" className="stroke-white/5" />
              <path d="M 75,0 C 75,0 75,100 75,100" className="stroke-white/5" />
              <path d="M 87.5,0 C 87.5,0 87.5,100 87.5,100" className="stroke-white/5" />
              {/* Stylized continent vectors for premium details */}
              <path d="M 10,25 Q 15,20 25,18 T 35,28 T 45,22 T 30,35 Z" fill="rgba(255,255,255,0.08)" stroke="none" />
              <path d="M 55,45 Q 65,35 75,40 T 85,55 T 60,65 Z" fill="rgba(255,255,255,0.08)" stroke="none" />
              <path d="M 15,65 Q 25,70 30,60 T 45,75 T 25,85 Z" fill="rgba(255,255,255,0.08)" stroke="none" />
              <path d="M 70,15 Q 75,25 85,20 T 90,10 Z" fill="rgba(255,255,255,0.08)" stroke="none" />
            </svg>
            {/* Second identical Segment to create infinite wrapping seam */}
            <svg className="w-1/2 h-full shrink-0" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="0.5">
              {/* Grid Latitudes */}
              <path d="M 0,20 H 100 M 0,35 H 100 M 0,50 H 100 M 0,65 H 100 M 0,80 H 100" className="stroke-white/10" />
              {/* Grid Longitudes */}
              <path d="M 12.5,0 C 12.5,0 12.5,100 12.5,100" className="stroke-white/5" />
              <path d="M 25,0 C 25,0 25,100 25,100" className="stroke-white/5" />
              <path d="M 37.5,0 C 37.5,0 37.5,100 37.5,100" className="stroke-white/5" />
              <path d="M 50,0 C 50,0 50,100 50,100" className="stroke-white/10" />
              <path d="M 62.5,0 C 62.5,0 62.5,100 62.5,100" className="stroke-white/5" />
              <path d="M 75,0 C 75,0 75,100 75,100" className="stroke-white/5" />
              <path d="M 87.5,0 C 87.5,0 87.5,100 87.5,100" className="stroke-white/5" />
              {/* Stylized continent vectors */}
              <path d="M 10,25 Q 15,20 25,18 T 35,28 T 45,22 T 30,35 Z" fill="rgba(255,255,255,0.08)" stroke="none" />
              <path d="M 55,45 Q 65,35 75,40 T 85,55 T 60,65 Z" fill="rgba(255,255,255,0.08)" stroke="none" />
              <path d="M 15,65 Q 25,70 30,60 T 45,75 T 25,85 Z" fill="rgba(255,255,255,0.08)" stroke="none" />
              <path d="M 70,15 Q 75,25 85,20 T 90,10 Z" fill="rgba(255,255,255,0.08)" stroke="none" />
            </svg>
          </div>

          {/* Curved latitude overlays (to enforce perspective sphere contours) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="0.5">
            <ellipse cx="50" cy="50" rx="49" ry="22" className="stroke-white/10" />
            <ellipse cx="50" cy="50" rx="49" ry="38" className="stroke-white/10" />
            <line x1="1" y1="50" x2="99" y2="50" className="stroke-white/15" />
          </svg>

          {/* Core circular outlines and 3D lighting shadow layers */}
          <div className="absolute inset-0 rounded-full bg-gradient-radial-shade pointer-events-none" />
          
          {/* Glass sheen highlight reflection on sphere rim */}
          <div className="absolute top-1 left-1 right-1 h-1/2 rounded-t-full bg-gradient-to-b from-white/15 to-transparent filter blur-[0.5px]" />
          <div className="absolute bottom-1 right-2 w-6 h-6 rounded-full bg-emerald-500/5 filter blur-sm" />
        </div>
      </div>
      
      <p className="mt-8 text-white/40 tracking-[0.25em] text-xs uppercase font-bold animate-pulse">
        Connecting
      </p>

      {/* Embedded CSS animation for horizontal loop scroll */}
      <style>{`
        @keyframes globe-rotate {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
        .bg-gradient-radial-shade {
          background: radial-gradient(circle at 35% 25%, rgba(255,255,255,0.15) 0%, rgba(5,5,5,0.4) 60%, rgba(0,0,0,0.95) 100%);
        }
      `}</style>
    </div>
  );
}
