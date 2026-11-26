// Ridgeline hazards: the creeping Shadow Fog and co-op pressure-plate doors
import { THREE, C, CX, SIZE, scene, maze, rayTargets, sfx, flake, disposeTree, MAZE_C, CAMP_C, GRID } from './world.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;

/* ================= Shadow Fog ================= */
export let GRACE = 30, CREEP = 360;
// follows the current maze size (wider tiles = bigger maze)
export const halfSize = () => SIZE / 2 + 2;
/** Fog pace from the trail board: 0 gentle (7 min), 1 standard (5 min), 2 brutal (3 min). */
// creep time grows with the tile size so wider corridors don't make the Shadow unfair
export function setGrace(g) { GRACE = g; }
// the Shadow also gets more time on the bigger 33-tile maze (it was tuned on 25 tiles)
export function setPace(p) { CREEP = ([420, 300, 180][p] ?? 300) * (MAZE_C / CAMP_C) * .8 * Math.pow(GRID / 25, 1.5); GRACE = [45, 30, 20][p] ?? 30; }
export function showFog(v) { curtains.forEach((m) => m.visible = v); floors.forEach((m) => m.visible = v); motes.visible = v; }
/** Half-width of the still-lit square around the centre, in metres. */
export function fogRadius(t) { const H = halfSize(); return t < GRACE ? H : H * (1 - Math.min(1, (t - GRACE) / CREEP)); }
export const chebyshev = (x, z) => Math.max(Math.abs(x - CX), Math.abs(z - CX));
/** Metres inside the fog (negative = still in the light). */
export const fogDepth = (x, z, t) => chebyshev(x, z) - fogRadius(t);

// a swirling purple curtain along the fog edge
const curtainTex = (() => {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(70,30,110,0)'); gr.addColorStop(.45, 'rgba(60,22,95,.55)'); gr.addColorStop(1, 'rgba(30,10,50,.95)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
  for (let i = 0; i < 70; i++) {
    const x = Math.random() * 256, y = 30 + Math.random() * 98, r = 10 + Math.random() * 30;
    const b = g.createRadialGradient(x, y, 0, x, y, r); b.addColorStop(0, 'rgba(120,60,170,.35)'); b.addColorStop(1, 'rgba(120,60,170,0)');
    g.fillStyle = b; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; return t;
})();
const curtainMat = new THREE.MeshBasicMaterial({ map: curtainTex, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: false });
const floorMat = new THREE.MeshBasicMaterial({ color: 0x24123a, transparent: true, opacity: .7, depthWrite: false, toneMapped: false });
const curtains = [0, 1, 2, 3].map(() => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 36), curtainMat); m.renderOrder = 2; scene.add(m); return m; });
const floors = [0, 1, 2, 3].map(() => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), floorMat); m.rotation.x = -Math.PI / 2; m.position.y = .06; m.renderOrder = 1; scene.add(m); return m; });

