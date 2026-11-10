import { THREE, toon, basic, addOutline, mk, ink, V3, label, canvasTex } from './core.js?v=20261111q';

// Materials from Otis in Orbit (josh.js)
export const LOOK = { hoodie: '#ff7a3d', pants: '#3a4a7a', hair: '#3b2a20', skin: '#f1c49b', shoes: '#f4f1ea', drone: '#14b8a6' };
export const M = {
  hoodie: toon(LOOK.hoodie), pants: toon(LOOK.pants), hair: toon(LOOK.hair),
  skin: toon(LOOK.skin), shoes: toon(LOOK.shoes), drone: toon(LOOK.drone),
  dark: toon(0x2b2440), white: toon(0xfbf7ef), cheek: toon(0xff9a8a),
};
const eyes = (parent, y, z, gap, r = 0.05, mat = ink) => [-1, 1].map((s) => { const e = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), mat); e.position.set(gap * s, y, z); parent.add(e); return e; });


// ---------- Rênas: the OiO look (blue suit a bit too big, bubble helmet, Josh's hair, backpack antenna) ----------
// Rebuilt with real jointed limbs: shoulder > elbow > glove, hip > knee > boot, so arms and legs read clearly while he runs.
export function buildRenas() {
  const g = new THREE.Group();
  const inner = new THREE.Group(); inner.scale.setScalar(0.9); g.add(inner);
  const suit = toon(0x7ac8ff), suitDark = toon(0x4a90d8), white = toon(0xffffff), boot = toon(0x3a4468), orange = toon(0xff7a3d);
  // legs: hip pivot at 0.72, knee at 0.38, boot sole on the ground
  const knees = [], legs = [-1, 1].map((s) => {
    const hip = new THREE.Group(); hip.position.set(0.15 * s, 0.72, 0); inner.add(hip);
    mk(new THREE.CapsuleGeometry(0.155, 0.2, 4, 10), suit, 0, -0.17, 0, hip, 1.12);          // thigh
    const knee = new THREE.Group(); knee.position.y = -0.34; hip.add(knee);
    mk(new THREE.TorusGeometry(0.15, 0.05, 6, 14), orange, 0, 0, 0, knee, 0).rotation.x = Math.PI / 2;   // knee band
    mk(new THREE.CapsuleGeometry(0.145, 0.14, 4, 10), suit, 0, -0.14, 0, knee, 1.12);        // shin
    mk(new THREE.BoxGeometry(0.32, 0.2, 0.44), boot, 0, -0.3, 0.06, knee, 1.12);              // boot
    mk(new THREE.BoxGeometry(0.33, 0.06, 0.45), white, 0, -0.39, 0.06, knee, 0);             // sole
    knees.push(knee);
    return hip;
  });
  // torso + belt
  const torso = mk(new THREE.CapsuleGeometry(0.3, 0.26, 6, 14), suit, 0, 1.0, 0, inner); torso.scale.set(1.05, 1, 0.9);
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.045, 6, 24), suitDark); belt.rotation.x = Math.PI / 2; belt.position.y = 0.8; belt.scale.set(1.05, 0.9, 1); inner.add(belt);
  mk(new THREE.BoxGeometry(0.3, 0.2, 0.05), white, 0, 1.04, 0.27, inner, 0);
  mk(new THREE.OctahedronGeometry(0.06), basic(0xffd04a), -0.08, 1.06, 0.3, inner, 0);
  // arms: shoulder pivot, elbow, big white glove
  const elbows = [], arms = [-1, 1].map((s) => {
    const sh = new THREE.Group(); sh.position.set(0.42 * s, 1.24, 0); inner.add(sh);
    mk(new THREE.SphereGeometry(0.15, 12, 10), suitDark, 0, 0, 0, sh, 1.12);                  // shoulder pad
    mk(new THREE.CapsuleGeometry(0.12, 0.14, 4, 10), suit, 0, -0.14, 0, sh, 1.12);           // upper arm
    const el = new THREE.Group(); el.position.y = -0.28; sh.add(el);
    mk(new THREE.TorusGeometry(0.125, 0.045, 6, 14), orange, 0, 0, 0, el, 0).rotation.x = Math.PI / 2;    // elbow band
    mk(new THREE.CapsuleGeometry(0.115, 0.12, 4, 10), suit, 0, -0.12, 0, el, 1.12);          // forearm
    mk(new THREE.SphereGeometry(0.16, 12, 10), white, 0, -0.3, 0.02, el, 1.12);               // glove
    elbows.push(el);
    return sh;
  });
  // head: same face and hair as before
  const head = new THREE.Group(); head.position.y = 1.62; inner.add(head);
  mk(new THREE.SphereGeometry(0.32, 22, 16), M.skin, 0, 0, 0, head, 1.06);
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.05, 4, 8), ink); eye.position.set(0.11 * s, 0.03, 0.29); head.add(eye);
    const ch = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), M.cheek); ch.position.set(0.18 * s, -0.08, 0.25); ch.scale.z = 0.4; head.add(ch);
  }
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.014, 6, 12, Math.PI), ink); mouth.position.set(0, -0.1, 0.3); mouth.rotation.z = Math.PI; head.add(mouth);
  mk(new THREE.SphereGeometry(0.335, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), M.hair, 0, 0.03, -0.02, head, 1.04).rotation.x = -0.25;
  for (let i = 0; i < 3; i++) mk(new THREE.ConeGeometry(0.06, 0.2, 5), M.hair, -0.08 + i * 0.08, 0.3, 0.18, head, 0).rotation.x = 0.6;
  // the bubble helmet: drawn last so it never hides him
  const glass = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 14), basic(0xc8f0ff, { transparent: true, opacity: 0.18, depthWrite: false }));
  glass.renderOrder = 10; head.add(glass);
  mk(new THREE.TorusGeometry(0.4, 0.05, 6, 20), white, 0, -0.32, 0, head, 0).rotation.x = Math.PI / 2;
  // backpack, antenna, thruster
  mk(new THREE.BoxGeometry(0.38, 0.42, 0.2), white, 0, 1.02, -0.32, inner);
  mk(new THREE.CylinderGeometry(0.015, 0.015, 0.5), toon(0x9aa0b8), 0.1, 1.47, -0.32, inner, 0);
  const tip = mk(new THREE.SphereGeometry(0.05, 8, 6), basic(0xff3a3a), 0.1, 1.74, -0.32, inner, 0);
  const nozzle = mk(new THREE.CylinderGeometry(0.07, 0.1, 0.12, 10), toon(0x9aa0b8), 0, 0.76, -0.32, inner, 1.1);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.4, 10), basic(0x5ef2e0, { transparent: true, opacity: 0.85 }));
  flame.rotation.x = Math.PI; flame.position.set(0, 0.52, -0.32); flame.visible = false; inner.add(flame);
  // things to wear from Knabbels Werkplaats: all built here, hidden until you put them on
  const acc = {};
  {
    const cape = new THREE.Group(); cape.position.set(0, 1.28, -0.36); inner.add(cape);
    const cl = mk(new THREE.BoxGeometry(0.66, 0.86, 0.04), toon(0xd83a3a), 0, -0.43, 0, cape, 1.06); cl.rotation.x = 0.12;
    mk(new THREE.BoxGeometry(0.7, 0.06, 0.06), toon(0xffd23a), 0, 0, 0.02, cape, 0);
    acc.cape = cape;
    const pir = new THREE.Group(); pir.position.y = 0.46; head.add(pir);
    const brim = mk(new THREE.CylinderGeometry(0.46, 0.46, 0.05, 20), toon(0x2b2440), 0, 0, 0, pir, 1.06); brim.scale.z = 0.62;
    mk(new THREE.CylinderGeometry(0.2, 0.27, 0.24, 16), toon(0x2b2440), 0, 0.13, 0, pir, 1.06);
    mk(new THREE.SphereGeometry(0.06, 8, 6), basic(0xffffff), 0, 0.14, 0.24, pir, 0);
    acc.pirate = pir;
    const cat = new THREE.Group(); cat.position.y = 0.36; head.add(cat);
    for (const s of [-1, 1]) {
      const ear = mk(new THREE.ConeGeometry(0.13, 0.28, 4), toon(0x3a3640), 0.24 * s, 0.1, 0, cat, 1.06); ear.rotation.z = -0.35 * s;
      const pink = mk(new THREE.ConeGeometry(0.07, 0.16, 4), toon(0xff9ac8), 0.25 * s, 0.08, 0.06, cat, 0); pink.rotation.z = -0.35 * s;
    }
    acc.cat = cat;
    const crown = new THREE.Group(); crown.position.y = 0.47; head.add(crown);
    mk(new THREE.CylinderGeometry(0.22, 0.24, 0.1, 16, 1, true), toon(0xffd23a), 0, 0, 0, crown, 1.06);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; mk(new THREE.ConeGeometry(0.05, 0.14, 5), toon(0xffd23a), Math.sin(a) * 0.21, 0.11, Math.cos(a) * 0.21, crown, 0); }
    mk(new THREE.OctahedronGeometry(0.05), basic(0xff3a5a), 0, 0.02, 0.24, crown, 0);
    acc.crown = crown;
    for (const k in acc) acc[k].visible = false;
  }
  const mats = { suit, suitDark, orange, boot, glass: glass.material };
  // he's always on screen: no frustum culling on any of his parts
  g.traverse((o) => { o.frustumCulled = false; });
  return { g, inner, head, arms, legs, elbows, knees, tip, torso, nozzle, flame, acc, mats };
}

// ---------- Josh: from josh.js (default look) ----------
export function buildJosh() {
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const legs = [-1, 1].map((s) => {
    const p = new THREE.Group(); p.position.set(0.13 * s, 0.68, 0); body.add(p);
    mk(new THREE.CapsuleGeometry(0.105, 0.36, 4, 10), M.pants, 0, -0.3, 0, p);
    mk(new THREE.BoxGeometry(0.22, 0.13, 0.32), M.shoes, 0, -0.62, 0.04, p, 1.12);
    return p;
  });
  const torso = mk(new THREE.CapsuleGeometry(0.27, 0.28, 6, 14), M.hoodie, 0, 0.98, 0, body); torso.scale.set(1.05, 1, 0.85);
  mk(new THREE.SphereGeometry(0.2, 14, 10), M.hoodie, 0, 1.3, -0.17, body);
  const logo = new THREE.Mesh(new THREE.CircleGeometry(0.065, 6), basic(0x5ef2e0)); logo.position.set(0, 1.0, 0.235); body.add(logo);
  const arms = [-1, 1].map((s) => {
    const p = new THREE.Group(); p.position.set(0.33 * s, 1.25, 0); body.add(p);
    mk(new THREE.CapsuleGeometry(0.085, 0.3, 4, 10), M.hoodie, 0, -0.22, 0, p);
    mk(new THREE.SphereGeometry(0.095, 12, 8), M.skin, 0, -0.46, 0, p);
    return p;
  });
  const head = new THREE.Group(); head.position.y = 1.58; body.add(head);
  mk(new THREE.SphereGeometry(0.3, 22, 16), M.skin, 0, 0, 0, head, 1.06);
  [-1, 1].forEach((s) => {
    const eye = new THREE.Mesh(new THREE.CapsuleGeometry(0.034, 0.05, 4, 8), ink); eye.position.set(0.1 * s, 0.02, 0.27); head.add(eye);
    const ch = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), M.cheek); ch.position.set(0.17 * s, -0.08, 0.24); ch.scale.z = 0.4; head.add(ch);
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.018, 8, 20), M.dark); r.position.set(0.1 * s, 0.02, 0.29); head.add(r);
    const cup = mk(new THREE.CylinderGeometry(0.11, 0.11, 0.09, 16), M.drone, 0.33 * s, 0, 0, head); cup.rotation.z = Math.PI / 2;
  });
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 6, 12, Math.PI), ink); mouth.position.set(0, -0.1, 0.285); mouth.rotation.z = Math.PI; head.add(mouth);
  const cap = mk(new THREE.SphereGeometry(0.318, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), M.hair, 0, 0.03, -0.02, head, 1.05); cap.rotation.x = -0.28;
  mk(new THREE.BoxGeometry(0.42, 0.08, 0.12), M.hair, 0.02, 0.2, 0.22, head, 0).rotation.z = 0.12;
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.03, 8, 24, Math.PI), M.dark); band.position.y = 0.02; head.add(band);
  mk(new THREE.BoxGeometry(0.38, 0.42, 0.18), M.dark, 0, 1.0, -0.3, body, 1.06);
  return { root, body, legs, arms, head };
}

// ---------- Otis: from otis.js ----------
export function buildOtis() {
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const fur = toon(0xc98a4b), dark = toon(0x6b4226), cream = toon(0xf5e1c8), suit = toon(0xf4f1ea), orange = toon(0xff7a3d);
  const torso = mk(new THREE.CapsuleGeometry(0.24, 0.4, 6, 12), suit, 0, 0.52, 0, body); torso.rotation.x = Math.PI / 2;
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.04, 6, 20), orange); belt.position.set(0, 0.52, 0.08); body.add(belt);
  mk(new THREE.BoxGeometry(0.28, 0.16, 0.3), orange, 0, 0.8, -0.06, body, 1.1);
  [[-0.14, 0.22], [0.14, 0.22], [-0.14, -0.2], [0.14, -0.2]].forEach(([x, z]) => {
    const p = new THREE.Group(); p.position.set(x, 0.4, z); body.add(p);
    mk(new THREE.CapsuleGeometry(0.07, 0.2, 4, 8), suit, 0, -0.17, 0, p);
    mk(new THREE.SphereGeometry(0.085, 10, 8), fur, 0, -0.34, 0.02, p);
  });
  const tail = new THREE.Group(); tail.position.set(0, 0.62, -0.4); body.add(tail);
  mk(new THREE.CapsuleGeometry(0.05, 0.22, 4, 8), fur, 0, 0.12, -0.05, tail).rotation.x = -0.6;
  const head = new THREE.Group(); head.position.set(0, 0.9, 0.34); body.add(head);
  mk(new THREE.SphereGeometry(0.23, 18, 14), fur, 0, 0, 0, head, 1.06);
  mk(new THREE.SphereGeometry(0.13, 14, 10), cream, 0, -0.07, 0.18, head).scale.set(1.15, 0.8, 1);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.048, 8, 6), ink); nose.position.set(0, -0.03, 0.31); head.add(nose);
  [-1, 1].forEach((s) => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 6), ink); e.position.set(0.09 * s, 0.05, 0.2); head.add(e);
    const p = new THREE.Group(); p.position.set(0.17 * s, 0.1, -0.02); head.add(p);
    mk(new THREE.SphereGeometry(0.11, 10, 8), dark, 0, -0.11, 0, p).scale.set(0.45, 1.25, 0.8);
    p.rotation.z = 0.3 * s;
  });
  const tongue = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), toon(0xff7a8a)); tongue.position.set(0, -0.17, 0.25); tongue.scale.set(1, 0.4, 1.3); head.add(tongue);
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.37, 24, 16), basic(0xbfe8ff, { transparent: true, opacity: 0.16, depthWrite: false })));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.045, 8, 24), toon(0xd0d4dc)); rim.rotation.x = Math.PI / 2; rim.position.y = -0.25; head.add(rim);
  return { root, body, head, tail };
}

