import { THREE, scene, toon, addOutline, V3, label } from './core.js?v=sub1';
import { addCookie, line, circle } from './cookies.js?v=sub1';
import { groundAt, ISLES, ARENA, TOP, BEACH, WATER_LO, WATER_HI } from './water-terrain.js?v=sub1';

export const boxes = [];
export const movers = [];
export const lamps = [];
export const crates = [];
export const winOn = new THREE.MeshBasicMaterial({ color: 0xffc46b });
export const winOff = new THREE.MeshBasicMaterial({ color: 0x4a5a70 });
export const fogMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, depthWrite: false });
export const anim = [];
const edgeMat = new THREE.LineBasicMaterial({ color: 0x1a2a3a, transparent: true, opacity: 0.4 });

export function syncBox(b) { b.min.copy(b.pos).sub(b.half); b.max.copy(b.pos).add(b.half); }
export function solid(x, y, z, w, h, d, extra = {}) {
  const b = { pos: V3(x, y, z), half: V3(w / 2, h / 2, d / 2), min: V3(), max: V3(), ...extra };
  syncBox(b); boxes.push(b); return b;
}
export function block(x, y, z, w, h, d, top, side, extra = {}, edges = true) {
  const ms = toon(side), mt = toon(top);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [ms, ms, mt, ms, ms, ms]);
  mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true;
  if (edges) mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), edgeMat));
  scene.add(mesh);
  const b = solid(x, y, z, w, h, d, extra);
  b.mesh = mesh; b.pos = mesh.position; syncBox(b);
  return b;
}
const stand = (x, z, w, d, top, colTop, colSide, y0 = TOP, extra = {}) => block(x, (y0 + top) / 2, z, w, top - y0, d, colTop, colSide, extra);
let hs = 23;
const hr = () => ((hs = (hs * 16807) % 2147483647) / 2147483647);
const gy = (x, z) => { const g = groundAt(x, z, 0); return g === -Infinity ? WATER_HI : g; };
const mesh = (geo, mat, x, y, z, parent = scene, ol = 1.05) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true;
  if (ol) addOutline(m, ol); parent.add(m); return m;
};
export function crate(x, z, rare = false, rareName = '', y = null) {
  const g = y ?? groundAt(x, z, 0.5);
  const b = block(x, g + 0.5, z, 1, 1, 1, 0xa07040, 0x8a5d34, { crate: true, rare, id: 'k' + crates.length, rareName });
  crates.push(b);
  const col = rare ? 0x9b6bff : 0xffc23d;
  b.mesh.material.forEach((m) => m.emissive.set(rare ? 0x2a1460 : 0x2a1a00));
  const leak = new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide });
  for (const [px, pz, ry] of [[0, 0.505, 0], [0, -0.505, 0], [0.505, 0, Math.PI / 2], [-0.505, 0, Math.PI / 2]]) {
    const c = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.06), leak); c.position.set(px, 0.12, pz); c.rotation.y = ry; b.mesh.add(c);
  }
  if (rare) { const l = new THREE.PointLight(col, 5, 6, 2); l.position.y = 0.8; b.mesh.add(l); }
  return b;
}
function sign(x, z, text, yaw = 0, y = null) {
  const g = y ?? gy(x, z);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.2), toon(0x6a5a4a)); post.position.set(x, g + 1.1, z); scene.add(post);
  label(text, x, g + 2.4, z, 2.6).rotation.y = yaw;
}
// a set of boxes that only exist some of the time (ice at night, lilies by day…)
function toggler(list) {
  const t = { list, on: true };
  t.set = (on) => {
    if (on === t.on) return; t.on = on;
    for (const b of list) { const i = boxes.indexOf(b); if (on && i < 0) boxes.push(b); else if (!on && i >= 0) boxes.splice(i, 1); }
  };
  return t;
}

