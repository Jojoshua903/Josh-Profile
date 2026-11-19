'use strict';
/* =========================================================
   GAUNTLETS · five optional challenge rooms, each with a
   bench right outside. Loaded last on every story page.
   1 · The Scrapyard Pit          (Zone 1)  five waves + crushers
   2 · The Foundry Conveyor Run   (Zone 4)  climb above rising slag
   3 · The Crystal Zero-G Trial   (Zone 6)  a floorless wave arena
   4 · The Laser Turbine Shaft    (Zone 3)  pure platforming
   5 · The Championship Colosseum (Zone 9)  a three-cup boss rush
   Progress lives in Save.data.q.gx.
   ========================================================= */
const GX_T = (tx, row) => ({ x: tx * TILE + TILE / 2, y: row * TILE });
const gx = () => {
  const q = Save.data.q, g = q.gx = q.gx || {};
  g.cleared = g.cleared || {}; g.found = g.found || {}; g.cups = g.cups || {};
  return g;
};
const GX_BASE = { dash: TUNE.dashTime };
// a gauntlet prize badge joins your collection (zone/badges.js pins it if there's a free notch)
const gxBadge = id => { const q = Save.data.q; (q.badges = q.badges || {})[id] = 1; if (typeof Loadout !== 'undefined') Loadout.gained(id); };
// the clipboard's view of every gauntlet (any page can list them)
const GX_LIST = [
  { id: 'pit', title: 'The Scrapyard Pit', where: 'a rusted hatch at the far end of Base Camp (blow it open)', goal: 'Survive five waves in the cage',
    reward: 'Raw Titanium Ore and a chest of 300 Scrap Bolts', got: g => g.pitChest },
  { id: 'shaft', title: 'The Laser Turbine Shaft', where: 'under the Turbine Hall floor, behind the fans (blow it open)', goal: 'Ride the updraft up to the hidden alcove',
    reward: 'Renas\'s Turbo Wheels: +10% run speed, +25% dash distance', got: g => g.turbo },
  { id: 'run', title: 'The Foundry Conveyor Run', where: 'behind the Fuse Tower\'s cracked back wall (blow it open)', goal: 'Climb the Furnace Shaft before the slag catches you',
    reward: 'The Pyro-Core Charm: the 3rd hit of a combo bursts into flame', got: g => g.pyro },
  { id: 'zerog', title: 'The Crystal Zero-G Trial', where: 'a crack in the Geode Mouth floor, past three red lasers', goal: 'Clear four waves with no floor under you',
    reward: '5 Lucky Pebbles and the Air-Ace Badge: spent baseballs recharge mid-air', got: g => g.ace },
  { id: 'colo', title: 'The Championship Colosseum', where: 'Coach Monfort\'s VIP lift in the Grand Locker Room', goal: '',
    reward: 'Bronze: +1 Hype slot · Silver: +1 max HP · Gold: the MVP Crown', got: g => g.cups.gold },
];

