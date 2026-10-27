import { THREE, scene, toon } from './core.js?v=muis1';

// A guided open world: one big valley you can roam, the summit always in sight to the north,
// and three different ways up (the forest + cliff scramble, the old mine, the east ridge).
// Everything off those routes is a detour with something to find.
export const CELL = 2;
const X0 = -80, Z0 = -80, NX = 72, NZ = 74;
const Hm = new Float32Array(NX * NZ).fill(-Infinity);
const Km = new Uint8Array(NX * NZ).fill(255);

export const SUMMIT = { x: 0, z: -58, h: 30, r: 11 };
export const PLATEAU_H = 22;
// 0 meadow, 1 rock, 2 grass, 3 path, 4 snow, 5 water, 6 ice, 7 mine floor
const R = (x, z, x0, x1, z0, z1) => x >= x0 && x < x1 && z >= z0 && z < z1;

// dirt paths in the valley so the routes read at a glance
const PATHS = [
  [[3, 44], [0, 30], [-6, 14], [-4, 6]],                 // camp → crossroad
  [[-4, 6], [-14, 18], [-24, 24]],                       // → forest terraces
  [[-4, 6], [-18, 0], [-24, -1]],                        // → waterfall
  [[-4, 6], [12, 2], [30, 0]],                           // → mine
  [[3, 44], [18, 32], [30, 25]],                         // → east ridge
];
function segDist(x, z, [ax, az], [bx, bz]) {
  const dx = bx - ax, dz = bz - az, k = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - ax - dx * k, z - az - dz * k);
}
const onPath = (x, z) => PATHS.some((p) => p.slice(1).some((b, i) => segDist(x, z, p[i], b) < 1.7));
export const riverZ = (x) => 1 + (x + 24) * 0.45;
const water = (x, z) => (x > -24 && x < 10 && Math.abs(z - riverZ(x)) < 1.6) || Math.hypot(x - 14, z - 17) < 6 || R(x, z, -32, -24, -6, 4);

