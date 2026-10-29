import { THREE, scene, toon, addOutline, V3, puff, toast } from './core.js?v=sub1';
import { addCookie } from './cookies.js?v=sub1';
import { addSpeaker } from './bubbles.js?v=sub1';
import { getSave } from './save.js?v=sub1';
import * as sfx from './sfx.js?v=sub1';
import { groundAt, ISLANDS } from './wolk-terrain.js?v=sub1';
import { PEN, NEST, SEED, BROM_HOME, BAD, HIGHEST, THERMALS, DOME, dome, breakDome } from './wolk-world.js?v=sub1';
import { boxes, movers, solid, block } from './wolk-kit.js?v=sub1';

// The challenges behind the cosmic cookies on the Wolkeneilanden:
//   wolkenschapen – three cloud sheep on the Schapenwei. Get them into the pen. Walking into them nudges them;
//                   a Wervelwind blows them far. Blown off the island? They float back (they're clouds).
//   ooievaarsei   – the stork's egg rolled down onto the Molenheuvel. Carry it up to the nest on the rock.
//                   Fall too far with it and it cracks… (it's fine: it rolls back. Try again.)
//   de bonenstaak – a giant bean in the Bonenveld. A normal stamp doesn't wake it. A METEOOR does.
//   Brom          – a grumpy thundercloud over the Bonenveld who zaps everyone. Climb on him and
//                   Meteoor-stamp him three times: he rains himself empty.
//   het Wolkenbad – dive from high up and ground-pound into the bullseye on the softest cloud.
// Plus two cookies that are just hard to reach: on the highest cloud, and on the farthest one (Knoop's cannon).
const { save, persist } = getSave('wolk');
save.trials = save.trials || {};
const done = (k) => !!save.trials[k];
function finish(k) { save.trials[k] = true; persist(); }
export const TRIAL_RARE = 7;
const NAMES = { schaap: 'Alle wolkenschapen in de kooi', ei: 'Het ei is terug', bonen: 'Top van de bonenstaak', brom: 'Brom is leeggeregend', bad: 'Midden in de roos', thermiek: 'Op de warme wind', ijs: 'Uit het ijs' };
let ctx = null;
export function setTrialCtx(c) { ctx = c; }
const mk = (geo, mat, x, y, z, parent, ol = 1.06) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; if (ol) addOutline(m, ol); parent.add(m); return m; };
const ink = new THREE.MeshBasicMaterial({ color: 0x1a1030 });

addCookie(HIGHEST.x, HIGHEST.y + 1.2, HIGHEST.z, 'Het hoogste wolkje');
addCookie(ISLANDS.ver[0] - 1, ISLANDS.ver[3] + 1.2, ISLANDS.ver[1] - 1, 'Het verste wolkje');

