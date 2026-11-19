'use strict';
/* =========================================================
   FINAL BOSS · EVIL ADAM (3 phases)
   1 · The Dark Match   (100–60%): curving Dark Serves, dashes, a Shadow Double
   2 · Cursed Trophies  (60–20%):  gravity flips / drops every 15 s, shockwaves, trophy laser rain
   3 · Deuce            (20–0%):   heartbeat duel → Match Point Barrage → GRAND SLAM
   (TennisBall, WindSlash, FX, landYAt come from act/bosses.js)
   ========================================================= */
const EVIL_TAUNTS = ['Unforced error.', 'Fault.', 'Double fault.', 'Out!', 'Love–fifteen.', 'Net.'];

/* ---------- Evil Adam: Adam, drained of colour and full of spite ---------- */
function drawEvilAdam(x, y, facing, t, o = {}) {
  const pose = o.pose || 'idle', run = o.run ? Math.sin(t * 16) : 0;
  if (o.aura) {   // black-and-gold aura licking upward
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y - 28, 0, x, y - 28, 64); g.addColorStop(0, 'rgba(160,80,220,.32)'); g.addColorStop(1, 'rgba(160,80,220,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 64, y - 92, 128, 128); ctx.restore();
    if (Math.random() < 0.5) spawnParticle({ x: x + rand(-14, 14), y: y - rand(0, 50), vx: rand(-20, 20), vy: rand(-90, -40), life: 0.5, size: rand(2, 4), color: Math.random() < 0.7 ? '#7a1f6e' : GOLD, type: 'dot' });
  }
  ctx.save(); ctx.translate(x, y); ctx.scale(facing, 1); ctx.lineJoin = 'round';
  if (o.flash) ctx.globalAlpha = 0.6;
  let back = Math.PI / 2 + run * 0.7, front = Math.PI / 2 - run * 0.7;
  if (pose === 'air' || pose === 'serve' || pose === 'smash') { back = 2.1; front = 1.0; }
  if (pose === 'kneel') { ctx.translate(0, 9); back = 0.3; front = Math.PI / 2 + 0.2; }
  if (pose === 'dash') { back = 2.5; front = 0.6; }
  limb(-3, -15, back, 15, '#2a1a33', 5); limb(3, -15, front, 15, '#3a2244', 5);
  ctx.fillStyle = GOLD; ctx.beginPath(); ctx.ellipse(-3 + Math.cos(back) * 15, -15 + Math.sin(back) * 15, 5, 3, 0, 0, 7); ctx.ellipse(3 + Math.cos(front) * 15, -15 + Math.sin(front) * 15, 5, 3, 0, 0, 7); ctx.fill();
  rr(-10, -36, 20, 23, 6); inked('#1a0f22', 3);                         // black "tennis whites"
  ctx.fillStyle = GOLD; ctx.fillRect(-10, -19, 20, 3); ctx.fillRect(-2, -36, 4, 8);
  limb(-4, -31, pose === 'cross' ? 0.35 : Math.PI / 2 + 0.3, 11, '#1a0f22', 4);   // 'cross': arms folded over the chest
  ctx.beginPath(); ctx.arc(2, -45, 10, 0, 7); inked('#cfc4d8', 3);       // pale, drained skin
  ctx.beginPath(); ctx.moveTo(-9, -46); ctx.quadraticCurveTo(-6, -62, 6, -60); ctx.quadraticCurveTo(18, -58, 13, -47); ctx.quadraticCurveTo(6, -55, -9, -46); inked('#3a1f4a', 2.5);
  ctx.fillStyle = GOLD; ctx.fillRect(-9, -51, 22, 4); ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.strokeRect(-9, -51, 22, 4);
  ctx.save(); ctx.shadowColor = '#d9b8ff'; ctx.shadowBlur = 10; ctx.fillStyle = '#e6d6ff'; ctx.fillRect(5, -46, 4, 2.5); ctx.restore();   // glowing eye
  ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(3, -49); ctx.lineTo(10, -47); ctx.stroke();
  if (pose === 'kneel') { ctx.beginPath(); ctx.moveTo(4, -38); ctx.lineTo(10, -39); ctx.stroke(); }
  else { ctx.beginPath(); ctx.moveTo(3, -40); ctx.quadraticCurveTo(8, -36, 12, -41); ctx.stroke(); }   // cruel smirk
  const ra = o.racket !== undefined ? o.racket : pose === 'cross' ? Math.PI - 0.4 : pose === 'snap' ? -1.9 : pose === 'serve' ? -2.2 : pose === 'smash' ? -2.8 : pose === 'dash' ? 0.2 : -0.9 + Math.sin(t * 2) * 0.08;
  const [hx, hy] = limb(3, -30, ra, 10, '#1a0f22', 4);
  if (!o.noRacket) {
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(ra);
    ctx.fillStyle = INK; ctx.fillRect(0, -2, 14, 4);
    ctx.beginPath(); ctx.ellipse(24, 0, 11, 8, 0, 0, 7); ctx.fillStyle = 'rgba(185,139,255,.3)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#1a0f22'; ctx.stroke(); ctx.lineWidth = 1.2; ctx.strokeStyle = GOLD; ctx.stroke();
    ctx.strokeStyle = 'rgba(217,184,255,.7)'; ctx.lineWidth = 1; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(24 + k * 4, -7); ctx.lineTo(24 + k * 4, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(14, k * 3); ctx.lineTo(34, k * 3); ctx.stroke(); }
    ctx.restore();
  }
  ctx.restore();
}

