// Parks described by analytic heightfields so physics and mesh always agree.
// Each map lists quarterpipes, boxes, wedges, pits, rails, gaps, collectibles, goals and its own scenery.
import * as THREE from 'https://unpkg.com/three@0.180.0/build/three.module.js';

const PHI = 82 * Math.PI / 180;
const box = (x1, x2, z1, z2) => ({ x1, x2, z1, z2 });

// Quarterpipe: wall line `w` on `axis`, flat ground on side `n`, spanning [a, b] along the other axis.
function QP(axis, w, n, a, b, R, deck) {
  return { axis, w, n, a, b, R, deck, lipH: R * (1 - Math.cos(PHI)), lipD: R - R * Math.sin(PHI) };
}
function qpD(q, x, z) {
  const c = q.axis === 'x' ? x : z, o = q.axis === 'x' ? z : x;
  if (o < q.a || o > q.b) return null;
  return (c - q.w) * q.n;
}
function qpH(q, x, z) {
  const d = qpD(q, x, z);
  if (d === null || d < -q.deck || d >= q.R) return 0;
  if (d < q.lipD) return q.lipH;
  return q.R - Math.sqrt(q.R * q.R - (q.R - d) * (q.R - d));
}
function copings(qps, inset) {
  return qps.map(q => {
    const c = q.w + q.n * (q.lipD - 0.06), y = q.lipH + 0.04, a = q.a + inset, b = q.b - inset;
    const pa = q.axis === 'x' ? [c, y, a] : [a, y, c], pb = q.axis === 'x' ? [c, y, b] : [b, y, c];
    return { a: pa, b: pb, name: 'Coping', coping: true, inward: q.axis === 'x' ? [q.n, 0] : [0, q.n] };
  });
}
const SCORE_GOALS = [
  { id: 'high', label: 'High Score: 15,000' },
  { id: 'pro', label: 'Pro Score: 40,000' },
  { id: 'sick', label: 'Sick Score: 100,000' },
  { id: 'skate', label: 'Collect S-K-A-T-E' },
];

