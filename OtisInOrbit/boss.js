import { THREE, scene, toon, addOutline, V3, damp, puff } from './core.js';
import { ARENA } from './terrain.js';

// De Lichtvreter: a big gloomy cloud that swallowed the moon's light (and Otis' battery).
// Loop: float & spit mist balls → rise → slam down (shockwave) → dazed with the battery showing
// on its head → stomp the battery. Three stomps and the light comes back.

const C = V3(ARENA.x, ARENA.y, ARENA.z);
const FLOAT_Y = 6.5;
export const BOSS_INFO = {
  name: 'De Lichtvreter', sub: 'Hij heeft al het licht van de maan opgeslokt',
  winTitle: 'Het licht is terug!', winSub: 'Otis’ accu is gered. De Mistmaan schijnt weer.',
  fail: 'Au! De Lichtvreter was te sterk. Nog een keer!',
  cookie: 'De Lichtvreter verslagen', cookieY: 19.6, cookieAt: V3(ARENA.x, 19.6, ARENA.z), lightBack: true,
};
export const boss = { state: 'sleep', t: 0, hits: 0, pos: V3(0, ARENA.y + 9, ARENA.z - 7), fireT: 2, slam: V3(), hitRing: false };

const g = new THREE.Group(); scene.add(g);
const body = new THREE.Group(); g.add(body);
const cloud = toon(0x464b66), cloudDark = toon(0x363a52);
const puffs = [[0, 0, 0, 2.1], [1.6, 0.4, 0.2, 1.4], [-1.6, 0.3, 0.1, 1.5], [0.9, 1.4, -0.3, 1.3], [-1, 1.3, -0.2, 1.2], [0, -0.9, 0.4, 1.4], [0.2, 0.6, -1.3, 1.5]];
puffs.forEach(([x, y, z, r], i) => {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), i % 2 ? cloudDark : cloud);
  m.position.set(x, y, z); m.castShadow = true; addOutline(m, 1.05); body.add(m);
});
const eyeMat = new THREE.MeshBasicMaterial({ color: 0xfff0b0 });
const eyes = [-1, 1].map((s) => {
  const e = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10), eyeMat);
  e.position.set(0.75 * s, 0.45, 1.85); e.scale.set(1, 0.8, 0.4); body.add(e);
  const brow = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.16, 0.2), new THREE.MeshBasicMaterial({ color: 0x1e2032 }));
  brow.position.set(0.72 * s, 0.98, 1.9); brow.rotation.z = -0.4 * s; body.add(brow);
  return e;
});
const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.75, 16, 10), new THREE.MeshBasicMaterial({ color: 0x15162a }));
mouth.position.set(0, -0.45, 1.75); mouth.scale.set(1.4, 0.5, 0.5); body.add(mouth);
for (let i = 0; i < 5; i++) {
  const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.25, 5), eyeMat);
  tooth.position.set(-0.6 + i * 0.3, -0.25, 2.05); tooth.rotation.x = Math.PI; body.add(tooth);
}
// swallowed lights glowing inside
const inner = new THREE.PointLight(0xffd27a, 10, 9, 2); inner.position.y = 0.3; body.add(inner);
// Otis' battery sticking out of its head — only when dazed
const battery = new THREE.Group(); battery.position.y = 2.2; body.add(battery);
{
  const cell = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.1, 16), toon(0xff5a36));
  addOutline(cell, 1.08); battery.add(cell);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.25, 12), toon(0xfbf3e4));
  cap.position.y = 0.65; battery.add(cap);
  const bolt = new THREE.Mesh(new THREE.OctahedronGeometry(0.3), new THREE.MeshBasicMaterial({ color: 0xffe27a }));
  bolt.position.set(0, 0, 0.5); bolt.scale.set(0.5, 1, 0.3); battery.add(bolt);
  battery.add(new THREE.PointLight(0xffe27a, 6, 6, 2));
}
battery.visible = false;
const stars = new THREE.Group(); stars.position.y = 2.6; body.add(stars);
for (let i = 0; i < 4; i++) {
  const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.22), eyeMat);
  const a = (i / 4) * Math.PI * 2; s.position.set(Math.cos(a) * 1.4, 0, Math.sin(a) * 1.4); stars.add(s);
}
stars.visible = false;

// shockwave ring
const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.22, 8, 64), new THREE.MeshBasicMaterial({ color: 0xc9d2ff, transparent: true, opacity: 0.85 }));
ring.rotation.x = Math.PI / 2; ring.visible = false; scene.add(ring);
let ringR = 0;
// warning circle where it is about to land
const marker = new THREE.Mesh(new THREE.RingGeometry(2.2, 2.7, 40), new THREE.MeshBasicMaterial({ color: 0xff5a6e, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }));
marker.rotation.x = -Math.PI / 2; marker.visible = false; scene.add(marker);
const markerFill = new THREE.Mesh(new THREE.CircleGeometry(2.2, 40), new THREE.MeshBasicMaterial({ color: 0xff5a6e, transparent: true, opacity: 0.18, depthWrite: false }));
markerFill.rotation.x = -Math.PI / 2; marker.add(markerFill); markerFill.rotation.x = 0;

