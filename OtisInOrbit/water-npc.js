import { THREE, scene, toon, addOutline, V3, damp, puff, toast } from './core.js?v=sub1';
import { addCookie } from './cookies.js?v=sub1';
import { addSpeaker } from './bubbles.js?v=sub1';
import { getSave } from './save.js?v=sub1';
import { play, shot } from './cutscene.js?v=sub1';
import { LOOK } from './ui.js?v=sub1';
import * as sfx from './sfx.js?v=sub1';
import { TOP, ARENA } from './water-terrain.js?v=sub1';
import { DENIZ_AT, PINGO_AT, SPIRIT_AT, THRONE, SPIRE, showSpire, TOREN, cycle } from './water-world.js?v=sub1';
import { boss, bossActive } from './water-boss.js?v=sub1';
import { TRIAL_RARE, restoreTrials } from './water-trials.js?v=sub1';

// Who lives on the Waterplaneet: Deniz, the Duke of Ice, sitting by what's left of his throne (very cool about
// it, he says); a colony of penguins in the bay, with Pingo, whose cold you can copy (Vries); and a little ice
// spirit by the crab reef that you can copy too, so nobody walks into that fight without Vries.
export const scannables = [];
export const dialog = { active: false };
export const PENDING_RARE = 4 + TRIAL_RARE;      // Deniz, the palace spire, the pier crate, the crab, and the trials
export const npcEvents = { onChange() {} };
export const miloTalked = () => false;
export const guideDone = () => false;
const { save, persist } = getSave('water');
const BYTE = () => (LOOK.droneName || 'Byte').toUpperCase();

const ink = new THREE.MeshBasicMaterial({ color: 0x1a1030 });
const mk = (geo, mat, x, y, z, parent, ol = 1.08) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true;
  if (ol) addOutline(m, ol); parent.add(m); return m;
};
const eyes = (parent, y, z, gap, r = 0.05, mat = ink) => [-1, 1].map((s) => { const e = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), mat); e.position.set(gap * s, y, z); parent.add(e); return e; });
const prize = (x, y, z, name) => { addCookie(x, y, z, name); puff(V3(x, y, z), 18, 0xb79cff, 4, 2); };