/* ---------- Dark Serve: a purple tennis ball that curves mid-air ---------- */
class DarkServe {
  constructor(x, y, vx, vy, curve, boss) { Object.assign(this, { x, y, vx, vy, curve, boss, r: 9, life: 3.2, friendly: false, dead: false, t: 0, trail: [] }); }
  box() { return { x: this.x - 16, y: this.y - 16, w: 32, h: 32 }; }
  update(dt) {
    this.t += dt; this.life -= dt;
    this.trail.push({ x: this.x, y: this.y }); if (this.trail.length > 10) this.trail.shift();
    const b = this.boss;
    if (this.friendly && b && !b.dead) {
      const dx = b.x + b.w / 2 - this.x, dy = b.y + b.h / 2 - this.y, d = Math.hypot(dx, dy) || 1;
      this.vx = lerp(this.vx, dx / d * 1100, 1 - Math.exp(-9 * dt)); this.vy = lerp(this.vy, dy / d * 1100, 1 - Math.exp(-9 * dt));
      this.x += this.vx * dt; this.y += this.vy * dt;
      if (d < 30) { this.dead = true; b.serveReturned(); }
      return;
    }
    const a = this.curve * dt, c = Math.cos(a), s = Math.sin(a);
    [this.vx, this.vy] = [this.vx * c - this.vy * s, this.vx * s + this.vy * c];
    this.x += this.vx * dt; this.y += this.vy * dt;
    if (this.life <= 0 || pointSolid(this.x, this.y)) { this.dead = true; burst(this.x, this.y, 10, { colors: ['#b98bff', '#1a0f22'], maxSpeed: 240 }); return; }
    if (overlap({ x: this.x - this.r, y: this.y - this.r, w: this.r * 2, h: this.r * 2 }, Player.hurtbox())) { Player.hurt(sgn(this.vx) || 1); this.dead = true; }
  }
  onBat() {
    this.friendly = true; this.life = 2; SFX.deflect(); addHitstop(0.1); addShake(7);
    pop(this.x, this.y - 18, 'RETURN!', { size: 34, color: '#d9b8ff', burstColor: '#4a1f5a' }); ring(this.x, this.y, 6, 60, 0.3, '#d9b8ff', 5);
  }
  draw() {
    ctx.lineCap = 'round';
    for (let i = 1; i < this.trail.length; i++) { ctx.strokeStyle = this.friendly ? `rgba(255,138,42,${i / this.trail.length})` : `rgba(122,31,110,${i / this.trail.length})`; ctx.lineWidth = i * 1.7; ctx.beginPath(); ctx.moveTo(this.trail[i - 1].x, this.trail[i - 1].y); ctx.lineTo(this.trail[i].x, this.trail[i].y); ctx.stroke(); }
    const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, 24); g.addColorStop(0, this.friendly ? 'rgba(255,138,42,.7)' : 'rgba(185,139,255,.7)'); g.addColorStop(1, 'rgba(185,139,255,0)');
    ctx.fillStyle = g; ctx.fillRect(this.x - 24, this.y - 24, 48, 48);
    ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, 7); inked(this.friendly ? '#ffd27a' : '#2a1a3a', 2.5);
    ctx.strokeStyle = '#d9b8ff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(this.x - 6, this.y, 6, -0.9, 0.9); ctx.stroke();
    if (!this.friendly && Math.hypot(Player.x - this.x, Player.y - this.y) < 200) { ctx.font = `12px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = '#d9b8ff'; ctx.fillText('SWING!', this.x, this.y - 20); }
  }
}

/* ---------- Shadow Double: mirrors Evil Adam's dash from the other side ---------- */
class ShadowDouble {
  constructor(boss) {
    const ar = ROOM.t_court.px, cx = boss.x + boss.w / 2;
    Object.assign(this, { boss, x: ar.x + ar.w - (cx - ar.x), y: boss.y + boss.h, dir: -boss.facing, t: 0, state: 'wind', dead: false, slashT: 0, alpha: 0 });
  }
  update(dt) {
    this.t += dt; const ar = ROOM.t_court.px;
    this.alpha = this.state === 'fade' ? Math.max(0, this.alpha - dt * 3) : Math.min(0.75, this.alpha + dt * 3);
    if (this.state === 'wind' && this.t > 0.5) { this.state = 'dash'; this.t = 0; SFX.whoosh(); }
    else if (this.state === 'dash') {
      this.x += this.dir * 900 * dt;
      this.slashT -= dt; if (this.slashT <= 0) { this.slashT = 0.07; FX.push(new WindSlash(this.x, this.y, this.dir)); }
      Game.afterimages.push({ x: this.x - 11, y: this.y - 48, facing: this.dir, life: 0.15, max: 0.15, color: '#7a1f6e' });
      if (overlap(Player.hurtbox(), { x: this.x - 12, y: this.y - 48, w: 24, h: 48 })) Player.hurt(this.dir);
      if (this.t > 0.75 || this.x < ar.x + 2 * TILE || this.x > ar.x + ar.w - 2 * TILE) { this.state = 'fade'; this.t = 0; }
    } else if (this.state === 'fade' && this.alpha <= 0) this.dead = true;
  }
  draw() {
    ctx.save(); ctx.globalAlpha = this.alpha;
    drawEvilAdam(this.x, this.y, this.dir, Game.time, { pose: this.state === 'wind' ? 'idle' : 'dash', aura: false });
    ctx.restore();
    if (this.state === 'wind') { ctx.fillStyle = `rgba(122,31,110,${0.3 + 0.3 * Math.sin(Game.time * 30)})`; ctx.font = `14px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillText('SHADOW DOUBLE!', this.x, this.y - 70); }
  }
}

