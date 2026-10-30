import { THREE, scene, toon, addOutline, V3, puff, toast } from './core.js';
import { addCookie } from './cookies.js';
import { addSpeaker } from './bubbles.js';
import { getSave } from './save.js';
import * as sfx from './sfx.js';
import { groundAt } from './feest-terrain.js';
import { GONGS, KEYS, KEY_NOTES, INST, onKey } from './feest-world.js';

// The challenges behind the cosmic cookies on the Feestplaneet:
//   gongs        – three gongs, far apart (village, drum field, organ woods). Hit them with Galm (F).
//                  Once the first one sounds you have 25 seconds for the other two.
//   melodie      – Fluit, at the foot of the xylophone, plays a tune: the keys light up. Play it back by
//                  landing on the keys in the same order. Only once the xylophone works (it's a staircase then,
//                  so going two keys up means a real jump).
//   verstoppertje – four little Toeters are hiding. Find them all.
const { save, persist } = getSave('feest');
save.trials = save.trials || {};
const done = (k) => !!save.trials[k];
function finish(k) { save.trials[k] = true; persist(); }
export const TRIAL_RARE = 3;
const NAMES = { gong: 'De drie gongs', melodie: 'Fluit’s melodie', verstop: 'Verstoppertje' };
const ink = new THREE.MeshBasicMaterial({ color: 0x1a1030 });
function littleToeter(color, s = 0.6) {
  const root = new THREE.Group(); scene.add(root);
  const bod = new THREE.Group(); bod.scale.setScalar(s); root.add(bod);
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.45, 14, 10), toon(color)); b.position.y = 0.55; addOutline(b, 1.08); bod.add(b);
  for (const x of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), ink); e.position.set(0.14 * x, 0.72, 0.38); bod.add(e); }
  const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.2, 0.42, 12, 1, true), toon(0xffc040)); horn.rotation.x = Math.PI / 2; horn.position.set(0, 0.5, 0.55); horn.material.side = THREE.DoubleSide; bod.add(horn);
  return { root, bod };
}

// ---------- 1. the three gongs ----------
const GONG_TIME = 25;
let gongT = 0;
const gongHome = GONGS[0].p;
export function galmGong(from, dir) {
  if (done('gong')) return false;
  let hit = false;
  for (const g of GONGS) {
    const d = V3(g.p.x - from.x, 0, g.p.z - from.z), L = d.length();
    if (L > 9 || (L > 1.5 && d.normalize().dot(dir) < 0.4) || g.rung > 0) continue;
    g.rung = 1; hit = true; sfx.gong(); g.swing = 1;
    puff(g.p.clone().add(V3(0, 1.8, 0)), 14, 0xffd04a, 4, 1);
    if (gongT <= 0) { gongT = GONG_TIME; toast(`BOEEENG! Nog 2 gongs, ${GONG_TIME} seconden!`); }
    const left = GONGS.filter((q) => !q.rung).length;
    if (left && gongT < GONG_TIME) toast(`BOEEENG! Nog ${left} gong${left > 1 ? 's' : ''}!`);
    if (!left) { finish('gong'); gongT = 0; sfx.fanfare(); toast('Alle drie de gongs! Bij de gong in het dorp ligt iets.'); gongReward(); }
  }
  return hit;
}
function gongReward() { addCookie(gongHome.x + 1.6, 1.2, gongHome.z, NAMES.gong); }
addSpeaker(GONGS[0].g, { y: 3.6, radius: 4, linger: 10, cond: () => !done('gong'), lines: ['Drie gongs, ver uit elkaar. Laat ze alle drie klinken met een toeter. Snel!'] });

// ---------- 2. Fluit's melody on the xylophone ----------
const MELODY = [0, 2, 1, 3, 5];
const fluit = littleToeter(0x4ad8c8, 1);
fluit.root.position.set(30.5, 0, 16.5); fluit.root.rotation.y = -2.2;
addSpeaker(fluit.root, { y: 1.5, radius: 5, linger: 12, lines: () => (done('melodie') ? ['Prachtig gespeeld! TOET!']
  : !INST.xylo ? ['Ik ben Fluit. Zonder hamers kan de xylofoon niet spelen…', 'De hamers? Die zaten in een zak van die katten. Ergens hoog in een boom.']
  : ['Luister goed! Ik speel een melodie: kijk welke toetsen oplichten.', 'Speel hem na door op de toetsen te springen. In dezelfde volgorde!']) });
