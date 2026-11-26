// Ridgeline world: Three.js scene, maze, collision, chalk marks, glowsticks, sound
export let THREE;
try { THREE = await import('https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js'); }
catch { THREE = await import('https://unpkg.com/three@0.180.0/build/three.module.js'); }

export const N = 16, GRID = 2 * N + 1; // 33 x 33 tiles: a long climb (was 25 x 25)
// Tile size in metres. The maze uses wide 6 m corridors; Base Camp is laid out on 4 m tiles.
// These are live exports: every module that imports them sees the current value.
export const MAZE_C = 6, CAMP_C = 4;
export let C = CAMP_C, SIZE = GRID * C, CX = SIZE / 2;
export const OUT = 99; // height of "outside the map"

export function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ---------- renderer & scene ---------- */
export const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false; // the game asks for one shadow pass per frame, even with two split-screen views
renderer.info.autoReset = false;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.body.prepend(renderer.domElement);

export const scene = new THREE.Scene();
{
  const cv = document.createElement('canvas'); cv.width = 4; cv.height = 256;
  const g = cv.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#6fb0e3'); gr.addColorStop(.55, '#bcdcf2'); gr.addColorStop(1, '#eef4f8');
  g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; scene.background = t;
}
scene.fog = new THREE.Fog(0xe3edf5, 14, 120);
export const hemi = new THREE.HemisphereLight(0xdaeeff, 0xf3e9dc, 1.25);
scene.add(hemi);
export const sun = new THREE.DirectionalLight(0xfff0d8, 2.6);
sun.position.set(CX + 45, 80, CX + 30); sun.target.position.set(CX, 0, CX);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 10, far: 220 });
sun.shadow.bias = -0.0006;
scene.add(sun, sun.target);

const ground = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), new THREE.MeshStandardMaterial({ color: 0xf2f6fa, roughness: 1 }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const trail = new THREE.Mesh(new THREE.PlaneGeometry(SIZE, SIZE), new THREE.MeshStandardMaterial({ color: 0xe2e8ef, roughness: 1 }));
trail.rotation.x = -Math.PI / 2; trail.position.set(CX, 0.01, CX); trail.receiveShadow = true; scene.add(trail);

/** Switch tile size and move everything that depends on the maze footprint (ground trail, trees, sun, shadows). */
export function setTileSize(c) {
  if (c === C && sizedOnce) return; sizedOnce = true;
  C = c; SIZE = GRID * C; CX = SIZE / 2;
  const k = C / CAMP_C;
  trail.scale.set(k, k, 1); trail.position.set(CX, .01, CX);
  scenery.forEach((o) => o.scale.setScalar(k)); // the forest ring scales out with the maze so trees never grow inside it
  sun.position.set(CX - 60 * k, 72 + 20 * (k - 1), CX + 30 * k); sun.target.position.set(CX, 0, CX);
  const e = SIZE / 2 + 22; Object.assign(sun.shadow.camera, { left: -e, right: e, top: e, bottom: -e, far: 260 }); sun.shadow.camera.updateProjectionMatrix();
}
let sizedOnce = false;
/* pines & far mountains */
const scenery = [];
{
  const r = rng(77);
  const mk = (geo, color) => new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: .9 }), 90);
  const tI = mk(new THREE.CylinderGeometry(.25, .35, 1.6, 6), 0x6b4a33), lI = mk(new THREE.ConeGeometry(2.2, 6, 7), 0x2f5d4a), pI = mk(new THREE.ConeGeometry(1.1, 2.2, 7), 0xffffff);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i < 90; i++) {
    const a = r() * Math.PI * 2, d = 72 + r() * 70, sc = .8 + r() * .9, x = CX + Math.cos(a) * d, z = CX + Math.sin(a) * d;
    s.set(sc, sc, sc);
    m.compose(v.set(x, .8 * sc, z), q, s); tI.setMatrixAt(i, m);
    m.compose(v.set(x, 4.4 * sc, z), q, s); lI.setMatrixAt(i, m);
    m.compose(v.set(x, 7.1 * sc, z), q, s); pI.setMatrixAt(i, m);
  }
  [tI, lI, pI].forEach((o) => { o.castShadow = true; scene.add(o); scenery.push(o); });
  const mtM = new THREE.MeshStandardMaterial({ color: 0x8ea3bb, flatShading: true, fog: false });
  const capM = new THREE.MeshStandardMaterial({ color: 0xfbfdff, flatShading: true, fog: false });
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + r() * .2, d = 300 + r() * 60, h = 70 + r() * 110, w = 60 + r() * 50, seg = 5 + Math.floor(r() * 3);
    const mt = new THREE.Mesh(new THREE.ConeGeometry(w, h, seg), mtM);
    mt.position.set(CX + Math.cos(a) * d, h / 2 - 2, CX + Math.sin(a) * d); mt.rotation.y = r() * 3;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(w * .36, h * .36, seg), capM); cap.position.y = h / 2 - h * .18 + .5; mt.add(cap);
    scene.add(mt);
  }
}

