'use strict';
// ---------- Dance room: place the gang on a disco floor, pick a song, they dance on the beat ----------
const DANCERS = [['joep', 'Joep'], ['cas', 'Cas'], ['luur', 'Luur'], ['pluk', 'Pluk'], ['zurm', 'Zurm'], ['janet', 'Janet'], ['fred', 'Fred'], ['skelet', 'Skelet'], ['toon', 'Toon'], ['maat', 'Maat']];
const FLOOR = { top: 240, bot: 440, l0: 260, r0: 700, l1: 40, r1: 920 };   // trapezoid: narrow at the back
const DZ = { tool: 'joep', song: 'stoep', chars: [], t0: 0, spb: .5, bar: 0, L: null, drag: null, moved: false, pose: -9, nice: -9 };

const depth = y => clamp((y - FLOOR.top) / (FLOOR.bot - FLOOR.top), 0, 1);
const onFloor = (x, y) => { const d = depth(y); return y >= FLOOR.top && y <= FLOOR.bot && x >= lerp(FLOOR.l0, FLOOR.l1, d) && x <= lerp(FLOOR.r0, FLOOR.r1, d); };
const dzBeat = () => (ac.currentTime - (ac.outputLatency || ac.baseLatency || 0) - SAVE.lat / 1000 - DZ.t0) / DZ.spb;

function startDance() {
  initAudio();
  const saved = SAVE.dance || {};
  DZ.chars = (saved.chars || [{ who: 'joep', x: 480, y: 380 }, { who: 'cas', x: 360, y: 340 }, { who: 'luur', x: 600, y: 350 }]).map(c => Object.assign({}, c));
  DZ.song = ALL.some(L => L.id === saved.song) ? saved.song : 'stoep';
  $('dzSong').innerHTML = ALL.map(L => `<option value="${L.id}">${L.title} · ${L.bpm} bpm</option>`).join('');
  $('dzSong').value = DZ.song;
  $('dzTools').innerHTML = DANCERS.map(([k, n]) => `<button class="btn alt small dzt" data-k="${k}">${n}</button>`).join('') + '<button class="btn alt small dzt" data-k="remove">✕ Remove</button>';
  [...document.querySelectorAll('.dzt')].forEach(b => b.onclick = () => { DZ.tool = b.dataset.k; markTool(); });
  $('dzSong').onchange = e => { DZ.song = e.target.value; dzMusic(); dzSave(); };  markTool(); mode = 'dance'; show(null); $('danceUI').style.display = 'flex'; dzMusic();
}
function markTool() { [...document.querySelectorAll('.dzt')].forEach(b => b.classList.toggle('sel', b.dataset.k === DZ.tool)); }
function dzMusic() {
  newBus();
  const src = LEVELS.find(l => l.id === DZ.song);
  DZ.L = Object.assign({}, src, { beats: 1e6, intro: 1 });     // progressions cycle, so the song loops forever
  DZ.spb = 60 / src.bpm; DZ.t0 = ac.currentTime + .15; DZ.bar = 0;
}
function dzSave() { SAVE.dance = { song: DZ.song, chars: DZ.chars }; save(); }
function stopDance() { $('danceUI').style.display = 'none'; dzSave(); }
function dancePose() {
  DZ.pose = dzBeat(); A.clap(ac.currentTime, .3);
  const off = Math.abs(DZ.pose - Math.round(DZ.pose));
  if (off < .12) { DZ.nice = DZ.pose; A.tone(ac.currentTime, fq(24), .1, 'square', .06); }
}

