import { THREE, scene, toon, addOutline, V3, label, puff } from './core.js?v=sub1';
import { addCookie, line, circle } from './cookies.js?v=sub1';
import { groundAt, ISLANDS, ARENA, VOID } from './wolk-terrain.js?v=sub1';
import { boxes, movers, lamps, crates, anim, syncBox, solid, block, pillar, hr, gy, mesh, crate, sign, stairs } from './wolk-kit.js?v=sub1';
export { boxes, movers, lamps, crates, anim, syncBox };

export const winOn = new THREE.MeshBasicMaterial({ color: 0xffc46b });
export const winOff = new THREE.MeshBasicMaterial({ color: 0x8a8aa0 });
export const fogMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, depthWrite: false });
const I = ISLANDS;
const top = (k) => I[k][3];

// ---------- a bright, windy sky ----------
{
  const hemi = scene.children.find((o) => o.isHemisphereLight);
  const sunL = scene.children.find((o) => o.isDirectionalLight);
  if (hemi) { hemi.color.setHex(0xffffff); hemi.groundColor.setHex(0xb8c8ff); hemi.intensity = 1.5; }
  if (sunL) { sunL.color.setHex(0xfff4e0); sunL.intensity = 1.6; sunL.position.set(30, 60, 20); }
  scene.fog = new THREE.Fog(0xd8ecff, 70, 190);
  const sunBall = new THREE.Mesh(new THREE.SphereGeometry(9, 20, 14), new THREE.MeshBasicMaterial({ color: 0xfff6c0, fog: false })); sunBall.position.set(90, 80, -150); scene.add(sunBall);
  // a rainbow far away, behind Knoop's island
  const cols = [0xff5a5a, 0xffa04a, 0xffe14a, 0x7aff6a, 0x5ac8ff, 0xb07aff];
  cols.forEach((c, i) => {
    const r = new THREE.Mesh(new THREE.TorusGeometry(70 - i * 1.6, 0.8, 6, 60, Math.PI), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.35, fog: false, depthWrite: false }));
    r.position.set(-10, -20, -150); scene.add(r);
  });
  // the sea of clouds far below
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshBasicMaterial({ color: 0xf4f8ff, transparent: true, opacity: 0.9 }));
  sea.rotation.x = -Math.PI / 2; sea.position.y = -30; scene.add(sea);
  const seaPuff = new THREE.SphereGeometry(1, 10, 8), seaMat = toon(0xffffff);
  for (let i = 0; i < 70; i++) { const a = hr() * Math.PI * 2, d = 20 + hr() * 120, s = 6 + hr() * 10; const m = new THREE.Mesh(seaPuff, seaMat); m.position.set(Math.cos(a) * d, -31, Math.sin(a) * d); m.scale.set(s, s * 0.4, s); scene.add(m); }
}
// drifting little clouds, just to look at
const drifters = [];
for (let i = 0; i < 18; i++) {
  const g = new THREE.Group();
  for (let k = 0; k < 4; k++) { const m = new THREE.Mesh(new THREE.SphereGeometry(1.4 + hr() * 1.2, 10, 8), toon(0xffffff)); m.position.set(k * 1.6 - 2.4, hr() * 0.6, hr() * 0.8); g.add(m); }
  g.position.set((hr() - 0.5) * 220, 48 + hr() * 25, (hr() - 0.5) * 220); scene.add(g);   // high above every island, so they never block the view
  drifters.push({ g, v: 0.6 + hr() * 1.2 });
}

// a walkway of planks between two points (a rope bridge, or a stair if one end is higher)
function walkway(ax, az, ay, bx, bz, by, step = 0.75, w = 1.7, colTop = 0xc89a6a, colSide = 0x8a6a4a, rope = true) {
  const L = Math.hypot(bx - ax, bz - az), n = Math.max(2, Math.ceil(L / step), Math.ceil(Math.abs(by - ay) / 0.3));   // each plank at most 0.3 higher: you can walk up it
  const out = [];
  for (let k = 0; k <= n; k++) {
    const u = k / n, x = ax + (bx - ax) * u, z = az + (bz - az) * u, y = ay + (by - ay) * u;
    out.push(block(x, y - 0.15, z, w, 0.3, w, colTop, colSide, {}, false));
  }
  if (rope) {
    const nx = -(bz - az) / L, nz = (bx - ax) / L;
    for (const s of [-1, 1]) {
      for (let k = 0; k <= n; k += 3) { const u = k / n; mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.2), toon(0x8a6a4a), ax + (bx - ax) * u + nx * s * 0.9, ay + (by - ay) * u + 0.6, az + (bz - az) * u + nz * s * 0.9, scene, 0); }
      const r = mesh(new THREE.CylinderGeometry(0.04, 0.04, Math.hypot(L, by - ay)), toon(0xe8d8b0), (ax + bx) / 2 + nx * s * 0.9, (ay + by) / 2 + 1.15, (az + bz) / 2 + nz * s * 0.9, scene, 0);
      r.quaternion.setFromUnitVectors(V3(0, 1, 0), V3(bx - ax, by - ay, bz - az).normalize());
    }
  }
  return out;
}
// a cloud you can stand on
function puffPlat(x, y, z, w = 2.2, extra = {}) {
  const b = block(x, y - 0.3, z, w, 0.6, w, 0xffffff, 0xeef2ff, extra, false);
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; mesh(new THREE.SphereGeometry(w * 0.32, 10, 8), toon(0xffffff), Math.cos(a) * w * 0.4, -0.3, Math.sin(a) * w * 0.4, b.mesh, 0).scale.set(1, 0.45, 1); }   // flat, so they stay under your feet
  return b;
}
// a bouncy cloud (pink): land on it and it throws you up
function bouncer(x, y, z, power) {
  const b = block(x, y + 0.2, z, 1.8, 0.4, 1.8, 0xff9ad8, 0xd86aa8, { bounce: power }, false);
  mesh(new THREE.SphereGeometry(0.7, 10, 8), toon(0xffb8e8), 0, 0.2, 0, b.mesh, 0).scale.set(1.2, 0.5, 1.2);
  return b;
}

