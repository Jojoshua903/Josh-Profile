import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { createStructure, damage, burst, ring, setBar } from './units.js?v=20261129f';
import { knock, slow, root, freeze } from './abilities.js?v=20261129f';
import { golem } from './guardian.js?v=20261129f';

// Boss Raid: you and two bot allies against one boss in the middle of the stage. Beat it before
// the clock runs out, and don't all go down at once. Every boss has three phases (at 66% and 33%
// health it gets faster and meaner) and its own attacks, telegraphed in red on the ground:
//   Magmaw, the molten titan       slams, rock rain, a shockwave to jump, magma pools
//   The Thornqueen, a giant flower  vine lashes in lines, root snares, slowing spores, and
//                                   seed pods that heal her unless you destroy them
//   Frostfang, the glacier yeti     a freezing breath cone, a charge across the arena, icicles,
//                                   and Deep Freeze: anyone standing still gets frozen solid
//   Tick-Tock, the clockwork giant  a sweeping laser to jump, homing missiles, and Overload:
//                                   only the green circles are safe
// Bosses are built as structures so every weapon, splash and ability already knows how to hit them.

export const RAID = { time: 300, rad: 3, height: 10 };
const DIFF_HP = { easy: 0.75, normal: 1, hard: 1.35 };
const RED = 0xff2a2a;

export const BOSSES = {
  magmaw: {
    name: 'Magmaw', title: 'the molten titan', icon: '🌋', color: 0xff6a1a, hp: 9000,
    blurb: 'Slams, rock rain and a shockwave you have to jump. Magma pools from phase 2.',
    speed: [2.2, 2.8, 3.6], rest: [2.6, 2.0, 1.5], keep: 7,
    moves: ['slam', 'slam', 'rain', 'wave'], phase2: ['pool', 'rain'], close: ['wave', 'slam'],
    phase: ['Magmaw is heating up', 'Phase 2 · magma pools now burn the ground'], enraged: ['Magmaw is ENRAGED', 'Faster attacks, more rocks. Finish it!'],
  },
  thornqueen: {
    name: 'The Thornqueen', title: 'queen of the overgrowth', icon: '🌺', color: 0xff4fa3, hp: 8200,
    blurb: 'Rooted in place. Vine lashes in long lines, snares and slowing spores. Destroy her seed pods or she heals.',
    speed: [0, 0, 0], rest: [2.2, 1.8, 1.4], keep: 0,
    moves: ['lash', 'lash', 'snare', 'spores'], phase2: ['pods', 'lash'], close: ['thrash', 'thrash'],
    phase: ['The Thornqueen blooms', 'Phase 2 · seed pods: destroy them or she heals'], enraged: ['The Thornqueen is FURIOUS', 'More vines, faster. Cut her down!'],
  },
  frostfang: {
    name: 'Frostfang', title: 'the glacier yeti', icon: '❄️', color: 0x7ad8ff, hp: 9500,
    blurb: 'Freezing breath, a charge across the arena and icicles. From phase 2, Deep Freeze: keep moving or be frozen.',
    speed: [2.6, 3.2, 4.0], rest: [2.4, 1.9, 1.4], keep: 6,
    moves: ['breath', 'charge', 'icicles', 'breath'], phase2: ['freeze', 'charge'], close: ['breath', 'breath'],
    phase: ['Frostfang howls', 'Phase 2 · Deep Freeze: keep moving when it hits'], enraged: ['Frostfang is in a BLIZZARD RAGE', 'Faster charges, more ice. Bring it down!'],
  },
  ticktock: {
    name: 'Tick-Tock', title: 'the clockwork colossus', icon: '⚙️', color: 0x5af0ff, hp: 9000,
    blurb: 'A sweeping laser you have to jump, homing missiles and gear slams. From phase 2, Overload: get in a green circle.',
    speed: [1.8, 2.2, 2.6], rest: [2.6, 2.1, 1.6], keep: 8,
    moves: ['laser', 'missiles', 'gearslam', 'missiles'], phase2: ['overload', 'laser'], close: ['gearslam', 'laser'],
    phase: ['Tick-Tock overclocks', 'Phase 2 · Overload: only the green circles are safe'], enraged: ['Tick-Tock is MALFUNCTIONING', 'Two lasers at once. Finish it!'],
  },
};
export const BOSS_LIST = Object.entries(BOSSES).map(([id, b]) => ({ id, ...b }));
export const bossOf = id => BOSSES[id] ? id : 'magmaw';

const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const heroes = G => G.heroes.filter(h => h.alive && h.team === 'blue');
const V = (x, z, y = 0) => new THREE.Vector3(x, y, z);
const basic = (c, o = 0.8) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, side: THREE.DoubleSide, depthWrite: false });
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, ...o });
const glowM = c => new THREE.MeshBasicMaterial({ color: c });
const mesh = (geo, mat, x = 0, y = 0, z = 0, p) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; p?.add(m); return m; };
const clampIn = (G, p) => { const W = G.map.W - 4, L = G.map.L - 12; p.x = Math.max(-W, Math.min(W, p.x)); p.z = Math.max(-L, Math.min(L, p.z)); return p; };
const near = (G, b) => heroes(G).sort((a, c) => flat(a.pos, b.pos) - flat(c.pos, b.pos))[0];
const angTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);          // direction (sin a, cos a)