// pointer: place with a character tool, drag anyone, remove with the ✕ tool
const dzPt = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; };
function danceDown(e) {
  const [x, y] = dzPt(e);
  const hit = DZ.chars.slice().sort((a, b) => b.y - a.y).find(c => Math.abs(c.x - x) < 40 && y < c.y + 70 && y > c.y - 110);
  if (hit && DZ.tool === 'remove') { DZ.chars.splice(DZ.chars.indexOf(hit), 1); dzSave(); return; }
  if (hit) { DZ.drag = hit; DZ.moved = false; return; }
  if (DZ.tool !== 'remove' && onFloor(x, y) && DZ.chars.length < 20) {
    DZ.chars.push({ who: DZ.tool, x, y: y - 55 }); dzSave();
    initAudio(); talk(DZ.tool, 2);
  }
}
cv.addEventListener('pointermove', e => {
  if (mode !== 'dance' || !DZ.drag) return;
  const [x, y] = dzPt(e);
  if (onFloor(x, y + 55)) { DZ.drag.x = x; DZ.drag.y = y; DZ.moved = true; }
});
addEventListener('pointerup', () => { if (DZ.drag) { if (!DZ.moved && mode === 'dance') talk(DZ.drag.who, 2); DZ.drag = null; dzSave(); } });

// each character has their own way of dancing
function dancer(c, b) {
  const s = lerp(.62, 1, depth(c.y + 60)), f = b - Math.floor(b), beat = Math.floor(b), up = hop(f), posing = b - DZ.pose < .5;
  const o = { x: c.x, y: c.y, s };
  const P = (extra) => Object.assign(o, extra);
  switch (c.who) {
    case 'joep': return bro('joep', P({ bob: up * 26 * s, al: beat % 2 ? 1 : .3, ar: beat % 2 ? .3 : 1, squash: f < .1 ? .4 : 0, mouth: 'grin', eyes: posing ? 'happy' : 'open', arms: posing ? 1 : undefined }));
    case 'cas': return bro('cas', P({ rot: Math.sin(b * Math.PI / 2) * .14, bob: Math.abs(Math.sin(b * Math.PI / 2)) * 6, arms: posing ? 1 : .25 + Math.sin(b * Math.PI / 2) * .15, eyes: posing ? 'happy' : 'sleepy' }));
    case 'luur': return bro('luur', P({ look: beat % 2 ? 1 : -1, bob: up * 12 * s, ar: posing ? 1 : (beat % 4 === 3 ? 1 : .3), al: posing ? 1 : .2, mouth: beat % 4 === 3 ? 'wow' : 'o', squash: Math.sin(b * Math.PI * 2) * .15 }));
    case 'pluk': return actor('pluk', P({ bob: Math.abs(Math.sin(b * Math.PI * 2)) * 14 * s, arms: posing ? 1 : (Math.floor(b * 2) % 2 ? .9 : .1), eyes: 'happy', mouth: 'grin' }));
    case 'zurm': return actor('zurm', P({ ar: posing ? 1 : (beat % 2 ? .9 : .3), al: posing ? 1 : (beat % 2 ? .3 : .9), mouth: 'grin', eyes: posing ? 'happy' : 'open', bob: up * 6 }));
    case 'janet': return actor('janet', P({ rot: Math.sin(b * Math.PI) * .06, bob: up * 8, arms: posing ? 1 : .4 + up * .3, eyes: 'happy', mouth: 'grin' }));
    case 'fred': { const step = beat % 4; return actor('fred', P({ al: posing ? 1 : [1, 0, 1, .5][step], ar: posing ? 1 : [0, 1, .5, 1][step], rot: [0, .1, 0, -.1][step], eyes: 'open', mouth: 'smile' })); }
    case 'skelet': {
      g.save(); g.translate(c.x, c.y); g.scale(s * .6, s * .6);
      const headFly = beat % 8 === 7 ? [Math.sin(f * Math.PI) * 30, -42 - hop(f) * 160, f * 12] : null;
      ART.skeleton(0, 0, { pose: posing ? 1 : (beat % 2 ? .8 : .1), step: Math.sin(b * Math.PI), grin: 1, head: headFly });
      g.restore(); return;
    }
    case 'toon': return actor('toon', P({ bob: up * 14 * s, rot: Math.sin(b * Math.PI) * .15 }));
    case 'maat': {
      g.save(); g.translate(c.x, c.y - 60 - Math.sin(b * Math.PI / 2) * 10); g.scale(s * .55, s * .55); ART.maat(0, 0, .6 + up * .4); g.restore(); return;
    }
    default: {   // chapter 3 friends bring their own moves
      const st = typeof DANCE2 !== 'undefined' && DANCE2[c.who] ? DANCE2[c.who](b, f, beat, up) : { bob: up * 12 };
      if (st.bob) st.bob *= s;
      if (posing) Object.assign(st, { arms: 1, al: 1, ar: 1, eyes: 'happy' });
      return actor(c.who, P(st));
    }
  }
}

