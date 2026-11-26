// Ridgeline Cableway: the lobby. A bright boarding hall perched on a cliff, with a glass wall looking out over the clouds.
// You arrive by gondola through the boarding bridge at Gate 1, hang out, gear up and train, then board together.
import { THREE, C, GRID, scene, flake, useLayout, sfx } from './world.js';
import { fx } from './fx.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (x) => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const tex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };

/* ================= floor plan (Base Camp uses 4 m tiles) =================
   Hall: tiles x 8..17, z 8..15  →  x 32..72 m, z 32..64 m, ceiling 11 m.
   West side: glass curtain wall with Gate 1. Boarding bridge on tile (7,12), gondola dock on tile (6,12).
   North wall: Outfitters (gear), Summit Coffee, Information (radio). North-east: the bouldering wall.
   East wall: the big departure board, and the staff door that is the practice gate (tile 17,14) into a small back room.
   South: the sprint lane, glowstick range bells hanging from the roof, the photo spot, and the dark baggage room (south-west). */
export const HALL = { X0: 32, X1: 72, Z0: 32, Z1: 64, H: 11 };
const { X0, X1, Z0, Z1, H } = HALL;
export const GONDOLA = { i: 6, j: 12, x: 6 * C + C / 2, z: 12 * C + C / 2 };
const BLOCKS = [[14, 8, 1.1], [15, 8, 2.2], [16, 8, 3.3], [17, 8, 5.2], [8, 15, 2.6]]; // bouldering wall steps, then the baggage room
const GATE_Z0 = 48, GATE_Z1 = 52, DOOR_H = 3.2;

function layout() {
  const A = () => Array.from({ length: GRID }, () => new Float32Array(GRID));
  const g = Array.from({ length: GRID }, () => new Uint8Array(GRID).fill(1)), top = A();
  for (let x = 0; x < GRID; x++) top[x].fill(60);
  for (let x = 8; x <= 17; x++) for (let z = 8; z <= 15; z++) g[x][z] = 0;
  g[7][12] = 0; g[GONDOLA.i][GONDOLA.j] = 0; // boarding bridge and dock
  for (const [x, z, h] of BLOCKS) { g[x][z] = 1; top[x][z] = h; }
  g[18][14] = 0; // the back room behind the practice gate
  const doorAt = Array.from({ length: GRID }, () => new Int8Array(GRID).fill(-1)); doorAt[17][14] = 0;
  const gate = { id: 0, i: 17, j: 14, alongX: true, plates: [[17, 13], [17, 15]], lever: [16, 14], progress: 0, latched: false, h: DOOR_H, practice: true };
  return { g, top, low: A(), bridge: A(), doorAt, doors: [gate], camps: [], spires: [], seed: 0, lobby: true };
}

/* ================= textures & materials ================= */
const terrazzo = tex(512, 512, (g, w, h) => {
  g.fillStyle = '#efe4d2'; g.fillRect(0, 0, w, h);
  const chips = ['#d9c7ad', '#c9b393', '#f7efe2', '#b9a88f', '#e7a77f', '#9fc3cf'];
  for (let i = 0; i < 2600; i++) { g.fillStyle = chips[i % chips.length]; const s = 1 + Math.random() * 4; g.fillRect(Math.random() * w, Math.random() * h, s, s * (.6 + Math.random() * .8)); }
  g.strokeStyle = 'rgba(120,96,70,.35)'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, w - 3, h - 3);
});
terrazzo.wrapS = terrazzo.wrapT = THREE.RepeatWrapping; terrazzo.repeat.set(10, 8);
const carpetTex = tex(256, 64, (g, w, h) => {
  g.fillStyle = '#2b5a8a'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#ffc94a'; g.fillRect(0, 4, w, 4); g.fillRect(0, h - 8, w, 4);
  g.fillStyle = 'rgba(255,255,255,.13)'; for (let x = 0; x < w; x += 32) { g.beginPath(); g.moveTo(x + 6, 20); g.lineTo(x + 22, 32); g.lineTo(x + 6, 44); g.closePath(); g.fill(); }
});
carpetTex.wrapS = THREE.RepeatWrapping; carpetTex.repeat.set(10, 1);
const plaster = tex(256, 256, (g, w, h) => {
  g.fillStyle = '#f6ead6'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(150,120,90,${Math.random() * .05})`; g.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
});
plaster.wrapS = plaster.wrapT = THREE.RepeatWrapping;
const wood = tex(256, 256, (g, w, h) => {
  g.fillStyle = '#b07a4a'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 32) {
    g.fillStyle = `hsl(${24 + Math.random() * 8},${42 + Math.random() * 10}%,${42 + Math.random() * 10}%)`; g.fillRect(0, y + 2, w, 28);
    g.fillStyle = 'rgba(60,30,10,.35)'; g.fillRect(0, y, w, 3);
  }
});
wood.wrapS = wood.wrapT = THREE.RepeatWrapping;
const M = {
  floor: new THREE.MeshStandardMaterial({ map: terrazzo, roughness: .45, metalness: .05 }),
  carpet: new THREE.MeshStandardMaterial({ map: carpetTex, roughness: 1 }),
  wall: new THREE.MeshStandardMaterial({ map: plaster, roughness: .95 }),
  panel: new THREE.MeshStandardMaterial({ map: wood, roughness: .8 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x8a5a34, roughness: .85, flatShading: true }),
  darkWood: new THREE.MeshStandardMaterial({ color: 0x5a3820, roughness: .9, flatShading: true }),
  rock: new THREE.MeshStandardMaterial({ color: 0x7d7470, roughness: .95, flatShading: true }),
  snow: new THREE.MeshStandardMaterial({ color: 0xfbfdff, roughness: .6, flatShading: true }),
  glass: new THREE.MeshStandardMaterial({ color: 0xcfeeff, transparent: true, opacity: .16, roughness: .05, metalness: .3, side: THREE.DoubleSide, depthWrite: false }),
  red: new THREE.MeshStandardMaterial({ color: 0xff6f59, roughness: .5 }),
  white: new THREE.MeshStandardMaterial({ color: 0xfff6e5, roughness: .6 }),
  metal: new THREE.MeshStandardMaterial({ color: 0x3b4250, roughness: .4, metalness: .6 }),
  steel: new THREE.MeshStandardMaterial({ color: 0xc9d2dc, roughness: .35, metalness: .7 }),
  teal: new THREE.MeshStandardMaterial({ color: 0x2ec4f1, roughness: .55 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xffc94a, roughness: .3, metalness: .7 }),
  ceiling: new THREE.MeshStandardMaterial({ color: 0xf3e6cf, roughness: 1 }),
  sky: new THREE.MeshBasicMaterial({ color: 0xfff1d6, toneMapped: false }),
  glow: new THREE.MeshBasicMaterial({ color: 0xffd9a0, toneMapped: false }),
  seat: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .6 }),
  pad: new THREE.MeshStandardMaterial({ color: 0x2b3a55, roughness: 1 }),
  climb: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .85, flatShading: true }),
};

const group = new THREE.Group(); group.visible = false; scene.add(group);
const add = (geo, mat, x, y, z, parent = group) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
const box = (w, h, d, mat, x, y, z, parent) => add(new THREE.BoxGeometry(w, h, d), mat, x, y, z, parent);
const signTex = (text, w = 512, h = 128, bg = '#fff6e5', fg = '#1b2738', font = 64) => tex(w, h, (g) => {
  g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = fg; g.lineWidth = 10; g.strokeRect(6, 6, w - 12, h - 12);
  g.fillStyle = fg; g.font = `900 ${font}px ui-rounded, "Arial Rounded MT Bold", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 4);
});
const sign = (text, w, h, x, y, z, ry = 0, opts) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: signTex(text, ...(opts || [])), roughness: .8, side: THREE.DoubleSide })); m.position.set(x, y, z); m.rotation.y = ry; group.add(m); return m; };

