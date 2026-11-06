// Seeded room generator + platformer physics. Rooms are 30x17 tiles of 16px.
const TS = 16, COLS = 30, ROWS = 17, W = COLS * TS, H = ROWS * TS;
const EMPTY = 0, SOLID = 1, SPIKE = 2, SPIKE_DN = 3, CRUMBLE = 4;

const THEMES = [
  {name:'Guiseppe Orchard', bg:'#fbe9cf', far:'#f5d3a8', tile:'#e0201f', top:'#3ccf6e', edge:'#9c1414', spike:'#1d1a2f'},
  {name:'Otis Orbit',       bg:'#e4ecff', far:'#c9d6ff', tile:'#5a3dff', top:'#ffd23f', edge:'#2e1f99', spike:'#ff3b5c'},
  {name:'Rhyme Stage',      bg:'#ffe6f2', far:'#ffc6e1', tile:'#d94fd0', top:'#ffe066', edge:'#8a2a85', spike:'#1d1a2f'},
  {name:'Turbo Checkers',   bg:'#eef4e4', far:'#d6e6c4', tile:'#1d1a2f', top:'#ffffff', edge:'#000000', spike:'#ff3b3b'},
  {name:'Watt Storm',       bg:'#fff6cc', far:'#ffe98a', tile:'#3a2a8a', top:'#ffd23f', edge:'#1e1550', spike:'#ff7a1f'},
  {name:'Isa Frost',        bg:'#e6f8ff', far:'#c4ecff', tile:'#4fa8e8', top:'#ffffff', edge:'#2a6fa8', spike:'#1d1a2f'},
  {name:'Demolition Camo',  bg:'#f0ecd8', far:'#ddd5b0', tile:'#6b7a4a', top:'#c8b06a', edge:'#3e4a26', spike:'#ff7a1f'}
];
const themeFor = room => THEMES[Math.floor((room - 1) / 5) % THEMES.length];

