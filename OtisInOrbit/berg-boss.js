import { THREE, scene, toon, addOutline, V3, damp, puff } from './core.js?v=muis1';
import { SUMMIT } from './berg-terrain.js?v=muis1';
import { boxes, syncBox } from './berg-world.js?v=muis1';

// De Lawinereus: a giant of rock and snow sleeping on the summit, who wants the top for himself.
// He doesn't shoot or slam like the Lichtvreter. Instead:
//   ijspieken  – he punches the ground and a line of ice spikes races towards you (step aside)
//   ijspegels  – (after the first hit) icicles drop on the shadows around you
//   rollen     – he curls up into a huge snowball and chases you around the summit.
//                Lure him into one of the three rock pillars: he crashes, falls on his back,
//                and the crystal on his belly is open. Jump on it. Every crash costs a pillar.
// Three hits and he rolls down the mountain.

const C = V3(SUMMIT.x, SUMMIT.h, SUMMIT.z);
const EDGE = SUMMIT.r - 2.2;
export const BOSS_INFO = {
  name: 'De Lawinereus', sub: 'Hij wil de top helemaal voor zichzelf',
  winTitle: 'De top is vrij!', winSub: 'De Lawinereus rolt de berg af. Mèèh!',
  fail: 'Au! De Lawinereus was te sterk. Nog een keer!',
  cookie: 'De Lawinereus verslagen', cookieY: C.y + 1.3, cookieAt: V3(C.x, C.y + 1.3, C.z),
};
export const boss = { state: 'sleep', t: 0, hits: 0, pos: C.clone(), dir: V3(0, 0, 1), step: 0, speed: 0 };

// ---------- model ----------
const rock = toon(0x8f8a84), rockDark = toon(0x6d6862), snow = toon(0xf4f7fb);
const g = new THREE.Group(); g.rotation.order = 'YXZ'; scene.add(g);      // YXZ: tipping over happens in his own frame
const hip = new THREE.Group(); hip.position.y = 2; g.add(hip);
const mk = (geo, mat, x, y, z, parent, ol = 1.05) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true;
  if (ol) addOutline(m, ol); parent.add(m); return m;
};
const legs = [-1, 1].map((s) => {
  const p = new THREE.Group(); p.position.set(0.8 * s, 2, 0); g.add(p);
  mk(new THREE.BoxGeometry(0.9, 2, 1), rockDark, 0, -1, 0, p);
  mk(new THREE.BoxGeometry(1.1, 0.5, 1.4), rock, 0, -1.8, 0.15, p);
  return p;
});
const torso = mk(new THREE.DodecahedronGeometry(1.5, 0), rock, 0, 1.3, 0, hip);
torso.scale.set(1.25, 1.05, 0.95);
mk(new THREE.SphereGeometry(1.25, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2.4), snow, 0, 2, -0.1, hip).scale.set(1.5, 0.5, 1.1);
const head = new THREE.Group(); head.position.set(0, 2.5, 0.2); hip.add(head);
mk(new THREE.BoxGeometry(1.1, 0.9, 1), rock, 0, 0, 0, head);
mk(new THREE.BoxGeometry(1.2, 0.25, 1.1), snow, 0, 0.5, 0, head);
const eyeMat = new THREE.MeshBasicMaterial({ color: 0x8fe3ff });
const eyes = [-1, 1].map((s) => {
  const e = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.05), eyeMat); e.position.set(0.25 * s, 0.05, 0.52); head.add(e);
  const brow = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.12), toon(0x4a453f)); brow.position.set(0.25 * s, 0.24, 0.52); brow.rotation.z = -0.35 * s; head.add(brow);
  return e;
});
// the ice crystal in his belly: hidden under snow until he crashes
const crystalMat = toon(0x9ad8ff);
const crystal = mk(new THREE.OctahedronGeometry(0.5), crystalMat, 0, 1.2, 1.35, hip, 1.1);
crystal.scale.set(0.9, 1.2, 0.6);
const crystalLight = new THREE.PointLight(0x8fe3ff, 0, 8, 2); crystal.add(crystalLight);
const bellySnow = mk(new THREE.SphereGeometry(0.75, 12, 10), snow, 0, 1.2, 1.3, hip, 1.05); bellySnow.scale.set(1, 1, 0.5);
const arms = [-1, 1].map((s) => {
  const p = new THREE.Group(); p.position.set(1.9 * s, 1.9, 0); hip.add(p);
  mk(new THREE.BoxGeometry(0.75, 2, 0.8), rockDark, 0, -0.9, 0, p);
  mk(new THREE.DodecahedronGeometry(0.62, 0), rock, 0, -2.05, 0.05, p);
  return p;
});
const stars = new THREE.Group(); hip.add(stars); stars.position.set(0, 3.3, 0.2);
for (let i = 0; i < 4; i++) {
  const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.2), new THREE.MeshBasicMaterial({ color: 0xffe27a }));
  const a = (i / 4) * Math.PI * 2; s.position.set(Math.cos(a) * 1, 0, Math.sin(a) * 1); stars.add(s);
}
stars.visible = false;