// Lots of identical boxes (window frames, chair parts, beams) are batched: one instanced mesh per material.
const UNIT = new THREE.BoxGeometry(1, 1, 1), batches = new Map();
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
function piece(mat, w, h, d, x, y, z, ry = 0, color = null) {
  if (!batches.has(mat)) batches.set(mat, []);
  _q.setFromEuler(_e.set(0, ry, 0)); batches.get(mat).push({ m: _m.clone().compose(new THREE.Vector3(x, y, z), _q, new THREE.Vector3(w, h, d)), color });
}
function flush(shadow = true) {
  for (const [mat, list] of batches) {
    const im = new THREE.InstancedMesh(UNIT, mat, list.length);
    const tinted = list.some((it) => it.color), white = new THREE.Color(1, 1, 1);
    list.forEach((it, i) => { im.setMatrixAt(i, it.m); if (tinted) im.setColorAt(i, it.color || white); });
    im.castShadow = shadow; im.receiveShadow = true; group.add(im);
  }
  batches.clear();
}

/* ================= build once ================= */
const anim = { lights: [], bells: [], pendants: [], cabin: null, doors: [], wheel: null, gateLamps: [], gateK: 0, clock: null };
let built = false, gateMode = 0;
function buildOnce() {
  built = true;
  /* ---- the cliff, the clouds and the mountains outside ---- */
  box(X1 - X0 + 10, 8, Z1 - Z0 + 10, M.rock, (X0 + X1) / 2, -4.05, (Z0 + Z1) / 2).castShadow = false;
  // cliff rocks under the hall: each one sits fully below the floor (top at least 1.2 m under it), so nothing pokes up inside
  [[50, 48, 26, 1.1], [36, 60, 18, 1.4], [66, 40, 20, 1.3], [24, 50, 9, 1.6], [76, 62, 12, 1.2], [30, 36, 14, 1.2], [70, 30, 15, 1.1]].map(([x, z, r, sy]) => [x, -1.2 - r * sy, z, r, sy]).forEach(([x, y, z, r, sy]) => {
    const m = add(new THREE.DodecahedronGeometry(r, 1), M.rock, x, y, z); m.scale.y = sy; m.rotation.set(Math.random(), Math.random(), 0); m.castShadow = false;
  });
  const cloudTex = tex(512, 512, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) { const x = Math.random() * w, y = Math.random() * h, r = 20 + Math.random() * 70, b = g.createRadialGradient(x, y, 0, x, y, r); b.addColorStop(0, 'rgba(255,214,190,.55)'); b.addColorStop(1, 'rgba(255,214,190,0)'); g.fillStyle = b; g.fillRect(x - r, y - r, r * 2, r * 2); }
  });
  cloudTex.wrapS = cloudTex.wrapT = THREE.RepeatWrapping; cloudTex.repeat.set(6, 6);
  const sea = add(new THREE.PlaneGeometry(1400, 1400), new THREE.MeshStandardMaterial({ map: cloudTex, color: 0xffe9e0, roughness: 1, emissive: 0xffb08a, emissiveIntensity: .15 }), 52, -26, 50);
  sea.rotation.x = -Math.PI / 2; sea.castShadow = false; anim.sea = cloudTex;
  for (let i = 0; i < 24; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: flake, color: 0xfff0ea, transparent: true, opacity: .85, depthWrite: false }));
    const a = Math.random() * 6.28, d = 60 + Math.random() * 140; s.position.set(52 + Math.cos(a) * d, -22 + Math.random() * 8, 50 + Math.sin(a) * d); s.scale.set(40 + Math.random() * 40, 14 + Math.random() * 10, 1); group.add(s);
  }
  // distant peaks, mostly west (that's where the gondola goes) so the glass wall frames them
  const peakMat = new THREE.MeshStandardMaterial({ color: 0x9a8fa6, roughness: 1, flatShading: true });
  [[-160, 0, 70, 60], [-220, -80, 95, 80], [-140, 120, 55, 50], [-260, 40, 120, 95], [-90, -150, 50, 44], [-60, 210, 45, 40], [180, -160, 70, 60], [200, 220, 60, 55]].forEach(([x, z, hgt, r]) => {
    const p = add(new THREE.ConeGeometry(r, hgt, 6), peakMat, x, -24 + hgt / 2, z); p.rotation.y = Math.random() * 3; p.castShadow = false;
    const cap = add(new THREE.ConeGeometry(r * .36, hgt * .36, 6), M.snow, x, -24 + hgt - hgt * .18 + .3, z); cap.rotation.y = p.rotation.y; cap.castShadow = false;
  });

  /* ---- floor, carpet runner, ceiling ---- */
  const floor = box(X1 - X0, 1, Z1 - Z0, M.floor, (X0 + X1) / 2, -.5, (Z0 + Z1) / 2); floor.castShadow = false;
  const run = add(new THREE.PlaneGeometry(X1 - X0 - 1, GATE_Z1 - GATE_Z0 - .6), M.carpet, (X0 + X1) / 2, .015, (GATE_Z0 + GATE_Z1) / 2); run.rotation.x = -Math.PI / 2; run.castShadow = false;
  const ceil = box(X1 - X0 + 1, .5, Z1 - Z0 + 1, M.ceiling, (X0 + X1) / 2, H + .25, (Z0 + Z1) / 2); ceil.castShadow = false;
  for (let x = X0 + 4; x < X1; x += 5) piece(M.darkWood, .5, .8, Z1 - Z0, x, H - .4, (Z0 + Z1) / 2); // roof beams
  for (const z of [39, 48, 57]) { const s = add(new THREE.PlaneGeometry(X1 - X0 - 4, 2.4), M.sky, (X0 + X1) / 2, H - .02, z); s.rotation.x = Math.PI / 2; s.castShadow = false; } // skylights

  /* ---- walls ---- */
  // north and south: plaster with a wooden wainscot; the south wall has big windows
  for (const [z, s] of [[Z0, 1], [Z1, -1]]) {
    box(X1 - X0 + .8, H, .4, M.wall, (X0 + X1) / 2, H / 2, z - s * .2).castShadow = false;
    piece(M.panel, X1 - X0, 1.3, .1, (X0 + X1) / 2, .65, z + s * .05);
    piece(M.darkWood, X1 - X0, .12, .16, (X0 + X1) / 2, 1.34, z + s * .07);
  }
  for (let x = X0 + 5; x < X1 - 2; x += 8) { // south windows
    const g = add(new THREE.PlaneGeometry(5, 4.6), M.glass, x + 1, 6.8, Z1 - .23); g.castShadow = false;
    const view = add(new THREE.PlaneGeometry(5, 4.6), new THREE.MeshBasicMaterial({ color: 0xffcfa8, toneMapped: false }), x + 1, 6.8, Z1 - .02); view.rotation.y = Math.PI; view.castShadow = false;
    piece(M.steel, 5.3, .18, .2, x + 1, 9.15, Z1 - .25); piece(M.steel, 5.3, .18, .2, x + 1, 4.45, Z1 - .25);
    for (const dx of [-2.6, 0, 2.6]) piece(M.steel, .16, 4.7, .2, x + 1 + dx, 6.8, Z1 - .25);
  }
  for (let x = X0 + 4; x < X1 - 1; x += 8) { // high north windows (clerestory)
    const view = add(new THREE.PlaneGeometry(4.2, 1.6), M.sky, x + 1.5, 9.1, Z0 + .03); view.castShadow = false;
    piece(M.steel, 4.4, .14, .14, x + 1.5, 9.95, Z0 + .07); piece(M.steel, 4.4, .14, .14, x + 1.5, 8.25, Z0 + .07);
  }
  // east wall, with an opening for the practice gate (tile 17,14: z 56..60)
  const ez0 = 56, ez1 = 60, ex = X1 + .2;
  box(.4, H, ez0 - Z0, M.wall, ex, H / 2, (Z0 + ez0) / 2).castShadow = false;
  box(.4, H, Z1 - ez1 + .4, M.wall, ex, H / 2, (ez1 + Z1 + .4) / 2).castShadow = false;
  box(.4, H - 3.5, ez1 - ez0, M.wall, ex, 3.5 + (H - 3.5) / 2, (ez0 + ez1) / 2).castShadow = false;
  piece(M.panel, .1, 1.3, ez0 - Z0, X1 - .05, .65, (Z0 + ez0) / 2); piece(M.panel, .1, 1.3, Z1 - ez1, X1 - .05, .65, (ez1 + Z1) / 2);
  piece(M.darkWood, .3, 3.6, .3, X1 - .1, 1.8, ez0); piece(M.darkWood, .3, 3.6, .3, X1 - .1, 1.8, ez1); piece(M.darkWood, .3, .3, ez1 - ez0 + .3, X1 - .1, 3.55, (ez0 + ez1) / 2);
  // the back room behind the practice gate
  box(4.2, .3, 4.2, M.floor, X1 + 2, -.15, 58).castShadow = false;
  box(4.4, 4, .3, M.wall, X1 + 2, 2, ez0 - .15); box(4.4, 4, .3, M.wall, X1 + 2, 2, ez1 + .15); box(.3, 4, 4.4, M.wall, X1 + 4.15, 2, 58);
  box(4.6, .3, 4.6, M.ceiling, X1 + 2, 4, 58).castShadow = false;
  const backLight = new THREE.PointLight(0xffe2b0, 10, 7, 1.6); backLight.position.set(X1 + 2, 3.3, 58); group.add(backLight);

  // west: the glass curtain wall looking out over the clouds, with Gate 1 in the middle
  for (let z = Z0; z <= Z1 + .01; z += 4) {
    if (z > GATE_Z0 && z < GATE_Z1) continue;
    piece(M.steel, .26, H, .26, X0 - .1, H / 2, z);
  }
  for (const y of [.12, 3.4, 7.2, H - .1]) {
    piece(M.steel, .24, .22, GATE_Z0 - Z0, X0 - .1, y, (Z0 + GATE_Z0) / 2);
    piece(M.steel, .24, .22, Z1 - GATE_Z1, X0 - .1, y, (GATE_Z1 + Z1) / 2);
    if (y > 3) piece(M.steel, .24, .22, GATE_Z1 - GATE_Z0, X0 - .1, y, (GATE_Z0 + GATE_Z1) / 2);
  }
  for (const [z0, z1] of [[Z0, GATE_Z0], [GATE_Z1, Z1]]) { const g = add(new THREE.PlaneGeometry(z1 - z0, H), M.glass, X0 - .1, H / 2, (z0 + z1) / 2); g.rotation.y = Math.PI / 2; g.castShadow = false; }
  const above = add(new THREE.PlaneGeometry(GATE_Z1 - GATE_Z0, H - 3.4), M.glass, X0 - .1, 3.4 + (H - 3.4) / 2, (GATE_Z0 + GATE_Z1) / 2); above.rotation.y = Math.PI / 2; above.castShadow = false;
  piece(M.red, .4, .4, GATE_Z1 - GATE_Z0 + .6, X0 + .05, 3.55, (GATE_Z0 + GATE_Z1) / 2);
  sign('GATE 1 · SUMMIT EXPRESS', 5.2, .9, X0 + .3, 4.35, 50, Math.PI / 2, [1024, 176, '#1b2738', '#ffd23f', 76]);
  // gate lamps: amber while waiting, flashing green while boarding
  for (const z of [GATE_Z0 - .5, GATE_Z1 + .5]) {
    piece(M.metal, .2, 2.6, .2, X0 + .4, 1.3, z);
    const lamp = add(new THREE.SphereGeometry(.2, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffa03a, toneMapped: false }), X0 + .4, 2.75, z); lamp.castShadow = false; anim.gateLamps.push(lamp);
  }
  // boarding desk beside the gate (route & pace settings)
  const desk = new THREE.Group(); desk.position.set(35, 0, 44.6); group.add(desk);
  box(1.6, 1.1, .7, M.white, 0, .55, 0, desk); box(1.8, .1, .9, M.darkWood, 0, 1.15, 0, desk); box(1.62, .3, .72, M.red, 0, .9, 0, desk);
  const screen = box(.7, .45, .05, new THREE.MeshBasicMaterial({ color: 0x8ee34d, toneMapped: false }), 0, 1.55, -.15, desk); screen.rotation.x = -.3;
  sign('ROUTE DESK', 1.6, .38, 35, 2.35, 44.6, Math.PI / 2 + Math.PI, [512, 120, '#ffd23f', '#1b2738', 70]).rotation.y = Math.PI / 2;

  // boarding bridge: a short glass tube out to the gondola dock
  box(4.2, .3, 4, M.floor, 30, -.15, 50).castShadow = false;
  const bridgeCarpet = add(new THREE.PlaneGeometry(4, 3.2), M.carpet, 30, .02, 50); bridgeCarpet.rotation.x = -Math.PI / 2; bridgeCarpet.castShadow = false;
  for (const z of [GATE_Z0, GATE_Z1]) {
    const g = add(new THREE.PlaneGeometry(4, 3.2), M.glass, 30, 1.6, z); g.castShadow = false;
    for (let x = 28.1; x <= 32; x += 1.3) piece(M.steel, .12, 3.3, .14, x, 1.65, z);
    piece(M.steel, 4.1, .14, .16, 30, 3.25, z); piece(M.panel, 4, .7, .1, 30, .35, z);
  }
  box(4.3, .3, 4.4, M.steel, 30, 3.45, 50);
  // dock & station
  box(6.5, .5, 9, M.metal, 25.4, -.25, 50).castShadow = false;
  [[22.4, 45.8], [22.4, 54.2], [28.2, 45.8], [28.2, 54.2]].forEach(([x, z]) => piece(M.metal, .4, 6.6, .4, x, 3.3, z));
  box(7.4, .4, 9.6, M.red, 25.3, 6.8, 50); box(7.6, .25, 9.8, M.snow, 25.3, 7.1, 50);
  const wheel = add(new THREE.TorusGeometry(1.5, .14, 8, 24), M.metal, 23.2, 6, 50); wheel.rotation.x = Math.PI / 2; anim.wheel = wheel;
  const cableStart = new THREE.Vector3(23.2, 6.2, 50), cableEnd = new THREE.Vector3(-420, 60, 50);
  const cable = add(new THREE.CylinderGeometry(.05, .05, cableStart.distanceTo(cableEnd), 6), M.metal, (cableStart.x + cableEnd.x) / 2, (cableStart.y + cableEnd.y) / 2, 50);
  cable.lookAt(cableEnd); cable.rotateX(Math.PI / 2); cable.castShadow = false;

  const cabin = new THREE.Group(); group.add(cabin); anim.cabin = cabin;
  box(3.6, .16, 3.6, M.darkWood, 0, .02, 0, cabin);
  box(3.6, .9, .12, M.red, 0, .55, -1.74, cabin); box(3.6, .9, .12, M.red, 0, .55, 1.74, cabin); box(.12, .9, 3.6, M.red, -1.74, .55, 0, cabin);
  [[-1.74, 0, Math.PI / 2], [0, -1.74, 0], [0, 1.74, 0]].forEach(([x, z, r]) => { const g = add(new THREE.PlaneGeometry(3.5, 1.5), M.glass, x, 1.75, z, cabin); g.rotation.y = r; g.castShadow = false; });
  [[-1.74, -1.74], [-1.74, 1.74], [1.74, -1.74], [1.74, 1.74]].forEach(([x, z]) => box(.16, 2.7, .16, M.white, x, 1.35, z, cabin));
  box(3.8, .3, 3.8, M.red, 0, 2.75, 0, cabin); box(3.6, .12, 3.6, M.white, 0, 2.95, 0, cabin);
  box(.7, .5, 3.2, M.wood, -1.3, .45, 0, cabin);
  box(.12, 2.6, .12, M.metal, 0, 4.2, 0, cabin); box(.6, .3, .3, M.metal, 0, 5.5, 0, cabin);
  const door = (side) => { const d = new THREE.Group(); cabin.add(d); box(.08, 2.5, 1.7, M.red, 0, 1.3, 0, d); const gl = add(new THREE.PlaneGeometry(1.4, 1.3), M.glass, .05, 1.65, 0, d); gl.rotation.y = Math.PI / 2; d.position.set(1.78, 0, side * .87); d.userData.side = side; anim.doors.push(d); };
  door(-1); door(1);

  /* ---- departure board on the east wall: the first thing you see walking in ---- */
  board.mesh = new THREE.Mesh(new THREE.PlaneGeometry(12, 4.27), new THREE.MeshBasicMaterial({ map: board.tex, toneMapped: false }));
  board.mesh.position.set(X1 - .2, 7, 44); board.mesh.rotation.y = -Math.PI / 2; group.add(board.mesh);
  box(.2, 4.9, 12.6, M.metal, X1 - .05, 7, 44);
  sign('DEPARTURES', 4, .7, X1 - .2, 9.75, 44, -Math.PI / 2, [768, 134, '#1b2738', '#ffd23f', 84]);
  sign('RIDGELINE CABLEWAY', 9, 1.1, X1 - .2, 3.9, 44, -Math.PI / 2, [1024, 125, '#ff6f59', '#ffffff', 80]);
  // a big clock over the gate, showing your real local time
  const clockTex = new THREE.CanvasTexture(Object.assign(document.createElement('canvas'), { width: 256, height: 256 })); clockTex.colorSpace = THREE.SRGBColorSpace;
  const clock = add(new THREE.CircleGeometry(1.1, 40), new THREE.MeshBasicMaterial({ map: clockTex, toneMapped: false }), X0 + .2, 8.9, 50); clock.rotation.y = Math.PI / 2; clock.castShadow = false;
  anim.clock = { tex: clockTex, last: -1 };

  /* ---- north wall: shops and the information desk ---- */
  const shopFront = (x0, x1, name, colors, opts) => {
    const cx = (x0 + x1) / 2, w = x1 - x0;
    piece(M.darkWood, w, .3, .4, cx, 3.6, Z0 + .3);
    for (let k = 0; k < 8; k++) piece(M.white, w / 8, .5, 1.2, x0 + w / 16 + k * w / 8, 3.2, Z0 + .8, 0, new THREE.Color(colors[k % 2])); // striped awning
    sign(name, w * .8, .8, cx, 4.4, Z0 + .25, 0, opts);
  };
  shopFront(34, 40.5, 'OUTFITTERS', ['#2ec4f1', '#fff6e5'], [768, 128, '#2ec4f1', '#1b2738', 80]);
  shopFront(42, 49.5, 'SUMMIT COFFEE', ['#ff6f59', '#fff6e5'], [768, 128, '#ff6f59', '#ffffff', 74]);
  shopFront(50.5, 55, 'INFO', ['#8ee34d', '#fff6e5'], [512, 128, '#8ee34d', '#1b2738', 84]);
  // gear locker (the creator) in the Outfitters
  const lk = new THREE.Group(); lk.position.set(37.2, 0, Z0 + .5); group.add(lk);
  box(2, 2.6, .9, M.teal, 0, 1.3, 0, lk); box(.06, 2.4, .05, M.metal, 0, 1.3, .46, lk);
  [-.4, .4].forEach((x) => box(.1, .4, .08, M.gold, x, 1.4, .48, lk));
  const mirror = add(new THREE.PlaneGeometry(.9, 1.9), new THREE.MeshStandardMaterial({ color: 0xd9f1ff, roughness: .05, metalness: .9 }), -2.2, 1.3, .06, lk); mirror.castShadow = false;
  box(1, 2.1, .1, M.darkWood, -2.2, 1.3, .02, lk);
  for (let k = 0; k < 4; k++) { const hat = add(new THREE.ConeGeometry(.22, .32, 10), new THREE.MeshStandardMaterial({ color: [0xff6f59, 0xffd23f, 0x8ee34d, 0xa37bff][k], roughness: .7 }), 1.6 + k * .45, 1.9, .3, lk); hat.castShadow = false; }
  box(2, .08, .4, M.wood, 2.3, 1.7, .25, lk);
  // café counter with cups and a menu
  box(6.4, 1.1, 1.2, M.panel, 45.8, .55, Z0 + 1.6); box(6.6, .1, 1.4, M.white, 45.8, 1.15, Z0 + 1.6);
  for (let k = 0; k < 5; k++) { const cup = add(new THREE.CylinderGeometry(.09, .07, .2, 10), M.white, 43.4 + k * 1.1, 1.3, Z0 + 1.5); cup.castShadow = false; }
  const mach = box(1, .9, .6, M.steel, 47.9, 1.65, Z0 + 1.6); mach.castShadow = false;
  sign('COCOA · TEA · COFFEE', 3.4, .9, 45.8, 2.5, Z0 + .22, 0, [768, 200, '#1b2738', '#fff6e5', 66]);
  // information desk with the radio (invites)
  box(3.6, 1.1, 1.2, M.white, 52.7, .55, Z0 + 1.8); box(3.8, .1, 1.4, M.darkWood, 52.7, 1.15, Z0 + 1.8);
  const rd = new THREE.Group(); rd.position.set(52.7, 1.2, Z0 + 1.8); group.add(rd);
  box(.9, .5, .4, M.red, 0, .25, 0, rd); add(new THREE.CylinderGeometry(.14, .14, .05, 14), M.metal, -.2, .25, .21, rd).rotation.x = Math.PI / 2;
  const ant = box(.03, .9, .03, M.metal, .3, .9, 0, rd); ant.rotation.z = -.3;
  anim.radioLed = add(new THREE.SphereGeometry(.05, 8, 6), new THREE.MeshBasicMaterial({ color: 0x8ee34d, toneMapped: false }), .25, .4, .21, rd);

  /* ---- bouldering wall (north-east): four climbable steps with a bell on top ---- */
  const holdCols = [0xff6f59, 0xffd23f, 0x2ec4f1, 0x8ee34d, 0xa37bff, 0xff5fa2];
  BLOCKS.slice(0, 4).forEach(([i, j, h], k) => {
    const cx = i * C + C / 2, cz = j * C + C / 2;
    piece(M.panel, C, h, C, cx, h / 2, cz, 0, new THREE.Color(['#e9d3b0', '#d9c19c', '#cdb38d', '#c4a982'][k]));
    piece(M.white, C + .04, .12, C + .04, cx, h + .06, cz, 0, new THREE.Color('#2b3a55'));
    for (let q = 0; q < Math.round(h * 5); q++) { // holds on the south face (and the west face of the first block)
      const onWest = k === 0 && q % 2, y = .3 + Math.random() * (h - .5), o = (Math.random() - .5) * (C - .6);
      const hold = new THREE.Color(holdCols[(q + k) % holdCols.length]);
      if (onWest) piece(M.climb, .14, .16, .26, cx - C / 2 - .05, y, cz + o, Math.random(), hold);
      else piece(M.climb, .26, .16, .14, cx + o, y, cz + C / 2 + .05, Math.random(), hold);
    }
  });
  const mat = add(new THREE.BoxGeometry(16, .06, 3), M.pad, 64, .03, 37.6); mat.castShadow = false;
  piece(M.metal, .12, 2.1, .12, 17 * C + C / 2, 6.35, 8 * C + C / 2); piece(M.metal, 1.1, .12, .12, 17 * C + C / 2, 7.4, 8 * C + C / 2);
  makeBell(17 * C + C / 2, 7.35, 8 * C + C / 2, 1.2, true);
  sign('BOULDER WALL', 4, .7, 62, 4.6, 36.05, 0, [768, 134, '#8ee34d', '#1b2738', 84]);

  /* ---- waiting seats: three rows either side of the boarding carpet, facing the glass ---- */
  SEATS.forEach((s, k) => {
    const col = new THREE.Color(s.row % 2 ? '#ff9f1c' : '#2ec4f1');
    piece(M.seat, .62, .12, .62, s.x, .46, s.z, 0, col);
    piece(M.seat, .12, .66, .62, s.x + .32, .82, s.z, 0, col);
    if (k % 4 === 0) piece(M.steel, .7, .08, 4.1, s.x + .05, .38, s.z + 1.5);
    piece(M.steel, .5, .06, .06, s.x, .68, s.z - .34);
  });
  for (const r of SEAT_ROWS) for (const z0 of [40.5, 53.5]) { piece(M.steel, .12, .38, .12, r + .05, .19, z0); piece(M.steel, .12, .38, .12, r + .05, .19, z0 + 3); }
  // planters at the ends of the rows
  for (const [x, z] of [[41, 38.6], [38.4, 57], [53.5, 38.6], [53.5, 46.3], [53.5, 53.8]]) {
    piece(M.white, 1, .8, 1, x, .4, z, 0, new THREE.Color('#e7a77f'));
    const leaves = add(new THREE.IcosahedronGeometry(.75, 0), new THREE.MeshStandardMaterial({ color: 0x4caf50, roughness: .9, flatShading: true }), x, 1.4, z); leaves.scale.y = 1.3; leaves.castShadow = false;
  }

  /* ---- glowstick range: bells hanging from the roof over the south side ---- */
  [[48, 4.4, 57.6], [55, 5, 59.8], [62, 4.6, 57.2]].forEach(([x, y, z]) => { piece(M.metal, .05, H - y, .05, x, y + (H - y) / 2, z); makeBell(x, y, z, 1, true); });
  const rangeSign = sign('GLOWSTICK RANGE · RING THE BELLS', 6, .8, 55, 7.6, 62.6, Math.PI, [1024, 136, '#2ec4f1', '#1b2738', 60]);
  piece(M.metal, .04, 3, .04, 52.2, 9.5, 62.6); piece(M.metal, .04, 3, .04, 57.8, 9.5, 62.6);

  /* ---- photo spot: a tripod by the east wall pointing back across the hall at the glass ---- */
  const cam = new THREE.Group(); cam.position.set(67.4, 0, 49.4); cam.lookAt(56, 0, 50); group.add(cam);
  [0, 2.1, 4.2].forEach((a) => { const l = box(.05, 1.6, .05, M.metal, Math.cos(a) * .3, .75, Math.sin(a) * .3, cam); l.rotation.set(Math.sin(a) * .2, 0, -Math.cos(a) * .2); });
  box(.55, .38, .32, M.metal, 0, 1.65, 0, cam);
  add(new THREE.CylinderGeometry(.13, .15, .22, 14), M.metal, 0, 1.65, .25, cam).rotation.x = Math.PI / 2;
  anim.camFlash = add(new THREE.SphereGeometry(.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff6f59, toneMapped: false }), .2, 1.9, .15, cam);
  const spot = add(new THREE.RingGeometry(1.6, 1.85, 40), new THREE.MeshBasicMaterial({ color: 0xffd23f, toneMapped: false }), 58, .025, 50); spot.rotation.x = -Math.PI / 2; spot.castShadow = false;
  // memories board on the south wall (group photos get pinned here)
  const cork = box(5.4, 1.9, .08, new THREE.MeshStandardMaterial({ color: 0xc49a6c, roughness: 1 }), 66, 2.2, Z1 - .06); cork.castShadow = false;
  sign('MEMORIES', 2.4, .45, 66, 3.4, Z1 - .12, Math.PI, [640, 120, '#fff6e5', '#1b2738', 70]);

  /* ---- hanging wayfinding signs and pendant lamps ---- */
  const hang = (text, x, z, ry, bg, fg) => { sign(text, 4.4, .7, x, 6.2, z, ry, [1024, 160, bg, fg, 78]); piece(M.metal, .03, H - 6.55, .03, x - 1.8 * Math.cos(ry), (H + 6.55) / 2, z + 1.8 * Math.sin(ry)); piece(M.metal, .03, H - 6.55, .03, x + 1.8 * Math.cos(ry), (H + 6.55) / 2, z - 1.8 * Math.sin(ry)); };
  hang('GATE 1 · GONDOLA', 45.97, 50, Math.PI / 2, '#ffd23f', '#1b2738');
  hang('TRAINING WING · BOULDER WALL', 46.03, 50, -Math.PI / 2, '#8ee34d', '#1b2738');
  for (const [x, z] of [[40, 42], [40, 58], [52, 36], [52, 62], [64, 44], [64, 54]]) {
    piece(M.metal, .03, H - 4.2, .03, x, (H + 4.2) / 2, z);
    const shade = add(new THREE.ConeGeometry(.6, .5, 16, 1, true), M.darkWood, x, 4.1, z); shade.castShadow = false; shade.material.side = THREE.DoubleSide;
    const bulb = add(new THREE.SphereGeometry(.2, 10, 8), M.glow, x, 3.9, z); bulb.castShadow = false;
    anim.pendants.push({ shade, bulb, x, z, ph: Math.random() * 6 });
  }
  for (const [x, z, i] of [[44, 48, 34], [62, 50, 30], [44, 36, 18]]) { const l = new THREE.PointLight(0xffd6a0, i, 26, 1.4); l.position.set(x, 6, z); group.add(l); anim.lights.push(l); }
  flush(true);
}

