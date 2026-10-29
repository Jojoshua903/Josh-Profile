import { THREE, scene, toon, addOutline, V3, damp, puff } from './core.js?v=sub1';
import * as sfx from './sfx.js?v=sub1';
import { getSave } from './save.js?v=sub1';
import { ARENA, PLATEAU_H } from './bos-terrain.js?v=sub1';
import { solid } from './bos-world.js?v=sub1';

// De Woekerzwam: a huge sick mushroom at the far edge of the forest. He stays rooted and attacks the whole arena:
//   knollen  – he spits glowing spore bulbs that land around you and blow up after a few seconds.
//              Jump on one before it does, and it shoots straight back into his face. That's how you hurt him.
//   wortels  – purple circles under you, then roots spike up out of them
//   wortelrij – a line of roots marching out from his body towards you (also his answer to every hit)
//   sporen   – slow clouds of spores that drift after you
// Six hits. Every two hits he gets angrier: more bulbs at once, shorter fuses, faster rhythm.
const C = V3(ARENA.x, ARENA.y, ARENA.z);
const BODY = V3(ARENA.x, PLATEAU_H, ARENA.z - 16);
const H = PLATEAU_H;
const HITS = 6;
export const BOSS_INFO = {
  name: 'De Woekerzwam', sub: 'Hij woekert over het hele bos',
  winTitle: 'Het bos ademt weer!', winSub: 'De Woekerzwam verschrompelt tot een gewone paddenstoel.',
  fail: 'Au! De Woekerzwam was te sterk. Nog een keer!',
  cookie: 'De Woekerzwam verslagen', cookieY: C.y + 1.3, cookieAt: V3(C.x, C.y + 1.3, C.z),
  arena: { x: C.x, y: H, z: C.z, r: ARENA.r },
};
export const boss = { state: 'sleep', t: 0, hits: 0, next: 2.5, plan: 0 };

// the fight was rebuilt: a Woekerzwam beaten in an older version wakes up again, and his cookie is back in play
{
  const { save, gotSet, persist } = getSave('bos');
  if (save.boss && save.bossV !== 3) { save.boss = false; if (gotSet.delete(BOSS_INFO.cookie)) save.rare = Math.max(0, save.rare - 1); }
  if (save.bossV !== 3) { save.bossV = 3; persist(); }
}

