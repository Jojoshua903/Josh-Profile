/* =========================================================
   THE OVERTIME ABYSS · a secret 4-room precision gauntlet far
   below the Gilded Stadium. Geometry lives in act3/world.js;
   this file adds the breach in the Grand Locker Room, every
   hazard, the Hype Fountains, the instant room-restart, the
   memory finale, the Chalk-Dusted Aura, and Bunt God.
   Needs all five movement upgrades. No benches down here.
   ========================================================= */
const AB_ON = typeof ROOM !== 'undefined' && !!ROOM.a_canyon;
const AB = { room: null, objs: [], t: 0, safeT: 0, resetPending: false, tickT: 0, done: false, memory: null, fade: 0 };
const abT = (tx, row) => ({ x: tx * TILE + TILE / 2, y: row * TILE });
const abC = (tx, ty) => ({ x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 });
const AB_START = { a_breach: abT(4, 48), a_canyon: abT(48, 96), a_shaft: abT(166, 98), a_pitch: abT(204, 54), a_final: abT(286, 54) };
const AB_FOUNT = { a_canyon: abT(44, 96), a_shaft: abT(162, 98), a_pitch: abT(202, 54), a_final: abT(283, 54) };
const abReady = () => ABIL.double && ABIL.wall && ABIL.launch && ABIL.boom && Save.data.up.staticDash;
const abMissing = () => [[ABIL.double, 'DOUBLE JUMP'], [ABIL.wall, 'WALL-JUMP'], [ABIL.launch, 'BAT-LAUNCH'], [ABIL.boom, 'EXPLOSIVE BASEBALLS'], [Save.data.up.staticDash, 'STATIC DASH']].filter(m => !m[0]).map(m => m[1]);
const abStatic = () => Player.dashT > 0 && Save.data.up.staticDash;
const abIn = () => AB_ON && Zone.room && Zone.room.zone === 'z11';

/* ---------- the zone itself: name, tiles, map, mood ---------- */
if (AB_ON) {
  ZONES.z11 = { name: 'The Overtime Abyss', sub: 'Secret · No Benches', page: 'act3.html', secret: true };
  PAL.z11 = { a: '#060508', b: '#09080b', top: '#3a3020', top2: '#18140c', side: '#0d0b0f', plank: '#1c1812', plankHi: '#5a4a28', spike: '#f3ead8', vein: null, crystal: null, rivet: null, fog: '255,230,170' };
  if (typeof MAP_CFG !== 'undefined') MAP_CFG.z11 = { title: 'THE OVERTIME ABYSS', subtitle: 'Secret · nobody charts this place. Not even Reshman.', rooms: ROOMS, hasMap: () => true, noMap: '', labels: {},
    notes(note, g, X, Y) { note('no benches down here', X(100), Y(92), 12, -0.03); } };
  if (typeof MOOD !== 'undefined') MOOD.z11 = { beam: '255,240,200', p: 'gold', fg: null, spire: 0, grade: '30,24,12' };
}

/* ---------- getting hit down here: a black blink, back to the room's start ---------- */
function abHit() {
  const P = Player;
  if (P.dead || P.hazard || P.invuln > 0 || AB.safeT > 0 || Story.active || !abIn()) return;
  if (P.shield > 0) P.popShield(); else if (!OPT.god) P.hp--;
  Game.flashRed = 0.45; addShake(8); addHitstop(0.05); SFX.spike();
  const c = P.center(); burst(c.x, c.y, 14, { colors: ['#f3ead8', '#f2c14e', '#0d0b10'], maxSpeed: 380, grav: 700 });
  if (P.hp <= 0) { P.die(); return; }
  const s = AB_START[AB.room] || AB_START.a_breach;
  P.lastSafe = { x: s.x - P.w / 2, y: s.y - P.h };
  P.hazard = true; P.vx = 0; P.vy = 0; P.attackT = 0; P.launched = false;
  Game.hazardT = 0.3; Game.fade = 1; Game.fadeTarget = 1;
  AB.resetPending = true;
}
// a down-swing that lands on something pogo-able (saws, drones, the crystal orb)
const abPogo = (box, refill) => {
  const P = Player;
  if (P.attackT > 0 && P.attackType === 'down' && !P.pogoed && overlap(P.hitbox(), box)) {
    P.pogo(); AB.safeT = 0.14; SFX.clang();
    if (refill) { P.balls = TUNE.ballCount; P.canDash = true; P.canDouble = true; }
    return true;
  }
  return false;
};
const abCircleHits = (x, y, r, b) => Math.hypot(clamp(x, b.x, b.x + b.w) - x, clamp(y, b.y, b.y + b.h) - y) < r;