// ---------- 1. cloud sheep ----------
const WEI = ISLANDS.wei;
const SHEEP_START = [[-34, 27], [-30, 33.5], [-36.5, 23]];
const sheep = SHEEP_START.map(([x, z], i) => {
  const g = new THREE.Group(); g.position.set(x, WEI[3], z); scene.add(g);
  const wool = toon(0xffffff);
  for (let k = 0; k < 6; k++) mk(new THREE.SphereGeometry(0.38, 10, 8), wool, (k % 3 - 1) * 0.35, 0.65 + (k > 2 ? 0.2 : 0), (k > 2 ? -0.2 : 0.15), g, 1.04);
  const head = mk(new THREE.SphereGeometry(0.24, 10, 8), toon(0x3a3a4a), 0, 0.7, 0.6, g);
  for (const s of [-1, 1]) { mk(new THREE.SphereGeometry(0.05, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }), 0.09 * s, 0.76, 0.8, g, 0); mk(new THREE.CapsuleGeometry(0.05, 0.25, 3, 6), toon(0x3a3a4a), 0.2 * s, 0.2, 0.2, g, 0); mk(new THREE.CapsuleGeometry(0.05, 0.25, 3, 6), toon(0x3a3a4a), 0.2 * s, 0.2, -0.3, g, 0); }
  void head;
  return { g, v: V3(), home: V3(x, WEI[3], z), state: done('schaap') ? 'pen' : 'roam', t: i * 2, goal: null, lost: 0 };
});
if (done('schaap')) sheep.forEach((s, i) => s.g.position.set(PEN.x + (i - 1) * 0.9, PEN.y, PEN.z + (i % 2) * 0.6));
sheep.forEach((s) => addSpeaker(s.g, { y: 1.5, radius: 3, linger: 6, lines: () => (s.state === 'pen' ? ['Mèèè. (tevreden)'] : ['Mèèè?', 'Mèèè! (het schaap kijkt naar de kooi, en dan weer naar jou)']) }));
function sheepReward() { addCookie(PEN.x, PEN.y + 1.6, PEN.z, NAMES.schaap); }
function updateSheep(dt, t, P) {
  const p = P.pos;
  for (const s of sheep) {
    const g = s.g.position;
    if (s.state === 'pen') { g.x = PEN.x + Math.cos(t * 0.3 + s.t) * 1.2; g.z = PEN.z + Math.sin(t * 0.3 + s.t) * 1.2; s.g.rotation.y = t * 0.3 + s.t + Math.PI; continue; }
    if (s.state === 'lost') {
      // a sheep that blew off the island floats back to the meadow like a little cloud
      s.lost += dt; g.lerp(V3(s.home.x, s.home.y + 3, s.home.z), Math.min(1, dt * 1.2));
      if (s.lost > 2.5) { g.copy(s.home); s.state = 'roam'; s.v.set(0, 0, 0); puff(g.clone().add(V3(0, 0.6, 0)), 10, 0xffffff, 2, 1); }
      continue;
    }
    // wander a bit
    s.t -= dt;
    if (s.t <= 0) { s.t = 2 + Math.random() * 3; s.goal = V3(WEI[0] + (Math.random() - 0.5) * 10, WEI[3], WEI[1] + (Math.random() - 0.5) * 10); }
    if (s.goal && s.v.lengthSq() < 1) { const d = s.goal.clone().sub(g).setY(0); if (d.length() > 0.3) { g.addScaledVector(d.normalize(), dt * 0.8); s.g.rotation.y = Math.atan2(d.x, d.z); } }
    // Josh walking into it nudges it along
    const dx = g.x - p.x, dz = g.z - p.z, L = Math.hypot(dx, dz);
    if (L < 1.1 && Math.abs(p.y - g.y) < 1.2) { s.v.x += (dx / (L || 1)) * 14 * dt; s.v.z += (dz / (L || 1)) * 14 * dt; }
    g.x += s.v.x * dt; g.z += s.v.z * dt;
    s.v.multiplyScalar(Math.max(0, 1 - dt * 2.5));
    if (s.v.lengthSq() > 0.5) s.g.rotation.y = Math.atan2(s.v.x, s.v.z);
    const gy = groundAt(g.x, g.z, 0);
    if (gy < WEI[3] - 0.5) { s.state = 'lost'; s.lost = 0; toast('Mèèè! Het schaap waait van het eiland… en drijft weer terug.'); continue; }
    g.y = gy;
    if (Math.hypot(g.x - PEN.x, g.z - PEN.z) < 2.2) {
      s.state = 'pen'; s.t = Math.random() * 6; sfx.pop(); puff(g.clone().add(V3(0, 0.8, 0)), 12, 0xffffff, 3, 1);
      const left = sheep.filter((q) => q.state !== 'pen').length;
      if (left) toast(`Een schaap in de kooi! Nog ${left}.`);
      else if (!done('schaap')) { finish('schaap'); sfx.cosmic(); toast('Alle wolkenschapen in de kooi!'); sheepReward(); }
    }
  }
}
function blowSheep(at) {
  for (const s of sheep) {
    if (s.state !== 'roam') continue;
    const d = s.g.position.clone().sub(at).setY(0), L = d.length();
    if (L < 6) { s.v.add(d.setLength(Math.max(5, 13 - L))); puff(s.g.position.clone().add(V3(0, 0.6, 0)), 6, 0xe8e0ff, 2, 0.5); }
  }
}

