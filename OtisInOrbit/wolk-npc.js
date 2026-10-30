import { THREE, scene, toon, addOutline, V3, puff, toast, label } from './core.js';
import { addCookie } from './cookies.js';
import { addSpeaker } from './bubbles.js';
import { getSave } from './save.js';
import { play, shot } from './cutscene.js';
import { LOOK } from './ui.js';
import * as sfx from './sfx.js';
import { groundAt, ARENA, ISLANDS } from './wolk-terrain.js';
import { boxes, WERKPLAATS, MILL_TOP, HIGH_CLOUD, OMA_AT, NEST, CANNON, CANNON_BACK } from './wolk-world.js';
import { boss, KNOOP_DOCK, knoop } from './wolk-boss.js';
import { TRIAL_RARE, restoreTrials } from './wolk-trials.js';

// Who lives on the Wolkeneilanden: Raaf, an inventor (a boy, a human, and yes, he's really called Raaf).
// Kayo & Yara's airship blew his workshop apart; his parts are scattered over the islands. Bring them back and
// he builds his best invention ever into Byte: the Combo-mixer. His little sister Merel wants to visit Oma Wolk,
// but there's a gap she can't jump. And there are animals to copy, two of each kind of mix on the way.
export const scannables = [];
export const dialog = { active: false };
export const PENDING_RARE = 4 + TRIAL_RARE;    // Raaf, Merel, Knoop, the crate, and the trials
export const npcEvents = { onChange() {} };
export const miloTalked = () => false;
export const guideDone = () => false;
const { save, persist } = getSave('wolk');
save.parts = save.parts || [];
const BYTE = () => (LOOK.droneName || 'Byte').toUpperCase();
const COOKIE_RAAF = 'Byte’s Combo-mixer', COOKIE_MEREL = 'Merel bij Oma';
let ctx = null;
export function setCtx(c) { ctx = c; }

const ink = new THREE.MeshBasicMaterial({ color: 0x1a1030 });
const mk = (geo, mat, x, y, z, parent, ol = 1.08) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true;
  if (ol) addOutline(m, ol); parent.add(m); return m;
};
function kid(x, y, z, yaw, { shirt, pants, hair, extra }) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = yaw; scene.add(g);
  for (const s of [-1, 1]) mk(new THREE.CapsuleGeometry(0.1, 0.4, 4, 8), toon(pants), 0.13 * s, 0.3, 0, g);
  mk(new THREE.CapsuleGeometry(0.25, 0.4, 4, 10), toon(shirt), 0, 0.85, 0, g);
  const head = new THREE.Group(); head.position.y = 1.4; g.add(head);
  mk(new THREE.SphereGeometry(0.25, 16, 12), toon(0xf0c8a0), 0, 0, 0, head);
  mk(new THREE.SphereGeometry(0.26, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2.1), toon(hair), 0, 0.04, -0.02, head, 0);
  for (const s of [-1, 1]) mk(new THREE.SphereGeometry(0.035, 6, 4), ink, 0.09 * s, 0.02, 0.23, head, 0);
  const arms = [-1, 1].map((s) => { const a = new THREE.Group(); a.position.set(0.3 * s, 1.05, 0); g.add(a); mk(new THREE.CapsuleGeometry(0.07, 0.35, 4, 8), toon(shirt), 0, -0.22, 0, a); return a; });
  if (extra) extra(g, head);
  return { g, head, arms };
}

