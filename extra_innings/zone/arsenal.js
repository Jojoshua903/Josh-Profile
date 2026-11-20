'use strict';
/* =========================================================
   THE ARSENAL (every story page) · loaded after zone/foul-echo.js
   · Specialty balls: Kinetic is always in hand; two diamond slots hold
     specialty balls, picked on a Dugout Bench (pause menu → Tools & Items).
       Explosive 15 · Curveball 10 · Static Shock 20 · Scatter-Ball 20 · Flashbang 25 Hype
     Tap SWAP to cycle Kinetic → slot 1 → slot 2. Hold SWAP: time slows to
     half and a 4-way wheel opens round Nathan (up Kinetic, right slot 1,
     left slot 2, down use your gadget). Let go to pick.
   · One gadget slot, refilled on every bench rest, used with GADGET:
       Chill Brew Thermos (2 sips) · Fouled Grapple Line (1.5s cooldown) ·
       Pocket Pitching Machine (1 per rest)
   · Relics hidden in the Spire: Magnet Cleats, 3 Chalk Pouches (+33% Hype
     each), the Umpire's Monocle (cracked walls shimmer, boss HP numbers).
   · 27 sports memorabilia to sell to the Archivist in the Trophy Vault.
   ========================================================= */
const ARS = { mode: 0, holdT: 0, holding: false, wheel: false, wsel: 'kin', slowT: 0, hook: null, hookCD: 0, pos: {}, msgT: 0 };
const arsQ = () => {
  const q = Save.data.q, A = q.ars = q.ars || {};
  A.balls = A.balls || [null, null]; A.found = A.found || {}; A.sold = A.sold || {};
  if (A.mach === undefined) A.mach = 1; if (A.next === undefined) A.next = 0;
  return A;
};
// ball types: mode number, how to own it, Hype cost, colour
const ARS_BALL = {
  boom:  { mode: 1, name: 'EXPLOSIVE',    have: () => ABIL.boom,               cost: () => BOOM_COST, col: '#ff8a2a' },
  shock: { mode: 2, name: 'STATIC SHOCK', have: () => shockOK(),               cost: () => SHOCK_COST, col: '#9fe6ff' },
  curve: { mode: 3, name: 'CURVEBALL',    have: () => !!Save.data.up.curve,    cost: () => 10, col: '#6fd3ff' },
  split: { mode: 4, name: 'SCATTER-BALL', have: () => !!Save.data.up.split,    cost: () => 20, col: '#f2c14e' },
  flash: { mode: 5, name: 'FLASHBANG',    have: () => !!Save.data.up.flash,    cost: () => 25, col: '#fff6c4' },
};
const ARS_ORDER = ['boom', 'curve', 'shock', 'split', 'flash'];
const ARS_BY_MODE = { 1: 'boom', 2: 'shock', 3: 'curve', 4: 'split', 5: 'flash' };
const ARS_GADGET = {
  brew:    { name: 'CHILL BREW',     have: () => brewOwned() },
  grapple: { name: 'GRAPPLE LINE',   have: () => !!Save.data.up.grapple },
  machine: { name: 'PITCHING MACHINE', have: () => !!Save.data.up.machine },
};
const arsMode = () => ARS.mode;
const arsEquipped = id => arsQ().balls.includes(id);
// empty slots fill themselves with whatever you own, so a new ball is ready to use straight away
function arsAutofill() {
  const A = arsQ();
  A.balls = A.balls.map(id => (id && ARS_BALL[id] && ARS_BALL[id].have() ? id : null));
  for (let i = 0; i < 2; i++) if (!A.balls[i]) { const id = ARS_ORDER.find(k => ARS_BALL[k].have() && !A.balls.includes(k)); if (id) A.balls[i] = id; }
  if (A.gadget && !(ARS_GADGET[A.gadget] && ARS_GADGET[A.gadget].have())) A.gadget = null;
  if (!A.gadget) A.gadget = Object.keys(ARS_GADGET).find(k => ARS_GADGET[k].have()) || null;
  // something new that didn't fit: say so once
  A.known = A.known || {};
  for (const k of ARS_ORDER.concat(Object.keys(ARS_GADGET))) {
    const own = ARS_BALL[k] ? ARS_BALL[k].have() : ARS_GADGET[k].have();
    if (!own || A.known[k]) continue;
    A.known[k] = 1; saveGame();
    const fits = ARS_BALL[k] ? A.balls.includes(k) : A.gadget === k;
    if (!fits) setTimeout(() => toast(`${(ARS_BALL[k] || ARS_GADGET[k]).name} · YOUR SLOTS ARE FULL · SWAP IT IN ON A DUGOUT BENCH (PAUSE → TOOLS & ITEMS)`), 2500);
  }
}
// on a bench: put a ball in a slot (it takes the slot you changed least recently)
function arsEquipBall(id) {
  const A = arsQ(), B = ARS_BALL[id];
  if (!B || !B.have()) return 'Not unlocked yet.';
  if (A.balls.includes(id)) return `${B.name.toLowerCase()} is already in a slot.`;
  const i = A.balls.indexOf(null) >= 0 ? A.balls.indexOf(null) : A.next;
  const out = A.balls[i]; A.balls[i] = id; A.next = 1 - i; saveGame();
  if (out && ARS_BY_MODE[ARS.mode] === out) setBallMode(0);
  return `${B.name} in slot ${i + 1}${out ? ` (${ARS_BALL[out].name} out)` : ''}.`;
}
function arsEquipGadget(id) {
  const A = arsQ(), G = ARS_GADGET[id];
  if (!G || !G.have()) return 'Not unlocked yet.';
  A.gadget = id; saveGame(); return `${G.name} in your gadget slot.`;
}
// the one place the ball in hand is chosen (kit.js's version only knew three balls)
setBallMode = function (n) {
  const P = Player, id = ARS_BY_MODE[n];
  if (n !== 0 && (!id || !ARS_BALL[id].have() || !arsEquipped(id))) return false;
  ARS.mode = n; P.boomMode = n === 1; P.shockMode = n === 2;
  return true;
};
function arsCycle(P) {
  const opts = [0].concat(arsQ().balls.filter(Boolean).map(id => ARS_BALL[id].mode));
  if (opts.length < 2) return;
  const i = opts.indexOf(ARS.mode), n = opts[(i + 1) % opts.length];
  if (setBallMode(n)) arsAnnounce(P, n);
}
function arsAnnounce(P, n) {
  const id = ARS_BY_MODE[n];
  SFX.ui(); if (n === 2) SFX.staticBuzz(0.15);
  pop(P.x + P.w / 2, P.y - 26, id ? ARS_BALL[id].name : 'KINETIC', { size: 22, burst: false, color: id ? ARS_BALL[id].col : '#f3ead8', vy: -60 });
}

/* ---------- the gadget ---------- */
function arsUseGadget(P) {
  const A = arsQ(), g = A.gadget;
  if (!g) { SFX.deny(); pop(P.x + P.w / 2, P.y - 24, 'NO GADGET', { size: 18, burst: false, color: BONE, vy: -50 }); return; }
  if (g === 'brew') { const m = drinkBrew(); if (m) pop(P.x + P.w / 2, P.y - 30, m.split('.')[0].toUpperCase(), { size: 18, burst: false, color: '#9fe6ff', vy: -50 }); return; }
  if (g === 'grapple') return arsGrapple(P);
  if (g === 'machine') {
    if (A.mach <= 0) { SFX.deny(); pop(P.x + P.w / 2, P.y - 24, 'USED · REST TO RELOAD', { size: 18, burst: false, color: BONE, vy: -50 }); return; }
    if (!P.onGround) { SFX.deny(); pop(P.x + P.w / 2, P.y - 24, 'SET IT DOWN ON THE GROUND', { size: 18, burst: false, color: BONE, vy: -50 }); return; }
    A.mach--; saveGame(); NPCs.push(new ArsMachine(P.x + P.w / 2 + P.facing * 30, P.y + P.h)); SFX.latch(); SFX.anvil();
  }
}
// Deniz's tea: two sips per rest, drink it anywhere
drinkBrew = function () {
  const q = Save.data.q;
  if (!brewOwned()) { SFX.deny(); return 'Deniz hasn\'t joined the crew yet.'; }
  if (!(q.brew > 0)) { SFX.deny(); return 'The thermos is empty. It refills next time you rest.'; }
  q.brew = Math.max(0, (q.brew | 0) - 1); Player.shield = (Player.shield || 0) + 2; HUD.shield = -1; HUD.hpPop = true;
  ARS.slowT = 3;
  const c = Player.center();
  ring(c.x, c.y, 16, 80, 0.45, '#9fe6ff', 6); burst(c.x, c.y, 18, { colors: ['#9fe6ff', '#f3ead8', '#9be36a'], maxSpeed: 300 });
  ring(c.x, c.y, 20, 360, 0.6, 'rgba(159,230,255,.5)', 3);
  SFX.heal(); saveGame();
  return `+2 Shield Hearts. Shots slow down. ${q.brew} sip${q.brew === 1 ? '' : 's'} left.`;
};
// the tea's calm: enemy shots near Nathan crawl for 3 seconds
const _arsBolt = Bolt.prototype.update;
Bolt.prototype.update = function (dt) {
  if (!this.friendly && ARS.slowT > 0) { const c = Player.center(); if (Math.hypot(this.x - c.x, this.y - c.y) < 360) dt *= 0.35; }
  return _arsBolt.call(this, dt);
};