// ---------- 2. the stork's egg ----------
const EGG_HOME = V3(24, ISLANDS.molen[3], 20.5);
const egg = new THREE.Group(); scene.add(egg);
mk(new THREE.SphereGeometry(0.3, 14, 10), toon(0xf8f4e8), 0, 0.36, 0, egg).scale.set(1, 1.25, 1);
for (let i = 0; i < 4; i++) mk(new THREE.SphereGeometry(0.05, 6, 4), toon(0xc8b8a0), (Math.random() - 0.5) * 0.3, 0.3 + Math.random() * 0.3, 0.27, egg, 0);
const straw = new THREE.Group(); straw.position.copy(EGG_HOME); scene.add(straw);
for (let i = 0; i < 8; i++) { const s = mk(new THREE.CylinderGeometry(0.03, 0.03, 0.8), toon(0xc8a060), Math.cos(i) * 0.3, 0.05, Math.sin(i) * 0.3, straw, 0); s.rotation.set(Math.PI / 2, i, 0); }
const chick = new THREE.Group(); chick.visible = false; scene.add(chick);
mk(new THREE.SphereGeometry(0.22, 10, 8), toon(0xfff0a0), 0, 0.3, 0, chick);
mk(new THREE.ConeGeometry(0.05, 0.12, 6), toon(0xff7a3a), 0, 0.32, 0.22, chick, 0).rotation.x = Math.PI / 2;
const E = { state: done('ei') ? 'done' : 'home', peak: 0, wasGrounded: true, hatch: 0 };
addSpeaker(straw, { y: 1.2, radius: 4, linger: 8, cond: () => E.state === 'home', lines: ['(Een ei. Het is van de ooievaar, helemaal boven op de rots.)', '(Pak het op en breng het naar het nest. Niet te diep vallen!)'] });
function eggReward() { addCookie(NEST.x + 1.6, NEST.y + 1.4, NEST.z + 1.2, NAMES.ei); }
function updateEgg(dt, t, P) {
  const p = P.pos;
  if (E.state === 'done') {
    egg.visible = false; chick.visible = true; chick.position.copy(NEST).add(V3(0.3, 0.25, 0.2)); chick.rotation.y = Math.sin(t * 2) * 0.6;
    return;
  }
  if (E.state === 'home') {
    egg.position.copy(EGG_HOME).add(V3(0, 0.05, 0)); egg.rotation.z = Math.sin(t * 2) * 0.05;
    if (p.distanceTo(egg.position) < 1.2 && !ctx.hideJosh) { E.state = 'carry'; E.peak = p.y; E.wasGrounded = P.grounded; sfx.click(); toast('Je draagt het ei. Breng het naar het nest op de Ooievaarsrots. Niet te diep vallen!'); }
    return;
  }
  // carrying: the egg sits on Josh's head
  egg.position.copy(p).add(V3(0, 1.75, 0)); egg.rotation.z = Math.sin(t * 6) * 0.1;
  if (!P.grounded) E.peak = Math.max(E.peak, p.y);
  if (P.grounded && !E.wasGrounded) {
    if (E.peak - p.y > 9) { crack('Krak! Te diep gevallen… het ei rolt terug naar het stro (het is een stevig ei).'); return; }
  }
  if (P.grounded) E.peak = p.y;
  E.wasGrounded = P.grounded;
  if (p.y < -15) { crack('Het ei viel door de wolken… en rolde terug naar het stro.'); return; }
  if (Math.hypot(p.x - NEST.x, p.z - NEST.z) < 2.2 && Math.abs(p.y - NEST.y) < 1.5) {
    E.state = 'done'; finish('ei'); sfx.cosmic(); puff(NEST.clone().add(V3(0, 1, 0)), 24, 0xfff0a0, 4, 2);
    toast('Krr… krak! Het ei komt uit! Een ooievaarskuikentje!'); eggReward();
  }
}
function crack(msg) { E.state = 'home'; sfx.hurt(); toast(msg); }

