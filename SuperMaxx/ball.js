import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { burst, ring } from './units.js?v=20261128r';
import { makeBox, rayWorld } from './world.js?v=20261128r';

// Smash Ball: 3v3 football with guns. A giant ball sits in the middle of the map and each team
// defends a goal at its end. Shots shove the ball (harder-hitting shots shove it further), and
// running into it dribbles it. First to 3 goals, or the most goals after 2½ minutes; a draw goes
// to golden goal. After each goal the ball drops back in at the centre. Offline only.

export const BALL = {
  r: 1.7, toWin: 3, time: 150, reset: 2.5, idle: 18,
  grav: 15, bounce: 0.62, wall: 0.72, roll: 0.38, air: 0.06, maxV: 38,
  shot: 0.23, shotMin: 0.9, shotMax: 19, lift: 0.22,           // shot push: damage × shot, clamped; lift is the share that goes upward
  goalW: 13, goalH: 5.6, goalD: 3.6, back: 12,                   // goal mouth size, depth, and distance in from each end
};
const TEAM_HEX = { blue: 0x2f5bff, red: 0xff5a36 };
const V = new THREE.Vector3(), N = new THREE.Vector3(), AX = new THREE.Vector3();
const other = t => t === 'blue' ? 'red' : 'blue';
// blue defends the goal at -z and attacks +z
const side = t => t === 'blue' ? -1 : 1;

export function initBall(G) {
  const B = BALL, L = G.map.L;
  // the ball: a white sphere with coloured bands, so you can see it spin
  const root = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(B.r, 2), new THREE.MeshStandardMaterial({ color: 0xfffaf1, roughness: 0.45, flatShading: true, emissive: 0xffffff, emissiveIntensity: 0 }));
  root.add(shell);
  [[0xffc93c, 0], [0x9b5cff, Math.PI / 2], [0x3ccf9a, Math.PI / 4]].forEach(([c, a]) => {
    const band = new THREE.Mesh(new THREE.TorusGeometry(B.r * 1.002, 0.13, 6, 32), new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 }));
    band.rotation.set(a, a * 0.7, 0); root.add(band);
  });
  root.traverse(o => { if (o.isMesh) o.castShadow = true; });
  G.scene.add(root);
  // a shadow ring on the floor under the ball, so you can judge it in the air
  const marker = new THREE.Mesh(new THREE.RingGeometry(B.r * 0.7, B.r * 0.95, 28), new THREE.MeshBasicMaterial({ color: 0x1d2340, transparent: true, opacity: 0.35, depthWrite: false }));
  marker.rotation.x = -Math.PI / 2; G.scene.add(marker);

  // the goals: two posts, a crossbar, a net and solid sides, back and roof
  const goals = [];
  for (const team of ['blue', 'red']) {
    const s = side(team), z0 = s * (L - B.back), zb = z0 + s * B.goalD, hw = B.goalW / 2;
    const g = new THREE.Group(), col = TEAM_HEX[team];
    const post = new THREE.MeshStandardMaterial({ color: 0xfffaf1, roughness: 0.4, emissive: col, emissiveIntensity: 0.15 });
    const net = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false });
    const netLines = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.35 });
    const bar = (w, h, d, x, y, z, m = post) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
    bar(0.4, B.goalH, 0.4, -hw, B.goalH / 2, z0); bar(0.4, B.goalH, 0.4, hw, B.goalH / 2, z0);
    bar(B.goalW + 0.4, 0.4, 0.4, 0, B.goalH, z0);
    const zm = (z0 + zb) / 2;
    for (const m of [net, netLines]) {
      bar(B.goalW, B.goalH, 0.05, 0, B.goalH / 2, zb, m);                                // back
      bar(0.05, B.goalH, B.goalD, -hw, B.goalH / 2, zm, m); bar(0.05, B.goalH, B.goalD, hw, B.goalH / 2, zm, m);
      bar(B.goalW, 0.05, B.goalD, 0, B.goalH, zm, m);                                    // roof
    }
    // the goal line and a coloured box painted on the floor in front of it
    const line = new THREE.Mesh(new THREE.PlaneGeometry(B.goalW + 0.4, 0.3), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    line.rotation.x = -Math.PI / 2; line.position.set(0, 0.04, z0); g.add(line);
    const box = new THREE.Mesh(new THREE.RingGeometry(B.goalW * 0.9, B.goalW * 0.98, 40, 1, s > 0 ? Math.PI : 0, Math.PI), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.55, depthWrite: false }));
    box.rotation.x = -Math.PI / 2; box.position.set(0, 0.04, z0); g.add(box);
    G.scene.add(g);
    // solid parts: heroes and the ball bounce off these
    const lo = Math.min(z0, zb), hi = Math.max(z0, zb);
    G.colliders.push(
      makeBox(-hw - 0.2, (lo + hi) / 2, 0.4, hi - lo + 0.4, B.goalH), makeBox(hw + 0.2, (lo + hi) / 2, 0.4, hi - lo + 0.4, B.goalH),
      makeBox(0, zb + s * 0.2, B.goalW + 0.8, 0.4, B.goalH),
      makeBox(0, (lo + hi) / 2, B.goalW + 0.8, hi - lo + 0.4, 0.4, B.goalH),
    );
    goals.push({ team, s, z0, zb, group: g });
  }
  // centre spot
  const spot = new THREE.Mesh(new THREE.RingGeometry(5.6, 6, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false }));
  spot.rotation.x = -Math.PI / 2; spot.position.y = 0.04; G.scene.add(spot);

  G.ball = { root, shell, marker, goals, spot, pos: new THREE.Vector3(0, 9, 0), vel: new THREE.Vector3(), pts: { blue: 0, red: 0 },
    wait: 1.5, time: B.time, ot: false, over: false, last: null, prev: null, touchT: 0, flash: 0 };
  G.shotHook = ballShot;                                               // units.shoot calls this for every shot
  G.projHook = ballProj;                                               // and updateProjectiles for every rocket step
  for (const h of G.heroes) { h.goals = 0; h.touches = 0; }
}

