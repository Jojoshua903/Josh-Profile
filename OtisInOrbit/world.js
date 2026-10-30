import { THREE, scene, toon, addOutline, V3 } from './core.js';
import { groundAt, groundMin, pathX, ARENA, RAVINE_Z } from './terrain.js';
import { addCookie, line, circle } from './cookies.js';

export const boxes = [];
export const movers = [];
export const lamps = [];
const edgeMat = new THREE.LineBasicMaterial({ color: 0x2b2440, transparent: true, opacity: 0.55 });

export function syncBox(b) { b.min.copy(b.pos).sub(b.half); b.max.copy(b.pos).add(b.half); }
function solid(x, y, z, w, h, d, extra = {}) {
  const b = { pos: V3(x, y, z), half: V3(w / 2, h / 2, d / 2), min: V3(), max: V3(), ...extra };
  syncBox(b); boxes.push(b); return b;
}
function block(x, y, z, w, h, d, top, side, extra = {}, edges = true) {
  const ms = toon(side), mt = toon(top);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [ms, ms, mt, ms, ms, ms]);
  mesh.position.set(x, y, z);
  mesh.castShadow = mesh.receiveShadow = true;
  if (edges) mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), edgeMat));
  scene.add(mesh);
  const b = solid(x, y, z, w, h, d, extra);
  b.mesh = mesh; b.pos = mesh.position; syncBox(b);
  return b;
}
let hs = 3;
const hr = () => ((hs = (hs * 16807) % 2147483647) / 2147483647);

// ---------- huisjes ----------
const WALLS = [0x9a9aa6, 0x8b94a8, 0xa49c94, 0x8790a0];
export const winOn = new THREE.MeshBasicMaterial({ color: 0xffc46b });
export const winOff = new THREE.MeshBasicMaterial({ color: 0x3a4058 });
const doorMat = toon(0x4a3c3a);

function house(x, z, w, d, h, { top, chimney = 0, face = 1 } = {}) {
  const base = groundMin(x, z, w, d);
  const T = top ?? groundAt(x, z, Math.max(w, d) / 2) + h;
  const bottom = base - 3;
  block(x, (T + bottom) / 2 - 0.2, z, w, T - bottom - 0.4, d, 0x585e74, WALLS[Math.floor(hr() * WALLS.length)]);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.45, d + 0.6), toon(0x4c5266));
  roof.position.set(x, T - 0.22, z); roof.castShadow = roof.receiveShadow = true;
  roof.add(new THREE.LineSegments(new THREE.EdgesGeometry(roof.geometry), edgeMat));
  scene.add(roof);
  solid(x, T - 0.22, z, w + 0.6, 0.45, d + 0.6);
  for (const [nx, nz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const span = nx ? d : w, n = Math.max(1, Math.floor(span / 1.6));
    for (let k = 0; k < n; k++) for (let fy = base + 1.6; fy < T - 1; fy += 1.8) {
      if (hr() < 0.35) continue;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.7), hr() < 0.3 ? winOn : winOff);
      const off = (k + 0.5) * (span / n) - span / 2;
      m.position.set(x + nx * (w / 2 + 0.01) + (nz ? off : 0), fy, z + nz * (d / 2 + 0.01) + (nx ? off : 0));
      m.rotation.y = nx ? (nx > 0 ? Math.PI / 2 : -Math.PI / 2) : (nz > 0 ? 0 : Math.PI);
      scene.add(m);
    }
  }
  const door = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.4), doorMat);
  door.position.set(x, groundAt(x, z + face * (d / 2 + 0.5), 0) + 0.7, z + face * (d / 2 + 0.02));
  door.rotation.y = face > 0 ? 0 : Math.PI;
  scene.add(door);
  if (chimney) block(x + w * 0.25, T + chimney / 2, z - d * 0.2, 0.9, chimney, 0.9, 0x3a3e4e, 0x6c6470);
  return { top: T };
}

