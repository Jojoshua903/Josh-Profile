'use strict';
/* =========================================================
   THE CAST: drawings + small NPC classes shared by every
   story page — Lars (and his cats), Daniel, Adam, Renas,
   scooter call bells, titanium ore, the Spare Bat, cracks.
   ========================================================= */

/* ---------- Lars: stout, grumpy dwarf blacksmith ---------- */
function drawLars(x, y, facing, t, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(facing, 1); ctx.lineJoin = 'round';
  const bob = Math.sin(t * 2) * 0.8;
  limb(-6, -11, Math.PI / 2, 10, '#4a3324', 7); limb(6, -11, Math.PI / 2, 10, '#4a3324', 7);
  ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(-4, -1, 7, 3.5, 0, 0, 7); ctx.ellipse(9, -1, 7, 3.5, 0, 0, 7); ctx.fill();
  ctx.translate(0, bob);
  // mug of beer (back hand)
  limb(-12, -26, Math.PI / 2 + 0.5, 9, '#a8452a', 6);
  rr(-24, -24, 11, 13, 2); inked('#e6b24a', 2.5); ctx.fillStyle = BONE; ctx.fillRect(-24, -26, 11, 4); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(-24, -26, 11, 4);
  ctx.beginPath(); ctx.arc(-25, -18, 4, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
  // barrel body, apron
  rr(-15, -32, 30, 23, 9); inked('#a8452a', 3);
  rr(-10, -24, 20, 15, 2); inked('#6b4a30', 2.5);
  ctx.fillStyle = GOLD; ctx.fillRect(-15, -14, 30, 3);
  // head, beard, nose, brow
  ctx.beginPath(); ctx.arc(2, -38, 10, 0, 7); inked('#f0cfa8', 3);
  ctx.beginPath(); ctx.moveTo(-8, -38); ctx.quadraticCurveTo(-12, -14, 3, -12); ctx.quadraticCurveTo(18, -14, 13, -36); ctx.quadraticCurveTo(4, -30, -8, -38); inked('#c8561c', 2.5);
  ctx.strokeStyle = '#8a3a14'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, -28); ctx.lineTo(1, -18); ctx.moveTo(6, -28); ctx.lineTo(7, -17); ctx.stroke();
  ctx.beginPath(); ctx.arc(11, -36, 3.6, 0, 7); inked('#e8a88a', 2);
  ctx.strokeStyle = INK; ctx.lineWidth = 2.8; ctx.beginPath(); ctx.moveTo(2, -44); ctx.lineTo(9, -41); ctx.stroke();
  ctx.fillStyle = INK; ctx.fillRect(5, -41, 2.5, 2.5);
  // mining helmet + lamp
  ctx.beginPath(); ctx.moveTo(-9, -42); ctx.quadraticCurveTo(-8, -54, 3, -54); ctx.quadraticCurveTo(14, -54, 14, -42); ctx.closePath(); inked('#f2c14e', 3);
  ctx.fillStyle = '#c9a33a'; ctx.fillRect(-11, -44, 27, 3);
  ctx.beginPath(); ctx.arc(10, -49, 3.6, 0, 7); inked('#fff6c0', 2);
  if (o.lamp !== false) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(10, -49, 90, -30); g.addColorStop(0, 'rgba(255,240,180,.28)'); g.addColorStop(1, 'rgba(255,240,180,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(10, -51); ctx.lineTo(92, -70); ctx.lineTo(92, -14); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  // hammer (front hand)
  const ha = o.hammer !== undefined ? o.hammer : -0.5 + Math.sin(t * 1.3) * 0.06;
  const [hx, hy] = limb(10, -26, ha, 9, '#a8452a', 6);
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(ha - Math.PI / 2);
  ctx.fillStyle = '#6b4a30'; ctx.fillRect(-2, -2, 4, 20); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(-2, -2, 4, 20);
  rr(-8, 16, 16, 9, 2); inked('#6b6f7a', 2.5);
  ctx.restore();
  // the cats ride on his shoulders out in the quarry
  if (o.cats) {
    drawCat(-12, -52 + bob, 1, t, { color: '#e08a3a', sit: true, scale: 0.8 });
    drawCat(16, -48 + bob, -1, t + 2, { color: '#2b2228', sit: true, scale: 0.8, sleep: true });
  }
  ctx.restore();
}

/* ---------- Cats: Pebble (ginger) and Grit (black) ---------- */
function drawCat(x, y, facing, t, o = {}) {
  const s = o.scale || 1;
  ctx.save(); ctx.translate(x, y); ctx.scale(facing * s, s); ctx.lineJoin = 'round';
  const col = o.color || '#e08a3a', breathe = Math.sin(t * (o.sleep ? 2 : 3)) * 0.8;
  // tail
  ctx.strokeStyle = INK; ctx.lineWidth = 5.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-8, -3); ctx.quadraticCurveTo(-18, -4 + Math.sin(t * 2.4) * 3, -16, -14 + Math.sin(t * 2.4) * 4); ctx.stroke();
  ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.stroke();
  // body
  ctx.beginPath(); ctx.ellipse(0, -6 - breathe * 0.3, o.sit ? 8 : 11, 6 + breathe * 0.3, 0, 0, 7); inked(col, 2.5);
  // head
  const hx = o.sit ? 4 : 9, hy = o.sit ? -15 : -10;
  ctx.beginPath(); ctx.moveTo(hx - 6, hy - 2); ctx.lineTo(hx - 5, hy - 10); ctx.lineTo(hx - 1, hy - 5); ctx.lineTo(hx + 2, hy - 5); ctx.lineTo(hx + 5, hy - 10); ctx.lineTo(hx + 6, hy - 2); ctx.closePath(); inked(col, 2.2);
  ctx.beginPath(); ctx.arc(hx, hy, 6, 0, 7); inked(col, 2.2);
  ctx.strokeStyle = INK; ctx.lineWidth = 1.6;
  if (o.sleep || (o.blink !== false && Math.sin(t * 1.3) > 0.97)) { ctx.beginPath(); ctx.moveTo(hx - 3, hy); ctx.lineTo(hx - 1, hy + 1); ctx.moveTo(hx + 2, hy + 1); ctx.lineTo(hx + 4, hy); ctx.stroke(); }
  else { ctx.fillStyle = '#9be36a'; ctx.beginPath(); ctx.arc(hx - 2, hy, 1.6, 0, 7); ctx.arc(hx + 3, hy, 1.6, 0, 7); ctx.fill(); }
  ctx.fillStyle = '#ff9fb0'; ctx.beginPath(); ctx.arc(hx + 0.5, hy + 2.5, 1.1, 0, 7); ctx.fill();
  if (o.color === '#2b2228') { ctx.fillStyle = BONE; ctx.fillRect(-6, -2, 3, 2); ctx.fillRect(3, -2, 3, 2); }
  if (o.sleep && Math.sin(t * 1.5) > 0) { ctx.scale(facing, 1); ctx.font = `10px ${DISPLAY_FONT}`; ctx.fillStyle = 'rgba(243,234,216,.7)'; ctx.fillText('z', facing * (hx + 6), hy - 10 - (t * 6) % 6); }
  ctx.restore();
}