// ---------------- Biscotto Plaza ----------------
const plazaQPs = [QP('x', -30, 1, -34, 34, 4, 5), QP('x', 30, -1, -34, 34, 4, 5), QP('z', -30, 1, -34, 34, 4, 5), QP('z', 30, -1, -34, 34, 4, 5)];
const PLAZA = {
  id: 'plaza', name: 'Biscotto Plaza', tag: 'Seaside street park',
  blurb: 'An open-air bowl on the Biscotto Isles: kicker, funbox, the Pit of Zenith, the gold Biscotto Rail, and stairs with a handrail.',
  bx: 33.6, bz: 33.6, start: { x: 0, z: 22, h: Math.PI }, respawn: { x: 4.5, z: 9, h: Math.PI / 2 },
  sky: '#ffe7bf', hemi: ['#fff6e0', '#d9b98a', 1.6], sunI: 2.2,
  qps: plazaQPs,
  boxes: [
    { x1: -4, x2: 4, z1: -3, z2: 3, h: 1.0, col: '#2c9a58' },
    { x1: -12, x2: -6, z1: -22, z2: -20.5, h: 0.6, col: '#b9a98a' },
    { x1: 2, x2: 12, z1: -24, z2: -18, h: 1.2, col: '#f2dcb0' },
    { x1: 2, x2: 12, z1: -18, z2: -17.25, h: 0.9, col: '#e7d7b8' },
    { x1: 2, x2: 12, z1: -17.25, z2: -16.5, h: 0.6, col: '#f2dcb0' },
    { x1: 2, x2: 12, z1: -16.5, z2: -15.75, h: 0.3, col: '#e7d7b8' },
  ],
  wedges: [
    { x1: -4, x2: 4, z1: 3, z2: 6, h: 1, axis: 'z', up: -1 },
    { x1: -4, x2: 4, z1: -6, z2: -3, h: 1, axis: 'z', up: 1 },
    { x1: -3, x2: 3, z1: 14, z2: 16.5, h: 0.7, axis: 'z', up: -1 },
    { x1: 6, x2: 10, z1: -6, z2: 6, h: 1.1, axis: 'x', up: 1 },
    { x1: 18, x2: 21.5, z1: -6, z2: 6, h: 1.1, axis: 'x', up: -1 },
    { x1: -2, x2: 2, z1: -24, z2: -18, h: 1.2, axis: 'x', up: 1 },
  ],
  wedgeCol: '#e5392b', rampCol: '#f6cf86', deckCol: '#e7d7b8',
  pits: [{ x1: 10, x2: 18, z1: -6, z2: 6, waterY: -1.2, water: '#4fb3d9', floor: '#3f7f9c' }],
  rails: [
    { a: [0, 1.32, -2.7], b: [0, 1.32, 2.7], name: 'Funbox Rail' },
    { a: [-20, 0.7, -18], b: [-20, 0.7, 10], name: 'Biscotto Rail', long: true },
    { a: [-12, 0.62, -21.25], b: [-6, 0.62, -21.25], name: 'Nonna’s Ledge', ledge: true },
    { a: [11.2, 1.75, -19], b: [11.2, 0.45, -14.8], name: 'Hubba Handrail' },
    ...copings(plazaQPs, 8),
  ],
  gaps: [
    { name: 'Pit of Zenith', pts: 500, a: box(5, 10.3, -6.5, 6.5), b: box(17.7, 25, -7, 7), goal: 'gap' },
    { name: 'Over the Funbox', pts: 250, a: box(-4.5, 4.5, 2.8, 6.5), b: box(-5, 5, -9, -3.1) },
    { name: 'Kicker to Funbox', pts: 150, a: box(-3.5, 3.5, 13.5, 17), b: box(-4, 4, -3, 3), oneway: true },
    { name: 'Stair Set', pts: 150, a: box(2, 12, -24, -17.9), b: box(1, 13, -15.7, -8), oneway: true },
  ],
  letters: [['S', 0, 1.5, 11], ['K', 0, 2.8, 0], ['A', 14, 2.3, 0], ['T', -20, 2.3, -4], ['E', 7, 2.2, -16.5]],
  collect: [[-14, 0.9, 14], [-10, 2.6, -29.4], [8, 2.0, 0], [-9, 1.9, -21.25], [29.3, 2.7, -10]],
  collectKind: 'shell', collectIcon: '🐚',
  tape: [12, 4 * (1 - Math.cos(PHI)) + 3.2, 29.85],
  smash: [[-6, 18], [6, 18], [-14, 0], [24, 12], [-24, 14], [6, -9], [22, -14]], smashKind: 'crate',
  splash: 'Splash!',
  goals: [...SCORE_GOALS,
    { id: 'collect', label: 'Find 5 Golden Shells' },
    { id: 'smash', label: 'Smash 5 Grumbleclaw crates' },
    { id: 'gap', label: 'Jump the Pit of Zenith' },
    { id: 'rail', label: 'Grind the whole Biscotto Rail' },
    { id: 'combo', label: 'Land a 5 trick combo' },
    { id: 'tape', label: 'Get the Secret Tape (high above the Claw Reef quarterpipe)' },
  ],
  floor(x, z) { const s = (Math.abs(((x + 100) % 4) - 0.02) < 0.12 || Math.abs(((z + 100) % 4) - 0.02) < 0.12); return s ? '#dcc9a5' : '#efe2c6'; },
  banners: [['WIDR 64', '#e5392b', '#ffc531', 0, -33.9, 0], ['CLAW REEF', '#5b2a6e', '#ffc531', 0, 33.9, Math.PI], ['NONNA’S PIZZA', '#2c9a58', '#fff8ea', -33.9, 0, Math.PI / 2], ['PIT OF ZENITH', '#1f1a2e', '#e5392b', 33.9, 0, -Math.PI / 2]],
  decor: decorPlaza,
};