// ---------- Raaf ----------
const raaf = kid(WERKPLAATS.x + 1.2, WERKPLAATS.y, WERKPLAATS.z + 0.4, 0.3, {
  shirt: 0x3a6ab8, pants: 0x5a4a3a, hair: 0x2a1a14,
  extra(g, head) {
    // flying goggles on his forehead, and a red scarf
    for (const s of [-1, 1]) mk(new THREE.TorusGeometry(0.08, 0.025, 6, 12), toon(0xc8a040), 0.1 * s, 0.14, 0.2, head, 0);
    mk(new THREE.TorusGeometry(0.26, 0.02, 4, 18), toon(0x5a3a2a), 0, 0.13, 0, head, 0).rotation.x = Math.PI / 2;
    mk(new THREE.TorusGeometry(0.2, 0.06, 6, 14), toon(0xe0443a), 0, 1.18, 0, g, 0).rotation.x = Math.PI / 2;
    const wrench = mk(new THREE.BoxGeometry(0.06, 0.4, 0.04), toon(0x9a9aa8), 0.36, 0.6, 0.12, g, 0); wrench.rotation.z = 0.3;
  },
});
raaf.state = save.raaf || 'new';
const PARTS = {
  tandwiel: { at: MILL_TOP.clone().add(V3(0, 0.9, 0)), name: 'het tandwiel', hint: 'Het tandwiel waaide naar de top van de windmolen.', color: 0xc8a040 },
  veer: { at: V3(-42.5, ISLANDS.bonen[3] + 0.9, -11), name: 'de veer', hint: 'De veer ligt achter op het Bonenveld. Neem de kabelbaan vanaf de Schapenwei.', color: 0x9ab8d8 },
  beker: { at: HIGH_CLOUD.clone().add(V3(0, 0.9, 0)), name: 'de mengbeker', hint: 'De mengbeker ligt op de hoge wolk boven de schapen. Er staat een stuiterwolk onder.', color: 0x5ac8ff },
};
const partObjs = Object.entries(PARTS).map(([k, p]) => {
  const g = new THREE.Group(); scene.add(g); g.position.copy(p.at);
  if (k === 'tandwiel') { mk(new THREE.CylinderGeometry(0.4, 0.4, 0.15, 12), toon(p.color), 0, 0, 0, g).rotation.x = Math.PI / 2; for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; mk(new THREE.BoxGeometry(0.16, 0.16, 0.15), toon(p.color), Math.cos(a) * 0.46, Math.sin(a) * 0.46, 0, g, 0); } }
  else if (k === 'veer') { for (let i = 0; i < 5; i++) mk(new THREE.TorusGeometry(0.25, 0.04, 6, 14), toon(p.color), 0, i * 0.12 - 0.25, 0, g, 0).rotation.x = Math.PI / 2; }
  else { mk(new THREE.CylinderGeometry(0.3, 0.22, 0.6, 14), new THREE.MeshBasicMaterial({ color: p.color, transparent: true, opacity: 0.8 }), 0, 0, 0, g, 1.08); mk(new THREE.CylinderGeometry(0.06, 0.06, 0.5), toon(0x9a9aa8), 0, 0.35, 0, g, 0); }
  g.add(new THREE.PointLight(p.color, 4, 5, 2));
  return { k, g };
});
const partsLeft = () => Object.keys(PARTS).filter((k) => !save.parts.includes(k));
// the mixer on the workbench: a dead box until Raaf builds it
const mixer = new THREE.Group(); mixer.position.set(WERKPLAATS.x + 1, WERKPLAATS.y + 0.9, WERKPLAATS.z - 1.2); scene.add(mixer);
const mixerMat = new THREE.MeshBasicMaterial({ color: 0x5a5a6a });
mk(new THREE.BoxGeometry(0.8, 0.5, 0.6), toon(0x8a8aa8), 0, 0.25, 0, mixer);
mk(new THREE.CylinderGeometry(0.2, 0.2, 0.3, 12), mixerMat, 0, 0.65, 0, mixer, 0);
// the recipe board
const recipes = new THREE.Group(); scene.add(recipes);
['🦅 + 📯 = 🌪️', '✨ + ❄️ = 🌈', '🪨 + 🦗 = ☄️'].forEach((s, i) => { const l = label(s, WERKPLAATS.x - 1.2 + i * 1.2, WERKPLAATS.y + 2.2 - i * 0.05, WERKPLAATS.z - 1.9, 1.6); scene.remove(l); recipes.add(l); });
recipes.visible = false;
function showRaaf() {
  const on = raaf.state === 'done';
  mixerMat.color.setHex(on ? 0x5ef2e0 : 0x5a5a6a);
  recipes.visible = on;
}
addSpeaker(raaf.g, { y: 2, radius: 6, linger: 14, lines: () => {
  if (raaf.state === 'done') return ['Hou een kracht vast en scan een tweede. Passen ze bij elkaar? Dan mixt Byte ze!', 'De recepten staan op mijn bord.', 'Met een Meteoor (Zwaar + Veer) breek je de donderpoort van Knoop.', 'En met een Wervelwind (Zweef + Galm) blaas je zijn kanonskogels terug!'];
  if (raaf.state === 'new') return ['Hé! Een raket! Op MIJN wolk!', 'Kom eens hier!'];
  const left = partsLeft();
  if (!left.length) return ['Je hebt ze alle drie! Kom gauw hier!'];
  return [`Nog ${left.length} onderde${left.length > 1 ? 'len' : 'el'}…`, ...left.map((k) => PARTS[k].hint)];
} });

