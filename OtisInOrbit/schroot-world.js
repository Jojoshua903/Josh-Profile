import { THREE, scene, toon, addOutline, V3, label } from './core.js?v=sub1';
import { addCookie, line, circle } from './cookies.js?v=sub1';
import { getSave } from './save.js?v=sub1';
import { groundAt, ISLANDS, PLATEAU_H, ARENA, HEAPS, towards, CLIFF_R } from './schroot-terrain.js?v=sub1';

// ---------- a dusty orange evening over a mountain of junk ----------
scene.fog = new THREE.FogExp2(0xd9945a, 0.0085);
const hemi = scene.children.find((o) => o.isHemisphereLight);
hemi.color.setHex(0xffd8b0); hemi.groundColor.setHex(0x5a4038); hemi.intensity = 1.5;
const sunL = scene.children.find((o) => o.isDirectionalLight);
sunL.color.setHex(0xffc890); sunL.intensity = 1.7;

export const boxes = [];
export const movers = [];
export const lamps = [];
export const crates = [];
export const winOn = new THREE.MeshBasicMaterial({ color: 0xffc46b });
export const winOff = new THREE.MeshBasicMaterial({ color: 0x4a5a70 });
export const fogMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, depthWrite: false });
// things in the world that move every frame on their own (called by the story)
export const anim = [];
const edgeMat = new THREE.LineBasicMaterial({ color: 0x2a1a10, transparent: true, opacity: 0.45 });

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
let hs = 13;
const hr = () => ((hs = (hs * 16807) % 2147483647) / 2147483647);
const gy = (x, z) => { const g = groundAt(x, z, 0); return g === -Infinity ? -1.1 : g; };

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
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.2), toon(0x5a4a40)); post.position.set(x, g + 1.1, z); scene.add(post);
  label(text, x, g + 2.4, z, 2.6).rotation.y = yaw;
}

// ---------- loose junk: all of it in one instanced mesh, so it costs one draw call ----------
const JUNK_COLS = [0xa0583a, 0x8a8a90, 0x5a6a80, 0xc0903a, 0x6a5a4e, 0x3a6ab0, 0xc0443a, 0x7a8a5a];
const junkList = [];
function junk(cx, cz, rad, n, y = null, big = 1) {
  for (let i = 0; i < n; i++) {
    const a = hr() * Math.PI * 2, d = Math.sqrt(hr()) * rad, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
    const g = y ?? groundAt(x, z, 0); if (g === -Infinity) continue;
    const s = (0.3 + hr() * 0.9) * big;
    junkList.push([x, g + s * 0.3, z, s * (0.6 + hr()), s * (0.4 + hr() * 0.6), s * (0.6 + hr()), hr() * 6, (hr() - 0.5) * 0.6, JUNK_COLS[Math.floor(hr() * JUNK_COLS.length)]]);
  }
}
function buildJunk() {
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), toon(0xffffff), junkList.length);
  const o = new THREE.Object3D(), c = new THREE.Color();
  junkList.forEach(([x, y, z, w, h, d, ry, rz, col], i) => {
    o.position.set(x, y, z); o.rotation.set(rz, ry, rz * 0.5); o.scale.set(w, h, d); o.updateMatrix();
    im.setMatrixAt(i, o.matrix); im.setColorAt(i, c.setHex(col));
  });
  im.castShadow = true; im.receiveShadow = true; im.computeBoundingSphere(); scene.add(im);
}
// a shipping container: a block with ribs, optionally open at one end (hollow inside)
const CONT = { red: [0xd05a48, 0xb0443a], blue: [0x5a8ad0, 0x3a6ab0], green: [0x5aa070, 0x3a8a5a], yellow: [0xf0c050, 0xe0a03a], orange: [0xf09050, 0xd9733a] };
function container(x, z, w, d, top, col, y0 = 0) {
  const b = stand(x, z, w, d, top, CONT[col][0], CONT[col][1], y0);
  const rib = toon(CONT[col][1]);
  const long = w > d, n = Math.floor((long ? w : d) / 0.8);
  for (let i = 1; i < n; i++) {
    const t = -0.5 + i / n;
    const r = new THREE.Mesh(new THREE.BoxGeometry(long ? 0.08 : w + 0.06, top - y0 - 0.2, long ? d + 0.06 : 0.08), rib);
    r.position.set(long ? t * w : 0, 0, long ? 0 : t * d); b.mesh.add(r);
  }
  return b;
}
function barrel(x, z, top, col = 0x3a6ab0, y0 = -1.4) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, top - y0, 14), toon(col));
  m.position.set(x, (top + y0) / 2, z); m.castShadow = true; addOutline(m, 1.04); scene.add(m);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.06, 6, 18), toon(0x2a3a5a)); ring.rotation.x = Math.PI / 2; ring.position.y = (top - y0) / 2 - 0.3; m.add(ring);
  return solid(x, (top + y0) / 2, z, 1.5, top - y0, 1.5);
}
// a stack of old tyres you bounce on
const tyreMat = toon(0x2a2628), rimMat = toon(0x8a8a90);
function tyre(x, z, y0, bounce = 18) {
  const g = new THREE.Group(); g.position.set(x, y0, z); scene.add(g);
  const t = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.35, 10, 20), tyreMat); t.rotation.x = Math.PI / 2; t.position.y = 0.35; t.castShadow = true; addOutline(t, 1.05); g.add(t);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.2, 12), rimMat); hub.position.y = 0.3; g.add(hub);
  const b = solid(x, y0 + 0.35, z, 2.2, 0.7, 2.2, { bounce });
  b.mesh = g; b.squish = g;
  return b;
}
// a stepping stone line between two islands (or any two edge points)
function stones(a, b, n, make) {
  for (let i = 1; i <= n; i++) { const t = i / (n + 1); make(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, i); }
}
const edge = (from, to) => {        // the edge point of island `from` facing island `to`
  const d = Math.hypot(to[0] - from[0], to[1] - from[1]);
  return [from[0] + ((to[0] - from[0]) / d) * (from[2] - 0.4), from[1] + ((to[1] - from[1]) / d) * (from[2] - 0.4)];
};
// a platform drifting back and forth between two points
function drifter(a, b, y, w, d, period, col = 0x5a8ad0) {
  const blk = block(a[0], y - 0.15, a[1], w, 0.3, d, col, 0x3a5a90);
  const ph = hr() * 6;
  blk.mover = { b: blk, delta: V3(), fn(t) { const k = 0.5 - 0.5 * Math.cos((t / period) * Math.PI * 2 + ph); return V3(a[0] + (b[0] - a[0]) * k, y - 0.15 + Math.sin(t * 2) * 0.05, a[1] + (b[1] - a[1]) * k); } };
  movers.push(blk.mover);
  return blk;
}

