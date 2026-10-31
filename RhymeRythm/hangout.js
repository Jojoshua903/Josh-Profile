'use strict';
// ---------- Hangout: the whole gang on the stoep, tap anyone ----------
const HANG = { act: {}, say: null };
const HSPOTS = [   // name, hit box [x0, y0, x1, y1]
  ['fred', [30, 280, 115, 410]], ['janet', [120, 80, 205, 405]], ['joep', [225, 240, 315, 405]], ['cas', [325, 250, 415, 405]],
  ['luur', [420, 260, 505, 405]], ['pluk', [520, 300, 575, 405]], ['zurm', [690, 250, 800, 420]], ['skelet', [820, 200, 925, 410]],
  ['toon', [400, 440, 540, 500]], ['maat', null],
];
const featherPos = t => [640 + Math.sin(t * .7) * 90, 70 + Math.sin(t * .45) * 30];

function stoepTap(x, y, t) {
  for (const [name, box] of HSPOTS) {
    let hit = false;
    if (name === 'maat') { const [fx, fy] = featherPos(t); hit = Math.hypot(x - fx, y - fy) < 40; }
    else hit = x >= box[0] && x <= box[2] && y >= box[1] && y <= box[3];
    if (!hit) continue;
    const p = PERSONA[name], line = p.taps[Math.floor(Math.random() * p.taps.length)];
    HANG.act[name] = t; HANG.say = { name, line, t, x: name === 'maat' ? featherPos(t)[0] : (box[0] + box[2]) / 2, y: name === 'maat' ? 150 : name === 'toon' ? 380 : box[1] - 40 };
    initAudio(); if (!OUT) newBus(); talk(name, name === 'maat' ? 1 : 3);
    if (name === 'maat') [0, 4, 7, 12].forEach(n => A.voice(ac.currentTime, fq(n), 1.2, .3, 'a'));
    if (name === 'janet') A.tone(ac.currentTime + .05, 600, .15, 'square', .06, 300);
    if (name === 'fred') A.nz(ac.currentTime + .1, .4, .3, 'lowpass', 900, 1, 200);
    return;
  }
}
const since_ = (name, t, dur) => { const s = HANG.act[name]; return s != null && t - s < dur ? (t - s) / dur : -1; };

function drawStoepArea(t) {
  bgStoep('#bfe6f8', '#fbe9cc');
  // lamppost Janet keeps meeting
  ln(205, 400, 205, 70, 8); ln(205, 70, 160, 70, 6); rr(140, 62, 40, 20, 6, '#ffe58a', 4);
  const bp = Math.abs(Math.sin(t * Math.PI));
  // Fred: tinkering, and sometimes things go poof
  const f = since_('fred', t, 1.4);
  ART.fred(72, 348, { arms: f >= 0 ? .9 : .4 + Math.sin(t * 6) * .1, mouth: f >= 0 ? 'wow' : 'smile' });
  if (f >= 0) for (let i = 0; i < 5; i++) circ(110 + Math.cos(i) * f * 50, 300 - f * 80 + Math.sin(i * 2) * 20, 14 + f * 18, `rgba(150,150,160,${.8 - f * .6})`, 0);
  else if ((t % 5) < .3) txt('✦', 120, 320, 22, '#f6b92b');
  // Janet: tall, looks around, bonks her head
  const j = since_('janet', t, 1);
  ART.janet(160, 400, { eyes: j >= 0 && j < .6 ? 'x' : 'open', mouth: j >= 0 ? 'wow' : 'smile', look: Math.sin(t * .8), ar: j >= 0 ? 1 : .3 });
  if (j >= 0 && j < .6) txt('BONK ★', 200, 40, 22, '#ef4a36');
  // Joep: can't stand still
  const jo = since_('joep', t, .9);
  bro('joep', { x: 270, y: 330 - (jo >= 0 ? hop(jo) * 90 : bp * 8), arms: jo >= 0 ? 1 : bp * .5, mouth: 'grin' });
  if (jo < 0 && t % 6 < 1.4) bubble(['Één!', 'Twee!', 'Drie!', 'VIER!'][Math.floor((t % 6) / .35)], 270, 190, 22);
  // Cas: dozes off on a loop, lies down when poked
  const c = since_('cas', t, 2.5), nod = (t % 8) > 5;
  if (c >= 0) { bro('cas', { x: 400, y: 372, rot: -Math.PI / 2, eyes: 'sleepy' }); txt('z z z', 380, 280 - c * 30, 22, INK, 'center', HAND, 400); }
  else bro('cas', { x: 370, y: 335, eyes: nod ? 'sleepy' : 'open', rot: nod ? .08 : 0, mouth: 'smile' });
  // Luur: always inspecting something
  const l = since_('luur', t, 1.6), lk = Math.sin(t * 1.3);
  bro('luur', { x: 462, y: 340, s: .9, look: l >= 0 ? 1 : lk, ar: l >= 0 ? .6 : .2, eyes: 'big', mouth: l >= 0 ? 'wow' : 'o' });
  if (l >= 0) { circ(505, 300, 16, 'rgba(143,211,240,.4)', 4); ln(516, 312, 532, 330, 5); }
  const bug = [460 + Math.cos(t * 2) * 60, 230 + Math.sin(t * 3) * 20];
  ell(bug[0] - 6, bug[1], 6, 9, '#f59ab5', 2, -.4); ell(bug[0] + 6, bug[1], 6, 9, '#f59ab5', 2, .4);
  // Pluk: sways, yanks up a paving tile when poked
  const pl = since_('pluk', t, 1.2);
  actor('pluk', { x: 548, y: 353, bob: pl >= 0 ? 0 : bp * 4, squash: pl >= 0 && pl < .3 ? .6 : 0, arms: pl >= .3 ? 1 : .1, eyes: pl >= 0 ? 'happy' : 'big', mouth: 'grin' });
  if (pl >= .3) rr(518, 220 - (pl - .3) * 20, 60, 22, 3, '#b8a586', 3);
  // Zurm: reading, always
  const z = since_('zurm', t, 2);
  ART.zurm(760, 330, { b: t, ar: .55, mouth: z >= 0 ? 'o' : 'smile' });
  rr(772, 296, 36, 28, 3, '#fffaf0', 3); rr(808, 296, 36, 28, 3, '#fffaf0', 3);
  if (z >= 0) txt('♪ la la ♪', 820, 220 - z * 20, 18, '#6a4a8a', 'center', HAND, 400);
  // Skelet: foot-tapping showman; head pops off when poked
  const sk = since_('skelet', t, 1.4);
  g.save(); g.translate(872, 330); g.scale(.6, .6);
  ART.skeleton(0, 0, { pose: sk >= 0 ? .8 : Math.max(0, Math.sin(t * 2)) * .3, step: Math.sin(t * 4) * .3, grin: 1,
    head: sk >= 0 ? [Math.sin(sk * Math.PI) * 40, -42 - hop(sk) * 220, sk * 12] : null });
  g.restore();
  // Toon: a tentacle peeks out of the drain now and then
  drain(470, 470, 0);
  const to = since_('toon', t, 1.2), peek = to >= 0 ? hop(to) : Math.max(0, Math.sin(t * .5) - .9) * 10;
  if (peek > 0) {
    g.beginPath(); g.moveTo(470, 470); g.quadraticCurveTo(452, 450 - peek * 50, 488, 430 - peek * 60);
    g.lineCap = 'round'; g.lineWidth = 20; g.strokeStyle = INK; g.stroke(); g.lineWidth = 12; g.strokeStyle = '#e8362f'; g.stroke();
  }
  // Maat: only a feather… unless you catch it
  const [fx, fy] = featherPos(t), m = since_('maat', t, 2.5);
  if (m >= 0) { g.save(); g.globalAlpha = Math.sin(m * Math.PI) * .9; g.translate(fx, 120); g.scale(.5, .5); ART.maat(0, 0, 1); g.restore(); }
  ART.feather(fx, fy, Math.sin(t) * .5);
  // speech
  if (HANG.say && t - HANG.say.t < 2.6) {
    const s = HANG.say; bubble(s.line, clamp(s.x, 150, W - 150), Math.max(50, s.y), 20);
  }
  rr(W / 2 - 200, 500, 400, 30, 15, 'rgba(255,255,255,.85)', 3);
  txt('Tap anyone to say hi. (Try the feather.) Market ▸', W / 2, 515, 15, INK, 'center', HAND, 400);
}