// ---------- penguins ----------
function penguin(parent, scarf = null) {
  const root = new THREE.Group(); parent.add(root);
  const bod = new THREE.Group(); root.add(bod);
  const b = mk(new THREE.SphereGeometry(0.4, 14, 12), toon(0x2a2a3a), 0, 0.5, 0, bod); b.scale.set(0.9, 1.25, 0.85);
  mk(new THREE.SphereGeometry(0.33, 14, 12), toon(0xf8f8f8), 0, 0.45, 0.1, bod, 0).scale.set(0.85, 1.15, 0.7);
  eyes(bod, 0.88, 0.3, 0.1, 0.045);
  const beak = mk(new THREE.ConeGeometry(0.07, 0.2, 6), toon(0xffa030), 0, 0.8, 0.38, bod, 0); beak.rotation.x = Math.PI / 2;
  for (const s of [-1, 1]) { const w = mk(new THREE.SphereGeometry(0.15, 8, 6), toon(0x2a2a3a), 0.36 * s, 0.5, 0, bod, 0); w.scale.set(0.35, 1.2, 0.7); w.rotation.z = 0.2 * s; }
  for (const s of [-1, 1]) mk(new THREE.SphereGeometry(0.1, 8, 6), toon(0xffa030), 0.14 * s, 0.03, 0.12, root, 0).scale.set(1, 0.4, 1.5);
  if (scarf) { const sc = mk(new THREE.TorusGeometry(0.3, 0.07, 6, 16), toon(scarf), 0, 0.72, 0, bod, 0); sc.rotation.x = Math.PI / 2; }
  return { root, bod };
}
const colony = [[-36, 30], [-32, 32], [-29, 27], [-37, 21], [-33, 20]].map(([x, z], i) => {
  const p = { ...penguin(scene, i === 2 ? 0x5ac8f0 : null), home: V3(x, TOP, z), t: Math.random() * 6 };
  p.root.position.copy(p.home);
  addSpeaker(p.root, { y: 1.4, radius: 3.5, linger: 12, lines: () => (cycle.night ? ['*glijdt op zijn buik over het ijs* WIEEE!', 'Nacht! IJs! Eindelijk!'] : ['Kwek. Het is te warm.', 'Vroeger was hier overal ijs. Nu moeten we zwemmen. Brrr.', 'Wacht tot het nacht wordt. Dan bevriest de zee.']) });
  return p;
});
// Pingo: the one with the red scarf. Copy him for Vries.
const pingo = { ...penguin(scene, 0xe0443a), t: 0 };
pingo.root.position.copy(PINGO_AT); pingo.root.scale.setScalar(1.15);
scannables.push({ name: 'Pingo', ability: 'vries', obj: pingo.root, offset: V3(0, 1.2, 0) });
addSpeaker(pingo.root, { y: 1.6, radius: 5, linger: 14, lines: ['Ik ben Pingo! Ik ben zo koud dat het water bevriest als ik erop spuug.', 'Kopieer mij maar met je drone. Dan druk je op F, en: ijsschots!', 'Met ijsschotsen kom je overal. Ook overdag. Ook op plekken waar nooit ijs komt.', 'Ik heb visjes verstopt op het ijs, maar ze zwemmen weg als je er te lang over doet. Alleen ’s nachts!'] });
// the little ice spirit at the crab reef
const spirit = new THREE.Group(); spirit.position.copy(SPIRIT_AT); scene.add(spirit);
const SPIRIT_FIGHT = V3(ARENA.x + 4, TOP + 2.2, ARENA.z + 11.6);   // just inside the arena wall, above the crab's reach
let spiritToast = false;
{
  const m = new THREE.MeshBasicMaterial({ color: 0xbfeaff, transparent: true, opacity: 0.85 });
  mk(new THREE.SphereGeometry(0.35, 14, 10), m, 0, 1.1, 0, spirit, 0);
  const tail = mk(new THREE.ConeGeometry(0.3, 0.8, 10), m, 0, 0.6, 0, spirit, 0); tail.rotation.x = Math.PI;
  eyes(spirit, 1.15, 0.3, 0.11, 0.05);
  const l = new THREE.PointLight(0x9ae8ff, 3, 5, 2); l.position.y = 1.1; spirit.add(l);
}
scannables.push({ name: 'IJsgeestje', ability: 'vries', obj: spirit, offset: V3(0, 1.4, 0) });
addSpeaker(spirit, { y: 1.9, radius: 5, linger: 12, lines: () => (boss.state === 'dead' ? ['De ketel is koud! Ik voel me zo fris!'] : ['Daar woont Kapitein Kraak. Zijn ketel is gloeiend heet.', 'Als hij oververhit raakt, moet je hem bevriezen. Kopieer mij, dan kun je dat!']) });

