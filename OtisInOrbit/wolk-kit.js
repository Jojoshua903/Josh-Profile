import { THREE, scene, toon, addOutline, V3, label } from './core.js';
import { groundAt } from './wolk-terrain.js';

// Building helpers for the Wolkeneilanden, shared by world.js, npc.js and trials.js.
export const boxes = [];
export const movers = [];
export const lamps = [];
export const crates = [];
export const anim = [];
const edgeMat = new THREE.LineBasicMaterial({ color: 0x3a3050, transparent: true, opacity: 0.35 });

export function syncBox(b) { b.min.copy(b.pos).sub(b.half); b.max.copy(b.pos).add(b.half); }
export function solid(x, y, z, w, h, d, extra = {}) {
  const b = { pos: V3(x, y, z), half: V3(w / 2, h / 2, d / 2), min: V3(), max: V3(), ...extra };
  syncBox(b); boxes.push(b); return b;
}
export function block(x, y, z, w, h, d, top, side, extra = {}, edges = true) {
  const ms = toon(side), mt = toon(top);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [ms, ms, mt, ms, ms, ms]);
  mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true;
  if (edges) mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), edgeMat));
  scene.add(mesh);
  const b = solid(x, y, z, w, h, d, extra);
  b.mesh = mesh; b.pos = mesh.position; syncBox(b);
  return b;
}
export const pillar = (x, z, w, d, y0, top, colTop = 0x4a4a5a, colSide = 0x2a2a3a, extra = {}) => block(x, (y0 + top) / 2, z, w, top - y0, d, colTop, colSide, extra);
let hs = 83;
export const hr = () => ((hs = (hs * 16807) % 2147483647) / 2147483647);
export const gy = (x, z) => groundAt(x, z, 0);
export const mesh = (geo, mat, x, y, z, parent = scene, ol = 1.05) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true;
  if (ol) addOutline(m, ol); parent.add(m); return m;
};
export function crate(x, z, rare = false, rareName = '', y = null) {
  const g = y ?? groundAt(x, z, 0.5);
  const b = block(x, g + 0.5, z, 1, 1, 1, 0xa07040, 0x8a5d34, { crate: true, rare, id: 'k' + crates.length, rareName });
  crates.push(b);
  const col = rare ? 0x9b6bff : 0xffc23d;
  b.mesh.material.forEach((m) => m.emissive.set(rare ? 0x2a1460 : 0x2a1a00));
  const leak = new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide });
  for (const [px, pz, ry] of [[0, 0.505, 0], [0, -0.505, 0], [0.505, 0, Math.PI / 2], [-0.505, 0, Math.PI / 2]]) {
    const c = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.06), leak); c.position.set(px, 0.12, pz); c.rotation.y = ry; b.mesh.add(c);
  }
  if (rare) { const l = new THREE.PointLight(col, 5, 6, 2); l.position.y = 0.8; b.mesh.add(l); }
  return b;
}
export function sign(x, z, text, yaw = 0, y = null) {
  const g = y ?? gy(x, z);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.2), toon(0x8a6a4a)); post.position.set(x, g + 1.1, z); scene.add(post);
  label(text, x, g + 2.4, z, 2.6).rotation.y = yaw;
}
// stairs: n steps from (x, z) going in direction (dx, dz), each 1 m higher
export function stairs(x, z, dx, dz, n, y0 = 0, w = 1.6, rise = 1, colTop = 0xc89a6a, colSide = 0x8a6a4a) {
  const out = [];
  for (let k = 1; k <= n; k++) out.push(pillar(x + dx * (k - 1), z + dz * (k - 1), Math.abs(dx) > 0 ? 1.1 : w, Math.abs(dz) > 0 ? 1.1 : w, y0, y0 + rise * k, colTop, colSide));
  return out;
}