// ---------- Wolkenhaven: the rocket, Raaf's werkplaats ----------
export const WERKPLAATS = V3(-6, top('haven') + 1, 31);
{
  const y = WERKPLAATS.y;
  // the shed: three walls and a roof that blew half off
  block(WERKPLAATS.x, y + 1.4, WERKPLAATS.z - 2.2, 5, 2.8, 0.3, 0xd8a86a, 0xb8884a);
  block(WERKPLAATS.x - 2.4, y + 1.4, WERKPLAATS.z - 0.8, 0.3, 2.8, 3, 0xd8a86a, 0xb8884a);
  const roof = mesh(new THREE.BoxGeometry(3.4, 0.2, 3.6), toon(0x5a8ad8), WERKPLAATS.x - 0.9, y + 3, WERKPLAATS.z - 0.8); roof.rotation.z = 0.2;
  label('WERKPLAATS', WERKPLAATS.x, y + 3.6, WERKPLAATS.z - 2, 4);
  block(WERKPLAATS.x + 1, y + 0.45, WERKPLAATS.z - 1.2, 2.4, 0.9, 1, 0x8a6a4a, 0x5a4a3a);     // the workbench
  // a little windmill-propeller on a pole: Raaf's weathervane
  const pole = mesh(new THREE.CylinderGeometry(0.06, 0.06, 3), toon(0x8a8aa8), WERKPLAATS.x + 2.6, y + 1.5, WERKPLAATS.z - 2.4, scene, 0); void pole;
  const vane = new THREE.Group(); vane.position.set(WERKPLAATS.x + 2.6, y + 3, WERKPLAATS.z - 2.3); scene.add(vane);
  for (let i = 0; i < 4; i++) { const b = mesh(new THREE.BoxGeometry(0.12, 0.8, 0.04), toon([0xff5a5a, 0xffe14a, 0x5ac8ff, 0x7aff6a][i]), 0, 0.4, 0, new THREE.Group(), 0); const g = b.parent; g.rotation.z = (i / 4) * Math.PI * 2; vane.add(g); }
  anim.push((t) => { vane.rotation.z = t * 3; });
  // steps up onto the terrace
  stairs(-2, 34.5, 1, 0, 1, 0, 1.6, 1);
}
sign(4, 50, 'Wolkenhaven', 0);
sign(-8, 40, '← Schapenwei', 0.4);
sign(9, 38, 'Molenheuvel →', -0.4);

// ---------- Wolkenhaven ↔ Schapenwei: a rope bridge ----------
walkway(-9.4, 35.6, top('haven'), -22.2, 29.6, top('wei'));
// ---------- Wolkenhaven ↔ Molenheuvel: stepping clouds, one of them bobs ----------
puffPlat(13.5, 1.2, 34.5);
{
  const b = puffPlat(17, 2.6, 32);
  b.mover = { b, delta: V3(), fn(t) { return V3(17, 2.3 + Math.sin(t * 1.4) * 0.9, 32); } };
  movers.push(b.mover);
}
puffPlat(20, 4, 29.5);

