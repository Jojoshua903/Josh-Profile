// 3D character models. Every model faces -Z (back to the gameplay camera); origin sits at chest height.
import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { M, glow } from './models.js';

const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const S = (r, a = 14, b = 10) => new THREE.SphereGeometry(r, a, b);
const C = (rt, rb, h, s = 10) => new THREE.CylinderGeometry(rt, rb, h, s);
const K = (r, h, s = 10) => new THREE.ConeGeometry(r, h, s);
const T = (r, t, a = 8, b = 20, arc) => new THREE.TorusGeometry(r, t, a, b, arc);
function add(p, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sc) {
  const m = new THREE.Mesh(geo, typeof mat === 'number' ? M(mat) : mat);
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz); if (sc) m.scale.set(...sc); p.add(m); return m;
}
const grp = (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; };

const symTex = {};
export function symbolSprite(ch, color = '#2a9d8f', size = 0.7) {
  if (!symTex[ch + color]) {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    g.font = 'bold 96px "Iowan Old Style", Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 10; g.strokeStyle = '#fff6e4'; g.strokeText(ch, 64, 70); g.fillStyle = color; g.fillText(ch, 64, 70);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; symTex[ch + color] = t;
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: symTex[ch + color], transparent: true, depthWrite: false }));
  s.scale.setScalar(size); return s;
}

/* ---------- Building blocks ---------- */
function hair(head, style, col) {
  if (style === 'none' || !style) return;
  add(head, new THREE.SphereGeometry(0.47, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.42), col, 0, 0.04, 0.04);
  if (style === 'spiky') for (let i = 0; i < 7; i++) add(head, K(0.11, 0.38, 5), col, Math.cos(i) * 0.24, 0.42, Math.sin(i * 1.3) * 0.24, Math.sin(i) * 0.5, 0, Math.cos(i) * 0.5);
  if (style === 'bun') { add(head, S(0.24), col, 0, 0.3, 0.34); add(head, T(0.2, 0.04), 0xc2185b, 0, 0.3, 0.3, 0.6); }
  if (style === 'long') add(head, B(0.86, 0.8, 0.22), col, 0, -0.25, 0.3);
  if (style === 'messy') for (let i = 0; i < 6; i++) add(head, S(0.16, 8, 6), col, Math.cos(i * 1.1) * 0.3, 0.36 + Math.sin(i * 2) * 0.05, Math.sin(i * 1.1) * 0.3);
  add(head, B(0.84, 0.5, 0.2), col, 0, 0.05, 0.32);
}
function face(head, o = {}) {
  const eye = o.eye ?? 0x111111;
  for (const sx of [-1, 1]) {
    add(head, S(0.075, 8, 6), 0xffffff, sx * 0.16, 0.06, -0.39);
    add(head, S(0.045, 8, 6), eye, sx * 0.16, 0.06, -0.45);
    add(head, B(0.16, 0.035, 0.03), o.brow ?? 0x2b1d14, sx * 0.16, 0.18, -0.42, 0, 0, sx * (o.angry ? 0.35 : -0.1));
  }
  add(head, S(0.07, 6, 6), o.skin, 0, -0.03, -0.45);
  add(head, B(o.wide ? 0.28 : 0.18, 0.045, 0.04), o.mouth ?? 0x8c2f39, 0, -0.17, -0.41);
}
function capHat(head, col, backwards) {
  add(head, new THREE.SphereGeometry(0.49, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), col, 0, 0.06, 0);
  add(head, B(0.5, 0.05, 0.38), col, 0, 0.12, backwards ? 0.5 : -0.5, backwards ? -0.12 : 0.12);
  add(head, S(0.05, 6, 6), 0xffffff, 0, 0.55, 0);
}
function wizardHat(head, col, trim, zig) {
  add(head, C(0.78, 0.78, 0.06, 20), col, 0, 0.3, 0);
  const h = add(head, K(0.42, 1.3, 14), col, 0, 0.95, 0.12, 0.25);
  add(head, T(0.42, 0.05, 6, 20), trim, 0, 0.36, 0, Math.PI / 2);
  if (zig) for (let i = 0; i < 3; i++) add(h, B(0.1, 0.32, 0.04), trim, 0.18 * (i % 2 ? 1 : -1) * 0.5, -0.25 + i * 0.28, 0.32 - i * 0.07, 0, 0, i % 2 ? 0.6 : -0.6);
  else for (let i = 0; i < 3; i++) add(head, S(0.06, 6, 4), trim, Math.cos(i * 2) * 0.3, 0.7 + i * 0.2, 0.3 - i * 0.05);
}
function glasses(head, col = 0x1b1b1b) {
  for (const sx of [-1, 1]) add(head, T(0.11, 0.025, 6, 16), col, sx * 0.16, 0.06, -0.46);
  add(head, B(0.1, 0.025, 0.02), col, 0, 0.08, -0.47);
}
function hoverboard(root, col, y = -1.45) {
  const b = grp(root, 0, y, 0.1);
  add(b, C(0.7, 0.62, 0.14, 20), M(col, { metalness: 0.4 }), 0, 0, 0, 0, 0, 0, [1, 1, 1.9]);
  add(b, C(0.72, 0.72, 0.04, 20), 0xfff6e4, 0, 0.09, 0, 0, 0, 0, [1, 1, 1.9]);
  add(b, T(0.6, 0.08, 6, 24), glow(0x9fd8ff, 0.55), 0, -0.12, 0, Math.PI / 2, 0, 0, [1, 1.9, 1]);
  const f = add(b, K(0.3, 1.4, 8), glow(0x7fd8ff, 0.9), 0, 0, 1.8, Math.PI / 2);
  root.userData.flame = f; return b;
}
function magicDisc(root, col, y = -1.5) {
  const d = grp(root, 0, y, 0);
  add(d, new THREE.CircleGeometry(1.0, 32), glow(col, 0.45), 0, 0, 0, -Math.PI / 2);
  add(d, T(1.0, 0.05, 6, 32), glow(col, 0.95), 0, 0, 0, Math.PI / 2);
  add(d, T(0.65, 0.03, 6, 32), glow(0xffffff, 0.8), 0, 0.02, 0, Math.PI / 2);
  const f = add(d, K(0.4, 1.2, 8), glow(col, 0.6), 0, -0.2, 1.0, Math.PI / 2);
  root.userData.flame = f; root.userData.disc = d; return d;
}
function jet(root, col, y = 0, z = 1.0, r = 0.35) {
  const f = add(root, K(r, 1.3, 8), glow(col, 0.85), 0, y, z, Math.PI / 2); root.userData.flame = f;
}

