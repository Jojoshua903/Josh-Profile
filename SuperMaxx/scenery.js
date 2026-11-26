import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';

// Sky, light, ground and the backdrop that frames each arena.

export const THEMES = {
  plaza: {
    skyTop: 0x5fb4ea, skyBottom: 0xffe2b8, fog: 0xf6dfc0, sun: 0xffe7c2, hemiSky: 0xfff4e0, hemiGround: 0xd9a77a,
    sunPos: [-60, 45, 70],
  },
  canals: {
    skyTop: 0x7dbbe8, skyBottom: 0xeaf3f2, fog: 0xe1ecec, sun: 0xfff6e8, hemiSky: 0xf2f8ff, hemiGround: 0xb6a58c,
    sunPos: [50, 70, -30],
  },
  terraces: {
    skyTop: 0x8cc7ef, skyBottom: 0xffe4ec, fog: 0xf4e3e9, sun: 0xfff0f0, hemiSky: 0xfff6fa, hemiGround: 0x9fb67c,
    sunPos: [40, 60, 40],
  },
  neon: {
    skyTop: 0x1d1a5a, skyBottom: 0xd44a8a, fog: 0x2a1650, sun: 0xc9c8ff, hemiSky: 0x8a7aff, hemiGround: 0x4a2a6a,
    sunPos: [-40, 40, 80],
  },
  alpine: {
    skyTop: 0x5d7fd0, skyBottom: 0xffc8a8, fog: 0xe8e4f0, sun: 0xffd0a8, hemiSky: 0xf2f0ff, hemiGround: 0xc8d4e4,
    sunPos: [-50, 26, 60],
  },
  desert: {
    skyTop: 0x3d8ee0, skyBottom: 0xffd59a, fog: 0xf2cfa0, sun: 0xffe0a8, hemiSky: 0xfff0d8, hemiGround: 0xd08a5a,
    sunPos: [55, 48, -40],
  },
  sky: {
    skyTop: 0x5a8fe0, skyBottom: 0xffd8c8, fog: 0xf4e6f0, sun: 0xfff0d8, hemiSky: 0xfff6ff, hemiGround: 0xa8c88a,
    sunPos: [-55, 30, 60],
  },
  docks: {
    skyTop: 0x3a4a8a, skyBottom: 0xff9a6a, fog: 0xc8a8b0, sun: 0xffb07a, hemiSky: 0xffd8c8, hemiGround: 0x6a7a8a,
    sunPos: [60, 18, -50],
  },
};

export function rng(seed) {
  let a = 0; for (const c of seed) a = (a * 31 + c.charCodeAt(0)) | 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const mats = new Map();
export function M(color, opts) {
  const k = color + JSON.stringify(opts || {});
  if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...(opts || {}) }));
  return mats.get(k);
}
export function put(parent, geo, mat, x, y, z, shadow = true) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z);
  m.castShadow = shadow; m.receiveShadow = true; parent.add(m); return m;
}

