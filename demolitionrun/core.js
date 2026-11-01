import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';

// Level 1 layout. # wall, B crates, T target, D south gate, X exfil, E guard, P start, H health, A ammo, C charges
export const MAP = [
  '########################',
  '#P...#.I.....B#....T...#',
  '#....#..E.....#........#',
  '#..A.#....B...#..E..B..#',
  '#......................#',
  '##.###...H....####.#####',
  '#.....###..####......C.#',
  '#..E....#..#....B......#',
  '#.T...I.#..#.E.........#',
  '#..B....#..#......###..#',
  '####.####..#####.#SRI#.#',
  '#.........E......##L##.#',
  '#..B....O......B.....E.#',
  '#.....####..####.......#',
  '#..H..#T.....E.#..B..H.#',
  '#.....#..C...I.#.......#',
  '#.E...###..#####...E...#',
  '#...........B.........I#',
  '#########DDDD###########',
  '#########XXXX###########',
  '########################',
];
export const S = 4, WH = 4.2;
export const ROWS = MAP.length, COLS = MAP[0].length;
export const BARRELS = [[10, 4], [4, 11], [6, 17], [18, 8], [12, 12]];
export const TARGET_NAMES = ['COMMS ARRAY', 'FUEL DEPOT', 'GENERATOR'];
export const LEVEL1_DATA = { map: MAP.slice(), barrels: BARRELS.slice(), names: TARGET_NAMES.slice() };
// every level shares the 24×21 grid; swap the contents in place so all modules see the new layout
export function setLevelData({ map, barrels, names }) {
  MAP.splice(0, MAP.length, ...map); BARRELS.splice(0, BARRELS.length, ...barrels); TARGET_NAMES.splice(0, TARGET_NAMES.length, ...names);
}

export const W = { grid: null, gateOpen: false, lockOpen: false, obstacles: [] };
export function resetWorld() { W.grid = MAP.map(r => r.split('')); W.gateOpen = false; W.lockOpen = false; W.obstacles = []; }

export function cell(c, r) { if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return '#'; return W.grid[r][c]; }
// returns inset margin of the solid box in a cell, or -1 for open
export function cellBox(c, r) {
  const ch = cell(c, r);
  if (ch === '#' || ch === 'w') return 0;
  if (ch === 'D') return W.gateOpen ? -1 : 0;
  if (ch === 'L') return W.lockOpen ? -1 : 0;
  if (ch === 'B' || ch === 'T' || ch === 'K' || ch === 'Q' || ch === 'J' || ch === 'U') return 0.6;
  if (ch === 'F') return 1.1;
  if (ch === 'u') return 0.2;
  if (ch === 'c') return 0.5;
  return -1;
}
export function solidAt(x, z) {
  const c = Math.floor(x / S), r = Math.floor(z / S), m = cellBox(c, r);
  if (m < 0) return false;
  const lx = x - c * S, lz = z - r * S;
  return lx >= m && lx <= S - m && lz >= m && lz <= S - m;
}
export function circleHits(x, z, rad) {
  const c0 = Math.floor((x - rad) / S), c1 = Math.floor((x + rad) / S), r0 = Math.floor((z - rad) / S), r1 = Math.floor((z + rad) / S);
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    const m = cellBox(c, r); if (m < 0) continue;
    const nx = Math.max(c * S + m, Math.min(x, c * S + S - m)), nz = Math.max(r * S + m, Math.min(z, r * S + S - m));
    if ((x - nx) ** 2 + (z - nz) ** 2 < rad * rad) return true;
  }
  for (const o of W.obstacles) { if (!o.dead && (x - o.x) ** 2 + (z - o.z) ** 2 < (rad + o.r) ** 2) return true; }
  return false;
}
export function moveCircle(p, dx, dz, rad) {
  if (!circleHits(p.x + dx, p.z, rad)) p.x += dx;
  if (!circleHits(p.x, p.z + dz, rad)) p.z += dz;
}
export function los(ax, az, bx, bz) {
  const d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / 0.3);
  for (let i = 1; i < n; i++) { const t = i / n; if (solidAt(ax + (bx - ax) * t, az + (bz - az) * t)) return false; }
  return true;
}
export function walkable(c, r) { const ch = cell(c, r); return !('#BTKQJUFucw'.includes(ch) || (ch === 'D' && !W.gateOpen) || (ch === 'L' && !W.lockOpen)); }
export function bfs(sc, sr, tc, tr) {
  if (!walkable(tc, tr)) return null;
  const prev = new Int32Array(ROWS * COLS).fill(-2), start = sr * COLS + sc, goal = tr * COLS + tc;
  prev[start] = -1; const q = [start];
  for (let qi = 0; qi < q.length; qi++) {
    const k = q[qi]; if (k === goal) break;
    const c = k % COLS, r = (k / COLS) | 0;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc, nr = r + dr; if (!walkable(nc, nr)) continue;
      const nk = nr * COLS + nc; if (prev[nk] !== -2) continue;
      prev[nk] = k; q.push(nk);
    }
  }
  if (prev[goal] === -2) return null;
  const path = []; for (let k = goal; k !== start && k !== -1; k = prev[k]) path.push([k % COLS, (k / COLS) | 0]);
  return path.reverse();
}
export const wrapA = a => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };

