/**
 * Alarm tones. Each severity gets a distinct rhythm so an operator can identify
 * the level without looking at the screen.
 *
 * Browsers block audio until a user gesture, so the context is created lazily
 * and resumed on the first interaction.
 */

let ctx = null;
let timer = null;
let currentLevel = 0;

const PATTERNS = {
  1: { freq: 660, beeps: 2, on: 140, gap: 130, every: 3000 },
  2: { freq: 880, beeps: 3, on: 120, gap: 110, every: 1800 },
  3: { freq: 1040, beeps: 5, on: 110, gap: 90, every: 1100 },
};

function ensureCtx() {
  if (!ctx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

/** One shaped beep — the ramps keep it from clicking. */
function beep(freq, startAt, duration) {
  const ac = ensureCtx();
  if (!ac) return;

  const osc = ac.createOscillator();
  const gain = ac.createGain();

  osc.type = 'square';
  osc.frequency.setValueAtTime(freq, startAt);

  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(0.07, startAt + 0.01);
  gain.gain.setValueAtTime(0.07, startAt + duration - 0.02);
  gain.gain.linearRampToValueAtTime(0, startAt + duration);

  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.02);
}

function burst(pattern) {
  const ac = ensureCtx();
  if (!ac) return;
  const step = (pattern.on + pattern.gap) / 1000;
  for (let i = 0; i < pattern.beeps; i += 1) {
    beep(pattern.freq, ac.currentTime + i * step, pattern.on / 1000);
  }
}

export function stopAlarm() {
  clearInterval(timer);
  timer = null;
  currentLevel = 0;
}

/**
 * Drives the alarm from the site severity. Re-arms whenever the level changes,
 * so an escalation is heard immediately rather than after the current pattern
 * finishes.
 */
export function updateAudioAlarm(level, muted) {
  const target = muted ? 0 : Math.min(3, Math.max(0, level || 0));

  if (target === currentLevel) return;
  stopAlarm();
  currentLevel = target;

  if (target === 0) return;

  const pattern = PATTERNS[target];
  burst(pattern);
  timer = setInterval(() => burst(pattern), pattern.every);
}

/** Call from a click/keypress so the first alarm is not swallowed by autoplay policy. */
export function primeAudio() {
  ensureCtx();
}
