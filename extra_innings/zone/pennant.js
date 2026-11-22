'use strict';
/* =========================================================
   THE CHAMPION'S PENNANT · the float-cloak glider
   · the quest: after the Renas chase, the flying security
     drones in the Ventilation Shafts drop Torn Stadium Banners.
     Bring 3 to Lars at Base Camp; Byte measures, Lars stitches
     them with the fabric off Renas's scooter tarp.
   · press JUMP again in mid-air and hold it (after any jump, double jump or
     Bat-Launch): the cloak on his shoulders snaps open into a bell,
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
      await Story.say('LARS', 'Tap JUMP again in the air and hold it. It\'ll catch the air. Updrafts will throw you to the roof.', lh, { voice: 0.8 });
    }).then(() => {
      q.pennant = 1; saveGame();
      showCard('NEW ABILITY', 'THE CHAMPION\'S PENNANT', 'Press JUMP again in mid-air and hold it to glide. Steer wide in the air, let go to drop. Open it inside an updraft to ride the column up fast.', ['IN THE AIR: PRESS + HOLD ' + Bindings.label('jump', Game.lastInput) + ' · GLIDE']);
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
        reward: 'The Champion\'s Pennant: press and hold JUMP in mid-air to glide' });
    }
    return L;
  };
}

/* ---------- the glide ---------- */
(function () {
  const P = Player, U0 = P.update;
  P.update = function (dt) {
    // the cloak needs a FRESH press in the air: holding the jump you took off with never opens it,
    // so a full jump stays a full jump. A double jump's press counts, a wall jump's doesn't
    const wasGround = this.onGround || this.coyoteT > 0, wasDouble = this.canDouble, press = Input.pressed('jump');
    const r = U0.call(this, dt);
    if (this.onGround) PN.armed = false;
    else if (press && !wasGround && (this.vy > -200 || (wasDouble && !this.canDouble))) PN.armed = true;
    const busy = this.dead || this.hidden || this.dashT > 0 || this.sliding || this.healT > 0 || this.onGround || this.sit > 0.01 || this.hazard || !Input.enabled;
    const want = pnHave() && !busy && Input.down('jump') && (PN.armed || PN.gliding) && (this.vy > 0 || PN.gliding);
    PN.was = PN.gliding; PN.gliding = want;
    if (this.onGround) PN.hop = false;
    if (!want) return r;
    if (!PN.was) { SFX.snap ? SFX.snap() : SFX.paper(); PN.snapT = Game.time; PN.trail = null; this.sx = 1.12; this.sy = 0.9; }   // the crisp fabric snap
    // in an updraft: ride it up fast
    let draft = false;
    if (typeof UPDRAFTS !== 'undefined') for (const u of UPDRAFTS) {
      if (u.room && Zone.room && u.room !== Zone.room.id) continue;
      if (overlap(this, u)) { draft = true; break; }
    }
    if (draft) PN.draftT = Game.time;
    if (draft) { this.vy = Math.max(this.vy - 5200 * dt, -820); if (Math.random() < 0.5) spawnParticle({ x: this.x + rand(0, this.w), y: this.y + this.h, vx: rand(-20, 20), vy: rand(120, 260), life: 0.4, size: 2, color: '#d9f2ff', type: 'dot' }); }
    else this.vy = Math.min(this.vy, 120);                                   // ~a fifth of the normal fall
    // wide steering in the air
    const ix = (Input.down('right') ? 1 : 0) - (Input.down('left') ? 1 : 0), top = TUNE.runSpeed * (pnTail() ? 1.3 : 1.05);
    if (ix) { this.vx = approach(this.vx, ix * top, TUNE.airAccel * 1.6 * dt); this.facing = ix; }
    // Tailwind Stitch: one small thermal hop per glide
    if (pnTail() && !PN.hop && Input.pressed('jump') && !this.canDouble) { PN.hop = true; this.vy = -380; SFX.djump(); ring(this.x + this.w / 2, this.y + 6, 6, 40, 0.3, GOLD, 3); }
    return r;
  };
})();
/* the float cloak: no canopy, no strings. It hangs off Nathan's collar and snaps open into a bell
   (crimson outside, gold lining showing under the flare), ripples along its hem, leans away from
   the way he steers, and stretches tall inside an updraft or thermal */
