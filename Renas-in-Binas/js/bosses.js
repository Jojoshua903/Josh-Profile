import { THREE, G, V3, toon, basic, mk, ink, clamp, damp, puff, placeOn, orientOn, surf, dirOf, altOf, anyPerp, tangentTo, stepDir, frameDir, wrapA, toast, $, canvasTex } from './core.js?v=20261111q';
import { sfx } from './audio.js?v=20261111q';
import { tr } from './lang.js?v=20261111q';
import { P, hurtPlayer, bouncePlayer, pfTest } from './player.js?v=20261111q';
import { SurfaceWall, lonAround, makeMarker } from './fx.js?v=20261111q';
import { buildKern, buildDeniz, buildLeprechaun, buildGorilla, buildCoconut, buildDragon, buildWorm, buildMecha, buildOctopus, buildGhostKing, buildCogTitan, buildGear } from './models.js?v=20261111q';

// ---------- shared hazards ----------
const arcTo = (pl, a, b) => Math.acos(clamp(a.dot(b), -1, 1)) * pl.r;
class Wave {   // a shockwave ring that runs over the planet: jump over it
  constructor(boss, B, o = {}) {
    this.b = boss; this.B = B.clone(); this.th = o.th0 ?? 0.2; this.th1 = o.th1 ?? Math.PI - 0.06; this.speed = o.speed ?? 0.55;
    this.h = o.h ?? 0.8; this.w = o.width ?? 0.5;
    this.wall = new SurfaceWall(boss.g, boss.a, o.color ?? 0xff3d7f, this.h, 96); this.wall.visible = true;
  }
  update(dt) {
    this.th += this.speed * dt;
    if (this.th > this.th1) { this.kill(); return false; }
    this.wall.ring(this.B, this.th);
    const fadeIn = Math.min(1, (this.th - 0.15) * 4);
    this.wall.mat.opacity = 0.85 * fadeIn;
    if (P.planet === this.b.a && !P.dead) {
      const thp = Math.acos(clamp(P.up.dot(this.B), -1, 1));
      if (Math.abs(thp - this.th) * this.b.a.r < this.w && P.alt < this.h - 0.15) hurtPlayer(surf(this.b.a, this.B, 0));
    }
    return true;
  }
  kill() { this.b.g.remove(this.wall.mesh, this.wall.mesh2); }
}
class Sweep {  // a laser fence that sweeps around the pole like a clock hand
  constructor(boss, B, o = {}) {
    this.b = boss; this.B = B.clone(); this.speed = o.speed ?? 0.8; this.left = (o.turns ?? 1) * Math.PI * 2; this.h = o.h ?? 0.75;
    this.phi = lonAround(this.B, P.up) + Math.PI * 0.85;
    this.wall = new SurfaceWall(boss.g, boss.a, o.color ?? 0x5ef2e0, this.h, 60); this.wall.visible = true;
    this.t = 0; this.flip = o.flip; this.sgn = 1;   // flip: after this many seconds it turns round (DJ Miauwtron's record scratch)
  }
  update(dt) {
    this.t += dt;
    const s = this.speed * Math.min(1, this.t / 1.2);
    if (this.flip && !this.flipped && this.t > this.flip) { this.flipped = true; this.sgn = -1; sfx.swing(); G.shake = Math.max(G.shake, 0.2); }
    this.phi += s * dt * this.sgn; this.left -= s * dt;
    if (this.left <= 0) { this.kill(); return false; }
    this.wall.meridian(this.B, this.phi, 0.32, Math.PI - 0.03);
    this.wall.mat.opacity = Math.min(0.9, this.t * 1.5);
    if (P.planet === this.b.a && !P.dead && this.t > 0.6) {
      const thp = Math.acos(clamp(P.up.dot(this.B), -1, 1));
      const d = Math.abs(wrapA(lonAround(this.B, P.up) - this.phi)) * this.b.a.r * Math.sin(thp);
      if (thp > 0.32 && d < 0.45 && P.alt < this.h - 0.12) hurtPlayer(surf(this.b.a, this.B, 0));
    }
    return true;
  }
  kill() { this.b.g.remove(this.wall.mesh, this.wall.mesh2); }
}
class Drop {   // something falls out of the sky onto a red circle
  constructor(boss, dir, o = {}) {
    this.b = boss; this.dir = dir.clone().normalize(); this.delay = o.delay ?? 1.1; this.r = o.radius ?? 1.6; this.fall = o.fall ?? 0.3; this.from = o.from ?? 13; this.t = 0;
    this.marker = makeMarker(boss.g, this.r, o.color ?? 0xff3a5a); this.marker.place(boss.a, this.dir);
    this.m = o.model; this.m.visible = false; boss.g.add(this.m);
    this.landed = false; this.after = 0; this.onLand = o.onLand;
  }
  update(dt) {
    this.t += dt;
    if (!this.landed) {
      this.marker.pulse(this.t * (6 + this.t * 8));
      const k = (this.t - (this.delay - this.fall)) / this.fall;
      if (k > 0) { this.m.visible = true; placeOn(this.m, this.b.a, this.dir, this.from * (1 - Math.min(1, k)) + 0.2, this.t); }
      if (this.t >= this.delay) {
        this.landed = true; this.marker.visible = false;
        sfx.thud(); G.shake = Math.max(G.shake, 0.25);
        puff(surf(this.b.a, this.dir, 0.3), 14, 0xffffff, 5, 0.6, this.dir);
        if (P.planet === this.b.a && arcTo(this.b.a, P.up, this.dir) < this.r + 0.25 && P.alt < 1.6) hurtPlayer(surf(this.b.a, this.dir, 0));
        if (this.onLand) this.onLand(this);
      }
      return true;
    }
    this.after += dt;
    this.m.scale.setScalar(Math.max(0.01, 1 - this.after * 2));
    if (this.after > 0.5) { this.kill(); return false; }
    return true;
  }
  kill() { this.b.g.remove(this.marker, this.m); }
}
class Spike {  // a crystal spike that comes up out of the ground
  constructor(boss, dir, delay, color = 0xff7ad8) {
    this.b = boss; this.dir = dir.clone(); this.t = -delay; this.marker = makeMarker(boss.g, 0.75, color);
    this.m = new THREE.Group(); const c = mk(new THREE.ConeGeometry(0.55, 2, 6), toon(color), 0, 1, 0, this.m, 1.08); void c;
    this.m.visible = false; boss.g.add(this.m);
  }
  update(dt) {
    this.t += dt;
    if (this.t < 0) return true;
    if (this.t < 0.6) { this.marker.place(this.b.a, this.dir); this.marker.pulse(this.t * 18); return true; }
    this.marker.visible = false;
    const k = this.t - 0.6;
    if (!this.m.visible) { this.m.visible = true; sfx.crack(); }
    const hgt = k < 0.12 ? k / 0.12 : k < 0.8 ? 1 : Math.max(0, 1 - (k - 0.8) * 3);
    placeOn(this.m, this.b.a, this.dir, -2 + hgt * 2);
    if (hgt > 0.6 && P.planet === this.b.a && arcTo(this.b.a, P.up, this.dir) < 0.85 && P.alt < 1.5) hurtPlayer(surf(this.b.a, this.dir, 0));
    if (k > 1.15) { this.kill(); return false; }
    return true;
  }
  kill() { this.b.g.remove(this.marker, this.m); }
}

// ---------- signature attacks: every boss has moves nobody else has ----------
const onA = (b) => P.planet === b.a && !P.dead;
const latOf = (pl, arc) => 90 - (arc / pl.r) * (180 / Math.PI);   // frameDir's latitude for a distance over the ground
const shove = (tan, dist) => P.pos.addScaledVector(tan, dist);   // push Rênas over the ground (whirlpool, conveyor belt)
const fxCss = document.createElement('style');
fxCss.textContent = `.inkFx,.darkFx{position:fixed;inset:0;pointer-events:none;z-index:6;transition:opacity .5s}
.inkFx i{position:absolute;border-radius:50%;background:radial-gradient(circle at 40% 38%,#4a3a6a,#1a1030 55%,rgba(26,16,48,.9) 66%,rgba(26,16,48,0) 72%);transform:scale(0);animation:inkPop .22s ease-out forwards}
.inkFx i::after{content:'';position:absolute;left:44%;top:78%;width:12%;height:40%;border-radius:0 0 50% 50%;background:#1a1030}
@keyframes inkPop{to{transform:scale(1)}}
.darkFx{background:radial-gradient(circle at 50% 58%,rgba(8,0,18,0) 0 12%,rgba(8,0,18,.7) 21%,rgba(5,0,12,.96) 32%);opacity:0}`;
document.head.appendChild(fxCss);
// screen effects live outside the 3D scene, so they check now and then that their fight is still going
const watchFx = (h) => setInterval(() => { if (!h.b.w.group.parent || h.b.state !== 'fight') h.kill(); }, 400);

// models for the new attacks
function rollBall(r, col, band) {   // a ball that rolls: the outer group sits on the ground, the pivot spins
  const g = new THREE.Group(), pv = new THREE.Group(); pv.position.y = r; g.add(pv);
  mk(new THREE.SphereGeometry(r, 16, 12), toon(col), 0, 0, 0, pv, 1.07);
  const b = mk(new THREE.TorusGeometry(r * 0.98, r * 0.09, 6, 24), toon(band), 0, 0, 0, pv, 0); b.rotation.y = Math.PI / 2;
  g.userData.pivot = pv; return g;
}
function gearWheel(r) {
  const g = new THREE.Group(), pv = new THREE.Group(); pv.position.y = r; g.add(pv);
  const w = mk(new THREE.CylinderGeometry(r * 0.82, r * 0.82, 0.55, 20), toon(0xc8a040), 0, 0, 0, pv, 1.06); w.rotation.z = Math.PI / 2;
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; const t = mk(new THREE.BoxGeometry(0.5, 0.42, 0.42), toon(0xffd23a), 0, Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9, pv, 1.08); t.rotation.x = a; }
  mk(new THREE.CylinderGeometry(r * 0.25, r * 0.25, 0.6, 10), toon(0x5a4a3a), 0, 0, 0, pv, 0).rotation.z = Math.PI / 2;
  g.userData.pivot = pv; return g;
}
function finModel() { const g = new THREE.Group(); const f = mk(new THREE.ConeGeometry(0.5, 1.3, 4), toon(0xa8743a), 0, 0.5, 0, g, 1.08); f.scale.z = 0.35; f.rotation.y = Math.PI / 4; return g; }
function ghostClone() {
  const g = new THREE.Group(), mat = basic(0xe8e0ff, { transparent: true, opacity: 0.55, depthWrite: false });
  mk(new THREE.SphereGeometry(0.8, 14, 10), mat, 0, 1.4, 0, g, 0);
  const tail = mk(new THREE.ConeGeometry(0.8, 1.4, 12), mat, 0, 0.5, 0, g, 0); tail.rotation.x = Math.PI;
  for (const s of [-1, 1]) mk(new THREE.SphereGeometry(0.13, 8, 6), basic(0x7dffb0), 0.28 * s, 1.5, 0.68, g, 0);
  return g;
}
function cloverModel() { const g = new THREE.Group(); for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; mk(new THREE.SphereGeometry(0.32, 10, 8), toon(0x5cd85a), Math.cos(a) * 0.32, 1.6, Math.sin(a) * 0.32, g, 1.08); } mk(new THREE.CylinderGeometry(0.05, 0.05, 1.4, 6), toon(0x2a8a3a), 0, 0.8, 0, g, 0); return g; }

class Floor {   // DJ Miauwtron: the whole planet is a dance floor. On every beat the flashing tiles DROP
  constructor(boss, B, o = {}) {
    this.b = boss; this.beat = o.beat ?? 1.1; this.left = o.beats ?? 4; this.t = 0; this.side = 0; this.tiles = [];
    [[70, 8], [47, 14], [24, 18], [0, 20], [-24, 18], [-47, 14], [-70, 8], [-90, 1]].forEach(([lat, n], ring) => {
      for (let i = 0; i < n; i++) {
        const d = frameDir(B, lat, (i / n) * 360 + ring * 11), m = makeMarker(boss.g, 2.1, 0xff3d7f);
        m.place(boss.a, d); m.visible = false;
        this.tiles.push({ d, m, grp: (i + ring) % 2 });   // a checkerboard
      }
    });
    this.show();
  }
  show() { for (const tl of this.tiles) tl.m.visible = tl.grp === this.side; }
  update(dt) {
    this.t += dt;
    const k = this.t / this.beat;
    for (const tl of this.tiles) if (tl.grp === this.side) { tl.m.pulse(this.t * (6 + k * 16)); tl.m.userData.fill.material.opacity = 0.12 + k * 0.5; }
    if (this.t < this.beat) return true;
    sfx.bass(); G.shake = Math.max(G.shake, 0.22);
    for (const tl of this.tiles) if (tl.grp === this.side) {
      if (Math.random() < 0.5) puff(surf(this.b.a, tl.d, 0.2), 2, 0xff3d7f, 3, 1.4, tl.d);
      if (onA(this.b) && arcTo(this.b.a, P.up, tl.d) < 2.5 && P.alt < 1.1) hurtPlayer(surf(this.b.a, tl.d, 0));
      tl.m.userData.fill.material.opacity = 0.22;
    }
    this.side = 1 - this.side; this.t = 0;
    if (--this.left <= 0) { this.kill(); return false; }
    this.show();
    return true;
  }
  kill() { for (const tl of this.tiles) this.b.g.remove(tl.m); }
}
class Chase {   // Gruis: a crack in the ground snakes after you, and crystals punch up behind it
  constructor(boss, from, o = {}) { this.b = boss; this.d = from.clone(); this.f = onA(boss) ? tangentTo(from, P.up) : anyPerp(from); this.t = 0; this.life = o.life ?? 4; this.speed = o.speed ?? 5; this.acc = 0; }
  update(dt) {
    this.t += dt;
    if (onA(this.b)) this.f.lerp(tangentTo(this.d, P.up), damp(2.2, dt)).normalize();
    stepDir(this.d, this.f, this.speed * dt, this.b.a.r); this.f.addScaledVector(this.d, -this.f.dot(this.d)).normalize();
    if (Math.random() < dt * 25) puff(surf(this.b.a, this.d, 0.1), 1, 0xd8b890, 2, 0.5, this.d);
    this.acc += this.speed * dt;
    if (this.acc >= 1.2) { this.acc = 0; this.b.haz.push(new Spike(this.b, this.d.clone(), 0.2, 0xff7ad8)); }
    return this.t < this.life;
  }
  kill() {}
}
class Roller {   // something big rolling straight over the planet: jump over it
  constructor(boss, from, fwd, o = {}) {
    this.b = boss; this.d = from.clone(); this.f = fwd.clone().addScaledVector(from, -fwd.dot(from)).normalize();
    this.speed = o.speed ?? 9; this.r = o.r ?? 0.7; this.left = o.dist ?? Math.PI * boss.a.r * 1.05; this.t = 0; this.spin = 0;
    this.m = o.model; boss.g.add(this.m); this.col = o.color ?? 0xd8b890;
  }
  update(dt) {
    this.t += dt;
    const s = this.speed * Math.min(1, this.t * 3);
    stepDir(this.d, this.f, s * dt, this.b.a.r); this.f.addScaledVector(this.d, -this.f.dot(this.d)).normalize(); this.left -= s * dt;
    this.spin += (s * dt) / this.r;
    placeOn(this.m, this.b.a, this.d, 0); orientOn(this.m, this.d, this.f);
    if (this.m.userData.pivot) this.m.userData.pivot.rotation.x = this.spin;
    if (Math.random() < dt * 14) puff(surf(this.b.a, this.d, 0.15), 1, this.col, 1.5, 0.4, this.d);
    if (onA(this.b) && arcTo(this.b.a, P.up, this.d) < this.r + 0.45 && P.alt < this.r * 1.6) hurtPlayer(surf(this.b.a, this.d, 0));
    if (this.left <= 0) { puff(surf(this.b.a, this.d, this.r), 12, this.col, 3, 1, this.d); this.kill(); return false; }
    return true;
  }
  kill() { this.b.g.remove(this.m); }
}
class Orbiter {   // Deniz: ice shards circling his throne. The ring breathes in and out
  constructor(boss, B, o = {}) {
    this.b = boss; this.B = B.clone(); this.t = 0; this.life = o.life ?? 6; this.spin = o.spin ?? 0.9; this.th0 = o.th0 ?? 0.75; this.amp = o.amp ?? 0.45; this.w = o.w ?? 1.3;
    this.ms = [];
    for (let i = 0; i < (o.n ?? 6); i++) { const g = new THREE.Group(); const s = mk(new THREE.OctahedronGeometry(0.55), toon(0xbff2ff), 0, 0.9, 0, g, 1.08); s.scale.y = 1.8; g.userData.s = s; boss.g.add(g); this.ms.push(g); }
    this.ph = lonAround(this.B, onA(boss) ? P.up : anyPerp(B)) * (180 / Math.PI);
  }
  update(dt) {
    this.t += dt;
    if (this.t > this.life) { this.kill(); return false; }
    const grow = Math.min(1, this.t / 0.7), th = (this.th0 + this.amp * Math.sin(this.t * this.w)) * grow + 0.15;
    this.ms.forEach((g, i) => {
      const d = frameDir(this.B, 90 - th * (180 / Math.PI), this.ph + (i / this.ms.length) * 360 + this.t * this.spin * 57.3);
      placeOn(g, this.b.a, d, 0); g.userData.s.rotation.y += dt * 4;
      if (this.t > 0.5 && onA(this.b) && arcTo(this.b.a, P.up, d) < 0.85 && P.alt < 1.7) hurtPlayer(surf(this.b.a, d, 0));
    });
    return true;
  }
  kill() { for (const g of this.ms) { puff(g.position.clone(), 4, 0xbff2ff, 3, 1); this.b.g.remove(g); } }
}
class Beam {   // a beam over the ground from pole S, aimed at you. Thin while it aims (and follows you), then it FIRES
  constructor(boss, S, o = {}) {
    this.b = boss; this.S = S.clone(); this.t = 0; this.aim = o.aim ?? 1.3; this.fire = o.fire ?? 0.75; this.off = o.off ?? 0;
    this.th0 = o.th0 ?? 0.15; this.th1 = o.th1 ?? 2.7;
    this.wall = new SurfaceWall(boss.g, boss.a, o.color ?? 0x7dff9a, 0.15, 50); this.wall.visible = true;
    this.phi = lonAround(this.S, onA(boss) ? P.up : anyPerp(S)) + this.off;
  }
  update(dt) {
    this.t += dt;
    if (this.t < this.aim) {
      // it follows you, then locks a moment before it fires: that's when you step aside
      if (onA(this.b)) this.phi += wrapA(lonAround(this.S, P.up) + this.off - this.phi) * damp(this.t < this.aim - 0.4 ? 5 : 0, dt);
      this.wall.h = 0.15; this.wall.mat.opacity = 0.25 + 0.4 * Math.abs(Math.sin(this.t * (this.t > this.aim - 0.4 ? 30 : 10)));
      this.wall.meridian(this.S, this.phi, this.th0, this.th1);
      return true;
    }
    if (!this.fired) { this.fired = true; sfx.crack(); sfx.whoosh(); G.shake = Math.max(G.shake, 0.3); }
    this.wall.h = 1.15; this.wall.mat.opacity = 0.95; this.wall.meridian(this.S, this.phi, this.th0, this.th1);
    if (onA(this.b)) {
      const thp = Math.acos(clamp(P.up.dot(this.S), -1, 1));
      const d = Math.abs(wrapA(lonAround(this.S, P.up) - this.phi)) * this.b.a.r * Math.sin(thp);
      if (thp > this.th0 && thp < this.th1 && d < 0.55 && P.alt < 1.0) hurtPlayer(surf(this.b.a, P.up, 0));
    }
    if (this.t > this.aim + this.fire) { this.kill(); return false; }
    return true;
  }
  kill() { this.b.g.remove(this.wall.mesh, this.wall.mesh2); }
}
class Bouncer {   // Lorcan: a lucky coin that bounces after you. Hop, hop, hop
  constructor(boss, from, o = {}) {
    this.b = boss; this.d = from.clone(); this.hops = o.hops ?? 5; this.hopT = o.hopT ?? 0.7; this.len = o.len ?? 3.4;
    this.m = goldCoin(); boss.g.add(this.m); this.mk = makeMarker(boss.g, 1.2, 0xffd23a); this.next();
  }
  next() {
    this.from = this.d.clone(); this.t = 0;
    const f = onA(this.b) ? tangentTo(this.d, P.up) : anyPerp(this.d);
    const dist = onA(this.b) ? clamp(arcTo(this.b.a, this.d, P.up), 0.8, this.len) : this.len;
    this.to = stepDir(this.d.clone(), f, dist, this.b.a.r); this.mk.place(this.b.a, this.to);
  }
  update(dt) {
    this.t += dt;
    const k = Math.min(1, this.t / this.hopT);
    this.d.copy(this.from).lerp(this.to, k).normalize();
    placeOn(this.m, this.b.a, this.d, Math.sin(k * Math.PI) * 2.6, this.t * 9); this.mk.pulse(this.t * 16);
    if (k < 1) return true;
    sfx.coin(); puff(surf(this.b.a, this.d, 0.2), 8, 0xffd23a, 3, 0.6, this.d);
    if (onA(this.b) && arcTo(this.b.a, P.up, this.d) < 1.35 && P.alt < 1.0) hurtPlayer(surf(this.b.a, this.d, 0));
    if (--this.hops <= 0) { this.kill(); return false; }
    this.next();
    return true;
  }
  kill() { this.b.g.remove(this.m, this.mk); }
}
class Gamble {   // Lorcan: three circles, and only the one with the clover is safe. Everywhere else: BAD LUCK
  constructor(boss, o = {}) {
    this.b = boss; this.t = 0; this.delay = o.delay ?? 2.4; this.swap = o.swap; this.r = 2.4;
    const base = onA(boss) ? P.up.clone() : frameDir(boss.B, 40, 0), a0 = Math.random() * 360;
    this.spots = [0, 1, 2].map((i) => frameDir(base, latOf(boss.a, 4.4), a0 + i * 120));
    this.good = Math.floor(Math.random() * 3);
    this.mks = this.spots.map((d) => { const m = makeMarker(boss.g, this.r, 0xff3a5a); m.place(boss.a, d); return m; });
    this.clover = cloverModel(); boss.g.add(this.clover);
    this.paint();
  }
  paint() {
    this.mks.forEach((m, i) => { const c = i === this.good ? 0x5cd85a : 0xff3a5a; m.userData.rim.material.color.setHex(c); m.userData.fill.material.color.setHex(c); });
    placeOn(this.clover, this.b.a, this.spots[this.good], 0);
  }
  update(dt) {
    this.t += dt;
    this.mks.forEach((m) => m.pulse(this.t * (5 + this.t * 6)));
    this.clover.rotation.y += dt * 3;
    if (this.swap && !this.swapped && this.t > this.delay * 0.55) {   // UNLUCKY: the clover jumps to another circle!
      this.swapped = true; this.good = (this.good + 1 + Math.floor(Math.random() * 2)) % 3; this.paint(); sfx.meow();
      if (G.toastOnce) G.toastOnce('lp-swap', 'Unlucky! The clover jumped to another circle!');
    }
    if (this.t < this.delay) return true;
    sfx.boom(); G.shake = Math.max(G.shake, 0.5);
    this.spots.forEach((d, i) => puff(surf(this.b.a, d, 0.4), 18, i === this.good ? 0x5cd85a : 0xff3a5a, 5, 2, d));
    if (onA(this.b) && arcTo(this.b.a, P.up, this.spots[this.good]) > this.r + 0.2) hurtPlayer(surf(this.b.a, P.up, 0));
    this.kill(); return false;
  }
  kill() { this.b.g.remove(...this.mks, this.clover); }
}
class FirePatch {   // Smeul: fire left burning on the ground where he ran
  constructor(boss, dir, life = 3.4) {
    this.b = boss; this.d = dir.clone(); this.t = 0; this.life = life;
    this.m = new THREE.Group();
    this.fl = mk(new THREE.ConeGeometry(0.6, 1.4, 7), basic(0xff7a2a, { transparent: true, opacity: 0.9, depthWrite: false }), 0, 0.7, 0, this.m, 0);
    this.core = mk(new THREE.ConeGeometry(0.32, 0.8, 7), basic(0xffe14a, { transparent: true, opacity: 0.9, depthWrite: false }), 0, 0.4, 0, this.m, 0);
    placeOn(this.m, boss.a, this.d, 0, Math.random() * 6); boss.g.add(this.m);
  }
  update(dt) {
    this.t += dt;
    const fade = Math.min(1, this.t / 0.25, (this.life - this.t) / 0.5);
    this.m.scale.set(fade, fade * (1 + Math.sin(this.t * 22) * 0.15), fade);
    if (Math.random() < dt * 4) puff(surf(this.b.a, this.d, 1.2), 1, 0xff9a2a, 1.2, 1.2, this.d);
    if (this.t > 0.3 && onA(this.b) && arcTo(this.b.a, P.up, this.d) < 1.0 && P.alt < 0.8) hurtPlayer(surf(this.b.a, this.d, 0));
    if (this.t > this.life) { this.kill(); return false; }
    return true;
  }
  kill() { this.b.g.remove(this.m); }
}
class Homing {   // something that chases you over the ground for a while: a missile, a sand shark fin, a ghost
  constructor(boss, from, o = {}) {
    this.b = boss; this.d = from.clone(); this.f = onA(boss) ? tangentTo(from, P.up) : anyPerp(from); this.t = 0;
    this.speed = o.speed ?? 6; this.turn = o.turn ?? 1.8; this.life = o.life ?? 4; this.alt = o.alt ?? 0.7; this.over = o.over ?? 0.9; this.hitR = o.hitR ?? 0.95;
    this.m = o.model; boss.g.add(this.m); this.col = o.color ?? 0xffffff; this.trail = o.trail;
  }
  update(dt) {
    this.t += dt;
    if (onA(this.b)) this.f.lerp(tangentTo(this.d, P.up), damp(this.turn, dt)).normalize();
    stepDir(this.d, this.f, this.speed * Math.min(1, this.t * 2) * dt, this.b.a.r); this.f.addScaledVector(this.d, -this.f.dot(this.d)).normalize();
    placeOn(this.m, this.b.a, this.d, this.alt); orientOn(this.m, this.d, this.f);
    if (this.trail !== undefined && Math.random() < dt * 30) puff(surf(this.b.a, this.d, this.alt + 0.1), 1, this.trail, 1.5, 0.4, this.d);
    if (this.t > 0.35 && onA(this.b) && arcTo(this.b.a, P.up, this.d) < this.hitR && P.alt < this.alt + this.over) { hurtPlayer(surf(this.b.a, this.d, 0)); this.boom(); return false; }
    if (this.t > this.life) { this.boom(); return false; }
    return true;
  }
  boom() { puff(surf(this.b.a, this.d, this.alt + 0.3), 14, this.col, 4, 1, this.d); sfx.thud(); this.kill(); }
  kill() { this.b.g.remove(this.m); }
}
class Pull {   // Kraak: a whirlpool that drags you toward him (and round him)
  constructor(boss, centre, o = {}) { this.b = boss; this.centre = centre; this.t = 0; this.life = o.life ?? 4.5; this.force = o.force ?? 3.2; }
  update(dt) {
    this.t += dt;
    const c = this.centre(), k = Math.min(1, this.t / 0.8, Math.max(0, (this.life - this.t) / 0.5));
    if (onA(this.b) && arcTo(this.b.a, P.up, c) > 0.6) {
      const tan = tangentTo(P.up, c), swirl = new THREE.Vector3().crossVectors(P.up, tan);
      shove(tan, this.force * k * dt); shove(swirl, this.force * 0.45 * k * dt);
    }
    if (Math.random() < dt * 30) { const d = frameDir(c, latOf(this.b.a, 1.5 + Math.random() * 9), Math.random() * 360); puff(surf(this.b.a, d, 0.2), 1, 0x9fe8ff, 1.5, 0.3, d); }
    return this.t < this.life;
  }
  kill() {}
}
class Splat {   // Kraak: INK on your helmet! Blobs cover part of the screen for a moment
  constructor(boss, o = {}) {
    this.b = boss; this.t = 0; this.life = o.life ?? 3.5;
    this.el = document.createElement('div'); this.el.className = 'inkFx';
    const n = o.n ?? 5;
    for (let i = 0; i < n; i++) {
      const s = document.createElement('i'), size = 18 + Math.random() * 16;
      // mostly round the edges, one closer to the middle: you can still see Rênas
      const edge = i < n - 1, x = edge ? (Math.random() < 0.5 ? -6 + Math.random() * 30 : 60 + Math.random() * 30) : 30 + Math.random() * 25;
      s.style.cssText = `left:${x}%;top:${-5 + Math.random() * 75}%;width:${size}vmin;height:${size}vmin;animation-delay:${i * 0.12}s`;
      this.el.appendChild(s);
    }
    document.body.appendChild(this.el); sfx.thud(); this.watch = watchFx(this);
  }
  update(dt) { this.t += dt; this.el.style.opacity = String(Math.min(1, Math.max(0, (this.life - this.t) / 0.8))); if (this.t > this.life) { this.kill(); return false; } return true; }
  kill() { this.el.remove(); clearInterval(this.watch); }
}
class Dark {   // Koning Boe: LIGHTS OUT. You can only see a little circle round Rênas
  constructor(boss, o = {}) { this.b = boss; this.t = 0; this.life = o.life ?? 5; this.el = document.createElement('div'); this.el.className = 'darkFx'; document.body.appendChild(this.el); requestAnimationFrame(() => (this.el.style.opacity = '1')); this.watch = watchFx(this); }
  end() { this.life = Math.min(this.life, this.t + 0.6); }
  update(dt) { this.t += dt; if (this.t > this.life - 0.6) this.el.style.opacity = '0'; if (this.t > this.life) { this.kill(); return false; } return true; }
  kill() { this.el.remove(); clearInterval(this.watch); }
}
class Conveyor {   // Tandwieltron: the whole floor turns into a conveyor belt
  constructor(boss, B, o = {}) {
    this.b = boss; this.B = B.clone(); this.t = 0; this.life = o.life ?? 5; this.speed = (o.speed ?? 3.2) * (Math.random() < 0.5 ? -1 : 1);
    this.stripes = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => { const w = new SurfaceWall(boss.g, boss.a, i % 2 ? 0xffd23a : 0xff8a1a, 0.06, 40, 0.6); w.visible = true; w.ph = (i / 8) * Math.PI * 2; return w; });
  }
  update(dt) {
    this.t += dt;
    const k = Math.min(1, this.t / 0.6, Math.max(0, (this.life - this.t) / 0.5));
    for (const w of this.stripes) { w.ph += (this.speed / this.b.a.r) * k * dt; w.meridian(this.B, w.ph, 0.35, Math.PI - 0.35); }
    if (onA(this.b) && P.grounded) {
      const tan = new THREE.Vector3().crossVectors(this.B, P.up);
      if (tan.lengthSq() > 1e-4) shove(tan.normalize(), this.speed * k * dt);
    }
    if (this.t > this.life) { this.kill(); return false; }
    return true;
  }
  kill() { for (const w of this.stripes) this.b.g.remove(w.mesh, w.mesh2); }
}

