// WIDR 64 Pro Skater: 3D engine, camera, HUD and menus.
import * as THREE from 'https://unpkg.com/three@0.180.0/build/three.module.js';
import { H, grad, inPit, pitAt, inBox, map, setMap, MAP_LIST, makeItems, makeCrates, buildWorld } from './world3d.js';
import { buildSkater } from './rider3d.js';

const G = 20, DT = 1 / 60;
const FLIPS = { none: ['Kickflip', 100, 22, 'kick'], up: ['Heelflip', 100, 22, 'kick'], down: ['Pop Shove-It', 80, 18, 'shove'], side: ['Varial Kickflip', 250, 28, 'kick'] };
const GRABS = { none: ['Melon', 150], up: ['Nosegrab', 150], down: ['Indy', 150], side: ['Method', 200] };
const GRINDS = { none: '50-50', up: 'Nosegrind', down: '5-0', side: 'Boardslide' };
const goals = () => map().goals;
const underWater = (x, y, z) => { const pt = pitAt(x, z); return pt && y < pt.waterY + 0.1; };
const keys = {}, pressed = {}, released = {};
const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  Space: 'jump', KeyJ: 'flip', KeyZ: 'flip', KeyK: 'grab', KeyX: 'grab', KeyL: 'grind', KeyC: 'grind', KeyI: 'special', KeyV: 'special',
  Escape: 'pause', KeyP: 'pause', Enter: 'enter', KeyH: 'hide', KeyR: 'marker',
};
const dirKey = () => keys.up ? 'up' : keys.down ? 'down' : (keys.left || keys.right) ? 'side' : 'none';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const fmt = n => Math.round(n).toLocaleString('en-US');
const $ = id => document.getElementById(id);

// ---------- audio ----------
let AC = null;
function ac() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } return AC; }
function beep(f, d, type, v, f2) {
  const a = ac(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
  o.type = type || 'square'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
  g.gain.setValueAtTime(v || 0.06, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + d);
}
function thud(v) {
  const a = ac(); if (!a) return;
  const n = a.sampleRate * 0.12, b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
  const s = a.createBufferSource(), g = a.createGain(), f = a.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = 900; g.gain.value = v || 0.25;
  s.buffer = b; s.connect(f).connect(g).connect(a.destination); s.start();
}

// ---------- save ----------
// goals and best scores are stored per park; v1 saves (Plaza only) are carried over.
const SAVE_KEY = 'widr_pro_skater_3d_v2';
const save = (() => {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s) return s;
    const old = JSON.parse(localStorage.getItem('widr_pro_skater_3d_v1'));
    if (old && old.goals) {
      const rename = { shells: 'collect', crates: 'smash', pit: 'gap' }, g = {};
      for (const k in old.goals) g[rename[k] || k] = old.goals[k];
      return { goals: { plaza: g }, best: { plaza: old.best || 0 } };
    }
  } catch (e) {}
  return {};
})();
save.goals = save.goals || {}; save.best = save.best || {};
for (const m of MAP_LIST) { save.goals[m.id] = save.goals[m.id] || {}; save.best[m.id] = save.best[m.id] || 0; }
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} };
const mapGoals = () => save.goals[map().id];
const mapGoalCount = () => goals().filter(g => mapGoals()[g.id]).length;
const goalCount = () => MAP_LIST.reduce((n, m) => n + m.goals.filter(g => save.goals[m.id][g.id]).length, 0);
const isUnlocked = sk => !sk.locked || goalCount() >= 7;

// ---------- three.js scene ----------
const cv = $('cv');
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#ffe7bf'); scene.fog = new THREE.Fog('#ffe7bf', 70, 280);
const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 600);
const hemi = new THREE.HemisphereLight('#fff6e0', '#d9b98a', 1.6); scene.add(hemi);
const sunLight = new THREE.DirectionalLight('#fff0d0', 2.2);
sunLight.castShadow = true; sunLight.shadow.mapSize.set(2048, 2048);
Object.assign(sunLight.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 80 });
scene.add(sunLight, sunLight.target);
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

let items = [], crates = [], worldGroup = null, loadedMap = null;
function loadMap(id) {
  if (loadedMap === id) return;
  setMap(id); loadedMap = id;
  if (worldGroup) scene.remove(worldGroup);
  items = makeItems(); crates = makeCrates();
  worldGroup = buildWorld(items, crates); scene.add(worldGroup);
  const M = map();
  scene.background.set(M.sky); scene.fog.color.set(M.sky);
  hemi.color.set(M.hemi[0]); hemi.groundColor.set(M.hemi[1]); hemi.intensity = M.hemi[2]; sunLight.intensity = M.sunI;
}

// particles
const PN = 400, pGeo = new THREE.BufferGeometry();
const pPos = new Float32Array(PN * 3), pCol = new Float32Array(PN * 3);
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3)); pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
scene.add(new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 0.18, vertexColors: true })));
const parts = []; const tmpC = new THREE.Color();
function emit(x, y, z, n, col, spread = 3, up = 3, grav = 9) {
  for (let i = 0; i < n; i++) parts.push({ x, y, z, vx: (Math.random() - 0.5) * spread, vy: Math.random() * up, vz: (Math.random() - 0.5) * spread, life: 30 + Math.random() * 20, col, grav });
  while (parts.length > PN) parts.shift();
}

// ---------- game state ----------
const Game = { mode: 'title', career: true, score: 0, time: 0, special: 0, p: null, combo: { tricks: [], base: 0 }, comboShow: 0, comboState: '', letters: '', shells: 0, cratesBroken: 0, newGoals: [], t: 0 };