function rngFrom(seed){
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

function genRoom(n){
  const rnd = rngFrom(n * 7919 + 13), ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const d = Math.min(1, (n - 1) / 25);
  const g = Array.from({length: ROWS}, () => new Array(COLS).fill(EMPTY));
  const saws = [], movers = [];
  for (let x = 0; x < COLS; x++) g[0][x] = SOLID;
  for (let y = 0; y < ROWS; y++){ g[y][0] = SOLID; g[y][COLS - 1] = SOLID; }
  const fill = (x, h) => { for (let y = h; y < ROWS; y++) g[y][x] = SOLID; };
  let h = 14;
  for (let x = 1; x <= 3; x++) fill(x, h);
  const spawn = {x: 2 * TS, y: h * TS};
  let x = 4;
  const kinds = ['flat', 'pit', 'step', 'spike', 'float', 'saw', 'ceiling', 'crumble', 'mover', 'double'];
  const weights = [3 - d * 2, 3, 2, 2 + d, 1 + d * 2, d * 3, d * 2.5, d * 2, 1 + d, d * 2];
  const pick = () => { let t = weights.reduce((a, b) => a + b, 0) * rnd(); for (let i = 0; i < kinds.length; i++){ t -= weights[i]; if (t <= 0) return kinds[i]; } return 'flat'; };
  let last = '';
  while (x < 26){
    let k = pick(); if (k === last && k !== 'pit') k = 'flat'; last = k;
    const room = 26 - x;
    if (k === 'flat'){ const w = Math.min(room, ri(1, 3)); for (let i = 0; i < w; i++) fill(x++, h); }
    else if (k === 'pit' && room >= 5){
      const w = ri(2, d > 0.5 ? 4 : 3);
      for (let i = 0; i < w; i++){ g[ROWS - 1][x] = SPIKE; x++; }
      h = Math.max(10, Math.min(14, h + ri(-1, 1))); fill(x++, h);
    }
    else if (k === 'step'){ h = Math.max(9, Math.min(14, h + (rnd() < 0.5 ? -ri(1, 2) : ri(1, 3)))); fill(x++, h); fill(x++, h); }
    else if (k === 'spike' && room >= 4){
      fill(x++, h); fill(x, h); g[h - 1][x] = SPIKE; x++;
      if (d > 0.4 && rnd() < 0.5){ fill(x, h); g[h - 1][x] = SPIKE; x++; }
      fill(x++, h);
    }
    else if (k === 'float' && room >= 6){
      const w = ri(4, 5), py = h - ri(1, 2);
      for (let i = 0; i < w; i++){ g[ROWS - 1][x + i] = SPIKE; }
      g[py][x + Math.floor(w / 2)] = SOLID; if (w === 5 && rnd() < 0.5 - d * 0.3) g[py][x + 3] = SOLID;
      x += w; fill(x++, h);
    }
    else if (k === 'saw' && room >= 4){
      for (let i = 0; i < 4; i++) fill(x + i, h);
      const vert = rnd() < 0.5;
      saws.push(vert ? {cx: (x + 2) * TS, cy: (h - 3) * TS, ax: 0, ay: 2.4 * TS, sp: 0.03 + d * 0.03, ph: rnd() * 6, r: 7}
                     : {cx: (x + 2) * TS, cy: (h - 1) * TS + 2, ax: 1.6 * TS, ay: 0, sp: 0.03 + d * 0.025, ph: rnd() * 6, r: 7});
      x += 4;
    }
    else if (k === 'ceiling' && room >= 4){
      const w = ri(3, 4), cy = h - 3;
      for (let i = 0; i < w; i++){ fill(x + i, h); for (let y = 1; y < cy; y++) g[y][x + i] = SOLID; g[cy][x + i] = SPIKE_DN; }
      if (rnd() < d){ g[h - 1][x + 1 + ri(0, w - 3)] = SPIKE; }
      x += w;
    }
    else if (k === 'crumble' && room >= 6){
      const w = ri(4, 5);
      for (let i = 0; i < w; i++){ g[ROWS - 1][x + i] = SPIKE; if (i > 0 && i < w - 1) g[h][x + i] = CRUMBLE; }
      x += w; fill(x++, h);
    }
    else if (k === 'mover' && room >= 7){
      const w = 6;
      for (let i = 0; i < w; i++) g[ROWS - 1][x + i] = SPIKE;
      movers.push({x0: (x + 1) * TS, y: h * TS, ax: 3 * TS, w: 2 * TS, sp: 0.022 + d * 0.012, ph: rnd() * 6, px: 0, dx: 0});
      x += w; fill(x++, h);
    }
    else if (k === 'double' && room >= 5){
      fill(x++, h); fill(x, h); g[h - 1][x] = SPIKE; x++;
      fill(x, h); g[h - 1][x] = SPIKE; x++; fill(x++, h);
      saws.push({cx: (x - 2.5) * TS, cy: (h - 4) * TS, ax: 0, ay: 1.2 * TS, sp: 0.05, ph: rnd() * 6, r: 6});
    }
    else { fill(x++, h); }
  }
  for (; x < COLS - 1; x++) fill(x, h);
  return {n, g, saws, movers, spawn, door: {x: 27 * TS, y: (h - 2) * TS, w: TS, h: 2 * TS}, crumbles: {}, theme: themeFor(n), t: 0};
}

// ---------- physics ----------
const PW = 10, PH = 15;
const P = {acc: 0.55, airAcc: 0.38, max: 2.3, fric: 0.72, grav: 0.36, jump: -6.1, maxFall: 7, coyote: 6, buffer: 7};

function makePlayer(room){ return {x: room.spawn.x - PW / 2, y: room.spawn.y - PH, vx: 0, vy: 0, face: 1, ground: false, coy: 0, buf: 0, dead: 0, t: 0}; }

function solidAt(room, tx, ty){
  if (tx < 0 || tx >= COLS || ty < 0) return true;
  if (ty >= ROWS) return false;
  const v = room.g[ty][tx];
  if (v === SOLID) return true;
  if (v === CRUMBLE){ const c = room.crumbles[ty * COLS + tx]; return !c || c < 26; }
  return false;
}
function hitsSolid(room, x, y, w, h){
  for (let ty = Math.floor(y / TS); ty <= Math.floor((y + h - 0.01) / TS); ty++)
    for (let tx = Math.floor(x / TS); tx <= Math.floor((x + w - 0.01) / TS); tx++)
      if (solidAt(room, tx, ty)) return true;
  return false;
}
function moverUnder(room, p){
  for (const m of room.movers){ if (p.x + PW > m.px && p.x < m.px + m.w && Math.abs(p.y + PH - m.y) < 1.5 && p.vy >= 0) return m; }
  return null;
}

// Moving parts only. Spectators run this too so saws and lifts match the player's screen.
function tickHazards(room){
  room.t++;
  for (const m of room.movers){ const nx = m.x0 + Math.sin(room.t * m.sp + m.ph) * m.ax / 2 + m.ax / 2; m.dx = m.px ? nx - m.px : 0; m.px = nx; }
  for (const k in room.crumbles){ room.crumbles[k]++; if (room.crumbles[k] > 160) delete room.crumbles[k]; }
  for (const s of room.saws){ const k = Math.sin(room.t * s.sp + s.ph); s.x = s.cx + k * s.ax; s.y = s.cy + k * s.ay; }
}
function touchCrumbles(room, x, y){
  const ty = Math.floor((y + PH + 1) / TS);
  for (let tx = Math.floor(x / TS); tx <= Math.floor((x + PW - 0.01) / TS); tx++)
    if (ty < ROWS && room.g[ty][tx] === CRUMBLE && !room.crumbles[ty * COLS + tx]) room.crumbles[ty * COLS + tx] = 1;
}

// returns 'die' | 'exit' | null
function step(room, p, input){
  tickHazards(room);
  p.t++;
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (dir) p.face = dir;
  const a = p.ground ? P.acc : P.airAcc;
  if (dir) p.vx = Math.max(-P.max, Math.min(P.max, p.vx + dir * a));
  else p.vx *= p.ground ? P.fric : 0.9;
  if (Math.abs(p.vx) < 0.05) p.vx = 0;
  if (input.jumpPressed) p.buf = P.buffer; else if (p.buf > 0) p.buf--;
  if (p.ground) p.coy = P.coyote; else if (p.coy > 0) p.coy--;
  let jumped = false;
  if (p.buf > 0 && p.coy > 0){ p.vy = P.jump; p.buf = 0; p.coy = 0; p.ground = false; jumped = true; }
  if (!input.jump && p.vy < -2.2) p.vy *= 0.55;
  p.vy = Math.min(P.maxFall, p.vy + P.grav);
  const riding = moverUnder(room, p);
  if (riding && !jumped) p.x += riding.dx;
  // x
  p.x += p.vx;
  if (hitsSolid(room, p.x, p.y, PW, PH)){
    const s = Math.sign(p.vx) || 1; p.x -= p.vx;
    for (let i = 0; i < 12 && !hitsSolid(room, p.x + s * 0.5, p.y, PW, PH); i++) p.x += s * 0.5;
    p.vx = 0;
  }
  // y
  p.y += p.vy; p.ground = false;
  if (hitsSolid(room, p.x, p.y, PW, PH)){
    const s = Math.sign(p.vy) || 1; p.y -= p.vy;
    for (let i = 0; i < 16 && !hitsSolid(room, p.x, p.y + s * 0.5, PW, PH); i++) p.y += s * 0.5;
    if (s > 0) p.ground = true;
    p.vy = 0;
  }
  for (const m of room.movers){
    if (p.vy >= 0 && p.x + PW > m.px && p.x < m.px + m.w && p.y + PH >= m.y && p.y + PH - p.vy <= m.y + 2){ p.y = m.y - PH; p.vy = 0; p.ground = true; }
  }
  // crumble trigger
  if (p.ground) touchCrumbles(room, p.x, p.y);
  p.jumped = jumped;
  // hazards
  const hx = p.x + 2, hy = p.y + 3, hw = PW - 4, hh = PH - 4;
  for (let ty = Math.floor(hy / TS); ty <= Math.floor((hy + hh) / TS); ty++)
    for (let tx = Math.floor(hx / TS); tx <= Math.floor((hx + hw) / TS); tx++){
      if (ty < 0 || ty >= ROWS || tx < 0 || tx >= COLS) continue;
      const v = room.g[ty][tx];
      if (v === SPIKE && hy + hh > ty * TS + 8 && hx + hw > tx * TS + 3 && hx < tx * TS + 13) return 'die';
      if (v === SPIKE_DN && hy < ty * TS + 8 && hx + hw > tx * TS + 3 && hx < tx * TS + 13) return 'die';
    }
  for (const s of room.saws){
    const sx = s.x, sy = s.y;
    const nx = Math.max(hx, Math.min(sx, hx + hw)), ny = Math.max(hy, Math.min(sy, hy + hh));
    if ((nx - sx) ** 2 + (ny - sy) ** 2 < s.r * s.r) return 'die';
  }
  if (p.y > H + 20) return 'die';
  const dr = room.door;
  if (p.x + PW > dr.x + 4 && p.x < dr.x + dr.w - 4 && p.y + PH > dr.y && p.y < dr.y + dr.h) return 'exit';
  return null;
}
