import { THREE, scene, toon, addOutline, V3, label, puff } from './core.js';
import { addCookie, line, circle } from './cookies.js';
import { groundAt, TREES, VR, PILLAR, ARENA, VOID, BOUNDS } from './woud-terrain.js';
import { boxes, movers, lamps, crates, anim, syncBox, solid, block, pillar, hr, gy, mesh, crate, sign } from './woud-kit.js';
export { boxes, movers, lamps, crates, anim, syncBox };

export const winOn = new THREE.MeshBasicMaterial({ color: 0xffc46b });
export const winOff = new THREE.MeshBasicMaterial({ color: 0x8a8aa0 });
export const fogMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, depthWrite: false });
const T = TREES;
const top = (k) => T[k][3];
const at = (k, a, r, y) => V3(T[k][0] + Math.sin(a) * r, y, T[k][1] + Math.cos(a) * r);   // a point round a trunk

// ---------- green-gold light, mist on the floor ----------
{
  const hemi = scene.children.find((o) => o.isHemisphereLight);
  const sunL = scene.children.find((o) => o.isDirectionalLight);
  if (hemi) { hemi.color.setHex(0xfff4d8); hemi.groundColor.setHex(0x4a6a3a); hemi.intensity = 1.5; }
  if (sunL) { sunL.color.setHex(0xffeab0); sunL.intensity = 1.6; }
  scene.fog = new THREE.Fog(0xb8d8a0, 50, 170);
  // two thin layers of mist over the floor
  for (const [y, o] of [[1.2, 0.22], [2.8, 0.12]]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(BOUNDS.x1 - BOUNDS.x0, BOUNDS.z1 - BOUNDS.z0), new THREE.MeshBasicMaterial({ color: 0xe8f4e0, transparent: true, opacity: o, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set((BOUNDS.x0 + BOUNDS.x1) / 2, y, (BOUNDS.z0 + BOUNDS.z1) / 2); scene.add(m);
  }
  // beams of sunlight falling between the trees
  const beam = new THREE.MeshBasicMaterial({ color: 0xfff0b0, transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide });
  for (let i = 0; i < 9; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 4, 60, 10, 1, true), beam); c.position.set(-50 + hr() * 100, 30, -50 + hr() * 150); c.rotation.z = 0.25; scene.add(c); }
}

