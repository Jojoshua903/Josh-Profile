import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { setGravity, gravity } from './world.js?v=20261128e';
import { burst, ring } from './units.js?v=20261128e';

// Map mechanics that change how a stage plays, set in each map's data (data.js):
//   gravity  a fall-speed multiplier for the whole match (Skyreach Isles floats at 0.6)
//   pads     golden jump pads that fling a hero along an arc to a set landing spot
//   tide     the sea floods the low ground on a timer; anyone wading in it is slowed
// The tide runs on match time, so every machine online sees the same water.

const flat = (a, x, z) => Math.hypot(a.x - x, a.z - z);

export function initMapFx(G) {
  const map = G.map;
  setGravity(map.gravity);
  G.fx2 = { pads: [], tide: null };
  for (const p of map.pads || []) for (const s of [1, -1]) {
    const [x, z, up, tx, tz, th] = p;
    const pad = { x: x * s, z: z * s, up, tx: tx * s, tz: tz * s, th: th || 0 };
    const g = new THREE.Group(); g.position.set(pad.x, 0.04, pad.z); G.scene.add(g);
    const gold = new THREE.MeshStandardMaterial({ color: 0xffc93c, emissive: 0xffb02a, emissiveIntensity: 0.7, roughness: 0.3, metalness: 0.4 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.4, 0.18, 24), new THREE.MeshStandardMaterial({ color: 0xf4f0e8, roughness: 0.5 }));
    base.position.y = 0.05; g.add(base);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.06, 24), gold); disc.position.y = 0.16; g.add(disc);
    // chevrons pointing where it throws you
    const dir = Math.atan2(pad.tx - pad.x, pad.tz - pad.z), arrows = new THREE.Group(); arrows.rotation.y = dir; arrows.position.y = 0.22; g.add(arrows);
    const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (const k of [-0.35, 0.15]) for (const sd of [-1, 1]) { const a = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.55), white); a.position.set(sd * 0.18, 0, k); a.rotation.y = sd * 0.7; arrows.add(a); }
    const glow = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.25, 32), new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }));
    glow.rotation.x = -Math.PI / 2; glow.position.y = 0.2; g.add(glow);
    pad.glow = glow; pad.disc = disc; pad.pop = 0;
    G.fx2.pads.push(pad);
  }
  if (map.tide) {
    const T = map.tide;
    const tex = waterTex();
    tex.repeat.set(map.W / 6, map.L / 6);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(map.W * 2, map.L * 2), new THREE.MeshStandardMaterial({ color: 0x4f9ab8, map: tex, transparent: true, opacity: 0.78, roughness: 0.15, metalness: 0.2, depthWrite: false }));
    water.rotation.x = -Math.PI / 2; water.position.y = -0.4; water.renderOrder = 2; G.scene.add(water);
    G.fx2.tide = { T, water, tex, level: -0.4, phase: 'low', said: '' };
  }
}

export function endMapFx() { setGravity(1); }

// how high the water is at a given match time
function tideLevel(T, time) {
  if (time < T.first) return { lvl: -0.4, phase: T.first - time < T.warn ? 'warn' : 'low', next: T.first - time };
  const t = (time - T.first) % T.every, top = T.level;
  if (t < T.rise) return { lvl: -0.4 + (top + 0.4) * (t / T.rise), phase: 'in' };
  if (t < T.dur - T.rise) return { lvl: top, phase: 'high', left: T.dur - T.rise - t };
  if (t < T.dur) return { lvl: top - (top + 0.4) * ((t - (T.dur - T.rise)) / T.rise), phase: 'out' };
  const next = T.every - t;
  return { lvl: -0.4, phase: next < T.warn ? 'warn' : 'low', next };
}

export function updateMapFx(G, dt) {
  const F = G.fx2; if (!F) return;
  // jump pads: step on one (on the ground) and get thrown along its arc
  for (const p of F.pads) {
    p.pop = Math.max(0, p.pop - dt * 3);
    p.glow.material.opacity = 0.35 + Math.sin(G.time * 4 + p.x) * 0.15 + p.pop * 0.5;
    p.disc.position.y = 0.16 + p.pop * 0.12;
    for (const h of G.heroes) {
      if (!h.alive || !h.onGround || (G.net && !h.local) || (h.padT || 0) > G.time || flat(h.pos, p.x, p.z) > 1.15) continue;
      launch(G, h, p);
    }
  }
  // the tide
  const D = F.tide;
  if (D) {
    const { lvl, phase, next, left } = tideLevel(D.T, G.time);
    D.level = lvl; D.water.position.y = lvl;
    D.tex.offset.x = Math.sin(G.time * 0.2) * 0.3; D.tex.offset.y = G.time * 0.02;
    D.water.visible = lvl > -0.35;
    if (phase !== D.phase) {
      if (phase === 'warn') G.ev.tide?.('warn', Math.ceil(next));
      if (phase === 'in') G.ev.tide?.('in');
      if (phase === 'out') G.ev.tide?.('out');
      D.phase = phase;
    }
    D.info = { phase, next, left };
    for (const h of G.heroes) {
      const wet = h.alive && lvl > 0.15 && h.pos.y < lvl - 0.05;
      h.wet = wet ? D.T.slow : 1;
      if (wet && h.burnT > 0) h.burnT = 0;                                // the sea puts out fires
      if (wet && Math.hypot(h.vel.x, h.vel.z) > 2 && Math.random() < dt * 8) burst(G, h.pos.clone().setY(lvl + 0.05), 0xdff6ff, 0.35);
    }
  }
}

function launch(G, h, p) {
  const g = gravity(), up = p.up;
  // flight time to come down at the landing height (or the top of the arc if it's out of reach)
  const disc = up * up - 2 * g * (p.th - h.pos.y);
  const T = disc > 0 ? (up + Math.sqrt(disc)) / g : up / g;
  const dx = p.tx - h.pos.x, dz = p.tz - h.pos.z;
  h.vel.set(dx / T, up, dz / T);
  h.onGround = false; h.knockT = T * 0.92;                             // the pad owns the arc until just before landing
  h.padT = G.time + 0.6; h.airT = 0;
  p.pop = 1;
  burst(G, new THREE.Vector3(p.x, 0.4, p.z), 0xffc93c, 1.2); ring(G, new THREE.Vector3(p.x, 0.1, p.z), 0xffe08a, 1.6);
  G.ev.pad?.(h, p);
}

// bots: the tide info for the HUD, and the pads for anyone who wants them
export const tideInfo = G => G.fx2?.tide?.info || null;

function waterTex() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const g = cv.getContext('2d');
  g.fillStyle = '#6fb8d0'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * 256, y = Math.random() * 256, w = 20 + Math.random() * 40;
    g.strokeStyle = `rgba(255,255,255,${0.15 + Math.random() * 0.35})`; g.lineWidth = 2 + Math.random() * 2;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w / 2, y - 6, x + w, y); g.stroke();
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
