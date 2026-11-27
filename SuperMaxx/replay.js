import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { poseHero } from './anim.js?v=20261129f';
import { castFx, sparks } from './vfx.js?v=20261129f';
import { dirFrom, eyeOf } from './units.js?v=20261129f';

// Play of the game. Every hero's position, aim and status is recorded 20 times a second into
// a rolling 12-second buffer. Each elimination is scored (multi-kills, ultimates, towers);
// when a hero beats the best score so far, the clip around it is kept. After a team match
// the best clip plays back with the camera over that hero's shoulder.

const HZ = 20, KEEP = 12, PRE = 3.5, POST = 2, MAX_LEN = 10;
const MULTI = ['', 'Elimination', 'Double kill', 'Triple kill', 'Quad kill', 'Maxxacre'];

export function initReplay(G) {
  G.rec = { frames: [], events: [], acc: 0, kills: new Map(), ults: new Map(), best: null, pending: null };
}

const flags = h => (h.stunT > 0 ? 1 : 0) | (h.rootT > 0 ? 2 : 0) | (h.slowT > 0 || h.zoneSlow < 1 ? 4 : 0) | (h.hasteT > 0 ? 8 : 0)
  | (h.markT > 0 ? 16 : 0) | (h.invisT > 0 ? 32 : 0) | (h.barrierT > 0 || h.zoneMult < 1 ? 64 : 0);

export function recFrame(G, dt) {
  const R = G.rec; if (!R) return;
  if ((R.acc += dt) >= 1 / HZ) {
    R.acc = 0;
    R.frames.push({ t: G.time, h: G.heroes.map(h => [h.pos.x, h.pos.y, h.pos.z, h.yaw, h.pitch || 0, Math.hypot(h.vel.x, h.vel.z), h.onGround ? 1 : 0,
      h.alive && !h.gone ? 1 : 0, flags(h), h.hp / h.maxHp]) });
    while (R.frames.length && G.time - R.frames[0].t > KEEP) R.frames.shift();
    while (R.events.length && G.time - R.events[0].t > KEEP) R.events.shift();
  }
  if (R.pending && G.time >= R.pending.at) capture(G);
}

// Shots, casts and knockouts, so the replay can redraw tracers, ability effects and the feed.
export function recEvent(G, k, h, extra = {}) {
  const R = G.rec; if (!R || G.over) return;
  const i = G.heroes.indexOf(h); if (i < 0) return;
  R.events.push({ t: G.time, k, i, ...extra });
  if (k === 'ult') R.ults.set(h, G.time);
}

export function recKill(G, t, src) {
  const R = G.rec; if (!R || G.over || !src || src.kind !== 'hero') return;
  if (t.kind === 'hero' && t !== src) recEvent(G, 'kill', src, { v: G.heroes.indexOf(t) });
  // score the moment for whoever made the play
  const w = t.kind === 'hero' && t !== src ? 100 : t.kind === 'core' ? 160 : t.kind === 'tower' ? 90 : 0;
  if (!w) return;                                                     // minions don't make the highlight reel
  const list = (R.kills.get(src) || []).filter(e => G.time - e.t < 8);
  list.push({ t: G.time, w, hero: t.kind === 'hero' });
  R.kills.set(src, list);
  const heroes = list.filter(e => e.hero).length;
  let score = list.reduce((a, e) => a + e.w, 0) + Math.max(0, heroes - 1) * 70;
  if (G.time - (R.ults.get(src) ?? -99) < 8) score += 40;
  if (src.hp / src.maxHp < 0.25) score += 30;                         // clutch: made it on a sliver of health
  if (R.best && score <= R.best.score && !(R.pending && R.pending.src === src)) return;
  if (R.pending && R.pending.src !== src && score <= R.pending.score) return;
  if (R.pending && R.pending.src !== src) capture(G);                // keep the earlier play in case this one falls short
  const tower = list.some(e => !e.hero && e.w);
  R.pending = { src, score, at: G.time + POST, from: list[0].t - PRE, heroes,
    label: heroes >= 2 ? MULTI[Math.min(5, heroes)] : tower && !heroes ? 'Objective takedown' : heroes ? (score > 150 ? 'Clutch elimination' : 'Elimination') : 'Objective takedown' };
}

function capture(G) {
  const R = G.rec, p = R.pending; R.pending = null;
  const end = Math.min(G.time, p.at), start = Math.max(p.from, end - MAX_LEN);
  const frames = R.frames.filter(f => f.t >= start && f.t <= end);
  if (frames.length < HZ || (R.best && p.score <= R.best.score)) return;
  R.best = { score: p.score, i: G.heroes.indexOf(p.src), label: p.label, heroes: p.heroes, frames, events: R.events.filter(e => e.t >= start && e.t <= end), t0: frames[0].t, t1: frames[frames.length - 1].t };
}

// Called when the match ends: lock in anything still waiting for its last two seconds.
export function finalClip(G) {
  const R = G.rec; if (!R || R.potg === false) return null;
  if (R.pending) capture(G);
  return R.best;
}

// ---------- playback ----------
const camPos = new THREE.Vector3(), camAim = new THREE.Vector3(), tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
const lerpAng = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;