// ---------- base ----------
class Boss {
  constructor(world, arena, info) {
    this.w = world; this.a = arena; Object.assign(this, info);
    this.maxHp = info.hp; this.g = new THREE.Group(); world.group.add(this.g);
    this.haz = []; this.state = 'idle'; this.dead = false; this.queue = []; this.mv = null; this.mt = 0; this.rest = 0.9;
  }
  // bosses with 4 hp repeat their hardest phase (2) for the last hit, so every phase-based table stays in range
  get phase() { return Math.min(2, this.maxHp - this.hp); }
  bar(show) {
    const el = $('boss');
    el.classList.toggle('show', !!show);
    $('bossName').textContent = this.name; $('bossSub').textContent = tr(this.sub);
    const pips = $('bossPips'); pips.innerHTML = '';
    for (let i = 0; i < this.maxHp; i++) { const s = document.createElement('i'); if (i >= this.hp) s.className = 'off'; pips.appendChild(s); }
  }
  clearHaz() { for (const h of this.haz) h.kill(); this.haz = []; this.wiped = true; }
  start() { this.state = 'fight'; this.queue = []; this.mv = null; this.rest = 0.9; this.bar(true); }
  nextMove() {
    if (!this.queue.length) this.queue = this.plans[Math.min(this.phase, this.plans.length - 1)].slice();
    this.mv = this.queue.shift(); this.mt = 0; this.ms = 0;
    this.begin(this.mv);
  }
  tick(dt, t) {
    // hazards spawned while the others update (a split ball, a rally return) go into a fresh list,
    // so they don't get lost. If the boss gets hit halfway through, everything left over is wiped
    const cur = this.haz; this.haz = []; this.wiped = false;
    const keep = cur.filter((h) => (this.wiped ? (h.kill(), false) : h.update(dt)));
    if (this.wiped) for (const h of keep) h.kill();
    else this.haz = keep.concat(this.haz);
    if (this.state !== 'fight') return;
    if (!this.mv) { this.rest -= dt; if (this.rest <= 0) this.nextMove(); return; }
    this.mt += dt;
    if (this.step(this.mv, dt, t) === false) { this.mv = null; this.rest = [0.65, 0.5, 0.35][Math.min(2, this.phase)]; }
  }
  hit() {
    if (this.dead) return;
    this.hp--; sfx.bossHit(); G.shake = Math.max(G.shake, 0.6);
    this.bar(true);
    this.clearHaz(); this.mv = null; this.queue = []; this.rest = 1.7;
    if (this.hp <= 0) { this.dead = true; this.state = 'dying'; this.bar(false); if (this.die) this.die(); return; }
    if (this.onHit) this.onHit(this.phase);
    const line = this.w.hitLines && this.w.hitLines[this.phase - 1];
    if (line && G.radio) G.radio(line[0], line[1]);
    // a heart to help you along
    const d = frameDir(P.up, 70, Math.random() * 360);
    this.w.dropHeart(this.a, d);
  }
}

// ======================================================================
// Boss 1: DJ MIAUWTRON, Kayo & Yara's speaker robot on the Bass Drop Moon
// ======================================================================
export class Miauwtron extends Boss {
  constructor(world, arena) {
    super(world, arena, { name: 'DJ MIAUWTRON', sub: "Kayo & Yara's 808 speaker bot", hp: 3 });
    this.B = V3(0, 1, 0);
    this.H0 = 5.4; this.Hs = 1.9; this.h = this.H0; this.stunned = false;
    this.plans = [
      ['rings', 'bells', 'floor', 'stun'],
      ['rings', 'scratch', 'drones', 'bells', 'stun'],
      ['floor', 'scratch', 'bells', 'drones', 'rings', 'stun'],
    ];
    // the tower
    this.pf = world.addPlatform(arena, { dir: this.B, hx: 2.1, hz: 2.1, h: this.H0, color: 0x2b2440 });
    this.pf.mesh.visible = false;
    const tw = new THREE.Group(); this.tw = tw;
    const body = new THREE.Group(); tw.add(body); this.body = body;
    const box = mk(new THREE.BoxGeometry(4.2, 1, 4.2), toon(0x2b2440), 0, 0.5, 0, body, 0);
    { const o = new THREE.Mesh(box.geometry, new THREE.MeshBasicMaterial({ color: 0x14101e, side: THREE.BackSide })); o.scale.set(1.04, 1.02, 1.04); box.add(o); }
    this.box = box;
    const face = canvasTex(256, 256, (g) => {
      g.fillStyle = '#1a1030'; g.fillRect(0, 0, 256, 256);
      g.fillStyle = '#ff3d7f';
      g.beginPath(); g.moveTo(40, 40); g.lineTo(80, 100); g.lineTo(20, 110); g.fill();
      g.beginPath(); g.moveTo(216, 40); g.lineTo(176, 100); g.lineTo(236, 110); g.fill();
      g.fillStyle = '#5ef2e0'; g.fillRect(60, 120, 40, 40); g.fillRect(156, 120, 40, 40);
      g.strokeStyle = '#5ef2e0'; g.lineWidth = 10; g.beginPath(); g.moveTo(90, 200); g.lineTo(128, 220); g.lineTo(166, 200); g.stroke();
      g.fillStyle = '#ff3d7f'; g.font = '900 30px ui-rounded, system-ui'; g.textAlign = 'center'; g.fillText('MIAUW', 128, 30);
    });
    this.faces = [];
    for (let i = 0; i < 4; i++) {
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshBasicMaterial({ map: face }));
      const a = (i / 4) * Math.PI * 2; pl.position.set(Math.sin(a) * 2.13, 3.2, Math.cos(a) * 2.13); pl.rotation.y = a; tw.add(pl); this.faces.push(pl);
    }
    // the speaker cones down the sides
    this.cones = [];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const cone = mk(new THREE.CylinderGeometry(0.55, 0.7, 0.16, 20), toon(0x5ef2e0), Math.sin(a) * 2.14, 0.75, Math.cos(a) * 2.14, tw, 0);
      cone.rotation.order = "YXZ"; cone.rotation.set(Math.PI / 2, a, 0);
      this.cones.push(cone);
    }
    // cat ears + the Drop Button on top
    this.top = new THREE.Group(); tw.add(this.top);
    for (const s of [-1, 1]) { const e = mk(new THREE.ConeGeometry(0.8, 1.6, 4), toon(0x2b2440), 1.3 * s, 0.8, 0, this.top, 1.04); e.rotation.y = Math.PI / 4; }
    this.btnMat = toon(0x8a3a5a);
    this.btn = mk(new THREE.CylinderGeometry(1.2, 1.4, 0.4, 24), this.btnMat, 0, 0.2, 0, this.top, 1.05);
    this.glow = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.05, 24), basic(0xffe27a, { transparent: true, opacity: 0, depthWrite: false })); this.glow.position.y = 0.45; this.top.add(this.glow);
    this.zap = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.06, 6, 30), basic(0x5ef2e0, { transparent: true, opacity: 0.8 })); this.zap.rotation.x = Math.PI / 2; this.zap.position.y = 0.55; this.top.add(this.zap);
    placeOn(tw, arena, this.B, 0); this.g.add(tw);
    this.setH(this.H0);
  }
  setH(h) {
    this.h = h; this.pf.h = h;
    this.body.scale.y = Math.max(0.3, h - 0.2);
    this.top.position.y = h - 0.4;
    for (const f of this.faces) { f.position.y = Math.max(0.6, h * 0.58); f.scale.setScalar(clamp(h / this.H0, 0.4, 1)); }
  }
  reset() {
    this.clearHaz(); this.hp = this.maxHp; this.dead = false; this.state = 'idle'; this.mv = null; this.queue = []; this.stunned = false;
    this.tw.visible = true; this.tw.rotation.set(0, 0, 0); this.dt = 0; this.boomed = false; placeOn(this.tw, this.a, this.B, 0); this.setH(this.H0); this.bar(false);
    for (const e of this.drones || []) e.kill(true);
    this.drones = [];
  }
  begin(mv) {
    const p = this.phase;
    if (mv === 'rings') { this.n = [3, 4, 5][p]; this.gap = [1.0, 0.8, 0.65][p]; this.nt = 0.2; }
    if (mv === 'double') { this.n = 3; this.nt = 0.2; }
    if (mv === 'bells') { this.n = [2, 3, 3][p]; this.nt = 0.3; }
    if (mv === 'sweep') { this.haz.push(new Sweep(this, this.B, { speed: [0.7, 0.85, 1.05][p], turns: [1, 1, 1.4][p] })); this.nt = 2.5; sfx.warn(); }
    if (mv === 'floor') {
      const beat = [1.25, 1.1, 0.95][p];
      this.haz.push(new Floor(this, this.B, { beat, beats: [4, 5, 6][p] })); this.nt = 0; this.beat = beat; sfx.warn();
      G.toastOnce('mt-floor', 'DANCE FLOOR! On every beat the flashing tiles DROP: hop onto the dark ones!');
    }
    if (mv === 'scratch') {
      this.haz.push(new Sweep(this, this.B, { speed: [0.75, 0.9, 1.05][p], turns: [1.3, 1.5, 1.7][p], flip: [2.4, 2.0, 1.6][p], color: 0xff3d7f })); sfx.warn();
      G.toastOnce('mt-scratch', 'RECORD SCRATCH! The laser turns round halfway. Don’t get caught out!');
    }
    if (mv === 'drones') { this.n = [2, 2, 3][p]; this.spawnDrones(this.n); }
    if (mv === 'stun') { this.stunned = true; this.ms = 0; sfx.boom(); G.toastOnce('mt-stun', 'The bass DROPPED! Jump on top and GROUND POUND the Drop Button! (Shift in the air)'); }
  }
  pump() { this.body.scale.x = this.body.scale.z = 1.12; sfx.bass(); G.shake = Math.max(G.shake, 0.12); }
  spawnDrones(n) {
    this.drones = this.drones || [];
    for (let i = 0; i < n; i++) {
      const d = frameDir(this.B, 55, i * (360 / n) + Math.random() * 40);
      const e = this.w.addEnemy(this.a, d, 'drone', { drops: 1, speedMul: [1, 1, 1.15][this.phase] });
      e.life = 8; this.drones.push(e);
    }
  }
  step(mv, dt) {
    const p = this.phase;
    this.body.scale.x = this.body.scale.z = 1 + (this.body.scale.x - 1) * Math.exp(-dt * 10);
    if (mv === 'rings') {
      this.nt -= dt;
      if (this.nt <= 0 && this.n > 0) { this.haz.push(new Wave(this, this.B, { speed: [0.5, 0.58, 0.66][p], th0: 0.22 })); this.pump(); this.n--; this.nt = this.gap; }
      return this.n > 0 || this.mt < this.gap * 2.5;
    }
    if (mv === 'double') {
      this.nt -= dt;
      if (this.nt <= 0 && this.n > 0) {
        this.haz.push(new Wave(this, this.B, { speed: 0.6, th0: 0.22 }));
        const B = this.B; setTimeout(() => { if (this.state === 'fight' && !this.dead) this.haz.push(new Wave(this, B, { speed: 0.6, th0: 0.22, color: 0xffe27a })); }, 330);
        this.pump(); this.n--; this.nt = 1.5;
      }
      return this.n > 0 || this.mt < 5.5;
    }
    if (mv === 'bells') {
      this.nt -= dt;
      if (this.nt <= 0 && this.n > 0) {
        const delay = [1.2, 1.0, 0.85][p];
        const dirs = [P.up.clone(), frameDir(P.up, 90 - 20, Math.random() * 360), frameDir(P.up, 90 - 22, Math.random() * 360)];
        for (const d of dirs) this.haz.push(new Drop(this, d, { delay, radius: 1.7, model: cowbell(), color: 0xffd23a }));
        sfx.warn(); this.n--; this.nt = delay + 0.35;
      }
      return this.n > 0 || this.mt < 1;
    }
    if (mv === 'sweep') {
      this.nt -= dt;
      if (p >= 2 && this.nt <= 0) { this.haz.push(new Wave(this, this.B, { speed: 0.55, th0: 0.22 })); this.pump(); this.nt = 3; }
      return this.haz.some((h) => h instanceof Sweep);
    }
    if (mv === 'drones') return this.mt < 6 && this.drones.some((e) => !e.dead);
    if (mv === 'floor') {   // the tower pumps along with the beat
      this.nt -= dt; if (this.nt <= 0) { this.pump(); this.nt = this.beat; }
      return this.haz.some((h) => h instanceof Floor);
    }
    if (mv === 'scratch') return this.haz.some((h) => h instanceof Sweep);
    if (mv === 'stun') {
      const hold = [4.6, 4.0, 3.4][p];
      const tt = this.mt;
      const k = tt < 0.5 ? tt / 0.5 : tt < hold + 0.5 ? 1 : Math.max(0, 1 - (tt - hold - 0.5) / 0.5);
      this.setH(this.H0 + (this.Hs - this.H0) * k);
      this.glow.material.opacity = k * (0.4 + 0.4 * Math.abs(Math.sin(tt * 8)));
      this.btnMat.color.setHex(k > 0.9 ? 0xffd23a : 0x8a3a5a);
      if (tt > hold + 1) { this.stunned = false; if (P.ground === this.pf) bouncePlayer(16); return false; }
      return true;
    }
    return false;
  }
  update(dt, t) {
    if (this.state === "fight" && !this.stunned && this.mv !== "stun" && this.h < this.H0) this.setH(Math.min(this.H0, this.h + dt * 3));
    // drones time out
    for (const e of this.drones || []) if (!e.dead) { e.life -= dt; if (e.life <= 0) e.kill(true); }
    this.zap.visible = !this.stunned && this.state === 'fight';
    this.zap.rotation.z = t * 6; this.zap.material.opacity = 0.5 + Math.abs(Math.sin(t * 20)) * 0.5;
    if (this.state === 'fight' || this.state === 'idle') {
      // the top is electric while it isn't stunned
      if (this.state === 'fight' && !this.stunned && P.ground === this.pf && P.grounded) { hurtPlayer(surf(this.a, this.B, this.h)); bouncePlayer(13); }
      for (const f of this.faces) f.material.color.setHex(this.stunned ? 0xffe27a : 0xffffff);
    }
    if (this.state === 'dying') {
      this.dt = (this.dt || 0) + dt;
      this.tw.rotation.y += dt * 4; this.setH(Math.max(0.3, this.h - dt * 1.5));
      if (Math.random() < dt * 30) puff(surf(this.a, this.B, this.h + Math.random() * 2).add(V3(Math.random() - 0.5, 0, Math.random() - 0.5).multiplyScalar(4)), 3, Math.random() < 0.5 ? 0xff3d7f : 0x5ef2e0, 5, 2, this.B);
      if (this.dt > 2.4 && !this.boomed) { this.boomed = true; sfx.boom(); G.shake = 1; this.tw.visible = false; this.pf.h = 0.01; puff(surf(this.a, this.B, 1), 60, 0xff3d7f, 9, 4, this.B); this.onWin && this.onWin(); }
    }
    this.tick(dt, t);
  }
  onPound(pos, ground) {
    if (this.state !== 'fight') return;
    if (ground === this.pf && this.stunned && this.h < this.Hs + 0.6) { bouncePlayer(15); P.vt.copy(anyPerp(this.B)).applyAxisAngle(this.B, Math.random() * 6.28).multiplyScalar(6); P.inv = Math.max(P.inv, 1.2); this.stunned = false; this.setH(this.Hs); this.hit(); }
  }
  onStomp() { if (this.stunned) G.toastOnce('mt-harder', 'Harder! Hold Shift in the air for a ground pound!'); }
}
function cowbell() {
  const g = new THREE.Group();
  const b = mk(new THREE.CylinderGeometry(0.9, 1.5, 2.2, 4), toon(0xffd23a), 0, 1.1, 0, g, 1.06); b.rotation.y = Math.PI / 4;
  mk(new THREE.TorusGeometry(0.5, 0.14, 6, 14, Math.PI), toon(0x8a6a2a), 0, 2.3, 0, g, 0);
  return g;
}

