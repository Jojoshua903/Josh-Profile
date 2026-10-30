import { THREE, scene, toon, addOutline, V3, damp, puff, toast } from './core.js';
import * as sfx from './sfx.js';
import { ARENA } from './feest-terrain.js';
import { addSpeaker } from './bubbles.js';
import { boxes } from './feest-world.js';

// Mompel de Mopperende Mol: he lives under the Galmpodium and has hated the Galmfeest for a hundred years.
// He doesn't work for anyone: he just wants it QUIET. When the music starts, he digs his way up.
//   graaf     – he dives under the boards and a mound of earth chases you. At the end it stops and a pink ring
//               shows where he'll burst out. While he's under there: ground-pound right next to the mound
//               (or blast it with Galm, F) and the BOOM shakes him out. He lands on his back, dizzy:
//               jump on his belly. That's the only way to hurt him.
//   ssst      – a finger to his lips: SSSST! Rings of hush roll out over the stage. Jump them.
//   oorwarmer – he throws his earmuffs like a boomerang. They come back, too.
//   kluiten   – (after two hits) clods of earth rain down on the purple marks.
// Six hits, three rounds. He gets faster and grumpier every round.
const C = V3(ARENA.x, ARENA.y, ARENA.z);
const H = ARENA.y;
const EDGE = ARENA.r - 1.6;
const HITS = 6;
export const boss = { state: 'sleep', t: 0, hits: 0, ready: false };
export const BOSS_INFO = {
  name: 'Mompel de Mopperende Mol', sub: 'Hij wil maar één ding: STILTE',
  winTitle: 'Het feest gaat door!', winSub: 'En Mompel doet mee, met de tamboerijn.',
  fail: 'Au! Mompel was te sterk. Nog een keer!',
  cookie: 'Mompel de Mol verslagen', cookieY: H + 1.3, cookieAt: V3(C.x, H + 1.3, C.z),
  arena: { x: C.x, y: H, z: C.z, r: ARENA.r },
  music: 'mol',
};

// ---------- the mole ----------
const fur = toon(0x6a4a3a), furD = toon(0x4a3020), pink = toon(0xff9aaa), claw = toon(0xf4ecd8), red = toon(0xe0443a), black = new THREE.MeshBasicMaterial({ color: 0x1a1020 });
const mk = (geo, mat, x, y, z, parent, ol = 1.05) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; if (ol) addOutline(m, ol); parent.add(m); return m; };
const mole = new THREE.Group(); scene.add(mole);
const body = new THREE.Group(); mole.add(body);
mk(new THREE.SphereGeometry(1.5, 22, 18), fur, 0, 1.5, 0, body).scale.set(1, 1.1, 0.95);
mk(new THREE.SphereGeometry(1.05, 18, 14), toon(0x8a6a5a), 0, 1.3, 0.75, body, 0).scale.set(1, 1.1, 0.5);   // belly
const head = new THREE.Group(); head.position.set(0, 2.9, 0.35); body.add(head);
mk(new THREE.SphereGeometry(0.95, 20, 16), fur, 0, 0, 0, head);
const snout = mk(new THREE.SphereGeometry(0.42, 14, 10), toon(0x8a6a5a), 0, -0.2, 0.85, head); snout.scale.set(1, 0.8, 1.1);
mk(new THREE.SphereGeometry(0.22, 12, 10), pink, 0, -0.08, 1.3, head);
// squinty grumpy eyes and one big eyebrow
for (const s of [-1, 1]) { const e = mk(new THREE.BoxGeometry(0.22, 0.05, 0.05), black, 0.32 * s, 0.22, 0.82, head, 0); e.rotation.z = 0.3 * s; }
const brow = mk(new THREE.BoxGeometry(0.9, 0.14, 0.12), furD, 0, 0.42, 0.78, head, 0);
// the earmuffs (the boomerang)
const muffs = new THREE.Group(); head.add(muffs);
mk(new THREE.TorusGeometry(1.0, 0.07, 6, 20, Math.PI), red, 0, 0.1, 0, muffs, 0);
for (const s of [-1, 1]) mk(new THREE.SphereGeometry(0.34, 12, 10), toon(0xff6a6a), 0.98 * s, 0, 0, muffs);
// arms with huge digging claws
const arms = [-1, 1].map((s) => {
  const g = new THREE.Group(); g.position.set(1.35 * s, 2, 0.3); body.add(g);
  mk(new THREE.CapsuleGeometry(0.3, 0.7, 4, 8), fur, 0.25 * s, -0.4, 0.2, g).rotation.z = 0.6 * s;
  const hand = mk(new THREE.SphereGeometry(0.42, 12, 10), pink, 0.55 * s, -0.95, 0.45, g); hand.scale.set(1.2, 0.5, 1);
  for (let i = 0; i < 3; i++) { const c = mk(new THREE.ConeGeometry(0.09, 0.45, 5), claw, 0.4 * s + (i - 1) * 0.2, -1.05, 0.85, g, 0); c.rotation.x = 1.6; }
  return g;
});
const feet = [-1, 1].map((s) => mk(new THREE.SphereGeometry(0.42, 10, 8), pink, 0.7 * s, 0.2, 0.4, body));
void feet;
// stars over his head when he's dizzy
const stars = new THREE.Group(); stars.position.y = 0; mole.add(stars); stars.visible = false;
for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.2), new THREE.MeshBasicMaterial({ color: 0xffe04a })); stars.add(s); }
// standing on his belly only works when he's on his back
const bellyBox = { pos: V3(), half: V3(1.7, 0.75, 1.7), min: V3(), max: V3(), bellyBox: true };
function setBelly(on) {
  const i = boxes.indexOf(bellyBox);
  // he lies with his head away from where he was facing, so his belly is a bit behind his feet
  const ry = mole.rotation.y;
  if (on && i < 0) { bellyBox.pos.set(mole.position.x - Math.sin(ry) * 1.5, H + 0.75, mole.position.z - Math.cos(ry) * 1.5); bellyBox.min.copy(bellyBox.pos).sub(bellyBox.half); bellyBox.max.copy(bellyBox.pos).add(bellyBox.half); boxes.push(bellyBox); }
  else if (!on && i >= 0) boxes.splice(i, 1);
}

