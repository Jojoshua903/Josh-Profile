import { THREE, scene, toon } from './core.js?v=sub1';

// De Waterplaneet: Deniz' ice palace melted (Kayo & Yara brought magma from the sun) and now there's only sea,
// with a few islands. The planet turns: by day the sun warms it, the ice melts and the tide goes out; by night
// the sea freezes over between the islands and the tide comes in (see cycle in world.js).
//
//            Krabbenrif (north, the boss)
//                 │  night: ice · any time: Vries floes
//   Pinguïnbaai ── Paleiseiland ── Vuurtoreneiland
//  day: lilies      │   night: ice     day: sandbank
//  night: ice       │   day: lilies
//        └── Strand (south, the rocket) ── day: sandbank / night: ice
export const CELL = 2;
const X0 = -60, Z0 = -80, NX = 60, NZ = 68;
const Hm = new Float32Array(NX * NZ).fill(-Infinity);
const Km = new Uint8Array(NX * NZ).fill(255);
export const TOP = 1.2;               // islands stand this high
export const SAND_Y = -1.0;           // sandbanks: dry at low tide, under water at high tide
export const BEACH = 0.1;
export const WATER_LO = -1.25, WATER_HI = 0;
// [x, z, r, kind]
export const ISLES = {
  strand: [0, 40, 13, 0],
  paleis: [0, -8, 12, 1],
  baai: [-34, 26, 9, 0],
  toren: [36, 2, 8, 2],
  rif: [0, -62, 14, 3],
};
export const ARENA = { x: 0, y: TOP, z: -62, r: 14 };
// sandbanks: [ax, az, bx, bz, width]
export const BANKS = [[-11, 35, -27, 29, 4], [11, -6, 29, 0, 4]];
// 0 sand, 1 palace stone, 2 rock, 3 reef, 4 wet sand
function segDist(x, z, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, k = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - ax - dx * k, z - az - dz * k);
}
function heightFn(x, z) {
  for (const k in ISLES) { const [cx, cz, r, kind] = ISLES[k]; if (Math.hypot(x - cx, z - cz) < r) return [TOP, kind]; }
  // a low beach step round every island, so you can climb out of the water (or off the ice)
  for (const k in ISLES) { const [cx, cz, r] = ISLES[k]; if (Math.hypot(x - cx, z - cz) < r + 1.8) return [BEACH, 4]; }
  for (const [ax, az, bx, bz, w] of BANKS) if (segDist(x, z, ax, az, bx, bz) < w / 2) return [SAND_Y, 4];
  return null;
}

const kinds = [[], [], [], [], []];
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
export const PAL = [
  [0xf4e2b0, 0xd8b880],   // sand
  [0xc8e4f0, 0x8ab4cc],   // palace stone
  [0x8a8e9a, 0x5a5e6a],   // rock
  [0xf0a0a8, 0xc06878],   // reef
  [0xc8b088, 0x9a8460],   // wet sand
];
const geo = new THREE.BoxGeometry(1, 1, 1);
const m4 = new THREE.Matrix4(), col = new THREE.Color();
let seed = 53;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
kinds.forEach((list, k) => {
  if (!list.length) return;
  const [top, side] = PAL[k];
  const mats = [toon(side), toon(side), toon(top), toon(side), toon(side), toon(side)];
  const im = new THREE.InstancedMesh(geo, mats, list.length);
  list.forEach(([x, z, h], n) => {
    const bottom = -7;
    m4.makeScale(CELL, h - bottom, CELL);
    m4.setPosition(x, (h + bottom) / 2, z);
    im.setMatrixAt(n, m4);
    const v = 0.9 + rnd() * 0.14;
    im.setColorAt(n, col.setRGB(v, v * (0.97 + rnd() * 0.03), v));
  });
  im.receiveShadow = true; im.castShadow = true;
  scene.add(im);
});
