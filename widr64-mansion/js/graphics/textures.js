// ==========================================================
// textures.js — procedural HTML5 Canvas textures:
// wood floors, Victorian wallpaper, checkered tiles, rugs,
// and pixel-art WIDR 64 cast portraits (plus lore paintings)
// ==========================================================
import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';

const cache = new Map();

function cloneTex(t) {
  const c = t.clone();
  c.needsUpdate = true;
  return c;
}

export const hexCss = (n) => '#' + n.toString(16).padStart(6, '0');

function shade(hex, amt) {
  const c = new THREE.Color(hex);
  const hsl = {};
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.min(1, Math.max(0, hsl.l + amt)));
  return '#' + c.getHexString();
}

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// Surfaces now filter smoothly (with high anisotropy for the tilted camera)
// and get normal + roughness maps; portraits and pixel art stay crisp.
const RETRO_FILTER = false;
const ANISO = 8;

function toTexture(c, { repeat = [1, 1], nearest = RETRO_FILTER } = {}) {
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  if (nearest) {
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestMipmapLinearFilter;
  }
  tex.anisotropy = nearest ? 4 : ANISO;
  tex.needsUpdate = true;
  return tex;
}

// seeded pseudo-random so textures are stable between sessions
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// tileable value noise: a random grid that wraps at the edges, so a
// repeated floor or wall never shows a seam
function tileNoise(cells, r) {
  const grid = new Float32Array(cells * cells).map(() => r());
  return (u, v) => {
    const x = u * cells;
    const y = v * cells;
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = x - x0;
    const fy = y - y0;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const at = (i, j) => grid[(((j % cells) + cells) % cells) * cells + (((i % cells) + cells) % cells)];
    const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx;
    const b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx;
    return a + (b - a) * sy;
  };
}

// age a surface: patchy grime, dust speckle and a few water stains
function weather(c, seed, { dirt = 0.2, stains = 3, speckle = 0.04 } = {}) {
  const g = c.getContext('2d');
  const W = c.width;
  const H = c.height;
  const r = rng(seed * 7919 + 17);
  const n1 = tileNoise(3, r);
  const n2 = tileNoise(9, r);
  const n3 = tileNoise(27, r);
  const img = g.getImageData(0, 0, W, H);
  const d = img.data;
  for (let y = 0; y < H; y++) {
    const v = y / H;
    for (let x = 0; x < W; x++) {
      const u = x / W;
      const n = n1(u, v) * 0.55 + n2(u, v) * 0.3 + n3(u, v) * 0.15;
      const grime = Math.max(0, (n - 0.42) / 0.58);
      let f = 1 - dirt * grime * grime * 1.6 + (0.5 - n) * dirt * 0.25;
      if (r() < speckle) f *= 0.82 + r() * 0.1;
      const i = (y * W + x) * 4;
      // grime pulls colour toward a warm brown-grey as well as darkening
      d[i] = d[i] * f + 6 * grime;
      d[i + 1] = d[i + 1] * f + 4 * grime;
      d[i + 2] = d[i + 2] * f;
    }
  }
  g.putImageData(img, 0, 0);
  // water stains, drawn with wrap-around copies so they tile
  for (let s = 0; s < stains; s++) {
    const sx = r() * W;
    const sy = r() * H;
    const rad = 10 + r() * 34;
    for (const ox of [-W, 0, W]) {
      for (const oy of [-H, 0, H]) {
        const gr = g.createRadialGradient(sx + ox, sy + oy, rad * 0.55, sx + ox, sy + oy, rad);
        gr.addColorStop(0, 'rgba(30,20,10,0.06)');
        gr.addColorStop(0.85, 'rgba(25,15,6,0.16)');
        gr.addColorStop(1, 'rgba(25,15,6,0)');
        g.fillStyle = gr;
        g.fillRect(sx + ox - rad, sy + oy - rad, rad * 2, rad * 2);
      }
    }
  }
}

// cracks, chips and creeping moss for the cellar stonework
function stoneDetail(g, r) {
  for (let i = 0; i < 14; i++) {
    let x = r() * 256;
    let y = r() * 256;
    g.strokeStyle = `rgba(10,8,12,${0.35 + r() * 0.3})`;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x, y);
    const steps = 3 + Math.floor(r() * 4);
    for (let k = 0; k < steps; k++) {
      x += (r() - 0.5) * 18;
      y += (r() - 0.5) * 18;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `rgba(${60 + r() * 30},${90 + r() * 40},${40 + r() * 20},${0.06 + r() * 0.1})`;
    g.beginPath();
    g.arc(r() * 256, (Math.floor(r() * 8) * 32 + 30) % 256, 2 + r() * 5, 0, Math.PI * 2);
    g.fill();
  }
}

// ---------------------------------------------------------------
// Relief: derive a normal map and a roughness map from a surface's own
// colour (dark grooves = low, bright = raised; dark = rough, bright = waxed)
const reliefCache = new WeakMap();

export function makeReliefMaps(tex, { strength = 2.5, rough = 0.8, roughVar = 0.3, blur = 1 } = {}) {
  const src = tex.image;
  if (!src || !src.getContext) return {};
  const key = strength + '|' + rough + '|' + roughVar + '|' + blur;
  let byKey = reliefCache.get(src);
  if (!byKey) reliefCache.set(src, (byKey = {}));
  let maps = byKey[key];
  if (!maps) {
    const W = src.width;
    const H = src.height;
    const data = src.getContext('2d').getImageData(0, 0, W, H).data;
    let h = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) h[i] = (data[i * 4] * 0.2126 + data[i * 4 + 1] * 0.7152 + data[i * 4 + 2] * 0.0722) / 255;
    const at = (a, x, y) => a[(((y % H) + H) % H) * W + (((x % W) + W) % W)];
    for (let b = 0; b < blur; b++) {
      const o = new Float32Array(W * H);
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          o[y * W + x] = (at(h, x, y) * 4 + at(h, x - 1, y) + at(h, x + 1, y) + at(h, x, y - 1) + at(h, x, y + 1)) / 8;
        }
      }
      h = o;
    }
    const nc = canvas(W, H);
    const rc = canvas(W, H);
    const nImg = nc.getContext('2d').createImageData(W, H);
    const rImg = rc.getContext('2d').createImageData(W, H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        // canvas rows run down, texture v runs up (flipY)
        const dx = (at(h, x + 1, y) - at(h, x - 1, y)) * strength;
        const dy = (at(h, x, y - 1) - at(h, x, y + 1)) * strength;
        const len = Math.hypot(dx, dy, 1);
        const i = (y * W + x) * 4;
        nImg.data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
        nImg.data[i + 1] = ((-dy / len) * 0.5 + 0.5) * 255;
        nImg.data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
        nImg.data[i + 3] = 255;
        const rv = Math.min(1, Math.max(0.05, rough + (0.45 - at(h, x, y)) * roughVar * 2));
        rImg.data[i] = rImg.data[i + 1] = rImg.data[i + 2] = rv * 255;
        rImg.data[i + 3] = 255;
      }
    }
    nc.getContext('2d').putImageData(nImg, 0, 0);
    rc.getContext('2d').putImageData(rImg, 0, 0);
    const mk = (cv) => {
      const t = new THREE.CanvasTexture(cv);
      t.colorSpace = THREE.NoColorSpace;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = ANISO;
      t.needsUpdate = true;
      return t;
    };
    maps = byKey[key] = { normalMap: mk(nc), roughnessMap: mk(rc) };
  }
  // per-use clones so each surface can have its own repeat
  const normalMap = maps.normalMap.clone();
  const roughnessMap = maps.roughnessMap.clone();
  normalMap.repeat.copy(tex.repeat);
  roughnessMap.repeat.copy(tex.repeat);
  normalMap.needsUpdate = true;
  roughnessMap.needsUpdate = true;
  return { normalMap, roughnessMap };
}