/* ---------- Daniel: the gleeful pyromaniac ---------- */
function drawDaniel(x, y, facing, t, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(facing, 1); ctx.lineJoin = 'round';
  const hop = o.dizzy ? 0 : Math.abs(Math.sin(t * 5)) * -1.5;
  ctx.translate(0, hop);
  if (o.kneel) ctx.translate(0, 8);
  limb(-3, -15, Math.PI / 2 + (o.kneel ? 0.9 : 0.1), 15, '#7a1c2a', 5); limb(4, -15, Math.PI / 2 - (o.kneel ? 0.4 : 0.1), 15, '#7a1c2a', 5);
  rr(-10, -36, 20, 23, 6); inked('#b8283c', 3);                         // red jumpsuit
  ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(-9, -34); ctx.lineTo(9, -16); ctx.stroke();   // bandolier
  for (let k = 0; k < 3; k++) { ctx.fillStyle = [FLAME, GOLD, '#6fd3ff'][k]; ctx.fillRect(-6 + k * 5, -31 + k * 5, 3, 6); }
  // soot smudges & grin
  ctx.beginPath(); ctx.arc(2, -45, 10, 0, 7); inked('#f0cfa8', 3);
  ctx.fillStyle = 'rgba(30,22,26,.35)'; ctx.beginPath(); ctx.arc(-3, -41, 3.5, 0, 7); ctx.arc(7, -48, 2.5, 0, 7); ctx.fill();
  if (o.soot) { ctx.fillStyle = 'rgba(30,22,26,.55)'; ctx.beginPath(); ctx.arc(2, -45, 10, 0, 7); ctx.fill(); }
  ctx.beginPath(); ctx.moveTo(1, -40); ctx.quadraticCurveTo(7, -34, 11, -41); ctx.closePath(); inked('#ffffff', 2);
  if (o.dizzy) { ctx.strokeStyle = INK; ctx.lineWidth = 1.6; for (const ex of [3, 8]) { ctx.beginPath(); ctx.arc(ex, -46, 2.2, t * 9, t * 9 + 5); ctx.stroke(); } }
  else { ctx.fillStyle = INK; ctx.fillRect(3, -47, 2.5, 3); ctx.fillRect(8, -47, 2.5, 3); }
  // spiky hair + goggles
  ctx.beginPath(); ctx.moveTo(-9, -48); for (let k = 0; k < 6; k++) { ctx.lineTo(-8 + k * 4 + 2, -62 - (k % 2) * 4 + Math.sin(t * 6 + k) * 0.8); ctx.lineTo(-8 + k * 4 + 4, -53); } ctx.lineTo(13, -46); ctx.closePath(); inked('#2b2228', 2.5);
  rr(-9, -53, 22, 6, 3); inked('#3a3340', 2);
  ctx.beginPath(); ctx.arc(-1, -50, 3, 0, 7); ctx.arc(8, -50, 3, 0, 7); inked('#ffd27a', 1.6);
  // a lit firework in hand
  const [hx, hy] = limb(5, -30, o.arm !== undefined ? o.arm : -0.6 + Math.sin(t * 3) * 0.1, 11, '#b8283c', 4);
  if (o.rocket !== false) {
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(-1.2);
    rr(-3, -16, 6, 16, 1); inked(FLAME, 2); ctx.beginPath(); ctx.moveTo(-3, -16); ctx.lineTo(0, -22); ctx.lineTo(3, -16); inked(GOLD, 1.6);
    ctx.restore();
    if (Math.random() < 0.4) spawnParticle({ x: x + facing * (hx + 6), y: y + hy + 4, vx: rand(-40, 40), vy: rand(-60, 0), life: 0.25, size: rand(1.5, 3), color: GOLD, type: 'dot' });
  }
  ctx.restore();
  if (o.dizzy) for (let k = 0; k < 3; k++) {
    const a = t * 4 + k * 2.1; ctx.fillStyle = GOLD; ctx.font = `12px ${DISPLAY_FONT}`; ctx.textAlign = 'center';
    ctx.fillText('★', x + Math.cos(a) * 16, y - 70 + Math.sin(a) * 5);
  }
}

/* ---------- Adam: Nathan's hyper-competitive best friend ---------- */
function drawAdam(x, y, facing, t, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(facing * (o.sx || 1), o.sy || 1); ctx.lineJoin = 'round';
  const pose = o.pose || 'idle', run = o.run ? Math.sin(t * 16) : 0;
  if (o.flash) ctx.globalAlpha = 0.6;
  let back = Math.PI / 2 + run * 0.7, front = Math.PI / 2 - run * 0.7;
  if (pose === 'air' || pose === 'serve' || pose === 'smash') { back = 2.1; front = 1.0; }
  if (pose === 'kneel') { ctx.translate(0, 9); back = 0.3; front = Math.PI / 2 + 0.2; }
  if (pose === 'dash') { back = 2.5; front = 0.6; }
  limb(-3, -15, back, 15, '#f3ead8', 5); limb(3, -15, front, 15, '#ffffff', 5);
  ctx.fillStyle = '#3f7a2a'; ctx.beginPath(); ctx.ellipse(-3 + Math.cos(back) * 15, -15 + Math.sin(back) * 15, 5, 3, 0, 0, 7); ctx.ellipse(3 + Math.cos(front) * 15, -15 + Math.sin(front) * 15, 5, 3, 0, 0, 7); ctx.fill();
  rr(-10, -36, 20, 23, 6); inked('#ffffff', 3);                          // tennis whites
  ctx.fillStyle = '#3f7a2a'; ctx.fillRect(-10, -19, 20, 3); ctx.fillRect(-2, -36, 4, 8);
  // back arm
  limb(-4, -31, Math.PI / 2 + 0.3, 11, '#ffffff', 4);
  // head, blond swoop, sweatband
  ctx.beginPath(); ctx.arc(2, -45, 10, 0, 7); inked(BONE, 3);
  ctx.beginPath(); ctx.moveTo(-9, -46); ctx.quadraticCurveTo(-6, -60, 6, -58); ctx.quadraticCurveTo(16, -57, 13, -47); ctx.quadraticCurveTo(6, -54, -9, -46); inked('#e8c35a', 2.5);
  ctx.fillStyle = '#3f7a2a'; ctx.fillRect(-9, -51, 22, 4); ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.strokeRect(-9, -51, 22, 4);
  ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(4, -46); ctx.lineTo(9, -44); ctx.stroke();                       // determined brow
  if (pose === 'kneel') { ctx.beginPath(); ctx.moveTo(4, -38); ctx.lineTo(10, -39); ctx.stroke(); }
  else { ctx.beginPath(); ctx.moveTo(4, -39); ctx.quadraticCurveTo(8, -36, 11, -40); ctx.stroke(); }   // smirk
  // racket arm
  const ra = o.racket !== undefined ? o.racket : pose === 'serve' ? -2.2 : pose === 'smash' ? -2.8 : pose === 'dash' ? 0.2 : -0.9 + Math.sin(t * 2) * 0.08;
  const [hx, hy] = limb(3, -30, ra, 10, '#ffffff', 4);
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(ra);
  ctx.fillStyle = INK; ctx.fillRect(0, -2, 14, 4);
  ctx.beginPath(); ctx.ellipse(24, 0, 11, 8, 0, 0, 7); ctx.fillStyle = 'rgba(243,234,216,.25)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#3f7a2a'; ctx.stroke(); ctx.lineWidth = 1.2; ctx.strokeStyle = INK; ctx.stroke();
  ctx.strokeStyle = 'rgba(13,11,16,.5)'; ctx.lineWidth = 1; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(24 + k * 4, -7); ctx.lineTo(24 + k * 4, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(14, k * 3); ctx.lineTo(34, k * 3); ctx.stroke(); }
  ctx.restore();
  ctx.restore();
}