// ---------- the trunks ----------
const bark = toon(0x7a5a3a), barkD = toon(0x5a4028), moss = toon(0x6aa84a), leaf = toon(0x4a9a3a), leafL = toon(0x6ab84a);
export const CLIMBS = [];
const skipLeaves = {};     // angles round a trunk where no leaves may grow (there's a climbing strip)
function trunk(k) {
  const [x, z, , h] = T[k], r = VR(k);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.08, h, 28), bark); m.position.set(x, h / 2, z); m.castShadow = m.receiveShadow = true; addOutline(m, 1.02); scene.add(m);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.15, r + 0.15, 0.3, 28), moss); cap.position.set(x, h - 0.12, z); cap.receiveShadow = true; scene.add(cap);
  // grooves in the bark, so you can see it's a tree
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + hr(); const g = mesh(new THREE.BoxGeometry(0.25, h * (0.5 + hr() * 0.4), 0.15), barkD, x + Math.sin(a) * (r + 0.02), h * 0.4, z + Math.cos(a) * (r + 0.02), scene, 0); g.rotation.y = a; }
  // roots
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + hr() * 0.5; const rt = mesh(new THREE.BoxGeometry(1.4, 1.2, 4), bark, x + Math.sin(a) * (r + 1.2), 0.3, z + Math.cos(a) * (r + 1.2), scene, 0); rt.rotation.set(0.35, a, 0); }
}
// the crown: leaves round the rim (under the edge, so they never hide where you walk) and a canopy high above
function crown(k, high = top(k) + 11) {
  const [x, z, , h] = T[k], r = VR(k), skip = skipLeaves[k] || [];
  const n = Math.round(r * 2.2);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    if (skip.some(([sa, sw]) => Math.abs(Math.atan2(Math.sin(a - sa), Math.cos(a - sa))) < sw + 0.35)) continue;
    const s = 1.6 + hr() * 1.2;
    mesh(new THREE.SphereGeometry(s, 10, 8), i % 2 ? leaf : leafL, x + Math.sin(a) * (r + s * 0.6), h - 2.4 - hr(), z + Math.cos(a) * (r + s * 0.6), scene, 0).scale.y = 0.6;
  }
  for (let i = 0; i < 3; i++) { const a = hr() * 6.28, d = hr() * r; mesh(new THREE.SphereGeometry(r * 0.9 + 2, 12, 8), i % 2 ? leaf : leafL, x + Math.cos(a) * d, high + i * 1.5, z + Math.sin(a) * d, scene, 0).scale.y = 0.35; }
  // twigs from the top up to the canopy
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 + 0.5; const tw = mesh(new THREE.CylinderGeometry(0.25, 0.45, high - h), bark, x + Math.sin(a) * r * 0.8, (h + high) / 2, z + Math.cos(a) * r * 0.8, scene, 0); tw.rotation.z = 0.15 * Math.sin(a); }
}
// a strip you can climb with Grijp: rough dark bark, or ivy
function climb(k, a, w, y0, y1, exit, ivy = false, off = false) {
  const [x, z] = T[k], r = VR(k);
  const c = { x, z, r, a, w, y0, y1, exit, off };
  CLIMBS.push(c);
  (skipLeaves[k] || (skipLeaves[k] = [])).push([a, w]);
  const g = new THREE.Group(); g.visible = !off; scene.add(g);
  const mat = ivy ? toon(0x3a8a3a) : toon(0x3a2818);
  const sk = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.06, r + 0.06, y1 - y0, 20, 1, true, a - w, w * 2), mat); sk.position.set(x, (y0 + y1) / 2, z); sk.material.side = THREE.DoubleSide; g.add(sk);
  // knobs of bark, or leaves of ivy, so it looks rough
  const bit = ivy ? toon(0x5ac84a) : toon(0x6a4a2a);
  const nb = Math.round((y1 - y0) * w * 3.2);
  for (let i = 0; i < nb; i++) {
    const aa = a + (hr() * 2 - 1) * w * 0.95, yy = y0 + hr() * (y1 - y0);
    const m = new THREE.Mesh(ivy ? new THREE.SphereGeometry(0.28, 6, 4) : new THREE.BoxGeometry(0.4, 0.22, 0.2), bit);
    m.position.set(x + Math.sin(aa) * (r + 0.12), yy, z + Math.cos(aa) * (r + 0.12)); m.rotation.y = aa; if (ivy) m.scale.set(1, 0.6, 0.4); g.add(m);
  }
  c.g = g;
  return c;
}
// a platform sticking out of a trunk: along = how far out, across = how wide (any angle; best on the four sides)
function ledge(k, a, y, along, across = along) {
  const r = VR(k), p = at(k, a, r + along / 2 - 0.8, y);
  const cardinalX = Math.abs(Math.sin(a)) > 0.9;
  const b = block(p.x, y - 0.2, p.z, cardinalX ? along : across, 0.4, cardinalX ? across : along, 0xc89a6a, 0x8a6a4a);
  // a branch underneath, holding it up
  const br = mesh(new THREE.CylinderGeometry(0.35, 0.6, along + 1), bark, (p.x + T[k][0] + Math.sin(a) * r) / 2, y - 1.1, (p.z + T[k][1] + Math.cos(a) * r) / 2, scene, 0);
  br.quaternion.setFromUnitVectors(V3(0, 1, 0), V3(Math.sin(a), -0.35, Math.cos(a)).normalize());
  return b;
}
// a liana hanging from a branch: climb it, jump to the next (aim with the camera)
export const LIANAS = [];
function liana(x, z, y0, y1) {
  CLIMBS.push({ x, z, r: 0.12, a: 0, w: Math.PI, y0, y1, exit: null });
  const m = mesh(new THREE.CylinderGeometry(0.12, 0.12, y1 - y0 + 3), toon(0x5a8a3a), x, (y0 + y1 + 3) / 2, z, scene, 1.3);
  for (let i = 0; i < 6; i++) mesh(new THREE.SphereGeometry(0.22, 6, 4), leafL, x + (hr() - 0.5) * 0.4, y0 + hr() * (y1 - y0), z + (hr() - 0.5) * 0.4, scene, 0).scale.set(1, 0.5, 0.4);
  mesh(new THREE.SphereGeometry(1.6, 10, 8), leaf, x, y1 + 3.4, z, scene, 0).scale.y = 0.5;
  LIANAS.push(V3(x, y1, z));
  return m;
}
// a rope bridge (rises or falls; every plank at most 0.3 higher, so you can walk it)
function walkway(ax, az, ay, bx, bz, by, step = 0.75, w = 1.7) {
  const L = Math.hypot(bx - ax, bz - az), n = Math.max(2, Math.ceil(L / step), Math.ceil(Math.abs(by - ay) / 0.3));
  for (let k = 0; k <= n; k++) { const u = k / n; block(ax + (bx - ax) * u, ay + (by - ay) * u - 0.15, az + (bz - az) * u, w, 0.3, w, 0xc89a6a, 0x8a6a4a, {}, false); }
  const nx = -(bz - az) / L, nz = (bx - ax) / L;
  for (const s of [-1, 1]) {
    for (let k = 0; k <= n; k += 3) { const u = k / n; mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.2), toon(0x8a6a4a), ax + (bx - ax) * u + nx * s * 0.9, ay + (by - ay) * u + 0.6, az + (bz - az) * u + nz * s * 0.9, scene, 0); }
    const r = mesh(new THREE.CylinderGeometry(0.04, 0.04, Math.hypot(L, by - ay)), toon(0xe8d8b0), (ax + bx) / 2 + nx * s * 0.9, (ay + by) / 2 + 1.15, (az + bz) / 2 + nz * s * 0.9, scene, 0);
    r.quaternion.setFromUnitVectors(V3(0, 1, 0), V3(bx - ax, by - ay, bz - az).normalize());
  }
}
// from the top of one tree to the top of another (or to a point)
const rim = (k, to) => { const dx = to.x - T[k][0], dz = to.z - T[k][1], L = Math.hypot(dx, dz); return V3(T[k][0] + (dx / L) * (T[k][2] - 0.5), top(k), T[k][1] + (dz / L) * (T[k][2] - 0.5)); };
const centre = (k) => V3(T[k][0], top(k), T[k][1]);
function bridge(a, b) {
  const A = typeof a === 'string' ? rim(a, typeof b === 'string' ? centre(b) : b) : a;
  const B = typeof b === 'string' ? rim(b, typeof a === 'string' ? centre(a) : a) : b;
  walkway(A.x, A.z, A.y, B.x, B.z, B.y);
}