// ---------- Merel and Oma Wolk ----------
const MEREL_HOME = V3(-27, ISLANDS.bonen[3], -14);
const merel = kid(MEREL_HOME.x, MEREL_HOME.y, MEREL_HOME.z, Math.PI * 0.75, {
  shirt: 0xff8ab8, pants: 0x5a6ab8, hair: 0x2a1a14,
  extra(g, head) { for (const s of [-1, 1]) mk(new THREE.SphereGeometry(0.1, 8, 6), toon(0x2a1a14), 0.24 * s, 0, -0.05, head, 0); },
});
merel.g.scale.setScalar(0.8);
merel.state = save.merel || 'wait';
const crumbs = [];
let merelStuck = 0, merelWarn = 0;
addSpeaker(merel.g, { y: 1.8, radius: 5, linger: 10, lines: () => (merel.state === 'home' ? ['Oma bakt wolkentaart! Dat is gewoon taart. Maar dan op een wolk.'] : merel.state === 'follow' ? ['Ik loop achter je aan!', 'Niet te ver springen, hè! Ik kan niet zo ver.'] : ['Ik wil naar Oma Wolk. Maar ik kan niet over dat gat springen…', 'Raaf zegt dat je met een regenboog over de lucht kan lopen. Dat bestaat toch niet?']) });
const oma = kid(OMA_AT.x, OMA_AT.y, OMA_AT.z + 0.6, 0, {
  shirt: 0xb88ad8, pants: 0x6a5a7a, hair: 0xf4f4f4,
  extra(g, head) { mk(new THREE.SphereGeometry(0.16, 10, 8), toon(0xf4f4f4), 0, 0.2, -0.18, head, 0); for (const s of [-1, 1]) mk(new THREE.TorusGeometry(0.06, 0.015, 4, 10), toon(0x9a9aa8), 0.09 * s, 0.02, 0.24, head, 0); },
});
addSpeaker(oma.g, { y: 2, radius: 5, linger: 10, lines: () => (merel.state === 'home' ? ['Mijn kleine Merel! En wat een knappe drone heb jij.', 'Wolkentaart, jongen? Hij is erg luchtig.'] : ['Ach, ik heb Merel al zo lang niet gezien.', 'Ze woont daar, op het Bonenveld. Maar het gat is te groot voor zulke kleine beentjes.']) });
// is there something under her feet here? (anything at about her height, or a bit higher, counts)
const canWalk = (x, z, y) => {
  if (groundAt(x, z, 0.5) > y - 0.9) return true;
  return boxes.some((b) => x > b.min.x - 0.4 && x < b.max.x + 0.4 && z > b.min.z - 0.4 && z < b.max.z + 0.4 && Math.abs(b.max.y - y) < 1.2);
};
// a straight line with ground all the way (used for the little hops Josh makes between his footsteps)
function clearPath(a, b) {
  const L = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(1, Math.ceil(L / 0.6));
  for (let i = 1; i < n; i++) { const u = i / n; if (!canWalk(a.x + (b.x - a.x) * u, a.z + (b.z - a.z) * u, Math.min(a.y, b.y))) return false; }
  return true;
}
// She walks exactly where Josh walked. Where he JUMPED over thin air (or fell and came back at a flag),
// the footsteps have a gap: there she stops and waits. Come back to her (or press E) and she follows again.
let target = null, waiting = false;
function resetTrail() { crumbs.length = 0; target = null; waiting = false; }
function updateMerel(dt, t, P) {
  const p = P.pos, m = merel.g.position;
  if (merel.state === 'home') { m.set(OMA_AT.x + 1.2, OMA_AT.y, OMA_AT.z + 1); merel.g.rotation.y = -0.5; merel.arms.forEach((a, i) => (a.rotation.z = Math.sin(t * 6) * 0.3 * (i ? 1 : -1))); return; }
  if (merel.state !== 'follow') { merel.g.rotation.y = Math.PI * 0.75; return; }
  const near = m.distanceTo(p) < 2.6;
  if (waiting && near) resetTrail();                       // you came back for her
  if (P.grounded && !waiting) {
    const last = crumbs[crumbs.length - 1] || m;
    const d = p.distanceTo(last);
    if (d > 0.8) {
      // a gap in the footsteps that isn't walkable: she'll stop at the last good one
      if (d > 2.2 && !clearPath(last, p)) { waiting = true; if (merelWarn <= 0) { merelWarn = 6; toast('MEREL: Daar kan ik niet overheen! Maak een brug voor me, en kom me halen!'); } }
      else { crumbs.push(p.clone()); if (crumbs.length > 300) crumbs.shift(); }
    }
  }
  merelWarn -= dt;
  if (!target && crumbs.length) target = crumbs.shift();
  if (target && !near) {
    const d = target.clone().sub(m), L = d.length();
    const sp = 5 + Math.min(4, crumbs.length * 0.15);          // a bit faster when she's far behind
    m.addScaledVector(d, Math.min(L, sp * dt) / (L || 1));
    merel.g.rotation.y = Math.atan2(d.x, d.z);
    merel.arms.forEach((a, i) => (a.rotation.x = Math.sin(t * 12) * 0.6 * (i ? 1 : -1)));
    if (L < 0.25) target = null;
  } else {
    merel.arms.forEach((a) => (a.rotation.x = 0));
    if (!near) merel.g.rotation.y = Math.atan2(p.x - m.x, p.z - m.z);
  }
  // she ended up on nothing (the bridge melted under her): she floats back home, a cloud-girl after all
  if (!target && !canWalk(m.x, m.z, m.y)) {
    m.y -= dt * 4;
    if (m.y < MEREL_HOME.y - 6) { m.copy(MEREL_HOME); resetTrail(); waiting = true; toast('Merel zakte door de wolken… en zweefde terug naar het Bonenveld. Haal haar maar weer op!'); }
  }
  if (m.distanceTo(OMA_AT) < 3 && Math.abs(m.y - OMA_AT.y) < 1) merelHome();
}
function merelHome() {
  merel.state = 'home'; save.merel = 'home'; persist(); resetTrail();
  const O = oma.g.position;
  const cam = shot(V3(O.x + 3, O.y + 2, O.z + 4), V3(O.x, O.y + 1, O.z));
  play([
    { say: { who: 'MEREL', text: 'OMAAA!' }, cam, start() { sfx.fanfare(); } },
    { say: { who: 'OMA WOLK', text: 'Merel! Hoe kom jij nou hier? Over het gat?' }, cam },
    { say: { who: 'MEREL', text: 'Over een REGENBOOG, oma! Hij was van ijs! En hij smolt!' }, cam },
    { say: { who: 'OMA WOLK', text: 'Wat een avontuur. Hier, jongen, voor de moeite. Ik vond het in mijn wolkentaart.' }, cam },
  ], () => addCookie(O.x + 1.6, O.y + 1.2, O.z + 1.4, COOKIE_MEREL));
}

