import { THREE, scene, toon } from './core.js';

// De Schroothoop: five heaps of junk sticking out of a sea of black oil (fall in and you're out). No middle,
// no left-centre-right: the heaps are linked by bridges, and there's more than one way to get anywhere.
//   1 de landingshoop (south)       – rocket, Fionn's shed. Low and flat.
//   2 de kraanhoop (west)           – containers and cranes. Magnets carry you over the oil to heap 4.
//   3 de fabriekshoop (east)        – an old factory on top; its roof has a cable car up to De Top.
//   4 de autohoop (north-west)      – car wrecks, a press, a tower of tyres; a long iron bridge to De Top.
//   5 De Top (north-east)           – the highest heap, a cliff all round its flat top where the mech waits.
// Het wrakschip: an island between 3 and 5 with a half-sunk ship, reached over sinking oil drums (or by
// dropping off the cable car).
// Bridges: 1–2 planks, 1–3 a conveyor belt, 1 → wreck island → 4 over barrels and a drifting car roof,
// 2–4 magnets, 4–5 the iron bridge (then tyres up the cliff), 3–5 the cable car (needs power).
export const CELL = 2;
const X0 = -72, Z0 = -104, NX = 72, NZ = 82;
const Hm = new Float32Array(NX * NZ).fill(-Infinity);
const Km = new Uint8Array(NX * NZ).fill(255);
export const STEP = 1.2;
export const PLATEAU_H = 14.4;
// [x, z, r, top, flat (fraction of r that is the flat top), lumpiness]
export const HEAPS = {
  land: [0, 36, 0, 0, 1, 0],
  kraan: [-42, 4, 18, 6, 0.45, 0.1],
  fabriek: [42, 4, 18, 6, 0.62, 0.04],
  auto: [-30, -52, 18, 9.6, 0.45, 0.1],
  top: [24, -74, 26, 9.6, 0.58, 0.05],
};
export const ARENA = { x: 24, y: PLATEAU_H, z: -74, r: 14 };
export const CLIFF_R = 15;
// little scrap islands in the oil: [x, z, r]
export const ISLANDS = [[-8, -6, 4.5], [-18, -26, 3.5], [37, -31, 6]];   // the third one: het wrakschip, under the cable car
const quant = (h) => Math.round(h / STEP) * STEP;
function heapH([cx, cz, r, top, flat, lump], x, z) {
  const dx = x - cx, dz = z - cz, a = Math.atan2(dz, dx);
  const rr = r * (1 + lump * Math.sin(a * 3 + cx) + lump * 0.6 * Math.sin(a * 5 + cz));
  const d = Math.hypot(dx, dz);
  if (d >= rr) return null;
  if (d < rr * flat) return top;
  const k = (d - rr * flat) / (rr * (1 - flat));
  return Math.max(0, quant(top * (1 - k) ** 0.9));
}
// 0 dust, 1 rust, 2 concrete, 3 scrap, 4 path, 5 island scrap, 6 arena plate, 7 factory floor
function heightFn(x, z) {
  // De Top: a cliff round the flat top
  {
    const [cx, cz] = HEAPS.top, d = Math.hypot(x - cx, z - cz);
    if (d < CLIFF_R) return [PLATEAU_H, d < ARENA.r ? 6 : 3];
    const h = heapH(HEAPS.top, x, z);
    if (h !== null) return [h, 3];
  }
  for (const [name, kind] of [['kraan', 2], ['fabriek', 7], ['auto', 1]]) {
    const h = heapH(HEAPS[name], x, z);
    if (h !== null) return [h, h >= HEAPS[name][3] ? kind : 3];
  }
  for (const [ix, iz, r] of ISLANDS) if (Math.hypot(x - ix, z - iz) < r) return [0, 5];
  // the landing heap: a wide flat beach of junk
  if ((x / 22) ** 2 + ((z - 36) / 15) ** 2 < 1) return [0, Math.abs(x) < 2.4 && z < 34 ? 4 : 0];
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
export function kindAt(x, z) {
  const i = Math.floor((x - X0) / CELL), j = Math.floor((z - Z0) / CELL);
  if (i < 0 || j < 0 || i >= NX || j >= NZ) return 255;
  return Km[j * NX + i];
}
// a point on a heap, `d` from its centre, in the direction of (tx, tz)
export function towards(name, tx, tz, d) {
  const [cx, cz] = HEAPS[name], L = Math.hypot(tx - cx, tz - cz);
  return [cx + ((tx - cx) / L) * d, cz + ((tz - cz) / L) * d];
}

export const PAL = [
  [0xd9a878, 0x9a6a4a],   // dust
  [0xa0583a, 0x6e3a2a],   // rust
  [0xa8a49c, 0x7a766e],   // concrete
  [0x8a7a6a, 0x5a4a40],   // scrap
  [0x9a7a5a, 0x6a5040],   // path
  [0x7a6a5e, 0x4a3e38],   // island scrap
  [0x6a7480, 0x4a525c],   // arena plate
  [0x5a5450, 0x3a3634],   // factory floor
];
const geo = new THREE.BoxGeometry(1, 1, 1);
const m4 = new THREE.Matrix4(), col = new THREE.Color();
let seed = 47;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
kinds.forEach((list, k) => {
  if (!list.length) return;
  const [top, side] = PAL[k];
  const mats = [toon(side), toon(side), toon(top), toon(side), toon(side), toon(side)];
  const im = new THREE.InstancedMesh(geo, mats, list.length);
  list.forEach(([x, z, h], n) => {
    const bottom = -8;
    m4.makeScale(CELL, h - bottom, CELL);
    m4.setPosition(x, (h + bottom) / 2, z);
    im.setMatrixAt(n, m4);
    const v = 0.86 + rnd() * 0.2;
    im.setColorAt(n, col.setRGB(v, v * (0.96 + rnd() * 0.04), v * 0.95));
  });
  im.receiveShadow = true; im.castShadow = true;
  scene.add(im);
});

// the sea of black oil (with a faint rainbow sheen) everywhere around the heaps
{
  const oil = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshBasicMaterial({ color: 0x1a1418 }));
  oil.rotation.x = -Math.PI / 2; oil.position.set(0, -1.1, -20); scene.add(oil);
  const sheen = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshBasicMaterial({ color: 0x6a5aff, transparent: true, opacity: 0.1, depthWrite: false }));
  sheen.rotation.x = -Math.PI / 2; sheen.position.set(0, -1.05, -20); scene.add(sheen);
}