/* ---------- Dark shockwave: an expanding ring with gaps (dash through, or slip through a gap) ---------- */
class DarkShock {
  constructor(x, y, speed = 360, max = 900) { Object.assign(this, { x, y, r: 20, speed, max, dead: false, hit: false, rot: rand(0, 6) }); }
  gapAt(a) { for (let k = 0; k < 3; k++) { const g = this.rot + k * Math.PI * 2 / 3, d = Math.atan2(Math.sin(a - g), Math.cos(a - g)); if (Math.abs(d) < 0.32) return true; } return false; }
  update(dt) {
    this.r += this.speed * dt; this.rot += dt * 0.6;
    if (this.r > this.max) { this.dead = true; return; }
    const c = Player.center(), d = Math.hypot(c.x - this.x, c.y - this.y);
    if (!this.hit && Math.abs(d - this.r) < 16 && !this.gapAt(Math.atan2(c.y - this.y, c.x - this.x))) { this.hit = true; Player.hurt(sgn(c.x - this.x) || 1); }
  }
  draw() {
    const a = Math.max(0, 1 - this.r / this.max);
    ctx.save(); ctx.lineWidth = 12; ctx.strokeStyle = `rgba(122,31,110,${0.75 * a + 0.2})`;
    for (let k = 0; k < 3; k++) { const g0 = this.rot + k * Math.PI * 2 / 3 + 0.32, g1 = this.rot + (k + 1) * Math.PI * 2 / 3 - 0.32; ctx.beginPath(); ctx.arc(this.x, this.y, this.r, g0, g1); ctx.stroke(); }
    ctx.lineWidth = 3; ctx.strokeStyle = `rgba(217,184,255,${a})`;
    for (let k = 0; k < 3; k++) { const g0 = this.rot + k * Math.PI * 2 / 3 + 0.32, g1 = this.rot + (k + 1) * Math.PI * 2 / 3 - 0.32; ctx.beginPath(); ctx.arc(this.x, this.y, this.r, g0, g1); ctx.stroke(); }
    ctx.restore();
  }
}

/* ---------- Trophy Laser Rain: a floating trophy sweeps a vertical beam across the court ---------- */
class TrophyBeam {
  constructor(x, dir, delay = 0) { const ar = ROOM.t_court.px; Object.assign(this, { x, dir, t: -delay, ph: 'warn', dead: false, top: ar.y + 2 * TILE, bot: A.courtFloor }); }
  update(dt) {
    this.t += dt; if (this.t < 0) return;
    const ar = ROOM.t_court.px;
    if (this.ph === 'warn' && this.t > 0.9) { this.ph = 'fire'; this.t = 0; SFX.laser(); }
    if (this.ph === 'fire') {
      this.x += this.dir * 230 * dt;
      const hb = Player.hurtbox();
      if (hb.x < this.x + 10 && hb.x + hb.w > this.x - 10 && hb.y < this.bot && !Player.dead) Player.hurt(this.dir);
      if (this.t > 3.2 || this.x < ar.x + TILE || this.x > ar.x + ar.w - TILE) { this.ph = 'done'; this.t = 0; }
    }
    if (this.ph === 'done' && this.t > 0.35) this.dead = true;
  }
  draw() {
    if (this.t < 0) return;
    const fl = 0.7 + 0.3 * Math.sin(Game.time * 40);
    if (this.ph === 'warn') { ctx.strokeStyle = `rgba(217,184,255,${0.3 + 0.3 * Math.sin(Game.time * 26)})`; ctx.lineWidth = 2; ctx.setLineDash([6, 8]); ctx.beginPath(); ctx.moveTo(this.x, this.top + 20); ctx.lineTo(this.x, this.bot); ctx.stroke(); ctx.setLineDash([]); }
    else if (this.ph === 'fire') {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(this.x - 22, 0, this.x + 22, 0); g.addColorStop(0, 'rgba(160,80,220,0)'); g.addColorStop(0.5, `rgba(230,200,255,${0.85 * fl})`); g.addColorStop(1, 'rgba(160,80,220,0)');
      ctx.fillStyle = g; ctx.fillRect(this.x - 22, this.top + 20, 44, this.bot - this.top - 20); ctx.restore();
      if (Math.random() < 0.5) spawnParticle({ x: this.x + rand(-10, 10), y: this.bot - 4, vx: rand(-120, 120), vy: rand(-200, -60), life: 0.3, size: 3, color: '#d9b8ff', type: 'spark' });
    }
    drawTrophy(this.x, this.top + 22, 0.75, Game.time);
  }
}