function newPlayer(sk) {
  const st = sk.stats, S = map().start;
  return {
    sk, x: S.x, y: H(S.x, S.z), z: S.z, h: S.h, spd: 3, gvy: 0, vel: { x: 0, y: 0, z: 0 }, yaw: S.h, pitch: 0, roll: 0,
    state: 'ground', stance: 1, crouchT: -1, airT: 0, jumped: false, spinTotal: 0, flipT: 0, flipDur: 1, flipKind: 'kick', special: false,
    grab: null, rail: null, railT: 0, railV: 0, railStart: 0, bal: 0, balV: 0, grindT: 0, grindEntry: null, grindBuf: 0, grindCool: 0, grindYawOff: 0,
    bailT: 0, splash: false, takeoff: { x: 0, z: 0 }, vert: false,
    maxSpd: 8.6 + st.speed * 0.36, ollie: 5.6 + st.air * 0.2, balMul: 1.7 - st.balance * 0.12, grav: sk.id === 'otis' ? 0.85 : 1,
  };
}
let model = null;
function startRun(sk, career, mapId) {
  loadMap(mapId || loadedMap || 'plaza');
  Game.career = career; Game.p = newPlayer(sk); Game.score = 0; Game.time = career ? 120 * 60 : Infinity;
  Game.special = 0; Game.combo = { tricks: [], base: 0 }; Game.comboShow = 0; Game.letters = ''; Game.shells = 0; Game.cratesBroken = 0; Game.hangs = 0;
  Game.newGoals = []; Game.timeUp = false; Game.endT = 0; parts.length = 0;
  const S = map().start;
  Game.marker = null; Game.rHold = 0; Game.safe = { x: S.x, z: S.z, h: S.h }; markerMesh.visible = false;
  for (const it of items) { it.got = false; it.mesh.visible = true; }
  for (const c of crates) { c.broken = false; c.mesh.visible = true; }
  if (model) scene.remove(model.root);
  model = buildSkater(sk); scene.add(model.root);
  camYaw = S.h; camera.position.set(S.x - Math.sin(S.h) * 6, 3, S.z - Math.cos(S.h) * 6);
  UI.startHud();
}

// ---------- combo + goals ----------
function addTrick(name, pts) {
  const c = Game.combo, rep = c.tricks.filter(t => t.name === name).length;
  const e = { name, raw: pts, rep, pts: Math.round(pts * Math.pow(0.5, rep)) };
  c.tricks.push(e); recalc(); Game.comboState = ''; Game.comboShow = 1; return e;
}
function setTrickPts(e, raw) { e.raw = raw; e.pts = Math.round(raw * Math.pow(0.5, e.rep)); recalc(); }
function recalc() { Game.combo.base = Game.combo.tricks.reduce((s, t) => s + t.pts, 0); }
function landCombo() {
  const c = Game.combo; if (!c.tricks.length) return;
  const total = c.base * c.tricks.length;
  Game.score += total; Game.special = Math.min(1, Game.special + total / 2200);
  if (c.tricks.length >= 5) goal('combo');
  Game.comboState = 'bank'; Game.comboShow = 80; Game.bankTotal = total;
  beep(660, 0.08, 'square', 0.05); setTimeout(() => beep(990, 0.12, 'square', 0.05), 70);
  Game.combo = { tricks: [], base: 0, last: c };
}
function failCombo() {
  const c = Game.combo;
  if (c.tricks.length) { Game.comboState = 'fail'; Game.comboShow = 80; Game.combo = { tricks: [], base: 0, last: c }; }
  Game.special = 0;
}
function goal(id) {
  const def = goals().find(g => g.id === id);
  if (!Game.career || !def || mapGoals()[id]) return;
  const before = goalCount(); mapGoals()[id] = true; persist(); Game.newGoals.push(id);
  UI.toast('Goal! ' + def.label.replace(/ \(.*\)/, ''));
  beep(523, 0.12, 'triangle', 0.08); setTimeout(() => beep(784, 0.2, 'triangle', 0.08), 120);
  if (before < 7 && goalCount() >= 7) setTimeout(() => UI.toast('King Grumbleclaw unlocked!'), 1900);
}

// ---------- physics ----------
function goAir(p, vx, vy, vz, s) {
  p.state = 'air'; p.vel = { x: vx, y: vy, z: vz }; p.airT = 0; p.takeoff = { x: p.x, z: p.z }; p.spinTotal = 0; p.vert = false;
  if (s > 2.2 && vy > 1.5) {
    const [gx, gz] = grad(p.x - Math.sin(p.h) * 0.15, p.z - Math.cos(p.h) * 0.15), gl = Math.hypot(gx, gz) || 1;
    const nx = gx / gl, nz = gz / gl, vn = vx * nx + vz * nz;
    p.vel.x -= nx * vn; p.vel.z -= nz * vn; p.x -= nx * 0.1; p.z -= nz * 0.1; p.vel.y += 1.2; p.vert = true;
  }
}
function ollie(p) {
  const dx = Math.sin(p.h), dz = Math.cos(p.h), [gx, gz] = grad(p.x, p.z), s = gx * dx + gz * dz, n = Math.hypot(1, s);
  const hv = p.spd / n, h = p.ollie + Math.min(p.crouchT, 18) * 0.04;
  goAir(p, dx * hv, p.gvy / DT + h, dz * hv, s); p.jumped = true; p.crouchT = 0;
  beep(220, 0.06, 'triangle', 0.07, 440);
}

