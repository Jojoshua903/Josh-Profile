import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';

export const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.5, metalness: 0.15, ...o });
export const glow = (color, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending });

function part(geo, mat, parent, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
  parent.add(m); return m;
}
function flatShape(pts, depth = 0.1) {
  const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
  g.rotateX(Math.PI / 2); g.translate(0, depth / 2, 0);
  return g;
}

// Player ship. Forward is -Z.
export function makeKestrel(accent = 0x2f5bff) {
  const g = new THREE.Group();
  const white = M(0xf3efe6), acc = M(accent), dark = M(0x2b3245);
  const glass = M(0x7fd4ff, { metalness: 0.6, roughness: 0.15, emissive: 0x1a4a7a, emissiveIntensity: 0.5 });
  part(new THREE.ConeGeometry(0.5, 2.6, 6), white, g, 0, 0, -1.3, -Math.PI / 2);
  part(new THREE.CylinderGeometry(0.62, 0.5, 1.3, 6), white, g, 0, 0, 0.65, Math.PI / 2);
  const can = part(new THREE.SphereGeometry(0.42, 10, 8), glass, g, 0, 0.36, -0.4); can.scale.set(1, 0.8, 2.1);
  part(new THREE.BoxGeometry(0.16, 0.06, 1.6), acc, g, 0, 0.45, -1.6, 0.15);
  const wingMat = M(0xf3efe6, { side: THREE.DoubleSide });
  const wingPts = [[0.3, -0.3], [3.2, 1.0], [3.25, 1.45], [0.45, 1.2]];
  const wr = part(flatShape(wingPts), wingMat, g, 0, -0.1, 0, 0, 0, 0.12);
  const wl = part(flatShape(wingPts), wingMat, g, 0, -0.1, 0, 0, 0, -0.12); wl.scale.x = -1;
  for (const s of [-1, 1]) {
    part(new THREE.BoxGeometry(0.1, 1.2, 0.95), acc, g, s * 3.2, 0.62, 1.15, 0.25, 0, -s * 0.1);
    part(new THREE.BoxGeometry(0.1, 0.7, 0.7), acc, g, s * 3.2, -0.25, 1.25, -0.2);
    part(new THREE.BoxGeometry(1.2, 0.08, 0.25), acc, g, s * 1.4, 0.05, 0.6, 0, -s * 0.35, s * 0.12);
  }
  part(new THREE.BoxGeometry(0.08, 0.9, 0.9), acc, g, 0, 0.7, 1.05, 0.4);
  part(new THREE.CylinderGeometry(0.42, 0.42, 0.4, 8), dark, g, 0, 0, 1.4, Math.PI / 2);
  const flame = part(new THREE.ConeGeometry(0.34, 1.6, 8), glow(0x7fd8ff, 0.95), g, 0, 0, 2.3, Math.PI / 2);
  const core = part(new THREE.ConeGeometry(0.18, 1.0, 8), glow(0xffffff, 1), g, 0, 0, 2.0, Math.PI / 2);
  g.userData.flame = flame; g.userData.core = core;
  g.traverse(o => o.isMesh && o.material.type !== 'MeshBasicMaterial' && (o.castShadow = false));
  return g;
}

// Enemy dart fighter. Forward is +Z (toward player).
export function makeFighter(c1 = 0xc8102e, c2 = 0x3a2150) {
  const g = new THREE.Group();
  const b = part(new THREE.OctahedronGeometry(1, 0), M(c2), g); b.scale.set(0.75, 0.5, 1.9);
  for (const s of [-1, 1]) {
    const w = part(new THREE.ConeGeometry(0.55, 2.8, 3), M(c1), g, s * 1.5, 0, -0.3, 0, 0, -s * Math.PI / 2); w.scale.z = 0.35;
    part(new THREE.BoxGeometry(0.12, 1.0, 1.2), M(c2), g, s * 2.8, 0, -0.3, 0, 0, s * 0.3);
  }
  part(new THREE.SphereGeometry(0.28, 8, 6), glow(0xffd23f), g, 0, 0.12, 1.2);
  part(new THREE.ConeGeometry(0.25, 1, 6), glow(0xff5a1f, 0.9), g, 0, 0, -1.9, -Math.PI / 2);
  return g;
}

