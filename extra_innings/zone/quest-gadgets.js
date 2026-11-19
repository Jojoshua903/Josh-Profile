'use strict';
/* =========================================================
   SIDE-QUEST GADGETS · Milo's cursed spellbooks, Monfort's
   time-trial posts, talkable quest NPCs, Byte the companion
   ========================================================= */
// floor height under a world x, searching down from y
function floorBelow(x, y) {
  const tx = Math.floor(x / TILE);
  for (let ty = Math.floor(y / TILE); ty < LH; ty++) if (tileAt(tx, ty) === 1 || tileAt(tx, ty) === 3) return ty * TILE;
  return y;
}

/* ---------- A cursed spellbook: spits rogue lightning and mini-tornadoes. Three hits seals it. ---------- */
class SpellBook {
  constructor(x, y, id) { Object.assign(this, { kind: 'qbook', x, y: y - 46, home: y - 46, id, hp: 3, t: rand(0, 6), cd: 2, flash: 0, fx: [], gone: false, n: 0 }); }
  box() { return { x: this.x - 18, y: this.y - 16, w: 36, h: 32 }; }
  update(dt) {
    this.t += dt; this.flash = Math.max(0, this.flash - dt);
    this.y = this.home + Math.sin(this.t * 1.8) * 8;
    const P = Player, c = P.center();
    if (P.attackT > 0 && P.attackType !== 'launch' && !P.hitSet.has(this) && overlap(P.hitbox(), this.box())) {
      P.hitSet.add(this); this.hp--; this.flash = 0.25; SFX.hit(false); addHitstop(0.06); addShake(5);
      burst(this.x, this.y, 14, { colors: ['#b98bff', '#e8e0ff', GOLD], maxSpeed: 360 });
      pop(this.x, this.y - 24, this.hp > 0 ? 'SLAM!' : 'SEALED!', { size: 28, color: '#d9b8ff', burstColor: '#4a3a8a' });
      if (this.hp <= 0) { this.gone = true; this.fx = []; SFX.unlock(); ring(this.x, this.y, 8, 120, 0.5, '#b98bff', 6); Quests.sealBook(this.id); return; }
    }
    // hazards, only while Nathan is close and nothing else is going on
    if (!Story.active && !P.dead && Math.hypot(c.x - this.x, c.y - this.y) < 470) {
      this.cd -= dt;
      if (this.cd <= 0) {
        this.cd = 2.6; this.n++;
        if (this.n % 2) { const fy = floorBelow(c.x, P.y + P.h - 4); this.fx.push({ k: 'bolt', x: c.x, y: fy, t: 0 }); SFX.laserCharge(); }
        else { const dir = sgn(c.x - this.x) || 1; this.fx.push({ k: 'twist', x: this.x, y: floorBelow(this.x, this.y), dir, t: 0, push: 0 }); SFX.wind(); }
      }
    }
    for (const f of this.fx) {
      f.t += dt;
      if (f.k === 'bolt' && f.t > 0.8 && !f.hit) {
        f.hit = true; SFX.thunder(); addShake(6); burst(f.x, f.y, 16, { colors: ['#e8e0ff', '#b98bff', BONE], maxSpeed: 380 });
        const hb = P.hurtbox(); if (!Story.active && hb.x < f.x + 16 && hb.x + hb.w > f.x - 16 && hb.y + hb.h > f.y - 400) P.hurt(sgn(c.x - f.x) || 1);
      }
      if (f.k === 'twist') {
        f.x += f.dir * 170 * dt; f.push -= dt;
        if (pointSolid(f.x + f.dir * 16, f.y - 20)) f.dir *= -1;
        if (f.push <= 0 && !Story.active && Math.abs(c.x - f.x) < 26 && c.y > f.y - 90 && c.y < f.y + 10) { f.push = 0.6; P.vx = f.dir * 460; P.vy = Math.min(P.vy, -420); P.launched = true; SFX.whoosh(); }
      }
    }
    this.fx = this.fx.filter(f => f.k === 'bolt' ? f.t < 1.1 : f.t < 3.6);
  }
  draw() {
    for (const f of this.fx) {
      if (f.k === 'bolt') {
        if (f.t < 0.8) { ctx.strokeStyle = `rgba(217,184,255,${0.4 + Math.sin(f.t * 30) * 0.3})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(f.x, f.y - 2, 18 + f.t * 8, 5, 0, 0, 7); ctx.stroke(); }
        else {
          const a = 1 - (f.t - 0.8) / 0.3; ctx.save(); ctx.globalAlpha = Math.max(0, a); ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = '#e8e0ff'; ctx.lineWidth = 5; ctx.beginPath(); let yy = f.y - 420; ctx.moveTo(f.x, yy);
          while (yy < f.y) { yy += 30; ctx.lineTo(f.x + rand(-12, 12), Math.min(yy, f.y)); } ctx.stroke(); ctx.restore();
        }
      } else {
        const fade = Math.min(1, f.t * 3, (3.6 - f.t) * 2);
        ctx.save(); ctx.globalAlpha = fade * 0.8; ctx.strokeStyle = '#d9d4e8'; ctx.lineWidth = 2.5;
        for (let k = 0; k < 7; k++) { const h = k * 13, w = 8 + k * 4, ph = f.t * 14 + k; ctx.beginPath(); ctx.ellipse(f.x + Math.sin(ph) * 4, f.y - 6 - h, w, 3, 0, ph % 6.28, ph % 6.28 + 4.2); ctx.stroke(); }
        ctx.restore();
      }
    }
    ctx.save(); ctx.translate(this.x + (this.flash > 0 ? rand(-2, 2) : 0), this.y); ctx.lineJoin = 'round';
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 46); g.addColorStop(0, 'rgba(185,139,255,.45)'); g.addColorStop(1, 'rgba(185,139,255,0)');
    ctx.fillStyle = g; ctx.fillRect(-46, -46, 92, 92);
    const flap = Math.sin(this.t * 7) * 0.35;
    ctx.save(); ctx.rotate(-0.25 - flap); rr(-18, -12, 18, 24, 2); inked(this.flash > 0 ? BONE : '#4a3a8a', 2.5); ctx.restore();
    ctx.save(); ctx.rotate(0.25 + flap); rr(0, -12, 18, 24, 2); inked(this.flash > 0 ? BONE : '#4a3a8a', 2.5); ctx.restore();
    ctx.fillStyle = '#e8e0ff'; ctx.fillRect(-1.5, -12, 3, 24);
    ctx.fillStyle = `rgba(255,232,90,${0.6 + Math.sin(this.t * 5) * 0.3})`; ctx.font = `11px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('ᛟ', -9, 0); ctx.fillText('ᚱ', 9, 0);
    for (let k = 0; k < this.hp; k++) { ctx.fillStyle = '#d9b8ff'; ctx.beginPath(); ctx.arc(-8 + k * 8, 22, 2.5, 0, 7); ctx.fill(); }
    ctx.restore();
  }
}

/* ---------- Coach Monfort's time-trial posts ---------- */
class TrialPost {
  constructor(end, x, y, z) { Object.assign(this, { kind: 'qtrial', end, x, y, z, t: 0, away: true, gone: false }); }
  update(dt) {
    this.t += dt;
    const c = Player.center(), touching = !Player.dead && Math.abs(c.x - this.x) < 26 && c.y > this.y - 90 && c.y < this.y + 6;
    if (!touching) { this.away = true; return; }
    if (!this.away || Story.active) return;
    this.away = false;
    if (this.end === 'start') Quests.startTrial(this.z);
    else Quests.finishTrial(this.z);
  }
  draw() {
    const x = this.x, y = this.y;
    ctx.save(); ctx.lineJoin = 'round';
    ctx.fillStyle = INK; ctx.fillRect(x - 3, y - 76, 6, 76);
    for (let k = 0; k < 5; k++) { ctx.fillStyle = k % 2 ? BONE : '#2f6a3a'; ctx.fillRect(x - 1.5, y - 74 + k * 14, 3, 14); }
    if (this.end === 'start') {
      ctx.beginPath(); ctx.arc(x, y - 88, 14, 0, 7); inked('#d9d4c8', 3);
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y - 88); ctx.lineTo(x + Math.cos(this.t * 4) * 9, y - 88 + Math.sin(this.t * 4) * 9); ctx.stroke();
      ctx.strokeStyle = 'rgba(13,11,16,.55)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(x - 8, y - 96); ctx.lineTo(x - 2, y - 88); ctx.lineTo(x - 5, y - 80); ctx.stroke();
      ctx.fillStyle = '#8a8f99'; ctx.fillRect(x - 3, y - 106, 6, 5);
      ctx.font = `12px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = GOLD;
      ctx.fillText(Quests.trial && Quests.trial.z === this.z ? 'RUNNING!' : '▶ TIME TRIAL', x, y - 112 + Math.sin(Game.time * 4) * 2);
    } else {
      for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
        const w = Math.sin(this.t * 5 + i * 0.8) * 2.5;
        ctx.fillStyle = (i + j) % 2 ? BONE : INK; ctx.fillRect(x + 3 + i * 7, y - 76 + j * 7 + w, 7, 7);
      }
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(x + 3, y - 76, 28, 21);
      ctx.font = `12px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = GOLD; ctx.fillText('FINISH', x + 14, y - 84);
    }
    ctx.restore();
  }
}

/* ---------- Immanuel's training goals: swing the practice ball into the net ---------- */
class QGoal {
  constructor(x, y, id) { Object.assign(this, { kind: 'qgoal', x, y, id, t: rand(0, 6), scored: false, near: false, gone: false }); }
  ball() { return { x: this.x, y: this.y - 10 + Math.sin(this.t * 3) * 2 }; }
  update(dt) {
    this.t += dt;
    const P = Player, b = this.ball();
    this.near = !this.scored && Math.abs(P.x + P.w / 2 - this.x) < 110;
    if (this.scored || P.attackT <= 0 || P.attackType === 'launch' || P.hitSet.has(this)) return;
    if (!overlap(P.hitbox(), { x: b.x - 13, y: b.y - 13, w: 26, h: 26 })) return;
    P.hitSet.add(this); this.scored = true;
    SFX.kick(); SFX.crowd(1.5); addShake(5); addHitstop(0.05);
    burst(this.x, b.y, 22, { colors: ['#f3ead8', '#9be36a', GOLD], maxSpeed: 460 });
    pop(this.x, this.y - 70, 'GOAL!', { size: 44, color: '#9be36a' });
    Quests.goalScored(this.id);
  }
  draw() {
    const x = this.x, y = this.y, t = this.t;
    ctx.save(); ctx.lineJoin = 'round';
    // posts and crossbar
    rr(x - 38, y - 58, 7, 58, 2); inked('#f3ead8', 2.5);
    rr(x + 31, y - 58, 7, 58, 2); inked('#f3ead8', 2.5);
    rr(x - 38, y - 62, 76, 8, 2); inked('#f3ead8', 2.5);
    // netting, sagging a little further once the ball is in it
    ctx.save(); ctx.beginPath(); ctx.rect(x - 31, y - 54, 62, 54); ctx.clip();
    ctx.strokeStyle = 'rgba(243,234,216,.35)'; ctx.lineWidth = 1;
    const sag = this.scored ? 3 + Math.sin(t * 8) * 2 : 0;
    for (let k = 0; k <= 5; k++) { ctx.beginPath(); ctx.moveTo(x - 31 + k * 12.4, y - 54); ctx.quadraticCurveTo(x - 31 + k * 12.4 + Math.sin(t * 1.4 + k) * 2, y - 27, x - 31 + k * 12.4, y); ctx.stroke(); }
    for (let k = 0; k <= 4; k++) { ctx.beginPath(); ctx.moveTo(x - 31, y - 54 + k * 13.5 + sag); ctx.lineTo(x + 31, y - 54 + k * 13.5 + sag); ctx.stroke(); }
    ctx.restore();
    if (this.scored) {
      ctx.beginPath(); ctx.arc(x - 4, y - 12, 9, 0, 7); inked('#f3ead8', 2);
      drawBallSpots(x - 4, y - 12, 9);
      ctx.beginPath(); ctx.arc(x, y - 74, 9, 0, 7); inked('#9be36a', 2);
      ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x - 4, y - 74); ctx.lineTo(x - 1, y - 71); ctx.lineTo(x + 4, y - 78); ctx.stroke();
    } else {
      const b = this.ball();
      const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 26); g.addColorStop(0, 'rgba(243,234,216,.35)'); g.addColorStop(1, 'rgba(243,234,216,0)');
      ctx.fillStyle = g; ctx.fillRect(b.x - 26, b.y - 26, 52, 52);
      ctx.beginPath(); ctx.arc(b.x, b.y, 9, 0, 7); inked('#f3ead8', 2.2);
      drawBallSpots(b.x, b.y, 9);
      if (this.near && !Story.active) {
        ctx.font = `13px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = GOLD;
        ctx.fillText('▲ ' + Bindings.label('attack') + ' · SHOOT', x, y - 76 + Math.sin(Game.time * 4) * 2);
      }
    }
    ctx.restore();
  }
}
function drawBallSpots(bx, by, r) {
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.moveTo(bx, by - r * 0.55); ctx.lineTo(bx + r * 0.4, by - r * 0.1); ctx.lineTo(bx + r * 0.2, by + r * 0.45); ctx.lineTo(bx - r * 0.2, by + r * 0.45); ctx.lineTo(bx - r * 0.4, by - r * 0.1); ctx.closePath(); ctx.fill();
  for (const [ox, oy] of [[-0.62, -0.5], [0.62, -0.5], [-0.72, 0.35], [0.72, 0.35]]) { ctx.beginPath(); ctx.arc(bx + ox * r, by + oy * r, r * 0.16, 0, 7); ctx.fill(); }
}

/* ---------- The Dugout Clipboard (quest log) ---------- */
function drawClipboard(x, y, t) {
  ctx.save(); ctx.lineJoin = 'round';
  ctx.fillStyle = INK; ctx.fillRect(x - 3, y - 44, 6, 44);
  ctx.save(); ctx.translate(x, y - 62); ctx.rotate(Math.sin(t * 1.2) * 0.03);
  rr(-16, -20, 32, 40, 3); inked('#8a5a3a', 3);
  rr(-12, -14, 24, 31, 1); inked('#f3ead8', 1.5);
  ctx.strokeStyle = 'rgba(13,11,16,.45)'; ctx.lineWidth = 1.2;
  for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(-3, -8 + k * 6); ctx.lineTo(9, -8 + k * 6); ctx.stroke(); ctx.strokeRect(-9, -10 + k * 6, 3.5, 3.5); }
  ctx.strokeStyle = FLAME; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-9, -8); ctx.lineTo(-7.5, -6.5); ctx.lineTo(-5, -11); ctx.stroke();
  rr(-7, -24, 14, 7, 2); inked('#b8bcc4', 2);
  ctx.restore();
  ctx.font = `12px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = GOLD; ctx.fillText('QUESTS', x, y - 92);
  ctx.restore();
}

/* ---------- A talkable quest character (Monfort, Renas, Byte's scrap pile, the scalpers, the keeper, a lost cat) ---------- */
const QNPC_HEAD = { vance: 64, immanuel: 56, renas: 66, bytepile: 40, scalpers: 76, keeper: 132, lostcat: 22, clipboard: 90 };
const QNPC_PROMPT = { vance: 90, immanuel: 88, renas: 92, bytepile: 66, scalpers: 98, keeper: 150, lostcat: 42, clipboard: 108 };
class QNPC {
  constructor(kind, x, y, o = {}) { Object.assign(this, { kind, x, y, facing: -1, t: rand(0, 6), near: false, gone: false, reach: 40, prompt: 'TALK', lift: 0, stop: false }, o); }
  head() { return { x: this.x, y: this.y - QNPC_HEAD[this.kind] }; }
  update(dt) {
    this.t += dt;
    const c = Player.center();
    this.near = Math.abs(c.x - this.x) < this.reach && Math.abs(Player.y + Player.h - this.y) < 30;
    if (!this.fixed && Math.abs(c.x - this.x) < 220) this.facing = sgn(c.x - this.x) || this.facing;
    if (this.kind === 'vance' && !Story.active && Math.random() < dt / 9 && Math.abs(c.x - this.x) < 300) pop(this.x + 10, this.y - 74, ['HUSTLE!', 'LEGS!', 'SPRINT!', 'HEART!'][(Math.random() * 4) | 0], { size: 18, burst: false, color: '#9be36a', vy: -40 });
    if (this.kind === 'keeper' && !this.stop) {
      const s = Math.sin(this.t * 1.6);
      if (sgn(s) !== sgn(this.lastS || 0)) dust(this.x + this.facing * (36 + s * 14), this.y, 3, this.facing);
      this.lastS = s;
    }
    if (this.kind === 'bytepile' && Math.random() < dt * 3) burst(this.x + rand(-10, 10), this.y - 22, 3, { colors: [GOLD, '#6fd3ff'], maxSpeed: 200, maxLife: 0.25 });
  }
  interact() { if (this.onTalk && !Story.active) this.onTalk(this); }
  draw() {
    const x = this.x, y = this.y, t = this.t;
    switch (this.kind) {
      case 'vance': drawVance(x, y, this.facing, t); break;
      case 'immanuel': drawImmanuel(x, y, this.facing, t); break;
      case 'renas': drawRenas(x, y, this.facing, t, { moving: false }); break;
      case 'bytepile': drawScrapPile(x, y, t); drawByteBot(x, y - 22, t, { broken: true, tilt: 0.5 }); break;
      case 'scalpers': drawScalpers(x, y, this.facing, t); break;
      case 'keeper': drawKeeper(x, y, this.facing, t, { stop: this.stop, lift: this.lift }); break;
      case 'clipboard': drawClipboard(x, y, t); break;
      case 'lostcat': {
        const home = this.cat === 'Pebble';
        if (home) {   // napping on a warm pipe
          rr(x - 26, y - 10, 52, 10, 4); inked('#a8452a', 2.5);
          ctx.strokeStyle = 'rgba(255,170,90,.5)'; ctx.lineWidth = 2;
          for (let k = 0; k < 3; k++) { const s = (t * 0.6 + k / 3) % 1; ctx.globalAlpha = 1 - s; ctx.beginPath(); ctx.moveTo(x - 14 + k * 14, y - 12 - s * 26); ctx.quadraticCurveTo(x - 9 + k * 14, y - 18 - s * 26, x - 14 + k * 14, y - 24 - s * 26); ctx.stroke(); }
          ctx.globalAlpha = 1;
          drawCat(x, y - 10, this.facing, t, { color: this.color, sleep: true });
        } else {      // batting at a glowing crystal
          const cy = y - 26 + Math.sin(t * 3) * 5;
          ctx.beginPath(); ctx.moveTo(x + 18, cy - 8); ctx.lineTo(x + 24, cy); ctx.lineTo(x + 18, cy + 8); ctx.lineTo(x + 12, cy); ctx.closePath(); inked('#d9b8ff', 2);
          drawCat(x, y, 1, t, { color: this.color, sit: true });
        }
        break;
      }
    }
    if (this.near && this.prompt && !Story.active) {
      ctx.font = `14px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = GOLD;
      ctx.fillText('▲ ' + Bindings.label('up', Game.lastInput) + ' · ' + this.prompt, x, y - QNPC_PROMPT[this.kind] + Math.sin(Game.time * 4) * 2);
    }
  }
}

/* ---------- Byte, repaired: hovers beside Nathan, hoovers up bolts, zaps flyers ---------- */
const FLYER = /Drone|Wisp|Bat|Gargoyle|Elemental/;
class ByteBuddy {
  constructor() { Object.assign(this, { kind: 'byte', x: 0, y: 0, t: 0, cd: 1.5, zap: null, face: '-_-', faceT: 0, msg: null, msgT: 6, gone: false }); }
  snap() { const P = Player; this.x = P.x + P.w / 2 - P.facing * 34; this.y = P.y - 30; }
  update(dt) {
    const P = Player; this.t += dt; this.faceT -= dt; this.msgT -= dt;
    if (this.faceT <= 0) this.face = '-_-';
    const tx = P.x + P.w / 2 - P.facing * 34, ty = P.y - 28 + Math.sin(this.t * 2.4) * 5;
    this.x = lerp(this.x, tx, 1 - Math.exp(-5 * dt)); this.y = lerp(this.y, ty, 1 - Math.exp(-5 * dt));
    if (this.zap) { this.zap.t -= dt; if (this.zap.t <= 0) this.zap = null; }
    if (this.msg && this.msgT < 0) this.msg = null;
    if (Story.active || P.dead) return;
    // hoover distant Scrap Bolts toward Nathan
    const c = P.center();
    for (const p of Pickups) {
      if (p.t < 0.3) continue;
      const d = Math.hypot(p.x - this.x, p.y - this.y);
      if (d < 380) { const dx = c.x - p.x, dy = c.y - p.y, dd = Math.hypot(dx, dy) || 1; p.x += dx / dd * 640 * dt; p.y += dy / dd * 640 * dt; p.vy = 0; if (this.faceT <= 0) { this.face = '$_$'; this.faceT = 0.5; } }
    }
    // zap anything that flies
    this.cd -= dt;
    if (this.cd <= 0) {
      let best = null, bd = 300;
      for (const e of Enemies) {
        if (e.dead || e === Zone.boss || e.untargetable || !FLYER.test(e.constructor.name)) continue;
        const d = Math.hypot(e.x + e.w / 2 - this.x, e.y + e.h / 2 - this.y); if (d < bd) { bd = d; best = e; }
      }
      if (best) {
        this.cd = 2.4; this.face = '>:('; this.faceT = 0.6;
        const ex = best.x + best.w / 2, ey = best.y + best.h / 2;
        this.zap = { x: ex, y: ey, t: 0.18 }; best.takeHit(1, sgn(ex - this.x) || 1, 0); SFX.shoot();
        burst(ex, ey, 10, { colors: ['#6fd3ff', BONE], maxSpeed: 300 });
        if (Math.random() < 0.35) this.say(['[TARGET ACQUIRED]', '[ZAP.EXE]', '[YOU\'RE WELCOME]', '[FLYING = ILLEGAL]'][(Math.random() * 4) | 0]);
      } else this.cd = 0.5;
    }
    if (!this.msg && Math.random() < dt / 22) this.say(['[BOLT DETECTED]', '[USER STILL SLOW]', '[BATTERY: 97%]', '[HUSTLE? ERROR]', '[I MISS NOTHING]'][(Math.random() * 5) | 0]);
  }
  say(m) { this.msg = m; this.msgT = 2.4; }
  draw() {
    if (this.zap) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = '#9fe6ff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(this.x, this.y); for (let k = 1; k <= 5; k++) ctx.lineTo(lerp(this.x, this.zap.x, k / 5) + (k < 5 ? rand(-8, 8) : 0), lerp(this.y, this.zap.y, k / 5) + (k < 5 ? rand(-8, 8) : 0)); ctx.stroke(); ctx.restore();
    }
    drawByteBot(this.x, this.y, this.t, { face: this.face });
    if (this.msg) {
      ctx.font = '10px ui-monospace, Menlo, monospace'; const w = ctx.measureText(this.msg).width + 10;
      ctx.fillStyle = 'rgba(13,26,20,.88)'; ctx.fillRect(this.x - w / 2, this.y - 40, w, 15);
      ctx.fillStyle = '#50dc78'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(this.msg, this.x, this.y - 32);
    }
  }
}

/* ---------- Elite enemies glow gold and drop a Scrap Motherboard ---------- */
class EliteAura {
  constructor(e) { Object.assign(this, { kind: 'qelite', e, t: 0, gone: false }); }
  update(dt) {
    this.t += dt; const e = this.e;
    if (e.dead) { this.gone = true; return; }
    if (Math.random() < 0.3) spawnParticle({ x: e.x + rand(0, e.w), y: e.y + rand(0, e.h), vy: -60, life: 0.5, size: rand(2, 4), color: GOLD, type: 'dot' });
  }
  draw() {
    const e = this.e, cx = e.x + e.w / 2, cy = e.y + e.h / 2, r = Math.max(e.w, e.h) * 0.9 + 10;
    const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, r);
    g.addColorStop(0, `rgba(242,193,78,${0.35 + Math.sin(this.t * 5) * 0.1})`); g.addColorStop(1, 'rgba(242,193,78,0)');
    ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.save(); ctx.translate(cx, e.y - 12 + Math.sin(this.t * 3) * 2); ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-9, 4); ctx.lineTo(-9, -4); ctx.lineTo(-4, 0); ctx.lineTo(0, -7); ctx.lineTo(4, 0); ctx.lineTo(9, -4); ctx.lineTo(9, 4); ctx.closePath(); inked(GOLD, 2);
    ctx.restore();
  }
}