function stepGround(p) {
  let dx = Math.sin(p.h), dz = Math.cos(p.h);
  const [gx, gz] = grad(p.x, p.z);
  const s = clamp(gx * dx + gz * dz, -8, 8), n = Math.hypot(1, s);
  p.spd -= G * 0.5 * s / n * DT;
  const turn = (keys.left ? 1 : 0) - (keys.right ? 1 : 0);
  p.h += turn * 2.8 * DT * (Math.abs(s) > 2 ? 0.35 : 1);
  if (keys.up && p.spd < p.maxSpd && (Math.abs(s) < 1.0 || p.spd < 1.5)) p.spd += 7 * DT;
  if (keys.down) p.spd = Math.max(0, p.spd - 9 * DT);
  p.spd = Math.min(17, p.spd * 0.998);
  if (p.spd < 0) { p.h += Math.PI; p.spd = -p.spd; p.stance *= -1; }
  // press grind while rolling past a rail or ledge: pop onto it automatically
  if (wantsGrind(p) && p.spd > 1) {
    const gy0 = p.y, hit = findRail(p.x, p.z, r => r.y > gy0 + 0.05 && r.y < gy0 + 1.6, 1.3);
    if (hit) {
      p.vel = { x: Math.sin(p.h) * p.spd, y: 0, z: Math.cos(p.h) * p.spd }; p.takeoff = { x: p.x, z: p.z };
      beep(220, 0.06, 'triangle', 0.07, 440); startGrind(p, hit.r, hit.t); return;
    }
  }
  if (keys.jump) { if (p.crouchT >= 0) p.crouchT++; }
  else if (p.crouchT > 0) { ollie(p); return; }
  else p.crouchT = 0;
  dx = Math.sin(p.h); dz = Math.cos(p.h);
  const step = p.spd * DT / n;
  const BX = map().bx, BZ = map().bz;
  let nx = p.x + dx * step, nz = p.z + dz * step;
  if (Math.abs(nx) > BX) { nx = clamp(nx, -BX, BX); p.h = Math.atan2(-dx, dz); p.spd *= 0.6; thud(0.12); }
  if (Math.abs(nz) > BZ) { nz = clamp(nz, -BZ, BZ); p.h = Math.atan2(dx, -dz); p.spd *= 0.6; thud(0.12); }
  let gy = H(nx, nz);
  if (gy - p.y > 0.35) {
    const gyx = H(nx, p.z), gyz = H(p.x, nz);
    if (gyx - p.y <= 0.35) { nz = p.z; gy = gyx; p.h = Math.atan2(dx, -dz); }
    else if (gyz - p.y <= 0.35) { nx = p.x; gy = gyz; p.h = Math.atan2(-dx, dz); }
    else { p.h += Math.PI; p.spd *= 0.4; thud(0.15); return; }
    p.spd *= 0.6; thud(0.15);
  }
  const dy = gy - p.y, ox = p.x, oz = p.z;
  if (dy < p.gvy - 2 * G * DT * DT) {
    p.x = nx; p.z = nz; p.y += p.gvy;
    goAir(p, (nx - ox) / DT, Math.min(16, p.gvy / DT), (nz - oz) / DT, s); return;
  }
  p.x = nx; p.z = nz; p.y = gy;
  // a stair step up is a snap, not a slope: don't carry it as upward momentum
  p.gvy = (dy > 0.08 && dy > 1.6 * Math.max(0, s) * step + 0.02) ? 0 : dy;
  p.yaw = p.h + (p.stance < 0 ? Math.PI : 0);
  p.pitch += (Math.atan(s * p.stance) - p.pitch) * 0.3; p.roll *= 0.8;
}

function stepAir(p) {
  p.airT++;
  const turn = (keys.left ? 1 : 0) - (keys.right ? 1 : 0);
  if (turn) { p.yaw += turn * 6.6 * DT; p.spinTotal += turn * 6.6 * DT; }
  if (released.jump && !p.jumped && p.airT < 10) { p.vel.y += p.ollie * 0.9; p.jumped = true; beep(220, 0.06, 'triangle', 0.07, 440); }
  if (pressed.special && Game.special >= 1 && p.flipT <= 0 && !p.grab) {
    p.flipT = p.flipDur = 36; p.flipKind = 'special'; p.special = true; addTrick(p.sk.special, 1500); beep(330, 0.4, 'sawtooth', 0.05, 1320);
  } else if (pressed.flip && p.flipT <= 0 && !p.grab) {
    const [nm, pts, dur, kind] = FLIPS[dirKey()]; p.flipT = p.flipDur = dur; p.flipKind = kind; p.special = false; addTrick(nm, pts);
    beep(480, 0.05, 'square', 0.04, 720);
  }
  if (pressed.grab && !p.grab && p.flipT <= 0) { const [nm, pts] = GRABS[dirKey()]; p.grab = { t: 0, base: pts, e: addTrick(nm, pts) }; }
  if (p.grab) { if (keys.grab) { p.grab.t++; setTrickPts(p.grab.e, p.grab.base + p.grab.t * 8); } else p.grab = null; }
  if (p.flipT > 0) p.flipT--;
  p.vel.y -= G * p.grav * DT;
  const px = p.x, py = p.y, pz = p.z;
  p.x += p.vel.x * DT; p.y += p.vel.y * DT; p.z += p.vel.z * DT;
  if (Math.abs(p.x) > map().bx) { p.x = clamp(p.x, -map().bx, map().bx); p.vel.x *= -0.3; }
  if (Math.abs(p.z) > map().bz) { p.z = clamp(p.z, -map().bz, map().bz); p.vel.z *= -0.3; }
  if (!p.vert) p.pitch *= 0.95;
  p.roll *= 0.9;

  if (wantsGrind(p) && p.vel.y < 2.5) {
    // generous magnet: anywhere near the rail, feet not far below it, and not floating way above it
    const hit = findRail(p.x, p.z, r => Math.max(py, p.y) >= r.y - 0.45 && p.y <= r.y + 0.9, 1.2);
    if (hit) { startGrind(p, hit.r, hit.t); return; }
  }
  if (underWater(p.x, p.y, p.z)) { bail(p, true); return; }
  const gy = H(p.x, p.z);
  if (p.y <= gy) {
    if (py < gy - 0.4) {
      p.x = px; p.z = pz; p.vel.x *= -0.3; p.vel.z *= -0.3;
      if (p.y <= H(px, pz)) land(p);
    } else land(p);
  }
}

// Closest rail to (x, z) within reach whose height passes the check.
function findRail(x, z, ok, reach) {
  let best = null;
  for (const r of map().rails) {
    const ux = r.b[0] - r.a[0], uz = r.b[2] - r.a[2], L2 = ux * ux + uz * uz;
    const t = clamp(((x - r.a[0]) * ux + (z - r.a[2]) * uz) / L2, 0.02, 0.98);
    const rx = r.a[0] + ux * t, rz = r.a[2] + uz * t, d = Math.hypot(x - rx, z - rz);
    const y = r.a[1] + (r.b[1] - r.a[1]) * t;
    if (d < reach && ok({ y }) && (!best || d < best.d)) best = { r, t, d, y };
  }
  return best;
}
const wantsGrind = p => p.grindCool <= 0 && (keys.grind || p.grindBuf > 0);

