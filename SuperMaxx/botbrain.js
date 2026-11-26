import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { TUNING } from './data.js?v=20261126r';
import { hasLOS } from './world.js?v=20261126r';
import { fire, releaseFire, chargeLevel, startReload, eyeOf, chestOf, dirFrom, coreVulnerable } from './units.js?v=20261126r';
import { ABIL, castSlot, canAct, canMove, moveMult, isHidden } from './abilities.js?v=20261126r';
import { survivorGoal, inStorm } from './survivor.js?v=20261126r';
import { hillGoal } from './hill.js?v=20261126r';
import { cartGoal } from './payload.js?v=20261126r';

const v1 = new THREE.Vector3(), v2 = new THREE.Vector3();

// Shared horizontal movement for player and bots.
export function steer(h, wish, sprint, jump, dt) {
  if (h.knockT > 0 || h.dashT > 0) return;          // knockback, charges and slams own the velocity
  if (!canMove(h)) { wish = new THREE.Vector3(); jump = false; }
  const speed = h.def.speed * (sprint ? 1.38 : 1) * moveMult(h);
  const accel = h.onGround ? 14 : 3.5;
  const k = Math.min(1, accel * dt);
  h.vel.x += (wish.x * speed - h.vel.x) * k;
  h.vel.z += (wish.z * speed - h.vel.z) * k;
  if (jump && h.onGround) { h.vel.y = TUNING.jump; h.onGround = false; }
}

export function initBot(G, b, laneIdx) {
  b.ai = { lane: laneIdx, wp: 0, tgt: null, scanT: 0, seenT: 0, retreat: false, strafe: 1, strafeT: 0,
    stuckT: 0, lastPos: b.pos.clone(), detourT: 0, detour: new THREE.Vector3(), err: new THREE.Vector3(), errT: 0 };
}

const coreZ = (G, team) => (team === 'blue' ? -1 : 1) * (G.map.L - 11);
// Spawn sits behind the core, so every route starts with a step to the side of it.
function exitPoint(G, b) {
  const lane = G.map.lanes[b.ai.lane % G.map.lanes.length];
  const side = Math.sign(lane[1][0]) || (b.ai.lane % 2 ? -1 : 1) * (b.team === 'blue' ? 1 : -1);
  return [side * 6, coreZ(G, b.team)];
}
function lanePath(G, b) {
  const lane = G.map.lanes[b.ai.lane % G.map.lanes.length];
  const p = b.team === 'blue' ? lane : [...lane].reverse();
  return [exitPoint(G, b), ...p.slice(1)];
}

function towerCovered(G, tower) {
  return G.minions.some(m => m.alive && m.team !== tower.team && m.pos.distanceTo(tower.pos) < TUNING.towerRange - 2);
}

// keep a goal point out of uncovered enemy tower range
function avoidTowers(G, b, goal) {
  for (const s of G.structures) {
    if (s.kind !== 'tower' || !s.alive || s.team === b.team || towerCovered(G, s)) continue;
    const dx = goal.x - s.pos.x, dz = goal.z - s.pos.z, d = Math.hypot(dx, dz);
    const safe = TUNING.towerRange + 1.5;
    if (d < safe) { goal.x = s.pos.x + (dx / (d || 1)) * safe; goal.z = s.pos.z + (dz / (d || 1)) * safe; }
  }
}