// ======================================================================================================
// the climbing routes (they have to be known before the leaves are put on)
// ======================================================================================================
const DIAG = -Math.PI / 4;           // the Mammoetboom's climbing side, between the platforms of the arena
climb('eik', 0, 0.45, 0, top('eik'), 'in', true);
climb('beuk', -Math.PI / 2, 0.35, 0, top('beuk'), 'in');
export const RACE_STRIP = climb('kast', 0.15, 0.5, 0, top('kast'), 'in', true);
climb('den', Math.PI / 2, 0.3, 0, 18, 'out');
climb('den', 2.3, 0.25, 18, top('den'), 'in');
climb('berk', 0, 0.35, 0, top('berk'), 'in', true);
climb('wilg', -Math.PI / 2, 0.4, 0, top('wilg'), 'in', true);
climb('mam', DIAG, 0.26, 0, 26, 'out');
climb('mam', DIAG, 0.26, 26, top('mam'), 'in');
// the Gladde Boom is smooth as glass. Only after Bonk has pecked holes in it can you climb it.
export const GLAD_ANGLE = Math.atan2(-T.glad[0], -T.glad[1]);
export const GLAD_STRIP = climb('glad', GLAD_ANGLE, 0.3, 0, top('glad'), 'in', false, true);
// the stump in the middle of Bonk's arena, all the way round
export const PILLAR_CLIMB = { x: ARENA.x, z: ARENA.z, r: PILLAR.r + 1, a: 0, w: Math.PI, y0: ARENA.y, y1: PILLAR.top, exit: 'in' };
CLIMBS.push(PILLAR_CLIMB);

