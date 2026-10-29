import { THREE, scene, toon, addOutline, V3, label } from './core.js?v=sub1';
import { addCookie, line, circle } from './cookies.js?v=sub1';
import { groundAt, kindAt, PAL, ISLANDS, PLATEAU_H, ARENA } from './bos-terrain.js?v=sub1';
import * as sfx from './sfx.js?v=sub1';

// ---------- glowing dusk: dark violet sky, everything else gives off light ----------
scene.fog = new THREE.FogExp2(0x2a1a48, 0.0095);
const hemi = scene.children.find((o) => o.isHemisphereLight);
hemi.color.setHex(0x9a8cff); hemi.groundColor.setHex(0x2a4a3a); hemi.intensity = 1.35;
const sunL = scene.children.find((o) => o.isDirectionalLight);
sunL.color.setHex(0xc8b0ff); sunL.intensity = 1.0;

export const boxes = [];
export const movers = [];
export const lamps = [];
export const crates = [];
export const ghosts = [];
export const winOn = new THREE.MeshBasicMaterial({ color: 0xffc46b });
export const winOff = new THREE.MeshBasicMaterial({ color: 0x4a5a70 });
export const fogMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, depthWrite: false });
const edgeMat = new THREE.LineBasicMaterial({ color: 0x1a1030, transparent: true, opacity: 0.5 });

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
// solid rock between two heights (tunnel roofs)
const roof = (x0, x1, z0, z1, y0, y1) =>
  block((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, PAL[2][0], PAL[1][1], {}, false);
let hs = 9;
const hr = () => ((hs = (hs * 16807) % 2147483647) / 2147483647);
const gy = (x, z) => { const g = groundAt(x, z, 0); return g === -Infinity ? -1.2 : g; };

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

// ---------- mushrooms ----------
const CAPS = { pink: [0xff7ab6, 0x4a1030], teal: [0x3fd6c8, 0x0a3a38], orange: [0xffa24a, 0x4a2000], violet: [0xa06bff, 0x2a1060], blue: [0x6fa8ff, 0x10204a], lime: [0xb6e36b, 0x203a08] };
const stalkMat = toon(0xe8dcc8); stalkMat.emissive.set(0x1a1420);
const spotMat = new THREE.MeshBasicMaterial({ color: 0xfff6e0 });
const capMats = {};
const capMat = (c) => capMats[c] || (capMats[c] = (() => { const m = toon(CAPS[c][0]); m.emissive.set(CAPS[c][1]); return m; })());
const stalkGeo = new THREE.CylinderGeometry(1, 1.15, 1, 10); stalkGeo.translate(0, -0.5, 0);
const CAP_GEO = new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), RIM_GEO = new THREE.CylinderGeometry(1, 0.92, 0.25, 18), SPOT_GEO = new THREE.CircleGeometry(1, 10);
// the dome peaks at the group origin, so a cap at height y looks like you stand on its top
function capVisual(r, color, spots = true, flat = 0.35) {
  const g = new THREE.Group();
  const cap = new THREE.Mesh(CAP_GEO, capMat(color));
  cap.scale.set(r, flat * r, r); cap.position.y = -flat * r; cap.castShadow = true; addOutline(cap, 1.04); g.add(cap);
  const rim = new THREE.Mesh(RIM_GEO, capMat(color)); rim.scale.set(r, 1, r); rim.position.y = -flat * r; g.add(rim);
  if (spots) for (let i = 0; i < 5; i++) {
    const a = hr() * Math.PI * 2, d = r * (0.25 + hr() * 0.5);
    const s = new THREE.Mesh(SPOT_GEO, spotMat); s.scale.setScalar(r * 0.12);
    s.position.set(Math.cos(a) * d, -flat * r + flat * r * Math.sqrt(1 - (d / r) ** 2) + 0.03, Math.sin(a) * d);
    s.lookAt(s.position.x * 3, 10, s.position.z * 3); g.add(s);
  }
  g.userData.rim = -flat * r;
  return g;
}
// a static mushroom you can stand on (top = height of its walkable cap)
export function shroom(x, z, top, r, { color = 'pink', bounce = 0, base = null, light = false, collide = true } = {}) {
  const y0 = base ?? gy(x, z);
  const g = capVisual(r, color); g.position.set(x, top, z); scene.add(g);
  const st = new THREE.Mesh(stalkGeo, stalkMat); st.scale.set(r * 0.22, Math.max(0.05, top + g.userData.rim - y0), r * 0.22); st.position.y = g.userData.rim; st.castShadow = true; g.add(st);
  if (light) { const l = new THREE.PointLight(CAPS[color][0], 6, r * 5, 2); l.position.y = -1; g.add(l); lamps.push({ flicker: l, base: 6, seed: x + z }); }
  if (!collide) return { g };
  const b = solid(x, top - 0.3, z, r * 1.6, 0.6, r * 1.6, { bounce });
  b.mesh = g;
  if (top - 0.6 - y0 > 0.8) solid(x, (y0 + top - 0.6) / 2, z, r * 0.5, top - 0.6 - y0, r * 0.5);
  if (bounce) b.squish = g;
  return b;
}