// ---------- 3. the beanstalk ----------
const stalk = new THREE.Group(); stalk.position.copy(SEED); scene.add(stalk);
const seed = mk(new THREE.SphereGeometry(0.9, 14, 10), toon(0x8ab84a), 0, 0.4, 0, stalk); seed.scale.set(1.2, 0.7, 1);
const stem = mk(new THREE.CylinderGeometry(0.45, 0.6, 1, 10), toon(0x5aa83a), 0, 0.5, 0, stalk); stem.visible = false;
const LEAVES = Array.from({ length: 9 }, (_, i) => {
  const a = i * 2.1, h = 2 + i * 2;
  return { a, h, x: SEED.x + Math.cos(a) * 1.7, z: SEED.z + Math.sin(a) * 1.7, box: null, m: null };
});
const STALK_H = LEAVES[LEAVES.length - 1].h + 1.5;
const B = { state: done('bonen') ? 'grown' : 'seed', t: 0, hint: 0 };
let stalkBox = null;
function growLeaf(L) {
  const b = block(L.x, SEED.y + L.h - 0.15, L.z, 2.2, 0.3, 2.2, 0x6ac84a, 0x4aa83a, {}, false);
  L.box = b; L.m = b.mesh; b.mesh.scale.setScalar(0.01);
}
function bonenReward() { const L = LEAVES[LEAVES.length - 1]; addCookie(L.x, SEED.y + L.h + 1.2, L.z, NAMES.bonen); }
function setStalk(k) {
  stem.visible = k > 0; seed.visible = k <= 0;
  stem.scale.set(1, Math.max(0.01, STALK_H * k), 1); stem.position.y = (STALK_H * k) / 2;
  for (const L of LEAVES) {
    if (!L.box && L.h < STALK_H * k) growLeaf(L);
    if (L.m) L.m.scale.setScalar(Math.min(1, (STALK_H * k - L.h) / 1.5 + 0.01));
  }
}
if (B.state === 'grown') { setStalk(1); stalkBox = solid(SEED.x, SEED.y + STALK_H / 2, SEED.z, 1, STALK_H, 1); }
function updateStalk(dt) {
  if (B.state !== 'growing') return;
  B.t += dt;
  const k = Math.min(1, B.t / 3.5);
  setStalk(k * k * (3 - 2 * k));
  if (Math.random() < 0.4) puff(V3(SEED.x, SEED.y + STALK_H * k, SEED.z), 2, 0x8ad86a, 2, 1);
  if (k >= 1) { B.state = 'grown'; finish('bonen'); stalkBox = solid(SEED.x, SEED.y + STALK_H / 2, SEED.z, 1, STALK_H, 1); bonenReward(); toast('Een bonenstaak tot in de wolken! Klim over de bladeren naar boven.'); }
}

