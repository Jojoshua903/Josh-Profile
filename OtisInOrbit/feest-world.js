import { THREE, scene, toon, addOutline, V3, label, damp } from './core.js?v=sub1';
import { addCookie, line, circle } from './cookies.js?v=sub1';
import * as sfx from './sfx.js?v=sub1';
import { groundAt, PODIUM, CLIFF, ARENA } from './feest-terrain.js?v=sub1';

export const boxes = [];
export const movers = [];
export const lamps = [];
export const crates = [];
export const winOn = new THREE.MeshBasicMaterial({ color: 0xffc46b });
export const winOff = new THREE.MeshBasicMaterial({ color: 0x4a5a70 });
export const fogMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, depthWrite: false });
export const anim = [];
const edgeMat = new THREE.LineBasicMaterial({ color: 0x3a1a3a, transparent: true, opacity: 0.35 });

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
export const pillar = (x, z, w, d, y0, top, colTop, colSide, extra = {}) => block(x, (y0 + top) / 2, z, w, top - y0, d, colTop, colSide, extra);
let hs = 41;
export const hr = () => ((hs = (hs * 16807) % 2147483647) / 2147483647);
export const gy = (x, z) => groundAt(x, z, 0);
export const mesh = (geo, mat, x, y, z, parent = scene, ol = 1.05) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true;
  if (ol) addOutline(m, ol); parent.add(m); return m;
};
// a round thing you can stand on: a cylinder you see, a square box you stand on
export function drum(x, z, r, top, y0 = 0, shell = 0xe0443a, extra = {}) {
  const g = new THREE.Group(); g.position.set(x, y0, z); scene.add(g);
  const h = top - y0;
  mesh(new THREE.CylinderGeometry(r, r, h, 28), toon(shell), 0, h / 2, 0, g);
  // gold rims and the zigzag cord
  for (const y of [0.12, h - 0.12]) { const t = mesh(new THREE.TorusGeometry(r + 0.04, 0.1, 6, 32), toon(0xffd04a), 0, y, 0, g, 0); t.rotation.x = Math.PI / 2; }
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2, c = mesh(new THREE.CylinderGeometry(0.035, 0.035, Math.hypot(h - 0.3, r * 0.6)), toon(0xfff4e0), Math.cos(a) * (r + 0.05), h / 2, Math.sin(a) * (r + 0.05), g, 0);
    c.rotation.set(0, -a, (i % 2 ? 1 : -1) * 0.3);
  }
  const skinMat = new THREE.MeshLambertMaterial({ color: 0xfff4e0, emissive: 0x000000 });
  const skin = new THREE.Mesh(new THREE.CircleGeometry(r, 28), skinMat); skin.rotation.x = -Math.PI / 2; skin.position.y = h + 0.01; g.add(skin);
  const b = solid(x, (y0 + top) / 2, z, r * 1.5, h, r * 1.5, { drum: true, bounce: 14, ...extra });
  b.skinMat = skinMat; b.g = g; b.skin = skin;
  return b;
}
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
export function sign(x, z, text, yaw = 0, y = null) {
  const g = y ?? gy(x, z);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.2), toon(0x8a5a3a)); post.position.set(x, g + 1.1, z); scene.add(post);
  label(text, x, g + 2.4, z, 2.6).rotation.y = yaw;
}
const FLAGCOLS = [0xff4a8a, 0xffd04a, 0x4ad8ff, 0x8aff6a, 0xb47aff];
// a line of bunting between two points
function bunting(a, b, n = 10) {
  const sag = 0.8;
  for (let i = 0; i < n; i++) {
    const k = (i + 0.5) / n, p = a.clone().lerp(b, k); p.y -= Math.sin(k * Math.PI) * sag;
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 3), new THREE.MeshBasicMaterial({ color: FLAGCOLS[i % FLAGCOLS.length] }));
    f.position.copy(p); f.position.y -= 0.25; f.rotation.x = Math.PI; f.rotation.y = Math.atan2(b.x - a.x, b.z - a.z); scene.add(f);
  }
  const L = a.distanceTo(b), m = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, L), new THREE.MeshBasicMaterial({ color: 0x5a3a2a }));
  m.position.lerpVectors(a, b, 0.5); m.position.y -= sag * 0.6; m.quaternion.setFromUnitVectors(V3(0, 1, 0), V3().subVectors(b, a).normalize()); scene.add(m);
}

