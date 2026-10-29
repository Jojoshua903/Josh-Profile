import { THREE, scene, toon, V3, damp, puff, toast } from './core.js?v=sub1';
import * as sfx from './sfx.js?v=sub1';
import { ARENA, MAGMA_Y } from './zon-terrain.js?v=sub1';

// De Zonnevlam-slang. Kayo & Yara's pet: a long snake of plasma that lives in the magma round De Kroon.
// Its spiral eyes and the purple gem on its head are what hypnotise the chinchillas.
//   boog    – leaps out of the magma on one side and dives back in on the other. A red strip shows the line
//             it will follow: stay away from both ends, it's low there.
//   spuug   – rears up at the edge like a cobra and spits fireballs that leave burning puddles.
//   beet    – rears up, locks onto you (red circle) and bites into the floor. A shock wave rolls out (jump),
//             and its head is STUCK for a moment: jump on it and ground-pound the gem. That's the only way to hurt it.
// Six hits, in three phases of two. It gets faster each phase, does two leaps in a row, and spits more.
const C = V3(ARENA.x, 0, ARENA.z);
const H = 0;
const HITS = 6;
const EDGE = ARENA.r + 2.4;          // it comes up out of the magma just outside the crown
export const boss = { state: 'sleep', t: 0, hits: 0, plan: 0, move: null, ms: '', mt: 0, next: 1.5 };
export const BOSS_INFO = {
  name: 'De Zonnevlam-slang', sub: 'Het huisdier van Kayo & Yara',
  winTitle: 'De chinchillas zijn vrij!', winSub: 'De slang zakt weg in het magma. Geen draai-ogen meer.',
  fail: 'Au! De Zonnevlam-slang was te sterk. Nog een keer!',
  cookie: 'De Zonnevlam-slang verslagen', cookieY: 1.3, cookieAt: V3(C.x, 1.3, C.z),
  arena: { x: C.x, y: 0, z: C.z, r: ARENA.r },
};

// ---------- the snake ----------
const N = 18, SP = 1.25;
const plasma = new THREE.MeshBasicMaterial({ color: 0xffa020 });
const plasmaHot = new THREE.MeshBasicMaterial({ color: 0xffe060 });
const crust = toon(0x4a3030);
const segGeo = new THREE.SphereGeometry(1, 16, 12);
const segs = [];
for (let i = 0; i < N; i++) {
  const r = 1.15 - (i / N) * 0.65;
  const m = new THREE.Mesh(segGeo, i % 3 === 1 ? plasmaHot : plasma); m.scale.setScalar(r); m.castShadow = true; scene.add(m);
  // little flames along the back
  if (i % 2 === 0 && i < N - 2) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.9, 6), plasmaHot); f.position.y = 0.9; m.add(f); }
  segs.push({ m, r, at: V3(0, -8, 0) });
}
const head = new THREE.Group(); scene.add(head);
{
  const skull = new THREE.Mesh(new THREE.SphereGeometry(1.35, 20, 16), plasma); skull.scale.set(1, 0.8, 1.25); head.add(skull);
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(1.1, 16, 12), plasmaHot); jaw.scale.set(0.9, 0.45, 1.2); jaw.position.set(0, -0.45, 0.25); head.add(jaw);
  // the spiral eyes
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 64); g.strokeStyle = '#9b3bff'; g.lineWidth = 5; g.beginPath();
  for (let a = 0; a < Math.PI * 7; a += 0.1) { const r = a * 1.35; g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); }
  g.stroke();
  const eyeMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c) });
  head.eyes = [-1, 1].map((s) => { const e = new THREE.Mesh(new THREE.CircleGeometry(0.34, 20), eyeMat); e.position.set(0.62 * s, 0.25, 1.3); e.rotation.y = 0.45 * s; head.add(e); return e; });
  // flame crown
  for (let i = 0; i < 5; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.1, 6), plasmaHot); f.position.set((i - 2) * 0.38, 1.05 - Math.abs(i - 2) * 0.15, -0.5); f.rotation.x = -0.4; head.add(f); }
  // the hypno gem on top of its head: ground-pound this
  head.gemMat = new THREE.MeshBasicMaterial({ color: 0x9b3bff });
  head.gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), head.gemMat); head.gem.position.set(0, 1.05, 0.2); head.add(head.gem);
  head.light = new THREE.PointLight(0xffa040, 8, 16, 1.6); head.add(head.light);
}
const HEAD_R = 1.3;
// the body follows the head along its own trail
const trail = [];
function pushTrail() {
  if (!trail.length || trail[0].distanceTo(head.position) > 0.2) trail.unshift(head.position.clone());
  if (trail.length > N * SP * 6) trail.length = Math.floor(N * SP * 6);
}
function placeBody(cooled) {
  let i = 0, need = SP, acc = 0;
  for (let k = 1; k < trail.length && i < N; k++) {
    const a = trail[k - 1], b = trail[k], L = a.distanceTo(b);
    while (acc + L >= need && i < N) {
      segs[i].at.lerpVectors(a, b, (need - acc) / L);
      i++; need += SP;
    }
    acc += L;
  }
  for (; i < N; i++) segs[i].at.copy(trail.length ? trail[trail.length - 1] : head.position).y -= 0.01 * i;
  segs.forEach((s, j) => { s.m.position.copy(s.at); s.m.material = cooled ? crust : j % 3 === 1 ? plasmaHot : plasma; });
}
function resetTrail(p) { trail.length = 0; for (let i = 0; i < 6; i++) trail.push(p.clone().add(V3(0, -i * 0.4, 0))); }
const edgePt = (a, y = MAGMA_Y - 4, d = EDGE) => V3(C.x + Math.cos(a) * d, y, C.z + Math.sin(a) * d);
const angleTo = (p) => Math.atan2(p.z - C.z, p.x - C.x);
function lookAlong(dir) { if (dir.lengthSq() > 1e-4) head.lookAt(head.position.clone().add(dir)); }

