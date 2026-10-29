import { THREE, scene, toon, addOutline, V3, damp, puff, toast } from './core.js?v=sub1';
import * as sfx from './sfx.js?v=sub1';
import { ARENA, PLATEAU_H } from './schroot-terrain.js?v=sub1';
import { CABLE } from './schroot-world.js?v=sub1';

// De Schrootmech. Ratjetoe, a rat working for Kayo & Yara, hacks Byte and blows him up into a giant: Byte's own body
// with gorilla arms and legs of scrap bolted on. Without Byte there's nothing to copy: Josh fights with what's lying around.
//   vuistslag   – walks up to you and slams his hammer fist into the ground. The fist gets STUCK for a moment
//                 and his chest hatch opens: that's when a thrown piece of scrap hurts him.
//   stamp       – jumps up and lands near you; a shock wave rolls outward over the floor (jump over it)
//   schrootregen – throws junk into the air that comes down on marked spots. What lands, you can pick up.
//   scanstraal  – (angry) Byte's own scanner, now red, follows you around and then zaps where it locked on
// Pick scrap up by walking over it, throw it with E. Four hits; after two he gets faster and starts scanning.
const C = V3(ARENA.x, ARENA.y, ARENA.z);
const H = PLATEAU_H;
const START = V3(C.x, H, C.z - 10);
const HITS = 5;
const THROW_V = 17, THROW_G = 14;   // thrown scrap: straight and fast, aim it yourself
export const boss = { state: 'sleep', t: 0, hits: 0, plan: 0, move: null, ms: '', mt: 0, next: 1.5, hacked: false, k: 0, carry: null, absorb: 0, build: false, inside: false };
export const BOSS_INFO = {
  name: 'De Schrootmech', sub: 'Bestuurd door Ratjetoe',
  winTitle: 'Byte is weer vrij!', winSub: 'De Schrootmech valt uit elkaar.',
  fail: 'Au! De Schrootmech was te sterk. Nog een keer!',
  cookie: 'De stuwkop terug', cookieY: H + 1.3, cookieAt: V3(C.x, H + 1.3, C.z),
  hacksDrone: true,
  // Byte flies into the pile once Ratjetoe starts building, and is gone inside the giant body after that
  droneSlot: () => (boss.build || !boss.hold ? torso.localToWorld(V3(0, BODY_Y, 0)) : null),
  droneHidden: () => !!boss.inside,
  arena: { x: ARENA.x, y: PLATEAU_H, z: ARENA.z, r: ARENA.r },
  droneYaw: () => mech.rotation.y,
  prompt: () => (boss.carry ? '<kbd>E</kbd> schroot gooien' : ['fight', 'hurt'].includes(boss.state) ? 'Loop over schroot om het op te pakken' : ''),
};