// seats: three rows (x) on each side of the boarding carpet, four seats per block
const SEAT_ROWS = [43, 46.5, 50];
const SEATS = [];
SEAT_ROWS.forEach((x, row) => { for (const z0 of [40.6, 53.6]) for (let k = 0; k < 4; k++) SEATS.push({ x, z: z0 + k * .95, row }); });

function makeBell(x, y, z, s, top = false) {
  const g = new THREE.Group(); g.position.set(x, y, z); group.add(g);
  if (!top) box(.9 * s, .12, .12, M.darkWood, 0, .15, 0, g);
  const pts = []; for (let k = 0; k <= 10; k++) { const f = k / 10; pts.push(new THREE.Vector2((.12 + Math.pow(f, 1.6) * .32) * s, -f * .55 * s)); }
  const swing = new THREE.Group(); g.add(swing);
  add(new THREE.LatheGeometry(pts, 18), M.gold, 0, 0, 0, swing);
  add(new THREE.SphereGeometry(.07 * s, 8, 6), M.metal, 0, -.5 * s, 0, swing);
  anim.bells.push({ g, swing, x, y: y - .3 * s, z, r: .55 * s + .25, v: 0, a: 0 });
}

/* ================= departure board (split-flap letters) ================= */
const COLS = 26, ROWS = 6, GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789·:/!-';
const board = { canvas: document.createElement('canvas'), target: Array(ROWS).fill(''), shown: Array(ROWS).fill(''), flip: 0, redraw: true };
board.canvas.width = 1024; board.canvas.height = 364;
board.tex = new THREE.CanvasTexture(board.canvas); board.tex.colorSpace = THREE.SRGBColorSpace;
const pad = (s) => (s.toUpperCase() + ' '.repeat(COLS)).slice(0, COLS);
export function setBoard(lines) {
  const next = lines.map(pad).concat(Array(ROWS).fill(pad(''))).slice(0, ROWS);
  if (next.join('|') === board.target.join('|')) return;
  board.target = next; board.flip = .55; sfx.click?.();
}
function drawBoard(dt) {
  if (board.flip <= 0 && !board.redraw) return;
  board.flip = Math.max(0, board.flip - dt); board.redraw = false;
  const g = board.canvas.getContext('2d'), cw = 1024 / COLS, rh = 364 / ROWS;
  g.fillStyle = '#141b26'; g.fillRect(0, 0, 1024, 364);
  for (let r = 0; r < ROWS; r++) {
    const t = board.target[r] || pad(''), cur = (board.shown[r] || pad('')).split('');
    for (let c = 0; c < COLS; c++) {
      if (cur[c] !== t[c]) cur[c] = board.flip > 0 && Math.random() < .7 ? GLYPHS[Math.floor(Math.random() * GLYPHS.length)] : t[c];
      const x = c * cw + 2, y = r * rh + 4;
      g.fillStyle = '#222c3b'; g.fillRect(x, y, cw - 4, rh - 8);
      g.fillStyle = '#141b26'; g.fillRect(x, y + (rh - 8) / 2 - 1, cw - 4, 2);
      g.fillStyle = r === 0 ? '#ff9f6e' : r === 1 ? '#8ee34d' : '#ffd23f';
      g.font = `900 ${Math.floor(rh * .62)}px "SF Mono", Menlo, monospace`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(cur[c], x + (cw - 4) / 2, y + (rh - 8) / 2 + 2);
    }
    board.shown[r] = cur.join('');
  }
  if (board.flip <= 0) board.shown = board.target.slice();
  board.tex.needsUpdate = true;
}
function drawClock() {
  const c = anim.clock; if (!c) return;
  const d = new Date(), m = d.getHours() * 60 + d.getMinutes(); if (m === c.last) return; c.last = m;
  const g = c.tex.image.getContext('2d'), R = 128;
  g.fillStyle = '#fff6e5'; g.beginPath(); g.arc(R, R, R - 4, 0, 7); g.fill(); g.lineWidth = 10; g.strokeStyle = '#1b2738'; g.stroke();
  for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; g.lineWidth = k % 3 ? 4 : 8; g.beginPath(); g.moveTo(R + Math.sin(a) * 96, R - Math.cos(a) * 96); g.lineTo(R + Math.sin(a) * 112, R - Math.cos(a) * 112); g.stroke(); }
  const hand = (a, len, w, col) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(R, R); g.lineTo(R + Math.sin(a) * len, R - Math.cos(a) * len); g.stroke(); };
  hand((m % 720) / 720 * Math.PI * 2, 60, 12, '#1b2738'); hand(d.getMinutes() / 60 * Math.PI * 2, 92, 7, '#ff6f59');
  g.fillStyle = '#1b2738'; g.beginPath(); g.arc(R, R, 9, 0, 7); g.fill();
  c.tex.needsUpdate = true;
}

