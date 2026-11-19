'use strict';
/* =========================================================
   THE CHAMPION'S PENNANT · the float-cloak glider
   · the quest: after the Renas chase, the flying security
     drones in the Ventilation Shafts drop Torn Stadium Banners.
     Bring 3 to Lars at Base Camp; Byte measures, Lars stitches
     them with the fabric off Renas's scooter tarp.
   · hold JUMP while falling (after any jump, double jump or
     Bat-Launch): the pennant billows open above Nathan's head,
     the fall slows to a float and he steers wide in the air.
     Let go and he drops fast again. Dash, pogo and baseballs
     all still work mid-glide.
   · opened inside an updraft, it rockets him up the column,
     far past where the wind alone would carry him
   · new routes (nothing on the old paths needs it): floating
     bolt caches beside the tall updrafts, only reachable by
     riding the draft and gliding off sideways, and the
     Tailwind Stitch badge hidden high in the Gale Gardens
   · Tailwind Stitch: +30% glide speed and one small thermal hop
     per glide (press JUMP again)
   · wearing the Storm Mage Cape, the glider is a starry
     midnight-purple wizard cloak instead
   Loaded on every story page after zone/micro-anims.js.
   ========================================================= */
const PN = { gliding: false, was: false, hop: false, out: 0, caches: null, cacheRoom: null };
const pnQ = () => Save.data.q;
const pnHave = () => !!pnQ().pennant;
const pnTail = () => !!badgesOn().tailwind;
const pnMage = () => typeof outfitNow === 'function' && outfitNow().id === 'mage';

/* ---------- the badge ---------- */
if (typeof LOADOUT !== 'undefined' && !LOADOUT.some(b => b.id === 'tailwind'))
  LOADOUT.push({ id: 'tailwind', name: 'Tailwind Stitch', cost: 1, desc: 'Glide 30% faster, plus one small thermal hop per glide (press JUMP again).', from: 'A secret alcove high in the Gale Gardens (Storm Atrium)' });