// ---------- the mech ----------
const rust = toon(0xc0703a), steel = toon(0x8a96a0), dark = toon(0x4a525c), yellow = toon(0xf0b030);
const mk = (geo, mat, x, y, z, parent, ol = 1.04) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true;
  if (ol) addOutline(m, ol); parent.add(m); return m;
};
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const mech = new THREE.Group(); mech.position.copy(START); scene.add(mech);
const pieces = [];
function piece(x, y, z) { const g = new THREE.Group(); g.position.set(x, y, z); mech.add(g); const p = { g, home: g.position.clone(), homeR: new THREE.Euler() }; pieces.push(p); return g; }
// legs
const legs = [-1, 1].map((s) => {
  const g = piece(1.3 * s, 2.8, 0);
  mk(box(1.2, 1.6, 1.3), rust, 0, -0.8, 0, g);
  mk(box(1.0, 1.2, 1.1), dark, 0, -2.0, 0.1, g);
  mk(box(1.5, 0.4, 2.0), steel, 0, -2.6, 0.3, g);
  return g;
});
const hip = piece(0, 3.0, 0); mk(box(3.4, 0.8, 1.8), dark, 0, 0, 0, hip);
// the body IS Byte, blown up to giant size: white ball, dark visor, ring and props, with a red eye now.
// He flies into the scrap pile at drone size and grows from there (see setAssembly).
const torso = piece(0, 3.4, 0);
const BODY_Y = 1.45, BODY_R = 1.75;
const white = toon(0xf4f6f8), visorMat = toon(0x22262e), byteRing = toon(0x5ef2e0);
mk(new THREE.SphereGeometry(BODY_R, 28, 20), white, 0, BODY_Y, 0, torso, 1.05);
const visor = mk(new THREE.SphereGeometry(1.22, 24, 14), visorMat, 0, BODY_Y + 0.15, 1.13, torso, 0); visor.scale.set(1, 0.75, 0.6);
const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
const EYE = V3(0, BODY_Y + 0.25, 1.85);
mk(new THREE.SphereGeometry(0.4, 14, 10), eyeMat, EYE.x, EYE.y, EYE.z, torso, 0);
const ring = mk(new THREE.TorusGeometry(2.45, 0.28, 10, 40), byteRing, 0, BODY_Y, 0, torso, 0); ring.rotation.x = Math.PI / 2;
const props = [-1, 1].map((s) => {
  mk(new THREE.CylinderGeometry(0.12, 0.12, 1.1), visorMat, 1.3 * s, BODY_Y + 1.6, 0, torso, 0);
  const p = mk(box(2.6, 0.1, 0.42), visorMat, 1.3 * s, BODY_Y + 2.15, 0, torso, 0);
  return p;
});
// Ratjetoe's scrap: a plate bolted over the eye. It flips up when his fist gets stuck.
const hatch = new THREE.Group(); hatch.position.set(0, EYE.y + 0.6, EYE.z + 0.15); torso.add(hatch);
mk(box(1.4, 1.2, 0.22), rust, 0, -0.6, 0, hatch);
for (const [x, y] of [[-0.5, -0.15], [0.5, -0.15], [-0.5, -1.05], [0.5, -1.05]]) mk(new THREE.SphereGeometry(0.08, 6, 4), yellow, x, y, 0.12, hatch, 0);
for (const s of [-1, 1]) mk(box(0.6, 0.35, 0.9), yellow, 2.6 * s, BODY_Y + 0.35, 0, torso);   // brackets that bolt the arms to the ring
// the seat on top of Byte, with Ratjetoe under a glass dome
const head = piece(0, 3.4 + BODY_Y + BODY_R - 0.25, 0);
mk(box(1.2, 0.45, 1.1), steel, 0, 0.22, 0, head);
const beaconMat = new THREE.MeshBasicMaterial({ color: 0x4a3a10 });
mk(new THREE.SphereGeometry(0.16, 10, 8), beaconMat, 0.5, 0.6, 0.4, head, 0);
const dome = new THREE.Mesh(new THREE.SphereGeometry(0.7, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.25, depthWrite: false }));
dome.position.y = 0.45; head.add(dome);
// arms: long gorilla arms bolted onto Byte's ring, the right one ends in a hammer
const ARM_X = 2.9;
const arm = (s, fistMat) => {
  const g = piece(ARM_X * s, 5.4, 0);
  mk(box(0.8, 2.4, 0.8), rust, 0, -1.2, 0, g);
  mk(new THREE.SphereGeometry(0.5, 10, 8), dark, 0, -2.5, 0, g);
  mk(box(1.0, 2.0, 1.0), steel, 0, -3.5, 0, g);
  mk(box(1.5, 1.1, 1.5), fistMat, 0, -4.85, 0, g);
  return g;
};
const armL = arm(-1, dark), armR = arm(1, toon(0x3a3e46));
const SHOULDER = 5.4, REACH = 4.9;
// Ratjetoe
const rat = new THREE.Group(); scene.add(rat);
{
  const fur = toon(0x8a8a90), pink = toon(0xffa0b0);
  mk(new THREE.CapsuleGeometry(0.16, 0.22, 4, 10), fur, 0, 0.3, 0, rat, 1.08);
  const h = new THREE.Group(); h.position.set(0, 0.62, 0.04); rat.add(h);
  mk(new THREE.SphereGeometry(0.16, 12, 10), fur, 0, 0, 0, h, 1.08);
  const snout = mk(new THREE.ConeGeometry(0.08, 0.2, 8), fur, 0, -0.03, 0.17, h, 0); snout.rotation.x = Math.PI / 2;
  mk(new THREE.SphereGeometry(0.03, 6, 4), pink, 0, -0.03, 0.27, h, 0);
  for (const s of [-1, 1]) { const e = mk(new THREE.CircleGeometry(0.08, 10), pink, 0.12 * s, 0.14, -0.02, h, 0); e.rotation.y = 0.4 * s; }
  for (const s of [-1, 1]) mk(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 10), toon(0x7af5ff), 0.06 * s, 0.05, 0.14, h, 0).rotation.x = Math.PI / 2;
  mk(new THREE.TorusGeometry(0.15, 0.015, 6, 16), toon(0x6a4a30), 0, 0.05, 0, h, 0).rotation.x = Math.PI / 2;
  const tail = mk(new THREE.TorusGeometry(0.22, 0.02, 6, 12, Math.PI * 1.2), pink, 0, 0.2, -0.3, rat, 0); tail.rotation.y = Math.PI / 2;
}
// where every piece lies before he builds the mech (in the mech's own space; he faces +z while asleep)
let ps = 77;
const pr = () => ((ps = (ps * 16807) % 2147483647) / 2147483647);
pieces.forEach((p, i) => {
  const a = (i / pieces.length) * Math.PI * 2 + pr(), d = 1.2 + pr() * 2;
  p.pile = V3(Math.cos(a) * d, 0.5 + pr() * 1.6 + (i === 4 ? 1.2 : 0), Math.sin(a) * d);
  p.pileR = new THREE.Euler((pr() - 0.5) * 2.4, pr() * 6, (pr() - 0.5) * 2.4);
});
// Byte himself doesn't lie in the pile: he hovers in the middle of it, drone-sized, and grows into the body
const BYTE_PIECE = pieces.findIndex((p) => p.g === torso), SMALL = 0.2 / BODY_R;
pieces[BYTE_PIECE].pile = V3(0, 2.2 - BODY_Y * SMALL, 0); pieces[BYTE_PIECE].pileR = new THREE.Euler();
function setAssembly(k) {
  boss.k = k;
  pieces.forEach((p, i) => {
    const e0 = Math.max(0, Math.min(1, k * 1.7 - i * 0.09)), e = e0 * e0 * (3 - 2 * e0);
    p.g.position.lerpVectors(p.pile, p.home, e);
    if (i === BYTE_PIECE) { p.g.scale.setScalar(SMALL + (1 - SMALL) * e); return; }
    p.g.position.y += Math.sin(e * Math.PI) * 2.5;
    p.g.rotation.set(p.pileR.x * (1 - e), p.pileR.y * (1 - e), p.pileR.z * (1 - e));
  });
}
setAssembly(0);
const RAT_PILE = START.clone().add(V3(0, 3.2, 0));
function ratOnPile() { scene.add(rat); rat.position.copy(RAT_PILE); rat.rotation.set(0, 0, 0); rat.visible = true; }
function ratInCockpit() { head.add(rat); rat.position.set(0, 0.45, 0); rat.rotation.set(0, 0, 0); }
ratOnPile();