/* ---------- the Fouled Grapple Line ---------- */
function arsGrapple(P) {
  if (ARS.hook || ARS.hookCD > 0) { if (!ARS.hook) SFX.deny(); return; }
  const c = P.center(), f = P.facing || 1, up = Input.down('up'), side = Input.down('left') || Input.down('right');
  let dx = f * 0.7, dy = -0.71;
  if (up && !side) { dx = f * 0.26; dy = -0.97; }
  let hit = null, ex = c.x, ey = c.y;
  for (let d = 16; d <= 360; d += 8) {
    ex = c.x + dx * d; ey = c.y + dy * d;
    const e = Enemies.find(e => !e.dead && !e.untargetable && e.type !== 'boss' && /Drone/.test(e.constructor.name) && ex > e.x && ex < e.x + e.w && ey > e.y && ey < e.y + e.h);
    if (e) { hit = { e }; break; }
    if (pointSolid(ex, ey)) { hit = { x: ex - dx * 6, y: ey - dy * 6 }; break; }
  }
  ARS.hookCD = 1.5; SFX.whoosh();
  if (!hit) { ARS.hook = { miss: true, x: ex, y: ey, t: 0.22 }; return; }
  ARS.hook = { x: hit.e ? hit.e.x + hit.e.w / 2 : hit.x, y: hit.e ? hit.e.y + hit.e.h / 2 : hit.y, e: hit.e || null, t: 0, best: 1e9, stuck: 0 };
  SFX.latch(); burst(ARS.hook.x, ARS.hook.y, 8, { colors: ['#d9cfb8', '#9a9488'], maxSpeed: 200 });
}
function arsHookPull(P, dt) {
  const H = ARS.hook; if (!H) return;
  if (H.miss) { H.t -= dt; if (H.t <= 0) ARS.hook = null; return; }
  if (H.e) { if (H.e.dead) { ARS.hook = null; return; } H.x = H.e.x + H.e.w / 2; H.y = H.e.y + H.e.h / 2; }
  const c = P.center(), dx = H.x - c.x, dy = H.y - c.y, d = Math.hypot(dx, dy) || 1;
  H.t += dt;
  if (d < H.best - 2) { H.best = d; H.stuck = 0; } else H.stuck += dt;
  if (d < 40 || H.t > 0.8 || H.stuck > 0.14 || P.dead || P.hazard || Input.pressed('jump')) {
    ARS.hook = null; P.vy = Math.min(P.vy, -320); P.canDouble = true; P.canDash = true; P.launched = true; P.launchT = 0.1;
    return;
  }
  const sp = 980; P.dashT = 0; P.vx = dx / d * sp; P.vy = dy / d * sp; P.recoilT = 0.03; P.launchT = 0.03; P.jumping = false;
  if (dx) P.facing = sgn(dx);
}

/* ---------- the Pocket Pitching Machine ---------- */
class ArsPellet {
  constructor(x, y, vx, vy) { Object.assign(this, { x, y, vx, vy, r: 5, life: 1.1, friendly: true, dead: false }); }
  box() { return { x: this.x - 6, y: this.y - 6, w: 12, h: 12 }; }
  update(dt) {
    this.life -= dt; this.x += this.vx * dt; this.y += this.vy * dt;
    if (this.life <= 0 || pointSolid(this.x, this.y)) { this.dead = true; dust(this.x, this.y, 2); return; }
    const b = { x: this.x - this.r, y: this.y - this.r, w: this.r * 2, h: this.r * 2 };
    for (const e of Enemies) if (!e.dead && e.harmful && !e.untargetable && overlap(b, e)) {
      e.takeHit(1, sgn(this.vx), 0, 'ball'); this.dead = true; burst(this.x, this.y, 6, { colors: this.shock ? ['#9fe6ff', '#ffffff'] : [BONE, GOLD], maxSpeed: 200 }); SFX.hit(false);
      if (this.shock) { stunEnemy(e, ROBOTS.has(e.constructor.name) ? 1.6 : 0.6); SFX.staticBuzz(0.2); pop(this.x, this.y - 16, 'ZAP!', { size: 20, color: '#9fe6ff', burst: false }); }
      return;
    }
  }
  deflect() {}
  draw() { ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, 7); inked(this.shock ? '#9fe6ff' : '#f3ead8', 2); }
}
class ArsMachine {
  constructor(x, y) { const oc = !!badgesOn().overturret; Object.assign(this, { kind: 'arsmachine', x, y, t: oc ? 12 : 8, max: oc ? 12 : 8, oc, shots: 0, cd: 0.7, gone: false, aim: 0, kick: 0 }); }
  update(dt) {
    this.t -= dt; this.cd -= dt; this.kick = Math.max(0, this.kick - dt * 6);
    if (this.t <= 0) { this.gone = true; SFX.poof(); burst(this.x, this.y - 20, 14, { colors: ['#5a6a7a', '#9a9488', BONE], maxSpeed: 220 }); return; }
    const mx = this.x, my = this.y - 30;
    let best = null, bd = 540;
    for (const e of Enemies) { if (e.dead || e.untargetable || !e.harmful || e.type === 'orb') continue; const d = Math.hypot(e.x + e.w / 2 - mx, e.y + e.h / 2 - my); if (d < bd) { bd = d; best = e; } }
    if (best) this.aim = Math.atan2(best.y + best.h / 2 - my, best.x + best.w / 2 - mx);
    if (best && this.cd <= 0) {
      this.cd = 0.42; this.kick = 1; this.shots++;
      const p = new ArsPellet(mx + Math.cos(this.aim) * 16, my + Math.sin(this.aim) * 16, Math.cos(this.aim) * 820, Math.sin(this.aim) * 820);
      if (this.oc && this.shots % 5 === 0) { p.shock = true; p.r = 7; }
      Bolts.push(p); SFX.serve();
    }
  }
  draw() {
    const x = this.x, y = this.y, t = this.t;
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, y - 22); ctx.lineTo(x - 14, y); ctx.moveTo(x, y - 22); ctx.lineTo(x + 14, y); ctx.moveTo(x, y - 22); ctx.lineTo(x, y); ctx.stroke();
    ctx.translate(x, y - 30); ctx.rotate(this.aim);
    rr(-12 - this.kick * 3, -9, 24, 18, 4); inked('#5a6a7a', 3);
    rr(10 - this.kick * 3, -4, 9, 8, 2); inked('#2a2a30', 2);
    ctx.restore();
    // the angry little eye
    ctx.fillStyle = t % 0.6 < 0.5 ? '#e8361c' : '#5a1a10'; ctx.beginPath(); ctx.arc(x, y - 34, 3, 0, 7); ctx.fill();
    // the hopper of mini balls
    ctx.beginPath(); ctx.moveTo(x - 8, y - 40); ctx.lineTo(x + 8, y - 40); ctx.lineTo(x + 4, y - 46); ctx.lineTo(x - 4, y - 46); ctx.closePath(); inked('#9a9488', 2);
    ctx.fillStyle = this.oc ? 'rgba(159,230,255,.85)' : 'rgba(243,234,216,.8)'; ctx.fillRect(x - 12, y + 4, 24 * (this.t / this.max), 3);
  }
}

