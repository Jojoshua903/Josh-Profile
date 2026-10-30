import { THREE, scene, toon, addOutline, V3, puff, toast } from './core.js';
import * as sfx from './sfx.js';
import { ARENA, PILLAR } from './woud-terrain.js';
import { PILLAR_CLIMB } from './woud-world.js';

// Bonk de Reuzenspecht: a giant woodpecker in a yellow hard hat. Kayo & Yara hired him to build their secret base
// in the Gladde Boom, and to keep everyone else away. He fights on top of the Mammoetboom, round the stump.
//   pik       – a red ring follows you. Then he dives and pecks it, and his beak gets STUCK in the planks.
//               Jump on his head while he pulls! (that's a hit)
//   splinters – he drums on the stump, TOK TOK TOK, and splinters fly out over the platform. Jump over them.
//   after hit 1 he flies to the top of the stump: "Come and get me, if you can climb!" Climb it (Grijp), while
//               he rolls pine cones down the bark. A red stripe shows where one is coming: move aside.
//               Up top he gets a fright: jump on him before he flaps you off.
// Three hits.
const C = V3(ARENA.x, ARENA.y, ARENA.z);
const H = ARENA.y, PT = PILLAR.top, PR = PILLAR.r + 1;
const HITS = 3;
export const boss = { state: 'sleep', t: 0, hits: 0 };
export const BOSS_INFO = {
  name: 'Bonk de Reuzenspecht', sub: 'Ingehuurd door Kayo & Yara',
  winTitle: 'Bonk geeft op!', winSub: 'Tok… tok… oké, oké, je wint.',
  fail: 'Au! Bonk pikte te hard. Nog een keer!',
  cookie: 'Bonk de Reuzenspecht', cookieY: H + 1.3, cookieAt: V3(C.x + 8, H + 1.3, C.z),
  arena: { x: C.x, y: H, z: C.z, r: 12 },
  music: 'specht',
};
const mk = (geo, mat, x, y, z, parent, ol = 1.05) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; if (ol) addOutline(m, ol); parent.add(m); return m; };

