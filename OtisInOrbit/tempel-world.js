import { THREE, scene, toon, addOutline, V3, label } from './core.js';
import { addCookie, line, circle } from './cookies.js';
import { groundAt, ZIG, HALL, PIT } from './tempel-terrain.js';

export const boxes = [];
export const movers = [];
export const lamps = [];
export const crates = [];
export const winOn = new THREE.MeshBasicMaterial({ color: 0xffc46b });
export const winOff = new THREE.MeshBasicMaterial({ color: 0x4a5a70 });
export const fogMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, depthWrite: false });
export const anim = [];
const edgeMat = new THREE.LineBasicMaterial({ color: 0x2a1a20, transparent: true, opacity: 0.4 });

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
// a box from y0 up to top
export const pillar = (x, z, w, d, y0, top, colTop = 0xd8c8a8, colSide = 0xa8987a, extra = {}) => block(x, (y0 + top) / 2, z, w, top - y0, d, colTop, colSide, extra);
export const STONE = [0xd8c8a8, 0xa8987a], GOLD = [0xe0b860, 0xa88a4a], DARK = [0x6a5a6a, 0x4a3e4e], MOSS = [0x8aa86a, 0x6a7a5a];
let hs = 37;
export const hr = () => ((hs = (hs * 16807) % 2147483647) / 2147483647);
export const gy = (x, z) => groundAt(x, z, 0);
export const mesh = (geo, mat, x, y, z, parent = scene, ol = 1.05) => {
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
// a cracked wall: only someone heavy (Zwaar) walks through it
export function crackWall(x, y, z, w, h, d) {
  const b = block(x, y, z, w, h, d, 0xc8b898, 0x9a8a6a, { crate: true, wall: true, rare: false, id: 'k' + crates.length });
  crates.push(b);
  const mat = new THREE.MeshBasicMaterial({ color: 0x3a2a20 });
  const along = w > d ? 'x' : 'z', L = Math.max(w, d), face = Math.min(w, d) / 2 + 0.01;
  for (let i = 0; i < 7; i++) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5 + hr() * 0.9, 0.06), mat);
    const u = (hr() - 0.5) * L * 0.8, v = (hr() - 0.5) * h * 0.7;
    for (const s of [-1, 1]) {
      const cc = c.clone();
      if (along === 'x') cc.position.set(u, v, face * s); else cc.position.set(face * s, v, u);
      cc.rotation.z = hr() - 0.5; cc.rotation.x = along === 'x' ? 0 : hr() - 0.5;
      b.mesh.add(cc);
    }
  }
  return b;
}
export function sign(x, z, text, yaw = 0, y = null) {
  const g = y ?? gy(x, z);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.2), toon(0x6a5a4a)); post.position.set(x, g + 1.1, z); scene.add(post);
  label(text, x, g + 2.4, z, 2.6).rotation.y = yaw;
}

// ---------- light and sky: a warm, dusty dusk ----------
{
  const hemi = scene.children.find((o) => o.isHemisphereLight);
  const sunL = scene.children.find((o) => o.isDirectionalLight);
  if (hemi) { hemi.color.setHex(0xffd8b8); hemi.groundColor.setHex(0x5a4a5a); hemi.intensity = 1.4; }
  if (sunL) { sunL.color.setHex(0xffb878); sunL.intensity = 1.7; sunL.position.set(-30, 40, 30); }
  scene.fog = new THREE.FogExp2(0xc89878, 0.0075);
  // Kayo & Yara's base, up in the sky: a dark planet with two cat-ear towers and blinking red lights
  const base = new THREE.Group(); base.position.set(70, 75, -170); scene.add(base);
  base.add(new THREE.Mesh(new THREE.SphereGeometry(20, 28, 20), new THREE.MeshBasicMaterial({ color: 0x3a2050, fog: false })));
  const ringM = new THREE.Mesh(new THREE.TorusGeometry(30, 1.2, 8, 60), new THREE.MeshBasicMaterial({ color: 0xff4ab0, fog: false }));
  ringM.rotation.x = 1.25; base.add(ringM);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(4, 10, 4), new THREE.MeshBasicMaterial({ color: 0x241434, fog: false }));
    ear.position.set(8 * s, 22, 0); ear.rotation.z = -0.35 * s; base.add(ear);
    const l = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2a2a, fog: false }));
    l.position.set(9.8 * s, 27, 0); base.add(l); lamps.push({ blink: l, glow: l, light: { intensity: 0 } });
  }
  anim.push((t) => { base.rotation.y = t * 0.03; });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(11, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffd090, fog: false }));
  sky.position.set(-120, 30, 140); scene.add(sky);
}
export const BASE_AT = V3(70, 75, -170);