// ---------- light and sky: a bright party afternoon ----------
{
  const hemi = scene.children.find((o) => o.isHemisphereLight);
  const sunL = scene.children.find((o) => o.isDirectionalLight);
  if (hemi) { hemi.color.setHex(0xfff0f8); hemi.groundColor.setHex(0x6a9a5a); hemi.intensity = 1.5; }
  if (sunL) { sunL.color.setHex(0xfff0d0); sunL.intensity = 1.9; sunL.position.set(20, 45, 25); }
  scene.fog = new THREE.FogExp2(0xffd8e8, 0.0055);
  // two moons, striped like sweets
  for (const [x, y, z, r, c] of [[-90, 50, -140, 14, 0xff9ad8], [110, 34, -120, 8, 0x9ad8ff]]) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), new THREE.MeshBasicMaterial({ color: c, fog: false })); m.position.set(x, y, z); scene.add(m);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 1.5, r * 0.08, 6, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false })); ring.position.copy(m.position); ring.rotation.x = 1.2; scene.add(ring);
  }
}

// ---------- the four instruments: each is "off" until its part is back ----------
export const INST = { drum: false, orgel: false, xylo: false, tuba: false };
const DRUMS_EARLY = [];
// on the beat: 0 right on it … 1 just before the next one
export const beatPhase = () => { const b = sfx.beat(); return b - Math.floor(b); };
export const onBeat = () => beatPhase() < 0.5;

// ---------- Toeterdorp ----------
export const VILLAGE = { x: 2, z: 30 };
export const TUUT_AT = V3(-2, 0, 27);
export const NATHAN_AT = V3(15.5, 0, 33);
export const PLATE = V3(15.5, 0, 36.5);
{
  // round tents, striped
  for (const [x, z, r, c] of [[-12, 22, 2.6, 0xff6aa8], [-12, 37, 2.4, 0x6ac8ff], [8, 22, 2.2, 0xffc84a], [-2, 40, 2.6, 0x9a7aff], [20, 22, 2, 0x7ae87a]]) {
    pillar(x, z, r * 1.5, r * 1.5, 0, 2.6, c, c);
    const roof = mesh(new THREE.ConeGeometry(r * 1.15, 2.2, 12), toon(0xfff4f4), x, 3.7, z); roof.rotation.y = hr();
    mesh(new THREE.SphereGeometry(0.25, 8, 6), toon(c), x, 4.9, z, scene, 0);
  }
  // Nathan's batting cage: a net round the home plate
  const net = new THREE.MeshBasicMaterial({ color: 0x3a3a4a, transparent: true, opacity: 0.35, side: THREE.DoubleSide, wireframe: true });
  for (const [x, z, w, ry] of [[PLATE.x, PLATE.z + 2.5, 5, 0], [PLATE.x - 2.5, PLATE.z, 5, Math.PI / 2], [PLATE.x + 2.5, PLATE.z, 5, Math.PI / 2]]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, 3.2, 8, 5), net); p.position.set(x, 1.6, z); p.rotation.y = ry; scene.add(p);
  }
  for (const [dx, dz] of [[-2.5, -2.5], [2.5, -2.5], [-2.5, 2.5], [2.5, 2.5]]) mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.4), toon(0x3a3a4a), PLATE.x + dx, 1.7, PLATE.z + dz, scene, 0);
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.06, 5), new THREE.MeshBasicMaterial({ color: 0xffffff })); plate.position.set(PLATE.x, 0.04, PLATE.z); scene.add(plate);
  sign(PLATE.x + 3.4, PLATE.z - 2.8, 'Nathan’s slagkooi', 0);
  // bunting over the square
  bunting(V3(-12, 3.4, 22), V3(8, 3.4, 22), 14); bunting(V3(-12, 3.4, 37), V3(-2, 3.4, 40), 8); bunting(V3(8, 3.4, 22), V3(20, 3.4, 22), 8);
  sign(4, 41, 'Toeterdorp', 0);
  sign(-6, 14, '← Trommelveld · Podium ↑', 0);
}
// the festival cake: three tiers, too tall for an ordinary jump
export const CAKE = { x: -4, z: 18 };
{
  const { x, z } = CAKE;
  const tiers = [[3.6, 2, 0xffb8d8], [2.2, 4.2, 0xfff0f4], [1.4, 6.4, 0xffb8d8]];
  let y0 = 0;
  for (const [r, top, c] of tiers) {
    pillar(x, z, r * 1.5, r * 1.5, y0, top, c, c);
    // icing drips and sprinkles
    mesh(new THREE.TorusGeometry(r * 1.06, 0.18, 6, 24), toon(0xffffff), x, top - 0.05, z, scene, 0).rotation.x = Math.PI / 2;
    for (let i = 0; i < 8; i++) { const a = hr() * Math.PI * 2; mesh(new THREE.BoxGeometry(0.25, 0.08, 0.08), new THREE.MeshBasicMaterial({ color: FLAGCOLS[i % 5] }), x + Math.cos(a) * r * 0.5, top + 0.05, z + Math.sin(a) * r * 0.5, scene, 0).rotation.y = hr() * 3; }
    y0 = top;
  }
  // on top: a little drum instead of a candle. Once the drums play, it throws you up to the cookie
  DRUMS_EARLY.push(drum(x, z, 0.85, 6.9, 6.4, 0x4ad8ff));
  addCookie(x, 15, z, 'Op de feesttaart');
}

