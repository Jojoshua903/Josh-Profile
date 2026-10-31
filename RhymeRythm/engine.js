'use strict';
// ---------- shared constants ----------
const W = 960, H = 540, INK = '#211c34';
const DISPLAY = '"Futura","Avenir Next","Trebuchet MS",sans-serif';
const HAND = '"Marker Felt","Chalkboard SE","Comic Sans MS",cursive';
const LEVELS = [];
const ART = {};                // character drawings shared by levels, story and album
let VOL = 1;
const fq = s => 261.63 * Math.pow(2, s / 12);           // semitones from C4
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const hop = t => { t = clamp(t, 0, 1); return 4 * t * (1 - t); };   // 0→1→0 arc

// ---------- audio ----------
let ac = null, OUT = null, nbuf = null;
function initAudio() {
  if (!ac) {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(ac.destination);
    ac._comp = comp;
    nbuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = nbuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ac.state === 'suspended') ac.resume();
}
function newBus() {
  if (OUT) { try { OUT.gain.setValueAtTime(0, ac.currentTime); OUT.disconnect(); } catch (e) {} }
  OUT = ac.createGain(); OUT.gain.value = 0.8 * VOL; OUT.connect(ac._comp);
}
function env(p, t, a, v, d) {
  p.setValueAtTime(0.0001, t);
  p.exponentialRampToValueAtTime(Math.max(v, 0.0002), t + a);
  p.exponentialRampToValueAtTime(0.0001, t + a + d);
}

const A = {
  tone(t, f, d = .2, type = 'square', v = .1, slide = 0, lp = 0) {
    const o = ac.createOscillator(), gn = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
    env(gn.gain, t, .006, v, d);
    let n = o;
    if (lp) { const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; o.connect(fl); n = fl; }
    n.connect(gn); gn.connect(OUT); o.start(t); o.stop(t + d + .1);
  },
  nz(t, d, v, type = 'highpass', freq = 3000, q = 1, slide = 0) {
    const s = ac.createBufferSource(); s.buffer = nbuf;
    const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(freq, t); fl.Q.value = q;
    if (slide) fl.frequency.exponentialRampToValueAtTime(slide, t + d);
    const gn = ac.createGain(); env(gn.gain, t, .002, v, d);
    s.connect(fl); fl.connect(gn); gn.connect(OUT); s.start(t); s.stop(t + d + .1);
  },
  kick(t, v = .9) {
    const o = ac.createOscillator(), gn = ac.createGain();
    o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(42, t + .14);
    env(gn.gain, t, .002, v, .22); o.connect(gn); gn.connect(OUT); o.start(t); o.stop(t + .3);
  },
  snare(t, v = .35) { A.nz(t, .13, v, 'highpass', 1500); A.tone(t, 200, .07, 'triangle', v * .6); },
  hat(t, v = .07) { A.nz(t, .035, v, 'highpass', 8000); },
  clap(t, v = .3) { for (let i = 0; i < 3; i++) A.nz(t + i * .012, .07, v, 'bandpass', 1400, 1.5); },
  crash(t, v = .18) { A.nz(t, 1.1, v, 'highpass', 5000); },
  bass(t, f, d, v = .22) { A.tone(t, f, d, 'sawtooth', v, 0, 520); },
  pad(t, f, d, v = .03) {
    [-7, 7].forEach(c => {
      const o = ac.createOscillator(), gn = ac.createGain(), fl = ac.createBiquadFilter();
      o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = c;
      fl.type = 'lowpass'; fl.frequency.value = 1300;
      gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(v, t + .25);
      gn.gain.setValueAtTime(v, t + d - .2); gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(fl); fl.connect(gn); gn.connect(OUT); o.start(t); o.stop(t + d + .05);
    });
  },
  // little formant "voice" for character call-outs
  voice(t, f, d = .16, v = .9, vow = 'a', slide = 0) {
    const F = { a: [800, 1200], e: [500, 1900], i: [320, 2300], o: [520, 880], u: [350, 700] }[vow];
    const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
    const gn = ac.createGain(); env(gn.gain, t, .012, v, d);
    F.forEach(ff => { const b = ac.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = ff; b.Q.value = 5; o.connect(b); b.connect(gn); });
    gn.connect(OUT); o.start(t); o.stop(t + d + .1);
  },
  whiff(t) { A.nz(t, .08, .12, 'lowpass', 600); },
};