// ---------- models ----------
function buildMagmaw() {
  const m = golem('red', 0xff6a1a, 0x4a3a34, 0x2a1f1c);
  m.root.scale.setScalar(2.1);
  const lava = glowM(0xff6a1a);
  for (const [x, y, w, h] of [[-0.9, 3.4, 0.25, 1.6], [0.7, 4.3, 0.2, 1.2], [0, 2.9, 1.4, 0.2]]) mesh(new THREE.BoxGeometry(w, h, 0.1), lava, x, y, -1.22, m.body);
  return m;
}
function buildThornqueen() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const leaf = std(0x3f9a4a), dark = std(0x1f5a2a), pink = std(0xff6fb5, { roughness: 0.5 }), deep = std(0x8a1f5a);
  for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2, l = mesh(new THREE.SphereGeometry(2.2, 12, 8), i % 2 ? leaf : dark, Math.sin(a) * 3, 0.3, Math.cos(a) * 3, root); l.scale.set(0.7, 0.12, 1.4); l.rotation.y = a; }
  mesh(new THREE.CylinderGeometry(0.75, 1.2, 6.2, 10), leaf, 0, 3.1, 0, body);
  for (let i = 0; i < 10; i++) { const t = mesh(new THREE.ConeGeometry(0.16, 0.6, 5), std(0xf2e2b0), 0, 1 + i * 0.5, 0, body); const a = i * 2.3; t.position.x = Math.sin(a) * 0.95; t.position.z = Math.cos(a) * 0.95; t.rotation.z = -Math.sin(a) * 1.4; t.rotation.x = Math.cos(a) * 1.4; }
  const head = new THREE.Group(); head.position.y = 6.8; body.add(head);
  mesh(new THREE.SphereGeometry(1.9, 16, 12), deep, 0, 0, 0, head);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, p = new THREE.Group(); p.rotation.z = a; head.add(p); const pe = mesh(new THREE.SphereGeometry(1.3, 12, 8), i % 2 ? pink : std(0xffa8d8), 0, 2.4, 0.5, p); pe.scale.set(0.8, 1.5, 0.25); }
  head.rotation.x = -0.25;
  // the mouth on the front, ringed with teeth, and a crown of gold thorns
  const mouth = mesh(new THREE.CircleGeometry(1.1, 20), glowM(0x2a0a1a), 0, -0.2, -1.88, head); mouth.rotation.y = Math.PI;
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, t = mesh(new THREE.ConeGeometry(0.12, 0.4, 5), std(0xffffff), Math.cos(a) * 1.0, -0.2 + Math.sin(a) * 1.0, -1.9, head); t.rotation.z = a + Math.PI / 2; }
  const eyes = [-1, 1].map(s => mesh(new THREE.SphereGeometry(0.28, 10, 8), glowM(0xffe040), s * 0.75, 0.95, -1.6, head));
  for (let i = -2; i <= 2; i++) mesh(new THREE.ConeGeometry(0.2, 0.9, 5), std(0xffc93c, { metalness: 0.5, roughness: 0.3 }), i * 0.45, 1.95, 0, head);
  // two thorny vines for arms
  const arms = [-1, 1].map(s => {
    const a = new THREE.Group(); a.position.set(s * 0.9, 4.6, 0); body.add(a);
    let p = a;
    for (let k = 0; k < 4; k++) { const seg = new THREE.Group(); seg.position.y = k ? -1.1 : 0; seg.rotation.z = s * 0.25; p.add(seg); mesh(new THREE.CylinderGeometry(0.28 - k * 0.04, 0.32 - k * 0.04, 1.2, 8), dark, 0, -0.55, 0, seg); mesh(new THREE.ConeGeometry(0.1, 0.4, 4), std(0xf2e2b0), s * 0.3, -0.5, 0, seg).rotation.z = -s * 1.4; p = seg; }
    mesh(new THREE.SphereGeometry(0.5, 10, 8), pink, 0, -1.2, 0, p);
    return a;
  });
  return { root, body, head, arms, eyes, extra: (t) => { head.rotation.z = Math.sin(t * 0.9) * 0.1; } };
}
function buildFrostfang() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const fur = std(0xf2f6fa, { roughness: 1 }), skin = std(0x7a8ea8), ice = std(0x9ae4ff, { roughness: 0.1, emissive: 0x3aa8e0, emissiveIntensity: 0.5, transparent: true, opacity: 0.9 });
  for (const s of [-1, 1]) { mesh(new THREE.CylinderGeometry(0.9, 1.1, 2.6, 10), fur, s * 1.3, 1.3, 0, root); mesh(new THREE.SphereGeometry(1.1, 10, 8), skin, s * 1.3, 0.3, -0.4, root).scale.set(1, 0.4, 1.3); }
  const torso = mesh(new THREE.SphereGeometry(2.6, 16, 12), fur, 0, 4.3, 0, body); torso.scale.set(1, 1.2, 0.9);
  mesh(new THREE.SphereGeometry(1.8, 14, 10), std(0xc8dcef, { roughness: 1 }), 0, 4.0, -1.2, body).scale.set(1, 1.1, 0.5);
  for (let i = 0; i < 6; i++) { const c = mesh(new THREE.OctahedronGeometry(0.5 + (i % 3) * 0.2, 0), ice, (i - 2.5) * 0.7, 6.2 + Math.sin(i) * 0.4, 1.6 - Math.abs(i - 2.5) * 0.2, body); c.scale.y = 2; c.rotation.x = -0.5; }
  const head = new THREE.Group(); head.position.set(0, 7.3, -0.6); body.add(head);
  mesh(new THREE.SphereGeometry(1.5, 14, 10), fur, 0, 0, 0, head);
  mesh(new THREE.SphereGeometry(1.05, 12, 10), skin, 0, -0.2, -0.9, head).scale.set(1, 0.9, 0.55);
  const eyes = [-1, 1].map(s => mesh(new THREE.SphereGeometry(0.2, 8, 6), glowM(0x5af0ff), s * 0.45, 0.15, -1.4, head));
  for (const s of [-1, 1]) {
    const h = mesh(new THREE.ConeGeometry(0.28, 1.6, 8), ice, s * 1.2, 1.0, 0, head); h.rotation.z = -s * 0.6;
    const tusk = mesh(new THREE.ConeGeometry(0.12, 0.6, 6), std(0xffffff), s * 0.35, -0.75, -1.35, head); tusk.rotation.x = Math.PI;
  }
  const arms = [-1, 1].map(s => {
    const a = new THREE.Group(); a.position.set(s * 2.5, 5.6, 0); body.add(a);
    mesh(new THREE.CylinderGeometry(0.7, 0.85, 3.6, 10), fur, 0, -1.8, 0, a);
    mesh(new THREE.SphereGeometry(0.95, 10, 8), skin, 0, -3.8, 0, a);
    return a;
  });
  return { root, body, head, arms, eyes };
}
function buildTickTock() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const brass = std(0xc8963c, { metalness: 0.7, roughness: 0.35 }), dark = std(0x4a3a2a, { metalness: 0.6, roughness: 0.4 }), copper = std(0xb8643a, { metalness: 0.7, roughness: 0.4 });
  for (const s of [-1, 1]) { mesh(new THREE.BoxGeometry(1.3, 3, 1.5), dark, s * 1.4, 1.5, 0, root); mesh(new THREE.BoxGeometry(1.7, 0.6, 2.4), brass, s * 1.4, 0.3, -0.3, root); }
  mesh(new THREE.BoxGeometry(4.6, 4, 3), brass, 0, 5, 0, body);
  mesh(new THREE.BoxGeometry(4.8, 0.3, 3.2), copper, 0, 3.1, 0, body);
  // a clock face on the chest with turning hands, and a big gear on the back
  const face = mesh(new THREE.CircleGeometry(1.5, 32), std(0xfff4dc, { roughness: 0.4 }), 0, 5, -1.52, body); face.rotation.y = Math.PI;
  mesh(new THREE.TorusGeometry(1.5, 0.12, 8, 32), copper, 0, 5, -1.52, body);
  const hands = [1.2, 0.8].map((l, i) => { const p = new THREE.Group(); p.position.set(0, 5, -1.58); body.add(p); mesh(new THREE.BoxGeometry(0.12, l, 0.05), glowM(i ? 0x2a2a2a : 0xff3a3a), 0, l / 2, 0, p); return p; });
  const gear = new THREE.Group(); gear.position.set(0, 5.2, 1.6); body.add(gear);
  mesh(new THREE.CylinderGeometry(1.8, 1.8, 0.3, 20), dark, 0, 0, 0, gear).rotation.x = Math.PI / 2;
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; mesh(new THREE.BoxGeometry(0.5, 0.5, 0.3), dark, Math.cos(a) * 2, Math.sin(a) * 2, 0, gear).rotation.z = a; }
  const head = new THREE.Group(); head.position.y = 7.9; body.add(head);
  mesh(new THREE.BoxGeometry(2.4, 1.7, 2.1), brass, 0, 0, 0, head);
  const eye = mesh(new THREE.SphereGeometry(0.5, 14, 10), glowM(0x5af0ff), 0, 0.05, -1.0, head);
  mesh(new THREE.TorusGeometry(0.55, 0.1, 8, 20), copper, 0, 0.05, -1.06, head);
  mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 6), dark, 0, 1.3, 0, head);
  const bulb = mesh(new THREE.SphereGeometry(0.18, 8, 6), glowM(0xff3a3a), 0, 1.85, 0, head);
  for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(0.25, 0.3, 1.6, 8), dark, s * 1.6, 7.6, 1.2, body);
  const arms = [-1, 1].map(s => {
    const a = new THREE.Group(); a.position.set(s * 2.8, 6.4, 0); body.add(a);
    mesh(new THREE.SphereGeometry(0.75, 10, 8), copper, 0, 0, 0, a);
    mesh(new THREE.BoxGeometry(0.9, 3.2, 0.9), brass, 0, -1.8, 0, a);
    mesh(new THREE.CylinderGeometry(0.55, 0.65, 1, 12), dark, 0, -3.6, 0, a);
    return a;
  });
  return { root, body, head, arms, eyes: [eye], extra: (t, dt) => { hands[0].rotation.z = -t * 2; hands[1].rotation.z = -t * 0.2; gear.rotation.z += dt * 1.2; bulb.visible = ((t * 3) | 0) % 2 === 0; } };
}
const BUILD = { magmaw: buildMagmaw, thornqueen: buildThornqueen, frostfang: buildFrostfang, ticktock: buildTickTock };