// drifting shadow motes inside the fog
const MOTES = 900, moteGeo = new THREE.BufferGeometry(), motePos = new Float32Array(MOTES * 3), moteHome = new Float32Array(MOTES * 3);
let moteCX = null;
function homeMotes() { moteCX = CX; const w = halfSize() * 2 + 16; for (let i = 0; i < MOTES; i++) { moteHome[i * 3] = CX + (Math.random() - .5) * w; moteHome[i * 3 + 1] = Math.random() * 7; moteHome[i * 3 + 2] = CX + (Math.random() - .5) * w; } }
homeMotes();
moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
const motes = new THREE.Points(moteGeo, new THREE.PointsMaterial({ size: .5, map: flake, color: 0x9b5cff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
scene.add(motes);

let fogT = 0;
export function updateFog(t, dt, active) {
  fogT += dt;
  if (moteCX !== CX) homeMotes();
  const r = active ? fogRadius(t) : halfSize() + 30;
  const w = Math.max(r * 2, .01), far = 400;
  [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(([sx, sz], i) => {
    const c = curtains[i];
    c.scale.set(w, 1, 1); c.position.set(CX + sx * r, 18, CX + sz * r); c.rotation.y = sx ? Math.PI / 2 : 0;
    const f = floors[i];
    if (sz) { f.scale.set(w + far * 2, far, 1); f.position.set(CX, .06, CX + sz * (r + far / 2)); }
    else { f.scale.set(far, w, 1); f.position.set(CX + sx * (r + far / 2), .06, CX); }
  });
  curtainTex.offset.x = fogT * .02; curtainTex.repeat.x = Math.max(1, w / 24);
  const a = motePos;
  for (let i = 0; i < MOTES; i++) {
    const hx = moteHome[i * 3], hz = moteHome[i * 3 + 2];
    const x = hx + Math.sin(fogT * .4 + i) * 1.5, z = hz + Math.cos(fogT * .35 + i * 1.3) * 1.5;
    const inside = chebyshev(x, z) > r;
    a[i * 3] = x; a[i * 3 + 1] = inside ? moteHome[i * 3 + 1] + Math.sin(fogT + i) * .4 : -50; a[i * 3 + 2] = z;
  }
  moteGeo.attributes.position.needsUpdate = true;
}

const SKY_FOG = new THREE.Color(0xe3edf5), SHADOW = new THREE.Color(0x22122f), bg = new THREE.Color();
let skyTex = null;
/** Set the scene fog for one viewer. Returns how deep in the shadow they are (0..1). */
export function applyViewFog(renderer, x, z, t, active, base) {
  if (!skyTex) skyTex = scene.background;
  const depth = active ? fogDepth(x, z, t) : -99;
  const k = clamp((depth + 5) / 8, 0, 1);
  const tint = base || SKY_FOG;
  scene.fog.color.copy(tint).lerp(SHADOW, k);
  scene.fog.near = lerp(14, .4, k); scene.fog.far = lerp(120, 6.5, k);
  if (k > .02) scene.background = bg.copy(tint).lerp(SHADOW, Math.min(1, k * 1.2)); else scene.background = skyTex;
  renderer.toneMappingExposure = lerp(1.05, .6, k);
  return k;
}

/* ================= Doors ================= */
const doorGroup = new THREE.Group(); scene.add(doorGroup);
let doorObjs = [];
const runeTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#3a3640'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? '255,255,255' : '0,0,0'},.05)`; g.fillRect(Math.random() * 256, Math.random() * 256, 6, 6); }
  g.strokeStyle = '#ffffff'; g.lineWidth = 10; g.lineCap = 'round'; g.shadowColor = '#fff'; g.shadowBlur = 12;
  g.strokeRect(22, 22, 212, 212);
  g.beginPath(); g.arc(128, 128, 62, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.moveTo(128, 50); g.lineTo(128, 206); g.moveTo(70, 160); g.lineTo(128, 100); g.lineTo(186, 160); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const stoneSide = new THREE.MeshStandardMaterial({ color: 0x4a4650, roughness: .95, flatShading: true });
const plateGeo = new THREE.CylinderGeometry(1.15, 1.25, .12, 28), ringGeo = new THREE.TorusGeometry(.95, .07, 8, 36);
const plateMat = new THREE.MeshStandardMaterial({ color: 0x6e6a66, roughness: .9 });

export function buildDoors() {
  doorObjs.forEach((o) => { const k = rayTargets.indexOf(o.mesh); if (k >= 0) rayTargets.splice(k, 1); });
  disposeTree(doorGroup, false); doorGroup.clear();
  doorObjs = maze.doors.map((d) => {
    const cx = d.i * C + C / 2, cz = d.j * C + C / 2;
    const glowCol = d.kind === 'ember' ? 0xff4a1a : d.kind === 'rune' ? 0x3dffd2 : 0xff7a2a;
    const face = new THREE.MeshStandardMaterial({ map: runeTex, emissive: glowCol, emissiveMap: runeTex, emissiveIntensity: .25, roughness: .9 });
    const mats = d.alongX ? [face, face, stoneSide, stoneSide, stoneSide, stoneSide] : [stoneSide, stoneSide, stoneSide, stoneSide, face, face];
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(C, d.h, C), mats);
    mesh.position.set(cx, d.h / 2, cz); mesh.castShadow = mesh.receiveShadow = true; doorGroup.add(mesh); rayTargets.push(mesh);
    const rings = d.plates.map(([px, pz]) => {
      const plate = new THREE.Mesh(plateGeo, plateMat); plate.position.set(px * C + C / 2, .06, pz * C + C / 2); plate.receiveShadow = true; doorGroup.add(plate);
      const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0x7a6a4a, toneMapped: false })); ring.rotation.x = Math.PI / 2; ring.position.set(px * C + C / 2, .14, pz * C + C / 2); doorGroup.add(ring);
      return ring;
    });
    if (d.kind) return { d, mesh, face, rings, arm: null, leverPos: null, grindT: 0, slamming: false }; // puzzle gates: no plates, no crank
    // crank lever against the side wall of the corridor before the door
    const [lx, lz] = d.lever, side = d.alongX ? [0, 1.45] : [1.45, 0];
    const leverPos = { x: lx * C + C / 2 + side[0], z: lz * C + C / 2 + side[1] };
    const base = new THREE.Mesh(new THREE.CylinderGeometry(.28, .36, 1.1, 10), stoneSide); base.position.set(leverPos.x, .55, leverPos.z); base.castShadow = true; doorGroup.add(base);
    const arm = new THREE.Group(); arm.position.set(leverPos.x, 1.15, leverPos.z); doorGroup.add(arm);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.1, .1, .1), new THREE.MeshStandardMaterial({ color: 0x8a6a3a })); bar.position.x = .45; arm.add(bar);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(.12, 10, 8), new THREE.MeshStandardMaterial({ color: 0xff7a2a, emissive: 0xff5a1f, emissiveIntensity: .6 })); knob.position.x = .95; arm.add(knob);
    return { d, mesh, face, rings, arm, leverPos, grindT: 0, slamming: false };
  });
}