export function makeAce() {
  const g = new THREE.Group();
  const black = M(0x1d1d26, { metalness: 0.5, roughness: 0.3 }), red = M(0xc8102e);
  const b = part(new THREE.OctahedronGeometry(1, 0), black, g); b.scale.set(0.9, 0.6, 2.6);
  const wp = [[0.3, 0.6], [3.4, -1.6], [3.6, -1.1], [0.5, 1.4]];
  part(flatShape(wp, 0.14), M(0xc8102e, { side: THREE.DoubleSide }), g, 0, 0, 0);
  const l = part(flatShape(wp, 0.14), M(0xc8102e, { side: THREE.DoubleSide }), g, 0, 0, 0); l.scale.x = -1;
  for (const s of [-1, 1]) part(new THREE.BoxGeometry(0.12, 1.4, 1.4), black, g, s * 3.5, 0.3, -1.3, 0, 0, -s * 0.2);
  part(new THREE.SphereGeometry(0.35, 10, 8), glow(0xff2d55), g, 0, 0.35, 1.0).scale.set(1, 0.6, 1.8);
  const f = part(new THREE.ConeGeometry(0.4, 1.8, 8), glow(0xff5a1f, 0.9), g, 0, 0, -3.0, -Math.PI / 2);
  g.userData.flame = f;
  g.scale.setScalar(1.35);
  return g;
}

export function makeGunship() {
  const g = new THREE.Group();
  const hull = M(0x3a2150), red = M(0xc8102e), steel = M(0x8c8aa3, { metalness: 0.5 });
  part(new THREE.BoxGeometry(4, 2, 7), hull, g);
  part(new THREE.ConeGeometry(1.6, 3, 4), hull, g, 0, 0, 4.8, Math.PI / 2, Math.PI / 4);
  for (const s of [-1, 1]) {
    part(new THREE.CylinderGeometry(1.1, 1.1, 6, 8), red, g, s * 3.6, -0.4, 0, Math.PI / 2);
    part(new THREE.BoxGeometry(3, 0.3, 2.4), steel, g, s * 2, 0, 0);
    part(new THREE.CylinderGeometry(0.25, 0.25, 2.5, 6), steel, g, s * 3.6, -0.4, 3.8, Math.PI / 2);
  }
  part(new THREE.SphereGeometry(0.6, 10, 8), glow(0xffd23f), g, 0, 1.1, 2.4);
  g.scale.setScalar(1.4);
  return g;
}

export function makeTurret() {
  const g = new THREE.Group();
  part(new THREE.CylinderGeometry(2, 2.6, 1.2, 8), M(0x6d6a7c), g, 0, 0.6, 0);
  const head = new THREE.Group(); head.position.y = 1.4; g.add(head);
  part(new THREE.SphereGeometry(1.5, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), M(0xc8102e), head);
  part(new THREE.CylinderGeometry(0.25, 0.3, 2.6, 6), M(0x2b2b38), head, 0, 0.5, 1.4, Math.PI / 2);
  g.userData.head = head;
  return g;
}

export function makeAsteroid(r) {
  const geo = new THREE.IcosahedronGeometry(r, 1);
  const p = geo.attributes.position, v = new THREE.Vector3();
  const seed = Math.random() * 10;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = 1 + 0.22 * Math.sin(v.x * 2.1 / r + seed) * Math.cos(v.y * 1.7 / r + seed * 2) + 0.12 * Math.sin(v.z * 3.3 / r);
    v.multiplyScalar(n); p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  const tones = [0x9a6a4f, 0x7d5a48, 0xb3835d, 0x8a6e63];
  return new THREE.Mesh(geo, M(tones[(Math.random() * tones.length) | 0], { roughness: 0.95 }));
}

// Flagship. Front face at local z = +40, faces +Z.
export function makeDreadnought(pal = { hull: 0x22304f, plate: 0x3d5488, pod: 0x0866ff, trim: 0xc9d6ff }) {
  const g = new THREE.Group();
  const hull = M(pal.hull, { metalness: 0.35 }), plate = M(pal.plate), red = M(pal.pod), gold = M(pal.trim, { metalness: 0.6 });
  part(new THREE.BoxGeometry(56, 12, 76), hull, g);
  part(new THREE.BoxGeometry(40, 6, 70), plate, g, 0, 8, -4);
  part(new THREE.BoxGeometry(14, 18, 22), hull, g, 0, 16, -14);
  part(new THREE.BoxGeometry(18, 3, 4), gold, g, 0, 22, -2);
  for (const s of [-1, 1]) {
    part(new THREE.BoxGeometry(10, 22, 60), plate, g, s * 33, -2, -6);
    part(new THREE.ConeGeometry(5, 18, 4), hull, g, s * 33, -2, 32, Math.PI / 2, Math.PI / 4);
    part(new THREE.CylinderGeometry(4, 4, 8, 10), M(0x2a2238), g, s * 20, 0, -40, Math.PI / 2);
    part(new THREE.CircleGeometry(3.4, 16), glow(0xff5a1f), g, s * 20, 0, -44.1, 0, Math.PI);
  }
  part(new THREE.BoxGeometry(38, 20, 3), M(0x2a2238), g, 0, 2, 38.5);
  const lights = [];
  for (let i = 0; i < 14; i++) {
    const l = part(new THREE.SphereGeometry(0.5, 6, 4), glow(0xff2d55), g, -26 + i * 4, 6.4, 38.2 - (i % 2) * 30);
    lights.push(l);
  }
  const pods = [];
  for (const [x, y] of [[-11, 8], [11, 8], [-11, -3], [11, -3]]) {
    const pod = new THREE.Group(); pod.position.set(x, y, 41); g.add(pod);
    part(new THREE.SphereGeometry(2.6, 12, 8), red, pod);
    part(new THREE.TorusGeometry(2.7, 0.35, 6, 16), gold, pod);
    part(new THREE.CylinderGeometry(0.5, 0.6, 3.6, 8), M(0x1d1d26), pod, 0, 0, 2.4, Math.PI / 2);
    pods.push(pod);
  }
  const core = part(new THREE.SphereGeometry(3.6, 16, 12), glow(0xff3df0, 0.95), g, 0, 2.5, 39);
  const coreRing = part(new THREE.TorusGeometry(4.6, 0.5, 8, 24), gold, g, 0, 2.5, 39.6);
  const shutters = [];
  for (const s of [-1, 1]) shutters.push(part(new THREE.BoxGeometry(5.2, 10, 1.2), gold, g, s * 2.6, 2.5, 41.2));
  g.userData = { pods, core, coreRing, shutters, lights };
  return g;
}

