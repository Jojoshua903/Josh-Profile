import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { kit, body, face, finish, gunAt, part, joint, chain, ball, pill, tube, cone, ring, slab, dome, hood } from './rig.js?v=20261128e';

// Launch roster, rebuilt on the stylised rig (rig.js).

// ---------------- Bulwark: retired harbour warden ----------------
function vanguard(p, team) {
  const K = kit(p);
  const P = body(K, { w: 1.3, torso: [0.27, 0.3, 0.37, 0.33, 0.56], flat: 0.85, top: K.main, pants: K.dark, boots: K.ink, gloves: K.leather, sleeves: K.main });
  face(P, K, { brow: -0.15, mouth: 'flat', cheeks: true });
  // brass chest plate with an anchor, heavy belt
  const plate = part(P.spine, ball(0.3), K.gold, 0, 0.32, -0.2, 1.05, 0.85, 0.35);
  part(P.spine, slab(0.05, 0.22, 0.03), K.ink, 0, 0.33, -0.31);
  part(P.spine, ring(0.07, 0.015, Math.PI), K.ink, 0, 0.24, -0.31).rotation.z = Math.PI;
  part(P.hips, tube(0.33, 0.33, 0.09), K.leather, 0, 0.1, 0, 1, 1, 0.8);
  part(P.hips, slab(0.1, 0.08, 0.03), K.gold, 0, 0.1, -0.27);
  for (const a of [P.armR, P.armL]) part(a, ball(0.16), K.gold, 0, 0.04, 0, 1, 0.7, 1);          // pauldrons
  // diving-style helmet, grey moustache and braid
  part(P.head, dome(0.33), K.main, 0, 0.1, 0.02, 1, 0.85, 1.04);
  part(P.head, ring(0.31, 0.03), K.gold, 0, 0.02, 0.02).rotation.x = Math.PI / 2;
  part(P.head, pill(0.035, 0.18), K.c(0xdfe3e6, { rough: 0.9 }), 0, -0.07, -0.27).rotation.z = Math.PI / 2;
  const braid = chain(P.head, 4, 0.11, K.c(0xdfe3e6, { rough: 0.9 }), 0, -0.05, 0.25, 0.06, 0.04, [0, -0.7, 0.3]);
  // Tidebreaker Rifle: chunky barrel with brass bands
  const gun = gunAt(P);
  part(gun, slab(0.16, 0.18, 0.5), K.dark, 0, 0, 0.05);
  part(gun, tube(0.06, 0.07, 0.5), K.steel, 0, 0.03, -0.38).rotation.x = Math.PI / 2;
  for (const z of [-0.2, -0.45]) part(gun, tube(0.08, 0.08, 0.05), K.gold, 0, 0.03, z).rotation.x = Math.PI / 2;
  part(gun, slab(0.12, 0.1, 0.2), K.leather, 0, -0.06, 0.32);
  return finish(P, team, gun, -0.65, (dt, s, t, k) => braid.wave(t, k, 0.1, 4), { aim: [1.05, 0.55] });
}

// ---------------- Zip: courier ----------------
function striker(p, team) {
  const K = kit(p);
  const P = body(K, { w: 0.9, shoes: 'sneaker', soles: K.c(p.trim, { glow: 0.8 }), boots: K.white, top: K.main, pants: K.dark, gloves: K.ink });
  face(P, K, { brow: 0.2, mouth: 'smirk' });
  part(P.spine, slab(0.035, 0.42, 0.02), K.trim, 0.06, 0.3, -0.21);                                  // jacket zip
  part(P.spine, ring(0.17, 0.05), K.main, 0, 0.55, 0).rotation.x = Math.PI / 2;                       // collar
  // backwards cap with spiky hair poking out
  part(P.head, dome(0.31), K.trim, 0, 0.12, 0.01, 1, 0.75, 1);
  part(P.head, slab(0.26, 0.03, 0.2), K.trim, 0, 0.1, 0.3).rotation.x = -0.25;
  for (let i = 0; i < 6; i++) { const sp = part(P.head, cone(0.06, 0.2, 10), K.c(0x2b1d14, { rough: 0.9 }), -0.2 + i * 0.08, 0.06, -0.2 + Math.abs(i - 2.5) * 0.02); sp.rotation.x = -0.9; sp.rotation.z = (i - 2.5) * 0.15; }
  // satchel across the back and a trailing scarf
  part(P.spine, ball(0.18), K.leather, -0.12, 0.2, 0.22, 1, 0.9, 0.5);
  part(P.spine, ring(0.33, 0.02), K.leather, 0, 0.3, 0).rotation.set(Math.PI / 2, 0.6, 0);
  const scarf = chain(P.spine, 6, 0.12, K.trim, 0.08, 0.58, 0.14, 0.05, 0.035);
  // Hornet SMG: compact body, stubby barrel, long mag
  const gun = gunAt(P);
  part(gun, slab(0.1, 0.14, 0.36), K.dark);
  part(gun, tube(0.035, 0.035, 0.18), K.steel, 0, 0.02, -0.26).rotation.x = Math.PI / 2;
  part(gun, slab(0.06, 0.22, 0.08), K.trim, 0, -0.14, -0.04);
  part(gun, slab(0.11, 0.03, 0.3), K.trim, 0, 0.08, 0, 1, 1, 1);
  return finish(P, team, gun, -0.38, (dt, s, t, k) => scarf.wave(t, k, 0.18, 9), { stride: 1.75 });
}

