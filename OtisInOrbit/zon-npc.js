import { THREE, scene, toon, addOutline, V3, damp, puff, toast } from './core.js?v=sub1';
import { addCookie } from './cookies.js?v=sub1';
import { addSpeaker } from './bubbles.js?v=sub1';
import { getSave } from './save.js?v=sub1';
import { play, shot } from './cutscene.js?v=sub1';
import { LOOK } from './ui.js?v=sub1';
import * as sfx from './sfx.js?v=sub1';
import { ADAM_AT, PLUIS_AT, MOT_HOME, BRIL_SPOT, raftAt } from './zon-world.js?v=sub1';
import { boss } from './zon-boss.js?v=sub1';
import { TRIAL_RARE, restoreTrials } from './zon-trials.js?v=sub1';

// Who lives on the Zon: Adam (smart, sunburnt, says random things that turn out to be hints), Opa Pluis
// (the oldest chinchilla, too old to be hypnotised) and his grandchildren, who stand frozen with spiral eyes.
// A ground pound right next to one wakes it up; an awake chinchilla can be copied (Chinchilla: an extra jump).
// The sun moth over the crystals can be copied too (Zweef).
export const scannables = [];
export const dialog = { active: false };
export const PENDING_RARE = 5 + TRIAL_RARE;   // Adam's sunglasses, Opa Pluis, two rare crates, the snake, and the trial rewards
export const npcEvents = { onChange() {} };
export const miloTalked = () => false;
export const guideDone = () => false;
const { save, persist } = getSave('zon');
const BYTE = () => (LOOK.droneName || 'Byte').toUpperCase();

const ink = new THREE.MeshBasicMaterial({ color: 0x1a1030 });
const mk = (geo, mat, x, y, z, parent, ol = 1.08) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true;
  if (ol) addOutline(m, ol); parent.add(m); return m;
};
const eyes = (parent, y, z, gap, r = 0.05, mat = ink) => [-1, 1].map((s) => { const e = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), mat); e.position.set(gap * s, y, z); parent.add(e); return e; });
const prize = (x, y, z, name) => { addCookie(x, y, z, name); puff(V3(x, y, z), 18, 0xb79cff, 4, 2); };

