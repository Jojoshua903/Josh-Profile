'use strict';
/* =========================================================
   BOSS ANIMS · little Silksong-style beats for the big fights
   · Adam and Evil Adam: before the match he bounces a glowing
     ball off his racket twice, tosses it high and slams it into
     the court, and THAT is what brings up the title card
   · Milo: hovers off the ground, his hair standing straight up
     with static, open spellbooks orbiting his shoulders
   · King Deniz: after the crown shatters, a beat of silence,
     then he flings off the royal robe (tie-dye underneath)
   · Zennith's crew portals: Lars drops in like a meteor
   (Evil Adam's phase 2 float-and-snap lives in act3/bosses.js;
   Josh riding pillion on Renas's scooter in act3/zennith.js)
   Loaded on every story page after zone/camp-life.js.
   ========================================================= */
const BA = { fx: [], last: 0 };
function baTick() {
  const now = performance.now(), dt = Math.min(0.05, (now - (BA.last || now)) / 1000); BA.last = now;
  for (const f of BA.fx) { f.t += dt; if (f.tick) f.tick(dt); }
  BA.fx = BA.fx.filter(f => f.t < f.dur);
}
(function wrapHooks() {
  const H = Game.hooks, top = H.top;
  H.top = function (cam) { if (top) top.call(H, cam); baTick(); for (const f of BA.fx) f.draw(); };
})();

/* ---------- the racket trick: two bounces, a toss, the slam ---------- */
function racketTrick(S, b, color = '#fff27a') {
  const f = b.facing || -1, feet = () => b.y + b.h, rx = () => b.x + b.w / 2 + f * 24, ry = () => feet() - 57;
  const floorX = b.x + b.w / 2 + f * 96, ball = { t: 0, dur: 1.75, x: rx(), y: ry(), trail: [] };
  ball.tick = () => {
    const t = ball.t;
    if (t < 0.7) { const p = (t % 0.35) / 0.35; ball.x = rx(); ball.y = ry() - 8 - Math.sin(p * Math.PI) * 36; if (p < 0.06 && !ball['b' + Math.floor(t / 0.35)]) { ball['b' + Math.floor(t / 0.35)] = 1; SFX.serve && SFX.serve(); } }
    else if (t < 1.3) { const p = (t - 0.7) / 0.6; ball.x = rx() + f * p * 6; ball.y = ry() - 8 - Math.sin(p * Math.PI * 0.5) * 190; b.pose = 'serve'; }
    else if (t < 1.45) {
      const p = (t - 1.3) / 0.15, sx = rx() + f * 6, sy = ry() - 198; b.pose = 'smash';
      ball.x = sx + (floorX - sx) * p; ball.y = sy + (feet() - 4 - sy) * p * p;
    } else {
      if (!ball.hit) {
        ball.hit = true; b.pose = 'idle';
        SFX.boom && SFX.boom(); SFX.clang && SFX.clang(); addShake(12); Game.flashWhite = Math.max(Game.flashWhite || 0, 0.35);
        burst(floorX, feet() - 4, 26, { colors: [color, BONE, GOLD], maxSpeed: 520, grav: 900, maxLife: 0.6 });
        if (typeof ring === 'function') ring(floorX, feet() - 4, 8, 90, 0.35, color, 6);
        if (S.punch) S.punch(0.08, 8);
      }
    }
    ball.trail.push({ x: ball.x, y: ball.y }); if (ball.trail.length > 8) ball.trail.shift();
  };
  ball.draw = () => {
    if (ball.hit) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ball.trail.forEach((p, i) => { ctx.fillStyle = color; ctx.globalAlpha = i / ball.trail.length * 0.35; ctx.beginPath(); ctx.arc(p.x, p.y, 3 + i * 0.4, 0, 7); ctx.fill(); });
    ctx.globalAlpha = 1;
    const g = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, 16); g.addColorStop(0, color); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(ball.x - 16, ball.y - 16, 32, 32);
    ctx.restore();
    ctx.beginPath(); ctx.arc(ball.x, ball.y, 5, 0, 7); inked('#fffbe0', 1.5);
  };
  BA.fx.push(ball);
  if (S.camTarget !== undefined) S.camTarget = { x: b.x + b.w / 2 + f * 50, y: b.y - 60 };
  return S.wait(1.6);
}

/* ---------- King Deniz flings off the royal robe ---------- */
function capeFling(d) {
  const x0 = d.x + d.w / 2, y0 = d.y + 20, dir = -(d.facing || 1), c = { t: 0, dur: 2.2, x: x0, y: y0, vx: dir * 260, vy: -520, rot: 0 };
  SFX.whoosh && SFX.whoosh();
  c.tick = dt => { c.vy += 700 * dt; c.vx *= 0.99; c.x += c.vx * dt; c.y += c.vy * dt; c.rot += dir * dt * 4; };
  c.draw = () => {
    const a = c.t > 1.7 ? 1 - (c.t - 1.7) / 0.5 : 1, flap = Math.sin(c.t * 14) * 6;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(c.x, c.y); ctx.rotate(c.rot); ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-14, -18); ctx.lineTo(14, -18); ctx.quadraticCurveTo(26, 4 + flap, 20, 26); ctx.lineTo(-20, 26); ctx.quadraticCurveTo(-26, 4 - flap, -14, -18); ctx.closePath();
    inked('#1f3f66', 2.5);
    ctx.fillStyle = BONE; ctx.fillRect(-15, -20, 30, 6); ctx.fillStyle = INK; for (let k = -12; k <= 12; k += 6) ctx.fillRect(k, -19, 2, 3);   // fur trim
    ctx.strokeStyle = GOLD; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-19, 22); ctx.lineTo(19, 22); ctx.stroke();
    ctx.restore();
  };
  BA.fx.push(c);
}

