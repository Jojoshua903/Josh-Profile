'use strict';
/* =========================================================
   ACT III ACTORS · elite stadium enemies, the cast puppets
   used in cutscenes / endings, portals and cursed trophies.
   ========================================================= */

/* ---------- Corrupted Drone Mk. II: gold-plated, fires triple laser spreads ---------- */
class GoldDrone {
  constructor(x, y) {
    Object.assign(this, { type: 'drone', w: 36, h: 30, hx: x, hy: y, vx: 0, vy: 0, hp: 7, maxHp: 7, flash: 0, plate: 0, shootT: rand(1.4, 2.4), phase: rand(0, 6),
      harmful: true, pogoable: true, givesHype: true, windup: false, engaged: false, bolts: 7 });
    this.x = x - this.w / 2; this.y = y - this.h / 2;
  }
  update(dt) {
    const P = Player;
    this.phase += dt; this.flash = Math.max(0, this.flash - dt); this.plate = Math.max(0, this.plate - dt);
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2, pcx = P.x + P.w / 2, pcy = P.y + P.h / 2;
    this.engaged = Math.hypot(pcx - cx, pcy - cy) < 500 && !P.dead;
    let tx, ty;
    if (this.engaged) { const side = sgn(cx - pcx) || 1; tx = pcx + side * 190; ty = P.y - 90; }
    else { tx = this.hx + Math.cos(this.phase * 0.6) * 60; ty = this.hy + Math.sin(this.phase * 1.3) * 24; }
    const lx = tx - this.hx, ly = ty - this.hy, ld = Math.hypot(lx, ly);
    if (ld > 420) { tx = this.hx + lx / ld * 420; ty = this.hy + ly / ld * 420; }
    this.vx = approach(this.vx, clamp((tx - cx) * 2.2, -190, 190), 560 * dt);
    this.vy = approach(this.vy, clamp((ty - cy) * 2.2, -190, 190) + Math.sin(this.phase * 4) * 30, 560 * dt);
    moveBody(this, dt);
    if (!this.engaged) { this.windup = false; this.shootT = Math.max(this.shootT, 0.9); return; }
    this.shootT -= dt;
    if (this.shootT < 0.5 && !this.windup) { this.windup = true; SFX.laserCharge(); }
    if (this.shootT <= 0) {
      const base = Math.atan2(pcy - cy, pcx - cx);
      for (const k of [-1, 0, 1]) { const a = base + k * 0.24, b = new Bolt(cx, cy + 6, Math.cos(a) * 310, Math.sin(a) * 310); b.red = true; Bolts.push(b); }
      SFX.shoot(); SFX.laser(); this.shootT = rand(2.2, 2.9); this.windup = false;
      this.vx -= Math.cos(base) * 140; this.vy -= Math.sin(base) * 140;
    }
  }
  takeHit(dmg, kx, ky, src) {
    // gold plating: light swings only chip it. Heavy combo hits, pogo, bombs and reflected lasers bite.
    const heavy = src === undefined || src === 'boom' || src === 'down' || (src === 'fwd' && Player.comboIdx === 3);
    this.hp -= heavy ? dmg : dmg * 0.55; this.flash = 0.12;
    if (!heavy && this.plate <= 0) { this.plate = 0.4; SFX.clang(); pop(this.x + this.w / 2, this.y - 8, 'PLATED!', { size: 20, color: GOLD, burstColor: '#5a4320' }); }
    this.vx = kx * TUNE.knockback * (heavy ? 1.3 : 0.7); this.vy = (ky || -0.4) * TUNE.knockback * 0.8;
    this.shootT += 0.3; this.windup = false;
    if (this.hp <= 0) enemyDie(this);
    return true;
  }
  draw() {
    ctx.save(); ctx.translate(this.x + this.w / 2, this.y + this.h / 2); ctx.rotate(clamp(this.vx / 600, -0.35, 0.35)); ctx.lineJoin = 'round';
    const s = Math.cos(this.phase * 45);
    ctx.strokeStyle = INK; ctx.lineWidth = 3;
    for (const ox of [-12, 12]) { ctx.beginPath(); ctx.moveTo(ox, -12); ctx.lineTo(ox, -19); ctx.stroke(); ctx.fillStyle = 'rgba(255,246,216,.8)'; ctx.fillRect(ox - 12 * Math.abs(s), -22, 24 * Math.abs(s), 4); }
    ctx.beginPath(); ctx.moveTo(-9, 9); ctx.lineTo(-14, 17); ctx.moveTo(9, 9); ctx.lineTo(14, 17); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 0, 19, 14, 0, 0, 7); inked(this.flash > 0 ? '#ffffff' : '#c9a33a', 3);
    ctx.fillStyle = this.plate > 0 ? '#ffffff' : '#ffe08a'; ctx.fillRect(-15, -4, 30, 3);   // the plating seam
    ctx.fillStyle = INK; for (const rx of [-12, -4, 4, 12]) ctx.fillRect(rx - 1, 6, 2, 2);
    if (this.windup) { ctx.shadowColor = '#ff4a3a'; ctx.shadowBlur = 22; }
    ctx.beginPath(); ctx.arc(0, -1, 7, 0, 7); inked(this.windup ? '#ffd0c8' : '#ff4a3a', 2.5);
    ctx.shadowBlur = 0;
    const pdx = Player.x - this.x, pdy = Player.y - this.y, pd = Math.hypot(pdx, pdy) || 1;
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(pdx / pd * 3, -1 + pdy / pd * 3, 2.5, 0, 7); ctx.fill();
    ctx.restore();
  }
}