// ---------------------------------------------------------------
// Floors & walls
export function makeWoodTexture(base = '#5a3418', seed = 7) {
  const key = 'wood' + base + seed;
  if (cache.has(key)) return cloneTex(cache.get(key));
  const c = canvas(256, 256);
  const g = c.getContext('2d');
  const r = rng(seed);
  const plankH = 32;
  for (let y = 0; y < 256; y += plankH) {
    let x = -Math.floor(r() * 120);
    while (x < 256) {
      const len = 90 + Math.floor(r() * 110);
      const l = (r() - 0.5) * 0.12;
      g.fillStyle = shade(base, l);
      g.fillRect(x, y, len, plankH);
      // grain
      for (let i = 0; i < 9; i++) {
        g.strokeStyle = `rgba(20,8,0,${0.08 + r() * 0.12})`;
        g.lineWidth = 1;
        g.beginPath();
        const gy = y + 3 + r() * (plankH - 6);
        g.moveTo(x, gy);
        g.bezierCurveTo(x + len * 0.3, gy + (r() - 0.5) * 6, x + len * 0.6, gy + (r() - 0.5) * 6, x + len, gy);
        g.stroke();
      }
      // knot
      if (r() < 0.25) {
        g.fillStyle = 'rgba(30,12,2,0.45)';
        g.beginPath();
        g.ellipse(x + r() * len, y + plankH / 2, 5, 3, 0, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = 'rgba(10,4,0,0.7)';
      g.fillRect(x + len - 2, y, 2, plankH);
      // nails
      g.fillStyle = 'rgba(200,180,140,0.35)';
      g.fillRect(x + 5, y + 5, 2, 2);
      g.fillRect(x + 5, y + plankH - 7, 2, 2);
      x += len;
    }
    g.fillStyle = 'rgba(0,0,0,0.65)';
    g.fillRect(0, y + plankH - 2, 256, 2);
    g.fillStyle = 'rgba(255,220,170,0.08)';
    g.fillRect(0, y, 256, 2);
  }
  // polished oak: soft diagonal varnish sheen + scuffed wax
  const sheen = g.createLinearGradient(0, 0, 256, 256);
  sheen.addColorStop(0, 'rgba(255,230,190,0)');
  sheen.addColorStop(0.45, 'rgba(255,230,190,0.07)');
  sheen.addColorStop(0.5, 'rgba(255,240,210,0.13)');
  sheen.addColorStop(0.55, 'rgba(255,230,190,0.07)');
  sheen.addColorStop(1, 'rgba(255,230,190,0)');
  g.fillStyle = sheen;
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 26; i++) {
    g.strokeStyle = `rgba(255,235,200,${0.03 + r() * 0.04})`;
    g.lineWidth = 1;
    g.beginPath();
    const sx = r() * 256;
    const sy = r() * 256;
    g.moveTo(sx, sy);
    g.lineTo(sx + 10 + r() * 30, sy + (r() - 0.5) * 4);
    g.stroke();
  }
  weather(c, seed, { dirt: 0.2, stains: 3, speckle: 0.05 });
  const tex = toTexture(c);
  cache.set(key, tex);
  return cloneTex(tex);
}

export function makeWallpaperTexture(base = '#5b1a24', accent = '#c99a4a', style = 'damask') {
  const key = 'wp' + base + accent + style;
  if (cache.has(key)) return cloneTex(cache.get(key));
  const c = canvas(256, 256);
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 256);
  // subtle vertical stripes
  for (let x = 0; x < 256; x += 32) {
    g.fillStyle = 'rgba(0,0,0,0.12)';
    g.fillRect(x, 0, 14, 256);
    g.fillStyle = 'rgba(255,255,255,0.03)';
    g.fillRect(x + 14, 0, 2, 256);
  }
  g.fillStyle = accent;
  g.strokeStyle = accent;
  const motif = (cx, cy, s) => {
    g.save();
    g.translate(cx, cy);
    g.globalAlpha = 0.55;
    if (style === 'damask') {
      // fleur-de-lis-ish damask
      g.beginPath();
      g.moveTo(0, -24 * s);
      g.bezierCurveTo(10 * s, -14 * s, 10 * s, -4 * s, 0, 4 * s);
      g.bezierCurveTo(-10 * s, -4 * s, -10 * s, -14 * s, 0, -24 * s);
      g.fill();
      for (const d of [-1, 1]) {
        g.beginPath();
        g.moveTo(0, 2 * s);
        g.bezierCurveTo(d * 22 * s, -6 * s, d * 22 * s, 16 * s, d * 6 * s, 12 * s);
        g.lineWidth = 3 * s;
        g.stroke();
        g.beginPath();
        g.arc(d * 15 * s, 14 * s, 3 * s, 0, Math.PI * 2);
        g.fill();
      }
      g.fillRect(-2 * s, 4 * s, 4 * s, 18 * s);
      g.beginPath();
      g.ellipse(0, 24 * s, 8 * s, 3 * s, 0, 0, Math.PI * 2);
      g.fill();
    } else if (style === 'floral') {
      for (let i = 0; i < 6; i++) {
        g.rotate(Math.PI / 3);
        g.beginPath();
        g.ellipse(0, -9 * s, 4 * s, 9 * s, 0, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 0.9;
      g.fillStyle = shade(accent, 0.2);
      g.beginPath();
      g.arc(0, 0, 4 * s, 0, Math.PI * 2);
      g.fill();
    } else if (style === 'diamond') {
      g.beginPath();
      g.moveTo(0, -18 * s);
      g.lineTo(12 * s, 0);
      g.lineTo(0, 18 * s);
      g.lineTo(-12 * s, 0);
      g.closePath();
      g.lineWidth = 2.5 * s;
      g.stroke();
      g.beginPath();
      g.arc(0, 0, 4 * s, 0, Math.PI * 2);
      g.fill();
    } else if (style === 'stripe') {
      // Victorian pinstripe: small rosette between bold stripes (stripes drawn below)
      g.beginPath();
      g.arc(0, 0, 4 * s, 0, Math.PI * 2);
      g.fill();
      for (let i = 0; i < 4; i++) {
        g.rotate(Math.PI / 2);
        g.beginPath();
        g.ellipse(0, -7 * s, 2 * s, 4 * s, 0, 0, Math.PI * 2);
        g.fill();
      }
    } else {
      g.beginPath();
      g.arc(0, 0, 5 * s, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  };
  if (style === 'stripe') {
    for (let x = 0; x < 256; x += 32) {
      g.fillStyle = shade(base, -0.08);
      g.fillRect(x + 4, 0, 10, 256);
      g.fillStyle = accent;
      g.globalAlpha = 0.45;
      g.fillRect(x + 2, 0, 2, 256);
      g.fillRect(x + 14, 0, 2, 256);
      g.globalAlpha = 1;
    }
  }
  for (let y = 0; y <= 256; y += 64) {
    for (let x = 0; x <= 256; x += 64) {
      if (style === 'stripe') {
        motif(x + 24, y + 16, 0.8);
        motif(x + 56, y + 48, 0.8);
      } else {
        motif(x, y, 1);
        motif(x + 32, y + 32, 0.7);
      }
    }
  }
  // age & grime
  const r = rng(base.length * 31 + accent.length);
  for (let i = 0; i < 900; i++) {
    g.fillStyle = `rgba(0,0,0,${r() * 0.08})`;
    g.fillRect(r() * 256, r() * 256, 2, 2);
  }
  // water stains dripping from the ceiling
  for (let i = 0; i < 3; i++) {
    const sx = r() * 256;
    const len = 60 + r() * 120;
    const drip = g.createLinearGradient(0, 0, 0, len);
    drip.addColorStop(0, 'rgba(40,30,10,0.22)');
    drip.addColorStop(1, 'rgba(40,30,10,0)');
    g.fillStyle = drip;
    g.beginPath();
    g.moveTo(sx - 10, 0);
    g.quadraticCurveTo(sx - 6, len * 0.6, sx, len);
    g.quadraticCurveTo(sx + 6, len * 0.6, sx + 10, 0);
    g.fill();
  }
  // tiny peeling seam
  g.strokeStyle = 'rgba(255,240,200,0.08)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(127.5, 0);
  g.lineTo(127.5, 256);
  g.stroke();
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, 'rgba(0,0,0,0.25)');
  grad.addColorStop(0.5, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.2)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  weather(c, 57, { dirt: 0.2, stains: 4, speckle: 0.02 });
  const tex = toTexture(c);
  cache.set(key, tex);
  return cloneTex(tex);
}

export function makeWainscotTexture(base = '#3a2010') {
  const key = 'wain' + base;
  if (cache.has(key)) return cloneTex(cache.get(key));
  const c = canvas(256, 128);
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 128);
  for (let x = 0; x < 256; x += 64) {
    g.fillStyle = shade(base, -0.06);
    g.fillRect(x + 8, 16, 48, 96);
    g.strokeStyle = shade(base, 0.12);
    g.lineWidth = 3;
    g.strokeRect(x + 10, 18, 44, 92);
    g.strokeStyle = 'rgba(0,0,0,0.6)';
    g.lineWidth = 2;
    g.strokeRect(x + 14, 22, 36, 84);
  }
  g.fillStyle = shade(base, 0.15);
  g.fillRect(0, 0, 256, 8);
  g.fillStyle = 'rgba(0,0,0,0.5)';
  g.fillRect(0, 8, 256, 3);
  weather(c, 23, { dirt: 0.22, stains: 2, speckle: 0.04 });
  const tex = toTexture(c);
  cache.set(key, tex);
  return cloneTex(tex);
}

export function makeCheckerTexture(a = '#e9e0cc', b = '#1c1a26', tiles = 4) {
  const key = 'chk' + a + b + tiles;
  if (cache.has(key)) return cloneTex(cache.get(key));
  const c = canvas(256, 256);
  const g = c.getContext('2d');
  const s = 256 / tiles;
  const r = rng(99);
  for (let y = 0; y < tiles; y++) {
    for (let x = 0; x < tiles; x++) {
      const col = (x + y) % 2 === 0 ? a : b;
      g.fillStyle = shade(col, (r() - 0.5) * 0.05);
      g.fillRect(x * s, y * s, s, s);
      // marble veins
      g.strokeStyle = (x + y) % 2 === 0 ? 'rgba(80,70,60,0.15)' : 'rgba(255,255,255,0.06)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(x * s + r() * s, y * s);
      g.quadraticCurveTo(x * s + r() * s, y * s + s / 2, x * s + r() * s, y * s + s);
      g.stroke();
      g.strokeStyle = 'rgba(0,0,0,0.4)';
      g.strokeRect(x * s + 0.5, y * s + 0.5, s - 1, s - 1);
    }
  }
  weather(c, 99 + tiles, { dirt: 0.14, stains: 3, speckle: 0.03 });
  const tex = toTexture(c);
  cache.set(key, tex);
  return cloneTex(tex);
}

export function makeRugTexture(main = '#6b1d2a', border = '#d6a647', inner = '#203a5e') {
  const key = 'rug' + main + border + inner;
  if (cache.has(key)) return cache.get(key);
  const c = canvas(256, 384);
  const g = c.getContext('2d');
  g.fillStyle = border;
  g.fillRect(0, 0, 256, 384);
  g.fillStyle = main;
  g.fillRect(12, 12, 232, 360);
  g.strokeStyle = border;
  g.lineWidth = 4;
  g.strokeRect(26, 26, 204, 332);
  g.fillStyle = inner;
  g.beginPath();
  g.moveTo(128, 60);
  g.lineTo(205, 192);
  g.lineTo(128, 324);
  g.lineTo(51, 192);
  g.closePath();
  g.fill();
  g.strokeStyle = border;
  g.lineWidth = 3;
  g.stroke();
  g.fillStyle = border;
  g.beginPath();
  g.arc(128, 192, 22, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = main;
  g.beginPath();
  g.arc(128, 192, 12, 0, Math.PI * 2);
  g.fill();
  for (let i = 0; i < 12; i++) {
    const y = 40 + i * 28;
    g.fillStyle = border;
    g.fillRect(34, y, 6, 6);
    g.fillRect(216, y, 6, 6);
  }
  // fringe
  g.fillStyle = '#efe2c0';
  for (let x = 4; x < 256; x += 6) {
    g.fillRect(x, 0, 2, 8);
    g.fillRect(x, 376, 2, 8);
  }
  const r = rng(5);
  for (let i = 0; i < 2500; i++) {
    g.fillStyle = `rgba(0,0,0,${r() * 0.12})`;
    g.fillRect(r() * 256, r() * 384, 1, 1);
  }
  const tex = toTexture(c);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  cache.set(key, tex);
  return tex;
}

export function makeStoneTexture(base = '#55505a') {
  const key = 'stone' + base;
  if (cache.has(key)) return cloneTex(cache.get(key));
  const c = canvas(256, 256);
  const g = c.getContext('2d');
  g.fillStyle = '#1a1820';
  g.fillRect(0, 0, 256, 256);
  const r = rng(13);
  const rowH = 32;
  for (let y = 0; y < 256; y += rowH) {
    let x = (y / rowH) % 2 ? -24 : 0;
    while (x < 256) {
      const w = 40 + r() * 30;
      g.fillStyle = shade(base, (r() - 0.5) * 0.18);
      g.fillRect(x + 2, y + 2, w - 4, rowH - 4);
      g.fillStyle = 'rgba(255,255,255,0.07)';
      g.fillRect(x + 2, y + 2, w - 4, 3);
      x += w;
    }
  }
  stoneDetail(g, r);
  weather(c, 13, { dirt: 0.32, stains: 6, speckle: 0.08 });
  const tex = toTexture(c);
  cache.set(key, tex);
  return cloneTex(tex);
}

export function makeTableclothTexture() {
  const key = 'cloth';
  if (cache.has(key)) return cloneTex(cache.get(key));
  const c = canvas(128, 128);
  const g = c.getContext('2d');
  g.fillStyle = '#efe6d2';
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = 'rgba(160,40,60,0.18)';
  for (let i = 0; i < 128; i += 16) {
    g.fillRect(i, 0, 6, 128);
    g.fillRect(0, i, 128, 6);
  }
  g.fillStyle = 'rgba(120,90,40,0.12)';
  g.beginPath();
  g.arc(40, 70, 14, 0, Math.PI * 2);
  g.fill();
  const tex = toTexture(c);
  cache.set(key, tex);
  return cloneTex(tex);
}

export function makeDoorTexture(base = '#4a2814') {
  const key = 'door' + base;
  if (cache.has(key)) return cache.get(key);
  const c = canvas(128, 256);
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, 128, 256);
  const panel = (x, y, w, h) => {
    g.fillStyle = shade(base, -0.07);
    g.fillRect(x, y, w, h);
    g.strokeStyle = shade(base, 0.14);
    g.lineWidth = 3;
    g.strokeRect(x + 2, y + 2, w - 4, h - 4);
    g.strokeStyle = 'rgba(0,0,0,0.6)';
    g.lineWidth = 2;
    g.strokeRect(x + 6, y + 6, w - 12, h - 12);
  };
  panel(12, 14, 46, 100);
  panel(70, 14, 46, 100);
  panel(12, 132, 46, 108);
  panel(70, 132, 46, 108);
  const r = rng(3);
  for (let i = 0; i < 40; i++) {
    g.strokeStyle = `rgba(0,0,0,${r() * 0.2})`;
    g.beginPath();
    const x = r() * 128;
    g.moveTo(x, 0);
    g.lineTo(x + (r() - 0.5) * 8, 256);
    g.stroke();
  }
  weather(c, 41, { dirt: 0.2, stains: 3, speckle: 0.04 });
  const tex = toTexture(c);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  cache.set(key, tex);
  return tex;
}

export function makeWindowTexture() {
  const key = 'window';
  if (cache.has(key)) return cache.get(key);
  const c = canvas(128, 192);
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 192);
  grad.addColorStop(0, '#0a1440');
  grad.addColorStop(1, '#2b3f7a');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 192);
  // stars
  const r = rng(21);
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.7})`;
    g.fillRect(r() * 128, r() * 120, 1.5, 1.5);
  }
  // moon
  g.fillStyle = '#f4f0d0';
  g.shadowColor = '#cfe0ff';
  g.shadowBlur = 20;
  g.beginPath();
  g.arc(84, 52, 20, 0, Math.PI * 2);
  g.fill();
  g.shadowBlur = 0;
  g.fillStyle = 'rgba(160,160,140,0.35)';
  g.beginPath();
  g.arc(78, 46, 4, 0, Math.PI * 2);
  g.arc(92, 60, 3, 0, Math.PI * 2);
  g.fill();
  // dead tree silhouettes
  g.fillStyle = '#05060f';
  g.beginPath();
  g.moveTo(0, 192);
  g.lineTo(0, 150);
  g.quadraticCurveTo(30, 140, 50, 160);
  g.quadraticCurveTo(80, 130, 128, 150);
  g.lineTo(128, 192);
  g.fill();
  g.strokeStyle = '#05060f';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(22, 160);
  g.lineTo(26, 110);
  g.lineTo(14, 92);
  g.moveTo(26, 120);
  g.lineTo(40, 100);
  g.stroke();
  // mullions
  g.fillStyle = '#2a1608';
  g.fillRect(61, 0, 6, 192);
  g.fillRect(0, 93, 128, 6);
  const tex = toTexture(c);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  cache.set(key, tex);
  return tex;
}

export function makeGlowTexture(color = '#ffffff') {
  const key = 'glow' + color;
  if (cache.has(key)) return cache.get(key);
  const c = canvas(64, 64);
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, color);
  grad.addColorStop(0.35, color + 'aa');
  grad.addColorStop(1, color + '00');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, tex);
  return tex;
}

export function makeHeartTexture(hp = 100) {
  const c = canvas(64, 64);
  const g = c.getContext('2d');
  g.fillStyle = '#ff3b6b';
  g.strokeStyle = '#1c1830';
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(32, 56);
  g.bezierCurveTo(8, 40, 4, 26, 6, 18);
  g.bezierCurveTo(8, 6, 26, 2, 32, 16);
  g.bezierCurveTo(38, 2, 56, 6, 58, 18);
  g.bezierCurveTo(60, 26, 56, 40, 32, 56);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = '#fff';
  g.font = 'bold 18px "Arial Black", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(String(Math.ceil(hp)), 32, 30);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ---------------------------------------------------------------
// Pixel-art portraits (WIDR 64 cast + lore)
// Drawn on a 64x64 logical grid, scaled to any size.

export function drawPortrait(ctx, size, subject, opts = {}) {
  const s = size / 64;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const P = (x, y, w, h, col) => {
    ctx.fillStyle = col;
    ctx.fillRect(Math.round(x * s), Math.round(y * s), Math.ceil(w * s), Math.ceil(h * s));
  };
  const C = (x, y, r, col) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(x * s, y * s, r * s, 0, Math.PI * 2);
    ctx.fill();
  };
  const id = typeof subject === 'string' ? subject : subject.id;

  if (id === 'kayo_yara') return drawCats(ctx, P, C, s, size), ctx.restore();
  if (id === 'lawrence') return drawLawrence(ctx, P, C, s), ctx.restore();
  if (id === 'grumbleclaw') return drawGrumbleclaw(ctx, P, C, s), ctx.restore();
  if (BOSS_PORTRAITS[id]) return drawBossPortrait(ctx, P, C, s, BOSS_PORTRAITS[id]), ctx.restore();
  if (id.startsWith && id.startsWith('art_')) return drawArtwork(ctx, P, C, s, id), ctx.restore();

  const ch = subject;
  const prim = hexCss(ch.colors.primary);
  const sec = hexCss(ch.colors.secondary);
  const skin = hexCss(ch.colors.skin);
  const hair = hexCss(ch.colors.hair);
  const acc = hexCss(ch.colors.accent);

  // background
  P(0, 0, 64, 64, ch.css.bg);
  for (let i = 0; i < 64; i += 8) P(i, 0, 4, 64, 'rgba(255,255,255,0.18)');
  C(32, 30, 24, 'rgba(255,255,255,0.35)');
  if (opts.dim) P(0, 0, 64, 64, 'rgba(0,0,0,0.4)');

  // shoulders / torso
  P(10, 50, 44, 14, prim);
  P(14, 46, 36, 6, prim);
  P(26, 46, 12, 18, shade(prim, 0.1));
  // vacuum straps
  P(16, 48, 4, 16, '#30302e');
  P(44, 48, 4, 16, '#30302e');

  const face = (eyeCol = '#1c1830') => {
    C(32, 31, 13, skin);
    P(19, 28, 26, 8, skin);
    P(26, 30, 3, 4, eyeCol);
    P(35, 30, 3, 4, eyeCol);
    P(26, 30, 1, 1, '#ffffff');
    P(35, 30, 1, 1, '#ffffff');
    P(28, 39, 8, 2, shade(ch.colors.skin, -0.25));
    P(31, 34, 2, 3, shade(ch.colors.skin, -0.12));
    C(23, 36, 2.5, 'rgba(255,120,120,0.35)');
    C(41, 36, 2.5, 'rgba(255,120,120,0.35)');
  };

  switch (ch.accessory) {
    case 'cap_bat': {
      // bat behind
      ctx.save();
      ctx.translate(50 * s, 40 * s);
      ctx.rotate(-0.5);
      ctx.fillStyle = '#c99256';
      ctx.fillRect(-3 * s, -26 * s, 6 * s, 30 * s);
      ctx.fillRect(-4 * s, -30 * s, 8 * s, 8 * s);
      ctx.restore();
      face();
      P(19, 18, 26, 9, prim);
      C(32, 21, 12, prim);
      P(14, 25, 20, 4, shade(prim, -0.15));
      P(30, 19, 4, 4, '#ffffff');
      P(20, 26, 3, 6, hair);
      P(41, 26, 3, 6, hair);
      break;
    }
    case 'visor_eye': {
      P(19, 18, 26, 10, hair);
      C(32, 21, 12, hair);
      face();
      P(18, 27, 28, 6, '#1b1f2a');
      P(20, 28, 9, 4, '#2d5aa0');
      C(37, 30, 4, '#5ff6ff');
      C(37, 30, 2, '#ffffff');
      P(46, 27, 3, 3, acc);
      ctx.fillStyle = 'rgba(95,246,255,0.25)';
      ctx.beginPath();
      ctx.arc(37 * s, 30 * s, 8 * s, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'wizard_hat': {
      face();
      P(20, 38, 24, 10, hair);
      P(22, 46, 20, 4, hair);
      P(28, 38, 8, 3, skin);
      ctx.fillStyle = prim;
      ctx.beginPath();
      ctx.moveTo(14 * s, 24 * s);
      ctx.lineTo(50 * s, 24 * s);
      ctx.lineTo(40 * s, 2 * s);
      ctx.closePath();
      ctx.fill();
      P(12, 22, 40, 4, shade(prim, -0.1));
      P(18, 18, 28, 3, sec);
      // lightning bolt sparks
      ctx.fillStyle = sec;
      ctx.beginPath();
      ctx.moveTo(52 * s, 6 * s);
      ctx.lineTo(56 * s, 14 * s);
      ctx.lineTo(53 * s, 14 * s);
      ctx.lineTo(57 * s, 22 * s);
      ctx.lineTo(50 * s, 12 * s);
      ctx.lineTo(53 * s, 12 * s);
      ctx.closePath();
      ctx.fill();
      P(8, 12, 2, 2, sec);
      P(10, 8, 2, 2, sec);
      break;
    }
    case 'shadow': {
      P(0, 0, 64, 64, '#2a2f20');
      for (let i = 0; i < 64; i += 8) P(i, 0, 4, 64, 'rgba(182,255,74,0.07)');
      ctx.fillStyle = '#07070b';
      ctx.beginPath();
      ctx.moveTo(10 * s, 64 * s);
      ctx.quadraticCurveTo(8 * s, 18 * s, 32 * s, 14 * s);
      ctx.quadraticCurveTo(56 * s, 18 * s, 54 * s, 64 * s);
      ctx.closePath();
      ctx.fill();
      C(25, 34, 4, '#b6ff4a');
      C(39, 34, 4, '#b6ff4a');
      C(25, 34, 1.8, '#f6ffe0');
      C(39, 34, 1.8, '#f6ffe0');
      ctx.fillStyle = 'rgba(182,255,74,0.15)';
      ctx.beginPath();
      ctx.arc(32 * s, 34 * s, 16 * s, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'headlamp_beard': {
      face();
      // beard
      ctx.fillStyle = hair;
      ctx.beginPath();
      ctx.moveTo(18 * s, 34 * s);
      ctx.lineTo(46 * s, 34 * s);
      ctx.lineTo(40 * s, 56 * s);
      ctx.lineTo(32 * s, 60 * s);
      ctx.lineTo(24 * s, 56 * s);
      ctx.closePath();
      ctx.fill();
      P(27, 38, 10, 3, shade(ch.colors.skin, -0.25));
      P(24, 35, 16, 3, shade(ch.colors.hair, 0.1));
      // helmet
      C(32, 21, 14, sec);
      P(16, 22, 32, 5, shade(ch.colors.secondary, -0.15));
      P(28, 12, 8, 7, '#33302a');
      C(32, 15, 3, '#fff6c0');
      ctx.fillStyle = 'rgba(255,240,170,0.35)';
      ctx.beginPath();
      ctx.moveTo(32 * s, 15 * s);
      ctx.lineTo(10 * s, 0);
      ctx.lineTo(54 * s, 0);
      ctx.closePath();
      ctx.fill();
      // tiny cats on shoulders (Kayo & Yara)
      if (size >= 64) {
        drawMiniCat(P, C, 6, 46, '#2b2b2b', '#f7d14a');
        drawMiniCat(P, C, 48, 46, '#e8913a', '#5fdc6f');
      }
      break;
    }
    case 'goggles_bomb': {
      P(19, 18, 26, 10, hair);
      C(32, 21, 12, hair);
      face();
      P(17, 26, 30, 4, '#3a2a1a');
      C(26, 28, 5, '#ff7a1a');
      C(38, 28, 5, '#ff7a1a');
      C(26, 28, 3, '#ffe0a8');
      C(38, 28, 3, '#ffe0a8');
      // bomb
      C(52, 52, 8, '#1a1a1a');
      P(51, 41, 3, 4, '#a08060');
      C(53, 39, 2.5, '#ffd040');
      C(49, 49, 2, 'rgba(255,255,255,0.4)');
      break;
    }
    case 'ice_crown': {
      // cape
      P(6, 46, 52, 18, prim);
      P(14, 46, 36, 4, sec);
      P(26, 46, 12, 18, shade(prim, 0.1));
      face('#1e3a7a');
      P(19, 20, 26, 7, hair);
      // crown of ice crystals
      ctx.fillStyle = sec;
      for (let i = 0; i < 5; i++) {
        const x = 18 + i * 7;
        const h = i === 2 ? 18 : i % 2 ? 12 : 9;
        ctx.beginPath();
        ctx.moveTo(x * s, 20 * s);
        ctx.lineTo((x + 3.5) * s, (20 - h) * s);
        ctx.lineTo((x + 7) * s, 20 * s);
        ctx.closePath();
        ctx.fill();
      }
      P(18, 18, 28, 4, '#8fd8ff');
      P(31, 6, 2, 2, '#ffffff');
      // snowflakes
      P(8, 10, 2, 2, '#ffffff');
      P(54, 16, 2, 2, '#ffffff');
      P(50, 6, 2, 2, '#ffffff');
      break;
    }
    case 'shamrock_crystals': {
      face();
      P(19, 18, 26, 6, hair);
      P(18, 24, 4, 10, hair);
      P(42, 24, 4, 10, hair);
      // explorer hat
      P(14, 17, 36, 4, sec);
      P(20, 8, 24, 10, sec);
      P(20, 14, 24, 3, prim);
      // shamrock patch on chest
      C(20, 54, 2.5, '#3ad35a');
      C(17.5, 51, 2.5, '#3ad35a');
      C(22.5, 51, 2.5, '#3ad35a');
      P(19.5, 54, 1, 4, '#1f7a2a');
      // crystals
      ctx.fillStyle = acc;
      ctx.beginPath();
      ctx.moveTo(48 * s, 64 * s);
      ctx.lineTo(51 * s, 44 * s);
      ctx.lineTo(55 * s, 64 * s);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#b07dff';
      ctx.beginPath();
      ctx.moveTo(54 * s, 64 * s);
      ctx.lineTo(58 * s, 50 * s);
      ctx.lineTo(61 * s, 64 * s);
      ctx.closePath();
      ctx.fill();
      // freckles
      P(23, 34, 1, 1, '#b5602a');
      P(25, 35, 1, 1, '#b5602a');
      P(39, 34, 1, 1, '#b5602a');
      P(41, 35, 1, 1, '#b5602a');
      break;
    }
    case 'gadget_pack': {
      // big backpack behind
      P(6, 30, 52, 30, sec);
      P(10, 34, 8, 6, acc);
      P(46, 34, 8, 6, '#ff5050');
      P(50, 14, 2, 18, '#30302e');
      C(51, 13, 3, '#ff5050');
      face();
      P(19, 18, 26, 9, hair);
      C(32, 21, 12, hair);
      P(36, 15, 4, 4, hair);
      P(20, 30, 10, 1, '#555');
      break;
    }
    case 'professor': {
      // lab coat with lapels over a shirt and blue tie (no vacuum straps)
      P(10, 46, 44, 18, '#f2f5fa');
      P(26, 46, 12, 18, '#dfe8f2');
      P(29, 46, 6, 18, sec);
      P(22, 46, 4, 14, '#c9d4e2');
      P(38, 46, 4, 14, '#c9d4e2');
      P(15, 52, 4, 4, acc); // ice pin
      face('#1e3a7a');
      // wild ice-white hair sticking out to the sides
      ctx.fillStyle = hair;
      for (const [x1, y1, x2, y2, x3, y3] of [[14, 26, 4, 14, 22, 18], [50, 26, 60, 14, 42, 18], [22, 20, 26, 4, 34, 18], [30, 18, 40, 5, 44, 20]]) {
        ctx.beginPath();
        ctx.moveTo(x1 * s, y1 * s);
        ctx.lineTo(x2 * s, y2 * s);
        ctx.lineTo(x3 * s, y3 * s);
        ctx.closePath();
        ctx.fill();
      }
      P(19, 18, 26, 6, hair);
      // round glasses and a moustache
      ctx.strokeStyle = '#30333a';
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.arc(27.5 * s, 31.5 * s, 4.5 * s, 0, Math.PI * 2);
      ctx.moveTo(41 * s, 31.5 * s);
      ctx.arc(36.5 * s, 31.5 * s, 4.5 * s, 0, Math.PI * 2);
      ctx.moveTo(32 * s, 31 * s);
      ctx.lineTo(32 * s, 31 * s);
      ctx.stroke();
      P(31, 30, 2, 1, '#30333a');
      P(26, 37, 12, 2, hair);
      // a few snowflakes
      P(8, 10, 2, 2, '#ffffff');
      P(54, 30, 2, 2, '#ffffff');
      break;
    }
    default:
      face();
  }

  // frame inner shadow
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 2 * s;
  ctx.strokeRect(s, s, 62 * s, 62 * s);
  ctx.restore();
}

function drawMiniCat(P, C, x, y, fur, eye) {
  P(x, y + 4, 10, 8, fur);
  P(x, y, 3, 4, fur);
  P(x + 7, y, 3, 4, fur);
  P(x + 2, y + 6, 2, 2, eye);
  P(x + 6, y + 6, 2, 2, eye);
}

function drawCats(ctx, P, C, s) {
  P(0, 0, 64, 64, '#f3d9b8');
  for (let i = 0; i < 64; i += 8) P(0, i, 64, 4, 'rgba(255,255,255,0.2)');
  P(0, 48, 64, 16, '#7a3a2a');
  // Kayo (black & white tuxedo cat)
  C(20, 36, 12, '#222222');
  P(12, 18, 6, 8, '#222222');
  P(24, 18, 6, 8, '#222222');
  C(20, 30, 9, '#222222');
  P(16, 32, 8, 6, '#f6f6f6');
  P(15, 27, 3, 3, '#f7d14a');
  P(22, 27, 3, 3, '#f7d14a');
  P(16, 28, 1, 2, '#000');
  P(23, 28, 1, 2, '#000');
  P(19, 31, 2, 1, '#ff9aa8');
  // Yara (orange tabby)
  C(44, 38, 11, '#e8913a');
  P(37, 21, 6, 8, '#e8913a');
  P(47, 21, 6, 8, '#e8913a');
  C(45, 32, 9, '#e8913a');
  P(40, 24, 10, 2, '#b85e1a');
  P(38, 36, 14, 2, '#b85e1a');
  P(39, 41, 12, 2, '#b85e1a');
  P(40, 29, 3, 3, '#5fdc6f');
  P(47, 29, 3, 3, '#5fdc6f');
  P(41, 30, 1, 2, '#000');
  P(48, 30, 1, 2, '#000');
  P(44, 33, 2, 1, '#ff9aa8');
  // tails
  P(30, 44, 8, 3, '#222222');
  P(54, 40, 3, 10, '#e8913a');
  // name plates
  P(6, 54, 24, 6, '#d6a647');
  P(36, 54, 24, 6, '#d6a647');
  ctx.fillStyle = '#3a2010';
  ctx.font = `bold ${5 * s}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('KAYO', 18 * s, 59 * s);
  ctx.fillText('YARA', 48 * s, 59 * s);
}