/* ================= gondola ride ================= */
export const gondola = { phase: 'docked', t: 0, ox: 0, doors: 1, onDone: null };
export function startArrival() { gondola.phase = 'arrive'; gondola.t = 0; gondola.ox = -46; gondola.doors = 0; }
export function startDeparture(onDone) { gondola.phase = 'depart'; gondola.t = 0; gondola.onDone = onDone; }
/** Where a rider is carried to: cabin offset along the cable. */
export const rideOffset = () => ({ x: gondola.ox, y: gondola.ox < 0 ? -gondola.ox * .126 : 0 });
export const riding = () => gondola.phase === 'arrive' || gondola.phase === 'depart';
export const inGondola = (x, z) => Math.floor(x / C) === GONDOLA.i && Math.floor(z / C) === GONDOLA.j;
export function spawnSpot(k) { const o = [[-.7, -.7], [.7, -.7], [-.7, .7], [.7, .7]][k % 4]; return { x: GONDOLA.x + o[0] * .8, z: GONDOLA.z + o[1], yaw: -Math.PI / 2 }; }
/** 0 waiting (amber gate lamps), 1 boarding countdown (flashing green). */
export function setGateLight(k) { gateMode = k; }

/* ================= interactables ================= */
const SPOTS = [
  { id: 'locker', x: 37.2, z: Z0 + 1.9, r: 2.2, text: 'Open the gear locker' },
  { id: 'trail', x: 36.3, z: 44.6, r: 2, text: 'Choose the route at the desk' },
  { id: 'radio', x: 52.7, z: Z0 + 3.1, r: 2, text: 'Use the radio' },
  { id: 'camera', x: 66.7, z: 49.6, r: 2, text: 'Take a group photo' },
  ...SEATS.map((s, k) => ({ id: 'bench' + k, x: s.x - .3, z: s.z, r: 1, text: 'Take a seat', seat: { x: s.x, z: s.z, yaw: Math.PI / 2 } })),
];
export function nearInteract(x, z, yaw) {
  const fx_ = -Math.sin(yaw), fz = -Math.cos(yaw); let best = null, bd = 9;
  for (const s of SPOTS) {
    const dx = s.x - x, dz = s.z - z, d = Math.hypot(dx, dz);
    if (d > s.r || (d > .9 && (dx * fx_ + dz * fz) / d < .2)) continue;
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}

/* ================= glowsticks, snowballs & bells ================= */
const balls = [], ballGeo = new THREE.SphereGeometry(.14, 10, 8);
let onBell = null; export const setOnBell = (fn) => { onBell = fn; };
let ballHook = null; export const setBallHook = (fn) => { ballHook = fn; }; // fn(position) -> true to catch the throw
const glowGeo = new THREE.CylinderGeometry(.035, .035, .3, 8), glowMats = new Map();
export function throwSnowball(x, y, z, vx, vy, vz, color = null) {
  if (color) { // slot 2 throws a glowstick, just like in the maze
    let mat = glowMats.get(color); if (!mat) glowMats.set(color, mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).lerp(new THREE.Color('#ffffff'), .25), toneMapped: false }));
    const m = new THREE.Group(); m.add(new THREE.Mesh(glowGeo, mat));
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: flake, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false })); halo.scale.set(1, 1, 1); m.add(halo);
    m.position.set(x, y, z); group.add(m); balls.push({ m, v: new THREE.Vector3(vx, vy, vz), life: 6, rest: 0, glow: true });
    return;
  }
  const m = new THREE.Mesh(ballGeo, M.snow); m.position.set(x, y, z); m.castShadow = true; group.add(m);
  balls.push({ m, v: new THREE.Vector3(vx, vy, vz), life: 6, rest: 0 });
}
const inHall = (x, z) => x > X0 && x < X1 && z > Z0 && z < Z1;
const inBridge = (x, z) => x > 21.5 && x <= X0 + .01 && z > GATE_Z0 && z < GATE_Z1;
const inBack = (x, z) => x >= X1 - .01 && x < X1 + 4 && z > 56 && z < 60;
function blockH(x, z) { const i = Math.floor(x / C), j = Math.floor(z / C); for (const [a, b, h] of BLOCKS) if (a === i && b === j) return h; return 0; }
function updateBalls(dt) {
  for (let i = balls.length - 1; i >= 0; i--) {
    const b = balls[i], p = b.m.position; b.life -= dt;
    if (b.rest > 0) { b.rest -= dt; b.m.scale.setScalar(Math.max(.01, b.rest / 1.2)); if (b.rest <= 0) { group.remove(b.m); balls.splice(i, 1); } continue; }
    const ox = p.x, oz = p.z;
    b.v.y -= 18 * dt; p.addScaledVector(b.v, dt);
    if (b.glow) { b.m.rotation.x += dt * 9; b.m.rotation.z += dt * 6; }
    if (ballHook?.(p)) { fx.sparkle(p.x, p.y, p.z, 0xffd23f, 16); group.remove(b.m); balls.splice(i, 1); continue; }
    for (const bell of anim.bells) if (Math.hypot(p.x - bell.x, p.y - bell.y, p.z - bell.z) < bell.r) {
      bell.v += (b.v.x + b.v.z > 0 ? 1 : -1) * 4; sfx.bell(); fx.confetti(bell.x, bell.y, bell.z, 40); fx.sparkle(bell.x, bell.y, bell.z, 0xffd23f, 14);
      onBell?.(bell); group.remove(b.m); balls.splice(i, 1); b.done = true; break;
    }
    if (b.done) continue;
    // walls, glass and roof: stop where it hits
    const wasIn = inHall(ox, oz), nowIn = inHall(p.x, p.z), through = (inBridge(p.x, p.z) && p.y < 3.3) || (inBack(p.x, p.z) && p.y < DOOR_H);
    let hit = false;
    if (wasIn && !nowIn && !through) { p.x = clamp(p.x, X0 + .15, X1 - .15); p.z = clamp(p.z, Z0 + .15, Z1 - .15); hit = true; }
    if ((nowIn || through) && p.y > H - .1) { p.y = H - .15; hit = true; }
    const top = nowIn ? blockH(p.x, p.z) : 0;
    const floorY = nowIn || through ? .14 : -999;
    if (hit || p.y < floorY || (top && p.y < top)) { sfx.splat(); fx.dust(p.x, Math.max(p.y, top, 0), p.z, 6, .5); b.rest = 1.2; continue; }
    if (p.y < -40 || b.life <= 0) { group.remove(b.m); balls.splice(i, 1); }
  }
}

