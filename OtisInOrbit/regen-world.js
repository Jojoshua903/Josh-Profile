import { THREE, scene, toon, addOutline, V3, label } from './core.js?v=sub1';
import { addCookie, line, circle } from './cookies.js?v=sub1';
import { groundAt, CANAL, WATER_Y, TOWER, ARENA, ROBIN_ROOF } from './regen-terrain.js?v=sub1';
import { boxes, movers, lamps, crates, anim, syncBox, solid, block, pillar, hr, gy, mesh, crate, sign, neon, stairs } from './regen-kit.js?v=sub1';
export { boxes, movers, lamps, crates, anim, syncBox };

export const winOn = new THREE.MeshBasicMaterial({ color: 0xffc46b });
export const winOff = new THREE.MeshBasicMaterial({ color: 0x4a5a70 });
export const fogMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, depthWrite: false });

// ---------- night, rain ----------
export const rain = { k: 1 };       // how hard it rains: Robin's mood (1 = crying his eyes out, 0 = happy)
{
  const hemi = scene.children.find((o) => o.isHemisphereLight);
  const sunL = scene.children.find((o) => o.isDirectionalLight);
  if (hemi) { hemi.color.setHex(0x8a8ad8); hemi.groundColor.setHex(0x2a1a3a); hemi.intensity = 1.1; }
  if (sunL) { sunL.color.setHex(0xb8b8ff); sunL.intensity = 0.8; sunL.position.set(-20, 40, 20); }
  scene.fog = new THREE.FogExp2(0x1a1438, 0.012);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(8, 20, 14), new THREE.MeshBasicMaterial({ color: 0xe8e0ff, fog: false })); moon.position.set(-80, 70, -140); scene.add(moon);
}
const RAIN_N = 900;
const rainGeo = new THREE.BufferGeometry();
const rainPos = new Float32Array(RAIN_N * 6);
const drops = Array.from({ length: RAIN_N }, () => ({ x: (hr() - 0.5) * 70, y: hr() * 30, z: (hr() - 0.5) * 70 }));
rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
const rainMat = new THREE.LineBasicMaterial({ color: 0x9ab8ff, transparent: true, opacity: 0.55 });
const rainLines = new THREE.LineSegments(rainGeo, rainMat); rainLines.frustumCulled = false; scene.add(rainLines);
function updateRain(dt, P) {
  const n = Math.floor(RAIN_N * (0.15 + 0.85 * rain.k));
  const cx = P ? P.pos.x : 0, cz = P ? P.pos.z : 0, cy = P ? P.pos.y : 0;
  for (let i = 0; i < RAIN_N; i++) {
    const d = drops[i];
    d.y -= dt * 26;
    if (d.y < cy - 8) { d.y = cy + 18 + hr() * 6; d.x = cx + (hr() - 0.5) * 60; d.z = cz + (hr() - 0.5) * 60; }
    const on = i < n;
    rainPos.set([d.x, d.y, d.z, d.x - 0.08, on ? d.y + 0.7 : d.y, d.z], i * 6);
  }
  rainGeo.attributes.position.needsUpdate = true;
  rainMat.opacity = 0.25 + 0.4 * rain.k;
}

// ---------- the canal ----------
{
  const water = new THREE.Mesh(new THREE.PlaneGeometry(104, CANAL.z1 - CANAL.z0), new THREE.MeshBasicMaterial({ color: 0x1a3a6a, transparent: true, opacity: 0.85 }));
  water.rotation.x = -Math.PI / 2; water.position.set(0, WATER_Y, (CANAL.z0 + CANAL.z1) / 2); scene.add(water);
  // the neon on the water
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(104, 0.3), new THREE.MeshBasicMaterial({ color: 0xff4ad8, transparent: true, opacity: 0.5 }));
  glow.rotation.x = -Math.PI / 2; glow.position.set(0, WATER_Y + 0.02, CANAL.z0 + 0.6); scene.add(glow);
  for (const x of [-3, 3, 29, 35]) mesh(new THREE.CylinderGeometry(0.1, 0.1, 3), toon(0x5a5a6a), x, 1.5, CANAL.z0, scene, 0);
}
// the tour boat: up and down the canal
export const BOAT = { x: 0, z: (CANAL.z0 + CANAL.z1) / 2, deck: WATER_Y + 0.6, roof: WATER_Y + 2.2 };
{
  const boat = block(0, BOAT.deck - 0.3, BOAT.z, 6, 0.6, 2.6, 0x6a4a3a, 0x3a2a20);
  const cabin = block(0, (BOAT.deck + BOAT.roof) / 2, BOAT.z, 2.6, BOAT.roof - BOAT.deck, 2, 0xff6ad8, 0x8a3a8a);
  const at = (t) => Math.sin(t * 0.12) * 40;
  boat.mover = { b: boat, delta: V3(), fn(t) { BOAT.x = at(t); return V3(BOAT.x, BOAT.deck - 0.3, BOAT.z); } };
  cabin.mover = { b: cabin, delta: V3(), fn(t) { return V3(at(t), (BOAT.deck + BOAT.roof) / 2, BOAT.z); } };
  movers.push(boat.mover, cabin.mover);
}