// mist balls
const balls = [];
const ballGeo = new THREE.SphereGeometry(0.5, 14, 10);
const ballMat = toon(0x5a5f80);
ballMat.emissive.set(0x1a1d38);
// Mist balls curve toward Josh for the first moment of their flight, then fly straight,
// so you dodge by moving sideways late, not by standing still. More balls per volley each hit.
function fire(target) {
  const n = 1 + boss.hits * 2;                         // 1, then 3, then 5
  const base = target.clone().sub(g.position).setY(0).normalize();
  for (let i = 0; i < n; i++) {
    const spread = (i - (n - 1) / 2) * 0.32;
    const m = new THREE.Mesh(ballGeo, ballMat); addOutline(m, 1.12);
    m.position.copy(g.position).add(V3(0, -0.3, 0));
    scene.add(m);
    const dir = target.clone().sub(m.position).normalize();
    dir.applyAxisAngle(V3(0, 1, 0), spread);
    const speed = 11 + boss.hits * 2;
    balls.push({ m, v: dir.multiplyScalar(speed), speed, life: 4, home: 0.6 });
  }
  puff(g.position.clone().add(base.multiplyScalar(2)), 6, 0x8a90b0, 2, 0.5);
}
function clearBalls() { balls.forEach((b) => scene.remove(b.m)); balls.length = 0; }

export function resetBoss() {
  clearBalls(); ring.visible = false;
  boss.state = 'float'; boss.t = 0; boss.hits = 0; boss.fireT = 2;
  boss.pos.set(C.x, C.y + FLOAT_Y + 3, C.z - 6);
}
const clampArena = (v) => {
  const d = V3(v.x - C.x, 0, v.z - C.z);
  if (d.length() > 11) d.setLength(11);
  return V3(C.x + d.x, v.y, Math.max(C.z + d.z, C.z - 8));   // keep away from the telescope
};

