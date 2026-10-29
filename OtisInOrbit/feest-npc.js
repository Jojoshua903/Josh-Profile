import { THREE, scene, toon, addOutline, V3, damp, puff, toast } from './core.js?v=sub1';
import { addCookie } from './cookies.js?v=sub1';
import { addSpeaker } from './bubbles.js?v=sub1';
import { getSave } from './save.js?v=sub1';
import { play, shot } from './cutscene.js?v=sub1';
import { LOOK } from './ui.js?v=sub1';
import * as sfx from './sfx.js?v=sub1';
import { groundAt } from './feest-terrain.js?v=sub1';
import { INST, TUUT_AT, NATHAN_AT, PLATE, STICKS_AT, BELLOWS_AT, MOUTH_AT, STAGE, beatPhase } from './feest-world.js?v=sub1';
import { boss } from './feest-boss.js?v=sub1';
import { TRIAL_RARE, restoreTrials } from './feest-trials.js?v=sub1';

// Who lives on the Feestplaneet: the Toeters (round, with a horn for a nose: copy one for Galm), their chief
// Opper-Toeter Tuut, and Nathan, a baseball player who's allergic to dogs AND cats. Kayo & Yara came by
// yesterday, stole the parts of the four big instruments… and Nathan sneezed so hard their saucer wobbled
// and they dropped the lot all over the meadow. Now there's cat hair everywhere and he can't stop sneezing.
export const scannables = [];
export const dialog = { active: false };
export const PENDING_RARE = 5 + TRIAL_RARE;   // Tuut, Nathan, the rare crate, the mole, Mompel's stash, and the trials
export const npcEvents = { onChange() {} };
export const miloTalked = () => false;
export const guideDone = () => false;
const { save, persist } = getSave('feest');
save.parts = save.parts || [];
save.hair = save.hair || [];
const BYTE = () => (LOOK.droneName || 'Byte').toUpperCase();
const tr = (s) => `<small>${LOOK.droneName || 'Byte'} vertaalt: “${s}”</small>`;
const COOKIE_TUUT = 'Het Galmfeest begint', COOKIE_NATHAN = 'Nathan niest niet meer';

const ink = new THREE.MeshBasicMaterial({ color: 0x1a1030 });
const mk = (geo, mat, x, y, z, parent, ol = 1.08) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true;
  if (ol) addOutline(m, ol); parent.add(m); return m;
};
const eyes = (parent, y, z, gap, r = 0.05, mat = ink) => [-1, 1].map((s) => { const e = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), mat); e.position.set(gap * s, y, z); parent.add(e); return e; });

