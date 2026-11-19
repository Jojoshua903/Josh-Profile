'use strict';
/* =========================================================
   SIDE-QUEST CAST · Coach Monfort, Byte, Pip & Squeak, the
   Grounds-Keeper, plus every quest pickup and gadget.
   (state & placement live in zone/quests.js)
   ========================================================= */
const QT = (tx, row) => ({ x: tx * TILE + TILE / 2, y: row * TILE });
const MONO_FONT = '15px ui-monospace, Menlo, Consolas, monospace';

/* ---------- Coach Monfort: washed-up scout on an upside-down bucket ---------- */
function drawVanceHead(hx, hy, t) {
  ctx.beginPath(); ctx.arc(hx, hy, 10, 0, 7); inked('#e8c3a0', 3);
  ctx.fillStyle = 'rgba(90,70,60,.3)'; ctx.beginPath(); ctx.arc(hx + 2, hy + 3, 8, 0.2, Math.PI - 0.2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(hx + 5, hy + 3, 5, 2.2, 0.1, 0, 7); ctx.fillStyle = '#9a948a'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = INK; ctx.stroke();
  ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hx + 3, hy - 3); ctx.lineTo(hx + 9, hy - 2); ctx.stroke();   // permanent squint
  // the crooked visor
  ctx.save(); ctx.translate(hx, hy - 6); ctx.rotate(-0.3);
  ctx.beginPath(); ctx.moveTo(-11, 1); ctx.quadraticCurveTo(0, -5, 11, 1); ctx.lineTo(11, 3); ctx.lineTo(-11, 3); ctx.closePath(); inked('#2f6a3a', 2.5);
  ctx.beginPath(); ctx.moveTo(4, 1); ctx.quadraticCurveTo(16, 0, 22, 6); ctx.lineTo(5, 5); ctx.closePath(); inked('#3f8a4a', 2.5);
  ctx.restore();
  ctx.strokeStyle = GOLD; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(hx - 4, hy + 9); ctx.quadraticCurveTo(hx + 2, hy + 18, hx + 8, hy + 9); ctx.stroke();   // whistle cord
}
function drawVance(x, y, facing, t, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(facing, 1); ctx.lineJoin = 'round';
  // upside-down bucket
  ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(12, 0); ctx.lineTo(9, -18); ctx.lineTo(-9, -18); ctx.closePath(); inked('#8a8f99', 2.5);
  ctx.strokeStyle = 'rgba(13,11,16,.4)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-10.5, -6); ctx.lineTo(10.5, -6); ctx.moveTo(-9.8, -12); ctx.lineTo(9.8, -12); ctx.stroke();
  const hip = -20, breathe = Math.sin(t * 2) * 0.8;
  limb(-2, hip, 0.1, 13, '#2f6a3a', 6); const [kx, ky] = limb(4, hip + 1, 0.05, 13, '#2f6a3a', 6);
  limb(kx, ky, Math.PI / 2, 17, '#2f6a3a', 6);
  ctx.fillStyle = BONE; ctx.beginPath(); ctx.ellipse(kx + 4, -1, 7, 3.5, 0, 0, 7); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
  // tracksuit with a proud belly
  ctx.beginPath(); ctx.ellipse(1, hip - 12 + breathe * 0.3, 11 + breathe * 0.4, 13, 0, 0, 7); inked('#2f6a3a', 3);
  ctx.strokeStyle = BONE; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-7, hip - 22); ctx.lineTo(-9, hip - 2); ctx.stroke();
  ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(7, hip - 16, 2.4, 0, 7); ctx.fill();   // whistle
  // arm out with the broken stopwatch
  const [hx, hy] = limb(4, hip - 20, 0.55 + Math.sin(t * 1.3) * 0.08, 13, '#2f6a3a', 5);
  ctx.beginPath(); ctx.arc(hx + 3, hy - 1, 6, 0, 7); inked('#d9d4c8', 2.5);
  ctx.strokeStyle = INK; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(hx + 3, hy - 1); ctx.lineTo(hx + 3 + Math.cos(t * 0.2) * 4, hy - 1 + Math.sin(t * 0.2) * 4); ctx.stroke();
  ctx.strokeStyle = 'rgba(13,11,16,.6)'; ctx.beginPath(); ctx.moveTo(hx, hy - 5); ctx.lineTo(hx + 4, hy - 1); ctx.lineTo(hx + 2, hy + 4); ctx.stroke();   // crack
  ctx.fillStyle = '#8a8f99'; ctx.fillRect(hx + 1.5, hy - 9, 3, 3);
  drawVanceHead(2, hip - 34, t);
  ctx.restore();
}