function spinTrick(p) {
  const k = Math.round(Math.abs(p.spinTotal) / Math.PI);
  if (k > 0) addTrick((p.spinTotal > 0 ? 'FS ' : 'BS ') + k * 180, 90 * k + (k >= 3 ? 150 : 0));
  p.spinTotal = 0;
}

function land(p) {
  p.y = H(p.x, p.z);
  const [gx, gz] = grad(p.x, p.z), gl = Math.hypot(gx, gz);
  let hx = p.vel.x, hz = p.vel.z; const hl = Math.hypot(hx, hz);
  if (p.vert || hl < 1.2) { if (gl > 0.3) { hx = -gx / gl; hz = -gz / gl; } else { hx = Math.sin(p.yaw); hz = Math.cos(p.yaw); } }
  else { hx /= hl; hz /= hl; }
  let s = gx * hx + gz * hz; const n = Math.hypot(1, s);
  let spd = (p.vel.x * hx + p.vel.z * hz + p.vel.y * s) / n;
  if (spd < 0) { hx = -hx; hz = -hz; s = -s; spd = -spd; }
  const newH = Math.atan2(hx, hz), ad = Math.abs(wrap(p.yaw - newH));
  // forgiving landings: up to ~75° off still lands, and nearly finished flips get caught
  let stance = ad < 1.3 ? 1 : ad > Math.PI - 1.3 ? -1 : 0;
  const flipLeft = p.flipT / (p.flipDur || 1);
  if (flipLeft > 0.45 || !stance) { bail(p, false); return; }
  const sketchy = flipLeft > 0 || (ad > 0.8 && ad < Math.PI - 0.8) || (p.grab && p.grab.t < 4);
  p.flipT = 0; p.grab = null;
  if (sketchy) UI.gap('Sketchy!');
  spinTrick(p);
  for (const g of map().gaps) {
    if (g.minAir && p.airT < g.minAir) continue;
    if ((inBox(g.a, p.takeoff.x, p.takeoff.z) && inBox(g.b, p.x, p.z)) || (!g.oneway && inBox(g.b, p.takeoff.x, p.takeoff.z) && inBox(g.a, p.x, p.z))) {
      addTrick(g.name, g.pts); UI.gap(g.name + ' +' + g.pts); if (g.goal) goal(g.goal);
    }
  }
  if (map().hangTime && p.airT >= map().hangTime) {
    addTrick('Hang Time', 300); UI.gap('Hang Time +300');
    if (++Game.hangs >= 3) goal('hang');
  }
  p.h = newH; p.stance = stance; p.spd = Math.min(17, spd * 0.96); p.gvy = s * p.spd * DT / n;
  p.state = 'ground'; p.vert = false; p.crouchT = keys.jump ? -1 : 0;
  landCombo(); thud(0.18); emit(p.x, p.y + 0.05, p.z, 10, '#c9b48e', 3, 1.5);
}

function railDir(r) {
  const ux = r.b[0] - r.a[0], uy = r.b[1] - r.a[1], uz = r.b[2] - r.a[2], L = Math.hypot(ux, uy, uz);
  return { ux: ux / L, uy: uy / L, uz: uz / L, L };
}
function startGrind(p, r, t) {
  p.flipT = 0; p.grab = null; spinTrick(p);
  const d = railDir(r);
  let v = p.vel.x * d.ux + p.vel.y * d.uy + p.vel.z * d.uz;
  if (Math.abs(v) < 3) v = (Math.sign(v) || (Math.sin(p.yaw) * d.ux + Math.cos(p.yaw) * d.uz >= 0 ? 1 : -1)) * 3;
  Object.assign(p, { state: 'grind', rail: r, railT: t, railV: v, railStart: t, grindT: 0, bal: (Math.random() - 0.5) * 0.2, balV: 0, vert: false });
  const dk = dirKey();
  const nm = p.sk.type === 'crab' ? 'Royal Crab Walk' : p.sk.duo ? 'Double ' + GRINDS[dk] : GRINDS[dk];
  p.grindYawOff = dk === 'side' ? Math.PI / 2 : 0;
  p.grindEntry = addTrick(nm + (r.ledge ? ' (Ledge)' : r.coping ? ' (Coping)' : ''), r.coping ? 150 : 100);
  thud(0.12);
}
function endGrind(p) {
  const r = p.rail;
  if (r && r.long && Math.abs(p.railT - p.railStart) >= 0.88) goal('rail');
}
function grindExit(p, vy) {
  const r = p.rail, d = railDir(r);
  let vx = d.ux * p.railV, vz = d.uz * p.railV;
  if (r.coping) { const px = -d.uz, pz = d.ux, sgn = (px * -p.x + pz * -p.z) > 0 ? 1 : -1; vx += px * sgn * 2.5; vz += pz * sgn * 2.5; }
  endGrind(p); p.rail = null; goAir(p, vx, vy, vz, 0); p.jumped = true; p.grindCool = 18; p.grindBuf = 0;
}
function stepGrind(p) {
  const r = p.rail, d = railDir(r); p.grindT++;
  p.railV -= G * 0.35 * d.uy * DT; p.railV *= 0.999;
  // balance: a short grace period, gentler drift, stronger correction
  const drift = p.grindT < 45 ? 0 : (0.0009 + (p.grindT - 45) * 0.000011) * p.balMul;
  p.balV += Math.sign(p.bal || (Math.random() - 0.5)) * drift + (Math.random() - 0.5) * 0.0015 * p.balMul;
  if (keys.left) p.balV -= 0.0055; if (keys.right) p.balV += 0.0055;
  p.balV *= 0.93; p.bal = clamp(p.bal + p.balV, -1.25, 1.25);
  setTrickPts(p.grindEntry, (r.coping ? 150 : 100) + p.grindT * 3);
  if (Game.t % 3 === 0) { beep(90 + Math.random() * 30, 0.05, 'sawtooth', 0.025); emit(p.x, p.y, p.z, 3, Math.random() < 0.5 ? '#ffc531' : '#e5392b', 3, 2, 12); }
  if (Math.abs(p.bal) >= 1.2) { endGrind(p); p.grindCool = 40; p.vel = { x: d.ux * p.railV, y: 0, z: d.uz * p.railV }; p.rail = null; bail(p, false); return; }
  if (pressed.jump) { grindExit(p, p.ollie * 0.95); p.crouchT = -1; beep(220, 0.06, 'triangle', 0.07, 440); return; }
  p.railT += p.railV * DT / d.L;
  if (p.railT < 0 || p.railT > 1) { grindExit(p, 1.5); return; }
  p.x = r.a[0] + (r.b[0] - r.a[0]) * p.railT; p.y = r.a[1] + (r.b[1] - r.a[1]) * p.railT; p.z = r.a[2] + (r.b[2] - r.a[2]) * p.railT;
  const fwd = Math.atan2(d.ux, d.uz) + (p.railV < 0 ? Math.PI : 0);
  p.yaw = fwd + p.grindYawOff; p.h = fwd;
  p.pitch = Math.asin(d.uy) * (p.railV < 0 ? -1 : 1); p.roll = p.bal * 0.5;
}

