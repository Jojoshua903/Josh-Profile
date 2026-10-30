import { THREE, scene, toon } from './core.js';

// Het Reuzenwoud: trees so big that their trunks are ten metres across and their tops are a place of their own.
// Down below, the misty forest floor (falling off isn't the end: you land in the mist and climb back up).
// Up top, every crown is its own little world, each at its own height. In between: rope bridges, lianas,
// branches that stick out, and the rough bark and ivy you can climb with Grijp.
//
//        de Gladde Boom (Kayo & Yara's secret base, can't be climbed)          de Verre Kruin (glide there)
//                                    de Mammoetboom (Bonk the woodpecker, on top)
//          de Berk (the owl)                                                de Holle Boom
//                                                                    (lianas)
//     de Den (the tallest top)           de Kastanje (the squirrels)              de Wilg
//                                                       de Beuk (the bees)
//                 de Oude Eik (the tree-hut)
//                                     de open plek (the rocket, Reshman's kitchen)
export const CELL = 2;
const X0 = -72, Z0 = -72, NX = 72, NZ = 96;      // x -72…72, z -72 (north) … 120 (south)
export const VOID = -60;
const Hm = new Float32Array(NX * NZ).fill(0);
// [x, z, radius, height of the top]
export const TREES = {
  eik: [-20, 46, 5, 14],
  beuk: [16, 34, 4, 22],
  kast: [-8, 6, 6, 26],
  den: [-44, 14, 3.5, 34],
  wilg: [36, 10, 4.5, 12],
  mam: [12, -34, 7, 40],
  hol: [44, -22, 4, 18],
  berk: [-38, -26, 3.5, 20],
  glad: [-50, -54, 4, 36],
  verre: [54, -58, 3, 24],
};
// on the Mammoetboom the trunk goes on up in the middle: a stump Bonk sits on
export const PILLAR = { r: 2.5, top: TREES.mam[3] + 14 };
// how fat a trunk is, as you see it AND as you bump into it (round, not in blocks of cells)
export const VR = (k) => TREES[k][2] + 1;
export const ARENA = { x: TREES.mam[0], y: TREES.mam[3], z: TREES.mam[1], r: 12 };
const TRUNKS = [...Object.keys(TREES).map((k) => [TREES[k][0], TREES[k][1], VR(k), TREES[k][3]]), [ARENA.x, ARENA.z, PILLAR.r + 1, PILLAR.top]];
for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
  // the edge of the wood: a wall of trunks
  if (i < 3 || j < 3 || i >= NX - 3 || j >= NZ - 3) Hm[j * NX + i] = 60;
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
  // the trunks: a solid round wall up to the top, and the top is the floor up there
  for (const [cx, cz, r, h] of TRUNKS) if (h > g && (x - cx) ** 2 + (z - cz) ** 2 < (r + R) ** 2) g = h;
  return g;
}
// the forest floor: moss, with lighter patches
{
  const W = NX * CELL, D = NZ * CELL;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), toon(0x4a7a3a));
  floor.rotation.x = -Math.PI / 2; floor.position.set(X0 + W / 2, 0, Z0 + D / 2); floor.receiveShadow = true; scene.add(floor);
  let s = 41; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const patch = new THREE.CircleGeometry(1, 14), m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  const im = new THREE.InstancedMesh(patch, toon(0x5a8a44), 90);
  for (let n = 0; n < 90; n++) {
    const sc = 2 + rnd() * 5;
    m4.compose(new THREE.Vector3(X0 + 8 + rnd() * (W - 16), 0.01, Z0 + 8 + rnd() * (D - 16)), q, new THREE.Vector3(sc, sc * (0.6 + rnd() * 0.4), 1));
    im.setMatrixAt(n, m4);
  }
  im.receiveShadow = true; scene.add(im);
}
export const BOUNDS = { x0: X0, z0: Z0, x1: X0 + NX * CELL, z1: Z0 + NZ * CELL };
