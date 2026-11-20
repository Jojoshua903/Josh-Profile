'use strict';
/* =========================================================
   ZONE 1 ACTORS: enemies, boss, NPCs, pickups
   ========================================================= */
const Pickups = [];       // scrap bolts on the floor
const Hazards = [];       // boss shockwaves / lasers
const NPCs = [];          // Josh, Reshman, map paper

function groundAheadOf(e) {
  const fx = e.dir > 0 ? e.x + e.w + 2 : e.x - 2;
  const tx = Math.floor(fx / TILE), ty = Math.floor((e.y + e.h + 2) / TILE);
  const t = tileAt(tx, ty);
  return (t === 1 || t === 3) && tileAt(tx, ty - 1) !== 2;
}

/* ---------- Scrap Scuttler: soda-can spider, lunges when close ---------- */
class Scuttler {
  constructor(x, y) {
    Object.assign(this, { type: 'scuttler', w: 30, h: 22, vx: 0, vy: 0, dir: Math.random() < 0.5 ? -1 : 1, hp: 2, maxHp: 2, flash: 0,
      state: 'walk', t: 0, onGround: false, harmful: true, pogoable: true, givesHype: true, anim: rand(0, 6), bolts: 3 });
    this.x = x - this.w / 2; this.y = y - this.h;
  }
  update(dt) {
    const P = Player;
    this.flash = Math.max(0, this.flash - dt); this.t -= dt; this.anim += dt * (3 + Math.abs(this.vx) / 25);
    const pcx = P.x + P.w / 2, cx = this.x + this.w / 2;
    switch (this.state) {
      case 'walk':
        this.vx = approach(this.vx, this.dir * 60, 500 * dt);
        if (this.onGround && (this.hitWall || !groundAheadOf(this))) { this.dir *= -1; this.vx = 0; }
        if (!P.dead && this.onGround && Math.abs(pcx - cx) < 130 && Math.abs(P.y + P.h - (this.y + this.h)) < 50 && sgn(pcx - cx) === this.dir) {
          this.state = 'crouch'; this.t = 0.3; this.vx = 0;
        }
        break;
      case 'crouch':
        this.vx = 0;
        if (this.t <= 0) { this.state = 'lunge'; this.vy = -300; this.vx = this.dir * 270; this.t = 0.6; SFX.blip(); }
        break;
      case 'lunge':
        if (this.onGround && this.t < 0.45) { this.state = 'rest'; this.t = 0.55; this.vx = 0; }
        break;
      default:
        this.vx = approach(this.vx, 0, 900 * dt);
        if (this.t <= 0) this.state = 'walk';
    }
    this.vy = Math.min(this.vy + TUNE.gravity * dt, 900);
    moveBody(this, dt);
  }
  takeHit(dmg, kx) {
    this.hp -= dmg; this.flash = 0.12;
    this.vx = kx * TUNE.knockback; this.vy = -160; this.state = 'hurt'; this.t = 0.3;
    if (this.hp <= 0) enemyDie(this);
    return true;
  }
  draw() {
    const crouch = this.state === 'crouch' ? 5 : 0;
    ctx.save(); ctx.translate(this.x + this.w / 2, this.y + this.h); ctx.scale(this.dir, 1);
    ctx.strokeStyle = INK; ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {                 // wire legs
      const side = i < 2 ? -1 : 1, ph = this.anim + i * 1.6, lift = this.onGround ? Math.max(0, Math.sin(ph)) * 4 : 3;
      const hx = side * (4 + (i % 2) * 5), kx = side * (12 + (i % 2) * 4), fx = side * (14 + (i % 2) * 5);
      ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(hx, -12 + crouch); ctx.lineTo(kx, -18 + crouch); ctx.lineTo(fx, -lift); ctx.stroke();
    }
    rr(-13, -21 + crouch, 26, 13, 4); inked(this.flash > 0 ? '#ffffff' : '#c8302a', 3);          // crushed can
    ctx.fillStyle = '#d9d4cc'; ctx.fillRect(-11, -19 + crouch, 22, 3);
    ctx.fillStyle = '#f3ead8'; ctx.fillRect(-4, -16 + crouch, 8, 4);
    ctx.fillStyle = this.state === 'crouch' || this.state === 'lunge' ? FLAME : GOLD;
    ctx.beginPath(); ctx.arc(10, -15 + crouch, 3, 0, 7); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.beginPath(); ctx.moveTo(-6, -21 + crouch); ctx.quadraticCurveTo(-10, -30, -3, -32); ctx.stroke();
    ctx.restore();
  }
}