/* snowfall */
export const flake = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'); const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); })();
const SNOW = 2200, snowGeo = new THREE.BufferGeometry(), snowPos = new Float32Array(SNOW * 3);
for (let i = 0; i < SNOW; i++) { snowPos[i * 3] = CX + (Math.random() - .5) * 170; snowPos[i * 3 + 1] = Math.random() * 34; snowPos[i * 3 + 2] = CX + (Math.random() - .5) * 170; }
snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
scene.add(new THREE.Points(snowGeo, new THREE.PointsMaterial({ size: .22, map: flake, transparent: true, depthWrite: false })));

/* ---------- maze ---------- */
export let maze = null;
const mazeGroup = new THREE.Group(); scene.add(mazeGroup);
const summit = new THREE.Group(); scene.add(summit);
let flagGeo = null, flagBase = null;
export const rayTargets = [];

function genMaze(seed, opts = {}) {
  const r = rng(seed);
  const g = Array.from({ length: GRID }, () => new Uint8Array(GRID).fill(1));
  const stack = [[1, 1]]; g[1][1] = 0;
  while (stack.length) {
    const [x, z] = stack[stack.length - 1];
    const opts = [[2, 0], [-2, 0], [0, 2], [0, -2]].filter(([dx, dz]) => { const nx = x + dx, nz = z + dz; return nx > 0 && nz > 0 && nx < GRID - 1 && nz < GRID - 1 && g[nx][nz] === 1; });
    if (!opts.length) { stack.pop(); continue; }
    const [dx, dz] = opts[Math.floor(r() * opts.length)];
    g[x + dx / 2][z + dz / 2] = 0; g[x + dx][z + dz] = 0; stack.push([x + dx, z + dz]);
  }
  // open a 3x3-tile sanctuary room at the exact centre
  for (let x = MID - 1; x <= MID + 1; x++) for (let z = MID - 1; z <= MID + 1; z++) g[x][z] = 0;
  const A = () => Array.from({ length: GRID }, () => new Float32Array(GRID));
  const maze = { g, top: A(), low: A(), bridge: A(), seed, doorAt: Array.from({ length: GRID }, () => new Int8Array(GRID).fill(-1)), doors: [], camps: [], spires: [] };
  placeDoors(maze, opts.maxDoors ?? 3);
  if (opts.puzzles !== false) placePuzzles(maze, r);
  shapeZones(maze, r);
  // stone gates fill the whole gap between the walls on either side, so nobody can be boosted over them
  for (const d of maze.doors) { const tops = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => maze.g[d.i + a]?.[d.j + b] ? maze.top[d.i + a][d.j + b] : Infinity); d.h = Math.max(6, Math.min(16, ...tops)); }
  return maze;
}

/** 0 = frost cliffs (outside), 1 = ice caverns (middle), 2 = overgrown temple (centre). */
export const zoneOf = (i, j) => { const ring = Math.max(Math.abs(i - MID), Math.abs(j - MID)); return ring <= 5 ? 2 : ring <= 10 ? 1 : 0; };
export const zoneAt = (x, z) => zoneOf(Math.floor(x / C), Math.floor(z / C));

