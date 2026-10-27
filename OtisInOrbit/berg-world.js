import { THREE, scene, toon, addOutline, V3, label } from './core.js?v=muis1';
import { addCookie, line, circle } from './cookies.js?v=muis1';
import { groundAt, kindAt, riverZ, PAL, SUMMIT, PLATEAU_H } from './berg-terrain.js?v=muis1';

// ---------- bright mountain day (the opposite of the Mistmaan) ----------
scene.fog = new THREE.FogExp2(0xdbe9f7, 0.0055);
const hemi = scene.children.find((o) => o.isHemisphereLight);
hemi.color.setHex(0xfff6e8); hemi.groundColor.setHex(0x9bb88a); hemi.intensity = 1.7;
const sunL = scene.children.find((o) => o.isDirectionalLight);
sunL.color.setHex(0xfff1dc); sunL.intensity = 2.5;

export const boxes = [];
export const movers = [];
export const lamps = [];
export const crates = [];
export const winOn = new THREE.MeshBasicMaterial({ color: 0xffc46b });
export const winOff = new THREE.MeshBasicMaterial({ color: 0x4a5a70 });
export const fogMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false });
const edgeMat = new THREE.LineBasicMaterial({ color: 0x2b2440, transparent: true, opacity: 0.5 });

export function syncBox(b) { b.min.copy(b.pos).sub(b.half); b.max.copy(b.pos).add(b.half); }
function solid(x, y, z, w, h, d, extra = {}) {
  const b = { pos: V3(x, y, z), half: V3(w / 2, h / 2, d / 2), min: V3(), max: V3(), ...extra };
  syncBox(b); boxes.push(b); return b;
}
function block(x, y, z, w, h, d, top, side, extra = {}, edges = true) {
  const ms = toon(side), mt = toon(top);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [ms, ms, mt, ms, ms, ms]);
  mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true;
  if (edges) mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), edgeMat));
  scene.add(mesh);
  const b = solid(x, y, z, w, h, d, extra);
  b.mesh = mesh; b.pos = mesh.position; syncBox(b);
  return b;
}
// a slab of solid rock spanning [x0,x1]×[z0,z1] between heights y0 and y1 (tunnel and cave roofs)
const roof = (x0, x1, z0, z1, y0, y1, top = PAL[2][0]) =>
  block((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, top, PAL[1][1], {}, false);
let hs = 5;
const hr = () => ((hs = (hs * 16807) % 2147483647) / 2147483647);
const gy = (x, z) => groundAt(x, z, 0);

export function crate(x, z, rare = false, rareName = '', y = null) {
  const g = y ?? groundAt(x, z, 0.5);
  const b = block(x, g + 0.5, z, 1, 1, 1, 0xa07040, 0x8a5d34, { crate: true, rare, id: 'k' + crates.length, rareName });
  crates.push(b);
  const x1 = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.14, 0.14), toon(0x5e3d22));
  x1.rotation.z = Math.PI / 4; x1.position.z = 0.47; b.mesh.add(x1);
  const x2 = x1.clone(); x2.rotation.z = -Math.PI / 4; b.mesh.add(x2);
  const col = rare ? 0x9b6bff : 0xffc23d;
  b.mesh.material.forEach((m) => m.emissive.set(rare ? 0x2a1460 : 0x2a1a00));
  const leak = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
  for (const [px, pz, ry] of [[0, 0.505, 0], [0, -0.505, 0], [0.505, 0, Math.PI / 2], [-0.505, 0, Math.PI / 2]]) {
    const crack = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.06), leak);
    crack.position.set(px, 0.12, pz); crack.rotation.y = ry; b.mesh.add(crack);
    const c2 = crack.clone(); c2.position.y = -0.2; b.mesh.add(c2);
  }
  const light = new THREE.PointLight(col, rare ? 6 : 2.5, rare ? 6 : 4, 2);
  light.position.y = 0.8; b.mesh.add(light);
  lamps.push({ flicker: light, base: rare ? 6 : 2.5, seed: x + z });
  return b;
}