/** Door id whose crank lever is within reach, or -1. */
export function leverNear(x, z) {
  for (const o of doorObjs) if (o.leverPos && !o.d.latched && Math.hypot(x - o.leverPos.x, z - o.leverPos.z) < 2) return o.d.id;
  return -1;
}
export function doorsOpen() { return doorObjs.filter((o) => o.d.latched).length; }
export const doorCount = () => doorObjs.length;
export function latchDoor(id) { const o = doorObjs[id]; if (o && !o.d.latched) { o.d.latched = true; sfx.unlock(); } }

/**
 * people: [{x,y,z,crank}] for everyone in the maze (local and remote).
 * Doors rise while both plates are held (or someone cranks). Let go before it's fully open and it slams.
 */
export function updateDoors(dt, people, { onLatch, onSlam, onGrind } = {}) {
  for (const o of doorObjs) {
    const d = o.d;
    if (d.latched) d.progress = Math.min(1, d.progress + dt * 1.5);
    else if (d.kind) { /* puzzle gates are opened by puzzles.js */ }
    else {
      const pressed = d.plates.map(([px, pz]) => people.some((p) => p.y < .8 && Math.floor(p.x / C) === px && Math.floor(p.z / C) === pz));
      const cranking = people.some((p) => p.crank === d.id);
      const rate = (pressed[0] && pressed[1] ? 1 / 3.5 : 0) + (cranking ? 1 / 7 : 0);
      if (rate > 0) {
        o.slamming = false;
        d.progress = Math.min(1, d.progress + rate * dt);
        o.grindT -= dt; if (o.grindT <= 0) { sfx.grind(); onGrind?.(d); o.grindT = .3; }
        if (d.progress >= 1) { d.latched = true; sfx.unlock(); onLatch?.(d.id); }
      } else if (d.progress > 0) {
        if (d.progress > .05) o.slamming = true;
        d.progress = Math.max(0, d.progress - dt * 4.5);
        if (d.progress === 0 && o.slamming) { o.slamming = false; sfx.slam(); onSlam?.(d); }
      }
      o.rings.forEach((r, i) => r.material.color.set(pressed[i] ? 0xffd23f : 0x7a6a4a));
    }
    o.mesh.position.y = d.h / 2 - d.progress * (d.h + .05);
    o.face.emissiveIntensity = .25 + d.progress * 2.2 + (d.latched ? 0 : Math.sin(performance.now() / 300) * .1);
    if (o.arm) o.arm.rotation.y = d.progress * Math.PI * 6;
  }
}
export function doorCenter(id) { const d = maze.doors[id]; return d ? { x: d.i * C + C / 2, z: d.j * C + C / 2 } : null; }
/** The unopened door whose pressure plate is under (x,z), or null. */
export function plateUnder(x, z) {
  const i = Math.floor(x / C), j = Math.floor(z / C);
  for (const d of maze.doors) if (!d.latched && d.plates.some(([px, pz]) => px === i && pz === j)) return d;
  return null;
}
export const doorProgress = (id) => maze.doors[id]?.progress || 0;