// ---------- the crash: the rocket in a smoking crater ----------
export const rocket = new THREE.Group();
export const WRECK = { x: 6, z: 26 };
const rocketLying = solid(WRECK.x + 2.4, 0.6, WRECK.z, 4.8, 2, 2.2);   // it lies with its nose pointing east
const rocketUp = solid(WRECK.x, 1.6, WRECK.z, 2.4, 4, 2.4);
boxes.splice(boxes.indexOf(rocketUp), 1);
{
  const r = rocket; r.position.set(WRECK.x, -0.4, WRECK.z);
  const add = (m, ol = 1.05) => { m.castShadow = true; if (ol) addOutline(m, ol); r.add(m); return m; };
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.0, 3.2, 24), toon(0xfbf3e4))).position.y = 1.8;
  add(new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.4, 24), toon(0xff5a36))).position.y = 4.1;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 3;
    const f = add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.3, 0.9), toon(0xff5a36))); f.position.set(Math.sin(a) * 1.05, 0.75, Math.cos(a) * 1.05); f.rotation.y = a;
    if (i === 0) { f.visible = false; r.userData.lostFin = f; }    // this one's sticking out of the ground over there
  }
  add(new THREE.Mesh(new THREE.CircleGeometry(0.42, 32), new THREE.MeshBasicMaterial({ color: 0x9ad8ff })), 0).position.set(0, 2.5, 0.95);
  // scorch marks and a crack across the window
  const crack = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.05, 0.02), new THREE.MeshBasicMaterial({ color: 0x1a1030 })); crack.position.set(0, 2.5, 0.97); crack.rotation.z = 0.6; r.add(crack);
  r.userData.crack = crack;
  const soot = add(new THREE.Mesh(new THREE.CylinderGeometry(0.92, 1.02, 1, 24, 1, true, 0, 2), toon(0x3a3030)), 0); soot.position.y = 2.6;
  r.userData.soot = soot;
  scene.add(r);
}
// lying on its side, smoking: until Otis and Byte fix it
const LYING = { rx: 0.1, rz: -1.42, y: 0.55 };
export function setRocket(fixed) {
  const r = rocket;
  if (fixed) {
    r.rotation.set(0, -0.3, 0); r.position.y = -0.4; r.userData.lostFin.visible = true; r.userData.crack.visible = false; r.userData.soot.visible = false;
    if (boxes.includes(rocketLying)) boxes.splice(boxes.indexOf(rocketLying), 1);
    if (!boxes.includes(rocketUp)) boxes.push(rocketUp);
  } else {
    r.rotation.set(LYING.rx, 0, LYING.rz); r.position.y = LYING.y;
    if (!boxes.includes(rocketLying)) boxes.push(rocketLying);
    if (boxes.includes(rocketUp)) boxes.splice(boxes.indexOf(rocketUp), 1);
  }
  rocket.userData.fixed = fixed;
}
setRocket(false);
// bits of rocket and temple everywhere; the lost fin is stuck upright in the ground, with something on top
export const FIN = { x: 13.5, z: 31, top: 4.2 };
{
  const fin = pillar(FIN.x, FIN.z, 0.5, 2.2, -0.4, FIN.top, 0xff5a36, 0xd04a2a); fin.mesh.rotation.z = 0.04;
  pillar(11, 28.5, 1.6, 1.6, -0.4, 1.1, ...STONE);
  pillar(12.6, 29.6, 1.2, 1.2, -0.4, 2.5, ...STONE);
  crate(FIN.x, FIN.z, true, 'Tussen de brokstukken', FIN.top);
  for (let i = 0; i < 14; i++) {
    const a = hr() * Math.PI * 2, r = 4 + hr() * 7;
    const s = 0.3 + hr() * 0.7;
    const m = mesh(new THREE.BoxGeometry(s, s * 0.6, s * 1.2), toon(hr() < 0.3 ? 0xfbf3e4 : 0xa8987a), WRECK.x + Math.cos(a) * r, -0.3, WRECK.z + Math.sin(a) * r, scene, 0);
    m.rotation.set(hr(), hr() * 3, hr());
  }
}
export const OTIS_AT = V3(2, -0.4, 24.5);
export const BYTE_AT = V3(3.6, -0.25, 22.4);