/* ---------- Renas: Josh's cheeky little brother on a stolen-parts scooter ---------- */
function drawRenas(x, y, facing, t, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(facing, 1); ctx.lineJoin = 'round';
  const moving = o.moving !== false, rattle = moving ? Math.sin(t * 40) * 1 : 0;
  ctx.translate(0, rattle);
  // scooter: deck, wheels, stem + drone motor
  for (const wx of [-16, 18]) { ctx.beginPath(); ctx.arc(wx, -6, 6, 0, 7); inked('#2b2733', 2.5); ctx.strokeStyle = '#6b6f7a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(wx, -6); ctx.lineTo(wx + Math.cos(t * 30) * 4, -6 + Math.sin(t * 30) * 4); ctx.stroke(); }
  rr(-20, -14, 40, 5, 2); inked('#3b4f66', 2.5);
  ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(17, -12); ctx.lineTo(13, -40); ctx.stroke(); ctx.strokeStyle = '#9aa3ad'; ctx.lineWidth = 2; ctx.stroke();
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(7, -41); ctx.lineTo(19, -39); ctx.stroke();
  rr(-24, -24, 12, 10, 3); inked('#2d3b4a', 2.5);                                  // stolen drone motor
  ctx.fillStyle = Math.sin(t * 20) > 0 ? '#6fd3ff' : '#ff4a3a'; ctx.beginPath(); ctx.arc(-18, -19, 2, 0, 7); ctx.fill();
  if (moving) for (let k = 0; k < 2; k++) spawnParticle({ x: x - facing * 26, y: y - 18 + rattle, vx: -facing * rand(60, 220), vy: rand(-80, 30), life: rand(0.15, 0.35), size: rand(1.5, 3), color: Math.random() < 0.5 ? GOLD : '#6fd3ff', type: 'spark' });
  // the kid
  limb(-2, -24, 1.7, 10, '#3b4f66', 4); limb(4, -24, 1.3, 10, '#3b4f66', 4);
  rr(-7, -38, 15, 16, 5); inked('#ff8a2a', 2.5);
  limb(5, -34, -0.2, 10, '#ff8a2a', 3.5);
  ctx.beginPath(); ctx.arc(3, -46, 8, 0, 7); inked(BONE, 2.5);
  ctx.beginPath(); ctx.moveTo(-6, -47); ctx.quadraticCurveTo(-5, -58, 3, -58); ctx.quadraticCurveTo(12, -58, 11, -47); ctx.closePath(); inked('#ff8a2a', 2.5);
  rr(-5, -52, 16, 4, 2); inked('#6fd3ff', 1.5);                                     // goggles
  ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(5, -42); ctx.quadraticCurveTo(8, -40, 10, -43); ctx.stroke();
  ctx.fillStyle = '#e8361c'; ctx.beginPath(); ctx.ellipse(8, -40.5, 1.6, 2.2, 0, 0, 7); ctx.fill();   // tongue out
  // scarf trailing behind
  ctx.strokeStyle = '#6fd3ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-2, -39); ctx.quadraticCurveTo(-14, -42 + Math.sin(t * 18) * 3, -22, -38 + Math.sin(t * 14) * 4); ctx.stroke();
  ctx.restore();
}

/* ---------- Props ---------- */
function drawAnvil(x, y) {
  ctx.save(); ctx.translate(x, y); ctx.lineJoin = 'round';
  ctx.fillStyle = '#5a3a24'; rr(-14, -12, 28, 12, 2); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-22, -26); ctx.lineTo(20, -26); ctx.quadraticCurveTo(30, -26, 32, -20); ctx.lineTo(14, -20); ctx.lineTo(8, -12); ctx.lineTo(-8, -12); ctx.lineTo(-14, -20); ctx.lineTo(-22, -20); ctx.closePath(); inked('#4a4f5a', 3);
  ctx.fillStyle = 'rgba(243,234,216,.25)'; ctx.fillRect(-18, -25, 30, 2);
  const g = ctx.createRadialGradient(0, -28, 0, 0, -28, 36); g.addColorStop(0, `rgba(255,138,42,${0.3 + Math.sin(Game.time * 5) * 0.08})`); g.addColorStop(1, 'rgba(255,138,42,0)');
  ctx.fillStyle = g; ctx.fillRect(-40, -64, 80, 64);
  rr(-6, -30, 12, 4, 2); inked('#ff8a2a', 1.5);                                     // glowing billet
  ctx.restore();
}
function drawFireworkStand(x, y) {
  ctx.save(); ctx.translate(x, y); ctx.lineJoin = 'round';
  ctx.fillStyle = INK; ctx.fillRect(-34, -30, 5, 30); ctx.fillRect(29, -30, 5, 30);
  rr(-40, -34, 80, 9, 2); inked('#8a5a3a', 3);
  // striped awning
  for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.moveTo(-42 + k * 14, -76); ctx.lineTo(-28 + k * 14, -76); ctx.lineTo(-30 + k * 14, -64); ctx.lineTo(-40 + k * 14, -64); ctx.closePath(); inked(k % 2 ? BONE : '#b8283c', 2); }
  ctx.fillStyle = INK; ctx.fillRect(-36, -64, 4, 30); ctx.fillRect(32, -64, 4, 30);
  // rockets & bombs on the counter
  [[-28, FLAME], [-20, '#6fd3ff'], [-12, GOLD]].forEach(([rx, c]) => { rr(rx - 3, -50, 6, 16, 1); inked(c, 2); ctx.beginPath(); ctx.moveTo(rx - 3, -50); ctx.lineTo(rx, -56); ctx.lineTo(rx + 3, -50); inked(BONE, 1.5); });
  for (const [bx, c] of [[6, '#2b2228'], [18, '#2b2228'], [28, '#3fd46a']]) { ctx.beginPath(); ctx.arc(bx, -40, 6, 0, 7); inked(c, 2); ctx.strokeStyle = GOLD; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(bx + 2, -46); ctx.lineTo(bx + 5, -50); ctx.stroke(); }
  ctx.font = `13px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = GOLD; ctx.fillText('KA‑BOOM GOODS', 0, -80);
  ctx.restore();
}
// faint crack lines over a breakable chunk of wall / floor
function drawCracks(b) {
  if (b.broken) return;
  ctx.save(); ctx.strokeStyle = 'rgba(13,11,16,.85)'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
  const n = Math.max(2, Math.round((b.w + b.h) / 40));
  for (let k = 0; k < n; k++) {
    const sx = b.x + ((k * 37) % b.w), sy = b.y + ((k * 53) % b.h);
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 9, sy + 6); ctx.lineTo(sx + 5, sy + 15); ctx.lineTo(sx + 14, sy + 22); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx + 9, sy + 6); ctx.lineTo(sx + 18, sy + 3); ctx.stroke();
  }
  ctx.strokeStyle = `rgba(255,138,42,${0.25 + Math.sin(Game.time * 3) * 0.12})`; ctx.lineWidth = 1.2;
  ctx.strokeRect(b.x + 2, b.y + 2, b.w - 4, b.h - 4);
  ctx.restore();
}

/* ---------- NPCs ---------- */
// A standing character you can talk to / shop with: lars · daniel · cat
class CampNPC {
  constructor(kind, x, y, o = {}) { Object.assign(this, { kind, x, y, facing: -1, t: rand(0, 6), near: false, gone: false, reach: 56, prompt: null, petT: 0 }, o); }
  head() { return { x: this.x, y: this.y - (this.kind === 'lars' ? 50 : this.kind === 'cat' ? 18 : this.kind === 'milo' ? 74 : this.kind === 'deniz' ? 66 : 58) }; }
  update(dt) {
    this.t += dt; this.petT = Math.max(0, this.petT - dt);
    const c = Player.center();
    this.near = Math.abs(c.x - this.x) < this.reach && Math.abs(Player.y + Player.h - this.y) < 26;
    if (this.kind !== 'cat' && !this.fixed && Math.abs(c.x - this.x) < 200) this.facing = sgn(c.x - this.x) || this.facing;
    if (this.kind === 'lars' && this.forge && Math.sin(this.t * 2.6) > 0.995) { SFX.anvil(); burst(this.x + this.facing * 26, this.y - 30, 6, { color: GOLD, maxSpeed: 260, maxLife: 0.25 }); }
  }
  interact() {
    if (this.onTalk) { if (!Story.active) this.onTalk(this); return; }
    if (this.kind !== 'cat' || this.petT > 0) return;
    this.petT = 1.6; SFX.purr();
    for (let k = 0; k < 4; k++) spawnParticle({ x: this.x + rand(-8, 8), y: this.y - 20, vx: rand(-30, 30), vy: rand(-90, -50), life: 0.9, size: 3, color: '#ff9fb0', type: 'dot' });
    pop(this.x, this.y - 30, 'purrrr…', { size: 20, burst: false, color: '#ff9fb0', vy: -40 });
    if (Player.shield > 0) toast(`${this.name.toUpperCase()} PURRS. YOU'RE ALREADY PURR‑TECTED`);
    else { Player.shield = 1; toast(`${this.name.toUpperCase()} PURRS · +1 SHIELD (BLOCKS THE NEXT HIT)`); }
  }
  draw() {
    const t = this.t;
    if (this.kind === 'lars') { if (this.forge) drawAnvil(this.x + this.facing * 30, this.y); drawLars(this.x, this.y, this.facing, t, { cats: this.cats, hammer: this.forge ? -0.5 - Math.max(0, Math.sin(t * 2.6)) * 1.4 : undefined, lamp: this.lamp }); }
    else if (this.kind === 'daniel') { if (this.stand) drawFireworkStand(this.x - this.facing * 40, this.y); drawDaniel(this.x, this.y, this.facing, t, { soot: this.soot }); }
    else if (this.kind === 'fionn') { drawRockPile(this.x - this.facing * 34, this.y, t); drawFionn(this.x, this.y, this.facing, t, {}); }
    else if (this.kind === 'milo') drawMilo(this.x, this.y - 12 - Math.sin(t * 2) * 4, this.facing, t, { float: true });
    else if (this.kind === 'deniz') { drawTeaLounge(this.x, this.y, t); drawDeniz(this.x, this.y, this.facing, t, { hippie: true, sit: true }); }
    else if (this.kind === 'cat') {
      drawCat(this.x, this.y, this.facing, t, { color: this.color, sleep: this.petT <= 0 && this.sleepy, sit: this.petT > 0 || !this.sleepy });
      if (this.petT > 0) { ctx.fillStyle = '#ff9fb0'; ctx.font = `14px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillText('♥', this.x, this.y - 34 - (1.6 - this.petT) * 16); }
    }
    if (this.near && this.prompt) {
      ctx.font = `14px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = GOLD;
      ctx.fillText('▲ ' + Bindings.label('up', Game.lastInput) + ' · ' + this.prompt, this.x, this.y - (this.kind === 'cat' ? 38 : this.kind === 'milo' ? 104 : 84) + Math.sin(Game.time * 4) * 2);
    }
  }
}

