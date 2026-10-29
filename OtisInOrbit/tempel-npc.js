import { THREE, scene, toon, addOutline, V3, damp, puff, toast } from './core.js?v=sub1';
import { addCookie } from './cookies.js?v=sub1';
import { addSpeaker } from './bubbles.js?v=sub1';
import { getSave } from './save.js?v=sub1';
import { play, shot } from './cutscene.js?v=sub1';
import { LOOK } from './ui.js?v=sub1';
import { buildDrone } from './josh.js?v=sub1';
import { buildOtis } from './otis.js?v=sub1';
import * as sfx from './sfx.js?v=sub1';
import { groundAt, HALL } from './tempel-terrain.js?v=sub1';
import { OTIS_AT, BYTE_AT, LEDGE, HOUSE, FOUNTAIN, PUMP, setRocket, WRECK, rocket } from './tempel-world.js?v=sub1';
import { TRIAL_RARE, restoreTrials, puz, LENS_AT, ANTENNA_AT, lensUp } from './tempel-trials.js?v=sub1';

// After the crash: Otis is hurt, Byte is broken. Byte lost three parts (propeller, scan lens, antenna) and they
// flew off into the temple; Otis needs a bandage, water and something soft to lie on. Bring Byte his propeller
// and he flies again (and fits the other parts himself). Once Otis is better and Byte is whole, the two of them
// fix the rocket.
// The temple animals can be copied once Byte has his lens back: the stone beetle (Zwaar), the firefly (Gloei)
// and the temple mouse (Krimp).
export const scannables = [];
export const dialog = { active: false };
export const PENDING_RARE = 3 + TRIAL_RARE;     // Byte whole, Otis better, the crate on the fin, and the trials
export const npcEvents = { onChange() {} };
export const miloTalked = () => false;
export const guideDone = () => false;
const { save, persist } = getSave('tempel');
save.parts = save.parts || [];     // Byte's parts you've found
save.care = save.care || [];       // things for Otis you've found
save.given = save.given || [];     // … and given him
const BYTE = () => (LOOK.droneName || 'Byte');
const BYTE_UP = () => BYTE().toUpperCase();
const COOKIE_BYTE = 'Byte is weer heel', COOKIE_OTIS = 'Otis is weer beter';

const ink = new THREE.MeshBasicMaterial({ color: 0x1a1030 });
const mk = (geo, mat, x, y, z, parent, ol = 1.08) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true;
  if (ol) addOutline(m, ol); parent.add(m); return m;
};
const eyes = (parent, y, z, gap, r = 0.05, mat = ink) => [-1, 1].map((s) => { const e = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), mat); e.position.set(gap * s, y, z); parent.add(e); return e; });

// ---------- Byte's state ----------
export const byteUp = () => !!save.byteUp;
const has = (p) => (save.parts || []).includes(p);
export const droneOff = () => !save.byteUp;
export const noScan = () => !save.byteUp || !has('lens');
export const noScanMsg = () => (!save.byteUp ? `${BYTE()} is kapot… zonder ${BYTE()} kun je niks kopiëren` : `${BYTE()} mist zijn scanlens. Zonder lens kan hij niet kopiëren`);
export const byteWhole = () => save.byteUp && has('propeller') && has('lens') && has('antenne');
export const otisWell = () => ['verband', 'water', 'kussen'].every((k) => save.given.includes(k));
let drone = null;
export function setDrone(d) { drone = d; dressDrone(); }
// the real Byte (the one that follows you): his eye stays dark without the lens; the antenna is a new little stick
let antenna = null;
function dressDrone() {
  if (!drone) return;
  drone.eyeMat.color.setHex(has('lens') ? 0x5ef2e0 : 0x3a4a4a);
  if (!antenna) {
    antenna = new THREE.Group(); antenna.position.set(0.05, 0.18, -0.05); drone.tilt.add(antenna);
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.26), new THREE.MeshBasicMaterial({ color: 0x3a3a4a })); s.position.y = 0.13; antenna.add(s);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff4a6a })); tip.position.y = 0.27; antenna.add(tip);
    antenna.userData.tip = tip;
  }
  antenna.visible = has('antenne');
}