// ---------- hazards: bright colours, so they show up on the orange stage boards ----------
const mound = new THREE.Group(); scene.add(mound); mound.visible = false;
{
  const dirt = toon(0x5a3a2a);
  mk(new THREE.SphereGeometry(1.3, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), dirt, 0, 0, 0, mound);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; mk(new THREE.BoxGeometry(0.5, 0.25, 0.5), toon(0xd89a5a), Math.cos(a) * 1.3, 0.1, Math.sin(a) * 1.3, mound, 0).rotation.y = a; }
}
const markGeo = new THREE.RingGeometry(1.0, 1.25, 30), markFill = new THREE.CircleGeometry(1.0, 30);
function mark(color, x, z, s = 1) {
  const g = new THREE.Group(); g.position.set(x, H + 0.05, z); g.scale.setScalar(s); scene.add(g);
  const ring = new THREE.Mesh(markGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false })); ring.rotation.x = -Math.PI / 2; g.add(ring);
  const fill = new THREE.Mesh(markFill, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false })); fill.rotation.x = -Math.PI / 2; g.add(fill);
  return { g, ring, fill };
}
const burstMk = mark(0xff2ad8, 0, 0, 2.2); burstMk.g.visible = false;
const WAVE_H = 0.6, WAVE_W = 0.35;
const ringGeo = new THREE.CylinderGeometry(1, 1, WAVE_H, 48, 1, true);
const ringMat = new THREE.MeshBasicMaterial({ color: 0x5ff0ff, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false });
const rings = [], clods = [];
function hush(at) { const m = new THREE.Mesh(ringGeo, ringMat.clone()); m.position.set(at.x, H + WAVE_H / 2, at.z); scene.add(m); rings.push({ m, r: 1.6, hit: false }); sfx.spore(); }
// the earmuffs, flying: and their shadow on the floor
const flyMuffs = muffs.clone(); flyMuffs.visible = false; scene.add(flyMuffs);
const muffMk = mark(0xffffff, 0, 0, 0.9); muffMk.g.visible = false;
const clodGeo = new THREE.DodecahedronGeometry(0.5);
function clearHazards() {
  rings.forEach((r) => scene.remove(r.m)); rings.length = 0;
  clods.forEach((c) => { scene.remove(c.mk.g); scene.remove(c.m); }); clods.length = 0;
  burstMk.g.visible = false; mound.visible = false; flyMuffs.visible = false; muffMk.g.visible = false; muffs.visible = true;
}

