import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { createStructure, damage, burst, ring, setBar } from './units.js?v=20261127j';
import { knock } from './abilities.js?v=20261127j';
import { golem } from './guardian.js?v=20261127j';

// Boss Raid: you and two bot allies against Magmaw, a molten stone titan in the middle of the
// stage. Beat it before the clock runs out, and don't all go down at once.
// Magmaw has three phases (at 66% and 33% health it gets faster and meaner) and four attacks,
// all telegraphed with red circles on the ground:
//   Slam       fists come down on one hero
//   Rock rain  boulders fall around everyone
//   Shockwave  a ring rolls out from its feet: jump over it
//   Magma pools (phase 2+) burning puddles that stay a while
// It's built as a structure so every weapon, splash and ability already knows how to hit it.

export const RAID = { hp: 9000, time: 300, scale: 2.1, rad: 3, height: 10, speed: [2.2, 2.8, 3.6], rest: [2.6, 2.0, 1.5],
  slam: { r: 5, dmg: 75, wind: 1.2 }, rain: { r: 2.6, dmg: 45, wind: 1.4, n: [5, 7, 10] }, wave: { dmg: 40, speed: 13, max: 26 }, pool: { r: 3.2, dps: 30, life: 7 } };
const DIFF_HP = { easy: 0.75, normal: 1, hard: 1.35 };

export function initRaid(G, diff = 'normal') {
  const b = createStructure(G, 'core', 'red', 0, 0);
  b.kind = 'boss'; b.name = 'Magmaw';
  b.maxHp = b.hp = Math.round(RAID.hp * (DIFF_HP[diff] || 1));
  b.rad = RAID.rad; b.height = RAID.height;
  // it walks, so it can't be a wall
  G.colliders.splice(G.colliders.indexOf(b.collider), 1);
  for (const c of [...b.mesh.children]) if (c !== b.bar) b.mesh.remove(c);
  const m = golem('red', 0xff6a1a, 0x4a3a34, 0x2a1f1c);
  m.root.scale.setScalar(RAID.scale);
  // glowing cracks of magma down its chest
  const lava = new THREE.MeshBasicMaterial({ color: 0xff6a1a });
  for (const [x, y, w, h] of [[-0.9, 3.4, 0.25, 1.6], [0.7, 4.3, 0.2, 1.2], [0, 2.9, 1.4, 0.2]]) { const c = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.1), lava); c.position.set(x, y, -1.22); m.body.add(c); }
  b.mesh.add(m.root);
  b.bar.position.y = RAID.height + 1.6; b.bar.scale.setScalar(2.2);
  setBar(b, 0xff6a1a);
  b.model = m;
  G.raid = { boss: b, phase: 1, time: RAID.time, rest: 3, act: null, danger: [], pools: [], wave: null, stagger: 0, yaw: 0, walkT: 0 };
  G.score = { blue: 0, red: 0 };
}