// ---------- Bonk ----------
export const bonk = new THREE.Group(); scene.add(bonk);
const body = new THREE.Group(); bonk.add(body);
const head = new THREE.Group(); head.position.set(0, 3, 0.25); body.add(head);
const wings = [];
{
  const blk = toon(0x1a1a24), wht = toon(0xf4f4f4), red = toon(0xe0443a), hat = toon(0xffc23d), ink = new THREE.MeshBasicMaterial({ color: 0x1a1030 });
  mk(new THREE.SphereGeometry(1.1, 16, 12), blk, 0, 1.6, 0, body).scale.set(1, 1.3, 0.9);
  mk(new THREE.SphereGeometry(0.85, 14, 10), wht, 0, 1.45, 0.42, body, 0).scale.set(0.85, 1.1, 0.6);
  mk(new THREE.TorusGeometry(0.98, 0.1, 6, 20), toon(0x8a5a2a), 0, 1.05, 0, body, 0).rotation.x = Math.PI / 2;     // tool belt
  mk(new THREE.BoxGeometry(0.2, 0.5, 0.12), toon(0x9a9aa8), 0.7, 0.9, 0.55, body, 0);                               // a hammer in it
  mk(new THREE.SphereGeometry(0.72, 16, 12), blk, 0, 0, 0, head);
  for (const s of [-1, 1]) {
    mk(new THREE.SphereGeometry(0.3, 10, 8), wht, 0.42 * s, -0.1, 0.35, head, 0).scale.set(0.6, 1, 0.6);
    mk(new THREE.SphereGeometry(0.15, 10, 8), wht, 0.3 * s, 0.15, 0.6, head, 0);
    mk(new THREE.SphereGeometry(0.08, 8, 6), ink, 0.3 * s, 0.15, 0.72, head, 0);
    const w = new THREE.Group(); w.position.set(1.05 * s, 2, -0.1); body.add(w);
    mk(new THREE.BoxGeometry(0.25, 1.8, 1.1), blk, 0.1 * s, -0.4, 0, w, 1.04);
    for (let i = 0; i < 3; i++) mk(new THREE.BoxGeometry(0.27, 0.16, 0.6), wht, 0.1 * s, -0.9 + i * 0.4, 0, w, 0);
    wings.push({ w, s });
    mk(new THREE.CylinderGeometry(0.1, 0.1, 0.5), toon(0xffc23d), 0.4 * s, 0.25, 0.1, body, 0);
  }
  const beak = mk(new THREE.ConeGeometry(0.22, 1.5, 10), toon(0x9a9aa8), 0, -0.05, 1.3, head); beak.rotation.x = Math.PI / 2;
  const crest = mk(new THREE.ConeGeometry(0.35, 0.8, 8), red, 0, 0.35, -0.55, head, 0); crest.rotation.x = -1.1;
  mk(new THREE.SphereGeometry(0.62, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), hat, 0, 0.42, -0.05, head);
  mk(new THREE.CylinderGeometry(0.8, 0.8, 0.07, 16), hat, 0, 0.42, 0.1, head, 0);
  mk(new THREE.BoxGeometry(0.5, 1.4, 0.15), blk, 0, 0.9, -1, body, 0).rotation.x = 0.5;     // the tail
}
// stars round his head when he's dazed
const stars = new THREE.Group(); stars.visible = false; scene.add(stars);
for (let i = 0; i < 4; i++) mk(new THREE.OctahedronGeometry(0.2), new THREE.MeshBasicMaterial({ color: 0xffe14a }), Math.cos(i * 1.57) * 0.9, 0, Math.sin(i * 1.57) * 0.9, stars, 0);
const headAt = () => head.getWorldPosition(V3());

// ---------- the warning ring, splinters, pine cones ----------
const ringMat = new THREE.MeshBasicMaterial({ color: 0xff3a3a, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false });
const ring = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.5, 24), ringMat); ring.rotation.x = -Math.PI / 2; ring.visible = false; scene.add(ring);
const splGeo = new THREE.BoxGeometry(0.2, 0.2, 1), splMat = toon(0xd8b080);
const coneGeo = new THREE.ConeGeometry(0.45, 0.9, 8), coneMat = toon(0x8a5a2a);
const stripeMat = new THREE.MeshBasicMaterial({ color: 0xff3a3a, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false });
const splinters = [], cones = [];
function clearAll() {
  for (const s of splinters) scene.remove(s.m); splinters.length = 0;
  for (const c of cones) { scene.remove(c.m); if (c.mark) scene.remove(c.mark); } cones.length = 0;
  ring.visible = false; stars.visible = false;
}
function spray(ph, off = 0) {
  const n = ph ? 12 : 10;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + off;
    const m = new THREE.Mesh(splGeo, splMat); addOutline(m, 1.2); m.rotation.y = a; scene.add(m);
    splinters.push({ m, a, r: PR + 0.3, sp: ph ? 10 : 8 });
  }
  sfx.smash();
}
function dropCone(lane, P) {
  if (lane !== null) {
    // down the bark, along a lane
    const mark = new THREE.Mesh(new THREE.PlaneGeometry(0.9, PT - H), stripeMat);
    mark.position.set(C.x + Math.sin(lane) * (PR + 0.08), (PT + H) / 2, C.z + Math.cos(lane) * (PR + 0.08)); mark.rotation.y = lane; scene.add(mark);
    const m = new THREE.Mesh(coneGeo, coneMat); m.visible = false; scene.add(m);
    cones.push({ m, mark, lane, y: PT + 0.5, t: 0, kind: 'roll' });
  } else {
    // onto the platform where you stand
    const at = V3(P.pos.x, H, P.pos.z);
    const mark = ring.clone(); mark.material = ringMat; mark.visible = true; mark.position.set(at.x, H + 0.05, at.z); scene.add(mark);
    const m = new THREE.Mesh(coneGeo, coneMat); m.position.set(at.x, H + 14, at.z); m.rotation.x = Math.PI; scene.add(m);
    cones.push({ m, mark, at, y: H + 14, t: 0, kind: 'fall' });
  }
}

