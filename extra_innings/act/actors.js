'use strict';
/* =========================================================
   ACT I ACTORS: new enemies + world gadgets
   Magma Tick · Drill Mole · Crystal Hopper ·
   minecarts, updrafts, turbine fans, conveyors, fuse crates
   ========================================================= */

/* ---------- Magma Tick: crawls along walls & ceilings, pops 1s after dying ---------- */
const SURF = { down: [0, 1, 0], up: [0, -1, Math.PI], left: [-1, 0, Math.PI / 2], right: [1, 0, -Math.PI / 2] };
class MagmaTick {
  constructor(tx, ty, surf) {
    const [nx, ny] = SURF[surf];
    Object.assign(this, { type: 'tick', w: 24, h: 24, surf, nx, ny, dir: Math.random() < 0.5 ? -1 : 1, hp: 2, maxHp: 2, flash: 0,
      harmful: true, pogoable: true, givesHype: true, anim: rand(0, 6), fuse: 0, bolts: 3 });
    this.cx = tx * TILE + 16 + nx * 4; this.cy = ty * TILE + 16 + ny * 4;
    this.sync();
  }
  sync() { this.x = this.cx - 12; this.y = this.cy - 12; }
  update(dt) {
    this.flash = Math.max(0, this.flash - dt); this.anim += dt * 8;
    if (this.fuse > 0) {
      this.fuse -= dt;
      if (Math.random() < 0.5) spawnParticle({ x: this.cx + rand(-8, 8), y: this.cy + rand(-8, 8), vx: rand(-40, 40), vy: rand(-90, -20), life: 0.3, size: rand(2, 4), color: Math.random() < 0.5 ? FLAME : GOLD, type: 'dot' });
      if (Math.floor(this.fuse * 10) !== Math.floor((this.fuse + dt) * 10)) SFX.tick();
      if (this.fuse <= 0) { explode(this.cx, this.cy, 62, 0, { friendly: false, hurtsPlayer: true, small: true, word: 'FWOOSH!', colors: [FLAME, EMBER, GOLD] }); enemyDie(this); }
      return;
    }
    // crawl along the surface, turning back at edges and walls
    const tx = this.nx === 0 ? this.dir : 0, ty = this.nx === 0 ? 0 : this.dir;
    const sp = 55 * dt, ax = this.cx + tx * 14, ay = this.cy + ty * 14;
    const blocked = pointSolid(ax, ay), backed = pointSolid(ax + this.nx * 18, ay + this.ny * 18);
    if (blocked || !backed) this.dir *= -1;
    else { this.cx += tx * sp; this.cy += ty * sp; }
    this.sync();
  }
  takeHit(dmg) {
    if (this.fuse > 0) return false;
    this.hp -= dmg; this.flash = 0.12;
    if (this.hp <= 0) { this.fuse = 1; this.harmful = false; this.untargetable = true; SFX.fuse(); pop(this.cx, this.cy - 20, 'TSSS…', { size: 22, burst: false, color: EMBER }); }
    return true;
  }
  draw() {
    const a = SURF[this.surf][2], hot = this.fuse > 0 ? (Math.sin(this.fuse * 40) > 0 ? '#ffffff' : '#ffd27a') : this.flash > 0 ? '#ffffff' : '#e8541c';
    ctx.save(); ctx.translate(this.cx, this.cy); ctx.rotate(a); ctx.scale(this.dir, 1);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 30); g.addColorStop(0, 'rgba(255,110,30,.35)'); g.addColorStop(1, 'rgba(255,110,30,0)');
    ctx.fillStyle = g; ctx.fillRect(-30, -30, 60, 60);
    ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) { const lx = -7 + i * 7, lift = Math.max(0, Math.sin(this.anim + i * 2)) * 3; ctx.beginPath(); ctx.moveTo(lx, 2); ctx.lineTo(lx - 3, 8 - lift); ctx.lineTo(lx + 1, 12 - lift); ctx.stroke(); }
    ctx.beginPath(); ctx.ellipse(0, 0, 13, 9, 0, Math.PI, 0); ctx.lineTo(13, 4); ctx.lineTo(-13, 4); ctx.closePath(); inked(hot, 2.5);
    ctx.fillStyle = '#5a1a0a'; for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.arc(k * 6, -4, 2.2, 0, 7); ctx.fill(); }
    ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(10, 0, 2.4, 0, 7); ctx.fill();
    ctx.restore();
  }
}