function humanoid(o) {
  const s = o.scale || 1, w = o.wide || 1;
  const root = new THREE.Group(), body = grp(root, 0, -1.3, 0);
  const skin = M(o.skin), shirt = M(o.shirt), pants = M(o.pants), shoes = M(o.shoes ?? 0x222222);
  const legs = [];
  if (!o.robe) for (const sx of [-1, 1]) {
    const leg = grp(body, sx * 0.22 * w, 1.0, 0);
    add(leg, B(0.32 * w, 0.92, 0.34), pants, 0, -0.46, 0);
    add(leg, B(0.36 * w, 0.2, 0.52), shoes, 0, -0.95, -0.07); legs.push(leg);
  } else {
    add(body, C(0.52 * w, 0.85 * w, 1.25, 16), M(o.robe), 0, 0.55, 0);
    add(body, T(0.84 * w, 0.06, 6, 24), o.trim ?? 0xffffff, 0, -0.05, 0, Math.PI / 2);
  }
  add(body, B(0.86 * w, 0.32, 0.46), o.robe ? M(o.robe) : pants, 0, 1.05, 0);
  const torso = add(body, B(0.92 * w, 0.95, 0.5), shirt, 0, 1.65, 0);
  const head = grp(body, 0, 2.48, 0);
  add(head, S(0.45, 18, 14), skin);
  for (const sx of [-1, 1]) add(head, S(0.1, 8, 6), skin, sx * 0.45, 0, 0);
  if (!o.noFace) face(head, { ...o.face, skin: skin });
  hair(head, o.hair, o.hairCol ?? 0x2b1d14);
  const arms = [];
  for (const sx of [-1, 1]) {
    const arm = grp(body, sx * (0.46 * w + 0.14), 2.0, 0);
    add(arm, B(0.25, 0.6, 0.27), shirt, 0, -0.3, 0);
    add(arm, B(0.22, 0.42, 0.24), o.longSleeve ? shirt : skin, 0, -0.76, 0);
    const hand = grp(arm, 0, -1.02, 0); add(hand, S(0.15, 8, 6), o.gloves ? M(o.gloves) : skin);
    arm.userData.hand = hand; arms.push(arm);
  }
  arms[0].rotation.z = -0.25; arms[1].rotation.z = 0.25;
  body.rotation.x = -0.18;
  root.scale.setScalar(s);
  root.userData = { arms, head, body, torso, legs, rest: [0.15, 0.15] };
  return root;
}

