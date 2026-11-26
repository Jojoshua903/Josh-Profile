import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { SURVIVOR, TUNING } from './data.js?v=20261127j';
import { mirror, groundAt, resolveXZ } from './world.js?v=20261127j';
import { damage, setBar, burst, ring, chestOf } from './units.js?v=20261127j';

// Survivor: free-for-all battle royale. Everyone starts on the ground at a random spot, loot on
// the ground, a storm that closes in phase by phase, no respawns, last hero standing wins.

const TAU = Math.PI * 2;

// ---------- setup ----------
export function initSurvivor(G) {
  const m = G.map, R0 = Math.hypot(m.W, m.L) * 1.02;
  G.storm = { phase: -1, state: 'wait', t: 0, cx: 0, cz: 0, r: R0, R0, from: null, to: { cx: 0, cz: 0, r: R0 }, dps: 1 };
  nextPhase(G);
  G.loot = [];
  G.aliveCount = G.heroes.length;

  // storm wall + the ring that marks the next safe zone
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 80, 128, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x9b5cff, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false, fog: false }));
  wall.position.y = 30; G.scene.add(wall);
  const edge = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.6, 128, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xe6d6ff, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
  edge.position.y = 0.3; G.scene.add(edge);
  const next = new THREE.Mesh(new THREE.RingGeometry(0.985, 1, 128), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
  next.rotation.x = -Math.PI / 2; next.position.y = 0.12; G.scene.add(next);
  G.stormMesh = { wall, edge, next };

  // scatter loot, avoiding solid blocks
  const blocks = mirror(m.blocks);
  const blocked = (x, z) => blocks.some(([bx, bz, w, d, h]) => h > 0.4 && Math.abs(x - bx) < w / 2 + 0.8 && Math.abs(z - bz) < d / 2 + 0.8);
  let placed = 0;
  for (let tries = 0; tries < SURVIVOR.loot * 8 && placed < SURVIVOR.loot; tries++) {
    const x = (Math.random() * 2 - 1) * (m.W - 3), z = (Math.random() * 2 - 1) * (m.L - 3);
    if (blocked(x, z)) continue;
    spawnLoot(G, rollType(), x, z); placed++;
  }
  // a little extra in every ruin doorway area so houses are worth looting
  for (const [bx, bz, w, d, h] of blocks) if (h === 1.1 && Math.random() < 0.8) spawnLoot(G, rollType(), bx + 1.4, bz);

  // everyone wakes up on the ground at a random open spot, kept well apart from each other
  const spots = [];
  G.heroes.forEach(h => {
    let best = null, bestD = -1;
    for (let tries = 0; tries < 160; tries++) {
      const x = (Math.random() * 2 - 1) * (m.W - 6), z = (Math.random() * 2 - 1) * (m.L - 6);
      if (Math.hypot(x, z) < 9 || blocked(x, z)) continue;          // not on the centre stage or inside cover
      const d = spots.reduce((a, s) => Math.min(a, Math.hypot(x - s.x, z - s.z)), Infinity);
      if (d > bestD) { best = { x, z }; bestD = d; }
      if (d > SPAWN_GAP) break;
    }
    best ||= { x: (Math.random() * 2 - 1) * 40, z: (Math.random() * 2 - 1) * 40 };
    spots.push(best);
    h.pos.set(best.x, 0, best.z); h.pos.y = groundAt(h.pos, TUNING.radius, G.colliders);
    h.vel.set(0, 0, 0);
    h.armor = 0; h.power = 0; h.place = 0;
    h.yaw = Math.atan2(-h.pos.x, -h.pos.z) + (Math.random() - 0.5) * 1.2;   // roughly towards the middle
  });
}
const SPAWN_GAP = 22;                                // metres between spawns when there's room

function rollType() {
  const tot = SURVIVOR.lootTypes.reduce((s, t) => s + t.w, 0);
  let r = Math.random() * tot;
  for (const t of SURVIVOR.lootTypes) { if ((r -= t.w) < 0) return t; }
  return SURVIVOR.lootTypes[0];
}

function lootMesh(type) {
  const g = new THREE.Group();
  const M = (c, e = 0.35) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: e });
  if (type.id === 'health') {
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.45, 0.6), M(0xffffff, 0.15)));
    const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.14, 0.18), M(type.color)); c1.position.y = 0.05;
    const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.62), M(type.color)); c2.position.y = 0.05;
    const c3 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.47, 0.18), M(type.color)); g.add(c1, c2, c3);
  } else if (type.id === 'shield') {
    const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.38, 0), M(type.color, 0.5)); s.scale.y = 1.3; g.add(s);
  } else if (type.id === 'power') {
    g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.36, 0), M(type.color, 0.6)));
    for (let i = 0; i < 5; i++) { const sp = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 4), M(0xff8a3c, 0.5)); const a = i / 5 * TAU; sp.position.set(Math.cos(a) * 0.38, 0, Math.sin(a) * 0.38); sp.rotation.z = -Math.cos(a) * Math.PI / 2; sp.rotation.x = Math.sin(a) * Math.PI / 2; g.add(sp); }
  } else {
    g.add(new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.09, 8, 20), M(type.color, 0.6)));
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), M(0xffffff, 0.8)));
  }
  // glow pad under every pickup so it reads from a distance
  const pad = new THREE.Mesh(new THREE.CircleGeometry(0.75, 24), new THREE.MeshBasicMaterial({ color: type.color, transparent: true, opacity: 0.4, depthWrite: false }));
  pad.rotation.x = -Math.PI / 2; pad.name = 'pad';
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.25, 3.5, 8, 1, true), new THREE.MeshBasicMaterial({ color: type.color, transparent: true, opacity: 0.25, depthWrite: false }));
  beam.position.y = 1.4;
  return { g, pad, beam };
}