/* ---------- the registry: one module per gauntlet, only the ones on this page ---------- */
const Gaunt = {
  mods: [], run: null, warping: false,
  add(m) { if (m.page === PAGE.id) this.mods.push(m); return m; },
  each(k, a) { for (const m of this.mods) if (m[k]) m[k](a); },
  found(id) { const g = gx(); if (!g.found[id]) { g.found[id] = 1; saveGame(); } },
  start(m) { this.run = m; SFX.music('duel'); },
  stop() { this.run = null; SFX.musicAuto(); },
  abort() { const m = this.run; this.run = null; if (m && m.abort) m.abort(); SFX.musicAuto(); },
  drawBanner() {
    const m = this.run; if (!m || !m.banner || Story.active) return;
    const s = m.banner(), y = VH - 74;
    ctx.save(); ctx.font = `16px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(s).width + 36;
    ctx.fillStyle = 'rgba(8,5,12,.72)'; rr(VW / 2 - w / 2, y - 15, w, 30, 6); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = GOLD; ctx.stroke();
    ctx.fillStyle = BONE; ctx.fillText(s, VW / 2, y + 1);
    ctx.restore();
  },
};
// fade out, hop somewhere else on this page, fade back in (keeps your health)
function gxWarp(pos, roomId, face = 1) {
  if (Gaunt.warping) return;
  Gaunt.warping = true; SFX.gate(); Game.fadeTarget = 1; Input.enabled = false;
  setTimeout(() => {
    const hp = Player.hp;
    Player.reset(pos, true); Player.hp = hp; Player.facing = face;
    enterRoom(ROOM[roomId]); snapCamera();
    Game.fade = 1; Game.fadeTarget = 0; Input.enabled = true; Gaunt.warping = false;
  }, 480);
}
const gxPrompt = (label, x, y) => {
  ctx.font = `14px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = GOLD;
  ctx.fillText('▲ ' + Bindings.label('up', Game.lastInput) + ' · ' + label, x, y + Math.sin(Game.time * 4) * 2);
};

/* ---------- gadgets ---------- */
// a golden refill ring: fly through it to get your baseballs, air dash and double jump back
class GRing {
  constructor(x, y) { Object.assign(this, { kind: 'gring', x, y, t: rand(0, 6), cd: 0, gone: false }); }
  update(dt) {
    this.t += dt; this.cd = Math.max(0, this.cd - dt);
    const P = Player, c = P.center();
    if (this.cd <= 0 && !P.dead && !P.hazard && Math.hypot(c.x - this.x, c.y - this.y) < 30) {
      this.cd = 1.4; P.balls = TUNE.ballCount; P.canDash = true; P.canDouble = true;
      SFX.blip(); ring(this.x, this.y, 8, 46, 0.3, GOLD, 4);
      pop(this.x, this.y - 26, 'REFILL!', { size: 18, burst: false, color: GOLD, vy: -50 });
    }
  }
  draw() {
    const r = 17 + Math.sin(this.t * 4) * 2;
    ctx.save(); ctx.globalAlpha = this.cd > 0 ? 0.3 : 1;
    const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, 34); g.addColorStop(0, 'rgba(242,193,78,.35)'); g.addColorStop(1, 'rgba(242,193,78,0)');
    ctx.fillStyle = g; ctx.fillRect(this.x - 34, this.y - 34, 68, 68);
    ctx.beginPath(); ctx.arc(this.x, this.y, r, 0, 7); ctx.lineWidth = 7; ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = 4; ctx.strokeStyle = GOLD; ctx.stroke();
    ctx.fillStyle = BONE; ctx.beginPath(); ctx.arc(this.x, this.y, 4.5, 0, 7); ctx.fill();
    for (let k = 0; k < 3; k++) { const a = this.t * 2 + k * 2.1; ctx.fillStyle = GOLD; ctx.fillRect(this.x + Math.cos(a) * (r + 7) - 2, this.y + Math.sin(a) * (r + 7) - 2, 4, 4); }
    ctx.restore();
  }
}
// a prize chest: press up (or whack it) to open
class GChest {
  constructor(x, y, onOpen) { Object.assign(this, { kind: 'gchest', x, y, onOpen, t: 0, near: false, gone: false, opened: false, lid: 0 }); }
  box() { return { x: this.x - 22, y: this.y - 34, w: 44, h: 34 }; }
  update(dt) {
    this.t += dt;
    if (this.opened) { this.lid = Math.min(1, this.lid + dt * 3); return; }
    const P = Player, c = P.center();
    this.near = !P.dead && Math.abs(c.x - this.x) < 34 && Math.abs(P.y + P.h - this.y) < 30;
    if (P.attackT > 0 && P.attackType !== 'launch' && !P.hitSet.has(this) && overlap(P.hitbox(), this.box())) { P.hitSet.add(this); this.interact(); }
    if (Math.random() < 0.08) spawnParticle({ x: this.x + rand(-18, 18), y: this.y - rand(10, 34), vy: -30, life: 0.6, size: 2, color: GOLD, type: 'dot' });
  }
  interact() {
    if (this.opened || Story.active) return;
    this.opened = true; this.near = false;
    SFX.unlock(); SFX.coin(); addShake(5);
    burst(this.x, this.y - 24, 26, { colors: [GOLD, BONE, EMBER], maxSpeed: 460, grav: 700 });
    this.onOpen(this);
  }
  draw() {
    const x = this.x, y = this.y;
    ctx.save(); ctx.lineJoin = 'round';
    if (!this.opened) { const g = ctx.createRadialGradient(x, y - 16, 0, x, y - 16, 56); g.addColorStop(0, 'rgba(242,193,78,.35)'); g.addColorStop(1, 'rgba(242,193,78,0)'); ctx.fillStyle = g; ctx.fillRect(x - 56, y - 72, 112, 112); }
    rr(x - 20, y - 22, 40, 22, 3); inked('#8a5a3a', 3);
    ctx.fillStyle = GOLD; ctx.fillRect(x - 20, y - 15, 40, 4); ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.strokeRect(x - 20, y - 15, 40, 4);
    ctx.save(); ctx.translate(x - 20, y - 22); ctx.rotate(-this.lid * 1.15);
    rr(0, -12, 40, 12, 5); inked('#a8734c', 3); ctx.fillStyle = GOLD; ctx.fillRect(0, -6, 40, 3);
    ctx.restore();
    rr(x - 4, y - 19, 8, 9, 2); inked(GOLD, 2);
    ctx.restore();
    if (this.near && !Story.active) gxPrompt('OPEN', x, y - 52);
  }
}
// a post you press up at: a lift, a teleport pad, or a Colosseum cup podium
class GPost {
  constructor(x, y, o) { Object.assign(this, { kind: 'gpost', x, y, t: rand(0, 6), near: false, gone: false, reach: 28, look: 'pad', label: 'RIDE', color: GOLD, go: null, lock: null, done: null }, o); }
  update(dt) {
    this.t += dt;
    const c = Player.center();
    this.near = !Player.dead && Math.abs(c.x - this.x) < this.reach && Math.abs(Player.y + Player.h - this.y) < 14;
  }
  interact() {
    if (Story.active || Gaunt.warping) return;
    const why = this.lock && this.lock();
    if (why) { SFX.deny(); toast(why); return; }
    if (this.go) this.go(this);
  }
  draw() {
    const x = this.x, y = this.y, t = this.t, locked = !!(this.lock && this.lock());
    ctx.save(); ctx.lineJoin = 'round';
    if (this.look === 'pad') {
      const g = ctx.createRadialGradient(x, y - 30, 0, x, y - 30, 60); g.addColorStop(0, `rgba(242,193,78,${0.25 + Math.sin(t * 3) * 0.08})`); g.addColorStop(1, 'rgba(242,193,78,0)');
      ctx.fillStyle = g; ctx.fillRect(x - 60, y - 90, 120, 100);
      ctx.beginPath(); ctx.ellipse(x, y - 3, 24, 6, 0, 0, 7); inked('#3a3340', 2.5);
      ctx.beginPath(); ctx.ellipse(x, y - 4, 17, 3.5, 0, 0, 7); ctx.fillStyle = GOLD; ctx.fill();
      for (let k = 0; k < 3; k++) { const s = (t * 0.8 + k / 3) % 1; ctx.globalAlpha = 1 - s; ctx.strokeStyle = GOLD; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 7, y - 16 - s * 40); ctx.lineTo(x, y - 24 - s * 40); ctx.lineTo(x + 7, y - 16 - s * 40); ctx.stroke(); }
      ctx.globalAlpha = 1;
    } else if (this.look === 'lift') {
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x - 24, y - 120, 48, 120);
      ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(x - 24, y - 96, 48, 96);
      ctx.strokeStyle = locked ? '#6b6f7a' : GOLD; ctx.lineWidth = 2;
      for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x - 24 + k * 12, y - 96); ctx.lineTo(x - 24 + k * 12, y); ctx.stroke(); }
      rr(x - 28, y - 6, 56, 6, 2); inked('#8a6a2a', 2.5); rr(x - 28, y - 104, 56, 9, 2); inked('#5a4320', 2.5);
      ctx.fillStyle = locked ? '#5a1a1a' : (Math.sin(t * 6) > 0 ? '#7dff9a' : '#2a5a3a'); ctx.beginPath(); ctx.arc(x, y - 114, 4.5, 0, 7); ctx.fill();
    } else if (this.look === 'cup') {
      rr(x - 22, y - 34, 44, 34, 3); inked(locked ? '#3a3340' : '#5a4a6e', 3);
      ctx.fillStyle = this.color; ctx.fillRect(x - 22, y - 34, 44, 5);
      const cy = y - 34 - 6 + Math.sin(t * 2) * 2;
      ctx.save(); ctx.globalAlpha = locked ? 0.35 : 1;
      const g = ctx.createRadialGradient(x, cy - 16, 0, x, cy - 16, 40); g.addColorStop(0, 'rgba(255,240,200,.3)'); g.addColorStop(1, 'rgba(255,240,200,0)'); ctx.fillStyle = g; ctx.fillRect(x - 40, cy - 56, 80, 80);
      rr(x - 9, cy - 6, 18, 6, 2); inked(this.color, 2); ctx.fillStyle = this.color; ctx.fillRect(x - 2.5, cy - 14, 5, 9);
      ctx.beginPath(); ctx.moveTo(x - 14, cy - 34); ctx.lineTo(x + 14, cy - 34); ctx.quadraticCurveTo(x + 13, cy - 16, x, cy - 13); ctx.quadraticCurveTo(x - 13, cy - 16, x - 14, cy - 34); ctx.closePath(); inked(this.color, 2.5);
      ctx.lineWidth = 3; ctx.strokeStyle = this.color; ctx.beginPath(); ctx.arc(x - 16, cy - 27, 5, 1.6, 4.7); ctx.moveTo(x + 16, cy - 32); ctx.arc(x + 16, cy - 27, 5, -1.6, 1.6); ctx.stroke();
      ctx.restore();
      ctx.font = `12px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = locked ? 'rgba(243,234,216,.4)' : BONE;
      ctx.fillText((this.done && this.done() ? '✓ ' : '') + this.title, x, y - 92);
    }
    ctx.restore();
    if (this.near && !Story.active) gxPrompt(locked && this.lockLabel ? this.lockLabel : this.label, x, y - (this.look === 'lift' ? 132 : this.look === 'cup' ? 110 : 96));
  }
}
// a firework rocket the Furnace Shaft spits out of the wall: bat it and it flies straight up
class GRocket {
  constructor(x, y, dir) { Object.assign(this, { x, y, vx: dir * 330, vy: 0, dead: false, friendly: false, t: 0 }); }
  box() { return { x: this.x - 18, y: this.y - 14, w: 36, h: 28 }; }
  update(dt) {
    this.t += dt; this.x += this.vx * dt; this.y += this.vy * dt;
    if (Math.random() < 0.8) spawnParticle({ x: this.x - (this.friendly ? 0 : sgn(this.vx) * 14), y: this.y + (this.friendly ? 14 : 0), vx: rand(-40, 40), vy: rand(-40, 40), life: 0.3, size: rand(2, 4), color: Math.random() < 0.5 ? GOLD : EMBER, type: 'dot' });
    const nx = this.friendly ? this.x : this.x + sgn(this.vx) * 16, ny = this.friendly ? this.y - 14 : this.y;
    if (pointSolid(nx, ny) || this.t > 6) {
      this.dead = true;
      if (this.friendly) explode(this.x, this.y - 4, 90, 3, { friendly: true, word: 'BLAST!' });
      else explode(this.x, this.y, 62, 0, { friendly: false, hurtsPlayer: true, small: true, word: false });
      return;
    }
    if (!this.friendly && overlap({ x: this.x - 12, y: this.y - 7, w: 24, h: 14 }, Player.hurtbox())) {
      this.dead = true; explode(this.x, this.y, 62, 0, { friendly: false, hurtsPlayer: true, small: true, word: 'BOOM!' });
    }
  }
  onBat() {
    this.friendly = true; this.vx = 0; this.vy = -900;
    SFX.launch(); addHitstop(0.08); addShake(7);
    pop(this.x, this.y - 22, 'SKY-HIGH!', { size: 32, burstColor: EMBER }); ring(this.x, this.y, 8, 60, 0.3, EMBER, 5);
  }
  draw() {
    ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.friendly ? -Math.PI / 2 : this.vx < 0 ? Math.PI : 0); ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-14, -6); ctx.lineTo(-20, -11); ctx.lineTo(-18, 0); ctx.lineTo(-20, 11); ctx.lineTo(-14, 6); ctx.closePath(); inked('#6b6f7a', 2);
    rr(-15, -6, 25, 12, 3); inked(FLAME, 2.5);
    ctx.fillStyle = BONE; ctx.fillRect(-6, -6, 4, 12);
    ctx.beginPath(); ctx.moveTo(10, -6); ctx.lineTo(19, 0); ctx.lineTo(10, 6); ctx.closePath(); inked(GOLD, 2);
    ctx.restore();
    if (!this.friendly && Math.abs(Player.x - this.x) < 220 && Math.abs(Player.y - this.y) < 120) {
      ctx.font = `12px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = GOLD; ctx.fillText('SWING!', this.x, this.y - 22 + Math.sin(Game.time * 8) * 2);
    }
  }
}

/* =========================================================
   1 · THE SCRAPYARD PIT (Zone 1): a rusted hatch at the far end of
   Base Camp drops into a cage. Five waves pour out of three
   ceiling chutes while spiked crushers slam both walls.
   ========================================================= */
