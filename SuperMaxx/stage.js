import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { cfg } from './settings.js?v=20261126f';
import { bake } from './rig.js?v=20261126f';

// Stage atmosphere: sky, sun, fill light, haze, image-based lighting and set dressing.
// Each stage has its own time of day; Maxx Island (Survivor) gets a tropical midday.

export const LOOK = {
  plaza: {      // golden hour over the harbour
    top: 0x3f86d8, horizon: 0xffc994, bottom: 0xe9a777, sun: 0xffc27a, sunI: 3.1, sunPos: [-60, 32, 70],
    hemiSky: 0xffe6c8, hemiGround: 0xc98a5a, hemiI: 0.85, fill: 0x8fb4ff, fillI: 0.55, fog: 0xf5cfa6, fogD: 0.0042, env: 0.75,
    motes: 0xffd9a0, shafts: 0.07, clouds: 0xffe3c4,
  },
  canals: {     // bright spring morning
    top: 0x4f9de6, horizon: 0xe6f3f6, bottom: 0xc9d7d3, sun: 0xfff0d8, sunI: 2.9, sunPos: [50, 70, -30],
    hemiSky: 0xeef6ff, hemiGround: 0xa89878, hemiI: 0.9, fill: 0xb8d4ff, fillI: 0.5, fog: 0xdce9ef, fogD: 0.0036, env: 0.8,
    motes: 0xffffff, shafts: 0.04, clouds: 0xffffff,
  },
  terraces: {   // misty pink dawn at the mountain temple
    top: 0x6a9fdc, horizon: 0xffd3df, bottom: 0xd8b6c4, sun: 0xffd6dc, sunI: 2.6, sunPos: [40, 38, 40],
    hemiSky: 0xfff0f6, hemiGround: 0x8fae74, hemiI: 0.95, fill: 0xa7c0ff, fillI: 0.5, fog: 0xf1d8e3, fogD: 0.0052, env: 0.7,
    motes: 0xffc4d6, shafts: 0.09, mist: true, clouds: 0xffeef4,
  },
  alpine: {     // Frostpeak: low winter sun, peach sky over cold blue snow
    top: 0x4a66c4, horizon: 0xffbfa0, bottom: 0xd7c6d6, sun: 0xffb98a, sunI: 2.8, sunPos: [-50, 26, 60],
    hemiSky: 0xeef0ff, hemiGround: 0xb9c6dd, hemiI: 0.95, fill: 0x9db8ff, fillI: 0.6, fog: 0xe6dfec, fogD: 0.0046, env: 0.8,
    motes: 0xffffff, shafts: 0.06, clouds: 0xffe6dc,
  },
  neon: {      // Neon Heights: night over the city, moonlight with pink and cyan neon bounce
    top: 0x0b0d2e, horizon: 0xd44a8a, bottom: 0x2a1650, sun: 0xd8d4ff, sunI: 1.7, sunPos: [-40, 40, 80],
    hemiSky: 0x9a8aff, hemiGround: 0x6a2a7a, hemiI: 1.15, fill: 0xff5aa8, fillI: 0.8, fog: 0x3a1a5a, fogD: 0.0055, env: 0.65,
    motes: 0xff9ad8, shafts: 0, clouds: 0x2a1a4a, cloudCol: 0x4a3a7a, night: true,
  },
  island: {     // Survivor: hot tropical midday
    top: 0x2a84e4, horizon: 0xbfe8ff, bottom: 0x9fd6e8, sun: 0xfff4dc, sunI: 3.3, sunPos: [30, 80, 20],
    hemiSky: 0xe8f6ff, hemiGround: 0x9fb67c, hemiI: 0.85, fill: 0x9fd0ff, fillI: 0.45, fog: 0xcdeeff, fogD: 0.0028, env: 0.85,
    motes: 0xfff6c8, shafts: 0.05, clouds: 0xffffff,
  },
};
export const lookFor = map => LOOK[map.id] || LOOK[map.theme] || LOOK.plaza;

