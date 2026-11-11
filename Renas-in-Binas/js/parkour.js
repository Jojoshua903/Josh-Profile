import { LL, V3, basic, mk, THREE, surf, coinRing, coinOn, sign, rareItem, G, sfx, toast } from './worlds-common.js?v=20261112d';
import { fbm } from './world.js?v=20261112d';
import { textBoard } from './models.js?v=20261112d';
import { fade, placeOn, anyPerp } from './core.js?v=20261112d';
import { P, drawHearts, spawnPlayer, resetCam } from './player.js?v=20261112d';
import { showTitle } from './cutscene.js?v=20261112d';

// A parkour over a bottomless void, on a small hidden planet far away. Its ground is invisible:
// fall off the platforms and you drop into the void. Checkpoint markers light up when you touch them.
// o: { home, entryDir, entryPrompt, exitDir, exitFwd, title, sub, voidText, rareId, rareName, marker(), theme, route }
// route: a list of [type, count] sections: hop, bob, crumble, zig, circle, bounce, down, gap, cp
export function addParkour(w, ctx, o) {
  const T = o.theme;
  const park = w.addPlanet({ c: o.c || V3(150, -20, 60), r: 16, atmo: 0x000000, atmoOp: 0, paint: (p, out) => out.setHex(0x0a0610) });
  park.mesh.visible = false; park.halo.visible = false;
  w.parkPlanet = park;
  // the space around it: a dome with glowing gems, and a glow deep in the void
  {
    const dome = new THREE.SphereGeometry(44, 48, 32), pos = dome.attributes.position, col = new Float32Array(pos.count * 3), p = V3(), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      p.set(pos.getX(i), pos.getY(i), pos.getZ(i)).normalize();
      const n = fbm(p, 3.2);
      c.setHex(n > 0.62 ? T.dome[0] : n > 0.45 ? T.dome[1] : T.dome[2]);
      if (n > 0.8) c.setHex(T.dome[3] ?? T.gems[0]);
      col.set([c.r, c.g, c.b], i * 3);
    }
    dome.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const dm = new THREE.Mesh(dome, new THREE.MeshToonMaterial({ vertexColors: true, side: THREE.BackSide }));
    dm.position.copy(park.c); w.group.add(dm);
    for (let i = 0; i < 26; i++) {
      const d = new THREE.Vector3(Math.sin(i * 2.4) * Math.cos(i * 0.9), Math.cos(i * 1.7), Math.sin(i * 0.9) * Math.cos(i * 2.4)).normalize();
      const geo = T.gemShape === 'ball' ? new THREE.SphereGeometry(0.9 + (i % 3) * 0.5, 12, 10) : new THREE.OctahedronGeometry(0.9 + (i % 3) * 0.5);
      const cr = mk(geo, basic(T.gems[i % T.gems.length]), 0, 0, 0, w.group, 1.08);
      cr.position.copy(park.c).addScaledVector(d, 41); if (T.gemShape !== 'ball') cr.scale.y = 2.4; cr.lookAt(park.c); cr.rotateX(Math.PI / 2);
    }
    const core = new THREE.Mesh(new THREE.SphereGeometry(5, 24, 16), basic(T.core)); core.position.copy(park.c); w.group.add(core);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(10, 24, 16), basic(T.glow, { transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.position.copy(park.c); w.group.add(glow);
    w.updaters.push((dt, t) => glow.scale.setScalar(1 + Math.sin(t * (T.pulse || 1.3)) * 0.06));
  }

  // first lay out the route as distances, then bend it into this planet's own shape (see coursePath below)
  const spec = [], cps = [];
  let lon = 0, h = 5;
  const add = (dl, off, hh, opt = {}, then) => { lon += dl; const s = { lon, off, h: hh, opt, then }; spec.push(s); return s; };
  const startS = add(0, 0, 5, { hx: 2.2, hz: 2.2, top: T.cpTop }); cps.push(startS);
  for (const [type, n = 1] of o.route) {
    for (let k = 0; k < n; k++) {
      const s1 = k % 2 ? -1 : 1;
      if (type === 'hop') { h = Math.max(5, h + (k % 2 ? 0.4 : -0.1)); add(12, 3 * s1, h, {}, (pf) => coinOn(w, pf)); }
      if (type === 'bob') add(12, (k % 3 - 1) * 4, h + 0.4, { bob: [0.9, 1.5, k * 1.7], color: T.alt }, (pf) => coinOn(w, pf));
      if (type === 'crumble') add(10, [0, 3, -3][k % 3], h + 0.4, { r: 1.2, crumble: true, color: T.crumble, top: undefined });
      if (type === 'zig') { h += 0.3; add(10, 4 * s1, h, { hx: 0.55, hz: 1.7, yaw: s1 > 0 ? 0.5 : -0.5 }, (pf) => coinOn(w, pf)); }
      if (type === 'circle') add(14, 0, h + 0.3, { r: 1.3, circle: k % 2 ? -1.1 : 1.1, color: T.alt });
      if (type === 'bounce') {
        add(12, 0, h + 1.1, { r: 1.4, thick: 0.5, bounce: 20, color: T.bounce, top: 0xffffff, puff: T.puff || 0xffd36a });
        h += 5.5; add(14, 0, h, { r: 1.8 }, (pf) => coinRing(w, park, pf.n, 1.2, 5, pf.h + 0.9));
      }
      if (type === 'down') { h = Math.max(5.5, h - 1.4); add(11, 3 * s1, h, { r: 1.1, ...(k % 2 ? { bob: [0.6, 2, k] } : {}) }); }
      if (type === 'gap') {
        const s = add(12, 0, h + 0.2, { r: 1.3 });
        s.sign = true;
        h += 0.4; add(28, 0, h, { r: 1.6 });
      }
      if (type === 'cp') cps.push(add(13, 0, h, { hx: 2, hz: 2, top: T.cpTop }));
    }
  }
  const finS = add(13, 0, h, { hx: 2.2, hz: 2.2, top: T.finTop }); cps.push(finS);
  const total = Math.max(lon, 1);
  const path = coursePath(o.shape || CAVE_SHAPE[w.id] || 'zigzag', total);
  for (const s of spec) {
    const dir = path.place(s.lon, s.off), hh = s.h + path.dh(s.lon);
    const base = { dir, h: hh, float: true, thick: 0.7, r: 1.4, color: T.plat, top: T.platTop, ...s.opt };
    if (s.opt.circle) { delete base.circle; base.dir = path.place(s.lon, s.off + 5); base.orbit = [dir, s.opt.circle]; }
    s.pf = w.addPlatform(park, base);
    if (s.then) s.then(s.pf);
    if (s.sign) sign(w, park, path.place(s.lon, s.off + 2.2), textBoard('☄️ X!', 1.6, 0.8, T.signFg || '#5ef2e0', T.signBg || '#2b2440'), 0.4, hh + 1.6);
  }
  const start = startS.pf, fin = finS.pf;
  rareItem(w, ctx, park, fin.n, fin.h + 1.2, o.rareId, o.rareName);
  coinRing(w, park, fin.n, 1.6, 8, fin.h + 0.8);
  // checkpoint markers on the start, every checkpoint and the finish
  const markers = new Map();
  for (const s of cps) {
    const m = o.marker(); m.scale.multiplyScalar(1.2);
    const holder = new THREE.Group(); holder.add(m); m.position.set(1.4, 0.9, 1.4);
    placeOn(holder, park, s.pf.n, s.pf.h); w.group.add(holder);
    markers.set(s.pf, m);
  }
  const lit = (pf) => { const m = markers.get(pf); if (m) m.traverse((c) => c.isMesh && !c.parent.isMesh && c.material.color && c.geometry.type === 'SphereGeometry' && c.material.color.setHex(0x7dffe0)); };   // outlines are children of meshes and share one material: skip them
  let cp = startS; lit(start);
  const tangentToDir = (from, to) => to.clone().addScaledVector(from, -to.dot(from)).normalize();
  const standOn = (s) => {
    const ahead = path.ahead(s.lon);
    spawnPlayer(park, s.pf.n, tangentToDir(s.pf.n, ahead));
    P.pos.copy(surf(park, s.pf.n, s.pf.h + 0.02)); P.alt = P.prevAlt = s.pf.h; P.inv = 1;
    resetCam();
  };
  // in and out
  w.addInteract({ planet: o.home, pos: surf(o.home, o.entryDir, 0.6), radius: 2.6, prompt: () => o.entryPrompt, use: async () => {
    sfx.select(); await fade(true, 350);
    cp = startS; standOn(startS);
    await fade(false, 400);
    showTitle(o.title, o.sub, 3200);
  } });
  const goOut = async () => {
    sfx.select(); await fade(true, 350);
    spawnPlayer(o.home, o.exitDir, o.exitFwd);
    await fade(false, 400);
  };
  w.addInteract({ planet: park, pos: () => surf(park, start.n, start.h + 0.4), radius: 2.0, prompt: () => '<kbd>E</kbd> back outside', use: goOut });
  w.addInteract({ planet: park, pos: () => surf(park, fin.n, fin.h + 0.4), radius: 2.2, prompt: () => '<kbd>E</kbd> take the lift back up', use: goOut });
  // the void, checkpoints and the sky
  w.updaters.push(() => {
    const inside = P.planet === park;
    if (inside !== !!w.inPark) { w.inPark = inside; ctx.setSky(inside ? T.sky : w.sky); }
    if (!inside || G.state !== 'play' || G.cutscene || P.dead) return;
    if (P.grounded && P.ground !== cp.pf) {
      const s = cps.find((c) => c.pf === P.ground);
      if (s && s !== startS) { cp = s; lit(s.pf); sfx.quest(); toast('Checkpoint!', 1400); }
    }
    if (P.alt < 2) {   // every platform is higher than this, so down here is the void
      P.hp--; drawHearts(); sfx.hurt(); G.shake = Math.max(G.shake, 0.3);
      if (P.hp <= 0) { P.dead = true; if (G.onDie) G.onDie(); return; }
      toast(o.voidText || 'Into the void! Back to the last checkpoint.', 1800);
      standOn(cp);
    }
  });
  return park;
}

// a little checkpoint beacon: a pole with a glowing bulb on top (the bulb turns cyan when lit)
export function buildBeacon(pole = 0x2b2440, bulb = 0xffd36a) {
  const g = new THREE.Group();
  mk(new THREE.CylinderGeometry(0.06, 0.08, 1.4, 8), basic(pole), 0, 0.7, 0, g, 1.1);
  mk(new THREE.SphereGeometry(0.26, 14, 10), basic(bulb), 0, 1.5, 0, g, 1.1);
  return g;
}

// ---------- the shape of a course ----------
// Every course follows its own shape, so no two feel the same:
//   zigzag    - long rows back and forth, like a snake game
//   snake     - a wavy line all the way round the middle of the planet
//   lightning - sharp diagonal Z's from the south to the north
//   star      - the outline of a five-pointed star round the north pole, climbing a bit
//   coaster   - one big circle, with the platforms rising and falling like a rollercoaster
//   climb     - short tight rows that step upwards, like stairs up a wall
// l is the distance along the route in degrees. Gaps are never stretched: a short shape squeezes the course a little instead.
const DEG = Math.PI / 180;
const angDeg = (a, b) => Math.acos(Math.max(-1, Math.min(1, a.dot(b)))) / DEG;
function densify(pts) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const n = Math.max(1, Math.ceil(angDeg(pts[i - 1], pts[i]) / 4));
    for (let j = 1; j <= n; j++) out.push(pts[i - 1].clone().lerp(pts[i], j / n).normalize());
  }
  return out;
}
const lengthOf = (pts) => { let L = 0; for (let i = 1; i < pts.length; i++) L += angDeg(pts[i - 1], pts[i]); return L; };
function starPts(rho) {   // nine edges of a five-pointed star round the north pole (the last edge is left out, so the finish isn't next to the start)
  const pts = [];
  for (let i = 0; i < 10; i++) pts.push(LL(90 - (i % 2 ? rho * 0.42 : rho), i * 36));
  return densify(pts);
}
export function coursePath(shape, total) {
  let pts = [], dh = () => 0;
  const need = total * 0.9;
  const row = (lat, a, b) => { pts.push(LL(lat, a), LL(lat, (a + b) / 2), LL(lat, b)); };
  if (shape === 'spiral') {
    const at = (l) => LL(-35 + Math.max(0, Math.min(total, l)) * (70 / total), l);
    return wrap(at, dh, total);
  }
  if (shape === 'zigzag') [-42, -21, 0, 21, 42].forEach((lat, i) => row(lat, i % 2 ? 62 : -62, i % 2 ? -62 : 62));
  else if (shape === 'snake') for (let lon = -160; lon <= 160; lon += 2) pts.push(LL(22 * Math.sin(lon * 2 * Math.PI / 70), lon));
  else if (shape === 'lightning') for (let i = 0; i <= 7; i++) pts.push(LL(-50 + i * (100 / 7), i % 2 ? 42 : -42));
  else if (shape === 'star') {
    let rho = 20; while (rho < 88 && lengthOf(starPts(rho)) < need) rho += 1;
    pts = starPts(rho); dh = (u) => u * 6;
  } else if (shape === 'coaster') {
    const tilt = 35 * DEG;
    for (let a = 0; a <= 320; a += 4) pts.push(new THREE.Vector3(Math.cos(a * DEG), Math.sin(a * DEG) * Math.sin(tilt), Math.sin(a * DEG) * Math.cos(tilt)));
    dh = (u) => 2.5 * (1 - Math.cos(u * Math.PI * 6));
  } else if (shape === 'climb') { [-40, -24, -8, 8, 24, 40].forEach((lat, i) => row(lat, i % 2 ? 32 : -32, i % 2 ? -32 : 32)); dh = (u) => u * 6; }
  pts = densify(pts);
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + angDeg(pts[i - 1], pts[i]));
  const L = cum[cum.length - 1], k = Math.min(0.9, L / total);
  const at = (l) => {
    const s = Math.max(0, Math.min(L, l * k));
    let lo = 0, hi = cum.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= s) lo = mid; else hi = mid; }
    const f = (s - cum[lo]) / Math.max(1e-6, cum[hi] - cum[lo]);
    return pts[lo].clone().lerp(pts[hi], f).normalize();
  };
  return wrap(at, dh, total);
}
function wrap(at, dh, total) {
  const side = (l) => {
    const d = at(l), t = at(l + 1).sub(at(l - 1));
    const s = new THREE.Vector3().crossVectors(d, t);
    return s.lengthSq() > 1e-12 ? s.normalize() : anyPerp(d);
  };
  // a point "off" degrees to the side of the route
  const place = (l, off = 0) => { const d = at(l); return off ? d.multiplyScalar(Math.cos(off * DEG)).addScaledVector(side(l), Math.sin(off * DEG)).normalize() : d; };
  return { at, side, place, dh: (l) => dh(Math.max(0, Math.min(1, l / total))), ahead: (l) => at(l + 12) };
}
// which shape each planet's parkour cave gets (so the caves you play one after another never look alike)
const CAVE_SHAPE = { milo: 'zigzag', lars: 'climb', deniz: 'coaster', fionn: 'star', reshman: 'zigzag', lotte: 'climb', farah: 'coaster', sami: 'zigzag', saar: 'lightning', kosmo: 'snake', nathan: 'climb', werk: 'zigzag' };