// ---------- de luchttrein: an open tram running a loop over the city ----------
export const TRAIN_Y = 8.2;
const LOOP = [[0, 42, 1], [47, 42, 0], [47, -6, 1], [47, -50.5, 0], [0, -50.5, 1], [-47, -50.5, 0], [-47, -6, 1], [-47, 42, 0]];
const SPEED = 6.5, STOP = 3.5;
const timeline = [];
{
  let t = 0;
  for (let i = 0; i < LOOP.length; i++) {
    const [ax, az, stop] = LOOP[i], [bx, bz] = LOOP[(i + 1) % LOOP.length];
    if (stop) { timeline.push({ t0: t, t1: t + STOP, ax, az, bx: ax, bz: az }); t += STOP; }
    const d = Math.hypot(bx - ax, bz - az) / SPEED;
    timeline.push({ t0: t, t1: t + d, ax, az, bx, bz }); t += d;
  }
}
const LOOP_T = timeline[timeline.length - 1].t1;
export const train = { x: 0, z: 42, dir: 0 };
function trainAt(t) {
  const u = ((t % LOOP_T) + LOOP_T) % LOOP_T;
  const s = timeline.find((q) => u >= q.t0 && u < q.t1) || timeline[0];
  const k = s.t1 > s.t0 ? (u - s.t0) / (s.t1 - s.t0) : 0;
  if (s.bx !== s.ax || s.bz !== s.az) train.dir = Math.atan2(s.bx - s.ax, s.bz - s.az);
  return [s.ax + (s.bx - s.ax) * k, s.az + (s.bz - s.az) * k];
}
const car = block(0, TRAIN_Y - 0.25, 42, 4.4, 0.5, 4.4, 0x5a5aa8, 0x2a2a6a);
car.mover = { b: car, delta: V3(), fn(t) { const [x, z] = trainAt(t); train.x = x; train.z = z; return V3(x, TRAIN_Y - 0.25, z); } };
movers.push(car.mover);
const carLook = new THREE.Group(); scene.add(carLook);
{
  for (const [x, z] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.2), toon(0xffd04a), x, 0.6, z, carLook, 0);
  for (const s of [-1, 1]) { mesh(new THREE.BoxGeometry(4.2, 0.08, 0.08), toon(0xffd04a), 0, 1.2, 2 * s, carLook, 0); mesh(new THREE.BoxGeometry(0.08, 0.08, 4.2), toon(0xffd04a), 2 * s, 1.2, 0, carLook, 0); }
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff0a0 })); lamp.position.set(0, 0, 2.3); carLook.add(lamp);
  carLook.add(new THREE.PointLight(0xfff0a0, 4, 9, 2));
}
anim.push(() => { carLook.position.set(train.x, TRAIN_Y, train.z); carLook.rotation.y += (Math.atan2(Math.sin(train.dir - carLook.rotation.y), Math.cos(train.dir - carLook.rotation.y))) * 0.1; });
// the track: a beam with pillars (to look at; you ride the tram, not the beam)
{
  const beamMat = toon(0x3a3a5a);
  for (let i = 0; i < LOOP.length; i++) {
    const [ax, az] = LOOP[i], [bx, bz] = LOOP[(i + 1) % LOOP.length];
    const L = Math.hypot(bx - ax, bz - az); if (!L) continue;
    const b = mesh(new THREE.BoxGeometry(0.8, 0.5, L), beamMat, (ax + bx) / 2, TRAIN_Y - 0.8, (az + bz) / 2, scene, 0);
    b.rotation.y = Math.atan2(bx - ax, bz - az);
    for (let k = 0; k <= L; k += 12) { const x = ax + (bx - ax) * (k / L), z = az + (bz - az) * (k / L); mesh(new THREE.CylinderGeometry(0.35, 0.35, TRAIN_Y - 1), beamMat, x, (TRAIN_Y - 1) / 2, z, scene, 0); }
  }
}
// four stations, each with stairs up from the street
export const STATIONS = [];
function station(x, z, w, d, name, stair) {
  const p = block(x, TRAIN_Y - 0.2, z, w, 0.4, d, 0x6a6a8a, 0x3a3a5a);
  neon(x, TRAIN_Y - 0.42, z + (d > w ? 0 : d / 2), w > d ? w : 0.15, 0.08, w > d ? 0.15 : d, 0x4ad8ff);
  label(name, x, TRAIN_Y + 2.6, z, 3);
  stair();
  STATIONS.push({ x, z, name });
  return p;
}
station(0, 38.6, 6, 2.4, 'Station Plein', () => stairs(0, 29.5, 0, 1, 8));
station(43.4, -8, 2.4, 6, 'Station Hotel', () => stairs(43.4, 3, 0, -1, 8));
station(0, -47.1, 6, 2.4, 'Station Toren', () => stairs(0, -38, 0, -1, 8));
station(-43.4, -8, 2.4, 6, 'Station Flats', () => stairs(-43.4, 3, 0, -1, 8));
// a canopy over the Toren station, with a rare crate on top
{
  for (const dx of [-2.6, 2.6]) mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.6), toon(0x5a5a6a), dx, TRAIN_Y + 1.3, -46.4, scene, 0);
  block(0, TRAIN_Y + 2.7, -46.6, 6.4, 0.3, 2.6, 0x8a3a8a, 0x5a2a5a);
  crate(-1.6, -46.6, true, 'Op het stationsdak', TRAIN_Y + 2.85);
}
// over the tracks at the south-west corner: a cookie only reachable from the moving tram
addCookie(-47, TRAIN_Y + 2.6, 42, 'Boven het spoor');
neon(-47, TRAIN_Y + 3.6, 42, 3, 0.15, 0.15, 0xffd04a);

