import { THREE, scene, toon } from './core.js?v=sub1';

// De Wolkeneilanden: islands of cloud and grass floating high above nothing, each at its own height, scattered
// where the wind left them. Between them: a rope bridge, stepping clouds, a cable car, a long plank stair, and
// gaps you only cross with a trick. Fall off and you drop through the clouds (back to your last flag).
//
//                     het verste wolkje (only by cannon)
//                                    Knoop's eiland (the boss)
//               Oma's eiland                             het hoogste wolkje   de Ooievaarsrots
//       het Bonenveld (Brom, the beanstalk, Merel)                                 (the stork's nest)
//                        ║ the cable car                 het Wolkenbad (far below)
//       de Schapenwei                                          de Molenheuvel (the windmill)
//                                 Wolkenhaven (the rocket, Raaf's werkplaats)
//                                   het Ballonplein (the balloon)
//          de Thermiekvelden (warm wind)          de Regenboogwaterval (top) → de Spetterpoel (bottom)
//    het Zuidelijkste Wolkje  ← two rainbows ←  het IJswolkje
export const CELL = 2;
const X0 = -64, Z0 = -64, NX = 64, NZ = 96;      // z from -64 (Knoop, north) to 128 (the far south)
export const VOID = -60;
const Hm = new Float32Array(NX * NZ).fill(VOID);
const Km = new Uint8Array(NX * NZ).fill(0);
// [x, z, r, height, kind]   kinds: 0 cloud, 1 grass, 2 thunderstone, 3 bean field, 4 ice. Later ones win.
export const ISLANDS = {
  haven: [0, 40, 11, 0, 1],
  wei: [-30, 26, 9, 2, 1],
  molen: [28, 24, 8, 5, 1],
  rots: [38, -8, 5, 17, 2],
  bonen: [-34, -8, 10, 4, 3],
  oma: [-12, -26, 7, 4, 1],
  knoop: [18, -42, 12, 10, 2],
  hoog: [8, -6, 3, 29, 0],
  bad: [10, 10, 4.5, -8, 0],
  ver: [-54, -50, 3.5, 12, 0],
  // ---- the south, past the rocket ----
  plein: [0, 70, 9, 3, 1],          // het Ballonplein
  valtop: [13, 86, 5.5, 22, 1],     // the top of the rainbow waterfall
  poel: [15, 103, 6, 0, 0],         // de Spetterpoel, under the waterfall
  thermiek: [-28, 96, 9, 6, 1],     // de Thermiekvelden (warm wind blows up)
  ijs: [-6, 116, 6, 9, 4],          // het IJswolkje
  zuid: [-38, 124, 3.5, 9, 0],      // het Zuidelijkste Wolkje (only across two rainbows)
};
const BITS = [
  [-6, 32, 4, 1, 1],         // the terrace for Raaf's workshop
  [-34, 20, 2.5, 11, 0],     // the high cloud over the meadow
  [36, 8, 2.2, 11, 0],       // a puff on the way to the stork
  [22, -8, 2, 23, 0],        // a puff on the way to the highest cloud
  [4, 20, 2, 2, 0],          // a puff on the way back up from the bath
];
export const ARENA = { x: ISLANDS.knoop[0], y: ISLANDS.knoop[3], z: ISLANDS.knoop[1], r: ISLANDS.knoop[2] };
const ALL = [...Object.values(ISLANDS), ...BITS];
for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
  const x = X0 + (i + 0.5) * CELL, z = Z0 + (j + 0.5) * CELL;
  for (const [cx, cz, r, h, k] of ALL) if (Math.hypot(x - cx, z - cz) < r) { Hm[j * NX + i] = h; Km[j * NX + i] = k; }
}
export function groundAt(x, z, R = 0) {
  let g = VOID;
  const i0 = Math.floor((x - R - X0) / CELL), i1 = Math.floor((x + R - X0) / CELL);
  const j0 = Math.floor((z - R - Z0) / CELL), j1 = Math.floor((z + R - Z0) / CELL);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    if (i < 0 || j < 0 || i >= NX || j >= NZ) continue;
    const h = Hm[j * NX + i];
    if (h > g) g = h;
  }
  return g;
}
export const PAL = [
  [0xffffff, 0xe8eeff],   // cloud
  [0x8ad86a, 0xf4f6ff],   // grass on cloud
  [0x8a8aa8, 0x6a6a88],   // thunderstone
  [0xa8c85a, 0xf4f6ff],   // bean field
  [0xd8f4ff, 0xb8e0f8],   // ice
];
const kinds = [[], [], [], [], []];
for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
  if (Hm[j * NX + i] === VOID) continue;
  kinds[Km[j * NX + i]].push([X0 + (i + 0.5) * CELL, Z0 + (j + 0.5) * CELL, Hm[j * NX + i]]);
}
const geo = new THREE.BoxGeometry(1, 1, 1);
const m4 = new THREE.Matrix4(), col = new THREE.Color();
let seed = 71;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
kinds.forEach((list, k) => {
  if (!list.length) return;
  const [top, side] = PAL[k];
  const mats = [toon(side), toon(side), toon(top), toon(side), toon(side), toon(side)];
  const im = new THREE.InstancedMesh(geo, mats, list.length);
  list.forEach(([x, z, h], n) => {
    const depth = 2.2 + rnd() * 1.2;
    m4.makeScale(CELL, depth, CELL);
    m4.setPosition(x, h - depth / 2, z);
    im.setMatrixAt(n, m4);
    const v = 0.93 + rnd() * 0.07;
    im.setColorAt(n, col.setRGB(v, v, v));
  });
  im.receiveShadow = true; im.castShadow = true;
  scene.add(im);
});
// fluffy cloud puffs under (and round) every island, so they look like clouds and not like floating boxes
{
  const puffGeo = new THREE.SphereGeometry(1, 12, 9);
  const puffs = [];
  for (const [cx, cz, r, h] of ALL) {
    const n = Math.max(4, Math.round(r * 1.6));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rnd();
      const d = r * (0.55 + rnd() * 0.4), s = Math.min(4, r * (0.3 + rnd() * 0.25) + 0.6);
      puffs.push([cx + Math.cos(a) * d, h - 0.7 - s * 0.5 - rnd() * 1.5, cz + Math.sin(a) * d, s]);   // the top always stays under the grass
    }
    { const s = Math.min(5, r * 0.6 + 0.5); puffs.push([cx, h - 1 - s * 0.5, cz, s]); }
  }
  const im = new THREE.InstancedMesh(puffGeo, toon(0xf4f6ff), puffs.length);
  puffs.forEach(([x, y, z, s], n) => { m4.makeScale(s, s * 0.5, s); m4.setPosition(x, y, z); im.setMatrixAt(n, m4); });
  scene.add(im);
}
