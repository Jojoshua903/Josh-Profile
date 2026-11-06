// 3D helpers and character models (px units, y up, characters face +z)
import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
export { THREE };

const matCache = new Map();
export function mat(color, o = {}) {
  const key = color + '|' + (o.emissive || '') + '|' + (o.ei || 1) + '|' + (o.opacity || 1);
  if (!o.unique && matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshToonMaterial({color});
  if (o.emissive) { m.emissive = new THREE.Color(o.emissive); m.emissiveIntensity = o.ei || 1; }
  if (o.opacity && o.opacity < 1) { m.transparent = true; m.opacity = o.opacity; }
  if (!o.unique) matCache.set(key, m);
  return m;
}
export const INKM = new THREE.MeshBasicMaterial({color: '#1d1a2f'});
export const OUT = new THREE.MeshBasicMaterial({color: '#1d1a2f', side: THREE.BackSide});
const OUTP = new THREE.MeshBasicMaterial({color: '#8a5cff', side: THREE.BackSide});

export function part(parent, geo, color, pos, o = {}) {
  const m = new THREE.Mesh(geo, color instanceof THREE.Material ? color : mat(color, o));
  if (pos) m.position.set(pos[0], pos[1], pos[2]);
  if (o.rot) m.rotation.set(o.rot[0], o.rot[1], o.rot[2]);
  if (o.scale) m.scale.set(o.scale[0], o.scale[1], o.scale[2]);
  m.castShadow = o.shadow !== false;
  m.receiveShadow = !!o.receive;
  if (o.outline !== false) {
    const ol = new THREE.Mesh(geo, o.olMat || OUT);
    ol.scale.setScalar(o.ol || 1.12);
    m.add(ol);
  }
  parent.add(m);
  return m;
}

const sph = (r, a = 18, b = 14) => new THREE.SphereGeometry(r, a, b);
const hemi = (r, k = 0.5) => new THREE.SphereGeometry(r, 18, 10, 0, Math.PI * 2, 0, Math.PI * k);
const cyl = (a, b, h, s = 12, open = false) => new THREE.CylinderGeometry(a, b, h, s, 1, open);
const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
const cone = (r, h, s = 16) => new THREE.ConeGeometry(r, h, s);
const tor = (r, t, arc = Math.PI * 2) => new THREE.TorusGeometry(r, t, 8, 24, arc);

function eyes(g, y, z, dx = 4, r = 1.7) {
  part(g, sph(r, 8, 6), INKM, [-dx, y, z], {outline: false, shadow: false});
  part(g, sph(r, 8, 6), INKM, [dx, y, z], {outline: false, shadow: false});
}
function smile(g, y, z, cry) {
  part(g, tor(3, 0.7, Math.PI), INKM, [0, y, z], {outline: false, shadow: false, rot: [-0.25, 0, cry ? 0 : Math.PI]});
}
function legs(g, ud, xs, zs = [0], color = '#3a3450', h = 9, r = 3) {
  for (const z of zs) for (const x of xs) {
    const piv = new THREE.Group(); piv.position.set(x, h, z); g.add(piv);
    part(piv, cyl(r, r, h, 8), color, [0, -h / 2, 0], {ol: 1.15});
    ud.legs.push(piv);
  }
}

function person(g, ch, ud) {
  const w = ch.wide || 1;
  legs(g, ud, [-5 * w, 5 * w]);
  part(g, sph(12), ch.shirt || ch.color, [0, 18, 0], {scale: [w, 0.95, 0.8]});
  if (ch.shirt && ch.shirt !== ch.color) part(g, box(6, 18, 2), ch.color, [0, 18, 9.2], {outline: false});
  if (ch.gloves) { part(g, sph(4.2), ch.gloves, [-(12 * w + 1), 17, 3]); part(g, sph(4.2), ch.gloves, [12 * w + 1, 17, 3]); }
  part(g, sph(10.5), ch.skin || '#ffd7b0', [0, 37, 0]);
  if (ch.hair) part(g, hemi(11, 0.55), ch.hair, [0, 37.5, 0], {rot: [-0.35, 0, 0], ol: 1.06});
  if (ch.bun) part(g, sph(4.5), ch.hair, [0, 47, -6]);
  eyes(g, 38.5, 9.6);
  if (ch.glasses) for (const x of [-4, 4]) part(g, tor(3.4, 0.6), INKM, [x, 38.5, 10.2], {outline: false, shadow: false});
  if (ch.beard) part(g, sph(8.5), ch.beard, [0, 31.5, 4.5], {scale: [1.05, 1, 0.75]});
  else smile(g, ch.cry ? 32.8 : 34.5, 9.4, ch.cry);
  if (ch.cry) { ud.tear = part(g, sph(1.5, 8, 6), '#7fd8ff', [-6, 35, 9.6], {outline: false, shadow: false}); }
  if (ch.cap) {
    part(g, hemi(11.4), ch.cap, [0, 38, 0], {rot: [-0.2, 0, 0], ol: 1.06});
    part(g, box(15, 1.6, 9), ch.cap, [0, 39.5, 11], {ol: 1.1});
  }
  if (ch.band) part(g, tor(10.8, 1.7), ch.band, [0, 42, 0], {rot: [Math.PI / 2, 0, 0], outline: false});
  if (ch.wizard) {
    part(g, cyl(16, 16, 1.6, 20), ch.wizard, [0, 44.5, 0], {ol: 1.06});
    part(g, cone(11, 28), ch.wizard, [0, 59, -1], {rot: [-0.15, 0, 0], ol: 1.07});
    ud.top = 76;
  }
  if (ch.headphones) {
    part(g, tor(12.5, 1.4, Math.PI), '#1d1a2f', [0, 38, 0], {outline: false});
    for (const x of [-12, 12]) part(g, cyl(4, 4, 4), '#1d1a2f', [x, 37, 0], {rot: [0, 0, Math.PI / 2], outline: false});
  }
}

const BUILDERS = {
  person,
  apple(g, ch, ud) {
    legs(g, ud, [-5, 5], [0], '#3a1a10', 6, 2.4);
    part(g, sph(15, 22, 16), ch.color, [0, 20, 0]);
    part(g, cyl(1.2, 1.2, 8, 6), '#6b3f1f', [1, 38, 0], {rot: [0, 0, -0.2], outline: false});
    part(g, sph(5), '#3ccf6e', [7, 39, 0], {scale: [1.4, 0.4, 0.7], rot: [0, 0, 0.4], ol: 1.15});
    eyes(g, 25, 13.6, 5);
    for (const s of [-1, 1]) part(g, sph(3, 10, 8), '#2a1a0a', [s * 4.5, 19, 14.4], {scale: [2, 0.8, 0.8], rot: [0, 0, -s * 0.35], outline: false});
    ud.top = 46;
  },
  worm(g, ch, ud) {
    ud.wiggle = [];
    [[6, 7], [12, 7], [19, 6.8], [26, 6.6]].forEach(([y, r]) => ud.wiggle.push(part(g, sph(r), '#ff9ab0', [0, y, -2])));
    part(g, sph(9), '#ff9ab0', [0, 36, 0]);
    eyes(g, 38, 8, 3.5, 1.5); smile(g, 33, 8.4);
    ud.top = 48;
  },
  round(g, ch, ud) {
    part(g, sph(15, 22, 16), ch.color, [0, 15, 0]);
    eyes(g, 18, 14, 4.5); smile(g, 13.5, 14.2);
    for (const s of [-1, 1]) part(g, sph(2.6, 8, 6), '#ff9a8a', [s * 9, 13, 11.6], {outline: false, shadow: false});
    ud.top = 34; ud.roll = true;
  },
  rat(g, ch, ud) {
    legs(g, ud, [-5, 5]);
    part(g, sph(11), ch.color, [0, 16, 0], {scale: [1, 1, 0.85]});
    part(g, sph(10), '#a8a8b8', [0, 33, 0]);
    for (const s of [-1, 1]) part(g, sph(5), '#a8a8b8', [s * 8, 42, -1], {scale: [1, 1, 0.4]});
    part(g, sph(2.4, 8, 6), '#ff7ccf', [0, 31, 10], {outline: false});
    eyes(g, 35, 8.8);
    part(g, box(2.5, 16, 2.5), '#9a9aa8', [13, 18, 5], {rot: [0, 0, -0.5]});
    ud.top = 50;
  },
  fox(g, ch, ud) {
    legs(g, ud, [-5, 5], [-7, 7], '#c85a10', 9, 2.2);
    part(g, sph(9), '#ff7a1f', [0, 13, 0], {scale: [0.9, 0.8, 1.4]});
    part(g, sph(6), '#ffffff', [0, 15, 9], {outline: false});
    part(g, sph(8), '#ff7a1f', [0, 24, 12]);
    part(g, cone(4, 9, 10), '#ffffff', [0, 22, 20.5], {rot: [Math.PI / 2, 0, 0], ol: 1.15});
    part(g, sph(1.7, 8, 6), INKM, [0, 22, 25.4], {outline: false});
    for (const s of [-1, 1]) part(g, cone(3.5, 8, 8), '#ff7a1f', [s * 5, 32, 11], {ol: 1.15});
    eyes(g, 26, 18.5, 3.5, 1.5);
    ud.tongue = part(g, box(2.4, 1, 4), '#ff4f6a', [0, 19.5, 22], {outline: false});
    part(g, sph(6), '#ff7a1f', [0, 16, -17], {scale: [0.8, 0.8, 2], rot: [-0.5, 0, 0]});
    part(g, sph(4), '#ffffff', [0, 21.5, -25], {outline: false});
    ud.top = 38;
  },
  meta(g, ch, ud) {
    const ring = new THREE.Group(); ring.position.y = 24; g.add(ring);
    part(ring, tor(12, 3.5, Math.PI), mat('#0866ff', {emissive: '#0866ff', ei: 0.35}), [0, 0, 0], {ol: 1.08});
    part(ring, tor(12, 3.5, Math.PI), mat('#c23bff', {emissive: '#c23bff', ei: 0.35}), [0, 0, 0], {rot: [0, 0, Math.PI], ol: 1.08});
    for (const s of [-1, 1]) part(ring, box(5, 2.5, 2), mat('#ff3b5c', {emissive: '#ff3b5c', ei: 0.6}), [s * 4.5, 3, 0], {outline: false});
    ud.float = ring; ud.top = 42;
  },
  zennith(g, ch, ud) {
    const robe = mat('#1a1030', {opacity: 0.92});
    part(g, cone(15, 46, 18), robe, [0, 23, 0], {olMat: OUTP, ol: 1.05});
    part(g, sph(11), robe, [0, 46, 0], {olMat: OUTP, ol: 1.06});
    const glow = mat('#e8d8ff', {emissive: '#c8a8ff', ei: 1.5});
    for (const s of [-1, 1]) part(g, sph(2.4, 8, 6), glow, [s * 4.5, 47, 9.6], {scale: [1, 1.5, 0.6], outline: false, shadow: false});
    ud.hover = true; ud.top = 60;
  },
  blob(g, ch, ud) {
    part(g, sph(13), mat('#2a2238', {emissive: '#3a1a6a', ei: 0.5, opacity: 0.85}), [0, 11, 0], {scale: [1, 0.85, 1], olMat: OUTP, ol: 1.06});
    part(g, sph(2.2, 8, 6), '#ffffff', [-4, 16, 10], {outline: false, shadow: false});
    ud.pulse = true; ud.top = 26;
  },
  alien(g, ch, ud) {
    legs(g, ud, [-4, 4], [0], '#2a9a4a', 7, 2.4);
    part(g, sph(9), '#3ccf6e', [0, 14, 0]);
    part(g, sph(13), '#7fff7f', [0, 32, 0], {scale: [1, 0.85, 0.9]});
    for (const s of [-1, 1]) part(g, sph(3.5, 10, 8), INKM, [s * 5, 32, 10], {scale: [1, 1.5, 0.6], rot: [0, 0, s * 0.4], outline: false});
    for (const s of [-1, 1]) {
      part(g, cyl(0.8, 0.8, 9, 6), '#1d1a2f', [s * 5, 46, 0], {rot: [0, 0, -s * 0.3], outline: false});
      part(g, sph(2.2, 8, 6), '#ff3b5c', [s * 6.5, 51, 0], {outline: false});
    }
    ud.top = 56;
  },
  robot(g, ch, ud) {
    legs(g, ud, [-5, 5], [0], '#6a7888', 6, 2.6);
    part(g, box(20, 22, 16), '#c9d6e0', [0, 17, 0], {ol: 1.07});
    for (const s of [-1, 1]) part(g, box(4, 4, 1), mat('#00e5ff', {emissive: '#00e5ff', ei: 1.2}), [s * 4.5, 21, 8.3], {outline: false});
    part(g, cyl(0.9, 0.9, 7, 6), '#1d1a2f', [0, 31.5, 0], {outline: false});
    ud.bulb = part(g, sph(2.5, 8, 6), mat('#ff3b3b', {emissive: '#ff3b3b', ei: 1, unique: true}), [0, 36, 0], {outline: false});
    ud.top = 40;
  },
  bats(g, ch, ud) {
    ud.bats = [];
    const red = mat('#ff3b3b', {emissive: '#ff3b3b', ei: 1.4});
    for (let i = 0; i < 6; i++) {
      const b = new THREE.Group(); g.add(b);
      part(b, sph(3.4, 10, 8), '#2a2238', [0, 0, 0], {ol: 1.2});
      for (const s of [-1, 1]) {
        const piv = new THREE.Group(); piv.position.x = s * 2.5; b.add(piv);
        part(piv, box(9, 0.8, 5), '#3a2a50', [s * 4.5, 0, 0], {outline: false});
        piv.userData.s = s;
      }
      for (const s of [-1, 1]) part(b, sph(0.8, 6, 4), red, [s * 1.3, 0.8, 3], {outline: false, shadow: false});
      ud.bats.push(b);
    }
    ud.top = 40;
  },
  bigpumpkin(g, ch, ud) {
    const body = new THREE.Group(); body.position.y = 24; g.add(body); ud.spin = body;
    part(body, sph(24, 22, 16), mat('#ff7a1f', {emissive: '#ff5a00', ei: 0.25}), [0, 0, 0], {scale: [1.1, 0.9, 1.1], ol: 1.05});
    const fire = mat('#ffd23f', {emissive: '#ffb000', ei: 1.6});
    for (const s of [-1, 1]) part(body, cone(4.5, 7, 3), fire, [s * 8, 6, 23], {rot: [Math.PI / 2, 0, 0], outline: false, shadow: false});
    part(body, box(18, 5, 3), fire, [0, -6, 23.5], {outline: false, shadow: false});
    part(body, cyl(2, 2.6, 8, 6), '#3c7a2a', [0, 23, 0], {outline: false});
    ud.top = 54;
  },
  sheet(g, ch, ud) {
    const m = mat('#ffffff');
    part(g, hemi(13), m, [0, 28, 0], {ol: 1.07});
    part(g, cyl(13, 16, 20, 18, true), m, [0, 18, 0], {ol: 1.05});
    for (const s of [-1, 1]) part(g, sph(2.5, 8, 6), INKM, [s * 5, 32, 12], {scale: [1, 1.6, 0.6], outline: false});
    ud.hover = true; ud.top = 44;
  },
};

// returns outer group (positioned in world) with .userData.model (scaled) and animation hooks
export function buildChar(ch, scale = 1) {
  const outer = new THREE.Group(), model = new THREE.Group(), bob = new THREE.Group();
  outer.add(model); model.add(bob); model.scale.setScalar(scale);
  const ud = {legs: [], top: 54, walk: 0, face: 0, model, bob, scale};
  (BUILDERS[ch.kind || 'person'] || person)(bob, ch, ud);
  outer.userData = ud;
  return outer;
}

export function animChar(g, x, z, t, dt, moving) {
  const ud = g.userData;
  const dx = x - g.position.x, dz = z - g.position.z, d = Math.hypot(dx, dz);
  if (moving !== false && d > 0.08) { ud.face = Math.atan2(dx, dz); ud.walk += d * 0.16; ud.movedAt = t; }
  g.position.set(x, 0, z);
  let diff = ud.face - ud.model.rotation.y;
  diff = Math.atan2(Math.sin(diff), Math.cos(diff));
  ud.model.rotation.y += diff * Math.min(1, dt * 12);
  const walking = t - (ud.movedAt || -9) < 0.12;
  const sw = walking ? Math.sin(ud.walk) : 0;
  ud.legs.forEach((l, i) => l.rotation.x = sw * 0.7 * (i % 2 ? 1 : -1) * (i > 1 ? -1 : 1));
  ud.bob.position.y = walking ? Math.abs(Math.sin(ud.walk)) * 2.5 : 0;
  if (ud.roll) ud.bob.rotation.x = ud.walk * 0.4;
  if (ud.hover) ud.bob.position.y = 6 + Math.sin(t * 2.2 + x * 0.01) * 3;
  if (ud.float) { ud.float.position.y = 24 + Math.sin(t * 3) * 3; ud.float.rotation.z = Math.sin(t * 1.5) * 0.2; }
  if (ud.pulse) ud.bob.scale.setScalar(1 + Math.sin(t * 4) * 0.08);
  if (ud.wiggle) ud.wiggle.forEach((s, i) => s.position.x = Math.sin(t * 5 + i) * 2.2);
  if (ud.tear) ud.tear.position.y = 35 - (t * 18 % 7);
  if (ud.tongue) ud.tongue.scale.z = 1 + Math.abs(Math.sin(t * 8)) * 0.8;
  if (ud.bulb) ud.bulb.material.emissive.set((t * 3 % 1) < 0.5 ? '#ff3b3b' : '#ffd23f');
  if (ud.spin) ud.spin.rotation.x = ud.walk * 0.45;
  if (ud.bats) ud.bats.forEach((b, i) => {
    const a = t * 3.2 + i * 1.05;
    b.position.set(Math.cos(a) * 16, 22 + Math.sin(t * 5 + i * 2) * 9, Math.sin(a * 1.2) * 16);
    b.rotation.y = -a;
    b.children.forEach(c => { if (c.userData.s) c.rotation.z = c.userData.s * Math.sin(t * 28 + i) * 0.9; });
  });
}

/* ---------- sprites ---------- */
const texCache = new Map();
function canvasTex(key, w, h, draw) {
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const v = {tex: t, aspect: w / h}; texCache.set(key, v); return v;
}
const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",serif';
export function emojiTex(e) {
  return canvasTex('e' + e, 128, 128, g => { g.font = `96px ${EMOJI_FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(e, 64, 72); }).tex;
}
const smCache = new Map();
export function emojiMat(e) {
  if (!smCache.has(e)) smCache.set(e, new THREE.SpriteMaterial({map: emojiTex(e), transparent: true, depthWrite: false}));
  return smCache.get(e);
}
export function emojiSprite(e, size, shared = true) {
  const s = new THREE.Sprite(shared ? emojiMat(e) : new THREE.SpriteMaterial({map: emojiTex(e), transparent: true, depthWrite: false}));
  s.scale.set(size, size, 1); s.userData.e = e; return s;
}
export function setEmoji(s, e) { if (s.userData.e === e) return; s.userData.e = e; s.material.map = emojiTex(e); s.material.needsUpdate = true; }

function tagTex(txt) {
  const g0 = document.createElement('canvas').getContext('2d');
  g0.font = 'bold 26px Menlo, monospace';
  const w = Math.ceil(g0.measureText(txt).width) + 26;
  return canvasTex('t' + txt, w, 40, (g, W, H) => {
    g.fillStyle = 'rgba(255,255,255,.94)'; g.strokeStyle = '#1d1a2f'; g.lineWidth = 3;
    g.beginPath(); g.roundRect ? g.roundRect(2, 2, W - 4, H - 4, 18) : g.rect(2, 2, W - 4, H - 4); g.fill(); g.stroke();
    g.font = 'bold 26px Menlo, monospace'; g.fillStyle = '#1d1a2f'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, W / 2, H / 2 + 1);
  });
}
export function tagSprite(txt, h = 13) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({transparent: true, depthTest: false, depthWrite: false}));
  s.renderOrder = 10; s.userData.h = h; setTag(s, txt); return s;
}
export function setTag(s, txt) {
  if (s.userData.txt === txt) return;
  const {tex, aspect} = tagTex(txt);
  s.userData.txt = txt; s.material.map = tex; s.material.needsUpdate = true;
  s.scale.set(s.userData.h * aspect, s.userData.h, 1);
}
export function floatSprite(txt) {
  const g0 = document.createElement('canvas').getContext('2d'); g0.font = '900 44px Futura, sans-serif';
  const w = Math.ceil(g0.measureText(txt).width) + 24;
  const c = document.createElement('canvas'); c.width = w; c.height = 64;
  const g = c.getContext('2d'); g.font = '900 44px Futura, "Trebuchet MS", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 8; g.strokeStyle = '#fff'; g.strokeText(txt, w / 2, 34); g.fillStyle = '#ff7a1f'; g.fillText(txt, w / 2, 34);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({map: t, transparent: true, depthTest: false}));
  s.renderOrder = 11; s.scale.set(22 * w / 64, 22, 1); return s;
}
export function glowTex(color) {
  return canvasTex('g' + color, 128, 128, (g) => {
    const gr = g.createRadialGradient(64, 64, 2, 64, 64, 64);
    gr.addColorStop(0, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  }).tex;
}