// ---------- reset / dead ----------
function pose() {
  mole.rotation.set(0, mole.rotation.y, 0); body.position.set(0, 0, 0); body.rotation.set(0, 0, 0); head.rotation.set(0, 0, 0);
  arms.forEach((a, i) => a.rotation.set(0, 0, 0)); stars.visible = false; setBelly(false); mole.position.y = H; mole.scale.setScalar(1);
}
export function resetBoss() {
  clearHazards(); pose();
  Object.assign(boss, { state: 'sleep', t: 0, hits: 0, plan: 0, move: null, ms: '', mt: 0, next: 1.2, hold: false, wasPound: false, hint: false, landed: false });
  mole.position.copy(C); mole.visible = false; mole.rotation.y = 0;
  tambo.visible = false; slice.visible = false;
}
export const bossActive = () => !['sleep', 'dead'].includes(boss.state);
// after the fight he joins in: back of the stage, tambourine in one paw, a slice of cake beside him
export const MOMPEL_PARTY = V3(C.x, H, C.z - 7.5);
const tambo = new THREE.Group(); tambo.visible = false; arms[1].add(tambo); tambo.position.set(0.6, -1.1, 0.6);
{
  const rim = mk(new THREE.CylinderGeometry(0.45, 0.45, 0.12, 20, 1, true), toon(0xc8985a), 0, 0, 0, tambo, 0); rim.material.side = THREE.DoubleSide; rim.rotation.x = Math.PI / 2;
  const skin = new THREE.Mesh(new THREE.CircleGeometry(0.44, 20), new THREE.MeshLambertMaterial({ color: 0xfff4e0, side: THREE.DoubleSide })); tambo.add(skin);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; mk(new THREE.CylinderGeometry(0.09, 0.09, 0.03, 10), toon(0xffd04a), Math.cos(a) * 0.45, Math.sin(a) * 0.45, 0, tambo, 0).rotation.x = Math.PI / 2; }
}
const slice = new THREE.Group(); slice.visible = false; scene.add(slice);
{
  slice.position.set(MOMPEL_PARTY.x + 2.4, H, MOMPEL_PARTY.z + 0.6);
  mk(new THREE.CylinderGeometry(0.7, 0.7, 0.06, 20), toon(0xffffff), 0, 0.6, 0, slice, 0);
  mk(new THREE.CylinderGeometry(0.1, 0.1, 0.6, 8), toon(0xc8985a), 0, 0.3, 0, slice, 0);
  const cake = mk(new THREE.CylinderGeometry(0.55, 0.55, 0.45, 20, 1, false, 0, Math.PI / 2.4), toon(0xffb8d8), 0, 0.86, 0, slice); cake.rotation.y = 0.8;
  mk(new THREE.SphereGeometry(0.1, 8, 6), toon(0xe0443a), 0.15, 1.15, 0.2, slice, 0);
}
addSpeaker(mole, { y: 4.4, radius: 6, linger: 14, cond: () => boss.state === 'dead', lines: ['*rinkel rinkel* …Hm. Dit is eigenlijk best leuk.', 'Niemand heeft me ooit gevraagd om mee te doen. Honderd jaar lang. *snif*', '*neemt een hap taart* …Mmm. Volgend jaar wil ik de grote trommel.', 'Zeg het niet tegen de Toeters, maar ik vind TOET TOET wel grappig.', 'Zachter! …Nee, grapje. HARDER!'] });
let lastBeat = 0;
function party(dt, t, p) {
  const bt = sfx.beat(), ph = bt - Math.floor(bt);
  mole.position.set(MOMPEL_PARTY.x, H + Math.max(0, 0.25 - ph * 0.6), MOMPEL_PARTY.z);
  mole.rotation.y = Math.atan2(p.x - mole.position.x, p.z - mole.position.z) * 0.3;
  body.rotation.z = Math.sin(bt * Math.PI) * 0.12;
  arms[1].rotation.x = -1.8 + Math.sin(bt * Math.PI * 2) * 0.5;
  arms[0].rotation.x = -0.6 + Math.sin(bt * Math.PI) * 0.3;
  head.rotation.z = Math.sin(bt * Math.PI) * 0.1;
  // a jingle on every beat (only when you're close enough to hear it)
  if (Math.floor(bt) !== lastBeat) { lastBeat = Math.floor(bt); if (p.distanceTo(mole.position) < 16) sfx.jingle(); }
  void dt; void t;
}
export function setBossDead() {
  boss.state = 'dead'; clearHazards(); pose();
  mole.visible = true; mole.position.copy(MOMPEL_PARTY); mole.rotation.set(0, 0, 0);
  tambo.visible = true; slice.visible = true;
}
resetBoss();

