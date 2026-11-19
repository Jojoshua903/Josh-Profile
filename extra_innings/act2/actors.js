'use strict';
/* =========================================================
   ACT II ACTORS: new enemies + world gadgets
   Geode Crab · Crystal Wisp · Static Elemental · Wind-Tossed
   Gargoyle · Frost Sentinel · Blizzard Bat ·
   anti-gravity fields, wind gusts, lightning rods, icicles
   ========================================================= */

/* ---------- Geode Crab: its crystal shell bounces ordinary swings ---------- */
class GeodeCrab {
  constructor(x, y) {
    Object.assign(this, { type: 'crab', w: 42, h: 30, vx: 0, vy: 0, dir: Math.random() < 0.5 ? -1 : 1, hp: 4, maxHp: 4, flash: 0, shell: true, clangT: 0,
      onGround: false, harmful: true, pogoable: true, givesHype: true, anim: rand(0, 6), bolts: 7, state: 'walk', t: rand(0.5, 1.5) });
    this.x = x - this.w / 2; this.y = y - this.h;
  }
  update(dt) {
    const P = Player; this.flash = Math.max(0, this.flash - dt); this.clangT = Math.max(0, this.clangT - dt); this.t -= dt;
    this.anim += dt * (3 + Math.abs(this.vx) / 18);
    const pcx = P.x + P.w / 2, cx = this.x + this.w / 2;
    if (this.state === 'walk') {
      this.vx = approach(this.vx, this.dir * 40, 400 * dt);
      if (this.onGround && (this.hitWall || !groundAheadOf(this))) { this.dir *= -1; this.vx = 0; }
      if (this.t <= 0 && !P.dead && Math.abs(pcx - cx) < 280 && Math.abs(P.y + P.h - (this.y + this.h)) < 60) { this.dir = sgn(pcx - cx) || 1; this.state = 'rear'; this.t = 0.4; SFX.windup(); }
    } else if (this.state === 'rear') { this.vx = 0; if (this.t <= 0) { this.state = 'scuttle'; this.t = 0.85; } }
    else if (this.state === 'scuttle') {
      this.vx = this.dir * 240; if (Math.random() < 0.3) dust(cx, this.y + this.h, 1, -this.dir);
      if (this.hitWall || !groundAheadOf(this) || this.t <= 0) { this.state = 'walk'; this.t = 1.6; this.vx = 0; }
    } else { this.vx = approach(this.vx, 0, 900 * dt); if (this.t <= 0) this.state = 'walk'; }
    this.vy = Math.min(this.vy + TUNE.gravity * dt, 900);
    moveBody(this, dt);
  }
  takeHit(dmg, kx, ky, src) {
    if (this.shell && src !== 'down' && src !== 'boom') {
      if (this.clangT <= 0) { this.clangT = 0.25; SFX.clang(); addHitstop(0.04); pop(this.x + this.w / 2, this.y - 8, 'REFLECT!', { size: 24, color: '#d9b8ff', burstColor: '#4a2a6a' }); }
      burst(this.x + this.w / 2, this.y + 8, 8, { colors: ['#d9b8ff', '#9be3c8', BONE], maxSpeed: 320 });
      if (src) { Player.vx = -kx * 380; Player.recoilT = 0.14; }
      if (!Zone.crabTip) { Zone.crabTip = true; toast('THE SHELL BOUNCES SWINGS · POGO DOWN ON IT OR USE AN EXPLOSIVE BASEBALL'); }
      return false;
    }
    if (this.shell) {
      this.shell = false; SFX.crystal(); addShake(6);
      burst(this.x + this.w / 2, this.y + 10, 22, { colors: ['#d9b8ff', '#9be3c8', '#7a4ab8', BONE], maxSpeed: 460, grav: 900 });
      pop(this.x + this.w / 2, this.y - 14, 'CRACKED!', { size: 30, color: '#d9b8ff', burstColor: '#4a2a6a' });
    }
    this.hp -= dmg; this.flash = 0.12; this.vx = kx * 150; this.vy = -140; this.state = 'hurt'; this.t = 0.3;
    if (this.hp <= 0) enemyDie(this);
    return true;
  }
  draw() {
    const cx = this.x + this.w / 2, by = this.y + this.h, rear = this.state === 'rear' ? 4 : 0;
    ctx.save(); ctx.translate(cx, by); ctx.scale(this.dir, 1); ctx.lineJoin = 'round';
    ctx.strokeStyle = INK; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) for (const s of [-1, 1]) {      // legs
      const ph = this.anim + i * 1.4 + (s > 0 ? 0.7 : 0), lift = this.onGround ? Math.max(0, Math.sin(ph)) * 3 : 2;
      ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(s * (6 + i * 4), -8); ctx.lineTo(s * (14 + i * 4), -14); ctx.lineTo(s * (17 + i * 3), -lift); ctx.stroke();
    }
    // claws
    for (const s of [1]) { ctx.beginPath(); ctx.ellipse(s * 22, -14 - rear * 2, 7, 5, -0.4, 0, 7); inked(this.flash > 0 ? '#ffffff' : '#c86a8a', 2.5); ctx.beginPath(); ctx.moveTo(s * 26, -16 - rear * 2); ctx.lineTo(s * 30, -20 - rear * 2); ctx.stroke(); }
    // soft body
    ctx.beginPath(); ctx.ellipse(0, -11, 17, 9, 0, 0, 7); inked(this.flash > 0 ? '#ffffff' : '#c86a8a', 2.5);
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(10, -18, 2, 0, 7); ctx.arc(15, -17, 2, 0, 7); ctx.fill();
    if (this.shell) {
      // geode shell: dull rock outside, glittering crystal ridge on top
      ctx.beginPath(); ctx.moveTo(-19, -10); ctx.quadraticCurveTo(-18, -32, 0, -33); ctx.quadraticCurveTo(18, -32, 19, -10); ctx.closePath(); inked('#5e5270', 3);
      ctx.fillStyle = '#b98bff';
      for (const [ox, h] of [[-10, 10], [-3, 15], [4, 12], [11, 8]]) { ctx.beginPath(); ctx.moveTo(ox - 4, -27); ctx.lineTo(ox, -27 - h); ctx.lineTo(ox + 4, -27); ctx.closePath(); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(-4, -38, 2, 6);
    } else {
      ctx.strokeStyle = 'rgba(13,11,16,.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-10, -16); ctx.lineTo(-4, -12); ctx.moveTo(2, -17); ctx.lineTo(6, -12); ctx.stroke();
    }
    ctx.restore();
  }
}