// north half of town
house(-7, -14, 4, 3.5, 4); house(7, -15, 3.5, 4, 3.5);
house(-11, -20, 3.5, 3.5, 4.5); house(11, -21, 3.5, 3.5, 4);
house(-6, -25, 4, 4, 5, { chimney: 1.2 }); house(6, -27, 3.5, 3.5, 4);
house(-17, -16, 3.5, 3.5, 3.5); house(17, -23, 3.5, 3.5, 4);
house(-24, -24, 3.5, 3.5, 4); house(24, -15, 3.5, 3.5, 3.5);
house(-12.5, -31, 3.5, 3, 4); house(-6.5, -31, 3.5, 3, 4);          // the alley between these two
// south half, across the ravine
house(-7, -43, 3.5, 3.5, 4, { face: -1 }); house(7, -45, 4, 3.5, 4.5, { face: -1 });
house(-11, -51, 3.5, 3.5, 5); house(11, -52, 3.5, 3.5, 4);
house(-23, -46, 3.5, 3.5, 4);                                           // stepping stone to the cable house
house(-17.5, -46, 3.5, 3.5, 0, { top: 12 });                            // cable house
export const chimneyHouse = house(22, -54, 3.5, 3.5, 4, { chimney: 3.2 });
house(18, -42, 3.5, 3.5, 3.5);

export const crates = [];
export function crate(x, z, rare = false) {
  const g = groundAt(x, z, 0.5);
  const b = block(x, g + 0.5, z, 1, 1, 1, 0xa07040, 0x8a5d34, { crate: true, rare, id: 'k' + crates.length });
  crates.push(b);
  const x1 = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.14, 0.14), toon(0x5e3d22));
  x1.rotation.z = Math.PI / 4; x1.position.z = 0.47; b.mesh.add(x1);
  const x2 = x1.clone(); x2.rotation.z = -Math.PI / 4; b.mesh.add(x2);
  // light leaking out of the crate gives away what's inside: purple = kosmisch koekje, gold = koekjes
  const col = rare ? 0x9b6bff : 0xffc23d;
  b.mesh.material.forEach((m) => m.emissive.set(rare ? 0x2a1460 : 0x2a1a00));
  const leak = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
  for (const [px, pz, ry] of [[0, 0.505, 0], [0, -0.505, 0], [0.505, 0, Math.PI / 2], [-0.505, 0, Math.PI / 2]]) {
    const crack = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.06), leak);
    crack.position.set(px, 0.12, pz); crack.rotation.y = ry; b.mesh.add(crack);
    const crack2 = crack.clone(); crack2.position.y = -0.2; b.mesh.add(crack2);
  }
  const light = new THREE.PointLight(col, rare ? 6 : 2.5, rare ? 6 : 4, 2);
  light.position.y = 0.8; b.mesh.add(light);
  lamps.push({ flicker: light, base: rare ? 6 : 2.5, seed: x + z });
  return b;
}
crate(-9.5, -31, true);
crate(-4, 22); crate(14, -28); crate(-14, -56);

// ---------- brug over de kloof ----------
block(0, 1.8, RAVINE_Z, 3, 0.4, 7.5, 0x6b5a4a, 0x55473a);
for (const xx of [-1.4, 1.4]) block(xx, 2.5, RAVINE_Z, 0.2, 1, 7.5, 0x55473a, 0x55473a, {}, false);
// broken planks over the gap in the mist path
for (const [dx, dz, r] of [[-1.2, 5.3, 0.2], [1, -0.2, -0.3]]) {
  const p = new THREE.Mesh(new THREE.BoxGeometry(1, 0.15, 1.8), toon(0x55473a));
  p.position.set(pathX(dz) + dx, 0.8, dz); p.rotation.set(r, 0.4, r * 0.5); scene.add(p);
}

// ---------- kabel van het hoge dak naar een paal ----------
block(-12.5, 11.85, -46, 7.5, 0.3, 0.35, 0x2b2b38, 0x2b2b38, {}, false);
{
  const gp = groundAt(-8, -46, 0.6);
  block(-8, (gp + 11.5) / 2, -46, 0.5, 11.5 - gp, 0.5, 0x4a4c5c, 0x3a3e4e, {}, false);
  block(-8, 11.75, -46, 1.6, 0.5, 1.6, 0x6b5a4a, 0x55473a);
}

