import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { M, put, mergeStatic } from './scenery.js?v=20261126f';

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

export function buildBackdrop(scene, map, theme, r) {
  const g = new THREE.Group(); scene.add(g);
  if (theme === 'plaza') { ring(map, r, [5, 9], plazaHouse, g); mergeStatic(g); return plazaFar(scene, map, r); }
  if (theme === 'canals') { ring(map, r, [4, 6.5], canalHouse, g); mergeStatic(g); return canalsFar(scene, map, r); }
  if (theme === 'alpine') { ring(map, r, [5, 8], chalet, g); mergeStatic(g); return alpineFar(scene, map, r); }
  if (theme === 'neon') { ring(map, r, [4, 8], neonRoof, g); mergeStatic(g); return neonFar(scene, map, r); }
  ring(map, r, [4, 8], ruinWall, g); mergeStatic(g); return terracesFar(scene, map, r);
}
