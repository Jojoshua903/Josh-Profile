// ==========================================================
// props.js — procedural low-poly furniture & decor library for
// every room of the mansion: shared materials, helpers, and
// builders that each return a Group with its origin on the floor.
// ==========================================================
import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { CONFIG } from '../config.js';
import {
  makeStoneTexture, makeWindowTexture, makeGlowTexture, makeLabelTexture,
} from '../graphics/textures.js';

export const H = CONFIG.world.wallHeight;
export const T = CONFIG.world.wallThickness;
export const DOOR_H = 3.6;

export const std = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.05, flatShading: true, ...opts });

export function box(w, h, d, material, x = 0, y = 0, z = 0, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

export function cyl(rt, rb, h, seg, material, x = 0, y = 0, z = 0, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material);
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

export function glowSprite(color, size, opacity = 0.6) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTexture('#' + new THREE.Color(color).getHexString()),
    transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  s.scale.set(size, size, size);
  return s;
}

export function repeatTex(tex, rx, ry) {
  tex.repeat.set(rx, ry);
  tex.needsUpdate = true;
  return tex;
}

// ---------------------------------------------------------------
// Shared furniture materials
export const M = {
  darkWood: std(0x3a1f0e),
  wood: std(0x6a3a1a),
  lightWood: std(0x9a6232),
  gold: std(0xc9952e, { metalness: 0.75, roughness: 0.35 }),
  iron: std(0x2a2a30, { metalness: 0.6, roughness: 0.45 }),
  brass: std(0xb88a3a, { metalness: 0.7, roughness: 0.3 }),
  cream: std(0xefe6d2),
  porcelain: std(0xf6f2ea, { roughness: 0.3 }),
  candle: std(0xf3ead0, { emissive: 0x3a2a10, emissiveIntensity: 0.4 }),
  flame: new THREE.MeshBasicMaterial({ color: 0xffd27a }),
  velvetRed: std(0x7a1a28),
  velvetGreen: std(0x1f5a3a),
  velvetPurple: std(0x4a2a6a),
  leaf: std(0x2f6a2a),
  pot: std(0x8a4a2a),
  book: [std(0x7a1a28), std(0x1f3f8f), std(0x2f6a2a), std(0xb88a1a), std(0x4a2a6a)],
};

// ---------------------------------------------------------------
// Furniture builders (all return Groups with origin on the floor)
export function buildTable(w, d, h, top = M.wood, legs = M.darkWood) {
  const g = new THREE.Group();
  g.add(box(w, 0.12, d, top, 0, h, 0));
  const lx = w / 2 - 0.12;
  const lz = d / 2 - 0.12;
  for (const [x, z] of [[-lx, -lz], [lx, -lz], [-lx, lz], [lx, lz]]) g.add(box(0.12, h, 0.12, legs, x, h / 2, z));
  return g;
}

export function buildChair(seatMat = M.velvetRed) {
  const g = new THREE.Group();
  g.add(box(0.55, 0.1, 0.55, M.wood, 0, 0.5, 0));
  g.add(box(0.5, 0.08, 0.5, seatMat, 0, 0.58, 0));
  g.add(box(0.55, 0.9, 0.08, M.wood, 0, 1.0, -0.24));
  g.add(box(0.35, 0.5, 0.04, seatMat, 0, 1.05, -0.2));
  for (const [x, z] of [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]]) g.add(box(0.07, 0.5, 0.07, M.darkWood, x, 0.25, z));
  return g;
}


export function buildSofa(fabric = M.velvetRed) {
  const g = new THREE.Group();
  g.add(box(2.6, 0.45, 1.0, fabric, 0, 0.38, 0));
  g.add(box(2.6, 0.95, 0.25, fabric, 0, 0.95, -0.4));
  g.add(box(0.25, 0.7, 1.0, fabric, -1.2, 0.65, 0));
  g.add(box(0.25, 0.7, 1.0, fabric, 1.2, 0.65, 0));
  const cushion = std(new THREE.Color(fabric.color).multiplyScalar(1.25).getHex());
  g.add(box(1.0, 0.14, 0.75, cushion, -0.52, 0.66, 0.05));
  g.add(box(1.0, 0.14, 0.75, cushion, 0.52, 0.66, 0.05));
  return g;
}

// all the books on a shelf are one InstancedMesh (one draw call per shelf)
const BOOK_GEO = new THREE.BoxGeometry(1, 1, 1);
const BOOK_MAT = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, flatShading: true });
const BOOK_COLORS = [0x7a1a28, 0x1f3f8f, 0x2f6a2a, 0xb88a1a, 0x4a2a6a, 0x8a4a1a, 0x1a5a5a];

export function buildBookshelf(w = 2.2, h = 3.2, shelves = 5) {
  const g = new THREE.Group();
  g.add(box(w, h, 0.5, M.darkWood, 0, h / 2, 0));
  const books = [];
  for (let i = 0; i < shelves; i++) {
    const y = 0.35 + i * ((h - 0.5) / shelves);
    g.add(box(w - 0.16, 0.06, 0.4, M.wood, 0, y, 0.06, { cast: false }));
    let x = -w / 2 + 0.15;
    while (x < w / 2 - 0.25) {
      const bw = 0.08 + Math.random() * 0.1;
      const bh = 0.35 + Math.random() * 0.2;
      if (Math.random() < 0.06) {
        x += 0.25; // a gap on the shelf
        continue;
      }
      books.push({ x: x + bw / 2, y: y + 0.03 + bh / 2, w: bw, h: bh, tilt: Math.random() < 0.12 ? 0.3 : 0 });
      x += bw + 0.015;
    }
  }
  const inst = new THREE.InstancedMesh(BOOK_GEO, BOOK_MAT, books.length);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const col = new THREE.Color();
  books.forEach((b, i) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), b.tilt);
    m4.compose(new THREE.Vector3(b.x, b.y, 0.08), q, new THREE.Vector3(b.w, b.h, 0.3));
    inst.setMatrixAt(i, m4);
    inst.setColorAt(i, col.setHex(BOOK_COLORS[Math.floor(Math.random() * BOOK_COLORS.length)]));
  });
  inst.instanceMatrix.needsUpdate = true;
  if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  g.add(inst);
  g.add(box(w + 0.15, 0.15, 0.6, M.wood, 0, h + 0.07, 0));
  return g;
}

export function buildClock() {
  const g = new THREE.Group();
  g.add(box(0.8, 2.6, 0.5, M.darkWood, 0, 1.3, 0));
  g.add(box(0.95, 0.5, 0.6, M.wood, 0, 2.8, 0));
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.28, 14), M.cream);
  face.position.set(0, 2.8, 0.31);
  g.add(face);
  const hand1 = box(0.03, 0.22, 0.01, M.iron, 0, 2.88, 0.32, { cast: false });
  const hand2 = box(0.03, 0.16, 0.01, M.iron, 0.05, 2.8, 0.32, { cast: false });
  hand2.rotation.z = -1.1;
  g.add(hand1, hand2);
  const pend = new THREE.Group();
  pend.position.set(0, 2.3, 0.26);
  pend.add(box(0.02, 1.0, 0.02, M.brass, 0, -0.5, 0, { cast: false }));
  pend.add(cyl(0.12, 0.12, 0.03, 10, M.brass, 0, -1.0, 0, { cast: false }));
  pend.children[1].rotation.x = Math.PI / 2;
  g.add(pend);
  g.add(box(0.6, 1.5, 0.02, new THREE.MeshStandardMaterial({ color: 0x223040, transparent: true, opacity: 0.35 }), 0, 1.5, 0.26, { cast: false }));
  g.userData.pendulum = pend;
  g.userData.hand = hand1;
  return g;
}

export function buildPlant() {
  const g = new THREE.Group();
  g.add(cyl(0.35, 0.25, 0.6, 8, M.pot, 0, 0.3, 0));
  for (let i = 0; i < 7; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.2, 4), M.leaf);
    const a = (i / 7) * Math.PI * 2;
    leaf.position.set(Math.cos(a) * 0.18, 1.1, Math.sin(a) * 0.18);
    leaf.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
    leaf.castShadow = true;
    g.add(leaf);
  }
  return g;
}

export function buildSideTableVase() {
  const g = buildTable(0.8, 0.6, 0.9, M.wood);
  const vase = new THREE.Mesh(new THREE.LatheGeometry([
    new THREE.Vector2(0.0, 0), new THREE.Vector2(0.14, 0.02), new THREE.Vector2(0.2, 0.18),
    new THREE.Vector2(0.12, 0.42), new THREE.Vector2(0.09, 0.5), new THREE.Vector2(0.13, 0.58),
  ], 8), std(0x2b5a9a, { roughness: 0.3 }));
  vase.position.y = 0.96;
  vase.castShadow = true;
  g.add(vase);
  for (let i = 0; i < 3; i++) {
    const fl = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 0), std([0xff4f7a, 0xffd23a, 0xffffff][i]));
    fl.position.set(-0.06 + i * 0.06, 1.65 + (i % 2) * 0.08, 0);
    g.add(fl);
    g.add(box(0.015, 0.2, 0.015, M.leaf, -0.06 + i * 0.06, 1.52, 0, { cast: false }));
  }
  return g;
}


export function buildFireplace() {
  const g = new THREE.Group();
  const stone = std(0xffffff, { map: repeatTex(makeStoneTexture('#6a6470'), 1, 1) });
  g.add(box(3.4, 3.0, 0.9, stone, 0, 1.5, 0));
  g.add(box(3.9, 0.25, 1.1, M.darkWood, 0, 3.1, 0.05));
  const hole = box(1.8, 1.5, 0.5, new THREE.MeshBasicMaterial({ color: 0x0a0505 }), 0, 0.75, 0.25, { cast: false });
  g.add(hole);
  // andiron + logs
  g.add(box(1.4, 0.06, 0.06, M.iron, 0, 0.12, 0.35));
  for (let i = 0; i < 3; i++) {
    const log = cyl(0.1, 0.1, 1.1, 6, std(0x3a2010), -0.2 + i * 0.2, 0.22 + (i % 2) * 0.12, 0.35);
    log.rotation.z = Math.PI / 2;
    log.rotation.y = 0.3 * (i - 1);
    g.add(log);
  }
  // hearth
  g.add(box(4.0, 0.12, 1.6, std(0x3a343c), 0, 0.06, 0.6));
  // mantle ornaments
  g.add(cyl(0.12, 0.15, 0.4, 8, M.brass, -1.3, 3.42, 0.1));
  g.add(cyl(0.12, 0.15, 0.4, 8, M.brass, 1.3, 3.42, 0.1));
  const clockFace = new THREE.Mesh(new THREE.CircleGeometry(0.2, 12), M.cream);
  clockFace.position.set(0, 3.55, 0.36);
  g.add(box(0.55, 0.55, 0.3, M.gold, 0, 3.5, 0.15));
  g.add(clockFace);
  return g;
}


export function buildCandlestick() {
  const g = new THREE.Group();
  g.add(cyl(0.16, 0.2, 0.06, 8, M.brass, 0, 0, 0, { cast: false }));
  g.add(cyl(0.04, 0.05, 0.5, 6, M.brass, 0, 0.28, 0, { cast: false }));
  const arm = box(0.7, 0.04, 0.04, M.brass, 0, 0.5, 0, { cast: false });
  g.add(arm);
  const flames = [];
  for (const x of [-0.35, 0, 0.35]) {
    g.add(cyl(0.05, 0.05, 0.3, 6, M.candle, x, 0.68, 0, { cast: false }));
    const fl = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 5), M.flame);
    fl.position.set(x, 0.9, 0);
    g.add(fl);
    const s = glowSprite(0xffb050, 0.7, 0.6);
    s.position.set(x, 0.92, 0);
    g.add(s);
    flames.push(s);
  }
  g.userData.flames = flames;
  return g;
}