// ---------- day and night ----------
// 35 s of day, 4 s of dusk, 35 s of night, 4 s of dawn. n = how much night it is (0 day … 1 night).
const DAY = 35, FADE = 4, NIGHT = 35, PERIOD = DAY + FADE + NIGHT + FADE;
export const cycle = { n: 0, u: 0, water: WATER_LO, night: false };
export const waterY = () => cycle.water;
function nightness(t) {
  const u = ((t % PERIOD) + PERIOD) % PERIOD; cycle.u = u;
  if (u < DAY) return 0;
  if (u < DAY + FADE) return (u - DAY) / FADE;
  if (u < DAY + FADE + NIGHT) return 1;
  return 1 - (u - DAY - FADE - NIGHT) / FADE;
}
export const untilChange = () => { const u = cycle.u; return u < DAY ? DAY - u : u < DAY + FADE + NIGHT && u >= DAY + FADE ? DAY + FADE + NIGHT - u : 0; };
const hemi = scene.children.find((o) => o.isHemisphereLight);
const sunL = scene.children.find((o) => o.isDirectionalLight);
scene.fog = new THREE.FogExp2(0xbfe8f8, 0.006);
const C_DAY = { hemi: new THREE.Color(0xf0f8ff), ground: new THREE.Color(0x4a8ab0), sun: new THREE.Color(0xfff4e0), fog: new THREE.Color(0xbfe8f8), water: new THREE.Color(0x3ab8d8) };
const C_NIGHT = { hemi: new THREE.Color(0x6a7ab8), ground: new THREE.Color(0x1a2448), sun: new THREE.Color(0x9ab0ff), fog: new THREE.Color(0x1a2850), water: new THREE.Color(0x1a3a6a) };
const tmpC = new THREE.Color();
// the sea
const sea = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshBasicMaterial({ color: 0x3ab8d8, transparent: true, opacity: 0.85, depthWrite: false }));
sea.rotation.x = -Math.PI / 2; sea.position.set(0, WATER_LO, -10); sea.renderOrder = 2; scene.add(sea);
const seaFloor = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), toon(0x2a6a8a)); seaFloor.rotation.x = -Math.PI / 2; seaFloor.position.set(0, -7, -10); scene.add(seaFloor);
const shine = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, depthWrite: false }));
shine.rotation.x = -Math.PI / 2; shine.position.set(0, WATER_LO + 0.02, -10); shine.renderOrder = 3; scene.add(shine);
// stars and a moon for the night, a sun for the day: both cross the sky
const stars = (() => {
  const n = 500, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const a = hr() * Math.PI * 2, e = 0.15 + hr() * 1.3, r = 180; pos.set([Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r - 10], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ size: 1.4, color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, fog: false }));
  scene.add(p); return p;
})();
const skySun = new THREE.Mesh(new THREE.SphereGeometry(9, 20, 14), new THREE.MeshBasicMaterial({ color: 0xfff0a0, fog: false })); scene.add(skySun);
const skyMoon = new THREE.Mesh(new THREE.SphereGeometry(6, 20, 14), new THREE.MeshBasicMaterial({ color: 0xe8f0ff, fog: false })); scene.add(skyMoon);
const BG_DAY = 'linear-gradient(180deg,#5ac8f0 0%,#a8e4f8 45%,#e8f8ff 75%,#3a8ab8 100%)';
const BG_NIGHT = 'linear-gradient(180deg,#0a1030 0%,#1a2a5a 45%,#2a4a7a 75%,#0a1a3a 100%)';
let bgNight = null;

// ---------- the ice fields: at night the sea between the islands freezes ----------
// [ax, az, bx, bz, width]
export const ICE_STRIPS = [[0, 27, 0, 4], [-11, 35, -27, 29], [-27, 19, -9, -2], [11, -6, 29, 0], [0, -20, 0, -46]].map((s) => [...s, 6]);
const iceMat = new THREE.MeshLambertMaterial({ color: 0xdff4ff, transparent: true, opacity: 0 });
const iceBoxes = [];
{
  const tiles = [];
  for (const [ax, az, bx, bz, w] of ICE_STRIPS) {
    const L = Math.hypot(bx - ax, bz - az), n = Math.ceil(L / 1.9);
    const ux = (bx - ax) / L, uz = (bz - az) / L, px = -uz, pz = ux;
    for (let i = 0; i <= n; i++) for (let j = -1; j <= 1; j++) {
      const x = ax + ux * (i * L / n) + px * j * (w / 3), z = az + uz * (i * L / n) + pz * j * (w / 3);
      if (groundAt(x, z, 0) > WATER_HI) continue;     // no ice on top of the islands
      tiles.push([x, z]);
    }
  }
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(2.3, 0.4, 2.3), iceMat, tiles.length);
  const o = new THREE.Object3D();
  tiles.forEach(([x, z], i) => { o.position.set(x, WATER_HI - 0.2, z); o.rotation.y = hr() * 0.3; o.updateMatrix(); im.setMatrixAt(i, o.matrix); iceBoxes.push(solid(x, WATER_HI - 0.2, z, 2.3, 0.4, 2.3, { ice: true })); });
  im.renderOrder = 4; scene.add(im);
}
export const ICE = toggler(iceBoxes);

