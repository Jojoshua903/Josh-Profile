import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { box, mat } from './chars.js';

// World space: one tile = 1 unit. Column c sits at x = c, row r at z = -r.
export const COLS = 6;            // playable columns run -COLS..COLS
const HALF_W = 16;                 // lanes are drawn this far out on each side
const WRAP = 19;                   // traffic wraps around past this x
const CAR_COLORS = [0xff3b3b, 0xffd23f, 0x3ccf6e, 0xff7ccf, 0xff7a1f, 0x8a5cff, 0x1fb5a6, 0xffffff];

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];

function ground(g, w, color, side, y = -0.1, h = 0.2) {
  box(g, (COLS * 2 + 1), h, 1, color, 0, y, 0);
  [-1, 1].forEach(s => box(g, HALF_W - COLS - 0.5, h, 1, side, s * (COLS + 0.5 + (HALF_W - COLS - 0.5) / 2), y, 0));
}

function tree(g, x) {
  const t = new THREE.Group(); t.position.set(x, 0, 0); g.add(t);
  const h = Math.floor(rnd(1, 4));
  box(t, 0.24, 0.3, 0.24, 0x8b5a2b, 0, 0.15, 0);
  for (let i = 0; i < h; i++) box(t, 0.7 - i * 0.08, 0.36, 0.7 - i * 0.08, i % 2 ? 0x3aa655 : 0x2f9a46, 0, 0.48 + i * 0.36, 0);
  return t;
}
function rock(g, x) { const r = box(g, rnd(0.55, 0.75), rnd(0.3, 0.45), rnd(0.55, 0.75), 0x9a9aa8, x, 0.18, 0); r.rotation.y = rnd(-0.3, 0.3); return r; }

function car(kind) {
  const g = new THREE.Group(); let len;
  const wheel = (x, z) => box(g, 0.28, 0.28, 0.12, 0x1d1a2f, x, 0.14, z);
  if (kind === 'meta') {
    len = 2.0;
    box(g, 1.9, 0.7, 0.8, 0x0866ff, 0, 0.5, 0); box(g, 0.4, 0.3, 0.72, 0xbfefff, 0.78, 0.66, 0);
    [-1, 1].forEach(s => { box(g, 0.8, 0.36, 0.04, 0xffffff, -0.2, 0.56, s * 0.41); [-1, 0, 1].forEach(i => box(g, 0.08, 0.08, 0.05, 0x0866ff, -0.2 + i * 0.18, 0.56, s * 0.42)); });
    [-0.6, 0.6].forEach(x => [-0.36, 0.36].forEach(z => wheel(x, z)));
  } else if (kind === 'truck') {
    len = 2.8; const c = pick(CAR_COLORS);
    box(g, 0.7, 0.7, 0.8, c, 1.0, 0.5, 0); box(g, 0.3, 0.3, 0.72, 0xbfefff, 1.25, 0.65, 0);
    box(g, 1.9, 0.9, 0.86, 0xf4f0e6, -0.4, 0.6, 0); box(g, 1.9, 0.12, 0.88, c, -0.4, 0.3, 0);
    [-1.1, -0.2, 1.0].forEach(x => [-0.38, 0.38].forEach(z => wheel(x, z)));
  } else if (kind === 'bus') {
    len = 3.2;
    box(g, 3.1, 0.85, 0.86, 0xffd23f, 0, 0.55, 0); box(g, 3.12, 0.22, 0.88, 0xbfefff, 0, 0.72, 0);
    box(g, 3.13, 0.08, 0.89, 0x1d1a2f, 0, 0.38, 0);
    [-1.1, 1.1].forEach(x => [-0.38, 0.38].forEach(z => wheel(x, z)));
  } else {
    len = 1.6; const c = pick(CAR_COLORS);
    box(g, 1.5, 0.38, 0.8, c, 0, 0.3, 0); box(g, 0.8, 0.3, 0.7, 0xbfefff, -0.1, 0.62, 0); box(g, 0.84, 0.06, 0.72, c, -0.1, 0.8, 0);
    box(g, 0.06, 0.1, 0.2, 0xfff6a0, 0.76, 0.34, 0.25, 0xffee66); box(g, 0.06, 0.1, 0.2, 0xfff6a0, 0.76, 0.34, -0.25, 0xffee66);
    [-0.5, 0.5].forEach(x => [-0.36, 0.36].forEach(z => wheel(x, z)));
  }
  return { mesh: g, len, kind };
}