// ---------- het plein: the mural and the dry fountain ----------
// the mural: four symbols in order. Below them, painted in glow paint, a second row (only a glowing Josh sees it)
export const SYMBOLS = { zon: '☀', maan: '☾', ster: '★', oog: '◉' };
export const ORDER = ['maan', 'ster', 'zon', 'oog'];
export const SECRET = ['oog', 'zon', 'maan', 'ster'];
export const MURAL = { x: 0, z: -14 };
export const secretTiles = [];
{
  pillar(MURAL.x, MURAL.z, 13, 1, 0, 7, ...STONE);
  pillar(MURAL.x, MURAL.z - 0.1, 13.6, 1.2, 7, 7.5, ...GOLD);
  ORDER.forEach((s, i) => {
    const x = MURAL.x - 4.5 + i * 3;
    label(`${'•'.repeat(i + 1)}  ${SYMBOLS[s]}`, x, 4.6, MURAL.z + 0.52, 2.6);
  });
  SECRET.forEach((s, i) => {
    const x = MURAL.x - 4.5 + i * 3;
    const m = label(`${'•'.repeat(i + 1)}  ${SYMBOLS[s]}`, x, 2, MURAL.z + 0.52, 2.2);
    m.material.transparent = true; m.material.opacity = 0; secretTiles.push(m);
  });
  sign(MURAL.x + 7.5, MURAL.z + 2, 'De weg naar de top', 0);
}
// the fountain: dry. A pipe runs to a little pump room you can only crawl into
export const FOUNTAIN = { x: 0, z: 4 };
export const fountain = {};
{
  const { x, z } = FOUNTAIN;
  for (const [dx, dz, w, d] of [[0, -3, 6.6, 0.6], [0, 3, 6.6, 0.6], [-3, 0, 0.6, 5.4], [3, 0, 0.6, 5.4]]) pillar(x + dx, z + dz, w, d, 0, 0.7, ...STONE);
  fountain.spout = pillar(x, z, 1.4, 1.4, 0, 1.2, ...GOLD);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 5.4), new THREE.MeshBasicMaterial({ color: 0x5ac8f0, transparent: true, opacity: 0.8 }));
  water.rotation.x = -Math.PI / 2; water.position.set(x, 0.5, z); water.visible = false; scene.add(water);
  const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, 7, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xbfeaff, transparent: true, opacity: 0.65, depthWrite: false }));
  jet.position.set(x, 1.2 + 3.5, z); jet.visible = false; scene.add(jet);
  Object.assign(fountain, { water, jet });
  // a broken column next to it: way too tall to climb… unless the fountain throws you up there
  pillar(x + 4, z - 4.2, 1.6, 1.6, 0, 7.6, ...STONE);
  addCookie(x + 4, 8.8, z - 4.2, 'Op de waterstraal');
}
// the pump room: walls all round, a roof, and one little hole on the fountain side
export const PUMP = { x: -11, z: 4 };
{
  const { x, z } = PUMP, H = 3;
  pillar(x - 2, z, 0.4, 4.4, 0, H, ...DARK);
  pillar(x, z - 2, 4.4, 0.4, 0, H, ...DARK);
  pillar(x, z + 2, 4.4, 0.4, 0, H, ...DARK);
  pillar(x + 2, z - 1.4, 0.4, 1.6, 0, H, ...DARK);
  pillar(x + 2, z + 1.4, 0.4, 1.6, 0, H, ...DARK);
  pillar(x + 2, z, 0.4, 1.2, 1.0, H, ...DARK);
  pillar(x, z, 4.8, 4.8, H, H + 0.4, ...STONE);
  // the pipe to the fountain
  const pipe = mesh(new THREE.CylinderGeometry(0.25, 0.25, 6.6, 10), toon(0x8a6a4a), x + 5.3, 0.25, z, scene, 0); pipe.rotation.z = Math.PI / 2;
  sign(x + 3.4, z + 3, 'Pomphuisje', 0);
}

