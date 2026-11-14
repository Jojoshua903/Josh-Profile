import { THREE, G, scene, camera, V3, toon, toonV, basic, mk, addOutline, damp, clamp, puff, placeOn, orientOn, surf, rOf, dirOf, anyPerp, LL, toast, banner, setPrompt, $ } from './core.js?v=20261114g';
import { sfx } from './audio.js?v=20261114g';
import { tr } from './lang.js?v=20261114g';
import { P, healPlayer, pfTest } from './player.js?v=20261114g';
import { buildBout, buildTandwiel, buildHeart, buildLaunchStar } from './models.js?v=20261114g';
import { Enemy } from './enemies.js?v=20261114g';

// A World: one or more round planets with platforms, pickups, enemies, friends and a boss arena.
const hash = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const L = (a, b, k) => a + (b - a) * k;
  const c = (i, j, k) => hash(xi + i, yi + j, zi + k);
  return L(L(L(c(0, 0, 0), c(1, 0, 0), u), L(c(0, 1, 0), c(1, 1, 0), u), v), L(L(c(0, 0, 1), c(1, 0, 1), u), L(c(0, 1, 1), c(1, 1, 1), u), v), w);
}
export const fbm = (p, s = 1) => vnoise(p.x * s, p.y * s, p.z * s) * 0.6 + vnoise(p.x * s * 2.3, p.y * s * 2.3, p.z * s * 2.3) * 0.3 + vnoise(p.x * s * 5, p.y * s * 5, p.z * s * 5) * 0.1;

// Planet shapes, like in Mario Galaxy: how far the ground is in direction d (a unit vector), as a factor of the radius.
// Kept gentle enough to walk on: no slope steeper than about 30 degrees.
// where the craters on the 'kraters' moon are: [middle, size]
const CRATERS = [[60, 40, 0.06], [-35, 80, 0.08], [20, 150, 0.05], [-60, -120, 0.07], [10, -100, 0.045], [-15, 210, 0.05], [75, -60, 0.04]].map(([la, lo, s]) => {
  const a = la * Math.PI / 180, b = lo * Math.PI / 180;
  return [{ x: Math.cos(a) * Math.sin(b), y: Math.sin(a), z: Math.cos(a) * Math.cos(b) }, s];
});
export const SHAPES = {
  // two fat ends east and west, a narrower waist round the middle (where you land)
  pinda: (d) => 0.76 + 0.52 * d.x * d.x,
  // a bit wider at the top, with a dimple at the top (for the stem) and a small one at the bottom
  appel: (d) => 1 + 0.06 * d.y - 0.2 * Math.exp(-(1 - d.y) * 14) - 0.12 * Math.exp(-(1 + d.y) * 14),
  // squashed, with eight ribs round the sides and a dip at the top for the stem
  pompoen: (d) => { const ph = Math.atan2(d.x, d.z), side = 1 - d.y * d.y; return (1 - 0.12 * d.y * d.y) * (1 - 0.075 * (0.5 - 0.5 * Math.cos(8 * ph)) * side) - 0.12 * Math.exp(-(1 - d.y) * 12); },
  // a lumpy potato rock
  aardappel: (d) => 0.86 + 0.3 * fbm(d, 1.3),
  // a die with rounded corners
  dobbelsteen: (d) => 0.9 / Math.cbrt(Math.abs(d.x) ** 3 + Math.abs(d.y) ** 3 + Math.abs(d.z) ** 3),
  // a thick vinyl record: flatter at the top and bottom, with grooves going round
  plaat: (d) => { const k = 1.08 / Math.sqrt(d.x * d.x + d.z * d.z + (d.y / 0.76) ** 2); return k * (1 - 0.012 * (0.5 + 0.5 * Math.cos(Math.sqrt(d.x * d.x + d.z * d.z) * 70)) * d.y * d.y); },
  // a cut ice gem: six rounded points (up, down and four round the sides)
  kristal: (d) => 1.07 / Math.pow(Math.abs(d.x) ** 1.6 + Math.abs(d.y) ** 1.6 + Math.abs(d.z) ** 1.6, 1 / 1.6),
  // half a round planet, half a pyramid: a soft point at the top and four sloping sides
  piramide: (d) => {
    const q = Math.max(0, 0.894 * d.x + 0.447 * d.y) ** 8 + Math.max(0, -0.894 * d.x + 0.447 * d.y) ** 8 + Math.max(0, 0.894 * d.z + 0.447 * d.y) ** 8 + Math.max(0, -0.894 * d.z + 0.447 * d.y) ** 8 + Math.max(0, -d.y) ** 8;
    return 0.95 * (0.7 + 0.3 * Math.min(2.2, 1 / Math.pow(Math.max(q, 1e-6), 1 / 8)));
  },
  // a volcano on top, with a crater in the point
  vulkaan: (d) => 0.96 + 0.32 * Math.exp(-(1 - d.y) * 5) - 0.2 * Math.exp(-(1 - d.y) * 40),
  // a water drop: round at the bottom, a point at the top
  druppel: (d) => 0.93 + 0.44 * Math.max(0, d.y) ** 6,
  // a moon full of craters: bowls with a raised rim (none where you land)
  kraters: (d) => {
    let k = 1;
    for (const [c, s] of CRATERS) {
      const t = (1 - (d.x * c.x + d.y * c.y + d.z * c.z)) / s;   // 0 in the middle of the crater, 1 at the rim
      if (t < 1.6) k += t < 1 ? -0.07 * (1 - t * t) : 0.025 * Math.exp(-(((t - 1) / 0.25) ** 2));
    }
    return k;
  },
};

