import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { M, add, sph, box, cyl, cap, limb, common, walk } from './models.js?v=20261125v';

// The second half of the roster. Same conventions as models.js: face -z, head near y=1.62.
const INK = 0x1d2340;

function gunMount(root, x, y, z) { const g = new THREE.Group(); g.position.set(x, y, z); root.add(g); return g; }
function tipAt(gun, z) { const t = new THREE.Object3D(); t.position.z = z; gun.add(t); return t; }

// ---------------- Thicket: botanist ----------------
function thicket(p, team) {
  const root = new THREE.Group();
  const legs = [limb(root, -0.17, 0.85, 0.48, 0.13, M(p.dark), M(0x6b4a33)), limb(root, 0.17, 0.85, 0.48, 0.13, M(p.dark), M(0x6b4a33))];
  const coat = add(root, cyl(0.36, 0.5, 0.9, 14), M(p.main), 0, 0.95, 0);
  const torso = add(root, cap(0.36, 0.3), M(p.main), 0, 1.25, 0);
  for (let i = 0; i < 3; i++) add(root, sph(0.04, 6, 4), M(p.trim), 0, 1.35 - i * 0.18, -0.36, false);
  add(root, box(0.26, 0.2, 0.08), M(0x9b7650), -0.22, 0.9, -0.44, false);         // seed pouch
  const arms = [limb(root, 0.44, 1.44, 0.4, 0.12, M(p.main))];
  const armL = limb(root, -0.44, 1.44, 0.4, 0.12, M(p.main)); armL.rotation.x = -1.0;
  add(armL, cyl(0.13, 0.13, 0.12), M(team), 0, -0.22, 0);
  add(root, sph(0.28), M(p.skin), 0, 1.63, 0);
  for (let i = 0; i < 7; i++) add(root, sph(0.11, 8, 6), M(0x2b1d14), Math.cos(i * 0.9) * 0.24, 1.6 + Math.sin(i) * 0.05, 0.12 + Math.sin(i * 0.9) * 0.1); // curls
  add(root, cyl(0.62, 0.62, 0.05, 20), M(0xd9b37a), 0, 1.82, 0);                    // wide straw hat
  add(root, cyl(0.26, 0.3, 0.26, 16), M(0xd9b37a), 0, 1.95, 0);
  add(root, cyl(0.305, 0.305, 0.07, 16), M(p.main), 0, 1.88, 0);
  const sprouts = [];
  for (let i = 0; i < 3; i++) { const l = add(root, box(0.16, 0.03, 0.3), M(0x8cd65a), -0.15 + i * 0.12, 2.12, 0.1, false); l.rotation.set(0.5, i, 0.4); sprouts.push(l); }
  const pack = add(root, box(0.6, 0.6, 0.34), M(0x9b7650), 0, 1.25, 0.42);        // planter backpack
  void pack;
  const plants = new THREE.Group(); plants.position.set(0, 1.6, 0.42); root.add(plants);
  for (let i = 0; i < 5; i++) add(plants, new THREE.IcosahedronGeometry(0.18 + i * 0.02, 0), M([0x5fb05a, 0x7fc06a, 0x4f9a48][i % 3], 0), -0.2 + i * 0.1, Math.random() * 0.15, (i % 2) * 0.1);
  add(plants, sph(0.08, 6, 4), M(0xff5f8f), 0.15, 0.25, 0, false);
  const vine = []; let prev = root;
  for (let i = 0; i < 5; i++) { const s = new THREE.Group(); s.position.set(i ? 0 : 0.3, i ? -0.16 : 1.4, i ? 0 : 0.5); prev.add(s); add(s, sph(0.05, 6, 4), M(0x5fb05a), 0, 0, 0, false); vine.push(s); prev = s; }
  const gun = gunMount(root, 0.42, 1.15, -0.3);
  add(gun, box(0.2, 0.2, 0.55), M(0x6b4a33)); add(gun, cyl(0.07, 0.09, 0.4, 10), M(0x5f9e4a), 0.05, 0.03, -0.4).rotation.x = Math.PI / 2;
  add(gun, cyl(0.07, 0.09, 0.4, 10), M(0x5f9e4a), -0.05, 0.03, -0.4).rotation.x = Math.PI / 2;
  for (let i = 0; i < 4; i++) add(gun, new THREE.ConeGeometry(0.03, 0.1, 4), M(p.trim), 0, 0.12, -0.2 + i * 0.12, false);
  const o = { root, gun: tipAt(gun, -0.62), ...common(root, team, legs, arms) };
  o.anim = (dt, speed, t) => {
    walk(o, dt, speed, t);
    plants.rotation.z = Math.sin(t * 2.2) * 0.08; sprouts.forEach((s, i) => { s.rotation.z = 0.4 + Math.sin(t * 3 + i) * 0.2; });
    vine.forEach((s, i) => { s.rotation.x = Math.sin(t * 2 + i) * 0.3; });
    coat.rotation.x = -Math.min(1, speed / 6) * 0.08;
    torso.scale.y = 1 + Math.sin(t * 2) * 0.015;
  };
  return o;
}