// ---------- poses ----------
const perchAt = (a, y) => V3(C.x + Math.sin(a) * (PR + 0.9), y, C.z + Math.cos(a) * (PR + 0.9));
function pose(pos, yaw, pitch = 0) { bonk.position.copy(pos); bonk.rotation.y = yaw; body.rotation.x = pitch; }
function flap(t, k = 1) { for (const { w, s } of wings) w.rotation.z = s * (0.3 + Math.sin(t * 22) * 0.9 * k); }
function fold() { for (const { w } of wings) w.rotation.z = 0; }

export function resetBoss() {
  clearAll();
  Object.assign(boss, { state: 'sleep', t: 0, hits: 0, plan: 0, move: null, ms: '', mt: 0, next: 1.5, hold: false, phase: 'deck', ang: 0, cd: 0 });
  pose(perchAt(0, H + 8), 0); fold(); head.rotation.x = 0;
}
export const bossActive = () => !['sleep', 'dead'].includes(boss.state);
export const BONK_REST = V3(C.x - 8, H, C.z);
export function setBossDead() {
  boss.state = 'dead'; clearAll();
  pose(BONK_REST, Math.PI / 2); fold(); head.rotation.x = 0.2;
}
resetBoss();

// ---------- the fight ----------
const PLANS = [['pik', 'splinter', 'pik'], ['pik', 'splinter', 'pik', 'splinter', 'pik']];
const OUCH = ['BONK: AU! Mijn snavel! Daar blijf je toch af!', 'BONK: Hé! Niet op mijn helm springen! …Oké, oké, terug naar beneden.', 'BONK: Tok. Tok. …Ik geef het op.'];
function endMove() { boss.move = null; boss.ms = ''; boss.mt = 0; boss.next = boss.hits ? 0.8 : 1.2; ring.visible = false; }
const toward = (p) => Math.atan2(p.x - C.x, p.z - C.z);
function stomped(P) {
  const hp = headAt(), p = P.pos;
  const on = (q, r) => Math.hypot(p.x - q.x, p.z - q.z) < r && p.y > q.y - 0.3 && p.y < q.y + 1.6 && P.vel.y < 0;
  return on(hp, 1.4) || on(bonk.position.clone().add(V3(0, 2.4, 0)), 1.2);
}
function hit(api, msg) {
  boss.hits++; boss.state = 'hurt'; boss.t = 0; clearAll();
  api.bounce(14); api.shake(0.5); sfx.bossHit();
  puff(headAt(), 30, 0x1a1a24, 6, 2); puff(headAt(), 12, 0xe0443a, 4, 2);
  toast(msg || OUCH[Math.min(OUCH.length - 1, boss.hits - 1)]);
}