function log(len) {
  const g = new THREE.Group();
  box(g, len - 0.1, 0.28, 0.72, 0x8b5a2b, 0, 0, 0); box(g, len - 0.1, 0.06, 0.6, 0xa8794a, 0, 0.16, 0);
  [-1, 1].forEach(s => box(g, 0.04, 0.22, 0.6, 0xd9a441, s * (len / 2 - 0.05), 0, 0));
  return g;
}

function train() {
  const g = new THREE.Group(); const cars = 4, L = 3;
  for (let i = 0; i < cars; i++) {
    const x = -i * L, c = i === 0 ? 0xff3b3b : 0x0866ff;
    box(g, L - 0.15, 1.0, 0.9, c, x, 0.65, 0); box(g, L - 0.15, 0.2, 0.92, 0xffffff, x, 0.85, 0);
    box(g, L - 0.15, 0.1, 0.92, 0x1d1a2f, x, 0.2, 0);
    if (i === 0) { box(g, 0.5, 0.6, 0.8, 0x1d1a2f, x + 1.3, 1.25, 0); box(g, 0.06, 0.16, 0.5, 0xfff6a0, x + 1.43, 0.55, 0, 0xffee66); }
  }
  return { mesh: g, len: cars * L };
}

function coin() {
  const g = new THREE.Group();
  box(g, 0.36, 0.36, 0.08, 0xffd23f, 0, 0, 0, 0x664400); box(g, 0.12, 0.2, 0.1, 0xffaa00, 0, 0, 0);
  g.position.y = 0.45; return g;
}

export class World {
  constructor(scene) { this.scene = scene; this.lanes = new Map(); this.top = -1; this.reset(); }

  reset() {
    for (const l of this.lanes.values()) this.scene.remove(l.g);
    this.lanes.clear(); this.top = -8; this.streak = { type: 'grass', left: 4 };
    // ability hooks: global speed multiplier, full freeze, lights-out timer, slow-zone row, train warning time
    this.slow = 1; this.freezeT = 0; this.darkT = 0; this.casperRow = null; this.warnTime = 1.4;
    this.ensure(22);
  }

  // Lane type for a new row: runs of the same type, harder further out.
  // Chapter checkpoints: the chapter row and the one after it are always open meadow.
  safe(row) { return !!this.safeRows && (this.safeRows.has(row) || this.safeRows.has(row - 1)); }

  nextType(row) {
    if (row < 5) return 'grass';
    if (this.safe(row)) { this.streak = { type: 'grass', left: 0 }; return 'grass'; }
    const s = this.streak;
    if (s.left > 0) { s.left--; return s.type; }
    const d = Math.min(1, row / 180);
    const r = Math.random();
    let t;
    if (s.type !== 'grass' && r < 0.45) t = 'grass';
    else if (r < 0.45 + 0.35) t = 'road';
    else if (r < 0.9) t = 'river';
    else t = 'rail';
    if (t === s.type && t !== 'road') t = 'grass';
    const max = t === 'road' ? 2 + Math.round(d * 3) : t === 'river' ? 1 + Math.round(d * 2) : t === 'rail' ? 1 : 2;
    s.type = t; s.left = Math.floor(rnd(0, max));
    return t;
  }

  ensure(upTo) {
    while (this.top < upTo) { this.top++; this.make(this.top); }
  }