/* ---------- Stray Drone: busted security drone, red pellets ---------- */
class StrayDrone extends Drone {
  constructor(x, y) { super(x, y); this.red = true; this.hp = 2; this.maxHp = 2; this.bolts = 4; }
  update(dt) {
    const before = Bolts.length;
    super.update(dt);
    for (let i = before; i < Bolts.length; i++) { Bolts[i].red = true; const b = Bolts[i]; b.vx *= 0.85; b.vy *= 0.85; }
    if (Math.random() < 0.04) burst(this.x + rand(0, this.w), this.y + rand(0, this.h), 3, { color: GOLD, maxSpeed: 160, maxLife: 0.25 });
  }
}

/* ---------- Bumper Bot: shielded trash compactor ---------- */
class BumperBot {
  constructor(x, y) {
    Object.assign(this, { type: 'bumper', w: 46, h: 38, vx: 0, vy: 0, dir: -1, hp: 4, maxHp: 4, flash: 0, shieldFlash: 0,
      turnT: 0, onGround: false, harmful: true, pogoable: true, givesHype: true, anim: 0, bolts: 6 });
    this.x = x - this.w / 2; this.y = y - this.h;
  }
  update(dt) {
    const P = Player;
    this.flash = Math.max(0, this.flash - dt); this.shieldFlash = Math.max(0, this.shieldFlash - dt);
    this.anim += dt * Math.abs(this.vx) / 10;
    this.vx = approach(this.vx, this.dir * 45, 300 * dt);
    if (this.onGround && (this.hitWall || !groundAheadOf(this))) { this.dir *= -1; this.vx = 0; }
    const pcx = P.x + P.w / 2, cx = this.x + this.w / 2;
    const behind = sgn(pcx - cx) === -this.dir && Math.abs(pcx - cx) < 320 && Math.abs(P.y - this.y) < 120;
    this.turnT = behind ? this.turnT + dt : 0;
    if (this.turnT > 1.4) { this.dir *= -1; this.turnT = 0; SFX.windup(); }
    this.vy = Math.min(this.vy + TUNE.gravity * dt, 900);
    moveBody(this, dt);
  }
  takeHit(dmg, kx, ky, src) {
    const front = src !== 'down' && src !== 'boom' && kx === -this.dir;   // explosions ignore the shield
    if (front) {
      this.shieldFlash = 0.15; SFX.clang(); addHitstop(0.04);
      const sx = this.dir > 0 ? this.x + this.w : this.x;
      burst(sx, this.y + this.h / 2, 10, { colors: [GOLD, BONE], maxSpeed: 360, angle: this.dir > 0 ? 0 : Math.PI, spread: 1 });
      pop(sx, this.y - 6, 'CLANG!', { size: 26, color: BONE, burstColor: '#3a3340' });
      Player.vx = -kx * 330; Player.recoilT = 0.12;
      return false;
    }
    this.hp -= dmg; this.flash = 0.12; this.vx = kx * 120;
    if (this.hp <= 0) enemyDie(this);
    return true;
  }
  draw() {
    ctx.save(); ctx.translate(this.x + this.w / 2, this.y + this.h); ctx.scale(this.dir, 1);
    for (const wx of [-14, 14]) {                                  // wheels
      ctx.beginPath(); ctx.arc(wx, -7, 7, 0, 7); inked('#2b2733', 3);
      ctx.strokeStyle = '#6b6f7a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(wx, -7); ctx.lineTo(wx + Math.cos(this.anim) * 5, -7 + Math.sin(this.anim) * 5); ctx.stroke();
    }
    rr(-22, -38, 40, 28, 4); inked(this.flash > 0 ? '#ffffff' : '#5f6b4e', 3);       // compactor body
    ctx.fillStyle = GOLD; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-20 + i * 12, -12); ctx.lineTo(-14 + i * 12, -12); ctx.lineTo(-20 + i * 12 + 10, -22); ctx.lineTo(-20 + i * 12 + 4, -22); ctx.fill(); }
    ctx.fillStyle = INK; ctx.fillRect(-6, -33, 16, 4);                                // eye slit
    ctx.fillStyle = this.turnT > 0.8 ? FLAME : '#ff9a6a'; ctx.fillRect(2, -32, 6, 2);
    // battery on the back
    rr(-28, -32, 8, 16, 2); inked(`rgba(80,220,120,${0.7 + Math.sin(Game.time * 6) * 0.3})`, 2.5);
    // shield on the front
    rr(16, -42, 10, 36, 3); inked(this.shieldFlash > 0 ? '#ffffff' : '#9aa3ad', 3);
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(21, -34, 1.6, 0, 7); ctx.arc(21, -14, 1.6, 0, 7); ctx.fill();
    if (this.turnT > 0.8) { ctx.font = `16px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = GOLD; ctx.fillText('!', 0, -50); }
    ctx.restore();
  }
}

/* ---------- Scrap crate: breakable bolt cache (one-time) ---------- */
class Crate {
  constructor(x, y, id, bolts) {
    Object.assign(this, { type: 'crate', w: 34, h: 30, id, bolts, hp: 3, flash: 0, wob: 0, harmful: false, pogoable: true, givesHype: false });
    this.x = x - this.w / 2; this.y = y - this.h;
  }
  update(dt) { this.flash = Math.max(0, this.flash - dt); this.wob *= Math.exp(-10 * dt); }
  takeHit(dmg) {
    this.hp -= dmg; this.flash = 0.1; this.wob = 1; SFX.dummy();
    if (this.hp <= 0) {
      this.dead = true; Save.data.crates[this.id] = 1; saveGame();
      burst(this.x + this.w / 2, this.y + this.h / 2, 14, { colors: ['#8a5a3a', '#c9a36b'], maxSpeed: 380, grav: 1200, type: 'debris' });
      dropBolts(this.x + this.w / 2, this.y + this.h / 2, this.bolts);
      pop(this.x + this.w / 2, this.y - 10, 'CRUNCH!', { size: 26 });
    }
    return true;
  }
  draw() {
    ctx.save(); ctx.translate(this.x + this.w / 2, this.y + this.h); ctx.rotate(Math.sin(Game.time * 40) * 0.06 * this.wob);
    rr(-17, -30, 34, 30, 2); inked(this.flash > 0 ? '#ffffff' : '#8a5a3a', 3);
    ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-17, -30); ctx.lineTo(17, 0); ctx.moveTo(17, -30); ctx.lineTo(-17, 0); ctx.stroke();
    ctx.font = `10px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = BONE; ctx.fillText('SCRAP', 0, -15);
    ctx.restore();
  }
}