// ---------- scrap: pick it up, throw it ----------
const SCRAP_COLS = [0x8a96a0, 0xc0703a, 0x5a6a80, 0xc0903a];
function scrapMesh() {
  const g = new THREE.Group();
  const c = SCRAP_COLS[Math.floor(Math.random() * SCRAP_COLS.length)];
  mk(box(0.7, 0.35, 0.5), toon(c), 0, 0, 0, g, 1.1);
  mk(new THREE.CylinderGeometry(0.12, 0.12, 0.6, 8), dark, 0.2, 0.2, 0, g, 0).rotation.z = 0.8;
  scene.add(g); return g;
}
const pickups = [], thrown = [];
function addPickup(x, z) {
  const d = V3(x - C.x, 0, z - C.z); if (d.length() > ARENA.r - 1.5) d.setLength(ARENA.r - 1.5);
  const m = scrapMesh(); m.position.set(C.x + d.x, H + 0.25, C.z + d.z); m.rotation.y = Math.random() * 6;
  const glow = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.7, 20), new THREE.MeshBasicMaterial({ color: 0xffe14a, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }));
  glow.rotation.x = -Math.PI / 2; glow.position.y = -0.2; m.add(glow);
  pickups.push({ m, glow });
}
function clearScrap() {
  pickups.forEach((p) => scene.remove(p.m)); pickups.length = 0;
  thrown.forEach((s) => scene.remove(s.m)); thrown.length = 0;
  if (boss.carry) { scene.remove(boss.carry); boss.carry = null; }
}
function startScrap() { addPickup(C.x - 9, C.z + 6); addPickup(C.x + 9, C.z + 6); }

// ---------- hazards ----------
const ringMat = new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false });
// the shockwave is a low wall of WAVE_H. What you see is exactly what hurts: touch the wall, not the air around it
const WAVE_H = 0.6, WAVE_W = 0.35;
const ringGeo = new THREE.CylinderGeometry(1, 1, WAVE_H, 48, 1, true);
const rings = [];
function shockwave(at) {
  const m = new THREE.Mesh(ringGeo, ringMat.clone()); m.position.set(at.x, H + WAVE_H / 2, at.z); scene.add(m);
  rings.push({ m, r: 1.5, hit: false });
}
const markGeo = new THREE.RingGeometry(1.0, 1.3, 28), markFill = new THREE.CircleGeometry(1.0, 28);
const mark = (color, x, z, s = 1) => {
  const g = new THREE.Group(); g.position.set(x, H + 0.05, z); g.scale.setScalar(s); scene.add(g);
  const ring = new THREE.Mesh(markGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false })); ring.rotation.x = -Math.PI / 2; g.add(ring);
  const fill = new THREE.Mesh(markFill, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.2, depthWrite: false })); fill.rotation.x = -Math.PI / 2; g.add(fill);
  return { g, ring, fill };
};
const falling = [];
function scrapRain(p, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, r = i === 0 ? 0 : 1.8 + Math.random() * 6.5;
    const d = V3(p.x + Math.cos(a) * r - C.x, 0, p.z + Math.sin(a) * r - C.z); if (d.length() > ARENA.r - 1.5) d.setLength(ARENA.r - 1.5);
    const x = C.x + d.x, z = C.z + d.z;
    const mk0 = mark(0xff5a3a, x, z, 1.9);
    const m = scrapMesh(); m.scale.setScalar(2.4); m.visible = false;
    falling.push({ ...mk0, m, x, z, t: -i * 0.09 });
  }
}
const scan = { on: false, g: null, t: 0, pos: V3(), zap: null };
const zapMat = new THREE.MeshBasicMaterial({ color: 0xff3a3a, transparent: true, opacity: 0.8, depthWrite: false });
// scan timing: it follows you until LOCK, then the circle turns white and stays put, and at ZAP it fires.
// ZAP_R is exactly the circle you see on the floor.
const LOCK = 1.8, ZAP = 2.15, ZAP_R = 2.4, TICKS = [0.5, 1.0, 1.4, 1.65];
const countGeo = new THREE.RingGeometry(0.93, 1, 40);
function startScan(p) {
  scan.on = true; scan.t = 0; scan.pos.set(p.x, 0, p.z); scan.tick = 0;
  scan.mk = mark(0xff3a3a, p.x, p.z, ZAP_R / 1.3);
  // a second ring that closes in on the circle: when it reaches the edge, the laser fires
  scan.count = new THREE.Mesh(countGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
  scan.count.rotation.x = -Math.PI / 2; scene.add(scan.count);
  scan.beam = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 6), zapMat); scene.add(scan.beam);
  sfx.scanStart();
  if (!boss.scanHint) { boss.scanHint = true; toast('Laser! Als de witte ring de rode cirkel raakt, schiet hij. Sta er dan buiten!'); }
}
function endScan() {
  if (scan.mk) scene.remove(scan.mk.g); if (scan.beam) scene.remove(scan.beam); if (scan.zap) scene.remove(scan.zap); if (scan.count) scene.remove(scan.count);
  scan.on = false; scan.mk = scan.beam = scan.zap = scan.count = null;
}
function clearHazards() {
  rings.forEach((r) => scene.remove(r.m)); rings.length = 0;
  falling.forEach((f) => { scene.remove(f.g); scene.remove(f.m); }); falling.length = 0;
  if (boss.spinMk) { scene.remove(boss.spinMk.g); boss.spinMk = null; }
  if (boss.landMk) { scene.remove(boss.landMk.g); boss.landMk = null; }
  boss.rescan = false;
  endScan();
}

