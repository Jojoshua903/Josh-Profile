import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { kit, body, face, finish, gunAt, part, joint, chain, ball, pill, tube, cone, ring, slab, dome, hood } from './rig.js?v=20261125v';

// Second half of the roster, plus the season heroes, on the stylised rig.

// ---------------- Mirage: headliner of the Velvet Theatre ----------------
function mirage(p, team) {
  const K = kit(p);
  const P = body(K, { w: 0.92, torso: [0.2, 0.19, 0.26, 0.25, 0.58], top: K.main, pants: K.dark, boots: K.ink, gloves: K.white });
  face(P, K, { brow: 0.25, mouth: 'smirk', lashes: true });
  part(P.spine, slab(0.14, 0.36, 0.02), K.white, 0, 0.32, -0.205);                                   // shirt front
  const bow = joint(P.spine, 0, 0.53, -0.18);
  for (const s of [-1, 1]) part(bow, cone(0.05, 0.1, 12), K.trim, s * 0.05, 0, 0).rotation.z = s * Math.PI / 2;
  part(bow, ball(0.025), K.trim);
  // slick hair, glittering domino mask, curled moustache
  part(P.head, dome(0.305, Math.PI * 0.55), K.c(0x1d1d24, { rough: 0.25 }), 0, 0.05, 0.03, 1, 1, 1.04);
  part(P.head, ring(0.2, 0.03, Math.PI), K.c(p.trim, { glow: 0.3 }), 0, 0.06, -0.23).rotation.z = 0;
  for (const s of [-1, 1]) part(P.head, ring(0.04, 0.012, Math.PI * 1.3), K.ink, s * 0.06, -0.075, -0.27).rotation.z = s > 0 ? -0.3 : Math.PI + 0.3;
  // tailcoat tails and a short cape with a bright lining
  const tails = [-1, 1].map(s => chain(P.hips, 3, 0.14, K.main, s * 0.1, 0.05, 0.18, 0.08, 0.06, [0, -0.85, 0.35]));
  const cape = joint(P.spine, 0, 0.55, 0.17);
  part(cape, slab(0.55, 0.7, 0.025), K.trim, 0, -0.35, 0.015);
  part(cape, slab(0.56, 0.71, 0.02), K.main, 0, -0.35, 0.035);
  // Trick Deck: a fanned hand of cards
  const gun = gunAt(P, 0.24, 1.28, -0.5);
  for (let i = 0; i < 5; i++) { const c = part(gun, slab(0.12, 0.17, 0.006), i % 2 ? K.white : K.trim, 0, 0.04, -0.02 - i * 0.005); c.rotation.z = (i - 2) * 0.22; }
  return finish(P, team, gun, -0.15, (dt, s, t, k) => { tails.forEach(c => c.wave(t, k, 0.12, 7)); cape.rotation.x = 0.1 + k * 0.45 + Math.sin(t * 5) * 0.04; });
}