// ---------- magnets: with Magneet, hold jump in the air near one and you fly to it ----------
export const MAGNETS = [];
const magRed = toon(0xe0443a), magSteel = toon(0xc8ccd4), cableMat = new THREE.MeshBasicMaterial({ color: 0x2a2628 });
function magnet(x, y, z, { swing = null, cableTop = 22 } = {}) {
  const g = new THREE.Group(); g.position.set(x, y, z); scene.add(g);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.55, 18), magRed); body.position.y = 0.45; body.castShadow = true; addOutline(body, 1.06); g.add(body);
  const face = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.12, 18), magSteel); face.position.y = 0.12; g.add(face);
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1, 5), cableMat); cable.scale.y = cableTop - y - 0.7; cable.position.y = 0.7 + cable.scale.y / 2; g.add(cable);
  const glow = new THREE.Mesh(new THREE.RingGeometry(0.75, 0.95, 24), new THREE.MeshBasicMaterial({ color: 0xff7a6a, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false }));
  glow.rotation.x = Math.PI / 2; g.add(glow);
  const m = { obj: g, glow };
  if (swing) {
    const base = g.position.clone();
    anim.push((t) => { g.position.copy(base).addScaledVector(swing.axis, Math.sin(t * swing.speed) * swing.amp); });
  }
  anim.push((t) => { glow.material.opacity = 0.25 + Math.sin(t * 4 + x) * 0.15; });
  MAGNETS.push(m);
  return m;
}
// a yellow crane tower with a girder on top, purely to hang the cables from
const craneMat = toon(0xf0b030);
function craneTower(x, z, h, y0 = 0) {
  const t = new THREE.Mesh(new THREE.BoxGeometry(1.2, h - y0, 1.2), craneMat); t.position.set(x, (h + y0) / 2, z); t.castShadow = true; addOutline(t, 1.03); scene.add(t);
  solid(x, (h + y0) / 2, z, 1.2, h - y0, 1.2);
  for (let y = y0 + 1; y < h; y += 1.6) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 1.3), toon(0x8a6010)); s.position.set(x, y, z); scene.add(s);
  }
}
function girder(a, b, y) {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, d), craneMat);
  m.position.set((a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2); m.rotation.y = Math.atan2(b[0] - a[0], b[1] - a[1]); m.castShadow = true; addOutline(m, 1.03); scene.add(m);
}

// ---------- power boxes: with Vonk, walk up to one and the machine behind it comes back to life ----------
export const POWER = [];
const kastMat = toon(0x6a7480);
function powerBox(id, x, z, yaw = 0, y = null) {
  const g0 = y ?? gy(x, z);
  const g = new THREE.Group(); g.position.set(x, g0, z); g.rotation.y = yaw; scene.add(g);
  const k = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.3, 0.55), kastMat); k.position.y = 0.65; k.castShadow = true; addOutline(k, 1.05); g.add(k);
  const bolt = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.5), new THREE.MeshBasicMaterial({ color: 0xffe14a, side: THREE.DoubleSide })); bolt.position.set(0, 0.8, 0.28); g.add(bolt);
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xff3a3a });
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), lampMat); lamp.position.set(0, 1.42, 0); g.add(lamp);
  solid(x, g0 + 0.65, z, 0.9, 1.3, 0.9);
  const p = { id, pos: V3(x, g0, z), on: false, lampMat, machines: [] };
  p.set = (on, instant = false) => { p.on = on; lampMat.color.setHex(on ? 0x7dff9a : 0xff3a3a); p.machines.forEach((m) => m(on, instant)); };
  POWER.push(p);
  return p;
}
// a machine part that moves between two heights when its power box is on
function poweredLift(p, blk, x, z, low, high, speed = 4) {
  let k = 0, last = 0, target = 0;
  const hh = blk.half.y;
  blk.mover = { b: blk, delta: V3(), fn(t) {
    const dt = Math.min(0.05, last ? t - last : 0); last = t;
    k += Math.sign(target - k) * Math.min(Math.abs(target - k), (dt * speed) / Math.max(1, Math.abs(high - low)));
    const e = k * k * (3 - 2 * k);
    return V3(x, low + (high - low) * e - hh, z);
  } };
  movers.push(blk.mover);
  p.machines.push((on, instant) => { target = on ? 1 : 0; if (instant) k = target; });
}