// a mushroom (or a woeker root) that grows and shrinks; set(true/false) moves it to its high/low height
export function grower(x, z, low, high, r, { color = 'teal', inv = false, base = null, root = false, speed = 5 } = {}) {
  const y0 = base ?? gy(x, z);
  const it = { k: inv ? 1 : 0, target: inv ? 1 : 0, inv, low, high, y0, last: 0 };
  // the box's centre sits hh below its top; the visuals hang from the top, so they're shifted up by hh
  const hh = root ? 2.2 : 0.3;
  const g = new THREE.Group();
  if (root) {
    const inner = new THREE.Group(); inner.position.y = hh; g.add(inner);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.7, r, 4.4, 7), capMat('violet'));
    m.position.y = -2.2; m.castShadow = true; addOutline(m, 1.05); inner.add(m);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(r * 0.7, 1.2, 7), capMat('violet')); tip.position.y = 0.6; inner.add(tip);
  } else {
    const vis = capVisual(r, color); vis.position.y = hh; g.add(vis);
    it.stalk = new THREE.Mesh(stalkGeo, stalkMat); it.stalk.scale.set(r * 0.22, 1, r * 0.22); it.stalk.position.y = vis.userData.rim; vis.add(it.stalk); it.rim = vis.userData.rim;
  }
  g.position.set(x, low - hh, z);
  scene.add(g);
  const b = { pos: V3(x, low - hh, z), half: V3(r * 0.8, hh, r * 0.8), min: V3(), max: V3(), mesh: g };
  syncBox(b); boxes.push(b);
  it.b = b;
  b.mover = { b, delta: V3(), fn(t) {
    const dt = Math.min(0.05, it.last ? t - it.last : 0); it.last = t;
    const dir = Math.sign(it.target - it.k);
    it.k = Math.max(0, Math.min(1, it.k + dir * dt * speed / Math.max(1, high - low)));
    const e = it.k * it.k * (3 - 2 * it.k);
    const y = low + (high - low) * e;
    if (it.stalk) it.stalk.scale.y = Math.max(0.05, y + it.rim - y0);
    return V3(x, y - hh, z);
  } };
  movers.push(b.mover);
  return it;
}
// goal: where the grown path leads, so the knop cutscene can show it
export function group(items = [], goal = null) {
  return { items, goal, on: false, set(on) { this.on = on; for (const it of this.items) it.target = on !== it.inv ? 1 : 0; } };
}
// a spore button: land on it (jump on it, or a ground pound) to flip its group
export function knop(x, z, grp, { y = null, onPress = null, color = 0xff7ab6 } = {}) {
  const g0 = y ?? gy(x, z);
  const base = block(x, g0 + 0.2, z, 1.8, 0.4, 1.8, 0x5a4a62, 0x3a2e46);
  const capM = toon(color); capM.emissive.set(0x3a0a28);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.75, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), capM);
  cap.scale.y = 0.6; cap.position.y = 0.2; addOutline(cap, 1.08); base.mesh.add(cap);
  const light = new THREE.PointLight(color, 3, 6, 2); light.position.y = 1; base.mesh.add(light);
  const k = { id: knoppen.length, base, cap, capM, light, t: 0, grp, color, pos: V3(x, g0, z) };
  base.onLand = () => {
    if (k.t > 0) return;
    k.t = 0.5; cap.scale.y = 0.2; sfx.click(!grp || !grp.on);
    if (onPress) onPress(k); else { grp.set(!grp.on); sfx.grow(grp.on); if (knopHook.show) knopHook.show(k); }
    k.refresh();
  };
  k.refresh = () => { const on = grp && grp.on; capM.color.setHex(on ? 0x7dff9a : color); capM.emissive.setHex(on ? 0x0a4a1a : 0x3a0a28); light.color.setHex(on ? 0x7dff9a : color); };
  knoppen.push(k);
  return k;
}
export const knoppen = [];
export const knopHook = { show: null };   // the story shows what a knop changes, the first time you press it
export function updateKnoppen(dt) {
  for (const k of knoppen) { k.t -= dt; k.cap.scale.y += (0.6 - k.cap.scale.y) * Math.min(1, dt * 8); }
}
// a platform that only exists for a glowing Josh (Gloei)
const ghostMat = new THREE.MeshBasicMaterial({ color: 0x7af5ff, transparent: true, opacity: 0, depthWrite: false });
export function ghostPad(x, y, z, r = 1.2) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.8, 0.35, 16), ghostMat.clone());
  m.position.set(x, y - 0.18, z); scene.add(m);
  const b = solid(x, y - 0.18, z, r * 1.6, 0.36, r * 1.6, { ghost: true });
  b.mesh = m; b.pos = m.position; syncBox(b);
  ghosts.push(b);
  return b;
}