/* ---------- hazards & gadgets ---------- */
class AbSaw {
  // a spinning dark-energy sawblade; ax/ay = sway (px), per = seconds per sway
  constructor(tx, ty, r, o = {}) { Object.assign(this, { bx: tx * TILE + TILE / 2, by: ty * TILE + TILE / 2, r, ax: 0, ay: 0, per: 2, ph: 0, x: 0, y: 0, ang: rand(0, 6) }, o); this.place(0); }
  place(t) { const k = Math.sin(t * Math.PI * 2 / this.per + this.ph); this.x = this.bx + this.ax * k; this.y = this.by + this.ay * k; }
  update(dt, t) {
    this.place(t); this.ang += dt * 9;
    const box = { x: this.x - this.r, y: this.y - this.r, w: this.r * 2, h: this.r * 2 };
    if (abPogo(box, false)) return;
    if (abCircleHits(this.x, this.y, this.r - 5, Player.hurtbox())) abHit();
  }
  draw() {
    ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.ang);
    const n = Math.max(8, Math.round(this.r / 2.4));
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * Math.PI * 2, rr2 = i % 2 ? this.r * 0.74 : this.r; ctx.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); }
    ctx.closePath(); ctx.fillStyle = '#0a0810'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(242,193,78,.55)'; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, this.r * 0.32, 0, 7); ctx.fillStyle = '#2a1238'; ctx.fill();
    ctx.strokeStyle = 'rgba(217,184,255,.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, this.r * 0.55, 0.4, 2.2); ctx.stroke();
    ctx.restore();
  }
}
class AbBand {
  // a whole row of half-buried saws: the ceiling or floor of a room
  constructor(tx, ty, tw, up) { Object.assign(this, { x: tx * TILE, y: ty * TILE, w: tw * TILE, h: up ? 20 : 3 * TILE, up }); }
  update() {
    const box = { x: this.x, y: this.up ? this.y : this.y + 26, w: this.w, h: this.up ? this.h : this.h - 26 };
    if (abPogo(box, false)) return;
    if (overlap(Player.hurtbox(), box)) abHit();
  }
  draw() {
    const t = Game.time, cy = this.up ? this.y : this.y + 3 * TILE - 2, R = 26;
    ctx.save();
    for (let x = this.x + R; x < this.x + this.w; x += R * 1.7) {
      const ang = t * 7 + x * 0.05;
      ctx.save(); ctx.translate(x, cy); ctx.rotate(this.up ? ang : -ang);
      ctx.beginPath(); for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2, rr2 = i % 2 ? R * 0.74 : R; ctx.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); }
      ctx.closePath(); ctx.fillStyle = '#0a0810'; ctx.fill(); ctx.strokeStyle = 'rgba(242,193,78,.4)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }
}
class AbDrone {
  // a spiked security drone: hurts from the side, pogo it from above
  constructor(tx, ty, o = {}) { Object.assign(this, { bx: tx * TILE + TILE / 2, by: ty * TILE + TILE / 2, ay: 18, per: 1.6, ph: rand(0, 6), x: 0, y: 0 }, o); }
  update(dt, t) {
    this.x = this.bx; this.y = this.by + Math.sin(t * Math.PI * 2 / this.per + this.ph) * this.ay;
    const box = { x: this.x - 24, y: this.y - 16, w: 48, h: 32 };
    if (abPogo(box, true)) { pop(this.x, this.y - 26, 'BOING', { size: 20, burst: false, color: GOLD }); return; }
    if (overlap(Player.hurtbox(), { x: box.x + 6, y: box.y + 8, w: box.w - 12, h: box.h - 8 })) abHit();
  }
  draw() {
    const x = this.x, y = this.y, t = Game.time;
    ctx.save(); ctx.lineJoin = 'round';
    ctx.fillStyle = '#0a0810';
    for (let k = 0; k < 7; k++) { const sx = x - 21 + k * 7; ctx.beginPath(); ctx.moveTo(sx - 3, y + 8); ctx.lineTo(sx, y + 18); ctx.lineTo(sx + 3, y + 8); ctx.fill(); }
    rr(x - 22, y - 12, 44, 22, 8); inked('#16121c', 2.5);
    ctx.fillStyle = 'rgba(242,193,78,.9)'; ctx.fillRect(x - 18, y - 15, 36, 3);   // the gold pogo plate on top
    ctx.fillStyle = Math.sin(t * 8 + this.ph) > 0 ? '#ff3a1a' : '#8a1010'; ctx.beginPath(); ctx.arc(x, y - 1, 4, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(243,234,216,.5)'; ctx.lineWidth = 1.5; const s = Math.abs(Math.cos(t * 40)); ctx.beginPath(); ctx.moveTo(x - 26 * s, y - 18); ctx.lineTo(x + 26 * s, y - 18); ctx.stroke();
    ctx.restore();
  }
}
class AbLaser {
  // vertical (v) or horizontal (h) beam; per/on = blink timing; mx/mper = a sliding beam
  constructor(o) { Object.assign(this, { kind: 'v', per: 0, on: 0, ph: 0, mx: 0, mper: 2, x0: 0, y0: 0, len: 0, x: 0, y: 0, lit: true, warn: false }, o); }
  update(dt, t) {
    this.x = this.x0 + (this.mx ? Math.sin(t * Math.PI * 2 / this.mper) * this.mx : 0); this.y = this.y0;
    if (this.per) { const p = ((t + this.ph) % this.per + this.per) % this.per; this.lit = p < this.on; this.warn = !this.lit && p > this.per - 0.25; if (this.lit && p < dt * 1.5) SFX.laser(); }
    if (!this.lit || abStatic()) return;
    const box = this.kind === 'v' ? { x: this.x - 5, y: this.y, w: 10, h: this.len } : { x: this.x, y: this.y - 5, w: this.len, h: 10 };
    if (overlap(Player.hurtbox(), box)) abHit();
  }
  draw() {
    const v = this.kind === 'v', a = this.lit ? 0.75 + 0.25 * Math.sin(Game.time * 40) : this.warn ? 0.35 * (Math.sin(Game.time * 60) > 0 ? 1 : 0) : 0.08;
    ctx.save();
    // emitters at both ends
    for (const e of [0, this.len]) { const ex = v ? this.x : this.x + e, ey = v ? this.y + e : this.y; rr(ex - 7, ey - 7, 14, 14, 3); inked('#16121c', 2); ctx.fillStyle = '#ff3a1a'; ctx.fillRect(ex - 3, ey - 3, 6, 6); }
    ctx.globalCompositeOperation = 'lighter';
    const g = v ? ctx.createLinearGradient(this.x - 14, 0, this.x + 14, 0) : ctx.createLinearGradient(0, this.y - 14, 0, this.y + 14);
    g.addColorStop(0, 'rgba(255,60,40,0)'); g.addColorStop(0.5, `rgba(255,70,50,${0.5 * a})`); g.addColorStop(1, 'rgba(255,60,40,0)');
    ctx.fillStyle = g; if (v) ctx.fillRect(this.x - 14, this.y, 28, this.len); else ctx.fillRect(this.x, this.y - 14, this.len, 28);
    ctx.fillStyle = `rgba(255,225,215,${0.85 * a})`; if (v) ctx.fillRect(this.x - 2, this.y, 4, this.len); else ctx.fillRect(this.x, this.y - 2, this.len, 4);
    ctx.restore();
  }
}
class AbZone {
  // wind (push), ice (fast wall-slide) or anti-gravity crystal field
  constructor(kind, tx, ty, tw, th, o = {}) { Object.assign(this, { kind, x: tx * TILE, y: ty * TILE, w: tw * TILE, h: th * TILE, push: 1500 }, o); }
  update(dt) {
    const P = Player, hb = { x: P.x - 3, y: P.y, w: P.w + 6, h: P.h };
    if (!overlap(hb, this) || P.hazard || P.dead) return;
    if (this.kind === 'wind' && P.dashT <= 0) { P.vx += this.push * dt; if (Math.random() < 0.5) spawnParticle({ x: this.x, y: this.y + rand(0, this.h), vx: 520, vy: rand(-20, 20), life: 0.5, size: 2, color: 'rgba(243,234,216,.6)', type: 'dot' }); }
    if (this.kind === 'ice' && !P.onGround && P.vy > 0) { P.vy = Math.max(P.vy, 430); if (Math.random() < 0.4) spawnParticle({ x: P.x + P.w / 2, y: P.y + P.h, vx: rand(-20, 20), vy: -30, life: 0.3, size: 2, color: '#dff6ff', type: 'dot' }); }
    if (this.kind === 'field' && overlap(P, this)) { P.vy -= TUNE.gravity * 1.85 * dt; if (P.vy < -380) P.vy = -380; }
  }
  draw() {
    const t = Game.time;
    ctx.save();
    if (this.kind === 'wind') {
      ctx.strokeStyle = 'rgba(243,234,216,.18)'; ctx.lineWidth = 2;
      for (let k = 0; k < 9; k++) { const y = this.y + (k + 0.5) * this.h / 9, x = this.x + ((t * 420 + k * 97) % this.w); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(Math.min(this.x + this.w, x + 50), y); ctx.stroke(); }
    } else if (this.kind === 'ice') {
      ctx.fillStyle = 'rgba(190,240,255,.28)'; ctx.fillRect(this.x - 3, this.y, this.w + 6, this.h);
      ctx.strokeStyle = 'rgba(240,250,255,.6)'; ctx.lineWidth = 1.5; for (let y = this.y + 10; y < this.y + this.h; y += 26) { ctx.beginPath(); ctx.moveTo(this.x - 3, y); ctx.lineTo(this.x + 4, y + 9); ctx.stroke(); }
    } else {
      const g = ctx.createRadialGradient(this.x + this.w / 2, this.y + this.h / 2, 4, this.x + this.w / 2, this.y + this.h / 2, Math.max(this.w, this.h) * 0.7);
      g.addColorStop(0, 'rgba(185,139,255,.28)'); g.addColorStop(1, 'rgba(185,139,255,0)');
      ctx.fillStyle = g; ctx.fillRect(this.x, this.y, this.w, this.h);
      for (let k = 0; k < 6; k++) { const px2 = this.x + ((k * 53 + t * 18) % this.w), py = this.y + this.h - ((t * 40 + k * 37) % this.h); ctx.fillStyle = 'rgba(217,184,255,.7)'; ctx.fillRect(px2, py, 3, 3); }
    }
    ctx.restore();
  }
}
class AbCrumble {
  // a Fuse Platform: solid until you stand on it, gone 1.5 s later, back after 3 s
  constructor(tx, ty, w) { Object.assign(this, { tx, ty, w, state: 'idle', t: 0 }); fill(tx, ty, w, 1, 1); markUnsafe(tx, ty, w, 1); }
  reset() { this.state = 'idle'; this.t = 0; fill(this.tx, this.ty, this.w, 1, 1); }
  update(dt) {
    const P = Player, feet = P.y + P.h, x0 = this.tx * TILE, x1 = (this.tx + this.w) * TILE;
    const on = P.onGround && Math.abs(feet - this.ty * TILE) < 4 && P.x + P.w > x0 && P.x < x1;
    if (this.state === 'idle' && on) { this.state = 'lit'; this.t = 1.5; SFX.fuse(); }
    else if (this.state === 'lit') { this.t -= dt; if (Math.random() < 0.5) spawnParticle({ x: rand(x0, x1), y: this.ty * TILE, vx: rand(-20, 20), vy: rand(-80, -30), life: 0.4, size: 2.5, color: '#ff8a2a', type: 'spark' }); if (this.t <= 0) { this.state = 'gone'; this.t = 3; fill(this.tx, this.ty, this.w, 1, 0); SFX.smallBoom ? SFX.smallBoom() : SFX.poof(); burst((x0 + x1) / 2, this.ty * TILE + 16, 16, { colors: ['#3a3020', '#ff8a2a', '#0d0b10'], maxSpeed: 300, grav: 1200, type: 'debris' }); } }
    else if (this.state === 'gone') { this.t -= dt; if (this.t <= 0 && !overlap(P, { x: x0, y: this.ty * TILE, w: x1 - x0, h: TILE })) this.reset(); }
  }
  draw() {
    if (this.state === 'gone') return;
    const x = this.tx * TILE, y = this.ty * TILE, j = this.state === 'lit' ? rand(-1.5, 1.5) : 0;
    ctx.save(); rr(x + j, y, this.w * TILE, TILE * 0.55, 3); inked(this.state === 'lit' ? '#5a2a10' : '#2a2018', 2.5);
    ctx.strokeStyle = this.state === 'lit' ? '#ff8a2a' : 'rgba(242,193,78,.45)'; ctx.lineWidth = 1.5;
    for (let k = 1; k < this.w * 2; k++) { ctx.beginPath(); ctx.moveTo(x + k * 16 + j, y + 3); ctx.lineTo(x + k * 16 - 4 + j, y + 14); ctx.stroke(); }
    ctx.restore();
  }
}
class AbOrb {
  // a hovering crystal orb: pogo it to get your double jump, dash and baseball back
  constructor(tx, ty) { Object.assign(this, { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2, by: ty * TILE + TILE / 2, cd: 0 }); }
  update(dt, t) {
    this.y = this.by + Math.sin(t * 2.2) * 5; this.cd = Math.max(0, this.cd - dt);
    if (this.cd <= 0 && abPogo({ x: this.x - 18, y: this.y - 18, w: 36, h: 36 }, true)) { this.cd = 0.4; ring(this.x, this.y, 8, 50, 0.3, '#b98bff', 4); pop(this.x, this.y - 26, 'RESET!', { size: 20, burst: false, color: '#d9b8ff' }); }
  }
  draw() {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(this.x, this.y, 2, this.x, this.y, 40); g.addColorStop(0, 'rgba(217,184,255,.6)'); g.addColorStop(1, 'rgba(217,184,255,0)');
    ctx.fillStyle = g; ctx.fillRect(this.x - 40, this.y - 40, 80, 80); ctx.restore();
    ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(Game.time * 0.8);
    ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(13, 0); ctx.lineTo(0, 16); ctx.lineTo(-13, 0); ctx.closePath(); inked('#b98bff', 2.5);
    ctx.restore();
  }
}
class AbVolley {
  // a floating turret that fires a flat volley of three tennis balls
  constructor(tx, ty, dir) { Object.assign(this, { x: tx * TILE, y: ty * TILE, w: 34, h: 34, dir, t: 1.2, shots: 0, dead: false, flash: 0 }); }
  returned() { this.flash = 0.2; pop(this.x + 17, this.y - 12, 'ACE!', { size: 28, color: '#e8f060', burstColor: '#3f7a2a' }); SFX.hit(true); }
  update(dt) {
    this.flash = Math.max(0, this.flash - dt);
    if (Math.abs(Player.x - this.x) > 900) return;
    this.t -= dt;
    if (this.t <= 0) {
      Bolts.push(new ServeBall(this.x + 17 + this.dir * 22, this.y + 17, this.dir * 560, 0, this)); SFX.serve ? SFX.serve() : SFX.shoot();
      this.shots++; this.t = this.shots % 3 ? 0.24 : 2.4;
    }
  }
  draw() {
    const cx = this.x + 17, cy = this.y + 17;
    ctx.save(); ctx.translate(cx, cy); ctx.lineJoin = 'round';
    rr(-18, -18, 36, 36, 6); inked(this.flash > 0 ? '#ffffff' : '#3a3020', 3);
    ctx.scale(this.dir, 1); rr(0, -9, 28, 18, 3); inked('#16121c', 3);
    ctx.fillStyle = this.t < 0.4 ? '#ff4a3a' : '#e8f060'; ctx.beginPath(); ctx.arc(26, 0, 5, 0, 7); ctx.fill();
    ctx.restore();
  }
}
class AbIcicles {
  // icicles that break off the ceiling over the ice pillars
  constructor(tx0, tx1, ty, floorY) { Object.assign(this, { tx0, tx1, ty, floorY, t: 0.8, list: [] }); }
  update(dt) {
    this.t -= dt;
    if (this.t <= 0) { this.t = 0.9; this.list.push({ x: rand(this.tx0, this.tx1) * TILE, y: this.ty * TILE, vy: 0, warn: 0.5 }); }
    for (const i of this.list) {
      if (i.warn > 0) { i.warn -= dt; if (i.warn <= 0) SFX.crystal(); continue; }
      i.vy += 1900 * dt; i.y += i.vy * dt;
      if (overlap(Player.hurtbox(), { x: i.x - 6, y: i.y, w: 12, h: 30 })) { abHit(); i.dead = true; }
      if (i.y > this.floorY) i.dead = true;
    }
    this.list = this.list.filter(i => !i.dead);
  }
  draw() {
    for (const i of this.list) {
      const j = i.warn > 0 ? rand(-1.5, 1.5) : 0;
      ctx.beginPath(); ctx.moveTo(i.x - 8 + j, i.y); ctx.lineTo(i.x + 8 + j, i.y); ctx.lineTo(i.x + j, i.y + 32); ctx.closePath(); inked('#dff6ff', 2);
    }
  }
}
// rockets for the blast door: parry them back into it
class AbRocket {
  constructor(x, y) { Object.assign(this, { x, y, vx: -430, vy: 0, dead: false, friendly: false, t: 0 }); }
  box() { return { x: this.x - 18, y: this.y - 12, w: 36, h: 24 }; }
  update(dt) {
    this.t += dt; this.x += this.vx * dt; this.y += this.vy * dt;
    if (Math.random() < 0.8) spawnParticle({ x: this.x - sgn(this.vx) * 16, y: this.y, vx: rand(-30, 30), vy: rand(-30, 30), life: 0.3, size: rand(3, 6), color: 'rgba(120,110,120,.6)', type: 'puff', drag: 2 });
    const D = AB.door;
    if (this.friendly && D && !D.open && this.x + 16 > D.tx * TILE) { this.dead = true; abDoorHit(this.x, this.y); return; }
    if (pointSolid(this.x + sgn(this.vx) * 16, this.y) || this.t > 5) { this.dead = true; explode(this.x, this.y, 60, 0, { friendly: this.friendly, hurtsPlayer: !this.friendly, small: true, word: false }); return; }
    if (!this.friendly && overlap({ x: this.x - 12, y: this.y - 7, w: 24, h: 14 }, Player.hurtbox())) { this.dead = true; explode(this.x, this.y, 60, 0, { friendly: false, hurtsPlayer: true, small: true, word: 'BOOM!' }); }
  }
  onBat(type) {
    this.friendly = true; this.vx = 820; this.vy = 0;
    SFX.deflect(); addHitstop(0.07); addShake(6); ring(this.x, this.y, 8, 60, 0.3, EMBER, 5);
    pop(this.x, this.y - 22, 'PARRY!', { size: 30, color: '#6fd3ff' });
    return type === 'down' ? 'pogo' : undefined;
  }
  draw() {
    ctx.save(); ctx.translate(this.x, this.y); if (this.vx < 0) ctx.scale(-1, 1); ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-14, -6); ctx.lineTo(-20, -11); ctx.lineTo(-18, 0); ctx.lineTo(-20, 11); ctx.lineTo(-14, 6); ctx.closePath(); inked('#6b6f7a', 2);
    rr(-14, -7, 26, 14, 6); inked(this.friendly ? '#ffd27a' : '#b8bcc4', 2.5); ctx.beginPath(); ctx.moveTo(12, -7); ctx.lineTo(22, 0); ctx.lineTo(12, 7); ctx.closePath(); inked(FLAME, 2.5);
    ctx.restore();
  }
}
function abDoorHit(x, y) {
  const D = AB.door; if (!D || D.open) return;
  D.hp--; explode(x, y, 70, 0, { friendly: true, small: true, word: D.hp > 0 ? 'CLANG!' : false }); D.flash = 0.25;
  if (D.hp <= 0) {
    D.open = true; fill(D.tx, D.ty, D.w, D.h, 0);
    explode((D.tx + 1) * TILE, (D.ty + D.h / 2) * TILE, 140, 0, { friendly: true, word: 'BLAST DOOR DOWN!' }); addShake(14);
  }
}
class AbLauncher {
  constructor(tx, ty) { Object.assign(this, { x: tx * TILE, y: ty * TILE, t: 1.2 }); }
  update(dt) {
    if (!AB.door || AB.door.open || Player.x < 336 * TILE) return;
    this.t -= dt;
    if (this.t <= 0) { this.t = 1.6; Bolts.push(new AbRocket(this.x - 10, this.y)); SFX.rocket ? SFX.rocket() : SFX.launch(); }
  }
  draw() { ctx.save(); rr(this.x - 10, this.y - 16, 26, 32, 4); inked('#3a3020', 3); ctx.fillStyle = this.t < 0.4 ? '#ff4a3a' : '#5a4a28'; ctx.fillRect(this.x - 14, this.y - 6, 8, 12); ctx.restore(); }
}

