import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';

// Procedural canvas textures, so every surface has grain, speckle or stripes instead of flat colour.
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function make(w, h, draw, repeat = [1, 1], srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 8;
  return t;
}
const shade = (hex, k) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
};

export const TEX = {
  // planks run along the texture's V axis (the long direction of a lane or deck)
  wood(base = '#d9a066', planks = 6, repeat = [1, 1], seed = 3) {
    return make(512, 512, (g, w, h) => {
      const r = rng(seed), pw = w / planks;
      for (let i = 0; i < planks; i++) {
        g.fillStyle = shade(base, 0.86 + r() * 0.24); g.fillRect(i * pw, 0, pw, h);
        g.strokeStyle = shade(base, 0.7); g.globalAlpha = 0.35; g.lineWidth = 1.2;
        for (let k = 0; k < 9; k++) {
          const x0 = i * pw + r() * pw, a = 2 + r() * 5, f = 0.01 + r() * 0.03;
          g.beginPath(); for (let y = 0; y <= h; y += 8) g.lineTo(x0 + Math.sin(y * f + k) * a, y); g.stroke();
        }
        g.globalAlpha = 0.5; g.fillStyle = shade(base, 0.55); g.fillRect(i * pw, 0, 2, h);
        const cut = r() * h; g.fillRect(i * pw, cut, pw, 2);
        g.globalAlpha = 1;
      }
    }, repeat);
  },
  sand(repeat = [30, 30]) {
    return make(512, 512, (g, w, h) => {
      const r = rng(11); g.fillStyle = '#f3dcaa'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 9000; i++) { const v = r(); g.fillStyle = v < 0.5 ? 'rgba(200,160,100,.25)' : v < 0.85 ? 'rgba(255,248,225,.45)' : 'rgba(150,110,70,.3)'; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); }
      g.globalAlpha = 0.08; g.strokeStyle = '#a77d4a'; g.lineWidth = 3;
      for (let k = 0; k < 14; k++) { const y0 = r() * h; g.beginPath(); for (let x = 0; x <= w; x += 16) g.lineTo(x, y0 + Math.sin(x * 0.03 + k) * 8); g.stroke(); }
    }, repeat);
  },
  grass(stripes = 8, repeat = [1, 1], a = '#6cc957', b = '#5bb548') {
    return make(512, 512, (g, w, h) => {
      const r = rng(7);
      for (let i = 0; i < stripes; i++) { g.fillStyle = i % 2 ? a : b; g.fillRect(0, (i * h) / stripes, w, h / stripes + 1); }
      for (let i = 0; i < 7000; i++) { g.fillStyle = r() < 0.5 ? 'rgba(30,90,30,.18)' : 'rgba(220,255,180,.16)'; g.fillRect(r() * w, r() * h, 1, 2 + r() * 3); }
    }, repeat);
  },
  straw() {
    return make(256, 256, (g, w, h) => {
      const r = rng(5); g.fillStyle = '#e4bd5f'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 1600; i++) { g.strokeStyle = r() < 0.5 ? 'rgba(160,110,40,.5)' : 'rgba(255,235,160,.6)'; g.lineWidth = 1.5; const x = r() * w, y = r() * h, a = r() * Math.PI; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 14, y + Math.sin(a) * 14); g.stroke(); }
    });
  },
  tiles(repeat = [6, 6]) {
    return make(256, 256, (g, w, h) => {
      const r = rng(9); g.fillStyle = '#c98a62'; g.fillRect(0, 0, w, h);
      for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { g.fillStyle = shade('#e39a6c', 0.9 + r() * 0.2); g.fillRect(x * 128 + 4, y * 128 + 4, 120, 120); }
      for (let i = 0; i < 900; i++) { g.fillStyle = 'rgba(120,60,30,.15)'; g.fillRect(r() * w, r() * h, 2, 2); }
    }, repeat);
  },
  thatch() {
    return make(256, 256, (g, w, h) => {
      const r = rng(13); g.fillStyle = '#c9a25a'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 1400; i++) { g.strokeStyle = r() < 0.5 ? 'rgba(130,90,40,.55)' : 'rgba(240,210,140,.5)'; g.lineWidth = 2; const x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 6, y + 22); g.stroke(); }
    });
  },
  label(text, bg = '#ffc93c', fg = '#123247', w = 1024, h = 256) {
    return make(w, h, (g) => {
      g.fillStyle = bg; g.fillRect(0, 0, w, h);
      g.strokeStyle = fg; g.lineWidth = 16; g.strokeRect(8, 8, w - 16, h - 16);
      g.fillStyle = fg; g.font = `900 ${h * 0.52}px ui-rounded, "Arial Rounded MT Bold", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(text, w / 2, h / 2 + 6);
    });
  },
  glow(color = '255,240,200') {
    return make(128, 128, (g, w) => {
      const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      gr.addColorStop(0, `rgba(${color},1)`); gr.addColorStop(0.35, `rgba(${color},.45)`); gr.addColorStop(1, `rgba(${color},0)`);
      g.fillStyle = gr; g.fillRect(0, 0, w, w);
    });
  },
};