// ---------- broken Byte, lying next to the rocket ----------
const wreck = buildDrone();
wreck.g.position.copy(BYTE_AT); wreck.tilt.rotation.set(0.4, 0, 1.3);
wreck.props.forEach((p) => (p.visible = false));
wreck.eyeMat.color.setHex(0x2a2a2a);
addSpeaker(wreck.g, { y: 0.9, radius: 3.5, linger: 10, cond: () => !save.byteUp, lines: () => [
  '…bzzt… pr-pr-propeller… w-weg… bzzt…',
  has('propeller') ? '…bzzt… is dat… mijn propeller? Druk op E… bzzt…' : '…krrr… ergens… in een binnenplaats… met blokken… bzzt…',
  '*een vonk springt uit Byte*',
] });

// ---------- Otis: hurt, lying down ----------
export const otis = buildOtis(groundAt);
otis.place(OTIS_AT.x, OTIS_AT.z);
const otisKit = new THREE.Group(); otis.root.add(otisKit);
const bandage = mk(new THREE.TorusGeometry(0.11, 0.05, 6, 14), toon(0xffffff), 0.18, 0.25, 0.25, otisKit, 0); bandage.rotation.y = Math.PI / 2;
const bowl = new THREE.Group(); scene.add(bowl);
{ mk(new THREE.CylinderGeometry(0.28, 0.2, 0.14, 14), toon(0xc87838), 0, 0.07, 0, bowl); const w = new THREE.Mesh(new THREE.CircleGeometry(0.24, 14), new THREE.MeshBasicMaterial({ color: 0x5ac8f0 })); w.rotation.x = -Math.PI / 2; w.position.y = 0.13; bowl.add(w); }
bowl.position.set(OTIS_AT.x + 0.2, OTIS_AT.y, OTIS_AT.z + 0.9);
const pillow = mk(new THREE.BoxGeometry(0.9, 0.2, 0.7), toon(0xb04a8a), OTIS_AT.x - 0.5, OTIS_AT.y + 0.1, OTIS_AT.z, scene);
let otisLying = true;
function poseOtis() {
  bandage.visible = save.given.includes('verband');
  bowl.visible = save.given.includes('water');
  pillow.visible = save.given.includes('kussen');
  otisLying = !otisWell();
  if (otisLying) { otis.root.rotation.set(0, Math.PI / 2, 1.35); otis.root.position.set(OTIS_AT.x, OTIS_AT.y + 0.35, OTIS_AT.z); }
  else { otis.root.rotation.set(0, 0, 0); otis.place(OTIS_AT.x + 1.2, OTIS_AT.z + 0.6); pillow.visible = false; }
}
// Byte can't translate, so Josh just guesses what Otis means
const guess = (s) => `<small>Josh denkt dat Otis bedoelt: “${s}”</small>`;
const tr = (s) => `<small>${BYTE()} vertaalt: “${s}”</small>`;
const say = (s) => (save.byteUp ? tr(s) : guess(s));
addSpeaker(otis.root, { y: 1.3, radius: 5, linger: 14, lines: () => {
  if (!otisLying) return ['Woef!', `Woef woef!${say('Kijk, ik sta weer!')}`];
  const L = ['*jankt zachtjes*'];
  if (!save.given.includes('verband')) L.push(`Woef…${say('Mijn poot… er moet verband om. Ik zag de verbanddoos uit de raket vallen, die donkere kloof in.')}`);
  if (!save.given.includes('water')) L.push(`*hijgt*${say('Ik heb zo’n dorst. Die fontein is helemaal droog…')}`);
  if (!save.given.includes('kussen')) L.push(`*draait zich om*${say('De stenen zijn zo hard. Op dat hoge terras staat een huisje… daar liggen vast kussens.')}`);
  return L;
} });