// ---------------- Avalanche: mountain rescue ----------------
function avalanche(p, team) {
  const K = kit(p);
  const P = body(K, { w: 1.35, torso: [0.29, 0.33, 0.38, 0.34, 0.56], flat: 0.92, top: K.main, pants: K.dark, boots: K.ink, gloves: K.trim, sleeves: K.main });
  face(P, K, { brow: -0.05, mouth: 'smile', cheeks: true });
  part(P.spine, tube(0.385, 0.375, 0.06), K.c(0xe8f2ff, { rough: 0.3, glow: 0.35 }), 0, 0.22, 0, 1, 1, 0.92);   // reflective stripe
  part(P.spine, slab(0.14, 0.04, 0.02), K.c(0xff3b3b), 0, 0.36, -0.36); part(P.spine, slab(0.04, 0.14, 0.02), K.c(0xff3b3b), 0, 0.36, -0.36);  // rescue cross
  for (const h of [P.handR, P.handL]) h.scale.set(1.4, 1.3, 1.4);                                    // mittens
  // fur-rimmed hood down at the back, beanie and snow goggles
  part(P.spine, ring(0.27, 0.09), K.c(0xf2e8d5, { rough: 0.95 }), 0, 0.6, 0.05).rotation.x = Math.PI / 2;
  part(P.head, dome(0.31), K.trim, 0, 0.09, 0.02, 1, 0.9, 1);
  part(P.head, ball(0.07), K.white, 0, 0.4, 0.02);
  part(P.head, ring(0.3, 0.025), K.ink, 0, 0.17, 0).rotation.x = Math.PI / 2 - 0.1;
  const gog = part(P.head, ball(0.12), K.c(0xffb347, { rough: 0.1, glow: 0.3 }), 0, 0.2, -0.24, 1.8, 0.55, 0.5); gog.userData.live = true;
  // thermos on the belt
  part(P.hips, tube(0.055, 0.055, 0.2), K.steel, -0.3, 0.0, 0.05);
  // Snowmaker: a wide nozzle fed from a snow hopper
  const gun = gunAt(P, 0.27, 1.24, -0.48);
  part(gun, slab(0.18, 0.18, 0.45), K.trim);
  part(gun, tube(0.15, 0.09, 0.26), K.steel, 0, 0.02, -0.33).rotation.x = -Math.PI / 2;
  const hop = part(gun, tube(0.12, 0.09, 0.22), K.c(0xdff6ff, { rough: 0.15 }), 0, 0.19, 0.05); hop.userData.live = true;
  return finish(P, team, gun, -0.48, (dt, s, t, k) => { gog.rotation.z = Math.sin(t * 0.8) * 0.02; hop.rotation.y += dt * (0.5 + k); }, { stride: 1.35 });
}

// ---------------- Tempo: pirate radio DJ ----------------
function tempo(p, team) {
  const K = kit(p);
  const P = body(K, { w: 0.95, shoes: 'sneaker', boots: K.white, soles: K.trim, top: K.main, pants: K.dark });
  face(P, K, { brow: 0.15, mouth: 'smile' });
  part(P.spine, ring(0.24, 0.06), K.trim, 0, 0.56, 0).rotation.x = Math.PI / 2;                       // bomber collar
  part(P.hips, tube(0.25, 0.24, 0.08), K.trim, 0, 0.1, 0);
  part(P.spine, slab(0.12, 0.4, 0.02), K.white, 0, 0.28, -0.215);                                     // tee
  // hair puff, headphones, shades
  part(P.head, ball(0.33), K.c(0x2b1d14, { rough: 0.95 }), 0, 0.16, 0.08, 1.08, 0.9, 1);
  part(P.head, ring(0.33, 0.035, Math.PI), K.dark, 0, 0.02, 0);
  for (const s of [-1, 1]) { const c = part(P.head, tube(0.12, 0.12, 0.1), K.dark, s * 0.32, 0.02, 0); c.rotation.z = Math.PI / 2; part(P.head, tube(0.085, 0.085, 0.02), K.c(p.trim, { glow: 0.7 }), s * 0.375, 0.02, 0).rotation.z = Math.PI / 2; }
  part(P.head, slab(0.38, 0.08, 0.04), K.ink, 0, 0.05, -0.29);
  for (const s of [-1, 1]) part(P.head, slab(0.14, 0.06, 0.01), K.c(p.main, { rough: 0.05, glow: 0.5 }), s * 0.1, 0.05, -0.312);
  // speaker backpack with pulsing woofers
  part(P.spine, slab(0.52, 0.6, 0.26), K.dark, 0, 0.28, 0.3);
  const woofers = [0.42, 0.14].map(y => { part(P.spine, ring(0.14, 0.03), K.trim, 0, y, 0.44); const wf = part(P.spine, ball(0.11), K.ink, 0, y, 0.43, 1, 1, 0.5); wf.userData.live = true; return wf; });
  const aerial = part(P.spine, ball(0.035), K.c(p.trim, { glow: 1 }), 0.2, 0.86, 0.3); aerial.userData.live = true;
  part(P.spine, pill(0.01, 0.28), K.ink, 0.2, 0.7, 0.3);
  // Bassline: a deck with a flared horn
  const gun = gunAt(P);
  part(gun, slab(0.17, 0.2, 0.42), K.dark); part(gun, slab(0.18, 0.05, 0.26), K.main, 0, 0.12, 0.02);
  part(gun, tube(0.17, 0.06, 0.24), K.trim, 0, 0, -0.32).rotation.x = -Math.PI / 2;
  part(gun, tube(0.12, 0.12, 0.02), K.ink, 0, 0, -0.44).rotation.x = Math.PI / 2;
  return finish(P, team, gun, -0.46, (dt, s, t, k) => {
    const beat = Math.pow(Math.max(0, Math.sin(t * Math.PI * 2.2)), 6);
    woofers.forEach(w => w.scale.set(1 + beat * 0.3, 1 + beat * 0.3, 0.5 + beat * 0.3));
    P.head.rotation.x -= beat * 0.08; aerial.visible = beat > 0.2 || Math.sin(t * 3) > 0;
  });
}