// ---------------- The Hangar ----------------
const hangarQPs = [
  QP('z', -36, 1, -26, 26, 4, 4.5), QP('z', 36, -1, -26, 26, 4, 4.5),   // end walls
  QP('x', -8, 1, -12, 12, 3.5, 3), QP('x', 8, -1, -12, 12, 3.5, 3),      // the big halfpipe
];
const HP_LIP = 3.5 * (1 - Math.cos(PHI));
const HANGAR = {
  id: 'hangar', name: 'The Hangar', tag: 'Indoor aircraft hangar',
  blurb: 'Inspired by the first level of THPS1. A big halfpipe down the middle, a parked WIDR Air prop plane with rideable wings, a crate stack, a maintenance pit and a long catwalk rail.',
  bx: 23.4, bz: 39.6, start: { x: 0, z: -28, h: 0 }, respawn: { x: 15, z: -26, h: 0 },
  sky: '#efe6d4', hemi: ['#ffffff', '#cfc4b0', 1.9], sunI: 1.6,
  qps: hangarQPs,
  boxes: [
    { x1: -1.5, x2: 1.5, z1: 18, z2: 31, h: 2.6, col: '#f4f1ea' },          // fuselage
    { x1: -10, x2: 10, z1: 22, z2: 25, h: 1.3, col: '#c9d6e3' },            // wings
    { x1: -18, x2: -13, z1: -6, z2: 0, h: 0.9, col: '#c98b4b' },            // crate stack
    { x1: -24, x2: -22.3, z1: -20, z2: 20, h: 0.55, col: '#9aa3b5' },       // bench ledge
  ],
  wedges: [
    { x1: -9, x2: -3, z1: 18.5, z2: 22, h: 1.3, axis: 'z', up: 1 },
    { x1: 3, x2: 9, z1: 18.5, z2: 22, h: 1.3, axis: 'z', up: 1 },
    { x1: -18, x2: -13, z1: 0, z2: 2.5, h: 0.9, axis: 'z', up: -1 },
    { x1: -18, x2: -13, z1: -8.5, z2: -6, h: 0.9, axis: 'z', up: 1 },
    { x1: 12, x2: 18, z1: -23, z2: -19, h: 1.0, axis: 'z', up: 1 },
    { x1: 12, x2: 18, z1: -14.5, z2: -11.5, h: 1.0, axis: 'z', up: -1 },
  ],
  wedgeCol: '#ffc531', rampCol: '#b8c7d6', deckCol: '#8a96a8',
  pits: [{ x1: 12, x2: 18, z1: -19, z2: -14.5, waterY: -1.4, water: '#3a3346', floor: '#2a2433' }],
  rails: [
    { a: [-15.5, 1.22, -5.7], b: [-15.5, 1.22, -0.3], name: 'Crate Rail' },
    { a: [21.5, 0.9, -30], b: [21.5, 0.9, 30], name: 'Catwalk Rail', long: true },
    { a: [-22.35, 0.57, -19.7], b: [-22.35, 0.57, 19.7], name: 'Bench Ledge', ledge: true },
    { a: [-10, 1.36, 22.05], b: [-1.7, 1.36, 22.05], name: 'Wing Edge' },
    { a: [1.7, 1.36, 22.05], b: [10, 1.36, 22.05], name: 'Wing Edge' },
    ...copings(hangarQPs, 1.2),
  ],
  gaps: [
    { name: 'Maintenance Pit', pts: 400, a: box(11.5, 18.5, -23.5, -18.9), b: box(11.5, 18.5, -14.6, -9), goal: 'gap' },
    { name: 'Wing Drop', pts: 200, a: box(-10, 10, 22, 25), b: box(-12, 12, 25.1, 31), oneway: true, minAir: 20 },
    { name: 'Kicker to Wing', pts: 150, a: box(-9, 9, 18.5, 22), b: box(-10, 10, 22, 25), oneway: true, minAir: 20 },
    { name: 'Crate Stack Hop', pts: 200, a: box(-18, -13, 0, 2.6), b: box(-18, -13, -9, -6.1) },
  ],
  hangTime: 80,
  letters: [['S', 0, 1.6, -24], ['K', -15.5, 2.7, -3], ['A', -6.5, 2.2, 6], ['T', 21.5, 2.6, 10], ['E', 6, 2.8, 23.5]],
  collect: [[-12, 1.0, -28], [15, 2.4, -16.7], [-6, 2.8, 23.5], [-22.35, 1.7, -10], [6.5, 1.9, -6]],
  collectKind: 'wing', collectIcon: '✈',
  tape: [-7.9, HP_LIP + 3.0, 0],
  smash: [[-6, -28], [6, -28], [-20, -25], [18, -4], [-4, 14], [14, 8], [-20, 28]], smashKind: 'barrel',
  splash: 'Oil slick!',
  goals: [...SCORE_GOALS,
    { id: 'collect', label: 'Collect 5 Pilot Wings' },
    { id: 'smash', label: 'Knock over 5 oil barrels' },
    { id: 'gap', label: 'Jump the Maintenance Pit' },
    { id: 'rail', label: 'Grind the whole Catwalk Rail' },
    { id: 'hang', label: 'Get 3 Hang Time bonuses (stay airborne)' },
    { id: 'tape', label: 'Get the Secret Tape (high above the halfpipe)' },
  ],
  floor(x, z) {
    if (Math.abs(Math.abs(x) - 20) < 0.12 || (Math.abs(x) < 0.12 && z < -14)) return '#ffc531';
    return (Math.abs(((x + 100) % 6) - 0.02) < 0.1 || Math.abs(((z + 100) % 6) - 0.02) < 0.1) ? '#bdb6a6' : '#d9d3c4';
  },
  banners: [['HANGAR 64', '#1f1a2e', '#ffc531', 0, -40.3, 0], ['WIDR AIR', '#e5392b', '#fff8ea', 0, 40.3, Math.PI]],
  decor: decorHangar,
};

