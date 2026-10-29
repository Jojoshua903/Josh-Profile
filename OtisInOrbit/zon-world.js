import { THREE, scene, toon, addOutline, V3, label } from './core.js?v=sub1';
import { addCookie, line, circle } from './cookies.js?v=sub1';

import { groundAt, ROCKS, ARENA, MAGMA_Y, magma, magmaGlow } from './zon-terrain.js?v=sub1';

// ---------- blinding sunlight from everywhere, warm haze ----------
scene.fog = new THREE.FogExp2(0xffa24a, 0.0075);
const hemi = scene.children.find((o) => o.isHemisphereLight);
hemi.color.setHex(0xfff0c8); hemi.groundColor.setHex(0xff6a2a); hemi.intensity = 1.8;
const sunL = scene.children.find((o) => o.isDirectionalLight);
sunL.color.setHex(0xffe0a0); sunL.intensity = 1.9;

export const boxes = [];
export const movers = [];
export const lamps = [];
export const crates = [];
export const winOn = new THREE.MeshBasicMaterial({ color: 0xffc46b });
export const winOff = new THREE.MeshBasicMaterial({ color: 0x4a5a70 });
export const fogMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, depthWrite: false });
// things in the world that move every frame on their own (called by the story)
export const anim = [];
const edgeMat = new THREE.LineBasicMaterial({ color: 0x2a1010, transparent: true, opacity: 0.45 });

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
// a block standing on the ground (or on y0) with its top at `top`
const stand = (x, z, w, d, top, colTop, colSide, y0 = 0, extra = {}) => block(x, (y0 + top) / 2, z, w, top - y0, d, colTop, colSide, extra);
let hs = 19;
const hr = () => ((hs = (hs * 16807) % 2147483647) / 2147483647);
const gy = (x, z) => { const g = groundAt(x, z, 0); return g === -Infinity ? MAGMA_Y : g; };
const ease = (k) => k * k * (3 - 2 * k);

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
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.2), toon(0x5a3a2a)); post.position.set(x, g + 1.1, z); scene.add(post);
  label(text, x, g + 2.4, z, 2.6).rotation.y = yaw;
}
const mesh = (geo, mat, x, y, z, parent = scene, ol = 1.05) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true;
  if (ol) addOutline(m, ol); parent.add(m); return m;
};

// ---------- het drijven: rafts of crust on the magma ----------
// A raft goes back and forth between two spots, waits a bit at each end, and carries everything on it.
// Its boxes are movers (so Josh rides along), its decoration hangs in one group, and cookies and
// characters on it get their position from raftAt() every frame.
export const RAFTS = {};
function shuttle(a, b, dwellA, move, dwellB, start = 0) {
  const T = dwellA + move + dwellB + move;
  return (t) => {
    let u = (((t - start) % T) + T) % T, k;
    if (u < dwellA) k = 0;
    else if ((u -= dwellA) < move) k = ease(u / move);
    else if ((u -= move) < dwellB) k = 1;
    else k = 1 - ease((u - dwellB) / move);
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  };
}
function raft(name, at, w, d, colTop = 0x5a4448, colSide = 0x3a2a2e) {
  const r = { name, at, t: -1, x: 0, z: 0, w, d, g: new THREE.Group(), cookies: [] };
  r.pos = (t) => { if (t !== r.t) { r.t = t; [r.x, r.z] = at(t); } return r; };
  r.pos(0); scene.add(r.g);
  RAFTS[name] = r;
  rblock(r, 0, -1, 0, w, 2, d, colTop, colSide);
  // a glowing seam where the crust meets the magma
  const seam = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.25, d + 0.3), new THREE.MeshBasicMaterial({ color: 0xffb030 }));
  seam.position.y = MAGMA_Y + 0.08; r.g.add(seam);
  return r;
}
// a box on a raft, at its local position
function rblock(r, lx, ly, lz, w, h, d, top, side, extra = {}) {
  const b = block(r.x + lx, ly, r.z + lz, w, h, d, top, side, extra);
  b.mover = { b, delta: V3(), fn(t) { r.pos(t); return V3(r.x + lx, ly, r.z + lz); } };
  movers.push(b.mover);
  return b;
}
const rstand = (r, lx, lz, w, d, top, cTop, cSide, y0 = 0) => rblock(r, lx, (y0 + top) / 2, lz, w, top - y0, d, cTop, cSide);
function rcookie(r, lx, ly, lz, name = '', id = null) { const c = addCookie(r.x + lx, ly, r.z + lz, name, id); r.cookies.push({ c, lx, lz }); return c; }
// where a spot on a raft is right now (rafts null → a fixed spot)
export function raftAt(raftName, lx, lz, y = 0) {
  if (!raftName) return V3(lx, y, lz);
  const r = RAFTS[raftName]; return V3(r.x + lx, y, r.z + lz);
}
export function updateRafts(t) {
  for (const k in RAFTS) {
    const r = RAFTS[k].pos(t);
    r.g.position.set(r.x, Math.sin(t * 1.3 + r.w) * 0.02, r.z);
    for (const { c, lx, lz } of r.cookies) if (!c.got) { c.g.position.x = r.x + lx; c.g.position.z = r.z + lz; }
  }
}