export function buildHutch() {
  const g = new THREE.Group();
  g.add(box(2.4, 1.2, 0.7, M.darkWood, 0, 0.6, 0));
  g.add(box(2.2, 1.9, 0.4, M.wood, 0, 2.15, -0.12));
  g.add(box(2.5, 0.12, 0.6, M.darkWood, 0, 3.15, -0.05));
  for (let i = 0; i < 2; i++) {
    const y = 1.6 + i * 0.75;
    g.add(box(2.1, 0.05, 0.35, M.darkWood, 0, y, -0.05, { cast: false }));
    for (let k = 0; k < 4; k++) {
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 12), M.porcelain);
      plate.rotation.x = Math.PI / 2 - 0.25;
      plate.position.set(-0.75 + k * 0.5, y + 0.24, -0.08);
      g.add(plate);
    }
  }
  return g;
}

export function buildPlate() {
  const g = new THREE.Group();
  const p = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.2, 0.04, 12), M.porcelain);
  p.receiveShadow = true;
  g.add(p);
  return g;
}

export function buildFood(kind) {
  const g = new THREE.Group();
  if (kind === 0) {
    // roast turkey
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), std(0xb8642a)));
    g.children[0].scale.set(1.2, 0.75, 0.9);
    g.add(cyl(0.04, 0.04, 0.3, 5, M.cream, 0.42, 0.1, 0.12));
    g.children[1].rotation.z = 1.2;
    g.add(cyl(0.04, 0.04, 0.3, 5, M.cream, 0.42, 0.1, -0.12));
    g.children[2].rotation.z = 1.2;
  } else if (kind === 1) {
    // cake
    g.add(cyl(0.3, 0.3, 0.3, 10, std(0xffd6e5), 0, 0.15, 0));
    g.add(cyl(0.31, 0.31, 0.06, 10, std(0xff4f7a), 0, 0.3, 0));
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), std(0xd8312e)));
    g.children[2].position.y = 0.38;
  } else {
    // fruit bowl
    g.add(cyl(0.3, 0.18, 0.15, 10, M.gold, 0, 0.08, 0));
    const cols = [0xd8312e, 0xffd23a, 0x6fd36a, 0x7a4bd6];
    for (let i = 0; i < 6; i++) {
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 4), std(cols[i % 4]));
      f.position.set(Math.cos(i) * 0.15, 0.2 + (i % 2) * 0.05, Math.sin(i) * 0.15);
      g.add(f);
    }
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

export function buildStairFlight(dir) {
  // dir = -1 for left flight (rises toward +x), +1 right flight (rises toward -x)
  const g = new THREE.Group();
  const steps = 14;
  const stepW = 6 / steps;
  const rise = 3.9 / steps;
  const tread = std(0x5a2a14);
  const carpet = std(0x7a1a28);
  for (let i = 0; i < steps; i++) {
    const x = dir * (9.5 - stepW * (i + 0.5));
    const h = rise * (i + 1);
    g.add(box(stepW, h, 2.2, tread, x, h / 2, 7.3));
    g.add(box(stepW * 0.98, 0.04, 1.3, carpet, x, h + 0.02, 7.3, { cast: false }));
  }
  // banister following the slope on the front edge
  const railStart = new THREE.Vector3(dir * 9.5, 1.2, 8.35);
  const railEnd = new THREE.Vector3(dir * 3.5, 3.9 + 1.0, 8.35);
  const len = railStart.distanceTo(railEnd);
  const rail = box(len, 0.1, 0.1, M.darkWood, (railStart.x + railEnd.x) / 2, (railStart.y + railEnd.y) / 2, 8.35);
  rail.rotation.z = Math.atan2(railEnd.y - railStart.y, railEnd.x - railStart.x);
  g.add(rail);
  for (let i = 0; i <= steps; i += 2) {
    const x = dir * (9.5 - stepW * i);
    const base = rise * i;
    g.add(box(0.06, 1.0, 0.06, M.lightWood, x, base + 0.5 + 0.1, 8.35, { cast: false }));
  }
  g.add(box(0.2, 1.4, 0.2, M.darkWood, dir * 9.5, 0.7, 8.35));
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 4), M.gold));
  g.children[g.children.length - 1].position.set(dir * 9.5, 1.5, 8.35);
  return g;
}

export function buildWindow(w = 1.6, h = 2.2) {
  const g = new THREE.Group();
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: makeWindowTexture() }));
  glass.position.z = 0.02;
  g.add(glass);
  const fr = M.darkWood;
  g.add(box(w + 0.3, 0.14, 0.2, fr, 0, h / 2 + 0.07, 0.05));
  g.add(box(w + 0.4, 0.16, 0.35, fr, 0, -h / 2 - 0.08, 0.12));
  g.add(box(0.14, h, 0.2, fr, -w / 2 - 0.07, 0, 0.05));
  g.add(box(0.14, h, 0.2, fr, w / 2 + 0.07, 0, 0.05));
  const glow = glowSprite(0x8fb4ff, 3.2, 0.25);
  glow.position.z = 0.3;
  g.add(glow);
  return g;
}

export function buildMoonShaft(w = 1.6, len = 5) {
  // a fake volumetric pool of moonlight on the floor
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, 'rgba(150,180,255,0.9)');
  grad.addColorStop(1, 'rgba(150,180,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 128);
  ctx.fillStyle = 'rgba(0,0,0,1)';
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillRect(30, 0, 4, 128);
  ctx.fillRect(0, 60, 64, 4);
  const tex = new THREE.CanvasTexture(c);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.3, len), new THREE.MeshBasicMaterial({
    map: tex, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.02;
  return m;
}


export function buildLockedSign() {
  const g = new THREE.Group();
  const chainMat = M.iron;
  for (let i = 0; i < 2; i++) {
    const ch = box(3.0, 0.08, 0.08, chainMat, 1.5, 1.8, 0.12, { cast: false });
    ch.rotation.z = i ? 0.55 : -0.55;
    g.add(ch);
  }
  g.add(box(0.4, 0.36, 0.14, std(0xd6a647, { metalness: 0.8, roughness: 0.3 }), 1.5, 1.8, 0.18, { cast: false }));
  const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.04, 5, 10, Math.PI), M.iron);
  shackle.position.set(1.5, 1.98, 0.18);
  g.add(shackle);
  const glow = glowSprite(0xff5050, 0.8, 0.4);
  glow.position.set(1.5, 1.8, 0.3);
  g.add(glow);
  return g;
}

// ===================================================================
// SHARED EXTRA MATERIALS
// ===================================================================
export const MX = {
  steel: std(0x9aa2b0, { metalness: 0.85, roughness: 0.28 }),
  darkSteel: std(0x4a4e58, { metalness: 0.8, roughness: 0.4 }),
  copper: std(0xc0703a, { metalness: 0.8, roughness: 0.35 }),
  marble: std(0xe8e4dc, { roughness: 0.25 }),
  blackMarble: std(0x1a1820, { roughness: 0.2 }),
  ivory: std(0xf6f0de, { roughness: 0.3 }),
  black: std(0x111014, { roughness: 0.35 }),
  linen: std(0xe9e2d0),
  sheet: std(0xd8d4c8, { roughness: 0.95 }),
  paper: std(0xf2ead6, { roughness: 1 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x9ad0ff, transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.1, depthWrite: false }),
  wine: std(0x3a0a18, { roughness: 0.2 }),
  bottleGreen: std(0x123a1a, { roughness: 0.2 }),
  stone: std(0x6a6470, { roughness: 0.95 }),
  darkStone: std(0x3a3640, { roughness: 0.95 }),
  coal: std(0x141216, { roughness: 1 }),
  rust: std(0x7a3a1a, { metalness: 0.5, roughness: 0.7 }),
  pastelPink: std(0xf5b8c8),
  pastelBlue: std(0xa8c8f0),
  pastelYellow: std(0xf6e08a),
  pastelGreen: std(0xa8e0b0),
  tile: std(0xf2f6fa, { roughness: 0.2 }),
  porcelainBlue: std(0x2b5a9a, { roughness: 0.3 }),
  plum: std(0x5a1a4a),
  navy: std(0x1a2a5a),
  emerald: std(0x1a6a4a),
  gold: M.gold,
};

const glowMatX = (color, intensity = 1.6) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.4, flatShading: true });

function sphere(r, material, x = 0, y = 0, z = 0, seg = 8) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(4, seg - 2)), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

function shadowAll(g, cast = true) {
  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = cast;
      o.receiveShadow = true;
    }
  });
  return g;
}

// tiny cached canvas textures used by a few props
const propTexCache = new Map();
function propTexture(key, w, h, draw) {
  if (propTexCache.has(key)) return propTexCache.get(key);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  propTexCache.set(key, t);
  return t;
}

// ===================================================================
// WEST WING — hall, study, library, conservatory
// ===================================================================
export function buildArmor() {
  const g = new THREE.Group();
  const s = MX.steel;
  g.add(box(0.9, 0.2, 0.7, MX.darkStone, 0, 0.1, 0));
  g.add(box(0.14, 0.9, 0.16, s, -0.16, 0.65, 0));
  g.add(box(0.14, 0.9, 0.16, s, 0.16, 0.65, 0));
  g.add(box(0.18, 0.1, 0.3, s, -0.16, 0.25, 0.06));
  g.add(box(0.18, 0.1, 0.3, s, 0.16, 0.25, 0.06));
  g.add(box(0.5, 0.25, 0.3, s, 0, 1.18, 0));
  g.add(box(0.6, 0.7, 0.34, s, 0, 1.6, 0));
  g.add(sphere(0.17, s, -0.38, 1.88, 0));
  g.add(sphere(0.17, s, 0.38, 1.88, 0));
  g.add(box(0.12, 0.7, 0.12, s, -0.42, 1.5, 0.04));
  g.add(box(0.12, 0.7, 0.12, s, 0.42, 1.5, 0.04));
  const helm = cyl(0.19, 0.2, 0.4, 8, s, 0, 2.18, 0);
  g.add(helm);
  g.add(box(0.3, 0.04, 0.02, MX.black, 0, 2.2, 0.2, { cast: false }));
  g.add(box(0.04, 0.3, 0.06, M.velvetRed, 0, 2.48, -0.02));
  // halberd
  g.add(cyl(0.025, 0.025, 2.7, 5, M.darkWood, 0.52, 1.35, 0.12));
  const blade = box(0.32, 0.36, 0.03, s, 0.62, 2.5, 0.12);
  g.add(blade);
  g.add(new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.25, 4), s));
  g.children[g.children.length - 1].position.set(0.52, 2.82, 0.12);
  return shadowAll(g);
}

export function buildDesk({ lamp = true } = {}) {
  const g = new THREE.Group();
  g.add(box(2.4, 0.1, 1.1, M.wood, 0, 1.0, 0));
  g.add(box(0.7, 0.95, 1.0, M.darkWood, -0.82, 0.48, 0));
  g.add(box(0.7, 0.95, 1.0, M.darkWood, 0.82, 0.48, 0));
  for (let i = 0; i < 3; i++) {
    g.add(box(0.5, 0.22, 0.02, M.wood, -0.82, 0.25 + i * 0.28, 0.51, { cast: false }));
    g.add(box(0.5, 0.22, 0.02, M.wood, 0.82, 0.25 + i * 0.28, 0.51, { cast: false }));
    g.add(sphere(0.025, M.brass, -0.82, 0.25 + i * 0.28, 0.53, 5));
    g.add(sphere(0.025, M.brass, 0.82, 0.25 + i * 0.28, 0.53, 5));
  }
  g.add(box(1.2, 0.02, 0.7, M.velvetGreen, 0, 1.06, 0.05, { cast: false }));
  // papers, inkwell, quill
  for (let i = 0; i < 4; i++) {
    const p = box(0.3, 0.01, 0.4, MX.paper, -0.3 + i * 0.18, 1.08 + i * 0.006, 0.1 + (i % 2) * 0.05, { cast: false });
    p.rotation.y = (i - 1.5) * 0.25;
    g.add(p);
  }
  g.add(cyl(0.06, 0.07, 0.1, 6, MX.black, 0.6, 1.11, -0.2));
  const quill = box(0.02, 0.35, 0.05, MX.linen, 0.62, 1.3, -0.2, { cast: false });
  quill.rotation.z = -0.4;
  g.add(quill);
  if (lamp) {
    g.add(cyl(0.12, 0.14, 0.04, 8, M.brass, -0.8, 1.07, -0.25));
    g.add(cyl(0.02, 0.02, 0.45, 5, M.brass, -0.8, 1.3, -0.25));
    const shade = cyl(0.12, 0.26, 0.24, 8, std(0x2f7a3a, { emissive: 0x1a4a1a, emissiveIntensity: 0.6 }), -0.8, 1.55, -0.25);
    g.add(shade);
    const glow = glowSprite(0xffe0a0, 1.2, 0.55);
    glow.position.set(-0.8, 1.45, -0.25);
    g.add(glow);
    g.userData.lampPos = new THREE.Vector3(-0.8, 1.5, -0.25);
  }
  return shadowAll(g);
}

