'use strict';
/* =========================================================
   ZONE 2½ · THE SUNKEN BULLPEN (Act I page, under the Quarry Mouth)
   · blast the cracked Quarry Mouth floor with an Explosive Baseball
   · deep water: Nathan can't swim, so it works like spikes
   · skip throws: on the ground in a flooded room, hold ↓ and a
     direction and smack a tossed ball: a flat sidearm that skips
     off water and floors, and hits switches across the lanes
   · switches drain the two lanes and open Floodgate B; the Pump
     Room vault has an armoured switch only a Curveball can reach
   · the Floodgate Locks flood and drain on a 16 s cycle
   · Coach Maya, the rhythm pitching duel, the fourth Golden Pennant
     and the Curveball (zone/foul-echo.js does the bending)
   Rooms and geometry live in act/world.js. Loaded after zone/foul-echo.js.
   ========================================================= */
const BP = { hitBy: null, foothold: false, tips: {}, open: {}, tideWarn: false, lastRoom: null };
const bpQ = () => (Save.data.q.bp = Save.data.q.bp || {});
const bpIn = () => !!(Zone.room && Zone.room.zone === 'z12');
const BP_TEAL = '#5fd6c0';

/* ---------- water ---------- */
const BP_HIGH = 131 * TILE + 8;   // the Locks at high tide
const BP_WATER = [
  { id: 'pump',   room: 'b_pump',    x0: 66,  x1: 96,  top: 104 * TILE + 10, bot: 109 * TILE },
  { id: 'lane1',  room: 'b_tunnel',  x0: 70,  x1: 101, top: 128 * TILE + 10, bot: 131 * TILE, drain: 'sw1' },
  { id: 'arches', room: 'b_arches',  x0: 131, x1: 186, top: 128 * TILE + 12, bot: 131 * TILE },
  { id: 'glowA',  room: 'b_glow',    x0: 130, x1: 142, top: 105 * TILE + 10, bot: 109 * TILE, glow: true },
  { id: 'glowB',  room: 'b_glow',    x0: 166, x1: 181, top: 105 * TILE + 10, bot: 109 * TILE, glow: true },
  { id: 'tide',   room: 'b_locks',   x0: 201, x1: 239, top: 153 * TILE, bot: 153 * TILE, tide: true },
  { id: 'lane2',  room: 'b_cistern', x0: 58,  x1: 104, top: 150 * TILE + 10, bot: 153 * TILE, drain: 'sw2' },
].map(w => Object.assign(w, { level: w.top, x: w.x0 * TILE, w: (w.x1 - w.x0) * TILE }));
// drained lanes start drained
for (const w of BP_WATER) if (w.drain && bpQ()[w.drain]) w.level = w.bot;
const bpWaters = () => BP_WATER.filter(w => Zone.room && w.room === Zone.room.id && w.level < w.bot - 2);
const bpWaterRoom = () => !!(Zone.room && BP_WATER.some(w => w.room === Zone.room.id));
// the water whose surface a point crosses on its way down from y0 to y1
function bpWaterCross(x, y0, y1) {
  for (const w of bpWaters()) if (x >= w.x && x < w.x + w.w && y0 <= w.level && y1 > w.level) return w;
  return null;
}
// the tide: low 6 s · rising 3 s · high 4 s · falling 3 s
function bpTideLevel(t) {
  const p = ((t % 16) + 16) % 16, lo = 153 * TILE, e = k => k * k * (3 - 2 * k);
  if (p < 6) return lo;
  if (p < 9) return lerp(lo, BP_HIGH, e((p - 6) / 3));
  if (p < 13) return BP_HIGH;
  return lerp(BP_HIGH, lo, e((p - 13) / 3));
}
function bpSplash(x, y, n = 10) {
  for (let i = 0; i < n; i++) spawnParticle({ x: x + rand(-8, 8), y, vx: rand(-160, 160), vy: rand(-420, -140), grav: 1500, life: rand(0.35, 0.7), size: rand(2, 4), color: Math.random() < 0.5 ? '#bff6ec' : BP_TEAL, type: 'dot' });
  ring(x, y, 4, 34, 0.3, '#bff6ec', 3);
}
function bpUpdateWater(dt) {
  const q = bpQ();
  for (const w of BP_WATER) {
    if (w.tide) w.level = bpTideLevel(Game.time);
    else if (w.drain && q[w.drain]) w.level = approach(w.level, w.bot, 40 * dt);
  }
  if (!bpIn()) return;
  // the tide siren
  if (Zone.room.id === 'b_locks') {
    const p = ((Game.time % 16) + 16) % 16, warn = p > 4.6 && p < 6;
    if (warn && !BP.tideWarn) { SFX.slamWarn(); if (!BP.tips.tide) { BP.tips.tide = true; toast('THE LOCK IS FLOODING · GET ABOVE THE RED LINE'); } }
    BP.tideWarn = warn;
  }
  const P = Player;
  if (P.dead || P.hazard || Story.active) return;
  const hb = P.hurtbox(), feet = P.y + P.h;
  for (const w of bpWaters()) {
    if (hb.x + hb.w > w.x + 4 && hb.x < w.x + w.w - 4 && feet > w.level + 14) {
      bpSplash(P.x + P.w / 2, w.level, 16); SFX.poof();
      pop(P.x + P.w / 2, w.level - 30, 'SPLASH!', { size: 32, color: '#bff6ec', burstColor: '#1a4a48' });
      if (!BP.tips.swim) { BP.tips.swim = true; setTimeout(() => toast('NATHAN CAN\'T SWIM · KEEP OUT OF THE DEEP WATER'), 700); }
      P.hitSpikes();
      return;
    }
  }
}

/* ---------- floodgates ---------- */
const BP_GATES = [{ id: 'gateB', flag: 'sw2', room: 'b_locks', tx: 199, ty: 147, w: 2, h: 6 }, { id: 'vault', flag: 'pump', room: 'b_pump', tx: 108, ty: 96, w: 2, h: 8 }];
function bpSyncGates() { const q = bpQ(); for (const g of BP_GATES) { fill(g.tx, g.ty, g.w, g.h, q[g.flag] ? 0 : 1); if (q[g.flag] && BP.open[g.id] === undefined) BP.open[g.id] = 1; } }
bpSyncGates();
function drawBpGate(g) {
  const k = BP.open[g.id] || 0; if (k >= 1) return;
  const x = g.tx * TILE, y = g.ty * TILE, w = g.w * TILE, h = g.h * TILE, lift = k * h;
  ctx.save(); ctx.beginPath(); ctx.rect(x - 4, y, w + 8, h); ctx.clip();
  rr(x, y - lift, w, h, 3); inked('#3a4a4e', 3);
  ctx.strokeStyle = '#5a7a7a'; ctx.lineWidth = 2;
  for (let j = 1; j < 5; j++) { ctx.beginPath(); ctx.moveTo(x + 4, y - lift + j * h / 5); ctx.lineTo(x + w - 4, y - lift + j * h / 5); ctx.stroke(); }
  ctx.fillStyle = '#c9a33a'; for (const yy of [0.15, 0.85]) { ctx.beginPath(); ctx.arc(x + w / 2, y - lift + h * yy, 3, 0, 7); ctx.fill(); }
  ctx.restore();
}