// ---------- waterlilies: by day they open on the sea, at night they close ----------
const lilyMat = toon(0x5ac860), flowerMat = toon(0xff9ac8);
const lilies = [];
for (const [ax, az, bx, bz, n] of [[2.5, 25.5, 2.5, 5.5, 6], [-25, 16, -11, 0.5, 7]]) {
  for (let i = 0; i < n; i++) {
    const k = (i + 0.5) / n, x = ax + (bx - ax) * k + (i % 2 ? 1.2 : -1.2), z = az + (bz - az) * k;
    const b = block(x, WATER_LO, z, 2.2, 0.2, 2.2, 0x5ac860, 0x3a9a48, { lily: true }, false);
    b.mesh.material.forEach((m) => (m.visible = false));   // the box is only for standing on; the pad is what you see
    const pad = mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.12, 18, 1, false, 0.3, Math.PI * 2 - 0.6), lilyMat, 0, 0, 0, b.mesh, 1.04); pad.visible = true;
    b.pad = pad;
    if (i % 2 === 0) { const f = mesh(new THREE.SphereGeometry(0.3, 10, 8), flowerMat, 0.4, 0.25, 0.3, pad, 0); f.scale.y = 0.7; }
    b.mover = { b, delta: V3(), fn() { return V3(x, cycle.water + 0.02 - (1 - lilyOpen) * 1.5, z); } };
    movers.push(b.mover); lilies.push(b);
  }
}
let lilyOpen = 1;
export const LILIES = toggler(lilies);

// ---------- ijsschotsen: Vries freezes a floe on the water ----------
const floeMat = new THREE.MeshLambertMaterial({ color: 0xe8f8ff, transparent: true, opacity: 0.95 });
const floes = [];
export function addFloe(x, z) {
  if (floes.length >= 6) killFloe(floes[0]);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.35, 0.5, 8), floeMat.clone()); m.castShadow = true; addOutline(m, 1.04); scene.add(m);
  const b = solid(x, cycle.water, z, 2.6, 0.5, 2.6, { floe: true });
  m.position.copy(b.pos); b.mesh = m; b.pos = m.position; syncBox(b);
  const f = { b, m, t: 0, x, z };
  b.mover = { b, delta: V3(), fn() { return V3(x, cycle.water + 0.05, z); } };
  movers.push(b.mover); floes.push(f);
  return f;
}
function killFloe(f) {
  scene.remove(f.m); const i = boxes.indexOf(f.b); if (i >= 0) boxes.splice(i, 1);
  const j = movers.indexOf(f.b.mover); if (j >= 0) movers.splice(j, 1);
  floes.splice(floes.indexOf(f), 1);
}
function updateFloes(dt) {
  for (const f of [...floes]) {
    f.t += dt; f.m.position.copy(f.b.pos);
    const left = 9 - f.t;
    f.m.material.opacity = left < 2 ? 0.3 + 0.65 * (left / 2) * (0.6 + 0.4 * Math.sin(f.t * 20)) : 0.95;
    if (left <= 0) killFloe(f);
  }
}

