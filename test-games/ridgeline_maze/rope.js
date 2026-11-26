// Ridgeline Summit rope work: the team rope between climbers, pitons in the rock, belaying and hauling.
// The rope you see is a light verlet chain (looks only). The rules are simple distance checks:
//  - your own piton catches you about 1.4 m below it (you clip in when you place or pass one)
//  - a teammate above catches you at the end of the rope if they belay (hold E) or are anchored, otherwise you yank them
//  - while you hang, a belaying teammate hauls you up (costs their stamina)
import { THREE, scene, sfx, groundUnder } from './world.js';
import { fx } from './fx.js';
import { SUMMIT } from './summit_world.js';

export const ROPE_MAX = 9;          // metres of rope between two teammates
const CLIP_SLACK = 1.4;             // how far below your piton you end up when it catches you
const HAUL_V = 1.15, HAUL_COST = .11, BELAY_COST = .08, YANK_COST = .22;
const N = 14;                       // nodes per rope (looks only)

export const PITONS = [];
const group = new THREE.Group(); scene.add(group);
const metal = new THREE.MeshStandardMaterial({ color: 0xc9ced6, metalness: .6, roughness: .35 });
const spikeGeo = new THREE.ConeGeometry(.035, .24, 6).rotateX(Math.PI / 2), eyeGeo = new THREE.TorusGeometry(.055, .014, 6, 14), tagGeo = new THREE.BoxGeometry(.07, .035, .02);

/* ================= pitons ================= */
function makePiton(d, key) {
  const g = new THREE.Group(); g.position.set(d.x, d.y, d.z);
  const spike = new THREE.Mesh(spikeGeo, metal); spike.position.z = .08; g.add(spike);
  const eye = new THREE.Mesh(eyeGeo, metal); eye.position.set(0, -.04, -.05); g.add(eye);
  const tag = new THREE.Mesh(tagGeo, new THREE.MeshBasicMaterial({ color: d.color || '#ffd23f' })); tag.position.set(0, .05, -.03); g.add(tag);
  group.add(g);
  const pit = { id: PITONS.length, key: key || 'L' + PITONS.length, x: d.x, y: d.y, z: d.z, face: d.face, owner: d.owner || 'Climber', color: d.color, mesh: g };
  PITONS.push(pit); return pit;
}
/** Hammer a piton into the face just above the climber's head and clip into it. Returns { pit, fresh }, or null. key: the Firebase key online. */
export function placePiton(p, key) {
  if (!p.wall) return null;
  const f = SUMMIT.faces[p.wall.face], x = p.x, y = p.y + 1.55, z = f.z - .04;
  const near = PITONS.find((q) => q.face === f.id && Math.hypot(q.x - x, q.y - y) < .7);
  if (near) { p.clip = near; sfx.tink(); return { pit: near, fresh: false }; } // one is already right there: just clip in
  const pit = makePiton({ x: +x.toFixed(2), y: +y.toFixed(2), z: +z.toFixed(2), face: f.id, owner: p.name, color: p.color }, key);
  p.clip = pit;
  sfx.hammer(); fx.sparkle(x, y, z - .1, 0xfff3c4, 6); fx.dust(x, y - .1, z - .15, 4, .25, 0xbdb6ad);
  return { pit, fresh: true };
}
/** A teammate's piton arrived from the room (late joiners get every piton placed so far). */
export function addPiton(d, key) {
  if (!d || PITONS.some((q) => q.key === key)) return null;
  const pit = makePiton({ x: +d.x, y: +d.y, z: +d.z, face: d.face | 0, owner: String(d.owner || 'Climber').slice(0, 16), color: String(d.color || '#ffd23f') }, key);
  fx.sparkle(pit.x, pit.y, pit.z - .1, 0xfff3c4, 4); return pit;
}
export const pitonByKey = (key) => PITONS.find((q) => q.key === key) || null;
export const pitonData = (pit) => ({ x: pit.x, y: pit.y, z: pit.z, face: pit.face, owner: pit.owner, color: pit.color });
export function clearRope() {
  PITONS.forEach((q) => group.remove(q.mesh)); PITONS.length = 0;
  ropes.clear(); segs.count = 0;
}