// ---------- sky & light ----------
export function buildSky(scene, map, T) {
  const dome = new THREE.Mesh(new THREE.SphereGeometry(380, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(T.skyTop) }, bottom: { value: new THREE.Color(T.skyBottom) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float h = clamp(normalize(vP).y * 1.6 + 0.12, 0.0, 1.0); gl_FragColor = vec4(mix(bottom, top, pow(h, 0.8)), 1.0); }',
  }));
  scene.add(dome);
  const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(18, 32), new THREE.MeshBasicMaterial({ color: 0xfff6dc, fog: false }));
  const sd = new THREE.Vector3(...T.sunPos).normalize().multiplyScalar(340);
  sunDisc.position.copy(sd); sunDisc.lookAt(0, 0, 0); scene.add(sunDisc);
  scene.fog = new THREE.Fog(T.fog, 90, 330);
  scene.background = new THREE.Color(T.skyBottom);

  scene.add(new THREE.HemisphereLight(T.hemiSky, T.hemiGround, 1.5));
  const sun = new THREE.DirectionalLight(T.sun, 2.4);
  sun.position.set(...T.sunPos);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const s = Math.max(map.W, map.L) + 14;
  Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 1, far: 260 });
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
  sun.shadow.camera.updateProjectionMatrix();
  scene.add(sun);

  // soft clouds
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.92, fog: false });
  const clouds = [];
  for (let i = 0; i < 16; i++) {
    const c = new THREE.Group();
    for (let k = 0; k < 5; k++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(5 + Math.random() * 5, 10, 8), cloudMat);
      m.position.set(k * 6 - 12, Math.random() * 3, Math.random() * 4); m.scale.y = 0.6; c.add(m);
    }
    const a = Math.random() * Math.PI * 2, r = 170 + Math.random() * 120;
    c.position.set(Math.cos(a) * r, 55 + Math.random() * 40, Math.sin(a) * r); c.userData.a = a; c.userData.r = r;
    scene.add(c); clouds.push(c);
  }
  return (dt) => { for (const c of clouds) { c.userData.a += dt * 0.004; c.position.x = Math.cos(c.userData.a) * c.userData.r; c.position.z = Math.sin(c.userData.a) * c.userData.r; } };
}

// ---------- textures ----------
function canvasTex(size, draw, repeatX = 1, repeatY = 1) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  draw(cv.getContext('2d'), size);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeatX, repeatY);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
function speckle(g, s, n, colors, size = 2) {
  for (let i = 0; i < n; i++) { g.fillStyle = colors[i % colors.length]; g.fillRect(Math.random() * s, Math.random() * s, size, size); }
}

