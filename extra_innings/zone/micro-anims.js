'use strict';
/* =========================================================
   NATHAN'S MICRO-ANIMATIONS · small procedural touches
   (the landing squash and the double-jump stretch were already
   in game/player.js; this adds the rest)
   · Bat-Launch stretch: a quick tall-and-thin pop as he launches
   · ledge teeter: within 6 px of falling off, he leans over the
     drop and windmills both arms
   · bat twirl idle: after 4 seconds standing still he spins the
     bat in one hand, then tugs the brim of his cap
   · wall-slide friction: dust puffs off his shoes
   Loaded on every story page after zone/boss-anims.js.
   ========================================================= */
(function () {
  const P = Player, U0 = P.update;
  P.update = function (dt) {
    const wasLaunched = !!this.launched;
    const r = U0.call(this, dt);
    if (!wasLaunched && this.launched && !this.onGround) { this.sx = 0.85; this.sy = 1.15; }
    // ledge teeter: one foot over open air, less than 6 px from going over
    let edge = 0;
    const still = this.onGround && Math.abs(this.vx) < 8 && !this.sitting && !(this.sit > 0.01) && !(this.attackT > 0) && !(this.healT > 0) && !this.dead && !this.hidden && Input.enabled;
    if (still) {
      const [a, b] = standingOn(this), sa = a === 1 || a === 3, sb = b === 1 || b === 3;
      if (sa && !sb) { const bx = (Math.floor(this.x / TILE) + 1) * TILE; if (bx - this.x < 6) edge = 1; }
      else if (!sa && sb) { const bx = Math.floor((this.x + this.w - 0.01) / TILE) * TILE; if (this.x + this.w - bx < 6) edge = -1; }
    }
    this.teeter = edge; if (edge) this.facing = edge;
    // the idle twirl
    const busy = Input.keyDown.size > 0 || Input.padDown.size > 0;
    this.idleT = still && !edge && !busy ? (this.idleT || 0) + dt : 0;
    if (this.idleT > 5.3) this.idleT = 0.01;
    // wall-slide friction puffs
    if (this.sliding && Math.random() < 0.35) spawnParticle({ x: this.wallDir > 0 ? this.x + this.w - 2 : this.x + 2, y: this.y + this.h - rand(2, 8), vx: -this.wallDir * rand(10, 40), vy: rand(-50, -20), life: 0.5, size: rand(3, 6), color: 'rgba(200,190,175,.5)', type: 'dot' });
    return r;
  };
})();
const _maBat = batAngle;
batAngle = function (P) {
  if (P !== Player || P.attackT > 0) return _maBat(P);
  const t = Game.time;
  if (P.teeter) return t * 16;                                          // windmilling
  if (P.idleT > 4) {
    const ph = P.idleT - 4;
    if (ph < 0.8) { const e = ph / 0.8; return -2.25 - e * e * Math.PI * 4; }   // two quick spins in one hand
    if (ph < 1.25) return -1.0 + Math.sin((ph - 0.8) * 30) * 0.08;      // a tug on the cap brim
  }
  return _maBat(P);
};
const _maDraw = drawNathan;
drawNathan = function (P) {
  if (P !== Player || !P.teeter || P.sit > 0.001) return _maDraw(P);
  const t = Game.time, px = P.x + P.w / 2, py = P.y + P.h, lean = P.teeter * (0.1 + Math.sin(t * 9) * 0.06);
  ctx.save(); ctx.translate(px, py); ctx.rotate(lean);
  // the second arm windmills behind him, opposite the bat arm
  ctx.save(); ctx.scale(P.facing, 1); limb(-4, -31, -t * 16 + Math.PI, 11, (typeof NATHAN_LOOK !== 'undefined' && NATHAN_LOOK.sleeve) || '#f3ead8', 4); ctx.restore();
  ctx.translate(-px, -py);
  const r = _maDraw(P);
  ctx.restore();
  return r;
};
