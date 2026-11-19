'use strict';
/* =========================================================
   NATHAN'S KIT · the gameplay behind the pause-menu tabs
     · four Batting Stances (Crests), swapped on a bench
     · Milo's Static Shock Ball, a third ball type
     · Deniz's Chill Brew thermos (+2 Shield Hearts per rest)
     · map ink dries when you rest; kill tally for the
       Scouting Report
   Save fields (all in Save.data.q): stance, brew, inked,
   kills, killZone, pins, zonePct.
   Loaded after zone/abyss.js on every story page.
   ========================================================= */
(function kitInit() {
  const D = Save.data, q = D.q;
  if (!q.inked) q.inked = Object.assign({}, D.visited);   // older saves keep the map they had
  q.kills = q.kills || {}; q.killZone = q.killZone || {}; q.pins = q.pins || {}; q.zonePct = q.zonePct || {};
  q.stance = q.stance || 'rookie';
  if (q.brew === undefined) q.brew = 1;
})();

/* ---------- Batting Stances ---------- */
const STANCES = [
  { id: 'rookie', name: 'Rookie Stance', tag: 'Balanced', slots: 3, color: '#f3ead8', glow: 'rgba(243,234,216,.55)', from: 'The stance you walked in with',
    have: () => true,
    desc: 'Feet square, eyes on the ball. The normal 3-hit combo at standard reach.',
    stats: [['Damage', '100%'], ['Swing speed', 'Normal'], ['Reach', 'Normal'], ['Badge slots', '3']] },
  { id: 'slugger', name: 'Slugger Stance', tag: 'Heavy & slow', slots: 2, color: '#ff8a2a', glow: 'rgba(255,138,42,.6)', from: 'Lars, once he joins Base Camp',
    have: D => !!D.lars,
    desc: 'Two hands, bat cocked high. Slower swings that hit 35% harder and send enemies flying.',
    stats: [['Damage', '135%'], ['Swing speed', 'Slow'], ['Knockback', '180%'], ['Badge slots', '2']] },
  { id: 'acrobat', name: 'Acrobat Stance', tag: 'Lightning fast', slots: 4, color: '#6fd3ff', glow: 'rgba(111,211,255,.6)', from: 'Catching Renas in the Wind Tunnel',
    have: D => !!D.chase,
    desc: 'Choked-up bunt grip. Short, snappy swings, pogo bounces 25% higher, and an empty Bat-Launch reloads in mid-air.',
    stats: [['Damage', '100%'], ['Swing speed', 'Fast'], ['Reach', '85%'], ['Pogo height', '125%'], ['Badge slots', '4']] },
  { id: 'mvp', name: 'MVP Stance', tag: 'High risk', slots: 4, color: '#f2c14e', glow: 'rgba(242,193,78,.7)', from: 'Reaching the Gilded Stadium',
    have: D => !!(D.stadium || D.evilAdamDead),
    desc: 'Pure showboating. Every swing throws golden sparks and builds Hype twice as fast, but every hit you take costs an extra heart.',
    stats: [['Hype gain', '200%'], ['Damage taken', '+1 per hit'], ['Badge slots', '4']] },
];
const stanceNow = () => STANCES.find(s => s.id === Save.data.q.stance && s.have(Save.data)) || STANCES[0];
const atBench = () => !!Player.sitting;