/* ---------- Crystal Wisp: blinks between floating spots, fires three lasers ---------- */
class CrystalWisp {
  constructor(x, y) {
    Object.assign(this, { type: 'wisp', w: 26, h: 26, hx: x, hy: y, hp: 2, maxHp: 2, flash: 0, state: 'float', t: rand(1, 2), harmful: true, pogoable: true, givesHype: true,
      bolts: 5, fade: 1, phase: rand(0, 6), aim: 0 });
    this.x = this.bx = x - 13; this.y = this.by = y - 13;
  }
  update(dt) {
    const P = Player; this.phase += dt; this.t -= dt; this.flash = Math.max(0, this.flash - dt);
    const cx = this.x + 13, cy = this.y + 13, pc = P.center(), d = Math.hypot(pc.x - cx, pc.y - cy);
    if (this.state === 'float') {
      this.x = this.bx; this.y = this.by + Math.sin(this.phase * 2) * 6;
      if (this.t <= 0 && d < 560 && !P.dead) { this.state = 'out'; this.t = 0.22; SFX.blip(); }
    } else if (this.state === 'out') {
      this.fade = Math.max(0, this.t / 0.22); this.untargetable = true; this.harmful = false;
      if (this.t <= 0) {
        const room = Zone.room.px;
        for (let k = 0; k < 14; k++) {
          const a = rand(0, Math.PI * 2), r = rand(150, 240);
          const nx = clamp(pc.x + Math.cos(a) * r, this.hx - 380, this.hx + 380), ny = clamp(pc.y - Math.abs(Math.sin(a)) * r * 0.8, this.hy - 260, this.hy + 200);
          if (nx < room.x + 48 || nx > room.x + room.w - 48 || ny < room.y + 48 || ny > room.y + room.h - 48) continue;
          if (!pointSolid(nx, ny) && !pointSolid(nx - 16, ny - 16) && !pointSolid(nx + 16, ny + 16) && !pointSolid(nx - 16, ny + 16) && !pointSolid(nx + 16, ny - 16)) { this.bx = nx - 13; this.by = ny - 13; break; }
        }
        this.x = this.bx; this.y = this.by; this.state = 'in'; this.t = 0.22; SFX.crystal();
        burst(this.x + 13, this.y + 13, 10, { colors: ['#9be3c8', '#d9b8ff', BONE], maxSpeed: 260 });
      }
    } else if (this.state === 'in') {
      this.fade = 1 - Math.max(0, this.t / 0.22);
      if (this.t <= 0) { this.fade = 1; this.untargetable = false; this.harmful = true; this.state = 'charge'; this.t = 0.7; SFX.laserCharge(); }
    } else if (this.state === 'charge') {
      if (this.t > 0.25) this.aim = Math.atan2(pc.y - cy, pc.x - cx);
      if (this.t <= 0) {
        for (const k of [-1, 0, 1]) { const a = this.aim + k * 0.32, b = new Bolt(cx, cy, Math.cos(a) * 560, Math.sin(a) * 560); b.crystal = true; b.life = 2; Bolts.push(b); }
        SFX.laser(); this.state = 'float'; this.t = rand(1.8, 2.6);
      }
    }
  }
  takeHit(dmg, kx, ky) {
    this.hp -= dmg; this.flash = 0.12; this.bx += kx * 20; this.by += (ky || -0.3) * 20;
    if (this.state === 'charge') { this.state = 'float'; this.t = 0.8; }
    if (this.hp <= 0) { enemyDie(this); burst(this.x + 13, this.y + 13, 16, { colors: ['#9be3c8', '#d9b8ff', BONE], maxSpeed: 420 }); SFX.crystal(); }
    return true;
  }
  draw() {
    const cx = this.x + 13, cy = this.y + 13;
    ctx.save(); ctx.globalAlpha = this.fade;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 34); g.addColorStop(0, 'rgba(155,227,200,.5)'); g.addColorStop(1, 'rgba(155,227,200,0)');
    ctx.fillStyle = g; ctx.fillRect(cx - 34, cy - 34, 68, 68);
    if (this.state === 'charge') {
      const k = 1 - this.t / 0.7;
      ctx.strokeStyle = `rgba(217,184,255,${0.25 + k * 0.6})`; ctx.lineWidth = 1 + k * 2; ctx.setLineDash([6, 6]);
      for (const s of [-1, 0, 1]) { const a = this.aim + s * 0.32; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * 520, cy + Math.sin(a) * 520); ctx.stroke(); }
      ctx.setLineDash([]);
    }
    ctx.translate(cx, cy); ctx.rotate(Math.sin(this.phase * 1.5) * 0.3);
    ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(10, 0); ctx.lineTo(0, 15); ctx.lineTo(-10, 0); ctx.closePath(); inked(this.flash > 0 ? '#ffffff' : '#9be3c8', 2.5);
    ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(3, 0); ctx.lineTo(0, 15); ctx.strokeStyle = 'rgba(13,11,16,.5)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(-2, -2, 2, 0, 7); ctx.arc(4, -2, 2, 0, 7); ctx.fill();
    for (let k = 0; k < 3; k++) { const a = this.phase * 3 + k * 2.1; ctx.fillStyle = '#d9b8ff'; ctx.fillRect(Math.cos(a) * 18 - 2, Math.sin(a) * 18 - 2, 4, 4); }
    ctx.restore();
  }
}

