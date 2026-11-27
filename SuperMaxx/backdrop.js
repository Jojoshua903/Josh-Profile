import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { M, put, mergeStatic } from './scenery.js?v=20261128w';

// Buildings and far scenery around the arena. Everything sits outside the playable
// rectangle (|x| > W, |z| > L) so it never affects collision.

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const prism = (w, h, d) => {               // gable roof: triangle across w, extruded along d
  const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }); g.translate(0, 0, -d / 2); return g;
};

// A random point in a band `near`..`near+spread` metres outside the arena rectangle.
function outside(map, r, near, spread) {
  const d = near + r() * spread;
  if (r() < map.W / (map.W + map.L)) return [(r() * 2 - 1) * (map.W + d), (r() < 0.5 ? -1 : 1) * (map.L + d)];
  return [(r() < 0.5 ? -1 : 1) * (map.W + d), (r() * 2 - 1) * (map.L + d)];
}

// Walk the four boundary edges and call make(width) for each slot, facing inward.
function ring(map, r, gap, make, parent) {
  const edges = [
    { len: map.L * 2, at: t => [-map.W, t], n: [1, 0] }, { len: map.L * 2, at: t => [map.W, -t], n: [-1, 0] },
    { len: map.W * 2, at: t => [-t, -map.L], n: [0, 1] }, { len: map.W * 2, at: t => [t, map.L], n: [0, -1] },
  ];
  for (const e of edges) {
    let t = -e.len / 2 - 4;
    while (t < e.len / 2 + 4) {
      const w = gap[0] + r() * (gap[1] - gap[0]);
      const g = make(w, r);
      const [x, z] = e.at(t + w / 2);
      g.rotation.y = Math.atan2(-e.n[0], -e.n[1]);
      g.position.set(x, 0, z);
      parent.add(g);
      t += w;
    }
  }
}

// ---------- Solmare: whitewashed harbour town ----------
function plazaHouse(w, r) {
  const g = new THREE.Group();
  const h = 6 + Math.floor(r() * 3) * 2.6, d = 6;
  const wall = [0xfbf6ec, 0xf8ecd8, 0xf4dcc2, 0xfdf1e2, 0xe9f0f2][Math.floor(r() * 5)];
  const shutter = [0x2f6fb3, 0x3f9b8f, 0x2f6fb3, 0xd9734e][Math.floor(r() * 4)];
  put(g, box(w - 0.15, h, d), M(wall), 0, h / 2, d / 2);
  if (r() < 0.6) { const roof = put(g, prism(w + 0.4, 1.6, d + 0.4), M(0xc8553d), 0, h, d / 2); roof.rotation.y = 0; }
  else put(g, box(w, 0.4, d + 0.2), M(0xd9734e), 0, h + 0.2, d / 2);
  const floors = Math.floor(h / 2.6);
  for (let f = 0; f < floors; f++) {
    const cols = Math.max(1, Math.floor(w / 2.4));
    for (let c = 0; c < cols; c++) {
      const x = -w / 2 + (c + 0.5) * (w / cols), y = 1.5 + f * 2.6;
      if (f === 0 && c === 0 && r() < 0.6) { put(g, box(1.2, 2.2, 0.1), M(shutter), x, 1.1, -0.02, false); continue; }
      put(g, box(0.8, 1.2, 0.1), M(0x2a3550), x, y, -0.03, false);
      put(g, box(0.4, 1.25, 0.12), M(shutter), x - 0.62, y, -0.05, false);
      put(g, box(0.4, 1.25, 0.12), M(shutter), x + 0.62, y, -0.05, false);
      if (f > 0 && r() < 0.35) {                                  // flower box
        put(g, box(1.1, 0.25, 0.35), M(0xc8553d), x, y - 0.75, -0.2, false);
        for (let k = 0; k < 4; k++) put(g, new THREE.SphereGeometry(0.13, 6, 5), M([0xff5f8f, 0xffffff, 0xff9a3c][k % 3]), x - 0.4 + k * 0.27, y - 0.55, -0.22, false);
      }
    }
  }
  if (r() < 0.3) {                                                // striped awning
    for (let k = 0; k < 6; k++) { const a = put(g, box(w / 6, 0.08, 1.4), M(k % 2 ? 0xffffff : 0xd9734e), -w / 2 + (k + 0.5) * w / 6, 2.9, -0.6, false); a.rotation.x = 0.35; }
  }
  return g;
}

function plazaFar(scene, map, r) {
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), new THREE.MeshStandardMaterial({ color: 0x3fb0c9 }));
  sea.rotation.x = -Math.PI / 2; sea.position.y = -0.2; scene.add(sea);
  // a town island around the arena so the sea frames it
  const land = new THREE.Mesh(new THREE.CircleGeometry(map.L + 40, 48), M(0xe8c79c));
  land.rotation.x = -Math.PI / 2; land.position.y = -0.1; scene.add(land);
  for (let i = 0; i < 26; i++) {                                  // hills of houses behind the front row
    const a = (i / 26) * Math.PI * 2, d = map.L + 18 + r() * 14;
    const g = plazaHouse(5 + r() * 4, r); g.scale.setScalar(1.2 + r() * 0.5);
    g.position.set(Math.cos(a) * d * (map.W / map.L + 0.55), r() * 3, Math.sin(a) * d); g.rotation.y = -a + Math.PI / 2;
    scene.add(g);
  }
  // lighthouse
  const lh = new THREE.Group();
  for (let i = 0; i < 6; i++) put(lh, new THREE.CylinderGeometry(2.4 - i * 0.2, 2.6 - i * 0.2, 4, 16), M(i % 2 ? 0xd9734e : 0xffffff), 0, 2 + i * 4, 0);
  put(lh, new THREE.CylinderGeometry(1.6, 1.6, 2, 12), M(0xffe9a8, { emissive: 0xffd36a, emissiveIntensity: 0.6 }), 0, 25, 0);
  put(lh, new THREE.ConeGeometry(2, 2, 12), M(0x2a3550), 0, 27, 0);
  lh.position.set(map.W + 50, 0, 20); scene.add(lh);
  // sailboats
  const boats = [];
  for (let i = 0; i < 5; i++) {
    const b = new THREE.Group();
    put(b, box(1.6, 0.8, 5), M(0xffffff), 0, 0.2, 0);
    const sail = new THREE.Mesh(new THREE.ConeGeometry(1.6, 5, 3), M(i % 2 ? 0xffc93c : 0xffffff)); sail.position.y = 3; sail.scale.z = 0.15; b.add(sail);
    const a = r() * Math.PI * 2, d = map.L + 75 + r() * 40;
    b.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); b.userData = { a, d };
    scene.add(b); boats.push(b);
  }
  return (dt, t) => boats.forEach((b, i) => { b.userData.a += dt * 0.01; b.position.x = Math.cos(b.userData.a) * b.userData.d; b.position.z = Math.sin(b.userData.a) * b.userData.d; b.rotation.y = -b.userData.a; b.position.y = Math.sin(t + i) * 0.15; });
}

