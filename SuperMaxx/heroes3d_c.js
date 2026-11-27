import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { kit, body, face, finish, gunAt, part, joint, chain, ball, pill, tube, cone, ring, slab, dome, live } from './rig.js?v=20261128l';

// Slot machine heroes on the stylised rig: Gloop, Torque, Nutcracker, Larkspur, Pirouette, Burrow, Stitch, Dynamo and Mortar, plus the contract heroes Beef Wellington, Crook and The Microwave.

// ---------------- Gloop: a professor made of slime ----------------
function slime(p, team) {
  const K = kit(p), f = p.finish || {};
  const goo = K.c(p.main, { rough: 0.08, metal: f.metal || 0.05, glow: (f.glow || 0) + 0.12, rim: 0.7 });
  const deep = K.c(p.dark, { rough: 0.1, glow: 0.1, rim: 0.6 });
  const P = body(K, { w: 1.2, legs: false, headR: 0, torso: [0.36, 0.38, 0.36, 0.27, 0.56], flat: 1, top: goo, sleeves: goo, forearms: goo, gloves: goo, pants: goo });
  P.neck.visible = false;
  // the body is one big wobbling blob that pools on the floor
  const base = live(part(P.root, ball(0.55), goo, 0, 0.48, 0, 1.15, 0.95, 1.1));
  const puddle = live(part(P.root, ball(0.6), goo, 0, 0.05, 0, 1.25, 0.12, 1.25));
  // head: a rounder blob with the professor's face, spectacles and a tuft of tweed hat
  part(P.head, ball(0.31), goo, 0, -0.03, 0, 1.05, 0.95, 1);
  face(P, K, { r: 0.31, mouth: 'open', brow: 0.2, eyeColor: p.dark });
  for (const s of [-1, 1]) part(P.head, ring(0.07, 0.012), K.ink, s * 0.105, 0.035, -0.3);
  part(P.head, slab(0.07, 0.012, 0.012), K.ink, 0, 0.035, -0.3);
  part(P.head, tube(0.17, 0.2, 0.1), K.c(0x7a5a3c, { rough: 0.9 }), 0.05, 0.28, 0.03).rotation.z = -0.25;
  part(P.head, tube(0.26, 0.26, 0.02), K.c(0x7a5a3c, { rough: 0.9 }), 0.05, 0.23, 0.03).rotation.z = -0.25;
  // a glowing nucleus and floating bubbles inside the goo
  const nuc = live(part(P.spine, ball(0.13), K.c(p.trim, { rough: 0.2, glow: 0.7 }), 0, 0.22, 0));
  const bubbles = [0, 1, 2, 3, 4].map(i => live(part(P.root, ball(0.04 + (i % 3) * 0.015), K.c(0xffffff, { rough: 0.05, glow: 0.3 }), (i - 2) * 0.12, 0.3, -0.25 + (i % 2) * 0.1)));
  // drips off the arms and a bow tie that never quite stays on
  for (const a of [P.elbowR, P.elbowL]) part(a, ball(0.05), deep, 0, -0.34, 0.02, 0.8, 1.4, 0.8);
  part(P.spine, cone(0.05, 0.1, 10), K.c(0xc23b3b), -0.05, 0.5, -0.27).rotation.z = Math.PI / 2;
  part(P.spine, cone(0.05, 0.1, 10), K.c(0xc23b3b), 0.05, 0.5, -0.27).rotation.z = -Math.PI / 2;
  // two blobby feet so the walk and fall poses have something to move
  const legs = [-1, 1].map(s => { const l = joint(P.root, s * 0.22, 0.32, 0); part(l, ball(0.17), goo, 0, -0.18, -0.04, 1, 0.7, 1.2); return l; });
  // Goo Lobber: a flask on a squeeze bulb
  const gun = gunAt(P, 0.3, 1.18, -0.44);
  part(gun, tube(0.1, 0.12, 0.3), K.c(0xdff6ff, { rough: 0.05, glow: 0.15 }), 0, 0, 0).rotation.x = Math.PI / 2;
  const tank = live(part(gun, ball(0.09), K.c(p.main, { rough: 0.05, glow: 0.5 }), 0, 0, 0.02, 1, 1, 1.4));
  part(gun, tube(0.05, 0.03, 0.18), K.steel, 0, 0, -0.24).rotation.x = Math.PI / 2;
  part(gun, ball(0.08), K.c(0xc23b3b, { rough: 0.6 }), 0, -0.02, 0.2);
  return finish(P, team, gun, -0.34, (dt, s, t, k, w) => {
    const wob = Math.sin(t * 5) * 0.05 + Math.sin(w * 2) * 0.06 * k;
    base.scale.set(1.15 + wob, 0.95 - wob, 1.1 + wob);
    puddle.scale.set(1.25 + wob * 2, 0.12, 1.25 + wob * 2);
    nuc.position.y = 0.22 + Math.sin(t * 2.2) * 0.05; nuc.rotation.y += dt;
    bubbles.forEach((b, i) => { b.position.y = 0.2 + ((t * 0.35 + i * 0.21) % 1) * 0.75; });
    tank.scale.y = 1 + Math.sin(t * 4) * 0.08;
    P.head.position.y = 0.71 + Math.sin(t * 3.2) * 0.03;
  }, { legs, stride: 1.25 });
}

// ---------------- Torque: roller derby brawler ----------------
function brawler(p, team) {
  const K = kit(p);
  const P = body(K, { w: 1.08, shoes: 'sneaker', boots: K.white, soles: K.dark, top: K.main, sleeves: K.main, forearms: K.skin, pants: K.dark, gloves: K.trim });
  face(P, K, { brow: -0.12, mouth: 'smirk' });
  // jersey number, knee and elbow pads
  part(P.spine, slab(0.14, 0.16, 0.02), K.white, 0, 0.3, -0.24); part(P.spine, slab(0.04, 0.12, 0.022), K.dark, 0, 0.3, -0.25);
  for (const kn of [P.kneeL, P.kneeR]) part(kn, ball(0.11), K.ink, 0, 0.02, -0.04, 1, 0.9, 0.8);
  for (const el of [P.elbowR, P.elbowL]) part(el, ball(0.085), K.ink, 0, 0.01, 0.02);
  // derby helmet with a star, mouthguard grin
  part(P.head, dome(0.315, Math.PI * 0.55), K.trim, 0, 0.04, 0.02, 1, 1, 1.04);
  part(P.head, ring(0.31, 0.02), K.dark, 0, 0.1, 0.01).rotation.x = Math.PI / 2;
  part(P.head, cone(0.05, 0.04, 5), K.white, 0, 0.27, -0.2).rotation.x = -1.1;
  // roller skates: four wheels under each foot, toe stops
  const wheels = [];
  for (const ft of [P.footL, P.footR]) {
    part(ft, slab(0.16, 0.035, 0.32), K.dark, 0, -0.11, -0.05);
    for (const [x, z] of [[-0.07, -0.16], [0.07, -0.16], [-0.07, 0.06], [0.07, 0.06]]) { const wh = live(part(ft, tube(0.045, 0.045, 0.035, 12), K.trim, x, -0.15, z)); wh.rotation.z = Math.PI / 2; wheels.push(wh); }
    part(ft, ball(0.04), K.c(0xff4fa3), 0, -0.12, -0.24);
  }
  // a rolled-up scarf of victory ribbons on the back
  const ribbon = chain(P.spine, 4, 0.12, K.trim, 0, 0.5, 0.18, 0.04, 0.025, [0, -0.4, 0.9]);
  // Haymaker Glove: a huge boxing glove on the right, a normal one on the left
  part(P.handL, ball(0.11), K.trim, 0, 0, 0, 1, 1, 1.2);
  const gun = gunAt(P, 0.3, 1.2, -0.42);
  const glove = part(gun, ball(0.21), K.c(p.trim, { rough: 0.35 }), 0, 0, -0.08, 1, 0.92, 1.2);
  part(gun, ball(0.09), K.c(p.trim, { rough: 0.35 }), -0.15, 0.04, -0.06);
  part(gun, tube(0.13, 0.14, 0.12), K.white, 0, 0, 0.12).rotation.x = Math.PI / 2;
  const glow = live(part(gun, ring(0.22, 0.02), K.c(0xffd23c, { glow: 0.9, rim: 0 }), 0, 0, -0.05));
  void glove;
  return finish(P, team, gun, -0.32, (dt, s, t, k) => {
    wheels.forEach(wh => { wh.rotation.x += dt * s * 6; });
    ribbon.wave(t, k, 0.18, 8);
    glow.rotation.z += dt * (2 + k * 8); glow.scale.setScalar(0.85 + k * 0.35 + Math.sin(t * 9) * 0.04 * k);
    P.spine.rotation.x = 0.1 + k * 0.25;                            // skater crouch at speed
  }, { stride: 1.15, aim: [0.75, 0.4] });
}