export function initRaid(G, diff = 'normal', which = 'magmaw') {
  const id = bossOf(which), def = BOSSES[id];
  const b = createStructure(G, 'core', 'red', 0, 0);
  b.kind = 'boss'; b.name = def.name;
  b.maxHp = b.hp = Math.round(def.hp * (DIFF_HP[diff] || 1));
  b.rad = RAID.rad; b.height = RAID.height;
  G.colliders.splice(G.colliders.indexOf(b.collider), 1);           // it walks, so it can't be a wall
  for (const c of [...b.mesh.children]) if (c !== b.bar) b.mesh.remove(c);
  const m = BUILD[id]();
  b.mesh.add(m.root);
  b.bar.position.y = RAID.height + 1.6; b.bar.scale.setScalar(2.2);
  setBar(b, def.color);
  b.model = m;
  G.raid = { id, def, diff, boss: b, phase: 1, time: RAID.time, rest: 3, act: null, danger: [], pools: [], wave: null, pods: [], missiles: [], stagger: 0, yaw: 0, walkT: 0 };
  G.score = { blue: 0, red: 0 };
}

// ---------- telegraphs: circles, lines and cones that fill up red, then land ----------
function mark(G, shape, o, wind, hit) {
  const g = new THREE.Group(); g.position.set(o.x, 0, o.z); g.rotation.y = o.ang || 0; G.scene.add(g);
  let edge, fill;
  if (shape === 'circle') {
    edge = mesh(new THREE.RingGeometry(o.r - 0.35, o.r, 40), basic(RED), 0, 0.07, 0, g);
    fill = mesh(new THREE.CircleGeometry(o.r, 40), basic(RED, 0.18), 0, 0.06, 0, g);
  } else if (shape === 'line') {
    edge = mesh(new THREE.PlaneGeometry(o.w, o.len), basic(RED, 0.25), 0, 0.07, o.len / 2, g);
    fill = mesh(new THREE.PlaneGeometry(o.w, o.len), basic(RED, 0.3), 0, 0.08, o.len / 2, g);
  } else {
    const geo = () => new THREE.CircleGeometry(o.r, 32, -Math.PI / 2 - o.half, o.half * 2);
    edge = mesh(geo(), basic(RED, 0.22), 0, 0.07, 0, g);
    fill = mesh(geo(), basic(RED, 0.3), 0, 0.08, 0, g);
  }
  edge.rotation.x = fill.rotation.x = -Math.PI / 2; edge.castShadow = fill.castShadow = false;
  fill.scale.setScalar(0.01);
  const d = { shape, ...o, t: 0, wind, g, edge, fill, hit };
  G.raid.danger.push(d);
  return d;
}
function unmark(G, d) {
  G.scene.remove(d.g); d.g.traverse(o => o.geometry?.dispose());
  const R = G.raid; R.danger.splice(R.danger.indexOf(d), 1);
}
function moveMark(d, x, z) { d.x = x; d.z = z; d.g.position.set(x, 0, z); }
// is a point inside a telegraph (pad grows it a little, for bots playing it safe)
function inside(d, p, pad = 0.4) {
  const dx = p.x - d.x, dz = p.z - d.z;
  if (d.shape === 'circle') return Math.hypot(dx, dz) < d.r + pad;
  const s = Math.sin(d.ang), c = Math.cos(d.ang), along = dx * s + dz * c, side = dx * c - dz * s;
  if (d.shape === 'line') return along > -pad && along < d.len + pad && Math.abs(side) < d.w / 2 + pad;
  const dist = Math.hypot(dx, dz); if (dist > d.r + pad) return false;
  return dist < 1.5 || Math.abs(Math.atan2(side, along)) < d.half + pad / Math.max(1, dist);
}
// hurt every raider caught by a test, with optional knockback (from a point), slow, root or freeze
function hitWhere(G, test, dmg, o = {}) {
  const b = G.raid.boss;
  for (const h of heroes(G)) {
    if (!test(h)) continue;
    damage(G, h, dmg, b);
    if (o.push) { const from = o.from || b.pos, away = V(h.pos.x - from.x, h.pos.z - from.z); if (away.lengthSq() < 0.01) away.set(1, 0, 0); knock(h, away.normalize(), o.push, o.up ?? 6); }
    if (o.slow) slow(h, o.slow, o.slowT || 2.5);
    if (o.root) root(h, o.root);
    if (o.freeze && h.alive) freeze(G, h, o.freeze, 1.5);
  }
}
const impact = (G, x, z, r, c) => { const at = V(x, z, 0.3); burst(G, at, c, r * 0.8); burst(G, at, 0x4a3a34, r * 0.4); ring(G, at, RED, r); G.ev.raid?.('impact', at); };
const circleHit = (dmg, o = {}, c) => (G, d) => { impact(G, d.x, d.z, d.r, c || G.raid.def.color); hitWhere(G, h => inside(d, h.pos, 0), dmg, { ...o, from: V(d.x, d.z) }); };
function pool(G, x, z, r, life, color, dps, slowM) {
  const pm = mesh(new THREE.CircleGeometry(r, 32), basic(color, 0.7), x, 0.05, z, G.scene); pm.rotation.x = -Math.PI / 2; pm.castShadow = false;
  G.raid.pools.push({ x, z, r, life, mesh: pm, dps, slow: slowM });
}
// n circles dropped around the raiders (one right on each, the rest scattered)
function scatter(G, n, r, wind, hit) {
  const hs = heroes(G), out = [];
  for (let i = 0; i < n; i++) {
    const h = hs[i % hs.length], a = Math.random() * Math.PI * 2, s = i < hs.length ? Math.random() * 1.5 : 2 + Math.random() * 7;
    out.push(mark(G, 'circle', clampIn(G, { x: h.pos.x + Math.cos(a) * s, z: h.pos.z + Math.sin(a) * s, r }), wind + i * 0.08, hit));
  }
  return out;
}

