import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { createStructure, damage, burst, ring, setBar, unitDown, TEAM_COLOR } from './units.js?v=20261127j';
import { knock } from './abilities.js?v=20261127j';
import { golem } from './guardian.js?v=20261127j';

// Lane Breaker's neutral camp: the Gilded Golem sleeps off to the side of the middle of the map.
// It's on nobody's team, so either side can take it. Wake it by hitting it (or walking right up
// to it) and it slams whoever is closest. Walk away and it falls asleep again, healed. Whoever
// lands the last hit wins Golem's Might for their whole team (+15% damage, 10% less damage
// taken for 60s; see dealtMult/takenMult in abilities.js). It comes back 90s later.
// It's built as a structure, so every weapon already hits it and its health syncs online like a
// tower's. Online, the host decides when it falls and returns; every machine runs its slams
// against its own heroes (like the Guardians) and tells the others so they can see them.

export const CAMP = { hp: 1800, respawn: 90, buff: 60, wake: 5, aggro: 12, leash: 17, calm: 4,
  slam: { r: 3.6, dmg: 60, wind: 1.1, lock: 0.3, cd: 1.9, knock: 12 }, rad: 2.2, height: 7.6 };
const GOLD = 0xffc93c;

const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

export function initCamp(G) {
  TEAM_COLOR.neutral = GOLD;                                             // bursts, rubble and the minimap colour it gold
  const at = G.map.camp || [-(G.map.W - 7), 0];
  const s = createStructure(G, 'core', 'red', at[0], at[1]);              // after the bases, so its online key is the same everywhere
  s.kind = 'camp'; s.team = 'neutral'; s.name = 'Gilded Golem';
  s.maxHp = s.hp = CAMP.hp; s.rad = CAMP.rad; s.height = CAMP.height; s.hitbox.top = CAMP.height;
  for (const c of [...s.mesh.children]) if (c !== s.bar) s.mesh.remove(c);
  const m = golem('neutral', GOLD, 0xb89a62, 0x6b5636);
  m.root.scale.setScalar(0.95);
  m.root.rotation.y = at[0] > 0 ? Math.PI / 2 : -Math.PI / 2;           // faces into the map
  // a little stone crown, and gold veins in the rock
  const gold = new THREE.MeshStandardMaterial({ color: GOLD, emissive: GOLD, emissiveIntensity: 0.35, roughness: 0.3, metalness: 0.5 });
  for (let i = -2; i <= 2; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 5), gold); c.position.set(i * 0.34, 0.85, 0); m.head.add(c); }
  for (const [x, y, w, h] of [[-1.1, 3.6, 0.18, 1.3], [0.9, 4.4, 0.16, 0.9], [0.3, 3.1, 1.1, 0.14]]) { const v = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), gold); v.position.set(x, y, -1.22); m.body.add(v); }
  s.mesh.add(m.root);
  s.bar.position.y = CAMP.height + 1.2; s.bar.scale.setScalar(1.6);
  setBar(s, GOLD);
  // its lair, painted on the ground, and the warning circle for slams
  const lair = new THREE.Mesh(new THREE.RingGeometry(CAMP.aggro - 0.3, CAMP.aggro, 64),
    new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }));
  lair.rotation.x = -Math.PI / 2; lair.position.set(at[0], 0.06, at[1]); G.scene.add(lair);
  const mark = new THREE.Mesh(new THREE.RingGeometry(CAMP.slam.r - 0.4, CAMP.slam.r, 40),
    new THREE.MeshBasicMaterial({ color: 0xff2a2a, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }));
  mark.rotation.x = -Math.PI / 2; mark.visible = false; G.scene.add(mark);
  G.camp = { s, m, lair, mark, pos: s.pos, team: "neutral", up: true, respawnT: 0, awake: false, calmT: 0, state: 'idle', t: 0, cd: 0, target: null, at: new THREE.Vector3(), anger: 0, yaw0: m.root.rotation.y };
}

const authority = G => !G.net || G.net.host;
// Golem's Might for everyone on a team (every machine applies it to every hero)
function blessTeam(G, team) {
  for (const h of G.heroes) if (h.team === team) h.campT = CAMP.buff;
}
function revive(G) {
  const C = G.camp, s = C.s;
  s.alive = true; s.hp = s.maxHp; s.collider.alive = true; s.collapseT = 0;
  s.mesh.scale.set(1, 1, 1); s.mesh.rotation.z = 0; s.bar.visible = true; C.m.root.visible = true; setBar(s, GOLD);
  C.up = true; C.awake = false; C.state = 'idle'; C.anger = 0; C.lair.visible = true;
  burst(G, s.pos.clone().setY(3), GOLD, 4); ring(G, s.pos, GOLD, CAMP.aggro * 0.6);
  G.ev.camp?.('up');
}
function fall(G, team) {
  const C = G.camp;
  C.up = false; C.respawnT = CAMP.respawn; C.state = 'idle'; C.mark.visible = false; C.lair.visible = false;
  C.m.root.visible = false;
  burst(G, C.s.pos.clone().setY(3), GOLD, 5);
  if (team === 'blue' || team === 'red') blessTeam(G, team);
  G.ev.camp?.('down', team);
}

