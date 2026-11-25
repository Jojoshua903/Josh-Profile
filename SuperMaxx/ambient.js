import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { M, put } from './scenery.js?v=20261125q';

// Moving life in each arena: bunting and gulls, canal water and boats, petals and grass.
// Returns { tick(dt, t), colliders } where colliders are [x, z, w, d, h].

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);

function bunting(scene, map, zs) {
  const strings = [];
  const tri = new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-0.3, 0), new THREE.Vector2(0.3, 0), new THREE.Vector2(0, -0.6)]));
  const colors = [0xd9734e, 0xffffff, 0x2f6fb3, 0xffc93c, 0x3f9b8f];
  for (const z0 of zs) for (const z of [z0, -z0]) {
    const g = new THREE.Group(); g.position.set(0, 7.5, z); scene.add(g);
    const n = Math.floor(map.W * 2 / 0.9);
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const x = -map.W + i * (map.W * 2 / n), y = -1.3 * (1 - (x / map.W) ** 2);
      pts.push(new THREE.Vector3(x, y, 0));
      if (i < n) {
        const f = new THREE.Mesh(tri, new THREE.MeshStandardMaterial({ color: colors[i % colors.length], side: THREE.DoubleSide }));
        f.position.set(x + 0.45, y - 0.02, 0); g.add(f);
      }
    }
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x1d2340 })));
    strings.push(g);
  }
  return (dt, t) => strings.forEach((g, i) => { g.rotation.x = Math.sin(t * 1.3 + i) * 0.12; });
}

function birds(scene, n, color) {
  const list = [];
  for (let i = 0; i < n; i++) {
    const g = new THREE.Group();
    const wl = put(g, box(1.1, 0.05, 0.35), M(color), -0.55, 0, 0, false);
    const wr = put(g, box(1.1, 0.05, 0.35), M(color), 0.55, 0, 0, false);
    put(g, box(0.25, 0.2, 0.6), M(color), 0, 0, 0, false);
    g.userData = { a: Math.random() * 6, r: 18 + Math.random() * 30, y: 16 + Math.random() * 10, s: 0.15 + Math.random() * 0.1, wl, wr, cz: (Math.random() - 0.5) * 60 };
    scene.add(g); list.push(g);
  }
  return (dt, t) => list.forEach(g => {
    const u = g.userData; u.a += dt * u.s;
    g.position.set(Math.cos(u.a) * u.r, u.y + Math.sin(t + u.a) * 1.5, u.cz + Math.sin(u.a) * u.r);
    g.rotation.y = -u.a;
    const f = Math.sin(t * 8 + u.r) * 0.5; u.wl.rotation.z = f; u.wr.rotation.z = -f;
  });
}

function waterTex() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const g = cv.getContext('2d');
  g.fillStyle = '#4f9fc0'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 120; i++) {
    g.strokeStyle = `rgba(255,255,255,${0.12 + Math.random() * 0.25})`; g.lineWidth = 2;
    const x = Math.random() * 256, y = Math.random() * 256, w = 10 + Math.random() * 30;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w / 2, y - 4, x + w, y); g.stroke();
  }
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}

function canals(scene, map) {
  const colliders = [];
  const tex = waterTex();
  const water = (x0, x1, z0, z1) => {
    const t = tex.clone(); t.needsUpdate = true; t.repeat.set((x1 - x0) / 6, (z1 - z0) / 6);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), new THREE.MeshStandardMaterial({ map: t, transparent: true, opacity: 0.9, roughness: 0.08, metalness: 0.15, envMapIntensity: 1.6 }));
    m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, 0.035, (z0 + z1) / 2); m.receiveShadow = true; scene.add(m);
    for (const x of [x0, x1]) put(scene, box(0.35, 0.14, z1 - z0), M(0xd9d2c3), x, 0.07, (z0 + z1) / 2, false);
    return t;
  };
  const texes = [water(-2.6, 2.6, -40, 40), water(map.W - 4.6, map.W, -map.L, map.L), water(-map.W, -map.W + 4.6, -map.L, map.L)];
  // lily pads and moored boats in the side canals
  const pads = [];
  for (let i = 0; i < 26; i++) {
    const s = i % 2 ? 1 : -1, z = (Math.random() - 0.5) * map.L * 1.8;
    const p = new THREE.Mesh(new THREE.CircleGeometry(0.35 + Math.random() * 0.25, 10, 0.3, Math.PI * 1.8), M(0x5f9e4a));
    p.rotation.x = -Math.PI / 2; p.position.set(s * (map.W - 1 - Math.random() * 3), 0.05, z); scene.add(p); pads.push(p);
    if (i % 4 === 0) put(scene, new THREE.SphereGeometry(0.12, 6, 4), M(0xffd0dc), p.position.x, 0.12, z, false);
  }
  for (const [x, z, c] of [[map.W - 2.3, -30, 0x2f6fb3], [map.W - 2.3, 4, 0x3f5d4c], [-map.W + 2.3, -14, 0xd8475e]]) {
    for (const [bx, bz] of [[x, z], [-x, -z]]) {
      const b = new THREE.Group(); b.position.set(bx, 0, bz); scene.add(b);
      put(b, box(2.2, 0.8, 6), M(c), 0, 0.3, 0);
      put(b, box(1.8, 0.1, 5.4), M(0x9b7650), 0, 0.72, 0, false);
      put(b, box(1.6, 0.9, 1.8), M(0xf7f1e6), 0, 1.2, 1, false);
      for (let k = 0; k < 4; k++) put(b, new THREE.SphereGeometry(0.15, 6, 4), M([0xd8475e, 0xffd23c, 0xf28fb0, 0xffffff][k]), -0.5 + k * 0.33, 0.85, -1.8, false);
      colliders.push([bx, bz, 2.2, 6, 0.8]);
    }
  }
  // strings of lanterns across the middle canal
  const lights = [];
  for (const z0 of [-12, -30]) for (const z of [z0, -z0]) {
    const pts = [];
    for (let i = 0; i <= 14; i++) {
      const x = -12 + i * (24 / 14), y = 6.4 - 1.1 * (1 - (x / 12) ** 2);
      pts.push(new THREE.Vector3(x, y, z));
      if (i % 2) lights.push(put(scene, new THREE.SphereGeometry(0.2, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffd36a, emissive: 0xffb84a, emissiveIntensity: 1.6, roughness: 0.4 }), x, y - 0.25, z, false));
    }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x1d2340 })));
  }
  const tick = (dt, t) => {
    texes.forEach((tx, i) => { tx.offset.y = t * 0.03 * (i ? 1 : -1); tx.offset.x = Math.sin(t * 0.3) * 0.02; });
    pads.forEach((p, i) => { p.rotation.z += dt * 0.05 * (i % 2 ? 1 : -1); });
    lights.forEach((l, i) => { l.material.emissiveIntensity = 0.75 + Math.sin(t * 2 + i) * 0.2; });
  };
  return { tick, colliders };
}

function segDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2));
  return Math.hypot(px - ax - t * dx, pz - az - t * dz);
}

function grass(scene, map, r, colors, count) {
  const geo = new THREE.ConeGeometry(0.08, 0.45, 4); geo.translate(0, 0.22, 0);
  const inst = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }), count);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
  let n = 0;
  for (let tries = 0; tries < count * 4 && n < count; tries++) {
    const x = (r() * 2 - 1) * map.W, z = (r() * 2 - 1) * map.L;
    if (map.lanes.some(l => l.some((p, i) => i < l.length - 1 && segDist(x, z, ...p, ...l[i + 1]) < 2))) continue;
    q.setFromEuler(new THREE.Euler((r() - 0.5) * 0.5, r() * 3, (r() - 0.5) * 0.5));
    const s = 0.6 + r() * 0.9;
    m.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(s, s, s));
    inst.setMatrixAt(n, m); inst.setColorAt(n, c.setHex(colors[n % colors.length])); n++;
  }
  inst.count = n; scene.add(inst);
}

function petals(scene, map, color, n) {
  const geo = new THREE.BufferGeometry(); const pos = new Float32Array(n * 3); const sp = [];
  for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() * 2 - 1) * map.W; pos[i * 3 + 1] = Math.random() * 14; pos[i * 3 + 2] = (Math.random() * 2 - 1) * map.L; sp.push(0.4 + Math.random() * 0.6); }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: 0.18, transparent: true, opacity: 0.9 }));
  scene.add(pts);
  return (dt, t) => {
    for (let i = 0; i < n; i++) {
      pos[i * 3 + 1] -= dt * sp[i];
      pos[i * 3] += Math.sin(t * sp[i] * 2 + i) * dt * 0.6;
      if (pos[i * 3 + 1] < 0) pos[i * 3 + 1] = 14;
    }
    geo.attributes.position.needsUpdate = true;
  };
}

// Frostpeak: a frozen pond where the two lanes cross, glinting as the light moves
function pond(scene) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const g = cv.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 10, 128, 128, 128); gr.addColorStop(0, '#bfe6ff'); gr.addColorStop(1, '#8cc4ec');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.5;
  for (let i = 0; i < 26; i++) { const x = Math.random() * 256, y = Math.random() * 256; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - 0.5) * 60, y + (Math.random() - 0.5) * 60); g.stroke(); }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const ice = new THREE.Mesh(new THREE.CircleGeometry(7.5, 40), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.06, metalness: 0.2, envMapIntensity: 1.8, polygonOffset: true, polygonOffsetFactor: -2 }));
  ice.rotation.x = -Math.PI / 2; ice.position.y = 0.045; ice.receiveShadow = true; scene.add(ice);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(7.6, 0.35, 6, 40), M(0xf6f8fd));
  rim.rotation.x = Math.PI / 2; rim.scale.z = 0.4; rim.position.y = 0.05; scene.add(rim);
  return (dt, t) => { ice.material.envMapIntensity = 1.5 + Math.sin(t * 0.7) * 0.4; };
}

export function buildAmbient(scene, map, theme, r) {
  const ticks = [], colliders = [];
  if (theme === 'plaza') {
    ticks.push(bunting(scene, map, [-46, -26, -6]));
    ticks.push(birds(scene, 7, 0xffffff));
  } else if (theme === 'canals') {
    const c = canals(scene, map); ticks.push(c.tick); colliders.push(...c.colliders);
    ticks.push(birds(scene, 4, 0x2a3550));
    grass(scene, map, r, [0x7fb069, 0x6c9e5a], 200);
  } else if (theme === 'alpine') {
    ticks.push(pond(scene));
    ticks.push(petals(scene, map, 0xffffff, 900));                 // the same drift, as snowfall
    ticks.push(birds(scene, 3, 0x2a3550));
  } else {
    grass(scene, map, r, [0x6c9e5a, 0x86b46a, 0x5b8f4a, 0xffb7c9], 1400);
    ticks.push(petals(scene, map, 0xffb7c9, 600));
    ticks.push(birds(scene, 4, 0x3a3f4a));
  }
  return { tick: (dt, t) => ticks.forEach(f => f(dt, t)), colliders };
}
