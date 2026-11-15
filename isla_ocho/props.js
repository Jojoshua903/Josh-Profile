import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { TEX } from './textures.js';
import { shoreS, height, ISLET } from './island.js';

let seed = 42;
const R = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const rr = (a, b) => a + R() * (b - a);
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: o.r ?? 0.8, metalness: o.m ?? 0, ...(o.x || {}) });
const dummy = new THREE.Object3D();
// keep scenery off the archery range, bowling lane and the pier
const blocked = (x, z) => (Math.abs(x) < 9 && z < -16 && z > -80) || (x > 6 && x < 15 && z > 38 && z < 80);

function instanced(geo, mat, n, shadow = true) {
  const m = new THREE.InstancedMesh(geo, mat, n);
  m.castShadow = shadow; m.receiveShadow = true;
  return m;
}
function jitter(geo, amt) {
  const p = geo.attributes.position, map = new Map();
  for (let i = 0; i < p.count; i++) {
    const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
    if (!map.has(key)) map.set(key, 1 - amt / 2 + R() * amt);
    const k = map.get(key); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k);
  }
  geo.computeVertexNormals(); return geo;
}

function frondGeometry() {
  const L = 3.3, NX = 14, pos = [], col = [], idx = [];
  const dark = new THREE.Color(0x23803e), light = new THREE.Color(0x8ad86c), c = new THREE.Color();
  for (let i = 0; i <= NX; i++) {
    const t = i / NX, x = t * L, yb = (0.6 * t - 1.55 * t * t) * L * 0.45;
    const w = 0.58 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.04)), 0.55) * (1 - t * 0.3) + 0.015;
    for (const j of [-1, 0, 1]) {
      pos.push(x, yb - Math.abs(j) * w * 0.4 + (j === 0 ? 0.03 : 0), j * w);
      c.copy(dark).lerp(light, t * 0.85 + (j ? 0.1 : 0)); col.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < NX; i++) for (let j = 0; j < 2; j++) { const a = i * 3 + j, b = a + 1, cc = a + 3, d = cc + 1; idx.push(a, cc, b, b, cc, d); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals(); return g;
}
function trunkVariant(h, lean) {
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, -0.2, 0), new THREE.Vector3(lean * 0.25, h * 0.35, 0), new THREE.Vector3(lean * 0.7, h * 0.7, 0), new THREE.Vector3(lean, h, 0)]);
  const TS = 24, RS = 8, g = new THREE.TubeGeometry(curve, TS, 0.24, RS, false);
  const p = g.attributes.position, col = new Float32Array(p.count * 3), a = new THREE.Color(0x9b6b3f), b = new THREE.Color(0x7a5230);
  for (let i = 0; i <= TS; i++) {
    const ctr = curve.getPointAt(i / TS), k = 1.25 - (i / TS) * 0.55;
    for (let j = 0; j <= RS; j++) {
      const v = i * (RS + 1) + j;
      p.setXYZ(v, ctr.x + (p.getX(v) - ctr.x) * k, ctr.y + (p.getY(v) - ctr.y) * k, ctr.z + (p.getZ(v) - ctr.z) * k);
      const c = (i % 2 ? a : b); col.set([c.r, c.g, c.b], v * 3);
    }
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
  return { geo: g, top: curve.getPointAt(1) };
}

