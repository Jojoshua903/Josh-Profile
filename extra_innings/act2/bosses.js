'use strict';
/* =========================================================
   ACT II BOSSES
   Fionn, Keeper of Pebbles · Milo the Storm-Wrecked · King Deniz
   (FX, landYAt and friends come from act/bosses.js)
   ========================================================= */
// a little shouted speech bubble that doesn't stop the fight
function drawShout(x, y, s) {
  if (!s) return;
  ctx.save(); ctx.font = `13px ${DISPLAY_FONT}`;
  const w = Math.min(340, ctx.measureText(s.text).width + 20), a = Math.min(1, s.t * 4);
  const bx = clamp(x - w / 2, Game.cam.x + 10, Game.cam.x + VW - w - 10), by = y - 30;
  ctx.globalAlpha = a; rr(bx, by, w, 24, 4); inked(BONE, 2.5);
  ctx.beginPath(); ctx.moveTo(clamp(x, bx + 12, bx + w - 12) - 6, by + 23); ctx.lineTo(clamp(x, bx + 12, bx + w - 12), by + 32); ctx.lineTo(clamp(x, bx + 12, bx + w - 12) + 6, by + 23); ctx.fillStyle = BONE; ctx.fill();
  ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s.text, bx + w / 2, by + 12);
  ctx.restore();
}

/* ================= FIONN ================= */
const ROCK_NAMES = ['THIS IS BASALT! HIS NAME IS BARNABY!', 'GRANITE! SHE\'S CALLED GRETA!', 'OBSIDIAN! SAY HI TO OSCAR!', 'PUMICE! IT FLOATS, KEVIN!',
  'SHALE! THAT\'S SHELBY!', 'QUARTZ! GO, QUENTIN!', 'FELDSPAR! FELICITY!', 'GNEISS! IT\'S PRONOUNCED "NICE"!', 'MARBLE! MARGARET!', 'SANDSTONE! SANDY! OBVIOUSLY!'];