export function updateCamp(G, dt) {
  const C = G.camp; if (!C) return;
  const s = C.s;
  // it went down (the host or an offline game decides, and tells everyone)
  if (C.up && !s.alive && authority(G)) { fall(G, s.lastTeam); G.net?.queue({ k: 'camp', s: 0, w: s.lastTeam || '' }); }
  if (!C.up) {
    if (authority(G) && (C.respawnT -= dt) <= 0) { revive(G); G.net?.queue({ k: 'camp', s: 1 }); }
    return;
  }
  if (G.over) { C.mark.visible = false; return; }
  // awake once someone hurts it or walks right up; calms down (and heals) when everyone leaves
  const heroesNear = r => G.heroes.filter(h => h.alive && flat(h.pos, s.pos) < r);
  if (s.hp < s.maxHp - 1 || heroesNear(CAMP.wake).length) C.awake = true;
  if (C.awake && !heroesNear(CAMP.leash).length) {
    if ((C.calmT += dt) > CAMP.calm) {
      C.awake = false; C.calmT = 0;
      if (authority(G) && s.hp < s.maxHp) { s.hp = s.maxHp; setBar(s, GOLD); burst(G, s.pos.clone().setY(3), GOLD, 2); }
    }
  } else C.calmT = 0;
  // slams: only at heroes this machine runs
  C.cd -= dt;
  if (C.awake && C.state === 'idle' && C.cd <= 0) {
    let pick = null;
    for (const h of G.heroes) {
      if (!h.alive || (G.net && !h.local) || flat(h.pos, s.pos) > CAMP.aggro) continue;
      if (!pick || flat(h.pos, s.pos) < flat(pick.pos, s.pos)) pick = h;
    }
    if (pick) { C.state = 'wind'; C.t = 0; C.target = pick; C.at.copy(pick.pos); G.ev.guardian?.('wind', C); }
  }
  if (C.state === 'wind') {
    C.t += dt;
    if (C.t < CAMP.slam.wind - CAMP.slam.lock && C.target?.alive) C.at.copy(C.target.pos);
    if (C.t >= CAMP.slam.wind) slam(G, true);
  }
  if (C.state === 'recover' && (C.t += dt) > 0.5) C.state = 'idle';
  C.anger += ((C.awake ? 1 : 0) - C.anger) * Math.min(1, dt * 3);
  visuals(G, C, dt);
}

function slam(G, real) {
  const C = G.camp, sl = CAMP.slam;
  C.state = 'recover'; C.t = 0; C.cd = sl.cd;
  const at = C.at.clone().setY(0.2);
  burst(G, at, 0xb89a62, sl.r * 0.8); burst(G, at, GOLD, sl.r * 0.5); ring(G, at, 0xff2a2a, sl.r); ring(G, at, GOLD, sl.r * 1.5);
  G.ev.guardian?.('slam', C, at);
  if (!real) return;
  G.net?.queue({ k: 'cs', x: Math.round(at.x * 10) / 10, z: Math.round(at.z * 10) / 10 });
  for (const h of G.heroes) {
    if (!h.alive || (G.net && !h.local) || flat(h.pos, at) > sl.r) continue;
    damage(G, h, sl.dmg, C.s);
    const away = new THREE.Vector3(h.pos.x - C.s.pos.x, 0, h.pos.z - C.s.pos.z);
    if (away.lengthSq() < 0.01) away.set(1, 0, 0);
    knock(h, away.normalize(), sl.knock, 6);
    G.ev.shake?.(h, 0.8);
  }
}

// online: the host says it fell (and to whom) or came back; or another machine's slam to show
export function netCamp(G, e) {
  const C = G.camp; if (!C) return;
  if (e.s === 0 && C.up) { if (C.s.alive) unitDown(G, C.s); fall(G, e.w); }
  else if (e.s === 1 && !C.up) revive(G);
}
export function netCampSlam(G, x, z) {
  const C = G.camp; if (!C?.up) return;
  C.at.set(x, 0, z); slam(G, false);
}

function visuals(G, C, dt) {
  const m = C.m, t = G.time, A = C.anger;
  let raise = 0, drop = 0;
  if (C.state === 'wind') raise = Math.min(1, C.t / (CAMP.slam.wind * 0.8));
  if (C.state === 'recover') drop = Math.max(0, 1 - C.t / 0.5);
  // asleep it sits slumped with its head down; awake it stands tall and tracks its target
  m.body.position.y = Math.sin(t * (A > 0.5 ? 1.6 : 0.7)) * 0.08 - (1 - A) * 0.35;
  m.body.rotation.x = (1 - A) * 0.25 + drop * 0.3 - raise * 0.12;
  m.head.rotation.x = (1 - A) * 0.45;
  for (const a of m.arms) a.rotation.x = -raise * 2.9 + drop * 0.9 + (1 - A) * 0.3 + Math.sin(t * 1.3) * 0.04;
  const look = C.state !== 'idle' ? C.at : null;
  const want = look ? Math.atan2(-(look.x - C.s.pos.x), -(look.z - C.s.pos.z)) : C.yaw0;
  let d = want - m.root.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
  m.root.rotation.y += d * Math.min(1, dt * 4);
  for (const e of m.eyes) e.scale.set(1, 0.25 + A * 0.75 + (A > 0.5 ? Math.sin(t * 10) * 0.15 : 0), 1);
  m.eyes[0].material.color.setHex(C.state === 'wind' ? 0xff3a2a : GOLD);
  m.rune.scale.setScalar(0.7 + A * 0.5);
  C.lair.material.opacity = 0.12 + A * 0.25;
  C.mark.visible = C.state === 'wind';
  if (C.mark.visible) {
    const k = C.t / CAMP.slam.wind;
    C.mark.position.set(C.at.x, 0.08, C.at.z);
    C.mark.scale.setScalar(1.6 - k * 0.6);
    C.mark.material.opacity = 0.45 + Math.sin(t * 24) * 0.25;
  }
}

export const campInfo = G => { const C = G.camp; return C && { up: C.up, awake: C.awake, respawn: Math.max(0, Math.ceil(C.respawnT)), hp: C.s.hp, max: C.s.maxHp, pos: C.s.pos }; };