  make(row) {
    const type = row < 0 ? 'wall' : this.nextType(row);
    const g = new THREE.Group(); g.position.z = -row; this.scene.add(g);
    const lane = { row, type, g, blocked: new Set(), obst: new Map(), movers: [], coins: new Map(), clearT: 0, frozenT: 0 };
    const d = Math.min(1, Math.max(0, row) / 200);
    if (type === 'grass' || type === 'wall') {
      const safe = type === 'grass' && this.safe(row);
      lane.safe = safe;
      ground(g, 0, row % 2 ? 0xa6e36b : 0x9ad85e, row % 2 ? 0x86c14f : 0x7cb648);
      if (safe) {
        // brighter checkered meadow so the checkpoint reads at a glance
        for (let c = -COLS; c <= COLS; c++) if ((c + row) % 2 === 0) box(g, 0.98, 0.02, 0.98, 0xc8f28e, c, 0.005, 0);
        if (this.safeRows.has(row)) {
          const f = new THREE.Group(); f.position.set(-COLS - 0.8, 0, 0.3); g.add(f);
          box(f, 0.08, 1.8, 0.08, 0xf4f0e6, 0, 0.9, 0);
          const flag = box(f, 0.7, 0.42, 0.04, 0xffd23f, 0.38, 1.55, 0); lane.flag = flag;
          box(f, 0.12, 0.12, 0.05, 0xff3b3b, 0.38, 1.55, 0.01);
          [-1, 1].forEach(s => box(g, 0.3, 0.3, 0.3, 0xff7ccf, s * (COLS + 0.8), 0.15, -0.3));
        }
      }
      for (let c = -HALF_W + 1; c < HALF_W; c++) {
        const edge = Math.abs(c) > COLS;
        if (edge && safe && this.safeRows.has(row) && c === -COLS - 1) continue;
        if (edge || type === 'wall' ? Math.random() < 0.75 : (!safe && row > 4 && Math.random() < 0.08 + d * 0.1)) {
          const o = (Math.random() < 0.8 ? tree : rock)(g, c); if (!edge) { lane.blocked.add(c); lane.obst.set(c, o); }
        } else if (!edge && row === 0 && c === 0) {
        } else if (!edge && row > 3 && Math.random() < 0.04) {
          const k = coin(); k.position.x = c; g.add(k); lane.coins.set(c, k);
        }
      }
      if (row >= 0 && row < 3) { lane.blocked.clear(); }
      if (type === 'wall') for (let c = -COLS; c <= COLS; c++) lane.blocked.add(c);
    } else if (type === 'road') {
      ground(g, 0, 0x4a4a58, 0x3a3a46);
      const prev = this.lanes.get(row - 1);
      if (prev && prev.type === 'road') for (let x = -HALF_W + 1; x < HALF_W; x += 2) box(g, 0.6, 0.02, 0.06, 0xf4f0e6, x, 0.005, 0.5);
      const dir = Math.random() < 0.5 ? 1 : -1, speed = rnd(1.6, 3.2) + d * 3;
      const kind = Math.random() < 0.12 ? 'bus' : Math.random() < 0.25 ? 'truck' : 'car';
      const n = Math.floor(rnd(2, 4)), gap = (WRAP * 2) / n;
      const off = rnd(0, gap);
      for (let i = 0; i < n; i++) {
        const k = Math.random() < 0.25 ? 'meta' : kind;
        const v = car(k); v.mesh.rotation.y = dir > 0 ? 0 : Math.PI;
        v.x = -WRAP + off + i * gap + rnd(-1, 1); v.vx = dir * speed; v.mesh.position.x = v.x; g.add(v.mesh); lane.movers.push(v);
      }
    } else if (type === 'river') {
      box(g, HALF_W * 2, 0.2, 1, 0x4fc3f7, 0, -0.3, 0);
      [-1, 1].forEach(s => box(g, HALF_W - COLS - 0.5, 0.21, 1, 0x3aa8de, s * (COLS + 0.5 + (HALF_W - COLS - 0.5) / 2), -0.3, 0));
      lane.ice = box(g, HALF_W * 2, 0.24, 1, 0xdff6ff, 0, -0.17, 0); lane.ice.visible = false;
      const prev = this.lanes.get(row - 1);
      const dir = prev && prev.type === 'river' ? -prev.dir : (Math.random() < 0.5 ? 1 : -1);
      lane.dir = dir;
      const speed = rnd(1.2, 2.2) + d * 1.6, n = Math.floor(rnd(3, 5)) - (d > 0.6 ? 1 : 0), gap = (WRAP * 2) / n;
      const off = rnd(0, gap);
      for (let i = 0; i < n; i++) {
        const len = Math.floor(rnd(2, 4.5) - d), lg = log(Math.max(2, len));
        const v = { mesh: lg, len: Math.max(2, len), x: -WRAP + off + i * gap, vx: dir * speed, bob: rnd(0, 6) };
        lg.position.set(v.x, -0.12, 0); g.add(lg); lane.movers.push(v);
      }
    } else if (type === 'rail') {
      ground(g, 0, 0x8a7d70, 0x766a5e);
      for (let x = -HALF_W + 0.5; x < HALF_W; x += 0.7) box(g, 0.18, 0.06, 0.9, 0x6b3f1f, x, 0.02, 0);
      [-0.3, 0.3].forEach(z => box(g, HALF_W * 2, 0.08, 0.07, 0xb0b8c4, 0, 0.08, z));
      const pole = new THREE.Group(); pole.position.set(COLS + 0.9, 0, 0.42); g.add(pole);
      box(pole, 0.08, 1.2, 0.08, 0x1d1a2f, 0, 0.6, 0); lane.light = box(pole, 0.2, 0.2, 0.1, 0x441111, 0, 1.25, 0.05);
      lane.dir = Math.random() < 0.5 ? 1 : -1; lane.timer = rnd(2, 6); lane.warn = false;
      const t = train(); t.vx = lane.dir * 26; t.x = 999; t.mesh.rotation.y = lane.dir > 0 ? 0 : Math.PI; t.mesh.visible = false; g.add(t.mesh);
      lane.train = t;
    }
    this.lanes.set(row, lane);
    return lane;
  }