// Generic song builder. A level describes key, progression, drums, bass, comp and melody.
// L.sections (optional): [{ bar, ...overrides }] switch key, chords, drums or melody from that bar on
const sectionAt = (L0, bar) => L0.sections ? Object.assign({}, L0, ...L0.sections.filter(s => bar >= s.bar)) : L0;
function scheduleSong(L0, t0, spb, from = 0, to = Infinity) {
  const bars = Math.ceil(L0.beats / 4), h = spb / 2, intro = L0.intro ?? 1;
  for (let bar = from; bar < Math.min(bars, to); bar++) {
    const L = sectionAt(L0, bar), key = L.key || 0, rel = bar - (L.bar || 0);
    const bt = t0 + bar * 4 * spb, ch = L.prog[rel % L.prog.length], isIntro = bar < intro;
    const dr = isIntro ? (L.introDrums || { k: 'x...x...', h: 'x.x.x.x.' }) : L.drums;
    for (let i = 0; i < 8; i++) {
      const t = bt + i * h + ((i % 2) ? (L.swing || 0) * h : 0);
      const on = k => dr[k] && dr[k][i] === 'x';
      if (on('k')) A.kick(t); if (on('s')) A.snare(t); if (on('h')) A.hat(t); if (on('c')) A.clap(t);
      if (!isIntro && L.bass) {
        const p = L.bass[i];
        if (p && p !== '.') A.bass(t, fq(key + ch[0] - 24 + ({ 1: 0, 3: ch[1] - ch[0], 5: 7, 8: 12 }[p] || 0)), h * .9);
      }
    }
    if (isIntro) continue;
    if (L.comp === 'stab') [1, 3].forEach(q => ch.forEach(n => A.tone(bt + q * spb, fq(key + n), spb * .3, 'square', .03, 0, 2400)));
    else if (L.comp === 'pad') ch.forEach(n => A.pad(bt, fq(key + n), 4 * spb));
    else if (L.comp === 'arp') for (let i = 0; i < 8; i++) A.tone(bt + i * h, fq(key + ch[i % ch.length] + (i > 3 ? 12 : 0)), h * .8, 'triangle', .05);
    if (L.mel) {
      const m = L.mel[rel % L.mel.length];
      if (m) m.forEach(([st, n, len]) => A.tone(bt + st * h, fq(key + n + 12), len * h * .9, L.lead || 'square', L.leadVol || .045, 0, 3000));
    }
  }
  if (to < bars) return;
  const te = t0 + bars * 4 * spb;
  const LE = sectionAt(L0, bars - 1); A.kick(te); A.crash(te); LE.prog[0].forEach(n => A.tone(te, fq((LE.key || 0) + n), 1.4, 'triangle', .07));
}