class Boulder {   // levitated, named, thrown. Small green ones can be smacked back.
  constructor(boss, off, small) {
    Object.assign(this, { boss, off, small, r: small ? 13 : 24, state: 'rise', t: 0, ft: 0, vx: 0, vy: 0, dead: false, friendly: false, spin: rand(0, 6), checked: false,
      hue: small ? '#7fb85a' : ['#8c7b6b', '#6b6f7a', '#a8452a'][(Math.random() * 3) | 0] });
    this.x = boss.x + boss.w / 2 + off; this.y = boss.y + boss.h;
  }
  get unhittable() { return !this.small || this.state !== 'thrown' || this.friendly; }
  get heavyOk() { return this.state === 'thrown' && !this.friendly; }   // the big ones, with Lars's Heavy Swing
  holdPos() { const b = this.boss; return { x: b.x + b.w / 2 + this.off, y: b.y - 50 - Math.abs(this.off) * 0.2 + Math.sin(Game.time * 3 + this.off) * 4 }; }
  box() { return { x: this.x - this.r - 8, y: this.y - this.r - 8, w: (this.r + 8) * 2, h: (this.r + 8) * 2 }; }
  throwAt(tx, ty) { const dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy) || 1, sp = this.small ? 600 : 500; this.vx = dx / d * sp; this.vy = dy / d * sp; this.state = 'thrown'; SFX.whoosh(); }
  update(dt) {
    this.t += dt; this.spin += dt * (this.state === 'thrown' ? 9 : 1.5);
    const b = this.boss;
    if (b.state === 'beaten') { this.shatter(); return; }
    if (this.state === 'rise' || this.state === 'hold') {
      const p = this.holdPos(); this.x = lerp(this.x, p.x, 1 - Math.exp(-8 * dt)); this.y = lerp(this.y, p.y, 1 - Math.exp(-6 * dt));
      if (this.state === 'rise' && this.t > 0.45) this.state = 'hold';
      return;
    }
    this.ft += dt;
    if (this.friendly) {
      const bx = b.x + b.w / 2, by = b.y + b.h / 2, dx = bx - this.x, dy = by - this.y, d = Math.hypot(dx, dy) || 1;
      this.vx = lerp(this.vx, dx / d * 950, 1 - Math.exp(-10 * dt)); this.vy = lerp(this.vy, dy / d * 950, 1 - Math.exp(-10 * dt));
      this.x += this.vx * dt; this.y += this.vy * dt;
      if (Math.random() < 0.6) spawnParticle({ x: this.x, y: this.y, vx: rand(-30, 30), vy: rand(-30, 30), life: 0.3, size: 3, color: '#9be36a', type: 'dot' });
      const S = b.shield;
      if (S && d < S.r + 6 && !this.checked) {
        this.checked = true;
        if (S.blocks(Math.atan2(this.y - by, this.x - bx))) { SFX.clang(); pop(this.x, this.y - 16, 'BLOCKED!', { size: 26, color: BONE, burstColor: '#3a3340' }); this.shatter(); return; }
      }
      if (d < 26) { this.dead = true; b.rockHit(this); }
      return;
    }
    this.x += this.vx * dt; this.y += this.vy * dt;
    const ar = ROOM.g_pedestal.px;
    if (this.ft > 0.08 && (pointSolid(this.x, this.y + this.r * 0.6) || pointSolid(this.x + sgn(this.vx) * this.r * 0.6, this.y)) || this.ft > 4 || this.x < ar.x || this.x > ar.x + ar.w) { this.shatter(); return; }
    if (overlap({ x: this.x - this.r * 0.8, y: this.y - this.r * 0.8, w: this.r * 1.6, h: this.r * 1.6 }, Player.hurtbox())) { Player.hurt(sgn(this.vx) || 1); this.shatter(); }
  }
  onBat() {
    this.friendly = true; this.checked = false; SFX.deflect(); addHitstop(0.08); addShake(6);
    pop(this.x, this.y - 20, 'RETURN TO SENDER!', { size: 30, color: '#9be36a', burstColor: '#2a4a2a' }); ring(this.x, this.y, 6, 60, 0.3, '#9be36a', 5);
  }
  shatter() {
    this.dead = true; SFX.dirt();
    burst(this.x, this.y, this.small ? 10 : 18, { colors: [this.hue, '#5a4a3a', BONE], maxSpeed: 340, grav: 1200, type: 'debris' });
  }
  draw() {
    ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.spin); ctx.lineJoin = 'round';
    if (this.small) { const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 30); g.addColorStop(0, 'rgba(155,227,106,.55)'); g.addColorStop(1, 'rgba(155,227,106,0)'); ctx.fillStyle = g; ctx.fillRect(-30, -30, 60, 60); }
    if (this.state !== 'thrown') { ctx.strokeStyle = 'rgba(185,139,255,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, this.r + 6 + Math.sin(Game.time * 8) * 2, 0, 7); ctx.stroke(); }
    const r = this.r; ctx.beginPath();
    for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2, rr2 = r * (0.82 + ((k * 37) % 5) * 0.06); ctx.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); }
    ctx.closePath(); inked(this.hue, 2.5);
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.3, r * 0.25, 0, 7); ctx.fill();
    if (!this.small) { ctx.fillStyle = INK; ctx.fillRect(-r * 0.35, -2, 3, 3); ctx.fillRect(r * 0.15, -2, 3, 3); }   // every rock has a face
    ctx.restore();
    if (this.small && this.state === 'thrown' && !this.friendly && Math.hypot(Player.x - this.x, Player.y - this.y) < 200) {
      ctx.font = `12px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = '#9be36a'; ctx.fillText('SWING!', this.x, this.y - 26);
    }
  }
}
class PebbleShield {   // a spinning ring of lucky pebbles with three gaps
  constructor() { Object.assign(this, { r: 76, rot: 0, n: 10, gaps: new Set([1, 2, 6]), t: 7.5, up: 0 }); }
  blocks(a) { const slot = Math.floor(((((a - this.rot) % (Math.PI * 2)) + Math.PI * 4) % (Math.PI * 2)) / (Math.PI * 2 / this.n)); return !this.gaps.has(slot); }
  update(dt) { this.rot += dt * 1.4; this.t -= dt; this.up = Math.min(1, this.up + dt * 3); }
  draw(cx, cy) {
    const step = Math.PI * 2 / this.n, r = this.r * this.up;
    ctx.save(); ctx.strokeStyle = 'rgba(155,227,106,.25)'; ctx.lineWidth = 2; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    for (let k = 0; k < this.n; k++) {
      if (this.gaps.has(k)) continue;
      const a = this.rot + (k + 0.5) * step, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 22); g.addColorStop(0, 'rgba(155,227,106,.5)'); g.addColorStop(1, 'rgba(155,227,106,0)');
      ctx.fillStyle = g; ctx.fillRect(x - 22, y - 22, 44, 44);
      ctx.beginPath(); ctx.ellipse(x, y, 11, 9, a, 0, 7); inked('#7fb85a', 2.5);
    }
    ctx.restore();
  }
}
class Stalagmite {   // dust cloud warning, then a jagged spike bursts out of the floor
  constructor(x, floorY, delay = 0) { Object.assign(this, { x, y: floorY, t: -delay, dead: false, h: 0, snd: false, rumbled: false }); }
  update(dt) {
    this.t += dt; const t = this.t;
    if (t < 0) return;
    if (t < 0.8) { if (!this.rumbled) { this.rumbled = true; SFX.dirt(); } if (Math.random() < 0.5) dust(this.x + rand(-20, 20), this.y, 1); this.h = 0; }
    else if (t < 0.92) { this.h = 130 * (t - 0.8) / 0.12; if (!this.snd) { this.snd = true; SFX.slam(); addShake(5); burst(this.x, this.y - 10, 10, { colors: ['#8c7b6b', '#5a4a3a'], maxSpeed: 300, grav: 1200, type: 'debris' }); } }
    else if (t < 1.6) this.h = 130;
    else if (t < 1.85) this.h = 130 * (1 - (t - 1.6) / 0.25);
    else { this.dead = true; return; }
    if (this.h > 10 && overlap(Player.hurtbox(), { x: this.x - 16, y: this.y - this.h, w: 32, h: this.h })) Player.hurt(sgn(Player.x + Player.w / 2 - this.x) || 1);
  }
  draw() {
    if (this.t < 0) return;
    if (this.t < 0.8) {
      const a = 0.25 + 0.2 * Math.sin(this.t * 30);
      ctx.fillStyle = `rgba(140,123,107,${a})`; ctx.beginPath(); ctx.ellipse(this.x, this.y - 6, 30, 10, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = `rgba(232,54,28,${a + 0.2})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(this.x - 8, this.y - 2); ctx.lineTo(this.x, this.y - 12); ctx.lineTo(this.x + 8, this.y - 2); ctx.stroke();
      return;
    }
    ctx.save(); ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(this.x - 22, this.y); ctx.lineTo(this.x - 9, this.y - this.h * 0.55); ctx.lineTo(this.x - 4, this.y - this.h * 0.5); ctx.lineTo(this.x + 2, this.y - this.h);
    ctx.lineTo(this.x + 9, this.y - this.h * 0.6); ctx.lineTo(this.x + 14, this.y - this.h * 0.62); ctx.lineTo(this.x + 22, this.y); ctx.closePath(); inked('#8c7b6b', 3);
    ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(this.x - 2, this.y - this.h * 0.8, 3, this.h * 0.6);
    ctx.restore();
  }
}
class Fionn {
  constructor() {
    const p = A.fionn;
    Object.assign(this, { type: 'boss', w: 30, h: 56, hp: 112, maxHp: 112, flash: 0, harmful: false, pogoable: true, givesHype: true, state: 'wait', t: 0, anim: 0, facing: -1,
      step: 0, rocks: [], throwT: 0, shield: null, shout: null, cast: 0, stomp: 0, vx: 0, bolts: 60, nameI: 0, clangT: 0, wave: 1, drops: 0 });
    this.x = p.x - this.w / 2; this.y = p.y - this.h;
  }
  arena() { return ROOM.g_pedestal.px; }
  // four waves: 112 → 78 → 50 → 22
  phase() { const k = this.hp / this.maxHp; return k > 0.7 ? 1 : k > 0.45 ? 2 : k > 0.2 ? 3 : 4; }
  begin() { this.state = 'idle'; this.t = 1.0; this.harmful = true; }
  say(text, dur = 1.6) { this.shout = { text, t: dur }; }
  nextName() { return ROCK_NAMES[this.nameI++ % ROCK_NAMES.length]; }
  update(dt) {
    this.anim += dt; this.flash = Math.max(0, this.flash - dt); this.t -= dt; this.clangT = Math.max(0, this.clangT - dt);
    this.cast = approach(this.cast, this.state === 'barrage' || this.state === 'shield' ? 1 : 0, dt * 4); this.stomp = Math.max(0, this.stomp - dt * 2.5);
    if (this.shout) { this.shout.t -= dt; if (this.shout.t <= 0) this.shout = null; }
    if (this.state === 'wait' || this.state === 'beaten') return;
    const P = Player, cx = this.x + this.w / 2, pcx = P.x + P.w / 2, ph = this.phase(), ar = this.arena();
    if (this.state !== 'stunned') this.facing = sgn(pcx - cx) || this.facing;
    // a new wave: he stops, drops what he's holding and stomps the whole cave awake
    if (ph > this.wave && (this.state === 'idle' || this.state === 'barrage' || this.state === 'stompWind')) {
      this.wave = ph; this.state = 'roar'; this.t = 1.4; this.vx = 0; this.stomp = 1;
      for (const b of this.rocks) if (!b.dead) b.shatter(); this.rocks = [];
      this.say(['', '', 'THE CAVE IS LISTENING!', 'THE MOUNTAIN ITSELF!', 'AVALANCHE SEASON!'][ph], 1.4);
      pop(cx, this.y - 50, 'WAVE ' + ph + '/4', { size: 40, color: '#9be36a', burstColor: '#2a4a2a' });
      SFX.slam(); addShake(14); dust(cx, this.y + this.h, 18); ring(cx, this.y + this.h, 10, 160, 0.6, '#9be36a', 6);
    }
    if (this.shield) {
      this.shield.update(dt);
      if (this.shield.t <= 0) { this.shield = null; this.say('Hmph. Pebble break.', 1.2); if (this.state === 'shield') { this.state = 'idle'; this.t = 0.9; } }
    }
    switch (this.state) {
      case 'idle': {
        const gap = Math.abs(pcx - cx), want = gap < 150 ? -1 : gap > 380 ? 1 : 0;
        this.vx = approach(this.vx, want * this.facing * 120, 800 * dt);
        if (this.t <= 0) this.pick(ph);
        break;
      }
      case 'barrage':
        this.vx = 0; this.throwT -= dt;
        if (this.throwT <= 0) {
          const r = this.rocks.find(b => !b.dead && b.state === 'hold');
          if (r) { r.throwAt(pcx, P.y + P.h / 2); this.say(this.nextName(), 1.1); this.throwT = ph === 4 ? 0.45 : ph === 3 ? 0.55 : 0.8; }
          else if (!this.rocks.some(b => !b.dead && b.state === 'rise')) { this.rocks = []; this.state = 'idle'; this.t = ph >= 3 ? 0.8 : 1.2; }
        }
        break;
      case 'stompWind':
        this.vx = 0; this.stomp = 1;
        if (this.t <= 0) {
          SFX.slam(); addShake(10); dust(cx, this.y + this.h, 12); pop(cx, this.y - 20, 'STOMP!', { size: 34 });
          const fy = A.fionn.y, xs = [clamp(pcx, ar.x + 2 * TILE, ar.x + ar.w - 2 * TILE)];
          if (ph >= 2) xs.push(clamp(pcx + rand(140, 220), ar.x + 2 * TILE, ar.x + ar.w - 14 * TILE), clamp(pcx - rand(140, 220), ar.x + 2 * TILE, ar.x + ar.w - 2 * TILE));
          xs.forEach(x => FX.push(new Stalagmite(x, fy)));
          if (ph >= 3) for (let k = 0; k < 6; k++) FX.push(new Stalagmite(cx + this.facing * (90 + k * 120), fy, 0.25 + k * 0.14));
          if (ph === 4) for (let k = 0; k < 6; k++) FX.push(new Stalagmite(cx - this.facing * (90 + k * 120), fy, 0.55 + k * 0.14));   // both ways at once
          this.state = 'idle'; this.t = ph >= 3 ? 1.6 : 1.5;
        }
        break;
      case 'roar':
        this.vx = 0; this.stomp = Math.max(this.stomp, 0.6);
        if (this.t <= 0) { this.state = 'idle'; this.t = 0.5; }
        break;
      case 'avalanche':   // rocks rain from the cave roof, every third one green and smackable
        this.vx = 0; this.throwT -= dt;
        if (this.throwT <= 0) {
          const x = clamp(this.drops % 2 ? pcx : rand(ar.x + 3 * TILE, ar.x + ar.w - 3 * TILE), ar.x + 3 * TILE, ar.x + ar.w - 3 * TILE);
          let y = P.y - 360; while (pointSolid(x, y) && y < P.y - 120) y += TILE;
          const b = new Boulder(this, 0, this.drops % 3 === 2);
          Object.assign(b, { state: 'thrown', x, y, vx: 0, vy: 430 }); Bolts.push(b); SFX.dirt();
          if (Math.random() < 0.4) this.say(this.nextName(), 0.9);
          this.drops++; this.throwT = 0.32;
          if (this.drops >= 9) { this.state = 'idle'; this.t = 1.3; }
        }
        break;
      case 'shield':
        this.vx = 0; this.throwT -= dt;
        if (this.throwT <= 0) {
          const b = new Boulder(this, 0, true); b.state = 'thrown'; b.x = cx + this.facing * 20; b.y = this.y - 30; b.throwAt(pcx, P.y + P.h / 2); Bolts.push(b);
          this.say(this.nextName(), 1); this.throwT = ph >= 3 ? 0.95 : 1.2;
        }
        break;
      case 'stunned':
        this.vx = 0;
        if (this.t <= 0) { this.state = 'idle'; this.t = 0.6; this.harmful = true; }
        break;
    }
    this.x = clamp(this.x + this.vx * dt, ar.x + 30 * TILE, ar.x + 68 * TILE - this.w);
  }
  pick(ph) {
    const plan = ph === 1 ? ['barrage', 'pillar'] : ph === 2 ? ['shield', 'barrage', 'pillar', 'barrage', 'pillar'] : ph === 3 ? ['shield', 'pillar', 'barrage', 'pillar']
      : ['avalanche', 'barrage', 'pillar', 'shield', 'avalanche', 'pillar'];
    const a = plan[this.step++ % plan.length];
    if (a === 'barrage') {
      const n = ph === 4 ? 5 : ph === 3 ? 4 : 3, pat = ph === 1 ? [false, true, false] : [true, false, true, false];
      this.rocks = [];
      for (let k = 0; k < n; k++) { const b = new Boulder(this, (k - (n - 1) / 2) * 60, pat[k % pat.length]); b.t = -k * 0.12; this.rocks.push(b); Bolts.push(b); }
      this.state = 'barrage'; this.throwT = 0.75; SFX.summon(); this.say('BEHOLD! GEOLOGY!', 1);
    } else if (a === 'pillar') { this.state = 'stompWind'; this.t = 0.5; this.say('FEEL THE STRATA!', 0.9); SFX.windup(); }
    else if (a === 'avalanche') { this.state = 'avalanche'; this.drops = 0; this.throwT = 0.6; this.stomp = 1; SFX.slam(); addShake(10); this.say('ROCKFALL! EVERYONE HAS A NAME!', 1.3); }
    else { this.shield = new PebbleShield(); this.state = 'shield'; this.throwT = 0.9; SFX.summon(); this.say('LUCKY PEBBLE SHIELD!', 1.4); }
  }
  rockHit(rock) {
    if (this.state === 'beaten') return;
    if (this.shield) {
      this.shield = null; this.state = 'stunned'; this.t = 3.4; this.harmful = false; this.rocks = [];
      for (const b of Bolts) if (b instanceof Boulder) b.shatter();
      this.damage(6); SFX.hit(true); addShake(12); addHitstop(0.12);
      pop(this.x + this.w / 2, this.y - 30, 'STAGGERED!', { size: 40, color: '#9be36a', burstColor: '#2a4a2a' }); this.say('MY PEBBLES!', 1.4);
      burst(this.x + this.w / 2, this.y + this.h / 2, 30, { colors: ['#9be36a', '#7fb85a', BONE], maxSpeed: 520 });
    } else { this.damage(4); pop(this.x + this.w / 2, this.y - 20, 'ROCKED!', { size: 30 }); SFX.hit(true); }
  }
  damage(d) {
    if (this.state === 'beaten') return;
    this.hp = Math.max(0, this.hp - d); this.flash = 0.1; BossBar.set(this.hp / this.maxHp);
    if (this.hp <= 0) {
      this.state = 'beaten'; this.harmful = false; this.shield = null; this.shout = null; FX.length = 0; Hazards.length = 0;
      for (const b of Bolts) b.dead = true;
      Story.fionnDefeat(this);
    }
  }
  takeHit(dmg) {
    if (this.state === 'wait' || this.state === 'beaten') return false;
    if (this.shield) {
      if (this.clangT <= 0) { this.clangT = 0.3; SFX.clang(); pop(this.x + this.w / 2, this.y - 16, 'PEBBLE SHIELD!', { size: 24, color: '#9be36a', burstColor: '#2a4a2a' }); }
      if (!Zone.shieldTip) { Zone.shieldTip = true; toast('SMACK HIS GREEN ROCKS BACK · AIM FOR A GAP IN THE RING'); }
      return false;
    }
    this.damage(this.state === 'stunned' ? dmg * 1.5 : dmg);
    return true;
  }
  draw() {
    const cx = this.x + this.w / 2, fy = this.y + this.h;
    drawFionn(cx, fy, this.facing, this.anim, { cast: this.cast, stomp: this.stomp, stun: this.state === 'stunned', kneel: this.state === 'beaten', point: this.state === 'barrage' });
    if (this.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(this.x, this.y, this.w, this.h); }
    if (this.shield) this.shield.draw(cx, this.y + this.h / 2);
    drawShout(cx, this.y - 30, this.shout);
  }
}

