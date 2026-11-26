import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { M, put } from './scenery.js?v=20261126w';
import { pine, blossom, snowPine } from './backdrop.js?v=20261126w';

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
  // the old ink outlines are gone: the stylised look relies on soft shading instead
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
      edges(put(g, box(w, h, d), new THREE.MeshStandardMaterial({ map: t }), 0, h / 2, 0), 0.3);
    } else {
      const t = brickTex.clone(); t.needsUpdate = true; t.repeat.set(Math.max(1, w / 1.5), h / 1.5);
      edges(put(g, box(w, h, d), new THREE.MeshStandardMaterial({ map: t }), 0, h / 2, 0), 0.15);
      put(g, box(w + 0.3, 0.3, d + 0.3), M(0xe6dfd0), 0, h + 0.1, 0);
      put(g, box(w + 0.15, 0.4, d + 0.15), M(0x5b5f66), 0, 0.2, 0, false);
    }
  } else if (theme === 'alpine') {
    if (low) {
      // stacked log wall with a snow drift on top
      edges(put(g, box(w, h, d), M(0x8a5634), 0, h / 2, 0));
      const along = w >= d, len = (along ? w : d) + 0.16;
      for (let y = 0.2; y < h - 0.1; y += 0.38) for (const s of [-1, 1]) {
        const lg = put(g, cyl(0.2, 0.2, len, 10), M(y % 0.76 < 0.38 ? 0x7b4a2e : 0x9c6a3f), along ? 0 : s * (w / 2 - 0.12), y, along ? s * (d / 2 - 0.12) : 0, false);
        lg.rotation[along ? 'z' : 'x'] = Math.PI / 2;
      }
      put(g, box(w + 0.1, 0.22, d + 0.1), M(0xf6f8fd), 0, h + 0.05, 0);
    } else {
      // a timber hut: stone base, plank walls, overhanging snowy roof
      put(g, box(w, 0.9, d), M(0xb8b4ae), 0, 0.45, 0);
      edges(put(g, box(w - 0.1, h - 0.9, d - 0.1), M([0x8a5634, 0x9c6a3f, 0x6e4228][i % 3]), 0, 0.9 + (h - 0.9) / 2, 0));
      put(g, box(w + 0.6, 0.3, d + 0.6), M(0x4a3a36), 0, h + 0.05, 0);
      put(g, box(w + 0.5, 0.28, d + 0.5), M(0xf6f8fd), 0, h + 0.3, 0);
      for (const s of [-1, 1]) put(g, box(Math.min(1.1, w * 0.4), 0.8, 0.08), M(0xffd38a, { emissive: 0xffb45a, emissiveIntensity: 0.7 }), 0, Math.min(h - 0.7, 2), s * (d / 2 + 0.01), false);
      for (let k = 0; k < Math.ceil(w); k++) put(g, new THREE.ConeGeometry(0.07, 0.45, 5), M(0xdff0ff, { roughness: 0.2 }), (r() - 0.5) * w, h - 0.15, (r() < 0.5 ? -1 : 1) * (d / 2 + 0.25), false).rotation.x = Math.PI;   // icicles
    }
  } else if (theme === 'neon') {
    const glow = c => M(c, { emissive: c, emissiveIntensity: 1.1 }), pink = 0xff5aa8, cyan = 0x5af0ff, col = [pink, cyan, 0xffc93c][i % 3];
    if (low) {
      // a rooftop AC unit: metal casing, fan grilles on top and a light strip along the base
      edges(put(g, box(w, h, d), M(0x5a6478, { metalness: 0.5, roughness: 0.45 }), 0, h / 2, 0));
      put(g, box(w + 0.05, 0.08, d + 0.05), glow(col), 0, 0.12, 0, false);
      const n = Math.max(1, Math.round(w / 1.4));
      for (let k = 0; k < n; k++) {
        const x = -w / 2 + (k + 0.5) * (w / n);
        put(g, cyl(Math.min(0.5, d * 0.32), Math.min(0.5, d * 0.32), 0.06, 16), M(0x1d2030), x, h + 0.02, 0, false);
        for (const a of [0, Math.PI / 3, -Math.PI / 3]) put(g, box(Math.min(0.9, d * 0.6), 0.03, 0.08), M(0x8a94a8, { metalness: 0.6 }), x, h + 0.06, 0, false).rotation.y = a;
      }
    } else {
      // a neon kiosk / billboard tower: dark body, glowing corner strips and a lit sign band
      edges(put(g, box(w, h, d), M([0x241a55, 0x1a1440, 0x30206a][i % 3]), 0, h / 2, 0));
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) put(g, box(0.1, h, 0.1), glow(sx * sz > 0 ? pink : cyan), sx * (w / 2), h / 2, sz * (d / 2), false);
      put(g, box(w + 0.1, 0.5, d + 0.1), glow(col), 0, h - 0.6, 0, false);
      put(g, box(w + 0.3, 0.18, d + 0.3), M(0x14102a), 0, h + 0.05, 0);
      for (let y = 0.8; y < h - 1.2; y += 0.9) for (const s of [-1, 1]) put(g, box(w * 0.7, 0.35, 0.04), M(0x9ef0ff, { emissive: 0x5ad0ff, emissiveIntensity: r() < 0.6 ? 0.8 : 0.15 }), 0, y, s * (d / 2 + 0.02), false);
    }
  } else if (theme === 'desert') {
    const adobe = [0xe0a070, 0xd8925e, 0xe8b084][i % 3];
    if (low) {
      // a low adobe wall with a terracotta cap and a couple of clay pots on top
      edges(put(g, box(w, h, d), M(adobe), 0, h / 2, 0));
      put(g, box(w + 0.16, 0.14, d + 0.16), M(0xb8583a), 0, h + 0.05, 0);
      for (let k = 0; k < Math.max(1, Math.round(w / 2.5)); k++) {
        const x = (r() - 0.5) * (w - 0.8), z = (r() - 0.5) * (d - 0.4);
        put(g, cyl(0.2, 0.14, 0.42, 10), M(0xc8653d), x, h + 0.33, z, false);
      }
    } else if (h >= 4.5) {
      // a red sandstone butte: stacked strata, each a little narrower, with a dusty cap
      const bands = [0xc4583a, 0xd8754a, 0xb84a32, 0xe0905c, 0xc96a44];
      let y = 0, k = 0;
      while (y < h - 0.01) {
        const bh = Math.min(h - y, 0.7 + r() * 0.6), shrink = 1 - (y / h) * 0.12;
        edges(put(g, box(w * shrink + (r() - 0.5) * 0.3, bh, d * shrink + (r() - 0.5) * 0.3), M(bands[k % bands.length], { flatShading: true }), (r() - 0.5) * 0.15, y + bh / 2, (r() - 0.5) * 0.15));
        y += bh; k++;
      }
      put(g, box(w * 0.86, 0.12, d * 0.86), M(0xe8b97e), 0, h + 0.04, 0, false);
      for (let k = 0; k < 4; k++) put(g, new THREE.DodecahedronGeometry(0.4 + r() * 0.4, 0), M(0xb84a32, { flatShading: true }), (r() < 0.5 ? -1 : 1) * (w / 2 + 0.2), 0.3, (r() - 0.5) * d, false);
    } else {
      // an adobe hut: rounded clay body, wooden roof beams poking out, a door and a turquoise shutter
      edges(put(g, box(w, h, d), M(adobe), 0, h / 2, 0));
      put(g, box(w + 0.1, 0.35, d + 0.1), M(0xc8885a), 0, h - 0.1, 0);
      const along = w >= d;
      for (let k = 0; k < Math.max(2, Math.round((along ? w : d) / 0.9)); k++) {
        const t = -((along ? w : d) / 2) + 0.45 + k * 0.9;
        for (const s of [-1, 1]) put(g, cyl(0.09, 0.09, 0.6, 6), M(0x6b4a32), along ? t : s * (w / 2 + 0.2), h - 0.45, along ? s * (d / 2 + 0.2) : t, false).rotation[along ? 'x' : 'z'] = Math.PI / 2;
      }
      for (const s of [-1, 1]) {
        put(g, box(Math.min(0.9, w * 0.35), Math.min(1.6, h * 0.55), 0.08), M(0x6b4a32), along ? -w * 0.18 : 0, Math.min(0.8, h * 0.28), s * (d / 2 + 0.02), false);
        put(g, box(0.6, 0.55, 0.08), M(0x3fb3a6), along ? w * 0.22 : 0, Math.min(h - 0.9, 1.6), s * (d / 2 + 0.03), false);
      }
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
  snowPine(r) { const g = new THREE.Group(); snowPine(g, 0, 0, 0.95 + r() * 0.4); return [g, [0.8, 0.8, 6]]; },
  snowman(r) {
    const g = new THREE.Group(), white = M(0xf6f8fd);
    put(g, sphere(0.62, 14, 10), white, 0, 0.55, 0); put(g, sphere(0.45, 14, 10), white, 0, 1.4, 0); put(g, sphere(0.32, 12, 9), white, 0, 2.05, 0);
    put(g, new THREE.ConeGeometry(0.07, 0.4, 8), M(0xff8a3c), 0, 2.05, -0.45, false).rotation.x = -Math.PI / 2;
    for (const s of [-1, 1]) put(g, sphere(0.05), M(0x1d2340), s * 0.11, 2.15, -0.28, false);
    put(g, cyl(0.47, 0.47, 0.14, 14), M([0xd8453a, 0x2f6fb3, 0x3ccf9a][Math.floor(r() * 3)]), 0, 1.72, 0, false);        // scarf
    put(g, cyl(0.24, 0.27, 0.36, 12), M(0x1d2340), 0, 2.42, 0, false); put(g, cyl(0.36, 0.36, 0.05, 14), M(0x1d2340), 0, 2.26, 0, false);
    for (const s of [-1, 1]) { const a = put(g, cyl(0.03, 0.04, 0.9, 5), M(0x6b4a32), s * 0.6, 1.5, 0, false); a.rotation.z = s * 1.1; }
    return [g, [1.1, 1.1, 2.6]];
  },
  antenna(r) {
    const g = new THREE.Group(), h = 4 + r() * 2;
    put(g, box(0.9, 0.3, 0.9), M(0x3a3f4a), 0, 0.15, 0);
    put(g, cyl(0.06, 0.1, h, 6), M(0x8a94a8, { metalness: 0.6 }), 0, h / 2, 0);
    for (let k = 1; k < 4; k++) put(g, box(1.4 - k * 0.3, 0.05, 0.05), M(0x8a94a8, { metalness: 0.6 }), 0, h * (0.4 + k * 0.15), 0, false);
    put(g, sphere(0.14), M(0xff4466, { emissive: 0xff4466, emissiveIntensity: 1.5 }), 0, h + 0.1, 0, false);
    return [g, [0.9, 0.9, h]];
  },
  tank(r) {
    const g = new THREE.Group();
    for (const [x, z] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) put(g, cyl(0.06, 0.06, 2, 6), M(0x3a3f4a), x, 1, z);
    put(g, cyl(1.05, 1.05, 1.9, 16), M(0x8a6a4a, { roughness: 0.9 }), 0, 2.95, 0);
    put(g, new THREE.ConeGeometry(1.15, 0.7, 16), M(0x5a4a3a), 0, 4.25, 0);
    put(g, cyl(1.07, 1.07, 0.08, 16), M(0x5af0ff, { emissive: 0x5af0ff, emissiveIntensity: 1 }), 0, 2.2, 0, false);
    return [g, [1.6, 1.6, 4.5]];
  },
  vending(r) {
    const g = new THREE.Group(), c = [0xff5aa8, 0x5af0ff, 0xffc93c][Math.floor(r() * 3)];
    put(g, box(1.1, 2, 0.8), M(0x2a2450), 0, 1, 0);
    put(g, box(0.85, 1.3, 0.04), M(0xbfe8ff, { emissive: c, emissiveIntensity: 0.7 }), -0.06, 1.2, -0.41, false);
    put(g, box(0.12, 0.5, 0.04), M(0x1d1d24), 0.43, 1, -0.41, false);
    put(g, box(1.12, 0.12, 0.82), M(c, { emissive: c, emissiveIntensity: 1 }), 0, 1.95, 0, false);
    return [g, [1.2, 0.9, 2]];
  },
  neonSign(r) {
    const g = new THREE.Group(), c = [0xff5aa8, 0x5af0ff, 0x9b5cff, 0xffc93c][Math.floor(r() * 4)];
    for (const s of [-1, 1]) put(g, box(0.08, 3, 0.08), M(0x2a2a32), s * 0.9, 1.5, 0);
    put(g, box(2.1, 1, 0.12), M(0x14102a), 0, 3, 0);
    const frame = M(c, { emissive: c, emissiveIntensity: 1.4 });
    for (const y of [-0.42, 0.42]) put(g, box(2, 0.06, 0.14), frame, 0, 3 + y, 0, false);
    for (const x of [-0.97, 0.97]) put(g, box(0.06, 0.9, 0.14), frame, x, 3, 0, false);
    for (let k = 0; k < 3; k++) put(g, box(0.36, 0.42, 0.14), frame, -0.55 + k * 0.55, 3, 0, false).rotation.z = k % 2 ? 0.6 : -0.6;
    return [g, [0.4, 0.4, 3.5]];
  },
  firewood() {
    const g = new THREE.Group();
    for (let k = 0; k < 9; k++) {
      const row = k < 4 ? 0 : k < 7 ? 1 : 2, col = k < 4 ? k : k < 7 ? k - 4 : k - 7;
      const lg = put(g, cyl(0.17, 0.17, 1.3, 9), M(k % 2 ? 0x8a5634 : 0x9c6a3f), -0.54 + col * 0.36 + row * 0.18, 0.17 + row * 0.3, 0); lg.rotation.x = Math.PI / 2;
    }
    put(g, box(1.5, 0.12, 1.4), M(0xf6f8fd), 0.02, 1.0, 0, false);
    return [g, [1.6, 1.4, 1]];
  },
  sled(r) {
    const g = new THREE.Group(), c = [0xd8453a, 0x2f6fb3, 0xffc93c][Math.floor(r() * 3)];
    put(g, box(0.8, 0.08, 1.6), M(c), 0, 0.35, 0);
    for (const s of [-1, 1]) { put(g, box(0.06, 0.06, 1.8), M(0x2a2a32), s * 0.35, 0.08, 0, false); put(g, box(0.06, 0.3, 0.06), M(0x2a2a32), s * 0.35, 0.2, 0.5, false); put(g, box(0.06, 0.3, 0.06), M(0x2a2a32), s * 0.35, 0.2, -0.5, false); }
    return [g, null];
  },
  skiRack(r) {
    const g = new THREE.Group();
    put(g, box(2.2, 0.12, 0.12), M(0x6b4a32), 0, 1.3, 0); for (const s of [-1, 1]) put(g, box(0.12, 1.4, 0.12), M(0x6b4a32), s * 1.05, 0.7, 0);
    for (let k = 0; k < 5; k++) { const sk = put(g, box(0.1, 1.8, 0.03), M([0xd8453a, 0xffc93c, 0x2f6fb3, 0x3ccf9a, 0xff4fa3][k]), -0.8 + k * 0.4, 0.9, -0.1, false); sk.rotation.x = -0.15; }
    put(g, box(2.3, 0.1, 0.4), M(0xf6f8fd), 0, 1.4, 0, false);
    return [g, [2.3, 0.5, 1.5]];
  },
  // ---- Sunscorch Mesa ----
  cactus(r) {
    const g = new THREE.Group(), green = M(r() < 0.5 ? 0x4f8a4a : 0x5f9a52), h = 2.4 + r() * 1.6;
    put(g, cyl(0.32, 0.36, h, 10), green, 0, h / 2, 0); put(g, sphere(0.32, 10, 8), green, 0, h, 0, false);
    for (const [s, y0, len] of [[1, h * 0.4, 1 + r() * 0.6], [-1, h * 0.55, 0.8 + r() * 0.5]]) {
      if (r() < 0.2) continue;
      put(g, cyl(0.2, 0.2, 0.7, 8), green, s * 0.5, y0, 0, false).rotation.z = Math.PI / 2;
      put(g, cyl(0.2, 0.22, len, 8), green, s * 0.85, y0 + len / 2, 0, false);
      put(g, sphere(0.2, 8, 6), green, s * 0.85, y0 + len, 0, false);
    }
    if (r() < 0.5) put(g, sphere(0.14), M(0xff5f8f), 0.1, h + 0.28, 0, false);            // a flower on top
    return [g, [0.8, 0.8, h]];
  },
  tumble(r) {
    const g = new THREE.Group(), s = 0.45 + r() * 0.25;
    put(g, new THREE.IcosahedronGeometry(s, 1), M(0xb08a52, { wireframe: true }), 0, s, 0, false);
    put(g, new THREE.IcosahedronGeometry(s * 0.7, 0), M(0x9a7444, { wireframe: true }), 0, s, 0, false).rotation.y = 0.6;
    return [g, null];
  },
  wagon(r) {
    const g = new THREE.Group(), wood = M(0x8a5634);
    put(g, box(1.6, 0.7, 3), wood, 0, 0.95, 0);
    put(g, box(1.7, 0.1, 3.1), M(0x6b4a32), 0, 0.6, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const wh = put(g, new THREE.TorusGeometry(0.5, 0.07, 6, 16), M(0x4a3020), sx * 0.9, 0.55, sz * 1.05); wh.rotation.y = Math.PI / 2;
      put(g, cyl(0.04, 0.04, 0.95, 5), M(0x4a3020), sx * 0.9, 0.55, sz * 1.05, false).rotation.x = Math.PI / 2;
    }
    const cover = put(g, new THREE.CylinderGeometry(0.85, 0.85, 2.6, 14, 1, true, 0, Math.PI), M(0xf2e6cc, { side: THREE.DoubleSide }), 0, 1.3, 0);
    cover.rotation.x = Math.PI / 2; cover.rotation.y = Math.PI / 2;
    put(g, box(0.1, 0.1, 1.4), wood, 0, 0.6, -2.1, false);
    return [g, [1.9, 3.2, 2.2]];
  },
  waterTower(r) {
    const g = new THREE.Group(), wood = M(0x7b4a2e);
    for (const [x, z] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]]) put(g, cyl(0.1, 0.12, 3.4, 6), wood, x, 1.7, z);
    put(g, cyl(1.25, 1.25, 1.8, 16), M(0x9c6a3f), 0, 4.3, 0);
    for (const y of [3.7, 4.9]) put(g, cyl(1.28, 1.28, 0.08, 16), M(0x3a3f4a), 0, y, 0, false);
    put(g, new THREE.ConeGeometry(1.4, 0.8, 16), M(0x6b4a32), 0, 5.6, 0);
    return [g, [1.9, 1.9, 6]];
  },
  skull() {
    const g = new THREE.Group(), bone = M(0xf2ead8);
    put(g, box(0.5, 0.35, 0.7), bone, 0, 0.18, 0, false);
    for (const s of [-1, 1]) { const hn = put(g, new THREE.ConeGeometry(0.08, 0.7, 6), bone, s * 0.45, 0.4, -0.2, false); hn.rotation.z = -s * 1.1; }
    return [g, null];
  },
  redRock(r) {
    const g = new THREE.Group(), s = 0.6 + r() * 0.7;
    const m = put(g, new THREE.DodecahedronGeometry(s, 0), M([0xc4583a, 0xd8754a, 0xb84a32][Math.floor(r() * 3)], { flatShading: true }), 0, s * 0.55, 0); m.scale.y = 0.75; m.rotation.y = r() * 3;
    return [g, [s * 1.4, s * 1.4, s * 1.1]];
  },
};