function drawLawrence(ctx, P, C, s) {
  P(0, 0, 64, 64, '#1d2a3a');
  for (let i = 0; i < 18; i++) P((i * 23) % 64, (i * 37) % 64, 1, 1, '#8fd8ff');
  // crystal golem silhouette: Fionn evolved
  ctx.fillStyle = '#4b5f6e';
  ctx.beginPath();
  ctx.moveTo(8 * s, 64 * s);
  ctx.lineTo(14 * s, 36 * s);
  ctx.lineTo(24 * s, 26 * s);
  ctx.lineTo(40 * s, 26 * s);
  ctx.lineTo(50 * s, 36 * s);
  ctx.lineTo(56 * s, 64 * s);
  ctx.closePath();
  ctx.fill();
  C(32, 24, 12, '#6c8292');
  P(24, 22, 5, 4, '#7dffb0');
  P(35, 22, 5, 4, '#7dffb0');
  P(27, 30, 10, 2, '#2a3540');
  // crystals growing from shoulders/head
  const crystal = (x, y, h, col) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo((x - 3) * s, y * s);
    ctx.lineTo(x * s, (y - h) * s);
    ctx.lineTo((x + 3) * s, y * s);
    ctx.closePath();
    ctx.fill();
  };
  crystal(14, 38, 14, '#7dffb0');
  crystal(19, 34, 10, '#b07dff');
  crystal(50, 38, 14, '#7dffb0');
  crystal(45, 34, 10, '#5fd8ff');
  crystal(32, 14, 12, '#b07dff');
  crystal(26, 15, 7, '#7dffb0');
  crystal(38, 15, 7, '#5fd8ff');
  // shamrock badge
  C(30, 46, 2.5, '#3ad35a');
  C(34, 46, 2.5, '#3ad35a');
  C(32, 43, 2.5, '#3ad35a');
  P(31.5, 47, 1, 4, '#1f7a2a');
  ctx.fillStyle = '#d6a647';
  ctx.font = `bold ${5 * s}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('LAWRENCE', 32 * s, 61 * s);
}

function drawGrumbleclaw(ctx, P, C, s) {
  P(0, 0, 64, 64, '#2a0f1a');
  for (let i = 0; i < 64; i += 8) P(i, 0, 4, 64, 'rgba(255,60,120,0.06)');
  C(32, 36, 22, '#7a2a6a');
  C(32, 30, 18, '#93357f');
  // horns
  ctx.fillStyle = '#e8d9b0';
  ctx.beginPath();
  ctx.moveTo(16 * s, 22 * s);
  ctx.lineTo(8 * s, 4 * s);
  ctx.lineTo(22 * s, 16 * s);
  ctx.closePath();
  ctx.moveTo(48 * s, 22 * s);
  ctx.lineTo(56 * s, 4 * s);
  ctx.lineTo(42 * s, 16 * s);
  ctx.closePath();
  ctx.fill();
  // eyes
  P(20, 24, 9, 6, '#ffe040');
  P(35, 24, 9, 6, '#ffe040');
  P(24, 25, 3, 5, '#1a0010');
  P(37, 25, 3, 5, '#1a0010');
  P(18, 21, 11, 2, '#3a0a2a');
  P(35, 21, 11, 2, '#3a0a2a');
  // grinning mouth with fangs
  P(18, 38, 28, 8, '#1a0010');
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = '#fff6e0';
    ctx.beginPath();
    ctx.moveTo((19 + i * 4.5) * s, 38 * s);
    ctx.lineTo((21 + i * 4.5) * s, 42 * s);
    ctx.lineTo((23 + i * 4.5) * s, 38 * s);
    ctx.fill();
  }
  P(26, 43, 12, 3, '#ff4f7a');
  // claws
  for (let i = 0; i < 3; i++) {
    P(4 + i * 4, 52, 3, 8, '#e8d9b0');
    P(50 + i * 4, 52, 3, 8, '#e8d9b0');
  }
  // drumstick
  C(54, 46, 4, '#c87a3a');
  P(56, 48, 6, 2, '#f6eedb');
}

// ---------------------------------------------------------------
// Portrait ghosts of the bigger mansion (one boss per area)
const BOSS_PORTRAITS = {
  sonata: { bg: '#24123a', stripe: 'rgba(220,160,255,0.07)', body: '#d9a6ff', shade: '#a774d6', eye: '#3a1060', acc: 'sonata' },
  snoozewell: { bg: '#0f1a34', stripe: 'rgba(140,180,255,0.07)', body: '#9fc4ff', shade: '#6a90d0', eye: '#10204a', acc: 'snoozewell' },
  boilerbeard: { bg: '#2a1408', stripe: 'rgba(255,140,60,0.08)', body: '#ff9a5a', shade: '#c8622a', eye: '#3a1004', acc: 'boilerbeard' },
  varnish: { bg: '#2a2410', stripe: 'rgba(255,240,160,0.07)', body: '#fff0a0', shade: '#d0bc60', eye: '#2a2008', acc: 'varnish' },
  patchnotes: { bg: '#0a1a14', stripe: 'rgba(90,255,160,0.07)', body: '#9affc8', shade: '#5ac898', eye: '#0a3a1a', acc: 'patchnotes' },
  pip: { bg: '#2a1430', stripe: 'rgba(255,184,232,0.08)', body: '#ffb8e8', shade: '#d080b8', eye: '#2a1040', acc: 'pip' },
};

export const PORTRAIT_NAMES = {
  sonata: 'MADAME SONATA',
  snoozewell: 'LORD SNOOZEWELL',
  boilerbeard: 'BOILERBEARD',
  varnish: 'MASTER VARNISH',
  patchnotes: 'PROF. PATCHNOTES',
  pip: 'PIXEL PIP',
  art_moon: 'MOONRISE',
  art_sea: 'STORMY SEA',
  art_fruit: 'STILL LIFE',
  art_flowers: 'TULIPS',
  art_ship: 'GHOST SHIP',
  art_peaks: 'THE PEAKS',
  art_mansion: 'THE MANSION',
  art_windmill: 'WINDMILL',
  art_stars: 'STAR CHART',
};

function drawBossPortrait(ctx, P, C, s, d) {
  P(0, 0, 64, 64, d.bg);
  for (let i = 0; i < 64; i += 8) P(i, 0, 4, 64, d.stripe);
  C(32, 38, 22, d.shade);
  C(32, 31, 19, d.body);
  P(13, 40, 38, 14, d.body);
  for (let i = 0; i < 5; i++) C(15 + i * 8.5, 54, 4.5, d.body);
  const eyesShut = d.acc === 'snoozewell';
  if (eyesShut) {
    P(19, 28, 10, 2, d.eye);
    P(35, 28, 10, 2, d.eye);
  } else {
    P(20, 24, 8, 8, '#ffffff');
    P(36, 24, 8, 8, '#ffffff');
    P(23, 26, 4, 5, d.eye);
    P(39, 26, 4, 5, d.eye);
  }
  switch (d.acc) {
    case 'sonata': {
      // towering bun, pearl necklace, open singing mouth
      C(32, 9, 9, '#5a2a7a');
      C(32, 4, 5, '#5a2a7a');
      P(29, 0, 6, 3, '#ffd23a');
      C(32, 39, 4, '#3a1060');
      for (let i = 0; i < 7; i++) C(20 + i * 4, 47 + Math.sin(i / 6 * Math.PI) * 2, 1.6, '#f6f2ff');
      // music notes
      P(52, 12, 2, 10, '#ffd23a');
      C(51, 22, 2.5, '#ffd23a');
      P(52, 12, 6, 2, '#ffd23a');
      P(8, 18, 2, 8, '#ffd23a');
      C(7, 26, 2.2, '#ffd23a');
      break;
    }
    case 'snoozewell': {
      // floppy nightcap with pom-pom, drooling smile
      ctx.fillStyle = '#d8312e';
      ctx.beginPath();
      ctx.moveTo(14 * s, 18 * s);
      ctx.lineTo(50 * s, 18 * s);
      ctx.lineTo(58 * s, 30 * s);
      ctx.closePath();
      ctx.fill();
      P(13, 16, 38, 4, '#f6f2ea');
      C(58, 31, 3.5, '#f6f2ea');
      P(26, 38, 12, 2, d.eye);
      P(36, 40, 2, 4, '#bfe9ff');
      P(6, 6, 5, 1, '#c4d9ff');
      P(6, 6, 1, 5, '#c4d9ff');
      P(10, 9, 3, 1, '#c4d9ff');
      P(4, 14, 4, 1, '#c4d9ff');
      break;
    }
    case 'boilerbeard': {
      // bushy soot beard, bowler hat, pipe puffing steam
      P(18, 10, 28, 8, '#1c1410');
      P(14, 17, 36, 3, '#1c1410');
      C(32, 44, 13, '#3a2a20');
      P(20, 36, 24, 6, '#3a2a20');
      P(26, 37, 12, 3, '#ff6a2a');
      P(42, 40, 10, 2, '#5a3a20');
      P(50, 36, 4, 6, '#5a3a20');
      C(54, 30, 3, 'rgba(255,255,255,0.5)');
      C(57, 24, 3.5, 'rgba(255,255,255,0.35)');
      break;
    }
    case 'varnish': {
      // beret, curly moustache, paint palette
      ctx.fillStyle = '#7a1a28';
      ctx.beginPath();
      ctx.ellipse(30 * s, 13 * s, 17 * s, 6 * s, -0.15, 0, Math.PI * 2);
      ctx.fill();
      P(31, 5, 2, 3, '#7a1a28');
      P(22, 36, 20, 2, '#2a2008');
      C(21, 35, 2.5, '#2a2008');
      C(43, 35, 2.5, '#2a2008');
      ctx.fillStyle = '#b8864a';
      ctx.beginPath();
      ctx.ellipse(10 * s, 52 * s, 9 * s, 6 * s, 0.3, 0, Math.PI * 2);
      ctx.fill();
      C(6, 50, 1.6, '#d8312e');
      C(10, 48, 1.6, '#3a7aff');
      C(14, 50, 1.6, '#ffd23a');
      C(9, 55, 1.6, '#6fd36a');
      break;
    }
    case 'patchnotes': {
      // square specs, headset, and a green-screen laptop
      for (const x of [18, 34]) {
        P(x, 22, 12, 2, '#1a1a22');
        P(x, 32, 12, 2, '#1a1a22');
        P(x, 22, 2, 12, '#1a1a22');
        P(x + 10, 22, 2, 12, '#1a1a22');
      }
      P(30, 26, 4, 2, '#1a1a22');
      ctx.strokeStyle = '#2a2a34';
      ctx.lineWidth = 3 * s;
      ctx.beginPath();
      ctx.arc(32 * s, 22 * s, 17 * s, Math.PI, 0);
      ctx.stroke();
      P(11, 20, 5, 9, '#2a2a34');
      P(48, 20, 5, 9, '#2a2a34');
      P(16, 46, 32, 16, '#3a3a46');
      P(19, 48, 26, 11, '#0a1a10');
      for (let i = 0; i < 4; i++) P(21, 50 + i * 2.4, 6 + ((i * 7) % 15), 1.2, '#3aff7a');
      break;
    }
    case 'pip': {
      // striped propeller beanie and a glowing handheld
      const stripes = ['#d8312e', '#ffd21a', '#1f9fe0', '#6fd36a'];
      for (let i = 0; i < 4; i++) P(14 + i * 9, 10, 9, 8, stripes[i]);
      C(32, 10, 9, '#ffd21a');
      P(31, 2, 2, 6, '#2a2a34');
      P(22, 1, 20, 2, '#d8312e');
      C(32, 39, 3.5, '#2a1040');
      P(20, 44, 24, 18, '#c8c8d0');
      P(24, 46, 16, 9, '#9aff6a');
      P(23, 57, 6, 2, '#2a2a34');
      P(25, 55, 2, 6, '#2a2a34');
      C(37, 58, 1.8, '#d8312e');
      C(41, 56, 1.8, '#d8312e');
      break;
    }
    default:
      break;
  }
}

// decorative paintings for the walls of the bigger mansion
function drawArtwork(ctx, P, C, s, id) {
  const r = rng(id.length * 97 + id.charCodeAt(4));
  switch (id) {
    case 'art_moon': {
      P(0, 0, 64, 64, '#101a3a');
      for (let i = 0; i < 24; i++) P(r() * 64, r() * 34, 1, 1, '#e8eeff');
      C(44, 16, 8, '#f4f0d0');
      C(41, 14, 7, '#101a3a');
      P(0, 40, 64, 24, '#0a0f1a');
      for (let x = 0; x < 64; x += 6) P(x, 34 + r() * 6, 5, 30, '#0c1424');
      P(10, 28, 14, 14, '#05070c');
      P(14, 22, 6, 8, '#05070c');
      P(13, 32, 2, 3, '#ffc070');
      P(19, 32, 2, 3, '#ffc070');
      break;
    }
    case 'art_sea': {
      P(0, 0, 64, 30, '#3a4a5a');
      for (let i = 0; i < 6; i++) C(8 + i * 11, 10 + r() * 6, 7, '#26323e');
      P(0, 30, 64, 34, '#1a3a5a');
      for (let y = 32; y < 64; y += 5) for (let x = (y % 10) ? 0 : 4; x < 64; x += 9) P(x, y, 5, 1, '#8ab4d8');
      P(26, 18, 2, 14, '#3a2010');
      ctx.fillStyle = '#e8e0c8';
      ctx.beginPath();
      ctx.moveTo(28 * s, 19 * s);
      ctx.lineTo(38 * s, 28 * s);
      ctx.lineTo(28 * s, 28 * s);
      ctx.fill();
      P(20, 30, 20, 4, '#5a3018');
      break;
    }
    case 'art_fruit': {
      P(0, 0, 64, 64, '#3a2414');
      P(0, 44, 64, 20, '#5a3a20');
      ctx.fillStyle = '#c9952e';
      ctx.beginPath();
      ctx.ellipse(32 * s, 46 * s, 20 * s, 5 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      C(24, 38, 6, '#d8312e');
      C(34, 36, 7, '#ffd23a');
      C(42, 40, 5, '#6fd36a');
      C(30, 30, 4, '#7a4bd6');
      C(36, 29, 4, '#7a4bd6');
      C(33, 25, 4, '#7a4bd6');
      P(46, 22, 4, 22, '#2a5a3a');
      C(48, 20, 3, '#2a5a3a');
      break;
    }
    case 'art_flowers': {
      P(0, 0, 64, 64, '#2a3a5a');
      P(22, 40, 20, 18, '#2b5a9a');
      P(20, 38, 24, 4, '#3a6aaa');
      const cols = ['#ff4f7a', '#ffd23a', '#ff8a3a', '#f6f2ea', '#d8312e'];
      for (let i = 0; i < 7; i++) {
        const x = 18 + i * 4.5;
        const y = 14 + r() * 12;
        P(x + 1, y + 4, 1, 40 - y, '#2f6a2a');
        C(x + 1.5, y + 3, 3, cols[i % cols.length]);
      }
      break;
    }
    case 'art_ship': {
      P(0, 0, 64, 64, '#0c1a1a');
      C(14, 12, 6, '#c4f0d0');
      P(0, 44, 64, 20, '#0a2a2a');
      for (let x = 0; x < 64; x += 7) P(x, 46 + (x % 3), 5, 1, '#6ad8b0');
      P(16, 36, 32, 8, '#1a3a30');
      P(30, 10, 2, 26, '#1a3a30');
      P(20, 14, 10, 14, 'rgba(160,255,200,0.45)');
      P(32, 16, 10, 12, 'rgba(160,255,200,0.45)');
      P(24, 26, 2, 2, '#6affb0');
      P(38, 26, 2, 2, '#6affb0');
      break;
    }
    case 'art_peaks': {
      P(0, 0, 64, 64, '#5a7ab0');
      C(50, 12, 5, '#fff0c0');
      ctx.fillStyle = '#3a4a6a';
      ctx.beginPath();
      ctx.moveTo(0, 50 * s);
      ctx.lineTo(18 * s, 16 * s);
      ctx.lineTo(34 * s, 50 * s);
      ctx.moveTo(22 * s, 50 * s);
      ctx.lineTo(42 * s, 22 * s);
      ctx.lineTo(64 * s, 50 * s);
      ctx.fill();
      P(15, 18, 6, 4, '#f6f6ff');
      P(39, 24, 6, 4, '#f6f6ff');
      P(0, 50, 64, 14, '#2f6a2a');
      break;
    }
    case 'art_mansion': {
      P(0, 0, 64, 64, '#1a1430');
      C(50, 10, 6, '#f4f0d0');
      P(14, 26, 36, 26, '#0a0812');
      P(18, 14, 8, 14, '#0a0812');
      P(40, 18, 6, 10, '#0a0812');
      for (const [x, y] of [[20, 30], [28, 30], [36, 30], [44, 30], [20, 40], [44, 40]]) P(x, y, 3, 4, '#ffc070');
      P(30, 42, 4, 10, '#5a3018');
      P(0, 52, 64, 12, '#0c1a10');
      break;
    }
    case 'art_windmill': {
      P(0, 0, 64, 40, '#8ab4e8');
      P(0, 40, 64, 24, '#5a9a3a');
      for (let x = 0; x < 64; x += 8) P(x, 44 + (x % 16 ? 4 : 10), 8, 3, ['#ff4f7a', '#ffd23a', '#f6f2ea'][x % 3]);
      P(28, 20, 8, 24, '#5a3a20');
      ctx.strokeStyle = '#f6f2ea';
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.moveTo(18 * s, 10 * s);
      ctx.lineTo(46 * s, 30 * s);
      ctx.moveTo(46 * s, 10 * s);
      ctx.lineTo(18 * s, 30 * s);
      ctx.stroke();
      break;
    }
    case 'art_stars': {
      P(0, 0, 64, 64, '#0a1030');
      ctx.strokeStyle = 'rgba(200,220,255,0.35)';
      ctx.lineWidth = 1 * s;
      ctx.beginPath();
      ctx.arc(32 * s, 32 * s, 26 * s, 0, Math.PI * 2);
      ctx.arc(32 * s, 32 * s, 16 * s, 0, Math.PI * 2);
      ctx.stroke();
      const pts = [];
      for (let i = 0; i < 9; i++) pts.push([8 + r() * 48, 8 + r() * 48]);
      ctx.strokeStyle = 'rgba(255,230,140,0.7)';
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * s, y * s) : ctx.moveTo(x * s, y * s)));
      ctx.stroke();
      pts.forEach(([x, y]) => C(x, y, 1.5, '#ffe68c'));
      break;
    }
    default:
      P(0, 0, 64, 64, '#2a2a2a');
  }
}

export function makePortraitTexture(subject, size = 128) {
  const id = typeof subject === 'string' ? subject : subject.id;
  const key = 'portrait' + id + size;
  if (cache.has(key)) return cache.get(key);
  const c = canvas(size, size);
  const g = c.getContext('2d');
  drawPortrait(g, size, subject);
  const tex = toTexture(c, { nearest: true });
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  cache.set(key, tex);
  return tex;
}

// The cursed painting at the end of the run: teammate trapped inside
export function makeTrappedPaintingTexture(char, freed = false) {
  const size = 128;
  const c = canvas(size, size + 32);
  const g = c.getContext('2d');
  g.fillStyle = '#1a1020';
  g.fillRect(0, 0, size, size + 32);
  drawPortrait(g, size, char, { dim: !freed });
  if (!freed) {
    // swirling cursed overlay + bars
    g.fillStyle = 'rgba(140,60,220,0.35)';
    g.fillRect(0, 0, size, size);
    g.strokeStyle = 'rgba(220,180,255,0.6)';
    g.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.arc(64, 64, 14 + i * 12, i, i + 4.2);
      g.stroke();
    }
    g.fillStyle = 'rgba(30,20,40,0.85)';
    for (let x = 10; x < size; x += 22) g.fillRect(x, 0, 5, size);
  }
  g.fillStyle = freed ? '#22a37a' : '#7a4bd6';
  g.fillRect(0, size, size, 32);
  g.fillStyle = '#fffaf0';
  g.font = 'bold 13px monospace';
  g.textAlign = 'center';
  g.fillText(freed ? `${char.name.toUpperCase()} FREED!` : `HELP! ${char.name.toUpperCase()}`, 64, size + 21);
  const tex = toTexture(c, { nearest: true });
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

export function makeLabelTexture(text, { bg = '#d6a647', fg = '#2a1608', w = 256, h = 48, font = 'bold 26px monospace' } = {}) {
  const c = canvas(w, h);
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.strokeStyle = fg;
  g.lineWidth = 3;
  g.strokeRect(3, 3, w - 6, h - 6);
  g.fillStyle = fg;
  g.font = font;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + 1);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ---------------------------------------------------------------
// Ornate gilded frame painted around a portrait (results screen,
// wall-hung canvases, anywhere a framed portrait is wanted).
export function drawOrnateFrame(ctx, w, h, { gold = '#c9952e', dark = '#5a3a0a', plate = null } = {}) {
  const b = Math.round(Math.min(w, h) * 0.09);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  // outer bevel
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, shade(gold, 0.18));
  grad.addColorStop(0.5, gold);
  grad.addColorStop(1, shade(gold, -0.18));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, b);
  ctx.fillRect(0, h - b, w, b);
  ctx.fillRect(0, 0, b, h);
  ctx.fillRect(w - b, 0, b, h);
  // inner lip
  ctx.strokeStyle = dark;
  ctx.lineWidth = Math.max(1, b * 0.18);
  ctx.strokeRect(b - ctx.lineWidth / 2, b - ctx.lineWidth / 2, w - 2 * b + ctx.lineWidth, h - 2 * b + ctx.lineWidth);
  ctx.strokeStyle = shade(gold, 0.3);
  ctx.lineWidth = Math.max(1, b * 0.12);
  ctx.strokeRect(b * 0.35, b * 0.35, w - b * 0.7, h - b * 0.7);
  // beaded moulding
  ctx.fillStyle = shade(gold, 0.25);
  const step = Math.max(4, b * 0.7);
  for (let x = b; x < w - b; x += step) {
    ctx.beginPath();
    ctx.arc(x, b * 0.62, b * 0.12, 0, Math.PI * 2);
    ctx.arc(x, h - b * 0.62, b * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let y = b; y < h - b; y += step) {
    ctx.beginPath();
    ctx.arc(b * 0.62, y, b * 0.12, 0, Math.PI * 2);
    ctx.arc(w - b * 0.62, y, b * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }
  // corner rosettes
  for (const [cx, cy] of [[b / 2, b / 2], [w - b / 2, b / 2], [b / 2, h - b / 2], [w - b / 2, h - b / 2]]) {
    ctx.fillStyle = shade(gold, 0.15);
    ctx.beginPath();
    ctx.arc(cx, cy, b * 0.48, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.arc(cx, cy, b * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  // top crest
  ctx.fillStyle = shade(gold, 0.1);
  ctx.beginPath();
  ctx.moveTo(w / 2 - b, b * 0.1);
  ctx.quadraticCurveTo(w / 2, -b * 0.4, w / 2 + b, b * 0.1);
  ctx.lineTo(w / 2, b * 0.9);
  ctx.closePath();
  ctx.fill();
  // brass name plate
  if (plate) {
    const pw = w * 0.56;
    const ph = b * 0.95;
    const px = (w - pw) / 2;
    const py = h - b + (b - ph) / 2;
    ctx.fillStyle = '#e8c76a';
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = dark;
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);
    ctx.fillStyle = '#2a1608';
    ctx.font = `bold ${Math.floor(ph * 0.7)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(plate, w / 2, py + ph / 2 + 1);
  }
  ctx.restore();
  return b;
}

