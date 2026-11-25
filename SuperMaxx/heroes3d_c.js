import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { kit, body, face, finish, gunAt, part, joint, chain, ball, pill, tube, cone, ring, slab, dome, live } from './rig.js?v=20261125q';

// Slot machine heroes on the stylised rig: Gloop, Torque, Nutcracker, Larkspur, Pirouette and Burrow.

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

export const ROSTER_C = { slime, brawler, chipmunk, elf, dancer, mole };
