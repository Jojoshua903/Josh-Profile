import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { M, add, sph, box, cyl, cap, limb, common, walk } from './models.js?v=20261128e';

// Season 1 pass heroes. Same conventions as models.js: face -z, head near y=1.62.
const INK = 0x1d2340;

function gunMount(root, x, y, z) { const g = new THREE.Group(); g.position.set(x, y, z); root.add(g); return g; }
function tipAt(gun, z) { const t = new THREE.Object3D(); t.position.z = z; gun.add(t); return t; }

// ---------------- Tempo: pirate radio DJ ----------------
function tempo(p, team) {
  const root = new THREE.Group();
  const legs = [limb(root, -0.15, 0.88, 0.52, 0.12, M(p.dark), M(0xffffff)), limb(root, 0.15, 0.88, 0.52, 0.12, M(p.dark), M(0xffffff))];
  for (const l of legs) add(l, box(0.29, 0.05, 0.4), M(p.trim), 0, -0.9, -0.07, false);          // pink sneaker soles
  const torso = add(root, cap(0.35, 0.36), M(p.main), 0, 1.17, 0);                                 // bomber jacket
  add(root, box(0.62, 0.08, 0.55), M(p.trim), 0, 0.95, 0);                                          // jacket hem band
  add(root, box(0.1, 0.48, 0.05), M(0xffffff), 0, 1.2, -0.33, false);                               // tee under the jacket
  add(root, new THREE.TorusGeometry(0.26, 0.06, 6, 16), M(p.trim), 0, 1.46, 0).rotation.x = Math.PI / 2; // collar
  const arms = [limb(root, 0.44, 1.42, 0.42, 0.11, M(p.main))];
  const armL = limb(root, -0.44, 1.42, 0.42, 0.11, M(p.main)); armL.rotation.x = -1.1;
  add(armL, cyl(0.13, 0.13, 0.12), M(team), 0, -0.22, 0);
  const vinyl = add(armL, cyl(0.2, 0.2, 0.02, 20), M(INK), 0, -0.6, -0.05); vinyl.rotation.z = Math.PI / 2; // record in hand
  add(vinyl, cyl(0.06, 0.06, 0.03, 12), M(p.trim), 0, 0, 0, false);
  // head group bobs to the beat
  const head = new THREE.Group(); root.add(head);
  add(head, sph(0.27), M(p.skin), 0, 1.64, 0);
  const puff = add(head, sph(0.34, 14, 10), M(0x2b1d14), 0, 1.78, 0.08); puff.scale.set(1.05, 0.9, 1);  // hair puff
  add(head, new THREE.TorusGeometry(0.31, 0.035, 6, 20, Math.PI), M(p.dark), 0, 1.66, 0);         // band, ear to ear
  for (const s of [-1, 1]) {                                                                         // headphones
    const cup = add(head, cyl(0.12, 0.12, 0.1, 14), M(p.dark), s * 0.3, 1.64, 0); cup.rotation.z = Math.PI / 2;
    add(head, cyl(0.09, 0.09, 0.02, 14), M(p.trim, 0.6), s * 0.36, 1.64, 0, false).rotation.z = Math.PI / 2;
  }
  add(head, box(0.4, 0.09, 0.06), M(INK), 0, 1.68, -0.25, false);                                    // shades
  for (const s of [-1, 1]) add(head, box(0.13, 0.06, 0.02), M(p.main, 0.7), s * 0.1, 1.68, -0.285, false);
  // speaker backpack with two pulsing woofers
  add(root, box(0.62, 0.72, 0.3), M(p.dark), 0, 1.22, 0.4);
  const woofers = [];
  for (const y of [1.4, 1.05]) {
    add(root, cyl(0.17, 0.17, 0.04, 18), M(p.trim), 0, y, 0.56).rotation.x = Math.PI / 2;
    const w = add(root, cyl(0.12, 0.05, 0.08, 16), M(INK), 0, y, 0.6); w.rotation.x = -Math.PI / 2; woofers.push(w);
  }
  add(root, cyl(0.015, 0.015, 0.5, 4), M(INK), 0.24, 1.8, 0.4);                                     // aerial
  const tipLight = add(root, sph(0.05, 6, 4), M(p.trim, 1), 0.24, 2.06, 0.4, false);
  // sound cannon: a boxy deck with a flared horn
  const gun = gunMount(root, 0.42, 1.14, -0.3);
  add(gun, box(0.18, 0.2, 0.5), M(p.dark)); add(gun, box(0.19, 0.06, 0.3), M(p.main), 0, 0.1, 0.02);
  const horn = add(gun, cyl(0.17, 0.06, 0.24, 16), M(p.trim), 0, 0, -0.36); horn.rotation.x = -Math.PI / 2;
  add(gun, cyl(0.12, 0.12, 0.02, 16), M(INK), 0, 0, -0.48, false).rotation.x = Math.PI / 2;
  const o = { root, gun: tipAt(gun, -0.5), ...common(root, team, legs, arms) };
  o.anim = (dt, speed, t) => {
    walk(o, dt, speed, t);
    const beat = Math.pow(Math.max(0, Math.sin(t * Math.PI * 2.2)), 6);                              // 132 bpm-ish thump
    for (const w of woofers) w.scale.set(1 + beat * 0.35, 1, 1 + beat * 0.35);
    head.rotation.x = -beat * 0.08; head.position.y = -beat * 0.02;
    vinyl.rotation.y += dt * 5;
    tipLight.visible = beat > 0.2 || Math.sin(t * 3) > 0;
    torso.rotation.z = Math.sin(t * Math.PI * 1.1) * 0.03;
  };
  return o;
}

