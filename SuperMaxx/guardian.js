import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { damage, burst, ring, coreVulnerable, TEAM_COLOR } from './units.js?v=20261128e';
import { knock } from './abilities.js?v=20261128e';

// Lane Breaker base Guardians: a huge stone golem stands over each team's spawn. Enemy heroes who
// hang around inside its ring get a second's warning, then it winds up and slams the ground where
// they stand, harder each time they stay. It can't be hurt. It stands aside for a real siege:
// once a team's core is open, heroes pushing it with their own minions nearby are left alone.
// Online, every machine runs the Guardians against its own heroes and tells the others about slams.

export const GUARD = { r: 16, warn: 1, windup: 1.05, lock: 0.35, cd: 1.3, dmg: [90, 135, 190], blast: 4.2, knock: 16 };

const stone = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: true });
const box = (w, h, d, m, x, y, z, parent) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o; };

export function golem(team, glowHex, rockHex = 0x8d8a84, darkHex = 0x5e5b57) {          // also the Boss Raid's body (raid.js)
  const tc = glowHex ?? TEAM_COLOR[team], rock = stone(rockHex), dark = stone(darkHex), glow = new THREE.MeshBasicMaterial({ color: tc });
  const root = new THREE.Group(), body = new THREE.Group();
  root.add(body);
  box(1.3, 2.4, 1.3, dark, -1, 1.2, 0, body); box(1.3, 2.4, 1.3, dark, 1, 1.2, 0, body);            // legs
  const torso = box(3.6, 3, 2.4, rock, 0, 3.9, 0, body);
  box(4.2, 0.9, 2.7, dark, 0, 5.2, 0, body);                                                           // shoulders
  const rune = box(1, 1, 0.1, glow, 0, 4, -1.22, body);                                              // team rune on the chest
  const head = new THREE.Group(); head.position.set(0, 6.1, -0.2); body.add(head);
  box(1.7, 1.3, 1.6, rock, 0, 0, 0, head);
  const eyes = [box(0.36, 0.2, 0.1, glow, -0.4, 0.1, -0.82, head), box(0.36, 0.2, 0.1, glow, 0.4, 0.1, -0.82, head)];
  const arms = [-1, 1].map(s => {
    const sh = new THREE.Group(); sh.position.set(s * 2.4, 5.1, 0); body.add(sh);
    box(1.1, 2.6, 1.1, rock, 0, -1.3, 0, sh);
    box(1.6, 1.4, 1.6, dark, 0, -3, 0, sh);                                                          // fists
    return sh;
  });
  root.scale.setScalar(1.15);
  return { root, body, head, arms, eyes, rune, torso };
}

export function initGuardians(G) {
  G.guardians = [];
  const L = G.map.L, W = G.map.W || 30;
  for (const team of ['blue', 'red']) {
    const home = team === 'blue' ? -1 : 1, center = new THREE.Vector3(0, 0, home * (L - 5));
    const m = golem(team);
    m.root.position.set(Math.min(8, W * 0.3), 0, home * (L - 3));
    m.root.rotation.y = home > 0 ? 0 : Math.PI;                                       // faces down the map
    G.scene.add(m.root);
    // the ring it guards, painted on the ground
    const zone = new THREE.Mesh(new THREE.RingGeometry(GUARD.r - 0.35, GUARD.r, 64),
      new THREE.MeshBasicMaterial({ color: TEAM_COLOR[team], transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }));
    zone.rotation.x = -Math.PI / 2; zone.position.set(center.x, 0.06, center.z); G.scene.add(zone);
    const mark = new THREE.Mesh(new THREE.RingGeometry(GUARD.blast - 0.4, GUARD.blast, 40),
      new THREE.MeshBasicMaterial({ color: 0xff2a2a, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }));
    mark.rotation.x = -Math.PI / 2; mark.visible = false; G.scene.add(mark);
    G.guardians.push({ kind: 'guardian', key: 'guard-' + team, name: 'Guardian', team, center, m, zone, mark, yaw0: m.root.rotation.y,
      state: 'idle', t: 0, cd: 0, target: null, at: new THREE.Vector3(), strikes: new Map(), anger: 0, pos: m.root.position });
  }
}

const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
// a siege with minions is fair game once the core is open
function siegeOpen(G, g, team) {
  if (!coreVulnerable(G, g.team)) return false;
  const core = G.structures.find(s => s.kind === 'core' && s.team === g.team);
  return !!core && G.minions.some(m => m.alive && m.team === team && flat(m.pos, core.pos) < 18);
}
export const guardianOf = (G, h) => G.guardians?.find(g => g.team !== h.team && h.alive && flat(h.pos, g.center) < GUARD.r && !siegeOpen(G, g, h.team));

