import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { TUNING } from './data.js?v=20261127a';
import { THEMES, rng, buildSky, buildGround } from './scenery.js?v=20261127a';
import { buildBackdrop } from './backdrop.js?v=20261127a';
import { styleBlock, scatterProps, laneGates } from './props.js?v=20261127a';
import { buildAmbient } from './ambient.js?v=20261127a';
import { buildStageSky, buildDressing, contactShadows } from './stage.js?v=20261127a';

// ---------- collision primitives ----------
// A collider is an axis-aligned box from y=0 (or bottom) to top.
export function makeBox(x, z, w, d, h, bottom = 0) {
  return { minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, bottom, top: bottom + h, alive: true };
}

// Push a circle (feet at pos.y) out of every box it intersects horizontally.
export function resolveXZ(pos, r, colliders) {
  for (const b of colliders) {
    if (!b.alive) continue;
    if (pos.y >= b.top - TUNING.step || pos.y + 1.8 <= b.bottom) continue;
    const cx = Math.max(b.minX, Math.min(pos.x, b.maxX));
    const cz = Math.max(b.minZ, Math.min(pos.z, b.maxZ));
    let dx = pos.x - cx, dz = pos.z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 >= r * r) continue;
    if (d2 > 1e-8) {
      const d = Math.sqrt(d2), p = r - d;
      pos.x += (dx / d) * p; pos.z += (dz / d) * p;
    } else {
      const l = pos.x - b.minX, rr = b.maxX - pos.x, f = pos.z - b.minZ, bk = b.maxZ - pos.z;
      const m = Math.min(l, rr, f, bk);
      if (m === l) pos.x = b.minX - r; else if (m === rr) pos.x = b.maxX + r;
      else if (m === f) pos.z = b.minZ - r; else pos.z = b.maxZ + r;
    }
  }
}

export function groundAt(pos, r, colliders) {
  let g = 0;
  const rr = r * 0.7;
  for (const b of colliders) {
    if (!b.alive) continue;
    if (pos.x + rr < b.minX || pos.x - rr > b.maxX || pos.z + rr < b.minZ || pos.z - rr > b.maxZ) continue;
    if (b.top <= pos.y + TUNING.step + 0.01 && b.top > g) g = b.top;
  }
  return g;
}

// Shared body integrator for heroes and minions. Returns true when grounded.
export function moveBody(body, dt, colliders) {
  const p = body.pos, v = body.vel, r = body.radius;
  v.y -= TUNING.gravity * dt;
  p.x += v.x * dt; resolveXZ(p, r, colliders);
  p.z += v.z * dt; resolveXZ(p, r, colliders);
  p.y += v.y * dt;
  const g = groundAt(p, r, colliders);
  if (p.y <= g) { p.y = g; if (v.y < 0) v.y = 0; return true; }
  // bonk head on overhead boxes is not needed: no ceilings in these maps
  return false;
}

// Ray vs AABB, returns distance or Infinity.
export function rayBox(o, d, b, maxT) {
  let t0 = 0, t1 = maxT;
  const mins = [b.minX, b.bottom, b.minZ], maxs = [b.maxX, b.top, b.maxZ];
  const os = [o.x, o.y, o.z], ds = [d.x, d.y, d.z];
  for (let i = 0; i < 3; i++) {
    if (Math.abs(ds[i]) < 1e-9) { if (os[i] < mins[i] || os[i] > maxs[i]) return Infinity; continue; }
    let a = (mins[i] - os[i]) / ds[i], c = (maxs[i] - os[i]) / ds[i];
    if (a > c) [a, c] = [c, a];
    t0 = Math.max(t0, a); t1 = Math.min(t1, c);
    if (t0 > t1) return Infinity;
  }
  return t0;
}

export function raySphere(o, d, c, r, maxT) {
  const ox = o.x - c.x, oy = o.y - c.y, oz = o.z - c.z;
  const b = ox * d.x + oy * d.y + oz * d.z;
  const cc = ox * ox + oy * oy + oz * oz - r * r;
  const h = b * b - cc;
  if (h < 0) return Infinity;
  const t = -b - Math.sqrt(h);
  return t >= 0 && t <= maxT ? t : Infinity;
}

// Nearest world (non-unit) hit along a ray. Structures are excluded: they're targets.
export function rayWorld(o, d, maxT, colliders) {
  let best = maxT;
  if (d.y < 0) { const tg = -o.y / d.y; if (tg < best) best = tg; }
  for (const b of colliders) {
    if (!b.alive || b.unit) continue;
    const t = rayBox(o, d, b, best);
    if (t < best) best = t;
  }
  return best;
}

export function hasLOS(a, b, colliders) {
  const d = new THREE.Vector3().subVectors(b, a);
  const len = d.length(); d.divideScalar(len);
  return rayWorld(a, d, len, colliders) >= len - 0.3;
}

// ---------- scene ----------
export function mirror(list) {
  const out = [];
  for (const it of list) {
    out.push(it);
    const m = [-it[0], -it[1], ...it.slice(2)];
    if (Math.abs(m[0] - it[0]) > 0.01 || Math.abs(m[1] - it[1]) > 0.01) out.push(m);
  }
  return out;
}

export function buildWorld(scene, map) {
  const colliders = [];
  const theme = map.theme, T = THEMES[theme], r = rng(map.id);
  const ticks = [buildStageSky(scene, map)];      // the old flat-gradient buildSky is replaced by stage.js
  buildGround(scene, map, theme);
  const far = buildBackdrop(scene, map, theme, r);
  if (far) ticks.push(far);

  // invisible boundary: the backdrop buildings are the visible wall
  const T2 = 2;
  for (const [x, z, w, d] of [
    [0, -map.L - T2 / 2, map.W * 2 + T2 * 2, T2], [0, map.L + T2 / 2, map.W * 2 + T2 * 2, T2],
    [-map.W - T2 / 2, 0, T2, map.L * 2], [map.W + T2 / 2, 0, T2, map.L * 2],
  ]) colliders.push(makeBox(x, z, w, d, 40));

  const blocks = mirror(map.blocks);
  blocks.forEach((b, i) => { styleBlock(scene, theme, b, i, r); colliders.push(makeBox(...b)); });
  contactShadows(scene, blocks);

  const towers = mirror(map.towers);
  const gates = map.survivor ? [] : laneGates(scene, map, theme);
  const extra = [
    ...gates,
    ...scatterProps(scene, map, theme, blocks, [...towers, ...gates], r),
  ];
  const amb = buildAmbient(scene, map, theme, r);
  extra.push(...amb.colliders);
  ticks.push(amb.tick, buildDressing(scene, map));
  for (const c of extra) colliders.push(makeBox(...c));

  return { colliders, tick: (dt, t) => ticks.forEach(f => f(dt, t)) };
}