// ---------- 4. Brom, the thundercloud ----------
const brom = new THREE.Group(); scene.add(brom);
const bromMat = toon(0x6a6a88);
for (let k = 0; k < 6; k++) mk(new THREE.SphereGeometry(0.9 + (k % 3) * 0.2, 12, 9), bromMat, (k % 3 - 1) * 1.1, (k > 2 ? 0.5 : 0), (k > 2 ? -0.4 : 0.3), brom, 1.04);
const brows = [-1, 1].map((s) => { const b = mk(new THREE.BoxGeometry(0.4, 0.08, 0.05), ink, 0.35 * s, 0.35, 1.32, brom, 0); b.rotation.z = -0.4 * s; return b; });
for (const s of [-1, 1]) mk(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe14a }), 0.35 * s, 0.15, 1.32, brom, 0);
const bromMouth = mk(new THREE.TorusGeometry(0.2, 0.04, 4, 10, Math.PI), ink, 0, -0.2, 1.3, brom, 0);
const BR = { hits: done('brom') ? 3 : 0, zap: 3, warn: null, warnT: 0, hurtT: 0, at: V3() };
const bromBox = block(BROM_HOME.x, BROM_HOME.y - 0.8, BROM_HOME.z, 3.4, 1.6, 2.6, 0x6a6a88, 0x5a5a78, {}, false);
bromBox.mesh.visible = false;
const bromPos = (t) => V3(BROM_HOME.x + Math.cos(t * 0.25) * 3, BROM_HOME.y - 0.8 + Math.sin(t * 0.9) * 0.3, BROM_HOME.z + Math.sin(t * 0.25) * 3);
bromBox.mover = { b: bromBox, delta: V3(), fn: bromPos };
movers.push(bromBox.mover);
const ringMat = new THREE.MeshBasicMaterial({ color: 0xffe14a, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false });
const zapRing = new THREE.Mesh(new THREE.RingGeometry(1.4, 1.9, 24), ringMat); zapRing.rotation.x = -Math.PI / 2; zapRing.visible = false; scene.add(zapRing);
const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.4, 1, 6), new THREE.MeshBasicMaterial({ color: 0xfff6a0 })); bolt.visible = false; scene.add(bolt);
addSpeaker(brom, { y: 2, radius: 7, linger: 10, lines: () => (BR.hits >= 3 ? ['*pfoe* …Ik voel me zo LICHT.', 'Sorry voor het bliksemen. Ik zat zo vol.'] : ['BROMMMM. Wég van mijn veld!', '*KRAK* Ik ben NIET boos. Ik ben gewoon… vol.']) });
function bromReward() { addCookie(BROM_HOME.x + 2, ISLANDS.bonen[3] + 1.2, BROM_HOME.z - 2, NAMES.brom); }
function showBrom() {
  const k = Math.max(0.35, 1 - BR.hits * 0.22);
  brom.scale.setScalar(k);
  bromMat.color.setHex(BR.hits >= 3 ? 0xffffff : [0x6a6a88, 0x8a8aa8, 0xa8a8c8][BR.hits]);
  bromMouth.rotation.z = BR.hits >= 3 ? Math.PI : 0;
  brows.forEach((b) => (b.visible = BR.hits < 3));
  if (BR.hits >= 3) { const i = boxes.indexOf(bromBox); if (i >= 0) boxes.splice(i, 1); }
}
showBrom();
function updateBrom(dt, t, P) {
  const p = P.pos;
  BR.at.copy(bromBox.pos).add(V3(0, 0.8, 0));
  brom.position.copy(BR.at); brom.rotation.y = Math.sin(t * 0.5) * 0.3;
  BR.hurtT -= dt;
  if (BR.hurtT > 0) brom.rotation.z = Math.sin(BR.hurtT * 30) * 0.2; else brom.rotation.z = 0;
  if (BR.hits >= 3) { brom.position.y = BR.at.y + 3; return; }
  // he zaps you when you're under him on the field
  const near = Math.hypot(p.x - BR.at.x, p.z - BR.at.z) < 14 && p.y < BR.at.y - 1.5 && p.y > ISLANDS.bonen[3] - 1;
  if (!BR.warn) {
    BR.zap -= dt;
    if (near && BR.zap <= 0) { BR.warn = V3(p.x, ISLANDS.bonen[3], p.z); BR.warnT = 0; zapRing.visible = true; zapRing.position.set(p.x, groundAt(p.x, p.z, 0) + 0.05, p.z); sfx.scanTick(true); }
  } else {
    BR.warnT += dt;
    ringMat.opacity = 0.3 + Math.abs(Math.sin(BR.warnT * 12)) * 0.4;
    if (BR.warnT > 1.1 && !bolt.visible) {
      bolt.visible = true;
      const from = BR.at.clone(), to = zapRing.position.clone();
      bolt.position.lerpVectors(from, to, 0.5); bolt.scale.set(1, from.distanceTo(to), 1);
      bolt.quaternion.setFromUnitVectors(V3(0, 1, 0), from.clone().sub(to).normalize());
      sfx.zap(); sfx.smash();
      if (Math.hypot(p.x - to.x, p.z - to.z) < 1.9 && Math.abs(p.y - to.y) < 2) ctx.hurt(to.clone());
    }
    if (BR.warnT > 1.4) { BR.warn = null; bolt.visible = false; zapRing.visible = false; BR.zap = 3 + Math.random(); }
  }
}
function hitBrom() {
  BR.hits++; BR.hurtT = 0.6; sfx.bossHit(); ctx.shake(0.4);
  for (let i = 0; i < 30; i++) puff(BR.at.clone().add(V3((Math.random() - 0.5) * 3, -1, (Math.random() - 0.5) * 2)), 1, 0x8ab8ff, 2, -3);
  ctx.P.vel.y = 13; ctx.P.grounded = false;
  if (BR.hits >= 3) { finish('brom'); sfx.cosmic(); toast('Brom regent zichzelf helemaal leeg… en wordt een klein wit wolkje!'); bromReward(); }
  else toast(`BROM: OEF! *het regent* (nog ${3 - BR.hits})`);
  showBrom();
}
const onBrom = (at) => at.x > bromBox.min.x - 0.3 && at.x < bromBox.max.x + 0.3 && at.z > bromBox.min.z - 0.3 && at.z < bromBox.max.z + 0.3 && Math.abs(at.y - bromBox.max.y) < 0.8;


