import { THREE, scene, toon, addOutline, V3, damp, puff, toast } from './core.js?v=sub1';
import { addCookie } from './cookies.js?v=sub1';
import { addSpeaker } from './bubbles.js?v=sub1';
import { getSave } from './save.js?v=sub1';
import { play, shot } from './cutscene.js?v=sub1';
import { LOOK } from './ui.js?v=sub1';
import * as sfx from './sfx.js?v=sub1';
import { groundAt, PLATEAU_H } from './schroot-terrain.js?v=sub1';
import { FIONN_AT, DISH_AT, DISH_MOUNT, TV_AT, KRAAN_MAG, VONKJE_AT } from './schroot-world.js?v=sub1';
import { boss } from './schroot-boss.js?v=sub1';

// Who lives on the Schroothoop: Fionn (shaped a bit like an egg, fixes everything, always a few years behind on
// memes), little tin robots called Bliepjes who chat as you pass, and two things Byte can copy:
// the crane magnet at the kraanhoop (Magneet) and the Vonkje on the old transformer by the factory (Vonk).
export const scannables = [];
export const dialog = { active: false };
export const PENDING_RARE = 5;          // Fionn's antenna, the factory robot, two rare crates, the Schrootmech
export const npcEvents = { onChange() {} };
export const miloTalked = () => false;
export const guideDone = () => false;
const { save, persist } = getSave('schroot');
const BYTE = () => (LOOK.droneName || 'Byte').toUpperCase();

const ink = new THREE.MeshBasicMaterial({ color: 0x1a1030 });
const mk = (geo, mat, x, y, z, parent, ol = 1.08) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true;
  if (ol) addOutline(m, ol); parent.add(m); return m;
};
const eyes = (parent, y, z, gap, r = 0.05, mat = ink) => [-1, 1].forEach((s) => { const e = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), mat); e.position.set(gap * s, y, z); parent.add(e); });

// ---------- de Bliepjes ----------
const tin = toon(0xa8b0b8), dark = toon(0x4a525c);
const bliepjes = [];
function bliepje(x, z, color, lines, y = null) {
  const root = new THREE.Group(); root.position.set(x, y ?? groundAt(x, z, 0), z); scene.add(root);
  const bod = new THREE.Group(); root.add(bod);
  mk(new THREE.CylinderGeometry(0.25, 0.25, 0.5, 12), tin, 0, 0.35, 0, bod);
  const cap = toon(color);
  mk(new THREE.CylinderGeometry(0.27, 0.27, 0.08, 12), cap, 0, 0.62, 0, bod, 0);
  mk(new THREE.CylinderGeometry(0.015, 0.015, 0.3), dark, 0, 0.8, 0, bod, 0);
  mk(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color }), 0, 0.97, 0, bod, 0);
  for (const s of [-1, 1]) mk(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 10), dark, 0.25 * s, 0.1, 0, bod, 0).rotation.z = Math.PI / 2;
  eyes(bod, 0.45, 0.24, 0.08, 0.05, new THREE.MeshBasicMaterial({ color: 0x7af5ff }));
  const b = { root, bod, t: Math.random() * 5 };
  addSpeaker(root, { y: 1.3, radius: 5, linger: 16, lines });
  bliepjes.push(b);
}
bliepje(-5, 38, 0xff5a5a, ['Bliep! Welkom op de Schroothoop.', 'Vijf hopen schroot, en daartussen alleen maar olie. Blijf op de bruggen!', 'Fionn woont links, bij het schuurtje. Hij maakt alles weer heel.']);
bliepje(-34, 10, 0xf0b030, ['Naar de autohoop kom je hier alleen met een magneet.', 'Spring, en spring in de lucht nog een keer bij een magneet. Zoef!', 'Hang je eraan? Spring nog eens en je slingert weg, de kant op die je stuurt.'], null);
bliepje(-40, 6, 0x5a8ad0, ['Die stapel containers is héél hoog. Er ligt iets ronds op. Een soort grote schotel.', 'De hoogste kraan van de hoop. Daar is nog nooit iemand bovenop geweest.'], null);
bliepje(-26, -46, 0x3fd6c8, ['De pers stampt al sinds vóór mijn tijd. Daaronder ligt iets. Snel zijn!', 'Banden stuiteren. Ook als je erop stampt. Zeker als je erop stampt.', 'Over de ijzeren brug kom je bij De Top. Daar moet je wel de rotswand op.'], null);
bliepje(37, 14, 0xffe14a, ['Bliep. Pas op, die lopende band rijdt de verkeerde kant op.', 'Er woont een Vonkje op de oude transformator. Als je dat kunt kopiëren…', 'Met een vonk gaan de kasten weer aan. Als je die kunt schieten, tenminste.'], null);
bliepje(44, 7.5, 0x9b6bff, ['Die ventilator blies vroeger heel hard. Omhoog.', 'De oude robot zit daar al zo lang. Hij heeft iets in zijn hand, denk ik.', 'Op het dak staat de kabelbaan naar De Top. Zonder stroom gaat hij nergens heen.'], null);
const TOP_BEFORE = ['Ssst. Daar woont Ratjetoe. Een rat met een vliegeniersbril.', 'Hij sleept al dagen schroot naar die berg. Wat bouwt hij toch?', 'Zonder je drone moet je het met schroot doen. Gooien kun je met E.'];
const TOP_AFTER = ['Ratjetoe is weg! Hij rende huilend naar zijn ruimteschip.', 'Wat een mooie hoop schroot ligt daar nu. Bliep.'];
bliepje(14, -64, 0x7dff9a, () => (boss.state === 'dead' ? TOP_AFTER : TOP_BEFORE), PLATEAU_H);