// ---------------- Ratchet: clocktower tinkerer ----------------
function ratchet(p, team) {
  const root = new THREE.Group();
  const legs = [limb(root, -0.18, 0.82, 0.45, 0.14, M(p.dark), M(INK)), limb(root, 0.18, 0.82, 0.45, 0.14, M(p.dark), M(INK))];
  const torso = add(root, cap(0.42, 0.35), M(p.dark), 0, 1.15, 0); torso.scale.set(1.05, 1, 0.95);
  add(root, box(0.6, 0.8, 0.08), M(0x9b7650), 0, 1.0, -0.4);                         // leather apron
  for (let i = 0; i < 3; i++) add(root, box(0.08, 0.16, 0.05), M([0xb0b8c4, p.trim, 0xb0b8c4][i]), -0.16 + i * 0.16, 1.05, -0.46, false); // tools
  const arms = [limb(root, 0.52, 1.42, 0.42, 0.13, M(p.dark))];
  const mech = new THREE.Group(); mech.position.set(-0.55, 1.42, 0); mech.rotation.x = -0.9; root.add(mech); // mechanical arm
  add(mech, sph(0.18, 10, 8), M(p.trim), 0, 0, 0);
  add(mech, cyl(0.09, 0.09, 0.5, 8), M(p.main), 0, -0.3, 0);
  add(mech, sph(0.12, 8, 6), M(p.trim), 0, -0.56, 0);
  const claw = new THREE.Group(); claw.position.y = -0.62; mech.add(claw);
  for (const s of [-1, 1]) add(claw, box(0.05, 0.2, 0.08), M(p.main), s * 0.07, -0.1, 0).rotation.z = s * 0.3;
  add(mech, cyl(0.12, 0.12, 0.1), M(team), 0, -0.18, 0);
  add(root, sph(0.29), M(p.skin), 0, 1.62, 0);
  add(root, box(0.36, 0.12, 0.2), M(0xd9d2c3), 0, 1.5, -0.2, false);                // big beard
  add(root, box(0.26, 0.16, 0.18), M(0xd9d2c3), 0, 1.4, -0.18, false);
  const cap2 = add(root, sph(0.31, 14, 8), M(p.main), 0, 1.72, 0); cap2.scale.y = 0.6;
  const lenses = [];
  for (const s of [-1, 1]) {
    add(root, cyl(0.1, 0.1, 0.1, 12), M(0xb87333), s * 0.12, 1.68, -0.26).rotation.x = Math.PI / 2;
    lenses.push(add(root, new THREE.CircleGeometry(0.08, 12), M(0x7af0ff, 0.8), s * 0.12, 1.68, -0.315, false));
    lenses[lenses.length - 1].rotation.y = Math.PI;
  }
  add(root, box(0.62, 0.7, 0.38), M(p.main), 0, 1.25, 0.42);                         // backpack engine
  const gears = [];
  for (const [x, y, r] of [[0.15, 1.35, 0.17], [-0.12, 1.1, 0.12]]) {
    const g = add(root, cyl(r, r, 0.06, 10), M(p.trim), x, y, 0.62); g.rotation.x = Math.PI / 2; gears.push(g);
  }
  add(root, cyl(0.015, 0.015, 0.7, 4), M(INK), -0.22, 1.9, 0.5);                    // antenna
  const blink = add(root, sph(0.05, 6, 4), M(0xff4444, 1), -0.22, 2.26, 0.5, false);
  const wrench = add(root, box(0.08, 0.8, 0.05), M(0xb0b8c4), 0.28, 1.4, 0.64); wrench.rotation.z = 0.5;
  const gun = gunMount(root, 0.44, 1.15, -0.3);
  add(gun, box(0.16, 0.24, 0.6), M(p.main)); add(gun, cyl(0.06, 0.06, 0.3, 10), M(INK), 0, 0, -0.42).rotation.x = Math.PI / 2;
  add(gun, cyl(0.1, 0.1, 0.12, 12), M(p.trim), 0, 0.17, 0.05);                     // rivet drum
  const o = { root, gun: tipAt(gun, -0.58), ...common(root, team, legs, arms) };
  o.anim = (dt, speed, t) => {
    walk(o, dt, speed, t);
    gears[0].rotation.y += dt * 3; gears[1].rotation.y -= dt * 4.5;
    blink.visible = Math.sin(t * 6) > 0;
    claw.rotation.y = Math.sin(t * 1.5) * 0.4;
    mech.rotation.z = Math.sin(t * 1.2) * 0.08;
  };
  return o;
}