// ---------- title screen: the brothers being themselves, plus passing cameos ----------
function drawTitleScene(t) {
  sky('#bfe8f7', '#fbf3e4'); dots();
  for (let i = 0; i < 6; i++) { const x = (i * 190 + t * 20) % (W + 200) - 100; ell(x, 90 + (i % 3) * 30, 60, 22, '#fff', 3); }
  rr(-10, 400, W + 20, 160, 0, '#d9c7a8', 4);
  for (let x = 0; x < W; x += 80) ln(x, 400, x - 30, 540, 3, 'rgba(33,28,52,.35)');
  rr(-10, 386, W + 20, 18, 4, '#b8a586', 4);
  // a cameo strolls past every few seconds
  const cyc = Math.floor(t / 9) % 5, k = (t % 9) / 9, cx = lerp(W + 120, -160, k);
  if (cyc === 0) { actor('pluk', { x: cx, y: 360, bob: Math.abs(Math.sin(t * 8)) * 4, arms: .5 }); g.save(); g.translate(cx + 60, 380); g.rotate(1.3); poly([[-16, -8], [16, -8], [0, 70]], '#ff8a2b', 3); g.restore(); }
  else if (cyc === 1) { ART.zurm(cx, 330, { b: t * 3, ar: .55 }); rr(cx + 12, 296, 32, 24, 3, '#fffaf0', 3); }
  else if (cyc === 2) { g.save(); g.translate(lerp(-160, W + 120, k), 320); g.scale(.6, .6); ART.skeleton(0, 0, { step: Math.sin(t * 6), pose: .3, grin: 1 }); g.restore(); }
  else if (cyc === 3) { ART.janet(cx, 400, { look: -1 }); ART.fred(cx + 80, 348, { arms: .9 }); rr(cx + 60, 230, 40, 70, 8, '#fff', 3); poly([[cx + 60, 232], [cx + 80, 200], [cx + 100, 232]], '#ef4a36', 3); }
  else ART.feather(lerp(200, 760, k), 60 + k * 300, Math.sin(t * 2) * .6);
  const bp = Math.abs(Math.sin(t * 2 * Math.PI)), nod = (t % 7) > 4.5;
  bro('cas', { x: 300, y: 330, bob: nod ? 0 : bp * 4, eyes: nod ? 'sleepy' : 'open', rot: nod ? .1 : 0 });
  if (nod) txt('z', 330, 250 - ((t * 20) % 20), 22, INK, 'center', HAND, 400);
  bro('joep', { x: 480, y: 320, bob: bp * 16, arms: bp, squash: 1 - bp });
  bro('luur', { x: 660, y: 340, s: .9, bob: bp * 6, ar: .4, look: Math.sin(t * 1.3) });
}