  lane(row) { return this.lanes.get(row); }

  cull(minRow) {
    for (const [r, l] of this.lanes) if (r < minRow) { this.scene.remove(l.g); this.lanes.delete(r); }
  }

  update(rdt, t, onTrainWarn) {
    this.freezeT = Math.max(0, this.freezeT - rdt); this.darkT = Math.max(0, this.darkT - rdt);
    const base = this.freezeT > 0 ? 0 : rdt * this.slow;
    for (const l of this.lanes.values()) {
      let dt = base;
      if (l.type === 'road') {
        if (this.casperRow !== null && Math.abs(l.row - this.casperRow) <= 2) dt *= 0.5;
        l.clearT = Math.max(0, l.clearT - rdt);
        for (const v of l.movers) v.mesh.visible = l.clearT <= 0;
        // during lights-out the Meta AI vans fade to dark ghosts
        for (const v of l.movers) if (v.kind === 'meta') v.mesh.scale.setScalar(this.darkT > 0 ? 0.6 : 1);
      }
      if (l.type === 'river') {
        l.frozenT = Math.max(0, l.frozenT - rdt); l.ice.visible = l.frozenT > 0;
        if (l.frozenT > 0) dt = 0;
      }
      for (const v of l.movers) {
        v.x += v.vx * dt;
        if (v.vx > 0 && v.x - v.len / 2 > WRAP) v.x -= WRAP * 2 + v.len;
        if (v.vx < 0 && v.x + v.len / 2 < -WRAP) v.x += WRAP * 2 + v.len;
        v.mesh.position.x = v.x;
        if (l.type === 'river') v.mesh.position.y = -0.12 + Math.sin(t * 2 + v.bob) * 0.025 - (v.sink || 0);
        if (v.sink) v.sink *= 0.85;
      }
      for (const k of l.coins.values()) k.rotation.y = t * 3;
      if (l.flag) l.flag.rotation.y = Math.sin(t * 3) * 0.35;
      if (l.type === 'rail') {
        const tr = l.train;
        if (this.darkT > 0) { tr.mesh.visible = false; l.timer = Math.max(l.timer, this.warnTime + 1.5); l.warn = false; l.light.material = mat(0x441111); continue; }
        if (!tr.mesh.visible) {
          l.timer -= dt;
          if (l.timer < this.warnTime && !l.warn) { l.warn = true; onTrainWarn && onTrainWarn(l); }
          if (l.warn) l.light.material = mat((t * 6 % 1) < 0.5 ? 0xff2020 : 0x441111, (t * 6 % 1) < 0.5 ? 0xff0000 : 0);
          if (l.timer <= 0) { tr.mesh.visible = true; tr.x = l.dir > 0 ? -WRAP - 2 : WRAP + 2; }
        } else {
          tr.x += tr.vx * dt;
          // train mesh extends backwards from its nose, so its body spans [x - len, x] in travel direction
          if ((l.dir > 0 && tr.x - tr.len > WRAP + 2) || (l.dir < 0 && tr.x + tr.len < -WRAP - 2)) {
            tr.mesh.visible = false; l.timer = rnd(3, 7); l.warn = false; l.light.material = mat(0x441111);
          }
        }
        tr.mesh.position.x = tr.x;
      }
    }
  }