// ---------- reset / dead ----------
function restPose() { armL.rotation.set(0, 0, 0); armR.rotation.set(0, 0, 0); legs.forEach((l) => l.rotation.set(0, 0, 0)); hatch.rotation.x = 0; beaconMat.color.setHex(0x4a3a10); }
export function resetBoss() {
  clearHazards(); clearScrap();
  boss.state = 'sleep'; boss.t = 0; boss.hits = 0; boss.plan = 0; boss.move = null; boss.ms = ''; boss.next = 1.5; boss.hacked = false; boss.opened = false;
  boss.flying = null; boss.noScrap = 0; boss.build = false; boss.inside = false; boss.absorb = 0;
  torso.visible = true; eyeMat.color.setHex(0xff2a2a);
  mech.position.copy(START); mech.rotation.set(0, 0, 0); mech.visible = true;
  restPose(); setAssembly(0); ratOnPile();
}
export const bossActive = () => !['sleep', 'dead'].includes(boss.state);
export function setBossDead() {
  boss.state = 'dead'; boss.hacked = false; clearHazards(); clearScrap(); restPose();
  // what's left: a heap of parts on the floor
  mech.position.set(C.x, H, C.z - 4); mech.rotation.set(0, 0, 0);
  pieces.forEach((p, i) => {
    const a = (i / pieces.length) * Math.PI * 2 + 0.4, d = 2 + (i % 3) * 1.4;
    p.g.position.set(Math.cos(a) * d, 0.4 + (i % 2) * 0.3, Math.sin(a) * d);
    p.g.rotation.set(1.2 + i, i * 0.7, 0.4 * i);
  });
  rat.visible = false; torso.visible = false;   // Byte is free again: only scrap is left
}

// ---------- the fight ----------
const phase = () => (boss.hits >= 2 ? 1 : 0);
const rage = () => 1 + boss.hits * 0.06;   // every hit makes him a bit faster
const PLANS = [['slam', 'rain', 'spin', 'slam', 'stamp'], ['scan', 'slam', 'stamp', 'spin', 'rain', 'slam', 'stamp', 'scan', 'spin']];
const RAT_LINES = ['RATJETOE: AU! Mijn staart!', 'RATJETOE: Dit stond niet in het contract met Kayo & Yara!', 'RATJETOE: Mijn kaas! Mijn mooie kaas!', 'RATJETOE: NEEE! Ik had nog geen verzekering!'];
const ease = (k) => k * k * (3 - 2 * k);
let hintT = 0;
function chest() { return torso.localToWorld(EYE.clone()); }
function face(p, dt, rate = 4) {
  const want = Math.atan2(p.x - mech.position.x, p.z - mech.position.z);
  const d = Math.atan2(Math.sin(want - mech.rotation.y), Math.cos(want - mech.rotation.y));
  mech.rotation.y += d * damp(rate, dt);
}
function walk(p, dt, t, speed) {
  const dx = p.x - mech.position.x, dz = p.z - mech.position.z, L = Math.hypot(dx, dz);
  if (L > 3.4) { mech.position.x += (dx / L) * speed * dt; mech.position.z += (dz / L) * speed * dt; }
  const d = V3(mech.position.x - C.x, 0, mech.position.z - C.z); if (d.length() > ARENA.r - 3) { d.setLength(ARENA.r - 3); mech.position.x = C.x + d.x; mech.position.z = C.z + d.z; }
  const sw = Math.sin(t * speed * 2.2);
  legs[0].rotation.x = sw * 0.35; legs[1].rotation.x = -sw * 0.35;
  armL.rotation.x += (-0.15 - sw * 0.2 - armL.rotation.x) * damp(6, dt);
  mech.position.y = H + Math.abs(sw) * 0.15;
  if (Math.abs(sw) > 0.97 && Math.random() < 0.3) sfx.clank();
}
function startMove(p) {
  const plan = PLANS[phase()];
  boss.move = plan[boss.plan++ % plan.length]; boss.mt = 0;
  boss.ms = boss.move === 'slam' ? 'walk' : boss.move === 'stamp' ? 'crouch' : boss.move === 'rain' ? 'wind' : boss.move === 'spin' ? 'charge' : 'aim';
  boss.chain = boss.move === 'stamp' ? (phase() ? 2 : 1) : 0;
  if (boss.move === 'scan') startScan(p);
}
function endMove() { boss.move = null; boss.ms = ''; boss.next = phase() ? 0.5 : 0.8; }