// ---------- Toeters ----------
function toeter(color, scale = 1, hat = false) {
  const root = new THREE.Group(); scene.add(root);
  const bod = new THREE.Group(); root.add(bod); bod.scale.setScalar(scale);
  mk(new THREE.SphereGeometry(0.45, 16, 12), toon(color), 0, 0.55, 0, bod);
  eyes(bod, 0.72, 0.38, 0.14, 0.06);
  // the horn nose
  const horn = mk(new THREE.CylinderGeometry(0.06, 0.2, 0.42, 12, 1, true), toon(0xffc040), 0, 0.5, 0.55, bod, 0); horn.rotation.x = Math.PI / 2; horn.material.side = THREE.DoubleSide;
  for (const s of [-1, 1]) mk(new THREE.SphereGeometry(0.13, 8, 6), toon(0xffa040), 0.18 * s, 0.08, 0.1, bod, 0).scale.set(1, 0.5, 1.4);
  if (hat) {
    mk(new THREE.CylinderGeometry(0.32, 0.32, 0.04, 16), toon(0x2a2a3a), 0, 0.98, 0, bod, 0);
    mk(new THREE.CylinderGeometry(0.22, 0.22, 0.4, 16), toon(0x2a2a3a), 0, 1.18, 0, bod, 0);
    mk(new THREE.CylinderGeometry(0.225, 0.225, 0.08, 16), toon(0xff4a8a), 0, 1.04, 0, bod, 0);
    mk(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 12), toon(0xffd04a), 0, 0.55, 0.45, bod, 0).rotation.x = Math.PI / 2;    // a medal
  }
  return { root, bod, horn };
}
const FOLK = [];
for (const [x, z, c] of [[-8, 26, 0xff6aa8], [6, 26, 0x6ac8ff], [-4, 34, 0x9aff6a], [10, 32, 0xb47aff], [-10, 31, 0xffd04a]]) {
  const f = { ...toeter(c), home: V3(x, 0, z), t: Math.random() * 6 };
  f.root.position.copy(f.home);
  scannables.push({ name: 'Toeter', ability: 'galm', obj: f.root, offset: V3(0, 1, 0) });
  addSpeaker(f.root, { y: 1.5, radius: 3.5, linger: 12, lines: () => (boss.state === 'dead'
    ? ['TOET TOET! Feest!', '*danst in een rondje*', 'Mompel ligt nu met oordopjes te slapen. Hihi.']
    : ['TOET! Overmorgen is het Galmfeest! …Als we de instrumenten terugvinden.', 'Kopieer me maar met je drone, dan kun jij ook toeteren! Druk op F.', 'Als je hard toetert, waait alles weg. Ook kattenhaar!', 'Pssst… mijn kleine broertjes hebben zich verstopt. Ze willen verstoppertje spelen.']) });
  FOLK.push(f);
}
// Opper-Toeter Tuut
const tuut = { ...toeter(0xff4a4a, 1.5, true), state: save.tuut || 'new' };
tuut.root.position.copy(TUUT_AT);
scannables.push({ name: 'Opper-Toeter Tuut', ability: 'galm', obj: tuut.root, offset: V3(0, 1.6, 0) });
const PART = {
  drum: { name: 'de trommelstokken', at: STICKS_AT, inst: 'de trommels', layer: 'drum', hint: 'op een rots tussen de trommels' },
  orgel: { name: 'de blaasbalg van het orgel', at: BELLOWS_AT, inst: 'het orgel', layer: 'orgel', hint: 'helemaal boven op de trommeltoren' },
  xylo: { name: 'de xylofoonhamers', at: null, inst: 'de xylofoon', layer: 'bel', hint: 'in een zak in de boom midden in de wei. Die zak hangt hoog: toeter hem eruit!' },
  tuba: { name: 'het mondstuk van de tuba', at: MOUTH_AT, inst: 'de tuba', layer: 'tuba', hint: 'boven op de rotswand in het oosten' },
};
const KEYS4 = ['drum', 'orgel', 'xylo', 'tuba'];
addSpeaker(tuut.root, { y: 2.3, radius: 5, linger: 16, lines: () => {
  if (tuut.state === 'new') return ['TOEEET! Bezoek! Kom even hier!'];
  if (boss.state === 'dead') return ['Wat een feest! TOET TOET TOET!', 'Honderd jaar hebben we Mompel wakker gehouden. Nu is hij gewoon in de band. Waarom hebben we dat nooit eerder gevraagd?', 'Neem nog een stuk taart!'];
  if (tuut.state === 'done') return ['Op naar het podium! TOET!'];
  const left = KEYS4.filter((k) => !save.parts.includes(k));
  if (!left.length) return ['ALLE ONDERDELEN! Kom snel praten, dan beginnen we!'];
  return [`Nog ${left.length} instrument${left.length > 1 ? 'en' : ''} kapot.`, ...left.map((k) => `${PART[k].name[0].toUpperCase()}${PART[k].name.slice(1)}… ligt volgens Nathan ${PART[k].hint}.`)];
} });

