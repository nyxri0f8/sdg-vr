// Tiny synthesised sound effects (no audio files to download).
// The AudioContext is created on the first user gesture, as browsers require.
let ctx = null;

export function unlockAudio() {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch { ctx = null; }
}

function tone(freq, start, dur, { type = 'sine', gain = 0.12 } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

export const sfx = {
  // Soft tick when a gaze selection fires.
  select: () => tone(880, 0, 0.12, { type: 'triangle', gain: 0.08 }),
  // Friendly pop when a task step is done.
  step: () => { tone(523, 0, 0.14); tone(784, 0.07, 0.18); },
  // Short fanfare when a goal is complete.
  complete: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.35, { type: 'triangle', gain: 0.1 })),
  // Gentle whoosh-like sweep between scenes.
  move: () => tone(330, 0, 0.18, { type: 'sine', gain: 0.05 })
};