export function startPlayback(G, clip, hooks) {
  G.replay = { clip, t: clip.t0, ev: 0, hooks, done: false, cam: 0 };
  // freeze-frame leftovers from the live match would float around in the replay
  for (const m of G.minions) m.mesh.visible = false;
  for (const p of G.projectiles) p.mesh.visible = false;
  for (const z of G.zones) if (z.g) z.g.visible = false;
  for (const x of G.holes || []) x.g.visible = false;
  G.heroes.forEach((h, i) => {
    const s = clip.frames[0].h[i]; if (!s) { h.mesh.visible = false; return; }
    h.alive = !!s[7]; h.deathT = h.alive ? 0 : 3; h.spawnA = 0; h.castA = 0; h.recoilA = 0;
    h.mesh.rotation.set(0, 0, 0); h.mesh.visible = h.alive;
  });
  const f0 = clip.frames[0].h[clip.i];
  camPos.set(f0[0], f0[1] + 6, f0[2]).addScaledVector(dirFrom(f0[3], 0), -8);
}

export function tickPlayback(G, dt, camera) {
  const R = G.replay; if (!R || R.done) return false;
  const c = R.clip, F = c.frames;
  R.t = Math.min(c.t1, R.t + dt);
  let k = 0; while (k < F.length - 2 && F[k + 1].t < R.t) k++;
  const a = F[k], b = F[k + 1] || a, u = b.t > a.t ? Math.min(1, (R.t - a.t) / (b.t - a.t)) : 0;
  G.heroes.forEach((h, i) => {
    const s = a.h[i], e = b.h[i]; if (!s || !e) return;
    const alive = !!e[7];
    if (alive && !h.alive) { h.alive = true; h.deathT = 0; h.spawnA = 1; h.mesh.rotation.set(0, 0, 0); }
    if (!alive && h.alive) { h.alive = false; h.deathT = 0; }
    h.pos.set(s[0] + (e[0] - s[0]) * u, s[1] + (e[1] - s[1]) * u, s[2] + (e[2] - s[2]) * u);
    h.yaw = lerpAng(s[3], e[3], u); h.pitch = s[4] + (e[4] - s[4]) * u;
    h.onGround = !!e[6];
    const st = e[8], on = bit => (st & bit ? 0.12 : 0);
    h.stunT = on(1); h.rootT = on(2); h.slowT = on(4); h.hasteT = on(8); h.markT = on(16); h.invisT = on(32); h.barrierT = on(64);
    h.zoneSlow = 1; h.zoneMult = 1; h.dashT = 0; h.lurkT = 0;
    h.hp = e[9] * h.maxHp;
    if (h.alive) h.anim(dt, h.onGround ? s[5] + (e[5] - s[5]) * u : 0, R.t);
    if (h.alive || h.deathT < 1.5) poseHero(G, h, dt, camera, G.playerTeam);
  });
  // replay the recorded moments as their time comes up
  while (R.ev < c.events.length && c.events[R.ev].t <= R.t) fire(G, c.events[R.ev++], R.hooks);
  // camera: starts wide, eases in behind the star of the play
  const star = G.heroes[c.i];
  R.cam = Math.min(1, R.cam + dt * 0.7);
  const d = 8 - R.cam * 4.6, up = 6 - R.cam * 3.6;
  const f = dirFrom(star.yaw, 0), side = tmpA.set(Math.cos(star.yaw), 0, -Math.sin(star.yaw));
  tmpB.copy(star.pos).addScaledVector(f, -d).addScaledVector(side, 0.9 * R.cam); tmpB.y = star.pos.y + up;
  camPos.lerp(tmpB, Math.min(1, dt * 5));
  camera.position.copy(camPos);
  camAim.copy(eyeOf(star)).addScaledVector(dirFrom(star.yaw, star.pitch * 0.6), 14);
  camera.lookAt(camAim);
  R.hooks.progress?.((R.t - c.t0) / Math.max(0.1, c.t1 - c.t0));
  if (R.t >= c.t1) { R.done = true; return false; }
  return true;
}

function fire(G, e, hooks) {
  const h = G.heroes[e.i]; if (!h) return;
  if (e.k === 'shot') {
    h.recoilA = 1;
    const from = eyeOf(h).addScaledVector(dirFrom(h.yaw, 0), 0.5); from.y -= 0.35;
    const to = from.clone().addScaledVector(dirFrom(h.yaw, h.pitch), 26);
    const col = h.def.color;
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([from, to]), new THREE.LineBasicMaterial({ color: col, transparent: true }));
    G.scene.add(line); G.fx.push({ obj: line, life: 0.12, max: 0.12, kind: 'fade' });
    hooks.shot?.(h);
  } else if (e.k === 'q' || e.k === 'ability' || e.k === 'ult') {
    h.castA = e.k === 'ult' ? 1.6 : 1; h.castSlot = e.k;
    castFx(G, h, e.k); hooks.ability?.(h, e.k);
  } else if (e.k === 'kill') {
    const v = G.heroes[e.v]; if (!v) return;
    const p = v.pos.clone().setY(v.pos.y + 1.1);
    sparks(G, p, 0xff5a5a, 14, 7);
    hooks.kill?.(h, v);
  }
}

export function stopPlayback(G) { if (G) G.replay = null; }