// Scooter Call Bell: ring it to summon Renas (after the chase)
class CallBell {
  constructor(x, y, zone) { Object.assign(this, { kind: 'bell', x, y, zone, near: false, ring: 0, t: 0, gone: false }); }
  update(dt) {
    this.t += dt; this.ring = Math.max(0, this.ring - dt);
    const c = Player.center();
    this.near = Math.abs(c.x - this.x) < 46 && Math.abs(Player.y + Player.h - this.y) < 26;
    if (this.near && !Save.data.bells[this.zone]) { Save.data.bells[this.zone] = 1; saveGame(); toast(Save.data.chase ? 'CALL BELL FOUND · RENAS CAN PICK YOU UP HERE' : 'A SCOOTER CALL BELL'); }
  }
  draw() {
    const x = this.x, y = this.y, sw = Math.sin(this.t * 18) * this.ring * 0.4;
    ctx.save(); ctx.lineJoin = 'round';
    ctx.fillStyle = INK; ctx.fillRect(x - 3, y - 74, 6, 74); ctx.fillRect(x - 3, y - 74, 26, 5);
    ctx.fillStyle = '#6b4a30'; ctx.fillRect(x - 1.5, y - 72, 3, 70);
    ctx.translate(x + 18, y - 69); ctx.rotate(sw);
    ctx.beginPath(); ctx.moveTo(-9, 18); ctx.quadraticCurveTo(-9, 2, 0, 2); ctx.quadraticCurveTo(9, 2, 9, 18); ctx.closePath(); inked(Save.data.chase ? GOLD : '#9a8a5a', 2.5);
    ctx.beginPath(); ctx.arc(0, 20, 3, 0, 7); inked(BONE, 1.5);
    ctx.restore();
    // little scooter sign
    rr(x - 22, y - 46, 30, 18, 2); inked(Save.data.chase ? '#ff8a2a' : '#7a6a5a', 2.5);
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x - 15, y - 33, 2.5, 0, 7); ctx.arc(x + 1, y - 33, 2.5, 0, 7); ctx.moveTo(x - 15, y - 36); ctx.lineTo(x + 1, y - 36); ctx.lineTo(x - 1, y - 43); ctx.stroke();
    if (this.ring > 0) { ctx.strokeStyle = `rgba(242,193,78,${this.ring / 1.4})`; ctx.lineWidth = 2; for (let k = 1; k <= 2; k++) { ctx.beginPath(); ctx.arc(x + 18, y - 58, 12 + k * 8 + (1.4 - this.ring) * 20, -1.2, 1.2); ctx.stroke(); } }
    if (this.near) {
      ctx.font = `14px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = GOLD;
      ctx.fillText('▲ ' + Bindings.label('up', Game.lastInput) + (Save.data.chase ? ' · CALL RENAS' : ' · RING'), x + 6, y - 92 + Math.sin(Game.time * 4) * 2);
    }
  }
}

// Raw Titanium Ore: hidden in nasty platforming spots, spent at Lars's anvil
class OreChunk {
  constructor(x, y, id) { Object.assign(this, { kind: 'ore', x, y, id, t: rand(0, 6), gone: false }); }
  update(dt) {
    this.t += dt;
    if (Math.random() < 0.08) spawnParticle({ x: this.x + rand(-12, 12), y: this.y - rand(6, 26), vx: 0, vy: -20, life: 0.6, size: 2, color: '#bff3ff', type: 'dot' });
    const c = Player.center();
    if (!Player.dead && Math.hypot(c.x - this.x, c.y - (this.y - 14)) < 34) {
      this.gone = true; const D = Save.data; const first = !Object.keys(D.ores).length;
      D.ores[this.id] = 1; D.ore++; saveGame(); SFX.crystal(); SFX.coin();
      burst(this.x, this.y - 14, 18, { colors: ['#bff3ff', '#9fd8e8', BONE], maxSpeed: 360 });
      pop(this.x, this.y - 40, 'TITANIUM!', { size: 30, color: '#bff3ff', burstColor: '#2a4a66' });
      if (first) showCard('ITEM ACQUIRED', 'RAW TITANIUM ORE', D.lars ? 'Lars can hammer this into your bat. Bring ore and Scrap Bolts to his anvil at Base Camp for permanent damage upgrades.' : 'A chunk of glowing, stupidly heavy metal. Somebody who knows their way around an anvil would want this.', [`${Object.keys(D.ores).length} found`]);
      else toast(`RAW TITANIUM ORE · ${D.ore} IN YOUR POCKET`);
    }
  }
  draw() {
    const x = this.x, y = this.y - 14 + Math.sin(this.t * 2.5) * 3;
    const g = ctx.createRadialGradient(x, y, 0, x, y, 40); g.addColorStop(0, 'rgba(160,230,255,.45)'); g.addColorStop(1, 'rgba(160,230,255,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 40, y - 40, 80, 80);
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(this.t) * 0.15); ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-11, 5); ctx.lineTo(-7, -7); ctx.lineTo(2, -12); ctx.lineTo(11, -3); ctx.lineTo(8, 8); ctx.lineTo(-2, 11); ctx.closePath(); inked('#9fd8e8', 2.5);
    ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-7, -7); ctx.lineTo(0, 0); ctx.lineTo(11, -3); ctx.moveTo(0, 0); ctx.lineTo(-2, 11); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(-4, -6, 3, 3);
    ctx.restore();
  }
}

// Nathan's plain wooden Spare Bat (key item for the True Ending)
class SpareBat {
  constructor(x, y) { Object.assign(this, { kind: 'sparebat', x, y, t: 0, gone: false }); }
  update(dt) {
    this.t += dt;
    const c = Player.center();
    if (!Player.dead && Math.hypot(c.x - this.x, c.y - (this.y - 24)) < 40) {
      this.gone = true; Save.data.spareBat = true; saveGame(); themeCheck();
      burst(this.x, this.y - 24, 24, { colors: [GOLD, BONE, '#c9a36b'], maxSpeed: 420 });
      showCard('KEY ITEM', 'THE SPARE BAT', 'Your plain wooden bat from Little League, signed by the whole team. Doesn\'t look like much… but it feels important. Keep it safe.', ['key item · Act I secret']);
    }
  }
  draw() {
    const x = this.x, y = this.y - 26 + Math.sin(this.t * 2) * 3;
    const g = ctx.createRadialGradient(x, y, 0, x, y, 70); g.addColorStop(0, 'rgba(242,193,78,.4)'); g.addColorStop(1, 'rgba(242,193,78,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 70, y - 70, 140, 140);
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.6 + Math.sin(this.t * 1.4) * 0.05);
    ctx.beginPath(); ctx.moveTo(-26, -2); ctx.lineTo(18, -6); ctx.quadraticCurveTo(26, 0, 18, 6); ctx.lineTo(-26, 2); ctx.closePath(); inked('#d9b77a', 2.5);
    ctx.fillStyle = INK; ctx.fillRect(-30, -3.5, 5, 7);
    ctx.strokeStyle = 'rgba(13,11,16,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-6, -3); ctx.quadraticCurveTo(0, 0, 8, -3); ctx.moveTo(-2, 3); ctx.lineTo(10, 2); ctx.stroke();
    ctx.restore();
    if (Math.random() < 0.1) spawnParticle({ x: x + rand(-24, 24), y: y + rand(-14, 14), vx: 0, vy: -24, life: 0.6, size: 2, color: GOLD, type: 'dot' });
  }
}

// Reshman, the shy map-maker: hides in a dark corner of every zone and sells maps & mapping tools
class ReshmanVendor {
  constructor(x, y, zone) { Object.assign(this, { kind: 'reshman', vendor: 'reshman', x, y, zone, t: rand(0, 6), startled: 0, near: false, gone: false, met: !!Save.data.reshmanMet[zone] }); }
  head() { return { x: this.x, y: this.y - 34 }; }
  update(dt) {
    this.t += dt; this.startled = Math.max(0, this.startled - dt);
    const c = Player.center();
    this.near = Math.abs(c.x - this.x) < 52 && Math.abs(Player.y + Player.h - this.y) < 26;
    if (!this.met && !Story.active && !Player.dead && Math.hypot(c.x - this.x, c.y - this.y) < 150) { this.met = true; Story.reshmanMeet(this); }
  }
  draw() {
    const j = this.startled > 0 ? rand(-3, 3) : Math.sin(this.t * 22) * 0.8, s = 1 + this.startled * 0.6;
    ctx.save(); ctx.translate(this.x + j, this.y); ctx.scale(s, 2 - s);
    ctx.fillStyle = '#000000';
    ctx.beginPath(); ctx.moveTo(-14, 0); ctx.quadraticCurveTo(-16, -26, 0, -28); ctx.quadraticCurveTo(16, -26, 14, 0);
    for (let k = 0; k < 4; k++) ctx.quadraticCurveTo(10 - k * 8, 4, 6 - k * 8, 0);
    ctx.fill();
    // a rolled-up map under one tentacle-ish bit
    ctx.save(); ctx.translate(13, -8); ctx.rotate(-0.5); rr(-3, -10, 7, 20, 3); inked('#e9dcc0', 2); ctx.fillStyle = FLAME; ctx.fillRect(-3, -2, 7, 3); ctx.restore();
    ctx.restore();
    this.drawEyes();
    if (this.near && this.met) {
      ctx.font = `14px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = GOLD;
      ctx.fillText('▲ ' + Bindings.label('up', Game.lastInput) + ' · MAPS', this.x, this.y - 54 + Math.sin(Game.time * 4) * 2);
    }
  }
  drawEyes() {
    const blink = Math.sin(this.t * 1.7) > 0.96, j = this.startled > 0 ? rand(-3, 3) : 0;
    ctx.save(); ctx.shadowColor = '#f3ead8'; ctx.shadowBlur = 12; ctx.fillStyle = '#f3ead8';
    for (const ox of [-5, 5]) { ctx.beginPath(); ctx.ellipse(this.x + ox + j, this.y - 16, 2.6, blink ? 0.4 : 4 + this.startled * 3, 0, 0, 7); ctx.fill(); }
    ctx.restore();
  }
}

