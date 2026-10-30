import { THREE, scene, toon, addOutline, V3, damp, puff, toast } from './core.js';
import * as sfx from './sfx.js';
import { ARENA, TOP } from './water-terrain.js';
import { boxes } from './water-world.js';

// Kapitein Kraak: a hermit crab in a pirate hat, working for Kayo & Yara. His "shell" is the kettle of sun
// magma they gave him: as long as it boils, the sea stays warm and Deniz' ice keeps melting.
//   stormloop – turns sideways and charges across the reef. If he slams into the edge he OVERHEATS:
//               the lid pops open and he stands there panting. Freeze him then (Vries, F), jump on the frozen
//               kettle and ground-pound it. That's the only way to hurt him.
//   knip      – walks up and slams his big claw down: a shock wave rolls out (jump over it).
//   bubbels   – the kettle spits; circles on the floor turn into jets of boiling steam.
//   golf      – (angry) he tips the kettle and a wave of boiling water rolls over half the reef. Jump it.
// Six hits, in three rounds of two. He gets faster every round.
const C = V3(ARENA.x, TOP, ARENA.z);
const H = TOP;
const HITS = 6;
export const boss = { state: 'sleep', t: 0, hits: 0, plan: 0, move: null, ms: '', mt: 0, next: 1.5 };
export const BOSS_INFO = {
  name: 'Kapitein Kraak', sub: 'Met een ketel vol zonnemagma op zijn rug',
  winTitle: 'De zee koelt af!', winSub: 'De magmaketel is gedoofd. Het ijs kan weer groeien.',
  fail: 'Au! Kapitein Kraak was te sterk. Nog een keer!',
  cookie: 'Kapitein Kraak verslagen', cookieY: H + 1.3, cookieAt: V3(C.x, H + 1.3, C.z),
  arena: { x: C.x, y: H, z: C.z, r: ARENA.r },
};

