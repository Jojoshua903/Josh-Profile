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
function noise(d, { vol = 0.3, freq = 1200, to = null, q = 1, type = 'lowpass', at = 0, when = null, bus = null } = {}) {
  if (!ac) return;
  const t = when ?? ac.currentTime + at;
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = noiseBuf; f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if (to) f.frequency.exponentialRampToValueAtTime(to, t + d);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  s.connect(f); f.connect(g); g.connect(bus || sfxBus);
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
export const scanTick = (hi) => tone(hi ? 1760 : 1046.5, hi ? 0.18 : 0.07, { type: 'square', vol: hi ? 0.09 : 0.06 });
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
export const boing = () => tone(180, 0.3, { type: 'sine', to: 620, vol: 0.18 });
export const click = (on = true) => { tone(on ? 520 : 380, 0.08, { type: 'square', vol: 0.08 }); tone(on ? 780 : 260, 0.18, { type: 'triangle', vol: 0.08, at: 0.06 }); };
export const grow = (up = true) => tone(up ? 140 : 520, 0.7, { type: 'triangle', to: up ? 520 : 140, vol: 0.08, attack: 0.08 });
export const spore = () => noise(0.5, { vol: 0.18, freq: 2500, to: 600, type: 'bandpass', q: 1.5 });
export const pop = () => { tone(300, 0.08, { type: 'sine', to: 900, vol: 0.2 }); noise(0.3, { vol: 0.3, freq: 1200, to: 200 }); };
export const shrink = () => tone(900, 0.35, { type: 'square', to: 1600, vol: 0.05 });

// ---------- music: a small generative tune per planet ----------
const SONGS = {
  // de Mistmaan: slow, minor, a bit lonely
  mistmaan: { bpm: 70, root: 220, chords: [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-5, -2, 2]], arp: [0, 1, 2, 1, 2, 1, 0, 2], lead: 'triangle', pad: 'sine', bass: 'sine', arpVol: 0.06 },
  // de Bergwereld: bright, bouncy, major
  berg: { bpm: 104, root: 261.63, chords: [[0, 4, 7], [5, 9, 12], [-3, 0, 4], [7, 11, 14]], arp: [0, 1, 2, 3, 2, 1, 2, 0], lead: 'square', pad: 'triangle', bass: 'triangle', arpVol: 0.035 },
  // het Paddenstoelenbos: dreamy and glittery, with a floaty raised fourth
  bos: { bpm: 82, root: 293.66, chords: [[0, 4, 7], [2, 6, 9], [-1, 2, 7], [-3, 0, 4]], arp: [0, 2, 1, 3, 2, 3, 1, 2], lead: 'sine', pad: 'triangle', bass: 'sine', arpVol: 0.07 },
  // de Schroothoop: clanky and a bit grimy, a factory groove
  schroot: { bpm: 96, root: 207.65, chords: [[0, 3, 7], [0, 3, 7], [-4, 0, 3], [-2, 2, 5]], arp: [0, 0, 2, 1, 0, 2, 3, 1], lead: 'square', pad: 'triangle', bass: 'square', arpVol: 0.03 },
  // de Zon: warm, sunny and a bit swaggery, with marimba-ish plucks
  zon: { bpm: 112, root: 233.08, chords: [[0, 4, 7], [-3, 0, 4], [5, 9, 12], [7, 11, 14]], arp: [0, 2, 1, 2, 3, 2, 1, 0], lead: 'triangle', pad: 'sine', bass: 'triangle', arpVol: 0.05 },
  // de Waterplaneet: gentle and wavy, with bell-like plucks
  water: { bpm: 88, root: 196, chords: [[0, 4, 7], [5, 9, 12], [2, 5, 9], [-1, 2, 7]], arp: [0, 1, 2, 3, 2, 1, 3, 2], lead: 'sine', pad: 'triangle', bass: 'sine', arpVol: 0.06 },
  // de Vergeten Tempel: slow, mysterious, a little sad
  tempel: { bpm: 72, root: 220, chords: [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-5, -1, 2]], arp: [0, 2, 1, 3, 2, 1, 0, 2], lead: 'triangle', pad: 'sine', bass: 'sine', arpVol: 0.05 },
  // het Galmfeest: bouncy and bright, a festival march (instruments join in as you bring them back)
  feest: { bpm: 120, root: 261.63, chords: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7]], arp: [0, 2, 1, 2, 3, 2, 1, 2], lead: 'triangle', pad: 'sine', bass: 'triangle', arpVol: 0.05, party: true },
  // the mole fight: the festival march, but angry
  mol: { bpm: 132, root: 196, chords: [[0, 3, 7], [-2, 2, 5], [-4, 0, 3], [-5, -1, 2]], arp: [0, 2, 1, 3, 0, 2, 1, 3], lead: 'square', pad: 'sawtooth', bass: 'square', arpVol: 0.03, party: true },
  // de Regenstad: slow, rainy, a bit sad (in minor), with soft bell plucks
  regen: { bpm: 76, root: 220, chords: [[0, 3, 7], [-4, 0, 3], [-7, -3, 0], [-5, -1, 2]], arp: [0, 1, 2, 3, 2, 1, 0, 1], lead: 'sine', pad: 'triangle', bass: 'sine', arpVol: 0.05 },
  // de Wolkeneilanden: light, airy and hopeful, a waltz-ish lilt high up
  wolk: { bpm: 100, root: 349.23, chords: [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]], arp: [0, 2, 3, 1, 2, 3, 0, 2], lead: 'triangle', pad: 'sine', bass: 'sine', arpVol: 0.05 },
  // Kapitein Knoop: a sky shanty, stompy and cheeky
  knoop: { bpm: 138, root: 220, chords: [[0, 3, 7], [-2, 2, 5], [0, 3, 7], [-5, -1, 2]], arp: [0, 1, 2, 1, 0, 2, 1, 3], lead: 'square', pad: 'triangle', bass: 'square', arpVol: 0.04 },
  // het Reuzenwoud: warm, woody and curious, plucky like a kalimba between giant trees
  woud: { bpm: 92, root: 246.94, chords: [[0, 4, 7], [-5, -1, 2], [-3, 0, 4], [2, 5, 9]], arp: [0, 1, 2, 1, 3, 2, 1, 2], lead: 'triangle', pad: 'sine', bass: 'triangle', arpVol: 0.06 },
  // Bonk de Reuzenspecht: a tok-tok-tok building-site stomp
  specht: { bpm: 140, root: 207.65, chords: [[0, 3, 7], [0, 3, 7], [-4, 0, 3], [-2, 2, 5]], arp: [0, 0, 1, 0, 2, 0, 1, 3], lead: 'square', pad: 'triangle', bass: 'square', arpVol: 0.04 },
  // any boss: fast and tense
  boss: { bpm: 148, root: 196, chords: [[0, 3, 7], [0, 3, 7], [-2, 1, 5], [1, 5, 8]], arp: [0, 2, 1, 2, 0, 2, 1, 3], lead: 'sawtooth', pad: 'sawtooth', bass: 'square', arpVol: 0.03 },
};
let song = null, step = 0, next = 0;
// the beat, so a planet can move things in time with the music: beat() is how many beats since the song began
let songT0 = 0, songBpm = 100;
export function beat() {
  if (!ac || songT0 < 0) return performance.now() / 1000 * songBpm / 60;
  return (ac.currentTime - songT0) * songBpm / 60;
}
// extra layers for a party song: drum (kick + snare), bel (bells), tuba (low brass), orgel (organ chords)
export const layers = { drum: false, bel: false, tuba: false, orgel: false };
export function music(name) {
  if (!SONGS[name] || song === SONGS[name]) return;
  song = SONGS[name]; step = 0;
  if (ac) next = ac.currentTime + 0.1;
  songBpm = song.bpm; songT0 = ac ? next : -1;     // -1: no audio yet, the clock starts with the first note
}
function schedule() {
  if (!ac || !song || ac.state !== 'running') return;
  const s = song, eighth = 60 / s.bpm / 2;
  if (next < ac.currentTime) { next = ac.currentTime + 0.05; if (songT0 >= 0) songT0 = next - step * eighth; }   // fell behind (tab hidden): keep the beat in step
  if (songT0 < 0) songT0 = next;
  while (next < ac.currentTime + 0.25) {
    const bar = Math.floor(step / 8) % s.chords.length, chord = s.chords[bar], pos = step % 8;
    const notes = [...chord, chord[0] + 12];
    tone(N(notes[s.arp[pos] % notes.length] + 12, s.root), eighth * 1.6, { type: s.lead, vol: s.arpVol, when: next, bus: musicBus });
    if (pos === 0) chord.forEach((c) => tone(N(c, s.root), eighth * 8, { type: s.pad, vol: 0.05, when: next, bus: musicBus, attack: eighth * 2 }));
    if (pos % 4 === 0) tone(N(chord[0] - 12, s.root), eighth * 3, { type: s.bass, vol: 0.12, when: next, bus: musicBus });
    if (s.party) {
      if (layers.drum) { if (pos % 4 === 0) tone(110, 0.18, { type: 'sine', to: 40, vol: 0.5, when: next, bus: musicBus }); if (pos % 4 === 2) noise(0.12, { vol: 0.25, freq: 2200, type: 'bandpass', q: 0.8, when: next, bus: musicBus }); if (pos % 2 === 1) noise(0.03, { vol: 0.08, freq: 7000, type: 'highpass', when: next, bus: musicBus }); }
      if (layers.tuba && pos % 2 === 0) tone(N(chord[(pos / 2) % chord.length] - 24, s.root), eighth * 1.6, { type: 'sawtooth', vol: 0.06, when: next, bus: musicBus, attack: 0.02 });
      if (layers.bel && pos % 2 === 0) tone(N(notes[(s.arp[pos] + 2) % notes.length] + 24, s.root), eighth * 3, { type: 'sine', vol: 0.05, when: next, bus: musicBus });
      if (layers.orgel && pos === 0) chord.forEach((c) => tone(N(c + 12, s.root), eighth * 7, { type: 'square', vol: 0.025, when: next, bus: musicBus, attack: 0.05 }));
    }
    next += eighth; step++;
  }
}
// de Schroothoop
export const zap = () => { tone(1400, 0.25, { type: 'sawtooth', to: 200, vol: 0.06 }); noise(0.2, { vol: 0.12, freq: 4000, to: 1500, type: 'bandpass', q: 3 }); };
export const clank = () => { tone(620, 0.25, { type: 'triangle', to: 580, vol: 0.12 }); tone(931, 0.3, { type: 'square', to: 900, vol: 0.04 }); noise(0.08, { vol: 0.2, freq: 3000, type: 'highpass' }); };
export const hack = () => [0, 1, 0, 1, 6, 7].forEach((s, i) => tone(N(s * 2, 220), 0.07, { type: 'square', vol: 0.07, at: i * 0.07 }));
export const whir = () => tone(90, 1.2, { type: 'sawtooth', to: 260, vol: 0.06, attack: 0.3 });
// het Galmfeest: a xylophone key, a gong, a big sound blast
export const note = (semi) => { tone(N(semi, 523.25), 0.5, { type: 'sine', vol: 0.18 }); tone(N(semi + 12, 523.25), 0.15, { type: 'triangle', vol: 0.05 }); };
export const gong = () => { [0, 7, 12].forEach((s, i) => tone(N(s, 110), 2.2, { type: 'sine', vol: 0.18 - i * 0.04, attack: 0.01 })); noise(0.4, { vol: 0.2, freq: 900, type: 'bandpass', q: 2 }); };
export const galm = () => { tone(180, 0.5, { type: 'sawtooth', to: 120, vol: 0.12, attack: 0.02 }); tone(360, 0.5, { type: 'square', to: 240, vol: 0.05, attack: 0.02 }); noise(0.35, { vol: 0.15, freq: 600, to: 2000, type: 'bandpass', q: 1 }); };
export const sneeze = () => { noise(0.12, { vol: 0.2, freq: 3000, type: 'highpass' }); tone(500, 0.1, { type: 'triangle', to: 900, vol: 0.06 }); noise(0.4, { vol: 0.45, freq: 2500, to: 800, type: 'bandpass', q: 0.7, at: 0.3 }); };
export const jingle = () => { noise(0.18, { vol: 0.12, freq: 8000, type: 'highpass' }); tone(N(19, 523.25), 0.08, { type: 'triangle', vol: 0.03 }); };
export const chime = () => [0, 4, 7, 12, 16].forEach((s, i) => tone(N(s, 523.25), 0.25, { type: 'sine', vol: 0.06, at: i * 0.05 }));
