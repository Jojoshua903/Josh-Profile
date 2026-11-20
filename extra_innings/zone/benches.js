'use strict';
/* =========================================================
   DUGOUT BENCHES · the Silksong-style rest
   · every zone's bench in its own materials (rusted scrap, quarry
     timber, steel, foundry iron, stadium gold, glowing crystal, moss,
     frost-covered iron, core neon, chalk), same comfy silhouette
   · layering: backrest, frame and seat behind Nathan; only the outer
     armrests in front of him
   · sitting: the camera eases in and a little lower, the lamp hums,
     a quiet "[ Tab ] Customize Loadout" sits at the bottom of the screen
     (and Tab really opens Crests & Badges while you're seated)
   · now and then a friend is waiting at a bench you've never visited:
     Reshman peeking out from underneath, or Fionn studying a pebble
   Loaded on every story page after zone/map-live.js.
   ========================================================= */
const BENCH_MAT = {
  z1:  { back: '#7a4a32', seat: '#8a5236', leg: '#3a2a24', trim: '#c27a4a', kind: 'scrap' },
  z2:  { back: '#7a5232', seat: '#9a6a42', leg: '#5a4a44', trim: '#b8865a', kind: 'timber' },
  z3:  { back: '#4a5f6c', seat: '#5f7a8a', leg: '#2a3842', trim: '#9ab0bd', kind: 'steel' },
  z4:  { back: '#4a3430', seat: '#5a3c34', leg: '#241818', trim: '#ff7a3a', kind: 'iron' },
  z5:  { back: '#8a5a3a', seat: '#a8734c', leg: '#2a1e14', trim: '#f2c14e', kind: 'stadium' },
  z6:  { back: '#6a3ab0', seat: '#7a4ac8', leg: '#3a2060', trim: '#e0c8ff', kind: 'crystal' },
  z7:  { back: '#6a5236', seat: '#7a6040', leg: '#3a2e20', trim: '#6a9a52', kind: 'moss' },
  z12: { back: '#4a5a4a', seat: '#566a56', leg: '#2a3430', trim: '#5fd6c0', kind: 'moss' },
  z8:  { back: '#4a5a6a', seat: '#566878', leg: '#2a3440', trim: '#eef8ff', kind: 'frost' },
  z9:  { back: '#7a3a5a', seat: '#8a4a6a', leg: '#24121c', trim: '#f2c14e', kind: 'stadium' },
  z10: { back: '#2a2040', seat: '#342850', leg: '#120c1c', trim: '#b388ff', kind: 'core' },
  z11: { back: '#c8bea6', seat: '#d8cfb8', leg: '#8a826e', trim: '#ffffff', kind: 'chalk' },
};
const benchZone = b => {
  if (!b.zone) { const i = LEVEL.benches.indexOf(b), B = PAGE.benches[i]; b.zone = B ? PAGE.zoneOf(B.room) : PAGE.id; }
  return b.zone;
};
const benchMat = b => BENCH_MAT[benchZone(b)] || BENCH_MAT.z1;