// ---------------- Cinder: royal pyrotechnician ----------------
function ember(p, team) {
  const K = kit(p);
  const P = body(K, { w: 0.95, torso: [0.34, 0.2, 0.26, 0.25, 0.56], top: K.main, pants: K.dark, gloves: K.white });
  face(P, K, { brow: 0.1, mouth: 'smile', lashes: true });
  part(P.hips, tube(0.24, 0.45, 0.55), K.main, 0, -0.2, 0);                                           // flared coat skirt
  part(P.hips, tube(0.245, 0.455, 0.06), K.trim, 0, -0.46, 0);
  const apron = part(P.spine, slab(0.34, 0.6, 0.03), K.white, 0, 0.05, -0.2); apron.rotation.x = -0.12;
  for (let i = 0; i < 3; i++) part(P.spine, ball(0.025), K.gold, 0, 0.42 - i * 0.1, -0.22);
  // top hat with a fuse feather, auburn bob
  part(P.head, dome(0.315, Math.PI * 0.62), K.c(0x8a3a1f, { rough: 0.9 }), 0, 0.06, 0.04, 1.05, 1, 1.05);   // auburn bob
  part(P.head, ball(0.2), K.c(0x8a3a1f, { rough: 0.9 }), 0, -0.04, 0.16, 1.4, 0.9, 0.9);
  part(P.head, tube(0.33, 0.33, 0.03), K.ink, 0, 0.24, 0);
  part(P.head, tube(0.2, 0.22, 0.32), K.ink, 0, 0.4, 0);
  part(P.head, tube(0.215, 0.215, 0.06), K.trim, 0, 0.3, 0);
  const fuse = part(P.head, ball(0.035), K.c(0xffd23c, { glow: 1.2 }), 0.12, 0.62, 0.05); fuse.userData.live = true;
  // copper rocket tank with a little chimney
  part(P.spine, pill(0.15, 0.3), K.c(0xb87333, { rough: 0.3, metal: 0.3 }), 0, 0.3, 0.28);
  part(P.spine, tube(0.04, 0.05, 0.2), K.ink, 0.08, 0.68, 0.3);
  // Grand Finale: a shoulder launcher
  const gun = gunAt(P, 0.3, 1.42, -0.2);
  part(gun, tube(0.13, 0.11, 0.7), K.trim, 0, 0, -0.1).rotation.x = Math.PI / 2;
  for (const z of [-0.4, 0.2]) part(gun, tube(0.145, 0.145, 0.06), K.gold, 0, 0, z).rotation.x = Math.PI / 2;
  part(gun, ring(0.1, 0.025), K.ink, 0, 0, -0.45);
  return finish(P, team, gun, -0.5, (dt, s, t) => { fuse.scale.setScalar(0.8 + Math.random() * 0.6); }, { aim: [2.2, 0.9], off: [1.1, 0.9, 0.5] });
}