// ---------- bridges between the heaps ----------
// The walkable part is a row of overlapping square steps (each at most 0.3 higher than the last, so you just
// walk up); on top of that sits one long deck mesh for the looks.
function bridge(a, b, { top = 0x8a5a3a, side = 0x6a4430, width = 2.2, belt = 0, rails = 0x5a4a40, y0 = null, y1 = null } = {}) {
  const ha = y0 ?? gy(a[0], a[1]), hb = y1 ?? gy(b[0], b[1]);
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]), dh = hb - ha;
  const n = Math.max(Math.ceil(L / 1.1), Math.ceil(Math.abs(dh) / 0.28));
  const push = belt ? V3(a[0] - b[0], 0, a[1] - b[1]).setLength(belt) : null;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    solid(a[0] + (b[0] - a[0]) * t, ha + dh * t - 0.15, a[1] + (b[1] - a[1]) * t, width, 0.3, width, push ? { belt: push } : {});
  }
  const g = new THREE.Group(); g.position.set((a[0] + b[0]) / 2, (ha + hb) / 2 - 0.15, (a[1] + b[1]) / 2); scene.add(g);
  g.lookAt(b[0], hb - 0.15, b[1]);
  const L3 = Math.hypot(L, dh);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(width, 0.3, L3 + 0.6), [toon(side), toon(side), toon(top), toon(side), toon(side), toon(side)]);
  deck.castShadow = deck.receiveShadow = true; g.add(deck);
  const rail = toon(rails);
  for (const s of [-1, 1]) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, L3 + 0.6), rail); r.position.set((width / 2 - 0.05) * s, 0.85, 0); g.add(r);
    for (let z = -L3 / 2; z <= L3 / 2; z += 2) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.85, 0.08), rail); p.position.set((width / 2 - 0.05) * s, 0.45, z); g.add(p); }
  }
  // posts down into the oil
  for (let s = 5; s < L - 3; s += 6) {
    const t = s / L, y = ha + dh * t - 0.3;
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, y + 6), toon(side)); p.position.set(a[0] + (b[0] - a[0]) * t, (y - 6) / 2, a[1] + (b[1] - a[1]) * t); scene.add(p);
  }
  if (belt) {
    // stripes that run along the belt towards `a`
    const stripe = new THREE.MeshBasicMaterial({ color: 0xf0b030 });
    const stripes = [];
    for (let z = 0; z < L3; z += 1.5) { const m = new THREE.Mesh(new THREE.BoxGeometry(width * 0.9, 0.02, 0.18), stripe); m.position.y = 0.16; g.add(m); stripes.push(m); }
    anim.push((t) => stripes.forEach((m, i) => (m.position.z = ((((i * 1.5 - t * belt) % L3) + L3) % L3) - L3 / 2)));
  }
  // a row of ordinary cookies along the deck
  g.coins = (n) => { for (let i = 1; i <= n; i++) { const t = 0.1 + (0.8 * i) / (n + 1); addCookie(a[0] + (b[0] - a[0]) * t, ha + dh * t + 0.9, a[1] + (b[1] - a[1]) * t); } };
  return g;
}

// ---------- 1. de landingshoop ----------
export const rocket = new THREE.Group();
{
  const r = rocket; r.position.set(6, 0, 44); r.rotation.set(0.12, -0.4, -0.18);       // a bit crooked after the hard landing
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
// the broken engine part lying next to the rocket
export const BROKEN_PART = new THREE.Group();
{
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.7, 0.9, 12), toon(0x5a5a62)); m.castShadow = true; addOutline(m, 1.06); BROKEN_PART.add(m);
  BROKEN_PART.position.set(9.2, 0.35, 46.5); BROKEN_PART.rotation.set(1.3, 0.4, 0.2); scene.add(BROKEN_PART);
}
junk(0, 40, 16, 50);
sign(0, 30, '↖ Kraanhoop · ↑ Olie · ↗ Fabriekshoop');
// behind a row of old fridges
for (const z of [39.6, 40.8, 42, 43.2, 44.4, 45.6]) {
  const b = stand(12.6, z, 1.1, 1.1, 2.2, 0xf4f0e8, 0xeae6dc);
  const h = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.6, 0.08), toon(0x8a8a90)); h.position.set(-0.57, 0.2, 0.3); b.mesh.add(h);
}
stand(14.4, 38.6, 3.6, 1.1, 2.2, 0xf4f0e8, 0xeae6dc);
stand(16.2, 42.6, 1.1, 7, 2.2, 0xf4f0e8, 0xeae6dc);
crate(14.4, 42.6, true, 'Achter de koelkasten');

// Fionn's corner: a shed full of repaired things
export const SHED = V3(-15, 0, 42);
export const FIONN_AT = V3(-11.5, 0, 37.5);
export const DISH_MOUNT = V3(-14, 4.2, 41.5);
export const TV_AT = V3(-12.6, 1.3, 40);
{
  const s = SHED;
  stand(s.x, s.z, 6, 5, 3.4, 0x8a5a3a, 0xa07a5a);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.3, 5.6), toon(0x8a8a90)); roof.position.set(s.x, 3.55, s.z); roof.rotation.z = 0.06; roof.castShadow = true; addOutline(roof, 1.02); scene.add(roof);
  solid(s.x, 3.55, s.z, 6.6, 0.3, 5.6);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.2), toon(0x5a5a62)); pole.position.set(DISH_MOUNT.x, 4.1, DISH_MOUNT.z); scene.add(pole);
  label('FIONNS REPARATIES', s.x + 1.2, 2.4, s.z - 2.55, 3.2);
  stand(TV_AT.x, TV_AT.z - 0.4, 1.6, 0.8, 0.8, 0xa07a5a, 0x6a4a30);
  const win = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.75), winOff); win.position.set(s.x + 1.6, 1.9, s.z - 2.52); win.rotation.y = Math.PI; scene.add(win);
  const lamp = new THREE.PointLight(0xffc46b, 4, 7, 2); lamp.position.set(s.x + 2.5, 2.5, s.z - 3.2); scene.add(lamp);
  lamps.push({ flicker: lamp, base: 4, seed: 3 });
  powerBox('fionn', s.x + 4.2, s.z - 0.5, -Math.PI / 2);       // Fionn's power box: dead until you shoot a spark in
}