// ---------------- Nutcracker: Pip the chipmunk in BOLT-9 ----------------
function chipmunk(p, team) {
  const K = kit(p), f = p.finish || {};
  const metal = K.c(p.main, { rough: f.rough ?? 0.32, metal: f.metal ?? 0.45 });
  const fur = K.c(0xb5762e, { rough: 0.9 }), cream = K.c(0xf3dfbf, { rough: 0.85 }), stripe = K.c(0x3a2414, { rough: 0.9 });
  const P = body(K, { w: 1.4, headR: 0, torso: [0.3, 0.34, 0.44, 0.42, 0.56], flat: 0.95, top: metal, sleeves: metal, forearms: K.dark, pants: K.dark, shins: metal, boots: K.ink, gloves: K.steel });
  // chest: grille, an acorn emblem, a warning stripe and shoulder pauldrons
  for (let i = 0; i < 4; i++) part(P.spine, slab(0.3, 0.025, 0.02), K.ink, 0, 0.16 + i * 0.06, -0.36);
  part(P.spine, ball(0.08), K.trim, 0, 0.42, -0.36, 1, 1.1, 0.5); part(P.spine, dome(0.085), K.c(0x6b4a2a), 0, 0.46, -0.36, 1.1, 0.6, 0.6);
  for (let i = 0; i < 5; i++) part(P.hips, slab(0.07, 0.07, 0.02), i % 2 ? K.ink : K.gold, -0.16 + i * 0.08, 0.1, -0.3);
  for (const a of [P.armR, P.armL]) part(a, ball(0.17), K.trim, 0, 0.03, 0, 1.1, 0.75, 1.1);
  // cockpit on top: a ring frame and see-through glass with Pip inside
  const H = P.head;
  part(H, tube(0.3, 0.33, 0.12), metal, 0, -0.14, 0);
  const glass = live(part(H, dome(0.31, Math.PI * 0.55), new THREE.MeshStandardMaterial({ color: 0xbfefff, transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.2, depthWrite: false }), 0, -0.1, 0));
  glass.castShadow = false;
  part(H, ring(0.31, 0.025), K.trim, 0, -0.08, 0).rotation.x = Math.PI / 2;
  const pip = joint(H, 0, -0.02, 0);
  part(pip, ball(0.15), fur, 0, 0.04, 0, 1, 1.05, 0.95);
  for (const s of [-1, 1]) {
    part(pip, ball(0.07), cream, s * 0.085, -0.02, -0.1, 1, 0.85, 0.8);            // chubby cheeks
    part(pip, cone(0.04, 0.07, 8), fur, s * 0.09, 0.17, 0.02).rotation.z = s * -0.3;   // ears
    part(pip, slab(0.018, 0.12, 0.04), stripe, s * 0.045, 0.12, -0.06).rotation.x = -0.5;
  }
  part(pip, slab(0.02, 0.14, 0.05), stripe, 0, 0.13, -0.05).rotation.x = -0.45;
  part(pip, ball(0.025), K.ink, 0, 0.0, -0.15);
  part(pip, slab(0.04, 0.03, 0.01), K.white, 0, -0.05, -0.14);
  P.eyes = [];
  for (const s of [-1, 1]) { const e = joint(pip, s * 0.06, 0.06, -0.12); part(e, ball(0.03), K.eye, 0, 0, 0, 1, 1.2, 0.6); part(e, ball(0.009), K.shine, s * -0.008, 0.01, -0.02); P.eyes.push(e); }
  // Pip's goggles up on the forehead and a stripy tail curling out the back of the cockpit
  part(pip, ring(0.05, 0.012), K.trim, -0.05, 0.11, -0.1).rotation.x = -0.4; part(pip, ring(0.05, 0.012), K.trim, 0.05, 0.11, -0.1).rotation.x = -0.4;
  const tail = chain(H, 5, 0.12, fur, 0, -0.06, 0.3, 0.09, 0.07, [0, 0.55, 0.5]);
  // antenna with a blinking light
  part(P.spine, tube(0.012, 0.012, 0.4), K.steel, -0.3, 0.7, 0.12);
  const blink = live(part(P.spine, ball(0.035), K.c(0xff4a3a, { glow: 1, rim: 0 }), -0.3, 0.92, 0.12));
  // exhaust pipes on the back
  for (const s of [-1, 1]) part(P.spine, tube(0.05, 0.06, 0.3), K.ink, s * 0.15, 0.48, 0.34);
  // Acorn Repeater bolted to the right arm: a barrel and a spinning hopper of acorns
  const gun = gunAt(P, 0.36, 1.18, -0.46);
  part(gun, slab(0.18, 0.18, 0.4), metal, 0, 0, 0.04);
  part(gun, tube(0.06, 0.07, 0.4), K.ink, 0, 0, -0.3).rotation.x = Math.PI / 2;
  const drum = live(part(gun, tube(0.12, 0.12, 0.12, 12), K.trim, 0, 0.16, 0.02));
  for (let i = 0; i < 3; i++) live(part(drum, ball(0.035), K.c(0x8a5a2a), Math.cos(i * 2.1) * 0.07, 0.07, Math.sin(i * 2.1) * 0.07));
  return finish(P, team, gun, -0.52, (dt, s, t, k) => {
    tail.wave(t, k, 0.2, 5);
    drum.rotation.y += dt * (1 + k * 6);
    blink.visible = Math.sin(t * 6) > -0.2;
    pip.position.y = -0.02 + Math.abs(Math.sin(t * 2.5)) * 0.02 + k * Math.abs(Math.sin(t * 9)) * 0.03;   // bouncing about in the seat
    pip.rotation.y = Math.sin(t * 0.9) * 0.3;
  }, { stride: 1.1 });
}



