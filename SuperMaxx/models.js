import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { MORE } from './models2.js?v=20261129f';
import { SEASON_MODELS } from './models3.js?v=20261129f';
import { ROSTER_A } from './heroes3d_a.js?v=20261129f';
import { ROSTER_B } from './heroes3d_b.js?v=20261129f';
import { ROSTER_C } from './heroes3d_c.js?v=20261129f';
import { ROSTER_D } from './heroes3d_d.js?v=20261129f';
import { setLook } from './rig.js?v=20261129f';
import { LOOKS, dressLook } from './looks.js?v=20261129f';

// Stylised hero models built from primitives. Every model faces -z, stands ~1.9 m tall,
// keeps the head around y=1.62 (matches the hitboxes) and exposes an anim() hook.

const INK = 0x1d2340;
const matCache = new Map();
export function M(color, glow = 0) {
  const k = color + ':' + glow;
  if (!matCache.has(k)) matCache.set(k, new THREE.MeshLambertMaterial({ color, emissive: glow ? color : 0, emissiveIntensity: glow }));
  return matCache.get(k);
}
export function add(parent, geo, mat, x = 0, y = 0, z = 0, shadow = true) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z); m.castShadow = shadow;
  parent.add(m);
  return m;
}
export const sph = (r, w = 14, h = 10) => new THREE.SphereGeometry(r, w, h);
export const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
export const cyl = (a, b, h, s = 14) => new THREE.CylinderGeometry(a, b, h, s);
export const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 5, 10);

export function limb(parent, x, y, len, r, mat, footMat) {
  const pivot = new THREE.Group(); pivot.position.set(x, y, 0); parent.add(pivot);
  add(pivot, cap(r, len), mat, 0, -len / 2 - r * 0.5, 0);
  if (footMat) add(pivot, box(r * 2.4, r * 1.4, r * 3.4), footMat, 0, -len - r * 1.3, -r * 0.6);
  return pivot;
}

