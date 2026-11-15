import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';

// WIDR Island: one big island (resort beach in the south, volcano in the north) plus a lighthouse islet to the east.
// The sports all sit on the flat resort beach around the origin.
export const CENTER = { x: 0, z: -120 };
export const ISLET = { x: 252, z: -120, r: 24 };
export const VOLCANO = { x: 0, z: -215 };

const radius = (a) => 180 + 12 * Math.sin(3 * a + 1) + 8 * Math.sin(5 * a + 2) + 5 * Math.sin(9 * a + 0.5);
// signed distance to the coastline: positive on land, negative at sea
export function shoreS(x, z) {
  const dx = x - CENTER.x, dz = z - CENTER.z;
  const s1 = radius(Math.atan2(dz, dx)) - Math.hypot(dx, dz);
  const s2 = ISLET.r - Math.hypot(x - ISLET.x, z - ISLET.z);
  return Math.max(s1, s2);
}
// the same function in GLSL for the water shader (foam, shallows, calm water near the beach)
export const SHORE_GLSL = `
float shoreS(vec2 p){
  vec2 q = p - vec2(${CENTER.x.toFixed(1)}, ${CENTER.z.toFixed(1)});
  float a = atan(q.y, q.x);
  float R = 180. + 12.*sin(3.*a+1.) + 8.*sin(5.*a+2.) + 5.*sin(9.*a+.5);
  float s1 = R - length(q);
  float s2 = ${ISLET.r.toFixed(1)} - length(p - vec2(${ISLET.x.toFixed(1)}, ${ISLET.z.toFixed(1)}));
  return max(s1, s2);
}`;

// value-noise fbm
const hash = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export const fbm = (x, z) => { let s = 0, amp = 0.5, f = 1; for (let i = 0; i < 4; i++) { s += amp * vnoise(x * f, z * f); f *= 2.03; amp *= 0.5; } return s; };
const smooth = (x, a, b) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const cone = (x, z, cx, cz, h, r, p = 1.6) => h * Math.pow(Math.max(0, 1 - Math.hypot(x - cx, z - cz) / r), p);

export function height(x, z) {
  const s = shoreS(x, z);
  if (s < 0) return Math.max(-7, -0.6 + s * 0.14);
  let y = -0.6 + Math.min(s, 10) * 0.06;
  // keep the resort beach (and the archery range running north) perfectly flat
  const r0 = Math.hypot(x, z * (z < 0 ? 0.75 : 1));
  const w = smooth(r0, 58, 125) * smooth(s, 10, 40);
  if (w <= 0) return y;
  const hills = Math.max(0, (fbm(x * 0.011 + 3, z * 0.011 + 7) - 0.38) * 46);
  const dv = Math.hypot(x - VOLCANO.x, z - VOLCANO.z);
  let vol = cone(x, z, VOLCANO.x, VOLCANO.z, 118, 150, 1.55);
  if (dv < 17) vol -= (17 - dv) * 1.7;
  const peaks = cone(x, z, -100, -150, 52, 72) + cone(x, z, 115, -195, 38, 62) + cone(x, z, 95, -70, 14, 40, 1.2);
  const isletHill = cone(x, z, ISLET.x, ISLET.z, 7, 18, 1.2);
  return y + w * (hills + vol + peaks) + isletHill;
}

// terrain mesh with vertex colours: sand beaches, two-tone grass, darker forest patches, rock and an ashy crater
export function buildTerrain() {
  const SIZE = 780, SEG = 260;
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  geo.rotateX(-Math.PI / 2);
  geo.translate(CENTER.x + 40, 0, CENTER.z + 20);
  const p = geo.attributes.position, col = new Float32Array(p.count * 3);
  const sand = new THREE.Color(0xf6e2b0), wet = new THREE.Color(0xd1ac72), under = new THREE.Color(0x6fbfae);
  const g1 = new THREE.Color(0x6cc24f), g2 = new THREE.Color(0x4ea845), forest = new THREE.Color(0x2f7d3a);
  const rock = new THREE.Color(0x8d7b68), ash = new THREE.Color(0x5a4a40), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), y = height(x, z), s = shoreS(x, z);
    p.setY(i, y);
    const slope = Math.abs(height(x + 1.5, z) - y) + Math.abs(height(x, z + 1.5) - y);
    const n = fbm(x * 0.05, z * 0.05), r0 = Math.hypot(x, z);
    if (s < 0) c.copy(wet).lerp(under, smooth(-y, 0.6, 3));
    else if (s < 9 || (r0 < 50 && y < 0.2)) c.copy(sand).lerp(wet, smooth(-y, 0.25, 0.6)).multiplyScalar(0.95 + n * 0.08);
    else {
      c.copy(g1).lerp(g2, n);
      if (fbm(x * 0.02 + 9, z * 0.02) > 0.58) c.lerp(forest, 0.6);
      c.lerp(sand, (1 - smooth(s, 9, 16)) * 0.8 + (1 - smooth(r0, 50, 64)) * 0.85);
      if (slope > 1.6 || y > 55) c.lerp(rock, smooth(slope, 1.6, 3) * 0.9 + smooth(y, 55, 80));
      if (Math.hypot(x - VOLCANO.x, z - VOLCANO.z) < 30) c.lerp(ash, 0.8);
    }
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
  mesh.receiveShadow = true;
  return mesh;
}