// ---------- the bridges off the landing heap ----------
const PLANKS = bridge(towards('land', -42, 4, 17), towards('kraan', 0, 36, 15));                      // planks to the kraanhoop
const BELT = bridge(towards('land', 42, 4, 17), towards('fabriek', 0, 36, 15), { top: 0x2a2628, side: 0x3a3a42, rails: 0xf0b030, belt: 2.6 });   // a conveyor belt that runs back
// over the oil: barrels, a scrap island with a wreck, a drifting car roof, a second island, barrels again
const [W1, W2] = ISLANDS;
stones([-4.5, 22.5], edge(W1, [-4.5, 22.5, 0]), 5, (x, z, i) => barrel(x, z, 0.3, [0x3a6ab0, 0xc0443a, 0x3a8a5a, 0xe0a03a, 0x3a6ab0][i - 1]));
drifter(edge(W1, W2), edge(W2, W1), 0.3, 2.4, 2.4, 9, 0xd05a48);
stones(edge(W2, [-23.1, -37]), [-23.1, -37], 2, (x, z) => barrel(x, z, 0.3, 0xc0443a));
{ // het eenzame wrak
  const [x, z] = W1;
  stand(x, z, 3.4, 1.8, 1.1, 0x9a3a3a, 0x7a2a2a);
  block(x - 0.3, 1.55, z, 1.8, 0.9, 1.6, 0x9a3a3a, 0x7a2a2a);
  addCookie(x - 0.3, 2.7, z, 'Het eenzame wrak');
}
junk(W2[0], W2[1], 2.5, 6, 0);
sign(-4, 24, '↑ niet in de olie vallen!', 0);