// ---------- the temple animals (copy them once Byte has his lens back) ----------
// stone beetle: wanders over the square. Zwaar
const kever = { root: new THREE.Group(), home: V3(9, 0, -4), t: 0 };
{
  const r = kever.root; scene.add(r);
  const shell = mk(new THREE.SphereGeometry(0.6, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon(0x8a8478), 0, 0.15, 0, r); shell.scale.set(1, 0.8, 1.25);
  const head = mk(new THREE.SphereGeometry(0.25, 10, 8), toon(0x5a5448), 0, 0.25, 0.75, r);
  eyes(head, 0.06, 0.2, 0.09, 0.05, new THREE.MeshBasicMaterial({ color: 0xffd04a }));
  for (let i = 0; i < 3; i++) for (const s of [-1, 1]) { const l = mk(new THREE.CylinderGeometry(0.04, 0.04, 0.5), toon(0x4a4438), 0.55 * s, 0.1, -0.4 + i * 0.4, r, 0); l.rotation.z = 1.1 * s; }
  for (let i = 0; i < 6; i++) mk(new THREE.BoxGeometry(0.2, 0.06, 0.2), toon(0x6a8a4a), (Math.random() - 0.5) * 0.7, 0.55, (Math.random() - 0.5) * 0.9, r, 0);
}
scannables.push({ name: 'Steenkever', ability: 'zwaar', obj: kever.root, offset: V3(0, 0.9, 0) });
addSpeaker(kever.root, { y: 1.3, radius: 4, linger: 10, lines: ['*schuifel… schuifel… BONK*', '*de kever loopt dwars door een struik, hij merkt het niet eens*'] });
// firefly: at the edge of the dark ravine. Gloei
const vlieg = { root: new THREE.Group(), home: V3(-15.4, 1.8, -27.5) };
{
  const r = vlieg.root; scene.add(r);
  mk(new THREE.SphereGeometry(0.16, 10, 8), toon(0x3a3a2a), 0, 0, 0.12, r);
  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), new THREE.MeshBasicMaterial({ color: 0xd8ff6a })); tail.position.z = -0.15; r.add(tail);
  for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.CircleGeometry(0.18, 10), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, side: THREE.DoubleSide })); w.position.set(0.15 * s, 0.12, 0); w.rotation.x = -Math.PI / 2; r.add(w); vlieg[s < 0 ? 'wl' : 'wr'] = w; }
  r.add(new THREE.PointLight(0xd8ff6a, 4, 7, 2));
}
scannables.push({ name: 'Vuurvlieg', ability: 'gloei', obj: vlieg.root, offset: V3(0, 0.5, 0) });
// temple mouse: by the pump room. Krimp
const muis = { root: new THREE.Group(), home: V3(-7, 0, 7.5), t: 0 };
{
  const r = muis.root; scene.add(r);
  const b = mk(new THREE.SphereGeometry(0.22, 12, 10), toon(0xb8a890), 0, 0.2, 0, r); b.scale.set(0.9, 0.85, 1.3);
  const h = mk(new THREE.SphereGeometry(0.14, 10, 8), toon(0xb8a890), 0, 0.27, 0.27, r);
  eyes(h, 0.03, 0.12, 0.06, 0.03);
  for (const s of [-1, 1]) mk(new THREE.SphereGeometry(0.08, 8, 6), toon(0xe8b8b8), 0.1 * s, 0.4, 0.22, r, 0).scale.z = 0.4;
  const tail = mk(new THREE.CylinderGeometry(0.015, 0.01, 0.5), toon(0xe8b8b8), 0, 0.15, -0.45, r, 0); tail.rotation.x = 1.2;
}
scannables.push({ name: 'Tempelmuis', ability: 'krimp', obj: muis.root, offset: V3(0, 0.5, 0) });
addSpeaker(muis.root, { y: 0.9, radius: 3.5, linger: 10, lines: ['*piep!*', '*de muis schiet een klein gaatje in de muur in en weer uit*'] });