// ---------- Nathan ----------
const nathan = { root: new THREE.Group(), sneezeT: 2 };
{
  const r = nathan.root; r.position.copy(NATHAN_AT); r.rotation.y = Math.PI; scene.add(r);
  const skin = toon(0xf0c8a0), shirt = toon(0xffffff), pants = toon(0x3a4a8a), capC = toon(0x2a4ae0);
  for (const s of [-1, 1]) mk(new THREE.CapsuleGeometry(0.12, 0.5, 4, 8), pants, 0.15 * s, 0.35, 0, r);
  mk(new THREE.CapsuleGeometry(0.28, 0.5, 4, 10), shirt, 0, 1.05, 0, r);
  mk(new THREE.BoxGeometry(0.08, 0.26, 0.02), toon(0x2a4ae0), 0, 1.12, 0.29, r, 0);   // the number 1 on his shirt
  nathan.head = new THREE.Group(); nathan.head.position.set(0, 1.65, 0); r.add(nathan.head);
  mk(new THREE.SphereGeometry(0.26, 16, 12), skin, 0, 0, 0, nathan.head);
  eyes(nathan.head, 0.03, 0.23, 0.09, 0.035);
  nathan.nose = mk(new THREE.SphereGeometry(0.07, 8, 6), toon(0xff6a6a), 0, -0.04, 0.26, nathan.head, 0);
  mk(new THREE.SphereGeometry(0.27, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), capC, 0, 0.05, 0, nathan.head, 0);
  mk(new THREE.BoxGeometry(0.34, 0.03, 0.3), capC, 0, 0.07, 0.3, nathan.head, 0);
  // arms and the bat over his shoulder
  nathan.arm = new THREE.Group(); nathan.arm.position.set(0.3, 1.3, 0); r.add(nathan.arm);
  mk(new THREE.CapsuleGeometry(0.08, 0.4, 4, 8), skin, 0.05, -0.2, 0.1, nathan.arm);
  nathan.bat = mk(new THREE.CylinderGeometry(0.08, 0.04, 1.1, 10), toon(0xc8985a), 0.05, 0.25, -0.25, nathan.arm); nathan.bat.rotation.x = -0.6;
  mk(new THREE.CapsuleGeometry(0.08, 0.4, 4, 8), skin, -0.32, 1.05, 0.05, r);
}
const sneezing = () => save.hair.length < HAIR.length;
addSpeaker(nathan.root, { y: 2.2, radius: 5, linger: 16, lines: () => {
  if (!sneezing() && boss.state === 'dead') return ['Mompel speelt best goed tamboerijn, eigenlijk.', 'Ik sta hier lekker aan de rand. Otis staat aan de andere kant. Afspraak is afspraak.', 'Mijn slagkooi staat nog in het dorp, hoor. Voor de luchtballon.'];
  if (!sneezing()) return ['Ik kan weer ADEMEN! Stap op de plaat en druk op E. Dan sla ik je ergens heen. Ver weg. Heel hoog.', 'Daar boven het trommelveld hangt een luchtballon. Mooi doelwit.', 'Is dat een HOND bij je raket? Hou hem daar alsjeblieft. Op afstand. Goed zo.'];
  return ['HA-HA-HATSJOE!', `Josh! ${'*snif*'} Die katten zijn hier gisteren langsgekomen. Ze hebben overal HAAR laten liggen. HATSJOE!`, `Nog ${HAIR.length - save.hair.length} plukken kattenhaar. Kun je ze wegblazen? Met zo’n toeter?`, 'Ik nieste zo hard dat hun schotel ervan wiebelde. Ze lieten alles vallen. HATSJOE! Graag gedaan.', 'Ik ben allergisch voor katten. En voor honden. Ja, ook voor Otis. Sorry Otis.'];
} });
// the cat hair: five fuzzy clumps. Blow them away with Galm
const HAIR = [V3(-6, 0, 36.5), V3(-30, 0, 26), V3(22, 0, -5), V3(4, 0, -8), V3(44, 9, 4)].map((p, i) => {
  const g = new THREE.Group(); g.position.copy(p); scene.add(g);
  const m = toon(i % 2 ? 0x3a3640 : 0xf4ece0);
  for (let k = 0; k < 7; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.3 + Math.random() * 0.2, 8, 6), m); s.position.set((Math.random() - 0.5) * 0.9, 0.3 + Math.random() * 0.4, (Math.random() - 0.5) * 0.9); g.add(s); }
  g.visible = !save.hair.includes(i);
  return { g, p, i };
});
function nathanDone() {
  play([
    { say: { who: 'NATHAN', text: '*snuift* …*snuift nog een keer* …Hé. Ik nies niet meer!' }, cam: () => ({ pos: nathan.root.position.clone().add(V3(2, 2, 3)), look: nathan.root.position.clone().add(V3(0, 1.4, 0)) }) },
    { say: { who: 'NATHAN', text: 'Weet je wat, ik heb iets voor je. En: stap op de plaat in mijn slagkooi. Dan sla ik je ergens heen waar je nooit komt.' }, cam: () => ({ pos: nathan.root.position.clone().add(V3(2, 2, 3)), look: nathan.root.position.clone().add(V3(0, 1.4, 0)) }) },
  ], () => { addCookie(NATHAN_AT.x - 1.4, 1.2, NATHAN_AT.z - 1, COOKIE_NATHAN); });
}
// Galm from the story: blow away hair, knock the sack down
export function galmAt(from, dir) {
  let hit = false;
  for (const h of HAIR) {
    if (save.hair.includes(h.i)) continue;
    const d = V3(h.p.x - from.x, 0, h.p.z - from.z), L = d.length();
    if (L < 8 && Math.abs(h.p.y - from.y) < 3 && (L < 1.5 || d.normalize().dot(dir) > 0.5)) {
      save.hair.push(h.i); persist(); h.g.visible = false; hit = true;
      puff(h.p.clone().add(V3(0, 0.5, 0)), 20, 0xd8d0c8, 5, 3);
      toast(save.hair.length < HAIR.length ? `Weggeblazen! Nog ${HAIR.length - save.hair.length} plukken kattenhaar` : 'Al het kattenhaar is weg! Ga naar Nathan');
    }
  }
  if (!sack.down) {
    const d = V3(SACK.x - from.x, 0, SACK.z - from.z), L = d.length();
    if (L < 10 && (L < 1.5 || d.normalize().dot(dir) > 0.6)) { sack.down = true; sack.vy = 0; hit = true; toast('De zak valt uit de boom!'); sfx.pop(); }
  }
  return hit;
}