// ---------- het Trommelveld ----------
export const DRUMS = DRUMS_EARLY;
DRUMS.push(drum(-26, 10, 2.2, 1.5));
DRUMS.push(drum(-32, 3, 2, 3, 0, 0x4a8aff));
DRUMS.push(drum(-38, 12, 2.4, 5, 0, 0xffa020));
DRUMS.push(drum(-30, 20, 1.8, 2, 0, 0x8a4aff));
DRUMS.push(drum(-43, -1, 2, 4, 0, 0x4ad86a));
DRUMS.push(drum(-21, 25, 1.6, 1.2, 0, 0xff4a8a));
// the drum tower: three drums stacked up, the top at 12
export const TOWER = { x: -44, z: -8, top: 12 };
{
  drum(TOWER.x, TOWER.z, 2.6, 4, 0, 0xe0443a, { bounce: 0 });
  drum(TOWER.x, TOWER.z, 2.1, 8, 4, 0xffd04a, { bounce: 0 });
  DRUMS.push(drum(TOWER.x, TOWER.z, 1.7, TOWER.top, 8, 0x4a8aff));
  addCookie(-38, 14.4, 12, 'Boven de grootste trommel');
  sign(-22, 4, 'Trommelveld', 0);
  // a rock ledge the drumsticks are stuck on (a slack drum gets you there)
  pillar(-29, -1, 2.2, 2.2, 0, 4.4, 0xb89aa8, 0x8a6a7a);
}
export const STICKS_AT = V3(-29, 5.2, -1);
export const BELLOWS_AT = V3(TOWER.x, TOWER.top + 0.9, TOWER.z);

// ---------- het Orgelpijpenbos: pipes in a line up to the podium ----------
export const PIPES = [];
{
  const from = V3(30, 0, -2), to = V3(13.5, 0, -26.5), n = 10;
  for (let i = 0; i < n; i++) {
    const p = from.clone().lerp(to, i / (n - 1));
    const lo = 1 + i * 0.9, H = 16;
    const b = block(p.x, lo - H / 2, p.z, 2.5, H, 2.5, 0xffe080, 0xc8a040);
    mesh(new THREE.TorusGeometry(0.75, 0.08, 6, 18), toon(0x3a2a20), 0, H / 2 - 1.1, 0.96, b.mesh, 0);
    b.lo = lo; b.i = i; b.top = 0.6;      // b.top: where it is now (it starts low: no air in the organ)
    b.mover = { b, delta: V3(), fn() { return V3(p.x, b.top - H / 2, p.z); } };
    movers.push(b.mover); PIPES.push(b);
  }
  // the tallest pipe, standing still, just next to the top of the line
  const tall = pillar(19.5, -24, 1.5, 1.5, 0, 13, 0xffe080, 0xc8a040);
  void tall;
  addCookie(19.5, 14.2, -24, 'Top van de hoogste orgelpijp');
  for (const [x, z, h] of [[24, -14, 4], [34, -10, 6], [20, -6, 3], [26, 2, 2.5]]) pillar(x, z, 1.2, 1.2, 0, h, 0xffe080, 0xc8a040);
  sign(26, 6, 'Orgelpijpenbos', 0);
}
const PIPE_RISE = 2.6;
function updatePipes(dt) {
  const b = sfx.beat();
  for (const p of PIPES) {
    let want;
    if (!INST.orgel) want = 0.6;
    else {
      // each pipe pumps up and down over four beats, one beat after the one before it: a staircase that walks
      const u = ((b / 2 - p.i) % 4 + 4) % 4;     // in bars of two beats: up for one, high for one, down for one, low for one
      const k = u < 1 ? u : u < 2 ? 1 : u < 3 ? 3 - u : 0;
      want = p.lo + PIPE_RISE * (k * k * (3 - 2 * k));
    }
    p.top += (want - p.top) * Math.min(1, dt * (INST.orgel ? 14 : 3));
  }
}