// ---------- drawing helpers ----------
const cv = document.getElementById('cv');
let g = cv.getContext('2d'), VIEW = 1;
// draw with the shared helpers onto another canvas (album portraits)
function withCtx(ctx, fn) { const old = g; g = ctx; try { fn(); } finally { g = old; } }
function wrapTxt(s, x, y, maxW, size, col = INK, font = HAND, weight = 400, lh = 1.3) {
  g.font = `${weight} ${size}px ${font}`;
  const lines = []; let line = '';
  s.split(' ').forEach(w => { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; });
  if (line) lines.push(line);
  lines.forEach((l, i) => txt(l, x, y + i * size * lh, size, col, 'left', font, weight));
  return lines.length * size * lh;
}
function fit() {
  const box = document.getElementById('stage').getBoundingClientRect();
  const sc = Math.min((box.width - 30) / W, (box.height - 30) / H), dpr = window.devicePixelRatio || 1;
  cv.style.width = (W * sc) + 'px'; cv.style.height = (H * sc) + 'px';
  cv.width = Math.round(W * sc * dpr); cv.height = Math.round(H * sc * dpr); VIEW = sc * dpr;
}
function paint(fill, lw) {
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (lw) { g.lineWidth = lw; g.strokeStyle = INK; g.lineJoin = 'round'; g.stroke(); }
}
function circ(x, y, r, fill, lw = 4) { g.beginPath(); g.arc(x, y, Math.max(r, .1), 0, Math.PI * 2); paint(fill, lw); }
function ell(x, y, rx, ry, fill, lw = 4, rot = 0) { g.beginPath(); g.ellipse(x, y, Math.max(rx, .1), Math.max(ry, .1), rot, 0, Math.PI * 2); paint(fill, lw); }
function rr(x, y, w, h, r, fill, lw = 4) { g.beginPath(); g.roundRect(x, y, w, h, r); paint(fill, lw); }
function ln(x1, y1, x2, y2, lw = 4, col = INK) {
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.lineWidth = lw; g.strokeStyle = col; g.lineCap = 'round'; g.stroke();
}
function poly(pts, fill, lw = 4) { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); paint(fill, lw); }
function txt(s, x, y, size = 28, col = INK, align = 'center', font = DISPLAY, weight = 800) {
  g.font = `${weight} ${size}px ${font}`; g.textAlign = align; g.textBaseline = 'middle'; g.fillStyle = col; g.fillText(s, x, y);
}
function bubble(s, x, y, size = 26) {
  g.font = `400 ${size}px ${HAND}`;
  const w = g.measureText(s).width + 32, h = size + 22;
  poly([[x - 10, y + h / 2 - 3], [x - 2, y + h / 2 + 14], [x + 10, y + h / 2 - 3]], '#fff', 3);
  rr(x - w / 2, y - h / 2, w, h, h / 2, '#fff', 3);
  txt(s, x, y + 1, size, INK, 'center', HAND, 400);
}
function sky(top, bot) {
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, top); gr.addColorStop(1, bot);
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
}
function dots(col = 'rgba(33,28,52,.08)', step = 18) {
  g.fillStyle = col;
  for (let y = step / 2; y < H; y += step) for (let x = (y / step % 2) * step / 2; x < W; x += step) { g.beginPath(); g.arc(x, y, 1.6, 0, 7); g.fill(); }
}

// Cartoon kid. arms: 0 = down, 1 = straight up. al/ar override per side.
function kid(o) {
  const { x, y, s = 1, col = '#ef4a36', skin = '#f4c7a1', hat = 'none', hatCol = '#fff', eyes = 'open', mouth = 'smile',
    arms = 0, bob = 0, hair = '#4a3022', squash = 0, look = 0, rot = 0 } = o;
  const al = o.al ?? arms, ar = o.ar ?? arms;
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s * (1 + squash * .18), s * (1 - squash * .18)); g.translate(0, -bob);
  if (o.legs !== false) {
    ln(-12, 30, -15, 62, 9); ln(12, 30, 15, 62, 9);
    ell(-19, 65, 13, 7, INK, 0); ell(19, 65, 13, 7, INK, 0);
  }
  [[-1, al], [1, ar]].forEach(([sd, a]) => {
    const hx = sd * (34 + a * 4 + Math.sin(a * 3) * 8), hy = 30 - a * 78;
    ln(sd * 20, 0, hx, hy, 9); circ(hx, hy, 7, skin, 3);
  });
  rr(-26, -14, 52, 50, 16, col);
  circ(0, -44, 30, skin);
  if (hat === 'cap') {
    g.beginPath(); g.arc(0, -50, 31, Math.PI, 0); g.closePath(); paint(hatCol, 4);
    rr(4, -56, 44, 10, 5, hatCol, 4);
  } else if (hat === 'beanie') {
    g.beginPath(); g.arc(0, -52, 32, Math.PI, 0); g.closePath(); paint(hatCol, 4);
    rr(-34, -58, 68, 12, 6, hatCol, 4); circ(0, -88, 8, '#fff', 4);
  } else if (hat === 'tuft') {
    g.beginPath(); g.arc(0, -50, 30, Math.PI * 1.05, -Math.PI * .05); g.quadraticCurveTo(0, -60, -30, -54); paint(hair, 4);
    g.beginPath(); g.moveTo(-2, -78); g.quadraticCurveTo(10, -100, 18, -86); g.lineWidth = 5; g.strokeStyle = INK; g.stroke();
  }
  const ex = look * 4;
  if (eyes === 'big') { [-11, 11].forEach(dx => { circ(dx, -44, 9, '#fff', 3); circ(dx + ex, -43, 4.5, INK, 0); }); }
  else if (eyes === 'sleepy') { [-11, 11].forEach(dx => { ln(dx - 6, -44, dx + 6, -44, 4); }); }
  else if (eyes === 'happy') { [-11, 11].forEach(dx => { g.beginPath(); g.arc(dx, -42, 6, Math.PI * 1.1, -Math.PI * .1); g.lineWidth = 4; g.strokeStyle = INK; g.stroke(); }); }
  else if (eyes === 'x') { [-11, 11].forEach(dx => { ln(dx - 5, -49, dx + 5, -39, 3.5); ln(dx + 5, -49, dx - 5, -39, 3.5); }); }
  else [-11, 11].forEach(dx => circ(dx + ex, -44, 4.5, INK, 0));
  ell(-19, -32, 6, 4, 'rgba(245,120,140,.45)', 0); ell(19, -32, 6, 4, 'rgba(245,120,140,.45)', 0);
  g.beginPath();
  if (mouth === 'o') { circ(0, -28, 6, '#7a2a2a', 3); }
  else if (mouth === 'wow') { ell(0, -26, 9, 11, '#7a2a2a', 3); }
  else if (mouth === 'flat') { ln(-7, -28, 7, -28, 4); }
  else if (mouth === 'grin') { g.arc(0, -32, 11, .1, Math.PI - .1); g.closePath(); paint('#7a2a2a', 3); }
  else if (mouth === 'sad') { g.arc(0, -22, 8, Math.PI * 1.15, -Math.PI * .15); g.lineWidth = 4; g.strokeStyle = INK; g.stroke(); }
  else { g.arc(0, -33, 9, .2, Math.PI - .2); g.lineWidth = 4; g.strokeStyle = INK; g.stroke(); }
  g.restore();
}

