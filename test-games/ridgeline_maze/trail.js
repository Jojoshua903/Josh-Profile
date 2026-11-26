// Ridgeline trail helpers: cairns that hint at the true path, and the Trail Map item.
// Both scale with the trail-board pace: Gentle helps a lot, Standard a little, Brutal barely at all.
import { THREE, C, GRID, MID, scene, rng } from './world.js';

/* ================= the true path (start → sanctuary) ================= */
function solve(maze) {
  const prev = new Int32Array(GRID * GRID).fill(-1), id = (x, z) => x * GRID + z;
  const start = id(1, 1), goal = id(MID, MID), q = [start]; prev[start] = start;
  while (q.length) {
    const c = q.shift(); if (c === goal) break;
    const x = Math.floor(c / GRID), z = c % GRID;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, nz = z + dz;
      if (nx < 0 || nz < 0 || nx >= GRID || nz >= GRID || maze.g[nx][nz]) continue;
      const n = id(nx, nz); if (prev[n] >= 0) continue; prev[n] = c; q.push(n);
    }
  }
  if (prev[goal] < 0) return [];
  const path = []; for (let c = goal; c !== start; c = prev[c]) path.push([Math.floor(c / GRID), c % GRID]);
  path.push([1, 1]); return path.reverse();
}
const openN = (maze, x, z) => [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dz]) => !maze.g[x + dx]?.[z + dz]).length;

/* ================= cairns ================= */
const cairnGroup = new THREE.Group(); scene.add(cairnGroup);
const stoneGeo = new THREE.DodecahedronGeometry(.2, 0);
const stoneMat = new THREE.MeshStandardMaterial({ color: 0xb9b2a8, roughness: .95, flatShading: true });
const capMat = new THREE.MeshStandardMaterial({ color: 0xffd23f, roughness: .6, emissive: 0x6a4a00, emissiveIntensity: .35 });
let cairnMesh = null, capMesh = null;
export let cairnTiles = [];

/**
 * pace 0 Gentle: a cairn just past every junction on the true path, plus one every 3 tiles.
 * pace 1 Standard: a cairn just past most junctions. pace 2 Brutal: only the first few, near the start.
 */
export function buildTrail(maze, pace = 1) {
  clearTrail();
  const path = solve(maze); trail.path = path;
  if (!path.length) return;
  const r = rng(maze.seed ^ 0xca1e), spots = [];
  for (let k = 1; k < path.length - 1; k++) {
    const [px, pz] = path[k - 1], [x, z] = path[k];
    const inRoom = Math.abs(x - MID) <= 1 && Math.abs(z - MID) <= 1;
    if (inRoom) continue;
    const junction = openN(maze, px, pz) >= 3; // the tile we just left had a choice, so mark the right branch
    const want = pace === 0 ? junction || k % 3 === 0 : pace === 1 ? junction && r() < .8 : junction && k < 14;
    if (want && !maze.low[x][z] && !maze.bridge[x][z] && maze.doorAt[x][z] < 0) spots.push([x, z, px, pz]);
  }
  cairnTiles = spots.map(([x, z]) => [x, z]);
  const per = 3, n = spots.length;
  cairnMesh = new THREE.InstancedMesh(stoneGeo, stoneMat, Math.max(1, n * per)); cairnMesh.count = n * per;
  capMesh = new THREE.InstancedMesh(stoneGeo, capMat, Math.max(1, n)); capMesh.count = n;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), e = new THREE.Euler();
  spots.forEach(([x, z, px, pz], i) => {
    // sit near the wall on the side you arrive from, so it's visible from the junction
    const cx = x * C + C / 2 - (x - px) * C * .32 + (z - pz) * C * .3, cz = z * C + C / 2 - (z - pz) * C * .32 + (x - px) * C * .3;
    let y = 0;
    for (let k = 0; k < per; k++) {
      const sz = 1.25 - k * .3; e.set(r() * 3, r() * 3, r() * 3); q.setFromEuler(e); s.set(sz, sz * .7, sz);
      p.set(cx + (r() - .5) * .06, y + .13 * sz, cz + (r() - .5) * .06); m.compose(p, q, s); cairnMesh.setMatrixAt(i * per + k, m);
      y += .25 * sz;
    }
    e.set(0, r() * 3, 0); q.setFromEuler(e); s.set(.55, .45, .55); p.set(cx, y + .05, cz); m.compose(p, q, s); capMesh.setMatrixAt(i, m);
  });
  cairnMesh.castShadow = true; cairnGroup.add(cairnMesh, capMesh);
}
export function clearTrail() {
  if (cairnMesh) { cairnGroup.remove(cairnMesh, capMesh); cairnMesh.dispose(); capMesh.dispose(); cairnMesh = capMesh = null; }
  cairnTiles = []; trail.path = [];
}
export const trail = { path: [] };
export function showTrail(v) { cairnGroup.visible = v; }