/* ---------- Scatter-Ball and Flashbang Pop-Fly ---------- */
const _arsShoot = Ball.prototype.shoot;
Ball.prototype.shoot = function (ax, ay) {
  const sweet = this.state === 'toss' && Math.abs(this.vy) < 220;   // smacked near the top of the toss
  _arsShoot.call(this, ax, ay);
  if (sweet) SFX.ping();   // the aluminium ring of a ball caught right at the top
  if (this.kind === 'split') {
    if (sweet) { this.splitT = 0.12; pop(this.x, this.y - 20, 'SWEET SPOT!', { size: 24, color: GOLD, burst: false, vy: -50 }); }
    else pop(this.x, this.y - 20, 'NO SPLIT · HIT IT AT THE TOP', { size: 16, color: BONE, burst: false, vy: -50 });
  }
};
const _arsBallUpd = Ball.prototype.update;
Ball.prototype.update = function (dt) {
  if (this.state === 'shot' && this.splitT !== undefined && this.splitT > 0) {
    this.splitT -= dt;
    if (this.splitT <= 0) {
      const sp = Math.hypot(this.vx, this.vy) * 1.15 || 1600, a = Math.atan2(this.vy, this.vx);
      for (const da of [-0.3, 0.3]) {
        const b = new Ball(this.x, this.y, Math.cos(a + da) * sp, Math.sin(a + da) * sp);
        const hv = !!badgesOn().buckshot;
        b.state = 'shot'; b.life = hv ? 0.3 : 0.42; b.kind = 'splinter'; b.r = hv ? 7 : 5; b.heavy = hv; Balls.push(b);
      }
      this.vx = Math.cos(a) * sp; this.vy = Math.sin(a) * sp; this.life = badgesOn().buckshot ? 0.3 : Math.max(this.life, 0.42); this.heavy = !!badgesOn().buckshot;
      SFX.clang(); burst(this.x, this.y, 12, { colors: [GOLD, '#b8bcc4'], maxSpeed: 320 }); pop(this.x, this.y - 18, 'SPLIT!', { size: 26, color: GOLD });
    }
  }
  if (this.kind === 'flash' && this.state === 'shot') {
    this.flashT -= dt;
    if (Math.random() < 0.9) spawnParticle({ x: this.x, y: this.y, vx: rand(-60, 60), vy: rand(-60, 60), life: 0.25, size: rand(2, 4), color: Math.random() < 0.5 ? '#fff6c4' : '#ffffff', type: 'spark' });
    if (this.flashT <= 0) { arsFlash(this.x, this.y); this.dead = true; return; }
  }
  if (this.kind === 'split' || this.kind === 'splinter') if (this.state === 'shot' && Math.random() < 0.6) spawnParticle({ x: this.x, y: this.y, life: 0.2, size: rand(2, 3), color: Math.random() < 0.5 ? GOLD : '#b8bcc4', type: 'dot' });
  if (this.kind === 'curve' && this.state === 'shot' && badgesOn().boomerang) arsBoomerang(this, dt);
  const n0 = this.hitSet.size;
  const r = _arsBallUpd.call(this, dt);
  // Heavy Buckshot shoves, a Boomerang return hits 50% harder
  if (this.hitSet.size > n0 && (this.heavy || this.bonus)) {
    let k = 0;
    for (const e of this.hitSet) {
      if (k++ < n0 || e.dead) continue;
      if (this.heavy) { const d = sgn(this.vx) || 1; if (e.type !== 'boss' && e !== Zone.boss) { e.x += d * 26; if (e.vx !== undefined) e.vx = d * 520; } addShake(4); }
      if (this.bonus) e.takeHit(1, sgn(this.vx), sgn(this.vy));
    }
  }
  if (this.kind === 'flash' && this.state === 'shot' && this.dead && !this.flashed) arsFlash(this.x, this.y);
  return r;
};
// Boomerang Stitch: after its break the curveball loops back to Nathan. Swing as it arrives (sweet-spot return)
// and it flies off again at double speed for 50% more damage; let it come and he just catches it.
function arsBoomerang(b, dt) {
  if (b.cvT === undefined || b.cvT > 0 || b.bonus) return;
  if (b.boomT === undefined) { b.boomT = 0.35; return; }
  if (b.boomT > 0) { b.boomT -= dt; if (b.boomT <= 0) { b.returning = true; b.target = null; b.life = Math.max(b.life, 1.6); pop(b.x, b.y - 14, 'LOOP!', { size: 18, color: '#6fd3ff', burst: false, vy: -40 }); } return; }
  if (!b.returning) return;
  const P = Player, c = P.center(), dx = c.x - b.x, dy = c.y - b.y, d = Math.hypot(dx, dy) || 1;
  const cur = Math.atan2(b.vy, b.vx), want = Math.atan2(dy, dx);
  let da = want - cur; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
  const a = cur + clamp(da, -10 * dt, 10 * dt); b.vx = Math.cos(a) * 1050; b.vy = Math.sin(a) * 1050; b.life = Math.max(b.life, 0.3);
  if (d < 46) {
    const swinging = P.attackT > 0 && P.attackType !== 'launch';
    if (!swinging) { b.dead = true; pop(c.x, P.y - 16, 'CAUGHT', { size: 18, color: BONE, burst: false, vy: -40 }); SFX.land && SFX.land(); return; }
    b.returning = false; b.bonus = true; b.hitSet = new Set(); b.life = 0.7;
    const T = feCurveTarget({ x: b.x, y: b.y, vx: P.facing || 1, vy: 0 });
    const tx = T ? T.x + T.w / 2 - b.x : (P.facing || 1), ty = T ? T.y + T.h / 2 - b.y : 0, td = Math.hypot(tx, ty) || 1;
    b.vx = tx / td * 2200; b.vy = ty / td * 2200; b.target = T || null;
    addHitstop(0.06); addShake(6); SFX.launch(); pop(b.x, b.y - 18, 'SWEET-SPOT RETURN!', { size: 28, color: '#6fd3ff', burstColor: '#14344a' });
    ring(b.x, b.y, 8, 60, 0.3, '#6fd3ff', 5);
  }
}
// the Flashbang: a magnesium flash that stuns everything on screen for 2.5s and dazzles bosses mid-attack
function arsFlash(x, y) {
  if (arsFlash.at && Game.time - arsFlash.at < 0.05) return; arsFlash.at = Game.time;
  for (const b of Balls) if (b.kind === 'flash' && b.state === 'shot') b.flashed = true;
  Game.flashWhite = Math.max(Game.flashWhite || 0, 0.85); SFX.thunder(); addShake(6);
  ring(x, y, 10, 420, 0.5, '#fff6c4', 10); burst(x, y, 30, { colors: ['#ffffff', '#fff6c4', GOLD], maxSpeed: 600 });
  pop(x, y - 20, 'FLASH!', { size: 44, color: '#fff6c4', burstColor: GOLD });
  const cam = Game.cam, m = 120, vx0 = cam.x - m, vy0 = cam.y - m, vx1 = cam.x + VW + m, vy1 = cam.y + VH + m;
  for (const e of Enemies) {
    if (e.dead || e.type === 'orb' || e.type === 'switch' || e.type === 'crate') continue;
    const cx = e.x + e.w / 2, cy = e.y + e.h / 2; if (cx < vx0 || cx > vx1 || cy < vy0 || cy > vy1) continue;
    if (e === Zone.boss || e.type === 'boss') arsDaze(e); else stunEnemy(e, 2.5);
  }
}
// a boss loses its footing for a moment (once every 6 seconds, so it can't be locked down)
function arsDaze(e) {
  if (e.arsDazeAt && Game.time - e.arsDazeAt < 6) return;
  e.arsDazeAt = Game.time; e.arsDazeT = 0.8;
  pop(e.x + e.w / 2, e.y - 20, 'DAZZLED!', { size: 28, color: '#fff6c4', burst: false, vy: -40 });
  if (e.arsDazeWrap) return; e.arsDazeWrap = true;
  const up = e.update;
  e.update = function (dt) { if (this.arsDazeT > 0) { this.arsDazeT -= dt; this.flash = Math.max(this.flash || 0, 0.05); return; } return up.call(this, dt); };
}
// the Explosive Baseball under your own feet: a rocket jump
const _arsDet = Ball.prototype.detonate;
Ball.prototype.detonate = function () {
  const x = this.x, y = this.y, P = Player, c = P.center();
  _arsDet.call(this);
  // Cluster Fuse: three little rockets spin out and pop 0.4s later
  if (badgesOn().cluster) for (let k = 0; k < 3; k++) { const a = -Math.PI / 2 + (k - 1) * 0.9; NPCs.push(new ArsFuse(x, y, Math.cos(a) * 260, Math.sin(a) * 260 - 120)); }
  if (!P.dead && Math.hypot(c.x - x, c.y - y) < 80 && y > c.y - 4) {
    P.vy = -1050; P.launched = true; P.launchT = 0.12; P.canDouble = true; P.canDash = true; P.jumping = false;
    pop(c.x, P.y - 20, 'ROCKET JUMP!', { size: 26, color: EMBER, burst: false, vy: -60 });
  }
};
// the Flashbang leaves the bat up and out at a slant; Nathan stays put
const _arsLaunch = Player.batLaunch;
Player.batLaunch = function (ball, ix, U, D) {
  if (!ball || ball.kind !== 'flash') return _arsLaunch.apply(this, arguments);
  const f = this.facing || 1;
  this.attackType = 'launch'; this.attackDur = 0.2; this.attackT = 0.2; this.attackCD = 0.22; this.comboIdx = 0;
  const c = this.center(); ball.x = c.x + f * 14; ball.y = c.y - 12; ball.shoot(f * 0.55, -0.83);
  ball.vx *= 0.45; ball.vy *= 0.45; ball.life = 0.6; ball.flashT = 0.4;
  addHitstop(0.05); addShake(4); SFX.launch(); pop(ball.x, ball.y - 10, 'POP-FLY!', { size: 30, color: '#fff6c4', burst: false });
};