for (const k of Object.keys(T)) { trunk(k); crown(k, k === 'mam' ? PILLAR.top + 7 : undefined); }
// the stump on the Mammoetboom
{
  const m = new THREE.Mesh(new THREE.CylinderGeometry(PILLAR.r + 1, PILLAR.r + 1.2, PILLAR.top - ARENA.y, 22), bark); m.position.set(ARENA.x, (ARENA.y + PILLAR.top) / 2, ARENA.z); m.castShadow = true; addOutline(m, 1.03); scene.add(m);
  for (let i = 0; i < 26; i++) { const a = hr() * 6.28, y = ARENA.y + 0.5 + hr() * (PILLAR.top - ARENA.y - 1); const kn = mesh(new THREE.BoxGeometry(0.4, 0.22, 0.2), toon(0x3a2818), ARENA.x + Math.sin(a) * (PILLAR.r + 1.08), y, ARENA.z + Math.cos(a) * (PILLAR.r + 1.08), scene, 0); kn.rotation.y = a; }
  const c = new THREE.Mesh(new THREE.CylinderGeometry(PILLAR.r + 1.1, PILLAR.r + 1.1, 0.3, 22), moss); c.position.set(ARENA.x, PILLAR.top - 0.12, ARENA.z); scene.add(c);
}
// the edge of the wood: a dark wall of trunks
for (let i = 0; i < 44; i++) {
  const u = i / 44, side = i % 4;
  const x = side === 0 ? BOUNDS.x0 + 3 : side === 1 ? BOUNDS.x1 - 3 : BOUNDS.x0 + (BOUNDS.x1 - BOUNDS.x0) * ((u * 4) % 1);
  const z = side === 2 ? BOUNDS.z0 + 3 : side === 3 ? BOUNDS.z1 - 3 : BOUNDS.z0 + (BOUNDS.z1 - BOUNDS.z0) * ((u * 4) % 1);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(3 + hr() * 2, 3.5 + hr() * 2, 70, 12), barkD); m.position.set(x, 35, z); scene.add(m);
}

// ---------- the ledges ----------
const denLedge = ledge('den', Math.PI / 2, 18, 6, 9);
export const DEN_LEDGE = denLedge.pos.clone().setY(18);
export const MAM_DECK = at('mam', DIAG, VR('mam') + 1.4, 26);
block(MAM_DECK.x, 25.8, MAM_DECK.z, 4.4, 0.4, 4.4, 0xc89a6a, 0x8a6a4a);
// Bonk's arena: four big platforms round the top of the Mammoetboom
for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
  block(ARENA.x + dx * 8, ARENA.y - 0.2, ARENA.z + dz * 8, dx ? 8 : 7, 0.4, dz ? 8 : 7, 0xc89a6a, 0x8a6a4a);
  // a low railing at the far end
  block(ARENA.x + dx * 11.8, ARENA.y + 0.4, ARENA.z + dz * 11.8, dx ? 0.3 : 7, 0.8, dz ? 0.3 : 7, 0x8a6a4a, 0x6a4a2a, {}, false);
}

// ---------- the bridges ----------
bridge('eik', 'beuk');
bridge('beuk', 'kast');
bridge('kast', MAM_DECK.clone().add(V3(-1.6, 0, 1.6)));
bridge('eik', V3(DEN_LEDGE.x + 0.5, 18, DEN_LEDGE.z + 3.4));
bridge('den', 'berk');
bridge('kast', 'wilg');