// ---------- 2. de kraanhoop: containers and cranes ----------
const KH = HEAPS.kraan, KT = KH[3];
// the little crane by the bridge, whose magnet Byte can copy
export const KRAAN_MAG = new THREE.Group();
{
  const x = -33, z = 13, g0 = gy(x, z);
  const p = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.2, 0.4), craneMat); p.position.set(x, g0 + 2.1, z); scene.add(p); solid(x, g0 + 2.1, z, 0.5, 4.2, 0.5);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.3, 0.3), craneMat); arm.position.set(x - 1, g0 + 4.1, z); scene.add(arm);
  KRAAN_MAG.position.set(x - 2, g0 + 2.6, z); scene.add(KRAAN_MAG);
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.3, 14), magRed); b.position.y = 0.15; addOutline(b, 1.08); KRAAN_MAG.add(b);
  const c = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.3, 4), cableMat); c.position.y = 0.95; KRAAN_MAG.add(c);
  anim.push((t) => { KRAAN_MAG.rotation.z = Math.sin(t * 1.3) * 0.12; });
}
// containers on the top
container(-46, 8, 6, 2.6, KT + 2.6, 'red', KT);
container(-40, -1, 2.6, 5, KT + 2.6, 'green', KT);
// Fionn's dish blew onto this tall stack; two magnets lead up to it
container(-46, 0, 2.8, 2.8, KT + 2.4, 'blue', KT); container(-46, 0, 2.8, 2.8, KT + 4.8, 'yellow', KT + 2.4); container(-46, 0, 2.8, 2.8, KT + 7.2, 'orange', KT + 4.8);
magnet(-43.5, KT + 4.6, 3.5, { cableTop: KT + 16 });
magnet(-46, KT + 10.4, 0, { cableTop: KT + 16 });
export const DISH_AT = V3(-46, KT + 8, 0);
// the highest crane: four magnets climbing to a little platform
craneTower(-52, 1, KT + 18, gy(-52, 1)); girder([-52, 1], [-48, 8], KT + 18); girder([-52, 1], [-57, 5], KT + 18);
magnet(-48, KT + 5, 8, { cableTop: KT + 18 });
magnet(-51, KT + 9, 10, { cableTop: KT + 18 });
magnet(-54, KT + 13, 9, { cableTop: KT + 18 });
magnet(-56.5, KT + 17, 5.5, { cableTop: KT + 18 });
stand(-56.5, 5.5, 0.5, 0.5, KT + 12.25, 0xf0b030, 0xf0b030, gy(-56.5, 5.5));
block(-56.5, KT + 12.25, 5.5, 2.4, 0.5, 2.4, 0xf0b030, 0xc08a20);
addCookie(-56.5, KT + 13.4, 5.5, 'Op de hoogste kraan');
// a container lying open, with something inside
{
  const x = -37, z = 3, y0 = KT;
  stand(x, z - 1.4, 3, 0.2, y0 + 2.6, 0x3a8a5a, 0x3a8a5a, y0); stand(x, z + 1.4, 3, 0.2, y0 + 2.6, 0x3a8a5a, 0x3a8a5a, y0);
  stand(x - 1.4, z, 0.2, 3, y0 + 2.6, 0x3a8a5a, 0x3a8a5a, y0);
  // the lid fell off and lies next to it, so there's room to jump on the crate and ground-pound it
  stand(x + 3.4, z, 3.2, 3.2, y0 + 0.2, 0x5aa070, 0x3a8a5a, y0);
  crate(x + 0.3, z, true, 'Krat in de container', y0);
}
junk(-42, 4, 16, 40);
// over the oil to the autohoop: four magnets (the second one swings), and a post halfway
{
  const a = towards('kraan', -30, -52, 15), b = towards('auto', -42, 4, 13);
  const at = (t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const side = V3(b[1] - a[1], 0, a[0] - b[0]).normalize();
  const top = KT + 15;
  craneTower(...towards('kraan', -30, -52, 11), top, KT); craneTower(...towards('auto', -42, 4, 11), top, gy(...towards('auto', -42, 4, 11)));
  girder(towards('kraan', -30, -52, 11), towards('auto', -42, 4, 11), top);
  for (const [t, h, swing] of [[0.17, 8, 0], [0.38, 8.5, 1], [0.6, 8.5, 0], [0.88, 8, 0]]) {
    const [x, z] = at(t);
    magnet(x, h, z, { cableTop: top, swing: swing ? { axis: side, amp: 4, speed: 0.8 } : null });
  }
  const [px, pz] = at(0.5);
  stand(px + side.x * 2.6, pz + side.z * 2.6, 1.4, 1.4, 1, 0x8a8a90, 0x5a5a62, -8);
  addCookie(px + side.x * 2.6, 1.9, pz + side.z * 2.6, 'Op de paal in de olie');
  sign(...towards('kraan', -30, -52, 13), 'Magneet nodig ↓', Math.PI);
}

// ---------- 3. de fabriekshoop: a dead factory, Vonk brings it back ----------
const FT = HEAPS.fabriek[3];
export const VONKJE_AT = V3(32, 0, 14.5);
VONKJE_AT.y = gy(32, 14.5);
stand(32, 16.4, 1.6, 1.2, VONKJE_AT.y + 1.6, 0x6a7480, 0x4a525c, VONKJE_AT.y);      // the burnt-out transformer
// the hall: x 36..48, z -2..10, walls up to the roof at PLATEAU_H
{
  const wall = (x, z, w, d) => stand(x, z, w, d, PLATEAU_H - 0.6, 0x7a6a62, 0x8a5a4a, FT);
  wall(42, -2, 12.6, 0.6); wall(35.7, 4, 0.6, 12.6); wall(48.3, 4, 0.6, 12.6);
  wall(37.9, 10, 4.8, 0.6); wall(46.1, 10, 4.8, 0.6);
  block(42, PLATEAU_H - 0.3, 4, 13.2, 0.6, 12.6, 0x6a6a72, 0x5a5a62);
  label('FABRIEK', 42, PLATEAU_H - 2, 10.35, 4);
  // windows
  for (const x of [38, 46]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.2), winOff); w.position.set(x, FT + 4.5, 10.32); scene.add(w); }
}
// the gate in the south wall sinks into the floor
{
  const p = powerBox('poort', 39, 12.4, 0);
  const door = block(42, FT + 2.5, 10, 3.6, 5, 0.6, 0x7a8a96, 0x5a6470);
  poweredLift(p, door, 42, 10, FT + 5, FT - 0.4, 5);
}
// inside: the fan blows you up to a shelf on the west wall
export const FAN = { x: 39, z: 1.5, top: FT + 4.2, on: false };
{
  const p = powerBox('ventilator', 41, 7.4, Math.PI, FT);
  const g = new THREE.Group(); g.position.set(FAN.x, FT, FAN.z); scene.add(g);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.15, 8, 24), toon(0x6a7480)); ring.rotation.x = Math.PI / 2; ring.position.y = 0.45; g.add(ring);
  FAN.blades = new THREE.Group(); FAN.blades.position.y = 0.4; g.add(FAN.blades);
  for (let i = 0; i < 4; i++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.4), toon(0x8a8a90)); bl.position.x = 0.6; bl.rotation.x = 0.4; const piv = new THREE.Group(); piv.rotation.y = (i / 4) * Math.PI * 2; piv.add(bl); FAN.blades.add(piv); }
  p.machines.push((on) => (FAN.on = on));
  block(37, FT + 3.75, 5.5, 2, 0.5, 3, 0x8a8a90, 0x5a5a62);
  addCookie(37, FT + 4.9, 5.5, 'In de wind van de ventilator');
}
// an old factory robot sitting against the east wall; give it power and it hands you something
export const ROBOT = { at: V3(46, FT, 1), name: 'De oude fabrieksrobot', parts: null, on: false };
{
  const p = powerBox('robot', 45.6, 6.4, Math.PI, FT);
  const r = new THREE.Group(); r.position.copy(ROBOT.at); r.rotation.y = -1.2; scene.add(r);
  const steel = toon(0x8a96a0), dark = toon(0x4a525c);
  const bodyM = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.6, 1.2), steel); bodyM.position.y = 1.4; addOutline(bodyM, 1.03); r.add(bodyM);
  const head = new THREE.Group(); head.position.set(0, 2.5, 0); r.add(head);
  const hm = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.7, 0.8), steel); addOutline(hm, 1.04); head.add(hm);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x2a2e34 });
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.CircleGeometry(0.12, 12), eyeMat); e.position.set(0.22 * s, 0.05, 0.41); head.add(e); }
  for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 1.6), dark); l.position.set(0.45 * s, 0.3, 0.7); r.add(l); }
  const arm = new THREE.Group(); arm.position.set(1.1, 2, 0); r.add(arm);
  const am = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.4, 0.35), dark); am.position.y = -0.7; arm.add(am);
  head.rotation.x = 0.5; head.rotation.z = 0.3;            // slumped
  solid(ROBOT.at.x, FT + 1.2, ROBOT.at.z, 2, 2.4, 1.6);
  ROBOT.parts = { head, arm, eyeMat };
  p.machines.push((on) => (ROBOT.on = on));
}
// the lift on the west side, up to the roof
{
  const p = powerBox('lift', 33.6, 8.6, -Math.PI / 2);
  const lift = block(33.9, FT - 0.25, 4, 3, 0.5, 3, 0xe0a03a, 0xc08a20);
  let on = false;
  lift.mover = { b: lift, delta: V3(), fn(t) {
    if (!on) return V3(33.9, FT - 0.25, 4);
    const c = (t * 0.1) % 1;
    const e = c < 0.2 ? 0 : c < 0.5 ? (c - 0.2) / 0.3 : c < 0.7 ? 1 : 1 - (c - 0.7) / 0.3;
    return V3(33.9, FT + (PLATEAU_H - FT) * e * e * (3 - 2 * e) - 0.25, 4);
  } };
  movers.push(lift.mover);
  p.machines.push((v) => (on = v));
  for (const [dx, dz] of [[-1.6, -1.6], [-1.6, 1.6]]) stand(33.9 + dx, 4 + dz, 0.2, 0.2, PLATEAU_H + 0.5, 0x5a5a62, 0x5a5a62, FT);
}
// the cable car: from the roof straight to the top of De Top
export const CABLE = { a: V3(42, PLATEAU_H, -4.2), b: null, on: false };
{
  const [bx, bz] = towards('top', 42, 4, CLIFF_R - 2.2);
  CABLE.b = V3(bx, PLATEAU_H, bz);
  const p = powerBox('kabelbaan', 46.5, -0.5, 0, PLATEAU_H);
  const { a, b } = CABLE, L = a.distanceTo(b), CY = PLATEAU_H + 4.6;
  // pylons and the cable
  for (const [x, z, y0] of [[a.x + 2.6, a.z, FT], [b.x + 2.4, b.z, PLATEAU_H], [(a.x + b.x) / 2 + 2.6, (a.z + b.z) / 2, -8]]) {
    stand(x, z, 0.8, 0.8, CY + 0.4, 0xf0b030, 0xc08a20, y0);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(3, 0.3, 0.3), craneMat); arm.position.set(x - 1.3, CY + 0.25, z); scene.add(arm);
  }
  const cab = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 5), cableMat);
  cab.position.set((a.x + b.x) / 2, CY, (a.z + b.z) / 2); cab.scale.y = L; cab.quaternion.setFromUnitVectors(V3(0, 1, 0), b.clone().sub(a).normalize()); scene.add(cab);
  // the gondola: an open floor with railings, hanging from the cable on one arm
  const gon = block(a.x, PLATEAU_H - 0.15, a.z, 3, 0.3, 3, 0xd05a48, 0xb0443a);
  for (const [dx, dz, w, d] of [[0, -1.45, 3, 0.1], [0, 1.45, 3, 0.1], [1.45, 0, 0.1, 3]]) { const r = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, d), toon(0xb0443a)); r.position.set(dx, 1, dz); gon.mesh.add(r); }
  const hang = new THREE.Mesh(new THREE.BoxGeometry(0.15, CY - PLATEAU_H, 0.15), toon(0x3a3a42)); hang.position.set(1.45, (CY - PLATEAU_H) / 2, 0); gon.mesh.add(hang);
  let k = 0, dir = 1, wait = 2, last = 0;
  gon.mover = { b: gon, delta: V3(), fn(t) {
    const dt = Math.min(0.05, last ? t - last : 0); last = t;
    if (CABLE.on && !CABLE.hold) {
      if (wait > 0) wait -= dt;
      else { k += dir * dt * 3.2 / L; if (k >= 1 || k <= 0) { k = Math.max(0, Math.min(1, k)); dir = -dir; wait = 2.5; } }
    }
    const e = k * k * (3 - 2 * k);
    return V3(a.x + (b.x - a.x) * e, PLATEAU_H - 0.15, a.z + (b.z - a.z) * e);
  } };
  movers.push(gon.mover);
  p.machines.push((on) => (CABLE.on = on));
  // only reachable by jumping up off the moving gondola
  addCookie((a.x + b.x) / 2, PLATEAU_H + 2.7, (a.z + b.z) / 2, 'Boven de kabelbaan');
}
junk(42, 4, 17, 30);