// ---------- de Schapenwei: the sheep pen, a bouncy cloud up to the high cloud ----------
export const PEN = V3(-23, top('wei'), 31);
{
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    if (Math.abs(Math.atan2(Math.sin(a - Math.PI), Math.cos(a - Math.PI))) < 0.4) continue;     // the gate (to the west)
    mesh(new THREE.CylinderGeometry(0.08, 0.08, 1), toon(0xc89a6a), PEN.x + Math.cos(a) * 2.6, PEN.y + 0.5, PEN.z + Math.sin(a) * 2.6, scene, 0);
  }
  const ring = mesh(new THREE.TorusGeometry(2.6, 0.05, 4, 32), toon(0xc89a6a), PEN.x, PEN.y + 0.85, PEN.z, scene, 0); ring.rotation.x = Math.PI / 2;
  sign(PEN.x + 2, PEN.z - 3.2, 'Schapenkooi', 0, PEN.y);
  bouncer(-30.5, top('wei'), 22.4, 25);
  sign(-28, 23, '↑ Hoge wolk', 0, top('wei'));
}
export const HIGH_CLOUD = V3(-34, 11, 20);

// ---------- de Molenheuvel: the windmill, stairs up its west side ----------
export const MILL_TOP = V3(31, 13, 26.5);
const millBlades = new THREE.Group();
{
  const y0 = top('molen');
  pillar(31, 26.5, 3, 3, y0, 13, 0xd8d0c0, 0xb8a890);
  stairs(28.6, 30.5, 0, -1, 8, y0, 1.4, 1, 0xc89a6a, 0x8a6a4a);
  millBlades.position.set(32.7, 11.5, 26.5); millBlades.rotation.y = Math.PI / 2; scene.add(millBlades);
  for (let i = 0; i < 4; i++) {
    const g = new THREE.Group(); g.rotation.z = (i / 4) * Math.PI * 2; millBlades.add(g);
    mesh(new THREE.BoxGeometry(0.2, 4.2, 0.1), toon(0x8a6a4a), 0, 2.2, 0, g, 0);
    mesh(new THREE.BoxGeometry(1, 3.4, 0.05), toon(0xf4ecd8), 0.55, 2.5, 0.05, g, 0);
  }
  const spin = new THREE.Group(); while (millBlades.children.length) spin.add(millBlades.children[0]); millBlades.add(spin);
  anim.push((t) => { spin.rotation.z = t * 0.6; });
}
// Molenheuvel → the stork's rock: two hops only a whirlwind (or a huge triple jump) can make

// ---------- de Ooievaarsrots: the stork's nest ----------
export const NEST = V3(38, top('rots'), -9);
{
  const nest = new THREE.Group(); nest.position.copy(NEST); scene.add(nest);
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; const s = mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.4), toon(0xc8a060), Math.cos(a) * 1.1, 0.25, Math.sin(a) * 1.1, nest, 0); s.rotation.set(hr() * 0.5, a, Math.PI / 2); }
  mesh(new THREE.CylinderGeometry(1.1, 0.8, 0.3, 14), toon(0xa88040), 0, 0.12, 0, nest, 0);
}

// ---------- het hoogste wolkje, and far below it het Wolkenbad ----------
export const HIGHEST = V3(I.hoog[0], top('hoog'), I.hoog[1]);
sign(HIGHEST.x + 1.5, HIGHEST.z + 1.5, 'Het hoogste wolkje', 0, HIGHEST.y);
export const BAD = V3(I.bad[0], top('bad'), I.bad[1]);
{
  // a target painted on the softest cloud
  [[1.4, 0xff5a5a], [1, 0xffffff], [0.55, 0xff5a5a]].forEach(([r, c], i) => {
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, 28), new THREE.MeshBasicMaterial({ color: c }));
    m.rotation.x = -Math.PI / 2; m.position.set(BAD.x, BAD.y + 0.02 + i * 0.005, BAD.z); scene.add(m);
  });
  sign(BAD.x - 2.6, BAD.z - 2.2, 'Duik in de roos!', 0.3, BAD.y);
  bouncer(8.3, BAD.y, 12.8, 28);
}