/* ---------- Nathan, every frame ---------- */
const _arsUpd = Player.update;
Player.update = function (dt) {
  const P = this, real = dt / (Game.timeK || 1);
  ARS.slowT = Math.max(0, ARS.slowT - real); ARS.hookCD = Math.max(0, ARS.hookCD - real);
  if ((ARS.tick = (ARS.tick || 0) + real) > 1) { ARS.tick = 0; arsAutofill(); if (ARS.mode && !setBallMode(ARS.mode)) setBallMode(0); }
  const busy = Story.active || UI.modal || P.dead || !Input.enabled;
  // SWAP: tap to cycle, hold for the wheel
  if (Input.pressed('swap')) { Input.consume('swap'); if (!busy && ABIL.launch) { ARS.holding = true; ARS.holdT = 0; } }
  if (ARS.holding) {
    if (Input.down('swap') && !busy) {
      ARS.holdT += real;
      if (ARS.holdT > 0.22 && !ARS.wheel) { ARS.wheel = true; ARS.wsel = 'kin'; SFX.latch(); }
    } else {
      ARS.holding = false;
      if (ARS.wheel) arsWheelPick(P); else if (!busy) arsCycle(P);
      ARS.wheel = false;
    }
  }
  if (ARS.wheel) {
    if (Input.down('up')) ARS.wsel = 'kin'; else if (Input.down('right')) ARS.wsel = 's1'; else if (Input.down('left')) ARS.wsel = 's2'; else if (Input.down('down')) ARS.wsel = 'gad';
    Input.consume('up'); Input.consume('down');   // picking on the wheel shouldn't also talk to someone or drop through a floor
  }
  Game.timeK = ARS.wheel && !busy ? 0.5 : 1;
  if (busy) { ARS.wheel = false; ARS.holding = false; }
  if (Input.pressed('gadget')) { Input.consume('gadget'); if (!busy) arsUseGadget(P); }
  if (ARS.hook && !ARS.hook.miss) arsHookPull(P, dt);
  // a toss of one of the new ball types: tag it and pay its Hype
  const id = ARS_BY_MODE[ARS.mode], extra = id === 'curve' || id === 'split' || id === 'flash';
  const want = extra && Input.pressed('ball'), n0 = Balls.length, h0 = P.hype, egoToss = arsEgo() && Input.pressed('ball');
  const r = _arsUpd.call(this, dt);
  if (want && Balls.length > n0) {
    const b = Balls[Balls.length - 1], cost = ARS_BALL[id].cost();
    if (OPT.infHype || arsEgo() || P.hype >= cost) { b.kind = id; if (!OPT.infHype && !arsEgo()) P.hype -= cost; if (id === 'flash') SFX.fuse(); }
    else { pop(P.x + P.w / 2, P.y - 24, 'NEED HYPE', { size: 20, burst: false, color: BONE, vy: -60 }); SFX.deny(); }
  }
  // Grand Slam Ego: at 1 HP the Explosive and Static Shock balls are free too
  if (egoToss && Balls.length > n0 && !extra) { const b = Balls[Balls.length - 1]; if ((b.boom || b.shock) && P.hype < h0) P.hype = h0; }
  if (ARS.hook && ARS.hook.miss) arsHookPull(P, dt);
  return r;
};
function arsWheelPick(P) {
  const A = arsQ(), s = ARS.wsel;
  if (s === 'gad') { arsUseGadget(P); return; }
  const n = s === 'kin' ? 0 : A.balls[s === 's1' ? 0 : 1] ? ARS_BALL[A.balls[s === 's1' ? 0 : 1]].mode : -1;
  if (n < 0) { SFX.deny(); return; }
  if (n !== ARS.mode && setBallMode(n)) arsAnnounce(P, n);
}