// ---------------- Larkspur: elf archer ----------------
function elf(p, team) {
  const K = kit(p);
  const leaf = K.c(p.main, { rough: 0.55 }), gold = K.c(p.trim, { rough: 0.3, metal: 0.3 });
  const hair = K.c(0xf3e6b0, { rough: 0.5 }), wood = K.c(0x8a5a3a, { rough: 0.7 });
  const P = body(K, { w: 0.92, shoes: 'boot', boots: K.c(0x5a3a2a, { rough: 0.8 }), top: leaf, sleeves: leaf, forearms: K.skin, pants: K.dark, gloves: K.c(0x5a3a2a) });
  face(P, K, { brow: 0.18, mouth: 'smirk', lashes: true, eyeColor: 0x2fae6a });
  // long pointed ears, a fall of pale hair, a braid and a circlet of gold leaves
  for (const s of [-1, 1]) { const e = part(P.head, cone(0.05, 0.26, 8), K.skin, s * 0.3, 0.06, 0.02); e.rotation.z = s * -1.15; e.rotation.x = 0.2; }
  part(P.head, dome(0.305, Math.PI * 0.6), hair, 0, 0.02, 0.03, 1.02, 1, 1.05);
  part(P.head, ball(0.2), hair, 0, -0.08, 0.2, 1.3, 1.5, 0.6);
  const braid = chain(P.head, 5, 0.12, hair, 0, -0.12, 0.26, 0.06, 0.035, [0, -0.9, 0.35]);
  for (let i = 0; i < 5; i++) { const a = (i - 2) * 0.32; const l = part(P.head, ball(0.04), gold, Math.sin(a) * 0.29, 0.17, -Math.cos(a) * 0.23, 0.6, 1.4, 0.3); l.rotation.z = a; }
  // leaf-scale tunic trim, a belt and a cloak that streams behind her
  for (let i = 0; i < 6; i++) part(P.hips, cone(0.07, 0.18, 4), K.c(0x2f7a4a), -0.2 + i * 0.08, -0.06, -0.16, 1, 1, 0.4).rotation.x = Math.PI;
  part(P.hips, tube(0.25, 0.25, 0.05), K.c(0x5a3a2a), 0, 0.08, 0, 1, 1, 0.8);
  part(P.hips, ball(0.04), gold, 0, 0.08, -0.2);
  const cloak = chain(P.spine, 4, 0.2, K.c(0x2f6a46, { rough: 0.8, double: true }), 0, 0.5, 0.17, 0.17, 0.2, [0, -0.85, 0.5]);
  // quiver of arrows on her back
  const quiver = part(P.spine, tube(0.07, 0.06, 0.45), K.c(0x6b4a33), 0.13, 0.36, 0.22); quiver.rotation.z = -0.4;
  for (let i = 0; i < 3; i++) part(quiver, cone(0.03, 0.09, 4), K.c(0xd8ffb0, { glow: 0.3 }), (i - 1) * 0.03, 0.27, 0);
  // Moonleaf Longbow: a tall curved bow held upright, a glowing string and a nocked arrow
  const gun = gunAt(P, 0.24, 1.25, -0.46);
  const bow = part(gun, ring(0.5, 0.025, Math.PI * 0.85), wood, 0, 0, 0.1);
  bow.rotation.set(0, Math.PI / 2, Math.PI / 2 + Math.PI * 0.075);
  for (const s of [-1, 1]) part(gun, ball(0.035), gold, 0, s * 0.5, 0.18);
  const string = live(part(gun, tube(0.006, 0.006, 0.98), K.c(0xd8ffb0, { glow: 0.9, rim: 0 }), 0, 0, 0.26));
  part(gun, tube(0.012, 0.012, 0.7), wood, 0, 0, -0.06).rotation.x = Math.PI / 2;
  part(gun, cone(0.03, 0.08, 4), K.c(0xd8ffb0, { glow: 0.6 }), 0, 0, -0.44).rotation.x = -Math.PI / 2;
  return finish(P, team, gun, -0.5, (dt, s, t, k) => {
    braid.wave(t, k, 0.14, 4); cloak.wave(t, k, 0.12, 5);
    string.scale.x = 1 + Math.sin(t * 3) * 0.3;
  }, { stride: 1.5 });
}

// ---------------- Pirouette: prima ballerina ----------------
function dancer(p, team) {
  const K = kit(p);
  const silk = K.c(p.main, { rough: 0.35 }), tulle = K.c(p.main, { rough: 0.6, double: true }), hair = K.c(0x3a2418, { rough: 0.45 });
  const P = body(K, { w: 0.86, shoes: 'sneaker', boots: K.c(0xffc2da, { rough: 0.3 }), soles: K.c(0xffc2da), top: silk, sleeves: K.skin, forearms: K.skin, pants: K.c(0xffe4ee, { rough: 0.4 }), gloves: K.skin,
    torso: [0.16, 0.16, 0.24, 0.23, 0.54] });
  face(P, K, { brow: 0.05, mouth: 'smile', lashes: true, cheeks: true });
  // the tutu: layered stiff tulle rings, with a satin bodice and sash
  for (let i = 0; i < 3; i++) part(P.hips, tube(0.5 - i * 0.07, 0.42 - i * 0.07, 0.05), tulle, 0, 0.05 + i * 0.04, 0, 1, 1, 0.92);
  part(P.spine, tube(0.24, 0.24, 0.05), K.c(p.trim, { rough: 0.25 }), 0, 0.18, 0, 1, 1, 0.8);
  part(P.spine, ball(0.06), K.c(0xff6aa8), 0.12, 0.18, -0.18);
  // a neat bun, a small tiara and pink ribbon ties up the legs
  part(P.head, dome(0.3, Math.PI * 0.55), hair, 0, 0.02, 0.02, 1, 1, 1.02);
  part(P.head, ball(0.12), hair, 0, 0.16, 0.2);
  for (let i = 0; i < 5; i++) part(P.head, cone(0.02, 0.07 + (i === 2 ? 0.05 : 0), 4), K.c(0xffffff, { rough: 0.15, metal: 0.4, glow: 0.2 }), (i - 2) * 0.06, 0.27, -0.18);
  for (const kn of [P.kneeL, P.kneeR]) for (let i = 0; i < 2; i++) part(kn, tube(0.075, 0.075, 0.012), K.c(0xff8fc0), 0, -0.1 - i * 0.12, 0).rotation.x = 0.3;
  // Silk Ribbon: a slim wand with a long ribbon that curls and floats
  const gun = gunAt(P, 0.26, 1.22, -0.44);
  part(gun, tube(0.015, 0.015, 0.5), K.c(0xffffff, { rough: 0.2, metal: 0.3 }), 0, 0, -0.1).rotation.x = Math.PI / 2;
  part(gun, ball(0.04), K.c(p.trim, { glow: 0.5 }), 0, 0, -0.36);
  const ribbon = chain(gun, 8, 0.16, K.c(0xff8fc0, { rough: 0.3, double: true, glow: 0.15 }), 0, 0, -0.36, 0.035, 0.02, [0.3, 0.6, -0.75]);
  return finish(P, team, gun, -0.38, (dt, s, t, k) => {
    ribbon.forEach((g, i) => { g.rotation.x = Math.sin(t * 4 - i * 0.7) * (0.35 + k * 0.3); g.rotation.z = Math.cos(t * 3 - i * 0.6) * 0.4; });
    P.spine.rotation.z = Math.sin(t * 1.4) * 0.05;                    // a dancer's sway
    P.head.rotation.z = Math.sin(t * 1.4 + 0.6) * 0.06;
  }, { stride: 1.4, aim: [0.9, 0.5], freeL: true });
}

