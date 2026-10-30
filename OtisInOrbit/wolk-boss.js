import { THREE, scene, toon, addOutline, V3, puff, toast } from './core.js';
import * as sfx from './sfx.js';
import { ARENA } from './wolk-terrain.js';

// Kapitein Knoop: a sky pirate. A big walrus with a knotted beard (that's why he's called Knoop) and a flying
// ship with a balloon. He works for nobody: he says every island he can see is HIS, and he fires his cannons
// at everyone who lives on them. His ship circles his island; you fight him from the ground.
//   kanon   – cannonballs with a burning fuse. They land (red ring), lie there fizzing, and explode.
//             BLOW ONE BACK with the Wervelwind (Zweef + Galm, F) and it flies back into his ship: that's a hit.
//   anker   – a red strip shows where the anchor will sweep across the island. Jump over it!
//   matroos – three penguin sailors slide down ropes. Jump on them (or blow them away).
// Three hits. A hornbill and an eagle sit on the wall inside the arena, so you can always mix a Wervelwind.
const C = V3(ARENA.x, ARENA.y, ARENA.z);
const H = ARENA.y;
const FLOOR_R = 10.2;
const HITS = 3;
export const boss = { state: 'sleep', t: 0, hits: 0 };
export const BOSS_INFO = {
  name: 'Kapitein Knoop', sub: 'Alles wat hij ziet is van hem',
  winTitle: 'Knoop geeft zich over!', winSub: 'De lucht is weer van iedereen.',
  fail: 'Au! Knoop was te sterk. Nog een keer!',
  cookie: 'Kapitein Knoop verslagen', cookieY: H + 1.3, cookieAt: V3(C.x, H + 1.3, C.z),
  arena: { x: C.x, y: H, z: C.z, r: FLOOR_R + 0.6 },
  music: 'knoop',
};

const mk = (geo, mat, x, y, z, parent, ol = 1.05) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; if (ol) addOutline(m, ol); parent.add(m); return m; };