export function buildGlobe() {
  const g = new THREE.Group();
  g.add(cyl(0.3, 0.38, 0.08, 8, M.darkWood, 0, 0.04, 0));
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = box(0.06, 0.8, 0.06, M.darkWood, Math.cos(a) * 0.22, 0.45, Math.sin(a) * 0.22);
    leg.rotation.z = Math.cos(a) * 0.15;
    leg.rotation.x = -Math.sin(a) * 0.15;
    g.add(leg);
  }
  const tex = propTexture('globe', 64, 32, (c, w, h) => {
    c.fillStyle = '#2a5a8a';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#c9a24a';
    const blobs = [[10, 10, 8, 6], [14, 20, 5, 7], [30, 9, 9, 5], [34, 18, 6, 8], [48, 12, 10, 6], [52, 24, 5, 4]];
    blobs.forEach(([x, y, rw, rh]) => {
      c.beginPath();
      c.ellipse(x, y, rw, rh, 0.3, 0, Math.PI * 2);
      c.fill();
    });
    c.strokeStyle = 'rgba(255,255,255,0.25)';
    for (let y = 4; y < h; y += 7) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(w, y);
      c.stroke();
    }
  });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 }));
  ball.position.y = 1.32;
  ball.rotation.z = 0.4;
  ball.castShadow = true;
  g.add(ball);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.025, 4, 20), M.brass);
  ring.position.y = 1.32;
  ring.rotation.y = Math.PI / 2;
  ring.rotation.x = 0.4;
  g.add(ring);
  g.userData.anim = (t) => {
    ball.rotation.y = t * 0.3;
  };
  return shadowAll(g);
}

export function buildTypewriterTable() {
  const g = buildTable(1.2, 0.8, 0.85, M.wood);
  g.add(box(0.6, 0.18, 0.45, MX.black, 0, 0.99, 0));
  g.add(box(0.62, 0.08, 0.12, MX.black, 0, 1.12, -0.18));
  g.add(cyl(0.05, 0.05, 0.62, 8, MX.darkSteel, 0, 1.18, -0.2));
  g.children[g.children.length - 1].rotation.z = Math.PI / 2;
  const sheet = box(0.34, 0.4, 0.01, MX.paper, 0, 1.38, -0.22, { cast: false });
  sheet.rotation.x = -0.2;
  g.add(sheet);
  for (let r = 0; r < 3; r++) for (let k = 0; k < 7; k++) g.add(cyl(0.025, 0.025, 0.02, 6, MX.ivory, -0.21 + k * 0.07, 1.09 + r * 0.01, 0.12 - r * 0.07, { cast: false }));
  return shadowAll(g);
}

export function buildFilingCabinet() {
  const g = new THREE.Group();
  g.add(box(0.8, 1.6, 0.7, std(0x4a5a4a, { metalness: 0.4 }), 0, 0.8, 0));
  for (let i = 0; i < 4; i++) {
    g.add(box(0.7, 0.34, 0.02, std(0x5a6a5a, { metalness: 0.4 }), 0, 0.22 + i * 0.38, 0.36, { cast: false }));
    g.add(box(0.2, 0.04, 0.04, M.brass, 0, 0.3 + i * 0.38, 0.38, { cast: false }));
  }
  const open = box(0.7, 0.3, 0.5, std(0x5a6a5a, { metalness: 0.4 }), 0, 1.36, 0.5);
  g.add(open);
  for (let i = 0; i < 6; i++) g.add(box(0.6, 0.26, 0.01, MX.paper, 0, 1.42, 0.3 + i * 0.07, { cast: false }));
  return shadowAll(g);
}

export function buildLadder(h = 3.6) {
  const g = new THREE.Group();
  const lean = 0.25;
  for (const x of [-0.3, 0.3]) {
    const rail = box(0.06, h, 0.06, M.lightWood, x, h / 2, 0);
    g.add(rail);
  }
  for (let y = 0.35; y < h - 0.1; y += 0.4) g.add(box(0.6, 0.05, 0.05, M.lightWood, 0, y, 0, { cast: false }));
  g.rotation.x = -lean;
  const holder = new THREE.Group();
  holder.add(g);
  g.position.z = 0.4;
  return shadowAll(holder);
}

export function buildReadingTable() {
  const g = buildTable(2.0, 1.0, 0.95, M.wood);
  const open = new THREE.Group();
  open.add(box(0.35, 0.03, 0.45, MX.paper, -0.18, 1.03, 0, { cast: false }));
  open.add(box(0.35, 0.03, 0.45, MX.paper, 0.18, 1.03, 0, { cast: false }));
  open.children[0].rotation.z = 0.08;
  open.children[1].rotation.z = -0.08;
  open.add(box(0.74, 0.02, 0.48, M.velvetRed, 0, 1.01, 0, { cast: false }));
  g.add(open);
  for (let i = 0; i < 4; i++) {
    const b = box(0.32, 0.08, 0.24, M.book[i % M.book.length], 0.65, 1.05 + i * 0.08, 0.1);
    b.rotation.y = i * 0.3;
    g.add(b);
  }
  const cs = buildCandlestick();
  cs.scale.setScalar(0.6);
  cs.position.set(-0.7, 1.0, 0);
  g.add(cs);
  g.userData.flames = cs.userData.flames;
  return shadowAll(g);
}

// books that drift in lazy circles above a table (haunted library)
export function buildFloatingBooks(n = 6, radius = 1.2) {
  const g = new THREE.Group();
  const books = [];
  for (let i = 0; i < n; i++) {
    const b = new THREE.Group();
    const col = M.book[i % M.book.length];
    b.add(box(0.36, 0.06, 0.26, col, 0, 0, 0));
    const pages = box(0.32, 0.05, 0.24, MX.paper, 0.02, 0, 0, { cast: false });
    b.add(pages);
    g.add(b);
    books.push({ b, a: (i / n) * Math.PI * 2, h: 2 + Math.random() * 0.8, sp: 0.4 + Math.random() * 0.3 });
  }
  g.userData.anim = (t) => {
    for (const k of books) {
      const a = k.a + t * k.sp;
      k.b.position.set(Math.cos(a) * radius, k.h + Math.sin(t * 1.3 + k.a) * 0.2, Math.sin(a) * radius);
      k.b.rotation.set(Math.sin(t + k.a) * 0.5, -a, Math.cos(t * 0.7 + k.a) * 0.4);
    }
  };
  return g;
}

export function buildGrandPiano() {
  const g = new THREE.Group();
  const body = new THREE.Shape();
  body.moveTo(-0.8, -1.0);
  body.lineTo(0.8, -1.0);
  body.lineTo(0.8, 0.2);
  body.bezierCurveTo(0.8, 1.2, 0.1, 1.5, -0.3, 1.0);
  body.bezierCurveTo(-0.6, 0.7, -0.8, 0.6, -0.8, 0.2);
  body.lineTo(-0.8, -1.0);
  const caseGeo = new THREE.ExtrudeGeometry(body, { depth: 0.38, bevelEnabled: false });
  caseGeo.rotateX(Math.PI / 2);
  const c = new THREE.Mesh(caseGeo, MX.black);
  c.position.y = 1.0;
  c.castShadow = true;
  g.add(c);
  // propped lid (same outline as the case, hinged on the straight +x side)
  const lid = new THREE.Mesh(new THREE.ShapeGeometry(body), new THREE.MeshStandardMaterial({ color: 0x111014, roughness: 0.35, flatShading: true, side: THREE.DoubleSide }));
  lid.rotation.x = Math.PI / 2;
  const lidPivot = new THREE.Group();
  lidPivot.position.set(0.8, 1.02, 0);
  lid.position.x = -0.8;
  lidPivot.add(lid);
  lidPivot.rotation.z = -0.6;
  g.add(lidPivot);
  g.add(box(0.03, 0.42, 0.03, MX.black, 0.1, 1.22, -0.3));
  // legs
  for (const [x, z] of [[-0.62, -0.8], [0.62, -0.8], [-0.1, 0.95]]) g.add(cyl(0.07, 0.05, 0.62, 6, MX.black, x, 0.31, z));
  // keyboard along the straight front edge (-z)
  g.add(box(1.6, 0.06, 0.32, MX.black, 0, 0.84, -1.15));
  g.add(box(1.5, 0.04, 0.22, MX.ivory, 0, 0.88, -1.17, { cast: false }));
  for (let i = 0; i < 18; i++) {
    if (i % 7 === 2 || i % 7 === 6) continue;
    g.add(box(0.04, 0.04, 0.12, MX.black, -0.7 + i * 0.083, 0.91, -1.12, { cast: false }));
  }
  // sheet music
  const sheet = box(0.5, 0.36, 0.01, MX.paper, 0, 1.2, -0.95, { cast: false });
  sheet.rotation.x = 0.25;
  g.add(sheet);
  // bench
  g.add(box(1.0, 0.1, 0.42, MX.black, 0, 0.55, -1.75));
  g.add(box(0.96, 0.06, 0.38, M.velvetPurple, 0, 0.62, -1.75, { cast: false }));
  for (const x of [-0.42, 0.42]) for (const z of [-1.6, -1.9]) g.add(box(0.06, 0.55, 0.06, MX.black, x, 0.27, z));
  return shadowAll(g);
}

export function buildHarp() {
  const g = new THREE.Group();
  g.add(box(0.5, 0.12, 0.35, M.gold, 0, 0.06, 0));
  const pillar = cyl(0.05, 0.06, 2.0, 6, M.gold, -0.2, 1.06, 0);
  g.add(pillar);
  const sound = box(0.16, 1.9, 0.22, M.lightWood, 0.22, 1.0, 0);
  sound.rotation.z = 0.32;
  g.add(sound);
  const neck = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.05, 5, 10, Math.PI), M.gold);
  neck.position.set(0.12, 2.0, 0);
  g.add(neck);
  for (let i = 0; i < 9; i++) {
    const x = -0.14 + i * 0.05;
    const top = 2.0 - Math.abs(i - 4) * 0.02;
    const bot = 0.25 + i * 0.17;
    g.add(box(0.008, top - bot, 0.008, std(0xf6e8b0, { emissive: 0x3a3010 }), x, (top + bot) / 2, 0, { cast: false }));
  }
  return shadowAll(g);
}

export function buildCello() {
  const g = new THREE.Group();
  const bodyMat = std(0x8a3a12, { roughness: 0.35 });
  const b1 = sphere(0.3, bodyMat, 0, 0.6, 0, 10);
  b1.scale.set(1, 1.1, 0.4);
  const b2 = sphere(0.24, bodyMat, 0, 1.05, 0, 10);
  b2.scale.set(1, 1, 0.4);
  g.add(b1, b2);
  g.add(box(0.06, 0.8, 0.05, MX.black, 0, 1.55, 0.06));
  g.add(box(0.1, 0.16, 0.06, bodyMat, 0, 2.0, 0.04));
  g.add(cyl(0.01, 0.01, 0.3, 4, MX.steel, 0, 0.15, 0));
  g.rotation.z = 0.12;
  const stand = new THREE.Group();
  stand.add(g);
  stand.add(box(0.5, 0.05, 0.4, M.darkWood, 0, 0.02, 0));
  return shadowAll(stand);
}