// ---------- chinchillas ----------
const fur = toon(0xb8b4b0), belly = toon(0xf0ece4), earIn = toon(0xffb0b8);
const spiralTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 64); g.strokeStyle = '#9b3bff'; g.lineWidth = 5; g.beginPath();
  for (let a = 0; a < Math.PI * 7; a += 0.1) { const r = a * 1.35; g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); }
  g.stroke(); return new THREE.CanvasTexture(c);
})();
const spiralMat = new THREE.MeshBasicMaterial({ map: spiralTex });
function buildChin(parent, old = false) {
  const root = new THREE.Group(); parent.add(root);
  const bod = new THREE.Group(); root.add(bod);
  const b = mk(new THREE.SphereGeometry(0.42, 16, 12), old ? toon(0xd8d4cc) : fur, 0, 0.42, 0, bod); b.scale.set(1, 0.95, 1.05);
  mk(new THREE.SphereGeometry(0.3, 12, 10), belly, 0, 0.36, 0.2, bod, 0).scale.set(1, 1, 0.6);
  const head = new THREE.Group(); head.position.set(0, 0.86, 0.08); bod.add(head);
  mk(new THREE.SphereGeometry(0.3, 16, 12), old ? toon(0xd8d4cc) : fur, 0, 0, 0, head);
  for (const s of [-1, 1]) {
    const e = mk(new THREE.SphereGeometry(0.2, 12, 10), old ? toon(0xd8d4cc) : fur, 0.2 * s, 0.28, -0.04, head); e.scale.set(1, 1.15, 0.35); e.rotation.z = -0.35 * s;
    mk(new THREE.SphereGeometry(0.14, 10, 8), earIn, 0.2 * s, 0.28, 0.02, head, 0).scale.set(1, 1.15, 0.2);
  }
  const normal = eyes(head, 0.05, 0.26, 0.12, 0.065);
  const spiral = [-1, 1].map((s) => { const d = new THREE.Mesh(new THREE.CircleGeometry(0.085, 16), spiralMat); d.position.set(0.12 * s, 0.05, 0.285); head.add(d); return d; });
  mk(new THREE.SphereGeometry(0.035, 6, 4), earIn, 0, -0.05, 0.3, head, 0);
  for (const s of [-1, 1]) for (const dy of [-0.02, 0.03]) { const w = mk(new THREE.CylinderGeometry(0.005, 0.005, 0.32), ink, 0.17 * s, -0.06 + dy, 0.24, head, 0); w.rotation.z = Math.PI / 2 + dy * 4 * s; }
  const tail = mk(new THREE.SphereGeometry(0.2, 10, 8), old ? toon(0xd8d4cc) : fur, 0, 0.35, -0.45, bod); tail.scale.set(0.8, 1.4, 0.8);
  for (const s of [-1, 1]) mk(new THREE.SphereGeometry(0.1, 8, 6), belly, 0.2 * s, 0.06, 0.18, bod, 0);
  return { root, bod, head, normal, spiral };
}
// [id, raft or null, local x, local z]
const SPOTS = [['c1', 'stof', -1, 0.5], ['c2', 'stof', 4.6, 2.6], ['c3', 'panelen', -4, -3.4], ['c4', null, 31, -1], ['c5', 'kristal', -2.5, -4]];
const HYPNO = ['Zzz… gehoorzaam… de slang…', '…Kayo… en Yara… zijn… de baas…', '*staart met draai-oogjes in het niets*'];
const AWAKE = ['Huh?! Waar ben ik? Waarom sta ik op een paneel?', 'Dank je! Ik kan weer springen!', 'Kopieer mij maar: dan spring je in de lucht nóg een keer. Chinchillastijl!'];
const AFTER = ['De slang is weg! Iedereen is wakker!', 'Hop hop hop! Kijk hoe hoog!'];
const chins = SPOTS.map(([id, raft, lx, lz]) => {
  const c = { id, raft, lx, lz, awake: false, t: Math.random() * 5, hop: 0, ...buildChin(scene) };
  c.root.position.copy(raftAt(raft, lx, lz));
  c.root.rotation.y = Math.random() * 6;
  addSpeaker(c.root, { y: 1.6, radius: 4.5, linger: 14, lines: () => (c.awake ? (boss.state === 'dead' ? AFTER : AWAKE) : HYPNO) });
  return c;
});
const awakeCount = () => chins.filter((c) => c.awake).length;
function setAwake(c, loud) {
  if (c.awake) return;
  c.awake = true; c.hop = 1;
  c.normal.forEach((e) => (e.visible = true)); c.spiral.forEach((e) => (e.visible = false));
  scannables.push({ name: 'Chinchilla', ability: 'chinchilla', obj: c.root, offset: V3(0, 1, 0) });
  if (!loud) return;
  puff(c.root.position.clone().add(V3(0, 1, 0)), 16, 0xffffff, 4, 1.5); sfx.squeak();
  const n = awakeCount();
  toast(n < chins.length ? `Een chinchilla is wakker! Nog ${chins.length - n} betoverd` : 'Alle chinchillas zijn wakker! Vertel het Opa Pluis');
  save.woke = chins.filter((x) => x.awake).map((x) => x.id); persist();
}
chins.forEach((c) => { c.normal.forEach((e) => (e.visible = false)); });
// a ground pound right next to a hypnotised chinchilla gives it such a fright it wakes up
export function poundAt(p) {
  for (const c of chins) if (!c.awake && Math.hypot(p.x - c.root.position.x, p.z - c.root.position.z) < 2.8 && Math.abs(p.y - c.root.position.y) < 1.5) setAwake(c, true);
}
export function wakeAll() { chins.forEach((c) => setAwake(c, false)); save.woke = chins.map((x) => x.id); persist(); }