// ---------- Lantern Canals: gabled canal houses ----------
function canalHouse(w, r) {
  const g = new THREE.Group();
  const h = 9 + r() * 6, d = 7;
  const brick = [0x9c4a36, 0x6d3b2e, 0x4c5d6b, 0xe8d3a8, 0x3f5d4c, 0xb8683f, 0x2e3a52][Math.floor(r() * 7)];
  const trim = 0xf7f1e6;
  put(g, box(w - 0.2, h, d), M(brick), 0, h / 2, d / 2);
  const style = Math.floor(r() * 3);
  if (style === 0) {                                              // stepped gable
    for (let k = 0; k < 4; k++) put(g, box((w - 0.2) * (1 - k * 0.22), 1, 0.6), M(brick), 0, h + 0.5 + k, 0.3);
    put(g, prism(w - 0.2, 3.5, d - 0.6), M(0x3a3f4a), 0, h, d / 2 + 0.3);
  } else if (style === 1) {                                       // bell gable with white trim
    put(g, prism(w - 0.2, 3.2, 0.6), M(brick), 0, h, 0.3);
    put(g, prism(w + 0.1, 3.4, 0.2), M(trim), 0, h - 0.05, 0.02);
    put(g, prism(w - 0.2, 3.2, d - 0.6), M(0x3a3f4a), 0, h, d / 2 + 0.3);
  } else {                                                        // neck gable
    put(g, box(w * 0.5, 2.4, 0.6), M(brick), 0, h + 1.2, 0.3);
    put(g, new THREE.CylinderGeometry(w * 0.25, w * 0.25, 0.6, 12, 1, false, 0, Math.PI), M(trim), 0, h + 2.4, 0.3).rotation.x = Math.PI / 2;
    put(g, prism(w - 0.2, 2.6, d - 0.6), M(0x3a3f4a), 0, h, d / 2 + 0.3);
  }
  put(g, box(0.3, 0.3, 1.2), M(trim), 0, h + 1.8, -0.3, false);  // hoist beam
  const floors = Math.floor((h - 1) / 2.8);
  const cols = Math.max(2, Math.floor(w / 1.8));
  for (let f = 0; f < floors; f++) for (let c = 0; c < cols; c++) {
    const x = -w / 2 + (c + 0.5) * (w / cols), y = 1.8 + f * 2.8;
    put(g, box(1.0, 1.8, 0.1), M(trim), x, y, -0.03, false);
    put(g, box(0.8, 1.6, 0.12), M(0x2a3550, { emissive: 0xffc46a, emissiveIntensity: r() < 0.25 ? 0.5 : 0 }), x, y, -0.06, false);
    put(g, box(0.82, 0.06, 0.14), M(trim), x, y, -0.08, false);
  }
  put(g, box(1.2, 2.2, 0.15), M(0x2f4f3f), w * 0.25, 1.1, -0.05, false);
  return g;
}

function canalsFar(scene, map, r) {
  const fields = [0x9bbf6a, 0xe9c44a, 0xd8475e, 0xf28fb0, 0x9bbf6a, 0xf2a03c];
  for (let i = 0; i < 30; i++) {                                  // tulip field stripes
    const s = new THREE.Mesh(new THREE.PlaneGeometry(10, 120), M(fields[i % fields.length]));
    s.rotation.x = -Math.PI / 2; s.position.set((i < 15 ? -1 : 1) * (map.W + 40 + (i % 15) * 10), -0.03, 0); scene.add(s);
  }
  const mills = [];
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Group();
    put(m, new THREE.CylinderGeometry(2, 3.4, 12, 8), M(0x6b5a4a), 0, 6, 0);
    put(m, new THREE.ConeGeometry(2.6, 3, 8), M(0x3a3f4a), 0, 13.5, 0);
    const sails = new THREE.Group(); sails.position.set(0, 12, -2.6); m.add(sails);
    for (let k = 0; k < 4; k++) { const arm = put(sails, box(1.4, 9, 0.15), M(0xf7f1e6), 0, 4.5, 0, false); const p = new THREE.Group(); p.rotation.z = k * Math.PI / 2; p.add(arm); sails.add(p); }
    const side = i % 2 ? 1 : -1;
    m.position.set(side * (map.W + 55 + r() * 60), 0, -map.L + (i / 6) * map.L * 2 + r() * 10);
    m.rotation.y = side * Math.PI / 2;
    scene.add(m); mills.push(sails);
  }
  for (let i = 0; i < 18; i++) {                                  // second row of houses peeking over
    const g = canalHouse(4 + r() * 3, r); const [x, z] = outside(map, r, 13, 6);
    g.position.set(x, 0, z); g.rotation.y = Math.atan2(x, z); g.scale.setScalar(1.1);
    scene.add(g);
  }
  return (dt) => mills.forEach((s, i) => { s.rotation.z += dt * (0.4 + i * 0.05); });
}