function shapeZones(m, r) {
  const { g } = m;
  const reserved = new Set();
  for (const d of m.doors) [[d.i, d.j], ...d.plates, d.lever, ...(d.braziers || []), ...(d.runes || []).map((u) => [u.i, u.j])].filter(Boolean).forEach(([a, b]) => reserved.add(a + ',' + b));
  for (let x = 0; x < GRID; x++) for (let z = 0; z < GRID; z++) {
    if (!g[x][z]) continue;
    const edge = x === 0 || z === 0 || x === GRID - 1 || z === GRID - 1, zone = zoneOf(x, z);
    // towering canyon walls: the frost ring is tall, the ice ring taller, and the temple heart tallest of all
    m.top[x][z] = edge ? 16 + r() * 3 : zone === 2 ? 14 + r() * 2.5 : zone === 1 ? 11.5 + r() * 2.5 : 9.5 + r() * 2.5;
  }
  for (let x = 1; x < GRID - 1; x++) for (let z = 1; z < GRID - 1; z++) {
    if (g[x][z] || (x % 2) === (z % 2) || reserved.has(x + ',' + z) || (x <= 3 && z <= 3)) continue;
    const zone = zoneOf(x, z);
    if (Math.abs(x - MID) <= 2 && Math.abs(z - MID) <= 2) continue; // keep the sanctuary approach clear
    // ice bridges: arches over corridors that ridge-walkers can cross
    if (zone !== 2) {
      const flank = x % 2 === 0 ? [m.top[x][z - 1], m.top[x][z + 1]] : [m.top[x - 1][z], m.top[x + 1][z]];
      if (zone === 1 && r() < .4) { m.bridge[x][z] = Math.min(...flank); continue; }
    }
    // rock steps you must climb over (jump, then hold jump): rubble in the frost ring, ice ledges, fallen temple blocks
    const roll = r();
    if (roll < [.09, .11, .15][zone]) { m.low[x][z] = [2.3, 2.6, 2.5][zone] + r() * .9; continue; }
    // knee-high obstacles you can simply jump (costs stamina)
    if (zone !== 2 && roll < [.09, .11, .15][zone] + .07) m.low[x][z] = 1.1;
  }
  // abandoned camps in frost-zone dead ends
  const dead = [];
  for (let x = 1; x < GRID - 1; x += 2) for (let z = 1; z < GRID - 1; z += 2) {
    if (zoneOf(x, z) !== 0 || (x <= 3 && z <= 3) || reserved.has(x + ',' + z)) continue;
    const open = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([a, b]) => !g[x + a][z + b]);
    if (open.length === 1) dead.push([x, z, open[0]]);
  }
  for (let k = 0; k < 4 && dead.length; k++) m.camps.push(dead.splice(Math.floor(r() * dead.length), 1)[0]);
  // three crystal spires on ice-zone pillars, spread around the ring
  for (let k = 0; k < 3; k++) {
    const a = r() * .6 + k * (Math.PI * 2 / 3), x = MID + Math.round(Math.cos(a) * 4) * 2, z = MID + Math.round(Math.sin(a) * 4) * 2;
    if (g[x] && g[x][z]) m.spires.push([x, z, k]);
  }
}

export const MID = (GRID - 1) / 2;
function bfs(g, from, to, blocked) {
  const prev = new Int32Array(GRID * GRID).fill(-1), seen = new Uint8Array(GRID * GRID);
  const q = [from[0] * GRID + from[1]]; seen[q[0]] = 1;
  for (let h = 0; h < q.length; h++) {
    const c = q[h], x = Math.floor(c / GRID), z = c % GRID;
    if (x === to[0] && z === to[1]) { const path = []; for (let k = c; k !== -1; k = prev[k]) path.push([Math.floor(k / GRID), k % GRID]); return path.reverse(); }
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, nz = z + dz, k = nx * GRID + nz;
      if (nx < 0 || nz < 0 || nx >= GRID || nz >= GRID || seen[k] || g[nx][nz] || (blocked && blocked[0] === nx && blocked[1] === nz)) continue;
      seen[k] = 1; prev[k] = c; q.push(k);
    }
  }
  return null;
}
// Up to 3 doors on corridor tiles that every route from the start to the centre must pass through
function placeDoors(m, maxDoors = 3) {
  const P = bfs(m.g, [1, 1], [MID, MID]); if (!P) return;
  const inRoom = ([x, z]) => Math.abs(x - MID) <= 1 && Math.abs(z - MID) <= 1;
  const end = P.findIndex(inRoom);
  let last = -99;
  const wanted = (maxDoors === 1 ? [.5] : [.3, .55, .8].slice(0, maxDoors)).map((f) => Math.floor(end * f));
  for (const target of wanted) {
    for (let k = Math.max(target, last + 8, 5); k < end - 1; k++) {
      const [x, z] = P[k];
      if ((x % 2) === (z % 2)) continue; // only connector tiles (flanked by pillars)
      if (bfs(m.g, [1, 1], [MID, MID], [x, z])) continue; // a way around exists
      const id = m.doors.length;
      m.doors.push({ id, i: x, j: z, alongX: x % 2 === 0, plates: [P[k - 1], P[k - 3]], lever: P[k - 2], progress: 0, latched: false, h: 4.4 });
      m.doorAt[x][z] = id; last = k; break;
    }
  }
}

let buildHook = null;
/* ---------- puzzle gates ----------
   Two extra gates on the true path, each a chokepoint with no way around (like the plate doors):
   - Ember Gate: opens once every brazier is lit. The braziers sit in dead ends you can reach before the gate.
   - Rune Gate: a handful of rune tiles lie in the corridors just before it; step on them in the order carved on the gate.
   Everything uses the maze seed, so every player in a room gets the same puzzles. */