// ---------------- Mirage: stage magician ----------------
function mirage(p, team) {
  const root = new THREE.Group();
  const legs = [limb(root, -0.13, 0.9, 0.55, 0.1, M(INK), M(INK)), limb(root, 0.13, 0.9, 0.55, 0.1, M(INK), M(INK))];
  const torso = add(root, cap(0.3, 0.45), M(p.dark), 0, 1.2, 0);
  add(root, box(0.2, 0.5, 0.05), M(0xffffff), 0, 1.25, -0.29, false);                // shirt front
  add(root, box(0.2, 0.08, 0.06), M(p.trim), 0, 1.47, -0.31, false);                 // bow tie
  const cape = new THREE.Group(); cape.position.set(0, 1.5, 0.22); root.add(cape);
  const capeOut = add(cape, box(0.9, 1.25, 0.05), M(p.main), 0, -0.62, 0.05);
  add(cape, box(0.86, 1.2, 0.03), M(0xd94fa0), 0, -0.62, 0.02, false);              // lining
  const arms = [limb(root, 0.4, 1.44, 0.45, 0.09, M(p.dark))];
  const armL = limb(root, -0.4, 1.44, 0.45, 0.09, M(p.dark)); armL.rotation.set(-1.2, 0, -0.3);
  add(armL, cyl(0.11, 0.11, 0.1), M(team), 0, -0.2, 0);
  add(armL, sph(0.1, 8, 6), M(0xffffff), 0, -0.6, 0);                               // white glove
  add(root, sph(0.27), M(p.skin), 0, 1.66, 0);
  const mask = add(root, box(0.42, 0.13, 0.08), M(p.trim), 0, 1.7, -0.25, false); void mask;
  for (const s of [-1, 1]) add(root, sph(0.045, 8, 6), M(INK), s * 0.1, 1.7, -0.3, false);
  add(root, box(0.2, 0.04, 0.04), M(INK), 0, 1.57, -0.26, false);                    // curled moustache
  for (const s of [-1, 1]) add(root, new THREE.TorusGeometry(0.04, 0.015, 4, 8, Math.PI), M(INK), s * 0.12, 1.58, -0.26, false);
  const turban = add(root, sph(0.31, 14, 10), M(p.main), 0, 1.84, 0.02); turban.scale.set(1, 0.7, 1);
  const gem = add(root, new THREE.OctahedronGeometry(0.07, 0), M(p.trim, 0.6), 0, 1.86, -0.3, false);
  add(root, new THREE.ConeGeometry(0.05, 0.3, 6), M(0xffffff), 0.08, 2.06, 0.05, false).rotation.z = -0.4; // feather
  const cards = new THREE.Group(); cards.position.y = 1.2; root.add(cards);
  for (let i = 0; i < 5; i++) {
    const c = add(cards, box(0.16, 0.22, 0.01), M(i % 2 ? 0xffffff : 0xd94fa0), Math.cos(i / 5 * Math.PI * 2) * 0.75, 0, Math.sin(i / 5 * Math.PI * 2) * 0.75, false);
    c.rotation.y = -i / 5 * Math.PI * 2;
  }
  const gun = gunMount(root, 0.4, 1.12, -0.3);
  add(gun, box(0.08, 0.18, 0.4), M(INK)); add(gun, box(0.16, 0.24, 0.02), M(0xffffff), 0, 0.08, -0.1);
  add(gun, cyl(0.02, 0.02, 0.4, 6), M(p.trim), 0, 0, -0.35).rotation.x = Math.PI / 2;
  const o = { root, gun: tipAt(gun, -0.55), ...common(root, team, legs, arms) };
  o.anim = (dt, speed, t) => {
    const k = walk(o, dt, speed, t);
    cards.rotation.y += dt * 1.6; cards.position.y = 1.2 + Math.sin(t * 2) * 0.08;
    cards.children.forEach((c, i) => { c.position.y = Math.sin(t * 3 + i) * 0.1; });
    cape.rotation.x = 0.15 + k * 0.5 + Math.sin(t * 6) * 0.04 * (0.3 + k);
    capeOut.scale.y = 1 + Math.sin(t * 4) * 0.02;
    gem.rotation.y += dt * 2;
    torso.rotation.z = Math.sin(t * 1.3) * 0.03;
  };
  return o;
}