// ---------- the lianas: from the Wilg to the Holle Boom (whose bark is far too smooth to climb) ----------
{
  const A = centre('wilg'), B = centre('hol'), L = A.distanceTo(B), ux = (B.x - A.x) / L, uz = (B.z - A.z) / L;
  [10, 14.5, 19, 23.5].forEach((d, i) => liana(A.x + ux * d + (i % 2 ? 0.6 : -0.6), A.z + uz * d, 6, 21 + i * 0.3));
  // the branch they hang from
  const br = mesh(new THREE.CylinderGeometry(0.5, 0.7, L), bark, (A.x + B.x) / 2, 25.5, (A.z + B.z) / 2, scene, 0);
  br.quaternion.setFromUnitVectors(V3(0, 1, 0), V3(ux, 0, uz));
  sign(A.x + ux * 4, A.z + uz * 4, 'Lianen → Holle Boom', Math.atan2(ux, uz) + Math.PI, top('wilg'));
}

// ---------- de open plek: the rocket, Reshman's kitchen ----------
export const KITCHEN = V3(10, 0, 58);
const JARS = [];
{
  const K = KITCHEN;
  // the pot on a fire
  const pot = mesh(new THREE.SphereGeometry(0.8, 16, 10, 0, Math.PI * 2, Math.PI / 2.4, Math.PI / 1.7), toon(0x3a3a44), K.x, 1.2, K.z);
  pot.material.side = THREE.DoubleSide;
  const curry = new THREE.Mesh(new THREE.CircleGeometry(0.68, 16), toon(0xe0a030)); curry.rotation.x = -Math.PI / 2; curry.position.set(K.x, 1.15, K.z); scene.add(curry);
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; const s = mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.8), barkD, K.x + Math.sin(a) * 0.9, 0.9, K.z + Math.cos(a) * 0.9, scene, 0); s.rotation.set(Math.cos(a) * 0.3, 0, -Math.sin(a) * 0.3); }
  const fire = mesh(new THREE.ConeGeometry(0.5, 0.8, 8), new THREE.MeshBasicMaterial({ color: 0xff8a2a }), K.x, 0.4, K.z, scene, 0);
  const lamp = new THREE.PointLight(0xffa040, 6, 9, 2); lamp.position.set(K.x, 1.2, K.z); scene.add(lamp);
  anim.push((t) => { fire.scale.set(1, 0.8 + Math.sin(t * 17) * 0.2, 1); lamp.intensity = 5 + Math.sin(t * 13) * 1; if (Math.random() < 0.15) puff(V3(K.x, 1.4, K.z), 1, 0xf4ecd8, 0.4, 1.5); });
  // a table with jars of spices, and a rack
  block(K.x + 3, 0.45, K.z - 0.5, 2.6, 0.9, 1.2, 0xc89a6a, 0x8a6a4a);
  [0xe0443a, 0xffc23d, 0x8a5a2a, 0x5aa83a, 0xff8a3d].forEach((c, i) => mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.32, 10), toon(c), K.x + 2 + i * 0.5, 1.06, K.z - 0.5, scene, 1.1));
  // three empty jars: what he's still looking for
  JARS.push(...[0, 1, 2].map((i) => mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.4, 10), new THREE.MeshBasicMaterial({ color: 0xd8e8f0, transparent: true, opacity: 0.6 }), K.x + 2.4 + i * 0.6, 1.1, K.z, scene, 1.08)));
  label('Reshman’s Keuken', K.x + 3, 2.6, K.z - 0.5, 3.6);
}
export function fillJar(i, color) { const j = JARS[i]; if (j) { j.material.color.setHex(color); j.material.opacity = 1; } }
sign(-4, 54, '↖ Oude Eik', 0.6, 0);
sign(10, 48, 'Beuk ↗', -0.5, 0);
sign(-26, 30, 'Mistbodem ↑', 0.3, 0);

