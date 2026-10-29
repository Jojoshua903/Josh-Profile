import { THREE, scene, toon } from './core.js?v=sub1';

// De Zon: there is no ground here, only magma. Pieces of cooled crust drift on it and slide past each other
// (see world.js: the vlotten). Only a few things stand still: the landing rock with the rocket, three
// basalt rocks in the magma (the checkpoints), and De Kroon far to the north, where the snake lives.
//
//   Landingsrots (south) ── Stofbadvlot ⇄ Westrots ── Kristalvlot ⇄ Noordrots ── parkour ── De Kroon
//        └──────────── Panelenvlot ⇄ Oostrots ── Kleintje ⇄ Ringvlot ⇄ Noordrots
//
// Some rafts dock right against a rock (walk over), some only meet another raft (go via that one),
// and from the Noordrots to De Kroon you jump: a triple jump plus a jump in the air, or time it on the
// drifting stone, or bring a copied ability.
export const CELL = 2;
const X0 = -50, Z0 = -100, NX = 50, NZ = 78;
const Hm = new Float32Array(NX * NZ).fill(-Infinity);
const Km = new Uint8Array(NX * NZ).fill(255);
export const MAGMA_Y = -0.9;
// fixed rocks: [x0, x1, z0, z1, kind]
export const ROCKS = {
  land: [-14, 14, 30, 54, 1],
  west: [-36, -26, -2, 8, 3],
  oost: [26, 36, -8, 2, 3],
  noord: [-5, 5, -50, -36, 3],
  poort: [-4, 4, -66, -59, 3],
};
export const ARENA = { x: 0, y: 0, z: -80, r: 15 };
// 0 crust, 1 sun sand (landing), 2 obsidian (arena), 3 basalt
function heightFn(x, z) {
  if (Math.hypot(x - ARENA.x, z - ARENA.z) < ARENA.r) return [0, 2];
  for (const k in ROCKS) {
    const [x0, x1, z0, z1, kind] = ROCKS[k];
    if (x >= x0 && x <= x1 && z >= z0 && z <= z1) return [0, kind];
  }
  return null;
}

const kinds = [[], [], [], []];
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
  [0x4a3a3a, 0x2a2024],   // crust
  [0xf2c27a, 0xc8864a],   // sun sand
  [0x3a2a44, 0x241a2a],   // De Kroon's floor: dark obsidian, so the snake's warnings stand out on it
  [0x5a4a4e, 0x3a2e32],   // basalt
];
const geo = new THREE.BoxGeometry(1, 1, 1);
const m4 = new THREE.Matrix4(), col = new THREE.Color();
let seed = 31;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
kinds.forEach((list, k) => {
  if (!list.length) return;
  const [top, side] = PAL[k];
  const mats = [toon(side), toon(side), toon(top), toon(side), toon(side), toon(side)];
  const im = new THREE.InstancedMesh(geo, mats, list.length);
  list.forEach(([x, z, h], n) => {
    const bottom = -6;
    m4.makeScale(CELL, h - bottom, CELL);
    m4.setPosition(x, (h + bottom) / 2, z);
    im.setMatrixAt(n, m4);
    const v = 0.88 + rnd() * 0.18;
    im.setColorAt(n, col.setRGB(v, v * (0.95 + rnd() * 0.05), v * 0.94));
  });
  im.receiveShadow = true; im.castShadow = true;
  scene.add(im);
});

// the magma: a glowing sea with a slow, brighter swirl over it (animated in world.js)
export const magma = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshBasicMaterial({ color: 0xff5a1a }));
magma.rotation.x = -Math.PI / 2; magma.position.set(0, MAGMA_Y, -20); scene.add(magma);
export const magmaGlow = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshBasicMaterial({ color: 0xffd040, transparent: true, opacity: 0.25, depthWrite: false }));
magmaGlow.rotation.x = -Math.PI / 2; magmaGlow.position.set(0, MAGMA_Y + 0.05, -20); scene.add(magmaGlow);
