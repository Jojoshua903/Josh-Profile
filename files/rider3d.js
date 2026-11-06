// Low-poly 3D skaters built from primitives. Board runs along local +z, riders face local +x.
import * as THREE from 'https://unpkg.com/three@0.180.0/build/three.module.js';

const matCache = {};
function M(c) { return matCache[c] || (matCache[c] = new THREE.MeshLambertMaterial({ color: c })); }
function mesh(geo, c, parent, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, M(c)); m.position.set(x, y, z); m.castShadow = true; if (parent) parent.add(m); return m;
}
const INK = '#1f1a2e';

function buildBoard(sk, long) {
  const g = new THREE.Group(), L = long ? 1.45 : 0.95;
  mesh(new THREE.BoxGeometry(0.26, 0.04, L), sk.deck, g, 0, 0.12, 0);
  mesh(new THREE.BoxGeometry(0.27, 0.012, L * 0.98), INK, g, 0, 0.143, 0);
  for (const z of [-L * 0.33, L * 0.33]) for (const x of [-0.1, 0.1]) {
    const w = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.05, 10), '#fff8ea', g, x, 0.05, z); w.rotation.z = Math.PI / 2;
  }
  return g;
}

function buildHead(sk, parent, y) {
  const h = new THREE.Group(); h.position.y = y; parent.add(h);
  const eyes = (r, c = INK) => { mesh(new THREE.SphereGeometry(r * 0.13, 6, 6), c, h, r * 0.9, r * 0.15, -r * 0.3); mesh(new THREE.SphereGeometry(r * 0.13, 6, 6), c, h, r * 0.9, r * 0.15, r * 0.3); };
  if (sk.type === 'fruit') {
    const r = 0.27; mesh(new THREE.SphereGeometry(r, 16, 12), sk.head, h);
    if (sk.acc === 'beanie') { mesh(new THREE.SphereGeometry(r * 1.04, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2.2), '#e5392b', h, 0, 0.04, 0); mesh(new THREE.SphereGeometry(0.07, 8, 6), '#ffffff', h, 0, r + 0.08, 0); }
    else { mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.12), '#2c9a58', h, 0, r + 0.05, 0); const lf = mesh(new THREE.SphereGeometry(0.12, 8, 6), '#3fbf6e', h, 0.08, r + 0.06, 0); lf.scale.set(1, 0.25, 0.5); }
    if (sk.acc === 'shades') mesh(new THREE.BoxGeometry(0.05, 0.09, 0.4), INK, h, r * 0.9, r * 0.15, 0); else eyes(r);
    if (sk.acc === 'mustache') mesh(new THREE.BoxGeometry(0.05, 0.05, 0.26), INK, h, r * 0.95, -r * 0.2, 0);
  } else if (sk.type === 'kid') {
    const r = 0.21; mesh(new THREE.SphereGeometry(r, 14, 10), sk.head, h); eyes(r);
    const hc = sk.hairCol;
    if (!sk.hair) {
      mesh(new THREE.SphereGeometry(r * 1.06, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2.3), sk.cap, h, 0, 0.02, 0);
      mesh(new THREE.BoxGeometry(0.22, 0.03, 0.26), sk.cap, h, sk.backwards ? -0.22 : 0.22, 0.08, 0);
    } else {
      const top = mesh(new THREE.SphereGeometry(r * 1.07, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2.1), hc, h, -0.02, 0.02, 0);
      if (sk.hair === 'curly') { top.scale.set(1.1, 1.2, 1.1); for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; mesh(new THREE.SphereGeometry(0.08, 6, 5), hc, h, Math.cos(a) * 0.17 - 0.03, 0.14, Math.sin(a) * 0.17); } }
      if (sk.hair === 'spiky') for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const c = mesh(new THREE.ConeGeometry(0.06, 0.2, 5), hc, h, Math.cos(a) * 0.1 - 0.03, 0.24, Math.sin(a) * 0.1); c.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); }
      if (sk.hair === 'bun') mesh(new THREE.SphereGeometry(0.1, 8, 6), hc, h, -0.17, 0.17, 0);
      if (sk.hair === 'long') mesh(new THREE.BoxGeometry(0.12, 0.42, 0.38), hc, h, -0.15, -0.14, 0);
      if (sk.acc === 'headset') { const t = mesh(new THREE.TorusGeometry(r * 1.12, 0.02, 6, 20, Math.PI), '#e5392b', h); t.rotation.y = Math.PI / 2; mesh(new THREE.SphereGeometry(0.05, 6, 6), '#e5392b', h, 0, 0, r * 1.1); mesh(new THREE.SphereGeometry(0.035, 6, 6), INK, h, 0.17, -0.12, 0.12); }
    }
  } else if (sk.type === 'demon') {
    const r = 0.23; mesh(new THREE.SphereGeometry(r, 14, 10), sk.head, h); eyes(r, '#ffc531');
    for (const z of [-0.12, 0.12]) { const c = mesh(new THREE.ConeGeometry(0.05, 0.22, 6), '#3a0f2f', h, 0, r + 0.05, z); c.rotation.x = z > 0 ? 0.4 : -0.4; }
  } else if (sk.type === 'astro') {
    const r = 0.28; mesh(new THREE.SphereGeometry(r, 16, 12), '#ffffff', h);
    const v = mesh(new THREE.SphereGeometry(r * 0.7, 14, 10), '#4fb3d9', h, r * 0.45, 0, 0); v.scale.set(0.6, 0.9, 1.1);
    mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.2), INK, h, -0.05, r + 0.08, 0); mesh(new THREE.SphereGeometry(0.04, 6, 6), '#e5392b', h, -0.05, r + 0.19, 0);
  } else if (sk.type === 'crab') {
    for (const z of [-0.12, 0.12]) { mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2), INK, h, 0.05, 0.05, z); mesh(new THREE.SphereGeometry(0.07, 8, 6), '#ffffff', h, 0.07, 0.17, z); mesh(new THREE.SphereGeometry(0.03, 6, 6), INK, h, 0.13, 0.17, z); }
    mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.12, 10), '#ffc531', h, 0, 0.3, 0);
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; mesh(new THREE.ConeGeometry(0.04, 0.12, 4), '#ffc531', h, Math.cos(a) * 0.15, 0.41, Math.sin(a) * 0.15); }
  }
  return h;
}