// ---------- copyable things ----------
scannables.push({ name: 'Kraanmagneet', ability: 'magneet', obj: KRAAN_MAG, offset: V3(0, 1, 0) });
// het Vonkje: a little crackling spark that hops around on the old transformer
const vonkje = new THREE.Group(); vonkje.position.copy(VONKJE_AT).add(V3(0, 1.6, 1.8)); scene.add(vonkje);
const vonkBody = new THREE.Group(); vonkje.add(vonkBody);
{
  const yel = new THREE.MeshBasicMaterial({ color: 0xffe14a });
  mk(new THREE.OctahedronGeometry(0.3, 0), yel, 0, 0.35, 0, vonkBody, 1.15);
  for (let i = 0; i < 4; i++) { const s = mk(new THREE.ConeGeometry(0.06, 0.3, 4), yel, 0, 0.35, 0, vonkBody, 0); s.rotation.z = (i / 4) * Math.PI * 2; s.position.x = Math.cos((i / 4) * Math.PI * 2) * 0.3; s.position.y = 0.35 + Math.sin((i / 4) * Math.PI * 2) * 0.3; }
  eyes(vonkBody, 0.4, 0.22, 0.08, 0.04);
  const l = new THREE.PointLight(0xffe14a, 4, 5, 2); l.position.y = 0.5; vonkje.add(l);
}
scannables.push({ name: 'Vonkje', ability: 'vonk', obj: vonkje, offset: V3(0, 1.2, 0) });