// api: { intro(), damage(from), bounce(vy), shake(s), win(pos) }
export function updateBoss(dt, t, P, prevY, api) {
  const b = boss;
  b.t += dt; b.mt += dt;
  const p = P.pos;
  const dist = Math.hypot(p.x - C.x, p.z - C.z);
  CABLE.hold = bossActive();   // the gondola waits while you fight, so it can't carry you off
  props.forEach((q, i) => (q.rotation.y += dt * (b.inside && b.state !== 'dead' ? (i ? 14 : -14) : 0)));

  if (b.state === 'sleep') {
    rat.position.y = RAT_PILE.y + Math.abs(Math.sin(t * 3)) * 0.05;
    rat.rotation.y = Math.atan2(p.x - rat.position.x, p.z - rat.position.z);
    if (dist < ARENA.r - 1 && p.y > H - 1) { b.state = 'wake'; b.t = 0; api.intro(); }
    return;
  }
  if (b.state === 'wake') {
    // first time the story hacks Byte in its cutscene (it holds the boss meanwhile); after that he does it himself
    if (!b.hold && !b.hacked) { b.hacked = true; sfx.hack(); }
    // Byte flies into the middle of the pile; once he's there the scrap closes in and he grows with it
    if (b.hacked && (b.build || !b.hold)) {
      b.absorb += dt;
      if (b.absorb > 0.9 && !b.inside) { b.inside = true; puff(torso.localToWorld(V3(0, BODY_Y, 0)), 24, 0xff3a3a, 5, 2); sfx.whir(); }
    }
    if (b.inside) {
      const k = Math.min(1, b.k + dt / 2.4);
      setAssembly(k);
      if (Math.random() < 0.3) puff(mech.position.clone().add(V3((Math.random() - 0.5) * 4, 1 + Math.random() * 4, (Math.random() - 0.5) * 4)), 2, 0xc0a080, 3, 1);
      if (k > 0.8 && rat.parent === scene) { ratInCockpit(); sfx.squeak(); }
      if (k >= 1 && !b.hold) { b.state = 'fight'; b.t = 0; b.next = 1.2; startScrap(); api.shake(0.5); sfx.smash(); }
    }
    return;
  }
  if (b.state === 'dead') return;

  // ---------- scrap in your hands ----------
  if (b.carry) {
    b.carry.position.lerp(p.clone().add(V3(0, 2.1, 0)), damp(14, dt)); b.carry.rotation.y += dt * 2;
    if (P.useP) {
      // no auto-aim: it flies straight where Josh is facing. Only the height is helped, so it reaches his eye level.
      const from = b.carry.position.clone(), dir = V3(Math.sin(P.facing), 0, Math.cos(P.facing));
      const flat = Math.max(2, Math.hypot(mech.position.x - from.x, mech.position.z - from.z)), T = flat / THROW_V;
      const vy = (chest().y - from.y) / T + 0.5 * THROW_G * T;
      thrown.push({ m: b.carry, v: dir.multiplyScalar(THROW_V).setY(vy), t: 0 }); b.carry = null; sfx.longJump();
    }
  } else {
    if (P.useP && t - hintT > 1.5) { hintT = t; toast('Pak eerst een stuk schroot op: loop eroverheen'); }
    for (let i = pickups.length - 1; i >= 0; i--) {
      const s = pickups[i];
      if (Math.hypot(p.x - s.m.position.x, p.z - s.m.position.z) < 1.3 && Math.abs(p.y - H) < 2) {
        s.m.remove(s.glow); b.carry = s.m; pickups.splice(i, 1); sfx.clank(); break;
      }
    }
  }
  pickups.forEach((s, i) => { s.glow.material.opacity = 0.4 + Math.sin(t * 5 + i) * 0.25; });
  // there's always something to throw
  if (!pickups.length && !b.carry && !thrown.length && !falling.length && b.state === 'fight') {
    b.noScrap = (b.noScrap || 0) + dt;
    if (b.noScrap > 2.5) { b.noScrap = 0; const a = Math.random() * Math.PI * 2; addPickup(C.x + Math.cos(a) * 10, C.z + Math.sin(a) * 10); }
  }
  for (let i = thrown.length - 1; i >= 0; i--) {
    const s = thrown[i]; if (!s) continue;
    s.t += dt;
    s.v.y -= THROW_G * dt; s.m.position.addScaledVector(s.v, dt); s.m.rotation.x += dt * 14;
    const q = s.m.position, eye = chest();
    const onEye = q.distanceTo(eye) < 2.2;
    const onBody = Math.hypot(q.x - mech.position.x, q.z - mech.position.z) < BODY_R + 1.4 && q.y > mech.position.y + 0.3 && q.y < mech.position.y + 8.5;
    // missed: it falls on the floor and you can pick it up again
    if (!onEye && !onBody) {
      if (q.y < H + 0.3 || s.t > 2.5) { thrown.splice(i, 1); scene.remove(s.m); addPickup(q.x, q.z); sfx.clank(); }
      continue;
    }
    s.to = eye;
    thrown.splice(i, 1);
    // while his fist is stuck, anything that hits his body counts, not only the eye
    const open = (onEye || onBody) && b.state === 'fight' && b.move === 'slam' && b.ms === 'stuck';
    if (open) {
      scene.remove(s.m);
      puff(s.to.clone(), 30, 0xffe14a, 7, 2); sfx.bossHit(); sfx.zap(); api.shake(0.6);
      b.hits++; b.state = 'hurt'; b.t = 0; clearHazards();
      toast(RAT_LINES[(b.hits - 1) % RAT_LINES.length]);
    } else {
      // clang: it bounces off and lands somewhere in front of him
      sfx.clank(); puff(s.to.clone(), 8, 0xffffff, 3, 1);
      scene.remove(s.m);
      const back = V3(p.x - mech.position.x, 0, p.z - mech.position.z).setLength(3.5 + Math.random() * 2);
      addPickup(mech.position.x + back.x + (Math.random() - 0.5) * 3, mech.position.z + back.z + (Math.random() - 0.5) * 3);
      if (!b.clangHint) { b.clangHint = true; toast('Klong! Zijn luik zit dicht. Wacht tot zijn vuist vastzit.'); }
    }
  }

  // ---------- his body: you can't walk through it ----------
  {
    const dx = p.x - mech.position.x, dz = p.z - mech.position.z, L = Math.hypot(dx, dz);
    if (L < 2.6 && p.y < mech.position.y + 7) { const k = (2.6 - L) / Math.max(L, 0.01); p.x += dx * k; p.z += dz * k; }
  }

  if (b.state === 'hurt') {
    mech.rotation.z = Math.sin(b.t * 24) * 0.05 * Math.max(0, 1 - b.t / 1.6);
    armR.rotation.x += (0 - armR.rotation.x) * damp(4, dt); hatch.rotation.x += (0 - hatch.rotation.x) * damp(6, dt);
    if (Math.random() < 0.5) puff(chest(), 2, 0xffe14a, 4, 1);
    if (b.t > 1.8) {
      mech.rotation.z = 0;
      if (b.hits >= HITS) { b.state = 'die'; b.t = 0; sfx.whir(); }
      else { b.state = 'fight'; b.t = 0; endMove(); b.next = 0.8; if (b.hits === 2) toast('RATJETOE: Oké. Nu wordt het menens. SCANNER AAN!'); }
    }
  } else if (b.state === 'die') {
    // everything flies apart; Ratjetoe jumps out and runs; Byte comes loose
    if (!b.flying) {
      b.flying = pieces.map(() => ({ v: V3((Math.random() - 0.5) * 9, 6 + Math.random() * 6, (Math.random() - 0.5) * 9), w: V3(Math.random() * 6, Math.random() * 6, Math.random() * 6) }));
      scene.add(rat); rat.position.copy(head.localToWorld(V3(0, 0.9, 0))); b.ratV = V3(0, 9, 4);
      puff(chest(), 50, 0xffa040, 10, 3); sfx.smash(); api.shake(0.8);
    }
    pieces.forEach((pc, i) => {
      const f = b.flying[i]; f.v.y -= 25 * dt; pc.g.position.addScaledVector(f.v, dt);
      if (pc.g.position.y + mech.position.y < H + 0.4) { pc.g.position.y = H + 0.4 - mech.position.y; f.v.multiplyScalar(0.4); f.v.y = Math.abs(f.v.y) * 0.3; }
      pc.g.rotation.x += f.w.x * dt * (f.v.length() > 1 ? 1 : 0); pc.g.rotation.z += f.w.z * dt * (f.v.length() > 1 ? 1 : 0);
    });
    b.ratV.y -= 25 * dt; rat.position.addScaledVector(b.ratV, dt);
    if (rat.position.y < H) { rat.position.y = H; b.ratV.set(0, 6, -7); sfx.squeak(); }
    rat.rotation.y = Math.PI;
    if (b.t > 1.2 && b.hacked) { b.hacked = false; b.inside = false; torso.visible = false; puff(chest(), 30, 0xffffff, 6, 2); sfx.whir(); }   // Byte pops out, normal size again
    if (b.t > 3) { b.flying = null; setBossDead(); api.win(C.clone()); }
    return;
  } else if (b.state === 'fight') {
    if (dist > ARENA.r + 8) { resetBoss(); return; }
    const ph = phase();
    if (!b.move) {
      b.next -= dt;
      face(p, dt, 7); walk(p, dt, t, (ph ? 3 : 2.4) * rage());
      if (b.next <= 0) startMove(p);
    } else if (b.move === 'slam') {
      if (b.ms === 'walk') {
        face(p, dt, 8); walk(p, dt, t, (ph ? 3.8 : 3.1) * rage());
        if (Math.hypot(p.x - mech.position.x, p.z - mech.position.z) < 5.2 || b.mt > 3) { b.ms = 'raise'; b.mt = 0; sfx.whir(); }
      } else if (b.ms === 'raise') {
        face(p, dt, 3);
        const k = Math.min(1, b.mt / ((ph ? 0.38 : 0.5) / rage()));
        armR.rotation.x = -2.7 * ease(k);
        if (k >= 1) { b.ms = 'down'; b.mt = 0; }
      } else if (b.ms === 'down') {
        const k = Math.min(1, b.mt / 0.14);
        armR.rotation.x = -2.7 + (2.7 - 0.42) * k;
        if (k >= 1) {
          const at = mech.localToWorld(V3(ARM_X, 0, Math.sin(0.42) * REACH)); at.y = H;
          puff(at.clone().add(V3(0, 0.3, 0)), 24, 0xc0a080, 7, 1); sfx.smash(); api.shake(0.6);
          if (Math.hypot(p.x - at.x, p.z - at.z) < 4.2 && p.y < H + 2.5) api.damage(at);
          shockwave(at);   // the floor ripples out from his fist: jump over it
          b.ms = 'stuck'; b.mt = 0; b.slamAt = at;
          if (!b.opened) { b.opened = true; toast('Zijn vuist zit vast! Kijk naar hem en gooi schroot (E)!'); }
        }
      } else if (b.ms === 'stuck') {
        armR.rotation.x = -0.42 + Math.sin(t * 30) * 0.03;
        hatch.rotation.x += (-1.5 - hatch.rotation.x) * damp(8, dt);
        beaconMat.color.setHex(Math.sin(t * 14) > 0 ? 0xffe14a : 0x4a3a10);
        eyeMat.color.setHex(Math.sin(t * 14) > 0 ? 0xffd0d0 : 0xff2a2a);   // his eye, out in the open: aim there
        if (Math.random() < 0.4) puff(b.slamAt.clone().add(V3(0, 0.4, 0)), 1, 0xffe14a, 3, 1);
        if (b.mt > (ph ? 3.2 : 3.8)) { b.ms = 'pull'; b.mt = 0; sfx.whir(); }
      } else if (b.ms === 'pull') {
        armR.rotation.x += (0 - armR.rotation.x) * damp(5, dt);
        hatch.rotation.x += (0 - hatch.rotation.x) * damp(8, dt); beaconMat.color.setHex(0x4a3a10); eyeMat.color.setHex(0xff2a2a);
        if (b.mt > 0.35) endMove();
      }
    } else if (b.move === 'stamp') {
      if (b.ms === 'crouch') {
        face(p, dt, 6);
        mech.position.y = H - 0.6 * Math.min(1, b.mt / 0.45);
        if (b.mt > 0.45) {
          b.ms = 'jump'; b.mt = 0; b.from = mech.position.clone(); b.from.y = H;
          const d = V3(p.x - C.x, 0, p.z - C.z); if (d.length() > ARENA.r - 3) d.setLength(ARENA.r - 3);
          b.to = V3(C.x + d.x, H, C.z + d.z);
          // he lands a bit short of where you stood, and a red ring shows where: step out of it
          const off = V3(b.from.x - b.to.x, 0, b.from.z - b.to.z); if (off.length() > 0.1) b.to.addScaledVector(off.normalize(), Math.min(off.length(), 2));
          b.landMk = mark(0xff3a3a, b.to.x, b.to.z, 2.3);
          sfx.jump(3);
        }
      } else if (b.ms === 'jump') {
        const k = Math.min(1, b.mt / 1.05);
        mech.position.lerpVectors(b.from, b.to, k); mech.position.y = H + Math.sin(k * Math.PI) * 7;
        legs.forEach((l) => (l.rotation.x = -0.4 * Math.sin(k * Math.PI)));
        if (b.landMk) b.landMk.ring.material.opacity = 0.5 + Math.sin(t * 18) * 0.3;
        if (k >= 1) {
          b.ms = 'recover'; b.mt = 0; shockwave(b.to);
          if (b.landMk) { scene.remove(b.landMk.g); b.landMk = null; }
          puff(b.to.clone().add(V3(0, 0.3, 0)), 30, 0xc0a080, 9, 1); sfx.smash(); api.shake(0.7);
          if (Math.hypot(p.x - b.to.x, p.z - b.to.z) < 3 && p.y < H + 2) api.damage(b.to);
        }
      } else if (b.ms === 'recover') {
        mech.position.y = H; legs.forEach((l) => (l.rotation.x *= 0.9));
        if (b.mt > 0.9) { if (--b.chain > 0) { b.ms = 'crouch'; b.mt = 0; } else endMove(); }
      }
    } else if (b.move === 'rain') {
      face(p, dt, 4);
      if (b.ms === 'wind') {
        armL.rotation.x = -2.9 * ease(Math.min(1, b.mt / 0.6));
        if (b.mt > 0.6) { b.ms = 'after'; b.mt = 0; scrapRain(p, ph ? 11 : 7); sfx.longJump(); }
      } else {
        armL.rotation.x += (0 - armL.rotation.x) * damp(4, dt);
        if (b.mt > 0.9) endMove();
      }
    } else if (b.move === 'spin') {
      // arms out low and he spins like a top, sliding after you: get away or jump over his fists
      const SPIN_R = 6.2;
      if (b.ms === 'charge') {
        if (!b.spinMk) b.spinMk = mark(0xffa040, mech.position.x, mech.position.z, SPIN_R / 1.3);
        b.spinMk.g.position.set(mech.position.x, H + 0.05, mech.position.z);
        b.spinMk.ring.material.opacity = 0.5 + Math.sin(t * 20) * 0.3;
        const k = ease(Math.min(1, b.mt / 0.9));
        armL.rotation.z = -0.75 * k; armR.rotation.z = 0.75 * k; armR.rotation.x = armL.rotation.x = 0;
        beaconMat.color.setHex(Math.sin(t * 20) > 0 ? 0xffa040 : 0x4a3a10);
        if (b.mt > 0.9) { b.ms = 'spin'; b.mt = 0; b.spinHit = false; sfx.whir(); }
      } else if (b.ms === 'spin') {
        mech.rotation.y += dt * 13;
        const dx = p.x - mech.position.x, dz = p.z - mech.position.z, L = Math.hypot(dx, dz);
        if (L > 1) { mech.position.x += (dx / L) * (ph ? 2.6 : 2) * rage() * dt; mech.position.z += (dz / L) * (ph ? 2.6 : 2) * rage() * dt; }
        const d = V3(mech.position.x - C.x, 0, mech.position.z - C.z); if (d.length() > ARENA.r - 3) { d.setLength(ARENA.r - 3); mech.position.x = C.x + d.x; mech.position.z = C.z + d.z; }
        b.spinMk.g.position.set(mech.position.x, H + 0.05, mech.position.z);
        if (Math.random() < 0.5) puff(mech.position.clone().add(V3((Math.random() - 0.5) * 10, 0.3, (Math.random() - 0.5) * 10)), 1, 0xc0a080, 3, 1);
        if (!b.spinHit && L < SPIN_R && L > 2 && p.y < H + 1.3) { b.spinHit = true; api.damage(mech.position.clone()); }
        if (b.mt > (ph ? 2.2 : 1.6)) { b.ms = 'dizzy'; b.mt = 0; scene.remove(b.spinMk.g); b.spinMk = null; }
      } else {
        armL.rotation.z *= 0.85; armR.rotation.z *= 0.85; beaconMat.color.setHex(0x4a3a10);
        mech.rotation.z = Math.sin(b.mt * 10) * 0.06;
        if (b.mt > 0.6) { mech.rotation.z = 0; armL.rotation.z = armR.rotation.z = 0; endMove(); }
      }
    } else if (b.move === 'scan') {
      face(p, dt, 5); walk(p, dt, t, 3);
      if (scan.on) {
        scan.t += dt;
        if (scan.t < LOCK) scan.pos.lerp(V3(p.x + P.vel.x * 0.25, 0, p.z + P.vel.z * 0.25), damp(4.5, dt));
        const locked = scan.t >= LOCK;
        scan.mk.g.position.set(scan.pos.x, H + 0.05, scan.pos.z);
        scan.mk.ring.material.opacity = locked ? 1 : 0.6 + Math.sin(t * 12) * 0.3;
        scan.mk.ring.material.color.setHex(locked ? 0xffffff : 0xff3a3a);
        scan.mk.fill.material.opacity = locked ? 0.35 + Math.sin(t * 40) * 0.25 : 0.2;
        // countdown: the white ring shrinks from wide to the circle's edge exactly when it fires, with beeps on the way
        if (scan.count) {
          const k = Math.min(1, scan.t / ZAP), r = ZAP_R + (7 - ZAP_R) * (1 - k);
          scan.count.visible = !scan.zap; scan.count.scale.setScalar(r); scan.count.position.set(scan.pos.x, H + 0.07, scan.pos.z);
          scan.count.material.color.setHex(locked ? 0xff3a3a : 0xffffff);
        }
        while (scan.tick < TICKS.length && scan.t >= TICKS[scan.tick]) { scan.tick++; sfx.scanTick(false); }
        if (locked && scan.tick === TICKS.length) { scan.tick++; sfx.scanTick(true); }
        const from = chest(), to = V3(scan.pos.x, H, scan.pos.z), d = to.clone().sub(from);
        scan.beam.position.copy(from).addScaledVector(d, 0.5); scan.beam.scale.y = d.length();
        scan.beam.scale.x = scan.beam.scale.z = locked ? 3 : 1;
        scan.beam.quaternion.setFromUnitVectors(V3(0, 1, 0), d.normalize());
        if (scan.t >= ZAP && !scan.zap) {
          scan.zap = new THREE.Mesh(new THREE.CylinderGeometry(ZAP_R, ZAP_R, 14, 16, 1, true), zapMat); scan.zap.position.set(scan.pos.x, H + 7, scan.pos.z); scene.add(scan.zap);
          sfx.zap(); api.shake(0.4); puff(to.clone().add(V3(0, 0.3, 0)), 16, 0xff3a3a, 6, 2);
          if (Math.hypot(p.x - scan.pos.x, p.z - scan.pos.z) < ZAP_R) api.damage(to);
        }
        if (scan.zap) scan.zap.material.opacity = Math.max(0, 0.8 - (scan.t - ZAP) * 2);
        if (scan.t > 2.5) { endScan(); if (ph && !b.rescan) { b.rescan = true; startScan(p); } else { b.rescan = false; endMove(); } }
      }
    }
  }

  // ---------- hazards over time ----------
  for (let i = rings.length - 1; i >= 0; i--) {
    const r = rings[i]; if (!r) continue;
    r.r += dt * 6;
    r.m.scale.set(r.r, 1, r.r); r.m.material.opacity = 0.9 * Math.min(1, (18 - r.r) / 1.5);   // stays solid until it's gone
    const dr = Math.hypot(p.x - r.m.position.x, p.z - r.m.position.z);
    if (!r.hit && Math.abs(dr - r.r) < WAVE_W && p.y < H + WAVE_H - 0.1) { r.hit = true; api.damage(r.m.position); }
    if (r.r > 18) { scene.remove(r.m); rings.splice(i, 1); }
  }
  for (let i = falling.length - 1; i >= 0; i--) {
    const f = falling[i]; if (!f) continue;
    f.t += dt;
    if (f.t < 0) { f.g.visible = false; continue; }
    f.g.visible = true; f.m.visible = true;
    const k = Math.min(1, f.t / 0.8);
    f.m.position.set(f.x, H + 16 * (1 - k * k) + 0.3, f.z); f.m.rotation.x += dt * 6;
    f.ring.material.opacity = 0.5 + Math.sin(t * 18) * 0.3;
    if (k >= 1) {
      scene.remove(f.g); falling.splice(i, 1);
      puff(V3(f.x, H + 0.3, f.z), 12, 0xc0a080, 5, 1); sfx.clank();
      if (Math.hypot(p.x - f.x, p.z - f.z) < 2.1 && p.y < H + 2) api.damage(V3(f.x, H, f.z));
      scene.remove(f.m);
      if (pickups.length < 4) addPickup(f.x, f.z);
    }
  }
}