export class World {
  constructor(id) {
    this.id = id;
    this.group = new THREE.Group(); scene.add(this.group);
    this.planets = []; this.pickups = []; this.enemies = []; this.npcs = []; this.updaters = []; this.interacts = [];
    this.bubbles = [];
    this.coins = 0; this.t = 0;
  }
  destroy() {
    scene.remove(this.group);
    for (const b of this.bubbles) b.el.remove();
    setPrompt('');
  }
  upAt(pos) {
    let best = this.planets[0], bd = 1e9;
    if (!pos) return V3(0, 1, 0);
    for (const p of this.planets) { const d = pos.distanceTo(p.c) - p.r; if (d < bd) { bd = d; best = p; } }
    return best ? dirOf(best, pos) : V3(0, 1, 0);
  }
  addPlanet({ c, r, paint, atmo = 0xffffff, atmoOp = 0.12, seg = 96, shape }) {
    // shape: a name from SHAPES (or a function) that says how far the ground is in every direction, 1 = round.
    // Gravity still pulls to the middle, like the odd-shaped planets in Mario Galaxy.
    const sh = typeof shape === 'string' ? SHAPES[shape] : shape;
    if (sh) seg = Math.max(seg, 128);
    const geo = new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75));
    const pos = geo.attributes.position, col = new Float32Array(pos.count * 3), p = V3(), out = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      p.set(pos.getX(i), pos.getY(i), pos.getZ(i)).divideScalar(r);
      paint(p, out);
      col[i * 3] = out.r; col[i * 3 + 1] = out.g; col[i * 3 + 2] = out.b;
      if (sh) { p.normalize(); const k = r * sh(p); pos.setXYZ(i, p.x * k, p.y * k, p.z * k); }
    }
    if (sh) geo.computeVertexNormals();
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mesh = new THREE.Mesh(geo, toonV()); mesh.position.copy(c);
    addOutline(mesh, (r + 0.22) / r);
    this.group.add(mesh);
    const halo = new THREE.Mesh(new THREE.SphereGeometry(r * (sh ? 1.7 : 1.45), 40, 30), basic(atmo, { transparent: true, opacity: atmoOp, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.position.copy(c); this.group.add(halo);
    const planet = { c: c.clone(), r, mesh, halo, platforms: [], surface: { surface: true }, world: this, shape: sh || null };
    this.planets.push(planet);
    return planet;
  }
  // put any object on a planet
  put(planet, obj, dir, alt = 0, yaw = 0) { placeOn(obj, planet, dir, alt, yaw); this.group.add(obj); return obj; }
  // A platform you can stand on. Round (r) or a box (hx, hz). b = bottom, h = top (heights above the surface).
  addPlatform(planet, o) {
    const n = (o.dir || LL(o.lat, o.lon)).clone().normalize();
    const h = o.h, b = o.b ?? (o.float ? h - (o.thick || 0.7) : -1.2);
    const pf = { planet, n, h, b, shape: o.hx ? 'box' : 'cyl', r: o.r || 1.5, hx: o.hx, hz: o.hz, bounce: o.bounce, slack: o.slack, hurt: o.hurt, crumble: o.crumble, puff: o.puff };
    const mat = o.mat || toon(o.color ?? 0xffffff);
    const g = new THREE.Group();
    const H = h - b;
    let body;
    if (pf.shape === 'box') body = mk(new THREE.BoxGeometry(o.hx * 2, H, o.hz * 2), mat, 0, b + H / 2, 0, g, 0);
    else body = mk(new THREE.CylinderGeometry(pf.r, pf.r * (o.taper ?? (o.float ? 0.7 : 1)), H, o.sides || 28), mat, 0, b + H / 2, 0, g, 0);
    // outlines with the same thickness on every side, also on long flat boxes
    const W = pf.shape === 'box' ? o.hx * 2 : pf.r * 2, D = pf.shape === 'box' ? o.hz * 2 : pf.r * 2;
    addOutline(body, 1).scale.set(1 + 0.14 / W, 1 + 0.14 / H, 1 + 0.14 / D);
    if (o.top !== undefined) {
      const topMat = toon(o.top);
      if (pf.shape === 'box') mk(new THREE.BoxGeometry(o.hx * 2 + 0.06, 0.16, o.hz * 2 + 0.06), topMat, 0, h - 0.07, 0, g, 0);
      else mk(new THREE.CylinderGeometry(pf.r + 0.04, pf.r + 0.04, 0.16, o.sides || 28), topMat, 0, h - 0.07, 0, g, 0);
    }
    pf.mesh = g; pf.body = body;
    placeOn(g, planet, n, 0, o.yaw || 0);
    this.group.add(g);
    if (pf.shape === 'box') { pf.e1 = V3(1, 0, 0).applyQuaternion(g.quaternion); pf.e2 = V3(0, 0, 1).applyQuaternion(g.quaternion); }
    // movers
    if (o.bob) {
      const h0 = h, b0 = b, [amp, spd, ph = 0] = o.bob;
      pf.slack = 0.6;
      this.updaters.push((dt, t) => { const d = Math.sin(t * spd + ph) * amp; pf.h = h0 + d; pf.b = b0 + d; g.position.copy(planet.c).addScaledVector(pf.n, rOf(planet, pf.n) + d); });
    }
    if (o.orbit) {
      const [axis, spd] = o.orbit, ax = axis.clone().normalize(), n0 = n.clone(), q = new THREE.Quaternion(), q0 = g.quaternion.clone();
      pf.dq = new THREE.Quaternion();
      this.updaters.push((dt, t) => {
        const qa = new THREE.Quaternion().setFromAxisAngle(ax, t * spd);
        const prev = pf.n.clone();
        pf.n.copy(n0).applyQuaternion(qa);
        pf.dq.setFromUnitVectors(prev, pf.n);
        g.quaternion.copy(qa).multiply(q0);
        g.position.copy(planet.c).addScaledVector(pf.n, rOf(planet, pf.n));
        if (pf.shape === 'box') { pf.e1.set(1, 0, 0).applyQuaternion(g.quaternion); pf.e2.set(0, 0, 1).applyQuaternion(g.quaternion); }
        q.copy(pf.dq);
      });
      pf.carry = (PL) => {
        const rel = PL.pos.clone().sub(planet.c).applyQuaternion(pf.dq);
        PL.pos.copy(planet.c).add(rel); PL.fwd.applyQuaternion(pf.dq); PL.vt.applyQuaternion(pf.dq);
      };
    }
    if (o.crumble) {
      pf.ct = 0; pf.offT = 0;
      pf.onLand = () => { if (pf.ct <= 0) { pf.ct = 0.0001; sfx.crack(); } };
      this.updaters.push((dt) => {
        if (pf.off) { pf.offT -= dt; body.position.y -= dt * 6; g.visible = pf.offT < 3.4 ? false : true; if (pf.offT <= 0) { pf.off = false; pf.ct = 0; g.visible = true; body.position.y = pf.b + (pf.h - pf.b) / 2; body.position.x = 0; puff(surf(planet, pf.n, pf.h), 8, 0xffffff, 2, 1, pf.n); } return; }
        if (pf.ct > 0) {
          pf.ct += dt; body.position.x = Math.sin(pf.ct * 60) * 0.05;
          if (pf.ct > 0.65) { pf.off = true; pf.offT = 3.8; sfx.crack(); puff(surf(planet, pf.n, pf.h), 12, o.color ?? 0xffffff, 3, 0.5, pf.n); }
        }
      });
    }
    planet.platforms.push(pf);
    return pf;
  }
  // decoration that also blocks you (trees, speaker stacks...). A tall round wall.
  addSolid(planet, dir, r, h) { const pf = { planet, n: dir.clone().normalize(), h, b: -1, shape: 'cyl', r }; planet.platforms.push(pf); return pf; }

  addPickup(planet, dir, alt, kind, o = {}) {
    const model = o.model || (kind === 'coin' ? buildBout() : kind === 'rare' ? buildTandwiel() : kind === 'heart' ? buildHeart() : new THREE.Group());
    const obj = new THREE.Group(); obj.add(model);
    placeOn(obj, planet, dir, alt, 0); this.group.add(obj);
    const pk = { planet, obj, model, dir: dir.clone(), alt, kind, id: o.id, name: o.name, onTake: o.onTake, radius: o.radius || (kind === 'coin' ? 1.0 : 1.3), taken: false, ph: Math.random() * 6, spin: o.spin ?? 2.4, life: o.life };
    this.pickups.push(pk);
    return pk;
  }
  dropCoin(planet, dir) {
    const pk = this.addPickup(planet, dir, 0.7, 'coin', { life: 12 });
    pk.pop = 0.5;
    return pk;
  }
  dropHeart(planet, dir) { return this.addPickup(planet, dir, 0.8, 'heart', { radius: 1.4 }); }
  addEnemy(planet, dir, type, opts) { const e = new Enemy(this, planet, dir, type, opts); this.enemies.push(e); return e; }
  // something you press E at
  addInteract(o) { this.interacts.push(o); return o; }
  addNPC(planet, model, dir, o = {}) {
    const g = model.root || model.g;
    this.put(planet, g, dir, o.alt || 0, o.yaw || 0);
    const npc = { planet, model, g, dir: dir.clone(), name: o.name, base: g.quaternion.clone(), anim: o.anim, lines: o.lines, face: o.face !== false, head: model.head, bubbleY: o.bubbleY || 2.3 };
    this.npcs.push(npc);
    if (o.lines) this.addBubble(npc, o.bubbleY || 2.3);
    return npc;
  }
  addBubble(npc, y) {
    const el = document.createElement('div'); el.className = 'bubble'; $('bubbles').appendChild(el);
    this.bubbles.push({ npc, el, y, i: 0, t: 0, shown: false });
  }
  addLaunchStar(planet, dir, o) {
    const ls = buildLaunchStar();
    this.put(planet, ls.g, dir, 0.05);
    const st = { planet, ls, dir: dir.clone(), active: false, ...o };
    st.setActive = (v) => {
      st.active = v; ls.mat.color.setHex(v ? 0xff9a2a : 0x8a8698); ls.beam.visible = v; ls.ring.visible = v;
    };
    st.setActive(false);
    this.updaters.push((dt, t) => { ls.spin.rotation.y += dt * (st.active ? 3 : 0.5); ls.spin.position.y = 0.9 + Math.sin(t * 2) * 0.08; ls.ring.scale.setScalar(1 + Math.sin(t * 4) * 0.05); });
    this.addInteract({ planet, pos: surf(planet, dir, 0.5), radius: 2.2, prompt: () => (st.active ? `<kbd>E</kbd> ${st.label || 'Launch!'}` : `🔒 ${st.lockedText || 'Launch Star is asleep'}`), use: () => { if (st.active) st.use(); else { sfx.warn(); toast(st.lockedText || 'Not yet…'); } } });
    return st;
  }

  update(dt, t) {
    this.t = t;
    for (const u of this.updaters) u(dt, t);
    for (const e of this.enemies) e.update(dt, t);
    // pickups
    const chest = P.pos.clone().addScaledVector(P.up, 0.6);
    for (const pk of this.pickups) {
      if (pk.taken) continue;
      if (pk.life !== undefined) { pk.life -= dt; if (pk.life <= 0) { pk.taken = true; pk.obj.visible = false; continue; } pk.obj.visible = pk.life > 3 || Math.floor(pk.life * 8) % 2 === 0; }
      pk.model.rotation.y += dt * pk.spin;
      pk.model.position.y = Math.sin(t * 2 + pk.ph) * 0.12 + (pk.pop > 0 ? Math.sin((0.5 - pk.pop) * Math.PI * 2) * 0.6 : 0);
      if (pk.pop > 0) pk.pop -= dt;
      if (P.planet === pk.planet && !P.dead && !G.cutscene && chest.distanceTo(pk.obj.position) < pk.radius) this.take(pk);
    }
    // friends turn to look at you
    for (const n of this.npcs) {
      if (n.anim) n.anim(dt, t, n);
      if (n.face && P.planet === n.planet) {
        const up = n.dir, toP = P.up.clone().addScaledVector(up, -P.up.dot(up));
        if (toP.lengthSq() > 1e-8 && Math.acos(clamp(up.dot(P.up), -1, 1)) * n.planet.r < 8) {
          const q = new THREE.Quaternion(); const tmp = new THREE.Object3D(); orientOn(tmp, up, toP.normalize()); q.copy(tmp.quaternion);
          n.g.quaternion.slerp(q, damp(4, dt));
        }
      }
    }
    this.updateBubbles(dt);
  }
  take(pk) {
    pk.taken = true; pk.obj.visible = false;
    const at = pk.obj.position.clone();
    if (pk.kind === 'coin') {
      sfx.coin(); this.coins++; G.coins = (G.coins || 0) + 1; puff(at, 5, 0xffc23d, 2, 0.6);
      if (G.onCoin) G.onCoin();
      if (G.coins % 10 === 0 && healPlayer(1)) toast('10 bolts: +1 ❤');
    } else if (pk.kind === 'heart') { if (!healPlayer(1)) sfx.coin(); puff(at, 10, 0xff5a6e, 3, 1); }
    else if (pk.kind === 'rare') { sfx.rare(); puff(at, 20, 0xffd23a, 4, 2); banner('GOLDEN GEAR!', pk.name || ''); }
    if (pk.onTake) pk.onTake(pk);
  }
  // the E prompt: the nearest thing you can use
  nearestInteract() {
    let best = null, bd = 1e9;
    for (const it of this.interacts) {
      if (it.planet !== P.planet || (it.cond && !it.cond())) continue;
      const pos = typeof it.pos === 'function' ? it.pos() : it.pos;
      const d = pos.distanceTo(P.pos);
      if (d < it.radius && d < bd) { bd = d; best = it; }
    }
    return best;
  }
  onPound(pos) {
    for (const e of this.enemies) if (!e.dead && e.p === P.planet && surf(e.p, e.dir, e.alt).distanceTo(pos) < 2.8) e.kill(true);
  }
  updateBubbles(dt) {
    const W = innerWidth, H = innerHeight;
    for (const b of this.bubbles) {
      const n = b.npc;
      const near = !G.cutscene && P.planet === n.planet && n.g.position.distanceTo(P.pos) < 7 && G.state === 'play';
      if (!near) { if (b.shown) { b.el.style.opacity = 0; b.shown = false; } continue; }
      const lines = n.lines();
      if (!lines || !lines.length) { b.el.style.opacity = 0; continue; }
      b.t -= dt;
      if (b.t <= 0 || !b.shown) { b.i = (b.i + (b.shown ? 1 : 0)) % lines.length; b.el.textContent = tr(lines[b.i]); b.t = 3.5 + lines[b.i].length * 0.06; }
      b.shown = true;
      const p = n.g.position.clone().addScaledVector(n.dir, b.y).project(camera);
      if (p.z > 1) { b.el.style.opacity = 0; continue; }
      b.el.style.opacity = 1;
      b.el.style.transform = `translate(${((p.x + 1) / 2) * W}px, ${((1 - p.y) / 2) * H}px) translate(-50%, -100%)`;
    }
  }
}

// Shared: a starry sky
export function addStars(world, n = 1400, R = 700, center = V3()) {
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  const cA = new THREE.Color(0xffffff), cB = new THREE.Color(0xffe8b0), cC = new THREE.Color(0xc8b0ff), t = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const v = V3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize().multiplyScalar(R * (0.8 + Math.random() * 0.2)).add(center);
    pos.set([v.x, v.y, v.z], i * 3);
    t.copy([cA, cB, cC][i % 3]); col.set([t.r, t.g, t.b], i * 3);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false }));
  world.group.add(pts);
  return pts;
}
// a far-away decorative planet (just for the view)
export function addBackdropPlanet(world, pos, r, color, ring) {
  const m = mk(new THREE.SphereGeometry(r, 32, 24), toon(color), pos.x, pos.y, pos.z, world.group, 1 + 0.6 / r);
  if (ring) { const rg = new THREE.Mesh(new THREE.TorusGeometry(r * 1.7, r * 0.12, 4, 48), toon(ring)); rg.rotation.x = 1.2; m.add(rg); }
  return m;
}
export { anyPerp };