/* =========================================================
   ACT II CAST · Fionn, Milo, Deniz + Lucky Pebbles
   ========================================================= */
/* ---------- Fionn, Keeper of Pebbles: geologist with a clipboard and opinions ---------- */
function drawFionn(x, y, facing, t, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(facing, 1); ctx.lineJoin = 'round';
  const bob = o.stun ? 0 : Math.sin(t * 2.2) * 0.8, stomp = o.stomp || 0;
  if (o.kneel) ctx.translate(0, 8);
  const [bx, by] = limb(-4, -16, Math.PI / 2 + (o.kneel ? 0.9 : 0.05), 16, '#5a4a3a', 5);
  const [fx, fy] = limb(4, -16, Math.PI / 2 - (o.kneel ? 0.3 : 0.05) - stomp * 0.9, 16, '#5a4a3a', 5);
  ctx.fillStyle = '#6b4226'; ctx.beginPath(); ctx.ellipse(bx + 2, by, 6, 3.5, 0, 0, 7); ctx.ellipse(fx + 2, fy, 6, 3.5, 0, 0, 7); ctx.fill();
  ctx.translate(0, bob);
  rr(-11, -38, 22, 24, 6); inked('#5a7a4a', 3);                                      // green field shirt
  rr(-10, -37, 8, 22, 3); inked('#b59a6a', 2); rr(2, -37, 8, 22, 3); inked('#b59a6a', 2);   // khaki vest
  ctx.fillStyle = '#8a7350'; ctx.fillRect(-8, -27, 5, 4); ctx.fillRect(4, -27, 5, 4);
  // back arm: raised and glowing while he levitates rocks
  const cast = o.cast || 0;
  const [ax, ay] = limb(-5, -32, Math.PI / 2 + 0.3 - cast * 2.4, 12, '#5a7a4a', 4);
  if (cast > 0) { const g = ctx.createRadialGradient(ax, ay, 0, ax, ay, 22); g.addColorStop(0, 'rgba(180,140,255,.8)'); g.addColorStop(1, 'rgba(180,140,255,0)'); ctx.fillStyle = g; ctx.fillRect(ax - 22, ay - 22, 44, 44); }
  // head, curly hair, round glasses, bucket hat
  ctx.beginPath(); ctx.arc(2, -46, 10, 0, 7); inked('#f0cfa8', 3);
  ctx.fillStyle = '#6b4226'; for (const [hx, hy] of [[-8, -46], [-7, -40], [12, -44], [-5, -52], [10, -50]]) { ctx.beginPath(); ctx.arc(hx, hy, 3.4, 0, 7); ctx.fill(); }
  ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(4, -46, 3.4, 0, 7); ctx.moveTo(12.4, -46); ctx.arc(9, -46, 3.4, 0, 7); ctx.stroke();
  ctx.fillStyle = INK; ctx.fillRect(3.5, -46.5, 1.6, 1.6); ctx.fillRect(8.5, -46.5, 1.6, 1.6);
  ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(1, -51); ctx.lineTo(7, o.stun ? -50 : -52); ctx.moveTo(8, -52); ctx.lineTo(12, -50.5); ctx.stroke();   // stern brows
  if (o.stun) { ctx.beginPath(); ctx.arc(7, -38, 2.5, 0, 7); ctx.stroke(); }
  else { ctx.beginPath(); ctx.moveTo(4, -39); ctx.lineTo(10, -39.5); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(-12, -53); ctx.lineTo(16, -53); ctx.lineTo(12, -57); ctx.quadraticCurveTo(2, -64, -8, -57); ctx.closePath(); inked('#8a7a5a', 2.5);
  // clipboard (front hand)
  const [cx2, cy2] = limb(5, -31, o.point ? -0.4 : 0.5, 10, '#5a7a4a', 4);
  ctx.save(); ctx.translate(cx2 + 2, cy2 - 6); ctx.rotate(o.point ? -0.3 : 0.15);
  rr(-1, -6, 13, 17, 1.5); inked('#c9a36b', 2); ctx.fillStyle = BONE; ctx.fillRect(1, -3, 9, 12);
  ctx.fillStyle = INK; ctx.fillRect(4, -7, 4, 3); for (let k = 0; k < 3; k++) ctx.fillRect(2, -1 + k * 3.5, 7, 1);
  ctx.restore();
  ctx.restore();
  if (o.stun) for (let k = 0; k < 3; k++) { const a = t * 4 + k * 2.1; ctx.fillStyle = GOLD; ctx.font = `12px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillText('★', x + Math.cos(a) * 16, y - 70 + Math.sin(a) * 5); }
}
// a neatly labelled pile of rocks (Fionn's camp)
function drawRockPile(x, y, t) {
  ctx.save(); ctx.lineJoin = 'round';
  [[-14, 0, 11, '#8c7b6b'], [6, 0, 13, '#6b6f7a'], [-4, -14, 9, '#a8452a'], [10, -16, 7, '#9be36a']].forEach(([ox, oy, r, c]) => {
    ctx.beginPath(); ctx.ellipse(x + ox, y + oy - r * 0.7, r, r * 0.75, 0, 0, 7); inked(c, 2.5);
  });
  ctx.fillStyle = BONE; ctx.fillRect(x - 22, y - 30, 14, 7); ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.strokeRect(x - 22, y - 30, 14, 7);
  ctx.font = `7px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = INK; ctx.fillText('KEVIN', x - 15, y - 25);
  ctx.restore();
}

/* ---------- Milo the Storm-Wrecked: wizard, fried hair, permanent hurricane ---------- */
function drawMilo(x, y, facing, t, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(facing, 1); ctx.lineJoin = 'round';
  const sway = Math.sin(t * 3) * 2;
  // robe (floats: tattered hem instead of legs)
  ctx.beginPath(); ctx.moveTo(-10, -38); ctx.lineTo(10, -38); ctx.lineTo(15 + sway * 0.4, -2);
  for (let k = 0; k < 4; k++) ctx.lineTo(9 - k * 8 + sway * 0.3, k % 2 ? -6 : 2);
  ctx.lineTo(-15, -4); ctx.closePath(); inked(o.stun ? '#3a2f5a' : '#4a3a8a', 3);
  ctx.fillStyle = GOLD; for (const [sx, sy] of [[-5, -24], [6, -14], [-2, -8]]) { ctx.beginPath(); for (let k = 0; k < 5; k++) { const a = k * 1.2566 - 1.57, r = k % 2 ? 1.2 : 3; ctx.lineTo(sx + Math.cos(a) * 3, sy + Math.sin(a) * 3); } ctx.fill(); }
  // head
  ctx.beginPath(); ctx.arc(2, -46, 10, 0, 7); inked('#f3e0c8', 3);
  if (o.stun) { ctx.fillStyle = 'rgba(30,22,26,.5)'; ctx.beginPath(); ctx.arc(2, -46, 10, 0, 7); ctx.fill(); }
  // fried, wild, slightly smoking hair
  ctx.beginPath(); ctx.moveTo(-9, -48);
  for (let k = 0; k < 9; k++) { const a = Math.PI + k / 8 * Math.PI, r = 15 + (k % 2) * 7 + Math.sin(t * 9 + k) * 1.5; ctx.lineTo(2 + Math.cos(a) * r, -48 + Math.sin(a) * r * 0.9); ctx.lineTo(2 + Math.cos(a + 0.18) * 9, -48 + Math.sin(a + 0.18) * 8); }
  ctx.closePath(); inked('#e8e0ff', 2.5);
  if (Math.random() < 0.08) spawnParticle({ x: x + facing * rand(-10, 14), y: y - 66, vx: rand(-10, 10), vy: -30, life: 0.9, size: 5, color: 'rgba(120,110,140,.4)', type: 'puff', drag: 1 });
  ctx.strokeStyle = INK; ctx.lineWidth = 2.2;
  if (o.panic) { ctx.beginPath(); ctx.arc(4, -46, 2.6, 0, 7); ctx.moveTo(11.6, -46); ctx.arc(9, -46, 2.6, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.ellipse(7, -39, 2.5, 3, 0, 0, 7); ctx.stroke(); }
  else if (o.stun) { ctx.beginPath(); ctx.moveTo(2, -48); ctx.lineTo(6, -44); ctx.moveTo(6, -48); ctx.lineTo(2, -44); ctx.moveTo(8, -48); ctx.lineTo(12, -44); ctx.moveTo(12, -48); ctx.lineTo(8, -44); ctx.stroke(); }
  else { ctx.fillStyle = INK; ctx.fillRect(3, -47, 2.5, 3); ctx.fillRect(9, -47, 2.5, 3); ctx.beginPath(); ctx.moveTo(4, -40); ctx.quadraticCurveTo(8, -37, 12, -41); ctx.stroke(); }
  // sparking wooden staff
  const ang = o.cast ? -2.3 : o.stun ? 0.9 : -1.1 + Math.sin(t * 2) * 0.08;
  const [hx, hy] = limb(4, -32, ang + 0.6, 10, '#4a3a8a', 4);
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang);
  ctx.fillStyle = '#7a5232'; ctx.fillRect(-16, -2.5, 44, 5); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(-16, -2.5, 44, 5);
  if (!o.stun) {
    ctx.beginPath(); ctx.arc(30, 0, 6, 0, 7); inked('#6fd3ff', 2);
    if (Math.random() < 0.3) { ctx.strokeStyle = '#d8f4ff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(30, 0); ctx.lineTo(36 + rand(-3, 3), -6 + rand(-3, 3)); ctx.lineTo(40 + rand(-3, 3), 2 + rand(-3, 3)); ctx.stroke(); }
  } else { ctx.fillStyle = 'rgba(40,30,30,.8)'; ctx.beginPath(); ctx.arc(28, 0, 5, 0, 7); ctx.fill(); }
  ctx.restore();
  ctx.restore();
}

/* ---------- King Deniz: icy scowl… or, crownless, a very relaxed hippie ---------- */
function drawDeniz(x, y, facing, t, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(facing, 1); ctx.lineJoin = 'round';
  const hippie = o.hippie, sit = o.sit;
  if (sit) ctx.translate(0, 10);
  if (sit) { limb(-4, -18, 0.15, 14, hippie ? '#3b4f66' : '#1f3f66', 6); limb(4, -18, 0.05, 14, hippie ? '#3b4f66' : '#1f3f66', 6); }
  else { const run = o.slide ? 0.5 : 0; limb(-4, -18, Math.PI / 2 + run, 18, '#1f3f66', 6); limb(4, -18, Math.PI / 2 - run, 18, '#1f3f66', 6); }
  if (hippie) {
    // tie-dye shirt
    rr(-12, -40, 24, 24, 6); inked('#ff8a2a', 3);
    ['#ff4aa0', '#6fd3ff', '#7dff9a', GOLD].forEach((c, k) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(-4 + (k % 2) * 8, -34 + Math.floor(k / 2) * 9, 3.5, 0, 7); ctx.fill(); });
  } else {
    // royal robe with a fur trim
    ctx.beginPath(); ctx.moveTo(-12, -40); ctx.lineTo(12, -40); ctx.lineTo(17, -10); ctx.lineTo(-17, -10); ctx.closePath(); inked(o.flash ? '#ffffff' : '#2a5a8a', 3);
    ctx.fillStyle = BONE; ctx.fillRect(-13, -42, 26, 5); ctx.fillRect(-2, -38, 4, 26);
    ctx.fillStyle = INK; for (let k = 0; k < 4; k++) ctx.fillRect(-10 + k * 6, -41, 1.6, 1.6);
    // a high, stiff royal collar behind the head: a 2-frame flutter, flaring when he slides
    const fl = (Math.floor(t * 5) % 2 ? 1.4 : -1.4) + Math.sin(t * 3) * 0.8 + (o.slide ? 4 : 0);
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(2 + s * 4, -41); ctx.lineTo(2 + s * (17 + fl * 0.5), -63 - fl); ctx.lineTo(2 + s * (11 + fl * 0.3), -66 - fl * 0.6);
      ctx.quadraticCurveTo(2 + s * 9, -52, 2 + s * 1, -44); ctx.closePath(); inked('#e8f4ff', 2.5);
      ctx.fillStyle = '#2a5a8a'; ctx.beginPath(); ctx.moveTo(2 + s * 5, -44); ctx.lineTo(2 + s * (13 + fl * 0.4), -60 - fl * 0.8); ctx.lineTo(2 + s * 7, -50); ctx.closePath(); ctx.fill();
    }
  }
  // head
  ctx.beginPath(); ctx.arc(2, -50, 10, 0, 7); inked('#e8c3a0', 3);
  ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
  if (hippie) {
    ctx.fillStyle = '#5a3a24'; ctx.beginPath(); ctx.moveTo(-9, -54); ctx.quadraticCurveTo(-12, -38, -8, -34); ctx.lineTo(-5, -48); ctx.closePath(); ctx.fill();   // long hair
    ctx.beginPath(); ctx.moveTo(-9, -54); ctx.quadraticCurveTo(2, -64, 12, -54); ctx.stroke();
    rr(-9, -57, 22, 4, 2); inked('#ff8a2a', 1.5);                                                         // headband
    ctx.fillStyle = '#ff4aa0'; ctx.beginPath(); ctx.arc(-7, -55, 3, 0, 7); ctx.fill(); ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(-7, -55, 1.2, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(3, -50); ctx.quadraticCurveTo(5, -48, 7, -50); ctx.moveTo(9, -50); ctx.quadraticCurveTo(11, -48, 13, -50); ctx.stroke();   // chill, closed eyes
    ctx.beginPath(); ctx.moveTo(4, -44); ctx.quadraticCurveTo(8, -40, 12, -44); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(1, -55); ctx.lineTo(7, -52); ctx.moveTo(9, -52); ctx.lineTo(14, -55); ctx.stroke();   // freezing scowl
    ctx.fillStyle = '#6fd3ff'; ctx.fillRect(4, -51, 2.5, 2.5); ctx.fillRect(10, -51, 2.5, 2.5);
    ctx.beginPath(); ctx.moveTo(4, -43); ctx.quadraticCurveTo(8, -46, 12, -43); ctx.stroke();
    ctx.strokeStyle = '#5a3a24'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-8, -50); ctx.quadraticCurveTo(-10, -42, -6, -40); ctx.stroke();   // beard edge
    if (o.crown !== false) {
      ctx.beginPath(); ctx.moveTo(-9, -58); ctx.lineTo(-10, -70); ctx.lineTo(-4, -63); ctx.lineTo(1, -76); ctx.lineTo(6, -63); ctx.lineTo(11, -72); ctx.lineTo(13, -58); ctx.closePath();
      inked('#bfefff', 2.5); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(0, -68, 2, 6);
      ctx.fillStyle = '#6fd3ff'; ctx.beginPath(); ctx.arc(2, -61, 2.4, 0, 7); ctx.fill();
    }
  }
  // arm: ice scepter (king) or a tea cup (hippie)
  if (hippie) {
    const [hx, hy] = limb(5, -34, 0.6, 10, '#ff8a2a', 4);
    rr(hx - 2, hy - 8, 9, 8, 2); inked(BONE, 2); ctx.strokeStyle = 'rgba(243,234,216,.5)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(hx + 2, hy - 10); ctx.quadraticCurveTo(hx + 6 + Math.sin(t * 3) * 2, hy - 16, hx + 2, hy - 22); ctx.stroke();
  } else {
    const ang = o.raise ? -2.2 : o.slide ? 0.1 : -0.8 + Math.sin(t * 2) * 0.06;
    const [hx, hy] = limb(5, -36, ang + 0.4, 11, '#2a5a8a', 4.5);
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang);
    ctx.fillStyle = '#9fd8e8'; ctx.fillRect(-10, -2.5, 38, 5); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(-10, -2.5, 38, 5);
    ctx.beginPath(); ctx.moveTo(28, -7); ctx.lineTo(38, 0); ctx.lineTo(28, 7); ctx.lineTo(31, 0); ctx.closePath(); inked('#bfefff', 2);
    ctx.restore();
  }
  ctx.restore();
}
// a cosy rug, cushions and a steaming kettle (Deniz's tea lounge at camp)
function drawTeaLounge(x, y, t) {
  ctx.save(); ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.ellipse(x + 8, y - 2, 66, 7, 0, 0, 7); inked('#8a1c3a', 2.5);
  ctx.strokeStyle = GOLD; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x + 8, y - 2, 54, 4.5, 0, 0, 7); ctx.stroke();
  for (const [cx2, c] of [[x - 42, '#6fd3ff'], [x + 54, '#7dff9a']]) { ctx.beginPath(); ctx.ellipse(cx2, y - 8, 13, 7, 0, 0, 7); inked(c, 2.5); }
  const kx = x + 30, ky = y - 4;
  ctx.beginPath(); ctx.ellipse(kx, ky - 10, 12, 10, 0, 0, 7); inked('#c9a33a', 2.5);
  ctx.beginPath(); ctx.moveTo(kx + 10, ky - 12); ctx.lineTo(kx + 20, ky - 20); ctx.stroke();
  ctx.beginPath(); ctx.arc(kx, ky - 22, 3, 0, 7); inked(INK, 1);
  ctx.strokeStyle = 'rgba(243,234,216,.45)'; ctx.lineWidth = 2;
  for (let k = 0; k < 2; k++) { const s = (t * 0.7 + k * 0.5) % 1; ctx.globalAlpha = 1 - s; ctx.beginPath(); ctx.moveTo(kx + 20, ky - 22 - s * 30); ctx.quadraticCurveTo(kx + 26, ky - 30 - s * 30, kx + 20, ky - 38 - s * 30); ctx.stroke(); }
  ctx.globalAlpha = 1;
  ctx.font = `13px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = GOLD; ctx.fillText('PEACE & TEA', x + 8, y - 90);
  ctx.restore();
}
// a golden pennant on a little pole
function drawPennant(x, y, t, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineJoin = 'round';
  ctx.fillStyle = INK; ctx.fillRect(-2, -54, 4, 54);
  const w = Math.sin(t * 4) * 3;
  ctx.beginPath(); ctx.moveTo(2, -52); ctx.quadraticCurveTo(20, -48 + w, 38, -42 + w); ctx.quadraticCurveTo(20, -36 + w, 2, -30); ctx.closePath(); inked(GOLD, 2.5);
  ctx.fillStyle = '#e8361c'; ctx.font = `10px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('★', 14, -41 + w * 0.5);
  ctx.restore();
}