/* ---------- Scrap Bolts (currency) ---------- */
function dropBolts(x, y, n) {
  for (let i = 0; i < n; i++) Pickups.push({ x: x - 5, y: y - 5, w: 10, h: 10, vx: rand(-220, 220), vy: rand(-520, -220), t: 0, spin: rand(0, 6), dropT: 0, onGround: false });
}
function onEnemyDie(e) {
  if (e.bolts) dropBolts(e.x + e.w / 2, e.y + e.h / 2, e.bolts);
  if (typeof markKilled === 'function') markKilled(e);   // stays dead until the next bench rest
}
function updatePickups(dt) {
  const c = Player.center();
  for (let i = Pickups.length - 1; i >= 0; i--) {
    const p = Pickups[i]; p.t += dt; p.spin += dt * 6;
    const dx = c.x - (p.x + 5), dy = c.y - (p.y + 5), d = Math.hypot(dx, dy);
    if (Save.data.up.magnet && p.t > 0.35 && d < 260) {
      const s = 520 + (260 - d) * 4; p.x += dx / d * s * dt; p.y += dy / d * s * dt;
    } else {
      p.vy = Math.min(p.vy + TUNE.gravity * dt, 900);
      const wasG = p.onGround; moveBody(p, dt);
      if (p.onGround) { p.vx *= Math.max(0, 1 - 8 * dt); if (!wasG && p.t < 1.2) { p.vy = -rand(60, 140); p.onGround = false; } }
    }
    if (p.t > 0.25 && d < 26 && !Player.dead) {
      Pickups.splice(i, 1); Save.data.bolts++; SFX.coin(); HUD.boltBump = true;
      spawnParticle({ x: p.x + 5, y: p.y + 5, type: 'ring', r0: 2, r1: 14, life: 0.2, color: GOLD, size: 2 });
    }
  }
}
function drawPickups() {
  for (const p of Pickups) {
    ctx.save(); ctx.translate(p.x + 5, p.y + 5); ctx.rotate(p.spin);
    ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; ctx.lineTo(Math.cos(a) * 6, Math.sin(a) * 6); } ctx.closePath();
    inked('#b8bcc4', 2); ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(0, 0, 2, 0, 7); ctx.fill();
    ctx.restore();
  }
}

