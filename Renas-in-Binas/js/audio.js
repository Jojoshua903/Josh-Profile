// Little synth: sound effects plus a step sequencer for each planet's music. No samples, all made here.
let ac = null, master, musicGain, sfxGain, noiseBuf, shaper;
let pending = null, broken = false;
export function initAudio() {
  if (ac) { if (ac.state === 'suspended') ac.resume().catch(() => {}); return; }
  if (broken) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  // if the browser won't give us sound, the game just stays silent: the buttons must keep working
  try {
    ac = new AC();
    master = ac.createGain(); master.gain.value = 0.8; master.connect(ac.destination);
    musicGain = ac.createGain(); musicGain.gain.value = 0.3; musicGain.connect(master);
    sfxGain = ac.createGain(); sfxGain.gain.value = 0.55; sfxGain.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    shaper = ac.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) { const x = (i / 128) - 1; curve[i] = Math.tanh(x * 3.2); }
    shaper.curve = curve; shaper.connect(musicGain);
  } catch (e) { ac = null; broken = true; setTimeout(() => { throw e; }); return; }
  // a music problem must never stop a button from working: report it, but carry on
  if (pending) { const p = pending; pending = null; try { music(p); } catch (e) { setTimeout(() => { throw e; }); } }
}
export function setVolume(m, s) { if (!ac) return; musicGain.gain.value = m; sfxGain.gain.value = s; }
export const audioOn = () => !!ac;

function tone(freq, dur, type = 'square', vol = 0.2, slideTo = null, when = 0, dest = null) {
  if (!ac) return;
  const t0 = dest ? Math.max(when, ac.currentTime) : ac.currentTime + when;   // music passes absolute times (with a dest)
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(dest || sfxGain);
  o.start(t0); o.stop(t0 + dur + 0.03);
}
function noise(dur, vol, freq = 1200, type = 'lowpass', when = 0, dest = null, q = 1) {
  if (!ac) return;
  const t0 = dest ? Math.max(when, ac.currentTime) : ac.currentTime + when;   // music passes absolute times (with a dest)
  const s = ac.createBufferSource(); s.buffer = noiseBuf;
  const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ac.createGain(); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(f); f.connect(g); g.connect(dest || sfxGain);
  s.start(t0, Math.random() * 0.5); s.stop(t0 + dur + 0.03);
}

// the two loudest pitches in each vowel: these make a mumble sound like a voice
const VOWELS = { a: [800, 1250], e: [480, 1950], i: [320, 2450], o: [520, 900], u: [340, 760] };
export const sfx = {
  jump(n = 1) { tone(320 + n * 80, 0.15, 'square', 0.08, 620 + n * 170); },
  airJump() { noise(0.18, 0.2, 1800, 'bandpass'); tone(500, 0.14, 'triangle', 0.08, 1100); },
  longJump() { tone(260, 0.25, 'square', 0.08, 700); noise(0.2, 0.12, 900); },
  land() { noise(0.07, 0.12, 700); },
  coin() { tone(988, 0.07, 'square', 0.07); tone(1319, 0.16, 'square', 0.07, null, 0.06); },
  rare() { [0, 4, 7, 12, 16].forEach((s, i) => tone(523 * 2 ** (s / 12), 0.22, 'triangle', 0.12, null, i * 0.07)); },
  quest() { [0, 7, 12, 19].forEach((s, i) => tone(392 * 2 ** (s / 12), 0.3, 'square', 0.08, null, i * 0.09)); },
  heal() { tone(660, 0.1, 'triangle', 0.1); tone(990, 0.2, 'triangle', 0.1, null, 0.08); },
  hurt() { tone(420, 0.3, 'sawtooth', 0.13, 110); noise(0.15, 0.15, 1200); },
  stomp() { tone(180, 0.12, 'square', 0.14, 620); },
  clank() { tone(900, 0.08, 'square', 0.08, 500); noise(0.1, 0.1, 3000, 'highpass'); },
  pound() { tone(900, 0.2, 'triangle', 0.08, 300); },
  poundLand() { noise(0.3, 0.35, 320); tone(100, 0.3, 'sine', 0.35, 40); },
  spin() { noise(0.22, 0.12, 2600, 'bandpass', 0, null, 3); tone(700, 0.2, 'triangle', 0.05, 1400); },
  swing() { noise(0.12, 0.25, 3000, 'bandpass', 0, null, 2); tone(1400, 0.1, 'square', 0.1, 2400); },
  bossHit() { tone(220, 0.5, 'sawtooth', 0.2, 55); noise(0.4, 0.3, 900); tone(660, 0.25, 'square', 0.08, 1320, 0.05); },
  boom() { noise(0.6, 0.45, 260); tone(70, 0.6, 'sine', 0.45, 30); },
  warn() { tone(880, 0.09, 'square', 0.07); tone(880, 0.09, 'square', 0.07, null, 0.15); },
  blip(p = 520) { tone(p * (0.95 + Math.random() * 0.1), 0.035, 'square', 0.025); },
  // a talking mumble, one syllable at a time (like Animal Crossing). v is the speaker's voice (see voiceOf in cutscene.js).
  // The tone goes through two vowel filters so it sounds like a, e, i, o or u instead of a beep,
  // and the same letter always gets the same note, so a word sounds the same every time it is said.
  mumble(v, ch, ask) {
    if (!ac) return;
    const t0 = ac.currentTime, d = v.d, c = (ch || 'a').toLowerCase();
    const code = c.charCodeAt(0) || 97;
    const vow = 'aeiou'.includes(c) ? c : 'aeiou'[code % 5];
    const f = v.p * 2 ** ((((code * 7) % 9) - 4) * v.range / 12);
    const o = ac.createOscillator(); o.type = v.w;
    o.frequency.setValueAtTime(f * 1.05, t0);
    o.frequency.exponentialRampToValueAtTime(f * (ask ? 1.4 : 0.97), t0 + d);   // a question goes up at the end
    if (v.vib) {
      const l = ac.createOscillator(), lg = ac.createGain();
      l.frequency.value = v.vib; lg.gain.value = f * 0.07; l.connect(lg); lg.connect(o.frequency); l.start(t0); l.stop(t0 + d + 0.05);
    }
    const vol = 0.08 * v.vol, g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
    g.gain.setValueAtTime(vol, t0 + d * 0.55); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    const [f1, f2] = VOWELS[vow], mix = ac.createGain(), dry = ac.createGain();
    mix.gain.value = 2.4; dry.gain.value = v.dry;
    for (const [fr, q] of [[f1, 5], [f2, 7]]) { const b = ac.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = fr * v.fs; b.Q.value = q; o.connect(b); b.connect(mix); }
    o.connect(dry); dry.connect(g); mix.connect(g); g.connect(sfxGain);
    o.start(t0); o.stop(t0 + d + 0.05);
    if (v.growl) noise(d, 0.05 * v.growl, f1 * v.fs, 'bandpass', 0, null, 3);     // rough, raspy voices
    if (v.click) tone(2600, 0.014, 'square', 0.03);                               // robots and clocks tick while they talk
  },
  launch() { noise(1.2, 0.25, 600, 'lowpass'); tone(200, 1.2, 'sawtooth', 0.06, 1200); },
  whoosh() { noise(0.5, 0.2, 1400, 'bandpass', 0, null, 1.5); },
  select() { tone(660, 0.06, 'square', 0.07); tone(990, 0.1, 'square', 0.07, null, 0.05); },
  move() { tone(520, 0.04, 'square', 0.04); },
  sneeze() { noise(0.08, 0.2, 2500, 'highpass', 0); noise(0.35, 0.35, 1800, 'bandpass', 0.18, null, 0.8); tone(500, 0.25, 'sawtooth', 0.06, 200, 0.18); },
  bark() { tone(330, 0.09, 'sawtooth', 0.14, 220); tone(360, 0.09, 'sawtooth', 0.12, 230, 0.16); },
  meow() { tone(620, 0.35, 'triangle', 0.12, 880); tone(880, 0.3, 'triangle', 0.08, 500, 0.25); },
  crack() { noise(0.25, 0.3, 2400, 'highpass'); tone(150, 0.2, 'square', 0.1, 60); },
  thud() { noise(0.25, 0.35, 200); tone(60, 0.25, 'sine', 0.3, 35); },
  win() { [0, 4, 7, 12, 7, 12, 16, 19].forEach((s, i) => tone(392 * 2 ** (s / 12), 0.28, 'square', 0.07, null, i * 0.11)); },
  hap() { tone(160, 0.1, 'square', 0.15, 90); noise(0.08, 0.2, 600, 'lowpass', 0.05); },
  bass() { tone(55, 0.5, 'sine', 0.4, 40); noise(0.15, 0.15, 200); },
  bat() { noise(0.06, 0.4, 3500, 'highpass'); tone(1800, 0.08, 'square', 0.12, 900); },
  chime() { [0, 7, 12, 19, 24].forEach((s, i) => tone(1047 * 2 ** (s / 12), 0.4, 'triangle', 0.05, null, i * 0.05)); },
  shatter() { noise(0.5, 0.4, 4200, 'highpass'); [0, 5, 10, 15].forEach((s, i) => tone(1568 * 2 ** (s / 12), 0.18, 'triangle', 0.06, 700, i * 0.04)); tone(90, 0.5, 'sine', 0.3, 40); },
};