// ---------- 4. de autohoop: car wrecks, a press, a tower of tyres ----------
const AT = HEAPS.auto[3];
const car = (x, z, yaw, col, y0) => {
  const g = new THREE.Group(); g.position.set(x, y0, z); g.rotation.y = yaw; scene.add(g);
  const b = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.1, 1.8), toon(col)); b.position.y = 0.55; b.castShadow = true; addOutline(b, 1.03); g.add(b);
  const c = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.8, 1.6), toon(col)); c.position.set(-0.3, 1.5, 0); addOutline(c, 1.03); g.add(c);
  for (const [wx, wz] of [[-1.1, -0.9], [1.1, -0.9], [-1.1, 0.9], [1.1, 0.9]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.2, 10), tyreMat); w.rotation.x = Math.PI / 2; w.position.set(wx, 0.3, wz); g.add(w); }
  solid(x, y0 + 0.95, z, Math.abs(Math.cos(yaw)) * 3.4 + Math.abs(Math.sin(yaw)) * 1.8, 1.9, Math.abs(Math.sin(yaw)) * 3.4 + Math.abs(Math.cos(yaw)) * 1.8);
};
for (const [x, z, yaw, col] of [[-27, -47, 0.3, 0x5a8ad0], [-34, -56, 1.4, 0x5aa070], [-27, -61, 2.2, 0xf0c050], [-38, -44, 0.8, 0xd05a48]]) car(x, z, yaw, col, gy(x, z));
// de pers: an old press that still stamps. The cookie lies on the anvil underneath.
export const PRESS = { x: -33, z: -48, head: null, falling: false };
{
  const { x, z } = PRESS, y0 = AT;
  stand(x, z, 2.2, 2.2, y0 + 0.6, 0x5a5a62, 0x3a3a42, y0);
  for (const [dx, dz] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) stand(x + dx, z + dz, 0.4, 0.4, y0 + 7.2, 0xe0a03a, 0xc08a20, y0);
  block(x, y0 + 7.4, z, 3.8, 0.4, 3.8, 0xe0a03a, 0xc08a20);
  const head = block(x, y0 + 6.4, z, 2.6, 1.2, 2.6, 0x8a8a90, 0x5a5a62);
  // up for 2s, slams down, waits, rises again
  head.mover = { b: head, delta: V3(), fn(t) {
    const c = (t % 4.2) / 4.2, top = y0 + 6.4, bottom = y0 + 1.2;
    let y;
    if (c < 0.5) y = top;
    else if (c < 0.56) y = top + (bottom - top) * ((c - 0.5) / 0.06) ** 2;
    else if (c < 0.74) y = bottom;
    else y = bottom + (top - bottom) * ((c - 0.74) / 0.26);
    PRESS.falling = c >= 0.5 && c < 0.74;
    return V3(x, y, z);
  } };
  movers.push(head.mover); PRESS.head = head;
  addCookie(x, y0 + 1.3, z, 'Onder de pers');
}
// de bandentoren
{
  const x = -37, z = -59, g0 = gy(x, z);
  tyre(x + 2.4, z, g0);
  stand(x, z, 1.8, 1.8, g0 + 4.8, 0x6a5a4e, 0x4a3e38, g0);
  for (let y = g0; y < g0 + 4.6; y += 0.7) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.32, 8, 16), tyreMat); r.rotation.x = Math.PI / 2; r.position.set(x, y + 0.35, z); scene.add(r); }
  addCookie(x, g0 + 5.7, z, 'Op de bandentoren');
}
junk(-30, -52, 17, 40);
// the long iron bridge to De Top
const IRON_A = towards('auto', 24, -74, 7), IRON_B = towards('top', -30, -52, 16.5);
const IRON = bridge(IRON_A, IRON_B, { top: 0x8a96a0, side: 0x5a6470, rails: 0xc0443a, width: 2.4 });
sign(IRON_A[0], IRON_A[1] + 1.5, 'De Top →', -1.2);