// ======================================================================
// Boss 2: GRUIS, the ore golem in the Kristalkern
// ======================================================================
export class Gruis extends Boss {
  constructor(world, arena) {
    super(world, arena, { name: 'GRUIS', sub: 'The ore golem who hugs your core', hp: 3 });
    this.B = V3(0, 1, 0);
    this.plans = [
      ['walk', 'roll', 'walk', 'roll', 'slam'],
      ['slam', 'roll', 'chase', 'roll', 'slam', 'roll'],
      ['chase', 'roll', 'slam', 'roll', 'chase', 'walk', 'roll'],
    ];
    // crystal pillars round the equator: roll him into one!
    this.pillars = [0, 90, 180, 270].map((lon) => {
      const pf = world.addPlatform(arena, { dir: frameDir(this.B, 8, lon + 45), r: 1.25, h: 4.4, color: 0xff7ad8, top: 0xffd0f0, sides: 6 });
      pf.home = { h: 4.4 };
      return pf;
    });
    this.dir = frameDir(this.B, 60, 0); this.fwd = anyPerp(this.dir);
    const m = new THREE.Group(); this.m = m; this.g.add(m);
    const body = new THREE.Group(); body.position.y = 1.7; m.add(body); this.body = body;
    const rock = toon(0x8a6a4a), dark = toon(0x5a4030);
    const torso = mk(new THREE.DodecahedronGeometry(1.5, 0), rock, 0, 0, 0, body, 1.05); torso.scale.set(1.1, 1, 1);
    for (let i = 0; i < 6; i++) mk(new THREE.OctahedronGeometry(0.22), toon(0xffd36a), Math.cos(i) * 1.2, Math.sin(i * 2) * 0.8, Math.sin(i) * 1.1, torso, 0);
    this.head = mk(new THREE.DodecahedronGeometry(0.75, 0), dark, 0, 1.55, 0.3, body, 1.06);
    for (const s of [-1, 1]) mk(new THREE.SphereGeometry(0.14, 8, 6), basic(0xffd36a), 0.3 * s, 0.1, 0.62, this.head, 0);
    this.arms = [-1, 1].map((s) => { const a = new THREE.Group(); a.position.set(1.5 * s, 0.4, 0); body.add(a); mk(new THREE.DodecahedronGeometry(0.7, 0), dark, 0, -0.6, 0.4, a, 1.06); return a; });
    // the energy core he is hugging
    const ck = buildKern(1.6); ck.position.set(0, -0.1, 1.55); body.add(ck); this.core = ck;
    // his weak spot: the crystal on his back
    this.weakMat = toon(0xff7ad8);
    this.weak = mk(new THREE.OctahedronGeometry(0.8), this.weakMat, 0, 0.6, -1.4, body, 1.08); this.weak.scale.y = 1.6; this.weak.rotation.x = -0.6;
    this.legs = [-1, 1].map((s) => mk(new THREE.CylinderGeometry(0.45, 0.55, 1, 8), dark, 0.7 * s, 0.5, 0, m, 1.06));
    this.line = [];
    this.place();
  }
  place(y = 0) { this.m.position.copy(surf(this.a, this.dir, y)); orientOn(this.m, this.dir, this.fwd); }
  reset() {
    this.clearHaz(); this.hp = this.maxHp; this.dead = false; this.state = 'idle'; this.mv = null; this.queue = [];
    if (this.mk) this.g.remove(this.mk); this.slammed = false; this.ms = 0; this.dt = 0; this.boomed = false; this.core.visible = true;
    this.dir = frameDir(this.B, 60, 0); this.fwd = anyPerp(this.dir); this.body.rotation.set(0, 0, 0); this.body.position.y = 1.7; this.m.visible = true; this.m.scale.setScalar(1);
    for (const pf of this.pillars) this.regrow(pf, true);
    this.bar(false); this.place();
  }
  regrow(pf, instant) { pf.off = false; pf.h = pf.home.h; pf.mesh.visible = true; pf.mesh.scale.set(1, instant ? 1 : 0.01, 1); pf.grow = instant ? 0 : 0.0001; }
  steer(goal, k, dt) { const a = Math.atan2(new THREE.Vector3().crossVectors(this.fwd, goal).dot(this.dir), this.fwd.dot(goal)); this.fwd.applyAxisAngle(this.dir, a * damp(k, dt)); }
  walk(s, dt) { stepDir(this.dir, this.fwd, s * dt, this.a.r); this.fwd.addScaledVector(this.dir, -this.fwd.dot(this.dir)).normalize(); }
  begin(mv) {
    const p = this.phase;
    if (mv === 'roll') { this.ms = 'curl'; sfx.warn(); }
    if (mv === 'slam') { this.from = this.dir.clone(); this.to = P.up.clone(); this.mk = makeMarker(this.g, 2.2, 0xff3a5a); this.mk.place(this.a, this.to); sfx.warn(); }
    if (mv === 'spikes') {
      const base = tangentTo(this.dir, P.up);
      for (let l = 0; l < 3; l++) {
        const t0 = base.clone().applyAxisAngle(this.dir, (l / 3) * Math.PI * 2);
        for (let i = 1; i <= 10; i++) {
          const d = this.dir.clone().applyAxisAngle(new THREE.Vector3().crossVectors(this.dir, t0).normalize(), (i * 1.25) / this.a.r);
          this.haz.push(new Spike(this, d, i * [0.13, 0.12, 0.1][p] + l * 0.05));
        }
      }
      sfx.warn();
    }
    if (mv === 'chase') {
      // he punches the ground: a crack runs after you, and in phase 3 a second one a moment later
      this.haz.push(new Chase(this, this.dir, { speed: [5, 5.2, 5.6][p], life: [4, 4.2, 4.5][p] })); this.second = p < 2;
      sfx.boom(); G.shake = 0.5; sfx.warn();
      G.toastOnce('gr-chase', 'A crack is coming after you! Keep running: crystals shoot up behind it.');
    }
  }
  step(mv, dt, t) {
    const p = this.phase;
    const onMe = P.planet === this.a;
    if (mv === 'chase') {
      this.arms.forEach((a) => (a.rotation.x = -2.2 + Math.sin(this.mt * 10) * 0.3)); this.body.rotation.z = Math.sin(this.mt * 20) * 0.04;
      if (!this.second && this.mt > 1.6) { this.second = true; this.haz.push(new Chase(this, this.dir, { speed: 5.6, life: 3.6 })); sfx.boom(); G.shake = 0.5; }
      this.touch();
      if (this.mt > 1.2 && !this.haz.some((h) => h instanceof Chase)) { this.arms.forEach((a) => (a.rotation.x = 0)); this.body.rotation.z = 0; return false; }
      return true;
    }
    if (mv === 'walk') {
      if (onMe) this.steer(tangentTo(this.dir, P.up), 3, dt);
      this.walk([2.6, 3.0, 3.4][p], dt);
      this.body.rotation.z = Math.sin(this.mt * 6) * 0.08; this.legs[0].position.y = 0.5 + Math.max(0, Math.sin(this.mt * 6)) * 0.3; this.legs[1].position.y = 0.5 + Math.max(0, -Math.sin(this.mt * 6)) * 0.3;
      this.place(); this.touch(); return this.mt < 2.4;
    }
    if (mv === 'roll') {
      if (this.ms === 'curl') {
        if (onMe) this.steer(tangentTo(this.dir, P.up), 6, dt);
        this.body.rotation.x = Math.min(1, this.mt / 0.8) * 1.4; this.body.position.y = 1.7 - Math.min(1, this.mt / 0.8) * 0.3;
        this.m.position.copy(surf(this.a, this.dir, 0)).add(V3((Math.random() - 0.5) * 0.15, 0, (Math.random() - 0.5) * 0.15));
        orientOn(this.m, this.dir, this.fwd);
        if (this.mt > [1.0, 0.85, 0.7][p]) { this.ms = 'go'; this.mt = 0; sfx.whoosh(); }
        this.touch(); return true;
      }
      if (this.ms === 'go') {
        this.walk([10, 12, 14][p], dt);
        this.body.rotation.x += dt * 14; this.place();
        if (Math.random() < dt * 30) puff(surf(this.a, this.dir, 0.2), 1, 0xd8b890, 2, 0.4, this.dir);
        for (const pf of this.pillars) {
          if (!pf.off && arcTo(this.a, this.dir, pf.n) < 1.25 + 1.5) {
            pf.off = true; pf.mesh.visible = false; sfx.crack(); sfx.boom(); G.shake = 0.6;
            puff(surf(this.a, pf.n, 2), 40, 0xff7ad8, 7, 3, pf.n);
            this.ms = 'stun'; this.mt = 0; this.body.rotation.set(Math.PI, 0, 0); this.body.position.y = 1.4;
            G.toastOnce('gruis-stun', 'He smashed into a crystal! JUMP on his back crystal!');
            return true;
          }
        }
        this.touch();
        if (this.mt > 3.6) { this.ms = 'dizzy'; this.mt = 0; }
        return true;
      }
      if (this.ms === 'dizzy') { this.body.rotation.x += (0 - this.body.rotation.x) * damp(6, dt); this.body.position.y = 1.7; this.place(); this.touch(); return this.mt < 0.9; }
      if (this.ms === 'stun') {
        const hold = [3.4, 2.9, 2.5][p];
        this.weakMat.color.setHex(Math.sin(this.mt * 14) > 0 ? 0xffffff : 0xff7ad8);
        this.body.rotation.z = Math.sin(this.mt * 3) * 0.1;
        // stars round his head
        if (Math.random() < dt * 8) puff(this.m.position.clone().addScaledVector(this.dir, 3.2), 1, 0xffe27a, 1.5, 0.3, this.dir);
        if (onMe && arcTo(this.a, P.up, this.dir) < 2.0 && P.alt > 1.4 && P.vr <= 0) { bouncePlayer(16); this.weakMat.color.setHex(0xff7ad8); this.body.rotation.set(0, 0, 0); this.body.position.y = 1.7; this.hit(); return false; }
        if (this.mt > hold) { this.body.rotation.set(0, 0, 0); this.body.position.y = 1.7; this.weakMat.color.setHex(0xff7ad8); this.fixPillars(); return false; }
        return true;
      }
    }
    if (mv === 'slam') {
      const air = 1.15, k = Math.min(1, this.mt / air);
      this.mk.pulse(this.mt * 14);
      const d = this.from.clone().lerp(this.to, k).normalize();
      this.dir.copy(d); this.place(Math.sin(k * Math.PI) * 8);
      this.body.rotation.x = -k * 0.5;
      if (k >= 1 && !this.slammed) {
        this.slammed = true; this.g.remove(this.mk); sfx.boom(); G.shake = 0.7;
        puff(surf(this.a, this.dir, 0.3), 30, 0xd8b890, 7, 1, this.dir);
        if (onMe && arcTo(this.a, P.up, this.dir) < 2.4 && P.alt < 2) hurtPlayer(surf(this.a, this.dir, 0));
        this.haz.push(new Wave(this, this.dir, { speed: [0.85, 0.95, 1.05][p], th0: 0.15, th1: 1.9, color: 0xffb03a, h: 0.8 }));
        if (p >= 1) for (let i = 0; i < 4; i++) this.haz.push(new Drop(this, frameDir(P.up, 90 - (i ? 14 : 0), i * 120), { delay: 1.3 + i * 0.25, radius: 1.3, model: stalactite(), color: 0xff7a3a }));
      }
      if (k >= 1) { this.body.rotation.x += (0 - this.body.rotation.x) * damp(5, dt); if (this.mt > air + 1.0) { this.slammed = false; return false; } }
      return true;
    }
    if (mv === 'spikes') { this.body.rotation.z = Math.sin(this.mt * 20) * 0.05; this.arms.forEach((a, i) => (a.rotation.x = -Math.min(1, this.mt * 2) * 2 * (i ? 1 : 1))); if (this.mt > 2.6) { this.arms.forEach((a) => (a.rotation.x = 0)); return false; } return true; }
    return false;
  }
  fixPillars() {
    const left = this.pillars.filter((p) => !p.off).length;
    if (left <= 1) {
      for (const pf of this.pillars) if (pf.off) this.regrow(pf);
      if (G.radio) G.radio('LARS', 'Out of crystals? Hang on! I’m growing new ones! …With a shovel.');
    }
  }
  touch() {
    if (P.planet !== this.a || P.dead) return;
    if (arcTo(this.a, P.up, this.dir) < 1.9 && P.alt < 3.2) hurtPlayer(surf(this.a, this.dir, 0), 10);
  }
  update(dt, t) {
    for (const pf of this.pillars) if (pf.grow > 0) { pf.grow = Math.min(1, pf.grow + dt * 1.5); pf.mesh.scale.set(1, pf.grow, 1); if (pf.grow >= 1) pf.grow = 0; }
    if (this.state === 'idle') { this.body.position.y = 1.7 + Math.sin(t * 1.5) * 0.05; this.arms.forEach((a, i) => (a.rotation.z = Math.sin(t * 1.5 + i) * 0.1)); }
    if (this.state === 'dying') {
      this.dt = (this.dt || 0) + dt;
      this.body.rotation.z = Math.min(1.5, this.dt) * 1.0; this.body.position.y = Math.max(0.6, 1.7 - this.dt * 0.8);
      if (Math.random() < dt * 20) puff(this.m.position.clone().addScaledVector(this.dir, 2), 2, 0xffe27a, 2, 1, this.dir);
      if (this.dt > 2.2 && !this.boomed) { this.boomed = true; this.core.visible = false; sfx.win(); this.onWin && this.onWin(); }
    }
    this.tick(dt, t);
  }
  onPound() {}
}
function stalactite() { const g = new THREE.Group(); const c = mk(new THREE.ConeGeometry(0.6, 2.2, 6), toon(0x8a6a4a), 0, 1.1, 0, g, 1.06); c.rotation.x = Math.PI; return g; }

// ======================================================================
// Boss 3: ZENNITH, the demon pitcher (Nathan's worst nightmare) on the Helle Diamant
// ======================================================================
class Ball {
  constructor(boss, pos, vel, kind, o = {}) {
    this.b = boss; this.pos = pos.clone(); this.vel = vel.clone(); this.kind = kind; this.state = 'out'; this.life = 6; this.rally = o.rally || 0;
    this.split = o.split; this.t = 0;
    const col = kind === 'curve' ? 0xb04aff : kind === 'gold' ? 0xffd23a : 0xfff2e0;
    const g = new THREE.Group();
    this.core = mk(new THREE.SphereGeometry(0.34, 14, 10), basic(col), 0, 0, 0, g, 1.18);
    this.aura = new THREE.Mesh(new THREE.SphereGeometry(0.62, 14, 10), basic(kind === 'curve' ? 0xb04aff : 0xff6a2a, { transparent: true, opacity: 0.35, depthWrite: false }));
    g.add(this.aura);
    this.g = g; boss.g.add(g); g.position.copy(this.pos);
  }
  get reflectable() { return this.kind !== 'curve'; }
  update(dt) {
    this.t += dt; this.life -= dt;
    const a = this.b.a, chest = P.pos.clone().addScaledVector(P.up, 0.65);
    if (this.state === 'out') {
      if (this.kind === 'curve' && P.planet === a) {
        const want = chest.clone().sub(this.pos).normalize().multiplyScalar(this.vel.length());
        this.vel.lerp(want, damp(1.6, dt));
      }
      if (this.split && this.t > 0.45) { this.split(this); this.kill(); return false; }
      const d = this.pos.distanceTo(chest);
      // a ball you can hit flashes cyan once it's close enough: that's the moment to spin
      if (this.reflectable) this.aura.material.color.setHex(d < 4.2 && Math.floor(this.t * 16) % 2 ? 0x5ef2e0 : 0xff6a2a);
      if (this.reflectable && P.spinT > 0.06 && d < 2.6) {
        this.state = 'back'; this.speed = this.vel.length() * 1.3 + 2; sfx.bat(); G.shake = 0.25;
        P.spinCd = Math.min(P.spinCd, 0.3);   // a clean hit refunds the spin, so rallies stay possible
        puff(this.pos.clone(), 14, 0x7ac8ff, 5, 1);
        this.core.material.color.setHex(0x7ac8ff); this.aura.material.color.setHex(0x7ac8ff);
        if (G.toastOnce) G.toastOnce('zn-hit', 'HOME RUN! Send it right back at him!');
      } else if (d < 0.7 && !P.dead) { hurtPlayer(this.pos.clone()); this.boom(); return false; }
    } else {
      const to = this.b.handPos().sub(this.pos);
      this.vel.copy(to).setLength(this.speed);
      if (to.length() < 1.3) { this.b.ballBack(this); this.kill(); return false; }
    }
    this.pos.addScaledVector(this.vel, dt);
    this.g.position.copy(this.pos);
    this.aura.scale.setScalar(1 + Math.sin(this.t * 30) * 0.15);
    if (Math.random() < dt * 40) puff(this.pos.clone(), 1, this.state === 'back' ? 0x7ac8ff : this.kind === 'curve' ? 0xb04aff : 0xff8a3a, 0.5, 0.2);
    if (altOf(a, this.pos) < 0.3) { this.boom(); return false; }
    if (this.life <= 0) { this.kill(); return false; }
    return true;
  }
  boom() {
    puff(this.pos.clone(), 16, this.kind === 'curve' ? 0xb04aff : 0xff8a3a, 4, 1, dirOf(this.b.a, this.pos)); sfx.thud();
    if (this.kind === 'curve' && P.planet === this.b.a && this.pos.distanceTo(P.pos) < 1.6) hurtPlayer(this.pos.clone());
    this.kill();
  }
  kill() { this.b.g.remove(this.g); }
}
export class Zennith extends Boss {
  constructor(world, arena) {
    super(world, arena, { name: 'ZENNITH', sub: "The demon pitcher · Nathan's worst nightmare", hp: 4 });
    this.plans = [
      ['fast', 'curve', 'fast', 'rest', 'fast', 'curve', 'fast', 'rest'],
      ['split', 'curve', 'grounders', 'fast', 'curve', 'split', 'rest'],
      ['grounders', 'rally', 'curve', 'stomp', 'split', 'rally', 'rest'],
    ];
    this.dir = V3(0, 1, 0); this.alt = 7.2;
    const m = new THREE.Group(); this.m = m; this.g.add(m);
    // the floating mound
    const mound = mk(new THREE.CylinderGeometry(1.6, 0.6, 1.2, 10), toon(0x5a2a2a), 0, -0.6, 0, m, 1.05); void mound;
    mk(new THREE.CylinderGeometry(1.62, 1.62, 0.12, 10), toon(0xff5a2a), 0, 0.0, 0, m, 0);
    const red = toon(0xd8323a), black = toon(0x1e1a24), white = toon(0xf4f1ea);
    const body = new THREE.Group(); m.add(body); this.body = body;
    for (const s of [-1, 1]) mk(new THREE.CapsuleGeometry(0.15, 0.6, 4, 8), black, 0.2 * s, 0.5, 0, body);
    mk(new THREE.CapsuleGeometry(0.36, 0.6, 6, 12), black, 0, 1.35, 0, body);
    mk(new THREE.BoxGeometry(0.1, 0.34, 0.02), basic(0xff5a2a), 0, 1.42, 0.37, body, 0);
    mk(new THREE.BoxGeometry(0.1, 0.34, 0.02), basic(0xff5a2a), 0.14, 1.42, 0.37, body, 0);
    this.head = new THREE.Group(); this.head.position.y = 2.15; body.add(this.head);
    mk(new THREE.SphereGeometry(0.34, 16, 12), red, 0, 0, 0, this.head, 1.06);
    for (const s of [-1, 1]) {
      const h = mk(new THREE.ConeGeometry(0.1, 0.45, 8), white, 0.2 * s, 0.35, 0, this.head, 1.1); h.rotation.z = -0.5 * s;
      mk(new THREE.SphereGeometry(0.06, 8, 6), basic(0xffd23a), 0.12 * s, 0.05, 0.3, this.head, 0);
    }
    const grin = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 6, 12, Math.PI), basic(0xffd23a)); grin.position.set(0, -0.1, 0.3); grin.rotation.z = Math.PI; this.head.add(grin);
    mk(new THREE.SphereGeometry(0.35, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), black, 0, 0.06, 0, this.head, 0);
    mk(new THREE.BoxGeometry(0.4, 0.04, 0.32), black, 0, 0.08, 0.34, this.head, 0);
    this.arm = new THREE.Group(); this.arm.position.set(0.45, 1.65, 0); body.add(this.arm);
    mk(new THREE.CapsuleGeometry(0.1, 0.55, 4, 8), red, 0, -0.35, 0, this.arm);
    this.hand = new THREE.Group(); this.hand.position.y = -0.75; this.arm.add(this.hand);
    this.handGlow = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 10), basic(0xfff2e0, { transparent: true, opacity: 0, depthWrite: false })); this.hand.add(this.handGlow);
    const arm2 = new THREE.Group(); arm2.position.set(-0.45, 1.65, 0); body.add(arm2);
    mk(new THREE.CapsuleGeometry(0.1, 0.5, 4, 8), red, 0, -0.3, 0.1, arm2);
    mk(new THREE.SphereGeometry(0.2, 10, 8), toon(0x3a2a20), 0, -0.65, 0.15, arm2);   // glove
    const tail = mk(new THREE.CylinderGeometry(0.03, 0.05, 1, 6), red, 0, 0.8, -0.4, body, 0); tail.rotation.x = -0.9;
    mk(new THREE.ConeGeometry(0.1, 0.2, 3), red, 0, 1.25, -0.8, body, 0);
    this.core = buildKern(1.4); this.core.position.set(0, 3.1, 0); m.add(this.core);
    this.place(0);
  }
  handPos() { const v = V3(); this.hand.getWorldPosition(v); return v; }
  place(dt) {
    if (P.planet === this.a && dt > 0) {
      // hover in front of you, about 0.6 rad away, so he can always see you
      const ang = Math.acos(clamp(this.dir.dot(P.up), -1, 1));
      const tw = tangentTo(this.dir, P.up);
      const want = ang > 0.68 ? 1 : ang < 0.5 ? -1 : 0;
      if (want) stepDir(this.dir, tw, want * 4.5 * dt, this.a.r);
    }
    this.m.position.copy(surf(this.a, this.dir, this.alt + Math.sin(G.t * 1.6) * 0.25));
    const face = P.planet === this.a ? P.pos.clone().sub(this.m.position) : anyPerp(this.dir);
    orientOn(this.m, this.dir, face);
  }
  reset() {
    this.clearHaz(); this.hp = this.maxHp; this.dead = false; this.state = 'idle'; this.mv = null; this.queue = [];
    this.dt = 0; this.boomed = false; this.alt = 7.2;
    this.dir = V3(0, 1, 0); this.m.visible = true; this.body.rotation.set(0, 0, 0); this.m.scale.setScalar(1); this.core.visible = true; this.bar(false); this.place(0);
  }
  throwBall(kind, o = {}) {
    const p = this.phase, from = this.handPos();
    const chest = P.pos.clone().addScaledVector(P.up, 0.65).addScaledVector(P.vt, kind === 'fast' ? 0.25 : 0);
    const speed = kind === 'curve' ? [10, 11, 12][p] : [13.5, 15, 16.5][p] + (o.boost || 0);
    let v = chest.sub(from).normalize().multiplyScalar(speed);
    if (kind === 'curve') v.add(anyPerp(v.clone().normalize()).multiplyScalar(speed * 0.6 * (Math.random() < 0.5 ? -1 : 1)));
    const b = new Ball(this, from, v, kind, o);
    this.haz.push(b); sfx.swing();
    return b;
  }
  begin(mv) {
    this.wind = 0; this.thrown = false;
    if (mv === 'meteor') { sfx.warn(); for (let i = 0; i < 6; i++) this.haz.push(new Drop(this, frameDir(P.up, 90 - (i ? 10 + Math.random() * 18 : 0), Math.random() * 360), { delay: 1.0 + i * 0.28, radius: 1.4, model: meteor(), color: 0xff5a2a, from: 16 })); }
    if (mv === 'stomp') { sfx.warn(); }
    if (mv === 'grounders') { this.n = [0, 2, 3][this.phase]; this.nt = 0.5; sfx.warn(); G.toastOnce('zn-ground', 'GROUNDERS! He bats balls along the ground at you: JUMP over them.'); }
  }
  step(mv, dt) {
    const p = this.phase;
    if (mv === 'rest') { this.body.rotation.z = Math.sin(this.mt * 10) * 0.08; return this.mt < 1.1; }
    if (mv === 'grounders') {
      // a fan of three balls rolling over the ground from right under him
      this.nt -= dt; this.arm.rotation.x = this.nt < 0.25 ? 1.4 : -2.2 * Math.min(1, (0.5 - this.nt) / 0.5);
      if (this.nt <= 0 && this.n > 0) {
        const base = P.planet === this.a ? tangentTo(this.dir, P.up) : anyPerp(this.dir);
        for (const s of [-0.38, 0, 0.38]) this.haz.push(new Roller(this, this.dir, base.clone().applyAxisAngle(this.dir, s), { speed: [10, 11, 12.5][p], r: 0.55, model: rollBall(0.55, 0xfff2e0, 0xd8323a), color: 0xfff2e0 }));
        sfx.bat(); G.shake = 0.25; this.n--; this.nt = 1.3;
      }
      return this.n > 0 || this.mt < 1.6;
    }
    if (mv === 'meteor') return this.mt < 3;
    if (mv === 'stomp') {
      this.body.position.y = this.mt < 0.6 ? this.mt * 1.5 : Math.max(0, 0.9 - (this.mt - 0.6) * 9);
      if (this.mt > 0.7 && !this.thrown) { this.thrown = true; sfx.boom(); G.shake = 0.4; this.haz.push(new Wave(this, this.dir, { speed: [0.8, 0.8, 0.95][p], th0: 0.15, th1: 2.4, color: 0xff5a2a })); }
      return this.mt < 1.6;
    }
    // pitches: wind up, then throw
    const windT = mv === 'curve' ? 0.65 : [0.8, 0.7, 0.6][p];
    if (!this.thrown) {
      const k = Math.min(1, this.mt / windT);
      this.arm.rotation.x = -k * 2.6; this.body.rotation.y = -k * 0.5;
      this.handGlow.material.color.setHex(mv === 'curve' ? 0xb04aff : mv === 'split' ? 0xffd23a : 0xfff2e0);
      this.handGlow.material.opacity = k * 0.7;
      if (k >= 1) {
        this.thrown = true; this.mt = 0;
        this.arm.rotation.x = 1.2; this.body.rotation.y = 0.3; this.handGlow.material.opacity = 0;
        if (mv === 'fast') this.throwBall('fast');
        if (mv === 'curve') this.throwBall('curve');
        if (mv === 'rally') this.throwBall('fast', { rally: 1 + (Math.random() < 0.5 ? 1 : 0) });
        if (mv === 'split') this.throwBall('fast', {
          split: (ball) => {
            const v = ball.vel.clone(), side = anyPerp(v.clone().normalize());
            this.haz.push(new Ball(this, ball.pos, v.clone(), 'gold'));
            for (const s of [-1, 1]) this.haz.push(new Ball(this, ball.pos, v.clone().addScaledVector(side, v.length() * 0.35 * s).multiplyScalar(0.7), 'curve'));
            sfx.crack();
          },
        });
      }
      return true;
    }
    this.arm.rotation.x *= Math.exp(-dt * 4); this.body.rotation.y *= Math.exp(-dt * 4);
    // wait until the pitch is over
    return this.haz.some((h) => h instanceof Ball) && this.mt < 6 ? true : this.mt < 0.5;
  }
  ballBack(ball) {
    if (this.state !== 'fight') return;
    if (ball.rally > 0) {
      // he hits it back! Rally!
      sfx.bat(); this.arm.rotation.x = -2; G.toastOnce('zn-rally', 'He hit it back! Keep the rally going!');
      const v = P.pos.clone().addScaledVector(P.up, 0.65).sub(ball.pos).normalize().multiplyScalar(ball.speed + 2);
      const nb = new Ball(this, ball.pos, v, 'fast', { rally: ball.rally - 1 });
      this.haz.push(nb);
      return;
    }
    puff(this.m.position.clone(), 30, 0xffd23a, 6, 2);
    this.hit();
  }
  onHit() { this.body.rotation.z = 0.8; }
  update(dt, t) {
    this.place(this.state === 'fight' ? dt : 0);
    this.core.rotation.y += dt * 2;
    this.body.rotation.z *= Math.exp(-dt * 3);
    if (this.state === 'idle') { this.arm.rotation.x = Math.sin(t * 2) * 0.3; }
    if (this.state === 'dying') {
      this.dt = (this.dt || 0) + dt;
      this.alt = Math.max(0.8, 7.2 - this.dt * 3); this.body.rotation.x = Math.min(1.4, this.dt);
      if (Math.random() < dt * 30) puff(this.m.position.clone(), 2, Math.random() < 0.5 ? 0xff5a2a : 0x2b2440, 4, 2);
      if (this.dt > 2.4 && !this.boomed) { this.boomed = true; sfx.boom(); G.shake = 0.8; this.m.visible = false; puff(this.m.position.clone(), 50, 0xff5a2a, 8, 3); this.onWin && this.onWin(); }
    }
    this.tick(dt, t);
  }
  onPound() {}
}
function meteor() { const g = new THREE.Group(); mk(new THREE.DodecahedronGeometry(0.9, 0), toon(0x5a2a2a), 0, 0.9, 0, g, 1.06); mk(new THREE.SphereGeometry(1.3, 12, 10), basic(0xff5a2a, { transparent: true, opacity: 0.4, depthWrite: false }), 0, 0.9, 0, g, 0); return g; }
export { pfTest, ink };