const PIT_WAVES = [['s', 's', 's'], ['s', 's', 'd', 'd'], ['b', 's', 's', 'd'], ['b', 'b', 'd', 'd', 's'], ['b', 'b', 'd', 'd', 'd', 's', 's']];
const PIT_CHUTES = [252, 260, 268];
Gaunt.add({
  id: 'pit', page: 'z1', room: 'g_pit',
  S: { on: false, wave: 0, gap: 0, q: [], qt: 0, crush: [], flash: {}, hint: false },
  boot() { if (Save.data.walls.pit_hatch) fill(244, 62, 2, 2, 0); },
  enter(r) {
    const D = Save.data, S = this.S;
    if (r.id === 'hub' && !D.walls.pit_hatch) Breakables.push({ x: 244 * TILE, y: 62 * TILE, w: 2 * TILE, h: 2 * TILE, id: 'pit_hatch', onBreak: () => this.blowHatch() });
    if (r.id !== 'g_pit') return;
    Gaunt.found('pit');
    S.crush = [this.crusher(241, 0), this.crusher(276, 1.7)];
    if (gx().cleared.pit) this.prizes();
  },
  blowHatch() {
    const D = Save.data; D.walls.pit_hatch = 1; saveGame(); fill(244, 62, 2, 2, 0);
    burst(245 * TILE, 63 * TILE, 30, { colors: ['#6b4a30', '#8a8f99', '#3a2616'], maxSpeed: 520, grav: 1400, type: 'debris' });
    pop(245 * TILE, 61 * TILE, 'CRASH!', { size: 40 });
    Gaunt.found('pit');
    setTimeout(() => toast('THE HATCH BLEW OPEN · SOMETHING DOWN THERE IS GROWLING'), 500);
  },
  crusher(tx, ph) { return { tx, x: tx * TILE, w: 3 * TILE, st: 'up', t: 2.4 + ph, ext: 0, hits: new Set() }; },
  update(dt) {
    const D = Save.data, g = gx(), S = this.S, P = Player, c = P.center(), feet = P.y + P.h, id = Zone.room.id;
    if (id === 'hub' && !D.walls.pit_hatch && !S.hint && Math.abs(c.x - 245 * TILE) < 3 * TILE && Math.abs(feet - 62 * TILE) < 8) {
      S.hint = true; Gaunt.found('pit');
      toast(D.up.boom ? 'A RUSTED HATCH · SOMETHING RATTLES BELOW · TRY AN EXPLOSIVE BASEBALL' : 'A RUSTED HATCH, WELDED SHUT · IT WOULD TAKE EXPLOSIVES');
    }
    if (id !== 'g_pit') return;
    for (const k in S.flash) S.flash[k] = Math.max(0, S.flash[k] - dt);
    if (!S.on && !g.cleared.pit && !P.dead && P.onGround && feet >= 69 * TILE) this.start();
    if (S.on) this.waves(dt);
    for (const k of S.crush) this.crushTick(k, dt);
  },
  start() {
    const S = this.S;
    Object.assign(S, { on: true, wave: 0, gap: 1.2, q: [], qt: 0 });
    fill(244, 66, 2, 1, 1); markUnsafe(244, 66, 2, 1);
    Gaunt.start(this); SFX.gate(); SFX.slam(); addShake(8);
    pop(Player.x + Player.w / 2, Player.y - 40, 'LOCKED IN!', { size: 40, color: FLAME });
    toast('THE HATCH SLAMS SHUT · SURVIVE FIVE WAVES · MIND THE CRUSHERS');
  },
  waves(dt) {
    const S = this.S;
    if (S.q.length) { S.qt -= dt; if (S.qt <= 0) { S.qt = 0.45; this.drop(S.q.shift()); } return; }
    if (Enemies.some(e => !e.dead && e.type !== 'crate')) return;
    S.gap -= dt; if (S.gap > 0) return;
    if (S.wave >= PIT_WAVES.length) { this.win(); return; }
    S.q = PIT_WAVES[S.wave].slice(); S.wave++; S.qt = 0.35; S.gap = 1.4;
    SFX.bell(); pop(Player.x + Player.w / 2, Player.y - 40, S.wave === PIT_WAVES.length ? 'FINAL WAVE!' : `WAVE ${S.wave}`, { size: 40, color: GOLD });
  },
  drop(k) {
    const tx = PIT_CHUTES[(Math.random() * PIT_CHUTES.length) | 0], x = tx * TILE + TILE / 2;
    this.S.flash[tx] = 0.5;
    const e = k === 's' ? new Scuttler(x, 69 * TILE) : k === 'b' ? new BumperBot(x, 69 * TILE) : new StrayDrone(x, 71 * TILE);
    Enemies.push(e); SFX.clang();
    burst(x, 67 * TILE + 6, 10, { colors: ['#8a8f99', GOLD, BONE], maxSpeed: 260, angle: Math.PI / 2, spread: 0.8 });
  },
  crushTick(k, dt) {
    const S = this.S, top = 67 * TILE, floor = 85 * TILE, span = floor - top - 38, dir = k.tx < 260 ? 1 : -1;
    if (!S.on) { k.ext = Math.max(0, k.ext - dt * 1.5); k.st = 'up'; k.t = 1.5; return; }
    k.t -= dt;
    if (k.st === 'up' && k.t <= 0) { k.st = 'warn'; k.t = 0.7; SFX.slamWarn(); }
    else if (k.st === 'warn' && k.t <= 0) { k.st = 'slam'; k.hits = new Set(); }
    else if (k.st === 'slam') { k.ext = Math.min(1, k.ext + dt * 7); if (k.ext >= 1) { k.st = 'hold'; k.t = 0.45; SFX.slam(); addShake(9); dust(k.x + k.w / 2, floor, 10); } }
    else if (k.st === 'hold' && k.t <= 0) k.st = 'rise';
    else if (k.st === 'rise') { k.ext = Math.max(0, k.ext - dt * 1.6); if (k.ext <= 0) { k.st = 'up'; k.t = rand(1.8, 2.8); } }
    if (k.st !== 'slam' && k.st !== 'hold') return;
    const r = { x: k.x, y: top, w: k.w, h: 38 + k.ext * span }, P = Player;
    if (!P.dead && !P.hazard && overlap(P.hurtbox(), r)) { P.hurt(dir); P.x = dir > 0 ? r.x + r.w + 2 : r.x - P.w - 2; }
    for (const e of Enemies) if (!e.dead && e.type !== 'crate' && !k.hits.has(e) && overlap(e, r)) { k.hits.add(e); e.takeHit(3, dir, -1, 'boom'); }
  },
  win() {
    const S = this.S, g = gx();
    S.on = false; fill(244, 66, 2, 1, 0);
    g.cleared.pit = 1; saveGame(); Gaunt.stop();
    SFX.confetti(); SFX.crowd(1.5); Story.impact(Player.x + Player.w / 2, Player.y + Player.h, GOLD);
    pop(Player.x + Player.w / 2, Player.y - 50, 'CAGE CLEARED!', { size: 48, color: GOLD });
    toast('THE SCRAPYARD PIT · CLEARED · THE HATCH IS OPEN AGAIN');
    this.prizes();
  },
  prizes() {
    const D = Save.data, g = gx();
    if (!D.ores.g_pit) NPCs.push(new OreChunk(GX_T(258, 85).x, 85 * TILE, 'g_pit'));
    if (!g.pitChest) NPCs.push(new GChest(GX_T(265, 85).x, 85 * TILE, ch => {
      g.pitChest = 1; D.bolts += 260; HUD.boltBump = true; saveGame();
      dropBolts(ch.x, ch.y - 24, 40);
      pop(ch.x, ch.y - 60, '+300 BOLTS!', { size: 36, color: GOLD });
      toast('A CHEST OF 300 SCRAP BOLTS');
    }));
    NPCs.push(new GPost(GX_T(248, 85).x, 85 * TILE, { look: 'lift', label: 'RIDE UP TO BASE CAMP', go: () => gxWarp(GX_T(247, 62), 'hub', 1) }));
  },
  abort() { const S = this.S; S.on = false; S.q = []; fill(244, 66, 2, 1, 0); },
  banner() { return `THE SCRAPYARD PIT · WAVE ${Math.max(1, this.S.wave)} / ${PIT_WAVES.length}`; },
  draw_behindTiles() {
    if (Zone.room.id !== 'g_pit') return;
    const x0 = 241 * TILE, x1 = 279 * TILE, y0 = 67 * TILE, y1 = 85 * TILE;
    ctx.save();
    ctx.fillStyle = 'rgba(20,16,26,.55)'; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.strokeStyle = 'rgba(138,143,153,.22)'; ctx.lineWidth = 5;
    for (let x = x0 + 40; x < x1; x += 56) { ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke(); }
    ctx.lineWidth = 3; for (let y = y0 + 90; y < y1; y += 150) { ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); }
    ctx.font = `22px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(232,54,28,.35)'; ctx.fillText('THE PIT', 260 * TILE, 73 * TILE);
    ctx.restore();
  },
  draw_back() {
    const id = Zone.room.id, S = this.S;
    if (id === 'hub') for (const b of Breakables) if (b.id === 'pit_hatch' && !b.broken) {
      ctx.save(); rr(b.x - 2, b.y - 4, b.w + 4, 8, 2); inked('#7a5a3a', 2.5);
      ctx.fillStyle = INK; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(b.x + 6 + k * (b.w - 12) / 3, b.y, 2, 0, 7); ctx.fill(); }
      ctx.restore(); drawCracks(b);
    }
    if (id !== 'g_pit') return;
    const top = 67 * TILE, span = 18 * TILE - 38;
    for (const tx of PIT_CHUTES) {   // the ceiling chutes
      const x = tx * TILE + TILE / 2, f = S.flash[tx] || 0;
      ctx.save(); rr(x - 26, top - 4, 52, 16, 3); inked(f > 0 ? '#ff8a4a' : '#4a4552', 3);
      ctx.fillStyle = INK; ctx.fillRect(x - 18, top + 6, 36, 6);
      ctx.fillStyle = S.on ? (Math.sin(Game.time * 8 + tx) > 0 ? FLAME : '#5a1a1a') : '#2a5a3a'; ctx.beginPath(); ctx.arc(x + 20, top + 2, 3, 0, 7); ctx.fill();
      ctx.restore();
    }
    for (const k of S.crush) {   // the crushers
      const h = 38 + k.ext * span, warn = k.st === 'warn', jx = warn ? rand(-2, 2) : 0, x = k.x + jx, w = k.w;
      ctx.save(); ctx.lineJoin = 'round';
      ctx.fillStyle = '#4a4552'; ctx.fillRect(x + w / 2 - 9, top, 18, h - 38); ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.strokeRect(x + w / 2 - 9, top, 18, h - 38);
      rr(x + 2, top + h - 38, w - 4, 26, 3); inked(warn && Math.sin(Game.time * 30) > 0 ? '#ff6a4a' : '#6b6f7a', 3);
      for (let s = 0; s < 4; s++) { ctx.fillStyle = s % 2 ? INK : GOLD; ctx.fillRect(x + 8 + s * (w - 16) / 4, top + h - 34, (w - 16) / 4, 6); }
      ctx.fillStyle = '#d9cfbd'; ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
      for (let s = 0; s < 4; s++) { const sx = x + 12 + s * (w - 24) / 3; ctx.beginPath(); ctx.moveTo(sx - 7, top + h - 12); ctx.lineTo(sx, top + h); ctx.lineTo(sx + 7, top + h - 12); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      ctx.restore();
    }
  },
});

/* =========================================================
   2 · THE FOUNDRY CONVEYOR RUN (Zone 4): drop down the Furnace Shaft,
   then climb back up over fuse crates and conveyors while the slag
   rises. Rockets fly out of the wall: bat them up into the grates.
   ========================================================= */
const RUN_TIERS = [{ y: 61 * TILE, lo: 58, hi: 64, grate: 'gx_g1' }, { y: 40 * TILE, lo: 38, hi: 46, grate: 'gx_g2' }];
Gaunt.add({
  id: 'run', page: 'z2', room: 'f_run',
  S: { on: false, slag: 88 * TILE, recede: false, fire: [0, 0], hint: false, burnT: 0 },
  boot() { if (gx().cleared.run) this.openGrates(); else fill(837, 58, 2, 1, 0); },
  openGrates() { fill(801, 58, 38, 1, 0); fill(809, 38, 30, 1, 0); },
  shutGrates() { fill(801, 58, 38, 1, 1); fill(837, 58, 2, 1, 0); fill(809, 38, 30, 1, 1); },
  enter(r) {
    if (r.id !== 'f_run') return;
    Gaunt.found('run');
    // no Bat-Launch yet: the way down stays shut, so nobody drops into a climb they can't finish
    if (!gx().cleared.run && !this.S.on) {
      fill(837, 58, 2, 1, ABIL.launch ? 0 : 1);
      if (!ABIL.launch) setTimeout(() => toast('A LONG WAY DOWN, AND A LONGER WAY BACK UP · YOU\'LL NEED A BAT-LAUNCH (JOSH)'), 600);
    }
    for (const [tx, ty] of [[820, 34], [811, 30.5], [828, 31]]) NPCs.push(new GRing(tx * TILE + 16, ty * TILE + 16));
    if (gx().cleared.run) this.prizes();
  },
  update(dt) {
    const D = Save.data, g = gx(), S = this.S, P = Player, c = P.center(), feet = P.y + P.h, id = Zone.room.id;
    if (id === 'f_fuse' && !D.walls.f_run && !S.hint && Math.abs(c.x - 797 * TILE) < 4 * TILE && Math.abs(feet - 42 * TILE) < 8) {
      S.hint = true; Gaunt.found('run');
      toast(D.up.boom ? 'HOT AIR HISSES THROUGH THE CRACKED BACK WALL · EXPLOSIVE BASEBALL?' : 'HOT AIR HISSES THROUGH A CRACKED WALL · IT WOULD TAKE EXPLOSIVES');
    }
    if (id !== 'f_run') return;
    if (S.recede) { S.slag += dt * 260; if (S.slag > 90 * TILE) { S.recede = false; S.slag = 88 * TILE; } }
    if (!S.on && !g.cleared.run && !P.dead && c.y > 66 * TILE) this.start();
    if (!S.on) return;
    // the slag creeps up, a little faster the higher it gets
    const k = clamp((88 * TILE - S.slag) / (60 * TILE), 0, 1);
    S.slag = Math.max(29 * TILE, S.slag - (34 + 18 * k) * dt);
    S.burnT = Math.max(0, S.burnT - dt);
    if (!P.dead && !P.hazard && feet > S.slag + 4) {
      P.hurt(0); P.vy = Math.min(P.vy, -820); P.launched = false; P.jumping = false;
      if (S.burnT <= 0) { S.burnT = 0.5; SFX.fuse(); burst(c.x, S.slag, 16, { colors: [EMBER, GOLD, FLAME], maxSpeed: 380, angle: -Math.PI / 2, spread: 0.9 }); pop(c.x, P.y - 20, 'HOT HOT HOT!', { size: 30, color: EMBER }); }
    }
    // the wall launchers only fire on the tier you're standing on, while its grate is shut
    RUN_TIERS.forEach((T2, i) => {
      if (!Breakables.some(b => b.id === T2.grate && !b.broken)) return;
      if (feet < T2.lo * TILE || feet > T2.hi * TILE) { S.fire[i] = Math.max(S.fire[i], 1.1); return; }
      S.fire[i] -= dt;
      if (S.fire[i] <= 0) { S.fire[i] = 2.6; Bolts.push(new GRocket(838 * TILE - 6, T2.y, -1)); SFX.rocket(); }
    });
    // made it to the top of the furnace
    if (P.onGround && Math.abs(feet - 28 * TILE) < 2 && P.x > 812 * TILE - 4 && P.x + P.w < 828 * TILE + 4) this.win();
  },
  start() {
    const S = this.S;
    Object.assign(S, { on: true, slag: 88 * TILE, recede: false, fire: [1.6, 1.6], burnT: 0 });
    fill(837, 58, 2, 1, 1); markUnsafe(837, 58, 2, 1); fill(800, 37, 1, 5, 1);
    const grate = (tx, ty, w, id) => Breakables.push({ x: tx * TILE, y: ty * TILE, w: w * TILE, h: TILE, id, onBreak: () => {
      fill(tx, ty, w, 1, 0);
      burst((tx + w / 2) * TILE, (ty + 0.5) * TILE, 34, { colors: ['#6b6f7a', '#3a3340', EMBER], maxSpeed: 520, grav: 1300, type: 'debris' });
      pop((tx + w / 2) * TILE, ty * TILE - 10, 'GRATE BLOWN!', { size: 38, color: GOLD }); toast('THE GRATE IS GONE · KEEP CLIMBING');
    } });
    grate(801, 58, 38, 'gx_g1'); grate(809, 38, 30, 'gx_g2');
    Gaunt.start(this); SFX.gate(); addShake(8);
    toast('THE GRATE SLAMS SHUT · THE SLAG IS RISING · BAT THE ROCKETS UP INTO THE GRATES!');
  },
  win() {
    const S = this.S, g = gx();
    S.on = false; S.recede = true; fill(800, 37, 1, 5, 0);
    for (const b of Bolts) if (b instanceof GRocket) b.dead = true;
    g.cleared.run = 1; this.openGrates(); saveGame(); Gaunt.stop();
    SFX.confetti(); Story.impact(Player.x + Player.w / 2, Player.y + Player.h, EMBER);
    pop(Player.x + Player.w / 2, Player.y - 50, 'OUT OF THE FIRE!', { size: 46, color: GOLD });
    toast('THE FOUNDRY CONVEYOR RUN · CLEARED · THE SLAG IS DRAINING');
    this.prizes();
  },
  prizes() {
    const g = gx();
    if (!g.pyro) NPCs.push(new GChest(GX_T(824, 28).x, 28 * TILE, () => {
      g.pyro = 1; gxBadge('pyro'); saveGame();
      showCard('GAUNTLET PRIZE', 'PYRO-CORE CHARM', 'A charm that still smells like the furnace. The third hit of every combo now bursts into a ring of flame that scorches everything around the bat.', ['3rd combo hit · flame burst']);
    }));
    NPCs.push(new GPost(GX_T(814, 28).x, 28 * TILE, { look: 'pad', label: 'BACK TO THE FUSE TOWER', go: () => gxWarp(GX_T(796, 42), 'f_fuse', -1) }));
  },
  abort() {
    const S = this.S;
    S.on = false; S.recede = false; S.slag = 88 * TILE; fill(800, 37, 1, 5, 0);
    if (!gx().cleared.run) this.shutGrates();
  },
  banner() { const k = clamp(Math.round((Player.y + Player.h - this.S.slag) / -TILE), 0, 99); return `THE FOUNDRY CONVEYOR RUN · SLAG ${k} TILES BELOW`; },
  draw_back() {
    if (Zone.room.id !== 'f_run') return;
    const S = this.S, g = gx(), t = Game.time;
    if (!S.on && !g.cleared.run) {   // the way down
      ctx.save(); ctx.font = `20px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = `rgba(255,170,90,${0.5 + Math.sin(t * 5) * 0.3})`;
      ctx.fillText('▼', 838 * TILE, 57 * TILE + Math.sin(t * 4) * 4); ctx.restore();
    }
    RUN_TIERS.forEach((T2, i) => {   // launcher ports on the right wall
      const live = S.on && Breakables.some(b => b.id === T2.grate && !b.broken), hot = live && S.fire[i] < 0.7;
      ctx.save(); rr(839 * TILE - 12, T2.y - 14, 14, 28, 3); inked('#3a3340', 2.5);
      ctx.fillStyle = hot && Math.sin(t * 30) > 0 ? '#ffffff' : live ? FLAME : '#4a2a20'; ctx.beginPath(); ctx.arc(839 * TILE - 8, T2.y, 5, 0, 7); ctx.fill();
      ctx.restore();
    });
  },
  draw_front() {
    if (Zone.room.id !== 'f_run') return;
    const S = this.S, y = S.slag, t = Game.time, x0 = 800 * TILE, x1 = 840 * TILE, bot = 88 * TILE;
    if (y >= bot) return;
    ctx.save();
    const glow = ctx.createLinearGradient(0, y - 120, 0, y); glow.addColorStop(0, 'rgba(255,110,30,0)'); glow.addColorStop(1, 'rgba(255,110,30,.4)');
    ctx.fillStyle = glow; ctx.fillRect(x0, y - 120, x1 - x0, 120);
    ctx.beginPath(); ctx.moveTo(x0, bot);
    for (let x = x0; x <= x1; x += 16) ctx.lineTo(x, y + Math.sin(t * 3 + x * 0.05) * 4);
    ctx.lineTo(x1, bot); ctx.closePath();
    const lg = ctx.createLinearGradient(0, y, 0, y + 200); lg.addColorStop(0, '#ffd27a'); lg.addColorStop(0.25, '#ff6a1a'); lg.addColorStop(1, '#6a1408');
    ctx.fillStyle = lg; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
    for (let k = 0; k < 14; k++) { const bx = x0 + ((k * 97 + t * 40) % (x1 - x0)), by = y + 10 + Math.sin(t * 4 + k) * 3; ctx.fillStyle = 'rgba(255,240,180,.85)'; ctx.beginPath(); ctx.arc(bx, by, 2 + (k % 3), 0, 7); ctx.fill(); }
    if (Math.random() < 0.4) spawnParticle({ x: x0 + rand(0, x1 - x0), y: y + 4, vx: rand(-20, 20), vy: rand(-260, -100), life: rand(0.5, 0.9), size: rand(2, 3.5), color: Math.random() < 0.5 ? EMBER : GOLD, grav: 300, type: 'dot' });
    ctx.restore();
  },
});