export function buildMusicStand() {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = box(0.03, 0.4, 0.03, MX.darkSteel, Math.cos(a) * 0.15, 0.18, Math.sin(a) * 0.15);
    leg.rotation.z = Math.cos(a) * 0.6;
    leg.rotation.x = -Math.sin(a) * 0.6;
    g.add(leg);
  }
  g.add(cyl(0.015, 0.015, 1.0, 5, MX.darkSteel, 0, 0.8, 0));
  const desk = box(0.5, 0.36, 0.02, MX.darkSteel, 0, 1.35, 0);
  desk.rotation.x = -0.35;
  g.add(desk);
  const sheet = box(0.44, 0.3, 0.01, MX.paper, 0, 1.36, 0.02, { cast: false });
  sheet.rotation.x = -0.35;
  g.add(sheet);
  return shadowAll(g);
}

export function buildPalm() {
  const g = new THREE.Group();
  g.add(cyl(0.4, 0.3, 0.6, 8, MX.porcelainBlue, 0, 0.3, 0));
  g.add(cyl(0.42, 0.42, 0.06, 8, M.gold, 0, 0.6, 0));
  for (let i = 0; i < 5; i++) g.add(cyl(0.08 - i * 0.008, 0.09 - i * 0.008, 0.4, 6, std(0x7a5a30), 0, 0.8 + i * 0.38, 0));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const frond = box(0.18, 0.03, 1.3, M.leaf, Math.cos(a) * 0.55, 2.55, Math.sin(a) * 0.55);
    frond.rotation.y = -a + Math.PI / 2;
    frond.rotation.x = 0.5;
    g.add(frond);
  }
  return shadowAll(g);
}

export function buildBust(color = 0xe8e4dc) {
  const g = new THREE.Group();
  const stone = std(color, { roughness: 0.3 });
  g.add(box(0.5, 0.12, 0.5, MX.blackMarble, 0, 0.06, 0));
  g.add(cyl(0.16, 0.2, 1.1, 8, MX.blackMarble, 0, 0.66, 0));
  g.add(box(0.46, 0.08, 0.46, MX.blackMarble, 0, 1.24, 0));
  const chest = sphere(0.28, stone, 0, 1.45, 0, 8);
  chest.scale.set(1.1, 0.6, 0.7);
  g.add(chest);
  g.add(cyl(0.08, 0.1, 0.18, 6, stone, 0, 1.65, 0));
  g.add(sphere(0.19, stone, 0, 1.88, 0.02, 8));
  g.add(sphere(0.04, stone, 0, 1.88, 0.2, 5));
  return shadowAll(g);
}

export function buildColumn(h = 5.2, mat = MX.marble) {
  const g = new THREE.Group();
  g.add(box(0.9, 0.3, 0.9, mat, 0, 0.15, 0));
  g.add(cyl(0.32, 0.36, h - 0.7, 12, mat, 0, h / 2, 0));
  g.add(box(0.9, 0.35, 0.9, mat, 0, h - 0.17, 0));
  for (let i = 0; i < 2; i++) g.add(cyl(0.4, 0.4, 0.08, 12, M.gold, 0, i ? h - 0.4 : 0.34, 0, { cast: false }));
  return shadowAll(g);
}

export function buildMirror(w = 1.4, h = 2.4) {
  const g = new THREE.Group();
  g.add(box(w + 0.3, h + 0.3, 0.1, M.gold, 0, 0, 0));
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ color: 0x8ab0d0, metalness: 1, roughness: 0.08, emissive: 0x0c1420 }));
  glass.position.z = 0.06;
  g.add(glass);
  g.add(sphere(0.12, M.gold, 0, h / 2 + 0.22, 0.03, 6));
  // a ghostly face that flickers in the glass
  const face = glowSprite(0x9fd8ff, 0.9, 0);
  face.position.set(0, 0.2, 0.1);
  g.add(face);
  g.userData.anim = (t) => {
    const k = Math.max(0, Math.sin(t * 0.37 + w) - 0.94) * 12;
    face.material.opacity = k * 0.6;
  };
  return g;
}

// ===================================================================
// BALLROOM & KITCHEN
// ===================================================================
export function buildStage(w = 10, d = 4) {
  const g = new THREE.Group();
  g.add(box(w, 0.6, d, M.darkWood, 0, 0.3, 0));
  g.add(box(w, 0.04, d - 0.2, M.wood, 0, 0.62, 0, { cast: false }));
  g.add(box(w + 0.2, 0.12, 0.2, M.gold, 0, 0.58, d / 2, { cast: false }));
  for (let i = 0; i < 3; i++) g.add(box(2.4, 0.2, 0.4, M.darkWood, 0, 0.1 + i * 0.2 - 0.2, d / 2 + 0.6 - i * 0.2));
  // footlights
  const lights = [];
  for (let x = -w / 2 + 0.8; x < w / 2; x += 1.6) {
    g.add(box(0.3, 0.12, 0.16, M.brass, x, 0.68, d / 2 - 0.15, { cast: false }));
    const s = glowSprite(0xffd890, 0.7, 0.55);
    s.position.set(x, 0.8, d / 2 - 0.1);
    g.add(s);
    lights.push(s);
  }
  g.userData.flames = lights;
  return shadowAll(g);
}

export function buildCurtainDrape(w = 3, h = 5, color = 0x7a1a28) {
  const g = new THREE.Group();
  const mat = std(color, { roughness: 0.9 });
  for (let i = 0; i < 6; i++) {
    const fold = cyl(w / 12, w / 10, h, 6, mat, -w / 2 + (i + 0.5) * (w / 6), h / 2, (i % 2) * 0.08);
    g.add(fold);
  }
  g.add(box(w + 0.3, 0.3, 0.3, M.gold, 0, h, 0));
  const tie = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.05, 4, 8), M.gold);
  tie.position.set(0, h * 0.45, 0.2);
  g.add(tie);
  return shadowAll(g);
}

export function buildEasel() {
  const g = new THREE.Group();
  const legA = box(0.07, 2.4, 0.07, M.lightWood, -0.4, 1.2, 0);
  legA.rotation.z = -0.14;
  const legB = box(0.07, 2.4, 0.07, M.lightWood, 0.4, 1.2, 0);
  legB.rotation.z = 0.14;
  const legC = box(0.07, 2.3, 0.07, M.lightWood, 0, 1.1, -0.45);
  legC.rotation.x = 0.25;
  g.add(legA, legB, legC);
  g.add(box(1.1, 0.06, 0.16, M.lightWood, 0, 0.95, 0.05));
  // unfinished canvas of the trapped teammate (blank, glowing)
  const canvasMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.25), new THREE.MeshStandardMaterial({ color: 0xf6f0de, emissive: 0x3a2a5a, emissiveIntensity: 0.4 }));
  canvasMesh.position.set(0, 1.62, 0.09);
  g.add(canvasMesh);
  g.add(box(1.04, 1.29, 0.04, M.lightWood, 0, 1.62, 0.06));
  // paint pots
  const cols = [0xd8312e, 0x3a7aff, 0xffd23a, 0x6fd36a];
  cols.forEach((c, i) => g.add(cyl(0.08, 0.08, 0.12, 6, std(c), -0.6 + i * 0.4, 0.06, 0.5)));
  g.userData.canvasMesh = canvasMesh;
  return shadowAll(g);
}

export function buildCounter(len = 4, { top = MX.marble, drawers = true } = {}) {
  const g = new THREE.Group();
  g.add(box(len, 0.95, 0.8, M.wood, 0, 0.475, 0));
  g.add(box(len + 0.08, 0.08, 0.88, top, 0, 0.99, 0.02));
  const n = Math.max(1, Math.round(len / 0.8));
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + (i + 0.5) * (len / n);
    g.add(box(len / n - 0.08, drawers && i % 2 ? 0.25 : 0.7, 0.02, M.lightWood, x, drawers && i % 2 ? 0.78 : 0.42, 0.41, { cast: false }));
    g.add(sphere(0.03, M.brass, x, 0.72, 0.43, 5));
  }
  return shadowAll(g);
}

export function buildStove() {
  const g = new THREE.Group();
  const iron = std(0x1c1c22, { metalness: 0.6, roughness: 0.5 });
  g.add(box(2.0, 1.0, 0.9, iron, 0, 0.5, 0));
  g.add(box(2.1, 0.08, 1.0, MX.darkSteel, 0, 1.04, 0));
  for (const [x, z] of [[-0.55, -0.15], [0.55, -0.15], [-0.55, 0.22], [0.55, 0.22]]) g.add(cyl(0.2, 0.2, 0.04, 10, MX.black, x, 1.1, z, { cast: false }));
  // oven door with a fiery window
  g.add(box(0.9, 0.55, 0.04, MX.darkSteel, 0, 0.45, 0.46));
  const fire = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.25), new THREE.MeshBasicMaterial({ color: 0xff7a2a }));
  fire.position.set(0, 0.48, 0.49);
  g.add(fire);
  const glow = glowSprite(0xff7a2a, 1.4, 0.6);
  glow.position.set(0, 0.5, 0.6);
  g.add(glow);
  // stovepipe
  g.add(cyl(0.14, 0.14, 4.2, 8, iron, 0.75, 3.1, -0.35));
  // a stew pot
  g.add(cyl(0.28, 0.24, 0.36, 10, MX.darkSteel, -0.55, 1.3, -0.15));
  g.add(cyl(0.3, 0.3, 0.04, 10, MX.darkSteel, -0.55, 1.5, -0.15));
  g.userData.flames = [glow];
  g.userData.anim = (t) => {
    fire.material.color.setHSL(0.06 + Math.sin(t * 9) * 0.015, 1, 0.5 + Math.sin(t * 13) * 0.08);
  };
  return shadowAll(g);
}

export function buildSink() {
  const g = buildCounter(1.8, { drawers: false });
  g.add(box(0.9, 0.05, 0.55, MX.steel, 0, 1.0, 0.02, { cast: false }));
  g.add(box(0.8, 0.02, 0.45, MX.black, 0, 1.03, 0.02, { cast: false }));
  g.add(cyl(0.03, 0.03, 0.4, 5, M.brass, 0, 1.22, -0.3));
  const spout = box(0.04, 0.04, 0.25, M.brass, 0, 1.42, -0.2);
  g.add(spout);
  for (let i = 0; i < 3; i++) {
    const pl = cyl(0.2, 0.2, 0.03, 10, M.porcelain, -0.25 + i * 0.12, 1.12 + i * 0.03, 0.05, { cast: false });
    pl.rotation.x = 0.9;
    g.add(pl);
  }
  return shadowAll(g);
}

export function buildPotRack(len = 2.6) {
  const g = new THREE.Group();
  g.add(box(len, 0.06, 0.06, MX.darkSteel, 0, 0, 0));
  for (const x of [-len / 2, len / 2]) g.add(cyl(0.012, 0.012, 1.0, 4, MX.darkSteel, x, 0.5, 0, { cast: false }));
  const pots = [];
  for (let i = 0; i < 5; i++) {
    const x = -len / 2 + 0.3 + i * ((len - 0.6) / 4);
    const pivot = new THREE.Group();
    pivot.position.set(x, -0.02, 0);
    pivot.add(cyl(0.008, 0.008, 0.25, 4, MX.darkSteel, 0, -0.12, 0, { cast: false }));
    const mat = i % 2 ? MX.copper : MX.darkSteel;
    const r = 0.14 + (i % 3) * 0.04;
    pivot.add(cyl(r, r * 0.9, r * 1.1, 10, mat, 0, -0.3 - r * 0.5, 0));
    pivot.add(box(0.04, 0.04, r * 1.4, mat, 0, -0.3 - r * 0.1, r + 0.1));
    g.add(pivot);
    pots.push(pivot);
  }
  g.userData.anim = (t) => {
    pots.forEach((p, i) => (p.rotation.z = Math.sin(t * 1.7 + i) * 0.06));
  };
  return shadowAll(g);
}