/* ================= the Trail Map item ================= */
// Each local climber has a paper map. It fills in the maze around you as you explore (radius depends on pace),
// draws the line you walked, and lets you drop numbered pins with the use button.
const S = 230, T = S / GRID;
export function makeMap(hudEl, color) {
  const card = document.createElement('div'); card.className = 'mapcard';
  card.innerHTML = '<div class="mhead"><b>Trail map</b><small>use · drop a pin</small></div><canvas width="460" height="460"></canvas><div class="mfoot"><span class="pin-n">0 pins</span><span class="mkey"></span></div>';
  hudEl.appendChild(card);
  const cv = card.querySelector('canvas');
  return { card, cv, g: cv.getContext('2d'), seen: new Uint8Array(GRID * GRID), crumbs: [], pins: [], color, t: 0, lastX: null, lastZ: null };
}
export function resetMap(M) { M.seen.fill(0); M.crumbs = []; M.pins = []; M.lastX = M.lastZ = null; M.card.querySelector('.pin-n').textContent = '0 pins'; }
export function dropPin(M, x, z) {
  if (M.pins.length >= 9) M.pins.shift();
  M.pins.push({ x, z, n: (M.pins.at(-1)?.n || 0) % 9 + 1 });
  M.card.querySelector('.pin-n').textContent = `${M.pins.length} pin${M.pins.length === 1 ? '' : 's'}`;
}
/** Call every frame. Reveals tiles near the climber and redraws ~8 times a second while the map is open. */
export function updateMap(M, maze, p, others, pace, open, dt) {
  M.card.classList.toggle('on', open);
  if (!maze || maze.lobby) return;
  // explore: reveal tiles around you (Gentle 2, Standard 1, Brutal 0 = only the tiles you stand on)
  const ti = Math.floor(p.x / C), tj = Math.floor(p.z / C), R = [2, 1, 0][pace] ?? 1;
  for (let dx = -R; dx <= R; dx++) for (let dz = -R; dz <= R; dz++) { const x = ti + dx, z = tj + dz; if (x >= 0 && z >= 0 && x < GRID && z < GRID) M.seen[x * GRID + z] = 1; }
  if (M.lastX === null || Math.hypot(p.x - M.lastX, p.z - M.lastZ) > .8) { M.crumbs.push([p.x, p.z]); M.lastX = p.x; M.lastZ = p.z; if (M.crumbs.length > 1500) M.crumbs.splice(0, 300); }
  if (!open) return;
  M.t -= dt; if (M.t > 0) return; M.t = .12;
  const g = M.g, k = 2; g.setTransform(k, 0, 0, k, 0, 0);
  // parchment
  g.fillStyle = '#efe0bd'; g.fillRect(0, 0, S, S);
  for (let x = 0; x < GRID; x++) for (let z = 0; z < GRID; z++) {
    const seen = M.seen[x * GRID + z];
    if (!seen) { g.fillStyle = 'rgba(120,96,60,.18)'; g.fillRect(x * T, z * T, T, T); continue; }
    if (maze.g[x][z]) { g.fillStyle = '#5b4630'; g.fillRect(x * T, z * T, T + .3, T + .3); }
    else { g.fillStyle = '#fbf3df'; g.fillRect(x * T, z * T, T + .3, T + .3); }
    if (maze.doorAt[x][z] >= 0) { g.fillStyle = '#ff8a3d'; g.fillRect(x * T + 1, z * T + 1, T - 2, T - 2); }
    else if (!maze.g[x][z] && maze.low[x][z] > 1.5) { g.fillStyle = '#9a7b55'; g.beginPath(); g.moveTo(x * T + T / 2, z * T + 1.5); g.lineTo(x * T + T - 1.5, z * T + T - 1.5); g.lineTo(x * T + 1.5, z * T + T - 1.5); g.closePath(); g.fill(); }
  }
  // cairns you have seen (Gentle and Standard only)
  if (pace < 2) { g.fillStyle = '#c99a00'; for (const [x, z] of cairnTiles) if (M.seen[x * GRID + z]) { g.beginPath(); g.arc(x * T + T / 2, z * T + T / 2, 2.2, 0, 7); g.fill(); } }
  // sanctuary
  g.fillStyle = '#ffb02e'; g.strokeStyle = '#1b2738'; g.lineWidth = 1.5; star(g, MID * T + T / 2, MID * T + T / 2, 8, 3.6); g.fill(); g.stroke();
  // your trail
  if (M.crumbs.length > 1) {
    g.strokeStyle = M.color; g.lineWidth = 2.2; g.lineJoin = 'round'; g.lineCap = 'round'; g.setLineDash([3, 3]); g.beginPath();
    M.crumbs.forEach(([x, z], i) => { const sx = x / C * T, sz = z / C * T; i ? g.lineTo(sx, sz) : g.moveTo(sx, sz); }); g.stroke(); g.setLineDash([]);
  }
  // pins
  for (const pin of M.pins) {
    const sx = pin.x / C * T, sz = pin.z / C * T;
    g.fillStyle = '#e5383b'; g.strokeStyle = '#1b2738'; g.lineWidth = 1.4; g.beginPath(); g.arc(sx, sz - 5, 4.5, 0, 7); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(sx, sz); g.lineTo(sx, sz - 1); g.stroke();
    g.fillStyle = '#fff'; g.font = '800 6px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(pin.n, sx, sz - 4.8);
  }
  // teammates
  for (const o of others) { g.fillStyle = o.color; g.strokeStyle = '#1b2738'; g.lineWidth = 1.2; g.beginPath(); g.arc(o.x / C * T, o.z / C * T, 3.2, 0, 7); g.fill(); g.stroke(); }
  // you: an arrow pointing where you face
  const sx = p.x / C * T, sz = p.z / C * T, fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
  g.save(); g.translate(sx, sz); g.rotate(Math.atan2(fz, fx));
  g.fillStyle = M.color; g.strokeStyle = '#1b2738'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(7, 0); g.lineTo(-5, -4.5); g.lineTo(-2.5, 0); g.lineTo(-5, 4.5); g.closePath(); g.fill(); g.stroke(); g.restore();
  // compass rose
  g.fillStyle = '#5b4630'; g.font = '800 8px system-ui'; g.textAlign = 'center'; g.fillText('N', S - 10, 10);
}
function star(g, x, y, R, r) { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, d = i % 2 ? r : R; g.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d); } g.closePath(); }
