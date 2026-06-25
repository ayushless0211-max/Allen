export function playNotificationSound(type: 'message' | 'call') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    if (type === 'call') {
      // Play a distinctive sweet ring sound series (2 high-quality rings)
      const playRing = (delay: number) => {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(440, ctx.currentTime + delay); // A4
        osc1.frequency.quadraticRampToValueAtTime(880, ctx.currentTime + delay + 0.15); // A5
        
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(554.37, ctx.currentTime + delay); // C#5
        osc2.frequency.quadraticRampToValueAtTime(1108.73, ctx.currentTime + delay + 0.15); // C#6

        gainNode.gain.setValueAtTime(0, ctx.currentTime + delay);
        gainNode.gain.linearRampToValueAtTime(0.15, ctx.currentTime + delay + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.35);
        
        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc1.start(ctx.currentTime + delay);
        osc2.start(ctx.currentTime + delay);
        osc1.stop(ctx.currentTime + delay + 0.35);
        osc2.stop(ctx.currentTime + delay + 0.35);
      };

      playRing(0);
      playRing(0.4);
      playRing(0.8);
    } else {
      // Sweet high-pitched double-note ping chime for message/swap
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08); // A5
      
      gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch (e) {
    console.error("Audio playback blocked or failed:", e);
  }
}