/* ---------- Match Point Barrage: 7 dark meteors, bat every one back in rhythm ---------- */
class DarkMeteor {
  constructor(boss, n) {
    const sx = boss.x + boss.w / 2, sy = boss.y - 30;
    Object.assign(this, { boss, n, x: sx, y: sy, vx: 0, vy: 0, r: 13, friendly: false, dead: false, t: 0, trail: [], resolved: false });
    const c = Player.center(), dx = c.x - sx, dy = c.y - sy, d = Math.hypot(dx, dy) || 1, sp = 470;
    this.vx = dx / d * sp; this.vy = dy / d * sp;
  }
  box() { return { x: this.x - 22, y: this.y - 22, w: 44, h: 44 }; }
  update(dt) {
    this.t += dt;
    this.trail.push({ x: this.x, y: this.y }); if (this.trail.length > 9) this.trail.shift();
    const b = this.boss;
    if (this.friendly) {
      const dx = b.x + b.w / 2 - this.x, dy = b.y + b.h / 2 - this.y, d = Math.hypot(dx, dy) || 1;
      this.vx = lerp(this.vx, dx / d * 1200, 1 - Math.exp(-10 * dt)); this.vy = lerp(this.vy, dy / d * 1200, 1 - Math.exp(-10 * dt));
      this.x += this.vx * dt; this.y += this.vy * dt;
      if (d < 30) { this.dead = true; b.meteorReturned(this); }
      return;
    }
    this.x += this.vx * dt; this.y += this.vy * dt;
    if (Math.random() < 0.6) spawnParticle({ x: this.x + rand(-6, 6), y: this.y + rand(-6, 6), vx: rand(-40, 40), vy: rand(-40, 40), life: 0.3, size: rand(3, 5), color: Math.random() < 0.5 ? '#7a1f6e' : '#1a0f22', type: 'dot' });
    const ar = ROOM.t_court.px;
    if (pointSolid(this.x, this.y) || this.t > 4 || this.x < ar.x || this.x > ar.x + ar.w) { this.dead = true; this.miss(); explode(this.x, this.y, 46, 0, { friendly: false, small: true, word: false, colors: ['#7a1f6e', '#d9b8ff', '#1a0f22'] }); return; }
    if (overlap({ x: this.x - this.r, y: this.y - this.r, w: this.r * 2, h: this.r * 2 }, Player.hurtbox())) { this.dead = true; Player.hurt(sgn(this.vx) || 1); this.miss(); }
  }
  miss() { if (!this.resolved) { this.resolved = true; this.boss.meteorMissed(this); } }
  onBat() {
    this.friendly = true; this.resolved = true; SFX.deflect(); SFX.hit(true); addHitstop(0.09); addShake(8);
    const n = this.boss.mHits + 1;
    pop(this.x, this.y - 24, n >= 7 ? 'MATCH POINT!' : `${n} / 7`, { size: 40, color: '#ffd27a', burstColor: '#4a1f5a' });
    ring(this.x, this.y, 8, 80, 0.3, '#ffd27a', 6);
  }
  draw() {
    ctx.lineCap = 'round';
    for (let i = 1; i < this.trail.length; i++) { ctx.strokeStyle = this.friendly ? `rgba(255,170,60,${i / this.trail.length})` : `rgba(122,31,110,${i / this.trail.length})`; ctx.lineWidth = i * 2.4; ctx.beginPath(); ctx.moveTo(this.trail[i - 1].x, this.trail[i - 1].y); ctx.lineTo(this.trail[i].x, this.trail[i].y); ctx.stroke(); }
    ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.t * 6);
    starburst(this.r + 5, this.r - 2, 7); inked(this.friendly ? '#ffd27a' : '#2a1238', 2.5);
    ctx.fillStyle = this.friendly ? FLAME : '#d9b8ff'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, 7); ctx.fill();
    ctx.restore();
  }
}