// a cracked slab that only breaks under a ground pound (counts as a crate, so it's saved too)
function crackedSlab(x, y, z, w, d, top, side, glow) {
  const b = block(x, y - 0.2, z, w, 0.4, d, top, side, { crate: true, rare: false, id: 'k' + crates.length });
  crates.push(b);
  const mat = new THREE.MeshBasicMaterial({ color: glow });
  for (let i = 0; i < 7; i++) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.9 + hr() * 1.6, 0.03, 0.08), mat);
    c.position.set((hr() - 0.5) * w * 0.6, 0.21, (hr() - 0.5) * d * 0.6); c.rotation.y = hr() * Math.PI;
    b.mesh.add(c);
  }
  const l = new THREE.PointLight(glow, 5, 6, 2); l.position.y = 0.7; b.mesh.add(l);
  lamps.push({ flicker: l, base: 5, seed: x });
  return b;
}

// ---------- shared props ----------
const wood = 0x8a6a48, darkWood = 0x5e3d22;
const trunk = toon(0x6b4a30), pine = [toon(0x3f8a5a), toon(0x4f9e66)], leaf = toon(0x7cc35a);
function pineTree(x, z, s, g = gy(x, z)) {
  const t = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s, 0.16 * s, 0.8 * s), trunk);
  t.position.set(x, g + 0.4 * s, z); scene.add(t);
  for (let j = 0; j < 2; j++) {
    const c = new THREE.Mesh(new THREE.ConeGeometry((0.9 - j * 0.25) * s, 1.4 * s, 7), pine[j]);
    c.position.set(x, g + (1.1 + j * 0.7) * s, z); c.castShadow = true; addOutline(c, 1.05); scene.add(c);
  }
  solid(x, g + s, z, 0.4 * s, 2 * s, 0.4 * s);
}
function roundTree(x, z, s) {
  const g = gy(x, z);
  const t = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * s, 0.2 * s, 1.2 * s), trunk);
  t.position.set(x, g + 0.6 * s, z); scene.add(t);
  const c = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9 * s, 1), leaf);
  c.position.set(x, g + 1.7 * s, z); c.castShadow = true; addOutline(c, 1.05); scene.add(c);
  solid(x, g + s, z, 0.4 * s, 2 * s, 0.4 * s);
}
function boulder(x, z, s, y = gy(x, z)) {
  const m = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), toon(0x9a948a));
  m.position.set(x, y + s * 0.6, z); m.rotation.set(hr() * 3, hr() * 3, 0); m.castShadow = true; addOutline(m, 1.05); scene.add(m);
  solid(x, y + s * 0.6, z, s * 1.4, s * 1.2, s * 1.4);
}
function lantern(x, y, z, c = 0xffc46b) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.35, 0.25), new THREE.MeshBasicMaterial({ color: c }));
  m.position.set(x, y, z); scene.add(m);
  const l = new THREE.PointLight(c, 7, 10, 2); l.position.set(x, y, z); scene.add(l);
  lamps.push({ flicker: l, base: 7, seed: x * 3 + z });
}
// wooden signpost: arrows point towards the three ways up
function sign(x, z, arms) {
  const g = gy(x, z);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.4), toon(darkWood));
  post.position.set(x, g + 1.2, z); scene.add(post);
  arms.forEach(([text, yaw], i) => {
    const s = label(text, x, g + 2.6 - i * 0.55, z, 2.2);
    s.position.x += Math.sin(yaw) * 0.6; s.position.z += Math.cos(yaw) * 0.6;
  });
}