// ---------------- Lantern: hooded sniper monk ----------------
function warden(p, team) {
  const K = kit(p);
  const P = body(K, { w: 0.95, torso: [0.3, 0.22, 0.27, 0.26, 0.58], top: K.main, pants: K.main, boots: K.dark, gloves: K.dark });
  face(P, K, { brow: -0.05, mouth: 'flat', eyeColor: 0x8a5cff });
  part(P.hips, tube(0.24, 0.42, 0.75), K.main, 0, -0.3, 0);                                           // robe
  const sash = part(P.spine, ring(0.28, 0.035), K.trim, 0, 0.05, 0); sash.rotation.x = Math.PI / 2;
  part(P.spine, ball(0.34), K.dark, 0, 0.45, 0.02, 1.1, 0.5, 1);                                       // mantle
  // deep hood with a drooping tip
  part(P.head, hood(0.37), K.c(p.main, { double: true }), 0, 0.04, 0.04, 1, 1.05, 1.05);
  part(P.head, ring(0.27, 0.045), K.dark, 0, 0.0, -0.2, 1, 1.15, 1);
  const tipH = chain(P.head, 3, 0.12, K.main, 0, 0.18, 0.32, 0.09, 0.04, [0, -0.3, 0.9]);
  // glowing lantern on the belt
  const lamp = joint(P.hips, -0.28, 0.05, -0.1);
  part(lamp, tube(0.06, 0.07, 0.14, 12), K.gold, 0, -0.1, 0);
  const flame = part(lamp, ball(0.05), K.c(0xffe08a, { glow: 1.4 }), 0, -0.1, 0); flame.userData.live = true;
  // Vigil Rail: long rifle with glowing rings
  const gun = gunAt(P);
  part(gun, slab(0.09, 0.12, 0.6), K.dark, 0, 0, 0.08);
  part(gun, tube(0.03, 0.03, 0.75), K.steel, 0, 0.02, -0.55).rotation.x = Math.PI / 2;
  for (let i = 0; i < 3; i++) part(gun, ring(0.06, 0.015), K.c(p.trim, { glow: 0.9 }), 0, 0.02, -0.35 - i * 0.18);
  part(gun, tube(0.035, 0.04, 0.2), K.ink, 0, 0.11, -0.05).rotation.x = Math.PI / 2;                 // scope
  return finish(P, team, gun, -0.95, (dt, s, t, k) => { tipH.wave(t, k, 0.08, 3); lamp.rotation.x = Math.sin(t * 2.5) * 0.25 * (0.4 + k); flame.scale.setScalar(0.9 + Math.sin(t * 9) * 0.1); });
}

// ---------------- Thicket: exiled royal botanist ----------------
function thicket(p, team) {
  const K = kit(p);
  const P = body(K, { w: 1, top: K.main, pants: K.dark, boots: K.leather, gloves: K.c(0x8a6a3c, { rough: 0.9 }) });
  face(P, K, { brow: 0.05, mouth: 'smile', cheeks: true });
  part(P.spine, slab(0.36, 0.5, 0.03), K.c(0x8a6a3c, { rough: 0.9 }), 0, 0.2, -0.21);                 // gardening apron
  part(P.hips, ball(0.09), K.leather, 0.24, 0.0, -0.1, 1, 1.1, 0.7);                                   // seed pouch
  // dark curls under a wide straw hat
  for (let i = 0; i < 7; i++) { const a = i / 6 * Math.PI; part(P.head, ball(0.1), K.c(0x2b1d14, { rough: 0.95 }), Math.cos(a) * 0.25, 0.02 + (i % 2) * 0.06, Math.sin(a) * 0.2 + 0.05); }   // curls round the back
  part(P.head, tube(0.5, 0.5, 0.03), K.c(0xe8c56a, { rough: 0.95 }), 0, 0.2, 0);
  part(P.head, ball(0.24), K.c(0xe8c56a, { rough: 0.95 }), 0, 0.22, 0, 1, 0.55, 1);
  part(P.head, tube(0.245, 0.245, 0.05), K.trim, 0, 0.24, 0);
  const flower = part(P.head, ball(0.05), K.c(0xff5f8f), 0.2, 0.28, -0.08); flower.userData.live = true;
  // planter backpack with sprouts that sway
  part(P.spine, tube(0.2, 0.17, 0.32), K.c(0xb8643a, { rough: 0.9 }), 0, 0.32, 0.27);
  const sprouts = [];
  for (let i = 0; i < 5; i++) { const s = joint(P.spine, -0.12 + i * 0.06, 0.48, 0.27 + (i % 2) * 0.05); part(s, pill(0.018, 0.2 + (i % 3) * 0.06), K.c(0x4f9a48), 0, 0.12, 0); part(s, ball(0.05), K.c(i % 2 ? 0x6fbf4a : 0xff5f8f), 0, 0.26 + (i % 3) * 0.06, 0, 1.3, 0.5, 1); sprouts.push(s); }
  // Thornburst: a wooden blunderbuss wrapped in vines
  const gun = gunAt(P);
  part(gun, slab(0.1, 0.13, 0.4), K.leather, 0, 0, 0.05);
  part(gun, tube(0.11, 0.05, 0.4), K.c(0x8a6a3c, { rough: 0.8 }), 0, 0.02, -0.32).rotation.x = Math.PI / 2;
  for (let i = 0; i < 3; i++) part(gun, ring(0.07, 0.012), K.c(0x4f9a48), 0, 0.02, -0.15 - i * 0.12).rotation.y = 0.4;
  return finish(P, team, gun, -0.52, (dt, s, t, k) => { sprouts.forEach((g, i) => { g.rotation.x = Math.sin(t * 3 + i) * (0.08 + k * 0.2); g.rotation.z = Math.cos(t * 2.4 + i) * 0.08; }); flower.rotation.y += dt; });
}