// ---------- hazards ----------
const markGeo = new THREE.RingGeometry(1.0, 1.3, 28), markFill = new THREE.CircleGeometry(1.0, 28);
const mark = (color, x, z, s = 1) => {
  const g = new THREE.Group(); g.position.set(x, H + 0.05, z); g.scale.setScalar(s); scene.add(g);
  const ring = new THREE.Mesh(markGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false })); ring.rotation.x = -Math.PI / 2; g.add(ring);
  const fill = new THREE.Mesh(markFill, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.25, depthWrite: false })); fill.rotation.x = -Math.PI / 2; g.add(fill);
  return { g, ring, fill };
};
// the line a leap will follow
const stripMat = new THREE.MeshBasicMaterial({ color: 0xff3a6a, transparent: true, opacity: 0.6, depthWrite: false });
function strip(a0, a1) {
  const A = edgePt(a0, H, ARENA.r), B = edgePt(a1, H, ARENA.r), d = B.clone().sub(A);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, d.length()), stripMat.clone());
  m.rotation.x = -Math.PI / 2; m.rotation.z = Math.atan2(-d.x, -d.z); m.position.copy(A).addScaledVector(d, 0.5).setY(H + 0.06); scene.add(m);
  return m;
}
const WAVE_H = 0.6, WAVE_W = 0.35;
const ringGeo = new THREE.CylinderGeometry(1, 1, WAVE_H, 48, 1, true);
// warnings are cool colours (cyan, white, pink) so they don't vanish against fire and magma
const ringMat = new THREE.MeshBasicMaterial({ color: 0x5ff0ff, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false });
const rings = [], balls = [], puddles = [];
function shockwave(at) { const m = new THREE.Mesh(ringGeo, ringMat.clone()); m.position.set(at.x, H + WAVE_H / 2, at.z); scene.add(m); rings.push({ m, r: 1.5, hit: false }); }
const ballGeo = new THREE.SphereGeometry(0.5, 12, 10);
function spit(from, to) {
  const m = new THREE.Mesh(ballGeo, plasmaHot); m.position.copy(from); scene.add(m);
  const mk0 = mark(0xff4ab0, to.x, to.z, 1.2);
  balls.push({ m, from: from.clone(), to: to.clone(), t: 0, dur: 1.1, mk: mk0 });
}
function puddle(at) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(1.3, 20), new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.85, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(at.x, H + 0.04, at.z); scene.add(m);
  puddles.push({ m, t: 0, at: at.clone() });
}
let target = null, leapStrip = null;
function clearHazards() {
  rings.forEach((r) => scene.remove(r.m)); rings.length = 0;
  balls.forEach((b) => { scene.remove(b.m); scene.remove(b.mk.g); }); balls.length = 0;
  puddles.forEach((p) => scene.remove(p.m)); puddles.length = 0;
  if (target) { scene.remove(target.g); target = null; }
  if (leapStrip) { scene.remove(leapStrip); leapStrip = null; }
}