// ---------- 5. De Top ----------
// tyres at the foot of the cliff, where the iron bridge arrives
{
  const side = V3(IRON_B[1] - HEAPS.top[1], 0, HEAPS.top[0] - IRON_B[0]).normalize();
  for (const s of [-1, 1]) {
    const [x, z] = towards('top', IRON_B[0] + side.x * 3 * s, IRON_B[1] + side.z * 3 * s, CLIFF_R + 1.3);
    tyre(x, z, gy(x, z), 20);
  }
}
for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; junk(24 + Math.cos(a) * 20, -74 + Math.sin(a) * 20, 5, 9, null, 1.3); }
for (const [a, col] of [[0.6, 'red'], [2.4, 'blue'], [3.7, 'green'], [5.2, 'orange']]) {
  const [x, z] = [24 + Math.cos(a) * 20, -74 + Math.sin(a) * 20], g0 = gy(x, z);
  if (g0 > 0) container(x, z, 2.6, 2.6, g0 + 2.4, col, g0);
}

// ---------- checkpoints ----------
export const FLAGS = [[-36, 6], [40, 13.5], [ISLANDS[2][0] + 3.2, ISLANDS[2][1] + 3.4], [-8, -3], [-28, -50], [...towards('top', -30, -52, 18)], [...towards('top', 42, 4, CLIFF_R - 1)]].map(([x, z]) => {
  const p = V3(x, gy(x, z), z);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4), toon(0x3a3e4e)); pole.position.set(p.x, p.y + 1.2, p.z); scene.add(pole);
  const mat = new THREE.MeshBasicMaterial({ color: 0x9a948a, side: THREE.DoubleSide });
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), mat); cloth.position.set(p.x + 0.45, p.y + 2.1, p.z); scene.add(cloth);
  lamps.push({ wave: cloth });
  return { pos: p, mat };
});

// ---------- dust in the air, and junk mountains on the horizon ----------
export const dust = (() => {
  const n = 600, pos = new Float32Array(n * 3), colA = new Float32Array(n * 3), palette = [[1, 0.8, 0.55], [0.9, 0.6, 0.4], [1, 0.9, 0.7]];
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (hr() - 0.5) * 140; pos[i * 3 + 1] = hr() * 24; pos[i * 3 + 2] = -100 + hr() * 160;
    colA.set(palette[i % 3], i * 3);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(colA, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.12, vertexColors: true, transparent: true, opacity: 0.7, depthWrite: false }));
  scene.add(p); return p;
})();
{
  const mat = toon(0x7a5040);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2, d = 120 + hr() * 30, h = 18 + hr() * 30;
    const m = new THREE.Mesh(new THREE.ConeGeometry(14 + hr() * 14, h, 6), mat); m.position.set(Math.cos(a) * d, h / 2 - 8, Math.sin(a) * d - 20); m.rotation.y = hr() * 3; scene.add(m);
  }
}
buildJunk();