/* =========================================================
   4 · THE LASER TURBINE SHAFT (Zone 3): under the Turbine Hall
   floor. A Static Dash laser, a spiky chute, sweeping lasers,
   then an updraft through three turbine blades to the alcove.
   ========================================================= */
Gaunt.add({
  id: 'shaft', page: 'z2', room: 'v_shaft',
  S: { t: 0, movers: [], hint: false },
  enter(r) {
    if (r.id !== 'v_shaft') return;
    const S = this.S; S.t = 0;
    Gaunt.found('shaft');
    S.movers = [{ base: 657, amp: 4, sp: 1.3, ph: 0 }, { base: 665, amp: 4, sp: 1.7, ph: 2.2 }].map(m => Object.assign(laserRect(m.base, 81, 5), { m }));
    for (const L of S.movers) Lasers.push(L);
    // a service ladder by the hatch: always a way back up (you can blow the hatch long before Static Dash)
    NPCs.push(new GPost(GX_T(655, 51).x, 51 * TILE, { look: 'lift', label: 'CLIMB BACK UP', go: () => gxWarp(GX_T(656, 42), 'v_turbine', -1) }));
    if (!Save.data.up.staticDash) setTimeout(() => toast('RED LASERS AHEAD · NOTHING GETS THROUGH THOSE… YET'), 600);
    if (gx().cleared.shaft) this.prizes();
  },
  update(dt) {
    const D = Save.data, g = gx(), S = this.S, P = Player, c = P.center(), feet = P.y + P.h, id = Zone.room.id;
    if (id === 'v_turbine' && !D.walls.v_shaft && !S.hint && Math.abs(c.x - 660.5 * TILE) < 3 * TILE && Math.abs(feet - 42 * TILE) < 8) {
      S.hint = true; Gaunt.found('shaft');
      toast(D.up.boom ? 'THE FLOOR BEHIND THE FANS SOUNDS HOLLOW · EXPLOSIVE BASEBALL?' : 'THE FLOOR BEHIND THE FANS SOUNDS HOLLOW…');
    }
    if (id !== 'v_shaft') return;
    S.t += dt;
    for (const L of S.movers) L.x = (L.m.base + Math.sin(S.t * L.m.sp + L.m.ph) * L.m.amp) * TILE + 11;
    if (!g.cleared.shaft && P.onGround && !P.dead && Math.abs(feet - 51 * TILE) < 2 && c.x < 652 * TILE) this.clear();
  },
  clear() {
    gx().cleared.shaft = 1; saveGame();
    SFX.confetti(); SFX.unlock(); Story.impact(Player.x + Player.w / 2, Player.y + Player.h, '#6fd3ff');
    pop(Player.x + Player.w / 2, Player.y - 50, 'SHAFT CLEARED!', { size: 46, color: '#9fe6ff', burstColor: '#2a4a66' });
    toast('THE LASER TURBINE SHAFT · CLEARED');
    this.prizes();
  },
  prizes() {
    const g = gx(), q = Save.data.q;
    if (!g.turbo) NPCs.push(new GChest(GX_T(646, 51).x, 51 * TILE, () => {
      g.turbo = 1; applyUpgrades(); saveGame();
      showCard('GAUNTLET PRIZE', 'RENAS\'S TURBO WHEELS', 'Renas "lost" these in a vent and is definitely going to want them back. They bolt onto your cleats: you run 10% faster and every dash carries 25% further.', ['+10% run speed', '+25% dash distance']);
    }));
    if (q.rivalry === 'active' && (q.caps || 0) < 5 && !g.capTaken) NPCs.push(new QItem('cap', GX_T(648, 51).x, 50 * TILE, 'gx_cap'));
    NPCs.push(new GPost(GX_T(650, 51).x, 51 * TILE, { look: 'pad', reach: 24, label: 'BACK UP TO THE TURBINE HALL', go: () => gxWarp(GX_T(655, 42), 'v_turbine', -1) }));
  },
});