// ---------- Fionn ----------
const FIONN_NAME = 'Fionns antenne';
const fionn = { root: new THREE.Group(), state: 'new' };
{
  const r = fionn.root; r.position.copy(FIONN_AT); r.rotation.y = -0.6; scene.add(r);
  const shell = toon(0xf6efe0), overall = toon(0x5a8ad0), boots = toon(0x4a3a30), skin = toon(0xf0c8a0);
  [-1, 1].forEach((s) => mk(new THREE.CapsuleGeometry(0.11, 0.3, 4, 8), boots, 0.16 * s, 0.25, 0, r));
  // the egg: one round body that is also his head
  const egg = mk(new THREE.SphereGeometry(0.55, 20, 16), shell, 0, 1.1, 0, r, 1.04); egg.scale.set(1, 1.32, 1);
  const pants = mk(new THREE.SphereGeometry(0.565, 20, 10, 0, Math.PI * 2, Math.PI * 0.62, Math.PI * 0.38), overall, 0, 1.1, 0, r, 0); pants.scale.set(1, 1.32, 1);
  [-1, 1].forEach((s) => { const a = mk(new THREE.CapsuleGeometry(0.08, 0.36, 4, 8), skin, 0.58 * s, 1.0, 0.05, r); a.rotation.z = 0.35 * s; });
  fionn.face = new THREE.Group(); fionn.face.position.set(0, 1.45, 0.5); r.add(fionn.face);
  eyes(fionn.face, 0, 0.04, 0.14, 0.06);
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.015, 6, 12, Math.PI), ink); mouth.rotation.z = Math.PI; mouth.position.set(0, -0.18, 0.05); fionn.face.add(mouth);
  // welding goggles pushed up on his forehead, and a wrench in his belt
  const strap = mk(new THREE.TorusGeometry(0.56, 0.035, 6, 28), dark, 0, 1.75, 0, r, 0); strap.rotation.x = Math.PI / 2; strap.scale.set(0.95, 0.95, 1);
  for (const s of [-1, 1]) mk(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 12), toon(0x7af5ff), 0.15 * s, 1.78, 0.48, r, 1.1).rotation.x = Math.PI / 2 - 0.3;
  mk(new THREE.BoxGeometry(0.08, 0.4, 0.05), toon(0x8a8a90), 0.35, 0.8, 0.42, r, 0).rotation.z = 0.4;
}
const FIONN_LINES = {
  new: ['Oh! Hallo! Een raket! Wat een deuk zeg.', '*klopt op zijn eigen schaal* Alles heel hier.'],
  search: ['Mijn schotel is van het dak gewaaid. Richting de kraanhoop, ergens hoog.', 'Zonder schotel mis ik alle nieuwe memes! Die van die dansende baby, kent iemand die al?', 'Ik lijk op een ei? Nooit gehoord. Echt nooit.'],
  carry: ['IS DAT MIJN SCHOTEL?! Breng hem hier!'],
  mounted: ['Schotel zit erop. Maar mijn stroomkast is dood. Iets met een vonk…', 'Bij de fabriek woont een Vonkje. Als jij dat kunt, schiet dan een vonk in die grijze kast naast mijn schuurtje.', 'Ik ga zo internetten. Bestaat Vine nog?'],
  done: ['Wist je dat er een hond is die zegt "this is fine" terwijl alles in de fik staat? Gloednieuw!', 'Ik heb een nieuw woord geleerd: "yeet". Ik weet niet wat het betekent, maar ik zeg het heel vaak.', 'Ratjetoe zit op De Top. Zonder drone moet je met schroot gooien. Daar ligt genoeg.'],
};
const after = ['Mijn stuwkop is weer terug! En jouw raket vliegt weer. Yeet!', 'Zeg tegen Ratjetoe dat hij zijn kaas zelf mag verdienen.'];
addSpeaker(fionn.root, { y: 2.3, radius: 5, linger: 14, lines: () => (save.boss && fionn.state === 'done' ? after : FIONN_LINES[fionn.state]) });

// the dish: on the tall orange container; once you've got it, it floats above Josh
const dish = new THREE.Group(); dish.position.copy(DISH_AT); scene.add(dish);
{
  const d = mk(new THREE.SphereGeometry(0.75, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2.6), toon(0xd8dce4), 0, 0, 0, dish, 1.05); d.rotation.x = Math.PI; d.scale.y = 0.5;
  mk(new THREE.CylinderGeometry(0.04, 0.04, 0.6), dark, 0, 0.1, 0, dish, 0);
  mk(new THREE.SphereGeometry(0.08, 8, 6), toon(0xe0443a), 0, 0.42, 0, dish, 0);
  dish.rotation.x = -0.5;
}
const dishGlow = new THREE.PointLight(0xffffff, 3, 5, 2); dish.add(dishGlow);
function mountDish() { dish.position.copy(DISH_MOUNT); dish.rotation.set(-0.6, 0.8, 0); dish.scale.setScalar(1); dishGlow.intensity = 0; }
// the tv on the workbench; it switches on in the end
const tvMat = new THREE.MeshBasicMaterial({ color: 0x2a2e34 });
{
  const tv = new THREE.Group(); tv.position.copy(TV_AT); tv.rotation.y = Math.PI + 0.5; scene.add(tv);
  mk(new THREE.BoxGeometry(0.9, 0.7, 0.6), toon(0x6a4a30), 0, 0.35, 0, tv, 1.04);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.5), tvMat); scr.position.set(0, 0.37, 0.31); tv.add(scr);
}
const prize = (x, y, z, name) => { addCookie(x, y, z, name); puff(V3(x, y, z), 18, 0xb79cff, 4, 2); };