export function buildBarrel(h = 1.2, mat = M.wood) {
  const g = new THREE.Group();
  g.add(cyl(0.42, 0.42, h, 10, mat, 0, h / 2, 0));
  g.add(cyl(0.47, 0.47, h * 0.5, 10, mat, 0, h / 2, 0));
  for (const y of [0.15, h / 2, h - 0.15]) g.add(cyl(0.48, 0.48, 0.06, 10, MX.darkSteel, 0, y, 0, { cast: false }));
  g.add(cyl(0.4, 0.4, 0.02, 10, M.darkWood, 0, h + 0.01, 0, { cast: false }));
  return shadowAll(g);
}

export function buildCask(len = 1.6, r = 0.6) {
  const g = new THREE.Group();
  const c = new THREE.Group();
  c.add(cyl(r, r, len, 12, M.wood, 0, 0, 0));
  c.add(cyl(r * 1.08, r * 1.08, len * 0.5, 12, M.wood, 0, 0, 0));
  for (const y of [-len / 2 + 0.12, -len / 6, len / 6, len / 2 - 0.12]) c.add(cyl(r * 1.1, r * 1.1, 0.05, 12, MX.darkSteel, 0, y, 0, { cast: false }));
  c.add(cyl(0.05, 0.05, 0.2, 5, M.brass, 0, len / 2 + 0.06, -r * 0.6));
  c.rotation.x = Math.PI / 2;
  c.position.y = r + 0.25;
  g.add(c);
  for (const z of [-len / 3, len / 3]) g.add(box(r * 1.8, 0.3, 0.16, M.darkWood, 0, 0.15, z));
  return shadowAll(g);
}

export function buildCrate(s = 1) {
  const g = new THREE.Group();
  g.add(box(s, s, s, M.lightWood, 0, s / 2, 0));
  for (const y of [0.08, s - 0.08]) {
    g.add(box(s + 0.04, 0.1, 0.06, M.wood, 0, y, s / 2, { cast: false }));
    g.add(box(s + 0.04, 0.1, 0.06, M.wood, 0, y, -s / 2, { cast: false }));
  }
  const d = box(s * 1.3, 0.1, 0.05, M.wood, 0, s / 2, s / 2 + 0.01, { cast: false });
  d.rotation.z = Math.PI / 4;
  g.add(d);
  return shadowAll(g);
}

export function buildJarShelf(w = 2.0) {
  const g = new THREE.Group();
  g.add(box(w, 2.6, 0.45, M.darkWood, 0, 1.3, 0));
  const cols = [0xd8312e, 0xffd23a, 0x6fd36a, 0xff8a3a, 0x7a4bd6, 0xf6f2ea];
  for (let s = 0; s < 4; s++) {
    const y = 0.4 + s * 0.6;
    g.add(box(w - 0.1, 0.05, 0.4, M.wood, 0, y, 0.04, { cast: false }));
    for (let x = -w / 2 + 0.2; x < w / 2 - 0.1; x += 0.28) {
      const h = 0.22 + ((x * 7 + s) % 3) * 0.05;
      g.add(cyl(0.09, 0.09, h, 6, std(cols[Math.floor(Math.abs(x * 13 + s * 5)) % cols.length], { roughness: 0.3 }), x, y + 0.03 + h / 2, 0.05, { cast: false }));
      g.add(cyl(0.095, 0.095, 0.04, 6, M.brass, x, y + 0.05 + h, 0.05, { cast: false }));
    }
  }
  return shadowAll(g);
}

export function buildPrepTable() {
  const g = buildTable(3.0, 1.4, 0.95, std(0xb88a5a), M.darkWood);
  g.add(box(0.8, 0.06, 0.5, M.lightWood, -0.6, 1.04, 0.1));
  const knife = box(0.3, 0.01, 0.05, MX.steel, -0.5, 1.08, 0.1, { cast: false });
  g.add(knife);
  for (let i = 0; i < 5; i++) g.add(sphere(0.07, std([0xd8312e, 0xffa040, 0x6fd36a][i % 3]), -0.9 + i * 0.1, 1.11, 0.25, 5));
  g.add(cyl(0.3, 0.2, 0.18, 10, std(0xd8c8a0), 0.6, 1.1, 0));
  g.add(sphere(0.18, std(0xf2e2c0), 0.6, 1.24, 0, 8));
  g.add(box(0.5, 0.3, 0.4, std(0x9a6a3a), 1.1, 1.13, -0.2));
  return shadowAll(g);
}

// ===================================================================
// EAST WING — east hall, laundry, storage
// ===================================================================
export function buildUmbrellaStand() {
  const g = new THREE.Group();
  g.add(cyl(0.22, 0.2, 0.7, 10, MX.porcelainBlue, 0, 0.35, 0));
  const cols = [0x1a1a1a, 0x7a1a28, 0x1f3f8f];
  cols.forEach((c, i) => {
    const u = new THREE.Group();
    u.add(cyl(0.02, 0.02, 1.1, 4, M.darkWood, 0, 0.55, 0));
    u.add(new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.7, 6), std(c)));
    u.children[1].position.y = 0.5;
    u.add(new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 4, 8, Math.PI), M.darkWood));
    u.children[2].position.set(0.06, 1.1, 0);
    u.position.set(Math.cos(i * 2) * 0.08, 0.2, Math.sin(i * 2) * 0.08);
    u.rotation.z = (i - 1) * 0.15;
    g.add(u);
  });
  return shadowAll(g);
}

export function buildCoatRack() {
  const g = new THREE.Group();
  g.add(cyl(0.3, 0.35, 0.06, 8, M.darkWood, 0, 0.03, 0));
  g.add(cyl(0.04, 0.05, 2.1, 6, M.darkWood, 0, 1.08, 0));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const peg = box(0.04, 0.04, 0.3, M.brass, Math.cos(a) * 0.12, 1.95, Math.sin(a) * 0.12);
    peg.rotation.y = -a + Math.PI / 2;
    peg.rotation.x = -0.4;
    g.add(peg);
  }
  const coat = cyl(0.12, 0.3, 1.0, 8, std(0x3a2a1a), 0.15, 1.4, 0);
  g.add(coat);
  const hat = new THREE.Group();
  hat.add(cyl(0.13, 0.14, 0.18, 8, MX.black, 0, 0.09, 0));
  hat.add(cyl(0.24, 0.24, 0.02, 10, MX.black, 0, 0.01, 0));
  hat.position.set(-0.1, 2.05, 0);
  hat.rotation.z = 0.3;
  g.add(hat);
  return shadowAll(g);
}

export function buildWashtub() {
  const g = new THREE.Group();
  g.add(cyl(0.6, 0.5, 0.65, 12, std(0x9aa2a8, { metalness: 0.6, roughness: 0.4 }), 0, 0.55, 0));
  g.add(cyl(0.55, 0.55, 0.02, 12, std(0x6a8aa8, { roughness: 0.1, transparent: true, opacity: 0.8 }), 0, 0.78, 0, { cast: false }));
  for (let i = 0; i < 4; i++) g.add(box(0.06, 0.25, 0.06, M.darkWood, Math.cos(i * 1.57) * 0.45, 0.12, Math.sin(i * 1.57) * 0.45));
  const board = box(0.4, 0.7, 0.04, M.lightWood, 0.2, 0.9, -0.3);
  board.rotation.x = 0.3;
  g.add(board);
  for (let i = 0; i < 6; i++) g.add(box(0.36, 0.02, 0.02, MX.steel, 0.2, 0.75 + i * 0.08, -0.25 + i * 0.024, { cast: false }));
  // soap bubbles
  for (let i = 0; i < 5; i++) g.add(sphere(0.06 + i * 0.01, new THREE.MeshStandardMaterial({ color: 0xe8f4ff, transparent: true, opacity: 0.45, roughness: 0.05 }), -0.2 + i * 0.1, 0.84, 0.1 * (i % 2), 6));
  return shadowAll(g);
}

export function buildMangle() {
  const g = new THREE.Group();
  const iron = std(0x2a2a30, { metalness: 0.6 });
  for (const x of [-0.5, 0.5]) {
    g.add(box(0.1, 1.4, 0.6, iron, x, 0.7, 0));
  }
  g.add(cyl(0.12, 0.12, 1.0, 10, M.lightWood, 0, 1.0, 0));
  g.children[g.children.length - 1].rotation.z = Math.PI / 2;
  g.add(cyl(0.12, 0.12, 1.0, 10, M.lightWood, 0, 0.75, 0));
  g.children[g.children.length - 1].rotation.z = Math.PI / 2;
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.04, 5, 16), iron);
  wheel.position.set(0.62, 0.95, 0);
  wheel.rotation.y = Math.PI / 2;
  g.add(wheel);
  g.add(box(0.8, 0.1, 0.5, M.lightWood, 0, 0.45, 0.1));
  g.userData.anim = (t) => {
    wheel.rotation.x = t * 0.6;
  };
  return shadowAll(g);
}

export function buildIroningBoard() {
  const g = new THREE.Group();
  const top = box(1.5, 0.05, 0.4, std(0xd8e0f0), 0, 0.9, 0);
  g.add(top);
  const legA = box(0.04, 1.1, 0.04, MX.darkSteel, -0.2, 0.45, 0);
  legA.rotation.z = 0.5;
  const legB = box(0.04, 1.1, 0.04, MX.darkSteel, 0.2, 0.45, 0);
  legB.rotation.z = -0.5;
  g.add(legA, legB);
  const iron = new THREE.Group();
  iron.add(box(0.28, 0.12, 0.16, MX.black, 0, 0, 0));
  iron.add(box(0.2, 0.04, 0.04, M.darkWood, 0, 0.12, 0));
  iron.position.set(0.4, 0.99, 0);
  g.add(iron);
  return shadowAll(g);
}

export function buildBasket(color = 0xb08a4a) {
  const g = new THREE.Group();
  const wicker = std(color, { roughness: 1 });
  g.add(cyl(0.38, 0.3, 0.55, 10, wicker, 0, 0.28, 0));
  for (let i = 0; i < 4; i++) g.add(cyl(0.39, 0.39, 0.02, 10, std(0x7a5a2a), 0, 0.1 + i * 0.13, 0, { cast: false }));
  const cols = [0xf6f2ea, 0x7a1a28, 0x3a6aaa, 0xf5b8c8];
  cols.forEach((c, i) => g.add(sphere(0.16, std(c, { roughness: 1 }), Math.cos(i * 1.6) * 0.15, 0.58 + (i % 2) * 0.06, Math.sin(i * 1.6) * 0.15, 6)));
  return shadowAll(g);
}

// furniture under a dust sheet: a lumpy draped shape
export function buildDustSheet(w = 1.6, h = 1.2, d = 1.0) {
  const g = new THREE.Group();
  const geo = new THREE.BoxGeometry(w, h, d, 6, 4, 6);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const k = (y + h / 2) / h;
    const sag = Math.sin(x * 5.3 + z * 3.1) * 0.05 * k;
    const flare = (1 - k) * 0.12;
    p.setXYZ(i, x * (1 + flare) + sag, y + Math.sin(x * 7 + z * 4) * 0.04 * k, z * (1 + flare) - sag);
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, MX.sheet);
  m.position.y = h / 2;
  g.add(m);
  return shadowAll(g);
}

export function buildTrunk() {
  const g = new THREE.Group();
  g.add(box(1.3, 0.6, 0.7, std(0x5a2a14), 0, 0.3, 0));
  const lid = cyl(0.35, 0.35, 1.3, 10, std(0x6a3418), 0, 0.6, 0);
  lid.rotation.z = Math.PI / 2;
  lid.scale.set(1, 1, 1);
  g.add(lid);
  for (const x of [-0.45, 0, 0.45]) g.add(box(0.08, 0.95, 0.74, M.brass, x, 0.45, 0, { cast: false }));
  g.add(box(0.14, 0.16, 0.04, M.gold, 0, 0.55, 0.37, { cast: false }));
  return shadowAll(g);
}

export function buildBroomBucket() {
  const g = new THREE.Group();
  g.add(cyl(0.22, 0.18, 0.4, 10, MX.darkSteel, 0, 0.2, 0));
  const broom = new THREE.Group();
  broom.add(cyl(0.025, 0.025, 1.6, 5, M.lightWood, 0, 0.8, 0));
  broom.add(new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.4, 8), std(0xc8a050, { roughness: 1 })));
  broom.children[1].position.y = 0.0;
  broom.children[1].rotation.x = Math.PI;
  broom.position.set(0.3, 0.2, 0);
  broom.rotation.z = -0.25;
  g.add(broom);
  return shadowAll(g);
}