// ---------- the cats' sack in the tree, with the xylophone hammers in it ----------
const SACK = V3(5, 7, -2);
const sack = { g: new THREE.Group(), down: save.parts.includes('xylo') || !!save.sackDown, vy: 0 };
{
  // the tree
  const trunk = mk(new THREE.CylinderGeometry(0.35, 0.5, 8, 10), toon(0x8a5a3a), SACK.x - 1.4, 4, SACK.z, scene);
  void trunk;
  for (const [dx, dy, dz, r] of [[-1.4, 8.6, 0, 2.6], [0.2, 8, 0.6, 2], [-2.6, 7.8, -0.8, 1.8]]) mk(new THREE.SphereGeometry(r, 14, 10), toon(0x5ac85a), SACK.x + dx, dy, SACK.z + dz, scene);
  const branch = mk(new THREE.CylinderGeometry(0.12, 0.12, 2), toon(0x8a5a3a), SACK.x - 0.5, 7.6, SACK.z, scene, 0); branch.rotation.z = Math.PI / 2;
  const s = sack.g; s.position.copy(SACK); scene.add(s);
  mk(new THREE.SphereGeometry(0.5, 12, 10), toon(0x8a6aaa), 0, 0, 0, s).scale.set(1, 1.2, 1);
  // a cat face printed on it
  for (const sx of [-1, 1]) { const ear = mk(new THREE.ConeGeometry(0.1, 0.2, 4), toon(0x3a2a4a), 0.18 * sx, 0.3, 0.42, s, 0); ear.rotation.x = 0.4; }
  eyes(s, 0.1, 0.48, 0.12, 0.05, new THREE.MeshBasicMaterial({ color: 0x7dff9a }));
  if (sack.down) s.position.y = groundAt(SACK.x, SACK.z, 0) + 0.6;
}