// ---------- music ----------
// A little composer, no samples. Every track is a key, a chord progression and a few parts: drums, bass, chords,
// an arpeggio and a melody. The song walks through a form so it isn't a two-bar loop:
//   i = intro (light drums, no melody)   a = verse   b = chorus (full drums, arpeggio, crash)
//   c = chorus drums with the verse tune   r = break (no kick, just chords, arpeggio and melody)
// Each letter of the form plays the whole progression once. The last bar before a new part gets a drum fill.
// Melodies are written in scale degrees of the key: 1..7, 8 = the tonic an octave up, 5, = a fifth below, ' = octave up,
// #4 / b7 = sharp or flat, . = rest, - = hold the note longer. Missing steps at the end of a bar are rests.
const mf = (m) => 440 * 2 ** ((m - 69) / 12);
const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], phrygian: [0, 1, 3, 5, 7, 8, 10],
  harmonic: [0, 2, 3, 5, 7, 8, 11], mixo: [0, 2, 4, 5, 7, 9, 10], lydian: [0, 2, 4, 6, 7, 9, 11], phrygdom: [0, 1, 4, 5, 7, 8, 10],
};
const DIST = (() => { const c = new Float32Array(512); for (let i = 0; i < 512; i++) { const x = i / 256 - 1; c[i] = Math.tanh(x * 5); } return c; })();
let bus = null;
function buses() {
  if (bus) return bus;
  // a generated reverb hall and a dotted-eighth echo, so the music sounds like it's in a space
  const len = Math.floor(ac.sampleRate * 2.4), ir = ac.createBuffer(2, len, ac.sampleRate);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3; }
  const rvb = ac.createConvolver(); rvb.buffer = ir;
  const rvbIn = ac.createGain(); rvbIn.gain.value = 0.25; rvbIn.connect(rvb); rvb.connect(musicGain);
  const dly = ac.createDelay(1.5), fb = ac.createGain(), dIn = ac.createGain();
  fb.gain.value = 0.3; dIn.gain.value = 0.16;
  dIn.connect(dly); dly.connect(fb); fb.connect(dly); dly.connect(musicGain); dly.connect(rvbIn);
  const pad = ac.createGain(); pad.connect(musicGain); pad.connect(rvbIn);       // chords and arpeggios: ducked by the kick on some tracks
  const lead = ac.createGain(); lead.connect(musicGain); lead.connect(rvbIn); lead.connect(dIn);
  const room = ac.createGain(); room.connect(musicGain); room.gain.value = 1; const roomR = ac.createGain(); roomR.gain.value = 0.35; room.connect(roomR); roomR.connect(rvbIn);   // snares and claps
  bus = { pad, lead, room, rvbIn, dly, dIn };
  return bus;
}

// one synth voice: a few oscillators through an envelope, an optional low-pass and optional distortion
function voice(t, dur, vol, dest, oscs, o = {}) {
  const g = ac.createGain(), a = Math.min(o.a ?? 0.005, dur * 0.5), r = Math.min(o.r ?? 0.06, dur * 0.5);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + a);
  if (o.dec) g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  else { g.gain.setValueAtTime(Math.max(0.0002, vol), t + Math.max(a, dur - r)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
  let out = g;
  if (o.lp) {
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = o.q ?? 0.8; f.frequency.setValueAtTime(o.lp, t);
    if (o.lpEnd) f.frequency.exponentialRampToValueAtTime(o.lpEnd, t + (o.lpT ?? dur));
    out.connect(f); out = f;
  }
  if (o.dist) { const s = ac.createWaveShaper(); s.curve = DIST; out.connect(s); out = s; }
  out.connect(dest);
  const f0 = oscs[0][1];
  for (const [type, f, det = 0, mul = 1] of oscs) {
    const os = ac.createOscillator(); os.type = type; os.detune.value = det;
    if (o.from) { os.frequency.setValueAtTime(o.from * (f / f0), t); os.frequency.exponentialRampToValueAtTime(f, t + (o.glide ?? 0.08)); }
    else os.frequency.setValueAtTime(f, t);
    if (o.vib) {
      const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = o.vibF ?? 5.5;
      lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.01 * o.vib, t + Math.min(0.35, dur));
      l.connect(lg); lg.connect(os.frequency); l.start(t); l.stop(t + dur + 0.05);
    }
    if (mul !== 1) { const mg = ac.createGain(); mg.gain.value = mul; os.connect(mg); mg.connect(g); } else os.connect(g);
    os.start(t); os.stop(t + dur + 0.05);
  }
}