// ---------- the body ----------
const purple = toon(0x8a4fb0); purple.emissive.set(0x2a0a40);
const sick = toon(0xb07ad0); sick.emissive.set(0x3a1050);
const stalkM = toon(0xcdb8d8); stalkM.emissive.set(0x1a1028);
const glowG = new THREE.MeshBasicMaterial({ color: 0xb6ff5a });
const body = new THREE.Group(); body.position.copy(BODY); scene.add(body);
const mk = (geo, mat, x, y, z, parent = body, ol = 1.03) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true;
  if (ol) addOutline(m, ol); parent.add(m); return m;
};
mk(new THREE.CylinderGeometry(3.4, 4.4, 15, 16), stalkM, 0, 7.5, 0);
const cap = new THREE.Group(); cap.position.y = 15; body.add(cap);
const dome = mk(new THREE.SphereGeometry(13, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), purple, 0, 0, 0, cap, 1.02); dome.scale.y = 0.5;
mk(new THREE.CylinderGeometry(13, 11, 1, 28), sick, 0, 0, 0, cap, 0);
for (let i = 0; i < 14; i++) {      // glowing blotches and drips
  const a = (i / 14) * Math.PI * 2 + 0.2, d = 4 + (i % 3) * 3;
  const s = new THREE.Mesh(new THREE.SphereGeometry(0.6 + (i % 4) * 0.25, 10, 8), glowG);
  s.position.set(Math.cos(a) * d, 6.5 * Math.sqrt(Math.max(0, 1 - (d / 13) ** 2)) + 0.1, Math.sin(a) * d); s.scale.y = 0.4; cap.add(s);
  const drip = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.8, 6), sick); drip.rotation.x = Math.PI; drip.position.set(Math.cos(a) * 12, -1.2, Math.sin(a) * 12); cap.add(drip);
}
// face on the front of the stalk
const face = new THREE.Group(); face.position.set(0, 10, 3.5); body.add(face);
const FACE = BODY.clone().add(V3(0, 10, 4));
const eyeL = mk(new THREE.SphereGeometry(0.8, 14, 10), glowG, -1.4, 0.6, 0, face, 1.12), eyeR = mk(new THREE.SphereGeometry(0.8, 14, 10), glowG, 1.4, 0.6, 0, face, 1.12);
eyeL.scale.z = eyeR.scale.z = 0.4;
const lids = [-1.4, 1.4].map((x) => mk(new THREE.BoxGeometry(1.9, 1.9, 0.3), stalkM, x, 1.4, 0.2, face, 0));
const mouth = mk(new THREE.SphereGeometry(1.4, 16, 10), new THREE.MeshBasicMaterial({ color: 0x1a0828 }), 0, -1.6, 0, face, 0); mouth.scale.set(1.2, 0.35, 0.3);
for (let i = 0; i < 7; i++) {      // roots spreading out over the plateau
  const a = Math.PI * (0.15 + (i / 6) * 0.7);
  const r = mk(new THREE.CylinderGeometry(0.4, 0.9, 9, 6), purple, Math.cos(a) * 6, 0.3, Math.sin(a) * 6, body, 1.04);
  r.rotation.z = Math.PI / 2; r.rotation.y = -a;
}
solid(BODY.x, BODY.y + 7.5, BODY.z, 7.5, 15, 7.5);
const bodyLight = new THREE.PointLight(0xb6ff5a, 10, 30, 1.6); bodyLight.position.set(BODY.x, BODY.y + 12, BODY.z + 8); scene.add(bodyLight);

// how angry he is: 0, 1, 2 (every two hits)
const phase = () => Math.min(2, Math.floor(boss.hits / 2));

// ---------- hazards ----------
const markGeo = new THREE.RingGeometry(1.0, 1.35, 28), markFill = new THREE.CircleGeometry(1.0, 28);
const rootGeo = new THREE.ConeGeometry(0.32, 2.2, 6);
const inArena = (x, z, edge) => {
  const d = V3(x - C.x, 0, z - C.z);
  if (d.length() > edge) d.setLength(edge);
  return [C.x + d.x, C.z + d.z];
};
const mark = (g, color, size = 1) => {
  const ring = new THREE.Mesh(markGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.scale.setScalar(size); g.add(ring);
  const fill = new THREE.Mesh(markFill, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.2, depthWrite: false })); fill.rotation.x = -Math.PI / 2; fill.scale.setScalar(size); g.add(fill);
  return [ring, fill];
};
const roots = [];
function rootStrike(target, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, r = i === 0 ? 0 : 1.6 + Math.random() * 4;
    const [x, z] = inArena(target.x + Math.cos(a) * r, target.z + Math.sin(a) * r, ARENA.r - 0.8);
    const g = new THREE.Group(); g.position.set(x, H + 0.05, z); scene.add(g);
    const [ring, fill] = mark(g, 0xc06bff);
    const spikes = new THREE.Group(); spikes.visible = false; g.add(spikes);
    for (let j = 0; j < 5; j++) { const s = new THREE.Mesh(rootGeo, purple); s.position.set((j % 3 - 1) * 0.45, 1.1, (j > 2 ? 0.4 : -0.3)); s.rotation.set((Math.random() - 0.5) * 0.5, 0, (Math.random() - 0.5) * 0.5); addOutline(s, 1.08); spikes.add(s); }
    roots.push({ g, ring, fill, spikes, t: -i * 0.08, hit: false });
  }
}
// a line of roots marching out from his body towards you
function rootLine(target) {
  const d = V3(target.x - BODY.x, 0, target.z - BODY.z).normalize();
  for (let i = 0; i < 10; i++) {
    const p = V3(BODY.x, 0, BODY.z).addScaledVector(d, 6 + i * 2.2);
    if (Math.hypot(p.x - C.x, p.z - C.z) > ARENA.r - 0.5) continue;
    rootStrike(p, 1); roots[roots.length - 1].t = -0.3 - i * 0.1;
  }
}
const cloudMat = new THREE.MeshBasicMaterial({ color: 0xb6ff5a, transparent: true, opacity: 0.45, depthWrite: false });
const cloudGeo = new THREE.SphereGeometry(1.3, 14, 10);
const clouds = [];
function sporeClouds(n) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(cloudGeo, cloudMat);
    m.position.set(BODY.x + (i - (n - 1) / 2) * 2.4, H + 9, BODY.z + 5); scene.add(m);
    clouds.push({ m, v: V3(0, 0, 3), t: -i * 0.3, hit: false });
  }
  sfx.spore();
}