// ---------- the crab ----------
const red = toon(0xe0503a), redDark = toon(0xb0302a), copper = toon(0xc87838), copperDark = toon(0x8a4a20), black = toon(0x1a1a24);
const hotMat = new THREE.MeshBasicMaterial({ color: 0xff7a1a });
const frozenMat = new THREE.MeshLambertMaterial({ color: 0xbfeaff, transparent: true, opacity: 0.6, depthWrite: false });
const mk = (geo, mat, x, y, z, parent, ol = 1.05) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; if (ol) addOutline(m, ol); parent.add(m); return m; };
const crab = new THREE.Group(); scene.add(crab);
const bodyG = new THREE.Group(); crab.add(bodyG);
mk(new THREE.SphereGeometry(1.6, 20, 14), red, 0, 1.2, 0.4, bodyG).scale.set(1.25, 0.6, 1);
// eyes on stalks
const eyes = [-1, 1].map((s) => {
  const g = new THREE.Group(); g.position.set(0.5 * s, 1.6, 1.3); bodyG.add(g);
  mk(new THREE.CylinderGeometry(0.08, 0.1, 0.8), redDark, 0, 0.4, 0, g, 0);
  mk(new THREE.SphereGeometry(0.22, 12, 10), toon(0xffffff), 0, 0.85, 0, g);
  const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), black); pupil.position.set(0, 0.86, 0.17); g.add(pupil);
  return g;
});
// a pirate hat between the eyes
{
  const hat = new THREE.Group(); hat.position.set(0, 2.25, 1.2); bodyG.add(hat);
  mk(new THREE.CylinderGeometry(0.75, 0.75, 0.1, 3), black, 0, 0, 0, hat, 1.06).rotation.y = Math.PI / 6;
  mk(new THREE.CylinderGeometry(0.35, 0.45, 0.4, 12), black, 0, 0.22, 0, hat, 0);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), toon(0xffffff)); skull.position.set(0, 0.25, 0.42); hat.add(skull);
}
// claws: a small one and a huge one
const claw = (s, size) => {
  const g = new THREE.Group(); g.position.set(1.7 * s, 1.1, 1.2); bodyG.add(g);
  mk(new THREE.CylinderGeometry(0.2 * size, 0.25 * size, 1.1 * size), red, 0, 0, 0.4 * size, g, 0).rotation.x = Math.PI / 2;
  const top = mk(new THREE.SphereGeometry(0.6 * size, 14, 10), red, 0, 0.15 * size, 1.15 * size, g); top.scale.set(0.8, 0.45, 1.3);
  const bot = mk(new THREE.SphereGeometry(0.5 * size, 12, 10), redDark, 0, -0.2 * size, 1.05 * size, g); bot.scale.set(0.7, 0.35, 1.1);
  return g;
};
const clawL = claw(-1, 1), clawR = claw(1, 1.7);
// legs
const legs = [];
for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
  const g = new THREE.Group(); g.position.set(1.6 * s, 0.9, -0.3 + i * 0.6); bodyG.add(g);
  const l = mk(new THREE.CylinderGeometry(0.1, 0.07, 1.4), redDark, 0.5 * s, -0.4, 0, g, 0); l.rotation.z = 0.9 * s;
  legs.push({ g, s, i });
}
// the kettle on his back
const kettle = new THREE.Group(); kettle.position.set(0, 1.6, -0.9); kettle.rotation.x = -0.35; bodyG.add(kettle);
mk(new THREE.CylinderGeometry(1.3, 1.5, 1.9, 20), copper, 0, 0.95, 0, kettle);
mk(new THREE.TorusGeometry(1.42, 0.1, 6, 24), copperDark, 0, 0.45, 0, kettle, 0).rotation.x = Math.PI / 2;
mk(new THREE.CylinderGeometry(0.16, 0.24, 1.2), copper, 0, 1.4, 1.4, kettle, 0).rotation.x = 1.1;
const glow = new THREE.Mesh(new THREE.CircleGeometry(1.2, 20), hotMat); glow.rotation.x = -Math.PI / 2; glow.position.y = 1.88; kettle.add(glow);
const lid = new THREE.Group(); lid.position.set(0, 1.92, -1.2); kettle.add(lid);
mk(new THREE.CylinderGeometry(1.32, 1.32, 0.14, 20), copperDark, 0, 0, 1.2, lid);
mk(new THREE.SphereGeometry(0.18, 8, 6), copperDark, 0, 0.15, 1.2, lid, 0);
const kLight = new THREE.PointLight(0xff8a2a, 5, 10, 1.6); kLight.position.set(0, 2.4, 0); kettle.add(kLight);
// a coat of ice for when he's frozen
const iceCoat = new THREE.Mesh(new THREE.SphereGeometry(2.5, 18, 12), frozenMat); iceCoat.scale.set(1.15, 0.85, 1.1); iceCoat.position.y = 1.6; iceCoat.visible = false; crab.add(iceCoat);
// standing on him only works while he's frozen
const FROZEN_Y = 0.5;   // frozen he sags flat under the ice, so the top (H + 1.7) is in reach of a normal jump
const crabBox = { pos: V3(), half: V3(2.1, 0.85, 2.1), min: V3(), max: V3(), crabBox: true };
const syncCrab = () => { crabBox.pos.set(crab.position.x, H + 0.85, crab.position.z); crabBox.min.copy(crabBox.pos).sub(crabBox.half); crabBox.max.copy(crabBox.pos).add(crabBox.half); };
function setSolid(on) { const i = boxes.indexOf(crabBox); if (on && i < 0) { syncCrab(); boxes.push(crabBox); } else if (!on && i >= 0) boxes.splice(i, 1); }