// ======================================================================
// Boss 4: DENIZ, the Duke of Ice. An ice wizard with way too much aura, floating over his ice throne
// ======================================================================
// His aura shields him: touch it and you get frozen. After a few attacks he overcharges it and it SHATTERS.
// Then he drops onto his throne, out of breath: jump on his crown (or ground pound the throne) to hit him.
function icicle() {
  const g = new THREE.Group();
  const c = mk(new THREE.ConeGeometry(0.55, 2.4, 6), toon(0xbff2ff), 0, 1.2, 0, g, 1.06); c.rotation.x = Math.PI;
  mk(new THREE.OctahedronGeometry(0.3), basic(0xffffff), 0, 2.3, 0, g, 0);
  return g;
}
export class Deniz extends Boss {
  constructor(world, arena) {
    super(world, arena, { name: 'DENIZ', sub: 'The Duke of Ice · way too much aura', hp: 4 });
    this.B = V3(0, 1, 0);
    this.H = 4.4; this.alt = this.H; this.vuln = false;
    this.plans = [
      ['icicles', 'orbit', 'spikes', 'icicles', 'break'],
      ['orbit', 'gaze', 'spikes', 'icicles', 'orbit', 'break'],
      ['storm', 'spikes', 'gaze2', 'orbit', 'spikes', 'storm', 'break'],
    ];
    // the ice throne
    this.pf = world.addPlatform(arena, { dir: this.B, r: 1.7, h: 1.1, sides: 6, color: 0x9fd8ff, top: 0xe8fbff });
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const sp = mk(new THREE.OctahedronGeometry(0.3), toon(0xbff2ff), Math.sin(a) * 1.55, 1.4, Math.cos(a) * 1.55, this.pf.mesh, 1.08); sp.scale.y = 2.4; }
    const m = new THREE.Group(); this.m = m; this.g.add(m);
    const d = buildDeniz(); m.add(d.root); this.d = d;
    // THE AURA: glow layers, three spinning rune rings, orbiting ice shards and a pillar of light
    const add = (o) => { o.renderOrder = 2; m.add(o); return o; };
    const glowMat = (c, op) => basic(c, { transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending });
    this.aura = new THREE.Group(); m.add(this.aura);
    this.inner = new THREE.Mesh(new THREE.SphereGeometry(1.7, 24, 18), glowMat(0x7dfcff, 0.22)); this.inner.position.y = 1.5; this.aura.add(this.inner);
    this.outer = new THREE.Mesh(new THREE.SphereGeometry(2.5, 24, 18), glowMat(0x3a8aff, 0.12)); this.outer.position.y = 1.5; this.aura.add(this.outer);
    this.rings = [0, 1, 2].map((i) => {
      const rg = new THREE.Mesh(new THREE.TorusGeometry(1.9 + i * 0.35, 0.05, 6, 48), glowMat([0x9fe8ff, 0xffffff, 0x5ef2e0][i], 0.75));
      rg.position.y = 1.5; rg.rotation.set(Math.PI / 2 + i * 0.5, i * 0.7, 0); this.aura.add(rg); return rg;
    });
    this.shards = [];
    for (let i = 0; i < 8; i++) { const s = mk(new THREE.OctahedronGeometry(0.22), basic(i % 2 ? 0xffffff : 0x9fe8ff), 0, 0, 0, this.aura, 0); s.scale.y = 2; this.shards.push(s); }
    this.pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.4, 16, 20, 1, true), glowMat(0x7dfcff, 0.1)); this.pillar.position.y = 6; this.aura.add(this.pillar);
    void add;
    this.place(0, 0);
  }
  centre() { return surf(this.a, this.B, this.alt + 1.5); }
  place(dt, t) {
    const want = this.vuln ? this.pf.h : this.H;
    this.alt += (want - this.alt) * damp(this.vuln ? 9 : 3, dt || 0.016);
    const bobA = this.vuln ? 0 : Math.sin(G.t * 1.4) * 0.25;
    this.m.position.copy(surf(this.a, this.B, this.alt + bobA));
    const face = P.planet === this.a ? tangentTo(this.B, P.up) : anyPerp(this.B);
    orientOn(this.m, this.B, face);
    void t;
  }
  reset() {
    this.clearHaz(); this.hp = this.maxHp; this.dead = false; this.state = 'idle'; this.mv = null; this.queue = [];
    this.vuln = false; this.alt = this.H; this.dt = 0; this.boomed = false;
    this.m.visible = true; this.m.scale.setScalar(1); this.aura.visible = true; this.aura.scale.setScalar(1); this.d.r.rotation.set(0, 0, 0); this.d.root.rotation.set(0, 0, 0);
    this.bar(false); this.place(0, 0);
  }
  cast(on) { this.d.arms[1].rotation.x = on ? -2.2 : this.d.arms[1].rotation.x * 0.9; this.d.crystal.scale.setScalar(on ? 1.4 : 1); }
  begin(mv) {
    const p = this.phase;
    this.n = 0; this.nt = 0.3;
    if (mv === 'icicles') { this.n = [3, 4, 4][p]; }
    if (mv === 'frost') { this.n = [2, 3, 3][p]; this.nt = 0.2; }
    if (mv === 'spikes') { this.n = p >= 1 ? 2 : 1; this.nt = 0.2; }
    if (mv === 'storm') { sfx.warn(); for (let i = 0; i < 11; i++) this.haz.push(new Drop(this, frameDir(P.up, 90 - (i ? 6 + Math.random() * 26 : 0), Math.random() * 360), { delay: 1.0 + i * 0.2, radius: 1.3, model: icicle(), color: 0x7dfcff, from: 15 })); }
    if (mv === 'blizzard') { sfx.whoosh(); this.haz.push(new Sweep(this, this.B, { speed: [0.7, 0.85, 1.0][p], turns: 1, color: 0x9fe8ff })); }
    if (mv === 'blizzard2') {
      sfx.whoosh();
      const s1 = new Sweep(this, this.B, { speed: 0.8, turns: 1, color: 0x9fe8ff }), s2 = new Sweep(this, this.B, { speed: 0.8, turns: 1, color: 0xffffff });
      s2.phi = s1.phi + Math.PI; this.haz.push(s1, s2);
    }
    if (mv === 'break') { sfx.warn(); this.ms = 0; G.toastOnce('dz-aura', 'His aura is overloading… get ready!'); }
    if (mv === 'orbit') {
      this.haz.push(new Orbiter(this, this.B, { n: [5, 6, 6][p], spin: [0.8, 1.0, 1.15][p], life: [5, 5.5, 6][p] }));
      if (p >= 2) this.haz.push(new Orbiter(this, this.B, { n: 5, spin: -1.0, th0: 1.25, amp: 0.3, w: 1.7, life: 6 }));
      sfx.chime(); G.toastOnce('dz-orbit', 'Ice shards circle his throne! The ring breathes in and out: jump over them, or slip between.');
    }
    if (mv === 'gaze' || mv === 'gaze2') { this.n = [2, 2, 3][p] - 1; this.stare(mv === 'gaze2'); G.toastOnce('dz-gaze', 'His icy stare follows you… when it flashes, it FIRES. Step aside or jump!'); }
  }
  // a frozen beam over the ice, aimed at you. gaze2: two at once, in a V
  stare(two) {
    const p = this.phase, o = { aim: [1.4, 1.25, 1.1][p], fire: 0.7, color: 0x7dfcff, th0: 0.25, th1: 2.9 };
    if (two) { this.haz.push(new Beam(this, this.B, { ...o, off: -0.32 }), new Beam(this, this.B, { ...o, off: 0.32, color: 0xffffff })); }
    else this.haz.push(new Beam(this, this.B, o));
    sfx.chime();
  }
  spikeLine(spread) {
    const B = this.B, base = tangentTo(B, P.up);
    const t0 = base.clone().applyAxisAngle(B, spread);
    const d = B.clone(), t = t0.clone();
    stepDir(d, t, 2.4, this.a.r);
    for (let i = 0; i < 10; i++) {
      stepDir(d, t, 1.5, this.a.r); t.addScaledVector(d, -t.dot(d)).normalize();
      this.haz.push(new Spike(this, d, i * 0.11, 0x9fe8ff));
    }
  }
  step(mv, dt) {
    const p = this.phase;
    if (mv === 'icicles') {
      this.nt -= dt; this.cast(this.nt < 0.3);
      if (this.nt <= 0 && this.n > 0) {
        const delay = [1.15, 1.0, 0.85][p];
        const dirs = [P.up.clone(), frameDir(P.up, 70, Math.random() * 360), frameDir(P.up, 68, Math.random() * 360)];
        for (const dd of dirs) this.haz.push(new Drop(this, dd, { delay, radius: 1.6, model: icicle(), color: 0x7dfcff, from: 14 }));
        sfx.chime(); this.n--; this.nt = delay + 0.35;
      }
      return this.n > 0 || this.mt < 1;
    }
    if (mv === 'frost') {
      this.nt -= dt;
      if (this.nt <= 0 && this.n > 0) { this.haz.push(new Wave(this, this.B, { speed: [0.5, 0.58, 0.66][p], th0: 0.2, color: 0x7dfcff })); sfx.chime(); G.shake = Math.max(G.shake, 0.15); this.aura.scale.setScalar(1.25); this.n--; this.nt = [1.25, 1.0, 0.85][p]; }
      return this.n > 0 || this.mt < 2.2;
    }
    if (mv === 'spikes') {
      this.nt -= dt; this.cast(true);
      if (this.nt <= 0 && this.n > 0) {
        sfx.crack();
        if (p >= 2) { this.spikeLine(0); this.spikeLine(0.5); this.spikeLine(-0.5); }
        else if (p >= 1) { this.spikeLine(0.25); this.spikeLine(-0.25); }
        else this.spikeLine(0);
        this.n--; this.nt = 1.6;
      }
      return this.n > 0 || this.mt < 2.4;
    }
    if (mv === 'storm') return this.mt < 3.6;
    if (mv === 'orbit') { this.cast(Math.sin(this.mt * 3) > 0); return this.haz.some((h) => h instanceof Orbiter); }
    if (mv === 'gaze' || mv === 'gaze2') {
      this.cast(true);
      if (!this.haz.some((h) => h instanceof Beam)) { if (this.n > 0) { this.n--; this.stare(mv === 'gaze2'); } else return false; }
      return true;
    }
    if (mv === 'blizzard' || mv === 'blizzard2') return this.haz.some((h) => h instanceof Sweep);
    if (mv === 'break') {
      const tt = this.mt, hold = [4.6, 4.0, 3.4][p];
      if (tt < 1) {   // the aura swells and flickers…
        this.aura.scale.setScalar(1 + tt * 0.5);
        this.inner.material.opacity = 0.22 + Math.abs(Math.sin(tt * 30)) * 0.4;
        return true;
      }
      if (!this.vuln && tt < 1.1) {   // …and SHATTERS
        this.vuln = true; this.aura.visible = false; sfx.shatter(); G.shake = 0.7;
        puff(this.centre(), 60, 0x9fe8ff, 9, 3, this.B); puff(this.centre(), 30, 0xffffff, 6, 2, this.B);
        G.toastOnce('dz-break', 'AURA BREAK! Jump on his crown, or ground pound the throne!');
      }
      if (this.vuln && tt > hold + 1) {   // he gets his breath back
        this.vuln = false; this.aura.visible = true; this.aura.scale.setScalar(0.2); sfx.chime(); this.grace = 1.2;
        if (P.ground === this.pf) { bouncePlayer(10); P.vt.copy(tangentTo(this.B, P.up)).multiplyScalar(8); }
        return false;
      }
      return this.vuln;
    }
    return false;
  }
  hitHim() {
    if (!this.vuln || this.state !== 'fight') return;
    this.vuln = false;
    bouncePlayer(16); P.vt.copy(tangentTo(this.B, P.up)).multiplyScalar(7); P.inv = Math.max(P.inv, 1.2);
    puff(this.centre(), 40, 0x9fe8ff, 7, 2.5, this.B);
    this.aura.visible = true; this.aura.scale.setScalar(0.2); this.grace = 1.6;
    this.hit();
  }
  onHit() { this.d.root.rotation.z = 0.6; }
  update(dt, t) {
    this.place(dt, t);
    const d = this.d;
    // the aura never sits still
    this.aura.scale.setScalar(this.aura.scale.x + (1 - this.aura.scale.x) * damp(2.5, dt));
    this.rings.forEach((rg, i) => { rg.rotation.z += dt * (0.8 + i * 0.5) * (i % 2 ? -1 : 1); rg.rotation.x += dt * 0.3 * (i - 1); });
    this.shards.forEach((s, i) => { const a = t * 1.2 + (i / 8) * Math.PI * 2; s.position.set(Math.sin(a) * 2.2, 1.5 + Math.sin(t * 2 + i) * 0.6, Math.cos(a) * 2.2); s.rotation.y = a * 2; });
    this.outer.scale.setScalar(1 + Math.sin(t * 2.2) * 0.06); this.inner.material.opacity += (0.22 - this.inner.material.opacity) * damp(4, dt);
    this.pillar.material.opacity = 0.08 + Math.abs(Math.sin(t * 1.7)) * 0.08;
    d.crystal.rotation.y += dt * 2; d.ring.rotation.x = Math.PI / 2 + Math.sin(t * 2) * 0.3; d.orb.scale.setScalar(1 + Math.sin(t * 5) * 0.15);
    d.root.rotation.z *= Math.exp(-dt * 3);
    if (this.state !== 'dying') { d.arms[0].rotation.x = this.vuln ? 0.2 : -0.9 + Math.sin(t * 1.5) * 0.2; if (!this.mv || this.mv === 'frost' || this.mv === 'break') this.cast(false); }
    d.eyeM.color.setHex(this.vuln ? 0x8a9ab8 : 0x7dfcff);
    // out of breath on the throne
    d.r.rotation.x = this.vuln ? 0.35 + Math.sin(t * 6) * 0.05 : 0;
    if (Math.random() < dt * (this.vuln ? 4 : 26) && this.state !== 'dying') puff(this.centre().addScaledVector(anyPerp(this.B).applyAxisAngle(this.B, Math.random() * 6.28), Math.random() * 2), 1, Math.random() < 0.5 ? 0x9fe8ff : 0xffffff, 1.2, 1.5, this.B);
    if (this.state === 'fight' && P.planet === this.a && !P.dead) {
      if (!this.vuln) {
        // touching the aura freezes you
        this.grace = (this.grace || 0) - dt;
        if (this.grace <= 0 && P.pos.distanceTo(this.centre()) < 2.4) { hurtPlayer(this.centre()); bouncePlayer(10); }
      } else {
        // a stomp on his crown
        const arc = Math.acos(clamp(P.up.dot(this.B), -1, 1)) * this.a.r;
        if (arc < 1.3 && P.vr < 0 && P.alt > this.pf.h + 1.5 && P.alt < this.pf.h + 3.4) this.hitHim();
      }
    }
    if (this.state === 'dying') {
      this.dt = (this.dt || 0) + dt;
      d.root.rotation.y += dt * (4 + this.dt * 6); this.aura.visible = true; this.aura.scale.setScalar(1 + this.dt * 0.8);
      this.inner.material.opacity = 0.3 + Math.random() * 0.3;
      if (Math.random() < dt * 40) puff(this.centre(), 3, Math.random() < 0.5 ? 0x9fe8ff : 0xffffff, 6, 2, this.B);
      if (this.dt > 2.6 && !this.boomed) { this.boomed = true; sfx.shatter(); sfx.boom(); G.shake = 1; this.m.visible = false; puff(this.centre(), 80, 0x9fe8ff, 10, 4, this.B); this.onWin && this.onWin(); }
    }
    this.tick(dt, t);
  }
  onPound(pos, ground) { if (ground === this.pf && this.vuln) this.hitHim(); }
}

