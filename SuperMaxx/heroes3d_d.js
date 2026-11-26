import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { kit, body, face, finish, gunAt, part, joint, chain, ball, pill, tube, cone, ring, slab, dome, live } from './rig.js?v=20261127l';

// Season 2 "Insert Coin" heroes on the stylised rig: Tilt, Grabbit and Sir Pixel, plus the contract hero Hoot.

// ---------------- Tilt: a pinball wizard in an arcade jacket ----------------
function pinball(p, team) {
  const K = kit(p);
  const neon = K.c(p.trim, { rough: 0.2, glow: 0.8, rim: 0.2 });
  const P = body(K, { w: 0.95, torso: [0.19, 0.2, 0.27, 0.26, 0.54], top: K.main, sleeves: K.main, forearms: K.dark, pants: K.dark, gloves: K.c(0x1d2340, { rough: 0.5 }), shoes: 'sneaker', soles: neon });
  face(P, K, { mouth: 'smirk', brow: 0.2, cheeks: true, lashes: true });
  // big swept hair with a sweatband, and a pinball tucked in it
  const hair = K.c(0x2a1040, { rough: 0.7 });
  part(P.head, dome(0.31, Math.PI * 0.55), hair, 0, 0.03, 0.02, 1.05, 1, 1.05);
  part(P.head, ball(0.2), hair, 0, 0.1, 0.24, 1.1, 1, 0.9);
  part(P.head, tube(0.3, 0.3, 0.07), neon, 0, 0.12, 0, 1.02, 1, 1).rotation.x = -0.12;
  const hb = live(part(P.head, ball(0.08), K.steel, 0.24, 0.24, -0.05));
  // jacket stripes, a coin bag at the hip and light-up knee pads
  for (const y of [0.18, 0.3]) part(P.spine, slab(0.6, 0.035, 0.02), neon, 0, y, -0.205);
  part(P.hips, slab(0.16, 0.12, 0.1), K.c(0x8a5a2b, { rough: 0.9 }), -0.24, 0, -0.08);
  for (const k of [P.kneeL, P.kneeR]) part(k, ball(0.08), neon, 0, 0.02, -0.06, 1, 1, 0.6);
  // Multiball Launcher: a pinball plunger cabinet with a glass tube of balls on top
  const gun = gunAt(P, 0.28, 1.2, -0.44);
  part(gun, slab(0.2, 0.18, 0.5), K.main, 0, 0, 0);
  part(gun, slab(0.21, 0.04, 0.51), neon, 0, 0.1, 0);
  part(gun, tube(0.06, 0.06, 0.4), K.c(0xdff6ff, { rough: 0.05, glow: 0.12 }), 0, 0.15, 0).rotation.x = Math.PI / 2;
  const balls = [-0.12, 0, 0.12].map(z => live(part(gun, ball(0.045), K.steel, 0, 0.15, z)));
  part(gun, tube(0.05, 0.05, 0.12), K.steel, 0, 0, -0.3).rotation.x = Math.PI / 2;
  const plunger = live(part(gun, tube(0.025, 0.025, 0.2), K.steel, 0, -0.02, 0.32));
  plunger.rotation.x = Math.PI / 2;
  part(plunger, ball(0.05), K.c(0xff3a3a, { rough: 0.3 }), 0, -0.11, 0);
  return finish(P, team, gun, -0.38, (dt, s, t, k) => {
    balls.forEach((b, i) => { b.position.y = 0.15 + Math.abs(Math.sin(t * 6 + i * 1.3)) * 0.02; });
    plunger.position.z = 0.32 + Math.max(0, Math.sin(t * 2.4)) * 0.05 * (1 - k);
    hb.rotation.y += dt * 4;
    P.head.rotation.z = Math.sin(t * 1.4) * 0.06 * (1 - k);
  });
}