// ---------- Milo: the OiO Milo (quiff + tough-guy shades), out of his barrel now, with drip ----------
export function buildMilo() {
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const jacket = toon(0xff3d7f), stripe = toon(0xffffff), skin = toon(0xe8b58e), hair = toon(0x1e1a1a), pants = toon(0x2c2c36), gold = toon(0xffc23d), kicks = toon(0xfff8ec);
  const legs = [-1, 1].map((s) => {
    const p = new THREE.Group(); p.position.set(0.14 * s, 0.66, 0); body.add(p);
    mk(new THREE.CapsuleGeometry(0.12, 0.36, 4, 10), pants, 0, -0.3, 0, p);
    mk(new THREE.BoxGeometry(0.24, 0.15, 0.36), kicks, 0, -0.6, 0.05, p, 1.12);
    mk(new THREE.BoxGeometry(0.25, 0.04, 0.37), toon(0xff3d7f), 0, -0.55, 0.05, p, 0);
    return p;
  });
  // the puffer jacket (a bit too big, on purpose)
  const t = mk(new THREE.CapsuleGeometry(0.31, 0.3, 6, 14), jacket, 0, 0.98, 0, body); t.scale.set(1.08, 1, 0.92);
  for (const y of [0.86, 1.04]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.02, 6, 24), stripe); r.rotation.x = Math.PI / 2; r.position.y = y; r.scale.set(1.08, 0.92, 1); body.add(r); }
  // gold chain with an M
  const chain = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 6, 20, Math.PI), gold); chain.position.set(0, 1.2, 0.2); chain.rotation.set(0.4, 0, Math.PI); body.add(chain);
  mk(new THREE.BoxGeometry(0.1, 0.1, 0.03), gold, 0, 1.0, 0.31, body, 1.15);
  const arms = [-1, 1].map((s) => {
    const p = new THREE.Group(); p.position.set(0.36 * s, 1.18, 0); body.add(p);
    mk(new THREE.CapsuleGeometry(0.1, 0.28, 4, 8), jacket, 0, -0.2, 0, p);
    mk(new THREE.SphereGeometry(0.09, 10, 8), skin, 0, -0.44, 0, p);
    return p;
  });
  const head = new THREE.Group(); head.position.y = 1.58; body.add(head);
  mk(new THREE.SphereGeometry(0.29, 20, 14), skin, 0, 0, 0, head, 1.06);
  const quiff = mk(new THREE.SphereGeometry(0.3, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), hair, 0, 0.05, -0.03, head, 1.05); quiff.rotation.x = -0.3;
  mk(new THREE.ConeGeometry(0.12, 0.3, 8), hair, 0, 0.37, 0.12, head).rotation.x = 0.9;
  const shades = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.09, 0.05), ink); shades.position.set(0, 0.05, 0.27); head.add(shades);
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.014, 6, 12, Math.PI), ink); smile.position.set(0.03, -0.11, 0.27); smile.rotation.z = Math.PI + 0.2; head.add(smile);
  // headphones around his neck
  const ph = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 6, 20, Math.PI), M.dark); ph.position.set(0, 1.32, 0.02); ph.rotation.x = Math.PI / 2 + 0.3; body.add(ph);
  for (const s of [-1, 1]) mk(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 12), toon(0x5ef2e0), 0.22 * s, 1.32, 0.06, body, 1.1).rotation.z = Math.PI / 2;
  return { root, body, head, arms, legs };
}
// his old barrel from the Mistmaan, now a DJ booth
export function buildBarrelBooth() {
  const g = new THREE.Group();
  const wood = toon(0x7a5434), band = toon(0x3a3e4e);
  mk(new THREE.CylinderGeometry(0.62, 0.55, 1.1, 18), wood, 0, 0.55, 0, g, 1.04);
  for (const y of [0.2, 0.9]) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.04, 6, 24), band); t.rotation.x = Math.PI / 2; t.position.y = y; g.add(t); }
  mk(new THREE.BoxGeometry(1.5, 0.08, 0.8), toon(0x2b2440), 0, 1.14, 0, g);
  const decks = [-0.4, 0.4].map((x) => {
    const d = mk(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 20), toon(0x1a1a1a), x, 1.2, 0, g, 0);
    mk(new THREE.CylinderGeometry(0.09, 0.09, 0.05, 12), toon(0xff3d7f), 0, 0.01, 0, d, 0);
    return d;
  });
  const sign = label('MILO EDITS', 1.6, g); sign.position.set(0, 1.75, 0);
  return { g, decks };
}

// ---------- Lars: the OiO Lars (blue hoodie, blond tufts, THE hat), with a pickaxe and a little beard ----------
export function buildLars() {
  const root = new THREE.Group();
  const r = new THREE.Group(); r.scale.setScalar(0.62); root.add(r);
  const skin = toon(0xf0c8a0), hoodie = toon(0x6fa8ff), pants = toon(0x3a3e4e), hair = toon(0xd9a35a);
  const legs = [-1, 1].map((s) => mk(new THREE.CapsuleGeometry(0.12, 0.42, 4, 8), pants, 0.14 * s, 0.4, 0, r));
  mk(new THREE.CapsuleGeometry(0.3, 0.45, 6, 12), hoodie, 0, 1.08, 0, r);
  const arms = [-1, 1].map((s) => {
    const p = new THREE.Group(); p.position.set(0.4 * s, 1.36, 0.02); r.add(p);
    const a = mk(new THREE.CapsuleGeometry(0.09, 0.42, 4, 8), hoodie, 0, -0.28, 0, p); a.rotation.z = 0.15 * s;
    return p;
  });
  const head = new THREE.Group(); head.position.set(0, 1.78, 0); r.add(head);
  mk(new THREE.SphereGeometry(0.3, 14, 12), skin, 0, 0, 0, head);
  mk(new THREE.SphereGeometry(0.32, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2.2), hair, 0, 0.04, -0.02, head, 1.04);
  for (let i = 0; i < 5; i++) { const t = mk(new THREE.ConeGeometry(0.07, 0.18, 5), hair, -0.16 + i * 0.08, 0.3, 0.05, head, 0); t.rotation.z = (i - 2) * 0.3; }
  eyes(head, 0.02, 0.28, 0.1, 0.045);
  const ch = [-1, 1].map((s) => { const c = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), M.cheek); c.position.set(0.17 * s, -0.06, 0.24); c.scale.z = 0.4; head.add(c); return c; });
  void ch;
  // a small fluffy beard
  const beard = mk(new THREE.SphereGeometry(0.2, 12, 10), hair, 0, -0.2, 0.17, head, 1.06); beard.scale.set(1.15, 0.9, 0.7);
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.025, 0.02), ink); mouth.position.set(0, -0.08, 0.3); head.add(mouth);
  // the hat (from makeHat), with a miner's lamp on the band
  const hat = new THREE.Group(); hat.position.y = 0.3; head.add(hat);
  const hatMat = toon(0x3a2e46), bandMat = toon(0xff7ab6);
  mk(new THREE.CylinderGeometry(0.34, 0.34, 0.04, 16), hatMat, 0, 0, 0, hat, 1.06);
  mk(new THREE.CylinderGeometry(0.2, 0.22, 0.55, 16), hatMat, 0, 0.29, 0, hat, 1.06);
  mk(new THREE.CylinderGeometry(0.225, 0.225, 0.08, 16), bandMat, 0, 0.06, 0, hat, 0);
  const lamp = mk(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 12), basic(0xfff2a8), 0, 0.08, 0.24, hat, 1.2); lamp.rotation.x = Math.PI / 2;
  // pickaxe in his right hand
  const pick = new THREE.Group(); pick.position.set(0, -0.55, 0.1); arms[1].add(pick);
  mk(new THREE.CylinderGeometry(0.035, 0.035, 0.9, 6), toon(0x8a5a34), 0, 0.3, 0, pick);
  const headP = mk(new THREE.TorusGeometry(0.28, 0.05, 6, 14, Math.PI * 0.8), toon(0xa8b0c0), 0, 0.72, 0, pick); headP.rotation.z = Math.PI * 0.1;
  return { root, r, head, arms, legs, hat, pick };
}

// ---------- Nathan: from feest-npc.js (white shirt with a 1, blue cap, red allergy nose, bat) ----------
export function buildNathan() {
  const root = new THREE.Group();
  const skin = toon(0xf0c8a0), shirt = toon(0xffffff), pants = toon(0x3a4a8a), capC = toon(0x2a4ae0);
  const legs = [-1, 1].map((s) => mk(new THREE.CapsuleGeometry(0.12, 0.5, 4, 8), pants, 0.15 * s, 0.35, 0, root));
  mk(new THREE.CapsuleGeometry(0.28, 0.5, 4, 10), shirt, 0, 1.05, 0, root);
  mk(new THREE.BoxGeometry(0.08, 0.26, 0.02), capC, 0, 1.12, 0.29, root, 0);
  const head = new THREE.Group(); head.position.set(0, 1.65, 0); root.add(head);
  mk(new THREE.SphereGeometry(0.26, 16, 12), skin, 0, 0, 0, head);
  eyes(head, 0.03, 0.23, 0.09, 0.035);
  const nose = mk(new THREE.SphereGeometry(0.07, 8, 6), toon(0xff6a6a), 0, -0.04, 0.26, head, 0);
  const grin = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.013, 6, 12, Math.PI), ink); grin.position.set(0, -0.13, 0.23); grin.rotation.z = Math.PI; head.add(grin);
  mk(new THREE.SphereGeometry(0.27, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), capC, 0, 0.05, 0, head, 0);
  mk(new THREE.BoxGeometry(0.34, 0.03, 0.3), capC, 0, 0.07, 0.3, head, 0);
  const arm = new THREE.Group(); arm.position.set(0.3, 1.3, 0); root.add(arm);
  mk(new THREE.CapsuleGeometry(0.08, 0.4, 4, 8), skin, 0.05, -0.2, 0.1, arm);
  const bat = mk(new THREE.CylinderGeometry(0.08, 0.04, 1.1, 10), toon(0xc8985a), 0.05, 0.25, -0.25, arm); bat.rotation.x = -0.6;
  const arm2 = new THREE.Group(); arm2.position.set(-0.3, 1.3, 0); root.add(arm2);
  mk(new THREE.CapsuleGeometry(0.08, 0.4, 4, 8), skin, -0.05, -0.2, 0.05, arm2);
  mk(new THREE.SphereGeometry(0.14, 10, 8), toon(0x8a5a34), -0.06, -0.48, 0.08, arm2);   // glove
  return { root, head, arm, arm2, bat, nose, legs };
}

// ---------- Kayo & Yara on their saucer: from donker.js ----------
export function buildSaucer() {
  const saucer = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.1, 0.4, 24), toon(0xc8ccd4)); addOutline(disc, 1.04); saucer.add(disc);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.08, 6, 30), basic(0x9b3bff)); rim.rotation.x = Math.PI / 2; saucer.add(rim);
  const cats = {};
  const cat = (name, x, furCol, eyeCol, patch) => {
    const g = new THREE.Group(); g.position.set(x, 0.2, 0); saucer.add(g);
    const f = toon(furCol);
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 12), f); body.scale.set(0.9, 1, 1.1); body.position.y = 0.42; addOutline(body, 1.06); g.add(body);
    const head = new THREE.Group(); head.position.set(0, 0.98, 0.1); g.add(head);
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 12), f); addOutline(h, 1.06); head.add(h);
    if (patch) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), toon(patch)); p.position.set(0.13, 0.1, 0.15); p.scale.set(1, 1, 0.6); head.add(p); }
    for (const s of [-1, 1]) {
      const e = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.26, 4), f); e.position.set(0.18 * s, 0.3, 0); e.rotation.z = -0.3 * s; addOutline(e, 1.08); head.add(e);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), basic(eyeCol)); eye.position.set(0.12 * s, 0.04, 0.27); eye.scale.y = 0.6; head.add(eye);
      const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.07, 0.02), ink); pupil.position.set(0.12 * s, 0.04, 0.33); head.add(pupil);
    }
    const tail = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.06, 6, 14, Math.PI * 1.3), f); tail.position.set(0, 0.5, -0.45); tail.rotation.y = Math.PI / 2; g.add(tail);
    cats[name] = { g, head, tail };
  };
  cat('kayo', -0.55, 0x3a3640, 0x7dff9a, null);
  cat('yara', 0.55, 0xf4ece0, 0xffd040, 0xe08a3a);
  // tractor beam
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 1.4, 4, 18, 1, true), basic(0xb07aff, { transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false }));
  beam.position.y = -2.2; beam.visible = false; saucer.add(beam);
  return { saucer, cats, beam };
}

// ---------- Knabbel: the Knabbelrots, Rênas' pet asteroid with teeth ----------
export function buildKnabbel() {
  const g = new THREE.Group();
  const rock = mk(new THREE.DodecahedronGeometry(0.8, 1), toon(0x8a8698), 0, 0.8, 0, g, 1.05);
  const jaw = new THREE.Group(); jaw.position.set(0, 0.6, 0.55); g.add(jaw);
  for (let i = 0; i < 5; i++) { const t = mk(new THREE.ConeGeometry(0.08, 0.2, 4), toon(0xfff8ec), -0.32 + i * 0.16, 0.1, 0.1, jaw, 0); t.rotation.x = Math.PI; }
  for (let i = 0; i < 4; i++) mk(new THREE.ConeGeometry(0.07, 0.16, 4), toon(0xfff8ec), -0.24 + i * 0.16, -0.12, 0.12, jaw, 0);
  eyes(rock, 0.3, 0.66, 0.24, 0.1);
  return { g, rock, jaw };
}