// ---------------- Burrow: the mole foreman ----------------
function mole(p, team) {
  const K = kit(p);
  const fur = K.c(p.skin ?? 0x6a5a64, { rough: 0.95 }), pink = K.c(0xff9ab0, { rough: 0.6 }), denim = K.c(p.main, { rough: 0.8 });
  const P = body(K, { w: 1.25, headR: 0.32, shoes: 'boot', boots: K.c(0x5a3a2a, { rough: 0.8 }), top: fur, sleeves: fur, forearms: fur, pants: denim, gloves: pink,
    torso: [0.27, 0.3, 0.34, 0.3, 0.56] });
  face(P, K, { r: 0.32, brow: -0.1, mouth: 'open' });
  for (const e of P.eyes) e.scale.set(0.6, 1, 0.6);                   // tiny squinty eyes...
  for (const s of [-1, 1]) part(P.head, ring(0.085, 0.016), K.ink, s * 0.105, 0.035, -0.3);        // ...behind thick specs
  part(P.head, slab(0.06, 0.016, 0.016), K.ink, 0, 0.04, -0.31);
  // the famous pink star nose and buck teeth
  const nose = live(part(P.head, ball(0.07), pink, 0, -0.03, -0.32, 1.2, 1, 1));
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; part(nose, cone(0.02, 0.06, 4), pink, Math.cos(a) * 0.06, Math.sin(a) * 0.05, -0.02).rotation.set(Math.PI / 2, 0, a - Math.PI / 2); }
  for (const s of [-1, 1]) part(P.head, slab(0.035, 0.05, 0.015), K.white, s * 0.02, -0.15, -0.28);
  // overalls: bib, straps and a pocket with a pencil; claws on the gloves
  part(P.spine, slab(0.36, 0.26, 0.03), denim, 0, 0.18, -0.27);
  for (const s of [-1, 1]) { part(P.spine, slab(0.05, 0.36, 0.02), denim, s * 0.13, 0.4, -0.26); part(P.spine, ball(0.025), K.gold, s * 0.13, 0.28, -0.29); }
  part(P.spine, slab(0.12, 0.08, 0.02), K.c(0x2f5a8a), 0.06, 0.12, -0.29);
  part(P.spine, tube(0.01, 0.01, 0.12), K.c(0xffc93c), 0.09, 0.2, -0.29);
  for (const hd of [P.handR, P.handL]) for (let i = 0; i < 3; i++) part(hd, cone(0.02, 0.09, 4), K.c(0xf4efd8), (i - 1) * 0.035, -0.08, -0.03).rotation.x = Math.PI;
  // hard hat with a headlamp
  part(P.head, dome(0.33, Math.PI * 0.5), K.c(p.trim, { rough: 0.35 }), 0, 0.1, 0.01, 1.02, 0.85, 1.04);
  part(P.head, ring(0.36, 0.03), K.c(p.trim, { rough: 0.35 }), 0, 0.1, 0.01).rotation.x = Math.PI / 2;
  part(P.head, slab(0.04, 0.3, 0.04), K.c(p.trim, { rough: 0.35 }), 0, 0.27, 0.01).rotation.x = Math.PI / 2;
  part(P.head, tube(0.06, 0.06, 0.05), K.ink, 0, 0.22, -0.3).rotation.x = Math.PI / 2;
  const lamp = live(part(P.head, ball(0.045), K.c(0xfff3a0, { glow: 1.2, rim: 0 }), 0, 0.22, -0.33, 1, 1, 0.5));
  // a stubby tail
  part(P.hips, cone(0.05, 0.22, 6), fur, 0, 0.05, 0.25).rotation.x = 1.9;
  // Pebble Shovel: a long handle with a scoop of rocks on the blade
  const gun = gunAt(P, 0.3, 1.15, -0.4);
  part(gun, tube(0.025, 0.025, 0.8), K.c(0x8a5a3a, { rough: 0.7 }), 0, 0, 0.05).rotation.x = Math.PI / 2;
  part(gun, slab(0.14, 0.03, 0.08), K.ink, 0, 0, 0.45);
  const blade = part(gun, slab(0.26, 0.03, 0.3), K.steel, 0, 0.02, -0.46); blade.rotation.x = -0.25;
  const rocks = [0, 1, 2, 3].map(i => live(part(gun, ball(0.04 + (i % 2) * 0.015), K.c(0x9a8a72, { rough: 0.95 }), (i - 1.5) * 0.06, 0.07, -0.46 + (i % 2) * 0.05)));
  return finish(P, team, gun, -0.6, (dt, s, t, k) => {
    nose.rotation.z = Math.sin(t * 9) * 0.15; nose.scale.x = 1.2 + Math.sin(t * 7) * 0.08;      // sniff sniff
    lamp.visible = Math.sin(t * 0.7) > -0.95;
    rocks.forEach((r, i) => { r.position.y = 0.07 + Math.abs(Math.sin(t * 5 + i)) * 0.02 * (1 + k * 2); });
  }, { stride: 1.05 });
}

// ---------------- Stitch: field medic ----------------
function medic(p, team) {
  const K = kit(p);
  const coat = K.c(p.main, { rough: 0.55 }), red = K.c(p.trim, { rough: 0.4 }), scrubs = K.c(0x3fb8a0, { rough: 0.7 }), hair = K.c(0x1d1410, { rough: 0.6 });
  const P = body(K, { w: 0.92, shoes: 'sneaker', boots: K.c(0xf4f6fa), soles: K.c(0x2a3550), top: scrubs, sleeves: coat, forearms: coat, pants: scrubs, gloves: K.c(0x9fe0ff, { rough: 0.3 }) });
  face(P, K, { brow: 0.08, mouth: 'smile', lashes: true, eyeColor: 0x3a2418 });
  // big curly hair pulled up, a head mirror and round glasses
  part(P.head, dome(0.31, Math.PI * 0.55), hair, 0, 0.03, 0.02, 1.05, 1, 1.05);
  for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; part(P.head, ball(0.1), hair, Math.cos(a) * 0.12, 0.3 + Math.sin(i * 1.7) * 0.03, Math.sin(a) * 0.12 + 0.05); }
  part(P.head, tube(0.28, 0.28, 0.03), K.c(0x2a3550), 0, 0.14, 0.02).rotation.x = 0.15;
  const mirror = live(part(P.head, tube(0.07, 0.07, 0.015), K.c(0xe8f8ff, { metal: 0.6, rough: 0.1, glow: 0.3 }), 0, 0.2, -0.27));
  mirror.rotation.x = Math.PI / 2 - 0.3;
  for (const s of [-1, 1]) part(P.head, ring(0.06, 0.01), K.c(p.trim), s * 0.105, 0.035, -0.29);
  // a long white coat that swings, a red cross armband and a stethoscope
  const tails = chain(P.hips, 3, 0.18, K.c(p.main, { rough: 0.55, double: true }), 0, 0.05, 0.14, 0.24, 0.24, [0, -1, 0.25]);
  for (const s of [-1, 1]) part(P.spine, slab(0.14, 0.5, 0.03), coat, s * 0.15, 0.22, -0.24);
  part(P.armL, tube(0.085, 0.085, 0.08), red, 0, -0.1, 0);
  part(P.armL, slab(0.06, 0.02, 0.02), K.white, -0.09, -0.1, 0).rotation.y = Math.PI / 2;
  part(P.spine, ring(0.17, 0.014, Math.PI), K.c(0x2a3550), 0, 0.5, -0.12).rotation.set(0.3, 0, Math.PI);
  part(P.spine, tube(0.035, 0.035, 0.02), K.steel, 0.07, 0.3, -0.26).rotation.x = Math.PI / 2;
  // a med pouch with a cross on the hip
  part(P.hips, slab(0.16, 0.14, 0.08), K.white, -0.22, 0, -0.08);
  part(P.hips, slab(0.08, 0.025, 0.01), red, -0.22, 0, -0.125); part(P.hips, slab(0.025, 0.08, 0.01), red, -0.22, 0, -0.125);
  // Mender Dart Rifle: a white rifle with a glowing syringe chamber
  const gun = gunAt(P, 0.26, 1.24, -0.44);
  part(gun, slab(0.08, 0.1, 0.6), K.c(0xf4f6fa, { rough: 0.3 }), 0, 0, 0);
  part(gun, slab(0.085, 0.03, 0.3), red, 0, 0.055, 0.02);
  part(gun, tube(0.02, 0.022, 0.32), K.ink, 0, 0, -0.42).rotation.x = Math.PI / 2;
  const vial = live(part(gun, tube(0.035, 0.035, 0.2), K.c(0x7affc0, { glow: 0.9, rough: 0.1, rim: 0 }), 0, 0.09, -0.08));
  vial.rotation.x = Math.PI / 2;
  part(gun, slab(0.06, 0.15, 0.08), K.ink, 0, -0.1, 0.18).rotation.x = 0.3;
  return finish(P, team, gun, -0.6, (dt, s, t, k) => {
    tails.wave(t, k, 0.1, 4);
    vial.scale.y = 0.85 + Math.sin(t * 2.5) * 0.15;
    mirror.rotation.z = Math.sin(t * 0.8) * 0.15;
  }, { stride: 1.25 });
}