/* ---------- Torn Stadium Banners from the Ventilation Shaft drones ---------- */
class BannerScrap {
  constructor(x, y) { Object.assign(this, { kind: 'banner', x, y, vy: -200, fall: true, t: rand(0, 6), gone: false }); }
  update(dt) {
    this.t += dt;
    if (this.fall) {
      this.vy = Math.min(this.vy + 1200 * dt, 700); this.y += this.vy * dt;
      if (pointSolid(this.x, this.y)) { this.y = Math.floor(this.y / TILE) * TILE; this.fall = false; }
      if (this.y > LH * TILE) { this.gone = true; PN.out = Math.max(0, PN.out - 1); }
    }
    const c = Player.center();
    if (!Player.dead && !Story.active && Math.hypot(c.x - this.x, c.y - (this.y - 14)) < 34) {
      this.gone = true; PN.out = Math.max(0, PN.out - 1);
      const q = pnQ(); q.banners = Math.min(3, (q.banners || 0) + 1); saveGame();
      SFX.coin(); SFX.paper && SFX.paper(); burst(this.x, this.y - 14, 14, { colors: ['#e8361c', GOLD, BONE], maxSpeed: 300 });
      pop(this.x, this.y - 40, 'TORN BANNER!', { size: 26, color: GOLD });
      toast(q.banners >= 3 ? 'TORN STADIUM BANNERS 3/3 · LARS COULD STITCH SOMETHING FROM THESE (BASE CAMP)' : `TORN STADIUM BANNER · ${q.banners} / 3`);
    }
  }
  draw() {
    const x = this.x, y = this.y - 14 + Math.sin(this.t * 2.6) * 3;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 0, x, y, 30); g.addColorStop(0, 'rgba(242,193,78,.45)'); g.addColorStop(1, 'rgba(242,193,78,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 30, y - 30, 60, 60); ctx.restore();
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(this.t * 2) * 0.15); ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-12, -9); ctx.lineTo(14, -6); ctx.lineTo(9, -1); ctx.lineTo(13, 3); ctx.lineTo(-12, 9); ctx.closePath(); inked('#e8361c', 2);
    ctx.strokeStyle = GOLD; ctx.lineWidth = 1.2; ctx.setLineDash([2, 2]); ctx.beginPath(); ctx.moveTo(-10, -6); ctx.lineTo(10, -4); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = GOLD; ctx.font = `8px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillText('★', -2, 3);
    ctx.restore();
  }
}
const _pnDie = onEnemyDie;
onEnemyDie = function (e) {
  _pnDie(e);
  const q = pnQ(), r = Zone.room;
  if (!Save.data.chase || q.pennant || !r || typeof StrayDrone === 'undefined' || !(e instanceof StrayDrone)) return;
  if (QZ(r) !== 'z3' || (q.banners || 0) + PN.out >= 3) return;
  PN.out++; NPCs.push(new BannerScrap(e.x + e.w / 2, e.y + e.h / 2));
  if (!q.bannerHint) { q.bannerHint = 1; saveGame(); setTimeout(() => toast('A TORN STADIUM BANNER FLUTTERS DOWN · GRAB IT'), 300); }
};

/* ---------- Lars (with Byte) stitches the pennant ---------- */
if (typeof openShop === 'function') {
  const _pnShop = openShop;
  openShop = function (v) {
    const q = pnQ();
    if (v !== 'lars' || q.pennant || (q.banners || 0) < 3 || Story.active) return _pnShop.apply(this, arguments);
    const lars = NPCs.find(n => n.kind === 'lars'), lh = () => lars ? lars.head() : Story.nathanHead(), nh = () => Story.nathanHead();
    Story.run(async () => {
      if (lars) Story.twoShot(Player, lars, 1.25);
      await Story.say('LARS', 'Three old championship banners? Torn to ribbons. Beautiful. Hold still.', lh, { voice: 0.8 });
      await Story.say('BYTE', 'Measuring wingspan… Nathan: 1.4 metres. Ego: off the chart. Adjusting fabric.', lh, { voice: 1.9 });
      SFX.anvil(); Story.punch && Story.punch(0.05, 4);
      await Story.say('LARS', 'Banner up top. And a strip of the old bus tarp underneath. Wind-proof. Don\'t tell Renas.', lh, { voice: 0.8 });
      SFX.paper && SFX.paper(); burst(Player.x + Player.w / 2, Player.y + 10, 24, { colors: ['#e8361c', GOLD, BONE], maxSpeed: 260 });
      await Story.say('NATHAN', 'A cape? …A CHAMPIONSHIP cape. Oh, this is going in the highlight reel.', nh);
      await Story.say('LARS', 'Hold JUMP when you fall. It\'ll catch the air. Updrafts will throw you to the roof.', lh, { voice: 0.8 });
    }).then(() => {
      q.pennant = 1; saveGame();
      showCard('NEW ABILITY', 'THE CHAMPION\'S PENNANT', 'Hold JUMP while falling to glide. Steer wide in the air, let go to drop. Open it inside an updraft to ride the column up fast.', ['HOLD ' + Bindings.label('jump', Game.lastInput) + ' · GLIDE']);
    });
  };
}
// the quest log
if (typeof Quests !== 'undefined' && Quests.entries) {
  const _pnEntries = Quests.entries;
  Quests.entries = function () {
    const L = _pnEntries.apply(this, arguments), q = pnQ();
    if (q.pennant || q.bannerHint) {
      const n = q.pennant ? 3 : Math.min(3, q.banners || 0), tick = (txt, ok) => ({ txt, ok: !!ok });
      L.push({ title: 'The Champion\'s Pennant', who: 'Lars & Byte', done: !!q.pennant,
        steps: [tick(`Torn Stadium Banners from the Ventilation Shaft drones (${n}/3)`, n >= 3), tick('Bring them to Lars at Base Camp', q.pennant)],
        reward: 'The Champion\'s Pennant: hold JUMP while falling to glide' });
    }
    return L;
  };
}

/* ---------- the glide ---------- */
(function () {
  const P = Player, U0 = P.update;
  P.update = function (dt) {
    const r = U0.call(this, dt);
    const busy = this.dead || this.hidden || this.dashT > 0 || this.sliding || this.healT > 0 || this.onGround || this.sit > 0.01 || this.hazard || !Input.enabled;
    const want = pnHave() && !busy && Input.down('jump') && (this.vy > 0 || PN.gliding);
    PN.was = PN.gliding; PN.gliding = want;
    if (this.onGround) PN.hop = false;
    if (!want) return r;
    if (!PN.was) { SFX.paper && SFX.paper(); SFX.whoosh && SFX.whoosh(); this.sx = 1.12; this.sy = 0.9; }   // the crisp fabric snap
    // in an updraft: ride it up fast
    let draft = false;
    if (typeof UPDRAFTS !== 'undefined') for (const u of UPDRAFTS) {
      if (u.room && Zone.room && u.room !== Zone.room.id) continue;
      if (overlap(this, u)) { draft = true; break; }
    }
    if (draft) { this.vy = Math.max(this.vy - 5200 * dt, -820); if (Math.random() < 0.5) spawnParticle({ x: this.x + rand(0, this.w), y: this.y + this.h, vx: rand(-20, 20), vy: rand(120, 260), life: 0.4, size: 2, color: '#d9f2ff', type: 'dot' }); }
    else this.vy = Math.min(this.vy, 120);                                   // ~a fifth of the normal fall
    // wide steering in the air
    const ix = (Input.down('right') ? 1 : 0) - (Input.down('left') ? 1 : 0), top = TUNE.runSpeed * (pnTail() ? 1.3 : 1.05);
    if (ix) { this.vx = approach(this.vx, ix * top, TUNE.airAccel * 1.6 * dt); this.facing = ix; }
    // Tailwind Stitch: one small thermal hop per glide
    if (pnTail() && !PN.hop && Input.pressed('jump') && !this.canDouble) { PN.hop = true; this.vy = -380; SFX.djump(); ring(this.x + this.w / 2, this.y + 6, 6, 40, 0.3, GOLD, 3); }
    // red-and-gold wind ribbons
    if (Math.random() < 0.6) spawnParticle({ x: this.x + this.w / 2 - this.facing * rand(16, 40), y: this.y - rand(20, 40), vx: -this.facing * rand(40, 120) - this.vx * 0.2, vy: rand(-20, 20), life: 0.5, size: rand(1.5, 3), color: pnMage() ? (Math.random() < 0.5 ? '#b98bff' : '#ffffff') : Math.random() < 0.5 ? '#e8361c' : GOLD, type: 'dot' });
    return r;
  };
})();
function pnDrawGlider(P) {
  const px = P.x + P.w / 2, py = P.y + P.h, t = Game.time, f = P.facing, mage = pnMage(), billow = Math.sin(t * 8) * 3;
  ctx.save(); ctx.translate(px, py); ctx.scale(f, 1); ctx.lineJoin = 'round';
  // cords down to his shoulders
  ctx.strokeStyle = 'rgba(243,234,216,.7)'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-6, -34); ctx.lineTo(-38, -80); ctx.moveTo(-6, -34); ctx.lineTo(44, -86); ctx.moveTo(4, -34); ctx.lineTo(6, -104 - billow); ctx.stroke();
  // the canopy: a huge triangular pennant, billowing
  ctx.beginPath(); ctx.moveTo(-42, -78); ctx.quadraticCurveTo(-30, -112 - billow, 4, -108 - billow); ctx.lineTo(58, -90); ctx.quadraticCurveTo(10, -84 + billow * 0.5, -42, -78); ctx.closePath();
  inked(mage ? '#2a1f5a' : '#e8361c', 2.5);
  ctx.save(); ctx.clip();
  if (mage) { ctx.fillStyle = '#f3ead8'; for (let k = 0; k < 9; k++) { const sx = -36 + ((k * 23) % 86), sy = -104 + ((k * 13) % 22); const s = 0.6 + 0.6 * Math.sin(t * 3 + k); ctx.fillRect(sx, sy, 1.6 * s + 0.4, 1.6 * s + 0.4); } }
  else { ctx.fillStyle = GOLD; ctx.fillRect(-50, -96 - billow * 0.5, 120, 5); ctx.fillStyle = BONE; ctx.font = `12px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillText('★', 6, -98 - billow); }
  ctx.restore();
  // stitched edge and tassels
  ctx.strokeStyle = mage ? '#b98bff' : GOLD; ctx.lineWidth = 1.2; ctx.setLineDash([3, 3]);
  ctx.beginPath(); ctx.moveTo(-38, -80); ctx.quadraticCurveTo(-28, -108 - billow, 4, -104 - billow); ctx.lineTo(52, -90); ctx.stroke(); ctx.setLineDash([]);
  for (const [tx, ty] of [[-42, -78], [58, -90], [8, -86]]) { ctx.strokeStyle = mage ? '#b98bff' : GOLD; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx - 3 + Math.sin(t * 9 + tx) * 2, ty + 9); ctx.stroke(); }
  ctx.restore();
}
function pnDrawFolded(P) {
  // tucked in: the pennant hangs off his shoulders like a short cape
  const px = P.x + P.w / 2, py = P.y + P.h, f = P.facing, sway = Math.sin(Game.time * 3) * 1.5 - Math.min(6, Math.abs(P.vx) / 60);
  ctx.save(); ctx.translate(px, py); ctx.scale(f * (P.sx || 1), P.sy || 1); ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-8, -34); ctx.lineTo(4, -34); ctx.lineTo(-10 + sway * 2, -12); ctx.lineTo(-16 + sway, -18); ctx.closePath();
  inked(pnMage() ? '#2a1f5a' : '#e8361c', 2);
  ctx.strokeStyle = pnMage() ? '#b98bff' : GOLD; ctx.lineWidth = 1; ctx.setLineDash([2, 2]); ctx.beginPath(); ctx.moveTo(-6, -32); ctx.lineTo(-10 + sway * 2, -14); ctx.stroke(); ctx.setLineDash([]);
  ctx.restore();
}
const _pnDrawNathan = drawNathan;
drawNathan = function (P) {
  if (P !== Player || !pnHave() || P.sit > 0.001 || P.lie) return _pnDrawNathan(P);
  if (PN.gliding) pnDrawGlider(P); else if (!pnMage()) pnDrawFolded(P);
  return _pnDrawNathan(P);
};