// ---------- props ----------
const glowMat = (c) => new THREE.MeshBasicMaterial({ color: c });
function sign(x, z, text, yaw = 0) {
  const g = gy(x, z);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.2), toon(0x5e3d22)); post.position.set(x, g + 1.1, z); scene.add(post);
  label(text, x, g + 2.4, z, 2.6).rotation.y = yaw;
}
// decoration: one instanced mesh per colour (plus one for the stalks), so hundreds of them cost a handful of draw calls
const tinyCapGeo = new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
function tinyShrooms(cx, cz, rad, n, y = null) {
  const per = {}, stalks = [], o = new THREE.Object3D();
  for (let i = 0; i < n; i++) {
    const a = hr() * Math.PI * 2, d = hr() * rad, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
    const g = y ?? groundAt(x, z, 0); if (g === -Infinity) continue;
    const c = Object.keys(CAPS)[Math.floor(hr() * 6)], s = 0.2 + hr() * 0.35;
    (per[c] = per[c] || []).push([x, g + s * 1.3, z, s]);
    stalks.push([x, g + s * 1.3, z, s]);
  }
  const build = (geo, mat, list, sc) => {
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach(([x, top, z, s], i) => { o.position.set(x, top + sc(s)[3], z); o.scale.set(...sc(s).slice(0, 3)); o.updateMatrix(); im.setMatrixAt(i, o.matrix); });
    im.computeBoundingSphere(); scene.add(im);
  };
  for (const c in per) build(tinyCapGeo, capMat(c), per[c], (s) => [s, s * 0.35, s, -s * 0.35]);
  if (stalks.length) build(stalkGeo, stalkMat, stalks, (s) => [s * 0.25, s * 1.3, s * 0.25, -s * 0.35]);
}

