import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { buildHeroModel } from './models.js?v=20261126a';
import { buildWorld } from './world.js?v=20261126a';
import { createStructure } from './units.js?v=20261126a';
import { HEROES } from './heroes.js?v=20261126a';

// Menu artwork, generated once and cached as data URLs: hero splash art (themed
// painted backdrop + a posed render of the model), headshot tiles, and map previews.

let R = null;
function renderer() {
  if (R) return R;
  R = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  R.setPixelRatio(1);
  R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
  R.outputColorSpace = THREE.SRGBColorSpace;
  return R;
}
const css = c => '#' + c.toString(16).padStart(6, '0');
const rgba = (c, a) => `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${a})`;

// ---------- posing ----------
// Each splash gets its own stance: body turn, gun arm angle, off-arm and a bit of lean.
const POSE = {
  vanguard: { turn: -0.35, arm: -1.2, lean: 0.04, cam: [-1.1, 0.75, -3.5] },
  striker: { turn: 0.55, arm: -1.9, lean: -0.12, cam: [-1.3, 0.9, -3.4], hop: 0.15 },
  ember: { turn: -0.5, arm: -2.5, lean: 0.06, cam: [-1.0, 0.7, -3.6] },
  warden: { turn: 0.3, arm: -0.4, lean: 0, cam: [-0.9, 1.0, -3.7] },
  thicket: { turn: -0.25, arm: -1.4, lean: 0.05, cam: [-1.2, 0.8, -3.5] },
  ratchet: { turn: 0.45, arm: -1.0, lean: -0.05, cam: [-1.1, 0.75, -3.5] },
  mirage: { turn: -0.6, arm: -2.8, lean: -0.08, cam: [-1.2, 0.85, -3.5], hop: 0.08 },
  avalanche: { turn: 0.25, arm: -1.6, lean: 0.08, cam: [-1.3, 0.7, -3.9] },
  tempo: { turn: 0.4, arm: -1.5, lean: -0.06, cam: [-1.2, 0.8, -3.5], hop: 0.06 },
  kestrel: { turn: -0.4, arm: -1.3, lean: 0.05, cam: [-1.1, 0.85, -3.6], hop: 0.12 },
  croc: { turn: 0.5, arm: -1.2, lean: -0.04, cam: [-1.3, 0.8, -3.6], hop: 0.05 },
  cavalier: { turn: -0.55, arm: -1.4, lean: 0.03, cam: [-1.6, 0.7, -3.9], hop: 0.08 },
  slime: { turn: -0.4, arm: -1.2, lean: 0.06, cam: [-1.3, 0.25, -3.5] },
  brawler: { turn: -0.6, arm: -1.6, lean: -0.08, cam: [-1.4, 0.35, -3.4] },
  chipmunk: { turn: -0.45, arm: -1.3, lean: 0.02, cam: [-1.5, 0.45, -3.8] },
  elf: { turn: -0.55, arm: -1.3, lean: 0.04, cam: [-1.2, 0.8, -3.5], hop: 0.04 },
  dancer: { turn: 0.5, arm: -2.4, lean: -0.1, cam: [-1.2, 0.85, -3.5], hop: 0.12 },
  mole: { turn: -0.4, arm: -1.1, lean: 0.03, cam: [-1.4, 0.6, -3.7] },
  medic: { turn: 0.45, arm: -1.2, lean: -0.03, cam: [-1.2, 0.8, -3.5] },
  spark: { turn: -0.5, arm: -2.0, lean: 0.06, cam: [-1.2, 0.8, -3.5], hop: 0.1 },
  builder: { turn: 0.4, arm: -1.1, lean: 0.05, cam: [-1.5, 0.6, -3.9] },
  wellington: { turn: 0.45, arm: -1.2, lean: -0.04, cam: [-1.4, 0.55, -3.8] },
  shepherd: { turn: -0.45, arm: -1.3, lean: 0.04, cam: [-1.2, 0.8, -3.5] },
  microwave: { turn: 0.5, arm: -1.1, lean: 0, cam: [-1.5, 0.45, -3.8] },
};

function heroScene(def, t = 0.6) {
  const sc = new THREE.Scene();
  sc.add(new THREE.HemisphereLight(0xffffff, 0xd9a77a, 1.9));
  const key = new THREE.DirectionalLight(0xfff2dc, 2.6); key.position.set(-4, 6, -5); sc.add(key);
  const rim = new THREE.DirectionalLight(def.color, 2.2); rim.position.set(3, 3, 4); sc.add(rim);
  const m = buildHeroModel(def, 0x2f5bff);
  m.anim(0.016, 0, t);
  for (const e of m.P?.eyes || []) e.scale.y = 1;           // a portrait is one frame, so never catch a hero mid-blink
  const p = POSE[def.id];
  m.root.rotation.y = p.turn; m.root.rotation.z = p.lean; m.root.position.y = p.hop || 0;
  if (m.P) m.P.head.rotation.y = -p.turn * 0.45;          // rigged heroes keep their two-handed grip and look at the camera
  else m.arms[0].rotation.x = p.arm;
  if (m.legs) { m.legs[0].rotation.x = 0.25; m.legs[1].rotation.x = -0.2; }
  sc.add(m.root);
  return { sc, m, p };
}

