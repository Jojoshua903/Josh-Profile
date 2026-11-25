import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { CART } from './data.js?v=20261126a';
import { TEAM_COLOR } from './units.js?v=20261126a';

// Payload: a tug of war over a cart on the first lane. It starts in the middle; whichever team
// has it to itself pushes it toward the other base (more pushers, faster). Both teams near it
// stops it dead. Reach the enemy end to win; at the time limit the cart's side decides.

const tmp = new THREE.Vector3();

export function initCart(G) {
  const path = G.map.lanes[0].map(([x, z]) => new THREE.Vector3(x, 0, z));
  // the track runs from blue's end (p = 0) to red's end (p = 1); trim the bits inside each base
  const segs = [], total = path.slice(1).reduce((a, p, i) => { const l = p.distanceTo(path[i]); segs.push(l); return a + l; }, 0);
  const root = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x9c6a3f, roughness: 0.8 }), iron = new THREE.MeshStandardMaterial({ color: 0x2a2f3c, roughness: 0.5, metalness: 0.4 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.1, 3), wood); body.position.y = 1.05; body.castShadow = true;
  const rim = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, 3.2), iron); rim.position.y = 1.65;
  root.add(body, rim);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.2, 14), iron);
    w.rotation.z = Math.PI / 2; w.position.set(sx * 1.15, 0.45, sz * 1.05); w.name = 'wheel'; root.add(w);
  }
  // the cargo: a big glowing gem that takes the colour of whoever is pushing
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.75, 0), new THREE.MeshStandardMaterial({ color: 0xfff3c4, emissive: 0xffc93c, emissiveIntensity: 0.7, flatShading: true }));
  gem.position.y = 2.4; gem.scale.y = 1.3; root.add(gem);
  const zone = new THREE.Mesh(new THREE.RingGeometry(CART.radius - 0.25, CART.radius, 48), new THREE.MeshBasicMaterial({ color: 0xfff3c4, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }));
  zone.rotation.x = -Math.PI / 2; zone.position.y = 0.08; root.add(zone);
  G.scene.add(root);
  // a dotted rail along the whole track, plus a flag at each end
  const pts = []; for (let i = 0; i <= 120; i++) pts.push(pointAt(path, segs, total, i / 120).setY(0.07));
  const rail = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: 0x1d2340, dashSize: 0.6, gapSize: 0.5 }));
  rail.computeLineDistances(); G.scene.add(rail);
  for (const [p, team] of [[CART.end, 'red'], [1 - CART.end, 'blue']]) {
    const at = pointAt(path, segs, total, p);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.5, 8), iron); pole.position.copy(at).setY(2.25);
    const flag = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 0.05), new THREE.MeshStandardMaterial({ color: TEAM_COLOR[team], emissive: TEAM_COLOR[team], emissiveIntensity: 0.3 }));
    flag.position.copy(at).add(new THREE.Vector3(0.7, 4, 0));
    G.scene.add(pole, flag);
  }
  G.cart = { path, segs, total, p: 0.5, dir: 0, pushers: { blue: 0, red: 0 }, contested: false, best: { blue: 0.5, red: 0.5 }, pos: new THREE.Vector3(),
    mesh: { root, gem, zone, wheels: root.children.filter(o => o.name === 'wheel') }, warned: {} };
  place(G.cart);
}

function pointAt(path, segs, total, p, out = new THREE.Vector3()) {
  let d = Math.max(0, Math.min(1, p)) * total;
  for (let i = 0; i < segs.length; i++) {
    if (d <= segs[i] || i === segs.length - 1) return out.copy(path[i]).lerp(path[i + 1], Math.min(1, d / segs[i]));
    d -= segs[i];
  }
  return out.copy(path[path.length - 1]);
}
function place(C) {
  pointAt(C.path, C.segs, C.total, C.p, C.pos);
  const ahead = pointAt(C.path, C.segs, C.total, C.p + 0.01, tmp);
  C.mesh.root.position.copy(C.pos);
  if (ahead.distanceToSquared(C.pos) > 1e-6) C.mesh.root.rotation.y = Math.atan2(ahead.x - C.pos.x, ahead.z - C.pos.z);
}