/* ---------- Drill Mole: tunnels under you, shakes the dirt, then lunges up ---------- */
class DrillMole {
  constructor(x0, x1, row) {
    Object.assign(this, { type: 'mole', w: 30, h: 40, x0: x0 * TILE + 16, x1: x1 * TILE + 16, floorY: row * TILE, mx: (x0 + x1) / 2 * TILE, hp: 4, maxHp: 4, flash: 0,
      state: 'under', t: 1, rise: 0, harmful: false, pogoable: true, givesHype: true, untargetable: true, bolts: 5, anim: 0 });
    this.sync();
  }
  sync() { this.x = this.mx - 15; this.y = this.floorY - 40 * this.rise; }
  update(dt) {
    const P = Player; this.t -= dt; this.anim += dt; this.flash = Math.max(0, this.flash - dt);
    const pcx = P.x + P.w / 2, sameFloor = Math.abs(P.y + P.h - this.floorY) < 40 && pcx > this.x0 - 60 && pcx < this.x1 + 60;
    switch (this.state) {
      case 'under':
        if (sameFloor && !P.dead) this.mx = approach(this.mx, clamp(pcx, this.x0, this.x1), 190 * dt);
        if (Math.random() < 0.08) dust(this.mx, this.floorY, 1);
        if (this.t <= 0 && sameFloor && Math.abs(this.mx - pcx) < 20) { this.state = 'warn'; this.t = 0.75; SFX.dirt(); }
        break;
      case 'warn':
        if (Math.random() < 0.7) spawnParticle({ x: this.mx + rand(-16, 16), y: this.floorY - 2, vx: rand(-60, 60), vy: rand(-220, -80), life: 0.4, size: rand(3, 6), color: '#7a5232', grav: 900, type: 'debris', rot: rand(0, 6), vr: rand(-10, 10) });
        addShake(1.5);
        if (this.t <= 0) { this.state = 'pop'; this.t = 0.16; this.harmful = true; this.untargetable = false; SFX.dirt(); SFX.whoosh(); }
        break;
      case 'pop':
        this.rise = Math.min(1.3, this.rise + dt * 9);
        if (this.t <= 0) { this.state = 'out'; this.t = 1.2; this.rise = 1; pop(this.mx, this.floorY - 60, 'BRRZZT!', { size: 24 }); }
        break;
      case 'out':
        if (this.t <= 0) { this.state = 'dig'; this.t = 0.35; this.harmful = false; }
        break;
      case 'dig':
        this.rise = Math.max(0, this.rise - dt * 3.2); if (Math.random() < 0.5) dust(this.mx, this.floorY, 1);
        if (this.rise <= 0) { this.state = 'under'; this.t = 1.3; this.untargetable = true; }
        break;
    }
    this.sync();
  }
  takeHit(dmg) {
    if (this.untargetable) return false;
    this.hp -= dmg; this.flash = 0.12;
    if (this.state === 'out' || this.state === 'pop') { this.state = 'dig'; this.t = 0.35; this.harmful = false; }
    if (this.hp <= 0) enemyDie(this);
    return true;
  }
  draw() {
    if (this.rise <= 0.02) { // dirt mound sliding along
      ctx.fillStyle = '#4a2c1a'; ctx.beginPath(); ctx.ellipse(this.mx, this.floorY + 1, 16, 5 + (this.state === 'warn' ? 3 : 0), 0, Math.PI, 0); ctx.fill();
      return;
    }
    ctx.save(); ctx.beginPath(); ctx.rect(this.mx - 40, this.floorY - 90, 80, 90); ctx.clip();
    ctx.translate(this.mx, this.floorY - 40 * this.rise + 40);
    const spin = this.anim * 30;
    ctx.beginPath(); ctx.moveTo(-9, -40); ctx.lineTo(0, -62); ctx.lineTo(9, -40); ctx.closePath(); inked('#9aa3ad', 2.5);    // drill nose
    ctx.strokeStyle = INK; ctx.lineWidth = 1.5; for (let k = 0; k < 3; k++) { const o = ((spin + k * 7) % 21) - 10; ctx.beginPath(); ctx.moveTo(-7 + o * 0.2, -44 - k * 5); ctx.lineTo(7 + o * 0.2, -46 - k * 5); ctx.stroke(); }
    ctx.beginPath(); ctx.ellipse(0, -18, 15, 24, 0, 0, 7); inked(this.flash > 0 ? '#ffffff' : '#6b4a3a', 3);
    ctx.fillStyle = '#e8c3a0'; ctx.beginPath(); ctx.ellipse(0, -10, 9, 13, 0, 0, 7); ctx.fill();
    rr(-12, -34, 24, 8, 3); inked('#3a3340', 2); ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.arc(-5, -30, 2.6, 0, 7); ctx.arc(5, -30, 2.6, 0, 7); ctx.fill();
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * 15, -18, 6, 4, s * 0.5, 0, 7); inked('#e8c3a0', 2); }
    ctx.restore();
  }
}