/* ---------- Shadow Umpire: teleports behind Nathan and swings a dark flag ---------- */
class ShadowUmpire {
  constructor(x, y) {
    Object.assign(this, { type: 'umpire', w: 28, h: 68, hp: 8, maxHp: 8, flash: 0, harmful: true, pogoable: true, givesHype: true, state: 'lurk', t: rand(1, 2),
      facing: -1, alpha: 0.85, anim: rand(0, 6), bolts: 6, vx: 0, vy: 0, onGround: false, untargetable: false, flag: 0 });
    this.x = x - this.w / 2; this.y = y - this.h;
  }
  // a spot behind Nathan with floor under it (or in front, if behind is a wall or a pit)
  blinkSpot() {
    const P = Player, pcx = P.x + P.w / 2, feet = P.y + P.h, r = Zone.room.px;
    for (const side of [-P.facing, P.facing]) {
      const bx = clamp(pcx + side * 74, r.x + 2 * TILE, r.x + r.w - 2 * TILE);
      if (pointSolid(bx, feet - 10) || pointSolid(bx, feet - 50)) continue;
      const ly = landYAt(bx, feet - 8), tx = Math.floor(bx / TILE);
      if (ly - feet > 150 || tileAt(tx, ly / TILE - 1) === 2) continue;
      return { x: bx, y: ly };
    }
    return null;
  }
  update(dt) {
    this.anim += dt; this.flash = Math.max(0, this.flash - dt); this.t -= dt;
    const P = Player, cx = this.x + this.w / 2, pcx = P.x + P.w / 2;
    const d = Math.hypot(pcx - cx, (P.y + P.h) - (this.y + this.h));
    switch (this.state) {
      case 'lurk':
        this.alpha = approach(this.alpha, 0.85, dt * 2); this.harmful = true; this.flag = approach(this.flag, 0, dt * 3);
        this.facing = sgn(pcx - cx) || this.facing; this.vx = approach(this.vx, d < 600 ? this.facing * 60 : 0, 300 * dt);
        if (this.t <= 0 && d < 520 && !P.dead) { this.state = 'vanish'; this.t = 0.45; SFX.poof(); }
        break;
      case 'vanish':
        this.vx = 0; this.alpha = approach(this.alpha, 0, dt * 2.4);
        if (this.t <= 0) { this.state = 'gone'; this.t = 0.35; this.untargetable = true; this.harmful = false; }
        break;
      case 'gone':
        if (this.t <= 0) {
          const s = this.blinkSpot();
          if (s) { this.x = s.x - this.w / 2; this.y = s.y - this.h; this.vy = 0; }
          this.facing = sgn(pcx - (this.x + this.w / 2)) || 1;
          this.state = 'appear'; this.t = 0.6; this.untargetable = false; SFX.windup();
          burst(this.x + this.w / 2, this.y + this.h / 2, 14, { colors: ['#2a1a3a', '#7a1f6e', '#000000'], type: 'puff', maxSpeed: 200, minSize: 5, maxSize: 11, maxLife: 0.6, drag: 2 });
        }
        break;
      case 'appear':
        this.alpha = approach(this.alpha, 1, dt * 4); this.flag = approach(this.flag, 1, dt * 3);
        if (this.t <= 0) { this.state = 'swing'; this.t = 0.24; SFX.whoosh(); }
        break;
      case 'swing': {
        this.flag = -1;
        const hb = { x: this.facing > 0 ? this.x + this.w - 4 : this.x - 66, y: this.y + 4, w: 70, h: 60 };
        if (!P.dead && overlap(P.hurtbox(), hb)) P.hurt(this.facing);
        if (Math.random() < 0.6) spawnParticle({ x: hb.x + rand(0, hb.w), y: hb.y + rand(0, hb.h), vx: this.facing * rand(60, 200), vy: rand(-60, 60), life: 0.3, size: rand(3, 5), color: Math.random() < 0.5 ? '#7a1f6e' : '#1a0a20', type: 'dot' });
        if (this.t <= 0) { this.state = 'recover'; this.t = 1.0; }
        break;
      }
      case 'recover':
        this.flag = approach(this.flag, 0, dt * 2);
        if (this.t <= 0) { this.state = 'lurk'; this.t = rand(1.4, 2.2); }
        break;
    }
    if (this.state !== 'gone') { this.vy = Math.min(this.vy + TUNE.gravity * dt, 900); moveBody(this, dt); }
  }
  takeHit(dmg, kx) {
    if (this.untargetable || this.state === 'gone') return false;
    this.hp -= this.state === 'recover' ? dmg * 1.3 : dmg; this.flash = 0.12;
    this.vx = kx * 200;
    if (this.hp <= 0) { enemyDie(this); return true; }
    if (this.state === 'lurk' && Math.random() < 0.45) { this.state = 'vanish'; this.t = 0.3; }
    return true;
  }
  draw() {
    const cx = this.x + this.w / 2, fy = this.y + this.h, t = this.anim;
    ctx.save(); ctx.globalAlpha = this.alpha; ctx.translate(cx, fy); ctx.scale(this.facing, 1); ctx.lineJoin = 'round';
    // tattered cloak
    ctx.beginPath(); ctx.moveTo(-10, -60); ctx.quadraticCurveTo(-20, -30, -18, 0);
    for (let k = 0; k < 4; k++) ctx.lineTo(-12 + k * 9, (k % 2 ? -7 : 0) + Math.sin(t * 6 + k) * 2);
    ctx.lineTo(18, 0); ctx.quadraticCurveTo(18, -34, 10, -60); ctx.closePath();
    inked(this.flash > 0 ? '#ffffff' : '#1a1020', 3);
    ctx.strokeStyle = 'rgba(122,31,110,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-4, -50); ctx.lineTo(-6, -6); ctx.moveTo(6, -50); ctx.lineTo(8, -6); ctx.stroke();
    // hood + glowing eyes, umpire mask bars
    ctx.beginPath(); ctx.arc(0, -64, 11, 0, 7); inked('#120a18', 3);
    ctx.strokeStyle = 'rgba(243,234,216,.4)'; ctx.lineWidth = 1.5; for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(k * 4, -72); ctx.lineTo(k * 4, -57); ctx.stroke(); }
    ctx.save(); ctx.shadowColor = '#d9b8ff'; ctx.shadowBlur = 10; ctx.fillStyle = '#e6d6ff'; ctx.fillRect(1, -66, 3, 2.5); ctx.fillRect(6, -66, 3, 2.5); ctx.restore();
    // the dark flag
    const fa = this.flag > 0 ? -1.2 - this.flag * 1.2 : this.flag < 0 ? 0.6 : -0.5;
    const [hx, hy] = limb(4, -46, fa, 13, '#1a1020', 4);
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(fa);
    ctx.fillStyle = INK; ctx.fillRect(0, -1.5, 34, 3);
    ctx.beginPath(); ctx.moveTo(22, -2); ctx.quadraticCurveTo(32, -16 + Math.sin(t * 8) * 3, 44, -10); ctx.lineTo(34, -2); ctx.closePath(); inked('#7a1f6e', 2);
    ctx.restore();
    ctx.restore();
    if (this.state === 'appear') { ctx.fillStyle = `rgba(217,184,255,${0.3 + 0.3 * Math.sin(Game.time * 30)})`; ctx.font = `16px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillText('!', cx, this.y - 16); }
  }
}

/* ---------- Auto-Server Turret + its tennis balls ---------- */
class ServeBall {
  constructor(x, y, vx, vy, turret) { Object.assign(this, { x, y, vx, vy, r: 8, life: 3, friendly: false, dead: false, turret, trail: [] }); }
  box() { return { x: this.x - 16, y: this.y - 16, w: 32, h: 32 }; }
  update(dt) {
    this.life -= dt;
    this.trail.push({ x: this.x, y: this.y }); if (this.trail.length > 7) this.trail.shift();
    const T0 = this.turret;
    if (this.friendly && T0 && !T0.dead) {            // returned: straight back into the cannon
      const dx = T0.x + T0.w / 2 - this.x, dy = T0.y + T0.h / 2 - this.y, d = Math.hypot(dx, dy) || 1;
      this.vx = lerp(this.vx, dx / d * 1100, 1 - Math.exp(-9 * dt)); this.vy = lerp(this.vy, dy / d * 1100, 1 - Math.exp(-9 * dt));
      if (d < 26) { this.dead = true; T0.returned(); return; }
    }
    this.x += this.vx * dt; this.y += this.vy * dt;
    if (this.life <= 0 || (pointSolid(this.x, this.y) && !(this.friendly && T0 && !T0.dead))) { this.dead = true; burst(this.x, this.y, 8, { color: '#e8f060', maxSpeed: 220 }); return; }
    if (!this.friendly && overlap({ x: this.x - this.r, y: this.y - this.r, w: this.r * 2, h: this.r * 2 }, Player.hurtbox())) { Player.hurt(sgn(this.vx) || 1); this.dead = true; }
  }
  onBat() {
    this.friendly = true; this.life = 2; SFX.deflect(); addHitstop(0.08); addShake(6);
    pop(this.x, this.y - 18, 'RETURN!', { size: 30, color: '#e8f060', burstColor: '#3f7a2a' }); ring(this.x, this.y, 6, 60, 0.3, '#e8f060', 5);
  }
  draw() {
    ctx.lineCap = 'round';
    for (let i = 1; i < this.trail.length; i++) { ctx.strokeStyle = `rgba(232,240,96,${i / this.trail.length * 0.8})`; ctx.lineWidth = i * 1.5; ctx.beginPath(); ctx.moveTo(this.trail[i - 1].x, this.trail[i - 1].y); ctx.lineTo(this.trail[i].x, this.trail[i].y); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, 7); inked(this.friendly ? '#ffd27a' : '#e8f060', 2.5);
    ctx.strokeStyle = BONE; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(this.x - 6, this.y, 6, -0.9, 0.9); ctx.stroke();
    if (!this.friendly && Math.hypot(Player.x - this.x, Player.y - this.y) < 170) { ctx.font = `12px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = '#e8f060'; ctx.fillText('PARRY!', this.x, this.y - 18); }
  }
}
class AutoServer {
  constructor(o) {
    Object.assign(this, { type: 'turret', w: 34, h: 34, dir: o.dir, hp: 3, maxHp: 3, flash: 0, harmful: false, pogoable: true, givesHype: true, t: rand(0.8, 1.6), warned: false, bolts: 5, recoil: 0 });
    this.x = o.x - this.w / 2; this.y = o.y - this.h / 2;
  }
  muzzle() { const c = { x: this.x + this.w / 2, y: this.y + this.h / 2 }, o = { down: [0, 1], left: [-1, 0], right: [1, 0] }[this.dir]; return { x: c.x + o[0] * 22, y: c.y + o[1] * 22 }; }
  update(dt) {
    this.flash = Math.max(0, this.flash - dt); this.recoil = Math.max(0, this.recoil - dt * 4);
    const P = Player, m = this.muzzle(), c = P.center(), d = Math.hypot(c.x - m.x, c.y - m.y);
    if (d > 780 || P.dead) { this.t = Math.max(this.t, 0.6); this.warned = false; return; }
    this.t -= dt;
    if (this.t < 0.5 && !this.warned) { this.warned = true; SFX.windup(); }
    if (this.t <= 0) {
      const tx = c.x + P.vx * 0.18, ty = c.y + P.vy * 0.1, dx = tx - m.x, dy = ty - m.y, dd = Math.hypot(dx, dy) || 1;
      Bolts.push(new ServeBall(m.x, m.y, dx / dd * 640, dy / dd * 640, this));
      SFX.serve(); this.recoil = 1; this.t = 1.75; this.warned = false;
    }
  }
  returned() { this.takeHit(2); pop(this.x + this.w / 2, this.y - 10, 'ACE!', { size: 34, color: '#e8f060', burstColor: '#3f7a2a' }); SFX.hit(true); addShake(6); }
  takeHit(dmg) {
    this.hp -= dmg; this.flash = 0.12; SFX.clang();
    if (this.hp <= 0) enemyDie(this);
    return true;
  }
  draw() {
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2, ang = { down: Math.PI / 2, left: Math.PI, right: 0 }[this.dir], rc = this.recoil * 5;
    ctx.save(); ctx.translate(cx, cy); ctx.lineJoin = 'round';
    // mount plate
    rr(-18, -18, 36, 36, 6); inked(this.flash > 0 ? '#ffffff' : '#8a6a2a', 3);
    ctx.rotate(ang); ctx.translate(-rc, 0);
    rr(0, -9, 26, 18, 3); inked('#3a3340', 3);
    ctx.fillStyle = this.t < 0.5 ? (Math.sin(Game.time * 40) > 0 ? '#e8f060' : '#ff4a3a') : '#e8f060'; ctx.beginPath(); ctx.arc(24, 0, 5, 0, 7); ctx.fill();
    ctx.restore();
    ctx.beginPath(); ctx.arc(cx, cy, 9, 0, 7); inked(GOLD, 2.5);
    ctx.font = `8px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = INK; ctx.fillText('A-S', cx, cy);
  }
}

function makeAct3Enemy(s) {
  switch (s.k) {
    case 'golddrone': return new GoldDrone(s.x, s.y);
    case 'umpire': return new ShadowUmpire(s.x, s.y);
    case 'crate': return Save.data.crates[s.id] ? null : new Crate(s.x, s.y, s.id, s.bolts);
  }
  return null;
}

/* =========================================================
   CAST PUPPETS · anyone from the crew, drawn anywhere
   ========================================================= */
const HEADS = { adam: 62, josh: 60, renas: 62, lars: 56, daniel: 66, fionn: 66, milo: 76, deniz: 70, reshman: 34, cat: 20, nathan: 60, evil: 64 };
let _joshPuppet = null;
function fakeNathan(x, y, facing, o = {}) {
  return { x: x - 11, y: y - 44, w: 22, h: 44, facing, sx: 1, sy: 1, invuln: 0, healT: 0, onGround: true, vx: o.walking ? 120 : 0, runPhase: o.walking ? Game.time * 12 : 0,
    dashT: 0, vy: 0, attackT: 0, attackDur: 0.2, attackType: 'fwd', comboIdx: 0, lie: o.lie || 0, noBat: !!o.noBat, batLook: o.bat || 'wood', shield: 0, launched: false, sliding: false };
}
function drawReshmanAt(x, y, t) {
  const j = Math.sin(t * 22) * 0.8;
  ctx.save(); ctx.translate(x + j, y); ctx.fillStyle = '#000000';
  ctx.beginPath(); ctx.moveTo(-14, 0); ctx.quadraticCurveTo(-16, -26, 0, -28); ctx.quadraticCurveTo(16, -26, 14, 0);
  for (let k = 0; k < 4; k++) ctx.quadraticCurveTo(10 - k * 8, 4, 6 - k * 8, 0);
  ctx.fill(); ctx.restore();
  const blink = Math.sin(t * 1.7) > 0.96;
  ctx.save(); ctx.shadowColor = BONE; ctx.shadowBlur = 12; ctx.fillStyle = BONE;
  for (const ox of [-5, 5]) { ctx.beginPath(); ctx.ellipse(x + ox, y - 16, 2.6, blink ? 0.4 : 4, 0, 0, 7); ctx.fill(); }
  ctx.restore();
}
function drawCastMember(kind, x, y, facing, t, o = {}) {
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  if (o.lie && kind !== 'nathan') { ctx.translate(x, y); ctx.rotate(-facing * o.lie * Math.PI / 2 * 0.92); ctx.translate(-x, -y); }
  switch (kind) {
    case 'adam': drawAdam(x, y, facing, t, { pose: o.pose || 'idle', run: !!o.walking, racket: o.racket }); if (o.bruised) drawBruises(x, y, facing, o.pose === 'kneel'); break;
    case 'evil': drawEvilAdam(x, y, facing, t, { pose: o.pose || 'idle', aura: o.aura !== false }); break;
    case 'josh': {
      const j = _joshPuppet || (_joshPuppet = new Josh(0, 0));
      Object.assign(j, { x: x - 11, y: y - 46, facing, vx: o.walking ? 1 : 0, phase: t, near: false, shop: false });
      if (o.drone) { ctx.beginPath(); ctx.ellipse(x, y + 8, 26, 9, 0, 0, 7); inked('#3b4f66', 3); ctx.fillStyle = 'rgba(243,234,216,.75)'; const s = Math.abs(Math.cos(t * 45)); ctx.fillRect(x - 28 * s, y + 14, 56 * s, 3); }
      j.draw(); break;
    }
    case 'renas': drawRenas(x, y, facing, t, { moving: o.moving !== undefined ? o.moving : !!o.walking }); break;
    case 'lars': drawLars(x, y, facing, t, { cats: o.cats, lamp: false, hammer: o.hammer }); break;
    case 'daniel': drawDaniel(x, y, facing, t, { rocket: o.rocket !== false, arm: o.arm }); break;
    case 'fionn': drawFionn(x, y, facing, t, { cast: o.cast || 0 }); break;
    case 'milo': drawMilo(x, y - (o.float ? 12 + Math.sin(t * 2) * 4 : 0), facing, t, { cast: !!o.cast }); break;
    case 'deniz': drawDeniz(x, y, facing, t, { hippie: true, raise: !!o.cast, sit: !!o.sit }); break;
    case 'reshman': drawReshmanAt(x, y, t); break;
    case 'cat': drawCat(x, y, facing, t, { color: o.color, sleep: o.sleep, sit: !o.sleep, scale: o.scale }); break;
    case 'nathan': drawNathan(fakeNathan(x, y, facing, o)); break;
  }
  ctx.restore();
}
// bruises and a cracked racket for poor normal Adam
function drawBruises(x, y, facing, kneel) {
  ctx.save(); ctx.translate(x, y + (kneel ? 9 : 0)); ctx.scale(facing, 1);
  ctx.fillStyle = 'rgba(122,60,140,.55)'; ctx.beginPath(); ctx.ellipse(-2, -44, 3, 2.2, 0, 0, 7); ctx.ellipse(6, -24, 3, 2, 0.4, 0, 7); ctx.fill();
  ctx.fillStyle = BONE; ctx.fillRect(8, -50, 5, 2.5); ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.strokeRect(8, -50, 5, 2.5);   // band-aid
  ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(18, -64); ctx.lineTo(23, -58); ctx.lineTo(19, -54); ctx.lineTo(26, -49); ctx.stroke();   // crack in the racket
  ctx.restore();
}
// a puppet you can place in a room: walks, talks, fades
class Actor {
  constructor(kind, x, y, o = {}) {
    Object.assign(this, { kind, x, y, facing: 1, t: rand(0, 6), walkTo: null, speed: 150, gone: false, near: false, reach: 0, prompt: null, o: {} }, o);
  }
  head() { return { x: this.x, y: this.y - (HEADS[this.kind] || 60) - (this.o.float ? 14 : 0) }; }
  update(dt) {
    this.t += dt;
    if (this.walkTo !== null) {
      const d = this.walkTo - this.x;
      if (Math.abs(d) < 4) { this.x = this.walkTo; this.walkTo = null; } else { this.x += sgn(d) * this.speed * dt; this.facing = sgn(d); }
    }
    this.o.walking = this.walkTo !== null;
    if (this.reach) { const c = Player.center(); this.near = Math.abs(c.x - this.x) < this.reach && Math.abs(Player.y + Player.h - this.y) < 30; }
  }
  interact() { if (this.onTalk && !Story.active) this.onTalk(this); }
  draw() {
    drawCastMember(this.kind, this.x, this.y, this.facing, this.t, this.o);
    if (this.near && this.prompt && !Story.active) {
      ctx.font = `14px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = GOLD;
      ctx.fillText('▲ ' + Bindings.label('up', Game.lastInput) + ' · ' + this.prompt, this.x, this.head().y - 26 + Math.sin(Game.time * 4) * 2);
    }
  }
}