export function groundTexture(theme) {
  if (theme === 'plaza') return canvasTex(512, (g, s) => {
    const q = s / 8;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const d = (x + y) % 2 === 0;
      g.fillStyle = d ? '#f4e2c4' : '#e8c79c'; g.fillRect(x * q, y * q, q, q);
      if ((x + y * 3) % 7 === 0) { g.fillStyle = '#d9734e'; g.globalAlpha = 0.35; g.fillRect(x * q + q * 0.3, y * q + q * 0.3, q * 0.4, q * 0.4); g.globalAlpha = 1; }
    }
    speckle(g, s, 4000, ['rgba(120,80,40,.06)', 'rgba(255,255,255,.12)']);
    g.strokeStyle = 'rgba(150,110,70,.35)'; g.lineWidth = 3;
    for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * q, 0); g.lineTo(i * q, s); g.moveTo(0, i * q); g.lineTo(s, i * q); g.stroke(); }
  });
  if (theme === 'canals') return canvasTex(512, (g, s) => {
    g.fillStyle = '#9c9385'; g.fillRect(0, 0, s, s);
    const rows = 16, h = s / rows;
    for (let r = 0; r < rows; r++) {
      let x = (r % 2) * -16;
      while (x < s) {
        const w = 22 + Math.random() * 18, c = 175 + Math.random() * 40 | 0;
        g.fillStyle = `rgb(${c},${c - 8 - Math.random() * 10 | 0},${c - 22 - Math.random() * 10 | 0})`;
        g.beginPath(); g.roundRect(x + 2, r * h + 2, w - 4, h - 4, 7); g.fill();
        x += w;
      }
    }
    speckle(g, s, 2500, ['rgba(60,50,40,.08)', 'rgba(255,255,255,.1)']);
  });
  if (theme === 'neon') return canvasTex(512, (g, s) => {
    // dark rooftop tiles with glowing seams, the odd vent and painted hazard corner
    g.fillStyle = '#1c1838'; g.fillRect(0, 0, s, s);
    const q = s / 8;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const c = 30 + Math.random() * 14 | 0; g.fillStyle = `rgb(${c},${c - 4},${c + 26})`; g.fillRect(x * q + 3, y * q + 3, q - 6, q - 6); }
    speckle(g, s, 2500, ['rgba(0,0,0,.18)', 'rgba(255,255,255,.04)']);
    g.lineWidth = 3;
    for (let i = 0; i <= 8; i++) { g.strokeStyle = i % 4 ? 'rgba(90,240,255,.35)' : 'rgba(255,90,168,.7)'; g.beginPath(); g.moveTo(i * q, 0); g.lineTo(i * q, s); g.moveTo(0, i * q); g.lineTo(s, i * q); g.stroke(); }
    g.fillStyle = 'rgba(10,8,24,.8)'; for (let k = 0; k < 3; k++) { const x = (1 + k * 3) * q + q * 0.25, y = (2 + k * 2) * q + q * 0.25; g.fillRect(x, y, q * 0.5, q * 0.5); }
  });
  if (theme === 'alpine') return canvasTex(512, (g, s) => {
    // soft snow with drifts, sparkle and the odd boot print
    g.fillStyle = '#eef2fa'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * s, y = Math.random() * s, r = 30 + Math.random() * 70;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, Math.random() < 0.5 ? 'rgba(200,214,240,.35)' : 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    speckle(g, s, 3000, ['rgba(150,170,210,.18)', 'rgba(255,255,255,.9)'], 1.5);
    g.fillStyle = 'rgba(160,178,214,.28)';
    for (let i = 0; i < 14; i++) { const x = Math.random() * s, y = Math.random() * s; g.beginPath(); g.ellipse(x, y, 4, 7, 0.3, 0, 7); g.ellipse(x + 10, y + 14, 4, 7, 0.3, 0, 7); g.fill(); }
  });
  if (theme === 'sky') return canvasTex(512, (g, s) => {
    // bright meadow grass with white marble flagstones peeking through and little white flowers
    g.fillStyle = '#a8d47a'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 7000; i++) {
      const v = Math.random();
      g.strokeStyle = v < 0.45 ? 'rgba(90,150,60,.35)' : v < 0.9 ? 'rgba(200,236,150,.4)' : 'rgba(255,255,255,.7)';
      const x = Math.random() * s, y = Math.random() * s;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.random() * 4 - 2, y - 4 - Math.random() * 6); g.stroke();
    }
    for (let i = 0; i < 9; i++) {
      const x = Math.random() * s, y = Math.random() * s, w = 40 + Math.random() * 40, h = 30 + Math.random() * 30;
      g.fillStyle = 'rgba(244,240,232,.85)'; g.beginPath(); g.roundRect(x, y, w, h, 6); g.fill();
      g.strokeStyle = 'rgba(160,150,140,.35)'; g.lineWidth = 2; g.stroke();
    }
  });
  if (theme === 'docks') return canvasTex(512, (g, s) => {
    // wet harbour sand and shingle, darker where the tide has been, with shells and seaweed
    g.fillStyle = '#b8a888'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * s, y = Math.random() * s, r = 40 + Math.random() * 80;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, Math.random() < 0.6 ? 'rgba(90,96,90,.3)' : 'rgba(230,214,180,.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    speckle(g, s, 4000, ['rgba(70,70,70,.22)', 'rgba(255,250,235,.35)'], 2);
    g.strokeStyle = 'rgba(60,110,70,.5)'; g.lineWidth = 3;
    for (let i = 0; i < 16; i++) { const x = Math.random() * s, y = Math.random() * s; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 10, y + 8, x + 4, y + 20); g.stroke(); }
    g.fillStyle = 'rgba(255,236,220,.8)';
    for (let i = 0; i < 24; i++) { g.beginPath(); g.ellipse(Math.random() * s, Math.random() * s, 3, 2.2, Math.random() * 3, 0, 7); g.fill(); }
  });
  if (theme === 'desert') return canvasTex(512, (g, s) => {
    // warm sand with wind ripples, darker clay patches and scattered pebbles
    g.fillStyle = '#e8b97e'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 26; i++) {
      const x = Math.random() * s, y = Math.random() * s, r = 40 + Math.random() * 80;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, Math.random() < 0.5 ? 'rgba(200,120,70,.28)' : 'rgba(255,226,170,.4)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    g.strokeStyle = 'rgba(170,100,55,.22)'; g.lineWidth = 2;
    for (let y = 8; y < s; y += 14) { g.beginPath(); for (let x = 0; x <= s; x += 16) g.lineTo(x, y + Math.sin(x * 0.05 + y) * 4); g.stroke(); }
    speckle(g, s, 3500, ['rgba(140,80,40,.18)', 'rgba(255,240,210,.35)'], 2);
    g.fillStyle = 'rgba(150,95,60,.55)';
    for (let i = 0; i < 40; i++) { g.beginPath(); g.ellipse(Math.random() * s, Math.random() * s, 2 + Math.random() * 3, 1.5 + Math.random() * 2, Math.random() * 3, 0, 7); g.fill(); }
  });
  return canvasTex(512, (g, s) => {
    g.fillStyle = '#9dbd74'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 9000; i++) {
      const v = Math.random();
      g.strokeStyle = v < 0.4 ? 'rgba(70,110,50,.35)' : v < 0.8 ? 'rgba(190,220,140,.35)' : 'rgba(255,190,210,.5)';
      const x = Math.random() * s, y = Math.random() * s;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.random() * 4 - 2, y - 4 - Math.random() * 6); g.stroke();
    }
  });
}