// ---------------- Dynamo: pit-lane electrician ----------------
function spark(p, team) {
  const K = kit(p);
  const suit = K.c(p.main, { rough: 0.6 }), volt = K.c(p.trim, { rough: 0.3, glow: 0.35 }), hair = K.c(0xffe14a, { rough: 0.4, glow: 0.25 });
  const P = body(K, { w: 0.9, shoes: 'boot', boots: K.c(0x1d1d24, { rough: 0.6 }), top: suit, sleeves: suit, forearms: K.skin, pants: suit, gloves: K.c(0xff4f6b, { rough: 0.5 }) });
  face(P, K, { brow: 0.22, mouth: 'open', cheeks: true, eyeColor: 0x2f6aff });
  // hair standing on end in lightning spikes, and welding goggles pushed up
  part(P.head, dome(0.305, Math.PI * 0.5), hair, 0, 0.03, 0.02, 1.03, 1, 1.03);
  for (let i = 0; i < 7; i++) { const a = (i - 3) * 0.35; const c = part(P.head, cone(0.06, 0.26, 4), hair, Math.sin(a) * 0.18, 0.32, Math.cos(a) * 0.08 + 0.04); c.rotation.z = -a * 0.8; c.rotation.x = 0.25; }
  part(P.head, tube(0.3, 0.3, 0.05), K.ink, 0, 0.13, 0.01);
  for (const s of [-1, 1]) part(P.head, tube(0.07, 0.07, 0.06), K.c(0x7af0ff, { glow: 0.5, rough: 0.1 }), s * 0.1, 0.19, -0.25).rotation.x = Math.PI / 2 - 0.4;
  // hazard stripes on the jumpsuit, and a rattly backpack of mismatched batteries
  for (let i = 0; i < 4; i++) part(P.spine, slab(0.07, 0.04, 0.02), i % 2 ? K.ink : volt, -0.15 + i * 0.1, 0.12, -0.25).rotation.z = 0.6;
  part(P.hips, tube(0.24, 0.24, 0.05), volt, 0, 0.08, 0, 1, 1, 0.8);
  const pack = part(P.spine, slab(0.42, 0.42, 0.18), K.c(0x3a3f4a, { metal: 0.3, rough: 0.4 }), 0, 0.3, 0.26);
  const cells = [-1, 0, 1].map(i => live(part(pack, tube(0.06, 0.06, 0.3), K.c(i ? 0xffe14a : 0x7af0ff, { glow: 1, rim: 0 }), i * 0.13, 0.08, 0.1)));
  for (const s of [-1, 1]) part(pack, cone(0.04, 0.12, 6), K.steel, s * 0.15, 0.27, 0);
  const cord = chain(pack, 4, 0.14, K.c(0xff4f6b, { rough: 0.5 }), 0.18, -0.2, 0, 0.025, 0.025, [0.3, -1, -0.4]);
  // Jumper Cables: a grip with a red and a black clamp and a copper coil
  const gun = gunAt(P, 0.26, 1.22, -0.42);
  part(gun, tube(0.04, 0.04, 0.3), K.ink, 0, 0, 0.02).rotation.x = Math.PI / 2;
  part(gun, ring(0.05, 0.015), K.c(0xc87533, { metal: 0.6, rough: 0.3 }), 0, 0, -0.08).rotation.y = Math.PI / 2;
  part(gun, ring(0.05, 0.015), K.c(0xc87533, { metal: 0.6, rough: 0.3 }), 0, 0, -0.02).rotation.y = Math.PI / 2;
  const jaws = [-1, 1].map(s => { const j = part(gun, slab(0.04, 0.05, 0.2), K.c(s < 0 ? 0xff4f6b : 0x1d1d24, { rough: 0.4 }), s * 0.05, 0, -0.24); j.rotation.y = s * 0.15; return j; });
  const arc = live(part(gun, ball(0.04), K.c(0x7af0ff, { glow: 1.4, rim: 0 }), 0, 0, -0.36));
  return finish(P, team, gun, -0.38, (dt, s, t, k) => {
    cells.forEach((c, i) => { c.scale.y = 0.75 + Math.abs(Math.sin(t * 3 + i * 1.3)) * 0.3; });
    jaws.forEach((j, i) => { j.rotation.y = (i ? 1 : -1) * (0.12 + Math.abs(Math.sin(t * 6)) * 0.08 * (1 + k)); });
    arc.visible = Math.sin(t * 23) > -0.3; arc.scale.setScalar(0.7 + Math.random() * 0.6);
    cord.wave(t, k, 0.12, 5);
  }, { stride: 1.35 });
}

// ---------------- Mortar: the site foreman ----------------
function builder(p, team) {
  const K = kit(p);
  const vest = K.c(p.main, { rough: 0.5 }), shirt = K.c(0x5a7aa8, { rough: 0.8 }), denim = K.c(0x3a4a6a, { rough: 0.85 }), beard = K.c(0x5a3420, { rough: 0.9 });
  const P = body(K, { w: 1.2, shoes: 'boot', boots: K.c(0x8a5a2a, { rough: 0.8 }), top: shirt, sleeves: shirt, forearms: K.skin, pants: denim, gloves: K.c(0xe8c56a, { rough: 0.85 }),
    torso: [0.25, 0.28, 0.33, 0.3, 0.56] });
  face(P, K, { brow: -0.05, mouth: 'smile', eyeColor: 0x3a2418 });
  // a big bushy beard and moustache, and a beanie with a pencil tucked behind the ear
  part(P.head, ball(0.2), beard, 0, -0.14, -0.15, 1.35, 0.9, 0.7);
  part(P.head, pill(0.04, 0.12), beard, 0, -0.07, -0.29).rotation.z = Math.PI / 2;
  part(P.head, dome(0.31, Math.PI * 0.52), K.c(0xff8a2a, { rough: 0.9 }), 0, 0.04, 0.01, 1.04, 1.05, 1.04);
  part(P.head, tube(0.315, 0.315, 0.08), K.c(0xc86a1a, { rough: 0.9 }), 0, 0.08, 0.01);
  part(P.head, ball(0.06), K.c(0xc86a1a, { rough: 0.9 }), 0, 0.34, 0.01);
  part(P.head, tube(0.012, 0.012, 0.2), K.c(0xffc93c), 0.29, 0.02, 0.02).rotation.x = Math.PI / 2;
  // hi-vis vest with reflective stripes, a tool belt with a hammer and a tape measure
  part(P.spine, slab(0.46, 0.42, 0.33), vest, 0, 0.24, 0);
  for (const y of [0.12, 0.3]) part(P.spine, slab(0.47, 0.04, 0.34), K.c(p.trim, { rough: 0.15, metal: 0.4, glow: 0.2 }), 0, y, 0);
  part(P.hips, tube(0.27, 0.27, 0.07), K.leather, 0, 0.08, 0, 1, 1, 0.85);
  part(P.hips, slab(0.12, 0.14, 0.08), K.leather, 0.2, -0.02, -0.12);
  const hammer = part(P.hips, tube(0.015, 0.015, 0.3), K.c(0x8a5a3a), -0.24, -0.06, -0.05); hammer.rotation.z = 0.2;
  part(hammer, slab(0.13, 0.05, 0.05), K.steel, 0, 0.15, 0);
  part(P.hips, tube(0.06, 0.06, 0.04), K.c(0xffe14a), 0.24, 0.05, 0.1).rotation.z = Math.PI / 2;
  // Brick Launcher: a chunky boxy launcher with a hopper of bricks on top
  const gun = gunAt(P, 0.3, 1.18, -0.42);
  part(gun, slab(0.16, 0.16, 0.6), K.c(0x3a3f4a, { metal: 0.3, rough: 0.4 }), 0, 0, 0);
  part(gun, slab(0.17, 0.04, 0.4), vest, 0, 0.09, 0.04);
  part(gun, slab(0.15, 0.15, 0.08), K.ink, 0, 0, -0.32);
  const bricks = [0, 1, 2].map(i => live(part(gun, slab(0.16, 0.07, 0.09), K.c([0xd9733a, 0xc8642e, 0xe0844a][i], { rough: 0.9 }), 0, 0.15 + i * 0.075, 0.08 - i * 0.02)));
  part(gun, slab(0.07, 0.16, 0.09), K.ink, 0, -0.13, 0.18).rotation.x = 0.3;
  return finish(P, team, gun, -0.4, (dt, s, t, k) => {
    bricks.forEach((b, i) => { b.position.x = Math.sin(t * 4 + i) * 0.008 * (1 + k * 3); });
  }, { stride: 1.05 });
}