// ---------- pushing the ball ----------
function kick(G, dir, power, by) {
  const T = G.ball; if (!T || T.wait > 0 || T.over) return;
  T.vel.addScaledVector(dir, power);
  T.vel.y += power * BALL.lift;
  const sp = T.vel.length(); if (sp > BALL.maxV) T.vel.multiplyScalar(BALL.maxV / sp);
  if (by?.kind === 'hero') {
    if (T.last !== by) { T.prev = T.last; T.last = by; }
    by.touches = (by.touches || 0) + 1;
  }
  T.touchT = G.time; T.flash = Math.min(1, T.flash + power / 12);
}
const shotPower = (w, charge) => {
  const per = w.mode === 'charge' ? (w.minDmg ?? w.dmg * 0.25) + (w.dmg - (w.minDmg ?? w.dmg * 0.25)) * (charge || 0) : w.dmg;
  return Math.max(BALL.shotMin, Math.min(BALL.shotMax, per * (w.pellets || w.quills || w.fan || 1) * BALL.shot));
};

// Hitscan, beams, cones and melee: does the shot pass through the ball before it hits a wall?
function ballShot(G, h, dir, charge) {
  const T = G.ball; if (!T || T.wait > 0 || T.over || !h.alive) return;
  const w = h.def.weapon; if (w.type === 'rocket') return;           // rockets push it when they reach it
  const o = V.set(h.pos.x, h.pos.y + 1.5, h.pos.z), range = w.range || 60;
  N.subVectors(T.pos, o);
  const t = N.dot(dir); if (t < 0 || t > range + BALL.r) return;
  const miss2 = N.lengthSq() - t * t, rr = (BALL.r + (w.type === 'cone' || w.type === 'melee' ? 1 : 0.25)) ** 2;
  if (miss2 > rr) return;
  if (rayWorld(o, dir, t, G.colliders) < t - BALL.r) return;           // a wall in the way
  kick(G, N.copy(dir).setY(Math.max(0, dir.y)).normalize(), shotPower(w, charge), h);
  if (Math.random() < 0.5) burst(G, T.pos.clone().addScaledVector(dir, -BALL.r), 0xffffff, 0.25);
}
// Rockets, arrows and lobs: a projectile that reaches the ball smacks it and is used up.
function ballProj(G, p, d, step) {
  const T = G.ball; if (!T || T.wait > 0 || T.over || !p.owner) return false;
  N.subVectors(T.pos, p.pos);
  const t = Math.max(0, Math.min(step, N.dot(d)));
  const r = BALL.r + (p.w.size || 0.15);
  if (N.addScaledVector(d, -t).lengthSq() > r * r) return false;
  const push = shotPower(p.w) * (p.w.splash > 0 ? 1.25 : 1);
  kick(G, AX.copy(d).setY(Math.max(0, d.y)).normalize(), push, p.owner);
  burst(G, p.pos.clone().addScaledVector(d, t), p.w.color || 0xffb070, p.w.splash > 0 ? 0.8 : 0.35);
  if (p.w.splash > 0) G.ev.boom?.(T.pos.clone(), p.w);
  return true;
}