function pickTarget(G, b) {
  const eye = eyeOf(b, v1);
  let best = null, score = Infinity;
  for (const h of G.heroes) {
    if (!h.alive || h.team === b.team) continue;
    const d = h.pos.distanceTo(b.pos);
    if (isHidden(h) && d > 3) continue;
    if (d > (G.mode === 'survivor' ? 55 : 42) || !hasLOS(eye, chestOf(h, v2), G.colliders)) continue;
    const s = d * (0.6 + 0.4 * h.hp / h.maxHp) * (h.markT > 0 ? 0.6 : 1);
    if (s < score) { score = s; best = h; }
  }
  // decoys look exactly like heroes to a bot
  for (const m of G.minions) {
    if (!m.alive || !m.decoy || m.team === b.team) continue;
    const d = m.pos.distanceTo(b.pos);
    if (d < 42 && d * 0.6 < score && hasLOS(eye, chestOf(m, v2), G.colliders)) { score = d * 0.6; best = m; }
  }
  if (best || b.ai.retreat) return best;
  for (const m of G.minions) {
    if (!m.alive || m.team === b.team) continue;
    const d = m.pos.distanceTo(b.pos);
    if (d < 24 && d < score && hasLOS(eye, chestOf(m, v2), G.colliders)) { score = d; best = m; }
  }
  if (best) return best;
  for (const s of G.structures) {
    if (!s.alive || s.team === b.team) continue;
    if (s.kind === 'core' && !coreVulnerable(G, s.team)) continue;
    if (s.kind === 'tower' && !towerCovered(G, s) && s.hp > s.maxHp * 0.25) continue;
    const d = s.pos.distanceTo(b.pos);
    if (d < 30 && d < score) { score = d; best = s; }
  }
  return best;
}