function heightFn(x, z) {
  // ---- de top: three snowy steps up to a flat arena, where the Lawinereus sleeps ----
  const rs = Math.hypot(x - SUMMIT.x, z - SUMMIT.z);
  if (rs < SUMMIT.r + 4.5) {
    const h = rs < SUMMIT.r ? 30 : rs < SUMMIT.r + 1.5 ? 28 : rs < SUMMIT.r + 3 ? 26 : 24;
    return [h, h >= 26 ? 4 : 1];
  }
  // ---- de gletsjer (north-east): crevasses, and a glowing crack over a hidden ice cave ----
  if (R(x, z, 16, 64, -74, -44)) {
    if (x < 18 || R(x, z, 16, 64, -54, -50) || R(x, z, 16, 64, -64, -60)) return null;
    if (R(x, z, 54, 58, -72, -68)) return [21.6, 6];
    return [24, 6];
  }
  // ---- de hoogvlakte: where all three routes meet ----
  if (R(x, z, -32, 16, -66, -44)) return [PLATEAU_H, 1];
  if (R(x, z, -32, 34, -44, -14)) return [PLATEAU_H, 2];
  if (R(x, z, 34, 64, -44, -14)) {
    if (R(x, z, 34, 62, -34, -14)) return R(x, z, 44, 52, -34, -14) ? null : [0, 7];   // the mine hall (roofed), with its chasm
    return [PLATEAU_H, 2];
  }
  // ---- de mijn: tunnel from the valley into the mountain ----
  if (R(x, z, 30, 42, -3, 3) || R(x, z, 36, 42, -14, -3)) return [0, 7];
  if (R(x, z, 32, 38, 3, 9)) return [0, 7];                  // old storeroom behind a cracked wall (roofed in world.js)
  // ---- de oostkam: terraces up from the valley, a high meadow, rock steps to the plateau ----
  if (R(x, z, 54, 64, -14, -8)) return [z < -12 ? 20 : z < -10 ? 18 : 16, 1];
  if (R(x, z, 30, 64, -14, 20)) return [14, 2];
  if (R(x, z, 30, 64, 20, 30)) return [Math.min(12, (Math.floor((x - 30) / 4) + 1) * 2), 1];
  // ---- het dennenbos: the west plateau, with the stream that feeds the waterfall ----
  if (R(x, z, -64, -32, -30, 30)) {
    if (R(x, z, -36, -32, -2, 2)) return [-0.6, 1];          // the hollow behind the waterfall (roofed in world.js)
    if (R(x, z, -52, -36, -4, 2)) return [5.4, 5];
    if (R(x, z, -58, -54, -22, -18)) return [10, 1];         // the kid goat's rock
    return [6, 2];
  }
  if (R(x, z, -32, -24, 18, 30)) return [x < -28 ? 4 : 2, 1];
  // ---- de klifwand: a scramble of ledges from the forest up to the plateau ----
  if (R(x, z, -64, -32, -66, -30)) {
    const OFF = [0, 2, -1.5, 3, 1, -0.5];
    const band = Math.max(0, Math.min(8, Math.floor((-30 - z + OFF[Math.floor((x + 64) / 6) % 6]) / 3.4)));
    const h = 6 + band * 2;
    return [h, h >= 18 ? 4 : 1];
  }
  if (R(x, z, -76, -72, -52, -48)) return [16, 1];           // the lone rock off the cliff
  // ---- het dal ----
  if (R(x, z, -32, 30, -14, 30)) return water(x, z) ? [-0.6, 5] : [0, onPath(x, z) ? 3 : 0];
  // ---- het basiskamp ----
  if ((x / 26) ** 2 + ((z - 42) / 16) ** 2 < 1 || R(x, z, -32, 30, 30, 42)) return [0, onPath(x, z) ? 3 : 0];
  // ---- under the rim of the camp: a ledge you only see if you peek over the edge ----
  if (R(x, z, -10, -2, 60, 66)) return [-5, 1];
  if (R(x, z, -2, 2, 60, 64)) return [-3, 1];
  if (R(x, z, 2, 6, 58, 62)) return [-1, 1];
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
  [0x8fd16a, 0x7a5a40],   // meadow
  [0xa39d92, 0x7d766d],   // rock
  [0x6fae5e, 0x7d6a58],   // grass
  [0xd9b98a, 0x9c8266],   // path
  [0xf4f7fb, 0xc9d3de],   // snow
  [0x5fb4e8, 0x4a86b0],   // water
  [0xd8f1ff, 0x9ccbe6],   // ice
  [0x5a4e48, 0x3e3632],   // mine floor
];
const geo = new THREE.BoxGeometry(1, 1, 1);
const m4 = new THREE.Matrix4(), col = new THREE.Color();
let seed = 21;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
kinds.forEach((list, k) => {
  if (!list.length) return;
  const [top, side] = PAL[k];
  const mt = toon(top);
  if (k === 5) mt.emissive.set(0x0d3550);
  if (k === 6) mt.emissive.set(0x1a3040);
  const mats = [toon(side), toon(side), mt, toon(side), toon(side), toon(side)];
  const im = new THREE.InstancedMesh(geo, mats, list.length);
  list.forEach(([x, z, h], n) => {
    const bottom = -12;
    m4.makeScale(CELL, h - bottom, CELL);
    m4.setPosition(x, (h + bottom) / 2, z);
    im.setMatrixAt(n, m4);
    const v = 0.9 + rnd() * 0.14;
    im.setColorAt(n, col.setRGB(v, v, v));
  });
  im.receiveShadow = true; im.castShadow = k !== 5;
  scene.add(im);
});

// the underside of the floating island
const rock = toon(0x8a7a6a), dirt = toon(0x7a5a40);
for (const [x, z, r, h, m] of [[0, 18, 44, 36, dirt], [-48, -18, 28, 30, rock], [18, -44, 46, 44, rock], [46, 4, 24, 26, dirt]]) {
  const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 10), m);
  c.rotation.x = Math.PI; c.position.set(x, -12 - h / 2, z); scene.add(c);
}