// ---------- the parts ----------
const items = KEYS4.map((k) => {
  const g = new THREE.Group(); scene.add(g);
  const gold = toon(0xffd04a), wood = toon(0xc8985a);
  if (k === 'drum') for (const s of [-1, 1]) { const c = mk(new THREE.CylinderGeometry(0.06, 0.05, 1, 8), wood, 0.12 * s, 0, 0, g); c.rotation.z = 0.3 * s; mk(new THREE.SphereGeometry(0.1, 8, 6), toon(0xfff4e0), 0.12 * s - 0.15 * s, 0.5, 0, g, 0); }
  if (k === 'orgel') { mk(new THREE.BoxGeometry(0.8, 0.4, 0.6), toon(0x8a4a2a), 0, 0, 0, g); mk(new THREE.CylinderGeometry(0.06, 0.06, 0.5), gold, 0, 0, 0.5, g, 0).rotation.x = Math.PI / 2; }
  if (k === 'xylo') for (const s of [-1, 1]) { const c = mk(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 8), wood, 0.15 * s, 0, 0, g); c.rotation.z = 0.25 * s; mk(new THREE.SphereGeometry(0.14, 8, 6), toon(0xff4a8a), 0.15 * s - 0.11 * s, 0.45, 0, g, 0); }
  if (k === 'tuba') { mk(new THREE.CylinderGeometry(0.2, 0.08, 0.5, 14), gold, 0, 0, 0, g); mk(new THREE.TorusGeometry(0.2, 0.05, 6, 14), gold, 0, 0.25, 0, g, 0).rotation.x = Math.PI / 2; }
  g.add(new THREE.PointLight(0xffe080, 4, 5, 2));
  return { k, g };
});
const itemAt = (k) => (k === 'xylo' ? sack.g.position.clone().add(V3(0, 0.9, 0)) : PART[k].at);
function restoreInstrument(k, quiet = false) {
  INST[k] = true; sfx.layers[PART[k].layer] = true;
  if (k === 'tuba') sfx.layers.drum = sfx.layers.drum || INST.drum;
  if (quiet) return;
  sfx.cosmic(); sfx.fanfare();
  const msg = { drum: 'De trommels spelen weer! Land op een trommel als hij oplicht: dan vlieg je hoog.', orgel: 'Het orgel blaast weer! De pijpen gaan op de maat op en neer.', xylo: 'De xylofoon klinkt weer! De toetsen vormen een trap tegen de rotswand.', tuba: 'De tuba blaast weer! Er staat een luchtstroom naast het podium.' }[k];
  toast(msg);
  const left = KEYS4.filter((q) => !save.parts.includes(q)).length;
  if (!left) setTimeout(() => toast('Alle instrumenten doen het weer! Ga naar Opper-Toeter Tuut'), 3500);
}

