// Ridgeline Summit hazards: falling rocks (with a warning streak down the face), wind gusts on Storm ridge,
// lightning flashes that light up the route, and the cold away from camp fires.
// Everything is scheduled from the seed and the round clock, so online every climber sees the same rock fall
// and the same gust at the same moment without sending anything.
import { THREE, scene, sfx, rng, flake } from './world.js';
import { fx } from './fx.js';
import { SUMMIT } from './summit_world.js';

const WARN = 1.6, G = 14;                       // seconds of warning before a rock drops, rock gravity
const ROCK_GAP = [[30, 50], [18, 32], [11, 20]]; // seconds between rocks on one face, by pace
const GUST_GAP = [[11, 17], [8, 13], [6, 10]], GUST_LEN = 2.6, GUST_WARN = 1.2;
const BOLT_GAP = [16, 28];
// cold: how much of your normal stamina recovery you keep away from a fire, per zone
export const COLD = [1, .65, .6, .45, .4];

let rocks = [], gusts = [], bolts = [];
const H_END = 4200; // schedule this many seconds ahead (well past any climb)
/** Plan every rock, gust and bolt for this mountain. */
export function buildHazards(seed, pace = 1) {
  rocks = []; gusts = []; bolts = []; seen.clear();
  for (const f of SUMMIT.faces) {
    if (f.zone < 1 || f.zone > 3 || f.idea === 'chimney') continue; // Ice caverns (icicles), Temple ruins (stones), Storm ridge (rocks)
    const r = rng(seed ^ (0x7c3a1 + f.id * 977)), [a, b] = ROCK_GAP[pace] ?? ROCK_GAP[1];
    for (let t = 20 + r() * a; t < H_END; t += a + r() * (b - a)) rocks.push({ f, t, x: f.x0 + 2 + r() * (f.x1 - f.x0 - 4), id: rocks.length, kind: f.zone === 1 ? 'ice' : 'rock' });
  }
  const r = rng(seed ^ 0x51c0de), [ga, gb] = GUST_GAP[pace] ?? GUST_GAP[1];
  for (let t = 15 + r() * ga; t < H_END; t += ga + r() * (gb - ga)) gusts.push({ t, dir: r() < .5 ? -1 : 1, k: .7 + r() * .3 });
  for (let t = 10 + r() * BOLT_GAP[0]; t < H_END; t += BOLT_GAP[0] + r() * (BOLT_GAP[1] - BOLT_GAP[0])) bolts.push({ t, x: (r() - .5) * 60 });
}

/* ================= looks ================= */
const group = new THREE.Group(); scene.add(group);
const rockGeo = new THREE.DodecahedronGeometry(.45, 0), iceGeo = new THREE.ConeGeometry(.22, 1.3, 6).rotateX(Math.PI);
const rockMat = new THREE.MeshStandardMaterial({ color: 0x6b625a, roughness: 1, flatShading: true }), iceMat = new THREE.MeshStandardMaterial({ color: 0xd9f3ff, roughness: .2 });
const streakMat = new THREE.MeshBasicMaterial({ color: 0x2a0d0d, transparent: true, opacity: 0, depthWrite: false });
const POOL = 8, pool = Array.from({ length: POOL }, () => {
  const rock = new THREE.Mesh(rockGeo, rockMat), ice = new THREE.Mesh(iceGeo, iceMat), streak = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), streakMat.clone());
  rock.castShadow = true; streak.rotation.y = Math.PI; group.add(rock, ice, streak); rock.visible = ice.visible = streak.visible = false;
  return { rock, ice, streak };
});
// snow streaks blown sideways on Storm ridge (and light snowfall everywhere above the caverns)
const SN = 260, snGeo = new THREE.BufferGeometry(), snPos = new Float32Array(SN * 3), snSeed = new Float32Array(SN * 3);
for (let i = 0; i < SN * 3; i++) snSeed[i] = Math.random();
snGeo.setAttribute('position', new THREE.BufferAttribute(snPos, 3));
const snow = new THREE.Points(snGeo, new THREE.PointsMaterial({ size: .18, map: flake, color: 0xffffff, transparent: true, opacity: .85, depthWrite: false }));
snow.frustumCulled = false; group.add(snow);
export function showHazards(v) { group.visible = v; if (!v) pool.forEach((o) => o.rock.visible = o.ice.visible = o.streak.visible = false); }

/* ================= queries ================= */
const seen = new Set(); // rock ids already resolved (hit tests) for the local climbers
/** Gust strength at time t: { k 0..1 (0 = calm), dir -1|1, warn 0..1 (the howl before it hits) }. */
export function windAt(t) {
  for (const g of gusts) {
    if (g.t - GUST_WARN > t) break;
    if (t < g.t) return { k: 0, dir: g.dir, warn: 1 - (g.t - t) / GUST_WARN };
    if (t < g.t + GUST_LEN) { const u = (t - g.t) / GUST_LEN; return { k: g.k * Math.sin(Math.min(1, u * 1.4) * Math.PI * .5) * (u > .8 ? (1 - u) / .2 : 1), dir: g.dir, warn: 0 }; }
  }
  return { k: 0, dir: 1, warn: 0 };
}
/** Lightning brightness 0..1 at time t (only up on Storm ridge and the Summit). */
export function flashAt(t) {
  for (const b of bolts) { if (b.t > t) break; const d = t - b.t; if (d < .9) return d < .08 ? 1 : d < .2 ? .4 : d < .32 ? .9 : Math.max(0, 1 - (d - .32) / .58) * .6; }
  return 0;
}
const zoneWind = (zone) => zone === 3 ? 1 : zone === 4 ? .5 : 0;

