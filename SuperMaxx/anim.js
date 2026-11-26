import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { poseEmote, stopEmote } from './emotes.js?v=20261127a';

// Shared animation layer on top of each model's own idle/walk: jump pose, recoil, cast,
// flinch, stun wobble, status markers, spawn pop and death fall. Plus floating numbers.

function indicators(h) {
  if (h.fxg) return h.fxg;
  const stars = new THREE.Group(); stars.position.y = 2.15;
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), new THREE.MeshBasicMaterial({ color: 0xffd23c }));
    const a = i / 3 * Math.PI * 2; s.position.set(Math.cos(a) * 0.35, 0, Math.sin(a) * 0.35); stars.add(s);
  }
  const mark = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), new THREE.MeshBasicMaterial({ color: 0xffe08a }));
  mark.position.y = 2.85; mark.scale.y = 1.6;
  const roots = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.6, 4), new THREE.MeshLambertMaterial({ color: 0x5f8f45 }));
    const a = i / 8 * Math.PI * 2; c.position.set(Math.cos(a) * 0.45, 0.25, Math.sin(a) * 0.45); c.rotation.set(-Math.sin(a) * 0.5, 0, Math.cos(a) * 0.5); roots.add(c);
  }
  const frost = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.35, 12), new THREE.MeshLambertMaterial({ color: 0xcdeeff, transparent: true, opacity: 0.6 }));
  frost.position.y = 0.17;
  const haste = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.04, 6, 24), new THREE.MeshBasicMaterial({ color: 0xff7a2a }));
  haste.rotation.x = Math.PI / 2; haste.position.y = 0.3;
  for (const o of [stars, mark, roots, frost, haste]) { o.visible = false; h.mesh.add(o); }
  h.fxg = { stars, mark, roots, frost, haste };
  return h.fxg;
}

function gunGroup(h) {
  const g = h.gun.parent;
  if (!g.userData.base) g.userData.base = { z: g.position.z, rx: g.rotation.x };
  return g;
}