// ---------- the cable car: Schapenwei ↔ Bonenveld ----------
const CAB = { a: V3(-30.5, top('wei'), 15.6), b: V3(-33, top('bonen'), 3) };
export const CABLE = { swing: null, x: 0, y: 0, z: 0 };
{
  const cyc = 20, travel = 7, wait = 3;
  const at = (t) => {
    const u = ((t % cyc) + cyc) % cyc;
    const k = u < wait ? 0 : u < wait + travel ? (u - wait) / travel : u < 2 * wait + travel ? 1 : 1 - (u - 2 * wait - travel) / travel;
    const s = k * k * (3 - 2 * k);
    const p = CAB.a.clone().lerp(CAB.b, s);
    p.y -= Math.sin(Math.PI * s) * 1.5;          // the cable sags in the middle
    return p;
  };
  const g = block(CAB.a.x, CAB.a.y - 0.2, CAB.a.z, 3, 0.4, 3, 0x5ac8ff, 0x3a8ab8);
  const look = new THREE.Group(); g.mesh.add(look);
  for (const [x, z] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]]) mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.1), toon(0xffe14a), x, 0.75, z, look, 0);
  mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.4), toon(0x5a5a6a), 0, 1.9, 0, look, 0);
  mesh(new THREE.BoxGeometry(0.5, 0.3, 0.5), toon(0x5a5a6a), 0, 3.6, 0, look, 0);
  g.mover = { b: g, delta: V3(), fn(t) { const p = at(t); CABLE.x = p.x; CABLE.y = p.y; CABLE.z = p.z; return V3(p.x, p.y - 0.2, p.z); } };
  movers.push(g.mover);
  // the cable and two pylons
  for (const e of [CAB.a, CAB.b]) { mesh(new THREE.CylinderGeometry(0.15, 0.2, 6), toon(0x8a8aa8), e.x + 2, e.y + 3, e.z, scene, 0); }
  const c0 = CAB.a.clone().add(V3(0, 3.6, 0)), c1 = CAB.b.clone().add(V3(0, 3.6, 0));
  for (let k = 0; k < 12; k++) {
    const u0 = k / 12, u1 = (k + 1) / 12;
    const p0 = c0.clone().lerp(c1, u0).add(V3(0, -Math.sin(Math.PI * u0) * 1.5, 0)), p1 = c0.clone().lerp(c1, u1).add(V3(0, -Math.sin(Math.PI * u1) * 1.5, 0));
    const seg = mesh(new THREE.CylinderGeometry(0.04, 0.04, p0.distanceTo(p1)), toon(0x3a3a4a), (p0.x + p1.x) / 2, (p0.y + p1.y) / 2, (p0.z + p1.z) / 2, scene, 0);
    seg.quaternion.setFromUnitVectors(V3(0, 1, 0), p1.clone().sub(p0).normalize());
  }
  // a swing hanging from the middle of the cable, far under the cabin
  const mid = CAB.a.clone().lerp(CAB.b, 0.5); mid.y -= 1.5;
  const sw = block(mid.x, mid.y - 3.3, mid.z, 1.5, 0.25, 1.5, 0xc89a6a, 0x8a6a4a, {}, false);
  for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(0.03, 0.03, 6.6), toon(0xe8d8b0), mid.x + 0.65 * s, mid.y + 0.1, mid.z, scene, 0);
  CABLE.swing = sw;
  addCookie(mid.x, mid.y - 2.3, mid.z, 'Onder de kabelbaan');
}

// ---------- het Bonenveld ----------
export const SEED = V3(-38, top('bonen'), -14);
export const BROM_HOME = V3(-34, 9, -2);
{
  // rows of little bean plants
  for (let r = 0; r < 4; r++) for (let k = 0; k < 6; k++) {
    const x = -40 + k * 2.2, z = -4 + r * 2.4;
    if (Math.hypot(x - I.bonen[0], z - I.bonen[1]) > 8.5) continue;
    mesh(new THREE.ConeGeometry(0.35, 0.8, 6), toon(0x5aa83a), x, top('bonen') + 0.4, z, scene, 0);
  }
  sign(-30, -15, 'Bonenveld', 0.5, top('bonen'));
}

// ---------- Oma's eiland, and the plank stair up to Knoop's island ----------
export const OMA_AT = V3(-14, top('oma'), -29);
{
  const y = top('oma');
  // Oma's cottage
  block(-14, y + 1.3, -31.5, 4, 2.6, 3, 0xf4e8d8, 0xe8d8c0);
  const roof = mesh(new THREE.ConeGeometry(3.2, 1.8, 4), toon(0xc84a3a), -14, y + 3.5, -31.5); roof.rotation.y = Math.PI / 4;
  mesh(new THREE.BoxGeometry(0.9, 1.6, 0.05), toon(0x8a5a3a), -14, y + 0.8, -29.97, scene, 0);
  label('Oma Wolk', -14, y + 4.8, -31.5, 2.4);
}
export const GATE = V3(8.4, ARENA.y, -37);
export const gate = { box: null, mesh: null };
{
  const F = I.oma, G = I.knoop;
  const dx = G[0] - F[0], dz = G[1] - F[1], L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L;
  const a = V3(F[0] + ux * (F[2] - 0.6), F[3], F[1] + uz * (F[2] - 0.6)), b = V3(G[0] - ux * (G[2] + 0.4), G[3], G[1] - uz * (G[2] + 0.4));
  walkway(a.x, a.z, a.y + 0.3, b.x, b.z, b.y, 0.72);
  // a ring wall round the arena, with one way in: a gate of thunderstone
  const gateAng = Math.atan2(GATE.z - ARENA.z, GATE.x - ARENA.x);
  for (let i = 0; i < 40; i++) {
    const ang = (i / 40) * Math.PI * 2;
    if (Math.abs(Math.atan2(Math.sin(ang - gateAng), Math.cos(ang - gateAng))) < 0.17) continue;
    block(ARENA.x + Math.cos(ang) * 11.4, ARENA.y + 1.6, ARENA.z + Math.sin(ang) * 11.4, 2, 3.2, 2, 0x9a9ab8, 0x6a6a88);
  }
  const gb = block(GATE.x, ARENA.y + 1.6, GATE.z, 3.4, 3.2, 3.4, 0x5a5a78, 0x4a4a68);
  for (let i = 0; i < 6; i++) { const c = mesh(new THREE.BoxGeometry(0.1, 1.4 + hr(), 0.1), new THREE.MeshBasicMaterial({ color: 0xffe14a }), (hr() - 0.5) * 2.6, (hr() - 0.5) * 2, 1.72, gb.mesh, 0); c.rotation.z = (hr() - 0.5) * 1.4; }
  gate.box = gb; gate.mesh = gb.mesh;
  label('VERBODEN TOEGANG!', GATE.x - 2, ARENA.y + 4.2, GATE.z + 2.2, 4.4);
}
export function openGate() {
  if (!gate.box) return;
  const i = boxes.indexOf(gate.box); if (i >= 0) boxes.splice(i, 1);
  scene.remove(gate.mesh); gate.box = null;
}
// the crate: on a tiny island off Oma's, across a gap
crate(-27, -32, true, 'Achter Oma’s eiland', top('oma'));
block(-27, top('oma') - 0.5, -32, 3, 1, 3, 0xffffff, 0xeef2ff, {}, false);
{
  // (it's a little cloud of its own: put a puff of terrain-ish cloud under it)
  for (let i = 0; i < 3; i++) mesh(new THREE.SphereGeometry(1.2, 10, 8), toon(0xffffff), -27 + (i - 1) * 1.1, top('oma') - 1.2, -32, scene, 0);
}