// ---------- the fight ----------
const phase = () => Math.min(2, Math.floor(boss.hits / 2));
const speed = () => 1 + boss.hits * 0.08;
const PLANS = [['graaf', 'ssst', 'oorwarmer', 'graaf'], ['graaf', 'kluiten', 'ssst', 'graaf', 'oorwarmer'], ['graaf', 'ssst', 'kluiten', 'graaf', 'oorwarmer', 'kluiten']];
const LINES = ['MOMPEL: AU! Mijn rug!', 'MOMPEL: Grrr… kan het niet wat ZACHTER?', 'MOMPEL: Ik zei STILTE!', 'MOMPEL: Mijn oren… MIJN OREN!', 'MOMPEL: Jullie zijn allemaal VEEL te hard!', 'MOMPEL: Oké… oké… ik geef op…'];
const clampArena = (v) => { const d = V3(v.x - C.x, 0, v.z - C.z); if (d.length() > EDGE) d.setLength(EDGE); v.x = C.x + d.x; v.z = C.z + d.z; return v; };
function face(p, dt, k = 4) { const want = Math.atan2(p.x - mole.position.x, p.z - mole.position.z); let d = want - mole.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); mole.rotation.y += d * Math.min(1, dt * k); }
function endMove() { boss.move = null; boss.ms = ''; boss.mt = 0; }
function startMove(name, p) {
  const b = boss;
  b.move = name; b.mt = 0; b.ms = 'start';
  if (name === 'graaf') { b.mpos = mole.position.clone(); }
  if (name === 'ssst') { b.n = 0; b.count = 2 + phase(); }
  if (name === 'oorwarmer') {
    const to = V3(p.x - mole.position.x, 0, p.z - mole.position.z); if (to.lengthSq() < 0.01) to.set(0, 0, 1);
    b.throwFrom = mole.position.clone(); b.throwTo = clampArena(mole.position.clone().add(to.setLength(Math.min(EDGE * 1.6, to.length() + 4))));
    b.throwSide = Math.random() < 0.5 ? -1 : 1;
  }
  if (name === 'kluiten') {
    const n = 5 + 2 * phase();
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = i === 0 ? 0 : 2 + Math.random() * 6;
      const at = clampArena(V3(p.x + Math.cos(a) * r, 0, p.z + Math.sin(a) * r));
      const m = new THREE.Mesh(clodGeo, toon(0x5a3a2a)); m.position.set(at.x, H + 18, at.z); m.visible = false; scene.add(m);
      clods.push({ mk: mark(0x9a3aff, at.x, at.z, 1.3), m, at, t: -i * 0.18 });
    }
    sfx.clank();
  }
}
// Galm (F) — a blast of sound: if it hits the mound, he's shaken out
export function galmHit(at, r = 3) {
  const b = boss;
  if (b.state !== 'fight' || b.move !== 'graaf' || b.ms !== 'chase' && b.ms !== 'warn') return false;
  if (Math.hypot(at.x - b.mpos.x, at.z - b.mpos.z) > r) return false;
  daze(); return true;
}
function daze() {
  const b = boss;
  b.ms = 'dazed'; b.mt = 0; mound.visible = false; burstMk.g.visible = false;
  mole.visible = true; mole.position.set(b.mpos.x, H, b.mpos.z);
  // he lands facing outwards, so he falls back towards the middle of the stage (never over the edge)
  if (Math.hypot(b.mpos.x - C.x, b.mpos.z - C.z) > 0.5) mole.rotation.y = Math.atan2(b.mpos.x - C.x, b.mpos.z - C.z);
  puff(mole.position.clone().add(V3(0, 1, 0)), 40, 0x8a6a4a, 9, 4); sfx.smash(); sfx.wake();
  if (!b.hint) { b.hint = true; toast('BOEM! Hij ligt op zijn rug. Spring op zijn buik!'); }
}