// ---------- 1. het Strand: the rocket, and a pier ----------
export const rocket = new THREE.Group();
{
  const r = rocket; r.position.set(5, TOP, 44); r.rotation.set(0.04, -0.4, -0.05);
  const add = (m, ol = 1.05) => { m.castShadow = true; if (ol) addOutline(m, ol); r.add(m); return m; };
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.0, 3.2, 24), toon(0xfbf3e4))).position.y = 1.8;
  add(new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.4, 24), toon(0xff5a36))).position.y = 4.1;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 3;
    const f = add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.3, 0.9), toon(0xff5a36))); f.position.set(Math.sin(a) * 1.05, 0.75, Math.cos(a) * 1.05); f.rotation.y = a;
  }
  add(new THREE.Mesh(new THREE.CircleGeometry(0.42, 32), new THREE.MeshBasicMaterial({ color: 0x9ad8ff })), 0).position.set(0, 2.5, 0.95);
  scene.add(r); solid(5, TOP + 2, 44, 2.4, 4, 2.4);
}
// the pier sticks out north over the sea; at low tide a little sandbank shows up at its tip
{
  for (let z = 27; z >= 19; z -= 2) {
    block(-7, TOP - 0.15, z, 2.4, 0.3, 2.1, 0xc8a070, 0x8a6a4a);
    for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(0.15, 0.15, 8.5), toon(0x6a4a30), -7 + s * 1.1, TOP - 4.3, z, scene, 0);
  }
  // the sand patch under the water at the end of the pier
  const patch = block(-7, -1.9, 15.5, 4, 0.6, 4, 0xc8b088, 0x9a8460, {}, false);
  crate(-7, 15.5, true, 'Bij de pier, bij eb', -1.6);
  sign(-5.5, 28.5, 'Pier · bij eb zie je de bodem', 0);
}
for (const [x, z, c] of [[-3, 46, 0x5ac8f0], [3, 49, 0xff9ac8]]) { const m = mesh(new THREE.BoxGeometry(1.4, 0.04, 2.4), toon(c), x, TOP + 0.03, z, scene, 0); m.rotation.y = hr() - 0.5; }
sign(0, 30, '↑ Paleis (lelies of ijs) · ↖ Pinguïnbaai (zandbank of ijs)');
crate(9, 36); crate(-10, 46);

// ---------- 2. het Paleiseiland: what's left of Deniz' ice palace ----------
export const DENIZ_AT = V3(0, TOP, -13);
const ruinMat = new THREE.MeshLambertMaterial({ color: 0xc8f0ff, transparent: true, opacity: 0.75 });
for (let i = 0; i < 10; i++) {
  const a = (i / 10) * Math.PI * 2, r = 9, h = 0.6 + hr() * 2.4;
  const m = mesh(new THREE.BoxGeometry(2.4, h, 1), ruinMat, Math.cos(a) * r, TOP + h / 2, -8 + Math.sin(a) * r, scene, 0); m.rotation.y = -a + Math.PI / 2;
}
// the throne: a block of ice that's melting
export const THRONE = block(DENIZ_AT.x, TOP + 0.4, DENIZ_AT.z - 0.4, 1.6, 0.8, 1.4, 0xe8f8ff, 0xb8e0f0);
// the waterfall cliff: by day a waterfall, by night it freezes into steps you can climb
export const FALL = { x: 8, z: -15, top: TOP + 6 };
{
  stand(FALL.x, FALL.z, 4, 4, FALL.top, 0x8a8e9a, 0x5a5e6a);
  addCookie(FALL.x, FALL.top + 1.2, FALL.z, 'Boven op de bevroren waterval');
}
const fallWater = new THREE.Mesh(new THREE.PlaneGeometry(2.4, FALL.top - TOP), new THREE.MeshBasicMaterial({ color: 0x9ae8ff, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }));
fallWater.position.set(FALL.x, (FALL.top + TOP) / 2, FALL.z + 2.05); scene.add(fallWater);
const fallSteps = [];
for (const [dx, dz, top] of [[-1.2, 3, TOP + 1.2], [0.6, 3.1, TOP + 2.4], [-0.5, 2.9, TOP + 3.6], [1, 2.8, TOP + 4.8]]) {
  const b = block(FALL.x + dx, top - 0.3, FALL.z + dz, 1.4, 0.6, 1.4, 0xe8f8ff, 0xb8e0f0);
  b.mesh.material.forEach((m) => { m.transparent = true; }); fallSteps.push(b);
}
export const FALL_ICE = toggler(fallSteps);
// once Deniz has his hearts back, the palace freezes up again: a tower of ice to climb
export const SPIRE = { x: 0, z: -5, top: TOP + 12 };
const spire = [];
{
  const c = block(SPIRE.x, (TOP + SPIRE.top) / 2, SPIRE.z, 2, SPIRE.top - TOP, 2, 0xe8f8ff, 0xa8d8f0);
  spire.push(c);
  for (let i = 0; i < 9; i++) {
    const a = i * 0.8, top = TOP + 1.2 * (i + 1);
    spire.push(block(SPIRE.x + Math.cos(a) * 2.6, top - 0.3, SPIRE.z + Math.sin(a) * 2.6, 1.8, 0.6, 1.8, 0xe8f8ff, 0xa8d8f0));
  }
  spire.forEach((b) => { b.mesh.visible = false; b.mesh.material.forEach((m) => { m.transparent = true; m.opacity = 0.9; }); });
}
export const SPIRE_ICE = toggler(spire); SPIRE_ICE.set(false);
export function showSpire() { SPIRE_ICE.set(true); spire.forEach((b) => (b.mesh.visible = true)); }
circle([0, TOP + 0.9, -8], 4, 6);