// api: { intro(), damage(from), bounce(vy), shake(s), win(pos) }
export function updateBoss(dt, t, P, prevY, api) {
  const b = boss;
  b.t += dt;
  const player = P.pos, chest = player.clone().add(V3(0, 0.8, 0));
  let squash = 1;

  if (b.state === 'sleep') {
    b.pos.y = C.y + 9 + Math.sin(t * 1.2) * 0.3;
    eyes.forEach((e) => (e.scale.y = 0.08));
    const d = Math.hypot(player.x - C.x, player.z - C.z);
    if (d < ARENA.r + 1 && player.y > C.y - 1) { b.state = 'wake'; b.t = 0; api.intro(); }
  } else if (b.state === 'wake') {
    eyes.forEach((e) => (e.scale.y = Math.min(0.8, b.t * 0.8)));
    squash = 1 + Math.sin(b.t * 18) * 0.06 * Math.min(1, b.t);
    if (b.t > 1.8 && !b.hold) { b.state = 'float'; b.t = 0; }
  } else if (b.state === 'float') {
    const a = t * (0.7 + b.hits * 0.2);
    const tgt = clampArena(V3(player.x + Math.sin(a) * 6, C.y + FLOAT_Y + Math.sin(t * 2) * 0.6, player.z + Math.cos(a) * 6));
    b.pos.lerp(tgt, damp(1.4 + b.hits * 0.4, dt));
    b.fireT -= dt;
    if (b.fireT <= 0) { fire(chest); b.fireT = 1.5 - b.hits * 0.25; squash = 1.15; }
    if (b.t > 5 - b.hits * 0.8) {
      // lock the landing spot NOW and show it on the ground, so there is time to run away
      b.slam.copy(clampArena(V3(player.x, 0, player.z)));
      b.state = 'windup'; b.t = 0;
    }
  } else if (b.state === 'windup') {
    b.pos.y += dt * 3;
    b.pos.x += (b.slam.x - b.pos.x) * damp(4, dt); b.pos.z += (b.slam.z - b.pos.z) * damp(4, dt);
    if (b.t > 1.4 - b.hits * 0.2) { b.state = 'slam'; b.t = 0; b.pos.x = b.slam.x; b.pos.z = b.slam.z; }
  } else if (b.state === 'slam') {
    b.pos.y -= dt * 34;
    if (b.pos.y <= C.y + 1.2) {
      b.pos.y = C.y + 1.2; b.state = 'dazed'; b.t = 0;
      ringR = 3; ring.visible = true; b.hitRing = false;
      puff(b.pos.clone().setY(C.y + 0.3), 22, 0xc9d2ff, 9, 0.6);
      api.shake(0.45);
    }
  } else if (b.state === 'dazed') {
    // squashed low enough that a normal jump gets Josh on top of the battery
    squash = 0.55;
    b.pos.y += (C.y + 0.6 - b.pos.y) * damp(6, dt);
    const top = C.y + 1.9;
    const dh = Math.hypot(player.x - b.pos.x, player.z - b.pos.z);
    if (dh < 2.8 && P.vel.y < 0 && prevY >= top - 0.3 && player.y <= top + 0.5) {
      b.hits++; b.state = 'hurt'; b.t = 0;
      api.bounce(17);
      puff(b.pos.clone().add(V3(0, 2, 0)), 26, 0xffe27a, 7, 3);
      api.shake(0.3);
    } else if (dh < 2.5 && player.y < top - 0.5) {            // push Josh out of the cloud, no damage
      const out = V3(player.x - b.pos.x, 0, player.z - b.pos.z);
      if (out.lengthSq() < 0.01) out.set(0, 0, 1);
      out.setLength(2.55);
      player.x = b.pos.x + out.x; player.z = b.pos.z + out.z;
    }
    if (b.t > 4.2 - b.hits * 0.5) { b.state = 'recover'; b.t = 0; }
  } else if (b.state === 'hurt') {
    squash = 1 + Math.sin(b.t * 30) * 0.12;
    body.visible = Math.floor(b.t * 16) % 2 === 0;
    if (b.t > 1.1) {
      body.visible = true;
      if (b.hits >= 3) { b.state = 'die'; b.t = 0; clearBalls(); }
      else { b.state = 'recover'; b.t = 0; }
    }
  } else if (b.state === 'recover') {
    b.pos.y += (C.y + FLOAT_Y - b.pos.y) * damp(3, dt);
    if (b.t > 0.9) { b.state = 'float'; b.t = 0; b.fireT = 1; }
  } else if (b.state === 'die') {
    squash = Math.max(0.01, 1 - b.t / 2);
    g.rotation.y += dt * (4 + b.t * 10);
    if (Math.random() < 0.5) puff(b.pos.clone().add(V3((Math.random() - 0.5) * 3, Math.random() * 2, (Math.random() - 0.5) * 3)), 3, 0xffe27a, 4, 3);
    if (b.t > 2) { b.state = 'dead'; g.visible = false; api.win(b.pos.clone()); }
  }

  // contact damage only while it's swooping down on you; floating above you is harmless
  if (b.state === 'slam' && b.pos.distanceTo(chest) < 2.5) api.damage(b.pos);
  marker.visible = b.state === 'windup' || b.state === 'slam';
  if (marker.visible) {
    marker.position.set(b.slam.x, C.y + 0.06, b.slam.z);
    marker.material.opacity = 0.45 + Math.sin(t * 18) * 0.3;
  }

  // pose
  g.position.copy(b.pos);
  if (b.state === 'windup') g.position.x += Math.sin(t * 60) * 0.1;
  if (b.state !== 'die') {
    let dy = Math.atan2(player.x - b.pos.x, player.z - b.pos.z) - g.rotation.y;
    g.rotation.y += Math.atan2(Math.sin(dy), Math.cos(dy)) * damp(4, dt);
  }
  const s = body.scale; const tgt = squash;
  s.y += (tgt - s.y) * damp(12, dt); s.x = s.z = 1 + (1 - s.y) * 0.6;
  battery.visible = b.state === 'dazed';
  stars.visible = b.state === 'dazed'; stars.rotation.y = t * 4;
  inner.intensity = 8 + Math.sin(t * 6) * 3;

  // shockwave
  if (ring.visible) {
    ringR += dt * 10;
    ring.scale.setScalar(ringR); ring.position.set(b.slam.x, C.y + 0.35, b.slam.z);
    ring.material.opacity = Math.max(0, 0.85 - ringR / 20);
    const dr = Math.hypot(player.x - b.slam.x, player.z - b.slam.z);
    if (!b.hitRing && Math.abs(dr - ringR) < 0.45 && player.y < C.y + 0.5 && P.grounded) { b.hitRing = true; api.damage(V3(b.slam.x, C.y, b.slam.z)); }
    if (ringR > 17) ring.visible = false;
  }
  // mist balls
  for (let i = balls.length - 1; i >= 0; i--) {
    const m = balls[i];
    if (m.home > 0) {
      m.home -= dt;
      const want = chest.clone().sub(m.m.position).normalize().multiplyScalar(m.speed);
      m.v.lerp(want, damp(2.2, dt)).setLength(m.speed);
    }
    m.m.position.addScaledVector(m.v, dt); m.life -= dt;
    m.m.rotation.x += dt * 4;
    let gone = m.life <= 0 || m.m.position.y < C.y - 2;
    if (m.m.position.distanceTo(chest) < 0.95) { api.damage(m.m.position); gone = true; }
    if (gone) { puff(m.m.position.clone(), 6, 0x8a90b0, 2, 0.5); scene.remove(m.m); balls.splice(i, 1); }
  }
}
export const bossActive = () => !['sleep', 'dead'].includes(boss.state);
export function setBossDead() { boss.state = 'dead'; g.visible = false; clearBalls(); ring.visible = false; }