// ---------- things to pick up ----------
const PART_NAMES = { propeller: 'Byte’s propeller', lens: 'Byte’s scanlens', antenne: 'Byte’s antenne' };
const CARE_NAMES = { verband: 'Verband uit de raket', water: 'Een kom water', kussen: 'Een zacht kussen' };
const ITEMS = [
  { id: 'propeller', kind: 'part', at: V3(-24, 1, -0.4), cond: () => true },
  { id: 'lens', kind: 'part', at: LENS_AT, cond: () => lensUp() },
  { id: 'antenne', kind: 'part', at: ANTENNA_AT, cond: () => !!puz.symbolen },
  { id: 'verband', kind: 'care', at: V3(LEDGE.x, 0.9, LEDGE.z), cond: () => true },
  { id: 'water', kind: 'care', at: V3(FOUNTAIN.x + 2.3, 1.5, FOUNTAIN.z + 3.6), cond: () => !!puz.fontein },
  { id: 'kussen', kind: 'care', at: V3(HOUSE.x, HOUSE.y + 0.7, HOUSE.z - 1), cond: () => true },
];
function itemMesh(id) {
  const g = new THREE.Group();
  const white = toon(0xf4f4f4), dark = toon(0x3a3a4a);
  if (id === 'propeller') { mk(new THREE.CylinderGeometry(0.06, 0.06, 0.3), dark, 0, 0, 0, g, 0); const b = mk(new THREE.BoxGeometry(0.9, 0.04, 0.16), white, 0, 0.16, 0, g); b.rotation.y = 0.3; }
  if (id === 'lens') { const l = mk(new THREE.TorusGeometry(0.22, 0.06, 8, 20), dark, 0, 0, 0, g); l.rotation.y = Math.PI / 2; const gl = new THREE.Mesh(new THREE.CircleGeometry(0.2, 16), new THREE.MeshBasicMaterial({ color: 0x5ef2e0, side: THREE.DoubleSide })); gl.rotation.y = Math.PI / 2; g.add(gl); }
  if (id === 'antenne') { mk(new THREE.CylinderGeometry(0.03, 0.03, 0.7), dark, 0, 0, 0, g, 0); const t = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff4a6a })); t.position.y = 0.38; g.add(t); }
  if (id === 'verband') { mk(new THREE.BoxGeometry(0.6, 0.35, 0.4), white, 0, 0, 0, g); mk(new THREE.BoxGeometry(0.4, 0.08, 0.42), toon(0xe0443a), 0, 0, 0, g, 0); mk(new THREE.BoxGeometry(0.1, 0.36, 0.42), toon(0xe0443a), 0, 0, 0, g, 0); }
  if (id === 'water') { mk(new THREE.CylinderGeometry(0.32, 0.22, 0.18, 14), toon(0xc87838), 0, 0, 0, g); const w = new THREE.Mesh(new THREE.CircleGeometry(0.28, 14), new THREE.MeshBasicMaterial({ color: 0x5ac8f0 })); w.rotation.x = -Math.PI / 2; w.position.y = 0.08; g.add(w); }
  if (id === 'kussen') { mk(new THREE.BoxGeometry(0.8, 0.22, 0.6), toon(0xb04a8a), 0, 0, 0, g); }
  const l = new THREE.PointLight(0xfff0a0, 4, 5, 2); g.add(l);
  scene.add(g); return g;
}
for (const it of ITEMS) { it.m = itemMesh(it.id); it.m.position.copy(it.at); }
const gotItem = (it) => (it.kind === 'part' ? has(it.id) : save.care.includes(it.id));
function pickUp(it, P) {
  if (it.kind === 'part') save.parts.push(it.id); else save.care.push(it.id);
  persist(); sfx.cosmic(); puff(it.m.position.clone(), 18, 0xfff0a0, 4, 2);
  if (it.kind === 'care') { toast(`${CARE_NAMES[it.id]}! Breng het naar Otis bij de raket`); return; }
  if (!save.byteUp) { toast(it.id === 'propeller' ? `${PART_NAMES[it.id]}! Breng hem naar ${BYTE()} bij de raket` : `${PART_NAMES[it.id]}! Bewaar hem voor ${BYTE()}`); return; }
  // Byte is flying with you: he fits it himself
  fitPart(it.id, P);
}
function fitPart(id, P) {
  dressDrone();
  const cam = () => ({ pos: P.pos.clone().add(V3(2.2, 2.4, 3)), look: P.pos.clone().add(V3(0, 1.5, 0)) });
  const LINES = {
    lens: [`Mijn scanlens! *klik* Ik zie weer alles scherp.`, 'Ik kan weer kopiëren! Er lopen hier best rare beesten rond. Een kever van steen, een vuurvlieg, een muisje…'],
    antenne: ['Mijn antenne! *piep… piep…* Ik vang weer signalen op!', 'Hè? Ik hoor iets… zwak. Iets begravens, ergens in het zuidwesten van het dal. Ik ga piepen als we in de buurt komen.'],
  };
  play((LINES[id] || []).map((text) => ({ say: { who: BYTE_UP(), text }, cam })), () => checkWhole());
}
function checkWhole() {
  if (byteWhole() && !save.byteWhole) {
    save.byteWhole = true; persist();
    toast(`${BYTE()} is weer helemaal heel!`); sfx.fanfare();
    addCookie(BYTE_AT.x - 1.6, -0.4 + 1.2, BYTE_AT.z, COOKIE_BYTE);
  }
  checkRocket();
}