// ---------- reset / dead ----------
function hide() { head.position.copy(edgePt(-Math.PI / 2, MAGMA_Y - 6)); resetTrail(head.position); placeBody(false); }
export function resetBoss() {
  clearHazards();
  Object.assign(boss, { state: 'sleep', t: 0, hits: 0, plan: 0, move: null, ms: '', mt: 0, next: 1.5, stoneT: 0, hinted: false, crumbled: false, angle: undefined, hold: false });
  head.visible = true; segs.forEach((s) => (s.m.visible = true)); head.gemMat.color.setHex(0x9b3bff);
  hide();
}
export const bossActive = () => !['sleep', 'dead'].includes(boss.state);
export function setBossDead() {
  boss.state = 'dead'; clearHazards();
  head.visible = false; segs.forEach((s) => (s.m.visible = false));
}
hide();

// ---------- the fight ----------
const phase = () => Math.min(2, Math.floor(boss.hits / 2));
const PLANS = [['spuug', 'beet', 'boog', 'beet'], ['boog', 'spuug', 'beet', 'boog2', 'beet'], ['boog2', 'spuug', 'beet', 'boog', 'spuug', 'beet']];
const speed = () => 1 + boss.hits * 0.09;
const LINES = ['SSSSSSS! *het juweel knettert*', 'SSS… *de slang schudt zijn kop*', 'KAYO! YARA! *sist de slang, maar niemand komt*', 'SSSSS! *het juweel heeft een barst*', 'SSS… *de draai-ogen draaien steeds langzamer*', 'sss…'];
function startMove(p) {
  const plan = PLANS[phase()];
  boss.move = plan[boss.plan++ % plan.length]; boss.mt = 0; boss.ms = 'start';
}
function endMove() { boss.move = null; boss.ms = ''; boss.next = phase() === 2 ? 0.5 : phase() ? 0.8 : 1.1; }