// ---------- the landing rock ----------
export const rocket = new THREE.Group();
{
  const r = rocket; r.position.set(6, 0, 44); r.rotation.set(0.05, -0.4, -0.06);
  const add = (m, ol = 1.05) => { m.castShadow = true; if (ol) addOutline(m, ol); r.add(m); return m; };
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.0, 3.2, 24), toon(0xfbf3e4))).position.y = 1.8;
  add(new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.4, 24), toon(0xff5a36))).position.y = 4.1;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 3;
    const f = add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.3, 0.9), toon(0xff5a36))); f.position.set(Math.sin(a) * 1.05, 0.75, Math.cos(a) * 1.05); f.rotation.y = a;
  }
  add(new THREE.Mesh(new THREE.CircleGeometry(0.42, 32), new THREE.MeshBasicMaterial({ color: 0x9ad8ff })), 0).position.set(0, 2.5, 0.95);
  scene.add(r); solid(6, 2, 44, 2.4, 4, 2.4);
}
// Adam's spot: a beach chair under a parasol, looking out over the magma like it's the sea
export const ADAM_AT = V3(-7, 0, 42);
{
  const pole = mesh(new THREE.CylinderGeometry(0.06, 0.06, 3), toon(0xe8e2d4), ADAM_AT.x - 1, 1.5, ADAM_AT.z + 0.4);
  const shade = mesh(new THREE.ConeGeometry(1.8, 0.7, 12, 1, true), toon(0xff5a7a), 0, 1.6, 0, pole, 1.03); shade.material.side = THREE.DoubleSide;
  for (let i = 0; i < 6; i++) { const s = mesh(new THREE.BoxGeometry(0.06, 0.05, 1.7), toon(0xfff0d0), 0, 1.3, 0, pole, 0); s.rotation.set(-0.38, (i / 6) * Math.PI * 2, 0); s.position.set(Math.sin((i / 6) * Math.PI * 2) * 0.75, 1.32, Math.cos((i / 6) * Math.PI * 2) * 0.75); }
  stand(ADAM_AT.x, ADAM_AT.z - 0.1, 1.1, 1.6, 0.4, 0x7ad0ff, 0x3a8ad0);
  const back = block(ADAM_AT.x, 0.85, ADAM_AT.z - 0.95, 1.1, 0.9, 0.12, 0x7ad0ff, 0x3a8ad0); back.mesh.rotation.x = -0.35;
  mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.5, 14), toon(0xfff0d0), ADAM_AT.x + 1.2, 0.25, ADAM_AT.z + 0.2);
  mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.25, 10), toon(0x9ad8ff), ADAM_AT.x + 1.2, 0.62, ADAM_AT.z + 0.2, scene, 0);
}
// Opa Pluis' burrow: a little dome of sun-baked sand with a round door
export const PLUIS_AT = V3(-11, 0, 34.5);
{
  const dome = mesh(new THREE.SphereGeometry(2, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon(0xe8b070), PLUIS_AT.x - 0.6, 0, PLUIS_AT.z - 2.2); dome.scale.y = 0.75;
  solid(PLUIS_AT.x - 0.6, 0.75, PLUIS_AT.z - 2.2, 3, 1.5, 3);
  mesh(new THREE.CircleGeometry(0.55, 16), new THREE.MeshBasicMaterial({ color: 0x3a2018 }), PLUIS_AT.x - 0.6, 0.5, PLUIS_AT.z - 0.47, scene, 0);
}
// mats with sunglasses and buckets: it's a beach, after all
for (const [x, z, c] of [[-3, 46, 0xff5a7a], [2, 50, 0x7ad0ff]]) { const m = mesh(new THREE.BoxGeometry(1.4, 0.04, 2.4), toon(c), x, 0.03, z, scene, 0); m.rotation.y = hr() - 0.5; }
sign(0, 32, '↖ Stofbadvlot · ↗ Panelenvlot · (wacht tot ze aanleggen!)');
sign(-12.5, 31, 'Pas op: magma is HEET', 0.4);
crate(11, 36); crate(-12, 50);

// ---------- 1. het Stofbadvlot: where the chinchillas roll in sun dust ----------
// shuttles between the landing rock and the Westrots
const STOF = raft('stof', shuttle([-8, 24.8], [-26, 13.2], 3, 7, 3, 0), 12, 10, 0xd8b088, 0x8a6040);
// three little dust bowls: ground-pound into each one (see trials.js) and the big bowl fills with a cookie
export const BOWLS = [[-3.5, 2.5], [3.5, 2.8], [-3.8, -2.6]].map(([lx, lz]) => ({ raft: 'stof', lx, lz }));
export const BIG_BOWL = { raft: 'stof', lx: 1.6, lz: -3.4, y: 5.4 };
{
  const r = STOF, dustMat = toon(0xf4e0b8), bowlMat = toon(0xc8986a);
  for (const bw of BOWLS) {
    const ring = mesh(new THREE.TorusGeometry(1.1, 0.22, 8, 20), bowlMat, bw.lx, 0.15, bw.lz, r.g); ring.rotation.x = Math.PI / 2;
    bw.dust = mesh(new THREE.CircleGeometry(1.05, 20), dustMat.clone(), bw.lx, 0.04, bw.lz, r.g, 0); bw.dust.rotation.x = -Math.PI / 2;
  }
  // the big bowl on a tower of sand sacks
  rstand(r, 3, -2, 3, 3, 1.3, 0xe0c090, 0xa07848);
  rstand(r, 4.6, -3.6, 1.6, 1.6, 2.4, 0xe0c090, 0xa07848);
  rstand(r, 3.2, -3.9, 1.4, 1.4, 3.5, 0xe0c090, 0xa07848);
  rstand(r, 1.6, -3.4, 2.4, 2.4, 4.6, 0xf4e0b8, 0xc8986a);
  const rim = mesh(new THREE.TorusGeometry(1.25, 0.18, 8, 20), bowlMat, 1.6, 4.7, -3.4, r.g); rim.rotation.x = Math.PI / 2;
  for (const [lx, lz] of [[-1, 3.5], [1, 3.5], [3, 3.5], [-5, 0], [-5, -2]]) rcookie(r, lx, 0.9, lz);
}
export { rcookie };

// ---------- 2. het Panelenvlot: solar panels, all tilted to the sun ----------
// shuttles between the landing rock and the Oostrots
const PAN = raft('panelen', shuttle([8, 24.8], [31, 7.2], 3, 7, 3, 10), 12, 10, 0x4a4a5a, 0x2a2a3a);
{
  const r = PAN, panelTop = 0x2a4a9a, frame = 0xc8ccd4;
  // a staircase of panel stands, each one higher
  const steps = [[-3.5, 2.5, 1.2], [-1, 0.5, 2.4], [1.6, -1.4, 3.6], [4, -3, 4.8]];
  for (const [lx, lz, top] of steps) {
    rstand(r, lx, lz, 2.4, 2.2, top, panelTop, frame);
    for (let i = 0; i < 3; i++) mesh(new THREE.BoxGeometry(2.3, 0.02, 0.05), toon(0x9ab8f0), 0, top / 2 + 0.01, -0.7 + i * 0.7, r.g, 0).position.set(lx, top + 0.01, lz - 0.7 + i * 0.7);
  }
  for (const [lx, lz] of [[-4, -2], [-2, -3], [0, -4]]) rcookie(r, lx, 0.9, lz);
  rcookie(r, 4, 5.7, -3);
}

// ---------- de Westrots ----------
{
  stand(-31, 2, 8, 1, 2.6, 0x6a5a5e, 0x3a2e32);
  stand(-34.5, 5.5, 1.4, 1.4, 1.5, 0x6a5a5e, 0x3a2e32);
  line([-34, 0.9, 6], [-28, 0.9, 6], 4);
  sign(-28, 6.5, '↓ Kristalvlot · ↑ Stofbadvlot · ← ???', -0.3);
}

// ---------- zonnegeisers: vents in the magma that blast hot air up ----------
// Each one rumbles (bubbles), then blows for a moment: stand in the column and it shoots you up.
// Steer sideways out of the top onto a ledge. (Hot air, not magma: it doesn't hurt.)
export const GEYSERS = [];
function geyser(x, z, top, period, offset) {
  const col = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.6, 1, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff4c0, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
  scene.add(col);
  const vent = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.3, 8, 20), toon(0x3a2e32)); vent.rotation.x = Math.PI / 2; vent.position.set(x, MAGMA_Y + 0.1, z); scene.add(vent);
  const ring = new THREE.Mesh(new THREE.CircleGeometry(1.3, 20), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(x, MAGMA_Y + 0.15, z); scene.add(ring);
  const g = { x, z, top, period, offset, col, ring, state: 'idle' };
  GEYSERS.push(g); return g;
}
// the Westrots chimney: two vents, one after the other, up to a high ledge with a rare crate
{
  geyser(-40, 3, 9.5, 5, 0);
  stand(-44.2, 3, 3, 3, 7, 0x6a5a5e, 0x3a2e32, MAGMA_Y - 1);
  geyser(-44.2, -1.6, 14.5, 5, 2.5);
  stand(-44.2, -6.4, 3, 3, 12, 0x6a5a5e, 0x3a2e32, MAGMA_Y - 1);
  crate(-44.2, -6.6, true, 'Boven op de zonnegeisers', 12);
  sign(-36, 3, 'Wacht op de wind!', -Math.PI / 2, 0);
}
// one in the middle of the Stofbadvlot's route: jump into it as you ride past
geyser(-17, 19, 10, 6, 1.5);
addCookie(-17, 9, 19, 'Hoog boven de magmastroom');

