// Renderer, skies, scrolling environments, particles and camera shake.
import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import * as MD from './models.js';
export { THREE };

export const R = new THREE.WebGLRenderer({ antialias: true });
R.setPixelRatio(Math.min(devicePixelRatio, 2));
R.setSize(innerWidth, innerHeight);
R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.08;
document.getElementById('stage').appendChild(R.domElement);

export const scene = new THREE.Scene();
export const cam = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 2400);
addEventListener('resize', () => { R.setSize(innerWidth, innerHeight); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); });

const hemi = new THREE.HemisphereLight(0xffffff, 0x9a8a5a, 1.25); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 2.4); sun.position.set(30, 60, 25); scene.add(sun);
const rim = new THREE.DirectionalLight(0xffd2b0, 0.8); rim.position.set(-20, 10, -40); scene.add(rim);

export const actors = new THREE.Group(); scene.add(actors);
export const cineGroup = new THREE.Group(); scene.add(cineGroup);
const envGroup = new THREE.Group(); scene.add(envGroup);

const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { top: { value: new THREE.Color() }, bottom: { value: new THREE.Color() }, sunCol: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3() }, sunSize: { value: 1 } },
  vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform vec3 top, bottom, sunCol, sunDir; uniform float sunSize; varying vec3 vP;
    void main(){ vec3 d = normalize(vP); float h = clamp(d.y * 1.5 + 0.22, 0.0, 1.0);
      vec3 c = mix(bottom, top, pow(h, 0.75)); float s = max(dot(d, normalize(sunDir)), 0.0);
      c += sunCol * (smoothstep(0.9985 - 0.002 * sunSize, 0.9995 - 0.002 * sunSize, s) * 1.2 + pow(s, 10.0) * 0.35);
      gl_FragColor = vec4(c, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(1800, 32, 16), skyMat); sky.renderOrder = -1; scene.add(sky);

export const ENVS = [
  { top: 0x3f9cff, bottom: 0xfff0d2, fog: 0xd6ebff, sun: 0xfff1d0, sunDir: [0.35, 0.28, -1], hemiG: 0x9a8a5a, ground: 'fields', gy: 0, decor: 'city', bounds: [2.5, 16] },
  { top: 0xff7448, bottom: 0xffe4a8, fog: 0xffca96, sun: 0xfff4d0, sunDir: [-0.3, 0.12, -1], hemiG: 0xa0583a, ground: null, decor: 'rocks', bounds: [-9, 13], size: 2 },
  { top: 0x7790ff, bottom: 0xfdf3ff, fog: 0xece4ff, sun: 0xffffff, sunDir: [0.2, 0.35, -1], hemiG: 0xb7a8e8, ground: 'clouds', gy: -34, decor: 'clouds', bounds: [-6, 15] },
  { top: 0xff9a86, bottom: 0xfff2d4, fog: 0xffdcc8, sun: 0xfff6dc, sunDir: [0, 0.06, -1], hemiG: 0xb08a6a, ground: 'fields', gy: 0, decor: 'city', bounds: [2.5, 16], size: 3.5 },
  { top: 0x5fb8ff, bottom: 0xfff4e0, fog: 0xe4f1ff, sun: 0xfff1d0, sunDir: [-0.4, 0.2, -1], hemiG: 0x8fae5a, ground: 'tulips', gy: 0, decor: 'windmills', bounds: [2.5, 16] },
  { top: 0xff6ec7, bottom: 0xd8fbff, fog: 0xf3dcff, sun: 0xffffff, sunDir: [0.1, 0.3, -1], hemiG: 0x7b5cff, ground: 'grid', gy: -14, decor: 'cubes', bounds: [-6, 14], size: 1.6 },
  { top: 0x7fe0e6, bottom: 0xf6fbff, fog: 0xe6f7fb, sun: 0xffffff, sunDir: [0.3, 0.25, -1], hemiG: 0x9fd6e0, ground: 'ice', gy: -16, decor: 'crystals', bounds: [-6, 14] },
  // 7 The Old Mines, 8 The Server Farm, 9 The Crystal Vault (all-range arena).
  { top: 0x2b1d14, bottom: 0xc0703a, fog: 0x7a4626, sun: 0xffc86b, sunDir: [0.2, 0.15, -1], hemiG: 0x5a3a1e, ground: null, decor: 'rocks', bounds: [-9, 13], size: 1.4 },
  { top: 0x14060f, bottom: 0x7a1030, fog: 0x3a0f22, sun: 0xff3d5a, sunDir: [-0.2, 0.2, -1], hemiG: 0x5a0f2a, ground: 'grid', gy: -14, decor: 'cubes', bounds: [-6, 14], size: 2.2 },
  { top: 0x2a1840, bottom: 0xc9a8ff, fog: 0x8a6ac0, sun: 0xf3e8ff, sunDir: [0.3, 0.3, -1], hemiG: 0x6a4a9a, ground: null, decor: 'crystals', bounds: [-12, 22], size: 1.8 },
];
export const W = { scroll: 0, env: null, envIndex: -1, shakeOn: true, ratio: Math.min(devicePixelRatio, 2) };
export function setQuality(q) { W.ratio = q === "low" ? 0.6 : q === "medium" ? Math.min(devicePixelRatio, 1) : Math.min(devicePixelRatio, 2); R.setPixelRatio(W.ratio); R.setSize(innerWidth, innerHeight); }
export const setScroll = v => { W.scroll = v; };

function groundTex(kind) {
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
  if (kind === 'fields') {
    const cols = ['#b6d77a', '#e9d26e', '#8fc36a', '#f3e4a2', '#7fb87f', '#d9b75a', '#a7cf86'];
    g.fillStyle = '#9cc874'; g.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 512; y += 64) for (let x = 0; x < 512; x += 64) {
      g.fillStyle = cols[(Math.random() * cols.length) | 0]; g.fillRect(x + 3, y + 3, 58, 58);
      g.strokeStyle = 'rgba(19,32,68,.08)'; g.lineWidth = 2;
      for (let k = 8; k < 58; k += 8) { g.beginPath(); g.moveTo(x + 3, y + 3 + k); g.lineTo(x + 61, y + 3 + k); g.stroke(); }
    }
    g.fillStyle = '#fff6e4'; g.fillRect(250, 0, 12, 512); g.fillRect(0, 124, 512, 8);
    g.fillStyle = '#5fb3d9'; g.beginPath(); g.moveTo(0, 380);
    for (let x = 0; x <= 512; x += 32) g.lineTo(x, 380 + Math.sin(x / 50) * 18); g.lineTo(512, 404); for (let x = 512; x >= 0; x -= 32) g.lineTo(x, 404 + Math.sin(x / 50) * 18); g.fill();
  } else if (kind === 'tulips') {
    const cols = ['#ff3d5a', '#ffd23f', '#ff8fab', '#ff6d00', '#c77dff', '#fff6e4'];
    g.fillStyle = '#7fb069'; g.fillRect(0, 0, 512, 512);
    for (let x = 0; x < 512; x += 32) {
      g.fillStyle = cols[(x / 32) % cols.length]; g.fillRect(x + 3, 0, 22, 512);
      g.fillStyle = 'rgba(19,32,68,.12)'; for (let y = 0; y < 512; y += 10) g.fillRect(x + 3, y, 22, 3);
    }
    g.fillStyle = '#5fb3d9'; g.fillRect(0, 250, 512, 14); g.fillStyle = '#fff6e4'; g.fillRect(0, 264, 512, 5);
  } else if (kind === 'grid') {
    const gr = g.createLinearGradient(0, 0, 512, 512); gr.addColorStop(0, '#ffd6f5'); gr.addColorStop(1, '#d6f4ff');
    g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
    g.strokeStyle = '#ff4fd8'; g.lineWidth = 4; for (let k = 0; k <= 512; k += 64) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, 512); g.stroke(); g.beginPath(); g.moveTo(0, k); g.lineTo(512, k); g.stroke(); }
    g.fillStyle = 'rgba(8,102,255,.18)'; for (let i = 0; i < 14; i++) g.fillRect(((Math.random() * 8) | 0) * 64 + 4, ((Math.random() * 8) | 0) * 64 + 4, 56, 56);
  } else if (kind === 'ice') {
    g.fillStyle = '#e6fbff'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '127,224,230' : '200,182,255'},.25)`; g.beginPath(); g.arc(Math.random() * 512, Math.random() * 512, 20 + Math.random() * 60, 0, 7); g.fill(); }
    g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 2;
    for (let i = 0; i < 30; i++) { let x = Math.random() * 512, y = Math.random() * 512; g.beginPath(); g.moveTo(x, y); for (let s = 0; s < 4; s++) { x += rnd(-40, 40); y += rnd(-40, 40); g.lineTo(x, y); } g.stroke(); }
  } else {
    g.fillStyle = '#efe8ff'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 90; i++) {
      const x = Math.random() * 512, y = Math.random() * 512, r = 20 + Math.random() * 60;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      const c2 = Math.random() < 0.5 ? '255,255,255' : '210,198,245';
      gr.addColorStop(0, `rgba(${c2},.9)`); gr.addColorStop(1, `rgba(${c2},0)`);
      g.fillStyle = gr; for (const ox of [-512, 0, 512]) for (const oy of [-512, 0, 512]) { g.save(); g.translate(ox, oy); g.fillRect(x - r, y - r, r * 2, r * 2); g.restore(); }
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 14); t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = R.capabilities.getMaxAnisotropy();
  return t;
}

let ground = null, decor = [], streaks = null;
const rnd = (a, b) => a + Math.random() * (b - a);
const side = (a, b) => (Math.random() < 0.5 ? -1 : 1) * rnd(a, b);

export function setEnv(i) {
  if (W.envIndex === i) return;
  W.envIndex = i; const e = W.env = ENVS[i];
  envGroup.clear(); decor = []; ground = null;
  skyMat.uniforms.top.value.set(e.top); skyMat.uniforms.bottom.value.set(e.bottom);
  skyMat.uniforms.sunCol.value.set(e.sun); skyMat.uniforms.sunDir.value.set(...e.sunDir); skyMat.uniforms.sunSize.value = e.size || 1;
  scene.fog = new THREE.Fog(e.fog, 90, 560);
  hemi.groundColor.set(e.hemiG); sun.color.set(e.sun);
  sun.position.set(e.sunDir[0] * 60, Math.max(e.sunDir[1], 0.4) * 80, 30);
  if (e.ground) {
    ground = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1600), new THREE.MeshStandardMaterial({ map: groundTex(e.ground), roughness: 1, emissive: { clouds: 0x5a4a88, grid: 0x7b2cbf, ice: 0x4a8a9a }[e.ground] || 0x000000, emissiveIntensity: 0.25 }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(0, e.gy, -620); envGroup.add(ground);
  }
  const add = (m, kind) => { envGroup.add(m); decor.push({ m, kind, spin: rnd(-0.4, 0.4) }); };
  if (e.decor === 'city') {
    for (let k = 0; k < 90; k++) { const t = MD.makeTower(); t.position.set(side(24, 160), 0, rnd(-760, 40)); add(t, 'tower'); }
    for (let k = 0; k < 14; k++) { const c = MD.makeCloud(rnd(1.5, 3)); c.position.set(side(10, 220), rnd(60, 110), rnd(-760, 40)); add(c, 'cloud'); }
  } else if (e.decor === 'rocks') {
    for (let k = 0; k < 70; k++) { const a = MD.makeAsteroid(rnd(3, 14)); a.position.set(side(32, 200), rnd(-70, 70), rnd(-760, 40)); add(a, 'rock'); }
  } else if (e.decor === 'windmills') {
    for (let k = 0; k < 26; k++) { const w = makeWindmill(); w.position.set(side(26, 180), 0, rnd(-760, 40)); add(w, 'windmill'); }
    for (let k = 0; k < 40; k++) { const t = MD.makeTower(); t.scale.set(1, 0.35, 1); t.position.set(side(40, 200), 0, rnd(-760, 40)); add(t, 'tower'); }
    for (let k = 0; k < 14; k++) { const c = MD.makeCloud(rnd(1.5, 3)); c.position.set(side(10, 220), rnd(60, 110), rnd(-760, 40)); add(c, 'cloud'); }
  } else if (e.decor === 'cubes') {
    const cols = [0xff4fd8, 0x0866ff, 0x00f5d4, 0xffd23f, 0xa033ff];
    for (let k = 0; k < 80; k++) {
      const s = rnd(2, 12), m = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), MD.M(cols[k % cols.length], { emissive: cols[k % cols.length], emissiveIntensity: 0.35 }));
      m.position.set(side(28, 200), rnd(-30, 70), rnd(-760, 40)); add(m, 'rock');
    }
  } else if (e.decor === 'crystals') {
    for (let k = 0; k < 70; k++) {
      const s = rnd(3, 16), m = new THREE.Mesh(new THREE.OctahedronGeometry(s, 0), MD.M(k % 3 ? 0xbdf2f5 : 0xd9c8ff, { metalness: 0.5, roughness: 0.15, emissive: 0x7fe0e6, emissiveIntensity: 0.15 }));
      m.scale.y = rnd(1.4, 2.6); m.position.set(side(30, 200), rnd(-20, 50), rnd(-760, 40)); add(m, 'rock');
    }
  } else {
    for (let k = 0; k < 60; k++) { const c = MD.makeCloud(rnd(1.6, 3.4), 0xfbf8ff); c.position.set(rnd(-240, 240), rnd(-40, -26), rnd(-760, 40)); add(c, 'cloud'); }
    for (let k = 0; k < 14; k++) { const c = MD.makeCloud(rnd(1.5, 3)); c.position.set(side(40, 220), rnd(50, 100), rnd(-760, 40)); add(c, 'cloud'); }
  }
  const n = 180, pos = new Float32Array(n * 6);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  streaks = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.65, fog: false }));
  streaks.userData.p = Array.from({ length: n }, () => new THREE.Vector3(rnd(-45, 45), rnd(-20, 40), rnd(-300, 20)));
  streaks.frustumCulled = false; envGroup.add(streaks);
}

export function updateWorld(dt) {
  sky.position.copy(cam.position);
  const s = W.scroll;
  if (ground) { ground.material.map.offset.y += s * dt * 14 / 1600; ground.position.x = cam.position.x * 0.0; }
  for (const d of decor) {
    d.m.position.z += s * dt * (d.kind === 'cloud' && d.m.position.y > 40 ? 0.4 : 1);
    if (d.kind === 'rock') { d.m.rotation.x += d.spin * dt; d.m.rotation.y += d.spin * dt * 0.7; }
    if (d.kind === 'windmill') d.m.userData.blades.rotation.z += dt * (0.8 + d.spin);
    if (d.m.position.z > 60) d.m.position.z -= 800;
  }
  if (streaks) {
    const a = streaks.geometry.attributes.position, len = 0.6 + s * 0.05;
    streaks.userData.p.forEach((p, i) => {
      p.z += s * dt * 1.6; if (p.z > 20) { p.z -= 320; p.x = rnd(-45, 45) + cam.position.x; p.y = rnd(-20, 40); }
      a.setXYZ(i * 2, p.x, p.y, p.z); a.setXYZ(i * 2 + 1, p.x, p.y, p.z - len);
    });
    a.needsUpdate = true; streaks.material.opacity = Math.min(0.75, s / 110);
  }
}

// Particles
const parts = [], pGeo = new THREE.BoxGeometry(1, 1, 1);
const FIRE = [0xffffff, 0xfff3b0, 0xffd23f, 0xff9a3c, 0xff5a1f, 0x5a4a6a], SMOKE = [0x8a8496, 0xb9b3c4, 0x6d6878, 0xd6d0de];
function spawnPart(pos, vel, color, size, life) {
  let p = parts.find(q => !q.alive);
  if (!p) { if (parts.length > 700) return; p = { m: new THREE.Mesh(pGeo, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false })) }; scene.add(p.m); parts.push(p); }
  p.alive = true; p.m.visible = true; p.m.material.color.setHex(color);
  p.m.position.copy(pos); p.v = vel; p.life = p.max = life; p.size = size;
  p.m.rotation.set(rnd(0, 6), rnd(0, 6), rnd(0, 6)); p.spin = rnd(-6, 6);
}
export function explode(pos, scale = 1, kind = 'fire') {
  if (kind === 'smoke') {
    for (let i = 0; i < 2; i++) spawnPart(pos.clone().add(new THREE.Vector3(rnd(-.3, .3), rnd(-.3, .3), 0)), new THREE.Vector3(rnd(-1, 1), rnd(0, 2), rnd(-1, 1)), SMOKE[(Math.random() * 4) | 0], rnd(0.6, 1.2) * scale * 2, rnd(0.6, 1.1));
    return;
  }
  if (kind === 'spark') {
    for (let i = 0; i < 5; i++) spawnPart(pos.clone(), new THREE.Vector3(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize().multiplyScalar(rnd(8, 18)), i % 2 ? 0xffffff : 0xffd23f, rnd(0.2, 0.4), rnd(0.15, 0.3));
    return;
  }
  const n = Math.round(10 + 10 * Math.min(scale, 4));
  for (let i = 0; i < n; i++) {
    const v = new THREE.Vector3(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize().multiplyScalar(rnd(6, 26) * Math.sqrt(scale));
    spawnPart(pos.clone(), v, FIRE[(Math.random() * FIRE.length) | 0], rnd(0.4, 1.3) * Math.sqrt(scale), rnd(0.45, 1.1));
  }
  for (let i = 0; i < 3; i++) spawnPart(pos.clone(), new THREE.Vector3(), 0xfff6e4, 2.2 * scale, 0.22);
  for (let i = 0; i < 4; i++) spawnPart(pos.clone(), new THREE.Vector3(rnd(-3, 3), rnd(1, 4), rnd(-3, 3)), SMOKE[i], 1.5 * Math.sqrt(scale), rnd(0.9, 1.4));
}
export function updateParticles(dt, drift) {
  for (const p of parts) {
    if (!p.alive) continue;
    p.life -= dt; if (p.life <= 0) { p.alive = false; p.m.visible = false; continue; }
    p.m.position.addScaledVector(p.v, dt); p.m.position.z += drift * dt; p.v.multiplyScalar(0.95);
    const k = p.life / p.max; p.m.scale.setScalar(p.size * (0.25 + k));
    p.m.material.opacity = Math.min(1, k * 1.5); p.m.rotation.x += p.spin * dt;
  }
}

let shakeAmt = 0, flashV = 0; const off = new THREE.Vector3();
const flashEl = document.getElementById('flash');
export const shake = v => { if (W.shakeOn) shakeAmt = Math.max(shakeAmt, v); };
export const flash = (v = 1) => { flashV = Math.max(flashV, v); };
export function renderFrame(dt) {
  shakeAmt *= Math.exp(-dt * 5); flashV = Math.max(0, flashV - dt * 1.4);
  flashEl.style.opacity = flashV.toFixed(3);
  off.set(rnd(-1, 1), rnd(-1, 1), 0).multiplyScalar(shakeAmt);
  cam.position.add(off); R.render(scene, cam); cam.position.sub(off);
}

// Dutch windmill for the polder decor.
function makeWindmill() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3.6, 14, 8), MD.M(Math.random() < 0.5 ? 0x6b4423 : 0x3a5a40)); body.position.y = 7; g.add(body);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(2.8, 4, 8), MD.M(0x2b2d42)); cap.position.y = 16; g.add(cap);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.4, 0.3), MD.M(0xfff6e4)); door.position.set(0, 1.2, 3.4); g.add(door);
  const blades = new THREE.Group(); blades.position.set(0, 13, 2.8); g.add(blades);
  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Group(); arm.rotation.z = i * Math.PI / 2; blades.add(arm);
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.4, 9, 0.3), MD.M(0xfff6e4)); pole.position.y = 4.5; arm.add(pole);
    const sail = new THREE.Mesh(new THREE.BoxGeometry(2, 7, 0.1), MD.M(0xfff1d6)); sail.position.set(1.1, 5, 0); arm.add(sail);
  }
  blades.add(new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 6), MD.M(0x2b2d42)));
  g.userData.blades = blades; g.rotation.y = rnd(-0.6, 0.6);
  return g;
}

// All-range mode: the world spins around the player when they turn.
const YAXIS = new THREE.Vector3(0, 1, 0);
export function turnWorld(a) {
  if (!a) return;
  const c = Math.cos(a), s = Math.sin(a);
  const rot = p => { const x = p.x * c + p.z * s, z = -p.x * s + p.z * c; p.x = x; p.z = z; };
  for (const d of decor) { rot(d.m.position); d.m.rotation.y += a; }
  if (streaks) streaks.userData.p.forEach(rot);
  skyMat.uniforms.sunDir.value.applyAxisAngle(YAXIS, a);
}