// ---------- hazards (cool colours, so you can see them on the pink reef and against the hot kettle) ----------
const WAVE_H = 0.6, WAVE_W = 0.35;
const ringGeo = new THREE.CylinderGeometry(1, 1, WAVE_H, 48, 1, true);
const ringMat = new THREE.MeshBasicMaterial({ color: 0x3a6aff, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false });
const rings = [], jets = [];
function shockwave(at) { const m = new THREE.Mesh(ringGeo, ringMat.clone()); m.position.set(at.x, H + WAVE_H / 2, at.z); scene.add(m); rings.push({ m, r: 1.5, hit: false }); }
const markGeo = new THREE.RingGeometry(1.0, 1.3, 28), markFill = new THREE.CircleGeometry(1.0, 28);
const mark = (color, x, z, s = 1) => {
  const g = new THREE.Group(); g.position.set(x, H + 0.05, z); g.scale.setScalar(s); scene.add(g);
  const ring = new THREE.Mesh(markGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false })); ring.rotation.x = -Math.PI / 2; g.add(ring);
  const fill = new THREE.Mesh(markFill, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3, depthWrite: false })); fill.rotation.x = -Math.PI / 2; g.add(fill);
  return { g, ring, fill };
};
const steamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false });
function steamJets(p, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, r = i === 0 ? 0 : 2 + Math.random() * 5;
    const d = V3(p.x + Math.cos(a) * r - C.x, 0, p.z + Math.sin(a) * r - C.z); if (d.length() > ARENA.r - 1.2) d.setLength(ARENA.r - 1.2);
    jets.push({ ...mark(0x2a4aff, C.x + d.x, C.z + d.z, 1.2), x: C.x + d.x, z: C.z + d.z, t: -i * 0.12, col: null });
  }
}
// the boiling wave: a half ring rolling out from the crab
const waveGeo = new THREE.CylinderGeometry(1, 1, 0.9, 40, 1, true, 0, Math.PI);
const waveMat = new THREE.MeshBasicMaterial({ color: 0x3a6aff, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false });
let wave = null, half = null;
function clearHazards() {
  rings.forEach((r) => scene.remove(r.m)); rings.length = 0;
  jets.forEach((j) => { scene.remove(j.g); if (j.col) scene.remove(j.col); }); jets.length = 0;
  if (wave) { scene.remove(wave.m); wave = null; }
  if (half) { scene.remove(half); half = null; }
  if (boss.line) { scene.remove(boss.line); boss.line = null; }
}

// ---------- reset / dead ----------
function pose() {
  crab.rotation.set(0, 0, 0); bodyG.position.set(0, 0, 0); bodyG.rotation.set(0, 0, 0);
  lid.rotation.x = 0; clawR.rotation.set(0, 0, 0); clawL.rotation.set(0, 0, 0); kettle.rotation.set(-0.35, 0, 0); kettle.position.set(0, 1.6, -0.9);
  iceCoat.visible = false; glow.material = hotMat; crab.scale.y = 1; setSolid(false);
}
export function resetBoss() {
  clearHazards(); pose();
  Object.assign(boss, { state: 'sleep', t: 0, hits: 0, plan: 0, move: null, ms: '', mt: 0, next: 1.5, hold: false, noVries: false, warmHint: false, wasPound: false });
  crab.position.copy(C); crab.visible = true; kettle.visible = true;
}
export const bossActive = () => !['sleep', 'dead'].includes(boss.state);
export function setBossDead() {
  boss.state = 'dead'; clearHazards(); pose();
  // what's left: an upside-down crab shell and a cold, grey kettle
  crab.visible = false;
}
resetBoss();

// ---------- the fight ----------
const phase = () => Math.min(2, Math.floor(boss.hits / 2));
const speed = () => 1 + boss.hits * 0.08;
const PLANS = [['stormloop', 'knip', 'bubbels', 'stormloop'], ['bubbels', 'stormloop', 'knip', 'golf', 'stormloop'], ['golf', 'stormloop', 'bubbels', 'knip', 'stormloop', 'golf', 'stormloop']];
const LINES = ['KAPITEIN KRAAK: AU! Mijn ketel!', 'KAPITEIN KRAAK: Arr, dat was koud!', 'KAPITEIN KRAAK: Kayo & Yara betalen me niet genoeg voor dit!', 'KAPITEIN KRAAK: Mijn scharen! Mijn mooie scharen!', 'KAPITEIN KRAAK: Er zit een barst in mijn ketel!', 'KAPITEIN KRAAK: NEEEE…'];
const ease = (k) => k * k * (3 - 2 * k);
function face(p, dt, rate = 4, side = 0) {
  const want = Math.atan2(p.x - crab.position.x, p.z - crab.position.z) + side;
  const d = Math.atan2(Math.sin(want - crab.rotation.y), Math.cos(want - crab.rotation.y));
  crab.rotation.y += d * damp(rate, dt);
}
function keepIn(margin = 2.6) {
  const d = V3(crab.position.x - C.x, 0, crab.position.z - C.z);
  if (d.length() > ARENA.r - margin) { d.setLength(ARENA.r - margin); crab.position.x = C.x + d.x; crab.position.z = C.z + d.z; return true; }
  return false;
}
function scuttle(t, fast) { legs.forEach((l) => (l.g.rotation.x = Math.sin(t * (fast ? 30 : 12) + l.i * 2 + (l.s > 0 ? 1 : 0)) * 0.5)); }
function startMove() { const plan = PLANS[phase()]; boss.move = plan[boss.plan++ % plan.length]; boss.mt = 0; boss.ms = 'start'; }
function endMove() { boss.move = null; boss.ms = ''; boss.next = phase() === 2 ? 0.5 : phase() ? 0.8 : 1.1; }