const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const heroes = G => G.heroes.filter(h => h.alive && h.team === 'blue');
const mark = (G, x, z, r, wind) => {
  const m = new THREE.Mesh(new THREE.RingGeometry(r - 0.35, r, 40), new THREE.MeshBasicMaterial({ color: 0xff2a2a, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
  const f = new THREE.Mesh(new THREE.CircleGeometry(r, 40), new THREE.MeshBasicMaterial({ color: 0xff2a2a, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }));
  m.rotation.x = f.rotation.x = -Math.PI / 2; m.position.set(x, 0.07, z); f.position.set(x, 0.06, z); f.scale.setScalar(0.01);
  G.scene.add(m, f);
  const d = { x, z, r, t: 0, wind, m, f };
  G.raid.danger.push(d);
  return d;
};
const unmark = (G, d) => { G.scene.remove(d.m, d.f); d.m.geometry.dispose(); d.f.geometry.dispose(); };

function hitCircle(G, x, z, r, dmg, push) {
  const b = G.raid.boss, at = new THREE.Vector3(x, 0.3, z);
  burst(G, at, 0xff6a1a, r * 0.8); burst(G, at, 0x4a3a34, r * 0.5); ring(G, at, 0xff2a2a, r);
  for (const h of heroes(G)) {
    if (flat(h.pos, at) > r) continue;
    damage(G, h, dmg, b);
    if (push) { const away = new THREE.Vector3(h.pos.x - x, 0, h.pos.z - z); if (away.lengthSq() < 0.01) away.set(1, 0, 0); knock(h, away.normalize(), push, 6); }
  }
  G.ev.raid?.('impact', at);
}

// what Magmaw does next
function choose(G) {
  const R = G.raid, b = R.boss, hs = heroes(G); if (!hs.length) return;
  const near = hs.sort((a, c) => flat(a.pos, b.pos) - flat(c.pos, b.pos))[0];
  const opts = ['slam', 'slam', 'rain', 'wave'];
  if (R.phase >= 2) opts.push('pool', 'rain');
  if (flat(near.pos, b.pos) < 9) opts.push('wave', 'slam');
  const kind = opts[Math.floor(Math.random() * opts.length)];
  if (kind === 'slam') { const d = mark(G, near.pos.x, near.pos.z, RAID.slam.r, RAID.slam.wind); R.act = { kind, t: 0, marks: [d], target: near }; }
  else if (kind === 'rain' || kind === 'pool') {
    const n = kind === 'pool' ? 3 : RAID.rain.n[R.phase - 1], marks = [];
    for (let i = 0; i < n; i++) {
      const h = hs[i % hs.length], a = Math.random() * Math.PI * 2, s = i < hs.length ? Math.random() * 1.5 : 2 + Math.random() * 7;
      marks.push(mark(G, h.pos.x + Math.cos(a) * s, h.pos.z + Math.sin(a) * s, kind === 'pool' ? RAID.pool.r : RAID.rain.r, RAID.rain.wind + i * 0.08));
    }
    R.act = { kind, t: 0, marks };
  } else R.act = { kind, t: 0, marks: [] };
  G.ev.raid?.('wind', kind);
}

export function updateRaid(G, dt) {
  const R = G.raid; if (!R) return;
  const b = R.boss, m = b.model;
  // pools keep burning whoever stands in them
  for (let i = R.pools.length - 1; i >= 0; i--) {
    const p = R.pools[i]; p.life -= dt;
    p.mesh.material.opacity = Math.min(0.7, p.life * 0.3) * (0.8 + Math.sin(G.time * 6 + i) * 0.2);
    for (const h of heroes(G)) if (flat(h.pos, p) < RAID.pool.r && h.onGround) damage(G, h, RAID.pool.dps * dt, b, false, false, true);
    if (p.life <= 0) { G.scene.remove(p.mesh); p.mesh.geometry.dispose(); R.pools.splice(i, 1); }
  }
  if (!b.alive || G.over) { for (const d of R.danger) unmark(G, d); R.danger = []; animate(G, R, dt, 0); return; }

  R.time -= dt;
  if (R.time <= 0) { G.ev.raid?.('time'); return; }
  if (!G.heroes.some(h => h.alive && h.team === 'blue')) { G.ev.raid?.('wipe'); return; }

  // phases
  const f = b.hp / b.maxHp, want = f > 0.66 ? 1 : f > 0.33 ? 2 : 3;
  if (want > R.phase) { R.phase = want; R.stagger = 1.6; G.ev.raid?.('phase', want); ring(G, b.pos, 0xff6a1a, 14); burst(G, b.pos.clone().setY(5), 0xff6a1a, 6); }

  // telegraphs fill up, then land
  for (const d of R.danger) { d.t += dt; const k = Math.min(1, d.t / d.wind); d.f.scale.setScalar(Math.max(0.01, k)); d.m.material.opacity = 0.5 + Math.sin(G.time * 20) * 0.3; }
  let moving = 0;
  if (R.stagger > 0) R.stagger -= dt;
  else if (R.act) {
    const A = R.act; A.t += dt;
    if (A.kind === 'slam' && A.target?.alive && A.t < RAID.slam.wind - 0.35) { const d = A.marks[0]; d.x = A.target.pos.x; d.z = A.target.pos.z; d.m.position.set(d.x, 0.07, d.z); d.f.position.set(d.x, 0.06, d.z); }
    for (const d of [...A.marks]) if (d.t >= d.wind) {
      if (A.kind === 'pool') {
        hitCircle(G, d.x, d.z, d.r, 20, 0);
        const pm = new THREE.Mesh(new THREE.CircleGeometry(RAID.pool.r, 32), new THREE.MeshBasicMaterial({ color: 0xff5a1a, transparent: true, opacity: 0.7, depthWrite: false }));
        pm.rotation.x = -Math.PI / 2; pm.position.set(d.x, 0.05, d.z); G.scene.add(pm);
        R.pools.push({ x: d.x, z: d.z, life: RAID.pool.life, mesh: pm });
      } else hitCircle(G, d.x, d.z, d.r, A.kind === 'slam' ? RAID.slam.dmg : RAID.rain.dmg, A.kind === 'slam' ? 14 : 6);
      if (A.kind === 'slam') G.ev.shake?.(A.target || b, 1);
      unmark(G, d); R.danger.splice(R.danger.indexOf(d), 1); A.marks.splice(A.marks.indexOf(d), 1);
    }
    if (A.kind === 'wave') {
      if (A.t > 0.9 && !R.wave) {                                      // wind-up, then the ring rolls out
        const w = new THREE.Mesh(new THREE.TorusGeometry(1, 0.35, 8, 48), new THREE.MeshBasicMaterial({ color: 0xff6a1a }));
        w.rotation.x = -Math.PI / 2; w.position.set(b.pos.x, 0.35, b.pos.z); G.scene.add(w);
        R.wave = { r: RAID.rad, mesh: w, hit: new Set() };
        G.ev.raid?.('impact', b.pos); G.ev.shake?.(b, 0.6);
      }
      if (R.wave) {
        const W = R.wave; W.r += RAID.wave.speed * dt; W.mesh.scale.set(W.r, W.r, 1);
        for (const h of heroes(G)) if (!W.hit.has(h) && Math.abs(flat(h.pos, b.pos) - W.r) < 0.9 && h.pos.y < 0.9) {
          W.hit.add(h); damage(G, h, RAID.wave.dmg, b);
          knock(h, new THREE.Vector3(h.pos.x - b.pos.x, 0, h.pos.z - b.pos.z).normalize(), 10, 5);
        }
        if (W.r > RAID.wave.max) { G.scene.remove(W.mesh); W.mesh.geometry.dispose(); R.wave = null; A.done = true; }
      }
    } else if (!A.marks.length) A.done = true;
    if (A.done) { R.act = null; R.rest = RAID.rest[R.phase - 1]; }
  } else {
    // between attacks: walk toward the closest hero
    const hs = heroes(G), near = hs.sort((a, c) => flat(a.pos, b.pos) - flat(c.pos, b.pos))[0];
    if (near && flat(near.pos, b.pos) > 7) {
      const dx = near.pos.x - b.pos.x, dz = near.pos.z - b.pos.z, l = Math.hypot(dx, dz), sp = RAID.speed[R.phase - 1];
      b.pos.x += dx / l * sp * dt; b.pos.z += dz / l * sp * dt; moving = 1;
      const W = G.map.W - 4, L = G.map.L - 12;
      b.pos.x = Math.max(-W, Math.min(W, b.pos.x)); b.pos.z = Math.max(-L, Math.min(L, b.pos.z));
    }
    if (near) R.yaw = Math.atan2(-(near.pos.x - b.pos.x), -(near.pos.z - b.pos.z));
    if ((R.rest -= dt) <= 0) choose(G);
  }
  b.mesh.position.set(b.pos.x, 0, b.pos.z);
  const hb = b.hitbox, w = RAID.rad * 1.6;
  hb.minX = b.pos.x - w; hb.maxX = b.pos.x + w; hb.minZ = b.pos.z - w; hb.maxZ = b.pos.z + w; hb.top = RAID.height;
  animate(G, R, dt, moving);
}

function animate(G, R, dt, moving) {
  const b = R.boss, m = b.model, t = G.time;
  if (!b.alive) return;
  R.walkT += dt * moving * 5;
  let d = R.yaw - m.root.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
  m.root.rotation.y += d * Math.min(1, dt * 3);
  const A = R.act, wind = A && (A.kind === 'slam' || A.kind === 'wave') ? Math.min(1, A.t / 0.9) : 0;
  const rain = A && (A.kind === 'rain' || A.kind === 'pool') ? Math.sin(Math.min(1, A.t / 0.5) * Math.PI) : 0;
  m.body.position.y = Math.abs(Math.sin(R.walkT)) * 0.15 * moving + Math.sin(t * 1.2) * 0.06;
  m.body.rotation.z = Math.sin(R.walkT) * 0.05 * moving + (R.stagger > 0 ? Math.sin(t * 14) * 0.08 : 0);
  m.body.rotation.x = -wind * 0.15 + (R.stagger > 0 ? 0.25 : 0);
  m.arms.forEach((a, i) => { a.rotation.x = -wind * 2.9 - rain * 1.8 + Math.sin(R.walkT + i * Math.PI) * 0.35 * moving; });
  const glow = 0.8 + R.phase * 0.25 + Math.sin(t * 8) * 0.1 * R.phase;
  for (const e of m.eyes) e.scale.set(glow, glow, 1);
}

// bots: circle Magmaw at their range, and step out of anything about to land
export function raidGoal(G, b, goal) {
  const R = G.raid, boss = R?.boss; if (!boss?.alive) return null;
  const pref = Math.max(RAID.rad + 2, b.def.prefRange * 0.9 + RAID.rad * 0.5);
  const a = Math.atan2(b.pos.z - boss.pos.z, b.pos.x - boss.pos.x) + 0.35 * Math.sin(G.time * 0.4 + b.pos.x);     // drift round it
  goal.set(boss.pos.x + Math.cos(a) * pref, 0, boss.pos.z + Math.sin(a) * pref);
  let danger = false;
  for (const d of [...R.danger, ...R.pools.map(p => ({ ...p, r: RAID.pool.r }))]) {
    const dx = b.pos.x - d.x, dz = b.pos.z - d.z, dist = Math.hypot(dx, dz);
    if (dist < d.r + 1.2) { const l = dist || 1; goal.set(d.x + dx / l * (d.r + 2.5), 0, d.z + dz / l * (d.r + 2.5)); danger = true; }
  }
  return { target: boss, sprint: danger || flat(b.pos, boss.pos) > pref + 10, jump: !!R.wave && Math.abs(flat(b.pos, boss.pos) - R.wave.r) < 2.2 };
}
export const raidInfo = G => { const R = G.raid; return R && { hp: R.boss.hp, max: R.boss.maxHp, phase: R.phase, time: Math.max(0, R.time) }; };