export function pathTexture(theme) {
  if (theme === 'plaza') return canvasTex(256, (g, s) => {
    g.fillStyle = '#fbf3e4'; g.fillRect(0, 0, s, s);
    speckle(g, s, 1500, ['rgba(180,150,110,.12)']);
    g.fillStyle = '#d9734e'; g.fillRect(0, 0, 14, s); g.fillRect(s - 14, 0, 14, s);
    g.fillStyle = '#2f6fb3'; g.fillRect(18, 0, 5, s); g.fillRect(s - 23, 0, 5, s);
    g.strokeStyle = 'rgba(150,120,90,.3)'; g.lineWidth = 2; g.beginPath(); g.moveTo(30, s / 2); g.lineTo(s - 30, s / 2); g.stroke();
  });
  if (theme === 'canals') return canvasTex(256, (g, s) => {
    g.fillStyle = '#7d3a2c'; g.fillRect(0, 0, s, s);
    const bw = 32, bh = 16;
    for (let y = -2; y < 18; y++) for (let x = -2; x < 10; x++) {
      const c = 150 + Math.random() * 45 | 0;
      g.fillStyle = `rgb(${c},${c * 0.45 | 0},${c * 0.33 | 0})`;
      g.save(); g.translate(x * bw + (y % 2) * bw / 2, y * bh); g.fillRect(1, 1, bw - 2, bh - 2); g.restore();
    }
    g.fillStyle = '#d9d2c3'; g.fillRect(0, 0, 12, s); g.fillRect(s - 12, 0, 12, s);
  });
  if (theme === 'neon') return canvasTex(256, (g, s) => {
    // a walkway with cyan light strips down both edges and pink chevrons pointing along it
    g.fillStyle = '#2a2450'; g.fillRect(0, 0, s, s);
    speckle(g, s, 800, ['rgba(0,0,0,.2)', 'rgba(255,255,255,.05)']);
    g.fillStyle = '#5af0ff'; g.fillRect(0, 0, 10, s); g.fillRect(s - 10, 0, 10, s);
    g.fillStyle = 'rgba(90,240,255,.25)'; g.fillRect(10, 0, 8, s); g.fillRect(s - 18, 0, 8, s);
    g.strokeStyle = 'rgba(255,90,168,.75)'; g.lineWidth = 9; g.lineCap = 'round';
    for (const y of [s * 0.25, s * 0.75]) { g.beginPath(); g.moveTo(s * 0.34, y + 22); g.lineTo(s / 2, y - 6); g.lineTo(s * 0.66, y + 22); g.stroke(); }
  });
  if (theme === 'alpine') return canvasTex(256, (g, s) => {
    // a boardwalk of wooden planks through the snow, with snow banked at the edges
    g.fillStyle = '#7a5236'; g.fillRect(0, 0, s, s);
    for (let y = 0; y < 16; y++) {
      const c = 120 + Math.random() * 40 | 0;
      g.fillStyle = `rgb(${c},${c * 0.68 | 0},${c * 0.46 | 0})`; g.fillRect(16, y * 16 + 1, s - 32, 14);
      g.fillStyle = 'rgba(40,24,14,.5)'; g.fillRect(40 + (y % 3) * 50, y * 16 + 6, 3, 3); g.fillRect(s - 60 - (y % 2) * 40, y * 16 + 7, 3, 3);
    }
    g.fillStyle = '#f4f6fc'; g.fillRect(0, 0, 16, s); g.fillRect(s - 16, 0, 16, s);
    speckle(g, s, 500, ['rgba(255,255,255,.7)'], 2);
  });
  if (theme === 'sky') return canvasTex(256, (g, s) => {
    // a white marble walkway with gold inlay down the edges and a sun motif
    g.fillStyle = '#f4f0e8'; g.fillRect(0, 0, s, s);
    for (let y = 0; y < 4; y++) { g.strokeStyle = 'rgba(170,160,150,.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(12, y * 64); g.lineTo(s - 12, y * 64); g.stroke(); }
    speckle(g, s, 900, ['rgba(160,150,140,.12)', 'rgba(255,255,255,.5)']);
    g.fillStyle = '#e8b84a'; g.fillRect(0, 0, 10, s); g.fillRect(s - 10, 0, 10, s);
    g.strokeStyle = 'rgba(232,184,74,.7)'; g.lineWidth = 4; g.beginPath(); g.arc(s / 2, s / 2, 26, 0, 7); g.stroke();
  });
  if (theme === 'docks') return canvasTex(256, (g, s) => {
    // a weathered boardwalk: grey-brown planks across the lane, with rope-and-post edges
    g.fillStyle = '#4a3a2e'; g.fillRect(0, 0, s, s);
    for (let y = 0; y < 16; y++) {
      const c = 105 + Math.random() * 35 | 0;
      g.fillStyle = `rgb(${c},${c * 0.86 | 0},${c * 0.7 | 0})`; g.fillRect(14, y * 16 + 1, s - 28, 14);
      g.fillStyle = 'rgba(30,22,16,.55)'; g.fillRect(36 + (y % 3) * 60, y * 16 + 6, 3, 3); g.fillRect(s - 52 - (y % 2) * 50, y * 16 + 7, 3, 3);
    }
    g.fillStyle = '#c8b48a'; for (let y = 0; y < s; y += 6) { g.fillRect(2, y, 8, 3); g.fillRect(s - 10, y + 3, 8, 3); }
  });
  if (theme === 'desert') return canvasTex(256, (g, s) => {
    // a packed red-clay road with two wagon ruts and painted turquoise edge stones
    g.fillStyle = '#c4703f'; g.fillRect(0, 0, s, s);
    speckle(g, s, 1400, ['rgba(90,40,20,.15)', 'rgba(255,210,160,.18)'], 2);
    g.fillStyle = 'rgba(110,50,25,.35)'; g.fillRect(s * 0.3, 0, 14, s); g.fillRect(s * 0.7 - 14, 0, 14, s);
    for (let y = 0; y < s; y += 32) for (const x of [0, s - 14]) { g.fillStyle = (y / 32) % 2 ? '#e9dcc4' : '#3fb3a6'; g.fillRect(x, y + 2, 14, 28); }
  });
  return canvasTex(256, (g, s) => {
    g.fillStyle = '#86a862'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 4; i++) {
      const c = 200 + Math.random() * 30 | 0;
      g.fillStyle = `rgb(${c},${c - 6},${c - 18})`;
      g.beginPath(); g.ellipse(s / 2 + (Math.random() - 0.5) * 30, i * 64 + 32, 92, 26, (Math.random() - 0.5) * 0.3, 0, 7); g.fill();
      g.strokeStyle = 'rgba(90,80,60,.3)'; g.lineWidth = 3; g.stroke();
    }
  });
}