// ======================================================================
// Boss 5: LORCAN PECH, the Bad-Luck Leprechaun on the Rainbow Ring
// ======================================================================
// Between attacks he plays the shell game: he dives into one of his three pots of gold and shuffles them.
// Keep your eyes on the right pot (it sits a little lower and it hiccups), then land on it or ground pound it.
function goldCoin() {
  const g = new THREE.Group();
  const c = mk(new THREE.CylinderGeometry(1.0, 1.0, 0.25, 24), toon(0xffd23a), 0, 0.2, 0, g, 1.06); void c;
  mk(new THREE.CylinderGeometry(0.6, 0.6, 0.27, 24), toon(0xffe27a), 0, 0.2, 0, g, 0);
  return g;
}
export class Lorcan extends Boss {
  constructor(world, arena) {
    super(world, arena, { name: 'LORCAN PECH', sub: 'The Bad-Luck Leprechaun · three pots, one leprechaun', hp: 4 });
    this.B = V3(0, 1, 0);
    this.plans = [
      ['bounce', 'lucky', 'boulders', 'shuffle'],
      ['lucky', 'rainbow', 'bounce', 'boulders', 'shuffle'],
      ['boulders', 'rainbow', 'bounce', 'lucky', 'bounce', 'shuffle'],
    ];
    // his mossy rock at the pole
    this.rock = world.addPlatform(arena, { dir: this.B, r: 1.3, h: 1.4, sides: 7, color: 0x8a8a7a, top: 0x4aa84a });
    this.m = new THREE.Group(); this.g.add(this.m);
    this.l = buildLeprechaun(); this.m.add(this.l.root);
    // three pots of gold
    this.pots = [0, 1, 2].map((i) => {
      const a = i * 120;
      const pf = world.addPlatform(arena, { dir: frameDir(this.B, 58, a), r: 1.05, h: 1.25, color: 0x23232e, top: 0xffd23a, taper: 0.75 });
      mk(new THREE.TorusGeometry(1.05, 0.1, 6, 24), toon(0x3a3a48), 0, 1.25, 0, pf.mesh, 0).rotation.x = Math.PI / 2;
      for (let k = 0; k < 5; k++) { const c = mk(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 12), toon(0xffe27a), Math.sin(k * 2.3) * 0.5, 1.32 + k * 0.03, Math.cos(k * 2.3) * 0.5, pf.mesh, 0); c.rotation.z = k * 0.3; }
      return { pf, a, a0: a, lat: 58, sink: 0, hic: 0, h0: 1.25 };
    });
    this.rocks = []; this.inPot = -1; this.hop = null; this.ss = null;
    this.place(0, 0);
  }
  potDir(p) { return frameDir(this.B, p.lat, p.a); }
  placePots(dt) {
    for (const [i, p] of this.pots.entries()) {
      const d = this.potDir(p);
      p.pf.n.copy(d);
      // the pot with Lorcan inside sits a bit lower, and every so often it hiccups
      const want = this.inPot === i ? 0.14 : 0;
      p.sink += (want - p.sink) * damp(6, dt || 0.016);
      p.hic = Math.max(0, p.hic - (dt || 0));
      p.pf.h = p.h0 - p.sink;
      placeOn(p.pf.mesh, this.a, d, -p.sink + Math.sin(p.hic * 20) * p.hic * 0.5);
      p.pf.mesh.scale.set(1 + p.hic * 0.25, 1 - p.hic * 0.2, 1 + p.hic * 0.25);
    }
  }
  place(dt, t) {
    const l = this.l;
    let dir = this.B, alt = this.rock.h;
    if (this.hop) {   // hopping between his rock and a pot
      this.hop.t += dt || 0;
      const k = Math.min(1, this.hop.t / this.hop.dur);
      dir = this.hop.from.clone().lerp(this.hop.to, k).normalize();
      alt = this.hop.h0 + (this.hop.h1 - this.hop.h0) * k + Math.sin(k * Math.PI) * 3.2;
      if (k >= 1) { const cb = this.hop.done; this.hop = null; if (cb) cb(); }
    }
    this.m.position.copy(surf(this.a, dir, alt));
    orientOn(this.m, dir, P.planet === this.a ? tangentTo(dir, P.up) : anyPerp(dir));
    // a little jig
    const tt = t || 0;
    l.legs[0].rotation.x = Math.sin(tt * 9) * 0.6; l.legs[1].rotation.x = -Math.sin(tt * 9) * 0.6;
    l.body.position.y = Math.abs(Math.sin(tt * 9)) * 0.08;
    l.arms[1].rotation.z = 0.4 + Math.sin(tt * 9) * 0.3;
  }
  hopTo(from, to, h0, h1, dur, done) { this.hop = { from: from.clone(), to: to.clone(), h0, h1, dur, t: 0, done }; }
  reset() {
    this.clearHaz(); this.hp = this.maxHp; this.dead = false; this.state = 'idle'; this.mv = null; this.queue = [];
    for (const e of this.rocks) if (!e.dead) e.kill(true);
    this.rocks = []; this.inPot = -1; this.hop = null; this.ss = null; this.dt = 0; this.boomed = false;
    this.pots.forEach((p) => { p.a = p.a0; p.lat = 58; p.sink = 0; p.hic = 0; });
    this.m.visible = true; this.l.root.visible = true; this.l.root.rotation.set(0, 0, 0); this.m.scale.setScalar(1);
    this.bar(false); this.placePots(0); this.place(0, 0);
  }
  begin(mv) {
    const p = this.phase;
    this.n = 0; this.nt = 0.3;
    if (mv === 'coins') this.n = [3, 4, 4][p];
    if (mv === 'bounce') { this.n = [2, 3, 4][p]; this.nt = 0.4; G.toastOnce('lp-bounce', 'Lucky coins bounce after you! Watch the yellow circles: that’s where they land.'); }
    if (mv === 'lucky') { this.n = [2, 2, 3][p]; G.toastOnce('lp-lucky', 'Feeling lucky? Only the GREEN circle with the clover is safe. Run into it!'); }
    if (mv === 'clover') { this.n = [2, 3, 3][p]; this.nt = 0.2; }
    if (mv === 'rainbow') {
      sfx.whoosh();
      this.haz.push(new Sweep(this, this.B, { speed: [0.7, 0.85, 1.0][p], turns: 1, color: 0xff5ab4 }));
      if (p >= 1) { const s2 = new Sweep(this, this.B, { speed: [0.7, 0.85, 1.0][p], turns: 1, color: 0xffd23a }); s2.phi += Math.PI; this.haz.push(s2); }
    }
    if (mv === 'boulders') {
      sfx.warn(); G.toastOnce('lp-rocks', 'Bad luck is rolling your way! Step aside, then stomp the boulders.');
      for (let i = 0; i < [2, 3, 3][p]; i++) { const e = this.w.addEnemy(this.a, frameDir(this.B, 40, Math.random() * 360), 'boulder', { drops: 1, roam: 0.6, speedMul: [1, 1.1, 1.2][p] }); e.life = 7; this.rocks.push(e); }
    }
    if (mv === 'shuffle') {
      // dive into a random pot…
      const c = Math.floor(Math.random() * 3);
      this.ss = { stage: 'dive', c, swaps: [4, 6, 8][p], dur: [0.7, 0.52, 0.4][p], st: 0, sw: null, guess: [6, 5, 4.5][p], last: null };
      sfx.warn(); G.toastOnce('lp-shuffle', 'Three pots, one leprechaun! Keep your eyes on his pot…');
      const pot = this.pots[c];
      this.hopTo(this.B, this.potDir(pot), this.rock.h, pot.h0, 0.9, () => { this.inPot = c; this.l.root.visible = false; sfx.thud(); puff(surf(this.a, this.potDir(pot), 1.4), 14, 0xffd23a, 3, 1.5, this.potDir(pot)); });
    }
  }
  popOut(c, hit) {
    const pot = this.pots[c], d = this.potDir(pot);
    this.inPot = -1; this.l.root.visible = true; this.ss = null;
    puff(surf(this.a, d, 1.6), 30, 0xffd23a, 5, 2, d);
    this.hopTo(d, this.B, pot.h0, this.rock.h, 1.0, null);
    if (hit) this.l.root.rotation.z = 0.8;
  }
  step(mv, dt) {
    const p = this.phase;
    if (mv === 'coins') {
      this.nt -= dt; this.l.arms[0].rotation.x = this.nt < 0.3 ? -2.4 : -0.3;
      if (this.nt <= 0 && this.n > 0) {
        const delay = [1.1, 0.95, 0.8][p];
        const dirs = [P.up.clone(), frameDir(P.up, 70, Math.random() * 360), frameDir(P.up, 68, Math.random() * 360)];
        for (const dd of dirs) this.haz.push(new Drop(this, dd, { delay, radius: 1.6, model: goldCoin(), color: 0xffd23a, from: 14 }));
        sfx.coin(); this.n--; this.nt = delay + 0.35;
      }
      return this.n > 0 || this.mt < 1;
    }
    if (mv === 'clover') {
      this.nt -= dt;
      if (this.nt <= 0 && this.n > 0) { this.haz.push(new Wave(this, this.B, { speed: [0.5, 0.58, 0.66][p], th0: 0.2, color: 0x5cd85a })); sfx.bass(); this.n--; this.nt = [1.25, 1.0, 0.85][p]; }
      return this.n > 0 || this.mt < 2.2;
    }
    if (mv === 'rainbow') return this.haz.some((h) => h instanceof Sweep);
    if (mv === 'bounce') {
      this.nt -= dt; this.l.arms[0].rotation.x = this.nt < 0.3 ? -2.4 : -0.3;
      if (this.nt <= 0 && this.n > 0) { this.haz.push(new Bouncer(this, this.B, { hops: [4, 5, 6][p], hopT: [0.75, 0.65, 0.55][p] })); sfx.coin(); this.n--; this.nt = 0.9; }
      return this.n > 0 || this.haz.some((h) => h instanceof Bouncer);
    }
    if (mv === 'lucky') {
      if (!this.haz.some((h) => h instanceof Gamble)) {
        if (this.n <= 0) return false;
        // in the later phases the last round is a trick: the clover jumps!
        this.haz.push(new Gamble(this, { delay: [2.6, 2.3, 2.0][p], swap: p >= 1 && this.n === 1 })); this.n--; sfx.warn();
      }
      this.l.arms[1].rotation.z = 0.4 + Math.sin(this.mt * 12) * 0.5;
      return true;
    }
    if (mv === 'boulders') {
      for (const e of this.rocks) if (!e.dead) { e.life -= dt; if (e.life <= 0) e.kill(true); }
      return this.mt < 7 && this.rocks.some((e) => !e.dead);
    }
    if (mv === 'shuffle') {
      const s = this.ss; if (!s) return false;
      s.st += dt;
      if (s.stage === 'dive') { if (this.inPot >= 0 && !this.hop) { s.stage = 'mix'; s.st = 0; } return true; }
      if (s.stage === 'mix') {
        if (!s.sw) {
          if (s.swaps <= 0) { s.stage = 'guess'; s.st = 0; G.toastOnce('lp-guess', 'Which pot is he in? Land on it, or ground pound it!'); sfx.warn(); return true; }
          const i = Math.floor(Math.random() * 3), j = (i + 1 + Math.floor(Math.random() * 2)) % 3;
          s.sw = { i, j, ai: this.pots[i].a, aj: this.pots[j].a, t: 0 }; s.swaps--; sfx.swing();
        }
        const sw = s.sw; sw.t += dt;
        const k = Math.min(1, sw.t / s.dur), e = k * k * (3 - 2 * k), bulge = Math.sin(k * Math.PI) * 10;
        const pi = this.pots[sw.i], pj = this.pots[sw.j];
        pi.a = sw.ai + (sw.aj - sw.ai) * e; pj.a = sw.aj + (sw.ai - sw.aj) * e;
        pi.lat = 58 - bulge; pj.lat = 58 + bulge;
        if (k >= 1) { pi.a = sw.aj; pj.a = sw.ai; pi.lat = pj.lat = 58; s.sw = null; }
        // the right pot hiccups now and then, so sharp eyes can follow it
        if (Math.random() < dt * 1.2) { this.pots[s.c].hic = 0.35; }
        return true;
      }
      if (s.stage === 'guess') {
        if (Math.random() < dt * 0.9) this.pots[s.c].hic = 0.35;
        const g = P.grounded ? this.pots.findIndex((pp) => pp.pf === P.ground) : -1;
        if (g >= 0 && s.last !== g) { s.last = g; this.pick(g); return this.mv === 'shuffle'; }
        s.last = g;
        if (s.st > s.guess) { sfx.meow(); toast('Too slow! Lorcan sneaks out…', 1600); this.popOut(s.c, false); return false; }
        return true;
      }
    }
    return false;
  }
  pick(g) {
    const s = this.ss; if (!s) return;
    if (g === s.c) {
      bouncePlayer(15); P.vt.copy(tangentTo(this.potDir(this.pots[g]), P.up)).multiplyScalar(-6); P.inv = Math.max(P.inv, 1.2);
      this.popOut(g, true);
      this.hit();
    } else {
      // BAD LUCK: that pot was empty, and it bursts
      const d = this.potDir(this.pots[g]);
      sfx.boom(); G.shake = 0.5; puff(surf(this.a, d, 1.4), 30, 0x5cd85a, 6, 2, d);
      bouncePlayer(13); hurtPlayer(surf(this.a, d, 0));
      toast('BAD LUCK! Empty pot!', 1600);
      const c = s.c; setTimeout(() => { if (this.state === 'fight' && this.inPot === c) this.popOut(c, false); }, 500);
      this.mv = null; this.rest = 1.1;
    }
  }
  update(dt, t) {
    this.placePots(dt);
    this.place(dt, t);
    this.l.root.rotation.z *= Math.exp(-dt * 3);
    // the coin in his hand spins, and he leaves a trail of lucky sparkles
    this.l.coin.rotation.z += dt * 4;
    if (this.l.root.visible && Math.random() < dt * 8 && this.state !== 'dying') puff(this.m.position.clone().addScaledVector(this.B, 1), 1, Math.random() < 0.5 ? 0x5cd85a : 0xffd23a, 1, 1);
    // touching him while he's out of the pots hurts (he kicks)
    if (this.state === 'fight' && this.inPot < 0 && !this.hop && P.planet === this.a && !P.dead && P.pos.distanceTo(this.m.position.clone().addScaledVector(this.B, 0.8)) < 1.3) { hurtPlayer(this.m.position.clone()); bouncePlayer(10); }
    if (this.state === 'dying') {
      this.dt = (this.dt || 0) + dt;
      this.l.root.visible = true; this.l.root.rotation.y += dt * (5 + this.dt * 6);
      if (Math.random() < dt * 40) puff(this.m.position.clone().addScaledVector(this.B, 1), 3, Math.random() < 0.5 ? 0xffd23a : 0x5cd85a, 6, 3, this.B);
      if (this.dt > 2.4 && !this.boomed) { this.boomed = true; sfx.boom(); sfx.rare(); G.shake = 0.8; this.m.visible = false; puff(this.m.position.clone(), 60, 0xffd23a, 8, 4, this.B); this.onWin && this.onWin(); }
    }
    this.tick(dt, t);
  }
  onPound() {}
}

// ======================================================================
// Boss 6: KONING KOKOS, the gorilla king of Het Oerwoud, in the Apenarena
// ======================================================================
// He throws coconuts, beats his chest (shockwaves: jump over them), swings vines round the arena
// and sends Kokosrollen at you. Then he LEAPS at you: dodge the red circle. His fists get stuck
// in the mud, and that's your chance: jump on his head, or ground pound right next to him.
export class Kokos extends Boss {
  constructor(world, arena) {
    super(world, arena, { name: 'KONING KOKOS', sub: 'The gorilla king · way too many coconuts', hp: 4 });
    this.B = V3(0, 1, 0);
    this.plans = [
      ['walk', 'bowling', 'beat', 'leap'],
      ['swing', 'walk', 'bowling', 'beat', 'leap'],
      ['coco', 'swing', 'beat', 'bowling', 'walk', 'leap'],
    ];
    // tree stumps round the arena: something to hop on
    for (let i = 0; i < 5; i++) world.addPlatform(arena, { dir: frameDir(this.B, 62, i * 72 + 36), r: 1.1, h: 1.4, sides: 9, color: 0x6a4020, top: 0xc8a060 });
    this.k = buildGorilla(); this.m = this.k.root; this.g.add(this.m);
    this.rolls = [];
    this.home();
  }
  home() { this.dir = frameDir(this.B, 40, 0); this.fwd = anyPerp(this.dir); this.place(); }
  place(y = 0) { this.m.position.copy(surf(this.a, this.dir, y)); orientOn(this.m, this.dir, this.fwd); }
  steer(goal, k, dt) { const a = Math.atan2(new THREE.Vector3().crossVectors(this.fwd, goal).dot(this.dir), this.fwd.dot(goal)); this.fwd.applyAxisAngle(this.dir, a * damp(k, dt)); }
  walk(s, dt) { stepDir(this.dir, this.fwd, s * dt, this.a.r); this.fwd.addScaledVector(this.dir, -this.fwd.dot(this.dir)).normalize(); }
  pose(stuck) {
    const k = this.k;
    k.body.position.y = stuck ? -0.45 : 0; k.body.rotation.x = stuck ? 0.55 : 0;
    k.arms.forEach((a) => { a.rotation.set(stuck ? -1.4 : 0, 0, 0); });
  }
  reset() {
    this.clearHaz(); this.hp = this.maxHp; this.dead = false; this.state = 'idle'; this.mv = null; this.queue = [];
    for (const e of this.rolls) if (!e.dead) e.kill(true);
    this.rolls = []; this.dt = 0; this.boomed = false; this.ms = null; if (this.mk) { this.g.remove(this.mk); this.mk = null; }
    this.m.visible = true; this.m.scale.setScalar(1); this.k.r.rotation.set(0, 0, 0); this.pose(false);
    this.bar(false); this.home();
  }
  begin(mv) {
    const p = this.phase;
    this.n = 0; this.nt = 0.4;
    if (mv === 'coconuts') { this.n = [3, 4, 5][p]; G.toastOnce('kk-coco', 'Coconuts incoming! Keep moving out of the red circles.'); }
    if (mv === 'bowling') { this.n = [3, 4, 5][p]; this.nt = 0.6; G.toastOnce('kk-bowl', 'COCONUT BOWLING! He rolls them straight at you, one after the other: jump over them.'); }
    if (mv === 'swing') { this.n = [0, 2, 3][p]; this.ms = 'aim'; sfx.whoosh(); G.toastOnce('kk-swing', 'He grabs a vine and SWINGS through the arena! Jump over him when he comes past.'); }
    if (mv === 'beat') { this.n = [2, 3, 3][p]; this.nt = 0.7; sfx.warn(); G.toastOnce('kk-beat', 'He’s beating his chest! JUMP over the shockwaves.'); }
    if (mv === 'vines') {
      sfx.whoosh(); G.toastOnce('kk-vines', 'Swinging vines! Jump over them, or run ahead of them.');
      this.haz.push(new Sweep(this, this.B, { speed: [0.7, 0.8, 0.95][p], turns: 1, color: 0x5cc84a }));
      if (p >= 1) { const s2 = new Sweep(this, this.B, { speed: [0.7, 0.8, 0.95][p], turns: 1, color: 0x2a8a3a }); s2.phi += Math.PI; this.haz.push(s2); }
    }
    if (mv === 'coco') {
      sfx.warn();
      for (let i = 0; i < [2, 2, 3][p]; i++) { const e = this.w.addEnemy(this.a, frameDir(this.dir, 30, i * 120), 'coco', { drops: 1, roam: 0.6, speedMul: [1, 1.1, 1.2][p] }); e.life = 7; this.rolls.push(e); }
    }
    if (mv === 'leap') {
      this.from = this.dir.clone(); this.to = P.planet === this.a ? P.up.clone() : frameDir(this.B, 40, 180);
      this.mk = makeMarker(this.g, 2.4, 0xff3a5a); this.mk.place(this.a, this.to); this.ms = 'air'; sfx.warn();
      G.toastOnce('kk-leap', 'He’s leaping at you! Get out of the red circle!');
    }
  }
  step(mv, dt, t) {
    const p = this.phase, k = this.k, onMe = P.planet === this.a;
    if (mv === 'walk') {
      if (onMe) this.steer(tangentTo(this.dir, P.up), 3, dt);
      this.walk([2.4, 2.8, 3.2][p], dt);
      k.legs[0].rotation.x = Math.sin(this.mt * 7) * 0.5; k.legs[1].rotation.x = -Math.sin(this.mt * 7) * 0.5;
      k.arms[0].rotation.x = -Math.sin(this.mt * 7) * 0.4; k.arms[1].rotation.x = Math.sin(this.mt * 7) * 0.4;
      this.place(); this.touch(); return this.mt < 2.2;
    }
    if (mv === 'coconuts') {
      this.nt -= dt; k.arms[1].rotation.x = this.nt < 0.25 ? -2.6 : -0.4;
      if (onMe) this.steer(tangentTo(this.dir, P.up), 4, dt);
      this.place(); this.touch();
      if (this.nt <= 0 && this.n > 0) {
        const delay = [1.15, 1.0, 0.85][p];
        const dirs = [P.up.clone()]; if (p >= 1) dirs.push(frameDir(P.up, 72, Math.random() * 360));
        for (const dd of dirs) this.haz.push(new Drop(this, dd, { delay, radius: 1.5, model: buildCoconut(0.6), color: 0xff7a3a, from: 14 }));
        sfx.swing(); this.n--; this.nt = delay * 0.75;
      }
      return this.n > 0 || this.mt < 1.2;
    }
    if (mv === 'beat') {
      // drum, drum, drum on the chest, then BOOM: a shockwave
      const drum = Math.sin(this.mt * 22);
      k.arms[0].rotation.x = -1.3 + drum * 0.35; k.arms[1].rotation.x = -1.3 - drum * 0.35;
      k.arms[0].rotation.z = -0.5; k.arms[1].rotation.z = 0.5;
      this.place(); this.touch();
      this.nt -= dt;
      if (this.nt <= 0 && this.n > 0) {
        this.haz.push(new Wave(this, this.dir, { speed: [0.62, 0.7, 0.8][p], th0: 0.18, color: 0xffb03a, h: 0.8 }));
        sfx.boom(); G.shake = Math.max(G.shake, 0.35); puff(surf(this.a, this.dir, 0.3), 16, 0xc8a060, 5, 0.6, this.dir);
        this.n--; this.nt = [1.4, 1.15, 1.0][p];
      }
      if (this.n <= 0 && this.mt > 2.4) { k.arms.forEach((a) => a.rotation.set(0, 0, 0)); return false; }
      return true;
    }
    if (mv === 'bowling') {
      // one coconut at a time, every one aimed at where you are now
      if (onMe) this.steer(tangentTo(this.dir, P.up), 6, dt);
      this.nt -= dt; k.arms[1].rotation.x = this.nt < 0.3 ? 0.8 : -1.6 * Math.min(1, this.mt);
      this.place(); this.touch();
      if (this.nt <= 0 && this.n > 0) {
        const f = onMe ? tangentTo(this.dir, P.up) : this.fwd.clone();
        this.haz.push(new Roller(this, stepDir(this.dir.clone(), f, 2.2, this.a.r), f, { speed: [8, 9, 10][p], r: 0.85, model: rollBall(0.85, 0x8a5a34, 0x5a3a20), color: 0xc8a060 }));
        sfx.swing(); this.n--; this.nt = [1.1, 0.9, 0.75][p];
      }
      return this.n > 0 || this.mt < 1.2;
    }
    if (mv === 'swing') {
      // aim at you, then swing straight through on a vine, low over the ground
      k.arms[0].rotation.x = k.arms[1].rotation.x = -3;
      if (this.ms === 'aim') {
        if (onMe) this.steer(tangentTo(this.dir, P.up), 8, dt);
        this.place(Math.min(1, this.mt / 0.6) * 0.5); this.touch();
        if (this.mt > 0.7) { this.ms = 'go'; this.mt = 0; sfx.whoosh(); }
        return true;
      }
      this.walk([0, 12, 13][p], dt); this.place(0.5 + Math.sin(Math.min(1, this.mt / 1.5) * Math.PI) * 0.8);
      k.r.rotation.x = -0.4;
      if (Math.random() < dt * 20) puff(surf(this.a, this.dir, 0.4), 1, 0x5cc84a, 2, 0.6, this.dir);
      if (onMe && arcTo(this.a, P.up, this.dir) < 1.8 && P.alt < 1.5) hurtPlayer(surf(this.a, this.dir, 0), 12);
      if (this.mt > 1.5) {
        k.r.rotation.x = 0; this.place();
        if (--this.n <= 0) { k.arms.forEach((a) => a.rotation.set(0, 0, 0)); return false; }
        this.ms = 'aim'; this.mt = 0;
      }
      return true;
    }
    if (mv === 'vines') { k.arms[0].rotation.x = k.arms[1].rotation.x = -2.8 + Math.sin(this.mt * 6) * 0.3; this.place(); this.touch(); const busy = this.haz.some((h) => h instanceof Sweep); if (!busy) k.arms.forEach((a) => a.rotation.set(0, 0, 0)); return busy; }
    if (mv === 'coco') {
      for (const e of this.rolls) if (!e.dead) { e.life -= dt; if (e.life <= 0) e.kill(true); }
      k.r.rotation.z = Math.sin(this.mt * 8) * 0.06; this.place(); this.touch();
      const busy = this.mt < 7 && this.rolls.some((e) => !e.dead);
      if (!busy) k.r.rotation.z = 0;
      return busy;
    }
    if (mv === 'leap') {
      if (this.ms === 'air') {
        const air = [1.25, 1.1, 0.95][p], kk = Math.min(1, this.mt / air);
        this.mk.pulse(this.mt * 14);
        this.dir.copy(this.from.clone().lerp(this.to, kk).normalize());
        if (kk < 0.95) this.fwd.copy(tangentTo(this.dir, this.to));
        this.place(Math.sin(kk * Math.PI) * 9);
        k.arms.forEach((a) => (a.rotation.x = -2.6 * (1 - kk)));
        if (kk >= 1) {
          this.g.remove(this.mk); this.mk = null; sfx.boom(); G.shake = 0.8;
          puff(surf(this.a, this.dir, 0.3), 34, 0x8a5a34, 7, 1, this.dir);
          if (onMe && arcTo(this.a, P.up, this.dir) < 2.6 && P.alt < 2) hurtPlayer(surf(this.a, this.dir, 0));
          if (p >= 1) this.haz.push(new Wave(this, this.dir, { speed: 0.8, th0: 0.2, th1: 1.6, color: 0x8a5a34, h: 0.7 }));
          this.ms = 'stuck'; this.mt = 0; this.pose(true); sfx.thud();
          G.toastOnce('kk-stuck', 'His fists are stuck in the mud! JUMP on his head, or ground pound next to him!');
        }
        return true;
      }
      if (this.ms === 'stuck') {
        const hold = [3.4, 2.9, 2.5][p];
        k.r.rotation.z = Math.sin(this.mt * 14) * 0.05;
        if (Math.random() < dt * 8) puff(this.m.position.clone().addScaledVector(this.dir, 3.4), 1, 0xffe27a, 1.5, 0.3, this.dir);   // dizzy stars
        k.eyeM.color.setHex(Math.sin(this.mt * 12) > 0 ? 0xffffff : 0xffd23a);
        if (onMe && arcTo(this.a, P.up, this.dir) < 2.2 && P.alt > 1.5 && P.vr <= 0) { bouncePlayer(16); this.unstick(); this.hit(); return false; }
        if (this.mt > hold) { this.unstick(); sfx.whoosh(); return false; }
        return true;
      }
    }
    return false;
  }
  unstick() { this.ms = null; this.pose(false); this.k.r.rotation.z = 0; this.k.eyeM.color.setHex(0xffd23a); }
  touch() {
    if (P.planet !== this.a || P.dead) return;
    if (arcTo(this.a, P.up, this.dir) < 1.9 && P.alt < 3.0) hurtPlayer(surf(this.a, this.dir, 0), 10);
  }
  onPound(pos) {
    if (this.mv === 'leap' && this.ms === 'stuck' && P.planet === this.a && arcTo(this.a, P.up, this.dir) < 3.4) { bouncePlayer(14); this.unstick(); this.hit(); }
  }
  update(dt, t) {
    const k = this.k;
    if (this.state === 'idle') { k.body.position.y = Math.sin(t * 1.6) * 0.04; k.head.rotation.y = Math.sin(t * 0.8) * 0.3; }
    if (this.state === 'dying') {
      this.dt = (this.dt || 0) + dt;
      k.r.rotation.x = -Math.min(1.4, this.dt * 0.9);
      if (Math.random() < dt * 20) puff(this.m.position.clone().addScaledVector(this.dir, 3), 2, 0xffe27a, 2, 1, this.dir);
      if (this.dt > 2.4 && !this.boomed) { this.boomed = true; sfx.win(); G.shake = 0.6; this.onWin && this.onWin(); }
    }
    this.tick(dt, t);
  }
}

