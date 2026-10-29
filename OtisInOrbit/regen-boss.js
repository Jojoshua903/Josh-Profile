import { THREE, scene, toon, addOutline, V3, puff, toast } from './core.js?v=sub1';
import * as sfx from './sfx.js?v=sub1';
import { buildDrone } from './josh.js?v=sub1';
import { ARENA } from './regen-terrain.js?v=sub1';

// Kraai Krijs: a giant crow who lives on top of the Kraaientoren. He works for nobody: he just steals
// everything that shines. Kayo & Yara threw Robin's records over the city, and one of them landed in his nest.
// On his roof he grabs the record and flies off into the storm. Byte goes MEGA (like the Schrootmech, but on
// purpose this time): a huge drone Josh can stand on. The fight is a sky battle above the city.
//   steering  – A/D turn, W/Space climb, S/Shift dive. Byte always flies forward. F = Byte's lasers.
//   vlucht    – he flies a loop round the city and drops feather bombs behind him. Chase him, shoot him.
//   duik      – he turns round, a yellow line shows where he'll charge… and he charges. Swerve!
//   storm     – (from round 2) thunderclouds: yellow columns warn where the lightning strikes.
//   zwerm     – (round 3) he calls his little crows. They chase you; one laser each.
// Three rounds; between rounds your hearts come back.
const C = V3(ARENA.x, ARENA.y, ARENA.z);
const H = ARENA.y;
const ROUNDS = 3, ROUND_HP = 10;
const SKY_MIN = 22, SKY_MAX = 50, BOUND = 58, SPEED = 15, TURN = 1.9, CLIMB = 9;
export const MEGA = 9;
export const boss = { state: 'sleep', t: 0, hits: 0 };
export const BOSS_INFO = {
  name: 'Kraai Krijs', sub: 'Alles wat glimt is van hem',
  winTitle: 'De kraai is verslagen!', winSub: 'Robin’s laatste plaat ligt in het nest.',
  fail: 'Au! Byte is neergestort. Neem de lift weer naar de Kraaientoren!',
  cookie: 'Kraai Krijs verslagen', cookieY: H + 1.3, cookieAt: V3(C.x, H + 1.3, C.z),
};

// ---------- the crow ----------
const black = toon(0x1a1a2a), blackL = toon(0x2a2a44), beakM = toon(0xffc040), eyeM = new THREE.MeshBasicMaterial({ color: 0xff3a3a });
const mk = (geo, mat, x, y, z, parent, ol = 1.05) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; if (ol) addOutline(m, ol); parent.add(m); return m; };
export const crow = new THREE.Group(); scene.add(crow);
const body = new THREE.Group(); crow.add(body);
mk(new THREE.SphereGeometry(1.4, 18, 14), black, 0, 0, 0, body).scale.set(1, 0.95, 1.4);
const head = new THREE.Group(); head.position.set(0, 0.9, 1.5); body.add(head);
mk(new THREE.SphereGeometry(0.75, 16, 12), black, 0, 0, 0, head);
const beak = mk(new THREE.ConeGeometry(0.32, 1.2, 8), beakM, 0, -0.1, 0.95, head); beak.rotation.x = Math.PI / 2;
for (const s of [-1, 1]) mk(new THREE.SphereGeometry(0.13, 8, 6), eyeM, 0.36 * s, 0.2, 0.55, head, 0);
mk(new THREE.BoxGeometry(0.7, 0.1, 0.1), black, 0, 0.45, 0.6, head, 0).rotation.z = 0.15;
const wings = [-1, 1].map((s) => {
  const g = new THREE.Group(); g.position.set(1.1 * s, 0.3, 0); body.add(g);
  mk(new THREE.BoxGeometry(3.2, 0.15, 1.8), blackL, 1.6 * s, 0, -0.2, g);
  for (let i = 0; i < 4; i++) mk(new THREE.BoxGeometry(0.5, 0.1, 1.2), black, (2.4 + i * 0.35) * s, -0.02, -0.9, g, 0);
  return g;
});
for (let i = 0; i < 5; i++) { const f = mk(new THREE.BoxGeometry(0.35, 0.1, 1.6), black, (i - 2) * 0.3, 0, -2, body, 0); f.rotation.y = (i - 2) * 0.2; }
for (const s of [-1, 1]) mk(new THREE.CylinderGeometry(0.08, 0.08, 1), beakM, 0.5 * s, -1.4, 0.2, body, 0);
// Robin's record, in his claws
const record = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.05, 24), new THREE.MeshBasicMaterial({ color: 0x14141c }));
record.position.set(0, -1.9, 0.3); body.add(record);
const recordLabel = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 16), new THREE.MeshBasicMaterial({ color: 0xff4ad8 })); record.add(recordLabel);
const crowLight = new THREE.PointLight(0xff3a3a, 0, 14, 2); crow.add(crowLight);