// ---------- the cannons (after the fight, Knoop lets you use them) ----------
export const CANNON = V3(10, ARENA.y, -48);
export const CANNON_BACK = V3(I.ver[0] + 1.5, top('ver'), I.ver[1]);
function cannonModel(at, yaw) {
  const g = new THREE.Group(); g.position.copy(at); g.rotation.y = yaw; scene.add(g);
  mesh(new THREE.BoxGeometry(1.6, 0.6, 2), toon(0x8a5a3a), 0, 0.3, 0, g);
  const barrel = mesh(new THREE.CylinderGeometry(0.45, 0.6, 2.6, 14), toon(0x3a3a4a), 0, 1.1, 0.4, g); barrel.rotation.x = -1.0;
  for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.15, 14), toon(0x6a4a2a), 0.85 * s, 0.4, 0, g).rotation.z = Math.PI / 2;
  return g;
}
cannonModel(CANNON, Math.atan2(I.ver[0] - CANNON.x, I.ver[1] - CANNON.z));
cannonModel(CANNON_BACK, Math.atan2(CANNON.x - CANNON_BACK.x, CANNON.z - CANNON_BACK.z));
sign(I.ver[0] - 1, I.ver[1] + 2, 'Het verste wolkje', 0, top('ver'));

// ======================================================================================================
// ---------- het Zuiden: past the rocket ----------
// ======================================================================================================
const S = (k) => ({ x: I[k][0], z: I[k][1], r: I[k][2], y: I[k][3] });
const PLEIN = S('plein'), VALTOP = S('valtop'), POEL = S('poel'), THERM = S('thermiek'), IJS = S('ijs'), ZUID = S('zuid');
sign(-2, 49.5, '↓ Ballonplein', Math.PI);
// Wolkenhaven ↔ Ballonplein: a long, bouncy rope bridge
walkway(0, 50.6, top('haven'), 0, PLEIN.z - PLEIN.r + 0.6, PLEIN.y);