/* ---------- Static Elemental: crackling spark-ball; only safe to hit right after it discharges ---------- */
class StaticElemental {
  constructor(x, y) {
    Object.assign(this, { type: 'static', w: 30, h: 30, hx: x, hy: y, hp: 3, maxHp: 3, flash: 0, state: 'charge', t: rand(1.5, 2.6), harmful: true, pogoable: true, givesHype: true,
      bolts: 5, phase: rand(0, 6), zap: 0, zapY: 0, warned: false, shockT: 0 });
    this.x = x - 15; this.y = y - 15;
  }
  update(dt) {
    const P = Player; this.phase += dt; this.t -= dt; this.flash = Math.max(0, this.flash - dt); this.zap = Math.max(0, this.zap - dt); this.shockT = Math.max(0, this.shockT - dt);
    const pcx = P.x + P.w / 2, tx = clamp(pcx, this.hx - 220, this.hx + 220), ty = this.hy + Math.sin(this.phase * 1.7) * 18;
    this.x = approach(this.x, tx - 15, 60 * dt); this.y = lerp(this.y, ty - 15, 1 - Math.exp(-3 * dt));
    const cx = this.x + 15, cy = this.y + 15;
    if (this.state === 'charge') {
      if (this.t < 0.7) { if (!this.warned) { this.warned = true; SFX.laserCharge(); } if (Math.random() < 0.6) spawnParticle({ x: cx + rand(-20, 20), y: cy + rand(-20, 20), vx: rand(-80, 80), vy: rand(-80, 80), life: 0.2, size: 2, color: '#fff27a', type: 'spark' }); }
      if (this.t <= 0) {
        // discharge: a bolt straight down onto whatever is below, spreading along the surface
        this.zapY = landYAt(cx, cy + 16); this.zap = 0.3; SFX.laser(); SFX.staticBuzz(0.3); addShake(4);
        const hb = P.hurtbox();
        if (overlap(hb, { x: cx - 22, y: cy, w: 44, h: this.zapY - cy }) || overlap(hb, { x: cx - 80, y: this.zapY - 34, w: 160, h: 36 })) P.hurt(sgn(pcx - cx) || 1);
        pop(cx, this.zapY - 20, 'ZZAP!', { size: 28, color: '#fff27a', burstColor: '#4a3a8a' });
        this.state = 'spent'; this.t = 1.6; this.harmful = false; this.warned = false;
      }
    } else if (this.t <= 0) { this.state = 'charge'; this.t = rand(1.8, 2.4); this.harmful = true; }
  }
  takeHit(dmg, kx, ky, src) {
    if (this.state !== 'spent' && src !== 'boom') {
      if (this.shockT <= 0 && src) { this.shockT = 0.5; SFX.laser(); burst(this.x + 15, this.y + 15, 12, { colors: ['#fff27a', '#ffffff'], maxSpeed: 360 }); pop(this.x + 15, this.y - 10, 'SHOCKED!', { size: 26, color: '#fff27a', burstColor: '#4a3a8a' }); Player.hurt(-kx || 1); }
      if (!Zone.staticTip) { Zone.staticTip = true; toast('STILL CHARGED · WAIT FOR IT TO DISCHARGE, THEN SWING'); }
      return false;
    }
    this.hp -= dmg; this.flash = 0.12; this.x += kx * 18;
    if (this.hp <= 0) enemyDie(this);
    return true;
  }
  draw() {
    const cx = this.x + 15, cy = this.y + 15, live = this.state === 'charge';
    if (this.zap > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(255,242,122,${this.zap / 0.3})`; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(cx, cy); let y = cy; while (y < this.zapY) { y += 22; ctx.lineTo(cx + rand(-12, 12), Math.min(y, this.zapY)); } ctx.stroke();
      ctx.fillStyle = `rgba(255,242,122,${this.zap})`; ctx.fillRect(cx - 80, this.zapY - 6, 160, 6);
      ctx.restore();
    }
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, live ? 44 : 24); g.addColorStop(0, live ? 'rgba(255,242,122,.55)' : 'rgba(120,140,180,.3)'); g.addColorStop(1, 'rgba(255,242,122,0)');
    ctx.fillStyle = g; ctx.fillRect(cx - 44, cy - 44, 88, 88);
    ctx.beginPath(); ctx.arc(cx, cy, 13 + (live ? Math.sin(this.phase * 20) * 1.5 : 0), 0, 7); inked(this.flash > 0 ? '#ffffff' : live ? '#fff27a' : '#6b7a9a', 3);
    ctx.fillStyle = INK; ctx.fillRect(cx - 6, cy - 3, 3, 4); ctx.fillRect(cx + 3, cy - 3, 3, 4);
    if (live) {
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
      for (let k = 0; k < 4; k++) { const a = this.phase * 6 + k * 1.57; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 13, cy + Math.sin(a) * 13); ctx.lineTo(cx + Math.cos(a + 0.3) * 24 + rand(-3, 3), cy + Math.sin(a + 0.3) * 24 + rand(-3, 3)); ctx.stroke(); }
    } else if (Math.random() < 0.1) spawnParticle({ x: cx, y: cy - 10, vx: rand(-10, 10), vy: -30, life: 0.6, size: 5, color: 'rgba(120,120,140,.4)', type: 'puff', drag: 1 });
  }
}

/* ---------- Wind-Tossed Gargoyle: rides the air currents in diagonal swoops ---------- */
class WindGargoyle {
  constructor(x, y) {
    Object.assign(this, { type: 'gargoyle', w: 36, h: 30, hx: x, hx0: x, hy: y, hp: 3, maxHp: 3, flash: 0, state: 'perch', t: rand(1, 2), harmful: true, pogoable: true, givesHype: true,
      bolts: 6, vx: 0, vy: 0, facing: -1, anim: rand(0, 6) });
    this.x = x - 18; this.y = y - 15;
  }
  update(dt) {
    const P = Player, cx = this.x + 18, cy = this.y + 15, pc = P.center(), room = Zone.room.px;
    this.t -= dt; this.anim += dt; this.flash = Math.max(0, this.flash - dt);
    if (this.state === 'perch') {
      this.x = lerp(this.x, this.hx - 18, 1 - Math.exp(-2 * dt)); this.y = lerp(this.y, this.hy - 15 + Math.sin(this.anim * 2) * 6, 1 - Math.exp(-3 * dt));
      this.facing = sgn(pc.x - cx) || this.facing;
      if (this.t <= 0 && !P.dead && Math.abs(pc.x - cx) < 460 && pc.y > cy + 40 && pc.y - cy < 520) { this.state = 'wind'; this.t = 0.55; SFX.windup(); }
    } else if (this.state === 'wind') {
      if (Math.random() < 0.4) spawnParticle({ x: cx + rand(-30, 30), y: cy + rand(-20, 20), vx: -this.facing * 120, vy: 0, life: 0.3, size: 2, color: 'rgba(220,230,255,.6)', type: 'dot' });
      if (this.t <= 0) { const dx = pc.x - cx, dy = pc.y - cy, d = Math.hypot(dx, dy) || 1; this.vx = dx / d * 560; this.vy = dy / d * 560; this.state = 'swoop'; this.t = 1.1; SFX.whoosh(); this.facing = sgn(dx) || this.facing; }
    } else if (this.state === 'swoop') {
      this.x += this.vx * dt; this.y += this.vy * dt;
      if (Math.random() < 0.5) spawnParticle({ x: cx, y: cy, vx: -this.vx * 0.2, vy: -this.vy * 0.2, life: 0.25, size: 3, color: 'rgba(200,210,240,.5)', type: 'dot' });
      if (this.t <= 0 || pointSolid(cx + sgn(this.vx) * 20, cy) || pointSolid(cx, cy + 18)) { this.state = 'rise'; this.t = 1.2; this.vy = -330; this.vx = sgn(this.vx) * 260; }
    } else if (this.state === 'rise') {
      this.x += this.vx * dt; this.y += this.vy * dt; this.vx *= Math.max(0, 1 - 1.2 * dt);
      if (this.t <= 0 || this.y < this.hy - 15) { this.state = 'perch'; this.t = rand(1.2, 2); this.hx = clamp(cx, this.hx0 - 260, this.hx0 + 260); }
    } else { this.y -= 40 * dt; if (this.t <= 0) { this.state = 'rise'; this.t = 0.8; this.vy = -260; this.vx = 0; } }
    this.x = clamp(this.x, room.x + 8, room.x + room.w - this.w - 8); this.y = clamp(this.y, room.y + 8, room.y + room.h - this.h - 8);
  }
  takeHit(dmg, kx, ky) {
    this.hp -= dmg; this.flash = 0.12; this.x += kx * 24; this.state = 'hurt'; this.t = 0.3;
    if (this.hp <= 0) enemyDie(this);
    return true;
  }
  draw() {
    const cx = this.x + 18, cy = this.y + 15, flap = Math.sin(this.anim * (this.state === 'swoop' ? 4 : 10));
    ctx.save(); ctx.translate(cx, cy); ctx.scale(this.facing, 1); ctx.lineJoin = 'round';
    const col = this.flash > 0 ? '#ffffff' : '#7a7f8c';
    for (const s of [-1, 1]) {   // stone wings
      ctx.beginPath(); ctx.moveTo(s * 6, -4); ctx.lineTo(s * 26, -16 - flap * 8); ctx.lineTo(s * 22, -2 - flap * 4); ctx.lineTo(s * 30, 4 - flap * 3); ctx.lineTo(s * 8, 6); ctx.closePath(); inked(col, 2.5);
    }
    ctx.beginPath(); ctx.ellipse(0, 2, 11, 12, 0, 0, 7); inked(col, 2.5);
    ctx.beginPath(); ctx.moveTo(-6, -8); ctx.lineTo(-8, -18); ctx.lineTo(-2, -10); ctx.moveTo(6, -8); ctx.lineTo(8, -18); ctx.lineTo(2, -10); ctx.stroke();   // horns
    ctx.fillStyle = this.state === 'wind' || this.state === 'swoop' ? '#ff4a3a' : GOLD; ctx.fillRect(1, -3, 3, 3); ctx.fillRect(6, -3, 3, 3);
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(2, 5); ctx.lineTo(9, 4); ctx.stroke();
    ctx.restore();
  }
}

/* ---------- Frost Sentinel: armored ice knight, spear lunge leaves frozen ground ---------- */
class FrostPatch {
  constructor(x, y) { Object.assign(this, { x, y, life: 2.6, dead: false }); }
  update(dt) {
    this.life -= dt; if (this.life <= 0) { this.dead = true; return; }
    if (this.life < 2.45 && overlap(Player.hurtbox(), { x: this.x - 16, y: this.y - 14, w: 32, h: 14 })) Player.hurt(sgn(Player.x + Player.w / 2 - this.x) || 1);
  }
  draw() {
    const a = Math.min(1, this.life / 0.4);
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#bfefff'; ctx.strokeStyle = INK; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(this.x - 16, this.y); ctx.lineTo(this.x - 9, this.y - 12); ctx.lineTo(this.x - 3, this.y - 4); ctx.lineTo(this.x + 3, this.y - 14); ctx.lineTo(this.x + 9, this.y - 5); ctx.lineTo(this.x + 16, this.y); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
}
class FrostSentinel {
  constructor(x, y) {
    Object.assign(this, { type: 'sentinel', w: 34, h: 54, vx: 0, vy: 0, dir: -1, hp: 6, maxHp: 6, flash: 0, state: 'patrol', t: 1, onGround: false,
      harmful: true, pogoable: true, givesHype: true, bolts: 8, anim: 0, dropX: 0, clangT: 0, turnT: 0 });
    this.x = x - this.w / 2; this.y = y - this.h;
  }
  update(dt) {
    const P = Player; this.t -= dt; this.flash = Math.max(0, this.flash - dt); this.clangT = Math.max(0, this.clangT - dt); this.anim += dt * (1 + Math.abs(this.vx) / 60);
    const pcx = P.x + P.w / 2, cx = this.x + this.w / 2, front = sgn(pcx - cx) === this.dir;
    const close = !P.dead && Math.abs(pcx - cx) < 240 && Math.abs(P.y + P.h - (this.y + this.h)) < 60;
    switch (this.state) {
      case 'patrol':
        this.vx = approach(this.vx, this.dir * 50, 300 * dt);
        if (this.onGround && (this.hitWall || !groundAheadOf(this))) { this.dir *= -1; this.vx = 0; }
        if (close) {
          if (!front) { this.turnT += dt; if (this.turnT > 0.6) { this.dir *= -1; this.turnT = 0; } }
          else { this.state = 'aim'; this.t = 0.5; this.vx = 0; SFX.windup(); }
        } else this.turnT = 0;
        break;
      case 'aim': this.vx = 0; if (this.t <= 0) { this.state = 'lunge'; this.t = 0.34; this.dropX = cx; SFX.whoosh(); } break;
      case 'lunge':
        this.vx = this.dir * 640;
        if (Math.abs(cx - this.dropX) > 26 && this.onGround) { this.dropX = cx; FX.push(new FrostPatch(cx - this.dir * 20, this.y + this.h)); }
        if (this.hitWall || !groundAheadOf(this) || this.t <= 0) { this.state = 'recover'; this.t = 0.9; this.vx = 0; }
        break;
      case 'recover': this.vx = approach(this.vx, 0, 2000 * dt); if (this.t <= 0) this.state = 'patrol'; break;
      default: this.vx = approach(this.vx, 0, 900 * dt); if (this.t <= 0) this.state = 'patrol';
    }
    this.vy = Math.min(this.vy + TUNE.gravity * dt, 900);
    moveBody(this, dt);
  }
  takeHit(dmg, kx, ky, src) {
    if (src === 'fwd' && kx === -this.dir && (this.state === 'patrol' || this.state === 'aim')) {
      if (this.clangT <= 0) { this.clangT = 0.2; SFX.clang(); pop(this.x + this.w / 2, this.y - 8, 'CLANG!', { size: 24, color: '#bfefff', burstColor: '#2a4a66' }); }
      Player.vx = -kx * 330; Player.recoilT = 0.12;
      return false;
    }
    this.hp -= dmg * (this.state === 'recover' ? 1.5 : 1); this.flash = 0.12;
    if (this.state !== 'lunge') this.vx = kx * 90;
    if (this.hp <= 0) { enemyDie(this); burst(this.x + 17, this.y + 27, 16, { colors: ['#bfefff', '#9fd8e8', BONE], maxSpeed: 420 }); SFX.crystal(); }
    return true;
  }
  draw() {
    const cx = this.x + this.w / 2, by = this.y + this.h, step = this.state === 'patrol' ? Math.sin(this.anim * 6) : 0, lunge = this.state === 'lunge' ? 1 : 0;
    ctx.save(); ctx.translate(cx, by); ctx.scale(this.dir, 1); ctx.lineJoin = 'round';
    const col = this.flash > 0 ? '#ffffff' : '#9fc8e0';
    limb(-5, -18, Math.PI / 2 + step * 0.4, 18, '#5a7a96', 6); limb(5, -18, Math.PI / 2 - step * 0.4 - lunge * 0.5, 18, '#5a7a96', 6);
    rr(-13, -44, 26, 28, 5); inked(col, 3);                                          // ice armor
    ctx.strokeStyle = 'rgba(13,11,16,.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-8, -40); ctx.lineTo(0, -30); ctx.lineTo(8, -40); ctx.stroke();
    ctx.beginPath(); ctx.arc(1, -52, 10, 0, 7); inked(col, 3);                          // helm
    ctx.fillStyle = INK; ctx.fillRect(-4, -54, 13, 4); ctx.fillStyle = this.state === 'aim' ? '#ff4a3a' : '#6fd3ff'; ctx.fillRect(2, -53, 6, 2);
    ctx.beginPath(); ctx.moveTo(-6, -61); ctx.lineTo(1, -72); ctx.lineTo(8, -61); inked('#bfefff', 2);
    // shield on the back arm, spear in front
    rr(-20, -46, 9, 26, 3); inked('#6b8aa8', 2.5);
    const sx = this.state === 'aim' ? -6 : lunge ? 16 : 4;
    ctx.fillStyle = '#6b4a30'; ctx.fillRect(sx - 10, -34, 46, 4); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(sx - 10, -34, 46, 4);
    ctx.beginPath(); ctx.moveTo(sx + 36, -38); ctx.lineTo(sx + 48, -32); ctx.lineTo(sx + 36, -26); ctx.closePath(); inked('#bfefff', 2);
    if (this.state === 'aim' && Math.sin(Game.time * 30) > 0) { ctx.fillStyle = '#ffffff'; ctx.fillRect(sx + 44, -34, 4, 4); }
    ctx.restore();
  }
}

/* ---------- Blizzard Bat: swoops in packs, frost needles slow Nathan ---------- */
class FrostNeedle {
  constructor(x, y, vx, vy) { Object.assign(this, { x, y, vx, vy, life: 2.2, dead: false, friendly: false, t: 0 }); }
  box() { return { x: this.x - 10, y: this.y - 10, w: 20, h: 20 }; }
  update(dt) {
    this.t += dt; this.life -= dt; this.x += this.vx * dt; this.y += this.vy * dt;
    if (this.life <= 0 || pointSolid(this.x, this.y)) { this.dead = true; burst(this.x, this.y, 5, { color: '#bfefff', maxSpeed: 160 }); return; }
    if (overlap({ x: this.x - 5, y: this.y - 5, w: 10, h: 10 }, Player.hurtbox()) && !(Player.dashT > 0 && Save.data.up.staticDash)) {
      this.dead = true; Player.slowT = 2.4; SFX.crystal();
      pop(Player.x + 11, Player.y - 16, 'CHILLED!', { size: 24, color: '#bfefff', burstColor: '#2a4a66', burst: false });
      burst(this.x, this.y, 10, { colors: ['#bfefff', BONE], maxSpeed: 220 });
    }
  }
  onBat() { this.dead = true; burst(this.x, this.y, 8, { color: '#bfefff', maxSpeed: 220 }); SFX.crystal(); }
  draw() {
    const a = Math.atan2(this.vy, this.vx);
    ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(a);
    ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-8, -3); ctx.lineTo(-8, 3); ctx.closePath(); inked('#dff6ff', 1.8);
    ctx.restore();
  }
}
class BlizzardBat {
  constructor(x, y) {
    Object.assign(this, { type: 'bat', w: 26, h: 18, hx: x, hy: y, hp: 1, maxHp: 1, flash: 0, state: 'hang', t: rand(0.3, 1.2), harmful: true, pogoable: true, givesHype: true,
      bolts: 2, vx: 0, vy: 0, anim: rand(0, 6), shot: false });
    this.x = x - 13; this.y = y - 9;
  }
  update(dt) {
    const P = Player, cx = this.x + 13, cy = this.y + 9, pc = P.center(), d = Math.hypot(pc.x - cx, pc.y - cy), room = Zone.room.px;
    this.t -= dt; this.anim += dt * 14; this.flash = Math.max(0, this.flash - dt);
    if (this.state === 'hang') {
      this.vx = approach(this.vx, (this.hx - cx) * 2, 600 * dt); this.vy = approach(this.vy, (this.hy - cy) * 2 + Math.sin(this.anim * 0.3) * 40, 600 * dt);
      if (d < 420 && this.t <= 0 && !P.dead) { this.state = 'swoop'; this.t = 1.1; this.shot = false; SFX.whoosh(); }
    } else if (this.state === 'swoop') {
      const dx = pc.x - cx, dy = pc.y - 10 - cy, dd = Math.hypot(dx, dy) || 1;
      this.vx = approach(this.vx, dx / dd * 380, 900 * dt); this.vy = approach(this.vy, dy / dd * 380 + Math.sin(this.anim * 0.5) * 120, 900 * dt);
      if (!this.shot && this.t < 0.6) { this.shot = true; Bolts.push(new FrostNeedle(cx, cy, dx / dd * 420, dy / dd * 420)); SFX.shoot(); }
      if (this.t <= 0) { this.state = 'retreat'; this.t = 1.0; }
    } else {
      const dx = this.hx - cx, dy = this.hy - cy, dd = Math.hypot(dx, dy) || 1;
      this.vx = approach(this.vx, dx / dd * 300, 800 * dt); this.vy = approach(this.vy, dy / dd * 300, 800 * dt);
      if (this.t <= 0 || dd < 20) { this.state = 'hang'; this.t = rand(0.8, 1.6); }
    }
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.x = clamp(this.x, room.x + 8, room.x + room.w - this.w - 8); this.y = clamp(this.y, room.y + 8, room.y + room.h - this.h - 8);
  }
  takeHit(dmg, kx) {
    this.hp -= dmg; this.flash = 0.12;
    if (this.hp <= 0) { enemyDie(this); burst(this.x + 13, this.y + 9, 10, { colors: ['#bfefff', BONE], maxSpeed: 300 }); }
    return true;
  }
  draw() {
    const cx = this.x + 13, cy = this.y + 9, flap = Math.sin(this.anim);
    ctx.save(); ctx.translate(cx, cy); ctx.scale(sgn(this.vx) || 1, 1); ctx.lineJoin = 'round';
    const col = this.flash > 0 ? '#ffffff' : '#dff6ff';
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 4, -2); ctx.lineTo(s * 16, -8 - flap * 7); ctx.lineTo(s * 12, 0); ctx.lineTo(s * 18, 3 - flap * 3); ctx.lineTo(s * 5, 4); ctx.closePath(); inked(col, 2); }
    ctx.beginPath(); ctx.ellipse(0, 0, 7, 8, 0, 0, 7); inked('#6b8aa8', 2.2);
    ctx.fillStyle = '#6fd3ff'; ctx.fillRect(-4, -3, 2.5, 2.5); ctx.fillRect(2, -3, 2.5, 2.5);
    ctx.fillStyle = BONE; ctx.beginPath(); ctx.moveTo(-2, 4); ctx.lineTo(-1, 7); ctx.lineTo(0, 4); ctx.moveTo(1, 4); ctx.lineTo(2, 7); ctx.lineTo(3, 4); ctx.fill();
    ctx.restore();
  }
}

function makeAct2Enemy(s) {
  switch (s.k) {
    case 'crab': return new GeodeCrab(s.x, s.y);
    case 'wisp': return new CrystalWisp(s.x, s.y);
    case 'static': return new StaticElemental(s.x, s.y);
    case 'gargoyle': return new WindGargoyle(s.x, s.y);
    case 'sentinel': return new FrostSentinel(s.x, s.y);
    case 'bat': return new BlizzardBat(s.x, s.y);
    case 'drone': return new StrayDrone(s.x, s.y);
    case 'crate': return Save.data.crates[s.id] ? null : new Crate(s.x, s.y, s.id, s.bolts);
  }
  return null;
}

/* =========================================================
   GADGETS
   ========================================================= */
/* ---------- Anti-gravity crystal fields: gravity is halved inside ---------- */
function inField(P) { const c = P.center(); return FIELDS.some(f => c.x > f.x && c.x < f.x + f.w && c.y > f.y && c.y < f.y + f.h); }
function applyFields(dt) {
  const P = Player;
  if (P.dead || P.hazard || P.onGround || P.dashT > 0 || !inField(P)) { P.floaty = false; return; }
  let g = TUNE.gravity * (P.vy > 0 ? TUNE.fallMult : 1); if (P.launchT > 0) g *= 0.25;
  P.vy -= g * 0.5 * dt; P.vy = Math.min(P.vy, 470); P.floaty = true;
  if (Math.random() < 0.25) spawnParticle({ x: P.x + rand(0, P.w), y: P.y + P.h, vx: rand(-20, 20), vy: rand(-60, -20), life: 0.5, size: 2.5, color: '#d9b8ff', type: 'dot' });
}
function drawField(f) {
  const t = Game.time, cam = Game.cam;
  if (f.x > cam.x + VW || f.x + f.w < cam.x || f.y > cam.y + VH || f.y + f.h < cam.y) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(0, f.y + f.h, 0, f.y);
  g.addColorStop(0, 'rgba(185,139,255,.14)'); g.addColorStop(0.5, 'rgba(155,227,200,.07)'); g.addColorStop(1, 'rgba(185,139,255,.12)');
  ctx.fillStyle = g; ctx.fillRect(f.x, f.y, f.w, f.h);
  // slowly rising crystal motes
  const n = Math.round(f.w * f.h / 9000);
  for (let k = 0; k < n; k++) {
    const x = f.x + ((k * 97.3) % f.w), y = f.y + f.h - ((t * (18 + (k % 5) * 6) + k * 71) % f.h);
    ctx.fillStyle = k % 3 ? 'rgba(217,184,255,.55)' : 'rgba(155,227,200,.6)';
    ctx.save(); ctx.translate(x + Math.sin(t + k) * 6, y); ctx.rotate(t * 0.6 + k); ctx.fillRect(-2, -2, 4, 4); ctx.restore();
  }
  ctx.strokeStyle = `rgba(217,184,255,${0.22 + Math.sin(t * 2) * 0.08})`; ctx.lineWidth = 2; ctx.setLineDash([10, 8]); ctx.strokeRect(f.x + 2, f.y + 2, f.w - 4, f.h - 4); ctx.setLineDash([]);
  ctx.restore();
}

/* ---------- Wind gusts (Gale Gardens): telegraphed, alternate direction ---------- */
const Gust = { phase: 'calm', t: 2.5, dir: 1 };
function updateGust(dt) {
  Gust.t -= dt;
  if (Gust.t > 0) return;
  if (Gust.phase === 'calm') { Gust.phase = 'warn'; Gust.t = 1.0; SFX.wind(); }
  else if (Gust.phase === 'warn') { Gust.phase = 'blow'; Gust.t = 2.6; SFX.wind(); SFX.whoosh(); }
  else { Gust.phase = 'calm'; Gust.t = 2.6; Gust.dir *= -1; }
}
function applyGust(dt) {
  const P = Player;
  if (Gust.phase !== 'blow' || P.dead || P.hazard) return;
  const nx = P.x + Gust.dir * (P.onGround ? 150 : 290) * dt, edge = Gust.dir > 0 ? nx + P.w : nx;
  if (!pointSolid(edge, P.y + 6) && !pointSolid(edge, P.y + P.h - 6)) P.x = nx;
  if (Math.random() < 0.05) SFX.wind();
}
function drawGust() {
  if (Gust.phase === 'calm') return;
  const cam = Game.cam, t = Game.time, strong = Gust.phase === 'blow';
  ctx.save(); ctx.strokeStyle = `rgba(220,230,255,${strong ? 0.35 : 0.14})`; ctx.lineWidth = strong ? 2.5 : 1.5;
  for (let k = 0; k < (strong ? 34 : 14); k++) {
    const y = cam.y + ((k * 53) % VH), span = VW + 300, x = cam.x + (Gust.dir > 0 ? ((t * (900 + k * 17) + k * 211) % span) - 150 : span - ((t * (900 + k * 17) + k * 211) % span) - 150);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Gust.dir * (50 + (k % 4) * 26), y + Math.sin(t * 3 + k) * 4); ctx.stroke();
  }
  // leaves and petals torn off the greenhouse plants
  for (let k = 0; k < (strong ? 12 : 4); k++) {
    const y = cam.y + ((k * 131 + t * 40) % VH), x = cam.x + (Gust.dir > 0 ? ((t * 700 + k * 333) % (VW + 200)) - 100 : VW + 100 - ((t * 700 + k * 333) % (VW + 200)));
    ctx.fillStyle = k % 2 ? 'rgba(125,200,120,.7)' : 'rgba(255,159,176,.7)';
    ctx.beginPath(); ctx.ellipse(x, y, 5, 2.5, t * 6 + k, 0, 7); ctx.fill();
  }
  ctx.restore();
  if (Gust.phase === 'warn') {
    ctx.font = `16px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = `rgba(242,193,78,${0.5 + 0.5 * Math.sin(t * 12)})`;
    ctx.fillText(Gust.dir > 0 ? 'GUST INCOMING  →→→' : '←←←  GUST INCOMING', cam.x + VW / 2, cam.y + 110);
  }
}

/* ---------- Copper lightning rods: struck on a timer; swing a charged rod to charge your bat ---------- */
function updateRod(r, dt) {
  r.t += dt; r.charged = Math.max(0, r.charged - dt); r.flash = Math.max(0, r.flash - dt);
  const k = (r.t + r.ph) % r.period, warn = k > r.period - 1.0;
  if (warn && !r.warned) { r.warned = true; SFX.staticBuzz(0.6); }
  if (!warn && r.warned) {   // the strike
    r.warned = false; strikeRod(r);
  }
}
function strikeRod(r) {
  r.flash = 0.25; r.charged = 3.6; SFX.thunder(); addShake(6); Game.flashWhite = Math.max(Game.flashWhite, 0.18);
  const P = Player, c = P.center();
  if (Math.abs(c.x - r.x) < 54 && P.y + P.h > r.y - 140 && !P.dead) P.hurt(sgn(c.x - r.x) || 1);
  burst(r.x, r.y - 112, 16, { colors: ['#fff27a', '#ffffff', '#b98bff'], maxSpeed: 380 });
}
function rodRect(r) { return { x: r.x - 14, y: r.y - 118, w: 28, h: 118 }; }
function drawRod(r) {
  const x = r.x, y = r.y, warn = (r.t + r.ph) % r.period > r.period - 1.0, lit = r.charged > 0;
  ctx.save(); ctx.lineJoin = 'round';
  rr(x - 10, y - 8, 20, 8, 2); inked('#5a3a24', 2.5);
  ctx.fillStyle = INK; ctx.fillRect(x - 4, y - 112, 8, 106); ctx.fillStyle = lit ? '#ffd27a' : '#c87a3a'; ctx.fillRect(x - 2, y - 110, 4, 102);
  for (let k = 0; k < 4; k++) { ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y - 98 + k * 6, 7, 2.2, 0, 0, 7); ctx.stroke(); }
  ctx.beginPath(); ctx.arc(x, y - 116, 6, 0, 7); inked(lit ? '#fff27a' : '#c87a3a', 2.5);
  if (lit || warn) {
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y - 116, 0, x, y - 116, lit ? 60 : 30); g.addColorStop(0, `rgba(255,242,122,${lit ? 0.6 : 0.25 + 0.2 * Math.sin(Game.time * 30)})`); g.addColorStop(1, 'rgba(255,242,122,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 60, y - 176, 120, 120);
    if (lit && Math.random() < 0.4) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y - 116); ctx.lineTo(x + rand(-16, 16), y - 116 + rand(-16, 16)); ctx.stroke(); }
  }
  if (warn && !lit) { ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = `rgba(255,242,122,${0.4 + 0.4 * Math.sin(Game.time * 24)})`; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.arc(x, y - 30, 54, Math.PI, 0); ctx.stroke(); ctx.setLineDash([]); }
  if (r.flash > 0) {   // the bolt from the sky
    ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(255,255,255,${r.flash / 0.25})`; ctx.lineWidth = 5;
    ctx.beginPath(); let yy = Zone.room.px.y; ctx.moveTo(x + rand(-30, 30), yy); while (yy < y - 116) { yy += 40; ctx.lineTo(x + rand(-22, 22), Math.min(yy, y - 116)); } ctx.stroke();
  }
  ctx.restore();
  if (lit) { ctx.font = `12px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = '#fff27a'; ctx.fillText('SWING!', x, y - 134 + Math.sin(Game.time * 8) * 2); }
}