// ---------- de klif: richels omhoog naar de top ----------
export const LEDGES = [[-6, 7], [1, 9.5], [7, 12], [1, 14.5], [-6, 17]];
for (const [x, top] of LEDGES) block(x, top - 1, -60.5, 6, 2, 3, 0x7a7c8c, 0x55586a);

// ---------- de telescoop, aan het eind van de reis ----------
const stone = [0xa3a2ac, 0x7c7b88];
block(0, 21.5, -100, 7, 7, 7, ...stone);
for (const y of [19.5, 23.5]) {
  const band = new THREE.Mesh(new THREE.BoxGeometry(7.3, 0.35, 7.3), toon(0x5a5868));
  band.position.set(0, y, -100); scene.add(band);
}
export const telescope = new THREE.Group();
{
  const g = telescope; g.position.set(0, 25, -100); scene.add(g);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(2.6, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2), toon(0x6c6f84));
  addOutline(dome, 1.03); g.add(dome);
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.05, 7, 16), toon(0x8a8ea4));
  tube.position.set(0, 3, 1.2); tube.rotation.set(0.75, 0, 0.25); addOutline(tube, 1.04); g.add(tube);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff3b30 }));
  lamp.position.set(-0.9, 5.6, 3.8); g.add(lamp);
  // a glow sprite that cuts through the fog, so you can see your goal from the crash site
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'); const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,90,70,1)'); gr.addColorStop(0.3, 'rgba(255,60,50,.5)'); gr.addColorStop(1, 'rgba(255,40,40,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), fog: false, depthWrite: false, transparent: true }));
  glow.scale.set(6, 6, 1); glow.position.copy(lamp.position); g.add(glow);
  const red = new THREE.PointLight(0xff3b30, 14, 24, 2); red.position.copy(lamp.position); g.add(red);
  lamps.push({ blink: lamp, glow, light: red });
}

// ---------- Otis' neergestorte raket ----------
export const rocket = new THREE.Group();
{
  const r = rocket;
  r.position.set(4, -0.4, 22); r.rotation.set(0.25, -0.6, 0.55);
  const add = (m, ol = 1.05) => { m.castShadow = true; if (ol) addOutline(m, ol); r.add(m); return m; };
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.0, 3.2, 24), toon(0xfbf3e4))).position.y = 1.8;
  add(new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.4, 24), toon(0xff5a36))).position.y = 4.1;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 3;
    const f = add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.3, 0.9), toon(0xff5a36)));
    f.position.set(Math.sin(a) * 1.05, 0.75, Math.cos(a) * 1.05); f.rotation.y = a;
  }
  add(new THREE.Mesh(new THREE.CircleGeometry(0.42, 32), new THREE.MeshBasicMaterial({ color: 0x9ad8ff })), 0).position.set(0, 2.5, 0.95);
  scene.add(r);
  solid(4, 1.2, 22, 3, 2.4, 3);
}

// ---------- lantaarns ----------
const postMat = toon(0x2f3242);
const glassMat = new THREE.MeshBasicMaterial({ color: 0xffd28a });
function lantern(x, z, lit = true) {
  const g = groundAt(x, z, 0.2);
  const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 3), postMat);
  p.position.set(x, g + 1.5, z); p.castShadow = true; scene.add(p);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.45, 0.35), lit ? glassMat : winOff);
  head.position.set(x, g + 3.1, z); addOutline(head, 1.12); scene.add(head);
  solid(x, g + 1.5, z, 0.3, 3, 0.3);
  if (lit) {
    const l = new THREE.PointLight(0xffb45e, 9, 13, 2);
    l.position.set(x, g + 3, z); scene.add(l);
    lamps.push({ flicker: l, base: 9, seed: x * 7 + z });
  }
}
lantern(6, 28);
lantern(pathX(9) + 2.4, 9, false); lantern(pathX(-5) - 2.4, -5, false);
lantern(3, -12); lantern(-3, -22, false); lantern(3, -33); lantern(-3, -41); lantern(3, -56, false);
lantern(-4, -66); lantern(4, -76, false);

