import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { damage, burst, ring, chestOf } from './units.js?v=20261127j';

// Hot Potato: a lit bomb rides on one hero's head. Whoever holds it runs faster and passes it
// by landing any hit on an enemy hero. When the fuse burns out it blows up the holder (and
// anyone standing too close) and the other team scores. Each round's fuse is a little shorter.
// Knock out the holder and the bomb just jumps to one of their teammates.

export const POTATO = { toWin: 5, fuse: 16, minFuse: 8, shrink: 1.5, between: 3, passCd: 0.8, speed: 1.2, blast: 5, splash: 70 };

const BOMB_GEO = new THREE.SphereGeometry(0.42, 18, 14), CAP_GEO = new THREE.CylinderGeometry(0.12, 0.14, 0.16, 10);
const SPARK_GEO = new THREE.SphereGeometry(0.1, 8, 6);

export function initPotato(G) {
  const root = new THREE.Group();
  const shell = new THREE.Mesh(BOMB_GEO, new THREE.MeshStandardMaterial({ color: 0x2a2a34, roughness: 0.35, metalness: 0.3, emissive: 0xff3a1a, emissiveIntensity: 0 }));
  const cap = new THREE.Mesh(CAP_GEO, new THREE.MeshStandardMaterial({ color: 0x8a8a96, metalness: 0.6, roughness: 0.3 })); cap.position.y = 0.44;
  const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 6), new THREE.MeshStandardMaterial({ color: 0xc8a070 })); wick.position.y = 0.64; wick.rotation.z = 0.4;
  const spark = new THREE.Mesh(SPARK_GEO, new THREE.MeshBasicMaterial({ color: 0xffd23c })); spark.position.set(0.12, 0.8, 0);
  root.add(shell, cap, wick, spark); root.visible = false;
  root.traverse(o => { if (o.isMesh) o.castShadow = true; });
  G.scene.add(root);
  G.potato = { holder: null, fuse: POTATO.fuse, maxFuse: POTATO.fuse, round: 1, pts: { blue: 0, red: 0 }, passT: 0, wait: POTATO.between, lastFrom: null,
    mesh: { root, shell, spark } };
}

export const holdsPotato = (G, h) => G.potato?.holder === h;

function give(G, h, from) {
  const T = G.potato;
  T.holder = h; T.passT = POTATO.passCd; T.lastFrom = from || null;
  ring(G, h.pos, 0xff5a2a, 2); burst(G, chestOf(h).setY(h.pos.y + 2.4), 0xffd23c, 0.9);
  G.ev.potato?.(from ? 'pass' : 'start', T, h, from);
}

// Called for every hit: the holder passes the bomb by landing one on an enemy hero.
export function potatoHit(G, src, target) {
  const T = G.potato;
  if (!T || G.over || T.holder !== src || T.passT > 0 || !target || target.kind !== 'hero' || !target.alive || target.team === src.team) return;
  give(G, target, src);
}

export function updatePotato(G, dt) {
  const T = G.potato; if (!T) return;
  visuals(G, dt);
  if (G.over) return;
  if (T.wait > 0) {                                        // between rounds: count down, then light a new one
    T.wait -= dt;
    if (T.wait <= 0) {
      const alive = G.heroes.filter(h => h.alive);
      if (!alive.length) { T.wait = 0.5; return; }
      T.fuse = T.maxFuse = Math.max(POTATO.minFuse, POTATO.fuse - (T.round - 1) * POTATO.shrink);
      give(G, alive[Math.floor(Math.random() * alive.length)], null);
    }
    return;
  }
  const h = T.holder;
  if (!h || !h.alive) {                                     // holder went down: it hops to their nearest teammate
    const next = h && G.heroes.filter(u => u.alive && u.team === h.team).sort((a, b) => a.pos.distanceTo(h.pos) - b.pos.distanceTo(h.pos))[0];
    if (next) { give(G, next, null); G.ev.potato?.('hop', T, next); }
    return;                                                  // whole team down: it waits for the first one back
  }
  if (T.passT > 0) T.passT -= dt;
  // the holder gets a burst of speed so they can chase someone down
  if (h.hasteT <= 0.15) { h.hasteSpeed = POTATO.speed; h.hasteFire = 1; }
  h.hasteT = Math.max(h.hasteT, 0.15);
  T.fuse -= dt;
  if (T.fuse <= 0) explode(G, T, h);
}