// ---------------- Beef Wellington: a knighted pastry ----------------
function wellington(p, team) {
  const K = kit(p);
  const pastry = K.c(p.main, { rough: 0.55 }), crisp = K.c(0xc8862e, { rough: 0.6 }), beef = K.c(0xd9707a, { rough: 0.7 }), dux = K.c(0x3a4a2a, { rough: 0.9 });
  const P = body(K, { w: 1.2, headR: 0, shoes: 'boot', boots: K.c(0x1d1d24, { rough: 0.3, metal: 0.2 }), top: pastry, sleeves: K.c(0x1d1d24), forearms: K.c(0x1d1d24), pants: K.c(0x2a2a32), gloves: K.white,
    torso: [0.3, 0.32, 0.38, 0.38, 0.56] });
  P.torso.visible = false; P.neck.visible = false;
  // the body: one standing log of golden puff pastry with a criss-cross lattice
  part(P.spine, tube(0.44, 0.46, 1.05, 20), pastry, 0, 0.5, 0);
  for (let i = 0; i < 4; i++) part(P.spine, ring(0.455, 0.022), crisp, 0, 0.12 + i * 0.25, 0).rotation.x = Math.PI / 2;
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, s = part(P.spine, slab(0.04, 1.0, 0.03), crisp, Math.sin(a) * 0.45, 0.5, Math.cos(a) * 0.45); s.rotation.y = a; s.rotation.z = (i % 2 ? 1 : -1) * 0.35; }
  // the cut end on top shows the layers: crust, mushroom duxelles and a pink centre
  part(P.spine, tube(0.43, 0.43, 0.04, 20), crisp, 0, 1.03, 0);
  part(P.spine, tube(0.36, 0.36, 0.045, 20), dux, 0, 1.04, 0);
  part(P.spine, tube(0.28, 0.28, 0.05, 20), beef, 0, 1.05, 0);
  part(P.spine, tube(0.1, 0.1, 0.055, 12), K.c(0xb8485a, { rough: 0.7 }), 0, 1.06, 0);
  // the face sits on the front of the pastry: a monocle, a waxed moustache and a dashing top hat
  P.head.position.set(0, 0.62, 0);
  face(P, K, { r: 0.5, brow: 0.1, mouth: 'smirk', eyeColor: 0x3a2418 });
  part(P.head, ring(0.075, 0.012), K.gold, 0.105, 0.035, -0.45);
  part(P.head, tube(0.004, 0.004, 0.3), K.gold, 0.17, -0.12, -0.44).rotation.z = 0.3;
  for (const s of [-1, 1]) { const m = part(P.head, pill(0.025, 0.1), K.c(0x3a2418), s * 0.06, -0.07, -0.45); m.rotation.z = Math.PI / 2 + s * 0.25; part(P.head, ball(0.025), K.c(0x3a2418), s * 0.13, -0.05, -0.44); }
  const hat = joint(P.spine, 0.14, 1.07, 0.05); hat.rotation.z = -0.2;
  part(hat, tube(0.22, 0.22, 0.025), K.c(0x1d1d24, { rough: 0.3 }), 0, 0.01, 0);
  part(hat, tube(0.14, 0.15, 0.3), K.c(0x1d1d24, { rough: 0.3 }), 0, 0.17, 0);
  part(hat, tube(0.152, 0.152, 0.05), K.c(p.trim), 0, 0.06, 0);
  // a bow tie and a tiny sprig of rosemary on the lapel
  part(P.spine, cone(0.05, 0.1, 8), K.c(p.trim), -0.05, 0.3, -0.45).rotation.z = Math.PI / 2;
  part(P.spine, cone(0.05, 0.1, 8), K.c(p.trim), 0.05, 0.3, -0.45).rotation.z = -Math.PI / 2;
  for (let i = 0; i < 4; i++) part(P.spine, cone(0.012, 0.07, 4), K.c(0x3a7a3a), -0.2 + i * 0.012, 0.42 + i * 0.03, -0.43).rotation.z = 0.4 - i * 0.2;
  // Gravy Boat: a porcelain jug full of steaming gravy
  const gun = gunAt(P, 0.36, 1.2, -0.42);
  part(gun, ball(0.12), K.white, 0, 0, 0, 1, 0.6, 1.7);
  part(gun, cone(0.05, 0.14, 8), K.white, 0, 0.02, -0.24).rotation.x = -Math.PI / 2 + 0.3;
  part(gun, ring(0.06, 0.015, Math.PI), K.white, 0, 0.02, 0.2).rotation.y = Math.PI / 2;
  part(gun, tube(0.095, 0.095, 0.02), K.c(0x6a3a1a, { rough: 0.2 }), 0, 0.06, 0, 1, 1, 1.6);
  part(gun, tube(0.1, 0.08, 0.04), K.c(0x2f5aa8), 0, -0.07, 0, 1, 1, 1.6);
  const steam = [0, 1, 2].map(i => live(part(gun, ball(0.035), K.c(0xffffff, { glow: 0.4, rim: 0 }), (i - 1) * 0.04, 0.14 + i * 0.05, 0)));
  return finish(P, team, gun, -0.3, (dt, s, t, k) => {
    steam.forEach((m, i) => { const u = (t * 0.8 + i / 3) % 1; m.position.y = 0.1 + u * 0.25; m.scale.setScalar(0.6 + u); m.visible = u < 0.9; });
    hat.rotation.z = -0.2 + Math.sin(t * 2) * 0.04 * (1 + k);
  }, { stride: 1.1 });
}

// ---------------- Crook: the highland shepherd ----------------
function shepherd(p, team) {
  const K = kit(p);
  const wax = K.c(p.main, { rough: 0.5 }), beard = K.c(0xd8d4cc, { rough: 0.95 }), tweed = K.c(0x8a7a5a, { rough: 0.95 });
  const P = body(K, { w: 1.02, shoes: 'boot', boots: K.c(0x5a3a2a, { rough: 0.8 }), top: wax, sleeves: wax, forearms: wax, pants: K.c(0x4a4a3a, { rough: 0.85 }), shins: K.c(0x8a2a2a, { rough: 0.9 }), gloves: K.skin });
  face(P, K, { brow: -0.12, mouth: 'flat', eyeColor: 0x3a6a8a });
  // a big white beard, bushy eyebrows and a tweed flat cap
  part(P.head, ball(0.2), beard, 0, -0.15, -0.14, 1.3, 1.1, 0.75);
  for (const s of [-1, 1]) part(P.head, pill(0.03, 0.08), beard, s * 0.11, 0.15, -0.26).rotation.z = Math.PI / 2;
  part(P.head, dome(0.31, Math.PI * 0.45), tweed, 0, 0.06, 0.01, 1.05, 0.8, 1.05);
  part(P.head, slab(0.36, 0.03, 0.18), tweed, 0, 0.1, -0.3).rotation.x = 0.25;
  // a tartan kilt and sporran under the waxed jacket
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; part(P.hips, slab(0.13, 0.32, 0.03), K.c(i % 2 ? 0xc23b3b : 0x2a4a2a, { rough: 0.9 }), Math.sin(a) * 0.25, -0.1, Math.cos(a) * 0.2).rotation.y = a; }
  part(P.hips, slab(0.12, 0.13, 0.05), K.leather, 0, -0.1, -0.24);
  part(P.spine, tube(0.24, 0.24, 0.05), K.leather, 0, 0.08, 0, 1, 1, 0.8);
  // the crook on his back and a sleepy lamb peeking out of his satchel
  const crook = joint(P.spine, -0.18, 0.4, 0.22); crook.rotation.z = 0.35;
  part(crook, tube(0.022, 0.022, 1.5), K.c(0x8a5a3a), 0, 0, 0);
  part(crook, ring(0.1, 0.022, Math.PI * 1.3), K.c(0x8a5a3a), 0.1, 0.75, 0).rotation.z = -0.2;
  part(P.hips, slab(0.24, 0.22, 0.14), K.leather, 0.26, 0.05, 0.12);
  const lamb = joint(P.hips, 0.26, 0.2, 0.12);
  part(lamb, ball(0.1), K.c(0xf6f2ea, { rough: 1 }), 0, 0, 0);
  part(lamb, ball(0.06), K.c(0x2a2a32), 0, 0.03, -0.08, 1, 1, 1.2);
  // Shepherd's Sling: a leather pouch on two cords swinging from his hand
  const gun = gunAt(P, 0.28, 1.2, -0.38);
  part(gun, tube(0.03, 0.03, 0.12), K.leather, 0, 0, 0.05).rotation.x = Math.PI / 2;
  const cords = joint(gun, 0, 0, -0.05);
  for (const s of [-1, 1]) part(cords, tube(0.006, 0.006, 0.35), K.c(0xd8c8a0), s * 0.03, -0.17, 0);
  part(cords, ball(0.06), K.leather, 0, -0.36, 0, 1.2, 0.7, 1);
  part(cords, ball(0.04), K.c(0xc8c0b0), 0, -0.33, 0);
  return finish(P, team, gun, -0.2, (dt, s, t, k) => {
    cords.rotation.x = Math.sin(t * (3 + k * 6)) * (0.4 + k * 0.6);
    lamb.rotation.y = Math.sin(t * 0.9) * 0.4; lamb.position.y = 0.2 + Math.abs(Math.sin(t * 6)) * 0.02 * k;
  }, { stride: 1.2 });
}