function buildRider(sk, s) {
  const root = new THREE.Group(); root.scale.setScalar(s);
  const hipY = 0.95;
  const legs = new THREE.Group(); legs.position.y = 0.15; root.add(legs);
  for (const z of [-0.2, 0.2]) {
    mesh(new THREE.BoxGeometry(0.15, 0.8, 0.15), sk.pants, legs, 0, 0.4, z);
    mesh(new THREE.BoxGeometry(0.28, 0.08, 0.16), INK, legs, 0.05, 0.04, z);
  }
  const upper = new THREE.Group(); upper.position.y = hipY; root.add(upper);
  const crab = sk.type === 'crab';
  if (crab) { const b = mesh(new THREE.SphereGeometry(0.45, 14, 10), sk.shirt, upper, 0, 0.32, 0); b.scale.set(0.8, 0.65, 1.15); }
  else mesh(new THREE.BoxGeometry(0.28, 0.62, 0.42), sk.shirt, upper, 0, 0.31, 0);
  if (sk.type === 'demon') { for (let i = 0; i < 4; i++) mesh(new THREE.SphereGeometry(0.05 - i * 0.008, 6, 6), sk.head, upper, -0.18 - i * 0.08, -0.05 + i * 0.1, 0); }
  const arms = [];
  for (const side of [-1, 1]) {
    const a = new THREE.Group(); a.position.set(0, 0.56, side * 0.26); upper.add(a);
    const armCol = sk.type === 'kid' ? sk.shirt : sk.type === 'astro' ? '#f4f1ea' : sk.head;
    mesh(new THREE.BoxGeometry(0.1, 0.55, 0.1), armCol, a, 0, -0.27, 0);
    if (crab) { const cl = mesh(new THREE.SphereGeometry(0.16, 10, 8), sk.head, a, 0, -0.58, 0); cl.scale.set(1, 0.7, 0.6); }
    else mesh(new THREE.SphereGeometry(0.065, 8, 6), sk.type === 'kid' ? sk.head : armCol, a, 0, -0.57, 0);
    a.rotation.x = -side * 1.15; arms.push(a);
  }
  const head = buildHead(sk, upper, crab ? 0.78 : 0.88);
  return { root, legs, upper, arms, head, hipY };
}

export function buildSkater(sk) {
  const root = new THREE.Group(), body = new THREE.Group(), boardPivot = new THREE.Group();
  root.add(body); body.add(boardPivot);
  const board = buildBoard(sk, !!sk.duo); boardPivot.add(board); boardPivot.position.y = 0.0;
  const riders = [];
  if (sk.duo) sk.riders.forEach((r, i) => { const rd = buildRider(r, 0.8); rd.root.position.z = i ? -0.42 : 0.42; body.add(rd.root); riders.push(rd); });
  else { const rd = buildRider(sk, sk.small ? 0.85 : 1); body.add(rd.root); riders.push(rd); }
  if (sk.type === 'crab') riders[0].root.scale.set(1.05, 0.95, 1.2);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(1.3, 16, 12), new THREE.MeshBasicMaterial({ color: '#ffc531', transparent: true, opacity: 0.25, depthWrite: false }));
  glow.position.y = 1; glow.visible = false; body.add(glow);

  // pose: {crouch 0..1, grab bool, flip 0..1, flipKind 'kick'|'shove'|'special', arms 'out'|'up', bail}
  function pose(p) {
    const c = p.crouch || 0;
    for (const rd of riders) {
      rd.legs.scale.y = 1 - c * 0.38;
      rd.upper.position.y = 0.15 + (rd.hipY - 0.15) * (1 - c * 0.38);
      rd.upper.rotation.z = -c * 0.25;
      rd.arms.forEach((a, i) => {
        const side = i ? 1 : -1;
        if (p.grab && i === 1) { a.rotation.set(0, 0, 0.5); }
        else if (p.arms === 'up') { a.rotation.set(-side * 2.6, 0, 0); }
        else a.rotation.set(-side * (1.15 + Math.sin(p.t * 0.004 + i) * 0.08), 0, 0);
      });
    }
    let lift = p.flip ? Math.sin(p.flip * Math.PI) * 0.35 : 0;
    boardPivot.position.y = lift;
    boardPivot.rotation.set(0, 0, 0);
    if (p.flip) {
      if (p.flipKind === 'shove') boardPivot.rotation.y = p.flip * Math.PI * 2;
      else if (p.flipKind === 'special') { boardPivot.rotation.z = p.flip * Math.PI * 6; boardPivot.rotation.y = p.flip * Math.PI * 2; }
      else boardPivot.rotation.z = p.flip * Math.PI * 2;
    }
    glow.visible = p.flipKind === 'special' && p.flip > 0;
    if (glow.visible) glow.scale.setScalar(1 + Math.sin(p.t * 0.03) * 0.1);
  }
  return { root, body, pose };
}
