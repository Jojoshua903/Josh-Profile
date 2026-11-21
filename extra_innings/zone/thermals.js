'use strict';
/* =========================================================
   THERMALS · air streams that only carry the glider
   · tall open shafts get a column of rising air. It lifts
     Nathan ONLY while the Champion's Pennant is open (hold
     JUMP); let go and he simply falls back down, so a stream
     can never strand him anywhere
   · before the pennant is stitched there are no thermals at
     all: nothing is drawn, nothing pushes, nothing to find.
     Every route you need before that stays exactly as it was
   · each thermal is found from the room's own tiles (a shaft
     at least 16 tiles high and 3 wide, roof included), at most
     one per room, never in a boss arena or a dream room
   · at the top of each one floats a Thermal Cache (30 bolts),
     purely optional
   · the old updrafts (the Renas chase, the vents, the Spire
     columns) are untouched: they still lift you without the
     pennant, because those routes come before it
   Loaded on every story page right after zone/pennant.js.
   ========================================================= */
const THM = { byRoom: {}, room: null, puffs: [] };
const thHave = () => !!Save.data.q.pennant;
const thQ = () => { const q = Save.data.q; q.thermals = q.thermals || {}; return q.thermals; };
const thAir = (tx, ty) => tileAt(tx, ty) === 0;
// a deterministic coin flip per room, so the same rooms get thermals on every visit
const thHash = s => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return (h % 1000) / 1000; };

// already an updraft here? then this room keeps its old wind and gets no thermal
function thHasDraft(rm) {
  if (typeof UPDRAFTS === 'undefined') return false;
  const p = rm.px;
  return UPDRAFTS.some(u => (u.room ? u.room === rm.id : u.x < p.x + p.w && u.x + u.w > p.x && u.y < p.y + p.h && u.y + u.h > p.y));
}
function thFind(rm) {
  if (rm.id in THM.byRoom) return THM.byRoom[rm.id];
  THM.byRoom[rm.id] = null;
  if (!rm.px || rm.dream || rm.boss || rm.secret || thHasDraft(rm)) return null;
  if (thHash(rm.id) > 0.55) return null;   // a little over half the rooms with a good shaft get one
  const p = rm.px, x0 = Math.ceil(p.x / TILE) + 3, x1 = Math.floor((p.x + p.w) / TILE) - 4;
  const y0 = Math.ceil(p.y / TILE) + 1, y1 = Math.floor((p.y + p.h) / TILE) - 1;
  let best = null;
  for (let tx = x0; tx <= x1; tx++) {
    // the floor: the lowest solid tile in this column with air above it (3 wide)
    for (let ty = y1; ty > y0 + 16; ty--) {
      if (!(solidAt(tx, ty) && solidAt(tx + 1, ty) && solidAt(tx + 2, ty))) continue;
      if (!(thAir(tx, ty - 1) && thAir(tx + 1, ty - 1) && thAir(tx + 2, ty - 1))) continue;
      let top = ty - 1;
      while (top - 1 > y0 && thAir(tx, top - 1) && thAir(tx + 1, top - 1) && thAir(tx + 2, top - 1)) top--;
      const h = ty - top;
      if (h >= 16 && (!best || h > best.h)) best = { tx, top, floor: ty, h };
      break;
    }
  }
  if (!best) return null;
  const T = { id: rm.id, room: rm.id, x: best.tx * TILE, y: best.top * TILE, w: 3 * TILE, h: best.h * TILE };
  T.cache = { x: T.x + T.w / 2, y: T.y + 2.5 * TILE };
  THM.byRoom[rm.id] = T;
  return T;
}
const thHere = () => (thHave() && Zone.room ? thFind(Zone.room) : null);
const thBossHere = () => { const B = Zone.boss; return !!(B && !B.dead && B.hp > 0 && Zone.room && Zone.room.px && B.x >= Zone.room.px.x && B.x < Zone.room.px.x + Zone.room.px.w); };

/* ---------- the lift: only while gliding ---------- */
(function () {
  const P = Player, U0 = P.update;
  P.update = function (dt) {
    const r = U0.call(this, dt);
    try {
      const T = thHere();
      if (!T || thBossHere() || typeof PN === 'undefined' || !PN.gliding || !overlap(this, T)) return r;
      PN.draftT = Game.time;   // the cloak stretches tall in rising air
      // strong at the bottom, easing off near the roof so he hovers instead of bonking his head
      const near = clamp((this.y - T.y) / (3 * TILE), 0, 1);
      this.vy = Math.max(this.vy - 4600 * dt * (0.25 + 0.75 * near), -760 * near - 40);
      if (Math.random() < 0.5) spawnParticle({ x: this.x + rand(0, this.w), y: this.y + this.h, vx: rand(-20, 20), vy: rand(140, 260), life: 0.35, size: rand(2, 3), color: 'rgba(220,240,255,.8)', type: 'spark' });
    } catch (e) { logErr('zone/thermals.js:lift', e); }
    return r;
  };
})();