// ---------- de Kraaientoren: a lift up the west face ----------
export const LIFT = { x: 16.6, z: TOWER.z, lo: 0.2, hi: TOWER.h };
{
  const lift = block(LIFT.x, LIFT.lo, LIFT.z, 2.4, 0.4, 2.4, 0xffd04a, 0xa88a2a);
  let y = LIFT.lo;
  lift.mover = { b: lift, delta: V3(), fn(t) {
    const u = t % 16, k = u < 4 ? 0 : u < 8 ? (u - 4) / 4 : u < 12 ? 1 : (16 - u) / 4;
    y = LIFT.lo + (LIFT.hi - 0.2 - LIFT.lo) * (k * k * (3 - 2 * k));
    return V3(LIFT.x, y, LIFT.z);
  } };
  movers.push(lift.mover);
  for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.2, TOWER.h + 2, 0.2), toon(0x5a5a6a), LIFT.x - 1.1, (TOWER.h + 2) / 2, LIFT.z + 1.3 * s, scene, 0);
  sign(LIFT.x - 2.4, LIFT.z + 3, 'Lift ↑ Kraaientoren', 0, 0);
  // the crow's nest up top: a ring of junk, with shiny things in it
  const nestMat = toon(0x5a3a2a);
  for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2; const m = mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.4), nestMat, TOWER.x + Math.cos(a) * 8.6, TOWER.h + 0.4, TOWER.z + Math.sin(a) * 8.6, scene, 0); m.rotation.set(hr(), a, Math.PI / 2 + hr() * 0.4); }
  label('KRAAIENTOREN', TOWER.x, TOWER.h - 2, TOWER.z + 10.05, 6);
}