/* ---------- Roster ---------- */
const BUILD = {
  nathan() {
    const r = humanoid({ skin: 0xf1c27d, shirt: 0xe63946, pants: 0xf4f1ea, shoes: 0x111111, hair: 'short', hairCol: 0x3b2a1a, face: { wide: true } });
    const u = r.userData;
    add(u.torso, B(0.42, 0.5, 0.02), 0xfff6e4, 0, 0.05, 0.26); add(u.torso, B(0.1, 0.34, 0.03), 0xe63946, 0, 0.05, 0.27);
    add(u.torso, B(0.94, 0.08, 0.52), 0xffffff, 0, 0.42, 0);
    capHat(u.head, 0xe63946);
    const bat = grp(u.arms[1].userData.hand, 0, 0, 0); bat.rotation.x = 0.45;
    add(bat, C(0.13, 0.06, 1.55, 10), 0xc68642, 0, 0.8, 0); add(bat, C(0.08, 0.08, 0.1, 8), 0x111111, 0, 0.05, 0);
    u.arms[1].rotation.x = 0.35; u.rest = [0.15, 0.35];
    hoverboard(r, 0xe63946); return r;
  },
  adam() {
    const r = humanoid({ skin: 0xe0ac69, shirt: 0xffffff, pants: 0x2a9d8f, shoes: 0xffffff, hair: 'messy', hairCol: 0x6b4423 });
    const u = r.userData;
    add(u.head, T(0.46, 0.06, 6, 24), 0xff006e, 0, 0.2, 0, Math.PI / 2);
    add(u.torso, B(0.94, 0.12, 0.52), 0x2a9d8f, 0, 0.35, 0);
    const rk = grp(u.arms[1].userData.hand, 0, 0, 0); rk.rotation.x = 0.3;
    add(rk, C(0.05, 0.05, 0.55, 8), 0x1b1b1b, 0, 0.3, 0);
    add(rk, T(0.33, 0.045, 6, 22), 0xff006e, 0, 0.92, 0, 0, Math.PI / 2, 0, [1, 1.25, 1]);
    add(rk, new THREE.CircleGeometry(0.31, 20), glow(0xfff6e4, 0.5), 0, 0.92, 0, 0, Math.PI / 2, 0, [1, 1.25, 1]);
    add(u.arms[0].userData.hand, S(0.14), 0xd4ff3a, 0, -0.05, 0);
    hoverboard(r, 0x9bc53d); return r;
  },
  ash() {
    const r = humanoid({ skin: 0xf1c27d, shirt: 0x3a86ff, pants: 0xf4f1ea, shoes: 0x111111, hair: 'short', hairCol: 0x1b1b1b, scale: 0.86 });
    const u = r.userData;
    add(u.torso, B(0.42, 0.5, 0.02), 0xfff6e4, 0, 0.05, 0.26); add(u.torso, B(0.26, 0.08, 0.03), 0x3a86ff, 0, 0.12, 0.27);
    capHat(u.head, 0x3a86ff, true);
    add(u.arms[0].userData.hand, S(0.3, 10, 8), 0x8b4513, 0, 0, -0.05, 0, 0, 0, [1, 1.1, 0.7]);
    const ball = add(u.arms[1].userData.hand, S(0.14), 0xffffff, 0, -0.05, 0); add(ball, T(0.14, 0.012, 4, 16), 0xe63946, 0, 0, 0, 0, Math.PI / 2);
    hoverboard(r, 0x3a86ff); return r;
  },
  ati() {
    const r = humanoid({ skin: 0xd9a066, shirt: 0x9d0208, pants: 0x6a040f, shoes: 0xff8fab, hair: 'bun', hairCol: 0x2b1d14, longSleeve: true, face: { angry: true } });
    const u = r.userData;
    add(u.body, C(0.5, 0.78, 0.95, 16), 0x6a040f, 0, 0.75, 0);
    glasses(u.head, 0x3d0a0a);
    for (let i = 0; i < 5; i++) add(u.torso, S(0.035, 6, 4), 0xfff6e4, 0, 0.35 - i * 0.16, -0.26);
    const sl = grp(u.arms[1].userData.hand, 0, 0, 0); sl.rotation.x = -0.4;
    add(sl, B(0.3, 0.08, 0.72), 0xff8fab, 0, 0.12, -0.2); add(sl, B(0.32, 0.14, 0.2), 0xffffff, 0, 0.2, -0.35);
    add(sl, S(0.12, 8, 6), 0xffffff, 0, 0.26, -0.38);
    u.arms[1].rotation.x = 2.7; u.rest = [0.15, 2.7];
    hoverboard(r, 0xc2185b); return r;
  },
  daniel() {
    const r = humanoid({ skin: 0xc68642, shirt: 0xf77f00, pants: 0x1d3557, shoes: 0x3e2723, hair: 'none' });
    const u = r.userData;
    add(u.head, new THREE.SphereGeometry(0.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0xffd60a, 0, 0.1, 0);
    add(u.head, C(0.62, 0.62, 0.05, 20), 0xffd60a, 0, 0.12, 0); add(u.head, B(0.08, 0.15, 0.95), 0xffc300, 0, 0.55, 0);
    for (const y of [0.15, -0.2]) add(u.torso, B(0.95, 0.07, 0.53), 0xe8e8e8, 0, y, 0);
    for (let i = 0; i < 4; i++) { const b = add(u.torso, S(0.11, 8, 6), 0x1b1b1b, -0.32 + i * 0.21, 0.35 - i * 0.2, -0.28); add(b, C(0.015, 0.015, 0.1, 4), 0xc68642, 0, 0.12, 0); }
    const bomb = add(u.arms[1].userData.hand, S(0.3, 12, 10), 0x1b1b1b, 0, 0.15, 0);
    add(bomb, C(0.03, 0.03, 0.25, 4), 0xc68642, 0, 0.36, 0);
    u.spark = add(bomb, S(0.09, 8, 6), glow(0xffd23f), 0, 0.5, 0);
    hoverboard(r, 0xf77f00); return r;
  },
  dean() {
    const r = humanoid({ skin: 0x8d5524, shirt: 0x7b2cbf, pants: 0x111111, shoes: 0xffffff, hair: 'short', hairCol: 0x111111, longSleeve: true });
    const u = r.userData;
    capHat(u.head, 0x5a189a, true);
    add(u.head, T(0.5, 0.05, 6, 20, Math.PI), 0x111111, 0, 0.05, 0);
    for (const sx of [-1, 1]) add(u.head, C(0.17, 0.17, 0.14, 12), 0x00f5d4, sx * 0.5, 0.02, 0, 0, 0, Math.PI / 2);
    add(u.torso, B(0.5, 0.38, 0.12), 0x5a189a, 0, 0.35, 0.3);
    const pad = add(u.arms[1].userData.hand, B(0.42, 0.09, 0.25), 0x2b2d42, 0, 0, -0.05);
    [[0.12, 0xff006e], [0.18, 0x00f5d4], [-0.14, 0xffbe0b]].forEach(([x, c]) => add(pad, S(0.035, 6, 4), glow(c), x, 0.05, 0));
    hoverboard(r, 0x00f5d4); return r;
  },
  deniz() {
    const r = humanoid({ skin: 0xf1c27d, shirt: 0x4cc9f0, pants: 0x4cc9f0, robe: 0x1e6091, trim: 0xe0fbff, hair: 'short', hairCol: 0x1b1b1b, longSleeve: true, face: { brow: 0x1b1b1b } });
    const u = r.userData;
    wizardHat(u.head, 0x1e6091, 0xe0fbff);
    const st = grp(u.arms[1].userData.hand, 0, 0, 0);
    add(st, C(0.05, 0.05, 2.5, 6), 0xe0fbff, 0, 0.4, 0);
    u.orb = add(st, new THREE.OctahedronGeometry(0.28, 0), glow(0x9be7ff), 0, 1.75, 0, 0, 0, 0, [1, 1.6, 1]);
    for (let i = 0; i < 3; i++) add(st, new THREE.OctahedronGeometry(0.08, 0), glow(0xffffff), Math.cos(i * 2) * 0.3, 1.75, Math.sin(i * 2) * 0.3);
    magicDisc(r, 0x4cc9f0); return r;
  },
  dih() {
    const r = new THREE.Group(), segs = [];
    for (let i = 0; i < 7; i++) {
      const rad = 0.24 + i * 0.03;
      const s = add(r, S(rad, 12, 10), i === 3 ? 0xff5c8a : 0xff8fab, 0, -1.2 + i * 0.32, 0.1 * Math.sin(i));
      segs.push(s);
    }
    const head = segs[6];
    add(head, S(0.15, 10, 8), 0xffffff, -0.15, 0.1, -0.3); add(head, S(0.08, 8, 6), 0x111111, -0.15, 0.1, -0.42);
    add(head, B(0.2, 0.04, 0.04), 0x111111, 0.15, 0.1, -0.38, 0, 0, -0.2);
    add(head, T(0.16, 0.035, 6, 14, Math.PI), 0x8c2f39, 0, -0.08, -0.36, 0, 0, Math.PI);
    add(head, B(0.1, 0.06, 0.14), 0xff3d7f, 0.04, -0.2, -0.38, 0.4);
    for (let i = 0; i < 3; i++) add(segs[i * 2], T(0.26 + i * 0.06, 0.02, 4, 16), 0xe76f8c, 0, 0, 0, Math.PI / 2);
    jet(r, 0xff8fab, -1.4, 0.4, 0.22);
    Object.assign(r.userData, { segs, wiggle: true, arms: [], small: true });
    return r;
  },
  enno() {
    const r = humanoid({ skin: 0xffdbc4, shirt: 0xf8f9fa, pants: 0x264653, shoes: 0x3e2723, hair: 'messy', hairCol: 0x8b5a2b, longSleeve: true });
    const u = r.userData;
    glasses(u.head);
    add(u.body, B(0.95, 0.75, 0.06), 0xf8f9fa, 0, 0.85, 0.27);
    add(u.torso, B(0.3, 0.6, 0.02), 0x2a9d8f, 0, 0.05, -0.26);
    add(u.torso, B(0.06, 0.2, 0.03), 0xe63946, 0.3, 0.2, -0.27);
    add(u.arms[0].userData.hand, B(0.38, 0.48, 0.1), 0x2a9d8f, 0, 0.05, -0.05);
    u.syms = ['π', 'Σ', '∫', '√', '∞', '='].map((ch, i) => { const s = symbolSprite(ch, '#2a9d8f', 0.55); r.add(s); s.userData.i = i; return s; });
    hoverboard(r, 0x2a9d8f); return r;
  },
  fionn() {
    const r = humanoid({ skin: 0xffdbc4, shirt: 0x2d6a4f, pants: 0x7f5539, shoes: 0x3e2723, hair: 'short', hairCol: 0xc1440e, longSleeve: true });
    const u = r.userData;
    add(u.head, C(0.5, 0.5, 0.12, 18), 0x6b705c, 0, 0.36, 0.02); add(u.head, B(0.56, 0.06, 0.3), 0x6b705c, 0, 0.32, -0.42, 0.15);
    add(u.head, S(0.36, 12, 10), 0xc1440e, 0, -0.22, -0.18, 0, 0, 0, [1, 0.9, 0.8]);
    add(u.head, B(0.24, 0.05, 0.05), 0x8c2f39, 0, -0.14, -0.47);
    add(u.torso, B(0.7, 0.8, 0.36), 0x8b5e34, 0, -0.05, 0.42); add(u.torso, B(0.72, 0.22, 0.38), 0x6f4518, 0, 0.3, 0.42);
    const hm = grp(u.torso, 0.28, 0.4, 0.62); add(hm, C(0.04, 0.04, 0.8, 6), 0x8b5e34, 0, 0, 0, 0, 0, 0.4); add(hm, B(0.32, 0.1, 0.1), 0x8d99ae, 0.15, 0.36, 0, 0, 0, 0.4);
    add(u.arms[1].userData.hand, new THREE.DodecahedronGeometry(0.3, 0), 0x8d8d8d, 0, 0.1, 0);
    hoverboard(r, 0x40916c); return r;
  },
  guiseppe() {
    const r = new THREE.Group();
    const apple = add(r, S(0.85, 22, 18), M(0xd62828, { roughness: 0.25, metalness: 0.1 }), 0, 0, 0, 0, 0, 0, [1.05, 0.95, 1.05]);
    add(r, S(0.25, 10, 8), 0xff6b6b, -0.35, 0.3, -0.6, 0, 0, 0, [1, 0.7, 0.4]);
    add(r, C(0.05, 0.08, 0.4, 6), 0x6b4423, 0, 0.92, 0, 0, 0, 0.2);
    add(r, S(0.32, 10, 6), 0x52b788, 0.25, 0.95, 0, 0, 0, -0.5, [1, 0.12, 0.5]);
    for (const sx of [-1, 1]) {
      add(r, S(0.17, 10, 8), 0xffffff, sx * 0.24, 0.22, -0.72); add(r, S(0.08, 8, 6), 0x111111, sx * 0.24, 0.22, -0.86);
      add(r, B(0.22, 0.05, 0.05), 0x1b1b1b, sx * 0.24, 0.43, -0.76, 0, 0, sx * -0.2);
      add(r, S(0.2, 10, 8), 0x1b1b1b, sx * 0.2, -0.08, -0.82, 0, 0, sx * 0.4, [1.4, 0.55, 0.6]);
      add(r, S(0.09, 8, 6), 0x1b1b1b, sx * 0.47, 0.0, -0.75);
      add(r, S(0.16, 8, 6), 0xffffff, sx * 1.05, -0.2, -0.1);
    }
    jet(r, 0xff8a5c, -0.6, 0.7);
    Object.assign(r.userData, { arms: [], bob: true }); return r;
  },
  josh() {
    const r = humanoid({ skin: 0xf1c27d, shirt: 0x00b4d8, pants: 0x343a40, shoes: 0xf8f9fa, hair: 'short', hairCol: 0x2b1d14, longSleeve: true });
    const u = r.userData;
    add(u.head, B(0.66, 0.18, 0.14), 0x111827, 0, 0.07, -0.42); add(u.head, B(0.6, 0.06, 0.02), glow(0x48cae4), 0, 0.07, -0.5);
    add(u.head, T(0.46, 0.03, 4, 20), 0x111827, 0, 0.07, 0, Math.PI / 2);
    add(u.torso, B(0.68, 0.78, 0.32), 0x495057, 0, -0.02, 0.42);
    add(u.torso, C(0.02, 0.02, 0.8, 4), 0x495057, 0.25, 0.75, 0.45); add(u.torso, S(0.06, 6, 4), glow(0xff2d55), 0.25, 1.15, 0.45);
    add(u.arms[0].userData.hand, B(0.4, 0.3, 0.04), glow(0x48cae4, 0.8), 0, 0.05, -0.1, -0.6);
    u.drones = [0, 1].map(() => {
      const d = new THREE.Group(); r.add(d);
      add(d, B(0.36, 0.1, 0.36), 0x343a40);
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(d, C(0.14, 0.14, 0.02, 10), glow(0x48cae4, 0.7), x * 0.24, 0.07, z * 0.24);
      add(d, S(0.05, 6, 4), glow(0xff2d55), 0, 0, -0.2); return d;
    });
    hoverboard(r, 0x00b4d8); return r;
  },
  lars() {
    const r = humanoid({ skin: 0xffcba4, shirt: 0x8d6e63, pants: 0x5d4037, shoes: 0x3e2723, hair: 'none', scale: 0.82, wide: 1.5, longSleeve: true });
    const u = r.userData;
    add(u.head, new THREE.SphereGeometry(0.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0xffd60a, 0, 0.12, 0);
    add(u.head, C(0.6, 0.6, 0.05, 20), 0xe9c46a, 0, 0.13, 0);
    add(u.head, C(0.12, 0.12, 0.14, 10), 0x6c757d, 0, 0.35, -0.45, Math.PI / 2); add(u.head, S(0.1, 8, 6), glow(0xfff3b0), 0, 0.35, -0.53);
    add(u.head, K(0.42, 1.2, 10), 0xa0522d, 0, -0.62, -0.22, Math.PI); add(u.head, S(0.12, 8, 6), 0xa0522d, -0.12, -0.12, -0.42, 0, 0, 0, [1.6, 0.6, 0.6]); add(u.head, S(0.12, 8, 6), 0xa0522d, 0.12, -0.12, -0.42, 0, 0, 0, [1.6, 0.6, 0.6]);
    add(u.torso, B(1.4, 0.14, 0.54), 0x1b1b1b, 0, -0.38, 0); add(u.torso, B(0.22, 0.18, 0.04), 0xffd60a, 0, -0.38, -0.28);
    const px = grp(u.arms[1].userData.hand, 0, 0, 0); px.rotation.x = 0.4;
    add(px, C(0.05, 0.05, 1.3, 6), 0x8b5e34, 0, 0.55, 0); add(px, B(1.0, 0.12, 0.12), 0x8d99ae, 0, 1.18, 0, 0, 0, 0);
    add(px, K(0.07, 0.25, 4), 0x8d99ae, 0.58, 1.18, 0, 0, 0, -Math.PI / 2); add(px, K(0.07, 0.25, 4), 0x8d99ae, -0.58, 1.18, 0, 0, 0, Math.PI / 2);
    u.arms[1].rotation.x = 0.4; u.rest = [0.15, 0.4];
    hoverboard(r, 0x8d6e63); return r;
  },
  milo() {
    const r = humanoid({ skin: 0xe0ac69, shirt: 0x1d3557, pants: 0x1d3557, robe: 0x1d3557, trim: 0xffbe0b, hair: 'spiky', hairCol: 0xffbe0b, longSleeve: true });
    const u = r.userData;
    wizardHat(u.head, 0xffbe0b, 0x1d3557, true);
    add(u.torso, B(0.12, 0.5, 0.52), 0xffbe0b, 0, 0, 0, 0, 0, 0.5);
    const st = grp(u.arms[1].userData.hand, 0, 0, 0);
    add(st, C(0.05, 0.06, 2.5, 6), 0x6b4423, 0, 0.4, 0);
    u.orb = add(st, S(0.26, 12, 10), glow(0xfff3b0), 0, 1.75, 0);
    u.sparks = [0, 1, 2].map(i => add(st, B(0.04, 0.4, 0.04), glow(0xffbe0b), 0, 1.75, 0, 0, 0, i));
    magicDisc(r, 0xffbe0b); return r;
  },
  renas() {
    const r = humanoid({ skin: 0xf1c27d, shirt: 0xff6d00, pants: 0x2b2d42, shoes: 0xffbe0b, hair: 'messy', hairCol: 0x1b1b1b, scale: 0.78, face: { wide: true } });
    const u = r.userData;
    for (const sx of [-1, 1]) { add(u.head, C(0.12, 0.12, 0.12, 10), 0xffb703, sx * 0.17, 0.3, -0.36, Math.PI / 2 - 0.5); }
    add(u.head, T(0.47, 0.03, 4, 20), 0x6b4423, 0, 0.3, 0, Math.PI / 2 - 0.3);
    add(u.head, C(0.02, 0.02, 0.3, 4), 0x6c757d, 0, 0.6, 0); u.prop = add(u.head, B(0.7, 0.03, 0.1), 0xff006e, 0, 0.76, 0);
    add(u.torso, B(0.85, 0.95, 0.45), 0x6c757d, 0, -0.05, 0.46);
    add(u.torso, T(0.18, 0.06, 6, 8), 0xffd60a, -0.22, 0.15, 0.7); add(u.torso, T(0.12, 0.05, 6, 8), 0xffd60a, 0.2, -0.2, 0.7);
    add(u.torso, C(0.02, 0.02, 0.9, 4), 0x6c757d, -0.3, 0.85, 0.5); add(u.torso, S(0.07, 6, 4), glow(0x00f5d4), -0.3, 1.3, 0.5);
    const wr = grp(u.arms[1].userData.hand, 0, 0, 0); add(wr, B(0.08, 0.6, 0.06), 0xadb5bd, 0, 0.3, 0); add(wr, T(0.1, 0.04, 6, 10, Math.PI * 1.5), 0xadb5bd, 0, 0.65, 0);
    hoverboard(r, 0xff6d00); return r;
  },
  reshman() {
    const r = new THREE.Group();
    const blob = add(r, S(0.62, 18, 14), M(0x10002b, { roughness: 0.9 }), 0, 0, 0, 0, 0, 0, [1, 0.85, 1]);
    add(r, K(0.45, 0.9, 10), 0x10002b, 0, -0.65, 0.2, Math.PI + 0.4);
    for (const sx of [-1, 1]) add(r, S(0.15, 8, 6), 0x10002b, sx * 0.62, -0.1, -0.05);
    add(r, S(0.9, 14, 10), glow(0x7b2cbf, 0.18), 0, -0.05, 0);
    jet(r, 0x9d4edd, -0.4, 0.6, 0.25);
    Object.assign(r.userData, { arms: [], blob, small: true, bob: true }); return r;
  },
  robin() {
    const r = humanoid({ skin: 0xffdbc4, shirt: 0x06d6a0, pants: 0x1d3557, shoes: 0xe63946, hair: 'messy', hairCol: 0xe9c46a, scale: 1.3, wide: 1.25, face: { wide: true } });
    const u = r.userData;
    for (const sx of [-1, 1]) add(u.torso, B(0.14, 0.95, 0.52), 0x1d3557, sx * 0.32, 0, 0);
    add(u.torso, B(0.6, 0.4, 0.04), 0x1d3557, 0, -0.2, -0.26);
    u.tears = [-1, 1].map(sx => add(u.head, S(0.06, 8, 6), glow(0x48cae4), sx * 0.2, -0.05, -0.44, 0, 0, 0, [1, 1.6, 1]));
    add(u.arms[0].userData.hand, S(0.25, 10, 8), 0xa0522d, 0, -0.05, -0.05);
    add(u.arms[0].userData.hand, S(0.1, 6, 6), 0xa0522d, 0.12, 0.17, -0.05); add(u.arms[0].userData.hand, S(0.1, 6, 6), 0xa0522d, -0.12, 0.17, -0.05);
    u.aura = add(r, S(2.2, 16, 12), glow(0x06d6a0, 0), 0, 0, 0);
    hoverboard(r, 0x06d6a0); return r;
  },
  thomas() {
    const r = new THREE.Group();
    const ball = add(r, S(1.0, 24, 18), 0xf4a261);
    const head = grp(r, 0, 0.2, 0);
    for (const sx of [-1, 1]) {
      add(head, S(0.13, 8, 6), 0xffffff, sx * 0.28, 0.12, -0.9); add(head, S(0.07, 8, 6), 0x111111, sx * 0.28, 0.12, -1.0);
      add(head, B(0.26, 0.06, 0.06), 0x2b1d14, sx * 0.28, 0.32, -0.93, 0, 0, sx * 0.3);
    }
    add(head, B(0.36, 0.06, 0.06), 0x8c2f39, 0, -0.18, -0.96);
    add(r, T(0.98, 0.07, 6, 28), 0xe63946, 0, 0.5, 0, Math.PI / 2 + 0.05, 0, 0, [1, 1, 1]);
    add(r, B(0.1, 0.4, 0.06), 0xe63946, 0.1, 0.4, 0.95, 0, 0, 0.3); add(r, B(0.1, 0.4, 0.06), 0xe63946, -0.1, 0.4, 0.95, 0, 0, -0.3);
    add(r, T(1.0, 0.12, 6, 28), 0x1b1b1b, 0, -0.25, 0, Math.PI / 2); add(r, B(0.5, 0.35, 0.1), 0xffd60a, 0, -0.25, -1.03);
    const gl = [-1, 1].map(sx => { const g = grp(r, sx * 1.3, 0, -0.3); add(g, S(0.36, 12, 10), 0xd00000, 0, 0, 0, 0, 0, 0, [1, 0.9, 1.1]); add(g, C(0.22, 0.22, 0.2, 10), 0xffffff, 0, 0, 0.32, Math.PI / 2); return g; });
    jet(r, 0xffbe0b, -0.95, 0.2, 0.4);
    Object.assign(r.userData, { arms: [], gloves: gl, ball, round: true }); return r;
  },
  yassin() {
    const r = humanoid({ skin: 0xc68642, shirt: 0xf8f9fa, pants: 0xf8f9fa, shoes: 0xc68642, hair: 'short', hairCol: 0x111111, longSleeve: true, face: { angry: true, brow: 0x111111 } });
    const u = r.userData;
    add(u.torso, B(0.1, 0.98, 0.53), 0xdee2e6, -0.1, 0, 0, 0, 0, 0.55); add(u.torso, B(0.1, 0.98, 0.53), 0xdee2e6, 0.1, 0, 0, 0, 0, -0.55);
    add(u.torso, B(0.97, 0.12, 0.55), 0x111111, 0, -0.4, 0); add(u.torso, B(0.1, 0.36, 0.06), 0x111111, 0.18, -0.6, -0.28, 0, 0, 0.25);
    add(u.head, T(0.46, 0.06, 6, 24), 0xe63946, 0, 0.14, 0, Math.PI / 2);
    for (const sx of [-1, 1]) add(u.head, B(0.07, 0.45, 0.03), 0xe63946, sx * 0.08, -0.05, 0.5, 0.3, 0, sx * 0.25);
    add(u.arms[0].userData.hand, B(0.55, 0.24, 0.26), 0xb5532c, 0, 0.12, -0.05);
    u.arms[1].rotation.x = 1.3; u.rest = [0.15, 1.3];
    hoverboard(r, 0xe63946); return r;
  },
  niffo() {
    const r = humanoid({ skin: 0x8b5a2b, shirt: 0x2f5566, pants: 0x6b4423, shoes: 0x5a3a1e, hair: 'none', scale: 0.85, wide: 1.15, noFace: true });
    const u = r.userData;
    add(u.head, S(0.3, 12, 10), 0xf1dcb5, 0, -0.12, -0.3, 0, 0, 0, [1.2, 0.8, 0.8]);
    add(u.head, S(0.08, 8, 6), 0x1b1b1b, 0, -0.02, -0.55);
    for (const sx of [-1, 1]) {
      add(u.head, S(0.07, 8, 6), 0x111111, sx * 0.17, 0.12, -0.4);
      add(u.head, S(0.12, 8, 6), 0x6b4423, sx * 0.4, 0.2, 0.02, 0, 0, 0, [1, 1, 0.5]);
      for (let k = 0; k < 2; k++) add(u.head, B(0.3, 0.012, 0.012), 0xfff6e4, sx * 0.32, -0.08 - k * 0.06, -0.48, 0, 0, sx * (0.1 - k * 0.15));
    }
    add(u.head, C(0.55, 0.62, 0.08, 18), 0xe9c46a, 0, 0.34, 0); add(u.head, C(0.36, 0.42, 0.26, 16), 0xe9c46a, 0, 0.5, 0);
    add(u.body, K(0.22, 1.3, 8), 0x7a4a24, 0, 0.6, 0.6, -2.2);
    add(u.torso, B(0.5, 0.45, 0.25), 0x8b5e34, 0.3, -0.15, 0.36); add(u.torso, B(0.06, 0.9, 0.04), 0x5a3a1e, 0, 0.1, 0.27, 0, 0, 0.6);
    const rod = grp(u.arms[1].userData.hand, 0, 0, 0); rod.rotation.x = 0.5;
    add(rod, C(0.03, 0.05, 2.2, 6), 0x6b4423, 0, 1.0, 0); add(rod, C(0.006, 0.006, 1.0, 3), 0xffffff, 0, 1.6, -0.25, 0.5);
    add(u.arms[0].userData.hand, S(0.18, 10, 8), 0x9fd8ff, 0, -0.1, -0.05, 0, 0, 0, [0.5, 0.6, 1.4]);
    u.arms[1].rotation.x = 0.5; u.rest = [0.15, 0.5];
    hoverboard(r, 0x48cae4); return r;
  },
  femi() {
    const r = humanoid({ skin: 0xe9b872, shirt: 0xff7b00, pants: 0x111111, shoes: 0xffffff, hair: 'none', scale: 0.9, noFace: true });
    const u = r.userData;
    add(u.head, S(0.26, 12, 10), 0xfff1dc, 0, -0.12, -0.32, 0, 0, 0, [1, 0.75, 1.1]);
    add(u.head, S(0.07, 8, 6), 0x1b1b1b, 0, -0.06, -0.62);
    for (const sx of [-1, 1]) {
      add(u.head, S(0.08, 8, 6), 0x2b1d14, sx * 0.17, 0.1, -0.4); add(u.head, S(0.03, 6, 4), 0xffffff, sx * 0.15, 0.13, -0.47);
      const ear = add(u.head, K(0.24, 0.95, 4), 0xe9b872, sx * 0.3, 0.7, 0, 0, 0, sx * -0.35, [1, 1, 0.4]);
      add(ear, K(0.15, 0.7, 4), 0xffc8dd, 0, -0.05, -0.05, 0, 0, 0, [1, 1, 0.4]);
    }
    add(u.head, T(0.46, 0.05, 6, 24), 0xffffff, 0, 0.14, 0, Math.PI / 2);
    const num = symbolSprite('23', '#ff7b00', 0.6); num.position.set(0, 0.05, 0.3); u.torso.add(num);
    add(u.torso, B(0.94, 0.08, 0.52), 0xffffff, 0, 0.42, 0);
    add(u.body, S(0.3, 10, 8), 0xe9b872, 0, 0.7, 0.75, 0.9, 0, 0, [0.8, 2, 0.8]); add(u.body, S(0.2, 8, 6), 0xfff1dc, 0, 0.3, 1.25);
    const ball = add(u.arms[0].userData.hand, S(0.3, 14, 10), 0xff7b00, 0, -0.1, -0.05);
    add(ball, T(0.3, 0.015, 4, 20), 0x1b1b1b, 0, 0, 0, Math.PI / 2); add(ball, T(0.3, 0.015, 4, 20), 0x1b1b1b);
    u.ball = ball;
    hoverboard(r, 0xff7b00); return r;
  },
  bastiaan() {
    const r = humanoid({ skin: 0xffdbc4, shirt: 0x6b5b45, pants: 0x3d405b, shoes: 0x2b1d14, hair: 'short', hairCol: 0x9a8f80, longSleeve: true, scale: 1.05 });
    const u = r.userData;
    glasses(u.head, 0x3d2b1f);
    add(u.head, B(0.3, 0.06, 0.06), 0x9a8f80, 0, -0.08, -0.45);
    add(u.torso, B(0.34, 0.7, 0.02), 0xfff6e4, 0, 0.1, -0.26); add(u.torso, B(0.1, 0.55, 0.03), 0x9d0208, 0, 0.05, -0.27);
    u.arms.forEach(a => add(a, B(0.27, 0.14, 0.29), 0x4a3f30, 0, -0.55, 0));
    add(u.head, C(0.42, 0.42, 0.18, 16), 0x111111, 0, 0.38, 0); add(u.head, B(0.95, 0.05, 0.95), 0x111111, 0, 0.5, 0, 0, Math.PI / 4);
    add(u.head, C(0.012, 0.012, 0.4, 3), 0xffd23f, 0.3, 0.32, 0.3); add(u.head, S(0.05, 6, 4), 0xffd23f, 0.3, 0.12, 0.3);
    add(u.arms[0].userData.hand, B(0.45, 0.6, 0.12), 0x1d3557, 0, 0.05, -0.05);
    add(u.arms[1].userData.hand, C(0.04, 0.04, 0.32, 6), 0xffffff, 0, 0.12, 0);
    hoverboard(r, 0x6b5b45); return r;
  },
  marloes() {
    const r = new THREE.Group(), body = grp(r, 0, 0, 0);
    const fur = M(0xc9b8e8, { roughness: 0.4, metalness: 0.3 }), gem = glow(0xb388ff, 0.9), gold = M(0xffd23f, { metalness: 0.7, roughness: 0.3 });
    add(body, S(0.6, 16, 12), fur, 0, 0, 0, 0, 0, 0, [0.8, 0.75, 1.4]);
    add(body, C(0.16, 0.24, 0.8, 10), fur, 0, 0.45, -0.65, -0.6);
    const head = grp(body, 0, 0.85, -0.95);
    add(head, S(0.28, 14, 10), fur, 0, 0, 0, 0, 0, 0, [0.9, 0.9, 1.2]);
    add(head, S(0.16, 10, 8), 0xe8defa, 0, -0.08, -0.28, 0, 0, 0, [1, 0.8, 1.2]);
    add(head, S(0.05, 6, 4), 0x3d2064, 0, -0.04, -0.46);
    add(head, new THREE.OctahedronGeometry(0.07, 0), gem, 0, 0.2, -0.2);
    for (const sx of [-1, 1]) {
      add(head, S(0.06, 8, 6), 0x1a1230, sx * 0.16, 0.06, -0.2);
      add(head, S(0.1, 8, 6), fur, sx * 0.3, 0.16, 0.05, 0, 0, sx * -0.6, [0.5, 1.4, 0.4]);
      add(head, new THREE.OctahedronGeometry(0.12, 0), gem, sx * 0.14, 0.4, 0.02, 0, 0, sx * -0.3, [0.6, 2.6, 0.6]);
      add(head, new THREE.OctahedronGeometry(0.08, 0), gem, sx * 0.3, 0.55, 0.02, 0, 0, sx * -0.9, [0.6, 2.2, 0.6]);
    }
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const leg = grp(body, x * 0.25, -0.3, z * 0.45);
      add(leg, C(0.07, 0.06, 0.8, 6), fur, 0, -0.4, 0); add(leg, C(0.08, 0.09, 0.12, 6), gold, 0, -0.82, 0);
    }
    const gems = [0, 1, 2, 3].map(i => add(body, new THREE.OctahedronGeometry(0.1, 0), gem, 0, 0.45, -0.3 + i * 0.25, 0, 0, 0, [1, 1.6, 1]));
    add(body, S(0.1, 8, 6), 0xffffff, 0, 0.15, 0.85);
    magicDisc(r, 0xb388ff);
    Object.assign(r.userData, { arms: [], bob: true, gems }); return r;
  },
  evil_adam() {
    const r = humanoid({ skin: 0xb08a5a, shirt: 0x1b1b1b, pants: 0x3d0a0a, shoes: 0x111111, hair: 'messy', hairCol: 0x1b1b1b, face: { angry: true, eye: 0xff1f1f, brow: 0x111111 } });
    const u = r.userData;
    add(u.head, T(0.46, 0.06, 6, 24), 0x9d0208, 0, 0.2, 0, Math.PI / 2);
    for (const sx of [-1, 1]) { add(u.head, K(0.08, 0.35, 6), 0x2b0000, sx * 0.25, 0.52, -0.05, 0, 0, sx * -0.4); add(u.head, S(0.05, 6, 4), glow(0xff1f1f), sx * 0.16, 0.06, -0.47); }
    add(u.torso, B(0.94, 0.12, 0.52), 0x9d0208, 0, 0.35, 0);
    u.wings = [-1, 1].map(sx => {
      const w = grp(u.torso, sx * 0.3, 0.2, 0.3);
      add(w, C(0.04, 0.04, 1.6, 4), 0x111111, sx * 0.75, 0.25, 0, 0, 0, sx * 1.2);
      for (let i = 0; i < 3; i++) add(w, K(0.32, 1.3, 3), 0x3a0d22, sx * (0.45 + i * 0.4), -0.15 - i * 0.12 + 0.2, 0, 0, 0, sx * (2.0 - i * 0.3), [1, 1, 0.15]);
      return w;
    });
    const rk = grp(u.arms[1].userData.hand, 0, 0, 0); rk.rotation.x = 0.3;
    add(rk, C(0.05, 0.05, 0.55, 8), 0x1b1b1b, 0, 0.3, 0);
    add(rk, T(0.33, 0.045, 6, 22), 0x9d0208, 0, 0.92, 0, 0, Math.PI / 2, 0, [1, 1.25, 1]);
    add(rk, new THREE.CircleGeometry(0.31, 20), glow(0x3a0d22, 0.7), 0, 0.92, 0, 0, Math.PI / 2, 0, [1, 1.25, 1]);
    add(u.arms[0].userData.hand, S(0.14), glow(0xff1f1f, 0.9), 0, -0.05, 0);
    add(r, S(2.0, 14, 10), glow(0x9d0208, 0.08));
    return r;
  },
  meta() {
    const r = new THREE.Group();
    const geo = T(1.2, 0.34, 18, 64), col = [], c = new THREE.Color(), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const a = (Math.atan2(p.getY(i), p.getX(i)) + Math.PI) / (Math.PI * 2);
      c.setHSL(0.6 + a * 0.3, 1, 0.55); col.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const ring = add(r, geo, new THREE.MeshBasicMaterial({ vertexColors: true }));
    add(r, new THREE.CircleGeometry(0.9, 32), glow(0x7b5cff, 0.25));
    const eyes = [-1, 1].map(sx => add(r, S(0.16, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }), sx * 0.35, 0.1, 0.05, 0, 0, 0, [1, 1.5, 0.4]));
    for (const sx of [-1, 1]) add(r, B(0.36, 0.06, 0.06), new THREE.MeshBasicMaterial({ color: 0xffffff }), sx * 0.35, 0.45, 0.05, 0, 0, sx * -0.4);
    const bub = grp(r, 1.4, 1.4, 0);
    add(bub, B(1.2, 0.7, 0.16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    add(bub, K(0.18, 0.4, 3), new THREE.MeshBasicMaterial({ color: 0xffffff }), -0.4, -0.45, 0, 0, 0, 0.5);
    const dots = [-1, 0, 1].map(x => add(bub, S(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: 0x0866ff }), x * 0.3, 0, 0.1));
    Object.assign(r.userData, { arms: [], ring, dots, eyes, bub, meta: true }); return r;
  },
};

export function makeCharacter(id) {
  const r = BUILD[id](); r.userData.id = id; r.userData.throwT = 0; return r;
}

// Per-frame idle/flight animation shared by gameplay and cutscenes.
export function animateCharacter(r, t, dt, speed = 1) {
  const u = r.userData;
  if (u.flame) u.flame.scale.set(1, speed * (0.8 + Math.random() * 0.35), 1);
  u.throwT = Math.max(0, u.throwT - dt * 4);
  if (u.arms && u.arms.length) {
    const sw = Math.sin(u.throwT * Math.PI);
    u.arms[1].rotation.x = u.rest[1] + (u.throwT > 0 ? 2.4 * sw - 1.2 * (1 - u.throwT) : Math.sin(t * 2) * 0.05);
    u.arms[0].rotation.x = u.rest[0] + Math.sin(t * 2 + 1) * 0.08;
    if (u.legs) u.legs.forEach((l, i) => l.rotation.x = Math.sin(t * 1.5 + i) * 0.06);
  }
  if (u.segs) u.segs.forEach((s, i) => { s.position.x = Math.sin(t * 5 - i * 0.8) * 0.18; s.position.z = 0.1 * Math.sin(i) + Math.cos(t * 4 - i) * 0.05; });
  if (u.bob) r.children[0].position.y = Math.sin(t * 3) * 0.06;
  if (u.blob) u.blob.scale.set(1 + Math.sin(t * 4) * 0.06, 0.85 - Math.sin(t * 4) * 0.05, 1 + Math.sin(t * 4) * 0.06);
  if (u.syms) u.syms.forEach(s => { const a = t * 1.2 + s.userData.i * Math.PI / 3; s.position.set(Math.cos(a) * 1.5, 0.6 + Math.sin(a * 2) * 0.3, Math.sin(a) * 1.5); });
  if (u.drones) u.drones.forEach((d, i) => { const a = t * 1.6 + i * Math.PI; d.position.set(Math.cos(a) * 1.7, 1.2 + Math.sin(t * 3 + i) * 0.15, Math.sin(a) * 0.9); d.rotation.y = t * 4; });
  if (u.orb) u.orb.rotation.y = t * 2;
  if (u.sparks) u.sparks.forEach((s, i) => { s.visible = Math.random() < 0.6; s.rotation.z = Math.random() * 6; s.position.x = (Math.random() - 0.5) * 0.4; });
  if (u.spark) u.spark.scale.setScalar(0.7 + Math.random() * 0.6);
  if (u.prop) u.prop.rotation.y = t * 18;
  if (u.tears) u.tears.forEach((tr, i) => { const k = (t * 0.8 + i * 0.5) % 1; tr.position.y = -0.05 - k * 0.35; tr.material.opacity = 1 - k; });
  if (u.gloves) u.gloves.forEach((g, i) => { g.position.y = Math.sin(t * 3 + i * 2) * 0.15; g.position.z = -0.3 - Math.max(0, u.throwT) * 0.8 * (i ? 1 : 0); });
  if (u.meta) { u.ring.rotation.z = t * 0.8; u.dots.forEach((d, i) => d.position.y = Math.max(0, Math.sin(t * 6 - i)) * 0.12); u.bub.position.y = 1.4 + Math.sin(t * 2) * 0.1; }
  if (u.disc) u.disc.rotation.y = t * 1.5;
  if (u.wings) u.wings.forEach((w, i) => w.rotation.y = (i ? -1 : 1) * Math.sin(t * 7) * 0.45);
  if (u.gems) u.gems.forEach((g, i) => { g.rotation.y = t * 2 + i; g.position.y = 0.45 + Math.sin(t * 3 + i) * 0.04; });
  if (u.ball) u.ball.rotation.x = t * 5;
}