/* ================= rules ================= */
// Team members are local climbers or proxies for online teammates ({ remote: true, ... } kept up to date by game.js).
// Only local climbers are simulated here; whatever happens to a remote one is sent to them (cb.remoteHit).
const harness = (p) => ({ x: p.x, y: p.y + 1, z: p.z });
const d3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const anchored = (q) => q.st === 0 && !q.hang && (q.ground || (q.wall && q.wall.hands.filter(Boolean).length === 2) || (q.clip && q.clip.y > q.y));
/** Where the rope to an upper teammate bends: their harness on the wall, or the lip of the face they stand above. */
function anchorOf(q, p) {
  if (q.wall || !q.ground) return harness(q);
  const f = SUMMIT.faces.find((f) => Math.abs(f.y1 - q.y) < .6 && f.z > p.z - .5);
  return f ? { x: Math.max(f.x0 + .5, Math.min(f.x1 - .5, q.x)), y: f.y1 + .1, z: f.z - .05, lip: f } : harness(q);
}
/** Teammates you are roped to: the one before and after you in the team order. */
export const partners = (team, p) => { const i = team.indexOf(p); return i < 0 ? [] : [team[i - 1], team[i + 1]].filter(Boolean); };

/**
 * After everyone moved: clip-ins, catches, hanging, hauling and the leash. team: everyone in rope order.
 * cb: { toast(p,msg), letGo(p,why), remoteHit(q, kind 'jolt'|'yank', fromName) }
 */
export function ropeStep(team, dt, cb) {
  for (const p of team) {
    if (p.remote) continue;
    if (p.st !== 0) { p.hang = null; continue; }
    const c = { x: p.x, y: p.y + 1.3, z: p.z };
    // clip into any piton you climb past (yours or a teammate's)
    if (p.wall) for (const q of PITONS) if (q !== p.clip && q.face === p.wall.face && q.y > (p.clip?.y ?? -1e9) && d3(c, q) < 1.3) {
      p.clip = q; sfx.tink(); if (q.owner !== p.name) cb.toast(p, `Clipped into ${q.owner}'s piton`);
    }
    if (p.hang && (p.wall || p.ground)) p.hang = null;
    // belaying while a teammate below hangs on you: you are hauling, and that is hard work
    if (p.belay && partners(team, p).some((q) => q.st === 0 && q.hang && q.y < p.y)) p.stamina -= HAUL_COST * dt;
    // falling: does something catch you?
    if (!p.wall && !p.ground && !p.hang && p.vy < -1) {
      if (p.clip && p.y < p.clip.y - CLIP_SLACK && p.clip.y - p.y < 14) {
        catchOn(p, p.clip, CLIP_SLACK + .15, null); cb.toast(p, 'Your piton caught you!');
      } else for (const q of partners(team, p)) {
        if (q.st !== 0 || q.y < p.y + .5) continue;
        const A = anchorOf(q, p); if (d3(harness(p), A) < ROPE_MAX) continue;
        if (q.belay) {
          if (q.remote) cb.remoteHit(q, 'belay', p.name); else { q.stamina -= BELAY_COST; cb.toast(q, `Caught ${p.name}!`); }
          catchOn(p, A, ROPE_MAX, q); cb.toast(p, `${q.name} caught you!`);
        } else if (anchored(q)) {
          if (q.remote) cb.remoteHit(q, 'jolt', p.name); else jolt(q, A, p.name, cb);
          catchOn(p, A, ROPE_MAX, q); cb.toast(p, `The rope held · ${q.name} took the jolt`);
        } else if (q.wall) {
          if (q.remote) cb.remoteHit(q, 'yank', p.name); else cb.letGo(q, `${p.name} yanked you off the wall!`);
          cb.toast(p, `You pulled ${q.name} off!`);
        }
        break;
      }
    }
    // hanging: stay on the end of the rope (it swings a little as you move), a belaying teammate hauls you up
    if (p.hang) {
      const H = p.hang, A = H.by ? anchorOf(H.by, p) : H.a;
      if (H.by && (H.by.st !== 0 || H.by.hang || H.by.gone)) { p.hang = null; continue; }
      if (H.by && H.by.belay && (H.by.remote || H.by.stamina > .03)) { H.len = Math.max(1.1, H.len - HAUL_V * dt); H.hauling = true; } else H.hauling = false;
      const h = harness(p), dx = h.x - A.x, dy = h.y - A.y, dz = h.z - A.z, d = Math.hypot(dx, dy, dz);
      if (d > H.len) { const k = H.len / d; p.x = A.x + dx * k; p.y = A.y + dy * k - 1; p.z = A.z + dz * k; }
      const f = SUMMIT.faces.find((f) => p.y + 1 < f.y1 + .5 && p.y > f.y0 - 2 && p.z > f.z - 1.5 && p.z < f.z + .5);
      if (f) p.z = Math.min(p.z, f.z - .42);
      p.vy = 0; p.airTop = p.y; p.stamina = Math.min(1, p.stamina + .05 * dt);
      // hauled right up to the lip: over the top
      if (A.lip && p.y + 1.9 > A.lip.y1) { p.hang = null; p.y = A.lip.y1; p.z = A.lip.z + .8; p.ground = true; p.land = .3; sfx.land(); fx.dust(p.x, p.y, p.z, 8, .6); cb.toast(p, `${H.by.name} hauled you over the top!`); if (!H.by.remote) { cb.toast(H.by, `Hauled ${p.name} up!`); H.by.hauls = (H.by.hauls || 0) + 1; } p.hauled = true; }
    }
  }
  // the leash: walking away from a teammate on the same level drags them along; a climber above pulls a walker to the wall
  for (let i = 0; i + 1 < team.length; i++) {
    const a = team[i], b = team[i + 1]; if (a.st !== 0 || b.st !== 0 || a.hang || b.hang) continue;
    const ha = harness(a), hb = harness(b), d = d3(ha, hb); if (d <= ROPE_MAX) continue;
    const ex = d - ROPE_MAX;
    if (a.ground && b.ground && Math.abs(a.y - b.y) < 1) {
      const dx = b.x - a.x, dz = b.z - a.z, share = a.remote || b.remote ? 1 : .5, k = Math.min(ex, 6 * dt) * share / Math.max(.01, Math.hypot(dx, dz));
      if (!a.remote) { a.x += dx * k; a.z += dz * k; }
      if (!b.remote) { b.x -= dx * k; b.z -= dz * k; }
      continue;
    }
    const lo = a.y < b.y ? a : b, hi = lo === a ? b : a;
    if (lo.ground && !lo.remote) { const k = Math.min(1, 1.6 * dt / Math.max(.1, Math.hypot(hi.x - lo.x, hi.z - lo.z))); lo.ex += (hi.x - lo.x) * k * 4; lo.ez += (hi.z - lo.z) * k * 4; }
    if (hi.wall && !hi.remote) { hi.stamina -= .05 * dt; if ((hi.tightT = (hi.tightT || 0) - dt) <= 0) { hi.tightT = 2.5; cb.toast(hi, `The rope's tight · wait for ${lo.name} or belay them`); } }
  }
}
/** A local climber takes the jolt of a teammate's fall (also used when the faller is online). */
export function jolt(q, A, from, cb) {
  q.stamina -= YANK_COST; q.shake = Math.max(q.shake || 0, .55); q.stumble = Math.max(q.stumble || 0, .7);
  if (q.ground && A) q.ez = (A.z - q.z) > 0 ? 3 : -3;
  cb.toast(q, `${from} fell! Hold ${q.ctrl.bk} to belay next time`);
}
export const BELAY_HIT = BELAY_COST;
function catchOn(p, A, len, by) {
  const fall = Math.max(0, (p.airTop ?? p.y) - p.y);
  p.hang = { a: A, len, by, hauling: false }; p.vy = 0; p.ex *= .3; p.ez *= .3;
  p.shake = Math.max(p.shake || 0, Math.min(.9, .25 + fall * .05)); p.stamina = Math.max(0, p.stamina - Math.min(.25, fall * .02));
  sfx.oof?.(); sfx.twang?.(Math.min(1.5, .6 + fall * .08)); fx.dust(p.x, p.y + 1, p.z, 6, .5, 0xffffff);
  p.ropeCatches = (p.ropeCatches || 0) + 1;
}