// ---------- the ship ----------
export const ship = new THREE.Group(); scene.add(ship);
const wood = toon(0x8a5a3a), woodD = toon(0x5a3a2a), sail = toon(0xf4ecd8), red = toon(0xc83a3a);
{
  mk(new THREE.BoxGeometry(3.4, 1.4, 8), wood, 0, 0, 0, ship);
  mk(new THREE.BoxGeometry(3.6, 0.3, 8.2), woodD, 0, 0.75, 0, ship);
  const bow = mk(new THREE.ConeGeometry(1.8, 2.6, 4), wood, 0, 0, 5.2, ship); bow.rotation.x = Math.PI / 2; bow.rotation.y = Math.PI / 4; bow.scale.set(1, 1, 0.5);
  mk(new THREE.BoxGeometry(3.4, 1.6, 1.6), woodD, 0, 1.4, -3.4, ship);
  // the balloon, striped
  const bal = new THREE.Group(); bal.position.y = 6.5; ship.add(bal);
  mk(new THREE.SphereGeometry(3.6, 20, 14), red, 0, 0, 0, bal).scale.set(1, 0.85, 1.5);
  for (let i = -1; i <= 1; i++) mk(new THREE.TorusGeometry(3.62, 0.18, 6, 30), sail, 0, 0, i * 1.6, bal, 0).scale.set(1, 0.85, 1);
  for (const [x, z] of [[-1.5, -3], [1.5, -3], [-1.5, 3], [1.5, 3]]) { const r = mk(new THREE.CylinderGeometry(0.04, 0.04, 4.6), toon(0xe8d8b0), x * 0.8, 3.4, z * 0.8, ship, 0); r.rotation.z = x * 0.08; }
  // the flag: a knot on black
  const flag = mk(new THREE.PlaneGeometry(1.4, 0.9), new THREE.MeshBasicMaterial({ color: 0x1a1a24, side: THREE.DoubleSide }), 0, 2.6, -4.5, ship, 0); flag.rotation.y = Math.PI / 2;
  mk(new THREE.TorusGeometry(0.22, 0.07, 6, 14), new THREE.MeshBasicMaterial({ color: 0xffffff }), 0.01, 2.6, -4.5, ship, 0).rotation.y = Math.PI / 2;
  mk(new THREE.CylinderGeometry(0.06, 0.06, 2.4), woodD, 0, 1.9, -4.5, ship, 0);
  // two cannons poking out of the side
  for (const z of [-1.5, 1.5]) { const c = mk(new THREE.CylinderGeometry(0.3, 0.38, 1.4, 12), toon(0x3a3a4a), -1.9, 0.3, z, ship, 0); c.rotation.z = Math.PI / 2; }
}
ship.userData.balloon = ship.children.find((o) => o.isGroup);
// ---------- Kapitein Knoop himself, a walrus ----------
export const knoop = new THREE.Group();
{
  const skin = toon(0x9a6a5a), tusk = toon(0xfff6e0), hat = toon(0x1a1a24);
  mk(new THREE.SphereGeometry(1, 18, 14), skin, 0, 1, 0, knoop).scale.set(1.15, 1, 1);
  mk(new THREE.SphereGeometry(0.75, 16, 12), skin, 0, 2.1, 0.2, knoop);
  mk(new THREE.SphereGeometry(0.45, 12, 10), toon(0xc89a8a), 0, 1.9, 0.75, knoop).scale.set(1.3, 0.8, 0.8);
  for (const s of [-1, 1]) { const t = mk(new THREE.ConeGeometry(0.1, 0.9, 8), tusk, 0.22 * s, 1.35, 0.85, knoop, 0); t.rotation.x = Math.PI; }
  // the knotted beard
  for (let i = 0; i < 3; i++) mk(new THREE.TorusGeometry(0.12, 0.05, 6, 12), toon(0xd8c8b0), 0, 1.5 - i * 0.22, 0.9, knoop, 0);
  mk(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: 0x1a1030 }), 0.25, 2.3, 0.82, knoop, 0);
  mk(new THREE.CircleGeometry(0.14, 12), new THREE.MeshBasicMaterial({ color: 0x1a1a24 }), -0.25, 2.3, 0.86, knoop, 0);   // the eye patch
  mk(new THREE.CylinderGeometry(0.85, 0.95, 0.35, 16), hat, 0, 2.75, 0.1, knoop);
  mk(new THREE.BoxGeometry(1.9, 0.12, 0.7), hat, 0, 2.62, 0.1, knoop, 0);
  for (const s of [-1, 1]) { const f = mk(new THREE.CapsuleGeometry(0.2, 0.5, 4, 8), skin, 1.05 * s, 1, 0.2, knoop); f.rotation.z = 0.8 * s; }
  knoop.position.set(0, 0.9, 0.5); ship.add(knoop);
}

// ---------- the anchor ----------
const anchor = new THREE.Group(); scene.add(anchor); anchor.visible = false;
{
  const iron = toon(0x4a4a5a);
  mk(new THREE.CylinderGeometry(0.2, 0.2, 2.4), iron, 0, 1.2, 0, anchor);
  const arm = mk(new THREE.TorusGeometry(1, 0.2, 6, 14, Math.PI), iron, 0, 0.6, 0, anchor); arm.rotation.z = Math.PI;
  mk(new THREE.TorusGeometry(0.35, 0.1, 6, 12), iron, 0, 2.5, 0, anchor, 0);
}
const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1, 6), toon(0x6a6a7a)); chain.visible = false; scene.add(chain);
const stripMat = new THREE.MeshBasicMaterial({ color: 0xff3a3a, transparent: true, opacity: 0.4, depthWrite: false });
const strip = new THREE.Mesh(new THREE.PlaneGeometry(1, 2.2), stripMat); strip.rotation.x = -Math.PI / 2; strip.visible = false; scene.add(strip);