/* ================= MILO ================= */
class Tornado {
  constructor(x, dir, floorY) { Object.assign(this, { x, dir, y: floorY, t: 0, dead: false }); }
  update(dt) {
    this.t += dt; this.x += this.dir * 250 * dt;
    const ar = ROOM.s_fountain.px;
    if (this.x < ar.x - 40 || this.x > ar.x + ar.w + 40) { this.dead = true; return; }
    if (Math.random() < 0.5) dust(this.x + rand(-20, 20), this.y, 1, this.dir);
    if (overlap(Player.hurtbox(), { x: this.x - 24, y: this.y - 150, w: 48, h: 150 })) Player.hurt(this.dir);
  }
  draw() {
    const t = Game.time;
    ctx.save(); ctx.globalAlpha = Math.min(1, this.t * 3);
    for (let k = 0; k < 9; k++) {
      const yy = this.y - k * 17, w = 10 + k * 4.5, sw = Math.sin(t * 10 + k * 0.7) * 6;
      ctx.beginPath(); ctx.ellipse(this.x + sw, yy, w, 5, 0, 0, 7);
      ctx.fillStyle = k % 2 ? 'rgba(150,130,190,.55)' : 'rgba(200,190,230,.5)'; ctx.fill(); ctx.strokeStyle = 'rgba(13,11,16,.5)'; ctx.lineWidth = 1.5; ctx.stroke();
    }
    if (Math.random() < 0.15) { ctx.strokeStyle = '#d9b8ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(this.x, this.y - 140); ctx.lineTo(this.x + rand(-14, 14), this.y - 90); ctx.lineTo(this.x + rand(-14, 14), this.y - 40); ctx.stroke(); }
    ctx.restore();
  }
}
class RuneStrike {   // glowing purple rune on the floor, then a lightning bolt
  constructor(x, floorY, delay = 0) { Object.assign(this, { x, y: floorY, t: -delay, dead: false, struck: false }); }
  update(dt) {
    this.t += dt;
    if (this.t >= 0.95 && !this.struck) {
      this.struck = true; SFX.thunder(); addShake(6); Game.flashWhite = Math.max(Game.flashWhite, 0.15);
      const c = Player.center();
      if (Math.abs(c.x - this.x) < 36 && !Player.dead) Player.hurt(sgn(c.x - this.x) || 1);
      for (const r of RODS) if (r.room === Zone.room.id && Math.abs(r.x - this.x) < 90) { r.charged = 3.6; r.flash = 0.25; }
      burst(this.x, this.y - 6, 14, { colors: ['#d9b8ff', '#ffffff', '#b98bff'], maxSpeed: 380 });
    }
    if (this.t > 1.25) this.dead = true;
  }
  draw() {
    if (this.t < 0) return;
    const a = this.struck ? Math.max(0, 1 - (this.t - 0.95) / 0.3) : Math.min(1, this.t * 3);
    ctx.save(); ctx.globalAlpha = a; ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = '#b98bff'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(this.x, this.y - 3, 34, 8, 0, 0, 7); ctx.stroke();
    ctx.beginPath(); for (let k = 0; k < 5; k++) { const an = this.t * 3 + k * 1.2566; ctx.lineTo(this.x + Math.cos(an) * 24, this.y - 3 + Math.sin(an) * 5.5); } ctx.closePath(); ctx.stroke();
    if (this.struck) {
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 6; ctx.beginPath(); let yy = Zone.room.px.y; ctx.moveTo(this.x + rand(-20, 20), yy);
      while (yy < this.y) { yy += 36; ctx.lineTo(this.x + rand(-16, 16), Math.min(yy, this.y)); } ctx.stroke();
      ctx.strokeStyle = '#b98bff'; ctx.lineWidth = 14; ctx.globalAlpha = a * 0.3; ctx.stroke();
    }
    ctx.restore();
  }
}
class OverloadOrb {   // Milo's unstable energy sphere: rally it back three times
  constructor(boss) { Object.assign(this, { boss, x: 0, y: 0, vx: 0, vy: 0, r: 8, friendly: false, dead: false, t: 0, rally: 0, state: 'charge' }); }
  get unhittable() { return this.state !== 'fly' || this.friendly; }
  box() { return { x: this.x - this.r - 10, y: this.y - this.r - 10, w: (this.r + 10) * 2, h: (this.r + 10) * 2 }; }
  launch(speed) {
    const c = Player.center(), dx = c.x - this.x, dy = c.y - this.y, d = Math.hypot(dx, dy) || 1;
    this.vx = dx / d * speed; this.vy = dy / d * speed; this.state = 'fly'; this.friendly = false; SFX.laser();
  }
  update(dt) {
    this.t += dt;
    const b = this.boss;
    if (this.state === 'charge') { this.x = b.x + b.w / 2; this.y = b.y - 26; this.r = 8 + Math.min(1, this.t / 1.4) * 12; return; }
    if (this.friendly) {
      const bx = b.x + b.w / 2, by = b.y + b.h / 2, dx = bx - this.x, dy = by - this.y, d = Math.hypot(dx, dy) || 1, sp = 760 + this.rally * 120;
      this.vx = lerp(this.vx, dx / d * sp, 1 - Math.exp(-9 * dt)); this.vy = lerp(this.vy, dy / d * sp, 1 - Math.exp(-9 * dt));
      this.x += this.vx * dt; this.y += this.vy * dt;
      if (d < 34) b.orbReturned(this);
      return;
    }
    this.x += this.vx * dt; this.y += this.vy * dt;
    if (Math.random() < 0.7) spawnParticle({ x: this.x + rand(-6, 6), y: this.y + rand(-6, 6), vx: rand(-40, 40), vy: rand(-40, 40), life: 0.3, size: rand(2, 4), color: Math.random() < 0.5 ? '#b98bff' : '#6fd3ff', type: 'dot' });
    const ar = ROOM.s_fountain.px;
    if (pointSolid(this.x, this.y) || this.x < ar.x || this.x > ar.x + ar.w || this.y > ar.y + ar.h || this.t > 9) { this.pop(); b.orbMissed(); return; }
    if (overlap({ x: this.x - this.r, y: this.y - this.r, w: this.r * 2, h: this.r * 2 }, Player.hurtbox())) { Player.hurt(sgn(this.vx) || 1); this.pop(); b.orbMissed(); }
  }
  pop() { this.dead = true; explode(this.x, this.y, 52, 0, { friendly: false, small: true, word: 'FZZAP!', colors: ['#b98bff', '#6fd3ff', BONE] }); }
  onBat() {
    this.friendly = true; this.rally++; SFX.deflect(); addHitstop(0.1); addShake(7);
    pop(this.x, this.y - 22, ['RETURN!', 'RALLY!', 'MATCH POINT!'][Math.min(2, this.rally - 1)], { size: 36, color: '#d9b8ff', burstColor: '#4a3a8a' });
    ring(this.x, this.y, 8, 70, 0.3, '#d9b8ff', 6);
  }
  draw() {
    const pulse = 0.5 + 0.5 * Math.sin(this.t * 18);
    const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r * 2.6); g.addColorStop(0, `rgba(185,139,255,${0.5 + pulse * 0.3})`); g.addColorStop(1, 'rgba(185,139,255,0)');
    ctx.fillStyle = g; ctx.fillRect(this.x - this.r * 2.6, this.y - this.r * 2.6, this.r * 5.2, this.r * 5.2);
    ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, 7); inked(this.friendly ? '#ffd27a' : '#d9b8ff', 2.5);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
    for (let k = 0; k < 3; k++) { const a = this.t * 7 + k * 2.1; ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.x + Math.cos(a) * this.r * 1.4, this.y + Math.sin(a) * this.r * 1.4); ctx.stroke(); }
    if (this.state === 'fly' && !this.friendly && Math.hypot(Player.x - this.x, Player.y - this.y) < 220) {
      ctx.font = `12px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = '#d9b8ff'; ctx.fillText(`SWING! ${this.rally}/3`, this.x, this.y - this.r - 14);
    }
  }
}
class Milo {
  constructor() {
    const p = A.milo;
    Object.assign(this, { type: 'boss', w: 34, h: 56, hp: 100, maxHp: 100, flash: 0, harmful: false, pogoable: true, givesHype: true, state: 'wait', t: 0, anim: 0, facing: -1, step: 0,
      hx: p.x, hy: p.y, vy: 0, orb: null, panic: 0, bolts: 60, shout: null, wave: 1, k: 0 });
    this.x = p.x - this.w / 2; this.y = p.y - this.h / 2;
  }
  // three waves: 100 → 66 → 33
  phase() { const k = this.hp / this.maxHp; return k > 0.66 ? 1 : k > 0.33 ? 2 : 3; }
  begin() { this.state = 'float'; this.t = 1.2; this.harmful = true; }
  say(text, dur = 1.6) { this.shout = { text, t: dur }; }
  update(dt) {
    this.anim += dt; this.flash = Math.max(0, this.flash - dt); this.t -= dt; this.panic = Math.max(0, this.panic - dt);
    if (this.shout) { this.shout.t -= dt; if (this.shout.t <= 0) this.shout = null; }
    if (this.state === 'wait') { this.y = this.hy - this.h / 2 + Math.sin(this.anim * 2) * 6; return; }
    if (this.state === 'beaten') { this.vy = Math.min(this.vy + 1800 * dt, 900); const fl = landYAt(this.x + this.w / 2, this.y + this.h - 4); this.y = Math.min(this.y + this.vy * dt, fl - this.h); return; }
    const P = Player, cx = this.x + this.w / 2, pcx = P.x + P.w / 2, ph = this.phase(), ar = ROOM.s_fountain.px, floorY = A.milo.y + 12 * TILE;
    if (this.state !== 'stunned' && this.state !== 'fall') this.facing = sgn(pcx - cx) || this.facing;
    const hover = () => {
      const tx = this.hx + Math.sin(this.anim * 0.6) * 220, ty = this.hy + Math.sin(this.anim * 1.3) * 26;
      this.x = lerp(this.x, tx - this.w / 2, 1 - Math.exp(-1.5 * dt)); this.y = lerp(this.y, ty - this.h / 2, 1 - Math.exp(-2 * dt));
    };
    switch (this.state) {
      case 'float':
        hover();
        // a new wave: he flares up, the storm gets meaner
        if (ph > this.wave) {
          this.wave = ph; this.state = 'roar'; this.t = 1.4;
          this.say(ph === 2 ? 'OKAY. OKAY! STORM, LEVEL TWO!' : 'I CAN\'T STOP IT! I CAN\'T STOP IT!', 1.4);
          pop(cx, this.y - 50, 'WAVE ' + ph + '/3', { size: 40, color: '#d9b8ff', burstColor: '#4a3a8a' });
          SFX.thunder(); addShake(12); Game.flashWhite = Math.max(Game.flashWhite, 0.25); ring(cx, this.y + this.h / 2, 10, 170, 0.6, '#d9b8ff', 6);
          break;
        }
        if (this.t <= 0) this.pick(ph);
        break;
      case 'roar':
        this.y = lerp(this.y, this.hy - this.h / 2 - 30, 1 - Math.exp(-4 * dt)); this.panic = 0.3;
        if (this.t <= 0) { this.state = 'float'; this.t = 0.4; }
        break;
      case 'castStorm':   // three gusts back to back: both walls, then one side, then the other, with lightning in between
        hover();
        if (this.t <= 0) {
          if (this.k === 0) FX.push(new Tornado(ar.x + 2 * TILE, 1, floorY), new Tornado(ar.x + ar.w - 2 * TILE, -1, floorY));
          else FX.push(this.k === 1 ? new Tornado(ar.x + 2 * TILE, 1, floorY) : new Tornado(ar.x + ar.w - 2 * TILE, -1, floorY));
          const xs = [clamp(pcx, ar.x + 60, ar.x + ar.w - 60), rand(ar.x + 60, ar.x + ar.w - 60)];
          xs.forEach((x, n) => FX.push(new RuneStrike(x, landYAt(x, ar.y + 2 * TILE), 0.4 + n * 0.15)));
          SFX.wind(); SFX.whoosh();
          this.k++; this.t = 1.5;
          if (this.k >= 3) { this.state = 'float'; this.t = 1.8; }
        }
        break;
      case 'castTornado':
        hover();
        if (this.t <= 0) { FX.push(new Tornado(ar.x + 2 * TILE, 1, floorY), new Tornado(ar.x + ar.w - 2 * TILE, -1, floorY)); SFX.wind(); SFX.whoosh(); this.state = 'float'; this.t = ph >= 2 ? 2.0 : 2.6; }
        break;
      case 'castRunes':
        hover();
        if (this.t <= 0) {
          const n = ph === 3 ? 8 : ph === 2 ? 6 : 4, xs = [clamp(pcx, ar.x + 60, ar.x + ar.w - 60)];
          for (let k = 1; k < n; k++) xs.push(rand(ar.x + 60, ar.x + ar.w - 60));
          xs.forEach((x, k) => FX.push(new RuneStrike(x, landYAt(x, ar.y + 2 * TILE), k * 0.12)));
          this.state = 'float'; this.t = ph >= 2 ? 1.6 : 2.0;
        }
        break;
      case 'charge':
        this.y = lerp(this.y, this.hy - this.h / 2, 1 - Math.exp(-3 * dt));
        if (this.t <= 0 && this.orb) { this.orb.launch(ph === 3 ? 390 : 330); this.state = 'rally'; this.say('THE STORM… OBEYS… ME!', 1.2); }
        break;
      case 'rally':
        this.y = lerp(this.y, this.hy - this.h / 2 + Math.sin(this.anim * 3) * 8, 1 - Math.exp(-3 * dt));
        if (!this.orb || this.orb.dead) { this.orb = null; this.state = 'float'; this.t = 1.2; }
        break;
      case 'fall': {
        this.vy = Math.min(this.vy + 2000 * dt, 1100); this.y += this.vy * dt;
        const fl = landYAt(cx, this.y + this.h - 4);
        if (this.y + this.h >= fl) { this.y = fl - this.h; this.state = 'stunned'; this.t = 4.4; SFX.land(); addShake(8); dust(cx, fl, 12); }
        break;
      }
      case 'stunned':
        if (Math.random() < 0.15) spawnParticle({ x: cx + rand(-10, 10), y: this.y + 4, vx: rand(-10, 10), vy: -40, life: 1, size: 7, color: 'rgba(80,70,90,.45)', type: 'puff', drag: 1 });
        if (this.t <= 0) { this.state = 'rise'; this.t = 0.9; this.say('I MEANT TO DO THAT!', 1.2); SFX.jump(); }
        break;
      case 'rise':
        this.y = lerp(this.y, this.hy - this.h / 2, 1 - Math.exp(-4 * dt));
        if (this.t <= 0) { this.state = 'float'; this.t = 1.0; this.harmful = true; }
        break;
    }
    this.x = clamp(this.x, ar.x + TILE, ar.x + ar.w - TILE - this.w);
  }
  pick(ph) {
    const plan = ph === 1 ? ['tornado', 'runes', 'overload'] : ph === 2 ? ['runes', 'tornado', 'overload', 'runes', 'overload']
      : ['storm', 'overload', 'runes', 'storm', 'overload', 'tornado'];
    const a = plan[this.step++ % plan.length];
    if (a === 'tornado') { this.state = 'castTornado'; this.t = 0.7; this.say('TORNADO WALLS!', 1.1); SFX.windup(); }
    else if (a === 'storm') { this.state = 'castStorm'; this.k = 0; this.t = 0.8; this.say('PERFECT STORM! …PROBABLY!', 1.3); SFX.windup(); SFX.staticBuzz(0.4); }
    else if (a === 'runes') { this.state = 'castRunes'; this.t = 0.5; this.say('ARCANE LIGHTNING!', 1.1); SFX.staticBuzz(0.4); }
    else { this.orb = new OverloadOrb(this); Bolts.push(this.orb); this.state = 'charge'; this.t = 1.5; this.say('BEHOLD! OVERLOAD!', 1.3); SFX.laserCharge(); }
  }
  orbReturned(o) {
    if (o.rally < 3) {
      // panic-swat it back, faster each time
      o.friendly = false; o.launch(330 + o.rally * 120 + (this.phase() === 3 ? 60 : 0)); this.panic = 0.9; SFX.deflect();
      this.say(['oh no oh no oh no', 'NOPE! NOPE NOPE NOPE!'][o.rally - 1] || 'AAAH!', 1.1);
      return;
    }
    o.dead = true; this.orb = null;
    explode(o.x, o.y, 70, 0, { friendly: false, word: 'BACKFIRE!', colors: ['#b98bff', '#6fd3ff', GOLD, BONE] });
    for (let k = 0; k < 10; k++) spawnParticle({ x: this.x + this.w / 2 + rand(-20, 20), y: this.y + rand(0, 30), vx: rand(-50, 50), vy: rand(-80, -10), life: rand(0.8, 1.4), size: rand(8, 14), color: 'rgba(70,60,80,.55)', type: 'puff', drag: 1.5 });
    Game.flashWhite = 0.4; addShake(12); addHitstop(0.12);
    this.state = 'fall'; this.vy = -150; this.harmful = false; this.say('…that was on purpose.', 1.6);
    this.damage(10);
  }
  orbMissed() { this.orb = null; if (this.state === 'rally' || this.state === 'charge') { this.state = 'float'; this.t = 1.4; } }
  damage(d) {
    if (this.state === 'beaten') return;
    this.hp = Math.max(0, this.hp - d); this.flash = 0.1; BossBar.set(this.hp / this.maxHp);
    if (this.hp <= 0) {
      this.state = 'beaten'; this.harmful = false; this.vy = 0; this.shout = null; FX.length = 0; Hazards.length = 0;
      for (const b of Bolts) b.dead = true; this.orb = null;
      Story.miloDefeat(this);
    }
  }
  takeHit(dmg, kx) {
    if (this.state === 'wait' || this.state === 'beaten') return false;
    const st = this.state === 'stunned' || this.state === 'fall';
    this.damage(st ? dmg * 1.5 : dmg);
    if (!st) this.x += (kx || 0) * 10;
    return true;
  }
  draw() {
    const cx = this.x + this.w / 2, st = this.state === 'stunned' || this.state === 'fall' || this.state === 'beaten';
    if (!st) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(cx, this.y + this.h, 0, cx, this.y + this.h, 50); g.addColorStop(0, 'rgba(185,139,255,.3)'); g.addColorStop(1, 'rgba(185,139,255,0)'); ctx.fillStyle = g; ctx.fillRect(cx - 50, this.y + this.h - 50, 100, 100); ctx.restore(); }
    drawMilo(cx, this.y + this.h, this.facing, this.anim, { cast: this.state === 'castTornado' || this.state === 'castRunes' || this.state === 'castStorm' || this.state === 'roar' || this.state === 'charge', panic: this.panic > 0, stun: st });
    if (this.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(this.x, this.y, this.w, this.h); }
    if (this.state === 'stunned') for (let k = 0; k < 3; k++) { const a = this.anim * 4 + k * 2.1; ctx.fillStyle = GOLD; ctx.font = `12px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillText('★', cx + Math.cos(a) * 16, this.y - 14 + Math.sin(a) * 5); }
    drawShout(cx, this.y - 34, this.shout);
  }
}