// ---------- Mossgarden: temple ruins ----------
function ruinWall(w, r) {
  const g = new THREE.Group();
  const h = 3.5 + r() * 3;
  put(g, box(w, h, 2.2), M(0xd8d2c4), 0, h / 2, 1.1);
  put(g, box(w + 0.2, 0.35, 2.5), M(0x7aa35a), 0, h + 0.1, 1.1);   // moss crown
  if (w > 5 && r() < 0.6) {                                       // arch opening
    put(g, box(2, 2.8, 0.3), M(0x4b4a52), 0, 1.4, -0.02, false);
    put(g, new THREE.CylinderGeometry(1, 1, 0.32, 14, 1, false, 0, Math.PI), M(0x4b4a52), 0, 2.8, -0.02, false).rotation.set(Math.PI / 2, 0, -Math.PI / 2);
  }
  for (let k = 0; k < 3; k++) {                                   // hanging ivy
    const iv = put(g, box(0.5 + r() * 0.6, 1 + r() * 2, 0.1), M(0x5f8f45), -w / 2 + r() * w, h - 0.8, -0.05, false); void iv;
  }
  return g;
}

export function pine(parent, x, z, s = 1) {
  const g = new THREE.Group();
  put(g, new THREE.CylinderGeometry(0.25, 0.35, 2, 8), M(0x7a5a3c), 0, 1, 0);
  for (let i = 0; i < 3; i++) put(g, new THREE.ConeGeometry(2 - i * 0.5, 2.6, 9), M([0x3f6b4a, 0x4b7d55, 0x5b8f62][i]), 0, 2.4 + i * 1.5, 0);
  g.position.set(x, 0, z); g.scale.setScalar(s); parent.add(g); return g;
}
export function blossom(parent, x, z, s = 1, r = Math.random) {
  const g = new THREE.Group();
  const trunk = put(g, new THREE.CylinderGeometry(0.2, 0.32, 2.6, 8), M(0x6b4a3a), 0, 1.3, 0); trunk.rotation.z = 0.12;
  for (let i = 0; i < 6; i++) put(g, new THREE.IcosahedronGeometry(0.9 + r() * 0.6, 0), M([0xffb7c9, 0xffd0dc, 0xf59ab3][i % 3], { flatShading: true }), Math.cos(i) * 1.1, 3 + r() * 1.2, Math.sin(i * 1.3) * 1.1);
  g.position.set(x, 0, z); g.scale.setScalar(s); parent.add(g); return g;
}

function terracesFar(scene, map, r) {
  for (let i = 0; i < 22; i++) {                                  // mountain ring
    const a = (i / 22) * Math.PI * 2, d = 200 + r() * 60, h = 50 + r() * 50;
    const m = put(scene, new THREE.ConeGeometry(35 + r() * 20, h, 7), M(0x9db6cf, { flatShading: true }), Math.cos(a) * d, h / 2 - 4, Math.sin(a) * d, false);
    void m;
    put(scene, new THREE.ConeGeometry(12, h * 0.28, 7), M(0xffffff, { flatShading: true }), Math.cos(a) * d, h - h * 0.14 - 4, Math.sin(a) * d, false);
  }
  for (let i = 0; i < 60; i++) {                                  // forest belt
    const [x, z] = outside(map, r, 5, 24);
    if (r() < 0.7) pine(scene, x, z, 1.4 + r()); else blossom(scene, x, z, 1.3 + r(), r);
  }
  for (const s of [-1, 1]) {                                      // pagoda behind each base
    const p = new THREE.Group();
    for (let k = 0; k < 4; k++) {
      put(p, box(8 - k * 1.5, 3, 8 - k * 1.5), M(0xe9e1d2), 0, 1.5 + k * 3.6, 0);
      put(p, box(11 - k * 1.8, 0.5, 11 - k * 1.8), M(0xb5453a), 0, 3.2 + k * 3.6, 0);
    }
    put(p, new THREE.ConeGeometry(1.2, 4, 4), M(0xb5453a), 0, 17.5, 0);
    p.position.set(0, 0, s * (map.L + 14)); scene.add(p);
  }
  return null;
}

// ---------- Frostpeak: timber chalets in the snow ----------
function chalet(w, r) {
  const g = new THREE.Group();
  const h = 4.5 + r() * 3.5, d = 7;
  const wood = [0x8a5634, 0x6e4228, 0x9c6a3f, 0x7b4a2e][Math.floor(r() * 4)];
  put(g, box(w - 0.2, 1.4, d), M(0xb8b4ae), 0, 0.7, d / 2);                          // stone footing
  put(g, box(w - 0.3, h - 1.4, d - 0.2), M(wood), 0, 0.7 + h / 2, d / 2);
  const roofH = 2.4 + w * 0.18;
  put(g, prism(w + 1.2, roofH, d + 1.2), M(0x4a3a36), 0, h, d / 2);
  put(g, prism(w + 1.3, roofH * 0.55, d + 1.3), M(0xf6f8fd), 0, h + roofH * 0.45, d / 2);   // snow load on the ridge
  put(g, box(w + 1.3, 0.18, d + 1.3), M(0xf6f8fd), 0, h + 0.05, d / 2, false);
  const floors = Math.floor((h - 1.4) / 2.4) + 1, cols = Math.max(1, Math.floor(w / 2.2));
  for (let f = 0; f < floors; f++) for (let c = 0; c < cols; c++) {
    const x = -w / 2 + (c + 0.5) * (w / cols), y = 2.2 + f * 2.4;
    if (y > h - 0.6) continue;
    const lit = r() < 0.55;
    put(g, box(1, 1.1, 0.1), M(lit ? 0xffd38a : 0x2a3550, lit ? { emissive: 0xffb45a, emissiveIntensity: 0.9 } : undefined), x, y, -0.05, false);
    put(g, box(0.38, 1.15, 0.12), M(0xc8453a), x - 0.7, y, -0.07, false);
    put(g, box(0.38, 1.15, 0.12), M(0xc8453a), x + 0.7, y, -0.07, false);
    if (f > 0) put(g, box(w - 0.4, 0.12, 0.7), M(0x5a3a26), 0, y - 0.8, -0.35, false);          // balcony
  }
  if (r() < 0.6) put(g, box(0.7, 2.6, 0.7), M(0x8e8a84), w * 0.3, h + roofH * 0.7, d * 0.6);    // chimney
  return g;
}