/* ---------- the Thermal Cache at the top ---------- */
class ThCache {
  constructor(T) { Object.assign(this, { kind: 'thcache', T, x: T.cache.x, y: T.cache.y, t: rand(0, 6), gone: false }); }
  update(dt) {
    this.t += dt;
    if (!thHave()) return;
    const c = Player.center();
    if (!Player.dead && Math.hypot(c.x - this.x, c.y - this.y) < 34) {
      this.gone = true; thQ()[this.T.id] = 1;
      SFX.coin(); SFX.crystal && SFX.crystal(); burst(this.x, this.y, 18, { colors: ['#dff6ff', GOLD, BONE], maxSpeed: 340 });
      dropBolts(this.x, this.y, 30); pop(this.x, this.y - 30, 'THERMAL CACHE!', { size: 26, color: '#bfe8ff' }); saveGame();
    }
  }
  draw() {
    if (!thHave()) return;
    const x = this.x, y = this.y + Math.sin(this.t * 2.2) * 4;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 0, x, y, 36); g.addColorStop(0, 'rgba(191,232,255,.5)'); g.addColorStop(1, 'rgba(191,232,255,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 36, y - 36, 72, 72); ctx.restore();
    ctx.save(); ctx.lineJoin = 'round';
    rr(x - 9, y - 4, 18, 14, 4); inked('#4a6f86', 2);
    ctx.beginPath(); ctx.moveTo(x - 2, y - 4); ctx.lineTo(x - 2, y - 18); ctx.lineTo(x + 12, y - 13); ctx.lineTo(x - 2, y - 9); inked('#e8361c', 1.5);
    ctx.restore();
  }
}

/* ---------- drawing the stream (only once you own the pennant) ---------- */
function thDraw() {
  const T = thHere(); if (!T || thBossHere()) return;
  const t = Game.time;
  ctx.save();
  // a faint column of cold air
  const g = ctx.createLinearGradient(0, T.y, 0, T.y + T.h);
  g.addColorStop(0, 'rgba(200,235,255,0)'); g.addColorStop(0.25, 'rgba(200,235,255,.07)'); g.addColorStop(1, 'rgba(200,235,255,.14)');
  ctx.fillStyle = g; ctx.fillRect(T.x, T.y, T.w, T.h);
  // wavy ribbons drifting up
  ctx.strokeStyle = 'rgba(225,244,255,.35)'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) {
    const ph = (t * 0.35 + i / 4) % 1, yb = T.y + T.h - ph * T.h, len = 70;
    ctx.globalAlpha = Math.sin(ph * Math.PI);
    ctx.beginPath();
    for (let k = 0; k <= 10; k++) {
      const yy = yb - k * len / 10, xx = T.x + T.w * (0.2 + 0.6 * ((i * 0.37) % 1)) + Math.sin(yy * 0.05 + t * 3 + i) * 8;
      k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // a little pennant sign at the foot: "this one needs the glider"
  const fx = T.x + T.w / 2, fy = T.y + T.h - 6;
  ctx.fillStyle = 'rgba(243,234,216,.55)'; ctx.fillRect(fx - 1, fy - 26, 2, 26);
  ctx.beginPath(); ctx.moveTo(fx + 1, fy - 26); ctx.lineTo(fx + 15 + Math.sin(t * 4) * 2, fy - 21); ctx.lineTo(fx + 1, fy - 16); ctx.closePath();
  ctx.fillStyle = 'rgba(232,54,28,.75)'; ctx.fill();
  ctx.restore();
}
(function () {
  const H = Game.hooks;
  const oB = H.back; H.back = function (cam) { if (oB) oB.call(H, cam); try { thDraw(); } catch (e) { logErr('zone/thermals.js:draw', e); } };
})();

/* ---------- placing the cache when you enter a room ---------- */
const _thTick = PAGE.tick;
PAGE.tick = function (dt) {
  if (_thTick) _thTick.call(this, dt);
  if (!Zone.room || THM.room === Zone.room) return;
  THM.room = Zone.room;
  const T = thHere();
  if (T && !thQ()[T.id] && !NPCs.some(n => n.kind === 'thcache' && n.T === T)) NPCs.push(new ThCache(T));
};
// the pennant just got stitched while standing in a room: let the room look again
setInterval(() => { if (thHave() && !THM.seen) { THM.seen = true; THM.room = null; } }, 500);