// ---------- attacks: start() sets things up, tick() runs it; it ends when tick says so ----------
// (telegraphs land on their own; an attack with only telegraphs ends when they've all landed)
const ATTACKS = {
  // Magmaw
  slam: { start(G, R, b, n) { const d = mark(G, 'circle', { x: n.pos.x, z: n.pos.z, r: 5 }, 1.2, (G, d) => { circleHit(75, { push: 14 })(G, d); G.ev.shake?.(n, 1); }); return { track: [d, n] }; } },
  rain: { start(G, R) { scatter(G, [5, 7, 10][R.phase - 1], 2.6, 1.4, circleHit(45, { push: 6 })); return {}; } },
  pool: { start(G) { scatter(G, 3, 3.2, 1.4, (G, d) => { circleHit(20)(G, d); pool(G, d.x, d.z, 3.2, 7, 0xff5a1a, 30); }); return {}; } },
  wave: {
    warn: ['Shockwave!', 'Jump over the ring'],
    start() { return { waveAt: 0.9 }; },
    tick(G, R, A, dt) {
      if (A.t > A.waveAt && !R.wave) {
        const b = R.boss, w = mesh(new THREE.TorusGeometry(1, 0.35, 8, 48), glowM(R.def.color), b.pos.x, 0.35, b.pos.z, G.scene); w.rotation.x = -Math.PI / 2;
        R.wave = { r: RAID.rad, mesh: w, hit: new Set(), at: b.pos.clone() };
        G.ev.raid?.('impact', b.pos); G.ev.shake?.(b, 0.6);
      }
      if (!R.wave) return false;
      const W = R.wave; W.r += 13 * dt; W.mesh.scale.set(W.r, W.r, 1);
      for (const h of heroes(G)) if (!W.hit.has(h) && Math.abs(flat(h.pos, W.at) - W.r) < 0.9 && h.pos.y < 0.9) {
        W.hit.add(h); damage(G, h, 40, R.boss); knock(h, V(h.pos.x - W.at.x, h.pos.z - W.at.z).normalize(), 10, 5);
      }
      if (W.r > 26) { G.scene.remove(W.mesh); W.mesh.geometry.dispose(); R.wave = null; return true; }
      return false;
    },
  },
  // Thornqueen
  lash: {
    start(G, R, b) {
      const hs = heroes(G).slice(0, R.phase === 3 ? 3 : R.phase === 2 ? 2 : 1);
      for (const h of hs) {
        const ang = angTo(b.pos, h.pos);
        mark(G, 'line', { x: b.pos.x, z: b.pos.z, ang, len: 32, w: 3 }, 1.1, (G, d) => {
          for (let k = 4; k < d.len; k += 4) burst(G, V(d.x + Math.sin(d.ang) * k, d.z + Math.cos(d.ang) * k, 0.5), 0x3f9a4a, 1);
          G.ev.raid?.('impact', V(d.x + Math.sin(d.ang) * 10, d.z + Math.cos(d.ang) * 10));
          hitWhere(G, u => inside(d, u.pos, 0), 55, { push: 12 });
        });
      }
      return {};
    },
  },
  snare: { start(G) { for (const h of heroes(G)) mark(G, 'circle', { x: h.pos.x, z: h.pos.z, r: 2 }, 0.9, (G, d) => { impact(G, d.x, d.z, d.r, 0x3f9a4a); hitWhere(G, u => inside(d, u.pos, 0), 25, { root: 1.6 }); }); return {}; } },
  spores: { start(G) { scatter(G, 4, 3.5, 1.3, (G, d) => { circleHit(10, {}, 0xc8ff6a)(G, d); pool(G, d.x, d.z, 3.5, 8, 0xb8e85a, 12, 0.5); }); return {}; } },
  thrash: { start(G, R, b) { mark(G, 'circle', { x: b.pos.x, z: b.pos.z, r: 8 }, 1.0, circleHit(50, { push: 16 })); return {}; } },
  pods: {
    warn: ['Seed pods!', 'Destroy them before they hatch, or she heals'],
    start(G, R, b) { if (R.pods.some(p => p.alive)) return null; for (let i = 0; i < 3; i++) spawnPod(G, R, b, i); return { done: true }; },
  },
  // Frostfang
  breath: {
    start(G, R, b, n) {
      const ang = angTo(b.pos, n.pos); R.yaw = Math.atan2(-(n.pos.x - b.pos.x), -(n.pos.z - b.pos.z));
      mark(G, 'cone', { x: b.pos.x, z: b.pos.z, ang, r: 16, half: 0.45 }, 1.1, (G, d) => {
        for (let k = 3; k < d.r; k += 3) for (const s of [-0.3, 0, 0.3]) burst(G, V(d.x + Math.sin(d.ang + s) * k, d.z + Math.cos(d.ang + s) * k, 1), 0xbfeaff, 0.9);
        hitWhere(G, u => inside(d, u.pos, 0), 45, { slow: 0.5, slowT: 3 });
      });
      return {};
    },
  },
  charge: {
    start(G, R, b, n) {
      const ang = angTo(b.pos, n.pos), to = clampIn(G, { x: b.pos.x + Math.sin(ang) * Math.min(32, flat(b.pos, n.pos) + 6), z: b.pos.z + Math.cos(ang) * Math.min(32, flat(b.pos, n.pos) + 6) });
      const len = Math.hypot(to.x - b.pos.x, to.z - b.pos.z);
      R.yaw = Math.atan2(-(n.pos.x - b.pos.x), -(n.pos.z - b.pos.z));
      const A = {};
      mark(G, 'line', { x: b.pos.x, z: b.pos.z, ang, len, w: 4.4 }, [1.3, 1.1, 0.9][R.phase - 1], (G, d) => { A.dash = { fx: b.pos.x, fz: b.pos.z, tx: to.x, tz: to.z, t: 0, d, hit: new Set() }; });
      return A;
    },
    tick(G, R, A, dt) {
      if (!A.dash) return false;
      const D = A.dash, b = R.boss; D.t = Math.min(1, D.t + dt / 0.55);
      b.pos.x = D.fx + (D.tx - D.fx) * D.t; b.pos.z = D.fz + (D.tz - D.fz) * D.t;
      if (Math.random() < 0.6) burst(G, V(b.pos.x, b.pos.z, 0.4), 0xe8f8ff, 1.2);
      for (const h of heroes(G)) if (!D.hit.has(h) && flat(h.pos, b.pos) < 3.5) { D.hit.add(h); damage(G, h, 60, b); knock(h, V(h.pos.x - b.pos.x, h.pos.z - b.pos.z).normalize(), 18, 7); }
      if (D.t >= 1) { G.ev.raid?.('impact', b.pos); G.ev.shake?.(b, 0.7); return true; }
      return false;
    },
  },
  icicles: { start(G, R) { scatter(G, [5, 7, 9][R.phase - 1], 2.4, 1.3, circleHit(35, { slow: 0.6, slowT: 2 }, 0xbfeaff)); return {}; } },
  freeze: {
    warn: ['Deep Freeze!', 'Keep moving or be frozen solid'],
    start(G) { const m = new Map(); for (const h of heroes(G)) m.set(h, { last: h.pos.clone(), d: 0 }); return { moved: m, until: 3 }; },
    tick(G, R, A) {
      for (const [h, s] of A.moved) { s.d += flat(h.pos, s.last); s.last.copy(h.pos); }
      if (Math.random() < 0.5) { const hs = heroes(G), h = hs[Math.floor(Math.random() * hs.length)]; if (h) burst(G, V(h.pos.x + Math.random() * 6 - 3, h.pos.z + Math.random() * 6 - 3, 2), 0xe8f8ff, 0.8); }
      if (A.t < A.until) return false;
      for (const [h, s] of A.moved) if (h.alive && s.d < 4.5) { damage(G, h, 30, R.boss); if (h.alive) freeze(G, h, 2, 1.5); }
      ring(G, R.boss.pos, 0xbfeaff, 22); G.ev.raid?.('impact', R.boss.pos);
      return true;
    },
  },
  // Tick-Tock
  gearslam: { start(G, R, b, n) { const d = mark(G, 'circle', { x: n.pos.x, z: n.pos.z, r: 4.5 }, 1.1, (G, d) => { circleHit(65, { push: 12 }, 0xffc93c)(G, d); G.ev.shake?.(n, 0.8); }); return { track: [d, n] }; } },
  laser: {
    warn: ['Laser sweep!', 'Jump over the beam'],
    start(G, R, b, n) {
      const ang = angTo(b.pos, n.pos), beams = R.phase === 3 ? [ang, ang + Math.PI] : [ang];
      const lines = beams.map(a => mark(G, 'line', { x: b.pos.x, z: b.pos.z, ang: a, len: 34, w: 0.8 }, 1.0, () => {}));
      return { beams, lines, sweep: null, spin: (Math.random() < 0.5 ? 1 : -1) * Math.PI * 2 / 3.2 };
    },
    tick(G, R, A, dt) {
      const b = R.boss;
      if (!A.sweep) {
        if (A.lines.some(d => R.danger.includes(d))) return false;
        A.sweep = { t: 0, meshes: A.beams.map(() => { const g = new THREE.Group(); G.scene.add(g); const m = mesh(new THREE.BoxGeometry(0.45, 0.45, 34), glowM(0xff3a3a), 0, 0.6, 17, g); m.castShadow = false; mesh(new THREE.BoxGeometry(0.9, 0.9, 34), basic(0xff8a8a, 0.35), 0, 0.6, 17, g).castShadow = false; return g; }), last: new Map() };
      }
      const S = A.sweep; S.t += dt;
      const was = A.beams.slice(); A.beams = A.beams.map(a => a + A.spin * dt);
      A.beams.forEach((a, i) => { S.meshes[i].position.set(b.pos.x, 0, b.pos.z); S.meshes[i].rotation.y = a; });
      R.beam = { at: b.pos, beams: A.beams, spin: A.spin };
      for (const h of heroes(G)) {
        if (h.pos.y > 1.0 || (S.last.get(h) || -9) > G.time - 0.5) continue;
        const dist = flat(h.pos, b.pos); if (dist > 34) continue;
        const ha = angTo(b.pos, h.pos);
        for (let i = 0; i < A.beams.length; i++) {
          const lo = Math.min(was[i], A.beams[i]), hi = Math.max(was[i], A.beams[i]), pad = 0.5 / Math.max(1, dist);
          let x = ha; while (x < lo - Math.PI) x += Math.PI * 2; while (x > lo + Math.PI) x -= Math.PI * 2;
          if (x >= lo - pad && x <= hi + pad) { S.last.set(h, G.time); damage(G, h, 35, b); knock(h, V(Math.cos(A.beams[i]) * Math.sign(A.spin), -Math.sin(A.beams[i]) * Math.sign(A.spin)), 8, 4); break; }
        }
      }
      if (S.t < 3.2) return false;
      for (const m of S.meshes) { G.scene.remove(m); m.traverse(o => o.geometry?.dispose()); }
      R.beam = null;
      return true;
    },
  },
  missiles: {
    start(G, R, b) {
      const hs = heroes(G), n = [4, 5, 6][R.phase - 1];
      for (let i = 0; i < n; i++) {
        const m = mesh(new THREE.SphereGeometry(0.35, 10, 8), glowM(0xffd23c), b.pos.x, 9, b.pos.z, G.scene);
        const a = i / n * Math.PI * 2;
        R.missiles.push({ m, pos: m.position, vel: V(Math.cos(a) * 6, Math.sin(a) * 6, 6), target: hs[i % hs.length], life: 5 + i * 0.15 });
      }
      G.ev.raid?.('launch');
      return { done: true };
    },
  },
  overload: {
    warn: ['OVERLOAD!', 'Only the green circles are safe'],
    start(G, R, b) {
      const safe = [], W = G.map.W - 6, L = Math.min(26, G.map.L - 14);
      for (let i = 0; i < 3; i++) {
        let x, z, k = 0;
        do { x = (Math.random() * 2 - 1) * W; z = (Math.random() * 2 - 1) * L; k++; } while (k < 30 && (Math.hypot(x - b.pos.x, z - b.pos.z) < 7 || safe.some(s => Math.hypot(s.x - x, s.z - z) < 9)));
        const g = new THREE.Group(); g.position.set(x, 0, z); G.scene.add(g);
        const e = mesh(new THREE.RingGeometry(3.1, 3.5, 40), basic(0x39ff6a, 0.9), 0, 0.09, 0, g), f = mesh(new THREE.CircleGeometry(3.5, 40), basic(0x39ff6a, 0.25), 0, 0.08, 0, g);
        e.rotation.x = f.rotation.x = -Math.PI / 2; e.castShadow = f.castShadow = false;
        safe.push({ x, z, r: 3.5, g });
      }
      const floor = mesh(new THREE.PlaneGeometry(G.map.W * 2, G.map.L * 2), basic(RED, 0.1), 0, 0.05, 0, G.scene); floor.rotation.x = -Math.PI / 2; floor.castShadow = false;
      R.safe = safe;
      return { safe, floor, until: 3.6 };
    },
    tick(G, R, A) {
      A.floor.material.opacity = 0.08 + (A.t / A.until) * 0.25 + Math.sin(G.time * 18) * 0.05;
      if (A.t < A.until) return false;
      const outside = h => !A.safe.some(s => Math.hypot(h.pos.x - s.x, h.pos.z - s.z) < s.r + 0.3);
      for (const h of heroes(G)) if (outside(h)) burst(G, V(h.pos.x, h.pos.z, 1), 0x5af0ff, 1.5);
      hitWhere(G, outside, 70, { push: 6, up: 9 });
      ring(G, R.boss.pos, 0x5af0ff, 30); G.ev.raid?.('impact', R.boss.pos); G.ev.shake?.(R.boss, 1);
      for (const s of A.safe) { G.scene.remove(s.g); s.g.traverse(o => o.geometry?.dispose()); }
      G.scene.remove(A.floor); A.floor.geometry.dispose(); R.safe = null;
      return true;
    },
  },
};