export function makeRing(gold = false) {
  const g = new THREE.Group();
  part(new THREE.TorusGeometry(2.4, 0.25, 8, 28), M(gold ? 0xffc93a : 0xdfe6f2, { metalness: 0.85, roughness: 0.2, emissive: gold ? 0x6a4a00 : 0x334466, emissiveIntensity: 0.6 }), g);
  part(new THREE.TorusGeometry(2.4, 0.5, 6, 28), glow(gold ? 0xffd23f : 0x9fd8ff, 0.35), g);
  return g;
}

export function makePickup(kind) {
  const g = new THREE.Group();
  const c = kind === 'laser' ? 0x2f5bff : 0xff5a1f;
  part(new THREE.OctahedronGeometry(1.1, 0), M(c, { emissive: c, emissiveIntensity: 0.4 }), g);
  part(new THREE.OctahedronGeometry(1.7, 0), glow(c, 0.25), g);
  return g;
}

const TOWER_COLS = [0xfff1d6, 0xf2b28f, 0xe86a4a, 0x7cc4c0, 0xf7d77a];
export function makeTower() {
  const g = new THREE.Group();
  const h = 8 + Math.random() * 34, w = 4 + Math.random() * 5;
  const col = TOWER_COLS[(Math.random() * TOWER_COLS.length) | 0];
  part(new THREE.BoxGeometry(w, h, w), M(col, { roughness: 0.8 }), g, 0, h / 2, 0);
  part(new THREE.BoxGeometry(w * 1.05, 0.8, w * 1.05), M(0x13204a), g, 0, h * 0.7, 0);
  if (Math.random() < 0.5) part(new THREE.CylinderGeometry(0.15, 0.15, 6, 4), M(0x13204a), g, 0, h + 3, 0);
  if (Math.random() < 0.4) part(new THREE.SphereGeometry(w * 0.55, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), M(0x7cc4c0), g, 0, h, 0);
  return g;
}

export function makeCloud(scale = 1, tint = 0xffffff) {
  const g = new THREE.Group();
  const mat = M(tint, { roughness: 1, emissive: tint, emissiveIntensity: 0.25 });
  const n = 4 + ((Math.random() * 4) | 0);
  for (let i = 0; i < n; i++) {
    const s = part(new THREE.IcosahedronGeometry(3 + Math.random() * 4, 1), mat, g, (i - n / 2) * 4, Math.random() * 2, (Math.random() - 0.5) * 6);
    s.scale.y = 0.6;
  }
  g.scale.setScalar(scale);
  return g;
}

export function makeCarrier() {
  const g = new THREE.Group();
  part(new THREE.BoxGeometry(34, 3, 130), M(0xd9dde6, { metalness: 0.3 }), g, 0, -1.5, 0);
  part(new THREE.BoxGeometry(40, 6, 110), M(0x8f97ab), g, 0, -6, 6);
  for (let i = 0; i < 12; i++) part(new THREE.BoxGeometry(0.5, 0.05, 6), M(0xffd23f), g, -3, 0.03, -60 + i * 10);
  for (const x of [-9, -3, 3, 9]) part(new THREE.BoxGeometry(5, 0.05, 5), M(0xff5a1f), g, x, 0.04, 6);
  part(new THREE.BoxGeometry(8, 14, 20), M(0xfff6e4), g, 19, 6, 20);
  part(new THREE.BoxGeometry(8.2, 2, 18), M(0x2f5bff), g, 19, 10, 20);
  part(new THREE.CylinderGeometry(0.2, 0.2, 10, 4), M(0x132044), g, 19, 18, 22);
  return g;
}
