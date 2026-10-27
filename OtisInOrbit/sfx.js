import { toast } from './core.js';

// All sound is synthesised on the fly with Web Audio: no sound files needed.
// Browsers only allow audio after a key press or click, so everything starts on the first input.
// M toggles sound on/off (remembered).
const AC = window.AudioContext || window.webkitAudioContext;
let ac = null, master, sfxBus, musicBus, noiseBuf;
let muted = false;
try { muted = localStorage.getItem('sound-muted') === '1'; } catch (e) {}

function init() {
  if (ac || !AC) return;
  ac = new AC();
  master = ac.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ac.destination);
  sfxBus = ac.createGain(); sfxBus.gain.value = 0.55; sfxBus.connect(master);
  musicBus = ac.createGain(); musicBus.gain.value = 0.2; musicBus.connect(master);
  noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  setInterval(schedule, 40);
}
const unlock = () => { init(); if (ac && ac.state === 'suspended') ac.resume(); };
addEventListener('keydown', unlock); addEventListener('pointerdown', unlock);
addEventListener('keydown', (e) => {
  if (e.code !== 'KeyM' || e.repeat) return;
  muted = !muted;
  try { localStorage.setItem('sound-muted', muted ? '1' : '0'); } catch (err) {}
  if (master) master.gain.setTargetAtTime(muted ? 0 : 1, ac.currentTime, 0.05);
  toast(muted ? '🔇 Geluid uit (M)' : '🔊 Geluid aan (M)');
});

// ---------- building blocks ----------
function tone(f, d, { type = 'square', vol = 0.2, to = null, at = 0, when = null, bus = null, attack = 0.005 } = {}) {
  if (!ac) return;
  const t = when ?? ac.currentTime + at;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + d);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g); g.connect(bus || sfxBus);
  o.start(t); o.stop(t + d + 0.05);
}
function noise(d, { vol = 0.3, freq = 1200, to = null, q = 1, type = 'lowpass', at = 0 } = {}) {
  if (!ac) return;
  const t = ac.currentTime + at;
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = noiseBuf; f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if (to) f.frequency.exponentialRampToValueAtTime(to, t + d);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  s.connect(f); f.connect(g); g.connect(sfxBus);
  s.start(t, Math.random() * 0.5); s.stop(t + d + 0.05);
}
const N = (semi, base = 440) => base * Math.pow(2, semi / 12);