// ---------- de Zonnetempel: a stepped pyramid. Two ways up past the first big step ----------
{
  // front stairs onto the first step
  for (let k = 1; k <= 3; k++) pillar(0, -28.5 - k, 4, 1, 0, k, ...STONE);
  // south corridor: closed in, with a cracked wall at its east end (Zwaar)
  pillar(-2.3, -33.4, 10.2, 0.4, 3, 10, ...STONE);
  pillar(-7.2, -34.8, 0.4, 2.4, 3, 10, ...STONE);
  crackWall(2.2, 4.6, -34.8, 0.4, 3.2, 2.4);
  pillar(2.2, -34.8, 0.4, 2.4, 6.2, 10, ...STONE);
  for (let k = 1; k <= 6; k++) pillar(2 - 1.4 * k + 0.7, -34.8, 1.4, 2.4, 3, 3 + k, ...GOLD);
  // east corridor: closed in, with only a tiny hole at the bottom (Krimp)
  pillar(10.6, -42.6, 0.4, 9.2, 3, 10, ...STONE);
  pillar(9.2, -47, 2.4, 0.4, 3, 10, ...STONE);
  pillar(8.3, -38.2, 0.6, 0.4, 3, 10, ...STONE);
  pillar(10.1, -38.2, 0.6, 0.4, 3, 10, ...STONE);
  pillar(9.2, -38.2, 1.2, 0.4, 4, 10, ...STONE);
  for (let k = 1; k <= 6; k++) pillar(9.2, -38.4 - 1.4 * k + 0.7, 2.4, 1.4, 3, 3 + k, ...GOLD);
  // then normal stairs up the last two steps
  for (let k = 1; k <= 3; k++) pillar(4.2 - 1.2 * k, -37, 1.2, 2, ZIG.L2, ZIG.L2 + k, ...STONE);
  for (let k = 1; k <= 3; k++) pillar(-1.8 - 1.2 * k + 1.2, -39, 1.2, 2, ZIG.L3, ZIG.L3 + k, ...GOLD);
  sign(4, -28, '↑ Zonnetempel', 0);
}
// ---------- the temple's treasure room: inside the pyramid's first step, behind a tiny hole on the west side ----------
{
  // a room built against the west face of the second step, closed with a roof
  const x = -10, z = -46;
  pillar(x - 1.6, z, 0.4, 4.4, 3, 6.4, ...STONE);
  pillar(x, z - 2, 3.6, 0.4, 3, 6.4, ...STONE);
  pillar(x + 1.6, z, 0.4, 4.4, 3, 6.4, ...STONE);
  pillar(x, z, 3.6, 4.4, 6.4, 6.8, ...GOLD);
  // the south wall, with a hole at the bottom only a tiny Josh fits through
  pillar(x - 1.1, z + 2, 1.4, 0.4, 3, 6.4, ...STONE);
  pillar(x + 1.1, z + 2, 1.4, 0.4, 3, 6.4, ...STONE);
  pillar(x, z + 2, 0.8, 0.4, 4, 6.4, ...STONE);
  addCookie(x, 4.2, z - 0.6, 'De schatkamer van de tempel');
  for (let i = 0; i < 5; i++) mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.08, 12), new THREE.MeshBasicMaterial({ color: 0xffd04a }), x - 1 + hr() * 2, 3.05 + i * 0.08, z - 1.2 + hr(), scene, 0);
}

