import { THREE, scene, toon } from './core.js?v=sub1';

// De Feestplaneet: the Toeters' festival meadow, the day before the Galmfeest. The whole place is made of
// giant instruments lying in the grass. No ring of islands, no hub: everything sits where it fits.
//
//                        het Galmpodium (high plateau, the stage — and the mole underneath)
//         Trommelveld          tuba ↗          ↖ orgelpijpenbos
//   (giant drums: bounce pads)       de wei              de Xylofoonwand (east cliff, keys as stairs)
//                     Toeterdorp (feesttaart, Nathan's slagkooi)
//                               the rocket
export const CELL = 2;
const X0 = -56, Z0 = -60, NX = 56, NZ = 58;
const Hm = new Float32Array(NX * NZ).fill(18);
const Km = new Uint8Array(NX * NZ).fill(3);
export const PODIUM = { x: 0, z: -36, r: 15, h: 10 };
export const CLIFF = { x0: 36, x1: 52, z0: -16, z1: 14, h: 9 };
export const ARENA = { x: PODIUM.x, y: PODIUM.h, z: PODIUM.z, r: 13 };
// kinds: 0 grass, 1 festival tiles, 2 stage boards, 3 rock, 4 drum-field grass
const SHAPES = [
  ['rect', -52, -56, 52, 52, 0, 0],
  ['rect', -50, -8, -18, 32, 0, 4],
  ['rect', -16, 18, 22, 42, 0, 1],
  ['circle', PODIUM.x, PODIUM.z, PODIUM.r, PODIUM.h, 2],
  ['rect', CLIFF.x0, CLIFF.z0, CLIFF.x1, CLIFF.z1, CLIFF.h, 3],
];
for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
  const x = X0 + (i + 0.5) * CELL, z = Z0 + (j + 0.5) * CELL;
  for (const s of SHAPES) {
    const inside = s[0] === 'rect' ? x > s[1] && x < s[3] && z > s[2] && z < s[4] : Math.hypot(x - s[1], z - s[2]) < s[3];
    if (inside) { Hm[j * NX + i] = s[0] === 'rect' ? s[5] : s[4]; Km[j * NX + i] = s[0] === 'rect' ? s[6] : s[5]; }
  }
}
export function groundAt(x, z, R = 0) {
  let g = -Infinity;
  const i0 = Math.floor((x - R - X0) / CELL), i1 = Math.floor((x + R - X0) / CELL);
  const j0 = Math.floor((z - R - Z0) / CELL), j1 = Math.floor((z + R - Z0) / CELL);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const h = i < 0 || j < 0 || i >= NX || j >= NZ ? 18 : Hm[j * NX + i];
    if (h > g) g = h;
  }
  return g;
}
export function kindAt(x, z) {
  const i = Math.floor((x - X0) / CELL), j = Math.floor((z - Z0) / CELL);
  if (i < 0 || j < 0 || i >= NX || j >= NZ) return 3;
  return Km[j * NX + i];
}
export const PAL = [
  [0x7ad86a, 0x5aa84a],   // grass
  [0xffd8a8, 0xd8a878],   // festival tiles
  [0xd89a5a, 0xa86a3a],   // stage boards
  [0xb89aa8, 0x8a6a7a],   // pink rock
  [0x9ae87a, 0x6ab85a],   // drum-field grass
];
const kinds = [[], [], [], [], []];
for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) kinds[Km[j * NX + i]].push([X0 + (i + 0.5) * CELL, Z0 + (j + 0.5) * CELL, Hm[j * NX + i]]);
const geo = new THREE.BoxGeometry(1, 1, 1);
const m4 = new THREE.Matrix4(), col = new THREE.Color();
let seed = 97;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
kinds.forEach((list, k) => {
  if (!list.length) return;
  const [top, side] = PAL[k];
  const mats = [toon(side), toon(side), toon(top), toon(side), toon(side), toon(side)];
  const im = new THREE.InstancedMesh(geo, mats, list.length);
  list.forEach(([x, z, h], n) => {
    const bottom = -3;
    m4.makeScale(CELL, h - bottom, CELL);
    m4.setPosition(x, (h + bottom) / 2, z);
    im.setMatrixAt(n, m4);
    // the festival tiles are a chequerboard; the rest just varies a bit
    const v = k === 1 ? (((x + z) / 2) & 1 ? 1 : 0.86) : 0.9 + rnd() * 0.14;
    im.setColorAt(n, col.setRGB(v, v * (0.97 + rnd() * 0.03), v));
  });
  im.receiveShadow = true; im.castShadow = true;
  scene.add(im);
});