// ---------- de Oude Eik: a tree-hut ----------
export const HUT = V3(T.eik[0] - 1.5, top('eik'), T.eik[1] - 1.5);
{
  const y = top('eik');
  block(HUT.x, y + 1.2, HUT.z, 3, 2.4, 2.6, 0xc89a6a, 0x9a7a4a);
  const roof = mesh(new THREE.ConeGeometry(2.4, 1.6, 4), toon(0xc84a3a), HUT.x, y + 3.2, HUT.z); roof.rotation.y = Math.PI / 4;
  mesh(new THREE.BoxGeometry(0.8, 1.4, 0.05), toon(0x5a3a2a), HUT.x, y + 0.7, HUT.z + 1.31, scene, 0);
  sign(T.eik[0] + 2.5, T.eik[1] + 2.5, 'Boomhut', 0, y);
}
// ---------- de Kastanje: the squirrels' village (little drey-huts) ----------
{
  const y = top('kast');
  for (const [dx, dz] of [[-3, -2], [2.5, -3], [-1, 3.5]]) { mesh(new THREE.SphereGeometry(1, 12, 8), toon(0xa87a4a), T.kast[0] + dx, y + 0.6, T.kast[1] + dz).scale.y = 0.8; mesh(new THREE.CircleGeometry(0.35, 12), new THREE.MeshBasicMaterial({ color: 0x1a1030 }), T.kast[0] + dx, y + 0.6, T.kast[1] + dz + 0.98, scene, 0); }
  sign(T.kast[0] + 3.5, T.kast[1] + 3, 'Eekhoorndorp', 0.3, y);
}
// ---------- de Beuk: a beehive under the top ----------
export const HIVE = V3(T.beuk[0] + 2, top('beuk'), T.beuk[1] - 1.5);
{
  for (let i = 0; i < 4; i++) mesh(new THREE.SphereGeometry(0.7 - i * 0.12, 12, 8), toon(i % 2 ? 0xffc23d : 0xe0a030), HIVE.x, HIVE.y + 0.5 + i * 0.4, HIVE.z).scale.y = 0.7;
  sign(T.beuk[0] - 2, T.beuk[1] + 2.4, 'Bijenboom', 0, top('beuk'));
}
// ---------- de Holle Boom: a dark hole in its top ----------
{
  const hole = new THREE.Mesh(new THREE.CircleGeometry(2, 20), new THREE.MeshBasicMaterial({ color: 0x1a1008 })); hole.rotation.x = -Math.PI / 2; hole.position.set(T.hol[0], top('hol') + 0.04, T.hol[1]); scene.add(hole);
  crate(T.hol[0] + 2.4, T.hol[1] + 1.2, true, 'In de Holle Boom', top('hol'));
}
// ---------- de Gladde Boom: Kayo & Yara's secret base, high up (you can see it, you can't get there) ----------
export const BASE = V3(T.glad[0], top('glad'), T.glad[1]);
export const peckHoles = new THREE.Group(); peckHoles.visible = false; scene.add(peckHoles);
{
  const y = top('glad');
  block(BASE.x, y + 1.4, BASE.z - 1, 4, 2.8, 3, 0x3a3a4a, 0x2a2a3a);
  const roof = mesh(new THREE.BoxGeometry(4.6, 0.3, 3.6), toon(0x1a1a24), BASE.x, y + 2.95, BASE.z - 1); roof.rotation.z = 0.08;
  // a flag with two cat ears on it
  mesh(new THREE.CylinderGeometry(0.06, 0.06, 3), toon(0x8a8aa8), BASE.x + 2.6, y + 1.5, BASE.z, scene, 0);
  const fl = mesh(new THREE.PlaneGeometry(1.4, 0.9), new THREE.MeshBasicMaterial({ color: 0x8b5cff, side: THREE.DoubleSide }), BASE.x + 3.3, y + 2.6, BASE.z, scene, 0);
  for (const s of [-1, 1]) mesh(new THREE.ConeGeometry(0.16, 0.3, 3), new THREE.MeshBasicMaterial({ color: 0xffffff }), BASE.x + 3.3 + s * 0.22, y + 2.75, BASE.z + 0.01, scene, 0);
  anim.push((t) => { fl.rotation.y = Math.sin(t * 2) * 0.3; });
  label('K & Y — PRIVÉ!', BASE.x, y + 3.8, BASE.z + 0.6, 3.6);
  // holes Bonk pecks in the bark later: a ladder of them
  const r = VR('glad');
  for (let yy = 0.6; yy < y; yy += 0.9) for (const s of [-1, 1]) { const a = GLAD_ANGLE + s * 0.12 + Math.sin(yy) * 0.04; const h = mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshBasicMaterial({ color: 0x1a1008 }), T.glad[0] + Math.sin(a) * (r + 0.05), yy, T.glad[1] + Math.cos(a) * (r + 0.05), peckHoles, 0); h.scale.set(1, 1, 0.4); h.rotation.y = a; }
  // its bark shines: it's polished smooth (by Bonk, on Kayo & Yara's orders)
  const shine = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.04, r + 0.04, y, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, depthWrite: false })); shine.position.set(T.glad[0], y / 2, T.glad[1]); scene.add(shine);
}
export function openGlad() { GLAD_STRIP.off = false; GLAD_STRIP.g.visible = true; peckHoles.visible = true; }
// ---------- de Verre Kruin: only by gliding from the Mammoetboom ----------
sign(ARENA.x + 9, ARENA.z - 3, 'Verre Kruin ↘ (zweef!)', -2.2, ARENA.y);