/* ---------- Portals (the crew jumps in through these) ---------- */
function drawPortal(x, y, r, t, col = '111,211,255', open = 1) {
  if (open <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(open, open);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.6); g.addColorStop(0, `rgba(${col},.5)`); g.addColorStop(1, `rgba(${col},0)`);
  ctx.fillStyle = g; ctx.fillRect(-r * 1.6, -r * 1.6, r * 3.2, r * 3.2);
  ctx.beginPath(); ctx.ellipse(0, 0, r * 0.62, r, 0, 0, 7); ctx.fillStyle = '#0a0612'; ctx.fill();
  ctx.lineWidth = 3;
  for (let k = 0; k < 4; k++) { ctx.strokeStyle = `rgba(${col},${0.9 - k * 0.18})`; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.62 - k * 4, r - k * 6, 0, t * (3 + k) + k, t * (3 + k) + k + 4.2); ctx.stroke(); }
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.62 + 2, r + 2, 0, 0, 7); ctx.stroke();
  ctx.restore();
}

/* ---------- Cursed Trophies: black-and-gold, humming with dark energy ---------- */
function drawTrophy(x, y, s, t, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineJoin = 'round';
  const g = ctx.createRadialGradient(0, -20, 0, 0, -20, 60); g.addColorStop(0, `rgba(185,139,255,${0.35 + Math.sin(t * 3) * 0.1})`); g.addColorStop(1, 'rgba(185,139,255,0)');
  ctx.fillStyle = g; ctx.fillRect(-60, -80, 120, 120);
  // base + stem
  rr(-14, -6, 28, 8, 2); inked('#1a1020', 2.5); rr(-5, -20, 10, 15, 2); inked('#c9a33a', 2.5);
  // cup + handles
  ctx.beginPath(); ctx.moveTo(-18, -44); ctx.lineTo(18, -44); ctx.quadraticCurveTo(17, -22, 0, -20); ctx.quadraticCurveTo(-17, -22, -18, -44); ctx.closePath(); inked('#1a1020', 2.5);
  ctx.strokeStyle = '#c9a33a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(-20, -36, 6, Math.PI * 0.5, Math.PI * 1.5); ctx.moveTo(20, -42); ctx.arc(20, -36, 6, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
  ctx.fillStyle = '#c9a33a'; ctx.fillRect(-18, -44, 36, 3);
  ctx.fillStyle = `rgba(217,184,255,${0.6 + Math.sin(t * 5) * 0.3})`; ctx.beginPath(); ctx.arc(0, -33, 4, 0, 7); ctx.fill();
  if (o.cracked) { ctx.strokeStyle = '#d9b8ff'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-6, -44); ctx.lineTo(-1, -36); ctx.lineTo(-5, -30); ctx.lineTo(2, -22); ctx.stroke(); }
  ctx.restore();
}
