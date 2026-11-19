'use strict';
/* =========================================================
   THE HALL OF LEGENDS · the new bosses
   · Coach Monfort: hops that send floor shockwaves, whistle blasts
     (a triple blast below half HP), a giant stopwatch he throws like
     a boomerang (bat it back to stun him), and a full-speed HUSTLE sprint
   · Pip & Squeak: two shadow acrobats sharing one health bar. Pincer
     dashes, a leapfrog slam, a shadow-step dive from above, and golden
     stubs you can bat back (that stuns them both)
   · Prime Adam: Adam at his peak. Faster, tougher, a triple serve
   · the Hall's Zennith: the crew isn't here, so no assists; he fights
     at full power down to the last pitch
   They fight in the Colosseum (ROOM.t_colo) and report a K.O. to COLO.
   ========================================================= */
const lgArena = () => (typeof ROOM !== 'undefined' && ROOM.t_colo ? ROOM.t_colo.px : Zone.room.px);
const lgShout = (x, y, s) => { if (s && typeof drawShout === 'function') drawShout(x, y, s); };
const lgDown = b => { if (typeof COLO !== 'undefined') COLO.down(b); };
const lgStars = (cx, y, t) => { for (let k = 0; k < 3; k++) { const a = t * 4 + k * 2.1; ctx.fillStyle = GOLD; ctx.font = `12px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillText('★', cx + Math.cos(a) * 16, y + Math.sin(a) * 5); } };

/* ================= COACH MONFORT ================= */
function drawLgMonfort(x, y, facing, t, pose, flash) {
  ctx.save(); ctx.translate(x, y); ctx.scale(facing, 1); ctx.lineJoin = 'round';
  if (flash) ctx.globalAlpha = 0.6;
  const run = pose === 'run' ? Math.sin(t * 18) : 0, crouch = pose === 'crouch' ? 5 : pose === 'tired' ? 3 : 0;
  ctx.translate(0, crouch);
  const green = '#2f6a3a';
  limb(-4, -24, Math.PI / 2 + run * 0.8 + (pose === 'air' ? 0.6 : 0), 13, green, 6);
  limb(4, -24, Math.PI / 2 - run * 0.8 - (pose === 'air' ? 0.6 : 0), 13, green, 6);
  ctx.fillStyle = BONE; ctx.beginPath(); ctx.ellipse(-3, -11, 6, 3, 0, 0, 7); ctx.ellipse(6, -11, 6, 3, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(1, -36, 13, 15, 0, 0, 7); inked(green, 3);   // tracksuit and a proud belly
  ctx.strokeStyle = BONE; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-8, -48); ctx.lineTo(-10, -24); ctx.stroke();
  ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(8, -42, 2.6, 0, 7); ctx.fill();   // the whistle
  const arm = pose === 'whistle' ? -0.9 : pose === 'throw' ? -1.7 : pose === 'tired' ? 1.3 : 0.5 + Math.sin(t * 3) * 0.1;
  const [hx, hy] = limb(6, -46, arm, 14, green, 5);
  if (pose === 'whistle') { ctx.fillStyle = GOLD; ctx.fillRect(hx - 2, hy - 2, 6, 4); }
  limb(-6, -46, Math.PI - 0.5 + run * 0.5, 13, green, 5);
  drawVanceHead(2, -60, t);
  ctx.restore();
}
class LgStopwatch {   // a giant broken stopwatch, thrown like a boomerang
  constructor(m, x, y, dir) { Object.assign(this, { m, x, y, dir, vx: dir * 660, vy: 0, r: 15, t: 0, spin: 0, friendly: false, dead: false }); }
  box() { return { x: this.x - this.r, y: this.y - this.r, w: this.r * 2, h: this.r * 2 }; }
  update(dt) {
    const m = this.m, P = Player; this.t += dt; this.spin += dt * 14;
    if (m.dead || m.state === 'beaten') { this.dead = true; return; }
    if (this.friendly) {
      const dx = m.x + m.w / 2 - this.x, dy = m.y + m.h / 2 - this.y, d = Math.hypot(dx, dy) || 1;
      this.vx = lerp(this.vx, dx / d * 1050, 1 - Math.exp(-8 * dt)); this.vy = lerp(this.vy, dy / d * 1050, 1 - Math.exp(-8 * dt));
      this.x += this.vx * dt; this.y += this.vy * dt;
      if (d < 30) { this.dead = true; m.watchBack(); }
      return;
    }
    this.vx -= this.dir * 900 * dt;   // slows, stops, and swings back to his hand
    this.vy = lerp(this.vy, clamp((P.y + P.h / 2 - this.y) * 2, -220, 220), 1 - Math.exp(-2 * dt));
    this.x += this.vx * dt; this.y += this.vy * dt;
    if ((this.t > 0.8 && Math.abs(this.x - (m.x + m.w / 2)) < 26) || this.t > 4) { this.dead = true; return; }
    if (overlap(this.box(), P.hurtbox())) P.hurt(sgn(this.vx) || 1);
  }
  onBat() {
    this.friendly = true; SFX.deflect(); addHitstop(0.1); addShake(7);
    pop(this.x, this.y - 22, 'RETURN TO SENDER!', { size: 30, color: GOLD, burstColor: '#2f6a3a' }); ring(this.x, this.y, 6, 60, 0.3, GOLD, 5);
  }
  draw() {
    ctx.save(); ctx.translate(this.x, this.y);
    if (this.friendly) { ctx.shadowColor = GOLD; ctx.shadowBlur = 16; }
    ctx.beginPath(); ctx.arc(0, 0, this.r, 0, 7); inked('#d9d4c8', 3); ctx.shadowBlur = 0;
    ctx.fillStyle = '#8a8f99'; ctx.fillRect(-3, -this.r - 6, 6, 6);
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(this.spin) * 11, Math.sin(this.spin) * 11); ctx.stroke();
    ctx.strokeStyle = 'rgba(13,11,16,.6)'; ctx.beginPath(); ctx.moveTo(-7, -9); ctx.lineTo(-1, -2); ctx.lineTo(-4, 8); ctx.stroke();   // the crack
    ctx.restore();
  }
}
class LgMonfort {
  constructor(x, y) {
    Object.assign(this, { type: 'boss', w: 30, h: 60, hp: 60, maxHp: 60, vx: 0, vy: 0, onGround: false, facing: -1, flash: 0, harmful: false, pogoable: true, givesHype: true,
      state: 'wait', t: 0, anim: 0, step: 0, pose: 'idle', blasts: 0, shout: null, bolts: 0 });
    this.x = x - this.w / 2; this.y = y - this.h;
  }
  begin() { this.state = 'idle'; this.t = 0.9; this.harmful = true; this.say('HUSTLE!'); }
  say(text, d = 1.3) { this.shout = { text, t: d }; }
  low() { return this.hp < this.maxHp / 2; }
  pick() {
    const plan = this.low() ? ['hop', 'triple', 'watch', 'hustle', 'hop', 'watch', 'triple'] : ['hop', 'whistle', 'watch', 'hustle'];
    const a = plan[this.step++ % plan.length], P = Player, cx = this.x + this.w / 2;
    this.facing = sgn(P.x + P.w / 2 - cx) || this.facing;
    if (a === 'hop') { this.state = 'hopWind'; this.t = 0.42; this.pose = 'crouch'; SFX.windup(); }
    if (a === 'whistle' || a === 'triple') { this.state = 'whistleWind'; this.t = 0.6; this.blasts = a === 'triple' ? 3 : 1; this.pose = 'whistle'; SFX.slamWarn(); this.say(a === 'triple' ? 'FWEET! FWEET! FWEEET!' : 'FWEEEEET!'); }
    if (a === 'watch') { this.state = 'watchWind'; this.t = 0.5; this.pose = 'throw'; SFX.windup(); }
    if (a === 'hustle') { this.state = 'hustleWind'; this.t = 0.6; this.pose = 'crouch'; SFX.windup(); this.say('HUSTLE! HUSTLE! HUSTLE!'); }
  }
  blast() {   // the whistle: a shockwave along the floor, both ways
    const cx = this.x + this.w / 2, fy = this.y + this.h;
    Hazards.push({ kind: 'wave', x: cx, dir: -1, y: fy, life: 2.4 }, { kind: 'wave', x: cx, dir: 1, y: fy, life: 2.4 });
    ring(cx + this.facing * 8, this.y + 14, 6, 80, 0.35, GOLD, 4); SFX.serve(); addShake(5);
  }
  update(dt) {
    this.anim += dt; this.flash = Math.max(0, this.flash - dt); this.t -= dt;
    if (this.shout) { this.shout.t -= dt; if (this.shout.t <= 0) this.shout = null; }
    if (this.state === 'wait' || this.state === 'beaten') { this.gravity(dt); return; }
    const P = Player, cx = this.x + this.w / 2, pcx = P.x + P.w / 2, fy = this.y + this.h, fast = this.low() ? 0.75 : 1;
    switch (this.state) {
      case 'idle': {
        this.pose = 'idle'; this.facing = sgn(pcx - cx) || this.facing;
        const want = Math.abs(pcx - cx) > 240 ? 1 : Math.abs(pcx - cx) < 120 ? -1 : 0;
        this.vx = approach(this.vx, want * this.facing * 170, 1400 * dt);
        if (this.t <= 0) this.pick();
        break;
      }
      case 'hopWind': this.vx = approach(this.vx, 0, 2000 * dt); if (this.t <= 0) { this.state = 'hop'; this.vy = -980; this.vx = clamp((pcx - cx) / 0.75, -700, 700); this.pose = 'air'; SFX.jump(); } break;
      case 'hop':
        if (this.onGround && this.vy >= 0) {
          this.state = 'idle'; this.t = 0.7 * fast; this.vx = 0; SFX.slam(); addShake(10); dust(cx, fy, 14);
          Hazards.push({ kind: 'wave', x: cx, dir: -1, y: fy, life: 2.2 }, { kind: 'wave', x: cx, dir: 1, y: fy, life: 2.2 });
          pop(cx, this.y - 10, 'THUD!', { size: 34 });
        }
        break;
      case 'whistleWind':
        this.vx = approach(this.vx, 0, 2000 * dt);
        if (this.t <= 0) { this.blast(); this.blasts--; if (this.blasts > 0) this.t = 0.42; else { this.state = 'idle'; this.t = 0.85 * fast; } }
        break;
      case 'watchWind':
        this.vx = 0;
        if (this.t <= 0) { Bolts.push(new LgStopwatch(this, cx + this.facing * 18, this.y + 18, this.facing)); SFX.toss(); this.state = 'idle'; this.t = 1.4 * fast; this.say('ON THE CLOCK!'); }
        break;
      case 'hustleWind': this.vx = approach(this.vx, 0, 2000 * dt); if (Math.random() < 0.5) dust(cx, fy, 1, -this.facing); if (this.t <= 0) { this.state = 'hustle'; this.t = 1.4; SFX.whoosh(); } break;
      case 'hustle':
        this.vx = this.facing * (this.low() ? 980 : 860); this.pose = 'run';
        Game.afterimages.push({ x: this.x, y: this.y, facing: this.facing, life: 0.15, max: 0.15, color: '#3f8a4a' });
        if (this.hitWall || this.t <= 0) { this.state = 'recover'; this.t = 0.8; this.vx = 0; if (this.hitWall) { addShake(8); SFX.clang(); this.say('…wheeze.', 0.8); } }
        break;
      case 'recover': this.vx = approach(this.vx, 0, 2400 * dt); this.pose = 'tired'; if (this.t <= 0) { this.state = 'idle'; this.t = 0.4; } break;
      case 'stunned': this.vx = approach(this.vx, 0, 1500 * dt); this.pose = 'tired'; if (this.t <= 0) { this.state = 'idle'; this.t = 0.4; this.harmful = true; } break;
    }
    this.gravity(dt);
  }
  gravity(dt) { this.vy = Math.min(this.vy + TUNE.gravity * dt, 1500); moveBody(this, dt); }
  watchBack() {   // his own stopwatch, batted back into his belly
    if (this.state === 'beaten') return;
    this.state = 'stunned'; this.t = 2.2; this.harmful = false; this.vx = -this.facing * 200; this.vy = -300;
    this.damage(6); SFX.hit(true); addShake(12); addHitstop(0.12);
    pop(this.x + this.w / 2, this.y - 24, 'TIME OUT!', { size: 40, color: GOLD, burstColor: '#2f6a3a' });
  }
  damage(d) {
    if (this.state === 'beaten') return;
    this.hp = Math.max(0, this.hp - d); this.flash = 0.1; BossBar.set(this.hp / this.maxHp);
    if (this.hp <= 0) {
      this.state = 'beaten'; this.harmful = false; this.vx = 0; this.pose = 'tired';
      FX.length = 0; Hazards.length = 0; for (const b of Bolts) b.dead = true;
      this.say('…Good hustle, kid. GOOD hustle.', 2); lgDown(this);
    }
  }
  takeHit(dmg, kx) {
    if (this.state === 'wait' || this.state === 'beaten') return false;
    this.damage(this.state === 'stunned' ? dmg * 1.25 : dmg);
    if (this.state === 'idle') this.vx = kx * 160;
    return true;
  }
  draw() {
    const cx = this.x + this.w / 2, fy = this.y + this.h;
    drawLgMonfort(cx, fy, this.facing, this.anim, this.pose, this.flash > 0);
    if (this.state === 'stunned') lgStars(cx, this.y - 12, this.anim);
    lgShout(cx, this.y - 30, this.shout);
  }
}

/* ================= PIP & SQUEAK ================= */
class LgStub {   // a golden ticket stub, flung in an arc
  constructor(c, x, y, vx, vy) { Object.assign(this, { c, x, y, vx, vy, r: 8, t: 0, spin: 0, friendly: false, dead: false }); }
  box() { return { x: this.x - 12, y: this.y - 12, w: 24, h: 24 }; }
  update(dt) {
    this.t += dt; this.spin += dt * 16;
    if (this.c.dead || this.c.state === 'beaten') { this.dead = true; return; }
    if (this.friendly) {
      const b = this.c.nearest(this.x, this.y), dx = b.x + b.w / 2 - this.x, dy = b.y + b.h / 2 - this.y, d = Math.hypot(dx, dy) || 1;
      this.vx = lerp(this.vx, dx / d * 1000, 1 - Math.exp(-8 * dt)); this.vy = lerp(this.vy, dy / d * 1000, 1 - Math.exp(-8 * dt));
      this.x += this.vx * dt; this.y += this.vy * dt;
      if (d < 26 || this.t > 2.5) { this.dead = true; this.c.stubHit(); }
      return;
    }
    this.vy += 900 * dt; this.x += this.vx * dt; this.y += this.vy * dt;
    if (this.t > 3 || pointSolid(this.x, this.y)) { this.dead = true; burst(this.x, this.y, 8, { colors: [GOLD, BONE], maxSpeed: 220 }); return; }
    if (overlap(this.box(), Player.hurtbox())) { Player.hurt(sgn(this.vx) || 1); this.dead = true; }
  }
  onBat() { this.friendly = true; this.t = 0; SFX.deflect(); addHitstop(0.08); addShake(6); pop(this.x, this.y - 18, 'NO REFUNDS!', { size: 28, color: GOLD, burstColor: '#5a3a24' }); }
  draw() {
    ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.spin);
    if (this.friendly) { ctx.shadowColor = GOLD; ctx.shadowBlur = 12; }
    rr(-9, -5, 18, 10, 2); inked(GOLD, 2); ctx.fillStyle = '#8a6a1a'; ctx.fillRect(-2, -5, 1.5, 10);
    ctx.restore();
  }
}
class LgTwin {   // one of the two bodies; the pair's controller (LgTwins) moves it
  constructor(c, kind, x, y) {
    const pip = kind === 'pip';
    Object.assign(this, { c, kind, w: pip ? 24 : 20, h: pip ? 46 : 36, vx: 0, vy: 0, onGround: false, facing: 1, flash: 0, hidden: false, pose: 'idle', mark: null, hold: false,
      type: 'twin', pogoable: true, givesHype: true, dead: false });
    this.x = x - this.w / 2; this.y = y - this.h;
  }
  get harmful() { return !this.hidden && this.c.state !== 'wait' && this.c.state !== 'beaten' && this.c.state !== 'stunned'; }
  get untargetable() { return this.hidden; }
  update() { if (this.c.dead) this.dead = true; }   // the controller ticks it
  tick(dt) {
    this.flash = Math.max(0, this.flash - dt);
    if (this.hidden || this.hold) return;
    this.vy = Math.min(this.vy + TUNE.gravity * dt, 1600); moveBody(this, dt);
  }
  takeHit(dmg, kx) { if (this.hidden || this.c.state === 'wait' || this.c.state === 'beaten') return false; this.flash = 0.1; this.c.damage(this.c.state === 'stunned' ? dmg * 1.3 : dmg); return true; }
  draw() {
    if (this.hidden) return;
    const cx = this.x + this.w / 2, fy = this.y + this.h, t = Game.time + (this.kind === 'pip' ? 0 : 1.3), pip = this.kind === 'pip';
    if (this.mark !== null) { const my = landYAt(this.mark, this.y + this.h); ctx.fillStyle = `rgba(232,54,28,${0.3 + 0.25 * Math.sin(Game.time * 24)})`; ctx.beginPath(); ctx.ellipse(this.mark, my, 34, 7, 0, 0, 7); ctx.fill(); }
    ctx.save(); ctx.translate(cx, fy); ctx.scale(this.facing, 1); ctx.lineJoin = 'round';
    if (this.flash > 0) ctx.globalAlpha = 0.6;
    const run = this.pose === 'run' ? Math.sin(t * 20) : 0, air = this.pose === 'air';
    ctx.strokeStyle = '#000'; ctx.lineWidth = pip ? 5 : 4; ctx.lineCap = 'round';
    const legY = -this.h * 0.38;
    ctx.beginPath(); ctx.moveTo(-3, legY); ctx.lineTo(-3 + Math.cos(Math.PI / 2 + run * 0.8 + (air ? 0.7 : 0)) * 13, legY + Math.sin(Math.PI / 2 + run * 0.8) * 13);
    ctx.moveTo(3, legY); ctx.lineTo(3 + Math.cos(Math.PI / 2 - run * 0.8 - (air ? 0.7 : 0)) * 13, legY + Math.sin(Math.PI / 2 - run * 0.8) * 13); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, -this.h * 0.58, pip ? 10 : 8, this.h * 0.24, air ? 0.4 : 0, 0, 7); ctx.fillStyle = '#000'; ctx.fill();
    ctx.strokeStyle = 'rgba(242,193,78,.7)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(4, -this.h * 0.68); ctx.lineTo(14, -this.h * 0.68 + (this.pose === 'throw' ? -12 : 6)); ctx.stroke();
    const hy = -this.h - (pip ? 2 : 0);
    if (pip) drawPipHead(0, hy, t); else drawSqueakHead(0, hy, t);
    ctx.restore();
    if (this.c.state === 'stunned') lgStars(cx, this.y - 16, Game.time);
  }
}
class LgTwins {   // the pair: one health bar, one plan, two bodies
  constructor(x, y) {
    Object.assign(this, { type: 'boss', x, y: y - 60, w: 10, h: 10, hp: 72, maxHp: 72, flash: 0, harmful: false, untargetable: true, pogoable: false, givesHype: false,
      state: 'wait', t: 0, step: 0, anim: 0, shout: null, who: null, dived: 0 });
    this.floor = y; this.pip = new LgTwin(this, 'pip', x - 90, y); this.sq = new LgTwin(this, 'squeak', x + 90, y);
    this.pip.facing = -1; this.sq.facing = -1;
    Enemies.push(this.pip, this.sq);
  }
  bodies() { return [this.pip, this.sq]; }
  nearest(x, y) { return this.bodies().filter(b => !b.hidden).sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0] || this.pip; }
  begin() { this.state = 'idle'; this.t = 0.8; this.say(this.pip, 'Two tickets!'); }
  say(b, text, d = 1.2) { this.shout = { text, t: d }; this.who = b; }
  low() { return this.hp < this.maxHp / 2; }
  puff(b) { burst(b.x + b.w / 2, b.y + b.h / 2, 16, { colors: ['#000', '#1a1420', GOLD], type: 'puff', maxSpeed: 240, minSize: 5, maxSize: 12, maxLife: 0.6, drag: 2 }); SFX.poof(); }
  place(b, x) { b.x = x - b.w / 2; b.y = this.floor - b.h; b.vx = 0; b.vy = 0; b.hidden = false; b.hold = false; }
  pick() {
    const plan = this.low() ? ['pincer', 'dive', 'stubs', 'leap', 'pincer', 'stubs', 'dive'] : ['pincer', 'stubs', 'leap', 'dive', 'stubs'];
    const a = plan[this.step++ % plan.length], P = Player, ar = lgArena(), pcx = P.x + P.w / 2;
    for (const b of this.bodies()) b.facing = sgn(pcx - (b.x + b.w / 2)) || b.facing;
    if (a === 'pincer') {   // one on each wall, then both dash in
      const left = Math.random() < 0.5;
      for (const [b, l] of [[this.pip, left], [this.sq, !left]]) { this.puff(b); this.place(b, l ? ar.x + 2 * TILE : ar.x + ar.w - 2 * TILE); b.facing = l ? 1 : -1; b.pose = 'crouch'; this.puff(b); }
      this.state = 'pincerWind'; this.t = 0.6; SFX.windup(); this.say(this.sq, 'Squeeze play!');
    }
    if (a === 'stubs') { this.state = 'stubWind'; this.t = 0.45; for (const b of this.bodies()) b.pose = 'throw'; SFX.windup(); this.say(this.pip, 'Get your tickets!'); }
    if (a === 'leap') {   // Pip vaults the batter and slams down behind; Squeak charges
      const b = this.pip, bx = b.x + b.w / 2, tx = clamp(pcx + sgn(pcx - bx) * 70, ar.x + 2 * TILE, ar.x + ar.w - 2 * TILE);
      b.vy = -1080; b.vx = (tx - bx) / 0.95; b.pose = 'air'; b.mark = tx; SFX.jump();
      this.state = 'leap'; this.t = 2.2; this.leapT = 0;
    }
    if (a === 'dive') { for (const b of this.bodies()) { this.puff(b); b.hidden = true; b.hold = true; } this.state = 'diveHide'; this.t = 0.5; this.dived = 0; SFX.whoosh(); }
  }
  update(dt) {
    this.anim += dt; this.t -= dt;
    if (this.shout) { this.shout.t -= dt; if (this.shout.t <= 0) this.shout = null; }
    const B = this.bodies(), P = Player, pcx = P.x + P.w / 2, ar = lgArena(), fast = this.low() ? 0.75 : 1;
    this.x = (this.pip.x + this.sq.x) / 2; this.y = Math.min(this.pip.y, this.sq.y);
    for (const b of B) b.tick(dt);
    if (this.state === 'wait' || this.state === 'beaten') return;
    switch (this.state) {
      case 'idle':
        for (const b of B) { const bx = b.x + b.w / 2, d = pcx - bx, want = Math.abs(d) > 200 ? 1 : Math.abs(d) < 90 ? -1 : 0; b.facing = sgn(d) || b.facing; b.vx = approach(b.vx, want * b.facing * (b === this.sq ? 220 : 180), 1400 * dt); b.pose = Math.abs(b.vx) > 30 ? 'run' : 'idle'; }
        if (this.t <= 0) this.pick();
        break;
      case 'pincerWind': if (this.t <= 0) { this.state = 'pincer'; this.t = 1.1; SFX.whoosh(); } break;
      case 'pincer':
        for (const b of B) { b.vx = b.facing * (this.low() ? 980 : 880); b.pose = 'run'; Game.afterimages.push({ x: b.x, y: b.y, facing: b.facing, life: 0.12, max: 0.12, color: '#2a2230' }); }
        if (this.t <= 0 || B.every(b => b.hitWall)) { for (const b of B) { b.vx = 0; b.pose = 'idle'; } this.state = 'idle'; this.t = 0.8 * fast; }
        break;
      case 'stubWind':
        for (const b of B) b.vx = approach(b.vx, 0, 2000 * dt);
        if (this.t <= 0) {
          for (const b of B) {
            const bx = b.x + b.w / 2, by = b.y + 10, T = 0.8, n = this.low() ? 2 : 1;
            for (let k = 0; k < n; k++) { const tx = pcx + (k ? rand(-90, 90) : 0); Bolts.push(new LgStub(this, bx, by, (tx - bx) / T, (P.y + P.h / 2 - by - 0.5 * 900 * T * T) / T)); }
          }
          SFX.toss(); this.state = 'idle'; this.t = 1.2 * fast;
        }
        break;
      case 'leap': {
        const p = this.pip, s = this.sq; this.leapT += dt;
        s.vx = approach(s.vx, s.facing * 520, 2400 * dt); s.pose = 'run';
        if (this.leapT > 0.2 && p.onGround) {
          p.mark = null; p.vx = 0; p.pose = 'idle'; SFX.slam(); addShake(10); dust(p.x + p.w / 2, p.y + p.h, 12);
          Hazards.push({ kind: 'wave', x: p.x + p.w / 2, dir: -1, y: p.y + p.h, life: 1.8 }, { kind: 'wave', x: p.x + p.w / 2, dir: 1, y: p.y + p.h, life: 1.8 });
          s.vx = 0; this.state = 'idle'; this.t = 0.8 * fast;
        } else if (this.t <= 0) { p.mark = null; this.state = 'idle'; this.t = 0.6; }
        break;
      }
      case 'diveHide':   // two shadows drop out of the sky, one after the other
        if (this.t <= 0) {
          const b = this.dived === 0 ? this.pip : this.sq, x = clamp(pcx + (this.dived ? rand(-60, 60) : 0), ar.x + 2 * TILE, ar.x + ar.w - 2 * TILE);
          b.x = x - b.w / 2; b.y = ar.y + 3 * TILE; b.vx = 0; b.vy = 0; b.hidden = false; b.hold = true; b.mark = x; b.pose = 'air'; b.diveT = 0.5; this.puff(b); SFX.slamWarn();
          this.dived++; this.t = this.dived < 2 ? 0.45 : 99;
          if (this.dived >= 2) this.state = 'dive';
        }
        this.diveTick(dt);
        break;
      case 'dive':
        this.diveTick(dt);
        if (B.every(b => !b.hold && b.onGround)) { for (const b of B) { b.mark = null; b.pose = 'idle'; } this.state = 'idle'; this.t = 0.9 * fast; }
        break;
      case 'stunned': for (const b of B) { b.vx = approach(b.vx, 0, 1500 * dt); b.pose = 'idle'; } if (this.t <= 0) { this.state = 'idle'; this.t = 0.5; } break;
    }
  }
  diveTick(dt) {
    for (const b of this.bodies()) {
      if (!b.hold || b.hidden) continue;
      b.diveT -= dt;
      if (b.diveT <= 0) { b.hold = false; b.vy = 1500; }
    }
    for (const b of this.bodies()) if (!b.hold && b.mark !== null && b.landed) { SFX.slam(); addShake(8); dust(b.x + b.w / 2, b.y + b.h, 10); b.mark = null; }
  }
  stubHit() {   // a stub batted back: both of them see stars
    if (this.state === 'beaten') return;
    for (const b of this.bodies()) { if (b.hidden) { b.hidden = false; b.hold = false; } b.mark = null; b.vy = -260; b.vx = 0; }
    this.state = 'stunned'; this.t = 1.8; this.damage(5); SFX.hit(true); addShake(10); addHitstop(0.1);
    pop(this.nearest(Player.x, Player.y).x, this.y - 30, 'DOUBLE TAKE!', { size: 36, color: GOLD, burstColor: '#5a3a24' });
  }
  damage(d) {
    if (this.state === 'beaten') return;
    const half = this.hp >= this.maxHp / 2;
    this.hp = Math.max(0, this.hp - d); BossBar.set(this.hp / this.maxHp);
    for (const b of this.bodies()) b.flash = 0.1;
    if (half && this.low() && this.hp > 0) { this.say(this.sq, 'Split up! SPLIT UP!', 1.6); BossBar.flash(); }
    if (this.hp <= 0) {
      this.state = 'beaten'; for (const b of this.bodies()) { b.hidden = false; b.hold = false; b.vx = 0; b.mark = null; b.pose = 'idle'; }
      FX.length = 0; Hazards.length = 0; for (const x of Bolts) x.dead = true;
      this.say(this.pip, '…Show\'s over, folks.', 2); lgDown(this);
    }
  }
  takeHit() { return false; }
  draw() { if (this.shout && this.who && !this.who.hidden) lgShout(this.who.x + this.who.w / 2, this.who.y - 30, this.shout); }
}

/* ================= PRIME ADAM (Adam at his peak) ================= */
let LgPrimeAdam = null;
if (typeof Adam !== 'undefined' && typeof TennisBall !== 'undefined') LgPrimeAdam = class extends Adam {
  constructor(x, y) { super(x, y); this.hp = this.maxHp = 72; }
  arena() { return lgArena(); }
  update(dt) {
    const was = this.state; super.update(dt);
    // the triple serve: two more balls fanned around his ace
    if (was === 'serveHold' && this.state === 'fall') {
      const base = Bolts[Bolts.length - 1];
      if (base instanceof TennisBall && !base.friendly) {
        const sp = Math.hypot(base.vx, base.vy), a = Math.atan2(base.vy, base.vx);
        for (const da of [-0.24, 0.24]) Bolts.push(new TennisBall(base.x, base.y, Math.cos(a + da) * sp, Math.sin(a + da) * sp));
      }
    }
    if (Math.random() < 0.3) spawnParticle({ x: this.x + rand(0, this.w), y: this.y + rand(0, this.h), vx: rand(-20, 20), vy: rand(-110, -50), life: rand(0.3, 0.5), size: rand(2, 3.5), color: Math.random() < 0.6 ? GOLD : '#fff3c0', type: 'dot' });
  }
  draw() {
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, 60); g.addColorStop(0, 'rgba(242,193,78,.35)'); g.addColorStop(1, 'rgba(242,193,78,0)');
    ctx.fillStyle = g; ctx.fillRect(cx - 60, cy - 60, 120, 120); ctx.restore();
    super.draw();
    ctx.fillStyle = GOLD; ctx.fillRect(cx - 8, this.y + 6, 16, 3);   // a gold headband
  }
};

/* ================= THE HALL'S ZENNITH: no crew, full power ================= */
let LgZennith = null;
if (typeof Zennith !== 'undefined') LgZennith = class extends Zennith {
  constructor() { super(); this.batBroken = true; this.armor = false; }
  startStage(a) {
    if (a === 'final') return super.startStage(a);
    this.say(['Again.', 'You never learn.', 'Full count, MVP.', 'Nobody\'s coming to help.'][(Math.random() * 4) | 0], 1.5);
    this.state = 'idle'; this.t = 0.5;
  }
  finalHit() { this.state = 'beaten'; this.hp = 0; BossBar.set(0); FX.length = 0; Hazards.length = 0; lgDown(this); }
};
