import { THREE, G, V3, toon, basic, mk, ink, damp, puff, surf, orientOn, tangentTo, stepDir, anyPerp, label, rOf } from './core.js?v=20261111l';
import { sfx } from './audio.js?v=20261111l';
import { P, hurtPlayer, bouncePlayer, pfTest } from './player.js?v=20261111l';

// Enemies that walk on a planet's surface. You beat them like in Otis in Orbit: jump on top.
// Armoured ones (Kristalkevers) need two stomps or one ground pound. A spin (F) knocks most of them out too.
function eyesOn(g, y, z, gap, r, mat = basic(0xffffff)) {
  for (const s of [-1, 1]) {
    const e = mk(new THREE.SphereGeometry(r, 10, 8), mat, gap * s, y, z, g, 0);
    mk(new THREE.SphereGeometry(r * 0.5, 8, 6), ink, 0, 0, r * 0.6, e, 0);
  }
}
function buildBeatbug() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const b = mk(new THREE.SphereGeometry(0.5, 16, 12), toon(0x9a4aff), 0, 0.5, 0, body); b.scale.set(1, 0.85, 1);
  eyesOn(body, 0.62, 0.38, 0.17, 0.12);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.05, 6, 20, Math.PI), toon(0x2b2440)); band.position.y = 0.6; band.rotation.z = 0; body.add(band);
  for (const s of [-1, 1]) mk(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 12), toon(0x5ef2e0), 0.5 * s, 0.6, 0, body, 1.1).rotation.z = Math.PI / 2;
  for (const s of [-1, 1]) mk(new THREE.SphereGeometry(0.12, 8, 6), toon(0x2b2440), 0.22 * s, 0.08, 0.1, body, 0);
  return { g, body, size: 1 };
}
function buildKever() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const shell = mk(new THREE.SphereGeometry(0.55, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), toon(0x3a2e46), 0, 0.2, 0, body); shell.scale.set(1, 0.9, 1.2);
  mk(new THREE.CylinderGeometry(0.56, 0.56, 0.2, 16), toon(0x2b2440), 0, 0.2, 0, body, 0).scale.z = 1.2;
  const head = mk(new THREE.SphereGeometry(0.25, 12, 10), toon(0x2b2440), 0, 0.3, 0.6, body);
  eyesOn(head, 0.08, 0.17, 0.1, 0.07, basic(0xff5ad8));
  const crystals = new THREE.Group(); body.add(crystals);
  for (let i = 0; i < 4; i++) { const cr = mk(new THREE.OctahedronGeometry(0.22), toon(i % 2 ? 0x5ef2e0 : 0xff7ad8), -0.3 + i * 0.2, 0.75, -0.05 + (i % 2) * 0.1, crystals, 1.1); cr.scale.y = 1.8; cr.rotation.z = (i - 1.5) * 0.25; }
  for (let i = 0; i < 6; i++) { const l = mk(new THREE.CylinderGeometry(0.03, 0.03, 0.4), toon(0x2b2440), (i % 3 - 1) * 0.35, 0.1, (i < 3 ? 1 : -1) * 0.45, body, 0); l.rotation.x = (i < 3 ? 1 : -1) * 0.8; }
  return { g, body, crystals, size: 1.05 };
}
function buildKattenbot(gold) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const metal = toon(gold ? 0xffc23d : 0xa8b0c4), dark = toon(0x3a3640);
  const torso = mk(new THREE.BoxGeometry(0.6, 0.45, 0.8), metal, 0, 0.45, 0, body); void torso;
  const head = new THREE.Group(); head.position.set(0, 0.85, 0.35); body.add(head);
  mk(new THREE.BoxGeometry(0.5, 0.42, 0.42), metal, 0, 0, 0, head);
  for (const s of [-1, 1]) { const e = mk(new THREE.ConeGeometry(0.1, 0.24, 4), metal, 0.16 * s, 0.3, 0, head); e.rotation.y = Math.PI / 4; }
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.02), basic(gold ? 0xff3a3a : 0x7dff9a)); visor.position.set(0, 0.04, 0.22); head.add(visor);
  for (const [x, z] of [[-0.22, 0.28], [0.22, 0.28], [-0.22, -0.28], [0.22, -0.28]]) mk(new THREE.CylinderGeometry(0.07, 0.07, 0.3), dark, x, 0.12, z, body, 0);
  const tail = mk(new THREE.CylinderGeometry(0.04, 0.04, 0.6), dark, 0, 0.75, -0.5, body, 0); tail.rotation.x = -0.7;
  let ball = null;
  if (gold) { ball = new THREE.Group(); ball.position.set(0, 1.35, 0.35); body.add(ball); }
  return { g, body, head, tail, ball, size: 1 };
}
function buildDrone() {   // Miauwtron's speaker drones
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  mk(new THREE.BoxGeometry(0.7, 0.7, 0.5), toon(0x2b2440), 0, 0, 0, body);
  mk(new THREE.CylinderGeometry(0.24, 0.3, 0.06, 16), toon(0xff3d7f), 0, 0, 0.27, body, 0).rotation.x = Math.PI / 2;
  for (const s of [-1, 1]) { const e = mk(new THREE.ConeGeometry(0.12, 0.25, 4), toon(0x2b2440), 0.22 * s, 0.45, 0, body); e.rotation.y = Math.PI / 4; }
  const prop = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.03, 0.12), toon(0x5ef2e0)); prop.position.y = 0.55; body.add(prop);
  return { g, body, prop, size: 0.9 };
}