// ---------- basiskamp ----------
const tentCols = [0xff7a3d, 0x14b8a6, 0xffd166];
function tent(x, z, s, c) {
  const g = gy(x, z);
  const m = new THREE.Mesh(new THREE.ConeGeometry(s, s * 1.3, 4), toon(c));
  m.position.set(x, g + s * 0.65, z); m.rotation.y = Math.PI / 4; m.castShadow = true; addOutline(m, 1.04);
  scene.add(m);
  solid(x, g + s * 0.4, z, s * 1.2, s * 0.8, s * 1.2);
}
tent(-7, 46, 1.8, tentCols[0]); tent(-11, 50, 1.6, tentCols[1]); tent(-4, 52, 1.4, tentCols[2]);
{ // campfire
  const g = gy(-1, 44);
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.25), toon(0x8a8a90));
    const a = (i / 6) * Math.PI * 2; s.position.set(-1 + Math.cos(a) * 0.6, g + 0.15, 44 + Math.sin(a) * 0.6); scene.add(s);
  }
  const fire = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.7, 6), new THREE.MeshBasicMaterial({ color: 0xffa53d }));
  fire.position.set(-1, g + 0.4, 44); scene.add(fire);
  const l = new THREE.PointLight(0xffa53d, 8, 10, 2); l.position.set(-1, g + 1, 44); scene.add(l);
  lamps.push({ flicker: l, base: 8, seed: 3 });
}
crate(14, 40);
sign(2, 32, [['↖ Bos & klifwand', 0.6], ['↗ Mijn', -0.6], ['→ Oostkam', -1.4]]);
// under the rim of the camp, behind the tents: only visible if you peek over the edge
crate(-6, 63, true, 'Onder de rand', -5);

// ---------- het dal: river, lake, meadow ----------
{
  const mat = new THREE.MeshBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.5, depthWrite: false });
  for (let x = -22; x < 10; x += 3) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.15), mat);
    r.rotation.x = -Math.PI / 2; r.position.set(x, -0.55, riverZ(x)); scene.add(r);
    lamps.push({ ripple: r, x0: x, seed: x });
  }
  // little wooden bridge where the camp path crosses the river
  block(-5.2, -0.1, riverZ(-5.2), 2, 0.2, 4.6, wood, darkWood);
}
sign(-4, 6, [['← Waterval', 1.4], ['↖ Dennenbos', 0.8], ['→ Mijn', -1.5]]);
for (const [x, z] of [[-18, 10], [8, 24], [22, 8], [-26, 12], [-14, -8], [20, -6], [4, 20]]) boulder(x, z, 0.6 + hr() * 0.5);
for (const [x, z] of [[-20, 28], [16, 28], [24, 18], [-28, 8], [6, -10], [-10, -10], [26, -10], [-22, -10]]) roundTree(x, z, 0.9 + hr() * 0.5);

