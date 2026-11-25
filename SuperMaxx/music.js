import { actx, noiseBuf, musicBus, impulse, onAudioReady, m2f } from './audio.js?v=20261126f';

// Procedural soundtrack: each track is a set of 8-bar sections (chords, drum pattern,
// bass style, lead density) played in a long form, so a loop runs about 3 minutes.
// Melodies come from a seeded generator, so every track sounds the same every time.

const SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], mixo: [0, 2, 4, 5, 7, 9, 10] };

// 16 steps per bar. k kick, s snare, h hat, o open hat, t tom
const DRUMS = {
  light: { k: 'x.......x.......', h: '..x...x...x...x.' },
  groove: { k: 'x.....x...x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
  drive: { k: 'x...x...x...x...', s: '....x.......x..x', h: 'xxxxxxxxxxxxxxxx', o: '..x...x...x...x.' },
  half: { k: 'x.........x.....', s: '........x.......', h: 'x...x...x...x...' },
  latin: { k: 'x..x..x...x..x..', s: '...x..x....x..x.', h: 'x.xxx.xxx.xxx.xx' },
  boom: { k: 'x......x..x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.xx' },
  taiko: { k: 'x.....x.x.......', s: '....x.......x...', h: '..x...x...x...x.', t: 'x..x..x.x...x.x.' },
};
const FILL = '....x.x.xxxxxxxx';

// Sections: p chord degrees (each takes 8 / p.length bars), d drums, b bass, l lead density,
// a arpeggio (0 off, 1 eighths, 2 sixteenths), pad on/off. A '+' in the form lifts the lead an octave.
export const TRACKS = {
  menu: {                                  // Golden Hour: bright, bouncy theme
    bpm: 116, root: 50, scale: 'major', swing: 0.06,
    lead: { type: 'square', cut: 2600, v: 0.045, vib: 1 }, bass: { type: 'sawtooth', cut: 700 }, arp: { type: 'triangle', cut: 3000 }, pad: { type: 'sawtooth', cut: 1200 },
    sections: {
      intro: { p: [0, 4, 5, 3], b: 'long', l: 0, a: 1, pad: 1 },
      A: { p: [0, 4, 5, 3], d: 'groove', b: 'walk', l: 0.6, a: 1, pad: 1 },
      B: { p: [5, 3, 0, 4], d: 'groove', b: 'octave', l: 0.75, a: 2, pad: 1 },
      C: { p: [3, 4, 2, 5], d: 'half', b: 'long', l: 0.35, a: 1, pad: 1 },
      D: { p: [3, 0, 4, 5], d: 'drive', b: 'octave', l: 0.9, a: 2, pad: 1 },
    },
    form: ['intro', 'A', 'A+', 'B', 'D', 'C', 'A+', 'B+', 'D', 'D+', 'intro'],
  },
  plaza: {                                 // Solmare Siesta: seaside mandolin and shakers
    bpm: 124, root: 53, scale: 'mixo', swing: 0.04,
    lead: { type: 'sawtooth', cut: 3200, v: 0.04, pluck: 1, trem: 1 }, bass: { type: 'triangle', cut: 900 }, arp: { type: 'sawtooth', cut: 1800, pluck: 1 }, pad: { type: 'triangle', cut: 1600 },
    sections: {
      intro: { p: [0, 6, 0, 6], d: 'light', b: 'root', l: 0, a: 1, pad: 1 },
      A: { p: [0, 6, 3, 0], d: 'latin', b: 'walk', l: 0.6, a: 1, pad: 0 },
      B: { p: [3, 0, 6, 4], d: 'latin', b: 'octave', l: 0.75, a: 2, pad: 1 },
      C: { p: [5, 3, 6, 0], d: 'half', b: 'long', l: 0.4, a: 1, pad: 1 },
      D: { p: [3, 4, 0, 6], d: 'drive', b: 'octave', l: 0.85, a: 2, pad: 1 },
    },
    form: ['intro', 'A', 'B', 'A+', 'D', 'C', 'B+', 'D+', 'A', 'C', 'D', 'intro'],
  },
  canals: {                                // Lantern Canals: slow lo-fi night with an ocarina
    bpm: 88, root: 50, scale: 'dorian', swing: 0.18,
    lead: { type: 'triangle', cut: 2000, v: 0.06, vib: 1, a: 0.03 }, bass: { type: 'sine', cut: 600 }, arp: { type: 'sine', cut: 2400, pluck: 1 }, pad: { type: 'sawtooth', cut: 800 },
    sections: {
      intro: { p: [0, 3, 0, 3], b: 'long', l: 0, a: 1, pad: 1 },
      A: { p: [0, 3, 6, 4], d: 'boom', b: 'root', l: 0.5, a: 1, pad: 1 },
      B: { p: [2, 3, 4, 3], d: 'boom', b: 'walk', l: 0.65, a: 1, pad: 1 },
      C: { p: [5, 4, 3, 4], d: 'half', b: 'long', l: 0.3, a: 2, pad: 1 },
      D: { p: [0, 6, 5, 3], d: 'boom', b: 'octave', l: 0.75, a: 2, pad: 1 },
    },
    form: ['intro', 'A', 'A+', 'B', 'C', 'D', 'A+', 'B+', 'D+', 'intro'],
  },
  terraces: {                              // Mossgarden Ruins: temple flute, koto and taiko
    bpm: 98, root: 45, scale: 'minor', swing: 0,
    lead: { type: 'sine', cut: 4000, v: 0.07, vib: 1, a: 0.05 }, bass: { type: 'triangle', cut: 700 }, arp: { type: 'triangle', cut: 2600, pluck: 1 }, pad: { type: 'sawtooth', cut: 900 },
    sections: {
      intro: { p: [0, 0, 5, 5], d: 'half', b: 'long', l: 0, a: 1, pad: 1 },
      A: { p: [0, 5, 3, 4], d: 'taiko', b: 'root', l: 0.55, a: 1, pad: 1 },
      B: { p: [5, 6, 0, 4], d: 'taiko', b: 'walk', l: 0.7, a: 2, pad: 1 },
      C: { p: [3, 4, 0, 0], d: 'half', b: 'long', l: 0.3, a: 1, pad: 1 },
      D: { p: [0, 3, 6, 4], d: 'drive', b: 'octave', l: 0.9, a: 2, pad: 1 },
    },
    form: ['intro', 'A', 'B', 'A+', 'C', 'D', 'B+', 'D+', 'C', 'intro'],
  },
  frostpeak: {                             // Frostpeak Lodge: sleigh bells and a cosy waltz-time bounce
    bpm: 108, root: 52, scale: 'major', swing: 0.1,
    lead: { type: 'triangle', cut: 4200, v: 0.06, vib: 1, pluck: 1 }, bass: { type: 'triangle', cut: 800 }, arp: { type: 'sine', cut: 5000, pluck: 1 }, pad: { type: 'sawtooth', cut: 900 },
    sections: {
      intro: { p: [0, 3, 0, 4], d: 'light', b: 'long', l: 0, a: 2, pad: 1 },
      A: { p: [0, 5, 3, 4], d: 'groove', b: 'walk', l: 0.6, a: 2, pad: 1 },
      B: { p: [3, 4, 2, 5], d: 'groove', b: 'octave', l: 0.7, a: 1, pad: 1 },
      C: { p: [5, 3, 0, 4], d: 'half', b: 'long', l: 0.35, a: 2, pad: 1 },
      D: { p: [0, 4, 5, 3], d: 'drive', b: 'octave', l: 0.9, a: 2, pad: 1 },
    },
    form: ['intro', 'A', 'A+', 'B', 'C', 'D', 'A+', 'B+', 'D+', 'C', 'intro'],
  },
  island: {                                // Storm Drop: driving, tense survivor music
    bpm: 132, root: 45, scale: 'minor', swing: 0,
    lead: { type: 'sawtooth', cut: 3000, v: 0.035, det: 10 }, bass: { type: 'sawtooth', cut: 500 }, arp: { type: 'square', cut: 1500, pluck: 1 }, pad: { type: 'sawtooth', cut: 1000 },
    sections: {
      intro: { p: [0, 0, 5, 5], d: 'half', b: 'pulse', l: 0, a: 2, pad: 1 },
      A: { p: [0, 5, 2, 6], d: 'drive', b: 'pulse', l: 0.6, a: 2, pad: 1 },
      B: { p: [5, 3, 0, 4], d: 'groove', b: 'octave', l: 0.75, a: 1, pad: 1 },
      C: { p: [3, 4, 5, 5], d: 'half', b: 'long', l: 0.35, a: 2, pad: 1 },
      D: { p: [5, 6, 0, 0], d: 'drive', b: 'pulse', l: 0.95, a: 2, pad: 1 },
    },
    form: ['intro', 'A', 'B', 'A+', 'D', 'C', 'B+', 'D', 'A+', 'D+', 'C', 'intro'],
  },
};

// ---------- note helpers ----------
const scaleOf = tr => SCALES[tr.scale];
function midiOf(tr, d, oct = 0) { const s = scaleOf(tr), n = s.length, o = Math.floor(d / n); return tr.root + (oct + o) * 12 + s[((d % n) + n) % n]; }
function snap(tr, d, c) {                              // nearest chord tone (root, third, fifth)
  const n = scaleOf(tr).length;
  for (let k = 0; k < n; k++) for (const s of [d - k, d + k]) if ([0, 2, 4].includes((((s - c) % n) + n) % n)) return s;
  return d;
}
const rng = seed => () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
const hash = s => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };

// Melody for one section: a 2-bar motif, an answer, the motif again, then a cadence.
function melody(tr, id, name, sec) {
  const R = rng(hash(id + name)), out = new Array(128).fill(null);
  if (!sec.l) return out;
  const rhythm = end => {
    const hits = [];
    for (let s = 0; s < 32; s += 2) {
      if (s === 0 || R() < sec.l * (s % 8 === 0 ? 0.95 : 0.55)) hits.push(s);
      else if (R() < 0.12 * sec.l) hits.push(s + 1);
    }
    if (end) return hits.filter(s => s < 20).concat([24]);
    return hits;
  };
  const contour = hits => { let d = 0; return hits.map(() => (d += Math.round((R() - 0.5) * 4))); };
  const r1 = rhythm(false), c1 = contour(r1), r2 = rhythm(false), c2 = contour(r2), r3 = rhythm(true), c3 = contour(r3);
  const chordAt = bar => sec.p[Math.floor(bar / (8 / sec.p.length))];
  const n = scaleOf(tr).length;
  const render = (bar0, hits, cont, cad) => hits.forEach((s, i) => {
    const step = bar0 * 16 + s, c = chordAt(bar0 + (s >= 16 ? 1 : 0));
    let d = c + n + cont[i];
    while (d > c + n * 2) d -= n; while (d < c) d += n;
    if (s % 8 === 0) d = snap(tr, d, c);
    if (cad && i === hits.length - 1) d = c + n;
    const next = hits[i + 1] ?? 32;
    out[step] = { d, len: Math.min(next - s, cad && i === hits.length - 1 ? 8 : 6) };
  });
  render(0, r1, c1); render(2, r2, c2); render(4, r1, c1); render(6, r3, c3, true);
  return out;
}