// Planeta Phonk: a little speaker that hops at you on the beat
function buildBassbol() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const b = mk(new THREE.SphereGeometry(0.5, 16, 12), toon(0x2b2440), 0, 0.5, 0, body); void b;
  const cone = mk(new THREE.CylinderGeometry(0.32, 0.38, 0.1, 18), toon(0xff5ab4), 0, 0.5, 0.45, body, 0); cone.rotation.x = Math.PI / 2;
  mk(new THREE.CylinderGeometry(0.12, 0.12, 0.12, 12), toon(0x5ef2e0), 0, 0.5, 0.5, body, 0).rotation.x = Math.PI / 2;
  eyesOn(body, 0.9, 0.3, 0.15, 0.1);
  for (const s of [-1, 1]) mk(new THREE.BoxGeometry(0.18, 0.1, 0.26), toon(0xffd23a), 0.2 * s, 0.05, 0.05, body, 0);
  return { g, body, size: 1 };
}
// De Diepe Mijn: a cave bat that circles high and dives at you
function buildBat() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  mk(new THREE.SphereGeometry(0.3, 14, 10), toon(0x5a3a7a), 0, 0.3, 0, body);
  for (const s of [-1, 1]) { const e = mk(new THREE.ConeGeometry(0.08, 0.22, 4), toon(0x5a3a7a), 0.14 * s, 0.6, 0, body); e.rotation.z = -0.2 * s; }
  eyesOn(body, 0.36, 0.24, 0.1, 0.07, basic(0x5ef2e0));
  const wings = [-1, 1].map((s) => {
    const p = new THREE.Group(); p.position.set(0.25 * s, 0.35, 0); body.add(p);
    const w = mk(new THREE.BoxGeometry(0.6, 0.04, 0.34), toon(0x3a2650), 0.3 * s, 0, 0, p, 1.15); void w;
    return p;
  });
  return { g, body, wings, size: 0.8 };
}
// Homerun Heuvel: a giant runaway baseball. It aims, then rolls in a straight line: sidestep, then stomp it while it's dizzy
function buildRoller() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const ball = new THREE.Group(); ball.position.y = 0.65; body.add(ball);
  mk(new THREE.SphereGeometry(0.65, 18, 14), toon(0xfff8ec), 0, 0, 0, ball, 1.05);
  for (const s of [-1, 1]) { const st = mk(new THREE.TorusGeometry(0.5, 0.03, 6, 24), toon(0xe03a3a), 0.33 * s, 0, 0, ball, 0); st.rotation.y = Math.PI / 2; }
  const face = new THREE.Group(); face.position.set(0, 0.8, 0.5); body.add(face);
  eyesOn(face, 0, 0, 0.16, 0.11);
  mk(new THREE.BoxGeometry(0.34, 0.06, 0.04), toon(0x2b2440), 0, 0.17, 0.02, face, 0).rotation.z = 0.15;   // angry brow
  return { g, body, ball, size: 1.3 };
}
// Hertogdom IJs: a grumpy ice penguin that aims, then belly-slides at you in a straight line
function buildSlider() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const tilt = new THREE.Group(); tilt.position.y = 0.05; body.add(tilt);
  const b = mk(new THREE.SphereGeometry(0.42, 16, 12), toon(0x2a3a6a), 0, 0.5, 0, tilt); b.scale.set(1, 1.25, 0.95);
  const belly = mk(new THREE.SphereGeometry(0.34, 14, 10), toon(0xe8f8ff), 0, 0.46, 0.16, tilt, 0); belly.scale.set(0.9, 1.2, 0.7);
  eyesOn(tilt, 0.8, 0.3, 0.12, 0.08, basic(0x9fe8ff));
  mk(new THREE.BoxGeometry(0.3, 0.05, 0.04), toon(0x14142a), 0, 0.92, 0.36, tilt, 0).rotation.z = -0.12;   // grumpy brow
  mk(new THREE.ConeGeometry(0.07, 0.2, 8), toon(0xffa23a), 0, 0.7, 0.42, tilt, 1.1).rotation.x = Math.PI / 2;
  for (const s of [-1, 1]) { const f = mk(new THREE.SphereGeometry(0.12, 8, 6), toon(0x2a3a6a), 0.4 * s, 0.5, 0, tilt); f.scale.set(0.4, 1.4, 0.8); }
  for (let i = 0; i < 3; i++) mk(new THREE.OctahedronGeometry(0.07), basic(0x9fe8ff), -0.1 + i * 0.1, 1.1, -0.02, tilt, 0).scale.y = 2;   // a tiny ice crown: Deniz' guard
  return { g, body, tilt, ball: new THREE.Group(), size: 1.05 };
}
// Smaragdeiland: a mossy boulder full of bad luck. It aims, then rolls straight at you
function buildBoulder() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const ball = new THREE.Group(); ball.position.y = 0.7; body.add(ball);
  mk(new THREE.IcosahedronGeometry(0.7, 1), toon(0x8a8a7a), 0, 0, 0, ball, 1.05);
  for (let i = 0; i < 4; i++) mk(new THREE.SphereGeometry(0.22, 8, 6), toon(0x4aa84a), Math.sin(i * 1.7) * 0.55, Math.cos(i * 2.3) * 0.4, Math.cos(i * 1.7) * 0.4, ball, 0);   // moss
  const face = new THREE.Group(); face.position.set(0, 0.85, 0.6); body.add(face);
  eyesOn(face, 0, 0, 0.17, 0.11);
  mk(new THREE.BoxGeometry(0.36, 0.06, 0.04), toon(0x2b2440), 0, 0.17, 0.02, face, 0).rotation.z = 0.15;
  return { g, body, ball, size: 1.4 };
}
// Smaragdeiland: a little rock gnome with a red pointy hat that steals clover
function buildGnome() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const b = mk(new THREE.DodecahedronGeometry(0.38), toon(0x9a9a8a), 0, 0.4, 0, body); b.scale.set(1, 1.1, 0.9);
  eyesOn(body, 0.5, 0.3, 0.12, 0.08);
  const beard = mk(new THREE.ConeGeometry(0.2, 0.3, 8), toon(0xf4f1ea), 0, 0.3, 0.26, body, 0); beard.rotation.x = Math.PI + 0.3;
  mk(new THREE.ConeGeometry(0.28, 0.6, 10), toon(0xe03a3a), 0, 0.95, 0, body, 1.08).rotation.z = 0.15;
  for (const s of [-1, 1]) mk(new THREE.SphereGeometry(0.1, 8, 6), toon(0x5a3a20), 0.16 * s, 0.05, 0.05, body, 0);
  mk(new THREE.SphereGeometry(0.07, 8, 6), toon(0x5cd85a), 0.32, 0.45, 0.1, body, 0);   // a stolen clover
  return { g, body, size: 0.95 };
}
// Hertogdom IJs: a frost bat, faster and paler than the cave bats
function buildIceBat() {
  const m = buildBat();
  m.body.traverse((o) => { if (o.material && o.material.color && o.material !== ink && o.material.type === 'MeshToonMaterial') o.material = toon(o.material.color.getHex() === 0x3a2650 ? 0x9fd8ff : 0xd8f4ff); });
  return m;
}