function drawDance() {
  if (!DZ.L) return;
  const b = dzBeat(), ahead = Math.max(b, 0) + 8;
  while (DZ.bar * 4 < ahead) { scheduleSong(DZ.L, DZ.t0, DZ.spb, DZ.bar, DZ.bar + 1); DZ.bar++; }
  const beat = Math.floor(b), f = b - beat, pulse = 1 - f;
  sky('#ecdcff', '#ffd3e6'); dots('rgba(106,74,138,.12)', 22);
  // light beams swing with the music
  for (let i = 0; i < 5; i++) {
    const a = Math.sin(b * Math.PI / 2 + i * 1.3) * .5, x = 120 + i * 180;
    g.save(); g.translate(x, 0); g.rotate(a); g.beginPath(); g.moveTo(-8, 0); g.lineTo(8, 0); g.lineTo(90, 520); g.lineTo(-90, 520); g.closePath();
    g.fillStyle = ['rgba(246,185,43,.22)', 'rgba(77,124,240,.16)', 'rgba(239,74,54,.14)'][i % 3]; g.fill(); g.restore();
  }
  // floor tiles light up on the beat
  const rows = 6, cols = 10, COLS = ['#ef4a36', '#f6b92b', '#1f9e8f', '#4d7cf0', '#f59ab5'];
  for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
    const d0 = r / rows, d1 = (r + 1) / rows, y0 = lerp(FLOOR.top, FLOOR.bot, d0), y1 = lerp(FLOOR.top, FLOOR.bot, d1);
    const xa = d => lerp(FLOOR.l0, FLOOR.l1, d), xb = d => lerp(FLOOR.r0, FLOOR.r1, d), fx = (d, t) => lerp(xa(d), xb(d), t);
    const lit = (r + k + beat) % 3 === 0;
    poly([[fx(d0, k / cols), y0], [fx(d0, (k + 1) / cols), y0], [fx(d1, (k + 1) / cols), y1], [fx(d1, k / cols), y1]], lit ? COLS[(r * 3 + k + beat) % 5] : '#fbf3ff', 2);
    if (lit) { g.globalAlpha = pulse * .5; poly([[fx(d0, k / cols), y0], [fx(d0, (k + 1) / cols), y0], [fx(d1, (k + 1) / cols), y1], [fx(d1, k / cols), y1]], '#fff', 0); g.globalAlpha = 1; }
  }
  // disco ball
  ln(480, 0, 480, 46, 3, '#fff'); circ(480, 80, 36, '#c9d3e0', 4);
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + b * .5; rr(480 + Math.cos(a) * 22 - 4, 80 + Math.sin(a) * 22 - 4, 8, 8, 1, (i + beat) % 3 ? '#fff' : '#f6b92b', 0); }
  for (let i = 0; i < 16; i++) { const a = i * 2.4 + b * .4, r = 120 + (i * 37) % 300; circ(480 + Math.cos(a) * r * 1.6, 120 + Math.abs(Math.sin(a)) * r * .5, 3, `rgba(246,185,43,${.3 + pulse * .5})`, 0); }
  // dancers, back to front
  DZ.chars.slice().sort((a, c) => a.y - c.y).forEach(c => dancer(c, b));
  if (b - DZ.nice < .8) { g.globalAlpha = 1 - (b - DZ.nice) / .8; txt('Op de tel!', W / 2, 160, 40, '#f6b92b'); g.globalAlpha = 1; }
  if (!DZ.chars.length) txt('Pick someone below and tap the floor', W / 2, 360, 24, INK, 'center', HAND, 400);
  txt(`♪ ${DZ.L.title}`, 24, 30, 18, INK, 'left');
  for (let i = 0; i < 4; i++) circ(W - 100 + i * 22, 30, 7, beat % 4 === i ? '#f6b92b' : '#fff', 2);
}