/* ---------- drawing: the wheel, the grapple rope, the monocle's shimmer ---------- */
function arsDrawWheel() {
  if (!ARS.wheel) return;
  const P = Player, c = P.center(), A = arsQ(), R = 74, t = Game.time;
  const slots = [['kin', 0, -1, 'KINETIC', '#f3ead8'], ['s1', 1, 0], ['s2', -1, 0], ['gad', 0, 1]];
  ctx.save();
  ctx.fillStyle = 'rgba(7,6,8,.55)'; ctx.beginPath(); ctx.arc(c.x, c.y, R + 34, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(230,223,208,.25)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(c.x, c.y, R, 0, 7); ctx.stroke();
  for (const [k, dx, dy] of slots) {
    let label, col, ok = true;
    if (k === 'kin') { label = 'KINETIC'; col = '#f3ead8'; }
    else if (k === 'gad') { const g = A.gadget; label = g ? ARS_GADGET[g].name : 'NO GADGET'; col = '#ffd700'; ok = !!g; }
    else { const id = A.balls[k === 's1' ? 0 : 1]; label = id ? ARS_BALL[id].name : 'EMPTY'; col = id ? ARS_BALL[id].col : '#555'; ok = !!id; }
    const x = c.x + dx * R, y = c.y + dy * R, sel = ARS.wsel === k, rad = sel ? 22 : 17;
    ctx.save(); ctx.translate(x, y);
    if (k === 'gad') { ctx.beginPath(); ctx.arc(0, 0, rad, 0, 7); } else { ctx.rotate(Math.PI / 4); ctx.beginPath(); ctx.rect(-rad * 0.75, -rad * 0.75, rad * 1.5, rad * 1.5); }
    ctx.fillStyle = ok ? col : '#2a2a2e'; ctx.globalAlpha = ok ? 1 : 0.5; ctx.fill();
    ctx.lineWidth = sel ? 3.5 : 2; ctx.strokeStyle = sel ? '#fff3c4' : INK; ctx.stroke(); ctx.restore();
    if (sel) { ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 10; }
    ctx.font = `${sel ? 13 : 11}px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = sel ? '#fff3c4' : 'rgba(243,234,216,.7)';
    ctx.fillText(label, x, y + (dy > 0 ? 36 : dy < 0 ? -28 : 36)); ctx.shadowBlur = 0;
  }
  ctx.font = `italic 11px ${SERIF_FONT}`; ctx.fillStyle = 'rgba(243,234,216,.55)'; ctx.textAlign = 'center';
  ctx.fillText('let go to pick', c.x, c.y + 4 + Math.sin(t * 4) * 1.5);
  ctx.restore();
}
function arsDrawRope() {
  const H = ARS.hook; if (!H) return;
  const c = Player.center();
  ctx.save(); ctx.strokeStyle = '#d9cfb8'; ctx.lineWidth = 2; ctx.setLineDash([5, 3]);
  ctx.beginPath(); ctx.moveTo(c.x, c.y - 6); ctx.lineTo(H.x, H.y); ctx.stroke(); ctx.setLineDash([]);
  ctx.beginPath(); ctx.arc(H.x, H.y, 5, 0, 7); inked('#f3ead8', 2);
  ctx.strokeStyle = '#9a9488'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(H.x - 6, H.y - 6); ctx.lineTo(H.x, H.y); ctx.lineTo(H.x + 6, H.y - 6); ctx.stroke();
  ctx.restore();
}
function arsDrawShimmer() {
  if (!Save.data.up.monocle || typeof Breakables === 'undefined') return;
  const t = Game.time;
  ctx.save();
  for (const b of Breakables) {
    if (b.broken) continue;
    const a = 0.18 + 0.16 * Math.sin(t * 2.4 + b.x * 0.01);
    ctx.strokeStyle = `rgba(242,193,78,${a + 0.15})`; ctx.lineWidth = 2; ctx.strokeRect(b.x + 2, b.y + 2, b.w - 4, b.h - 4);
    ctx.fillStyle = `rgba(242,193,78,${a * 0.35})`; ctx.fillRect(b.x, b.y, b.w, b.h);
    if (Math.random() < 0.08) spawnParticle({ x: b.x + rand(0, b.w), y: b.y + rand(0, b.h), vx: 0, vy: -20, life: 0.6, size: 2, color: '#ffe08a', type: 'spark' });
  }
  ctx.restore();
}
(function () {
  const H = Game.hooks;
  const oF = H.front; H.front = function (cam) { if (oF) oF.call(H, cam); try { arsDrawShimmer(); arsDrawRope(); } catch (e) { logErr('arsenal: front', e); } };
  const oT = H.top; H.top = function (cam) { if (oT) oT.call(H, cam); try { arsDrawWheel(); } catch (e) { logErr('arsenal: wheel', e); } };
  // the HUD baseballs take the colour of the ball in hand
  const st = document.createElement('style');
  st.textContent = '.balls.ars-curve span{background:#14344a}.balls.ars-curve span::after{border-color:#6fd3ff}.balls.ars-curve span:not(.used){box-shadow:0 0 8px #6fd3ff}'
    + '.balls.ars-split span{background:#4a4030}.balls.ars-split span::after{border-color:#f2c14e}.balls.ars-split span:not(.used){box-shadow:0 0 8px #f2c14e}'
    + '.balls.ars-flash span{background:#fff6c4}.balls.ars-flash span::after{border-color:#ffffff}.balls.ars-flash span:not(.used){box-shadow:0 0 10px #fff6c4}'
    + '#bossBar .ars-hp{position:absolute;right:8px;top:50%;transform:translateY(-50%);font:12px ui-monospace,Menlo,Consolas,monospace;color:#ffe08a;text-shadow:0 1px 2px #000;pointer-events:none}';
  document.head.appendChild(st);
  let last = -1;
  setInterval(() => {
    const el = document.getElementById('balls'); if (!el || ARS.mode === last) return;
    last = ARS.mode; for (const k of ['curve', 'split', 'flash']) el.classList.toggle('ars-' + k, ARS_BY_MODE[ARS.mode] === k);
  }, 150);
})();
// the Umpire's Monocle: exact boss HP on the bar
const _arsBarSet = BossBar.set;
BossBar.set = function (k) {
  _arsBarSet.call(this, k);
  try {
    const bar = document.getElementById('bossBar'); if (!bar) return;
    let el = bar.querySelector('.ars-hp');
    if (!Save.data.up.monocle || !Zone.boss) { if (el) el.textContent = ''; return; }
    if (!el) { el = document.createElement('b'); el.className = 'ars-hp'; if (getComputedStyle(bar).position === 'static') bar.style.position = 'relative'; bar.appendChild(el); }
    const b = Zone.boss, mx = Math.round(b.maxHp || b.hp || 0);
    el.textContent = `${Math.max(0, Math.ceil(b.hp || 0))} / ${mx}`;
  } catch (e) { logErr('arsenal: boss hp', e); }
};

/* ---------- Chalk Pouches: +33% Hype each ---------- */
const arsChalk = () => ['chalk1', 'chalk2', 'chalk3'].filter(k => arsQ().found[k]).length;
const _arsApply = applyUpgrades;
applyUpgrades = function () {
  _arsApply.apply(this, arguments);
  const n = arsChalk();
  if (!n || (typeof LG !== 'undefined' && LG.F && LG.binds && LG.binds.hype)) return;   // the Legends binding caps Hype on purpose
  const base = Save.data.up.core ? 1.33 : 1;
  Player.hypeMax = Math.round(Player.hypeMax * (base + 0.33 * n) / base);
};

/* ---------- resting refills the gadgets ---------- */
const _arsRest = PAGE.onRest;
PAGE.onRest = function (i) {
  if (_arsRest) _arsRest.call(this, i);
  const q = Save.data.q, A = arsQ();
  if (brewOwned()) q.brew = arsBrewMax();
  A.mach = 1; ARS.hookCD = 0; saveGame();
};

/* ---------- where everything is hidden ---------- */
// memorabilia: ml = Scuffed Little-League Ball (12), card = Signed Rookie Card (8), ring = Gilded Championship Ring (5), rule = Original Zennith Rulebook (2)
const ARS_MEMO = {
  ml:   { name: 'Scuffed Little-League Ball',   pay: 100,  total: 12, col: '#f3ead8' },
  card: { name: 'Signed Rookie Card',           pay: 250,  total: 8,  col: '#6fd3ff' },
  ring: { name: 'Gilded Championship Ring',     pay: 500,  total: 5,  col: '#f2c14e' },
  rule: { name: 'The Original Zennith Rulebook', pay: 1000, total: 2, col: '#b98bff' },
};
const ARS_SPOTS = [
  // Zone 1 · the Scrapyard Dugout
  ['ml1', 'ml', 'cellar'], ['ml2', 'ml', 'crash'], ['chalk1', 'chalk', 'climb'],
  // Zone 2 · the Deep Quarry
  ['ml3', 'ml', 'q_rails'], ['ml4', 'ml', 'q_crystal'], ['card1', 'card', 'q_shaft'], ['magnet', 'magnet', 'q_falls'],
  // Zone 3 · the Ventilation Shafts / Zone 4 · the Pyrotechnic Foundry
  ['ml5', 'ml', 'v_shaft'], ['ml6', 'ml', 'v_turbine'], ['ml7', 'ml', 'f_run'], ['card2', 'card', 'f_floor'],
  // the Sunken Bullpen
  ['ml8', 'ml', 'b_arches'], ['ml9', 'ml', 'b_dugout'], ['card3', 'card', 'b_vault'], ['b_boomerang', 'badge', 'b_cistern'],
  // Zone 5 · the Grand Concourse
  ['chalk2', 'chalk', 'c_hall'], ['ml10', 'ml', 'c_hall'], ['ml11', 'ml', 'c_hall'], ['card4', 'card', 'c_hall'],
  // the Broadcast Spire isn't built yet: its line and its prizes wait in the Geode Caverns and the Storm Atrium
  ['grapple', 'grapple', 'g_mouth'], ['card5', 'card', 's_gate'], ['ring1', 'ring', 's_gate'],
  // Zone 6 · the Geode Caverns / Zone 7 · the Storm Atrium / Zone 8 · the Glacier Crown
  ['ml12', 'ml', 'g_fields'], ['ring2', 'ring', 'g_fields'],
  ['card6', 'card', 's_gusts'], ['ring3', 'ring', 's_gusts'], ['b_coil', 'badge', 's_gate'],
  ['card7', 'card', 'i_halls'], ['ring4', 'ring', 'i_steps'], ['chalk3', 'chalk', 'i_halls'],
  // Act III · the Gilded Bleachers, the Trophy Vault (standing in for the Catacombs), the VIP wing
  ['card8', 'card', 't_bleach'],
  ['monocle', 'monocle', 't_vault'], ['ring5', 'ring', 't_vault'], ['rule1', 'rule', 't_vault'], ['b_ego', 'badge', 't_vault'],
  ['rule2', 'rule', 't_locker'],
].map(([id, look, room]) => ({ id, look, room }));
const ARS_RELIC = {
  magnet:  { name: 'MAGNET CLEATS', body: 'Old cleats with magnets screwed into the studs. Scrap Bolts now fly straight to you, so none get lost in spikes or pits.', grant: D => { D.up.magnet = true; } },
  chalk:   { name: 'CHALK POUCH', body: 'A pouch of rosin chalk. Your Hype Orb holds 33% more. There are three of these in the Spire.', grant: () => {} },
  monocle: { name: 'THE UMPIRE\'S MONOCLE', body: 'Cracked walls and floors now shimmer gold, and the boss bar shows exact HP.', grant: D => { D.up.monocle = true; } },
  grapple: { name: 'FOULED GRAPPLE LINE', body: 'A hook tied to a worn leather baseball. Equip it in your gadget slot on a bench, then press GADGET to fire it up at a slant (hold up for steep): it latches onto ceilings, walls and drones and reels you in.', grant: D => { D.up.grapple = true; } },
};
// a standable spot in a room, picked the same way every time: up on the ledges for hidden things, on the floor for people
function arsSpot(roomId, salt, low) {
  const key = roomId + ':' + salt; if (ARS.pos[key]) return ARS.pos[key];
  const r = ROOM[roomId]; if (!r) return null;
  const c = [];
  for (let ty = r.y0 + 3; ty < r.y0 + r.th; ty++) for (let tx = r.x0 + 3; tx < r.x0 + r.tw - 3; tx++) {
    const g = tileAt(tx, ty); if (g !== 1 && g !== 3) continue;
    if (tileAt(tx, ty - 1) || tileAt(tx, ty - 2) || tileAt(tx, ty - 3)) continue;
    if (typeof UNSAFE !== 'undefined' && UNSAFE.has(unsafeKey(tx, ty))) continue;
    let bad = false; for (let k = -2; k <= 2 && !bad; k++) if (tileAt(tx + k, ty) === 2 || tileAt(tx + k, ty - 1) === 2) bad = true;
    // never under the Sunken Bullpen's water
    if (!bad && typeof BP_WATER !== 'undefined') for (const w of BP_WATER) if (w.room === roomId && tx >= w.x0 - 1 && tx <= w.x1 + 1 && ty * TILE >= w.top - 2 * TILE) bad = true;
    if (!bad) c.push([tx, ty]);
  }
  if (!c.length) return null;
  c.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  let h = 7; for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const pool = low ? c.slice(Math.floor(c.length * 0.7)) : c.slice(0, Math.max(1, Math.ceil(c.length * 0.5)));
  const [tx, ty] = pool[h % pool.length];
  return (ARS.pos[key] = { x: tx * TILE + TILE / 2, y: ty * TILE });
}
class ArsPickup {
  constructor(s, p) { Object.assign(this, { kind: 'arspick', s, x: p.x, y: p.y, t: rand(0, 6), gone: false }); }
  update(dt) {
    this.t += dt;
    const col = ARS_MEMO[this.s.look] ? ARS_MEMO[this.s.look].col : '#ffd700';
    if (Math.random() < 0.07) spawnParticle({ x: this.x + rand(-9, 9), y: this.y - rand(8, 26), vy: -20, life: 0.6, size: 2, color: col, type: 'dot' });
    const c = Player.center();
    if (!Player.dead && !Story.active && Math.hypot(c.x - this.x, c.y - (this.y - 16)) < 34) { this.gone = true; arsCollect(this.s, this.x, this.y); }
  }
  draw() {
    const x = this.x, y = this.y - 18 + Math.sin(this.t * 2.6) * 3, L = this.s.look;
    const col = ARS_MEMO[L] ? ARS_MEMO[L].col : '#ffd700';
    const g = ctx.createRadialGradient(x, y, 0, x, y, 30); g.addColorStop(0, col + '88'); g.addColorStop(1, col + '00'); ctx.fillStyle = g; ctx.fillRect(x - 30, y - 30, 60, 60);
    ctx.save(); ctx.translate(x, y); ctx.lineJoin = 'round';
    if (L === 'ml') { ctx.beginPath(); ctx.arc(0, 0, 9, 0, 7); inked('#e6dcc6', 2.5); ctx.strokeStyle = '#a83a2a'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(-5, 0, 5, -1, 1); ctx.stroke(); ctx.beginPath(); ctx.arc(5, 0, 5, 2.1, 4.2); ctx.stroke(); ctx.fillStyle = 'rgba(90,70,50,.5)'; ctx.fillRect(-3, 3, 5, 2); }
    else if (L === 'card') { ctx.rotate(Math.sin(this.t * 1.5) * 0.15); rr(-8, -11, 16, 22, 2); inked('#f3ead8', 2.5); ctx.fillStyle = '#6fd3ff'; ctx.fillRect(-5, -8, 10, 9); ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-5, 5); ctx.quadraticCurveTo(0, 2, 5, 6); ctx.stroke(); }
    else if (L === 'ring') { ctx.beginPath(); ctx.arc(0, 2, 8, 0, 7); ctx.lineWidth = 6; ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = 3.5; ctx.strokeStyle = '#f2c14e'; ctx.stroke(); rr(-4, -9, 8, 6, 2); inked('#e8361c', 2); }
    else if (L === 'rule') { rr(-10, -12, 20, 24, 2); inked('#3a1a4a', 2.5); ctx.fillStyle = '#b98bff'; ctx.font = `9px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillText('Z', 0, 3); }
    else if (L === 'magnet') { ctx.beginPath(); ctx.moveTo(-10, 4); ctx.quadraticCurveTo(-8, -6, 0, -6); ctx.lineTo(4, -3); ctx.quadraticCurveTo(10, -3, 12, 4); ctx.lineTo(-10, 4); ctx.closePath(); inked('#f3ead8', 2.5); ctx.fillStyle = '#e8361c'; ctx.fillRect(-8, 4, 4, 3); ctx.fillRect(4, 4, 4, 3); }
    else if (L === 'chalk') { ctx.beginPath(); ctx.moveTo(-8, -4); ctx.quadraticCurveTo(-9, 10, 0, 10); ctx.quadraticCurveTo(9, 10, 8, -4); ctx.closePath(); inked('#e6dfd0', 2.5); ctx.strokeStyle = INK; ctx.beginPath(); ctx.moveTo(-8, -4); ctx.quadraticCurveTo(0, -10, 8, -4); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.arc(0, -10 - Math.sin(this.t * 3) * 2, 3, 0, 7); ctx.fill(); }
    else if (L === 'monocle') { ctx.beginPath(); ctx.arc(0, 0, 8, 0, 7); ctx.fillStyle = 'rgba(242,193,78,.25)'; ctx.fill(); ctx.lineWidth = 3.5; ctx.strokeStyle = '#f2c14e'; ctx.stroke(); ctx.strokeStyle = '#d9cfb8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(6, 6); ctx.quadraticCurveTo(10, 12, 7, 16); ctx.stroke(); }
    else if (L === 'grapple') { ctx.beginPath(); ctx.arc(-4, 4, 6, 0, 7); inked('#c9a36b', 2); ctx.strokeStyle = '#9a9488'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(2, -2); ctx.lineTo(8, -10); ctx.moveTo(8, -10); ctx.lineTo(3, -12); ctx.moveTo(8, -10); ctx.lineTo(11, -5); ctx.stroke(); }
    else if (L === 'badge') { ctx.rotate(Math.sin(this.t * 2) * 0.12); ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(10, -6); ctx.lineTo(10, 6); ctx.lineTo(0, 12); ctx.lineTo(-10, 6); ctx.lineTo(-10, -6); ctx.closePath(); inked('#121014', 2.5); ctx.beginPath(); ctx.arc(0, 0, 5, 0, 7); inked('#6fd3ff', 1.5); }
    ctx.restore();
  }
}
function arsCollect(s, x, y) {
  const D = Save.data, A = arsQ(); if (A.found[s.id]) return;
  A.found[s.id] = 1; SFX.coin(); SFX.crystal();
  burst(x, y - 16, 16, { colors: [GOLD, BONE, '#ffffff'], maxSpeed: 320 });
  const M = ARS_MEMO[s.look];
  if (M) {
    saveGame();
    const n = ARS_SPOTS.filter(t => t.look === s.look && A.found[t.id]).length;
    toast(`${M.name.toUpperCase()} · ${n} / ${M.total} · THE ARCHIVIST PAYS ${M.pay} BOLTS`);
    if (!A.memoHint) { A.memoHint = 1; saveGame(); setTimeout(() => toast('SELL MEMORABILIA TO THE ARCHIVIST · THE TROPHY VAULT, GILDED STADIUM'), 2600); }
    return;
  }
  const R = ARS_RELIC[s.look]; if (!R) return;
  R.grant(D); applyUpgrades(); saveGame();
  const keys = s.look === 'grapple' ? [`<kbd>${Bindings.label('gadget')}</kbd> fire`, 'equip it on a bench'] : s.look === 'chalk' ? [`Chalk Pouches ${arsChalk()} / 3`] : ['permanent relic'];
  showCard('RELIC FOUND', R.name, R.body, keys);
}
const _arsEnter = enterRoom;
enterRoom = function (r) {
  _arsEnter.apply(this, arguments);
  try {
    if (!r) return;
    const A = arsQ();
    for (const s of ARS_SPOTS) if (s.room === r.id && !A.found[s.id]) { const p = arsSpot(s.room, s.id); if (p) NPCs.push(new ArsPickup(s, p)); }
    if (r.id === 't_vault') { const p = arsSpot('t_vault', 'archivist', true); if (p) NPCs.push(new ArsArchivist(p.x, p.y)); }
    ARS.hook = null;
  } catch (e) { logErr('arsenal: room', e); }
};

/* ---------- The Archivist (the Trophy Vault, Act III) ---------- */
const ARS_LORE = {
  ml: [
    '"Day 3. The scoreboard says we\'re tied. We haven\'t played yet." — T.W., Hawks U12',
    '"Somebody fixes the robots every night. Not us."',
    '"Coach said one more inning. That was a very long time ago."',
    '"If you find this: the benches are real. Sit down. It helps."',
    '"Tried to climb out the top. The stairs just kept going." — Rosa, second base',
    '"Lost my glove to a drone. Lost my nerve to the next one."',
    '"Counted 400 steps up the Quarry. Counted 400 back down. Same room."',
    '"We wrote our names on the wall. In the morning the wall was gone."',
    '"The big screen shows a crowd. None of them ever blink."',
    '"Mom, if this reaches you: I\'m fine. I\'m batting .300. I want to come home."',
    '"There\'s a kid with a scooter who says he can get anywhere. Except out."',
    '"Don\'t keep score. The Spire keeps it for you, and it never forgets."',
  ],
  card: [
    'NATHAN · ROOKIE CARD. Bats right. On the back, in pen: "best friend: Adam".',
    'ADAM · ROOKIE CARD. "Throws like a cannon. Laughs like one too." — Coach',
    'SEASON STATS. Nathan & Adam: 31 double plays turned together. A league record.',
    'Signed across the front: "To Nathan. Next year we win it ALL. — Adam"',
    'ADAM · footnote: "0 games missed. Brought snacks to 22 of them."',
    'TEAM PHOTO. Nathan and Adam in the middle, both pretending not to smile.',
    'NATHAN · "Hit the walk-off in the semifinal. Adam carried him off the field."',
    'The last card in the set. The back is blank, as if that season never ended.',
  ],
  ring: [
    'Engraved "CHAMPION". Scratched inside the band: "there is no top."',
    'A note wrapped round it: "We won. The door at the summit opened onto the first floor."',
    '"They gave us rings and a parade. The parade went in a circle for a week."',
    '"I beat the man in the mirror. He came back the next morning, smiling."',
    '"The only way out is to stop needing the win. I never could." — unsigned',
  ],
  rule: [
    'RULE 1. The Spire is built from a single grudge. It feeds on the guilt of the one who cannot let a loss go, and it grows every day he refuses to forgive himself.',
    'RULE 99. The Tower is built from its maker\'s regret. No cursed weapon can break the core. Only the wood it all began with. (Margin note, in pencil: every friend home, every lucky stone.)',
  ],
};
const arsCarried = () => { const A = arsQ(); return ARS_SPOTS.filter(s => ARS_MEMO[s.look] && A.found[s.id] && !A.sold[s.id]); };
const arsSoldOf = look => { const A = arsQ(); return ARS_SPOTS.filter(s => s.look === look && A.sold[s.id]).length; };
function arsLoreUnlocked() {
  const out = [];
  for (const k in ARS_LORE) { const n = arsSoldOf(k); for (let i = 0; i < n && i < ARS_LORE[k].length; i++) out.push(ARS_LORE[k][i]); }
  return out;
}
class ArsArchivist {
  constructor(x, y) { Object.assign(this, { kind: 'archivist', x, y, t: rand(0, 6), near: false, gone: false, facing: -1 }); }
  head() { return { x: this.x, y: this.y - 92 }; }
  update(dt) { this.t += dt; const c = Player.center(); this.near = !Player.dead && Math.abs(c.x - this.x) < 34 && Math.abs(Player.y + Player.h - this.y) < 20; this.facing = sgn(c.x - this.x) || this.facing; }
  interact() { if (!Story.active) arsArchivistTalk(this); }
  draw() {
    const x = this.x, y = this.y, t = this.t, bob = Math.sin(t * 1.4) * 1.2;
    ctx.save(); ctx.translate(x, y); ctx.scale(this.facing, 1); ctx.lineJoin = 'round';
    // long dusty coat
    ctx.beginPath(); ctx.moveTo(-13, 0); ctx.lineTo(-10, -58 + bob); ctx.lineTo(10, -58 + bob); ctx.lineTo(13, 0); ctx.closePath(); inked('#4a3a2a', 3);
    ctx.strokeStyle = '#2a2018'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, -56 + bob); ctx.lineTo(0, -4); ctx.stroke();
    // head, half-moon spectacles, a tuft of white hair
    ctx.beginPath(); ctx.arc(0, -70 + bob, 11, 0, 7); inked('#e8cfb0', 3);
    ctx.fillStyle = '#f3f0ea'; ctx.beginPath(); ctx.arc(-6, -79 + bob, 5, 0, 7); ctx.arc(5, -80 + bob, 4, 0, 7); ctx.fill();
    ctx.fillStyle = '#2a2018'; ctx.fillRect(-11, -74 + bob, 22, 6);   // the blindfold
    ctx.beginPath(); ctx.moveTo(-11, -71 + bob); ctx.lineTo(-17, -66 + bob + Math.sin(t * 2) * 1.5); ctx.lineTo(-15, -63 + bob); ctx.closePath(); ctx.fill();
    // a stack of yellowed scorebooks beside him
    ctx.save(); ctx.scale(1 / this.facing, 1); for (let k = 0; k < 4; k++) { rr(-34 + (k % 2) * 2, -10 - k * 7, 18, 7, 1); inked(['#c9b98a', '#a8946a', '#d8c89a', '#b8a478'][k], 2); } ctx.restore();
    // the ledger under his arm
    rr(6, -44 + bob, 14, 18, 2); inked('#6a2a2a', 2.5); ctx.fillStyle = GOLD; ctx.fillRect(9, -40 + bob, 8, 2);
    ctx.restore();
    if (this.near && !Story.active) gxPrompt('THE ARCHIVIST · SELL', x, y - 112);
  }
}
// the first time each kind of piece comes in, he knows exactly whose it was (he wears a blindfold: he goes by the smell of old leather, chalk and sweat)
const ARS_FIRST = {
  ml: ['Ah… rough leather, cheap stitching. This one belonged to a boy called Marcus, from the east side. He made it through the Quarry, beat a mine-mole, and thought he couldn\'t lose. He forgot to look up in the shafts.', 'Here. Take his pocket money. You need it more than he does.'],
  card: ['Listen to that glossy cardboard… an official rookie card. Nathan and Adam! Feel those two signatures, side by side. "Team Zennith: Unbeatable."', 'Funny how fast "unbeatable" turns into "unforgivable" once there\'s a single cup on the line. Wouldn\'t you say?'],
  ring: ['Heavy gold. Cold as ice. This ring belonged to the champion three seasons ago. He beat the final boss, walked through the golden gate… and found there were no stairs out. Only a new round.', 'The Spire doesn\'t let its winners go, Nathan. It collects them.'],
  rule: ['Wait… where did you get this?! This is the original rulebook of the very first Zennith tournament!', '(He leafs through the pages, fast.) Listen carefully: "Rule 99. The Tower is built from its maker\'s regret. No cursed weapon can break the core. Only the wood it all began with."', 'Remember those words if you ever stand face to face with the shadow at the roots, slugger.'],
};
function arsArchivistTalk(n) {
  const A = arsQ(), D = Save.data, h = () => n.head(), nh = () => Story.nathanHead(), v = { voice: 0.55 };
  const carried = arsCarried();
  Story.run(async () => {
    if (!A.metArchivist) {
      A.metArchivist = 1; saveGame();
      await Story.say('ARCHIVIST', 'Ssshh… don\'t step on the season-four statistics.', h, v);
      await Story.say('ARCHIVIST', 'I am the Archivist. While you lot run and swing up there, I write down who falls. And believe me… everyone falls, in the end.', h, v);
      await Story.say('NATHAN', 'You\'re wearing a blindfold.', nh);
      await Story.say('ARCHIVIST', 'And you smell of chalk, sweat and a very old bat. Brought me rusty iron, yellowed cards or worn-out balls from the deep? Give them to me. I\'ll pay you Scrap Bolts. And the truth about this tower.', h, v);
    }
    if (!carried.length) {
      const left = ARS_SPOTS.filter(s => ARS_MEMO[s.look] && !A.found[s.id]).length;
      await Story.say('ARCHIVIST', left ? `Nothing for me today? ${left} more pieces are still out there. Little-League balls, rookie cards, rings… and two rulebooks I would very much like back.` : 'My books are complete. Go on, slugger. Break the tournament.', h, v);
      return;
    }
    let pay = 0; const fresh = [], firsts = [];
    for (const s of carried) {
      const before = arsSoldOf(s.look); A.sold[s.id] = 1; pay += ARS_MEMO[s.look].pay;
      if (!before && !firsts.includes(s.look)) firsts.push(s.look);
      else if (ARS_LORE[s.look][before]) fresh.push(ARS_LORE[s.look][before]);
    }
    D.bolts = (D.bolts || 0) + pay; HUD.boltBump = true; saveGame(); SFX.coin(); SFX.buy();
    for (const k of ['ml', 'card', 'ring', 'rule']) if (firsts.includes(k)) for (const line of ARS_FIRST[k]) await Story.say('ARCHIVIST', line, h, v);
    if (fresh.length) await Story.say('ARCHIVIST', fresh[fresh.length - 1], h, v);
    await Story.say('ARCHIVIST', `${carried.length} piece${carried.length > 1 ? 's' : ''} for the record. ${pay} Scrap Bolts.${fresh.length > 1 ? ' The rest of what they remember is in your inventory, under Vintage Memorabilia.' : ''}`, h, v);
    if (firsts.includes('rule')) await Story.say('NATHAN', '…The wood it all began with.', nh);
    const all = ARS_SPOTS.filter(s => ARS_MEMO[s.look]).every(s => A.sold[s.id]);
    if (all && !A.archDone) {
      A.archDone = 1; saveGame();
      await Story.say('ARCHIVIST', 'My books are complete. Every name, every swing, every mistake is finally down on paper.', h, v);
      await Story.say('ARCHIVIST', 'You\'re not like the rest, Nathan. You don\'t just climb to win. You bring your friends up with you. Go now. Break the tournament.', h, v);
    }
  });
}
// boot: the room the page opened in was filled before this file loaded
try { arsAutofill(); if (Zone.room) { const r = Zone.room, A = arsQ(); for (const s of ARS_SPOTS) if (s.room === r.id && !A.found[s.id]) { const p = arsSpot(s.room, s.id); if (p) NPCs.push(new ArsPickup(s, p)); } if (r.id === 't_vault') { const p = arsSpot('t_vault', 'archivist', true); if (p) NPCs.push(new ArsArchivist(p.x, p.y)); } } } catch (e) { logErr('arsenal: boot', e); }