// ---------- the forest floor: giant mushrooms, a fallen log, ferns ----------
{
  const mush = [[-30, 36, 1.4, 0xe0443a], [24, 48, 1.1, 0xffc23d], [-52, 0, 1.6, 0xe0443a], [28, -10, 1.2, 0xb07aff], [-14, -40, 1.3, 0xffc23d], [42, 30, 1, 0xe0443a]];
  for (const [x, z, s, c] of mush) {
    mesh(new THREE.CylinderGeometry(0.4 * s, 0.5 * s, 2 * s), toon(0xf4ecd8), x, s, z);
    const cap = mesh(new THREE.SphereGeometry(1.4 * s, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon(c), x, 2 * s, z); cap.scale.y = 0.6;
    for (let i = 0; i < 5; i++) { const a = hr() * 6.28; mesh(new THREE.SphereGeometry(0.15 * s, 6, 4), toon(0xffffff), x + Math.cos(a) * 0.9 * s, 2 * s + 0.6 * s, z + Math.sin(a) * 0.9 * s, scene, 0); }
    // you can bounce on the cap
    solid(x, 2 * s + 0.2, z, 2 * s, 0.6, 2 * s, { bounce: 15 });
  }
  // a fallen log you can walk along
  const log = block(30, 0.8, 44, 14, 1.6, 1.8, 0x8a6a4a, 0x6a4a2a); void log;
  for (let i = 0; i < 60; i++) { const x = BOUNDS.x0 + 10 + hr() * (BOUNDS.x1 - BOUNDS.x0 - 20), z = BOUNDS.z0 + 10 + hr() * (BOUNDS.z1 - BOUNDS.z0 - 20); if (groundAt(x, z, 1.5) > 0.1) continue; const f = mesh(new THREE.ConeGeometry(0.6, 1, 5), i % 3 ? leaf : leafL, x, 0.5, z, scene, 0); f.scale.set(1.4, 0.8, 1.4); }
}

// ---------- coins ----------
line([2, 0.9, 60], [-10, 0.9, 54], 5);
line([-20, 1.5, 52.5], [-20, 12.5, 52.5], 5);
circle([T.eik[0], top('eik') + 0.9, T.eik[1]], 3, 8);
circle([T.beuk[0], top('beuk') + 0.9, T.beuk[1]], 2.5, 6);
circle([T.kast[0], top('kast') + 0.9, T.kast[1]], 4, 10);
line([-39.1, 3, 14], [-39.1, 15, 14], 4);
circle([T.berk[0], top('berk') + 0.9, T.berk[1]], 2, 6);
circle([T.wilg[0], top('wilg') + 0.9, T.wilg[1]], 3, 8);
line([24, 2.5, 44], [36, 2.5, 44], 5);
circle([0, 0.9, -10], 5, 10);
circle([ARENA.x, ARENA.y + 0.9, ARENA.z], 5.5, 12);
line([-40, 0.9, 40], [-52, 0.9, 26], 5);

// ---------- checkpoints ----------
export const FLAGS = [[0, 58, 0], [-28, 24, 0], [-21, 49.5, top('eik')], [-5, 9, top('kast')], [DEN_LEDGE.x + 1, DEN_LEDGE.z + 1.6, 18], [-37, -24, top('berk')], [37, 13, top('wilg')], [MAM_DECK.x + 0.5, MAM_DECK.z + 0.5, 26], [12, -18, 0], [40, -6, 0]].map(([x, z, y]) => {
  const p = V3(x, y, z);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4), toon(0x8a6a4a)); pole.position.set(p.x, p.y + 1.2, p.z); scene.add(pole);
  const mat = new THREE.MeshBasicMaterial({ color: 0x9a948a, side: THREE.DoubleSide });
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), mat); cloth.position.set(p.x + 0.45, p.y + 2.1, p.z); scene.add(cloth);
  return { pos: p, mat };
});

