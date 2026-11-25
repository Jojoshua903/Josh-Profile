import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { M, put } from './scenery.js';
import { pine, blossom } from './backdrop.js';

// Themed cover blocks and scattered props inside the arena. Props are placed on the blue
// half and point-mirrored, always clear of lanes, bases, towers and cover.

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (a, b, h, s = 12) => new THREE.CylinderGeometry(a, b, h, s);
const sphere = (r, a = 8, b = 6) => new THREE.SphereGeometry(r, a, b);
const FLOWERS = [0xff5f8f, 0xffffff, 0xff9a3c, 0xffd23c, 0xc77dff];

function texOf(draw, size = 128) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  draw(cv.getContext('2d'), size);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
const brickTex = texOf((g, s) => {
  g.fillStyle = '#e6dccb'; g.fillRect(0, 0, s, s);
  for (let y = 0; y < 8; y++) for (let x = -1; x < 5; x++) {
    const c = 140 + Math.random() * 40 | 0; g.fillStyle = `rgb(${c},${c * 0.47 | 0},${c * 0.34 | 0})`;
    g.fillRect(x * 32 + (y % 2) * 16 + 1, y * 16 + 1, 30, 14);
  }
});
const crateTex = texOf((g, s) => {
  g.fillStyle = '#c99a62'; g.fillRect(0, 0, s, s);
  g.fillStyle = '#a77a48'; for (let i = 0; i < 5; i++) g.fillRect(0, i * 26 + 22, s, 3);
  g.strokeStyle = '#7d5630'; g.lineWidth = 10; g.strokeRect(5, 5, s - 10, s - 10);
  g.beginPath(); g.moveTo(8, 8); g.lineTo(s - 8, s - 8); g.stroke();
});

function edges(mesh, opacity = 0.22) {
  mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), new THREE.LineBasicMaterial({ color: 0x1d2340, transparent: true, opacity })));
  return mesh;
}

export function styleBlock(scene, theme, [x, z, w, d, h], i, r) {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  const low = h < 1.5;
  if (theme === 'plaza') {
    if (low) {
      edges(put(g, box(w, h, d), M(0xe3c9a3), 0, h / 2, 0));
      put(g, box(w - 0.3, 0.05, d - 0.3), M(0x6b4a33), 0, h + 0.01, 0, false);
      const n = Math.max(3, Math.round(w * d * 1.4));
      for (let k = 0; k < n; k++) put(g, sphere(0.16 + r() * 0.08), M(FLOWERS[k % FLOWERS.length]), (r() - 0.5) * (w - 0.5), h + 0.15, (r() - 0.5) * (d - 0.5), false);
      for (let k = 0; k < n / 2; k++) put(g, sphere(0.22), M(0x5f9e4a), (r() - 0.5) * (w - 0.5), h + 0.1, (r() - 0.5) * (d - 0.5), false);
    } else {
      edges(put(g, box(w, h, d), M(0xfbf6ec), 0, h / 2, 0));
      put(g, box(w + 0.25, 0.22, d + 0.25), M(0xd9734e), 0, h + 0.05, 0);
      put(g, box(w + 0.06, 0.28, d + 0.06), M(0x2f6fb3), 0, Math.min(1.1, h * 0.4), 0, false);
      put(g, box(w + 0.12, 0.25, d + 0.12), M(0xe3c9a3), 0, 0.12, 0, false);
    }
  } else if (theme === 'canals') {
    if (low) {
      const t = crateTex.clone(); t.needsUpdate = true; t.repeat.set(Math.max(1, Math.round(w / 1.2)), 1);
      edges(put(g, box(w, h, d), new THREE.MeshLambertMaterial({ map: t }), 0, h / 2, 0), 0.3);
    } else {
      const t = brickTex.clone(); t.needsUpdate = true; t.repeat.set(Math.max(1, w / 1.5), h / 1.5);
      edges(put(g, box(w, h, d), new THREE.MeshLambertMaterial({ map: t }), 0, h / 2, 0), 0.15);
      put(g, box(w + 0.3, 0.3, d + 0.3), M(0xe6dfd0), 0, h + 0.1, 0);
      put(g, box(w + 0.15, 0.4, d + 0.15), M(0x5b5f66), 0, 0.2, 0, false);
    }
  } else {
    const stone = [0xd8d2c4, 0xcfc8b8, 0xe0dacb][i % 3];
    edges(put(g, box(w, h, d), M(stone), 0, h / 2, 0), 0.18);
    put(g, box(w + 0.12, 0.16, d + 0.12), M(0x7aa35a), 0, h + 0.03, 0);
    for (let k = 0; k < Math.ceil(w * 0.6); k++) {
      const side = r() < 0.5 ? -1 : 1;
      put(g, box(0.35 + r() * 0.4, Math.min(h, 0.5 + r() * h * 0.6), 0.06), M(0x5f8f45), (r() - 0.5) * w, h - 0.4, side * (d / 2 + 0.03), false);
    }
  }
}