function renderTo(sc, cam, w, h) {
  const r = renderer();
  r.setSize(w, h, false);
  r.setClearColor(0x000000, 0);
  r.render(sc, cam);
  return r.domElement;
}

// ---------- splash backdrops ----------
function burst(g, w, h, cx, cy, n, c1, c2) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = i % 2 ? c1 : c2;
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
    g.beginPath(); g.moveTo(cx, cy);
    g.lineTo(cx + Math.cos(a0) * w * 2, cy + Math.sin(a0) * w * 2);
    g.lineTo(cx + Math.cos(a1) * w * 2, cy + Math.sin(a1) * w * 2); g.fill();
  }
}
function halftone(g, w, h, color, from = 0.55) {
  g.fillStyle = color;
  for (let y = h * from; y < h; y += 14) for (let x = (y / 14 % 2) * 7; x < w; x += 14) {
    const r = ((y - h * from) / (h * (1 - from))) * 4.5;
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
}
function gear(g, x, y, r, teeth) {
  g.beginPath();
  for (let i = 0; i < teeth * 2; i++) {
    const a = (i / (teeth * 2)) * Math.PI * 2, rr = i % 2 ? r : r * 1.22;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath(); g.fill();
  g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(x, y, r * 0.4, 0, 7); g.fill();
  g.globalCompositeOperation = 'source-over';
}
function flake(g, x, y, r) {
  g.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2;
    g.moveTo(x, y); g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    g.moveTo(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55); g.lineTo(x + Math.cos(a + 0.5) * r * 0.75, y + Math.sin(a + 0.5) * r * 0.75);
  }
  g.stroke();
}

const MOTIF = {
  vanguard(g, w, h, p) {                       // harbour waves at dusk
    for (let i = 0; i < 9; i++) {
      g.fillStyle = i % 2 ? rgba(p.main, 0.55) : rgba(0xffffff, 0.35);
      g.beginPath(); g.moveTo(0, h);
      const y0 = h * 0.42 + i * 52;
      for (let x = 0; x <= w; x += 10) g.lineTo(x, y0 + Math.sin(x / 50 + i) * 16);
      g.lineTo(w, h); g.fill();
    }
    g.strokeStyle = rgba(p.trim, 0.6); g.lineWidth = 14;
    g.beginPath(); g.arc(w * 0.8, h * 0.18, 70, 0.2, Math.PI - 0.2); g.stroke();
  },
  striker(g, w, h, p) {                        // speed lines
    for (let i = 0; i < 46; i++) {
      g.strokeStyle = i % 3 ? rgba(0xffffff, 0.45) : rgba(p.trim, 0.7); g.lineWidth = 2 + Math.random() * 10;
      const y = Math.random() * h, x = Math.random() * w;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x - 260 - Math.random() * 200, y + 90); g.stroke();
    }
  },
  ember(g, w, h, p) {                          // fireworks
    const cols = [0xff4fa3, 0xffd23c, 0x7af0ff, 0xffffff, 0xff8a3c];
    for (let k = 0; k < 8; k++) {
      const x = Math.random() * w, y = Math.random() * h * 0.6, r = 40 + Math.random() * 90;
      g.strokeStyle = rgba(cols[k % 5], 0.8); g.lineWidth = 3;
      for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; g.beginPath(); g.moveTo(x + Math.cos(a) * r * 0.3, y + Math.sin(a) * r * 0.3); g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); g.stroke(); }
    }
  },
  warden(g, w, h, p) {                         // light from above, stars
    const grd = g.createLinearGradient(w / 2, 0, w / 2, h);
    grd.addColorStop(0, rgba(p.trim, 0.85)); grd.addColorStop(1, rgba(p.trim, 0));
    g.fillStyle = grd;
    for (let i = 0; i < 7; i++) { g.beginPath(); g.moveTo(w / 2 + (i - 3) * 30, -10); g.lineTo(w / 2 + (i - 3) * 150 - 40, h); g.lineTo(w / 2 + (i - 3) * 150 + 40, h); g.fill(); }
    g.fillStyle = '#fff';
    for (let i = 0; i < 60; i++) { g.beginPath(); g.arc(Math.random() * w, Math.random() * h * 0.7, Math.random() * 2.5, 0, 7); g.fill(); }
  },
  thicket(g, w, h, p) {                        // leaves and blossoms
    for (let i = 0; i < 70; i++) {
      g.save(); g.translate(Math.random() * w, Math.random() * h); g.rotate(Math.random() * 6);
      g.fillStyle = i % 7 === 0 ? 'rgba(255,95,143,.8)' : rgba(i % 2 ? 0x8cd65a : 0x3b6b2f, 0.6);
      g.beginPath(); g.ellipse(0, 0, 34, 12, 0, 0, 7); g.fill(); g.restore();
    }
  },
  ratchet(g, w, h, p) {                        // gears
    for (let i = 0; i < 9; i++) {
      g.fillStyle = i % 2 ? rgba(p.trim, 0.55) : rgba(0xffffff, 0.3);
      gear(g, Math.random() * w, Math.random() * h, 30 + Math.random() * 80, 8 + (i % 4) * 2);
    }
  },
  mirage(g, w, h, p) {                         // stage curtains and spotlight
    for (let i = 0; i < 16; i++) {
      g.fillStyle = i % 2 ? rgba(0x8e1f4f, 0.85) : rgba(0xb5326b, 0.85);
      const x = i < 8 ? i * 22 : w - (i - 7) * 22;
      g.beginPath(); g.moveTo(x, 0); g.quadraticCurveTo(x + (i < 8 ? 40 : -40), h / 2, x, h); g.lineTo(x + 22, h); g.lineTo(x + 22, 0); g.fill();
    }
    const sp = g.createRadialGradient(w / 2, h * 0.55, 30, w / 2, h * 0.55, w * 0.55);
    sp.addColorStop(0, 'rgba(255,240,200,.75)'); sp.addColorStop(1, 'rgba(255,240,200,0)');
    g.fillStyle = sp; g.fillRect(0, 0, w, h);
    g.fillStyle = rgba(p.trim, 0.9);
    for (let i = 0; i < 10; i++) { const x = 80 + Math.random() * (w - 160), y = Math.random() * h * 0.5, s = 10 + Math.random() * 12; g.beginPath(); g.moveTo(x, y - s); g.lineTo(x + s * 0.7, y); g.lineTo(x, y + s); g.lineTo(x - s * 0.7, y); g.fill(); }
  },
  avalanche(g, w, h, p) {                      // peaks and snowflakes
    g.fillStyle = 'rgba(255,255,255,.55)';
    for (let i = 0; i < 4; i++) { const x = i * w / 3 - 60; g.beginPath(); g.moveTo(x, h * 0.78); g.lineTo(x + 200, h * 0.32 + i % 2 * 60); g.lineTo(x + 400, h * 0.78); g.fill(); }
    g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 3;
    for (let i = 0; i < 26; i++) flake(g, Math.random() * w, Math.random() * h, 8 + Math.random() * 18);
  },
  tempo(g, w, h, p) {                          // equaliser bars and spinning vinyl
    for (let i = 0; i < 22; i++) {
      const bh = (0.2 + Math.abs(Math.sin(i * 1.7)) * 0.6) * h * 0.7, x = i * (w / 22);
      g.fillStyle = i % 3 ? rgba(p.trim, 0.55) : rgba(0xffffff, 0.45);
      for (let y = h - 30; y > h - 30 - bh; y -= 26) g.fillRect(x + 6, y - 18, w / 22 - 12, 18);
    }
    for (const [x, y, r] of [[w * 0.16, h * 0.22, 120], [w * 0.86, h * 0.3, 90]]) {
      g.fillStyle = rgba(0x1d2340, 0.55); g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
      g.strokeStyle = rgba(0xffffff, 0.18); g.lineWidth = 2;
      for (let k = 0.45; k < 1; k += 0.1) { g.beginPath(); g.arc(x, y, r * k, 0, 7); g.stroke(); }
      g.fillStyle = rgba(p.trim, 0.9); g.beginPath(); g.arc(x, y, r * 0.28, 0, 7); g.fill();
    }
  },
  croc(g, w, h, p) {                           // bayou: reeds, lily pads and fireflies
    g.fillStyle = rgba(0x1d3a2a, 0.45); g.fillRect(0, h * 0.62, w, h * 0.38);
    g.strokeStyle = rgba(0xffffff, 0.25); g.lineWidth = 3;
    for (let i = 0; i < 7; i++) { const y = h * 0.68 + i * 22; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= w; x += 40) g.lineTo(x, y + Math.sin(x * 0.03 + i) * 5); g.stroke(); }
    for (let i = 0; i < 8; i++) {
      const x = 40 + Math.random() * (w - 80), y = h * 0.7 + Math.random() * h * 0.25, r = 22 + Math.random() * 20;
      g.fillStyle = rgba(p.main, 0.75); g.beginPath(); g.ellipse(x, y, r, r * 0.4, 0, 0.35, Math.PI * 2); g.lineTo(x, y); g.fill();
    }
    g.strokeStyle = rgba(p.dark, 0.7); g.lineWidth = 6; g.lineCap = 'round';
    for (let i = 0; i < 18; i++) { const x = (i < 9 ? i * 22 : w - (i - 9) * 22), t = h * (0.2 + Math.random() * 0.25); g.beginPath(); g.moveTo(x, h * 0.72); g.quadraticCurveTo(x + 8, (t + h * 0.72) / 2, x + 4, t); g.stroke(); }
    g.fillStyle = rgba(0xfff28a, 0.9);
    for (let i = 0; i < 24; i++) { g.beginPath(); g.arc(Math.random() * w, Math.random() * h * 0.6, 3 + Math.random() * 3, 0, 7); g.fill(); }
  },
  cavalier(g, w, h, p) {                       // pennants over a jousting field
    g.fillStyle = rgba(0xffffff, 0.2);
    for (let i = 0; i < 6; i++) g.fillRect(i * w / 6 + 20, h * 0.74, w / 12, h * 0.26);
    g.strokeStyle = rgba(0x6b4a33, 0.6); g.lineWidth = 8;
    g.beginPath(); g.moveTo(0, h * 0.72); g.lineTo(w, h * 0.72); g.stroke();
    for (let r = 0; r < 2; r++) {
      const y0 = h * (0.12 + r * 0.16);
      g.strokeStyle = rgba(0xffffff, 0.5); g.lineWidth = 2;
      g.beginPath(); g.moveTo(0, y0); g.quadraticCurveTo(w / 2, y0 + 50, w, y0); g.stroke();
      for (let i = 0; i < 14; i++) {
        const x = (i + 0.5) * w / 14, y = y0 + Math.sin((x / w) * Math.PI) * 25;
        g.fillStyle = i % 2 ? rgba(p.trim, 0.9) : rgba(0xffe08a, 0.9);
        g.beginPath(); g.moveTo(x - 14, y); g.lineTo(x + 14, y); g.lineTo(x, y + 38); g.fill();
      }
    }
    g.fillStyle = rgba(0xffe08a, 0.85);
    for (const [x, y, s] of [[w * 0.14, h * 0.5, 60], [w * 0.88, h * 0.52, 46]]) {          // shield crests
      g.beginPath(); g.moveTo(x - s / 2, y - s / 2); g.lineTo(x + s / 2, y - s / 2); g.lineTo(x + s / 2, y); g.quadraticCurveTo(x, y + s * 0.8, x - s / 2, y); g.fill();
    }
  },
  slime(g, w, h, p) {                          // a lab: beakers, bubbles and drips
    g.fillStyle = rgba(0xffffff, 0.12); for (let x = 0; x < w; x += 46) g.fillRect(x, 0, 2, h);
    g.fillStyle = rgba(p.main, 0.55);
    for (let i = 0; i < 40; i++) { g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 4 + Math.random() * 16, 0, 7); g.fill(); }
    for (let i = 0; i < 9; i++) { const x = i * w / 9 + 20, l = 40 + Math.random() * 160; g.fillStyle = rgba(p.dark, 0.6); g.fillRect(x, 0, 14, l); g.beginPath(); g.arc(x + 7, l, 10, 0, 7); g.fill(); }
    g.strokeStyle = rgba(0xffffff, 0.5); g.lineWidth = 4;
    for (const [x, s] of [[w * 0.12, 1], [w * 0.86, 0.8]]) { const y = h * 0.78; g.beginPath(); g.moveTo(x - 20 * s, y - 120 * s); g.lineTo(x - 20 * s, y - 60 * s); g.lineTo(x - 60 * s, y); g.lineTo(x + 60 * s, y); g.lineTo(x + 20 * s, y - 60 * s); g.lineTo(x + 20 * s, y - 120 * s); g.stroke(); g.fillStyle = rgba(p.trim, 0.6); g.fillRect(x - 50 * s, y - 30 * s, 100 * s, 28 * s); }
  },
  brawler(g, w, h, p) {                        // a derby rink: track lanes, stars and speed streaks
    for (let i = 0; i < 5; i++) { g.strokeStyle = rgba(i % 2 ? p.trim : 0xffffff, 0.35); g.lineWidth = 14; g.beginPath(); g.ellipse(w / 2, h * 0.9, w * (0.4 + i * 0.12), h * (0.18 + i * 0.05), 0, Math.PI, Math.PI * 2); g.stroke(); }
    g.strokeStyle = rgba(0xffffff, 0.55); g.lineWidth = 5; g.lineCap = 'round';
    for (let i = 0; i < 16; i++) { const y = Math.random() * h * 0.7, x = Math.random() * w; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 60 - Math.random() * 120, y); g.stroke(); }
    g.fillStyle = rgba(p.trim, 0.85);
    for (const [x, y, r] of [[w * 0.15, h * 0.2, 34], [w * 0.85, h * 0.28, 26], [w * 0.78, h * 0.1, 16]]) { g.beginPath(); for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 - Math.PI / 2, rr = k % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.fill(); }
  },
  elf(g, w, h, p) {                            // a moonlit forest: tall trunks, a big moon and drifting leaves
    g.fillStyle = rgba(0xfff6d0, 0.75); g.beginPath(); g.arc(w * 0.78, h * 0.22, 70, 0, 7); g.fill();
    g.fillStyle = rgba(0xfff6d0, 0.18); g.beginPath(); g.arc(w * 0.78, h * 0.22, 110, 0, 7); g.fill();
    for (let i = 0; i < 9; i++) { const x = i * w / 8 + Math.sin(i * 3) * 20, tw = 22 + (i % 3) * 14; g.fillStyle = rgba(p.dark, 0.55 + (i % 2) * 0.2); g.fillRect(x - tw / 2, 0, tw, h); }
    for (let i = 0; i < 26; i++) {
      const x = Math.random() * w, y = Math.random() * h, r = 6 + Math.random() * 8, a = Math.random() * 6;
      g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = rgba(i % 4 ? p.main : p.trim, 0.8); g.beginPath(); g.ellipse(0, 0, r, r * 0.45, 0, 0, 7); g.fill(); g.restore();
    }
  },
  dancer(g, w, h, p) {                         // an opera stage: red curtains, footlights and a spotlight
    const sp = g.createRadialGradient(w / 2, h * 0.7, 10, w / 2, h * 0.7, w * 0.55); sp.addColorStop(0, rgba(0xffffff, 0.55)); sp.addColorStop(1, rgba(0xffffff, 0));
    g.fillStyle = sp; g.fillRect(0, 0, w, h);
    for (const s of [0, 1]) for (let i = 0; i < 5; i++) {
      const x = s ? w - (i + 1) * 26 : i * 26; g.fillStyle = rgba(i % 2 ? 0xa01e3a : 0xc8284a, 0.85);
      g.beginPath(); g.moveTo(x, 0); g.quadraticCurveTo(x + 13, h * 0.5, x + (s ? 30 : -4), h); g.lineTo(x + 26 + (s ? 30 : -4), h); g.quadraticCurveTo(x + 39, h * 0.5, x + 26, 0); g.fill();
    }
    g.fillStyle = rgba(0xa01e3a, 0.9); g.fillRect(0, 0, w, 34);
    for (let x = 0; x < w; x += 34) { g.fillStyle = rgba(0xffd23c, 0.9); g.beginPath(); g.arc(x + 17, 34, 8, 0, Math.PI); g.fill(); }
    for (let x = 20; x < w; x += 60) { g.fillStyle = rgba(0xfff3a0, 0.9); g.beginPath(); g.arc(x, h - 12, 7, 0, 7); g.fill(); }
    for (let i = 0; i < 16; i++) { g.fillStyle = rgba(p.main, 0.7); g.beginPath(); g.arc(Math.random() * w, Math.random() * h * 0.8, 3 + Math.random() * 4, 0, 7); g.fill(); }
  },
  medic(g, w, h, p) {                          // a clinic: soft tiles, a heartbeat line and floating crosses
    g.strokeStyle = rgba(0xffffff, 0.14); g.lineWidth = 2;
    for (let x = 0; x < w; x += 48) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y < h; y += 48) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.strokeStyle = rgba(0x7affc0, 0.85); g.lineWidth = 6; g.beginPath();
    for (let x = 0; x <= w; x += 10) { const k = (x / w * 4) % 1; const y = h * 0.62 - (k > 0.42 && k < 0.5 ? 90 : k > 0.5 && k < 0.56 ? -50 : 0); x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    for (let i = 0; i < 9; i++) { const x = Math.random() * w, y = Math.random() * h, s = 8 + Math.random() * 14; g.fillStyle = rgba(i % 3 ? 0xffffff : p.trim, 0.7); g.fillRect(x - s, y - s / 3, s * 2, s / 1.5); g.fillRect(x - s / 3, y - s, s / 1.5, s * 2); }
  },
  spark(g, w, h, p) {                          // a storm of lightning bolts over a neon grid
    g.strokeStyle = rgba(p.trim, 0.25); g.lineWidth = 2;
    for (let y = h * 0.6; y < h; y += 26) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    for (let i = 0; i < 5; i++) {
      let x = Math.random() * w, y = 0; g.strokeStyle = rgba(i % 2 ? p.trim : 0x7af0ff, 0.85); g.lineWidth = 5 + Math.random() * 4; g.beginPath(); g.moveTo(x, y);
      while (y < h * 0.9) { x += (Math.random() - 0.5) * 80; y += 30 + Math.random() * 40; g.lineTo(x, y); } g.stroke();
    }
    for (let i = 0; i < 20; i++) { g.fillStyle = rgba(p.trim, 0.8); g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 2 + Math.random() * 4, 0, 7); g.fill(); }
  },
  builder(g, w, h, p) {                        // a building site: a brick wall, scaffolding and a crane
    for (let r = 0; r * 28 < h * 0.5; r++) for (let x = -60; x < w; x += 60) { g.fillStyle = rgba([0xd9733a, 0xc8642e, 0xe0844a][(r + Math.round(x / 60) + 9) % 3], 0.75); g.fillRect(x + (r % 2) * 30 + 2, h - (r + 1) * 28 + 2, 56, 24); }
    g.strokeStyle = rgba(0xffe14a, 0.6); g.lineWidth = 6;
    for (let x = w * 0.08; x < w; x += w * 0.28) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h * 0.55); g.stroke(); }
    for (let y = h * 0.1; y < h * 0.55; y += h * 0.15) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.strokeStyle = rgba(p.main, 0.8); g.lineWidth = 10; g.beginPath(); g.moveTo(w * 0.85, h * 0.55); g.lineTo(w * 0.85, h * 0.05); g.lineTo(w * 0.25, h * 0.05); g.stroke();
    g.lineWidth = 3; g.beginPath(); g.moveTo(w * 0.4, h * 0.05); g.lineTo(w * 0.4, h * 0.2); g.stroke();
  },
  wellington(g, w, h, p) {                     // a candlelit banquet: tablecloth check, candles and silver cloches
    g.fillStyle = rgba(0x8a3a2a, 0.35);
    for (let y = 0; y < h; y += 60) for (let x = (y / 60 % 2) * 60; x < w; x += 120) g.fillRect(x, y, 60, 60);
    for (let i = 0; i < 6; i++) {
      const x = w * (0.1 + i * 0.16), y = h * 0.62 + (i % 2) * 30;
      g.fillStyle = rgba(0xfff6e0, 0.85); g.fillRect(x - 6, y - 60, 12, 60);
      g.fillStyle = rgba(0xffc93c, 0.9); g.beginPath(); g.ellipse(x, y - 72, 7, 13, 0, 0, 7); g.fill();
      g.fillStyle = rgba(0xffd27a, 0.25); g.beginPath(); g.arc(x, y - 70, 40, 0, 7); g.fill();
    }
    for (const [x, r] of [[w * 0.2, 70], [w * 0.8, 60]]) { g.fillStyle = rgba(0xd8dee8, 0.7); g.beginPath(); g.arc(x, h * 0.92, r, Math.PI, 0); g.fill(); g.fillRect(x - r - 10, h * 0.92, r * 2 + 20, 10); }
  },
  shepherd(g, w, h, p) {                       // rolling highland hills, a stone wall and grazing sheep
    [[0x5f8f45, 0.55], [0x4a7a3a, 0.68], [0x3a6a2a, 0.82]].forEach(([c, y], i) => { g.fillStyle = rgba(c, 0.85); g.beginPath(); g.moveTo(0, h * y); for (let x = 0; x <= w; x += 30) g.lineTo(x, h * y - Math.sin(x * 0.006 + i * 2) * 40); g.lineTo(w, h); g.lineTo(0, h); g.fill(); });
    g.fillStyle = rgba(0x9a9488, 0.85);
    for (let x = 0; x < w; x += 26) g.fillRect(x, h * 0.74 + Math.sin(x) * 3, 22, 14);
    for (let i = 0; i < 9; i++) { const x = Math.random() * w, y = h * (0.6 + Math.random() * 0.35); g.fillStyle = rgba(0xf6f2ea, 0.95); g.beginPath(); g.ellipse(x, y, 22, 15, 0, 0, 7); g.fill(); g.fillStyle = rgba(0x2a2a32, 0.95); g.beginPath(); g.ellipse(x - 22, y - 4, 8, 7, 0, 0, 7); g.fill(); }
  },
  microwave(g, w, h, p) {                      // a kitchen: wall tiles, a glowing turntable and steam
    g.strokeStyle = rgba(0xffffff, 0.2); g.lineWidth = 3;
    for (let x = 0; x < w; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y < h; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    const gr = g.createRadialGradient(w / 2, h * 0.55, 10, w / 2, h * 0.55, w * 0.5); gr.addColorStop(0, rgba(0xffd27a, 0.6)); gr.addColorStop(1, rgba(0xffd27a, 0));
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = rgba(0xffffff, 0.45); g.lineWidth = 8; g.beginPath(); g.ellipse(w / 2, h * 0.82, w * 0.3, 30, 0, 0, 7); g.stroke();
    for (let i = 0; i < 5; i++) { const x = w * (0.2 + i * 0.15); g.strokeStyle = rgba(0xffffff, 0.35); g.lineWidth = 6; g.beginPath(); g.moveTo(x, h * 0.6); g.bezierCurveTo(x + 30, h * 0.5, x - 30, h * 0.4, x, h * 0.3); g.stroke(); }
    g.fillStyle = rgba(0x5af0ff, 0.85); g.font = 'bold 64px monospace'; g.fillText('12:00', w * 0.62, h * 0.14);
  },
  mole(g, w, h, p) {                           // underground: dirt layers, tunnels, roots and buried rocks
    const bands = [0x7a5a3a, 0x6b4a30, 0x5a3c26, 0x4a301e];
    bands.forEach((c, i) => { g.fillStyle = rgba(c, 0.85); g.beginPath(); g.moveTo(0, h * (0.2 + i * 0.22)); for (let x = 0; x <= w; x += 40) g.lineTo(x, h * (0.2 + i * 0.22) + Math.sin(x * 0.02 + i) * 12); g.lineTo(w, h); g.lineTo(0, h); g.fill(); });
    g.fillStyle = rgba(0x120c08, 0.8);
    for (const [x, y, r] of [[w * 0.15, h * 0.4, 46], [w * 0.85, h * 0.62, 38], [w * 0.3, h * 0.85, 30]]) { g.beginPath(); g.ellipse(x, y, r * 1.4, r, 0, 0, 7); g.fill(); }
    g.strokeStyle = rgba(0x3a2414, 0.8); g.lineWidth = 5;
    for (let i = 0; i < 6; i++) { const x = Math.random() * w; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 30, h * 0.15, x - 30, h * 0.25, x + 10, h * 0.35); g.stroke(); }
    for (let i = 0; i < 14; i++) { g.fillStyle = rgba(i % 3 ? 0x9a8a72 : p.trim, 0.8); g.beginPath(); g.arc(Math.random() * w, h * 0.3 + Math.random() * h * 0.7, 5 + Math.random() * 9, 0, 7); g.fill(); }
  },
  chipmunk(g, w, h, p) {                       // a workshop wall: gears, a blueprint grid and acorns
    g.strokeStyle = rgba(0xffffff, 0.14); g.lineWidth = 1;
    for (let x = 0; x < w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y < h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    for (const [x, y, r] of [[w * 0.14, h * 0.24, 80], [w * 0.88, h * 0.4, 60], [w * 0.2, h * 0.75, 50]]) {
      g.fillStyle = rgba(p.dark, 0.55); g.beginPath();
      for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2, rr = k % 2 ? r : r * 0.82; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.fill();
      g.fillStyle = rgba(p.trim, 0.7); g.beginPath(); g.arc(x, y, r * 0.3, 0, 7); g.fill();
    }
    for (let i = 0; i < 10; i++) { const x = Math.random() * w, y = h * 0.1 + Math.random() * h * 0.8; g.fillStyle = rgba(0x8a5a2a, 0.75); g.beginPath(); g.ellipse(x, y + 6, 9, 11, 0, 0, 7); g.fill(); g.fillStyle = rgba(0x4a2a14, 0.85); g.beginPath(); g.ellipse(x, y - 4, 11, 6, 0, 0, 7); g.fill(); }
  },
  kestrel(g, w, h, p) {                        // clouds and looping contrails
    g.fillStyle = 'rgba(255,255,255,.6)';
    for (let i = 0; i < 9; i++) {
      const x = Math.random() * w, y = h * 0.15 + Math.random() * h * 0.55;
      for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(x + k * 34, y + Math.sin(k) * 10, 30 + (k % 2) * 16, 0, 7); g.fill(); }
    }
    g.strokeStyle = rgba(0xffffff, 0.85); g.lineWidth = 7; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-20, h * 0.7);
    g.bezierCurveTo(w * 0.3, h * 0.2, w * 0.5, h * 0.9, w * 0.62, h * 0.42);
    g.arc(w * 0.68, h * 0.36, 80, Math.PI * 0.75, Math.PI * 2.6); g.stroke();
    g.fillStyle = rgba(p.dark, 0.8);
    for (const [x, y, s] of [[w * 0.84, h * 0.14, 1], [w * 0.22, h * 0.12, 0.6]]) {   // tiny biplane silhouettes
      g.fillRect(x - 40 * s, y - 4 * s, 80 * s, 8 * s); g.fillRect(x - 40 * s, y + 10 * s, 80 * s, 6 * s); g.fillRect(x - 8 * s, y - 14 * s, 16 * s, 36 * s);
    }
  },
};