const PN_RED = '#D92B2B', PN_INK = '#0B0A0E', PN_GOLD = '#F2C14E';
function pnCloakShape(span, top, hem, t, hemFn) {
  // collar → two sharp wingtips → a scalloped hem back across
  ctx.beginPath(); ctx.moveTo(-5, top);
  ctx.bezierCurveTo(-span * 0.35, top + 2, -span * 0.95, top + (hem - top) * 0.35, -span, hem);
  const n = 6;
  for (let i = 1; i <= n; i++) {
    const x0 = -span + (2 * span) * (i - 1) / n, x1 = -span + (2 * span) * i / n, xm = (x0 + x1) / 2;
    ctx.quadraticCurveTo(xm, hem - 7 + hemFn(xm), x1, hem + hemFn(x1));
  }
  ctx.bezierCurveTo(span * 0.95, top + (hem - top) * 0.35, span * 0.35, top + 2, 5, top);
  ctx.closePath();
}
function pnDrawGlider(P) {
  const px = P.x + P.w / 2, py = P.y + P.h, t = Game.time, mage = pnMage();
  const top = -(P.h - 10), hem = -12, span = P.w * 1.6;
  const ripple = x => Math.sin(t * 12 + x * 0.15) * 2.5;
  // lean against the steering, stretch in rising air
  const lean = clamp(-(P.vx / (TUNE.runSpeed || 300)) * 0.18, -0.22, 0.22);
  PN.stretch = approach(PN.stretch || 0, PN.draftT && t - PN.draftT < 0.12 ? 1 : 0, 0.12);
  const sY = 1 + 0.15 * PN.stretch, sX = 1 - 0.1 * PN.stretch;
  const outer = mage ? '#2a1f5a' : PN_RED, lining = mage ? '#b98bff' : PN_GOLD;
  ctx.save(); ctx.translate(px, py + top); ctx.rotate(lean); ctx.scale(sX, sY); ctx.translate(0, -top); ctx.lineJoin = 'round';
  // the gold lining, peeking out a little below and wider than the crimson
  pnCloakShape(span + 2, top + 3, hem + 3, t, x => ripple(x + 3));
  ctx.fillStyle = lining; ctx.fill();
  // the crimson outside, with a crisp ink outline
  pnCloakShape(span, top, hem, t, ripple);
  ctx.fillStyle = outer; ctx.fill(); ctx.strokeStyle = PN_INK; ctx.lineWidth = 2; ctx.stroke();
  // a soft fold down the middle, and a thin gold trim stripe just above the hem
  ctx.strokeStyle = 'rgba(11,10,14,.35)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-span * 0.35, top + 8); ctx.quadraticCurveTo(-span * 0.45, (top + hem) / 2, -span * 0.5, hem - 3); ctx.moveTo(span * 0.35, top + 8); ctx.quadraticCurveTo(span * 0.45, (top + hem) / 2, span * 0.5, hem - 3); ctx.stroke();
  ctx.strokeStyle = lining; ctx.lineWidth = 1.2; ctx.beginPath();
  for (let i = 0; i <= 24; i++) { const x = -span * 0.94 + (span * 1.88) * i / 24, y = hem - 4 + ripple(x) * 0.8; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
  ctx.stroke();
  if (mage) { ctx.fillStyle = '#f3ead8'; for (let k = 0; k < 7; k++) { const sx = -span * 0.7 + ((k * 23) % (span * 1.4)), sy = top + 8 + ((k * 13) % (hem - top - 14)); const s = 0.6 + 0.6 * Math.sin(t * 3 + k); ctx.fillRect(sx, sy, 1.4 * s + 0.4, 1.4 * s + 0.4); } }
  // where the wingtips are in the world, for the ribbons
  const tips = [-span, span].map(lx => {
    const ly = hem - top, c = Math.cos(lean), s = Math.sin(lean);
    const x = lx * sX, y = ly * sY;
    return { x: px + x * c - y * s, y: py + top + x * s + y * c };
  });
  ctx.restore();
  pnRibbons(tips, t, mage);
  // the opening snap: a white oval puff round his shoulders for 0.15s
  const sa = t - (PN.snapT || -9);
  if (sa < 0.15) {
    const k = sa / 0.15;
    ctx.save(); ctx.strokeStyle = `rgba(255,255,255,${0.9 * (1 - k)})`; ctx.lineWidth = 2.5 * (1 - k) + 0.5;
    ctx.beginPath(); ctx.ellipse(px, py + top + 4, 14 + k * 34, 6 + k * 14, 0, 0, 7); ctx.stroke(); ctx.restore();
  }
}
// two thin white-and-gold ribbons trailing off the wingtips, 1.5px, gone in 0.25s
function pnRibbons(tips, t, mage) {
  PN.trail = PN.trail || [[], []];
  tips.forEach((p, i) => { const L = PN.trail[i]; L.push({ x: p.x, y: p.y, t }); while (L.length && t - L[0].t > 0.25) L.shift(); });
  ctx.save(); ctx.lineCap = 'round';
  PN.trail.forEach((L, i) => {
    for (let k = 1; k < L.length; k++) {
      const a = 1 - (t - L[k].t) / 0.25; if (a <= 0) continue;
      ctx.strokeStyle = (k % 2 ? 'rgba(255,255,255,' : mage ? 'rgba(185,139,255,' : 'rgba(242,193,78,') + (a * 0.85).toFixed(3) + ')';
      ctx.lineWidth = 1.5 * a + 0.2;
      ctx.beginPath(); ctx.moveTo(L[k - 1].x, L[k - 1].y); ctx.lineTo(L[k].x, L[k].y); ctx.stroke();
    }
  });
  ctx.restore();
}
function pnDrawFolded(P) {
  // tucked in: a slim folded red-and-gold team cape hanging off his shoulders
  PN.trail = null;
  const px = P.x + P.w / 2, py = P.y + P.h, f = P.facing, sway = Math.sin(Game.time * 3) * 1.5 - Math.min(6, Math.abs(P.vx) / 60);
  ctx.save(); ctx.translate(px, py); ctx.scale(f * (P.sx || 1), P.sy || 1); ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-8, -34); ctx.lineTo(4, -34); ctx.lineTo(-10 + sway * 2, -12); ctx.lineTo(-16 + sway, -18); ctx.closePath();
  ctx.fillStyle = pnMage() ? '#2a1f5a' : PN_RED; ctx.fill(); ctx.strokeStyle = PN_INK; ctx.lineWidth = 2; ctx.stroke();
  ctx.strokeStyle = pnMage() ? '#b98bff' : PN_GOLD; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-6, -32); ctx.lineTo(-10 + sway * 2, -14); ctx.stroke();
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