// ---------------- The Microwave: a kitchen appliance with legs ----------------
function microwave(p, team) {
  const K = kit(p);
  const shell = K.c(p.main, { rough: 0.3, metal: 0.35 }), dark = K.c(p.trim, { rough: 0.4 });
  const P = body(K, { w: 1.1, headR: 0, shoes: 'sneaker', boots: K.c(0x3a3f4a), soles: K.c(0x1d1d24), top: shell, sleeves: K.c(0x8a94a8, { metal: 0.5 }), forearms: K.c(0x8a94a8, { metal: 0.5 }), pants: K.c(0x8a94a8, { metal: 0.5 }), gloves: K.c(0x3a3f4a) });
  P.torso.visible = false; P.neck.visible = false;
  // the box itself sits on top of the legs
  part(P.spine, slab(1.0, 0.7, 0.7), shell, 0, 0.55, 0);
  for (const x of [-0.42, 0.42]) part(P.spine, slab(0.08, 0.08, 0.08), K.c(0x2a2f3c), x, 0.18, 0.3);     // little rubber feet on the back corners
  // the door: a dark window with a glowing interior and a spinning plate inside
  part(P.spine, slab(0.66, 0.56, 0.03), dark, -0.13, 0.55, -0.355);
  const glow = live(part(P.spine, slab(0.56, 0.44, 0.02), K.c(0xffd27a, { glow: 0.7, rim: 0 }), -0.13, 0.55, -0.36));
  const plate = live(part(P.spine, tube(0.18, 0.18, 0.02, 16), K.c(0xffffff, { rough: 0.2 }), -0.13, 0.36, -0.2));
  const dish = live(part(plate, ball(0.08), K.c(0xc8642e), 0, 0.06, 0, 1.4, 0.6, 1));          // the same lasagne, forever
  part(P.spine, slab(0.05, 0.3, 0.05), K.steel, 0.17, 0.55, -0.39);                              // door handle
  // control panel with a clock, buttons and a dial, plus the face on the panel
  part(P.spine, slab(0.24, 0.6, 0.02), K.c(0x2a2f3c), 0.36, 0.55, -0.355);
  const clock = live(part(P.spine, slab(0.18, 0.07, 0.01), K.c(0x5af0ff, { glow: 1, rim: 0 }), 0.36, 0.78, -0.37));
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) part(P.spine, slab(0.04, 0.03, 0.01), K.c(0xd8dee8), 0.31 + c * 0.05, 0.47 - r * 0.05, -0.37);
  part(P.spine, tube(0.04, 0.04, 0.03), K.steel, 0.36, 0.3, -0.37).rotation.x = Math.PI / 2;
  P.head.position.set(-0.13, 0.6, 0);
  face(P, K, { r: 0.42, brow: 0.2, mouth: 'open' });
  // Heat Beam: a handheld emitter dish with a glowing core
  const gun = gunAt(P, 0.42, 1.2, -0.4);
  part(gun, tube(0.04, 0.04, 0.25), K.c(0x3a3f4a), 0, 0, 0.05).rotation.x = Math.PI / 2;
  const dishG = part(gun, cone(0.14, 0.12, 16), shell, 0, 0, -0.14); dishG.rotation.x = -Math.PI / 2;
  const core = live(part(gun, ball(0.05), K.c(0xffd27a, { glow: 1.4, rim: 0 }), 0, 0, -0.2));
  return finish(P, team, gun, -0.24, (dt, s, t, k) => {
    plate.rotation.y += dt * 2;
    glow.scale.setScalar(0.97 + Math.sin(t * 5) * 0.03);
    clock.visible = Math.sin(t * 3) > -0.6;
    core.scale.setScalar(0.85 + Math.sin(t * 12) * 0.15 * (1 + k));
    dish.rotation.y = Math.sin(t) * 0.2;
  }, { stride: 0.9 });
}

// ---------------- Flambé: the head chef with a bazooka ----------------
function chef(p, team) {
  const K = kit(p);
  const coat = K.c(p.main, { rough: 0.7 }), check = K.c(p.dark, { rough: 0.85 }), copper = K.c(0xc87a4a, { rough: 0.3, metal: 0.55 });
  const P = body(K, { w: 1.12, shoes: 'boot', boots: K.ink, top: coat, sleeves: coat, forearms: K.skin, pants: check, gloves: K.skin, torso: [0.24, 0.27, 0.32, 0.29, 0.56] });
  face(P, K, { brow: 0.08, mouth: 'smile', cheeks: true, eyeColor: 0x3a6a8a });
  // a curled moustache and the tallest toque in the hotel
  for (const s of [-1, 1]) { const m = part(P.head, pill(0.03, 0.1), K.c(0x3a2418), s * 0.07, -0.07, -0.27); m.rotation.z = Math.PI / 2 + s * 0.3; part(P.head, ball(0.03), K.c(0x3a2418), s * 0.14, -0.04, -0.25); }
  const toque = joint(P.head, 0, 0.2, 0.02);
  part(toque, tube(0.24, 0.22, 0.12), K.white, 0, 0.04, 0);
  part(toque, tube(0.26, 0.24, 0.32), K.white, 0, 0.24, 0);
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; part(toque, ball(0.14), K.white, Math.sin(a) * 0.16, 0.42, Math.cos(a) * 0.16); }
  part(toque, ball(0.16), K.white, 0, 0.46, 0);
  // double-breasted jacket, red neckerchief, an apron and a tea towel tucked in the strings
  for (const x of [-0.08, 0.08]) for (let i = 0; i < 3; i++) part(P.spine, ball(0.022), K.c(p.trim), x, 0.22 + i * 0.1, -0.245);
  part(P.spine, tube(0.12, 0.13, 0.07), K.c(p.trim), 0, 0.57, 0);
  part(P.spine, cone(0.07, 0.14, 4), K.c(p.trim), 0.02, 0.48, -0.17).rotation.x = Math.PI;
  part(P.hips, slab(0.42, 0.5, 0.03), K.white, 0, -0.2, -0.23);
  part(P.hips, slab(0.1, 0.24, 0.02), K.c(0xc23b3b, { rough: 0.9 }), 0.24, -0.12, -0.17).rotation.y = 0.5;
  // Bouillabazooka: a copper stockpot tube with a lid sight, a ladle grip and a casserole rocket up front
  const gun = gunAt(P, 0.32, 1.32, -0.34);
  part(gun, tube(0.12, 0.12, 1.05, 18), copper, 0, 0.04, 0.1).rotation.x = Math.PI / 2;
  part(gun, tube(0.16, 0.13, 0.14, 18), copper, 0, 0.04, -0.46).rotation.x = Math.PI / 2;
  part(gun, cone(0.15, 0.2, 18), K.c(0x3a3f4a, { rough: 0.4 }), 0, 0.04, 0.72).rotation.x = Math.PI / 2;
  for (const z of [-0.2, 0.25]) part(gun, ring(0.125, 0.018), K.c(0x8a4a2a, { metal: 0.6 }), 0, 0.04, z);
  part(gun, tube(0.08, 0.08, 0.025), K.steel, 0, 0.18, 0.1);                          // a pot lid for a sight
  part(gun, ball(0.025), K.c(0x1d1d24), 0, 0.2, 0.1);
  part(gun, slab(0.05, 0.18, 0.06), K.leather, 0, -0.12, 0.05);                          // grip
  const rocket = live(part(gun, ball(0.1), K.c(p.trim, { rough: 0.4, glow: 0.25 }), 0, 0.04, -0.5, 1, 1, 1.3));
  const steam = [0, 1].map(i => live(part(gun, ball(0.04), K.c(0xffffff, { glow: 0.3, rim: 0 }), 0, 0.12, 0.8 + i * 0.05)));
  return finish(P, team, gun, -0.6, (dt, s, t, k) => {
    toque.rotation.z = Math.sin(t * 2.1) * 0.04 * (1 + k * 2);
    rocket.scale.setScalar(1 + Math.sin(t * 6) * 0.04);
    steam.forEach((m, i) => { const u = (t * 0.7 + i / 2) % 1; m.position.set(0, 0.1 + u * 0.3, 0.8 + u * 0.12); m.scale.setScalar(0.5 + u * 1.2); m.visible = u < 0.85; });
  }, { stride: 1.4, aim: [1.15, 0.5], off: [1.1, 0.9, 0.35] });
}