const cache = new Map();
const skinKey = def => def.id + ':' + (def.skinId || 'base');

export function splash(def) {
  const key = 'splash:' + skinKey(def);
  if (cache.has(key)) return cache.get(key);
  const W = 1100, H = 900;                       // landscape, so the whole hero fits the wide splash panel
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const p = def.palette;
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, css(def.color)); bg.addColorStop(1, css(p.dark));
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.globalAlpha = 0.35; burst(g, W, H, W * 0.5, H * 0.52, 28, rgba(0xffffff, 0.35), 'rgba(0,0,0,0)'); g.globalAlpha = 1;
  MOTIF[def.id](g, W, H, p);
  halftone(g, W, H, rgba(p.dark, 0.35));
  // floor glow + shadow
  const fl = g.createRadialGradient(W / 2, H * 0.86, 10, W / 2, H * 0.86, 220);
  fl.addColorStop(0, 'rgba(29,35,64,.55)'); fl.addColorStop(1, 'rgba(29,35,64,0)');
  g.fillStyle = fl; g.beginPath(); g.ellipse(W / 2, H * 0.86, 220, 40, 0, 0, 7); g.fill();
  // hero
  const { sc, p: pose } = heroScene(def);
  const cam = new THREE.PerspectiveCamera(30, W / H, 0.1, 50);
  // pulled well back so the full figure, feet to hat, sits inside the frame with room to breathe
  const [cx, cy, cz] = pose.cam;
  cam.position.set(cx * 1.8, 1.25 + cy * 0.35, cz * 1.8); cam.lookAt(0, 1.0, 0);
  g.drawImage(renderTo(sc, cam, W, H), 0, 0);
  const url = cv.toDataURL('image/jpeg', 0.9);
  cache.set(key, url);
  return url;
}