// you can talk to Fionn when he has something to say, or when you've brought him what he needs
const canTalk = (p) => p.distanceTo(fionn.root.position) < 3 && (fionn.state === 'new' || fionn.state === 'carry');
let lastAbility = () => null;
export function setAbilityProbe(fn) { lastAbility = fn; }
function fionnTalk() {
  const F = fionn.root.position;
  const cam = shot(V3(F.x + 2.4, F.y + 1.8, F.z - 2.2), V3(F.x, F.y + 1.2, F.z));
  if (fionn.state === 'new') {
    play([
      { say: { who: 'FIONN', text: 'Oh! Een raket! Die heeft een flinke deuk. Net als mijn telefoon in 2016.' }, cam },
      { say: { who: 'FIONN', text: 'Ik ben Fionn. Ik maak alles weer heel wat hier ligt. Behalve mijn tv: daar heb ik al maanden geen signaal op.' }, cam },
      { say: { who: BYTE(), text: 'Onze stuwkop is kapot. Heb jij er nog eentje?' }, cam },
      { say: { who: 'FIONN', text: 'Had. Mijn mooiste. Maar een rat met een vliegeniersbril heeft hem gejat. Ratjetoe heet hij.' }, cam },
      { say: { who: 'FIONN', text: 'Hij zei dat twee katten hem betalen. In kaas.' }, cam },
      { say: { who: BYTE(), text: 'Kayo & Yara. Natuurlijk.' }, cam },
      { say: { who: 'FIONN', text: 'Hij sleept alles naar De Top, helemaal achteraan. Daar bouwt hij iets groots.' }, cam: shot(V3(F.x + 3, F.y + 6, F.z + 4), V3(0, 20, -90)) },
      { say: { who: 'FIONN', text: 'O, en als je toch rondloopt: mijn schotel is van het dak gewaaid. Ergens hoog bij de kraanhoop.' }, cam },
      { say: { who: 'FIONN', text: 'Zonder schotel mis ik alle nieuwe memes. De laatste die ik zag was die van die dansende baby. Die is toch nieuw?' }, cam },
      { say: { who: BYTE(), text: '…Die is van 1996.' }, cam },
    ], () => { fionn.state = save.dish ? 'carry' : 'search'; save.fionn = fionn.state; persist(); });
  } else if (fionn.state === 'carry') {
    play([
      { say: { who: 'FIONN', text: 'MIJN SCHOTEL!' }, cam, start() { mountDish(); sfx.clank(); puff(DISH_MOUNT.clone(), 12, 0xffffff, 3, 1); } },
      { say: { who: 'FIONN', text: 'Zo. Hij zit erop. Alleen… er komt geen stroom meer uit het stopcontact.' }, cam: shot(V3(F.x + 2, F.y + 4, F.z - 3), DISH_MOUNT) },
      { say: { who: 'FIONN', text: 'Bij de fabriek woont een Vonkje. Kun jij vonken schieten? Schiet er dan eentje in die grijze kast naast mijn schuurtje.' }, cam },
    ], () => { fionn.state = 'mounted'; save.fionn = 'mounted'; save.dish = false; persist(); });
  }
}
// a spark in Fionn's power box: only does something once the dish is back on the roof
export function fionnPower() {
  if (fionn.state !== 'mounted') return false;
  const F = fionn.root.position;
  const cam = shot(V3(F.x + 2.4, F.y + 1.8, F.z - 2.2), V3(F.x, F.y + 1.2, F.z));
  play([
    { say: { who: 'FIONN', text: 'STROOM! Mijn kast doet het weer!' }, cam, start() { sfx.zap(); puff(TV_AT.clone().add(V3(0, 0.5, 0)), 14, 0xffe14a, 3, 1); } },
    { say: { who: 'FIONN', text: 'SIGNAAL!' }, cam: shot(V3(TV_AT.x - 1.6, TV_AT.y + 1, TV_AT.z - 1.6), TV_AT), start() { tvOn = true; } },
    { say: { who: 'FIONN', text: 'Wauw. Een kikker die thee drinkt. Dat is vast de nieuwste trend.' }, cam: shot(V3(TV_AT.x - 1.6, TV_AT.y + 1, TV_AT.z - 1.6), TV_AT) },
    { say: { who: BYTE(), text: 'Die is van 2014.' }, cam },
    { say: { who: 'FIONN', text: 'Dus hij is retro. Nog beter! Hier, dit lag al jaren in mijn la. Het gloeit paars.' }, cam },
  ], () => { fionn.state = 'done'; save.fionn = 'done'; persist(); prize(F.x + 1.2, 1.4, F.z - 1.2, FIONN_NAME); });
  return true;
}
let tvOn = false;