let demo = 0, demoT = 0, progress = 0, lastKey = -1, playing = false;
onKey((k) => {
  if (done('melodie') || !INST.xylo || playing) return;
  if (k === lastKey) return;
  lastKey = k;
  if (k === MELODY[progress]) {
    progress++;
    if (progress === MELODY.length) { finish('melodie'); sfx.fanfare(); toast('Precies goed! Fluit legt een koekje bovenaan de trap.'); melodyReward(); }
    else if (progress > 1) toast(`${progress} van de ${MELODY.length} goed…`);
  } else {
    if (progress > 0) { toast('Oei, verkeerde toets! Luister nog eens naar Fluit.'); sfx.hurt(); }
    progress = k === MELODY[0] ? 1 : 0;
  }
});
function melodyReward() { addCookie(KEYS[7].pos.x + 2.6, 10.4, KEYS[7].pos.z, NAMES.melodie); }
function updateMelody(dt, P) {
  if (done('melodie') || !INST.xylo) return;
  const near = Math.hypot(P.pos.x - fluit.root.position.x, P.pos.z - fluit.root.position.z) < 6 && P.pos.y < 1;
  // standing on the ground by Fluit starts over (and she plays it again)
  if (near && progress > 0 && P.grounded && !P.ground) { progress = 0; lastKey = -1; }
  demoT -= dt;
  if (!playing && near && demoT <= 0) { playing = true; demo = 0; demoT = 0.4; }
  if (playing && demoT <= 0) {
    if (demo < MELODY.length) { const k = MELODY[demo]; KEYS[k].ping = 1; sfx.note(KEY_NOTES[k]); demo++; demoT = 0.6; fluit.bod.position.y = 0.2; }
    else { playing = false; demoT = 7; lastKey = -1; }
  }
  fluit.bod.position.y *= 0.85;
}

// ---------- 3. hide and seek ----------
const MAMA_AT = V3(12, 0, 27);
const mama = littleToeter(0xff9ad8, 1.2);
mama.root.position.copy(MAMA_AT); mama.root.rotation.y = -0.5;
const HIDE = [V3(-47, 0, 27), V3(29, 0, -21), V3(48, 9, 11), V3(-15.5, 0, 40.5)];
save.found = save.found || [];
const babies = HIDE.map((p, i) => {
  const b = { ...littleToeter([0xffd04a, 0x9aff6a, 0x6ac8ff, 0xb47aff][i]), i, p };
  return b;
});
function placeBabies() {
  babies.forEach((b, i) => {
    const found = save.found.includes(i);
    if (found) { const a = (i / 4) * Math.PI * 2; b.root.position.set(MAMA_AT.x + Math.cos(a) * 1.4, 0, MAMA_AT.z + Math.sin(a) * 1.4); }
    else b.root.position.set(b.p.x, groundAt(b.p.x, b.p.z, 0.2), b.p.z);
  });
}
addSpeaker(mama.root, { y: 2, radius: 5, linger: 12, lines: () => (done('verstop') ? ['Iedereen is weer thuis. Dank je wel, Josh!']
  : [`Mijn kleintjes spelen verstoppertje. Nog ${HIDE.length - save.found.length} kwijt!`, 'Eentje zit altijd achter de verste trommel.', 'Eentje is dol op hoge plekken. Héél hoog, met uitzicht over de zee van gras.', 'Eentje speelt graag tussen de orgelpijpen.', 'En eentje zit vast gewoon hier in het dorp, achter een tent. Hihi.']) });
function verstopReward() { addCookie(MAMA_AT.x - 1.6, 1.2, MAMA_AT.z, NAMES.verstop); }
function updateBabies(dt, t, P) {
  for (const b of babies) {
    const found = save.found.includes(b.i);
    b.bod.position.y = Math.abs(Math.sin(t * (found ? 6 : 2) + b.i)) * (found ? 0.15 : 0.05);
    if (found) continue;
    if (P.pos.distanceTo(b.root.position) < 1.4) {
      save.found.push(b.i); persist(); sfx.cosmic(); puff(b.root.position.clone().add(V3(0, 0.6, 0)), 14, 0xffe080, 3, 1.5);
      const left = HIDE.length - save.found.length;
      toast(left ? `Gevonden! TOET! Nog ${left} verstopt` : 'Allemaal gevonden! Ze rennen naar huis.');
      placeBabies();
      if (!left && !done('verstop')) { finish('verstop'); verstopReward(); }
    }
  }
}

// ---------- every frame ----------
export function updateTrials(dt, t, P) {
  if (gongT > 0) {
    gongT -= dt;
    if (gongT <= 0 && !done('gong')) { for (const g of GONGS) g.rung = 0; toast('Te laat! De gongs zijn uitgegalmd. Probeer het opnieuw.'); sfx.hurt(); }
  }
  for (const g of GONGS) { if (g.swing > 0) { g.swing -= dt * 0.8; g.disc.rotation.z = Math.sin(t * 12) * 0.25 * g.swing; } }
  updateMelody(dt, P);
  updateBabies(dt, t, P);
}

// back after a refresh
export function restoreTrials(s, gotSet) {
  placeBabies();
  if (done('gong') && !gotSet.has(NAMES.gong)) gongReward();
  if (done('melodie') && !gotSet.has(NAMES.melodie)) melodyReward();
  if (done('verstop') && !gotSet.has(NAMES.verstop)) verstopReward();
}