// ---------- the hall of mirrors (Spiegelzaal) ----------
{
  const y = HALL.y;
  for (let k = 1; k <= 4; k++) pillar(13.5 + k, 2.4, 1, 2.2, 0, k, ...STONE);
  // walls, with a gap on the west for the stairs; the south wall is low so the sunbeam can come in over it
  pillar(25, HALL.z0 + 0.2, 14, 0.4, y, y + 4, ...STONE);            // north
  pillar(25, HALL.z1 - 0.2, 14, 0.4, y, y + 1, ...STONE);            // south (low)
  pillar(HALL.x1 - 0.2, 0, 0.4, 16, y, y + 4, ...STONE);             // east
  pillar(HALL.x0 + 0.2, -3.4, 0.4, 9.2, y, y + 4, ...STONE);         // west, north of the door
  pillar(HALL.x0 + 0.2, 5.8, 0.4, 4.4, y, y + 4, ...STONE);          // west, south of the door
  sign(15, 4, 'Spiegelzaal', 0);
}

// ---------- the dark ravine (Donkere kloof): bottomless ----------
export const LEDGE = { x: -38, z: -29 };
export const SHELF = { x: -38.8, z: -21.2, top: 7 };
{
  pillar(LEDGE.x, LEDGE.z, 4, 4, -3, 0, ...DARK);
  pillar(SHELF.x, SHELF.z, 2.2, 2.2, SHELF.top - 1, SHELF.top, ...DARK);
  addCookie(SHELF.x, SHELF.top + 1.2, SHELF.z, 'Diep in de donkere kloof');
  sign(-15.5, -21, 'Donkere kloof', 0);
}

// ---------- the priests' terrace ----------
export const HOUSE = { x: 29, z: -36, y: 6 };
export const OBELISK = { x: 35.5, z: -41.5, top: 18 };
{
  const y = HOUSE.y, { x, z } = HOUSE, top = y + 3.5;
  for (let k = 1; k <= 6; k++) pillar(19.5 - (6 - k), -29, 1, 2.4, 0, k, ...STONE);
  pillar(x, z - 3, 6.4, 0.4, y, top, ...GOLD);
  pillar(x - 3, z, 0.4, 6.4, y, top, ...GOLD);
  pillar(x + 3, z, 0.4, 6.4, y, top, ...GOLD);
  pillar(x - 2.1, z + 3, 2.2, 0.4, y, top, ...GOLD);
  pillar(x + 2.1, z + 3, 2.2, 0.4, y, top, ...GOLD);
  crackWall(x, y + 1.5, z + 3, 2, 3, 0.4);
  pillar(x, z + 3, 2, 0.4, y + 3, top, ...GOLD);
  pillar(x, z, 6.8, 6.8, top, top + 0.4, ...STONE);
  // rubble up to the roof, and pegs round the obelisk
  pillar(33.2, -34, 1.4, 1.4, y, y + 1.3, ...STONE);
  pillar(33.4, -36.6, 1.2, 1.2, y, y + 2.6, ...STONE);
  pillar(OBELISK.x, OBELISK.z, 1.6, 1.6, y, OBELISK.top, ...GOLD);
  addCookie(OBELISK.x, OBELISK.top + 1.2, OBELISK.z, 'Op de hoogste spits');
  for (let k = 1; k <= 6; k++) {
    const a = Math.PI * 0.85 + k * 1.05;
    pillar(OBELISK.x + Math.cos(a) * 1.35, OBELISK.z + Math.sin(a) * 1.35, 0.9, 0.9, top + 1.3 * k - 0.3, top + 0.4 + 1.3 * k, ...STONE);
  }
  sign(23, -26, 'Priesterterras', 0, y);
}

// ---------- the hourglass gate: a pressure plate opens it for a few seconds ----------
export const HOURGLASS = { plate: V3(-14, 0, -14.5), gate: { x: -40, z: -14 } };
{
  for (const xx of [-21, -27, -33]) pillar(xx, -14.5, 0.6, 5.4, 0, 1.1, ...DARK);
  addCookie(-41.5, 1.2, -14, 'Achter de zandloperdeur');
}