/* ---------- Infinite Hype Fountains: a glowing baseball statue at each room's start ---------- */
class AbFountain {
  constructor(x, y) { Object.assign(this, { kind: 'fountain', x, y, t: rand(0, 6), cd: 0, gone: false, near: false }); }
  update(dt) {
    this.t += dt; this.cd = Math.max(0, this.cd - dt);
    const P = Player, c = P.center();
    this.near = Math.abs(c.x - this.x) < 46 && Math.abs(P.y + P.h - this.y) < 40;
    if (this.near && this.cd <= 0 && !P.dead && (P.hp < P.maxHp || P.hype < (P.hypeMax || 99))) {
      this.cd = 1.2; P.hp = P.maxHp; P.hype = P.hypeMax || 99; HUD.hpPop = true; SFX.heal();
      ring(this.x, this.y - 50, 10, 70, 0.5, GOLD, 5); pop(this.x, this.y - 96, 'FULL HYPE', { size: 22, color: GOLD, burst: false });
    }
    if (Math.random() < 0.25) spawnParticle({ x: this.x + rand(-14, 14), y: this.y - 50 + rand(-10, 10), vx: rand(-10, 10), vy: rand(-60, -30), life: rand(0.6, 1), size: 2, color: Math.random() < 0.5 ? GOLD : BONE, type: 'dot' });
  }
  draw() {
    const x = this.x, y = this.y, t = this.t;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y - 50, 4, x, y - 50, 90); g.addColorStop(0, 'rgba(255,230,160,.45)'); g.addColorStop(1, 'rgba(255,230,160,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 90, y - 140, 180, 160); ctx.restore();
    ctx.save(); ctx.lineJoin = 'round';
    rr(x - 18, y - 22, 36, 22, 3); inked('#2a2418', 3); rr(x - 12, y - 30, 24, 8, 2); inked('#3a3020', 2.5);
    const by = y - 52 + Math.sin(t * 2) * 2;
    ctx.beginPath(); ctx.arc(x, by, 20, 0, 7); inked('#fff3d0', 3);
    ctx.strokeStyle = FLAME; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x - 26, by, 18, -0.6, 0.6); ctx.stroke(); ctx.beginPath(); ctx.arc(x + 26, by, 18, Math.PI - 0.6, Math.PI + 0.6); ctx.stroke();
    ctx.restore();
  }
}
// the way in from the locker room, and back out of the breach
class AbDoor {
  constructor(x, y, label, go) { Object.assign(this, { kind: 'abdoor', x, y, label, go, t: 0, near: false, gone: false }); }
  update(dt) { this.t += dt; const c = Player.center(); this.near = Math.abs(c.x - this.x) < 34 && Math.abs(Player.y + Player.h - this.y) < 30; }
  interact() { if (!Story.active) this.go(); }
  draw() {
    const x = this.x, y = this.y;
    ctx.save();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.moveTo(x - 22, y); ctx.lineTo(x - 22, y - 60); ctx.quadraticCurveTo(x, y - 82, x + 22, y - 60); ctx.lineTo(x + 22, y); ctx.closePath(); ctx.fill();
    ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(255,225,150,${0.35 + 0.15 * Math.sin(this.t * 3)})`; ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();
    if (this.near) { ctx.font = `14px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = GOLD; ctx.fillText('▲ ' + Bindings.label('up', Game.lastInput) + ' · ' + this.label, x, y - 96 + Math.sin(Game.time * 4) * 2); }
  }
}
function abTravel(pos, room, after) {
  if (Game.fadeTarget === 1) return;
  SFX.summon(); Game.fadeTarget = 1; Input.enabled = false;
  setTimeout(() => {
    Player.reset(pos, true); applyUpgrades(); enterRoom(ROOM[room]); snapCamera();
    Game.fadeTarget = 0; Input.enabled = true; if (after) after();
  }, 600);
}
function abEnterAbyss() {
  if (!abReady()) { SFX.deny(); toast('THE DARK PULLS AT YOU… YOU AREN\'T READY · NEED: ' + abMissing().join(' · ')); return; }
  abTravel(AB_START.a_breach, 'a_breach', () => { if (!Save.data.q.abyssSeen) { Save.data.q.abyssSeen = 1; saveGame(); setTimeout(() => toast('NO BENCHES DOWN HERE · HYPE FOUNTAINS HEAL YOU · ANY HAZARD SENDS YOU BACK TO THE ROOM\'S START'), 1200); } });
}
const abLeave = () => { const b = A.benches[1]; abTravel(b.pos, b.room); };