// ---------- het wrakschip: an island between the factory and De Top, right under the cable car ----------
// Oil drums float out to it, but they sink if you stand on one too long: keep hopping. They come back up after.
export const SINKERS = [];
function sinker(x, z, col) {
  const s = { load: 0, x, z };
  const b = block(x, -0.45, z, 1.6, 1.5, 1.6, col, 0x2a2628);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.06, 14), toon(0xf0b030)); lid.position.y = 0.76; b.mesh.add(lid);
  s.lid = lid.material; s.b = b;
  b.mover = { b, delta: V3(), fn(t) {
    const sunk = Math.max(0, Math.min(1, (s.load - 0.55) / 0.6));   // after ~half a second it starts going under
    const wob = s.load > 0.3 ? Math.sin(t * 30) * 0.05 : Math.sin(t * 2 + x) * 0.05;   // shakes when it's about to go
    return V3(x, -0.45 - sunk * 2.4 + wob, z);
  } };
  movers.push(b.mover); SINKERS.push(s);
  return s;
}
export const WRECK = ISLANDS[2];
{
  const [ix, iz] = WRECK;
  const from = towards('fabriek', ix, iz, 17.2), to = edge(WRECK, from);
  stones(from, to, 6, (x, z, i) => sinker(x + (i % 2 ? 0.8 : -0.8), z, [0x3a6ab0, 0xc0443a, 0x3a8a5a, 0xe0a03a, 0x3a6ab0, 0xc0443a][i - 1]));
  sign(from[0] - 1.2, from[1] - 1, 'Vaten zinken! Niet blijven staan', 0, gy(from[0] - 1.2, from[1] - 1));
  // the ship: a rusty hull half in the oil, tilted, with the bridge tower at the back
  const ship = new THREE.Group(); ship.position.set(ix, 0, iz); scene.add(ship);   // kept straight: collision boxes can't turn
  const at = (lx, lz) => { const v = ship.localToWorld(V3(lx, 0, lz)); return [v.x, v.z]; };
  const hullCol = [0x9a4a3a, 0x6a2a2a];
  for (const [lx, lz, w, d, top] of [[0, -1, 4.4, 7, 1.6], [0, 3.6, 3, 2.2, 1.2]]) { const [x, z] = at(lx, lz); stand(x, z, w, d, top, ...hullCol, -1.2); }
  // the bow sticks up out of the oil
  { const [x, z] = at(0, -5.6); const b = block(x, 1.2, z, 3, 3.6, 2.2, ...hullCol); b.mesh.rotation.x = 0.18; }
  // bridge tower: climb crates to its deck, a lifebuoy on the deck bounces you to the roof
  const [bx, bz] = at(0, 1.4);
  stand(bx, bz, 2.6, 2.6, 4.2, 0xe8e2d4, 0xb8b0a0, 1.6);
  for (let i = 0; i < 3; i++) { const w = block(bx - 1.31, 3.3, bz - 0.6 + i * 0.6, 0.02, 0.4, 0.4, 0x2a3a5a, 0x2a3a5a); w.mesh.material.forEach((m) => m.emissive && m.emissive.set(0x1a2a50)); }
  const [c1x, c1z] = at(1.9, 0.2), [c2x, c2z] = at(1.9, 1.6);
  stand(c1x, c1z, 1.3, 1.3, 2.6, 0xa07040, 0x8a5d34, 1.6);
  stand(c2x, c2z, 1.3, 1.3, 3.5, 0xa07040, 0x8a5d34, 1.6);
  const [rx, rz] = at(-0.7, 1.4);
  tyre(rx, rz, 4.2, 18).mesh.children[0].material = toon(0xf05a3a);   // a red lifebuoy
  // the roof: mast, a little crow's nest and the cosmic cookie
  const [mx, mz] = at(1.3, 1.4);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 5), toon(0x5a5450)); mast.position.set(mx, 6.7, mz); scene.add(mast);
  block(mx, 9.3, mz, 1.6, 0.3, 1.6, 0x8a7a6a, 0x5a4a40);
  addCookie(mx, 10.5, mz, 'Het kraaiennest van het wrakschip');
  addCookie(bx - 0.6, 5.2, bz);
  const [jx, jz] = at(-1.6, -2.5);
  crate(jx, jz, false, '', 1.6);
  junk(ix, iz, 5.5, 8, 0);
}

// ---------- gewone koekjes ----------
const onG = (x, z) => gy(x, z) + 0.9;
line([0, 0, 34], [0, 0, 24], 4, onG);
PLANKS.coins(6);
BELT.coins(6);
circle([-42, KT + 0.9, 4], 3, 6);
circle([W1[0], 0.9, W1[1]], 3, 6);
line([42, FT + 0.9, 8], [42, FT + 0.9, 0], 4);
line([-28, AT + 0.9, -48], [-24, AT + 0.9, -54], 3);
IRON.coins(8);
circle([24, PLATEAU_H + 0.9, -74], 9, 10);
for (const [x, z] of [[-8, 48], [-18, 30], [-50, 12], [36, 16], [-24, -58], [32, -86]]) crate(x, z);

// ---------- spawn, checkpoints, rocket ----------
export const SPAWN = V3(0, 0, 50);
export const ARENA_ENTRY = SPAWN.clone();
export const ARENA_POS = V3(ARENA.x, ARENA.y, ARENA.z);
export const CHECKPOINTS = FLAGS.map((f) => ({ test: (p) => Math.hypot(p.x - f.pos.x, p.z - f.pos.z) < 3 && Math.abs(p.y - f.pos.y) < 2, pos: f.pos }));
export const PLANET = 'schroot';
const { save } = getSave('schroot');
export const TRAVEL = {
  pos: V3(6, 0, 44),
  // the rocket only flies again once the stolen stuwkop is back
  locked: () => !save.boss && !window.TEST_MODE,
  lockedMsg: 'De raket mist zijn stuwkop. Fionn weet meer — zijn schuurtje staat links van de landingsplek.',
  dests: [
    { need: 12, planet: 'zon', name: 'de Zon', label: 'Opstijgen naar de Zon' },
    { need: 0, planet: 'bos', name: 'het Paddenstoelenbos', label: 'Terug naar het Paddenstoelenbos' },
    { need: 0, planet: 'berg', name: 'de Bergwereld', label: 'Terug naar de Bergwereld' },
    { need: 0, planet: 'mistmaan', name: 'de Mistmaan', label: 'Terug naar de Mistmaan' },
  ],
};
