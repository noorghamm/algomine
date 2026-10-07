// Tiny Web Audio synth for block-world sounds. Nothing plays until enable() is called.
let audio = null;
let enabled = false;

function context() {
  audio ??= new (window.AudioContext || window.webkitAudioContext)();
  if (audio.state === 'suspended') audio.resume();
  return audio;
}

function tone({ freq = 220, type = 'triangle', duration = 0.09, gain = 0.05, slide = 0, delay = 0 }) {
  try {
    const ctx = context();
    const osc = ctx.createOscillator(),
      amp = ctx.createGain(),
      t = ctx.currentTime + delay;
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + duration);
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(amp);
    amp.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  } catch {
    enabled = false;
  }
}

export const sound = {
  get enabled() {
    return enabled;
  },
  set(on) {
    enabled = on;
    if (on) {
      try {
        context();
      } catch {
        enabled = false;
      }
    }
    return enabled;
  },
  step(n = 0) {
    if (enabled) tone({ freq: 220 + (n % 7) * 45 });
  },
  place() {
    if (enabled) tone({ freq: 160, type: 'square', duration: 0.07, gain: 0.04 });
  },
  mine() {
    if (enabled) tone({ freq: 120, type: 'sawtooth', duration: 0.12, gain: 0.03, slide: -60 });
  },
  correct() {
    if (!enabled) return;
    tone({ freq: 523, duration: 0.1 });
    tone({ freq: 784, duration: 0.14, delay: 0.09 });
  },
  wrong() {
    if (!enabled) return;
    tone({ freq: 200, type: 'square', duration: 0.16, gain: 0.04, slide: -80 });
  },
  levelUp() {
    if (!enabled) return;
    [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, duration: 0.16, delay: i * 0.1, gain: 0.05 }));
  },
  tick() {
    if (enabled) tone({ freq: 880, type: 'sine', duration: 0.04, gain: 0.02 });
  },
};