// trapdoor with stone steps descending into darkness
export function buildCellarHatch() {
  const g = new THREE.Group();
  g.add(box(2.4, 0.08, 2.4, M.darkWood, 0, 0.04, 0));
  const hole = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.9), new THREE.MeshBasicMaterial({ color: 0x020203 }));
  hole.rotation.x = -Math.PI / 2;
  hole.position.y = 0.09;
  g.add(hole);
  for (let i = 0; i < 4; i++) g.add(box(1.8, 0.04, 0.3, MX.stone, 0, 0.1, -0.7 + i * 0.32, { cast: false }));
  const door = box(1.9, 0.08, 1.9, std(0x5a2a14), 0, 0.95, -1.1);
  door.rotation.x = -1.2;
  g.add(door);
  g.add(box(0.5, 0.06, 0.06, MX.darkSteel, 0, 1.6, -1.3, { cast: false }));
  const glow = glowSprite(0x6a8aff, 2.2, 0.25);
  glow.position.y = 0.3;
  g.add(glow);
  return shadowAll(g);
}

// top of a staircase seen from above: balustrade around a dark stairwell
export function buildStairHead(w = 3.6, d = 3) {
  const g = new THREE.Group();
  const hole = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color: 0x030306 }));
  hole.rotation.x = -Math.PI / 2;
  hole.position.y = 0.015;
  g.add(hole);
  const steps = 6;
  for (let i = 0; i < steps; i++) g.add(box(w - 0.3, 0.04, d / steps - 0.04, std(0x5a2a14), 0, 0.03, -d / 2 + (i + 0.5) * (d / steps), { cast: false }));
  g.add(box(w - 0.6, 0.02, d, M.velvetRed, 0, 0.06, 0, { cast: false }));
  for (const x of [-w / 2, w / 2]) {
    g.add(box(0.1, 0.1, d, M.darkWood, x, 1.0, 0));
    for (let z = -d / 2; z <= d / 2; z += 0.5) g.add(box(0.05, 1.0, 0.05, M.lightWood, x, 0.5, z, { cast: false }));
    g.add(box(0.2, 1.3, 0.2, M.darkWood, x, 0.65, -d / 2));
    g.add(sphere(0.13, M.gold, x, 1.4, -d / 2, 6));
  }
  return shadowAll(g);
}

// ===================================================================
// UPSTAIRS — bathroom, guest room, nursery, master bedroom, observatory
// ===================================================================
export function buildBathtub() {
  const g = new THREE.Group();
  const tub = cyl(0.6, 0.5, 0.7, 14, MX.ivory, 0, 0.6, 0);
  tub.scale.set(1.8, 1, 1);
  g.add(tub);
  const water = cyl(0.55, 0.55, 0.02, 14, new THREE.MeshStandardMaterial({ color: 0x5a8ac8, transparent: true, opacity: 0.75, roughness: 0.05 }), 0, 0.9, 0, { cast: false });
  water.scale.set(1.8, 1, 1);
  g.add(water);
  for (const [x, z] of [[-0.8, -0.35], [0.8, -0.35], [-0.8, 0.35], [0.8, 0.35]]) g.add(sphere(0.1, M.gold, x, 0.12, z, 6));
  g.add(cyl(0.03, 0.03, 0.5, 5, M.brass, -1.0, 1.1, 0));
  g.add(box(0.2, 0.04, 0.04, M.brass, -0.92, 1.35, 0));
  // rubber duck!
  const duck = new THREE.Group();
  duck.add(sphere(0.1, std(0xffd23a), 0, 0, 0, 6));
  duck.add(sphere(0.07, std(0xffd23a), 0.06, 0.1, 0, 6));
  duck.add(box(0.06, 0.02, 0.04, std(0xff8a3a), 0.13, 0.1, 0));
  duck.position.set(0.2, 0.95, 0.1);
  g.add(duck);
  g.userData.anim = (t) => {
    duck.position.x = 0.2 + Math.sin(t * 0.5) * 0.4;
    duck.position.z = Math.cos(t * 0.4) * 0.2;
    duck.rotation.y = t * 0.5;
    water.position.y = 0.9 + Math.sin(t * 2) * 0.005;
  };
  return shadowAll(g);
}

export function buildToilet() {
  const g = new THREE.Group();
  g.add(cyl(0.18, 0.22, 0.4, 10, MX.ivory, 0, 0.2, 0.1));
  const bowl = cyl(0.25, 0.2, 0.15, 10, MX.ivory, 0, 0.45, 0.15);
  bowl.scale.set(1, 1, 1.3);
  g.add(bowl);
  g.add(box(0.52, 0.04, 0.6, M.darkWood, 0, 0.54, 0.15));
  g.add(box(0.5, 0.4, 0.25, MX.ivory, 0, 0.75, -0.25));
  g.add(cyl(0.02, 0.02, 1.4, 4, M.brass, 0.1, 1.6, -0.3));
  g.add(box(0.6, 0.35, 0.25, MX.ivory, 0, 2.4, -0.3));
  g.add(cyl(0.008, 0.008, 0.8, 4, M.brass, 0.3, 1.9, -0.18, { cast: false }));
  g.add(sphere(0.04, M.porcelain, 0.3, 1.5, -0.18, 5));
  return shadowAll(g);
}

export function buildBathSink() {
  const g = new THREE.Group();
  g.add(cyl(0.1, 0.16, 0.9, 8, MX.ivory, 0, 0.45, 0));
  const basin = cyl(0.35, 0.18, 0.2, 12, MX.ivory, 0, 0.98, 0);
  basin.scale.set(1.2, 1, 0.9);
  g.add(basin);
  g.add(cyl(0.025, 0.025, 0.25, 5, M.brass, 0, 1.2, -0.22));
  const m = buildMirror(0.7, 0.9);
  m.position.set(0, 2.0, -0.38);
  g.add(m);
  g.userData.anim = m.userData.anim;
  return shadowAll(g);
}

export function buildTowelRack() {
  const g = new THREE.Group();
  for (const x of [-0.4, 0.4]) g.add(cyl(0.025, 0.025, 1.3, 5, M.brass, x, 0.65, 0));
  for (const y of [0.9, 1.25]) {
    const bar = cyl(0.02, 0.02, 0.8, 5, M.brass, 0, y, 0);
    bar.rotation.z = Math.PI / 2;
    g.add(bar);
  }
  g.add(box(0.6, 0.7, 0.04, std(0xa8d0f0, { roughness: 1 }), 0, 0.9, 0.03));
  g.add(box(0.5, 0.5, 0.04, std(0xf5b8c8, { roughness: 1 }), 0.05, 1.05, -0.03));
  return shadowAll(g);
}

export function buildBed({ w = 2.2, d = 3.0, sheet = 0xe9e2d0, blanket = 0x7a1a28, posts = false, canopy = 0x4a2a6a } = {}) {
  const g = new THREE.Group();
  g.add(box(w, 0.5, d, M.darkWood, 0, 0.3, 0));
  g.add(box(w - 0.1, 0.35, d - 0.1, std(sheet), 0, 0.72, 0.02));
  g.add(box(w, 0.08, d * 0.62, std(blanket), 0, 0.92, d * 0.18));
  g.add(box(w + 0.02, 0.5, 0.05, std(blanket), 0, 0.7, d * 0.18 + d * 0.31 + 0.02, { cast: false }));
  for (const x of [-w / 4, w / 4]) {
    const pil = sphere(0.35, std(0xf6f2ea), x, 0.98, -d / 2 + 0.45, 8);
    pil.scale.set(1.2, 0.4, 0.75);
    g.add(pil);
  }
  g.add(box(w + 0.2, 1.8, 0.16, M.darkWood, 0, 0.9, -d / 2 - 0.05));
  g.add(box(w + 0.2, 0.9, 0.12, M.darkWood, 0, 0.45, d / 2 + 0.05));
  if (posts) {
    for (const [x, z] of [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]]) g.add(cyl(0.07, 0.07, 3.4, 6, M.darkWood, x, 1.7, z));
    g.add(box(w + 0.2, 0.15, d + 0.2, std(canopy), 0, 3.42, 0));
    const drape = std(canopy, { roughness: 0.95 });
    for (const x of [-w / 2, w / 2]) {
      for (const z of [-d / 2 + 0.25, d / 2 - 0.25]) g.add(cyl(0.18, 0.28, 2.9, 6, drape, x, 1.95, z));
    }
  }
  return shadowAll(g);
}

export function buildWardrobe(color = 0x5a2a14) {
  const g = new THREE.Group();
  const wood = std(color);
  g.add(box(1.8, 2.8, 0.8, wood, 0, 1.4, 0));
  g.add(box(1.95, 0.18, 0.9, M.darkWood, 0, 2.88, 0));
  g.add(box(0.86, 2.3, 0.04, M.wood, -0.45, 1.45, 0.41, { cast: false }));
  g.add(box(0.86, 2.3, 0.04, M.wood, 0.45, 1.45, 0.41, { cast: false }));
  g.add(sphere(0.04, M.brass, -0.08, 1.45, 0.45, 5));
  g.add(sphere(0.04, M.brass, 0.08, 1.45, 0.45, 5));
  // a sleeve sticking out of the door
  g.add(box(0.14, 0.4, 0.14, std(0x3a6aaa), 0.02, 1.0, 0.45));
  return shadowAll(g);
}

export function buildVanity() {
  const g = new THREE.Group();
  g.add(box(1.4, 0.8, 0.55, std(0xf0e8dc), 0, 0.4, 0));
  g.add(box(1.5, 0.06, 0.6, M.gold, 0, 0.82, 0));
  const m = buildMirror(0.8, 1.0);
  m.position.set(0, 1.6, -0.22);
  g.add(m);
  g.add(cyl(0.05, 0.06, 0.18, 6, std(0xff7ad9, { roughness: 0.2 }), -0.45, 0.94, 0.05));
  g.add(cyl(0.06, 0.06, 0.12, 6, std(0x5fd8ff, { roughness: 0.2 }), -0.3, 0.91, 0.1));
  g.add(box(0.25, 0.03, 0.08, M.gold, 0.4, 0.86, 0.1));
  // stool
  g.add(cyl(0.25, 0.25, 0.12, 10, std(0xf5b8c8), 0, 0.5, 0.7));
  for (let i = 0; i < 3; i++) g.add(cyl(0.025, 0.025, 0.5, 4, M.gold, Math.cos(i * 2.1) * 0.18, 0.22, 0.7 + Math.sin(i * 2.1) * 0.18));
  g.userData.anim = m.userData.anim;
  return shadowAll(g);
}

export function buildNightstand({ lampColor = 0xffe0a0 } = {}) {
  const g = new THREE.Group();
  g.add(box(0.6, 0.65, 0.5, M.wood, 0, 0.33, 0));
  g.add(box(0.5, 0.18, 0.02, M.lightWood, 0, 0.45, 0.26, { cast: false }));
  g.add(cyl(0.1, 0.12, 0.25, 8, M.porcelain, 0, 0.78, 0));
  const shade = cyl(0.1, 0.2, 0.22, 8, std(0xf2e2b0, { emissive: 0x6a5020, emissiveIntensity: 0.6 }), 0, 1.0, 0);
  g.add(shade);
  const glow = glowSprite(lampColor, 1.0, 0.5);
  glow.position.y = 0.95;
  g.add(glow);
  g.userData.lampPos = new THREE.Vector3(0, 1.0, 0);
  return shadowAll(g);
}