// shared bits for the walking bosses below
function walker(b) {
  b.place = (y = 0) => { b.m.position.copy(surf(b.a, b.dir, y)); orientOn(b.m, b.dir, b.fwd); };
  b.steer = (goal, k, dt) => { const a = Math.atan2(new THREE.Vector3().crossVectors(b.fwd, goal).dot(b.dir), b.fwd.dot(goal)); b.fwd.applyAxisAngle(b.dir, a * damp(k, dt)); };
  b.walk = (s, dt) => { stepDir(b.dir, b.fwd, s * dt, b.a.r); b.fwd.addScaledVector(b.dir, -b.fwd.dot(b.dir)).normalize(); };
  b.ahead = (dist) => { const d = b.dir.clone(), f = b.fwd.clone(); stepDir(d, f, dist, b.a.r); return d; };
  b.bodyTouch = (rad = 1.9, h = 3) => { if (P.planet === b.a && !P.dead && arcTo(b.a, P.up, b.dir) < rad && P.alt < h) hurtPlayer(surf(b.a, b.dir, 0), 10); };
}
function rockBall() { const g = new THREE.Group(); mk(new THREE.DodecahedronGeometry(0.6, 0), toon(0x3a3038), 0, 0.6, 0, g, 1.06); mk(new THREE.SphereGeometry(0.9, 10, 8), basic(0xff7a2a, { transparent: true, opacity: 0.35, depthWrite: false }), 0, 0.6, 0, g, 0); return g; }
function sandBall() { const g = new THREE.Group(); mk(new THREE.SphereGeometry(0.6, 12, 10), toon(0xd8b070), 0, 0.6, 0, g, 1.06); return g; }
function missile() { const g = new THREE.Group(); const b = mk(new THREE.CylinderGeometry(0.2, 0.2, 1.0, 10), toon(0xf4f1ea), 0, 0.7, 0, g, 1.06); void b; mk(new THREE.ConeGeometry(0.2, 0.4, 10), toon(0xff3a5a), 0, 0, 0, g, 1.06).rotation.x = Math.PI; mk(new THREE.ConeGeometry(0.3, 0.3, 3), toon(0x3a3640), 0, 1.15, 0, g, 0); return g; }

// ======================================================================
// Boss 7: SMEUL, the fire dragon of De Asberg, on the Krater Kroon
// ======================================================================
// Meteors, fireballs from the sky, stomps that send out lava waves, and a long flame breath that sweeps
// round him. After the breath he's out of breath: his head drops to the ground. Jump on it!
export class Smeul extends Boss {
  constructor(world, arena) {
    super(world, arena, { name: 'SMEUL', sub: 'The fire dragon · hot-headed, literally', hp: 4 });
    this.B = V3(0, 1, 0);
    this.plans = [['firetrail', 'breath'], ['fly', 'erupt', 'breath'], ['fly', 'firetrail', 'erupt', 'breath']];
    for (let i = 0; i < 4; i++) world.addPlatform(arena, { dir: frameDir(this.B, 64, i * 90 + 45), r: 1.2, h: 1.2, sides: 7, color: 0x3a3038, top: 0x5a4a50 });
    this.k = buildDragon(); this.m = this.k.root; this.g.add(this.m);
    walker(this); this.home();
  }
  home() { this.dir = frameDir(this.B, 30, 0); this.fwd = anyPerp(this.dir); this.place(); }
  reset() {
    this.clearHaz(); this.hp = this.maxHp; this.dead = false; this.state = 'idle'; this.mv = null; this.queue = []; this.dt = 0; this.boomed = false; this.ms = null;
    this.m.visible = true; this.k.r.rotation.set(0, 0, 0); this.k.neck.rotation.set(0, 0, 0); this.k.flame.visible = false; this.k.eyeM.color.setHex(0xffe14a);
    this.bar(false); this.home();
  }
  begin(mv) {
    const p = this.phase; this.n = 0; this.nt = 0.4; this.ms = null;
    if (mv === 'meteors') { this.n = [4, 5, 6][p]; sfx.warn(); G.toastOnce('sm-met', 'Meteors! Watch the red circles.'); }
    if (mv === 'fly') { this.n = [0, 5, 7][p]; this.ms = 'up'; sfx.whoosh(); G.toastOnce('sm-fly', 'He’s flying! Fireballs rain down where you stand. Keep moving!'); }
    if (mv === 'quake') { this.n = [2, 2, 3][p]; this.nt = 0.6; sfx.warn(); G.toastOnce('sm-quake', 'Lava waves! JUMP over them.'); }
    if (mv === 'breath') { this.ms = 'aim'; sfx.warn(); G.toastOnce('sm-breath', 'FLAME BREATH! Jump over the fire, or run ahead of it. Afterwards he’s out of breath…'); }
    if (mv === 'firetrail') { this.acc = 0; sfx.warn(); G.toastOnce('sm-trail', 'He’s running circles round you and leaving FIRE behind! Don’t get boxed in.'); }
    if (mv === 'erupt') {
      // three arms of lava pillars spiral out of the ground from where he stands
      const a0 = Math.random() * 360;
      for (let arm = 0; arm < 3; arm++) for (let i = 0; i < [0, 9, 11][p]; i++) {
        const d = frameDir(this.dir, latOf(this.a, 2.4 + i * 1.25), a0 + arm * 120 + i * 24);
        this.haz.push(new Spike(this, d, 0.3 + i * [0.14, 0.13, 0.11][p] + arm * 0.05, 0xff7a2a));
      }
      sfx.boom(); G.shake = 0.5; G.toastOnce('sm-erupt', 'Lava pillars spiral out of the ground! Find the gaps between the arms.');
    }
  }
  step(mv, dt) {
    const p = this.phase, k = this.k, onMe = P.planet === this.a;
    if (mv === 'meteors') {
      if (onMe) this.steer(tangentTo(this.dir, P.up), 4, dt);
      k.neck.rotation.x = -0.5 + Math.sin(this.mt * 8) * 0.1; this.place(); this.bodyTouch();
      this.nt -= dt;
      if (this.nt <= 0 && this.n > 0) {
        const delay = [1.15, 1.0, 0.9][p];
        this.haz.push(new Drop(this, P.up.clone(), { delay, radius: 1.5, model: rockBall(), color: 0xff7a2a, from: 15 }));
        this.haz.push(new Drop(this, frameDir(P.up, 70, Math.random() * 360), { delay: delay + 0.2, radius: 1.5, model: rockBall(), color: 0xff7a2a, from: 15 }));
        sfx.boom(); this.n--; this.nt = delay * 0.7;
      }
      if (this.n <= 0 && this.mt > 2) { k.neck.rotation.x = 0; return false; }
      return true;
    }
    if (mv === 'firetrail') {
      // runs a wide curve round you on all fours, leaving burning patches behind
      if (onMe) { const to = tangentTo(this.dir, P.up), side = new THREE.Vector3().crossVectors(this.dir, to); this.steer(to.multiplyScalar(0.55).addScaledVector(side, 0.85).normalize(), 2.2, dt); }
      const sp = [6.5, 7, 7.8][p]; this.walk(sp, dt);
      k.r.rotation.x = 0.25; k.neck.rotation.x = 0.4; const flap = Math.sin(this.mt * 10) * 0.3; k.wings[0].rotation.z = flap; k.wings[1].rotation.z = -flap;
      this.place(); this.bodyTouch();
      this.acc += sp * dt;
      if (this.acc > 1.15) { this.acc = 0; this.haz.push(new FirePatch(this, this.dir, [3.4, 3.8, 4.2][p])); }
      if (this.mt > [3.6, 4, 4.6][p]) { k.r.rotation.x = 0; k.neck.rotation.x = 0; k.wings.forEach((w) => (w.rotation.z = 0)); return false; }
      return true;
    }
    if (mv === 'erupt') {
      // roars at the sky while the lava comes up
      k.neck.rotation.x = -0.7; k.jaw.rotation.x = 0.5 + Math.sin(this.mt * 20) * 0.1; this.place(); this.bodyTouch();
      if (this.mt > 2.6) { k.neck.rotation.x = 0; k.jaw.rotation.x = 0; return false; }
      return true;
    }
    if (mv === 'fly') {
      const wing = Math.sin(this.mt * 12) * 0.6; k.wings[0].rotation.z = wing; k.wings[1].rotation.z = -wing;      if (this.ms === 'up') { this.place(Math.min(1, this.mt / 0.8) * 8); if (this.mt > 0.8) { this.ms = 'air'; this.mt = 0; } return true; }
      if (this.ms === 'air') {
        if (onMe) this.steer(tangentTo(this.dir, P.up), 2, dt);
        this.walk(5, dt); this.place(8 + Math.sin(this.mt * 3) * 0.5);
        this.nt -= dt;
        if (this.nt <= 0 && this.n > 0) { this.haz.push(new Drop(this, P.up.clone(), { delay: [1, 0.95, 0.85][p], radius: 1.3, model: rockBall(), color: 0xff3a2a, from: 9 })); sfx.whoosh(); this.n--; this.nt = 0.75; }
        if (this.n <= 0 && this.mt > 1.5) { this.ms = 'down'; this.mt = 0; }
        return true;
      }
      this.place(Math.max(0, 1 - this.mt / 0.7) * 8);
      if (this.mt > 0.7) { sfx.thud(); G.shake = 0.5; puff(surf(this.a, this.dir, 0.3), 20, 0x5a4a50, 5, 0.6, this.dir); k.wings.forEach((w) => (w.rotation.z = 0)); this.bodyTouch(2.4, 2); return false; }
      return true;
    }
    if (mv === 'quake') {
      k.r.rotation.x = Math.sin(this.mt * 6) * 0.08; this.place(); this.bodyTouch();
      this.nt -= dt;
      if (this.nt <= 0 && this.n > 0) { this.haz.push(new Wave(this, this.dir, { speed: [0.6, 0.7, 0.8][p], th0: 0.2, color: 0xff6a2a, h: 0.8 })); sfx.boom(); G.shake = 0.4; this.n--; this.nt = [1.4, 1.2, 1.0][p]; }
      if (this.n <= 0 && this.mt > 2.4) { k.r.rotation.x = 0; return false; }
      return true;
    }
    if (mv === 'breath') {
      if (this.ms === 'aim') { k.neck.rotation.x = -Math.min(1, this.mt / 0.8) * 0.6; k.jaw.rotation.x = Math.min(1, this.mt / 0.8) * 0.5; this.place(); this.bodyTouch(); if (this.mt > 0.9) { this.ms = 'fire'; this.mt = 0; k.flame.visible = true; this.haz.push(new Sweep(this, this.dir, { speed: [0.75, 0.85, 1.0][p], turns: [1, 1, 1.5][p], color: 0xff7a2a })); sfx.whoosh(); } return true; }
      if (this.ms === 'fire') {
        k.flame.scale.set(1 + Math.sin(this.mt * 40) * 0.1, 1, 1);
        if (Math.random() < dt * 20) puff(this.m.position.clone().addScaledVector(this.dir, 3), 1, 0xff9a2a, 3, 0.5);
        this.bodyTouch();
        if (!this.haz.some((h) => h instanceof Sweep)) { this.ms = 'tired'; this.mt = 0; k.flame.visible = false; sfx.thud(); G.toastOnce('sm-tired', 'He’s out of breath! JUMP on his head!'); }
        return true;
      }
      if (this.ms === 'tired') {
        // the head lies on the ground in front of him, panting
        k.neck.rotation.x += (1.3 - k.neck.rotation.x) * damp(6, dt); k.jaw.rotation.x = Math.abs(Math.sin(this.mt * 6)) * 0.4;
        k.eyeM.color.setHex(Math.sin(this.mt * 12) > 0 ? 0xffffff : 0xffe14a);
        if (Math.random() < dt * 6) puff(surf(this.a, this.ahead(2.6), 1.6), 1, 0x8a8a8a, 1.5, 0.6, this.dir);
        const hd = this.ahead(2.6);
        if (onMe && arcTo(this.a, P.up, hd) < 1.5 && P.alt > 0.6 && P.vr <= 0) { bouncePlayer(16); this.wake(); this.hit(); return false; }
        if (this.mt > [3.4, 2.9, 2.5][p]) { this.wake(); return false; }
        return true;
      }
    }
    return false;
  }
  wake() { this.ms = null; this.k.neck.rotation.set(0, 0, 0); this.k.jaw.rotation.x = 0; this.k.eyeM.color.setHex(0xffe14a); }
  onPound() { if (this.mv === 'breath' && this.ms === 'tired' && P.planet === this.a && arcTo(this.a, P.up, this.ahead(2.6)) < 2.4) { bouncePlayer(14); this.wake(); this.hit(); } }
  update(dt, t) {
    const k = this.k;
    if (this.state === 'idle') { k.neck.rotation.y = Math.sin(t * 0.8) * 0.3; k.tail.rotation.y = Math.sin(t * 1.5) * 0.3; }
    else k.tail.rotation.y = Math.sin(t * 3) * 0.4;
    if (this.state === 'dying') {
      this.dt = (this.dt || 0) + dt; k.r.rotation.z = Math.min(1.5, this.dt);
      if (Math.random() < dt * 20) puff(this.m.position.clone().addScaledVector(this.dir, 2.5), 2, 0xffe27a, 2, 1, this.dir);
      if (this.dt > 2.4 && !this.boomed) { this.boomed = true; sfx.win(); G.shake = 0.6; this.onWin && this.onWin(); }
    }
    this.tick(dt, t);
  }
}

// ======================================================================
// Boss 8: GRUIZEL, the giant sandworm of Duinenrijk, in the Zandkuil
// ======================================================================
// He swims through the sand. A dust trail hunts you, then he BURSTS up under you (get out of the circle!),
// sways a moment and smacks down flat on the sand: run to his head and jump on it.
export class Gruizel extends Boss {
  constructor(world, arena) {
    super(world, arena, { name: 'GRUIZEL', sub: 'The giant sandworm · always hungry', hp: 4 });
    this.B = V3(0, 1, 0);
    this.plans = [['spit', 'hunt'], ['dive', 'spit', 'hunt'], ['shark', 'dive', 'spit', 'hunt']];
    for (let i = 0; i < 4; i++) world.addPlatform(arena, { dir: frameDir(this.B, 60, i * 90 + 45), r: 1.0, h: 1.4, sides: 8, color: 0xc8945a, top: 0xe8c890 });
    this.k = buildWorm(); this.m = new THREE.Group(); this.m.add(this.k.root); this.g.add(this.m);   // an extra group, so tipping him over survives orientOn
    walker(this); this.home();
  }
  home() { this.dir = this.B.clone(); this.fwd = anyPerp(this.dir); this.under(); }
  under() { this.up = false; this.m.visible = false; this.k.root.rotation.set(0, 0, 0); this.place(-8); }
  reset() {
    this.clearHaz(); this.hp = this.maxHp; this.dead = false; this.state = 'idle'; this.mv = null; this.queue = []; this.dt = 0; this.boomed = false; this.ms = null;
    if (this.mk) { this.g.remove(this.mk); this.mk = null; }
    this.k.eyeM.color.setHex(0x5ef2e0); this.bar(false); this.home(); this.m.visible = true; this.rise(1);
  }
  rise(k) { this.m.visible = true; this.place(-7.5 * (1 - k)); }
  begin(mv) {
    const p = this.phase; this.n = 0; this.nt = 0.4; this.ms = null;
    if (mv === 'spit') { this.ms = 'up'; this.n = [3, 4, 5][p]; this.dir.copy(frameDir(this.B, Math.random() * 30, Math.random() * 360)); this.fwd = tangentTo(this.dir, P.planet === this.a ? P.up : this.B); }
    if (mv === 'quake') { this.under(); this.n = [3, 3, 4][p]; this.nt = 0.5; sfx.warn(); G.toastOnce('gz-quake', 'Sand waves! JUMP over them.'); }
    if (mv === 'tail') { this.under(); sfx.whoosh(); G.toastOnce('gz-tail', 'His tail sweeps through the sand! Jump over it.'); this.haz.push(new Sweep(this, this.B, { speed: [0.8, 0.9, 1.0][p], turns: 1, color: 0xd8a868 })); if (p >= 2) { const s2 = new Sweep(this, this.B, { speed: 0.9, turns: 1, color: 0xc8945a }); s2.phi += Math.PI; this.haz.push(s2); } }
    if (mv === 'hunt') { this.under(); this.ms = 'trail'; this.dir.copy(frameDir(P.planet === this.a ? P.up : this.B, 70, Math.random() * 360)); this.fwd = anyPerp(this.dir); sfx.warn(); G.toastOnce('gz-hunt', 'He’s hunting you under the sand! When the circle shows up: GET OUT!'); }
    if (mv === 'dive') {
      this.under(); this.n = [0, 3, 4][p]; this.diveMark();
      G.toastOnce('gz-dive', 'He leaps out of the sand like a dolphin, again and again! Get out of the circles.');
    }
    if (mv === 'shark') {
      this.under(); this.n = [0, 0, 3][p]; this.nt = 0;
      G.toastOnce('gz-shark', 'Sand sharks! Their fins chase you through the sand: zigzag, or jump over them.');
    }
  }
  // the next dolphin leap: from where he is to a circle where you are
  diveMark() {
    this.from = this.dir.clone();
    this.to = P.planet === this.a ? P.up.clone() : frameDir(this.B, 50, Math.random() * 360);
    if (arcTo(this.a, this.from, this.to) < 3) this.from = frameDir(this.to, latOf(this.a, 7), Math.random() * 360);
    if (this.mk) this.g.remove(this.mk);
    this.mk = makeMarker(this.g, 2.2, 0xff3a5a); this.mk.place(this.a, this.to); this.ms = 'mark'; this.mt = 0; sfx.warn();
  }
  step(mv, dt) {
    const p = this.phase, k = this.k, onMe = P.planet === this.a;
    if (mv === 'spit') {
      if (this.ms === 'up') { this.rise(Math.min(1, this.mt / 0.6)); if (this.mt > 0.6) { this.ms = 'spit'; this.mt = 0; G.shake = 0.3; puff(surf(this.a, this.dir, 0.3), 24, 0xd8b070, 5, 1, this.dir); } return true; }
      if (this.ms === 'spit') {
        if (onMe) this.steer(tangentTo(this.dir, P.up), 5, dt);
        k.root.rotation.x = Math.sin(this.mt * 3) * 0.12; this.place(); this.bodyTouch(1.6, 7);
        this.nt -= dt;
        if (this.nt <= 0 && this.n > 0) { this.haz.push(new Drop(this, P.up.clone(), { delay: [1.1, 1.0, 0.85][p], radius: 1.5, model: sandBall(), color: 0xff7a3a, from: 13 })); sfx.whoosh(); this.n--; this.nt = [0.9, 0.8, 0.7][p]; }
        if (this.n <= 0 && this.mt > 1.6) { this.ms = 'down'; this.mt = 0; }
        return true;
      }
      this.rise(Math.max(0, 1 - this.mt / 0.6)); if (this.mt > 0.6) { this.under(); return false; } return true;
    }
    if (mv === 'quake') {
      this.nt -= dt;
      if (this.nt <= 0 && this.n > 0) { const at = frameDir(P.planet === this.a ? P.up : this.B, 50 + Math.random() * 20, Math.random() * 360); this.haz.push(new Wave(this, at, { speed: [0.6, 0.7, 0.78][p], th0: 0.15, th1: 1.8, color: 0xd8a868, h: 0.75 })); sfx.boom(); G.shake = 0.35; puff(surf(this.a, at, 0.3), 16, 0xd8b070, 4, 0.6, at); this.n--; this.nt = [1.4, 1.2, 1.0][p]; }
      return this.n > 0 || this.mt < 3;
    }
    if (mv === 'tail') return this.haz.some((h) => h instanceof Sweep);
    if (mv === 'dive') {
      if (this.ms === 'mark') { this.mk.pulse(this.mt * 14); if (this.mt > [0.9, 0.75, 0.65][p]) { this.ms = 'air'; this.mt = 0; puff(surf(this.a, this.from, 0.3), 24, 0xd8b070, 6, 1.5, this.from); sfx.whoosh(); } return true; }
      if (this.ms === 'air') {
        // a big arc through the air, head first, then down into the circle
        const air = 0.95, kk = Math.min(1, this.mt / air);
        this.dir.copy(this.from).lerp(this.to, kk).normalize(); this.fwd = tangentTo(this.dir, this.to);
        this.m.visible = true; this.place(Math.sin(kk * Math.PI) * 7 - 5 * (1 - Math.sin(kk * Math.PI)));
        k.root.rotation.x = -1.2 + kk * 2.4;
        if (kk >= 1) {
          this.g.remove(this.mk); this.mk = null; sfx.boom(); G.shake = 0.7; puff(surf(this.a, this.to, 0.3), 30, 0xd8b070, 7, 2, this.to);
          if (onMe && arcTo(this.a, P.up, this.to) < 2.3 && P.alt < 3) { hurtPlayer(surf(this.a, this.to, 0)); bouncePlayer(12); }
          this.under(); this.dir.copy(this.to);
          if (--this.n <= 0) return false;
          this.diveMark();
        }
        return true;
      }
      return false;
    }
    if (mv === 'shark') {
      this.nt -= dt;
      if (this.nt <= 0 && this.n > 0) {
        const from = frameDir(onMe ? P.up : this.B, latOf(this.a, 9), Math.random() * 360);
        this.haz.push(new Homing(this, from, { model: finModel(), speed: 7, turn: 1.4, life: 4.2, alt: 0, over: 1.0, hitR: 1.05, trail: 0xd8b070, color: 0xd8b070 }));
        sfx.whoosh(); this.n--; this.nt = 0.9;
      }
      return this.n > 0 || this.haz.some((h) => h instanceof Homing);
    }
    if (mv === 'hunt') {
      if (this.ms === 'trail') {
        // a dust trail swims toward you under the sand
        if (onMe) this.steer(tangentTo(this.dir, P.up), 6, dt);
        this.walk([5.5, 6.5, 7.5][p], dt);
        if (Math.random() < dt * 30) puff(surf(this.a, this.dir, 0.1), 1, 0xd8b070, 2.5, 0.8, this.dir);
        if (this.mt > [2.4, 2.2, 2.0][p] || (onMe && arcTo(this.a, P.up, this.dir) < 0.8)) { this.ms = 'mark'; this.mt = 0; this.mk = makeMarker(this.g, 2.2, 0xff3a5a); this.mk.place(this.a, this.dir); sfx.warn(); }
        return true;
      }
      if (this.ms === 'mark') { this.mk.pulse(this.mt * 16); if (this.mt > [0.9, 0.8, 0.7][p]) { this.g.remove(this.mk); this.mk = null; this.ms = 'burst'; this.mt = 0; sfx.boom(); G.shake = 0.7; puff(surf(this.a, this.dir, 0.3), 36, 0xd8b070, 7, 2, this.dir); if (onMe && arcTo(this.a, P.up, this.dir) < 2.3 && P.alt < 5) { hurtPlayer(surf(this.a, this.dir, 0)); bouncePlayer(14); } } return true; }
      if (this.ms === 'burst') { this.rise(Math.min(1, this.mt / 0.35)); k.root.rotation.x = Math.sin(this.mt * 5) * 0.15; this.bodyTouch(1.6, 7); if (this.mt > 1.3) { this.ms = 'fall'; this.mt = 0; this.fwd = onMe ? tangentTo(this.dir, P.up) : anyPerp(this.dir); } return true; }
      if (this.ms === 'fall') { k.root.rotation.x = Math.min(1, (this.mt / 0.5) ** 2) * (Math.PI / 2 - 0.08); this.place(); if (this.mt > 0.5) { this.ms = 'flat'; this.mt = 0; sfx.boom(); G.shake = 0.6; const hd = this.ahead(6.6); puff(surf(this.a, hd, 0.3), 24, 0xd8b070, 5, 0.6, hd); if (onMe && arcTo(this.a, P.up, hd) < 1.6 && P.alt < 1.2) hurtPlayer(surf(this.a, hd, 0)); G.toastOnce('gz-flat', 'He smacked down on the sand! Run to his head and JUMP on it!'); } return true; }
      if (this.ms === 'flat') {
        k.eyeM.color.setHex(Math.sin(this.mt * 12) > 0 ? 0xffffff : 0x5ef2e0);
        const hd = this.ahead(6.6);
        if (Math.random() < dt * 8) puff(surf(this.a, hd, 2.2), 1, 0xffe27a, 1.5, 0.3, hd);
        if (onMe && arcTo(this.a, P.up, hd) < 1.4 && P.alt > 0.9 && P.vr <= 0) { bouncePlayer(16); this.flatEnd(); this.hit(); return false; }
        if (this.mt > [3.6, 3.1, 2.7][p]) { this.flatEnd(); return false; }
        return true;
      }
    }
    return false;
  }
  flatEnd() { this.ms = null; this.k.eyeM.color.setHex(0x5ef2e0); puff(surf(this.a, this.dir, 0.3), 20, 0xd8b070, 4, 1, this.dir); this.under(); }
  onPound() { if (this.mv === 'hunt' && this.ms === 'flat' && P.planet === this.a && arcTo(this.a, P.up, this.ahead(6.6)) < 2.2) { bouncePlayer(14); this.flatEnd(); this.hit(); } }
  update(dt, t) {
    if (this.state === 'idle') { this.m.visible = true; this.k.root.rotation.x = Math.sin(t * 1.2) * 0.08; }
    if (this.state === 'dying') {
      this.dt = (this.dt || 0) + dt; this.m.visible = true;
      if (this.dt < 0.1) { this.k.root.rotation.set(0, 0, 0); this.place(0); }
      this.k.root.rotation.z = Math.sin(this.dt * 10) * 0.2 * Math.max(0, 1 - this.dt / 2.4);
      this.place(-Math.min(1, this.dt / 2.4) * 7);
      if (Math.random() < dt * 20) puff(surf(this.a, this.dir, 0.4), 2, 0xd8b070, 3, 1, this.dir);
      if (this.dt > 2.4 && !this.boomed) { this.boomed = true; sfx.win(); this.m.visible = false; this.onWin && this.onWin(); }
    }
    this.tick(dt, t);
  }
}