/* =========================================================
   3 · THE CRYSTAL ZERO-G TRIAL (Zone 6): drop through the crack
   in the Geode Mouth, Static Dash through three lasers, then
   fight four waves over a floor made of crystal spikes.
   ========================================================= */
const ZG_PEB = ['g2', 'g4', 'g5', 'g6', 'g8'];
const ZG_WAVES = [['w', 'w', 'w'], ['w', 'w', 'c', 'c'], ['w', 'w', 'w', 'c', 'c'], ['w', 'w', 'w', 'w', 'c', 'c', 'c']];
const ZG_WISP = [[14, 72], [34, 71], [48, 79], [63, 74], [24, 82], [40, 69], [56, 70], [10, 77]];
const ZG_CRAB = [[10, 81], [28, 77], [44, 75], [60, 80]];
Gaunt.add({
  id: 'zerog', page: 'z5', room: 'g_trial',
  S: { on: false, wave: 0, gap: 0, q: [], qt: 0, crab: 0, hint: false },
  enter(r) {
    if (r.id !== 'g_trial') return;
    Gaunt.found('zerog');
    if (!gx().cleared.zerog) for (let i = NPCs.length - 1; i >= 0; i--) if (NPCs[i].kind === 'pebble' && ZG_PEB.includes(NPCs[i].id)) NPCs.splice(i, 1);
    for (const [tx, ty] of [[16, 78], [36, 75], [50, 69], [66, 77], [23, 72]]) Enemies.push(new Orb(tx * TILE + 16, ty * TILE + 16));
    for (const [tx, ty] of [[12, 70], [30, 72], [46, 80], [56, 76], [68, 71]]) NPCs.push(new GRing(tx * TILE + 16, ty * TILE + 16));
    NPCs.push(new GPost(GX_T(92, 74).x, 74 * TILE, { look: 'lift', label: 'CLIMB BACK OUT', lock: () => this.S.on ? 'NOT WHILE THE TRIAL IS RUNNING' : '', go: () => gxWarp(GX_T(87, 65), 'g_mouth', -1) }));
  },
  update(dt) {
    const g = gx(), S = this.S, P = Player, c = P.center(), id = Zone.room.id;
    if (id === 'g_mouth' && !S.hint && Math.abs(c.x - 91.5 * TILE) < 3 * TILE && Math.abs(P.y + P.h - 65 * TILE) < 8) {
      S.hint = true; Gaunt.found('zerog');
      toast(Save.data.up.staticDash ? 'A CRACK IN THE FLOOR · RED LIGHT FLICKERS FAR BELOW' : 'A CRACK IN THE FLOOR · RED LASERS BELOW · NOTHING GETS THROUGH THOSE… YET');
    }
    if (id !== 'g_trial') return;
    if (!S.on && !g.cleared.zerog && !P.dead && P.x + P.w < 76 * TILE - 4) this.start();
    if (S.on) this.waves(dt);
  },
  start() {
    const S = this.S;
    Object.assign(S, { on: true, wave: 0, gap: 1.2, q: [], qt: 0 });
    fill(76, 69, 1, 5, 1);
    Gaunt.start(this); SFX.gate(); SFX.crystal(); addShake(8);
    pop(Player.x + Player.w / 2, Player.y - 40, 'NO FLOOR!', { size: 40, color: '#d9b8ff', burstColor: '#4a2a6a' });
    toast('THE WAY BACK SEALS · FOUR WAVES · RINGS REFILL YOUR BASEBALLS, LANTERNS ARE FOR POGOING');
  },
  waves(dt) {
    const S = this.S;
    if (S.q.length) { S.qt -= dt; if (S.qt <= 0) { S.qt = 0.5; this.spawn(S.q.shift()); } return; }
    if (Enemies.some(e => !e.dead && e.type !== 'orb' && e.type !== 'crate')) return;
    S.gap -= dt; if (S.gap > 0) return;
    if (S.wave >= ZG_WAVES.length) { this.win(); return; }
    S.q = ZG_WAVES[S.wave].slice(); S.wave++; S.qt = 0.35; S.gap = 1.5;
    SFX.crystal(); pop(Player.x + Player.w / 2, Player.y - 40, S.wave === ZG_WAVES.length ? 'FINAL WAVE!' : `WAVE ${S.wave}`, { size: 40, color: '#d9b8ff', burstColor: '#4a2a6a' });
  },
  spawn(k) {
    const S = this.S, c = Player.center();
    let e;
    if (k === 'c') { const [tx, row] = ZG_CRAB[S.crab++ % ZG_CRAB.length]; const p = GX_T(tx, row); e = new GeodeCrab(p.x, p.y); }
    else {
      const far = ZG_WISP.filter(([tx, ty]) => Math.hypot(tx * TILE - c.x, ty * TILE - c.y) > 220), [tx, ty] = (far.length ? far : ZG_WISP)[(Math.random() * (far.length || ZG_WISP.length)) | 0];
      e = new CrystalWisp(tx * TILE + 16, ty * TILE + 16);
    }
    Enemies.push(e);
    burst(e.x + e.w / 2, e.y + e.h / 2, 14, { colors: ['#d9b8ff', '#9be3c8', BONE], maxSpeed: 320 }); SFX.blip();
  },
  win() {
    const S = this.S, g = gx(), D = Save.data;
    S.on = false; fill(76, 69, 1, 5, 0);
    g.cleared.zerog = 1; g.ace = 1; gxBadge('ace'); saveGame(); Gaunt.stop();
    SFX.confetti(); SFX.unlock(); Story.impact(Player.x + Player.w / 2, Player.y + Player.h / 2, '#d9b8ff');
    pop(Player.x + Player.w / 2, Player.y - 50, 'TRIAL CLEARED!', { size: 46, color: '#d9b8ff', burstColor: '#4a2a6a' });
    for (const p of PEBBLES) if (ZG_PEB.includes(p.id) && !D.pebbles[p.id]) { NPCs.push(new LuckyPebble(p.x, p.y, p.id)); burst(p.x, p.y - 12, 10, { colors: ['#9be36a', GOLD], maxSpeed: 240 }); }
    showCard('GAUNTLET PRIZE', 'AIR-ACE BADGE', 'Out of baseballs in mid-air? Hang on for a beat and a fresh one recharges, so you can chain Bat-Launches without touching the ground. Five Lucky Pebbles just tumbled onto the last ledge, too.', ['mid-air baseball recharge · 0.9s']);
  },
  abort() { const S = this.S; S.on = false; S.q = []; fill(76, 69, 1, 5, 0); },
  banner() { return `THE CRYSTAL ZERO-G TRIAL · WAVE ${Math.max(1, this.S.wave)} / ${ZG_WAVES.length}`; },
});