// ---------- Robin's roof, and the way up: fire escape, then neon signs ----------
export const ROBIN_AT = V3(ROBIN_ROOF.x, ROBIN_ROOF.h, ROBIN_ROOF.z);
{
  stairs(-3, -27, -1, 0, 7);
  neon(-13.5, 8.4, -32, 2, 0.3, 2, 0xff4ad8);
  neon(-17, 9.8, -32, 2, 0.3, 2, 0x4ad8ff);
  neon(-20.4, 11.2, -32, 2, 0.3, 2, 0xffd04a);
  // the bench, the record player, a little lamp
  const y = ROBIN_ROOF.h;
  block(ROBIN_AT.x, y + 0.25, ROBIN_AT.z - 1.4, 3, 0.5, 1, 0x8a5a3a, 0x5a3a2a);
  block(ROBIN_AT.x + 2.6, y + 0.4, ROBIN_AT.z - 1.4, 1, 0.8, 1, 0x3a2a4a, 0x2a1a3a);
  const disc = mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.04, 20), toon(0x1a1a24), ROBIN_AT.x + 2.6, y + 0.84, ROBIN_AT.z - 1.4, scene, 0);
  anim.push((t) => { disc.rotation.y = t * 3; });
  const lampPost = mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.6), toon(0x5a5a6a), ROBIN_AT.x - 2.2, y + 1.3, ROBIN_AT.z - 1.8, scene, 0); void lampPost;
  const bulb = new THREE.PointLight(0xffd88a, 5, 8, 2); bulb.position.set(ROBIN_AT.x - 2.2, y + 2.7, ROBIN_AT.z - 1.8); scene.add(bulb);
  label('♪ Flemming ♪', ROBIN_AT.x + 2.6, y + 1.8, ROBIN_AT.z - 1.4, 2.2);
}
export const PLAYER_AT = V3(ROBIN_AT.x + 2.6, ROBIN_ROOF.h + 0.8, ROBIN_AT.z - 1.4);

// ---------- het plein, bioscoop, snackbar ----------
{
  // the cinema: fire escape up the east side, a big sign on the roof
  stairs(-11, 17, 0, 1, 4);
  neon(-21.5, 5.4, 23, 2, 0.3, 2, 0xff4ad8);
  neon(-23.5, 6.8, 25, 2, 0.3, 2, 0x4ad8ff);
  neon(-21.5, 8.2, 27, 2, 0.3, 2, 0xffd04a);
  pillar(-19, 27, 3, 1, 4, 9.2, 0xffd04a, 0xa88a2a);
  label('BIOSCOOP', -19, 7.4, 27.52, 4.4);
  // the snack bar: stairs on the west side
  stairs(11, 23, 0, -1, 6);
  label('SNACKBAR', 17, 4.4, 24.05, 4);
  // the billboard over the garages: only a dash from the snack bar roof gets you there
  pillar(31, 22, 1, 1, 3, 9, 0x3a3a4a, 0x2a2a3a);
  const bb = neon(31, 9.2, 22, 4, 0.4, 3, 0x8aff6a);
  label('DRINK REGEN-COLA', 31, 11.2, 23.6, 4.6);
  void bb;
  addCookie(31, 10.6, 22, 'Op het reclamebord');
  // the square: a fountain, a phone box
  pillar(-3, -6, 1.2, 1.2, 0, 2.4, 0xe0443a, 0xb0302a);
  label('☎', -3, 3, -5.38, 0.8);
  sign(4, 46, 'De Regenstad', 0);
  sign(-6, 30, '↑ Station Plein · ← Bioscoop · → Snackbar', 0);
}
// ---------- the hotel and the offices ----------
{
  stairs(27, -1, 1, 0, 6);
  pillar(27.5, -8, 2, 2, 6, 8.5, 0x6a6a7a, 0x4a4a5a);     // an air-con box on the hotel roof
  label('HOTEL', 33, 4.4, -1.95, 3);
}
// the flats roof (from the Flats station): a satellite dish
{
  pillar(-36, -10, 1.4, 1.4, 8, 9.6, 0x8a8a9a, 0x5a5a6a);
  const dish = mesh(new THREE.SphereGeometry(1.2, 14, 10, 0, Math.PI * 2, 0, Math.PI / 3), toon(0xd8d8e8), -36, 10.4, -10, scene, 0); dish.rotation.x = Math.PI;
}