// ======================================================================
// Boss 9: MECHA-MIAUW, Kayo & Yara's giant robot cat, on the Donkere Kant
// ======================================================================
// Lasers from its eyes, missiles, Kattenbots, and a huge stomp. After the stomp it overheats:
// steam everywhere and the glass dome pops open. Jump into the cockpit! (Moon gravity helps.)
export class Mecha extends Boss {
  constructor(world, arena) {
    super(world, arena, { name: 'MECHA-MIAUW', sub: 'Kayo & Yara’s giant robot cat · version 2.0', hp: 4 });
    this.B = V3(0, 1, 0);
    this.plans = [['walk', 'homing', 'stomp'], ['eyes', 'walk', 'homing', 'stomp'], ['mice', 'eyes', 'homing', 'walk', 'stomp']];
    for (let i = 0; i < 4; i++) world.addPlatform(arena, { dir: frameDir(this.B, 62, i * 90), r: 1.1, h: 1.6, float: true, thick: 0.4, color: 0x6a6e84, top: 0x9fe8ff, bob: [0.4, 1.2, i] });
    this.k = buildMecha(); this.m = this.k.root; this.g.add(this.m);
    this.bots = [];
    walker(this); this.home();
  }
  home() { this.dir = frameDir(this.B, 35, 0); this.fwd = anyPerp(this.dir); this.place(); }
  reset() {
    this.clearHaz(); this.hp = this.maxHp; this.dead = false; this.state = 'idle'; this.mv = null; this.queue = []; this.dt = 0; this.boomed = false; this.ms = null;
    for (const e of this.bots) if (!e.dead) e.kill(true);
    this.bots = []; if (this.mk) { this.g.remove(this.mk); this.mk = null; }
    this.m.visible = true; this.k.r.rotation.set(0, 0, 0); this.cool(); this.bar(false); this.home();
  }
  cool() { this.k.dome.visible = true; this.k.body.position.y = 0; this.k.eyeM.color.setHex(0x7dff9a); }
  // two eye lasers in a V, aimed at you
  lock() {
    const o = { aim: [1.4, 1.25, 1.1][this.phase], fire: 0.6, th0: 0.2, th1: 2.8 };
    this.haz.push(new Beam(this, this.dir, { ...o, off: -0.22, color: 0x7dff9a }), new Beam(this, this.dir, { ...o, off: 0.22, color: 0xff5ab4 }));
    sfx.warn();
  }
  begin(mv) {
    const p = this.phase; this.n = 0; this.nt = 0.4; this.ms = null;
    if (mv === 'missiles') { this.n = [4, 5, 6][p]; sfx.warn(); G.toastOnce('mm-mis', 'Missiles! Keep moving out of the red circles.'); }
    if (mv === 'homing') { this.n = [3, 4, 5][p]; this.nt = 0.3; sfx.warn(); G.toastOnce('mm-homing', 'HOMING MISSILES! They follow you: turn sharply at the last moment, or jump over them.'); }
    if (mv === 'eyes') { this.n = [2, 2, 3][p] - 1; this.lock(); G.toastOnce('mm-eyes', 'Its eyes LOCK ON to you… when the lasers flash, they FIRE!'); }
    if (mv === 'laser') {
      sfx.warn(); G.toastOnce('mm-laser', 'Eye lasers! Jump over them. On the moon you jump REALLY high.');
      this.haz.push(new Sweep(this, this.dir, { speed: [0.8, 0.9, 1.05][p], turns: 1, color: 0x7dff9a }));
      if (p >= 1) { const s2 = new Sweep(this, this.dir, { speed: [0.8, 0.9, 1.05][p], turns: 1, color: 0xff5ab4 }); s2.phi += Math.PI; this.haz.push(s2); }
    }
    if (mv === 'mice') { sfx.meow(); for (let i = 0; i < [2, 2, 3][p]; i++) { const e = this.w.addEnemy(this.a, frameDir(this.dir, 25, i * 120), 'kattenbot', { drops: 1, roam: 0.7 }); e.life = 8; this.bots.push(e); } G.toastOnce('mm-mice', 'Kattenbots! Stomp them.'); }
    if (mv === 'stomp') { this.from = this.dir.clone(); this.to = P.planet === this.a ? P.up.clone() : frameDir(this.B, 35, 180); this.mk = makeMarker(this.g, 2.6, 0xff3a5a); this.mk.place(this.a, this.to); this.ms = 'air'; sfx.warn(); G.toastOnce('mm-stomp', 'It’s jumping at you! Get out of the red circle!'); }
  }
  step(mv, dt) {
    const p = this.phase, k = this.k, onMe = P.planet === this.a;
    const stride = (s) => k.legs.forEach((l, i) => (l.rotation.x = Math.sin(this.mt * s + (i % 2) * Math.PI) * 0.4));
    if (mv === 'walk') { if (onMe) this.steer(tangentTo(this.dir, P.up), 3, dt); this.walk([2.6, 3.0, 3.4][p], dt); stride(8); this.place(); this.bodyTouch(2.0, 3.2); return this.mt < 2.4; }
    if (mv === 'missiles') {
      if (onMe) this.steer(tangentTo(this.dir, P.up), 4, dt);
      this.place(); this.bodyTouch(2.0, 3.2);
      this.nt -= dt;
      if (this.nt <= 0 && this.n > 0) { const delay = [1.15, 1.0, 0.9][p]; this.haz.push(new Drop(this, P.up.clone(), { delay, radius: 1.5, model: missile(), color: 0xff3a5a, from: 16 })); if (p >= 1) this.haz.push(new Drop(this, frameDir(P.up, 72, Math.random() * 360), { delay, radius: 1.4, model: missile(), color: 0xff3a5a, from: 16 })); sfx.whoosh(); k.arms.forEach((a) => (a.rotation.x = -0.6)); this.n--; this.nt = delay * 0.7; }
      else k.arms.forEach((a) => (a.rotation.x *= 0.9));
      return this.n > 0 || this.mt < 1.5;
    }
    if (mv === 'laser') { k.head.rotation.y = Math.sin(this.mt * 2) * 0.3; k.eyeM.color.setHex(Math.sin(this.mt * 30) > 0 ? 0xffffff : 0x7dff9a); this.place(); this.bodyTouch(2.0, 3.2); const busy = this.haz.some((h) => h instanceof Sweep); if (!busy) { k.head.rotation.y = 0; k.eyeM.color.setHex(0x7dff9a); } return busy; }
    if (mv === 'homing') {
      if (onMe) this.steer(tangentTo(this.dir, P.up), 4, dt);
      this.place(); this.bodyTouch(2.0, 3.2);
      this.nt -= dt;
      if (this.nt <= 0 && this.n > 0) {
        // fired from its back, they fly low over the ground and follow you
        const m = new THREE.Group(), ms = missile(); ms.rotation.x = -Math.PI / 2; m.add(ms);
        this.haz.push(new Homing(this, this.ahead(-0.5), { model: m, speed: [6.5, 7, 7.6][p], turn: [1.6, 1.8, 2.0][p], life: 4, alt: 0.7, over: 0.9, trail: 0xffffff, color: 0xff7a2a }));
        sfx.whoosh(); k.arms.forEach((a) => (a.rotation.x = -0.6)); this.n--; this.nt = 0.75;
      } else k.arms.forEach((a) => (a.rotation.x *= 0.9));
      return this.n > 0 || this.haz.some((h) => h instanceof Homing);
    }
    if (mv === 'eyes') {
      if (onMe) this.steer(tangentTo(this.dir, P.up), 3, dt);
      k.eyeM.color.setHex(Math.sin(this.mt * 30) > 0 ? 0xffffff : 0xff3a5a); this.place(); this.bodyTouch(2.0, 3.2);
      if (!this.haz.some((h) => h instanceof Beam)) { if (this.n > 0) { this.n--; this.lock(); } else { k.eyeM.color.setHex(0x7dff9a); return false; } }
      return true;
    }
    if (mv === 'mice') { for (const e of this.bots) if (!e.dead) { e.life -= dt; if (e.life <= 0) e.kill(true); } this.place(); this.bodyTouch(2.0, 3.2); return this.mt < 8 && this.bots.some((e) => !e.dead); }
    if (mv === 'stomp') {
      if (this.ms === 'air') {
        const air = [1.3, 1.15, 1.0][p], kk = Math.min(1, this.mt / air);
        this.mk.pulse(this.mt * 14);
        this.dir.copy(this.from.clone().lerp(this.to, kk).normalize());
        if (kk < 0.95) this.fwd.copy(tangentTo(this.dir, this.to));
        this.place(Math.sin(kk * Math.PI) * 9);
        if (kk >= 1) {
          this.g.remove(this.mk); this.mk = null; sfx.boom(); G.shake = 0.8;
          puff(surf(this.a, this.dir, 0.3), 34, 0xd8d4e8, 7, 1, this.dir);
          if (onMe && arcTo(this.a, P.up, this.dir) < 2.8 && P.alt < 2) hurtPlayer(surf(this.a, this.dir, 0));
          this.haz.push(new Wave(this, this.dir, { speed: [0.7, 0.8, 0.9][p], th0: 0.2, th1: 1.7, color: 0x9fe8ff, h: 0.8 }));
          this.ms = 'hot'; this.mt = 0; k.dome.visible = false; k.body.position.y = -0.35; sfx.crack();
          G.toastOnce('mm-hot', 'It overheated! The dome is open: JUMP into the cockpit!');
        }
        return true;
      }
      if (this.ms === 'hot') {
        k.eyeM.color.setHex(Math.sin(this.mt * 12) > 0 ? 0xff3a3a : 0x5a1a1a);
        if (Math.random() < dt * 14) puff(this.m.position.clone().addScaledVector(this.dir, 3.4), 1, 0xffffff, 2, 1, this.dir);   // steam
        if (onMe && arcTo(this.a, P.up, this.dir) < 1.6 && P.alt > 2.0 && P.vr <= 0) { bouncePlayer(15); sfx.meow(); this.cool(); this.ms = null; this.hit(); return false; }
        if (this.mt > [3.6, 3.1, 2.7][p]) { this.cool(); this.ms = null; sfx.whoosh(); return false; }
        return true;
      }
    }
    return false;
  }
  onPound() {}
  update(dt, t) {
    const k = this.k;
    if (this.state === 'idle') { k.tail.rotation.z = Math.sin(t * 2) * 0.3; k.body.position.y = Math.sin(t * 2) * 0.03; }
    else k.tail.rotation.z = Math.sin(t * 5) * 0.4;
    if (this.state === 'dying') {
      this.dt = (this.dt || 0) + dt; k.dome.visible = false;
      k.r.rotation.z = Math.sin(this.dt * 20) * 0.05 * Math.min(1, this.dt);
      if (Math.random() < dt * 30) puff(this.m.position.clone().addScaledVector(this.dir, 2 + Math.random() * 2), 2, Math.random() < 0.5 ? 0xff7a2a : 0xffffff, 4, 1.5, this.dir);
      if (this.dt > 2.4 && !this.boomed) { this.boomed = true; sfx.boom(); sfx.win(); G.shake = 0.9; this.m.visible = false; puff(this.m.position.clone().addScaledVector(this.dir, 2), 60, 0xff7a2a, 8, 4, this.dir); this.onWin && this.onWin(); }
    }
    this.tick(dt, t);
  }
}

// ======================================================================
// Boss 10: KRAAK, the giant octopus of De Koraalzee, in De Diepe Trog
// ======================================================================
// Ink blobs rain down on red circles, tentacle slams send out waves, and a spinning tentacle sweeps round him.
// His big move: he rears up and SMASHES the sea floor. After that he's dizzy and his head sinks down. Jump on it!
function inkBlob() { const g = new THREE.Group(); mk(new THREE.SphereGeometry(0.55, 12, 10), toon(0x2b2440), 0, 0.55, 0, g, 1.06); mk(new THREE.SphereGeometry(0.2, 8, 6), basic(0x8a3ab8), 0.2, 0.8, 0.3, g, 0); return g; }
export class Kraak extends Boss {
  constructor(world, arena) {
    super(world, arena, { name: 'KRAAK', sub: 'The giant octopus · eight arms, zero manners', hp: 4 });
    this.B = V3(0, 1, 0);
    this.plans = [['blind', 'smash'], ['whirl', 'blind', 'smash'], ['spin', 'whirl', 'blind', 'smash']];
    for (let i = 0; i < 4; i++) world.addPlatform(arena, { dir: frameDir(this.B, 62, i * 90 + 45), r: 1.2, h: 1.2, sides: 7, color: 0x3a6a8a, top: 0xff9ac8 });
    this.k = buildOctopus(); this.m = this.k.root; this.g.add(this.m);
    walker(this); this.home();
  }
  home() { this.dir = frameDir(this.B, 30, 0); this.fwd = anyPerp(this.dir); this.place(); }
  reset() {
    this.clearHaz(); this.hp = this.maxHp; this.dead = false; this.state = 'idle'; this.mv = null; this.queue = []; this.dt = 0; this.boomed = false; this.ms = null;
    this.m.visible = true; this.k.r.rotation.set(0, 0, 0); this.k.head.rotation.set(0, 0, 0); this.k.head.position.y = 1.5; this.k.eyeM.color.setHex(0xffe14a); if (this.mark) { this.g.remove(this.mark); this.mark = null; }
    this.bar(false); this.home();
  }
  begin(mv) {
    const p = this.phase; this.n = 0; this.nt = 0.4; this.ms = null;
    if (mv === 'ink') { this.n = [4, 5, 6][p]; sfx.warn(); G.toastOnce('kr-ink', 'Ink blobs! Watch the red circles.'); }
    if (mv === 'blind') {
      this.n = [4, 5, 6][p]; this.haz.push(new Splat(this, { life: [3.4, 3.8, 4.2][p], n: [4, 5, 6][p] }));
      G.toastOnce('kr-blind', 'SPLAT! Ink all over your helmet! You can hardly see… watch for the circles.');
    }
    if (mv === 'whirl') {
      this.haz.push(new Pull(this, () => this.dir, { life: [0, 4.6, 5.2][p], force: [0, 3.0, 3.5][p] })); this.nt = 0.8; this.ring = 0;
      sfx.whoosh(); G.toastOnce('kr-whirl', 'WHIRLPOOL! It drags you toward him: run against it, and mind the tentacles!');
    }
    if (mv === 'waves') { this.n = [2, 2, 3][p]; this.nt = 0.6; sfx.warn(); G.toastOnce('kr-wave', 'Tentacle waves! JUMP over them.'); }
    if (mv === 'spin') { this.ms = 'wind'; sfx.warn(); G.toastOnce('kr-spin', 'He’s spinning a tentacle round! Jump over it.'); }
    if (mv === 'smash') { this.ms = 'rear'; sfx.warn(); G.toastOnce('kr-smash', 'He’s rearing up! Get away from the red circle… then he’s dizzy!'); }
  }
  step(mv, dt) {
    const p = this.phase, k = this.k, onMe = P.planet === this.a;
    const wiggle = (s) => k.tentacles.forEach((t, i) => (t.rotation.x = Math.sin(this.mt * s + i) * 0.25));
    if (mv === 'ink' || mv === 'blind') {
      if (onMe) this.steer(tangentTo(this.dir, P.up), 4, dt);
      wiggle(6); this.place(); this.bodyTouch(2.2, 3);
      this.nt -= dt;
      if (this.nt <= 0 && this.n > 0) {
        const delay = [1.15, 1.0, 0.9][p];
        this.haz.push(new Drop(this, P.up.clone(), { delay, radius: 1.5, model: inkBlob(), color: 0x8a3ab8, from: 14 }));
        this.haz.push(new Drop(this, frameDir(P.up, 70, Math.random() * 360), { delay: delay + 0.25, radius: 1.5, model: inkBlob(), color: 0x8a3ab8, from: 14 }));
        sfx.whoosh(); this.n--; this.nt = delay * 0.7;
      }
      if (this.n <= 0 && this.mt > 2) return false;
      return true;
    }
    if (mv === 'whirl') {
      // spins in the middle of the whirlpool; every so often a ring of tentacles shoots up round him
      k.r.rotation.y += dt * 3; wiggle(12); this.place(); this.bodyTouch(2.2, 3);
      this.nt -= dt;
      if (this.nt <= 0) {
        const arc = this.ring % 2 ? 4.4 : 2.9, n = this.ring % 2 ? 10 : 7, a0 = Math.random() * 360;
        for (let i = 0; i < n; i++) this.haz.push(new Spike(this, frameDir(this.dir, latOf(this.a, arc), a0 + (i / n) * 360), 0, 0xc87ad8));
        sfx.crack(); this.ring++; this.nt = 1.4;
      }
      if (!this.haz.some((h) => h instanceof Pull)) { k.r.rotation.y = 0; return false; }
      return true;
    }
    if (mv === 'waves') {
      wiggle(10); this.place(); this.bodyTouch(2.2, 3);
      this.nt -= dt;
      if (this.nt <= 0 && this.n > 0) { this.haz.push(new Wave(this, this.dir, { speed: [0.6, 0.7, 0.8][p], th0: 0.2, color: 0x5ef2e0, h: 0.8 })); sfx.boom(); G.shake = 0.4; this.n--; this.nt = [1.4, 1.2, 1.0][p]; }
      if (this.n <= 0 && this.mt > 2.4) return false;
      return true;
    }
    if (mv === 'spin') {
      if (this.ms === 'wind') { k.r.rotation.y += dt * 4; this.place(); this.bodyTouch(2.2, 3); if (this.mt > 0.8) { this.ms = 'go'; this.haz.push(new Sweep(this, this.dir, { speed: [0.8, 0.9, 1.05][p], turns: [1, 1, 1.5][p], color: 0xc87ad8 })); sfx.whoosh(); } return true; }
      k.r.rotation.y += dt * 6; this.place(); this.bodyTouch(2.2, 3);
      if (!this.haz.some((h) => h instanceof Sweep)) { k.r.rotation.y = 0; return false; }
      return true;
    }
    if (mv === 'smash') {
      if (this.ms === 'rear') {
        // walk toward you, rise up tall, then drop
        if (onMe) { this.steer(tangentTo(this.dir, P.up), 5, dt); this.walk(3.2, dt); }
        k.r.rotation.x = -Math.min(1, this.mt / 1.1) * 0.5; this.place(Math.min(1, this.mt / 1.1) * 2.2); this.bodyTouch(2.2, 3);
        if (this.mt > 1.1) { this.ms = 'drop'; this.mt = 0; this.mark = makeMarker(this.g, 2.6, 0xff3a5a); this.mark.place(this.a, this.dir); }
        return true;
      }
      if (this.ms === 'drop') {
        this.mark.pulse(this.mt * 20);
        this.place(Math.max(0, 1 - this.mt / 0.5) * 2.2); k.r.rotation.x = -0.5 + Math.min(1, this.mt / 0.5) * 0.5;
        if (this.mt > 0.5) {
          this.g.remove(this.mark); this.mark = null;
          sfx.boom(); G.shake = 0.8; puff(surf(this.a, this.dir, 0.3), 24, 0x9fe8ff, 6, 0.8, this.dir);
          if (onMe && arcTo(this.a, P.up, this.dir) < 2.8 && P.alt < 2) hurtPlayer(surf(this.a, this.dir, 0), 12);
          if (p > 0) this.haz.push(new Wave(this, this.dir, { speed: 0.7, th0: 0.25, color: 0x5ef2e0, h: 0.7 }));
          this.ms = 'dizzy'; this.mt = 0; G.toastOnce('kr-dizzy', 'He’s dizzy! JUMP on his head!');
        }
        return true;
      }
      if (this.ms === 'dizzy') {
        // the head sinks down to the sea floor and wobbles; stars spin
        k.head.position.y += (0.6 - k.head.position.y) * damp(6, dt); k.head.rotation.z = Math.sin(this.mt * 5) * 0.2;
        k.eyeM.color.setHex(Math.sin(this.mt * 12) > 0 ? 0xffffff : 0xffe14a);
        if (Math.random() < dt * 6) puff(surf(this.a, this.dir, 3.2), 1, 0xffe14a, 1.5, 0.6, this.dir);
        if (onMe && arcTo(this.a, P.up, this.dir) < 1.6 && P.alt > 1.2 && P.vr <= 0) { bouncePlayer(16); this.wake(); this.hit(); return false; }
        if (this.mt > [3.4, 2.9, 2.5][p]) { this.wake(); return false; }
        return true;
      }
    }
    return false;
  }
  wake() { this.ms = null; this.k.head.position.y = 1.5; this.k.head.rotation.set(0, 0, 0); this.k.eyeM.color.setHex(0xffe14a); if (this.mark) { this.g.remove(this.mark); this.mark = null; } }
  onPound() { if (this.mv === 'smash' && this.ms === 'dizzy' && P.planet === this.a && arcTo(this.a, P.up, this.dir) < 2.6) { bouncePlayer(14); this.wake(); this.hit(); } }
  update(dt, t) {
    const k = this.k;
    if (this.state === 'idle') k.tentacles.forEach((tt, i) => (tt.rotation.x = Math.sin(t * 2 + i) * 0.2));
    if (this.state === 'dying') {
      this.dt = (this.dt || 0) + dt; k.r.rotation.z = Math.min(1.4, this.dt);
      if (Math.random() < dt * 20) puff(this.m.position.clone().addScaledVector(this.dir, 2.5), 2, 0x9fe8ff, 2, 1, this.dir);
      if (this.dt > 2.4 && !this.boomed) { this.boomed = true; sfx.win(); G.shake = 0.6; this.onWin && this.onWin(); }
    }
    this.tick(dt, t);
  }
}