// ---------------- Grabbit: a walking claw machine ----------------
function clawbot(p, team) {
  const K = kit(p);
  const frame = K.c(p.main, { rough: 0.35, metal: 0.15 });
  const gold = K.c(p.trim, { rough: 0.3, metal: 0.3, glow: 0.15 });
  const glass = K.c(0xbff4ff, { rough: 0.05, glow: 0.1, rim: 0.9 });
  const P = body(K, { w: 1.3, headR: 0, torso: [0.3, 0.32, 0.36, 0.36, 0.6], flat: 0.9, top: frame, sleeves: K.steel, forearms: frame, gloves: gold, pants: K.dark, shins: frame, boots: K.dark });
  P.neck.visible = false;
  // the cabinet: a glass box on the chest full of plush prizes
  part(P.spine, slab(0.62, 0.5, 0.5), glass, 0, 0.3, -0.02);
  for (const y of [0.04, 0.56]) part(P.spine, slab(0.66, 0.05, 0.54), frame, 0, y, -0.02);
  const plush = [[0xff6fb5, -0.14, -0.08], [0xffd23c, 0.1, 0.05], [0x8b7bff, 0.02, -0.12], [0x39d86a, -0.1, 0.12]];
  for (const [c, x, z] of plush) { const b = part(P.spine, ball(0.08), K.c(c, { rough: 0.95 }), x, 0.14, z); part(b, ball(0.03), K.c(c, { rough: 0.95 }), 0.05, 0.07, 0); part(b, ball(0.03), K.c(c, { rough: 0.95 }), -0.05, 0.07, 0); }
  part(P.spine, slab(0.3, 0.08, 0.03), K.c(0xff3fa4, { glow: 0.8 }), 0, 0.02, -0.29);
  // a coin slot and a big red button on the front
  part(P.spine, slab(0.1, 0.06, 0.02), K.ink, 0.18, 0.02, -0.3);
  part(P.spine, tube(0.04, 0.04, 0.03), K.c(0xff3a3a, { rough: 0.3, glow: 0.3 }), -0.2, 0.02, -0.3).rotation.x = Math.PI / 2;
  // head: the marquee sign with a screen face
  part(P.head, slab(0.6, 0.28, 0.36), frame, 0, -0.02, 0);
  part(P.head, slab(0.5, 0.18, 0.02), K.c(0x10142a, { rough: 0.2 }), 0, -0.02, -0.19);
  P.eyes = [-1, 1].map(s => { const e = joint(P.head, s * 0.11, 0, -0.205); part(e, slab(0.07, 0.07, 0.01), K.c(p.trim, { glow: 1, rim: 0 })); return e; });
  const bulbs = [-0.24, -0.12, 0, 0.12, 0.24].map(x => live(part(P.head, ball(0.025), K.c(0xffffff, { glow: 0.8, rim: 0 }), x, 0.14, -0.19)));
  // the crane on top: a gantry, a cable and the claw itself
  part(P.head, slab(0.06, 0.06, 0.4), K.steel, 0, 0.18, 0);
  const crane = joint(P.head, 0, 0.18, -0.1);
  const cable = live(part(crane, tube(0.012, 0.012, 0.3), K.ink, 0, 0.15, 0));
  const claw = joint(crane, 0, 0.32, 0);
  part(claw, ball(0.06), K.steel, 0, 0, 0);
  const fingers = [0, 1, 2].map(i => { const f = joint(claw, 0, 0, 0); f.rotation.y = i * Math.PI * 2 / 3; const pr = part(f, pill(0.015, 0.1), gold, 0, 0.07, 0.04); pr.rotation.x = -0.5; return f; });
  // Token Scattergun: a coin hopper with a wide bell mouth
  const gun = gunAt(P, 0.34, 1.16, -0.46);
  part(gun, slab(0.22, 0.2, 0.36), frame, 0, 0, 0);
  part(gun, cone(0.12, 0.2, 14), gold, 0, 0, -0.26).rotation.x = -Math.PI / 2;
  part(gun, tube(0.08, 0.08, 0.12), glass, 0, 0.16, 0.04);
  const coins = [0, 1, 2].map(i => live(part(gun, tube(0.04, 0.04, 0.012), K.gold, 0, 0.12 + i * 0.03, 0.04)));
  return finish(P, team, gun, -0.36, (dt, s, t, k) => {
    crane.rotation.y = Math.sin(t * 0.8) * 0.6;
    claw.position.y = 0.32 + Math.sin(t * 1.6) * 0.04;
    cable.scale.y = 1 + Math.sin(t * 1.6) * 0.1;
    const open = 0.3 + Math.sin(t * 1.6) * 0.25;
    fingers.forEach(f => { f.rotation.x = open; });
    bulbs.forEach((b, i) => { b.visible = ((t * 6 + i) | 0) % 2 === 0; });
    coins.forEach((c, i) => { c.rotation.x = t * 3 + i; });
  }, { stride: 1.3 });
}

