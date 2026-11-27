import { cfg } from './settings.js?v=20261128r';

// Shared Web Audio graph: everything is synthesised, nothing is loaded.
// master -> compressor -> speakers, with separate effect and music buses under it.

export let actx = null, noiseBuf = null, sfxBus = null, musicBus = null, impulse = null;
let master = null, comp = null;
const ready = [];
export const onAudioReady = fn => { if (actx) fn(); else ready.push(fn); };

export function initAudio() {
  if (actx) { if (actx.state === 'suspended') actx.resume(); return; }
  actx = new AudioContext();
  noiseBuf = actx.createBuffer(1, actx.sampleRate, actx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  // a soft 2.4s room for the music's reverb
  const len = actx.sampleRate * 2.4;
  impulse = actx.createBuffer(2, len, actx.sampleRate);
  for (let c = 0; c < 2; c++) { const ch = impulse.getChannelData(c); for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
  comp = actx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
  master = actx.createGain(); master.connect(comp).connect(actx.destination);
  sfxBus = actx.createGain(); sfxBus.connect(master);
  musicBus = actx.createGain(); musicBus.connect(master);
  applyVolume();
  ready.splice(0).forEach(fn => fn());
}
// A copy of everything the game plays, for recording clips. Returns { stream, stop } or null.
export function audioTap() {
  if (!actx || !comp || !actx.createMediaStreamDestination) return null;
  const d = actx.createMediaStreamDestination(); comp.connect(d);
  return { stream: d.stream, stop: () => { try { comp.disconnect(d); } catch {} } };
}

export function applyVolume() {
  if (!actx) return;
  master.gain.value = cfg.volume;
  sfxBus.gain.value = cfg.sfx ?? 1;
  musicBus.gain.value = (cfg.music ?? 0.6) * 0.55;
}
// first click or key press anywhere unlocks audio (browsers block it until then)
for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, initAudio, true);

export const m2f = n => 440 * Math.pow(2, (n - 69) / 12);

// ---------- effect building blocks (at = delay in seconds) ----------
export function tone(freq, dur, type = 'square', vol = 0.08, slide = 0.5, at = 0) {
  if (!actx || vol <= 0) return;
  const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + at;
  o.type = type; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(sfxBus); o.start(t); o.stop(t + dur + 0.02);
}
// filtered noise; o.type picks the filter, o.to sweeps its frequency, o.q sharpens it
export function noise(dur, vol = 0.1, freq = 800, at = 0, o = {}) {
  if (!actx || vol <= 0) return;
  const s = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain(), t = actx.currentTime + at;
  s.buffer = noiseBuf; s.loop = true;
  f.type = o.type || 'highpass'; f.frequency.setValueAtTime(freq, t); f.Q.value = o.q ?? 0.7;
  if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(sfxBus); s.start(t, Math.random() * 0.6); s.stop(t + dur + 0.05);
}
const seq = (notes, gap, dur, type, vol, at = 0) => notes.forEach((n, i) => tone(m2f(n), dur, type, vol, 1, at + i * gap));
function hooves(n, v, at = 0) {                      // gallop: da-da-DUM
  let t = at;
  for (let i = 0; i < n; i++) {
    tone(95, 0.07, 'sine', 0.14 * v, 0.6, t); noise(0.04, 0.08 * v, 1400, t, { type: 'bandpass', q: 2 });
    t += i % 3 === 2 ? 0.16 : 0.07;
  }
}

// ---------- one sound per ability, by ability id. v = loudness (1 = your own cast) ----------
export const ABIL_SFX = {
  // Beef Wellington
  roast: v => { tone(392, 0.12, 'triangle', 0.05 * v, 1); noise(0.2, 0.06 * v, 1200, 0.3); [523, 659].forEach((f, i) => tone(f, 0.2, 'sine', 0.04 * v, 1, 0.4 + i * 0.1)); },
  crust: v => { noise(0.3, 0.06 * v, 3000, 0, { type: 'bandpass', to: 1500, q: 1 }); tone(440, 0.3, 'sine', 0.05 * v, 1.3); },
  banquet: v => { for (let i = 0; i < 4; i++) tone(2093, 0.12, 'sine', 0.04 * v, 1, i * 0.18); [392, 523, 659, 784].forEach((f, i) => tone(f, 0.5, 'triangle', 0.05 * v, 1, 0.8 + i * 0.1)); },
  // Crook
  pen: v => { for (let i = 0; i < 4; i++) noise(0.06, 0.1 * v, 600, 0.3 + i * 0.08, { type: 'lowpass', to: 400 }); tone(520, 0.2, 'triangle', 0.04 * v, 1.2); },
  counting: v => { for (let i = 0; i < 3; i++) { tone(330, 0.35, 'sawtooth', 0.04 * v, 1.04, i * 0.4); tone(332, 0.35, 'sawtooth', 0.03 * v, 0.98, i * 0.4); } },
  // The Microwave
  popcorn: v => { for (let i = 0; i < 10; i++) noise(0.03, 0.1 * v, 2500 + Math.random() * 2000, 0.35 + Math.random() * 0.6); },
  reheat: v => { tone(110, 3, 'sawtooth', 0.03 * v, 1); noise(0.1, 0.08 * v, 900); },
  meltdown: v => { tone(100, 1.2, 'sawtooth', 0.06 * v, 3); tone(1568, 0.6, 'sine', 0.08 * v, 1, 1.2); tone(1568, 0.6, 'sine', 0.06 * v, 1, 1.5); noise(0.5, 0.12 * v, 500, 1.2); },
  // Flambé
  flambe: v => { noise(0.5, 0.1 * v, 1800, 0.3, { type: 'bandpass', to: 600, q: 0.8 }); tone(180, 0.3, 'sawtooth', 0.03 * v, 0.5, 0.3); },
  rocketjump: v => { tone(900, 0.15, 'sine', 0.04 * v, 3); noise(0.35, 0.16 * v, 700, 0.05, { type: 'lowpass', to: 200 }); tone(60, 0.3, 'sine', 0.1 * v, 0.5, 0.05); },
  fivecourse: v => { for (let i = 0; i < 5; i++) { noise(0.25, 0.12 * v, 900, i * 0.35, { type: 'lowpass', to: 200 }); tone(523 + i * 66, 0.12, 'triangle', 0.04 * v, 1, i * 0.35); } },
  // Man-Spider
  webline: v => { noise(0.18, 0.08 * v, 5000, 0, { type: 'bandpass', to: 2000, q: 2 }); tone(1600, 0.1, 'sine', 0.03 * v, 0.5); },
  thwip: v => { noise(0.12, 0.1 * v, 6000, 0, { type: 'bandpass', to: 3000, q: 3 }); tone(500, 0.25, 'triangle', 0.04 * v, 2.5, 0.05); },
  funnelweb: v => { for (let i = 0; i < 6; i++) noise(0.08, 0.07 * v, 5000, i * 0.07, { type: 'bandpass', to: 2500, q: 2 }); tone(220, 0.8, 'triangle', 0.05 * v, 0.6, 0.3); },
  flipper: v => { noise(0.06, 0.1 * v, 2400, 0, { type: "highpass", to: 1800 }); tone(330, 0.08, "square", 0.05 * v, 1.8); },
  bumper: v => { tone(1047, 0.12, "square", 0.05 * v, 1); tone(1568, 0.14, "square", 0.04 * v, 1, 0.05); },
  jackpot: v => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.12, "square", 0.05 * v, 1, i * 0.07)); noise(0.4, 0.06 * v, 3000, 0.35); },
  claw: v => { tone(140, 0.4, "sawtooth", 0.05 * v, 1.6); noise(0.1, 0.1 * v, 1200, 0.35, { type: "bandpass", to: 500, q: 3 }); },
  capsule: v => { tone(784, 0.1, "triangle", 0.05 * v, 1.2); tone(1175, 0.2, "triangle", 0.04 * v, 1, 0.08); },
  grandprize: v => { tone(90, 0.9, "sawtooth", 0.07 * v, 2.2); [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.18, "triangle", 0.05 * v, 1, 0.5 + i * 0.09)); },
  powerup: v => { [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.06, "square", 0.04 * v, 1, i * 0.05)); },
  warppipe: v => { tone(880, 0.5, "square", 0.04 * v, 0.25); },
  oneup: v => { [659, 784, 1319, 1047, 1175, 1568].forEach((f, i) => tone(f, 0.1, "square", 0.05 * v, 1, i * 0.09)); },
  talondive: v => { noise(0.5, 0.1 * v, 2600, 0, { type: "bandpass", to: 600, q: 1.5 }); tone(520, 0.4, "triangle", 0.04 * v, 0.4); },
  screech: v => { tone(1800, 0.5, "sawtooth", 0.05 * v, 1.4); tone(2400, 0.4, "square", 0.025 * v, 0.8, 0.05); },
  featherstorm: v => { for (let i = 0; i < 8; i++) noise(0.25, 0.08 * v, 3000 + i * 200, i * 0.12, { type: "bandpass", to: 1200, q: 1 }); tone(330, 0.3, "triangle", 0.05 * v, 1.5); tone(262, 0.4, "triangle", 0.05 * v, 0.9, 0.3); },
  // Stitch
  medbomb: v => { tone(660, 0.12, 'sine', 0.05 * v, 1.2); noise(0.25, 0.08 * v, 2000, 0.3, { type: 'bandpass', to: 900, q: 1.5 }); [784, 988, 1175].forEach((f, i) => tone(f, 0.18, 'sine', 0.04 * v, 1, 0.35 + i * 0.06)); },
  lifeline: v => { tone(523, 0.4, 'sine', 0.05 * v, 1.5); tone(1046, 0.3, 'triangle', 0.03 * v, 1, 0.1); },
  codeblue: v => { for (let i = 0; i < 3; i++) { tone(988, 0.12, 'square', 0.03 * v, 1, i * 0.22); tone(784, 0.12, 'square', 0.03 * v, 1, i * 0.22 + 0.11); } [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.5, 'sine', 0.05 * v, 1, 0.7 + i * 0.08)); },
  // Dynamo
  jumpstart: v => { noise(0.2, 0.1 * v, 5000); tone(220, 0.3, 'sawtooth', 0.05 * v, 4); },
  pylon: v => { tone(60, 0.6, 'sawtooth', 0.06 * v, 1); for (let i = 0; i < 5; i++) noise(0.04, 0.05 * v, 6000, 0.1 + i * 0.09); tone(880, 0.3, 'sine', 0.04 * v, 1.5, 0.3); },
  overcharge: v => { tone(110, 1, 'sawtooth', 0.08 * v, 6); for (let i = 0; i < 8; i++) noise(0.05, 0.07 * v, 5000, i * 0.1); tone(1760, 0.5, 'sine', 0.04 * v, 1, 0.9); },
  // Mortar
  brick: v => { noise(0.08, 0.12 * v, 500, 0, { type: 'lowpass', to: 300 }); tone(90, 0.12, 'sine', 0.08 * v, 0.7); },
  pillar: v => { for (let i = 0; i < 3; i++) { noise(0.08, 0.1 * v, 500, i * 0.1, { type: 'lowpass', to: 300 }); tone(100 + i * 40, 0.1, 'sine', 0.07 * v, 1, i * 0.1); } },
  fortress: v => { tone(55, 1, 'sawtooth', 0.07 * v, 1.5); for (let i = 0; i < 10; i++) noise(0.06, 0.08 * v, 500, i * 0.07, { type: 'lowpass', to: 300 }); tone(440, 0.3, 'triangle', 0.05 * v, 1.5, 0.8); },
  // Bulwark
  hook: v => { noise(0.3, 0.1 * v, 2500, 0, { type: 'bandpass', to: 6000, q: 4 }); for (let i = 0; i < 6; i++) tone(1800 + i * 120, 0.03, 'square', 0.03 * v, 0.8, i * 0.04); tone(220, 0.2, 'triangle', 0.1 * v, 0.6, 0.28); noise(0.08, 0.12 * v, 600, 0.28); },
  barrier: v => { tone(110, 0.5, 'sine', 0.12 * v, 1.5); tone(660, 0.4, 'triangle', 0.04 * v, 1.5, 0.05); tone(990, 0.3, 'sine', 0.03 * v, 1.2, 0.12); },
  dome: v => { noise(0.9, 0.1 * v, 300, 0, { type: 'lowpass', to: 4000 }); seq([50, 57, 62, 66, 69], 0.07, 0.6, 'triangle', 0.06 * v); tone(55, 1, 'sine', 0.15 * v, 1.1); },
  // Zip
  parcel: v => { tone(140, 0.08, 'square', 0.08 * v, 0.5); noise(0.06, 0.1 * v, 400); noise(0.5, 0.03 * v, 5000, 0.05); },
  blink: v => { noise(0.25, 0.12 * v, 500, 0, { type: 'bandpass', to: 5000, q: 2 }); tone(300, 0.2, 'sine', 0.08 * v, 4); },
  rush: v => { tone(80, 0.7, 'sawtooth', 0.07 * v, 3); tone(82, 0.7, 'sawtooth', 0.05 * v, 3.1); tone(440, 0.15, 'square', 0.06 * v, 1, 0.6); tone(554, 0.25, 'square', 0.06 * v, 1, 0.6); },
  // Cinder
  candle: v => { for (let i = 0; i < 5; i++) { noise(0.12, 0.08 * v, 1200, i * 0.07, { type: 'bandpass', to: 3000, q: 3 }); tone(700 + i * 90, 0.1, 'triangle', 0.05 * v, 1.8, i * 0.07); } },
  nova: v => { tone(70, 0.5, 'sine', 0.2 * v, 0.4); noise(0.6, 0.15 * v, 2000, 0, { type: 'lowpass', to: 150 }); for (let i = 0; i < 8; i++) noise(0.03, 0.06 * v, 3000, 0.05 + Math.random() * 0.4); },
  barrage: v => { for (let i = 0; i < 5; i++) { const t = 0.2 + i * 0.18; tone(2000, 0.4, 'sine', 0.04 * v, 0.4, t); noise(0.3, 0.1 * v, 600, t + 0.4, { type: 'lowpass', to: 100 }); tone(60, 0.3, 'sine', 0.12 * v, 0.5, t + 0.4); } },
  // Lantern
  mark: v => { tone(1568, 0.8, 'sine', 0.08 * v, 1); tone(2349, 0.6, 'sine', 0.04 * v, 1, 0.01); tone(3136, 0.4, 'triangle', 0.02 * v, 1, 0.02); },
  heal: v => seq([72, 76, 79, 84, 88], 0.06, 0.5, 'triangle', 0.06 * v),
  sanctum: v => { [60, 64, 67, 72].forEach(n => tone(m2f(n), 1.4, 'sine', 0.06 * v, 1)); tone(m2f(84), 1.2, 'triangle', 0.03 * v, 1, 0.3); noise(1, 0.03 * v, 4000); },
  // Thicket
  snare: v => { tone(180, 0.15, 'square', 0.05 * v, 0.7); noise(0.05, 0.15 * v, 2000, 0.12); tone(90, 0.08, 'triangle', 0.08 * v, 0.5, 0.12); },
  wall: v => { noise(0.8, 0.12 * v, 100, 0, { type: 'lowpass', to: 900 }); for (let i = 0; i < 6; i++) noise(0.03, 0.08 * v, 2500, 0.1 + i * 0.1); tone(60, 0.8, 'sawtooth', 0.05 * v, 1.6); },
  overgrowth: v => { noise(0.8, 0.08 * v, 3000, 0, { type: 'bandpass', to: 1500, q: 1 }); seq([67, 71, 74, 79], 0.12, 0.6, 'sine', 0.05 * v, 0.1); },
  // Ratchet
  coil: v => { tone(140, 0.35, 'sawtooth', 0.08 * v, 1); for (let i = 0; i < 6; i++) tone(2000 + Math.random() * 2000, 0.03, 'square', 0.03 * v, 0.5, i * 0.05); noise(0.3, 0.08 * v, 3000, 0.05); },
  turret: v => { tone(200, 0.1, 'square', 0.07 * v, 0.6); noise(0.06, 0.1 * v, 800); tone(1200, 0.06, 'square', 0.04 * v, 1, 0.25); tone(1600, 0.08, 'square', 0.04 * v, 1, 0.35); },
  overclock: v => { for (let i = 0; i < 5; i++) { tone(300 + i * 150, 0.12, 'square', 0.05 * v, 1.2, i * 0.09); noise(0.05, 0.08 * v, 3000, i * 0.09); } tone(80, 0.6, 'sawtooth', 0.08 * v, 1.5, 0.45); tone(1200, 0.08, 'square', 0.05 * v, 1, 0.9); tone(1600, 0.12, 'square', 0.05 * v, 1, 1.0); },
  // Mirage
  decoy: v => { noise(0.15, 0.1 * v, 1500, 0, { type: 'lowpass', to: 300 }); seq([84, 88, 91, 96], 0.04, 0.2, 'triangle', 0.04 * v, 0.05); },
  vanish: v => { seq([96, 91, 88, 84, 79], 0.05, 0.25, 'sine', 0.05 * v); noise(0.4, 0.05 * v, 5000, 0, { to: 12000 }); },
  showstop: v => { for (let i = 0; i < 10; i++) noise(0.04, 0.07 * v, 1500, i * 0.03, { type: 'bandpass' }); noise(0.8, 0.08 * v, 6000, 0.33); tone(m2f(72), 0.3, 'square', 0.05 * v, 1, 0.35); tone(m2f(79), 0.5, 'square', 0.05 * v, 1, 0.55); },
  // Avalanche
  frost: v => { [0, 3, 7, 10, 12, 15].forEach((k, i) => tone(m2f(96 + k), 0.25, 'sine', 0.04 * v, 1, i * 0.04)); noise(0.4, 0.05 * v, 6000); },
  charge: v => { noise(0.5, 0.12 * v, 800, 0, { type: 'bandpass', to: 300, q: 2 }); tone(400, 0.4, 'sine', 0.06 * v, 0.4); },
  slam: v => { noise(0.4, 0.08 * v, 300, 0, { type: 'bandpass', to: 3000, q: 1 }); tone(300, 0.4, 'sine', 0.06 * v, 2.5); tone(55, 0.8, 'sine', 0.25 * v, 0.5, 0.7); noise(0.8, 0.18 * v, 400, 0.7, { type: 'lowpass', to: 80 }); },
  // Tempo
  bassdrop: v => { tone(110, 0.15, 'square', 0.1 * v, 1); tone(110, 0.15, 'square', 0.1 * v, 1, 0.16); tone(160, 0.7, 'sawtooth', 0.12 * v, 0.2, 0.32); tone(40, 0.6, 'sine', 0.2 * v, 0.8, 0.32); },
  rewind: v => { for (let i = 0; i < 12; i++) tone(1600 - i * 90, 0.04, 'triangle', 0.04 * v, 1.4, i * 0.035); tone(800, 0.5, 'sawtooth', 0.04 * v, 0.3); },
  moshpit: v => { noise(1.2, 0.06 * v, 500, 0, { type: 'bandpass', to: 900, q: 1 }); for (let i = 0; i < 4; i++) tone(120, 0.15, 'sine', 0.18 * v, 0.35, i * 0.25); },
  // Kestrel
  updraft: v => { noise(0.8, 0.12 * v, 300, 0, { type: 'bandpass', to: 4000, q: 2 }); tone(200, 0.6, 'sine', 0.05 * v, 3); },
  flare: v => { tone(900, 0.05, 'square', 0.06 * v, 0.5); noise(1.0, 0.05 * v, 3000, 0.05, { type: 'bandpass', to: 6000, q: 2 }); tone(1200, 0.5, 'sine', 0.03 * v, 2, 0.05); },
  strafe: v => { tone(90, 2, 'sawtooth', 0.05 * v, 1.3); tone(92, 2, 'square', 0.03 * v, 1.3); for (let i = 0; i < 4; i++) tone(1800, 0.3, 'sine', 0.03 * v, 0.4, 0.9 + i * 0.2); },
  // Snapjaw
  roll: v => { for (let i = 0; i < 4; i++) noise(0.15, 0.1 * v, 400, i * 0.11, { type: 'lowpass', to: 1500 }); tone(150, 0.4, 'sine', 0.08 * v, 0.5); },
  submerge: v => { noise(0.3, 0.08 * v, 900, 0, { type: 'lowpass', to: 100 }); for (let i = 0; i < 7; i++) tone(300 + Math.random() * 500, 0.08, 'sine', 0.07 * v, 2.2, 0.1 + i * 0.06); },
  jaws: v => { tone(50, 0.6, 'sawtooth', 0.06 * v, 1.4); noise(0.5, 0.08 * v, 600, 0, { type: 'lowpass', to: 150 }); noise(0.06, 0.25 * v, 1500, 0.55); tone(180, 0.12, 'square', 0.12 * v, 0.4, 0.55); tone(60, 0.4, 'sine', 0.2 * v, 0.5, 0.55); },
  // Cavalier
  lance: v => { hooves(6, v); tone(m2f(67), 0.2, 'square', 0.05 * v, 1, 0.05); tone(m2f(72), 0.4, 'square', 0.05 * v, 1, 0.25); },
  rally: v => { [[67, 0, 0.14], [72, 0.15, 0.14], [76, 0.3, 0.14], [79, 0.45, 0.5]].forEach(([n, t, d]) => { tone(m2f(n), d, 'sawtooth', 0.04 * v, 1, t); tone(m2f(n), d, 'square', 0.03 * v, 1, t); }); },
  stampede: v => { hooves(18, v * 1.2); noise(1.6, 0.1 * v, 600, 0, { type: 'lowpass', to: 120 }); tone(700, 0.25, 'sawtooth', 0.04 * v, 1.5, 0.1); tone(1000, 0.4, 'sawtooth', 0.04 * v, 0.5, 0.35); },
  // Gloop
  puddle: v => { noise(0.2, 0.1 * v, 400, 0, { type: 'lowpass', to: 150 }); tone(330, 0.3, 'sine', 0.07 * v, 0.4, 0.3); noise(0.25, 0.08 * v, 700, 0.3, { type: 'lowpass', to: 200 }); },
  gelform: v => { for (let i = 0; i < 5; i++) tone(220 + i * 40, 0.12, 'sine', 0.06 * v, i % 2 ? 1.4 : 0.7, i * 0.06); },
  slimetime: v => { noise(1, 0.12 * v, 500, 0, { type: 'lowpass', to: 120 }); for (let i = 0; i < 8; i++) tone(180 + Math.random() * 300, 0.15, 'sine', 0.05 * v, 0.5, i * 0.09); },
  // Torque
  skate: v => { noise(0.45, 0.1 * v, 1200, 0, { type: 'bandpass', to: 3000, q: 2 }); tone(300, 0.35, 'sawtooth', 0.03 * v, 2); },
  spinout: v => { noise(0.4, 0.12 * v, 800, 0, { type: 'bandpass', to: 2400, q: 3 }); tone(90, 0.2, 'sine', 0.14 * v, 0.6, 0.3); },
  overdrive: v => { tone(110, 0.9, 'sawtooth', 0.06 * v, 3); tone(220, 0.9, 'square', 0.03 * v, 3, 0.05); noise(0.6, 0.06 * v, 2000); },
  // Nutcracker
  nutcluster: v => { for (let i = 0; i < 4; i++) { tone(900 - i * 80, 0.05, 'square', 0.04 * v, 0.7, i * 0.06); noise(0.05, 0.06 * v, 1800, i * 0.06); } },
  cheeks: v => { for (let i = 0; i < 6; i++) tone(1400 + (i % 2) * 300, 0.04, 'triangle', 0.05 * v, 1, i * 0.07); tone(500, 0.2, 'sine', 0.06 * v, 1.6, 0.45); },
  megamech: v => { tone(60, 1, 'sawtooth', 0.08 * v, 2.5); noise(0.8, 0.1 * v, 300, 0, { type: 'lowpass', to: 1500 }); for (let i = 0; i < 4; i++) tone(400 + i * 200, 0.08, 'square', 0.04 * v, 1, 0.5 + i * 0.08); },
  volley: v => { tone(300, 0.15, 'triangle', 0.05 * v, 2); for (let i = 0; i < 8; i++) noise(0.08, 0.05 * v, 3000 - i * 200, 0.35 + i * 0.07, { type: 'bandpass', to: 900, q: 3 }); },
  leafstep: v => { noise(0.4, 0.07 * v, 4000, 0, { type: 'bandpass', to: 1500, q: 1.5 }); tone(880, 0.15, 'sine', 0.04 * v, 1.6); },
  moonshot: v => { tone(140, 0.5, 'sawtooth', 0.07 * v, 0.4); tone(1320, 0.6, 'sine', 0.05 * v, 0.5); noise(0.5, 0.1 * v, 3000, 0, { type: 'bandpass', to: 600, q: 2 }); },
  pirouette: v => { for (let i = 0; i < 5; i++) tone(784 + i * 98, 0.07, 'triangle', 0.045 * v, 1, i * 0.06); noise(0.35, 0.05 * v, 2600, 0, { type: 'bandpass', to: 5000, q: 2 }); },
  duet: v => { [523, 659, 784].forEach((f, i) => tone(f, 0.3, 'sine', 0.05 * v, 1, i * 0.08)); },
  swanlake: v => { [392, 523, 659, 784, 1046].forEach((f, i) => tone(f, 0.5, 'triangle', 0.05 * v, 1, i * 0.14)); tone(196, 1.2, 'sine', 0.05 * v, 1); },
  molehole: v => { for (let i = 0; i < 4; i++) noise(0.1, 0.1 * v, 500 - i * 60, i * 0.09); tone(150, 0.2, 'sine', 0.05 * v, 0.7, 0.3); },
  popup: v => { noise(0.4, 0.12 * v, 300, 0, { type: 'lowpass', to: 900 }); tone(120, 0.3, 'sine', 0.08 * v, 3, 0.15); tone(660, 0.1, 'square', 0.03 * v, 1.2, 0.3); },
  cavein: v => { tone(55, 1.2, 'sawtooth', 0.08 * v, 0.6); for (let i = 0; i < 6; i++) noise(0.15, 0.1 * v, 400 - i * 40, 0.1 + i * 0.12); },
};