// ---------- every frame ----------
export function updateBall(G, dt) {
  const T = G.ball; if (!T) return;
  const B = BALL, W = G.map.W, L = G.map.L;
  if (!T.over && !G.over) {
    T.time -= dt;
    if (T.time <= 0 && !T.ot) {
      if (T.pts.blue === T.pts.red) { T.ot = true; G.ev.ball?.('ot', T); }
      else return finish(G, T.pts.blue > T.pts.red ? 'blue' : 'red');
    }
  }
  // between goals: the ball hangs above the centre spot, then drops in
  if (T.wait > 0) {
    T.wait -= dt;
    T.pos.set(0, 9 + Math.sin(G.time * 3) * 0.3, 0); T.vel.set(0, 0, 0);
    T.root.rotation.y += dt * 1.5;
    if (T.wait <= 0) { T.vel.set(0, -2, 0); T.touchT = G.time; T.last = T.prev = null; G.ev.ball?.('kickoff', T); }
  } else {
    // gravity, drag and rolling friction
    T.vel.y -= B.grav * dt;
    T.vel.multiplyScalar(Math.exp(-B.air * dt));
    T.pos.addScaledVector(T.vel, dt);
    if (T.pos.y < B.r) {
      T.pos.y = B.r;
      if (T.vel.y < -1.5) { T.vel.y *= -B.bounce; if (T.vel.y > 3) G.ev.bump?.(T.pos.clone().setY(0.1), false); } else T.vel.y = 0;
      const f = Math.exp(-B.roll * dt); T.vel.x *= f; T.vel.z *= f;
    }
    // walls, props, goal frames
    for (const b of G.colliders) {
      if (b.alive === false || b.top < 0.3) continue;
      const cx = Math.max(b.minX, Math.min(T.pos.x, b.maxX)), cy = Math.max(b.bottom || 0, Math.min(T.pos.y, b.top)), cz = Math.max(b.minZ, Math.min(T.pos.z, b.maxZ));
      N.set(T.pos.x - cx, T.pos.y - cy, T.pos.z - cz);
      const d2 = N.lengthSq(); if (d2 >= B.r * B.r) continue;
      const d = Math.sqrt(d2);
      if (d < 1e-4) N.set(0, 1, 0); else N.divideScalar(d);
      T.pos.set(cx, cy, cz).addScaledVector(N, B.r + 0.001);
      const vn = T.vel.dot(N);
      if (vn < 0) { T.vel.addScaledVector(N, -vn * (1 + (N.y > 0.7 ? B.bounce : B.wall))); if (N.y > 0.7) { const f = Math.exp(-B.roll * dt); T.vel.x *= f; T.vel.z *= f; } }
    }
    // the edges of the map
    if (Math.abs(T.pos.x) > W - B.r) { T.pos.x = Math.sign(T.pos.x) * (W - B.r); T.vel.x *= -B.wall; }
    if (Math.abs(T.pos.z) > L - B.r) { T.pos.z = Math.sign(T.pos.z) * (L - B.r); T.vel.z *= -B.wall; }
    // heroes dribble it: run into the ball and it rolls ahead of you
    for (const h of G.heroes) {
      if (!h.alive || h.benched) continue;
      const dx = T.pos.x - h.pos.x, dz = T.pos.z - h.pos.z, dist = Math.hypot(dx, dz), reach = B.r + 0.6;
      if (dist >= reach || h.pos.y > T.pos.y + B.r * 0.8 || h.pos.y + 1.8 < T.pos.y - B.r) continue;
      const nx = dist > 1e-3 ? dx / dist : 0, nz = dist > 1e-3 ? dz / dist : 1;
      T.pos.x = h.pos.x + nx * reach; T.pos.z = h.pos.z + nz * reach;
      const hv = h.vel.x * nx + h.vel.z * nz, bv = T.vel.x * nx + T.vel.z * nz, want = Math.max(0, hv) * 1.3 + 2;
      if (bv < want) {
        T.vel.x += nx * (want - bv); T.vel.z += nz * (want - bv);
        if (T.pos.y < B.r + 0.05 && hv > 5) T.vel.y += 1.6;
        if (T.last !== h) { T.prev = T.last; T.last = h; }
        T.touchT = G.time;
      }
    }
    // roll the mesh with the ball
    const sp = Math.hypot(T.vel.x, T.vel.z);
    if (sp > 0.05) { AX.set(T.vel.z, 0, -T.vel.x).normalize(); T.root.rotateOnWorldAxis(AX, sp * dt / B.r); }
    // goal?
    if (!T.over && !G.over) for (const g of T.goals) {
      if (Math.abs(T.pos.x) < B.goalW / 2 - 0.2 && T.pos.y < B.goalH && g.s * (T.pos.z - g.z0) > B.r * 0.4) { goal(G, T, g); break; }
    }
    // stuck somewhere nobody can reach: drop it back in
    if (T.wait <= 0 && G.time - T.touchT > B.idle) { T.wait = 1.5; G.ev.ball?.('stuck', T); }
  }
  T.root.position.copy(T.pos);
  T.marker.position.set(T.pos.x, 0.05, T.pos.z);
  T.marker.material.opacity = T.wait > 0 ? 0.15 : Math.max(0.12, 0.45 - (T.pos.y - B.r) * 0.04);
  T.flash = Math.max(0, T.flash - dt * 3);
  T.shell.material.emissiveIntensity = T.flash * 0.6;
}