function bail(p, splash) {
  const v = p.state === 'ground' ? { x: Math.sin(p.h) * p.spd, z: Math.cos(p.h) * p.spd } : p.vel;
  p.vel = { x: v.x * 0.5, y: 0, z: v.z * 0.5 };
  Object.assign(p, { state: 'bail', bailT: splash ? 80 : 70, splash, grab: null, flipT: 0, rail: null, spinTotal: 0, vert: false });
  failCombo();
  if (splash) { emit(p.x, (pitAt(p.x, p.z) || { waterY: 0 }).waterY, p.z, 40, map().id === 'hangar' ? '#3a3346' : '#ffffff', 6, 6); beep(200, 0.4, 'sine', 0.08, 60); }
  else { thud(0.4); beep(160, 0.3, 'sawtooth', 0.05, 50); }
  UI.toast(splash ? map().splash : ['Bailed!', 'Ouch!', 'Slammed!', 'Mamma mia!'][Math.floor(Math.random() * 4)], true);
}
function stepBail(p) {
  p.bailT--;
  if (p.splash) p.y -= 0.02;
  else {
    p.vel.y -= G * DT; p.x = clamp(p.x + p.vel.x * DT, -map().bx, map().bx); p.z = clamp(p.z + p.vel.z * DT, -map().bz, map().bz);
    p.vel.x *= 0.94; p.vel.z *= 0.94;
    const gy = H(p.x, p.z); p.y = Math.max(gy, p.y + p.vel.y * DT); if (p.y <= gy) p.vel.y = 0;
    p.roll = p.bailT > 40 ? p.roll + 0.3 : p.roll + (Math.PI / 2 - p.roll) * 0.2;
    if (underWater(p.x, p.y, p.z)) { p.splash = true; p.bailT = Math.max(p.bailT, 40); }
  }
  if (p.bailT <= 0) {
    if (p.splash) { const R0 = map().respawn; p.x = R0.x; p.z = R0.z; p.h = R0.h; }
    Object.assign(p, { y: H(p.x, p.z), state: 'ground', spd: 0, gvy: 0, roll: 0, pitch: 0, splash: false, crouchT: 0, stance: 1 });
  }
}

function pickups(p) {
  for (const it of items) if (!it.got && Math.hypot(it.x - p.x, it.y - (p.y + 0.9), it.z - p.z) < 1.25) {
    it.got = true; it.mesh.visible = false; emit(it.x, it.y, it.z, 16, '#ffc531', 4, 3, 4);
    if (it.kind === 'letter') { Game.letters += it.ch; beep(880, 0.1, 'square', 0.05, 1320); if (Game.letters.length === 5) goal('skate'); }
    else if (it.kind === 'collect') { Game.shells++; beep(1046, 0.15, 'triangle', 0.07); if (Game.shells === 5) goal('collect'); }
    else { beep(392, 0.5, 'triangle', 0.08, 1568); goal('tape'); if (!Game.career) UI.toast('Secret Tape!'); }
  }
  if (p.state === 'grind') return;
  for (const c of crates) if (!c.broken && Math.hypot(p.x - c.x, p.z - c.z) < 0.85 && p.y < c.y + 1.0) {
    c.broken = true; c.mesh.visible = false; Game.cratesBroken++; thud(0.35); beep(140, 0.15, 'square', 0.05, 70);
    emit(c.x, c.y + 0.5, c.z, 24, '#c98b4b', 6, 5); emit(c.x, c.y + 0.5, c.z, 8, '#e5392b', 6, 5);
    if (Game.cratesBroken === 5) goal('smash');
  }
}

// ---------- session marker (R) ----------
const markerMesh = (() => {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.07, 8, 32), new THREE.MeshBasicMaterial({ color: '#ffc531' }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.05;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 8), new THREE.MeshLambertMaterial({ color: '#1f1a2e' }));
  pole.position.y = 1.1;
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.55), new THREE.MeshBasicMaterial({ color: '#e5392b', side: THREE.DoubleSide }));
  flag.position.set(0.47, 1.9, 0);
  g.add(ring, pole, flag); g.visible = false; scene.add(g); return g;
})();
function placeAt(p, spot) {
  Object.assign(p, {
    x: spot.x, z: spot.z, y: H(spot.x, spot.z), h: spot.h, stance: 1, yaw: spot.h, state: 'ground', spd: 0, gvy: 0,
    vel: { x: 0, y: 0, z: 0 }, pitch: 0, roll: 0, flipT: 0, grab: null, rail: null, vert: false, splash: false, bailT: 0, crouchT: keys.jump ? -1 : 0, spinTotal: 0,
  });
  Game.combo = { tricks: [], base: 0 }; Game.comboShow = 0;
  camYaw = spot.h; camera.position.set(p.x - Math.sin(spot.h) * 6.2, p.y + 2.7, p.z - Math.cos(spot.h) * 6.2);
}
function setMarker(p) {
  if (p.state !== 'ground' || inPit(p.x, p.z)) { UI.toast('Land first to drop a marker'); return; }
  Game.marker = { x: p.x, z: p.z, h: p.h };
  markerMesh.position.set(p.x, H(p.x, p.z), p.z); markerMesh.rotation.y = p.h; markerMesh.visible = true;
  UI.toast('Session marker set'); beep(784, 0.08, 'square', 0.05); setTimeout(() => beep(1046, 0.1, 'square', 0.05), 80);
}
function sessionMarker(p) {
  if (keys.marker) { Game.rHold++; if (Game.rHold === 30) setMarker(p); }
  if (released.marker) {
    if (Game.rHold < 30) {
      if (Game.marker) { placeAt(p, Game.marker); beep(523, 0.12, 'triangle', 0.06, 1046); }
      else setMarker(p);
    }
    Game.rHold = 0;
  }
}
function recover(p) { placeAt(p, Game.marker || Game.safe); UI.toast('Back on your feet'); }