// ---------- collectibles ----------
// Bouten: the small change of the galaxy, a chunky hex nut. Rênas uses them to patch up the station.
export function buildBout(color = 0xc9d3e0, s = 1) {
  const g = new THREE.Group();
  const m = toon(color);
  const nut = mk(new THREE.CylinderGeometry(0.34, 0.34, 0.16, 6), m, 0, 0, 0, g, 1.12); nut.rotation.x = Math.PI / 2;
  const hole = mk(new THREE.CylinderGeometry(0.13, 0.13, 0.18, 14), toon(0x4a4660), 0, 0, 0, g, 0); hole.rotation.x = Math.PI / 2;
  const shine = mk(new THREE.BoxGeometry(0.2, 0.05, 0.02), basic(0xffffff), -0.1, 0.17, 0.09, g, 0); shine.rotation.z = 0.5;
  g.scale.setScalar(s);
  return g;
}
// Gouden Tandwielen: the rare ones, hidden at the end of every parkour
export function buildTandwiel(s = 1) {
  const g = new THREE.Group();
  const m = toon(0xffc23d);
  const disc = mk(new THREE.CylinderGeometry(0.36, 0.36, 0.14, 24), m, 0, 0, 0, g, 1.1); disc.rotation.x = Math.PI / 2;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const t = mk(new THREE.BoxGeometry(0.16, 0.16, 0.14), m, Math.cos(a) * 0.42, Math.sin(a) * 0.42, 0, g, 1.1); t.rotation.z = a;
  }
  const hub = mk(new THREE.CylinderGeometry(0.12, 0.12, 0.17, 14), toon(0x8a5a1a), 0, 0, 0, g, 0); hub.rotation.x = Math.PI / 2;
  const star = mk(new THREE.OctahedronGeometry(0.08), basic(0xfff3b0), 0, 0, 0.11, g, 0); star.scale.set(1, 1, 0.4);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.66, 16, 12), basic(0xffe27a, { transparent: true, opacity: 0.16, depthWrite: false }));
  g.add(halo);
  g.scale.setScalar(s);
  return g;
}
// Energiekernen: the station fuel. A glowing ball of energy in a little metal cage.
export function buildKern(s = 1, color = 0x5ef2e0) {
  const g = new THREE.Group();
  mk(new THREE.SphereGeometry(0.3, 18, 14), basic(color), 0, 0, 0, g, 0);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 14), basic(color, { transparent: true, opacity: 0.3, depthWrite: false }));
  g.add(glow);
  const metal = toon(0x8a8fa8);
  for (let i = 0; i < 3; i++) {
    const ring = mk(new THREE.TorusGeometry(0.4, 0.035, 6, 28), metal, 0, 0, 0, g, 0);
    ring.rotation.set(i === 1 ? Math.PI / 2 : 0, i * Math.PI / 3, 0);
  }
  for (const y of [-0.42, 0.42]) mk(new THREE.CylinderGeometry(0.14, 0.18, 0.1, 12), metal, 0, y, 0, g, 1.1);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 12), basic(color, { transparent: true, opacity: 0.12, depthWrite: false }));
  g.add(halo);
  g.scale.setScalar(s);
  return g;
}
export function buildGroteKern() {
  const g = new THREE.Group();
  const k = buildKern(3); g.add(k);
  const rays = new THREE.Group(); g.add(rays);
  for (let i = 0; i < 10; i++) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 5), basic(0x9ffff0, { transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
    r.rotation.z = (i / 10) * Math.PI * 2; r.position.z = -0.3; rays.add(r);
  }
  return { g, rays };
}
export function buildVinyl() {
  const g = new THREE.Group();
  const d = mk(new THREE.CylinderGeometry(0.5, 0.5, 0.05, 28), toon(0x1a1a22), 0, 0, 0, g, 1.1); d.rotation.x = Math.PI / 2;
  const l = mk(new THREE.CylinderGeometry(0.18, 0.18, 0.06, 18), toon(0xff3d7f), 0, 0, 0, g, 0); l.rotation.x = Math.PI / 2;
  for (const r of [0.28, 0.38]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.008, 4, 30), basic(0x55556a)); ring.position.z = 0.03; g.add(ring); }
  return g;
}
export function buildLantern() {
  const g = new THREE.Group();
  const frame = toon(0x3a3e4e);
  mk(new THREE.CylinderGeometry(0.28, 0.32, 0.08, 8), frame, 0, -0.32, 0, g);
  mk(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 8), frame, 0, 0.32, 0, g);
  mk(new THREE.TorusGeometry(0.12, 0.03, 6, 12), frame, 0, 0.46, 0, g, 0);
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; mk(new THREE.CylinderGeometry(0.02, 0.02, 0.6), frame, Math.cos(a) * 0.24, 0, Math.sin(a) * 0.24, g, 0); }
  const core = mk(new THREE.SphereGeometry(0.2, 12, 10), basic(0xffd36a), 0, 0, 0, g, 0);
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 10), basic(0xffc040, { transparent: true, opacity: 0.18, depthWrite: false })));
  return g;
}
export function buildBaseball(r = 0.32) {
  const g = new THREE.Group();
  mk(new THREE.SphereGeometry(r, 18, 14), toon(0xfbf7ef), 0, 0, 0, g, 1.08);
  for (const s of [-1, 1]) { const st = new THREE.Mesh(new THREE.TorusGeometry(r * 0.75, r * 0.05, 4, 20, Math.PI * 1.2), basic(0xe03a3a)); st.position.x = s * r * 0.45; st.rotation.y = Math.PI / 2; st.rotation.z = s * 0.6; g.add(st); }
  return g;
}
export function buildHeart() {
  const g = new THREE.Group();
  const m = toon(0xff5a6e);
  for (const s of [-1, 1]) mk(new THREE.SphereGeometry(0.2, 12, 10), m, 0.15 * s, 0.08, 0, g, 1.1);
  const c = mk(new THREE.ConeGeometry(0.29, 0.42, 4), m, 0, -0.2, 0, g, 1.1); c.rotation.set(Math.PI, Math.PI / 4, 0); c.scale.z = 0.6;
  return g;
}
function starShape(rOut, rIn, n = 5) {
  const s = new THREE.Shape();
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 + Math.PI / 2, r = i % 2 ? rIn : rOut;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
  }
  s.closePath();
  return s;
}
// Mario Galaxy-style launch star
export function buildLaunchStar() {
  const g = new THREE.Group();
  const spin = new THREE.Group(); spin.position.y = 0.9; g.add(spin);
  const geo = new THREE.ExtrudeGeometry(starShape(1.2, 0.55), { depth: 0.3, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 2 });
  geo.translate(0, 0, -0.15);
  const mat = toon(0xff9a2a);
  const star = mk(geo, mat, 0, 0, 0, spin, 1.07);
  star.rotation.x = -Math.PI / 2;
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.38, 20), basic(0x2b2440)); hole.rotation.x = -Math.PI / 2; hole.position.y = 0.26; spin.add(hole);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.05, 6, 40), basic(0xffe27a, { transparent: true, opacity: 0.7 })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.2; g.add(ring);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.4, 30, 18, 1, true), basic(0xffd36a, { transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }));
  beam.position.y = 15; g.add(beam);
  return { g, spin, mat, ring, beam };
}
export function buildRocket() {
  const g = new THREE.Group();
  const white = toon(0xf4f1ea), orange = toon(0xff7a3d);
  mk(new THREE.CylinderGeometry(0.7, 0.8, 2.6, 20), white, 0, 1.6, 0, g, 1.04);
  mk(new THREE.ConeGeometry(0.7, 1.2, 20), orange, 0, 3.5, 0, g, 1.05);
  const win = mk(new THREE.CircleGeometry(0.3, 18), basic(0x9ad8ff), 0, 2.2, 0.79, g, 0);
  void win;
  for (let i = 0; i < 3; i++) { const f = mk(new THREE.BoxGeometry(0.08, 0.9, 0.7), orange, 0, 0.6, 0, g); f.rotation.y = (i / 3) * Math.PI * 2; f.position.set(Math.sin(f.rotation.y) * 0.8, 0.6, Math.cos(f.rotation.y) * 0.8); }
  const fire = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.6, 12), basic(0xffb03a, { transparent: true, opacity: 0.9 })); fire.rotation.x = Math.PI; fire.position.y = -0.5; fire.visible = false; g.add(fire);
  return { g, fire };
}
export function buildStation() {
  const g = new THREE.Group();
  const white = toon(0xe8ecf4), blue = toon(0x7ac8ff), panel = toon(0x3a5aa8), gold = toon(0xffc23d);
  const hub = mk(new THREE.CylinderGeometry(2.2, 2.2, 2, 20), white, 0, 1, 0, g, 1.04);
  void hub;
  mk(new THREE.SphereGeometry(2.2, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), blue, 0, 2, 0, g, 1.03);
  for (const s of [-1, 1]) {
    mk(new THREE.CylinderGeometry(0.15, 0.15, 3, 8), white, s * 3.4, 1.4, 0, g).rotation.z = Math.PI / 2;
    const p = mk(new THREE.BoxGeometry(3, 0.08, 1.8), panel, s * 6, 1.4, 0, g, 1.04);
    for (let i = -1; i <= 1; i++) mk(new THREE.BoxGeometry(0.04, 0.1, 1.8), gold, s * 6 + i, 1.45, 0, g, 0);
    void p;
  }
  // the engine, with three empty core slots
  const engine = new THREE.Group(); engine.position.set(0, 0.8, -2.6); g.add(engine);
  mk(new THREE.CylinderGeometry(1, 1.3, 1.6, 16), toon(0x9aa0b8), 0, 0, 0, engine, 1.05).rotation.x = Math.PI / 2;
  const slots = [-0.5, 0, 0.5].map((x) => mk(new THREE.CircleGeometry(0.2, 12), basic(0x2b2440), x, 0.5, 0.82, engine, 0));
  const ant = mk(new THREE.CylinderGeometry(0.04, 0.04, 2), white, 1.2, 4.2, 0, g, 0); void ant;
  mk(new THREE.SphereGeometry(0.14, 8, 6), basic(0xff3a3a), 1.2, 5.2, 0, g, 0);
  const sign = label('STATION RENAS', 4, g); sign.position.set(0, 5.6, 0);
  return { g, engine, slots };
}