const RECIPES = {
  plaza: [['palm', 5, 0.7], ['pot', 8, 0.5], ['lamp', 5, 0.4], ['bench', 4, 1.1], ['stall', 2, 1.8, true]],
  canals: [['linden', 7, 0.7], ['bike', 6, 0.8], ['tulips', 6, 1.2], ['lamp', 6, 0.4], ['barrel', 5, 0.5]],
  terraces: [['pine', 6, 0.9], ['blossom', 7, 0.8], ['column', 8, 0.6], ['rock', 9, 0.8], ['stoneLantern', 6, 0.4]],
  alpine: [['snowPine', 9, 0.9], ['snowman', 4, 0.7], ['firewood', 4, 0.9], ['sled', 4, 0.9], ['lamp', 5, 0.4], ['skiRack', 2, 1.3, true], ['barrel', 3, 0.5]],
  neon: [['neonSign', 5, 0.5], ['vending', 5, 0.8], ['antenna', 4, 0.6], ['tank', 2, 1.4, true], ['lamp', 6, 0.4], ['barrel', 4, 0.5]],
  desert: [['cactus', 9, 0.8], ['redRock', 8, 0.8], ['barrel', 5, 0.5], ['tumble', 6, 0.6], ['skull', 3, 0.5], ['lamp', 4, 0.4], ['wagon', 2, 1.8, true], ['waterTower', 2, 1.4, true]],
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