// ---------- cannonballs, sailors ----------
const ballGeo = new THREE.SphereGeometry(0.55, 14, 10), ballMat = toon(0x2a2a34);
const ringGeo = new THREE.RingGeometry(1.9, 2.5, 28);
const balls = [], sailors = [];
function fireBall(target) {
  const m = new THREE.Mesh(ballGeo, ballMat); addOutline(m, 1.1); scene.add(m);
  const fuse = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffa040 })); fuse.position.y = 0.6; m.add(fuse);
  const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xff3a3a, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(target.x, H + 0.05, target.z); scene.add(ring);
  const from = ship.localToWorld(V3(-2.2, 0.3, 0));
  m.position.copy(from);
  balls.push({ m, ring, fuse, from, to: target.clone().setY(H + 0.55), t: 0, state: 'fly', fuseT: 0 });
  sfx.smash(); puff(from, 10, 0x9a9aa8, 3, 1);
}
function addSailor(at) {
  const g = new THREE.Group(); scene.add(g);
  mk(new THREE.CapsuleGeometry(0.32, 0.4, 4, 10), toon(0x1a1a2a), 0, 0.6, 0, g);
  mk(new THREE.SphereGeometry(0.27, 10, 8), toon(0xf4f4f4), 0, 0.55, 0.12, g, 0).scale.set(1, 1.3, 0.8);
  const bk = mk(new THREE.ConeGeometry(0.1, 0.25, 6), toon(0xffa040), 0, 0.9, 0.32, g, 0); bk.rotation.x = Math.PI / 2;
  mk(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 12), toon(0xc83a3a), 0, 1.15, 0, g, 0);          // a red bandana
  for (const s of [-1, 1]) mk(new THREE.SphereGeometry(0.04, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }), 0.09 * s, 1.0, 0.27, g, 0);
  g.position.copy(at);
  sailors.push({ g, state: 'drop', t: 0, y0: at.y, spin: 0, v: V3() });
}
function clearAll() {
  for (const b of balls) { scene.remove(b.m); scene.remove(b.ring); } balls.length = 0;
  for (const s of sailors) scene.remove(s.g); sailors.length = 0;
  anchor.visible = chain.visible = strip.visible = false;
}

// ---------- reset ----------
let shipAng = 0.8;
function shipAt(a, y = H + 8, r = 19) { return V3(C.x + Math.cos(a) * r, y, C.z + Math.sin(a) * r); }
function placeShip(dt, t, speed) {
  shipAng += dt * speed;
  ship.position.copy(shipAt(shipAng)).add(V3(0, Math.sin(t * 1.3) * 0.5, 0));
  ship.rotation.set(0, -shipAng, Math.sin(t * 1.1) * 0.05);       // broadside to the island, the cannons facing in
}
export const KNOOP_DOCK = V3(C.x + 6, H, C.z - 6);
export function resetBoss() {
  clearAll();
  Object.assign(boss, { state: 'sleep', t: 0, hits: 0, plan: 0, move: null, ms: '', mt: 0, next: 2, hold: false, shots: 0 });
  shipAng = 0.8; ship.position.copy(shipAt(shipAng)); ship.rotation.set(0, -shipAng, 0); ship.visible = true;
  if (knoop.parent !== ship) { ship.add(knoop); } knoop.position.set(0, 0.9, 0.5); knoop.rotation.set(0, -Math.PI / 2, 0); knoop.scale.setScalar(1);
  ship.userData.balloon.scale.setScalar(1);
}
export const bossActive = () => !['sleep', 'dead'].includes(boss.state);
export function setBossDead() {
  boss.state = 'dead'; clearAll();
  // the ship lies moored by the island, its balloon patched; Knoop sits on the island, sulking (and then friendly)
  ship.position.set(C.x + 17, H - 2.5, C.z - 8); ship.rotation.set(0.08, -0.5, 0.06);
  ship.userData.balloon.scale.set(0.6, 0.45, 0.6);
  scene.add(knoop); knoop.position.copy(KNOOP_DOCK); knoop.rotation.set(0, -2.2, 0);
}
resetBoss();

// ---------- the fight ----------
const PLANS = [['kanon', 'anker', 'kanon', 'matroos'], ['kanon', 'matroos', 'anker', 'kanon', 'anker'], ['kanon', 'anker', 'matroos', 'kanon', 'anker']];
const OUCH = ['KNOOP: AU! Mijn eigen kogel?! Dat is NIET eerlijk!', 'KNOOP: Mijn ballon! Je hebt een gat in mijn ballon geblazen!', 'KNOOP: Oké! OKÉ! Ik geef me over!'];
function endMove() { boss.move = null; boss.ms = ''; boss.mt = 0; boss.next = [1.4, 1.1, 0.9][Math.min(2, boss.hits)]; }