function update() {
  const p = Game.p; Game.t++;
  if (pressed.grind) p.grindBuf = 20; else if (p.grindBuf > 0) p.grindBuf--;
  if (p.grindCool > 0) p.grindCool--;
  if (p.state === 'ground') stepGround(p);
  else if (p.state === 'air') stepAir(p);
  else if (p.state === 'grind') stepGrind(p);
  else stepBail(p);
  sessionMarker(p);
  // watchdog: never leave the skater frozen in a broken state
  if (!isFinite(p.x + p.y + p.z + p.spd + p.h) || (p.state === 'air' && p.airT > 360) || (p.state === 'grind' && p.grindT > 900)) recover(p);
  if (p.state === 'ground' && Game.t % 20 === 0 && Math.abs(p.x) < map().bx - 8 && Math.abs(p.z) < map().bz - 8 && !inPit(p.x, p.z)) Game.safe = { x: p.x, z: p.z, h: p.h };
  if (p.state !== 'bail') pickups(p);
  if (!Game.combo.tricks.length) Game.special = Math.max(0, Game.special - 0.00035);
  if (Game.comboShow > 1) Game.comboShow--;
  for (const q of parts) { q.x += q.vx * DT; q.y += q.vy * DT; q.z += q.vz * DT; q.vy -= q.grav * DT; q.life--; }
  while (parts.length && parts[0].life <= 0) parts.shift();
  if (Game.career) {
    if (Game.score >= 15000) goal('high');
    if (Game.score >= 40000) goal('pro');
    if (Game.score >= 100000) goal('sick');
    if (Game.time > 0) Game.time--;
    if (Game.time <= 0) {
      if (!Game.timeUp) { Game.timeUp = true; UI.toast('Time!'); }
      if ((p.state === 'ground' || p.state === 'bail') && !Game.endT) Game.endT = 50;
    }
    if (Game.endT && --Game.endT === 0) UI.endRun();
  }
}

// ---------- render ----------
let camYaw = Math.PI;
const camTarget = new THREE.Vector3(), camWant = new THREE.Vector3();
function render(t) {
  const p = Game.p;
  let want = camYaw;
  if (p.state === 'ground' && p.spd > 0.5) want = p.h;
  else if (p.state === 'grind') want = p.h;
  else if (p.state === 'air' && !p.vert && Math.hypot(p.vel.x, p.vel.z) > 2) want = Math.atan2(p.vel.x, p.vel.z);
  camYaw += wrap(want - camYaw) * (p.state === 'air' ? 0.04 : 0.08);
  const back = p.vert ? 7.5 : 6.2, up = p.vert ? 3.6 : 2.7;
  camWant.set(p.x - Math.sin(camYaw) * back, p.y + up, p.z - Math.cos(camYaw) * back);
  camWant.x = clamp(camWant.x, -map().bx + 0.4, map().bx - 0.4); camWant.z = clamp(camWant.z, -map().bz + 0.4, map().bz - 0.4);
  camWant.y = Math.max(camWant.y, H(camWant.x, camWant.z) + 0.8);
  camera.position.lerp(camWant, 0.12);
  camTarget.set(p.x + Math.sin(camYaw) * 2, p.y + 1.1, p.z + Math.cos(camYaw) * 2);
  camera.lookAt(camTarget);

  sunLight.position.set(p.x + 14, p.y + 26, p.z + 10); sunLight.target.position.set(p.x, p.y, p.z);

  const r = model.root;
  r.position.set(p.x, p.y + (p.splash ? -0.6 : 0), p.z);
  r.rotation.order = 'YXZ'; r.rotation.set(-p.pitch, p.yaw, p.roll);
  const crouch = p.state === 'ground' ? Math.min(1, Math.max(0, p.crouchT) / 10) * 0.8 : p.state === 'air' ? (p.grab ? 0.65 : 0.25) : p.state === 'grind' ? 0.35 : 0.6;
  model.pose({ t, crouch, grab: !!p.grab, flip: p.flipT > 0 ? 1 - p.flipT / p.flipDur : 0, flipKind: p.flipKind, arms: p.special && p.flipT > 0 ? 'up' : 'out' });

  for (const it of items) if (!it.got) { it.mesh.rotation.y = t * 0.002 + it.x; it.mesh.position.y = it.y + Math.sin(t * 0.003 + it.z) * 0.12; }
  for (let i = 0; i < PN; i++) {
    const q = parts[i];
    if (q) { pPos[i * 3] = q.x; pPos[i * 3 + 1] = q.y; pPos[i * 3 + 2] = q.z; tmpC.set(q.col); pCol[i * 3] = tmpC.r; pCol[i * 3 + 1] = tmpC.g; pCol[i * 3 + 2] = tmpC.b; }
    else { pPos[i * 3 + 1] = -999; }
  }
  pGeo.attributes.position.needsUpdate = true; pGeo.attributes.color.needsUpdate = true;
  renderer.render(scene, camera);
}

