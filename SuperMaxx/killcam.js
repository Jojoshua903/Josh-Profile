import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { buildHeroModel } from './models.js?v=20261129f';
import { poseHero } from './anim.js?v=20261129f';
import { dirFrom, eyeOf, TEAM_COLOR } from './units.js?v=20261129f';
import { sparks } from './vfx.js?v=20261129f';

// Kill cam: when you're knocked out by a hero, the last few seconds play back through their eyes,
// built from the play-of-the-game recording (replay.js keeps every hero's position, aim and shots).
// The live match keeps running underneath; while the replay is on screen, stand-in "ghost" models
// act out the recording and the live heroes, minions and shots are hidden.

const HOLD = 1.1, SLOW = 0.35, NEAR = 38, MAX_GHOSTS = 8;
const tmp = new THREE.Vector3();

function ghostOf(G, h) {
  G._ghosts ||= new Map();
  let g = G._ghosts.get(h);
  if (g && g.def === h.def) return g;
  if (g) G.scene.remove(g.mesh);
  const model = buildHeroModel(h.def, TEAM_COLOR[h.team]);
  model.root.rotation.order = 'YXZ'; model.root.visible = false;
  model.root.traverse(o => { if (o.isMesh) o.castShadow = true; });
  G.scene.add(model.root);
  g = { kind: 'hero', def: h.def, team: h.team, model, mesh: model.root, bar: new THREE.Group(), anim: model.anim, gun: model.gun, shield: model.shield,
    pos: new THREE.Vector3(), vel: new THREE.Vector3(), yaw: 0, pitch: 0, alive: true, onGround: true, hp: 1, maxHp: 1, zoneSlow: 1, zoneMult: 1 };
  G._ghosts.set(h, g);
  return g;
}

// Start a replay of the last `len` seconds before `victim` went down, seen by `killer`. Null if
// there isn't enough recording (the match only just started, or this mode doesn't record).
export function startKillCam(G, killer, victim, len) {
  const R = G.rec; if (!R || len < 1.2) return null;
  const iK = G.heroes.indexOf(killer), iV = G.heroes.indexOf(victim);
  if (iK < 0 || iV < 0) return null;
  const t1 = G.time, t0 = t1 - len;
  const frames = R.frames.filter(f => f.t >= t0 - 0.06 && f.h[iK] && f.h[iV]);
  if (frames.length < 15) return null;
  // the cast: the killer, you, and anyone else close enough to be in the shot
  const f0 = frames[0].h[iK], cast = new Set([iK, iV]);
  G.heroes.forEach((h, i) => {
    if (cast.size >= MAX_GHOSTS || cast.has(i)) return;
    const s = frames[frames.length - 1].h[i] || frames[0].h[i];
    if (s && Math.hypot(s[0] - f0[0], s[2] - f0[2]) < NEAR) cast.add(i);
  });
  const ghosts = new Map([...cast].map(i => [i, ghostOf(G, G.heroes[i])]));
  for (const [i, g] of ghosts) {
    const s = frames[0].h[i];
    g.alive = !!s[7]; g.deathT = g.alive ? 0 : 3; g.spawnA = 0; g.castA = 0; g.recoilA = 0; g.mesh.rotation.set(0, 0, 0);
  }
  const events = R.events.filter(e => e.t >= frames[0].t && e.t <= t1 && cast.has(e.i));
  return { iK, iV, frames, events, ghosts, t: frames[0].t, t0: frames[0].t, t1: frames[frames.length - 1].t, ev: 0, hold: HOLD, done: false };
}