// ---------- 3. de Pinguïnbaai ----------
export const PINGO_AT = V3(-31, TOP, 24);
{
  // the penguins' rock with a slide down; an ice heart lies on top
  stand(-38, 28, 3, 3, TOP + 1.2, 0xe8f8ff, 0xa8d8f0);
  stand(-39.5, 25.5, 2.4, 2.4, TOP + 2.4, 0xe8f8ff, 0xa8d8f0);
  stand(-37.6, 23.4, 2, 2, TOP + 3.6, 0xe8f8ff, 0xa8d8f0);
  stand(-35.2, 22.2, 2, 2, TOP + 4.8, 0xe8f8ff, 0xa8d8f0);
  crate(-30, 30);
  sign(-28, 22, '→ Strand · ↘ Paleis', 0.6);
}
// the iceberg: by day it drifts far out to sea, at night it lies frozen against the bay
export const BERG = { day: V3(-60, 0, 44), night: V3(-47.6, 0, 26), x: 0, z: 0 };
const bergBoxes = [];
{
  for (const [lx, lz, w, d, h, y0] of [[0, 0, 6, 6, 0.8, -1.2], [0.8, 0.6, 4, 4, 2, 0.8], [-0.6, -0.4, 2.8, 2.8, 3.2, 2], [0.2, 0.4, 1.8, 1.8, 4.6, 3.2]]) {
    const b = block(BERG.night.x + lx, (h + y0) / 2, BERG.night.z + lz, w, h - y0, d, 0xf4fcff, 0xb8e0f0);
    b.mover = { b, delta: V3(), fn() { return V3(BERG.x + lx, cycle.water - WATER_HI + (h + y0) / 2, BERG.z + lz); } };
    movers.push(b.mover); bergBoxes.push(b);
  }
}
// its cookie is frozen inside the top: only by day (out at sea) is it melted free
export const BERG_COOKIE = { lx: 0.2, lz: 0.4, y: 4.6 + 1.2 };
const bergCase = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), new THREE.MeshLambertMaterial({ color: 0xe8f8ff, transparent: true, opacity: 0.7 })); scene.add(bergCase);