/* ---------- Crystal Hopper: high arcing hops, rains shards from above ---------- */
class CrystalHopper {
  constructor(x, y) {
    Object.assign(this, { type: 'hopper', w: 28, h: 26, vx: 0, vy: 0, hp: 3, maxHp: 3, flash: 0, state: 'idle', t: rand(0.6, 1.4), onGround: false,
      harmful: true, pogoable: true, givesHype: true, home: x, fired: false, bolts: 5, sq: 1, facing: -1 });
    this.x = x - this.w / 2; this.y = y - this.h;
  }
  update(dt) {
    const P = Player; this.t -= dt; this.flash = Math.max(0, this.flash - dt); this.sq = lerp(this.sq, 1, 1 - Math.exp(-10 * dt));
    const cx = this.x + this.w / 2, pcx = P.x + P.w / 2, near = Math.abs(pcx - cx) < 420 && Math.abs(P.y - this.y) < 300;
    if (this.state === 'idle') {
      this.vx = approach(this.vx, 0, 2000 * dt);
      if (this.t < 0.25) this.sq = 0.75;
      if (this.t <= 0 && near && this.onGround) {
        const tgt = clamp(pcx + rand(-60, 60), this.home - 6 * TILE, this.home + 6 * TILE);
        this.vx = clamp((tgt - cx) * 1.1, -260, 260); this.vy = -880; this.state = 'air'; this.fired = false; this.sq = 1.3;
        this.facing = sgn(this.vx) || this.facing; SFX.jump();
      }
    } else {
      if (!this.fired && this.vy > -60) {
        this.fired = true; SFX.crystal();
        for (const sx of [-130, 0, 130]) { const b = new Bolt(cx, this.y + this.h, sx, 380); b.crystal = true; Bolts.push(b); }
        burst(cx, this.y + this.h, 8, { color: '#bff3ff', maxSpeed: 200 });
      }
      if (this.onGround && this.vy >= 0) { this.state = 'idle'; this.t = 1.1; this.sq = 0.7; dust(cx, this.y + this.h, 4); }
    }
    this.vy = Math.min(this.vy + TUNE.gravity * 0.85 * dt, 900);
    moveBody(this, dt);
  }
  takeHit(dmg, kx, ky) {
    this.hp -= dmg; this.flash = 0.12; this.vx = kx * 200; if (ky < 0) this.vy = Math.min(this.vy, -200);
    if (this.hp <= 0) { enemyDie(this); burst(this.x + 14, this.y + 13, 16, { colors: ['#bff3ff', '#8fe3ff', BONE], maxSpeed: 420 }); SFX.crystal(); }
    return true;
  }
  draw() {
    const cx = this.x + this.w / 2, by = this.y + this.h;
    ctx.save(); ctx.translate(cx, by); ctx.scale(this.facing * (2 - this.sq), this.sq); ctx.lineJoin = 'round';
    ctx.strokeStyle = INK; ctx.lineWidth = 3;
    const air = this.state === 'air';
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 8, -8); ctx.lineTo(s * 15, air ? 0 : -4); ctx.lineTo(s * 12, air ? 6 : 0); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(-14, -6); ctx.lineTo(-10, -20); ctx.lineTo(-2, -28); ctx.lineTo(8, -22); ctx.lineTo(14, -8); ctx.lineTo(4, -2); ctx.lineTo(-8, -2); ctx.closePath();
    inked(this.flash > 0 ? '#ffffff' : '#7fd8f0', 2.5);
    ctx.strokeStyle = 'rgba(13,11,16,.55)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-10, -20); ctx.lineTo(0, -12); ctx.lineTo(8, -22); ctx.moveTo(0, -12); ctx.lineTo(-2, -28); ctx.stroke();
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(7, -14, 2.4, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillRect(-6, -22, 3, 3);
    ctx.restore();
  }
}