// The three brothers, reused across levels
const BRO = {
  joep: { col: '#ef4a36', hat: 'cap', hatCol: '#f6b92b', eyes: 'open', mouth: 'grin' },
  cas:  { col: '#1f9e8f', hat: 'beanie', hatCol: '#7bc96f', eyes: 'sleepy', mouth: 'smile' },
  luur: { col: '#4d7cf0', hat: 'tuft', hair: '#c8742c', eyes: 'big', mouth: 'o' },
};
// Any character slot can be recast (cast-swap remix): CAST maps a role to who plays it.
let CAST = {};
const ACTORS = {};
function actor(name, o) {
  const who = CAST[name] || name;
  if (BRO[who]) return kid(Object.assign({}, BRO[who], o));
  if (ACTORS[who]) return ACTORS[who](o);
}
const bro = (name, o) => actor(name, o);

// small helpers levels use to read the beat state
const since = (P, e) => P.b - e.b;                            // beats since this event's hit point
const hitOk = e => e.res && e.res !== 'miss' && e.res !== 'skip';
const recent = (P, w = .5) => P.last && P.b - P.last.b < w ? P.last : null;

// A ring that shrinks and closes exactly on the hit: a visual countdown for any cue.
function cueRing(P, e, x, y, lead, col = '#ef4a36', r0 = 70) {
  if (e.res || (typeof SAVE !== 'undefined' && SAVE.rings === false) || (P && P.chal && P.chal.noRings)) return;
  const k = (P.b - (e.b - lead)) / lead;
  if (k < 0 || k > 1.25) return;
  const t = clamp(k, 0, 1);
  g.save(); g.globalAlpha = .3 + .65 * t;
  g.beginPath(); g.arc(x, y, 16, 0, Math.PI * 2); g.lineWidth = 3; g.strokeStyle = '#fff'; g.setLineDash([5, 5]); g.stroke(); g.setLineDash([]);
  g.beginPath(); g.arc(x, y, lerp(r0, 16, t), 0, Math.PI * 2); g.lineWidth = 5; g.strokeStyle = col; g.stroke();
  if (t >= 1) { g.beginPath(); g.arc(x, y, 16, 0, Math.PI * 2); g.fillStyle = col; g.globalAlpha = .5; g.fill(); }
  g.restore();
}
// Little pips for counted calls ("één, twee…"): filled as each call sounds.
function callPips(x, y, total, done, col = '#ef4a36') {
  if ((typeof SAVE !== 'undefined' && SAVE.rings === false) || (typeof P !== 'undefined' && P && P.chal && P.chal.noRings)) return;
  for (let i = 0; i < total; i++) circ(x + (i - (total - 1) / 2) * 22, y, 8, i < done ? col : '#fff', 3);
}