export const MAPS = { plaza: PLAZA, hangar: HANGAR };
export const MAP_LIST = [PLAZA, HANGAR];
let M = PLAZA;
export const map = () => M;
export function setMap(id) { M = MAPS[id] || PLAZA; }

// ---------------- queries ----------------
function inside(o, x, z) { return x >= o.x1 && x <= o.x2 && z >= o.z1 && z <= o.z2; }
function wedgeH(w, x, z) {
  const t = w.axis === 'x' ? (x - w.x1) / (w.x2 - w.x1) : (z - w.z1) / (w.z2 - w.z1);
  return w.h * (w.up > 0 ? t : 1 - t);
}
export function pitAt(x, z) { for (const p of M.pits) if (x > p.x1 && x < p.x2 && z > p.z1 && z < p.z2) return p; return null; }
export function inPit(x, z) { return !!pitAt(x, z); }
export function H(x, z) {
  let h = inPit(x, z) ? -4 : 0;
  for (const q of M.qps) h = Math.max(h, qpH(q, x, z));
  for (const b of M.boxes) if (inside(b, x, z)) h = Math.max(h, b.h);
  for (const w of M.wedges) if (inside(w, x, z)) h = Math.max(h, wedgeH(w, x, z));
  return h;
}
export function grad(x, z) {
  const e = 0.04;
  return [(H(x + e, z) - H(x - e, z)) / (2 * e), (H(x, z + e) - H(x, z - e)) / (2 * e)];
}
export function inBox(b, x, z) { return x >= b.x1 && x <= b.x2 && z >= b.z1 && z <= b.z2; }
export function makeItems() {
  const items = M.letters.map(([ch, x, y, z]) => ({ kind: 'letter', ch, x, y, z }));
  M.collect.forEach(([x, y, z]) => items.push({ kind: 'collect', x, y, z }));
  items.push({ kind: 'tape', x: M.tape[0], y: M.tape[1], z: M.tape[2] });
  return items;
}
export function makeCrates() { return M.smash.map(([x, z]) => ({ x, z, y: H(x, z), broken: false })); }