// ---------- Deniz ----------
// Deniz, the Duke of Ice: always cool, always calm. His palace melted, but he isn't upset. Officially.
const DENIZ_NAME = 'Deniz’ ijskroon';
const SPIRE_NAME = 'Top van het ijspaleis';
const deniz = { root: new THREE.Group(), state: save.deniz || 'new' };
{
  const r = deniz.root; r.position.copy(DENIZ_AT).add(V3(0, 0, 0.6)); scene.add(r);
  const skin = toon(0xf0d4c0), coat = toon(0x3a6aa8), cape = toon(0xf4fcff), boots = toon(0x2a2a3a), hair = toon(0xe8f0f8);
  for (const s of [-1, 1]) mk(new THREE.CapsuleGeometry(0.12, 0.55, 4, 8), boots, 0.16 * s, 0.38, 0, r);
  mk(new THREE.CapsuleGeometry(0.3, 0.6, 4, 10), coat, 0, 1.15, 0, r);
  const capeM = mk(new THREE.CylinderGeometry(0.35, 0.6, 1.2, 14, 1, true, Math.PI * 0.6, Math.PI * 0.8), cape, 0, 1.05, -0.05, r, 0); capeM.material.side = THREE.DoubleSide;
  // arms crossed
  for (const s of [-1, 1]) { const a = mk(new THREE.CapsuleGeometry(0.09, 0.45, 4, 8), coat, 0.12 * s, 1.25, 0.28, r); a.rotation.z = Math.PI / 2; a.rotation.y = 0.3 * s; }
  deniz.head = new THREE.Group(); deniz.head.position.set(0, 1.85, 0); r.add(deniz.head);
  mk(new THREE.SphereGeometry(0.27, 16, 12), skin, 0, 0, 0, deniz.head);
  mk(new THREE.SphereGeometry(0.28, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2.3), hair, 0, 0.04, -0.02, deniz.head, 0);
  eyes(deniz.head, 0.02, 0.24, 0.09, 0.035);
  const brow = mk(new THREE.BoxGeometry(0.28, 0.025, 0.02), ink, 0, 0.09, 0.25, deniz.head, 0); brow.rotation.z = 0.04;
  // the crown: melted down to a stump, until it's fixed
  deniz.crown = new THREE.Group(); deniz.crown.position.y = 0.26; deniz.head.add(deniz.crown);
  const iceM = new THREE.MeshBasicMaterial({ color: 0xbfeaff, transparent: true, opacity: 0.9 });
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; const s = mk(new THREE.ConeGeometry(0.06, 0.32, 5), iceM, Math.cos(a) * 0.17, 0.1, Math.sin(a) * 0.17, deniz.crown, 0); s.userData.full = 0.32; }
  mk(new THREE.TorusGeometry(0.18, 0.03, 6, 16), iceM, 0, 0, 0, deniz.crown, 0).rotation.x = Math.PI / 2;
  deniz.crown.scale.y = 0.3;
}
// three ice hearts: put them back and the palace freezes up again
export const HEARTS = [
  { id: 'baai', at: V3(-35.2, TOP + 5.7, 22.2), day: false, hint: 'op de pinguïnrots in de baai' },
  { id: 'bank', at: V3(20, -0.1, -3), day: true, hint: 'op de zandbank naar de vuurtoren (alleen bij eb te pakken)' },
  { id: 'toren', at: V3(TOREN.x + Math.cos(2.6 + 4 * 0.75) * 2.9, TOP + 6 + 0.9, TOREN.z + Math.sin(2.6 + 4 * 0.75) * 2.9), day: false, hint: 'op een ijspegel halverwege de vuurtoren' },
];
const got = new Set(save.hearts || []);
const heartMat = new THREE.MeshBasicMaterial({ color: 0x7ad8ff });
for (const h of HEARTS) {
  h.m = new THREE.Group(); h.m.position.copy(h.at); scene.add(h.m);
  const g = new THREE.Mesh(new THREE.OctahedronGeometry(0.4, 0), heartMat); g.scale.y = 1.3; addOutline(g, 1.1); h.m.add(g);
  const l = new THREE.PointLight(0x7ad8ff, 4, 5, 2); h.m.add(l);
  h.m.visible = !got.has(h.id);
}
const DENIZ_LINES = {
  new: ['Hm. Bezoek.', 'Ik ben niet verdrietig. Ik ben ijskoud. Dat is iets anders.'],
  search: () => [`Nog ${HEARTS.length - got.size} ijsharten. Niet dat het me iets kan schelen.`, ...HEARTS.filter((h) => !got.has(h.id)).map((h) => `Er ligt er een ${h.hint}. Zei een pinguïn.`), 'Mijn troon smelt. Ik zit er gewoon naast. Stoer.'],
  ready: ['Je hebt ze. Alle drie. …Dat is best aardig van je.'],
  done: [
    'Mijn paleis staat weer. Een beetje. De rest komt vanzelf, als die krab ophoudt met koken.',
    'Wist je dat de vuurtoren ’s nachts ijspegels krijgt? Klimmen. Dan het licht volgen.',
    'Het water onder de pier is bij eb heel ondiep. Wat daar ligt weet ik niet. Iets met een krat.',
    'Ik zag een ijsberg die overdag de zee op drijft. Wie erop blijft staan als de zon opkomt, heeft geluk. Of pech.',
    'Mijn waterval bevriest ’s nachts. Als trap. Ik heb hem zo ontworpen. Echt waar.',
    'Ver in het westen staat een paal in de zee. Daar kom je alleen met ijs dat je zelf maakt.',
    'Bij eb steekt er oostelijk van het strand een oud schip boven het water uit. Zwemmen is koud. Snel zijn.',
    'Pingo heeft visjes verstopt op het ijs. ’s Nachts. Snel zijn, zei hij.',
    'Soms zweven er ’s nachts drie ijsgeesten rond. Op het strand, bij de vuurtoren en bij het rif. Raak ze alle drie in één nacht.',
  ],
};
addSpeaker(deniz.root, { y: 2.6, radius: 5, linger: 16, lines: () => { const L = DENIZ_LINES[deniz.state]; return typeof L === 'function' ? L() : L; } });
const canDeniz = (p) => p.distanceTo(deniz.root.position) < 3.2 && (deniz.state === 'new' || deniz.state === 'ready');
function denizTalk() {
  const F = deniz.root.position;
  const cam = shot(V3(F.x + 2.4, F.y + 2, F.z + 3), V3(F.x, F.y + 1.6, F.z));
  if (deniz.state === 'new') {
    play([
      { say: { who: 'DENIZ', text: 'Josh. Hm. Welkom in mijn paleis.' }, cam },
      { say: { who: BYTE(), text: 'Welk paleis?' }, cam },
      { say: { who: 'DENIZ', text: 'Precies.' }, cam },
      { say: { who: 'DENIZ', text: 'Twee katten kwamen met een krab. De krab had een ketel vol magma van de zon op zijn rug. Alles smolt. Mijn torens, mijn zalen, mijn ijskroon.' }, cam },
      { say: { who: 'DENIZ', text: 'Ik ben er niet verdrietig om. Ik ben de Duke of Ice. Ik word niet verdrietig. Ik word hoogstens… een beetje nat.' }, cam },
      { say: { who: 'DENIZ', text: '’s Nachts bevriest de zee nog. Dan kun je over het ijs lopen. Overdag smelt het weer en gaat het water omlaag.' }, cam: shot(V3(F.x, F.y + 9, F.z + 18), V3(F.x, 0, F.z - 10)) },
      { say: { who: 'DENIZ', text: 'Er zijn drie ijsharten weggedreven. Breng ze terug, dan bevries ik mijn paleis weer. Een stukje.' }, cam },
      { say: { who: 'DENIZ', text: 'En die krab zit op het rif in het noorden. Als je toch langskomt.' }, cam },
    ], () => { deniz.state = got.size >= HEARTS.length ? 'ready' : 'search'; save.deniz = deniz.state; persist(); });
  } else {
    play([
      { say: { who: 'DENIZ', text: 'Drie ijsharten. Hm.' }, cam, start() { sfx.copy(); } },
      { dur: 3.4, say: { who: 'DENIZ', text: '*steekt zijn hand omhoog* …BEVRIES.' }, start() { showSpire(); sfx.grow(); for (let i = 0; i < 4; i++) puff(V3(SPIRE.x, TOP + i * 3, SPIRE.z), 18, 0xbfeaff, 6, 2); }, cam: shot(V3(SPIRE.x + 9, TOP + 6, SPIRE.z + 12), V3(SPIRE.x, TOP + 6, SPIRE.z)) },
      { say: { who: 'DENIZ', text: 'Zo. Een toren. Bovenop ligt iets dat ik al jaren kwijt ben. Haal maar.' }, cam },
      { say: { who: 'DENIZ', text: 'En deze is voor jou. Mijn kroon is weer heel, dus dit stukje ijs heb ik niet meer nodig. Het gloeit paars. Raar ijs.' }, cam, start() { deniz.crown.scale.y = 1; } },
    ], () => { deniz.state = 'done'; save.deniz = 'done'; persist(); prize(F.x + 1.4, TOP + 1.2, F.z + 1.4, DENIZ_NAME); addCookie(SPIRE.x, SPIRE.top + 1.3, SPIRE.z, SPIRE_NAME); });
  }
}
function heartsDone() { if (deniz.state === 'search' && got.size >= HEARTS.length) { deniz.state = 'ready'; save.deniz = 'ready'; persist(); } }