function placePuzzles(m, r) {
  const P = bfs(m.g, [1, 1], [MID, MID]); if (!P) return;
  const inRoom = ([x, z]) => Math.abs(x - MID) <= 1 && Math.abs(z - MID) <= 1;
  const end = P.findIndex(inRoom), onPath = new Set(P.map(([x, z]) => x + ',' + z));
  const idxOf = (d) => P.findIndex(([x, z]) => x === d.i && z === d.j);
  const taken = () => { const s = new Set(); for (const d of m.doors) [[d.i, d.j], ...d.plates, d.lever, ...(d.braziers || []), ...(d.runes || []).map((u) => [u.i, u.j])].filter(Boolean).forEach(([a, b]) => s.add(a + ',' + b)); return s; };
  const gate = (frac, kind) => {
    const ks = m.doors.map(idxOf);
    for (let k = Math.floor(end * frac); k < end - 2; k++) {
      const [x, z] = P[k];
      if ((x % 2) === (z % 2) || ks.some((q) => Math.abs(q - k) < 7)) continue;
      if (bfs(m.g, [1, 1], [MID, MID], [x, z])) continue;
      const d = { id: m.doors.length, i: x, j: z, alongX: x % 2 === 0, kind, plates: [], lever: null, approach: P[k - 1], progress: 0, latched: false, h: 4.4 };
      m.doors.push(d); m.doorAt[x][z] = d.id; return { d, k };
    }
    return null;
  };
  // tiles reachable from the start without crossing this gate or any gate after it, with walking distance from a point
  const region = (k, from) => {
    const later = new Set(m.doors.filter((d) => idxOf(d) >= k).map((d) => d.i + ',' + d.j));
    const dist = new Map([[from[0] + ',' + from[1], 0]]), q = [from];
    for (let h = 0; h < q.length; h++) {
      const [x, z] = q[h], dd = dist.get(x + ',' + z);
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + a, nz = z + b, key = nx + ',' + nz;
        if (nx < 0 || nz < 0 || nx >= GRID || nz >= GRID || m.g[nx][nz] || later.has(key) || dist.has(key)) continue;
        dist.set(key, dd + 1); q.push([nx, nz]);
      }
    }
    return dist;
  };
  const spread = (cands, n, gap) => {
    const out = [];
    for (const c of cands) if (out.every((o) => Math.abs(o[0] - c[0]) + Math.abs(o[1] - c[1]) >= gap)) { out.push(c); if (out.length === n) break; }
    return out;
  };
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // Ember Gate a little before halfway, braziers in dead ends behind you (prefer ones well off the true path)
  const eg = gate(.42, 'ember');
  if (eg) {
    const reach = region(eg.k, [1, 1]), used = taken(), dead = [];
    for (const key of reach.keys()) {
      const [x, z] = key.split(',').map(Number);
      if (x % 2 !== 1 || z % 2 !== 1 || onPath.has(key) || used.has(key) || (x <= 3 && z <= 3)) continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([a, b]) => !m.g[x + a][z + b]).length === 1) dead.push([x, z]);
    }
    const picks = spread(shuffle(dead), 3, 7);
    const more = picks.length < 3 ? spread(dead.filter((c) => !picks.includes(c)), 3 - picks.length, 3) : [];
    eg.d.braziers = picks.concat(more);
    if (eg.d.braziers.length < 2) { m.doorAt[eg.d.i][eg.d.j] = -1; m.doors.pop(); } // not enough hiding spots: skip this puzzle
  }
  // Rune Gate deeper in: 4 rune tiles within a short walk of the gate, mostly in side corridors
  const rg = gate(.68, 'rune');
  if (rg) {
    const near = region(rg.k, rg.d.approach), used = taken(), off = [], on = [];
    for (const [key, dd] of near) {
      if (dd > 8) continue;
      const [x, z] = key.split(',').map(Number);
      if (used.has(key) || inRoom([x, z])) continue;
      (onPath.has(key) ? on : off).push([x, z]);
    }
    const tiles = spread(shuffle(off).concat(shuffle(on)), 4, 2);
    if (tiles.length < 3) { m.doorAt[rg.d.i][rg.d.j] = -1; m.doors.pop(); }
    else {
      const glyphs = shuffle([0, 1, 2, 3, 4, 5]).slice(0, tiles.length);
      rg.d.runes = tiles.map(([i, j], k) => ({ i, j, g: glyphs[k] }));
      rg.d.order = shuffle(glyphs.slice());
    }
  }
}

/** decor.js registers the themed wall builder here (keeps imports one-way). */
export const setBuildHook = (fn) => { buildHook = fn; };
/** The lobby swaps in its own collision layout (same shape as a maze). */
export function useLayout(layout) { setTileSize(CAMP_C); maze = layout; rayTargets.length = 0; rayTargets.push(ground); summit.visible = false; }
export function setGroundVisible(v) { ground.visible = v; trail.visible = v; scenery.forEach((o) => o.visible = v); }
export function buildMaze(seed, opts = {}) {
  setTileSize(MAZE_C);
  maze = genMaze(seed, opts);
  summit.visible = true; setGroundVisible(true);
  rayTargets.length = 0; rayTargets.push(trail, ground);
  buildHook?.(maze, seed);
  buildSummit();
}

