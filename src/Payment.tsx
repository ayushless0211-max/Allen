import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import { CourseBatch } from './types';
import { SAMPLE_BATCHES } from './Dashboard';
import { Smartphone, ArrowRight, ArrowLeft } from 'lucide-react';

export default function Payment() {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const [batch, setBatch] = useState<CourseBatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [upiError, setUpiError] = useState(false);

  useEffect(() => {
    if (!batchId) return;
    const fetchBatch = async () => {
      try {
        const docRef = doc(db, 'batches', batchId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setBatch({ id: docSnap.id, ...docSnap.data() } as CourseBatch);
        } else {
          const seed = SAMPLE_BATCHES.find(b => b.id === batchId);
          setBatch(seed || null);
        }
      } catch (error) {
        const seed = SAMPLE_BATCHES.find(b => b.id === batchId);
        setBatch(seed || null);
      } finally {
        setLoading(false);
      }
    };
    fetchBatch();
  }, [batchId]);

  if (loading) {
    return (
      <div className="py-32 flex flex-col items-center justify-center gap-3">
        <span className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">Loading Payment...</p>
      </div>
    );
  }

  if (!batch) {
    return <div className="text-white text-center p-8">Batch not found.</div>;
  }

  const upiId = "ayushless0211@okicici";
  const upiUrl = `upi://pay?pa=${upiId}&pn=Ayush&am=${batch.price}&cu=INR`;

  const handlePay = () => {
    // Attempt to open UPI deep link
    window.location.href = upiUrl;
    
    // Set a timeout to check if the app went to background.
    // If the browser doesn't switch to a UPI app, this timeout will fire while the user is still on the page.
    setTimeout(() => {
      setUpiError(true);
    }, 2000);
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 min-h-[70vh] w-full max-w-lg mx-auto">
      <div className="bg-zinc-950 border border-white/10 rounded-[2rem] p-8 w-full shadow-2xl relative overflow-hidden">
        
        <div className="relative z-10 space-y-8 text-center">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white tracking-tight">Secure Payment</h2>
            <p className="text-sm text-zinc-400">Scan QR or Pay directly via UPI</p>
          </div>

          <div className="bg-white p-6 rounded-2xl mx-auto inline-block border-4 border-white/10">
            <QRCode value={upiUrl} size={200} />
          </div>

          <div className="bg-black/50 p-4 rounded-xl border border-white/10 space-y-1">
            <p className="text-sm text-zinc-400">UPI ID: <span className="text-white font-mono">{upiId}</span></p>
            <p className="text-sm text-zinc-400">Amount: <span className="text-white font-bold text-lg">₹{batch.price}</span></p>
          </div>

          <div className="space-y-3 pt-4">
            <button
              onClick={handlePay}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-4 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <Smartphone className="w-5 h-5" /> Pay Now with UPI App
            </button>

            {upiError && (
              <p className="text-rose-400 text-xs mt-2 bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">
                No UPI apps found. Please try scanning the QR code from a different device.
              </p>
            )}
          </div>
          
          <div className="pt-6 border-t border-white/10 space-y-4">
            <p className="text-xs text-zinc-500">Already made the payment?</p>
            <button
              onClick={() => navigate('/payment-verification')}
              className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-3 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 text-sm"
            >
              Verify Payment <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