// the Wervelwind: anything close by is blown away. Cannonballs fly back to the ship.
export function blow(at) {
  if (boss.state !== 'fight') return;
  for (const b of balls) {
    if (b.state === 'back' || b.m.position.distanceTo(at) > 5.2) continue;
    b.state = 'back'; b.t = 0; b.from = b.m.position.clone(); scene.remove(b.ring);
    sfx.whir(); puff(b.m.position.clone(), 12, 0xe8e0ff, 4, 1);
  }
  for (const s of sailors) if (s.state !== 'gone' && s.g.position.distanceTo(at) < 5) { s.state = 'blown'; s.t = 0; s.v.copy(s.g.position).sub(at).setY(0).setLength(14); s.v.y = 9; }
}

// api: { intro(), damage(from), bounce(vy), shake(s), win(pos) }
export function updateBoss(dt, t, P, prevY, api) {
  const b = boss;
  b.t += dt; b.mt += dt;
  const p = P.pos;
  if (b.state === 'sleep') {
    placeShip(dt, t, 0.12);
    knoop.rotation.y = -Math.PI / 2 + Math.sin(t * 0.8) * 0.4;
    const dist = Math.hypot(p.x - C.x, p.z - C.z);
    if (dist < FLOOR_R - 0.5 && p.y > H - 0.5) { b.state = 'wake'; b.t = 0; api.intro(); }
    return;
  }
  if (b.state === 'dead') { knoop.position.y = KNOOP_DOCK.y + Math.abs(Math.sin(t * 2)) * 0.05; return; }
  updateBalls(dt, t, p, api);
  updateSailors(dt, t, P, api);
  if (b.state === 'wake') { placeShip(dt, t, 0.12); if (!b.hold && b.t > 0.5) { b.state = 'fight'; b.t = 0; b.next = 1; } return; }
  if (b.state === 'hurt') {
    // the ship rocks, smoke from the balloon
    placeShip(dt, t, 0.05);
    ship.rotation.z = Math.sin(b.t * 14) * 0.25 * Math.max(0, 1 - b.t / 1.6);
    if (Math.random() < dt * 20) puff(ship.localToWorld(V3(0, 6.5, 0)), 2, 0x9a9aa8, 2, 2);
    if (b.t > 1.8) {
      if (b.hits >= HITS) { b.state = 'die'; b.t = 0; sfx.wake(); }
      else { b.state = 'fight'; b.t = 0; b.plan = 0; endMove(); }
    }
    return;
  }
  if (b.state === 'die') {
    // the balloon goes down, pfffff, and the ship glides down to the edge of the island
    const k = Math.min(1, b.t / 3);
    ship.userData.balloon.scale.setScalar(1 - k * 0.5);
    ship.position.lerp(V3(C.x + 17, H - 2.5, C.z - 8), Math.min(1, dt * 1.2));
    ship.rotation.z = Math.sin(b.t * 6) * 0.15 * (1 - k);
    if (Math.random() < dt * 25) puff(ship.localToWorld(V3((Math.random() - 0.5) * 3, 6.5, (Math.random() - 0.5) * 4)), 2, 0xe8e0ff, 3, 1);
    if (b.t > 3.4) { setBossDead(); api.win(C.clone()); }
    return;
  }

  // ---------- fight ----------
  const ph = Math.min(2, b.hits);
  placeShip(dt, t, [0.18, 0.24, 0.3][ph]);
  knoop.rotation.y = -Math.PI / 2 + Math.sin(t * 2) * 0.3;
  if (!b.move) {
    b.next -= dt;
    if (b.next <= 0) { const plan = PLANS[ph]; b.move = plan[b.plan++ % plan.length]; b.ms = 'start'; b.mt = 0; }
    return;
  }
  if (b.move === 'kanon') {
    // a few shots aimed near you, one after another
    if (b.ms === 'start') { b.ms = 'fire'; b.shots = [2, 3, 4][ph]; b.cd = 0.2; if (!b.toldBlow) toast('Blaas een kanonskogel terug met de Wervelwind (F)!'); b.toldBlow = true; }
    b.cd -= dt;
    if (b.shots > 0 && b.cd <= 0) {
      b.shots--; b.cd = [0.9, 0.7, 0.55][ph];
      const tgt = V3(p.x + (Math.random() - 0.5) * 4, H, p.z + (Math.random() - 0.5) * 4);
      const d = Math.hypot(tgt.x - C.x, tgt.z - C.z);
      if (d > FLOOR_R - 1.5) { tgt.x = C.x + ((tgt.x - C.x) / d) * (FLOOR_R - 1.5); tgt.z = C.z + ((tgt.z - C.z) / d) * (FLOOR_R - 1.5); }
      fireBall(tgt);
    }
    if (b.shots <= 0 && b.mt > 4.5) endMove();
  } else if (b.move === 'anker') {
    // a chord across the island, through (about) where you stand
    if (b.ms === 'start') {
      b.ms = 'warn';
      const ang = Math.random() * Math.PI;
      const dir = V3(Math.cos(ang), 0, Math.sin(ang));
      const n = V3(-dir.z, 0, dir.x);
      const off = Math.max(-5, Math.min(5, (p.x - C.x) * n.x + (p.z - C.z) * n.z));
      const mid = C.clone().addScaledVector(n, off);
      const half = Math.sqrt(Math.max(1, FLOOR_R * FLOOR_R - off * off));
      b.a0 = mid.clone().addScaledVector(dir, -half - 1); b.a1 = mid.clone().addScaledVector(dir, half + 1);
      strip.visible = true; strip.position.set(mid.x, H + 0.04, mid.z); strip.scale.set(half * 2, 1, 1);
      strip.rotation.z = -ang;
      sfx.clank();
    }
    if (b.ms === 'warn') {
      stripMat.opacity = 0.2 + Math.abs(Math.sin(b.mt * 10)) * 0.4;
      if (b.mt > [1.3, 1.1, 0.9][ph]) { b.ms = 'sweep'; b.mt = 0; anchor.visible = chain.visible = true; sfx.whir(); }
    } else if (b.ms === 'sweep') {
      const L = b.a0.distanceTo(b.a1), k = Math.min(1, (b.mt * [13, 15, 17][ph]) / L);
      anchor.position.lerpVectors(b.a0, b.a1, k); anchor.position.y = H + 0.1;
      anchor.rotation.y = Math.atan2(b.a1.x - b.a0.x, b.a1.z - b.a0.z) + Math.PI / 2;
      // the chain up to the ship
      const top = ship.localToWorld(V3(0, 0, 0));
      chain.position.lerpVectors(anchor.position.clone().add(V3(0, 2.5, 0)), top, 0.5);
      chain.scale.set(1, top.distanceTo(anchor.position), 1);
      chain.quaternion.setFromUnitVectors(V3(0, 1, 0), top.clone().sub(anchor.position).normalize());
      if (Math.random() < 0.5) puff(anchor.position.clone(), 1, 0xd8d0c0, 2, 0.5);
      if (Math.hypot(p.x - anchor.position.x, p.z - anchor.position.z) < 1.3 && p.y < H + 1.4) api.damage(anchor.position.clone());
      if (k >= 1) { anchor.visible = chain.visible = strip.visible = false; endMove(); }
    }
  } else if (b.move === 'matroos') {
    if (b.ms === 'start') {
      b.ms = 'wait';
      for (let i = 0; i < 3; i++) { const a = shipAng + Math.PI + (i - 1) * 0.6; addSailor(V3(C.x + Math.cos(a) * 6, H + 9, C.z + Math.sin(a) * 6)); }
      toast('KNOOP: Matrozen! Pak die jongen!');
    }
    if (b.mt > 6 || sailors.every((s) => s.state === 'gone')) endMove();
  }
  void prevY;
}