function goal(G, T, g) {
  const team = other(g.team), scorer = T.last, own = scorer && scorer.team === g.team;
  const assist = !own && T.prev && T.prev !== scorer && T.prev.team === team ? T.prev : null;
  T.pts[team]++;
  if (scorer && !own) scorer.goals = (scorer.goals || 0) + 1;
  const at = T.pos.clone();
  for (let k = 0; k < 4; k++) setTimeout(() => burst(G, at.clone().add(new THREE.Vector3((Math.random() - 0.5) * 6, Math.random() * 4, 0)), [0xffc93c, TEAM_HEX[team], 0xffffff, 0x9b5cff][k], 1.4), k * 120);
  ring(G, at.clone().setY(0.1), TEAM_HEX[team], 6);
  G.ev.ball?.('goal', T, team, scorer, own, assist);
  if (T.pts[team] >= BALL.toWin || T.ot) return finish(G, team);
  T.wait = BALL.reset;
}
function finish(G, winner) {
  const T = G.ball; T.over = true; T.wait = 999;
  G.ev.ball?.('end', T, winner);
}

// ---------- bots ----------
// The nearest bot on each team goes for the ball: it lines up behind it and runs through it
// toward the enemy goal. The furthest one hangs back between the ball and its own goal; anyone
// else supports a few metres behind the ball. Returns what the bot is doing.
export function ballGoal(G, b, goal) {
  const T = G.ball; if (!T) return null;
  const B = BALL, s = -side(b.team), bp = T.pos;
  const own = new THREE.Vector3(0, 0, side(b.team) * (G.map.L - B.back));
  if (T.wait > 0) { goal.set(b.pos.x * 0.5, 0, side(b.team) * 10); return { role: 'reset' }; }
  const mates = G.heroes.filter(u => u.alive && u.team === b.team).sort((x, y) => Math.hypot(x.pos.x - bp.x, x.pos.z - bp.z) - Math.hypot(y.pos.x - bp.x, y.pos.z - bp.z));
  const rank = mates.indexOf(b);
  // which way to push it: at the middle of their goal mouth
  const ex = 0 - bp.x, ez = s * (G.map.L - B.back) + s * B.goalD - bp.z, el = Math.hypot(ex, ez) || 1, ux = ex / el, uz = ez / el;
  if (rank === 0 || (rank === 1 && Math.hypot(b.pos.x - bp.x, b.pos.z - bp.z) < 6)) {
    const rx = b.pos.x - bp.x, rz = b.pos.z - bp.z;
    const along = rx * ux + rz * uz, lateral = Math.abs(rx * uz - rz * ux);
    if (along < -0.5 && lateral < B.r + 0.9) goal.set(bp.x + ux * 4, 0, bp.z + uz * 4);           // lined up: run through it
    else goal.set(bp.x - ux * (B.r + 2), 0, bp.z - uz * (B.r + 2)).add(V.set(lateral > 3 ? 0 : -uz * 2 * Math.sign(rx * uz - rz * ux || 1), 0, lateral > 3 ? 0 : ux * 2 * Math.sign(rx * uz - rz * ux || 1)));
    return { role: 'chase', aim: along < 0 };
  }
  if (rank === mates.length - 1 && mates.length > 1) {
    goal.set(own.x + (bp.x - own.x) * 0.3, 0, own.z + (bp.z - own.z) * 0.3);                    // keeper
    return { role: 'keep', aim: Math.hypot(b.pos.x - bp.x, b.pos.z - bp.z) < 18 };
  }
  goal.set(bp.x - ux * 9 + (rank % 2 ? 6 : -6), 0, bp.z - uz * 9);
  return { role: 'support', aim: true };
}
// Where a bot should aim to shoot the ball toward their goal, if it's worth a shot from here.
export function ballAim(G, b) {
  const T = G.ball; if (!T || T.wait > 0 || T.over) return null;
  const w = b.def.weapon, s = -side(b.team);
  const dx = T.pos.x - b.pos.x, dz = T.pos.z - b.pos.z, d = Math.hypot(dx, dz);
  if (d > Math.min((w.range || 60) * 0.8, 30)) return null;
  // only from behind the ball, so the shot sends it the right way
  if (dz * s < -1 && Math.abs(dz) > Math.abs(dx) * 0.5) return null;
  const y = T.pos.y - (b.pos.y + 1.5) - (w.type === 'rocket' ? 0.4 : 0);
  return { yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(y, d) };
}