// ---------- Mega-Byte ----------
export const mega = buildDrone();
mega.g.visible = false;
export const sky = { on: false, grow: false, park: null, pos: V3(), yaw: 0, climbV: 0, roll: 0, fireCd: 0, side: 1, warned: 0, cam: V3() };
const fwdOf = (yaw) => V3(Math.sin(yaw), 0, Math.cos(yaw));
const rightOf = (yaw) => V3(-Math.cos(yaw), 0, Math.sin(yaw));
export const SEAT = 0.2 * MEGA - 0.1;      // how high above Byte's middle Josh stands

export function startSky(P) {
  Object.assign(sky, { on: true, grow: false, park: null, climbV: 0, roll: 0, fireCd: 0.3, warned: 0 });
  sky.pos.copy(mega.g.position);
  mega.g.scale.setScalar(MEGA); mega.g.visible = true;
  sky.yaw = Math.atan2(-sky.pos.x, -sky.pos.z);                 // facing the city
  sky.cam.copy(sky.pos).addScaledVector(fwdOf(sky.yaw), -11).add(V3(0, 4.5, 0));
  const b = boss;
  b.state = 'fight'; b.t = 0; b.hold = false; b.move = null; b.next = 1.5; b.hp = ROUND_HP;
  crow.position.copy(sky.pos).addScaledVector(fwdOf(sky.yaw), 26); crow.position.y = 32;
  void P;
}
export function endSky() { sky.on = false; sky.park = null; }

// steering Byte. Called by main instead of walking, while sky.on.
export function flyStep(dt, inp, P) {
  const s = sky, f = fwdOf(s.yaw);
  let turn = 0;
  if (s.park) {
    s.pos.lerp(s.park, Math.min(1, dt * 2.2));
    s.climbV *= 0.9;
  } else {
    turn = inp.turn;
    s.yaw -= turn * TURN * dt;
    const c = Math.max(-1, Math.min(1, inp.climb + (inp.up ? 1 : 0) - (inp.down ? 1 : 0)));
    s.climbV += (c * CLIMB - s.climbV) * Math.min(1, dt * 4);
    s.pos.addScaledVector(fwdOf(s.yaw), SPEED * dt);
    s.pos.y += s.climbV * dt;
    if (s.pos.y < SKY_MIN) s.pos.y += (SKY_MIN - s.pos.y) * Math.min(1, dt * 2);
    if (s.pos.y > SKY_MAX) { s.pos.y = SKY_MAX; s.climbV = Math.min(0, s.climbV); }
    // too far out over the edge of the city: Byte turns back by himself
    const out = Math.hypot(s.pos.x, s.pos.z);
    if (out > BOUND) {
      const want = Math.atan2(-s.pos.x, -s.pos.z);
      s.yaw += Math.atan2(Math.sin(want - s.yaw), Math.cos(want - s.yaw)) * Math.min(1, dt * 1.6);
      if (s.warned <= 0) { s.warned = 6; toast('Niet te ver de storm in! Byte keert om.'); }
    }
    s.warned -= dt;
  }
  s.roll += (turn * 0.45 - s.roll) * Math.min(1, dt * 5);
  mega.g.position.copy(s.pos);
  mega.g.rotation.set(0, s.yaw, 0);
  mega.tilt.rotation.set(-s.climbV * 0.03, 0, s.roll);
  mega.props.forEach((p, i) => (p.rotation.y += dt * (i ? 50 : -50)));
  mega.eyeMat.color.setHex(0x5ef2e0);
  if (Math.random() < dt * 30) puff(s.pos.clone().addScaledVector(f, -2).add(V3(0, -0.5, 0)), 1, 0x5ef2e0, 1, 0.3);
  // Josh rides on top
  P.pos.copy(s.pos).add(V3(0, SEAT, 0)); P.vel.set(0, 0, 0);
  P.facing = s.yaw; P.grounded = true; P.pound = 0; P.long = false; P.flip = 0; P.crouch = false; P.dashT = 0;
  s.fireCd -= dt;
  if (inp.fire && s.fireCd <= 0 && !s.park) { s.fireCd = 0.16; shoot(); }
}
export function flyCam(dt) {
  if (!sky.on) return null;
  const f = fwdOf(sky.yaw);
  const want = sky.pos.clone().addScaledVector(f, -11).add(V3(0, 4.5 - sky.climbV * 0.15, 0));
  sky.cam.lerp(want, Math.min(1, dt * 5));
  return { pos: sky.cam, look: sky.pos.clone().addScaledVector(f, 8).add(V3(0, 1.5, 0)) };
}