export function spawnLoot(G, type, x, z, pop = false) {
  const { g, pad, beam } = lootMesh(type);
  const p = new THREE.Vector3(x, 0, z); p.y = groundAt(p, 0.3, G.colliders);
  const root = new THREE.Group(); root.position.copy(p); root.add(pad, beam, g); g.position.y = 0.8;
  pad.position.y = 0.05;
  G.scene.add(root);
  G.loot.push({ type, pos: p, root, item: g, alive: true, t: Math.random() * 6, vel: pop ? new THREE.Vector3((Math.random() - 0.5) * 5, 6, (Math.random() - 0.5) * 5) : null });
}

function grab(G, h, l) {
  const t = l.type;
  if (t.id === 'health') { if (h.hp >= h.maxHp) return false; h.hp = Math.min(h.maxHp, h.hp + 60); setBar(h); G.ev.heal?.(h, 60, h); }
  else if (t.id === 'shield') { if (h.armor >= 100) return false; h.armor = Math.min(100, (h.armor || 0) + 50); }
  else if (t.id === 'power') { if (h.power >= 3) return false; h.power = (h.power || 0) + 1; }
  else { if (h.ult >= 100) return false; h.ult = Math.min(100, h.ult + 50); }
  l.alive = false; G.scene.remove(l.root);
  ring(G, l.pos, t.color, 1.6);
  G.ev.loot?.(h, t);
  return true;
}

// Survivor hooks around physics. Nobody glides any more (everyone starts on the ground), so these stay as no-ops for main.js.
export function survivorPreMove() {}
export function survivorPostMove() {}

// ---------- storm ----------
function nextPhase(G) {
  const s = G.storm;
  s.phase++;
  const ph = SURVIVOR.phases[s.phase];
  if (!ph) { s.state = 'final'; return; }
  s.state = 'wait'; s.t = ph.wait;
  const r = ph.r * s.R0;
  const slack = Math.max(0, s.r - r);
  const a = Math.random() * TAU, d = Math.random() * slack * 0.8;
  let cx = s.cx + Math.cos(a) * d, cz = s.cz + Math.sin(a) * d;
  // keep the final circles on the island
  const lim = (v, L) => Math.max(-(L - r * 0.4 - 6), Math.min(L - r * 0.4 - 6, v));
  cx = lim(cx, G.map.W); cz = lim(cz, G.map.L);
  s.from = { cx: s.cx, cz: s.cz, r: s.r };
  s.to = { cx, cz, r };
  s.nextDps = ph.dps;
}

export function inStorm(G, p) { const s = G.storm; return Math.hypot(p.x - s.cx, p.z - s.cz) > s.r; }

function updateStorm(G, dt) {
  const s = G.storm;
  if (s.state === 'wait') {
    s.t -= dt;
    if (s.t <= 0) { s.state = 'shrink'; s.t = SURVIVOR.phases[s.phase].shrink; s.dps = s.nextDps; G.ev.storm?.('shrink', s); }
  } else if (s.state === 'shrink') {
    s.t -= dt;
    const ph = SURVIVOR.phases[s.phase], k = 1 - Math.max(0, s.t) / ph.shrink;
    s.cx = s.from.cx + (s.to.cx - s.from.cx) * k;
    s.cz = s.from.cz + (s.to.cz - s.from.cz) * k;
    s.r = s.from.r + (s.to.r - s.from.r) * k;
    if (s.t <= 0) { nextPhase(G); G.ev.storm?.('wait', s); }
  }
  const { wall, edge, next } = G.stormMesh;
  const r = Math.max(0.5, s.r);
  wall.scale.set(r, 1, r); wall.position.set(s.cx, 30, s.cz);
  wall.material.opacity = 0.22 + Math.sin(G.time * 2) * 0.05;
  edge.scale.set(r, 1, r); edge.position.set(s.cx, 0.3, s.cz);
  next.visible = s.state !== 'final';
  next.scale.setScalar(Math.max(0.5, s.to.r)); next.position.set(s.to.cx, 0.12, s.to.cz);
  for (const h of G.heroes) if (h.alive && inStorm(G, h.pos)) damage(G, h, s.dps * dt, null);
}