// ---------- de landingsplek ----------
export const rocket = new THREE.Group();
{
  const r = rocket; r.position.set(6, 0, 44); r.rotation.y = -0.4;
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
// de grote hoed: a huge, very low mushroom. Only something tiny fits underneath.
{
  const x = -12, z = 50;
  const g = capVisual(3.6, 'orange', true, 0.2); g.position.set(x, 1.95, z); scene.add(g);
  const st = new THREE.Mesh(stalkGeo, stalkMat); st.scale.set(0.7, 1.25, 0.7); st.position.y = -0.7; g.add(st);
  solid(x, 1.55, z, 7.2, 0.7, 7.2);
  solid(x, 0.6, z, 1.3, 1.2, 1.3);
  const l = new THREE.PointLight(0xffa24a, 4, 6, 2); l.position.set(x + 2, 0.5, z); scene.add(l);
}
addCookie(-10, 0.55, 50, 'Onder de grote hoed');
for (const [x, z, t, r, c] of [[14, 52, 3.2, 1.6, 'teal'], [18, 38, 4.5, 2, 'violet'], [-20, 38, 3.6, 1.7, 'blue'], [-4, 55, 2.6, 1.3, 'pink'], [20, 48, 2.2, 1.1, 'lime']]) shroom(x, z, t, r, { color: c, light: c === 'violet' });
tinyShrooms(0, 44, 20, 50);
sign(-2, 32, '↑ Moeras · ← Dorpje · → Wortelheuvel');

// ---------- Lars' dorpje ----------
shroom(-40, 20, 1.0, 1.8, { color: 'pink', bounce: 18 });
shroom(-44, 15, 4.5, 2.4, { color: 'teal' });
shroom(-49, 10.5, 6.8, 2.4, { color: 'orange' });
shroom(-48.5, 4, 8.5, 2, { color: 'blue' });
// the deck between the caps, and Lars' mushroom house
block(-56, 9.6, -1, 12, 0.8, 14, 0xa07a50, 0x6b4a30);
for (const [x, z] of [[-61.5, -7.5], [-50.5, -7.5], [-61.5, 5.5], [-50.5, 5.5]]) {
  const p = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 9.2), stalkMat); p.position.set(x, 4.6, z); scene.add(p);
}
export const LARS_HOUSE = V3(-59, PLATEAU_H, -3);
{
  const h = LARS_HOUSE;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 2.6, 14), stalkMat); body.position.set(h.x, h.y + 1.3, h.z); body.castShadow = true; addOutline(body, 1.03); scene.add(body);
  const roofM = capVisual(2.8, 'pink'); roofM.position.set(h.x, h.y + 3.4, h.z); scene.add(roofM);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.2), toon(0x6b4a30)); door.position.set(h.x + 0.9, h.y + 0.6, h.z + 1.4); door.rotation.y = 0.55; scene.add(door);
  const win = new THREE.Mesh(new THREE.CircleGeometry(0.3, 12), winOn); win.position.set(h.x + 1.5, h.y + 1.7, h.z + 0.4); win.rotation.y = 1.3; scene.add(win);
  solid(h.x, h.y + 1.3, h.z, 3.2, 2.6, 3.2);
  const l = new THREE.PointLight(0xffc46b, 5, 7, 2); l.position.set(h.x + 1.8, h.y + 1.6, h.z + 0.8); scene.add(l);
}
// the knop on the deck grows a staircase of caps up to the lookout
const dorpGrp = group([
  grower(-57, -12, 0.3, 12.4, 1.7, { color: 'teal' }),
  grower(-61.5, -16, 0.3, 14.8, 1.7, { color: 'violet' }),
  grower(-58, -20.5, 0.3, 17.2, 1.7, { color: 'blue' }),
], V3(-62, 18.5, -25));
knop(-52, -5, dorpGrp, { y: PLATEAU_H });
shroom(-62, -25, 18.5, 2.6, { color: 'pink', bounce: 18, light: true });       // de uitkijk: a bouncy cap way up high
addCookie(-62, 33.2, -25, 'De hoogste hoed');
// de holle steel: a giant hollow stalk with a tiny hole at the bottom
{
  const x = -38, z = -6, w = 5, t = 0.6, ht = 9;
  const m = [0xe8dcc8, 0xcfc2ae];
  block(x, ht / 2, z - w / 2, w, ht, t, ...m, {}, false);                    // north
  block(x - w / 2, ht / 2, z, t, ht, w, ...m, {}, false);                    // west
  block(x + w / 2, ht / 2, z, t, ht, w, ...m, {}, false);                    // east
  block(x - 1.6, ht / 2, z + w / 2, 1.8, ht, t, ...m, {}, false);            // south, left of the hole
  block(x + 1.6, ht / 2, z + w / 2, 1.8, ht, t, ...m, {}, false);            // south, right of the hole
  block(x, (1.0 + ht) / 2, z + w / 2, 1.4, ht - 1.0, t, ...m, {}, false);    // above the hole
  shroom(x, z, ht + 0.6, 3.4, { color: 'violet', base: ht });
  const l = new THREE.PointLight(0xa06bff, 4, 5, 2); l.position.set(x, 1, z); scene.add(l);
  const hole = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.95), glowMat(0x1a1030)); hole.position.set(x, 0.48, z + w / 2 + t / 2 + 0.01); scene.add(hole);
}
addCookie(-38, 0.6, -6, 'In de holle steel');
// het kruinenpad: caps hopping north to the woekervlakte
for (const [x, z, top, r, c, bounce] of [[-53, -14, 10.4, 2.2, 'teal'], [-48, -20.5, 10.8, 2.2, 'orange'], [-50.5, -27.5, 10.2, 2.2, 'pink'], [-45, -33.5, 11, 2.2, 'blue'], [-47, -40.5, 10.4, 2.2, 'violet'], [-43, -46.5, 10.6, 2.2, 'teal'], [-55, -32, 11.5, 1.8, 'lime']]) shroom(x, z, top, r, { color: c, bounce });
crate(-55, -32, true, 'Krat op de kruinen', 11.5);
for (const [x, z, t, r, c] of [[-62, 24, 6, 2.6, 'violet'], [-34, 26, 3.5, 1.6, 'pink'], [-64, -44, 7, 2.8, 'blue'], [-36, -30, 5, 2, 'orange'], [-60, 12, 3, 1.5, 'lime']]) shroom(x, z, t, r, { color: c, light: c === 'violet' || c === 'blue' });
tinyShrooms(-48, 8, 16, 40, 0); tinyShrooms(-50, -36, 12, 30, 0);