// ---------- Byte's lasers ----------
const laserGeo = new THREE.BoxGeometry(0.2, 0.2, 2.4), laserMat = new THREE.MeshBasicMaterial({ color: 0x5ef2e0 });
const lasers = [];
function shoot() {
  sky.side = -sky.side;
  const f = fwdOf(sky.yaw);
  const from = sky.pos.clone().add(V3(0, 0.4, 0)).addScaledVector(rightOf(sky.yaw), 1.7 * sky.side).addScaledVector(f, 1.4);
  let dir = f.clone(); dir.y = sky.climbV * 0.02; dir.normalize();
  // a little aim help: the crow, a little crow or a feather bomb roughly in front of you
  let best = 0.32, aim = null;
  const consider = (p) => { const d = p.clone().sub(from), L = d.length(); if (L > 55 || L < 1) return; const a = d.angleTo(dir); if (a < best) { best = a; aim = d.normalize(); } };
  if (boss.state === 'fight') consider(crow.position);
  for (const m of minions) consider(m.g.position);
  for (const b of bombs) consider(b.m.position);
  if (aim) dir = aim;
  const m = new THREE.Mesh(laserGeo, laserMat); m.position.copy(from); m.lookAt(from.clone().add(dir)); scene.add(m);
  lasers.push({ m, v: dir.multiplyScalar(75), life: 0.75 });
  if (sky.side > 0) sfx.zap();          // one zap per pair of shots
}

