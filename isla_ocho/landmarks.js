import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { TEX } from './textures.js';
import { height, shoreS, ISLET, VOLCANO } from './island.js';

// Wuhu-style landmarks: forests, volcano smoke + waterfall, hillside town, hotel tower, ferris wheel,
// a bridge to the lighthouse islet, hot-air balloons and a blimp.
let seed = 7;
const R = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const rr = (a, b) => a + R() * (b - a);
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: o.r ?? 0.75, metalness: o.m ?? 0, ...(o.x || {}) });
const mk = (geo, mat, shadow = true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = shadow; m.receiveShadow = true; return m; };
const dummy = new THREE.Object3D();
const HOTEL = { x: -58, z: -72 }, WHEEL = { x: 54, z: -64 }, TOWN = { x: 100, z: -112 };

function windowsTex(base, win, cols = 6, rows = 10) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 512;
  const g = c.getContext('2d'); g.fillStyle = base; g.fillRect(0, 0, 256, 512);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    g.fillStyle = Math.random() < 0.2 ? '#fff3b0' : win; g.fillRect(14 + x * (228 / cols), 18 + y * (480 / rows), 228 / cols - 14, 480 / rows - 20);
    g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(14 + x * (228 / cols), 18 + y * (480 / rows) + 480 / rows - 24, 228 / cols - 14, 4);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function buildLandmarks(world) {
  const ups = [];

  // ---------- forests ----------
  const N = 900;
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.25, 0.35, 2.4, 6), std(0x7a5230), N);
  const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(2.2, 1), std(0xffffff, { r: 0.85, x: { flatShading: true } }), N);
  const pines = new THREE.InstancedMesh(new THREE.ConeGeometry(1.8, 5.5, 7), std(0xffffff, { r: 0.85, x: { flatShading: true } }), N);
  const greens = [0x3f9a45, 0x4fae52, 0x2f8040, 0x5cbf5a, 0x37904a], c = new THREE.Color();
  let nt = 0, np = 0;
  const avoid = [HOTEL, WHEEL, TOWN];
  for (let k = 0; k < 9000 && nt + np < N; k++) {
    const x = rr(-210, 290), z = rr(-330, 40), s = shoreS(x, z), y = height(x, z);
    if (s < 16 || y < 1.2 || y > 82 || Math.hypot(x, z * 0.75) < 68) continue;
    if (avoid.some((a) => Math.hypot(a.x - x, a.z - z) < (a === TOWN ? 34 : 16))) continue;
    if (Math.hypot(x - VOLCANO.x, z - VOLCANO.z) < 34) continue;
    const slope = Math.abs(height(x + 2, z) - y) + Math.abs(height(x, z + 2) - y);
    if (slope > 4.5) continue;
    const sc = rr(0.7, 1.4);
    if (y > 38 || R() < 0.25) {
      if (np >= N) continue;
      dummy.position.set(x, y + 2.6 * sc, z); dummy.rotation.set(0, R() * 6, 0); dummy.scale.setScalar(sc); dummy.updateMatrix();
      pines.setMatrixAt(np, dummy.matrix); pines.setColorAt(np++, c.set(0x2f7a42).multiplyScalar(rr(0.85, 1.15)));
    } else {
      dummy.position.set(x, y + 1.1 * sc, z); dummy.rotation.set(0, R() * 6, 0); dummy.scale.setScalar(sc); dummy.updateMatrix();
      trunks.setMatrixAt(nt, dummy.matrix);
      dummy.position.set(x, y + 3.6 * sc, z); dummy.scale.set(sc * rr(0.9, 1.2), sc * rr(0.85, 1.1), sc * rr(0.9, 1.2)); dummy.updateMatrix();
      crowns.setMatrixAt(nt, dummy.matrix); crowns.setColorAt(nt++, c.set(greens[Math.floor(R() * greens.length)]));
    }
  }
  trunks.count = crowns.count = nt; pines.count = np;
  [trunks, crowns, pines].forEach((m) => { m.castShadow = true; m.receiveShadow = true; world.add(m); });

  // ---------- volcano: glowing crater + smoke ----------
  const vTop = height(VOLCANO.x, VOLCANO.z);
  const lava = mk(new THREE.CircleGeometry(12, 28), new THREE.MeshBasicMaterial({ color: 0xff6a2a }), false);
  lava.rotation.x = -Math.PI / 2; lava.position.set(VOLCANO.x, vTop + 1, VOLCANO.z); world.add(lava);
  const smokeTex = TEX.glow('240,240,240'), puffs = [];
  for (let i = 0; i < 12; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false, fog: true })); world.add(s); puffs.push({ s, t: i / 12 }); }
  ups.push((dt, t) => {
    lava.material.color.setHSL(0.04 + Math.sin(t * 2) * 0.01, 1, 0.55 + Math.sin(t * 3.1) * 0.05);
    puffs.forEach((p) => { p.t = (p.t + dt * 0.025) % 1; const k = p.t; p.s.position.set(VOLCANO.x + k * 45 + Math.sin(k * 6 + t * 0.2) * 5, vTop + 12 + k * 80, VOLCANO.z + Math.sin(k * 5) * 8); p.s.scale.setScalar(14 + k * 48); p.s.material.opacity = 0.6 * Math.sin(k * Math.PI); });
  });

  // ---------- waterfall down the volcano's south flank ----------
  {
    const X = 34, Z0 = -178, Z1 = -128, SEG = 24, W = 5, pos = [], uv = [], idx = [];
    for (let i = 0; i <= SEG; i++) {
      const u = i / SEG, z = Z0 + (Z1 - Z0) * u;
      for (const side of [-1, 1]) { const x = X + side * W / 2; pos.push(x, height(x, z) + 0.6, z); uv.push(side < 0 ? 0 : 1, u * 6); }
    }
    for (let i = 0; i < SEG; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 256; const gg = cv.getContext('2d');
    gg.fillStyle = '#5fd0e8'; gg.fillRect(0, 0, 64, 256);
    for (let i = 0; i < 140; i++) { gg.fillStyle = `rgba(255,255,255,${0.3 + Math.random() * 0.6})`; gg.fillRect(Math.random() * 64, Math.random() * 256, 2 + Math.random() * 4, 10 + Math.random() * 30); }
    const tex = new THREE.CanvasTexture(cv); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.colorSpace = THREE.SRGBColorSpace;
    const fall = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, transparent: true, opacity: 0.92, roughness: 0.2, emissive: 0x1a6f86, emissiveIntensity: 0.35, side: THREE.DoubleSide }));
    world.add(fall);
    const pool = mk(new THREE.CircleGeometry(9, 28), std(0x3fc6d8, { r: 0.15, x: { emissive: 0x0f5c70, emissiveIntensity: 0.3 } }), false);
    pool.rotation.x = -Math.PI / 2; pool.position.set(X, height(X, Z1 + 4) + 0.35, Z1 + 4); world.add(pool);
    const mist = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, opacity: 0.45, depthWrite: false })); mist.scale.setScalar(16); mist.position.set(X, pool.position.y + 3, Z1 + 2); world.add(mist);
    ups.push((dt) => { tex.offset.y -= dt * 1.6; });
  }

  // ---------- hillside town ----------
  const roofCols = [0xe8403a, 0xff8a3a, 0x2a8fd6, 0xe8403a, 0x2f9e5b], wallCols = [0xfff4dc, 0xffe0b8, 0xdff4ff, 0xfff0f0, 0xf0ffe6];
  for (let i = 0; i < 20; i++) {
    const a = R() * Math.PI * 2, r = rr(4, 30), x = TOWN.x + Math.cos(a) * r, z = TOWN.z + Math.sin(a) * r * 0.8, y = height(x, z);
    if (shoreS(x, z) < 10) continue;
    const g = new THREE.Group(), w = rr(4, 6.5), d = rr(4, 6), h = rr(3.2, 6);
    const walls = mk(new THREE.BoxGeometry(w, h, d), std(wallCols[i % 5], { r: 0.8 })); walls.position.y = h / 2; g.add(walls);
    const roof = mk(new THREE.ConeGeometry(Math.max(w, d) * 0.78, 2.6, 4), std(roofCols[i % 5], { r: 0.6 })); roof.position.y = h + 1.3; roof.rotation.y = Math.PI / 4; roof.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d)); g.add(roof);
    const door = mk(new THREE.BoxGeometry(1, 1.8, 0.1), std(0x7a5230), false); door.position.set(0, 0.9, d / 2 + 0.03); g.add(door);
    for (const sx of [-1, 1]) { const win = mk(new THREE.BoxGeometry(0.9, 0.9, 0.1), std(0x2a8fd6, { r: 0.2, m: 0.3 }), false); win.position.set(sx * w * 0.28, h * 0.62, d / 2 + 0.03); g.add(win); }
    g.position.set(x, y - 0.2, z); g.rotation.y = Math.atan2(-(x - TOWN.x), -(z - TOWN.z) + 40) + rr(-0.3, 0.3);
    world.add(g);
  }
  const bell = new THREE.Group();
  const tower = mk(new THREE.BoxGeometry(4, 16, 4), std(0xfff4dc)); tower.position.y = 8; bell.add(tower);
  const spire = mk(new THREE.ConeGeometry(3.4, 6, 4), std(0x2a8fd6)); spire.position.y = 19; spire.rotation.y = Math.PI / 4; bell.add(spire);
  const clock = mk(new THREE.CircleGeometry(1.2, 24), std(0xffffff, { x: { emissive: 0xfff3b0, emissiveIntensity: 0.4 } }), false); clock.position.set(0, 13, 2.02); bell.add(clock);
  bell.position.set(TOWN.x, height(TOWN.x, TOWN.z) - 0.3, TOWN.z); world.add(bell);

  // ---------- resort hotel tower ----------
  {
    const g = new THREE.Group(), y0 = height(HOTEL.x, HOTEL.z);
    const tex = windowsTex('#fff4dc', '#5fb8d8');
    const tiers = [[18, 14, 12], [15, 12, 10], [12, 10, 9], [9, 8, 7]];
    let yy = 0;
    tiers.forEach(([w, d, h]) => { const b = mk(new THREE.BoxGeometry(w, h, d), std(0xffffff, { r: 0.6, x: { map: tex } })); b.position.y = yy + h / 2; g.add(b); yy += h; });
    const crown = mk(new THREE.CylinderGeometry(3.5, 4.5, 3, 16), std(0xffc93c, { m: 0.3, r: 0.35 })); crown.position.y = yy + 1.5; g.add(crown);
    const sign = mk(new THREE.BoxGeometry(14, 3.2, 0.4), std(0xffffff, { x: { map: TEX.label('WIDR RESORT'), emissive: 0xffffff, emissiveIntensity: 0.25 } })); sign.position.set(0, 26, 7.3); g.add(sign);
    const pool = mk(new THREE.BoxGeometry(14, 0.3, 7), std(0x3fd6cf, { r: 0.1, x: { emissive: 0x0f7f8a, emissiveIntensity: 0.25 } }), false); pool.position.set(0, 0.15, 13); g.add(pool);
    g.position.set(HOTEL.x, y0 - 0.2, HOTEL.z); g.rotation.y = Math.atan2(-HOTEL.x, -HOTEL.z) + Math.PI; g.lookAt(0, y0, 0);
    world.add(g);
  }

  // ---------- ferris wheel ----------
  {
    const g = new THREE.Group(), y0 = height(WHEEL.x, WHEEL.z), RAD = 14, H = RAD + 3;
    for (const s of [-1, 1]) for (const k of [-1, 1]) { const leg = mk(new THREE.CylinderGeometry(0.35, 0.45, H * 1.08, 8), std(0xffffff, { m: 0.4, r: 0.4 })); leg.position.set(k * 4.2, H / 2, s * 1.6); leg.rotation.z = -k * 0.26; g.add(leg); }
    const wheel = new THREE.Group(); wheel.position.y = H; g.add(wheel);
    for (const s of [-1, 1]) { const rim = mk(new THREE.TorusGeometry(RAD, 0.3, 8, 64), std(0xff6b4f, { m: 0.3, r: 0.4 })); rim.position.z = s * 1.2; wheel.add(rim); }
    const hub = mk(new THREE.CylinderGeometry(1.2, 1.2, 3, 16), std(0xffc93c, { m: 0.5 })); hub.rotation.x = Math.PI / 2; wheel.add(hub);
    const cars = [], carCols = [0x13a9c2, 0xffc93c, 0x2f9e5b, 0xff4f8b];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const sp = mk(new THREE.CylinderGeometry(0.12, 0.12, RAD, 6), std(0xffffff, { m: 0.4 }), false); sp.position.set(Math.cos(a) * RAD / 2, Math.sin(a) * RAD / 2, 0); sp.rotation.z = a - Math.PI / 2; wheel.add(sp);
      const car = new THREE.Group(); const cab = mk(new THREE.BoxGeometry(2, 1.8, 1.8), std(carCols[i % 4], { r: 0.5 })); cab.position.y = -1.2; car.add(cab);
      const top = mk(new THREE.ConeGeometry(1.5, 0.8, 4), std(0xffffff)); top.rotation.y = Math.PI / 4; top.position.y = -0.1; car.add(top);
      car.position.set(Math.cos(a) * RAD, Math.sin(a) * RAD, 0); wheel.add(car); cars.push(car);
    }
    g.position.set(WHEEL.x, y0 - 0.2, WHEEL.z); g.lookAt(0, y0, 0); world.add(g);
    ups.push((dt) => { wheel.rotation.z += dt * 0.06; cars.forEach((cr) => { cr.rotation.z = -wheel.rotation.z; }); });
  }

  // ---------- bridge to the lighthouse islet ----------
  {
    let xa = 150; while (xa < ISLET.x && height(xa, ISLET.z) > -0.3) xa += 1;
    const x0 = xa - 8, x1 = ISLET.x - ISLET.r + 6, L = x1 - x0, n = Math.ceil(L / 0.9);
    const plank = new THREE.InstancedMesh(new THREE.BoxGeometry(0.85, 0.25, 5), std(0xffffff, { x: { map: TEX.wood('#b88550', 4) } }), n);
    const deckY = (u) => 1.4 + Math.sin(u * Math.PI) * 4;
    for (let i = 0; i < n; i++) { const u = i / (n - 1); dummy.position.set(x0 + u * L, deckY(u), ISLET.z); dummy.rotation.set(0, 0, Math.cos(u * Math.PI) * 0.4); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); plank.setMatrixAt(i, dummy.matrix); }
    plank.castShadow = plank.receiveShadow = true; world.add(plank);
    for (const s of [-1, 1]) {
      const pts = []; for (let i = 0; i <= 24; i++) { const u = i / 24; pts.push(new THREE.Vector3(x0 + u * L, deckY(u) + 1.1, ISLET.z + s * 2.4)); }
      world.add(mk(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.12, 6), std(0xff6b4f, { r: 0.4 })));
      for (let i = 0; i <= 8; i++) { const u = i / 8; const post = mk(new THREE.CylinderGeometry(0.1, 0.1, 1.2, 6), std(0xffffff)); post.position.set(x0 + u * L, deckY(u) + 0.6, ISLET.z + s * 2.4); world.add(post); }
    }
    for (const u of [0.3, 0.7]) { const pier = mk(new THREE.CylinderGeometry(0.9, 1.1, 8, 10), std(0xd8d0c0)); pier.position.set(x0 + u * L, deckY(u) - 4.2, ISLET.z); world.add(pier); }
  }

  // ---------- hot-air balloons ----------
  const stripes = [[0xff6b4f, 0xffc93c], [0x13a9c2, 0xffffff], [0x2f9e5b, 0xffc93c], [0xff4f8b, 0xffffff]];
  for (let i = 0; i < 4; i++) {
    const g = new THREE.Group();
    const bg = new THREE.SphereGeometry(5, 16, 14); bg.scale(1, 1.2, 1);
    const p = bg.attributes.position, col = new Float32Array(p.count * 3);
    for (let v = 0; v < p.count; v++) { const ang = Math.atan2(p.getZ(v), p.getX(v)); c.set(stripes[i][Math.floor(((ang + Math.PI) / (Math.PI * 2)) * 12) % 2]); col.set([c.r, c.g, c.b], v * 3); }
    bg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.add(mk(bg, std(0xffffff, { r: 0.6, x: { vertexColors: true } })));
    const basket = mk(new THREE.BoxGeometry(1.6, 1.2, 1.6), std(0x8a5a2b)); basket.position.y = -8; g.add(basket);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const rope = mk(new THREE.CylinderGeometry(0.04, 0.04, 3.4, 4), std(0x5a3a1e), false); rope.position.set(sx * 0.9, -6, sz * 0.9); rope.rotation.set(sz * 0.25, 0, -sx * 0.25); g.add(rope); }
    world.add(g);
    const cx = rr(-120, 160), cz = rr(-260, 40), rad = rr(40, 90), h = rr(55, 85), spd = rr(0.008, 0.02), ph = R() * 6;
    ups.push((dt, t) => { const a = ph + t * spd; g.position.set(cx + Math.cos(a) * rad, h + Math.sin(t * 0.3 + i) * 3, cz + Math.sin(a) * rad); g.rotation.y = t * 0.05; });
  }

  // ---------- WIDR 64 blimp ----------
  {
    const g = new THREE.Group();
    const body = mk(new THREE.CapsuleGeometry(4, 14, 8, 20), std(0xfff4dc, { r: 0.4 })); body.rotation.z = Math.PI / 2; g.add(body);
    const banner = mk(new THREE.PlaneGeometry(12, 3), std(0xffffff, { x: { map: TEX.label('WIDR 64', '#ff6b4f', '#fff4dc'), side: THREE.DoubleSide } }), false); banner.position.set(0, 0, 4.05); g.add(banner);
    const banner2 = banner.clone(); banner2.position.z = -4.05; g.add(banner2);
    const gond = mk(new THREE.BoxGeometry(4, 1.4, 1.8), std(0x123247)); gond.position.y = -4.4; g.add(gond);
    for (const [y, z] of [[3.5, 0], [-3.5, 0], [0, 3.5], [0, -3.5]]) { const fin = mk(new THREE.BoxGeometry(3, y ? 2.6 : 0.3, z ? 2.6 : 0.3), std(0xff6b4f)); fin.position.set(-10, y * 0.8, z * 0.8); g.add(fin); }
    world.add(g);
    ups.push((dt, t) => { const a = t * 0.025; g.position.set(40 + Math.cos(a) * 190, 95 + Math.sin(t * 0.2) * 4, -110 + Math.sin(a) * 190); g.rotation.y = -a - Math.PI / 2; });
  }

  return { update: (dt, t) => ups.forEach((u) => u(dt, t)) };
}