/* ================= polaroids ================= */
const pins = [];
export function pinPhoto(canvas) {
  const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace;
  const frame = new THREE.Group();
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 1.2), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .9 }));
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(.92, .8), new THREE.MeshBasicMaterial({ map: t })); pic.position.set(0, .08, .005);
  const pin = new THREE.Mesh(new THREE.SphereGeometry(.05, 8, 6), new THREE.MeshStandardMaterial({ color: 0xff6f59 })); pin.position.set(0, .52, .03);
  frame.add(paper, pic, pin);
  pins.push(frame); if (pins.length > 4) group.remove(pins.shift());
  pins.forEach((f, k) => { f.position.set(67.8 - k * 1.2, 2.1, Z1 - .13); f.rotation.set(0, Math.PI, ((k * 37) % 7 - 3) * .03); });
  group.add(frame);
}
export const photoCam = new THREE.PerspectiveCamera(62, 4 / 3, .1, 600);
photoCam.position.set(67.2, 1.9, 49.4); photoCam.lookAt(56, 1.3, 50);
export function flashCamera() { anim.flashT = .25; }

/* ================= public ================= */
export function enterLobbyWorld() {
  if (!built) buildOnce();
  group.visible = true;
  const L = layout(); useLayout(L);
  return L;
}
export function exitLobbyWorld() { group.visible = false; balls.splice(0).forEach((b) => group.remove(b.m)); }
export const lobbyVisible = () => group.visible;