export function snowPine(parent, x, z, s = 1) {
  const g = new THREE.Group();
  put(g, new THREE.CylinderGeometry(0.22, 0.32, 1.8, 7), M(0x6b4a32), 0, 0.9, 0);
  for (let i = 0; i < 3; i++) {
    put(g, new THREE.ConeGeometry(1.9 - i * 0.5, 2.4, 8), M([0x2f5a48, 0x37674f, 0x3f7357][i]), 0, 2.2 + i * 1.4, 0);
    put(g, new THREE.ConeGeometry(1.2 - i * 0.32, 1.1, 8), M(0xf4f7fd), 0, 2.95 + i * 1.4, 0, false);
  }
  g.position.set(x, 0, z); g.scale.setScalar(s); parent.add(g); return g;
}

function alpineFar(scene, map, r) {
  for (let i = 0; i < 24; i++) {                                  // jagged peaks with deep snow caps
    const a = (i / 24) * Math.PI * 2, d = 190 + r() * 70, h = 70 + r() * 70, rad = 38 + r() * 22;
    put(scene, new THREE.ConeGeometry(rad, h, 6), M(0x8c9ec4, { flatShading: true }), Math.cos(a) * d, h / 2 - 6, Math.sin(a) * d, false);
    put(scene, new THREE.ConeGeometry(rad * 0.52, h * 0.48, 6), M(0xffffff, { flatShading: true }), Math.cos(a) * d, h - h * 0.24 - 6, Math.sin(a) * d, false);
  }
  const forest = new THREE.Group();
  for (let i = 0; i < 70; i++) { const [x, z] = outside(map, r, 12, 30); snowPine(forest, x, z, 1.3 + r() * 1.1); }
  scene.add(forest); mergeStatic(forest);
  // a ski lift crossing behind the red base, chairs gliding along the cable
  const z = map.L + 26, pts = [new THREE.Vector3(-90, 26, z), new THREE.Vector3(90, 44, z)];
  scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x2a2a32 })));
  for (const x of [-60, -10, 40]) put(scene, box(0.8, 30 + (x + 90) / 9, 0.8), M(0x6a6f7a), x, (30 + (x + 90) / 9) / 2 - 2, z, false);
  const chairs = [];
  for (let i = 0; i < 8; i++) {
    const c = new THREE.Group();
    put(c, box(0.06, 2, 0.06), M(0x2a2a32), 0, -1, 0, false);
    put(c, box(1.6, 0.25, 0.9), M(0xd8453a), 0, -2.1, 0, false);
    c.userData.u = i / 8; scene.add(c); chairs.push(c);
  }
  return dt => chairs.forEach(c => { c.userData.u = (c.userData.u + dt * 0.01) % 1; c.position.lerpVectors(pts[0], pts[1], c.userData.u); });
}

