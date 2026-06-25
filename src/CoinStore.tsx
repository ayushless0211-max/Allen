import React, { useState } from "react";
import { X, Coins, CreditCard, Sparkles, Check } from "lucide-react";
import { useAuth } from "./AuthContext";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

interface CoinStoreProps {
  onClose: () => void;
}

const PACKAGES = [
  { id: "starter", coins: 100, price: 399, popular: false },
  { id: "pro", coins: 500, price: 1599, popular: true },
  { id: "expert", coins: 1200, price: 3199, popular: false },
];

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function CoinStore({ onClose }: CoinStoreProps) {
  const { user, profile } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handlePurchase = async (pkg: (typeof PACKAGES)[0]) => {
    if (!user || isProcessing) return;

    setIsProcessing(true);

    try {
      // Create order on the server
      const response = await fetch("/api/create-razorpay-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount: pkg.price }),
      });

      if (!response.ok) {
        throw new Error("Failed to create order");
      }

      const order = await response.json();

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_live_SP1moeTEpMdwF7",
        amount: order.amount,
        currency: order.currency,
        name: "SkiliSwap",
        description: `Purchase ${pkg.coins} Coins`,
        order_id: order.id,
        handler: async function (response: any) {
          try {
            const userRef = doc(db, "users", user.uid);
            const currentCoins = profile?.coins ?? 50;

            await updateDoc(userRef, {
              coins: currentCoins + pkg.coins,
            });

            setSuccessMessage(`Successfully added ${pkg.coins} coins!`);

            setTimeout(() => {
              setSuccessMessage("");
              onClose();
            }, 2000);
          } catch (err) {
            console.error("Error updating coins:", err);
            alert(
              "Payment successful but failed to update coins. Please contact support.",
            );
          }
        },
        prefill: {
          name: profile?.name || user.displayName || "",
          email: user.email || "",
        },
        theme: {
          color: "#EAB308",
        },
      };

      const rzp = new window.Razorpay(options);

      rzp.on("payment.failed", function (response: any) {
        console.error("Payment failed:", response.error);
        alert(`Payment failed: ${response.error.description}`);
      });

      rzp.open();
    } catch (error) {
      console.error("Error purchasing coins:", error);
      alert("Failed to initiate purchase. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#050505] overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02] shrink-0">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center">
              <Coins className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Coin Store</h2>
              <p className="text-sm text-white/50">
                Current Balance:{" "}
                <span className="text-yellow-500 font-bold">
                  {profile?.coins ?? 50}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center relative">
        {/* Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-gradient-to-b from-yellow-500/[0.05] to-transparent blur-[120px] pointer-events-none rounded-full" />

        <div className="w-full max-w-4xl relative z-10">
          {successMessage ? (
            <div className="py-12 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-300">
              <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
                <Check className="w-12 h-12 text-emerald-500" />
              </div>
              <h3 className="text-4xl font-bold text-white mb-4">
                Payment Successful!
              </h3>
              <p className="text-xl text-white/60">{successMessage}</p>
            </div>
          ) : (
            <>
              <div className="text-center mb-12">
                <h3 className="text-4xl sm:text-5xl font-bold mb-4 tracking-tight">
                  Get More Swap Coins
                </h3>
                <p className="text-lg text-white/50 max-w-xl mx-auto">
                  Use coins to start new chats and connect with experts across
                  the platform.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                {PACKAGES.map((pkg) => (
                  <div
                    key={pkg.id}
                    className={`relative p-8 rounded-3xl border flex flex-col items-center text-center transition-all duration-300 ${
                      pkg.popular
                        ? "bg-yellow-500/10 border-yellow-500/50 shadow-[0_0_40px_rgba(234,179,8,0.15)] scale-105 md:-translate-y-4"
                        : "bg-white/[0.02] border-white/10 hover:border-white/30 hover:-translate-y-2"
                    }`}
                  >
                    {pkg.popular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-500 text-black text-sm font-bold px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
                        <Sparkles className="w-4 h-4" />
                        Most Popular
                      </div>
                    )}

                    <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-yellow-500/20">
                      <Coins className="w-10 h-10 text-black" />
                    </div>

                    <h4 className="text-4xl font-bold text-white mb-2">
                      {pkg.coins}
                    </h4>
                    <p className="text-sm text-white/50 mb-8 uppercase tracking-widest font-semibold">
                      Coins
                    </p>

                    <div className="mt-auto w-full">
                      <button
                        onClick={() => handlePurchase(pkg)}
                        disabled={isProcessing}
                        className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
                          pkg.popular
                            ? "bg-yellow-500 text-black hover:bg-yellow-400 hover:scale-[1.02]"
                            : "bg-white/10 text-white hover:bg-white/20 hover:scale-[1.02]"
                        } ${isProcessing ? "opacity-50 cursor-not-allowed hover:scale-100" : "cursor-pointer"}`}
                      >
                        <CreditCard className="w-5 h-5" />₹{pkg.price}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-12 text-center text-sm text-white/30">
                <p>Secure payments powered by Razorpay.</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