// ---------- the stork ----------
const stork = new THREE.Group(); stork.position.copy(NEST).add(V3(0, 0.3, 0)); scene.add(stork);
{
  const white = toon(0xf8f8f8);
  mk(new THREE.SphereGeometry(0.45, 12, 10), white, 0, 1.1, 0, stork).scale.set(1, 0.9, 1.4);
  mk(new THREE.CylinderGeometry(0.08, 0.1, 0.7), white, 0, 1.7, 0.45, stork).rotation.x = 0.4;
  mk(new THREE.SphereGeometry(0.2, 10, 8), white, 0, 2.05, 0.6, stork);
  const bk = mk(new THREE.ConeGeometry(0.06, 0.6, 6), toon(0xff7a3a), 0, 2.0, 0.95, stork, 0); bk.rotation.x = Math.PI / 2;
  for (const s of [-1, 1]) { mk(new THREE.CylinderGeometry(0.03, 0.03, 0.9), toon(0xff7a3a), 0.15 * s, 0.45, 0, stork, 0); mk(new THREE.BoxGeometry(0.1, 0.5, 0.9), toon(0x1a1a24), 0.42 * s, 1.15, -0.15, stork, 0); }
}
export const STORK = stork;

// ---------- animals to copy ----------
function eagle(g) {
  mk(new THREE.SphereGeometry(0.35, 12, 10), toon(0x8a5a3a), 0, 0.5, 0, g).scale.set(1, 1, 1.3);
  mk(new THREE.SphereGeometry(0.22, 12, 10), toon(0xf8f8f8), 0, 0.85, 0.3, g);
  const bk = mk(new THREE.ConeGeometry(0.07, 0.2, 6), toon(0xffd04a), 0, 0.82, 0.55, g, 0); bk.rotation.x = Math.PI / 2;
  const w = [-1, 1].map((s) => { const wg = new THREE.Group(); wg.position.set(0.3 * s, 0.6, 0); g.add(wg); mk(new THREE.BoxGeometry(0.9, 0.06, 0.5), toon(0x6a4a2a), 0.45 * s, 0, 0, wg, 0); return wg; });
  return (t) => w.forEach((x, i) => (x.rotation.z = (0.3 + Math.sin(t * 2) * 0.2) * (i ? -1 : 1)));
}
function hornbill(g) {
  mk(new THREE.SphereGeometry(0.33, 12, 10), toon(0x2a2a3a), 0, 0.5, 0, g).scale.set(1, 1, 1.2);
  mk(new THREE.SphereGeometry(0.2, 12, 10), toon(0x2a2a3a), 0, 0.85, 0.25, g);
  const horn = mk(new THREE.ConeGeometry(0.16, 0.7, 10, 1, true), toon(0xff9ad8), 0, 0.9, 0.7, g, 0); horn.rotation.x = -Math.PI / 2;
  const casque = mk(new THREE.TorusGeometry(0.12, 0.05, 6, 10, Math.PI), toon(0xffd04a), 0, 1.02, 0.35, g, 0); casque.rotation.y = Math.PI / 2;
  return (t) => { horn.scale.setScalar(1 + Math.max(0, Math.sin(t * 3)) * 0.15); };
}
function glowCloud(g) {
  const m = new THREE.MeshBasicMaterial({ color: 0xd8ffff });
  for (let i = 0; i < 4; i++) mk(new THREE.SphereGeometry(0.22 + (i % 2) * 0.08, 10, 8), m, (i - 1.5) * 0.22, 0.9 + (i % 2) * 0.08, 0, g, 0);
  for (const s of [-1, 1]) mk(new THREE.SphereGeometry(0.04, 6, 4), ink, 0.1 * s, 0.95, 0.24, g, 0);
  g.add(new THREE.PointLight(0x7af5ff, 5, 7, 2));
  return (t) => { g.position.y = g.userData.y0 + Math.sin(t * 2) * 0.2; };
}
function owl(g) {
  const w = toon(0xf8f8ff);
  mk(new THREE.SphereGeometry(0.38, 12, 10), w, 0, 0.5, 0, g).scale.set(1, 1.15, 0.9);
  for (const s of [-1, 1]) { mk(new THREE.SphereGeometry(0.11, 8, 6), toon(0xffd04a), 0.14 * s, 0.75, 0.3, g, 0); mk(new THREE.SphereGeometry(0.05, 6, 4), ink, 0.14 * s, 0.75, 0.39, g, 0); mk(new THREE.ConeGeometry(0.06, 0.18, 4), w, 0.2 * s, 1.0, 0.05, g, 0); }
  for (let i = 0; i < 5; i++) mk(new THREE.SphereGeometry(0.03, 4, 3), toon(0x5a6a8a), (i - 2) * 0.08, 0.35 + (i % 2) * 0.1, 0.33, g, 0);
  return (t) => { g.rotation.y = g.userData.yaw + Math.sin(t * 0.7) * 1.2; };
}
function turtle(g) {
  mk(new THREE.SphereGeometry(0.55, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon(0x8a8a9a), 0, 0.2, 0, g).scale.set(1, 0.8, 1.2);
  for (let i = 0; i < 4; i++) mk(new THREE.DodecahedronGeometry(0.16), toon(0x6a6a7a), (i % 2 ? 0.2 : -0.2), 0.55, (i < 2 ? 0.2 : -0.2), g, 0);
  const head = mk(new THREE.SphereGeometry(0.18, 10, 8), toon(0x8ab86a), 0, 0.3, 0.7, g);
  for (const [x, z] of [[-0.35, 0.4], [0.35, 0.4], [-0.35, -0.4], [0.35, -0.4]]) mk(new THREE.CylinderGeometry(0.09, 0.09, 0.25), toon(0x8ab86a), x, 0.12, z, g, 0);
  return (t) => { head.position.z = 0.65 + Math.sin(t * 0.8) * 0.06; };
}
function hopper(g) {
  const grn = toon(0x7ad84a);
  mk(new THREE.CapsuleGeometry(0.14, 0.5, 4, 8), grn, 0, 0.35, 0, g).rotation.x = Math.PI / 2;
  mk(new THREE.SphereGeometry(0.15, 10, 8), grn, 0, 0.42, 0.38, g);
  for (const s of [-1, 1]) { mk(new THREE.SphereGeometry(0.05, 6, 4), ink, 0.08 * s, 0.48, 0.48, g, 0); const l = mk(new THREE.CapsuleGeometry(0.04, 0.4, 4, 6), grn, 0.16 * s, 0.4, -0.15, g, 0); l.rotation.x = 0.9; }
  return (t) => { g.position.y = g.userData.y0 + Math.max(0, Math.sin(t * 3)) * 0.5; };
}
const KINDS = {
  zweef: { name: 'Arend', make: eagle, lines: ['*krie!* (de arend spreidt zijn vleugels en blijft zomaar hangen in de wind)'] },
  galm: { name: 'Hoornvogel', make: hornbill, lines: ['*TOETOETOE!*', '*de hoornvogel toetert zo hard dat de wolkjes wegwaaien*'] },
  gloei: { name: 'Gloeiwolkje', make: glowCloud, lines: ['*bliep* (een piepklein wolkje dat licht geeft)'] },
  vries: { name: 'Sneeuwuil', make: owl, lines: ['Oehoe. *er vallen sneeuwvlokjes uit zijn veren*'] },
  zwaar: { name: 'Wolkenschildpad', make: turtle, lines: ['…', '*de schildpad is zó zwaar dat de wolk onder hem een beetje doorzakt*'] },
  veer: { name: 'Wolkensprinkhaan', make: hopper, lines: ['*tsjirp!* *boing*'] },
};
const A = ARENA;
const ANIMALS = [
  ['zweef', -4, 0, 44.5, 2.6], ['galm', -34, 2, 31, 0.6], ['veer', -25, 2, 21, 2], ['gloei', 24.5, 5.5, 27.5, -1],
  ['vries', -41, 4, -5, 1.6], ['zwaar', -38, 4, -15, -0.6], ['zwaar', -7.5, 4, -23, -1], ['veer', -16.5, 4, -22, 0.5],
  ['zweef', A.x - 6.8, A.y, A.z - 6.8, 0.8], ['galm', A.x + 6.8, A.y, A.z + 6.8, -2.4],
  // the south: an eagle on the Ballonplein (for the thermals), Zwaar + Veer on the Thermiekvelden (for the ice), Gloei + Vries on the ice
  ['zweef', -5, 3, 75, 2.2], ['zwaar', -33, 6, 99, 1], ['veer', -22, 6, 95, -0.5], ['gloei', -10, 9, 113, 0.8], ['vries', -2.5, 9, 119.5, -2.2],
];
const animals = ANIMALS.map(([ab, x, y, z, yaw]) => {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = yaw; g.userData.y0 = y; g.userData.yaw = yaw; scene.add(g);
  const K = KINDS[ab], tick = K.make(g);
  scannables.push({ name: K.name, ability: ab, obj: g, offset: V3(0, 1.2, 0) });
  addSpeaker(g, { y: 1.5, radius: 3.5, linger: 8, lines: K.lines });
  return { g, tick };
});

// ---------- Knoop, after the fight ----------
addSpeaker(knoop, { y: 3.4, radius: 6, linger: 12, lines: () => (boss.state === 'dead'
  ? ['Pff. Verslagen door een jongen met een vliegende fietsbel.', 'Wil je mijn kanon gebruiken? Ga er maar in zitten. Het schiet je naar het verste wolkje.', 'Ik zal nooit meer op wolken schieten. Alleen nog op… nou ja. Op niks.']
  : ['KNOOP: Wég van mijn eiland! Alles wat ik zie is van MIJ!']) });

// ---------- talking ----------
let lastP = V3();
function who(p) {
  if (p.distanceTo(raaf.g.position) < 3.4 && (raaf.state === 'new' || (raaf.state === 'search' && !partsLeft().length))) return 'raaf';
  if (merel.state !== 'home' && p.distanceTo(merel.g.position) < 3) return 'merel';
  if (boss.state === 'dead' && p.distanceTo(CANNON) < 2.6) return 'kanon';
  if (p.distanceTo(CANNON_BACK) < 2.6) return 'terug';
  return null;
}
export function nearMilo(p) { return !!who(p); }
export const npcPrompt = () => ({ raaf: 'praten met Raaf', merel: 'praten met Merel', kanon: 'in het kanon kruipen', terug: 'terug met het kanon' })[who(lastP)] || '';
export function talk() {
  const w = who(lastP);
  if (w === 'raaf') raafTalk();
  else if (w === 'merel') { if (merel.state === 'follow') { resetTrail(); toast('MEREL: Ik loop achter je aan! (Maar ik spring niet!)'); } else merelTalk(); }
  else if (w === 'kanon') cannon(CANNON, V3(ISLANDS.ver[0], ISLANDS.ver[3], ISLANDS.ver[1] + 0.5), 'Het verste wolkje!');
  else if (w === 'terug') cannon(CANNON_BACK, V3(A.x - 3, A.y, A.z - 3), '');
}
function merelTalk() {
  const M = merel.g.position;
  const cam = shot(V3(M.x + 2.4, M.y + 1.6, M.z + 3), V3(M.x, M.y + 0.8, M.z));
  play([
    { say: { who: 'MEREL', text: 'Hoi! Ik ben Merel. Raaf is mijn grote broer.' }, cam },
    { say: { who: 'MEREL', text: 'Ik wil naar Oma Wolk, op het eiland daarzo. Maar het gat is veel te groot. Ik kan niet zo ver springen.' }, cam: shot(V3(M.x + 3, M.y + 4, M.z + 6), OMA_AT) },
    { say: { who: BYTE(), text: 'Als we nou een brug maken… van regenboog? Gloei + Vries, Josh!' }, cam },
    { say: { who: 'MEREL', text: 'Ik loop gewoon achter je aan. Maar ik spring NIET.' }, cam },
  ], () => { merel.state = 'follow'; save.merel = 'follow'; persist(); resetTrail(); });
}
function raafTalk() {
  const R = raaf.g.position;
  const cam = shot(V3(R.x + 2.4, R.y + 1.6, R.z + 3.4), V3(R.x, R.y + 1, R.z));
  if (raaf.state === 'new') {
    play([
      { say: { who: 'RAAF', text: 'Hé! Een raket! Op MIJN wolk! …Sorry. Hoi. Ik ben Raaf. Ik woon hier. Ik vind dingen uit.' }, cam },
      { say: { who: 'RAAF', text: 'Nou ja. Ik vónd dingen uit. Tot gisteren. Toen vloog er een luchtschip voorbij met twee katten erin.' }, cam },
      { say: { who: 'RAAF', text: 'Ze lachten heel hard, en hun motor blies mijn hele werkplaats omver. Alles vloog over de eilanden.' }, cam: shot(V3(R.x + 6, R.y + 5, R.z + 8), V3(R.x - 2, R.y + 1, R.z - 2)) },
      { say: { who: BYTE(), text: 'Kayo & Yara. Natuurlijk.' }, cam },
      { say: { who: 'RAAF', text: 'Ik was bezig met mijn beste uitvinding ooit. Een Combo-mixer, voor drones. Een drone met een mixer kan twee krachten mengen tot iets NIEUWS.' }, cam },
      { say: { who: BYTE(), text: '…Ik ben een drone.' }, cam },
      { say: { who: 'RAAF', text: 'Ik ZIE dat je een drone bent! Haal mijn drie onderdelen terug: het tandwiel, de veer en de mengbeker. Dan bouw ik hem in jou!' }, cam },
      { say: { who: 'RAAF', text: 'O, en pas op voor Kapitein Knoop. Die luchtpiraat schiet met zijn kanonnen op iedereen die op een wolk woont.' }, cam },
    ], () => { raaf.state = 'search'; save.raaf = 'search'; persist(); toast(PARTS[partsLeft()[0] || 'tandwiel'].hint); });
  } else {
    const M = mixer.position;
    play([
      { say: { who: 'RAAF', text: 'Alle drie! Het tandwiel, de veer, de mengbeker. Kom, kom, kom!' }, cam },
      {
        dur: 3, say: { who: 'RAAF', text: '*tik tik* *schroef* *BZZZT* …stil blijven hangen, drone!' },
        start() { sfx.click(); setTimeout(() => sfx.zap(), 600); setTimeout(() => sfx.zap(), 1300); setTimeout(() => sfx.chime(), 2200); },
        update(dt, k) { if (Math.random() < 0.6) puff(M.clone().add(V3((Math.random() - 0.5), 0.8, (Math.random() - 0.5))), 1, [0xffe14a, 0x5ef2e0, 0xff9ad8][Math.floor(k * 9) % 3], 3, 1); },
        cam: shot(V3(M.x + 1.6, M.y + 1.2, M.z + 2.2), M),
      },
      { say: { who: BYTE(), text: 'Ik voel me… dubbel. Er zit een tweede vakje in mijn hoofd!' }, cam, start() { raaf.state = 'done'; showRaaf(); if (ctx) ctx.unlockCombo(); sfx.cosmic(); } },
      { say: { who: 'RAAF', text: 'Het werkt! Hou een kracht vast en scan een tweede. Als ze bij elkaar passen, MIXT hij ze.' }, cam },
      { say: { who: 'RAAF', text: 'Ik ken drie recepten. Zweef + Galm = Wervelwind. Gloei + Vries = Regenboog. Zwaar + Veer = Meteoor. Ze staan op mijn bord.' }, cam: shot(V3(WERKPLAATS.x, WERKPLAATS.y + 2, WERKPLAATS.z + 2.4), V3(WERKPLAATS.x, WERKPLAATS.y + 2, WERKPLAATS.z - 2)) },
      { say: { who: 'RAAF', text: 'Met een Meteoor kom je door de donderpoort van Knoop. En met een Wervelwind… blaas je zijn kanonskogels gewoon terug!' }, cam },
      { say: { who: 'RAAF', text: 'Hier. Een koekje dat in mijn gereedschapskist zat. Het gloeit. Ik heb geen idee waarom.' }, cam },
    ], () => { save.raaf = 'done'; persist(); addCookie(R.x - 1.4, R.y + 1.2, R.z + 1.4, COOKIE_RAAF); toast('De Combo is ontgrendeld! Hou een kracht vast en scan een tweede.'); });
  }
}
// Knoop's cannons: a long arc through the sky
function cannon(from, to, msg) {
  if (!ctx) return;
  const P = ctx.P;
  const a = from.clone().add(V3(0, 1.4, 0));
  play([
    { dur: 0.8, start() { ctx.hideJosh = true; sfx.click(); }, cam: () => ({ pos: from.clone().add(V3(-3, 3, 4)), look: from.clone().add(V3(0, 1, 0)) }) },
    {
      dur: 3.2,
      start() { sfx.smash(); ctx.shake(0.5); puff(a.clone(), 30, 0x9a9aa8, 6, 2); ctx.hideJosh = false; },
      update(dt, k) {
        P.pos.lerpVectors(a, to, k); P.pos.y += Math.sin(Math.PI * k) * 26; P.vel.set(0, 0, 0);
        if (Math.random() < 0.6) puff(P.pos.clone(), 1, 0xffffff, 1, 0.5);
      },
      finish() { P.pos.copy(to); P.vel.set(0, 0, 0); sfx.land(); },
      cam: () => ({ pos: P.pos.clone().add(V3(-6, 4, 8)), look: P.pos.clone() }),
    },
  ], () => { ctx.resetCam(); if (msg) toast(msg); });
}

// ---------- every frame ----------
export function updateNPCs(dt, t, p) {
  lastP.copy(p);
  // Raaf tinkers, or waves when you come close
  const near = p.distanceTo(raaf.g.position) < 6;
  raaf.arms[1].rotation.z = near ? -2.4 + Math.sin(t * 8) * 0.3 : Math.sin(t * 5) * 0.2;
  raaf.g.rotation.y = near ? Math.atan2(p.x - raaf.g.position.x, p.z - raaf.g.position.z) : 0.3;
  mixer.children[1].rotation.y = raaf.state === 'done' ? t * 4 : 0;
  // the parts
  for (const o of partObjs) {
    const got = save.parts.includes(o.k);
    o.g.visible = !got;
    if (got) continue;
    o.g.position.y = PARTS[o.k].at.y + Math.sin(t * 2) * 0.12; o.g.rotation.y = t * 1.6;
    if (p.clone().add(V3(0, 0.8, 0)).distanceTo(o.g.position) < 1.4) {
      save.parts.push(o.k); persist(); sfx.cosmic(); puff(o.g.position.clone(), 18, PARTS[o.k].color, 4, 2);
      const left = partsLeft();
      toast(left.length ? `Je hebt ${PARTS[o.k].name}! Nog ${left.length} onderde${left.length > 1 ? 'len' : 'el'} voor Raaf.` : `Je hebt ${PARTS[o.k].name}! Breng alle drie naar Raaf.`);
    }
  }
  for (const a of animals) a.tick(t);
  stork.rotation.y = Math.sin(t * 0.4) * 0.8;
  if (ctx) updateMerel(dt, t, ctx.P);
  oma.arms[0].rotation.z = merel.state === 'home' ? Math.sin(t * 4) * 0.3 : 0;
  void KNOOP_DOCK;
}

// back after a refresh
export function restoreNPCs(s, gotSet) {
  restoreTrials(s, gotSet);
  showRaaf();
  // after a refresh she still wants to come along: she starts from home again
  if (save.raaf === 'done' && !gotSet.has(COOKIE_RAAF)) addCookie(raaf.g.position.x - 1.4, raaf.g.position.y + 1.2, raaf.g.position.z + 1.4, COOKIE_RAAF);
  if (save.merel === 'home' && !gotSet.has(COOKIE_MEREL)) addCookie(oma.g.position.x + 1.6, oma.g.position.y + 1.2, oma.g.position.z + 1.4, COOKIE_MEREL);
}