// api: { intro(), damage(from), bounce(vy), shake(s), win(pos) }
export function updateBoss(dt, t, P, prevY, api) {
  const b = boss;
  b.t += dt; b.mt += dt;
  const p = P.pos;
  const dist = Math.hypot(p.x - C.x, p.z - C.z);
  head.eyes.forEach((e, i) => (e.rotation.z = t * (i ? 4 : -4)));
  head.gem.rotation.y = t * 2;

  if (b.state === 'sleep') {
    if (Math.random() < dt * 2) puff(edgePt(Math.random() * 6.28, MAGMA_Y + 0.2), 2, 0xffd040, 2, 2);
    if (dist < ARENA.r - 1 && p.y > -0.5) { b.state = 'wake'; b.t = 0; b.rise = 0; api.intro(); }
    return;
  }
  if (b.state === 'dead') return;
  const hurtBody = (cooled) => {
    if (cooled) return;
    const pc = p.clone().add(V3(0, 0.8, 0));
    if (pc.distanceTo(head.position) < HEAD_R + 0.5) { api.damage(head.position.clone()); return; }
    for (const s of segs) if (s.at.y > MAGMA_Y - 0.5 && pc.distanceTo(s.at) < s.r + 0.45) { api.damage(s.at.clone()); return; }
  };

  if (b.state === 'wake') {
    // it rises at the north edge and stares at you; the story's cutscene holds it here
    const a = -Math.PI / 2 + 0.01, base = edgePt(a, MAGMA_Y - 4);
    b.rise = Math.min(1, b.rise + dt / 2);
    const k = b.rise * b.rise * (3 - 2 * b.rise);
    head.position.lerpVectors(base, edgePt(a, 6, EDGE - 1.5), k);
    lookAlong(V3(p.x - head.position.x, -1, p.z - head.position.z));
    pushTrail(); placeBody(false);
    if (Math.random() < 0.3) puff(edgePt(a, MAGMA_Y + 0.2), 2, 0xffd040, 3, 2);
    if (b.rise >= 1 && !b.hold && b.t > 2) { b.state = 'fight'; b.t = 0; b.next = 0.6; b.move = 'sink'; b.ms = 'go'; b.mt = 0; }
    return;
  }

  if (b.state === 'hurt') {
    // shakes its head, the gem flickers, then pulls back into the magma
    head.position.x += Math.sin(t * 40) * 0.05;
    head.gemMat.color.setHex(Math.sin(t * 30) > 0 ? 0xffffff : 0x9b3bff);
    if (b.t > 1.3) {
      head.position.lerp(edgePt(b.angle, MAGMA_Y - 5), damp(3, dt)); pushTrail(); placeBody(false);
      if (head.position.y < MAGMA_Y - 3) {
        head.gemMat.color.setHex(0x9b3bff);
        if (b.hits >= HITS) { b.state = 'die'; b.t = 0; b.stoneT = 0; sfx.wake(); }
        else { b.state = 'fight'; b.t = 0; endMove(); b.next = 1; if (b.hits === 2) toast('De slang wordt boos! Hij springt nu soms twee keer achter elkaar.'); if (b.hits === 4) toast('De slang is WOEDEND! Laatste ronde!'); }
      }
    } else placeBody(true);
    return;
  }
  if (b.state === 'die') {
    // it rises one last time, cools to stone from the tail up, and crumbles into the magma
    const a = b.angle ?? -Math.PI / 2;
    head.position.lerp(edgePt(a, 5, EDGE - 2), damp(2, dt)); pushTrail();
    b.stoneT += dt;
    placeBody(false);
    const n = Math.floor((b.stoneT / 2) * N);
    segs.forEach((s, i) => { if (N - 1 - i < n) s.m.material = crust; });
    if (b.stoneT > 2) {
      head.children[0].material = crust;
      if (!b.crumbled) { b.crumbled = true; puff(head.position.clone(), 40, 0x9b3bff, 8, 2); sfx.smash(); api.shake(0.8); head.gem.visible = false; }
      head.position.y -= dt * 3; segs.forEach((s) => (s.m.position.y -= dt * 3));
    }
    if (b.stoneT > 4) {
      head.children[0].material = plasma; head.gem.visible = true;
      setBossDead(); api.win(C.clone());
    }
    return;
  }

  // ---------- fight ----------
  const ph = phase(), sp = speed();
  if (!b.move) {
    b.next -= dt;
    // under the magma: a glowing wake circles round the crown
    b.prowl = (b.prowl ?? 0) + dt * 0.6;
    head.position.copy(edgePt(b.prowl, MAGMA_Y - 2.5)); pushTrail(); placeBody(false);
    if (Math.random() < dt * 8) puff(edgePt(b.prowl, MAGMA_Y + 0.2), 1, 0xffd040, 2, 2);
    if (b.next <= 0) startMove(p);
  } else if (b.move === 'sink') {
    head.position.y -= dt * 6; pushTrail(); placeBody(false);
    if (head.position.y < MAGMA_Y - 3) endMove();
  } else if (b.move === 'boog' || b.move === 'boog2') {
    // a leap over the crown, roughly through where you are
    if (b.ms === 'start') {
      const ap = angleTo(p) + (dist < 3 ? Math.random() * 6 : 0);
      b.a0 = ap + Math.PI + (Math.random() - 0.5) * 0.5; b.a1 = b.a0 + Math.PI + (Math.random() - 0.5) * 0.6;
      if (leapStrip) scene.remove(leapStrip);
      leapStrip = strip(b.a0, b.a1);
      b.ms = 'warn'; b.mt = 0; b.left = b.move === 'boog2' ? 2 : 1;
      head.position.copy(edgePt(b.a0)); resetTrail(head.position);
      sfx.scanStart();
    } else if (b.ms === 'warn') {
      leapStrip.material.opacity = 0.35 + Math.sin(t * 16) * 0.25;
      if (Math.random() < 0.6) puff(edgePt(b.a0, MAGMA_Y + 0.2), 2, 0xffd040, 3, 3);
      if (b.mt > 1.1 / sp) { b.ms = 'leap'; b.mt = 0; sfx.jump(3); }
    } else if (b.ms === 'leap') {
      const dur = 2.2 / sp, s = b.mt / dur;
      const A = edgePt(b.a0, 0), B = edgePt(b.a1, 0);
      const k = Math.min(1.6, s);
      const prev = head.position.clone();
      head.position.lerpVectors(A, B, k);
      head.position.y = k <= 1 ? MAGMA_Y - 4 + (3.6 - MAGMA_Y + 4) * Math.sin(Math.PI * k) : MAGMA_Y - 4 - (k - 1) * 12;
      lookAlong(head.position.clone().sub(prev));
      pushTrail(); placeBody(false); hurtBody(false);
      if (Math.abs(k - 0.06) < 0.02 || Math.abs(k - 0.94) < 0.02) puff(head.position.clone(), 8, 0xffd040, 4, 2);
      if (s > 1.6) {
        if (--b.left > 0) {
          b.a0 = b.a1 + (Math.random() - 0.5) * 0.4; b.a1 = angleTo(p) + (Math.random() - 0.5) * 0.4;
          b.a1 = b.a0 + Math.PI * 0.75 * (Math.random() < 0.5 ? 1 : -1);
          if (leapStrip) scene.remove(leapStrip);
          leapStrip = strip(b.a0, b.a1); b.ms = 'warn'; b.mt = 0.4 / sp;
          head.position.copy(edgePt(b.a0)); resetTrail(head.position);
        } else { if (leapStrip) { scene.remove(leapStrip); leapStrip = null; } endMove(); }
      }
    }
  } else if (b.move === 'spuug' || b.move === 'beet') {
    // rise up at the edge, on your side, like a cobra
    if (b.ms === 'start') {
      b.angle = angleTo(p) + (Math.random() - 0.5) * 0.8;
      head.position.copy(edgePt(b.angle)); resetTrail(head.position);
      b.ms = 'rise'; b.mt = 0; sfx.wake();
    } else if (b.ms === 'rise') {
      const k = Math.min(1, b.mt / (0.8 / sp)), e = k * k * (3 - 2 * k);
      head.position.lerpVectors(edgePt(b.angle), edgePt(b.angle, 5.5, EDGE - 1), e);
      lookAlong(V3(p.x - head.position.x, -1.5, p.z - head.position.z));
      pushTrail(); placeBody(false); hurtBody(false);
      if (Math.random() < 0.4) puff(edgePt(b.angle, MAGMA_Y + 0.2), 2, 0xffd040, 3, 2);
      if (k >= 1) { b.ms = b.move === 'spuug' ? 'spit' : 'aim'; b.mt = 0; b.shots = 0; }
    } else if (b.ms === 'spit') {
      const sway = Math.sin(t * 3) * 0.6;
      head.position.copy(edgePt(b.angle + sway * 0.05, 5.5 + Math.sin(t * 5) * 0.3, EDGE - 1));
      lookAlong(V3(p.x - head.position.x, -1.5, p.z - head.position.z));
      pushTrail(); placeBody(false); hurtBody(false);
      const total = 3 + ph * 2, gap = 0.55 / sp;
      if (b.mt > 0.4 + b.shots * gap && b.shots < total) {
        b.shots++;
        // the first goes where you are, the others where you're going and around you
        const lead = b.shots === 1 ? 0 : 0.5, spread = b.shots === 1 ? 0 : 2.2;
        const to = V3(p.x + P.vel.x * lead + (Math.random() - 0.5) * spread, H, p.z + P.vel.z * lead + (Math.random() - 0.5) * spread);
        const d = V3(to.x - C.x, 0, to.z - C.z); if (d.length() > ARENA.r - 1) d.setLength(ARENA.r - 1);
        spit(head.position.clone().add(V3(0, -0.3, 0)), V3(C.x + d.x, H, C.z + d.z)); sfx.longJump();
      }
      if (b.shots >= total && b.mt > 0.4 + total * gap + 0.6) { b.ms = 'down'; b.mt = 0; }
    } else if (b.ms === 'aim') {
      // a red circle follows you; when it locks (turns white), it bites
      if (!target) target = mark(0xff3a3a, p.x, p.z, 1.6);
      const lockAt = 1.4 / sp;
      if (b.mt < lockAt) { target.g.position.x += (p.x - target.g.position.x) * damp(5, dt); target.g.position.z += (p.z - target.g.position.z) * damp(5, dt); }
      const locked = b.mt >= lockAt;
      target.ring.material.color.setHex(locked ? 0xffffff : 0xff3a3a);
      target.ring.material.opacity = locked ? 1 : 0.6 + Math.sin(t * 14) * 0.3;
      head.position.copy(edgePt(b.angle, 5.5 + (locked ? 1.2 : 0) + Math.sin(t * 6) * 0.2, EDGE - 1 + (locked ? 0.8 : 0)));
      lookAlong(V3(target.g.position.x - head.position.x, -2, target.g.position.z - head.position.z));
      pushTrail(); placeBody(false); hurtBody(false);
      if (b.mt > lockAt + 0.35) { b.ms = 'lunge'; b.mt = 0; b.from = head.position.clone(); b.to = V3(target.g.position.x, H + 1.0, target.g.position.z); sfx.jump(3); }
    } else if (b.ms === 'lunge') {
      const k = Math.min(1, b.mt / 0.32);
      head.position.lerpVectors(b.from, b.to, k); head.position.y += Math.sin(k * Math.PI) * 1.2;
      lookAlong(b.to.clone().sub(b.from).setY(0));
      pushTrail(); placeBody(false); hurtBody(false);
      if (k >= 1) {
        b.ms = 'stuck'; b.mt = 0;
        if (target) { scene.remove(target.g); target = null; }
        shockwave(b.to); puff(b.to.clone(), 30, 0xffd040, 8, 1); sfx.smash(); api.shake(0.7);
        if (!b.hinted) { b.hinted = true; toast('Zijn kop zit vast! Spring erop en doe een ground pound op het juweel!'); }
      }
    } else if (b.ms === 'stuck') {
      // its body cools to crust on the floor (safe); the gem glows. Pound it!
      placeBody(true);
      head.position.y = H + 1.0 + Math.sin(t * 20) * 0.03;
      head.gemMat.color.setHex(Math.sin(t * 10) > 0 ? 0xd07aff : 0x9b3bff);
      const top = head.position.y + 1.05;
      const over = Math.hypot(p.x - head.position.x, p.z - head.position.z) < 1.6;
      if (over && P.vel.y <= 0 && p.y > top - 0.6 && p.y < top + 0.8) {
        if (P.pound) {
          b.hits++; b.state = 'hurt'; b.t = 0; clearHazards();
          api.bounce(15); puff(head.gem.getWorldPosition(V3()), 30, 0xd07aff, 7, 2); sfx.bossHit(); api.shake(0.6);
          toast(LINES[(b.hits - 1) % LINES.length]);
          return;
        }
        api.bounce(10);
        if (!b.bounceHint) { b.bounceHint = true; toast('Boing! Druk in de lucht op Shift voor een ground pound.'); }
      }
      if (b.mt > (ph === 2 ? 2.4 : ph ? 2.9 : 3.4)) { b.ms = 'down'; b.mt = 0; }
    } else if (b.ms === 'down') {
      head.position.lerp(edgePt(b.angle, MAGMA_Y - 5), damp(3.5, dt)); pushTrail(); placeBody(false); hurtBody(false);
      if (head.position.y < MAGMA_Y - 3) endMove();
    }
  }

  // ---------- hazards over time ----------
  for (let i = rings.length - 1; i >= 0; i--) {
    const r = rings[i]; if (!r) continue;
    r.r += dt * 6;
    r.m.scale.set(r.r, 1, r.r); r.m.material.opacity = 0.9 * Math.min(1, (18 - r.r) / 1.5);
    const dr = Math.hypot(p.x - r.m.position.x, p.z - r.m.position.z);
    if (!r.hit && Math.abs(dr - r.r) < WAVE_W && p.y < H + WAVE_H - 0.1) { r.hit = true; api.damage(r.m.position); }
    if (r.r > 18) { scene.remove(r.m); rings.splice(i, 1); }
  }
  for (let i = balls.length - 1; i >= 0; i--) {
    const f = balls[i]; if (!f) continue;
    f.t += dt;
    const k = Math.min(1, f.t / f.dur);
    f.m.position.lerpVectors(f.from, f.to, k); f.m.position.y += Math.sin(k * Math.PI) * 5;
    f.mk.ring.material.opacity = 0.5 + Math.sin(t * 18) * 0.3;
    if (Math.random() < 0.5) puff(f.m.position.clone(), 1, 0xffd040, 1, 1);
    if (k >= 1) {
      scene.remove(f.m); scene.remove(f.mk.g); balls.splice(i, 1);
      puff(f.to.clone().add(V3(0, 0.3, 0)), 12, 0xffa040, 5, 1); sfx.clank();
      if (Math.hypot(p.x - f.to.x, p.z - f.to.z) < 1.3 && p.y < H + 1.6) api.damage(f.to);
      puddle(f.to);
    }
  }
  for (let i = puddles.length - 1; i >= 0; i--) {
    const q = puddles[i]; if (!q) continue;
    q.t += dt;
    q.m.material.opacity = 0.85 * Math.min(1, (2.8 - q.t) / 0.5);
    if (Math.random() < dt * 6) puff(q.at.clone().add(V3((Math.random() - 0.5) * 2, 0.1, (Math.random() - 0.5) * 2)), 1, 0xffd040, 1, 1.5);
    if (q.t > 0.2 && Math.hypot(p.x - q.at.x, p.z - q.at.z) < 1.2 && p.y < H + 0.15 && P.grounded) api.damage(q.at);
    if (q.t > 2.8) { scene.remove(q.m); puddles.splice(i, 1); }
  }
}