// Called every frame for every non-player hero (alive or dying).
export function poseHero(G, h, dt, camera, playerTeam) {
  const m = h.model, root = h.mesh;
  h.castA = Math.max(0, (h.castA || 0) - dt * 1.8);
  if (h.twirlT > 0) h.twirlT -= dt;                                  // ticks here so online puppets stop spinning too
  h.recoilA = Math.max(0, (h.recoilA || 0) - dt * 9);
  h.flinchA = Math.max(0, (h.flinchA || 0) - dt * 6);
  h.spawnA = Math.max(0, (h.spawnA || 0) - dt * 3);

  if (!h.alive) {
    h.deathT = (h.deathT || 0) + dt;
    const k = Math.min(1, h.deathT * 2.4);
    root.visible = h.deathT < 1.4;
    root.rotation.x = -k * k * Math.PI / 2 * 0.95;
    root.position.y = h.pos.y + (h.deathT > 0.8 ? -(h.deathT - 0.8) * 1.4 : 0);
    if (m.legs) m.legs.forEach((l, i) => { l.rotation.x = (i ? -0.4 : 0.6) * k; });
    m.arms[0].rotation.x = -1.8 * k;
    if (h.fxg) Object.values(h.fxg).forEach(o => { o.visible = false; });
    h.bar.visible = false;
    if (h.emote) stopEmote(G, h);
    return;
  }
  h.bar.visible = true;
  const ind = indicators(h);

  // invisibility: hide the model, show a faint shimmer to allies (or to anyone very close)
  if (h.invisT > 0) {
    root.visible = false;
    if (!h.shimmer) {
      h.shimmer = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1, 4, 10), new THREE.MeshBasicMaterial({ color: 0xd94fa0, transparent: true, opacity: 0.2, depthWrite: false }));
      G.scene.add(h.shimmer);
    }
    const d = camera.position.distanceTo(h.pos);
    h.shimmer.visible = true;
    h.shimmer.material.opacity = h.team === playerTeam ? 0.25 : d < 7 ? 0.1 + Math.sin(G.time * 14) * 0.05 : 0;
    h.shimmer.position.set(h.pos.x, h.pos.y + 0.95, h.pos.z);
  } else {
    root.visible = true;
    if (h.shimmer) h.shimmer.visible = false;
  }

  // jump / fall pose
  if (!h.onGround && m.legs) { m.legs[0].rotation.x = -0.8; m.legs[1].rotation.x = 0.35; }
  if (!h.onGround && m.P?.kneeL) { m.P.kneeL.rotation.x = -0.4; m.P.kneeR.rotation.x = -1.2; m.legs[0].rotation.x = 0.2; m.legs[1].rotation.x = 0.9; }   // tucked jump
  // gun recoil
  const g = gunGroup(h);
  g.position.z = g.userData.base.z + h.recoilA * 0.14;
  g.rotation.x = g.userData.base.rx + h.recoilA * 0.3;
  // casting, by slot: Q is a forward lunge-and-thrust, E raises the arm with a hop,
  // the ultimate leaps up into a full twirl and lands with a squash
  const c = Math.min(1, h.castA), slot = h.castSlot;
  const ease = Math.sin(c * Math.PI);
  let lean = 0, squash = 1, y = h.pos.y;
  if (c > 0) {
    if (slot === 'q') { m.arms[0].rotation.x = 1.4 + ease * 0.4; if (m.P) m.P.elbowR.rotation.x = 0.1; lean = ease * 0.32; g.position.z -= ease * 0.25; }
    else if (slot === 'ult') { m.arms[0].rotation.x = -3 * Math.sin(c * Math.PI * 0.5); y += Math.sin(Math.min(1, h.castA / 1.6) * Math.PI) * 0.55; }
    else { m.arms[0].rotation.x = -2.7 * Math.sin(c * Math.PI * 0.5); y += ease * 0.16; lean = -ease * 0.1; }
  }
  if (slot === 'ult' && h.castA > 0 && h.castA < 0.35) squash = 1 - Math.sin(h.castA / 0.35 * Math.PI) * 0.12;
  if (h.lurkT > 0) y -= Math.min(1, (h.def.ability.dur - h.lurkT) * 4) * 1.4;    // Lurk: only the eyes poke out
  // ultimate: a full twirl
  const spin = h.castA > 1 ? (1.6 - h.castA) / 0.6 * Math.PI * 2 : 0;
  // Torque's Spin Cycle: two quick turns while the punch goes round
  const twirl = (h.castSlot === 'ability' && h.def.ability.id === 'spinout' && h.castA > 0.4 ? (1 - h.castA) / 0.6 * Math.PI * 4 : 0)
    + (h.twirlT > 0 ? (0.45 - h.twirlT) / 0.45 * Math.PI * 6 : 0);                  // Pirouette spins three times across the floor
  // stun wobble, flinch
  root.rotation.z = h.stunT > 0 ? Math.sin(G.time * 12) * 0.12 : 0;
  if (h.dashT > 0 && h.dashSpinA) root.rotation.z += h.dashSpinA;          // Snapjaw's death roll
  root.rotation.x = -h.flinchA * 0.28 + (h.dashT > 0 && !h.dashSpinA ? 0.35 : 0) + lean;
  root.rotation.y = h.yaw + spin + twirl;
  const s = 1 - h.spawnA * 0.6 + Math.sin(h.spawnA * Math.PI) * 0.15;
  const big = h.megaT > 0 ? Math.min(h.def.ult.scale || 1, 1 + (h.def.ult.dur - h.megaT) * 2 * ((h.def.ult.scale || 1) - 1), 1 + h.megaT * 2 * ((h.def.ult.scale || 1) - 1)) : 1;   // Mega Mech grows and shrinks back
  root.scale.set(s * big / Math.sqrt(squash), s * big * squash, s * big / Math.sqrt(squash));
  root.position.set(h.pos.x, y, h.pos.z);

  ind.stars.visible = h.stunT > 0; ind.stars.rotation.y += dt * 6;
  ind.mark.visible = h.markT > 0; ind.mark.rotation.y += dt * 3; ind.mark.position.y = 2.85 + Math.sin(G.time * 4) * 0.08;
  ind.roots.visible = h.rootT > 0;
  ind.frost.visible = h.slowT > 0 || h.zoneSlow < 1;
  ind.haste.visible = h.hasteT > 0; ind.haste.scale.setScalar(1 + Math.sin(G.time * 20) * 0.08);
  h.shield.visible = h.barrierT > 0;
  poseEmote(G, h, dt);
}

// ---------- floating numbers ----------
export function floatText(G, pos, text, color = '#ffffff', size = 1) {
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 64;
  const g = cv.getContext('2d');
  g.font = '900 italic 42px Futura, "Avenir Next", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 8; g.strokeStyle = '#1d2340'; g.strokeText(text, 64, 34);
  g.fillStyle = color; g.fillText(text, 64, 34);
  const tex = new THREE.CanvasTexture(cv);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sp.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.6, 0.3, (Math.random() - 0.5) * 0.6));
  sp.scale.set(1.1 * size, 0.55 * size, 1);
  sp.renderOrder = 10;
  G.scene.add(sp);
  G.fx.push({ obj: sp, life: 0.8, max: 0.8, kind: 'float', tex });
}

