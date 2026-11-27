import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';

// Paint Party: 3v3 for territory. Every shot leaves a splat of your team's paint where it hits
// the floor, heroes paint a trail as they run, and an elimination bursts a big splat in the
// killer's colour. Your own paint speeds you up and slowly heals you; the enemy's slows you
// down. The last 30 seconds are a frenzy with bigger splats. Most floor covered at the buzzer wins.
// The floor is a grid of cells (for the score and for what's under your feet) drawn onto one
// canvas texture laid over the ground. Offline only.

export const PAINT = {
  time: 150, cell: 1.5, px: 6,                     // match length, grid cell (m), canvas pixels per cell
  walk: 1.05, walkEvery: 0.12, splat: [1.2, 2.6], kill: 3.4, range: 26,
  own: { speed: 1.18, heal: 5 }, enemy: { speed: 0.84 }, frenzy: 30, frenzyK: 1.5,
};
const TEAM = { blue: 1, red: 2 }, COL = { 1: ['#2f7bff', '#5fa0ff', '#1d5ad8'], 2: ['#ff4d6a', '#ff7a8a', '#d82a4a'] };
const ownerOf = t => TEAM[t] || 0;

export function initPaint(G) {
  const W = G.map.W, L = G.map.L, c = PAINT.cell;
  const nx = Math.ceil(W * 2 / c), nz = Math.ceil(L * 2 / c);
  const grid = new Int8Array(nx * nz);
  // cells under walls and props can't be painted (and don't count)
  let total = 0;
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const x = -W + (i + 0.5) * c, z = -L + (j + 0.5) * c;
    const solid = G.colliders.some(b => b.alive !== false && b.top > 0.6 && b.top < 30 && x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ);
    grid[j * nx + i] = solid ? -1 : 0; if (!solid) total++;
  }
  const cv = document.createElement('canvas'); cv.width = nx * PAINT.px; cv.height = nz * PAINT.px;
  const g = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(nx * c, nz * c), new THREE.MeshLambertMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  mesh.rotation.x = -Math.PI / 2; mesh.position.set(-W + nx * c / 2, 0.035, -L + nz * c / 2); mesh.renderOrder = 1; mesh.receiveShadow = true;
  G.scene.add(mesh);
  G.paint = { nx, nz, grid, total, count: { 1: 0, 2: 0 }, cv, g, tex, mesh, dirty: false, texT: 0, time: PAINT.time, frenzy: false, over: false };
  G.paintShot = paintShot;                                             // units.shoot calls this for every shot
  for (const h of G.heroes) { h.painted = 0; h._walkT = 0; }
}

// Paint a round splat at (x, z) for a team. Returns how many cells changed hands.
export function paintAt(G, x, z, r, team, by) {
  const T = G.paint; if (!T || T.over) return 0;
  const own = ownerOf(team); if (!own) return 0;
  const c = PAINT.cell, W = G.map.W, L = G.map.L;
  const i0 = Math.max(0, Math.floor((x - r + W) / c)), i1 = Math.min(T.nx - 1, Math.floor((x + r + W) / c));
  const j0 = Math.max(0, Math.floor((z - r + L) / c)), j1 = Math.min(T.nz - 1, Math.floor((z + r + L) / c));
  let n = 0;
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const cx = -W + (i + 0.5) * c, cz = -L + (j + 0.5) * c;
    if ((cx - x) ** 2 + (cz - z) ** 2 > r * r) continue;
    const k = j * T.nx + i, was = T.grid[k];
    if (was < 0 || was === own) continue;
    if (was) T.count[was]--;
    T.grid[k] = own; T.count[own]++; n++;
  }
  if (by && n) by.painted = (by.painted || 0) + n;
  // draw it: a main blob and a few drips around it, so splats look splashed rather than stamped
  const g = T.g, s = PAINT.px / c, px = (x + W) * s, pz = (z + L) * s, cols = COL[own];
  g.fillStyle = cols[0]; g.beginPath(); g.arc(px, pz, r * s, 0, Math.PI * 2); g.fill();
  for (let k = 0; k < 4; k++) {
    const a = Math.random() * Math.PI * 2, d = r * (0.7 + Math.random() * 0.5);
    g.fillStyle = cols[k % 3]; g.beginPath(); g.arc(px + Math.cos(a) * d * s, pz + Math.sin(a) * d * s, r * s * (0.18 + Math.random() * 0.22), 0, Math.PI * 2); g.fill();
  }
  T.dirty = true;
  return n;
}