export function updateGuardians(G, dt) {
  if (!G.guardians) return;
  for (const g of G.guardians) {
    g.cd -= dt;
    // who is trespassing, and for how long (only heroes this machine runs)
    let pick = null, near = false;
    for (const h of G.heroes) {
      if (h.team === g.team || (G.net && !h.local)) continue;
      const inside = !G.over && h.alive && flat(h.pos, g.center) < GUARD.r && !siegeOpen(G, g, h.team);
      if (!inside) { if (h.guardT) { h.guardT = 0; g.strikes.delete(h); } continue; }
      near = true;
      h.guardT = (h.guardT || 0) + dt;
      if (h.guardT > GUARD.warn && (!pick || flat(h.pos, g.center) < flat(pick.pos, g.center))) pick = h;
    }
    if (g.state === 'idle' && pick && g.cd <= 0) { g.state = 'wind'; g.t = 0; g.target = pick; g.at.copy(pick.pos); G.ev.guardian?.('wind', g); }
    if (g.state === 'wind') {
      g.t += dt;
      const tg = g.target;
      if (g.t < GUARD.windup - GUARD.lock && tg?.alive) g.at.copy(tg.pos);               // tracks you, then locks in just before it lands
      if (g.t >= GUARD.windup) slam(G, g, true);
    }
    if (g.state === 'recover' && (g.t += dt) > 0.5) g.state = 'idle';
    g.anger += ((near || g.state === 'wind' ? 1 : 0) - g.anger) * Math.min(1, dt * 3);
    visuals(G, g, dt);
  }
}

function slam(G, g, real) {
  g.state = 'recover'; g.t = 0; g.cd = GUARD.cd;
  const at = g.at.clone().setY(0.2);
  burst(G, at, 0x8d8a84, GUARD.blast * 0.8); burst(G, at, TEAM_COLOR[g.team], GUARD.blast * 0.5);
  ring(G, at, 0xff2a2a, GUARD.blast); ring(G, at, TEAM_COLOR[g.team], GUARD.blast * 1.6);
  G.ev.guardian?.('slam', g, at);
  if (!real) return;
  G.net?.queue({ k: 'gs', t: g.team, x: Math.round(at.x * 10) / 10, z: Math.round(at.z * 10) / 10 });
  for (const h of G.heroes) {
    if (h.team === g.team || !h.alive || (G.net && !h.local) || flat(h.pos, at) > GUARD.blast) continue;
    const n = g.strikes.get(h) || 0; g.strikes.set(h, n + 1);
    damage(G, h, GUARD.dmg[Math.min(n, GUARD.dmg.length - 1)], g);
    const away = new THREE.Vector3(h.pos.x - g.center.x, 0, h.pos.z - g.center.z);
    if (away.lengthSq() < 0.01) away.set(0, 0, -Math.sign(g.center.z));
    knock(h, away.normalize(), GUARD.knock, 7);
    G.ev.shake?.(h, 1);
  }
}

// online: someone else's Guardian slammed one of their heroes; play it out here without damage
export function netGuardSlam(G, team, x, z) {
  const g = G.guardians?.find(o => o.team === team); if (!g) return;
  g.at.set(x, 0, z); slam(G, g, false);
}

function visuals(G, g, dt) {
  const m = g.m, t = G.time, A = g.anger;
  let raise = 0, drop = 0;
  if (g.state === 'wind') raise = Math.min(1, g.t / (GUARD.windup * 0.8));
  if (g.state === 'recover') drop = Math.max(0, 1 - g.t / 0.5);
  // breathe, lean in when angry, arms up over the head on the wind-up and smashed down after
  m.body.position.y = Math.sin(t * 1.3) * 0.08;
  m.body.rotation.x = -A * 0.12 + drop * 0.3 - raise * 0.12;
  for (const a of m.arms) a.rotation.x = -raise * 2.9 + drop * 0.9 + Math.sin(t * 1.3) * 0.04;
  // turn to face what it's after
  const look = g.state !== 'idle' ? g.at : null;
  const want = look ? Math.atan2(-(look.x - g.pos.x), -(look.z - g.pos.z)) : g.yaw0;
  let d = want - m.root.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
  m.root.rotation.y += d * Math.min(1, dt * 4);
  const glow = 0.6 + A * 0.4 + Math.sin(t * 10) * 0.15 * A;
  for (const e of m.eyes) e.scale.set(1 + A * 0.5, 1 + A * 0.8, 1);
  m.eyes[0].material.color.setHex(A > 0.5 ? 0xff3a2a : TEAM_COLOR[g.team]);
  m.rune.scale.setScalar(glow);
  g.zone.material.opacity = 0.2 + A * 0.35 + (A > 0.5 ? Math.sin(t * 8) * 0.1 : 0);
  // the warning circle where it's going to land
  g.mark.visible = g.state === 'wind';
  if (g.mark.visible) {
    const k = g.t / GUARD.windup;
    g.mark.position.set(g.at.x, 0.08, g.at.z);
    g.mark.scale.setScalar(1.6 - k * 0.6);
    g.mark.material.opacity = 0.45 + Math.sin(t * 24) * 0.25;
  }
}

// bots: don't wander into the enemy Guardian's ring unless the siege is on
export function avoidGuardians(G, b, goal) {
  for (const g of G.guardians || []) {
    if (g.team === b.team || siegeOpen(G, g, b.team)) continue;
    const dx = goal.x - g.center.x, dz = goal.z - g.center.z, d = Math.hypot(dx, dz), safe = GUARD.r + 2;
    if (d < safe) { const l = d || 1; goal.x = g.center.x + (dx / l || 0) * safe; goal.z = g.center.z + (d ? dz / l : -Math.sign(g.center.z)) * safe; }
  }
}