// ---------- vouwpanelen: from the Oostrots, old panels over the magma that fold away under you ----------
export const FOLDERS = [];
{
  const steps = [[39.5, -3, 1.2], [42.8, -5.2, 2.2], [46.2, -3.4, 3.2], [49.4, -6, 2.4], [52.6, -3.8, 3.6]];
  for (const [x, z, top] of steps) {
    const b = block(x, top - 0.6, z, 2, 1.2, 2, 0x2a4a9a, 0xc8ccd4);
    const f = { b, load: 0, top, x, z, down: 0 };
    b.mover = { b, delta: V3(), fn() { return V3(x, top - 0.6 - f.down * 6, z); } };
    movers.push(b.mover); FOLDERS.push(f);
  }
  stand(56.2, -4.5, 3, 3, 3.6, 0x6a5a5e, 0x3a2e32, MAGMA_Y - 1);
  crate(56.2, -4.5, true, 'Achter de vouwpanelen', 3.6);
  sign(37.5, -1, 'Panelen klappen in!', Math.PI / 2, 0);
}

// ---------- 3. het Kristalvlot: sun crystals and a sun moth ----------
// shuttles between the Westrots and the Noordrots
const KRIS = raft('kristal', shuttle([-31, -8.2], [-11.2, -43], 3, 10, 3, 0), 10, 12, 0x6a4a6a, 0x3a2a3e);
export const MOT_HOME = { raft: 'kristal', lx: -2.5, lz: 3 };
// flikkerkristallen: they glow and go dim in turn, and while they're dim you fall right through
export const FLICKER = [];
{
  const r = KRIS;
  const crystal = (lx, lz, top, col, phase) => {
    const b = rstand(r, lx, lz, 1.4, 1.4, top, col, col);
    b.mesh.material.forEach((m) => { if (m.emissive) m.emissive.set(col).multiplyScalar(0.35); m.transparent = true; });
    const tip = mesh(new THREE.ConeGeometry(0.8, 1, 6), toon(col), 0, top / 2 + 0.15, 0, b.mesh, 1.04); tip.scale.y = 0.3; tip.material.transparent = true;
    if (phase != null) FLICKER.push({ b, phase, mats: [...b.mesh.material, tip.material] });
    return b;
  };
  crystal(2.5, 3.5, 1.4, 0xff9a4a, null);
  crystal(3, 1, 2.8, 0xffd04a, 0);
  crystal(1, -1.2, 4.2, 0xff6a6a, 1);
  crystal(2.8, -3.5, 6, 0xfff07a, 2);
  rcookie(r, 2.8, 7.2, -3.5, 'Op het flikkerkristal');
  // little crystals as decoration
  for (let i = 0; i < 8; i++) {
    const m = mesh(new THREE.ConeGeometry(0.25 + hr() * 0.2, 0.8 + hr(), 5), toon([0xff9a4a, 0xffd04a, 0xfff07a][i % 3]), -4 + hr() * 3, 0.4, -5 + hr() * 10, r.g, 0);
    m.rotation.z = (hr() - 0.5) * 0.6;
  }
  for (const [lx, lz] of [[-3, -4], [-3, -2], [-3, 0]]) rcookie(r, lx, 0.9, lz);
}