// ---------------- Avalanche: mountain rescuer ----------------
function avalanche(p, team) {
  const root = new THREE.Group();
  const legs = [limb(root, -0.22, 0.78, 0.4, 0.17, M(p.dark), M(0x3a2a2a)), limb(root, 0.22, 0.78, 0.4, 0.17, M(p.dark), M(0x3a2a2a))];
  const torso = add(root, cap(0.55, 0.35), M(p.main), 0, 1.12, 0); torso.scale.set(1.1, 1, 1);   // big parka
  add(root, box(0.9, 0.12, 0.6), M(p.trim), 0, 1.05, -0.35, false);                 // reflective stripe
  add(root, box(0.3, 0.3, 0.08), M(0xffffff), 0.2, 1.35, -0.5, false);              // rescue cross patch
  add(root, box(0.06, 0.2, 0.09), M(p.main), 0.2, 1.35, -0.52, false); add(root, box(0.2, 0.06, 0.09), M(p.main), 0.2, 1.35, -0.52, false);
  const arms = [limb(root, 0.66, 1.42, 0.4, 0.16, M(p.main))];
  const armL = limb(root, -0.66, 1.42, 0.4, 0.16, M(p.main)); armL.rotation.x = -0.8;
  add(armL, cyl(0.18, 0.18, 0.14), M(team), 0, -0.22, 0);
  add(armL, sph(0.17, 8, 6), M(p.dark), 0, -0.6, 0);                                // mitten
  const hood = add(root, new THREE.TorusGeometry(0.33, 0.12, 8, 18), M(0xf2e8d5), 0, 1.65, 0.02); // fur hood rim
  hood.rotation.y = 0; hood.scale.set(1, 1.1, 1);
  add(root, sph(0.33, 14, 10), M(p.main), 0, 1.7, 0.08);
  add(root, sph(0.25), M(p.skin), 0, 1.63, -0.08);
  for (const s of [-1, 1]) add(root, sph(0.07, 8, 6), M(0xff9a8a), s * 0.14, 1.57, -0.27, false); // rosy cheeks
  add(root, box(0.38, 0.1, 0.06), M(0xff9a3c, 0.4), 0, 1.7, -0.3, false);            // snow goggles
  const braids = [];
  for (const s of [-1, 1]) { const b = add(root, cap(0.06, 0.45), M(0xf2c14e), s * 0.3, 1.32, -0.05); braids.push(b); }
  const skis = new THREE.Group(); skis.position.set(0, 1.2, 0.58); root.add(skis);
  for (const s of [-1, 1]) { const sk = add(skis, box(0.1, 2.0, 0.04), M(0xffc93c), s * 0.12, 0.2, 0); sk.rotation.z = s * 0.08; }
  add(root, box(0.55, 0.55, 0.3), M(p.dark), 0, 1.2, 0.48);
  add(root, cyl(0.2, 0.2, 0.3, 10), M(0xb87333), 0, 1.6, 0.48).rotation.z = Math.PI / 2; // thermos
  const gun = gunMount(root, 0.5, 1.15, -0.3);
  add(gun, cyl(0.17, 0.2, 0.8, 14), M(0xd9e6ee)).rotation.x = Math.PI / 2;
  add(gun, cyl(0.24, 0.17, 0.16, 14), M(p.main), 0, 0, -0.45).rotation.x = Math.PI / 2;
  add(gun, box(0.3, 0.3, 0.3), M(0xffffff), 0, 0.22, 0.15);                       // snow hopper
  const flakes = [];
  for (let i = 0; i < 6; i++) flakes.push(add(root, sph(0.04, 5, 4), M(0xffffff, 0.3), 0, 0, 0, false));
  const o = { root, gun: tipAt(gun, -0.6), ...common(root, team, legs, arms) };
  o.anim = (dt, speed, t) => {
    const k = walk(o, dt, speed, t);
    braids.forEach((b, i) => { b.rotation.x = Math.sin(t * 6 + i) * 0.15 * (0.4 + k); });
    skis.rotation.z = Math.sin(t * 4) * 0.03 * k;
    flakes.forEach((f, i) => { const a = t * 0.8 + i; f.position.set(Math.cos(a) * 0.9, 0.3 + ((t * 0.5 + i / 6) % 1) * 1.9, Math.sin(a) * 0.9); });
    torso.scale.y = 1 + Math.sin(t * 1.6) * 0.02;
  };
  return o;
}

export const MORE = { thicket, ratchet, mirage, avalanche };