/* ---------- Byte: one of Josh's abandoned drones, now self-aware and rude ---------- */
// a round little drone: a metal ball with a ring of propellers on top, a screen face, an antenna and duct tape
function drawByteBot(x, y, t, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.tilt !== undefined ? o.tilt : Math.sin(t * 2) * 0.08); ctx.lineJoin = 'round';
  const broken = !!o.broken, R = 13;
  // the rotor ring on top: two blurred blades spinning (or one stuck blade when broken)
  ctx.fillStyle = INK; ctx.fillRect(-1.5, -R - 6, 3, 6);
  if (broken) { ctx.save(); ctx.translate(0, -R - 6); ctx.rotate(0.35); ctx.fillStyle = '#6b6f7a'; ctx.fillRect(-12, -1.5, 24, 3); ctx.restore(); }
  else {
    const s = Math.abs(Math.cos(t * 40));
    ctx.fillStyle = 'rgba(243,234,216,.85)'; ctx.fillRect(-15 * s, -R - 8, 30 * s, 3);
    ctx.fillStyle = 'rgba(243,234,216,.25)'; ctx.beginPath(); ctx.ellipse(0, -R - 6.5, 15, 2.5, 0, 0, 7); ctx.fill();
  }
  // the antenna, with a blinking tip
  ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(7, -R + 3); ctx.quadraticCurveTo(12, -R - 4, 10, -R - 9); ctx.stroke();
  ctx.fillStyle = Math.sin(t * 5) > 0 ? '#ff4a3a' : '#5a1a14'; ctx.beginPath(); ctx.arc(10, -R - 9, 2, 0, 7); ctx.fill();
  // the round body: a shaded metal ball with a seam around its middle
  ctx.beginPath(); ctx.arc(0, 0, R, 0, 7);
  const g = ctx.createRadialGradient(-4, -5, 2, 0, 0, R);
  g.addColorStop(0, broken ? '#b4b8c0' : '#eef0f4'); g.addColorStop(1, broken ? '#6f747e' : '#9ea3ad');
  inked(g, 2.5);
  ctx.strokeStyle = 'rgba(13,11,16,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(0, 3, R - 0.5, 4, 0, 0, Math.PI); ctx.stroke();
  // duct tape across a dent
  ctx.save(); ctx.translate(-9, 6); ctx.rotate(-0.7); ctx.fillStyle = '#d9b77a'; ctx.fillRect(-2.5, -5, 5, 10); ctx.restore();
  // the screen face
  ctx.beginPath(); ctx.ellipse(0, -1, 8.5, 6, 0, 0, 7); inked('#0d1a14', 2);
  const flick = broken && Math.sin(t * 23) > 0.3;
  ctx.fillStyle = broken ? (flick ? '#ff4a3a' : '#5a1a14') : '#50dc78';
  ctx.font = '7px ui-monospace, Menlo, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(o.face || (broken ? 'x_x' : '-_-'), 0, -1);
  // a glint on the shell
  ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(-6, -8, 2.5, 1.4, -0.6, 0, 7); ctx.fill();
  // the hover glow underneath
  if (!broken) { ctx.fillStyle = 'rgba(111,211,255,.7)'; ctx.beginPath(); ctx.ellipse(0, R + 3, 6, 2 + Math.abs(Math.sin(t * 30)) * 2, 0, 0, 7); ctx.fill(); }
  ctx.restore();
}
function drawScrapPile(x, y, t) {
  ctx.save(); ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(x - 44, y); ctx.quadraticCurveTo(x - 30, y - 22, x - 6, y - 18); ctx.quadraticCurveTo(x + 22, y - 26, x + 44, y); ctx.closePath(); inked('#4a4f5a', 2.5);
  for (const [gx, gy, r] of [[-26, -8, 7], [18, -10, 6], [30, -4, 4]]) { ctx.beginPath(); ctx.arc(x + gx, y + gy, r, 0, 7); inked('#8a8f99', 2); ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x + gx, y + gy, r * 0.35, 0, 7); ctx.fill(); }
  ctx.fillStyle = '#6b6f7a'; ctx.fillRect(x - 10, y - 20, 14, 4); ctx.fillRect(x + 4, y - 16, 4, 12);
  ctx.restore();
}