// ---------- sky ----------
const SKY_VS = 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }';
const SKY_FS = `
uniform vec3 top; uniform vec3 horizon; uniform vec3 bottom; uniform vec3 sunCol; uniform vec3 sunDir; varying vec3 vP;
void main(){
  vec3 d = normalize(vP); float h = d.y;
  vec3 col = h > 0.0 ? mix(horizon, top, pow(clamp(h * 1.5, 0.0, 1.0), 0.55)) : mix(horizon, bottom, clamp(-h * 4.0, 0.0, 1.0));
  float s = max(dot(d, sunDir), 0.0);
  col += sunCol * (pow(s, 1200.0) * 4.0 + pow(s, 40.0) * 0.45 + pow(s, 5.0) * 0.16);
  float band = sin(d.x * 9.0 + d.z * 5.0 + h * 4.0) * sin(d.z * 11.0 - d.x * 3.0);
  col = mix(col, vec3(1.0), smoothstep(0.6, 1.0, band) * smoothstep(0.04, 0.35, h) * 0.16);   // faint high cirrus
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
function skyDome(L, radius = 380) {
  const sunDir = new THREE.Vector3(...L.sunPos).normalize();
  return new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(L.top) }, horizon: { value: new THREE.Color(L.horizon) }, bottom: { value: new THREE.Color(L.bottom) },
      sunCol: { value: new THREE.Color(L.sun) }, sunDir: { value: sunDir } },
    vertexShader: SKY_VS, fragmentShader: SKY_FS,
  }));
}

export function buildStageSky(scene, map) {
  const L = lookFor(map);
  scene.userData.look = L;
  scene.add(skyDome(L));
  scene.background = new THREE.Color(L.horizon);
  scene.fog = new THREE.FogExp2(L.fog, L.fogD);
  // light: warm key sun with shadows, sky/ground bounce, and a cool fill from the far side
  scene.add(new THREE.HemisphereLight(L.hemiSky, L.hemiGround, L.hemiI));
  const sun = new THREE.DirectionalLight(L.sun, L.sunI);
  sun.position.set(...L.sunPos); sun.castShadow = true;
  const big = cfg.quality === 'ultra';
  sun.shadow.mapSize.set(big ? 4096 : 2048, big ? 4096 : 2048);
  const s = Math.max(map.W, map.L) + 14;
  Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 1, far: 260 });
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.035; sun.shadow.radius = 3;
  sun.shadow.camera.updateProjectionMatrix();
  scene.add(sun);
  const fill = new THREE.DirectionalLight(L.fill, L.fillI); fill.position.set(-L.sunPos[0], 30, -L.sunPos[2]); scene.add(fill);
  // puffy clouds lit by the sun colour
  const cloudMat = new THREE.MeshStandardMaterial({ color: L.cloudCol ?? 0xffffff, emissive: L.clouds, emissiveIntensity: 0.35, roughness: 1, transparent: true, opacity: 0.95, fog: false });
  const puff = new THREE.SphereGeometry(1, 14, 10), clouds = [];
  for (let i = 0; i < 12; i++) {
    const c = new THREE.Group();
    const n = 5 + (i % 4);
    for (let k = 0; k < n; k++) {
      const m = new THREE.Mesh(puff, cloudMat), r = 4 + Math.random() * 6;
      m.scale.set(r * 1.2, r * 0.62, r); m.position.set((k - n / 2) * 6 + Math.random() * 3, Math.random() * 3 + (k % 2) * 2, Math.random() * 6); c.add(m);
    }
    const a = Math.random() * Math.PI * 2, r = 170 + Math.random() * 130;
    c.position.set(Math.cos(a) * r, 60 + Math.random() * 45, Math.sin(a) * r); c.lookAt(0, c.position.y, 0);
    bake(c); c.userData = { a, r }; scene.add(c); clouds.push(c);   // one mesh per cloud
  }
  return dt => { for (const c of clouds) { c.userData.a += dt * 0.004; c.position.x = Math.cos(c.userData.a) * c.userData.r; c.position.z = Math.sin(c.userData.a) * c.userData.r; c.lookAt(0, c.position.y, 0); } };
}

// Image-based lighting: render this stage's own sky into an environment map so every
// physically shaded surface (heroes, stone, water, metal) picks up sky colour and soft reflections.
export function applyEnvironment(renderer, scene) {
  const L = scene.userData.look; if (!L) return;
  const pm = new THREE.PMREMGenerator(renderer);
  const env = new THREE.Scene(); env.add(skyDome(L, 50));
  const ground = new THREE.Mesh(new THREE.CircleGeometry(48, 32), new THREE.MeshBasicMaterial({ color: L.hemiGround }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -2; env.add(ground);
  const rt = pm.fromScene(env, 0.04, 0.1, 200);
  scene.environment = rt.texture; scene.environmentIntensity = L.env;
  pm.dispose();
  return rt;
}

// ---------- set dressing ----------
function softTex(draw, w = 64, h = 64) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const SHAFT = softTex((g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); const v = g.createLinearGradient(0, 0, 0, h); v.addColorStop(0, 'rgba(0,0,0,1)'); v.addColorStop(0.3, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,1)'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = v; g.fillRect(0, 0, w, h); });
const BLOB = softTex((g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });

// floating dust or pollen catching the light
function motes(scene, map, color, n = 260) {
  const pos = new Float32Array(n * 3), seed = new Float32Array(n);
  for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * map.W * 2; pos[i * 3 + 1] = 0.5 + Math.random() * 7; pos[i * 3 + 2] = (Math.random() - 0.5) * map.L * 2; seed[i] = Math.random() * 6; }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: 0.12, map: BLOB, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(pts);
  return (dt, t) => {
    for (let i = 0; i < n; i++) {
      pos[i * 3] += Math.sin(t * 0.3 + seed[i]) * dt * 0.25; pos[i * 3 + 1] += Math.sin(t * 0.5 + seed[i] * 2) * dt * 0.15; pos[i * 3 + 2] += Math.cos(t * 0.25 + seed[i]) * dt * 0.25;
    }
    geo.attributes.position.needsUpdate = true;
  };
}

// crossed additive planes slanting down from the sun
function shafts(scene, map, L) {
  const dir = new THREE.Vector3(...L.sunPos).normalize(), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  const mats = [], n = 7;
  for (let i = 0; i < n; i++) {
    const m = new THREE.MeshBasicMaterial({ color: L.sun, map: SHAFT, transparent: true, opacity: L.shafts, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
    const g = new THREE.Group(); g.quaternion.copy(q);
    for (const r of [0, Math.PI / 2]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(3 + Math.random() * 4, 60), m); p.rotation.y = r; p.position.y = 30; g.add(p); }
    g.position.set((Math.random() - 0.5) * map.W * 1.6, 0, (Math.random() - 0.5) * map.L * 1.6);
    scene.add(g); mats.push(m);
  }
  return (dt, t) => mats.forEach((m, i) => { m.opacity = L.shafts * (0.6 + 0.4 * Math.sin(t * 0.4 + i * 1.7)); });
}

// low drifting mist banks (the temple at dawn)
function mist(scene, map, L) {
  const banks = [];
  for (let i = 0; i < 9; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), new THREE.MeshBasicMaterial({ color: L.fog, map: BLOB, transparent: true, opacity: 0.32, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set((Math.random() - 0.5) * map.W * 2.4, 0.4 + Math.random() * 0.8, (Math.random() - 0.5) * map.L * 2.2);
    m.userData.v = (Math.random() - 0.5) * 0.6; scene.add(m); banks.push(m);
  }
  return (dt, t) => banks.forEach((m, i) => { m.position.x += m.userData.v * dt; if (Math.abs(m.position.x) > map.W * 1.3) m.userData.v *= -1; m.material.opacity = 0.24 + Math.sin(t * 0.3 + i) * 0.08; });
}

// festoon lights strung overhead across the square, out of the way of play
function festoons(scene, map, zs, colors) {
  const bulbs = [], bulbGeo = new THREE.SphereGeometry(0.09, 12, 8), wire = new THREE.LineBasicMaterial({ color: 0x2a2a32 });
  for (const z0 of zs) for (const z of [z0, -z0]) {
    const pts = [], span = map.W * 2 - 2, n = 22;
    for (let i = 0; i <= n; i++) { const u = i / n, x = -span / 2 + u * span; pts.push(new THREE.Vector3(x, 5.6 - Math.sin(u * Math.PI) * 1.1, z)); }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wire));
    pts.forEach((p, i) => { if (i % 2) return; const m = new THREE.Mesh(bulbGeo, new THREE.MeshBasicMaterial({ color: colors[i % colors.length] })); m.position.copy(p).y -= 0.14; scene.add(m); bulbs.push(m); });
  }
  return (dt, t) => bulbs.forEach((b, i) => { b.scale.setScalar(0.9 + Math.sin(t * 2 + i * 0.7) * 0.12); });
}

// paper sky lanterns rising slowly around the canals
function skyLanterns(scene, map, n = 24) {
  const geo = new THREE.CylinderGeometry(0.28, 0.2, 0.5, 14), ls = [];
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xffb35a, emissive: 0xff9a3c, emissiveIntensity: 1.4, roughness: 0.9, transparent: true, opacity: 0.95 }));
    const side = i % 2 ? 1 : -1;
    m.position.set(side * (map.W + 4 + Math.random() * 18), 4 + Math.random() * 40, (Math.random() - 0.5) * map.L * 2.2);
    m.userData.v = 0.6 + Math.random() * 0.7; m.userData.p = Math.random() * 6;
    scene.add(m); ls.push(m);
  }
  return (dt, t) => ls.forEach(m => { m.position.y += m.userData.v * dt; m.position.x += Math.sin(t * 0.4 + m.userData.p) * dt * 0.3; if (m.position.y > 55) m.position.y = 3; });
}

// Night stages: a dome of twinkling stars and searchlights sweeping up from the city.
function nightSky(scene, map) {
  const pts = [];
  for (let i = 0; i < 900; i++) { const a = Math.random() * Math.PI * 2, e = 0.15 + Math.random() * 1.3; pts.push(Math.cos(a) * Math.cos(e) * 340, Math.sin(e) * 340, Math.sin(a) * Math.cos(e) * 340); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const stars = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, fog: false, depthWrite: false }));
  scene.add(stars);
  const beams = [];
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(7, 160, 16, 1, true), new THREE.MeshBasicMaterial({ color: [0x9fd0ff, 0xff9ad8, 0xfff1c9][i % 3], transparent: true, opacity: 0.08, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
    m.geometry.translate(0, -80, 0);                  // pivot at the tip so the cone fans upward from the base
    const a = i / 5 * Math.PI * 2 + 0.4, d = 140 + (i % 2) * 40;
    m.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); m.userData.p = i * 1.3; scene.add(m); beams.push(m);
  }
  return (dt, t) => {
    stars.material.opacity = 0.75 + Math.sin(t * 1.7) * 0.2;
    beams.forEach(b => { b.rotation.z = Math.PI + Math.sin(t * 0.3 + b.userData.p) * 0.45; b.rotation.x = Math.cos(t * 0.23 + b.userData.p) * 0.3; });
  };
}

export function buildDressing(scene, map) {
  const L = lookFor(map), ticks = [];
  ticks.push(motes(scene, map, L.motes));
  if (L.shafts) ticks.push(shafts(scene, map, L));
  if (L.mist) ticks.push(mist(scene, map, L));
  if (map.id === 'plaza') ticks.push(festoons(scene, map, [14, 34], [0xffe1a0, 0xffc27a, 0xfff3d6]));
  if (map.id === 'canals') { ticks.push(skyLanterns(scene, map)); ticks.push(festoons(scene, map, [10], [0xffe1a0, 0xff9ab8, 0x9fe0ff])); }
  if (map.id === 'frostpeak') ticks.push(festoons(scene, map, [20, 40], [0xffd27a, 0xff7a5a, 0x8fe08a, 0x9fd0ff]));
  if (L.night) ticks.push(nightSky(scene, map));
  if (map.id === 'neon') ticks.push(festoons(scene, map, [16, 36], [0xff5aa8, 0x5af0ff, 0xffc93c, 0x9b5cff]));
  return (dt, t) => ticks.forEach(f => f(dt, t));
}

// Soft dark pools at the foot of every cover block, so props sit on the ground instead of floating.
const CONTACT = softTex((g, w) => { g.filter = 'blur(10px)'; g.fillStyle = 'rgba(20,22,40,1)'; g.fillRect(w * 0.22, w * 0.22, w * 0.56, w * 0.56); }, 128, 128);
export function contactShadows(scene, blocks) {
  const mat = new THREE.MeshBasicMaterial({ map: CONTACT, transparent: true, opacity: 0.42, depthWrite: false });
  for (const [x, z, w, d] of blocks) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.8 + 1.2, d * 1.8 + 1.2), mat);
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.025, z); m.renderOrder = -1; scene.add(m);
  }
}