// ---------- spawn, rocket ----------
export const SPAWN = V3(1, 0, 64);
export const ARENA_ENTRY = V3(MAM_DECK.x, ARENA.y, MAM_DECK.z);
export const ARENA_POS = V3(ARENA.x, ARENA.y, ARENA.z);
export const CHECKPOINTS = FLAGS.map((f) => ({ test: (p) => Math.hypot(p.x - f.pos.x, p.z - f.pos.z) < 3 && Math.abs(p.y - f.pos.y) < 2, pos: f.pos }));
export const PLANET = 'woud';
export const rocket = new THREE.Group();
{
  const r = rocket; r.position.set(4, 0, 68); r.rotation.y = -0.3;
  const add = (m, ol = 1.05) => { m.castShadow = true; if (ol) addOutline(m, ol); r.add(m); return m; };
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.0, 3.2, 24), toon(0xfbf3e4))).position.y = 1.8;
  add(new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.4, 24), toon(0xff5a36))).position.y = 4.1;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 3;
    const f = add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.3, 0.9), toon(0xff5a36))); f.position.set(Math.sin(a) * 1.05, 0.75, Math.cos(a) * 1.05); f.rotation.y = a;
  }
  add(new THREE.Mesh(new THREE.CircleGeometry(0.42, 32), new THREE.MeshBasicMaterial({ color: 0x9ad8ff })), 0).position.set(0, 2.5, 0.95);
  scene.add(r);
  solid(4, 1.6, 68, 2.4, 3.2, 2.4);
}
export const TRAVEL = {
  pos: V3(4, 0, 68),
  dests: [
    { need: 0, planet: 'wolk', name: 'de Wolkeneilanden', label: 'Terug naar de Wolkeneilanden' },
    { need: 0, planet: 'regen', name: 'de Regenstad', label: 'Terug naar de Regenstad' },
    { need: 0, planet: 'feest', name: 'de Feestplaneet', label: 'Terug naar de Feestplaneet' },
    { need: 0, planet: 'tempel', name: 'de Vergeten Tempel', label: 'Terug naar de Vergeten Tempel' },
    { need: 0, planet: 'water', name: 'de Waterplaneet', label: 'Terug naar de Waterplaneet' },
    { need: 0, planet: 'zon', name: 'de Zon', label: 'Terug naar de Zon' },
    { need: 0, planet: 'schroot', name: 'de Schroothoop', label: 'Terug naar de Schroothoop' },
    { need: 0, planet: 'bos', name: 'het Paddenstoelenbos', label: 'Terug naar het Paddenstoelenbos' },
    { need: 0, planet: 'berg', name: 'de Bergwereld', label: 'Terug naar de Bergwereld' },
    { need: 0, planet: 'mistmaan', name: 'de Mistmaan', label: 'Terug naar de Mistmaan' },
  ],
};
// pollen drifting in the sunlight
export const dust = (() => {
  const n = 300, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = (hr() - 0.5) * 120; pos[i * 3 + 1] = hr() * 40; pos[i * 3 + 2] = (hr() - 0.5) * 140 + 20; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.16, color: 0xfff0a0, transparent: true, opacity: 0.75, depthWrite: false }));
  scene.add(p); return p;
})();

export function updateWorld(t, dt) { for (const f of anim) f(t, dt); }
void VOID; void lamps; void crates; void pillar; void gy; void addCookie; void movers;