// ---------- signs with canvas text ----------
export function textBoard(text, w, h, bg = '#fff8ec', fg = '#2b2440', font = 900) {
  const tex = canvasTex(512, Math.round(512 * h / w), (g, W, H) => {
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#2b2440'; g.lineWidth = 16; g.strokeRect(8, 8, W - 16, H - 16);
    g.fillStyle = fg; g.font = `${font} ${Math.round(H * 0.42)}px ui-rounded, "Avenir Next", system-ui, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, W / 2, H / 2 + 4);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
  return m;
}
export { eyes, V3 };

// ---------- the locals: one builder, dressed differently per planet ----------
// o: { skin, shirt, pants, shoes, hair, hat: 'cap'|'beanie'|'helmet'|'chef'|'bun'|'curls', capC, beard, s (scale), item: 'spray'|'pick'|'bat'|'none' }
export function buildLocal(o = {}) {
  const root = new THREE.Group();
  const r = new THREE.Group(); r.scale.setScalar(o.s || 0.8); root.add(r);
  const skin = toon(o.skin ?? 0xf0c8a0), shirt = toon(o.shirt ?? 0xff7a3d), pants = toon(o.pants ?? 0x3a3e4e), hair = toon(o.hair ?? 0x3b2a20);
  const legs = [-1, 1].map((s) => {
    const p = new THREE.Group(); p.position.set(0.14 * s, 0.72, 0); r.add(p);
    mk(new THREE.CapsuleGeometry(0.12, 0.44, 4, 8), pants, 0, -0.34, 0, p);
    mk(new THREE.BoxGeometry(0.22, 0.12, 0.32), toon(o.shoes ?? 0xfbf7ef), 0, -0.66, 0.05, p);
    return p;
  });
  const body = new THREE.Group(); r.add(body);
  mk(new THREE.CapsuleGeometry(0.29, 0.45, 6, 12), shirt, 0, 1.08, 0, body);
  const arms = [-1, 1].map((s) => {
    const p = new THREE.Group(); p.position.set(0.4 * s, 1.36, 0.02); body.add(p);
    const a = mk(new THREE.CapsuleGeometry(0.09, 0.4, 4, 8), shirt, 0, -0.26, 0, p); a.rotation.z = 0.12 * s;
    mk(new THREE.SphereGeometry(0.1, 10, 8), skin, 0.03 * s, -0.54, 0, p, 1.08);
    return p;
  });
  const head = new THREE.Group(); head.position.set(0, 1.78, 0); body.add(head);
  mk(new THREE.SphereGeometry(0.3, 16, 12), skin, 0, 0, 0, head);
  eyes(head, 0.03, 0.27, 0.1, 0.045);
  [-1, 1].forEach((s) => { const c = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), M.cheek); c.position.set(0.17 * s, -0.06, 0.24); c.scale.z = 0.4; head.add(c); });
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.025, 0.02), ink); mouth.position.set(0, -0.1, 0.29); head.add(mouth);
  if (o.hat !== 'helmet' && o.hat !== 'chef') mk(new THREE.SphereGeometry(0.315, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2.1), hair, 0, 0.03, -0.02, head, 1.04);
  const cap = toon(o.capC ?? 0x2b2440);
  if (o.hat === 'cap') {
    mk(new THREE.SphereGeometry(0.32, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2.4), cap, 0, 0.06, 0, head, 1.04);
    const b = mk(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 14, 1, false, -Math.PI / 2, Math.PI), cap, 0, 0.1, 0.24, head, 0); b.scale.z = 1.3;
  } else if (o.hat === 'beanie') {
    mk(new THREE.SphereGeometry(0.33, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2.3), cap, 0, 0.08, 0, head, 1.04);
    mk(new THREE.SphereGeometry(0.09, 8, 6), toon(0xfff8ec), 0, 0.42, 0, head, 1.1);
  } else if (o.hat === 'helmet') {
    mk(new THREE.SphereGeometry(0.34, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2.2), toon(0xffd23a), 0, 0.05, 0, head, 1.05);
    const l = mk(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 12), basic(0xfff2a8), 0, 0.2, 0.3, head, 1.2); l.rotation.x = Math.PI / 2 - 0.5;
  } else if (o.hat === 'chef') {
    mk(new THREE.CylinderGeometry(0.31, 0.31, 0.16, 16), toon(0xfff8ec), 0, 0.2, 0, head, 1.05);
    mk(new THREE.SphereGeometry(0.3, 14, 10), toon(0xfff8ec), 0, 0.42, 0, head, 1.05).scale.y = 0.7;
  } else if (o.hat === 'bun') {
    mk(new THREE.SphereGeometry(0.16, 12, 10), hair, 0, 0.32, -0.12, head, 1.06);
  } else if (o.hat === 'curls') {
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; mk(new THREE.SphereGeometry(0.11, 8, 6), hair, Math.sin(a) * 0.24, 0.2, Math.cos(a) * 0.2 - 0.05, head, 0); }
  }
  if (o.beard) { const bd = mk(new THREE.ConeGeometry(0.24, 0.5, 12), toon(o.beard), 0, -0.36, 0.14, head, 1.06); bd.rotation.x = Math.PI + 0.3; }
  // something in their right hand
  const hand = new THREE.Group(); hand.position.set(0.03, -0.56, 0.08); arms[1].add(hand);
  if (o.item === 'spray') { mk(new THREE.CylinderGeometry(0.07, 0.07, 0.28, 10), toon(0xff5ab4), 0, 0.05, 0, hand, 1.1); mk(new THREE.CylinderGeometry(0.03, 0.03, 0.06, 6), toon(0x2b2440), 0, 0.22, 0, hand, 0); }
  else if (o.item === 'bat') { const b = mk(new THREE.CylinderGeometry(0.06, 0.03, 0.8, 8), toon(0xc8945a), 0, 0.3, 0, hand, 1.1); b.rotation.x = 0.3; }
  else if (o.item === 'tray') { mk(new THREE.CapsuleGeometry(0.05, 0.24, 4, 8), toon(0xe0703a), 0, 0.02, 0.05, hand, 1.1).rotation.z = Math.PI / 2; }
  return { root, r, body, head, arms, legs };
}

// quest objects for the locals
export function buildSneaker() {
  const g = new THREE.Group(), gold = toon(0xffd23a);
  mk(new THREE.BoxGeometry(0.34, 0.2, 0.62), gold, 0, 0.1, 0, g, 1.08);
  mk(new THREE.BoxGeometry(0.34, 0.24, 0.3), gold, 0, 0.3, -0.16, g, 1.08);
  mk(new THREE.BoxGeometry(0.38, 0.07, 0.66), toon(0xfff8ec), 0, -0.02, 0, g, 1.08);
  g.scale.setScalar(1.3); return g;
}
export function buildPickaxe() {
  const g = new THREE.Group();
  mk(new THREE.CylinderGeometry(0.05, 0.05, 1.1, 6), toon(0x8a5a34), 0, 0, 0, g, 1.1);
  const h = mk(new THREE.TorusGeometry(0.34, 0.07, 6, 14, Math.PI * 0.8), toon(0xffd23a), 0, 0.48, 0, g, 1.08); h.rotation.z = Math.PI * 0.1;
  return g;
}
export function buildMustard() {
  const g = new THREE.Group();
  mk(new THREE.CylinderGeometry(0.2, 0.22, 0.6, 12), toon(0xffd23a), 0, 0, 0, g, 1.08);
  mk(new THREE.ConeGeometry(0.2, 0.28, 12), toon(0xe03a3a), 0, 0.44, 0, g, 1.08);
  g.scale.setScalar(1.2); return g;
}
export function buildShard() {
  const g = new THREE.Group();
  const c = mk(new THREE.OctahedronGeometry(0.32), toon(0x9fe8ff), 0, 0, 0, g, 1.1); c.scale.y = 1.6;
  return g;
}

// ---------- Deniz, the Duke of Ice: an ice wizard with WAY too much aura ----------
// a long royal robe, a frost cape, spiky ice-white hair, a crystal crown, glowing eyes and a big ice staff
export function buildDeniz() {
  const root = new THREE.Group();
  const r = new THREE.Group(); r.scale.setScalar(1.25); root.add(r);
  const skin = toon(0xe8c4a0), robe = toon(0x2a4aa8), trim = toon(0x9fe8ff), white = toon(0xf4fbff), hairM = toon(0xe6f8ff), ice = toon(0xbff2ff);
  // robe and belt
  mk(new THREE.ConeGeometry(0.62, 1.35, 18), robe, 0, 0.68, 0, r, 1.05);
  mk(new THREE.TorusGeometry(0.6, 0.06, 6, 24), trim, 0, 0.06, 0, r, 0).rotation.x = Math.PI / 2;
  mk(new THREE.CylinderGeometry(0.3, 0.3, 0.08, 16), toon(0x14285a), 0, 1.12, 0, r, 0);
  // the frost cape
  const capeM = toon(0x14285a); capeM.side = THREE.DoubleSide;
  const cape = mk(new THREE.CylinderGeometry(0.4, 0.78, 1.6, 18, 1, true, Math.PI * 0.55, Math.PI * 0.9), capeM, 0, 0.85, -0.05, r, 0);
  // chest
  mk(new THREE.CapsuleGeometry(0.27, 0.36, 6, 12), robe, 0, 1.36, 0, r, 1.05);
  mk(new THREE.OctahedronGeometry(0.1), basic(0x9fe8ff), 0, 1.42, 0.27, r, 0);   // a gem on the chest
  // a tall collar of ice crystals behind his head
  for (let i = 0; i < 7; i++) {
    const a = -1.2 + i * 0.4;
    const c = mk(new THREE.ConeGeometry(0.07, 0.55 - Math.abs(i - 3) * 0.06, 5), ice, Math.sin(a) * 0.3, 1.82, -Math.cos(a) * 0.2 - 0.06, r, 1.1);
    c.rotation.z = -a * 0.35; c.rotation.x = -0.35;
  }
  // head
  const head = new THREE.Group(); head.position.set(0, 1.98, 0); r.add(head);
  mk(new THREE.SphereGeometry(0.27, 16, 12), skin, 0, 0, 0, head);
  const eyeM = basic(0x7dfcff);
  const eyesL = [-1, 1].map((s) => { const e = mk(new THREE.SphereGeometry(0.05, 8, 6), eyeM, 0.09 * s, 0.03, 0.24, head, 0); e.scale.y = 0.55; return e; });
  for (const s of [-1, 1]) { const b = mk(new THREE.BoxGeometry(0.11, 0.02, 0.02), ink, 0.09 * s, 0.1, 0.25, head, 0); b.rotation.z = 0.25 * s; }   // confident brows
  const smirk = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 10, Math.PI * 0.8), ink); smirk.position.set(0.03, -0.1, 0.24); smirk.rotation.z = Math.PI * 1.05; head.add(smirk);
  // spiky ice-white hair, swept back
  mk(new THREE.SphereGeometry(0.285, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2.1), hairM, 0, 0.03, -0.03, head, 1.04);
  for (let i = 0; i < 6; i++) { const s = mk(new THREE.ConeGeometry(0.07, 0.32, 5), hairM, -0.18 + i * 0.07, 0.2, -0.12, head, 1.08); s.rotation.x = -1.1; s.rotation.z = (i - 2.5) * 0.18; }
  // the crown: a ring with five ice spikes and a big gem
  const crown = new THREE.Group(); crown.position.y = 0.26; head.add(crown);
  mk(new THREE.CylinderGeometry(0.22, 0.24, 0.09, 16), toon(0xd8f4ff), 0, 0, 0, crown, 1.08);
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; const sp = mk(new THREE.OctahedronGeometry(0.07), basic(0x9fe8ff), Math.sin(a) * 0.2, 0.12, Math.cos(a) * 0.2, crown, 1.15); sp.scale.y = 2.2; }
  mk(new THREE.OctahedronGeometry(0.06), basic(0x5ef2e0), 0, 0.03, 0.24, crown, 0);
  // arms: the left one holds a frost orb, the right one the staff
  const arms = [-1, 1].map((s) => {
    const p = new THREE.Group(); p.position.set(0.36 * s, 1.55, 0.02); r.add(p);
    mk(new THREE.CapsuleGeometry(0.09, 0.42, 4, 8), robe, 0, -0.26, 0, p);
    mk(new THREE.CylinderGeometry(0.13, 0.09, 0.14, 10), trim, 0, -0.5, 0, p, 0);   // fluffy cuffs
    mk(new THREE.SphereGeometry(0.09, 10, 8), skin, 0, -0.6, 0, p, 1.08);
    return p;
  });
  const orb = mk(new THREE.SphereGeometry(0.16, 14, 10), basic(0xbff8ff), 0, -0.78, 0.05, arms[0], 1.1);
  const staff = new THREE.Group(); staff.position.set(0, -0.6, 0.06); arms[1].add(staff);
  mk(new THREE.CylinderGeometry(0.04, 0.05, 2.2, 8), toon(0xd8f4ff), 0, 0.3, 0, staff, 1.1);
  const crystal = mk(new THREE.OctahedronGeometry(0.24), basic(0x7dfcff), 0, 1.6, 0, staff, 1.1); crystal.scale.y = 1.7;
  const ring = mk(new THREE.TorusGeometry(0.3, 0.025, 6, 20), basic(0x9fe8ff), 0, 1.6, 0, staff, 0);
  return { root, r, head, arms, staff, crystal, ring, orb, cape, crown, eyes: eyesL, eyeM };
}

// ---------- Pingo: Deniz' royal penguin butler (bow tie, monocle, very tired) ----------
export function buildPingo() {
  const root = new THREE.Group();
  const r = new THREE.Group(); r.scale.setScalar(0.85); root.add(r);
  const black = toon(0x23263a), white = toon(0xf4fbff), orange = toon(0xffa23a);
  const body = new THREE.Group(); r.add(body);
  const b = mk(new THREE.SphereGeometry(0.55, 18, 14), black, 0, 0.75, 0, body); b.scale.set(1, 1.35, 0.95);
  const belly = mk(new THREE.SphereGeometry(0.45, 16, 12), white, 0, 0.7, 0.18, body, 0); belly.scale.set(0.9, 1.3, 0.7);
  const head = new THREE.Group(); head.position.set(0, 1.55, 0); body.add(head);
  mk(new THREE.SphereGeometry(0.36, 16, 12), black, 0, 0, 0, head);
  const face = mk(new THREE.SphereGeometry(0.28, 14, 10), white, 0, -0.03, 0.14, head, 0); face.scale.set(1, 0.9, 0.7);
  eyes(head, 0.06, 0.32, 0.11, 0.045);
  const mono = mk(new THREE.TorusGeometry(0.075, 0.015, 6, 14), toon(0xffd23a), 0.11, 0.06, 0.34, head, 0); void mono;
  mk(new THREE.ConeGeometry(0.09, 0.26, 8), orange, 0, -0.06, 0.38, head, 1.1).rotation.x = Math.PI / 2;
  // bow tie
  for (const s of [-1, 1]) { const t = mk(new THREE.ConeGeometry(0.1, 0.18, 4), toon(0xe03a5a), 0.09 * s, 1.18, 0.42, body, 1.1); t.rotation.z = (Math.PI / 2) * s; }
  // flippers and feet
  const arms = [-1, 1].map((s) => {
    const p = new THREE.Group(); p.position.set(0.52 * s, 1.0, 0); body.add(p);
    const f = mk(new THREE.SphereGeometry(0.16, 10, 8), black, 0.05 * s, -0.3, 0, p); f.scale.set(0.45, 1.6, 0.8);
    return p;
  });
  const legs = [-1, 1].map((s) => mk(new THREE.BoxGeometry(0.24, 0.08, 0.34), orange, 0.2 * s, 0.04, 0.12, r, 1.1));
  // a silver tray with an ice cube on it
  const tray = mk(new THREE.CylinderGeometry(0.28, 0.28, 0.03, 16), toon(0xd0d8e8), 0.05, -0.62, 0.15, arms[0], 1.1);
  mk(new THREE.BoxGeometry(0.12, 0.12, 0.12), toon(0xbff2ff), 0, 0.08, 0, tray, 1.1);
  return { root, r, body, head, arms, legs };
}

// quest objects on Deniz' planet
export function buildAuraCrystal() {
  const g = new THREE.Group();
  const c = mk(new THREE.OctahedronGeometry(0.34), basic(0x7dfcff), 0, 0, 0, g, 1.12); c.scale.y = 1.7;
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.62, 14, 10), basic(0x9fe8ff, { transparent: true, opacity: 0.25, depthWrite: false, blending: THREE.AdditiveBlending })); g.add(halo);
  const ring = mk(new THREE.TorusGeometry(0.55, 0.03, 6, 20), basic(0xffffff), 0, 0, 0, g, 0); ring.rotation.x = Math.PI / 2.4;
  return g;
}
export function buildScarf() {
  const g = new THREE.Group(), red = toon(0xe03a5a), white = toon(0xfff8ec);
  const loop = mk(new THREE.TorusGeometry(0.3, 0.1, 8, 18), red, 0, 0, 0, g, 1.08); loop.rotation.x = Math.PI / 2;
  for (const s of [-1, 1]) { mk(new THREE.BoxGeometry(0.16, 0.5, 0.06), red, 0.12 * s, -0.3, 0.26, g, 1.08); mk(new THREE.BoxGeometry(0.17, 0.06, 0.07), white, 0.12 * s, -0.5, 0.26, g, 0); }
  g.scale.setScalar(1.3); return g;
}

// ---------- Fionn: an Irish geologist (ginger curls, freckles, flat cap, field vest, rock hammer, magnifying glass) ----------
export function buildFionn() {
  const m = buildLocal({ s: 0.82, skin: 0xf6d2b8, shirt: 0x8a7a4a, pants: 0x3a4a3a, hair: 0xd8602a, hat: 'curls', shoes: 0x5a3a20 });
  const freck = toon(0xc0703a);
  for (const [x, y] of [[-0.12, -0.02], [-0.16, -0.05], [-0.09, -0.06], [0.12, -0.02], [0.16, -0.05], [0.09, -0.06]]) mk(new THREE.SphereGeometry(0.018, 6, 4), freck, x, y, 0.275, m.head, 0);
  // the flat cap
  const cap = toon(0x2a7a3a);
  mk(new THREE.SphereGeometry(0.33, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2.6), cap, 0, 0.09, 0, m.head, 1.05).scale.set(1, 0.7, 1.05);
  const brim = mk(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 14, 1, false, -Math.PI / 2, Math.PI), cap, 0, 0.12, 0.2, m.head, 0); brim.scale.z = 1.2;
  // the field vest with pockets, and a green scarf
  for (const s of [-1, 1]) mk(new THREE.BoxGeometry(0.14, 0.12, 0.04), toon(0x6a5a34), 0.13 * s, 1.08, 0.3, m.body, 0);
  mk(new THREE.TorusGeometry(0.22, 0.06, 6, 16), toon(0x2a9a4a), 0, 1.5, 0, m.body, 0).rotation.x = Math.PI / 2;
  // a rock hammer in the right hand, a magnifying glass in the left
  const hand = m.arms[1];
  mk(new THREE.CylinderGeometry(0.035, 0.035, 0.6, 6), toon(0x8a5a34), 0.03, -0.45, 0.12, hand, 1.1).rotation.x = 1.2;
  mk(new THREE.BoxGeometry(0.3, 0.1, 0.1), toon(0x9aa0b8), 0.03, -0.38, 0.4, hand, 1.1);
  const mg = new THREE.Group(); mg.position.set(-0.03, -0.62, 0.1); m.arms[0].add(mg);
  mk(new THREE.TorusGeometry(0.1, 0.02, 6, 16), toon(0xc8a040), 0, 0.12, 0, mg, 0);
  mk(new THREE.CircleGeometry(0.09, 16), basic(0xbff2ff, { transparent: true, opacity: 0.6 }), 0, 0.12, 0.01, mg, 0);
  mk(new THREE.CylinderGeometry(0.02, 0.02, 0.14, 6), toon(0x5a3a20), 0, 0, 0, mg, 0);
  return m;
}

// ---------- Lorcan Pech, the Bad-Luck Leprechaun (green coat, huge hat, orange beard, a giant gold coin) ----------
export function buildLeprechaun() {
  const root = new THREE.Group();
  const r = new THREE.Group(); r.scale.setScalar(0.9); root.add(r);
  const green = toon(0x2a8a3a), dark = toon(0x14502a), skin = toon(0xf0c8a0), beardM = toon(0xe0702a), gold = toon(0xffd23a);
  const legs = [-1, 1].map((s) => {
    const p = new THREE.Group(); p.position.set(0.13 * s, 0.5, 0); r.add(p);
    mk(new THREE.CapsuleGeometry(0.09, 0.3, 4, 8), dark, 0, -0.22, 0, p);
    const sh = mk(new THREE.ConeGeometry(0.1, 0.36, 8), toon(0x2b2440), 0, -0.44, 0.12, p, 1.1); sh.rotation.x = Math.PI / 2;   // pointy shoes
    mk(new THREE.BoxGeometry(0.1, 0.05, 0.03), gold, 0, -0.43, 0.06, p, 0);
    return p;
  });
  const body = new THREE.Group(); r.add(body);
  mk(new THREE.CapsuleGeometry(0.3, 0.3, 6, 12), green, 0, 0.82, 0, body);
  mk(new THREE.CylinderGeometry(0.31, 0.31, 0.08, 16), toon(0x2b2440), 0, 0.72, 0, body, 0);
  mk(new THREE.BoxGeometry(0.14, 0.1, 0.04), gold, 0, 0.72, 0.31, body, 0);
  for (let i = 0; i < 3; i++) mk(new THREE.SphereGeometry(0.03, 6, 4), gold, 0, 0.88 + i * 0.1, 0.3, body, 0);
  const arms = [-1, 1].map((s) => {
    const p = new THREE.Group(); p.position.set(0.34 * s, 1.0, 0); body.add(p);
    mk(new THREE.CapsuleGeometry(0.07, 0.3, 4, 8), green, 0, -0.2, 0, p);
    mk(new THREE.SphereGeometry(0.08, 8, 6), skin, 0, -0.4, 0, p, 1.08);
    return p;
  });
  const head = new THREE.Group(); head.position.set(0, 1.38, 0); body.add(head);
  mk(new THREE.SphereGeometry(0.26, 16, 12), skin, 0, 0, 0, head);
  eyes(head, 0.05, 0.23, 0.09, 0.04);
  mk(new THREE.SphereGeometry(0.06, 8, 6), toon(0xff9a8a), 0, -0.02, 0.26, head, 0);
  const beard = mk(new THREE.SphereGeometry(0.24, 12, 10), beardM, 0, -0.18, 0.1, head, 1.05); beard.scale.set(1.15, 1, 0.8);
  for (const s of [-1, 1]) mk(new THREE.SphereGeometry(0.1, 8, 6), beardM, 0.2 * s, 0.02, -0.02, head, 1.05);   // sideburns
  const grin = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.015, 6, 12, Math.PI), ink); grin.position.set(0, -0.08, 0.25); grin.rotation.z = Math.PI; head.add(grin);
  // the huge hat with a gold buckle and a four-leaf clover
  const hat = new THREE.Group(); hat.position.y = 0.2; head.add(hat);
  mk(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 20), dark, 0, 0, 0, hat, 1.06);
  mk(new THREE.CylinderGeometry(0.24, 0.28, 0.55, 18), green, 0, 0.3, 0, hat, 1.05);
  mk(new THREE.CylinderGeometry(0.285, 0.285, 0.09, 18), toon(0x2b2440), 0, 0.08, 0, hat, 0);
  mk(new THREE.BoxGeometry(0.14, 0.12, 0.03), gold, 0, 0.08, 0.28, hat, 0);
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; mk(new THREE.SphereGeometry(0.045, 8, 6), toon(0x5cd85a), 0.17 + Math.cos(a) * 0.04, 0.42 + Math.sin(a) * 0.04, 0.2, hat, 0); }
  // a giant gold coin in his left hand
  const coin = mk(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 20), gold, 0, -0.5, 0.08, arms[0], 1.1); coin.rotation.x = Math.PI / 2;
  return { root, r, body, head, arms, legs, hat, coin };
}

// quest objects on Fionn's planet
export function buildLuckyStone(color = 0x2ad85a) {
  const g = new THREE.Group();
  const c = mk(new THREE.DodecahedronGeometry(0.32), toon(color), 0, 0, 0, g, 1.1); c.scale.set(1, 1.2, 0.9);
  for (let i = 0; i < 3; i++) { const s = mk(new THREE.OctahedronGeometry(0.08), basic(0xffffff), Math.sin(i * 2.1) * 0.36, 0.2 + i * 0.08, Math.cos(i * 2.1) * 0.36, g, 0); s.scale.y = 1.8; }
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 10), basic(color, { transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending })); g.add(halo);
  return g;
}
export function buildHorseshoe() {
  const g = new THREE.Group();
  const h = mk(new THREE.TorusGeometry(0.3, 0.08, 8, 18, Math.PI * 1.3), toon(0xffd23a), 0, 0, 0, g, 1.08); h.rotation.z = -Math.PI * 0.15 + Math.PI;
  g.scale.setScalar(1.3); return g;
}

// ---------- Reshman: a cheeky jungle monkey (brown fur, a light face and belly, big ears, a curly tail, a red bandana) ----------
export function buildMonkey(o = {}) {
  const root = new THREE.Group();
  const r = new THREE.Group(); r.scale.setScalar(o.s || 0.85); root.add(r);
  const fur = toon(o.fur ?? 0x8a5a34), light = toon(o.light ?? 0xf0c896), dark = toon(0x5a3a20);
  const legs = [-1, 1].map((s) => {
    const p = new THREE.Group(); p.position.set(0.16 * s, 0.56, 0); r.add(p);
    mk(new THREE.CapsuleGeometry(0.11, 0.3, 4, 8), fur, 0, -0.24, 0, p);
    mk(new THREE.SphereGeometry(0.13, 10, 8), light, 0, -0.5, 0.06, p, 1.08).scale.set(1, 0.6, 1.4);   // big monkey feet
    return p;
  });
  const body = new THREE.Group(); r.add(body);
  mk(new THREE.SphereGeometry(0.36, 16, 12), fur, 0, 0.9, 0, body).scale.set(1, 1.15, 0.9);
  mk(new THREE.SphereGeometry(0.26, 14, 10), light, 0, 0.86, 0.16, body, 0).scale.set(1, 1.2, 0.7);   // belly
  // the curly tail
  const tail = new THREE.Group(); tail.position.set(0, 0.7, -0.3); body.add(tail);
  for (let i = 0; i < 9; i++) { const a = i * 0.5; mk(new THREE.SphereGeometry(0.06, 8, 6), fur, 0, Math.sin(a) * 0.3 + i * 0.06, -0.1 - (1 - Math.cos(a)) * 0.25, tail, 0); }
  // long monkey arms
  const arms = [-1, 1].map((s) => {
    const p = new THREE.Group(); p.position.set(0.36 * s, 1.14, 0); body.add(p);
    const a = mk(new THREE.CapsuleGeometry(0.08, 0.5, 4, 8), fur, 0, -0.32, 0, p); a.rotation.z = 0.12 * s;
    mk(new THREE.SphereGeometry(0.1, 10, 8), light, 0.04 * s, -0.66, 0, p, 1.08);
    return p;
  });
  const head = new THREE.Group(); head.position.set(0, 1.52, 0); body.add(head);
  mk(new THREE.SphereGeometry(0.32, 16, 12), fur, 0, 0, 0, head);
  const face = mk(new THREE.SphereGeometry(0.24, 14, 10), light, 0, -0.04, 0.16, head, 0); face.scale.set(1.15, 1, 0.75);
  mk(new THREE.SphereGeometry(0.15, 12, 8), light, 0, -0.12, 0.27, head, 0).scale.set(1.2, 0.8, 0.8);   // muzzle
  eyes(head, 0.05, 0.31, 0.09, 0.045);
  for (const s of [-1, 1]) mk(new THREE.SphereGeometry(0.02, 6, 4), ink, 0.03 * s, -0.08, 0.38, head, 0);   // nostrils
  const grin = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.015, 6, 12, Math.PI), ink); grin.position.set(0, -0.15, 0.36); grin.rotation.z = Math.PI; head.add(grin);
  for (const s of [-1, 1]) { mk(new THREE.SphereGeometry(0.12, 10, 8), fur, 0.33 * s, 0.04, 0, head, 1.05).scale.z = 0.5; mk(new THREE.SphereGeometry(0.07, 8, 6), light, 0.36 * s, 0.04, 0.03, head, 0).scale.z = 0.4; }   // ears
  mk(new THREE.SphereGeometry(0.1, 8, 6), fur, 0, 0.3, 0.02, head, 0).scale.set(1.4, 0.6, 1);   // a tuft of hair
  if (o.bandana !== false) {
    const band = toon(o.bandana ?? 0xe03a3a);
    mk(new THREE.TorusGeometry(0.3, 0.05, 6, 20), band, 0, 0.12, 0, head, 1.05).rotation.x = Math.PI / 2 - 0.15;
    for (const s of [-1, 1]) { const k = mk(new THREE.BoxGeometry(0.06, 0.2, 0.04), band, 0.06 * s, 0.05, -0.32, head, 0); k.rotation.z = 0.5 * s; }
  }
  // a banana in the right hand
  if (o.banana !== false) { const b = mk(new THREE.TorusGeometry(0.14, 0.045, 6, 10, Math.PI * 0.8), toon(0xffd23a), 0, -0.7, 0.1, arms[1], 1.1); b.rotation.set(0, Math.PI / 2, 0.4); }
  return { root, r, body, head, arms, legs, tail };
}
export function buildReshman() { return buildMonkey({ s: 0.9 }); }

// ---------- Koning Kokos: a huge silverback gorilla with a coconut crown ----------
export function buildGorilla() {
  const root = new THREE.Group();
  const r = new THREE.Group(); r.scale.setScalar(1.6); root.add(r);
  const fur = toon(0x2e2a34), grey = toon(0x8a8a96), skin = toon(0x5a4a5a);
  const legs = [-1, 1].map((s) => {
    const p = new THREE.Group(); p.position.set(0.32 * s, 0.6, 0); r.add(p);
    mk(new THREE.CapsuleGeometry(0.2, 0.35, 4, 8), fur, 0, -0.3, 0, p);
    mk(new THREE.SphereGeometry(0.22, 10, 8), skin, 0, -0.6, 0.08, p, 1.06).scale.set(1, 0.5, 1.4);
    return p;
  });
  const body = new THREE.Group(); r.add(body);
  const torso = mk(new THREE.SphereGeometry(0.7, 18, 14), fur, 0, 1.25, -0.05, body); torso.scale.set(1.15, 1.05, 0.9);
  mk(new THREE.SphereGeometry(0.62, 16, 12), grey, 0, 1.4, -0.22, body, 0).scale.set(1.05, 0.8, 0.8);   // the silver back
  const chest = mk(new THREE.SphereGeometry(0.42, 14, 10), skin, 0, 1.25, 0.38, body, 0); chest.scale.set(1.2, 1, 0.5);
  const arms = [-1, 1].map((s) => {
    const p = new THREE.Group(); p.position.set(0.82 * s, 1.65, 0); body.add(p);
    mk(new THREE.CapsuleGeometry(0.22, 0.75, 4, 10), fur, 0.05 * s, -0.5, 0, p);
    mk(new THREE.SphereGeometry(0.28, 12, 10), skin, 0.06 * s, -1.05, 0.05, p, 1.06);   // big fists
    return p;
  });
  const head = new THREE.Group(); head.position.set(0, 2.05, 0.3); body.add(head);
  mk(new THREE.SphereGeometry(0.42, 16, 12), fur, 0, 0.05, 0, head).scale.set(1, 1.1, 0.95);
  const face = mk(new THREE.SphereGeometry(0.3, 14, 10), skin, 0, -0.06, 0.2, head, 0); face.scale.set(1.1, 0.95, 0.7);
  mk(new THREE.BoxGeometry(0.5, 0.1, 0.12), fur, 0, 0.14, 0.33, head, 0);   // a heavy brow
  const eyeM = basic(0xffd23a);
  for (const s of [-1, 1]) mk(new THREE.SphereGeometry(0.05, 8, 6), eyeM, 0.12 * s, 0.05, 0.4, head, 0);
  for (const s of [-1, 1]) mk(new THREE.SphereGeometry(0.035, 6, 4), ink, 0.05 * s, -0.08, 0.45, head, 0);
  const mouth = mk(new THREE.BoxGeometry(0.22, 0.04, 0.03), ink, 0, -0.2, 0.4, head, 0);
  // the crown: a ring of coconut shell with banana spikes
  const crown = new THREE.Group(); crown.position.y = 0.42; head.add(crown);
  mk(new THREE.CylinderGeometry(0.3, 0.33, 0.14, 16), toon(0x6a4020), 0, 0, 0, crown, 1.08);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const b = mk(new THREE.ConeGeometry(0.06, 0.26, 6), toon(0xffd23a), Math.sin(a) * 0.28, 0.16, Math.cos(a) * 0.28, crown, 1.1); b.rotation.z = Math.sin(a) * 0.25; }
  mk(new THREE.OctahedronGeometry(0.07), basic(0x5cd85a), 0, 0.05, 0.33, crown, 0);
  return { root, r, body, head, arms, legs, crown, mouth, chest, eyeM };
}

// quest objects in Het Oerwoud
export function buildGoldBanana() {
  const g = new THREE.Group();
  const b = mk(new THREE.TorusGeometry(0.3, 0.1, 8, 14, Math.PI * 0.85), basic(0xffe27a), 0, 0, 0, g, 1.1); b.rotation.z = Math.PI * 0.1;
  mk(new THREE.CylinderGeometry(0.04, 0.05, 0.12, 6), toon(0x6a4020), 0.3, 0.08, 0, g, 0);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 10), basic(0xffd23a, { transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending })); g.add(halo);
  return g;
}
export function buildCamera() {
  const g = new THREE.Group();
  mk(new THREE.BoxGeometry(0.5, 0.32, 0.22), toon(0x2b2440), 0, 0, 0, g, 1.08);
  mk(new THREE.CylinderGeometry(0.11, 0.13, 0.18, 14), toon(0x9aa0b8), 0, 0, 0.18, g, 1.08).rotation.x = Math.PI / 2;
  mk(new THREE.BoxGeometry(0.12, 0.06, 0.08), basic(0xff5a5a), -0.16, 0.19, 0, g, 0);
  g.scale.setScalar(1.3); return g;
}
export function buildCoconut(r = 0.5) {
  const g = new THREE.Group();
  mk(new THREE.SphereGeometry(r, 12, 10), toon(0x6a4020), 0, r, 0, g, 1.06);
  for (let i = 0; i < 3; i++) mk(new THREE.SphereGeometry(r * 0.12, 6, 4), ink, Math.sin(i * 2.1) * r * 0.3, r * 1.85, Math.cos(i * 2.1) * r * 0.3, g, 0);
  return g;
}

// ---------- Lotte: a volcanologist in a shiny silver heat suit with a gold visor ----------
export function buildLotte() {
  const m = buildLocal({ s: 0.78, skin: 0xf0c8a0, shirt: 0xc8ccd8, pants: 0xa8acb8, hair: 0xe0a040, hat: 'bun', shoes: 0x3a3640 });
  const suit = toon(0xd8dce8);
  mk(new THREE.SphereGeometry(0.36, 14, 10, 0, Math.PI * 2, 0, Math.PI / 1.6), suit, 0, 0.04, -0.02, m.head, 1.04);   // the hood
  const visor = mk(new THREE.SphereGeometry(0.31, 14, 10, -Math.PI / 2.4, Math.PI / 1.2, Math.PI / 3.2, Math.PI / 3), basic(0xffc23d, { transparent: true, opacity: 0.55 }), 0, 0, 0.02, m.head, 0); void visor;
  mk(new THREE.BoxGeometry(0.34, 0.4, 0.18), toon(0xff7a3a), 0, 1.15, -0.32, m.body, 1.06);   // a cooling pack
  const probe = mk(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 6), toon(0x9aa0b8), 0.03, -0.55, 0.2, m.arms[1], 1.1); probe.rotation.x = 1.1;
  mk(new THREE.SphereGeometry(0.06, 8, 6), basic(0xff5a2a), 0.03, -0.55, 0.58, m.arms[1], 0);
  return m;
}
// ---------- Smeul: a big red fire dragon ----------
export function buildDragon() {
  const root = new THREE.Group();
  const r = new THREE.Group(); r.scale.setScalar(1.5); root.add(r);
  const red = toon(0xc8302a), dark = toon(0x7a1a1a), belly = toon(0xffb03a), horn = toon(0xf4f1ea);
  const legs = [-1, 1].map((s) => { const p = new THREE.Group(); p.position.set(0.5 * s, 0.7, 0.1); r.add(p); mk(new THREE.CapsuleGeometry(0.22, 0.4, 4, 8), red, 0, -0.35, 0, p); mk(new THREE.SphereGeometry(0.25, 10, 8), dark, 0, -0.7, 0.12, p, 1.06).scale.set(1, 0.5, 1.4); return p; });
  const body = new THREE.Group(); r.add(body);
  mk(new THREE.SphereGeometry(0.8, 18, 14), red, 0, 1.2, -0.1, body).scale.set(1, 0.95, 1.25);
  mk(new THREE.SphereGeometry(0.6, 14, 10), belly, 0, 1.1, 0.35, body, 0).scale.set(1, 1, 0.6);
  for (let i = 0; i < 5; i++) mk(new THREE.ConeGeometry(0.12, 0.35, 5), horn, 0, 1.95 - i * 0.05, -0.2 - i * 0.3, body, 1.08).rotation.x = -0.3;   // back spikes
  const tail = new THREE.Group(); tail.position.set(0, 0.9, -0.9); body.add(tail);
  for (let i = 0; i < 6; i++) mk(new THREE.SphereGeometry(0.3 - i * 0.04, 10, 8), red, 0, -i * 0.08, -i * 0.32, tail, 1.06);
  mk(new THREE.ConeGeometry(0.2, 0.4, 4), dark, 0, -0.5, -2.0, tail, 1.06).rotation.x = -Math.PI / 2;
  const wings = [-1, 1].map((s) => {
    const p = new THREE.Group(); p.position.set(0.6 * s, 1.6, -0.2); body.add(p);
    const wm = toon(0x8a1a2a); wm.side = THREE.DoubleSide;
    const w = new THREE.Mesh(new THREE.ConeGeometry(1.2, 0.1, 3), wm); w.rotation.set(0, 0, Math.PI / 2 * s); w.position.set(1.0 * s, 0.3, 0); w.scale.set(1, 1, 1.6); p.add(w);
    return p;
  });
  const neck = new THREE.Group(); neck.position.set(0, 1.6, 0.55); body.add(neck);
  mk(new THREE.CapsuleGeometry(0.28, 0.6, 4, 10), red, 0, 0.35, 0.15, neck).rotation.x = 0.5;
  const head = new THREE.Group(); head.position.set(0, 0.85, 0.45); neck.add(head);
  mk(new THREE.SphereGeometry(0.42, 16, 12), red, 0, 0, 0, head).scale.set(1, 0.85, 1.2);
  mk(new THREE.BoxGeometry(0.5, 0.25, 0.5), red, 0, -0.05, 0.45, head, 1.05);   // snout
  const jaw = new THREE.Group(); jaw.position.set(0, -0.18, 0.2); head.add(jaw);
  mk(new THREE.BoxGeometry(0.46, 0.12, 0.62), dark, 0, 0, 0.25, jaw, 1.05);
  const eyeM = basic(0xffe14a);
  for (const s of [-1, 1]) { mk(new THREE.SphereGeometry(0.08, 8, 6), eyeM, 0.22 * s, 0.14, 0.32, head, 0); const h = mk(new THREE.ConeGeometry(0.08, 0.45, 6), horn, 0.22 * s, 0.4, -0.2, head, 1.08); h.rotation.x = -0.7; }
  for (const s of [-1, 1]) mk(new THREE.SphereGeometry(0.035, 6, 4), ink, 0.1 * s, 0.06, 0.71, head, 0);
  const flame = mk(new THREE.ConeGeometry(0.35, 1.6, 10), basic(0xff9a2a, { transparent: true, opacity: 0.85, depthWrite: false }), 0, -0.05, 1.4, head, 0); flame.rotation.x = Math.PI / 2; flame.visible = false;
  return { root, r, body, neck, head, jaw, wings, tail, legs, eyeM, flame };
}
export function buildFireGem() {
  const g = new THREE.Group();
  const c = mk(new THREE.OctahedronGeometry(0.34), basic(0xff7a2a), 0, 0, 0, g, 1.12); c.scale.y = 1.5;
  mk(new THREE.OctahedronGeometry(0.18), basic(0xffe14a), 0, 0, 0, g, 0).scale.y = 1.5;
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.6, 14, 10), basic(0xff7a2a, { transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending })); g.add(halo);
  return g;
}
export function buildHammer() {
  const g = new THREE.Group();
  mk(new THREE.CylinderGeometry(0.06, 0.06, 0.9, 6), toon(0x8a5a34), 0, 0, 0, g, 1.1);
  mk(new THREE.BoxGeometry(0.5, 0.26, 0.26), toon(0x5a5a68), 0, 0.45, 0, g, 1.08);
  g.scale.setScalar(1.3); return g;
}

// ---------- Farah: an archaeologist with a sun hat, a scarf and a magnifying glass ----------
export function buildFarah() {
  const m = buildLocal({ s: 0.78, skin: 0xd8a070, shirt: 0xf0e0b8, pants: 0x8a6a4a, hair: 0x2b1a10, hat: 'curls', shoes: 0x6a4a2a });
  const hatM = toon(0xe8d098);
  mk(new THREE.CylinderGeometry(0.5, 0.5, 0.04, 20), hatM, 0, 0.18, 0, m.head, 1.05);
  mk(new THREE.SphereGeometry(0.3, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), hatM, 0, 0.18, 0, m.head, 1.05);
  mk(new THREE.CylinderGeometry(0.305, 0.305, 0.06, 16), toon(0xe03a5a), 0, 0.22, 0, m.head, 0);
  mk(new THREE.TorusGeometry(0.22, 0.06, 6, 16), toon(0x14a8a0), 0, 1.5, 0, m.body, 0).rotation.x = Math.PI / 2;   // scarf
  mk(new THREE.BoxGeometry(0.32, 0.26, 0.12), toon(0x8a5a34), 0.3, 0.95, -0.15, m.body, 1.06);   // a satchel
  const mg = new THREE.Group(); mg.position.set(-0.03, -0.62, 0.1); m.arms[0].add(mg);
  mk(new THREE.TorusGeometry(0.1, 0.02, 6, 16), toon(0xc8a040), 0, 0.12, 0, mg, 0);
  mk(new THREE.CircleGeometry(0.09, 16), basic(0xbff2ff, { transparent: true, opacity: 0.6 }), 0, 0.12, 0.01, mg, 0);
  return m;
}
// ---------- Gruizel: a giant sandworm with a ring of teeth ----------
export function buildWorm() {
  const root = new THREE.Group();
  const sand = toon(0xc8945a), band = toon(0x8a5a34);
  const segs = [];
  for (let i = 0; i < 7; i++) { const s = mk(new THREE.SphereGeometry(1.05 - i * 0.04, 16, 12), i % 2 ? band : sand, 0, 0.6 + i * 0.85, 0, root, 1.05); s.scale.y = 0.7; segs.push(s); }
  const head = new THREE.Group(); head.position.y = 6.6; root.add(head);
  mk(new THREE.SphereGeometry(1.0, 18, 14), sand, 0, 0, 0, head, 1.05);
  const mouth = mk(new THREE.CircleGeometry(0.62, 18), basic(0x3a0a14), 0, 0, 0.92, head, 0);
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; const t = mk(new THREE.ConeGeometry(0.09, 0.3, 5), toon(0xfff8ec), Math.cos(a) * 0.55, Math.sin(a) * 0.55, 0.9, head, 0); t.rotation.set(Math.PI / 2, 0, a + Math.PI / 2); t.rotation.x = Math.PI / 2 + 0.6; }
  const eyeM = basic(0x5ef2e0);
  for (const s of [-1, 1]) mk(new THREE.SphereGeometry(0.15, 10, 8), eyeM, 0.55 * s, 0.6, 0.6, head, 1.1);
  for (let i = 0; i < 3; i++) mk(new THREE.ConeGeometry(0.15, 0.6, 5), band, (i - 1) * 0.35, 1.0, -0.1, head, 1.06).rotation.x = -0.4;   // spikes on top
  return { root, segs, head, mouth, eyeM };
}
export function buildScarab() {
  const g = new THREE.Group(), gold = basic(0xffd23a);
  mk(new THREE.SphereGeometry(0.3, 14, 10), gold, 0, 0, 0, g, 1.1).scale.set(1, 0.5, 1.3);
  mk(new THREE.SphereGeometry(0.14, 10, 8), gold, 0, 0.02, 0.38, g, 1.1);
  mk(new THREE.BoxGeometry(0.02, 0.18, 0.5), basic(0x14a8a0), 0, 0.12, 0, g, 0);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 10), basic(0xffd23a, { transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending })); g.add(halo);
  g.scale.setScalar(1.2); return g;
}
export function buildScroll() {
  const g = new THREE.Group();
  mk(new THREE.BoxGeometry(0.6, 0.02, 0.4), toon(0xf0e0b8), 0, 0, 0, g, 1.1);
  for (const s of [-1, 1]) mk(new THREE.CylinderGeometry(0.06, 0.06, 0.46, 8), toon(0x8a5a34), 0.32 * s, 0, 0, g, 1.1).rotation.x = Math.PI / 2;
  mk(new THREE.BoxGeometry(0.1, 0.03, 0.1), basic(0xe03a3a), 0.1, 0.02, 0.05, g, 0);
  g.scale.setScalar(1.3); return g;
}
export function buildCamel() {
  const g = new THREE.Group(), fur = toon(0xd8a868), dark = toon(0x8a5a34);
  mk(new THREE.SphereGeometry(0.7, 14, 10), fur, 0, 1.4, 0, g, 1.05).scale.set(0.9, 0.7, 1.4);
  mk(new THREE.SphereGeometry(0.42, 12, 10), fur, 0, 2.0, 0.1, g, 1.05);   // the hump
  const n = mk(new THREE.CapsuleGeometry(0.16, 0.7, 4, 8), fur, 0, 1.9, 0.95, g, 1.06); n.rotation.x = 0.5;
  mk(new THREE.SphereGeometry(0.24, 10, 8), fur, 0, 2.3, 1.25, g, 1.06).scale.z = 1.4;
  for (const s of [-1, 1]) mk(new THREE.SphereGeometry(0.04, 6, 4), ink, 0.12 * s, 2.4, 1.38, g, 0);
  for (const [x, z] of [[-0.3, 0.6], [0.3, 0.6], [-0.3, -0.6], [0.3, -0.6]]) mk(new THREE.CylinderGeometry(0.09, 0.07, 1.1, 6), dark, x, 0.55, z, g, 1.08);
  return g;
}

// ---------- Kosmo: a small, friendly moon robot with a screen for a face ----------
export function buildKosmo() {
  const root = new THREE.Group();
  const r = new THREE.Group(); r.scale.setScalar(0.85); root.add(r);
  const white = toon(0xf4f1ea), grey = toon(0x8a90a8), teal = toon(0x14b8a6);
  const legs = [-1, 1].map((s) => { const p = new THREE.Group(); p.position.set(0.2 * s, 0.5, 0); r.add(p); mk(new THREE.CylinderGeometry(0.08, 0.08, 0.4, 8), grey, 0, -0.2, 0, p); mk(new THREE.BoxGeometry(0.24, 0.12, 0.34), teal, 0, -0.44, 0.04, p, 1.08); return p; });
  const body = new THREE.Group(); r.add(body);
  mk(new THREE.BoxGeometry(0.7, 0.6, 0.5), white, 0, 0.85, 0, body, 1.05);
  mk(new THREE.CircleGeometry(0.12, 16), basic(0x5ef2e0), 0, 0.9, 0.26, body, 0);   // a glowing heart light
  const arms = [-1, 1].map((s) => { const p = new THREE.Group(); p.position.set(0.42 * s, 1.0, 0); body.add(p); mk(new THREE.CylinderGeometry(0.06, 0.06, 0.45, 8), grey, 0, -0.22, 0, p); mk(new THREE.TorusGeometry(0.09, 0.03, 6, 10, Math.PI * 1.5), teal, 0, -0.5, 0, p, 0); return p; });
  const head = new THREE.Group(); head.position.set(0, 1.45, 0); body.add(head);
  mk(new THREE.BoxGeometry(0.7, 0.5, 0.5), white, 0, 0, 0, head, 1.05);
  const screen = mk(new THREE.BoxGeometry(0.56, 0.36, 0.02), basic(0x14283a), 0, 0, 0.26, head, 0);
  const eyeM = basic(0x5ef2e0);
  for (const s of [-1, 1]) mk(new THREE.BoxGeometry(0.1, 0.14, 0.02), eyeM, 0.14 * s, 0.03, 0.28, head, 0);
  mk(new THREE.TorusGeometry(0.07, 0.015, 6, 10, Math.PI), eyeM, 0, -0.08, 0.28, head, 0).rotation.z = Math.PI;
  mk(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 6), grey, 0, 0.42, 0, head, 0);
  const bulb = mk(new THREE.SphereGeometry(0.08, 10, 8), basic(0xff5ab4), 0, 0.62, 0, head, 1.1);
  return { root, r, body, head, arms, legs, screen, bulb, eyeM };
}
// ---------- MECHA-MIAUW: Kayo & Yara's giant robot cat, with the two of them in a glass dome on top ----------
export function buildMecha() {
  const root = new THREE.Group();
  const r = new THREE.Group(); r.scale.setScalar(1.5); root.add(r);
  const metal = toon(0x6a6e84), dark = toon(0x3a3640), pink = toon(0xff5ab4);
  const legs = [[-0.6, 0.5], [0.6, 0.5], [-0.6, -0.5], [0.6, -0.5]].map(([x, z]) => { const p = new THREE.Group(); p.position.set(x, 1.0, z); r.add(p); mk(new THREE.CylinderGeometry(0.18, 0.24, 1.0, 8), dark, 0, -0.5, 0, p, 1.06); mk(new THREE.BoxGeometry(0.4, 0.15, 0.5), metal, 0, -1.0, 0.05, p, 1.06); return p; });
  const body = new THREE.Group(); r.add(body);
  mk(new THREE.BoxGeometry(1.6, 0.9, 1.8), metal, 0, 1.45, 0, body, 1.04);
  for (const s of [-1, 1]) mk(new THREE.BoxGeometry(0.06, 0.5, 1.4), pink, 0.82 * s, 1.45, 0, body, 0);
  const tail = mk(new THREE.CylinderGeometry(0.08, 0.08, 1.4, 6), dark, 0, 2.0, -1.1, body, 1.08); tail.rotation.x = -0.6;
  const head = new THREE.Group(); head.position.set(0, 1.9, 1.0); body.add(head);
  mk(new THREE.BoxGeometry(1.1, 0.8, 0.8), metal, 0, 0, 0, head, 1.04);
  for (const s of [-1, 1]) { const e = mk(new THREE.ConeGeometry(0.22, 0.5, 4), metal, 0.38 * s, 0.6, 0, head, 1.06); e.rotation.y = Math.PI / 4; }
  const eyeM = basic(0x7dff9a);
  for (const s of [-1, 1]) mk(new THREE.BoxGeometry(0.26, 0.1, 0.02), eyeM, 0.25 * s, 0.1, 0.41, head, 0);
  for (const s of [-1, 1]) for (let k = 0; k < 2; k++) mk(new THREE.BoxGeometry(0.4, 0.02, 0.02), dark, 0.45 * s, -0.12 - k * 0.08, 0.41, head, 0);   // whiskers
  const arms = [-1, 1].map((s) => { const p = new THREE.Group(); p.position.set(0.95 * s, 1.6, 0.4); body.add(p); mk(new THREE.CylinderGeometry(0.16, 0.16, 0.9, 10), dark, 0, 0, 0.3, p, 1.06).rotation.x = Math.PI / 2; mk(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 10), basic(0xff3a5a), 0, 0, 0.78, p, 0).rotation.x = Math.PI / 2; return p; });
  // the cockpit dome on the back with Kayo and Yara in it
  const cockpit = new THREE.Group(); cockpit.position.set(0, 1.95, -0.2); body.add(cockpit);
  mk(new THREE.CylinderGeometry(0.62, 0.66, 0.16, 18), dark, 0, 0, 0, cockpit, 1.06);
  for (const [x, c] of [[-0.22, 0x3a3640], [0.22, 0xd08a3a]]) { const cat = mk(new THREE.SphereGeometry(0.2, 12, 10), toon(c), x, 0.24, 0, cockpit, 1.06); for (const s of [-1, 1]) { const e = mk(new THREE.ConeGeometry(0.07, 0.14, 4), toon(c), 0.1 * s, 0.2, 0, cat, 0); void e; } }
  const domeM = basic(0x9fe8ff, { transparent: true, opacity: 0.35, depthWrite: false });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), domeM); dome.position.y = 0.06; cockpit.add(dome);
  return { root, r, body, head, arms, legs, cockpit, dome, domeM, eyeM, tail };
}
export function buildBattery() {
  const g = new THREE.Group();
  mk(new THREE.CylinderGeometry(0.22, 0.22, 0.6, 14), toon(0x2b2440), 0, 0, 0, g, 1.1);
  mk(new THREE.CylinderGeometry(0.225, 0.225, 0.3, 14), basic(0x7dff9a), 0, -0.1, 0, g, 0);
  mk(new THREE.CylinderGeometry(0.08, 0.08, 0.1, 10), toon(0x9aa0b8), 0, 0.35, 0, g, 0);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 10), basic(0x7dff9a, { transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending })); g.add(halo);
  g.scale.setScalar(1.2); return g;
}
export function buildFlag() {
  const g = new THREE.Group();
  mk(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 6), toon(0x9aa0b8), 0, 0.3, 0, g, 1.1);
  const f = toon(0x3a8ad8); f.side = THREE.DoubleSide;
  mk(new THREE.PlaneGeometry(0.6, 0.4), f, 0.3, 0.7, 0, g, 0);
  mk(new THREE.CircleGeometry(0.1, 5), basic(0xffd23a, { side: THREE.DoubleSide }), 0.3, 0.7, 0.01, g, 0);
  g.scale.setScalar(1.2); return g;
}

// ---------- Immanuel: a volcano kid who loves soccer. Brown skin, short black hair, an orange jersey with a 10, and his ball ----------
export function buildImmanuel() {
  const m = buildLocal({ s: 0.76, skin: 0x8a5a3a, shirt: 0xff7a2a, pants: 0x2b2440, hair: 0x1a1010, shoes: 0xfbf7ef });
  // a short fade instead of a full hair cap: a thin dark layer on top
  m.head.children.filter((c) => c.isMesh && c.geometry.type === 'SphereGeometry' && c.geometry.parameters.radius > 0.31).forEach((c) => c.scale.set(1, 0.7, 1));
  const num = textBoard('10', 0.32, 0.28, '#ff7a2a', '#fff8ec'); num.position.set(0, 1.18, -0.3); num.rotation.y = Math.PI; m.body.add(num);
  mk(new THREE.BoxGeometry(0.34, 0.12, 0.02), basic(0xfff8ec), 0, 1.28, 0.29, m.body, 0);   // a stripe on the front
  for (const s of [-1, 1]) mk(new THREE.CylinderGeometry(0.11, 0.1, 0.22, 10), toon(0xfff8ec), 0, -0.52, 0, m.legs[s < 0 ? 0 : 1], 0);   // soccer socks
  // the ball, at his feet; it lives on the root so it can bounce independently of his body
  const ball = new THREE.Group(); ball.position.set(0.1, 0.18, 0.35); m.root.add(ball);
  mk(new THREE.IcosahedronGeometry(0.17, 1), toon(0xfbf7ef), 0, 0, 0, ball, 1.08);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; mk(new THREE.CircleGeometry(0.05, 5), basic(0x2b2440, { side: THREE.DoubleSide }), Math.cos(a) * 0.16, Math.sin(a) * 0.16 * (i % 2 ? 1 : -1), Math.sin(a) * 0.04, ball, 0).lookAt(Math.cos(a) * 2, Math.sin(a) * 2 * (i % 2 ? 1 : -1), Math.sin(a) * 0.5); }
  m.ball = ball;
  return m;
}
// ---------- Niek: a boy who lives on the moon base, in a white moon suit with a glass helmet ----------
export function buildNiek() {
  const m = buildLocal({ s: 0.76, skin: 0xf0c8a0, shirt: 0xf4f1ea, pants: 0xf4f1ea, hair: 0xc89a5a, shoes: 0x9aa0b8 });
  mk(new THREE.BoxGeometry(0.3, 0.38, 0.2), toon(0xd8d8e8), 0, 1.15, -0.32, m.body, 1.06);   // an oxygen pack
  mk(new THREE.CircleGeometry(0.06, 12), basic(0x5ef2e0), 0.12, 1.25, 0.3, m.body, 0);
  mk(new THREE.BoxGeometry(0.1, 0.06, 0.02), basic(0xff5ab4), -0.1, 1.25, 0.3, m.body, 0);
  mk(new THREE.TorusGeometry(0.36, 0.05, 6, 20), toon(0x9aa0b8), 0, -0.22, 0, m.head, 1.06).rotation.x = Math.PI / 2;   // the helmet ring
  const glass = new THREE.Mesh(new THREE.SphereGeometry(0.44, 18, 14), basic(0x9fe8ff, { transparent: true, opacity: 0.22, depthWrite: false }));
  glass.position.y = 0.02; m.head.add(glass);
  return m;
}

// ---------- things the third locals lost ----------
export function buildTrinket(kind) {
  const g = new THREE.Group();
  if (kind === 'headphones') {
    const band = mk(new THREE.TorusGeometry(0.34, 0.06, 8, 20, Math.PI), toon(0x2b2440), 0, 0, 0, g, 1.1); void band;
    for (const s of [-1, 1]) { const cup = mk(new THREE.CylinderGeometry(0.17, 0.17, 0.14, 14), toon(0xff5ab4), 0.34 * s, -0.05, 0, g, 1.1); cup.rotation.z = Math.PI / 2; }
  } else if (kind === 'stopwatch') {
    const face = mk(new THREE.CylinderGeometry(0.32, 0.32, 0.12, 20), toon(0xd8dce8), 0, 0, 0, g, 1.1); face.rotation.x = Math.PI / 2;
    mk(new THREE.CylinderGeometry(0.26, 0.26, 0.13, 20), basic(0xfff8ec), 0, 0, 0.01, g, 0).rotation.x = Math.PI / 2;
    mk(new THREE.BoxGeometry(0.03, 0.2, 0.02), basic(0xff3d5a), 0, 0.08, 0.08, g, 0);
    mk(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 8), toon(0xd8dce8), 0, 0.38, 0, g, 1.1);
  } else if (kind === 'mitten') {
    const m = toon(0xff5a6e);
    mk(new THREE.CapsuleGeometry(0.2, 0.3, 4, 10), m, 0, 0, 0, g, 1.1);
    mk(new THREE.CapsuleGeometry(0.08, 0.14, 4, 8), m, 0.22, 0.05, 0, g, 1.1).rotation.z = -0.6;
    mk(new THREE.CylinderGeometry(0.22, 0.22, 0.12, 14), toon(0xfff8ec), 0, -0.32, 0, g, 1.1);
  } else if (kind === 'compass') {
    const c = mk(new THREE.CylinderGeometry(0.32, 0.32, 0.1, 20), toon(0xc8a060), 0, 0, 0, g, 1.1); c.rotation.x = Math.PI / 2;
    mk(new THREE.CylinderGeometry(0.26, 0.26, 0.11, 20), basic(0xfff8ec), 0, 0, 0.01, g, 0).rotation.x = Math.PI / 2;
    const n = mk(new THREE.ConeGeometry(0.06, 0.22, 4), basic(0xff3d5a), 0, 0.1, 0.07, g, 0); void n;
    mk(new THREE.ConeGeometry(0.06, 0.22, 4), basic(0x2b2440), 0, -0.1, 0.07, g, 0).rotation.z = Math.PI;
  } else if (kind === 'snorkel') {
    mk(new THREE.TorusGeometry(0.26, 0.06, 8, 18), toon(0xffd23a), 0, 0, 0, g, 1.1);
    mk(new THREE.CircleGeometry(0.22, 16), basic(0x9fe8ff, { transparent: true, opacity: 0.6 }), 0, 0, 0.02, g, 0);
    mk(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 8), toon(0x3a8ad8), 0.32, 0.3, 0, g, 1.1);
  } else if (kind === 'starfish') {
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; const arm = mk(new THREE.ConeGeometry(0.1, 0.4, 5), toon(0xff7a5a), Math.sin(a) * 0.18, Math.cos(a) * 0.18, 0, g, 1.1); arm.rotation.z = -a; }
    mk(new THREE.SphereGeometry(0.14, 10, 8), toon(0xff9a7a), 0, 0, 0, g, 1.1);
  } else if (kind === 'teddy') {
    const fur = toon(0xa86a3a);
    mk(new THREE.SphereGeometry(0.26, 12, 10), fur, 0, -0.1, 0, g, 1.1);
    mk(new THREE.SphereGeometry(0.2, 12, 10), fur, 0, 0.28, 0, g, 1.1);
    for (const s of [-1, 1]) mk(new THREE.SphereGeometry(0.08, 8, 6), fur, 0.15 * s, 0.44, 0, g, 1.1);
    mk(new THREE.SphereGeometry(0.07, 8, 6), toon(0xe8c8a0), 0, 0.25, 0.17, g, 0);
  } else if (kind === 'book') {
    mk(new THREE.BoxGeometry(0.5, 0.64, 0.14), toon(0x7a3aa8), 0, 0, 0, g, 1.1);
    mk(new THREE.BoxGeometry(0.44, 0.6, 0.15), basic(0xfff8ec), 0.04, 0, 0, g, 0);
    mk(new THREE.OctahedronGeometry(0.1), basic(0xffd23a), 0, 0.05, 0.08, g, 0);
  } else {   // a water bottle
    mk(new THREE.CylinderGeometry(0.17, 0.17, 0.6, 14), toon(0x3a8ad8), 0, 0, 0, g, 1.1);
    mk(new THREE.CylinderGeometry(0.1, 0.14, 0.12, 12), toon(0x3a8ad8), 0, 0.36, 0, g, 1.1);
    mk(new THREE.CylinderGeometry(0.11, 0.11, 0.1, 12), toon(0xfff8ec), 0, 0.46, 0, g, 1.1);
    mk(new THREE.BoxGeometry(0.36, 0.16, 0.02), basic(0xfff8ec), 0, 0, 0.17, g, 0);
  }
  return g;
}

// ---------- De Koraalzee ----------
// Sami: a little diver with a mask, a snorkel and flippers
export function buildSami() {
  const m = buildLocal({ s: 0.76, skin: 0x8a5a3a, shirt: 0x3a8ad8, pants: 0x2b2440, hair: 0x1a1010, hat: 'curls', shoes: 0xffd23a });
  mk(new THREE.TorusGeometry(0.2, 0.04, 6, 16), toon(0xffd23a), 0, 0.05, 0.24, m.head, 0).scale.set(1.3, 0.8, 1);
  mk(new THREE.CircleGeometry(0.17, 14), basic(0x9fe8ff, { transparent: true, opacity: 0.55 }), 0, 0.05, 0.27, m.head, 0).scale.set(1.3, 0.8, 1);
  mk(new THREE.CylinderGeometry(0.035, 0.035, 0.5, 6), toon(0xff5ab4), 0.28, 0.2, 0.1, m.head, 0);
  for (const l of m.legs) mk(new THREE.BoxGeometry(0.26, 0.04, 0.5), toon(0xffd23a), 0, -0.72, 0.16, l, 1.06);
  return m;
}
export function buildPearl() {
  const g = new THREE.Group();
  const sh = mk(new THREE.SphereGeometry(0.42, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon(0xff9ac8), 0, -0.1, 0, g, 1.1); sh.scale.set(1, 0.35, 1); sh.rotation.x = Math.PI;
  const lid = mk(new THREE.SphereGeometry(0.42, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon(0xffb8d8), 0, -0.05, -0.32, g, 1.1); lid.scale.set(1, 0.35, 1); lid.rotation.x = -1.1;
  mk(new THREE.SphereGeometry(0.17, 14, 10), basic(0xfff8ff), 0, 0.02, 0.05, g, 0);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 10), basic(0xfff0ff, { transparent: true, opacity: 0.2, depthWrite: false })); g.add(halo);
  return g;
}
// Kraak: a huge purple octopus with eight curling tentacles
export function buildOctopus() {
  const root = new THREE.Group();
  const r = new THREE.Group(); r.scale.setScalar(1.6); root.add(r);
  const skin = toon(0x8a3ab8), spot = toon(0xc87ad8);
  const head = new THREE.Group(); head.position.y = 1.5; r.add(head);
  mk(new THREE.SphereGeometry(0.9, 18, 14), skin, 0, 0.3, 0, head).scale.set(1, 1.2, 1);
  for (let i = 0; i < 6; i++) mk(new THREE.SphereGeometry(0.12, 8, 6), spot, Math.cos(i) * 0.6, 0.6 + (i % 3) * 0.25, Math.sin(i) * 0.6 - 0.2, head, 0);
  const eyeM = basic(0xffe14a);
  for (const s of [-1, 1]) { mk(new THREE.SphereGeometry(0.22, 12, 10), basic(0xfff8ec), 0.36 * s, 0.1, 0.72, head, 1.06); mk(new THREE.SphereGeometry(0.1, 8, 6), eyeM, 0.36 * s, 0.1, 0.9, head, 0); mk(new THREE.SphereGeometry(0.05, 6, 4), ink, 0.36 * s, 0.1, 0.98, head, 0); }
  mk(new THREE.BoxGeometry(0.5, 0.06, 0.04), ink, 0, 0.5, 0.86, head, 0).rotation.z = 0.1;   // a grumpy brow
  const tentacles = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2, t = new THREE.Group();
    t.position.set(Math.sin(a) * 0.55, 1.0, Math.cos(a) * 0.55); t.rotation.y = a; r.add(t);
    for (let k = 0; k < 5; k++) mk(new THREE.SphereGeometry(0.22 - k * 0.03, 10, 8), skin, 0, -0.2 - k * 0.12, 0.25 + k * 0.28, t, 1.05);
    tentacles.push(t);
  }
  return { root, r, head, tentacles, eyeM };
}

// ---------- Spookplaneet ----------
// Saar: a friendly little ghost with a pink bow
export function buildSaar() {
  const root = new THREE.Group(), r = new THREE.Group(); root.add(r); r.scale.setScalar(0.95);
  const sheet = basic(0xf8f4ff, { transparent: true, opacity: 0.92 });
  const body = new THREE.Group(); r.add(body);
  mk(new THREE.SphereGeometry(0.5, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), sheet, 0, 1.3, 0, body, 1.05);
  mk(new THREE.CylinderGeometry(0.5, 0.62, 0.9, 16, 1, true), sheet, 0, 0.85, 0, body, 0);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; mk(new THREE.SphereGeometry(0.14, 8, 6), sheet, Math.cos(a) * 0.55, 0.42, Math.sin(a) * 0.55, body, 0); }
  const head = new THREE.Group(); head.position.y = 1.3; body.add(head);
  for (const s of [-1, 1]) mk(new THREE.SphereGeometry(0.07, 8, 6), ink, 0.17 * s, 0.12, 0.46, head, 0).scale.y = 1.4;
  mk(new THREE.TorusGeometry(0.06, 0.02, 6, 12, Math.PI), ink, 0, -0.02, 0.48, head, 0).rotation.z = Math.PI;
  for (const s of [-1, 1]) mk(new THREE.SphereGeometry(0.06, 8, 6), toon(0xffa8c8), 0.28 * s, 0.0, 0.4, head, 0).scale.z = 0.4;
  for (const s of [-1, 1]) mk(new THREE.ConeGeometry(0.1, 0.18, 4), toon(0xff5ab4), 0.13 * s, 0.42, 0.18, head, 1.06).rotation.z = Math.PI / 2 * s;
  mk(new THREE.SphereGeometry(0.06, 8, 6), toon(0xff5ab4), 0, 0.42, 0.18, head, 1.06);
  const arms = [-1, 1].map((s) => { const p = new THREE.Group(); p.position.set(0.5 * s, 1.0, 0); body.add(p); mk(new THREE.SphereGeometry(0.13, 8, 6), sheet, 0.1 * s, -0.1, 0, p, 0).scale.set(1.4, 0.7, 0.8); return p; });
  return { root, r, body, head, arms };
}
export function buildCandle() {
  const g = new THREE.Group();
  mk(new THREE.CylinderGeometry(0.13, 0.14, 0.5, 12), toon(0xfff2d0), 0, 0, 0, g, 1.1);
  mk(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 14), toon(0xd8a040), 0, -0.26, 0, g, 1.1);
  const fl = mk(new THREE.SphereGeometry(0.08, 8, 6), basic(0x9fffd8), 0, 0.34, 0, g, 0); fl.scale.y = 1.8;
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 10), basic(0x9fffd8, { transparent: true, opacity: 0.2, depthWrite: false })); halo.position.y = 0.3; g.add(halo);
  return g;
}
// Koning Boe: a big ghost king with a crooked crown and long floaty arms
export function buildGhostKing() {
  const root = new THREE.Group(), r = new THREE.Group(); r.scale.setScalar(1.7); root.add(r);
  const sheetM = basic(0xe8e0ff, { transparent: true, opacity: 0.9 });
  const body = new THREE.Group(); r.add(body);
  mk(new THREE.SphereGeometry(0.7, 18, 14, 0, Math.PI * 2, 0, Math.PI / 2), sheetM, 0, 1.5, 0, body, 1.05);
  mk(new THREE.CylinderGeometry(0.7, 0.9, 1.2, 18, 1, true), sheetM, 0, 0.9, 0, body, 0);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; mk(new THREE.ConeGeometry(0.16, 0.4, 6), sheetM, Math.cos(a) * 0.8, 0.2, Math.sin(a) * 0.8, body, 0).rotation.x = Math.PI; }
  const eyeM = basic(0x7dffb0);
  for (const s of [-1, 1]) mk(new THREE.SphereGeometry(0.13, 10, 8), eyeM, 0.25 * s, 1.6, 0.6, body, 0).scale.y = 1.3;
  mk(new THREE.SphereGeometry(0.16, 10, 8), ink, 0, 1.3, 0.64, body, 0).scale.set(1.4, 0.8, 0.6);
  const crown = new THREE.Group(); crown.position.set(0, 2.15, 0); crown.rotation.z = 0.2; body.add(crown);
  mk(new THREE.CylinderGeometry(0.34, 0.38, 0.22, 10), toon(0xffd23a), 0, 0, 0, crown, 1.06);
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; mk(new THREE.ConeGeometry(0.08, 0.24, 4), toon(0xffd23a), Math.cos(a) * 0.3, 0.2, Math.sin(a) * 0.3, crown, 1.06); }
  mk(new THREE.OctahedronGeometry(0.08), basic(0xff5ab4), 0, 0.02, 0.38, crown, 0);
  const arms = [-1, 1].map((s) => { const p = new THREE.Group(); p.position.set(0.75 * s, 1.2, 0); body.add(p); mk(new THREE.CapsuleGeometry(0.14, 0.6, 4, 8), sheetM, 0.25 * s, -0.2, 0.1, p, 0).rotation.z = 0.9 * s; return p; });
  return { root, r, body, crown, arms, eyeM };
}
// De Gouden Werkplaats: a rolled-up blueprint with a gold band
export function buildBlueprint() {
  const g = new THREE.Group();
  const roll = mk(new THREE.CylinderGeometry(0.16, 0.16, 0.8, 14), toon(0x3a7ae0), 0, 0, 0, g, 1.1); roll.rotation.z = Math.PI / 2;
  for (const s of [-1, 1]) { const e = mk(new THREE.CylinderGeometry(0.17, 0.17, 0.04, 14), toon(0xe8f0ff), 0.41 * s, 0, 0, g, 0); e.rotation.z = Math.PI / 2; }
  const band = mk(new THREE.CylinderGeometry(0.175, 0.175, 0.1, 14), toon(0xffd23a), 0, 0, 0, g, 0); band.rotation.z = Math.PI / 2;
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 10), basic(0x9fd0ff, { transparent: true, opacity: 0.2, depthWrite: false })); g.add(halo);
  return g;
}
// a flat golden gear (decor and platform tops)
export function buildGear(r = 1, color = 0xffd23a, teeth = 10, thick = 0.3) {
  const g = new THREE.Group(), m = toon(color);
  mk(new THREE.CylinderGeometry(r * 0.82, r * 0.82, thick, 24), m, 0, 0, 0, g, 1.04);
  for (let i = 0; i < teeth; i++) { const a = (i / teeth) * Math.PI * 2; const t = mk(new THREE.BoxGeometry(r * 0.3, thick, r * 0.3), m, Math.cos(a) * r * 0.9, 0, Math.sin(a) * r * 0.9, g, 1.04); t.rotation.y = -a; }
  mk(new THREE.CylinderGeometry(r * 0.25, r * 0.25, thick * 1.2, 12), toon(0x8a6a2a), 0, 0, 0, g, 0);
  return g;
}
// Tandwieltron: a big boxy builder robot with a gear on its chest and a hatch on its head
export function buildCogTitan() {
  const root = new THREE.Group(), r = new THREE.Group(); r.scale.setScalar(1.5); root.add(r);
  const metal = toon(0xc8b070), dark = toon(0x5a4a3a), gold = toon(0xffd23a);
  const body = new THREE.Group(); r.add(body);
  for (const s of [-1, 1]) mk(new THREE.BoxGeometry(0.45, 0.8, 0.5), dark, 0.42 * s, 0.4, 0, body, 1.05);
  mk(new THREE.BoxGeometry(1.5, 1.2, 1.1), metal, 0, 1.4, 0, body, 1.04);
  const gear = buildGear(0.38, 0xffd23a, 8, 0.12); gear.rotation.x = Math.PI / 2; gear.position.set(0, 1.45, 0.58); body.add(gear);
  const head = new THREE.Group(); head.position.set(0, 2.25, 0); body.add(head);
  mk(new THREE.BoxGeometry(0.95, 0.6, 0.85), metal, 0, 0, 0, head, 1.05);
  const eyeM = basic(0xff8a1a);
  for (const s of [-1, 1]) mk(new THREE.BoxGeometry(0.22, 0.12, 0.05), eyeM, 0.22 * s, 0.05, 0.44, head, 0);
  mk(new THREE.BoxGeometry(0.5, 0.05, 0.04), ink, 0, -0.15, 0.44, head, 0);
  // the hatch on top: it pops open when he overheats, and that's the target
  const hatch = new THREE.Group(); hatch.position.set(0, 0.31, -0.3); head.add(hatch);
  mk(new THREE.BoxGeometry(0.7, 0.08, 0.6), gold, 0, 0, 0.3, hatch, 1.08);
  const core = mk(new THREE.SphereGeometry(0.2, 12, 10), basic(0xffe27a), 0, 0.3, 0, head, 0); core.visible = false;
  const arms = [-1, 1].map((s) => {
    const p = new THREE.Group(); p.position.set(0.9 * s, 1.75, 0); body.add(p);
    mk(new THREE.BoxGeometry(0.32, 0.9, 0.32), dark, 0, -0.45, 0, p, 1.05);
    mk(new THREE.BoxGeometry(0.45, 0.35, 0.45), gold, 0, -0.95, 0, p, 1.05);
    return p;
  });
  return { root, r, body, head, hatch, core, arms, gear, eyeM };
}