/* ---------- building each room's hazards ---------- */
function abBuild(id) {
  const O = [], D = Save.data;
  AB.door = null;
  if (AB_FOUNT[id]) NPCs.push(new AbFountain(AB_FOUNT[id].x, AB_FOUNT[id].y));
  switch (id) {
    case 'a_breach':
      NPCs.push(new AbDoor(abT(2, 48).x, 48 * TILE, 'BACK TO THE LOCKER ROOM', abLeave));
      for (const tx of [22, 26, 30]) O.push(new AbLaser({ kind: 'v', x0: tx * TILE + 16, y0: 45 * TILE, len: 3 * TILE }));
      break;
    case 'a_canyon':
      O.push(new AbBand(41, 89, 118, true), new AbBand(55, 106, 95, false));
      for (const [k, tx] of [61, 68, 75, 82].entries()) O.push(new AbDrone(tx, 97, { ph: k * 1.3 }));
      O.push(new AbLaser({ kind: 'v', x0: 88 * TILE + 16, y0: 89 * TILE, len: 17 * TILE }));
      NPCs.push(new GRing(abC(93, 99).x, abC(93, 99).y));
      O.push(new AbSaw(108, 95, 26));
      O.push(new AbZone('ice', 116, 94, 2, 7));
      O.push(new AbSaw(117, 102, 20));
      for (const [k, tx] of [126, 134, 142].entries()) O.push(new AbSaw(tx, 99, 26, { ay: 3 * TILE, per: 2.4, ph: k * 2.1 }));
      break;
    case 'a_shaft':
      O.push(new AbCrumble(163, 92, 3), new AbCrumble(168, 87, 3), new AbCrumble(163, 82, 3));
      O.push(new AbZone('wind', 163, 70, 8, 10, { push: 1500 }));
      O.push(new AbBandWall(170, 70, 10));
      for (const [k, ty] of [67, 65, 63, 61, 59].entries()) O.push(new AbLaser({ kind: 'h', x0: 163 * TILE, y0: ty * TILE + 16, len: 8 * TILE, per: 1.5, on: 0.9, ph: k * 0.0 }));
      O.push(new AbOrb(166, 56));
      break;
    case 'a_pitch':
      O.push(new AbBand(207, 62, 59, false));
      O.push(new AbVolley(233, 51, -1));
      NPCs.push(new GRing(abC(214, 51).x, abC(214, 51).y));
      for (const ty of [50, 53, 56, 59, 62]) O.push(new AbSaw(222, ty, 22));
      O.push(new AbZone('field', 227, 46, 7, 7), new AbZone('field', 238, 50, 7, 8), new AbZone('field', 249, 46, 6, 8));
      for (const tx of [236, 250]) { const e = new AutoServer({ x: tx * TILE + 16, y: 45 * TILE + 18, dir: 'down' }); Enemies.push(e); }
      O.push(new AbCrumble(256, 55, 3));
      fill(270, 46, 2, 8, 1);
      Breakables.push({ x: 270 * TILE, y: 46 * TILE, w: 2 * TILE, h: 8 * TILE, id: 'abyss_barrier', onBreak: () => {
        fill(270, 46, 2, 8, 0); pop(271 * TILE, 46 * TILE - 10, 'BREACH!', { size: 34 }); burst(271 * TILE, 50 * TILE, 30, { colors: ['#3a3020', '#f2c14e', '#0d0b10'], maxSpeed: 480, grav: 1300, type: 'debris' });
        for (let k = 0; k < 18; k++) spawnParticle({ x: 271 * TILE + rand(-30, 30), y: 50 * TILE + rand(-60, 60), vx: rand(-30, 30), vy: rand(-30, 10), life: rand(1.2, 2), size: rand(10, 18), color: 'rgba(80,70,70,.55)', type: 'puff', drag: 1 });
      } });
      break;
    case 'a_final':
      O.push(new AbBand(289, 84, 99, false));
      for (const [k, tx] of [294, 302, 310].entries()) O.push(new AbSaw(tx, 57, 24, { ax: 2 * TILE, per: 1.1, ph: k * 2 }));
      O.push(new AbLaser({ kind: 'v', x0: 318 * TILE, y0: 45 * TILE, len: 39 * TILE, mx: 2 * TILE, mper: 2.2 }));
      O.push(new AbZone('ice', 326, 60, 2, 24), new AbZone('ice', 333, 52, 2, 32));
      O.push(new AbIcicles(328.2, 331.8, 45, 84 * TILE));
      AB.door = { tx: 374, ty: 45, w: 2, h: 39, hp: 2, open: false, flash: 0 }; fill(374, 45, 2, 39, 1);
      O.push(new AbLauncher(373, 66));
      for (let k = 0; k < 8; k++) O.push(new AbSaw(381, 72, 16, { ring: k }));
      break;
  }
  return O;
}
// a wall of spikes along the right side of the wind tunnel
class AbBandWall {
  constructor(tx, ty, th) { Object.assign(this, { x: tx * TILE + 14, y: ty * TILE, w: 18, h: th * TILE }); }
  update() { if (overlap(Player.hurtbox(), this)) abHit(); }
  draw() { ctx.fillStyle = '#0a0810'; for (let y = this.y; y < this.y + this.h; y += 16) { ctx.beginPath(); ctx.moveTo(this.x + this.w, y); ctx.lineTo(this.x, y + 8); ctx.lineTo(this.x + this.w, y + 16); ctx.fill(); } ctx.strokeStyle = 'rgba(242,193,78,.4)'; ctx.lineWidth = 1; ctx.strokeRect(this.x, this.y, this.w, this.h); }
}