// ---------- decoration: broken columns, vines ----------
{
  for (const [x, z, h] of [[-8, 16, 3.2], [9, 12, 2.2], [-14, -6, 4.5], [14, -14, 3.6], [-5, -24, 2.8], [16, 16, 1.6], [-16, 18, 2.4]]) pillar(x, z, 1.2, 1.2, 0, h, ...STONE);
  const vine = toon(0x5a8a3a);
  for (let i = 0; i < 30; i++) {
    const x = (hr() - 0.5) * 78, z = -60 + hr() * 96;
    if (gy(x, z) < -1) continue;
    const m = mesh(new THREE.SphereGeometry(0.4 + hr() * 0.5, 8, 6), vine, x, gy(x, z) + 0.15, z, scene, 0); m.scale.y = 0.5;
  }
}

// ---------- coins ----------
line([2, 0.9, 16], [2, 0.9, 10], 4);
circle([FOUNTAIN.x, 1.6, FOUNTAIN.z], 4.2, 8);
line([-14, 0.9, 11], [-4, 0.9, 11], 5);
line([14.5, 1.9, 2.4], [17.5, 4.9, 2.4], 4);
line([-1.5, 3.9, -32.6], [1.5, 3.9, -32.6], 3);
line([24, 6.9, -28], [32, 6.9, -28], 4);
line([-15, 0.9, -28], [-15, 0.9, -34], 3);
circle([0, ZIG.L4 + 0.9, -44], 2, 6);

// ---------- checkpoints ----------
export const FLAGS = [[0, 30], [-4, 10], [22, -2], [-15, -24], [-10, -40], [24, -30]].map(([x, z]) => {
  const p = V3(x, gy(x, z), z);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4), toon(0x3a3e4e)); pole.position.set(p.x, p.y + 1.2, p.z); scene.add(pole);
  const mat = new THREE.MeshBasicMaterial({ color: 0x9a948a, side: THREE.DoubleSide });
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), mat); cloth.position.set(p.x + 0.45, p.y + 2.1, p.z); scene.add(cloth);
  lamps.push({ wave: cloth });
  return { pos: p, mat };
});

// ---------- spawn, rocket ----------
export const SPAWN = V3(1, -0.4, 29);
export const ARENA_ENTRY = SPAWN.clone();
export const ARENA_POS = V3(0, 0, 0);
export const CHECKPOINTS = FLAGS.map((f) => ({ test: (p) => Math.hypot(p.x - f.pos.x, p.z - f.pos.z) < 3 && Math.abs(p.y - f.pos.y) < 2, pos: f.pos }));
export const PLANET = 'tempel';
// the rocket only goes again once Otis is better and Byte is whole (the story fills in `locked`)
export const TRAVEL = {
  pos: V3(WRECK.x, 0, WRECK.z),
  dests: [
    { need: 12, planet: 'feest', name: 'de Feestplaneet', label: 'Opstijgen naar de Feestplaneet' },
    { need: 0, planet: 'water', name: 'de Waterplaneet', label: 'Terug naar de Waterplaneet' },
    { need: 0, planet: 'zon', name: 'de Zon', label: 'Terug naar de Zon' },
    { need: 0, planet: 'schroot', name: 'de Schroothoop', label: 'Terug naar de Schroothoop' },
    { need: 0, planet: 'bos', name: 'het Paddenstoelenbos', label: 'Terug naar het Paddenstoelenbos' },
    { need: 0, planet: 'berg', name: 'de Bergwereld', label: 'Terug naar de Bergwereld' },
    { need: 0, planet: 'mistmaan', name: 'de Mistmaan', label: 'Terug naar de Mistmaan' },
  ],
};
void PIT;

// drifting specks: dust and pollen in the low sun
export const dust = (() => {
  const n = 450, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = (hr() - 0.5) * 80; pos[i * 3 + 1] = hr() * 20; pos[i * 3 + 2] = -60 + hr() * 96; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.13, color: 0xffe0a0, transparent: true, opacity: 0.75, depthWrite: false }));
  scene.add(p); return p;
})();
export function updateWorld(t, dt) { for (const f of anim) f(t, dt); }