// ---------- instruments ----------
function voice(c, f, t, dur, o) {
  const g = actx.createGain(), flt = actx.createBiquadFilter();
  const a = o.a ?? 0.01, r = o.r ?? 0.12, v = o.v;
  flt.type = 'lowpass'; flt.frequency.setValueAtTime(o.cut || 3000, t); flt.Q.value = o.q ?? 0.8;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + a);
  if (o.pluck) { flt.frequency.exponentialRampToValueAtTime(Math.max(200, (o.cut || 3000) * 0.2), t + dur + r); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + r); }
  else { g.gain.setValueAtTime(v, t + Math.max(a + 0.002, dur)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + r); }
  const end = t + dur + r + 0.05;
  const oscs = (o.det ? [-o.det, o.det] : [0]).map(dt => { const x = actx.createOscillator(); x.type = o.type; x.frequency.value = f; x.detune.value = dt; x.connect(flt); x.start(t); x.stop(end); return x; });
  if (o.vib) { const l = actx.createOscillator(), lg = actx.createGain(); l.frequency.value = 5.2; lg.gain.value = f * 0.01; l.connect(lg); oscs.forEach(x => lg.connect(x.frequency)); l.start(t + 0.12); l.stop(end); }
  flt.connect(g).connect(c.out);
  if (o.wet) { const s = actx.createGain(); s.gain.value = o.wet; g.connect(s).connect(c.wet); }
}
function hit(c, t, dur, v, type, freq, q = 1, wet = 0) {
  const s = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain();
  s.buffer = noiseBuf; f.type = type; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(c.out);
  if (wet) { const w = actx.createGain(); w.gain.value = wet; g.connect(w).connect(c.wet); }
  s.start(t, Math.random() * 0.8, dur + 0.02);
}
function drum(c, t, f0, f1, dur, v) {
  const o = actx.createOscillator(), g = actx.createGain();
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.4);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.out); o.start(t); o.stop(t + dur + 0.02);
}
const KIT = {
  k: (c, t) => drum(c, t, 150, 42, 0.32, 0.55),
  s: (c, t) => { hit(c, t, 0.16, 0.22, 'bandpass', 1800, 0.8, 0.3); drum(c, t, 200, 150, 0.08, 0.12); },
  h: (c, t) => hit(c, t, 0.035, 0.07, 'highpass', 7500),
  o: (c, t) => hit(c, t, 0.18, 0.05, 'highpass', 6500),
  t: (c, t) => drum(c, t, 130, 85, 0.3, 0.35),
};

// ---------- playback ----------
let cur = null, want = null, timer = null;
const sixteenth = tr => 60 / tr.bpm / 4;