// curled up: a giant snowball with bits of rock sticking out
const BALL_R = 2;
const ball = new THREE.Group(); ball.visible = false; scene.add(ball);
mk(new THREE.SphereGeometry(BALL_R, 20, 16), snow, 0, 0, 0, ball, 1.04);
for (let i = 0; i < 9; i++) {
  const a = Math.random() * Math.PI * 2, b = Math.acos(Math.random() * 2 - 1);
  const r = mk(new THREE.DodecahedronGeometry(0.4 + Math.random() * 0.3, 0), rock, 0, 0, 0, ball, 0);
  r.position.setFromSphericalCoords(BALL_R * 0.95, b, a);
}
{ const e = mk(new THREE.BoxGeometry(0.5, 0.15, 0.1), eyeMat, 0.4, 0.4, BALL_R * 0.97, ball, 0); mk(new THREE.BoxGeometry(0.5, 0.15, 0.1), eyeMat, -0.8, 0, 0, e, 0); }

// ---------- the three rock pillars on the summit ----------
const pillarMat = toon(0x9a948a);
const pillars = [90, 210, 330].map((deg) => {
  const a = (deg * Math.PI) / 180, x = C.x + Math.cos(a) * 6, z = C.z + Math.sin(a) * 6;
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.95, 3.2, 7), pillarMat);
  mesh.position.set(x, C.y + 1.6, z); mesh.castShadow = true; addOutline(mesh, 1.05); scene.add(mesh);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.75, 0.35, 7), snow); cap.position.y = 1.7; mesh.add(cap);
  const b = { pos: V3(x, C.y + 1.6, z), half: V3(0.8, 1.6, 0.8), min: V3(), max: V3(), mesh, up: true };
  syncBox(b); boxes.push(b);
  return b;
});
function setPillar(p, up) {
  p.up = up; p.mesh.visible = up;
  const i = boxes.indexOf(p);
  if (up && i < 0) boxes.push(p);
  if (!up && i >= 0) boxes.splice(i, 1);
}