/* ================= KING DENIZ ================= */
class IceLance {   // floating spear: tracks Nathan, locks on, then fires
  constructor(x, y, lock) { Object.assign(this, { x, y, vx: 0, vy: 0, ang: Math.PI / 2, t: 0, lock, state: 'aim', dead: false, friendly: false, appear: 0 }); }
  get unhittable() { return this.state !== 'fly'; }
  box() { return { x: this.x - 16, y: this.y - 16, w: 32, h: 32 }; }
  update(dt) {
    this.t += dt; this.appear = Math.min(1, this.appear + dt * 4);
    const c = Player.center();
    if (this.state === 'aim') { this.ang = Math.atan2(c.y - this.y, c.x - this.x); if (this.t >= this.lock) { this.state = 'locked'; this.t = 0; SFX.blip(); } return; }
    if (this.state === 'locked') { if (this.t >= 0.5) { this.state = 'fly'; this.t = 0; this.vx = Math.cos(this.ang) * 980; this.vy = Math.sin(this.ang) * 980; SFX.whoosh(); } return; }
    this.x += this.vx * dt; this.y += this.vy * dt;
    const tx = this.x + Math.cos(this.ang) * 22, ty = this.y + Math.sin(this.ang) * 22;
    if (pointSolid(tx, ty) || this.t > 2) { this.shatter(); return; }
    if (overlap({ x: tx - 8, y: ty - 8, w: 16, h: 16 }, Player.hurtbox())) { Player.hurt(sgn(this.vx) || 1); this.shatter(); }
  }
  onBat() { Player.gainHype(4); pop(this.x, this.y - 16, 'SHATTER!', { size: 26, color: '#bfefff', burstColor: '#2a4a66' }); this.shatter(); }
  shatter() { this.dead = true; SFX.crystal(); burst(this.x, this.y, 12, { colors: ['#bfefff', '#dff6ff', BONE], maxSpeed: 320, grav: 600 }); }
  draw() {
    if (this.state !== 'fly') {
      ctx.save(); ctx.strokeStyle = this.state === 'locked' ? 'rgba(255,74,58,.8)' : 'rgba(191,239,255,.35)'; ctx.lineWidth = this.state === 'locked' ? 2.5 : 1.5;
      if (this.state === 'aim') ctx.setLineDash([6, 8]);
      ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.x + Math.cos(this.ang) * 900, this.y + Math.sin(this.ang) * 900); ctx.stroke(); ctx.restore();
    }
    ctx.save(); ctx.globalAlpha = this.appear; ctx.translate(this.x, this.y); ctx.rotate(this.ang); ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(26, 0); ctx.lineTo(4, -6); ctx.lineTo(-22, -3); ctx.lineTo(-26, 0); ctx.lineTo(-22, 3); ctx.lineTo(4, 6); ctx.closePath(); inked('#dff6ff', 2.2);
    ctx.fillStyle = 'rgba(111,211,255,.6)'; ctx.fillRect(-18, -1, 30, 2);
    ctx.restore();
  }
}
class FreezeWave {   // "KNEEL!": the whole floor (and every ledge) frosts over
  constructor(x, floorY) { Object.assign(this, { x, y: floorY, t: 0, dead: false, hit: false }); }
  frozen() { return this.t > 0.25 && this.t < 1.65; }
  update(dt) {
    this.t += dt;
    if (this.t > 1.95) { this.dead = true; return; }
    const P = Player;
    if (this.frozen() && P.onGround && !P.dead) {
      if (!this.hit) { this.hit = true; pop(P.x + 11, P.y - 20, 'FROZEN!', { size: 30, color: '#bfefff', burstColor: '#2a4a66' }); }
      P.hurt(sgn(P.x + P.w / 2 - this.x) || 1);
    }
  }
  draw() {
    const ar = ROOM.i_throne.px, k = Math.min(1, this.t / 0.3), a = this.t > 1.65 ? Math.max(0, 1 - (this.t - 1.65) / 0.3) : 1;
    const x0 = Math.max(ar.x, this.x - ar.w * k), x1 = Math.min(ar.x + ar.w, this.x + ar.w * k);
    ctx.save(); ctx.globalAlpha = a;
    const sheet = (sx0, sx1, y) => {
      if (sx1 <= sx0) return;
      ctx.fillStyle = 'rgba(191,239,255,.75)'; ctx.fillRect(sx0, y - 8, sx1 - sx0, 8);
      ctx.fillStyle = '#dff6ff'; ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
      for (let x = sx0 + 6; x < sx1 - 6; x += 22) { const h = 8 + ((x * 7) % 9); ctx.beginPath(); ctx.moveTo(x - 6, y - 7); ctx.lineTo(x, y - 7 - h); ctx.lineTo(x + 6, y - 7); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    };
    sheet(x0, x1, this.y);
    // ledges and the throne frost over too
    for (let ty = Math.floor(ar.y / TILE); ty < Math.floor((ar.y + ar.h) / TILE) - 1; ty++) {
      let run = -1;
      for (let tx = Math.floor(x0 / TILE); tx <= Math.floor(x1 / TILE); tx++) {
        const top = tileAt(tx, ty) && !tileAt(tx, ty - 1);
        if (top && run < 0) run = tx;
        if ((!top || tx === Math.floor(x1 / TILE)) && run >= 0) { sheet(run * TILE, (top ? tx + 1 : tx) * TILE, ty * TILE); run = -1; }
      }
    }
    ctx.restore();
  }
}
class CrownShard {   // the Glacier Crown, knocked clean off his head
  constructor(x, y, dir) { Object.assign(this, { x, y, vx: dir * 380, vy: -820, spin: 0, dead: false, dir }); }   // a high, slow spin up into the air
  update(dt) {
    this.vy += 900 * dt; this.x += this.vx * dt; this.y += this.vy * dt; this.spin += dt * 7;
    if (pointSolid(this.x + this.dir * 12, this.y) || pointSolid(this.x, this.y + 12)) {
      this.dead = true; SFX.crystal(); SFX.smallBoom(); addShake(10);
      burst(this.x, this.y, 30, { colors: ['#bfefff', '#dff6ff', '#6fd3ff', BONE], maxSpeed: 520, grav: 900, type: 'debris' });
      pop(this.x, this.y - 20, 'SHATTER!', { size: 40, color: '#bfefff', burstColor: '#2a4a66' });
    }
  }
  draw() {
    ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.spin);
    ctx.beginPath(); ctx.moveTo(-11, 6); ctx.lineTo(-12, -6); ctx.lineTo(-5, 0); ctx.lineTo(0, -12); ctx.lineTo(5, 0); ctx.lineTo(11, -8); ctx.lineTo(12, 6); ctx.closePath(); inked('#bfefff', 2.5);
    ctx.restore();
  }
}
class Deniz {
  constructor() {
    const s = A.denizSeat;
    Object.assign(this, { type: 'boss', w: 34, h: 62, hp: 80, maxHp: 80, flash: 0, harmful: false, pogoable: true, givesHype: true, state: 'wait', t: 0, anim: 0, facing: 1, step: 0,
      vx: 0, vy: 0, onGround: false, crown: true, raise: 0, bolts: 55, shout: null, clangT: 0, blizz: 0 });
    this.x = s.x - this.w / 2; this.y = s.y - this.h;
  }
  phase() { return this.hp > this.maxHp / 2 ? 1 : 2; }
  begin() { this.state = 'hop'; this.t = 0.7; this.from = { x: this.x, y: this.y }; SFX.jump(); }
  say(text, dur = 1.6) { this.shout = { text, t: dur }; }
  update(dt) {
    this.anim += dt; this.flash = Math.max(0, this.flash - dt); this.t -= dt; this.raise = Math.max(0, this.raise - dt * 2); this.clangT = Math.max(0, this.clangT - dt);
    if (this.shout) { this.shout.t -= dt; if (this.shout.t <= 0) this.shout = null; }
    if (this.state === 'wait') return;
    const P = Player, cx = this.x + this.w / 2, pcx = P.x + P.w / 2, ph = this.phase(), ar = ROOM.i_throne.px;
    if (this.state === 'hop') {
      const k = 1 - Math.max(0, this.t) / 0.7, to = A.denizFloor;
      this.x = lerp(this.from.x, to.x - this.w / 2, k); this.y = lerp(this.from.y, to.y - this.h, k) - Math.sin(k * Math.PI) * 120;
      if (this.t <= 0) { this.state = 'idle'; this.t = 0.8; this.harmful = true; SFX.land(); dust(cx, to.y, 10); }
      return;
    }
    if (this.state === 'beaten' || this.state === 'off') { this.vx = approach(this.vx, 0, 1200 * dt); this.vy = Math.min(this.vy + TUNE.gravity * dt, 900); moveBody(this, dt); return; }
    const faceP = () => { this.facing = sgn(pcx - cx) || this.facing; };
    switch (this.state) {
      case 'idle': {
        faceP();
        const gap = Math.abs(pcx - cx), want = gap < 200 ? -1 : gap > 360 ? 1 : 0;
        this.vx = approach(this.vx, want * this.facing * 230, 520 * dt);       // he glides on the ice
        if (Math.abs(this.vx) > 60 && Math.random() < 0.3) spawnParticle({ x: cx, y: this.y + this.h, vx: -this.vx * 0.2, vy: rand(-40, -10), life: 0.4, size: 3, color: '#dff6ff', type: 'dot' });
        if (this.t <= 0) this.pick(ph);
        break;
      }
      case 'kneel':
        this.vx = approach(this.vx, 0, 800 * dt); this.raise = 1;
        if (this.t <= 0) {
          FX.push(new FreezeWave(cx, A.denizFloor.y)); SFX.slam(); SFX.crystal(); addShake(12); Game.flashWhite = Math.max(Game.flashWhite, 0.25);
          pop(cx, this.y - 30, 'KNEEL!', { size: 46, color: '#bfefff', burstColor: '#2a4a66' });
          this.state = 'kneelHold'; this.t = 1.9;
        }
        break;
      case 'kneelHold': this.vx = 0; if (this.t <= 0) { this.state = 'idle'; this.t = ph === 2 ? 0.4 : 0.7; } break;
      case 'lances': this.vx = approach(this.vx, 0, 800 * dt); this.raise = 1; if (this.t <= 0) { this.state = 'idle'; this.t = ph === 2 ? 0.5 : 0.9; } break;
      case 'slideWind': this.vx = approach(this.vx, 0, 1500 * dt); faceP(); if (this.t <= 0) { this.state = 'slide'; this.t = 0.62; this.vx = this.facing * 720; SFX.whoosh(); } break;
      case 'slide':
        this.vx = this.facing * 720;
        if (Math.random() < 0.7) spawnParticle({ x: cx, y: this.y + this.h - 2, vx: -this.facing * rand(60, 200), vy: rand(-80, -10), life: 0.4, size: rand(2, 4), color: '#dff6ff', type: 'dot' });
        Game.afterimages.push({ x: this.x + 6, y: this.y + 10, facing: this.facing, life: 0.12, max: 0.12, color: '#bfefff' });
        if (this.hitWall || this.t <= 0) { this.state = 'recover'; this.t = 0.85; if (this.hitWall) { addShake(6); SFX.clang(); } }
        break;
      case 'recover': this.vx = approach(this.vx, 0, 1400 * dt); if (this.t <= 0) { this.state = 'idle'; this.t = 0.5; } break;
      case 'blizzard':
        this.vx = approach(this.vx, 0, 900 * dt); this.raise = 1; this.blizz = Math.min(1, this.blizz + dt * 0.6);
        if (Math.random() < 0.9) spawnParticle({ x: cx + rand(-160, 160), y: this.y - rand(0, 140), vx: rand(-200, 200), vy: rand(-60, 60), life: 0.5, size: rand(2, 4), color: '#ffffff', type: 'dot' });
        if (this.t <= 0) {
          // the blizzard blast: anything not airborne or dashing gets frozen
          SFX.boom(); SFX.crystal(); addShake(14); Game.flashWhite = 0.6;
          explode(cx, this.y + this.h / 2, 240, 0, { friendly: false, hurtsPlayer: true, word: 'ETERNAL WINTER!', colors: ['#ffffff', '#bfefff', '#6fd3ff'] });
          this.state = 'blizzRest'; this.t = 1.3; this.blizz = 0.3; this.say('THE KINGDOM WILL NOT THAW!', 1.4);
        }
        break;
      case 'blizzRest': this.vx = 0; if (this.t <= 0) { this.state = 'blizzard'; this.t = 3.6; this.say('KNEEL BEFORE THE STORM!', 1.4); } break;
    }
    this.vy = Math.min(this.vy + TUNE.gravity * dt, 900);
    moveBody(this, dt);
    this.x = clamp(this.x, ar.x + TILE, ar.x + ar.w - TILE - this.w);
  }
  pick(ph) {
    const plan = ph === 1 ? ['lances', 'slide', 'kneel', 'lances', 'slide'] : ['kneel', 'lances', 'slide', 'kneel', 'lances', 'slide', 'lances'];
    const a = plan[this.step++ % plan.length], cx = this.x + this.w / 2;
    if (a === 'kneel') { this.state = 'kneel'; this.t = 0.9; this.say('KNEEL!', 1.0); SFX.windup(); }
    else if (a === 'lances') {
      const n = ph === 1 ? 4 : 6;
      for (let k = 0; k < n; k++) { const an = -Math.PI / 2 + (k - (n - 1) / 2) * 0.42; Bolts.push(new IceLance(cx + Math.cos(an) * 120, this.y + 10 + Math.sin(an) * 110, 0.7 + k * (ph === 1 ? 0.22 : 0.17))); }
      this.state = 'lances'; this.t = 0.7 + n * 0.2 + 0.4; this.say('BOW TO THE CROWN!', 1.2); SFX.crystal();
    } else { this.state = 'slideWind'; this.t = 0.5; this.say('OFF MY ICE!', 0.9); SFX.windup(); }
  }
  takeHit(dmg, kx, ky, src) {
    if (this.state === 'wait' || this.state === 'hop' || this.state === 'beaten' || this.state === 'off') return false;
    if (this.state === 'blizzard' || this.state === 'blizzRest') {
      const heavy = src === 'fwd' && Player.comboIdx === 3;
      if (heavy && this.state === 'blizzard') { this.crack(); return true; }
      if (this.clangT <= 0) { this.clangT = 0.3; SFX.clang(); pop(this.x + this.w / 2, this.y - 16, 'NEEDS A HEAVY HIT!', { size: 24, color: '#bfefff', burstColor: '#2a4a66' }); }
      return false;
    }
    this.hp -= this.state === 'recover' ? dmg * 1.5 : dmg; this.flash = 0.1;
    if (this.hp <= this.maxHp * 0.2) {
      this.hp = this.maxHp * 0.2; this.state = 'blizzard'; this.t = 3.6; this.vx = 0; FX.length = 0;
      for (const b of Bolts) b.dead = true;
      this.say('ENOUGH! FEEL THE ETERNAL WINTER!', 1.8); SFX.summon(); BossBar.flash();
      toast('PHASE 3 · LAND ONE HEAVY SWING · THE 3RD HIT OF A COMBO');
    }
    BossBar.set(this.hp / this.maxHp);
    return true;
  }
  crack() {
    this.state = 'off'; this.harmful = false; this.crown = false; this.blizz = 0; this.shout = null;
    FX.length = 0; for (const b of Bolts) b.dead = true;
    const cx = this.x + this.w / 2, dir = -(sgn(Player.x + Player.w / 2 - cx) || 1);
    FX.push(new CrownShard(cx, this.y - 6, dir));
    addHitstop(0.4); Game.flashWhite = 1; addShake(18); SFX.bigCrack();
    pop(cx, this.y - 40, 'CRACK!!', { size: 80, life: 1.6, color: BONE, burstColor: '#2a4a66' });
    this.hp = 0; BossBar.set(0);
    Story.denizDefeat(this);
  }
  draw() {
    const cx = this.x + this.w / 2;
    if (this.blizz > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(cx, this.y + 20, 0, cx, this.y + 20, 220 * this.blizz); g.addColorStop(0, 'rgba(220,245,255,.45)'); g.addColorStop(1, 'rgba(220,245,255,0)');
      ctx.fillStyle = g; ctx.fillRect(cx - 220, this.y - 200, 440, 440); ctx.restore();
    }
    drawDeniz(cx, this.y + this.h, this.facing, this.anim, { crown: this.crown, raise: this.raise > 0.3, slide: this.state === 'slide', flash: this.flash > 0, sit: this.state === 'wait', hippie: this.hippie });
    if (this.state === 'recover') for (let k = 0; k < 3; k++) { const a = this.anim * 4 + k * 2.1; ctx.fillStyle = '#bfefff'; ctx.font = `12px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillText('❄', cx + Math.cos(a) * 16, this.y - 18 + Math.sin(a) * 5); }
    drawShout(cx, this.y - 40, this.shout);
  }
}