// Het Oerwoud: a green jungle snake that slithers after you
function buildSnake() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const segs = [];
  for (let i = 0; i < 6; i++) { const s = mk(new THREE.SphereGeometry(0.24 - i * 0.025, 12, 10), toon(i % 2 ? 0x2a8a3a : 0x5cc84a), 0, 0.22, -i * 0.3, body, 1.06); segs.push(s); }
  const head = mk(new THREE.SphereGeometry(0.3, 14, 10), toon(0x5cc84a), 0, 0.3, 0.3, body, 1.06); head.scale.set(1.1, 0.8, 1.2);
  eyesOn(head, 0.14, 0.18, 0.12, 0.08, basic(0xffe14a));
  mk(new THREE.BoxGeometry(0.03, 0.02, 0.2), toon(0xe03a3a), 0, -0.04, 0.42, head, 0);   // forked tongue
  return { g, body, segs, size: 0.9 };
}
// Het Oerwoud: a coconut with an angry face. It aims, then rolls straight at you
function buildCocoRoller() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const ball = new THREE.Group(); ball.position.y = 0.6; body.add(ball);
  mk(new THREE.SphereGeometry(0.6, 14, 12), toon(0x6a4020), 0, 0, 0, ball, 1.05);
  for (let i = 0; i < 6; i++) mk(new THREE.BoxGeometry(0.04, 0.5, 0.04), toon(0x8a5a34), Math.sin(i) * 0.58, Math.cos(i * 2) * 0.1, Math.cos(i) * 0.58, ball, 0);   // hairy bits
  const face = new THREE.Group(); face.position.set(0, 0.75, 0.52); body.add(face);
  eyesOn(face, 0, 0, 0.16, 0.1);
  mk(new THREE.BoxGeometry(0.34, 0.06, 0.04), toon(0x2b2440), 0, 0.16, 0.02, face, 0).rotation.z = 0.15;
  return { g, body, ball, size: 1.2 };
}