// Thornqueen seed pods: little bulbs that hatch after 10s and heal her 7% each, unless destroyed first
function spawnPod(G, R, b, i) {
  const a = Math.random() * Math.PI * 2 / 3 + i * Math.PI * 2 / 3, d = 11 + Math.random() * 6;
  const at = clampIn(G, { x: b.pos.x + Math.cos(a) * d, z: b.pos.z + Math.sin(a) * d });
  const s = createStructure(G, 'tower', 'red', at.x, at.z);
  s.kind = 'pod'; s.name = 'Seed pod';
  s.maxHp = s.hp = Math.round(520 * (DIFF_HP[R.diff] || 1));
  G.colliders.splice(G.colliders.indexOf(s.collider), 1);
  for (const c of [...s.mesh.children]) if (c !== s.bar) s.mesh.remove(c);
  const bulb = mesh(new THREE.SphereGeometry(0.9, 14, 10), std(0x8a1f5a, { emissive: 0xff4fa3, emissiveIntensity: 0.3 }), 0, 1.1, 0, s.mesh); bulb.scale.y = 1.3;
  for (let k = 0; k < 5; k++) { const l = mesh(new THREE.SphereGeometry(0.6, 8, 6), std(0x3f9a4a), Math.cos(k * 1.26) * 0.7, 0.3, Math.sin(k * 1.26) * 0.7, s.mesh); l.scale.set(1, 0.25, 0.6); l.rotation.y = -k * 1.26; }
  s.bar.position.y = 3; setBar(s, 0xff4fa3);
  const hb = s.hitbox; hb.minX = at.x - 1; hb.maxX = at.x + 1; hb.minZ = at.z - 1; hb.maxZ = at.z + 1; hb.top = 2.6;
  s.hatch = 10; s.bulb = bulb; s.pos.y = 0;
  R.pods.push(s);
}
function updatePods(G, R, dt) {
  for (let i = R.pods.length - 1; i >= 0; i--) {
    const p = R.pods[i];
    if (!p.alive) { R.pods.splice(i, 1); G.ev.raid?.('pod', 'down'); continue; }
    p.hatch -= dt;
    p.bulb.scale.setScalar(1 + (1 - p.hatch / 10) * 0.5 + Math.sin(G.time * (14 - p.hatch)) * 0.05); p.bulb.scale.y *= 1.3;
    if (p.hatch <= 0) {
      const b = R.boss; b.hp = Math.min(b.maxHp, b.hp + b.maxHp * 0.07); setBar(b);
      burst(G, p.pos.clone().setY(1.5), 0xff4fa3, 2.5); burst(G, b.pos.clone().setY(7), 0x39ff6a, 3);
      p.alive = false; p.mesh.visible = false; R.pods.splice(i, 1);
      G.ev.raid?.('pod', 'heal');
    }
  }
}
function updateMissiles(G, R, dt) {
  for (let i = R.missiles.length - 1; i >= 0; i--) {
    const M = R.missiles[i];
    M.life -= dt;
    if (!M.target?.alive) M.target = heroes(G)[0];
    if (M.target) {
      const want = V(M.target.pos.x - M.pos.x, M.target.pos.z - M.pos.z, M.target.pos.y + 1 - M.pos.y).normalize().multiplyScalar(7.5);
      M.vel.lerp(want, Math.min(1, dt * 1.6));
    }
    M.pos.addScaledVector(M.vel, dt);
    if (Math.random() < 0.5) burst(G, M.pos.clone(), 0xffa83c, 0.3);
    const hitHero = heroes(G).some(h => Math.hypot(h.pos.x - M.pos.x, h.pos.z - M.pos.z) < 1.4 && Math.abs(h.pos.y + 1 - M.pos.y) < 1.8);
    if (hitHero || M.life <= 0 || M.pos.y < 0.2) {
      burst(G, M.pos.clone(), 0xffd23c, 1.6); ring(G, V(M.pos.x, M.pos.z, 0.1), RED, 2.4);
      hitWhere(G, h => Math.hypot(h.pos.x - M.pos.x, h.pos.z - M.pos.z) < 2.4, 40, { push: 8, from: M.pos.clone() });
      G.ev.raid?.('impact', M.pos);
      G.scene.remove(M.m); M.m.geometry.dispose(); R.missiles.splice(i, 1);
    }
  }
}