// ---------------- Kestrel: stunt pilot ----------------
function kestrel(p, team) {
  const root = new THREE.Group();
  const legs = [limb(root, -0.15, 0.88, 0.5, 0.12, M(p.dark), M(0x3a2a2a)), limb(root, 0.15, 0.88, 0.5, 0.12, M(p.dark), M(0x3a2a2a))];
  for (const l of legs) add(l, cyl(0.135, 0.13, 0.28, 10), M(0x3a2a2a), 0, -0.6, 0);             // tall boots
  const torso = add(root, cap(0.34, 0.38), M(p.main), 0, 1.18, 0);                                // leather flight jacket
  add(root, new THREE.TorusGeometry(0.28, 0.1, 8, 18), M(0xf2e8d5), 0, 1.45, 0).rotation.x = Math.PI / 2; // sheepskin collar
  add(root, cyl(0.37, 0.37, 0.08, 16), M(INK), 0, 0.96, 0);                                       // belt
  add(root, box(0.1, 0.08, 0.05), M(p.trim), 0, 0.96, -0.37, false);                              // buckle
  for (const s of [-1, 1]) add(root, box(0.16, 0.12, 0.05), M(p.dark), s * 0.17, 1.26, -0.33, false); // chest pockets
  const arms = [limb(root, 0.44, 1.42, 0.42, 0.11, M(p.main))];
  const armL = limb(root, -0.44, 1.42, 0.42, 0.11, M(p.main)); armL.rotation.x = -0.9;
  add(armL, cyl(0.13, 0.13, 0.12), M(team), 0, -0.22, 0);
  add(armL, sph(0.11, 8, 6), M(0x6b4a33), 0, -0.6, 0);                                            // glove
  add(root, sph(0.27), M(p.skin), 0, 1.64, 0);
  const capTop = add(root, sph(0.3, 14, 10), M(p.dark), 0, 1.72, 0.02); capTop.scale.set(1, 0.85, 1.05); // flight cap
  for (const s of [-1, 1]) { const flap = add(root, box(0.08, 0.24, 0.16), M(p.dark), s * 0.27, 1.56, 0.02); flap.rotation.z = s * 0.15; }
  add(root, box(0.42, 0.06, 0.06), M(0x6b4a33), 0, 1.8, -0.24, false);                           // goggle strap
  for (const s of [-1, 1]) {                                                                      // goggles pushed up on the cap
    add(root, cyl(0.08, 0.08, 0.07, 12), M(p.trim), s * 0.1, 1.82, -0.26).rotation.x = Math.PI / 2;
    add(root, new THREE.CircleGeometry(0.06, 12), M(0x7af0ff, 0.6), s * 0.1, 1.82, -0.3, false).rotation.y = Math.PI;
  }
  for (let i = 0; i < 4; i++) add(root, sph(0.06, 6, 4), M(0xb5562e), -0.18 + i * 0.03, 1.5 - i * 0.02, 0.24 + i * 0.03, false); // red braid tail
  const scarf = []; let prev = root;                                                              // long white aviator scarf
  for (let i = 0; i < 7; i++) {
    const seg = new THREE.Group(); seg.position.set(i ? 0 : -0.08, i ? 0 : 1.44, i ? 0.16 : 0.25); prev.add(seg);
    add(seg, box(0.12, 0.04, 0.18), M(0xffffff), 0, 0, 0.07); scarf.push(seg); prev = seg;
  }
  // folded glider wings on the back
  const wings = [];
  for (const s of [-1, 1]) {
    const w = new THREE.Group(); w.position.set(s * 0.12, 1.4, 0.42); root.add(w);
    add(w, box(0.9, 0.05, 0.34), M(0xf6ecd9), s * 0.45, 0, 0);
    add(w, box(0.9, 0.06, 0.06), M(p.trim), s * 0.45, 0.01, -0.16, false);
    for (let k = 1; k < 3; k++) add(w, box(0.03, 0.07, 0.34), M(p.main), s * k * 0.3, 0.01, 0, false);
    w.rotation.z = s * 0.9; wings.push(w);
  }
  add(root, box(0.3, 0.4, 0.18), M(p.dark), 0, 1.25, 0.38);                                       // harness pack
  // crossbow: stock, limbs and a string
  const gun = gunMount(root, 0.42, 1.14, -0.32);
  add(gun, box(0.1, 0.12, 0.62), M(0x6b4a33));
  for (const s of [-1, 1]) { const limbM = add(gun, box(0.34, 0.05, 0.05), M(p.trim), s * 0.17, 0.02, -0.26); limbM.rotation.y = s * 0.35; }
  add(gun, box(0.6, 0.01, 0.01), M(0xffffff), 0, 0.02, -0.16, false);
  add(gun, box(0.03, 0.03, 0.4), M(0xb0b8c4), 0, 0.07, -0.2, false);                              // bolt
  const o = { root, gun: tipAt(gun, -0.45), ...common(root, team, legs, arms) };
  o.anim = (dt, speed, t) => {
    const k = walk(o, dt, speed, t);
    scarf.forEach((s, i) => { s.rotation.x = -0.3 - k * 0.5 + Math.sin(t * 8 - i) * (0.12 + k * 0.2); s.rotation.y = Math.sin(t * 4 - i * 0.6) * 0.2; });
    wings.forEach((w, i) => { w.rotation.z = (i ? 1 : -1) * (0.9 + Math.sin(t * 2.4) * 0.05 + k * 0.08); });
    torso.rotation.x = -k * 0.1;
  };
  return o;
}