/* ---------- the shops: Josh's Scatter-Ball and Pitching Machine, Daniel's Flashbang ---------- */
(function () {
  if (typeof VENDORS === 'undefined') return;
  const act2 = D => !!(D.seenZones && (D.seenZones.z5 || D.seenZones.z6 || D.seenZones.z7 || D.seenZones.z8)) || !!D.fionnDead || !!D.miloDead || !!D.denizDead;
  const act3 = D => !!(D.seenZones && D.seenZones.z9) || !!D.stadium;
  const card = (t, b) => () => showCard('NEW BALL', t, b, [`<kbd>${Bindings.label('swap')}</kbd> tap to cycle · hold for the wheel`, 'pick slots on a bench']);
  if (VENDORS.josh && Array.isArray(VENDORS.josh.items)) VENDORS.josh.items.push(
    { id: 'split', name: 'Scatter-Ball', cost: 350, tag: 'ACT II', desc: 'Costs 20 Hype. Smack it at the very top of its toss (the sweet spot) and it splits mid-flight into three fast line drives. Shreds drone swarms.',
      line: '"Three times the balls, zero times the warranty if you miss."', locked: D => act2(D) ? '' : '"Not finished yet. Come back once you\'re through the Pennant Gate."',
      after: card('SCATTER-BALL', 'Toss it and smack it right at the top of the toss: it splits into three line drives. Miss the sweet spot and it\'s just a ball.') },
    { id: 'machine', name: 'Pocket Pitching Machine', cost: 600, tag: 'ACT III', desc: 'A gadget. Set it on the ground and for 8 seconds it fires fastballs at the nearest enemy while you dodge. One deploy per rest.',
      line: '"A portable Pitch-O-Matic. Without the self-destruct button. I think."', locked: D => act3(D) ? '' : '"Still soldering it. Find me again up in the stadium."',
      after: () => showCard('NEW GADGET', 'POCKET PITCHING MACHINE', 'Put it in your gadget slot on a Dugout Bench (pause menu, Tools & Items), then press GADGET on solid ground to deploy it. One per rest.', [`<kbd>${Bindings.label('gadget')}</kbd> deploy`]) },
  );
  if (VENDORS.daniel && Array.isArray(VENDORS.daniel.items)) VENDORS.daniel.items.push(
    { id: 'flash', name: 'Flashbang Pop-Fly', cost: 250, ore: 2, tag: 'ACT II', desc: 'Costs 25 Hype. Smack it and it pops up at a slant, then bursts in a magnesium flash: every normal enemy on screen is stunned for 2.5 seconds, and bosses get dazzled mid-attack.',
      line: '"Look at the birdie! …Wait, I told you to look AWAY!"', locked: D => !D.up.boom ? '"Take the free ones first, silly."' : act2(D) ? '' : '"I need better powder. The good stuff is past the Pennant Gate."',
      after: card('FLASHBANG POP-FLY', 'Smack it: it flies up at a slant and flashes after a moment, stunning everything on screen. Nathan stays put when he hits it.') },
  );
})();