function explode(G, T, h) {
  const at = chestOf(h);
  burst(G, at, 0xff5a2a, POTATO.blast * 0.9); burst(G, at, 0xffd23c, POTATO.blast * 0.6); burst(G, at, 0x2a2a34, POTATO.blast * 0.4);
  ring(G, h.pos, 0xff5a2a, POTATO.blast); ring(G, h.pos, 0xffd23c, POTATO.blast * 0.6);
  for (const u of G.heroes) {
    if (!u.alive || u === h) continue;
    const d = u.pos.distanceTo(h.pos);
    if (d < POTATO.blast) damage(G, u, POTATO.splash * (1 - 0.5 * d / POTATO.blast), T.lastFrom || null);
  }
  const scorer = h.team === 'blue' ? 'red' : 'blue';
  damage(G, h, h.hp + (h.armor || 0) + 999, T.lastFrom && T.lastFrom.team !== h.team ? T.lastFrom : null, false, true);
  T.pts[scorer]++; T.round++; T.holder = null; T.wait = POTATO.between;
  G.ev.shake?.(h, 1);
  G.ev.potato?.(T.pts[scorer] >= POTATO.toWin ? 'win' : 'boom', T, h, null, scorer);
}

function visuals(G, dt) {
  const T = G.potato, m = T.mesh, h = T.holder;
  m.root.visible = !!(h && h.alive && !G.over);
  if (!m.root.visible) return;
  const left = Math.max(0, T.fuse) / T.maxFuse, panic = 1 - left;
  m.root.position.set(h.pos.x, h.pos.y + 2.75 + Math.sin(G.time * 6) * 0.08, h.pos.z);
  const beat = Math.sin(G.time * (6 + panic * 26)) * 0.5 + 0.5;    // throbs faster as the fuse burns down
  m.root.scale.setScalar(1 + beat * 0.12 * (0.4 + panic));
  m.shell.material.emissiveIntensity = beat * panic * 1.4;
  m.spark.position.y = 0.8 - panic * 0.18;
  m.spark.scale.setScalar(0.7 + Math.random() * 0.8);
  m.root.rotation.y += dt * 2;
  if (Math.random() < dt * 14) burst(G, m.spark.getWorldPosition(new THREE.Vector3()), 0xffd23c, 0.18);
}

// Bots: with the bomb, chase the nearest enemy; without it, keep away from an enemy holder.
export function potatoGoal(G, b, goal) {
  const T = G.potato, h = T?.holder;
  if (!h || !h.alive) return null;
  if (h === b) {
    const prey = G.heroes.filter(u => u.alive && u.team !== b.team).sort((x, y) => x.pos.distanceTo(b.pos) - y.pos.distanceTo(b.pos))[0];
    if (!prey) return null;
    goal.set(prey.pos.x, 0, prey.pos.z);
    return { chase: prey, sprint: true };
  }
  const d = h.pos.distanceTo(b.pos);
  if (h.team !== b.team && d < 14) {
    const ax = b.pos.x - h.pos.x, az = b.pos.z - h.pos.z, l = Math.hypot(ax, az) || 1;
    goal.set(b.pos.x + ax / l * 10, 0, b.pos.z + az / l * 10);
    return { flee: true, sprint: true };
  }
  if (h.team === b.team && T.fuse < 4 && d < POTATO.blast + 2) {   // don't be standing next to your own holder when it goes
    const ax = b.pos.x - h.pos.x, az = b.pos.z - h.pos.z, l = Math.hypot(ax, az) || 1;
    goal.set(b.pos.x + ax / l * 8, 0, b.pos.z + az / l * 8);
    return { flee: true, sprint: true };
  }
  return null;
}