// ---------- 4. het Vuurtoreneiland ----------
export const TOREN = { x: 36, z: 2, top: TOP + 12 };
{
  const t = TOREN;
  mesh(new THREE.CylinderGeometry(1.8, 2.2, t.top - TOP, 18), toon(0xf4f0e8), t.x, (t.top + TOP) / 2, t.z, scene, 1.03);
  for (let i = 1; i < 4; i++) mesh(new THREE.CylinderGeometry(2.25 - i * 0.1, 2.25 - i * 0.1, 0.8, 18), toon(0xe0443a), t.x, TOP + i * 3, t.z, scene, 0);
  solid(t.x, (t.top + TOP) / 2, t.z, 3.4, t.top - TOP, 3.4);
  block(t.x, t.top + 0.15, t.z, 5, 0.3, 5, 0xe0443a, 0xb0302a);
  mesh(new THREE.CylinderGeometry(1, 1, 1.4, 12), new THREE.MeshBasicMaterial({ color: 0xfff4c0 }), t.x, t.top + 1, t.z, scene, 0);
  mesh(new THREE.ConeGeometry(1.4, 1, 12), toon(0xe0443a), t.x, t.top + 2.2, t.z);
}
// icicle ledges round the tower: they only grow at night
const ledges = [];
for (let i = 0; i < 9; i++) {
  const a = 2.6 + i * 0.75, top = TOP + 1.2 * (i + 1);
  ledges.push(block(TOREN.x + Math.cos(a) * 2.9, top - 0.25, TOREN.z + Math.sin(a) * 2.9, 1.6, 0.5, 1.6, 0xe8f8ff, 0xa8d8f0));
}
ledges.forEach((b) => b.mesh.material.forEach((m) => (m.transparent = true)));
export const LEDGES = toggler(ledges);
addCookie(TOREN.x, TOREN.top + 3.6, TOREN.z, 'Op de vuurtoren');
// the beam turns at night; the glass stepping stones round it are only solid while the light is on them
export const BEAM = { a: 0, speed: 0.5, width: 0.42 };
const beam = new THREE.Mesh(new THREE.ConeGeometry(5, 40, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff4c0, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
beam.geometry.translate(0, -20, 0); beam.geometry.rotateZ(Math.PI / 2);
beam.position.set(TOREN.x, TOREN.top + 1, TOREN.z); scene.add(beam);
export const GLASS = [];
for (let k = 0; k < 7; k++) {
  const a = 0.15 + k * 0.48, r = 6 + k * 1.3, top = TOREN.top - k * 0.45;
  const b = block(TOREN.x + Math.cos(a) * r, top - 0.2, TOREN.z + Math.sin(a) * r, 2, 0.4, 2, 0xfff4c0, 0xe0c880, { ghost: true });
  b.mesh.material.forEach((m) => { m.transparent = true; m.opacity = 0.15; });
  GLASS.push({ b, a });
}
{
  const last = GLASS[GLASS.length - 1], a = last.a + 0.42, r = 6 + 7 * 1.3;
  addCookie(TOREN.x + Math.cos(a) * r, TOREN.top - 2.2, TOREN.z + Math.sin(a) * r, 'In de lichtstraal');
}
crate(40, -2);

// ---------- 5. het Krabbenrif: Kapitein Kraak's reef ----------
export const SPIRIT_AT = V3(5, BEACH, -47.4);   // on the beach step: outside the arena, so getting Vries doesn't wake the crab
{
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2, R = ARENA.r + 4;
    if (Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2))) < 0.4) continue;
    const h = 2 + (i % 3) * 1.5;
    mesh(new THREE.ConeGeometry(0.9, h, 6), toon([0xff7a9a, 0xffa060, 0xc87aff][i % 3]), ARENA.x + Math.cos(a) * R, WATER_HI + h / 2 - 0.5, ARENA.z + Math.sin(a) * R, scene, 1.04);
  }
  sign(-3, -48.5, 'Krabbenrif · ga weg, landrot!', 0);
}

// ---------- in open sea ----------
// a lone pole far out west of the palace: only reachable on ice floes you freeze yourself
export const PAAL = { x: -30, z: -30, top: 2.6 };
{
  mesh(new THREE.CylinderGeometry(0.6, 0.7, PAAL.top + 7, 10), toon(0x6a4a30), PAAL.x, (PAAL.top - 7) / 2, PAAL.z);
  solid(PAAL.x, (PAAL.top - 7) / 2, PAAL.z, 1.3, PAAL.top + 7, 1.3);
  addCookie(PAAL.x, PAAL.top + 1.2, PAAL.z, 'Met de ijsschotsen');
}
// a sunken ship east of the beach: at low tide its deck comes up out of the water
export const WRAK = { x: 30, z: 34 };
{
  const w = WRAK, hull = 0x6a4a30;
  block(w.x, -1.9, w.z, 4, 1.6, 9, 0x8a6a4a, hull);
  block(w.x, -0.5, w.z - 3.2, 3, 1.2, 2, 0x8a6a4a, hull);
  block(w.x, 0.4, w.z + 2.6, 2.4, 1, 2.4, 0x8a6a4a, hull);
  mesh(new THREE.CylinderGeometry(0.15, 0.15, 6), toon(0x5a3a20), w.x, 3.6, w.z, scene, 0);
  block(w.x, 3.4, w.z, 1.4, 0.2, 1.4, 0x8a6a4a, hull);
  addCookie(w.x, 4.6, w.z, 'Het gezonken schip');
  const flag = mesh(new THREE.PlaneGeometry(1, 0.6), new THREE.MeshBasicMaterial({ color: 0x1a1a2a, side: THREE.DoubleSide }), w.x + 0.5, 6.3, w.z, scene, 0);
  lamps.push({ wave: flag });
}

