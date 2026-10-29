import { THREE, scene, toon, addOutline, V3, damp, puff, toast } from './core.js?v=sub1';
import { addCookie } from './cookies.js?v=sub1';
import { addSpeaker } from './bubbles.js?v=sub1';
import { getSave } from './save.js?v=sub1';
import { play, shot } from './cutscene.js?v=sub1';
import { LOOK } from './ui.js?v=sub1';
import * as sfx from './sfx.js?v=sub1';
import { ARENA } from './regen-terrain.js?v=sub1';
import { ROBIN_AT, PLAYER_AT, rain, train, TRAIN_Y } from './regen-world.js?v=sub1';
import { boss, bossActive } from './regen-boss.js?v=sub1';
import { TRIAL_RARE, restoreTrials } from './regen-trials.js?v=sub1';

// Who lives in the Regenstad: Robin, on his rooftop, listening to Flemming and crying (a lot). The sadder he
// is, the harder it rains. Kayo & Yara threw his four favourite records all over the city. And a neon moth
// that lives by the cinema: copy it for Neon (a dash through the air).
export const scannables = [];
export const dialog = { active: false };
export const PENDING_RARE = 3 + TRIAL_RARE;    // Robin, the crow, the station-roof crate, and the trials
export const npcEvents = { onChange() {} };
export const miloTalked = () => false;
export const guideDone = () => false;
const { save, persist } = getSave('regen');
save.records = save.records || [];
const BYTE = () => (LOOK.droneName || 'Byte').toUpperCase();
const COOKIE_ROBIN = 'Robin lacht weer';

const ink = new THREE.MeshBasicMaterial({ color: 0x1a1030 });
const mk = (geo, mat, x, y, z, parent, ol = 1.08) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true;
  if (ol) addOutline(m, ol); parent.add(m); return m;
};

// ---------- Robin ----------
const robin = { root: new THREE.Group(), state: save.robin || 'new', tearT: 0 };
{
  const r = robin.root; r.position.set(ROBIN_AT.x, ROBIN_AT.y + 0.5, ROBIN_AT.z - 1.4); scene.add(r);
  const skin = toon(0xf0c8a0), hoodie = toon(0x3a4a8a), jeans = toon(0x2a3a5a);
  // sitting on the bench, knees up
  for (const s of [-1, 1]) { const l = mk(new THREE.CapsuleGeometry(0.11, 0.4, 4, 8), jeans, 0.14 * s, 0.25, 0.3, r); l.rotation.x = -1.2; }
  mk(new THREE.CapsuleGeometry(0.27, 0.45, 4, 10), hoodie, 0, 0.6, 0, r);
  robin.head = new THREE.Group(); robin.head.position.set(0, 1.15, 0.05); r.add(robin.head);
  mk(new THREE.SphereGeometry(0.26, 16, 12), skin, 0, 0, 0, robin.head);
  mk(new THREE.SphereGeometry(0.27, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2.2), toon(0x6a4a2a), 0, 0.05, -0.02, robin.head, 0);
  robin.eyes = [-1, 1].map((s) => { const e = mk(new THREE.BoxGeometry(0.08, 0.03, 0.02), ink, 0.09 * s, 0.02, 0.24, robin.head, 0); e.rotation.z = 0.25 * s; return e; });
  robin.mouth = mk(new THREE.TorusGeometry(0.06, 0.015, 4, 10, Math.PI), ink, 0, -0.1, 0.24, robin.head, 0);
  robin.mouth.rotation.z = 0;          // a frown (flips to a smile when he's happy)
  // the headphones
  mk(new THREE.TorusGeometry(0.29, 0.03, 6, 18, Math.PI), toon(0xe0443a), 0, 0.05, 0, robin.head, 0);
  for (const s of [-1, 1]) mk(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 12), toon(0xe0443a), 0.28 * s, 0, 0, robin.head, 0).rotation.z = Math.PI / 2;
  // arms round his knees
  for (const s of [-1, 1]) { const a = mk(new THREE.CapsuleGeometry(0.08, 0.35, 4, 8), hoodie, 0.24 * s, 0.6, 0.25, r); a.rotation.x = -0.9; }
}
const tearMat = new THREE.MeshBasicMaterial({ color: 0x8ad8ff });
const tears = [];
const SAD = [
  '*snik* …Flemming snapt het gewoon. Hij snapt ALLES.',
  'Ze hebben mijn platen gepakt. Twee katten. Ze vonden mijn muziek "te zielig". *snik*',
  'Het regent hier altijd. Nou ja. Als ik huil. Dus altijd.',
  'Als ik mijn platen terug heb, kan ik eindelijk weer mijn vrolijke liedje draaien.',
];
const HINTS = {
  bios: 'Eén plaat vloog op het dak van de bioscoop. Er is een brandtrap aan de oostkant.',
  trein: 'Eén plaat ligt op de luchttrein. Hij rijdt rondjes. Spring erop bij een station!',
  tuin: 'Eén plaat landde in de daktuin bij het telefoonhokje.',
  nest: 'En één… is meegenomen door Kraai Krijs. Naar zijn toren. Daar ga ik écht niet heen.',
};
addSpeaker(robin.root, { y: 2, radius: 6, linger: 16, lines: () => {
  if (robin.state === 'done') return ['Hoor je dat? Dít is mijn vrolijke liedje!', 'Het regent bijna niet meer. Vreemd. Ik zie de sterren.', 'Ik huil nu alleen nog bij de mooie stukjes. Dat is anders.'];
  if (robin.state === 'new') return ['*snik*', '…Oh. Hoi. Sorry. Ik zit gewoon even te huilen.'];
  const left = Object.keys(HINTS).filter((k) => !save.records.includes(k));
  if (!left.length) return ['ALLE VIER?! Kom snel hier!'];
  return [`Nog ${left.length} plat${left.length > 1 ? 'en' : ''}… *snik*`, ...left.map((k) => HINTS[k]), SAD[Math.floor(Math.random() * SAD.length)]];
} });
function setMood() {
  const found = save.records.length;
  rain.k = robin.state === 'done' ? 0.05 : 1 - found * 0.18;
  const happy = robin.state === 'done';
  robin.mouth.rotation.z = happy ? Math.PI : 0;
  robin.mouth.position.y = happy ? -0.06 : -0.1;
  robin.eyes.forEach((e, i) => (e.rotation.z = (happy ? -0.25 : 0.25) * (i ? 1 : -1)));
}