// ---------- de Xylofoonwand: keys up the east cliff ----------
export const KEYS = [];
export const KEY_NOTES = [0, 2, 4, 5, 7, 9, 11, 12];
const KEYCOLS = [0xff4a4a, 0xffa04a, 0xffe04a, 0x7ae84a, 0x4ad8c8, 0x4a8aff, 0x9a6aff, 0xff6ad8];
{
  for (let k = 0; k < 8; k++) {
    const x = 33.6, z = 12 - k * 2.6;
    const b = block(x, 0.15, z, 3.2, 0.3, 2.2, KEYCOLS[k], KEYCOLS[k], {
      key: k,
      onLand() { sfx.note(KEY_NOTES[k]); b.ping = 1; if (keyListener) keyListener(k); },
    });
    b.mesh.material.forEach((m) => m.emissive && m.emissive.setHex(0x000000));
    b.want = 0.15; b.ping = 0; b.flat = 0.15; b.up = 1.1 * (k + 1) - 0.15;   // key top at 1.1, 2.2 … 8.8: a staircase up the cliff
    b.mover = { b, delta: V3(), fn() { return V3(x, b.want, z); } };
    movers.push(b.mover); KEYS.push(b);
    // a hammer stand beside the first key
  }
  sign(31, 15.5, 'Xylofoonwand', 0);
}
let keyListener = null;
export function onKey(fn) { keyListener = fn; }
function updateKeys(dt) {
  for (const b of KEYS) {
    const target = INST.xylo ? b.up : b.flat;
    b.want += (target - b.want) * Math.min(1, dt * 3);
    b.ping = Math.max(0, b.ping - dt * 3);
    b.mesh.material.forEach((m) => m.emissive && m.emissive.setScalar(b.ping * 0.5));
  }
}
export const MOUTH_AT = V3(46, CLIFF.h + 1, -8);

// ---------- de tuba: blows a column of air up beside the podium ----------
export const TUBA = { x: -11, z: -16.5 };
export const COLUMN = { x: -11, z: -23.5, r: 1.7, top: 16.5 };
const columnMesh = new THREE.Mesh(new THREE.CylinderGeometry(COLUMN.r, COLUMN.r, COLUMN.top, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff4c0, transparent: true, opacity: 0.0, side: THREE.DoubleSide, depthWrite: false }));
{
  const brass = toon(0xffc040), brassD = toon(0xc88a20);
  // the tube lies in the grass, and a bend runs from it to the bell under the air column
  const bend = mesh(new THREE.CylinderGeometry(0.9, 0.9, 3, 20), brass, TUBA.x, 0.9, COLUMN.z + 2.6); bend.rotation.x = Math.PI / 2;
  const tube = mesh(new THREE.CylinderGeometry(0.9, 0.9, 9, 20), brass, TUBA.x, 0.9, TUBA.z); tube.rotation.x = Math.PI / 2;
  solid(TUBA.x, 0.9, TUBA.z, 1.8, 1.8, 9);
  const bell = mesh(new THREE.CylinderGeometry(2.2, 0.9, 2.4, 24, 1, true), brass, COLUMN.x, 1.2, COLUMN.z); bell.material.side = THREE.DoubleSide;
  mesh(new THREE.TorusGeometry(2.2, 0.16, 8, 32), brassD, COLUMN.x, 2.4, COLUMN.z, scene, 0).rotation.x = Math.PI / 2;
  for (let i = 0; i < 3; i++) mesh(new THREE.CylinderGeometry(0.25, 0.25, 1.2), brassD, TUBA.x + 0.6, 2.2, TUBA.z + 1.5 + i * 0.9, scene, 0);
  columnMesh.position.set(COLUMN.x, COLUMN.top / 2, COLUMN.z); scene.add(columnMesh);
  sign(TUBA.x + 2.6, TUBA.z + 5.5, 'De Grote Tuba', 0);
  // a little balcony high up next to the air column, with a rare crate
  pillar(-14.5, -27, 2, 2, 0, 13.2, 0xffd04a, 0xc8a040);
  crate(-14.5, -27, true, 'Naast de tubawind', 13.2);
}
const notes = [];
const noteMat = new THREE.MeshBasicMaterial({ color: 0x3a1a3a });
function updateColumn(dt, t) {
  columnMesh.material.opacity += ((INST.tuba ? 0.18 + Math.sin(t * 8) * 0.04 : 0) - columnMesh.material.opacity) * damp(4, dt);
  if (!INST.tuba) return;
  if (Math.random() < dt * 6 && notes.length < 14) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), noteMat); m.scale.y = 0.8;
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.45, 0.04), noteMat); s.position.set(0.14, 0.22, 0); m.add(s);
    m.position.set(COLUMN.x + (Math.random() - 0.5) * 2, 1.5, COLUMN.z + (Math.random() - 0.5) * 2); scene.add(m); notes.push(m);
  }
  for (let i = notes.length - 1; i >= 0; i--) { const m = notes[i]; m.position.y += dt * 6; m.rotation.y += dt * 3; if (m.position.y > COLUMN.top) { scene.remove(m); notes.splice(i, 1); } }
}