// ---------- Opa Pluis ----------
const PLUIS_NAME = 'Opa Pluis’ kleinkinderen';
const pluis = { state: save.pluis || 'new', ...buildChin(scene, true) };
pluis.root.position.copy(PLUIS_AT); pluis.root.rotation.y = 0.3; pluis.root.scale.setScalar(1.1);
pluis.normal.forEach((e) => (e.visible = true)); pluis.spiral.forEach((e) => (e.visible = false));
{
  // little round glasses and a walking stick
  for (const s of [-1, 1]) { const g = mk(new THREE.TorusGeometry(0.075, 0.012, 6, 14), ink, 0.12 * s, 0.05, 0.29, pluis.head, 0); }
  const stick = mk(new THREE.CylinderGeometry(0.025, 0.025, 0.8), toon(0x8a5a3a), 0.42, 0.4, 0.2, pluis.bod, 0); stick.rotation.z = -0.15;
}
addSpeaker(pluis.root, {
  y: 1.8, radius: 5, linger: 14,
  lines: () => {
    if (pluis.state === 'given') return ['Mijn kleinkinderen springen weer. Een opa kan niet gelukkiger zijn.', 'Vroeger sprong ik over de hele zon. Nu over mijn eigen staart. Soms.'];
    const left = chins.length - awakeCount();
    if (!left) return ['Allemaal wakker?! Kom hier, ik heb iets voor je!'];
    return [`Nog ${left} van mijn kleinkinderen staan te staren.`, 'Stamp vlak naast ze op de grond. Ground pound! Daar schrikken ze van.', 'Ze staan op de vlotten. Die drijven langs, dus wacht tot er eentje aanlegt.'];
  },
});
const canPluis = (p) => p.distanceTo(pluis.root.position) < 3 && (pluis.state === 'new' || (pluis.state === 'told' && awakeCount() === chins.length));
function pluisTalk() {
  const F = pluis.root.position;
  const cam = shot(V3(F.x + 2.2, F.y + 1.4, F.z + 2.4), V3(F.x, F.y + 0.8, F.z));
  if (pluis.state === 'new') {
    play([
      { say: { who: 'OPA PLUIS', text: 'Ah, een bezoeker. Pas op je voeten, jongen, de korst is heet.' }, cam },
      { say: { who: 'OPA PLUIS', text: 'Hier wonen wij: de chinchillas van de zon. We rollen in zonnestof en we springen. Héél hoog.' }, cam },
      { say: { who: 'OPA PLUIS', text: 'Maar laatst kwamen er twee katten. Met een slang van vuur aan een lijn.' }, cam },
      { say: { who: BYTE(), text: 'Kayo & Yara…' }, cam },
      { say: { who: 'OPA PLUIS', text: 'Die slang kijkt je aan met draai-ogen, en dan doe je alles wat de katten zeggen. Mijn kleinkinderen staan nu stokstijf op de vlotten.' }, cam },
      { say: { who: 'OPA PLUIS', text: 'Ik was te oud om te kijken. Ik zag niks zonder mijn bril. Geluk bij een ongeluk.' }, cam },
      { say: { who: 'OPA PLUIS', text: 'Stamp naast ze op de grond, dan schrikken ze wakker. Maak ze alle vijf wakker, alsjeblieft.' }, cam },
    ], () => { pluis.state = 'told'; save.pluis = 'told'; persist(); });
  } else {
    play([
      { say: { who: 'OPA PLUIS', text: 'Ze zijn er weer allemaal! Kijk ze springen!' }, cam, start() { sfx.squeak(); } },
      { say: { who: 'OPA PLUIS', text: 'Dit vond ik ooit in het zonnestof. Het gloeit paars, net als mijn oude pyjama.' }, cam },
    ], () => { pluis.state = 'given'; save.pluis = 'given'; persist(); prize(F.x + 1.2, 1.2, F.z + 1, PLUIS_NAME); });
  }
}