function playStep(c, step, t) {
  const tr = c.tr, bar = Math.floor(step / 16), s = step % 16;
  const fi = Math.floor(bar / 8) % tr.form.length, tag = tr.form[fi], name = tag.replace('+', ''), lift = tag.includes('+');
  const sec = tr.sections[name], b8 = bar % 8, cb = 8 / sec.p.length, chord = sec.p[Math.floor(b8 / cb)];
  const st = sixteenth(tr);
  // drums, with a fill leading into the next section
  const pat = DRUMS[sec.d];
  if (pat) for (const k of Object.keys(pat)) {
    const line = k === 's' && b8 === 7 && s >= 4 ? FILL : pat[k];
    if (line[s] === 'x') KIT[k](c, t);
  }
  // bass
  const root = midiOf(tr, chord, -1), fifth = midiOf(tr, chord + 4, -1), bo = tr.bass;
  const B = (n, len) => voice(c, m2f(n), t, len * st, { type: bo.type, cut: bo.cut, v: 0.16, r: 0.06 });
  if (sec.b === 'long' && s === 0 && b8 % cb === 0) B(root, cb * 16 - 1);
  if (sec.b === 'root' && (s === 0 || s === 10)) B(root, s ? 5 : 8);
  if (sec.b === 'walk' && s % 4 === 0) B([root, fifth, root + 12, midiOf(tr, chord + 1, -1)][s / 4], 3);
  if (sec.b === 'octave' && s % 2 === 0) B(s % 4 ? root + 12 : root, 1.5);
  if (sec.b === 'pulse') B(s === 0 || s === 8 ? root : s % 2 ? fifth : root, 0.8);
  // pad: the chord held for its whole length
  if (sec.pad && s === 0 && b8 % cb === 0) {
    const po = tr.pad, len = cb * 16 * st;
    for (const k of [0, 2, 4]) voice(c, m2f(midiOf(tr, chord + k)), t, len - 0.1, { type: po.type, cut: po.cut, v: 0.022, a: 0.6, r: 1.2, det: 7, wet: 0.5 });
  }
  // arpeggio over the chord tones
  if (sec.a && s % (sec.a === 2 ? 1 : 2) === 0) {
    const ao = tr.arp, i = sec.a === 2 ? s : s / 2, k = [0, 2, 4, 7, 4, 2][i % 6];
    voice(c, m2f(midiOf(tr, chord + k, 1)), t, st * 0.9, { type: ao.type, cut: ao.cut, v: 0.028, pluck: ao.pluck, r: 0.15, wet: 0.35 });
  }
  // lead
  const note = c.mel[name][b8 * 16 + s];
  if (note) {
    const lo = tr.lead, f = m2f(midiOf(tr, note.d, lift ? 1 : 0));
    const o = { type: lo.type, cut: lo.cut, v: lo.v, vib: lo.vib, det: lo.det, a: lo.a, pluck: lo.pluck, r: 0.18, wet: 0.3 };
    if (lo.trem && note.len > 2) for (let k = 0; k < note.len; k++) voice(c, f, t + k * st, st * 0.8, { ...o, v: lo.v * (k ? 0.7 : 1) });
    else voice(c, f, t, note.len * st * 0.92, o);
    if (lift) voice(c, f * 0.5, t, note.len * st * 0.9, { ...o, v: lo.v * 0.5 });   // octave doubling on the reprise
  }
}

function tick() {
  if (!cur) return;
  const st = sixteenth(cur.tr), now = actx.currentTime;
  if (cur.nextT < now - 0.1) cur.nextT = now + 0.05;            // tab was in the background: skip ahead
  while (cur.nextT < now + 0.2) {
    const sw = cur.step % 2 ? cur.tr.swing * st : 0;
    playStep(cur, cur.step, cur.nextT + sw);
    cur.nextT += st; cur.step++;
  }
}

function start(id) {
  const tr = TRACKS[id] || TRACKS.menu, now = actx.currentTime;
  if (cur) {                                                     // fade the old track out
    const old = cur; old.out.gain.cancelScheduledValues(now);
    old.out.gain.setValueAtTime(old.out.gain.value, now); old.out.gain.linearRampToValueAtTime(0.0001, now + 1.2);
    setTimeout(() => old.out.disconnect(), 3500);
  }
  const out = actx.createGain(); out.gain.setValueAtTime(0.0001, now); out.gain.linearRampToValueAtTime(1, now + 1.5); out.connect(musicBus);
  const verb = actx.createConvolver(); verb.buffer = impulse; verb.connect(out);
  const wet = actx.createGain(); wet.gain.value = 0.6; wet.connect(verb);
  const mel = {}; for (const [n, sec] of Object.entries(tr.sections)) mel[n] = melody(tr, id, n, sec);
  cur = { id, tr, out, wet, mel, step: 0, nextT: now + 0.1 };
  if (!timer) timer = setInterval(tick, 25);
}

// Play a track by id ('menu' or a map id). Safe to call before audio is unlocked.
export function playMusic(id) {
  if (want === id && cur?.id === id) return;
  want = id;
  if (actx) start(id); else onAudioReady(() => want && !cur && start(want));
}