/** Free GPU memory for everything under a group before it is rebuilt (stops VRAM growing every round). */
export function disposeTree(root, materials = true) {
  root.traverse((o) => {
    if (o.geometry && !o.geometry.userData?.keep) o.geometry.dispose();
    if (materials && o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
  });
}
export const exitPos = () => new THREE.Vector3(CX, 0, CX);
export const SANCTUARY_R = 4.6;

function buildSummit() {
  disposeTree(summit); summit.clear(); summit.position.copy(exitPos());
  // warm glowing floor and a ring of standing stones
  const disc = new THREE.Mesh(new THREE.CircleGeometry(SANCTUARY_R, 48), new THREE.MeshBasicMaterial({ color: 0xffc46b, transparent: true, opacity: .55, toneMapped: false, depthWrite: false }));
  disc.rotation.x = -Math.PI / 2; disc.position.y = .03; summit.add(disc);
  const ring = new THREE.Mesh(new THREE.RingGeometry(SANCTUARY_R - .25, SANCTUARY_R, 64), new THREE.MeshBasicMaterial({ color: 0xff8a3d, toneMapped: false, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = .04; summit.add(ring);
  const stoneM = new THREE.MeshStandardMaterial({ color: 0x8b8178, flatShading: true });
  for (let k = 0; k < 7; k++) {
    const a = k / 7 * Math.PI * 2, st = new THREE.Mesh(new THREE.BoxGeometry(.55, 1.6 + (k % 3) * .4, .45), stoneM);
    st.position.set(Math.cos(a) * (SANCTUARY_R + .4), .8, Math.sin(a) * (SANCTUARY_R + .4)); st.rotation.y = -a; st.castShadow = true; summit.add(st);
  }
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, 4.4, 8), new THREE.MeshStandardMaterial({ color: 0x3b3f46, metalness: .4, roughness: .4 }));
  pole.position.y = 2.2; pole.castShadow = true; summit.add(pole);
  flagGeo = new THREE.PlaneGeometry(1.8, 1.1, 12, 5); flagGeo.translate(.9, 0, 0); flagBase = flagGeo.attributes.position.array.slice();
  const flag = new THREE.Mesh(flagGeo, new THREE.MeshStandardMaterial({ color: 0xff5a1f, side: THREE.DoubleSide, roughness: .7 }));
  flag.position.set(.05, 3.75, 0); flag.castShadow = true; summit.add(flag);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(.55, .9, 90, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xffa24a, transparent: true, opacity: .38, fog: false, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.y = 45; summit.add(beam);
  const glow = new THREE.PointLight(0xffa860, 60, 18, 1.5); glow.position.y = 2; summit.add(glow);
}

/* ---------- collision helpers ---------- */
export function tileTop(i, j, feet) {
  if (i < 0 || j < 0 || i >= GRID || j >= GRID) return OUT;
  if (maze.g[i][j]) return maze.top[i][j];
  const d = maze.doorAt[i][j]; if (d >= 0) { const door = maze.doors[d]; return door.h * (1 - door.progress); }
  if (maze.low[i][j]) return maze.low[i][j];
  const b = maze.bridge[i][j]; if (b && feet !== undefined && feet >= b - STEP - .05) return b; // stand on the bridge, or walk under it
  return 0;
}
export const topAt = (x, z, feet) => tileTop(Math.floor(x / C), Math.floor(z / C), feet);
export const STEP = .45;
export function blockedAt(x, z, feet, R) {
  return topAt(x - R, z - R, feet) > feet + STEP || topAt(x + R, z - R, feet) > feet + STEP || topAt(x - R, z + R, feet) > feet + STEP || topAt(x + R, z + R, feet) > feet + STEP;
}
export function groundUnder(x, z, feet, R) {
  let g = 0;
  for (const [a, b] of [[-R, -R], [R, -R], [-R, R], [R, R]]) { const t = topAt(x + a, z + b, feet); if (t <= feet + STEP && t > g) g = t; }
  return g;
}

/* ---------- climbers ---------- */
export function label(text, color) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 72; const g = c.getContext('2d');
  g.fillStyle = '#fffaf1'; g.strokeStyle = '#1b2738'; g.lineWidth = 6;
  g.beginPath(); g.roundRect(6, 6, 244, 60, 18); g.fill(); g.stroke();
  g.fillStyle = color; g.beginPath(); g.arc(38, 36, 11, 0, 7); g.fill(); g.stroke();
  g.fillStyle = '#1b2738'; g.font = 'bold 30px Futura, Avenir Next, sans-serif'; g.textBaseline = 'middle'; g.fillText(String(text).slice(0, 11), 60, 38);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthWrite: false })); sp.scale.set(1.5, .42, 1); sp.position.y = 2.35;
  return sp;
}
export function makeClimber(color, name) {
  const g = new THREE.Group();
  const jacket = new THREE.MeshStandardMaterial({ color, roughness: .75 });
  const packC = new THREE.Color(color).offsetHSL(0, -.05, -.16);
  const dark = new THREE.MeshStandardMaterial({ color: 0x27303b, roughness: .8 });
  const add = (geo, mat, x, y, z, parent = g) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o; };
  const torso = new THREE.Group(); g.add(torso);
  add(new THREE.CapsuleGeometry(.32, .62, 4, 12), jacket, 0, .86, 0, torso);
  add(new THREE.CapsuleGeometry(.1, .4, 3, 6), dark, -.15, .3, 0);
  add(new THREE.CapsuleGeometry(.1, .4, 3, 6), dark, .15, .3, 0);
  add(new THREE.SphereGeometry(.24, 16, 12), new THREE.MeshStandardMaterial({ color: 0xf0c7a0 }), 0, 1.47, 0, torso);
  add(new THREE.SphereGeometry(.26, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), jacket, 0, 1.52, 0, torso);
  add(new THREE.SphereGeometry(.09, 10, 8), new THREE.MeshStandardMaterial({ color: 0xffffff }), 0, 1.8, 0, torso);
  add(new THREE.BoxGeometry(.38, .11, .08), new THREE.MeshStandardMaterial({ color: 0x1b2738, metalness: .6, roughness: .2 }), 0, 1.5, -.22, torso);
  add(new THREE.BoxGeometry(.5, .62, .3), new THREE.MeshStandardMaterial({ color: packC, roughness: .9 }), 0, 1.0, .33, torso);
  const roll = add(new THREE.CylinderGeometry(.12, .12, .56, 10), new THREE.MeshStandardMaterial({ color: 0xf3e6c8 }), 0, 1.38, .33, torso); roll.rotation.z = Math.PI / 2;
  g.userData.torso = torso;
  if (name) g.add(label(name, color));
  return g;
}