export const nearCart = (G, h) => h.alive && Math.hypot(h.pos.x - G.cart.pos.x, h.pos.z - G.cart.pos.z) < CART.radius && h.pos.y < 3;
// How far each team has pushed, 0..1 of the way from the middle to the enemy flag.
export const cartLead = C => ({ blue: Math.max(0, (C.p - 0.5) / (CART.end - 0.5)), red: Math.max(0, (0.5 - C.p) / (CART.end - 0.5)) });

export function updateCart(G, dt) {
  const C = G.cart;
  if (G.over) return cartVisuals(G, dt);
  C.pushers.blue = 0; C.pushers.red = 0;
  for (const h of G.heroes) if (nearCart(G, h)) C.pushers[h.team]++;
  const { blue, red } = C.pushers;
  C.contested = blue > 0 && red > 0;
  const was = C.dir;
  C.dir = C.contested ? 0 : blue ? 1 : red ? -1 : 0;
  if (C.dir && C.dir !== was) G.ev.cart?.('push', C, C.dir > 0 ? 'blue' : 'red');
  if (C.contested && !C.wasContested) G.ev.cart?.('contest', C);
  C.wasContested = C.contested;
  if (C.dir) {
    const n = C.dir > 0 ? blue : red;
    C.p += C.dir * dt * CART.speed * (1 + CART.extra * (n - 1)) / C.total;
  }
  // milestones: halfway to a base calls out once per team
  const lead = cartLead(C);
  for (const t of ['blue', 'red']) if (lead[t] >= 0.5 && !C.warned[t]) { C.warned[t] = true; G.ev.cart?.('half', C, t); }
  if (C.p >= CART.end || C.p <= 1 - CART.end) { C.p = Math.max(1 - CART.end, Math.min(CART.end, C.p)); place(C); G.ev.cart?.('win', C, C.p > 0.5 ? 'blue' : 'red'); return; }
  // time: the side the cart sits on wins; dead level means overtime until someone moves it
  if (G.time >= CART.limit) {
    if (Math.abs(C.p - 0.5) > 1e-4) { G.ev.cart?.('time', C, C.p > 0.5 ? 'blue' : 'red'); return; }
    if (!C.ot) { C.ot = true; G.ev.cart?.('overtime', C); }
  }
  place(C);
  cartVisuals(G, dt);
}

export function cartVisuals(G, dt) {
  const C = G.cart, m = C.mesh, t = G.time;
  const col = C.contested ? (Math.sin(t * 14) > 0 ? 0xffc93c : 0xffffff) : C.dir > 0 ? TEAM_COLOR.blue : C.dir < 0 ? TEAM_COLOR.red : 0xfff3c4;
  m.gem.material.color.setHex(col); m.gem.material.emissive.setHex(col); m.zone.material.color.setHex(col);
  m.gem.rotation.y += dt * (C.dir ? 3 : 0.8);
  m.gem.position.y = 2.4 + Math.sin(t * 2) * 0.15;
  const spin = C.dir * dt * CART.speed / 0.45;
  for (const w of m.wheels) w.rotation.x += spin;
  m.zone.scale.setScalar(1 + Math.sin(t * 4) * 0.03);
}

// Bots: stay on the cart, fight whoever's near it.
export function cartGoal(G, b, goal) {
  const C = G.cart, ai = b.ai;
  if (!ai.cartOff || Math.random() < 0.005) {
    const a = Math.random() * Math.PI * 2, r = 1.8 + Math.random() * (CART.radius - 2.6);
    ai.cartOff = [Math.cos(a) * r, Math.sin(a) * r];
  }
  goal.set(C.pos.x + ai.cartOff[0], 0, C.pos.z + ai.cartOff[1]);
  return Math.hypot(b.pos.x - C.pos.x, b.pos.z - C.pos.z);
}