export function headshot(def) {
  const key = 'head:' + skinKey(def);
  if (cache.has(key)) return cache.get(key);
  const { sc } = heroScene(def, 1.2);
  sc.children.find(o => o.isGroup).rotation.set(0, -0.35, 0);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  cam.position.set(-0.55, 1.75, -2.2); cam.lookAt(0, 1.5, 0);
  const url = renderTo(sc, cam, 256, 256).toDataURL();
  cache.set(key, url);
  return url;
}

// Rendered view of a map from the blue base, looking down the lanes, with a couple of
// heroes in the foreground for scale.
export function mapArt(map, W = 640, H = 1000) {
  const key = 'map:' + map.id;
  if (cache.has(key)) return cache.get(key);
  const sc = new THREE.Scene();
  const fake = { scene: sc, colliders: [], structures: [] };
  buildWorld(sc, map);
  for (const [team, s] of [['blue', 1], ['red', -1]]) {
    for (const [x, z] of map.towers) createStructure(fake, 'tower', team, x * s, z * s);
    createStructure(fake, 'core', team, 0, -s * (map.L - 11));
  }
  for (const s of fake.structures) s.bar.visible = false;
  const picks = [HEROES[(map.id.length) % 8], HEROES[(map.id.length + 3) % 8]];
  picks.forEach((d, i) => {
    const m = buildHeroModel(d, i ? 0xff5a36 : 0x2f5bff);
    m.anim(0.016, 0, 1 + i); m.root.position.set(i ? -6 : 4, 0, -map.L + 22 + i * 9); m.root.rotation.y = i ? 0.4 : Math.PI + 0.3;
    m.root.traverse(o => { if (o.isMesh) o.castShadow = true; });
    sc.add(m.root);
  });
  const cam = new THREE.PerspectiveCamera(W > H ? 46 : 58, W / H, 0.5, 900);
  cam.position.set(map.W * 0.4, 18, -map.L + 4); cam.lookAt(-map.W * 0.05, 0, -map.L * 0.15);
  const r = renderer();
  r.setSize(W, H, false); r.setClearColor(0xffffff, 1);
  r.render(sc, cam);
  const url = r.domElement.toDataURL('image/jpeg', 0.88);
  sc.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  r.renderLists.dispose();
  cache.set(key, url);
  return url;
}