const KIT_BASE = { attackCooldown: TUNE.attackCooldown, knockback: TUNE.knockback, pogoVel: TUNE.pogoVel };
const _kitApply = applyUpgrades;
applyUpgrades = function () {
  _kitApply();
  const s = stanceNow().id;
  TUNE.attackCooldown = KIT_BASE.attackCooldown * (s === 'slugger' ? 1.35 : s === 'acrobat' ? 0.7 : 1);
  TUNE.knockback = KIT_BASE.knockback * (s === 'slugger' ? 1.8 : 1);
  TUNE.pogoVel = KIT_BASE.pogoVel * (s === 'acrobat' ? Math.sqrt(1.25) : 1);   // 25% higher = √1.25 × the speed
  if (s === 'slugger') { Player.batDmgBase *= 1.35; Player.batDmg = Player.batDmgBase; }
  if (s === 'acrobat') TUNE.batReach = Math.round(TUNE.batReach * 0.85);
  if (s === 'mvp') TUNE.hypePerHit *= 2;
};
// a stance sets the base number of badge notches (time trials & Pip & Squeak still add theirs)
if (typeof Loadout !== 'undefined') {
  const _kitNotches = Loadout.notches;
  Loadout.notches = function () { return _kitNotches.call(this) - NOTCH_START + stanceNow().slots; };
  // badges only come off and on at a bench
  const _kitToggle = Loadout.toggle;
  Loadout.toggle = function (i) {
    if (!atBench()) { SFX.deny(); const el = $('#badgeLine'); if (el) el.textContent = 'Sit on a Dugout Bench to swap badges.'; return; }
    return _kitToggle.call(this, i);
  };
}
function setStance(id) {
  const D = Save.data, s = STANCES.find(x => x.id === id);
  if (!s || !s.have(D)) { SFX.deny(); return `Locked · ${s ? s.from : ''}`; }
  if (!atBench()) { SFX.deny(); return 'Sit on a Dugout Bench to change your stance.'; }
  if (stanceNow().id === id) return `${s.name} is already in use.`;
  D.q.stance = id;
  // fewer slots than pinned badges: unpin from the bottom of the list until they fit
  const dropped = [];
  if (typeof Loadout !== 'undefined') {
    const eq = Loadout.ensure();
    for (let i = LOADOUT.length - 1; i >= 0 && Loadout.free() < 0; i--) if (eq[LOADOUT[i].id]) { delete eq[LOADOUT[i].id]; dropped.push(LOADOUT[i].name); }
  }
  applyUpgrades(); saveGame(); SFX.latch(); SFX.buy();
  return `${s.name} set.` + (dropped.length ? ` Not enough slots, unpinned: ${dropped.join(', ')}.` : '');
}
// MVP: the showboat tax
const _kitHurt = Player.hurt;
Player.hurt = function (dir) {
  const hp = this.hp, r = _kitHurt.call(this, dir);
  if (stanceNow().id === 'mvp' && this.hp < hp && this.hp > 0 && !this.dead) {
    this.hp--; HUD.hpPop = true;
    pop(this.x + this.w / 2, this.y - 44, 'SHOWBOAT TAX!', { size: 20, color: GOLD, burst: false, vy: -50 });
    if (this.hp <= 0) this.die();
  }
  return r;
};