// ---------- prop builders: each returns [group, colliderSize or null] ----------
const P = {
  palm(r) {
    const g = new THREE.Group(); let y = 0, x = 0;
    for (let i = 0; i < 7; i++) { const s = put(g, cyl(0.2, 0.24, 0.9, 8), M(i % 2 ? 0x9b7650 : 0x8a6644), x, y + 0.45, 0); s.rotation.z = -0.06; x += 0.06; y += 0.85; }
    for (let i = 0; i < 7; i++) {
      const f = new THREE.Group(); f.position.set(x, y, 0); f.rotation.y = (i / 7) * Math.PI * 2; g.add(f);
      const leaf = put(f, box(0.5, 0.06, 2.6), M(i % 2 ? 0x4f9a48 : 0x5fb05a), 0, -0.3, 1.2); leaf.rotation.x = 0.45;
    }
    put(g, sphere(0.25), M(0x6b4a33), x, y - 0.2, 0);
    return [g, [0.7, 0.7, 6]];
  },
  pot(r) {
    const g = new THREE.Group();
    put(g, cyl(0.45, 0.32, 0.8, 12), M(0xc8553d), 0, 0.4, 0);
    put(g, cyl(0.5, 0.5, 0.1, 12), M(0xd9734e), 0, 0.8, 0);
    for (let k = 0; k < 6; k++) put(g, sphere(0.16), M(k % 2 ? 0x5f9e4a : FLOWERS[k % 5]), (r() - 0.5) * 0.6, 0.95 + r() * 0.2, (r() - 0.5) * 0.6, false);
    return [g, [0.9, 0.9, 0.9]];
  },
  lamp(r, glow = 0xffe1a0) {
    const g = new THREE.Group();
    put(g, cyl(0.08, 0.12, 3.6, 8), M(0x2a3550), 0, 1.8, 0);
    put(g, box(0.6, 0.06, 0.06), M(0x2a3550), 0.25, 3.5, 0);
    put(g, box(0.28, 0.4, 0.28), M(glow, { emissive: glow, emissiveIntensity: 0.8 }), 0.5, 3.25, 0, false);
    put(g, new THREE.ConeGeometry(0.26, 0.2, 4), M(0x2a3550), 0.5, 3.52, 0).rotation.y = Math.PI / 4;
    return [g, [0.35, 0.35, 4]];
  },
  bench() {
    const g = new THREE.Group();
    put(g, box(1.8, 0.08, 0.5), M(0x9b7650), 0, 0.5, 0);
    put(g, box(1.8, 0.4, 0.06), M(0x9b7650), 0, 0.8, 0.24);
    for (const s of [-1, 1]) put(g, box(0.06, 0.5, 0.5), M(0x2a3550), s * 0.8, 0.25, 0);
    return [g, null];
  },
  stall(r) {
    const g = new THREE.Group(); const c = [0xd9734e, 0x2f6fb3, 0x3f9b8f][Math.floor(r() * 3)];
    put(g, box(2.8, 1, 1.6), M(0x9b7650), 0, 0.5, 0);
    for (let k = 0; k < 8; k++) put(g, sphere(0.16), M([0xff9a3c, 0xffd23c, 0xd8475e, 0x7fb069][k % 4]), -1.1 + k * 0.3, 1.1, (r() - 0.5) * 0.8, false);
    for (const s of [-1, 1]) put(g, cyl(0.05, 0.05, 2.6, 6), M(0x2a3550), s * 1.35, 1.3, -0.75);
    for (let k = 0; k < 7; k++) { const a = put(g, box(0.45, 0.06, 2), M(k % 2 ? 0xffffff : c), -1.35 + k * 0.45, 2.55, 0, false); a.rotation.x = -0.25; }
    return [g, [3, 1.8, 2.6]];
  },
  linden(r) {
    const g = new THREE.Group();
    put(g, cyl(0.2, 0.3, 2.4, 8), M(0x6b5a4a), 0, 1.2, 0);
    for (let k = 0; k < 4; k++) put(g, new THREE.IcosahedronGeometry(1.1 + r() * 0.5, 1), M([0x7fb069, 0x6c9e5a, 0x8cc072][k % 3], { flatShading: true }), (r() - 0.5) * 1.4, 3 + r() * 1.4, (r() - 0.5) * 1.4);
    return [g, [0.6, 0.6, 5]];
  },
  bike(r) {
    const g = new THREE.Group(); const c = [0x2f6fb3, 0xd8475e, 0x1d2340, 0xf2a03c][Math.floor(r() * 4)];
    for (const s of [-1, 1]) put(g, new THREE.TorusGeometry(0.33, 0.035, 6, 18), M(0x1d2340), 0, 0.36, s * 0.55).rotation.y = Math.PI / 2;
    const f1 = put(g, box(0.05, 0.05, 1.0), M(c), 0, 0.62, 0); f1.rotation.x = 0.1;
    put(g, box(0.05, 0.5, 0.05), M(c), 0, 0.5, -0.1);
    put(g, box(0.5, 0.04, 0.04), M(0x1d2340), 0, 0.9, 0.5);
    put(g, box(0.3, 0.2, 0.3), M(0x9b7650), 0, 0.85, 0.7, false);   // basket
    put(g, sphere(0.1), M(0xff5f8f), 0, 1.0, 0.7, false);
    g.rotation.z = 0.12;
    return [g, null];
  },
  tulips(r) {
    const g = new THREE.Group();
    put(g, box(2.2, 0.2, 1.2), M(0x6b4a33), 0, 0.1, 0);
    const c = [0xd8475e, 0xffd23c, 0xf28fb0, 0xf2a03c][Math.floor(r() * 4)];
    for (let k = 0; k < 18; k++) {
      const x = -0.95 + (k % 6) * 0.38, z = -0.4 + Math.floor(k / 6) * 0.4;
      put(g, cyl(0.015, 0.015, 0.4, 4), M(0x5f9e4a), x, 0.4, z, false);
      put(g, new THREE.ConeGeometry(0.09, 0.2, 6), M(c), x, 0.65, z, false).rotation.x = Math.PI;
    }
    return [g, null];
  },
  barrel() {
    const g = new THREE.Group();
    put(g, cyl(0.42, 0.42, 1, 12), M(0x9b7650), 0, 0.5, 0);
    for (const y of [0.2, 0.8]) put(g, cyl(0.44, 0.44, 0.06, 12), M(0x2a3550), 0, y, 0);
    return [g, [0.85, 0.85, 1]];
  },
  pine(r) { const g = new THREE.Group(); pine(g, 0, 0, 1 + r() * 0.4); return [g, [0.8, 0.8, 6]]; },
  blossom(r) { const g = new THREE.Group(); blossom(g, 0, 0, 0.9 + r() * 0.3, r); return [g, [0.7, 0.7, 5]]; },
  column(r) {
    const g = new THREE.Group(); const h = 1 + r() * 2.8;
    put(g, box(1.1, 0.3, 1.1), M(0xcfc8b8), 0, 0.15, 0);
    const c = put(g, cyl(0.38, 0.42, h, 10), M(0xe0dacb), 0, 0.3 + h / 2, 0); c.rotation.z = (r() - 0.5) * 0.08;
    put(g, cyl(0.39, 0.39, 0.12, 10), M(0x7aa35a), 0, 0.3 + h, 0, false);
    return [g, [0.9, 0.9, h + 0.3]];
  },
  rock(r) {
    const g = new THREE.Group(); const s = 0.6 + r() * 0.6;
    const m = put(g, new THREE.DodecahedronGeometry(s, 0), M(0xb9b3a6, { flatShading: true }), 0, s * 0.5, 0); m.scale.y = 0.7; m.rotation.y = r() * 3;
    put(g, sphere(s * 0.5), M(0x7aa35a), s * 0.2, s * 0.85, 0, false).scale.y = 0.4;
    return [g, [s * 1.4, s * 1.4, s * 1.1]];
  },
  stoneLantern() {
    const g = new THREE.Group();
    put(g, box(0.7, 0.2, 0.7), M(0xcfc8b8), 0, 0.1, 0);
    put(g, cyl(0.12, 0.16, 0.8, 6), M(0xcfc8b8), 0, 0.6, 0);
    put(g, box(0.55, 0.4, 0.55), M(0xffd36a, { emissive: 0xffb84a, emissiveIntensity: 0.7 }), 0, 1.2, 0, false);
    put(g, new THREE.ConeGeometry(0.55, 0.35, 4), M(0xb9b3a6), 0, 1.58, 0).rotation.y = Math.PI / 4;
    return [g, [0.6, 0.6, 1.6]];
  },
};