/* ---------- chalk marks ---------- */
const texCache = {};
function markTex(kind, color) {
  const key = kind + color; if (texCache[key]) return texCache[key];
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.lineCap = 'round'; g.lineJoin = 'round';
  const line = (pts) => { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); };
  for (let pass = 0; pass < 2; pass++) {
    g.strokeStyle = pass ? 'rgba(255,255,255,.75)' : color; g.lineWidth = pass ? 4 : 14; g.shadowColor = color; g.shadowBlur = pass ? 6 : 18;
    if (kind === 'arrow') { line([[64, 112], [64, 26]]); line([[34, 56], [64, 22], [94, 56]]); }
    else { g.beginPath(); g.arc(64, 64, 40, 0, Math.PI * 2); g.stroke(); line([[44, 44], [84, 84]]); line([[84, 44], [44, 84]]); }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return texCache[key] = t;
}
const markGeo = new THREE.PlaneGeometry(.95, .95);
// one shared material per chalk colour and shape instead of one per mark
const markMats = {};
const markMat = (k, c) => markMats[k + c] || (markMats[k + c] = new THREE.MeshBasicMaterial({ map: markTex(k, c), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, toneMapped: false }));
const marks = new Map();
let markSeq = 0;
const Z = new THREE.Vector3(0, 0, 1);
export function addMark(d, key) {
  key = key || 'local' + (markSeq++);
  if (marks.has(key)) return;
  const mesh = new THREE.Mesh(markGeo, markMat(d.k, d.c));
  const n = new THREE.Vector3(d.nx, d.ny, d.nz).normalize();
  const align = new THREE.Quaternion().setFromUnitVectors(Z, n);
  mesh.quaternion.copy(new THREE.Quaternion().setFromAxisAngle(n, d.a)).multiply(align);
  mesh.position.set(d.x, d.y, d.z);
  scene.add(mesh); marks.set(key, mesh);
  if (marks.size > 300) { const [k, o] = marks.entries().next().value; scene.remove(o); marks.delete(k); }
}
const raycaster = new THREE.Raycaster();
/** Find a surface within 4 m in front of a camera. Returns chalk-mark data or null. */
export function aimSurface(cam, yaw, color) {
  const o = cam.getWorldPosition(new THREE.Vector3());
  const tries = [cam.getWorldDirection(new THREE.Vector3()), null];
  for (let i = 0; i < 2; i++) {
    let dir = tries[i];
    if (!dir) { const p = Math.min(cam.rotation.x, 0) - .6; dir = new THREE.Vector3(-Math.sin(yaw) * Math.cos(p), Math.sin(p), -Math.cos(yaw) * Math.cos(p)); }
    raycaster.set(o, dir); raycaster.far = 4;
    const hit = raycaster.intersectObjects(rayTargets, false)[0];
    if (!hit || !hit.face) continue;
    const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
    if (n.dot(dir) > 0) n.negate();
    const floor = n.y > .7;
    const p = hit.point.addScaledVector(n, .02);
    return { x: +p.x.toFixed(3), y: +p.y.toFixed(3), z: +p.z.toFixed(3), nx: +n.x.toFixed(3), ny: +n.y.toFixed(3), nz: +n.z.toFixed(3), a: +(floor ? yaw : (Math.random() - .5) * .6).toFixed(3), c: color, k: floor ? 'arrow' : 'blaze' };
  }
  return null;
}