/* ---------- the arsenal's badges (pinned with Charm Notches on a bench) ---------- */
const ARS_BADGES = [
  { id: 'boomerang', name: 'Boomerang Stitch', cost: 2, desc: 'Your Curveball loops back to you after its break. Swing as it arrives for a sweet-spot return: double speed, 50% more damage.', from: 'Hidden in the Sunken Bullpen' },
  { id: 'cluster', name: 'Cluster Fuse', cost: 2, desc: 'Explosive Baseballs scatter 3 mini rockets that go off 0.4s later.', from: 'Daniel\'s Fireworks Stand · Act II' },
  { id: 'coil', name: 'Chain Lightning Coil', cost: 2, desc: 'The Static Shock Ball jumps to 5 enemies instead of 3, and every zap gives back 5% Hype.', from: 'Hidden in the Storm Atrium' },
  { id: 'buckshot', name: 'Heavy Buckshot', cost: 1, desc: 'The Scatter-Ball splits into heavy steel shot: huge knockback, a little shorter range.', from: 'Lars\'s Anvil · Act II' },
  { id: 'doublebrew', name: 'Double Brew', cost: 2, desc: 'Your Chill Brew Thermos holds a third sip.', from: 'A gift from Deniz at the tea kettle' },
  { id: 'overturret', name: 'Overclocked Turret', cost: 2, desc: 'The Pocket Pitching Machine stays out 4 seconds longer, and every 5th pitch is a free Static Shock.', from: 'Josh\'s Workbench · Act III' },
  { id: 'ego', name: 'Grand Slam Ego', cost: 3, desc: 'At 1 HP, every specialty ball costs 0 Hype.', from: 'Hidden in the Trophy Vault' },
];
if (typeof LOADOUT !== 'undefined') for (const b of ARS_BADGES) if (!LOADOUT.some(x => x.id === b.id)) LOADOUT.push(b);
const arsEgo = () => !!badgesOn().ego && Player.hp === 1;
const arsBrewMax = () => (badgesOn().doublebrew ? 3 : 2);
const arsGiveBadge = id => {
  const q = Save.data.q; (q.badges = q.badges || {})[id] = 1;
  if (typeof Loadout !== 'undefined') Loadout.gained(id); else { applyUpgrades(); saveGame(); }
};
// Cluster Fuse's mini rockets
class ArsFuse {
  constructor(x, y, vx, vy) { Object.assign(this, { kind: 'arsfuse', x, y, vx, vy, t: 0.4, gone: false }); }
  update(dt) {
    this.t -= dt; this.vy += 900 * dt; this.x += this.vx * dt; this.y += this.vy * dt;
    if (Math.random() < 0.8) spawnParticle({ x: this.x, y: this.y, life: 0.25, size: rand(2, 3), color: Math.random() < 0.5 ? GOLD : EMBER, type: 'spark' });
    if (this.t <= 0 || pointSolid(this.x, this.y)) { this.gone = true; explode(this.x, this.y, 48, 2, { small: true, noBreak: true, word: 'POP!' }); }
  }
  draw() { ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(Math.atan2(this.vy, this.vx)); rr(-6, -2.5, 12, 5, 2); inked('#e8361c', 1.5); ctx.restore(); }
}
// badges hidden in the world use the 'badge' look; the id after "b_" is the badge
const _arsCollect = arsCollect;
arsCollect = function (s, x, y) {
  if (s.look !== 'badge') return _arsCollect.apply(this, arguments);
  const A = arsQ(); if (A.found[s.id]) return;
  A.found[s.id] = 1; SFX.coin(); SFX.unlock(); burst(x, y - 16, 18, { colors: [GOLD, BONE, '#6fd3ff'], maxSpeed: 340 });
  const id = s.id.slice(2), b = ARS_BADGES.find(t => t.id === id); if (!b) return;
  arsGiveBadge(id);
  showCard('BADGE FOUND', b.name.toUpperCase(), b.desc, [`costs ${b.cost} notch${b.cost > 1 ? 'es' : ''}`, 'pin it on a Dugout Bench']);
};
// Deniz hands over Double Brew the first time you fill up at the kettle
if (typeof TrKettle !== 'undefined') {
  const _arsKettle = TrKettle.prototype.interact;
  TrKettle.prototype.interact = function () {
    const r = _arsKettle.apply(this, arguments), q = Save.data.q;
    if (!Story.active && brewOwned() && !(q.badges || {}).doublebrew) {
      setTimeout(() => { toast('"HERE, BRO. A BADGE FOR A BIGGER THERMOS. THREE SIPS, ZERO STRESS." · DENIZ'); arsGiveBadge('doublebrew'); }, 900);
    }
    return r;
  };
}
// the badge shops
(function () {
  if (typeof VENDORS === 'undefined') return;
  const act2 = D => !!(D.seenZones && (D.seenZones.z5 || D.seenZones.z6 || D.seenZones.z7 || D.seenZones.z8)) || !!D.fionnDead || !!D.miloDead || !!D.denizDead;
  const act3 = D => !!(D.seenZones && D.seenZones.z9) || !!D.stadium;
  const badgeItem = (id, cost, line, lock) => {
    const b = ARS_BADGES.find(t => t.id === id);
    return { id: 'bdg_' + id, name: b.name, cost, tag: 'BADGE', desc: `${b.desc} Costs ${b.cost} notch${b.cost > 1 ? 'es' : ''}.`, line,
      owned: D => !!(D.q.badges || {})[id], grant: D => { (D.q.badges = D.q.badges || {})[id] = 1; }, locked: lock,
      after: () => { if (typeof Loadout !== 'undefined') Loadout.gained(id); } };
  };
  if (VENDORS.daniel && Array.isArray(VENDORS.daniel.items)) VENDORS.daniel.items.push(badgeItem('cluster', 180, '"Why have one boom when you can have FOUR?"',
    D => !D.up.boom ? '"Take the free ones first, silly."' : act2(D) ? '' : '"Still mixing it. Come back once you\'re through the Pennant Gate."'));
  if (VENDORS.lars && Array.isArray(VENDORS.lars.items)) VENDORS.lars.items.push(badgeItem('buckshot', 120, '"Steel shot. Hit somethin\' and it stays hit."',
    D => act2(D) ? '' : '"Not yet, slugger. Bring me news from past the Pennant Gate."'));
  if (VENDORS.josh && Array.isArray(VENDORS.josh.items)) VENDORS.josh.items.push(badgeItem('overturret', 300, '"I removed the safety limiter. Don\'t tell anyone. Especially the turret."',
    D => act3(D) ? '' : '"Needs stadium-grade capacitors. Find me again up top."'));
})();