// ---------------- Sir Pixel: a knight who looks like he stepped out of an 8-bit game ----------------
function pixel(p, team) {
  const K = kit(p);
  const plate = K.c(p.main, { rough: 0.55 });
  const gold = K.c(p.trim, { rough: 0.35, metal: 0.25 });
  const P = body(K, { w: 1.05, headR: 0, torso: [0.21, 0.22, 0.29, 0.28, 0.56], top: plate, sleeves: K.dark, forearms: plate, gloves: gold, pants: K.dark, boots: plate });
  // blocky voxel armour over the round body
  part(P.spine, slab(0.56, 0.3, 0.4), plate, 0, 0.32, 0);
  part(P.spine, slab(0.2, 0.2, 0.02), gold, 0, 0.32, -0.21);
  part(P.spine, slab(0.08, 0.08, 0.02), K.c(0xff3a3a, { glow: 0.3 }), 0, 0.32, -0.225);
  for (const a of [P.armL, P.armR]) part(a, slab(0.2, 0.12, 0.2), gold, 0, 0.04, 0);
  part(P.hips, slab(0.48, 0.12, 0.34), gold, 0, 0.02, 0);
  // the helmet: a cube with a visor slit and a pixel plume
  part(P.head, slab(0.48, 0.46, 0.46), plate, 0, 0, 0);
  part(P.head, slab(0.5, 0.06, 0.48), gold, 0, -0.2, 0);
  part(P.head, slab(0.34, 0.16, 0.02), K.c(0xf0c09a, { rough: 0.8 }), 0, 0.0, -0.235);
  P.eyes = [-1, 1].map(s => { const e = joint(P.head, s * 0.08, 0.01, -0.25); part(e, slab(0.06, 0.06, 0.01), K.ink); return e; });
  part(P.head, slab(0.36, 0.04, 0.02), K.ink, 0, 0.1, -0.24);
  [0, 1, 2, 3].forEach(i => part(P.head, slab(0.08, 0.08, 0.08), K.c(0xff3a3a, { rough: 0.6 }), 0, 0.27 + (i < 2 ? i * 0.08 : 0.08), 0.04 + (i >= 2 ? (i - 1) * 0.08 : 0)));
  // a pixel cape and a floating heart that bobs over his shoulder
  const cape = joint(P.spine, 0, 0.5, 0.2);
  [0, 1, 2, 3].forEach(i => part(cape, slab(0.44 - i * 0.04, 0.12, 0.03), K.c(p.dark, { rough: 0.8 }), 0, -0.06 - i * 0.12, 0));
  const heart = live(joint(P.root, -0.45, 2.0, 0));
  const red = K.c(0xff3a5a, { glow: 0.6, rim: 0 });
  for (const [x, y] of [[-1, 1], [1, 1], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [-1, -1], [0, -1], [1, -1], [0, -2]]) part(heart, slab(0.05, 0.05, 0.05), red, x * 0.05, y * 0.05, 0);
  heart.children.forEach(c => { c.userData.live = true; });
  // Pixel Blaster: a chunky stepped gun built from cubes
  const gun = gunAt(P, 0.27, 1.22, -0.44);
  part(gun, slab(0.14, 0.16, 0.34), plate, 0, 0, 0);
  part(gun, slab(0.1, 0.1, 0.16), gold, 0, 0.02, -0.24);
  part(gun, slab(0.06, 0.06, 0.08), K.c(0x39ff6a, { glow: 0.9, rim: 0 }), 0, 0.02, -0.34);
  part(gun, slab(0.08, 0.14, 0.08), K.dark, 0, -0.14, 0.08);
  const gem = live(part(gun, slab(0.05, 0.05, 0.05), K.c(0x39ff6a, { glow: 0.9, rim: 0 }), 0, 0.11, 0));
  return finish(P, team, gun, -0.38, (dt, s, t, k) => {
    heart.position.y = 2.0 + Math.sin(t * 2.5) * 0.08;
    heart.rotation.y = ((t * 2) | 0) * Math.PI / 4;                       // turns in steps, like a sprite
    gem.visible = ((t * 3) | 0) % 2 === 0;
    cape.rotation.x = 0.1 + k * 0.4 + Math.sin(t * 5) * 0.04;
  });
}