// what the boss does next
function choose(G) {
  const R = G.raid, b = R.boss, D = R.def, n = near(G, b); if (!n) return;
  const opts = [...D.moves];
  if (R.phase >= 2) opts.push(...D.phase2);
  if (flat(n.pos, b.pos) < 9) opts.push(...D.close);
  for (let tries = 0; tries < 5; tries++) {
    const kind = opts[Math.floor(Math.random() * opts.length)], atk = ATTACKS[kind];
    const A = atk.start(G, R, b, n);
    if (!A) continue;                                                   // couldn't (e.g. pods already out)
    R.act = { kind, t: 0, ...A };
    G.ev.raid?.('wind', kind, atk.warn);
    return;
  }
}

export function updateRaid(G, dt) {
  const R = G.raid; if (!R) return;
  const b = R.boss;
  // pools keep hurting (and maybe slowing) whoever stands in them
  for (let i = R.pools.length - 1; i >= 0; i--) {
    const p = R.pools[i]; p.life -= dt;
    p.mesh.material.opacity = Math.min(0.7, p.life * 0.3) * (0.8 + Math.sin(G.time * 6 + i) * 0.2);
    for (const h of heroes(G)) if (flat(h.pos, p) < p.r && h.onGround) { damage(G, h, p.dps * dt, b, false, false, true); if (p.slow) slow(h, p.slow, 0.4); }
    if (p.life <= 0) { G.scene.remove(p.mesh); p.mesh.geometry.dispose(); R.pools.splice(i, 1); }
  }
  updateMissiles(G, R, dt);
  if (!b.alive || G.over) { for (const d of [...R.danger]) unmark(G, d); for (const p of R.pods) if (p.alive) { p.alive = false; p.mesh.visible = false; } animate(G, R, dt, 0); return; }
  updatePods(G, R, dt);

  R.time -= dt;
  if (R.time <= 0) { G.ev.raid?.('time'); return; }
  if (!heroes(G).length) { G.ev.raid?.('wipe'); return; }

  // phases
  const f = b.hp / b.maxHp, want = f > 0.66 ? 1 : f > 0.33 ? 2 : 3;
  if (want > R.phase) { R.phase = want; R.stagger = 1.6; G.ev.raid?.('phase', want); ring(G, b.pos, R.def.color, 14); burst(G, b.pos.clone().setY(5), R.def.color, 6); }

  // telegraphs fill up, then land
  for (const d of [...R.danger]) {
    d.t += dt; const k = Math.min(1, d.t / d.wind);
    if (d.shape === 'line') { d.fill.scale.set(1, Math.max(0.01, k), 1); d.fill.position.z = d.len * k / 2; } else d.fill.scale.setScalar(Math.max(0.01, k));
    d.edge.material.opacity = (d.shape === 'circle' ? 0.5 : 0.18) + Math.sin(G.time * 20) * (d.shape === 'circle' ? 0.3 : 0.1);
    if (d.t >= d.wind) { d.hit?.(G, d); unmark(G, d); }
  }
  let moving = 0;
  if (R.stagger > 0) R.stagger -= dt;
  else if (R.act) {
    const A = R.act; A.t += dt;
    if (A.track) { const [d, h] = A.track; if (h.alive && R.danger.includes(d) && d.t < d.wind - 0.35) moveMark(d, h.pos.x, h.pos.z); }
    const tick = ATTACKS[A.kind].tick;
    const done = A.done || (tick ? tick(G, R, A, dt) : !R.danger.length);
    if (done && !R.danger.length) { R.act = null; R.rest = R.def.rest[R.phase - 1]; }
  } else {
    // between attacks: walk toward the closest raider
    const n = near(G, b);
    if (n && R.def.keep && flat(n.pos, b.pos) > R.def.keep) {
      const dx = n.pos.x - b.pos.x, dz = n.pos.z - b.pos.z, l = Math.hypot(dx, dz), sp = R.def.speed[R.phase - 1];
      b.pos.x += dx / l * sp * dt; b.pos.z += dz / l * sp * dt; moving = 1;
      clampIn(G, b.pos);
    }
    if (n) R.yaw = Math.atan2(-(n.pos.x - b.pos.x), -(n.pos.z - b.pos.z));
    if ((R.rest -= dt) <= 0) choose(G);
  }
  b.mesh.position.set(b.pos.x, 0, b.pos.z);
  const hb = b.hitbox, w = RAID.rad * 1.6;
  hb.minX = b.pos.x - w; hb.maxX = b.pos.x + w; hb.minZ = b.pos.z - w; hb.maxZ = b.pos.z + w; hb.top = RAID.height;
  animate(G, R, dt, moving || (R.act?.dash && R.act.dash.t < 1 ? 2 : 0));
}