/* ---------- Milo: hovering, static hair, orbiting spellbooks ---------- */
if (typeof Milo !== 'undefined') {
  const D0 = Milo.prototype.draw;
  Milo.prototype.draw = function () {
    const st = this.state === 'stunned' || this.state === 'fall' || this.state === 'beaten', t = this.anim || 0;
    const cx = this.x + this.w / 2, hov = st ? 0 : -6 - Math.sin(t * 2.4) * 4, hy = this.y + this.h - 62 + hov;
    const books = st ? [] : [0, 1, 2].map(k => { const a = t * 1.6 + k * 2.094; return { a, x: cx + Math.cos(a) * 34, y: hy + 14 + Math.sin(a) * 10, front: Math.sin(a) > 0 }; });
    const book = B => {
      ctx.save(); ctx.translate(B.x, B.y + Math.sin(t * 5 + B.a) * 2); ctx.rotate(Math.sin(B.a) * 0.2);
      const fl = Math.abs(Math.sin(t * 6 + B.a)) * 3;
      ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(-11, -2 - fl); ctx.lineTo(-11, 6 - fl); ctx.lineTo(0, 9); ctx.lineTo(11, 6 - fl); ctx.lineTo(11, -2 - fl); ctx.closePath(); inked('#f3ead8', 1.5);
      ctx.strokeStyle = '#4a3a8a'; ctx.lineWidth = 1; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 3, 2); ctx.lineTo(s * 9, 0 - fl * 0.6); ctx.stroke(); }
      ctx.fillStyle = 'rgba(185,139,255,.8)'; ctx.beginPath(); ctx.arc(0, -6 - fl, 1.6, 0, 7); ctx.fill();
      ctx.restore();
    };
    books.filter(B => !B.front).forEach(book);
    ctx.save(); ctx.translate(0, hov); D0.apply(this, arguments); ctx.restore();
    books.filter(B => B.front).forEach(book);
    if (!st) {   // hair standing straight up with static
      ctx.save(); ctx.strokeStyle = 'rgba(185,139,255,.85)'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
      for (let k = -2; k <= 2; k++) {
        const bx = cx + k * 4 + this.facing * 2, by = hy + 6, len = 12 + Math.sin(t * 13 + k) * 3;
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + Math.sin(t * 20 + k) * 2, by - len); ctx.stroke();
      }
      ctx.restore();
      if (Math.random() < 0.25) spawnParticle({ x: cx + rand(-10, 10), y: hy - rand(4, 14), vx: rand(-40, 40), vy: rand(-60, -20), life: 0.25, size: 2, color: Math.random() < 0.5 ? '#d9b8ff' : '#ffffff', type: 'spark' });
    }
  };
}

/* ---------- Zennith's crew portals: Lars drops in like a meteor ---------- */
if (typeof LarsAssist !== 'undefined') {
  const U0 = LarsAssist.prototype.update, D0 = LarsAssist.prototype.draw;
  LarsAssist.prototype.update = function (dt) {
    U0.call(this, dt);
    const L = this.who[0]; if (!L || this.t < 0.4) return;
    if (this.mvy === undefined) { this.mvy = 200; this.my = this.py + 20; }
    if (!this.landed) {
      this.mvy += 2600 * dt; this.my += this.mvy * dt; L.y = this.my; L.o = Object.assign({}, L.o, { hammer: -2.2 });
      for (let k = 0; k < 3; k++) spawnParticle({ x: L.x + rand(-10, 10), y: L.y - rand(10, 50), vx: rand(-40, 40), vy: rand(-220, -80), life: 0.4, size: rand(3, 6), color: Math.random() < 0.5 ? EMBER : GOLD, type: 'dot' });
      if (L.y >= A.coreFloor) { L.y = A.coreFloor; this.landed = true; SFX.slam && SFX.slam(); addShake(10); dust(L.x, L.y, 14); L.o = Object.assign({}, L.o, { hammer: undefined }); }
    } else L.y = A.coreFloor;
  };
  LarsAssist.prototype.draw = function () {
    const L = this.who[0];
    if (L && !L.hidden && !this.landed && this.t > 0.4) {   // the meteor streak
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(L.x, L.y - 160, L.x, L.y - 20); g.addColorStop(0, 'rgba(255,138,42,0)'); g.addColorStop(1, 'rgba(255,138,42,.55)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(L.x - 6, L.y - 170); ctx.lineTo(L.x + 6, L.y - 170); ctx.lineTo(L.x + 22, L.y - 20); ctx.lineTo(L.x - 22, L.y - 20); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    D0.call(this);
  };
}