export function drawFramedPortrait(ctx, size, subject, opts = {}) {
  const b = Math.round(size * 0.09);
  ctx.save();
  ctx.translate(b, b);
  drawPortrait(ctx, size - b * 2, subject, opts);
  ctx.restore();
  const id = typeof subject === 'string' ? subject : subject.id;
  const label = typeof subject === 'string' ? subject.replace('_', ' & ').toUpperCase() : subject.name.toUpperCase();
  drawOrnateFrame(ctx, size, size, { plate: opts.plate === false ? null : label, gold: id === 'lawrence' ? '#9aa8b8' : id === 'grumbleclaw' ? '#8a4a7a' : '#c9952e' });
}

// Portrait Gallery frame: gold / silver / bronze moulding by catch quality,
// or a dark, empty frame with a "?" silhouette for ghosts not yet caught
const TIER_FRAMES = {
  gold: { gold: '#e8b830', dark: '#5a3a0a' },
  silver: { gold: '#b8c4d0', dark: '#3a4450' },
  bronze: { gold: '#b0703a', dark: '#3a2010' },
  none: { gold: '#3a3440', dark: '#141018' },
};

export function drawTierPortrait(ctx, size, id, tier = null, plate = null) {
  const b = Math.round(size * 0.09);
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.translate(b, b);
  const inner = size - b * 2;
  drawPortrait(ctx, inner, id);
  if (!tier) {
    // uncaught: a dark silhouette behind smoky glass
    ctx.fillStyle = 'rgba(8,6,14,0.9)';
    ctx.fillRect(0, 0, inner, inner);
    ctx.fillStyle = '#5a5070';
    ctx.font = `bold ${Math.floor(inner * 0.5)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', inner / 2, inner / 2 + 2);
  }
  ctx.restore();
  const f = TIER_FRAMES[tier || 'none'];
  drawOrnateFrame(ctx, size, size, { gold: f.gold, dark: f.dark, plate });
  if (tier === 'gold') {
    // a little gleam across the gold moulding
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#fff6c0';
    ctx.fillRect(b * 0.4, b * 0.25, size * 0.3, Math.max(1, b * 0.15));
    ctx.restore();
  }
}

export function makeFramedPortraitTexture(subject, size = 160) {
  const id = typeof subject === 'string' ? subject : subject.id;
  const key = 'framed' + id + size;
  if (cache.has(key)) return cache.get(key);
  const c = canvas(size, size);
  drawFramedPortrait(c.getContext('2d'), size, subject);
  const tex = toTexture(c, { nearest: true });
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  cache.set(key, tex);
  return tex;
}

// ===================================================================
// MENU ART (title / data select / options / pause / rank ending)
// ===================================================================

// A 4:5 gallery portrait for a save slot. file = null → empty "NO DATA" canvas
export function drawSlotPortrait(ctx, w, h, { char = null, label = 'DATA 1', empty = false } = {}) {
  ctx.clearRect(0, 0, w, h);
  const b = Math.round(Math.min(w, h) * 0.09);
  // canvas backing
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#2a2236');
  bg.addColorStop(1, '#120e1a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  const iw = w - b * 2;
  const ih = h - b * 2;
  if (!empty && char) {
    ctx.save();
    ctx.translate(b, b + (ih - iw) / 2);
    drawPortrait(ctx, iw, char);
    ctx.restore();
    // varnish darkening at top/bottom of the tall canvas
    ctx.fillStyle = char.css.bg;
    ctx.fillRect(b, b, iw, (ih - iw) / 2);
    ctx.fillRect(b, b + (ih + iw) / 2, iw, (ih - iw) / 2);
    const vg = ctx.createLinearGradient(0, b, 0, h - b);
    vg.addColorStop(0, 'rgba(40,20,5,0.35)');
    vg.addColorStop(0.5, 'rgba(40,20,5,0)');
    vg.addColorStop(1, 'rgba(40,20,5,0.45)');
    ctx.fillStyle = vg;
    ctx.fillRect(b, b, iw, ih);
  } else {
    // empty canvas: faint ghost silhouette peeking out of the dark
    ctx.fillStyle = '#0d0a12';
    ctx.fillRect(b, b, iw, ih);
    const cx = w / 2;
    const cy = h / 2;
    const r = iw * 0.26;
    ctx.fillStyle = 'rgba(207,233,255,0.12)';
    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.2, r, Math.PI, 0);
    ctx.lineTo(cx + r, cy + r * 0.9);
    for (let i = 0; i < 4; i++) {
      const x = cx + r - (i + 0.5) * (r * 2 / 4);
      ctx.quadraticCurveTo(x + r * 0.25, cy + r * 1.25, x, cy + r * 0.9);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,240,170,0.35)';
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.35, cy - r * 0.25, r * 0.12, r * 0.18, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + r * 0.35, cy - r * 0.25, r * 0.12, r * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(243,231,196,0.45)';
    ctx.font = `bold ${Math.round(w * 0.085)}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.fillText('NO DATA', cx, cy + r * 1.9);
  }
  drawOrnateFrame(ctx, w, h, { plate: label });
}