function animate(G, R, dt, moving) {
  const b = R.boss, m = b.model, t = G.time;
  if (!b.alive) return;
  R.walkT += dt * Math.min(1, moving) * 5 * (moving > 1 ? 2.5 : 1);
  let d = R.yaw - m.root.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
  m.root.rotation.y += d * Math.min(1, dt * 3);
  const A = R.act, k = A ? A.kind : '';
  const wind = A && /slam|wave|thrash|charge|gearslam/.test(k) ? Math.min(1, A.t / 0.9) : 0;
  const cast = A && /rain|pool|spores|icicles|missiles|overload|freeze|pods|snare/.test(k) ? Math.sin(Math.min(1, A.t / 0.5) * Math.PI) : 0;
  const reach = A && /lash|breath|laser/.test(k) ? Math.min(1, A.t / 0.6) : 0;
  const mv = Math.min(1, moving);
  m.body.position.y = Math.abs(Math.sin(R.walkT)) * 0.15 * mv + Math.sin(t * 1.2) * 0.06;
  m.body.rotation.z = Math.sin(R.walkT) * 0.05 * mv + (R.stagger > 0 ? Math.sin(t * 14) * 0.08 : 0);
  m.body.rotation.x = -wind * 0.15 + reach * 0.12 + (R.stagger > 0 ? 0.25 : 0) + (moving > 1 ? 0.35 : 0);
  m.arms.forEach((a, i) => { a.rotation.x = -wind * 2.9 - cast * 1.8 - reach * 1.4 + Math.sin(R.walkT + i * Math.PI) * 0.35 * mv; });
  const glow = 0.8 + R.phase * 0.25 + Math.sin(t * 8) * 0.1 * R.phase;
  for (const e of m.eyes) e.scale.set(glow, glow, 1);
  m.extra?.(t, dt);
}