// ---------- effects ----------
export const jump = (chain = 1) => tone(260 + chain * 70, 0.16, { to: 520 + chain * 160, vol: 0.09 });
export const airJump = () => { tone(520, 0.12, { type: 'triangle', to: 1000, vol: 0.12 }); tone(1500, 0.08, { type: 'sine', vol: 0.05, at: 0.05 }); };
export const longJump = () => { tone(200, 0.24, { type: 'sawtooth', to: 480, vol: 0.06 }); noise(0.3, { vol: 0.12, freq: 600, to: 2400, type: 'bandpass', q: 2 }); };
export const pound = () => tone(900, 0.16, { type: 'triangle', to: 250, vol: 0.1 });
export const poundLand = () => { noise(0.28, { vol: 0.45, freq: 500, to: 80 }); tone(110, 0.28, { type: 'sine', to: 40, vol: 0.45 }); };
export const land = () => noise(0.08, { vol: 0.12, freq: 400 });
export const coin = () => { tone(988, 0.07, { vol: 0.08 }); tone(1319, 0.18, { vol: 0.08, at: 0.06 }); };
export function cosmic() {
  [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => tone(N(s + 3, 523.25), 0.35, { type: 'triangle', vol: 0.14, at: i * 0.07 }));
  [0, 1, 2, 3].forEach((i) => tone(N(36 + i * 2, 523.25), 0.12, { type: 'sine', vol: 0.05, at: 0.5 + i * 0.05 }));
}
export const crate = () => { noise(0.25, { vol: 0.35, freq: 1800, to: 300, type: 'bandpass', q: 0.8 }); tone(160, 0.2, { type: 'square', to: 60, vol: 0.1 }); };
export const smash = () => { noise(0.6, { vol: 0.6, freq: 900, to: 60 }); tone(80, 0.5, { type: 'sine', to: 30, vol: 0.5 }); };
export const scanStart = () => tone(400, 0.7, { type: 'sine', to: 1600, vol: 0.06, attack: 0.1 });
export const copy = () => [0, 7, 12].forEach((s, i) => tone(N(s, 659.25), 0.14, { type: 'square', vol: 0.07, at: i * 0.06 }));
export const drop = () => tone(700, 0.18, { type: 'triangle', to: 300, vol: 0.08 });
export const hurt = () => { tone(420, 0.3, { to: 110, vol: 0.14 }); noise(0.15, { vol: 0.2, freq: 1500 }); };
export const stomp = () => { tone(220, 0.14, { to: 820, vol: 0.12 }); noise(0.07, { vol: 0.15, freq: 800 }); };
export const bossHit = () => { smash(); tone(300, 0.5, { type: 'sawtooth', to: 80, vol: 0.12, at: 0.05 }); };
export const fanfare = () => [[0, 0], [4, 0.15], [7, 0.3], [12, 0.45], [7, 0.62], [12, 0.75]].forEach(([s, at]) => tone(N(s, 523.25), at === 0.75 ? 0.9 : 0.2, { type: 'square', vol: 0.1, at }));
export const checkpoint = () => { tone(784, 0.12, { type: 'triangle', vol: 0.1 }); tone(1175, 0.3, { type: 'triangle', vol: 0.1, at: 0.1 }); };
export const launch = () => { noise(3.6, { vol: 0.35, freq: 200, to: 1200 }); tone(60, 3.6, { type: 'sawtooth', to: 220, vol: 0.08, attack: 0.5 }); };
export const blip = () => tone(N(Math.floor(Math.random() * 5) * 2, 660), 0.05, { type: 'square', vol: 0.03 });
export const bark = () => { [0, 0.22].forEach((at) => { tone(520, 0.12, { type: 'sawtooth', to: 260, vol: 0.09, at }); noise(0.08, { vol: 0.12, freq: 1400, type: 'bandpass', q: 2, at }); }); };
export const bleat = () => { tone(420, 0.45, { type: 'sawtooth', vol: 0.05, to: 380 }); for (let i = 0; i < 6; i++) tone(440 + (i % 2) * 40, 0.07, { type: 'triangle', vol: 0.04, at: i * 0.065 }); };
export const squeak = () => tone(1400, 0.1, { type: 'sine', to: 2200, vol: 0.05 });
export const wake = () => { tone(70, 1.4, { type: 'sawtooth', to: 45, vol: 0.18, attack: 0.3 }); noise(1.2, { vol: 0.25, freq: 300, at: 0.2 }); };

// ---------- music: a small generative tune per planet ----------
const SONGS = {
  // de Mistmaan: slow, minor, a bit lonely
  mistmaan: { bpm: 70, root: 220, chords: [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-5, -2, 2]], arp: [0, 1, 2, 1, 2, 1, 0, 2], lead: 'triangle', pad: 'sine', bass: 'sine', arpVol: 0.06 },
  // de Bergwereld: bright, bouncy, major
  berg: { bpm: 104, root: 261.63, chords: [[0, 4, 7], [5, 9, 12], [-3, 0, 4], [7, 11, 14]], arp: [0, 1, 2, 3, 2, 1, 2, 0], lead: 'square', pad: 'triangle', bass: 'triangle', arpVol: 0.035 },
  // any boss: fast and tense
  boss: { bpm: 148, root: 196, chords: [[0, 3, 7], [0, 3, 7], [-2, 1, 5], [1, 5, 8]], arp: [0, 2, 1, 2, 0, 2, 1, 3], lead: 'sawtooth', pad: 'sawtooth', bass: 'square', arpVol: 0.03 },
};
let song = null, step = 0, next = 0;
export function music(name) {
  if (!SONGS[name] || song === SONGS[name]) return;
  song = SONGS[name]; step = 0;
  if (ac) next = ac.currentTime + 0.1;
}
function schedule() {
  if (!ac || !song || ac.state !== 'running') return;
  const s = song, eighth = 60 / s.bpm / 2;
  if (next < ac.currentTime) next = ac.currentTime + 0.05;
  while (next < ac.currentTime + 0.25) {
    const bar = Math.floor(step / 8) % s.chords.length, chord = s.chords[bar], pos = step % 8;
    const notes = [...chord, chord[0] + 12];
    tone(N(notes[s.arp[pos] % notes.length] + 12, s.root), eighth * 1.6, { type: s.lead, vol: s.arpVol, when: next, bus: musicBus });
    if (pos === 0) chord.forEach((c) => tone(N(c, s.root), eighth * 8, { type: s.pad, vol: 0.05, when: next, bus: musicBus, attack: eighth * 2 }));
    if (pos % 4 === 0) tone(N(chord[0] - 12, s.root), eighth * 3, { type: s.bass, vol: 0.12, when: next, bus: musicBus });
    next += eighth; step++;
  }
}