// ---------- de Oostrots ----------
{
  stand(33.5, -6, 2.5, 2.5, 1.5, 0x6a5a5e, 0x3a2e32);
  crate(34, -6, false, '', 1.5);
  circle([30, 0.9, -2], 2.5, 6);
  sign(28, 1.5, '↙ Panelenvlot · ↓ Kleintje', 0.3);
}

// ---------- 4. Kleintje: a tiny raft from the Oostrots to where the Ringvlot comes by ----------
const KLEIN = raft('klein', shuttle([29.7, -18], [31, -10.7], 6, 3, 12, 11), 5, 5, 0x5a4448, 0x3a2a2e);
rcookie(KLEIN, 0, 1.2, 0);

// ---------- 5. het Ringvlot: a big ring of crust on a raft ----------
// shuttles between the Noordrots and a spot far east, where it meets Kleintje
const RING = raft('ring', shuttle([11.2, -43], [22, -18], 4, 8, 4, 0), 10, 10, 0x5a4448, 0x3a2a2e);
export const BRIL_SPOT = { raft: 'ring', lx: 3, lz: 3 };
{
  const r = RING;
  const arch = mesh(new THREE.TorusGeometry(3, 0.45, 10, 28, Math.PI), toon(0xf0b840), 0, 0, -1.5, r.g); arch.position.set(0, 0, -1.5);
  rstand(r, -3, -1.5, 0.9, 0.9, 0.6, 0xf0b840, 0xb07020); rstand(r, 3, -1.5, 0.9, 0.9, 0.6, 0xf0b840, 0xb07020);
  for (let i = 0; i < 5; i++) { const a = (i / 4) * Math.PI; rcookie(r, Math.cos(a) * 3, 0.6 + Math.sin(a) * 3, -1.5); }
}

