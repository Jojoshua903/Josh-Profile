'use strict';
/* =========================================================
   SECRET ACT IV · ZENNITH, THE UNFORGIVING
   A towering shadow that speaks in Nathan's voice. The crew
   jumps in through portals, one at a time, in a fixed order:
   Josh & Renas → Lars → Daniel → Milo & Deniz → Adam → Reshman.
   Each assist is a health gate, so none of them can be skipped,
   and only one plays at a time.
   ========================================================= */
const ZEN_STAGES = [
  { a: 'joshRenas', at: 0.9, time: 5 },
  { a: 'lars', at: 0.78 },
  { a: 'daniel', at: 0.62 },
  { a: 'miloDeniz', at: 0.48 },
  { a: 'adam', at: 0.34 },
  { a: 'reshman', at: 0.18 },
  { a: 'final', at: 0.01 },
];
const coreArena = () => ROOM.z_core.px;

/* ---------- Zennith's attacks ---------- */
class VoidHand {   // a shadow hand slams down where you stand, sending waves along the floor
  constructor(x) { Object.assign(this, { x, y: coreArena().y, ph: 'aim', t: 0.85, dead: false }); }
  update(dt) {
    this.t -= dt; const P = Player, fy = A.coreFloor;
    if (this.ph === 'aim') { this.x = lerp(this.x, P.x + P.w / 2, 1 - Math.exp(-2.5 * dt)); if (this.t <= 0) { this.ph = 'drop'; this.t = 0.12; } return; }
    if (this.ph === 'drop') {
      this.y = lerp(coreArena().y, fy - 60, 1 - this.t / 0.12);
      if (this.t <= 0) {
        this.ph = 'hold'; this.t = 0.5; this.y = fy - 60; SFX.slam(); addShake(12); dust(this.x, fy, 14);
        Hazards.push({ kind: 'wave', x: this.x, dir: -1, y: fy, life: 2.2 }, { kind: 'wave', x: this.x, dir: 1, y: fy, life: 2.2 });
      }
    } else if (this.ph === 'hold') { if (this.t <= 0) { this.ph = 'rise'; this.t = 0.4; } }
    else { this.y -= 1100 * dt; if (this.t <= 0) this.dead = true; }
    if ((this.ph === 'drop' || this.ph === 'hold') && overlap(P.hurtbox(), { x: this.x - 44, y: this.y, w: 88, h: 60 })) P.hurt(sgn(P.x + P.w / 2 - this.x) || 1);
  }
  draw() {
    const fy = A.coreFloor;
    if (this.ph === 'aim') { ctx.fillStyle = `rgba(122,31,110,${0.3 + 0.2 * Math.sin(Game.time * 20)})`; ctx.beginPath(); ctx.ellipse(this.x, fy, 48, 9, 0, 0, 7); ctx.fill(); }
    ctx.save(); ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(20,10,30,.85)'; ctx.lineWidth = 26; ctx.beginPath(); ctx.moveTo(this.x, coreArena().y); ctx.lineTo(this.x, this.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(this.x - 44, this.y); ctx.lineTo(this.x - 40, this.y + 50);
    for (let k = 0; k < 4; k++) { ctx.lineTo(this.x - 30 + k * 20, this.y + 64); ctx.lineTo(this.x - 22 + k * 20, this.y + 50); }
    ctx.lineTo(this.x + 44, this.y); ctx.closePath(); inked('#140a1e', 3);
    ctx.fillStyle = '#d9b8ff'; ctx.fillRect(this.x - 30, this.y + 20, 60, 3);
    ctx.restore();
  }
}
class DarkStrike {   // a rune on the floor, then dark lightning
  constructor(x, delay = 0) { Object.assign(this, { x, y: A.coreFloor, t: -delay, dead: false, struck: false }); }
  update(dt) {
    this.t += dt;
    if (this.t >= 0.95 && !this.struck) {
      this.struck = true; SFX.thunder(); addShake(5); Game.flashWhite = Math.max(Game.flashWhite, 0.12);
      const c = Player.center();
      if (Math.abs(c.x - this.x) < 38 && !Player.dead) Player.hurt(sgn(c.x - this.x) || 1);
      burst(this.x, this.y - 6, 12, { colors: ['#7a1f6e', '#d9b8ff', '#1a0f22'], maxSpeed: 380 });
    }
    if (this.t > 1.25) this.dead = true;
  }
  draw() {
    if (this.t < 0) return;
    const a = this.struck ? Math.max(0, 1 - (this.t - 0.95) / 0.3) : Math.min(1, this.t * 3);
    ctx.save(); ctx.globalAlpha = a;
    ctx.strokeStyle = '#b98bff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(this.x, this.y - 3, 34, 8, 0, 0, 7); ctx.stroke();
    if (this.struck) {
      ctx.strokeStyle = '#1a0a20'; ctx.lineWidth = 14; ctx.beginPath(); let yy = coreArena().y; ctx.moveTo(this.x + rand(-20, 20), yy);
      while (yy < this.y) { yy += 36; ctx.lineTo(this.x + rand(-16, 16), Math.min(yy, this.y)); } ctx.stroke();
      ctx.strokeStyle = '#d9b8ff'; ctx.lineWidth = 4; ctx.stroke();
    }
    ctx.restore();
  }
}
class MemoryBall {   // a baseball from that rainy night, falling out of the dark. Bat it into him.
  constructor(x, delay) { Object.assign(this, { x, y: coreArena().y + TILE, vx: 0, vy: 0, t: -delay, friendly: false, dead: false, r: 10, spin: 0 }); }
  get unhittable() { return this.t < 0.7 || this.friendly; }
  box() { return { x: this.x - 20, y: this.y - 20, w: 40, h: 40 }; }
  update(dt) {
    this.t += dt; this.spin += dt * 8; if (this.t < 0.7) return;
    const z = Zone.boss;
    if (this.friendly && z && !z.dead) {
      const dx = z.x + z.w / 2 - this.x, dy = z.y + z.h * 0.6 - this.y, d = Math.hypot(dx, dy) || 1;
      this.vx = lerp(this.vx, dx / d * 1100, 1 - Math.exp(-9 * dt)); this.vy = lerp(this.vy, dy / d * 1100, 1 - Math.exp(-9 * dt));
      this.x += this.vx * dt; this.y += this.vy * dt;
      if (d < 50) { this.dead = true; z.damage(3, 'ball'); pop(this.x, this.y - 10, 'HOME RUN!', { size: 32 }); SFX.hit(true); addShake(6); }
      return;
    }
    this.vy = Math.min(this.vy + 900 * dt, 520); this.y += this.vy * dt;
    if (this.y > A.coreFloor - 8) { this.dead = true; burst(this.x, this.y, 10, { colors: [BONE, '#7a1f6e'], maxSpeed: 260 }); SFX.dirt(); return; }
    if (overlap({ x: this.x - this.r, y: this.y - this.r, w: this.r * 2, h: this.r * 2 }, Player.hurtbox())) { Player.hurt(1); this.dead = true; }
  }
  onBat() { this.friendly = true; SFX.deflect(); addHitstop(0.08); pop(this.x, this.y - 18, 'SMACK!', { size: 28 }); }
  draw() {
    if (this.t < 0.7) { ctx.strokeStyle = `rgba(243,234,216,${0.25 + 0.2 * Math.sin(Game.time * 24)})`; ctx.setLineDash([5, 7]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.x, A.coreFloor); ctx.stroke(); ctx.setLineDash([]); return; }
    ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.spin);
    ctx.beginPath(); ctx.arc(0, 0, this.r, 0, 7); inked(this.friendly ? '#ffd27a' : BONE, 2.5);
    ctx.strokeStyle = FLAME; ctx.lineWidth = 1.5; ctx.setLineDash([2, 2]); ctx.beginPath(); ctx.arc(-8, 0, 6, -0.9, 0.9); ctx.stroke(); ctx.beginPath(); ctx.arc(8, 0, 6, Math.PI - 0.9, Math.PI + 0.9); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    if (!this.friendly && Math.hypot(Player.x - this.x, Player.y - this.y) < 170) { ctx.font = `12px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = BONE; ctx.fillText('SWING!', this.x, this.y - 22); }
  }
}
class Unforgiving {   // a wall of darkness that sweeps the whole Core. Only Reshman can stop it.
  constructor() { const ar = coreArena(); Object.assign(this, { x: ar.x + ar.w, t: 0, dead: false, stopped: false }); }
  update(dt) {
    this.t += dt; if (this.stopped) { if (this.t > 0.6) this.dead = true; return; }
    this.x -= 620 * dt;
    const P = Player;
    if (this.x <= P.x + P.w + 10) {
      this.stopped = true; this.t = 0;
      if (!Act3.reshmanUsed) reshmanParry(true);
      else P.hurt(-1);
      burst(this.x, P.y, 50, { colors: ['#1a0a20', '#7a1f6e', '#d9b8ff', BONE], maxSpeed: 800, grav: 300, maxLife: 0.9 });
    }
  }
  draw() {
    const ar = coreArena(), a = this.stopped ? Math.max(0, 1 - this.t / 0.6) : 1;
    ctx.save(); ctx.globalAlpha = a;
    const g = ctx.createLinearGradient(this.x - 60, 0, this.x + 260, 0); g.addColorStop(0, 'rgba(20,8,30,0)'); g.addColorStop(0.25, 'rgba(20,8,30,.95)'); g.addColorStop(1, 'rgba(20,8,30,.95)');
    ctx.fillStyle = g; ctx.fillRect(this.x - 60, ar.y, ar.x + ar.w - this.x + 60, ar.h);
    ctx.strokeStyle = '#d9b8ff'; ctx.lineWidth = 3; ctx.beginPath();
    for (let y = ar.y; y < ar.y + ar.h; y += 24) ctx.lineTo(this.x + Math.sin(y * 0.05 + Game.time * 12) * 14, y);
    ctx.stroke(); ctx.restore();
  }
}
class FinalSphere {   // 1% HP: one colossal dark sphere. Step up to the plate.
  constructor(z) { Object.assign(this, { z, x: z.x + z.w / 2, y: z.y + 40, vx: 0, vy: 0, r: 46, friendly: false, dead: false, t: 0 }); }
  box() { return { x: this.x - this.r, y: this.y - this.r, w: this.r * 2, h: this.r * 2 }; }
  update(dt) {
    this.t += dt;
    const P = Player, c = P.center(), z = this.z;
    if (this.friendly) {
      const dx = z.x + z.w / 2 - this.x, dy = z.y + z.h * 0.4 - this.y, d = Math.hypot(dx, dy) || 1;
      this.vx = lerp(this.vx, dx / d * 1400, 1 - Math.exp(-6 * dt)); this.vy = lerp(this.vy, dy / d * 1400, 1 - Math.exp(-6 * dt));
      this.x += this.vx * dt; this.y += this.vy * dt;
      for (let k = 0; k < 3; k++) spawnParticle({ x: this.x + rand(-30, 30), y: this.y + rand(-30, 30), vx: rand(-80, 80), vy: rand(-80, 80), life: 0.4, size: rand(4, 8), color: [GOLD, FLAME, BONE][k], type: 'dot' });
      if (d < 60) { this.dead = true; z.finalHit(); }
      return;
    }
    const dx = c.x - this.x, dy = c.y - this.y, d = Math.hypot(dx, dy) || 1;
    this.vx = lerp(this.vx, dx / d * 170, 1 - Math.exp(-2 * dt)); this.vy = lerp(this.vy, dy / d * 170, 1 - Math.exp(-2 * dt));
    this.x += this.vx * dt; this.y += this.vy * dt;
    if (Math.random() < 0.6) spawnParticle({ x: this.x + rand(-40, 40), y: this.y + rand(-40, 40), vx: rand(-30, 30), vy: rand(-30, 30), life: 0.5, size: rand(4, 9), color: Math.random() < 0.5 ? '#1a0a20' : '#7a1f6e', type: 'puff', drag: 2 });
    if (d < this.r + 8) {   // it bowls him over (no damage), then comes again
      this.dead = true; P.vx = sgn(dx) * 520; P.vy = -420; P.invuln = 0.9; addShake(10); SFX.hurt();
      pop(c.x, P.y - 30, 'STEP UP TO THE PLATE!', { size: 34, color: BONE, burstColor: '#4a1f5a' });
      z.t = 1.6; z.sphere = null;
    }
  }
  onBat() {
    this.friendly = true; addHitstop(0.6); addShake(24); Game.flashWhite = 1; SFX.bigCrack(); SFX.launch(); SFX.boom();
    pop(this.x, this.y - 60, 'OUT OF THE PARK!', { size: 80, life: 1.8, color: BONE, burstColor: FLAME });
    ring(this.x, this.y, 20, 240, 0.6, GOLD, 12);
  }
  draw() {
    const pulse = 0.5 + 0.5 * Math.sin(this.t * 10);
    const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r * 2.2); g.addColorStop(0, this.friendly ? 'rgba(255,210,122,.8)' : `rgba(122,31,110,${0.5 + pulse * 0.3})`); g.addColorStop(1, 'rgba(122,31,110,0)');
    ctx.fillStyle = g; ctx.fillRect(this.x - this.r * 2.2, this.y - this.r * 2.2, this.r * 4.4, this.r * 4.4);
    ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, 7); inked(this.friendly ? '#ffd27a' : '#140a1e', 4);
    ctx.strokeStyle = '#d9b8ff'; ctx.lineWidth = 2; for (let k = 0; k < 5; k++) { const a = this.t * 2 + k * 1.25; ctx.beginPath(); ctx.arc(this.x, this.y, this.r * 0.7, a, a + 0.6); ctx.stroke(); }
    if (!this.friendly) { ctx.font = `18px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = BONE; ctx.fillText('SWING · ' + Bindings.label('attack', Game.lastInput), this.x, this.y - this.r - 16 + Math.sin(Game.time * 6) * 3); }
  }
}