// ---------- 6. the thermals and the Thermiekrace ----------
// Gliding (Zweef or Wervelwind) inside a column of warm wind lifts you up. Five rings hang above the
// Thermiekvelden, each higher than the last: through all five within 25 seconds of the first.
const RINGS = [[-32, 10, 92], [-32, 16, 92], [-24, 20, 99], [-24, 26, 99], [-30, 31, 103.5]].map(([x, y, z]) => V3(x, y, z));
const raceMat = (c) => new THREE.MeshBasicMaterial({ color: c });
const rings = RINGS.map((p) => { const m = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.16, 8, 28), raceMat(0xffe14a)); m.rotation.x = Math.PI / 2; m.position.copy(p); scene.add(m); return m; });
const RACE = { next: 0, t: 0, told: 0 };
const RACE_TIME = 25;
function raceReward() { const p = RINGS[RINGS.length - 1]; addCookie(p.x, p.y + 1.6, p.z, NAMES.thermiek); }
function showRings(t) {
  rings.forEach((m, i) => {
    m.visible = !done('thermiek');
    m.material.color.setHex(i < RACE.next ? 0x7aff6a : i === RACE.next ? (Math.sin(t * 8) > 0 ? 0xffe14a : 0xffffff) : 0xffe14a);
    m.rotation.z = t * (i % 2 ? 1 : -1);
  });
}
function updateThermals(dt, t, P) {
  const p = P.pos, glide = ['zweef', 'wervel'].includes(ctx.ability());
  RACE.told -= dt;
  for (const T of THERMALS) {
    if (Math.hypot(p.x - T.x, p.z - T.z) > T.r || p.y > T.top || P.grounded || p.y < T.top - 40) continue;
    if (glide && P.jumpHeld) { P.vel.y = Math.max(P.vel.y, 7.5); if (Math.random() < 0.4) puff(p.clone(), 1, 0xffe0a0, 1, 1); }
    else if (RACE.told <= 0) { RACE.told = 8; toast(glide ? 'Houd spatie ingedrukt om te zweven: dan tilt de warme wind je op!' : 'Warme wind! Met Zweef (of Wervelwind) zweef je hier omhoog.'); }
  }
  if (done('thermiek')) { showRings(t); return; }
  if (RACE.next > 0) {
    const before = RACE.t; RACE.t -= dt;
    for (const s of [10, 5]) if (before > s && RACE.t <= s) toast(`Nog ${s} seconden!`);
    if (RACE.t <= 0) { RACE.next = 0; sfx.hurt(); toast('Te laat! Begin weer bij de onderste ring.'); }
  }
  const r = RINGS[RACE.next];
  if (Math.hypot(p.x - r.x, p.z - r.z) < 1.7 && Math.abs(p.y + 0.8 - r.y) < 0.9) {
    sfx.chime(); puff(r.clone(), 12, 0xffe14a, 3, 1);
    if (RACE.next === 0) { RACE.t = RACE_TIME; toast(`Thermiekrace! Door alle vijf de ringen in ${RACE_TIME} seconden!`); }
    RACE.next++;
    if (RACE.next >= RINGS.length) { finish('thermiek'); sfx.cosmic(); toast('Alle vijf de ringen! Jij bent een echte zweefvogel.'); raceReward(); }
    else if (RACE.next > 1) toast(`Ring ${RACE.next}/${RINGS.length}`);
  }
  showRings(t);
}