// ---------- het Ballonplein: a hot-air balloon goes up to the top of the waterfall ----------
export const BALLOON = { x: 0, y: 0, z: 0 };
{
  const from = V3(6, PLEIN.y, 76), to = V3(9.5, VALTOP.y + 1, 80.5);
  const cyc = 22, up = 8, wait = 3;
  const at = (t) => {
    const u = ((t % cyc) + cyc) % cyc;
    const k = u < wait ? 0 : u < wait + up ? (u - wait) / up : u < 2 * wait + up ? 1 : 1 - (u - 2 * wait - up) / up;
    const s = k * k * (3 - 2 * k);
    return from.clone().lerp(to, s);
  };
  const basket = block(from.x, from.y + 0.2, from.z, 2.4, 0.4, 2.4, 0xc89a6a, 0x8a6a4a);
  const look = new THREE.Group(); basket.mesh.add(look);
  // the wicker sides (low, so you can step in)
  for (const [x, z, w, d] of [[0, 1.15, 2.4, 0.1], [0, -1.15, 2.4, 0.1], [1.15, 0, 0.1, 2.4], [-1.15, 0, 0.1, 2.4]]) mesh(new THREE.BoxGeometry(w, 0.5, d), toon(0xb8884a), x, 0.45, z, look, 0);
  for (const [x, z] of [[-1.1, -1.1], [1.1, -1.1], [-1.1, 1.1], [1.1, 1.1]]) mesh(new THREE.CylinderGeometry(0.03, 0.03, 3.6), toon(0xe8d8b0), x, 2, z, look, 0);
  const env = new THREE.Group(); env.position.y = 5.6; look.add(env);
  const stripes = [0xff5a5a, 0xffe14a, 0x5ac8ff, 0x7aff6a, 0xff9ad8, 0xffa04a];
  for (let i = 0; i < 6; i++) { const seg = mesh(new THREE.SphereGeometry(2.6, 16, 12, (i / 6) * Math.PI * 2, Math.PI / 3), toon(stripes[i]), 0, 0, 0, env, 0); seg.scale.y = 1.2; }
  const flame = mesh(new THREE.ConeGeometry(0.25, 0.7, 8), new THREE.MeshBasicMaterial({ color: 0xffa040 }), 0, 3.2, 0, look, 0);
  anim.push((t) => { flame.scale.y = 0.8 + Math.sin(t * 20) * 0.3; });
  basket.mover = { b: basket, delta: V3(), fn(t) { const p = at(t); BALLOON.x = p.x; BALLOON.y = p.y; BALLOON.z = p.z; return V3(p.x, p.y + 0.2, p.z); } };
  movers.push(basket.mover);
  sign(3.5, 74, 'Ballon ↑ Waterval', -0.6, PLEIN.y);
}
// Ballonplein ↔ Thermiekvelden, and Ballonplein ↔ Spetterpoel
{
  const link = (A, B, h0 = A.y, h1 = B.y) => {
    const dx = B.x - A.x, dz = B.z - A.z, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L;
    walkway(A.x + ux * (A.r - 0.6), A.z + uz * (A.r - 0.6), h0, B.x - ux * (B.r - 0.6), B.z - uz * (B.r - 0.6), h1);
  };
  link(PLEIN, THERM);
  link(PLEIN, POEL);
  link(POEL, IJS);
}

// ---------- de Regenboogwaterval ----------
export const WATERVAL = { x: VALTOP.x, z: VALTOP.z + VALTOP.r + 4.5 };     // a stone spout carries the stream out past the island
export const ALCOVE = V3(VALTOP.x, 10, VALTOP.z + VALTOP.r + 2.1);       // (not under the island: under an island you can't stand)
{
  const W = WATERVAL, H = VALTOP.y - POEL.y + 0.6;
  const fallMat = new THREE.MeshBasicMaterial({ color: 0x9ad8ff, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
  const fall = new THREE.Mesh(new THREE.PlaneGeometry(4.4, H, 1, 12), fallMat); fall.position.set(W.x, POEL.y + H / 2, W.z); scene.add(fall);
  // rainbow streaks running down the water
  const streaks = [];
  [0xff5a5a, 0xffa04a, 0xffe14a, 0x7aff6a, 0x5ac8ff, 0xb07aff].forEach((c, i) => {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 3), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide }));
    s.position.set(W.x - 1.6 + i * 0.64, 0, W.z + 0.02); scene.add(s); streaks.push(s);
  });
  // the stream on top, and foam at the bottom
  const runL = W.z - VALTOP.z;
  const river = new THREE.Mesh(new THREE.PlaneGeometry(4.4, runL), fallMat); river.rotation.x = -Math.PI / 2; river.position.set(W.x, VALTOP.y + 0.05, VALTOP.z + runL / 2); scene.add(river);
  block(W.x, VALTOP.y - 0.3, (VALTOP.z + VALTOP.r - 0.5 + W.z) / 2, 5.2, 0.6, W.z - VALTOP.z - VALTOP.r + 0.5, 0x9a9ab8, 0x6a6a88);   // the spout
  const pond = new THREE.Mesh(new THREE.CircleGeometry(4, 24), new THREE.MeshBasicMaterial({ color: 0x7ac8ff, transparent: true, opacity: 0.7 })); pond.rotation.x = -Math.PI / 2; pond.position.set(POEL.x, POEL.y + 0.03, POEL.z - 1); scene.add(pond);
  anim.push((t) => {
    streaks.forEach((s, i) => { s.position.y = VALTOP.y - (((t * 6 + i * 3.7) % H)); });
    if (Math.random() < 0.5) puff(V3(W.x + (Math.random() - 0.5) * 4, POEL.y + 0.3, W.z + 1.5), 1, 0xffffff, 2, 2);
  });
  // a ledge hidden behind the falling water
  block(ALCOVE.x, ALCOVE.y - 0.2, ALCOVE.z, 3, 0.4, 2.6, 0x9a9ab8, 0x6a6a88);
  addCookie(ALCOVE.x, ALCOVE.y + 1.1, ALCOVE.z - 0.3, 'Achter de waterval');
  // water lilies (well, cloud lilies) that ride up the waterfall and back down again
  for (let i = 0; i < 3; i++) {
    const x = W.x - 1.4 + i * 1.4, z = W.z + 2.4;
    const lo = POEL.y + 0.2, hi = VALTOP.y - 0.2;
    const b = block(x, lo, z, 2.2, 0.35, 2.2, 0x7ad86a, 0x5aa84a, {}, false);
    mesh(new THREE.ConeGeometry(0.3, 0.5, 6), toon(0xff9ad8), 0, 0.4, 0, b.mesh, 0);
    const ph = i * 4.6, cyc = 14;
    b.mover = { b, delta: V3(), fn(t) { const u = (((t + ph) % cyc) + cyc) % cyc; const k = u < 6 ? u / 6 : u < 7 ? 1 : u < 13 ? 1 - (u - 7) / 6 : 0; return V3(x, lo + (hi - lo) * k, z); } };
    movers.push(b.mover);
  }
  sign(POEL.x + 3.6, POEL.z - 2.4, 'Spetterpoel', -0.5, POEL.y);
}