// ---------- Adam ----------
// Adam, the friend who lives here: clever, always saying random things. Without his sunglasses he's blind.
const ADAM_NAME = 'Adams zonnebril';
const adam = { root: new THREE.Group(), state: save.adam || 'new' };
{
  const r = adam.root; r.position.copy(ADAM_AT).add(V3(0, 0.15, 0.1)); scene.add(r);   // sits facing south, back against the chair
  const skin = toon(0xffc8a0), shirt = toon(0xffe04a), shorts = toon(0x3a8ad0), hair = toon(0x3a2a20);
  // sitting: legs forward
  for (const s of [-1, 1]) { const l = mk(new THREE.CapsuleGeometry(0.11, 0.6, 4, 8), skin, 0.15 * s, 0.4, 0.4, r); l.rotation.x = Math.PI / 2 - 0.2; }
  mk(new THREE.BoxGeometry(0.5, 0.25, 0.45), shorts, 0, 0.42, 0, r);
  const torso = mk(new THREE.CapsuleGeometry(0.24, 0.45, 4, 10), shirt, 0, 0.85, -0.12, r); torso.rotation.x = -0.35;
  for (const s of [-1, 1]) { const a = mk(new THREE.CapsuleGeometry(0.08, 0.45, 4, 8), skin, 0.32 * s, 0.9, -0.05, r); a.rotation.z = 0.5 * s; }
  adam.head = new THREE.Group(); adam.head.position.set(0, 1.42, -0.28); r.add(adam.head);
  mk(new THREE.SphereGeometry(0.25, 16, 12), skin, 0, 0, 0, adam.head);
  mk(new THREE.SphereGeometry(0.26, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2.2), hair, 0, 0.03, -0.02, adam.head, 0);
  adam.eyes = eyes(adam.head, 0.02, 0.23, 0.09, 0.04);
  // sunburnt cheeks and nose
  for (const s of [-1, 1]) mk(new THREE.SphereGeometry(0.05, 8, 6), toon(0xff7a6a), 0.15 * s, -0.06, 0.19, adam.head, 0);
  // a table tennis bat in his hand
  const bat = new THREE.Group(); bat.position.set(0.55, 0.7, 0.1); r.add(bat);
  mk(new THREE.CylinderGeometry(0.16, 0.16, 0.03, 16), toon(0xe0443a), 0, 0.15, 0, bat, 1.05).rotation.x = Math.PI / 2;
  mk(new THREE.BoxGeometry(0.05, 0.16, 0.04), toon(0xc8a070), 0, -0.02, 0, bat, 0);
  // the sunglasses, once they're back on his nose
  adam.glasses = new THREE.Group(); adam.glasses.position.set(0, 0.03, 0.24); adam.head.add(adam.glasses);
  for (const s of [-1, 1]) mk(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 14), ink, 0.09 * s, 0, 0, adam.glasses, 0).rotation.x = Math.PI / 2;
  mk(new THREE.BoxGeometry(0.1, 0.015, 0.015), ink, 0, 0.02, 0, adam.glasses, 0);
  adam.glasses.visible = false;
}
// before his glasses are back: complaining. After: random remarks that quietly point at cosmic cookies.
const ADAM_LINES = {
  new: ['AU, mijn ogen! Wie is daar? Josh? Ik herken je aan je voetstappen. Ze klinken nerdy.', 'Het is hier zo fel. Ik zie alleen maar wit.'],
  search: ['Mijn zonnebril ligt ergens op een vlot. Het vlot met die gouden boog, denk ik. Hij dreef zo weg.', 'Wist je dat de zon 8 minuten oud is als je hem ziet? Ik zie niks, dus voor mij is hij nul.'],
  carry: ['Ruik ik… mijn zonnebril?! Kom hier!'],
  done: [
    'Wist je dat stof heel lui is? Het blijft liggen tot iemand er hard op stampt. Drie keer.',

    'Sommige kristallen zijn er maar half. Spring alleen op degene die gloeien.',
    'Als je op een vlot stilstaat, sta je eigenlijk niet stil. Halverwege de Stofbadroute blaast de zon soms omhoog.',
    'Een eenzame zuil is gewoon een zuil waar niemand op springt. Ga eens langs, vanaf de Ringvlot.',


    'Torens zijn eigenlijk heel korte raketten. Spring er eens vanaf, met chinchillabenen, en dan nog een keer. En nog een keer.',
    'Lucht is lui. Behalve heel hete lucht: die wil altijd omhoog. Kijk eens links van de Westrots.',
    'Bellen zijn ongeduldig. Als je er eentje laat klinken, willen de andere twee ook. Snel.',
    'Er rent hier een chinchilla rond met een hoofdband. Volgens mij heeft hij iets dat niet van hem is.',
    'Oude zonnepanelen zijn moe. Als je erop staat, gaan ze liggen. Dus sta er niet op. Spring.',
    'Tafeltennis op de zon is lastig. Het balletje smelt.',
  ],
};
addSpeaker(adam.root, { y: 2.2, radius: 5, linger: 16, lines: () => ADAM_LINES[adam.state] });
// the sunglasses on the Ringvlot; once picked up they float above Josh
const bril = new THREE.Group(); scene.add(bril);
{
  for (const s of [-1, 1]) mk(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 16), toon(0x1a1a2a), 0.22 * s, 0, 0, bril, 1.1).rotation.x = Math.PI / 2;
  mk(new THREE.BoxGeometry(0.22, 0.04, 0.04), toon(0xffe04a), 0, 0.05, 0, bril, 0);
  const l = new THREE.PointLight(0xffffff, 3, 5, 2); bril.add(l);
}
const canAdam = (p) => p.distanceTo(adam.root.position) < 3.2 && (adam.state === 'new' || adam.state === 'carry');
function adamTalk() {
  const F = adam.root.position;
  const cam = shot(V3(F.x - 2, F.y + 1.6, F.z + 2.8), V3(F.x, F.y + 1.1, F.z));
  if (adam.state === 'new') {
    play([
      { say: { who: 'ADAM', text: 'Josh? Ben jij dat? Wist je dat jouw voetstappen precies klinken als een toetsenbord?' }, cam },
      { say: { who: 'ADAM', text: 'Ik kwam hier voor een tafeltennistoernooi. Op de zon. Dat leek me een goed idee.' }, cam },
      { say: { who: 'ADAM', text: 'Het balletje smolt na twee seconden. En toen kwamen er twee katten met een slang. Een slang van VUUR.' }, cam },
      { say: { who: BYTE(), text: 'Kayo & Yara. Ze zijn overal.' }, cam },
      { say: { who: 'ADAM', text: 'Ik schrok zo dat mijn zonnebril van mijn neus viel. Op een vlot. En dat vlot dreef weg.' }, cam },
      { say: { who: 'ADAM', text: 'Nu zie ik alleen maar wit. Het vlot met de gouden boog, volgens mij. Kun je hem zoeken?' }, cam },
    ], () => { adam.state = save.bril ? 'carry' : 'search'; save.adam = adam.state; persist(); });
  } else {
    play([
      { say: { who: 'ADAM', text: 'MIJN ZONNEBRIL!' }, cam, start() { brilOn(); sfx.copy(); puff(F.clone().add(V3(0, 1.5, 0)), 12, 0xffffff, 3, 1); } },
      { say: { who: 'ADAM', text: 'Ik zie weer! Wauw, jij ziet er ook… nog steeds hetzelfde uit.' }, cam },
      { say: { who: 'ADAM', text: 'Hier. Dit lag onder mijn stoel. Wist je dat paars de kleur is die je het makkelijkst onthoudt? Dat heb ik net verzonnen.' }, cam },
      { say: { who: 'ADAM', text: 'O, en ik zie nu van alles. Kom gerust terug, dan vertel ik wat me opvalt.' }, cam },
    ], () => { adam.state = 'done'; save.adam = 'done'; save.bril = false; persist(); prize(F.x + 1.4, 1.2, F.z + 1.2, ADAM_NAME); });
  }
}
function brilOn() { adam.glasses.visible = true; bril.visible = false; }