/* ---------- Pip & Squeak: two shadow scalpers in one trench coat ---------- */
function drawPipHead(hx, hy, t) {
  ctx.beginPath(); ctx.ellipse(hx, hy + 2, 10, 9, 0, 0, 7); ctx.fillStyle = '#000'; ctx.fill();
  ctx.beginPath(); ctx.ellipse(hx, hy - 6, 15, 3, 0, 0, 7); inked('#5a3a24', 2);
  rr(hx - 8, hy - 15, 16, 9, 2); inked('#5a3a24', 2); ctx.fillStyle = '#b8283c'; ctx.fillRect(hx - 8, hy - 9, 16, 2.5);
  const blink = Math.sin(t * 1.9) > 0.95;
  ctx.save(); ctx.shadowColor = '#ffe8a0'; ctx.shadowBlur = 8; ctx.fillStyle = '#ffe8a0';
  for (const ox of [-3.5, 3.5]) { ctx.beginPath(); ctx.ellipse(hx + ox, hy + 1, 2, blink ? 0.3 : 2.6, 0, 0, 7); ctx.fill(); }
  ctx.restore();
}
function drawSqueakHead(hx, hy, t) {
  ctx.beginPath(); ctx.ellipse(hx, hy, 9, 8, 0, 0, 7); ctx.fillStyle = '#000'; ctx.fill();
  ctx.save(); ctx.translate(hx + 8, hy + 6); ctx.rotate(-0.4); rr(-6, -3, 12, 7, 1); inked(GOLD, 1.5); ctx.restore();   // a Golden Stub
  const blink = Math.sin(t * 2.3 + 1) > 0.95;
  ctx.save(); ctx.shadowColor = '#f3ead8'; ctx.shadowBlur = 8; ctx.fillStyle = '#f3ead8';
  for (const ox of [-3, 3]) { ctx.beginPath(); ctx.ellipse(hx + ox, hy - 1, 1.8, blink ? 0.3 : 3, 0, 0, 7); ctx.fill(); }
  ctx.restore();
}
function drawScalpers(x, y, facing, t) {
  ctx.save(); ctx.translate(x, y); ctx.scale(facing, 1); ctx.rotate(Math.sin(t * 2.6) * 0.025); ctx.lineJoin = 'round';
  // little shadow feet poking out under the coat
  ctx.fillStyle = '#000'; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.ellipse(-7 + k * 5, -1, 3, 2 + Math.abs(Math.sin(t * 6 + k)) * 1.5, 0, 0, 7); ctx.fill(); }
  ctx.beginPath(); ctx.moveTo(-13, -2); ctx.lineTo(13, -2); ctx.lineTo(15, -46); ctx.lineTo(8, -52); ctx.lineTo(-8, -52); ctx.lineTo(-15, -46); ctx.closePath(); inked('#9a7a4a', 3);
  ctx.fillStyle = '#7a5a34'; ctx.fillRect(-14, -26, 28, 4);
  // the gap in the coat, where Squeak peeks out
  ctx.beginPath(); ctx.moveTo(0, -52); ctx.lineTo(4, -28); ctx.lineTo(0, -4); ctx.lineTo(-4, -28); ctx.closePath(); ctx.fillStyle = '#000'; ctx.fill();
  const sb = Math.sin(t * 2.3 + 1) > 0.95;
  ctx.save(); ctx.shadowColor = '#f3ead8'; ctx.shadowBlur = 6; ctx.fillStyle = '#f3ead8';
  for (const ox of [-1.5, 1.5]) { ctx.beginPath(); ctx.ellipse(ox, -36, 1.1, sb ? 0.2 : 2, 0, 0, 7); ctx.fill(); }
  ctx.restore();
  // collar flipped up
  ctx.beginPath(); ctx.moveTo(-10, -52); ctx.lineTo(-13, -60); ctx.lineTo(-4, -53); ctx.moveTo(10, -52); ctx.lineTo(13, -60); ctx.lineTo(4, -53); inked('#8a6a3a', 2);
  drawPipHead(2, -62, t);
  // a tray of contraband badges
  rr(10, -30, 18, 6, 1); inked('#5a3a24', 2);
  [[13, '#e8361c'], [19, '#6fd3ff'], [25, GOLD]].forEach(([bx, c]) => { ctx.beginPath(); ctx.arc(bx, -32, 2.5, 0, 7); inked(c, 1.2); });
  ctx.restore();
}

