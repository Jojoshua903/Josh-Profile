// Ridgeline Base Camp: the lobby. A wooden deck on a cliff above a sea of clouds.
// You arrive by gondola, hang out, customise, and depart together by gondola.
import { THREE, C, GRID, scene, flake, useLayout, sfx } from './world.js';
import { fx } from './fx.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (x) => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const tex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };

// deck occupies tiles x 9..16, z 9..15. The gondola docks in tile (8,12).
const X0 = 9 * C, X1 = 17 * C, Z0 = 9 * C, Z1 = 16 * C;
export const GONDOLA = { i: 8, j: 12, x: 8 * C + C / 2, z: 12 * C + C / 2 };
const FIRE = { x: 12 * C + C / 2, z: 12 * C + C / 2 };

function layout() {
  const A = () => Array.from({ length: GRID }, () => new Float32Array(GRID));
  const g = Array.from({ length: GRID }, () => new Uint8Array(GRID).fill(1)), top = A();
  for (let x = 0; x < GRID; x++) top[x].fill(60);
  for (let x = 9; x <= 16; x++) for (let z = 9; z <= 15; z++) g[x][z] = 0;
  g[GONDOLA.i][GONDOLA.j] = 0;
  // practice boulder: three jumpable steps, and a top block that needs a boost
  [[14, 9, 1.1], [15, 9, 2.2], [16, 9, 3.3], [16, 10, 5.2]].forEach(([x, z, h]) => { g[x][z] = 1; top[x][z] = h; });
  // training trail: a glowstick shed in the south-west corner, and a practice stone gate on the east edge with a balcony behind it
  g[9][15] = 1; top[9][15] = 2.6;
  g[17][13] = 0;
  const doorAt = Array.from({ length: GRID }, () => new Int8Array(GRID).fill(-1)); doorAt[16][13] = 0;
  const gate = { id: 0, i: 16, j: 13, alongX: true, plates: [[16, 12], [16, 14]], lever: [15, 13], progress: 0, latched: false, h: 3.2, practice: true };
  return { g, top, low: A(), bridge: A(), doorAt, doors: [gate], camps: [], spires: [], seed: 0, lobby: true };
}

/* ================= materials ================= */
const wood = tex(256, 256, (g, w, h) => {
  g.fillStyle = '#b07a4a'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 32) {
    g.fillStyle = `hsl(${24 + Math.random() * 8},${42 + Math.random() * 10}%,${42 + Math.random() * 10}%)`; g.fillRect(0, y + 2, w, 28);
    g.fillStyle = 'rgba(60,30,10,.35)'; g.fillRect(0, y, w, 3);
    for (let k = 0; k < 6; k++) { g.fillStyle = 'rgba(60,30,10,.12)'; g.fillRect(Math.random() * w, y + 6 + Math.random() * 18, 30 + Math.random() * 60, 2); }
    g.fillStyle = 'rgba(40,20,5,.5)'; const nx = Math.random() * w; g.fillRect(nx, y + 2, 3, 28);
  }
});
wood.wrapS = wood.wrapT = THREE.RepeatWrapping;
const M = {
  deck: new THREE.MeshStandardMaterial({ map: wood, roughness: .85 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x8a5a34, roughness: .85, flatShading: true }),
  darkWood: new THREE.MeshStandardMaterial({ color: 0x5a3820, roughness: .9, flatShading: true }),
  rock: new THREE.MeshStandardMaterial({ color: 0x7d7470, roughness: .95, flatShading: true }),
  snow: new THREE.MeshStandardMaterial({ color: 0xfbfdff, roughness: .6, flatShading: true }),
  glass: new THREE.MeshStandardMaterial({ color: 0xbfe6ff, transparent: true, opacity: .28, roughness: .05, metalness: .2, side: THREE.DoubleSide, depthWrite: false }),
  red: new THREE.MeshStandardMaterial({ color: 0xff6f59, roughness: .5 }),
  white: new THREE.MeshStandardMaterial({ color: 0xfff6e5, roughness: .6 }),
  metal: new THREE.MeshStandardMaterial({ color: 0x3b4250, roughness: .4, metalness: .6 }),
  window: new THREE.MeshBasicMaterial({ color: 0xffc77a, toneMapped: false }),
  teal: new THREE.MeshStandardMaterial({ color: 0x2ec4f1, roughness: .55 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xffc94a, roughness: .3, metalness: .7 }),
};