/* ================= ZENNITH ================= */
class Zennith {
  constructor() {
    const p = A.zennith;
    Object.assign(this, { type: 'boss', w: 104, h: 220, hp: 100, maxHp: 100, flash: 0, harmful: false, pogoable: true, givesHype: true, state: 'wait', t: 0, anim: 0, step: 0,
      armor: true, stage: 0, fightT: 0, batBroken: false, rise: 0, shout: null, clangT: 0, sphere: null, crack: 0, hx: p.x, hy: p.y });
    this.x = p.x - this.w / 2; this.y = p.y - this.h / 2 + 200;
  }
  begin() { this.state = 'idle'; this.t = 1.4; }
  say(text, dur = 1.8) { this.shout = { text, t: dur }; }
  busy() { return ['storm', 'unforgiving', 'final', 'beaten', 'wait'].includes(this.state); }
  update(dt) {
    this.anim += dt; this.flash = Math.max(0, this.flash - dt); this.t -= dt; this.clangT = Math.max(0, this.clangT - dt);
    this.rise = Math.min(1, this.rise + dt * 0.5);
    if (this.shout) { this.shout.t -= dt; if (this.shout.t <= 0) this.shout = null; }
    // float, sway, loom
    const tx = this.hx + Math.sin(this.anim * 0.35) * 150, ty = this.hy + Math.sin(this.anim * 0.9) * 18 + (1 - this.rise) * 200;
    if (this.state !== 'beaten') { this.x = lerp(this.x, tx - this.w / 2, 1 - Math.exp(-1.2 * dt)); this.y = lerp(this.y, ty - this.h / 2, 1 - Math.exp(-2 * dt)); }
    if (this.state === 'wait' || this.state === 'beaten' || Story.active) return;
    if (this.batBroken) this.fightT += dt;
    // crew assists: strictly one at a time, in order
    const st = ZEN_STAGES[this.stage];
    if (st && !Act3.assist && !this.busy() && this.batBroken && (this.hp <= st.at * this.maxHp + 1e-6 || (st.time && this.fightT > st.time))) { this.stage++; this.startStage(st.a); }
    const P = Player, pcx = P.x + P.w / 2;
    switch (this.state) {
      case 'idle': if (this.t <= 0) this.pick(); break;
      case 'stunned': if (this.t <= 0) { this.state = 'idle'; this.t = 0.8; } break;
      case 'storm':
        if (this.t <= 0) { this.state = 'idle'; this.t = 1.2; }
        break;
      case 'unforgiving':
        if (this.t <= 0 && !this.waveOut) { this.waveOut = true; FX.push(new Unforgiving()); SFX.boom(); SFX.thunder(); addShake(14); }
        if (this.waveOut && !FX.some(f => f instanceof Unforgiving)) { this.state = 'stunned'; this.t = 4; this.waveOut = false; this.say('…That shadow. It\'s on YOUR side?', 2); }
        break;
      case 'final':
        if (!this.sphere && this.t <= 0) { this.sphere = new FinalSphere(this); Bolts.push(this.sphere); SFX.laserCharge(); this.say('Swing, MVP. And miss. Like last time.', 2.2); }
        if (this.sphere && this.sphere.dead && !this.sphere.friendly) this.sphere = null;
        break;
    }
  }
  pick() {
    const plan = ['hand', 'rain', 'hand', 'bolts', 'rain'];
    const a = plan[this.step++ % plan.length], P = Player, ar = coreArena();
    if (a === 'hand') { FX.push(new VoidHand(P.x + P.w / 2)); SFX.slamWarn(); this.t = 2.1; this.say(['You always swing too early.', 'Pride. Always pride.', 'You know how this ends.'][(Math.random() * 3) | 0], 1.6); }
    else if (a === 'rain') { for (let k = 0; k < 5; k++) Bolts.push(new MemoryBall(clamp(P.x + P.w / 2 + (k - 2) * 120 + rand(-30, 30), ar.x + 2 * TILE, ar.x + ar.w - 2 * TILE), k * 0.25)); SFX.summon(); this.t = 2.6; }
    else { const xs = [P.x + P.w / 2]; for (let k = 0; k < 4; k++) xs.push(rand(ar.x + 80, ar.x + ar.w - 80)); xs.forEach((x, k) => FX.push(new DarkStrike(x, k * 0.15))); SFX.staticBuzz(0.4); this.t = 2.0; }
    this.state = 'idle';
  }
  startStage(a) {
    const P = Player;
    if (a === 'final') {
      this.state = 'final'; this.t = 2.4; FX.length = 0; for (const b of Bolts) b.dead = true; Hazards.length = 0;
      SFX.music('duel'); toast('1% · ONE LAST PITCH'); return;
    }
    if (a === 'reshman' && Act3.reshmanUsed) return;      // he already saved you once; the shadow can't try that trick twice
    Act3.assist = makeAssist(a, this);
    if (a === 'reshman') { this.state = 'unforgiving'; this.t = 2.6; this.waveOut = false; this.say('THE UNFORGIVING.', 2.4); SFX.windup(); toast('THE UNFORGIVING · THERE\'S NOWHERE TO RUN…'); }
  }
  storm() {   // a screen-filling barrage of dark lightning (Milo & Deniz shield you)
    const ar = coreArena();
    for (let k = 0; k < 14; k++) FX.push(new DarkStrike(ar.x + 2 * TILE + k * (ar.w - 4 * TILE) / 13, 0.1 + (k % 3) * 0.35));
    for (let k = 0; k < 14; k++) FX.push(new DarkStrike(ar.x + 2 * TILE + (k + 0.5) * (ar.w - 4 * TILE) / 13, 1.5 + (k % 3) * 0.3));
    this.state = 'storm'; this.t = 3.6; this.say('Let it pour. Like that night.', 2);
  }
  breakArmor() {
    if (!this.armor) return;
    this.armor = false; SFX.bigCrack(); addShake(14); Game.flashWhite = 0.5;
    burst(this.x + this.w / 2, this.y + this.h / 2, 40, { colors: ['#c9a33a', '#1a0f22', GOLD], maxSpeed: 700, grav: 700, type: 'debris' });
    pop(this.x + this.w / 2, this.y + 30, 'ARMOR BROKEN!', { size: 48, color: '#6fd3ff', burstColor: '#1a3a5a' });
  }
  stun(t) { if (this.busy()) return; this.state = 'stunned'; this.t = t; for (const f of FX) if (f instanceof VoidHand) f.dead = true; }
  damage(d, src) {
    if (this.state === 'beaten' || this.state === 'final') return;
    const st = ZEN_STAGES[this.stage], floor = st ? st.at * this.maxHp : 0;
    const k = (this.armor ? 0.25 : 1) * (this.state === 'stunned' ? 1.5 : 1);
    this.hp = Math.max(floor, this.hp - d * k); this.flash = 0.1; BossBar.set(this.hp / this.maxHp);
    this.crack = 1 - this.hp / this.maxHp;
  }
  takeHit(dmg, kx, ky, src) {
    if (this.state === 'wait' || this.state === 'beaten' || this.state === 'final') return false;
    if (!this.batBroken) { this.batBroken = true; Story.batBreak(this); return true; }
    if (this.armor && this.clangT <= 0) { this.clangT = 0.4; SFX.clang(); pop(this.x + this.w / 2, this.y + this.h * 0.55, 'ARMORED!', { size: 24, color: '#c9a33a', burstColor: '#1a0f22' }); }
    this.damage(dmg, src);
    if (Act3.buddy && src === 'fwd' && Player.comboIdx === 3) Act3.buddy.doubleTeam(this);
    return true;
  }
  finalHit() {
    this.state = 'beaten'; this.hp = 0; BossBar.set(0); FX.length = 0; Hazards.length = 0;
    Story.trueEndingScene(this);
  }
  draw() {
    const cx = this.x + this.w / 2, top = this.y, bot = this.y + this.h, t = this.anim, lean = Math.sin(t * 0.7) * 4;
    ctx.save(); ctx.globalAlpha = this.dissolve !== undefined ? this.dissolve : 1; ctx.lineJoin = 'round';
    // smoky body: a giant shadow of Nathan, cap and all
    const g = ctx.createRadialGradient(cx, top + 90, 0, cx, top + 90, 220); g.addColorStop(0, 'rgba(122,31,110,.35)'); g.addColorStop(1, 'rgba(122,31,110,0)');
    ctx.fillStyle = g; ctx.fillRect(cx - 220, top - 120, 440, 440);
    ctx.beginPath(); ctx.moveTo(cx - 46 + lean, top + 70); ctx.quadraticCurveTo(cx - 70, top + 150, cx - 40, bot);
    for (let k = 0; k < 6; k++) ctx.lineTo(cx - 30 + k * 13, bot + (k % 2 ? -18 : 10) + Math.sin(t * 4 + k) * 6);
    ctx.quadraticCurveTo(cx + 70, top + 150, cx + 46 + lean, top + 70); ctx.closePath();
    inked(this.flash > 0 ? '#5a3a70' : '#120818', 4);
    ctx.font = `46px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(217,184,255,.22)'; ctx.fillText('7', cx + lean, top + 120);
    // head + cap
    ctx.beginPath(); ctx.arc(cx + lean, top + 40, 36, 0, 7); inked('#120818', 4);
    ctx.beginPath(); ctx.moveTo(cx - 36 + lean, top + 34); ctx.quadraticCurveTo(cx - 30 + lean, top - 8, cx + 6 + lean, top - 8); ctx.quadraticCurveTo(cx + 40 + lean, top - 8, cx + 38 + lean, top + 30);
    ctx.lineTo(cx + 66 + lean, top + 34); ctx.quadraticCurveTo(cx + 54 + lean, top + 22, cx + 38 + lean, top + 24); ctx.closePath(); inked('#1e0f2a', 4);
    // eyes: Nathan's, but cold
    ctx.save(); ctx.shadowColor = '#d9b8ff'; ctx.shadowBlur = 18; ctx.fillStyle = '#efe4ff';
    ctx.beginPath(); ctx.ellipse(cx + 8 + lean, top + 40, 6, 3 + (this.state === 'stunned' ? 0 : 1), 0, 0, 7); ctx.ellipse(cx + 26 + lean, top + 40, 6, 4, 0, 0, 7); ctx.fill(); ctx.restore();
    // armor plates (dark gold), gone once Josh & Renas break them
    if (this.armor) { ctx.fillStyle = '#5a4320'; ctx.strokeStyle = GOLD; ctx.lineWidth = 2; for (const [ox, oy] of [[-34, 90], [8, 96], [-20, 140], [16, 150]]) { ctx.beginPath(); ctx.moveTo(cx + ox, top + oy); ctx.lineTo(cx + ox + 26, top + oy - 6); ctx.lineTo(cx + ox + 30, top + oy + 20); ctx.lineTo(cx + ox + 2, top + oy + 26); ctx.closePath(); ctx.fill(); ctx.stroke(); } }
    // the giant shadow bat
    const ba = this.state === 'final' ? -2.4 : -0.6 + Math.sin(t * 1.2) * 0.15;
    ctx.save(); ctx.translate(cx + 40 + lean, top + 100); ctx.rotate(ba);
    ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(120, -14); ctx.quadraticCurveTo(136, 0, 120, 14); ctx.lineTo(0, 6); ctx.closePath(); inked('#1e0f2a', 4);
    ctx.restore();
    // cracks spread as he weakens
    if (this.crack > 0.05) { ctx.strokeStyle = `rgba(255,220,160,${0.4 + this.crack * 0.5})`; ctx.lineWidth = 2.5; for (let k = 0; k < Math.ceil(this.crack * 8); k++) { const sx = cx - 30 + ((k * 37) % 60), sy = top + 70 + ((k * 53) % 120); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 9, sy + 14); ctx.lineTo(sx + 2, sy + 26); ctx.lineTo(sx + 12, sy + 38); ctx.stroke(); } }
    ctx.restore();
    if (this.state === 'stunned') for (let k = 0; k < 4; k++) { const a = t * 3 + k * 1.6; ctx.fillStyle = GOLD; ctx.font = `18px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillText('★', cx + Math.cos(a) * 44, top - 16 + Math.sin(a) * 8); }
    if (this.state === 'unforgiving' && !this.waveOut) { ctx.fillStyle = `rgba(20,8,30,${0.25 + (2.6 - this.t) * 0.1})`; ctx.fillRect(coreArena().x, coreArena().y, coreArena().w, coreArena().h); }
    drawShout(cx, top - 20, this.shout);
  }
}