// ---------- het giftige moeras ----------
const lily = toon(0x5fbf6e); lily.emissive.set(0x0a2a10);
const lilyGeo = new THREE.CylinderGeometry(1.3, 1.3, 0.25, 16, 1, false, 0.3, Math.PI * 2 - 0.6);
function lilyPad(x, z) {
  const m = new THREE.Mesh(lilyGeo, lily); m.position.set(x, -0.12, z); m.rotation.y = hr() * 6; m.receiveShadow = true; scene.add(m);
  solid(x, -0.2, z, 2.1, 0.4, 2.1);
}
function lilyLink(a, b) {
  const [ax, az, ar] = ISLANDS[a], [bx, bz, br] = ISLANDS[b];
  const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L;
  const s = ar - 0.4, e = L - br + 0.4, n = Math.max(1, Math.round((e - s) / 3.1));
  for (let i = 1; i < n; i++) lilyPad(ax + ux * (s + ((e - s) * i) / n), az + uz * (s + ((e - s) * i) / n));
}
for (const [a, b] of [[0, 1], [0, 2], [2, 3], [2, 4], [1, 4], [4, 5], [5, 7], [4, 6], [1, 8]]) lilyLink(a, b);
// het lichtpad: only a glowing Josh sees the way to the lonely island
{
  const [ax, az] = [-2, -38], [bx, bz, br] = ISLANDS[9];
  const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz);
  for (let i = 1; i <= 5; i++) { const k = (6 + (L - 6 - br) * (i / 6)) / L; ghostPad(ax + dx * k, 0, az + dz * k); }
}
addCookie(-21, 1, -31, 'Het lichtpad');
// knop 1: stairs of caps up the wall to the woekervlakte
const stairGrp = group([
  grower(-6, -41, 0.3, 2.2, 1.6, { color: 'teal' }),
  grower(-2, -44, 0.3, 4.4, 1.6, { color: 'orange' }),
  grower(2, -45.5, -1, 6.6, 1.6, { color: 'pink', base: -1.2 }),
  grower(6, -45, -1, 8.8, 1.6, { color: 'blue', base: -1.2 }),
], V3(8, 10, -50));
knop(-4, -35, stairGrp);
// knop 2: a ring of caps up to the giant water lily
const lilyGrp = group([
  grower(19.5, -30.5, -1, 2.4, 1.4, { color: 'lime', base: -1.2 }),
  grower(22, -27.5, -1, 4.8, 1.4, { color: 'teal', base: -1.2 }),
  grower(26, -29, -1, 7.2, 1.4, { color: 'violet', base: -1.2 }),
  grower(27, -33, -1, 9, 1.4, { color: 'pink', base: -1.2 }),
], V3(23, 10.5, -36));
knop(17, -23.5, lilyGrp);
shroom(23, -36, 10.5, 2, { color: 'lime', base: -1.2, light: true });
addCookie(23, 11.7, -36, 'Op de reuzenlelie');
// the dark lanterns for the Lichtjes challenge (lit by a glowing Josh)
export const LICHTJES = [[-14, -2], [11, -6], [4, -21], [14, -27], [-5, -36], [21, -40]].map(([x, z]) => V3(x, 0, z));
export const LICHTKEVER_AT = V3(3, 0, 6);
for (const [ix, iz, r] of ISLANDS) tinyShrooms(ix, iz, r - 0.8, Math.round(r * 2), 0);
for (const [x, z] of [[-10, -6], [12, -10], [0, -22], [-4, -40]]) shroom(x, z, 2.2 + hr() * 1.5, 1.1, { color: 'blue', collide: false });