// ---------------- Snapjaw: crocodile ferryman ----------------
function croc(p, team) {
  const root = new THREE.Group();
  const legs = [limb(root, -0.19, 0.84, 0.46, 0.15, M(p.main), M(p.dark)), limb(root, 0.19, 0.84, 0.46, 0.15, M(p.main), M(p.dark))];
  for (const l of legs) for (const s of [-1, 0, 1]) add(l, new THREE.ConeGeometry(0.035, 0.1, 4), M(0xf4efd8), s * 0.09, -0.95, -0.3, false).rotation.x = -Math.PI / 2; // claws
  const torso = add(root, cap(0.42, 0.42), M(p.main), 0, 1.14, 0); torso.scale.set(1.1, 1, 0.95);
  const belly = add(root, sph(0.36, 14, 10), M(p.skin), 0, 1.08, -0.16); belly.scale.set(0.9, 1.15, 0.55);  // pale scaly belly
  for (let i = 0; i < 4; i++) add(root, box(0.42 - i * 0.04, 0.025, 0.05), M(p.dark), 0, 0.88 + i * 0.13, -0.34, false); // belly scutes
  // ferryman's waistcoat and a rope belt
  for (const s of [-1, 1]) add(root, box(0.2, 0.55, 0.06), M(p.dark), s * 0.24, 1.18, -0.36);
  add(root, new THREE.TorusGeometry(0.44, 0.045, 6, 20), M(p.trim), 0, 0.86, 0).rotation.x = Math.PI / 2;
  // ridged back
  for (let i = 0; i < 5; i++) add(root, new THREE.ConeGeometry(0.07, 0.16, 4), M(p.dark), 0, 1.5 - i * 0.16, 0.41 - i * 0.01, false).rotation.x = 0.6;
  const arms = [limb(root, 0.52, 1.4, 0.44, 0.14, M(p.main))];
  const armL = limb(root, -0.52, 1.4, 0.44, 0.14, M(p.main)); armL.rotation.x = -1.0;
  add(armL, cyl(0.16, 0.16, 0.12), M(team), 0, -0.24, 0);
  add(armL, sph(0.13, 8, 6), M(p.main), 0, -0.64, 0);
  // the head: a long snout with a jaw that opens
  const head = new THREE.Group(); head.position.set(0, 1.62, 0); root.add(head);
  const skull = add(head, sph(0.27, 14, 10), M(p.main), 0, 0.02, 0.02); skull.scale.set(1.05, 0.85, 1.1);
  const snout = add(head, box(0.34, 0.14, 0.52), M(p.main), 0, 0.0, -0.4);
  add(head, box(0.3, 0.04, 0.48), M(p.dark), 0, 0.075, -0.4, false);
  for (const s of [-1, 1]) add(head, sph(0.03, 5, 4), M(INK), s * 0.08, 0.08, -0.62, false);           // nostrils
  const jaw = new THREE.Group(); jaw.position.set(0, -0.06, -0.12); head.add(jaw);
  add(jaw, box(0.3, 0.08, 0.5), M(p.skin), 0, -0.04, -0.28);
  for (const s of [-1, 1]) for (let i = 0; i < 5; i++) {                                                 // two rows of teeth
    add(head, new THREE.ConeGeometry(0.025, 0.08, 4), M(0xf4efd8), s * 0.15, -0.09, -0.22 - i * 0.1, false).rotation.x = Math.PI;
    add(jaw, new THREE.ConeGeometry(0.022, 0.07, 4), M(0xf4efd8), s * 0.13, 0.03, -0.12 - i * 0.1, false);
  }
  for (const s of [-1, 1]) {                                                                              // raised eyes on top
    add(head, sph(0.09, 8, 6), M(p.main), s * 0.13, 0.17, -0.08);
    add(head, sph(0.06, 8, 6), M(0xffe14a, 0.4), s * 0.14, 0.19, -0.13, false);
    add(head, box(0.015, 0.07, 0.02), M(INK), s * 0.14, 0.19, -0.185, false);
  }
  // battered ferryman's cap
  add(head, cyl(0.24, 0.26, 0.12, 14), M(p.dark), 0, 0.22, 0.04);
  add(head, box(0.34, 0.03, 0.18), M(INK), 0, 0.17, -0.18, false);
  add(head, box(0.14, 0.06, 0.02), M(p.trim), 0, 0.24, -0.2, false);
  // tail
  const tail = []; let prev = root;
  for (let i = 0; i < 6; i++) {
    const seg = new THREE.Group(); seg.position.set(0, i ? -0.02 : 0.82, i ? 0.26 : 0.32); prev.add(seg);
    add(seg, cap(0.15 - i * 0.022, 0.18), M(p.main), 0, 0, 0.12).rotation.x = Math.PI / 2;
    if (i < 5) add(seg, new THREE.ConeGeometry(0.04, 0.1, 4), M(p.dark), 0, 0.13 - i * 0.02, 0.12, false);
    tail.push(seg); prev = seg;
  }
  // bog mortar: a stubby barrel with a hopper of mud
  const gun = gunMount(root, 0.52, 1.14, -0.3);
  add(gun, cyl(0.12, 0.14, 0.56, 12), M(0x6b4a33), 0, 0, -0.08).rotation.x = Math.PI / 2;
  add(gun, cyl(0.15, 0.15, 0.06, 12), M(p.trim), 0, 0, -0.36).rotation.x = Math.PI / 2;
  add(gun, cyl(0.09, 0.09, 0.07, 10), M(0x5a3e1f), 0, 0, -0.38, false).rotation.x = Math.PI / 2;
  const mud = add(gun, sph(0.13, 10, 8), M(0x7a5a2a), 0, 0.17, 0.08);
  const o = { root, gun: tipAt(gun, -0.42), ...common(root, team, legs, arms) };
  o.anim = (dt, speed, t) => {
    const k = walk(o, dt, speed, t);
    tail.forEach((s, i) => { s.rotation.y = Math.sin(t * 3 + i * 0.7) * (0.12 + k * 0.12); s.rotation.x = 0.12; });
    jaw.rotation.x = 0.08 + Math.max(0, Math.sin(t * 1.3)) * 0.18;          // idle snap snap
    mud.scale.y = 0.85 + Math.sin(t * 2) * 0.1;
    torso.rotation.z = Math.sin(o.walkT || 0) * 0.05 * k;
  };
  return o;
}