/* ================= Summit: the rising Shadow ================= */
// The same purple Shadow, but as a surface that climbs the mountain. Its height is worked out from the round clock
// (startAt online) plus the camp pauses, so every client sees it at the same height without sending it.
export const RISE = { grace: 60, speed: .11, pause: 50, push: 1.7, base: -4 }; // base: where it starts (below the camp you resume from)
/** Summit pace: 0 gentle, 1 standard, 2 brutal (metres per second the Shadow rises, seconds of calm at each camp). */
// tuned for the five-zone mountain (186 m): Standard lets the Shadow reach the top after roughly 30-35 minutes
export function setRise(p) { RISE.grace = [90, 60, 40][p] ?? 60; RISE.speed = [.075, .11, .16][p] ?? .11; RISE.pause = [75, 50, 35][p] ?? 50; }
/** Shadow height at round time t (s). pauses: camp-reached times (s); the Shadow holds still for RISE.pause after each.
 *  pushAt: when the team reached the last camp; after that pause the Shadow rises RISE.push times faster (the final push). */
export function shadowY(t, pauses = [], pushAt = Infinity) {
  let run = Math.max(0, t - RISE.grace);
  for (const p of pauses) { const a = Math.max(p, RISE.grace), b = Math.min(p + RISE.pause, t); if (b > a) run -= b - a; }
  return RISE.base + Math.max(0, run) * RISE.speed + Math.max(0, t - pushAt - RISE.pause) * RISE.speed * (RISE.push - 1);
}
export const shadowCalm = (t, pauses = []) => pauses.some((p) => t >= p && t < p + RISE.pause);
const riseGroup = new THREE.Group(); riseGroup.visible = false; scene.add(riseGroup);
const riseTop = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshBasicMaterial({ color: 0x3a1a5a, transparent: true, opacity: .78, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: false }));
riseTop.rotation.x = -Math.PI / 2; riseTop.renderOrder = 2; riseGroup.add(riseTop);
const riseLow = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshBasicMaterial({ color: 0x1a0a2a, transparent: true, opacity: .9, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: false }));
riseLow.rotation.x = -Math.PI / 2; riseLow.renderOrder = 1; riseGroup.add(riseLow);
// a ragged band of the curtain texture hanging just above the surface, so the edge looks alive
const riseBand = new THREE.Mesh(new THREE.CylinderGeometry(160, 160, 5, 48, 1, true), curtainMat); riseBand.renderOrder = 3; riseGroup.add(riseBand);
const RM = 500, rmGeo = new THREE.BufferGeometry(), rmPos = new Float32Array(RM * 3), rmHome = new Float32Array(RM * 3);
for (let i = 0; i < RM; i++) { rmHome[i * 3] = (Math.random() - .5) * 140; rmHome[i * 3 + 1] = Math.random(); rmHome[i * 3 + 2] = (Math.random() - .5) * 140; }
rmGeo.setAttribute('position', new THREE.BufferAttribute(rmPos, 3));
const riseMotes = new THREE.Points(rmGeo, motes.material); riseMotes.frustumCulled = false; riseGroup.add(riseMotes);
export function showRise(v) { riseGroup.visible = v; }
/** Move the Shadow surface to height y, centred on (cx, cz). */
export function updateRise(y, dt, cx, cz) {
  riseTop.position.set(cx, y, cz); riseLow.position.set(cx, y - 1.2, cz); riseBand.position.set(cx, y + 1.5, cz);
  const t = performance.now() / 1000;
  for (let i = 0; i < RM; i++) {
    rmPos[i * 3] = cx + rmHome[i * 3] + Math.sin(t * .4 + i) * 1.5;
    rmPos[i * 3 + 1] = y - 3 + rmHome[i * 3 + 1] * 5 + Math.sin(t + i) * .4;
    rmPos[i * 3 + 2] = cz + rmHome[i * 3 + 2] + Math.cos(t * .35 + i * 1.3) * 1.5;
  }
  rmGeo.attributes.position.needsUpdate = true;
}
/** Scene fog for one viewer on the mountain: eyeY against the Shadow height sy. Returns 0..1 like applyViewFog. */
export function applyRiseFog(renderer, eyeY, sy, base) {
  if (!skyTex) skyTex = scene.background;
  const k = clamp((sy - eyeY + 3) / 5, 0, 1);
  scene.fog.color.copy(base).lerp(SHADOW, k);
  scene.fog.near = lerp(50, .4, k); scene.fog.far = lerp(260, 7, k);
  if (k > .02) scene.background = bg.copy(base).lerp(SHADOW, Math.min(1, k * 1.2)); else scene.background = skyTex;
  renderer.toneMappingExposure = lerp(1.05, .6, k);
  return k;
}