// ---------- per frame ----------
export function updateSurvivor(G, dt) {
  updateStorm(G, dt);
  for (let i = G.loot.length - 1; i >= 0; i--) {
    const l = G.loot[i];
    if (!l.alive) { G.loot.splice(i, 1); continue; }
    if (l.vel) {                                    // dropped loot pops out and lands
      l.vel.y -= 20 * dt; l.pos.addScaledVector(l.vel, dt); resolveXZ(l.pos, 0.3, G.colliders);
      const g = groundAt(l.pos, 0.3, G.colliders);
      if (l.pos.y <= g) { l.pos.y = g; l.vel = null; }
      l.root.position.copy(l.pos);
    }
    l.t += dt;
    l.item.rotation.y += dt * 1.8; l.item.position.y = 0.8 + Math.sin(l.t * 2.5) * 0.12;
    for (const h of G.heroes) {
      if (!h.alive) continue;
      if (Math.hypot(h.pos.x - l.pos.x, h.pos.z - l.pos.z) < 1.3 && Math.abs(h.pos.y - l.pos.y) < 1.6 && grab(G, h, l)) break;
    }
  }
  // power glow on heroes
  for (const h of G.heroes) if (h.alive && !h.isPlayer && h.power) {
    if (!h.aura) {
      h.aura = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.05, 6, 24), new THREE.MeshBasicMaterial({ color: 0xffc93c }));
      h.aura.rotation.x = Math.PI / 2; h.aura.position.y = 0.12; h.mesh.add(h.aura);
    }
    h.aura.scale.setScalar(1 + h.power * 0.15 + Math.sin(G.time * 6) * 0.04);
  }
}

// When a hero is eliminated: record placement, drop their gear.
export function onEliminated(G, t) {
  t.place = G.aliveCount;
  G.aliveCount--;
  const drops = [SURVIVOR.lootTypes[0], rollType()];
  if (t.armor > 0 || t.power > 0) drops.push(SURVIVOR.lootTypes[t.power > 0 ? 2 : 1]);
  for (const ty of drops) spawnLoot(G, ty, t.pos.x, t.pos.z, true);
}

// ---------- bots ----------
// Where a bot without a target should head: out of the storm, to useful loot, or roam.
export function survivorGoal(G, b, goal) {
  const s = G.storm, ai = b.ai;
  const toSafe = () => {
    const dx = s.to.cx - b.pos.x, dz = s.to.cz - b.pos.z, d = Math.hypot(dx, dz) || 1;
    const inside = Math.max(0, s.to.r * 0.6);
    goal.set(s.to.cx - (dx / d) * inside * 0.3, 0, s.to.cz - (dz / d) * inside * 0.3);
  };
  // storm first: if outside the current circle, or outside the next one while it's closing
  const dNext = Math.hypot(b.pos.x - s.to.cx, b.pos.z - s.to.cz);
  if (inStorm(G, b.pos) || (s.state === 'shrink' && dNext > s.to.r * 0.85) || (s.state === 'wait' && s.t < 12 && dNext > s.to.r)) { toSafe(); return true; }
  // loot: prefer health when hurt, skip things we can't use
  let best = null, bd = 32;
  for (const l of G.loot) {
    if (!l.alive) continue;
    const id = l.type.id;
    if ((id === 'health' && b.hp >= b.maxHp) || (id === 'shield' && b.armor >= 100) || (id === 'power' && b.power >= 3) || (id === 'ult' && b.ult >= 100)) continue;
    if (Math.hypot(l.pos.x - s.to.cx, l.pos.z - s.to.cz) > s.to.r && s.phase > 0) continue;
    let d = Math.hypot(l.pos.x - b.pos.x, l.pos.z - b.pos.z);
    if (id === 'health' && b.hp < b.maxHp * 0.5) d *= 0.4;
    if (d < bd) { bd = d; best = l; }
  }
  if (best) { goal.set(best.pos.x, 0, best.pos.z); return false; }
  // roam somewhere inside the safe zone
  ai.roamT = (ai.roamT || 0) - 0.016;
  if (!ai.roam || ai.roamT <= 0 || Math.hypot(ai.roam.x - b.pos.x, ai.roam.z - b.pos.z) < 3) {
    const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * Math.max(4, s.to.r * 0.8);
    ai.roam = new THREE.Vector3(s.to.cx + Math.cos(a) * r, 0, s.to.cz + Math.sin(a) * r);
    ai.roamT = 8;
  }
  goal.copy(ai.roam);
  return false;
}

export function survivorLeaders(G) {
  return [...G.heroes].sort((a, b) => (b.alive - a.alive) || ((a.place || 0) - (b.place || 0)) || (b.kills - a.kills));
}
export function stormInfo(G) {
  const s = G.storm;
  if (s.state === 'final') return { label: 'Final circle', t: 0 };
  return { label: s.state === 'wait' ? 'Storm closes in' : 'Storm closing', t: Math.max(0, s.t) };
}
void chestOf;