const group = new THREE.Group(); group.visible = false; scene.add(group);
const add = (geo, mat, x, y, z, parent = group) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
const box = (w, h, d, mat, x, y, z, parent) => add(new THREE.BoxGeometry(w, h, d), mat, x, y, z, parent);
const signTex = (text, w = 512, h = 128, bg = '#fff6e5', fg = '#1b2738', font = 64) => tex(w, h, (g) => {
  g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = fg; g.lineWidth = 10; g.strokeRect(6, 6, w - 12, h - 12);
  g.fillStyle = fg; g.font = `900 ${font}px ui-rounded, "Arial Rounded MT Bold", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 4);
});
const sign = (text, w, h, x, y, z, ry = 0, opts) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: signTex(text, ...(opts || [])), roughness: .8 })); m.position.set(x, y, z); m.rotation.y = ry; group.add(m); return m; };

/* ================= build once ================= */
const anim = { flames: [], lights: [], bells: [], bulbs: [], wheel: null, cabin: null, doors: [], embersT: 0, smoke: 0 };
let built = false;
function buildOnce() {
  built = true;
  // deck
  const deck = box(X1 - X0, 1, Z1 - Z0, M.deck, (X0 + X1) / 2, -.5, (Z0 + Z1) / 2); wood.repeat.set(4, 4);
  deck.receiveShadow = true;
  // cliff under the deck, dropping into the clouds
  [[52, -12, 50, 26, 1.1], [40, -22, 58, 18, 1.4], [64, -20, 44, 20, 1.3], [33, -10, 50, 9, 1.6]].forEach(([x, y, z, r, sy]) => {
    const m = add(new THREE.DodecahedronGeometry(r, 1), M.rock, x, y, z); m.scale.y = sy; m.rotation.set(Math.random(), Math.random(), 0);
  });
  [[40, -1.2, 66, 4], [66, -1.4, 66, 5], [70, -1.6, 48, 4.5], [36, -1.3, 38, 3]].forEach(([x, y, z, r]) => { const m = add(new THREE.DodecahedronGeometry(r, 1), M.snow, x, y, z); m.scale.y = .35; });
  // sea of clouds far below
  const cloudTex = tex(512, 512, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) { const x = Math.random() * w, y = Math.random() * h, r = 20 + Math.random() * 70, b = g.createRadialGradient(x, y, 0, x, y, r); b.addColorStop(0, 'rgba(255,214,190,.55)'); b.addColorStop(1, 'rgba(255,214,190,0)'); g.fillStyle = b; g.fillRect(x - r, y - r, r * 2, r * 2); }
  });
  cloudTex.wrapS = cloudTex.wrapT = THREE.RepeatWrapping; cloudTex.repeat.set(6, 6);
  const sea = add(new THREE.PlaneGeometry(1400, 1400), new THREE.MeshStandardMaterial({ map: cloudTex, color: 0xffe9e0, roughness: 1, emissive: 0xffb08a, emissiveIntensity: .15 }), 52, -26, 50);
  sea.rotation.x = -Math.PI / 2; sea.castShadow = false; anim.sea = cloudTex;
  for (let i = 0; i < 26; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: flake, color: 0xfff0ea, transparent: true, opacity: .85, depthWrite: false }));
    const a = Math.random() * 6.28, d = 40 + Math.random() * 120; s.position.set(52 + Math.cos(a) * d, -22 + Math.random() * 8, 50 + Math.sin(a) * d); s.scale.set(40 + Math.random() * 40, 14 + Math.random() * 10, 1); group.add(s);
  }

  // railings: posts, a rail and glass panels (the deck edge drops off the cliff)
  const rail = (x1, z1, x2, z2) => {
    const len = Math.hypot(x2 - x1, z2 - z1), n = Math.ceil(len / 2), ry = Math.atan2(x2 - x1, z2 - z1);
    for (let k = 0; k <= n; k++) { const f = k / n; box(.16, 1.15, .16, M.wood, x1 + (x2 - x1) * f, .58, z1 + (z2 - z1) * f); }
    const top = add(new THREE.CylinderGeometry(.07, .07, len, 8), M.darkWood, (x1 + x2) / 2, 1.15, (z1 + z2) / 2); top.rotation.set(Math.PI / 2, 0, 0); top.rotation.y = 0; top.lookAt(x2, 1.15, z2); top.rotateX(Math.PI / 2);
    const gl = add(new THREE.PlaneGeometry(len, .85), M.glass, (x1 + x2) / 2, .6, (z1 + z2) / 2); gl.rotation.y = ry + Math.PI / 2; gl.castShadow = false;
  };
  rail(X0, Z1, X1, Z1); rail(X1, Z0 + 8, X1, 13 * C); rail(X1, 14 * C, X1, Z1); rail(X0, Z0, X0, GONDOLA.z - 2); rail(X0, GONDOLA.z + 2, X0, Z1); // east rail has a gap for the practice-gate balcony

  // the lodge along the north edge
  const lodge = new THREE.Group(); group.add(lodge);
  box(X1 - X0 + 2, 7, 3, M.wood, (X0 + X1) / 2, 3.5, Z0 - 1.5, lodge);
  for (let k = 0; k < 9; k++) box(X1 - X0 + 2.2, .22, .2, M.darkWood, (X0 + X1) / 2, .4 + k * .78, Z0 + .02, lodge); // log lines
  const roof = box(X1 - X0 + 4, .5, 6, M.darkWood, (X0 + X1) / 2, 7.6, Z0 - 1.2, lodge); roof.rotation.x = -.25;
  box(X1 - X0 + 4.2, .35, 6.2, M.snow, (X0 + X1) / 2, 7.95, Z0 - 1.3, lodge).rotation.x = -.25;
  [[39.5, 3.2], [56.5, 3.2], [61, 5.4]].forEach(([x, y]) => {
    add(new THREE.PlaneGeometry(2.6, 1.8), M.window, x, y, Z0 + .06, lodge);
    box(2.9, .18, .2, M.darkWood, x, y + 1, Z0 + .1, lodge); box(2.9, .18, .2, M.darkWood, x, y - 1, Z0 + .1, lodge); box(.18, 2, .2, M.darkWood, x, y, Z0 + .1, lodge);
  });
  const doorM = add(new THREE.PlaneGeometry(2.2, 3), M.darkWood, 52, 1.5, Z0 + .05, lodge); doorM.castShadow = false;
  add(new THREE.PlaneGeometry(.6, .9), M.window, 52, 2.2, Z0 + .07, lodge);
  sign('RIDGELINE BASE CAMP', 12, 1.3, 52, 7.2, Z0 + .5, 0, [1024, 112, '#ff6f59', '#ffffff', 72]);
  const lodgeLight = new THREE.PointLight(0xffb36a, 30, 16, 1.6); lodgeLight.position.set(52, 3, Z0 + 2.5); group.add(lodgeLight);

  // string lights zig-zagging over the deck
  const bulbCols = [0xff6f59, 0xffd23f, 0x2ec4f1, 0x8ee34d, 0xa37bff];
  const strand = (a, b, sag) => {
    const pts = []; for (let k = 0; k <= 24; k++) { const f = k / 24; pts.push(new THREE.Vector3(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f - Math.sin(f * Math.PI) * sag, a.z + (b.z - a.z) * f)); }
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x1b2738 })); group.add(line);
    pts.forEach((p, k) => { if (k % 2) return; const b = add(new THREE.SphereGeometry(.12, 8, 6), new THREE.MeshBasicMaterial({ color: bulbCols[k % 5], toneMapped: false }), p.x, p.y - .12, p.z); b.castShadow = false; anim.bulbs.push(b); });
  };
  [[38, 66], [66, 66], [36.5, 46]].forEach(([x, z]) => box(.2, 4.2, .2, M.wood, x, 2.1, z - 1.6));
  strand({ x: 40, y: 6.4, z: Z0 + .2 }, { x: 38, y: 4.1, z: 64.4 }, 1.2);
  strand({ x: 52, y: 6.4, z: Z0 + .2 }, { x: 52, y: 3.6, z: 63 }, 1.4);
  strand({ x: 62, y: 6.4, z: Z0 + .2 }, { x: 66, y: 4.1, z: 64.4 }, 1.2);
  strand({ x: 38, y: 4.1, z: 64.4 }, { x: 66, y: 4.1, z: 64.4 }, .9);

  // campfire with log benches
  for (let k = 0; k < 10; k++) { const a = k / 10 * 6.28; add(new THREE.DodecahedronGeometry(.26, 0), M.rock, FIRE.x + Math.cos(a) * .85, .12, FIRE.z + Math.sin(a) * .85); }
  for (let k = 0; k < 4; k++) { const l = add(new THREE.CylinderGeometry(.1, .12, 1.2, 7), M.darkWood, FIRE.x, .2, FIRE.z); l.rotation.set(Math.PI / 2.4, k * .8, 0); }
  const fl = (c, sx, sy, y) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: flake, color: c, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false })); s.position.set(FIRE.x, y, FIRE.z); s.scale.set(sx, sy, 1); group.add(s); return s; };
  anim.flames.push({ s: fl(0xff6a1a, 1.8, 2.4, .9), b: [1.8, 2.4] }, { s: fl(0xffb347, 1.1, 1.6, .75), b: [1.1, 1.6] }, { s: fl(0xfff0b0, .55, .8, .55), b: [.55, .8] });
  const fireLight = new THREE.PointLight(0xff8a3d, 60, 18, 1.5); fireLight.position.set(FIRE.x, 1.4, FIRE.z); group.add(fireLight); anim.fireLight = fireLight;
  BENCHES.forEach((b) => { const m = add(new THREE.CylinderGeometry(.32, .34, 2.2, 9), M.wood, b.bx, .3, b.bz); m.rotation.set(0, b.ry, Math.PI / 2); });

  // gondola station, cable and cabin
  const st = new THREE.Group(); group.add(st);
  [[30.5, 46.2], [30.5, 53.8], [35.8, 46.2], [35.8, 53.8]].forEach(([x, z]) => box(.4, 6, .4, M.metal, x, 3, z, st));
  box(7, .4, 9, M.red, 33, 6.2, 50, st); box(7.2, .25, 9.2, M.snow, 33, 6.5, 50, st);
  const wheel = add(new THREE.TorusGeometry(1.5, .14, 8, 24), M.metal, 31, 5.4, 50, st); wheel.rotation.x = Math.PI / 2; anim.wheel = wheel;
  const cableStart = new THREE.Vector3(31, 5.6, 50), cableEnd = new THREE.Vector3(-420, 60, 50);
  const cable = add(new THREE.CylinderGeometry(.05, .05, cableStart.distanceTo(cableEnd), 6), M.metal, (cableStart.x + cableEnd.x) / 2, (cableStart.y + cableEnd.y) / 2, 50);
  cable.lookAt(cableEnd); cable.rotateX(Math.PI / 2); cable.castShadow = false;
  sign('GONDOLA', 3.4, .8, 36.05, 5.2, 50, Math.PI / 2, [512, 120, '#1b2738', '#ffd23f', 76]);

  const cabin = new THREE.Group(); group.add(cabin); anim.cabin = cabin;
  box(3.6, .16, 3.6, M.darkWood, 0, .02, 0, cabin);
  box(3.6, .9, .12, M.red, 0, .55, -1.74, cabin); box(3.6, .9, .12, M.red, 0, .55, 1.74, cabin); box(.12, .9, 3.6, M.red, -1.74, .55, 0, cabin);
  [[-1.74, 0, Math.PI / 2], [0, -1.74, 0], [0, 1.74, 0]].forEach(([x, z, r]) => { const g = add(new THREE.PlaneGeometry(3.5, 1.5), M.glass, x, 1.75, z, cabin); g.rotation.y = r; g.castShadow = false; });
  [[-1.74, -1.74], [-1.74, 1.74], [1.74, -1.74], [1.74, 1.74]].forEach(([x, z]) => box(.16, 2.7, .16, M.white, x, 1.35, z, cabin));
  box(3.8, .3, 3.8, M.red, 0, 2.75, 0, cabin); box(3.6, .12, 3.6, M.white, 0, 2.95, 0, cabin);
  box(3.6, .16, .16, M.white, 0, 1.0, -1.74, cabin); box(3.6, .16, .16, M.white, 0, 1.0, 1.74, cabin);
  box(.7, .5, 3.2, M.wood, -1.3, .45, 0, cabin); // bench
  box(.12, 2.6, .12, M.metal, 0, 4.2, 0, cabin); box(.6, .3, .3, M.metal, 0, 5.5, 0, cabin);
  const door = (side) => { const d = new THREE.Group(); cabin.add(d); box(.08, 2.5, 1.7, M.red, 0, 1.3, 0, d).material = M.red; const gl = add(new THREE.PlaneGeometry(1.4, 1.3), M.glass, .05, 1.65, 0, d); gl.rotation.y = Math.PI / 2; d.position.set(1.78, 0, side * .87); d.userData.side = side; anim.doors.push(d); };
  door(-1); door(1);

  // practice boulder with a bell on top
  [[14, 9, 1.1], [15, 9, 2.2], [16, 9, 3.3], [16, 10, 5.2]].forEach(([x, z, h], k) => {
    const m = box(C * .98, h, C * .98, M.rock, x * C + C / 2, h / 2, z * C + C / 2); m.material = M.rock;
    box(C, .3, C, M.snow, x * C + C / 2, h + .1, z * C + C / 2);
    for (let q = 0; q < 5; q++) add(new THREE.DodecahedronGeometry(.16, 0), new THREE.MeshStandardMaterial({ color: [0xff6f59, 0xffd23f, 0x2ec4f1, 0x8ee34d][q % 4], flatShading: true }), x * C + C / 2 + (Math.random() - .5) * 3, .4 + Math.random() * (h - .6), z * C + C / 2 + C / 2 + .02);
    if (k === 0) sign('PRACTICE BOULDER', 3, .7, x * C + C / 2, h + .9, z * C + C / 2 + 1.6, 0, [640, 140, '#8ee34d', '#1b2738', 62]);
  });
  makeBell(16 * C + C / 2, 5.4, 10 * C + C / 2, 1.4, true);

  // snowball range: bells on posts rising out of the cliff, beyond the south railing
  [[42, 71, 2.4], [52, 75, 3.4], [62, 70, 2.2]].forEach(([x, z, y]) => { box(.25, 30, .25, M.darkWood, x, y - 15 + 1.2, z); makeBell(x, y + 1.6, z, 1); });
  for (let k = 0; k < 9; k++) add(new THREE.SphereGeometry(.22 + Math.random() * .08, 10, 8), M.snow, 47 + (Math.random() - .5) * 1.2, .2 + (k > 5 ? .3 : 0), 62.4 + (Math.random() - .5) * .9);
  sign('GLOWSTICK RANGE · RING THE BELLS', 5, .7, 52, 1.6, 63.85, Math.PI, [1024, 140, '#2ec4f1', '#1b2738', 60]);

  // gear locker
  const lk = new THREE.Group(); lk.position.set(42, 0, Z0 + .45); group.add(lk);
  box(2, 2.6, .9, M.teal, 0, 1.3, 0, lk); box(.06, 2.4, .05, M.metal, 0, 1.3, .46, lk);
  [-.4, .4].forEach((x) => box(.1, .4, .08, M.gold, x, 1.4, .48, lk));
  for (let k = 0; k < 6; k++) box(.08, .02, .02, M.metal, -.6 + (k % 3) * .1, 2.3 - Math.floor(k / 3) * .08, .47, lk);
  const gearSign = sign('GEAR', 1.6, .5, 0, 2.95, .48, 0, [400, 120, '#ffd23f', '#1b2738', 80]); group.remove(gearSign); lk.add(gearSign);

  // trail board (expedition settings) and radio (invites)
  const tb = new THREE.Group(); tb.position.set(39.4, 0, 44.5); tb.rotation.y = Math.PI / 2; group.add(tb);
  box(.2, 2, .2, M.wood, -1, 1, 0, tb); box(.2, 2, .2, M.wood, 1, 1, 0, tb);
  const mapTex = tex(512, 320, (g, w, h) => {
    g.fillStyle = '#fff6e5'; g.fillRect(0, 0, w, h); g.strokeStyle = '#1b2738'; g.lineWidth = 12; g.strokeRect(6, 6, w - 12, h - 12);
    g.lineWidth = 5; g.strokeStyle = '#8b8079'; for (let k = 0; k < 7; k++) { g.beginPath(); g.ellipse(w / 2, h / 2 + 10, 40 + k * 26, 24 + k * 16, 0, 0, 6.28); g.stroke(); }
    g.strokeStyle = '#ff6f59'; g.setLineDash([14, 12]); g.lineWidth = 8; g.beginPath(); g.moveTo(40, h - 40); g.bezierCurveTo(160, h - 60, 140, 90, w / 2, h / 2 + 10); g.stroke(); g.setLineDash([]);
    g.fillStyle = '#1b2738'; g.font = '900 38px ui-rounded, sans-serif'; g.fillText('TRAIL BOARD', 24, 52);
  });
  add(new THREE.PlaneGeometry(2.2, 1.4), new THREE.MeshStandardMaterial({ map: mapTex, roughness: .9 }), 0, 1.6, .12, tb);
  box(2.4, 1.6, .1, M.darkWood, 0, 1.6, 0, tb);
  const rd = new THREE.Group(); rd.position.set(39.2, 0, 55.6); group.add(rd);
  box(1.4, .9, .9, M.wood, 0, .45, 0, rd);
  box(.9, .5, .4, M.red, 0, 1.15, 0, rd); add(new THREE.CylinderGeometry(.14, .14, .05, 14), M.metal, -.2, 1.15, -.21, rd).rotation.x = Math.PI / 2;
  const ant = box(.03, .9, .03, M.metal, .3, 1.8, 0, rd); ant.rotation.z = -.3;
  const radioLed = add(new THREE.SphereGeometry(.05, 8, 6), new THREE.MeshBasicMaterial({ color: 0x8ee34d, toneMapped: false }), .25, 1.3, -.21, rd); anim.radioLed = radioLed;

  // group-photo camera on a tripod
  const cam = new THREE.Group(); cam.position.set(61.5, 0, 58.5); cam.lookAt(50, 0, 47); group.add(cam);
  [0, 2.1, 4.2].forEach((a) => { const l = box(.05, 1.6, .05, M.metal, Math.cos(a) * .3, .75, Math.sin(a) * .3, cam); l.rotation.set(Math.sin(a) * .2, 0, -Math.cos(a) * .2); });
  box(.55, .38, .32, M.metal, 0, 1.65, 0, cam);
  add(new THREE.CylinderGeometry(.13, .15, .22, 14), M.metal, 0, 1.65, .25, cam).rotation.x = Math.PI / 2;
  anim.camFlash = add(new THREE.SphereGeometry(.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff6f59, toneMapped: false }), .2, 1.9, .15, cam);

  // polaroid wall
  const cork = box(5, 1.8, .08, new THREE.MeshStandardMaterial({ color: 0xc49a6c, roughness: 1 }), 47, 2.2, Z0 + .06);
  cork.castShadow = false;
  sign('BASE CAMP MEMORIES', 3.2, .45, 47, 3.35, Z0 + .12, 0, [800, 112, '#fff6e5', '#1b2738', 60]);

  // departure board
  board.mesh = new THREE.Mesh(new THREE.PlaneGeometry(9, 3.2), new THREE.MeshBasicMaterial({ map: board.tex, toneMapped: false }));
  board.mesh.position.set(52, 4.75, Z0 + .1); group.add(board.mesh);
  box(9.4, 3.6, .2, M.darkWood, 52, 4.75, Z0 + .02);
}

const BENCHES = [0, 1, 2, 3].map((k) => {
  const a = Math.PI / 4 + k * Math.PI / 2, r = 2.6;
  const bx = FIRE.x + Math.cos(a) * r, bz = FIRE.z + Math.sin(a) * r;
  return { bx, bz, ry: -a - Math.PI / 2, seat: { x: FIRE.x + Math.cos(a) * (r - .1), z: FIRE.z + Math.sin(a) * (r - .1), yaw: Math.atan2(Math.cos(a), Math.sin(a)) } };
});

function makeBell(x, y, z, s, top = false) {
  const g = new THREE.Group(); g.position.set(x, y, z); group.add(g);
  if (!top) box(.9 * s, .12, .12, M.darkWood, 0, .15, 0, g);
  const pts = []; for (let k = 0; k <= 10; k++) { const f = k / 10; pts.push(new THREE.Vector2((.12 + Math.pow(f, 1.6) * .32) * s, -f * .55 * s)); }
  const swing = new THREE.Group(); g.add(swing);
  const bell = add(new THREE.LatheGeometry(pts, 18), M.gold, 0, 0, 0, swing); bell.material = M.gold;
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

/* ================= gondola ride ================= */
export const gondola = { phase: 'docked', t: 0, ox: 0, doors: 1, onDone: null };
export function startArrival() { gondola.phase = 'arrive'; gondola.t = 0; gondola.ox = -46; gondola.doors = 0; }
export function startDeparture(onDone) { gondola.phase = 'depart'; gondola.t = 0; gondola.onDone = onDone; }
/** Where a rider is carried to: cabin offset along the cable. */
export const rideOffset = () => ({ x: gondola.ox, y: gondola.ox < 0 ? -gondola.ox * .126 : 0 });
export const riding = () => gondola.phase === 'arrive' || gondola.phase === 'depart';
export const inGondola = (x, z) => Math.floor(x / C) === GONDOLA.i && Math.floor(z / C) === GONDOLA.j;
export function spawnSpot(k) { const o = [[-.7, -.7], [.7, -.7], [-.7, .7], [.7, .7]][k % 4]; return { x: GONDOLA.x + o[0] * .8, z: GONDOLA.z + o[1], yaw: -Math.PI / 2 }; }

/* ================= interactables ================= */
const SPOTS = [
  { id: 'locker', x: 42, z: Z0 + 1.6, r: 2, text: 'Open the gear locker' },
  { id: 'trail', x: 40.6, z: 44.5, r: 2, text: 'Read the trail board' },
  { id: 'radio', x: 40.4, z: 55.6, r: 2, text: 'Use the radio' },
  { id: 'camera', x: 60.8, z: 57.6, r: 2, text: 'Take a group photo' },
  ...BENCHES.map((b, k) => ({ id: 'bench' + k, x: b.bx, z: b.bz, r: 1.5, text: 'Sit by the fire', seat: b.seat })),
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

/* ================= snowballs & bells ================= */
const balls = [], ballGeo = new THREE.SphereGeometry(.14, 10, 8);
let onBell = null; export const setOnBell = (fn) => { onBell = fn; };
let ballHook = null; export const setBallHook = (fn) => { ballHook = fn; }; // fn(position) -> true to catch the throw
const glowGeo = new THREE.CylinderGeometry(.035, .035, .3, 8), glowMats = new Map();
export function throwSnowball(x, y, z, vx, vy, vz, color = null) {
  if (color) { // at camp, slot 2 throws a glowstick, just like in the maze
    let mat = glowMats.get(color); if (!mat) glowMats.set(color, mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).lerp(new THREE.Color('#ffffff'), .25), toneMapped: false }));
    const m = new THREE.Group(); m.add(new THREE.Mesh(glowGeo, mat));
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: flake, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false })); halo.scale.set(1, 1, 1); m.add(halo);
    m.position.set(x, y, z); group.add(m); balls.push({ m, v: new THREE.Vector3(vx, vy, vz), life: 6, rest: 0, glow: true });
    return;
  }
  const m = new THREE.Mesh(ballGeo, M.snow); m.position.set(x, y, z); m.castShadow = true; group.add(m);
  balls.push({ m, v: new THREE.Vector3(vx, vy, vz), life: 6, rest: 0 });
}
function updateBalls(dt) {
  for (let i = balls.length - 1; i >= 0; i--) {
    const b = balls[i], p = b.m.position; b.life -= dt;
    if (b.rest > 0) { b.rest -= dt; b.m.scale.setScalar(Math.max(.01, b.rest / 1.2)); if (b.rest <= 0) { group.remove(b.m); balls.splice(i, 1); } continue; }
    b.v.y -= 18 * dt; p.addScaledVector(b.v, dt);
    if (b.glow) { b.m.rotation.x += dt * 9; b.m.rotation.z += dt * 6; }
    if (ballHook?.(p)) { fx.sparkle(p.x, p.y, p.z, 0xffd23f, 16); group.remove(b.m); balls.splice(i, 1); continue; }
    const onDeck = p.x > X0 - .2 && p.x < X1 + .2 && p.z > Z0 && p.z < Z1 + .2;
    for (const bell of anim.bells) if (Math.hypot(p.x - bell.x, p.y - bell.y, p.z - bell.z) < bell.r) {
      bell.v += (b.v.x + b.v.z > 0 ? 1 : -1) * 4; sfx.bell(); fx.confetti(bell.x, bell.y, bell.z, 40); fx.sparkle(bell.x, bell.y, bell.z, 0xffd23f, 14);
      onBell?.(bell); group.remove(b.m); balls.splice(i, 1); b.done = true; break;
    }
    if (b.done) continue;
    const i0 = Math.floor(p.x / C), j0 = Math.floor(p.z / C);
    const wallH = onDeck && i0 >= 14 && i0 <= 16 && j0 >= 9 && j0 <= 10 ? [[14, 9, 1.1], [15, 9, 2.2], [16, 9, 3.3], [16, 10, 5.2]].find(([a, c]) => a === i0 && c === j0)?.[2] || 0 : 0;
    const hitLodge = p.z < Z0 + .1 && p.y < 7 && p.x > X0 - 1 && p.x < X1 + 1;
    if ((onDeck && p.y < .14) || p.y < wallH || hitLodge) { if (hitLodge) p.z = Z0 + .15; sfx.splat(); fx.dust(p.x, Math.max(p.y, wallH), p.z, 6, .5); b.rest = 1.2; continue; }
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
  pins.forEach((f, k) => { f.position.set(45.25 + k * 1.18, 2.1, Z0 + .13); f.rotation.z = ((k * 37) % 7 - 3) * .03; });
  group.add(frame);
}
export const photoCam = new THREE.PerspectiveCamera(62, 4 / 3, .1, 400);
photoCam.position.set(61.3, 1.9, 58.3); photoCam.lookAt(50, 1.1, 47.5);
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
  // fire
  for (const f of anim.flames) { const w = 1 + Math.sin(t * 13 + f.b[0] * 5) * .1 + Math.sin(t * 23) * .06; f.s.scale.set(f.b[0] * w, f.b[1] * (2 - w), 1); }
  if (anim.fireLight) anim.fireLight.intensity = 55 + Math.sin(t * 17) * 6 + Math.sin(t * 6.3) * 5;
  anim.embersT -= dt; if (anim.embersT <= 0) { anim.embersT = .12; fx.sparkle(FIRE.x, .6, FIRE.z, 0xffa040, 1); }
  // bells swing like pendulums
  for (const b of anim.bells) { b.v += -b.a * 14 * dt; b.v *= Math.exp(-dt * 1.2); b.a += b.v * dt; b.swing.rotation.z = b.a; }
  // string lights twinkle
  anim.bulbs.forEach((b, k) => { b.scale.setScalar(.9 + Math.sin(t * 2 + k * 1.7) * .18); });
  if (anim.radioLed) anim.radioLed.visible = Math.sin(t * 6) > 0;
  if (anim.camFlash) { anim.flashT = Math.max(0, (anim.flashT || 0) - dt); anim.camFlash.scale.setScalar(anim.flashT > 0 ? 4 : 1); anim.camFlash.material.color.set(anim.flashT > 0 ? 0xffffff : 0xff6f59); }
  if (anim.sea) anim.sea.offset.x += dt * .003;
  updateBalls(dt);
  drawBoard(dt);
}