/** HUD line for the rope (empty when nothing rope-related is going on). */
export function ropePrompt(p, team) {
  const bk = p.ctrl.bk;
  if (p.hang) {
    const by = p.hang.by;
    if (by && p.hang.hauling) return `${by.name} is hauling you up…`;
    if (by) return `Hanging on the rope · grab a hold, or ${by.name} holds ${by.ctrl.bk} to haul you`;
    return 'Hanging on your piton · grab a hold to climb on';
  }
  const below = partners(team, p).find((q) => q.st === 0 && q.y < p.y - 1);
  if (p.belay && below) return below.hang ? `Hauling ${below.name} up… keep holding ${bk}` : `Belaying ${below.name} · their falls are caught`;
  if (below && (below.hang?.by === p || (below.remote && below.hang))) return `Hold ${bk} · haul ${below.name} up!`;
  if (p.wall && p.slot === 3) return p.pitons > 0 ? `${p.ctrl.id === 'p2' ? '/' : 'F'} · hammer in a piton (${p.pitons} left)` : 'Out of pitons · refill at a camp';
  if (below && !below.ground && (p.ground || p.wall)) return `Hold ${bk} · belay ${below.name}`;
  return '';
}

/* ================= looks: verlet ropes drawn as one instanced mesh ================= */
const ropes = new Map(); // key -> { pts: [Vector3], old: [Vector3], seen }
const ropeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .7 });
const ORANGE = new THREE.Color(0xff7a2a), GOLD = new THREE.Color(0xffc531); // the golden rope is a Brutal summit reward
const segGeo = new THREE.CylinderGeometry(.026, .026, 1, 5, 1, true).translate(0, .5, 0);
const segs = new THREE.InstancedMesh(segGeo, ropeMat, 260); segs.count = 0; segs.frustumCulled = false; segs.castShadow = true; scene.add(segs);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _d = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
function chain(key, a, b, rest) {
  let r = ropes.get(key);
  if (!r) { r = { pts: [], old: [] }; for (let k = 0; k < N; k++) { const v = new THREE.Vector3().lerpVectors(a, b, k / (N - 1)); r.pts.push(v); r.old.push(v.clone()); } ropes.set(key, r); }
  r.seen = true; r.a = a; r.b = b; r.rest = rest; return r;
}
function simulate(r, dt) {
  const P = r.pts, O = r.old, g = 9.8 * dt * dt;
  for (let k = 1; k < N - 1; k++) { const p = P[k], o = O[k], vx = (p.x - o.x) * .97, vy = (p.y - o.y) * .97, vz = (p.z - o.z) * .97; o.copy(p); p.x += vx; p.y += vy - g; p.z += vz; }
  P[0].copy(r.a); P[N - 1].copy(r.b);
  for (let it = 0; it < 6; it++) {
    for (let k = 0; k < N - 1; k++) {
      const p = P[k], q = P[k + 1]; _d.subVectors(q, p); const d = _d.length() || 1e-4; if (d <= r.rest) continue;
      const wp = k === 0 ? 0 : 1, wq = k + 1 === N - 1 ? 0 : 1, e = (d - r.rest) / d / (wp + wq); // the ends are pinned
      p.addScaledVector(_d, e * wp); q.addScaledVector(_d, -e * wq);
    }
    for (let k = 1; k < N - 1 && it % 3 === 2; k++) { // keep it out of the rock and off the ground (every third pass is enough)
      const p = P[k];
      for (const f of SUMMIT.faces) if (p.y < f.y1 && p.y > f.y0 - 1 && p.z > f.z - .05 && p.z < f.z + 2.5 && p.x > f.x0 && p.x < f.x1) p.z = f.z - .05;
      const gy = groundUnder(p.x, p.z, p.y + .3, 0) + .03; if (p.y < gy) { p.y = gy; O[k].x = p.x; O[k].z = p.z; }
    }
  }
}
/** Rebuild and draw every rope: teammate to teammate, and each climber to the piton they are clipped into. */
export function updateRopes(team, dt) {
  for (const r of ropes.values()) r.seen = false;
  const hv = (p) => new THREE.Vector3(p.x, p.y + 1, p.z);
  for (let i = 0; i + 1 < team.length; i++) {
    const a = team[i], b = team[i + 1]; if (a.st === 2 && b.st === 2) continue;
    const rp = chain(`t${i}`, hv(a), hv(b), ROPE_MAX / (N - 1)); rp.gold = !!(a.ropeGold || b.ropeGold); simulate(rp, dt);
  }
  for (const p of team) if (p.clip && p.st !== 2 && Math.hypot(p.x - p.clip.x, p.y + 1 - p.clip.y) < 16) {
    const a = new THREE.Vector3(p.clip.x, p.clip.y - .05, p.clip.z - .06), b = hv(p);
    const rc = chain("c" + p.ragId, a, b, Math.max(.4, a.distanceTo(b)) * 1.08 / (N - 1)); rc.gold = !!p.ropeGold; simulate(rc, dt);
  }
  let n = 0;
  for (const [k, r] of ropes) {
    if (!r.seen) { ropes.delete(k); continue; }
    for (let s = 0; s < N - 1 && n < 260; s++) {
      const a = r.pts[s], b = r.pts[s + 1]; _d.subVectors(b, a); const len = _d.length(); if (len < 1e-4) continue;
      _q.setFromUnitVectors(UP, _d.divideScalar(len)); _m.compose(a, _q, _s.set(1, len, 1)); segs.setColorAt(n, r.gold ? GOLD : ORANGE); segs.setMatrixAt(n++, _m);
    }
  }
  segs.count = n; segs.instanceMatrix.needsUpdate = true; if (segs.instanceColor) segs.instanceColor.needsUpdate = true;
}
export function showRope(v) { group.visible = segs.visible = v; }