/* ---------- The Grounds-Keeper: a silent giant with headphones and a broom ---------- */
function drawKeeperHead(hx, hy, t, lift = 0) {
  ctx.beginPath(); ctx.arc(hx, hy, 10, 0, 7); inked('#c9a07a', 3);
  ctx.fillStyle = '#6b5a4a'; ctx.beginPath(); ctx.arc(hx, hy + 4, 9, 0.15, Math.PI - 0.15); ctx.fill();   // beard
  ctx.fillStyle = INK; ctx.fillRect(hx + 3, hy - 3, 4, 2);
  ctx.strokeStyle = '#c8283a'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(hx, hy - 2, 12, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(hx - 11, hy, 4.5, 6.5, 0, 0, 7); inked('#c8283a', 2.5);
  ctx.save(); ctx.translate(hx + 11, hy - lift * 9); ctx.rotate(-lift * 0.8); ctx.beginPath(); ctx.ellipse(0, 0, 4.5, 6.5, 0, 0, 7); inked('#c8283a', 2.5); ctx.restore();
}
function drawKeeper(x, y, facing, t, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(facing, 1); ctx.lineJoin = 'round';
  const sweep = o.stop ? 0 : Math.sin(t * 1.6);
  limb(-10, -60, Math.PI / 2 + 0.05, 56, '#3a4a5a', 13); limb(10, -60, Math.PI / 2 - 0.05, 56, '#3a4a5a', 13);
  ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(-10, -2, 12, 5, 0, 0, 7); ctx.ellipse(14, -2, 12, 5, 0, 0, 7); ctx.fill();
  // huge torso, overalls over a work shirt
  ctx.beginPath(); ctx.moveTo(-30, -104); ctx.lineTo(30, -104); ctx.lineTo(20, -58); ctx.lineTo(-20, -58); ctx.closePath(); inked('#c9b48a', 3.5);
  ctx.beginPath(); ctx.moveTo(-20, -86); ctx.lineTo(20, -86); ctx.lineTo(20, -58); ctx.lineTo(-20, -58); ctx.closePath(); inked('#3a4a5a', 3);
  ctx.strokeStyle = '#3a4a5a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-14, -86); ctx.lineTo(-18, -104); ctx.moveTo(14, -86); ctx.lineTo(18, -104); ctx.stroke();
  ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(-14, -84, 2.5, 0, 7); ctx.arc(14, -84, 2.5, 0, 7); ctx.fill();
  // broom: both hands on the handle, bristles swishing the floor
  const bx = 36 + sweep * 14, gx = 8, gy = -74;
  ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(gx - 8, gy - 16); ctx.lineTo(bx, -10); ctx.stroke();
  ctx.strokeStyle = '#a8734c'; ctx.lineWidth = 3; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(bx - 10, -12); ctx.lineTo(bx + 10, -12); ctx.lineTo(bx + 14, 0); ctx.lineTo(bx - 14, 0); ctx.closePath(); inked('#d9b77a', 2.5);
  limb(-24, -100, 0.9, 30, '#c9b48a', 9); limb(24, -100, 1.6, 26, '#c9b48a', 9);
  drawKeeperHead(4, -116, t, o.lift || 0);
  ctx.restore();
}

/* ---------- Immanuel: striker, set-piece specialist, keeper of the chicken stick ---------- */
function drawChickenStick(x, y, t) {
  // a skewer, and on the end of it, lunch
  ctx.strokeStyle = '#c9a37a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 12, y - 26); ctx.stroke();
  ctx.save(); ctx.translate(x + 13, y - 28); ctx.rotate(0.2 + Math.sin(t * 2) * 0.06); ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.ellipse(0, 0, 10, 8, 0, 0, 7); inked('#c8863a', 2.5);
  ctx.beginPath(); ctx.ellipse(-1.5, -1.5, 6, 4.5, 0.3, 0, 7); ctx.fillStyle = '#e0a860'; ctx.fill();
  ctx.beginPath(); ctx.ellipse(8, 5, 4.6, 3.2, 0.9, 0, 7); inked('#c8863a', 2);
  ctx.beginPath(); ctx.ellipse(11.5, 7.5, 3.2, 2.2, 0.9, 0, 7); inked('#f3ead8', 1.8);
  ctx.restore();
}
function drawImmanuelHead(hx, hy, t) {
  ctx.beginPath(); ctx.arc(hx, hy, 10, 0, 7); inked('#8a5a3a', 3);
  // close-cropped hair and a sweatband
  ctx.beginPath(); ctx.moveTo(hx - 10, hy + 1); ctx.quadraticCurveTo(hx - 11, hy - 12, hx + 1, hy - 11); ctx.quadraticCurveTo(hx + 11, hy - 11, hx + 10, hy + 1); ctx.closePath(); inked('#1a1418', 2.5);
  ctx.strokeStyle = '#f3ead8'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(hx - 10, hy - 4); ctx.quadraticCurveTo(hx, hy - 7, hx + 10, hy - 4); ctx.stroke();
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(hx - 3.5, hy + 2, 1.6, 0, 7); ctx.arc(hx + 4, hy + 2, 1.6, 0, 7); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(hx + 1, hy + 5, 4.5, 0.1, Math.PI - 0.1); ctx.stroke();   // permanently delighted
}
function drawImmanuel(x, y, facing, t) {
  ctx.save(); ctx.translate(x, y); ctx.scale(facing, 1); ctx.lineJoin = 'round';
  const kick = Math.sin(t * 3.6), bounce = Math.abs(kick);
  // legs: one planted, one doing keepy-uppies in a pulled-up sock
  const [k1x, k1y] = limb(-4, -26, Math.PI / 2 + 0.06, 9, '#8a5a3a', 6);
  const [f1x, f1y] = limb(k1x, k1y, Math.PI / 2 + 0.02, 15, '#e8e2d0', 6);
  rr(f1x - 6, f1y - 1, 12, 5, 2); inked('#e8361c', 2);
  const [k2x, k2y] = limb(5, -26, Math.PI / 2 - 0.5 - kick * 0.35, 9, '#8a5a3a', 6);
  const [f2x, f2y] = limb(k2x, k2y, Math.PI / 2 - 0.7 - kick * 0.35, 15, '#e8e2d0', 6);
  rr(f2x - 3, f2y - 3, 12, 5, 2); inked('#e8361c', 2);
  // navy shorts, white shirt with the number nine
  rr(-10, -35, 20, 12, 3); inked('#1f4f8a', 2.5);
  rr(-9, -53, 18, 20, 4); inked('#f3ead8', 2.5);
  ctx.fillStyle = '#1f4f8a'; ctx.fillRect(-2, -52, 4, 18);
  ctx.font = `9px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#1f4f8a'; ctx.fillText('9', -5, -43);
  // arms: one out for balance, one holding the chicken stick high
  limb(-6, -49, 2.5 + kick * 0.15, 11, '#8a5a3a', 5);
  const [hx, hy] = limb(6, -49, -0.8, 12, '#8a5a3a', 5);
  drawChickenStick(hx, hy, t);
  drawImmanuelHead(1, -60, t);
  // the ball, up and down, up and down
  const bx = 20, by = -7 - bounce * 18;
  ctx.strokeStyle = 'rgba(13,11,16,.18)'; ctx.lineWidth = 1.5;
  for (let k = 0; k < 2; k++) { ctx.beginPath(); ctx.moveTo(bx - 4 + k * 6, by - 13 - bounce * 4); ctx.lineTo(bx - 4 + k * 6, by - 17 - bounce * 4); ctx.stroke(); }
  ctx.beginPath(); ctx.arc(bx, by, 6, 0, 7); inked('#f3ead8', 2);
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(bx - 1, by - 1, 2.2, 0, 7); ctx.fill();
  ctx.restore();
}

/* ---------- Golden Stubs, motherboards, capacitors, herbs ---------- */
function drawQLook(look, x, y, t, sub) {
  ctx.save(); ctx.translate(x, y); ctx.lineJoin = 'round';
  if (look === 'stub') {
    ctx.rotate(Math.sin(t * 1.5) * 0.25);
    ctx.beginPath(); ctx.moveTo(-14, -8); ctx.lineTo(14, -8); ctx.lineTo(14, -3); ctx.arc(14, 0, 3, -Math.PI / 2, Math.PI / 2, true); ctx.lineTo(14, 8); ctx.lineTo(-14, 8); ctx.lineTo(-14, 3); ctx.arc(-14, 0, 3, Math.PI / 2, -Math.PI / 2, true); ctx.closePath(); inked(GOLD, 2.5);
    ctx.setLineDash([2, 2]); ctx.strokeStyle = 'rgba(13,11,16,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(6, -7); ctx.lineTo(6, 7); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = FLAME; ctx.font = `9px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('VIP', -4, 0.5);
  } else if (look === 'board') {
    ctx.rotate(Math.sin(t * 1.2) * 0.2);
    rr(-13, -9, 26, 18, 2); inked('#2f7a3a', 2.5);
    ctx.strokeStyle = GOLD; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(-10, -4); ctx.lineTo(-2, -4); ctx.lineTo(2, 2); ctx.lineTo(10, 2); ctx.moveTo(-10, 5); ctx.lineTo(4, 5); ctx.stroke();
    rr(-4, -7, 8, 6, 1); inked(INK, 1); ctx.fillStyle = '#50dc78'; ctx.fillRect(7, -7, 3, 3);
  } else if (look === 'cap') {
    ctx.rotate(Math.sin(t * 3) * 0.15);
    rr(-6, -11, 12, 22, 4); inked('#3a6ad8', 2.5); ctx.fillStyle = '#c9ccd4'; ctx.fillRect(-6, -11, 12, 4);
    ctx.fillStyle = INK; ctx.fillRect(-3, 11, 2, 4); ctx.fillRect(1, 11, 2, 4);
    ctx.strokeStyle = '#ffe85a'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(1, -4); ctx.lineTo(-2, 1); ctx.lineTo(2, 1); ctx.lineTo(-1, 7); ctx.stroke();
  } else if (look === 'herb') {
    const col = { hb_lava: ['#ff6a2a', '#ffd27a'], hb_storm: ['#f3ead8', '#ffe85a'], hb_frost: ['#9fe6ff', '#e8f8ff'] }[sub] || ['#7fb85a', GOLD];
    ctx.strokeStyle = '#3f6a2a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(0, 10); ctx.quadraticCurveTo(2, 0, 0, -6); ctx.stroke();
    for (let k = 0; k < 5; k++) {
      const a = -Math.PI / 2 + (k - 2) * 0.62 + Math.sin(t * 2 + k) * 0.06;
      ctx.save(); ctx.translate(0, -4); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(8, 0, 8, 3.5, 0, 0, 7); inked(k % 2 ? col[0] : col[1], 1.8); ctx.restore();
    }
  }
  ctx.restore();
}
const Q_GLOW = { stub: '242,193,78', board: '80,220,120', cap: '111,170,255', herb: '155,227,106' };
class QItem {
  constructor(look, x, y, id, o = {}) { Object.assign(this, { kind: 'qitem', look, x, y, id, t: rand(0, 6), gone: false, vy: 0, fall: !!o.fall }, o); }
  update(dt) {
    this.t += dt;
    if (this.fall) {
      this.vy = Math.min(this.vy + 1400 * dt, 800); this.y += this.vy * dt;
      if (pointSolid(this.x, this.y)) { this.y = Math.floor(this.y / TILE) * TILE; this.fall = false; this.vy = 0; }
      if (this.y > LH * TILE) this.gone = true;
    }
    if (Math.random() < 0.06) spawnParticle({ x: this.x + rand(-9, 9), y: this.y - rand(8, 26), vy: -20, life: 0.6, size: 2, color: `rgb(${Q_GLOW[this.look]})`, type: 'dot' });
    const c = Player.center();
    if (!Player.dead && !Story.active && Math.hypot(c.x - this.x, c.y - (this.y - 16)) < 34) {
      this.gone = true; SFX.coin(); SFX.crystal();
      burst(this.x, this.y - 16, 16, { colors: [`rgb(${Q_GLOW[this.look]})`, BONE, GOLD], maxSpeed: 320 });
      Quests.got(this);
    }
  }
  draw() {
    const y = this.y - 16 + Math.sin(this.t * 2.6) * 3;
    const g = ctx.createRadialGradient(this.x, y, 0, this.x, y, 32); g.addColorStop(0, `rgba(${Q_GLOW[this.look]},.5)`); g.addColorStop(1, `rgba(${Q_GLOW[this.look]},0)`);
    ctx.fillStyle = g; ctx.fillRect(this.x - 32, y - 32, 64, 64);
    drawQLook(this.look, this.x, y, this.t, this.id);
  }
}
// Frostleaf, frozen in a block of ice: three swings to chip it free
class QFrozenHerb {
  constructor(x, y, id) { Object.assign(this, { kind: 'qice', x, y, id, hp: 3, t: 0, shake: 0, gone: false }); }
  box() { return { x: this.x - 22, y: this.y - 46, w: 44, h: 46 }; }
  update(dt) {
    this.t += dt; this.shake = Math.max(0, this.shake - dt);
    const P = Player;
    if (P.attackT > 0 && P.attackType !== 'launch' && !P.hitSet.has(this) && overlap(P.hitbox(), this.box())) {
      P.hitSet.add(this); this.hp--; this.shake = 0.25; SFX.crystal(); addShake(4); addHitstop(0.05);
      burst(this.x, this.y - 24, 12, { colors: ['#e8f8ff', '#9fe6ff', BONE], maxSpeed: 320, grav: 900, type: 'debris' });
      pop(this.x, this.y - 54, this.hp > 0 ? 'CRACK!' : 'SHATTER!', { size: 26, color: '#9fe6ff', burstColor: '#2a4a66' });
      if (this.hp <= 0) { this.gone = true; SFX.bigCrack(); NPCs.push(new QItem('herb', this.x, this.y, this.id)); }
    }
  }
  draw() {
    const j = this.shake > 0 ? rand(-2, 2) : 0;
    ctx.save(); ctx.translate(this.x + j, this.y); ctx.lineJoin = 'round';
    drawQLook('herb', 0, -20, this.t, this.id);
    ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(-22, -34); ctx.lineTo(-10, -46); ctx.lineTo(14, -44); ctx.lineTo(22, -30); ctx.lineTo(20, 0); ctx.closePath();
    ctx.fillStyle = 'rgba(190,235,255,.55)'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#e8f8ff'; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-14, -36); ctx.lineTo(-8, -40); ctx.stroke();
    if (this.hp < 3) { ctx.strokeStyle = 'rgba(13,11,16,.5)'; ctx.beginPath(); ctx.moveTo(-6, -46); ctx.lineTo(0, -30); ctx.lineTo(-4, -18); if (this.hp < 2) { ctx.moveTo(0, -30); ctx.lineTo(12, -22); ctx.lineTo(10, -8); } ctx.stroke(); }
    ctx.restore();
  }
}