// ---------- for the HUD and the bots ----------
const inPool = (R, p) => R.pools.some(q => flat(p, q) < q.r);
const unsafe = (R, p) => R.danger.some(d => inside(d, p, 1.2)) || inPool(R, p) || (R.safe && !R.safe.some(s => Math.hypot(p.x - s.x, p.z - s.z) < s.r - 0.6));
export function raidAlert(G, P, jumpKey) {
  const R = G.raid, A = R.act, n = R.def.name;
  if (R.safe) return { hot: true, text: R.safe.some(s => Math.hypot(P.pos.x - s.x, P.pos.z - s.z) < s.r) ? 'Stay in the green circle!' : 'Get in a green circle!' };
  if (R.wave) return { hot: true, text: `Shockwave! Jump it (${jumpKey})` };
  if (R.beam) return { hot: true, text: `Laser! Jump it (${jumpKey})` };
  if (A?.kind === 'freeze') return { hot: true, text: 'Deep Freeze · keep moving!' };
  if (R.missiles.length) return { hot: true, text: 'Missiles incoming · keep running' };
  if (R.danger.some(d => inside(d, P.pos, 0)) || inPool(R, P.pos)) return { hot: true, text: 'Get out of the red!' };
  if (R.pods.some(p => p.alive)) return { hot: true, text: `Destroy the seed pods! (${R.pods.filter(p => p.alive).length} left)` };
  return { hot: false, text: R.phase === 3 ? `${n} is enraged · finish it!` : `Hit ${n} · ${Math.round(flat(P.pos, R.boss.pos))}m away` };
}

// bots: circle the boss at their range, shoot the pods first, and get out of anything about to land
export function raidGoal(G, b, goal) {
  const R = G.raid, boss = R?.boss; if (!boss?.alive) return null;
  const pod = R.pods.filter(p => p.alive).sort((x, y) => flat(x.pos, b.pos) - flat(y.pos, b.pos))[0];
  const tgt = pod || boss, rad = pod ? 1 : RAID.rad;
  const pref = Math.max(rad + 2, b.def.prefRange * (pod ? 0.6 : 0.9) + rad * 0.5);
  const a = Math.atan2(b.pos.z - tgt.pos.z, b.pos.x - tgt.pos.x) + 0.35 * Math.sin(G.time * 0.4 + b.pos.x);
  goal.set(tgt.pos.x + Math.cos(a) * pref, 0, tgt.pos.z + Math.sin(a) * pref);
  let danger = false;
  if (R.safe) {                                                         // Overload: run to the nearest green circle
    const s = R.safe.slice().sort((x, y) => Math.hypot(x.x - b.pos.x, x.z - b.pos.z) - Math.hypot(y.x - b.pos.x, y.z - b.pos.z))[0];
    goal.set(s.x, 0, s.z); danger = true;
  } else if (unsafe(R, b.pos)) {                                        // step to the nearest spot that's clear
    let best = null, bd = Infinity;
    for (const r of [4, 7, 10]) for (let i = 0; i < 12; i++) {
      const an = i / 12 * Math.PI * 2, p = { x: b.pos.x + Math.cos(an) * r, z: b.pos.z + Math.sin(an) * r };
      if (unsafe(R, p)) continue;
      const d = Math.hypot(p.x - goal.x, p.z - goal.z) + r * 2;
      if (d < bd) { bd = d; best = p; }
    }
    if (best) goal.set(best.x, 0, best.z);
    danger = true;
  } else if (R.act?.kind === 'freeze' || R.missiles.length) danger = true;       // keep moving
  let jump = !!R.wave && Math.abs(flat(b.pos, R.wave.at) - R.wave.r) < 2.2;
  if (R.beam) {                                                         // hop as the laser comes round
    const ha = angTo(R.beam.at, b.pos);
    for (const ba of R.beam.beams) { let d = (ha - ba) * Math.sign(R.beam.spin); d = ((d % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2); if (d < 0.45) jump = true; }
  }
  return { target: tgt, sprint: danger || flat(b.pos, tgt.pos) > pref + 10, jump };
}
export const raidInfo = G => { const R = G.raid; return R && { hp: R.boss.hp, max: R.boss.maxHp, phase: R.phase, time: Math.max(0, R.time), name: R.def.name }; };
