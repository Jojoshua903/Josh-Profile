// Tiny Web Audio synth: sound effects and a step sequencer score.
let ctx = null, master, music, sfx, noise; const VOL = { master: 0.55, music: 0.2, sfx: 0.55 };
let track = null, nextT = 0, step = 0;
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

const TRACKS = {
  title: { bpm: 112, root: 50, bass: [0, null, 0, null, 7, null, 7, null, 9, null, 9, null, 5, null, 7, null], arp: [12, 16, 19, 24, 19, 16, 12, 16, 14, 17, 21, 26, 21, 17, 19, 23], hat: false, kick: 8 },
  stage: { bpm: 138, root: 45, bass: [0, 0, 12, 0, 0, 12, 0, 10, 0, 0, 12, 0, 7, 7, 10, 12, 5, 5, 17, 5, 5, 17, 5, 15, 7, 7, 19, 7, 10, 10, 12, 14], arp: [24, null, 27, null, 31, null, 27, 29, 24, null, 31, null, 34, 31, 29, 27], hat: true, kick: 4 },
  boss: { bpm: 150, root: 40, bass: [0, 0, 1, 0, 0, 1, 0, 6, 0, 0, 1, 0, 7, 6, 3, 1], arp: [24, 25, 31, 24, 25, 30, 24, 27, 24, 25, 31, 24, 34, 31, 30, 27], hat: true, kick: 4 },
  cine: { bpm: 84, root: 48, bass: [0, null, null, null, null, null, null, null, 5, null, null, null, null, null, 7, null], arp: [12, null, 19, null, 16, null, 19, null, 17, null, 21, null, 19, null, 23, null], hat: false, kick: 0 },
};

function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
function osc(type, f, t, dur, vol, dest, slide) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
  env(g, t, 0.005, vol, dur); o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05);
}
function burst(t, dur, vol, freq, dest, q = 1) {
  const s = ctx.createBufferSource(); s.buffer = noise;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(freq, t); f.frequency.exponentialRampToValueAtTime(80, t + dur); f.Q.value = q;
  const g = ctx.createGain(); env(g, t, 0.005, vol, dur);
  s.connect(f); f.connect(g); g.connect(dest); s.start(t); s.stop(t + dur + 0.05);
}

export const Sound = {
  init() {
    if (ctx) { ctx.resume(); return; }
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = VOL.master; master.connect(ctx.destination);
    music = ctx.createGain(); music.gain.value = VOL.music; music.connect(master);
    sfx = ctx.createGain(); sfx.gain.value = VOL.sfx; sfx.connect(master);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  },
  get on() { return !!ctx; },
  setVolumes(m, mu, s) { VOL.master = 0.7 * m; VOL.music = 0.34 * mu; VOL.sfx = 0.7 * s; if (ctx) { master.gain.value = VOL.master; music.gain.value = VOL.music; sfx.gain.value = VOL.sfx; } },
  duck(on) { if (ctx) music.gain.setTargetAtTime(on ? VOL.music * 0.3 : VOL.music, ctx.currentTime, 0.1); },
  laser() { if (!ctx) return; const t = ctx.currentTime; osc('square', 1500, t, 0.1, 0.12, sfx, 420); },
  charge() { if (!ctx) return; const t = ctx.currentTime; osc('sawtooth', 200, t, 0.5, 0.06, sfx, 900); },
  nova() { if (!ctx) return; const t = ctx.currentTime; osc('sawtooth', 900, t, 0.45, 0.2, sfx, 90); burst(t, 0.3, 0.2, 3000, sfx); },
  boom(big = 1) { if (!ctx) return; const t = ctx.currentTime; burst(t, 0.35 * big + 0.2, 0.35 * Math.min(big, 2), 1800, sfx); osc('sine', 120, t, 0.3 * big, 0.3, sfx, 30); },
  hurt() { if (!ctx) return; const t = ctx.currentTime; osc('square', 180, t, 0.25, 0.22, sfx, 60); burst(t, 0.2, 0.2, 900, sfx); },
  deflect() { if (!ctx) return; const t = ctx.currentTime; osc('triangle', 2400, t, 0.12, 0.15, sfx, 3600); },
  pickup() { if (!ctx) return; const t = ctx.currentTime; [0, 4, 7, 12].forEach((n, i) => osc('triangle', mtof(76 + n), t + i * 0.06, 0.12, 0.15, sfx)); },
  roll() { if (!ctx) return; const t = ctx.currentTime; burst(t, 0.4, 0.12, 4000, sfx, 6); },
  blip() { if (!ctx) return; const t = ctx.currentTime; osc('square', 1800 + Math.random() * 300, t, 0.025, 0.03, sfx); },
  alarm() { if (!ctx) return; const t = ctx.currentTime; for (let i = 0; i < 3; i++) osc('square', 880, t + i * 0.3, 0.15, 0.1, sfx, 660); },
  music(name) { if (!ctx) { track = TRACKS[name] || null; return; } if (track === TRACKS[name]) return; track = TRACKS[name] || null; step = 0; nextT = ctx.currentTime + 0.05; },
  tick() {
    if (!ctx || !track) return;
    const st = 60 / track.bpm / 4;
    if (nextT < ctx.currentTime - 0.5) nextT = ctx.currentTime;
    while (nextT < ctx.currentTime + 0.12) {
      const b = track.bass[step % track.bass.length], a = track.arp[step % track.arp.length];
      if (b !== null && b !== undefined) osc('sawtooth', mtof(track.root + b), nextT, st * 1.6, 0.3, music);
      if (a !== null && a !== undefined) osc(track === TRACKS.cine ? 'sine' : 'square', mtof(track.root + a), nextT, st * (track === TRACKS.cine ? 3 : 0.8), track === TRACKS.cine ? 0.18 : 0.08, music);
      if (track.kick && step % track.kick === 0) osc('sine', 150, nextT, 0.18, 0.5, music, 40);
      if (track.hat && step % 2 === 1) burst(nextT, 0.04, 0.12, 9000, music);
      step++; nextT += st;
    }
  },
};