// ---------- ice spikes: lines that race over the ground towards you ----------
const spikeGeo = new THREE.ConeGeometry(0.45, 1.8, 6), spikeMat = toon(0xbfe6ff);
spikeMat.emissive.set(0x1a3040);
const spikes = [];
function spikeLine(angle) {
  const dir = V3(Math.sin(angle), 0, Math.cos(angle));
  for (let i = 0; i < 12; i++) {
    const p = boss.pos.clone().addScaledVector(dir, 1.8 + i * 1.1);
    if (Math.hypot(p.x - C.x, p.z - C.z) > SUMMIT.r - 0.4) break;
    const m = new THREE.Mesh(spikeGeo, spikeMat); addOutline(m, 1.06);
    m.position.set(p.x, C.y - 1, p.z); m.rotation.set((Math.random() - 0.5) * 0.4, 0, (Math.random() - 0.5) * 0.4); m.visible = false; scene.add(m);
    spikes.push({ m, t: -i * 0.07, hit: false });
  }
}
// ---------- icicles: shadows first, then they drop ----------
const icicleGeo = new THREE.ConeGeometry(0.35, 1.6, 6);
const shadowGeo = new THREE.CircleGeometry(1, 24);
const icicles = [];
function dropIcicles(target, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, r = i === 0 ? 0 : 1.2 + Math.random() * 3.5;
    let x = target.x + Math.cos(a) * r, z = target.z + Math.sin(a) * r;
    const d = V3(x - C.x, 0, z - C.z); if (d.length() > SUMMIT.r - 0.6) { d.setLength(SUMMIT.r - 0.6); x = C.x + d.x; z = C.z + d.z; }
    const sh = new THREE.Mesh(shadowGeo, new THREE.MeshBasicMaterial({ color: 0x2b2440, transparent: true, opacity: 0, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2; sh.position.set(x, C.y + 0.04, z); scene.add(sh);
    const m = new THREE.Mesh(icicleGeo, spikeMat); m.rotation.x = Math.PI; m.position.set(x, C.y + 14, z); addOutline(m, 1.06); scene.add(m);
    icicles.push({ sh, m, t: -i * 0.12, x, z });
  }
}
function clearHazards() {
  spikes.forEach((s) => scene.remove(s.m)); spikes.length = 0;
  icicles.forEach((s) => { scene.remove(s.m); scene.remove(s.sh); }); icicles.length = 0;
}

export function resetBoss() {
  clearHazards();
  pillars.forEach((p) => setPillar(p, true));
  boss.state = 'sleep'; boss.t = 0; boss.hits = 0; boss.step = 0;
  boss.pos.copy(C); g.visible = true; ball.visible = false; g.rotation.set(0, 0, 0);
}
const inArena = (v, edge = EDGE) => {
  const d = V3(v.x - C.x, 0, v.z - C.z);
  if (d.length() > edge) d.setLength(edge);
  return V3(C.x + d.x, C.y, C.z + d.z);
};
const tmp = V3();
// what he does next: a small, readable rhythm that gets denser with every hit
const PLAN = [['spikes', 'roll'], ['spikes', 'icicles', 'roll'], ['icicles', 'spikes', 'icicles', 'roll']];

// api: { intro(), damage(from), bounce(vy), shake(s), win(pos) }
export function updateBoss(dt, t, P, prevY, api) {
  const b = boss;
  b.t += dt;
  const p = P.pos;
  const flat = Math.hypot(p.x - b.pos.x, p.z - b.pos.z);
  const faceP = Math.atan2(p.x - b.pos.x, p.z - b.pos.z);
  let crouch = 0, armUp = 0, walking = false, lie = 0;

  if (b.state === 'sleep') {
    crouch = 1;
    eyes.forEach((e) => (e.scale.y = 0.1));
    if (Math.hypot(p.x - C.x, p.z - C.z) < SUMMIT.r + 0.5 && p.y > C.y - 1) { b.state = 'wake'; b.t = 0; api.intro(); }
  } else if (b.state === 'wake') {
    const k = Math.min(1, b.t / 1.6);
    crouch = 1 - k;
    eyes.forEach((e) => (e.scale.y = k));
    if (b.t > 1.6 && b.t - dt <= 1.6) { api.shake(0.5); puff(C.clone().add(V3(0, 1, 0)), 24, 0xffffff, 8, 2); }
    if (b.t > 1.8 && !b.hold) { b.state = 'walk'; b.t = 0; b.step = 0; }
  } else if (b.state === 'walk') {
    walking = true;
    if (flat > 3.5) b.pos.copy(inArena(b.pos.clone().add(V3(Math.sin(faceP), 0, Math.cos(faceP)).multiplyScalar(1.8 * dt))));
    if (b.t > 1.2 - b.hits * 0.25) {
      const plan = PLAN[Math.min(b.hits, 2)];
      const next = plan[b.step % plan.length]; b.step++;
      b.state = next === 'spikes' ? 'punch' : next === 'icicles' ? 'roar' : 'curl'; b.t = 0;
    }
  } else if (b.state === 'punch') {
    // fists up… and down into the snow
    armUp = b.t < 0.6 ? b.t / 0.6 : Math.max(0, 1 - (b.t - 0.6) * 6);
    if (b.t > 0.6 && b.t - dt <= 0.6) {
      const n = b.hits === 0 ? 1 : 3;
      for (let i = 0; i < n; i++) spikeLine(faceP + (i - (n - 1) / 2) * 0.45);
      api.shake(0.3); puff(b.pos.clone().add(V3(Math.sin(faceP) * 1.8, 0.3, Math.cos(faceP) * 1.8)), 14, 0xffffff, 5, 1);
    }
    if (b.t > 1.4) { b.state = 'walk'; b.t = 0; }
  } else if (b.state === 'roar') {
    armUp = 0.6 + Math.sin(b.t * 20) * 0.1;
    hip.rotation.x = -0.3;
    if (b.t > 0.5 && b.t - dt <= 0.5) { dropIcicles(p, 5 + b.hits * 2); api.shake(0.35); }
    if (b.t > 1.3) { b.state = 'walk'; b.t = 0; }
  } else if (b.state === 'curl') {
    crouch = Math.min(1, b.t / 0.5);
    if (b.t > 0.6) {
      b.state = 'roll'; b.t = 0; g.visible = false; ball.visible = true;
      b.dir.set(Math.sin(faceP), 0, Math.cos(faceP)); b.speed = 3;
      puff(b.pos.clone().add(V3(0, 1, 0)), 16, 0xffffff, 5, 1);
    }
  } else if (b.state === 'roll') {
    // chase Josh, but turn slowly: run past a pillar and let him follow you into it
    b.speed = Math.min(7 + b.hits * 1.4, b.speed + dt * 6);
    const want = Math.atan2(p.x - b.pos.x, p.z - b.pos.z), cur = Math.atan2(b.dir.x, b.dir.z);
    const turn = Math.atan2(Math.sin(want - cur), Math.cos(want - cur));
    const na = cur + Math.max(-1, Math.min(1, turn)) * (1.25 + b.hits * 0.15) * dt;
    b.dir.set(Math.sin(na), 0, Math.cos(na));
    b.pos.addScaledVector(b.dir, b.speed * dt);
    // bounce back off the edge of the summit
    const off = V3(b.pos.x - C.x, 0, b.pos.z - C.z);
    if (off.length() > EDGE) {
      off.normalize(); b.dir.reflect(off).normalize(); b.pos.copy(inArena(b.pos, EDGE - 0.05));
      api.shake(0.15); puff(b.pos.clone().add(V3(0, 0.5, 0)), 8, 0xffffff, 3, 1);
    }
    ball.position.set(b.pos.x, C.y + BALL_R, b.pos.z);
    ball.rotateOnWorldAxis(tmp.set(b.dir.z, 0, -b.dir.x), (b.speed * dt) / BALL_R);
    if (Math.random() < 0.5) puff(V3(b.pos.x - b.dir.x * 1.8, C.y + 0.2, b.pos.z - b.dir.z * 1.8), 1, 0xffffff, 1, 0.5);
    if (flat < BALL_R + 0.3 && p.y < C.y + BALL_R * 2) api.damage(b.pos);
    for (const pl of pillars) {
      if (!pl.up || Math.hypot(pl.pos.x - b.pos.x, pl.pos.z - b.pos.z) > BALL_R + 0.85) continue;
      // CRASH: the pillar shatters, he unrolls and falls on his back
      setPillar(pl, false);
      puff(pl.pos.clone(), 30, 0x9a948a, 9, 3); puff(b.pos.clone().add(V3(0, 1.5, 0)), 24, 0xffffff, 8, 3);
      api.shake(0.6);
      b.state = 'down'; b.t = 0; ball.visible = false; g.visible = true;
      g.rotation.y = Math.atan2(-b.dir.x, -b.dir.z);       // he lands facing back the way he came
      break;
    }
    if (b.state === 'roll' && b.t > 7) {                   // dizzy from rolling: he just stops
      b.state = 'walk'; b.t = 0; ball.visible = false; g.visible = true;
    }
  } else if (b.state === 'down') {
    lie = 1;
    crystal.getWorldPosition(tmp);
    const top = tmp.y + 0.4;
    const dh = Math.hypot(p.x - tmp.x, p.z - tmp.z);
    if (dh < 1.7 && P.vel.y < 0 && prevY >= top - 0.4 && p.y <= top + 0.6) {
      b.hits++; b.state = 'hurt'; b.t = 0;
      api.bounce(17);
      puff(tmp.clone().add(V3(0, 0.5, 0)), 26, 0x9ad8ff, 7, 3);
      api.shake(0.35);
    }
    if (b.t > 4.2 - b.hits * 0.6) { b.state = 'getup'; b.t = 0; }
  } else if (b.state === 'hurt') {
    lie = 1;
    g.visible = Math.floor(b.t * 16) % 2 === 0;
    if (b.t > 1.1) {
      g.visible = true;
      if (b.hits >= 3) { b.state = 'die'; b.t = 0; clearHazards(); }
      else { b.state = 'getup'; b.t = 0; }
    }
  } else if (b.state === 'getup') {
    lie = Math.max(0, 1 - b.t / 0.8);
    if (b.t > 0.9) { b.state = 'walk'; b.t = 0; b.step = 0; }
  } else if (b.state === 'die') {
    lie = 1;
    g.rotation.z = Math.min(1.5, b.t * 1.2);
    b.pos.y = C.y - b.t * b.t * 0.8;
    if (Math.random() < 0.6) puff(b.pos.clone().add(V3((Math.random() - 0.5) * 3, 1 + Math.random() * 2, (Math.random() - 0.5) * 3)), 3, 0xffffff, 4, 2);
    if (b.t > 2.2) { b.state = 'dead'; g.visible = false; api.win(V3(C.x, C.y, C.z)); }
  }

  // bumping into him while he's standing hurts
  if (['walk', 'punch', 'roar', 'curl'].includes(b.state) && flat < 1.7 && p.y < C.y + 4.5) api.damage(b.pos);
  // lying down he's solid: you can't walk through him
  if ((b.state === 'down' || b.state === 'hurt') && flat < 1.3 && p.y < C.y + 1.2) {
    const out = V3(p.x - b.pos.x, 0, p.z - b.pos.z); if (out.lengthSq() < 0.01) out.set(0, 0, 1);
    out.setLength(1.35); p.x = b.pos.x + out.x; p.z = b.pos.z + out.z;
  }

  // pose
  g.position.copy(b.pos);
  if (['walk', 'punch', 'roar', 'curl', 'wake'].includes(b.state)) {
    const dy = faceP - g.rotation.y;
    g.rotation.y += Math.atan2(Math.sin(dy), Math.cos(dy)) * damp(b.state === 'punch' ? 1.5 : 5, dt);
  }
  g.rotation.x += (-lie * 1.45 - g.rotation.x) * damp(8, dt);
  g.position.y = b.pos.y;
  hip.position.y += (2 - crouch * 1.3 - hip.position.y) * damp(10, dt);
  if (b.state !== 'roar') hip.rotation.x += (crouch * 0.5 - hip.rotation.x) * damp(8, dt);
  legs.forEach((l, i) => {
    l.rotation.x = walking ? Math.sin(t * 6 + i * Math.PI) * 0.4 : 0;
    l.scale.y = 1 - crouch * 0.55; l.position.y = 2 - crouch * 1.1;
  });
  arms.forEach((a, i) => {
    const swing = walking ? Math.sin(t * 6 + i * Math.PI) * 0.4 : 0;
    a.rotation.x += (-armUp * 2.9 + swing - a.rotation.x) * damp(12, dt);
    a.rotation.z = (i ? 1 : -1) * (lie ? 0.9 : 0.15);
  });
  const weak = b.state === 'down';
  bellySnow.visible = !weak && b.state !== 'hurt';
  crystalMat.emissive.setHex(weak ? 0x3aa8ff : 0x10202a);
  crystalLight.intensity = weak ? 7 + Math.sin(t * 10) * 3 : 0;
  crystal.rotation.z = t * 2;
  stars.visible = weak; stars.rotation.y = t * 4;

  // ice spikes
  for (let i = spikes.length - 1; i >= 0; i--) {
    const s = spikes[i];
    s.t += dt;
    if (s.t < 0) continue;
    s.m.visible = true;
    s.m.position.y = C.y - 1 + Math.min(1, s.t / 0.12) * 1.85;
    if (!s.hit && s.t < 0.35 && Math.hypot(p.x - s.m.position.x, p.z - s.m.position.z) < 0.85 && p.y < C.y + 1.4) { s.hit = true; api.damage(s.m.position); }
    if (s.t > 1.3) { puff(s.m.position.clone(), 4, 0xbfe6ff, 2, 1); scene.remove(s.m); spikes.splice(i, 1); }
  }
  // icicles
  for (let i = icicles.length - 1; i >= 0; i--) {
    const s = icicles[i];
    s.t += dt;
    if (s.t < 0) continue;
    const k = Math.min(1, s.t / 1.1);
    s.sh.material.opacity = 0.15 + k * 0.35; s.sh.scale.setScalar(0.4 + k * 0.6);
    if (s.t > 1.1) {
      s.m.position.y -= dt * 40;
      if (s.m.position.y <= C.y + 0.8) {
        if (Math.hypot(p.x - s.x, p.z - s.z) < 1.05 && p.y < C.y + 1.6) api.damage(s.m.position);
        puff(V3(s.x, C.y + 0.4, s.z), 10, 0xbfe6ff, 4, 1.5);
        scene.remove(s.m); scene.remove(s.sh); icicles.splice(i, 1);
      }
    }
  }
}
export const bossActive = () => !['sleep', 'dead'].includes(boss.state);
export function setBossDead() { boss.state = 'dead'; g.visible = false; ball.visible = false; clearHazards(); pillars.forEach((p) => setPillar(p, false)); }

// asleep: a heap of rock and snow in the middle of the summit
g.position.copy(C); hip.position.y = 0.7; hip.rotation.x = 0.5;
legs.forEach((l) => { l.scale.y = 0.45; l.position.y = 0.9; });