// ---------- knollen: his bulbs are your weapon ----------
const KNOL_R = 0.6, BLAST = 2.6;
const knolGeo = new THREE.SphereGeometry(KNOL_R, 16, 12);
const knollen = [];
function spitKnollen(target, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, r = 2.5 + Math.random() * 3.5;
    const [x, z] = inArena(target.x + Math.cos(a) * r, target.z + Math.sin(a) * r, ARENA.r - 1.5);
    const mat = toon(0xb6ff5a); mat.emissive.set(0x2a5a10);
    const m = new THREE.Mesh(knolGeo, mat); m.castShadow = true; addOutline(m, 1.1); scene.add(m);
    const warn = new THREE.Group(); warn.position.set(x, H + 0.05, z); scene.add(warn);
    const [ring, fill] = mark(warn, 0xb6ff5a, BLAST / 1.35);
    knollen.push({ m, mat, warn, ring, fill, state: 'air', t: -i * 0.25, from: FACE.clone().add(V3(0, -1.5, 1)), to: V3(x, H + KNOL_R, z), fuse: [3.6, 3.0, 2.5][phase()] });
  }
  sfx.spore();
}
function removeKnol(k, i) { scene.remove(k.m); scene.remove(k.warn); knollen.splice(i, 1); }
function clearHazards() {
  roots.forEach((r) => scene.remove(r.g)); roots.length = 0;
  clouds.forEach((c) => scene.remove(c.m)); clouds.length = 0;
  knollen.forEach((k) => { scene.remove(k.m); scene.remove(k.warn); }); knollen.length = 0;
}

export function resetBoss() {
  clearHazards();
  boss.state = 'sleep'; boss.t = 0; boss.hits = 0; boss.next = 2.5; boss.plan = 0;
  body.visible = true; body.scale.setScalar(1); body.rotation.z = 0;
}
export const bossActive = () => !['sleep', 'dead'].includes(boss.state);
export function setBossDead() {
  boss.state = 'dead'; clearHazards();
  // what's left: an ordinary, healthy mushroom
  body.scale.setScalar(0.35); dome.material = capHealthy; bodyLight.color.setHex(0xffd9a0); bodyLight.intensity = 4;
  eyeL.visible = eyeR.visible = false; mouth.visible = false;
}
const capHealthy = toon(0xffa24a); capHealthy.emissive.set(0x4a2000);