// ---------------- Kestrel: barnstorming stunt pilot ----------------
function kestrel(p, team) {
  const K = kit(p);
  const P = body(K, { w: 0.95, top: K.main, pants: K.dark, boots: K.leather, gloves: K.leather });
  face(P, K, { brow: 0.18, mouth: 'smirk', cheeks: true });
  part(P.spine, ring(0.24, 0.09), K.c(0xf2e8d5, { rough: 0.95 }), 0, 0.55, 0).rotation.x = Math.PI / 2;   // sheepskin collar
  part(P.hips, tube(0.25, 0.24, 0.07), K.ink, 0, 0.1, 0); part(P.hips, slab(0.08, 0.06, 0.02), K.trim, 0, 0.1, -0.25);
  for (const s of [-1, 1]) part(P.spine, slab(0.12, 0.1, 0.02), K.dark, s * 0.13, 0.36, -0.215);       // chest pockets
  // flight cap with ear flaps, goggles up on the brow, red braid
  part(P.head, dome(0.315, Math.PI * 0.6), K.dark, 0, 0.05, 0.02, 1, 1, 1.04);
  for (const s of [-1, 1]) part(P.head, ball(0.09), K.dark, s * 0.27, -0.06, 0.03, 0.5, 1.2, 1);
  part(P.head, ring(0.3, 0.022), K.leather, 0, 0.15, 0).rotation.x = Math.PI / 2 - 0.2;
  for (const s of [-1, 1]) { part(P.head, tube(0.075, 0.075, 0.06), K.trim, s * 0.1, 0.18, -0.25).rotation.x = Math.PI / 2 - 0.2; part(P.head, ball(0.055), K.glass, s * 0.1, 0.18, -0.29, 1, 1, 0.4); }
  const braid = chain(P.head, 4, 0.1, K.c(0xb5562e, { rough: 0.9 }), -0.12, -0.08, 0.24, 0.05, 0.035, [0, -0.8, 0.4]);
  const scarf = chain(P.spine, 7, 0.13, K.white, -0.08, 0.56, 0.2, 0.05, 0.035);
  // folded glider wings on the back
  const wings = [-1, 1].map(s => { const w = joint(P.spine, s * 0.1, 0.42, 0.24); part(w, slab(0.85, 0.04, 0.3), K.c(0xf6ecd9, { rough: 0.7 }), s * 0.42, 0, 0); part(w, slab(0.85, 0.05, 0.05), K.trim, s * 0.42, 0.01, -0.14); w.rotation.z = s * 0.95; return w; });
  // Talon Crossbow
  const gun = gunAt(P);
  part(gun, slab(0.09, 0.11, 0.56), K.leather);
  for (const s of [-1, 1]) { const l = part(gun, pill(0.022, 0.3), K.trim, s * 0.16, 0.02, -0.24); l.rotation.z = Math.PI / 2; l.rotation.y = s * 0.35; }
  part(gun, slab(0.56, 0.008, 0.008), K.white, 0, 0.02, -0.15);
  part(gun, pill(0.015, 0.36), K.steel, 0, 0.07, -0.2).rotation.x = Math.PI / 2;
  return finish(P, team, gun, -0.42, (dt, s, t, k) => { scarf.wave(t, k, 0.2, 8); braid.wave(t, k, 0.1, 5); wings.forEach((w, i) => { w.rotation.z = (i ? 1 : -1) * (0.95 + Math.sin(t * 2.4) * 0.05 + k * 0.08); }); });
}