/* ---------- Milo's Static Shock Ball ---------- */
const SHOCK_COST = 20;
const ROBOTS = new Set(['Bot', 'Drone', 'StrayDrone', 'BumperBot', 'Scuttler', 'GoldDrone', 'AutoServer']);
const shockOK = () => !!(Save.data.miloDead && ABIL.launch);
Player.shockMode = false;
const BALL_NAMES = ['KINETIC', 'EXPLOSIVE', 'STATIC SHOCK'];
function setBallMode(n) {
  const P = Player;
  if (n === 1 && !ABIL.boom) return false;
  if (n === 2 && !shockOK()) return false;
  P.boomMode = n === 1; P.shockMode = n === 2;
  return true;
}
const ballMode = () => Player.shockMode ? 2 : Player.boomMode ? 1 : 0;
const _kitUpdate = Player.update;
Player.update = function (dt) {
  const ok = shockOK();
  if (!ok) this.shockMode = false;
  // with three ball types the swap button cycles: Kinetic → Explosive → Static Shock
  if (ok && Input.pressed('swap')) {
    Input.consume('swap');
    let n = ballMode();
    for (let k = 0; k < 3; k++) { n = (n + 1) % 3; if (setBallMode(n)) break; }
    SFX.ui(); if (n === 2) SFX.staticBuzz(0.15);
    pop(this.x + this.w / 2, this.y - 26, BALL_NAMES[n], { size: 22, burst: false, color: ['#f3ead8', '#ff8a2a', '#9fe6ff'][n], vy: -60 });
  }
  const wantShock = this.shockMode && Input.pressed('ball'), n0 = Balls.length;
  const r = _kitUpdate.call(this, dt);
  if (wantShock && Balls.length > n0) {
    const b = Balls[Balls.length - 1];
    if (OPT.infHype || this.hype >= SHOCK_COST) { b.shock = true; b.zapped = new Set(); if (!OPT.infHype) this.hype -= SHOCK_COST; SFX.staticBuzz(0.2); }
    else { pop(this.x + this.w / 2, this.y - 24, 'NEED HYPE', { size: 20, burst: false, color: BONE, vy: -60 }); SFX.deny(); }
  }
  return r;
};
function stunEnemy(e, t) {
  if (e.type === 'boss' || e.dead) return;
  e.kitStunT = Math.max(e.kitStunT || 0, t);
  if (e.kitStunWrap) return;
  e.kitStunWrap = true;
  const up = e.update;
  e.update = function (dt) {
    if (this.kitStunT > 0) {
      this.kitStunT -= dt;
      if (Math.random() < 0.5) spawnParticle({ x: this.x + rand(0, this.w), y: this.y + rand(0, this.h), vx: rand(-80, 80), vy: rand(-80, 80), life: 0.2, size: rand(2, 3.5), color: Math.random() < 0.6 ? '#9fe6ff' : '#ffffff', type: 'spark' });
      return;
    }
    return up.call(this, dt);
  };
}
const _kitBall = Ball.prototype.update;
Ball.prototype.update = function (dt) {
  if (!this.shock) return _kitBall.call(this, dt);
  const before = this.hitSet.size;
  _kitBall.call(this, dt);
  if (Math.random() < 0.9) spawnParticle({ x: this.x + rand(-6, 6), y: this.y + rand(-6, 6), vx: rand(-90, 90), vy: rand(-90, 90), life: 0.22, size: rand(2, 3.5), color: Math.random() < 0.6 ? '#9fe6ff' : '#ffffff', type: 'spark' });
  if (this.state !== 'shot' || this.hitSet.size === before) return;
  for (const e of this.hitSet) if (!this.zapped.has(e)) { this.zapped.add(e); stunEnemy(e, ROBOTS.has(e.constructor.name) ? 1.6 : 0.6); }
  pop(this.x, this.y - 30, 'ZZZAP!', { size: 24, color: '#9fe6ff', burstColor: '#2a4a66' }); SFX.staticBuzz(0.25);
  // chain to the nearest enemy it hasn't hit yet (up to 3 hops)
  this.hops = (this.hops || 0) + 1;
  if (this.hops > 3) return;
  let best = null, bd = 320;
  for (const e of Enemies) {
    if (e.dead || e.untargetable || e.type === 'orb' || this.hitSet.has(e)) continue;
    const d = Math.hypot(e.x + e.w / 2 - this.x, e.y + e.h / 2 - this.y);
    if (d < bd) { bd = d; best = e; }
  }
  if (!best) return;
  const dx = best.x + best.w / 2 - this.x, dy = best.y + best.h / 2 - this.y, d = Math.hypot(dx, dy) || 1;
  this.vx = dx / d * 1400; this.vy = dy / d * 1400; this.life = 0.45; this.dead = false;
  for (let k = 0; k < 8; k++) { const f = k / 8; spawnParticle({ x: this.x + dx * f + rand(-6, 6), y: this.y + dy * f + rand(-6, 6), vx: 0, vy: 0, life: 0.18, size: 3, color: '#dff6ff', type: 'spark' }); }
};