function makeActEnemy(s) {
  switch (s.k) {
    case 'tick': return new MagmaTick(s.tx, s.ty, s.surf);
    case 'mole': return new DrillMole(s.x0, s.x1, s.row);
    case 'hopper': return new CrystalHopper(s.x, s.y);
    case 'scuttler': return new Scuttler(s.x, s.y);
    case 'drone': return new StrayDrone(s.x, s.y);
    case 'bumper': return new BumperBot(s.x, s.y);
    case 'crate': return Save.data.crates[s.id] ? null : new Crate(s.x, s.y, s.id, s.bolts);
  }
  return null;
}

/* =========================================================
   GADGETS
   ========================================================= */
// carry the player on a moving top surface (minecarts, the elevator car)
function rideSurface(top, x, w, dx) {
  const P = Player;
  if (P.dead || P.hazard || P.vy < 0) return false;
  if (P.x + P.w <= x + 2 || P.x >= x + w - 2) return false;
  const feet = P.y + P.h;
  if (P.prevBottom <= top + 6 && feet >= top - 1 && feet <= top + 26) {
    P.y = top - P.h; P.vy = 0;
    if (dx) { const nx = P.x + dx; if (!pointSolid(dx > 0 ? nx + P.w : nx, P.y + 6) && !pointSolid(dx > 0 ? nx + P.w : nx, P.y + P.h - 6)) P.x = nx; }
    if (!P.onGround) { P.landed = true; P.sx = 1.2; P.sy = 0.82; SFX.land(); }
    P.onGround = true; P.coyoteT = TUNE.coyote; P.canDouble = true; P.canDash = true; P.launched = false; P.balls = TUNE.ballCount; P.pogoChain = 0;
    return true;
  }
  return false;
}

class Cart {
  constructor(s) { Object.assign(this, { x: s.x0, x0: s.x0, x1: s.x1, y: s.y, w: 3 * TILE, dir: 1, wait: s.phase || 0.6, speed: 135, dx: 0, wob: 0 }); }
  update(dt) {
    this.dx = 0;
    if (this.wait > 0) { this.wait -= dt; } else {
      const nx = clamp(this.x + this.dir * this.speed * dt, this.x0, this.x1);
      this.dx = nx - this.x; this.x = nx;
      if (this.x === this.x0 || this.x === this.x1) { this.dir *= -1; this.wait = 1.0; SFX.clang(); }
      if (Math.random() < 0.3) spawnParticle({ x: this.x + (this.dir > 0 ? 10 : this.w - 10), y: this.y + 30, vx: -this.dir * rand(40, 120), vy: rand(-80, -20), life: 0.25, size: 2, color: GOLD, type: 'spark' });
    }
    this.wob += dt * (this.dx ? 20 : 2);
    this.riding = rideSurface(this.y, this.x, this.w, this.dx);
  }
  draw() {
    const x = this.x, y = this.y, w = this.w;
    ctx.save(); ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x + 2, y); ctx.lineTo(x + w - 2, y); ctx.lineTo(x + w - 10, y + 28); ctx.lineTo(x + 10, y + 28); ctx.closePath(); inked('#5a3a24', 3);
    ctx.fillStyle = '#7a5232'; ctx.fillRect(x + 6, y + 6, w - 12, 4); ctx.fillStyle = '#3a2616'; for (let k = 1; k < 4; k++) ctx.fillRect(x + k * w / 4 - 2, y + 4, 3, 22);
    ctx.fillStyle = GOLD; ctx.fillRect(x, y - 3, w, 4); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(x, y - 3, w, 4);
    for (const wx of [x + 18, x + w - 18]) { ctx.beginPath(); ctx.arc(wx, y + 30, 7, 0, 7); inked('#2b2733', 2.5); ctx.strokeStyle = '#9aa3ad'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(wx, y + 30); ctx.lineTo(wx + Math.cos(this.wob) * 5, y + 30 + Math.sin(this.wob) * 5); ctx.stroke(); }
    ctx.restore();
  }
}
// rails the carts run on
function drawRails(c) {
  ctx.fillStyle = '#3a2616'; for (let x = c.x0; x < c.x1 + c.w; x += 22) ctx.fillRect(x, c.y + 36, 6, 6);
  ctx.fillStyle = '#9aa3ad'; ctx.fillRect(c.x0 - 6, c.y + 36, c.x1 + c.w - c.x0 + 12, 3);
  ctx.fillStyle = INK; ctx.fillRect(c.x0 - 6, c.y + 39, c.x1 + c.w - c.x0 + 12, 1.5);
}