// ---------- UI ----------
const UI = (() => {
  let selIdx = 0, mapIdx = 0, toastTimer = 0, gapTimer = 0, pending = null;
  const screens = ['title', 'select', 'level', 'pause', 'results'];
  function show(id) {
    screens.forEach(s => $(s).classList.toggle('on', s === id));
    $('hud').classList.toggle('on', id === null || id === 'pause' || id === 'results');
    const scr = id && $(id); if (scr) scr.querySelectorAll('.btn').forEach((x, i) => x.classList.toggle('sel', i === 0));
  }
  function menuMove(d) {
    const scr = $(Game.mode); if (!scr) return;
    const b = [...scr.querySelectorAll('.btn')]; if (!b.length) return;
    let i = b.findIndex(x => x.classList.contains('sel')); i = (i + d + b.length) % b.length;
    b.forEach((x, j) => x.classList.toggle('sel', j === i)); beep(600, 0.04, 'square', 0.03);
  }
  function menuEnter() { const s = $(Game.mode) && $(Game.mode).querySelector('.btn.sel'); if (s) s.click(); }

  const grid = $('grid');
  SKATERS.forEach((sk, i) => {
    const c = document.createElement('div'); c.className = 'card';
    c.innerHTML = `<canvas></canvas><div class="nm">${sk.short || sk.name}</div>`;
    c.onclick = () => { if (selIdx === i) startSel(); else pick(i); };
    grid.appendChild(c);
  });
  function pick(i) {
    selIdx = i; [...grid.children].forEach((c, j) => c.classList.toggle('sel', j === i));
    const sk = SKATERS[i], lock = !isUnlocked(sk);
    const bar = (l, v) => `<div class="stat"><span>${l}</span><div class="bar"><i style="width:${v * 10}%"></i></div><span>${v}</span></div>`;
    $('info').innerHTML = `<span class="from">from ${sk.from}</span><h3>${lock ? '???' : sk.name}</h3><p>${sk.blurb}</p>
      ${bar('Speed', sk.stats.speed)}${bar('Air', sk.stats.air)}${bar('Balance', sk.stats.balance)}
      <div class="special">Special trick <b>${lock ? 'Locked' : sk.special}</b><br>Fill the meter by landing combos, then press <kbd>I</kbd> in the air.</div>
      ${lock ? `<p><b>🔒 Complete 7 career goals (any park) to unlock.</b> You have ${goalCount()}.</p>` : ''}`;
    beep(700, 0.04, 'square', 0.03);
  }
  function openSelect() {
    Game.mode = 'select'; show('select');
    [...grid.children].forEach((c, j) => c.classList.toggle('locked', !isUnlocked(SKATERS[j])));
    pick(selIdx);
  }
  // park select
  const lgrid = $('lgrid');
  MAP_LIST.forEach((m, i) => {
    const c = document.createElement('div'); c.className = 'park ' + m.id;
    c.onclick = () => { if (mapIdx === i) startLevel(); else pickMap(i); };
    lgrid.appendChild(c);
  });
  function pickMap(i) {
    mapIdx = i;
    [...lgrid.children].forEach((c, j) => {
      const m = MAP_LIST[j], done = m.goals.filter(g => save.goals[m.id][g.id]).length;
      c.classList.toggle('sel', j === i);
      c.innerHTML = `<div class="pk-tag">${m.tag}</div><h3>${m.name}</h3><p>${m.blurb}</p>
        <div class="pk-stats"><span>${done}/10 goals</span><span>best ${fmt(save.best[m.id])}</span></div>`;
    });
    beep(700, 0.04, 'square', 0.03);
  }
  function openLevel() { Game.mode = 'level'; show('level'); pickMap(mapIdx); }
  function startLevel() { Game.mapId = MAP_LIST[mapIdx].id; go(SKATERS[selIdx], pending !== 'free'); beep(392, 0.1, 'square', 0.05); setTimeout(() => beep(587, 0.15, 'square', 0.05), 100); }
  function go(sk, career) { Game.last = sk; startRun(sk, career, Game.mapId); Game.mode = 'play'; show(null); }
  function startSel() {
    const sk = SKATERS[selIdx];
    if (!isUnlocked(sk)) { beep(120, 0.2, 'square', 0.05); return; }
    openLevel(); beep(523, 0.06, 'square', 0.04);
  }
  function animPortraits(t) { [...grid.children].forEach((c, j) => drawPortrait(c.querySelector('canvas'), SKATERS[j], j === selIdx ? t : 0)); }

  document.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => act(b.dataset.act)));
  function act(a) {
    ac();
    if (a === 'career' || a === 'free') { pending = a; openSelect(); }
    else if (a === 'howto') { const h = $('howto'); h.style.display = h.style.display === 'none' ? 'block' : 'none'; }
    else if (a === 'resume') { Game.mode = 'play'; show(null); }
    else if (a === 'restart') go(Game.last, Game.career);
    else if (a === 'change') openSelect();
    else if (a === 'park') openLevel();
    else if (a === 'quit') { Game.mode = 'title'; show('title'); }
  }
  function goalsHtml(newOnes) {
    const done = mapGoals();
    return `<div class="goal" style="font-family:var(--display);font-size:20px;font-weight:400">${map().name}</div>`
      + goals().map(g => `<div class="goal ${done[g.id] ? 'done' : ''} ${newOnes.includes(g.id) ? 'new' : ''}"><span class="ck">${done[g.id] ? '✓' : ''}</span>${g.label}</div>`).join('')
      + `<div class="goal" style="opacity:.7"><span class="ck">★</span>${mapGoalCount()}/10 goals · best score ${fmt(save.best[map().id])}</div>`;
  }
  function pause() { Game.mode = 'pause'; $('pGoals').innerHTML = Game.career ? goalsHtml([]) : `<div class="goal">${map().name} · Free Skate: no timer, no goals. Just skate.</div>`; show('pause'); }
  function endRun() {
    const id = map().id, before = save.best[id]; save.best[id] = Math.max(before, Game.score); persist();
    Game.mode = 'results'; show('results');
    $('rTitle').textContent = Game.score > before ? 'New best run!' : 'Run complete';
    $('rScore').textContent = fmt(Game.score);
    const kingNew = Game.newGoals.length && goalCount() >= 7 && goalCount() - Game.newGoals.length < 7;
    $('rUnlock').innerHTML = kingNew ? '<div class="unlock">👑 King Grumbleclaw unlocked</div>' : '';
    $('rGoals').innerHTML = goalsHtml(Game.newGoals);
  }
  function key(k) {
    const m = Game.mode;
    if (m === 'title') { if (k === 'up') menuMove(-1); if (k === 'down') menuMove(1); if (k === 'enter' || k === 'jump') menuEnter(); }
    else if (m === 'select') {
      const n = SKATERS.length, cols = 5;
      if (k === 'left') pick((selIdx - 1 + n) % n); if (k === 'right') pick((selIdx + 1) % n);
      if (k === 'up') pick((selIdx - cols + n) % n); if (k === 'down') pick((selIdx + cols) % n);
      if (k === 'enter' || k === 'jump') startSel(); if (k === 'pause') { Game.mode = 'title'; show('title'); }
    }
    else if (m === 'level') {
      const n = MAP_LIST.length;
      if (k === 'left' || k === 'up') pickMap((mapIdx - 1 + n) % n); if (k === 'right' || k === 'down') pickMap((mapIdx + 1) % n);
      if (k === 'enter' || k === 'jump') startLevel(); if (k === 'pause') openSelect();
    }
    else if (m === 'play') { if (k === 'pause') pause(); if (k === 'hide') $('hKeys').style.display = $('hKeys').style.display === 'none' ? '' : 'none'; }
    else if (m === 'pause' || m === 'results') {
      if (k === 'up' || k === 'left') menuMove(-1); if (k === 'down' || k === 'right') menuMove(1);
      if (k === 'enter') menuEnter(); if (k === 'pause' && m === 'pause') act('resume');
    }
  }
  const itemsEl = $('hItems');
  function startHud() {
    itemsEl.innerHTML = 'SKATE'.split('').map(c => `<span class="lt" data-c="${c}">${c}</span>`).join('') + `<span class="shells" id="hShells">${map().collectIcon} 0/5</span>`;
    $('hWho').textContent = Game.p.sk.name + ' · ' + map().name + (Game.career ? '' : ' · Free Skate');
    $('hCombo').style.display = 'none';
  }
  function hud() {
    const g = Game, p = g.p;
    $('hScore').textContent = fmt(g.score);
    const tm = $('hTime');
    if (g.career) { const s = Math.max(0, Math.ceil(g.time / 60)); tm.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); tm.classList.toggle('low', s <= 10); }
    else tm.textContent = 'FREE';
    const sp = $('hSpec'); sp.firstElementChild.style.width = (g.special * 100) + '%'; sp.classList.toggle('full', g.special >= 1);
    itemsEl.querySelectorAll('.lt').forEach(e => e.classList.toggle('got', g.letters.includes(e.dataset.c)));
    $('hShells').textContent = `${map().collectIcon} ${g.shells}/5`;
    const cb = $('hCombo');
    if (g.combo.tricks.length) {
      cb.style.display = ''; cb.className = 'combo';
      cb.firstElementChild.textContent = g.combo.tricks.map(t => t.name).join(' + ');
      cb.lastElementChild.textContent = `${fmt(g.combo.base)} × ${g.combo.tricks.length}`;
    } else if (g.comboShow > 1 && g.combo.last) {
      const l = g.combo.last; cb.style.display = ''; cb.className = 'combo ' + g.comboState;
      cb.firstElementChild.textContent = l.tricks.map(t => t.name).join(' + ');
      cb.lastElementChild.textContent = g.comboState === 'bank' ? '+' + fmt(g.bankTotal) : fmt(l.base * l.tricks.length);
    } else cb.style.display = 'none';
    const bal = $('hBal');
    if (p.state === 'grind') { bal.style.display = 'block'; bal.firstElementChild.style.left = (50 + clamp(p.bal / 1.2, -1, 1) * 50) + '%'; }
    else bal.style.display = 'none';
  }
  function toast(msg, bad) {
    const t = $('hToast'); t.textContent = msg; t.style.background = bad ? '#e5392b' : ''; t.style.color = bad ? '#fff8ea' : '';
    t.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 1700);
  }
  function gap(msg) { const e = $('hGap'); e.textContent = msg; e.classList.add('on'); clearTimeout(gapTimer); gapTimer = setTimeout(() => e.classList.remove('on'), 1400); }
  show('title');
  return { key, hud, toast, gap, endRun, startHud, animPortraits };
})();

