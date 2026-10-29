import { THREE, scene, toon } from './core.js?v=sub1';

// De Vergeten Tempel: an old temple complex in a walled-in valley, overgrown and long abandoned. Kayo & Yara's
// defences shot the rocket down on the way to their base, and it came down here. No boss: the temple is the
// puzzle. Everything is made of flat stone platforms at different heights, so the map is a list of rectangles.
//
//                    Zonnetempel (stepped pyramid, symbols on top)
//   Donkere kloof (pit)          │                Priesterterras (house, obelisk)
//   Zandloperdeur ←── plein: muurschildering, fontein ──→ Spiegelzaal (raised hall)
//   Blokkenhof (pushing blocks)  │
//                         de crash (rocket, Otis, Byte)
export const CELL = 2;
const X0 = -44, Z0 = -66, NX = 44, NZ = 54;
const Hm = new Float32Array(NX * NZ).fill(16);
const Km = new Uint8Array(NX * NZ).fill(3);
// [x0, z0, x1, z1, height, kind]; later rectangles win.  kinds: 0 moss flagstones, 1 temple stone, 2 old gold stone, 3 dark rock, 4 scorched
export const RECTS = [
  [-40, -62, 40, 38, 0, 0],               // the valley floor (outside it: rock walls, 16 high)
  [-43, -16, -40, -12, 0, 1],             // the alcove behind the hourglass gate
  [-6, 18, 16, 34, -0.4, 4],              // the crash crater
  [-31, 1, -17, 15, 0, 1],                // Blokkenhof floor
  [18, -8, 32, 8, 4, 1],                  // Spiegelzaal
  [-40, -40, -18, -18, -30, 3],           // de donkere kloof: bottomless
  [20, -46, 38, -22, 6, 2],               // Priesterterras
  // the Zonnetempel, four steps
  [-12, -56, 12, -32, 3, 1],
  [-8, -52, 8, -36, 9, 2],
  [-6, -50, 6, -38, 12, 1],
  [-4, -48, 4, -40, 15, 2],
];
export const ZIG = { x: 0, z: -44, L1: 3, L2: 9, L3: 12, L4: 15 };
export const HALL = { x0: 18, x1: 32, z0: -8, z1: 8, y: 4 };
export const PIT = { x0: -40, x1: -18, z0: -40, z1: -18 };
export const PRIEST = { y: 6 };

for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
  const x = X0 + (i + 0.5) * CELL, z = Z0 + (j + 0.5) * CELL;
  for (const [x0, z0, x1, z1, h, k] of RECTS) if (x > x0 && x < x1 && z > z0 && z < z1) { Hm[j * NX + i] = h; Km[j * NX + i] = k; }
}
export function groundAt(x, z, R = 0) {
  let g = -Infinity;
  const i0 = Math.floor((x - R - X0) / CELL), i1 = Math.floor((x + R - X0) / CELL);
  const j0 = Math.floor((z - R - Z0) / CELL), j1 = Math.floor((z + R - Z0) / CELL);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const h = i < 0 || j < 0 || i >= NX || j >= NZ ? 16 : Hm[j * NX + i];
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
  [0x7a9a5a, 0x5a6a4a],   // moss flagstones
  [0xd8c8a8, 0xa8987a],   // temple stone
  [0xe0b860, 0xa88a4a],   // old gold stone
  [0x5a4a5a, 0x3a2e3e],   // dark rock
  [0x6a5a4a, 0x4a3a30],   // scorched
];
const kinds = [[], [], [], [], []];
for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
  const h = Hm[j * NX + i];
  if (h < -10) continue;             // the pit: nothing, all the way down
  kinds[Km[j * NX + i]].push([X0 + (i + 0.5) * CELL, Z0 + (j + 0.5) * CELL, h]);
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
    const bottom = -4;
    m4.makeScale(CELL, h - bottom, CELL);
    m4.setPosition(x, (h + bottom) / 2, z);
    im.setMatrixAt(n, m4);
    const v = 0.88 + rnd() * 0.16;
    im.setColorAt(n, col.setRGB(v, v * (0.96 + rnd() * 0.04), v * (0.94 + rnd() * 0.06)));
  });
  im.receiveShadow = true; im.castShadow = true;
  scene.add(im);
});
// the pit's walls, going down into the dark
{
  const m = new THREE.MeshBasicMaterial({ color: 0x1a1020, side: THREE.DoubleSide });
  const { x0, x1, z0, z1 } = PIT, d = 26;
  for (const [x, z, w, ry] of [[(x0 + x1) / 2, z0, x1 - x0, 0], [(x0 + x1) / 2, z1, x1 - x0, 0], [x1, (z0 + z1) / 2, z1 - z0, Math.PI / 2]]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m); p.position.set(x, -4 - d / 2, z); p.rotation.y = ry; scene.add(p);
  }
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), new THREE.MeshBasicMaterial({ color: 0x0a0610 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set((x0 + x1) / 2, -24, (z0 + z1) / 2); scene.add(floor);
}