/* ---------- new routes: floating bolt caches beside the tall updrafts ---------- */
function pnRoomOf(u) {
  if (u.room) return u.room;
  for (const id in ROOM) { const p = ROOM[id].px; if (p && u.x >= p.x && u.x < p.x + p.w && u.y >= p.y && u.y < p.y + p.h) return id; }
  return null;
}
function pnAir(tx, ty, n = 3) { for (let k = -1; k < n; k++) if (tileAt(tx, ty + k) !== 0) return false; return true; }
function pnCaches() {
  if (PN.caches) return PN.caches;
  PN.caches = [];
  if (typeof UPDRAFTS === 'undefined') return PN.caches;
  UPDRAFTS.forEach((u, i) => {
    if (u.h < 10 * TILE) return;
    const room = pnRoomOf(u); if (!room) return;
    const ty = Math.floor(u.y / TILE) + 2, ux0 = Math.floor(u.x / TILE), ux1 = Math.floor((u.x + u.w) / TILE);
    for (const tx of [ux1 + 7, ux0 - 8, ux1 + 5, ux0 - 6]) if (pnAir(tx, ty)) { PN.caches.push({ id: PAGE.id + '_' + i, room, x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 }); break; }
  });
  // the Tailwind Stitch, high in the Gale Gardens
  if (typeof ROOM !== 'undefined' && ROOM.s_gusts) {
    const p = ROOM.s_gusts.px, r0 = Math.floor(p.y / TILE) + 3;
    outer: for (let ty = r0; ty < r0 + 6; ty++) for (let d = 0; d < 30; d++) for (const s of [1, -1]) {
      const tx = 222 + s * d; if (pnAir(tx, ty, 4)) { PN.caches.push({ id: 'tailwind', room: 's_gusts', x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2, badge: true }); break outer; }
    }
  }
  return PN.caches;
}
class PnCache {
  constructor(c) { Object.assign(this, { kind: 'pncache', c, x: c.x, y: c.y, t: rand(0, 6), gone: false }); }
  update(dt) {
    this.t += dt;
    if (!pnHave()) return;
    const P = Player, c = P.center();
    if (!P.dead && Math.hypot(c.x - this.x, c.y - this.y) < 34) {
      this.gone = true; const q = pnQ(); (q.glideCache = q.glideCache || {})[this.c.id] = 1;
      SFX.coin(); SFX.crystal(); burst(this.x, this.y, 18, { colors: [GOLD, '#e8361c', BONE], maxSpeed: 340 });
      if (this.c.badge) {
        q.badges = q.badges || {}; q.badges.tailwind = 1; saveGame();
        showCard('BADGE FOUND', 'TAILWIND STITCH', 'A gold thread of storm wind, stitched into a badge. Glide 30% faster, and press JUMP once mid-glide for a small thermal hop.', ['PAUSE › BADGES']);
        if (typeof Loadout !== 'undefined') Loadout.gained('tailwind');
      } else { dropBolts(this.x, this.y, 35); pop(this.x, this.y - 30, 'GLIDE CACHE!', { size: 26, color: GOLD }); saveGame(); }
    }
  }
  draw() {
    if (!pnHave()) return;
    const x = this.x, y = this.y + Math.sin(this.t * 2.2) * 4, b = this.c.badge;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 0, x, y, 36); g.addColorStop(0, b ? 'rgba(185,139,255,.5)' : 'rgba(242,193,78,.45)'); g.addColorStop(1, 'rgba(242,193,78,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 36, y - 36, 72, 72); ctx.restore();
    // a little pennant flag on a balloon of wind
    ctx.save(); ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(243,234,216,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x, y + 14); ctx.stroke();
    if (b) { ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.lineTo(x + 9, y - 3); ctx.lineTo(x, y + 6); ctx.lineTo(x - 9, y - 3); ctx.closePath(); inked('#b98bff', 2); ctx.fillStyle = GOLD; ctx.fillRect(x - 1, y - 8, 2, 10); }
    else { rr(x - 9, y - 4, 18, 14, 4); inked('#6b4a30', 2); ctx.beginPath(); ctx.moveTo(x - 2, y - 4); ctx.lineTo(x - 2, y - 18); ctx.lineTo(x + 12, y - 13); ctx.lineTo(x - 2, y - 9); inked('#e8361c', 1.5); }
    ctx.restore();
  }
}
const _pnTick = PAGE.tick;
PAGE.tick = function (dt) {
  if (_pnTick) _pnTick.call(this, dt);
  if (!Zone.room) return;
  if (PN.cacheRoom !== Zone.room || !NPCs.some(n => n.kind === 'pncache' || n.pnNone)) {
    PN.cacheRoom = Zone.room;
    const q = pnQ(), got = q.glideCache || {}, list = pnCaches().filter(c => c.room === Zone.room.id && !got[c.id] && !(c.badge && (q.badges || {}).tailwind));
    for (const c of list) NPCs.push(new PnCache(c));
    if (!list.length) NPCs.push({ pnNone: true, update() {}, draw() {} });
  }
};