// ---------- the neon moth (Neon) ----------
const MOTH_HOME = V3(-8, 2.4, 22);
const MOTH_FIGHT = V3(ARENA.x - 7.4, ARENA.y + 2.4, ARENA.z + 3);
const moth = new THREE.Group(); moth.position.copy(MOTH_HOME); scene.add(moth);
{
  const glow = new THREE.MeshBasicMaterial({ color: 0xff4ad8 });
  mk(new THREE.CapsuleGeometry(0.12, 0.4, 4, 8), toon(0x2a1a3a), 0, 0, 0, moth, 0).rotation.x = Math.PI / 2;
  moth.userData.wings = [-1, 1].map((s) => { const w = new THREE.Mesh(new THREE.CircleGeometry(0.42, 14), glow); w.position.set(0.36 * s, 0.05, 0); w.rotation.x = -Math.PI / 2; moth.add(w); return w; });
  moth.add(new THREE.PointLight(0xff4ad8, 5, 8, 2));
}
scannables.push({ name: 'Neonmot', ability: 'neon', obj: moth, offset: V3(0, 0.5, 0) });
addSpeaker(moth, { y: 1, radius: 4, linger: 10, lines: ['*zzzoem* …*flits!*', '*de mot schiet als een streep licht van lamp naar lamp*'] });
let mothToast = false;

// ---------- Robin's records ----------
const RECORDS = {
  bios: () => V3(-15, 4.9, 20),
  trein: () => V3(train.x, TRAIN_Y + 0.9, train.z),
  tuin: () => V3(-9, 5.9, -10),
  nest: () => (boss.state === 'dead' ? V3(ARENA.x + 2, ARENA.y + 1.2, ARENA.z) : null),
};
const recs = Object.keys(RECORDS).map((k) => {
  const g = new THREE.Group(); scene.add(g);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.04, 24), toon(0x1a1a24)); disc.rotation.x = Math.PI / 2; addOutline(disc, 1.1); g.add(disc);
  const lab = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.05, 16), new THREE.MeshBasicMaterial({ color: [0xff4ad8, 0x4ad8ff, 0xffd04a, 0x8aff6a][Object.keys(RECORDS).indexOf(k)] })); lab.rotation.x = Math.PI / 2; g.add(lab);
  g.add(new THREE.PointLight(0xfff0c0, 4, 5, 2));
  return { k, g };
});