export function updateBot(G, b, dt, D) {
  const ai = b.ai, def = b.def;
  if (b.hp < b.maxHp * 0.3 && G.mode === 'lane') ai.retreat = true;
  if (ai.retreat && b.hp > b.maxHp * 0.92) { ai.retreat = false; ai.wp = 0; }

  ai.scanT -= dt;
  if (ai.scanT <= 0 || (ai.tgt && !ai.tgt.alive)) {
    ai.scanT = 0.25;
    const t = pickTarget(G, b);
    if (t !== ai.tgt) { ai.seenT = t && t.kind === 'hero' ? D.react : 0.1; }
    ai.tgt = t;
  }
  const tgt = ai.tgt;

  // ---- where to go ----
  const goal = v2;
  let sprint = false;
  const homeZ = (b.team === 'blue' ? -1 : 1) * (G.map.L - 5);
  if (G.mode === 'survivor') {
    // no base to run to: the storm and loot decide; fights only when the zone is safe
    const urgent = survivorGoal(G, b, goal);
    const stormy = urgent && inStorm(G, b.pos);
    if (tgt && !stormy) {
      const lowHp = b.hp < b.maxHp * 0.3;
      const pref = lowHp ? def.prefRange * 2.2 : def.prefRange;
      const dx = b.pos.x - tgt.pos.x, dz = b.pos.z - tgt.pos.z, d = Math.hypot(dx, dz) || 1;
      if (!urgent || d < pref * 1.5) goal.set(tgt.pos.x + (dx / d) * pref, 0, tgt.pos.z + (dz / d) * pref);
    }
    sprint = urgent || !tgt;
  }
  else if (ai.retreat) {
    const cz = coreZ(G, b.team), inFront = Math.abs(b.pos.z) < Math.abs(cz) - 1;
    if (inFront) { const [ex, ez] = exitPoint(G, b); goal.set(ex, 0, ez); } else goal.set(0, 0, homeZ);
    sprint = true;
  }
  else if (G.mode === 'cart') {
    // the cart is the objective: hold it, fight around it, only chase what is close
    const fromCart = cartGoal(G, b, goal);
    if (tgt) {
      const pref = def.prefRange;
      const dx = b.pos.x - tgt.pos.x, dz = b.pos.z - tgt.pos.z, d = Math.hypot(dx, dz) || 1;
      const fx = tgt.pos.x + (dx / d) * pref, fz = tgt.pos.z + (dz / d) * pref;
      const k = fromCart < 8 ? 0.35 : d < pref * 1.6 ? 1 : 0;
      goal.set(goal.x + (fx - goal.x) * k, 0, goal.z + (fz - goal.z) * k);
    }
    sprint = !tgt && fromCart > 9;
  }
  else if (G.mode === 'hill') {
    // the ring is home: fight whoever is near it, chase only what's close, then get back on
    const fromHill = hillGoal(G, b, goal);
    if (tgt) {
      const pref = def.prefRange;
      const dx = b.pos.x - tgt.pos.x, dz = b.pos.z - tgt.pos.z, d = Math.hypot(dx, dz) || 1;
      const fx = tgt.pos.x + (dx / d) * pref, fz = tgt.pos.z + (dz / d) * pref;
      const k = fromHill < G.hill.r + 3 ? 0.35 : d < pref * 1.6 ? 1 : 0;
      goal.set(goal.x + (fx - goal.x) * k, 0, goal.z + (fz - goal.z) * k);
    }
    sprint = !tgt && fromHill > G.hill.r + 4;
  }
  else if (tgt) {
    const pref = tgt.kind === 'hero' ? def.prefRange : Math.max(6, def.prefRange * 0.8) + (tgt.rad || 0);
    const dx = b.pos.x - tgt.pos.x, dz = b.pos.z - tgt.pos.z, d = Math.hypot(dx, dz) || 1;
    goal.set(tgt.pos.x + (dx / d) * pref, 0, tgt.pos.z + (dz / d) * pref);
  } else {
    const path = lanePath(G, b);
    // skip waypoints we've already passed while fighting
    while (ai.wp < path.length - 1) {
      const [ax, az] = path[ai.wp], [nx, nz] = path[ai.wp + 1];
      if (Math.hypot(nx - b.pos.x, nz - b.pos.z) < Math.hypot(nx - ax, nz - az) - 1 && ai.wp > 0) ai.wp++; else break;
    }
    const w = path[Math.min(ai.wp, path.length - 1)];
    goal.set(w[0], 0, w[1]);
    if (Math.hypot(w[0] - b.pos.x, w[1] - b.pos.z) < 3 && ai.wp < path.length - 1) ai.wp++;
    sprint = Math.hypot(w[0] - b.pos.x, w[1] - b.pos.z) > 12;
  }
  if (!ai.retreat) avoidTowers(G, b, goal);

  const wish = new THREE.Vector3(goal.x - b.pos.x, 0, goal.z - b.pos.z);
  const gd = wish.length();
  if (gd < 0.8) wish.set(0, 0, 0); else wish.divideScalar(gd);
  if (tgt && !ai.retreat) {
    ai.strafeT -= dt;
    if (ai.strafeT <= 0) { ai.strafe = Math.random() < 0.5 ? -1 : 1; ai.strafeT = 0.6 + Math.random() * 1.2; }
    const side = new THREE.Vector3(-(tgt.pos.z - b.pos.z), 0, tgt.pos.x - b.pos.x).normalize().multiplyScalar(ai.strafe * 0.8);
    wish.add(side);
    if (wish.lengthSq() > 1) wish.normalize();
  }

  // ---- unstick ----
  let jump = false;
  ai.stuckT += dt;
  if (ai.stuckT > 0.5) {
    const moved = Math.hypot(b.pos.x - ai.lastPos.x, b.pos.z - ai.lastPos.z);
    if (wish.lengthSq() > 0.2 && moved < 0.6) {
      jump = true;
      ai.detour.set(-wish.z, 0, wish.x).multiplyScalar(Math.random() < 0.5 ? 1 : -1);
      ai.detourT = 0.7;
    }
    ai.lastPos.copy(b.pos); ai.stuckT = 0;
  }
  if (ai.detourT > 0) { ai.detourT -= dt; wish.add(ai.detour).normalize(); }
  if (tgt && tgt.kind === 'hero' && Math.random() < dt * 0.4) jump = true;
  steer(b, wish, sprint && !tgt, jump, dt);

  // ---- aim & shoot ----
  // healers and chargers aim at a teammate who needs it when no enemy hero is pressing
  let aimAt = tgt;
  if (def.weapon.mode === 'mend') {
    const need = u => def.weapon.heal ? 1 - u.hp / u.maxHp : u.ult < 100 ? 0.35 : 0;
    let pal = null, pn = 0.12;
    for (const u of G.heroes) {
      if (!u.alive || u === b || u.team !== b.team || u.pos.distanceTo(b.pos) > def.weapon.range * 0.8) continue;
      const n = need(u);
      if (n > pn && hasLOS(eyeOf(b), chestOf(u, v1), G.colliders)) { pn = n; pal = u; }
    }
    if (pal && (!tgt || tgt.kind !== 'hero' || pn > 0.4)) aimAt = pal;
  }
  let wantYaw = b.yaw, wantPitch = 0;
  const eye = eyeOf(b);
  if (aimAt) {
    ai.errT -= dt;
    const dist = aimAt.pos.distanceTo(b.pos);
    if (ai.errT <= 0) {
      ai.errT = 0.35;
      ai.err.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(D.aimErr * dist * 2);
    }
    const aim = chestOf(aimAt);
    if (def.weapon.type === 'rocket' && aimAt.vel) aim.addScaledVector(aimAt.vel, dist / def.weapon.speed);
    if (def.weapon.type === 'rocket') aim.y -= 0.6;
    aim.add(ai.err);
    const d = aim.sub(eye);
    wantYaw = Math.atan2(-d.x, -d.z);
    wantPitch = Math.atan2(d.y, Math.hypot(d.x, d.z));
  } else if (wish.lengthSq() > 0.1) {
    wantYaw = Math.atan2(-wish.x, -wish.z);
  }
  let dy = wantYaw - b.yaw;
  dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  const turn = D.turn * dt;
  b.yaw += Math.max(-turn, Math.min(turn, dy));
  b.pitch += Math.max(-turn, Math.min(turn, wantPitch - b.pitch));

  ai.seenT -= dt;
  if (aimAt && (aimAt !== tgt || ai.seenT <= 0) && Math.abs(dy) < D.fireCone && Math.abs(wantPitch - b.pitch) < D.fireCone) {
    const dist = aimAt.pos.distanceTo(b.pos);
    if (dist < def.weapon.range * 0.9) {
      const muzzle = b.gun.getWorldPosition(new THREE.Vector3());
      fire(G, b, dirFrom(b.yaw, b.pitch), muzzle);
      // railgun: hold until (nearly) fully charged; weaker bots let go early
      if (def.weapon.mode === 'charge' && chargeLevel(G, b) >= (ai.chargeGoal ??= 0.6 + Math.random() * 0.4)) { releaseFire(G, b, dirFrom(b.yaw, b.pitch), muzzle); ai.chargeGoal = null; }
    }
  }
  if (!tgt && b.chargeStart != null) b.chargeStart = null;
  if (!tgt && b.ammo < def.weapon.mag * 0.4) startReload(b);

  // ---- abilities ----
  // bots wait a beat after spotting someone, and only one ability per half second
  ai.castT = (ai.castT || 0) - dt;
  if (ai.castT > 0 || !canAct(b)) return;
  const heroT = tgt && (tgt.kind === 'hero' || tgt.decoy) ? tgt : null;
  const near = r => G.heroes.filter(h => h.alive && h.team !== b.team && h.pos.distanceTo(b.pos) < r).length
    + G.minions.filter(m => m.alive && m.team !== b.team && m.pos.distanceTo(b.pos) < r).length / 3;
  const c = {
    tgt, heroT, dist: tgt ? tgt.pos.distanceTo(b.pos) : Infinity, near,
    alliesNear: r => G.heroes.filter(h => h.alive && h !== b && h.team === b.team && h.pos.distanceTo(b.pos) < r).length,
  };
  const ctx = { wish, aim: dirFrom(b.yaw, b.pitch), target: tgt && tgt.kind !== 'hero' ? tgt : (heroT || null) };
  for (const slot of ['ult', 'q', 'ability']) {
    const a = def[slot];
    const ready = slot === 'ult' ? b.ult >= 100 : b.cd[slot] <= 0;
    if (!ready || ai.seenT > 0 && slot !== 'ability') continue;
    if (ABIL[a.id].ai(G, b, a, c) && castSlot(G, b, slot, ctx)) { ai.castT = 0.5; break; }
  }
}