/**
 * Every frame on the mountain. t: round time; local: the local climbers (they get hit); viewer: whose view the snow follows.
 * cb: { rockHit(p, onWall), gust(p, k, dir), thunder(), zoneOf(y) }
 */
let lastGust = null, lastBolt = -1;
export function updateHazards(t, dt, local, viewer, cb) {
  const ys = local.map((p) => p.y);
  // rocks: only the ones on faces near a local climber are drawn and tested
  let n = 0;
  for (const R of rocks) {
    if (R.t > t + .1) continue;
    const fallT = Math.sqrt(2 * (R.f.y1 - R.f.y0) / G), end = R.t + WARN + fallT;
    if (t > end + .3) continue;
    if (!ys.some((y) => y > R.f.y0 - 12 && y < R.f.y1 + 6) || n >= POOL) continue;
    const o = pool[n++], age = t - R.t, H = R.f.y1 - R.f.y0;
    o.streak.visible = true; o.streak.scale.set(1.1, H, 1); o.streak.position.set(R.x, (R.f.y0 + R.f.y1) / 2, R.f.z - .05);
    o.streak.material.opacity = age < WARN ? .18 + Math.sin(age * 18) * .1 : Math.max(0, .25 - (age - WARN));
    const m = R.kind === 'ice' ? o.ice : o.rock; (R.kind === 'ice' ? o.rock : o.ice).visible = false;
    if (age < WARN) { m.visible = false; if (!R.warned) { R.warned = true; if (local.some((p) => Math.abs(p.x - R.x) < 9 && Math.abs(p.y - R.f.y1) < 22)) sfx.whistle?.(); } continue; }
    const ft = age - WARN, y = R.f.y1 + .3 - .5 * G * ft * ft;
    m.visible = y > R.f.y0 - .5; m.position.set(R.x, Math.max(R.f.y0, y), R.f.z - .5); m.rotation.set(ft * 7, ft * 4, 0);
    for (const p of local) {
      const key = R.id + ':' + p.ragId; if (seen.has(key) || p.st !== 0) continue;
      const onFace = (p.wall && p.wall.face === R.f.id) || (p.hang && Math.abs(p.z - R.f.z) < 1.2);
      const atFoot = p.ground && Math.abs(p.y - R.f.y0) < 1 && Math.abs(p.z - R.f.z) < 2.2;
      if (Math.abs(p.x - R.x) < .95 && ((onFace && Math.abs(y - (p.y + 1.3)) < 1.1) || (atFoot && y <= R.f.y0 + 1.5))) { seen.add(key); cb.rockHit(p, onFace); }
    }
    if (y <= R.f.y0 && !R.landed) { R.landed = true; fx.dust(R.x, R.f.y0 + .1, R.f.z - .6, 14, 1, R.kind === 'ice' ? 0xd9f3ff : 0x8a7a6a); if (ys.some((yy) => Math.abs(yy - R.f.y0) < 20)) sfx.slam?.(); }
  }
  for (let k = n; k < POOL; k++) pool[k].rock.visible = pool[k].ice.visible = pool[k].streak.visible = false;
  // wind: howl before the gust, then push everyone in the windy zones
  const w = windAt(t);
  const gustId = gusts.findIndex((g) => g.t - GUST_WARN <= t && t < g.t + GUST_LEN);
  if (gustId >= 0 && lastGust !== gustId && local.some((p) => zoneWind(cb.zoneOf(p.y)) > 0)) { lastGust = gustId; sfx.whoosh?.(); setTimeout(() => sfx.whoosh?.(), 300); }
  for (const p of local) { const zk = zoneWind(cb.zoneOf(p.y)); if (zk > 0 && w.k > 0 && p.st === 0) cb.gust(p, w.k * zk, w.dir, dt); }
  // lightning: thunder once per bolt when someone is up high
  const bi = bolts.findIndex((b) => b.t <= t && t < b.t + .9);
  if (bi >= 0 && bi !== lastBolt && local.some((p) => cb.zoneOf(p.y) >= 3)) { lastBolt = bi; setTimeout(() => cb.thunder(), 350 + Math.random() * 500); }
  // snow: around the viewer, blown sideways by the wind (none down in the caverns)
  const vz = viewer ? cb.zoneOf(viewer.y) : 0, show = viewer && vz !== 1;
  snow.visible = !!show;
  if (show) {
    const wx = w.dir * w.k * zoneWind(vz) * 22, fall = 2.2, tt = performance.now() / 1000;
    for (let i = 0; i < SN; i++) {
      const sx = snSeed[i * 3], sy = snSeed[i * 3 + 1], sz = snSeed[i * 3 + 2];
      snPos[i * 3] = viewer.x + (((sx * 40 + tt * wx) % 40) + 40) % 40 - 20;
      snPos[i * 3 + 1] = viewer.y + 12 - (((sy * 16 + tt * fall) % 16) + 16) % 16;
      snPos[i * 3 + 2] = viewer.z - 10 + sz * 20;
    }
    snGeo.attributes.position.needsUpdate = true;
  }
}