// a frost shot from Josh (Vries): returns true if it hit the crab
export function frostHit(at) {
  if (!bossActive() || boss.state === 'wake') return false;
  if (at.distanceTo(crab.position.clone().add(V3(0, 1.6, 0))) > 3) return false;
  if (boss.state === 'fight' && boss.move === 'stormloop' && boss.ms === 'hot') {
    boss.ms = 'frozen'; boss.mt = 0; iceCoat.visible = true; glow.material = frozenMat; crab.scale.y = FROZEN_Y; setSolid(true);
    puff(crab.position.clone().add(V3(0, 2, 0)), 30, 0xbfeaff, 6, 2); sfx.clank();
    if (!boss.frozeHint) { boss.frozeHint = true; toast('Bevroren! Spring op zijn ketel en doe een ground pound!'); }
  } else {
    puff(at.clone(), 10, 0xffffff, 3, 2);
    if (!boss.warmHint) { boss.warmHint = true; toast('Psss! Het ijs smelt meteen. Wacht tot hij oververhit is.'); }
  }
  return true;
}

// api: { intro(), damage(from), bounce(vy), shake(s), win(pos) }
export function updateBoss(dt, t, P, prevY, api) {
  const b = boss;
  b.t += dt; b.mt += dt;
  const p = P.pos;
  const dist = Math.hypot(p.x - C.x, p.z - C.z);
  eyes.forEach((e, i) => (e.rotation.z = Math.sin(t * 3 + i) * 0.15));
  if (b.state !== 'dead' && kettle.visible && Math.random() < dt * 6) puff(kettle.localToWorld(V3(0, 2.1, 1.9)), 1, 0xffffff, 1.5, 3);

  if (b.state === 'sleep') {
    bodyG.position.y = Math.sin(t * 1.5) * 0.05; lid.rotation.x = -Math.abs(Math.sin(t * 2)) * 0.1;
    if (dist < ARENA.r - 1 && p.y > H - 0.5) { b.state = 'wake'; b.t = 0; api.intro(); }
    return;
  }
  if (b.state === 'dead') return;
  // his body pushes you away
  if (b.ms !== 'frozen') {
    const dx = p.x - crab.position.x, dz = p.z - crab.position.z, L = Math.hypot(dx, dz);
    if (L < 2.5 && p.y < H + 3.4) { const k = (2.5 - L) / Math.max(L, 0.01); p.x += dx * k; p.z += dz * k; }
  }

  if (b.state === 'wake') {
    face(p, dt, 3); bodyG.position.y = Math.abs(Math.sin(t * 4)) * 0.15;
    clawR.rotation.x = -0.6 + Math.sin(t * 5) * 0.3;
    if (b.t > 2 && !b.hold) { b.state = 'fight'; b.t = 0; b.next = 0.8; }
    return;
  }
  if (b.state === 'hurt') {
    crab.rotation.y += dt * 14 * Math.max(0, 1 - b.t / 1.4); bodyG.position.y = Math.abs(Math.sin(t * 20)) * 0.2;
    if (b.t > 1.6) {
      if (b.hits >= HITS) { b.state = 'die'; b.t = 0; sfx.wake(); }
      else { b.state = 'fight'; b.t = 0; endMove(); b.next = 0.9; if (b.hits === 2) toast('KAPITEIN KRAAK: ARR! Nu wordt het menens. KOKENDE GOLF!'); if (b.hits === 4) toast('Kapitein Kraak is WOEDEND! Laatste ronde!'); }
    }
    return;
  }
  if (b.state === 'die') {
    // he flips over, the kettle rolls off and cools, and the captain scuttles off into the sea
    const k = Math.min(1, b.t / 0.8);
    crab.rotation.z = Math.PI * ease(k); crab.position.y = H + Math.sin(k * Math.PI) * 2;
    kettle.position.x = Math.min(4, b.t * 3); glow.material = frozenMat; kLight.intensity = Math.max(0, 5 - b.t * 3);
    if (b.t > 1 && !b.splashed) { b.splashed = true; puff(crab.position.clone().add(V3(0, 1, 0)), 40, 0xbfeaff, 8, 2); sfx.smash(); api.shake(0.8); }
    if (b.t > 2.2) { crab.rotation.z = 0; crab.position.y = H; crab.position.x += dt * 12; scuttle(t, true); }
    if (b.t > 3.6) { b.splashed = false; setBossDead(); api.win(C.clone()); }
    return;
  }

  // ---------- fight ----------
  const ph = phase(), sp = speed();
  if (b.ms === 'frozen' && P.pound === 0 && b.wasPound && P.grounded && P.ground === crabBox) {
    b.hits++; b.state = 'hurt'; b.t = 0; clearHazards(); pose(); endMove();
    api.bounce(14); puff(crab.position.clone().add(V3(0, 3, 0)), 34, 0xffe080, 7, 2); sfx.bossHit(); api.shake(0.6);
    toast(LINES[(b.hits - 1) % LINES.length]);
    b.wasPound = false;
    return;
  }
  b.wasPound = P.pound === 2;
  if (!b.move) {
    b.next -= dt;
    face(p, dt, 5);
    const dx = p.x - crab.position.x, dz = p.z - crab.position.z, L = Math.hypot(dx, dz);
    if (L > 6) { crab.position.x += (dx / L) * 2.2 * sp * dt; crab.position.z += (dz / L) * 2.2 * sp * dt; scuttle(t, false); }
    keepIn();
    if (b.next <= 0) startMove();
  } else if (b.move === 'stormloop') {
    if (b.ms === 'start') {
      // aim: he turns his side to you and a blue line shows where he's going to run
      b.dir = V3(p.x - crab.position.x, 0, p.z - crab.position.z).normalize();
      if (b.line) scene.remove(b.line);
      b.line = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 30), new THREE.MeshBasicMaterial({ color: 0x2a4aff, transparent: true, opacity: 0.5, depthWrite: false }));
      b.line.rotation.x = -Math.PI / 2; scene.add(b.line);
      b.ms = 'aim'; b.mt = 0; sfx.scanStart();
    } else if (b.ms === 'aim') {
      if (b.mt < 0.5 / sp) b.dir.lerp(V3(p.x - crab.position.x, 0, p.z - crab.position.z).normalize(), damp(4, dt)).normalize();
      crab.rotation.y += (Math.atan2(b.dir.x, b.dir.z) - Math.PI / 2 - crab.rotation.y) * damp(8, dt);
      b.line.position.set(crab.position.x + b.dir.x * 15, H + 0.06, crab.position.z + b.dir.z * 15);
      b.line.rotation.z = Math.atan2(-b.dir.x, -b.dir.z);
      b.line.material.opacity = 0.35 + Math.sin(t * 16) * 0.25;
      scuttle(t, true); bodyG.position.y = -0.15;
      if (b.mt > 1.0 / sp) { b.ms = 'run'; b.mt = 0; sfx.jump(3); }
    } else if (b.ms === 'run') {
      crab.position.addScaledVector(b.dir, (12 + ph * 2) * dt); scuttle(t, true); bodyG.position.y = Math.abs(Math.sin(t * 25)) * 0.1;
      if (Math.random() < 0.5) puff(crab.position.clone().add(V3(0, 0.3, 0)), 1, 0xffffff, 2, 1);
      if (Math.hypot(p.x - crab.position.x, p.z - crab.position.z) < 2.7 && p.y < H + 2.6) api.damage(crab.position.clone());
      if (keepIn(2.4)) {
        // BANG against the edge: overheated
        b.ms = 'hot'; b.mt = 0; if (b.line) { scene.remove(b.line); b.line = null; }
        api.shake(0.7); sfx.smash(); puff(crab.position.clone().add(V3(0, 1.5, 0)), 24, 0xffd0a0, 6, 2);
        shockwave(crab.position.clone());
        if (P.ability !== 'vries' && !b.noVries) { b.noVries = true; toast('Hij is oververhit! Zonder Vries kun je hem niet bevriezen: kopieer het ijsgeestje aan de rand van het rif.'); }
      }
    } else if (b.ms === 'hot') {
      // lid open, steaming, glowing: this is the moment
      lid.rotation.x = -1.3 + Math.sin(t * 20) * 0.1; bodyG.position.y = -0.1 + Math.sin(t * 6) * 0.08;
      kLight.intensity = 8 + Math.sin(t * 15) * 3;
      if (Math.random() < 0.6) puff(kettle.localToWorld(V3(0, 2.2, 0)), 2, 0xffffff, 3, 4);
      if (b.mt > (ph === 2 ? 2.4 : ph ? 2.8 : 3.3)) { b.ms = 'cool'; b.mt = 0; }
    } else if (b.ms === 'frozen') {
      // frozen solid for a moment: jump on him and pound
      lid.rotation.x = -1.3; syncCrab();
      iceCoat.material.opacity = 0.6 + (b.mt > 2.6 ? Math.sin(t * 25) * 0.2 : 0);
      if (b.mt > 3.4) { iceCoat.visible = false; glow.material = hotMat; crab.scale.y = 1; setSolid(false); puff(crab.position.clone().add(V3(0, 2, 0)), 20, 0xffffff, 5, 2); b.ms = 'cool'; b.mt = 0; }
    } else if (b.ms === 'cool') {
      lid.rotation.x += (0 - lid.rotation.x) * damp(5, dt); kLight.intensity = 5;
      if (b.mt > 0.5) endMove();
    }
  } else if (b.move === 'knip') {
    if (b.ms === 'start') { b.ms = 'walk'; b.mt = 0; }
    if (b.ms === 'walk') {
      face(p, dt, 6);
      const dx = p.x - crab.position.x, dz = p.z - crab.position.z, L = Math.hypot(dx, dz);
      if (L > 3.6) { crab.position.x += (dx / L) * 4 * sp * dt; crab.position.z += (dz / L) * 4 * sp * dt; scuttle(t, true); }
      keepIn();
      if (L < 4.6 || b.mt > 3) { b.ms = 'raise'; b.mt = 0; sfx.whir(); }
    } else if (b.ms === 'raise') {
      face(p, dt, 3);
      clawR.rotation.x = -1.6 * ease(Math.min(1, b.mt / (0.55 / sp)));
      if (b.mt > 0.55 / sp) { b.ms = 'slam'; b.mt = 0; }
    } else if (b.ms === 'slam') {
      const k = Math.min(1, b.mt / 0.12);
      clawR.rotation.x = -1.6 + 2.0 * k;
      if (k >= 1) {
        const at = crab.localToWorld(V3(1.7, 0, 3.6)); at.y = H;
        shockwave(at); puff(at.clone().add(V3(0, 0.3, 0)), 24, 0xbfeaff, 7, 1); sfx.smash(); api.shake(0.6);
        if (Math.hypot(p.x - at.x, p.z - at.z) < 2.4 && p.y < H + 2) api.damage(at);
        b.ms = 'back'; b.mt = 0;
      }
    } else if (b.ms === 'back') {
      clawR.rotation.x += (0 - clawR.rotation.x) * damp(5, dt);
      if (b.mt > 0.7) endMove();
    }
  } else if (b.move === 'bubbels') {
    face(p, dt, 4);
    if (b.ms === 'start') { b.ms = 'spit'; b.mt = 0; lid.rotation.x = -0.8; steamJets(p, 5 + ph * 2); sfx.longJump(); }
    else if (b.mt > 2.2) { lid.rotation.x = 0; endMove(); }
  } else if (b.move === 'golf') {
    if (b.ms === 'start') {
      // tip the kettle towards you: a blue half-disc shows the half the wave will roll over
      b.dir = V3(p.x - crab.position.x, 0, p.z - crab.position.z).normalize();
      half = new THREE.Mesh(new THREE.CircleGeometry(ARENA.r * 2, 32, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0x2a4aff, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide }));
      half.rotation.x = -Math.PI / 2; half.rotation.z = Math.atan2(-b.dir.x, -b.dir.z);
      half.position.set(crab.position.x, H + 0.07, crab.position.z); scene.add(half);
      b.ms = 'tip'; b.mt = 0; sfx.whir();
    } else if (b.ms === 'tip') {
      face(p, dt, 2); kettle.rotation.x = -0.35 + 0.9 * ease(Math.min(1, b.mt / 1.4));
      half.material.opacity = 0.2 + Math.sin(t * 14) * 0.12;
      if (b.mt > 1.5 / sp) {
        b.ms = 'pour'; b.mt = 0; scene.remove(half); half = null;
        const m = new THREE.Mesh(waveGeo, waveMat.clone()); m.position.set(crab.position.x, H + 0.45, crab.position.z);
        m.rotation.y = -Math.atan2(b.dir.z, b.dir.x); scene.add(m);
        wave = { m, r: 2, dir: b.dir.clone(), hit: false, at: crab.position.clone() };
        sfx.smash(); api.shake(0.5);
      }
    } else if (b.ms === 'pour') {
      kettle.rotation.x += (-0.35 - kettle.rotation.x) * damp(3, dt);
      if (!wave && b.mt > 0.6) endMove();
    }
  }

  // ---------- hazards over time ----------
  for (let i = rings.length - 1; i >= 0; i--) {
    const r = rings[i]; if (!r) continue;
    r.r += dt * 6;
    r.m.scale.set(r.r, 1, r.r); r.m.material.opacity = 0.95 * Math.min(1, (18 - r.r) / 1.5);
    const dr = Math.hypot(p.x - r.m.position.x, p.z - r.m.position.z);
    if (!r.hit && Math.abs(dr - r.r) < WAVE_W && p.y < H + WAVE_H - 0.1) { r.hit = true; api.damage(r.m.position); }
    if (r.r > 18) { scene.remove(r.m); rings.splice(i, 1); }
  }
  for (let i = jets.length - 1; i >= 0; i--) {
    const j = jets[i]; if (!j) continue;
    j.t += dt;
    if (j.t < 0) { j.g.visible = false; continue; }
    j.g.visible = true;
    if (j.t < 1.3) j.ring.material.opacity = 0.5 + Math.sin(t * 18) * 0.4;
    else if (!j.col) {
      j.col = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 7, 14, 1, true), steamMat.clone()); j.col.position.set(j.x, H + 3.5, j.z); scene.add(j.col);
      puff(V3(j.x, H + 0.5, j.z), 14, 0xffffff, 5, 6); sfx.clank();
      if (Math.hypot(p.x - j.x, p.z - j.z) < 1.3 && p.y < H + 6) api.damage(V3(j.x, H, j.z));
    } else {
      j.col.material.opacity = Math.max(0, 0.8 - (j.t - 1.3) * 1.6);
      if (j.t > 1.8) { scene.remove(j.g); scene.remove(j.col); jets.splice(i, 1); }
    }
  }
  if (wave) {
    wave.r += dt * 7.5;
    wave.m.scale.set(wave.r, 1, wave.r); wave.m.material.opacity = 0.85 * Math.min(1, (24 - wave.r) / 2);
    const dx = p.x - wave.at.x, dz = p.z - wave.at.z, dr = Math.hypot(dx, dz);
    const inFront = dx * wave.dir.x + dz * wave.dir.z > 0;
    if (!wave.hit && inFront && Math.abs(dr - wave.r) < 0.5 && p.y < H + 0.8) { wave.hit = true; api.damage(wave.at); }
    if (wave.r > 24) { scene.remove(wave.m); wave = null; }
  }
}