export function nearMilo(p) { return canTalk(p); }
export const npcPrompt = () => 'praten met Fionn';
const lastP = V3();
export function talk() { if (canTalk(lastP)) fionnTalk(); }

export function updateNPCs(dt, t, p) {
  lastP.copy(p);
  for (const b of bliepjes) {
    b.t += dt;
    b.bod.position.y = Math.abs(Math.sin(b.t * 3)) * 0.05;
    const d = Math.atan2(p.x - b.root.position.x, p.z - b.root.position.z) - b.root.rotation.y;
    if (p.distanceTo(b.root.position) < 6) b.root.rotation.y += Math.atan2(Math.sin(d), Math.cos(d)) * damp(3, dt);
  }
  vonkBody.position.y = Math.abs(Math.sin(t * 6)) * 0.4;
  vonkBody.rotation.y = t * 3;
  vonkje.position.x = VONKJE_AT.x + Math.sin(t * 0.8) * 0.5;
  if (Math.random() < dt * 4) puff(vonkje.position.clone().add(V3(0, 0.4, 0)), 1, 0xffe14a, 2, 1);
  // Fionn looks at you and wobbles like an egg
  const r = fionn.root;
  const dl = Math.atan2(p.x - r.position.x, p.z - r.position.z) - r.rotation.y;
  if (p.distanceTo(r.position) < 8) r.rotation.y += Math.atan2(Math.sin(dl), Math.cos(dl)) * damp(3, dt);
  r.rotation.z = Math.sin(t * 2) * 0.05;
  r.position.y = FIONN_AT.y + (fionn.state === 'carry' ? Math.abs(Math.sin(t * 6)) * 0.2 : 0);
  if (tvOn) tvMat.color.setHSL((t * 0.3) % 1, 0.6, 0.6);
  // the dish
  if (fionn.state !== 'mounted' && fionn.state !== 'done' && !save.dish) {
    dish.rotation.y = t * 0.8; dish.position.y = DISH_AT.y + Math.sin(t * 2) * 0.1;
    if (p.clone().add(V3(0, 0.8, 0)).distanceTo(dish.position) < 1.6) {
      save.dish = true; persist(); sfx.clank();
      puff(dish.position.clone(), 12, 0xffffff, 3, 1.5);
      toast('Fionns schotel! Breng hem terug naar zijn schuurtje');
      if (fionn.state === 'search' || fionn.state === 'new') fionn.state = fionn.state === 'new' ? 'new' : 'carry';
    }
  } else if (save.dish && fionn.state !== 'mounted' && fionn.state !== 'done') {
    dish.position.lerp(p.clone().add(V3(0, 2.4, 0)), damp(10, dt)); dish.rotation.y = t * 2;
  }
}

// back after a refresh
export function restoreNPCs(s, got) {
  const st = s.fionn;
  if (st === 'done') { fionn.state = 'done'; mountDish(); tvOn = true; if (!got.has(FIONN_NAME)) addCookie(FIONN_AT.x + 1.2, 1.4, FIONN_AT.z - 1.2, FIONN_NAME); }
  else if (st === 'mounted') { fionn.state = 'mounted'; mountDish(); }
  else if (st === 'search' || st === 'carry') fionn.state = s.dish ? 'carry' : 'search';
}