/* ================= EVIL ADAM ================= */
class EvilAdam {
  constructor() {
    const p = A.evil;
    Object.assign(this, { type: 'boss', w: 26, h: 50, hp: 120, maxHp: 120, vx: 0, vy: 0, onGround: false, facing: -1, flash: 0, harmful: false, pogoable: true, givesHype: true,
      state: 'wait', t: 0, anim: 0, last: '', pose: 'idle', bolts: 90, shout: null, ph: 1, step: 0, clangT: 0, mark: null,
      gravT: 6, gravNext: 'flip', beamT: 4, shockT: 3, mHits: 0, mMiss: 0, mLeft: 0, mFired: 0, mT: 0, dazed: false, hover: false, normal: false, gone: false });
    this.x = p.x - this.w / 2; this.y = p.y - this.h;
  }
  arena() { return ROOM.t_court.px; }
  begin() { this.state = 'idle'; this.t = 0.9; this.harmful = true; }
  say(text, dur = 1.4) { this.shout = { text, t: dur }; }
  taunt() { if (!this.shout && this.state !== 'beaten') this.say(EVIL_TAUNTS[(Math.random() * EVIL_TAUNTS.length) | 0], 1.2); }
  grav() { return Act3.grav === 'low' ? 0.4 : 1; }
  update(dt) {
    this.anim += dt; this.flash = Math.max(0, this.flash - dt); this.t -= dt; this.clangT = Math.max(0, this.clangT - dt);
    if (this.shout) { this.shout.t -= dt; if (this.shout.t <= 0) this.shout = null; }
    if (this.state === 'wait' || this.state === 'beaten') { this.gravity(dt); return; }
    const P = Player, cx = this.x + this.w / 2, pcx = P.x + P.w / 2, ar = this.arena();
    // phase changes
    if (this.ph === 1 && this.hp <= this.maxHp * 0.6) { this.toPhase2(); return; }
    if (this.ph === 2 && this.hp <= this.maxHp * 0.2) { this.toPhase3(); return; }
    if (this.ph === 2 && this.state !== 'shatter') this.cursedClock(dt);
    switch (this.state) {
      case 'idle': {
        this.pose = 'idle'; this.facing = sgn(pcx - cx) || this.facing;
        if (this.hover) { this.hoverTo(dt, cx); if (this.t <= 0) this.pick(); break; }
        const want = Math.abs(pcx - cx) > 260 ? 1 : Math.abs(pcx - cx) < 150 ? -1 : 0;
        this.vx = approach(this.vx, want * this.facing * (this.ph === 3 ? 260 : 210), 1600 * dt);
        if (this.t <= 0) this.pick();
        break;
      }
      case 'serveUp':
        this.vx = approach(this.vx, 0, 400 * dt);
        if (this.vy > -40) { this.state = 'serveHold'; this.t = this.ph === 1 ? 0.4 : 0.32; this.pose = 'serve'; SFX.windup(); }
        break;
      case 'serveHold':
        this.vy = 0; this.vx = 0;
        if (this.t <= 0) { this.fireServe(); this.state = this.hover ? 'idle' : 'fall'; this.t = 0.9; this.pose = 'air'; }
        break;
      case 'dashWind':
        this.vx = approach(this.vx, 0, 2000 * dt); if (Math.random() < 0.5) dust(cx, this.y + this.h, 1, -this.facing);
        if (this.t <= 0) { this.state = 'dash'; this.t = 0.7; this.slashT = 0; SFX.whoosh(); }
        break;
      case 'dash':
        this.vx = this.facing * (this.ph === 3 ? 1050 : 920); this.pose = 'dash';
        this.slashT -= dt; if (this.slashT <= 0) { this.slashT = 0.06; FX.push(new WindSlash(cx, this.y + this.h, this.facing)); }
        Game.afterimages.push({ x: this.x, y: this.y, facing: this.facing, life: 0.15, max: 0.15, color: '#7a1f6e' });
        if (this.hitWall || this.t <= 0 || (sgn(cx - pcx) === this.facing && Math.abs(cx - pcx) > 300)) { this.state = 'recover'; this.t = this.ph === 3 ? 0.45 : 0.7; this.vx = 0; }
        break;
      case 'recover': this.vx = approach(this.vx, 0, 2400 * dt); this.pose = 'idle'; if (this.t <= 0) { this.state = 'idle'; this.t = this.ph === 3 ? 0.3 : 0.6; } break;
      case 'fall': if (this.onGround) { this.state = 'idle'; this.t = this.ph === 1 ? 0.7 : 0.5; } break;
      case 'shock':
        this.vx = approach(this.vx, 0, 2000 * dt); this.pose = 'smash';
        if (this.t <= 0) {
          FX.push(new DarkShock(cx, this.y + this.h / 2)); SFX.slam(); addShake(8); pop(cx, this.y - 20, 'DEUCE!', { size: 30, color: '#d9b8ff', burstColor: '#4a1f5a' });
          this.state = 'idle'; this.t = 1.0;
        }
        break;
      case 'stunned':
        this.vx = approach(this.vx, 0, 1500 * dt); this.pose = 'kneel';
        if (this.t <= 0) { this.state = 'idle'; this.t = 0.4; this.harmful = true; }
        break;
      case 'shatter': {   // phase 2 transition: he floats to centre court, folds his arms while the trophies spin up, breaks two, then snaps his fingers and gravity flips
        this.vx = 0; this.pose = this.t < 0.6 ? 'snap' : 'cross';
        const ty = A.courtFloor - 7 * TILE - this.h; this.y = lerp(this.y, ty, 1 - Math.exp(-3 * dt)); this.vy = 0;
        this.x = lerp(this.x, A.net - this.w / 2, 1 - Math.exp(-2.5 * dt)); this.facing = sgn(pcx - cx) || this.facing;
        if (this.t < 1.2 && !this.broke) {
          this.broke = true; Act3.trophiesBroken = 2; Act3.dark = 0.01; SFX.bigCrack(); SFX.boom(); addShake(16); Game.flashWhite = 0.7;
          for (const tr of Act3.trophies.slice(0, 2)) burst(tr.x, tr.y, 30, { colors: ['#1a1020', GOLD, '#d9b8ff'], maxSpeed: 600, grav: 600, type: 'debris' });
          pop(cx, this.y - 40, 'CURSED TROPHIES!', { size: 48, color: '#d9b8ff', burstColor: '#4a1f5a' });
        }
        if (this.t < 0.45 && !this.snapped) {
          this.snapped = true; SFX.clang(); SFX.summon(); SFX.thunder(); addShake(10); Game.flashWhite = 0.35;
          const hx = cx + this.facing * 14, hy = this.y + 8;
          ring(hx, hy, 4, 70, 0.3, '#d9b8ff', 4); pop(hx, hy - 20, 'SNAP!', { size: 30, color: '#e6d6ff', burstColor: '#4a1f5a' });
          Act3.grav = 'flip'; Act3.gravWarn = false; this.hover = true; this.gravT = 5; this.gravNext = 'low';
          pop(P.x + P.w / 2, P.y - 40, 'GRAVITY FLIP!', { size: 44, color: '#d9b8ff', burstColor: '#4a1f5a' });
        }
        if (this.t <= 0) { this.state = this.hover ? 'idle' : 'fall'; this.t = 0.8; this.harmful = true; toast('PHASE 2 · CURSED TROPHIES · GRAVITY WON\'T STAY PUT'); }
        return;
      }
      case 'deuce':   // phase 3 opening stare-down
        this.vx = 0; this.pose = 'idle';
        if (this.t <= 0) { this.state = 'idle'; this.t = 0.5; this.harmful = true; }
        break;
      case 'toNet':
        this.vx = 0; this.pose = 'serve';
        if (this.t <= 0) {
          this.x = A.net - this.w / 2; this.y = A.courtFloor - this.h; this.vy = 0; SFX.poof();
          burst(A.net, this.y + this.h / 2, 20, { colors: ['#1a0f22', '#7a1f6e', '#d9b8ff'], type: 'puff', maxSpeed: 260, minSize: 6, maxSize: 14, maxLife: 0.7, drag: 2 });
          this.state = 'barrage'; this.mHits = 0; this.mMiss = 0; this.mFired = 0; this.mT = 1.0; this.say('MATCH POINT.', 1.4);
          toast('MATCH POINT BARRAGE · BAT ALL 7 BACK IN RHYTHM');
        }
        break;
      case 'barrage':
        this.vx = 0; this.pose = 'serve'; this.facing = sgn(pcx - cx) || this.facing; this.mT -= dt;
        if (this.mFired < 7 && this.mT <= 0) { Bolts.push(new DarkMeteor(this, this.mFired)); this.mFired++; this.mT = 0.85; SFX.serve(); SFX.rocket(); }
        if (this.mFired >= 7 && this.mHits + this.mMiss >= 7 && !this.dazed) {
          if (this.mMiss > 0) { this.say(this.mHits >= 5 ? 'So close. Advantage, me.' : 'Advantage, me.', 1.6); this.state = 'idle'; this.t = 1.3; this.harmful = true; }
        }
        break;
      case 'dazedState':
        this.vx = 0; this.pose = 'kneel';
        break;
    }
    this.gravity(dt);
    this.x = clamp(this.x, ar.x + TILE, ar.x + ar.w - TILE - this.w);
  }
  hoverTo(dt, cx) {   // flipped gravity: he levitates over the middle of the court
    const ty = A.courtFloor - 8 * TILE - this.h, tx = A.net + Math.sin(this.anim * 0.7) * 220 - this.w / 2;
    this.x = lerp(this.x, tx, 1 - Math.exp(-1.5 * dt)); this.y = lerp(this.y, ty, 1 - Math.exp(-2 * dt)); this.vx = 0; this.vy = 0;
  }
  gravity(dt) {
    if (this.hover || this.state === 'serveHold' || this.state === 'shatter' || this.state === 'beaten' && this.gone) return;
    this.vy = Math.min(this.vy + TUNE.gravity * this.grav() * dt, 1500);
    moveBody(this, dt);
  }
  pick() {
    const P = Player, cx = this.x + this.w / 2;
    this.facing = sgn(P.x + P.w / 2 - cx) || this.facing;
    let plan;
    if (this.ph === 1) plan = ['serve', 'dash', 'double', 'serve', 'dash', 'serve'];
    else if (this.ph === 2) plan = this.hover ? ['shock', 'serve', 'serve', 'shock'] : ['serve', 'double', 'shock', 'dash', 'serve'];
    else plan = ['dash', 'serve', 'dash', 'barrage'];
    const a = plan[this.step++ % plan.length];
    if (a === 'serve') {
      if (this.hover) { this.state = 'serveHold'; this.t = 0.35; this.pose = 'serve'; SFX.windup(); }
      else { this.state = 'serveUp'; this.vy = -960; this.vx = -this.facing * 120; this.pose = 'air'; SFX.jump(); }
    }
    if (a === 'dash') { this.state = 'dashWind'; this.t = 0.5; this.pose = 'dash'; SFX.windup(); }
    if (a === 'double') { this.state = 'dashWind'; this.t = 0.5; this.pose = 'dash'; FX.push(new ShadowDouble(this)); SFX.summon(); this.say('Doubles? Sure.', 1.1); }
    if (a === 'shock') { this.state = 'shock'; this.t = 0.6; SFX.slamWarn(); }
    if (a === 'barrage') { this.state = 'toNet'; this.t = 0.5; this.harmful = false; SFX.windup(); }
  }
  fireServe() {
    const P = Player, cx = this.x + this.w / 2, bx = cx + this.facing * 20, by = this.y + 4, c = P.center();
    const dx = c.x - bx, dy = c.y - by, d = Math.hypot(dx, dy) || 1, sp = this.ph === 1 ? 640 : 720;
    // aim a little off so the curve bends the ball back onto Nathan
    const curve = (Math.random() < 0.5 ? -1 : 1) * 1.1, tt = d / sp, a = Math.atan2(dy, dx) - curve * tt * 0.5;
    Bolts.push(new DarkServe(bx, by, Math.cos(a) * sp, Math.sin(a) * sp, curve, this));
    if (this.ph >= 2) { const a2 = Math.atan2(dy, dx) + curve * tt * 0.5; Bolts.push(new DarkServe(bx, by, Math.cos(a2) * sp, Math.sin(a2) * sp, -curve, this)); }
    SFX.serve(); pop(bx, by - 16, 'DARK SERVE!', { size: 26, color: '#d9b8ff', burstColor: '#4a1f5a' });
  }
  // phase 2's clock: gravity events every 15 s + sweeping trophy beams
  cursedClock(dt) {
    const P = Player;
    this.gravT -= dt; this.beamT -= dt;
    if (Act3.grav === 'normal') {
      if (this.gravT <= 1.5 && !Act3.gravWarn) { Act3.gravWarn = true; SFX.laserCharge(); toast(this.gravNext === 'flip' ? 'GRAVITY FLIP INCOMING · STAY AIRBORNE · BAT-LAUNCH DOWN, DASH' : 'LOW GRAVITY INCOMING'); }
      if (this.gravT <= 0) {
        Act3.grav = this.gravNext; Act3.gravWarn = false; this.gravT = Act3.grav === 'flip' ? 5 : 6; this.gravNext = this.gravNext === 'flip' ? 'low' : 'flip';
        SFX.summon(); SFX.thunder(); addShake(10); Game.flashWhite = 0.35;
        pop(P.x + P.w / 2, P.y - 40, Act3.grav === 'flip' ? 'GRAVITY FLIP!' : 'LOW GRAVITY!', { size: 44, color: '#d9b8ff', burstColor: '#4a1f5a' });
        if (Act3.grav === 'flip') { this.hover = true; this.state = 'idle'; this.t = 0.8; }
      }
    } else if (this.gravT <= 0) {
      Act3.grav = 'normal'; this.gravT = 10; this.hover = false; SFX.gate(); addShake(6);
      if (this.state === 'idle') { this.state = 'fall'; }
      pop(P.x + P.w / 2, P.y - 40, 'GRAVITY RESTORED', { size: 30, color: BONE, burstColor: '#4a1f5a' });
    }
    if (this.beamT <= 0) {
      const ar = this.arena(), left = Math.random() < 0.5;
      FX.push(new TrophyBeam(left ? ar.x + 2 * TILE : ar.x + ar.w - 2 * TILE, left ? 1 : -1));
      if (this.hp < this.maxHp * 0.4) FX.push(new TrophyBeam(left ? ar.x + ar.w - 2 * TILE : ar.x + 2 * TILE, left ? -1 : 1, 1.4));
      this.beamT = Act3.grav === 'flip' ? 5 : 7.5; SFX.crystal();
    }
  }
  toPhase2() {
    this.ph = 2; this.state = 'shatter'; this.t = 3.2; this.harmful = false; this.vx = 0; this.broke = false; this.snapped = false;
    FX.length = 0; for (const b of Bolts) b.dead = true; Hazards.length = 0;
    this.say('Let\'s raise the stakes.', 1.8); BossBar.flash(); SFX.windup();
  }
  toPhase3() {
    this.ph = 3; this.state = 'deuce'; this.t = 2.2; this.harmful = false; this.hover = false; this.vx = 0; this.step = 0;
    Act3.grav = 'normal'; Act3.gravWarn = false; FX.length = 0; for (const b of Bolts) b.dead = true; Hazards.length = 0;
    BossBar.flash(); addShake(10);
    this.say('Deuce. Sudden death.', 2.0);
    toast('PHASE 3 · DEUCE · SUDDEN DEATH');
  }
  serveReturned() {
    // a returned Dark Serve breaks his guard
    if (this.state === 'beaten' || this.dazed || ['barrage', 'toNet', 'deuce', 'shatter'].includes(this.state)) return;
    this.state = 'stunned'; this.t = 2.4; this.harmful = false; this.vx = this.facing * -200; this.vy = this.hover ? 0 : -300;
    if (this.hover) { this.hover = false; }
    this.damage(7); SFX.hit(true); addShake(12); addHitstop(0.12);
    pop(this.x + this.w / 2, this.y - 20, 'GUARD BROKEN!', { size: 40, color: '#ffd27a', burstColor: '#4a1f5a' });
  }
  meteorReturned() {
    this.mHits++; this.flash = 0.12; this.hp = Math.max(this.maxHp * 0.03, this.hp - 1); BossBar.set(this.hp / this.maxHp);
    SFX.hit(false); addShake(5);
    if (this.mHits >= 7 && this.mMiss === 0) this.daze();
  }
  meteorMissed() { this.mMiss++; if (this.mMiss === 1) this.say(['Fault.', 'Out!', 'Net.'][(Math.random() * 3) | 0], 1.0); }
  daze() {
    this.dazed = true; this.state = 'dazedState'; this.harmful = false; this.pose = 'kneel';
    for (const b of Bolts) b.dead = true;
    Act3.slowT = 2.6; Game.flashWhite = 0.5; SFX.bigCrack(); addShake(14); BossBar.flash();
    pop(this.x + this.w / 2, this.y - 50, 'MATCH POINT · NATHAN!', { size: 46, life: 1.6, color: '#ffd27a', burstColor: FLAME });
    toast('TIME SLOWS… DASH IN AND LAND THE GRAND SLAM!');
  }
  damage(d) {
    if (this.state === 'beaten') return;
    // each phase has a floor, so no single big hit can skip a phase (and only the Grand Slam finishes him)
    const floor = this.maxHp * (this.ph === 1 ? 0.6 : this.ph === 2 ? 0.2 : 0.03);
    this.hp = Math.max(floor, this.hp - d); this.flash = 0.1; BossBar.set(this.hp / this.maxHp);
  }
  takeHit(dmg, kx, ky, src) {
    if (this.state === 'wait' || this.state === 'beaten' || this.state === 'shatter' || this.state === 'deuce' || this.state === 'toNet') return false;
    if (this.dazed) { this.grandSlam(); return true; }
    const P = Player, cx = this.x + this.w / 2, front = sgn(P.x + P.w / 2 - cx) === this.facing;
    // guard: from the front, standing, between attacks, he swats your swings away
    if (this.state === 'idle' && this.onGround && !this.hover && front && src === 'fwd' && P.comboIdx !== 3) {
      if (this.clangT <= 0) { this.clangT = 0.35; SFX.clang(); pop(cx, this.y - 16, 'BLOCKED!', { size: 24, color: '#d9b8ff', burstColor: '#4a1f5a' }); }
      if (!Zone.guardTip) { Zone.guardTip = true; toast('HE BLOCKS FROM THE FRONT · BAT HIS SERVES BACK, OR HIT HIM MID-ATTACK'); }
      this.vx = kx * 120;
      return false;
    }
    if (this.state === 'barrage') { if (this.clangT <= 0) { this.clangT = 0.4; SFX.clang(); pop(cx, this.y - 16, 'BAT THE METEORS!', { size: 22, color: '#ffd27a', burstColor: '#4a1f5a' }); } return false; }
    this.damage(this.state === 'stunned' || this.state === 'recover' ? dmg * 1.3 : dmg);
    if (this.state === 'idle' && !this.hover) this.vx = kx * 160;
    return true;
  }
  grandSlam() {
    if (this.state === 'beaten') return;
    this.state = 'beaten'; this.dazed = false; this.harmful = false; this.hp = 0; BossBar.set(0);
    Act3.slowT = 0; Act3.shatter = 1; Game.flashWhite = 1; addHitstop(0.9); addShake(26);
    SFX.bigCrack(); SFX.boom(); SFX.launch();
    pop(this.x + this.w / 2, this.y - 60, 'GRAND SLAM!!', { size: 90, life: 1.8, color: BONE, burstColor: FLAME });
    burst(this.x + this.w / 2, this.y + this.h / 2, 60, { colors: [FLAME, GOLD, BONE, '#d9b8ff'], maxSpeed: 900, grav: 400, maxLife: 1 });
    FX.length = 0; for (const b of Bolts) b.dead = true; Hazards.length = 0;
    Story.evilAdamDefeat(this);
  }
  draw() {
    if (this.gone) return;
    const cx = this.x + this.w / 2, fy = this.y + this.h;
    if (this.state === 'serveHold') { ctx.beginPath(); ctx.arc(cx + this.facing * 6, this.y - 26 - (0.4 - this.t) * 40, 8, 0, 7); inked('#2a1a3a', 2); }
    if (this.normal) drawAdam(cx, fy, this.facing, this.anim, { pose: 'kneel' });
    else drawEvilAdam(cx, fy, this.facing, this.anim, { pose: this.pose, run: this.state === 'idle' && Math.abs(this.vx) > 30, flash: this.flash > 0, aura: this.state !== 'beaten', noRacket: this.racketGone });
    if (this.state === 'stunned' || this.dazed) for (let k = 0; k < 3; k++) { const a = this.anim * 4 + k * 2.1; ctx.fillStyle = GOLD; ctx.font = `12px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillText('★', cx + Math.cos(a) * 16, this.y - 14 + Math.sin(a) * 5); }
    if (this.state === 'barrage' || this.state === 'toNet') {
      // the 7 rally pips
      for (let k = 0; k < 7; k++) { ctx.beginPath(); ctx.arc(cx - 48 + k * 16, this.y - 70, 5, 0, 7); inked(k < this.mHits ? '#ffd27a' : k < this.mHits + this.mMiss ? FLAME : '#2a1a3a', 2); }
    }
    if (this.dazed) { ctx.font = `16px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd27a'; ctx.fillText('GRAND SLAM! · ' + Bindings.label('attack', Game.lastInput), cx, this.y - 34 + Math.sin(Game.time * 6) * 3); }
    drawShout(cx, this.y - 30, this.shout);
  }
}