// ---------------- Ratchet: clocktower tinkerer ----------------
function ratchet(p, team) {
  const K = kit(p);
  const P = body(K, { w: 1.1, torso: [0.25, 0.28, 0.32, 0.29, 0.54], top: K.main, pants: K.dark, boots: K.ink, gloves: K.leather, sleeves: K.main });
  face(P, K, { brow: 0.08, mouth: 'open' });
  part(P.spine, slab(0.4, 0.55, 0.03), K.leather, 0, 0.2, -0.24);                                    // leather apron
  for (let i = 0; i < 3; i++) part(P.spine, slab(0.03, 0.12, 0.03), K.steel, -0.1 + i * 0.1, 0.42, -0.27); // tools in the pocket
  // big beard, goggles on the brow, bald crown
  part(P.head, ball(0.22), K.c(0xb5562e, { rough: 0.95 }), 0, -0.13, -0.12, 1.2, 1, 0.9);
  part(P.head, ring(0.3, 0.025), K.leather, 0, 0.12, 0).rotation.x = Math.PI / 2 - 0.25;
  for (const s of [-1, 1]) { part(P.head, tube(0.075, 0.075, 0.07), K.gold, s * 0.11, 0.17, -0.24).rotation.x = Math.PI / 2 - 0.25; part(P.head, ball(0.055), K.glass, s * 0.11, 0.17, -0.28, 1, 1, 0.4); }
  // mechanical left arm: brass segments and a claw
  for (const j of [P.armL, P.elbowL]) part(j, tube(0.09, 0.08, 0.26, 16), K.gold, 0, -0.14, 0);
  part(P.elbowL, ball(0.09), K.steel, 0, -0.27, 0);
  // backpack engine: a cog, a chimney and an antenna
  part(P.spine, slab(0.42, 0.42, 0.24), K.dark, 0, 0.3, 0.27);
  const cog = part(P.spine, tube(0.15, 0.15, 0.05, 12), K.gold, 0, 0.32, 0.4); cog.rotation.x = Math.PI / 2; cog.userData.live = true;
  part(P.spine, pill(0.012, 0.4), K.ink, 0.15, 0.75, 0.3);
  const bulb = part(P.spine, ball(0.04), K.c(0xff5a36, { glow: 1 }), 0.15, 0.98, 0.3); bulb.userData.live = true;
  // Rivet Driver: boxy nailer with a rivet drum
  const gun = gunAt(P);
  part(gun, slab(0.13, 0.16, 0.42), K.trim);
  part(gun, tube(0.11, 0.11, 0.1, 16), K.gold, 0, -0.12, -0.02).rotation.z = Math.PI / 2;
  part(gun, tube(0.035, 0.035, 0.2), K.steel, 0, 0.02, -0.3).rotation.x = Math.PI / 2;
  return finish(P, team, gun, -0.42, (dt, s, t) => { cog.rotation.y += dt * 3; bulb.visible = Math.sin(t * 4) > -0.3; });
}

export const ROSTER_A = { vanguard, striker, ember, warden, thicket, ratchet };
