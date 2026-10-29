import { THREE, scene, toon, addOutline, V3, damp, puff, toast } from './core.js?v=sub1';
import { addCookie } from './cookies.js?v=sub1';
import { addSpeaker } from './bubbles.js?v=sub1';
import { getSave } from './save.js?v=sub1';
import { play, shot } from './cutscene.js?v=sub1';
import { LOOK } from './ui.js?v=sub1';
import { groundAt, PLATEAU_H } from './bos-terrain.js?v=sub1';
import { HAT_AT, LICHTKEVER_AT, RUPS_AT } from './bos-world.js?v=sub1';
import { boss } from './bos-boss.js?v=sub1';

// Who lives in the Paddenstoelenbos: Lars (small, and his hat is gone), the zwammetjes who chat as you pass,
// and three creatures Byte can copy: the Stuiterzwam, the Lichtkever and the Rupsrups.
export const scannables = [];
export const dialog = { active: false };
export const PENDING_RARE = 4;          // Lars' hat, the six lanterns, the crate on the kruinen, the Woekerzwam
export const npcEvents = { onChange() {} };
export const miloTalked = () => false;
export const guideDone = () => false;
const { save, persist } = getSave('bos');

const ink = new THREE.MeshBasicMaterial({ color: 0x1a1030 });
const mk = (geo, mat, x, y, z, parent, ol = 1.08) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true;
  if (ol) addOutline(m, ol); parent.add(m); return m;
};
const eyes = (parent, y, z, gap, r = 0.05) => [-1, 1].forEach((s) => { const e = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), ink); e.position.set(gap * s, y, z); parent.add(e); });

// ---------- de zwammetjes ----------
const stem = toon(0xe8dcc8);
const zwams = [];
function zwammetje(x, z, color, lines, y = null) {
  const root = new THREE.Group(); root.position.set(x, y ?? groundAt(x, z, 0), z); scene.add(root);
  const bod = new THREE.Group(); root.add(bod);
  mk(new THREE.CylinderGeometry(0.22, 0.28, 0.6, 10), stem, 0, 0.3, 0, bod);
  const capM = toon(color); capM.emissive.setHex(color).multiplyScalar(0.25);
  const c = mk(new THREE.SphereGeometry(0.42, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), capM, 0, 0.58, 0, bod); c.scale.y = 0.7;
  eyes(bod, 0.42, 0.22, 0.08);
  const z0 = { root, bod, t: Math.random() * 5 };
  addSpeaker(root, { y: 1.3, radius: 5, linger: 16, lines });
  zwams.push(z0);
  return z0;
}
zwammetje(-6, 40, 0xff7ab6, ['Welkom in het Paddenstoelenbos!', 'Zie je die grote paarse daar in de verte? Dat was vroeger een gewone paddenstoel.', 'Stamp op een sporenknop en kijk wat er groeit.', 'Onder de grote oranje hoed ligt iets. Daar pas je nooit onder. Tenzij je héél klein bent.']);
zwammetje(-3, 11, 0x3fd6c8, ['Niet in het water vallen! Het gloeit niet voor niks.', 'Er is een pad dat je alleen ziet als je zelf licht geeft.', 'De lichtkever hier weet daar alles van.', 'Zes donkere lantaarns. Als ze ooit allemaal tegelijk branden… dan gebeurt er iets.']);
zwammetje(-48, 17, 0xffa24a, ['Lars woont boven, op het plankier.', 'Die roze hoed stuitert. Spring er maar op.', 'In de holle steel woont niemand. Er zit wel een heel klein deurtje in.']);
zwammetje(-60.5, 4.5, 0xa06bff, ['Op het plankier zit een sporenknop. Dan groeit er een trap naar de uitkijk.', 'Op de uitkijk stuitert iedereen. Maar niemand komt zo hoog als dat koekje.', 'Een Stuiterzwam stuitert elke keer een beetje hoger. Wist je dat?'], PLATEAU_H);
zwammetje(51, 6, 0x6fa8ff, ['Deze grot heeft geen dak. Wel een knop.', 'Boven op de heuvel ligt de omgevallen stam. Daarover kom je bij de Woekerzwam.']);
zwammetje(-31, -54, 0xb6e36b, ['Hier begint de woekervlakte. Alles wordt paars.', 'Die wortels daarachter groeiden ineens omhoog. Er zit een knop in de buurt.'], PLATEAU_H);
const ARENA_ZWAM_BEFORE = ['Ssst. Hij slaapt.', 'Hij spuugt gloeiende knollen. Spring erop voordat ze ontploffen!', 'Een knol waar je op springt, schiet zo terug in zijn gezicht.'];
const ARENA_ZWAM_AFTER = ['Hij is weer gewoon een paddenstoel! Een héle grote, maar toch.', 'Het bos ruikt weer naar bos.'];
zwammetje(14, -68, 0xff7ab6, () => (boss.state === 'dead' ? ARENA_ZWAM_AFTER : ARENA_ZWAM_BEFORE), PLATEAU_H);

