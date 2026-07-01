import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Send } from 'lucide-react';
import { useAuth } from './AuthContext';

export default function PaymentVerification() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const telegramId = 'kmr_2011';
  
  const userEmailText = user?.email ? `\n\nMy email is: ${user.email}` : '';
  const message = `I made the Payment Please grant Lifetime Access Here is the screenshot.${userEmailText}`;
  const telegramUrl = `https://t.me/${telegramId}?text=${encodeURIComponent(message)}`;

  return (
    <div className="flex flex-col items-center justify-center p-6 min-h-[70vh] w-full max-w-lg mx-auto">
      <button 
        onClick={() => navigate(-1)} 
        className="self-start mb-6 text-zinc-400 hover:text-white flex items-center gap-2 text-sm uppercase tracking-widest font-bold transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="bg-zinc-950 border border-[#0088cc]/30 rounded-[2rem] p-8 w-full shadow-2xl relative overflow-hidden text-center">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150%] aspect-square bg-[#0088cc]/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2" />
        
        <div className="relative z-10 space-y-6">
          <div className="w-16 h-16 bg-[#0088cc]/20 text-[#0088cc] mx-auto rounded-full flex items-center justify-center border border-[#0088cc]/30">
            <MessageCircle className="w-8 h-8" />
          </div>
          
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-white tracking-tight">Verify Payment</h2>
            <p className="text-zinc-300 leading-relaxed text-sm">
              Please send a text message on Telegram with the screenshot of your payment. Within 10 minutes, you will be granted lifetime access.
            </p>
          </div>

          <div className="bg-black/40 p-4 rounded-xl border border-white/5 inline-block w-full">
            <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-1">Telegram ID</p>
            <p className="text-[#0088cc] font-mono font-bold text-lg">@{telegramId}</p>
          </div>

          <div className="pt-4">
            <a
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-[#0088cc] hover:bg-[#0077b3] text-white font-bold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#0088cc]/20"
            >
              <Send className="w-5 h-5" /> Message on Telegram
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