// ---------- sfeer ----------
const fogMat = new THREE.MeshBasicMaterial({ color: 0xc4cbdc, transparent: true, opacity: 0.1, depthWrite: false });
function fogBank(x, y, z, s, n = 6) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(s * (0.6 + hr() * 0.6), 14, 10), fogMat);
    m.position.set(x + (hr() - 0.5) * s * 2, y + (hr() - 0.5) * s * 0.6, z + (hr() - 0.5) * s * 2);
    scene.add(m);
  }
}
fogBank(-35, 8, -45, 4, 9);      // hides the ledge
fogBank(15.5, 4, -66, 3, 7);     // hides the notch
fogBank(pathX(2), -1, 2, 3, 5);  // the gap in the path
fogBank(-38, 8, -20, 5); fogBank(38, 8, -30, 5); fogBank(0, 4, 44, 5); fogBank(-26, 20, -80, 5); fogBank(26, 20, -94, 5);
export { fogMat };

export const dust = (() => {
  const n = 700, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = (hr() - 0.5) * 70; pos[i * 3 + 1] = hr() * 30; pos[i * 3 + 2] = 30 - hr() * 140; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xdfe6ff, size: 0.09, transparent: true, opacity: 0.7, depthWrite: false }));
  scene.add(p); return p;
})();
{
  const n = 900, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = hr() * 2 - 1, a = hr() * Math.PI * 2, s = Math.sqrt(1 - u * u);
    pos[i * 3] = Math.cos(a) * s * 300; pos[i * 3 + 1] = Math.abs(u) * 300 - 40; pos[i * 3 + 2] = Math.sin(a) * s * 300;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 1.2, sizeAttenuation: false, fog: false })));
  const pm = toon(0x9fb4e8); pm.fog = false;
  const planet = new THREE.Mesh(new THREE.SphereGeometry(40, 32, 20), pm);
  planet.position.set(-160, 90, -260); scene.add(planet);
}

// ---------- koekjes ----------
const onGround = (dy = 0.9) => (x, z) => groundAt(x, z, 0) + dy;
circle([0, 0, 26], 7, 10, onGround());
for (let z = 12; z >= -8; z -= 3) if (z > 6 || z < -1) addCookie(pathX(z), groundAt(pathX(z), z, 0) + 0.9, z);
for (let z = -12; z >= -58; z -= 4) if (Math.abs(z - RAVINE_Z) > 3) addCookie(0, 2.9, z);
line([-8, 0, RAVINE_Z], [8, 0, RAVINE_Z], 5, () => -1.1);      // through the ravine, under the bridge
line([-14, 12.9, -46], [-10, 12.9, -46], 3);                    // along the cable
LEDGES.forEach(([x, top]) => addCookie(x, top + 0.9, -60.5));
line([0, 18.9, -66], [0, 18.9, -74], 4);
circle([4, 0, -48], 2, 6, onGround(1.2));                        // around the springmot

addCookie(pathX(-6) + 4.6, groundAt(pathX(-6) + 4.6, -6, 0) + 0.9, -6, 'Boven op de rotsen');
addCookie(0, -0.9, RAVINE_Z, 'Onder de brug');
addCookie(-8, 12.9, -46, 'Aan het eind van de kabel');
addCookie(22 + 3.5 * 0.25, chimneyHouse.top + 3.2 + 0.9, -54 - 3.5 * 0.2, 'Op de hoogste schoorsteen');
addCookie(-35.5, 7, -45, 'Verstopt in de mist');
addCookie(15.5, 3, -67.5, 'In de spleet van de klif');
export const ARENA_ENTRY = V3(0, 18, -66);
export const ARENA_POS = V3(ARENA.x, ARENA.y, ARENA.z);

// ---------- spawn, checkpoints, and the trip to the next planet ----------
export const SPAWN = V3(0, 0, 34);
export const CHECKPOINTS = [
  { test: (p, cp) => p.z < -10 && cp.z > -10, pos: V3(0, 2, -11) },
  { test: (p) => p.z < -64 && p.y > 17, pos: ARENA_ENTRY },
];
export const PLANET = 'mistmaan';
export const TRAVEL = { pos: V3(4, 0, 22), need: 7, planet: 'berg', target: 'berg/index.html', name: 'de Bergwereld', label: 'Opstijgen naar de Bergwereld' };