// ---------- coins ----------
line([0, 0.9, 40], [0, 0.9, 32], 4);
line([-11, 1.9, 17], [-11, 4.9, 20], 4);
line([0, TRAIN_Y + 0.9, -40], [0, TRAIN_Y + 0.9, -32], 3);
circle([ROBIN_AT.x, ROBIN_ROOF.h + 0.9, ROBIN_AT.z + 2], 2.5, 6);
line([30, 6.9, -6], [36, 6.9, -12], 4);
line([-30, 0.9, 0], [-14, 0.9, 0], 5);
line([16, 0.9, -24], [16, 0.9, -44], 5);

// ---------- checkpoints ----------
export const FLAGS = [[2, 36], [-8, 12], [24, 0], [-38, -20], [12, -32], [-6, -26]].map(([x, z]) => {
  const p = V3(x, gy(x, z), z);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4), toon(0x3a3e4e)); pole.position.set(p.x, p.y + 1.2, p.z); scene.add(pole);
  const mat = new THREE.MeshBasicMaterial({ color: 0x9a948a, side: THREE.DoubleSide });
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), mat); cloth.position.set(p.x + 0.45, p.y + 2.1, p.z); scene.add(cloth);
  return { pos: p, mat };
});

// ---------- spawn, rocket ----------
export const SPAWN = V3(0, 0, 47);
export const ARENA_ENTRY = V3(14, 0, -38);
export const ARENA_POS = V3(ARENA.x, ARENA.y, ARENA.z);
export const CHECKPOINTS = FLAGS.map((f) => ({ test: (p) => Math.hypot(p.x - f.pos.x, p.z - f.pos.z) < 3 && Math.abs(p.y - f.pos.y) < 2, pos: f.pos }));
export const PLANET = 'regen';
export const rocket = new THREE.Group();
{
  const r = rocket; r.position.set(7, 0, 47); r.rotation.y = -0.3;
  const add = (m, ol = 1.05) => { m.castShadow = true; if (ol) addOutline(m, ol); r.add(m); return m; };
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.0, 3.2, 24), toon(0xfbf3e4))).position.y = 1.8;
  add(new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.4, 24), toon(0xff5a36))).position.y = 4.1;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 3;
    const f = add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.3, 0.9), toon(0xff5a36))); f.position.set(Math.sin(a) * 1.05, 0.75, Math.cos(a) * 1.05); f.rotation.y = a;
  }
  add(new THREE.Mesh(new THREE.CircleGeometry(0.42, 32), new THREE.MeshBasicMaterial({ color: 0x9ad8ff })), 0).position.set(0, 2.5, 0.95);
  scene.add(r);
  solid(7, 1.6, 47, 2.4, 3.2, 2.4);
}
export const TRAVEL = {
  pos: V3(7, 0, 47),
  dests: [
    { need: 12, planet: 'wolk', name: 'de Wolkeneilanden', label: 'Naar de Wolkeneilanden' },
    { need: 0, planet: 'feest', name: 'de Feestplaneet', label: 'Terug naar de Feestplaneet' },
    { need: 0, planet: 'tempel', name: 'de Vergeten Tempel', label: 'Terug naar de Vergeten Tempel' },
    { need: 0, planet: 'water', name: 'de Waterplaneet', label: 'Terug naar de Waterplaneet' },
    { need: 0, planet: 'zon', name: 'de Zon', label: 'Terug naar de Zon' },
    { need: 0, planet: 'schroot', name: 'de Schroothoop', label: 'Terug naar de Schroothoop' },
    { need: 0, planet: 'bos', name: 'het Paddenstoelenbos', label: 'Terug naar het Paddenstoelenbos' },
    { need: 0, planet: 'berg', name: 'de Bergwereld', label: 'Terug naar de Bergwereld' },
    { need: 0, planet: 'mistmaan', name: 'de Mistmaan', label: 'Terug naar de Mistmaan' },
  ],
};
// neon sparkles in the wet air
export const dust = (() => {
  const n = 300, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = (hr() - 0.5) * 100; pos[i * 3 + 1] = hr() * 20; pos[i * 3 + 2] = (hr() - 0.5) * 100; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.12, color: 0xff9ad8, transparent: true, opacity: 0.6, depthWrite: false }));
  scene.add(p); return p;
})();

export function updateWorld(t, dt, P) {
  for (const f of anim) f(t, dt);
  updateRain(dt, P);
}
void groundAt; void WATER_Y;