// ---------------- Cavalier: knight on a pony called Pudding ----------------
function cavalier(p, team) {
  const root = new THREE.Group();
  const pony = new THREE.Group(); root.add(pony);
  const coat = M(0x9a9aa2), mane = M(0x4a4a52);
  const barrel = add(pony, cap(0.32, 0.7), coat, 0, 0.78, 0.05); barrel.rotation.x = Math.PI / 2;
  // caparison: the cloth over the pony in team-ish trim
  const cloth = add(pony, box(0.7, 0.32, 1.0), M(p.trim), 0, 0.72, 0.05); cloth.scale.set(1, 1, 1);
  add(pony, box(0.72, 0.05, 1.02), M(0xffe08a), 0, 0.56, 0.05, false);
  const neck = add(pony, cap(0.16, 0.36), coat, 0, 1.0, -0.55); neck.rotation.x = -0.55;
  const ponyHead = new THREE.Group(); ponyHead.position.set(0, 1.18, -0.78); pony.add(ponyHead);
  const ph = add(ponyHead, box(0.24, 0.24, 0.46), coat, 0, 0, -0.08); ph.rotation.x = 0.5;
  for (const s of [-1, 1]) {
    add(ponyHead, new THREE.ConeGeometry(0.05, 0.14, 4), coat, s * 0.08, 0.2, 0.06);                  // ears
    add(ponyHead, sph(0.035, 6, 4), M(INK), s * 0.125, 0.06, -0.08, false);                            // eyes
  }
  add(ponyHead, sph(0.1, 8, 6), M(0xd8c4c0), 0, -0.13, -0.28, false);                                  // soft nose
  for (let i = 0; i < 5; i++) add(pony, box(0.06, 0.12, 0.1), mane, 0, 1.12 - i * 0.04, -0.62 + i * 0.1, false); // mane
  add(ponyHead, box(0.06, 0.14, 0.12), mane, 0, 0.18, -0.02, false);                                  // forelock
  const ponyTail = add(pony, cap(0.07, 0.4), mane, 0, 0.72, 0.62); ponyTail.rotation.x = 0.5;
  const pl = (x, z) => { const l = limb(pony, x, 0.7, 0.5, 0.075, coat, M(INK)); l.position.z = z; return l; };
  const fl = pl(-0.16, -0.35), fr = pl(0.16, -0.35), bl = pl(-0.16, 0.42), br = pl(0.16, 0.42);
  add(pony, box(0.36, 0.06, 0.24), M(0x6b4a33), 0, 1.0, 0.02);                                         // saddle
  // the rider, sitting tall so the head stays at the usual height
  const torso = add(root, cap(0.3, 0.3), M(p.main), 0, 1.24, 0.04);                                    // breastplate
  add(root, box(0.46, 0.34, 0.08), M(p.main), 0, 1.26, -0.24);
  add(root, box(0.12, 0.3, 0.02), M(p.trim), 0, 1.26, -0.29, false);                                   // red cross on the plate
  add(root, box(0.3, 0.1, 0.02), M(p.trim), 0, 1.3, -0.29, false);
  for (const s of [-1, 1]) {
    const pd = add(root, sph(0.18, 10, 8), M(p.main), s * 0.38, 1.44, 0.04); pd.scale.y = 0.7;         // pauldrons
    const thigh = add(root, cap(0.1, 0.3), M(p.dark), s * 0.28, 0.98, -0.12); thigh.rotation.x = Math.PI / 2.4; thigh.rotation.z = s * 0.3;
    add(root, cyl(0.09, 0.09, 0.38, 8), M(p.main), s * 0.4, 0.74, -0.24);                              // greaves in stirrups
  }
  const cape = add(root, box(0.6, 0.9, 0.04), M(p.trim), 0, 1.06, 0.33); cape.rotation.x = 0.2;
  const arms = [limb(root, 0.4, 1.42, 0.4, 0.1, M(p.main))];
  const armL = limb(root, -0.4, 1.42, 0.4, 0.1, M(p.main)); armL.rotation.x = -1.0;
  add(armL, cyl(0.12, 0.12, 0.12), M(team), 0, -0.22, 0);
  add(armL, sph(0.1, 8, 6), M(p.dark), 0, -0.56, 0);
  add(root, cyl(0.012, 0.012, 0.6, 4), M(0x6b4a33), -0.3, 1.0, -0.6).rotation.x = 1.1;                // reins
  add(root, sph(0.25), M(p.skin), 0, 1.64, 0);
  const helm = add(root, new THREE.SphereGeometry(0.29, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), M(p.main), 0, 1.66, 0);
  add(root, box(0.36, 0.05, 0.05), M(p.dark), 0, 1.7, -0.27, false);                                  // visor brow
  const plume = []; for (let i = 0; i < 4; i++) plume.push(add(root, sph(0.08 - i * 0.008, 6, 4), M(p.trim), 0, 1.98 - i * 0.03, 0.02 + i * 0.1, false));
  for (let i = 0; i < 3; i++) add(root, sph(0.07, 6, 4), M(0x8a4a2a), 0.12 - i * 0.1, 1.5, 0.2, false); // auburn braid
  // lance slung on the back, carbine in hand
  const lance = add(root, cyl(0.025, 0.05, 2.2, 8), M(0xd9d0c0), 0.24, 1.4, 0.32); lance.rotation.x = -0.35; lance.rotation.z = -0.3;
  add(root, new THREE.ConeGeometry(0.1, 0.24, 8), M(p.trim), 0.55, 2.38, 0.0, false).rotation.set(-0.35, 0, -0.3);
  const gun = gunMount(root, 0.4, 1.16, -0.3);
  add(gun, box(0.08, 0.1, 0.36), M(0x6b4a33), 0, -0.02, 0.1);
  add(gun, cyl(0.03, 0.03, 0.56, 8), M(0x3a3f4a), 0, 0.03, -0.24).rotation.x = Math.PI / 2;
  add(gun, new THREE.TorusGeometry(0.06, 0.015, 4, 10), M(0xffe08a), 0, -0.08, 0.02, false);          // lever loop
  const o = { root, gun: tipAt(gun, -0.52), ...common(root, team, [fl, fr], arms) };
  o.anim = (dt, speed, t) => {
    const k = walk(o, dt, speed, t);
    const g = Math.sin(o.walkT || 0) * 0.7 * k;
    bl.rotation.x = -g; br.rotation.x = g;                       // trot: diagonal pairs move together
    pony.position.y = Math.abs(Math.sin((o.walkT || 0))) * 0.06 * k;
    torso.position.y = 1.24 + pony.position.y;
    ponyHead.rotation.x = Math.sin(t * 1.5) * 0.06 - k * 0.1;
    ponyTail.rotation.z = Math.sin(t * 2.5) * 0.25;
    cape.rotation.x = 0.2 + k * 0.4 + Math.sin(t * 6) * 0.04 * k;
    plume.forEach((m, i) => { m.position.z = 0.02 + i * (0.1 + k * 0.03); });
    helm.rotation.z = 0;
  };
  return o;
}

export const SEASON_MODELS = { tempo, kestrel, croc, cavalier };