// ---------- talking (E): repairing Byte, looking after Otis ----------
const nearByte = (p) => !save.byteUp && p.distanceTo(wreck.g.position) < 2.6;
const nearOtis = (p) => p.distanceTo(OTIS_AT) < 3 && otisLying && save.care.some((c) => !save.given.includes(c));
let lastP = V3();
export function nearMilo(p) { return nearByte(p) || nearOtis(p); }
export const npcPrompt = () => (nearByte(lastP) ? (has('propeller') ? `${BYTE()} repareren` : `${BYTE()} bekijken`) : 'Otis verzorgen');
export function talk() {
  if (nearByte(lastP)) byteTalk();
  else if (nearOtis(lastP)) otisTalk();
}
function byteTalk() {
  const B = wreck.g.position;
  const cam = shot(V3(B.x + 1.6, B.y + 1.2, B.z + 2), V3(B.x, B.y + 0.2, B.z));
  if (!has('propeller')) {
    play([
      { say: { who: 'JOSH', text: `${BYTE()}…? Hoor je me?` }, cam },
      { say: { who: BYTE_UP(), text: '…bzzt… pr… propeller… weg… zonder propeller… kan ik… niet… bzzt…' }, cam },
      { say: { who: 'JOSH', text: 'Ik vind hem. Ik beloof het.' }, cam },
    ]);
    return;
  }
  const extra = ['lens', 'antenne'].filter(has);
  play([
    { say: { who: 'JOSH', text: `Hier, ${BYTE()}. Je propeller.` }, cam, start() { sfx.click(); } },
    { dur: 1.6, start() { wreck.props.forEach((p) => (p.visible = true)); sfx.whir(); puff(B.clone().add(V3(0, 0.3, 0)), 12, 0xffe080, 3, 1); }, update(dt) { wreck.props.forEach((p, i) => (p.rotation.y += dt * (i ? 40 : -40))); wreck.eyeMat.color.setHex(Math.random() < 0.5 ? 0x5ef2e0 : 0x2a2a2a); }, cam },
    { dur: 1.4, update(dt, k) { wreck.g.position.y = BYTE_AT.y + k * 1.4; wreck.tilt.rotation.z = 1.3 * (1 - k); wreck.props.forEach((p, i) => (p.rotation.y += dt * (i ? 60 : -60))); }, cam },
    { say: { who: BYTE_UP(), text: 'Systeem… opnieuw opgestart. JOSH! Ik vlieg weer!' }, cam },
    { say: { who: BYTE_UP(), text: extra.length ? `En je hebt mijn ${extra.map((e) => (e === 'lens' ? 'scanlens' : 'antenne')).join(' en ')} ook al! *klik*` : 'Mijn scanlens en mijn antenne zijn nog weg. Zonder lens kan ik niks kopiëren…' }, cam },
    { say: { who: BYTE_UP(), text: 'Otis! Hou vol, maatje. Josh en ik regelen het.' }, cam: shot(V3(OTIS_AT.x + 2, OTIS_AT.y + 1.6, OTIS_AT.z + 2.6), OTIS_AT.clone().add(V3(0, 0.4, 0))) },
  ], () => {
    save.byteUp = true; persist(); wreck.g.visible = false; dressDrone();
    if (has('antenne')) toast(`${BYTE()} piept: iets begravens, ergens in het zuidwesten!`);
    checkWhole();
  });
}
function otisTalk() {
  const O = OTIS_AT;
  const cam = shot(V3(O.x + 2.2, O.y + 1.5, O.z + 2.6), V3(O.x, O.y + 0.4, O.z));
  const give = save.care.filter((c) => !save.given.includes(c));
  const LINES = {
    verband: { josh: 'Stil maar, Otis. Even je poot verbinden…', otis: '*likt Josh’s hand*' },
    water: { josh: 'Hier, drink maar. Vers uit de fontein.', otis: '*slurp slurp slurp*' },
    kussen: { josh: 'Een kussen. Dan lig je wat zachter.', otis: '*zucht diep en legt zijn kop erop*' },
  };
  const steps = [];
  for (const g of give) {
    steps.push({ say: { who: 'JOSH', text: LINES[g].josh }, cam, start() { save.given.push(g); persist(); poseOtis(); sfx.click(); } });
    steps.push({ say: { who: 'OTIS', text: LINES[g].otis }, cam, start() { otis.setMood('happy', 0.6); } });
  }
  play(steps, () => {
    if (otisWell() && !save.otisWell) {
      play([
        { dur: 1.6, start() { poseOtis(); otis.setMood('shake', 1.2); puff(otis.root.position.clone().add(V3(0, 0.5, 0)), 14, 0xd8c8a8, 3, 1); }, cam },
        { say: { who: 'OTIS', text: 'WOEF!', sub: save.byteUp ? `${BYTE()} vertaalt: “Ik sta weer! Mijn poot doet bijna geen pijn meer!”` : 'Josh denkt dat Otis bedoelt: “Ik sta weer!”' }, cam, start() { otis.setMood('happy', 2); sfx.bark(); } },
      ], () => {
        save.otisWell = true; persist();
        addCookie(O.x + 1.8, O.y + 1.2, O.z - 1, COOKIE_OTIS);
        checkRocket();
      });
    } else {
      const left = ['verband', 'water', 'kussen'].filter((k) => !save.given.includes(k)).length;
      toast(`Otis voelt zich al wat beter. Nog ${left} ding${left > 1 ? 'en' : ''} voor Otis`);
    }
  });
}
// both done: they fix the rocket
function checkRocket() {
  if (save.rocket || !save.otisWell || !byteWhole()) return;
  const R = rocket.position;
  play([
    { say: { who: BYTE_UP(), text: 'Otis is beter, ik ben heel… dan is er nog één ding kapot.' }, cam: shot(V3(R.x - 4, 3, R.z + 6), V3(R.x + 2, 0.5, R.z)) },
    { say: { who: 'OTIS', text: 'Woef!', sub: `${BYTE()} vertaalt: “Mijn raket! Geef me die vin eens aan.”` }, cam: shot(V3(R.x - 4, 3, R.z + 6), V3(R.x + 2, 0.5, R.z)) },
    { dur: 2.6, start() { otis.walkTo(V3(WRECK.x - 1.4, 0, WRECK.z + 1.4), 3); sfx.clank(); }, update(dt, k) { if (Math.random() < 0.3) puff(V3(R.x + 2 + Math.random() * 2, 0.8, R.z + Math.random() - 0.5), 2, 0xffe080, 3, 1); if (k > 0.5 && !rocket.userData.fixed) { setRocket(true); puff(R.clone().add(V3(0, 1, 0)), 30, 0xd8c8a8, 8, 2); sfx.smash(); } }, cam: shot(V3(R.x - 5, 4, R.z + 8), V3(R.x, 2, R.z)) },
    { say: { who: BYTE_UP(), text: 'Ze staat weer recht! Josh, we kunnen weg. Kayo & Yara’s basis… dit keer met een plan.' }, cam: shot(V3(R.x - 4, 3.5, R.z + 7), V3(R.x, 2.5, R.z)) },
  ], () => { save.rocket = true; persist(); });
}