// ---------- het Galmpodium ----------
export const STAGE = { x: PODIUM.x, y: PODIUM.h, z: PODIUM.z };
export const speakers = [];
{
  const { x, y, z } = STAGE;
  // the back wall with the big speakers
  pillar(x, z - 13.6, 16, 1.2, y, y + 7, 0x8a4aff, 0x6a2ad8);
  for (const s of [-1, 1]) {
    const sp = pillar(x + 9.5 * s, z - 11.6, 3, 2.2, y, y + 5.5, 0x2a2a3a, 0x1a1a24);
    for (const yy of [1.6, 4]) { const cone = mesh(new THREE.CircleGeometry(0.85, 20), new THREE.MeshBasicMaterial({ color: 0x4a4a5a }), 0, yy - 2.75, 1.12, sp.mesh, 0); speakers.push(cone); }
  }
  label('GALMFEEST', x, y + 8.4, z - 13, 7);
  bunting(V3(x - 8, y + 7, z - 13), V3(x - 13, y + 4, z - 2), 9); bunting(V3(x + 8, y + 7, z - 13), V3(x + 13, y + 4, z - 2), 9);
  sign(4, -18, 'Het Galmpodium', 0, 0);
}
// after the mole's beaten, his tunnel opens at the foot of the podium: a little cave with his stash in it
export const HOLE = { x: -3, z: -19.5 };
export const holeDoor = pillar(HOLE.x, HOLE.z, 2.4, 0.6, 0, 2.4, 0xb89aa8, 0x8a6a7a);
{
  // the cave: three walls and a roof against the podium cliff
  pillar(HOLE.x - 1.6, HOLE.z - 1.3, 0.4, 3, 0, 2.6, 0x6a4a3a, 0x4a3020);
  pillar(HOLE.x + 1.6, HOLE.z - 1.3, 0.4, 3, 0, 2.6, 0x6a4a3a, 0x4a3020);
  pillar(HOLE.x, HOLE.z - 1.3, 3.6, 3, 2.6, 3, 0x7ad86a, 0x6a4a3a);
}
export function openHole() { const i = boxes.indexOf(holeDoor); if (i >= 0) boxes.splice(i, 1); holeDoor.mesh.visible = false; }

