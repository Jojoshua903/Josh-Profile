'use strict';
/* =========================================================
   CAMP LIFE · little looping idle animations for the crew
   · Renas: the scooter hums with a 1 px bounce and puffs
     exhaust; every few seconds he taps the bus bumper with a
     wrench (tiny orange sparks)
   · Josh: types on a glowing holo-keyboard, the cyber-eye
     zooms in and out, a sip of coffee every 6 seconds
   · Lars: the anvil on a steady 1.5 s beat, golden sparks up
   · the cats: one sleeps by the fire, the other bats at a
     hanging team pennant
   · Daniel: juggles three unlit firecrackers; now and then one
     drops and pops in a puff of pink smoke
   · Fionn: an oversized magnifying glass over a glowing stone
   · Deniz: pours a thin stream of tea, petals drifting by
   · Reshman (every zone): only a dark puddle until you come
     close; then two white eyes open, blink out of step and
     sink back with an ink ripple
   Loaded on every story page after zone/transit.js.
   ========================================================= */
const atCamp = () => PAGE.id === 'z1' && Zone.room && Zone.room.id === 'hub';

/* ---------- Lars, Daniel, Fionn, Deniz and the cats ---------- */
(function () {
  const D0 = CampNPC.prototype.draw, U0 = CampNPC.prototype.update;
  CampNPC.prototype.update = function (dt) {
    if (this.kind !== 'lars' || !this.forge || !atCamp()) return U0.call(this, dt);
    // the anvil keeps its own steady 1.5 s beat (the stock forge rhythm is switched off here)
    this.forge = false; U0.call(this, dt); this.forge = true;
    const ph = (this.t % 1.5) / 1.5, was = this.beat || 0; this.beat = ph;
    if (ph < was) { SFX.anvil(); burst(this.x + this.facing * 30, this.y - 26, 7, { colors: [GOLD, '#ffd27a', EMBER], angle: -Math.PI / 2, spread: 0.7, maxSpeed: 320, maxLife: 0.35 }); }
  };
  CampNPC.prototype.draw = function () {
    const camp = atCamp(), t = this.t;
    if (camp && this.kind === 'lars' && this.forge) {
      const ph = (t % 1.5) / 1.5, lift = ph < 0.8 ? Math.sin(ph / 0.8 * Math.PI / 2) : 1 - (ph - 0.8) / 0.2;   // slow raise, quick strike
      drawAnvil(this.x + this.facing * 30, this.y);
      drawLars(this.x, this.y, this.facing, t, { cats: this.cats, hammer: -0.5 - lift * 1.4, lamp: this.lamp });
      if (this.near && this.prompt) { ctx.font = `14px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = GOLD; ctx.fillText('▲ ' + Bindings.label('up', Game.lastInput) + ' · ' + this.prompt, this.x, this.y - 84 + Math.sin(Game.time * 4) * 2); }
      return;
    }
    if (camp && this.kind === 'cat' && !this.sleepy) catPennant(this, true);
    D0.call(this);
    if (!camp) return;
    if (this.kind === 'daniel') danielJuggle(this);
    else if (this.kind === 'fionn') fionnLens(this);
    else if (this.kind === 'deniz') denizPour(this);
    else if (this.kind === 'cat' && !this.sleepy) catPennant(this, false);
  };
  // Daniel's juggling has its own tick (the drop and the pop)
  const U1 = CampNPC.prototype.update;
  CampNPC.prototype.update = function (dt) { U1.call(this, dt); if (this.kind === 'daniel' && atCamp()) danielTick(this, dt); };
})();

function danielTick(n, dt) {
  n.jt = (n.jt || 0) + dt; n.dropIn = (n.dropIn === undefined ? rand(6, 10) : n.dropIn) - dt;
  if (n.dropIn <= 0 && !n.drop) { n.drop = { i: (Math.random() * 3) | 0, y: 0, vy: -60, x: n.facing * 12 }; n.dropIn = rand(8, 13); }
  const d = n.drop; if (!d) return;
  if (!d.popped) {
    d.vy += 900 * dt; d.y += d.vy * dt;
    if (d.y >= 66) {   // it hits the floor: a harmless pop of pink smoke
      d.popped = 0.9; if (SFX.poof) SFX.poof();
      burst(n.x + d.x, n.y - 6, 12, { colors: ['#ff9fd0', '#ff6aa0', '#ffd0e8'], type: 'puff', maxSpeed: 90, minSize: 5, maxSize: 11, maxLife: 0.9, drag: 2 });
    }
  } else { d.popped -= dt; if (d.popped <= 0) n.drop = null; }
}
function danielJuggle(n) {
  const t = n.jt || 0, cx = n.x + n.facing * 4, top = n.y - 78, d = n.drop;
  for (let i = 0; i < 3; i++) {
    let x, y, a;
    if (d && d.i === i) { if (d.popped) continue; x = n.x + d.x; y = top + 8 + d.y; a = t * 9; }
    else { const p = (t * 1.1 + i / 3) % 1, ang = p * Math.PI * 2; x = cx + Math.cos(ang) * 15; y = top + 14 - Math.sin(ang) * 18; a = ang * 1.5; }
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    rr(-2.5, -8, 5, 16, 2); inked(i === 1 ? '#3a8ad0' : '#e8361c', 1.5);
    ctx.fillStyle = BONE; ctx.fillRect(-2.5, -2, 5, 3);
    ctx.strokeStyle = '#6b4a30'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, -8); ctx.quadraticCurveTo(2, -12, 0, -14); ctx.stroke();   // unlit fuse
    ctx.restore();
  }
}
function fionnLens(n) {
  const t = n.t, D = Save.data, sx = Z.fionn && Math.abs(Z.fionn.x - n.x) < 4 ? n.x + 44 : n.x + n.facing * 30, sy = n.y - 10;
  const nod = Math.max(0, Math.sin(t * 2.2)) * 3, lx = sx - n.facing * 4, ly = sy - 18 + nod;
  // the glowing stone under the glass
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 22); g.addColorStop(0, `rgba(155,227,106,${0.45 + Math.sin(t * 3) * 0.15})`); g.addColorStop(1, 'rgba(155,227,106,0)');
  ctx.fillStyle = g; ctx.fillRect(sx - 22, sy - 22, 44, 44); ctx.restore();
  ctx.beginPath(); ctx.ellipse(sx, sy - 1, 5, 4, 0.2, 0, 7); inked('#9be36a', 1.5);
  if (Math.random() < 0.08) spawnParticle({ x: sx + rand(-6, 6), y: sy - rand(2, 10), vx: rand(-10, 10), vy: rand(-40, -15), life: 0.5, size: 2, color: '#e9ffd8', type: 'spark' });
  // the oversized magnifying glass, bobbing with each nod
  ctx.save(); ctx.lineCap = 'round';
  ctx.strokeStyle = '#6b4a30'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(lx - n.facing * 12, ly + 12); ctx.lineTo(lx - n.facing * 22, ly + 22); ctx.stroke();
  ctx.beginPath(); ctx.arc(lx, ly, 11, 0, 7); ctx.fillStyle = 'rgba(200,240,255,.22)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#c9a33a'; ctx.stroke(); ctx.lineWidth = 1.2; ctx.strokeStyle = INK; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(lx, ly, 7, -2.4, -1.6); ctx.stroke();
  ctx.restore();
}
function denizPour(n) {
  const t = n.t, cyc = t % 4, f = n.facing, px = n.x + f * 20, py = n.y - 32;
  const tilt = cyc < 0.6 ? cyc / 0.6 : cyc < 2.4 ? 1 : cyc < 3 ? 1 - (cyc - 2.4) / 0.6 : 0;
  const cupX = n.x + f * 34, cupY = n.y - 4;
  // the cup
  rr(cupX - 5, cupY - 8, 10, 8, 2); inked(BONE, 1.5);
  // the teapot, tipping forward
  ctx.save(); ctx.translate(px, py); ctx.scale(f, 1); ctx.rotate(tilt * 0.7);
  ctx.beginPath(); ctx.ellipse(0, 0, 8, 6.5, 0, 0, 7); inked('#3a7a6a', 2);
  ctx.beginPath(); ctx.moveTo(7, -1); ctx.lineTo(14, -5); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
  ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(0, -7, 2, 0, 7); ctx.fill();
  ctx.restore();
  if (tilt > 0.8) {   // a thin steaming stream
    const sx = px + f * (14 * Math.cos(0.7) + 5 * Math.sin(0.7)), sy = py + 14 * Math.sin(0.7) - 5 * Math.cos(0.7);
    ctx.save(); ctx.strokeStyle = 'rgba(214,160,90,.85)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(sx + f * 6, sy + 6, cupX, cupY - 8); ctx.stroke(); ctx.restore();
    if (Math.random() < 0.2) spawnParticle({ x: cupX + rand(-3, 3), y: cupY - 10, vx: rand(-6, 6), vy: rand(-30, -15), life: 0.9, size: rand(2, 4), color: 'rgba(243,234,216,.4)', type: 'dot' });
  }
  if (Math.random() < 0.025) spawnParticle({ x: n.x + rand(-60, 60), y: n.y - rand(40, 90), vx: rand(-20, 20), vy: rand(6, 18), vr: rand(-3, 3), grav: 10, life: rand(2, 3), size: rand(2.5, 4), color: Math.random() < 0.5 ? '#ff9fd0' : '#ffd27a', type: 'dot' });
}
function catPennant(n, behind) {
  // a little team pennant on a string from the scaffolding; the cat swats it every few seconds
  const t = n.t, cyc = t % 2.6, swat = cyc > 2 ? Math.sin((cyc - 2) / 0.6 * Math.PI) : 0;
  const ax = n.x + n.facing * 10, ay = n.y - 74, sw = Math.sin(t * 2) * 0.12 + (n.hit || 0);
  n.hit = Math.max(0, (n.hit || 0) * 0.96); if (swat > 0.9 && (n.hit || 0) < 0.05) n.hit = 0.5;
  if (behind) {
    ctx.save(); ctx.translate(ax, ay); ctx.rotate(sw);
    ctx.strokeStyle = 'rgba(243,234,216,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(0, 36); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 36); ctx.lineTo(12, 40); ctx.lineTo(0, 46); ctx.closePath(); inked('#b8283c', 1.2);
    ctx.restore();
    return;
  }
  if (swat > 0) {   // the paw
    const px = n.x + n.facing * (6 + swat * 4), py = n.y - 18 - swat * 18;
    ctx.save(); ctx.strokeStyle = n.color || '#2b2228'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(n.x + n.facing * 4, n.y - 12); ctx.lineTo(px, py); ctx.stroke();
    ctx.fillStyle = '#ffd0e0'; ctx.beginPath(); ctx.arc(px, py, 2.2, 0, 7); ctx.fill(); ctx.restore();
  }
}

/* ---------- Renas at the bus bumper ---------- */
(function () {
  if (typeof QNPC === 'undefined') return;
  const D0 = QNPC.prototype.draw;
  QNPC.prototype.draw = function () {
    if (this.kind !== 'renas' || !atCamp()) return D0.apply(this, arguments);
    if (this.trSkip && RIDE.R) return;   // he's out on the scooter (zone/transit.js)
    const t = Game.time, bob = Math.sin(t * 34) > 0 ? -1 : 0;
    ctx.save(); ctx.translate(0, bob); const r = D0.apply(this, arguments); ctx.restore();
    if (Math.random() < 0.03) spawnParticle({ x: this.x - this.facing * 26, y: this.y - 10, vx: -this.facing * rand(10, 30), vy: rand(-30, -10), life: 0.9, size: rand(3, 5), color: 'rgba(200,200,200,.4)', type: 'dot' });
    // every 3 s: a tap on the bumper with the wrench
    const cyc = t % 3, tap = cyc < 0.5 ? Math.sin(cyc / 0.5 * Math.PI) : 0, dir = 1;   // the bus is to his right
    if (tap > 0) {
      const hx = this.x + dir * 8, hy = this.y - 32, ex = hx + dir * (10 + tap * 6), ey = hy + 4 - tap * 8;
      ctx.save(); ctx.strokeStyle = '#ff8a2a'; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.translate(ex, ey); ctx.rotate(-0.8 * dir + tap); rr(-1.5, -10, 3, 14, 1); inked('#9aa3ad', 1.5); ctx.restore();
      if (tap > 0.95 && !this.tapped) { this.tapped = true; SFX.clang && SFX.clang(); burst(ex + dir * 4, ey - 8, 6, { colors: [EMBER, GOLD], maxSpeed: 200, maxLife: 0.25 }); }
    } else this.tapped = false;
    return r;
  };
})();

/* ---------- Josh at his workbench ---------- */
(function () {
  if (typeof Josh === 'undefined') return;
  const D0 = Josh.prototype.draw;
  Josh.prototype.draw = function () {
    const camp = atCamp() && this.shop;
    const t = this.phase || 0, px = this.x + this.w / 2, py = this.y + this.h, f = this.facing;
    const sip = camp && t % 6 < 1.3 ? Math.sin((t % 6) / 1.3 * Math.PI) : 0;
    if (camp) {   // the holo-keyboard, glowing over the table
      const kx = px + f * 22, ky = py - 30;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(111,211,255,.18)'; ctx.beginPath(); ctx.moveTo(kx - 16, ky); ctx.lineTo(kx + 16, ky); ctx.lineTo(kx + 20, ky - 7); ctx.lineTo(kx - 12, ky - 7); ctx.closePath(); ctx.fill();
      for (let r = 0; r < 2; r++) for (let c = 0; c < 6; c++) {
        const on = Math.sin(t * 23 + c * 2.7 + r * 5.1) > 0.6 && sip < 0.1;
        ctx.fillStyle = on ? 'rgba(200,245,255,.95)' : 'rgba(111,211,255,.45)';
        ctx.fillRect(kx - 13 + c * 5 + r * 2, ky - 6 + r * 3, 3.5, 2);
      }
      ctx.fillStyle = 'rgba(111,211,255,.5)'; ctx.font = `7px ui-monospace, Menlo, monospace`; ctx.textAlign = 'center';
      ctx.fillText(['0x7F', 'fn()', '>_', 'OK'][Math.floor(t * 2) % 4], kx + f * 4, ky - 14 - (t * 12 % 10));
      ctx.restore();
    }
    D0.apply(this, arguments);
    if (!camp) return;
    // the cyber-eye zooms in and out
    const ex = px + f * 7, ey = py - 45, z = 4.5 + (Math.sin(t * 1.3) > 0.7 ? Math.sin(t * 9) * 1.8 + 1.8 : 0);
    ctx.save(); ctx.strokeStyle = 'rgba(111,211,255,.85)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(ex, ey, z + 1.5, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ex - z - 3, ey); ctx.lineTo(ex - z, ey); ctx.moveTo(ex + z, ey); ctx.lineTo(ex + z + 3, ey); ctx.stroke(); ctx.restore();
    // coffee: on the table, then up for a sip every 6 s
    const mx = sip > 0 ? px + f * (16 - sip * 6) : px + f * 34, my = sip > 0 ? py - 30 - sip * 10 : py - 30;
    ctx.save(); ctx.translate(mx, my); ctx.rotate(-f * sip * 0.6);
    rr(-4, -9, 8, 9, 1.5); inked('#e8361c', 1.5); ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(f * 5, -5, 2.5, -1.5, 1.5); ctx.stroke();
    ctx.restore();
    if (Math.random() < 0.08) spawnParticle({ x: mx + rand(-2, 2), y: my - 11, vx: rand(-5, 5), vy: rand(-28, -14), life: 0.8, size: rand(1.5, 3), color: 'rgba(243,234,216,.45)', type: 'dot' });
    if (sip > 0) { const hx = px + f * 6, hy = py - 31; ctx.save(); ctx.strokeStyle = '#2c6e6a'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(mx - f * 2, my - 3); ctx.stroke(); ctx.restore(); }
  };
})();

/* ---------- Reshman's shadow nooks (every zone) ---------- */
(function () {
  if (typeof ReshmanVendor === 'undefined') return;
  const D0 = ReshmanVendor.prototype.draw;
  ReshmanVendor.prototype.draw = function () {
    const c = Player.center(), d = Math.hypot(c.x - this.x, c.y - (this.y - 20)), t = this.t;
    const was = this.peek || 0, want = d < 140 ? 2 : d < 300 ? 1 : 0;
    if (want < was) this.ripple = 0.8;                                  // sinking back: an ink ripple
    this.peek = want; this.ripple = Math.max(0, (this.ripple || 0) - 1 / 60);
    // the puddle
    ctx.save(); ctx.fillStyle = 'rgba(4,3,8,.92)'; ctx.beginPath(); ctx.ellipse(this.x, this.y - 1, 22 + Math.sin(t * 1.3) * 1.5, 4.5, 0, 0, 7); ctx.fill();
    const rp = this.ripple > 0 ? 1 - this.ripple / 0.8 : (t * 0.35) % 1;
    ctx.strokeStyle = `rgba(120,110,150,${this.ripple > 0 ? 0.6 * (1 - rp) : 0.18 * (1 - rp)})`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(this.x, this.y - 1, 14 + rp * 22, 3 + rp * 3, 0, 0, 7); ctx.stroke(); ctx.restore();
    if (want === 2) return D0.apply(this, arguments);
    if (want === 1) {   // two wide white eyes, blinking out of step
      this.rise = Math.min(1, (this.rise || 0) + 1 / 20);
      const up = this.rise * 8;
      ctx.save(); ctx.shadowColor = '#f3ead8'; ctx.shadowBlur = 10; ctx.fillStyle = '#f3ead8';
      [[-6, 1.7], [6, 2.3]].forEach(([ox, sp]) => { const bl = Math.sin(t * sp + ox) > 0.93 ? 0.4 : 4.5; ctx.beginPath(); ctx.ellipse(this.x + ox, this.y - 2 - up, 3.2, bl * this.rise, 0, 0, 7); ctx.fill(); });
      ctx.restore();
      if (this.rise > 0.9 && Math.sin(t * 0.8) > 0.97) { ctx.font = `italic 11px ${SERIF_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(191,243,255,.8)'; ctx.fillText('…blorp', this.x, this.y - 24); }
    } else this.rise = 0;
  };
})();