// ---------- checkpoints ----------
export const FLAGS = [[-29, 26], [-4, -2], [33, 6], [-4, -47.2]].map(([x, z]) => {
  const p = V3(x, gy(x, z), z);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4), toon(0x3a3e4e)); pole.position.set(p.x, p.y + 1.2, p.z); scene.add(pole);
  const mat = new THREE.MeshBasicMaterial({ color: 0x9a948a, side: THREE.DoubleSide });
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), mat); cloth.position.set(p.x + 0.45, p.y + 2.1, p.z); scene.add(cloth);
  lamps.push({ wave: cloth });
  return { pos: p, mat };
});

// ---------- every frame: the planet turns ----------
let last = -1;
const lightAt = (t) => BEAM.a;
export function updateWorld(t, dt) {
  const n = nightness(t); cycle.n = n;
  cycle.water = WATER_LO + (WATER_HI - WATER_LO) * n;
  cycle.night = n > 0.5;
  // light and colour
  hemi.color.copy(tmpC.copy(C_DAY.hemi).lerp(C_NIGHT.hemi, n)); hemi.groundColor.copy(tmpC.copy(C_DAY.ground).lerp(C_NIGHT.ground, n));
  hemi.intensity = 1.6 - n * 0.7;
  sunL.color.copy(tmpC.copy(C_DAY.sun).lerp(C_NIGHT.sun, n)); sunL.intensity = 1.8 - n * 1.3;
  scene.fog.color.copy(tmpC.copy(C_DAY.fog).lerp(C_NIGHT.fog, n));
  sea.material.color.copy(tmpC.copy(C_DAY.water).lerp(C_NIGHT.water, n));
  sea.position.y = cycle.water; shine.position.y = cycle.water + 0.02; shine.material.opacity = 0.06 + Math.sin(t * 1.5) * 0.03;
  stars.material.opacity = n;
  const sa = (cycle.u / PERIOD) * Math.PI * 2;
  skySun.position.set(Math.cos(sa) * 150, 40 + Math.sin(sa + 0.3) * 90, -60); skySun.visible = n < 0.95;
  skyMoon.position.set(-Math.cos(sa) * 150, 40 - Math.sin(sa + 0.3) * 90, -60); skyMoon.visible = n > 0.05;
  const wantBg = n > 0.5;
  if (wantBg !== bgNight) { bgNight = wantBg; document.body.style.background = wantBg ? BG_NIGHT : BG_DAY; }
  // ice: grows at dusk, cracks and melts at dawn
  ICE.set(n > 0.5);
  const dawn = cycle.u > DAY + FADE + NIGHT - 3 && n > 0.5;
  iceMat.opacity = Math.min(0.92, n * 1.2) * (dawn ? 0.65 + Math.sin(t * 25) * 0.25 : 1);
  // lilies
  LILIES.set(n < 0.5);
  lilyOpen += ((n < 0.5 ? 1 : 0) - lilyOpen) * Math.min(1, dt * 2);
  for (const b of lilies) b.mesh.visible = lilyOpen > 0.05;
  // the frozen waterfall and the tower's icicles
  FALL_ICE.set(n > 0.5); LEDGES.set(n > 0.5);
  for (const b of [...fallSteps, ...ledges]) b.mesh.material.forEach((m) => (m.opacity = Math.min(1, n * 1.3) * (dawn ? 0.6 + Math.sin(t * 25) * 0.3 : 1)));
  fallWater.material.opacity = 0.7 * (1 - n); fallWater.material.color.setHex(n > 0.5 ? 0xe8f8ff : 0x9ae8ff);
  // the lighthouse beam
  BEAM.a += dt * BEAM.speed;
  beam.rotation.y = -BEAM.a; beam.material.opacity = n > 0.5 ? 0.18 : 0;
  for (const g of GLASS) {
    const d = Math.abs(Math.atan2(Math.sin(BEAM.a - g.a), Math.cos(BEAM.a - g.a)));
    const lit = n > 0.5 && d < BEAM.width;
    g.b.ghost = !lit;
    g.b.mesh.material.forEach((m) => (m.opacity = lit ? 0.95 : n > 0.5 ? 0.18 : 0.05));
  }
  // the iceberg drifts
  BERG.x = BERG.day.x + (BERG.night.x - BERG.day.x) * smooth(n); BERG.z = BERG.day.z + (BERG.night.z - BERG.day.z) * smooth(n);
  bergCase.position.set(BERG.x + BERG_COOKIE.lx, cycle.water - WATER_HI + BERG_COOKIE.y, BERG.z + BERG_COOKIE.lz);
  bergCase.visible = n > 0.25; bergCase.material.opacity = 0.75 * Math.min(1, (n - 0.25) * 2);
  updateFloes(dt);
  last = t;
}
const smooth = (k) => k * k * (3 - 2 * k);
export const bergCookiePos = () => V3(BERG.x + BERG_COOKIE.lx, cycle.water - WATER_HI + BERG_COOKIE.y, BERG.z + BERG_COOKIE.lz);
void lightAt; void BEACH; void ISLES; void line;

