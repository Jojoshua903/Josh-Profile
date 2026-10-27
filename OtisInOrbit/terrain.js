import { THREE, scene, toon } from './core.js?v=muis1';

// The moon is a heightmap of square columns, laid out as a journey along -z:
// crash crater (z≈26) → mist path → town → cliff → summit with the telescope (z≈-90).
export const CELL = 2;
const X0 = -44, Z0 = -112, NX = 44, NZ = 80;
const Hm = new Float32Array(NX * NZ).fill(-Infinity);

export const pathX = (z) => 5 * Math.sin((z - 14) * 0.11);
export const CRATER = { x: 0, z: 26 };
export const ARENA = { x: 0, y: 18, z: -86, r: 15 };
export const RAVINE_Z = -36;

function heightFn(x, z) {
  const dc = Math.hypot(x - CRATER.x, z - CRATER.z);
  if (dc < 13) return [0, 0];                                                   // crash crater
  if (z <= 16 && z >= -10) {                                                    // mist path
    const px = pathX(z), dx = Math.abs(x - px);
    const ph = Math.max(0, Math.floor((14 - z) / 6)) * 0.5;
    if (z < 5 && z > 0 && dx < 3) return null;                                  // broken gap
    if (dx < 3) return [ph, 3];
    if (dx < 6.5) return [ph + 5 + Math.sin(z * 0.7) * 1.2 + (dx > 5 ? 1 : 0), 2];
  }
  if (dc < 16.5) return [3 + Math.sin(Math.atan2(z - CRATER.z, x) * 5) * 0.8, 2];      // crater rim
  if (z < -8 && z > -62 && Math.abs(x) < 32) {                                  // town
    const ax = Math.abs(x) + 1.5 * Math.sin(z * 0.21);
    if (Math.abs(z - RAVINE_Z) < 2.5 && ax < 28)                                // ravine, with a ramp out on the east
      return [x > 16 ? Math.min(4, -2 + (x - 16) * 0.9) : -2, 2];
    if (ax > 28) return [10, 2];
    if (ax > 21) return [6, 0];
    if (ax > 14) return [4, 0];
    return [2, 1];
  }
  if (x < -32 && x > -38 && z < -40 && z > -50) return [6, 2];                  // hidden ledge in the mist
  if (z <= -62 && z > -104 && Math.abs(x) < 26) {
    if (x > 13 && x < 18 && z > -69) return [2, 2];                              // notch in the cliff
    return [18, Math.hypot(x - ARENA.x, z - ARENA.z) < ARENA.r ? 1 : 2];         // summit
  }
  return null;
}

const kinds = [[], [], [], []];
for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
  const x = X0 + (i + 0.5) * CELL, z = Z0 + (j + 0.5) * CELL;
  const res = heightFn(x, z);
  if (!res) continue;
  Hm[j * NX + i] = res[0];
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

const PAL = [
  [0x7f8a99, 0x5a6070],   // moss
  [0x8e909a, 0x6a6c78],   // cobbles
  [0x5e6172, 0x4a4c5c],   // rock
  [0x9a948a, 0x6f6a64],   // path
];
const geo = new THREE.BoxGeometry(1, 1, 1);
const m4 = new THREE.Matrix4(), col = new THREE.Color();
let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
kinds.forEach((list, k) => {
  const [top, side] = PAL[k];
  const mats = [toon(side), toon(side), toon(top), toon(side), toon(side), toon(side)];
  const im = new THREE.InstancedMesh(geo, mats, list.length);
  list.forEach(([x, z, h], n) => {
    const bottom = -10;
    m4.makeScale(CELL, h - bottom, CELL);
    m4.setPosition(x, (h + bottom) / 2, z);
    im.setMatrixAt(n, m4);
    const v = 0.88 + rnd() * 0.18;
    im.setColorAt(n, col.setRGB(v, v, v * 1.02));
  });
  im.receiveShadow = true; im.castShadow = true;
  scene.add(im);
});

// rocky underside so the moon floats in the void
const rock = toon(0x4a4c5c);
for (const [x, z, r, h] of [[0, 26, 16, 22], [0, -36, 30, 34], [0, -84, 24, 40]]) {
  const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 10), rock);
  c.rotation.x = Math.PI; c.position.set(x, -10 - h / 2, z);
  scene.add(c);
}