export function buildGround(scene, map, theme) {
  const tex = groundTexture(theme);
  tex.repeat.set(map.W / 8, map.L / 8);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(map.W * 2, map.L * 2), new THREE.MeshStandardMaterial({ map: tex, ...(theme === 'neon' ? { emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.35 } : {}) }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  // outer ground under the backdrop (Solmare sits on its own island in the sea)
  if (theme !== 'plaza' && theme !== 'sky' && theme !== 'docks') {      // Skyreach floats over clouds, the docks sit in the sea
    const outerTex = groundTexture(theme); outerTex.repeat.set(40, 40);
    const outer = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshStandardMaterial({ map: outerTex, color: 0xdddddd }));
    outer.rotation.x = -Math.PI / 2; outer.position.y = -0.05; scene.add(outer);
  }

  const pt = pathTexture(theme);
  for (const lane of map.lanes) {
    for (let i = 0; i < lane.length - 1; i++) {
      const [ax, az] = lane[i], [bx, bz] = lane[i + 1];
      const len = Math.hypot(bx - ax, bz - az) + 3.5;
      const t = pt.clone(); t.needsUpdate = true; t.repeat.set(1, len / 4);
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(3.6, len), new THREE.MeshStandardMaterial({ map: t, ...(theme === 'neon' ? { emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.45 } : {}), polygonOffset: true, polygonOffsetFactor: -1 }));
      strip.rotation.x = -Math.PI / 2; strip.rotation.z = Math.atan2(bx - ax, bz - az);
      strip.position.set((ax + bx) / 2, 0.02 + i * 0.002, (az + bz) / 2); strip.receiveShadow = true;
      scene.add(strip);
    }
  }
  // home pads: a painted rosette at each fountain
  for (const [c, sign] of map.survivor ? [] : [[0x2f5bff, -1], [0xff5a36, 1]]) {
    const pad = new THREE.Mesh(new THREE.RingGeometry(6.6, 8, 48), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.45, depthWrite: false }));
    pad.rotation.x = -Math.PI / 2; pad.position.set(0, 0.04, sign * (map.L - 5)); scene.add(pad);
    const inner = new THREE.Mesh(new THREE.CircleGeometry(6.6, 48), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.12, depthWrite: false }));
    inner.rotation.x = -Math.PI / 2; inner.position.copy(pad.position); scene.add(inner);
  }
}

// Collapse a static group into one mesh per material so big backdrops stay cheap to draw.
export function mergeStatic(group) {
  group.updateMatrixWorld(true);
  const buckets = new Map();
  group.traverse(o => {
    if (!o.isMesh) return;
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);
    if (!buckets.has(o.material)) buckets.set(o.material, []);
    buckets.get(o.material).push(g);
  });
  while (group.children.length) group.remove(group.children[0]);
  group.position.set(0, 0, 0); group.rotation.set(0, 0, 0); group.scale.set(1, 1, 1);
  for (const [mat, geos] of buckets) {
    const n = geos.reduce((s, g) => s + g.attributes.position.count, 0);
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
    let o = 0;
    for (const g of geos) { pos.set(g.attributes.position.array, o); nor.set(g.attributes.normal.array, o); o += g.attributes.position.count * 3; g.dispose(); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.computeBoundingSphere();
    const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true;
    group.add(m);
  }
}