/* ---------- room enter / reset ---------- */
if (AB_ON) {
  const _abEnter = enterRoom;
  enterRoom = function (r) {
    const was = AB.room;
    _abEnter.apply(this, arguments);
    const D = Save.data;
    // the breach in the Grand Locker Room
    if (r.id === 't_locker') {
      if (!D.walls.abyss_crack) Breakables.push({ x: 282 * TILE, y: 13 * TILE, w: 3 * TILE, h: 7 * TILE, id: 'abyss_crack', onBreak: () => {
        D.walls.abyss_crack = 1; saveGame(); SFX.bigCrack ? SFX.bigCrack() : SFX.boom(); addShake(10);
        burst(283.5 * TILE, 17 * TILE, 30, { colors: ['#d9cbb0', '#c9a33a', '#0d0b10'], maxSpeed: 460, grav: 1300, type: 'debris' });
        pop(283.5 * TILE, 12 * TILE, 'CRACK!', { size: 36 });
        setTimeout(() => toast(abReady() ? 'A TUNNEL INTO THE DARK · SOMETHING DOWN THERE IS HUMMING' : 'A TUNNEL INTO THE DARK · YOU\'LL NEED EVERY MOVE YOU HAVE'), 500);
        NPCs.push(new AbDoor(283.5 * TILE, 20 * TILE, 'THE OVERTIME ABYSS', abEnterAbyss));
      } });
      else NPCs.push(new AbDoor(283.5 * TILE, 20 * TILE, 'THE OVERTIME ABYSS', abEnterAbyss));
    }
    if (r.zone === 'z11') {
      AB.room = r.id; AB.t = 0; AB.objs = abBuild(r.id);
      if (!was) SFX.music('rain');
    } else if (was) { AB.room = null; AB.objs = []; AB.door = null; SFX.musicAuto(); }
  };
  function abReset() {
    // zero checkpoints: the whole room re-arms
    const id = AB.room; if (!id) return;
    Bolts.length = 0;
    for (let i = Enemies.length - 1; i >= 0; i--) if (Enemies[i] instanceof AutoServer) Enemies.splice(i, 1);
    for (let i = NPCs.length - 1; i >= 0; i--) if (NPCs[i] instanceof AbFountain || NPCs[i] instanceof GRing || NPCs[i] instanceof AbDoor) NPCs.splice(i, 1);
    for (let i = Breakables.length - 1; i >= 0; i--) if (Breakables[i].id === 'abyss_barrier') Breakables.splice(i, 1);
    for (const o of AB.objs) if (o instanceof AbCrumble) fill(o.tx, o.ty, o.w, 1, 1);
    AB.t = 0; AB.objs = abBuild(id);
  }

  /* ---------- per-frame ---------- */
  const _abTick = PAGE.tick;
  PAGE.tick = function (dt) {
    if (_abTick) _abTick.apply(this, arguments);
    const P = Player;
    if (!abIn()) return;
    AB.t += dt; AB.safeT = Math.max(0, AB.safeT - dt);
    // built-in spike tiles also send you back to the room's start
    const s = AB_START[AB.room]; if (s) P.lastSafe = { x: s.x - P.w / 2, y: s.y - P.h };
    if (AB.resetPending && !P.hazard) { AB.resetPending = false; abReset(); }
    if (!P.hazard && !P.dead && !Story.active) for (const o of AB.objs) o.update(dt, AB.t);
    // the saw ring turns slowly around its gap
    for (const o of AB.objs) if (o.ring !== undefined) { const a = AB.t * 0.6 + o.ring * Math.PI / 4; o.bx = 381 * TILE + 16 + Math.cos(a) * 74; o.by = 72 * TILE + 16 + Math.sin(a) * 74; }
    if (AB.door) AB.door.flash = Math.max(0, (AB.door.flash || 0) - dt);
    // a faint stadium shot clock, ticking under the piano
    if ((AB.tickT -= dt) <= 0) { AB.tickT = 1; if (SFX.tick) SFX.tick(); }
    // the white marble platform
    if (AB.room === 'a_final' && !AB.done && P.onGround && P.x + P.w / 2 > 388 * TILE && P.y + P.h <= 66 * TILE + 4) abFinale();
  };
  // a parry down here hands back your double jump, dash and baseball
  const _abPop = pop;
  pop = function (x, y, text) {
    if (abIn() && (text === 'PARRY!' || text === 'RETURN!')) { const P = Player; P.canDouble = true; P.canDash = true; P.balls = TUNE.ballCount; }
    return _abPop.apply(this, arguments);
  };

  /* ---------- drawing ---------- */
  const _abBack = Game.hooks.back;
  Game.hooks.back = function (cam) {
    if (_abBack) _abBack.apply(this, arguments);
    if (Zone.room && Zone.room.id === 't_locker') drawAbCrack();
    if (!abIn()) return;
    for (const o of AB.objs) o.draw();
    const D = AB.door;
    if (D && !D.open) {
      const x = D.tx * TILE, y = D.ty * TILE;
      ctx.save(); ctx.fillStyle = D.flash > 0 ? '#fff' : '#1a1610'; ctx.fillRect(x, y, D.w * TILE, D.h * TILE);
      ctx.strokeStyle = 'rgba(242,193,78,.6)'; ctx.lineWidth = 3; for (let k = 0; k < D.h; k += 3) { ctx.beginPath(); ctx.moveTo(x, (D.ty + k) * TILE); ctx.lineTo(x + D.w * TILE, (D.ty + k + 1.5) * TILE); ctx.stroke(); }
      ctx.font = `14px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = FLAME; ctx.fillText('BLAST DOOR', x + D.w * TILE / 2, (D.ty + 20) * TILE);
      ctx.restore();
    }
    // the final marble platform glows
    if (AB.room === 'a_final') {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(393 * TILE, 66 * TILE, 10, 393 * TILE, 66 * TILE, 260); g.addColorStop(0, 'rgba(255,250,235,.5)'); g.addColorStop(1, 'rgba(255,250,235,0)');
      ctx.fillStyle = g; ctx.fillRect(388 * TILE - 120, 66 * TILE - 260, 10 * TILE + 240, 300);
      ctx.restore();
      ctx.fillStyle = '#f3ead8'; ctx.fillRect(388 * TILE, 66 * TILE, 10 * TILE, 8);
    }
  };
  function drawAbCrack() {
    const x = 282 * TILE, y = 13 * TILE, D = Save.data, t = Game.time;
    ctx.save(); ctx.lineJoin = 'round';
    // a row of golden lockers along the far-left wall
    for (let k = 0; k < 3; k++) { rr(x + k * 34 - 8, y + 18, 30, 7 * TILE - 18, 3); inked('#8a6a1a', 2.5); ctx.fillStyle = 'rgba(0,0,0,.35)'; for (let s = 0; s < 3; s++) ctx.fillRect(x + k * 34 - 2, y + 30 + s * 6, 18, 2); }
    if (!D.walls.abyss_crack) {
      const f = 0.25 + 0.35 * Math.max(0, Math.sin(t * 7) * Math.sin(t * 2.3));
      ctx.strokeStyle = `rgba(255,236,180,${f})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + 40, y + 10); ctx.lineTo(x + 50, y + 40); ctx.lineTo(x + 42, y + 70); ctx.lineTo(x + 54, y + 110); ctx.lineTo(x + 46, y + 150); ctx.moveTo(x + 50, y + 40); ctx.lineTo(x + 66, y + 52); ctx.moveTo(x + 42, y + 70); ctx.lineTo(x + 28, y + 84); ctx.stroke();
    }
    ctx.restore();
  }
  // the room backdrop: black depths, white-gold light shafts, drifting memories
  const _abBg = Game.hooks.background;
  Game.hooks.background = function (cx, cy) {
    if (!abIn()) return _abBg.apply(this, arguments);
    const t = Game.time;
    const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#0d0a08'); g.addColorStop(0.6, '#060507'); g.addColorStop(1, '#020203');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 4; k++) {
      const x = ((k * 520 - cx * 0.08) % 2080 + 2080) % 2080 - 300, w = 90 + k * 30, a = 0.08 + 0.04 * Math.sin(t * 0.5 + k);
      const sg = ctx.createLinearGradient(0, 0, 0, VH); sg.addColorStop(0, `rgba(255,245,215,${a * 2})`); sg.addColorStop(1, 'rgba(255,230,170,0)');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(x, -10); ctx.lineTo(x + w, -10); ctx.lineTo(x + w * 2.4 + 140, VH); ctx.lineTo(x + 140, VH); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    // memory silhouettes: a batter, an umbrella, a trophy, the scoreboard — drifting by in gold outline
    ctx.save(); ctx.strokeStyle = 'rgba(242,193,78,.16)'; ctx.lineWidth = 2;
    for (let k = 0; k < 5; k++) {
      const x = ((k * 430 - cx * 0.12 + t * 6) % 2150 + 2150) % 2150 - 200, y = VH * (0.25 + (k % 3) * 0.2) + Math.sin(t * 0.4 + k) * 12;
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 0.2 + k) * 0.1);
      switch (k % 4) {
        case 0: ctx.beginPath(); ctx.arc(0, -40, 10, 0, 7); ctx.moveTo(0, -30); ctx.lineTo(0, 10); ctx.lineTo(-12, 40); ctx.moveTo(0, 10); ctx.lineTo(12, 40); ctx.moveTo(0, -20); ctx.lineTo(28, -50); ctx.stroke(); break;
        case 1: ctx.beginPath(); ctx.arc(0, 0, 34, Math.PI, 0); ctx.closePath(); ctx.moveTo(0, 0); ctx.lineTo(0, 40); ctx.stroke(); break;
        case 2: ctx.beginPath(); ctx.moveTo(-20, -30); ctx.lineTo(20, -30); ctx.lineTo(14, 0); ctx.lineTo(-14, 0); ctx.closePath(); ctx.moveTo(0, 0); ctx.lineTo(0, 16); ctx.moveTo(-14, 22); ctx.lineTo(14, 22); ctx.stroke(); break;
        default: ctx.strokeRect(-46, -20, 92, 40); ctx.font = `18px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(242,193,78,.16)'; ctx.fillText('0 · 3 · 2', 0, 7);
      }
      ctx.restore();
    }
    ctx.restore();
  };

  /* ---------- the payoff ---------- */
  function abFinale() {
    AB.done = true;
    const D = Save.data, first = D.q.abyss !== 'done';
    Story.run(async () => {
      const P = Player, S = Story, nh = () => S.nathanHead();
      P.vx = 0; S.camTarget = { x: 393 * TILE, y: 60 * TILE }; S.zoomTo(1.25);
      SFX.music('rain'); await S.wait(1.0);
      AB.memory = { t: 0 }; await S.wait(9.2); AB.memory = null;
      S.zoomTo(1.4);
      await S.say('NATHAN', '…I missed. And then I broke it.', nh, { color: '#fff6d8' });
      await S.say('NATHAN', 'The whole Spire. All of it. That was me.', nh, { color: '#fff6d8' });
      await S.wait(0.6);
      D.q.abyss = 'done'; D.q.chalk = 1; saveGame();
      for (let k = 0; k < 40; k++) spawnParticle({ x: P.x + P.w / 2 + rand(-20, 20), y: P.y + rand(0, P.h), vx: rand(-80, 80), vy: rand(-200, -40), life: rand(0.8, 1.6), size: rand(2, 4), color: k % 2 ? GOLD : '#ffffff', type: 'dot' });
      ring(P.x + P.w / 2, P.y + P.h / 2, 10, 120, 0.7, '#ffffff', 5); SFX.heal();
    }).then(() => {
      if (first) showCard('COSMETIC UNLOCKED', 'CHALK-DUSTED AURA', 'You conquered the Overtime Abyss. Nathan\'s uniform and bat now shed a trail of white-and-gold chalk dust whenever he dashes, launches or swings. Forever.', ['permanent cosmetic', 'secret trophy · Bunt God']);
      setTimeout(() => { AB.done = false; abLeave(); }, first ? 2600 : 600);
    });
  }
  // the flashback, black and gold, drawn over everything
  const _abScreen = Story.drawScreen;
  Story.drawScreen = function () {
    _abScreen.call(this);
    if (AB.memory) { AB.memory.t += 1 / 60; drawAbMemory(AB.memory.t); }
  };
  function drawAbMemory(t) {
    const fade = Math.min(1, t / 0.8, (9.2 - t) / 1.2), H2 = VH, W2 = VW;
    ctx.save(); ctx.globalAlpha = Math.max(0, fade);
    ctx.fillStyle = '#050403'; ctx.fillRect(0, 0, W2, H2);
    // pouring rain
    ctx.strokeStyle = 'rgba(242,193,78,.22)'; ctx.lineWidth = 1;
    for (let k = 0; k < 90; k++) { const x = (k * 97 + t * 260) % (W2 + 100) - 50, y = (k * 53 + t * 900) % (H2 + 60) - 30; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 6, y + 22); ctx.stroke(); }
    // floodlights and the plate
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const fx of [W2 * 0.15, W2 * 0.85]) { const cone = ctx.createLinearGradient(fx, 0, W2 / 2, H2); cone.addColorStop(0, 'rgba(255,230,170,.32)'); cone.addColorStop(1, 'rgba(255,230,170,0)'); ctx.fillStyle = cone; ctx.beginPath(); ctx.moveTo(fx - 24, 20); ctx.lineTo(fx + 24, 20); ctx.lineTo(W2 / 2 + 200, H2); ctx.lineTo(W2 / 2 - 200, H2); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    ctx.fillStyle = '#1a140c'; ctx.beginPath(); ctx.ellipse(W2 / 2, H2 * 1.05, W2 * 0.6, H2 * 0.22, 0, 0, 7); ctx.fill();
    // young Nathan at the plate, in black and gold
    const swing = t > 2.0 && t < 2.35, rage = t > 3.6;
    ctx.filter = 'grayscale(1) sepia(.7) brightness(1.15) contrast(1.3)';
    ctx.save(); ctx.translate(W2 * 0.42 + (rage ? Math.min(1, (t - 3.6) / 0.5) * 60 : 0), H2 * 0.88); ctx.scale(2.6, 2.6);
    drawNathan(Object.assign({}, Player, { x: -Player.w / 2, y: -Player.h, facing: 1, lie: 0, invuln: 0, healT: 0, dashT: 0, vx: 0, vy: 0, onGround: true, sx: 1, sy: 1, dead: false, shield: 0, noBat: false, batLook: 'wood',
      attackT: swing || (t > 4.0 && t < 4.3) ? 0.1 : 0, attackDur: 0.2, attackType: 'fwd', comboIdx: t > 4.0 ? 3 : 1, sitting: false, sit: 0, hazard: false, launched: false, hidden: false }));
    ctx.restore();
    // the championship trophy on its stand
    const tx = W2 * 0.6, ty = H2 * 0.74;
    if (t < 4.15) drawTrophy(tx, ty, 2.2, t, {});
    ctx.filter = 'none';
    // the pitch that he missed
    if (t > 1.3 && t < 2.4) { const k = clamp((t - 1.3) / 0.9, 0, 1), x = lerp(W2 * 0.9, W2 * 0.3, k), y = lerp(H2 * 0.62, H2 * 0.78, k); ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fillStyle = '#f3e6c8'; ctx.fill(); }
    if (t > 2.4 && t < 3.6) { ctx.font = `64px ${SERIF_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = `rgba(242,193,78,${Math.min(1, (t - 2.4) * 3)})`; ctx.fillText('STRIKE THREE.', W2 / 2, H2 * 0.3); }
    // the bat meets the trophy · dark lightning
    if (t > 4.15) {
      const k = t - 4.15;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let s = 0; s < 14; s++) { const a = s / 14 * Math.PI * 2, d = 40 + k * 260; ctx.fillStyle = `rgba(242,193,78,${Math.max(0, 0.8 - k * 0.4)})`; ctx.fillRect(tx + Math.cos(a) * d, ty - 40 + Math.sin(a) * d * 0.6, 6, 6); }
      ctx.restore();
      ctx.strokeStyle = '#2a1238'; ctx.lineWidth = 10; ctx.lineJoin = 'miter';
      ctx.beginPath(); let x = tx, y = ty - 40; ctx.moveTo(x, y); for (let s = 0; s < 9; s++) { x += Math.sin(s * 2.7 + 1) * 40; y -= H2 / 9; ctx.lineTo(x, y); } ctx.stroke();
      ctx.strokeStyle = 'rgba(217,184,255,.85)'; ctx.lineWidth = 3; ctx.stroke();
      if (k > 0.8) {
        // the Spire rises from what broke
        const r = Math.min(1, (k - 0.8) / 2.2);
        ctx.fillStyle = `rgba(20,14,24,${0.9 * r})`; ctx.beginPath(); ctx.moveTo(tx - 160, H2); ctx.lineTo(tx - 30, H2 - H2 * 0.95 * r); ctx.lineTo(tx, H2 - H2 * 1.05 * r); ctx.lineTo(tx + 30, H2 - H2 * 0.95 * r); ctx.lineTo(tx + 160, H2); ctx.closePath(); ctx.fill();
      }
    }
    // captions
    ctx.font = `italic 19px ${SERIF_FONT}`; ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(243,226,190,.9)';
    const cap = t < 2.4 ? 'The Zennith Championship. Bottom of the ninth. Pouring rain.' : t < 4.1 ? 'He missed.' : t < 6.8 ? 'And in a blind rage, he swung at the one thing he couldn\'t lose to.' : '…and the Spire rose from what broke.';
    ctx.fillText(cap, 60, H2 * 0.9);
    ctx.font = `12px ${DISPLAY_FONT}`; ctx.fillStyle = 'rgba(242,193,78,.75)'; ctx.fillText('THE MEMORY AT THE BOTTOM OF THE ABYSS', 60, H2 * 0.9 - 26);
    const vg = ctx.createRadialGradient(W2 / 2, H2 / 2, H2 * 0.2, W2 / 2, H2 / 2, H2 * 0.85); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.9)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W2, H2);
    ctx.restore();
  }
}

/* ---------- the Chalk-Dusted Aura (every page, once earned) ---------- */
{
  const _chTick = PAGE.tick;
  PAGE.tick = function (dt) {
    if (_chTick) _chTick.apply(this, arguments);
    const P = Player, q = Save.data.q;
    if (!q.chalk || P.dead || P.hidden) return;
    const moving = P.dashT > 0 || P.launched || P.launchT > 0 || P.attackT > 0;
    if (!moving || Math.random() > 0.7) return;
    const c = P.center(), swing = P.attackT > 0 && !P.launched && P.dashT <= 0;
    const x = swing ? c.x + P.facing * rand(10, TUNE.batReach * 0.8) : c.x + rand(-10, 10), y = swing ? c.y + rand(-20, 10) : c.y + rand(-16, 16);
    spawnParticle({ x, y, vx: rand(-30, 30) - P.vx * 0.1, vy: rand(-40, 10), life: rand(0.4, 0.8), size: rand(1.5, 3), color: Math.random() < 0.6 ? 'rgba(255,255,255,.9)' : GOLD, type: 'dot', drag: 2 });
  };
}