// api: { intro(), damage(from), bounce(vy), shake(s), win(pos) }
export function updateBoss(dt, t, P, prevY, api) {
  const b = boss;
  b.t += dt;
  const p = P.pos;
  const dist = Math.hypot(p.x - C.x, p.z - C.z);
  // breathing, blinking
  if (b.state !== 'dead') {
    cap.scale.set(1 + Math.sin(t * 1.2) * 0.02, 1 + Math.sin(t * 1.2 + 1) * 0.03, 1 + Math.sin(t * 1.2) * 0.02);
    face.lookAt(p.x, face.getWorldPosition(V3()).y - 1, p.z);
  }
  const awake = b.state !== 'sleep';
  lids.forEach((l) => (l.position.y += ((awake ? 2.4 : 0.6) - l.position.y) * damp(4, dt)));

  if (b.state === 'sleep') {
    if (dist < ARENA.r - 1 && p.y > H - 1) { b.state = 'wake'; b.t = 0; api.intro(); }
  } else if (b.state === 'wake') {
    if (b.t > 0.8 && b.t - dt <= 0.8) { api.shake(0.5); puff(BODY.clone().add(V3(0, 12, 6)), 30, 0xb6ff5a, 8, 3); }
    if (b.t > 2 && !b.hold) { b.state = 'fight'; b.t = 0; b.next = 1.2; b.plan = 0; }
  } else if (b.state === 'fight') {
    // you walked away: he goes back to sleep, and the fight starts over next time
    if (dist > ARENA.r + 8) { resetBoss(); return; }
    b.next -= dt;
    if (b.next <= 0) {
      const ph = phase();
      const plan = [
        ['knol', 'roots', 'spores', 'knol', 'roots'],
        ['knol', 'line', 'knol', 'spores', 'roots'],
        ['knol', 'line', 'roots', 'knol', 'spores', 'line'],
      ][ph];
      let move = plan[b.plan++ % plan.length];
      if (move !== 'knol' && knollen.length === 0 && Math.random() < 0.35) move = 'knol';   // never long without a weapon
      if (move === 'knol') spitKnollen(p, ph + 1);
      else if (move === 'roots') rootStrike(p, 2 + ph);
      else if (move === 'line') rootLine(p);
      else sporeClouds(2 + ph);
      b.next = [2.6, 2.2, 1.8][ph];
      mouth.scale.y = 0.8;
    }
  } else if (b.state === 'hurt') {
    body.rotation.z = Math.sin(b.t * 20) * 0.05 * (1 - b.t / 1.2);
    mouth.scale.y = 0.9;
    if (b.t > 1.2) {
      body.rotation.z = 0;
      if (b.hits >= HITS) { b.state = 'die'; b.t = 0; }
      else { b.state = 'fight'; b.t = 0; b.next = 1.6; rootLine(p); api.shake(0.3); }   // he hits back right away
    }
  } else if (b.state === 'die') {
    const k = Math.min(1, b.t / 2.6);
    body.scale.setScalar(1 - k * 0.65);
    if (Math.random() < 0.6) puff(BODY.clone().add(V3((Math.random() - 0.5) * 14, 10 + Math.random() * 8, (Math.random() - 0.5) * 8)), 3, 0xb6ff5a, 4, 2);
    if (b.t > 2.8) { setBossDead(); api.win(C.clone()); }
  }
  mouth.scale.y += (0.35 - mouth.scale.y) * damp(3, dt);

  // knollen: fly in, tick, blow up – or get kicked back at him
  for (let i = knollen.length - 1; i >= 0; i--) {
    const k = knollen[i]; if (!k) continue;        // getting hit can kill you, and dying clears these lists mid-loop
    k.t += dt;
    if (k.state === 'air') {
      if (k.t < 0) { k.m.visible = k.warn.visible = false; continue; }
      k.m.visible = k.warn.visible = true;
      const e = Math.min(1, k.t / 1.1);
      k.m.position.lerpVectors(k.from, k.to, e); k.m.position.y += Math.sin(e * Math.PI) * 6;
      k.ring.material.opacity = 0.4 + Math.sin(t * 16) * 0.3;
      if (e >= 1) {
        k.state = 'tick'; k.t = 0; puff(k.to.clone(), 8, 0xb6ff5a, 3, 1); sfx.land();
        if (Math.hypot(p.x - k.to.x, p.z - k.to.z) < 1.2 && p.y < H + 1.5) api.damage(k.to);
      }
    } else if (k.state === 'tick') {
      const left = k.fuse - k.t, blink = Math.sin(k.t * (6 + (k.fuse - left) * 10)) > 0;
      k.mat.color.setHex(blink && left < 1.6 ? 0xff5a5a : 0xb6ff5a);
      k.m.scale.setScalar(1 + (1 - left / k.fuse) * 0.35 + (blink ? 0.04 : 0));
      k.ring.material.opacity = left < 1.6 ? 0.5 + Math.sin(t * 24) * 0.3 : 0.25;
      // jump on it: it shoots back into his face
      const top = k.m.position.y + KNOL_R * k.m.scale.x, dh = Math.hypot(p.x - k.m.position.x, p.z - k.m.position.z);
      if (dh < 1.1 && P.vel.y < 0 && prevY >= top - 0.45 && p.y <= top + 0.4) {
        api.bounce(13); sfx.boing(); puff(k.m.position.clone(), 12, 0xb6ff5a, 4, 1);
        k.state = 'kick'; k.t = 0; k.from = k.m.position.clone(); scene.remove(k.warn);
        continue;
      }
      if (left <= 0) {
        puff(k.m.position.clone(), 30, 0xb6ff5a, 7, 2); sfx.pop(); api.shake(0.25);
        if (Math.hypot(p.x - k.to.x, p.z - k.to.z) < BLAST && p.y < H + 2.5) api.damage(k.to);
        removeKnol(k, i);
      }
    } else if (k.state === 'kick') {
      const e = Math.min(1, k.t / 0.55);
      k.m.position.lerpVectors(k.from, FACE, e); k.m.position.y += Math.sin(e * Math.PI) * 3;
      k.m.rotation.x += dt * 20;
      if (e >= 1) {
        removeKnol(k, i);
        if (b.state === 'fight') {
          puff(FACE.clone(), 40, 0xb6ff5a, 9, 3); sfx.pop(); sfx.bossHit(); api.shake(0.6);
          b.hits++; b.state = 'hurt'; b.t = 0;
          roots.forEach((r) => scene.remove(r.g)); roots.length = 0;
        }
      }
    }
  }
  // roots
  for (let i = roots.length - 1; i >= 0; i--) {
    const r = roots[i]; if (!r) continue;
    r.t += dt;
    if (r.t < 0) { r.g.visible = false; continue; }
    r.g.visible = true;
    r.ring.material.opacity = 0.5 + Math.sin(t * 20) * 0.3;
    if (r.t > 0.95 && !r.spikes.visible) { r.spikes.visible = true; r.ring.visible = r.fill.visible = false; puff(r.g.position.clone().add(V3(0, 0.3, 0)), 8, 0xc06bff, 3, 2); }
    if (r.spikes.visible) {
      r.spikes.scale.y = Math.min(1, (r.t - 0.95) / 0.12);
      if (!r.hit && r.t < 1.4 && Math.hypot(p.x - r.g.position.x, p.z - r.g.position.z) < 1.25 && p.y < H + 2) { r.hit = true; api.damage(r.g.position); }
    }
    if (r.t > 1.7) { scene.remove(r.g); roots.splice(i, 1); }
  }
  // spore clouds drift after you
  for (let i = clouds.length - 1; i >= 0; i--) {
    const c = clouds[i]; if (!c) continue;
    c.t += dt;
    if (c.t < 0) continue;
    const want = p.clone().add(V3(0, 0.9, 0)).sub(c.m.position);
    c.v.lerp(want.setLength(2.4 + phase() * 0.5), damp(0.8, dt));
    c.m.position.addScaledVector(c.v, dt);
    c.m.scale.setScalar(1 + Math.sin(t * 4 + i) * 0.08);
    if (!c.hit && c.m.position.distanceTo(p.clone().add(V3(0, 0.8, 0))) < 1.5) { c.hit = true; api.damage(c.m.position); }
    if (c.hit || c.t > 8) { puff(c.m.position.clone(), 10, 0xb6ff5a, 3, 1); scene.remove(c.m); clouds.splice(i, 1); }
  }
}