// glowing lava over the hazard tiles
function drawLava(r) {
  const t = Game.time;
  ctx.save();
  const g = ctx.createLinearGradient(0, r.y - 60, 0, r.y + r.h);
  g.addColorStop(0, 'rgba(255,110,30,0)'); g.addColorStop(1, 'rgba(255,110,30,.35)');
  ctx.fillStyle = g; ctx.fillRect(r.x, r.y - 60, r.w, 60);
  ctx.beginPath(); ctx.moveTo(r.x, r.y + r.h + 6);
  for (let x = r.x; x <= r.x + r.w; x += 16) ctx.lineTo(x, r.y + 6 + Math.sin(t * 3 + x * 0.05) * 3);
  ctx.lineTo(r.x + r.w, r.y + r.h + 6); ctx.closePath();
  const lg = ctx.createLinearGradient(0, r.y, 0, r.y + r.h); lg.addColorStop(0, '#ffd27a'); lg.addColorStop(0.4, '#ff6a1a'); lg.addColorStop(1, '#a8200a');
  ctx.fillStyle = lg; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
  for (let k = 0; k < r.w / 90; k++) { const bx = r.x + ((k * 97 + t * 30) % r.w), by = r.y + 10 + Math.sin(t * 4 + k) * 3; ctx.fillStyle = 'rgba(255,240,180,.8)'; ctx.beginPath(); ctx.arc(bx, by, 2 + (k % 3), 0, 7); ctx.fill(); }
  if (Math.random() < r.w / 3000) spawnParticle({ x: r.x + rand(0, r.w), y: r.y + 4, vx: rand(-20, 20), vy: rand(-220, -90), life: rand(0.5, 0.9), size: rand(2, 3.5), color: Math.random() < 0.5 ? EMBER : GOLD, grav: 300, type: 'dot' });
  ctx.restore();
}

// updraft: lifts Nathan while he's inside it
function applyUpdraft(u, dt) {
  const P = Player;
  if (P.dead || P.hazard || P.dashT > 0 || !overlap(P, u)) return false;
  P.vy = Math.max(P.vy - 4300 * dt, u.cap || -520);
  if (P.vy < 0) { P.jumping = false; P.canDash = true; }
  return true;
}
function drawUpdraft(u) {
  const t = Game.time;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(0, u.y + u.h, 0, u.y); g.addColorStop(0, 'rgba(170,220,255,.12)'); g.addColorStop(1, 'rgba(170,220,255,0)');
  ctx.fillStyle = g; ctx.fillRect(u.x, u.y, u.w, u.h);
  ctx.strokeStyle = 'rgba(210,240,255,.35)'; ctx.lineWidth = 2;
  const n = Math.max(3, Math.round(u.w / 28)), len = 46;
  for (let k = 0; k < n * 3; k++) {
    const x = u.x + ((k * 37) % u.w) + Math.sin(t * 2 + k) * 4, y = u.y + u.h - ((t * 520 + k * 113) % (u.h + len));
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + len * (0.4 + (k % 3) * 0.3)); ctx.stroke();
  }
  ctx.restore();
}