// ---------- canvas textures ----------
export function makeTex(draw, w = 256, h = 256, rx = 1, ry = 1) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
export function grain(g, w, h, base, amt = 0.08, n = 5000) {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) {
    const v = Math.random() * amt; g.fillStyle = Math.random() < .5 ? `rgba(0,0,0,${v})` : `rgba(255,255,255,${v})`;
    g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }
}
export function stripes(g, x, y, w, h, a = '#f2b51c', b = '#1d1b16', s = 24) {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.fillStyle = a; g.fillRect(x, y, w, h); g.fillStyle = b;
  for (let i = -h; i < w + h; i += s * 2) { g.beginPath(); g.moveTo(x + i, y + h); g.lineTo(x + i + h, y); g.lineTo(x + i + h + s, y); g.lineTo(x + i + s, y + h); g.fill(); }
  g.restore();
}

// ---------- audio ----------
let AC = null, NB = null, OUT = null, VOL = .8;
export function audio() {
  if (!AC) { AC = new (window.AudioContext || window.webkitAudioContext)(); OUT = AC.createGain(); OUT.gain.value = VOL; OUT.connect(AC.destination); }
  if (AC.state === 'suspended') AC.resume();
  return AC;
}
export function setVolume(v) { VOL = v; if (OUT) OUT.gain.value = v; }
function noiseBuf(a) {
  if (!NB) { NB = a.createBuffer(1, a.sampleRate * 2, a.sampleRate); const d = NB.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  return NB;
}
function nz({ dur, freq, q = 1, type = 'lowpass', vol = .5 }) {
  if (!AC) return; const a = AC, t = a.currentTime;
  const s = a.createBufferSource(); s.buffer = noiseBuf(a);
  const f = a.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = a.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
  s.connect(f).connect(g).connect(OUT); s.start(t, Math.random()); s.stop(t + dur + .05);
}
function tone(f0, f1, dur, vol = .15, type = 'square') {
  if (!AC) return; const a = AC, t = a.currentTime;
  const o = a.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  const g = a.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
  o.connect(g).connect(OUT); o.start(t); o.stop(t + dur + .05);
}
let alarmNodes = null, chopNodes = null, humNodes = null, droneNodes = null, windNodes = null;
export function windLevel(v) { if (windNodes) windNodes[2].gain.value = v; }
export const sfx = {
  shot() { nz({ dur: .16, freq: 1900, type: 'bandpass', q: .6, vol: .7 }); nz({ dur: .09, freq: 350, vol: .6 }); tone(160, 60, .08, .25, 'triangle'); },
  enemyShot(d) { const v = Math.max(.08, 1 - d / 40); nz({ dur: .14, freq: 1300, type: 'bandpass', q: .7, vol: .4 * v }); nz({ dur: .07, freq: 300, vol: .3 * v }); },
  boom(v = 1) { nz({ dur: 1.8, freq: 380, vol: .9 * v }); nz({ dur: .5, freq: 2400, vol: .4 * v }); tone(70, 28, 1.1, .6 * v, 'sine'); },
  click() { tone(1800, 1500, .03, .1); },
  reload() { tone(900, 700, .04, .12); setTimeout(() => tone(500, 400, .05, .14), 500); setTimeout(() => tone(1200, 900, .05, .14), 1150); },
  hit(head) { tone(head ? 1600 : 1100, head ? 1500 : 1000, .06, .12, 'sine'); },
  hurt() { nz({ dur: .2, freq: 600, vol: .35 }); tone(180, 90, .15, .15, 'sawtooth'); },
  beep(f = 1500) { tone(f, f, .07, .1, 'square'); },
  pickup() { tone(700, 1400, .12, .12, 'triangle'); },
  plant() { [0, 90, 180].forEach((d, i) => setTimeout(() => tone(1200 + i * 300, 1200 + i * 300, .07, .12), d)); },
  whiz() { nz({ dur: .12, freq: 3500, type: 'bandpass', q: 3, vol: .15 }); },
  radio() { nz({ dur: .09, freq: 2600, type: 'bandpass', q: 2, vol: .18 }); tone(1900, 1900, .05, .05, 'square'); },
  blip(f = 700) { tone(f, f, .025, .025, 'square'); },
  step() { nz({ dur: .07, freq: 500 + Math.random() * 200, vol: .07 }); },
  ring() { tone(3100, 2900, 3.5, .06, 'sine'); },
  chopper(on) {
    if (!AC) return;
    if (on && !chopNodes) {
      const s = AC.createBufferSource(); s.buffer = noiseBuf(AC); s.loop = true;
      const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 260;
      const g = AC.createGain(), l = AC.createOscillator(), lg = AC.createGain();
      g.gain.value = .25; l.frequency.value = 11; lg.gain.value = .22; l.connect(lg).connect(g.gain);
      s.connect(f).connect(g).connect(OUT); s.start(); l.start(); chopNodes = [s, l];
    } else if (!on && chopNodes) { chopNodes.forEach(n => n.stop()); chopNodes = null; }
  },
  hum(on) {
    if (!AC) return;
    if (on && !humNodes) {
      const o = AC.createOscillator(), o2 = AC.createOscillator(), g = AC.createGain();
      o.frequency.value = 50; o2.frequency.value = 100.6; o2.type = 'triangle'; g.gain.value = .018;
      o.connect(g); o2.connect(g); g.connect(OUT); o.start(); o2.start(); humNodes = [o, o2];
    } else if (!on && humNodes) { humNodes.forEach(n => n.stop()); humNodes = null; }
  },
  clank() { tone(220 + Math.random() * 200, 90, .25, .05, 'triangle'); nz({ dur: .3, freq: 1500, type: 'bandpass', q: 4, vol: .05 }); },
  chime(f = 1320) { tone(f, f * 1.01, 1.2, .07, 'sine'); tone(f * 1.5, f * 1.5, .9, .04, 'sine'); },
  shard() { tone(2400, 900, .25, .08, 'sine'); nz({ dur: .15, freq: 5000, type: 'highpass', vol: .06 }); },
  shatter() { nz({ dur: .5, freq: 6000, type: 'highpass', vol: .3 }); [0, 60, 130].forEach(d => setTimeout(() => tone(2000 + Math.random() * 2000, 1500, .3, .05, 'sine'), d)); },
  blink() { tone(300, 2400, .18, .07, 'sine'); },
  knife() { nz({ dur: .12, freq: 4200, type: 'highpass', vol: .2 }); tone(200, 80, .12, .12, 'triangle'); },
  pump() { nz({ dur: .3, freq: 1100, type: 'lowpass', vol: .7 }); nz({ dur: .12, freq: 300, vol: .7 }); tone(110, 45, .16, .3, 'triangle'); },
  unlock() { [0, 120, 240].forEach((d, i) => setTimeout(() => tone(600 + i * 400, 600 + i * 400, .1, .1, 'square'), d)); nz({ dur: .8, freq: 300, vol: .2 }); },
  sour() { tone(330, 311, .6, .08, 'sawtooth'); tone(349, 340, .6, .06, 'sawtooth'); },
  camera() { tone(1500, 1500, .08, .06, 'square'); setTimeout(() => tone(1500, 1500, .08, .06, 'square'), 140); },
  intel() { tone(880, 880, .08, .1, 'triangle'); setTimeout(() => tone(1320, 1320, .18, .1, 'triangle'), 90); },
  slash() { nz({ dur: .18, freq: 2600, type: 'bandpass', q: 1.5, vol: .3 }); tone(500, 120, .15, .08, 'sawtooth'); },
  ink() { nz({ dur: .9, freq: 260, vol: .25 }); tone(90, 50, .8, .1, 'sine'); },
  pulse() { tone(60, 30, 1, .5, 'sine'); nz({ dur: .8, freq: 500, vol: .3 }); },
  beat() { tone(55, 40, .18, .25, 'sine'); setTimeout(() => tone(50, 38, .2, .2, 'sine'), 220); },
  bell(f = 520) { tone(f, f, 2.4, .08, 'sine'); tone(f * 2.76, f * 2.76, 1.2, .03, 'sine'); },
  // the Second Choir's great bell: a rising warning, then a deep toll
  tollWarn() { tone(110, 440, 4.5, .07, 'sine'); tone(165, 660, 4.5, .04, 'triangle'); },
  toll() { tone(98, 96, 4, .4, 'sine'); tone(98 * 2.4, 98 * 2.4, 3, .12, 'sine'); tone(98 * 5.4, 98 * 5.3, 1.6, .05, 'sine'); nz({ dur: 1.2, freq: 300, vol: .3 }); },
  crack() { nz({ dur: .4, freq: 1800, type: 'bandpass', q: 1, vol: .25 }); tone(300, 90, .3, .1, 'triangle'); },
  swing() { nz({ dur: .22, freq: 900, type: 'bandpass', q: .8, vol: .18 }); },
  thud() { tone(140, 50, .18, .35, 'sine'); nz({ dur: .14, freq: 600, vol: .4 }); },
  smash() { tone(90, 30, .5, .6, 'sine'); nz({ dur: .7, freq: 400, vol: .7 }); nz({ dur: .3, freq: 2400, type: 'bandpass', q: 1, vol: .25 }); },
  rubble() { nz({ dur: 1.3, freq: 350, vol: .55 }); [0, 110, 260, 420].forEach(d => setTimeout(() => tone(180 + Math.random() * 120, 60, .2, .12, 'triangle'), d)); },
  gust() { nz({ dur: 3.2, freq: 700, type: 'bandpass', q: .5, vol: .22 }); },
  wind(on) {
    if (!AC) return;
    if (on && !windNodes) {
      const s = AC.createBufferSource(); s.buffer = noiseBuf(AC); s.loop = true;
      const f = AC.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 500; f.Q.value = .6;
      const g = AC.createGain(); g.gain.value = .12; s.connect(f).connect(g).connect(OUT); s.start(); windNodes = [s, f, g];
    } else if (!on && windNodes) { windNodes[0].stop(); windNodes = null; }
  },
  free() { tone(400, 400, .08, .1, 'square'); setTimeout(() => tone(800, 800, .14, .1, 'triangle'), 100); nz({ dur: .5, freq: 900, type: 'bandpass', q: 2, vol: .15 }); },
  rumble(v = .5) { nz({ dur: 2.5, freq: 90, vol: v }); },
  whisper() { nz({ dur: 1.4, freq: 3000, type: 'bandpass', q: 6, vol: .06 }); tone(220, 180, 1.4, .02, 'sine'); },
  drone(on) {
    if (!AC) return;
    if (on && !droneNodes) {
      const g = AC.createGain(); g.gain.value = .02; g.connect(OUT);
      droneNodes = [110, 164.8, 220.6].map(f => { const o = AC.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.connect(g); o.start(); return o; });
    } else if (!on && droneNodes) { droneNodes.forEach(n => n.stop()); droneNodes = null; }
  },
  alarm(on) {
    if (!AC) return;
    if (on && !alarmNodes) {
      const o = AC.createOscillator(), l = AC.createOscillator(), lg = AC.createGain(), g = AC.createGain();
      o.type = 'sawtooth'; o.frequency.value = 620; l.frequency.value = .7; lg.gain.value = 180; g.gain.value = .025;
      l.connect(lg).connect(o.frequency); o.connect(g).connect(OUT); o.start(); l.start(); alarmNodes = [o, l];
    } else if (!on && alarmNodes) { alarmNodes.forEach(n => n.stop()); alarmNodes = null; }
  },
};