// ---------- Neon Heights: night rooftops over the glowing city ----------
let winTex = null;
function windowTex() {                       // the same lit-window pattern as the main menu skyline
  if (winTex) return winTex;
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 128;
  const g = cv.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 64, 128);
  for (let y = 6; y < 124; y += 10) for (let x = 5; x < 60; x += 10) { const v = Math.random(); g.fillStyle = v < 0.42 ? (v < 0.12 ? '#9ef0ff' : '#ffd88a') : '#1a1538'; g.fillRect(x, y, 5, 6); }
  winTex = new THREE.CanvasTexture(cv); winTex.colorSpace = THREE.SRGBColorSpace; winTex.wrapS = winTex.wrapT = THREE.RepeatWrapping;
  return winTex;
}
const towerMats = {};
function towerMat(c, rx, ry) {
  const k = `${c}:${rx}:${ry}`;
  if (!towerMats[k]) { const t = windowTex().clone(); t.needsUpdate = true; t.repeat.set(rx, ry); towerMats[k] = new THREE.MeshLambertMaterial({ color: c, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.9 }); }
  return towerMats[k];
}
// the rooftop edge: a parapet wall with neon trim, and the next building over rising behind it
function neonRoof(w, r) {
  const g = new THREE.Group(), neon = [0xff5aa8, 0x5af0ff, 0x9b5cff, 0xffc93c][Math.floor(r() * 4)];
  put(g, box(w, 1.3, 0.6), M(0x2a2450), 0, 0.65, 0.3);
  put(g, box(w, 0.1, 0.62), M(neon, { emissive: neon, emissiveIntensity: 1.2 }), 0, 1.32, 0.3, false);
  const h = 6 + r() * 18, d = 7, fl = Math.max(1, Math.round(h / 3)), cols = Math.max(1, Math.round(w / 1.6));
  put(g, box(w - 0.4, h, d), towerMat([0x1a1440, 0x241a55, 0x30206a][Math.floor(r() * 3)], cols / 6, fl / 12), 0, h / 2 - 2, d / 2 + 2.5);
  if (r() < 0.4) put(g, box(w * 0.6, 1.4, 0.15), M(neon, { emissive: neon, emissiveIntensity: 1.3 }), 0, h - 0.5, 2.4, false);   // a lit sign on the roofline
  return g;
}
function neonFar(scene, map, r) {
  const g = new THREE.Group();
  // three rings of towers, taller and denser further out
  for (const [n, d0, spread, hMin, hMax, c] of [[40, 50, 30, 18, 50, 0x30206a], [50, 95, 50, 30, 90, 0x241a55], [44, 170, 70, 50, 140, 0x1a1440]]) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r() * 0.1, d = d0 + r() * spread, w = 6 + r() * 10, h = hMin + r() * (hMax - hMin);
      const x = Math.cos(a) * (d + map.W), z = Math.sin(a) * (d + map.L * 0.8);
      put(g, box(w, h, w), towerMat(c, Math.round(w / 3) / 6, Math.round(h / 4) / 12), x, h / 2 - 6, z, false);
    }
  }
  scene.add(g); mergeStatic(g);
  // neon billboards on the nearer towers, and red aircraft lights that blink
  const signs = [], lights = [];
  const words = [['MAXX', '#ff5aa8', '#ffc93c'], ['GG!', '#5af0ff', '#9b5cff'], ['NOODLES', '#ffc93c', '#ff5aa8'], ['24/7', '#9b5cff', '#5af0ff'], ['SUPER', '#ff5aa8', '#5af0ff'], ['ARCADE', '#5af0ff', '#ffc93c']];
  for (let i = 0; i < 10; i++) {
    const [text, c1, c2] = words[i % words.length];
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 160;
    const c = cv.getContext('2d');
    c.fillStyle = 'rgba(16,10,40,.9)'; c.fillRect(0, 0, 512, 160);
    c.strokeStyle = c2; c.lineWidth = 10; c.strokeRect(8, 8, 496, 144);
    c.font = 'italic 900 88px Futura, "Avenir Next", "Trebuchet MS", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.shadowColor = c1; c.shadowBlur = 24; c.fillStyle = c1; c.fillText(text, 256, 84);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(20, 6.25), new THREE.MeshBasicMaterial({ map: t, fog: false, side: THREE.DoubleSide, transparent: true }));
    const a = (i / 10) * Math.PI * 2 + 0.3, d = 70 + r() * 30;
    m.position.set(Math.cos(a) * (d + map.W), 22 + r() * 22, Math.sin(a) * (d + map.L * 0.8)); m.lookAt(0, m.position.y * 0.6, 0);
    m.userData.p = r() * 9; scene.add(m); signs.push(m);
  }
  for (let i = 0; i < 26; i++) {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff4466, fog: false, transparent: true }));
    const a = r() * Math.PI * 2, d = 90 + r() * 120;
    l.position.set(Math.cos(a) * (d + map.W), 40 + r() * 80, Math.sin(a) * (d + map.L)); l.userData.p = r() * 6; scene.add(l); lights.push(l);
  }
  return (dt, t) => {
    for (const m of signs) m.material.opacity = Math.sin(t * 9 + m.userData.p) > -0.96 ? 1 : 0.35;   // the odd flicker
    for (const l of lights) l.material.opacity = Math.sin(t * 3 + l.userData.p) > 0.6 ? 1 : 0.12;
  };
}