/* ---------- the back layer (drawn before Nathan) ---------- */
Game.drawBenchBody = function (b) {
  const M = benchMat(b), k = M.kind, t = Game.time;
  // back posts and front legs
  for (const x of [-27, 22]) { rr(x, -34, 5, 34, 1.5); inked(M.leg, 2); }
  if (k === 'timber') { for (const x of [-31, 21]) { rr(x, -14, 10, 14, 2); inked('#5a4a44', 2.5); } }
  else for (const x of [-29, 23]) { rr(x, -14, 6, 14, 1.5); inked(M.leg, 2); }
  // backrest and seat
  if (k === 'crystal') { ctx.shadowColor = 'rgba(190,140,255,.9)'; ctx.shadowBlur = 14 + Math.sin(t * 2) * 4; }
  if (k === 'core') { ctx.shadowColor = 'rgba(179,136,255,.6)'; ctx.shadowBlur = 8; }
  rr(-31, -42, 62, 10, 2); inked(M.back, 3);
  rr(-34, -22, 68, 9, 2); inked(M.seat, 3);
  ctx.shadowBlur = 0;
  switch (k) {
    case 'scrap':   // rivets, rust blooms and a grate in the seat
      ctx.fillStyle = M.trim; for (const x of [-27, -9, 9, 27]) { ctx.fillRect(x - 1, -39, 2, 2); ctx.fillRect(x - 1, -19, 2, 2); }
      ctx.fillStyle = 'rgba(200,110,50,.5)'; ctx.fillRect(-22, -41, 7, 3); ctx.fillRect(14, -21, 9, 2);
      ctx.fillStyle = 'rgba(13,11,16,.6)'; for (let x = -24; x < 24; x += 6) ctx.fillRect(x, -17, 3, 2);
      break;
    case 'timber':
      ctx.strokeStyle = 'rgba(13,11,16,.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-30, -37); ctx.lineTo(30, -37); ctx.moveTo(-12, -22); ctx.lineTo(-12, -13); ctx.moveTo(12, -22); ctx.lineTo(12, -13); ctx.stroke();
      break;
    case 'steel':
      ctx.fillStyle = 'rgba(13,11,16,.7)'; for (let x = -24; x <= 24; x += 8) { ctx.beginPath(); ctx.arc(x, -37, 1.4, 0, 7); ctx.fill(); }
      ctx.fillStyle = M.trim; ctx.fillRect(-32, -20, 2, 2); ctx.fillRect(30, -20, 2, 2);
      break;
    case 'iron':
      ctx.fillStyle = `rgba(255,122,58,${0.35 + 0.25 * Math.sin(t * 2.6)})`; ctx.fillRect(-32, -15.5, 64, 1.5);
      break;
    case 'stadium':
      ctx.fillStyle = M.trim; ctx.fillRect(-30, -41, 60, 1.5); ctx.fillRect(-33, -21, 66, 1.5);
      for (const x of [-28, 23]) ctx.fillRect(x, -2, 6, 2);
      break;
    case 'crystal':
      ctx.strokeStyle = 'rgba(240,225,255,.55)'; ctx.lineWidth = 1; ctx.beginPath();
      for (const x of [-20, -4, 12]) { ctx.moveTo(x, -42); ctx.lineTo(x + 6, -32); ctx.moveTo(x + 2, -22); ctx.lineTo(x - 4, -13); }
      ctx.stroke();
      for (const [x, h] of [[-30, 12], [-25, 7], [29, 10]]) { ctx.beginPath(); ctx.moveTo(x - 3, -42); ctx.lineTo(x, -42 - h); ctx.lineTo(x + 3, -42); ctx.closePath(); inked('#b388ff', 1.5); }
      break;
    case 'moss':
      ctx.fillStyle = M.trim;
      for (const [x, w] of [[-26, 14], [-4, 18], [18, 10]]) { ctx.beginPath(); ctx.ellipse(x + w / 2, -42, w / 2, 2.5, 0, Math.PI, 0); ctx.fill(); }
      ctx.strokeStyle = M.trim; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-18, -13); ctx.quadraticCurveTo(-17 + Math.sin(t) , -8, -18, -4); ctx.moveTo(8, -13); ctx.lineTo(8, -7); ctx.stroke();
      break;
    case 'frost':
      ctx.fillStyle = M.trim;
      ctx.beginPath(); ctx.ellipse(-10, -42, 18, 3, 0, Math.PI, 0); ctx.ellipse(16, -42, 12, 2.6, 0, Math.PI, 0); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-12, -22, 20, 3, 0, Math.PI, 0); ctx.ellipse(18, -22, 14, 2.5, 0, Math.PI, 0); ctx.fill();
      for (const [x, h] of [[-20, 7], [-6, 5], [10, 8], [24, 5]]) { ctx.beginPath(); ctx.moveTo(x - 2, -13); ctx.lineTo(x + 2, -13); ctx.lineTo(x, -13 + h); ctx.closePath(); ctx.fillStyle = '#d8f0ff'; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = INK; ctx.stroke(); }
      break;
    case 'core':
      ctx.fillStyle = `rgba(179,136,255,${0.6 + 0.3 * Math.sin(t * 3)})`; ctx.fillRect(-30, -33.5, 60, 1.5); ctx.fillRect(-33, -14.5, 66, 1.5);
      break;
    case 'chalk':
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(-30, -40, 60, 1.2);
      break;
  }
  ctx.font = `11px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = k === 'chalk' || k === 'frost' ? INK : BONE; ctx.fillText('DUGOUT', 0, -36.5);
};

/* ---------- the front layer: only the outer armrests sit in front of his knees ---------- */
function benchFront() {
  LEVEL.benches.forEach((b, i) => {
    const B = PAGE.benches[i]; if (!B || ROOM[B.room] !== Zone.room) return;
    const M = benchMat(b);
    ctx.save(); ctx.translate(b.x, b.y); ctx.lineJoin = 'round';
    for (const s of [-1, 1]) {
      rr(s * 36 - 2.5, -27, 5, 27, 1.5); inked(M.leg, 2);
      rr(s * 36 - 7, -30, 14, 5, 2); inked(M.back, 2);
      if (M.kind === 'frost') { ctx.fillStyle = M.trim; ctx.beginPath(); ctx.ellipse(s * 36, -30, 7, 2, 0, Math.PI, 0); ctx.fill(); }
      if (M.kind === 'stadium') { ctx.fillStyle = M.trim; ctx.fillRect(s * 36 - 6, -29.5, 12, 1.2); }
    }
    ctx.restore();
  });
  benchVisitorDraw();
}
const _bnFront = Game.hooks && Game.hooks.front;
if (Game.hooks) Game.hooks.front = function (cam) { if (_bnFront) _bnFront.apply(this, arguments); benchFront(); };

/* ---------- seated: a quiet loadout prompt, and Tab opens Crests & Badges ---------- */
const BN = { promptA: 0, hum: null, humOn: 0, visitor: null };
const benchSeated = () => Player.sitting && Player.seated && !Story.active;
const _bnScreen = Game.hooks && Game.hooks.screen;
if (Game.hooks) Game.hooks.screen = function () {
  if (_bnScreen) _bnScreen.apply(this, arguments);
  BN.promptA = approach(BN.promptA, benchSeated() && !UI.modal ? 1 : 0, 1 / 60 * 3);
  if (BN.promptA < 0.01) return;
  const key = Bindings.label('map', Game.lastInput), y = VH - 34;
  ctx.save(); ctx.globalAlpha = BN.promptA * 0.85; ctx.textBaseline = 'middle';
  ctx.font = `bold 12px ${SERIF_FONT}`; const kw = Math.max(22, ctx.measureText(key).width + 14);
  ctx.font = `italic 15px ${SERIF_FONT}`; const tw = ctx.measureText('Customize Loadout').width, x0 = VW / 2 - (kw + 10 + tw) / 2;
  rr(x0, y - 10, kw, 20, 4); ctx.lineWidth = 1.3; ctx.strokeStyle = '#e6dfd0'; ctx.stroke();
  ctx.textAlign = 'center'; ctx.font = `bold 12px ${SERIF_FONT}`; ctx.fillStyle = '#e6dfd0'; ctx.fillText(key, x0 + kw / 2, y + 1);
  ctx.textAlign = 'left'; ctx.font = `italic 15px ${SERIF_FONT}`; ctx.shadowColor = 'rgba(0,0,0,.85)'; ctx.shadowBlur = 6; ctx.fillText('Customize Loadout', x0 + kw + 10, y + 1);
  ctx.restore();
};
const _bnMap = openMap;
openMap = function () {
  if (benchSeated() && !UI.modal && typeof pmOpen === 'function') { pmOpen('crests'); return; }
  return _bnMap.apply(this, arguments);
};

/* ---------- the overhead lamp's faint hum while you sit ---------- */
function benchHum(on) {
  try {
    const A = SFX.audio && SFX.audio(); if (!A) return;
    if (!BN.hum && on) {
      const g = A.ctx.createGain(); g.gain.value = 0; g.connect(A.out);
      for (const [f, type, v] of [[118, 'sine', 1], [236, 'triangle', 0.35], [354, 'sine', 0.12]]) {
        const o = A.ctx.createOscillator(), og = A.ctx.createGain(); o.type = type; o.frequency.value = f; og.gain.value = v; o.connect(og); og.connect(g); o.start();
      }
      BN.hum = g;
    }
    if (BN.hum && on !== BN.humOn) { BN.humOn = on; BN.hum.gain.setTargetAtTime(on ? 0.014 : 0, A.ctx.currentTime, 0.4); }
  } catch (e) { logErr('benches: hum', e); }
}

/* ---------- friends waiting at a bench you've never been to ---------- */
function benchArrive(b, i) {
  const D = Save.data, q = D.q, key = PAGE.id + ':' + i;
  q.benchSeen = q.benchSeen || {};
  if (q.benchSeen[key]) return;
  q.benchSeen[key] = 1;
  if (BN.visitor || Math.random() > 0.6) return;
  const B = PAGE.benches[i], who = [];
  if (D.reshman || Object.keys(D.reshmanMet || {}).length) who.push('reshman');
  if (D.fionnDead && B && B.room !== 'hub') who.push('fionn');
  if (!who.length) return;
  BN.visitor = { kind: who[(Math.random() * who.length) | 0], b, t: 0 };
  if (BN.visitor.kind === 'reshman' && SFX.blorp) setTimeout(() => SFX.blorp(), 350);
}
function benchVisitorDraw() {
  const V = BN.visitor; if (!V) return;
  const b = V.b, t = V.t;
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (V.kind === 'reshman') {
    // a shadow peeking out from under the seat
    const up = clamp(t / 0.5, 0, 1) * clamp((3.4 - t) / 0.5, 0, 1), h = 11 * up, x = b.x + 12;
    if (h > 0.3) {
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(x, b.y, 12, h, 0, Math.PI, 0); ctx.fill();
      const blink = Math.sin(t * 5) > 0.93 ? 0.3 : 1;
      ctx.fillStyle = '#f3ead8'; ctx.beginPath(); ctx.ellipse(x - 4, b.y - h + 5, 1.8, 2.6 * blink, 0, 0, 7); ctx.ellipse(x + 4, b.y - h + 5, 1.8, 2.6 * blink, 0, 0, 7); ctx.fill();
      ctx.globalAlpha = up; ctx.font = `italic 12px ${SERIF_FONT}`; ctx.fillStyle = 'rgba(243,234,216,.85)'; ctx.fillText('…blorp', x + 10, b.y - 26);
    }
  } else {
    // Fionn crouched over a pebble, then hopping off
    const p = clamp((t - 2.3) / 1.1, 0, 1), x = b.x + 64 + p * 140, y = b.y - Math.sin(Math.PI * Math.min(1, p * 2)) * 34 - (p > 0.5 ? Math.sin(Math.PI * (p * 2 - 1)) * 24 : 0);
    ctx.globalAlpha = clamp(t / 0.4, 0, 1) * (1 - clamp((t - 3.1) / 0.4, 0, 1));
    drawFionn(x, y, p > 0 ? 1 : -1, Game.time, { kneel: p === 0 });
    if (p === 0) {
      ctx.fillStyle = '#8c8478'; ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x - 12, b.y - 14 + Math.sin(t * 3) * 1.5, 4, 3, 0.3, 0, 7); ctx.fill(); ctx.stroke();
      ctx.font = `italic 12px ${SERIF_FONT}`; ctx.fillStyle = 'rgba(243,234,216,.85)'; ctx.fillText(t < 1.2 ? 'Hm.' : 'Ooh. Basalt.', x - 6, b.y - 78);
    }
  }
  ctx.restore();
}

/* ---------- per frame: camera framing, the hum, arrivals ---------- */
const _bnTick = PAGE.tick;
PAGE.tick = function (dt) {
  if (_bnTick) _bnTick.apply(this, arguments);
  const P = Player, sat = (P.sitting || P.sit > 0.5) && !Story.active;
  // frame the bench a little lower while he sits (standing, the player code takes the look back over)
  if (sat) Game.cam.lookY = lerp(Game.cam.lookY, 34, 1 - Math.exp(-dt * 3));
  benchHum(sat ? 1 : 0);
  LEVEL.benches.forEach((b, i) => { if (b.near && !b.wasNear && !Story.active) benchArrive(b, i); b.wasNear = b.near; });
  if (BN.visitor) { BN.visitor.t += dt; if (BN.visitor.t > 4) BN.visitor = null; }
};
