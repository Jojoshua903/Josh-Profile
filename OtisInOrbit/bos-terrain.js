import { THREE, scene, toon } from './core.js';

// Het Paddenstoelenbos is a journey, not a circle around a middle: you land at the southern edge,
// and the Woekerzwam looms over the far northern edge. In between, areas that connect in several ways:
//   landingsplek (south) ─┬─ west:  Lars' dorpje in the mushroom caps ── kruinenpad ──┐
//                         ├─ north: het giftige moeras ── grown mushroom stairs ──────┤── woekervlakte (north)
//                         └─ east:  de wortelheuvel (tunnels) ── omgevallen stam ─────┘
// Small crawl tunnels link the moeras and the heuvel, and the dorpje and the moeras share a path.
export const CELL = 2;
const X0 = -72, Z0 = -104, NX = 72, NZ = 82;
const Hm = new Float32Array(NX * NZ).fill(-Infinity);
const Km = new Uint8Array(NX * NZ).fill(255);
export const PLATEAU_H = 10;
export const ARENA = { x: 12, y: PLATEAU_H, z: -84, r: 13 };
const R = (x, z, x0, x1, z0, z1) => x >= x0 && x < x1 && z >= z0 && z < z1;
function segDist(x, z, [ax, az], [bx, bz]) {
  const dx = bx - ax, dz = bz - az, k = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - ax - dx * k, z - az - dz * k);
}
// islands in the poisonous swamp: [x, z, r]
export const ISLANDS = [[0, 9, 6], [-12, -4, 5], [10, -8, 4.5], [22, -11, 3.5], [2, -20, 4], [16, -26, 4.5], [-2, -38, 6], [20, -40, 3.5], [-22, -6, 3.5], [-21, -31, 2.6]];
const PATHS = [[[-14, 40], [-38, 24]], [[0, 34], [0, 12]], [[14, 40], [26, 22]], [[-32, 4], [-24, -4]]];
// 0 moss, 1 earth, 2 forest floor, 3 path, 4 dark grass, 5 (unused), 6 woeker purple, 7 cave
function heightFn(x, z) {
  // ---- de woekervlakte + arena (north) ----
  if (R(x, z, -40, 66, -104, -48)) {
    if (Math.hypot(x - ARENA.x, z - ARENA.z) < ARENA.r || z < -97) return [PLATEAU_H, 6];
    return [PLATEAU_H, 4];
  }
  // ---- de wortelheuvel (east), with tunnels carved at ground level ----
  if (R(x, z, 28, 66, -22, 30)) {
    if (R(x, z, 28, 46, 20, 24) || R(x, z, 42, 46, -6, 20)) return [0, 7];           // main tunnel
    if (R(x, z, 60, 62, -14, -10) || R(x, z, 58, 62, -14, -12)) return [8, 1];      // ledge in the cave wall
    if (R(x, z, 46, 62, -14, 8)) return [0, 7];                                     // the open cave (no roof)
    if (R(x, z, 32, 34, -18, 20) || R(x, z, 32, 40, -21, -18)) return [0, 7];       // crawl tunnel + root room
    if (R(x, z, 28, 32, -12, -10)) return [0, 7];                                   // crawl tunnel to the swamp
    return [PLATEAU_H, x < 30 || z > 28 ? 1 : 2];
  }
  if (R(x, z, 26, 28, -12, -10)) return [0, 7];
  // ---- het giftige moeras: islands in deadly glowing water (null = fall in) ----
  if (R(x, z, -26, 26, -46, 14)) {
    for (const [ix, iz, r] of ISLANDS) if (Math.hypot(x - ix, z - iz) < r) return [0, 2];
    if (segDist(x, z, ...PATHS[1]) < 2.4 && z > 10) return [0, 3];
    if (segDist(x, z, ...PATHS[3]) < 2.2 && x < -20) return [0, 3];
    return null;
  }
  // ---- Lars' dorpje: forest floor under giant mushrooms; the kruinenpad floor runs on north ----
  if (R(x, z, -66, -32, -58, 30)) return [0, 2];
  if (R(x, z, -32, -26, -6, 8)) return [0, 3];
  // ---- de landingsplek + paths ----
  if (((x / 24) ** 2 + ((z - 44) / 14) ** 2 < 1)) return [0, 0];
  for (const p of PATHS) if (segDist(x, z, ...p) < 2.6) return [0, 3];
  return null;
}