/* ---------- glowsticks (fixed-step physics so every client lands them the same way) ---------- */
// Every point light costs every lit pixel on screen, even at intensity 0, so keep the pool small.
// When all 4 are busy, the oldest glowstick hands its light to the newest one.
const lightPool = Array.from({ length: 4 }, () => { const l = new THREE.PointLight(0xffffff, 0, 9, 1.7); l.userData.used = false; scene.add(l); return l; });
function freeLight() {
  const free = lightPool.find((l) => !l.userData.used); if (free) return free;
  for (const s of sticks.values()) if (s.light) { const l = s.light; s.light = null; return l; }
  return null;
}
const stickGeo = new THREE.CylinderGeometry(.035, .035, .3, 8);
const sticks = new Map();
let stickSeq = 0;
const H = 1 / 120, G = 18;
const stickWall = (x, z, y) => topAt(x, z, y) > y;
const stickFloor = (x, z, y) => { const t = topAt(x, z, y); return t > 0 && t < OUT && y >= t - .1 ? t : 0; };
function stepStick(s) {
  s.vy -= G * H;
  const nx = s.x + s.vx * H; if (stickWall(nx, s.z, s.y)) { s.vx *= -.42; s.vz *= .85; s.hit = true; } else s.x = nx;
  const nz = s.z + s.vz * H; if (stickWall(s.x, nz, s.y)) { s.vz *= -.42; s.vx *= .85; s.hit = true; } else s.z = nz;
  let ny = s.y + s.vy * H; const f = stickFloor(s.x, s.z, s.y) + .04;
  if (ny <= f) { ny = f; if (s.vy < -2) { s.vy *= -.35; s.vx *= .72; s.vz *= .72; s.hit = true; } else { s.vy = 0; s.vx *= .93; s.vz *= .93; } }
  s.y = ny;
  const sp = Math.hypot(s.vx, s.vy, s.vz); s.spin += H * sp * 5;
  if (ny <= f + .001 && sp < .1) s.still += H; else s.still = 0;
  if (s.still > .25) { s.rest = true; s.vx = s.vy = s.vz = 0; }
}
/** d: {x,y,z,vx,vy,vz,c,t,rest}. onRest is called once when it settles. */
export function spawnStick(d, key, onRest) {
  key = key || 'local' + (stickSeq++);
  if (sticks.has(key)) return;
  const col = new THREE.Color(d.c);
  const g = new THREE.Group();
  g.add(new THREE.Mesh(stickGeo, new THREE.MeshBasicMaterial({ color: col.clone().lerp(new THREE.Color('#ffffff'), .25), toneMapped: false })));
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: flake, color: col, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false })); halo.scale.set(1.1, 1.1, 1); g.add(halo);
  const s = { ...d, mesh: g, spin: 0, still: 0, rest: !!d.rest, onRest, light: freeLight() };
  if (s.light) { s.light.userData.used = true; s.light.color.copy(col); s.light.intensity = 9; }
  const age = d.t ? (Date.now() - d.t) / 1000 : 0;
  if (!s.rest && age > .3) { for (let i = 0; i < Math.min(age, 8) / H && !s.rest; i++) stepStick(s); s.restReported = s.rest; }
  scene.add(g); sticks.set(key, s); placeStick(s);
  return key;
}
export function settleStick(key, d) { const s = sticks.get(key); if (!s) return; Object.assign(s, { x: d.x, y: d.y, z: d.z, vx: 0, vy: 0, vz: 0, rest: true }); placeStick(s); }
function placeStick(s) {
  s.mesh.position.set(s.x, s.y, s.z);
  if (s.rest) s.mesh.children[0].rotation.set(0, s.spin, Math.PI / 2); else s.mesh.children[0].rotation.set(s.spin, 0, s.spin * .7);
  if (s.light) s.light.position.set(s.x, s.y + .2, s.z);
}
let acc = 0;
export function updateSticks(dt, onBounce) {
  acc += dt;
  while (acc >= H) {
    acc -= H;
    for (const s of sticks.values()) if (!s.rest) { s.hit = false; stepStick(s); if (s.hit && onBounce) onBounce(s); if (s.rest && !s.restReported) { s.restReported = true; s.onRest?.(s); } }
  }
  for (const s of sticks.values()) placeStick(s);
}
export function clearMarksAndSticks() {
  for (const o of marks.values()) scene.remove(o); marks.clear();
  for (const s of sticks.values()) { scene.remove(s.mesh); if (s.light) { s.light.userData.used = false; s.light.intensity = 0; } } sticks.clear();
}