/* =========================================================
   CREW ASSISTS
   ========================================================= */
function makeAssist(a, z) {
  const C = { joshRenas: JoshRenasAssist, lars: LarsAssist, daniel: DanielAssist, miloDeniz: MiloDenizAssist, adam: AdamAssist, reshman: ReshmanWatch }[a];
  return new C(z);
}
// the portal + puppet base: open, show someone, close
class Assist {
  constructor(z) { Object.assign(this, { z, t: 0, done: false, open: 0, shout: null, who: [] }); }
  say(text, dur = 1.6) { this.shout = { text, t: dur }; }
  tick(dt) { this.t += dt; if (this.shout) { this.shout.t -= dt; if (this.shout.t <= 0) this.shout = null; } for (const w of this.who) w.t += dt; }
  drawWho() { for (const w of this.who) if (!w.hidden) drawCastMember(w.kind, w.x, w.y, w.facing, w.t, w.o || {}); }
}
class JoshRenasAssist extends Assist {
  constructor(z) {
    super(z); const ar = coreArena();
    this.px = ar.x + 3 * TILE; this.py = ar.y + 4.5 * TILE; this.hits = 0; this.fireT = 0.3; this.beams = [];
    // Josh rides pillion behind Renas, both sliding in on the scooter
    this.who = [{ kind: 'josh', x: this.px - 16, y: ar.y + 6 * TILE - 12, facing: 1, t: 0, o: {}, hidden: true }, { kind: 'renas', x: this.px, y: ar.y + 6 * TILE, facing: 1, t: 0, o: { moving: true }, hidden: true }];
    SFX.unlock(); toast('JOSH & RENAS JUMP IN!');
  }
  update(dt) {
    this.tick(dt); const ar = coreArena(), z = this.z;
    this.open = this.t < 0.4 ? this.t / 0.4 : this.t > 1.6 ? Math.max(0, 1 - (this.t - 1.6) / 0.4) : 1;
    if (this.t > 0.5) {
      for (const w of this.who) { w.hidden = false; w.x += 470 * dt; }
      if (this.t > 0.55 && this.t < 0.6) this.say('Spite-powered lasers! Coming through!');
      this.fireT -= dt;
      if (this.fireT <= 0 && this.who[0].x < ar.x + ar.w - 2 * TILE) {
        this.fireT = 0.22;
        for (const w of this.who) { this.beams.push({ x0: w.x + 20, y0: w.y - 30, x1: z.x + z.w / 2 + rand(-30, 30), y1: z.y + z.h * 0.5 + rand(-40, 40), t: 0.12 }); }
        SFX.shoot(); this.hits++; z.flash = 0.06;
        if (this.hits === 8) { z.breakArmor(); this.say('Keep up, slowpoke!'); }
      }
    }
    for (const b of this.beams) b.t -= dt; this.beams = this.beams.filter(b => b.t > 0);
    if (this.who[0].x > ar.x + ar.w + 60) { if (z.armor) z.breakArmor(); this.done = true; }
  }
  draw() {
    drawPortal(this.px, this.py, 46, Game.time, '111,211,255', this.open);
    this.drawWho();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const b of this.beams) { ctx.strokeStyle = 'rgba(111,211,255,.9)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(b.x0, b.y0); ctx.lineTo(b.x1, b.y1); ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.5; ctx.stroke(); }
    ctx.restore();
    if (this.shout) drawShout(this.who[0].x, this.who[0].y - 80, this.shout);
  }
}
class LarsAssist extends Assist {
  constructor(z) {
    super(z); this.px = z.x + z.w / 2; this.py = z.y - 70;
    this.who = [{ kind: 'lars', x: this.px - 30, y: this.py + 20, facing: 1, t: 0, o: { cats: true }, hidden: true }];
    this.anvil = null; SFX.unlock(); toast('LARS JUMPS IN!');
  }
  update(dt) {
    this.tick(dt); const z = this.z, L = this.who[0];
    this.open = this.t < 0.4 ? this.t / 0.4 : this.t > 2.4 ? Math.max(0, 1 - (this.t - 2.4) / 0.4) : 1;
    this.px = lerp(this.px, z.x + z.w / 2, 1 - Math.exp(-4 * dt)); L.x = this.px - 30;
    if (this.t > 0.4) L.hidden = this.t > 2.4;
    if (this.t > 0.6 && !this.anvil) { this.anvil = { x: this.px, y: this.py + 10, vy: 0, spin: 0 }; this.say('ROCK AND STONE!'); SFX.whoosh(); }
    if (this.anvil && !this.anvil.hit) {
      const a = this.anvil; a.vy += 1800 * dt; a.y += a.vy * dt; a.x = lerp(a.x, z.x + z.w / 2, 1 - Math.exp(-6 * dt)); a.spin += dt * 6;
      if (a.y >= z.y + 10) { a.hit = true; SFX.anvil(); SFX.slam(); addShake(16); addHitstop(0.15); z.damage(5); z.stun(4.5); pop(a.x, a.y - 20, 'BONK!!', { size: 64, life: 1.2 }); burst(a.x, a.y, 24, { colors: [GOLD, '#6b6f7a', BONE], maxSpeed: 500 }); }
    }
    if (this.t > 2.9) this.done = true;
  }
  draw() {
    drawPortal(this.px, this.py, 40, Game.time, '255,138,42', this.open);
    this.drawWho();
    if (this.anvil && !this.anvil.hit) { ctx.save(); ctx.translate(this.anvil.x, this.anvil.y); ctx.rotate(Math.sin(this.anvil.spin) * 0.3); drawAnvil(0, 12); ctx.restore(); }
    if (this.shout) drawShout(this.px, this.py - 60, this.shout);
  }
}
// Daniel's lucky bombs: bat them into Zennith
class CrewBomb {
  constructor(x, y, vx, vy) { Object.assign(this, { x, y, vx, vy, landed: false, friendly: false, dead: false, t: 0, spin: 0 }); }
  box() { return { x: this.x - 18, y: this.y - 18, w: 36, h: 36 }; }
  update(dt) {
    this.t += dt; this.spin += dt * 6;
    const z = Zone.boss;
    if (this.friendly && z) {
      const dx = z.x + z.w / 2 - this.x, dy = z.y + z.h * 0.55 - this.y, d = Math.hypot(dx, dy) || 1;
      this.vx = lerp(this.vx, dx / d * 1050, 1 - Math.exp(-9 * dt)); this.vy = lerp(this.vy, dy / d * 1050, 1 - Math.exp(-9 * dt));
      this.x += this.vx * dt; this.y += this.vy * dt;
      if (d < 50) { this.dead = true; z.damage(4); explode(this.x, this.y, 70, 0, { friendly: false, word: 'LUCKY!', colors: ['#7dff9a', GOLD, '#ff4aa0', BONE] }); }
      return;
    }
    if (!this.landed) {
      this.vy = Math.min(this.vy + 1500 * dt, 1100);
      const b = { x: this.x - 10, y: this.y - 10, w: 20, h: 20, vx: this.vx, vy: this.vy };
      moveBody(b, dt); this.x = b.x + 10; this.y = b.y + 10; this.vx = b.vx; this.vy = b.vy;
      if (b.onGround) { this.landed = true; this.vx = 0; SFX.land(); }
    }
    if (this.t > 16) { this.dead = true; dust(this.x, this.y, 4); }
  }
  onBat() { this.friendly = true; SFX.launch(); addHitstop(0.08); pop(this.x, this.y - 20, 'HOME RUN!', { size: 34, color: '#7dff9a', burstColor: '#1f5a3a' }); }
  draw() {
    const pulse = 0.5 + 0.5 * Math.sin(Game.time * 10);
    const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, 30); g.addColorStop(0, `rgba(125,255,154,${0.4 + pulse * 0.3})`); g.addColorStop(1, 'rgba(125,255,154,0)');
    ctx.fillStyle = g; ctx.fillRect(this.x - 30, this.y - 30, 60, 60);
    ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.spin * 0.2);
    ctx.beginPath(); ctx.arc(0, 0, 10, 0, 7); inked('#3fd46a', 2.5);
    ctx.fillStyle = BONE; ctx.font = `11px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('7', 0, 1);
    ctx.restore();
    if (this.landed && !this.friendly && Math.hypot(Player.x - this.x, Player.y - this.y) < 160) { ctx.font = `12px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = '#7dff9a'; ctx.fillText('SWING!', this.x, this.y - 24); }
  }
}
class DanielAssist extends Assist {
  constructor(z) {
    super(z); const ar = coreArena();
    this.px = clamp(Player.x + Player.w / 2 - 220, ar.x + 3 * TILE, ar.x + ar.w - 3 * TILE); this.py = A.coreFloor - 46;
    this.who = [{ kind: 'daniel', x: this.px, y: A.coreFloor, facing: 1, t: 0, o: {}, hidden: true }];
    this.crate = null; SFX.unlock(); toast('DANIEL JUMPS IN!');
  }
  update(dt) {
    this.tick(dt);
    this.open = this.t < 0.4 ? this.t / 0.4 : this.t > 2.6 ? Math.max(0, 1 - (this.t - 2.6) / 0.4) : 1;
    this.who[0].hidden = this.t < 0.4 || this.t > 2.6;
    if (this.t > 0.7 && !this.crate) {
      const tx = Player.x + Player.w / 2;
      this.crate = { x: this.px + 10, y: A.coreFloor - 50, vx: (tx - this.px) / 0.8, vy: -650, spin: 0 }; this.say('LUCKY BOMBS! SMACK \'EM AT HIM!'); SFX.whoosh();
    }
    const c = this.crate;
    if (c && !c.open) {
      c.vy += 1500 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.spin += dt * 5;
      if (c.y >= A.coreFloor - 16) {
        c.open = true; SFX.smallBoom(); SFX.confetti(); burst(c.x, c.y, 18, { colors: ['#8a5a3a', '#c9a36b'], maxSpeed: 380, grav: 1200, type: 'debris' });
        for (let k = 0; k < 4; k++) Bolts.push(new CrewBomb(c.x, c.y - 20, (k - 1.5) * 160, -rand(380, 520)));
        toast('BAT THE LUCKY BOMBS INTO ZENNITH!');
      }
    }
    if (this.t > 3.1) this.done = true;
  }
  draw() {
    drawPortal(this.px, this.py, 40, Game.time, '255,74,160', this.open);
    this.drawWho();
    const c = this.crate;
    if (c && !c.open) { ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.spin); rr(-16, -14, 32, 28, 2); inked('#8a5a3a', 3); ctx.fillStyle = '#3fd46a'; ctx.font = `10px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('LUCKY', 0, 0); ctx.restore(); }
    if (this.shout) drawShout(this.px, A.coreFloor - 90, this.shout);
  }
}
class MiloDenizAssist extends Assist {
  constructor(z) {
    super(z); const P = Player, cx = P.x + P.w / 2, ar = coreArena();
    this.l = clamp(cx - 80, ar.x + 2 * TILE, ar.x + ar.w - 2 * TILE); this.r = clamp(cx + 80, ar.x + 2 * TILE, ar.x + ar.w - 2 * TILE);
    this.who = [{ kind: 'milo', x: this.l, y: A.coreFloor, facing: 1, t: 0, o: { float: true, cast: true }, hidden: true }, { kind: 'deniz', x: this.r, y: A.coreFloor, facing: -1, t: 0, o: { cast: true }, hidden: true }];
    SFX.unlock(); toast('MILO & DENIZ JUMP IN!');
  }
  update(dt) {
    this.tick(dt);
    this.open = this.t < 0.4 ? this.t / 0.4 : this.t > 2.2 ? Math.max(0, 1 - (this.t - 2.2) / 0.4) : 1;
    for (const w of this.who) w.hidden = this.t < 0.4 || this.t > 2.2;
    if (this.t > 0.6 && !this.cast) {
      this.cast = true; Act3.shieldT = 8.5; SFX.thunder(); SFX.crystal(); SFX.unlock(); Game.flashWhite = 0.3;
      this.say('Shield spell! On purpose this time!'); pop(Player.x + 11, Player.y - 40, 'STORM SHIELD!', { size: 38, color: '#9fe6ff', burstColor: '#2a4a66' });
    }
    if (this.t > 1.3 && !this.stormed) { this.stormed = true; this.z.storm(); }
    if (this.t > 1.5 && this.t < 1.55) this.shout = { text: 'Good vibes only, bro.', t: 1.6, deniz: true };
    if (this.t > 2.7) this.done = true;
  }
  draw() {
    drawPortal(this.l, A.coreFloor - 46, 40, Game.time, '185,139,255', this.open);
    drawPortal(this.r, A.coreFloor - 46, 40, Game.time, '191,239,255', this.open);
    this.drawWho();
    if (this.shout) drawShout(this.shout.deniz ? this.r : this.l, A.coreFloor - 100, this.shout);
  }
}
class AdamAssist extends Assist {
  constructor(z) {
    super(z); const ar = coreArena();
    this.px = clamp(Player.x + Player.w / 2 - Player.facing * 70, ar.x + 2 * TILE, ar.x + ar.w - 2 * TILE);
    SFX.unlock(); toast('ADAM JUMPS IN!');
  }
  update(dt) {
    this.tick(dt);
    this.open = this.t < 0.4 ? this.t / 0.4 : this.t > 1.6 ? Math.max(0, 1 - (this.t - 1.6) / 0.4) : 1;
    if (this.t > 0.5 && !Act3.buddy) { Act3.buddy = new AdamBuddy(this.px); this.say('Doubles match. Let\'s finish this.'); }
    if (this.t > 2.1) this.done = true;
  }
  draw() { drawPortal(this.px, A.coreFloor - 46, 40, Game.time, '232,240,96', this.open); if (this.shout) drawShout(this.px, A.coreFloor - 100, this.shout); }
}
// Reshman waits in Nathan's shadow for the one hit that would end it all
class ReshmanWatch extends Assist {
  update(dt) { this.tick(dt); if (Act3.reshmanUsed) this.done = true; }
  draw() {
    // two tiny eyes in Nathan's shadow
    const P = Player; ctx.save(); ctx.shadowColor = BONE; ctx.shadowBlur = 8; ctx.fillStyle = BONE;
    for (const ox of [-4, 4]) { ctx.beginPath(); ctx.ellipse(P.x + P.w / 2 + ox, P.y + P.h - 2, 1.8, 2.4, 0, 0, 7); ctx.fill(); } ctx.restore();
  }
}
function reshmanParry(wave) {
  const P = Player;
  Act3.reshmanUsed = true; Act3.reshmanPop = { x: P.x + P.w / 2 + P.facing * 18, y: P.y + P.h, t: 0 };
  P.invuln = Math.max(P.invuln, 1.4); SFX.blorp(); SFX.deflect(); SFX.clang(); addHitstop(0.25); addShake(14); Game.flashWhite = 0.5;
  pop(P.x + P.w / 2, P.y - 50, 'PARRIED · …BLORP.', { size: 44, life: 1.4, color: BONE, burstColor: '#000000' });
  ring(P.x + P.w / 2, P.y + P.h / 2, 10, 120, 0.4, BONE, 8);
  toast(wave ? 'RESHMAN POPPED OUT OF YOUR SHADOW AND PARRIED THE UNFORGIVING!' : 'RESHMAN POPPED OUT OF YOUR SHADOW AND PARRIED A KNOCKOUT BLOW!');
}
function drawReshmanPop() {
  const R = Act3.reshmanPop; if (!R || R.t > 1.6) return;
  const k = R.t < 0.2 ? R.t / 0.2 : R.t > 1.2 ? Math.max(0, 1 - (R.t - 1.2) / 0.4) : 1;
  ctx.save(); ctx.translate(R.x, R.y); ctx.scale(1, k); drawReshmanAt(0, 0, R.t * 4);
  // a little map, held up like a shield
  ctx.save(); ctx.translate(16, -24); ctx.rotate(-0.4); rr(-6, -14, 14, 26, 3); inked('#e9dcc0', 2); ctx.restore();
  ctx.restore();
  if (R.t > 0.2 && R.t < 1.3) drawShout(R.x, R.y - 50, { text: '…blorp. Not today.', t: 1 });
}
// Adam, at Nathan's side for the rest of the fight
class AdamBuddy {
  constructor(x) { Object.assign(this, { x, y: A.coreFloor, facing: 1, t: 0, serveT: 1.6, pose: 'idle', poseT: 0, dtT: 0 }); }
  update(dt) {
    this.t += dt; this.serveT -= dt; this.poseT -= dt; this.dtT -= dt;
    const P = Player, ar = coreArena(), want = clamp(P.x + P.w / 2 - P.facing * 56, ar.x + 2 * TILE, ar.x + ar.w - 2 * TILE), d = want - this.x;
    if (Math.abs(d) > 8) { this.x += sgn(d) * Math.min(Math.abs(d), 280 * dt); this.walk = true; } else this.walk = false;
    const z = Zone.boss;
    if (z && z instanceof Zennith && !z.busy()) this.facing = sgn(z.x + z.w / 2 - this.x) || 1;
    if (this.poseT <= 0) this.pose = 'idle';
    if (z && z instanceof Zennith && this.serveT <= 0 && !z.busy()) {
      this.serveT = 2.6; this.pose = 'serve'; this.poseT = 0.35; SFX.serve();
      Bolts.push(new BuddyBall(this.x + this.facing * 16, this.y - 50));
    }
  }
  doubleTeam(z) {
    if (this.dtT > 0) return; this.dtT = 1.4;
    this.pose = 'smash'; this.poseT = 0.35; z.damage(2); SFX.serve(); SFX.hit(true);
    pop(this.x, this.y - 80, 'DOUBLE TEAM!', { size: 36, color: '#e8f060', burstColor: '#3f7a2a' });
  }
  draw() { drawAdam(this.x, this.y, this.facing, this.t, { pose: this.pose, run: this.walk }); }
}
class BuddyBall {   // Adam's serve, homing on Zennith
  constructor(x, y) { Object.assign(this, { x, y, vx: 0, vy: -300, friendly: true, dead: false, t: 0, trail: [] }); }
  get unhittable() { return true; }
  box() { return { x: this.x - 8, y: this.y - 8, w: 16, h: 16 }; }
  update(dt) {
    this.t += dt; this.trail.push({ x: this.x, y: this.y }); if (this.trail.length > 8) this.trail.shift();
    const z = Zone.boss; if (!z || this.t > 3) { this.dead = true; return; }
    const dx = z.x + z.w / 2 - this.x, dy = z.y + z.h * 0.5 - this.y, d = Math.hypot(dx, dy) || 1;
    this.vx = lerp(this.vx, dx / d * 900, 1 - Math.exp(-6 * dt)); this.vy = lerp(this.vy, dy / d * 900, 1 - Math.exp(-6 * dt));
    this.x += this.vx * dt; this.y += this.vy * dt;
    if (d < 46) { this.dead = true; if (z.damage) z.damage(2); pop(this.x, this.y - 10, 'ACE!', { size: 28, color: '#e8f060', burstColor: '#3f7a2a' }); SFX.hit(false); }
  }
  draw() {
    ctx.lineCap = 'round';
    for (let i = 1; i < this.trail.length; i++) { ctx.strokeStyle = `rgba(232,240,96,${i / this.trail.length * 0.8})`; ctx.lineWidth = i * 1.5; ctx.beginPath(); ctx.moveTo(this.trail[i - 1].x, this.trail[i - 1].y); ctx.lineTo(this.trail[i].x, this.trail[i].y); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(this.x, this.y, 7, 0, 7); inked('#e8f060', 2.2);
  }
}
// Milo & Deniz's storm shield (follows Nathan)
function drawStormShield() {
  if (!(Act3.shieldT > 0)) return;
  const P = Player, cx = P.x + P.w / 2, cy = P.y + P.h / 2 - 4, r = 40 + Math.sin(Game.time * 5) * 2, a = Math.min(1, Act3.shieldT);
  ctx.save(); ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(159,230,255,.12)'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(185,139,255,.8)'; ctx.beginPath(); ctx.arc(cx, cy, r, Game.time * 2, Game.time * 2 + 3); ctx.stroke();
  ctx.strokeStyle = 'rgba(191,239,255,.85)'; ctx.beginPath(); ctx.arc(cx, cy, r - 4, -Game.time * 2, -Game.time * 2 + 3); ctx.stroke();
  for (let k = 0; k < 6; k++) { const an = Game.time * 1.5 + k * 1.047; ctx.fillStyle = k % 2 ? '#bfefff' : '#d9b8ff'; ctx.fillRect(cx + Math.cos(an) * r - 2, cy + Math.sin(an) * r - 2, 4, 4); }
  ctx.restore();
}