// ---------- hazards ----------
const bombGeo = new THREE.IcosahedronGeometry(0.75, 0), bombMat = toon(0x3a2a5a);
const bombs = [], minions = [], bolts = [];
const lineMat = new THREE.MeshBasicMaterial({ color: 0xffe04a, transparent: true, opacity: 0.5, depthWrite: false });
const chargeLine = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 1), lineMat); chargeLine.visible = false; scene.add(chargeLine);
const warnGeo = new THREE.CylinderGeometry(2.6, 2.6, 60, 20, 1, true);
const boltGeo = new THREE.CylinderGeometry(0.5, 0.9, 60, 6);
const cloudGeo = new THREE.SphereGeometry(4, 12, 8);
function dropBomb() {
  const m = new THREE.Mesh(bombGeo, bombMat); m.position.copy(crow.position).add(V3(0, -1, 0)); addOutline(m, 1.1); scene.add(m);
  bombs.push({ m, life: 6 });
}
function callSwarm(n) {
  for (let i = 0; i < n; i++) {
    const g = new THREE.Group(); scene.add(g);
    mk(new THREE.SphereGeometry(0.45, 10, 8), black, 0, 0, 0, g).scale.set(1, 0.9, 1.4);
    const bk = mk(new THREE.ConeGeometry(0.14, 0.45, 6), beakM, 0, 0, 0.75, g, 0); bk.rotation.x = Math.PI / 2;
    const w = [-1, 1].map((s) => { const wg = new THREE.Group(); wg.position.x = 0.35 * s; g.add(wg); mk(new THREE.BoxGeometry(1, 0.06, 0.6), blackL, 0.5 * s, 0, 0, wg, 0); return wg; });
    const a = (i / n) * Math.PI * 2;
    g.position.copy(crow.position).add(V3(Math.cos(a) * 3, Math.sin(a) * 2, Math.sin(a) * 3));
    minions.push({ g, w, v: V3(Math.cos(a), 0.3, Math.sin(a)).multiplyScalar(8), life: 8, seed: Math.random() * 6 });
  }
  sfx.whir();
}
function storm(n) {
  const f = fwdOf(sky.yaw), r = rightOf(sky.yaw);
  for (let i = 0; i < n; i++) {
    const at = sky.pos.clone().addScaledVector(f, 8 + Math.random() * 28).addScaledVector(r, (Math.random() - 0.5) * 26);
    if (i === 0) at.copy(sky.pos).addScaledVector(f, 16);           // one always right in your path
    const warn = new THREE.Mesh(warnGeo, new THREE.MeshBasicMaterial({ color: 0xffe04a, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
    warn.position.set(at.x, SKY_MAX - 20, at.z); scene.add(warn);
    const cloud = new THREE.Mesh(cloudGeo, toon(0x2a2a3a)); cloud.scale.set(1.3, 0.4, 1.3); cloud.position.set(at.x, SKY_MAX + 7, at.z); scene.add(cloud);
    bolts.push({ at, warn, cloud, bolt: null, t: -i * 0.3 });
  }
  sfx.spore();
}
function clearHazards() {
  chargeLine.visible = false;
  for (const l of lasers) scene.remove(l.m); lasers.length = 0;
  for (const b of bombs) scene.remove(b.m); bombs.length = 0;
  for (const m of minions) scene.remove(m.g); minions.length = 0;
  for (const b of bolts) { scene.remove(b.warn); scene.remove(b.cloud); if (b.bolt) scene.remove(b.bolt); } bolts.length = 0;
}

// ---------- reset ----------
function pose() { body.rotation.set(0, 0, 0); wings.forEach((w) => w.rotation.set(0, 0, 0)); head.rotation.set(0, 0, 0); crow.scale.setScalar(1); crowLight.intensity = 0; }
export function resetBoss() {
  clearHazards(); pose(); endSky(); sky.grow = false;
  mega.g.visible = false; mega.g.scale.setScalar(1);
  Object.assign(boss, { state: 'sleep', t: 0, hits: 0, hp: ROUND_HP, plan: 0, move: null, ms: '', mt: 0, next: 1.5, hold: false, flash: 0 });
  crow.position.set(C.x, H + 1.6, C.z - 4); crow.rotation.set(0, 0, 0); crow.visible = true; record.visible = true;
}
export const bossActive = () => !['sleep', 'dead'].includes(boss.state);
export function setBossDead() { boss.state = 'dead'; clearHazards(); pose(); crow.visible = false; }
resetBoss();

// ---------- the fight ----------
const PLANS = [['vlucht', 'duik', 'vlucht', 'duik'], ['vlucht', 'storm', 'duik', 'vlucht', 'storm', 'duik'], ['zwerm', 'duik', 'storm', 'vlucht', 'duik', 'zwerm', 'storm']];
const LINES = ['KRAAI KRIJS: KRAAA! Mijn mooie veren!', 'KRAAI KRIJS: Een vliegende robot?! Dat is NIET eerlijk!', 'KRAAI KRIJS: Oké, oké! Neem die plaat maar!'];
function flap(t, f = 10, a = 0.6) { wings.forEach((w, i) => (w.rotation.z = Math.sin(t * f) * a * (i ? -1 : 1))); }
function faceDir(d, dt, k = 4) { const want = Math.atan2(d.x, d.z); const a = Math.atan2(Math.sin(want - crow.rotation.y), Math.cos(want - crow.rotation.y)); crow.rotation.y += a * Math.min(1, dt * k); }
function endMove() { boss.move = null; boss.ms = ''; boss.mt = 0; chargeLine.visible = false; }
function moveCrow(to, speed, dt) {
  const d = to.clone().sub(crow.position), L = d.length();
  if (L < 0.01) return d;
  crow.position.addScaledVector(d, Math.min(1, (speed * dt) / L));
  return d;
}

// api: { intro(), damage(from), bounce(vy), shake(s), heal(), win(pos) }
export function updateBoss(dt, t, P, prevY, api) {
  const b = boss;
  b.t += dt; b.mt += dt;
  const p = P.pos;
  updateHazards(dt, t, api);
  if (b.state === 'sleep') {
    flap(t, 2, 0.08); head.rotation.y = Math.sin(t * 0.7) * 0.6;
    const dist = Math.hypot(p.x - C.x, p.z - C.z);
    if (dist < ARENA.r - 1 && p.y > H - 0.5) { b.state = 'wake'; b.t = 0; api.intro(); }
    return;
  }
  if (b.state === 'dead') return;
  if (b.state === 'wake') { flap(t, 12, 0.7); return; }       // the cutscene moves him
  if (b.state === 'hurt') {
    // tumbles, feathers everywhere
    crow.rotation.z = Math.sin(b.t * 20) * 0.7 * Math.max(0, 1 - b.t);
    crow.position.y -= dt * 3 * Math.max(0, 1 - b.t);
    if (Math.random() < dt * 25) puff(crow.position.clone(), 2, 0x2a2a44, 3, 1);
    if (b.t > 1.6) {
      crow.rotation.z = 0; pose();
      if (b.hits >= ROUNDS) { b.state = 'die'; b.t = 0; sfx.wake(); }
      else {
        b.state = 'fight'; b.t = 0; b.hp = ROUND_HP; b.plan = 0; endMove(); b.next = 1;
        api.heal();
        toast(b.hits === 1 ? 'KRAAI KRIJS: Nu roep ik de STORM! (Ontwijk de gele zuilen!)' : 'Kraai Krijs is WOEDEND! Hij roept zijn kleine kraaien!');
      }
    }
    return;
  }
  if (b.state === 'die') {
    // he drops the record (it tumbles down into his nest) and flaps off into the rain
    flap(t, 8, 0.7); record.visible = false;
    crow.position.add(V3(0, dt * 5, -dt * 9)); crow.rotation.x = -0.4;
    if (b.t > 2.6) { setBossDead(); api.win(C.clone()); }
    return;
  }

  // ---------- fight ----------
  const ph = Math.min(2, b.hits);
  const me = sky.pos;
  b.flash -= dt;
  crow.scale.setScalar(b.flash > 0 ? 1.15 : 1);
  // bumping into him hurts
  if (b.ms !== 'go' && crow.position.distanceTo(me) < 2.8) api.damage(crow.position.clone());
  if (b.state !== 'fight') return;          // that hit sent you back to the checkpoint

  if (!b.move) {
    b.next -= dt; flap(t, 8, 0.5);
    const d = moveCrow(me.clone().addScaledVector(fwdOf(sky.yaw), 24).setY(Math.max(SKY_MIN + 4, me.y + 3)), 12, dt);
    faceDir(d, dt, 3);
    if (b.next <= 0) { const plan = PLANS[ph]; b.move = plan[b.plan++ % plan.length]; b.ms = 'start'; b.mt = 0; }
  } else if (b.move === 'vlucht') {
    // a loop round the city, a bit slower than Byte, dropping feather bombs
    if (b.ms === 'start') { b.ang = Math.atan2(crow.position.z, crow.position.x); b.ms = 'fly'; b.drop = 0.8; }
    b.ang += dt * (0.34 + ph * 0.04);
    const to = V3(Math.cos(b.ang) * 32, 32 + Math.sin(b.ang * 2) * 7, Math.sin(b.ang) * 32);
    const d = moveCrow(to, 13 + ph, dt); faceDir(d, dt, 4); flap(t, 9, 0.6);
    b.drop -= dt;
    if (b.drop <= 0) { b.drop = [0.9, 0.75, 0.6][ph]; dropBomb(); }
    if (b.mt > 7) endMove();
  } else if (b.move === 'duik') {
    if (b.ms === 'start') { b.ms = 'aim'; b.mt = 0; sfx.scanTick(false); }
    if (b.ms === 'aim') {
      // hangs still, glares at you, a yellow line shows the charge
      const toMe = me.clone().sub(crow.position);
      faceDir(toMe, dt, 8); flap(t, 14, 0.8);
      crowLight.intensity = 6 + Math.sin(t * 20) * 4;
      b.dir = toMe.clone().normalize(); b.len = toMe.length() + 18;
      chargeLine.visible = true; lineMat.opacity = 0.25 + Math.abs(Math.sin(b.mt * 10)) * 0.4;
      chargeLine.scale.set(1, 1, b.len);
      chargeLine.position.copy(crow.position).addScaledVector(b.dir, b.len / 2);
      chargeLine.lookAt(crow.position.clone().addScaledVector(b.dir, b.len));
      if (b.mt > [1.4, 1.2, 1.0][ph]) { b.ms = 'go'; b.mt = 0; b.from = crow.position.clone(); sfx.whir(); }
    } else if (b.ms === 'go') {
      // the charge: straight along the line, wings folded
      const k = Math.min(1, (b.mt * 40) / b.len);
      crow.position.copy(b.from).addScaledVector(b.dir, b.len * k);
      wings.forEach((w, i) => (w.rotation.z = (i ? 1 : -1) * 1.1));
      if (crow.position.distanceTo(me) < 3) api.damage(crow.position.clone());
      if (Math.random() < 0.6) puff(crow.position.clone(), 1, 0x2a2a44, 2, 0.5);
      if (k >= 1) { pose(); endMove(); b.next = 1.2; }
    }
  } else if (b.move === 'storm') {
    if (b.ms === 'start') { storm(ph === 2 ? 7 : 5); b.ms = 'wait'; }
    const d = moveCrow(me.clone().addScaledVector(fwdOf(sky.yaw), 30).setY(SKY_MAX - 4), 12, dt); faceDir(d, dt, 3);
    flap(t, 20, 0.9);
    if (b.mt > 3.4) endMove();
  } else if (b.move === 'zwerm') {
    if (b.ms === 'start') { callSwarm(6); b.ms = 'wait'; toast('KRAAI KRIJS: Kraaitjes! PAK ZE!'); }
    const d = moveCrow(me.clone().addScaledVector(fwdOf(sky.yaw), 28).setY(me.y + 5), 12, dt); faceDir(d, dt, 3);
    flap(t, 10, 0.6);
    if (b.mt > 5 || minions.length === 0) endMove();
  }
  void prevY;
}

function hitCrow(api) {
  const b = boss;
  b.hp--; b.flash = 0.08;
  puff(crow.position.clone(), 6, 0x2a2a44, 4, 1);
  if (b.hp <= 0) {
    b.hits++; b.state = 'hurt'; b.t = 0; clearHazards(); endMove();
    sfx.bossHit(); api.shake(0.6);
    puff(crow.position.clone(), 40, 0x2a2a44, 8, 2);
    toast(LINES[Math.min(LINES.length - 1, b.hits - 1)]);
  }
}

function updateHazards(dt, t, api) {
  const me = sky.pos;
  // lasers
  for (let i = lasers.length - 1; i >= 0; i--) {
    const l = lasers[i], q = l.m.position;
    q.addScaledVector(l.v, dt); l.life -= dt;
    let hit = l.life <= 0;
    if (!hit && boss.state === 'fight' && q.distanceTo(crow.position) < 2.6) { hit = true; hitCrow(api); }
    for (let j = minions.length - 1; !hit && j >= 0; j--) if (q.distanceTo(minions[j].g.position) < 1.5) { hit = true; puff(minions[j].g.position.clone(), 12, 0x2a2a44, 4, 1); sfx.pop(); scene.remove(minions[j].g); minions.splice(j, 1); }
    for (let j = bombs.length - 1; !hit && j >= 0; j--) if (q.distanceTo(bombs[j].m.position) < 1.4) { hit = true; puff(bombs[j].m.position.clone(), 12, 0x9a3aff, 4, 1); sfx.pop(); scene.remove(bombs[j].m); bombs.splice(j, 1); }
    if (hit) { if (l.life > 0) puff(q.clone(), 4, 0x5ef2e0, 2, 0.5); scene.remove(l.m); lasers.splice(i, 1); }
  }
  if (!sky.on) return;
  // feather bombs: they hang in the air and slowly sink
  for (let i = bombs.length - 1; i >= 0; i--) {
    const b = bombs[i]; b.life -= dt;
    b.m.position.y -= dt * 0.8; b.m.rotation.x += dt * 2; b.m.rotation.y += dt * 3;
    if (b.m.position.distanceTo(me) < 2.4) { api.damage(b.m.position.clone()); b.life = 0; puff(b.m.position.clone(), 16, 0x9a3aff, 5, 1); sfx.pop(); }
    if (b.life <= 0) { scene.remove(b.m); bombs.splice(i, 1); }
  }
  // little crows: they chase Byte
  for (let i = minions.length - 1; i >= 0; i--) {
    const m = minions[i]; m.life -= dt;
    const want = me.clone().sub(m.g.position).normalize().multiplyScalar(11);
    m.v.lerp(want, Math.min(1, dt * 1.4));
    m.g.position.addScaledVector(m.v, dt);
    m.g.lookAt(m.g.position.clone().add(m.v));
    m.w.forEach((w, j) => (w.rotation.z = Math.sin(t * 18 + m.seed) * 0.7 * (j ? -1 : 1)));
    if (m.g.position.distanceTo(me) < 2.2) { api.damage(m.g.position.clone()); m.life = 0; }
    if (m.life <= 0) { puff(m.g.position.clone(), 8, 0x2a2a44, 3, 1); scene.remove(m.g); minions.splice(i, 1); }
  }
  // lightning: a yellow column warns, then the bolt
  for (let i = bolts.length - 1; i >= 0; i--) {
    const b = bolts[i]; b.t += dt;
    if (b.t < 0) continue;
    const WARN = 1.4;
    if (b.t < WARN) b.warn.material.opacity = 0.12 + Math.abs(Math.sin(b.t * 9)) * 0.25;
    else if (!b.bolt) {
      b.warn.visible = false;
      b.bolt = new THREE.Mesh(boltGeo, new THREE.MeshBasicMaterial({ color: 0xfff6c0 })); b.bolt.position.set(b.at.x, SKY_MAX - 20, b.at.z); scene.add(b.bolt);
      sfx.smash(); api.shake(0.25);
      if (Math.hypot(me.x - b.at.x, me.z - b.at.z) < 2.8) api.damage(b.at.clone().setY(me.y));
    } else {
      b.bolt.visible = Math.random() < 0.8;
      b.bolt.rotation.y += 0.7;
    }
    if (b.t > WARN + 0.4) { scene.remove(b.warn); scene.remove(b.cloud); if (b.bolt) scene.remove(b.bolt); bolts.splice(i, 1); }
  }
}
