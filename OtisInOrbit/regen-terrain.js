import { THREE, scene, toon } from './core.js?v=sub1';

// De Regenstad: a neon city at night where it never stops raining. Streets, one canal across the middle,
// and rooftops at all sorts of heights. An elevated train runs a loop round the whole city (see world.js).
// The map is a list of rectangles: later ones win.
//
//   train loop ──────────────────────────────────────────────
//   │  Robin's dak (12)        Kraaientoren (16, the boss)    │
//   │       ·  kantoren · neonbrug ·  hotel                   │
//   │ ~~~~~~~~~~~~~~~~~~~ het kanaal ~~~~~~~~~~~~~~~~~~~~~~~  │
//   │     bioscoop     het plein     snackbar                 │
//   │                  the rocket                             │
//   ──────────────────────────────────────────────────────────
export const CELL = 2;
const X0 = -56, Z0 = -56, NX = 56, NZ = 56;
const Hm = new Float32Array(NX * NZ).fill(26);
const Km = new Uint8Array(NX * NZ).fill(2);
export const CANAL = { z0: 4, z1: 10, y: -3 };
export const WATER_Y = -1.3;
// [x0, z0, x1, z1, height, kind]   kinds: 0 street, 1 pavement, 2 roof, 3 canal bed, 4 roof garden
export const BUILDINGS = [
  [-26, 16, -12, 30, 4, 2],     // de bioscoop
  [12, 14, 22, 24, 6, 2],       // de snackbar
  [26, 16, 38, 28, 3, 2],       // garages
  [-40, -14, -28, -2, 8, 2],    // flats
  [-14, -16, -4, -4, 5, 4],     // roof garden
  [8, -18, 20, -6, 10, 2],      // kantoren
  [26, -14, 40, -2, 6, 2],      // hotel
  [-34, -40, -22, -28, 12, 4],  // Robin's dak
  [-10, -36, -2, -28, 7, 2],
  [-20, -46, -12, -40, 3, 2],
  [18, -48, 38, -28, 16, 2],    // de Kraaientoren
];
const RECTS = [
  [-52, -52, 52, 52, 0, 0],
  [-52, -52, 52, -50, 0, 1], [-52, 50, 52, 52, 0, 1],
  [-52, CANAL.z0, 52, CANAL.z1, CANAL.y, 3],
  [-3, CANAL.z0, 3, CANAL.z1, 0, 1],      // the bridges
  [29, CANAL.z0, 35, CANAL.z1, 0, 1],
  ...BUILDINGS,
];
export const TOWER = { x: 28, z: -38, h: 16 };
export const ARENA = { x: TOWER.x, y: TOWER.h, z: TOWER.z, r: 9 };
export const ROBIN_ROOF = { x: -28, z: -34, h: 12 };

for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
  const x = X0 + (i + 0.5) * CELL, z = Z0 + (j + 0.5) * CELL;
  for (const [x0, z0, x1, z1, h, k] of RECTS) if (x > x0 && x < x1 && z > z0 && z < z1) { Hm[j * NX + i] = h; Km[j * NX + i] = k; }
}
export function groundAt(x, z, R = 0) {
  let g = -Infinity;
  const i0 = Math.floor((x - R - X0) / CELL), i1 = Math.floor((x + R - X0) / CELL);
  const j0 = Math.floor((z - R - Z0) / CELL), j1 = Math.floor((z + R - Z0) / CELL);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const h = i < 0 || j < 0 || i >= NX || j >= NZ ? 26 : Hm[j * NX + i];
    if (h > g) g = h;
  }
  return g;
}
export function kindAt(x, z) {
  const i = Math.floor((x - X0) / CELL), j = Math.floor((z - Z0) / CELL);
  if (i < 0 || j < 0 || i >= NX || j >= NZ) return 2;
  return Km[j * NX + i];
}
export const PAL = [
  [0x2a2a3a, 0x1a1a28],   // wet street
  [0x4a4a5a, 0x2a2a3a],   // pavement
  [0x3a3450, 0x221c34],   // roof / walls
  [0x1a2a3a, 0x10202c],   // canal bed
  [0x2a5a3a, 0x221c34],   // roof garden
];
const kinds = [[], [], [], [], []];
for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) kinds[Km[j * NX + i]].push([X0 + (i + 0.5) * CELL, Z0 + (j + 0.5) * CELL, Hm[j * NX + i]]);
const geo = new THREE.BoxGeometry(1, 1, 1);
const m4 = new THREE.Matrix4(), col = new THREE.Color();
let seed = 113;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
kinds.forEach((list, k) => {
  if (!list.length) return;
  const [top, side] = PAL[k];
  const mats = [toon(side), toon(side), toon(top), toon(side), toon(side), toon(side)];
  const im = new THREE.InstancedMesh(geo, mats, list.length);
  list.forEach(([x, z, h], n) => {
    const bottom = -4;
    m4.makeScale(CELL, h - bottom, CELL);
    m4.setPosition(x, (h + bottom) / 2, z);
    im.setMatrixAt(n, m4);
    const v = 0.85 + rnd() * 0.2;
    im.setColorAt(n, col.setRGB(v, v, v * (1 + rnd() * 0.08)));
  });
  im.receiveShadow = true; im.castShadow = true;
  scene.add(im);
});
// lit windows on every building face (little emissive squares, so the city glows at night)
{
  const WIN = [0xffd88a, 0x8ad8ff, 0xff8ad8, 0xfff0c0];
  const pos = [];
  for (const [x0, z0, x1, z1, h] of BUILDINGS) {
    for (let y = 1.5; y < h - 0.5; y += 2) {
      for (let x = x0 + 1.5; x < x1 - 1; x += 2) { if (rnd() < 0.55) pos.push([x, y, z0 - 0.02, 0]); if (rnd() < 0.55) pos.push([x, y, z1 + 0.02, 0]); }
      for (let z = z0 + 1.5; z < z1 - 1; z += 2) { if (rnd() < 0.55) pos.push([x0 - 0.02, y, z, 1]); if (rnd() < 0.55) pos.push([x1 + 0.02, y, z, 1]); }
    }
  }
  WIN.forEach((c, n) => {
    const mine = pos.filter((_, i) => i % WIN.length === n);
    const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.8, 1), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }), mine.length);
    const o = new THREE.Object3D();
    mine.forEach(([x, y, z, side], i) => { o.position.set(x, y, z); o.rotation.set(0, side ? Math.PI / 2 : 0, 0); o.updateMatrix(); im.setMatrixAt(i, o.matrix); });
    scene.add(im);
  });
}