// ---------------- mesh ----------------
function regionColor(x, z, h) {
  const pit = pitAt(x, z); if (pit) return pit.floor;
  for (const b of M.boxes) if (inside(b, x, z) && Math.abs(h - b.h) < 0.02) return b.col;
  for (const w of M.wedges) if (inside(w, x, z) && h > 0.01) return M.wedgeCol;
  for (const q of M.qps) {
    const d = qpD(q, x, z); if (d === null || d < -q.deck || d >= q.R) continue;
    if (h > 0.01) return d < q.lipD ? M.deckCol : M.rampCol;
  }
  return M.floor(x, z);
}
function labelTexture(text, bg, fg, w = 512, h = 128, font = 84) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = fg; g.font = `${font}px Impact, "Arial Narrow Bold", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + 4);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const lam = c => new THREE.MeshLambertMaterial({ color: c });

export function buildWorld(items, crates) {
  const root = new THREE.Group();
  const W = 2 * (M.bx + 2), D = 2 * (M.bz + 2);
  const geo = new THREE.PlaneGeometry(W, D, Math.round(W / 0.2), Math.round(D / 0.2));
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, cols = new Float32Array(pos.count * 3), col = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), h = H(x, z);
    pos.setY(i, h);
    col.set(regionColor(x, z, h)); cols[i * 3] = col.r; cols[i * 3 + 1] = col.g; cols[i * 3 + 2] = col.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  ground.receiveShadow = true; root.add(ground);

  M.decor(root);

  for (const p of M.pits) {
    const water = new THREE.Mesh(new THREE.PlaneGeometry(p.x2 - p.x1, p.z2 - p.z1), new THREE.MeshLambertMaterial({ color: p.water, transparent: true, opacity: 0.88 }));
    water.rotation.x = -Math.PI / 2; water.position.set((p.x1 + p.x2) / 2, p.waterY, (p.z1 + p.z2) / 2); root.add(water);
  }

  const steel = lam('#c2c9d6'), gold = lam('#ffc531'), ink = lam('#1f1a2e');
  for (const r of M.rails) {
    const a = new THREE.Vector3(...r.a), b = new THREE.Vector3(...r.b), len = a.distanceTo(b);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, len, 8), r.long ? gold : steel);
    m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    m.castShadow = true; root.add(m);
    if (r.coping || r.ledge) continue;
    const posts = Math.max(2, Math.round(len / 3));
    for (let i = 0; i <= posts; i++) {
      const p = a.clone().lerp(b, i / posts), gy = H(p.x, p.z), ph = p.y - gy;
      if (ph < 0.05) continue;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, ph, 6), ink);
      post.position.set(p.x, gy + ph / 2, p.z); root.add(post);
    }
  }

  for (const [t, bg, fg, x, z, ry] of M.banners) {
    const y = M.id === 'hangar' ? 7 : 4 * (1 - Math.cos(PHI)) + 3.2;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(12, 3), new THREE.MeshBasicMaterial({ map: labelTexture(t, bg, fg) }));
    m.position.set(x, y, z); m.rotation.y = ry; root.add(m);
    const back = new THREE.Mesh(new THREE.BoxGeometry(12.4, 3.4, 0.2), ink); back.position.set(x, y, z); back.rotation.y = ry; back.translateZ(-0.12); root.add(back);
  }

  if (M.smashKind === 'crate') {
    const crateMat = new THREE.MeshLambertMaterial({ map: labelTexture('🦀', '#c98b4b', '#e5392b', 128, 128, 80) });
    for (const c of crates) { c.mesh = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), crateMat); c.mesh.position.set(c.x, c.y + 0.45, c.z); c.mesh.castShadow = true; root.add(c.mesh); }
  } else {
    const red = lam('#e5392b'), band = lam('#ffc531');
    for (const c of crates) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.0, 16), red); body.position.y = 0.5; body.castShadow = true;
      for (const y of [0.25, 0.75]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.07, 16), band); b.position.y = y; g.add(b); }
      g.add(body); g.position.set(c.x, c.y, c.z); root.add(g); c.mesh = g;
    }
  }

  for (const it of items) {
    let m;
    if (it.kind === 'letter') m = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 0.15), new THREE.MeshBasicMaterial({ map: labelTexture(it.ch, '#ffc531', '#1f1a2e', 128, 128, 110) }));
    else if (it.kind === 'collect' && M.collectKind === 'shell') { m = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.6, 9), new THREE.MeshLambertMaterial({ color: '#ffcf3a', emissive: '#7a5200' })); m.rotation.x = Math.PI; }
    else if (it.kind === 'collect') {
      m = new THREE.Group(); const gm = new THREE.MeshLambertMaterial({ color: '#ffcf3a', emissive: '#7a5200' });
      for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.22), gm); w.position.x = s * 0.33; w.rotation.z = s * 0.25; m.add(w); }
      m.add(new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), gm));
    } else {
      m = new THREE.Group();
      m.add(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.15), new THREE.MeshBasicMaterial({ map: labelTexture('TAPE', '#1f1a2e', '#e5392b', 256, 160, 90) })));
      m.add(new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.05, 8, 32), new THREE.MeshBasicMaterial({ color: '#ffc531' })));
    }
    m.position.set(it.x, it.y, it.z); root.add(m); it.mesh = m;
  }
  return root;
}

// ---------------- scenery ----------------
function decorPlaza(root) {
  const lipH = 4 * (1 - Math.cos(PHI)), wallMat = lam('#e5392b');
  [[0, -34.5, 70, 1], [0, 34.5, 70, 1], [-34.5, 0, 1, 70], [34.5, 0, 1, 70]].forEach(([x, z, w, d]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 1.2, d), wallMat); m.position.set(x, lipH + 0.6, z); m.castShadow = true; root.add(m);
  });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), lam('#8fd0e6')); sea.rotation.x = -Math.PI / 2; sea.position.y = -3; root.add(sea);
  const sand = new THREE.Mesh(new THREE.CylinderGeometry(58, 64, 4, 40), lam('#efd29a')); sand.position.y = -2.2; root.add(sand);
  const pastel = ['#f7b9a6', '#ffe0a3', '#bfe3c9', '#f5cfe0', '#ffd2a1', '#c9e1f2'];
  for (let i = 0; i < 34; i++) {
    const a = (i / 34) * Math.PI * 2, r = 44 + (i % 3) * 4, hgt = 5 + ((i * 7) % 5) * 2.2, w = 5 + (i % 2) * 2;
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, hgt, w), lam(pastel[i % pastel.length]));
    b.position.set(Math.cos(a) * r, hgt / 2 - 0.5, Math.sin(a) * r); b.rotation.y = -a; root.add(b);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.5, w + 0.6), lam('#c7553f'));
    roof.position.set(b.position.x, hgt - 0.3, b.position.z); roof.rotation.y = -a; root.add(roof);
  }
  for (let i = 0; i < 6; i++) {
    const a = i * 1.1 + 0.4, isl = new THREE.Mesh(new THREE.SphereGeometry(30 + i * 6, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), lam(i % 2 ? '#9cc98d' : '#b5d69a'));
    isl.scale.y = 0.35; isl.position.set(Math.cos(a) * 220, -3, Math.sin(a) * 220); root.add(isl);
  }
  const sun = new THREE.Mesh(new THREE.SphereGeometry(18, 24, 16), new THREE.MeshBasicMaterial({ color: '#ffd24d', fog: false }));
  sun.position.set(-160, 90, -260); root.add(sun);
}

function decorHangar(root) {
  const wall = new THREE.MeshLambertMaterial({ color: '#e3e8ee', side: THREE.DoubleSide });
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.6, 9, 84), wall); w.position.set(s * 24.3, 4.5, 0); root.add(w);
    const e = new THREE.Mesh(new THREE.BoxGeometry(50, 9, 0.6), wall); e.position.set(0, 4.5, s * 41.8); root.add(e);
    for (let i = 0; i < 6; i++) { // high windows
      const win = new THREE.Mesh(new THREE.PlaneGeometry(8, 2), new THREE.MeshBasicMaterial({ color: '#cfeaf7' }));
      win.position.set(s * 23.95, 7.2, -30 + i * 12); win.rotation.y = -s * Math.PI / 2; root.add(win);
    }
  }
  // arched roof + ribs
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(24.6, 24.6, 84, 40, 1, true, Math.PI / 2, Math.PI), new THREE.MeshLambertMaterial({ color: '#d4dbe3', side: THREE.BackSide }));
  roof.rotation.x = Math.PI / 2; roof.scale.set(1, 1, 0.38); roof.position.y = 9; root.add(roof);
  for (let i = -3; i <= 3; i++) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(24.4, 0.18, 6, 40, Math.PI), lam('#e5392b'));
    rib.scale.set(1, 0.38, 1); rib.position.set(0, 9, i * 12); root.add(rib);
  }
  // hanging lights
  for (let i = -2; i <= 2; i++) for (const x of [-10, 10]) {
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.9, 0.5, 12), new THREE.MeshBasicMaterial({ color: '#fff3c4' }));
    l.position.set(x, 13.5, i * 15); root.add(l);
  }
  // WIDR Air prop plane sitting on the fuselage + wing boxes
  const white = lam('#f4f1ea'), red = lam('#e5392b'), ink = lam('#1f1a2e');
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.0, 13, 20), white); body.rotation.x = Math.PI / 2; body.position.set(0, 1.3, 24.5); body.castShadow = true; root.add(body);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(1.3, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), red); nose.rotation.x = -Math.PI / 2; nose.position.set(0, 1.3, 18); root.add(nose);
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(1.32, 1.12, 9, 20, 1, true), red); stripe.rotation.x = Math.PI / 2; stripe.position.set(0, 1.3, 25.5); stripe.scale.set(1, 1, 0.12); root.add(stripe);
  for (const a of [0, Math.PI / 2]) { const prop = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.22, 0.08), ink); prop.position.set(0, 1.3, 16.7); prop.rotation.z = a; root.add(prop); }
  const wings = new THREE.Mesh(new THREE.BoxGeometry(20, 0.3, 3), white); wings.position.set(0, 1.15, 23.5); wings.castShadow = true; root.add(wings);
  for (const s of [-1, 1]) { const tip = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.32, 3.02), red); tip.position.set(s * 9.4, 1.16, 23.5); root.add(tip); }
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2.6, 2.2), red); fin.position.set(0, 3.2, 30.2); root.add(fin);
  const stab = new THREE.Mesh(new THREE.BoxGeometry(6, 0.18, 1.6), white); stab.position.set(0, 2.0, 30.3); root.add(stab);
  const label = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 1), new THREE.MeshBasicMaterial({ map: labelTexture('WIDR AIR', '#f4f1ea', '#e5392b') }));
  label.position.set(1.33, 1.6, 26); label.rotation.y = Math.PI / 2; root.add(label);
  const label2 = label.clone(); label2.position.x = -1.33; label2.rotation.y = -Math.PI / 2; root.add(label2);
  // stacked crates decor + tool carts along walls
  for (let i = 0; i < 5; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), lam(i % 2 ? '#c98b4b' : '#b77a3e')); c.position.set(22.6, 0.7 + (i % 2) * 1.4, -34 + i * 0.3); root.add(c); }
}