// ---------------- Hoot: a barn owl night courier in an aviator cap ----------------
function owl(p, team) {
  const K = kit(p), f = p.finish || {};
  const plume = K.c(p.main, { rough: 0.85, metal: f.metal || 0, glow: f.glow || 0 });
  const down = K.c(p.skin, { rough: 0.9, rim: 0.5 });
  const quill = K.c(p.dark, { rough: 0.8 });
  const talon = K.c(0xf2c14e, { rough: 0.5 });
  const P = body(K, { w: 1.15, legs: false, headR: 0, torso: [0.3, 0.33, 0.34, 0.27, 0.56], flat: 0.95, top: plume, sleeves: plume, forearms: plume, gloves: plume, pants: plume });
  P.neck.visible = false;
  // round speckled belly
  part(P.spine, ball(0.27), down, 0, 0.22, -0.12, 1, 1.2, 0.7);
  for (const [x, y] of [[-0.08, 0.3], [0.1, 0.22], [-0.04, 0.12], [0.06, 0.36], [0.12, 0.08], [-0.12, 0.18]]) part(P.spine, ball(0.018), quill, x, y, -0.3);
  // the head: a big round dome with the heart-shaped white face of a barn owl
  part(P.head, ball(0.34), plume, 0, 0, 0, 1.08, 0.98, 1);
  for (const s of [-1, 1]) part(P.head, ball(0.17), down, s * 0.11, -0.02, -0.24, 0.95, 1.15, 0.45);
  part(P.head, ball(0.08), down, 0, -0.14, -0.26, 1.2, 1, 0.6);
  P.eyes = [-1, 1].map(s => {
    const e = joint(P.head, s * 0.11, 0.0, -0.31);
    part(e, ball(0.07), K.c(0x1a1208, { rough: 0.1 }), 0, 0, 0, 1, 1, 0.5);
    part(e, ball(0.022), K.shine, s * -0.02, 0.025, -0.03);
    return e;
  });
  part(P.head, cone(0.04, 0.12, 8), K.c(0xe8a23a, { rough: 0.4 }), 0, -0.09, -0.34).rotation.x = Math.PI * 0.6;
  // aviator cap with ear flaps, a chinstrap and goggles pushed up on the brow
  const cap = K.c(0x6b4a33, { rough: 0.75 });
  part(P.head, dome(0.36, Math.PI * 0.42), cap, 0, 0.05, 0.02, 1.05, 1, 1.02);
  for (const s of [-1, 1]) { const fl = part(P.head, slab(0.07, 0.22, 0.16), cap, s * 0.33, -0.05, 0.02); fl.rotation.z = s * 0.15; }
  const lens = K.c(0x9ad8ff, { rough: 0.05, glow: 0.25, rim: 0.9 });
  part(P.head, tube(0.33, 0.33, 0.05), K.c(0x3a2a1e, { rough: 0.6 }), 0, 0.2, 0, 1.02, 1, 1).rotation.x = -0.25;
  for (const s of [-1, 1]) {
    const g = part(P.head, tube(0.075, 0.075, 0.06), K.steel, s * 0.1, 0.25, -0.27); g.rotation.x = Math.PI / 2 - 0.5;
    part(g, tube(0.06, 0.06, 0.02), lens, 0, -0.03, 0);
  }
  // a long red knitted scarf, and a mail satchel full of letters
  const wool = K.c(0xc23b3b, { rough: 0.95 });
  part(P.spine, tube(0.24, 0.27, 0.1), wool, 0, 0.55, 0);
  const scarf = chain(P.spine, 6, 0.13, wool, 0.12, 0.52, 0.22, 0.055, 0.04);
  part(P.spine, slab(0.05, 0.6, 0.03), K.leather, 0, 0.28, -0.3).rotation.z = 0.7;
  const bag = joint(P.hips, -0.3, 0.05, -0.05);
  part(bag, slab(0.1, 0.24, 0.3), K.leather, 0, 0, 0);
  for (const [z, c] of [[-0.06, 0xfff8e8], [0.04, 0xf2e2c0], [0.1, 0xffe0e8]]) part(bag, slab(0.02, 0.14, 0.18), K.c(c, { rough: 0.9 }), 0.0, 0.15, z);
  part(bag, ball(0.025), K.c(0xc23b3b, { rough: 0.4 }), -0.055, 0.02, 0);
  // wings: a row of long primary feathers along each arm, dark-tipped
  const wingFeathers = (elbow, s) => {
    for (let i = 0; i < 5; i++) {
      const fj = joint(elbow, s * 0.02, -0.08 - i * 0.055, 0.06);
      fj.rotation.x = 0.25 + i * 0.12;
      part(fj, slab(0.03, 0.34 - i * 0.03, 0.09), plume, 0, -0.14, 0.04);
      part(fj, slab(0.032, 0.08, 0.092), quill, 0, -0.3 + i * 0.015, 0.04);
    }
  };
  wingFeathers(P.elbowR, 1); wingFeathers(P.elbowL, -1);
  for (const a of [P.armR, P.armL]) part(a, ball(0.12), plume, 0, -0.1, 0.06, 1, 1.4, 1.2);
  // a fan of tail feathers
  const tail = joint(P.hips, 0, -0.05, 0.25);
  for (let i = -2; i <= 2; i++) { const tf = part(tail, slab(0.08, 0.03, 0.3), i % 2 ? quill : plume, i * 0.06, 0, 0.12); tf.rotation.y = i * 0.18; }
  // short feathery legs with yellow talons
  const legs = [-1, 1].map(s => {
    const l = joint(P.root, s * 0.15, 0.5, 0);
    part(l, pill(0.09, 0.2), down, 0, -0.18, 0);
    for (let i = -1; i <= 1; i++) { const toe = part(l, cone(0.03, 0.14, 6), talon, i * 0.05, -0.44, -0.07); toe.rotation.x = -Math.PI / 2; }
    part(l, cone(0.025, 0.1, 6), talon, 0, -0.44, 0.06).rotation.x = Math.PI / 2;
    return l;
  });
  // Quill Caster: a brass fountain-pen launcher with an inkwell drum
  const gun = gunAt(P, 0.3, 1.22, -0.44);
  part(gun, tube(0.055, 0.07, 0.42), K.c(0x2a3a5a, { rough: 0.3, metal: 0.2 }), 0, 0, -0.02).rotation.x = Math.PI / 2;
  part(gun, cone(0.055, 0.14, 10), K.gold, 0, 0, -0.3).rotation.x = -Math.PI / 2;
  part(gun, slab(0.006, 0.02, 0.08), K.ink, 0, 0.03, -0.32);
  part(gun, tube(0.075, 0.075, 0.025), K.gold, 0, 0, 0.12).rotation.x = Math.PI / 2;
  const ink = live(part(gun, ball(0.07), K.c(0x3a6aff, { rough: 0.05, glow: 0.5 }), 0, 0.09, 0.06));
  for (const s of [-1, 1]) { const q = part(gun, slab(0.015, 0.22, 0.05), down, s * 0.06, 0.1, 0.12); q.rotation.z = s * 0.4; }
  let o = null;
  o = finish(P, team, gun, -0.38, (dt, sp, t, k) => {
    scarf.wave(t, o?.flying ? 1 : k, o?.flying ? 0.3 : 0.18, 9);
    ink.scale.y = 1 + Math.sin(t * 3) * 0.08;
    tail.rotation.x = -0.15 + Math.sin(t * 1.8) * 0.05;
    // the head swivels round every so often, like owls do
    const look = Math.max(0, Math.sin(t * 0.45)) ** 6;
    P.head.rotation.y += look * 1.4 * (1 - k);
    if (o?.flying) {
      // in the air: big wingbeats with the free wing, legs tucked, body tilted into the flight
      const fl = Math.sin(t * 14);
      P.armL.rotation.set(0.2, 0, -0.6 - fl * 0.9); P.elbowL.rotation.x = 0.1;
      P.armR.rotation.z = 0.5 + fl * 0.6;
      P.spine.rotation.x = 0.25;
      legs.forEach(l => { l.rotation.x = 0.6; });
    } else legs.forEach((l, i) => { l.rotation.x = Math.sin(t * 9 + i * Math.PI) * 0.5 * k; });
  }, { legs, stride: 1.6 });
  return o;
}
export const ROSTER_D = { pinball, clawbot, pixel, owl };