// ---------- de wortelheuvel ----------
roof(28, 46, 20, 24, 3.5, PLATEAU_H);
roof(42, 46, -6, 20, 3.5, PLATEAU_H);
roof(32, 34, -18, 20, 1.0, PLATEAU_H);
roof(32, 40, -22, -18, 1.0, PLATEAU_H);
roof(26, 32, -12, -10, 1.0, PLATEAU_H);
{ // roots hanging over the tunnel mouth
  const m = new THREE.MeshBasicMaterial({ color: 0x6b4a30 });
  for (let i = 0; i < 6; i++) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.02, 1 + hr() * 1.2), m); r.position.set(27.8, 3.2 - hr() * 0.4, 20.6 + i * 0.6); scene.add(r); }
  label('DE WORTELHEUVEL', 27.6, 4.4, 22, 3.2).rotation.y = -Math.PI / 2;
}
for (const [x, y, z, c] of [[30, 2.6, 22, 0x7dff9a], [40, 2.6, 22, 0xff7ab6], [44, 2.6, 8, 0x7dff9a], [44, 2.6, -4, 0x6fa8ff], [33, 0.6, 4, 0xb6e36b], [33, 0.6, -12, 0xb6e36b], [36, 0.6, -20, 0xffa24a]]) {
  const s = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), glowMat(c)); s.position.set(x, y, z); scene.add(s);
  const l = new THREE.PointLight(c, 3, 6, 2); l.position.set(x, y, z); scene.add(l);
}
addCookie(36, 0.55, -20, 'Diep in de wortels');
line([33, 0.5, 16], [33, 0.5, -14], 6);
export const RUPS_AT = V3(24, 0, 25);
// the open cave: its knop grows caps up to a ledge in the wall
const caveGrp = group([
  grower(50, -8, 0.3, 2.2, 1.6, { color: 'orange' }),
  grower(53.5, -11, 0.3, 4.4, 1.6, { color: 'pink' }),
  grower(56.5, -8.5, 0.3, 6.6, 1.6, { color: 'teal' }),
], V3(60.5, 8, -12.8));
knop(49, 4, caveGrp);
addCookie(60.5, 9, -12.8, 'De groeiende grot');
shroom(58, 4, 3, 1.6, { color: 'blue', light: true });
tinyShrooms(54, -3, 7, 20, 0);
// up on the hill
for (const [x, z, t, r, c] of [[38, 10, 14, 2.2, 'orange'], [60, 22, 13.5, 2, 'teal'], [36, -16, 13, 1.8, 'pink']]) shroom(x, z, t, r, { color: c });
tinyShrooms(52, 22, 6, 24, PLATEAU_H);