// ---------- Sunscorch Mesa: adobe town in a red-rock canyon ----------
function adobeHouse(w, r) {
  const g = new THREE.Group(), d = 7, h = 3.6 + r() * 3.4;
  const clay = [0xe0a070, 0xd8925e, 0xe8b084, 0xcf8a5a][Math.floor(r() * 4)];
  put(g, box(w - 0.3, h, d), M(clay), 0, h / 2, d / 2);
  put(g, box(w - 0.1, 0.5, d + 0.1), M(0xc8885a), 0, h + 0.15, d / 2);                 // parapet
  for (let k = 0; k < Math.max(2, Math.floor(w / 1.1)); k++) {                         // vigas: roof beam ends
    const b = put(g, new THREE.CylinderGeometry(0.12, 0.12, 0.8, 6), M(0x6b4a32), -w / 2 + 0.6 + k * 1.1, h - 0.4, -0.3, false); b.rotation.x = Math.PI / 2;
  }
  if (r() < 0.45) {                                                                     // a second, set-back storey
    const w2 = w * 0.55, h2 = 2.4 + r();
    put(g, box(w2, h2, d * 0.6), M(clay), (r() - 0.5) * (w - w2) * 0.6, h + h2 / 2, d * 0.65);
  }
  const cols = Math.max(1, Math.floor(w / 2.4));
  for (let c = 0; c < cols; c++) {
    const x = -w / 2 + (c + 0.5) * (w / cols);
    put(g, box(0.9, 1, 0.1), M(r() < 0.4 ? 0xffd38a : 0x3a2a2a, r() < 0.4 ? { emissive: 0xffb45a, emissiveIntensity: 0.5 } : undefined), x, Math.min(h - 1.2, 2.2), -0.05, false);
    put(g, box(1.1, 0.12, 0.16), M(0x3fb3a6), x, Math.min(h - 1.2, 2.2) - 0.6, -0.08, false);     // turquoise sill
  }
  if (r() < 0.5) {                                                                      // a striped canvas awning on posts
    const c = [0xd8453a, 0x3fb3a6, 0xffc93c][Math.floor(r() * 3)];
    for (let k = 0; k < 5; k++) { const a = put(g, box(w * 0.7 / 5, 0.06, 1.6), M(k % 2 ? 0xf2e6cc : c), -w * 0.35 + (k + 0.5) * (w * 0.7 / 5), 2.6, -0.8, false); a.rotation.x = 0.2; }
    for (const s of [-1, 1]) put(g, box(0.1, 2.6, 0.1), M(0x6b4a32), s * w * 0.34, 1.3, -1.5, false);
  }
  return g;
}
export function saguaro(parent, x, z, s = 1) {
  const g = new THREE.Group(), green = M(0x5a8a4a), h = 5;
  put(g, new THREE.CylinderGeometry(0.45, 0.55, h, 10), green, 0, h / 2, 0);
  for (const [sx, y0, len] of [[1, 2, 1.8], [-1, 2.8, 1.4]]) {
    put(g, new THREE.CylinderGeometry(0.3, 0.3, 0.9, 8), green, sx * 0.65, y0, 0).rotation.z = Math.PI / 2;
    put(g, new THREE.CylinderGeometry(0.3, 0.32, len, 8), green, sx * 1.1, y0 + len / 2, 0);
  }
  g.position.set(x, 0, z); g.scale.setScalar(s); parent.add(g); return g;
}
function desertFar(scene, map, r) {
  const g = new THREE.Group();
  for (let i = 0; i < 22; i++) {                                  // flat-topped buttes and mesas ringing the canyon
    const a = (i / 22) * Math.PI * 2 + r() * 0.1, d = 150 + r() * 90, w = 30 + r() * 40, h = 30 + r() * 45;
    const x = Math.cos(a) * (d + map.W), z = Math.sin(a) * (d + map.L * 0.6);
    let y = 0;
    for (let k = 0; k < 4; k++) {
      const bh = h / 4, sc = 1 - k * 0.07;
      put(g, new THREE.CylinderGeometry(w * 0.5 * sc * 0.96, w * 0.5 * sc, bh, 7), M([0xc4583a, 0xd8754a, 0xb84a32, 0xe0905c][k], { flatShading: true }), x, y + bh / 2 - 4, z, false);
      y += bh;
    }
  }
  for (let i = 0; i < 26; i++) {                                  // low dunes in front of them
    const a = r() * Math.PI * 2, d = 70 + r() * 70, s = 14 + r() * 20;
    const m = put(g, new THREE.SphereGeometry(s, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), M(0xe8b97e), Math.cos(a) * (d + map.W), -s * 0.75, Math.sin(a) * (d + map.L), false); m.scale.y = 0.6;
  }
  scene.add(g); mergeStatic(g);
  const cacti = new THREE.Group();
  for (let i = 0; i < 40; i++) { const [x, z] = outside(map, r, 14, 34); saguaro(cacti, x, z, 0.9 + r() * 0.9); }
  scene.add(cacti); mergeStatic(cacti);
  // a hawk wheeling slowly high over the square
  const hawk = new THREE.Group(), wing = M(0x4a3020);
  for (const s of [-1, 1]) { const wm = put(hawk, box(2.2, 0.08, 0.7), wing, s * 1.1, 0, 0, false); wm.rotation.z = s * 0.15; }
  put(hawk, box(0.35, 0.25, 1.2), wing, 0, 0, 0, false);
  scene.add(hawk);
  return (dt, t) => { const a = t * 0.12; hawk.position.set(Math.cos(a) * 46, 38 + Math.sin(t * 0.5) * 3, Math.sin(a) * 60); hawk.rotation.y = -a; hawk.rotation.z = 0.3; };
}

// ---------- Skyreach Isles: an island floating over a sea of clouds ----------
function skyFar(scene, map, r) {
  const g = new THREE.Group();
  // the rock the arena sits on, tapering away into the clouds
  const under = put(g, new THREE.ConeGeometry(Math.hypot(map.W, map.L) + 6, 60, 10), M(0x8a7a6a, { flatShading: true }), 0, -30.2, 0, false);
  under.rotation.x = Math.PI; under.scale.x = (map.W + 8) / (map.L + 8);
  put(g, new THREE.CylinderGeometry(Math.hypot(map.W, map.L) + 6, Math.hypot(map.W, map.L) + 6, 0.6, 10), M(0x8fc46a), 0, -0.32, 0, false).scale.x = (map.W + 8) / (map.L + 8);
  // the cloud sea far below
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), new THREE.MeshStandardMaterial({ color: 0xfdf2f4, roughness: 1 }));
  sea.rotation.x = -Math.PI / 2; sea.position.y = -26; g.add(sea);
  for (let i = 0; i < 70; i++) {
    const a = r() * Math.PI * 2, d = 40 + r() * 260, s = 10 + r() * 22;
    const c = put(g, new THREE.SphereGeometry(s, 12, 8), M([0xffffff, 0xfdeef2, 0xfff6ec][i % 3], { roughness: 1 }), Math.cos(a) * (d + map.W), -24 + r() * 8, Math.sin(a) * (d + map.L), false);
    c.scale.y = 0.35;
  }
  scene.add(g); mergeStatic(g);
  // other islands drifting at different heights, each with a tree or a little temple
  const isles = [];
  for (let i = 0; i < 14; i++) {
    const isle = new THREE.Group(), s = 5 + r() * 9;
    const rock = put(isle, new THREE.ConeGeometry(s, s * 1.6, 7), M(0x8a7a6a, { flatShading: true }), 0, -s * 0.8, 0, false); rock.rotation.x = Math.PI;
    put(isle, new THREE.CylinderGeometry(s, s * 0.96, 0.8, 7), M(0x8fc46a), 0, 0, 0, false);
    if (i % 2) { put(isle, new THREE.CylinderGeometry(0.4, 0.5, 3, 6), M(0x7a5a3a), 0, 1.9, 0, false); put(isle, new THREE.SphereGeometry(2.2, 10, 8), M(0xffb7c9), 0, 4.2, 0, false); }
    else for (let k = 0; k < 4; k++) put(isle, new THREE.CylinderGeometry(0.35, 0.35, 4, 8), M(0xf4f0e8), Math.cos(k * 1.57) * 2, 2.4, Math.sin(k * 1.57) * 2, false);
    const a = (i / 14) * Math.PI * 2 + r() * 0.3, d = 70 + r() * 120;
    isle.position.set(Math.cos(a) * (d + map.W), -6 + r() * 28, Math.sin(a) * (d + map.L));
    isle.userData = { y: isle.position.y, ph: r() * 6 };
    scene.add(isle); isles.push(isle);
  }
  // a hot-air balloon drifting round the island
  const bal = new THREE.Group();
  put(bal, new THREE.SphereGeometry(4, 16, 12), M(0xffc93c), 0, 6, 0, false);
  for (let k = 0; k < 6; k++) { const st = put(bal, new THREE.SphereGeometry(4.05, 16, 12, k * Math.PI / 3, 0.35), M(0xff5a36), 0, 6, 0, false); st.scale.set(1, 1, 1); }
  put(bal, box(1.6, 1.2, 1.6), M(0x8a6a4a), 0, 0, 0, false);
  scene.add(bal);
  return (dt, t) => {
    for (const s of isles) s.position.y = s.userData.y + Math.sin(t * 0.3 + s.userData.ph) * 1.5;
    const a = t * 0.03; bal.position.set(Math.cos(a) * (map.W + 70), 30 + Math.sin(t * 0.4) * 2, Math.sin(a) * (map.L + 60));
  };
}

