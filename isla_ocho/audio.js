// Web Audio: sound effects, a procedural island music loop and ocean ambience.
let actx = null, master, sfxBus, musicBus, ambBus;
let musicOn = localStorage.getItem('widr-music') !== '0';
let sfxOn = localStorage.getItem('widr-sfx') !== '0';

export function audio() {
  if (!actx) {
    actx = new (window.AudioContext || window.webkitAudioContext)();
    const comp = actx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3;
    master = actx.createGain(); master.gain.value = 0.9; master.connect(comp).connect(actx.destination);
    sfxBus = actx.createGain(); sfxBus.gain.value = sfxOn ? 1 : 0; sfxBus.connect(master);
    musicBus = actx.createGain(); musicBus.gain.value = musicOn ? 0.55 : 0; musicBus.connect(master);
    ambBus = actx.createGain(); ambBus.gain.value = sfxOn ? 1 : 0; ambBus.connect(master);
    startAmbient(); startMusic();
  }
  if (actx.state === 'suspended') actx.resume();
  return actx;
}
export const isMusicOn = () => musicOn, isSfxOn = () => sfxOn;
export function setMusic(on) { musicOn = on; localStorage.setItem('widr-music', on ? '1' : '0'); if (musicBus) musicBus.gain.setTargetAtTime(on ? 0.55 : 0, actx.currentTime, 0.2); }
export function setSfx(on) { sfxOn = on; localStorage.setItem('widr-sfx', on ? '1' : '0'); if (sfxBus) { sfxBus.gain.value = on ? 1 : 0; ambBus.gain.value = on ? 1 : 0; } }

function tone(f, d, type = 'sine', vol = 0.18, slide = 0, delay = 0, dest = sfxBus) {
  const a = actx, t = a.currentTime + delay;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t + d);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g).connect(dest); o.start(t); o.stop(t + d + 0.05);
}
let noiseBuf = null;
function nbuf() {
  if (!noiseBuf) { const len = actx.sampleRate * 2; noiseBuf = actx.createBuffer(1, len, actx.sampleRate); const ch = noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1; }
  return noiseBuf;
}
function noise(d, vol = 0.15, freq = 1200, type = 'bandpass', delay = 0, dest = sfxBus, q = 1) {
  const t = actx.currentTime + delay;
  const s = actx.createBufferSource(); s.buffer = nbuf();
  const f = actx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = actx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  s.connect(f).connect(g).connect(dest); s.start(t, Math.random()); s.stop(t + d + 0.05);
}
export const SFX = {
  hit: () => { tone(620, 0.07, 'triangle', 0.2); noise(0.05, 0.16, 3000); },
  thud: () => { tone(110, 0.22, 'sine', 0.32, 0.45); noise(0.14, 0.12, 300, 'lowpass'); },
  whoosh: () => { noise(0.32, 0.14, 700, 'bandpass', 0, sfxBus, 0.7); noise(0.22, 0.08, 1800, 'bandpass', 0.05); },
  score: () => { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.22, 'triangle', 0.1, 0, i * 0.07)); },
  miss: () => { tone(392, 0.25, 'sawtooth', 0.05, 0.75); tone(330, 0.4, 'sawtooth', 0.05, 0.7, 0.18); },
  slice: () => { noise(0.14, 0.22, 4200, 'highpass'); tone(1400, 0.08, 'triangle', 0.08, 1.8); },
  boom: () => { noise(0.9, 0.42, 160, 'lowpass'); tone(70, 0.6, 'sine', 0.4, 0.4); },
  pop: () => { tone(900, 0.09, 'sine', 0.2, 2.2); noise(0.04, 0.1, 2500); },
  cheer: () => {
    for (let i = 0; i < 6; i++) noise(1.2 + Math.random() * 0.6, 0.06, 900 + Math.random() * 1600, 'bandpass', i * 0.05, sfxBus, 2);
    tone(1800, 0.25, 'sine', 0.05, 1.3, 0.1); tone(2000, 0.3, 'sine', 0.04, 1.4, 0.45);
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, 'square', 0.045, 0, i * 0.09));
  },
  click: () => tone(1300, 0.04, 'square', 0.05),
  splash: () => { noise(0.5, 0.18, 900, 'lowpass'); noise(0.3, 0.1, 3000, 'highpass', 0.05); },
};
export function sfx(name) { try { if (actx && sfxOn) SFX[name]?.(); } catch (e) { } }

// ---- ocean ambience: looping filtered noise with a slow swell
function startAmbient() {
  const s = actx.createBufferSource(); s.buffer = nbuf(); s.loop = true;
  const f = actx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 520;
  const g = actx.createGain(); g.gain.value = 0.035;
  const lfo = actx.createOscillator(); lfo.frequency.value = 0.12;
  const lg = actx.createGain(); lg.gain.value = 0.025;
  lfo.connect(lg).connect(g.gain);
  s.connect(f).connect(g).connect(ambBus); s.start(); lfo.start();
}

// ---- music: breezy I–V–vi–IV with marimba, bass, shaker and a steel-drum melody
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
const CHORDS = [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]];
const PENTA = [72, 74, 76, 79, 81, 84];
function marimba(f, t, v) {
  const o = actx.createOscillator(), o2 = actx.createOscillator(), g = actx.createGain();
  o.frequency.value = f; o2.frequency.value = f * 4; o2.type = 'sine';
  const g2 = actx.createGain(); g2.gain.value = 0.15;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
  o.connect(g); o2.connect(g2).connect(g); g.connect(musicBus);
  o.start(t); o2.start(t); o.stop(t + 0.55); o2.stop(t + 0.55);
}
function steel(f, t, v) {
  [1, 2, 2.98].forEach((m, i) => {
    const o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = f * m;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v / (i + 1.4), t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7 - i * 0.15);
    o.connect(g).connect(musicBus); o.start(t); o.stop(t + 0.75);
  });
}
function bass(f, t) {
  const o = actx.createOscillator(), g = actx.createGain(); o.type = 'triangle'; o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.22, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
  o.connect(g).connect(musicBus); o.start(t); o.stop(t + 0.4);
}
function shaker(t, v) {
  const s = actx.createBufferSource(); s.buffer = nbuf();
  const f = actx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
  const g = actx.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
  s.connect(f).connect(g).connect(musicBus); s.start(t, Math.random()); s.stop(t + 0.08);
}
function startMusic() {
  const step = 60 / 104 / 2;
  let next = actx.currentTime + 0.2, n = 0, lastNote = 76;
  setInterval(() => {
    if (!musicOn) { next = actx.currentTime + 0.1; return; }
    while (next < actx.currentTime + 0.2) {
      const bar = Math.floor(n / 8) % 4, s = n % 8, ch = CHORDS[bar];
      if (s === 0 || s === 3 || s === 6) bass(midi(ch[0] - 24 + (s === 3 ? 7 : 0)), next);
      if (s === 2 || s === 6) ch.forEach((c) => marimba(midi(c), next, 0.05));
      if (s === 4) marimba(midi(ch[2] + 12), next, 0.035);
      shaker(next, s % 2 ? 0.05 : 0.025);
      const phrase = Math.floor(n / 32) % 2;
      if (phrase === 1 && Math.random() < (s % 2 ? 0.35 : 0.6)) {
        let i = PENTA.indexOf(lastNote); i = Math.max(0, Math.min(PENTA.length - 1, i + Math.floor(Math.random() * 3) - 1));
        lastNote = PENTA[i]; steel(midi(lastNote), next, 0.06);
      }
      next += step; n++;
    }
  }, 50);
}