// ---------- copyable creatures ----------
// de Stuiterzwam: a little mushroom that never stops bouncing
const stuiter = new THREE.Group(); stuiter.position.set(-44, 0, 4); scene.add(stuiter);
const stuiterBody = new THREE.Group(); stuiter.add(stuiterBody);
{
  const capM = toon(0xff7ab6); capM.emissive.set(0x4a1030);
  mk(new THREE.CylinderGeometry(0.18, 0.22, 0.4, 10), stem, 0, 0.2, 0, stuiterBody);
  const c = mk(new THREE.SphereGeometry(0.38, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), capM, 0, 0.4, 0, stuiterBody); c.scale.y = 0.7;
  eyes(stuiterBody, 0.3, 0.18, 0.07);
}
scannables.push({ name: 'Stuiterzwam', ability: 'stuiter', obj: stuiter, offset: V3(0, 1.4, 0) });
// de Lichtkever: a glowing beetle on the first swamp island
const kever = new THREE.Group(); kever.position.copy(LICHTKEVER_AT); scene.add(kever);
{
  const shell = toon(0x7af5ff); shell.emissive.set(0x1a6a7a);
  const s = mk(new THREE.SphereGeometry(0.28, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), shell, 0, 0.1, 0, kever); s.scale.set(1, 0.7, 1.3);
  mk(new THREE.SphereGeometry(0.12, 8, 6), toon(0x2a2440), 0, 0.12, 0.36, kever, 0);
  const l = new THREE.PointLight(0x7af5ff, 4, 5, 2); l.position.y = 0.5; kever.add(l);
}
scannables.push({ name: 'Lichtkever', ability: 'gloei', obj: kever, offset: V3(0, 1.1, 0) });
// de Rupsrups: a tiny caterpillar by the tunnel into the wortelheuvel
const rups = new THREE.Group(); rups.position.copy(RUPS_AT); scene.add(rups);
const rupsSegs = [];
{
  const m = toon(0xb6e36b); m.emissive.set(0x203a08);
  for (let i = 0; i < 6; i++) rupsSegs.push(mk(new THREE.SphereGeometry(0.15 - i * 0.012, 10, 8), m, 0, 0.14, 0.24 - i * 0.2, rups, 1.12));
  eyes(rupsSegs[0], 0.05, 0.12, 0.06, 0.03);
}
scannables.push({ name: 'Rupsrups', ability: 'krimp', obj: rups, offset: V3(0, 1, 0) });