// ---------- Tidewater Docks: a harbour town on the edge of a dusky sea ----------
function docksFar(scene, map, r) {
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), new THREE.MeshStandardMaterial({ color: 0x3a6080, roughness: 0.25, metalness: 0.2 }));
  sea.rotation.x = -Math.PI / 2; sea.position.y = -0.3; scene.add(sea);
  const quay = new THREE.Mesh(new THREE.PlaneGeometry(map.W * 2 + 30, map.L * 2 + 30), M(0x9a8a70));
  quay.rotation.x = -Math.PI / 2; quay.position.y = -0.1; scene.add(quay);
  // a lighthouse out on the rocks, its lamp sweeping round
  const lh = new THREE.Group();
  for (let i = 0; i < 6; i++) put(lh, new THREE.CylinderGeometry(2.4 - i * 0.2, 2.6 - i * 0.2, 4, 16), M(i % 2 ? 0xc8453a : 0xffffff), 0, 2 + i * 4, 0);
  put(lh, new THREE.CylinderGeometry(1.6, 1.6, 2, 12), M(0xffe9a8, { emissive: 0xffd36a, emissiveIntensity: 1.2 }), 0, 25, 0);
  put(lh, new THREE.ConeGeometry(2, 2, 12), M(0x2a3550), 0, 27, 0);
  const beam = new THREE.Mesh(new THREE.ConeGeometry(4, 60, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide }));
  beam.rotation.z = Math.PI / 2; beam.position.x = 30; const pivot = new THREE.Group(); pivot.position.y = 25; pivot.add(beam); lh.add(pivot);
  for (let k = 0; k < 6; k++) put(lh, new THREE.DodecahedronGeometry(3 + r() * 3, 0), M(0x5a5e66, { flatShading: true }), (r() - 0.5) * 14, 0, (r() - 0.5) * 14, false);
  lh.position.set(-(map.W + 60), 0, -30); scene.add(lh);
  // fishing boats bobbing at anchor
  const boats = [];
  for (let i = 0; i < 9; i++) {
    const b = new THREE.Group(), hull = [0x3f7ab8, 0xc8453a, 0x3f9a6a, 0xe8d8b8][i % 4];
    put(b, box(2.4, 1.2, 7), M(hull), 0, 0.4, 0);
    put(b, box(2.5, 0.2, 7.1), M(0xffffff), 0, 1.05, 0, false);
    put(b, box(1.6, 1.4, 2), M(0xf4f0e8), 0, 1.8, 0.8);
    put(b, new THREE.CylinderGeometry(0.08, 0.08, 5, 6), M(0x5a4030), 0, 3.5, -1.5, false);
    const [x, z] = outside(map, r, 26, 50);
    b.position.set(x, 0, z); b.rotation.y = r() * Math.PI * 2; b.userData.ph = r() * 6;
    scene.add(b); boats.push(b);
  }
  return (dt, t) => {
    pivot.rotation.y = t * 0.6;
    for (const b of boats) { b.position.y = Math.sin(t * 0.9 + b.userData.ph) * 0.25 - 0.1; b.rotation.z = Math.sin(t * 0.7 + b.userData.ph) * 0.05; }
  };
}

// ---------- Pumpkin Hollow: farmhouses and fields under an autumn sky ----------
function farmhouse(w, r) {
  const g = new THREE.Group();
  const h = 3.6 + r() * 2.4, d = 6;
  const kind = r();
  if (kind < 0.25) {                                               // a wooden fence run with a gap behind
    for (let x = -w / 2 + 0.2; x < w / 2; x += 1.6) put(g, box(0.16, 1.2, 0.16), M(0xf4ecdc), x, 0.6, 0.3);
    for (const y of [0.5, 0.95]) put(g, box(w, 0.12, 0.08), M(0xf4ecdc), 0, y, 0.3, false);
    return g;
  }
  const wall = [0xf4ecdc, 0xe8d8b8, 0xd8a868, 0xb8392e][Math.floor(r() * 4)];
  put(g, box(w - 0.3, h, d), M(wall), 0, h / 2, d / 2);
  put(g, prism(w + 0.6, 2 + w * 0.16, d + 0.6), M([0x5a3a36, 0x6a4a3a, 0x4a4a52][Math.floor(r() * 3)]), 0, h, d / 2);
  const cols = Math.max(1, Math.floor(w / 2.2));
  for (let f = 0; f < Math.floor(h / 2.2); f++) for (let c = 0; c < cols; c++) {
    const x = -w / 2 + (c + 0.5) * (w / cols), y = 1.4 + f * 2.2, lit = r() < 0.5;
    put(g, box(0.9, 1, 0.1), M(lit ? 0xffd38a : 0x2a3550, lit ? { emissive: 0xffa04a, emissiveIntensity: 0.9 } : undefined), x, y, -0.05, false);
    put(g, box(1.1, 0.12, 0.14), M(0xffffff), x, y - 0.56, -0.07, false);
  }
  if (r() < 0.5) put(g, box(0.6, 2, 0.6), M(0x9a5a3a), w * 0.25, h + 1.6, d * 0.6);
  return g;
}

