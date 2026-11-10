// three.js (0.180.0): first from jsDelivr, which works on any website (like joshibrahim.nl).
// Inside Dia that one is blocked, so then it comes from Dia's own copy. The rest of the game waits until one has loaded.
let THREE;
try { THREE = await import('https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js'); }
catch (e) { THREE = await import('https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js'); }
import { tr } from './lang.js?v=20261111u';
export { THREE };

// Shared state, so modules can reach each other at runtime without import cycles.
export const G = { t: 0, P: null, world: null, state: 'boot', shake: 0, cutscene: false, paused: false };

export const canvas = document.getElementById('c');
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x000000, 0);

export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 1400);
function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

export const ambient = new THREE.AmbientLight(0xffffff, 0.85);
export const hemi = new THREE.HemisphereLight(0xdfe6ff, 0x6a5a7a, 0.55);
export const sun = new THREE.DirectionalLight(0xfff2dd, 1.55);
scene.add(ambient, hemi, sun, sun.target);

// Cel-shaded look from Otis in Orbit: three hard light bands
const grad = new THREE.DataTexture(new Uint8Array([105, 185, 255]), 3, 1, THREE.RedFormat);
grad.minFilter = grad.magFilter = THREE.NearestFilter;
grad.needsUpdate = true;
export const toon = (color) => new THREE.MeshToonMaterial({ color, gradientMap: grad });
export const toonV = () => new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: grad, vertexColors: true });
export const basic = (color, extra = {}) => new THREE.MeshBasicMaterial({ color, ...extra });

export const INK = 0x2b2440;
export const OUTLINE = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
export function addOutline(mesh, s = 1.08) {
  const o = new THREE.Mesh(mesh.geometry, OUTLINE);
  o.scale.setScalar(s);
  mesh.add(o);
  return o;
}
export const ink = new THREE.MeshBasicMaterial({ color: 0x1a1030 });
export const mk = (geo, mat, x, y, z, parent, ol = 1.08) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z);
  if (ol) addOutline(m, ol); if (parent) parent.add(m); return m;
};

export const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const Y = V3(0, 1, 0);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const damp = (k, dt) => 1 - Math.exp(-k * dt);
export const lerp = (a, b, k) => a + (b - a) * k;
export function approach(v, target, step) {
  return v < target ? Math.min(v + step, target) : Math.max(v - step, target);
}
export const rand = (a, b) => a + Math.random() * (b - a);
export const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// ---------- sphere helpers (Mario Galaxy planets) ----------
export function anyPerp(u) {
  const p = Math.abs(u.y) < 0.9 ? new THREE.Vector3().crossVectors(Y, u) : new THREE.Vector3().crossVectors(V3(1, 0, 0), u);
  return p.normalize();
}
const _m = new THREE.Matrix4();
// local +Y = up, local +Z = fwd (projected onto the tangent plane)
export function orientOn(obj, up, fwd) {
  const f = fwd.clone().addScaledVector(up, -fwd.dot(up));
  if (!(f.lengthSq() >= 1e-8)) f.copy(anyPerp(up));   // also catches NaN
  f.normalize();
  const x = new THREE.Vector3().crossVectors(up, f);
  _m.makeBasis(x, up, f);
  obj.quaternion.setFromRotationMatrix(_m);
}
export const DEG = Math.PI / 180;
export function LL(lat, lon) {
  const a = lat * DEG, b = lon * DEG;
  return V3(Math.cos(a) * Math.sin(b), Math.sin(a), Math.cos(a) * Math.cos(b));
}
// a direction relative to an arbitrary pole (used for arenas)
export function frameDir(pole, lat, lon) {
  const e1 = anyPerp(pole), e2 = new THREE.Vector3().crossVectors(pole, e1);
  const th = (90 - lat) * DEG, ph = lon * DEG;
  return pole.clone().multiplyScalar(Math.cos(th)).addScaledVector(e1, Math.sin(th) * Math.cos(ph)).addScaledVector(e2, Math.sin(th) * Math.sin(ph)).normalize();
}
export function placeOn(obj, planet, dir, alt = 0, yaw = 0) {
  const up = dir.clone().normalize();
  obj.position.copy(planet.c).addScaledVector(up, rOf(planet, up) + alt);
  const f = anyPerp(up).applyAxisAngle(up, yaw);
  orientOn(obj, up, f);
  return obj;
}
// the ground height in a direction. Most planets are round; a shaped one (peanut, apple, pumpkin...) has planet.shape(dir)
export const rOf = (planet, dir) => (planet.shape ? planet.r * planet.shape(dir) : planet.r);
export const surf = (planet, dir, alt = 0) => planet.c.clone().addScaledVector(dir, rOf(planet, dir) + alt);
export const dirOf = (planet, pos) => pos.clone().sub(planet.c).normalize();
export const altOf = (planet, pos) => { const d = pos.clone().sub(planet.c), r = d.length(); return r - rOf(planet, d.divideScalar(r || 1)); };
export const arc = (planet, a, b) => Math.acos(clamp(a.dot(b), -1, 1)) * planet.r;
export function tangentTo(from, to) {   // unit tangent at `from` pointing along the surface toward `to`
  const t = to.clone().addScaledVector(from, -to.dot(from));
  if (t.lengthSq() < 1e-9) return anyPerp(from);
  return t.normalize();
}
export function stepDir(dir, tangent, dist, R) { return dir.addScaledVector(tangent, dist / R).normalize(); }