// ---------- the balloon over the drum field (only Nathan's bat gets you up there) ----------
export const BALLOON = { x: -18, z: -14, y: 19 };
{
  const { x, y, z } = BALLOON;
  const g = new THREE.Group(); g.position.set(x, y, z); scene.add(g);
  mesh(new THREE.SphereGeometry(4.2, 24, 18), toon(0xff6aa8), 0, 7, 0, g);
  for (let i = 0; i < 6; i++) { const s = mesh(new THREE.SphereGeometry(4.24, 24, 18, (i / 6) * Math.PI * 2, 0.35), toon(0xfff4f4), 0, 7, 0, g, 0); void s; }
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) mesh(new THREE.CylinderGeometry(0.04, 0.04, 3.4), toon(0x5a3a2a), dx * 1.2, 2.2, dz * 1.2, g, 0);
  const basket = block(x, y + 0.4, z, 3, 0.8, 3, 0xc8985a, 0xa87040);
  anim.push((t) => { const dy = Math.sin(t * 0.8) * 0.4; g.position.y = y + dy; basket.pos.y = y + 0.4 + dy; syncBox(basket); });
  basket.mover = { b: basket, delta: V3(), fn(t) { return V3(x, y + 0.4 + Math.sin(t * 0.8) * 0.4, z); } };
  movers.push(basket.mover);
  addCookie(x, y + 2.1, z, 'Op de luchtballon');
}

// ---------- gongs (see trials.js) ----------
export const GONGS = [V3(-14, 0, 30), V3(-40, 0, 22), V3(30, 0, -12)].map((p) => {
  const g = new THREE.Group(); g.position.copy(p); scene.add(g);
  for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.2), toon(0x8a3a2a), 1.1 * s, 1.6, 0, g, 0);
  mesh(new THREE.BoxGeometry(2.4, 0.16, 0.16), toon(0x8a3a2a), 0, 3.1, 0, g, 0);
  const disc = mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.1, 24), toon(0xffc040), 0, 1.8, 0, g); disc.rotation.x = Math.PI / 2;
  return { g, disc, p, rung: 0 };
});

// ---------- decoration ----------
{
  // balloons on strings round the meadow
  for (let i = 0; i < 22; i++) {
    const x = (hr() - 0.5) * 90, z = -50 + hr() * 96;
    if (Math.hypot(x - PODIUM.x, z - PODIUM.z) < PODIUM.r + 2 || (x > CLIFF.x0 - 1)) continue;
    const g = gy(x, z), c = FLAGCOLS[i % 5];
    const b = mesh(new THREE.SphereGeometry(0.5, 12, 10), toon(c), x, g + 3.4, z, scene, 0); b.scale.y = 1.2;
    mesh(new THREE.CylinderGeometry(0.01, 0.01, 2.6), toon(0xffffff), x, g + 1.6, z, scene, 0);
    const ph = hr() * 6;
    anim.push((t) => { b.position.y = g + 3.4 + Math.sin(t * 1.4 + ph) * 0.15; });
  }
  // flowers
  for (let i = 0; i < 60; i++) {
    const x = (hr() - 0.5) * 96, z = -52 + hr() * 100;
    if (gy(x, z) !== 0) continue;
    mesh(new THREE.SphereGeometry(0.14, 6, 5), new THREE.MeshBasicMaterial({ color: FLAGCOLS[i % 5] }), x, 0.2, z, scene, 0);
  }
}

// ---------- coins ----------
line([0, 0.9, 38], [0, 0.9, 30], 4);
circle([CAKE.x, 2.2 + 0.9, CAKE.z], 2.8, 6);
line([-14, 0.9, 16], [-22, 0.9, 12], 4);
circle([-38, 5.9, 12], 1.4, 5);
line([28, 0.9, 4], [32, 0.9, 10], 3);
line([33.6, 2, 12], [33.6, 8.5, -6.2], 7, (x, z) => 1.1 * Math.round((12 - z) / 2.6 + 1) + 0.9);
line([40, CLIFF.h + 0.9, 8], [48, CLIFF.h + 0.9, -10], 5);
circle([STAGE.x, STAGE.y + 0.9, STAGE.z], 8, 10);
line([4, 0.9, -4], [6, 0.9, -14], 4);

// ---------- checkpoints ----------
export const FLAGS = [[2, 33], [-20, 14], [22, 4], [30, 16], [42, -12], [5, -15]].map(([x, z]) => {
  const p = V3(x, gy(x, z), z);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4), toon(0x3a3e4e)); pole.position.set(p.x, p.y + 1.2, p.z); scene.add(pole);
  const mat = new THREE.MeshBasicMaterial({ color: 0x9a948a, side: THREE.DoubleSide });
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), mat); cloth.position.set(p.x + 0.45, p.y + 2.1, p.z); scene.add(cloth);
  return { pos: p, mat };
});