// ---------- de omgevallen stam over het ravijn ----------
{
  const bark = toon(0x6b4a30), inner = toon(0xd9b98a);
  const log = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, 31, 14), bark); log.rotation.x = Math.PI / 2; log.position.set(48, 8.7, -36); log.castShadow = true; addOutline(log, 1.02); scene.add(log);
  for (const z of [-20.5, -51.5]) { const e = new THREE.Mesh(new THREE.CircleGeometry(1.6, 14), inner); e.position.set(48, 8.7, z); e.rotation.y = z > -36 ? 0 : Math.PI; scene.add(e); }
  solid(48, 9, -36, 2.8, 2, 31);
  // a broken branch sticking up: Lars' hat got stuck on top
  const br = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.55, 2.4, 8), bark); br.position.set(50.2, 11, -29); br.rotation.z = -0.25; addOutline(br, 1.05); scene.add(br);
  solid(50.3, 11, -29, 1.1, 2, 1.1);
  // a shelf fungus under the log, and a bouncy cap to get back up
  const shelf = capVisual(1.8, 'orange', true, 0.25); shelf.position.set(53, 5.1, -40); scene.add(shelf);
  solid(53, 4.7, -40, 3, 0.6, 3);
  shroom(53.5, -44.5, 5.6, 1.4, { color: 'pink', bounce: 19, base: -6 });
  for (const [x, z] of [[46.4, -26], [49.6, -44], [46.6, -33]]) shroom(x, z, 10.6, 0.5, { color: 'teal', base: 9.5, collide: false });
}
export const HAT_AT = V3(50.3, 12.6, -29);
addCookie(53, 5.9, -39.5, 'Onder de stam');
line([48, 10.9, -23], [48, 10.9, -49], 7);

// ---------- de woekervlakte ----------
// de woekerwortels: a cage of purple roots; the knop nearby pulls them into the ground
{
  const c = V3(58, PLATEAU_H, -72), roots = [];
  for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; roots.push(grower(c.x + Math.cos(a) * 2.6, c.z + Math.sin(a) * 2.6, PLATEAU_H - 4.6, PLATEAU_H + 4.4, 0.9, { root: true, inv: true, speed: 6 })); }
  const g = group(roots); g.set(false);
  knop(44, -64, g, { color: 0xa06bff });
  addCookie(c.x, c.y + 1.2, c.z, 'Achter de woekerwortels');
}
const woek = capMat('violet');
for (let i = 0; i < 26; i++) {
  const x = -36 + hr() * 100, z = -50 - hr() * 52;
  if (Math.hypot(x - ARENA.x, z - ARENA.z) < ARENA.r + 2 || Math.hypot(x - 58, z + 72) < 5 || Math.hypot(x - 44, z + 64) < 3 || (x > 44 && x < 52 && z > -56)) continue;
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.6 + hr() * 1.4, 10, 8), woek); b.position.set(x, PLATEAU_H, z); b.scale.y = 0.5; addOutline(b, 1.05); scene.add(b);
}
for (const [x, z, t, r] of [[-30, -60, 15, 2.4], [-14, -74, 13, 2], [36, -60, 14, 2.2], [62, -90, 17, 3], [-34, -92, 16, 2.6]]) shroom(x, z, t, r, { color: 'violet', light: true, collide: false });
tinyShrooms(-20, -58, 12, 25, PLATEAU_H);