// ---------- the instruments ----------
function lead(type, m, t, dur, v, dest) {
  const f = mf(m);
  switch (type) {
    case 'bell': {   // the classic phonk cowbell: two detuned squares through a band-pass
      for (const k of [1, 1.4836]) {
        const o = ac.createOscillator(), g = ac.createGain(), bp = ac.createBiquadFilter();
        o.type = 'square'; o.frequency.value = mf(m - 12) * k;
        bp.type = 'bandpass'; bp.frequency.value = f * 1.2; bp.Q.value = 2.5;
        g.gain.setValueAtTime(v * 1.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
        o.connect(bp); bp.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.32);
      }
      return;
    }
    case 'chip': return voice(t, dur * 0.92, v * 0.8, dest, [['square', f]], { r: 0.02 });
    case 'square': return voice(t, dur, v, dest, [['square', f]], { lp: 3200, r: 0.05 });
    case 'saw': return voice(t, dur, v, dest, [['sawtooth', f, -7], ['sawtooth', f, 7]], { lp: 3000, lpEnd: 1400, lpT: 0.3, r: 0.06 });
    case 'synth': return voice(t, dur, v * 0.8, dest, [['sawtooth', f, -12], ['sawtooth', f, 0], ['sawtooth', f, 12]], { lp: 3800, r: 0.08 });
    case 'brass': return voice(t, dur, v, dest, [['sawtooth', f, -6], ['sawtooth', f, 6]], { a: 0.03, lp: 500, lpEnd: 2600, lpT: 0.12, r: 0.08, vib: dur > 0.3 ? 0.4 : 0 });
    case 'guitar': return voice(t, dur, v * 0.55, dest, [['sawtooth', f, -9], ['sawtooth', f, 9], ['square', f / 2, 0, 0.5]], { lp: 2600, dist: true, r: 0.05, vib: dur > 0.25 ? 0.5 : 0 });
    case 'flute': voice(t, dur, v, dest, [['sine', f], ['triangle', f * 2, 0, 0.12]], { a: 0.04, r: 0.08, vib: 0.9 }); noise(0.06, v * 0.5, 3000, 'bandpass', t, dest, 1); return;
    case 'reed': return voice(t, dur, v * 0.8, dest, [['sawtooth', f]], { a: 0.03, lp: 1500, q: 2.5, r: 0.07, vib: 0.8 });
    case 'accordion': return voice(t, dur, v * 0.7, dest, [['square', f, -10], ['square', f, 10]], { a: 0.02, lp: 2200, r: 0.05, vib: 0.3, vibF: 6 });
    case 'organ': return voice(t, dur, v, dest, [['square', f, 0, 0.45], ['triangle', f * 2], ['sine', f * 4, 0, 0.3]], { lp: 3000, r: 0.04 });
    case 'marimba': voice(t, Math.max(0.3, dur), v * 1.4, dest, [['sine', f]], { dec: true }); voice(t, 0.06, v * 0.5, dest, [['sine', f * 4]], { dec: true }); return;
    case 'glock': voice(t, Math.max(0.8, dur), v * 1.2, dest, [['sine', f * 2]], { dec: true }); voice(t, 0.4, v * 0.35, dest, [['sine', f * 5.4]], { dec: true }); return;
    case 'steel': return voice(t, Math.max(0.5, dur), v * 1.3, dest, [['sine', f], ['sine', f * 2, 0, 0.5], ['sine', f * 3.01, 0, 0.2]], { dec: true });
    case 'pluck': return voice(t, Math.max(0.25, dur), v * 1.2, dest, [['triangle', f], ['sawtooth', f, 0, 0.3]], { dec: true, lp: 3000, lpEnd: 600, lpT: 0.2 });
    default: return voice(t, dur, v, dest, [[type, f]], { r: 0.05 });
  }
}
function bassNote(type, m, t, dur, v, from) {
  const f = mf(m);
  if (type === '808') {   // long sine with a pitch drop (or a glide from the last note), pushed through the soft clipper
    const o = ac.createOscillator(), g = ac.createGain(), d = Math.max(0.25, dur);
    o.type = 'sine';
    if (from) { o.frequency.setValueAtTime(mf(from), t); o.frequency.exponentialRampToValueAtTime(f, t + 0.12); }
    else { o.frequency.setValueAtTime(f * 1.5, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.045); }
    g.gain.setValueAtTime(0.6 * v, t); g.gain.setValueAtTime(0.5 * v, t + d * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(shaper); o.start(t); o.stop(t + d + 0.05);
    return;
  }
  const M = musicGain;
  if (type === 'reese') return voice(t, dur, 0.13 * v, M, [['sawtooth', f, -14], ['sawtooth', f, 14], ['sine', f / 2, 0, 1.5]], { lp: 520, r: 0.05, from: from ? mf(from) : 0 });
  if (type === 'acid') return voice(t, Math.max(0.12, dur), 0.12 * v, M, [['sawtooth', f]], { lp: 2600, lpEnd: 260, lpT: 0.16, q: 9, dec: true, from: from ? mf(from) : 0 });
  if (type === 'sub') return voice(t, dur, 0.3 * v, M, [['sine', f], ['triangle', f, 0, 0.3]], { r: 0.05 });
  // pluck: a round, bouncy bass
  voice(t, Math.max(0.18, dur), 0.2 * v, M, [['sawtooth', f], ['sine', f, 0, 1.4]], { lp: 1100, lpEnd: 240, lpT: 0.2, dec: true });
}
function chord(type, notes, t, dur, v, dest) {
  for (const m of notes) {
    const f = mf(m);
    if (type === 'pad') voice(t, dur, v, dest, [['sawtooth', f, -9], ['sawtooth', f, 9]], { a: 0.25, r: 0.35, lp: 1300 });
    else if (type === 'strings') voice(t, dur, v, dest, [['sawtooth', f, -6], ['sawtooth', f, 6]], { a: 0.14, r: 0.25, lp: 2300, vib: 0.25 });
    else if (type === 'choir') voice(t, dur, v * 1.3, dest, [['triangle', f, -8], ['triangle', f, 8], ['sine', f * 2, 0, 0.3]], { a: 0.35, r: 0.4, lp: 1900, vib: 0.5, vibF: 4.5 });
    else if (type === 'organ') voice(t, dur, v * 0.8, dest, [['square', f, 0, 0.4], ['triangle', f * 2]], { lp: 2200, r: 0.04 });
    else if (type === 'epiano') { voice(t, Math.max(0.6, dur), v * 1.3, dest, [['sine', f]], { dec: true }); voice(t, 0.25, v * 0.35, dest, [['sine', f * 2]], { dec: true }); }
    else if (type === 'stab') voice(t, Math.min(0.25, dur), v * 1.2, dest, [['sawtooth', f, -8], ['sawtooth', f, 8]], { lp: 2600, lpEnd: 700, dec: true });
    else if (type === 'glass') { voice(t, Math.max(1, dur), v * 1.2, dest, [['sine', f], ['sine', f * 3, 0, 0.15]], { a: 0.01, dec: true }); }
    else if (type === 'strum') voice(t + notes.indexOf(m) * 0.012, Math.max(0.3, dur), v * 1.1, dest, [['triangle', f], ['sawtooth', f, 0, 0.25]], { dec: true, lp: 2400, lpEnd: 900 });
  }
}
function kick(t, v, hard) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(hard ? 200 : 160, t); o.frequency.exponentialRampToValueAtTime(hard ? 38 : 46, t + 0.13);
  g.gain.setValueAtTime(0.75 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + (hard ? 0.45 : 0.3));
  o.connect(g); g.connect(hard ? shaper : musicGain); o.start(t); o.stop(t + 0.5);
  noise(0.012, 0.22 * v, 3500, 'highpass', t, musicGain);
}
function snare(t, v, dest) { noise(0.17, 0.26 * v, 1900, 'bandpass', t, dest, 0.7); tone(200, 0.08, 'triangle', 0.13 * v, 150, t, dest); }
function clap(t, v, dest) { for (const d of [0, 0.011, 0.022]) noise(0.12, 0.17 * v, 1300, 'bandpass', t + d, dest, 1.2); }
function perc(type, t, v, i) {
  const M = musicGain;
  if (type === 'cowbell') for (const f of [545, 815]) voice(t, 0.18, 0.05 * v, M, [['square', f]], { dec: true, lp: 1800 });
  else if (type === 'tom') { const f = [210, 175, 145, 120][i % 4]; tone(f, 0.24, 'sine', 0.32 * v, f * 0.55, t, M); }
  else if (type === 'conga') { const f = i % 3 ? 340 : 245; tone(f, 0.14, 'sine', 0.26 * v, f * 0.8, t, M); noise(0.02, 0.08 * v, 2200, 'bandpass', t, M); }
  else if (type === 'shaker') noise(0.06, 0.07 * v, 6000, 'highpass', t, M);
  else if (type === 'rim') { tone(1700, 0.03, 'triangle', 0.12 * v, null, t, M); noise(0.02, 0.1 * v, 4000, 'highpass', t, M); }
  else if (type === 'timp') { tone(98, 0.7, 'sine', 0.4 * v, 80, t, M); noise(0.3, 0.1 * v, 300, 'lowpass', t, M); }
  else if (type === 'anvil') { tone(1250, 0.22, 'square', 0.035 * v, null, t, M); tone(1870, 0.2, 'triangle', 0.05 * v, null, t, M); }
  else if (type === 'darbuka') { tone(i % 2 ? 420 : 280, 0.1, 'sine', 0.24 * v, 240, t, M); noise(0.03, 0.1 * v, 3000, 'bandpass', t, M); }
}
const crash = (t) => noise(1.6, 0.16, 5200, 'highpass', t, buses().room);