// ---------- input + loop ----------
// Track physical keys so two keys bound to one action (← and A) can't cancel each other out.
const held = new Set();
function syncKey(k) { keys[k] = [...held].some(c => KEYMAP[c] === k); }
addEventListener('keydown', e => {
  const k = KEYMAP[e.code]; if (!k) return;
  e.preventDefault();
  const a = ac(); if (a && a.state === 'suspended') a.resume();
  const was = keys[k]; held.add(e.code); syncKey(k);
  if (!was) { pressed[k] = true; if (!e.repeat) UI.key(k); }
}, true);
addEventListener('keyup', e => {
  const k = KEYMAP[e.code]; if (!k) return;
  e.preventDefault(); held.delete(e.code); const was = keys[k]; syncKey(k); if (was && !keys[k]) released[k] = true;
}, true);
function releaseAll() { held.clear(); for (const k in keys) { if (keys[k]) released[k] = true; keys[k] = false; } }
addEventListener('blur', () => { releaseAll(); if (Game.mode === 'play') UI.key('pause'); });
document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); });
// Clicking the game gives it keyboard focus back; buttons never keep focus (Space would re-click them).
addEventListener('pointerdown', () => window.focus());
document.querySelectorAll('button').forEach(b => b.addEventListener('focus', () => b.blur()));

let last = performance.now(), acc = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(100, now - last); last = now;
  if (Game.mode === 'play') {
    acc += dt; let n = 0;
    while (acc >= 1000 / 60 && n < 5) {
      update(); acc -= 1000 / 60; n++;
      for (const k in pressed) delete pressed[k];
      for (const k in released) delete released[k];
      if (Game.mode !== 'play') break;
    }
    UI.hud();
  } else acc = 0;
  if (Game.p && (Game.mode === 'play' || Game.mode === 'pause' || Game.mode === 'results')) render(now);
  if (Game.mode === 'select') UI.animPortraits(now);
}
requestAnimationFrame(frame);