// "Options" portrait: the Poltergust & Game Boy Horror on the lab bench
export function drawOptionsPortrait(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
  const b = Math.round(Math.min(w, h) * 0.09);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#3a4a6a');
  g.addColorStop(1, '#1a2238');
  ctx.fillStyle = g;
  ctx.fillRect(b, b, w - 2 * b, h - 2 * b);
  const s = (w - 2 * b) / 64;
  const P = (x, y, ww, hh, c) => {
    ctx.fillStyle = c;
    ctx.fillRect(b + x * s, b + y * s * ((h - 2 * b) / (w - 2 * b)), ww * s, hh * s * ((h - 2 * b) / (w - 2 * b)));
  };
  // shelves + beakers
  P(0, 14, 64, 2, '#5a3418');
  P(6, 6, 6, 8, '#7dffb0');
  P(16, 9, 5, 5, '#ff7ad9');
  P(48, 5, 8, 9, '#5fd8ff');
  // bench
  P(0, 46, 64, 18, '#4a2a14');
  P(0, 46, 64, 2, '#7a4a24');
  // Poltergust tank
  P(8, 22, 16, 24, '#6c7a5a');
  P(8, 22, 16, 3, '#9aa88a');
  P(13, 30, 6, 6, '#4dff7a');
  P(22, 26, 12, 3, '#3b4d3a');
  P(33, 24, 6, 7, '#22252a');
  // Game Boy Horror
  P(38, 26, 20, 20, '#4c5a8c');
  P(40, 28, 16, 10, '#0f380f');
  P(42, 30, 6, 2, '#8bac0f');
  P(46, 33, 8, 3, '#8bac0f');
  P(52, 40, 4, 4, '#b2305a');
  P(41, 40, 6, 2, '#22252a');
  // gear
  ctx.save();
  ctx.translate(b + 30 * s, b + 12 * s * ((h - 2 * b) / (w - 2 * b)));
  ctx.fillStyle = '#d9b45a';
  for (let i = 0; i < 8; i++) {
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-1.5 * s, -7 * s, 3 * s, 3 * s);
  }
  ctx.beginPath();
  ctx.arc(0, 0, 5 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a4a6a';
  ctx.beginPath();
  ctx.arc(0, 0, 2 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  drawOrnateFrame(ctx, w, h, { plate: 'OPTIONS', gold: '#c9952e' });
}

// friendly ghost for menus (pause frame, brightness check)
export function drawMenuGhost(ctx, cx, cy, r, { body = '#cfe9ff', eye = '#1c1830', alpha = 1, flip = false } = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);
  if (flip) ctx.scale(-1, 1);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(0, -r * 0.2, r, Math.PI, 0);
  ctx.lineTo(r, r * 0.8);
  for (let i = 0; i < 4; i++) {
    const x = r - (i + 0.5) * (r / 2);
    ctx.quadraticCurveTo(x + r * 0.22, r * 1.2, x - r * 0.25, r * 0.8);
  }
  ctx.closePath();
  ctx.fill();
  // arms
  ctx.beginPath();
  ctx.ellipse(-r * 1.05, r * 0.15, r * 0.25, r * 0.16, -0.5, 0, Math.PI * 2);
  ctx.ellipse(r * 1.05, r * 0.15, r * 0.25, r * 0.16, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = eye;
  ctx.beginPath();
  ctx.ellipse(-r * 0.32, -r * 0.3, r * 0.12, r * 0.2, 0, 0, Math.PI * 2);
  ctx.ellipse(r * 0.32, -r * 0.3, r * 0.12, r * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, r * 0.15, r * 0.3, r * 0.2, 0, 0, Math.PI);
  ctx.fill();
  ctx.fillStyle = '#ff6b8a';
  ctx.beginPath();
  ctx.ellipse(r * 0.08, r * 0.28, r * 0.12, r * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// The ending painting: the new mansion your treasure paid for.
// S: grand hotel with fountains · A: 3-storey mansion · B: cosy house · C: a tent
export function drawRankMansion(ctx, w, h, rank = 'C', heroName = 'NATHAN') {
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  const day = rank !== 'C';
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  if (day) {
    sky.addColorStop(0, rank === 'S' ? '#ffd9a0' : '#8fc8ff');
    sky.addColorStop(0.65, rank === 'S' ? '#ffb38a' : '#d8f0ff');
  } else {
    sky.addColorStop(0, '#1a2050');
    sky.addColorStop(0.65, '#4a3a70');
  }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  // sun or moon
  ctx.fillStyle = day ? 'rgba(255,250,210,0.95)' : '#f4f0d0';
  ctx.beginPath();
  ctx.arc(w * 0.82, h * 0.2, h * (day ? 0.09 : 0.06), 0, Math.PI * 2);
  ctx.fill();
  // clouds / stars
  if (day) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (const [x, y, s] of [[0.15, 0.18, 1], [0.4, 0.1, 0.7], [0.62, 0.22, 0.85]]) {
      ctx.beginPath();
      ctx.ellipse(w * x, h * y, w * 0.06 * s, h * 0.035 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(w * x + w * 0.04 * s, h * y - h * 0.02, w * 0.045 * s, h * 0.035 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 30; i++) ctx.fillRect((i * 97) % w, (i * 53) % (h * 0.55), 2, 2);
  }
  // hill
  ctx.fillStyle = day ? '#5aa84a' : '#22381e';
  ctx.beginPath();
  ctx.moveTo(0, h * 0.78);
  ctx.quadraticCurveTo(w * 0.5, h * 0.58, w, h * 0.78);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = day ? '#3f8a36' : '#182a15';
  ctx.fillRect(0, h * 0.86, w, h * 0.14);

  const base = h * 0.7;
  const cx = w / 2;
  const box = (x, y, bw, bh, c) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, bw, bh);
  };
  const roof = (x, y, bw, rh, c) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(x - bw * 0.06, y);
    ctx.lineTo(x + bw / 2, y - rh);
    ctx.lineTo(x + bw * 1.06, y);
    ctx.closePath();
    ctx.fill();
  };
  const windows = (x, y, bw, bh, rows, cols, c = '#ffe68a') => {
    const gw = bw / cols;
    const gh = bh / rows;
    for (let r = 0; r < rows; r++) {
      for (let k = 0; k < cols; k++) {
        box(x + k * gw + gw * 0.3, y + r * gh + gh * 0.25, gw * 0.4, gh * 0.45, c);
        box(x + k * gw + gw * 0.3, y + r * gh + gh * 0.25 + gh * 0.2, gw * 0.4, gh * 0.04, 'rgba(0,0,0,0.25)');
      }
    }
  };
  const wall = '#f3e7c4';
  const trim = '#c9952e';
  const green = '#2e7d3a';

  if (rank === 'S') {
    const bw = w * 0.56;
    const bh = h * 0.42;
    const x = cx - bw / 2;
    box(x, base - bh, bw, bh, wall);
    windows(x, base - bh, bw, bh, 4, 9);
    box(x, base - bh, bw, h * 0.02, trim);
    // wings
    box(x - w * 0.12, base - bh * 0.62, w * 0.12, bh * 0.62, wall);
    box(x + bw, base - bh * 0.62, w * 0.12, bh * 0.62, wall);
    windows(x - w * 0.12, base - bh * 0.62, w * 0.12, bh * 0.62, 2, 2);
    windows(x + bw, base - bh * 0.62, w * 0.12, bh * 0.62, 2, 2);
    roof(x - w * 0.12, base - bh * 0.62, w * 0.12, h * 0.07, green);
    roof(x + bw, base - bh * 0.62, w * 0.12, h * 0.07, green);
    // central tower with dome
    box(cx - w * 0.07, base - bh - h * 0.14, w * 0.14, h * 0.14, wall);
    windows(cx - w * 0.07, base - bh - h * 0.14, w * 0.14, h * 0.14, 1, 2);
    ctx.fillStyle = trim;
    ctx.beginPath();
    ctx.arc(cx, base - bh - h * 0.14, w * 0.075, Math.PI, 0);
    ctx.fill();
    box(cx - 2, base - bh - h * 0.26, 4, h * 0.05, trim);
    // fountains
    for (const fx of [cx - w * 0.36, cx + w * 0.36]) {
      ctx.fillStyle = '#9fd8ff';
      ctx.beginPath();
      ctx.ellipse(fx, base + h * 0.09, w * 0.07, h * 0.025, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(200,240,255,0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(fx, base + h * 0.09);
      ctx.quadraticCurveTo(fx - w * 0.03, base - h * 0.06, fx - w * 0.05, base + h * 0.07);
      ctx.moveTo(fx, base + h * 0.09);
      ctx.quadraticCurveTo(fx + w * 0.03, base - h * 0.06, fx + w * 0.05, base + h * 0.07);
      ctx.stroke();
    }
    // door
    box(cx - w * 0.035, base - h * 0.1, w * 0.07, h * 0.1, '#6a3a1a');
  } else if (rank === 'A') {
    const bw = w * 0.46;
    const bh = h * 0.34;
    const x = cx - bw / 2;
    box(x, base - bh, bw, bh, wall);
    windows(x, base - bh, bw, bh, 3, 6);
    roof(x, base - bh, bw, h * 0.12, green);
    box(x + bw * 0.78, base - bh - h * 0.13, bw * 0.08, h * 0.08, '#8a4a2a');
    box(cx - w * 0.06, base - bh - h * 0.04, w * 0.12, h * 0.04, wall);
    box(cx - w * 0.03, base - h * 0.09, w * 0.06, h * 0.09, '#6a3a1a');
    box(x - w * 0.02, base - h * 0.01, bw + w * 0.04, h * 0.015, trim);
  } else if (rank === 'B') {
    const bw = w * 0.32;
    const bh = h * 0.2;
    const x = cx - bw / 2;
    box(x, base - bh, bw, bh, wall);
    windows(x, base - bh, bw, bh, 2, 4);
    roof(x, base - bh, bw, h * 0.12, '#b8541c');
    box(x + bw * 0.12, base - bh - h * 0.12, bw * 0.08, h * 0.07, '#8a4a2a');
    box(cx - w * 0.025, base - h * 0.08, w * 0.05, h * 0.08, '#6a3a1a');
  } else {
    // C: a humble tent on the hill where the mansion stood
    ctx.fillStyle = '#c9a46a';
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.11, base);
    ctx.lineTo(cx, base - h * 0.16);
    ctx.lineTo(cx + w * 0.11, base);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#3a2410';
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.025, base);
    ctx.lineTo(cx, base - h * 0.1);
    ctx.lineTo(cx + w * 0.025, base);
    ctx.closePath();
    ctx.fill();
    // campfire
    ctx.fillStyle = '#ff9a30';
    ctx.beginPath();
    ctx.moveTo(cx + w * 0.17, base + h * 0.02);
    ctx.quadraticCurveTo(cx + w * 0.185, base - h * 0.06, cx + w * 0.2, base + h * 0.02);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,170,60,0.25)';
    ctx.beginPath();
    ctx.arc(cx + w * 0.185, base, h * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
  // nameplate on the lawn
  ctx.fillStyle = '#5a3418';
  ctx.fillRect(w * 0.06, h * 0.82, w * 0.26, h * 0.1);
  ctx.fillStyle = '#d9b45a';
  ctx.font = `bold ${Math.round(h * 0.045)}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.fillText(`${heroName.toUpperCase()}'S`, w * 0.19, h * 0.87);
  ctx.fillText('MANSION', w * 0.19, h * 0.91);
  ctx.restore();
}

export const RANK_MESSAGES = {
  S: 'Congratulations! Your mansion is complete!',
  A: "Welcome to {hero}'s NEW mansion!",
  B: "Welcome to {hero}'s NEW mansion!",
  C: 'The haunted mansion disappeared without a trace...',
};