function harvestFar(scene, map, r) {
  const g = new THREE.Group();
  for (let i = 0; i < 30; i++) {                                  // rolling hills in patchwork colours
    const a = (i / 30) * Math.PI * 2 + r() * 0.2, d = 120 + r() * 120, s = 40 + r() * 40;
    const m = put(g, new THREE.SphereGeometry(s, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), M([0xa8b25a, 0xd8b060, 0x8a9a4a, 0xc89a4a, 0x9aaa5a][i % 5]), Math.cos(a) * (d + map.W), -s * 0.7, Math.sin(a) * (d + map.L), false);
    m.scale.y = 0.55;
  }
  scene.add(g); mergeStatic(g);
  const trees = new THREE.Group();
  for (let i = 0; i < 55; i++) {
    const [x, z] = outside(map, r, 10, 34), s = 1.3 + r() * 1.1, t = new THREE.Group();
    put(t, new THREE.CylinderGeometry(0.25, 0.35, 2.4, 7), M(0x5a3a26), 0, 1.2, 0, false);
    const cols = [[0xd8452a, 0xe8642a], [0xf0a830, 0xe8c040], [0xe8742a, 0xd85a2a], [0x8a9a3a, 0xa8a040]][Math.floor(r() * 4)];
    for (let k = 0; k < 4; k++) put(t, new THREE.IcosahedronGeometry(1 + r() * 0.5, 0), M(cols[k % 2], { flatShading: true }), Math.cos(k * 1.6) * 0.8, 3 + r(), Math.sin(k * 1.6) * 0.8, false);
    t.position.set(x, 0, z); t.scale.setScalar(s); trees.add(t);
  }
  scene.add(trees); mergeStatic(trees);
  // a windmill on the hill behind the red base, its sails turning in the breeze
  const mill = new THREE.Group();
  put(mill, new THREE.CylinderGeometry(2.6, 3.6, 14, 8), M(0xf4ecdc), 0, 7, 0);
  put(mill, new THREE.ConeGeometry(3.2, 3.4, 8), M(0x5a3a36), 0, 15.7, 0);
  const sails = new THREE.Group(); sails.position.set(0, 13, -3.4); mill.add(sails);
  for (let k = 0; k < 4; k++) {
    const arm = new THREE.Group(); arm.rotation.z = k * Math.PI / 2; sails.add(arm);
    put(arm, box(0.3, 9, 0.2), M(0x6a4a32), 0, 4.5, 0, false);
    put(arm, box(1.8, 7, 0.08), M(0xf4ecdc), 1, 5, 0, false);
  }
  mill.position.set(-map.W - 26, 0, map.L + 30); mill.rotation.y = Math.PI * 0.8; scene.add(mill);
  // crows circling the fields
  const crows = [];
  for (let i = 0; i < 5; i++) {
    const c = new THREE.Group();
    for (const s of [-1, 1]) put(c, box(0.9, 0.05, 0.3), M(0x1a1a22), s * 0.45, 0, 0, false).rotation.z = s * 0.25;
    put(c, box(0.18, 0.18, 0.6), M(0x1a1a22), 0, 0, 0, false);
    c.userData = { ph: r() * 6, rad: 30 + r() * 30, h: 22 + r() * 10 };
    scene.add(c); crows.push(c);
  }
  return (dt, t) => {
    sails.rotation.z = t * 0.5;
    for (const c of crows) { const a = t * 0.15 + c.userData.ph; c.position.set(Math.cos(a) * c.userData.rad, c.userData.h + Math.sin(t + c.userData.ph) * 1.5, Math.sin(a) * c.userData.rad * 1.6); c.rotation.y = -a; }
  };
}

export function buildBackdrop(scene, map, theme, r) {
  const g = new THREE.Group(); scene.add(g);
  if (theme === 'desert') { ring(map, r, [5, 9], adobeHouse, g); mergeStatic(g); return desertFar(scene, map, r); }
  if (theme === 'plaza') { ring(map, r, [5, 9], plazaHouse, g); mergeStatic(g); return plazaFar(scene, map, r); }
  if (theme === 'canals') { ring(map, r, [4, 6.5], canalHouse, g); mergeStatic(g); return canalsFar(scene, map, r); }
  if (theme === 'alpine') { ring(map, r, [5, 8], chalet, g); mergeStatic(g); return alpineFar(scene, map, r); }
  if (theme === 'neon') { ring(map, r, [4, 8], neonRoof, g); mergeStatic(g); return neonFar(scene, map, r); }
  if (theme === 'sky') { ring(map, r, [4, 8], ruinWall, g); mergeStatic(g); return skyFar(scene, map, r); }
  if (theme === 'docks') { ring(map, r, [4, 6.5], canalHouse, g); mergeStatic(g); return docksFar(scene, map, r); }
  if (theme === 'harvest') { ring(map, r, [4, 8], farmhouse, g); mergeStatic(g); return harvestFar(scene, map, r); }
  ring(map, r, [4, 8], ruinWall, g); mergeStatic(g); return terracesFar(scene, map, r);
}