const RECIPES = {
  plaza: [['palm', 5, 0.7], ['pot', 8, 0.5], ['lamp', 5, 0.4], ['bench', 4, 1.1], ['stall', 2, 1.8, true]],
  canals: [['linden', 7, 0.7], ['bike', 6, 0.8], ['tulips', 6, 1.2], ['lamp', 6, 0.4], ['barrel', 5, 0.5]],
  terraces: [['pine', 6, 0.9], ['blossom', 7, 0.8], ['column', 8, 0.6], ['rock', 9, 0.8], ['stoneLantern', 6, 0.4]],
};

function segDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2));
  return Math.hypot(px - ax - t * dx, pz - az - t * dz);
}

export function scatterProps(scene, map, theme, blocks, towers, r) {
  const placed = [], colliders = [];
  const free = (x, z, rad) => {
    if (Math.abs(x) > map.W - rad - 0.6 || Math.abs(z) > map.L - rad - 0.6) return false;
    if (theme === "canals" && (Math.abs(x) > map.W - 5.5 - rad || (Math.abs(x) < 3.4 + rad && Math.abs(z) < 41))) return false;
    for (const lane of map.lanes) for (let i = 0; i < lane.length - 1; i++)
      if (segDist(x, z, ...lane[i], ...lane[i + 1]) < 3.2 + rad) return false;
    if (!map.survivor) for (const s of [-1, 1]) { if (Math.hypot(x, z - s * (map.L - 5)) < 10 + rad || Math.hypot(x, z - s * (map.L - 11)) < 5 + rad) return false; }
    for (const [tx, tz] of towers) if (Math.hypot(x - tx, z - tz) < 3 + rad) return false;
    for (const [bx, bz, bw, bd] of blocks) if (Math.abs(x - bx) < bw / 2 + rad + 1.3 && Math.abs(z - bz) < bd / 2 + rad + 1.3) return false;
    for (const p of placed) if (Math.hypot(x - p[0], z - p[1]) < rad + p[2] + 0.8) return false;
    return Math.abs(x) > 0.5 || Math.abs(z) > 0.5;
  };
  const place = (type, x, z, rot, rad) => {
    for (const [px, pz, prot] of [[x, z, rot], [-x, -z, rot + Math.PI]]) {
      const [g, col] = P[type](r);
      g.position.set(px, 0, pz); g.rotation.y = prot; scene.add(g);
      g.traverse(o => { if (o.isMesh) o.castShadow = true; });
      placed.push([px, pz, rad]);
      if (col) colliders.push([px, pz, col[0], col[1], col[2]]);
    }
  };
  for (const [type, n0, rad, edge] of RECIPES[theme]) {
    const n = Math.round(n0 * (map.propScale || 1));
    let made = 0;
    for (let tries = 0; tries < 220 * (map.propScale || 1) && made < n; tries++) {
      const x = edge ? (r() < 0.5 ? -1 : 1) * (map.W - rad - 0.8) : (r() * 2 - 1) * (map.W - 1);
      const z = -2 - r() * (map.L - 8);
      if (!free(x, z, rad)) continue;
      const rot = edge ? (x < 0 ? Math.PI / 2 : -Math.PI / 2) : r() * Math.PI * 2;
      place(type, x, z, rot, rad); made++;
    }
  }
  return colliders;
}