// ---------------- Snapjaw: crocodile ferryman ----------------
function croc(p, team) {
  const K = kit(p);
  const scales = K.main, belly = K.skin;
  const P = body(K, { w: 1.25, headR: 0, torso: [0.3, 0.32, 0.36, 0.32, 0.54], flat: 0.95, top: scales, pants: scales, boots: scales, gloves: scales, sleeves: scales });
  part(P.spine, ball(0.3), belly, 0, 0.22, -0.13, 0.85, 1.1, 0.5);                                   // pale belly
  for (let i = 0; i < 4; i++) part(P.spine, slab(0.34 - i * 0.03, 0.02, 0.03), K.dark, 0, 0.04 + i * 0.12, -0.27);
  for (const s of [-1, 1]) part(P.spine, slab(0.18, 0.5, 0.03), K.dark, s * 0.22, 0.25, -0.29);          // waistcoat
  part(P.hips, ring(0.36, 0.035), K.trim, 0, 0.12, 0).rotation.x = Math.PI / 2;                       // rope belt
  for (let i = 0; i < 5; i++) part(P.spine, cone(0.06, 0.14, 8), K.dark, 0, 0.55 - i * 0.12, 0.35).rotation.x = 0.6;   // back ridges
  for (const f of [P.footL, P.footR]) for (const s of [-1, 0, 1]) part(f, cone(0.03, 0.09, 8), K.white, s * 0.07, -0.06, -0.24).rotation.x = -Math.PI / 2;  // claws
  // the head: rounded skull, long snout, opening jaw, raised eyes and a ferryman's cap
  const H = P.head;
  part(H, ball(0.25), scales, 0, 0.02, 0.02, 1.1, 0.88, 1.1);
  part(H, pill(0.12, 0.36), scales, 0, 0.0, -0.38, 1.25, 0.6, 1).rotation.x = Math.PI / 2;
  for (const s of [-1, 1]) part(H, ball(0.025), K.ink, s * 0.07, 0.075, -0.64);
  const jaw = joint(H, 0, -0.06, -0.12);
  part(jaw, pill(0.1, 0.32), belly, 0, -0.03, -0.24, 1.25, 0.5, 1).rotation.x = Math.PI / 2;
  for (const s of [-1, 1]) for (let i = 0; i < 5; i++) {
    part(H, cone(0.022, 0.07, 8), K.white, s * 0.13, -0.06, -0.22 - i * 0.09).rotation.x = Math.PI;
    part(jaw, cone(0.02, 0.06, 8), K.white, s * 0.11, 0.02, -0.12 - i * 0.09);
  }
  P.eyes = [];
  for (const s of [-1, 1]) {
    part(H, ball(0.085), scales, s * 0.13, 0.15, -0.08);
    const e = joint(H, s * 0.14, 0.17, -0.13);
    part(e, ball(0.06), K.c(0xffe14a, { rough: 0.15, glow: 0.25 }), 0, 0, 0, 1, 1, 0.7);
    part(e, slab(0.014, 0.07, 0.02), K.ink, 0, 0, -0.04);
    P.eyes.push(e);
  }
  part(H, tube(0.23, 0.25, 0.12), K.dark, 0, 0.24, 0.05); part(H, slab(0.3, 0.025, 0.16), K.ink, 0, 0.19, -0.16);
  part(H, slab(0.12, 0.05, 0.02), K.trim, 0, 0.25, -0.19);
  const tail = chain(P.hips, 6, 0.24, scales, 0, -0.05, 0.25, 0.15, 0.05, [0, -0.12, 1]);
  // Bog Mortar: a stubby barrel with a hopper of mud
  const gun = gunAt(P, 0.3, 1.25, -0.45);
  part(gun, tube(0.12, 0.14, 0.5), K.leather, 0, 0, -0.06).rotation.x = Math.PI / 2;
  part(gun, ring(0.12, 0.03), K.trim, 0, 0, -0.32);
  const mud = part(gun, ball(0.12), K.c(0x7a5a2a, { rough: 0.95 }), 0, 0.16, 0.08); mud.userData.live = true;
  return finish(P, team, gun, -0.38, (dt, s, t, k) => {
    tail.forEach((g, i) => { g.rotation.y = Math.sin(t * 3 + i * 0.7) * (0.12 + k * 0.12); g.rotation.x = 0.05; });
    jaw.rotation.x = 0.06 + Math.max(0, Math.sin(t * 1.3)) * 0.2;
    mud.scale.y = 0.85 + Math.sin(t * 2) * 0.1;
  }, { stride: 1.4 });
}