// ---------- checkpoints ----------
export const FLAGS = [V3(-54, PLATEAU_H, 3), V3(-12, 0, -2), V3(52, 0, 2), V3(-34, PLATEAU_H, -54), V3(48, PLATEAU_H, -55), V3(12, PLATEAU_H, -66)].map((p) => {
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4), toon(0x3a3e4e)); pole.position.set(p.x, p.y + 1.2, p.z); scene.add(pole);
  const mat = new THREE.MeshBasicMaterial({ color: 0x9a948a, side: THREE.DoubleSide });
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), mat); cloth.position.set(p.x + 0.45, p.y + 2.1, p.z); scene.add(cloth);
  lamps.push({ wave: cloth });
  return { pos: p, mat };
});

// ---------- floating spores ----------
export const dust = (() => {
  const n = 900, pos = new Float32Array(n * 3), colA = new Float32Array(n * 3), palette = [[1, 0.5, 0.8], [0.5, 1, 0.9], [0.8, 1, 0.5], [0.7, 0.6, 1]];
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (hr() - 0.5) * 140; pos[i * 3 + 1] = hr() * 22; pos[i * 3 + 2] = -100 + hr() * 160;
    const c = palette[i % 4]; colA.set(c, i * 3);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(colA, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.16, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false }));
  scene.add(p); return p;
})();
// stars in the violet sky
{
  const n = 400, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const a = hr() * Math.PI * 2, e = 0.15 + hr() * 1.2, d = 180; pos.set([Math.cos(a) * Math.cos(e) * d, Math.sin(e) * d, Math.sin(a) * Math.cos(e) * d - 20], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 0.8, fog: false })));
}

// ---------- gewone koekjes ----------
const onG = (x, z) => gy(x, z) + 0.9;
line([0, 0, 38], [0, 0, 16], 5, onG);
line([-14, 0, 39], [-34, 0, 27], 5, onG);
line([14, 0, 39], [24, 0, 25], 4, onG);
line([30, 0, 22], [40, 0, 22], 4, onG);
line([44, 0, 16], [44, 0, -2], 5, onG);
circle([-12, 0.9, -4], 3, 6); circle([16, 0.9, -26], 3, 6); circle([-2, 0.9, -38], 4, 8);
circle([-56, PLATEAU_H + 0.9, 0], 3.5, 8);
for (const [x, z, t] of [[-53, -14, 10.4], [-50.5, -27.5, 10.2], [-47, -40.5, 10.4]]) addCookie(x, t + 0.9, z);
line([-30, PLATEAU_H + 0.9, -56], [0, PLATEAU_H + 0.9, -62], 8);
line([48, PLATEAU_H + 0.9, -56], [24, PLATEAU_H + 0.9, -66], 6);
circle([-46, 0.9, 6], 3, 6);
for (const [x, z] of [[-18, 46], [22, 44], [-60, -50], [40, -80]]) crate(x, z);

// ---------- spawn, checkpoints, rocket ----------
export const SPAWN = V3(0, 0, 50);
export const ARENA_ENTRY = SPAWN.clone();
export const ARENA_POS = V3(ARENA.x, ARENA.y, ARENA.z);
export const CHECKPOINTS = FLAGS.map((f) => ({ test: (p) => Math.hypot(p.x - f.pos.x, p.z - f.pos.z) < 3 && Math.abs(p.y - f.pos.y) < 2, pos: f.pos }));
export const PLANET = 'bos';
export const TRAVEL = { pos: V3(6, 0, 44), dests: [
  { need: 12, planet: 'schroot', name: 'de Schroothoop', label: 'Opstijgen naar de Schroothoop' },
  { need: 0, planet: 'berg', name: 'de Bergwereld', label: 'Terug naar de Bergwereld' },
  { need: 0, planet: 'mistmaan', name: 'de Mistmaan', label: 'Terug naar de Mistmaan' },
] };