// ---------- talking ----------
let lastP = V3();
const canRobin = (p) => p.distanceTo(robin.root.position) < 3.4 && (robin.state === 'new' || (robin.state === 'search' && save.records.length >= 4));
export function nearMilo(p) { return canRobin(p); }
export const npcPrompt = () => 'praten met Robin';
export function talk() { if (canRobin(lastP)) robinTalk(); }
function robinTalk() {
  const R = robin.root.position;
  const cam = shot(V3(R.x + 2.4, R.y + 1.6, R.z + 3.2), V3(R.x, R.y + 1, R.z));
  if (robin.state === 'new') {
    play([
      { say: { who: 'ROBIN', text: '*snik* …Oh. Hoi. Sorry. Ik zit hier gewoon. Te huilen. Met Flemming op.' }, cam },
      { say: { who: BYTE(), text: 'Waarom huil je?' }, cam },
      { say: { who: 'ROBIN', text: 'Omdat Flemming zo mooi zingt. En omdat… gisteren twee katten op mijn dak stonden.' }, cam },
      { say: { who: 'ROBIN', text: 'Ze pakten mijn vier lievelingsplaten. "Te zielig," zeiden ze. En toen gooiden ze ze gewoon over de stad.' }, cam },
      { say: { who: BYTE(), text: 'Kayo & Yara. Natuurlijk.' }, cam },
      { say: { who: 'ROBIN', text: 'Zonder mijn platen kan ik mijn vrolijke liedje niet draaien. En dan blijf ik huilen. En dan blijft het regenen.' }, cam: shot(V3(R.x + 8, R.y + 7, R.z + 14), V3(R.x - 2, R.y - 6, R.z + 20)) },
      { say: { who: 'ROBIN', text: 'Wil je ze zoeken? Ik… ik blijf hier wel zitten. Huilen.' }, cam },
    ], () => { robin.state = 'search'; save.robin = 'search'; persist(); setMood(); });
  } else {
    play([
      { say: { who: 'ROBIN', text: 'Alle vier?! Je hebt ze ALLEMAAL gevonden?' }, cam },
      { dur: 2.4, say: { who: 'ROBIN', text: '*legt de plaat op de draaitafel*' }, start() { sfx.click(); }, cam: shot(V3(PLAYER_AT.x + 1.6, PLAYER_AT.y + 1.2, PLAYER_AT.z + 2), PLAYER_AT) },
      { dur: 3, say: { who: 'ROBIN', text: '♪ …♪ ♪' }, start() { sfx.fanfare(); robin.state = 'done'; setMood(); }, cam: shot(V3(R.x + 6, R.y + 4, R.z + 10), V3(R.x, R.y + 6, R.z - 4)) },
      { say: { who: 'ROBIN', text: 'Mijn vrolijke liedje. *snik* …Nee, dit zijn blije tranen. Echt.' }, cam },
      { say: { who: BYTE(), text: 'Josh, kijk omhoog! Het houdt op met regenen. Je ziet de sterren!' }, cam: shot(V3(R.x, R.y + 2, R.z + 6), V3(R.x, R.y + 30, R.z - 20)) },
      { say: { who: 'ROBIN', text: 'Hier. Voor jou. Ik vond hem in een hoesje. Hij gloeit paars. Rare plaat.' }, cam },
    ], () => { save.robin = 'done'; persist(); addCookie(R.x - 1.6, ROBIN_AT.y + 1.2, R.z + 1.4, COOKIE_ROBIN); });
  }
}

// ---------- every frame ----------
export function updateNPCs(dt, t, p) {
  lastP.copy(p);
  // Robin cries (tears drip from his eyes) or sways to the music
  if (robin.state !== 'done') {
    robin.head.rotation.x = 0.35 + Math.sin(t * 0.8) * 0.05;
    robin.tearT -= dt;
    if (robin.tearT <= 0) {
      robin.tearT = 0.25;
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), tearMat); m.position.copy(robin.head.getWorldPosition(V3()).add(V3((Math.random() < 0.5 ? -1 : 1) * 0.09, 0, 0.22))); scene.add(m);
      tears.push({ m, v: 0 });
    }
  } else { robin.head.rotation.x = Math.sin(t * 4) * 0.1; robin.head.rotation.z = Math.sin(t * 2) * 0.15; }
  for (let i = tears.length - 1; i >= 0; i--) { const q = tears[i]; q.v += 9 * dt; q.m.position.y -= q.v * dt; if (q.m.position.y < ROBIN_AT.y) { scene.remove(q.m); tears.splice(i, 1); } }
  // the moth: flits round its lamp, or follows you up the tower for the fight
  const fight = bossActive();
  const home = fight ? MOTH_FIGHT : MOTH_HOME;
  const want = home.clone().add(V3(Math.sin(t * 1.3) * 1.2, Math.sin(t * 2.1) * 0.4, Math.cos(t * 1.1) * 1.2));
  moth.position.lerp(want, Math.min(1, dt * (fight ? 1.5 : 3)));
  moth.rotation.y = t * 1.5;
  moth.userData.wings.forEach((w, i) => (w.rotation.y = Math.sin(t * 30) * 0.5 * (i ? 1 : -1)));
  if (fight && !mothToast && p.distanceTo(moth.position) > 3) { mothToast = true; }
  if (!fight) mothToast = false;
  // the records
  for (const r of recs) {
    const got = save.records.includes(r.k);
    const at = got ? null : RECORDS[r.k]();
    r.g.visible = !!at;
    if (!at) continue;
    r.g.position.set(at.x, at.y + Math.sin(t * 2) * 0.1, at.z); r.g.rotation.y = t * 2;
    if (p.clone().add(V3(0, 0.8, 0)).distanceTo(r.g.position) < 1.4) {
      save.records.push(r.k); persist(); sfx.cosmic(); puff(r.g.position.clone(), 18, 0xfff0c0, 4, 2);
      setMood();
      const left = 4 - save.records.length;
      toast(left ? `Een plaat van Robin! Nog ${left}. (Het regent al wat minder…)` : 'Alle vier de platen! Breng ze naar Robin.');
    }
  }
  void damp;
}

// back after a refresh
export function restoreNPCs(s, gotSet) {
  restoreTrials(s, gotSet);
  setMood();
  if (save.robin === 'done' && !gotSet.has(COOKIE_ROBIN)) addCookie(robin.root.position.x - 1.6, ROBIN_AT.y + 1.2, robin.root.position.z + 1.4, COOKIE_ROBIN);
}
