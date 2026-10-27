import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
export { THREE };

export const canvas = document.getElementById('c');
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

export const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x6d7891, 0.026);
export const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 400);

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

scene.add(new THREE.HemisphereLight(0xb4c0e0, 0x4a4458, 1.5));
export const sun = new THREE.DirectionalLight(0xc9d6ff, 1.5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 80 });
sun.shadow.bias = -0.0006;
scene.add(sun, sun.target);

// Cel-shaded look: three hard light bands
const grad = new THREE.DataTexture(new Uint8Array([105, 185, 255]), 3, 1, THREE.RedFormat);
grad.minFilter = grad.magFilter = THREE.NearestFilter;
grad.needsUpdate = true;
export const toon = (color) => new THREE.MeshToonMaterial({ color, gradientMap: grad });

export const OUTLINE = new THREE.MeshBasicMaterial({ color: 0x2b2440, side: THREE.BackSide });
export function addOutline(mesh, s = 1.08) {
  const o = new THREE.Mesh(mesh.geometry, OUTLINE);
  o.scale.setScalar(s);
  mesh.add(o);
  return o;
}

export const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const damp = (k, dt) => 1 - Math.exp(-k * dt);
export function approach(v, target, step) {
  return v < target ? Math.min(v + step, target) : Math.max(v - step, target);
}

// Floating text label (canvas sprite)
export function label(text, x, y, z, w = 2.6) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#fff8ec'; g.strokeStyle = '#2b2440'; g.lineWidth = 8;
  g.beginPath(); g.roundRect(8, 8, 496, 112, 56); g.fill(); g.stroke();
  g.fillStyle = '#2b2440';
  g.font = '700 54px ui-rounded, "Avenir Next", system-ui, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 256, 68);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true }));
  s.position.set(x, y, z);
  s.scale.set(w, w / 4, 1);
  scene.add(s);
  return s;
}

// Particles
const parts = [];
const pGeo = new THREE.SphereGeometry(0.12, 8, 6);
export function puff(pos, n = 8, color = 0xffffff, spd = 2.5, up = 1.2) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(pGeo, new THREE.MeshBasicMaterial({ color, transparent: true }));
    m.position.copy(pos);
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
    const s = spd * (0.6 + Math.random() * 0.6);
    parts.push({ m, v: V3(Math.cos(a) * s, Math.random() * up, Math.sin(a) * s), life: 0.5 });
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
    if (p.life <= 0) { scene.remove(p.m); p.m.material.dispose(); parts.splice(i, 1); }
  }
}

// Toast
const toastEl = document.getElementById('toast');
let toastTimer;
export function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1800);
}