/* ---------- Icicles: shake, drop, then sit in the spikes as temporary stepping stones ---------- */
function resetIcicles() { for (const i of ICICLES) { if (i.state === 'stone') fill(i.tx, i.row, 2, 1, 0); i.state = 'hang'; i.t = 0; i.y = i.ty * TILE; i.vy = 0; i.row = -1; } }
function updateIcicle(i, dt) {
  const P = Player, c = P.center(), x = i.tx * TILE + TILE;
  i.t -= dt;
  if (i.state === 'hang') { if (!P.dead && Math.abs(c.x - x) < 130 && c.y > i.y) { i.state = 'shake'; i.t = 0.55; SFX.dirt(); } }
  else if (i.state === 'shake') { if (i.t <= 0) { i.state = 'fall'; i.vy = 0; } }
  else if (i.state === 'fall') {
    i.vy = Math.min(i.vy + 2400 * dt, 1400); i.y += i.vy * dt;
    if (overlap(P.hurtbox(), { x: x - 18, y: i.y, w: 36, h: 56 })) P.hurt(sgn(c.x - x) || 1);
    const row = Math.floor((i.y + 56) / TILE), t0 = tileAt(i.tx, row), t1 = tileAt(i.tx + 1, row);
    if (t0 || t1) {
      const stand = row - 1, rect = { x: i.tx * TILE, y: stand * TILE, w: 2 * TILE, h: TILE };
      if (!overlap(P, rect)) { fill(i.tx, stand, 2, 1, 1); markUnsafe(i.tx, stand, 2, 1); i.row = stand; i.state = 'stone'; i.t = 4.5; SFX.land(); SFX.crystal(); addShake(4); burst(x, stand * TILE + 16, 14, { colors: ['#bfefff', BONE], maxSpeed: 300, grav: 900 }); }
      else { i.state = 'gone'; i.t = 2.2; burst(x, stand * TILE, 14, { colors: ['#bfefff', BONE], maxSpeed: 300 }); }
    }
  } else if (i.state === 'stone') {
    if (i.t <= 0) { fill(i.tx, i.row, 2, 1, 0); i.state = 'gone'; i.t = 2.2; SFX.crystal(); burst(x, i.row * TILE + 16, 18, { colors: ['#bfefff', '#9fd8e8', BONE], maxSpeed: 340, grav: 900, type: 'debris' }); }
  } else if (i.state === 'gone') { if (i.t <= 0) { i.state = 'hang'; i.y = i.ty * TILE; i.grow = 1; } }
  i.grow = Math.max(0, (i.grow || 0) - dt * 1.5);
}
function onIcicleStone(P) {
  const feet = P.y + P.h;
  return ICICLES.some(i => i.state === 'stone' && Math.abs(feet - i.row * TILE) < 3 && P.x + P.w > i.tx * TILE && P.x < (i.tx + 2) * TILE);
}
function drawIcicle(i) {
  const x = i.tx * TILE + TILE;
  if (i.state === 'stone') {
    const y = i.row * TILE, crack = i.t < 1.3 && Math.sin(i.t * 30) > 0;
    ctx.save(); ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x - 30, y + 2); ctx.lineTo(x + 30, y + 2); ctx.lineTo(x + 22, y + 30); ctx.lineTo(x + 6, y + 46); ctx.lineTo(x - 8, y + 34); ctx.lineTo(x - 24, y + 30); ctx.closePath(); inked(crack ? '#ffffff' : '#bfefff', 2.5);
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(x - 22, y + 5, 30, 3);
    if (i.t < 1.3) { ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 10, y + 3); ctx.lineTo(x - 4, y + 16); ctx.lineTo(x - 12, y + 26); ctx.moveTo(x + 8, y + 3); ctx.lineTo(x + 14, y + 18); ctx.stroke(); }
    ctx.restore(); return;
  }
  if (i.state === 'gone') return;
  const sh = i.state === 'shake' ? rand(-2, 2) : 0, y = i.y, s = 1 - (i.grow || 0);
  ctx.save(); ctx.translate(x + sh, y); ctx.scale(1, s);
  ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(20, 0); ctx.lineTo(4, 56); ctx.lineTo(-4, 56); ctx.closePath(); inked('#dff6ff', 2.5);
  ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(-8, 4, 3, 30);
  ctx.restore();
  if (i.state === 'shake' && Math.random() < 0.4) spawnParticle({ x: x + rand(-20, 20), y: y + 2, vx: 0, vy: rand(40, 120), life: 0.4, size: 2, color: BONE, type: 'dot' });
}