// Floating text label (canvas sprite), same style as Otis in Orbit
export function label(text, w = 2.6, parent = null) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#fff8ec'; g.strokeStyle = '#2b2440'; g.lineWidth = 8;
  g.beginPath(); g.roundRect(8, 8, 496, 112, 56); g.fill(); g.stroke();
  g.fillStyle = '#2b2440';
  g.font = '800 54px ui-rounded, "SF Pro Rounded", "Avenir Next", system-ui, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 256, 68);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true }));
  s.scale.set(w, w / 4, 1);
  if (parent) parent.add(s);
  return s;
}
export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// Particles: a pool of little spheres that get reused
const parts = [], spare = [];
const pGeo = new THREE.SphereGeometry(0.12, 6, 4);
const MAX_PARTS = 420;
export function puff(pos, n = 8, color = 0xffffff, spd = 2.5, up = 1.2, upV = null) {
  n = Math.min(n, MAX_PARTS - parts.length);
  const U = upV || (G.P ? G.P.up : Y);
  const t1 = anyPerp(U), t2 = new THREE.Vector3().crossVectors(U, t1);
  for (let i = 0; i < n; i++) {
    const m = spare.pop() || new THREE.Mesh(pGeo, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }));
    m.material.color.setHex(color); m.material.opacity = 1; m.scale.setScalar(1);
    m.position.copy(pos);
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
    const s = spd * (0.6 + Math.random() * 0.6);
    const v = t1.clone().multiplyScalar(Math.cos(a) * s).addScaledVector(t2, Math.sin(a) * s).addScaledVector(U, Math.random() * up);
    parts.push({ m, v, life: 0.5 });
    scene.add(m);
  }
}
export function updateParticles(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.m.position.addScaledVector(p.v, dt);
    p.v.multiplyScalar(0.9);
    p.life -= dt;
    p.m.scale.setScalar(1 + (0.5 - p.life) * 2.2);
    p.m.material.opacity = Math.max(0, p.life * 2);
    if (p.life <= 0) { scene.remove(p.m); spare.push(p.m); parts[i] = parts[parts.length - 1]; parts.pop(); }
  }
}
export function clearParticles() { for (const p of parts) { scene.remove(p.m); spare.push(p.m); } parts.length = 0; }

// ---------- HUD helpers ----------
const $ = (id) => document.getElementById(id);
export { $ };
const toastEl = $('toast');
let toastTimer;
export function toast(msg, ms = 2200) {
  toastEl.textContent = tr(msg);
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms);
}
let bannerTimer;
export function banner(big, name, color = '#d9c8ff') {
  const b = $('banner');
  b.querySelector('.big').textContent = tr(big);
  b.querySelector('.big').style.color = color;
  $('bannerName').textContent = tr(name) || '';
  b.classList.add('show');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => b.classList.remove('show'), 2200);
}
let promptHTML = '';
export function setPrompt(html) {
  if (html === promptHTML) return;
  promptHTML = html;
  const p = $('prompt');
  p.innerHTML = tr(html); p.style.display = html ? 'block' : 'none';
}
export function fade(on, ms = 400) {
  const f = $('fade');
  f.style.transition = `opacity ${ms}ms`;
  f.style.opacity = on ? 1 : 0;
  return new Promise((r) => setTimeout(r, ms));
}
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export function disposeGroup(g) { if (g && g.parent) g.parent.remove(g); }