// spinning turbine fan blades (a hazard that hurts, not a respawn)
class Fan {
  constructor(f) { Object.assign(this, { kind: 'fan', bx: f.tx * TILE, by: f.ty * TILE, r: f.r, dx: (f.dx || 0) * TILE, dy: (f.dy || 0) * TILE, sp: f.sp || 1, ph: f.ph || 0, rot: rand(0, 6) }); this.x = this.bx; this.y = this.by; }
  update(dt) {
    this.ph += dt * this.sp; this.rot += dt * 9;
    this.x = this.bx + Math.sin(this.ph) * this.dx; this.y = this.by + Math.sin(this.ph) * this.dy;
    const P = Player; if (P.dead || P.hazard) return;
    const c = P.center(), d = Math.hypot(c.x - this.x, c.y - this.y);
    if (d < this.r + 6) {
      let a = Math.atan2(c.y - this.y, c.x - this.x) - this.rot, best = 9;
      for (let k = 0; k < 3; k++) { let da = ((a - k * Math.PI * 2 / 3) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI; best = Math.min(best, Math.abs(da)); }
      if (d < 18 || best * d < 22) P.hurt(sgn(c.x - this.x) || 1);
    }
  }
  draw() {
    const { x, y, r } = this;
    ctx.save(); ctx.translate(x, y);
    ctx.beginPath(); ctx.arc(0, 0, r + 6, 0, 7); ctx.lineWidth = 6; ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = 3; ctx.strokeStyle = '#6b7a86'; ctx.stroke();
    ctx.fillStyle = 'rgba(200,230,255,.06)'; ctx.fill();
    ctx.rotate(this.rot);
    for (let k = 0; k < 3; k++) {
      ctx.rotate(Math.PI * 2 / 3);
      ctx.beginPath(); ctx.moveTo(6, -5); ctx.quadraticCurveTo(r * 0.6, -18, r, -6); ctx.lineTo(r, 6); ctx.quadraticCurveTo(r * 0.5, 8, 6, 5); ctx.closePath(); inked('#c9d4dc', 2.5);
      ctx.fillStyle = FLAME; ctx.fillRect(r - 8, -5, 6, 10);
    }
    ctx.beginPath(); ctx.arc(0, 0, 9, 0, 7); inked('#3a3340', 2.5);
    ctx.restore();
    // motion blur ring
    ctx.strokeStyle = 'rgba(220,240,255,.18)'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(x, y, r * 0.7, 0, 7); ctx.stroke();
  }
}

// conveyor belts push anything standing on them
function applyConveyor(c, dt) {
  const P = Player;
  if (!P.onGround || P.dead || Math.abs(P.y + P.h - c.y) > 2 || P.x + P.w < c.x0 || P.x > c.x1) return;
  const nx = P.x + c.dir * 140 * dt, edge = c.dir > 0 ? nx + P.w : nx;
  if (!pointSolid(edge, P.y + 6) && !pointSolid(edge, P.y + P.h - 6)) P.x = nx;
}
function drawConveyor(c) {
  const t = Game.time, y = c.y;
  ctx.save();
  rr(c.x0, y - 10, c.x1 - c.x0, 12, 5); inked('#2b2733', 2.5);
  ctx.fillStyle = GOLD;
  for (let x = c.x0 + ((t * 140 * c.dir) % 24 + 24) % 24; x < c.x1 - 6; x += 24) { ctx.beginPath(); ctx.moveTo(x, y - 7); ctx.lineTo(x + 6 * c.dir, y - 4); ctx.lineTo(x, y - 1); ctx.fill(); }
  for (let x = c.x0 + 6; x < c.x1; x += 36) { ctx.beginPath(); ctx.arc(x, y - 4, 3, 0, 7); ctx.fillStyle = '#6b6f7a'; ctx.fill(); }
  ctx.restore();
}

// fuse crates: ignite when stood on, explode after 2s, come back 4s later
function updateFuse(f, dt, room) {
  if (f.room !== room) return;
  const P = Player, x = f.tx * TILE, y = f.ty * TILE, w = f.w * TILE;
  if (f.state === 'idle') {
    if (P.onGround && !P.dead && Math.abs(P.y + P.h - y) < 2 && P.x + P.w > x && P.x < x + w) { f.state = 'lit'; f.t = 2; SFX.fuse(); }
  } else if (f.state === 'lit') {
    f.t -= dt;
    if (Math.floor(f.t * 4) !== Math.floor((f.t + dt) * 4)) SFX.tick();
    if (f.t <= 0) {
      fill(f.tx, f.ty, f.w, 1, 0); f.state = 'gone'; f.t = 4;
      explode(x + w / 2, y + 16, 70, 2, { friendly: false, hurtsPlayer: true, small: true, word: 'BOOM!' });
      burst(x + w / 2, y + 16, 14, { colors: ['#8a5a3a', '#c9a36b'], maxSpeed: 420, grav: 1300, type: 'debris' });
    }
  } else if (f.state === 'gone') {
    f.t -= dt;
    if (f.t <= 0 && !overlap(P, { x, y: y - 4, w, h: TILE + 4 })) { fill(f.tx, f.ty, f.w, 1, 1); f.state = 'idle'; ring(x + w / 2, y + 16, 6, 40, 0.3, BONE, 3); }
  }
}
function drawFuse(f) {
  if (f.state === 'gone') {
    if (f.t < 1) { ctx.strokeStyle = `rgba(243,234,216,${(1 - f.t) * 0.6})`; ctx.setLineDash([4, 4]); ctx.lineWidth = 2; ctx.strokeRect(f.tx * TILE + 2, f.ty * TILE + 2, f.w * TILE - 4, TILE - 4); ctx.setLineDash([]); }
    return;
  }
  const x = f.tx * TILE, y = f.ty * TILE, w = f.w * TILE, lit = f.state === 'lit';
  const shake = lit ? rand(-1.5, 1.5) * (1 - f.t / 2 + 0.3) : 0;
  ctx.save(); ctx.translate(shake, 0);
  rr(x + 1, y + 1, w - 2, TILE - 2, 2); inked(lit && Math.sin(f.t * (12 + (2 - f.t) * 14)) > 0 ? '#ffb070' : '#a8452a', 3);
  ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 4, y + 4); ctx.lineTo(x + w - 4, y + TILE - 4); ctx.moveTo(x + w - 4, y + 4); ctx.lineTo(x + 4, y + TILE - 4); ctx.stroke();
  ctx.font = `11px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = GOLD; ctx.fillText('TNT', x + w / 2, y + 16);
  // fuse wick
  ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + w / 2, y + 1); ctx.quadraticCurveTo(x + w / 2 + 6, y - 6, x + w / 2 + 2, y - 10); ctx.stroke();
  if (lit) { ctx.fillStyle = Math.random() < 0.5 ? GOLD : '#ffffff'; ctx.beginPath(); ctx.arc(x + w / 2 + 2, y - 10, 3, 0, 7); ctx.fill(); if (Math.random() < 0.6) spawnParticle({ x: x + w / 2 + 2, y: y - 10, vx: rand(-60, 60), vy: rand(-90, -20), life: 0.25, size: 2, color: GOLD, type: 'dot' }); }
  ctx.restore();
}

// the waterfall of sparks Reshman hides behind
function drawSparkFall(s) {
  const t = Game.time;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(s.x - 50, 0, s.x + 50, 0); g.addColorStop(0, 'rgba(255,170,60,0)'); g.addColorStop(0.5, 'rgba(255,170,60,.25)'); g.addColorStop(1, 'rgba(255,170,60,0)');
  ctx.fillStyle = g; ctx.fillRect(s.x - 50, s.y0, 100, s.y1 - s.y0);
  for (let k = 0; k < 70; k++) {
    const x = s.x + Math.sin(k * 12.9) * 38, y = s.y0 + ((t * 420 + k * 61) % (s.y1 - s.y0));
    ctx.fillStyle = k % 3 ? 'rgba(255,210,120,.85)' : 'rgba(255,120,40,.9)'; ctx.fillRect(x, y, 2, 9);
  }
  ctx.restore();
  if (Math.random() < 0.4) spawnParticle({ x: s.x + rand(-40, 40), y: s.y1 - 2, vx: rand(-120, 120), vy: rand(-200, -60), life: 0.4, size: 2, color: GOLD, grav: 800, type: 'spark' });
}