export function nearMilo(p) { return canDeniz(p); }
export const npcPrompt = () => 'praten met Deniz';
const lastP = V3();
export function talk() { if (canDeniz(lastP)) denizTalk(); }
let lastAbility = () => null;
export function setAbilityProbe(fn) { lastAbility = fn; }

export function updateNPCs(dt, t, p) {
  lastP.copy(p);
  // penguins waddle about; at night they slide
  for (const q of colony) {
    q.t += dt;
    const a = q.t * 0.4;
    q.root.position.set(q.home.x + Math.sin(a) * 1.2, TOP, q.home.z + Math.cos(a * 0.8) * 1);
    q.root.rotation.y = a + Math.PI / 2;
    q.bod.rotation.z = Math.sin(q.t * 8) * 0.12; q.bod.rotation.x = cycle.night ? 0.8 : 0;
  }
  pingo.bod.rotation.z = Math.sin(t * 6) * 0.1;
  const dl = Math.atan2(p.x - pingo.root.position.x, p.z - pingo.root.position.z) - pingo.root.rotation.y;
  if (p.distanceTo(pingo.root.position) < 6) pingo.root.rotation.y += Math.atan2(Math.sin(dl), Math.cos(dl)) * damp(3, dt);
  // in a fight he follows you into the arena and hovers by the edge, so you can still copy Vries in there
  const fight = bossActive();
  const home = fight ? SPIRIT_FIGHT : SPIRIT_AT;
  spirit.position.x += (home.x - spirit.position.x) * damp(2.5, dt); spirit.position.z += (home.z - spirit.position.z) * damp(2.5, dt);
  spirit.position.y += (home.y + Math.sin(t * 2) * 0.2 - spirit.position.y) * damp(2.5, dt); spirit.rotation.y = t * 0.7;
  if (fight && !spiritToast && lastAbility() !== 'vries') { spiritToast = true; toast('Het ijsgeestje vliegt je achterna! Kopieer het aan de rand van het rif voor Vries.'); }
  if (!fight) spiritToast = false;
  // Deniz
  const dd = Math.atan2(p.x - deniz.root.position.x, p.z - deniz.root.position.z) - deniz.root.rotation.y;
  if (p.distanceTo(deniz.root.position) < 8) deniz.root.rotation.y += Math.atan2(Math.sin(dd), Math.cos(dd)) * damp(2, dt);
  // the throne slowly melts down… and grows back once the hearts are in
  const want = deniz.state === 'done' ? 1 : 0.55 + Math.sin(t * 0.3) * 0.05;
  THRONE.mesh.scale.y += (want - THRONE.mesh.scale.y) * damp(1, dt);
  // ice hearts
  for (const h of HEARTS) {
    if (got.has(h.id)) continue;
    h.m.rotation.y = t * 1.5; h.m.position.y = h.at.y + Math.sin(t * 2) * 0.12;
    const frozen = h.day && cycle.night;          // the sandbank one is under the ice at night
    h.m.visible = !frozen;
    if (!frozen && p.clone().add(V3(0, 0.8, 0)).distanceTo(h.m.position) < 1.4) {
      got.add(h.id); save.hearts = [...got]; persist(); h.m.visible = false;
      puff(h.m.position.clone(), 18, 0x7ad8ff, 4, 2); sfx.cosmic();
      const left = HEARTS.length - got.size;
      toast(left ? `Een ijshart! Nog ${left} voor Deniz` : 'Alle drie de ijsharten! Breng ze naar Deniz');
      heartsDone();
    }
  }
}

// back after a refresh
export function restoreNPCs(s, gotSet) {
  restoreTrials(s, gotSet);
  if (s.deniz === 'done') {
    deniz.state = 'done'; showSpire(); deniz.crown.scale.y = 1;
    if (!gotSet.has(DENIZ_NAME)) addCookie(deniz.root.position.x + 1.4, TOP + 1.2, deniz.root.position.z + 1.4, DENIZ_NAME);
    if (!gotSet.has(SPIRE_NAME)) addCookie(SPIRE.x, SPIRE.top + 1.3, SPIRE.z, SPIRE_NAME);
  } else if (s.deniz) { deniz.state = s.deniz; heartsDone(); }
  void lastAbility;
}