/* =========================================================
   5 · THE CHAMPIONSHIP COLOSSEUM (Zone 9): Coach Monfort guards a VIP
   lift in the Grand Locker Room. Three cups, two bosses each,
   back to back, every one of them faster and tougher than before.
   ========================================================= */
const COLO_CUPS = {
  bronze: { key: 'bronze', name: 'BRONZE CUP', color: '#d08a4a', list: ['daniel', 'fionn'] },
  silver: { key: 'silver', name: 'SILVER CUP', color: '#c9ccd4', list: ['milo', 'deniz'] },
  gold:   { key: 'gold',   name: 'GOLD CUP',   color: GOLD,      list: ['adam', 'shadow'] },
};
const COLO_ORDER = ['bronze', 'silver', 'gold'];
// Evil Adam's leftover shadow: phase one moves only, no phase changes, and it can actually be finished off
let ShadowAdam = null;
if (PAGE.id === 'z9' && typeof EvilAdam !== 'undefined') ShadowAdam = class extends EvilAdam {
  constructor() { super(); const p = GX_T(300, 41); this.ph = 1.5; this.hp = this.maxHp = 70; this.bolts = 0; this.x = p.x - this.w / 2; this.y = p.y - this.h; this.plan = ['serve', 'dash', 'shock', 'serve', 'dash', 'shock']; }
  arena() { return ROOM.t_colo.px; }
  pick() {
    const P = Player, cx = this.x + this.w / 2, a = this.plan[this.step++ % this.plan.length];
    this.facing = sgn(P.x + P.w / 2 - cx) || this.facing;
    if (a === 'serve') { this.state = 'serveUp'; this.vy = -960; this.vx = -this.facing * 120; this.pose = 'air'; SFX.jump(); }
    if (a === 'dash') { this.state = 'dashWind'; this.t = 0.42; this.pose = 'dash'; SFX.windup(); }
    if (a === 'shock') { this.state = 'shock'; this.t = 0.6; SFX.slamWarn(); }
  }
  damage(d) {
    if (this.state === 'beaten') return;
    this.hp = Math.max(0, this.hp - d); this.flash = 0.1; BossBar.set(this.hp / this.maxHp);
    if (this.hp <= 0) { this.state = 'beaten'; this.harmful = false; this.pose = 'kneel'; FX.length = 0; for (const b of Bolts) b.dead = true; Story.evilAdamDefeat(this); }
  }
  draw() { ctx.save(); ctx.globalAlpha = 0.78; super.draw(); ctx.restore(); }
};
const COLO = Gaunt.add({
  id: 'colo', page: 'z9', room: 't_colo', F: null,
  boot() {
    // the old bosses read their arena from these rooms: on this page they all fight in the Colosseum
    for (const k of ['q_elevator', 'f_core', 'g_pedestal', 's_fountain', 'i_throne']) if (!ROOM[k]) ROOM[k] = ROOM.t_colo;
    if (typeof RODS === 'undefined') window.RODS = [];
    for (const k of ['adamDefeat', 'danielFinale', 'fionnDefeat', 'miloDefeat', 'denizDefeat', 'evilAdamDefeat']) {
      const o = Story[k];
      Story[k] = function (b) { if (COLO.down(b)) return; if (o) return o.call(this, b); };
    }
  },
  enter(r) {
    const g = gx();
    if (r.id === 't_locker') {
      const v = spotNear(282, 20);
      NPCs.push(new QNPC('vance', v.x, v.y, { prompt: g.coloOpen ? 'VIP' : 'TALK', fixed: true, facing: 1, onTalk: n => Story.coloTalk(n) }));
      NPCs.push(new GPost(GX_T(286, 20).x, 20 * TILE, { look: 'lift', label: 'VIP LIFT · THE COLOSSEUM', lockLabel: 'VIP LIFT · LOCKED',
        lock: () => g.coloOpen ? '' : 'VIP ONLY · COACH MONFORT HAS THE KEY', go: () => gxWarp(GX_T(246, 41), 't_colo', 1) }));
    }
    if (r.id !== 't_colo') return;
    Gaunt.found('colo');
    NPCs.push(new GPost(GX_T(243, 41).x, 41 * TILE, { look: 'pad', label: 'BACK UP TO THE LOCKER ROOM', lock: () => this.F ? 'FINISH THE CUP FIRST' : '', go: () => gxWarp(GX_T(286, 20), 't_locker', -1) }));
    COLO_ORDER.forEach((k, i) => {
      const C = COLO_CUPS[k], prev = COLO_ORDER[i - 1];
      NPCs.push(new GPost(GX_T(250 + i * 6, 41).x, 41 * TILE, { look: 'cup', title: C.name, color: C.color, reach: 26,
        label: g.cups[k] ? 'REMATCH · ' + C.name : 'COMPETE · ' + C.name, lockLabel: 'LOCKED',
        done: () => !!g.cups[k],
        lock: () => this.F ? 'A CUP IS ALREADY UNDER WAY' : prev && !g.cups[prev] ? `WIN THE ${COLO_CUPS[prev].name} FIRST` : '',
        go: () => this.start(C) }));
    });
  },
  start(C) {
    if (this.F || Story.active) return;
    const P = Player;
    this.F = { cup: C, i: 0, st: 'next', t: 1.4, boss: null };
    Gaunt.start(this);
    P.hp = P.maxHp; HUD.hpPop = true; Game.flashWhite = 0.3;
    SFX.bell(); SFX.crowd(1.6);
    pop(P.x + P.w / 2, P.y - 40, C.name + '!', { size: 44, color: C.color });
    toast(`${C.name} · TWO ROUNDS, BACK TO BACK · NO BENCHES`);
  },
  spawn(k) {
    const F = this.F, P = Player;
    const place = (name, b, hpK, sp) => {
      if (hpK !== 1) { b.hp *= hpK; b.maxHp *= hpK; }
      const raw = b.update; b.update = function (dt) { return raw.call(this, dt * (/Wind|Hold|Warn|warn|Aim|aim/.test(this.state || "") ? 1 : sp)); };   // faster, but windups stay readable
      F.boss = b; Zone.boss = b; Enemies.push(b); BossBar.show(name);
      F.st = 'intro'; F.t = 1.3;
    };
    if (k === 'daniel') { Object.assign(A, { daniel: GX_T(314, 34), cannonMouth: { x: 309 * TILE, y: 32.6 * TILE }, danielFloor: GX_T(304, 41) }); place('DANIEL · TURBO-CHARGED', new Daniel(), 1, 1.2); }
    if (k === 'fionn') { A.fionn = GX_T(300, 41); place('FIONN · STRATA MAX', new Fionn(), 1.3, 1.15); }
    if (k === 'milo') { A.milo = { x: 285 * TILE, y: 29 * TILE }; place('MILO · FULL STORM', new Milo(), 1.3, 1.15); }
    if (k === 'deniz') { A.denizSeat = GX_T(311, 34); A.denizFloor = GX_T(300, 41); place('KING DENIZ · CROWN ON', new Deniz(), 1.3, 1.15); }
    if (k === 'adam') { const p = GX_T(300, 41); place('ADAM · CHAMPIONSHIP SPEED', new Adam(p.x, p.y), 1.6, 1.35); }
    if (k === 'shadow') place('SHADOW EVIL ADAM · THE LAST SET', new ShadowAdam(), 1, 1.1);
    burst(300 * TILE, 38 * TILE, 30, { colors: [F.cup.color, BONE, GOLD], maxSpeed: 480 }); SFX.summon(); addShake(8);
    P.facing = 1;
  },
  // a boss just went down (called instead of its usual defeat scene)
  down(b) {
    const F = this.F;
    if (!F || F.boss !== b) return false;
    F.st = 'down'; F.t = 1.6;
    FX.length = 0; Hazards.length = 0; for (const x of Bolts) x.dead = true;
    BossBar.set(0); SFX.bossDie(); SFX.crowd(1.4); addShake(12);
    pop(b.x + b.w / 2, b.y - 40, 'K.O.!', { size: 60, color: F.cup.color, burstColor: FLAME });
    return true;
  },
  update(dt) {
    const F = this.F, P = Player;
    if (!F || Zone.room.id !== 't_colo') return;
    F.t -= dt;
    if (F.st === 'next' && F.t <= 0) this.spawn(F.cup.list[F.i]);
    else if (F.st === 'intro' && F.t <= 0) { F.st = 'fight'; F.boss.begin(); }
    else if (F.st === 'down' && F.t <= 0) {
      const b = F.boss; Zone.boss = null; b.dead = true; F.boss = null; BossBar.hide(); SFX.poof();
      burst(b.x + b.w / 2, b.y + b.h / 2, 30, { colors: ['#1a1420', F.cup.color, BONE], type: 'puff', maxSpeed: 300, minSize: 6, maxSize: 14, maxLife: 0.8, drag: 2 });
      F.i++;
      if (F.i >= F.cup.list.length) this.won();
      else { F.st = 'next'; F.t = 1.6; P.hp = Math.min(P.maxHp, P.hp + 1); HUD.hpPop = true; pop(P.x + P.w / 2, P.y - 30, '+1 HP · NEXT ROUND!', { size: 30, color: '#9be36a' }); }
    }
  },
  won() {
    const F = this.F, C = F.cup, g = gx(), P = Player, first = !g.cups[C.key];
    this.F = null; Gaunt.stop();
    g.cups[C.key] = 1; if (g.cups.gold && g.cups.silver && g.cups.bronze) g.cleared.colo = 1;
    if (C.key === 'bronze') g.hype = 1;
    if (C.key === 'silver') g.hp = 1;
    if (C.key === 'gold') { g.crown = 1; gxBadge('crown'); }
    applyUpgrades(); P.hp = P.maxHp; HUD.hpPop = true; saveGame();
    SFX.confetti(); SFX.crowd(2); Story.impact(P.x + P.w / 2, P.y + P.h, C.color);
    pop(P.x + P.w / 2, P.y - 50, C.name + ' WON!', { size: 50, color: C.color, burstColor: FLAME });
    if (!first) { toast(`${C.name} · WON AGAIN · THE CROWD GOES WILD`); return; }
    if (C.key === 'bronze') showCard('BRONZE CUP', '+1 HYPE SLOT', 'Monfort tapes an extra cell onto your Hype Meter. You can bank one more heal (or one more round of Explosive Baseballs).', ['+33 Hype capacity']);
    if (C.key === 'silver') showCard('SILVER CUP', '+1 MAX HP', 'Monfort hands you a silver-wrapped protein bar. It tastes like a coin. You feel sturdier anyway.', ['+1 max HP']);
    if (C.key === 'gold') showCard('GOLD CUP', 'THE MVP CROWN', 'The Gold Cup comes with a tiny golden crown. Every hit you land builds Hype twice as fast, and you leave a trail of golden sparks wherever you go.', ['double Hype per hit', 'golden flames']);
  },
  abort() { if (!this.F) return; this.F = null; Zone.boss = null; BossBar.hide(); FX.length = 0; },
  banner() { const F = this.F; return `${F.cup.name} · ROUND ${Math.min(F.i + 1, F.cup.list.length)} / ${F.cup.list.length}`; },
  draw_behindTiles() {
    if (Zone.room.id !== 't_colo') return;
    const r = ROOM.t_colo.px, fy = 41 * TILE, t = Game.time;
    ctx.save();
    // the stands and the crowd
    for (let row = 0; row < 3; row++) {
      const y = 25 * TILE + row * 34;
      ctx.fillStyle = ['rgba(90,60,40,.55)', 'rgba(70,46,30,.55)', 'rgba(50,32,22,.55)'][row]; ctx.fillRect(r.x + TILE, y, r.w - 2 * TILE, 30);
      ctx.fillStyle = 'rgba(30,18,12,.6)';
      for (let x = r.x + 2 * TILE + row * 9; x < r.x + r.w - 2 * TILE; x += 22) { const bob = this.F ? Math.abs(Math.sin(t * 7 + x * 0.13 + row)) * 4 : 0; ctx.beginPath(); ctx.arc(x, y + 4 - bob, 7, 0, 7); ctx.fill(); }
    }
    // cup banners
    COLO_ORDER.forEach((k, i) => {
      const x = r.x + 10 * TILE + i * 6 * TILE, C = COLO_CUPS[k], won = gx().cups[k];
      ctx.beginPath(); ctx.moveTo(x - 30, 28 * TILE); ctx.lineTo(x + 30, 28 * TILE); ctx.lineTo(x + 30, 33 * TILE); ctx.lineTo(x, 32 * TILE); ctx.lineTo(x - 30, 33 * TILE); ctx.closePath();
      ctx.fillStyle = won ? C.color : 'rgba(60,40,70,.8)'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.stroke();
    });
    ctx.font = `28px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(242,193,78,.55)'; ctx.fillText('THE CHAMPIONSHIP COLOSSEUM', r.x + r.w / 2 + 8 * TILE, 27 * TILE);
    // the VIP stage
    ctx.fillStyle = 'rgba(242,193,78,.25)'; ctx.fillRect(309 * TILE, 34 * TILE, 10 * TILE, 4);
    ctx.restore();
  },
});
// Coach Monfort at the VIP lift
Story.coloTalk = function (n) {
  return this.run(async () => {
    const D = Save.data, g = gx(), h = () => n.head(), nh = () => this.nathanHead();
    Player.facing = sgn(n.x - Player.x) || 1; this.camTarget = { x: (Player.x + n.x) / 2, y: n.y - 70 }; this.zoomTo(1.3);
    Gaunt.found('colo');
    if (!D.adamAssist && !D.evilAdamDead) {
      await this.say('MONFORT', 'Whoa, whoa. VIP wing. Players and coaches only.', h, VANCE_V);
      await this.say('NATHAN', 'I\'m a player.', nh);
      await this.say('MONFORT', 'You\'re a player with no TEAM. Somebody\'s moping behind that pillar. Go sort that out, then we talk.', h, VANCE_V);
      return;
    }
    if (!g.coloOpen) {
      await this.say('MONFORT', 'There you are! Scouted the whole Spire for a decent sparring floor. Found a colosseum. Under a locker room. Classic.', h, VANCE_V);
      await this.say('MONFORT', 'Three cups. Bronze, Silver, Gold. Two opponents each, back to back, no benches.', h, VANCE_V);
      await this.say('NATHAN', 'Opponents? Who?', nh);
      await this.say('MONFORT', 'Everyone you beat on the way up. I called in some favours and gave \'em protein shakes. Mostly sugar.', h, VANCE_V);
      this.punch(0.06, 5);
      await this.say('MONFORT', 'Lift\'s right behind me. Win a cup and I\'ll hand you something nice. HUSTLE!', h, VANCE_V);
      g.coloOpen = 1; n.prompt = 'VIP'; saveGame();
      toast('THE VIP LIFT IS OPEN');
      return;
    }
    const c = g.cups;
    await this.say('MONFORT', c.gold ? 'Gold Cup and the MVP crown. I\'d cry, but I\'m on the clock. Rematches whenever you like.'
      : c.silver ? 'Two cups down. The Gold Cup\'s nasty: your rival at full speed, then… something worse. HUSTLE!'
      : c.bronze ? 'Bronze in the cabinet! Silver\'s next: the wizard and the king. Bring a coat.'
      : 'Bronze Cup first. The fireworks kid and the rock guy. Don\'t let either of them explain their hobby.', h, VANCE_V);
  });
};

/* =========================================================
   REWARDS · applied on top of everything else
   ========================================================= */
const _gxApply = applyUpgrades;
applyUpgrades = function () {
  const hp0 = Player.hp, max0 = Player.maxHp;
  _gxApply();
  const g = gx(), D = Save.data, extra = g.hp ? 1 : 0;
  if (g.hype) Player.hypeMax += 33;                          // Bronze Cup: one more Hype cell
  if (badgesOn().crown) TUNE.hypePerHit *= 2;                         // MVP Crown: double Hype per hit
  TUNE.dashTime = GX_BASE.dash * (g.turbo ? 1.25 : 1);       // Turbo Wheels: longer dashes
  Player.bonusHp = (D.charms || 0) + extra;                  // Silver Cup: +1 max HP
  const want = 5 + Player.bonusHp;
  if (max0 !== undefined && Player.maxHp !== undefined && Player.maxHp !== want) { Player.maxHp = want; Player.hp = clamp(hp0 + Math.max(0, want - max0), 1, want); }
};
const _gxQTick = Quests.tick;
Quests.tick = function (dt) { _gxQTick.call(this, dt); if (gx().turbo) TUNE.runSpeed *= 1.1; };
const _gxGot = Quests.got;
Quests.got = function (it) { if (it.id === 'gx_cap') { gx().capTaken = 1; saveGame(); } return _gxGot.call(this, it); };
// Pyro-Core Charm: the 3rd hit of a combo bursts into flame
const _gxSwing = Player.startSwing;
Player.startSwing = function (U, D) { _gxSwing.call(this, U, D); if (badgesOn().pyro && this.comboIdx === 3) this.pyroT = 0.07; };
const _gxPU = Player.update;
Player.update = function (dt) {
  _gxPU.call(this, dt);
  if (this.dead || this.hazard) return;
  const g = gx();
  if (this.pyroT > 0) {
    this.pyroT -= dt;
    if (this.pyroT <= 0) { const hb = this.hitbox(); explode(hb.x + hb.w / 2, hb.y + hb.h / 2, 70, 2, { small: true, noBreak: true, word: 'PYRO!', colors: [FLAME, EMBER, GOLD, '#ffd27a'] }); }
  }
  // Air-Ace Badge: a spent baseball recharges after a beat in the air
  if (badgesOn().ace && ABIL.launch && !this.onGround && this.balls < TUNE.ballCount && !Balls.some(b => b.state === 'toss' && !b.dead)) {
    this.aceT = (this.aceT || 0) + dt;
    if (this.aceT >= 0.9) { this.aceT = 0; this.balls++; SFX.blip(); ring(this.x + this.w / 2, this.y + this.h / 2, 6, 34, 0.25, '#9fe6ff', 3); }
  } else this.aceT = 0;
  // MVP Crown: golden flames
  if (badgesOn().crown && Math.random() < 0.3) spawnParticle({ x: this.x + rand(0, this.w), y: this.y + rand(0, this.h), vx: rand(-20, 20), vy: rand(-110, -50), life: rand(0.3, 0.55), size: rand(2, 4), color: Math.random() < 0.6 ? GOLD : '#ffd27a', type: 'dot' });
};

/* ---------- the quest log ---------- */
const _gxEntries = Quests.entries;
Quests.entries = function () {
  const L = _gxEntries.call(this), g = gx(), tick = (txt, ok) => ({ txt, ok: !!ok });
  for (const G of GX_LIST) {
    if (!g.found[G.id] && !g.cleared[G.id]) continue;
    if (G.id === 'colo') {
      const c = g.cups;
      L.push({ title: G.title, who: 'Gauntlet', done: !!c.gold, reward: G.reward,
        steps: [tick('Coach Monfort opens the VIP lift in the Grand Locker Room', g.coloOpen), tick('Bronze Cup · Daniel, then Fionn', c.bronze), tick('Silver Cup · Milo, then King Deniz', c.silver), tick('Gold Cup · Adam, then his shadow', c.gold)] });
      continue;
    }
    L.push({ title: G.title, who: 'Gauntlet', done: !!G.got(g), reward: G.reward,
      steps: [tick('Found: ' + G.where, true), tick(G.goal, g.cleared[G.id]), tick('Claim the prize', G.got(g))] });
  }
  return L;
};

/* ---------- hooks into the page ---------- */
const _gxEnter = enterRoom;
enterRoom = function (r) { if (Gaunt.run && Gaunt.run.room !== r.id) Gaunt.abort(); _gxEnter(r); Gaunt.each('enter', r); };
const _gxUpdate = PAGE.update;
PAGE.update = dt => { if (_gxUpdate) _gxUpdate(dt); Gaunt.each('update', dt); };
const _gxRespawn = PAGE.onRespawn;
PAGE.onRespawn = () => { if (_gxRespawn) _gxRespawn(); Gaunt.abort(); };
const _gxLock = PAGE.lockRoom;
PAGE.lockRoom = () => !!Gaunt.run || !!(_gxLock && _gxLock());
(function wrapHooks() {
  const H = Game.hooks;
  for (const k of ['behindTiles', 'back', 'front', 'top', 'screen']) {
    const o = H[k];
    H[k] = function (cam) {
      if (o) o.call(H, cam);
      Gaunt.each('draw_' + k, cam);
      if (k === 'top' && badgesOn().crown && !Player.dead && !Player.hidden) {   // the MVP Crown
        const x = Player.x + Player.w / 2, y = Player.y - 10 + Math.sin(Game.time * 3) * 1.5;
        ctx.save(); ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(x - 9, y + 4); ctx.lineTo(x - 9, y - 4); ctx.lineTo(x - 4, y); ctx.lineTo(x, y - 7); ctx.lineTo(x + 4, y); ctx.lineTo(x + 9, y - 4); ctx.lineTo(x + 9, y + 4); ctx.closePath(); inked(GOLD, 2); ctx.restore();
      }
      if (k === 'screen') Gaunt.drawBanner();
    };
  }
})();

/* ---------- boot: this page's first room was filled before we loaded ---------- */
Gaunt.each('boot');
applyUpgrades();
if (Zone.room) Gaunt.each('enter', Zone.room);