// ---------- the sun moth over the crystal raft (Zweef) ----------
const mot = new THREE.Group(); scene.add(mot);
const wings = [];
{
  mk(new THREE.CapsuleGeometry(0.08, 0.3, 4, 8), toon(0x6a4a2a), 0, 0, 0, mot).rotation.x = Math.PI / 2;
  for (const s of [-1, 1]) {
    const w = new THREE.Group(); w.position.x = 0.05 * s; mot.add(w);
    const m = mk(new THREE.CircleGeometry(0.4, 14), new THREE.MeshBasicMaterial({ color: 0xffb030, side: THREE.DoubleSide }), 0.35 * s, 0, 0, w, 0); m.rotation.x = -Math.PI / 2; m.scale.set(1, 0.7, 1);
    wings.push({ w, s });
  }
  eyes(mot, 0.03, 0.2, 0.05, 0.03);
  const l = new THREE.PointLight(0xffb030, 3, 5, 2); mot.add(l);
}
scannables.push({ name: 'Zonnemot', ability: 'zweef', obj: mot, offset: V3(0, 1, 0) });

export function nearMilo(p) { return canAdam(p) || canPluis(p); }
export const npcPrompt = () => (canAdam(lastP) ? 'praten met Adam' : 'praten met Opa Pluis');
const lastP = V3();
export function talk() { if (canAdam(lastP)) adamTalk(); else if (canPluis(lastP)) pluisTalk(); }
let lastAbility = () => null;
export function setAbilityProbe(fn) { lastAbility = fn; }