export function common(root, team, legs, arms) {
  // team ring under the feet so teams read at a glance whatever the hero palette
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.8, 32), new THREE.MeshBasicMaterial({ color: team, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04; root.add(ring);
  const shield = new THREE.Mesh(sph(1.25, 22, 16), new THREE.MeshBasicMaterial({ color: 0x5fe0c0, transparent: true, opacity: 0.24, depthWrite: false }));
  shield.position.y = 1; shield.visible = false; root.add(shield);
  return { shield, legs, arms };
}

export function walk(o, dt, speed, t) {
  o.walkT = (o.walkT || 0) + dt * speed * 1.7;
  const k = Math.min(1, speed / 6), s = Math.sin(o.walkT) * 0.7 * k;
  if (o.legs) { o.legs[0].rotation.x = s; o.legs[1].rotation.x = -s; }
  if (o.arms) { o.arms[0].rotation.x = -s * 0.6; }
  return k;
}

// ---------------- Bulwark: stocky harbour warden ----------------
function bulwark(p, team) {
  const root = new THREE.Group();
  const legs = [limb(root, -0.2, 0.82, 0.45, 0.15, M(p.dark), M(INK)), limb(root, 0.2, 0.82, 0.45, 0.15, M(p.dark), M(INK))];
  const torso = add(root, cap(0.48, 0.42), M(p.main), 0, 1.12, 0); torso.scale.set(1.15, 1, 0.9);
  add(root, box(0.7, 0.36, 0.12), M(p.trim), 0, 1.12, -0.42);              // brass chest plate
  add(root, box(0.12, 0.3, 0.13), M(INK), 0, 1.12, -0.48);                 // anchor stem
  add(root, box(0.34, 0.07, 0.13), M(INK), 0, 1.0, -0.48);
  add(root, cyl(0.5, 0.5, 0.12, 18), M(INK), 0, 0.8, 0);                   // belt
  for (const s of [-1, 1]) { const pd = add(root, sph(0.3, 14, 8), M(p.trim), s * 0.58, 1.42, 0); pd.scale.y = 0.65; }
  const arms = [limb(root, 0.62, 1.38, 0.42, 0.13, M(p.main))];
  const armL = limb(root, -0.62, 1.38, 0.42, 0.13, M(p.main)); armL.rotation.x = -0.9;
  add(armL, cyl(0.15, 0.15, 0.14), M(team), 0, -0.25, 0);                  // team armband
  add(root, sph(0.29), M(p.skin), 0, 1.6, -0.02);                          // face
  const helm = add(root, sph(0.33, 16, 10, 0), M(p.main), 0, 1.7, 0); helm.scale.set(1, 0.75, 1.05);
  const rim = add(root, new THREE.TorusGeometry(0.33, 0.04, 6, 20), M(p.trim), 0, 1.64, 0); rim.rotation.x = Math.PI / 2;
  const plume = new THREE.Group(); plume.position.set(0, 1.95, 0.05); root.add(plume);
  for (let i = 0; i < 5; i++) add(plume, box(0.08, 0.14, 0.16), M(0xff7a59), 0, Math.sin(i / 4 * Math.PI) * 0.12, -0.2 + i * 0.12);
  add(root, box(0.26, 0.05, 0.05), M(0xdfe3e6), 0, 1.52, -0.28);           // grey moustache
  for (let i = 0; i < 4; i++) add(root, sph(0.07 - i * 0.008), M(0xdfe3e6), 0, 1.55 - i * 0.12, 0.33 + i * 0.03); // braid
  const sh = add(root, cyl(0.5, 0.5, 0.1, 20), M(p.main), 0, 1.15, 0.5); sh.rotation.x = Math.PI / 2;
  const shr = add(root, new THREE.TorusGeometry(0.5, 0.05, 6, 24), M(p.trim), 0, 1.15, 0.56);
  void shr;
  const gun = new THREE.Group(); gun.position.set(0.42, 1.12, -0.35); root.add(gun);
  add(gun, box(0.16, 0.2, 0.75), M(INK)); add(gun, box(0.17, 0.08, 0.4), M(p.trim), 0, 0.08, 0);
  add(gun, cyl(0.04, 0.04, 0.3), M(INK), 0, 0, -0.5).rotation.x = Math.PI / 2;
  const tip = new THREE.Object3D(); tip.position.z = -0.7; gun.add(tip);
  const o = { root, gun: tip, ...common(root, team, legs, arms) };
  o.anim = (dt, speed, t) => { walk(o, dt, speed, t); plume.rotation.x = Math.sin(t * 3) * 0.08; torso.position.y = 1.12 + Math.sin(t * 2) * 0.01; };
  return o;
}

// ---------------- Zip: courier ----------------
function zip(p, team) {
  const root = new THREE.Group();
  const legs = [limb(root, -0.14, 0.9, 0.55, 0.11, M(p.dark), M(0xffffff)), limb(root, 0.14, 0.9, 0.55, 0.11, M(p.dark), M(0xffffff))];
  for (const l of legs) add(l, box(0.27, 0.04, 0.38), M(p.trim, 0.6), 0, -0.86, -0.07, false); // glowing soles
  const torso = add(root, cap(0.32, 0.4), M(p.main), 0, 1.18, 0);
  add(root, box(0.08, 0.5, 0.05), M(p.trim), 0.12, 1.2, -0.31);            // jacket zip stripe
  add(root, box(0.5, 0.07, 0.6), M(p.dark), 0, 0.92, 0);
  const satchel = add(root, box(0.3, 0.26, 0.14), M(0x8a5a3c), -0.36, 0.95, 0.1); satchel.rotation.z = 0.2;
  const arms = [limb(root, 0.42, 1.42, 0.42, 0.1, M(p.main))];
  const armL = limb(root, -0.42, 1.42, 0.42, 0.1, M(p.main)); armL.rotation.x = -1.1; armL.rotation.z = -0.3;
  add(armL, cyl(0.12, 0.12, 0.12), M(team), 0, -0.22, 0);
  add(root, sph(0.27), M(p.skin), 0, 1.64, 0);
  for (let i = 0; i < 6; i++) {                                              // spiky hair out of the cap
    const c = add(root, new THREE.ConeGeometry(0.06, 0.2, 5), M(0x2b1d14), Math.cos(i) * 0.22, 1.78, 0.1 + Math.sin(i) * 0.12);
    c.rotation.z = Math.cos(i) * -0.9; c.rotation.x = 0.6;
  }
  const capTop = add(root, sph(0.29, 14, 8), M(p.trim), 0, 1.74, 0); capTop.scale.y = 0.55;
  add(root, box(0.3, 0.04, 0.26), M(p.trim), 0, 1.73, 0.32);               // bill worn backwards
  for (const s of [-1, 1]) {
    const g = add(root, new THREE.TorusGeometry(0.075, 0.025, 6, 14), M(INK), s * 0.1, 1.8, -0.24); void g;
    add(root, new THREE.CircleGeometry(0.07, 14), M(0x6fe8ff, 0.7), s * 0.1, 1.8, -0.255, false).rotation.y = Math.PI;
  }
  const scarf = []; let prev = root;
  for (let i = 0; i < 6; i++) {                                              // trailing scarf
    const seg = new THREE.Group(); seg.position.set(i ? 0 : 0.05, i ? 0 : 1.45, i ? 0.17 : 0.24); prev.add(seg);
    add(seg, box(0.13, 0.05, 0.19), M(p.trim), 0, 0, 0.08); scarf.push(seg); prev = seg;
  }
  add(root, new THREE.TorusGeometry(0.22, 0.07, 6, 16), M(p.trim), 0, 1.44, 0).rotation.x = Math.PI / 2;
  const gun = new THREE.Group(); gun.position.set(0.4, 1.12, -0.32); root.add(gun);
  add(gun, box(0.12, 0.16, 0.45), M(INK)); add(gun, box(0.06, 0.2, 0.1), M(p.trim), 0, -0.16, 0.05);
  const tip = new THREE.Object3D(); tip.position.z = -0.3; gun.add(tip);
  const o = { root, gun: tip, ...common(root, team, legs, arms) };
  o.anim = (dt, speed, t) => {
    const k = walk(o, dt, speed, t);
    scarf.forEach((s, i) => { s.rotation.x = -0.25 - k * 0.5 + Math.sin(t * 9 - i) * (0.1 + k * 0.18); s.rotation.y = Math.sin(t * 5 - i * 0.7) * 0.15; });
    torso.rotation.x = -k * 0.15;
  };
  return o;
}

// ---------------- Cinder: royal pyrotechnician ----------------
function cinder(p, team) {
  const root = new THREE.Group();
  const legs = [limb(root, -0.16, 0.6, 0.28, 0.12, M(p.dark), M(INK)), limb(root, 0.16, 0.6, 0.28, 0.12, M(p.dark), M(INK))];
  add(root, cyl(0.34, 0.58, 0.7, 16), M(p.main), 0, 0.82, 0);              // skirt
  add(root, box(0.46, 0.6, 0.08), M(p.trim), 0, 0.95, -0.44).rotation.x = -0.18; // apron
  const torso = add(root, cap(0.36, 0.3), M(p.main), 0, 1.28, 0);
  add(root, cyl(0.38, 0.38, 0.08, 16), M(p.trim), 0, 1.12, 0);
  const arms = [limb(root, 0.44, 1.46, 0.36, 0.11, M(p.main))];
  const armL = limb(root, -0.44, 1.46, 0.36, 0.11, M(p.main)); armL.rotation.x = -1.2;
  add(armL, sph(0.14), M(p.trim), 0, -0.55, 0);
  add(armL, cyl(0.13, 0.13, 0.12), M(team), 0, -0.2, 0);
  const head = add(root, sph(0.3), M(p.dark), 0, 1.66, 0); head.scale.set(1, 1.05, 1);
  const plate = add(root, cyl(0.25, 0.25, 0.06, 18), M(0x4b3b36), 0, 1.64, -0.27); plate.rotation.x = Math.PI / 2;
  const lenses = [];
  for (const s of [-1, 1]) lenses.push(add(root, sph(0.075), M(0xff8a3c, 0.9), s * 0.1, 1.68, -0.31, false));
  add(root, cyl(0.24, 0.26, 0.04, 16), M(INK), 0, 1.9, 0);                  // top hat brim
  add(root, cyl(0.15, 0.17, 0.3, 16), M(INK), 0, 2.06, 0);
  add(root, cyl(0.172, 0.172, 0.06, 16), M(p.main), 0, 1.96, 0);
  add(root, cyl(0.24, 0.24, 0.72, 16), M(0xb87333), 0, 1.25, 0.42);         // copper tank
  for (const y of [1.0, 1.5]) add(root, new THREE.TorusGeometry(0.245, 0.03, 6, 18), M(p.trim), 0, y, 0.42).rotation.x = Math.PI / 2;
  add(root, cyl(0.06, 0.08, 0.5), M(INK), 0.16, 1.85, 0.5);                 // chimney
  const puffs = [];
  for (let i = 0; i < 4; i++) { const pf = add(root, sph(0.09, 8, 6), new THREE.MeshLambertMaterial({ color: 0xeeeeee, transparent: true, opacity: 0.7 }), 0.16, 2.1, 0.5, false); pf.userData.p = i / 4; puffs.push(pf); }
  const gun = new THREE.Group(); gun.position.set(0.42, 1.2, -0.3); root.add(gun);
  add(gun, cyl(0.12, 0.12, 0.8, 14), M(0xb87333)).rotation.x = Math.PI / 2;
  add(gun, cyl(0.2, 0.12, 0.18, 14), M(p.trim), 0, 0, -0.45).rotation.x = Math.PI / 2;
  add(gun, new THREE.TorusGeometry(0.125, 0.025, 6, 14), M(INK), 0, 0, 0.1);
  const tip = new THREE.Object3D(); tip.position.z = -0.6; gun.add(tip);
  const o = { root, gun: tip, ...common(root, team, legs, arms) };
  o.anim = (dt, speed, t) => {
    walk(o, dt, speed, t);
    for (const pf of puffs) { const k = (t * 0.6 + pf.userData.p) % 1; pf.position.set(0.16 + k * 0.15, 2.1 + k * 0.9, 0.5 + k * 0.3); pf.scale.setScalar(0.6 + k * 2); pf.material.opacity = 0.7 * (1 - k); }
    const g = 0.7 + Math.sin(t * 6) * 0.25; for (const l of lenses) l.material.emissiveIntensity = g;
    torso.rotation.z = Math.sin(t * 1.5) * 0.03;
  };
  return o;
}

// ---------------- Lantern: hooded sniper monk ----------------
function lantern(p, team) {
  const root = new THREE.Group();
  const robe = add(root, cyl(0.3, 0.62, 1.35, 18), M(p.dark), 0, 0.68, 0);
  add(root, cyl(0.32, 0.5, 0.8, 18, 1), M(p.main), 0, 1.05, 0);             // outer mantle
  add(root, cyl(0.34, 0.34, 0.08, 18), M(p.trim), 0, 0.9, 0);
  add(root, box(0.12, 0.9, 0.04), M(p.trim), 0, 0.5, -0.5).rotation.x = -0.3; // sash
  const arms = [limb(root, 0.36, 1.42, 0.4, 0.12, M(p.main))];
  const armL = limb(root, -0.36, 1.42, 0.4, 0.12, M(p.main)); armL.rotation.x = -1.0;
  add(armL, cyl(0.14, 0.14, 0.12), M(team), 0, -0.22, 0);
  const hood = add(root, sph(0.36, 16, 12), M(p.main), 0, 1.66, 0.03); hood.scale.set(1, 1.15, 1.05);
  add(root, new THREE.ConeGeometry(0.16, 0.3, 10), M(p.main), 0, 1.96, 0.18).rotation.x = 0.9; // hood tip
  const face = add(root, sph(0.25), M(p.skin), 0, 1.62, -0.14, false); face.scale.z = 0.7;
  const eyes = [];
  for (const s of [-1, 1]) eyes.push(add(root, sph(0.04, 8, 6), M(p.trim, 1), s * 0.08, 1.66, -0.32, false));
  const halo = add(root, new THREE.TorusGeometry(0.32, 0.03, 6, 28), M(p.trim, 0.5), 0, 1.9, 0.35, false);
  const lamp = new THREE.Group(); lamp.position.set(-0.32, 0.9, -0.28); root.add(lamp);
  add(lamp, cyl(0.01, 0.01, 0.2, 4), M(INK), 0, -0.1, 0);
  add(lamp, box(0.16, 0.2, 0.16), M(p.trim), 0, -0.28, 0);
  const flame = add(lamp, sph(0.07, 8, 6), M(0xffd36a, 1), 0, -0.28, 0, false);
  const gun = new THREE.Group(); gun.position.set(0.4, 1.2, -0.45); root.add(gun);
  add(gun, box(0.1, 0.13, 1.25), M(INK));
  for (let i = 0; i < 3; i++) add(gun, new THREE.TorusGeometry(0.08, 0.025, 6, 14), M(p.main, 0.8), 0, 0, -0.25 - i * 0.18);
  add(gun, box(0.12, 0.08, 0.3), M(p.trim), 0, 0.09, 0.2);
  const tip = new THREE.Object3D(); tip.position.z = -0.68; gun.add(tip);
  const o = { root, gun: tip, ...common(root, team, null, arms) };
  o.anim = (dt, speed, t) => {
    const k = Math.min(1, speed / 6);
    robe.rotation.x = -k * 0.08 + Math.sin(t * 7) * 0.02 * k;
    halo.rotation.z += dt * 0.8; halo.position.y = 1.9 + Math.sin(t * 2) * 0.04;
    lamp.rotation.x = Math.sin(t * 3 + speed) * (0.2 + k * 0.4);
    flame.scale.setScalar(0.9 + Math.sin(t * 13) * 0.15);
    const g = 0.7 + Math.sin(t * 1.7) * 0.3; for (const e of eyes) e.material.emissiveIntensity = g;
  };
  return o;
}

// The stylised rig (rig.js + heroes3d_a/b.js) replaced the original blocky builders above.
const BUILDERS = { ...ROSTER_A, ...ROSTER_B, ...ROSTER_C, ...ROSTER_D };
export function buildHeroModel(def, teamColor) {
  const look = def.skinId && LOOKS[def.skinId];                          // skins add pieces as well as colours
  setLook(look ? { look, palette: def.palette, dress: dressLook } : null);
  try { return BUILDERS[def.id](def.palette, teamColor); } finally { setLook(null); }
}