// Every shot: find where it meets the floor (or where it runs out of range) and splat there.
function paintShot(G, h, dir, charge) {
  const T = G.paint; if (!T || T.over || !h.alive) return;
  const w = h.def.weapon;
  if (w.mode === 'mend') return;                                       // heals don't paint
  const ey = h.pos.y + 1.5, range = Math.min(w.range || PAINT.range, PAINT.range);
  let d = range;
  if (dir.y < -0.02) d = Math.min(range, ey / -dir.y);
  const x = h.pos.x + dir.x * d, z = h.pos.z + dir.z * d;
  // slow, heavy weapons splat big; fast ones splat small
  const base = Math.max(PAINT.splat[0], Math.min(PAINT.splat[1], 0.9 + (w.rate || 0.2) * 2.6 + (w.splash || 0) * 0.25 + (charge || 0) * 1.2));
  paintAt(G, x, z, base * (T.frenzy ? PAINT.frenzyK : 1), h.team, h);
}

export function paintKill(G, t, src) {
  if (!G.paint || t.kind !== 'hero') return;
  const team = src?.team && src.team !== t.team ? src.team : t.team === 'blue' ? 'red' : 'blue';
  paintAt(G, t.pos.x, t.pos.z, PAINT.kill * (G.paint.frenzy ? 1.25 : 1), team, src?.kind === 'hero' ? src : null);
}

// the cell under a point: 1 blue, 2 red, 0 bare, -1 wall
export function paintUnder(G, x, z) {
  const T = G.paint; if (!T) return 0;
  const i = Math.floor((x + G.map.W) / PAINT.cell), j = Math.floor((z + G.map.L) / PAINT.cell);
  if (i < 0 || j < 0 || i >= T.nx || j >= T.nz) return 0;
  return T.grid[j * T.nx + i];
}
export const paintShare = G => {
  const T = G.paint; if (!T) return { blue: 0, red: 0 };
  return { blue: T.count[1] / T.total, red: T.count[2] / T.total };
};

export function updatePaint(G, dt) {
  const T = G.paint; if (!T) return;
  // the texture uploads a few times a second, not every splat
  T.texT -= dt;
  if (T.dirty && T.texT <= 0) { T.tex.needsUpdate = true; T.dirty = false; T.texT = 0.08; }
  if (G.over || T.over) { for (const h of G.heroes) h.paintM = 1; return; }
  T.time -= dt;
  if (!T.frenzy && T.time <= PAINT.frenzy) { T.frenzy = true; G.ev.paint?.('frenzy', T); }
  for (const h of G.heroes) {
    if (!h.alive) { h.paintM = 1; continue; }
    // trail: paint under your feet as you run
    if (h.onGround && Math.hypot(h.vel.x, h.vel.z) > 1.5 && (h._walkT = (h._walkT || 0) - dt) <= 0) {
      h._walkT = PAINT.walkEvery;
      paintAt(G, h.pos.x, h.pos.z, PAINT.walk, h.team, h);
    }
    // what you're standing on
    const under = h.onGround ? paintUnder(G, h.pos.x, h.pos.z) : 0, own = ownerOf(h.team);
    h.onPaint = under > 0 ? (under === own ? 'own' : 'enemy') : '';
    h.paintM = h.onPaint === 'own' ? PAINT.own.speed : h.onPaint === 'enemy' ? PAINT.enemy.speed : 1;
    if (h.onPaint === 'own' && h.hp < h.maxHp && G.time - (h.lastHurtT ?? -99) > 2.5) h.hp = Math.min(h.maxHp, h.hp + PAINT.own.heal * dt);
  }
  if (T.time <= 0) {
    T.over = true; T.time = 0;
    const s = paintShare(G);
    G.ev.paint?.('end', T, s.blue === s.red ? null : s.blue > s.red ? 'blue' : 'red', s);
  }
}

// Bots: head for the nearest stretch of floor that isn't yours yet (a new pick every couple of
// seconds), and fight whoever's in the way.
export function paintGoal(G, b, goal) {
  const T = G.paint; if (!T) return null;
  const ai = b.ai;
  if (!ai.paintTo || G.time > (ai.paintT || 0) || Math.hypot(ai.paintTo.x - b.pos.x, ai.paintTo.z - b.pos.z) < 2.5) {
    ai.paintT = G.time + 2 + Math.random() * 1.5;
    const own = ownerOf(b.team), c = PAINT.cell;
    let best = null, bs = Infinity;
    for (let k = 0; k < 40; k++) {
      const i = Math.floor(Math.random() * T.nx), j = Math.floor(Math.random() * T.nz), v = T.grid[j * T.nx + i];
      if (v < 0 || v === own) continue;
      const x = -G.map.W + (i + 0.5) * c, z = -G.map.L + (j + 0.5) * c;
      const sc = Math.hypot(x - b.pos.x, z - b.pos.z) * (v ? 0.7 : 1) + Math.abs(z) * 0.15;   // enemy paint is worth more; the middle matters
      if (sc < bs) { bs = sc; best = { x, z }; }
    }
    ai.paintTo = best || { x: (Math.random() - 0.5) * G.map.W, z: (Math.random() - 0.5) * G.map.L };
  }
  goal.set(ai.paintTo.x, 0, ai.paintTo.z);
  return ai.paintTo;
}