export function updateNPCs(dt, t, p) {
  lastP.copy(p);
  for (const c of chins) {
    c.t += dt;
    const base = raftAt(c.raft, c.lx, c.lz);
    if (c.awake) {
      // hop on the spot, and look at Josh
      c.hop = Math.max(0, c.hop - dt);
      c.root.position.set(base.x, base.y + Math.abs(Math.sin(c.t * 4)) * (0.25 + c.hop), base.z);
      const d = Math.atan2(p.x - c.root.position.x, p.z - c.root.position.z) - c.root.rotation.y;
      if (p.distanceTo(c.root.position) < 7) c.root.rotation.y += Math.atan2(Math.sin(d), Math.cos(d)) * damp(4, dt);
      c.bod.rotation.z = 0;
    } else {
      // frozen and swaying, spiral eyes turning
      c.root.position.copy(base);
      c.bod.rotation.z = Math.sin(c.t * 1.5) * 0.12;
      c.spiral.forEach((e, i) => (e.rotation.z = t * (i ? 5 : -5)));
    }
  }
  pluis.bod.rotation.z = Math.sin(t * 1.2) * 0.04;
  const dl = Math.atan2(p.x - pluis.root.position.x, p.z - pluis.root.position.z) - pluis.root.rotation.y;
  if (p.distanceTo(pluis.root.position) < 6) pluis.root.rotation.y += Math.atan2(Math.sin(dl), Math.cos(dl)) * damp(3, dt);
  adam.head.rotation.y = Math.sin(t * 0.7) * 0.3;
  // the moth flutters in circles over the crystals
  const mh = raftAt(MOT_HOME.raft, MOT_HOME.lx, MOT_HOME.lz);
  mot.position.set(mh.x + Math.cos(t * 0.9) * 1.6, 2.2 + Math.sin(t * 2.3) * 0.4, mh.z + Math.sin(t * 0.9) * 1.6);
  mot.rotation.y = -t * 0.9;
  for (const { w, s } of wings) w.rotation.z = Math.sin(t * 18) * 0.7 * s;
  // the sunglasses
  if (adam.state !== 'done' && !save.bril) {
    const b = raftAt(BRIL_SPOT.raft, BRIL_SPOT.lx, BRIL_SPOT.lz);
    bril.position.set(b.x, 0.8 + Math.sin(t * 2) * 0.1, b.z); bril.rotation.y = t;
    if (p.clone().add(V3(0, 0.8, 0)).distanceTo(bril.position) < 1.5) {
      save.bril = true; persist(); sfx.copy();
      puff(bril.position.clone(), 12, 0xffffff, 3, 1.5);
      toast('Adams zonnebril! Breng hem terug naar zijn strandstoel');
      if (adam.state === 'search') adam.state = 'carry';
    }
  } else if (save.bril && adam.state !== 'done') {
    bril.position.lerp(p.clone().add(V3(0, 2.4, 0)), damp(10, dt)); bril.rotation.y = t * 2;
  }
}

// back after a refresh
export function restoreNPCs(s, got) {
  restoreTrials(s, got);
  for (const c of chins) if ((s.woke || []).includes(c.id)) setAwake(c, false);
  if (s.adam === 'done') { adam.state = 'done'; brilOn(); if (!got.has(ADAM_NAME)) addCookie(adam.root.position.x + 1.4, 1.2, adam.root.position.z + 1.2, ADAM_NAME); }
  else if (s.adam === 'search' || s.adam === 'carry') adam.state = s.bril ? 'carry' : 'search';
  if (s.pluis === 'given' && !got.has(PLUIS_NAME)) addCookie(PLUIS_AT.x + 1.2, 1.2, PLUIS_AT.z + 1, PLUIS_NAME);
}