/* ---------- Deniz's Chill Brew ---------- */
const brewOwned = () => !!Save.data.denizDead;
function drinkBrew() {
  const q = Save.data.q;
  if (!brewOwned()) { SFX.deny(); return 'Deniz hasn\'t joined the crew yet.'; }
  if (!atBench()) { SFX.deny(); return 'Sit on a Dugout Bench to drink it.'; }
  if (!q.brew) { SFX.deny(); return 'The thermos is empty. It refills next time you rest.'; }
  q.brew = 0; Player.shield = (Player.shield || 0) + 2; HUD.shield = -1; HUD.hpPop = true;
  const c = Player.center();
  ring(c.x, c.y, 16, 80, 0.45, '#9fe6ff', 6); burst(c.x, c.y, 18, { colors: ['#9fe6ff', '#f3ead8', '#9be36a'], maxSpeed: 300 });
  SFX.heal(); saveGame();
  return '+2 Shield Hearts. Ahh. Ultimate chill.';
}

/* ---------- resting: ink dries, the thermos refills ---------- */
const _kitRest = PAGE.onRest;
PAGE.onRest = function (i) {
  if (_kitRest) _kitRest.call(this, i);
  const D = Save.data, q = D.q, wet = Object.keys(D.visited).filter(k => !q.inked[k]).length;
  q.inked = Object.assign({}, D.visited);
  const refill = brewOwned() && !q.brew; q.brew = 1;
  saveGame();
  if (wet && D.up.quill) setTimeout(() => toast(`MAP UPDATED · ${wet} NEW AREA${wet > 1 ? 'S' : ''} INKED IN`), 2700);
  else if (refill) setTimeout(() => toast('DENIZ\'S CHILL BREW · REFILLED'), 2700);
};

/* ---------- the Scouting Report: what you've beaten ---------- */
const _kitDie = enemyDie;
enemyDie = function (e) {
  try {
    const k = e && e.constructor && e.constructor.name, q = Save.data.q;
    if (k && k !== 'Dummy' && k !== 'Crate' && e.type !== 'boss') { q.kills[k] = (q.kills[k] || 0) + 1; if (!q.killZone[k]) q.killZone[k] = PAGE.zoneHere(); }
  } catch (err) { logErr('kit: kill tally', err); }
  return _kitDie(e);
};

/* ---------- per-frame: MVP sparks, Acrobat reloads, the HUD ball colour ---------- */
const _kitTick = PAGE.tick;
let kitReload = 0, kitShockHud = null;
PAGE.tick = function (dt) {
  if (_kitTick) _kitTick.call(this, dt);
  const P = Player, s = stanceNow().id;
  if (s === 'mvp' && P.attackT > 0 && P.attackType !== 'launch' && Math.random() < 0.75) {
    const hb = P.hitbox();
    spawnParticle({ x: hb.x + rand(0, hb.w), y: hb.y + rand(0, hb.h), vx: rand(-90, 90), vy: rand(-220, -60), life: rand(0.25, 0.5), size: rand(2, 4), color: Math.random() < 0.7 ? '#f2c14e' : '#fff3c0', type: 'spark', grav: 500 });
  }
  if (s === 'acrobat' && ABIL.launch && !P.onGround && !P.dead && P.balls < TUNE.ballCount && !Balls.some(b => !b.dead)) {
    if ((kitReload += dt) > 1.1) {
      kitReload = 0; P.balls++;
      const c = P.center(); ring(c.x, c.y, 8, 34, 0.25, '#6fd3ff', 3);
      pop(c.x, P.y - 20, 'RELOAD', { size: 16, burst: false, color: '#6fd3ff', vy: -40 }); SFX.toss();
    }
  } else kitReload = 0;
  if (P.shockMode !== kitShockHud) { const el = $('#balls'); if (el) el.classList.toggle('shock', P.shockMode); kitShockHud = P.shockMode; }
  // new Menu Styles (an ending, Deniz's tea, the Abyss…) get announced in-game too
  if ((kitThemeT += dt) > 4 && !Story.active) { kitThemeT = 0; if (typeof themeCheck === 'function' && typeof Themes !== 'undefined') themeCheck(0); }
};
let kitThemeT = 0;

applyUpgrades();