// api: { intro(), damage(from), bounce(vy), shake(s), win(pos) }
export function updateBoss(dt, t, P, prevY, api) {
  const b = boss;
  b.t += dt; b.mt += dt;
  const p = P.pos;
  const dist = Math.hypot(p.x - C.x, p.z - C.z);
  if (b.state === 'sleep') {
    if (b.ready && dist < ARENA.r - 1 && p.y > H - 0.5) { b.state = 'wake'; b.t = 0; api.intro(); }
    return;
  }
  if (b.state === 'dead') { party(dt, t, p); return; }

  if (b.state === 'wake') {
    // he digs up out of the middle of the stage
    if (!mole.visible && b.t > 0.6) { mole.visible = true; mole.position.set(C.x, H - 3.5, C.z); puff(C.clone().add(V3(0, 0.5, 0)), 50, 0x8a6a4a, 10, 4); api.shake(0.8); sfx.smash(); }
    if (mole.visible) { mole.position.y = Math.min(H, mole.position.y + dt * 6); face(p, dt, 3); arms.forEach((a, i) => (a.rotation.x = -1 + Math.sin(t * 8 + i * 3) * 0.6)); }
    if (b.t > 2.2 && !b.hold) { b.state = 'fight'; b.t = 0; b.next = 0.8; pose(); }
    return;
  }
  if (b.state === 'hurt') {
    // up off his back, rubs his head, grumbles
    const k = Math.min(1, b.t / 0.6);
    mole.rotation.x = -Math.PI / 2 * (1 - k); mole.position.y = H + Math.sin(k * Math.PI) * 1.5;
    head.rotation.z = Math.sin(t * 14) * 0.2 * (1 - Math.min(1, b.t / 1.6));
    if (b.t > 1.6) {
      pose();
      if (b.hits >= HITS) { b.state = 'die'; b.t = 0; sfx.wake(); }
      else { b.state = 'fight'; b.t = 0; endMove(); b.next = 0.9; if (b.hits === 2) toast('MOMPEL: Grrr! Nu ga ik met MODDER gooien!'); if (b.hits === 4) toast('Mompel is WOEDEND! Laatste ronde!'); }
    }
    return;
  }
  if (b.state === 'die') {
    // he sits down with a bump, rubs his head… and doesn't dig away this time
    face(p, dt, 2);
    const k = Math.min(1, b.t / 0.5);
    body.position.y = -Math.sin(k * Math.PI) * 0.3; head.rotation.z = Math.sin(t * 6) * 0.15;
    arms[1].rotation.x = -2.4;
    if (b.t > 2.4) { setBossDead(); api.win(C.clone()); }
    return;
  }

  // ---------- fight ----------
  const ph = phase(), sp = speed();
  // landing on his belly while he's on his back
  if (b.move === 'graaf' && b.ms === 'dazed') {
    const on = P.grounded && P.ground === bellyBox;
    if (on && !b.landed) {
      b.hits++; b.state = 'hurt'; b.t = 0; clearHazards(); setBelly(false); stars.visible = false;
      api.bounce(15); puff(mole.position.clone().add(V3(0, 1.5, 0)), 34, 0xffe080, 7, 2); sfx.bossHit(); api.shake(0.6);
      toast(LINES[(b.hits - 1) % LINES.length]);
      b.landed = false; endMove();
      return;
    }
    b.landed = on;
  }
  // a ground pound right by the mound shakes him out
  if (b.move === 'graaf' && (b.ms === 'chase' || b.ms === 'warn') && b.wasPound && P.pound === 0 && P.grounded && Math.hypot(p.x - b.mpos.x, p.z - b.mpos.z) < 3.4) daze();
  b.wasPound = P.pound === 2;

  // his body pushes you away while he's up
  if (mole.visible && b.ms !== 'dazed') {
    const dx = p.x - mole.position.x, dz = p.z - mole.position.z, L = Math.hypot(dx, dz);
    if (L < 1.9 && p.y < H + 3.4) { const k = (1.9 - L) / Math.max(L, 0.01); p.x += dx * k; p.z += dz * k; }
  }

  if (!b.move) {
    b.next -= dt;
    mole.visible = true; face(p, dt, 4);
    body.position.y = Math.abs(Math.sin(t * 3)) * 0.06;
    // he shuffles closer, grumbling
    const to = V3(p.x - mole.position.x, 0, p.z - mole.position.z);
    if (to.length() > 5) { mole.position.addScaledVector(to.normalize(), dt * 1.6 * sp); clampArena(mole.position); }
    if (b.next <= 0) {
      const plan = PLANS[ph];
      startMove(plan[b.plan % plan.length], p); b.plan++;
    }
  } else if (b.move === 'graaf') {
    if (b.ms === 'start') {
      // dive
      const k = Math.min(1, b.mt / 0.6);
      mole.position.y = H - k * 3.6; arms.forEach((a) => (a.rotation.x = -2 + Math.sin(t * 20) * 0.5));
      if (Math.random() < dt * 30) puff(V3(mole.position.x, H + 0.3, mole.position.z), 2, 0x8a6a4a, 4, 2);
      if (k >= 1) { b.ms = 'chase'; b.mt = 0; mole.visible = false; mound.visible = true; b.mpos.set(mole.position.x, H, mole.position.z); }
    } else if (b.ms === 'chase') {
      const to = V3(p.x - b.mpos.x, 0, p.z - b.mpos.z);
      const L = to.length();
      if (L > 0.2) b.mpos.addScaledVector(to.normalize(), Math.min(L, dt * (3.8 + ph * 0.6) * sp));
      clampArena(b.mpos);
      mound.position.copy(b.mpos); mound.scale.set(1, 0.8 + Math.abs(Math.sin(t * 12)) * 0.3, 1);
      if (Math.random() < dt * 14) puff(b.mpos.clone().add(V3(0, 0.4, 0)), 1, 0x8a6a4a, 2, 1);
      if (b.mt > 3.2 - ph * 0.3) { b.ms = 'warn'; b.mt = 0; burstMk.g.visible = true; burstMk.g.position.set(b.mpos.x, H + 0.05, b.mpos.z); sfx.scanTick(true); }
    } else if (b.ms === 'warn') {
      // the pink ring: he bursts up there
      const k = b.mt / 0.95;
      burstMk.fill.material.opacity = 0.2 + k * 0.5; burstMk.g.scale.setScalar(2.2 * (1.1 - k * 0.1));
      mound.scale.set(1 + k * 0.4, 1 + k * 0.6, 1 + k * 0.4);
      if (b.mt > 0.95) {
        b.ms = 'burst'; b.mt = 0; mound.visible = false; burstMk.g.visible = false;
        mole.visible = true; mole.position.set(b.mpos.x, H - 2.5, b.mpos.z);
        puff(b.mpos.clone().add(V3(0, 0.6, 0)), 40, 0x8a6a4a, 9, 4); sfx.smash(); api.shake(0.5);
        if (Math.hypot(p.x - b.mpos.x, p.z - b.mpos.z) < 2.4 && p.y < H + 2.5) api.damage(b.mpos.clone());
      }
    } else if (b.ms === 'burst') {
      mole.position.y = Math.min(H, mole.position.y + dt * 10); arms.forEach((a, i) => (a.rotation.x = -2.4 + Math.min(1, b.mt * 2) * 2.4));
      if (b.mt > 0.9) { pose(); endMove(); b.next = 0.7 / sp; }
    } else if (b.ms === 'dazed') {
      // on his back, little stars going round
      const k = Math.min(1, b.mt / 0.35);
      mole.rotation.x = -Math.PI / 2 * k; mole.position.y = H + 0.2 + Math.sin(k * Math.PI) * 2;
      if (k >= 1 && !boxes.includes(bellyBox)) setBelly(true);
      stars.visible = true; stars.position.set(0, 2.9, 1.7);
      stars.children.forEach((s, i) => { const a = t * 4 + (i / 5) * Math.PI * 2; s.position.set(Math.cos(a) * 0.9, Math.sin(a) * 0.9, 0); s.rotation.y = t * 6; });
      arms.forEach((a, i) => (a.rotation.z = Math.sin(t * 9 + i) * 0.4));
      if (b.mt > 3.4) { setBelly(false); pose(); mole.rotation.x = 0; endMove(); b.next = 0.4; toast('MOMPEL: Hmpf! Mis!'); }
    }
  } else if (b.move === 'ssst') {
    face(p, dt, 5);
    arms[1].rotation.x = -2.6; arms[1].rotation.z = 0.5;     // finger to his lips
    const gap = 0.95 / sp;
    if (b.mt > 0.6 + b.n * gap && b.n < b.count) { b.n++; hush(mole.position); toast(b.n === 1 ? 'MOMPEL: SSSSSST!' : 'SSSST!'); }
    if (b.mt > 0.8 + b.count * gap + 0.4) { pose(); endMove(); b.next = 0.6 / sp; }
  } else if (b.move === 'oorwarmer') {
    face(p, dt, 5);
    const T = 2.4 / sp;
    if (b.mt < 0.4) { arms[0].rotation.x = -2.8; muffs.visible = true; }
    else {
      muffs.visible = false; flyMuffs.visible = true; muffMk.g.visible = true;
      const k = Math.min(1, (b.mt - 0.4) / T);
      // out and back on a curve
      const out = Math.sin(k * Math.PI), side = Math.sin(k * Math.PI * 2) * 3 * b.throwSide;
      const dir = V3().subVectors(b.throwTo, b.throwFrom), perp = V3(-dir.z, 0, dir.x).normalize();
      const at = b.throwFrom.clone().addScaledVector(dir, out).addScaledVector(perp, side);
      flyMuffs.position.set(at.x, H + 1, at.z); flyMuffs.rotation.y = t * 14; flyMuffs.scale.setScalar(1.6);
      muffMk.g.position.set(at.x, H + 0.05, at.z);
      if (Math.hypot(p.x - at.x, p.z - at.z) < 1.5 && p.y < H + 1.8) api.damage(at.clone());
      if (k >= 1) { flyMuffs.visible = false; muffMk.g.visible = false; muffs.visible = true; pose(); endMove(); b.next = 0.6 / sp; }
    }
  } else if (b.move === 'kluiten') {
    face(p, dt, 4);
    arms.forEach((a, i) => (a.rotation.x = -2 + Math.sin(t * 16 + i * 3) * 0.8));
    if (clods.length === 0) { pose(); endMove(); b.next = 0.6 / sp; }
  }

  // hush rings
  for (let i = rings.length - 1; i >= 0; i--) {
    const r = rings[i]; if (!r) continue;       // getting hit can kill you, and dying clears these lists mid-loop
    r.r += dt * 6.5 * sp; r.m.scale.set(r.r, 1, r.r);
    r.m.material.opacity = 0.95 * Math.min(1, (ARENA.r + 3 - r.r) / 3);
    const dr = Math.hypot(p.x - r.m.position.x, p.z - r.m.position.z);
    if (!r.hit && Math.abs(dr - r.r) < WAVE_W && p.y < H + WAVE_H - 0.1) { r.hit = true; api.damage(r.m.position); }
    if (r.r > ARENA.r + 3) { scene.remove(r.m); rings.splice(i, 1); }
  }
  // clods: the mark first, then the clod falls
  for (let i = clods.length - 1; i >= 0; i--) {
    const c = clods[i]; if (!c) continue;
    c.t += dt;
    if (c.t < 0) continue;
    const warn = 1.1 / sp;
    c.mk.fill.material.opacity = 0.2 + Math.min(1, c.t / warn) * 0.5;
    if (c.t > warn - 0.35) { c.m.visible = true; c.m.position.y = H + 0.5 + 18 * Math.max(0, (warn - c.t) / 0.35); c.m.rotation.x += dt * 8; }
    if (c.t > warn) {
      puff(c.at.clone().add(V3(0, 0.5, 0)), 12, 0x8a6a4a, 4, 2); sfx.stomp();
      if (Math.hypot(p.x - c.at.x, p.z - c.at.z) < 1.5 && p.y < H + 2) api.damage(c.at.clone());
      scene.remove(c.mk.g); scene.remove(c.m); clods.splice(i, 1);
    }
  }
  void prevY; void damp;
}
