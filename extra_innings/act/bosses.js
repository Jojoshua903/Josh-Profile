'use strict';
/* =========================================================
   ACT I BOSSES
   Adam (Quarry Elevator rival duel) · Daniel the Pyromaniac
   plus their projectiles. FX = non-batable effects/hazards.
   ========================================================= */
const FX = [];
function updateFX(dt) { for (let i = FX.length - 1; i >= 0; i--) { FX[i].update(dt); if (FX[i].dead) FX.splice(i, 1); } }
function drawFX() { for (const f of FX) f.draw(); }
const arenaOf = id => ROOM[id].px;
// first solid / one-way surface below a point
function landYAt(x, fromY) {
  const tx = Math.floor(x / TILE);
  for (let ty = Math.floor(fromY / TILE); ty < LH; ty++) { const t = tileAt(tx, ty); if (t === 1 || t === 3) return ty * TILE; }
  return LH * TILE;
}

/* ================= ADAM ================= */
class TennisBall {
  constructor(x, y, vx, vy) { Object.assign(this, { x, y, vx, vy, r: 8, life: 3, friendly: false, dead: false, t: 0, trail: [] }); }
  box() { return { x: this.x - 14, y: this.y - 14, w: 28, h: 28 }; }
  update(dt) {
    this.t += dt; this.life -= dt;
    this.trail.push({ x: this.x, y: this.y }); if (this.trail.length > 8) this.trail.shift();
    if (this.friendly && Zone.boss && !Zone.boss.dead) {   // parried: home in on Adam
      const b = Zone.boss, dx = b.x + b.w / 2 - this.x, dy = b.y + b.h / 2 - this.y, d = Math.hypot(dx, dy) || 1;
      this.vx = lerp(this.vx, dx / d * 1000, 1 - Math.exp(-8 * dt)); this.vy = lerp(this.vy, dy / d * 1000, 1 - Math.exp(-8 * dt));
      if (d < 30) { this.dead = true; b.parried(); return; }
    }
    this.x += this.vx * dt; this.y += this.vy * dt;
    if (this.life <= 0 || pointSolid(this.x, this.y)) { this.dead = true; burst(this.x, this.y, 8, { color: '#e8f060', maxSpeed: 220 }); return; }
    if (!this.friendly && overlap({ x: this.x - this.r, y: this.y - this.r, w: this.r * 2, h: this.r * 2 }, Player.hurtbox())) { Player.hurt(sgn(this.vx) || 1); this.dead = true; }
  }
  onBat() {
    this.friendly = true; this.life = 2; SFX.deflect(); addHitstop(0.1); addShake(7);
    pop(this.x, this.y - 18, 'RETURN!', { size: 34, color: '#e8f060', burstColor: '#3f7a2a' });
    ring(this.x, this.y, 6, 60, 0.3, '#e8f060', 5);
  }
  draw() {
    ctx.lineCap = 'round';
    for (let i = 1; i < this.trail.length; i++) { ctx.strokeStyle = `rgba(232,240,96,${i / this.trail.length * 0.8})`; ctx.lineWidth = i * 1.6; ctx.beginPath(); ctx.moveTo(this.trail[i - 1].x, this.trail[i - 1].y); ctx.lineTo(this.trail[i].x, this.trail[i].y); ctx.stroke(); }
    const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, 22); g.addColorStop(0, this.friendly ? 'rgba(255,138,42,.7)' : 'rgba(232,240,96,.6)'); g.addColorStop(1, 'rgba(232,240,96,0)');
    ctx.fillStyle = g; ctx.fillRect(this.x - 22, this.y - 22, 44, 44);
    ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, 7); inked('#e8f060', 2.5);
    ctx.strokeStyle = BONE; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(this.x - 6, this.y, 6, -0.9, 0.9); ctx.stroke();
  }
}
class WindSlash {
  constructor(x, y, dir) { Object.assign(this, { x, y, dir, life: 0.6, dead: false }); }
  update(dt) {
    this.life -= dt; if (this.life <= 0) { this.dead = true; return; }
    if (this.life < 0.5 && overlap(Player.hurtbox(), { x: this.x - 14, y: this.y - 34, w: 28, h: 34 })) Player.hurt(this.dir);
  }
  draw() {
    const a = Math.min(1, this.life / 0.3);
    ctx.save(); ctx.globalAlpha = a; ctx.translate(this.x, this.y);
    ctx.strokeStyle = '#d8f0ff'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(-this.dir * 6, -16 + k * 2, 14 + k * 5, -1.2 + this.dir * 0.3, 1.0 + this.dir * 0.3); ctx.stroke(); }
    ctx.restore();
  }
}
class Adam {
  constructor(x, y) {
    Object.assign(this, { type: 'boss', w: 24, h: 48, hp: 36, maxHp: 36, vx: 0, vy: 0, onGround: false, facing: -1, flash: 0,
      harmful: false, pogoable: true, givesHype: true, state: 'wait', t: 0, anim: 0, last: '', mark: null, slashT: 0, stun: 0, pose: 'idle', bolts: 25 });
    this.x = x - this.w / 2; this.y = y - this.h;
  }
  arena() { return arenaOf('q_elevator'); }
  begin() { this.state = 'idle'; this.t = 0.8; this.harmful = true; }
  pick() {
    const low = this.hp < this.maxHp / 2, opts = ['serve', 'dash', 'smash'].filter(a => a !== this.last || Math.random() < 0.25);
    const a = opts[(Math.random() * opts.length) | 0]; this.last = a;
    const P = Player, cx = this.x + this.w / 2;
    this.facing = sgn(P.x + P.w / 2 - cx) || this.facing;
    if (a === 'serve') { this.state = 'serveUp'; this.vy = -920; this.vx = -this.facing * 120; this.pose = 'air'; SFX.jump(); }
    if (a === 'dash') { this.state = 'dashWind'; this.t = 0.5; this.pose = 'dash'; SFX.windup(); }
    if (a === 'smash') {
      this.state = 'smashUp'; const tx = clamp(P.x + P.w / 2, this.arena().x + 60, this.arena().x + this.arena().w - 60);
      this.vy = -1050; this.vx = (tx - cx) / 0.62; this.mark = tx; this.pose = 'air'; SFX.jump();
    }
  }
  update(dt) {
    this.anim += dt; this.flash = Math.max(0, this.flash - dt); this.t -= dt;
    if (this.state === 'off') return;
    if (this.state === 'wait' || this.state === 'beaten') { this.gravity(dt); return; }
    const P = Player, cx = this.x + this.w / 2, pcx = P.x + P.w / 2, low = this.hp < this.maxHp / 2;
    switch (this.state) {
      case 'idle': {
        this.pose = 'idle'; this.facing = sgn(pcx - cx) || this.facing;
        const want = Math.abs(pcx - cx) > 260 ? 1 : Math.abs(pcx - cx) < 150 ? -1 : 0;
        this.vx = approach(this.vx, want * this.facing * 190, 1400 * dt);
        if (this.t <= 0) this.pick();
        break;
      }
      case 'serveUp':
        this.vx = approach(this.vx, 0, 400 * dt);
        if (this.vy > -40) { this.state = 'serveHold'; this.t = low ? 0.3 : 0.42; this.pose = 'serve'; SFX.windup(); }
        break;
      case 'serveHold':
        this.vy = 0; this.vx = 0;
        if (this.t <= 0) {
          const bx = cx + this.facing * 20, by = this.y + 4, dx = pcx - bx, dy = P.y + P.h / 2 - by, d = Math.hypot(dx, dy) || 1;
          Bolts.push(new TennisBall(bx, by, dx / d * (low ? 820 : 700), dy / d * (low ? 820 : 700)));
          SFX.serve(); pop(bx, by - 16, 'ACE!', { size: 26, color: '#e8f060', burstColor: '#3f7a2a' });
          this.state = 'fall'; this.pose = 'air';
        }
        break;
      case 'dashWind':
        this.vx = approach(this.vx, 0, 2000 * dt); if (Math.random() < 0.5) dust(cx, this.y + this.h, 1, -this.facing);
        if (this.t <= 0) { this.state = 'dash'; this.t = 0.75; this.dashFrom = cx; this.slashT = 0; SFX.whoosh(); }
        break;
      case 'dash':
        this.vx = this.facing * (low ? 980 : 860);
        this.slashT -= dt;
        if (this.slashT <= 0) { this.slashT = 0.06; FX.push(new WindSlash(cx, this.y + this.h, this.facing)); }
        Game.afterimages.push({ x: this.x, y: this.y, facing: this.facing, life: 0.15, max: 0.15, color: '#d8f0ff' });
        if (this.hitWall || this.t <= 0 || (sgn(cx - pcx) === this.facing && Math.abs(cx - pcx) > 280)) { this.state = 'idle'; this.t = low ? 0.55 : 0.8; this.vx = 0; }
        break;
      case 'smashUp':
        if (this.vy > -40) { this.state = 'smashHold'; this.t = 0.5; this.vx = 0; this.pose = 'smash'; SFX.slamWarn(); }
        break;
      case 'smashHold':
        this.vy = 0; this.vx = 0;
        if (this.t <= 0) { this.state = 'smashDown'; this.vy = 1500; }
        break;
      case 'smashDown':
        if (this.onGround) {
          this.state = 'idle'; this.t = low ? 0.6 : 0.9; this.mark = null;
          SFX.slam(); addShake(12); dust(cx, this.y + this.h, 14); pop(cx, this.y - 10, 'SMASH!', { size: 40 });
          const fy = this.y + this.h;
          Hazards.push({ kind: 'wave', x: cx, dir: -1, y: fy, life: 2 }, { kind: 'wave', x: cx, dir: 1, y: fy, life: 2 });
        }
        break;
      case 'fall':
        if (this.onGround) { this.state = 'idle'; this.t = low ? 0.5 : 0.75; }
        break;
      case 'stunned':
        this.vx = approach(this.vx, 0, 1500 * dt); this.pose = 'kneel';
        if (this.t <= 0) { this.state = 'idle'; this.t = 0.4; this.harmful = true; }
        break;
    }
    this.gravity(dt);
  }
  gravity(dt) {
    if (!(this.state === 'serveHold' || this.state === 'smashHold')) this.vy = Math.min(this.vy + TUNE.gravity * dt, 1500);
    moveBody(this, dt);
  }
  parried() {
    this.state = 'stunned'; this.t = 2.2; this.harmful = false; this.vx = this.facing * -200; this.vy = -300; this.mark = null;
    this.damage(6); SFX.hit(true); addShake(12); addHitstop(0.12);
    pop(this.x + this.w / 2, this.y - 20, 'STUNNED!', { size: 40, color: '#e8f060', burstColor: '#3f7a2a' });
  }
  damage(d) {
    if (this.state === 'beaten') return;
    this.hp = Math.max(0, this.hp - d); this.flash = 0.1; BossBar.set(this.hp / this.maxHp);
    if (this.hp <= 0) { this.state = 'beaten'; this.pose = 'kneel'; this.harmful = false; this.vx = 0; this.mark = null; FX.length = 0; Bolts.length = 0; Hazards.length = 0; Story.adamDefeat(this); }
  }
  takeHit(dmg, kx) {
    if (this.state === 'wait' || this.state === 'beaten') return false;
    this.damage(this.state === 'stunned' ? dmg * 1.25 : dmg);
    if (this.state === 'idle') this.vx = kx * 160;
    return true;
  }
  draw() {
    const cx = this.x + this.w / 2, fy = this.y + this.h;
    if (this.mark !== null) {
      const my = landYAt(this.mark, this.y + this.h);
      ctx.fillStyle = `rgba(232,54,28,${0.3 + 0.25 * Math.sin(Game.time * 24)})`; ctx.beginPath(); ctx.ellipse(this.mark, my, 40, 8, 0, 0, 7); ctx.fill();
    }
    if (this.state === 'serveHold') {   // ball tossed overhead
      ctx.beginPath(); ctx.arc(cx + this.facing * 6, this.y - 26 - (0.42 - this.t) * 40, 7, 0, 7); inked('#e8f060', 2);
    }
    drawAdam(cx, fy, this.facing, this.anim, { pose: this.pose, run: this.state === 'idle' && Math.abs(this.vx) > 30, flash: this.flash > 0 });
    if (this.state === 'stunned') for (let k = 0; k < 3; k++) { const a = this.anim * 4 + k * 2.1; ctx.fillStyle = GOLD; ctx.font = `12px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillText('★', cx + Math.cos(a) * 16, this.y - 14 + Math.sin(a) * 5); }
  }
}

/* ================= DANIEL ================= */
class Rocket {   // fired into the ceiling, then rains down on a telegraphed target
  constructor(x, delay) { Object.assign(this, { x, t: delay, ph: 'warn', dead: false, y: ROOM.f_core.px.y + 2 * TILE }); this.landY = landYAt(x, this.y + 4); }
  update(dt) {
    this.t -= dt;
    if (this.ph === 'warn') { if (this.t <= 0) { this.ph = 'fall'; SFX.rocket(); } return; }
    this.y += 1150 * dt;
    if (Math.random() < 0.8) spawnParticle({ x: this.x + rand(-3, 3), y: this.y - 20, vx: rand(-30, 30), vy: -rand(40, 120), life: 0.3, size: rand(2, 4), color: Math.random() < 0.5 ? GOLD : EMBER, type: 'dot' });
    if (overlap(Player.hurtbox(), { x: this.x - 8, y: this.y - 20, w: 16, h: 24 })) Player.hurt(sgn(Player.x - this.x) || 1);
    if (this.y >= this.landY) { this.dead = true; explode(this.x, this.landY - 10, 58, 0, { friendly: false, hurtsPlayer: true, small: true, word: false, colors: [FLAME, GOLD, '#ff4aa0', BONE] }); }
  }
  draw() {
    if (this.ph === 'warn') {
      const a = 0.18 + 0.18 * (Math.sin(Game.time * 26) > 0 ? 1 : 0);
      ctx.fillStyle = `rgba(232,54,28,${a * 0.5})`; ctx.fillRect(this.x - 26, this.y, 52, this.landY - this.y);
      ctx.strokeStyle = `rgba(232,54,28,${0.5 + a})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(this.x, this.landY - 3, 34, 8, 0, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(this.x - 10, this.landY - 3); ctx.lineTo(this.x + 10, this.landY - 3); ctx.moveTo(this.x, this.landY - 11); ctx.lineTo(this.x, this.landY + 5); ctx.stroke();
      return;
    }
    ctx.save(); ctx.translate(this.x, this.y);
    rr(-5, -24, 10, 22, 2); inked(FLAME, 2.5); ctx.beginPath(); ctx.moveTo(-5, -2); ctx.lineTo(0, 8); ctx.lineTo(5, -2); inked(GOLD, 2);
    ctx.restore();
  }
}
class Bomb {     // lobbed black bomb: lands, fizzes, explodes (can't be batted)
  constructor(x, y, vx, vy, fuse = 1.3) { Object.assign(this, { x, y, vx, vy, fuse, landed: false, dead: false, w: 18, h: 18, onGround: false, spin: 0 }); }
  update(dt) {
    this.spin += dt * 8;
    if (!this.landed) {
      this.vy = Math.min(this.vy + 1500 * dt, 1100);
      const bx = this.x - 9, by = this.y - 9, b = { x: bx, y: by, w: 18, h: 18, vx: this.vx, vy: this.vy };
      moveBody(b, dt); this.x = b.x + 9; this.y = b.y + 9; this.vx = b.vx; this.vy = b.vy;
      if (b.onGround) { this.landed = true; this.vx = 0; SFX.land(); }
      if (overlap(Player.hurtbox(), { x: bx, y: by, w: 18, h: 18 })) { this.fuse = 0; }
    } else this.fuse -= dt;
    if (!this.landed) this.fuse -= dt * 0.3;
    if (Math.random() < 0.5) spawnParticle({ x: this.x + 5, y: this.y - 12, vx: rand(-40, 40), vy: rand(-80, -20), life: 0.2, size: 2, color: GOLD, type: 'dot' });
    if (this.fuse <= 0) { this.dead = true; explode(this.x, this.y, 68, 0, { friendly: false, hurtsPlayer: true, small: true }); }
  }
  draw() {
    const blink = this.landed && Math.sin(this.fuse * (10 + (1.3 - this.fuse) * 20)) > 0;
    ctx.save(); ctx.translate(this.x, this.y);
    ctx.beginPath(); ctx.arc(0, 0, 9, 0, 7); inked(blink ? '#ff6a4a' : '#2b2228', 2.5);
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(-3, -3, 2.5, 0, 7); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(4, -7); ctx.quadraticCurveTo(8, -12, 6, -15); ctx.stroke();
    ctx.restore();
  }
}
class LuckyBomb {   // the glowing green one: whack it back into Daniel's cannon!
  constructor(x, y, vx, vy, roll) { Object.assign(this, { x, y, vx, vy, roll: !!roll, fuse: roll ? 4.2 : 3.4, landed: false, dead: false, friendly: false, spin: 0, homing: false }); }
  box() { return { x: this.x - 16, y: this.y - 16, w: 32, h: 32 }; }
  update(dt) {
    this.spin += dt * (this.roll ? this.vx / 9 : 8);
    if (this.homing) {
      const m = A.cannonMouth, dx = m.x - this.x, dy = m.y - this.y, d = Math.hypot(dx, dy) || 1;
      this.vx = lerp(this.vx, dx / d * 1000, 1 - Math.exp(-9 * dt)); this.vy = lerp(this.vy, dy / d * 1000, 1 - Math.exp(-9 * dt));
      this.x += this.vx * dt; this.y += this.vy * dt;
      spawnParticle({ x: this.x, y: this.y, vx: rand(-30, 30), vy: rand(-30, 30), life: 0.3, size: rand(2, 4), color: '#7dff9a', type: 'dot' });
      if (d < 36) { this.dead = true; if (Zone.boss && Zone.boss.luckyHit) Zone.boss.luckyHit(); }
      return;
    }
    const b = { x: this.x - 10, y: this.y - 10, w: 20, h: 20, vx: this.vx, vy: this.vy };
    this.vy = Math.min(this.vy + 1500 * dt, 1100); b.vy = this.vy;
    moveBody(b, dt); this.x = b.x + 10; this.y = b.y + 10; this.vy = b.vy;
    if (b.onGround) { if (!this.landed) SFX.land(); this.landed = true; if (!this.roll) this.vx = approach(this.vx, 0, 1600 * dt); }
    if (b.hitWall) this.vx = -this.vx * (this.roll ? 1 : 0.3); else this.vx = b.vx;
    this.fuse -= dt;
    if (Math.random() < 0.4) spawnParticle({ x: this.x, y: this.y - 12, vx: rand(-40, 40), vy: rand(-80, -20), life: 0.25, size: 2, color: '#7dff9a', type: 'dot' });
    if (overlap(Player.hurtbox(), b) && !this.roll) this.fuse = Math.min(this.fuse, 0.05);
    if (this.roll && overlap(Player.hurtbox(), b)) { Player.hurt(sgn(this.vx) || 1); }
    if (this.fuse <= 0) { this.dead = true; explode(this.x, this.y, 72, 0, { friendly: false, hurtsPlayer: true, small: true, colors: ['#7dff9a', GOLD, BONE] }); }
  }
  onBat() {
    this.homing = true; this.friendly = true; this.vx = (A.cannonMouth.x - this.x) > 0 ? 600 : -600; this.vy = -500;
    SFX.launch(); addHitstop(0.1); addShake(8);
    pop(this.x, this.y - 20, 'HOME RUN!', { size: 38, color: '#7dff9a', burstColor: '#1f5a3a' });
    ring(this.x, this.y, 8, 70, 0.3, '#7dff9a', 6);
  }
  draw() {
    const pulse = 0.5 + 0.5 * Math.sin(Game.time * 10);
    const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, 34); g.addColorStop(0, `rgba(125,255,154,${0.45 + pulse * 0.3})`); g.addColorStop(1, 'rgba(125,255,154,0)');
    ctx.fillStyle = g; ctx.fillRect(this.x - 34, this.y - 34, 68, 68);
    ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.spin);
    ctx.beginPath(); ctx.arc(0, 0, 11, 0, 7); inked('#3fd46a', 2.5);
    ctx.fillStyle = BONE; ctx.font = `12px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('7', 0, 1);
    ctx.restore();
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(this.x + 5, this.y - 9); ctx.quadraticCurveTo(this.x + 9, this.y - 14, this.x + 7, this.y - 17); ctx.stroke();
    if (!this.homing && !this.friendly && Math.hypot(Player.x - this.x, Player.y - this.y) < 180) {
      ctx.font = `12px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = '#7dff9a'; ctx.fillText('SWING!', this.x, this.y - 28 + Math.sin(Game.time * 8) * 2);
    }
  }
}
class Daniel {
  constructor() {
    const p = A.daniel;
    Object.assign(this, { type: 'boss', w: 34, h: 56, hp: 60, maxHp: 60, lucky: 0, flash: 0, harmful: false, pogoable: true, givesHype: true,
      state: 'wait', t: 0, anim: 0, clock: 0, step: 0, perch: { x: p.x, y: p.y }, cannonFlash: 0, bolts: 40, recoil: 0 });
    this.setPos(p.x, p.y);
  }
  setPos(fx, fy) { this.fx = fx; this.fy = fy; this.x = fx - this.w / 2; this.y = fy - this.h; }
  phase() { return this.lucky >= 2 ? 3 : (this.lucky >= 1 || this.clock > 11) ? 2 : 1; }
  begin() { this.state = 'perch'; this.t = 1.2; }
  update(dt) {
    this.anim += dt; this.flash = Math.max(0, this.flash - dt); this.cannonFlash = Math.max(0, this.cannonFlash - dt); this.recoil = Math.max(0, this.recoil - dt * 3);
    if (this.state === 'wait' || this.state === 'beaten') return;
    this.t -= dt;
    const P = Player, ar = arenaOf('f_core'), ph = this.phase();
    if (this.state === 'perch') {
      this.clock += dt;
      if (this.t <= 0) {
        const plan = ph === 1 ? ['rockets', 'bombs'] : ph === 2 ? ['rockets', 'cluster', 'bombs', 'cluster'] : ['candles', 'roll', 'rockets', 'candles', 'roll', 'cluster'];
        const a = plan[this.step++ % plan.length]; this.fire(a, ph, ar, P);
      }
    } else if (this.state === 'stunned') {
      if (this.t <= 0) { this.state = 'hop'; this.t = 0.6; this.harmful = false; SFX.jump(); }
    } else if (this.state === 'hop') {
      const k = 1 - Math.max(0, this.t) / 0.6;
      this.setPos(lerp(A.danielFloor.x, this.perch.x, k), lerp(A.danielFloor.y, this.perch.y, k) - Math.sin(k * Math.PI) * 140);
      if (this.t <= 0) { this.setPos(this.perch.x, this.perch.y); this.state = 'perch'; this.t = 0.8; }
    }
  }
  fire(a, ph, ar, P) {
    const pcx = P.x + P.w / 2, mouth = A.cannonMouth;
    const lob = (tx, fuse, lucky) => {   // throw from Daniel's hand to land near tx
      const sx = this.fx - 10, sy = this.fy - 50, T0 = 0.85, vx = (tx - sx) / T0, vy = -600;
      if (lucky) Bolts.push(new LuckyBomb(sx, sy, vx, vy)); else FX.push(new Bomb(sx, sy, vx, vy, fuse));
    };
    if (a === 'rockets') {
      const n = ph === 1 ? 3 : 4;
      for (let k = 0; k < n; k++) { const x = k === 0 ? clamp(pcx, ar.x + 50, mouth.x - 30) : rand(ar.x + 60, mouth.x - 40); FX.push(new Rocket(x, 0.9 + k * 0.18)); }
      SFX.rocket(); this.cannonFlash = 0.3; this.recoil = 1; pop(this.fx, this.fy - 80, 'FIREWORKS!', { size: 28, color: GOLD, burstColor: '#ff4aa0' });
      for (let k = 0; k < 8; k++) spawnParticle({ x: this.fx - 30, y: this.fy - 40, vx: rand(-80, 80), vy: rand(-900, -600), life: 0.5, size: 3, color: [FLAME, GOLD, '#ff4aa0', '#6fd3ff'][k % 4], type: 'spark' });
      this.t = ph === 3 ? 1.3 : 2.1;
    } else if (a === 'bombs') {
      lob(clamp(pcx + rand(-40, 40), ar.x + 50, mouth.x - 60), 1.3); lob(clamp(pcx + rand(-200, 200), ar.x + 50, mouth.x - 60), 1.5);
      SFX.whoosh(); this.t = 1.8;
    } else if (a === 'cluster') {
      const luckyAt = (Math.random() * 5) | 0;
      for (let k = 0; k < 5; k++) lob(clamp(pcx + (k - 2) * 90 + rand(-20, 20), ar.x + 50, mouth.x - 60), 1.6 + k * 0.15, k === luckyAt);
      SFX.whoosh(); pop(this.fx, this.fy - 80, 'LUCKY DIP!', { size: 30, color: '#7dff9a', burstColor: '#1f5a3a' });
      this.t = ph === 3 ? 2.4 : 3.2;
    } else if (a === 'candles') {
      const sx = mouth.x, sy = mouth.y, base = Math.atan2(P.y + P.h / 2 - sy, pcx - sx);
      for (let k = -2; k <= 2; k++) { const an = base + k * 0.16, b = new Bolt(sx, sy, Math.cos(an) * 420, Math.sin(an) * 420); b.red = true; Bolts.push(b); }
      this.cannonFlash = 0.25; this.recoil = 1; SFX.firework(); SFX.shoot();
      this.t = 1.0;
    } else if (a === 'roll') {
      const fy = landYAt(mouth.x - 60, mouth.y);
      Bolts.push(new LuckyBomb(ar.x + ar.w - 12 * TILE, fy - 12, -260, 0, true));
      if (Math.random() < 0.6) FX.push(new Bomb(this.fx - 10, this.fy - 50, (pcx - this.fx) / 0.9, -600, 1.2));
      SFX.whoosh(); this.t = 1.8;
    }
  }
  luckyHit() {
    this.lucky++; this.cannonFlash = 1; addShake(16); addHitstop(0.15); SFX.boom(); SFX.confetti();
    explode(A.cannonMouth.x, A.cannonMouth.y, 50, 0, { friendly: false, word: 'BACKFIRE!', colors: ['#7dff9a', GOLD, '#ff4aa0', '#6fd3ff'] });
    FX.length = 0; for (const b of Bolts) b.dead = true;
    this.hp = Math.max(0, this.hp - 8); BossBar.set(this.hp / this.maxHp); BossBar.flash();
    if (this.lucky >= 3) { this.state = 'beaten'; this.hp = 0; BossBar.set(0); Story.danielFinale(this); return; }
    // knocked off the cannon, dizzy on the floor: combo time!
    this.state = 'stunned'; this.t = 4.6; this.harmful = false; this.setPos(A.danielFloor.x, A.danielFloor.y);
    pop(this.fx, this.fy - 80, this.lucky === 2 ? 'GRAND FINALE TIME!' : 'DIZZY!', { size: 34 });
    if (this.lucky === 2) toast('PHASE 3 · THE GRAND FINALE');
  }
  takeHit(dmg) {
    if (this.state !== 'stunned') {
      if (this.state === 'perch') { SFX.clang(); pop(this.fx, this.fy - 70, 'ARMORED!', { size: 22, color: BONE, burstColor: '#3a3340' }); }
      return false;
    }
    const floor = this.maxHp - 20 * this.lucky;
    this.hp = Math.max(floor, this.hp - dmg); this.flash = 0.1; BossBar.set(this.hp / this.maxHp);
    return true;
  }
  draw() {
    // the armored firework cannon on its platform
    const mx = A.cannonMouth.x, my = A.cannonMouth.y, rc = this.recoil * 6;
    if (this.cannonGone) { if (!this.gone) drawDaniel(this.fx, this.fy, -1, this.anim, { soot: true, rocket: false }); return; }
    ctx.save(); ctx.translate(rc, 0); ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(mx - 10, my - 22); ctx.lineTo(mx + 120, my - 30); ctx.lineTo(mx + 120, my + 30); ctx.lineTo(mx - 10, my + 22); ctx.closePath();
    inked(this.cannonFlash > 0 && Math.sin(Game.time * 40) > 0 ? '#ffffff' : '#4a3d5c', 4);
    for (let k = 0; k < 4; k++) { ctx.fillStyle = k % 2 ? '#b8283c' : GOLD; ctx.fillRect(mx + 14 + k * 24, my - 26, 10, 52); }
    ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(mx + 14, my - 26, 82, 52);
    ctx.beginPath(); ctx.ellipse(mx - 10, my, 10, 22, 0, 0, 7); inked('#1a1420', 3);
    if (this.lucky > 0) { ctx.strokeStyle = 'rgba(13,11,16,.8)'; ctx.lineWidth = 2; for (let k = 0; k < this.lucky * 2; k++) { ctx.beginPath(); ctx.moveTo(mx + 20 + k * 14, my - 24); ctx.lineTo(mx + 26 + k * 14, my - 6); ctx.lineTo(mx + 18 + k * 14, my + 10); ctx.stroke(); } }
    for (const wx of [mx + 30, mx + 90]) { ctx.beginPath(); ctx.arc(wx, my + 34, 13, 0, 7); inked('#2b2733', 3); }
    ctx.font = `14px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = BONE; ctx.fillText('BIG BERTHA', mx + 56, my - 38);
    ctx.restore();
    if (this.state === 'beaten' && this.gone) return;
    const stunned = this.state === 'stunned';
    drawDaniel(this.fx, this.fy, -1, this.anim, { dizzy: stunned, soot: this.lucky > 0 || this.state === 'beaten', rocket: !stunned });
    if (this.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(this.x, this.y, this.w, this.h); }
  }
}

/* background fireworks (Foundry; non-stop during the Grand Finale) */
const Sky = { bursts: [], t: 0 };
function updateSky(dt, rate) {
  Sky.t -= dt;
  if (Sky.t <= 0) {
    Sky.t = rate * rand(0.6, 1.4);
    Sky.bursts.push({ x: rand(0.05, 0.95), y: rand(0.08, 0.5), t: 0, c: ['255,74,160', '111,211,255', '242,193,78', '125,255,154', '232,54,28'][(Math.random() * 5) | 0], n: 14 + ((Math.random() * 10) | 0) });
    if (rate < 0.6 && Math.random() < 0.3) SFX.firework();
  }
  for (let i = Sky.bursts.length - 1; i >= 0; i--) { Sky.bursts[i].t += dt; if (Sky.bursts[i].t > 1.6) Sky.bursts.splice(i, 1); }
}
function drawSky() {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const b of Sky.bursts) {
    const k = Math.min(1, b.t / 0.5), r = 30 + k * 90, a = Math.max(0, 1 - b.t / 1.6);
    for (let i = 0; i < b.n; i++) {
      const an = i / b.n * Math.PI * 2, x = b.x * VW + Math.cos(an) * r, y = b.y * VH + Math.sin(an) * r + b.t * b.t * 30;
      ctx.fillStyle = `rgba(${b.c},${a})`; ctx.beginPath(); ctx.arc(x, y, 2.5, 0, 7); ctx.fill();
    }
    if (b.t < 0.15) { ctx.fillStyle = `rgba(${b.c},${0.25 * (1 - b.t / 0.15)})`; ctx.fillRect(0, 0, VW, VH); }
  }
  ctx.restore();
}
