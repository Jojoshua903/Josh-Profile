'use strict';
// ---------- Hangout area 2: De Markt (chapter 3 friends) ----------
HANG.area = 0;
const MSPOTS = [   // name, hit box
  ['pieter', [40, 250, 140, 410]], ['koen', [180, 230, 280, 400]], ['annemiek', [300, 240, 390, 410]], ['kouw', [420, 180, 560, 420]],
  ['martin', [600, 300, 720, 420]], ['rolf', [740, 190, 860, 420]], ['baas', [760, 30, 940, 140]], ['sint', [470, 40, 540, 130]],
];
const baasBeaten = () => (SAVE.best.baas ?? -1) >= 62;
const arrowHit = (x, y) => y > 230 && y < 310 && (HANG.area === 0 ? x > W - 60 : x < 60);

function hangTap(x, y, t) {
  if (arrowHit(x, y)) { HANG.area = 1 - HANG.area; HANG.say = null; initAudio(); if (!OUT) newBus(); A.tone(ac.currentTime, fq(19), .08, 'triangle', .1); return; }
  if (HANG.area === 0) return stoepTap(x, y, t);
  for (const [name, box] of MSPOTS) {
    if (name === 'sint' && !baasBeaten()) continue;
    if (x < box[0] || x > box[2] || y < box[1] || y > box[3]) continue;
    const p = PERSONA[name], line = p.taps[Math.floor(Math.random() * p.taps.length)];
    HANG.act[name] = t; HANG.say = { line, t, x: (box[0] + box[2]) / 2, y: Math.max(60, box[1] - 30) };
    initAudio(); if (!OUT) newBus(); talk(name, 3);
    if (name === 'rolf') A.voice(ac.currentTime + .3, fq(0), .6, .8, 'u', fq(7));
    if (name === 'kouw') [0, .12, .24].forEach(d => A.tone(ac.currentTime + d, 700, .04, 'square', .08));
    if (name === 'baas') A.tone(ac.currentTime, 1800, .2, 'square', .05, 300);
    return;
  }
}
function arrow(dir) {
  const x = dir > 0 ? W - 34 : 34;
  circ(x, 270, 24, '#fff', 4); poly(dir > 0 ? [[x - 7, 258], [x + 9, 270], [x - 7, 282]] : [[x + 7, 258], [x - 9, 270], [x + 7, 282]], INK, 0);
}
function drawHangout(t) {
  if (HANG.area === 0) { drawStoepArea(t); arrow(1); return; }
  const act = (n, d) => since_(n, t, d), bp = Math.abs(Math.sin(t * Math.PI));
  sky('#fff1c4', '#fde0b0');
  for (let i = 0; i < 10; i++) poly([[i * 100, 150], [i * 100 + 50, 196], [i * 100 + 100, 150]], i % 2 ? '#ef4a36' : '#fff', 3);
  rr(-10, 146, W + 20, 10, 0, '#9b6b43', 3); rr(-10, 410, W + 20, 140, 0, '#d8c6a6', 4);
  // De Baas still hovers above the market, until you beat him
  if (!baasBeaten()) { ART.ufo(850, 80 + Math.sin(t * 2) * 6, act('baas', 1) >= 0 ? 1 : 0); g.save(); g.translate(850, 40); g.scale(.3, .3); ACTORS.baas({ x: 0, y: 0, mouth: 'grin' }); g.restore(); }
  else { actor('sint', { x: 505, y: 120, s: .55, ar: act('sint', 1.5) >= 0 ? 1 : .3 }); ART.ufo(870, 60, 0); }
  // Pieter waters the planters
  const pi = act('pieter', 1.5); rr(20, 380, 140, 30, 6, '#c96a4a', 4);
  for (let i = 0; i < 4; i++) { ln(40 + i * 34, 380, 40 + i * 34, 350 - (pi >= 0 ? pi * 30 : 0), 4, '#3d8a3a'); circ(40 + i * 34, 346 - (pi >= 0 ? pi * 30 : 0), 7, ['#ef4a36', '#f6b92b', '#f59ab5', '#fff'][i], 2); }
  actor('pieter', { x: 90, y: 300, s: .85, ar: pi >= 0 ? 1 : .5, bob: bp * 3 });
  // Koen at his melon stall
  const ko = act('koen', 1); rr(150, 350, 150, 60, 6, '#c8742c', 4); for (let i = 0; i < 5; i++) circ(170 + i * 26, 344, 12, '#3d8a3a', 3);
  actor('koen', { x: 230, y: 290, s: .85, ar: ko >= 0 ? 1 : .2, al: .3, mouth: ko >= 0 ? 'wow' : 'flat' });
  if (ko >= 0 && ko < .5) txt('SALUUT!', 230, 160, 18, '#55682c');
  // Annemiek pulls faces
  const an = act('annemiek', 1.2);
  actor('annemiek', { x: 345, y: 330, s: .85, rot: an >= 0 ? Math.sin(an * 20) * .3 : Math.sin(t * 2) * .05, eyes: an >= 0 ? 'x' : 'big', mouth: an >= 0 ? 'wow' : 'grin', al: an >= 0 ? 1 : .2 });
  // Kouw on the scaffolding
  ln(430, 410, 430, 160, 5, '#9aa3b5'); ln(550, 410, 550, 160, 5, '#9aa3b5'); ln(430, 260, 550, 260, 5, '#9aa3b5');
  const kw = act('kouw', 1);
  actor('kouw', { x: 490, y: 300 - (kw >= 0 ? hop(kw) * 40 : 0), s: .7, ar: kw >= 0 ? Math.abs(Math.sin(kw * 30)) : .5 });
  // Martin-Broom asleep on a bench
  rr(600, 380, 120, 14, 4, '#9b6b43', 3); ln(612, 394, 612, 410, 5); ln(708, 394, 708, 410, 5);
  const ma = act('martin', 2);
  actor('martin', { x: 660, y: 352, s: .8, rot: ma >= 0 ? 0 : -1.3, eyes: ma >= 0 && ma < .6 ? 'open' : 'sleepy', mouth: ma >= 0 ? 'wow' : 'smile' });
  if (ma >= 0) ell(700, 250, 40 + ma * 10, 26, 'rgba(255,255,255,.8)', 3), txt('🍉', 700, 250, 22, INK);
  // Rolf doing push-ups (or howling when poked)
  const ro = act('rolf', 1.5);
  if (ro >= 0) actor('rolf', { x: 800, y: 300, s: .9, ar: 1, al: 1, mouth: 'wow', rot: -.1 });
  else actor('rolf', { x: 800, y: 340 + Math.abs(Math.sin(t * 3)) * 16, s: .9, rot: 1.3, arms: .1 });
  if (HANG.say && t - HANG.say.t < 2.6) bubble(HANG.say.line, clamp(HANG.say.x, 150, W - 150), HANG.say.y, 20);
  rr(W / 2 - 200, 500, 400, 30, 15, 'rgba(255,255,255,.85)', 3);
  txt('◂ Stoep · De Markt · tap anyone to say hi', W / 2, 515, 15, INK, 'center', HAND, 400);
  arrow(-1);
}