/* ---------- switches: skip targets across the lanes, and the armoured one ---------- */
const BP_SWITCHES = [
  { id: 'sw1',  room: 'b_tunnel',  kind: 'skip',  post: 102, row: 128, bx: 100, bw: 3, top: 124.5 },
  { id: 'sw2',  room: 'b_cistern', kind: 'skip',  post: 56,  row: 150, bx: 55,  bw: 4, top: 146.5 },
  { id: 'pump', room: 'b_pump',    kind: 'curve', post: 99,  row: 104, bx: 98,  bw: 2, top: 100, face: -1 },
];
class BpSwitch {
  constructor(d) {
    Object.assign(this, { type: 'switch', d, id: d.id, kind: d.kind, x: d.bx * TILE, y: d.top * TILE, w: d.bw * TILE, h: (d.row - d.top) * TILE,
      hp: 1, maxHp: 1, flash: 0, harmful: false, pogoable: false, givesHype: false, noCull: true, t: rand(0, 6), clangT: 0 });
  }
  update(dt) { this.t += dt; this.flash = Math.max(0, this.flash - dt); this.clangT = Math.max(0, this.clangT - dt); }
  takeHit(dmg, kx, ky, src) {
    if (bpQ()[this.id]) return false;
    const b = BP.hitBy, px = this.d.post * TILE, py = this.y;
    const refuse = msg => { if (this.clangT <= 0) { this.clangT = 0.35; SFX.clang(); pop(px, py - 10, msg, { size: 22, color: '#bfefff', burstColor: '#1a3a48' }); } return false; };
    if (!b) return refuse(this.kind === 'curve' ? 'ARMOURED · CURVE A BALL IN' : 'SKIP A BALL AT IT');
    if (b.boom) return refuse('TOO HOT · USE A PLAIN BALL');
    if (this.kind === 'curve' && !b.curve) { b.dead = true; return refuse('CLANG! · IT NEEDS A CURVEBALL'); }
    bpTrigger(this.id); this.flash = 0.3;
    return true;
  }
  draw() {
    const on = !!bpQ()[this.id], px = this.d.post * TILE, fy = this.d.row * TILE, top = this.y, t = this.t;
    ctx.save(); ctx.lineJoin = 'round';
    ctx.fillStyle = INK; ctx.fillRect(px - 3, top + 22, 6, fy - top - 22);
    // the target: a catcher's mitt on a post (skip), or a steel plate with a shield (curve)
    const cy = top + 18, col = on ? '#7dff9a' : this.kind === 'curve' ? '#9aa8b4' : '#e8c070';
    ctx.beginPath(); ctx.arc(px, cy, 16, 0, 7); inked(this.flash > 0 ? '#ffffff' : col, 3);
    ctx.beginPath(); ctx.arc(px, cy, 8, 0, 7); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = on ? '#2a7a3a' : '#e8361c'; ctx.beginPath(); ctx.arc(px, cy, 3.5, 0, 7); ctx.fill();
    if (this.kind === 'curve' && !on) {   // the shield faces the way you'd throw straight from
      const f = this.d.face || -1;
      rr(px + f * 22 - 4, cy - 22, 8, 44, 3); inked('#6b8aa8', 2.5);
    }
    if (!on && Math.abs(Player.x - px) < 520 && Math.abs(Player.y - top) < 260) {
      ctx.font = `13px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = this.kind === 'curve' ? '#bfefff' : GOLD;
      ctx.fillText(this.kind === 'curve' ? 'CURVEBALL ONLY' : 'SKIP A BALL', px, top - 8 + Math.sin(t * 4) * 2);
    }
    ctx.restore();
  }
}
function bpTrigger(id) {
  const q = bpQ(); if (q[id]) return;
  q[id] = 1; saveGame(); SFX.unlock(); SFX.gate(); addShake(8); addHitstop(0.08);
  const d = BP_SWITCHES.find(s => s.id === id);
  if (d) { pop(d.post * TILE, d.top * TILE - 20, id === 'pump' ? 'CURVEBALL!' : 'BULLSEYE!', { size: 40, color: '#7dff9a', burstColor: '#1a4a2a' }); ring(d.post * TILE, d.top * TILE + 18, 6, 80, 0.4, '#7dff9a', 5); }
  for (const g of BP_GATES) if (g.flag === id) { BP.open[g.id] = 0; setTimeout(() => fill(g.tx, g.ty, g.w, g.h, 0), 500); }
  if (id === 'sw1') toast('THE SLUICE OPENS · THE LANE IS DRAINING');
  if (id === 'sw2') toast('THE CISTERN DRAINS · FLOODGATE B IS OPEN, A SHORTCUT TO THE LOCKS');
  if (id === 'pump') toast('THE ARMOURED SWITCH CLICKS · THE PUMP ROOM VAULT IS OPEN');
}

/* ---------- skip throws ---------- */
const _bpLaunch = Player.batLaunch;
Player.batLaunch = function (ball, ix, U, D) {
  if (!ball.boom && D && ix && this.onGround && bpWaterRoom()) return bpSkipThrow.call(this, ball, ix);
  return _bpLaunch.apply(this, arguments);
};
function bpSkipThrow(ball, ix) {
  // a low sidearm: Nathan plants his feet and the ball skims off along the surface
  this.facing = ix;
  this.attackType = 'launch'; this.attackDur = 0.2; this.attackT = 0.2; this.attackCD = 0.22; this.comboIdx = 0;
  this.sx = 1.2; this.sy = 0.85;
  const c = this.center();
  ball.shoot(ix * 0.9, 0.4);
  Object.assign(ball, { x: c.x + ix * 18, y: this.y + this.h - 16, vx: ix * 1150, vy: 360, life: 1.1, skipper: true, skips: 0 });
  addHitstop(0.05); addShake(4); SFX.launch();
  pop(ball.x, ball.y - 18, 'SIDEARM!', { size: 30, color: '#bff6ec', burstColor: '#1a4a48' });
}
function bpBounce(b, y, water) {
  b.y = y - 2; b.skips++;
  if (b.skips > 7 || Math.abs(b.vx) < 240) {
    b.dead = true;
    if (water) { bpSplash(b.x, y, 8); pop(b.x, y - 16, 'PLOP', { size: 20, burst: false, color: '#bff6ec', vy: -40 }); } else dust(b.x, y, 4);
    return;
  }
  b.vy = -Math.max(400, Math.abs(b.vy) * 0.72); b.vx *= 0.9; b.life = Math.max(b.life, 0.75);
  if (water) { bpSplash(b.x, y, 6); SFX.poof(); } else { dust(b.x, y, 3); SFX.land(); }
  pop(b.x, y - 14, 'SKIP ×' + b.skips, { size: 18, burst: false, color: '#bff6ec', vy: -50 });
}
function bpSkipUpdate(b, dt) {
  b.spin += dt * 40; b.life -= dt;
  b.trail.push({ x: b.x, y: b.y }); if (b.trail.length > 10) b.trail.shift();
  b.vy = Math.min(b.vy + 2400 * dt, 1400);
  const nx = b.x + b.vx * dt, ny = b.y + b.vy * dt, W = b.vy > 0 ? bpWaterCross(nx, b.y, ny) : null;
  if (W) { b.x = nx; bpBounce(b, W.level, true); }
  else if (pointSolid(nx, ny)) {
    // came down onto a floor from open air: skip off it too. Anything else (a wall) stops it.
    if (b.vy > 0 && !pointSolid(nx, b.y)) { b.x = nx; bpBounce(b, Math.floor(ny / TILE) * TILE, false); }
    else { burst(b.x, b.y, 10, { color: '#f3ead8', maxSpeed: 260 }); b.dead = true; }
  } else { b.x = nx; b.y = ny; }
  if (b.dead) return;
  if (Math.random() < 0.6) spawnParticle({ x: b.x, y: b.y, vx: rand(-30, 30), vy: rand(-30, 30), life: 0.25, size: rand(2, 3), color: Math.random() < 0.5 ? '#bff6ec' : '#f2c14e', type: 'dot' });
  const box = { x: b.x - 10, y: b.y - 10, w: 20, h: 20 };
  for (const e of Enemies) if (!e.dead && !e.untargetable && !b.hitSet.has(e) && overlap(box, e) && e.type !== 'orb') {
    b.hitSet.add(e);
    const ok = e.takeHit(2, sgn(b.vx), 0) !== false;
    if (ok && e.givesHype) Player.gainHype(TUNE.hypePerHit);
    if (ok && e.type !== 'switch') { pop(b.x, b.y - 12, 'SKIPPER!', { size: 26 }); addHitstop(0.05); addShake(5); SFX.hit(true); }
    if (b.dead) return;
  }
  if (b.life <= 0) { b.dead = true; dust(b.x, b.y, 3); }
}
const _bpBallUpd = Ball.prototype.update;
Ball.prototype.update = function (dt) {
  BP.hitBy = this;
  try {
    if (this.state === 'shot' && this.skipper) { bpSkipUpdate(this, dt); return; }
    const y0 = this.y;
    _bpBallUpd.call(this, dt);
    // anything else that falls into deep water just sinks
    if (!this.dead && bpWaterRoom() && this.vy > 0 && bpWaterCross(this.x, y0, this.y)) {
      const w = bpWaterCross(this.x, y0, this.y);
      this.dead = true; bpSplash(this.x, w.level, 6);
      if (!BP.tips.skip && this.state === 'shot') { BP.tips.skip = true; bpSkipTip(); }
    }
  } finally { BP.hitBy = null; }
};
function bpSkipTip() {
  toast(`SKIP IT · STAND ON THE BANK, TOSS (${Bindings.label('ball')}), HOLD ↓ + A DIRECTION, SMACK (${Bindings.label('attack')})`);
}
/* ---------- the Catcher Bot: a mask and a mitt in front, nothing behind ---------- */
class CatcherBot {
  constructor(x, y, dir) {
    Object.assign(this, { type: 'catcher', w: 32, h: 44, vx: 0, vy: 0, dir: dir || -1, hp: 5, maxHp: 5, flash: 0, state: 'patrol', t: 1, onGround: false,
      harmful: true, pogoable: true, givesHype: true, bolts: 8, anim: 0, clangT: 0, turnT: 0, catchT: 0 });
    this.x = x - this.w / 2; this.y = y - this.h;
  }
  update(dt) {
    const P = Player; this.t -= dt; this.flash = Math.max(0, this.flash - dt); this.clangT = Math.max(0, this.clangT - dt); this.catchT = Math.max(0, this.catchT - dt);
    this.anim += dt * (1 + Math.abs(this.vx) / 60);
    const pcx = P.x + P.w / 2, cx = this.x + this.w / 2, front = sgn(pcx - cx) === this.dir;
    const close = !P.dead && Math.abs(pcx - cx) < 230 && Math.abs(P.y + P.h - (this.y + this.h)) < 70;
    switch (this.state) {
      case 'patrol':
        this.vx = approach(this.vx, this.dir * 45, 300 * dt);
        if (this.onGround && (this.hitWall || !groundAheadOf(this))) { this.dir *= -1; this.vx = 0; }
        if (close) {
          if (!front) { this.turnT += dt; if (this.turnT > 0.7) { this.dir *= -1; this.turnT = 0; } }
          else { this.state = 'crouch'; this.t = 0.45; this.vx = 0; SFX.windup(); }
        } else this.turnT = 0;
        break;
      case 'crouch': this.vx = 0; if (this.t <= 0) { this.state = 'pounce'; this.t = 0.3; this.vy = -420; SFX.whoosh(); } break;
      case 'pounce':
        this.vx = this.dir * 520;
        if ((this.onGround && this.t <= 0) || this.hitWall) { this.state = 'recover'; this.t = 0.9; this.vx = 0; dust(cx, this.y + this.h, 6); }
        break;
      default: this.vx = approach(this.vx, 0, 2000 * dt); if (this.t <= 0) this.state = 'patrol';
    }
    this.vy = Math.min(this.vy + TUNE.gravity * dt, 900);
    moveBody(this, dt);
  }
  guarded(kx) { return kx === -this.dir && (this.state === 'patrol' || this.state === 'crouch'); }
  takeHit(dmg, kx, ky, src) {
    const b = BP.hitBy, cx = this.x + this.w / 2;
    // a straight ball into the mitt, or a bat into the mask: caught / clanged
    if (b && !b.curve && !b.boom && this.guarded(sgn(b.vx))) {
      b.dead = true; this.catchT = 0.4; SFX.glove();
      pop(cx, this.y - 8, 'CAUGHT!', { size: 26, color: '#bfefff', burstColor: '#2a4a66' });
      if (!BP.tips.catcher) { BP.tips.catcher = true; toast('CATCHER BOTS CATCH STRAIGHT BALLS · HIT THEM FROM BEHIND, OR FROM ABOVE'); }
      return false;
    }
    if (!b && src === 'fwd' && this.guarded(kx)) {
      if (this.clangT <= 0) { this.clangT = 0.2; SFX.clang(); pop(cx, this.y - 8, 'CLANG!', { size: 24, color: '#bfefff', burstColor: '#2a4a66' }); }
      Player.vx = -kx * 330; Player.recoilT = 0.12;
      return false;
    }
    const curve = b && b.curve;
    this.hp -= dmg * (curve ? 1.5 : 1) * (this.state === 'recover' ? 1.5 : 1); this.flash = 0.12;
    if (curve) pop(cx, this.y - 10, 'AROUND THE MASK!', { size: 24, color: BP_TEAL, burstColor: '#1a4a48' });
    if (this.state !== 'pounce') this.vx = kx * 90;
    if (this.hp <= 0) { enemyDie(this); burst(cx, this.y + 22, 16, { colors: ['#9aa8b4', '#6b4a30', BONE], maxSpeed: 420 }); }
    return true;
  }
  draw() {
    const cx = this.x + this.w / 2, by = this.y + this.h, crouch = this.state === 'crouch' ? 1 : 0, step = this.state === 'patrol' ? Math.sin(this.anim * 6) : 0;
    ctx.save(); ctx.translate(cx, by); ctx.scale(this.dir, 1); ctx.lineJoin = 'round';
    const col = this.flash > 0 ? '#ffffff' : '#7a8a96';
    limb(-6, -14 + crouch * 4, Math.PI / 2 + step * 0.4, 14, '#3a4a56', 6); limb(6, -14 + crouch * 4, Math.PI / 2 - step * 0.4, 14, '#3a4a56', 6);
    ctx.translate(0, crouch * 6);
    rr(-14, -40, 28, 28, 6); inked(col, 3);                                         // body
    rr(-8, -36, 18, 22, 4); inked('#2e5a8a', 2);                                     // chest protector
    ctx.beginPath(); ctx.arc(2, -46, 10, 0, 7); inked(col, 3);                       // head
    ctx.strokeStyle = INK; ctx.lineWidth = 2;                                         // the mask grille
    for (const yy of [-50, -46, -42]) { ctx.beginPath(); ctx.moveTo(4, yy); ctx.lineTo(13, yy); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(8, -54); ctx.lineTo(8, -38); ctx.stroke();
    ctx.fillStyle = this.state === 'crouch' ? '#ff4a3a' : BP_TEAL; ctx.fillRect(4, -48, 3, 2);
    // the mitt, out in front
    const mx = 18 + (this.catchT > 0 ? -4 : 0);
    ctx.beginPath(); ctx.ellipse(mx, -28, 11, 13, 0, 0, 7); inked('#8a5a32', 3);
    ctx.strokeStyle = '#5a3a1e'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(mx, -28, 6, -1.2, 1.2); ctx.stroke();
    ctx.restore();
  }
}
const _bpMake = makeActEnemy;
makeActEnemy = function (s) { if (s.k === 'catcher') return new CatcherBot(s.x, s.y, s.dir); return _bpMake(s); };
/* ================= COACH MAYA · the rhythm pitching duel =================
   She counts four to the bar (0.6 s a beat) and every pitch lands ON a beat:
   a fastball one beat after release, a changeup or curve two beats after.
   Swing it back on the click for a PERFECT: double damage and a stun. */
const MAYA_BEAT = 0.6;
class MayaPitch {
  constructor(x, y, tx, ty, kind, beats) {
    const T = beats * MAYA_BEAT;
    Object.assign(this, { x, y, x0: x, y0: y, x1: tx, y1: ty, kind, T, t: 0, friendly: false, dead: false, r: 8, trail: [], life: T + 1.6, caught: false });
    this.vx = (tx - x) / T; this.vy = (ty - y) / T;
  }
  box() { return { x: this.x - 14, y: this.y - 14, w: 28, h: 28 }; }
  update(dt) {
    this.t += dt; this.life -= dt;
    this.trail.push({ x: this.x, y: this.y }); if (this.trail.length > 9) this.trail.shift();
    const B = Zone.boss;
    if (this.friendly) {   // hit back: it homes in on Maya
      if (!B || B.dead || !(B instanceof Maya)) { this.dead = true; return; }
      const dx = B.x + B.w / 2 - this.x, dy = B.y + B.h / 2 - this.y, d = Math.hypot(dx, dy) || 1;
      this.vx = lerp(this.vx, dx / d * 1150, 1 - Math.exp(-9 * dt)); this.vy = lerp(this.vy, dy / d * 1150, 1 - Math.exp(-9 * dt));
      this.x += this.vx * dt; this.y += this.vy * dt;
      if (d < 30) { this.dead = true; B.returned(this.perfect); }
      if (this.life <= 0) this.dead = true;
      return;
    }
    const u = this.t / this.T;
    if (u <= 1) {
      const arc = this.kind === 'curve' ? -Math.sin(Math.PI * u) * 150 : this.kind === 'change' ? Math.sin(u * 18) * 6 : 0;
      this.x = lerp(this.x0, this.x1, u); this.y = lerp(this.y0, this.y1, u) + arc;
    } else { this.x += this.vx * dt; this.y += this.vy * dt; }
    if (this.life <= 0 || pointSolid(this.x, this.y)) { this.dead = true; burst(this.x, this.y, 8, { color: '#f3ead8', maxSpeed: 220 }); return; }
    if (overlap({ x: this.x - this.r, y: this.y - this.r, w: this.r * 2, h: this.r * 2 }, Player.hurtbox())) { Player.hurt(sgn(this.vx) || 1); this.dead = true; }
  }
  onBat() {
    const B = Zone.boss, ph = B && B.clock !== undefined ? B.clock % MAYA_BEAT : 1;
    this.perfect = ph < 0.13 || ph > MAYA_BEAT - 0.13;
    this.friendly = true; this.life = 2; SFX.deflect(); addHitstop(this.perfect ? 0.14 : 0.08); addShake(this.perfect ? 10 : 6);
    pop(this.x, this.y - 18, this.perfect ? 'ON THE BEAT!' : 'FOUL TIP!', { size: this.perfect ? 40 : 28, color: this.perfect ? '#fff27a' : BONE, burstColor: this.perfect ? '#c9a33a' : '#3a3a3a' });
    ring(this.x, this.y, 6, this.perfect ? 90 : 50, 0.3, this.perfect ? '#fff27a' : BONE, 5);
  }
  draw() {
    ctx.lineCap = 'round';
    const col = this.friendly ? (this.perfect ? '255,242,122' : '243,234,216') : this.kind === 'curve' ? '95,214,192' : this.kind === 'change' ? '255,150,190' : '243,234,216';
    for (let i = 1; i < this.trail.length; i++) { ctx.strokeStyle = `rgba(${col},${i / this.trail.length * 0.7})`; ctx.lineWidth = i * 1.4; ctx.beginPath(); ctx.moveTo(this.trail[i - 1].x, this.trail[i - 1].y); ctx.lineTo(this.trail[i].x, this.trail[i].y); ctx.stroke(); }
    // the count-in ring: it closes exactly on the beat the ball arrives
    if (!this.friendly && this.t < this.T) { const k = 1 - this.t / this.T; ctx.strokeStyle = `rgba(${col},${0.35 + 0.4 * (1 - k)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(this.x, this.y, 10 + k * 34, 0, 7); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, 7); inked('#f3ead8', 2.5);
    ctx.strokeStyle = '#e8361c'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(this.x - 6, this.y, 6, -0.9, 0.9); ctx.stroke(); ctx.beginPath(); ctx.arc(this.x + 6, this.y, 6, Math.PI - 0.9, Math.PI + 0.9); ctx.stroke();
  }
}
// a rain delay: a drip warns, then a curtain of water pours from the roof
class BpRain {
  constructor(x, delay) { Object.assign(this, { x, t: -0.9 - (delay || 0), dead: false, top: 111 * TILE, bot: 131 * TILE }); }
  update(dt) {
    this.t += dt; if (this.t > 0.7) { this.dead = true; return; }
    if (this.t < 0 && Math.random() < 0.3) spawnParticle({ x: this.x + rand(-12, 12), y: this.top + 4, vx: 0, vy: 380, grav: 600, life: 0.9, size: 2.5, color: '#bff6ec', type: 'dot' });
    if (this.t > 0 && this.t < 0.6 && !Player.dead && overlap(Player.hurtbox(), { x: this.x - 20, y: this.top, w: 40, h: this.bot - this.top })) Player.hurt(sgn(Player.x + Player.w / 2 - this.x) || 1);
  }
  draw() {
    if (this.t < 0) {
      const k = 1 + this.t / 0.9; ctx.fillStyle = `rgba(95,214,192,${0.15 + 0.35 * k})`;
      ctx.beginPath(); ctx.ellipse(this.x, this.bot, 22 + 10 * k, 5, 0, 0, 7); ctx.fill();
      return;
    }
    const a = this.t < 0.6 ? 0.75 : (0.7 - this.t) * 7;
    const g = ctx.createLinearGradient(this.x - 20, 0, this.x + 20, 0); g.addColorStop(0, 'rgba(191,246,236,0)'); g.addColorStop(0.5, `rgba(191,246,236,${a})`); g.addColorStop(1, 'rgba(191,246,236,0)');
    ctx.fillStyle = g; ctx.fillRect(this.x - 20, this.top, 40, this.bot - this.top);
    if (Math.random() < 0.6) bpSplash(this.x + rand(-14, 14), this.bot, 2);
  }
}
class Maya {
  constructor() {
    const p = A.maya;
    Object.assign(this, { type: 'boss', w: 26, h: 50, hp: 90, maxHp: 90, flash: 0, harmful: false, pogoable: true, givesHype: true, state: 'wait', t: 0, anim: 0, facing: -1,
      clock: 0, beatN: -1, pose: 'idle', kick: 0, bolts: 70, phaseNow: 1, homeX: p.x, homeY: p.y, chargeDir: 0, tx: 0, hopT: 0, hop0: null, hop1: null });
    this.x = p.x - this.w / 2; this.y = p.y - this.h;
  }
  arena() { return ROOM.b_mound.px; }
  begin() { this.state = 'mound'; this.harmful = true; this.clock = 0; this.beatN = -1; }
  phase() { const k = this.hp / this.maxHp; return k > 0.6 ? 1 : k > 0.3 ? 2 : 3; }
  update(dt) {
    this.anim += dt; this.flash = Math.max(0, this.flash - dt); this.t -= dt;
    if (this.state === 'wait' || this.state === 'beaten' || this.state === 'off') return;
    const P = Player, cx = this.x + this.w / 2, pcx = P.x + P.w / 2, ph = this.phase();
    if (ph > this.phaseNow) {
      this.phaseNow = ph; SFX.crowd && SFX.crowd(1.2); addShake(10); Game.flashWhite = Math.max(Game.flashWhite || 0, 0.2);
      pop(cx, this.y - 50, ph === 2 ? 'SEVENTH-INNING STRETCH' : 'BOTTOM OF THE NINTH', { size: 36, color: '#fff27a', burstColor: '#3a5a2a' });
      this.say(ph === 2 ? 'Now we\'re cooking. Two to the bar, kid!' : 'Full count. Let\'s see that swing!');
    }
    this.clock += dt;
    const n = Math.floor(this.clock / MAYA_BEAT);
    if (n !== this.beatN) { this.beatN = n; this.onBeat(n, ph); }
    this.kick = approach(this.kick, this.pose === 'windup' ? 1 : 0, dt * 5);
    switch (this.state) {
      case 'mound': this.facing = sgn(pcx - cx) || this.facing; this.x = this.homeX - this.w / 2; this.y = this.homeY - this.h; break;
      case 'stunned': if (this.t <= 0) { this.state = 'mound'; this.harmful = true; this.pose = 'idle'; } break;
      case 'chargeWind': if (Math.random() < 0.5) dust(cx, this.y + this.h, 1, -this.chargeDir); if (this.t <= 0) { this.state = 'charge'; SFX.whoosh(); } break;
      case 'charge': {
        this.x += this.chargeDir * 820 * dt; this.pose = 'run';
        Game.afterimages.push({ x: this.x, y: this.y, facing: this.chargeDir, life: 0.12, max: 0.12, color: '#f2c94c' });
        const ar = this.arena();
        if ((this.chargeDir < 0 && this.x < ar.x + 9 * TILE) || (this.chargeDir > 0 && this.x + this.w > ar.x + ar.w - 2 * TILE)) {
          addShake(8); SFX.slam(); dust(this.x + this.w / 2, this.y + this.h, 10);
          this.hopHome();
        }
        break;
      }
      case 'hop': {
        this.hopT += dt; const k = Math.min(1, this.hopT / 0.7);
        this.x = lerp(this.hop0.x, this.hop1.x, k) - this.w / 2; this.y = lerp(this.hop0.y, this.hop1.y, k) - this.h - Math.sin(Math.PI * k) * 160;
        if (k >= 1) {
          if (this.after === 'charge') { this.after = null; this.state = 'chargeWind'; this.t = 0.5; this.pose = 'dig'; SFX.windup(); this.say('Brushback!'); dust(this.x + this.w / 2, this.y + this.h, 8); }
          else { this.state = 'mound'; this.pose = 'idle'; dust(this.homeX, this.homeY, 8); }
        }
        break;
      }
    }
  }
  say(text) { this.shout = { text, t: 2 }; }
  hopTo(x, y, after) { this.state = 'hop'; this.hopT = 0; this.after = after || null; this.hop0 = { x: this.x + this.w / 2, y: this.y + this.h }; this.hop1 = { x, y }; this.pose = 'air'; SFX.jump(); }
  hopHome() { this.hopTo(this.homeX, this.homeY); }
  // off the mound to one side, then a brushback charge at the near wall (never across the mound)
  hopOff(dir) { this.chargeDir = dir; this.hopTo(this.homeX + dir * 9 * TILE, 131 * TILE, 'charge'); }
  onBeat(n, ph) {
    SFX.tick();
    if (this.state !== 'mound') return;
    const b = n % 4, bar = Math.floor(n / 4);
    const P = Player, pcx = P.x + P.w / 2;
    if (ph === 1) {
      this.pose = b === 1 || b === 2 ? 'windup' : 'idle';
      if (b === 3) this.pitch(bar % 2 ? 'change' : 'fast');
    } else if (ph === 2) {
      this.pose = b === 0 || b === 2 ? 'windup' : 'idle';
      if (b === 1 || b === 3) this.pitch(['fast', 'curve', 'change', 'fast'][(bar * 2 + (b === 3 ? 1 : 0)) % 4]);
      if (b === 0 && bar % 3 === 2) this.rain(3);
    } else {
      const c = bar % 3;
      if (c === 0) { this.pose = 'windup'; if (b < 3) this.pitch('fast'); }
      if (c === 1) { this.pose = b === 0 || b === 2 ? 'windup' : 'idle'; if (b === 1) this.pitch('curve'); if (b === 3) this.pitch('change'); }
      if (c === 2 && b === 0) this.hopOff(pcx < this.homeX ? -1 : 1);
      if (b === 2 && bar % 2 === 0) this.rain(4);
    }
  }
  pitch(kind) {
    const P = Player, cx = this.x + this.w / 2, bx = cx + this.facing * 14, by = this.y + 14;
    const beats = kind === 'fast' ? 1 : 2;
    Bolts.push(new MayaPitch(bx, by, P.x + P.w / 2, P.y + P.h / 2, kind, beats));
    this.pose = 'release'; SFX.serve();
    pop(bx, by - 18, { fast: 'HEATER!', change: 'CHANGEUP', curve: 'CURVE!' }[kind], { size: 22, color: kind === 'curve' ? BP_TEAL : kind === 'change' ? '#ff96be' : BONE, burst: false, vy: -50 });
  }
  rain(k) {
    const ar = this.arena(), P = Player, xs = [P.x + P.w / 2];
    for (let i = 1; i < k; i++) xs.push(rand(ar.x + 3 * TILE, ar.x + ar.w - 3 * TILE));
    xs.forEach((x, i) => FX.push(new BpRain(clamp(x, ar.x + 2 * TILE, ar.x + ar.w - 2 * TILE), i * 0.15)));
    SFX.thunder && SFX.thunder();
  }
  returned(perfect) {
    if (this.state === 'beaten') return;
    const cx = this.x + this.w / 2;
    // later on she snags the sloppy ones and fires them straight back
    if (!perfect && this.phase() >= 2 && this.state === 'mound' && Math.random() < 0.35) {
      SFX.glove(); pop(cx, this.y - 20, 'SNAGGED IT!', { size: 30, color: '#f2c94c', burstColor: '#5a4a1a' });
      this.pitch('fast'); return;
    }
    this.damage(perfect ? 11 : 6); SFX.hit(true); addShake(perfect ? 12 : 7);
    if (perfect && this.state === 'mound') { this.state = 'stunned'; this.t = 1.2; this.harmful = false; this.pose = 'stun'; pop(cx, this.y - 30, 'CAUGHT LOOKING!', { size: 38, color: '#fff27a', burstColor: '#3f7a2a' }); }
  }
  damage(d) {
    if (this.state === 'beaten') return;
    this.hp = Math.max(0, this.hp - d); this.flash = 0.1; BossBar.set(this.hp / this.maxHp);
    if (this.hp <= 0) {
      this.state = 'beaten'; this.pose = 'kneel'; this.harmful = false;
      this.x = this.homeX - this.w / 2; this.y = this.homeY - this.h;
      FX.length = 0; Bolts.length = 0; Hazards.length = 0;
      Story.mayaDefeat(this);
    }
  }
  takeHit(dmg, kx) {
    if (this.state === 'wait' || this.state === 'beaten' || this.state === 'hop' || this.state === 'off') return false;
    this.damage(this.state === 'stunned' ? dmg * 1.5 : dmg);
    return true;
  }
  draw() {
    const cx = this.x + this.w / 2, fy = this.y + this.h;
    drawMaya(cx, fy, this.facing, this.anim, { pose: this.pose, kick: this.kick, flash: this.flash > 0 });
    // the count: four pips over her head, the current beat lit
    if (this.state !== 'wait' && this.state !== 'beaten' && this.state !== 'off') {
      const b = ((this.beatN % 4) + 4) % 4, ph = (this.clock % MAYA_BEAT) / MAYA_BEAT;
      for (let i = 0; i < 4; i++) {
        const on = i === b, x = cx - 27 + i * 18, y = this.y - 30;
        ctx.beginPath(); ctx.arc(x, y, on ? 6 + (1 - ph) * 3 : 4, 0, 7); ctx.fillStyle = on ? '#fff27a' : 'rgba(243,234,216,.35)'; ctx.fill();
      }
    }
    if (this.shout && this.shout.t > 0) {
      this.shout.t -= 1 / 60;
      ctx.save(); ctx.globalAlpha = Math.min(1, this.shout.t * 2); ctx.font = `15px ${DISPLAY_FONT}`; ctx.textAlign = 'center';
      ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.strokeText(this.shout.text, cx, this.y - 46); ctx.fillStyle = '#f2c94c'; ctx.fillText(this.shout.text, cx, this.y - 46);
      ctx.restore();
    }
  }
}
// Coach Maya: a retired pitcher in a yellow rain poncho, navy cap, grey ponytail
function drawMaya(x, y, facing, t, o = {}) {
  const pose = o.pose || 'idle', kick = o.kick || 0, run = pose === 'run' ? Math.sin(t * 22) : 0, br = Math.sin(t * 2.4) * 1.2;
  ctx.save(); ctx.translate(x, y); ctx.scale(facing, 1); ctx.lineJoin = 'round';
  if (pose === 'kneel') ctx.translate(0, 8);
  const pon = o.flash ? '#ffffff' : '#f2c94c', pants = '#2a3550', skin = '#d9a77e';
  // legs (the front one comes up in the leg kick)
  limb(-4, -18, Math.PI / 2 + run * 0.6 + (pose === 'dig' ? 0.5 : 0), 18, pants, 6);
  limb(5, -18, Math.PI / 2 - run * 0.6 - kick * 1.5, 18 - kick * 4, pants, 6);
  // the poncho
  ctx.beginPath(); ctx.moveTo(-14, -14); ctx.lineTo(-9, -44 + br); ctx.lineTo(9, -44 + br); ctx.lineTo(15, -14); ctx.quadraticCurveTo(0, -10, -14, -14); ctx.closePath(); inked(pon, 3);
  ctx.strokeStyle = 'rgba(13,11,16,.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, -42 + br); ctx.lineTo(0, -16); ctx.stroke();
  // arms: glove up front, pitching arm behind / over the top / follow-through
  const throwA = pose === 'windup' ? -2.4 : pose === 'release' ? 0.4 : pose === 'stun' ? -1.2 : 0.9;
  const [hx, hy] = limb(-6, -38 + br, throwA, 16, pon, 5);
  if (pose === 'windup') { ctx.beginPath(); ctx.arc(hx, hy, 4, 0, 7); inked('#f3ead8', 1.5); }
  const [gx, gy] = limb(7, -38 + br, pose === 'windup' ? -0.4 : 0.5, 13, pon, 5);
  ctx.beginPath(); ctx.ellipse(gx + 3, gy, 7, 8, 0, 0, 7); inked('#8a5a32', 2.5);
  // head, cap, ponytail
  ctx.beginPath(); ctx.arc(1, -52 + br, 9, 0, 7); inked(skin, 2.5);
  ctx.beginPath(); ctx.moveTo(-8, -53 + br); ctx.quadraticCurveTo(-16, -50 + br + Math.sin(t * 3) * 2, -14, -40 + br); ctx.lineWidth = 4; ctx.strokeStyle = '#b8b4ae'; ctx.stroke();
  ctx.beginPath(); ctx.arc(1, -55 + br, 9.5, Math.PI, 0); ctx.closePath(); inked('#24305a', 2.5);
  ctx.fillStyle = '#24305a'; ctx.fillRect(4, -57 + br, 10, 3);
  ctx.fillStyle = '#f2c94c'; ctx.font = `7px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillText('B', 2, -57 + br);
  ctx.fillStyle = INK; ctx.fillRect(5, -52 + br, 2, 2);
  if (pose === 'stun') for (let i = 0; i < 3; i++) { const a = t * 5 + i * 2.1; ctx.fillStyle = '#fff27a'; ctx.beginPath(); ctx.arc(Math.cos(a) * 12, -70 + Math.sin(a) * 4, 2.5, 0, 7); ctx.fill(); }
  ctx.restore();
}
function drawMayaHead(x, y, t) {
  ctx.save(); ctx.translate(x, y + 52);
  drawMaya(0, 0, 1, t, { pose: 'idle' });
  ctx.restore();
}
/* ---------- story ---------- */
const BP_PENNANTS = ['fionn', 'milo', 'deniz', 'maya'];
Story.tagColors.MAYA = '#c9a32a';
const _bpPortrait = Story.portraitSprite;
Story.portraitSprite = function (who, t) {
  if (who === 'MAYA') { drawMayaHead(2, -45, t); return true; }
  return _bpPortrait ? _bpPortrait.call(this, who, t) : false;
};
Object.assign(Story, {
  bullpenArrive() {
    return this.run(async () => {
      const nh = () => this.nathanHead();
      this.zoomTo(1.3); await this.wait(0.5);
      await this.say('NATHAN', 'A whole bullpen. Under the quarry. Flooded.', nh);
      await this.say('NATHAN', 'Somebody still sweeps in here. The benches are dry.', nh);
    }).then(() => toast('THE SUNKEN BULLPEN · NATHAN CAN\'T SWIM, BUT A BASEBALL CAN SKIP'));
  },
  mayaIntro(m) {
    return this.run(async () => {
      const P = Player, h = () => ({ x: m.x + m.w / 2, y: m.y - 18 }), nh = () => this.nathanHead();
      setLock(A.mayaLock, true); SFX.gate(); this.punch(0.05, 6);
      this.camTarget = { x: (P.x + m.x) / 2 + 40, y: m.y - 40 }; this.zoomTo(1.2);
      m.facing = -1; P.facing = 1;
      await this.wait(0.7);
      await this.say('MAYA', 'Rain delay\'s over, kid. Grab a bat.', h, { voice: 0.9 });
      await this.say('NATHAN', 'Who are YOU?', nh);
      await this.say('MAYA', 'Coach Maya. Forty years in this bullpen, before the Spire sank it.', h, { voice: 0.9 });
      this.zoomTo(1.3);
      await this.say('MAYA', 'Evil Adam sent the fourth Golden Pennant down here. He figured nobody would ever come looking under a quarry.', h, { voice: 0.9 });
      await this.say('MAYA', 'You want it? Hit my pitches back. And hit them ON THE BEAT. Count with me.', h, { voice: 0.9 });
      for (let i = 1; i <= 4; i++) { SFX.tick(); pop(m.x + m.w / 2, m.y - 40, String(i), { size: 30 + i * 4, color: i === 4 ? '#fff27a' : BONE, burst: i === 4 }); await this.wait(MAYA_BEAT); }
      await this.say('NATHAN', '…Play ball.', nh);
    }).then(() => {
      BossBar.show('COACH MAYA · THE RAIN DELAY'); m.begin();
      pop(m.x + m.w / 2, m.y - 40, 'PLAY BALL!', { size: 44 }); SFX.drill();
      setTimeout(() => toast('TIP · SWING AS THE RING CLOSES ON THE BALL · ON THE BEAT IS A PERFECT RETURN'), 1400);
    });
  },
  mayaDefeat(m) {
    return this.run(async () => {
      const P = Player, D = Save.data, h = () => ({ x: m.x + m.w / 2, y: m.y - 10 }), nh = () => this.nathanHead();
      BossBar.flash(); SFX.bossDie();
      this.impact(m.x + m.w / 2, m.y + m.h / 2, '#f2c94c');
      pop(m.x + m.w / 2, m.y - 30, 'STEE-RIKE THREE!', { size: 44, life: 1.4 });
      this.camTarget = { x: (P.x + m.x) / 2, y: m.y - 30 }; this.zoomTo(1.3);
      await this.wait(0.8);
      m.pose = 'idle';
      await this.say('MAYA', '*laughs* Now THAT is a swing.', h, { voice: 0.9 });
      await this.say('MAYA', 'Most hitters chase the ball. You waited for it. That\'s the whole game, kid.', h, { voice: 0.9 });
      // the pennant
      SFX.unlock(); for (let k = 0; k < 18; k++) spawnParticle({ x: m.x + m.w / 2 + rand(-20, 20), y: m.y, vx: rand(-60, 60), vy: rand(-260, -120), grav: 300, life: rand(0.8, 1.4), size: rand(2, 4), color: k % 2 ? GOLD : BP_TEAL, type: 'dot' });
      D.pennants.maya = 1; D.mayaDead = true; saveGame();
      await this.say('MAYA', 'The fourth Golden Pennant. It goes in the gate up in the Grand Concourse.', h, { voice: 0.9 });
      this.zoomTo(1.36);
      await this.say('MAYA', 'And take my curveball while you\'re at it. Shields only ever guard the front.', h, { voice: 0.9 });
      D.up.curve = true; saveGame();
      await this.say('NATHAN', 'Coach… why are you still down here?', nh);
      await this.say('MAYA', 'Somebody has to keep the rain off the old benches. Go on. Up you go.', h, { voice: 0.9 });
      this.zoomTo(1.15);
      dropBolts(m.x + m.w / 2, m.y - 20, m.bolts);
      setLock(A.mayaLock, false); BossBar.hide();
      m.state = 'off'; m.harmful = false; m.untargetable = true; Zone.boss = null;
    }).then(() => {
      const n = BP_PENNANTS.filter(k => Save.data.pennants[k]).length;
      showCard('NEW ABILITY', 'THE CURVEBALL', 'Smacked baseballs now bend toward the nearest target in front of you. A curveball slips past shields: Catcher Bot masks, armoured switches. There is an armoured switch in the Pump Room.',
        [`Golden Pennants ${n}/4`, 'hit a ball as usual · it curves on its own']);
      themeCheck();
    });
  },
});

/* ---------- the pause-menu chart ---------- */
MAP_CFG.z12 = {
  title: 'THE SUNKEN BULLPEN', subtitle: 'Under the Quarry — sold by Reshman (it was wet, he re-drew it)',
  rooms: zoneRooms('z12'),
  hasMap: () => Save.data.maps.z12, noMap: 'NO MAP YET · BUY ONE FROM RESHMAN IN THE PUMP ROOM',
  labels: { b_drain: [0.5, 0.06], b_pump: [0.25, 0.25], b_tunnel: [0.4, 0.35], b_arches: [0.4, 0.2], b_glow: [0.5, 0.2], b_locks: [0.5, 0.04], b_mound: [0.4, 0.25], b_dugout: [0.4, 0.3], b_cistern: [0.4, 0.3], b_vault: [0.5, 0.3] },
  pins: (pin, X, Y, V) => actPins('z12')(pin, X, Y, V),
  landmarks(g, X, Y, s, V) {
    for (const w of BP_WATER) {
      if (!V[w.room] || w.level >= w.bot - 2) continue;
      g.strokeStyle = 'rgba(40,120,140,.7)'; g.lineWidth = 1.4;
      for (let k = 0; k < 2; k++) { g.beginPath(); for (let x = w.x0; x <= w.x1; x += 0.5) { const yy = Y(w.level / TILE + 0.4 + k * 0.6) + Math.sin(x * 1.7 + k) * 1.2; x === w.x0 ? g.moveTo(X(x), yy) : g.lineTo(X(x), yy); } g.stroke(); }
    }
  },
  notes(note, g, X, Y, s, V) {
    const D = Save.data, q = bpQ();
    if (V.b_drain) note('↑ the Quarry Mouth', X(20), Y(92), 10, 0);
    if (V.b_tunnel) note(q.sw1 ? 'drained!' : 'skip a ball →', X(85), Y(124), 10, -0.03);
    if (V.b_cistern) note(q.sw2 ? 'drained · gate B open' : '← skip it across', X(80), Y(146), 10, 0.03);
    if (V.b_locks) note('floods & drains!', X(220), Y(140), 10, -0.05);
    if (V.b_pump) note(q.pump ? 'vault (open)' : 'armoured switch?', X(102), Y(97), 10, 0.04);
    if (V.b_mound) note(D.mayaDead ? 'Coach Maya ✓' : 'somebody counting…', X(280), Y(118), 11, -0.04);
  },
  bestiary: actBestiary([['tick', ['b_tunnel', 'b_arches', 'b_cistern']], ['hopper', ['b_pump', 'b_glow']]]),
};

/* ---------- the look of the place ---------- */
function bgBullpen(cx, cy) {
  const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#050c0e'); g.addColorStop(0.6, '#0b1a1d'); g.addColorStop(1, '#10282a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  // receding brick arches
  for (const [par, col, h] of [[0.15, 'rgba(30,58,60,.55)', 0.62], [0.3, 'rgba(20,40,44,.8)', 0.78]]) {
    const span = 520, off = ((-cx * par) % span + span) % span;
    ctx.fillStyle = col;
    for (let x = off - span; x < VW + span; x += span) {
      ctx.beginPath(); ctx.moveTo(x, VH); ctx.lineTo(x, VH * (1 - h) + 80); ctx.quadraticCurveTo(x + span / 2, VH * (1 - h) - 140, x + span, VH * (1 - h) + 80); ctx.lineTo(x + span, VH);
      ctx.lineTo(x + span - 46, VH); ctx.lineTo(x + span - 46, VH * (1 - h) + 110); ctx.quadraticCurveTo(x + span / 2, VH * (1 - h) - 80, x + 46, VH * (1 - h) + 110); ctx.lineTo(x + 46, VH); ctx.closePath(); ctx.fill();
    }
  }
  // drips and drifting glow spores
  for (let k = 0; k < 34; k++) {
    const x = ((k * 131 - cx * 0.35) % VW + VW) % VW, y = ((Game.time * (90 + (k % 5) * 30) + k * 77) % (VH + 40)) - 20;
    ctx.fillStyle = k % 3 ? 'rgba(191,246,236,.25)' : 'rgba(95,214,192,.5)'; ctx.fillRect(x, y, k % 3 ? 1.5 : 2.5, k % 3 ? 6 : 2.5);
  }
}
function drawBpWater(w, front) {
  if (w.level >= w.bot - 2) return;
  const t = Game.time, top = w.level, h = w.bot - top;
  ctx.save();
  if (front) {
    ctx.globalAlpha = 0.42;
    const g = ctx.createLinearGradient(0, top, 0, w.bot); g.addColorStop(0, w.glow ? 'rgba(80,240,210,.7)' : 'rgba(40,120,130,.6)'); g.addColorStop(1, 'rgba(6,24,28,.9)');
    ctx.fillStyle = g; ctx.fillRect(w.x, top + 6, w.w, h - 6);
    ctx.restore(); return;
  }
  const g = ctx.createLinearGradient(0, top, 0, w.bot); g.addColorStop(0, w.glow ? '#2a9a8a' : '#1f5a62'); g.addColorStop(1, '#06161a');
  ctx.fillStyle = g; ctx.fillRect(w.x, top, w.w, h);
  // the surface line, rippling
  ctx.strokeStyle = w.glow ? 'rgba(160,255,235,.9)' : 'rgba(170,230,230,.75)'; ctx.lineWidth = 2.5; ctx.beginPath();
  for (let x = w.x; x <= w.x + w.w; x += 8) { const yy = top + Math.sin(x * 0.04 + t * 3) * 2 + Math.sin(x * 0.11 - t * 2) * 1; x === w.x ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); }
  ctx.stroke();
  if (w.tide) {   // the high-water mark
    ctx.strokeStyle = 'rgba(232,54,28,.55)'; ctx.setLineDash([8, 6]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(w.x, BP_HIGH); ctx.lineTo(w.x + w.w, BP_HIGH); ctx.stroke(); ctx.setLineDash([]);
  }
  ctx.restore();
}
function drawBpTideMark() {
  // the red line and a siren lamp, even when the lock is dry
  const w = BP_WATER.find(x => x.tide), p = ((Game.time % 16) + 16) % 16, warn = p > 4.6 && p < 9;
  ctx.save();
  ctx.strokeStyle = 'rgba(232,54,28,.5)'; ctx.setLineDash([8, 6]); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(w.x, BP_HIGH); ctx.lineTo(w.x + w.w, BP_HIGH); ctx.stroke(); ctx.setLineDash([]);
  for (const lx of [w.x + 24, w.x + w.w - 24]) {
    ctx.beginPath(); ctx.arc(lx, BP_HIGH - 18, 7, 0, 7); inked(warn && Math.sin(Game.time * 14) > 0 ? '#ff4a1a' : '#5a2a1a', 2);
  }
  ctx.restore();
}
// the Glowpools: dark, except near the pools, the lily pads and Nathan (a quarter-size mask stretched over the room)
function drawBpGlowDark() {
  const r = Zone.room.px, P = Player.center(), S = 0.25;
  const cv = BP.darkCv || (BP.darkCv = document.createElement('canvas'));
  const W = Math.ceil(r.w * S), H = Math.ceil(r.h * S);
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  const g = cv.getContext('2d');
  g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(3,6,8,.92)'; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'destination-out';
  const hole = (x, y, rad, a) => {
    const hx = (x - r.x) * S, hy = (y - r.y) * S, hr = rad * S;
    const rg = g.createRadialGradient(hx, hy, 0, hx, hy, hr); rg.addColorStop(0, `rgba(0,0,0,${a})`); rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg; g.fillRect(hx - hr, hy - hr, hr * 2, hr * 2);
  };
  if (!Player.dead) hole(P.x, P.y, 230, 1);
  for (const w of BP_WATER) if (w.glow) hole(w.x + w.w / 2, w.level, w.w * 0.75 + 40 + Math.sin(Game.time * 2) * 10, 0.9);
  for (const [tx, ty] of [[136, 101], [172, 101], [176, 98], [154, 105]]) hole(tx * TILE, ty * TILE, 120, 0.7);
  ctx.save(); ctx.imageSmoothingEnabled = true; ctx.drawImage(cv, r.x, r.y, r.w, r.h); ctx.restore();
}
/* ---------- rooms ---------- */
function bpSetupRoom(r) {
  const D = Save.data, q = bpQ();
  for (const d of BP_SWITCHES) if (d.room === r.id) Enemies.push(new BpSwitch(d));
  if (r.id === 'b_mound') {
    if (!D.mayaDead) { setLock(A.mayaLock, false); Zone.boss = new Maya(); Enemies.push(Zone.boss); }
    else { const m = new Maya(); Object.assign(m, { state: 'off', harmful: false, untargetable: true }); Enemies.push(m); }
  }
  if (!started) return;
  if (r.id === 'b_drain' && !q.arrived) { q.arrived = 1; saveGame(); setTimeout(() => { if (!Story.active) Story.bullpenArrive(); }, 900); }
  if (r.id === 'b_tunnel' && !q.sw1 && !BP.tips.skip) { BP.tips.skip = true; setTimeout(bpSkipTip, 1200); }
  if (r.id === 'q_mouth' && !D.walls.q_floor && !BP.tips.crack) {
    BP.tips.crack = true;
    if (D.up.boom) setTimeout(() => toast('THE QUARRY MOUTH FLOOR IS CRACKED… AND SOMETHING IS DRIPPING UNDERNEATH'), 1100);
  }
}
const _bpEnter = enterRoom;
enterRoom = function (r) { _bpEnter(r); try { bpSetupRoom(r); } catch (e) { logErr('bullpen: room', e); } };

const _bpUpdate = PAGE.update;
PAGE.update = dt => {
  if (_bpUpdate) _bpUpdate(dt);
  try {
    bpUpdateWater(dt);
    for (const g of BP_GATES) if (BP.open[g.id] !== undefined && BP.open[g.id] < 1) BP.open[g.id] = Math.min(1, BP.open[g.id] + dt * 0.8);
    // one more foothold inside the blown-open crack, so you can climb back up to the Quarry Mouth
    if (!BP.foothold && Save.data.walls.q_floor) { BP.foothold = true; fill(34, 86, 2, 1, 3); }
  } catch (e) { logErr('bullpen: update', e); }
};
const _bpInteract = PAGE.interact;
PAGE.interact = (dt, c, feet) => {
  if (_bpInteract) _bpInteract(dt, c, feet);
  const B = Zone.boss;
  if (Zone.room.id === 'b_mound' && B instanceof Maya && B.state === 'wait' && !Act.fightIntro && c.x > A.mayaTrigger && Player.onGround) { Act.fightIntro = true; Story.mayaIntro(B); }
};
const _bpResp = PAGE.onRespawn;
PAGE.onRespawn = () => { if (_bpResp) _bpResp(); setLock(A.mayaLock, false); };

/* ---------- drawing ---------- */
(function () {
  const H = Game.hooks, bg = H.background, back = H.back, front = H.front;
  H.background = function (cx, cy) { if (bpIn()) return bgBullpen(cx, cy); return bg.call(H, cx, cy); };
  H.back = function (cam) {
    if (back) back.call(H, cam);
    if (!bpIn()) return;
    for (const w of BP_WATER) if (w.room === Zone.room.id) drawBpWater(w, false);
    if (Zone.room.id === 'b_locks') drawBpTideMark();
    for (const g of BP_GATES) if (g.room === Zone.room.id || (g.id === 'gateB' && Zone.room.id === 'b_dugout')) drawBpGate(g);
  };
  H.front = function (cam) {
    if (front) front.call(H, cam);
    if (!bpIn()) return;
    for (const w of BP_WATER) if (w.room === Zone.room.id) drawBpWater(w, true);
    if (Zone.room.id === 'b_glow') drawBpGlowDark();
  };
})();

// the page booted (bench, scooter) before this file loaded: rebuild the current room now, so its
// Catcher Bots, switches and Coach Maya are there too
if (Zone.room && Zone.room.zone === 'z12') { try { enterRoom(Zone.room); } catch (e) { logErr('bullpen: boot room', e); } }
else if (Zone.room && Zone.room.id === 'q_mouth') { try { bpSetupRoom(Zone.room); } catch (e) { logErr('bullpen: boot room', e); } }
for (const id of ['q_floor']) if (Save.data.walls[id]) { BP.foothold = true; fill(34, 86, 2, 1, 3); }