// De Asberg: a slow magma slug with a glowing back
function buildSlug() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const b = mk(new THREE.CapsuleGeometry(0.3, 0.7, 6, 10), toon(0x3a2a30), 0, 0.3, 0, body); b.rotation.x = Math.PI / 2;
  for (let i = 0; i < 4; i++) mk(new THREE.SphereGeometry(0.14, 8, 6), basic(0xff7a2a), 0, 0.55, -0.35 + i * 0.22, body, 0);
  for (const s of [-1, 1]) { const st = mk(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 6), toon(0x3a2a30), 0.12 * s, 0.6, 0.55, body, 0); st.rotation.x = 0.4; mk(new THREE.SphereGeometry(0.07, 8, 6), basic(0xffe14a), 0.12 * s, 0.76, 0.62, body, 0); }
  return { g, body, size: 0.9 };
}
// De Asberg: a bat made of embers
function buildFireBat() {
  const m = buildBat();
  m.body.traverse((o) => { if (o.material && o.material.color && o.material !== ink && o.material.type === 'MeshToonMaterial') o.material = toon(o.material.color.getHex() === 0x3a2650 ? 0xff7a2a : 0x7a1a1a); });
  return m;
}
// Duinenrijk: a desert scorpion with a curled tail
function buildScorpion() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const shell = toon(0x8a3a2a);
  mk(new THREE.SphereGeometry(0.36, 12, 10), shell, 0, 0.3, 0, body).scale.set(1, 0.5, 1.3);
  eyesOn(body, 0.42, 0.38, 0.1, 0.06, basic(0xffe14a));
  for (const s of [-1, 1]) { mk(new THREE.SphereGeometry(0.12, 8, 6), shell, 0.32 * s, 0.3, 0.55, body, 1.06).scale.set(1, 0.6, 1.4); for (let k = 0; k < 3; k++) { const l = mk(new THREE.CylinderGeometry(0.03, 0.03, 0.4), toon(0x5a2a1a), 0.38 * s, 0.15, -0.2 + k * 0.2, body, 0); l.rotation.z = 0.9 * s; } }
  const tail = new THREE.Group(); tail.position.set(0, 0.35, -0.4); body.add(tail);
  for (let i = 0; i < 5; i++) { const a = i * 0.55; mk(new THREE.SphereGeometry(0.1, 8, 6), shell, 0, Math.sin(a) * 0.45, -Math.cos(a) * 0.3 + 0.1 * i * 0, tail, 0).position.set(0, Math.sin(a) * 0.5, -(1 - Math.cos(a)) * 0.1 - 0.1); }
  mk(new THREE.ConeGeometry(0.07, 0.2, 6), toon(0xffd23a), 0, 0.62, 0.15, tail, 0).rotation.x = 2.2;
  return { g, body, tail, size: 0.9 };
}
// Duinenrijk: a tumbleweed. It aims, then rolls straight at you
function buildTumble() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const ball = new THREE.Group(); ball.position.y = 0.6; body.add(ball);
  for (let i = 0; i < 3; i++) { const t = mk(new THREE.TorusGeometry(0.55, 0.05, 5, 16), toon(0xa8804a), 0, 0, 0, ball, 0); t.rotation.set(i * 1.05, i * 0.7, 0); }
  mk(new THREE.IcosahedronGeometry(0.45, 0), toon(0x8a6a3a), 0, 0, 0, ball, 1.06);
  const face = new THREE.Group(); face.position.set(0, 0.7, 0.5); body.add(face);
  eyesOn(face, 0, 0, 0.15, 0.1);
  return { g, body, ball, size: 1.1 };
}
// Maankrater: a little moon mite that hops at you (very high, it's the moon)
function buildMite() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  mk(new THREE.SphereGeometry(0.42, 14, 10), toon(0xb8b0d8), 0, 0.45, 0, body).scale.y = 0.85;
  eyesOn(body, 0.6, 0.3, 0.13, 0.11, basic(0xff5ab4));
  for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + 0.78; const l = mk(new THREE.CylinderGeometry(0.04, 0.03, 0.4), toon(0x6a6488), Math.cos(a) * 0.35, 0.12, Math.sin(a) * 0.35, body, 0); l.rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6); }
  mk(new THREE.CylinderGeometry(0.02, 0.02, 0.3), toon(0x6a6488), 0, 0.95, 0, body, 0); mk(new THREE.SphereGeometry(0.06, 8, 6), basic(0x7dff9a), 0, 1.12, 0, body, 0);
  return { g, body, size: 0.95 };
}