let t = 0;
export function updateLobby(dt) {
  if (!group.visible) return;
  t += dt;
  // gondola
  const g = gondola;
  if (g.phase === 'arrive') {
    g.t += dt; const k = clamp(g.t / 3.2, 0, 1); g.ox = -46 * (1 - ease(k));
    if (k >= 1 && g.doors < 1) { g.doors = Math.min(1, g.doors + dt * 1.6); if (g.doors >= 1) { g.phase = 'docked'; sfx.chime(); } }
  } else if (g.phase === 'depart') {
    g.t += dt;
    if (g.doors > 0) { g.doors = Math.max(0, g.doors - dt * 1.8); if (g.doors === 0) sfx.click?.(); }
    else { const k = clamp((g.t - .6) / 2.4, 0, 1); g.ox = -60 * k * k; if (k >= 1 && g.onDone) { const cb = g.onDone; g.onDone = null; g.phase = 'gone'; cb(); } }
  }
  const ro = rideOffset();
  if (anim.cabin) { anim.cabin.position.set(GONDOLA.x + ro.x, ro.y + Math.sin(t * 1.3) * (riding() ? .04 : 0), GONDOLA.z); anim.cabin.rotation.z = riding() ? Math.sin(t * 2.1) * .015 : 0; }
  anim.doors.forEach((d) => { d.position.z = d.userData.side * (.87 + g.doors * 1.65); });
  if (anim.wheel) anim.wheel.rotation.z += dt * (riding() ? 3 : .2);
  // gate lamps
  const boarding = gateMode === 1 || g.phase === 'depart';
  anim.gateK += dt;
  for (const l of anim.gateLamps) l.material.color.set(boarding ? (Math.sin(anim.gateK * 9) > 0 ? 0x8ee34d : 0x2b5a2b) : 0xffa03a);
  // bells swing like pendulums, pendant lamps sway a touch
  for (const b of anim.bells) { b.v += -b.a * 14 * dt; b.v *= Math.exp(-dt * 1.2); b.a += b.v * dt; b.swing.rotation.z = b.a; }
  for (const p of anim.pendants) { const s = Math.sin(t * .7 + p.ph) * .04; p.shade.position.x = p.x + s; p.bulb.position.x = p.x + s; }
  if (anim.radioLed) anim.radioLed.visible = Math.sin(t * 6) > 0;
  if (anim.camFlash) { anim.flashT = Math.max(0, (anim.flashT || 0) - dt); anim.camFlash.scale.setScalar(anim.flashT > 0 ? 4 : 1); anim.camFlash.material.color.set(anim.flashT > 0 ? 0xffffff : 0xff6f59); }
  if (anim.sea) anim.sea.offset.x += dt * .003;
  updateBalls(dt);
  drawBoard(dt);
  drawClock();
}