// Advance the replay and put the camera in the killer's eyes. False once it's over.
export function tickKillCam(G, K, dt, camera) {
  if (!K || K.done) return false;
  const F = K.frames;
  if (K.t < K.t1) K.t = Math.min(K.t1, K.t + dt * (K.t1 - K.t < 0.5 ? SLOW + (K.t1 - K.t) : 1));   // eases into slow motion for the final moment
  else if ((K.hold -= dt) <= 0) { endKillCam(G, K); return false; }
  let k = 0; while (k < F.length - 2 && F[k + 1].t < K.t) k++;
  const a = F[k], b = F[k + 1] || a, u = b.t > a.t ? Math.min(1, (K.t - a.t) / (b.t - a.t)) : 0;
  const pdt = K.t < K.t1 ? dt : dt * 0.6;
  for (const [i, g] of K.ghosts) {
    const s = a.h[i], e = b.h[i]; if (!s || !e) { g.mesh.visible = false; continue; }
    const alive = !!e[7];
    if (alive && !g.alive) { g.alive = true; g.deathT = 0; g.spawnA = 1; g.mesh.rotation.set(0, 0, 0); }
    if (!alive && g.alive) { g.alive = false; g.deathT = 0; }
    g.pos.set(s[0] + (e[0] - s[0]) * u, s[1] + (e[1] - s[1]) * u, s[2] + (e[2] - s[2]) * u);
    g.yaw = s[3] + Math.atan2(Math.sin(e[3] - s[3]), Math.cos(e[3] - s[3])) * u; g.pitch = s[4] + (e[4] - s[4]) * u;
    g.onGround = !!e[6];
    const st = e[8], on = bit => (st & bit ? 0.12 : 0);
    g.stunT = on(1); g.rootT = on(2); g.slowT = on(4); g.hasteT = on(8); g.markT = on(16); g.invisT = on(32); g.barrierT = on(64);
    g.hp = e[9];
    if (g.alive) g.anim(pdt, g.onGround ? s[5] + (e[5] - s[5]) * u : 0, K.t);
    poseHero(G, g, pdt, camera, G.playerTeam);
    g.mesh.position.set(g.pos.x, g.mesh.position.y, g.pos.z);
    if (g.alive && g.invisT <= 0) g.mesh.visible = true;
  }
  // the killer's own model would block the view: their eyes are the camera
  const killer = K.ghosts.get(K.iK); killer.mesh.visible = false; if (killer.shimmer) killer.shimmer.visible = false;
  while (K.ev < K.events.length && K.events[K.ev].t <= K.t) replayEvent(G, K, K.events[K.ev++]);
  eyeOf(killer, camera.position);
  camera.rotation.set(killer.pitch, killer.yaw, 0, 'YXZ');
  return true;
}

function replayEvent(G, K, e) {
  const g = K.ghosts.get(e.i); if (!g) return;
  if (e.k === 'shot') {
    g.recoilA = 1;
    const from = eyeOf(g).addScaledVector(dirFrom(g.yaw, 0), 0.5); from.y -= e.i === K.iK ? 0.25 : 0.35;
    if (e.i === K.iK) from.addScaledVector(tmp.set(Math.cos(g.yaw), 0, -Math.sin(g.yaw)), 0.25);   // from their gun hand, not their nose
    const to = from.clone().addScaledVector(dirFrom(g.yaw, g.pitch), 30);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([from, to]), new THREE.LineBasicMaterial({ color: g.def.color, transparent: true }));
    G.scene.add(line); G.fx.push({ obj: line, life: 0.12, max: 0.12, kind: 'fade' });
  } else if (e.k === 'q' || e.k === 'ability' || e.k === 'ult') {
    g.castA = e.k === 'ult' ? 1.6 : 1; g.castSlot = e.k;
    sparks(G, g.pos.clone().setY(g.pos.y + 1.1), g.def.color, e.k === 'ult' ? 22 : 10, e.k === 'ult' ? 8 : 5);
  } else if (e.k === 'kill') {
    const v = K.ghosts.get(e.v); if (v) sparks(G, v.pos.clone().setY(v.pos.y + 1.1), 0xff5a5a, 16, 7);
  }
}

export function endKillCam(G, K) {
  if (!K) return;
  K.done = true;
  for (const g of K.ghosts.values()) { g.mesh.visible = false; if (g.shimmer) g.shimmer.visible = false; }
}

// While the replay is on screen, hide everything from the live match that moves, then put it back.
export function killCamRender(G, render) {
  const live = [...G.heroes.map(h => h.mesh), ...G.heroes.map(h => h.shimmer).filter(Boolean), ...G.minions.map(m => m.mesh), ...G.projectiles.map(p => p.mesh)].filter(Boolean);
  const was = live.map(o => o.visible);
  live.forEach(o => { o.visible = false; });
  try { render(); } finally { live.forEach((o, i) => { o.visible = was[i]; }); }
}