// ---------- de Thermiekvelden: warm wind blows straight up. Glide into it (Zweef or Wervelwind) and you rise ----------
export const THERMALS = [[-32, 92, 18], [-24, 99, 28], [-30, 103.5, 33]].map(([x, z, top]) => ({ x, z, r: 2.3, top }));
{
  const mat = new THREE.MeshBasicMaterial({ color: 0xffe8c0, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false });
  for (const T of THERMALS) {
    const h = T.top - THERM.y;
    const c = new THREE.Mesh(new THREE.CylinderGeometry(T.r, T.r, h, 18, 1, true), mat); c.position.set(T.x, THERM.y + h / 2, T.z); scene.add(c);
    // a warm grate on the ground where the wind comes from
    const g = new THREE.Mesh(new THREE.CircleGeometry(T.r, 18), new THREE.MeshBasicMaterial({ color: 0xffa040 })); g.rotation.x = -Math.PI / 2; g.position.set(T.x, THERM.y + 0.03, T.z); scene.add(g);
    anim.push(() => { if (Math.random() < 0.6) { const a = Math.random() * 6.28, r = Math.random() * T.r; puff(V3(T.x + Math.cos(a) * r, THERM.y + 0.3 + Math.random() * h, T.z + Math.sin(a) * r), 1, 0xffe0a0, 0.3, 4); } });
  }
  sign(THERM.x + 5, THERM.z - 6.5, 'Thermiek! Zweef de warme wind in', -0.8, THERM.y);
}

// ---------- het IJswolkje: an ice dome with something frozen inside ----------
export const DOME = V3(IJS.x, IJS.y, IJS.z);
export const dome = { box: null, mesh: null };
{
  const m = new THREE.Mesh(new THREE.SphereGeometry(2.4, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xc8f0ff, transparent: true, opacity: 0.75 }));
  m.position.copy(DOME); addOutline(m, 1.03); scene.add(m);
  const glint = mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.1, 16), new THREE.MeshBasicMaterial({ color: 0xffd04a }), 0, 0.8, 0, m, 0); glint.rotation.x = Math.PI / 2;
  anim.push((t) => { glint.rotation.z = t; });
  dome.mesh = m; dome.box = solid(DOME.x, DOME.y + 1.1, DOME.z, 4, 2.2, 4);
  for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; const ic = mesh(new THREE.ConeGeometry(0.25, 1 + hr(), 5), toon(0xd8f4ff), Math.cos(a) * 4.2, 0.5, Math.sin(a) * 4.2, new THREE.Group(), 0); ic.parent.position.copy(DOME); scene.add(ic.parent); }
}
export function breakDome() {
  if (!dome.box) return;
  const i = boxes.indexOf(dome.box); if (i >= 0) boxes.splice(i, 1);
  scene.remove(dome.mesh); dome.box = null;
}
// the long crossing: IJswolkje → one little cloud → het Zuidelijkste Wolkje. Two rainbow bridges.
{
  const dx = ZUID.x - IJS.x, dz = ZUID.z - IJS.z, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L;
  const mid = IJS.r + (L - IJS.r - ZUID.r) / 2;
  puffPlat(IJS.x + ux * mid, IJS.y, IJS.z + uz * mid, 2.2);
  sign(IJS.x + ux * (IJS.r - 1), IJS.z + uz * (IJS.r - 1) + 1.4, 'Zuidelijkste wolkje →', -1.3, IJS.y);
  addCookie(ZUID.x, ZUID.y + 1.2, ZUID.z, 'De grote oversteek');
}
// Thermiekvelden ↔ IJswolkje: stepping clouds, each a bit higher
{
  const A = THERM, B = IJS;
  const dx = B.x - A.x, dz = B.z - A.z, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L;
  const n = 4;
  for (let i = 1; i <= n; i++) { const d = A.r + ((L - A.r - B.r) * i) / (n + 1); puffPlat(A.x + ux * d + (i % 2 ? 0.8 : -0.8), A.y + 0.6 * i, A.z + uz * d); }
}