/* ---------- Lucky Pebbles: 50 hidden across every zone, for Fionn ---------- */
class LuckyPebble {
  constructor(x, y, id) { Object.assign(this, { kind: 'pebble', x, y, id, t: rand(0, 6), gone: false }); }
  update(dt) {
    this.t += dt;
    if (Math.random() < 0.05) spawnParticle({ x: this.x + rand(-8, 8), y: this.y - rand(6, 22), vx: 0, vy: -18, life: 0.6, size: 2, color: '#9be36a', type: 'dot' });
    const c = Player.center();
    if (!Player.dead && Math.hypot(c.x - this.x, c.y - (this.y - 12)) < 32) {
      this.gone = true; const D = Save.data, first = !pebblesFound();
      D.pebbles[this.id] = 1; saveGame(); SFX.coin(); SFX.crystal();
      burst(this.x, this.y - 12, 14, { colors: ['#9be36a', GOLD, BONE], maxSpeed: 300 });
      pop(this.x, this.y - 36, 'LUCKY!', { size: 26, color: '#9be36a', burstColor: '#2a4a2a' });
      const n = pebblesFound();
      if (first) showCard('ITEM ACQUIRED', 'LUCKY PEBBLE', D.fionnDead
        ? 'A smooth little stone with a faint green shine. Fionn wants 50 of these. Bring them to him at Base Camp in batches of 10.'
        : 'A smooth little stone with a faint green shine. It feels lucky. Somebody who really likes rocks would probably want these.', [`${n} / ${PEBBLE_TOTAL} found`]);
      else toast(`LUCKY PEBBLE · ${n} / ${PEBBLE_TOTAL}${D.fionnDead && n - D.pebblesGiven >= 10 ? ' · TAKE THEM TO FIONN!' : ''}`);
    }
  }
  draw() {
    const x = this.x, y = this.y - 12 + Math.sin(this.t * 2.6) * 3;
    const g = ctx.createRadialGradient(x, y, 0, x, y, 28); g.addColorStop(0, 'rgba(155,227,106,.45)'); g.addColorStop(1, 'rgba(155,227,106,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 28, y - 28, 56, 56);
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(this.t * 1.3) * 0.2);
    ctx.beginPath(); ctx.ellipse(0, 0, 8, 6, 0.3, 0, 7); inked('#7fb85a', 2.2);
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.ellipse(-2.5, -2, 2.5, 1.4, 0.3, 0, 7); ctx.fill();
    ctx.restore();
  }
}