// ---------- Lars ----------
const LARS_NAME = "Lars' hoed teruggebracht";
const LARS_AT = V3(-54, PLATEAU_H, 1);
const lars = { state: 'new', root: new THREE.Group(), t: 0 };
const hatMat = toon(0x3a2e46), bandMat = toon(0xff7ab6);
function makeHat() {
  const h = new THREE.Group();
  mk(new THREE.CylinderGeometry(0.34, 0.34, 0.04, 16), hatMat, 0, 0, 0, h, 1.06);
  mk(new THREE.CylinderGeometry(0.2, 0.22, 0.55, 16), hatMat, 0, 0.29, 0, h, 1.06);
  mk(new THREE.CylinderGeometry(0.225, 0.225, 0.08, 16), bandMat, 0, 0.06, 0, h, 0);
  return h;
}
{
  const r = lars.root; r.position.copy(LARS_AT); r.scale.setScalar(0.62); r.rotation.y = 0.6; scene.add(r);
  const skin = toon(0xf0c8a0), hoodie = toon(0x6fa8ff), pants = toon(0x3a3e4e), hair = toon(0xd9a35a);
  [-1, 1].forEach((s) => mk(new THREE.CapsuleGeometry(0.12, 0.42, 4, 8), pants, 0.14 * s, 0.4, 0, r));
  mk(new THREE.CapsuleGeometry(0.3, 0.45, 6, 12), hoodie, 0, 1.08, 0, r);
  [-1, 1].forEach((s) => { const a = mk(new THREE.CapsuleGeometry(0.09, 0.42, 4, 8), hoodie, 0.4 * s, 1.08, 0.02, r); a.rotation.z = 0.15 * s; });
  lars.head = mk(new THREE.SphereGeometry(0.3, 14, 12), skin, 0, 1.78, 0, r);
  const hr = mk(new THREE.SphereGeometry(0.32, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2.2), hair, 0, 0.04, -0.02, lars.head, 1.04);
  for (let i = 0; i < 5; i++) { const t = mk(new THREE.ConeGeometry(0.07, 0.18, 5), hair, -0.16 + i * 0.08, 0.3, 0.05, lars.head, 0); t.rotation.z = (i - 2) * 0.3; }
  eyes(lars.head, 0.02, 0.28, 0.1, 0.045);
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.025, 0.02), ink); mouth.position.set(0, -0.1, 0.29); lars.head.add(mouth);
  lars.hatOn = makeHat(); lars.hatOn.position.y = 0.3; lars.hatOn.visible = false; lars.head.add(lars.hatOn);
}
const LARS_LINES = {
  new: ['Hé! Hier beneden!', 'Nee, nog lager.', '*kijkt somber naar zijn lege hoofd*'],
  search: ['Mijn hoed ligt ergens bij de grote omgevallen boom.', 'Ik ben niet klein. Iedereen anders is gewoon groot.', 'In de wortelheuvel woont een rups die nog kleiner is dan ik. Respect.'],
  carry: ['Is dat… MIJN HOED?! Kom hier!'],
  done: ['Kijk mij nou. Lang.', 'De Woekerzwam heeft drie zakken met sporen. Daar moet je op springen, zeggen ze.', 'Als je de Woekerzwam verslaat, mag je mijn hoed een keer lenen. Eén keer.'],
};
lars.speaker = addSpeaker(lars.root, { y: 1.5, radius: 5, linger: 14, lines: () => LARS_LINES[lars.state] });

// the hat, stuck on a branch of the fallen log; once you've got it, it floats above Josh
const hat = makeHat(); hat.position.copy(HAT_AT); hat.scale.setScalar(1.4); scene.add(hat);
const hatGlow = new THREE.PointLight(0xff7ab6, 4, 5, 2); hat.add(hatGlow);
function putHatOnLars() { scene.remove(hat); lars.hatOn.visible = true; }
const prize = (x, y, z, name) => { addCookie(x, y, z, name); puff(V3(x, y, z), 18, 0xb79cff, 4, 2); };

const nearLars = (p) => p.distanceTo(lars.root.position) < 3 && lars.state !== 'done' && lars.state !== 'search';
function larsTalk() {
  const BYTE = (LOOK.droneName || 'Byte').toUpperCase();
  const cam = shot(V3(LARS_AT.x + 2.2, LARS_AT.y + 1.6, LARS_AT.z + 2.4), V3(LARS_AT.x, LARS_AT.y + 0.9, LARS_AT.z));
  if (lars.state === 'new') {
    play([
      { say: { who: 'LARS', text: 'Hé! Hier beneden! … Nee, nog lager.' }, cam },
      { say: { who: 'LARS', text: 'Ik ben Lars. Iedereen denkt dat ik een zwammetje ben. Ik ben gewoon klein.' }, cam },
      { say: { who: 'LARS', text: 'Ik had een hoed. Een hele hoge. Daarmee was ik bijna normaal lang.' }, cam },
      { say: { who: 'LARS', text: 'Toen kwamen er twee katten langs. Die bliezen hem gewoon van mijn hoofd. Richting de wortelheuvel, over het ravijn.' }, cam },
      { say: { who: BYTE, text: 'Twee katten… Kayo & Yara. Alweer.' }, cam },
      { say: { who: 'LARS', text: 'Ze hadden een zak paarse sporen bij zich. Die strooiden ze over de oude paddenstoel aan de rand van het bos. Sindsdien woekert hij overal overheen.' }, cam: shot(V3(LARS_AT.x + 2, LARS_AT.y + 3, LARS_AT.z + 3), V3(12, 20, -100)) },
      { say: { who: 'LARS', text: 'Breng je mijn hoed terug? Hij ligt vast bij de grote omgevallen boom.' }, cam },
    ], () => { if (lars.state === 'new') lars.state = save.hat ? 'carry' : 'search'; });
  } else if (lars.state === 'carry') {
    play([
      { say: { who: 'LARS', text: 'MIJN HOED!' }, cam, start() { putHatOnLars(); lars.state = 'done'; puff(lars.root.position.clone().add(V3(0, 1.4, 0)), 14, 0xff7ab6, 3, 2); } },
      { say: { who: 'LARS', text: 'Zie je? Bijna 1 meter 60. Bijna.' }, cam },
      { say: { who: 'LARS', text: 'Hier, dit vond ik onder mijn bed. Het gloeit paars. Jij verzamelt toch rare dingen?' }, cam },
    ], () => { lars.state = 'done'; save.lars = true; save.hat = false; persist(); prize(LARS_AT.x + 1.5, LARS_AT.y + 1.4, LARS_AT.z + 1, LARS_NAME); });
  }
}