// ---------- talking ----------
let lastP = V3(), partyPlaced = false;
const canTuut = (p) => p.distanceTo(tuut.root.position) < 3.2 && (tuut.state === 'new' || (tuut.state === 'search' && KEYS4.every((k) => save.parts.includes(k))));
const onPlate = (p) => Math.hypot(p.x - PLATE.x, p.z - PLATE.z) < 1 && p.y < 0.5;
const canNathan = (p) => p.distanceTo(nathan.root.position) < 3 && !sneezing() && !save.nathan;
export function nearMilo(p) { return canTuut(p) || canNathan(p) || (onPlate(p) && !sneezing()); }
export const npcPrompt = () => (canTuut(lastP) ? 'praten met Tuut' : onPlate(lastP) ? 'Nathan: sla me weg!' : 'praten met Nathan');
let batReq = false;
export function takeBat() { const r = batReq; batReq = false; return r; }
export function talk() {
  if (canTuut(lastP)) tuutTalk();
  else if (onPlate(lastP) && !sneezing()) batReq = true;
  else if (canNathan(lastP)) { save.nathan = true; persist(); nathanDone(); }
}
function tuutTalk() {
  const T = tuut.root.position;
  const cam = shot(V3(T.x + 2.6, T.y + 2, T.z + 3.4), V3(T.x, T.y + 1.1, T.z));
  if (tuut.state === 'new') {
    play([
      { say: { who: 'OPPER-TOETER TUUT', text: 'TOEEET! Welkom op de Feestplaneet! Ik ben Tuut, de baas van alle Toeters.' }, cam },
      { say: { who: 'OPPER-TOETER TUUT', text: 'Overmorgen is het Galmfeest. Eén keer per jaar maken we hier zo veel muziek dat de hele planeet meedeint!' }, cam },
      { say: { who: 'OPPER-TOETER TUUT', text: 'Maar gisteren kwamen er twee katten. Ze vinden lawaai stom. Ze hebben van al onze instrumenten een onderdeel gestolen.' }, cam },
      { say: { who: BYTE(), text: 'Kayo & Yara. Natuurlijk.' }, cam },
      { say: { who: 'OPPER-TOETER TUUT', text: 'Gelukkig nieste Nathan zo hard dat hun schotel ging wiebelen. Ze lieten alles over de wei vallen.' }, cam: shot(V3(NATHAN_AT.x + 2, 2.4, NATHAN_AT.z - 3.4), NATHAN_AT.clone().add(V3(0, 1.4, 0))) },
      { say: { who: 'OPPER-TOETER TUUT', text: 'De trommels, het orgel, de xylofoon en de tuba. Vind hun onderdelen, dan spelen ze weer.' }, cam: shot(V3(-8, 14, 10), V3(-10, 2, -10)) },
      { say: { who: 'OPPER-TOETER TUUT', text: 'En als ze alle vier weer spelen: dan begint het feest. Op het podium, daarboven!' }, cam: shot(V3(10, 18, -10), V3(STAGE.x, STAGE.y, STAGE.z)) },
    ], () => { tuut.state = 'search'; save.tuut = 'search'; persist(); });
  } else {
    play([
      { say: { who: 'OPPER-TOETER TUUT', text: 'Ze spelen ALLEMAAL weer! Hoor je dat?' }, cam, start() { sfx.fanfare(); } },
      { say: { who: 'OPPER-TOETER TUUT', text: 'Dan verklaar ik het Galmfeest voor… GEOPEND! Iedereen naar het podium!' }, cam },
      { say: { who: BYTE(), text: 'Hm. Hoor jij dat ook, Josh? Onder het podium. Iets… gromt.' }, cam: shot(V3(10, 16, -14), V3(STAGE.x, STAGE.y, STAGE.z)) },
    ], () => {
      tuut.state = 'done'; save.tuut = 'done'; persist(); boss.ready = true;
      addCookie(T.x + 1.4, 1.2, T.z + 1.4, COOKIE_TUUT);
      toast('Ga naar het Galmpodium! (Met de tuba-luchtstroom of over de orgelpijpen)');
    });
  }
}