// the lone pillar next to the Ringvlot's route: you can only jump to it while you ride past
export const ZUIL = { x: 8, z: -26, top: 4 };
stand(ZUIL.x, ZUIL.z, 2, 2, ZUIL.top, 0x6a5a5e, 0x3a2e32, MAGMA_Y - 1);
addCookie(ZUIL.x, ZUIL.top + 1.1, ZUIL.z, 'Op de eenzame zuil');



// ---------- de Noordrots, and the jump to De Kroon ----------
export const TOREN = { x: 3, z: -40, top: 3 };
{
  stand(TOREN.x, TOREN.z, 2, 2, TOREN.top, 0x6a5a5e, 0x3a2e32);
  addCookie(TOREN.x, TOREN.top + 6.6, TOREN.z, 'Hoog boven de Noordrots');
  crate(-4, -38);
  line([0, 0.9, -38], [0, 0.9, -48], 5);
  sign(-4.5, -49, '↑ De Kroon · aanloop nemen!', 0);
}
// a stone that drifts left and right between the Noordrots and the gate: the easy way, if you time it
const STEEN = raft('steen', (t) => [Math.sin(t * 0.45) * 9, -54], 3, 3, 0x6a5a5e, 0x3a2e32);
// the gate ledge and De Kroon
{
  crate(3, -61);
  sign(-2.5, -60, 'De Kroon', 0);
  // golden spikes all round the crown, standing in the magma
  const spike = toon(0xf0b840);
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    if (Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2))) < 0.35) continue;      // leave the gate open (south)
    const R = ARENA.r + 5.5, h = 4 + (i % 2) * 3;   // far enough out that the snake can come up between them and the crown
    mesh(new THREE.ConeGeometry(0.9, h, 6), spike, ARENA.x + Math.cos(a) * R, MAGMA_Y + h / 2, ARENA.z + Math.sin(a) * R, scene, 1.04);
  }
}

