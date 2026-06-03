let audioCtx = null;
let muted = false;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export const audioService = {
  toggleMute() {
    muted = !muted;
    return muted;
  },

  isMuted() {
    return muted;
  },

  playClick() {
    if (muted) return;
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch (e) {
      console.warn('Audio play blocked or failed:', e);
    }
  },

  playPlace() {
    if (muted) return;
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {
      console.warn('Audio play blocked or failed:', e);
    }
  },

  playScore() {
    if (muted) return;
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      
      // Play a quick two-tone rising chime
      const playTone = (freq, start, duration, volume) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(volume, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + duration);
      };

      playTone(523.25, now, 0.12, 0.1); // C5
      playTone(659.25, now + 0.08, 0.2, 0.1); // E5
    } catch (e) {
      console.warn('Audio play blocked or failed:', e);
    }
  },

  playWin() {
    if (muted) return;
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;

      // Play a short cheerful melody
      const notes = [
        { f: 523.25, t: 0, d: 0.15 }, // C5
        { f: 587.33, t: 0.12, d: 0.15 }, // D5
        { f: 659.25, t: 0.24, d: 0.15 }, // E5
        { f: 783.99, t: 0.36, d: 0.3 } // G5
      ];

      notes.forEach((note) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(note.f, now + note.t);
        gain.gain.setValueAtTime(0.12, now + note.t);
        gain.gain.exponentialRampToValueAtTime(0.001, now + note.t + note.d);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + note.t);
        osc.stop(now + note.t + note.d);
      });
    } catch (e) {
      console.warn('Audio play blocked or failed:', e);
    }
  },

  playDraw() {
    if (muted) return;
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;

      // Play a descending/sad chord sequence
      const notes = [
        { f: 392.00, t: 0, d: 0.2 }, // G4
        { f: 349.23, t: 0.15, d: 0.2 }, // F4
        { f: 311.13, t: 0.3, d: 0.4 } // Eb4
      ];

      notes.forEach((note) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth'; // Slightly buzzy for a sad tone
        osc.frequency.setValueAtTime(note.f, now + note.t);
        
        // Add low pass filter to make sawtooth sound warm and soft
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now + note.t);

        gain.gain.setValueAtTime(0.08, now + note.t);
        gain.gain.exponentialRampToValueAtTime(0.001, now + note.t + note.d);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now + note.t);
        osc.stop(now + note.t + note.d);
      });
    } catch (e) {
      console.warn('Audio play blocked or failed:', e);
    }
  }
};