export function nearMilo(p) { return nearLars(p); }
export const npcPrompt = () => 'praten met Lars';
let lastP = V3();
export function talk() { if (nearLars(lastP)) larsTalk(); }

export function updateNPCs(dt, t, p) {
  lastP.copy(p);
  for (const z of zwams) {
    z.t += dt;
    z.bod.position.y = Math.abs(Math.sin(z.t * 2)) * 0.06;
    const d = Math.atan2(p.x - z.root.position.x, p.z - z.root.position.z) - z.root.rotation.y;
    if (p.distanceTo(z.root.position) < 6) z.root.rotation.y += Math.atan2(Math.sin(d), Math.cos(d)) * damp(3, dt);
  }
  // creatures
  stuiterBody.position.y = Math.abs(Math.sin(t * 4)) * 0.9;
  stuiterBody.scale.y = 1 - Math.max(0, 0.15 - stuiterBody.position.y) * 2;
  kever.position.x = LICHTKEVER_AT.x + Math.cos(t * 0.6) * 0.8; kever.position.z = LICHTKEVER_AT.z + Math.sin(t * 0.6) * 0.8;
  kever.rotation.y = -t * 0.6;
  rupsSegs.forEach((s, i) => (s.position.y = 0.14 + Math.max(0, Math.sin(t * 5 - i * 0.8)) * 0.1));
  // Lars looks at you, and hops when you bring the hat
  const dl = Math.atan2(p.x - lars.root.position.x, p.z - lars.root.position.z) - lars.root.rotation.y;
  if (p.distanceTo(lars.root.position) < 7) lars.root.rotation.y += Math.atan2(Math.sin(dl), Math.cos(dl)) * damp(3, dt);
  lars.root.position.y = LARS_AT.y + (lars.state === 'carry' ? Math.abs(Math.sin(t * 6)) * 0.25 : 0);
  // the hat
  if (lars.state !== 'done' && !save.hat && !save.lars) {
    hat.rotation.y = t * 1.5; hat.position.y = HAT_AT.y + Math.sin(t * 2) * 0.1;
    if (p.clone().add(V3(0, 0.8, 0)).distanceTo(hat.position) < 1.5) {
      save.hat = true; persist();
      puff(hat.position.clone(), 12, 0xff7ab6, 3, 1.5);
      toast("Lars' hoed! Breng hem terug naar het dorpje");
      if (lars.state === 'search') lars.state = 'carry';
    }
  } else if (save.hat && lars.state !== 'done') {
    hat.position.lerp(p.clone().add(V3(0, 2.3, 0)), damp(10, dt)); hat.rotation.y = t * 2;
  }
}

// back after a refresh
export function restoreNPCs(s, got) {
  if (s.lars) { lars.state = 'done'; putHatOnLars(); if (!got.has(LARS_NAME)) addCookie(LARS_AT.x + 1.5, LARS_AT.y + 1.4, LARS_AT.z + 1, LARS_NAME); }
  else if (s.hat) lars.state = 'new';
}