// ---------------- Cavalier: knight on a pony called Pudding ----------------
function cavalier(p, team) {
  const K = kit(p);
  const coat = K.c(0x9a9aa2, { rough: 0.8 }), mane = K.c(0x4a4a52, { rough: 0.9 });
  const P = body(K, { w: 1, legs: false, hipY: 1.0, torso: [0.22, 0.23, 0.28, 0.27, 0.5], top: K.c(p.main, { rough: 0.3, metal: 0.3 }), sleeves: K.main, pants: K.dark, gloves: K.dark });
  P.spine.position.y = 0.02; P.head.position.y = 0.64;
  face(P, K, { brow: 0.05, mouth: 'smile', lashes: true });
  part(P.spine, slab(0.08, 0.3, 0.02), K.trim, 0, 0.28, -0.22); part(P.spine, slab(0.24, 0.07, 0.02), K.trim, 0, 0.32, -0.22);   // red cross
  for (const a of [P.armR, P.armL]) part(a, ball(0.15), K.c(p.main, { rough: 0.3, metal: 0.3 }), 0, 0.03, 0, 1, 0.7, 1);
  // seated legs in greaves
  for (const s of [-1, 1]) {
    const th = joint(P.hips, s * 0.15, -0.02, 0); th.rotation.set(1.35, 0, s * 0.35);
    part(th, pill(0.1, 0.26), K.dark, 0, -0.18, 0);
    const kn = joint(th, 0, -0.36, 0); kn.rotation.x = -1.4;
    part(kn, pill(0.085, 0.26), K.c(p.main, { rough: 0.3, metal: 0.3 }), 0, -0.16, 0);
    part(kn, ball(0.1), K.ink, 0, -0.36, -0.06, 1, 0.75, 1.5);
  }
  // helmet with a visor and a plume, auburn braid, cape
  part(P.head, dome(0.31, Math.PI * 0.6), K.c(p.main, { rough: 0.25, metal: 0.35 }), 0, 0.04, 0, 1, 1, 1.03);
  part(P.head, slab(0.38, 0.05, 0.05), K.dark, 0, 0.12, -0.27);
  const plume = chain(P.head, 4, 0.1, K.trim, 0, 0.3, 0.02, 0.08, 0.05, [0, 0.2, 0.95]);
  const braid = chain(P.head, 3, 0.1, K.c(0x8a4a2a, { rough: 0.9 }), 0.1, -0.06, 0.22, 0.05, 0.035, [0, -0.8, 0.35]);
  const cape = joint(P.spine, 0, 0.5, 0.16); part(cape, slab(0.55, 0.8, 0.025), K.trim, 0, -0.4, 0);
  // Pudding the pony
  const pony = joint(P.root, 0, 0, 0);
  part(pony, pill(0.32, 0.65), coat, 0, 0.78, 0.08).rotation.x = Math.PI / 2;
  part(pony, slab(0.72, 0.3, 1.0), K.trim, 0, 0.72, 0.08).scale.set(1, 1, 1);
  part(pony, slab(0.74, 0.05, 1.02), K.gold, 0, 0.56, 0.08);
  part(pony, slab(0.36, 0.06, 0.26), K.leather, 0, 1.01, 0.05);
  const neck = joint(pony, 0, 0.95, -0.5); neck.rotation.x = -0.55; part(neck, pill(0.16, 0.3), coat, 0, 0.12, 0);
  const ph = joint(pony, 0, 1.2, -0.78);
  part(ph, ball(0.17), coat, 0, 0, 0, 0.85, 0.9, 1.3).rotation.x = 0.4;
  part(ph, ball(0.11), K.c(0xd8c4c0, { rough: 0.8 }), 0, -0.1, -0.22, 1, 0.8, 1);
  for (const s of [-1, 1]) { part(ph, cone(0.05, 0.14, 10), coat, s * 0.08, 0.17, 0.08); part(ph, ball(0.035), K.eye, s * 0.11, 0.05, -0.08); part(ph, ball(0.01), K.shine, s * 0.115, 0.065, -0.11); }
  for (let i = 0; i < 6; i++) part(pony, ball(0.065), mane, 0, 1.18 - i * 0.05, -0.68 + i * 0.1, 0.8, 1.2, 1);
  const ptail = chain(pony, 4, 0.12, mane, 0, 0.82, 0.62, 0.07, 0.05, [0, -0.6, 0.6]);
  const legs = [[-0.16, -0.32], [0.16, -0.32], [-0.16, 0.45], [0.16, 0.45]].map(([x, z]) => {
    const L = joint(pony, x, 0.7, z); part(L, pill(0.075, 0.44), coat, 0, -0.3, 0); part(L, tube(0.085, 0.09, 0.08), K.ink, 0, -0.66, 0); return L;
  });
  // lance on the back, Saddle Carbine in hand
  const lance = part(P.spine, tube(0.025, 0.05, 2.2, 12), K.c(0xd9d0c0, { rough: 0.6 }), 0.22, 0.4, 0.3); lance.rotation.set(-0.35, 0, -0.3);
  const gun = gunAt(P, 0.26, 1.36, -0.46);
  part(gun, slab(0.08, 0.1, 0.34), K.leather, 0, -0.02, 0.1);
  part(gun, tube(0.03, 0.03, 0.54), K.dark, 0, 0.03, -0.24).rotation.x = Math.PI / 2;
  part(gun, ring(0.055, 0.014), K.gold, 0, -0.08, 0.02);
  return finish(P, team, gun, -0.52, (dt, s, t, k, w) => {
    const g = Math.sin(w) * 0.7 * k;
    legs[0].rotation.x = g; legs[3].rotation.x = g; legs[1].rotation.x = -g; legs[2].rotation.x = -g;   // trot: diagonal pairs
    pony.position.y = Math.abs(Math.sin(w)) * 0.06 * k;
    P.hips.position.y = P.hipY + pony.position.y * 1.2;
    ph.rotation.x = Math.sin(t * 1.5) * 0.06 - k * 0.1;
    ptail.wave(t, k, 0.15, 4); plume.wave(t, k, 0.1, 6); braid.wave(t, k, 0.08, 5);
    cape.rotation.x = 0.2 + k * 0.5 + Math.sin(t * 6) * 0.04 * k;
  }, { legs: [legs[0], legs[1]], stride: 1.3 });
}

export const ROSTER_B = { mirage, avalanche, tempo, kestrel, croc, cavalier };