export function buildCrib() {
  const g = new THREE.Group();
  const wood = std(0xf6f0de);
  g.add(box(1.4, 0.2, 0.8, wood, 0, 0.5, 0));
  g.add(box(1.3, 0.15, 0.7, MX.pastelBlue, 0, 0.66, 0));
  for (const z of [-0.4, 0.4]) {
    g.add(box(1.4, 0.06, 0.06, wood, 0, 1.25, z));
    for (let x = -0.65; x <= 0.66; x += 0.13) g.add(cyl(0.02, 0.02, 0.7, 4, wood, x, 0.9, z, { cast: false }));
  }
  for (const x of [-0.72, 0.72]) g.add(box(0.08, 1.3, 0.85, wood, x, 0.65, 0));
  // rockers
  for (const x of [-0.6, 0.6]) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.04, 4, 12, 0.9), wood);
    r.rotation.set(0, Math.PI / 2, -Math.PI / 2 - 0.45);
    r.position.set(x, 0.95, 0);
    g.add(r);
  }
  const bear = new THREE.Group();
  bear.add(sphere(0.12, std(0xa0682a), 0, 0, 0, 6));
  bear.add(sphere(0.09, std(0xa0682a), 0, 0.16, 0, 6));
  bear.position.set(0.3, 0.86, 0);
  g.add(bear);
  return shadowAll(g);
}

export function buildRockingHorse() {
  const g = new THREE.Group();
  const horse = new THREE.Group();
  const paint = std(0xf6f2ea);
  const body = sphere(0.35, paint, 0, 0.85, 0, 8);
  body.scale.set(1.6, 0.8, 0.7);
  horse.add(body);
  horse.add(box(0.2, 0.5, 0.2, paint, 0.5, 1.15, 0));
  const head = box(0.42, 0.22, 0.2, paint, 0.68, 1.35, 0);
  head.rotation.z = -0.4;
  horse.add(head);
  horse.add(box(0.06, 0.4, 0.22, std(0xd8312e), 0.42, 1.25, 0));
  horse.add(sphere(0.03, MX.black, 0.78, 1.4, 0.1, 4));
  for (const [x, z] of [[-0.35, -0.15], [-0.35, 0.15], [0.35, -0.15], [0.35, 0.15]]) {
    const leg = box(0.08, 0.5, 0.08, paint, x, 0.5, z);
    leg.rotation.z = x > 0 ? -0.3 : 0.3;
    horse.add(leg);
  }
  horse.add(box(0.4, 0.06, 0.36, std(0xd8312e), -0.05, 1.12, 0));
  const tail = box(0.06, 0.4, 0.06, std(0x5a3a20), -0.6, 0.85, 0);
  tail.rotation.z = 0.6;
  horse.add(tail);
  for (const z of [-0.22, 0.22]) {
    const rocker = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.04, 4, 16, 0.9), std(0xd8312e));
    rocker.rotation.z = -Math.PI / 2 - 0.45;
    rocker.position.set(0, 1.5, z);
    horse.add(rocker);
  }
  g.add(horse);
  g.userData.anim = (t) => {
    horse.rotation.z = Math.sin(t * 1.6) * 0.22;
  };
  return shadowAll(g);
}

export function buildToyBlocks() {
  const g = new THREE.Group();
  const cols = [MX.pastelPink, MX.pastelBlue, MX.pastelYellow, MX.pastelGreen, std(0xd8312e)];
  const spots = [[0, 0, 0], [0.32, 0, 0.05], [0.16, 0.3, 0.02], [-0.5, 0, 0.4], [0.6, 0, -0.5], [-0.3, 0, -0.4], [0.62, 0.3, -0.48]];
  spots.forEach(([x, y, z], i) => {
    const b = box(0.3, 0.3, 0.3, cols[i % cols.length], x, y + 0.15, z);
    b.rotation.y = i * 0.7;
    g.add(b);
  });
  const ball = sphere(0.25, std(0xd8312e), -0.9, 0.25, -0.1, 10);
  g.add(ball);
  g.add(box(0.52, 0.02, 0.52, std(0xf6f2ea), -0.9, 0.25, -0.1, { cast: false }));
  return shadowAll(g);
}

// a spinning mobile of stars and moons hanging over the crib
export function buildMobile() {
  const g = new THREE.Group();
  g.add(cyl(0.01, 0.01, 1.0, 4, MX.darkSteel, 0, 0.5, 0, { cast: false }));
  const spin = new THREE.Group();
  spin.add(cyl(0.6, 0.6, 0.02, 10, M.gold, 0, 0, 0, { cast: false }));
  const shapes = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    spin.add(cyl(0.005, 0.005, 0.4, 3, MX.darkSteel, Math.cos(a) * 0.55, -0.2, Math.sin(a) * 0.55, { cast: false }));
    const sh = i % 2 ? new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), glowMatX(0xffe68c, 0.8)) : new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.03, 4, 8, Math.PI * 1.3), glowMatX(0xa8c8f0, 0.6));
    sh.position.set(Math.cos(a) * 0.55, -0.45, Math.sin(a) * 0.55);
    spin.add(sh);
    shapes.push(sh);
  }
  g.add(spin);
  g.userData.anim = (t) => {
    spin.rotation.y = t * 0.5;
    shapes.forEach((s, i) => (s.rotation.y = t * 2 + i));
  };
  return g;
}

export function buildToyShelf() {
  const g = new THREE.Group();
  g.add(box(1.8, 1.6, 0.45, std(0xf6f0de), 0, 0.8, 0));
  for (const y of [0.55, 1.1]) g.add(box(1.7, 0.04, 0.4, std(0xe8dcc8), 0, y, 0.03, { cast: false }));
  // toy soldiers, drum, a jack-in-the-box
  for (let i = 0; i < 4; i++) {
    g.add(cyl(0.05, 0.05, 0.25, 6, std(0xd8312e), -0.7 + i * 0.12, 0.7, 0.05));
    g.add(cyl(0.05, 0.05, 0.1, 6, MX.black, -0.7 + i * 0.12, 0.87, 0.05));
  }
  g.add(cyl(0.16, 0.16, 0.2, 10, std(0x3a6aaa), 0.35, 0.68, 0.05));
  g.add(box(0.3, 0.3, 0.3, MX.pastelYellow, 0.3, 1.27, 0.05));
  const spring = new THREE.Group();
  spring.add(cyl(0.03, 0.03, 0.3, 5, MX.steel, 0, 0.15, 0, { cast: false }));
  spring.add(sphere(0.12, std(0xffd8b0), 0, 0.35, 0, 6));
  spring.add(new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.18, 5), std(0xd8312e)));
  spring.children[2].position.y = 0.5;
  spring.position.set(0.3, 1.42, 0.05);
  g.add(spring);
  g.add(sphere(0.12, MX.pastelPink, -0.4, 1.24, 0.05, 6));
  g.userData.anim = (t) => {
    const pop = Math.max(0, Math.sin(t * 0.8) - 0.85) * 6.6;
    spring.position.y = 1.42 + pop * 0.12;
    spring.rotation.z = Math.sin(t * 8) * 0.2 * pop;
  };
  return shadowAll(g);
}

export function buildTeaTable() {
  const g = buildTable(1.0, 1.0, 0.5, MX.pastelPink, std(0xf6f0de));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    g.add(cyl(0.08, 0.06, 0.08, 8, M.porcelain, Math.cos(a) * 0.3, 0.6, Math.sin(a) * 0.3));
  }
  g.add(sphere(0.13, M.porcelain, 0, 0.66, 0, 8));
  for (let i = 0; i < 2; i++) {
    const chair = new THREE.Group();
    chair.add(box(0.4, 0.06, 0.4, MX.pastelBlue, 0, 0.3, 0));
    chair.add(box(0.4, 0.45, 0.06, MX.pastelBlue, 0, 0.55, -0.17));
    for (const [x, z] of [[-0.16, -0.16], [0.16, -0.16], [-0.16, 0.16], [0.16, 0.16]]) chair.add(box(0.05, 0.3, 0.05, std(0xf6f0de), x, 0.15, z));
    chair.position.set(i ? 0.8 : -0.8, 0, 0);
    chair.rotation.y = i ? -Math.PI / 2 : Math.PI / 2;
    g.add(chair);
  }
  // a teddy guest
  const bear = new THREE.Group();
  bear.add(sphere(0.16, std(0xa0682a), 0, 0.45, 0, 6));
  bear.add(sphere(0.12, std(0xa0682a), 0, 0.68, 0, 6));
  bear.position.set(0.8, 0, 0);
  g.add(bear);
  return shadowAll(g);
}

export function buildTelescope() {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = box(0.07, 1.6, 0.07, M.darkWood, Math.cos(a) * 0.35, 0.75, Math.sin(a) * 0.35);
    leg.rotation.z = Math.cos(a) * 0.25;
    leg.rotation.x = -Math.sin(a) * 0.25;
    g.add(leg);
  }
  const head = new THREE.Group();
  head.position.y = 1.55;
  g.add(head);
  const tilt = new THREE.Group();
  head.add(tilt);
  const tube = cyl(0.2, 0.14, 2.6, 12, M.brass, 0, 0, 0);
  tube.rotation.x = Math.PI / 2;
  tube.position.z = 0.5;
  tilt.add(tube);
  tilt.add(cyl(0.24, 0.24, 0.12, 12, MX.darkSteel, 0, 0, 1.8));
  tilt.children[1].rotation.x = Math.PI / 2;
  tilt.add(cyl(0.06, 0.06, 0.3, 6, MX.darkSteel, 0, 0, -0.9));
  tilt.children[2].rotation.x = Math.PI / 2;
  tilt.rotation.x = -0.5;
  const lens = glowSprite(0xa8c8ff, 0.8, 0.5);
  lens.position.set(0, 0, 1.9);
  tilt.add(lens);
  g.userData.anim = (t) => {
    head.rotation.y = Math.sin(t * 0.15) * 0.8;
    tilt.rotation.x = -0.5 + Math.sin(t * 0.21) * 0.15;
  };
  return shadowAll(g);
}

export function buildArmillary() {
  const g = new THREE.Group();
  g.add(cyl(0.3, 0.4, 0.1, 10, MX.blackMarble, 0, 0.05, 0));
  g.add(cyl(0.06, 0.08, 1.0, 6, M.gold, 0, 0.6, 0));
  const rings = [];
  for (let i = 0; i < 3; i++) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.55 - i * 0.1, 0.025, 4, 24), M.gold);
    r.position.y = 1.5;
    g.add(r);
    rings.push(r);
  }
  g.add(sphere(0.14, glowMatX(0xffc040, 1.3), 0, 1.5, 0, 10));
  const glow = glowSprite(0xffc040, 1.0, 0.6);
  glow.position.y = 1.5;
  g.add(glow);
  g.userData.anim = (t) => {
    rings[0].rotation.set(t * 0.4, t * 0.2, 0);
    rings[1].rotation.set(0, t * 0.6, t * 0.3);
    rings[2].rotation.set(t * 0.8, 0, t * 0.5);
  };
  return shadowAll(g);
}

// ===================================================================
// BASEMENT — wine cellar, boiler room, crypt
// ===================================================================
export function buildWineRack(w = 2.4, h = 2.6) {
  const g = new THREE.Group();
  g.add(box(w, h, 0.6, M.darkWood, 0, h / 2, -0.05));
  const bottles = [];
  const cols = w > 0 ? Math.floor(w / 0.28) : 0;
  const rows = Math.floor((h - 0.2) / 0.28);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if ((r * 7 + c * 3) % 11 === 0) continue;
      bottles.push([-w / 2 + 0.17 + c * 0.28, 0.2 + r * 0.28, (r + c) % 3 === 0]);
    }
  }
  const geo = new THREE.CylinderGeometry(0.07, 0.07, 0.4, 6);
  geo.rotateX(Math.PI / 2);
  const inst = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, flatShading: true }), bottles.length);
  const m4 = new THREE.Matrix4();
  const col = new THREE.Color();
  bottles.forEach(([x, y, green], i) => {
    m4.makeTranslation(x, y, 0.15);
    inst.setMatrixAt(i, m4);
    inst.setColorAt(i, col.setHex(green ? 0x123a1a : 0x3a0a18));
  });
  inst.instanceMatrix.needsUpdate = true;
  if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  g.add(inst);
  for (let r = 0; r <= rows; r++) g.add(box(w - 0.06, 0.03, 0.55, M.wood, 0, 0.06 + r * 0.28, 0, { cast: false }));
  return shadowAll(g);
}