/* ---------- ambient animation ---------- */
let wt = 0;
export function updateWorld(dt) {
  wt += dt;
  const a = snowGeo.attributes.position.array;
  const gust = 1.2 + Math.sin(wt * .23) * 1.6 + Math.max(0, Math.sin(wt * .61)) * 2.5; // wind comes in gusts
  for (let i = 0; i < SNOW; i++) {
    a[i * 3 + 1] -= dt * (1.4 + (i % 7) * .18); a[i * 3] += (Math.sin(wt * .7 + i) * .5 + gust) * dt;
    if (a[i * 3 + 1] < 0) a[i * 3 + 1] = 34;
    if (a[i * 3] > CX + 85) a[i * 3] -= 170; else if (a[i * 3] < CX - 85) a[i * 3] += 170;
    if (a[i * 3 + 2] > CX + 85) a[i * 3 + 2] -= 170; else if (a[i * 3 + 2] < CX - 85) a[i * 3 + 2] += 170;
  }
  snowGeo.attributes.position.needsUpdate = true;
  if (flagGeo) {
    const fp = flagGeo.attributes.position.array;
    for (let i = 0; i < fp.length; i += 3) { const x = flagBase[i]; fp[i + 2] = Math.sin(x * 3.2 - wt * 6) * .13 * x; }
    flagGeo.attributes.position.needsUpdate = true; flagGeo.computeVertexNormals();
  }
}

/* ---------- sound ---------- */
let ac = null, master = null, noiseBuf = null;
export function audioInit(vol) {
  if (ac) return; try { ac = new AudioContext(); } catch { return; }
  master = ac.createGain(); master.gain.value = vol; master.connect(ac.destination);
  noiseBuf = ac.createBuffer(1, ac.sampleRate * .3, ac.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}
export function setVolume(v) { if (master) master.gain.value = v; }
export const audioCtx = () => ({ ac, master });
function noise(type, freq, dur, vol, q = .8, sweepTo) {
  if (!ac) return; const s = ac.createBufferSource(); s.buffer = noiseBuf; s.playbackRate.value = .8 + Math.random() * .4;
  const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, ac.currentTime + dur);
  const g = ac.createGain(); g.gain.setValueAtTime(vol, ac.currentTime); g.gain.exponentialRampToValueAtTime(.001, ac.currentTime + dur);
  s.connect(f).connect(g).connect(master); s.start(); s.stop(ac.currentTime + dur + .02);
}
export function tone(freq, t0, dur, vol = .15, type = 'triangle') {
  if (!ac) return; const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0, ac.currentTime + t0); g.gain.linearRampToValueAtTime(vol, ac.currentTime + t0 + .02); g.gain.exponentialRampToValueAtTime(.001, ac.currentTime + t0 + dur);
  o.connect(g).connect(master); o.start(ac.currentTime + t0); o.stop(ac.currentTime + t0 + dur + .05);
}
export const sfx = {
  step: (run) => noise('bandpass', 900 + Math.random() * 900, .1, run ? .22 : .14),
  land: () => noise('lowpass', 500, .25, .35),
  jump: () => tone(320, 0, .12, .08, 'sine'),
  chalk: () => noise('highpass', 3500, .18, .12, .5),
  crack: () => { noise('highpass', 2500, .06, .2); tone(1300, .02, .3, .05, 'sine'); },
  tink: () => tone(1800 + Math.random() * 600, 0, .08, .04, 'sine'),
  whoosh: () => noise('bandpass', 300, .45, .3, 1.2, 2200),
  oof: () => tone(180, 0, .18, .1, 'sawtooth'),
  tired: () => tone(150, 0, .4, .08, 'sine'),
  beep: (hi) => tone(hi ? 880 : 440, 0, hi ? .35 : .18, .12, 'square'),
  fanfare: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * .12, .5, .16)),
  slam: () => { noise('lowpass', 180, .7, .9, .7); tone(55, 0, .5, .25, 'sine'); },
  grind: () => noise('bandpass', 140 + Math.random() * 60, .25, .12, 2),
  click: () => tone(620, 0, .06, .08, 'square'),
  unlock: () => [392, 523, 659].forEach((f, i) => tone(f, i * .1, .4, .12)),
  heartbeat: () => { tone(60, 0, .12, .3, 'sine'); tone(55, .18, .12, .22, 'sine'); },
  bell: () => { tone(1320, 0, 1.4, .14, 'sine'); tone(1980, 0, .9, .06, 'sine'); tone(660, 0, 1.6, .05, 'sine'); },
  shutter: () => { noise('highpass', 4000, .05, .25); tone(2200, .05, .05, .06, 'square'); },
  chime: () => [784, 988, 1175].forEach((f, i) => tone(f, i * .08, .35, .08, 'sine')),
  splat: () => noise('lowpass', 900, .15, .2),
  doom: () => [330, 262, 196, 131].forEach((f, i) => tone(f, i * .3, .8, .14, 'sawtooth')),
};