// ---------- de waterval (west cliff): a hollow hides behind the falling water ----------
roof(-36, -32, -2, 2, 3, 6);
export const waterfall = (() => {
  const c = document.createElement('canvas'); c.width = 64; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#9fd8ff'; g.fillRect(0, 0, 64, 256);
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + Math.random() * 0.6})`; g.fillRect(Math.random() * 64, Math.random() * 256, 2 + Math.random() * 4, 20 + Math.random() * 60); }
  const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(2, 1);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 6.8), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.88, side: THREE.DoubleSide, depthWrite: false }));
  m.rotation.y = Math.PI / 2; m.position.set(-31.7, 2.8, 0); scene.add(m);
  return { mesh: m, tex, foot: V3(-30.5, -0.4, 0) };
})();
addCookie(-34.2, 0.9, 0, 'Achter de waterval');

// ---------- de terrassen & het dennenbos (west plateau) ----------
// Sjaak the goat's race: from the valley, up the terraces, through the forest to the flag
export const RACE_PATH = [[-12, 22], [-20, 23], [-26, 24], [-30, 24], [-36, 22], [-42, 14], [-48, 2], [-50, -8]].map(([x, z]) => V3(x, 0, z));
const nearRace = (x, z) => RACE_PATH.slice(1).some((b, i) => {
  const a = RACE_PATH[i], dx = b.x - a.x, dz = b.z - a.z;
  const k = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - a.x - dx * k, z - a.z - dz * k) < 2.6;
});
for (let i = 0; i < 260; i++) {
  const x = -63 + hr() * 30, z = -29 + hr() * 58;
  if (kindAt(x, z) !== 2 || groundAt(x, z, 1.4) > 6.01 || groundAt(x, z, 1.4) < 5.99) continue;
  if (Math.hypot(x + 40, z - 8) < 4 || Math.hypot(x + 40, z - 22) < 4 || Math.hypot(x + 53, z + 20) < 3 || Math.hypot(x + 44, z + 27) < 3 || nearRace(x, z)) continue;   // keep spots & the race lane clear
  pineTree(x, z, 0.9 + hr() * 0.8);
}
block(-52.6, 6.9, -20, 1.6, 1.8, 1.6, 0xa07a50, 0x6b4a30);           // tree stump: the step up to the kid's rock
export const RACE_FLAG = V3(-50, 6, -8);
export const KID_ROCK = V3(-56, 10, -20);

// ---------- de klifwand: ledges up to the plateau, and one rock far out in the air ----------
for (const [x, z] of [[-40, -36], [-52, -42], [-46, -52], [-58, -58], [-38, -60]]) boulder(x, z, 0.5 + hr() * 0.4);
addCookie(-74, 17.2, -50, 'De verre rots');

// ---------- de mijn ----------
roof(30, 42, -3, 3, 5, 14);
roof(36, 42, -14, -3, 5, 14);
// the old storeroom: only someone heavy gets through its cracked wall
roof(32, 38, 3, 9, 5, 14);
{
  const b = block(35, 2.5, 3.4, 6, 5, 0.8, PAL[1][0], PAL[1][1], { crate: true, wall: true, rare: false, id: 'k' + crates.length });
  crates.push(b);
  const mat = new THREE.MeshBasicMaterial({ color: 0xff8a3d });
  for (let i = 0; i < 6; i++) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1 + hr() * 1.6, 0.05), mat);
    c.position.set((hr() - 0.5) * 4.6, (hr() - 0.5) * 2.6, -0.43); c.rotation.z = (hr() - 0.5) * 1.6; b.mesh.add(c);
  }
}
addCookie(35, 0.9, 7.2, 'Achter de gebarsten muur');
line([33, 0.9, 5.5], [37, 0.9, 5.5], 3);
roof(34, 56, -34, -14, 12, PLATEAU_H);
roof(60, 62, -34, -14, 12, PLATEAU_H);
roof(56, 60, -34, -26, 12, PLATEAU_H);
roof(56, 60, -22, -14, 12, PLATEAU_H);
{ // timber frame at the entrance
  const m = toon(darkWood);
  for (const z of [-3.2, 3.2]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, 0.5), m); p.position.set(29.8, 2.5, z); scene.add(p); }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 7), m); beam.position.set(29.8, 5, 0); scene.add(beam);
  label('DE OUDE MIJN', 29.4, 6, 0, 3.4);
}
for (const [x, y, z] of [[33, 3.6, -2.6], [38, 3.6, 2.6], [41.4, 3.6, -8], [36.5, 3.6, -13], [36, 6, -30], [43, 6, -16], [53, 6, -32], [61.5, 6, -18], [53, 6, -16]]) lantern(x, y, z);
// rails across the chasm and the cart that shuttles over it
{
  const rm = toon(0x6b6f7e);
  for (const dz of [-0.5, 0.5]) { const r = new THREE.Mesh(new THREE.BoxGeometry(22, 0.08, 0.08), rm); r.position.set(48, -0.1, -24 + dz); scene.add(r); }
  const b = block(48, 0.05, -24, 2.2, 0.5, 1.8, 0x7a5a40, 0x5e3d22);
  const body = toon(0x8a5d34);
  for (const [w, d, x, z] of [[2.2, 0.12, 0, 0.9], [2.2, 0.12, 0, -0.9], [0.12, 1.8, 1.1, 0], [0.12, 1.8, -1.1, 0]]) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(w, 0.6, d), body); s.position.set(x, 0.5, z); addOutline(s, 1.04); b.mesh.add(s);
  }
  for (const [x, z] of [[-0.7, 0.9], [0.7, 0.9], [-0.7, -0.9], [0.7, -0.9]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.12, 12), toon(0x3a3e4e)); w.rotation.x = Math.PI / 2; w.position.set(x, -0.25, z); b.mesh.add(w);
  }
  movers.push(b.mover = { b, base: b.pos.clone(), axis: V3(1, 0, 0), amp: 7, speed: 0.5, delta: V3() });
}
addCookie(48, 4.7, -24, 'Het mijnkarretje');
// the lift up the shaft to the plateau
{
  const bottom = 0.2, top = PLATEAU_H + 0.2;
  const b = block(58, (bottom + top) / 2 - 0.2, -24, 2.6, 0.4, 2.6, 0xffd166, 0x9c8266);
  movers.push(b.mover = { b, base: b.pos.clone(), axis: V3(0, 1, 0), amp: (top - bottom) / 2, speed: 0.4, delta: V3() });
  for (const dx of [-1.5, 1.5]) {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, top - bottom + 3), toon(0x3a3e4e));
    rail.position.set(58 + dx, (bottom + top) / 2 + 1, -24); scene.add(rail);
  }
}

// ---------- de oostkam & de sneeuwvlokken-knop ----------
export const BUTTON = V3(46, 14, 6);
for (const [x, z] of [[34, 12], [50, -10], [52, 16], [60, 4], [56, -4]]) pineTree(x, z, 1 + hr() * 0.5);
boulder(44, -6, 0.9); boulder(58, 12, 0.7);
export const SKY_STEPS = [block(69, 13.6, 2, 2.4, 0.8, 2.4, 0xf4f7fb, 0xc9d3de), block(74, 15.4, -4, 2.4, 0.8, 2.4, 0xf4f7fb, 0xc9d3de)];
// de brokkelbrug: it starts crumbling the moment you step on it, faster than you can walk
export const CRUMBLE = [];
for (let i = 0; i < 12; i++) {
  const b = block(65 + i * 2, 13.8, 14, 1.9, 0.4, 1.6, wood, darkWood);
  b.home = b.pos.clone(); CRUMBLE.push(b);
}
block(92, 13.25, 14, 8, 1.5, 8, PAL[2][0], PAL[1][1]);
{
  const c = new THREE.Mesh(new THREE.ConeGeometry(4.5, 6, 7), toon(0x8a7a6a)); c.rotation.x = Math.PI; c.position.set(92, 9.5, 14); scene.add(c);
  pineTree(94.5, 16.5, 1, 14); boulder(89.5, 11.5, 0.6, 14);
}
addCookie(93, 15.2, 14, 'Over de brokkelbrug');

// ---------- de hoogvlakte ----------
for (const [x, z] of [[-24, -20], [-10, -38], [20, -22], [28, -40], [-28, -56], [8, -18]]) boulder(x, z, 0.7 + hr() * 0.5);
for (const [x, z] of [[-26, -30], [14, -30], [-16, -24], [30, -26], [-20, -50]]) pineTree(x, z, 1 + hr() * 0.4);

// ---------- de gletsjer ----------
const ice = 0xd8f1ff, iceSide = 0x9ccbe6;
block(22, 23.8, -52, 1.6, 0.4, 4.6, ice, iceSide);
block(50, 23.8, -52, 1.6, 0.4, 4.6, ice, iceSide);
block(30, 23.8, -62, 1.1, 0.4, 4.6, ice, iceSide);
crackedSlab(56, 24, -70, 4, 4, ice, iceSide, 0x8fe3ff);
block(55, 22.2, -71, 1.2, 1.2, 1.2, ice, iceSide);                // step out of the ice cave
addCookie(56.6, 22.6, -69.4, 'In de ijsgrot');
{
  const spike = toon(0xbfe6ff);
  for (let i = 0; i < 26; i++) {
    const x = 18 + hr() * 44, z = -46 - hr() * 27;
    if (groundAt(x, z, 0.6) < 23.9 || Math.hypot(x - 56, z + 70) < 4 || Math.abs(x - 22) < 2 || Math.abs(x - 30) < 2 || Math.abs(x - 50) < 2) continue;
    const s = 0.4 + hr() * 0.6;
    const m = new THREE.Mesh(new THREE.ConeGeometry(s, s * 3, 5), spike); m.position.set(x, 24 + s * 1.5, z); addOutline(m, 1.06); scene.add(m);
  }
}

// ---------- de top ----------
{
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 4), toon(0x3a3e4e));
  pole.position.set(SUMMIT.x - 9, SUMMIT.h + 2, SUMMIT.z - 5); scene.add(pole);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.9), new THREE.MeshBasicMaterial({ color: 0xff5a36, side: THREE.DoubleSide }));
  flag.position.set(SUMMIT.x - 8.3, SUMMIT.h + 3.5, SUMMIT.z - 5); scene.add(flag);
  lamps.push({ wave: flag });
  // a big glowing beacon so the summit always reads as "the goal"
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 60, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xb79cff, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide }));
  beacon.position.set(SUMMIT.x, SUMMIT.h + 30, SUMMIT.z); scene.add(beacon);
  lamps.push({ beacon });
}
// the summit's cosmic cookie is the Lawinereus' reward (boss.js)

// ---------- only reachable by gliding (scan a zweefarend first) ----------
{ // a cloud you can stand on, high above the valley crossroad
  const puffMat = toon(0xffffff);
  block(0, 17.6, 10, 4, 0.8, 4, 0xffffff, 0xe8eef6, {}, false);
  for (const [x, z, r] of [[-1.6, -1.2, 1.3], [1.5, -1.4, 1.2], [-1.4, 1.5, 1.2], [1.7, 1.3, 1.3], [0, 0, 1.1], [2.4, 0, 0.9], [-2.4, 0.2, 0.9]]) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), puffMat); s.position.set(x, 17.4, 10 + z); s.scale.y = 0.55; scene.add(s);
  }
}
addCookie(0, 19.3, 10, 'Op de wolk');
{ // a little island floating behind the summit
  block(-30, 26.25, -78, 5, 1.5, 5, PAL[4][0], PAL[1][1]);
  const c = new THREE.Mesh(new THREE.ConeGeometry(2.6, 4, 7), toon(0x8a7a6a)); c.rotation.x = Math.PI; c.position.set(-30, 23.5, -78); scene.add(c);
  pineTree(-31.4, -79.2, 0.8, 27);
}
addCookie(-29, 28.3, -77, 'Zwevend naar het eiland');

// ---------- checkpoint flags ----------
export const FLAGS = [V3(-40, 6, 22), V3(38, 0, -18), V3(-4, PLATEAU_H, -30), V3(46, 14, 12), V3(24, 24, -46), V3(6, 0, -45.5)].map((p) => {
  p.y = gy(p.x, p.z);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4), toon(0x3a3e4e));
  pole.position.set(p.x, p.y + 1.2, p.z); scene.add(pole);
  const mat = new THREE.MeshBasicMaterial({ color: 0x9a948a, side: THREE.DoubleSide });
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), mat); cloth.position.set(p.x + 0.45, p.y + 2.1, p.z); scene.add(cloth);
  lamps.push({ wave: cloth });
  return { pos: p, mat };
});

// ---------- wolken, sneeuw ----------
const cloudMat = toon(0xffffff);
for (let i = 0; i < 18; i++) {
  const a = (i / 18) * Math.PI * 2 + hr() * 0.3, d = 85 + hr() * 30;
  const grp = new THREE.Group(); grp.position.set(Math.cos(a) * d, -6 + hr() * 40, Math.sin(a) * d - 10);
  for (let j = 0; j < 4; j++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(2.5 + hr() * 2.5, 14, 10), cloudMat);
    s.position.set((j - 1.5) * 3, hr(), hr() * 2); grp.add(s);
  }
  scene.add(grp);
}
export const dust = (() => {
  const n = 700, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = 10 + (hr() - 0.5) * 80; pos[i * 3 + 1] = 22 + hr() * 20; pos[i * 3 + 2] = -55 + (hr() - 0.5) * 40; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 0.12, transparent: true, opacity: 0.9, depthWrite: false }));
  scene.add(p); return p;
})();

// ---------- Otis' raket, netjes geland ----------
export const rocket = new THREE.Group();
{
  const r = rocket; r.position.set(5, 0, 45); r.rotation.y = -0.3;
  const add = (m, ol = 1.05) => { m.castShadow = true; if (ol) addOutline(m, ol); r.add(m); return m; };
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.0, 3.2, 24), toon(0xfbf3e4))).position.y = 1.8;
  add(new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.4, 24), toon(0xff5a36))).position.y = 4.1;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 3;
    const f = add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.3, 0.9), toon(0xff5a36)));
    f.position.set(Math.sin(a) * 1.05, 0.75, Math.cos(a) * 1.05); f.rotation.y = a;
  }
  add(new THREE.Mesh(new THREE.CircleGeometry(0.42, 32), new THREE.MeshBasicMaterial({ color: 0x9ad8ff })), 0).position.set(0, 2.5, 0.95);
  scene.add(r);
  solid(5, 2, 45, 2.4, 4, 2.4);
}

// ---------- gewone koekjes: breadcrumbs along the routes ----------
const onG = (x, z) => gy(x, z) + 0.9;
line([0, 0, 38], [-5, 0, 16], 6, onG);
line([-10, 0, 13], [-22, 0, 22], 5, onG);
line([0, 0, 4], [26, 0, 0.5], 7, onG);
line([31, 0, 0], [40, 0, 0], 4, onG);
line([39, 0, -4], [39, 0, -10], 3, onG);
line([16, 0, 33], [28, 0, 26], 4, onG);
for (let x = 31; x < 54; x += 4) addCookie(x, gy(x, 25) + 0.9, 25);
circle([-46, 6.9, 14], 3, 8);
line([-34, 6.9, -10], [-60, 6.9, -10], 6);
line([-44, 0, -32], [-56, 0, -56], 6, (x, z) => gy(x, z) + 0.9);
line([40, 0.9, -22], [40, 0.9, -32], 3);
line([56, 0.9, -18], [56, 0.9, -30], 3);
for (let i = 0; i < 5; i++) addCookie(58, 3 + i * 4, -24);
circle([-4, PLATEAU_H + 0.9, -30], 4, 8);
line([22, 24.9, -49], [22, 24.9, -55], 3);
line([30, 24.9, -59], [30, 24.9, -65], 3);
circle([SUMMIT.x, 24.9, SUMMIT.z], 14.8, 12);
for (const [x, z] of [[-20, -4], [-24, 6], [8, 10]]) crate(x, z);
crate(-60, -26); crate(62, 18); crate(-12, -40);

// ---------- spawn, checkpoints, terug naar huis ----------
export const SPAWN = V3(0, 0, 48);
export const ARENA_ENTRY = SPAWN.clone();
export const ARENA_POS = V3(0, -100, 0);
export const CHECKPOINTS = FLAGS.map((f) => ({ test: (p) => Math.hypot(p.x - f.pos.x, p.z - f.pos.z) < 3 && Math.abs(p.y - f.pos.y) < 2, pos: f.pos }));
export const PLANET = 'berg';
export const TRAVEL = { pos: V3(5, 0, 45), need: 0, planet: 'mistmaan', target: '../index.html', name: 'de Mistmaan', label: 'Terug naar de Mistmaan' };