// ---------- spawn, rocket ----------
export const SPAWN = V3(0, 0, 47);
export const ARENA_ENTRY = V3(5, 0, -15);
export const ARENA_POS = V3(ARENA.x, ARENA.y, ARENA.z);
export const CHECKPOINTS = FLAGS.map((f) => ({ test: (p) => Math.hypot(p.x - f.pos.x, p.z - f.pos.z) < 3 && Math.abs(p.y - f.pos.y) < 2, pos: f.pos }));
export const PLANET = 'feest';
export const rocket = new THREE.Group();
{
  const r = rocket; r.position.set(6, 0, 47); r.rotation.y = -0.3;
  const add = (m, ol = 1.05) => { m.castShadow = true; if (ol) addOutline(m, ol); r.add(m); return m; };
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.0, 3.2, 24), toon(0xfbf3e4))).position.y = 1.8;
  add(new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.4, 24), toon(0xff5a36))).position.y = 4.1;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 3;
    const f = add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.3, 0.9), toon(0xff5a36))); f.position.set(Math.sin(a) * 1.05, 0.75, Math.cos(a) * 1.05); f.rotation.y = a;
  }
  add(new THREE.Mesh(new THREE.CircleGeometry(0.42, 32), new THREE.MeshBasicMaterial({ color: 0x9ad8ff })), 0).position.set(0, 2.5, 0.95);
  scene.add(r);
  solid(6, 1.6, 47, 2.4, 3.2, 2.4);
}
export const TRAVEL = {
  pos: V3(6, 0, 47),
  dests: [
    { need: 12, planet: 'regen', name: 'de Regenstad', label: 'Opstijgen naar de Regenstad' },
    { need: 0, planet: 'tempel', name: 'de Vergeten Tempel', label: 'Terug naar de Vergeten Tempel' },
    { need: 0, planet: 'water', name: 'de Waterplaneet', label: 'Terug naar de Waterplaneet' },
    { need: 0, planet: 'zon', name: 'de Zon', label: 'Terug naar de Zon' },
    { need: 0, planet: 'schroot', name: 'de Schroothoop', label: 'Terug naar de Schroothoop' },
    { need: 0, planet: 'bos', name: 'het Paddenstoelenbos', label: 'Terug naar het Paddenstoelenbos' },
    { need: 0, planet: 'berg', name: 'de Bergwereld', label: 'Terug naar de Bergwereld' },
    { need: 0, planet: 'mistmaan', name: 'de Mistmaan', label: 'Terug naar de Mistmaan' },
  ],
};

// confetti in the air
export const dust = (() => {
  const n = 500, pos = new Float32Array(n * 3), colA = new Float32Array(n * 3);
  const pal = [[1, 0.4, 0.6], [1, 0.85, 0.3], [0.3, 0.85, 1], [0.6, 1, 0.4], [0.75, 0.5, 1]];
  for (let i = 0; i < n; i++) { pos[i * 3] = (hr() - 0.5) * 100; pos[i * 3 + 1] = hr() * 22; pos[i * 3 + 2] = -55 + hr() * 105; colA.set(pal[i % 5], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(colA, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.17, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false }));
  scene.add(p); return p;
})();

// ---------- every frame ----------
export function updateWorld(t, dt, P) {
  for (const f of anim) f(t, dt);
  // drums: once the sticks are back, the skins light up on the beat. Land while it's lit and it throws you high
  const lit = INST.drum && onBeat();
  for (const d of DRUMS) {
    d.bounce = INST.drum ? (lit ? 24 : 14) : 13;
    d.skinMat.emissive.setHex(lit ? 0xff8a3a : 0x000000);
  }
  updatePipes(dt);
  updateKeys(dt);
  updateColumn(dt, t);
  // the air column lifts you
  if (INST.tuba && P && Math.hypot(P.pos.x - COLUMN.x, P.pos.z - COLUMN.z) < COLUMN.r && P.pos.y < COLUMN.top) {
    P.vel.y = Math.max(P.vel.y, P.pos.y < COLUMN.top - 1.5 ? 11 : 4); P.pound = 0; P.grounded = false; P.coyote = 0.15;
  }
  // speakers pump once the festival's on
  const ph = beatPhase();
  for (const s of speakers) s.scale.setScalar(INST.drum && INST.tuba ? 1 + (1 - ph) * 0.15 : 1);
}
void ARENA;