export function buildTastingTable() {
  const g = buildTable(1.6, 0.9, 0.95, M.darkWood);
  for (let i = 0; i < 3; i++) {
    g.add(cyl(0.06, 0.07, 0.4, 6, i % 2 ? MX.bottleGreen : MX.wine, -0.5 + i * 0.25, 1.21, -0.1));
    g.add(cyl(0.02, 0.025, 0.12, 5, i % 2 ? MX.bottleGreen : MX.wine, -0.5 + i * 0.25, 1.46, -0.1));
  }
  for (let i = 0; i < 2; i++) {
    g.add(cyl(0.05, 0.03, 0.1, 6, MX.glass, 0.3 + i * 0.2, 1.12, 0.15, { cast: false }));
    g.add(cyl(0.008, 0.008, 0.1, 4, MX.glass, 0.3 + i * 0.2, 1.03, 0.15, { cast: false }));
  }
  g.add(box(0.4, 0.12, 0.3, std(0xf2d070), 0.4, 1.07, -0.2));
  return shadowAll(g);
}

export function buildLantern() {
  const g = new THREE.Group();
  g.add(cyl(0.01, 0.01, 0.8, 3, MX.darkSteel, 0, 0.4, 0, { cast: false }));
  g.add(cyl(0.14, 0.16, 0.06, 6, MX.darkSteel, 0, 0, 0));
  g.add(cyl(0.12, 0.12, 0.3, 6, MX.glass, 0, -0.18, 0, { cast: false }));
  g.add(cyl(0.16, 0.12, 0.06, 6, MX.darkSteel, 0, -0.36, 0));
  const flame = sphere(0.05, new THREE.MeshBasicMaterial({ color: 0xffd27a }), 0, -0.2, 0, 5);
  g.add(flame);
  const glow = glowSprite(0xffb050, 1.2, 0.6);
  glow.position.y = -0.2;
  g.add(glow);
  g.userData.flames = [glow];
  return g;
}

export function buildBoiler() {
  const g = new THREE.Group();
  const iron = std(0x3a3036, { metalness: 0.7, roughness: 0.45 });
  const tank = cyl(1.3, 1.3, 3.4, 16, iron, 0, 2.2, 0);
  g.add(tank);
  g.add(sphere(1.3, iron, 0, 3.9, 0, 14));
  g.children[1].scale.y = 0.5;
  for (const y of [0.9, 2.2, 3.5]) g.add(cyl(1.36, 1.36, 0.12, 16, MX.copper, 0, y, 0, { cast: false }));
  // rivets
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    g.add(sphere(0.05, MX.copper, Math.cos(a) * 1.33, 1.5, Math.sin(a) * 1.33, 4));
    g.add(sphere(0.05, MX.copper, Math.cos(a) * 1.33, 2.9, Math.sin(a) * 1.33, 4));
  }
  // firebox with a roaring glow
  g.add(box(1.4, 1.0, 0.4, iron, 0, 0.7, 1.25));
  const fire = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.55), new THREE.MeshBasicMaterial({ color: 0xff6a1a }));
  fire.position.set(0, 0.7, 1.46);
  g.add(fire);
  const glow = glowSprite(0xff6a1a, 3.2, 0.75);
  glow.position.set(0, 0.8, 1.7);
  g.add(glow);
  // pressure gauge with a twitching needle
  g.add(cyl(0.28, 0.28, 0.08, 14, MX.copper, 0.75, 2.9, 1.1));
  g.children[g.children.length - 1].rotation.x = Math.PI / 2;
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.22, 14), MX.ivory);
  face.position.set(0.75, 2.9, 1.15);
  g.add(face);
  const needle = box(0.02, 0.18, 0.01, std(0xd8312e), 0, 0.08, 0, { cast: false });
  const np = new THREE.Group();
  np.position.set(0.75, 2.9, 1.16);
  np.add(needle);
  g.add(np);
  // big pipes climbing to the ceiling
  g.add(cyl(0.22, 0.22, 2.0, 8, MX.copper, -0.6, 5.0, 0));
  g.add(cyl(0.16, 0.16, 2.0, 8, MX.copper, 0.6, 5.0, -0.3));
  g.userData.flames = [glow];
  g.userData.anim = (t) => {
    np.rotation.z = -0.8 + Math.sin(t * 0.9) * 0.6 + Math.sin(t * 17) * 0.05;
    fire.material.color.setHSL(0.05 + Math.sin(t * 7) * 0.02, 1, 0.5 + Math.sin(t * 11) * 0.1);
  };
  return shadowAll(g);
}

export function buildPipeRun(len = 6, y = 4.2) {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const p = cyl(0.1 + i * 0.03, 0.1 + i * 0.03, len, 8, i === 1 ? MX.copper : MX.rust, 0, y - i * 0.35, i * 0.32);
    p.rotation.z = Math.PI / 2;
    g.add(p);
    for (let x = -len / 2 + 1; x < len / 2; x += 2) g.add(cyl(0.16 + i * 0.03, 0.16 + i * 0.03, 0.12, 8, MX.darkSteel, x, y - i * 0.35, i * 0.32, { cast: false }));
  }
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.04, 5, 12), std(0xd8312e, { metalness: 0.5 }));
  wheel.position.set(len / 2 - 1.5, y - 0.35, 0.62);
  g.add(wheel);
  g.children.forEach((c) => (c.castShadow = false));
  return g;
}

export function buildCoalPile() {
  const g = new THREE.Group();
  const geo = new THREE.DodecahedronGeometry(0.16, 0);
  const inst = new THREE.InstancedMesh(geo, MX.coal, 70);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  for (let i = 0; i < 70; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * 1.1;
    const h = Math.max(0.08, (1.1 - r) * 0.8) * Math.random() + 0.08;
    q.setFromEuler(new THREE.Euler(Math.random() * 3, Math.random() * 3, 0));
    m4.compose(new THREE.Vector3(Math.cos(a) * r, h, Math.sin(a) * r), q, new THREE.Vector3(1, 1, 1).multiplyScalar(0.7 + Math.random() * 0.8));
    inst.setMatrixAt(i, m4);
  }
  inst.instanceMatrix.needsUpdate = true;
  g.add(inst);
  const mound = sphere(1.0, MX.coal, 0, 0, 0, 8);
  mound.scale.set(1.1, 0.45, 1.1);
  g.add(mound);
  return shadowAll(g);
}

export function buildSarcophagus(color = 0x8a7a5a) {
  const g = new THREE.Group();
  const stone = std(color, { roughness: 0.9 });
  g.add(box(1.2, 0.9, 2.6, stone, 0, 0.45, 0));
  g.add(box(1.3, 0.2, 2.7, stone, 0, 1.0, 0));
  const lid = new THREE.Group();
  lid.add(box(1.0, 0.18, 2.3, stone, 0, 1.19, 0));
  lid.add(sphere(0.26, stone, 0, 1.38, -0.75, 6));
  const body = box(0.5, 0.18, 1.2, stone, 0, 1.36, 0.15);
  lid.add(body);
  lid.add(box(0.7, 0.08, 0.1, M.gold, 0, 1.3, 0.9, { cast: false }));
  lid.rotation.y = 0.12;
  lid.position.x = 0.15;
  g.add(lid);
  return shadowAll(g);
}

export function buildFloorCandelabra() {
  const g = new THREE.Group();
  g.add(cyl(0.25, 0.3, 0.08, 8, MX.darkSteel, 0, 0.04, 0));
  g.add(cyl(0.04, 0.05, 1.7, 6, MX.darkSteel, 0, 0.9, 0));
  const flames = [];
  for (let i = 0; i < 3; i++) {
    const x = (i - 1) * 0.3;
    g.add(box(Math.abs(x) + 0.05, 0.04, 0.04, MX.darkSteel, x / 2, 1.7, 0, { cast: false }));
    g.add(cyl(0.04, 0.04, 0.25, 6, M.candle, x, 1.84, 0, { cast: false }));
    const s = glowSprite(0xffb050, 0.6, 0.6);
    s.position.set(x, 2.02, 0);
    g.add(s);
    flames.push(s);
  }
  g.userData.flames = flames;
  return g;
}

export function buildUrn() {
  const g = new THREE.Group();
  const urn = new THREE.Mesh(new THREE.LatheGeometry([
    new THREE.Vector2(0, 0), new THREE.Vector2(0.25, 0.02), new THREE.Vector2(0.2, 0.15), new THREE.Vector2(0.38, 0.55),
    new THREE.Vector2(0.3, 0.9), new THREE.Vector2(0.18, 1.0), new THREE.Vector2(0.24, 1.08),
  ], 10), std(0x5a6a5a, { roughness: 0.6 }));
  urn.castShadow = true;
  g.add(urn);
  return g;
}

export function buildTreasurePile() {
  const g = new THREE.Group();
  const coinGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.03, 8);
  const inst = new THREE.InstancedMesh(coinGeo, std(0xffd23a, { metalness: 0.85, roughness: 0.3, emissive: 0x3a2a00 }), 90);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  for (let i = 0; i < 90; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * 0.9;
    q.setFromEuler(new THREE.Euler(Math.random() - 0.5, Math.random() * 3, Math.random() - 0.5));
    m4.compose(new THREE.Vector3(Math.cos(a) * r, (0.9 - r) * 0.5 + 0.03, Math.sin(a) * r), q, new THREE.Vector3(1, 1, 1));
    inst.setMatrixAt(i, m4);
  }
  inst.instanceMatrix.needsUpdate = true;
  g.add(inst);
  for (let i = 0; i < 4; i++) {
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), glowMatX([0x5fd8ff, 0xff4f7a, 0x6fd36a, 0xb06aff][i], 1.2));
    gem.position.set(Math.cos(i * 1.6) * 0.35, 0.35, Math.sin(i * 1.6) * 0.35);
    g.add(gem);
  }
  const glow = glowSprite(0xffd23a, 2.2, 0.35);
  glow.position.y = 0.4;
  g.add(glow);
  return g;
}

// cobweb strung across a corner (vertical plane)
export function buildCobweb(size = 1.6) {
  const tex = propTexture('cobweb', 128, 128, (c, w, h) => {
    c.strokeStyle = 'rgba(230,235,245,0.55)';
    c.lineWidth = 1.2;
    for (let i = 0; i < 9; i++) {
      const a = (i / 8) * (Math.PI / 2);
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(Math.cos(a) * w * 1.2, Math.sin(a) * h * 1.2);
      c.stroke();
    }
    for (let r = 16; r < w * 1.2; r += 14) {
      c.beginPath();
      for (let i = 0; i <= 8; i++) {
        const a = (i / 8) * (Math.PI / 2);
        const rr = r + Math.sin(i * 2.3 + r) * 3;
        const x = Math.cos(a) * rr;
        const y = Math.sin(a) * rr;
        if (i === 0) c.moveTo(x, y);
        else c.quadraticCurveTo(Math.cos(a - 0.1) * (rr - 4), Math.sin(a - 0.1) * (rr - 4), x, y);
      }
      c.stroke();
    }
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  return m;
}

// round rug with a painted star map
export function buildStarRug(r = 2.4) {
  const tex = propTexture('starrug', 128, 128, (c, w, h) => {
    c.fillStyle = '#0a1030';
    c.beginPath();
    c.arc(64, 64, 63, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#c9952e';
    c.lineWidth = 4;
    c.stroke();
    c.lineWidth = 1;
    c.beginPath();
    c.arc(64, 64, 44, 0, Math.PI * 2);
    c.stroke();
    let s = 9;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 60; i++) {
      const a = rnd() * Math.PI * 2;
      const rr = rnd() * 58;
      c.fillStyle = rnd() < 0.2 ? '#ffe68c' : '#e8eeff';
      c.fillRect(64 + Math.cos(a) * rr, 64 + Math.sin(a) * rr, 2, 2);
    }
    c.fillStyle = '#ffe68c';
    c.beginPath();
    c.arc(64, 64, 8, 0, Math.PI * 2);
    c.fill();
  });
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 32), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 1 }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.014;
  m.receiveShadow = true;
  return m;
}