// api: { intro(), damage(from), bounce(vy), shake(s), win(pos) }
export function updateBoss(dt, t, P, prevY, api) {
  const b = boss, p = P.pos;
  b.t += dt; b.mt += dt;
  if (b.state === 'sleep') {
    // drumming on the stump, minding his own business
    pose(perchAt(b.ang, H + 8), b.ang + Math.PI, 0.2);
    head.rotation.x = Math.max(0, Math.sin(t * 14)) * 0.5;
    if (Math.hypot(p.x - C.x, p.z - C.z) < 11.5 && p.y > H - 0.5 && p.y < H + 3) { b.state = 'wake'; b.t = 0; head.rotation.x = 0; api.intro(); }
    return;
  }
  if (b.state === 'dead') { head.rotation.z = Math.sin(t * 1.5) * 0.15; return; }
  updateSplinters(dt, p, api);
  updateCones(dt, P, api);
  if (b.state === 'wake') { pose(perchAt(b.ang, H + 8), b.ang); if (!b.hold && b.t > 0.5) { b.state = 'fight'; b.t = 0; b.next = 1; } return; }
  if (b.state === 'hurt') {
    flap(t, 0.6); body.rotation.z = Math.sin(b.t * 20) * 0.2 * Math.max(0, 1 - b.t / 1.4);
    if (Math.random() < dt * 15) puff(bonk.position.clone().add(V3(0, 2, 0)), 1, 0x1a1a24, 2, 1);
    if (b.t > 1.6) {
      body.rotation.z = 0;
      if (b.hits >= HITS) { b.state = 'die'; b.t = 0; sfx.wake(); return; }
      b.state = 'fight'; b.t = 0; b.plan = 0; endMove();
      if (b.hits === 1) { b.phase = 'top'; b.ms = 'fly'; b.mt = 0; b.from = bonk.position.clone(); b.cd = 2; toast('BONK: Haha! Kom maar naar boven… als je kan KLIMMEN!'); }
      else { b.phase = 'deck'; b.from = bonk.position.clone(); b.ms = 'down'; b.mt = 0; }
    }
    return;
  }
  if (b.state === 'die') {
    const k = Math.min(1, b.t / 2.4);
    bonk.position.lerp(BONK_REST, Math.min(1, dt * 2)); bonk.rotation.y = Math.PI / 2; body.rotation.x = 0; flap(t, 1 - k);
    stars.visible = true; stars.position.copy(headAt()).add(V3(0, 0.9, 0)); stars.rotation.y = t * 4;
    if (b.t > 3) { setBossDead(); api.win(BOSS_INFO.cookieAt.clone()); }
    return;
  }

  // ---------- fight: on the platforms ----------
  const ph = b.hits >= 2 ? 1 : 0;
  if (b.phase === 'deck') {
    if (b.ms === 'down') {
      // back down from the top of the stump to his spot on the side
      const k = Math.min(1, b.mt / 1);
      pose(b.from.clone().lerp(perchAt(b.ang, H + 8), k), b.ang); flap(t);
      if (k >= 1) { b.ms = ''; fold(); endMove(); }
      return;
    }
    if (!b.move) {
      b.ang += Math.atan2(Math.sin(toward(p) - b.ang), Math.cos(toward(p) - b.ang)) * Math.min(1, dt * 2);
      pose(perchAt(b.ang, H + 8), b.ang); head.rotation.x = 0;
      b.next -= dt;
      if (b.next <= 0) { const plan = PLANS[ph]; b.move = plan[b.plan++ % plan.length]; b.ms = 'start'; b.mt = 0; }
      return;
    }
    if (b.move === 'pik') {
      const follow = ph ? 0.7 : 0.95;
      if (b.ms === 'start') { b.ms = 'aim'; b.mt = 0; ring.visible = true; b.aim = V3(p.x, H, p.z); sfx.scanTick(true); }
      if (b.ms === 'aim') {
        if (b.mt < follow) b.aim.lerp(V3(p.x, H, p.z), Math.min(1, dt * 8));
        // keep it on the platforms, and off the stump
        const d = Math.hypot(b.aim.x - C.x, b.aim.z - C.z);
        if (d < PR + 1.6) { b.aim.x = C.x + ((b.aim.x - C.x) / (d || 1)) * (PR + 1.6); b.aim.z = C.z + ((b.aim.z - C.z) / (d || 1)) * (PR + 1.6); }
        ring.position.set(b.aim.x, H + 0.06, b.aim.z);
        ringMat.opacity = 0.3 + Math.abs(Math.sin(b.mt * 12)) * 0.4;
        b.ang = toward(b.aim);
        pose(perchAt(b.ang, H + 8 + b.mt * 1.5), b.ang, -0.3);
        if (b.mt > follow + 0.35) { b.ms = 'dive'; b.mt = 0; b.from = bonk.position.clone(); sfx.whir(); }
      } else if (b.ms === 'dive') {
        const k = Math.min(1, b.mt / 0.3), yaw = Math.atan2(b.aim.x - b.from.x, b.aim.z - b.from.z);
        const land = b.aim.clone().add(V3(-Math.sin(yaw) * 2, 0, -Math.cos(yaw) * 2));
        pose(b.from.clone().lerp(land, k), yaw, 1.05 * k);
        if (k >= 1) {
          b.ms = 'stuck'; b.mt = 0; ring.visible = false; api.shake(0.4); sfx.smash();
          puff(b.aim.clone().add(V3(0, 0.3, 0)), 16, 0xd8b080, 4, 1);
          if (Math.hypot(p.x - b.aim.x, p.z - b.aim.z) < 1.6 && p.y < H + 1.6) api.damage(b.aim.clone());
          if (!b.toldStomp) { b.toldStomp = true; toast('Zijn snavel zit vast! Spring op zijn kop!'); }
        }
      } else if (b.ms === 'stuck') {
        // pulling and pulling
        body.rotation.x = 1.05 + Math.sin(b.mt * 18) * 0.06; flap(t, 0.4);
        stars.visible = true; stars.position.copy(headAt()).add(V3(0, 1, 0)); stars.rotation.y = t * 4;
        if (stomped(P)) { hit(api); return; }
        if (b.mt > (ph ? 1.8 : 2.4)) { b.ms = 'back'; b.mt = 0; b.from = bonk.position.clone(); stars.visible = false; sfx.pop(); }
      } else if (b.ms === 'back') {
        const k = Math.min(1, b.mt / 0.8);
        pose(b.from.clone().lerp(perchAt(b.ang, H + 8), k), b.ang, 1.05 * (1 - k)); flap(t);
        if (k >= 1) { fold(); endMove(); }
      }
    } else if (b.move === 'splinter') {
      if (b.ms === 'start') { b.ms = 'drum'; b.mt = 0; b.waves = ph ? 2 : 1; b.tok = 0; }
      pose(perchAt(b.ang, H + 1.2), b.ang + Math.PI, 0.25);
      head.rotation.x = Math.max(0, Math.sin(b.mt * 24)) * 0.6;
      if ((b.tok -= dt) <= 0) { b.tok = 0.15; sfx.clank(); }
      if (b.mt > 1.1 && b.waves > 0) { spray(ph, b.waves * 0.3); b.waves--; b.mt = 0.5; }
      if (b.waves <= 0 && b.mt > 1.4) { head.rotation.x = 0; endMove(); }
    }
    return;
  }

  // ---------- fight: on top of the stump ----------
  const NEST = V3(C.x, PT, C.z);
  if (b.ms === 'fly') {
    const k = Math.min(1, b.mt / 1.2);
    pose(b.from.clone().lerp(NEST, k).add(V3(0, Math.sin(Math.PI * k) * 3, 0)), toward(p)); flap(t);
    if (k >= 1) { b.ms = 'sit'; b.mt = 0; fold(); }
    return;
  }
  const onTop = p.y > PT - 0.4 && P.grounded && Math.hypot(p.x - C.x, p.z - C.z) < PR + 0.5;
  if (b.ms === 'sit') {
    pose(NEST, Math.atan2(p.x - C.x, p.z - C.z) || 0); head.rotation.x = Math.sin(t * 3) * 0.1;
    b.cd -= dt;
    if (b.cd <= 0) {
      b.cd = 1.5;
      const climbing = P.climb && P.climb.c === PILLAR_CLIMB;
      dropCone(climbing ? P.climb.a + (Math.random() - 0.5) * 0.3 : null, P);
    }
    if (onTop) { b.ms = 'fright'; b.mt = 0; sfx.wake(); toast('BONK: W-wat?! Hoe kom jij hier boven?!'); }
    return;
  }
  if (b.ms === 'fright') {
    // dazed on his nest: jump on him!
    pose(NEST.clone().add(V3(0, Math.abs(Math.sin(b.mt * 6)) * 0.3, 0)), b.mt * 2);
    stars.visible = true; stars.position.copy(headAt()).add(V3(0, 1, 0)); stars.rotation.y = t * 4;
    if (stomped(P)) { hit(api); return; }
    if (b.mt > 3.6) {
      // a big flap of his wings blows you off the stump
      b.ms = 'sit'; b.mt = 0; b.cd = 2; stars.visible = false; flap(t);
      if (onTop || Math.hypot(p.x - C.x, p.z - C.z) < PR + 3) {
        const d = V3(p.x - C.x, 0, p.z - C.z); if (d.lengthSq() < 0.01) d.set(1, 0, 0);
        d.setLength(12); P.vel.set(d.x, 8, d.z); P.grounded = false; api.shake(0.3); sfx.whir();
        puff(NEST.clone().add(V3(0, 2, 0)), 20, 0xffffff, 6, 1);
        toast('BONK: WOESJ! Eraf jij! (Spring sneller op hem!)');
      }
    }
  }
  void prevY;
}