function updateBalls(dt, t, p, api) {
  for (let i = balls.length - 1; i >= 0; i--) {
    const b = balls[i]; if (!b) continue;       // getting hit can kill you, and dying clears this list mid-loop
    b.t += dt;
    b.fuse.material.color.setHex(Math.sin(t * 30) > 0 ? 0xffe14a : 0xff5a2a);
    if (b.state === 'fly') {
      const k = Math.min(1, b.t / 1.1);
      b.m.position.lerpVectors(b.from, b.to, k); b.m.position.y += Math.sin(Math.PI * k) * 6;
      b.ring.material.opacity = 0.3 + k * 0.4;
      if (k >= 1) { b.state = 'lie'; b.t = 0; sfx.land(); puff(b.m.position.clone(), 8, 0xd8d0c0, 3, 1); }
    } else if (b.state === 'lie') {
      if (Math.random() < 0.5) puff(b.m.position.clone().add(V3(0, 0.7, 0)), 1, 0xffa040, 1.5, 1);
      b.m.scale.setScalar(1 + (b.t > 1.6 ? Math.abs(Math.sin(b.t * 18)) * 0.15 : 0));
      if (b.t > 2.4) {
        puff(b.m.position.clone(), 30, 0xff8a3d, 8, 2); sfx.smash(); api.shake(0.3);
        if (Math.hypot(p.x - b.m.position.x, p.z - b.m.position.z) < 2.6 && p.y < H + 2.5) api.damage(b.m.position.clone());
        scene.remove(b.m); scene.remove(b.ring); balls.splice(i, 1);
      }
    } else if (b.state === 'back') {
      // blown back into the ship: the wind carries it in a high arc
      const to = ship.position.clone().add(V3(0, 0.6, 0));
      const k = Math.min(1, b.t / 1.1);
      b.m.position.lerpVectors(b.from, to, k); b.m.position.y += Math.sin(Math.PI * k) * 5;
      if (Math.random() < 0.6) puff(b.m.position.clone(), 1, 0xe8e0ff, 1.5, 0.5);
      if (k >= 1) {
        scene.remove(b.m); balls.splice(i, 1);
        if (boss.state !== 'fight') continue;
        boss.hits++; boss.state = 'hurt'; boss.t = 0; clearAll();
        puff(to, 40, 0xff8a3d, 9, 2); sfx.bossHit(); api.shake(0.6);
        toast(OUCH[Math.min(OUCH.length - 1, boss.hits - 1)]);
        return;
      }
    }
  }
}
function updateSailors(dt, t, P, api) {
  const p = P.pos;
  for (const s of sailors) {
    s.t += dt;
    if (s.state === 'gone') continue;
    if (s.state === 'drop') {
      // slide down a rope
      s.g.position.y = Math.max(H, s.y0 - s.t * 9);
      if (s.g.position.y <= H) { s.state = 'walk'; s.t = 0; }
    } else if (s.state === 'walk') {
      const d = p.clone().sub(s.g.position).setY(0), L = d.length();
      if (L > 0.1) s.g.position.addScaledVector(d, Math.min(1, (3.6 * dt) / L));
      s.g.rotation.y = Math.atan2(d.x, d.z);
      s.g.rotation.z = Math.sin(t * 14 + s.y0) * 0.15;          // a waddle
      // jump on them!
      if (L < 0.9 && p.y > H + 0.6 && P.vel.y < 0) { s.state = 'squash'; s.t = 0; api.bounce(11); sfx.pop(); puff(s.g.position.clone().add(V3(0, 0.6, 0)), 14, 0xffffff, 4, 1); }
      else if (L < 0.8 && p.y < H + 1.2) api.damage(s.g.position.clone());
    } else if (s.state === 'squash') {
      s.g.scale.set(1.3, Math.max(0.1, 1 - s.t * 4), 1.3);
      if (s.t > 0.4) { s.state = 'gone'; scene.remove(s.g); }
    } else if (s.state === 'blown') {
      s.g.position.addScaledVector(s.v, dt); s.v.y -= 20 * dt; s.g.rotation.x += dt * 10;
      if (s.t > 1.5) { s.state = 'gone'; scene.remove(s.g); }
    }
  }
}