const kinds = [[], [], [], [], [], [], [], []];
for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
  const x = X0 + (i + 0.5) * CELL, z = Z0 + (j + 0.5) * CELL;
  const res = heightFn(x, z);
  if (!res) continue;
  Hm[j * NX + i] = res[0]; Km[j * NX + i] = res[1];
  kinds[res[1]].push([x, z, res[0]]);
}

export function groundAt(x, z, R = 0) {
  let g = -Infinity;
  const i0 = Math.floor((x - R - X0) / CELL), i1 = Math.floor((x + R - X0) / CELL);
  const j0 = Math.floor((z - R - Z0) / CELL), j1 = Math.floor((z + R - Z0) / CELL);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    if (i < 0 || j < 0 || i >= NX || j >= NZ) continue;
    const h = Hm[j * NX + i];
    if (h > g) g = h;
  }
  return g;
}
export function groundMin(x, z, w, d) {
  let g = Infinity;
  for (let dx = -w / 2; dx <= w / 2; dx += 1) for (let dz = -d / 2; dz <= d / 2; dz += 1) {
    const h = groundAt(x + dx, z + dz, 0);
    if (h > -Infinity && h < g) g = h;
  }
  return g === Infinity ? 0 : g;
}
export function kindAt(x, z) {
  const i = Math.floor((x - X0) / CELL), j = Math.floor((z - Z0) / CELL);
  if (i < 0 || j < 0 || i >= NX || j >= NZ) return 255;
  return Km[j * NX + i];
}

export const PAL = [
  [0x5f9e6e, 0x4a3a52],   // moss
  [0x6b5a6e, 0x4a3d4e],   // earth
  [0x4f8a6a, 0x4a3a52],   // forest floor
  [0xa58ab8, 0x6b5a7a],   // path (pale glowing dust)
  [0x3f6e5a, 0x3a2e46],   // dark grass
  [0, 0],
  [0x8a4fb0, 0x5a2e7a],   // woeker purple
  [0x4a3d4e, 0x342a3a],   // cave floor
];
const geo = new THREE.BoxGeometry(1, 1, 1);
const m4 = new THREE.Matrix4(), col = new THREE.Color();
let seed = 31;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
kinds.forEach((list, k) => {
  if (!list.length) return;
  const [top, side] = PAL[k];
  const mt = toon(top);
  if (k === 3) mt.emissive.set(0x2a1a3a);
  if (k === 6) mt.emissive.set(0x2a0a40);
  const mats = [toon(side), toon(side), mt, toon(side), toon(side), toon(side)];
  const im = new THREE.InstancedMesh(geo, mats, list.length);
  list.forEach(([x, z, h], n) => {
    const bottom = -8;
    m4.makeScale(CELL, h - bottom, CELL);
    m4.setPosition(x, (h + bottom) / 2, z);
    im.setMatrixAt(n, m4);
    const v = 0.88 + rnd() * 0.16;
    im.setColorAt(n, col.setRGB(v, v, v));
  });
  im.receiveShadow = true; im.castShadow = true;
  scene.add(im);
});

// the glowing poisonous swamp water, and a dark abyss under the ravine
{
  const w = new THREE.Mesh(new THREE.PlaneGeometry(56, 64), new THREE.MeshBasicMaterial({ color: 0x3aff9a, transparent: true, opacity: 0.55 }));
  w.rotation.x = -Math.PI / 2; w.position.set(0, -1.2, -16); scene.add(w);
  const deep = new THREE.Mesh(new THREE.PlaneGeometry(56, 64), new THREE.MeshBasicMaterial({ color: 0x0d3a2a }));
  deep.rotation.x = -Math.PI / 2; deep.position.set(0, -3, -16); scene.add(deep);
  const abyss = new THREE.Mesh(new THREE.PlaneGeometry(40, 30), new THREE.MeshBasicMaterial({ color: 0x150c24 }));
  abyss.rotation.x = -Math.PI / 2; abyss.position.set(47, -6, -35); scene.add(abyss);
}