// ---------- checkpoints (only on rock that stays put) ----------
export const FLAGS = [[-29, 2], [29, -4], [-2, -44], [-2, -62]].map(([x, z]) => {
  const p = V3(x, gy(x, z), z);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4), toon(0x3a2e32)); pole.position.set(p.x, p.y + 1.2, p.z); scene.add(pole);
  const mat = new THREE.MeshBasicMaterial({ color: 0x9a948a, side: THREE.DoubleSide });
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), mat); cloth.position.set(p.x + 0.45, p.y + 2.1, p.z); scene.add(cloth);
  lamps.push({ wave: cloth });
  return { pos: p, mat };
});

// ---------- the sky: embers floating up, and solar flares arching on the horizon ----------
export const dust = (() => {
  const n = 500, pos = new Float32Array(n * 3), colA = new Float32Array(n * 3), palette = [[1, 0.8, 0.3], [1, 0.55, 0.2], [1, 0.95, 0.6]];
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (hr() - 0.5) * 120; pos[i * 3 + 1] = hr() * 22; pos[i * 3 + 2] = -100 + hr() * 160;
    colA.set(palette[i % 3], i * 3);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(colA, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.16, vertexColors: true, transparent: true, opacity: 0.8, depthWrite: false }));
  scene.add(p); return p;
})();
const flares = [];
{
  const mat = new THREE.MeshBasicMaterial({ color: 0xffc040, transparent: true, opacity: 0.55, depthWrite: false });
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2, d = 110 + hr() * 30, R = 10 + hr() * 14;
    const f = new THREE.Mesh(new THREE.TorusGeometry(R, 1.2 + hr(), 8, 30, Math.PI), mat);
    f.position.set(Math.cos(a) * d, MAGMA_Y, Math.sin(a) * d - 20); f.rotation.y = -a + Math.PI / 2; scene.add(f);
    flares.push({ f, s: 0.4 + hr() * 0.5, o: hr() * 6 });
  }
}
anim.push((t) => {
  magmaGlow.material.opacity = 0.2 + Math.sin(t * 0.8) * 0.08;
  magma.material.color.setHSL(0.045 + Math.sin(t * 0.5) * 0.008, 1, 0.55);
  for (const { f, s, o } of flares) f.scale.y = 0.8 + Math.sin(t * s + o) * 0.25;
  const p = dust.geometry.attributes.position;
  for (let i = 0; i < p.count; i++) { let y = p.getY(i) + 0.016; if (y > 22) y = 0; p.setY(i, y); }
  p.needsUpdate = true;
});

// ---------- gewone koekjes on the rocks ----------
line([0, 0.9, 40], [0, 0.9, 33], 4);
circle([-31, 0.9, 3], 2, 5);
line([33, 0.9, -1], [33, 0.9, -6], 3);
circle([ARENA.x, 0.9, ARENA.z], 9, 10);

// ---------- spawn, checkpoints, rocket ----------
export const SPAWN = V3(0, 0, 50);
export const ARENA_ENTRY = SPAWN.clone();
export const ARENA_POS = V3(ARENA.x, ARENA.y, ARENA.z);
export const CHECKPOINTS = FLAGS.map((f) => ({ test: (p) => Math.hypot(p.x - f.pos.x, p.z - f.pos.z) < 3 && Math.abs(p.y - f.pos.y) < 2, pos: f.pos }));
export const PLANET = 'zon';

export const TRAVEL = {
  pos: V3(6, 0, 44),
  dests: [
    { need: 12, planet: 'water', name: 'de Waterplaneet', label: 'Opstijgen naar de Waterplaneet' },
    { need: 0, planet: 'schroot', name: 'de Schroothoop', label: 'Terug naar de Schroothoop' },
    { need: 0, planet: 'bos', name: 'het Paddenstoelenbos', label: 'Terug naar het Paddenstoelenbos' },
    { need: 0, planet: 'berg', name: 'de Bergwereld', label: 'Terug naar de Bergwereld' },
    { need: 0, planet: 'mistmaan', name: 'de Mistmaan', label: 'Terug naar de Mistmaan' },
  ],
};