// ======================================================================
// Boss 11: KONING BOE, the ghost king of the Spookplaneet, in De Spookzaal
// ======================================================================
// Ghost fire falls on red circles, he vanishes and spooky spikes pop up round you, a ghost wall sweeps the hall,
// and then he SWOOPS at you. He misses, crashes into the floor and lies there dizzy: jump on his crown!
function ghostFire() { const g = new THREE.Group(); mk(new THREE.SphereGeometry(0.5, 12, 10), basic(0x7dffb0, { transparent: true, opacity: 0.85 }), 0, 0.5, 0, g, 0); mk(new THREE.SphereGeometry(0.8, 10, 8), basic(0x7dffb0, { transparent: true, opacity: 0.25, depthWrite: false }), 0, 0.5, 0, g, 0); return g; }
export class Boe extends Boss {
  constructor(world, arena) {
    super(world, arena, { name: 'KONING BOE', sub: 'The ghost king · boo-tiful and very rude', hp: 4 });
    this.B = V3(0, 1, 0);
    this.plans = [['lights', 'swoop'], ['vanish', 'lights', 'swoop'], ['vanish', 'clones', 'lights', 'swoop']];
    for (let i = 0; i < 4; i++) world.addPlatform(arena, { dir: frameDir(this.B, 62, i * 90 + 45), r: 1.2, h: 1.2, sides: 6, color: 0x3a2a4a, top: 0x7dffb0 });
    this.k = buildGhostKing(); this.m = this.k.root; this.g.add(this.m);
    walker(this); this.home();
  }
  home() { this.dir = frameDir(this.B, 30, 0); this.fwd = anyPerp(this.dir); this.hover = 1.4; this.place(this.hover); }
  reset() {
    this.clearHaz(); this.hp = this.maxHp; this.dead = false; this.state = 'idle'; this.mv = null; this.queue = []; this.dt = 0; this.boomed = false; this.ms = null;
    this.m.visible = true; this.k.r.rotation.set(0, 0, 0); this.k.r.scale.setScalar(1.7); this.k.eyeM.color.setHex(0x7dffb0);
    this.bar(false); this.home();
  }
  begin(mv) {
    const p = this.phase; this.n = 0; this.nt = 0.4; this.ms = null;
    if (mv === 'fire') { this.n = [4, 5, 6][p]; sfx.warn(); G.toastOnce('bo-fire', 'Ghost fire! Watch the red circles.'); }
    if (mv === 'lights') {
      this.n = [4, 5, 6][p]; this.haz.push(new Dark(this, { life: 30 })); sfx.whoosh();
      G.toastOnce('bo-lights', 'LIGHTS OUT! You can only see right round you… watch for the glowing circles of ghost fire.');
    }
    if (mv === 'clones') {
      const at = P.planet === this.a ? P.up : this.dir;
      for (let i = 0; i < [0, 0, 3][p]; i++) this.haz.push(new Homing(this, frameDir(at, latOf(this.a, 8), i * 120 + Math.random() * 40), { model: ghostClone(), speed: 4.4, turn: 1.3, life: 5.5, alt: 0.4, over: 1.6, hitR: 1.1, color: 0xe8e0ff }));
      sfx.meow(); G.toastOnce('bo-clones', 'Ghost copies! They float after you: keep moving until they fade away.');
    }
    if (mv === 'vanish') { this.ms = 'out'; this.n = [0, 4, 6][p]; this.nt = 0.6; sfx.whoosh(); G.toastOnce('bo-vanish', 'He vanished! Spooky spikes pop up where you stand. Keep moving!'); }
    if (mv === 'sweep') { this.ms = 'wind'; sfx.warn(); G.toastOnce('bo-sweep', 'A ghost wall! Jump over it.'); }
    if (mv === 'swoop') { this.ms = 'rise'; sfx.warn(); G.toastOnce('bo-swoop', 'He’s going to swoop at you! Dodge to the side… then he crashes!'); }
  }
  step(mv, dt) {
    const p = this.phase, k = this.k, onMe = P.planet === this.a;
    const float = () => { this.place(this.hover + Math.sin(this.mt * 3) * 0.25); k.arms.forEach((a, i) => (a.rotation.z = Math.sin(this.mt * 4 + i * 3) * 0.3)); };
    if (mv === 'fire' || mv === 'lights') {
      if (onMe) this.steer(tangentTo(this.dir, P.up), 3, dt);
      this.walk(1.2, dt); float(); this.bodyTouch(2.0, 4);
      this.nt -= dt;
      if (this.nt <= 0 && this.n > 0) {
        const delay = [1.15, 1.0, 0.9][p];
        this.haz.push(new Drop(this, P.up.clone(), { delay, radius: 1.5, model: ghostFire(), color: 0x7dffb0, from: 14 }));
        this.haz.push(new Drop(this, frameDir(P.up, 70, Math.random() * 360), { delay: delay + 0.25, radius: 1.5, model: ghostFire(), color: 0x7dffb0, from: 14 }));
        sfx.whoosh(); this.n--; this.nt = delay * 0.7;
      }
      if (this.n <= 0 && this.mt > 2) { for (const h of this.haz) if (h instanceof Dark) h.end(); return false; }   // the lights come back on
      return true;
    }
    if (mv === 'clones') { float(); this.bodyTouch(2.0, 4); return this.mt < 1 || this.haz.some((h) => h instanceof Homing); }
    if (mv === 'vanish') {
      if (this.ms === 'out') { k.r.scale.setScalar(1.7 * Math.max(0.01, 1 - this.mt / 0.5)); if (this.mt > 0.5) { this.m.visible = false; this.ms = 'gone'; this.mt = 0; } return true; }
      if (this.ms === 'gone') {
        this.nt -= dt;
        if (this.nt <= 0 && this.n > 0 && onMe) { this.haz.push(new Spike(this, P.up.clone(), 0, 0x7dffb0)); this.haz.push(new Spike(this, frameDir(P.up, 80, Math.random() * 360), 0.15, 0x7dffb0)); this.n--; this.nt = [0.9, 0.8, 0.65][p]; }
        if (this.n <= 0 && this.mt > 1.2) {
          // he comes back on the other side of you
          this.dir = onMe ? frameDir(P.up, 60, Math.random() * 360) : this.dir; this.fwd = anyPerp(this.dir); this.m.visible = true; this.ms = 'in'; this.mt = 0; sfx.meow();
        }
        return true;
      }
      k.r.scale.setScalar(1.7 * Math.min(1, this.mt / 0.5)); float();
      if (this.mt > 0.5) { k.r.scale.setScalar(1.7); return false; }
      return true;
    }
    if (mv === 'sweep') {
      float(); this.bodyTouch(2.0, 4);
      if (this.ms === 'wind') { if (this.mt > 0.8) { this.ms = 'go'; this.haz.push(new Sweep(this, this.dir, { speed: [0.8, 0.9, 1.05][p], turns: [1, 1, 1.5][p], color: 0x7dffb0 })); sfx.whoosh(); } return true; }
      if (!this.haz.some((h) => h instanceof Sweep)) return false;
      return true;
    }
    if (mv === 'swoop') {
      if (this.ms === 'rise') {
        // rises up high, eyes on you
        if (onMe) this.steer(tangentTo(this.dir, P.up), 6, dt);
        this.place(this.hover + Math.min(1, this.mt / 0.9) * 4); k.eyeM.color.setHex(Math.sin(this.mt * 16) > 0 ? 0xff3a5a : 0x7dffb0);
        if (this.mt > 0.9) { this.ms = 'dive'; this.mt = 0; this.target = onMe ? P.up.clone() : this.dir.clone(); sfx.whoosh(); }
        return true;
      }
      if (this.ms === 'dive') {
        // a fast dive toward the spot where you WERE
        this.steer(tangentTo(this.dir, this.target), 12, dt); this.walk([9, 10, 11][p], dt);
        const k2 = Math.min(1, this.mt / 0.8); this.place((this.hover + 4) * (1 - k2)); k.r.rotation.x = 0.9 * k2;
        if (onMe && this.mt > 0.3 && arcTo(this.a, P.up, this.dir) < 1.8 && P.alt < 3) hurtPlayer(surf(this.a, this.dir, 0), 12);
        if (this.mt > 0.8) { sfx.boom(); G.shake = 0.7; puff(surf(this.a, this.dir, 0.3), 24, 0xe8e0ff, 6, 0.8, this.dir); this.ms = 'dizzy'; this.mt = 0; k.r.rotation.x = 1.2; G.toastOnce('bo-dizzy', 'He crashed! JUMP on his crown!'); }
        return true;
      }
      if (this.ms === 'dizzy') {
        // lies face-down on the floor, the crown sticking up: that's the target
        this.place(0); k.eyeM.color.setHex(Math.sin(this.mt * 12) > 0 ? 0xffffff : 0x7dffb0);
        if (Math.random() < dt * 6) puff(surf(this.a, this.ahead(3.2), 1.6), 1, 0xffe14a, 1.5, 0.6, this.dir);
        const cr = this.ahead(3.2);
        if (onMe && arcTo(this.a, P.up, cr) < 1.6 && P.alt > 0.6 && P.vr <= 0) { bouncePlayer(16); this.wake(); this.hit(); return false; }
        if (this.mt > [3.4, 2.9, 2.5][p]) { this.wake(); return false; }
        return true;
      }
    }
    return false;
  }
  wake() { this.ms = null; this.k.r.rotation.x = 0; this.k.eyeM.color.setHex(0x7dffb0); this.place(this.hover); }
  onPound() { if (this.mv === 'swoop' && this.ms === 'dizzy' && P.planet === this.a && arcTo(this.a, P.up, this.ahead(3.2)) < 2.4) { bouncePlayer(14); this.wake(); this.hit(); } }
  update(dt, t) {
    const k = this.k;
    if (this.state === 'idle') { this.place(this.hover + Math.sin(t * 2) * 0.25); k.arms.forEach((a, i) => (a.rotation.z = Math.sin(t * 2 + i * 3) * 0.25)); }
    if (this.state === 'dying') {
      this.dt = (this.dt || 0) + dt; this.m.visible = true; k.r.scale.setScalar(1.7 * Math.max(0.05, 1 - this.dt / 2.4)); k.r.rotation.y += dt * 6;
      if (Math.random() < dt * 20) puff(this.m.position.clone().addScaledVector(this.dir, 2), 2, 0xe8e0ff, 2, 1, this.dir);
      if (this.dt > 2.4 && !this.boomed) { this.boomed = true; this.m.visible = false; sfx.win(); G.shake = 0.6; this.onWin && this.onWin(); }
    }
    this.tick(dt, t);
  }
}

// ======================================================================
// Bonus boss: TANDWIELTRON, the builder robot Kayo & Yara took over, in De Gouden Hal
// ======================================================================
// Bolts from the sky, saw-blade rings to jump over, a laser fence, and pistons that punch up out of the floor.
// The opening: he revs up and CHARGES at you. Dodge, he slams into the floor, overheats,
// and the hatch on his head pops open. Jump on it! He has 5 hp: the hardest boss in the game.
function bolt() { const g = new THREE.Group(); mk(new THREE.CylinderGeometry(0.3, 0.3, 0.9, 6), toon(0xc8c8d0), 0, 0.6, 0, g, 1.06); mk(new THREE.CylinderGeometry(0.55, 0.55, 0.25, 6), toon(0xa8a8b0), 0, 1.1, 0, g, 1.06); return g; }
export class Tandwieltron extends Boss {
  constructor(world, arena) {
    super(world, arena, { name: 'TANDWIELTRON', sub: 'The builder robot · built to win, built by cats', hp: 5 });
    this.B = V3(0, 1, 0);
    this.plans = [['bolts', 'charge'], ['conveyor', 'bolts', 'charge'], ['gears', 'press', 'conveyor', 'bolts', 'charge']];
    for (let i = 0; i < 4; i++) world.addPlatform(arena, { dir: frameDir(this.B, 62, i * 90 + 45), r: 1.2, h: 1.2, sides: 8, color: 0x5a4a3a, top: 0xffd23a });
    this.k = buildCogTitan(); this.m = this.k.root; this.g.add(this.m);
    walker(this); this.home();
  }
  home() { this.dir = frameDir(this.B, 30, 0); this.fwd = anyPerp(this.dir); this.place(); }
  reset() {
    this.clearHaz(); this.hp = this.maxHp; this.dead = false; this.state = 'idle'; this.mv = null; this.queue = []; this.dt = 0; this.boomed = false; this.ms = null;
    this.m.visible = true; this.k.r.rotation.set(0, 0, 0); this.k.r.scale.setScalar(1.5); this.cool();
    this.bar(false); this.home();
  }
  cool() { const k = this.k; k.hatch.rotation.x = 0; k.core.visible = false; k.eyeM.color.setHex(0xff8a1a); k.body.rotation.x = 0; k.body.position.y = 0; }
  begin(mv) {
    const p = this.phase; this.n = 0; this.nt = 0.3; this.ms = null;
    if (mv === 'bolts') { this.n = [5, 6, 7][p]; sfx.warn(); G.toastOnce('tw-bolts', 'Falling bolts! Watch the red circles.'); }
    if (mv === 'saws') { this.n = [2, 2, 3][p]; this.nt = 0.5; sfx.warn(); G.toastOnce('tw-saws', 'Saw rings! JUMP over them.'); }
    if (mv === 'laser') { this.ms = 'wind'; sfx.warn(); G.toastOnce('tw-laser', 'A laser fence! Jump over it.'); }
    if (mv === 'press') { this.n = [3, 4, 5][p]; this.nt = 0.4; sfx.warn(); G.toastOnce('tw-press', 'Pistons! They punch up where you stand. Keep moving!'); }
    if (mv === 'charge') { this.ms = 'rev'; sfx.warn(); G.toastOnce('tw-charge', 'He’s revving up! Dodge his charge… then he overheats!'); }
    if (mv === 'conveyor') {
      this.haz.push(new Conveyor(this, this.B, { life: [0, 5.5, 6][p], speed: [0, 3.2, 3.8][p] })); this.n = [0, 4, 5][p]; this.nt = 1.0;
      sfx.warn(); G.toastOnce('tw-belt', 'The floor is a CONVEYOR BELT! Walk against it… and dodge the bolts.');
    }
    if (mv === 'gears') { this.n = [0, 0, 4][p]; this.nt = 0.4; sfx.warn(); G.toastOnce('tw-gears', 'GIANT GEARS come rolling at you from every side! JUMP over them.'); }
  }
  step(mv, dt) {
    const p = this.phase, k = this.k, onMe = P.planet === this.a;
    const stomp = (s) => { this.walk(s, dt); k.body.position.y = Math.abs(Math.sin(this.mt * 8)) * 0.12; k.arms[0].rotation.x = Math.sin(this.mt * 8) * 0.5; k.arms[1].rotation.x = -Math.sin(this.mt * 8) * 0.5; k.gear.rotation.z += dt * 4; this.place(); };
    if (mv === 'bolts') {
      if (onMe) this.steer(tangentTo(this.dir, P.up), 3, dt);
      stomp(1.6); this.bodyTouch(2.2, 4);
      this.nt -= dt;
      if (this.nt <= 0 && this.n > 0) {
        const delay = [1.1, 0.95, 0.85][p];
        this.haz.push(new Drop(this, P.up.clone(), { delay, radius: 1.5, model: bolt(), color: 0xff3a5a, from: 14 }));
        if (p > 0) this.haz.push(new Drop(this, frameDir(P.up, 75, Math.random() * 360), { delay: delay + 0.2, radius: 1.5, model: bolt(), color: 0xff3a5a, from: 14 }));
        sfx.whoosh(); this.n--; this.nt = delay * 0.65;
      }
      if (this.n <= 0 && this.mt > 2) return false;
      return true;
    }
    if (mv === 'saws') {
      // stamps the floor: a ring of saw blades runs out from him over the whole planet
      this.bodyTouch(2.2, 4); this.place();
      this.nt -= dt;
      k.arms.forEach((a) => (a.rotation.x = -2.4 + Math.max(0, this.nt) * 2));
      if (this.nt <= 0 && this.n > 0) {
        this.haz.push(new Wave(this, this.dir, { speed: [0.55, 0.62, 0.7][p], color: 0xffd23a, h: 0.8 }));
        sfx.boom(); G.shake = Math.max(G.shake, 0.35); puff(surf(this.a, this.dir, 0.3), 14, 0xffd23a, 5, 0.6, this.dir);
        this.n--; this.nt = [1.4, 1.2, 1.0][p];
      }
      if (this.n <= 0 && this.nt <= -0.8) return false;   // the rings keep running while he moves on
      return true;
    }
    if (mv === 'laser') {
      this.bodyTouch(2.2, 4); this.place(); k.gear.rotation.z += dt * 10;
      if (this.ms === 'wind') { if (this.mt > 0.8) { this.ms = 'go'; this.haz.push(new Sweep(this, this.dir, { speed: [0.85, 0.95, 1.1][p], turns: [1, 1, 1.5][p], color: 0xff8a1a })); sfx.whoosh(); } return true; }
      if (!this.haz.some((h) => h instanceof Sweep)) return false;
      return true;
    }
    if (mv === 'conveyor') {
      // he stands still and works the controls; bolts keep falling where you are
      this.place(); this.bodyTouch(2.2, 4); k.gear.rotation.z += dt * 8; k.arms[0].rotation.x = -1.2 + Math.sin(this.mt * 6) * 0.4; k.arms[1].rotation.x = -1.2 - Math.sin(this.mt * 6) * 0.4;
      this.nt -= dt;
      if (this.nt <= 0 && this.n > 0 && onMe) { this.haz.push(new Drop(this, P.up.clone(), { delay: [1.1, 1.0, 0.9][p], radius: 1.5, model: bolt(), color: 0xff3a5a, from: 14 })); sfx.whoosh(); this.n--; this.nt = 1.1; }
      if (!this.haz.some((h) => h instanceof Conveyor)) { k.arms.forEach((a) => (a.rotation.x = 0)); return false; }
      return true;
    }
    if (mv === 'gears') {
      // big gear wheels roll in from every side, each one aimed at you
      this.place(); this.bodyTouch(2.2, 4); k.gear.rotation.z += dt * 12;
      this.nt -= dt;
      if (this.nt <= 0 && this.n > 0) {
        const at = onMe ? P.up : this.B, from = frameDir(at, latOf(this.a, 11), Math.random() * 360);
        this.haz.push(new Roller(this, from, tangentTo(from, at), { speed: 8, r: 1.1, model: gearWheel(1.1), color: 0xffd23a, dist: 26 }));
        sfx.clank(); this.n--; this.nt = 0.85;
      }
      return this.n > 0 || this.haz.some((h) => h instanceof Roller);
    }
    if (mv === 'press') {
      if (onMe) this.steer(tangentTo(this.dir, P.up), 3, dt);      stomp(1.2); this.bodyTouch(2.2, 4);
      this.nt -= dt;
      if (this.nt <= 0 && this.n > 0 && onMe) {
        this.haz.push(new Spike(this, P.up.clone(), 0, 0xffd23a));
        for (let i = 0; i < 2; i++) this.haz.push(new Spike(this, frameDir(P.up, 82, Math.random() * 360), 0.1 + i * 0.1, 0xffd23a));
        this.n--; this.nt = [0.9, 0.8, 0.7][p];
      }
      if (this.n <= 0 && this.mt > 1.6) return false;
      return true;
    }
    if (mv === 'charge') {
      if (this.ms === 'rev') {
        // turns to face you, eyes flashing, gear spinning faster and faster
        if (onMe) this.steer(tangentTo(this.dir, P.up), 6, dt);
        k.gear.rotation.z += dt * (6 + this.mt * 20); this.place(); k.eyeM.color.setHex(Math.sin(this.mt * 18) > 0 ? 0xff3a5a : 0xff8a1a);
        if (Math.random() < dt * 12) puff(surf(this.a, this.dir, 0.2), 1, 0xd8d0c0, 2, 0.5, this.dir);
        if (this.mt > [1.0, 0.85, 0.75][p]) { this.ms = 'run'; this.mt = 0; this.target = onMe ? P.up.clone() : this.dir.clone(); sfx.whoosh(); }
        return true;
      }
      if (this.ms === 'run') {
        // a fast charge straight at the spot where you WERE
        this.steer(tangentTo(this.dir, this.target), 10, dt); stomp([8, 9, 10][p]); k.body.rotation.x = 0.3;
        if (onMe && arcTo(this.a, P.up, this.dir) < 2.0 && P.alt < 3) hurtPlayer(surf(this.a, this.dir, 0), 12);
        if (this.mt > 0.9 || arcTo(this.a, this.dir, this.target) < 0.6) {
          sfx.boom(); G.shake = 0.8; puff(surf(this.a, this.dir, 0.3), 24, 0xd8d0c0, 6, 0.8, this.dir);
          this.ms = 'hot'; this.mt = 0; k.body.rotation.x = 0.55; k.body.position.y = -1.2; k.hatch.rotation.x = -1.6; k.core.visible = true;
          G.toastOnce('tw-hot', 'He overheated! JUMP on the open hatch on his head!');
        }
        return true;
      }
      if (this.ms === 'hot') {
        // slumped forward, steaming, the hatch open: that's the target
        this.place(); k.eyeM.color.setHex(Math.sin(this.mt * 12) > 0 ? 0xffffff : 0xff8a1a);
        if (Math.random() < dt * 10) puff(surf(this.a, this.ahead(2.0), 1.8), 1, 0xffffff, 2, 0.7, this.dir);
        if (onMe && arcTo(this.a, P.up, this.ahead(2.0)) < 1.6 && P.alt > 0.9 && P.vr <= 0) { bouncePlayer(16); this.cool(); this.hit(); return false; }
        if (this.mt > [3.0, 2.6, 2.2][p]) { this.cool(); return false; }
        return true;
      }
    }
    return false;
  }
  onPound() { if (this.mv === 'charge' && this.ms === 'hot' && P.planet === this.a && arcTo(this.a, P.up, this.ahead(2.0)) < 2.4) { bouncePlayer(14); this.cool(); this.hit(); } }
  update(dt, t) {
    const k = this.k;
    if (this.state === 'idle') { this.place(); k.gear.rotation.z += dt; k.arms.forEach((a, i) => (a.rotation.x = Math.sin(t * 1.5 + i * 3) * 0.2)); }
    if (this.state === 'dying') {
      this.dt = (this.dt || 0) + dt; this.m.visible = true; k.r.rotation.z = Math.sin(this.dt * 30) * 0.08; k.r.scale.setScalar(1.5 * Math.max(0.05, 1 - Math.max(0, this.dt - 1.4) / 1.2));
      if (Math.random() < dt * 24) puff(this.m.position.clone().addScaledVector(this.dir, 2 + Math.random() * 2), 2, Math.random() < 0.5 ? 0xffd23a : 0xd8d0c0, 3, 1, this.dir);
      if (this.dt > 2.6 && !this.boomed) { this.boomed = true; this.m.visible = false; sfx.win(); G.shake = 0.8; this.onWin && this.onWin(); }
    }
    this.tick(dt, t);
  }
}