// ---------- coins ----------
line([2, 0.9, 46], [2, 0.9, 38], 4);
line([-11, 0.9, 35], [-20, 2.6, 30.4], 5);
line([13.5, 2, 34.5], [20, 4.8, 29.5], 3);
circle([I.wei[0], top('wei') + 0.9, I.wei[1] + 2], 3, 8);
line([28.6, 6.9, 29.5], [28.6, 12.9, 23.5], 4);
circle([I.bonen[0] + 2, top('bonen') + 0.9, I.bonen[1]], 3.5, 8);
line([-10, 4.9, -22], [-16, 4.9, -24], 3);
circle([HIGHEST.x, HIGHEST.y + 0.9, HIGHEST.z], 1.6, 6);
line([0, 7.4, -32], [5, 9.4, -35], 3);
circle([BAD.x, BAD.y + 0.9, BAD.z], 2.5, 6);
// the south
line([0, 1.4, 53], [0, 3.4, 60], 4);
circle([0, 3.9, 70], 4, 10);
line([12.5, VALTOP.y + 0.9, 83], [13, VALTOP.y + 0.9, 89], 3);
circle([POEL.x, 0.9, POEL.z], 3, 8);
circle([THERM.x, THERM.y + 0.9, THERM.z], 4.5, 8);
line([-24, 18, 99], [-24, 26, 99], 4);
line([-9, 9.9, 112], [-3, 9.9, 112], 3);

// ---------- checkpoints ----------
export const FLAGS = [[3, 35], [-26, 31], [25, 22], [-29, -3], [-15, -22], [37, -6], [3, 64], [18, 106], [-22, 91], [-2, 112]].map(([x, z]) => {
  const p = V3(x, gy(x, z), z);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4), toon(0x8a8aa8)); pole.position.set(p.x, p.y + 1.2, p.z); scene.add(pole);
  const mat = new THREE.MeshBasicMaterial({ color: 0x9a948a, side: THREE.DoubleSide });
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), mat); cloth.position.set(p.x + 0.45, p.y + 2.1, p.z); scene.add(cloth);
  return { pos: p, mat };
});

// ---------- spawn, rocket ----------
export const SPAWN = V3(2, 0, 45);
export const ARENA_ENTRY = V3(GATE.x, ARENA.y, GATE.z);
export const ARENA_POS = V3(ARENA.x, ARENA.y, ARENA.z);
export const CHECKPOINTS = FLAGS.map((f) => ({ test: (p) => Math.hypot(p.x - f.pos.x, p.z - f.pos.z) < 3 && Math.abs(p.y - f.pos.y) < 2, pos: f.pos }));
export const PLANET = 'wolk';
export const rocket = new THREE.Group();
{
  const r = rocket; r.position.set(7, 0, 46); r.rotation.y = -0.3;
  const add = (m, ol = 1.05) => { m.castShadow = true; if (ol) addOutline(m, ol); r.add(m); return m; };
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.0, 3.2, 24), toon(0xfbf3e4))).position.y = 1.8;
  add(new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.4, 24), toon(0xff5a36))).position.y = 4.1;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 3;
    const f = add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.3, 0.9), toon(0xff5a36))); f.position.set(Math.sin(a) * 1.05, 0.75, Math.cos(a) * 1.05); f.rotation.y = a;
  }
  add(new THREE.Mesh(new THREE.CircleGeometry(0.42, 32), new THREE.MeshBasicMaterial({ color: 0x9ad8ff })), 0).position.set(0, 2.5, 0.95);
  scene.add(r);
  solid(7, 1.6, 46, 2.4, 3.2, 2.4);
}
export const TRAVEL = {
  pos: V3(7, 0, 46),
  dests: [
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
// glittering specks in the sunlight
export const dust = (() => {
  const n = 300, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = (hr() - 0.5) * 120; pos[i * 3 + 1] = hr() * 35 - 5; pos[i * 3 + 2] = (hr() - 0.5) * 120; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.14, color: 0xfff6c0, transparent: true, opacity: 0.7, depthWrite: false }));
  scene.add(p); return p;
})();

export function updateWorld(t, dt) {
  for (const f of anim) f(t, dt);
  for (const d of drifters) { d.g.position.x += d.v * dt; if (d.g.position.x > 120) d.g.position.x = -120; }
}
void groundAt; void VOID; void lamps; void crates;