// ---------- reading the tracks ----------
const SEC = {
  i: { d: 'i', bass: 'a', ch: 1, arp: 0, mel: null },
  a: { d: 'a', bass: 'a', ch: 1, arp: 0, mel: 'a' },
  b: { d: 'b', bass: 'b', ch: 1, arp: 1, mel: 'b' },
  c: { d: 'b', bass: 'b', ch: 1, arp: 1, mel: 'a' },
  r: { d: 'r', bass: null, ch: 1, arp: 1, mel: 'a' },
};
const note = (tr, d, oct = 0) => { const sc = SCALES[tr.scale || 'major'], i = d - 1, k = ((i % 7) + 7) % 7; return tr.key + sc[k] + 12 * (Math.floor(i / 7) + oct); };
const chordOf = (tr, d) => { const ns = [note(tr, d), note(tr, d + 2), note(tr, d + 4)]; if (tr.seventh) ns.push(note(tr, d + 6)); return ns; };
const voiced = (ns, lo) => ns.map((m) => { while (m < lo) m += 12; while (m >= lo + 12) m -= 12; return m; }).sort((x, y) => x - y);
function prep(tr) {
  if (tr._p) return tr;
  const S = tr.steps || 16;
  tr._p = tr.prog.trim().split(/\s+/).map(Number);
  const bars = (list) => (list || []).map((b) => {
    const tk = b.trim().split(/\s+/); while (tk.length < S) tk.push('.');
    const out = new Array(S).fill(null);
    for (let i = 0; i < S; i++) {
      const m = /^([#b]?)(\d+)([',]*)$/.exec(tk[i]); if (!m) continue;
      let len = 1; while (i + len < S && tk[i + len] === '-') len++;
      out[i] = { d: +m[2], acc: m[1] === '#' ? 1 : m[1] === 'b' ? -1 : 0, oct: (m[3].match(/'/g) || []).length - (m[3].match(/,/g) || []).length, len };
    }
    return out;
  });
  if (tr.mel) { tr.mel._a = bars(tr.mel.a); tr.mel._b = bars(tr.mel.b || tr.mel.a); }
  return tr;
}
const VEL = { X: 1, x: 0.75, g: 0.32, r: 0.6, t: 0.6 };
const hitAt = (p, k) => (p ? p[k % p.length] : '.');
const holdLen = (p, k, S) => { let n = 1; while (n < S && p[(k + n) % p.length] === '-') n++; return n; };

function playStep(tr, n, t, st) {
  const S = tr.steps || 16, P = tr._p.length, bar = Math.floor(n / S), i = n % S, k = bar * S + i;
  const blk = Math.floor(bar / P), L = tr.form[blk % tr.form.length], sec = SEC[L] || SEC.a, bi = bar % P;
  const nextL = tr.form[(blk + 1) % tr.form.length];
  const B = buses(), deg = tr._p[bi], ch = chordOf(tr, deg);
  // ----- drums -----
  const Da = tr.drums.a;
  const D = sec.d === 'i' ? (tr.drums.i || { k: 'x' + '.'.repeat(S - 1), h: Da.h, p: Da.p }) : sec.d === 'r' ? (tr.drums.r || { h: tr.drums.i ? tr.drums.i.h : '' }) : (tr.drums[sec.d] || Da);
  const fill = tr.fill !== false && sec.d !== 'r' && bi === P - 1 && nextL !== 'r' && i >= S - 4 && (nextL !== L || L === 'b' || L === 'c');
  if (i === 0 && bi === 0 && (L === 'b' || L === 'c') && tr.crash !== false) crash(t);
  const kc = hitAt(D.k, k);
  if (VEL[kc]) {
    kick(t, VEL[kc], tr.hardKick);
    if (tr.duck) { B.pad.gain.cancelScheduledValues(t); B.pad.gain.setValueAtTime(0.3, t); B.pad.gain.linearRampToValueAtTime(1, t + st * 3); }
  }
  if (fill) { const j = i - (S - 4); snare(t, 0.4 + j * 0.15, B.room); snare(t + st / 2, 0.3 + j * 0.15, B.room); }
  else {
    const sc = hitAt(D.s, k); if (VEL[sc]) snare(t, VEL[sc], B.room);
    const cc = hitAt(D.c, k); if (VEL[cc]) clap(t, VEL[cc], B.room);
  }
  const hc = hitAt(D.h, k);
  if (hc === 'r') for (let j = 0; j < 3; j++) noise(0.03, 0.07, 7500, 'highpass', t + (j * st) / 3, musicGain);
  else if (hc === 't') for (let j = 0; j < 2; j++) noise(0.03, 0.07, 7500, 'highpass', t + (j * st) / 2, musicGain);
  else if (VEL[hc]) noise(0.035, 0.09 * VEL[hc], 7500, 'highpass', t, musicGain);
  const oc = hitAt(D.o, k); if (VEL[oc]) noise(0.26, 0.06 * VEL[oc], 6500, 'highpass', t, musicGain);
  const pc = hitAt(D.p, k); if (VEL[pc]) perc(tr.perc || 'rim', t, VEL[pc], i);
  // ----- bass -----
  if (sec.bass && tr.bass) {
    const bp = tr.bass[sec.bass] || tr.bass.a, c = hitAt(bp, k);
    if (c !== '.' && c !== '-') {
      const top = tr.bassTop || 47;
      let root = note(tr, deg); while (root > top) root -= 12; while (root <= top - 12) root += 12;
      const rel = (d) => note(tr, deg + d) - note(tr, deg);
      let m = root;
      if (c === 'o') m = root + 12; else if (c === '5') m = root + rel(4); else if (c === '3') m = root + rel(2); else if (c === '7') m = root + rel(6) - 12;
      else if (c === 'n') { let r2 = note(tr, tr._p[(bi + 1) % P]); while (r2 > top) r2 -= 12; while (r2 <= top - 12) r2 += 12; m = r2; }
      bassNote(tr.bassType || 'pluck', m, t, holdLen(bp, k, S) * st, tr.bassVol || 1, c === 'g' ? tr._last : 0);
      tr._last = m;
    }
  }
  // ----- chords -----
  if (sec.ch && tr.chords) {
    const C = tr.chords, cp = (sec.d === 'b' && C.b) || C.a || 'x' + '-'.repeat(S - 1), c = hitAt(cp, k);
    if (c === 'x' || c === 'X') chord(C.type || 'pad', voiced(ch, C.lo ?? 55), t, holdLen(cp, k, S) * st, (C.vol ?? 0.03) * (c === 'X' ? 1.3 : 1), B.pad);
  }
  // ----- arpeggio -----
  if (sec.arp && tr.arp) {
    const A = tr.arp, rate = A.rate || 1;
    if (i % rate === 0) {
      const seq = A.pat.split(' ').map(Number), vo = voiced(ch, A.lo ?? 64), j = seq[(i / rate) % seq.length];
      lead(A.type || 'pluck', vo[j % vo.length] + 12 * Math.floor(j / vo.length), t, st * rate * 0.9, A.vol ?? 0.04, B.pad);
    }
  }
  // ----- melody -----
  if (sec.mel && tr.mel) {
    const bars = tr.mel['_' + sec.mel], ev = bars.length && bars[bi % bars.length][i];
    if (ev) lead(tr.mel.type || 'square', note(tr, ev.d, ev.oct + (tr.mel.oct ?? 1)) + ev.acc, t, ev.len * st, (tr.mel.vol ?? 0.07) * (L === 'r' ? 0.75 : 1), B.lead);
  }
}

// ---------- the tracks ----------
const F4 = 'x...x...x...x...', BB = '....x.......x...', H8 = 'x.x.x.x.x.x.x.x.', H16 = 'xxxxxxxxxxxxxxxx', HOFF = '..x...x...x...x.';
const TRACKS = {
  // the main menu: warm, a little dreamy, like floating next to the station
  menu: {
    bpm: 92, swing: 0.1, key: 50, scale: 'major', prog: '1 6 4 5', form: 'iaabab',
    drums: { a: { k: 'x.......x.x.....', s: BB, h: H8 }, b: { k: 'x.......x.x.....', s: BB, h: H8, o: '......x.......x.' } },
    bass: { a: 'x.....x...x.....', b: 'x..x..x...x.o...' }, bassType: 'pluck',
    chords: { type: 'epiano', a: 'x.....x.....x...', vol: 0.03 },
    arp: { type: 'glock', pat: '0 1 2 3', rate: 2, vol: 0.022, lo: 66 },
    mel: { type: 'flute', vol: 0.06, a: ['3 . . 5 . . 6 . 5 . . 3 . . 2 .', '1 . . . . . 3 . 2 . 1 . 6, . . .', '4, . . 6, . . 1 . 2 . . 1 . . 6, .', '7, . . . . . 2 . 5, . . . . . . .'],
      b: ['5 . 6 . 8 . 7 . 6 . 5 . 3 . 5 .', '6 . . 5 . . 3 . 2 . 3 . 6, . . .', '4 . 5 . 6 . 5 . 4 . 3 . 2 . 1 .', '2 . . . 3 . . . 5 . . . 7, . . .'] },
  },
  // PLANETA PHONK: drift phonk. Half-time drums, Memphis hat rolls, a distorted 808 that slides, and the cowbell riff
  phonk: {
    bpm: 140, key: 49, scale: 'phrygian', prog: '1 6 2 1', form: 'iaabbrbb', duck: true, hardKick: true, bassTop: 44,
    drums: {
      i: { h: 'x.x.x.x.x.x.x.xr', p: 'x.......x.......' },
      a: { k: 'X.....x...x.....X.....x...x..x..', s: '........X.......', c: '........X.......', h: 'x.x.x.x.x.x.x.xrx.x.x.x.x.x.xrrr', o: '..............x.' },
      b: { k: 'X.....x.x.x...x.X.....x...x.x.x.', s: '........X.......', c: '........X.....x.', h: 'xxx.xxx.xxx.xrrrxxx.xxx.xrxrrrrr', o: '......x.......x.' },
      r: { h: '........x.......', p: 'x...............' },
    },
    perc: 'cowbell',
    bass: { a: 'x-----x-----x-o-', b: 'x-----x---x-g-o-' }, bassType: '808', bassVol: 1.1,
    chords: { type: 'choir', vol: 0.022, lo: 52 },
    mel: { type: 'bell', vol: 0.1, oct: 1,
      a: ['8 . 8 . 7 8 . 5 . 6 . 5 . 3 . .', '8 . 8 . 7 8 . 5 . 6 . 8 . 10 . .', '9 . 9 . 8 9 . 6 . 7 . 6 . 4 . .', '8 . 8 . 7 8 . 5 . 6 . 5 3 2 1 .'],
      b: ['8 8 . 8 10 . 8 . 7 . 5 . 7 . 8 .', '6 6 . 6 8 . 6 . 5 . 3 . 5 . 6 .', '9 9 . 9 11 . 9 . 8 . 6 . 8 . 9 .', '8 . 7 . 5 . 3 . 2 . 3 . 2 . 1 .'] },
  },
  // DJ MIAUWTRON: aggressive phonk, faster and meaner, cowbells in double time
  boss1: {
    bpm: 150, key: 46, scale: 'phrygian', prog: '1 1 2 1', form: 'abbrbc', duck: true, hardKick: true, bassTop: 44,
    drums: {
      a: { k: 'X.....x...x..x..X.....x...x.xx..', s: '........X.......', c: '........X.......', h: 'xxx.xxx.xxx.xrrrxxx.xxx.xxx.rrrr' },
      b: { k: 'X.x...x.x.x..x..X.x...x.x.xxx.x.', s: '........X.......', c: '........X...x.x.', h: 'xrxrxrxrxrxrxrxr', o: '......x.......x.' },
      r: { h: 'x...x...x...xrrr', p: 'x.......x.......' },
    },
    perc: 'cowbell',
    bass: { a: 'x---x-----x-g-o-', b: 'x-o-x---x-g-o-x-' }, bassType: '808', bassVol: 1.1,
    chords: { type: 'pad', vol: 0.018, lo: 50 },
    mel: { type: 'bell', vol: 0.1,
      a: ['8 8 7 8 . 5 6 5 . 8 8 7 8 . 10 .', '8 8 7 8 . 5 6 5 . 3 5 6 5 3 2 .', '9 9 8 9 . 6 7 6 . 9 9 8 9 . 11 .', '8 8 7 8 . 5 6 5 3 2 1 2 3 5 8 .'],
      b: ['12 . 10 . 9 . 8 . 10 . 9 . 8 . 6 .', '8 . 7 . 5 . 3 . 5 . 6 . 8 . 10 .', '13 . 11 . 10 . 9 . 11 . 10 . 9 . 6 .', '8 . 9 . 8 . 7 . 5 . 3 . 2 . 1 .'] },
  },
  // DE DIEPE MIJN: a mysterious, rocky mining groove with clanking pickaxes
  mine: {
    bpm: 104, swing: 0.06, key: 50, scale: 'dorian', prog: '1 4 1 7', form: 'iaabab', perc: 'anvil',
    drums: { a: { k: 'x.......x...x...', s: BB, h: 'x.xxx.xxx.xxx.xx', p: '..x.....x.x.....' }, b: { k: 'x.....x.x...x...', s: '....x.......x..x', h: H16, p: '..x...x...x.x...' } },
    bass: { a: 'x..x..x.x..x..5.', b: 'x.xo..x.x.xo.5.x' }, bassType: 'pluck',
    chords: { type: 'strings', vol: 0.022, lo: 53 },
    arp: { type: 'pluck', pat: '0 1 2 1', rate: 2, vol: 0.03, lo: 62 },
    mel: { type: 'marimba', vol: 0.08, a: ['1 . 3 5 . 4 3 . 1 . 7, . 1 . . .', '4 . 6 8 . 7 6 . 4 . 3 . 4 . . .', '5 . 3 1 . 3 5 . 6 . 5 . 3 . . .', '7, . 2 4 . 3 2 . 7, . 1 . 2 . . .'],
      b: ['5 . 5 6 5 3 1 . 5 . 5 6 8 . . .', '6 . 6 8 6 4 2 . 6 . 6 8 9 . . .', '8 . 6 5 3 . 5 . 6 . 5 3 1 . . .', '2 . 3 4 5 . 4 3 2 . 1 7, 1 . . .'] },
  },
  // GRUIS: a heavy rock riff, double kicks, a distorted guitar and a growling bass
  boss2: {
    bpm: 140, key: 50, scale: 'harmonic', prog: '1 6 4 5', form: 'abbrbc', bassTop: 45,
    drums: { a: { k: 'x.x...x.x.x...x.', s: BB, h: H8 }, b: { k: 'x.x.x.x.x.x.x.x.', s: BB, h: H8, o: 'x.......x.......' }, r: { h: 'x...x...x...x...', p: 'x.......x.......' } },
    perc: 'timp',
    bass: { a: 'x.x.x.xxx.x.x.xx', b: 'x.xxx.xxx.xxx.xx' }, bassType: 'reese',
    chords: { type: 'strings', vol: 0.02, lo: 50 },
    mel: { type: 'guitar', vol: 0.08, oct: 1,
      a: ['1 1 . 1 3 . 1 . 2 . 1 . 7, . 5, .', '6, 6, . 6, 1 . 6, . 7, . 6, . 5, . 3, .', '4, 4, . 4, 6, . 4, . 5, . 4, . 3, . 1, .', '5, 5, . 5, 7, . 5, . 2 . 7, . 5, . 7, .'],
      b: ['8 - 7 - 8 - 10 - 9 - 8 - 7 - 5 -', '6 - 5 - 6 - 8 - 7 - 6 - 5 - 3 -', '4 - 3 - 4 - 6 - 5 - 4 - 3 - 1 -', '5 - 7 - 9 - 7 - 5 - - - 7, - - -'] },
  },
  // HOMERUN HEUVEL: stadium organ, stomp-stomp-clap and a "CHARGE!" fanfare in the chorus
  stadium: {
    bpm: 124, key: 48, scale: 'major', prog: '1 4 5 1', form: 'iaabbab',
    drums: { a: { k: F4, s: BB, h: HOFF, c: BB }, b: { k: 'x...x...x...x...', c: '....x.......x.x.', h: H8, s: BB, o: '..x...x...x...x.' } },
    bass: { a: 'x...5...o...5...', b: 'x.5.o.5.x.5.o.5.' }, bassType: 'pluck',
    chords: { type: 'organ', a: '..x...x...x...x.', b: '..x...x...x...x.', vol: 0.025, lo: 60 },
    arp: { type: 'chip', pat: '0 1 2 3', rate: 2, vol: 0.025, lo: 67 },
    mel: { type: 'organ', vol: 0.075, a: ['1 . 3 . 5 . . 3 5 . . . 8 . . .', '4 . 6 . 8 . . 6 8 . . . 10 . . .', '5 . 7 . 9 . . 7 9 . . . 12 . . .', '8 . 7 . 6 . 5 . 4 . 3 . 2 . . .'],
      b: ['5, . 1 . 3 . 5 . . . 3 . 5 . . .', '6, . 4 . 6 . 8 . . . 6 . 8 . . .', '7, . 5 . 7 . 9 . . . 7 . 9 . . .', '8 . . 8 . . 8 . 10 . 9 . 8 . . .'] },
  },
  // ZENNITH: the big one. Fast drum'n'bass drums, strings and a heroic brass melody
  boss3: {
    bpm: 164, key: 45, scale: 'minor', prog: '1 6 3 7', form: 'abbrbc', duck: true,
    drums: { a: { k: 'x.........x.....', s: BB, h: H8, p: 'x...............' }, b: { k: 'x.........x.x...', s: '....x..x.x..x...', h: H16, o: '......x.......x.' }, r: { h: H8, p: 'x.......x.......' } },
    perc: 'timp',
    bass: { a: 'x-------x---x-o-', b: 'x---x---x-x-o-x-' }, bassType: 'reese',
    chords: { type: 'strings', vol: 0.026, lo: 52 },
    arp: { type: 'synth', pat: '0 1 2 1 3 2 1 2', rate: 1, vol: 0.022, lo: 64 },
    mel: { type: 'brass', vol: 0.075,
      a: ['1 . . 3 . . 5 . 8 . 7 . 5 . 3 .', '1 . . 3 . . 6 . 8 . 6 . 3 . 1 .', '3 . . 5 . . 8 . 10 . 8 . 5 . 3 .', '2 . . 5, . . 7, . 2 . 4 . 5 . 7 .'],
      b: ['8 - - 7 - - 5 - 8 - - 10 - - 12 -', '10 - - 8 - - 6 - 8 - - 10 - - 13 -', '12 - - 10 - - 8 - 10 - - 12 - - 15 -', '14 - - 12 - - 11 - 9 - - 7 - 9 - - -'] },
  },
  // HERTOGDOM IJS: glassy, royal and slow, like a music box in an ice palace
  ice: {
    bpm: 88, swing: 0.05, key: 52, scale: 'harmonic', prog: '1 4 6 5', form: 'iaabrb', perc: 'shaker',
    drums: { a: { k: 'x.......x.......', s: '........x.......', h: HOFF }, b: { k: 'x.......x..x....', s: '........x.......', h: H8, p: 'x.x.x.x.x.x.x.x.' } },
    bass: { a: 'x.......x.......', b: 'x.....x.x.....5.' }, bassType: 'sub',
    chords: { type: 'glass', a: 'x.......x.......', vol: 0.025, lo: 59 },
    arp: { type: 'glock', pat: '0 1 2 3 2 1', rate: 2, vol: 0.02, lo: 64 },
    mel: { type: 'glock', vol: 0.07, oct: 0,
      a: ['5 . . 8 . . 7 . 5 . . 3 . . 5 .', '4 . . 8 . . 6 . 4 . . 3 . . 1 .', '3 . . 6 . . 5 . 3 . . 1 . . 3 .', '7, . . 2 . . 5 . 7 . . 5 . . 2 .'],
      b: ['8 . 9 . 10 . 12 . 11 . 10 . 9 . 8 .', '8 . 9 . 10 . 11 . 10 . 9 . 8 . 6 .', '6 . 8 . 10 . 12 . 10 . 8 . 6 . 5 .', '7 . . . 9 . . . 12 . . . 14 . . .'] },
  },
  // DENIZ: "aura" phonk. Icy bells, a sliding 808, way too much aura
  boss4: {
    bpm: 146, key: 52, scale: 'phrygian', prog: '1 2 1 7', form: 'abbrbc', duck: true, hardKick: true, bassTop: 45,
    drums: {
      a: { k: 'X.....x...x.....X.....x..x..x...', s: '........X.......', c: '........X.......', h: 'x.x.x.x.x.x.x.xrx.x.x.x.x.x.xrrr' },
      b: { k: 'X.....x.x.x...x.X....xx...x.x.x.', s: '........X.......', c: '........X.....x.', h: 'xxxrxxxrxxxrxrrr', o: '......x.......x.' },
      r: { h: '....x.......x...' },
    },
    bass: { a: 'x-----x-----g-o-', b: 'x---x-o---x-g-o-' }, bassType: '808', bassVol: 1.1,
    chords: { type: 'glass', a: 'x.......x.......', vol: 0.02, lo: 59 },
    mel: { type: 'bell', vol: 0.095,
      a: ['8 . 8 7 8 . 10 . 9 . 8 . 7 . 5 .', '9 . 9 8 9 . 11 . 10 . 9 . 8 . 6 .', '8 . 8 7 8 . 10 . 12 . 10 . 9 . 8 .', '7 . 7 6 7 . 9 . 8 . 7 . 5 . 2 .'],
      b: ['12 . 12 . 10 . 8 . 12 . 12 . 13 . 12 .', '13 . 13 . 11 . 9 . 13 . 13 . 15 . 13 .', '12 . 12 . 10 . 8 . 10 . 12 . 15 . 12 .', '14 . 12 . 11 . 9 . 7 . 5 . 2 . 1 .'] },
  },
  // SMARAGDEILAND: an Irish jig in 6/8, with a tin whistle and a strummed guitar (12 steps = two bars of 6/8)
  luck: {
    bpm: 116, div: 3, steps: 12, key: 55, scale: 'major', prog: '1 4 1 5', form: 'iaabab', perc: 'shaker',
    drums: { a: { k: 'x.....x.....', s: '...x.....x..', h: 'x.xx.xx.xx.x' }, b: { k: 'x..x..x..x..', s: '...x.....x.x', h: 'xxxxxxxxxxxx', p: '.x..x..x..x.' } },
    bass: { a: 'x..5..x..5..', b: 'x.5o.5x.5o.5' }, bassType: 'pluck',
    chords: { type: 'strum', a: 'x..x..x..x..', vol: 0.025, lo: 55 },
    mel: { type: 'flute', vol: 0.07, oct: 1,
      a: ['5 4 3 2 3 4 5 3 1 1 2 3', '4 3 4 6 5 4 3 4 6 8 6 4', '5 4 3 2 3 4 5 3 1 1 3 5', '6 5 4 2 3 4 5 . 2 1 . .'],
      b: ['8 . 5 8 . 5 8 7 6 5 4 3', '4 6 8 8 7 6 8 . 6 4 . 6', '8 . 5 8 . 5 8 9 10 9 8 7', '6 8 6 5 4 2 1 . . 1 . .'] },
  },
  // LORCAN: a cheeky, breakneck reel. Folk punk drums and a whistle that never stops
  boss5: {
    bpm: 156, key: 50, scale: 'mixo', prog: '1 7 1 5', form: 'abbrbc',
    drums: { a: { k: F4, s: BB, h: H8 }, b: { k: 'x.x.x.x.x.x.x.x.', s: BB, c: BB, h: H16 }, r: { h: H8 } },
    bass: { a: 'x.5.x.5.x.5.x.5.', b: 'x.5.o.5.x.5.o.5.' }, bassType: 'pluck',
    chords: { type: 'strum', a: 'x.x.x.x.x.x.x.x.', vol: 0.018, lo: 55 },
    mel: { type: 'flute', vol: 0.07, oct: 1,
      a: ['8 7 6 5 6 5 3 5 8 7 6 5 3 2 1 2', '7 6 5 4 5 4 2 4 7 6 5 4 2 1 7, 2', '8 7 6 5 6 5 3 5 8 9 10 8 9 8 6 8', '5 6 7 5 2 3 4 2 5 4 3 2 1 . 1 .'],
      b: ['10 . 8 . 10 9 8 7 8 . 5 . 8 7 6 5', '9 . 7 . 9 8 7 6 7 . 4 . 7 6 5 4', '10 . 8 . 10 9 8 7 8 9 10 12 10 9 8 6', '9 8 7 6 5 4 3 2 1 . 3 . 1 . . .'] },
  },
  // HET OERWOUD: tropical groove with bongos and a bouncy marimba
  jungle: {
    bpm: 112, swing: 0.12, key: 45, scale: 'dorian', prog: '1 4 1 5', form: 'iaabbab', perc: 'conga',
    drums: { a: { k: 'x.....x...x.....', s: BB, h: 'x.xx.xx.x.xx.xx.', p: 'x..x..x...x.x...' }, b: { k: 'x.....x...x..x..', s: BB, h: H16, p: 'x.xx.xx.x.xx.x.x', o: '......x.......x.' } },
    bass: { a: 'x..x..5...x..o..', b: 'x..x.o5.x.x..o.5' }, bassType: 'pluck',
    chords: { type: 'stab', a: '..x...x...x...x.', vol: 0.02, lo: 57 },
    arp: { type: 'marimba', pat: '0 2 1 2', rate: 2, vol: 0.03, lo: 64 },
    mel: { type: 'marimba', vol: 0.085, a: ['1 . 3 1 . 5 . 4 3 . 1 . 7, . 1 .', '4 . 6 4 . 8 . 7 6 . 4 . 3 . 4 .', '1 . 3 1 . 5 . 4 3 . 5 . 7 . 8 .', '5 . 7 5 . 9 . 8 7 . 5 . 4 . 2 .'],
      b: ['8 . . 7 8 . 10 . 8 . 7 . 5 . 3 .', '6 . . 4 6 . 8 . 6 . 4 . 3 . 2 .', '8 . . 7 8 . 10 . 12 . 10 . 8 . 7 .', '5 . 7 . 9 . 7 . 5 . 3 . 2 . 1 .'] },
  },
  // KONING KOKOS: tribal war drums, a gorilla beating his chest, brass on top
  boss6: {
    bpm: 140, key: 45, scale: 'harmonic', prog: '1 1 6 5', form: 'abbrbc', perc: 'tom',
    drums: { a: { k: 'x..x..x.x..x..x.', s: BB, h: H8, p: 'x.x.x.xxx.x.x.xx' }, b: { k: 'x..x..x.x..x.xx.', s: '....x.......x.xx', c: BB, h: H16, p: 'xxx.xxx.xxx.xxxx' }, r: { p: 'x...x...x...x.x.' } },
    bass: { a: 'x.x.x.x.x.x.x.x.', b: 'x.xox.xox.xox.xo' }, bassType: 'reese',
    chords: { type: 'stab', a: 'x.......x.......', b: 'x..x..x.x..x..x.', vol: 0.022, lo: 52 },
    mel: { type: 'brass', vol: 0.075,
      a: ['1 . 1 . 3 . 1 . 5 . 4 . 3 . 2 .', '1 . 1 . 3 . 1 . 6 . 5 . 3 . . .', '6, . 6, . 1 . 6, . 3 . 1 . 6, . . .', '5, . 7, . 2 . 7, . 5, . . . 7, . . .'],
      b: ['8 . 8 . 10 . 8 . 12 . 11 . 10 . 8 .', '8 . 8 . 10 . 8 . 13 . 12 . 10 . . .', '6 . 6 . 8 . 6 . 10 . 8 . 6 . . .', '5 . 7 . 9 . 7 . 12 . . . 11 . . .'] },
  },
  // DE ASBERG: low and rumbling, a bit dangerous, organ over a slow heavy beat
  lava: {
    bpm: 98, key: 50, scale: 'phrygian', prog: '1 1 2 1', form: 'iaabrb', perc: 'timp',
    drums: { a: { k: 'x.......x..x....', s: '........x.......', h: HOFF, p: 'x...............' }, b: { k: 'x.....x.x..x....', s: '........x.......', c: '........x.......', h: H8, p: 'x.......x.......' } },
    bass: { a: 'x-----x-x-----x-', b: 'x---x-x-x---x-o-' }, bassType: 'reese',
    chords: { type: 'organ', vol: 0.018, lo: 50 },
    mel: { type: 'organ', vol: 0.06, a: ['1 . . . 2 . . . 1 . . . 7, . 5, .', '1 . . . 3 . . . 2 . . . 1 . . .', '2 . . . 3 . . . 4 . . . 3 . 2 .', '1 . . . . . . . 5, . . . 7, . . .'],
      b: ['8 . 9 . 8 . 5 . 6 . 5 . 3 . 2 .', '8 . 9 . 8 . 5 . 6 . 8 . 10 . 9 .', '9 . 10 . 9 . 6 . 7 . 6 . 4 . 2 .', '8 . 7 . 5 . 3 . 2 . . . 1 . . .'] },
  },
  // SMEUL: fire-breathing metal. Shredding guitar, double kick, dragon-sized
  boss7: {
    bpm: 168, key: 50, scale: 'harmonic', prog: '1 6 4 5', form: 'abbrbc', bassTop: 45,
    drums: { a: { k: 'x.x.x.x.x.x.x.x.', s: BB, h: H8 }, b: { k: H16, s: BB, h: H8, o: 'x...x...x...x...' }, r: { k: 'x.......x.......', h: H8 } },
    bass: { a: 'xxxxxxxxxxxxxxxx', b: 'x.xxx.xxx.xxx.xx' }, bassType: 'reese',
    chords: { type: 'strings', vol: 0.02, lo: 50 },
    mel: { type: 'guitar', vol: 0.08,
      a: ['8 7 8 5 8 7 8 3 8 7 8 5 8 10 12 10', '6 5 6 3 6 5 6 1 6 5 6 3 6 8 10 8', '4 3 4 1 4 3 4 6, 4 3 4 1 4 6 8 6', '5 7 9 7 5 7 9 12 11 9 7 5 2 . 7, .'],
      b: ['12 - - 10 - - 8 - 12 - - 13 - - 12 -', '10 - - 8 - - 6 - 10 - - 11 - - 10 -', '11 - - 10 - - 8 - 6 - - 8 - - 10 -', '9 - - - 11 - - - 12 - - - 14 - - -'] },
  },
  // DUINENRIJK: a slow, warm caravan groove with a darbuka and a reed flute
  desert: {
    bpm: 96, swing: 0.08, key: 52, scale: 'phrygdom', prog: '1 2 1 7', form: 'iaabab', perc: 'darbuka',
    drums: { a: { k: 'x.....x.....x...', s: BB, h: HOFF, p: 'x..x..x.x.x.....' }, b: { k: 'x.....x...x.x...', s: BB, h: H8, p: 'x.xx.xx.x.xx.x.x' } },
    bass: { a: 'x...5...x.....5.', b: 'x..x5...x..x5.o.' }, bassType: 'pluck',
    chords: { type: 'pad', vol: 0.02, lo: 52 },
    arp: { type: 'pluck', pat: '0 1 2 1', rate: 2, vol: 0.03, lo: 64 },
    mel: { type: 'reed', vol: 0.075, a: ['1 . 2 3 . 2 1 . 2 . 3 4 5 . . .', '6 . 5 4 . 3 2 . 3 . 2 1 2 . . .', '5 . 4 3 . 4 5 . 6 . 5 4 3 . . .', '2 . 3 2 . 1 7, . 1 . . . . . . .'],
      b: ['8 . 9 10 . 9 8 . 9 . 10 11 12 . . .', '13 . 12 11 . 10 9 . 10 . 9 8 9 . . .', '12 . 11 10 . 11 12 . 13 . 12 11 10 . . .', '9 . 10 9 . 8 7 . 8 . . . . . . .'] },
  },
  // GRUIZEL: a rumbling chase under the sand
  boss8: {
    bpm: 148, key: 45, scale: 'phrygdom', prog: '1 1 2 1', form: 'abbrbc', perc: 'darbuka', duck: true,
    drums: { a: { k: 'x.x...x.x.x...x.', s: BB, h: H8, p: 'x..x..x...x.....' }, b: { k: 'x.x.x.x.x.x.x.x.', s: BB, c: BB, h: H16, p: 'x.xx.xx.x.xx.x.x' }, r: { p: 'x..x..x.x.x.....' } },
    bass: { a: 'x.xxx.xxx.xxx.xx', b: 'xxxxxxxxxxxxxxxx' }, bassType: 'reese',
    chords: { type: 'pad', vol: 0.018, lo: 50 },
    mel: { type: 'saw', vol: 0.07,
      a: ['1 2 3 . 2 1 . . 1 2 3 . 5 . 4 .', '3 4 5 . 4 3 . . 2 3 4 . 3 . 2 .', '1 2 3 . 2 1 . . 1 2 3 . 5 . 6 .', '8 . 7 . 6 . 5 . 4 . 3 . 2 . 1 .'],
      b: ['8 . 9 . 10 . 9 . 8 . 6 . 5 . 6 .', '9 . 10 . 11 . 10 . 9 . 7 . 6 . 7 .', '8 . 9 . 10 . 12 . 13 . 12 . 10 . 9 .', '8 - - - 6 - - - 5 - - - 2 - - -'] },
  },
  // MAANKRATER: floaty and spacey, low gravity in sound
  moon: {
    bpm: 84, key: 48, scale: 'lydian', prog: '1 2 6 5', form: 'iaabrb',
    drums: { a: { k: 'x...............', s: '........x.......', h: '....x.......x...' }, b: { k: 'x.........x.....', s: '........x.......', h: HOFF, o: '..............x.' } },
    bass: { a: 'x---------------', b: 'x-------x-----5-' }, bassType: 'sub',
    chords: { type: 'pad', vol: 0.025, lo: 55 },
    arp: { type: 'glock', pat: '0 1 2 3 4 3 2 1', rate: 2, vol: 0.02, lo: 64 },
    mel: { type: 'glock', vol: 0.065, oct: 0,
      a: ['5 . . . 7 . . . 9 . . . 8 . 7 .', '6 . . . 9 . . . 11 . . . 9 . 6 .', '8 . . . 10 . . . 12 . . . 10 . 8 .', '7 . . . 9 . . . 12 . . . 11 . . .'],
      b: ['12 . 11 . 9 . 7 . 8 . 9 . 11 . 12 .', '13 . 12 . 9 . 6 . 9 . 11 . 13 . 12 .', '15 . 13 . 12 . 10 . 8 . 10 . 12 . 13 .', '12 . . . 11 . . . 9 . . . 7 . . .'] },
  },
  // MECHA-MIAUW 2.0: robot-cat electro with a squelchy acid bass
  boss9: {
    bpm: 136, key: 48, scale: 'minor', prog: '1 1 6 7', form: 'abbrbc', duck: true,
    drums: { a: { k: F4, s: BB, c: BB, h: HOFF }, b: { k: F4, c: BB, h: H16, o: HOFF }, r: { h: HOFF } },
    bass: { a: 'x.xo.x.xo.x.x.o.', b: 'xxoxxoxxoxxoxxox' }, bassType: 'acid', bassTop: 48,
    chords: { type: 'stab', a: '..x.....x.x.....', vol: 0.02, lo: 60 },
    arp: { type: 'chip', pat: '0 1 2 3 2 1', rate: 1, vol: 0.022, lo: 67 },
    mel: { type: 'synth', vol: 0.06,
      a: ['8 . 8 . 10 . 8 . 11 . 10 . 8 . 7 .', '8 . 8 . 10 . 8 . 12 . 11 . 10 . . .', '6 . 6 . 8 . 6 . 10 . 8 . 6 . 5 .', '7 . 7 . 9 . 7 . 11 . 9 . 12 . . .'],
      b: ['15 . 12 . 10 . 8 . 15 . 12 . 10 . 12 .', '15 . 12 . 10 . 8 . 17 . 15 . 12 . . .', '13 . 10 . 8 . 6 . 13 . 10 . 8 . 10 .', '14 . 11 . 9 . 7 . 14 . 12 . 11 . 9 .'] },
  },
  // DE KORAALZEE: a sunny calypso on steel drums
  sea: {
    bpm: 100, swing: 0.1, key: 53, scale: 'major', prog: '1 4 5 1', form: 'iaabab', perc: 'shaker',
    drums: { a: { k: 'x.......x.......', s: BB, h: HOFF, p: 'x.x.x.x.x.x.x.x.' }, b: { k: 'x..x....x..x....', s: BB, h: H8, p: H16 } },
    bass: { a: 'x..x..5.x..x..5.', b: 'x..x..5.o..x..5.' }, bassType: 'pluck',
    chords: { type: 'strum', a: '..x...x...x...x.', vol: 0.02, lo: 57 },
    mel: { type: 'steel', vol: 0.07, a: ['3 . 5 . 6 5 3 . 2 . 3 . 1 . . .', '4 . 6 . 8 6 4 . 3 . 4 . 2 . . .', '5 . 7 . 9 7 5 . 4 . 5 . 2 . . .', '1 . 3 . 5 3 1 . 7, . 1 . . . . .'],
      b: ['8 . 8 7 8 . 10 . 8 . 7 . 5 . 3 .', '8 . 8 6 8 . 10 . 8 . 6 . 4 . . .', '9 . 9 7 9 . 11 . 9 . 7 . 5 . . .', '8 . 7 . 5 . 3 . 1 . . . . . . .'] },
  },
  // KRAAK: a stormy sea shanty in 6/8 with an accordion
  boss10: {
    bpm: 112, div: 3, steps: 12, key: 50, scale: 'minor', prog: '1 7 6 5', form: 'abbrbc', perc: 'tom',
    drums: { a: { k: 'x.....x.....', s: '...x.....x..', h: 'x.xx.xx.xx.x' }, b: { k: 'x..x..x..x..', s: '...x.....x.x', c: '...x.....x..', h: 'xxxxxxxxxxxx', p: '.....x.....x' }, r: { h: 'x..x..x..x..' } },
    bass: { a: 'x..5..x..5..', b: 'x.5x.5x.5x.5' }, bassType: 'reese',
    chords: { type: 'organ', a: 'x..x..x..x..', vol: 0.018, lo: 55 },
    mel: { type: 'accordion', vol: 0.075,
      a: ['1 . 1 1 2 3 4 . 3 2 . 1', '7, . 7, 7, 1 2 3 . 2 1 . 7,', '6, . 6, 6, 7, 1 2 . 1 7, . 6,', '5, . 7, 2 . 7, 5, . . . . .'],
      b: ['8 . 8 8 9 10 11 . 10 9 . 8', '7 . 7 7 8 9 10 . 9 8 . 7', '6 . 6 6 7 8 9 . 8 7 . 6', '5 . 7 9 . 7 5 . 7 9 . 12'] },
  },
  // the parkour planets: a quick, bouncy chiptune run
  parkour: {
    bpm: 150, key: 52, scale: 'major', prog: '1 6 4 5', form: 'iaabbab',
    drums: { a: { k: 'x...x...x...x.x.', s: BB, h: H8 }, b: { k: 'x...x...x...x.x.', s: '....x.......x..x', h: H16, o: HOFF } },
    bass: { a: 'x.xo.xo.x.xo.xo.', b: 'xoxoxoxoxoxoxoxo' }, bassType: 'pluck',
    chords: { type: 'stab', a: 'x.....x.....x...', vol: 0.018, lo: 59 },
    arp: { type: 'chip', pat: '0 1 2 3', rate: 1, vol: 0.02, lo: 67 },
    mel: { type: 'chip', vol: 0.06,
      a: ['5 . 8 . 7 . 8 . 5 . 3 . 5 . . .', '6 . 8 . 10 . 8 . 6 . 3 . 6 . . .', '4 . 6 . 8 . 6 . 4 . 6 . 8 . 9 .', '7 . 9 . 12 . 11 . 9 . 7 . 5 . . .'],
      b: ['8 8 . 8 . 10 . 12 . 10 8 . 7 . 5 .', '8 8 . 8 . 10 . 13 . 10 8 . 6 . 3 .', '6 6 . 6 . 8 . 11 . 10 8 . 6 . 4 .', '5 7 9 12 11 9 7 5 7 . 9 . 12 . . .'] },
  },
  // DE GOUDEN WERKPLAATS: clanky factory funk
  werk: {
    bpm: 112, swing: 0.1, key: 48, scale: 'dorian', seventh: true, prog: '1 4 1 4', form: 'iaabab', perc: 'anvil',
    drums: { a: { k: 'x.......x.x.....', s: BB, h: 'x.xxx.xxx.xxx.xx', p: '......x.......x.' }, b: { k: 'x..x....x.x..x..', s: '....x..g....x...', h: H16, o: '......x.......x.', p: '..x.....x.x.....' } },
    bass: { a: 'x..x..o.x.x..5.7', b: 'x.xx.ox.x.xx.5o7' }, bassType: 'pluck',
    chords: { type: 'stab', a: '....x.......x.x.', vol: 0.02, lo: 58 },
    mel: { type: 'synth', vol: 0.055,
      a: ['8 . . 7 8 . 10 . . 8 . 7 5 . . .', '4 . . 3 4 . 6 . . 4 . 3 1 . . .', '8 . . 7 8 . 10 . 11 . 10 8 7 . . .', '6 . 4 . 3 . 4 . 6 . 7 . 8 . . .'],
      b: ['12 . 10 12 . 10 8 . 10 . 8 7 . 5 . .', '11 . 9 11 . 9 8 . 9 . 8 6 . 4 . .', '12 . 10 12 . 10 8 . 10 . 12 . 15 . . .', '13 . 12 . 11 . 10 . 9 . 8 . 7 . . .'] },
  },
  // TANDWIELTRON: an industrial machine march, anvils and brass
  boss12: {
    bpm: 150, key: 45, scale: 'harmonic', prog: '1 6 4 5', form: 'abbrbc', perc: 'anvil', hardKick: true,
    drums: { a: { k: 'x.x.x.x.x.x.x.x.', s: '....x.......x..x', h: H16, p: 'x.......x.......' }, b: { k: 'x.x.x.x.x.x.x.x.', s: '....x..x....x.xx', c: BB, h: H16, p: 'x...x...x...x...' }, r: { p: 'x.......x.......', h: H8 } },
    bass: { a: 'x.xxx.x.x.xxx.x.', b: 'xxxxxxxxxxxxxxxx' }, bassType: 'reese',
    chords: { type: 'stab', a: 'x.......x.......', b: 'x..x..x.x..x..x.', vol: 0.022, lo: 52 },
    mel: { type: 'brass', vol: 0.07,
      a: ['1 . 1 1 3 . 1 . 5 . 4 . 3 . 2 .', '1 . 1 1 3 . 1 . 6 . 5 . 3 . . .', '6, . 6, 6, 1 . 6, . 4 . 3 . 1 . . .', '7, . 7, 7, 2 . 7, . 5 . . . 7, . . .'],
      b: ['8 . . 8 10 . 8 . 12 . 11 . 10 . 8 .', '8 . . 8 10 . 8 . 13 . 12 . 10 . . .', '6 . . 6 8 . 6 . 11 . 10 . 8 . . .', '7 . 9 . 11 . 12 . 14 . . . 12 . . .'] },
  },
  // SPOOKPLANEET: a creepy-but-cute waltz (12 steps = one bar of 3/4)
  spook: {
    bpm: 108, steps: 12, key: 50, scale: 'harmonic', prog: '1 4 5 1', form: 'iaabab', perc: 'rim',
    drums: { a: { k: 'x...........', p: '....x...x...', h: '..x...x...x.' }, b: { k: 'x...........', s: '....x...x...', h: 'x.x.x.x.x.x.', p: '..x...x...x.' } },
    bass: { a: 'x...........', b: 'x.......5...' }, bassType: 'pluck',
    chords: { type: 'organ', a: '....x...x...', vol: 0.02, lo: 57 },
    arp: { type: 'glock', pat: '0 1 2', rate: 4, vol: 0.02, lo: 69 },
    mel: { type: 'glock', vol: 0.065, oct: 0,
      a: ['5 . . . 3 . 1 . . . 5 .', '6 . . . 4 . 1 . . . 6 .', '7 . . . 5 . 2 . 7, . 2 .', '1 . . . . . 5, . . . . .'],
      b: ['8 . 7 . 8 . 10 . . . 8 .', '9 . 8 . 6 . 4 . . . 6 .', '7 . 9 . 12 . 11 . 9 . 7 .', '8 . . . 5 . 3 . . . 1 .'] },
  },
  // KONING BOE: a spooky organ gallop, like a ghost train
  boss11: {
    bpm: 152, key: 50, scale: 'harmonic', prog: '1 6 4 5', form: 'abbrbc',
    drums: { a: { k: 'x..xx..xx..xx..x', s: BB, h: HOFF }, b: { k: 'x..xx..xx..xx..x', s: BB, c: BB, h: H8, o: HOFF }, r: { k: 'x...............', h: HOFF } },
    bass: { a: 'x..xx..xx..xx..x', b: 'x.ox.oxx.ox.oxx.' }, bassType: 'reese',
    chords: { type: 'choir', vol: 0.02, lo: 52 },
    mel: { type: 'organ', vol: 0.065,
      a: ['8 7 8 . 7 6 5 4 3 . 4 . 2 . 1 .', '6 5 6 . 5 4 3 1 3 . 4 . 3 . 1 .', '4 3 4 . 3 2 1 6, 1 . 2 . 1 . 6, .', '7, . 2 . 5 . 7 . 9 . . . 7, . . .'],
      b: ['12 11 12 . 11 10 9 8 7 . 8 . 9 . 10 .', '10 9 10 . 9 8 6 . 8 . 10 . 13 . . .', '11 10 11 . 10 9 8 6 8 . 9 . 11 . . .', '9 . 12 . 14 . 12 . 9 . 7 . 5 . . .'] },
  },
  // the finale: warm and triumphant
  finale: {
    bpm: 116, key: 48, scale: 'major', prog: '1 5 6 4', form: 'aabbab',
    drums: { a: { k: 'x.......x.......', s: BB, h: HOFF }, b: { k: F4, s: BB, c: BB, h: H8, o: HOFF } },
    bass: { a: 'x.......x...5...', b: 'x...x.o.x...5.o.' }, bassType: 'pluck',
    chords: { type: 'strings', vol: 0.026, lo: 55 },
    arp: { type: 'glock', pat: '0 1 2 3', rate: 2, vol: 0.02, lo: 67 },
    mel: { type: 'brass', vol: 0.075,
      a: ['3 . . . 5 . . . 8 . 7 . 5 . . .', '2 . . . 5 . . . 7 . 9 . 7 . . .', '1 . . . 3 . . . 6 . 5 . 3 . . .', '4 . . . 6 . . . 8 . 7 . 6 . 5 .'],
      b: ['10 - - - 9 - 8 - 9 - - - 12 - - -', '9 - - - 7 - 5 - 7 - - - 9 - - -', '8 - - - 6 - 5 - 6 - - - 10 - - -', '11 - - - 10 - 8 - 6 - 8 - 5 - - -'] },
  },
  // DE STERRENTEMPEL: solemn and grand, a choir, bells and a harp, with timpani when it builds
  tempel: {
    bpm: 76, key: 50, scale: 'minor', prog: '1 6 3 7', form: 'iaabrb', perc: 'timp',
    drums: { i: { p: 'x...............' }, a: { p: 'x.......x.......', h: '....x.......x...' }, b: { k: 'x.......x.......', p: 'x...x...x...x.x.', h: HOFF } },
    bass: { a: 'x---------------', b: 'x-------x-------' }, bassType: 'sub',
    chords: { type: 'choir', vol: 0.03, lo: 53 },
    arp: { type: 'pluck', pat: '0 1 2 3 4 3 2 1', rate: 2, vol: 0.025, lo: 62 },
    mel: { type: 'glock', vol: 0.06, oct: 0,
      a: ['5 . . . . . 4 . 3 . . . 1 . . .', '3 . . . . . 1 . 6, . . . . . . .', '3 . . . . . 5 . 8 . . . 7 . 5 .', '4 . . . 2 . . . 7, . . . . . . .'],
      b: ['12 . . . 10 . . . 8 . . . 12 . . .', '10 . . . 8 . . . 6 . . . 10 . . .', '10 . . . 12 . . . 15 . . . 14 . 12 .', '11 . . . 9 . . . 7 . . . . . . .'] },
  },
};
let song = null, n = 0, nextT = 0, timer = null, curName = null;
export function music(name) {
  if (!ac) { pending = name; return; }
  if (curName === name) return;
  curName = name;
  song = TRACKS[name] ? prep(TRACKS[name]) : null;
  n = 0; nextT = ac.currentTime + 0.1;
  if (song) { const B = buses(); B.dly.delayTime.value = Math.min(1.2, (60 / song.bpm) * 0.75); B.pad.gain.cancelScheduledValues(ac.currentTime); B.pad.gain.value = 1; song._last = 0; }
  if (!timer) timer = setInterval(sched, 25);
}
export function stopMusic() { song = null; curName = null; }
export const curTrack = () => curName;   // for the music box in Knabbels Werkplaats: which songs you have heard
function sched() {
  if (!song || !ac) return;
  const st = 60 / song.bpm / (song.div || 4);
  if (nextT < ac.currentTime - 0.25) nextT = ac.currentTime + 0.05;   // the tab was asleep: don't play everything we missed at once
  while (nextT < ac.currentTime + 0.12) {
    const sw = song.swing && n % 2 ? st * song.swing : 0;
    try { playStep(song, n, nextT + sw, st); } catch (e) { song = null; setTimeout(() => { throw e; }); return; }   // a broken track goes quiet instead of spamming errors
    nextT += st; n++;
  }
}