function updateSplinters(dt, p, api) {
  for (let i = splinters.length - 1; i >= 0; i--) {
    const s = splinters[i]; if (!s) break;     // a hit can clear the list halfway through
    s.r += s.sp * dt;
    s.m.position.set(C.x + Math.sin(s.a) * s.r, H + 0.4, C.z + Math.cos(s.a) * s.r);
    if (Math.hypot(p.x - s.m.position.x, p.z - s.m.position.z) < 0.7 && p.y < H + 0.85 && p.y > H - 0.5) api.damage(s.m.position.clone());
    if (s.r > 12.5) { scene.remove(s.m); splinters.splice(i, 1); }
  }
}
function updateCones(dt, P, api) {
  const p = P.pos;
  for (let i = cones.length - 1; i >= 0; i--) {
    const c = cones[i]; if (!c) break;
    c.t += dt;
    if (c.kind === 'roll') {
      stripeMat.opacity = 0.25 + Math.abs(Math.sin(c.t * 12)) * 0.35;
      if (c.t < 0.75) continue;
      c.m.visible = true; c.y -= dt * 15;
      c.m.position.set(C.x + Math.sin(c.lane) * (PR + 0.45), c.y, C.z + Math.cos(c.lane) * (PR + 0.45)); c.m.rotation.x += dt * 12;
      if (P.climb && P.climb.c === PILLAR_CLIMB && Math.abs(Math.atan2(Math.sin(P.climb.a - c.lane), Math.cos(P.climb.a - c.lane))) < 0.4 && Math.abs(p.y + 0.8 - c.y) < 1) {
        api.damage(c.m.position.clone()); c.y = H - 1;
      }
      if (c.y < H) { puff(c.m.position.clone(), 8, 0x8a5a2a, 3, 1); scene.remove(c.m); scene.remove(c.mark); cones.splice(i, 1); }
    } else {
      c.mark.material.opacity = 0.3 + Math.abs(Math.sin(c.t * 12)) * 0.4;
      if (c.t < 0.9) continue;
      c.y -= dt * 22; c.m.position.y = c.y;
      if (c.y <= H + 0.45) {
        puff(c.at.clone().add(V3(0, 0.4, 0)), 10, 0x8a5a2a, 3, 1); sfx.land();
        if (Math.hypot(p.x - c.at.x, p.z - c.at.z) < 1.5 && p.y < H + 1.6) api.damage(c.at.clone());
        scene.remove(c.m); scene.remove(c.mark); cones.splice(i, 1);
      }
    }
  }
}