export function buildProps(world) {
  const updaters = [];

  // ---------- palms ----------
  const variants = [trunkVariant(6, 1.4), trunkVariant(7.2, 2.2), trunkVariant(8.2, 2.8)];
  const spots = [];
  for (let i = 0; i < 40; i++) {
    const a = R() * Math.PI * 2, r = rr(31, 43.5), x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (blocked(x, z) || spots.some((s) => Math.hypot(s.x - x, s.z - z) < 3.2)) continue;
    spots.push({ x, z, v: Math.floor(R() * 3), ry: Math.atan2(x, z) + Math.PI / 2 + rr(-0.6, 0.6) });
  }
  // palm-lined beaches all the way around the island
  for (let k = 0; k < 6000 && spots.length < 130; k++) {
    const x = rr(-210, 290), z = rr(-330, 75), sh = shoreS(x, z);
    if (sh < 6 || sh > 16 || blocked(x, z) || Math.hypot(x, z) < 46 || spots.some((s) => Math.hypot(s.x - x, s.z - z) < 4)) continue;
    spots.push({ x, z, y: height(x, z) - 0.1, v: Math.floor(R() * 3), ry: R() * Math.PI * 2 });
  }
  const trunkMat = std(0xffffff, { r: 0.9, x: { vertexColors: true } });
  const trunks = variants.map((v) => instanced(v.geo, trunkMat, spots.filter((s) => s.v === variants.indexOf(v)).length || 1));
  const frondMat = std(0xffffff, { r: 0.7, x: { vertexColors: true, side: THREE.DoubleSide } });
  const FR = 9, fronds = instanced(frondGeometry(), frondMat, spots.length * FR);
  const nuts = instanced(new THREE.SphereGeometry(0.17, 10, 8), std(0x6b4423, { r: 0.6 }), spots.length * 3);
  const counts = [0, 0, 0], frondInfo = [];
  spots.forEach((s, si) => {
    const v = variants[s.v];
    dummy.position.set(s.x, s.y || 0, s.z); dummy.rotation.set(0, s.ry, 0); dummy.scale.setScalar(1); dummy.updateMatrix();
    trunks[s.v].setMatrixAt(counts[s.v]++, dummy.matrix);
    const top = v.top.clone().applyMatrix4(dummy.matrix);
    for (let k = 0; k < FR; k++) frondInfo.push({ top, a: (k / FR) * Math.PI * 2 + rr(-0.2, 0.2), tilt: rr(-0.15, 0.35), ph: R() * 6, s: rr(0.85, 1.15) });
    for (let k = 0; k < 3; k++) { dummy.position.copy(top).add(new THREE.Vector3(Math.cos(k * 2.1) * 0.22, -0.28, Math.sin(k * 2.1) * 0.22)); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); nuts.setMatrixAt(si * 3 + k, dummy.matrix); }
  });
  trunks.forEach((tm, i) => { tm.count = counts[i]; });
  dummy.rotation.order = 'XYZ';
  world.add(...trunks, fronds, nuts);
  const placeFronds = (t) => {
    frondInfo.forEach((f, i) => {
      dummy.position.copy(f.top); dummy.rotation.set(0, f.a + Math.sin(t * 0.9 + f.ph) * 0.04, f.tilt + Math.sin(t * 1.3 + f.ph) * 0.06, 'YZX');
      dummy.scale.setScalar(f.s); dummy.updateMatrix(); fronds.setMatrixAt(i, dummy.matrix);
    });
    fronds.instanceMatrix.needsUpdate = true;
  };
  placeFronds(0);
  let swayT = 0;
  updaters.push((dt, t) => { swayT += dt; if (swayT > 1 / 30) { swayT = 0; placeFronds(t); } });

  // ---------- bushes, flowers, grass tufts, rocks ----------
  const bushGeo = jitter(new THREE.IcosahedronGeometry(1, 2), 0.35);
  const bushes = instanced(bushGeo, std(0xffffff, { r: 0.85 }), 70);
  const flowers = instanced(new THREE.SphereGeometry(0.11, 8, 6), std(0xffffff, { r: 0.5 }), 200, false);
  const tufts = instanced(new THREE.ConeGeometry(0.07, 0.55, 3), std(0x4daa4a, { r: 0.9 }), 420, false);
  const greens = [0x2f8f4a, 0x3aa457, 0x4fb862, 0x2a7d43], petals = [0xff6b9a, 0xffc93c, 0xffffff, 0xff6b4f, 0xc78bff];
  const c = new THREE.Color();
  let nb = 0, nf = 0, nt = 0;
  while (nb < 70) {
    const a = R() * Math.PI * 2, r = rr(29, 44), x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (blocked(x, z)) continue;
    const s = rr(0.5, 1.25);
    dummy.position.set(x, s * 0.35, z); dummy.rotation.set(0, R() * 6, 0); dummy.scale.set(s * rr(0.9, 1.4), s * 0.7, s); dummy.updateMatrix();
    bushes.setMatrixAt(nb, dummy.matrix); bushes.setColorAt(nb++, c.set(greens[Math.floor(R() * 4)]));
    for (let k = 0; k < 3 && nf < 200; k++) {
      dummy.position.set(x + rr(-1.6, 1.6), 0.12, z + rr(-1.6, 1.6)); dummy.scale.setScalar(rr(0.7, 1.3)); dummy.updateMatrix();
      flowers.setMatrixAt(nf, dummy.matrix); flowers.setColorAt(nf++, c.set(petals[Math.floor(R() * 5)]));
    }
    for (let k = 0; k < 6 && nt < 420; k++) {
      dummy.position.set(x + rr(-2.5, 2.5), 0.2, z + rr(-2.5, 2.5)); dummy.rotation.set(rr(-0.3, 0.3), R() * 6, rr(-0.3, 0.3)); dummy.scale.setScalar(rr(0.6, 1.4)); dummy.updateMatrix();
      tufts.setMatrixAt(nt++, dummy.matrix);
    }
  }
  flowers.count = nf; tufts.count = nt;
  const rockGeo = jitter(new THREE.DodecahedronGeometry(1, 1), 0.45);
  const rocks = instanced(rockGeo, std(0xffffff, { r: 0.95, x: { flatShading: true } }), 130);
  let nr = 0, tries = 0;
  // rocky outcrops scattered along the whole coastline (but not in front of the resort)
  while (nr < 130 && tries++ < 20000) {
    const x = rr(-210, 290), z = rr(-330, 75), sh = shoreS(x, z);
    if (sh < -5 || sh > 1.5 || blocked(x, z) || (Math.abs(x) < 30 && z > 25)) continue;
    const s = rr(0.6, 2.6);
    dummy.position.set(x, height(x, z) - s * 0.25, z); dummy.rotation.set(R() * 3, R() * 3, R() * 3); dummy.scale.set(s, s * rr(0.5, 0.9), s * rr(0.8, 1.2)); dummy.updateMatrix();
    rocks.setMatrixAt(nr, dummy.matrix); rocks.setColorAt(nr++, c.set(0x9a948a).multiplyScalar(rr(0.8, 1.15)));
  }
  rocks.count = nr;
  world.add(bushes, flowers, tufts, rocks);

  // ---------- beach huts ----------
  [35, 150, 222].forEach((deg) => {
    const a = (deg * Math.PI) / 180, x = Math.cos(a) * 38, z = Math.sin(a) * 38;
    const g = new THREE.Group();
    const wood = TEX.wood('#c58a4a', 5, [1, 1], deg);
    for (const sx of [-1.3, 1.3]) for (const sz of [-1.3, 1.3]) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 1, 6), std(0x7a5230)); st.position.set(sx, 0.5, sz); st.castShadow = true; g.add(st); }
    const deck = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.16, 3.4), std(0xffffff, { x: { map: wood } })); deck.position.y = 1; deck.castShadow = deck.receiveShadow = true; g.add(deck);
    const walls = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.9, 2.6), std(0xffffff, { x: { map: wood } })); walls.position.y = 2.05; walls.castShadow = walls.receiveShadow = true; g.add(walls);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.3, 0.05), std(0x123247)); door.position.set(0, 1.8, 1.31); g.add(door);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.7, 1.7, 4, 1), std(0xffffff, { r: 1, x: { map: TEX.thatch() } })); roof.position.y = 3.8; roof.rotation.y = Math.PI / 4; roof.castShadow = true; g.add(roof);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.4), std(0xff6b4f, { x: { side: THREE.DoubleSide } })); flag.position.set(0.35, 5.2, 0); g.add(flag);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 5), std(0xffffff)); pole.position.y = 4.9; g.add(pole);
    g.position.set(x, 0, z); g.lookAt(0, 0, 0); world.add(g);
    updaters.push((dt, t) => { flag.rotation.y = Math.sin(t * 3 + deg) * 0.35; });
  });

  // ---------- beach umbrellas & towels ----------
  const stripeSets = [[0xff6b4f, 0xffffff], [0x13a9c2, 0xffffff], [0xffc93c, 0xff6b4f], [0x2f9e5b, 0xfff4dc]];
  [10, 60, 95, 125, 185, 250, 300, 330].forEach((deg, i) => {
    const a = (deg * Math.PI) / 180, r = rr(41, 44), x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (blocked(x, z)) return;
    const g = new THREE.Group();
    const cg = new THREE.ConeGeometry(1.6, 0.6, 16, 1, true);
    const pc = cg.attributes.position, colArr = new Float32Array(pc.count * 3), set = stripeSets[i % 4];
    for (let v = 0; v < pc.count; v++) { const ang = Math.atan2(pc.getZ(v), pc.getX(v)); const k = Math.floor(((ang + Math.PI) / (Math.PI * 2)) * 16 + 0.5) % 2; c.set(set[k]); colArr.set([c.r, c.g, c.b], v * 3); }
    cg.setAttribute('color', new THREE.BufferAttribute(colArr, 3));
    const canopy = new THREE.Mesh(cg, std(0xffffff, { r: 0.7, x: { vertexColors: true, side: THREE.DoubleSide, flatShading: true } })); canopy.position.y = 2.3; canopy.castShadow = true; g.add(canopy);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.4, 6), std(0xffffff)); pole.position.y = 1.15; g.add(pole);
    const towel = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.02, 1.8), std(set[0], { r: 0.95 })); towel.position.set(0.9, 0.012, 0.3); towel.receiveShadow = true; g.add(towel);
    g.position.set(x, 0, z); g.rotation.z = rr(-0.08, 0.08); world.add(g);
  });

  // ---------- pier ----------
  const plankTex = TEX.wood('#b88550', 4, [1, 1], 77);
  const planks = instanced(new THREE.BoxGeometry(2.6, 0.1, 0.48), std(0xffffff, { x: { map: plankTex } }), 52);
  for (let i = 0; i < 52; i++) { dummy.position.set(10.5, 0.15, 44 + i * 0.55); dummy.rotation.set(0, rr(-0.02, 0.02), 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); planks.setMatrixAt(i, dummy.matrix); }
  const posts = instanced(new THREE.CylinderGeometry(0.12, 0.14, 2.6, 7), std(0x6b4a2b), 20);
  for (let i = 0; i < 20; i++) { dummy.position.set(10.5 + (i % 2 ? 1.25 : -1.25), -0.9, 47 + Math.floor(i / 2) * 2.9); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); posts.setMatrixAt(i, dummy.matrix); }
  world.add(planks, posts);

  // ---------- distant islands + volcano ----------
  [[230, -260, 50, 26], [-300, 120, 60, 22], [320, 190, 40, 30], [70, 430, 70, 18], [-380, -120, 45, 20]].forEach(([x, z, r, h]) => {
    const sand = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.15, r * 1.3, 2, 28), std(0xf0d9a5)); sand.position.set(x, -0.6, z); world.add(sand);
    const hill = new THREE.Mesh(jitter(new THREE.SphereGeometry(r, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), 0.12), std(0x4fae62, { r: 0.95 })); hill.scale.y = h / r; hill.position.set(x, 0.3, z); world.add(hill);
  });

  // ---------- lighthouse ----------
  {
    const lx = ISLET.x, lz = ISLET.z, g = new THREE.Group();
    const base = new THREE.Mesh(jitter(new THREE.DodecahedronGeometry(9, 1), 0.3), std(0x8e8a80, { x: { flatShading: true } })); base.scale.y = 0.45; base.position.y = -1; g.add(base);
    const tg = new THREE.CylinderGeometry(1.6, 2.4, 18, 20, 9);
    const tp = tg.attributes.position, tc = new Float32Array(tp.count * 3);
    for (let v = 0; v < tp.count; v++) { c.set(Math.floor((tp.getY(v) + 9) / 2.25 + 0.001) % 2 ? 0xe8403a : 0xffffff); tc.set([c.r, c.g, c.b], v * 3); }
    tg.setAttribute('color', new THREE.BufferAttribute(tc, 3));
    const tower = new THREE.Mesh(tg, std(0xffffff, { r: 0.6, x: { vertexColors: true } })); tower.position.y = 11; g.add(tower);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(1.4, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff1a8 })); lamp.position.y = 21; g.add(lamp);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(2, 1.8, 16), std(0x123247)); cap.position.y = 23; g.add(cap);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow('255,240,170'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); glow.scale.setScalar(12); glow.position.y = 21; g.add(glow);
    const beamGeo = new THREE.ConeGeometry(4, 60, 20, 1, true); beamGeo.translate(0, -30, 0); beamGeo.rotateZ(Math.PI / 2);
    const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: 0xfff3c0, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    beam.position.y = 21; g.add(beam);
    g.position.set(lx, height(lx, lz) - 0.5, lz); world.add(g);
    updaters.push((dt, t) => { beam.rotation.y = t * 0.6; glow.material.opacity = 0.7 + Math.sin(t * 3) * 0.2; });
  }

  // ---------- sailboats ----------
  for (let i = 0; i < 4; i++) {
    const g = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.5, 5, 8, 1), std(i % 2 ? 0xffffff : 0x13a9c2, { r: 0.4 })); hull.rotation.x = Math.PI / 2; hull.scale.set(1, 1, 0.45); g.add(hull);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 6, 6), std(0x7a5230)); mast.position.y = 3; g.add(mast);
    const shape = new THREE.Shape(); shape.moveTo(0, 0.4); shape.lineTo(0, 5.8); shape.lineTo(2.6, 0.4); shape.closePath();
    const sail = new THREE.Mesh(new THREE.ShapeGeometry(shape), std([0xffffff, 0xff6b4f, 0xffc93c, 0xffffff][i], { x: { side: THREE.DoubleSide } })); sail.rotation.y = Math.PI / 2; g.add(sail);
    world.add(g);
    const cx = rr(-60, 60), cz = rr(-60, 60), rad = rr(110, 200), spd = rr(0.01, 0.025) * (i % 2 ? 1 : -1), ph = R() * 6;
    updaters.push((dt, t) => { const a = ph + t * spd; g.position.set(cx + Math.cos(a) * rad, -0.35 + Math.sin(t * 1.3 + i) * 0.15, cz + Math.sin(a) * rad); g.rotation.set(Math.sin(t * 1.1 + i) * 0.05, -a + (spd > 0 ? 0 : Math.PI), Math.sin(t * 0.9 + i) * 0.06); });
  }

  // ---------- seagulls ----------
  const wingGeo = new THREE.BufferGeometry(); wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.18, 0, 0, 0.18, 1.1, 0.05, 0.05], 3)); wingGeo.computeVertexNormals();
  const gullMat = std(0xffffff, { r: 0.6, x: { side: THREE.DoubleSide } });
  for (let i = 0; i < 14; i++) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.45, 4, 8), gullMat); body.rotation.x = Math.PI / 2; g.add(body);
    const wl = new THREE.Mesh(wingGeo, gullMat), wr = new THREE.Mesh(wingGeo, gullMat); wr.scale.x = -1; g.add(wl, wr);
    world.add(g);
    const cx = rr(-80, 80), cz = rr(-120, 60), rad = rr(25, 70), h = rr(14, 30), spd = rr(0.15, 0.3) * (i % 2 ? 1 : -1), ph = R() * 6;
    updaters.push((dt, t) => {
      const a = ph + t * spd; g.position.set(cx + Math.cos(a) * rad, h + Math.sin(t * 0.7 + i) * 1.5, cz + Math.sin(a) * rad);
      g.rotation.set(0, -a + (spd > 0 ? Math.PI : 0), spd > 0 ? -0.25 : 0.25);
      const f = Math.sin(t * 7 + i) * 0.55; wl.rotation.z = f; wr.rotation.z = -f;
    });
  }

  // ---------- clouds ----------
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, emissive: 0x9fb4c8, emissiveIntensity: 0.35 });
  const puffGeo = new THREE.IcosahedronGeometry(1, 2);
  const clouds = [];
  for (let i = 0; i < 18; i++) {
    const g = new THREE.Group(), n = 5 + Math.floor(R() * 4);
    for (let j = 0; j < n; j++) { const p = new THREE.Mesh(puffGeo, cloudMat); const s = rr(7, 14); p.scale.set(s, s * 0.6, s * 0.8); p.position.set((j - n / 2) * rr(6, 9), rr(-1, 3), rr(-5, 5)); g.add(p); }
    const a = R() * Math.PI * 2, r = rr(220, 520); g.position.set(Math.cos(a) * r, rr(70, 130), Math.sin(a) * r);
    world.add(g); clouds.push({ g, s: rr(0.8, 2) });
  }
  updaters.push((dt) => clouds.forEach((cl) => { cl.g.position.x += cl.s * dt; if (cl.g.position.x > 560) cl.g.position.x = -560; }));

  return { update: (dt, t) => updaters.forEach((u) => u(dt, t)) };
}