// ---------------- Man-Spider: a spider who was bitten by a man ----------------
// A segment of spider leg as a capsule from a to b, in the parent's space.
const Y = new THREE.Vector3(0, 1, 0);
function seg(parent, a, b, r, m) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), len = d.length();
  const o = part(parent, pill(r, Math.max(0.01, len - r * 2)), m, (A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  o.quaternion.setFromUnitVectors(Y, d.normalize());
  return o;
}
function manspider(p, team) {
  const K = kit(p);
  const shell = K.c(p.main, { rough: 0.45, rim: 0.6 }), deep = K.c(p.dark, { rough: 0.5 }), mark = K.c(p.trim, { rough: 0.35, glow: 0.2 });
  const hair = K.c(0x6a5a4a, { rough: 0.95 });
  const P = body(K, { w: 0.85, legs: false, headR: 0, hipY: 0.62, top: shell, sleeves: deep, forearms: deep, pants: shell, gloves: deep, torso: [0.2, 0.22, 0.24, 0.22, 0.42] });
  P.torso.visible = false; P.neck.visible = false;
  // the body: a round cephalothorax up front and a big striped abdomen behind
  part(P.spine, ball(0.34), shell, 0, 0.22, -0.02, 1, 0.85, 1.05);
  const abd = live(part(P.hips, ball(0.5), shell, 0, 0.18, 0.62, 1, 0.85, 1.15));
  for (let i = 0; i < 3; i++) part(P.hips, ring(0.32 - i * 0.07, 0.035), mark, 0, 0.55 - i * 0.07, 0.62 + i * 0.06).rotation.x = Math.PI / 2 - 0.35;
  part(P.hips, ball(0.1), mark, 0, 0.1, 1.15);                                          // spinnerets
  // the head: two big friendly eyes, six little spider ones, reading glasses and a sad combover
  P.head.position.set(0, 0.42, -0.24);
  part(P.head, ball(0.27), shell, 0, 0, 0, 1, 0.95, 0.95);
  face(P, K, { r: 0.27, brow: -0.08, mouth: 'flat', eyeColor: 0x7a4ad8 });
  for (const [x, y, z] of [[-0.18, 0.13, -0.18], [0.18, 0.13, -0.18], [-0.07, 0.2, -0.21], [0.07, 0.2, -0.21], [-0.22, 0.03, -0.14], [0.22, 0.03, -0.14]]) {
    part(P.head, ball(0.035), K.eye, x, y, z); part(P.head, ball(0.01), K.shine, x - 0.01, y + 0.012, z - 0.03);
  }
  for (const s of [-1, 1]) part(P.head, ring(0.07, 0.01), K.c(0x2a2a32, { metal: 0.4 }), s * 0.105, 0.035, -0.26);
  part(P.head, slab(0.06, 0.012, 0.012), K.c(0x2a2a32), 0, 0.04, -0.27);
  for (let i = 0; i < 5; i++) { const c = part(P.head, pill(0.012, 0.36), hair, -0.08 + i * 0.04, 0.25, 0.02); c.rotation.z = Math.PI / 2 - 0.15; }
  // fangs, a white shirt collar, a tie and an ID badge on a lanyard
  for (const s of [-1, 1]) part(P.head, cone(0.025, 0.1, 6), K.c(0xe8e0d0), s * 0.05, -0.2, -0.2).rotation.x = Math.PI;
  part(P.spine, tube(0.16, 0.2, 0.08), K.white, 0, 0.42, -0.14).rotation.x = -0.4;
  const tie = live(part(P.spine, slab(0.07, 0.3, 0.02), K.c(0xc23b3b, { rough: 0.5 }), 0, 0.2, -0.34));
  tie.rotation.x = 0.25;
  part(P.spine, slab(0.1, 0.13, 0.01), K.white, 0.16, 0.18, -0.3).rotation.y = 0.4;
  // eight legs, four a side, each a joint so they can scuttle
  const legs = [];
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
    const l = joint(P.spine, s * 0.2, 0.2, -0.18 + i * 0.13);
    l.rotation.y = s * (-0.6 + i * 0.4);
    seg(l, [0, 0, 0], [s * 0.5, 0.32, 0], 0.045, deep);
    part(l, ball(0.06), shell, s * 0.5, 0.32, 0);
    seg(l, [s * 0.5, 0.32, 0], [s * 0.82, -0.8, 0], 0.038, deep);
    part(l, ball(0.035), mark, s * 0.82, -0.8, 0);
    l.userData.side = s; l.userData.ph = i * Math.PI / 2 + (s > 0 ? Math.PI : 0);
    legs.push(l);
  }
  // Web Spitter: a coffee flask he has wired up to shoot silk
  const gun = gunAt(P, 0.24, 1.0, -0.5);
  part(gun, tube(0.07, 0.07, 0.3), K.c(0x3a3f4a, { metal: 0.4 }), 0, 0, 0.02).rotation.x = Math.PI / 2;
  part(gun, tube(0.075, 0.075, 0.04), mark, 0, 0, -0.08).rotation.x = Math.PI / 2;
  part(gun, ring(0.05, 0.015, Math.PI), K.c(0x3a3f4a), 0.08, 0, 0.04).rotation.y = Math.PI / 2;
  const nozzle = live(part(gun, ball(0.05), K.c(0xf4f4ff, { glow: 0.7, rim: 0 }), 0, 0, -0.17));
  return finish(P, team, gun, -0.2, (dt, s, t, k, w) => {
    legs.forEach(l => {
      const a = Math.sin(w * 2 + l.userData.ph), sd = l.userData.side;
      l.rotation.z = sd * Math.max(0, a) * 0.35 * k;                                   // lift
      l.rotation.y = sd * (-0.6 + legs.indexOf(l) % 4 * 0.4) + Math.cos(w * 2 + l.userData.ph) * 0.25 * k;
    });
    abd.scale.set(1 + Math.sin(t * 2) * 0.03, 0.85 + Math.sin(t * 2) * 0.03, 1.15);
    tie.rotation.z = Math.sin(t * 3) * 0.15 * (0.3 + k);
    nozzle.scale.setScalar(0.85 + Math.sin(t * 7) * 0.15);
  }, { legs: [legs[1], legs[5]], stride: 1.3 });
}

export const ROSTER_C = { slime, brawler, chipmunk, elf, dancer, mole, medic, spark, builder, wellington, shepherd, microwave, chef, manspider };