// De Koraalzee: a jellyfish that bobs, then hops at you like a Bassbol
function buildJelly() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const dome = mk(new THREE.SphereGeometry(0.45, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), basic(0xff9ad8, { transparent: true, opacity: 0.8 }), 0, 0.55, 0, body, 1.06); void dome;
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; mk(new THREE.CylinderGeometry(0.03, 0.02, 0.5, 5), basic(0xffc8ec), Math.cos(a) * 0.28, 0.3, Math.sin(a) * 0.28, body, 0); }
  eyesOn(body, 0.75, 0.32, 0.12, 0.08);
  return { g, body, size: 0.95 };
}
// De Gouden Werkplaats: a little gear on its edge with angry eyes, rolling after you
function buildCog() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const wheel = new THREE.Group(); wheel.position.y = 0.5; body.add(wheel);
  mk(new THREE.CylinderGeometry(0.42, 0.42, 0.26, 18), toon(0xd8b040), 0, 0, 0, wheel, 1.06).rotation.x = Math.PI / 2;
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const t = mk(new THREE.BoxGeometry(0.14, 0.14, 0.26), toon(0xd8b040), Math.cos(a) * 0.48, Math.sin(a) * 0.48, 0, wheel, 1.06); t.rotation.z = a; }
  eyesOn(body, 0.62, 0.15, 0.1, 0.07);
  return { g, body, size: 0.9 };
}
// De Koraalzee: a red crab that scuttles after you
function buildCrab() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const shell = toon(0xe03a3a);
  mk(new THREE.SphereGeometry(0.4, 14, 10), shell, 0, 0.3, 0, body).scale.set(1.3, 0.55, 1);
  eyesOn(body, 0.5, 0.36, 0.12, 0.08);
  for (const s of [-1, 1]) {
    mk(new THREE.SphereGeometry(0.16, 10, 8), shell, 0.5 * s, 0.38, 0.32, body, 1.06).scale.set(1, 0.7, 1.2);
    for (let k = 0; k < 3; k++) { const l = mk(new THREE.CylinderGeometry(0.03, 0.03, 0.36), toon(0xa82a2a), 0.42 * s, 0.14, -0.2 + k * 0.18, body, 0); l.rotation.z = 0.9 * s; }
  }
  return { g, body, size: 0.9 };
}
// Spookplaneet: a little sheet ghost that floats high and swoops at you (a bat in a bedsheet)
function buildGhost() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const sheet = basic(0xf4f1ff, { transparent: true, opacity: 0.88 });
  mk(new THREE.SphereGeometry(0.34, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), sheet, 0, 0.45, 0, body, 1.06);
  mk(new THREE.CylinderGeometry(0.34, 0.42, 0.45, 14, 1, true), sheet, 0, 0.22, 0, body, 0);
  for (const s of [-1, 1]) mk(new THREE.SphereGeometry(0.06, 8, 6), ink, 0.12 * s, 0.5, 0.3, body, 0);
  mk(new THREE.SphereGeometry(0.07, 8, 6), ink, 0, 0.34, 0.32, body, 0).scale.y = 1.4;
  const wings = [-1, 1].map((s) => { const p = new THREE.Group(); p.position.set(0.3 * s, 0.35, 0); body.add(p); mk(new THREE.SphereGeometry(0.1, 8, 6), sheet, 0.12 * s, 0, 0, p, 0).scale.set(1.6, 0.6, 0.8); return p; });
  return { g, body, wings, size: 0.8 };
}
// Spookplaneet: a grinning pumpkin. It aims, then rolls straight at you
function buildPumpkin() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const ball = new THREE.Group(); ball.position.y = 0.6; body.add(ball);
  for (let i = 0; i < 6; i++) { const s = mk(new THREE.SphereGeometry(0.4, 12, 10), toon(i % 2 ? 0xff8a1a : 0xe86a0a), 0, 0, 0, ball, i ? 0 : 1.05); s.scale.set(0.55, 1, 1); s.rotation.y = (i / 6) * Math.PI; }
  mk(new THREE.CylinderGeometry(0.06, 0.08, 0.22, 6), toon(0x3a6a2a), 0, 0.5, 0, ball, 0);
  const face = new THREE.Group(); face.position.set(0, 0.7, 0.55); body.add(face);
  for (const s of [-1, 1]) mk(new THREE.ConeGeometry(0.08, 0.12, 3), basic(0xffe14a), 0.14 * s, 0.06, 0, face, 0).rotation.x = Math.PI / 2;
  mk(new THREE.BoxGeometry(0.3, 0.06, 0.03), basic(0xffe14a), 0, -0.1, 0, face, 0);
  return { g, body, ball, size: 1.1 };
}
export class Enemy {
  constructor(world, planet, dir, type, opts = {}) {
    this.w = world; this.p = planet; this.type = type;
    this.dir = dir.clone().normalize(); this.home = this.dir.clone();
    this.fwd = anyPerp(this.dir).applyAxisAngle(this.dir, Math.random() * 6.28);
    this.state = 'wander'; this.t = Math.random() * 3; this.st = 0; this.alt = opts.alt || 0;
    this.roam = opts.roam || 0.16; this.dead = false; this.armor = type === 'kever' ? 1 : 0;
    this.onDie = opts.onDie; this.drops = opts.drops ?? 2; this.fly = type === 'drone';
    const m = type === 'beatbug' ? buildBeatbug() : type === 'kever' ? buildKever() : type === 'drone' ? buildDrone() : type === 'bassbol' ? buildBassbol() : type === 'bat' ? buildBat() : type === 'roller' ? buildRoller() : type === 'slider' ? buildSlider() : type === 'icebat' ? buildIceBat() : type === 'boulder' ? buildBoulder() : type === 'gnome' ? buildGnome() : type === 'snake' ? buildSnake() : type === 'coco' ? buildCocoRoller() : type === 'slug' ? buildSlug() : type === 'firebat' ? buildFireBat() : type === 'scorpion' ? buildScorpion() : type === 'tumble' ? buildTumble() : type === 'mite' ? buildMite() : type === 'jelly' ? buildJelly() : type === 'crab' ? buildCrab() : type === 'ghost' ? buildGhost() : type === 'pumpkin' ? buildPumpkin() : type === 'cog' ? buildCog() : buildKattenbot(type === 'goldbot');
    if (type === 'bat' || type === 'icebat' || type === 'firebat' || type === 'ghost') this.alt = 2.6;
    this.m = m; this.size = m.size;
    this.speed = { beatbug: 1.6, kever: 1.4, kattenbot: 2.2, goldbot: 2.6, drone: 4.2, bassbol: 1.4, bat: 2.4, roller: 1.2, slider: 1.3, icebat: 2.8, boulder: 1.1, gnome: 2.0, snake: 1.8, coco: 1.2, slug: 1.0, firebat: 2.6, scorpion: 2.0, tumble: 1.4, mite: 1.4, jelly: 1.3, crab: 2.0, ghost: 2.2, pumpkin: 1.3, cog: 2.2 }[type];
    this.chase = { beatbug: 3.4, kever: 9.5, kattenbot: 4.6, goldbot: 6.0, drone: 4.2, bassbol: 5.2, bat: 5.0, roller: 11, slider: 10, icebat: 5.8, boulder: 10.5, gnome: 4.4, snake: 4.8, coco: 10.5, slug: 2.6, firebat: 5.4, scorpion: 5.0, tumble: 11, mite: 4.6, jelly: 5.0, crab: 4.8, ghost: 5.2, pumpkin: 10.5, cog: 6.2 }[type];
    if (opts.speedMul) { this.speed *= opts.speedMul; this.chase *= opts.speedMul; }
    this.bang = label('!', 0.9, m.g); this.bang.position.y = 1.8; this.bang.visible = false;
    world.group.add(m.g);
    this.place();
  }
  place() {
    this.m.g.position.copy(surf(this.p, this.dir, this.alt));
    orientOn(this.m.g, this.dir, this.fwd);
  }
  steer(goal, k, dt) {
    const a = Math.atan2(new THREE.Vector3().crossVectors(this.fwd, goal).dot(this.dir), this.fwd.dot(goal));
    this.fwd.applyAxisAngle(this.dir, a * damp(k, dt));
  }
  walk(speed, dt) {
    stepDir(this.dir, this.fwd, speed * dt, this.p.r);
    this.fwd.addScaledVector(this.dir, -this.fwd.dot(this.dir)).normalize();
    this.collide();
  }
  // trees, houses, rocks and platforms standing on the ground are walls for enemies too:
  // push them back out and let them slide along it, instead of walking straight through
  collide() {
    const R = this.size * 0.55, top = this.alt + this.size, Rg = rOf(this.p, this.dir);
    for (const pf of this.p.platforms) {
      if (pf.h <= this.alt + 0.25 || pf.b >= top) continue;   // under their feet, over their head, or switched off
      const hit = pfTest(pf, this.dir, this.alt, Rg, R);
      if (!hit) continue;
      this.dir.addScaledVector(hit.dir, hit.amt / (this.p.r + this.alt)).normalize();
      const into = this.fwd.dot(hit.dir);
      if (into < 0) this.fwd.addScaledVector(hit.dir, -into);
      this.fwd.addScaledVector(this.dir, -this.fwd.dot(this.dir));
      if (this.fwd.lengthSq() < 1e-6) this.fwd.copy(hit.dir).addScaledVector(this.dir, -hit.dir.dot(this.dir));
      this.fwd.normalize();
    }
  }
  update(dt, t) {
    if (this.dead) return;
    this.t += dt; this.st += dt;
    const onMine = P.planet === this.p;
    if (this.dizzy > 0) {   // knocked silly by a spin: frozen and harmless, stomp it or spin again to finish it
      this.dizzy -= dt;
      const b = this.m.body;
      if (b) b.rotation.z = this.dizzy > 0 ? Math.sin(this.t * 14) * 0.3 : 0;
      if (Math.random() < dt * 6) puff(surf(this.p, this.dir, this.alt + this.size + 0.2), 1, 0xffe14a, 1.2, 0.4, this.dir);
      this.place();
      if (onMine && !G.cutscene) this.touch();
      return;
    }
    const awayHome = Math.acos(Math.max(-1, Math.min(1, this.dir.dot(this.home))));
    const ty = this.type;
    // while you're talking (and a moment after), enemies can't see you: they calm down and back off a bit
    if (G.cutscene || G.calmT > 0) {
      if (this.state !== 'wander') { this.state = 'wander'; this.st = 0; if (this.m.body) this.m.body.rotation.z = 0; }
      this.near = false;
      if (this.bang) this.bang.visible = false;
      const real = onMine ? Math.acos(Math.max(-1, Math.min(1, this.dir.dot(P.up)))) * this.p.r : 99;
      if (real < 6 && ty !== 'drone') { this.steer(tangentTo(this.dir, P.up).negate(), 5, dt); this.walk(this.speed, dt); }
      else if (awayHome > this.roam) { this.steer(tangentTo(this.dir, this.home), 3, dt); this.walk(this.speed, dt); }
      if (ty.includes('bat') || ty === 'ghost') this.alt += (2.6 - this.alt) * damp(2, dt);
      else if (this.alt > 0 && ty !== 'drone') this.alt = Math.max(0, this.alt - dt * 4);
      this.place();
      return;
    }
    const pdir = onMine ? P.up : null;
    const dist = onMine ? Math.acos(Math.max(-1, Math.min(1, this.dir.dot(pdir)))) * this.p.r : 99;
    if (ty === 'kever') {
      if (this.state === 'wander') {
        if (awayHome > this.roam) this.steer(tangentTo(this.dir, this.home), 3, dt);
        else if (Math.random() < dt * 0.5) this.fwd.applyAxisAngle(this.dir, (Math.random() - 0.5) * 2);
        this.walk(this.speed, dt);
        if (dist < 8.5 && !P.dead) { this.state = 'alert'; this.st = 0; this.bang.visible = true; sfx.warn(); }
      } else if (this.state === 'alert') {
        this.steer(tangentTo(this.dir, pdir || this.home), 10, dt);
        this.m.body.position.y = Math.abs(Math.sin(this.st * 30)) * 0.05;
        if (this.st > 0.6) { this.state = 'charge'; this.st = 0; this.bang.visible = false; }
      } else if (this.state === 'charge') {
        this.walk(this.chase, dt);
        if (Math.random() < dt * 20) puff(surf(this.p, this.dir, 0.1), 1, 0xd8b890, 1.5, 0.3, this.dir);
        if (this.st > 1.1) { this.state = 'tired'; this.st = 0; }
      } else if (this.state === 'tired') {
        this.m.body.rotation.z = Math.sin(this.st * 8) * 0.08;
        if (this.st > 1.3) { this.state = 'wander'; this.st = 0; this.m.body.rotation.z = 0; }
      }
    } else if (ty === 'bassbol' || ty === 'mite' || ty === 'jelly') {
      // waits, pulsing to the beat, then hops: at you if you're close, anywhere if not
      if (this.state !== 'hop') {
        const k = (this.t * 2.33) % 1; this.m.body.scale.setScalar(1 + Math.max(0, 0.15 - k));
        if (awayHome > this.roam) this.steer(tangentTo(this.dir, this.home), 3, dt);
        if (this.st > 1.5) {
          this.state = 'hop'; this.st = 0; this.near = dist < 10 && !P.dead;
          if (this.near) { this.fwd.copy(tangentTo(this.dir, pdir)); if (dist < 14) (ty === 'mite' ? sfx.blip() : sfx.bass()); if (ty === 'mite') G.toastOnce && G.toastOnce('mite', 'A Maanmijt! It hops really high on the moon. Stomp it right after it lands.'); else if (ty === 'jelly') G.toastOnce && G.toastOnce('jelly', 'A Kwalletje! It hops at you. Stomp it right after it lands.'); else G.toastOnce && G.toastOnce('bassbol', 'Bassbol! It hops on the beat. Stomp it right after it lands.'); }
          else this.fwd.applyAxisAngle(this.dir, (Math.random() - 0.5) * 2.5);
        }
      } else {
        const k = Math.min(1, this.st / 0.75);
        this.alt = Math.sin(k * Math.PI) * (ty === 'mite' ? 3.2 : 1.5);
        this.walk(this.near ? this.chase : this.speed, dt);
        if (k >= 1) { this.alt = 0; this.state = 'wait'; this.st = 0; if (dist < 16) puff(surf(this.p, this.dir, 0.1), 6, ty === 'mite' ? 0xd8d4e8 : 0xff5ab4, 2, 0.4, this.dir); }
      }
    } else if (ty === 'bat' || ty === 'icebat' || ty === 'firebat' || ty === 'ghost') {
      this.m.wings[0].rotation.z = Math.sin(this.t * 18) * 0.7; this.m.wings[1].rotation.z = -Math.sin(this.t * 18) * 0.7;
      if (this.state === 'dive') {
        this.steer(tangentTo(this.dir, pdir || this.home), 4, dt); this.walk(this.chase, dt);
        this.alt += (0.45 - this.alt) * damp(4, dt);
        if (this.st > 1.7 || P.dead) { this.state = 'wander'; this.st = 0; }
      } else {
        if (awayHome > this.roam) this.steer(tangentTo(this.dir, this.home), 3, dt);
        else this.fwd.applyAxisAngle(this.dir, dt * 1.3);       // lazy circles
        this.walk(this.speed, dt);
        this.alt += (2.6 - this.alt) * damp(2, dt);
        if (dist < 7 && this.st > 1.3 && !P.dead) { this.state = 'dive'; this.st = 0; sfx.warn(); G.toastOnce && G.toastOnce(ty === 'ghost' ? 'ghost' : 'bat', ty === 'ghost' ? 'A Spookje is swooping at you! Jump on it while it’s low, or spin with F.' : 'A bat is diving at you! Jump on it while it swoops low, or spin with F.'); }
      }
      this.bang.visible = this.state === 'dive' && this.st < 0.5;
    } else if (ty === 'roller' || ty === 'slider' || ty === 'boulder' || ty === 'coco' || ty === 'tumble' || ty === 'pumpkin') {
      if (this.state === 'aim') {
        this.steer(tangentTo(this.dir, pdir || this.home), 10, dt);
        this.m.ball.rotation.x = Math.sin(this.st * 30) * 0.15;
        if (this.st > 0.75) { this.state = 'roll'; this.st = 0; this.bang.visible = false; }
      } else if (this.state === 'roll') {
        this.walk(this.chase, dt); this.m.ball.rotation.x += dt * this.chase * 1.6;
        if (Math.random() < dt * 20) puff(surf(this.p, this.dir, 0.1), 1, ty === 'slider' ? 0xe8f8ff : ty === 'boulder' ? 0x8aa86a : ty === 'coco' ? 0x6a8a3a : ty === 'tumble' ? 0xe8c890 : 0xd8a060, 1.5, 0.3, this.dir);
        if (this.st > 1.4) { this.state = 'tired'; this.st = 0; }
      } else if (this.state === 'tired') {
        this.m.body.rotation.z = Math.sin(this.st * 10) * 0.14;
        if (this.st > 1.6) { this.state = 'wander'; this.st = 0; this.m.body.rotation.z = 0; }
      } else {
        if (awayHome > this.roam) this.steer(tangentTo(this.dir, this.home), 3, dt);
        else if (Math.random() < dt * 0.5) this.fwd.applyAxisAngle(this.dir, (Math.random() - 0.5) * 2);
        this.walk(this.speed, dt); this.m.ball.rotation.x += dt * this.speed * 1.6;
        if (dist < 10 && this.st > 0.8 && !P.dead) {
          this.state = 'aim'; this.st = 0; this.bang.visible = true; sfx.warn();
          if (ty === 'boulder') G.toastOnce && G.toastOnce('boulder', 'Pechrotsblok! Bad luck rolls straight: step aside, then stomp it while it’s dizzy.');
          else if (ty === 'tumble') G.toastOnce && G.toastOnce('tumble', 'Tumbleweed! It rolls in a straight line: step aside, then stomp it while it’s dizzy.');
          else if (ty === 'pumpkin') G.toastOnce && G.toastOnce('pumpkin', 'Rolpompoen! It rolls in a straight line: step aside, then stomp it while it’s dizzy.');
          else if (ty === 'coco') G.toastOnce && G.toastOnce('coco', 'Kokosrol! It rolls in a straight line: step aside, then stomp it while it’s dizzy.');
          else if (ty === 'slider') G.toastOnce && G.toastOnce('slider', 'IJspinguïn! It belly-slides at you in a straight line: step aside, then stomp it while it’s dizzy.');
          else G.toastOnce && G.toastOnce('roller', 'Rolbal! It rolls in a straight line: step aside, then stomp it while it’s dizzy.');
        }
      }
      // the penguin dives onto its belly while it slides
      if (ty === 'slider') this.m.tilt.rotation.x += ((this.state === 'roll' ? 1.35 : 0) - this.m.tilt.rotation.x) * damp(12, dt);
    } else if (ty === 'goldbot') {
      // runs away from you with Nathan's ball
      if (dist < 9) { this.steer(tangentTo(this.dir, pdir).negate(), 5, dt); this.walk(this.chase, dt); }
      else { if (Math.random() < dt) this.fwd.applyAxisAngle(this.dir, (Math.random() - 0.5) * 2); this.walk(this.speed, dt); }
      if (awayHome > 0.75) this.steer(tangentTo(this.dir, this.home), 4, dt);
      this.m.body.position.y = Math.abs(Math.sin(this.t * 12)) * 0.12;
    } else {
      const chasing = dist < (ty === 'drone' ? 40 : 8) && !P.dead && (ty === 'drone' || awayHome < this.roam * 2.4);
      if (chasing) { this.steer(tangentTo(this.dir, pdir), 4, dt); this.walk(this.chase, dt); }
      else {
        if (awayHome > this.roam) this.steer(tangentTo(this.dir, this.home), 3, dt);
        else if (Math.random() < dt * 0.6) this.fwd.applyAxisAngle(this.dir, (Math.random() - 0.5) * 2);
        this.walk(this.speed, dt);
      }
      if (ty === 'beatbug') { const ph = (this.t * 2.33) % 1; this.m.body.position.y = Math.sin(ph * Math.PI) * 0.35; this.m.body.scale.set(1 + (ph < 0.15 ? 0.15 : 0), 1 - (ph < 0.15 ? 0.15 : 0), 1); }
      if (ty === 'scorpion') { this.m.tail.rotation.x = Math.sin(this.t * 6) * 0.2; this.m.body.position.y = Math.abs(Math.sin(this.t * 14)) * 0.04; }
      if (ty === 'slug') { this.m.body.scale.z = 1 + Math.sin(this.t * 5) * 0.1; if (Math.random() < 0.016 * 3) puff(surf(this.p, this.dir, 0.05), 1, 0xff7a2a, 0.5, 0.2, this.dir); }
      if (ty === 'snake') this.m.segs.forEach((s, i) => (s.position.x = Math.sin(this.t * 9 - i * 0.9) * 0.18 * (i + 1) / 3));
      if (ty === 'gnome') { this.m.body.position.y = Math.abs(Math.sin(this.t * 11)) * 0.1; this.m.body.rotation.z = Math.sin(this.t * 11) * 0.1; }
      if (ty === 'kattenbot') { this.m.body.position.y = Math.abs(Math.sin(this.t * 10)) * 0.08; this.m.tail.rotation.z = Math.sin(this.t * 8) * 0.4; }
      if (ty === 'drone') { this.alt = 1.1 + Math.sin(this.t * 3) * 0.25; this.m.prop.rotation.y += dt * 30; }
    }
    this.place();
    if (onMine && !G.cutscene) this.touch();
  }
  touch() {
    const pc = P.pos.clone().addScaledVector(P.up, 0.55);
    const ec = surf(this.p, this.dir, this.alt + this.size * 0.5);
    const d = pc.distanceTo(ec);
    // a spin only dazes: the first one makes it dizzy, a second spin (or a stomp) finishes it
    if (P.spinT > 0 && d < 1.5 && this.hitSpin !== P.spinId) {
      this.hitSpin = P.spinId;
      if (this.type === 'kever') { if (this.state !== 'flipped') this.knock(); return; }
      if (this.dizzy > 0) return this.kill(true);
      this.dizzy = 1.8; sfx.clank();
      puff(ec, 8, 0xffe14a, 3, 0.4, this.dir);
      G.toastOnce && G.toastOnce('dizzy', 'It’s dizzy! Stomp it, or spin again to finish it.');
      return;
    }
    if (d < this.size * 0.5 + 0.5) {
      if (this.dizzy > 0 && P.pound !== 2 && !(P.alt > this.alt + this.size * 0.4 && P.vr <= 0.5)) return;   // dizzy ones don't hurt
      const above = P.alt > this.alt + this.size * 0.4 && P.vr <= 0.5;
      if (P.pound === 2) return this.kill(true);
      if (above) {
        if (this.armor > 0) { this.armor--; this.m.crystals.visible = false; sfx.clank(); bouncePlayer(13); puff(ec, 10, 0x5ef2e0, 3, 1, this.dir); G.toastOnce && G.toastOnce('kever', 'Its crystals broke! Stomp it again, or ground pound (Shift in the air).'); return; }
        bouncePlayer(keysJump() ? 16 : 13);
        return this.kill(false);
      }
      hurtPlayer(ec);
    }
  }
  knock() {   // a spin pushes a Kristalkever back and stuns it
    this.state = 'tired'; this.st = -0.6; sfx.clank();
    this.fwd.copy(tangentTo(this.dir, P.up).negate());
    this.walk(1.5, 0.3);
  }
  kill(silent) {
    if (this.dead) return;
    this.dead = true; sfx.stomp();
    const at = surf(this.p, this.dir, this.alt + 0.5);
    puff(at, 16, this.type === 'beatbug' ? 0xb07aff : this.type === 'kever' ? 0x5ef2e0 : 0xd0d4dc, 4, 1.5, this.dir);
    this.m.g.visible = false;
    G.shake = Math.max(G.shake, 0.12);
    for (let i = 0; i < this.drops; i++) this.w.dropCoin(this.p, this.dir.clone().addScaledVector(anyPerp(this.dir).applyAxisAngle(this.dir, i * 2.4), 0.03).normalize());
    if (this.onDie) this.onDie(this);
    void silent;
  }
}
import { keys } from './player.js?v=20261111l';
const keysJump = () => keys.has('Space');
export { V3 };