  // ---- queries ----
  carHit(row, x, hb = 0.22) {
    const l = this.lanes.get(row); if (!l || l.type !== 'road' || l.clearT > 0) return false;
    return l.movers.some(v => !(v.kind === 'meta' && this.darkT > 0) && Math.abs(v.x - x) < v.len / 2 + hb);
  }
  trainHit(row, x) {
    const l = this.lanes.get(row); if (!l || l.type !== 'rail' || !l.train.mesh.visible || this.darkT > 0) return false;
    const tr = l.train, a = l.dir > 0 ? tr.x - tr.len + 1.5 : tr.x - 1.5, b = l.dir > 0 ? tr.x + 1.5 : tr.x + tr.len - 1.5;
    return x > a - 0.3 && x < b + 0.3;
  }
  logAt(row, x) {
    const l = this.lanes.get(row); if (!l || l.type !== 'river') return null;
    return l.movers.find(v => Math.abs(v.x - x) < v.len / 2 + 0.05) || null;
  }
  frozen(row) { const l = this.lanes.get(row); return !!l && l.type === 'river' && l.frozenT > 0; }

  // Knocks the cars off a road lane for `secs`. Returns where the cars were, for particle effects.
  clearRoad(row, secs) {
    const l = this.lanes.get(row); if (!l || l.type !== 'road') return [];
    const at = l.clearT > 0 ? [] : l.movers.filter(v => Math.abs(v.x) < 10).map(v => v.x);
    l.clearT = Math.max(l.clearT, secs); return at;
  }

  // Removes trees and rocks around a tile. Returns the positions that were destroyed.
  smash(row, col, r = 0) {
    const out = [];
    for (let dr = -r; dr <= r; dr++) {
      const l = this.lanes.get(row + dr); if (!l || l.type === 'wall') continue;
      for (let dc = -r; dc <= r; dc++) {
        const c = col + dc, o = l.obst.get(c);
        if (o) { l.g.remove(o); l.obst.delete(c); l.blocked.delete(c); out.push([c, row + dr]); }
      }
    }
    return out;
  }

  // A rock that sits still in the river so you can stand on it.
  addStone(row, col) {
    const l = this.lanes.get(row); if (!l || l.type !== 'river') return false;
    const g = new THREE.Group(); box(g, 0.86, 0.3, 0.8, 0x8a8178, 0, 0, 0); box(g, 0.6, 0.12, 0.56, 0x9a9aa8, 0, 0.18, 0);
    g.position.set(col, -0.12, 0); l.g.add(g);
    l.movers.push({ mesh: g, len: 1, x: col, vx: 0, bob: 0, stone: true });
    return true;
  }

  takeCoin(row, col) {
    const l = this.lanes.get(row); if (!l) return false;
    const k = l.coins.get(col); if (!k) return false;
    l.g.remove(k); l.coins.delete(col); return true;
  }
}