// ---------- 7. the ice dome on the IJswolkje ----------
function ijsReward() { addCookie(DOME.x, DOME.y + 1.1, DOME.z, NAMES.ijs); }
if (done('ijs')) breakDome();
function meteorDome(at) {
  if (!dome.box || Math.hypot(at.x - DOME.x, at.z - DOME.z) > 4.6 || Math.abs(at.y - DOME.y) > 3) return false;
  breakDome(); finish('ijs'); sfx.smash(); sfx.cosmic(); ctx.shake(0.7);
  for (let i = 0; i < 40; i++) puff(DOME.clone().add(V3((Math.random() - 0.5) * 4, 1 + Math.random() * 2, (Math.random() - 0.5) * 4)), 1, 0xd8f4ff, 5, 3);
  toast('KRAK! Het ijs spat uit elkaar. Er zat een koekje in!'); ijsReward();
  return true;
}
let ijsHint = 0;
function poundDome(at) {
  if (!dome.box || ijsHint > 0 || Math.hypot(at.x - DOME.x, at.z - DOME.z) > 4.6 || Math.abs(at.y - DOME.y) > 3) return;
  ijsHint = 6; toast('*tik* Het ijs is te dik. Hier is een Meteoor voor nodig (Zwaar + Veer).');
}

// ---------- hooks from the story ----------
export function blowTrials(at) { blowSheep(at); }
export function meteorTrials(at) {
  if (B.state === 'seed' && Math.hypot(at.x - SEED.x, at.z - SEED.z) < 2.6 && Math.abs(at.y - SEED.y) < 1.5) {
    B.state = 'growing'; B.t = 0; sfx.wake(); ctx.shake(0.6); toast('De boon wordt wakker…');
  }
  if (BR.hits < 3 && onBrom(at)) hitBrom();
  meteorDome(at);
}
// an ordinary ground pound (no Meteoor)
export function poundTrials(at, drop) {
  if (B.state === 'seed' && Math.hypot(at.x - SEED.x, at.z - SEED.z) < 2.6 && Math.abs(at.y - SEED.y) < 1.5) toast('*boing* De boon slaapt door. Hier is een Meteoor voor nodig (Zwaar + Veer).');
  if (BR.hits < 3 && onBrom(at)) { toast('BROM: Hihi, dat kietelt. (Een gewone stamp is te zacht: probeer een Meteoor!)'); ctx.P.vel.y = 10; ctx.P.grounded = false; }
  poundDome(at);
  bath(at, drop);
}
export function bath(at, drop) {
  if (done('bad') || Math.hypot(at.x - BAD.x, at.z - BAD.z) > 1.5 || Math.abs(at.y - BAD.y) > 0.5) return;
  if (drop < 15) { toast(`In de roos! Maar van te laag (${Math.round(drop)} m). Duik van héél hoog!`); return; }
  finish('bad'); sfx.cosmic(); ctx.shake(0.5); puff(at.clone().add(V3(0, 0.5, 0)), 40, 0xffffff, 8, 4);
  toast(`PLOF! Midden in de roos, van ${Math.round(drop)} meter hoog!`); badReward();
}
function badReward() { addCookie(BAD.x, BAD.y + 1.3, BAD.z, NAMES.bad); }

export function updateTrials(dt, t, P) {
  if (!ctx) return;
  updateSheep(dt, t, P);
  updateEgg(dt, t, P);
  updateStalk(dt);
  updateBrom(dt, t, P);
  updateThermals(dt, t, P);
  ijsHint -= dt;
}

// back after a refresh
export function restoreTrials(s, gotSet) {
  if (done('schaap') && !gotSet.has(NAMES.schaap)) sheepReward();
  if (done('ei') && !gotSet.has(NAMES.ei)) eggReward();
  if (done('bonen') && !gotSet.has(NAMES.bonen)) bonenReward();
  if (done('brom') && !gotSet.has(NAMES.brom)) bromReward();
  if (done('bad') && !gotSet.has(NAMES.bad)) badReward();
  if (done('thermiek') && !gotSet.has(NAMES.thermiek)) raceReward();
  if (done('ijs') && !gotSet.has(NAMES.ijs)) ijsReward();
}
void stalkBox;