/* ---------- Boss: THE ROGUE SERVER ---------- */
class RogueServer {
  constructor(x, y) {
    Object.assign(this, { type: 'boss', w: 120, h: 196, hp: 44, maxHp: 44, flash: 0, harmful: true, pogoable: true, givesHype: true,
      state: 'wake', t: 1.4, step: 0, fist: null, laser: null, anim: 0, cornered: false, dying: 0, bolts: 30, armL: 0, armR: 0 });
    this.x = x - this.w / 2; this.y = y - this.h; this.floorY = y;
  }
  pattern() { return this.hp > this.maxHp / 2 ? ['slam', 'slam', 'summon', 'laser'] : ['slam', 'laser', 'slam', 'summon', 'slam', 'laser']; }
  update(dt) {
    this.anim += dt; this.flash = Math.max(0, this.flash - dt); this.t -= dt;
    if (this.cornered) return;
    const fast = this.hp <= this.maxHp / 2 ? 0.72 : 1;
    const P = Player, arena = ROOM.server.px;
    // hugging the heap (standing next to it or riding on top) is no longer safe: after ~1.2s up close it
    // stops what it's doing (between attacks) and discharges a static pulse round its whole body
    const near = this.near();
    this.hugT = near ? (this.hugT || 0) + dt : Math.max(0, (this.hugT || 0) - dt * 1.5);
    this.pulseCd = Math.max(0, (this.pulseCd || 0) - dt);
    if (this.hugT > 1.2 && this.pulseCd <= 0 && (this.state === 'idle' || this.state === 'summon')) {
      this.state = 'pulse'; this.t = 0.5 * (fast < 1 ? 0.85 : 1); this.hugT = 0; SFX.staticBuzz(0.5);
    }
    switch (this.state) {
      case 'wake': if (this.t <= 0) { this.state = 'idle'; this.t = 0.6; } break;
      case 'idle':
        if (this.t <= 0) {
          const pat = this.pattern(), a = pat[this.step % pat.length]; this.step++;
          if (a === 'slam') {
            const tx = clamp(P.x + P.w / 2, arena.x + 80, arena.x + arena.w - 80);
            this.fist = { x: tx, y: this.floorY - 300, ph: 'aim', t: 0.8 * fast };
            this.state = 'slam'; SFX.slamWarn();
          } else if (a === 'summon') {
            this.state = 'summon'; this.t = 0.8; SFX.summon();
          } else {
            this.laser = { t: 1.05 * fast, ph: 'warn', reach: 0 }; this.state = 'laser'; SFX.laserCharge();
          }
        }
        break;
      case 'slam': {
        const f = this.fist;
        f.t -= dt;
        if (f.ph === 'aim') { f.x = lerp(f.x, clamp(P.x + P.w / 2, arena.x + 80, arena.x + arena.w - 80), 1 - Math.exp(-2 * dt)); if (f.t <= 0) { f.ph = 'drop'; f.t = 0.12; } }
        else if (f.ph === 'drop') {
          f.y = lerp(this.floorY - 300, this.floorY - 50, 1 - f.t / 0.12);
          if (f.t <= 0) {
            f.ph = 'hold'; f.t = 0.5; f.y = this.floorY - 50;
            SFX.slam(); addShake(12); dust(f.x, this.floorY, 14);
            pop(f.x, this.floorY - 70, 'KRASH!', { size: 40 });
            Hazards.push({ kind: 'wave', x: f.x, dir: -1, y: this.floorY, life: 2.4 }, { kind: 'wave', x: f.x, dir: 1, y: this.floorY, life: 2.4 });
            if (overlap(Player.hurtbox(), { x: f.x - 40, y: f.y, w: 80, h: 50 })) Player.hurt(sgn(P.x + P.w / 2 - f.x) || 1);
          }
        } else if (f.ph === 'hold') { if (f.t <= 0) { f.ph = 'rise'; f.t = 0.35; } }
        else { f.y -= 900 * dt; if (f.t <= 0) { this.fist = null; this.state = 'idle'; this.t = 0.9 * fast; } }
        if (f.ph === 'drop' || f.ph === 'hold') if (overlap(Player.hurtbox(), { x: f.x - 40, y: f.y, w: 80, h: 50 })) Player.hurt(sgn(P.x + P.w / 2 - f.x) || 1);
        break;
      }
      case 'summon':
        if (this.t <= 0) {
          const alive = Enemies.filter(e => e.type === 'drone' && !e.dead).length;
          for (let i = 0; i < 2 - alive; i++) {
            const d = new StrayDrone(this.x + (i ? this.w + 30 : -30), this.y + 30); d.bolts = 1; Enemies.push(d);
            burst(d.x + d.w / 2, d.y + d.h / 2, 12, { color: '#ff4a3a' });
          }
          this.state = 'idle'; this.t = 1.3 * fast;
        }
        break;
      case 'pulse':
        if (this.t <= 0) {
          const cx = this.x + this.w / 2, cy = this.y + this.h * 0.55;
          ring(cx, cy, 30, 190, 0.35, '#6fd3ff', 6); ring(cx, cy, 20, 150, 0.3, '#ffffff', 3);
          burst(cx, cy, 24, { colors: ['#6fd3ff', '#ffffff', '#ff4a3a'], maxSpeed: 520, maxLife: 0.35 });
          SFX.staticBuzz(0.3); SFX.smallBoom(); addShake(8);
          pop(cx, this.y - 20, 'ZZZAP!', { size: 38, color: '#6fd3ff' });
          if (this.near(16)) Player.hurt(sgn(P.x + P.w / 2 - cx) || 1);
          this.state = 'idle'; this.t = 0.8 * fast; this.pulseCd = 2.2;
        }
        break;
      case 'laser': {
        const L = this.laser; L.t -= dt;
        if (L.ph === 'warn' && L.t <= 0) { L.ph = 'fire'; L.t = 1.2; SFX.laser(); addShake(5); }
        else if (L.ph === 'fire') {
          L.reach = Math.min(1, L.reach + dt * 2.4);
          const r = this.laserRect();
          if (overlap(Player.hurtbox(), r)) Player.hurt(sgn(P.x + P.w / 2 - (this.x + this.w / 2)) || 1);
          if (L.t <= 0) { this.laser = null; this.state = 'idle'; this.t = 1.0 * fast; }
        }
        break;
      }
    }
    if (this.hp <= Math.ceil(this.maxHp * 0.1) && !this.cornered) {
      this.cornered = true; this.fist = null; this.laser = null;
      Hazards.length = 0; for (const e of Enemies) if (e.type === 'drone') { e.dead = true; burst(e.x + 15, e.y + 13, 10, { color: '#ff4a3a' }); }
      Story.bossFinale(this);
    }
  }
  // is Nathan right up against the heap (or on top of it)? `pad` grows the zone when the pulse goes off
  near(pad = 0) {
    const P = Player, hb = P.hurtbox();
    return !P.dead && overlap(hb, { x: this.x - 70 - pad, y: this.y - 60 - pad, w: this.w + 140 + pad * 2, h: this.h + 60 + pad });
  }
  laserRect() {
    const arena = ROOM.server.px, cx = this.x + this.w / 2, L = this.laser;
    const half = (arena.w / 2) * (L ? L.reach : 0);
    return { x: cx - half, y: this.floorY - 62, w: half * 2, h: 62 };
  }
  takeHit(dmg) {
    if (this.cornered || this.state === 'wake') return false;
    this.hp = Math.max(1, this.hp - dmg); this.flash = 0.1;
    BossBar.set(this.hp / this.maxHp);
    return true;
  }
  draw() {
    const x = this.x, y = this.y, w = this.w, h = this.h, fl = this.flash > 0;
    const sway = Math.sin(this.anim * 1.5) * 4;
    ctx.save();
    // hanging cables behind
    ctx.lineWidth = 5; ctx.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
      ctx.strokeStyle = ['#1c1a22', '#2d3b4a', '#3a1d33'][i % 3];
      const sx = x + 10 + i * 17;
      ctx.beginPath(); ctx.moveTo(sx, ROOM.server.px.y + 10); ctx.bezierCurveTo(sx + 30 + sway * 2, y - 60, sx - 30, y + 20, sx + sway, y + 30); ctx.stroke();
    }
    // the heap
    ctx.beginPath(); ctx.moveTo(x - 30, y + h); ctx.quadraticCurveTo(x - 10, y + h - 80, x + 10, y + 60); ctx.lineTo(x + w - 10, y + 60);
    ctx.quadraticCurveTo(x + w + 10, y + h - 80, x + w + 30, y + h); ctx.closePath();
    inked(fl ? '#ffffff' : '#241d2c', 4);
    // motherboards
    for (const [bx, by, bw, bh] of [[x + 6, y + 120, 36, 26], [x + w - 44, y + 140, 38, 24], [x + 30, y + 160, 30, 20]]) {
      rr(bx, by, bw, bh, 2); inked(fl ? '#ffffff' : '#1f5a3a', 2.5);
      ctx.strokeStyle = GOLD; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(bx + 4, by + bh / 2); ctx.lineTo(bx + bw - 6, by + bh / 2); ctx.lineTo(bx + bw - 6, by + 4); ctx.stroke();
      if (Math.random() < 0.05) burst(bx + rand(0, bw), by, 3, { color: GOLD, maxSpeed: 200, maxLife: 0.2 });
    }
    // monitor stack with angry faces
    const mons = [[x + 14, y + 66, 46, 36], [x + 62, y + 70, 44, 34], [x + 32, y + 26, 54, 40]];
    mons.forEach(([mx, my, mw, mh], i) => {
      rr(mx, my + sway * (i - 1) * 0.3, mw, mh, 4); inked(fl ? '#ffffff' : '#2a2a32', 3);
      const scr = this.state === 'summon' || (this.laser && this.laser.ph === 'warn') ? '#ff4a3a' : '#5a1a2a';
      ctx.fillStyle = Math.random() < 0.04 ? '#ffffff' : scr; ctx.fillRect(mx + 5, my + 5 + sway * (i - 1) * 0.3, mw - 10, mh - 10);
      ctx.fillStyle = INK; ctx.font = `${mh * 0.45}px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(this.cornered ? '0_0' : i === 2 ? '>:(' : 'X X', mx + mw / 2, my + mh / 2 + sway * (i - 1) * 0.3);
    });
    // core
    if (!this.dying) {
      const cg = ctx.createRadialGradient(x + w / 2, y + 118, 0, x + w / 2, y + 118, 40);
      cg.addColorStop(0, 'rgba(255,74,58,.9)'); cg.addColorStop(1, 'rgba(255,74,58,0)');
      ctx.fillStyle = cg; ctx.fillRect(x + w / 2 - 40, y + 78, 80, 80);
      ctx.beginPath(); ctx.arc(x + w / 2, y + 118, 13 + Math.sin(this.anim * 6) * 2, 0, 7); inked('#ffb0a0', 3);
    }
    ctx.restore();
    // static pulse wind-up: blue sparks crawl over the heap and a ring marks how far it reaches
    if (this.state === 'pulse') {
      const k = 1 - Math.max(0, this.t) / 0.5;
      ctx.save();
      ctx.strokeStyle = `rgba(111,211,255,${0.25 + 0.45 * (Math.sin(Game.time * 40) > 0 ? 1 : 0.4)})`; ctx.lineWidth = 3; ctx.setLineDash([10, 8]);
      ctx.strokeRect(x - 70, y - 60, w + 140, h + 60); ctx.setLineDash([]);
      for (let i = 0; i < 4; i++) {
        let px = x + Math.random() * w, py = y + 40 + Math.random() * (h - 40);
        ctx.strokeStyle = Math.random() < 0.5 ? '#6fd3ff' : '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, py);
        for (let s = 0; s < 4; s++) { px += rand(-18, 18) * (1 + k); py += rand(-18, 18); ctx.lineTo(px, py); }
        ctx.stroke();
      }
      ctx.restore();
    }
    // laser warning / beam
    if (this.laser) {
      const L = this.laser, r = this.laserRect();
      if (L.ph === 'warn') {
        ctx.fillStyle = `rgba(255,74,58,${0.15 + 0.25 * (Math.sin(Game.time * 30) > 0 ? 1 : 0)})`;
        ctx.fillRect(ROOM.server.px.x, this.floorY - 62, ROOM.server.px.w, 62);
      } else {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const lg = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
        lg.addColorStop(0, 'rgba(255,74,58,0)'); lg.addColorStop(0.5, 'rgba(255,190,170,.95)'); lg.addColorStop(1, 'rgba(255,74,58,0)');
        ctx.fillStyle = lg; ctx.fillRect(r.x, r.y, r.w, r.h); ctx.restore();
      }
    }
    // cable fist
    if (this.fist) {
      const f = this.fist;
      if (f.ph === 'aim') { ctx.fillStyle = `rgba(0,0,0,${0.35 + 0.2 * Math.sin(Game.time * 20)})`; ctx.beginPath(); ctx.ellipse(f.x, this.floorY, 44, 8, 0, 0, 7); ctx.fill(); }
      ctx.strokeStyle = '#1c1a22'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(this.x + this.w / 2, this.y + 40); ctx.quadraticCurveTo(f.x, f.y - 160, f.x, f.y); ctx.stroke();
      ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
      rr(f.x - 40, f.y, 80, 50, 10); inked('#3a3340', 4);
      ctx.fillStyle = INK; for (let k = 0; k < 3; k++) ctx.fillRect(f.x - 28 + k * 20, f.y + 8, 4, 22);
    }
  }
}
function updateHazards(dt) {
  for (let i = Hazards.length - 1; i >= 0; i--) {
    const h = Hazards[i]; h.life -= dt;
    if (h.kind === 'wave') {
      h.x += h.dir * 430 * dt;
      if (pointSolid(h.x + h.dir * 14, h.y - 10) || h.life <= 0) { Hazards.splice(i, 1); continue; }
      if (Math.random() < 0.5) dust(h.x, h.y, 1, -h.dir);
      if (overlap(Player.hurtbox(), { x: h.x - 14, y: h.y - 26, w: 28, h: 26 })) Player.hurt(h.dir);
    }
  }
}
function drawHazards() {
  for (const h of Hazards) if (h.kind === 'wave') {
    ctx.beginPath(); ctx.moveTo(h.x - 18 * h.dir, h.y); ctx.quadraticCurveTo(h.x, h.y - 46, h.x + 16 * h.dir, h.y);
    inked(BONE, 3);
    ctx.fillStyle = FLAME; ctx.beginPath(); ctx.moveTo(h.x - 8 * h.dir, h.y); ctx.quadraticCurveTo(h.x, h.y - 24, h.x + 8 * h.dir, h.y); ctx.fill();
  }
}

/* ---------- NPCs ---------- */
class Josh {
  constructor(x, y) { Object.assign(this, { kind: 'josh', x: x - 11, y: y - 46, w: 22, h: 46, vx: 0, vy: 0, facing: -1, walkTo: null, onGround: false, near: false, phase: 0, gone: false, dropT: 0 }); }
  head() { return { x: this.x + this.w / 2, y: this.y }; }
  update(dt) {
    this.phase += dt;
    if (this.walkTo !== null) {
      const d = this.walkTo - (this.x + this.w / 2);
      if (Math.abs(d) < 4) { this.vx = 0; this.walkTo = null; } else { this.vx = sgn(d) * 140; this.facing = sgn(d); }
    } else this.vx = 0;
    this.vy = Math.min(this.vy + TUNE.gravity * dt, 900);
    moveBody(this, dt);
    const c = Player.center();
    this.near = Math.abs(c.x - (this.x + this.w / 2)) < 60 && Math.abs(Player.y + Player.h - (this.y + this.h)) < 20;
  }
  draw() {
    const px = this.x + this.w / 2, py = this.y + this.h, walk = this.vx ? Math.sin(this.phase * 12) : 0;
    ctx.save(); ctx.translate(px, py); ctx.scale(this.facing, 1); ctx.lineJoin = 'round';
    limb(-3, -15, Math.PI / 2 + walk * 0.6, 15, '#2b2733', 5); limb(3, -15, Math.PI / 2 - walk * 0.6, 15, '#2b2733', 5);
    rr(-11, -36, 22, 24, 6); inked('#2c6e6a', 3);                    // hoodie
    ctx.fillStyle = '#245a57'; ctx.fillRect(-5, -26, 10, 8);
    ctx.beginPath(); ctx.arc(2, -45, 10, 0, 7); inked(BONE, 3);      // head
    ctx.beginPath(); ctx.moveTo(-9, -46); ctx.quadraticCurveTo(-8, -60, 2, -60); ctx.quadraticCurveTo(13, -60, 12, -47); ctx.closePath(); inked('#8fd3ff', 3);   // light-blue beanie
    ctx.fillStyle = '#6fb8e0'; ctx.fillRect(-9, -49, 21, 3);
    ctx.shadowColor = '#6fd3ff'; ctx.shadowBlur = 10; ctx.fillStyle = '#6fd3ff'; ctx.beginPath(); ctx.arc(7, -45, 3.2, 0, 7); ctx.fill(); ctx.shadowBlur = 0;   // robotic eye
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(7, -45, 4.5, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4, -39); ctx.lineTo(10, -40); ctx.stroke();                          // smug mouth
    limb(4, -31, 0.6, 11, '#2c6e6a', 4);
    ctx.save(); ctx.translate(13, -24); ctx.rotate(0.6); rr(-2, -3, 22, 6, 2); inked('#9aa3ad', 2); ctx.fillStyle = '#6fd3ff'; ctx.fillRect(16, -2, 4, 4); ctx.restore();  // plasma wrench
    ctx.restore();
    if (this.near && this.shop) {
      ctx.font = `14px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = GOLD;
      ctx.fillText('▲ ' + Bindings.label('up', Game.lastInput) + ' · SHOP', px, this.y - 30 + Math.sin(Game.time * 4) * 2);
    }
  }
}
class Reshman {
  constructor(x, y) { Object.assign(this, { kind: 'reshman', x, y, t: 0, startled: 0, gone: false, triggered: false }); }
  head() { return { x: this.x, y: this.y - 34 }; }
  update(dt) {
    this.t += dt; this.startled = Math.max(0, this.startled - dt);
    const c = Player.center();
    if (!this.triggered && Math.hypot(c.x - this.x, c.y - this.y) < 150) { this.triggered = true; Story.reshmanScene(this); }
  }
  draw() {
    const j = this.startled > 0 ? rand(-3, 3) : Math.sin(this.t * 22) * 0.8;
    const s = 1 + this.startled * 0.6;
    ctx.save(); ctx.translate(this.x + j, this.y);
    ctx.scale(s, 2 - s);
    ctx.fillStyle = '#000000';
    ctx.beginPath(); ctx.moveTo(-14, 0); ctx.quadraticCurveTo(-16, -26, 0, -28); ctx.quadraticCurveTo(16, -26, 14, 0);
    for (let k = 0; k < 4; k++) ctx.quadraticCurveTo(10 - k * 8, 4, 6 - k * 8, 0);
    ctx.fill();
    ctx.restore();
  }
  drawEyes() {
    const blink = Math.sin(this.t * 1.7) > 0.96;
    const j = this.startled > 0 ? rand(-3, 3) : 0;
    ctx.save(); ctx.shadowColor = '#f3ead8'; ctx.shadowBlur = 12; ctx.fillStyle = '#f3ead8';
    for (const ox of [-5, 5]) { ctx.beginPath(); ctx.ellipse(this.x + ox + j, this.y - 16, 2.6, blink ? 0.4 : 4 + this.startled * 3, 0, 0, 7); ctx.fill(); }
    ctx.restore();
  }
}
class MapPaper {
  constructor(x, y, onGet) { Object.assign(this, { kind: 'paper', x, y: y - 12, gy: y - 10, vy: -200, t: 0, landed: false, gone: false, onGet: onGet || collectMap }); }
  update(dt) {
    this.t += dt;
    if (!this.landed) { this.vy += 900 * dt; this.y += this.vy * dt; if (this.y >= this.gy) { this.y = this.gy; this.landed = true; } }
    const c = Player.center();
    if (this.landed && Math.hypot(c.x - this.x, c.y - this.y) < 34) { this.gone = true; this.onGet(); }
  }
  draw() {
    ctx.save(); ctx.translate(this.x, this.y + Math.sin(this.t * 3) * 2); ctx.rotate(Math.sin(this.t * 2) * 0.15);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 50); g.addColorStop(0, 'rgba(242,193,78,.45)'); g.addColorStop(1, 'rgba(242,193,78,0)');
    ctx.fillStyle = g; ctx.fillRect(-50, -50, 100, 100);
    ctx.beginPath(); ctx.moveTo(-12, -9); ctx.lineTo(10, -11); ctx.lineTo(13, 8); ctx.lineTo(-10, 10); ctx.closePath(); inked('#e9dcc0', 2.5);
    ctx.strokeStyle = FLAME; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-6, -3); ctx.lineTo(0, 2); ctx.lineTo(6, -4); ctx.stroke();
    ctx.restore();
  }
}

function makeZoneEnemy(s) {
  switch (s.k) {
    case 'scuttler': return new Scuttler(s.x, s.y);
    case 'drone': return new StrayDrone(s.x, s.y);
    case 'bumper': return new BumperBot(s.x, s.y);
    case 'orb': return new Orb(s.x, s.y);
    case 'crate': return Save.data.crates[s.id] ? null : new Crate(s.x, s.y, s.id, s.bolts);
  }
  return null;
}