// Gateways that straddle a lane: a landmark that also reads from the minimap.
export function laneGates(scene, map, theme) {
  const colliders = [];
  const spots = { plaza: [[0, -20]], canals: [], terraces: [[0, -20], [-30, -10], [30, -10]] }[theme] || [];
  for (const [cx, cz] of spots) for (const [x, z] of [[cx, cz], [-cx, -cz]]) {
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    const col = theme === 'plaza' ? 0xfbf6ec : 0xc8453a;
    for (const s of [-1, 1]) {
      put(g, box(0.8, 5.2, 0.8), M(col), s * 3.3, 2.6, 0);
      colliders.push([x + s * 3.3, z, 0.8, 0.8, 5.2]);
    }
    if (theme === 'plaza') {
      put(g, box(7.6, 0.8, 1), M(0xfbf6ec), 0, 5.4, 0);
      put(g, box(7.9, 0.25, 1.2), M(0xd9734e), 0, 5.9, 0);
      for (let k = 0; k < 9; k++) put(g, sphere(0.2), M(FLOWERS[k % 5]), -3.2 + k * 0.8, 6.1, 0, false);
    } else {
      put(g, box(8.6, 0.45, 0.9), M(0x2a2a2a), 0, 5.6, 0);
      const top = put(g, box(9.4, 0.35, 1.1), M(col), 0, 6.0, 0); top.scale.x = 1;
      put(g, box(7, 0.3, 0.6), M(col), 0, 4.6, 0);
    }
  }
  return colliders;
}