// ---------- every frame ----------
export function updateNPCs(dt, t, p) {
  lastP.copy(p);
  const ph = beatPhase(), bob = INST.drum ? Math.max(0, 1 - ph * 3) : 0;
  // after the mole: everyone's partying up on the stage
  const party = boss.state === 'dead';
  // Toeters bob on the beat once the drums play, and potter round the village (or dance in a ring on the stage)
  FOLK.forEach((f, i) => {
    f.t += dt;
    if (party) {
      const a = t * 0.5 + (i / FOLK.length) * Math.PI * 2;
      const x = STAGE.x + Math.cos(a) * 5, z = STAGE.z - 3 + Math.sin(a) * 3.5;
      f.root.position.set(x, groundAt(x, z, 0.2), z);
      f.root.rotation.y = -a;
      f.bod.position.y = Math.max(0, 1 - ph * 2.5) * 0.45;
      f.bod.rotation.z = Math.sin(t * 6 + i) * 0.2;
      return;
    }
    const a = f.t * 0.35;
    f.root.position.set(f.home.x + Math.sin(a) * 1.4, groundAt(f.home.x, f.home.z, 0.2), f.home.z + Math.cos(a * 0.7) * 1.2);
    f.root.rotation.y = a + Math.PI / 2;
    f.bod.position.y = bob * 0.25 + Math.abs(Math.sin(f.t * 5)) * 0.05;
  });
  if (party && !partyPlaced) {
    partyPlaced = true;
    tuut.root.position.set(STAGE.x - 4.5, STAGE.y, STAGE.z - 8);
    nathan.root.position.set(STAGE.x + 6.5, STAGE.y, STAGE.z + 2);
  }
  tuut.bod.position.y = party ? Math.max(0, 1 - ph * 2.5) * 0.35 : bob * 0.25;
  const dl = Math.atan2(p.x - tuut.root.position.x, p.z - tuut.root.position.z) - tuut.root.rotation.y;
  if (p.distanceTo(tuut.root.position) < 7) tuut.root.rotation.y += Math.atan2(Math.sin(dl), Math.cos(dl)) * damp(3, dt);
  // Nathan sneezes
  if (sneezing()) {
    nathan.sneezeT -= dt;
    const k = nathan.sneezeT < 0.4 ? 1 - nathan.sneezeT / 0.4 : 0;
    nathan.head.rotation.x = -k * 0.4;
    if (nathan.sneezeT <= 0) {
      nathan.sneezeT = 3 + Math.random() * 3; nathan.head.rotation.x = 0.5;
      puff(nathan.root.position.clone().add(V3(0, 1.6, -0.4)), 10, 0xffffff, 3, 0.5);
      if (p.distanceTo(nathan.root.position) < 14) sfx.sneeze();
    } else nathan.head.rotation.x += (0 - nathan.head.rotation.x) * damp(5, dt);
  }
  const dn = Math.atan2(p.x - nathan.root.position.x, p.z - nathan.root.position.z) - nathan.root.rotation.y;
  if (p.distanceTo(nathan.root.position) < 8) nathan.root.rotation.y += Math.atan2(Math.sin(dn), Math.cos(dn)) * damp(2, dt);
  // the sack falls out of the tree
  if (sack.down) {
    const g = groundAt(SACK.x, SACK.z, 0) + 0.6;
    if (sack.g.position.y > g) { sack.vy -= 30 * dt; sack.g.position.y = Math.max(g, sack.g.position.y + sack.vy * dt); if (sack.g.position.y === g) { puff(sack.g.position.clone(), 12, 0xd8c8a8, 3, 1); sfx.stomp(); save.sackDown = true; persist(); } }
  } else sack.g.rotation.z = Math.sin(t * 1.5) * 0.12;
  // the parts: pick one up and its instrument plays again
  for (const it of items) {
    const got = save.parts.includes(it.k);
    const show = !got && (it.k !== 'xylo' || (sack.down && sack.g.position.y <= groundAt(SACK.x, SACK.z, 0) + 0.65));
    it.g.visible = show;
    if (!show) continue;
    const at = itemAt(it.k);
    it.g.position.set(at.x, at.y + Math.sin(t * 2) * 0.12, at.z); it.g.rotation.y = t * 1.5;
    if (p.clone().add(V3(0, 0.8, 0)).distanceTo(it.g.position) < 1.4) {
      save.parts.push(it.k); persist(); puff(it.g.position.clone(), 20, 0xffe080, 4, 2);
      restoreInstrument(it.k);
    }
  }
}

// back after a refresh
export function restoreNPCs(s, gotSet) {
  restoreTrials(s, gotSet);
  for (const k of save.parts) restoreInstrument(k, true);
  if (tuut.state === 'done') { boss.ready = true; if (!gotSet.has(COOKIE_TUUT)) addCookie(TUUT_AT.x + 1.4, 1.2, TUUT_AT.z + 1.4, COOKIE_TUUT); }
  if (save.nathan && !gotSet.has(COOKIE_NATHAN)) addCookie(NATHAN_AT.x - 1.4, 1.2, NATHAN_AT.z - 1, COOKIE_NATHAN);
}