// Tower collapse: chunks of masonry flying out.
export function rubble(G, pos, color, n = 14) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.3 + Math.random() * 0.4, 0.3 + Math.random() * 0.4, 0.3 + Math.random() * 0.4), new THREE.MeshLambertMaterial({ color: i % 3 ? 0xf7f0e2 : color, transparent: true }));
    m.position.set(pos.x + (Math.random() - 0.5), 2 + Math.random() * 3, pos.z + (Math.random() - 0.5));
    G.scene.add(m);
    const a = Math.random() * Math.PI * 2;
    G.fx.push({ obj: m, life: 1.8, max: 1.8, kind: 'debris', vel: new THREE.Vector3(Math.cos(a) * (3 + Math.random() * 4), 4 + Math.random() * 6, Math.sin(a) * (3 + Math.random() * 4)), spin: 4 });
  }
}

// ---------- season pass elimination effects ----------
// Played where a hero goes down, chosen by whoever knocked them out.
const debris = (G, mesh, vel, life = 1.4, spin = 8) => { G.scene.add(mesh); G.fx.push({ obj: mesh, life, max: life, kind: 'debris', vel, spin }); };
const rnd = s => (Math.random() - 0.5) * s;
export function killFx(G, pos, fx) {
  const p = pos.clone();
  if (fx === 'confetti') {
    const cols = [0xff4fa3, 0xffd23c, 0x3ccf9a, 0x2f8bff, 0xffffff];
    for (let i = 0; i < 34; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.24), new THREE.MeshBasicMaterial({ color: cols[i % 5], side: THREE.DoubleSide, transparent: true }));
      m.position.copy(p); debris(G, m, new THREE.Vector3(rnd(9), 6 + Math.random() * 6, rnd(9)), 1.8, 12);
    }
  } else if (fx === 'hearts') {
    for (let i = 0; i < 7; i++) setTimeout(() => floatText(G, p.clone().add(new THREE.Vector3(rnd(1.4), 0.4 + i * 0.12, rnd(1.4))), '♥', i % 2 ? '#ff4fa3' : '#ff8fc8', 1.2 + Math.random() * 0.6), i * 70);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.08, 6, 24), new THREE.MeshBasicMaterial({ color: 0xff4fa3, transparent: true }));
    ring.position.copy(p); G.scene.add(ring); G.fx.push({ obj: ring, life: 0.6, max: 0.6, kind: 'grow', size: 3 });
  } else if (fx === 'lightning') {
    // a jagged bolt from the sky, then a white flash
    let a = p.clone().add(new THREE.Vector3(rnd(2), 22, rnd(2)));
    const pts = [a.clone()];
    for (let i = 1; i <= 8; i++) { const b = a.clone().lerp(p, 1 / (9 - i)); b.x += rnd(1.6); b.z += rnd(1.6); if (i === 8) b.copy(p); pts.push(b); a = b; }
    for (const [w, c] of [[1, 0xfff6a0], [1, 0xffffff]]) {
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: c, transparent: true, linewidth: w }));
      G.scene.add(line); G.fx.push({ obj: line, life: 0.35, max: 0.35, kind: 'fade' });
    }
    const flash = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), new THREE.MeshBasicMaterial({ color: 0xfff6a0, transparent: true, depthWrite: false }));
    flash.position.copy(p); G.scene.add(flash); G.fx.push({ obj: flash, life: 0.3, max: 0.3, kind: 'grow', size: 3.2 });
    G.ev.shake?.({ pos: p }, 0.5);
  } else if (fx === 'coins') {
    for (let i = 0; i < 18; i++) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.04, 12), new THREE.MeshLambertMaterial({ color: 0xffc93c, emissive: 0xb07a10, emissiveIntensity: 0.5, transparent: true }));
      m.position.copy(p); m.rotation.x = Math.PI / 2; debris(G, m, new THREE.Vector3(rnd(6), 7 + Math.random() * 5, rnd(6)), 1.6, 14);
    }
    floatText(G, p.clone().setY(p.y + 0.8), '+$$$', '#ffd23c', 1.1);
  } else if (fx === 'fireworks') {
    const cols = [0xff4fa3, 0xffd23c, 0x7af0ff, 0x9dff3c];
    for (let k = 0; k < 4; k++) setTimeout(() => {
      const c = p.clone().add(new THREE.Vector3(rnd(3), 2.5 + Math.random() * 2, rnd(3)));
      for (let i = 0; i < 14; i++) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), new THREE.MeshBasicMaterial({ color: cols[k], transparent: true }));
        const a = i / 14 * Math.PI * 2, e = rnd(2);
        m.position.copy(c); debris(G, m, new THREE.Vector3(Math.cos(a) * 6, 4 + e * 3, Math.sin(a) * 6), 0.9, 0);
      }
    }, k * 160);
  }
}