// ---------- every frame ----------
export function updateNPCs(dt, t, p) {
  lastP.copy(p);
  // broken Byte sparks now and then
  if (!save.byteUp) { if (Math.random() < dt * 1.2) { puff(wreck.g.position.clone().add(V3(0, 0.1, 0)), 3, 0xffe080, 2, 1); sfx.zap && Math.random() < 0.2 && sfx.zap(); } wreck.eyeMat.color.setHex(Math.random() < 0.03 ? 0x5ef2e0 : 0x2a2a2a); }
  // Otis
  if (otisLying) { otis.root.position.y = OTIS_AT.y + 0.35 + Math.sin(t * 2.2) * 0.02; }
  else otis.update(dt, t, p);
  // the beetle wanders slowly round the square
  kever.t += dt * 0.25;
  const kx = kever.home.x + Math.sin(kever.t) * 4, kz = kever.home.z + Math.sin(kever.t * 2) * 2.5;
  kever.root.rotation.y = Math.atan2(kx - kever.root.position.x, kz - kever.root.position.z) || kever.root.rotation.y;
  kever.root.position.set(kx, groundAt(kx, kz, 0.3), kz);
  // the firefly
  vlieg.root.position.set(vlieg.home.x + Math.sin(t * 0.9) * 1.2, vlieg.home.y + Math.sin(t * 1.7) * 0.4, vlieg.home.z + Math.cos(t * 0.7) * 1.5);
  vlieg.root.rotation.y = t * 0.9 + Math.PI / 2;
  if (vlieg.wl) { vlieg.wl.rotation.z = Math.sin(t * 40) * 0.6; vlieg.wr.rotation.z = -Math.sin(t * 40) * 0.6; }
  // the mouse darts back and forth by the pump room
  muis.t += dt;
  const mx = muis.home.x + Math.sin(muis.t * 1.3) * 1.5 * (Math.sin(muis.t * 0.4) > 0 ? 1 : 0.4), mz = muis.home.z + Math.cos(muis.t * 1.1) * 0.8;
  muis.root.rotation.y = Math.atan2(mx - muis.root.position.x, mz - muis.root.position.z) || muis.root.rotation.y;
  muis.root.position.set(mx, 0, mz);
  // things to pick up
  for (const it of ITEMS) {
    const show = !gotItem(it) && it.cond();
    it.m.visible = show;
    if (!show) continue;
    it.m.rotation.y = t * 1.5; it.m.position.y = it.at.y + Math.sin(t * 2) * 0.12;
    if (p.clone().add(V3(0, 0.8, 0)).distanceTo(it.m.position) < 1.3) pickUp(it, { pos: p });
  }
  // Byte's antenna tip blinks
  if (antenna && antenna.visible) antenna.userData.tip.visible = Math.sin(t * 6) > -0.3;
  void HALL; void PUMP;
}

// back after a refresh
export function restoreNPCs(s, gotSet) {
  restoreTrials(s, gotSet);
  poseOtis();
  wreck.g.visible = !save.byteUp;
  dressDrone();
  if (save.byteWhole && !gotSet.has(COOKIE_BYTE)) addCookie(BYTE_AT.x - 1.6, -0.4 + 1.2, BYTE_AT.z, COOKIE_BYTE);
  if (save.otisWell && !gotSet.has(COOKIE_OTIS)) addCookie(OTIS_AT.x + 1.8, OTIS_AT.y + 1.2, OTIS_AT.z - 1, COOKIE_OTIS);
  setRocket(!!save.rocket);
}