// ---------- gewone koekjes ----------
line([0, TOP + 0.9, 38], [0, TOP + 0.9, 31], 4);
circle([-34, TOP + 0.9, 26], 3, 6);
circle([36, TOP + 0.9, 2], 4.2, 6);
circle([ARENA.x, TOP + 0.9, ARENA.z], 9, 10);
line([0, 0.9, 22], [0, 0.9, 8], 5);           // on the ice path (night) / over the lilies' water

// ---------- spawn, checkpoints, rocket ----------
export const SPAWN = V3(0, TOP, 50);
export const ARENA_ENTRY = SPAWN.clone();
export const ARENA_POS = V3(ARENA.x, ARENA.y, ARENA.z);
export const CHECKPOINTS = FLAGS.map((f) => ({ test: (p) => Math.hypot(p.x - f.pos.x, p.z - f.pos.z) < 3 && Math.abs(p.y - f.pos.y) < 2, pos: f.pos }));
export const PLANET = 'water';
export const TRAVEL = {
  pos: V3(5, TOP, 44),
  dests: [
    { need: 12, planet: 'tempel', name: 'de basis van Kayo & Yara', label: 'Opstijgen naar de basis van Kayo & Yara' },
    { need: 0, planet: 'zon', name: 'de Zon', label: 'Terug naar de Zon' },
    { need: 0, planet: 'schroot', name: 'de Schroothoop', label: 'Terug naar de Schroothoop' },
    { need: 0, planet: 'bos', name: 'het Paddenstoelenbos', label: 'Terug naar het Paddenstoelenbos' },
    { need: 0, planet: 'berg', name: 'de Bergwereld', label: 'Terug naar de Bergwereld' },
    { need: 0, planet: 'mistmaan', name: 'de Mistmaan', label: 'Terug naar de Mistmaan' },
  ],
};
// the ice of the night, so the story can tell when you're standing on it
export const isIce = (b) => !!(b && (b.ice || b.floe));
void bergBoxes;

// drifting specks in the air: sea spray, and little snowflakes
export const dust = (() => {
  const n = 400, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = (hr() - 0.5) * 120; pos[i * 3 + 1] = hr() * 20; pos[i * 3 + 2] = -90 + hr() * 150; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.14, color: 0xf4fcff, transparent: true, opacity: 0.7, depthWrite: false }));
  scene.add(p); return p;
})();
