import { THREE, scene, toon, addOutline, V3, puff, toast } from './core.js';
import { addCookie } from './cookies.js';
import { addSpeaker } from './bubbles.js';
import { getSave } from './save.js';
import { play, shot } from './cutscene.js';
import { LOOK } from './ui.js';
import * as sfx from './sfx.js';
import { TREES, ARENA } from './woud-terrain.js';
import { KITCHEN, HIVE, DEN_LEDGE, MAM_DECK, fillJar } from './woud-world.js';
import { boss, bonk } from './woud-boss.js';
import { TRIAL_RARE, restoreTrials, squirrel, trialWho, trialTalk, trialPrompt, DWAAL_END } from './woud-trials.js';

// Who lives in het Reuzenwoud: Reshman, a cook from India who travels the galaxy looking for the best
// ingredients for his curries. The three he needs most grow up in the giant trees… and he can't climb.
// Bring them to his kitchen by the rocket and he cooks the curry of his life. Also: squirrels to copy (Grijp!),
// a flying squirrel (Zweef), a tree frog (Veer), a rhino beetle (Zwaar) and a firefly (Gloei).
export const scannables = [];
export const dialog = { active: false };
export const PENDING_RARE = 3 + TRIAL_RARE;    // Reshman, Bonk, the crate, and the trials
export const npcEvents = { onChange() {} };
export const miloTalked = () => false;
export const guideDone = () => false;
const { save, persist } = getSave('woud');
save.parts = save.parts || [];
const BYTE = () => (LOOK.droneName || 'Byte').toUpperCase();
const COOKIE_CURRY = 'Reshman’s curry';
let ctx = null;
export function setCtx(c) { ctx = c; }
const T = TREES, top = (k) => T[k][3];

const ink = new THREE.MeshBasicMaterial({ color: 0x1a1030 });
const mk = (geo, mat, x, y, z, parent, ol = 1.08) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true;
  if (ol) addOutline(m, ol); parent.add(m); return m;
};

// ---------- Reshman ----------
const reshman = (() => {
  const g = new THREE.Group(); g.position.set(KITCHEN.x - 1.4, 0, KITCHEN.z + 1); g.scale.setScalar(1.15); scene.add(g);
  const skin = toon(0xa8704a), kurta = toon(0xe8802a);
  for (const s of [-1, 1]) mk(new THREE.CapsuleGeometry(0.1, 0.4, 4, 8), toon(0xf4ecd8), 0.13 * s, 0.3, 0, g);
  mk(new THREE.CapsuleGeometry(0.27, 0.5, 4, 10), kurta, 0, 0.9, 0, g);
  mk(new THREE.BoxGeometry(0.42, 0.55, 0.05), toon(0xffffff), 0, 0.8, 0.26, g, 0);        // the apron
  const head = new THREE.Group(); head.position.y = 1.5; g.add(head);
  mk(new THREE.SphereGeometry(0.25, 16, 12), skin, 0, 0, 0, head);
  mk(new THREE.SphereGeometry(0.26, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2.1), toon(0x1a1414), 0, 0.04, -0.02, head, 0);
  for (const s of [-1, 1]) { mk(new THREE.SphereGeometry(0.035, 6, 4), ink, 0.09 * s, 0.03, 0.23, head, 0); mk(new THREE.CapsuleGeometry(0.03, 0.08, 3, 6), toon(0x1a1414), 0.06 * s, -0.08, 0.23, head, 0).rotation.z = Math.PI / 2 + 0.3 * s; }
  const arms = [-1, 1].map((s) => { const a = new THREE.Group(); a.position.set(0.32 * s, 1.15, 0); g.add(a); mk(new THREE.CapsuleGeometry(0.08, 0.38, 4, 8), kurta, 0, -0.22, 0, a); return a; });
  const ladle = new THREE.Group(); ladle.position.set(0, -0.45, 0.05); arms[1].add(ladle);
  mk(new THREE.CylinderGeometry(0.025, 0.025, 0.7), toon(0x9a9aa8), 0, 0.2, 0.1, ladle, 0).rotation.x = 0.5;
  mk(new THREE.SphereGeometry(0.1, 8, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), toon(0x9a9aa8), 0, -0.1, 0.25, ladle, 0);
  return { g, head, arms };
})();
reshman.state = save.reshman || 'new';
const PARTS = {
  honing: { at: HIVE.clone().add(V3(-1.2, 1, 1.4)), name: 'de wilde honing', hint: 'Wilde honing: boven in de Beuk, bij de bijenkorf. Pas op voor de bijen!', color: 0xffc23d },
  kaneel: { at: V3(T.wilg[0] + 1.5, top('wilg') + 1, T.wilg[1] - 1.5), name: 'de boomkaneel', hint: 'Boomkaneel: boven op de Wilg zit een losse plak schors. Stamp erop (Shift in de lucht)!', color: 0xa86a3a, hidden: true },
  peper: { at: DWAAL_END.clone().add(V3(-0.8, 1, -0.6)), name: 'de mistpeper', hint: 'Mistpeper: die groeit ergens diep in de mist. Volg het dwaallicht maar.', color: 0xe0443a },
};
const JAR = { honing: 0, kaneel: 1, peper: 2 };
const partObjs = Object.entries(PARTS).map(([k, p]) => {
  const g = new THREE.Group(); scene.add(g); g.position.copy(p.at);
  if (k === 'honing') { mk(new THREE.CylinderGeometry(0.25, 0.22, 0.45, 12), toon(0xffc23d), 0, 0, 0, g); mk(new THREE.CylinderGeometry(0.27, 0.27, 0.08, 12), toon(0x8a5a2a), 0, 0.25, 0, g, 0); }
  else if (k === 'kaneel') { for (let i = 0; i < 3; i++) mk(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 8), toon(p.color), (i - 1) * 0.12, 0, 0, g, 1.15).rotation.z = 0.3; }
  else { const c = mk(new THREE.ConeGeometry(0.12, 0.5, 8), toon(p.color), 0, 0, 0, g); c.rotation.z = 2.6; mk(new THREE.CylinderGeometry(0.03, 0.03, 0.15), toon(0x5aa83a), 0.15, 0.22, 0, g, 0); }
  g.add(new THREE.PointLight(p.color, 4, 5, 2));
  return { k, g };
});
const partsLeft = () => Object.keys(PARTS).filter((k) => !save.parts.includes(k));
// the loose bark on the Wilg: stamp on it and the cinnamon falls out
const BARK = V3(T.wilg[0] + 1.5, top('wilg'), T.wilg[1] - 1.5);
const barkFlap = mk(new THREE.BoxGeometry(1.6, 0.25, 1.2), toon(0x8a5a32), BARK.x, BARK.y + 0.12, BARK.z, scene);
let kaneelOut = save.parts.includes('kaneel') || !!save.kaneelOut;
export function poundNPC(at) {
  if (kaneelOut || Math.hypot(at.x - BARK.x, at.z - BARK.z) > 1.6 || Math.abs(at.y - BARK.y) > 1) return;
  kaneelOut = true; save.kaneelOut = true; persist(); sfx.crate(); puff(BARK.clone().add(V3(0, 0.4, 0)), 14, 0xa86a3a, 3, 1);
  toast('KRAK! De losse schors springt open. Er rolt boomkaneel uit!');
}
addSpeaker(reshman.g, { y: 2.2, radius: 6, linger: 14, lines: () => {
  if (reshman.state === 'done') return ['Die curry… die vergeet ik nooit meer.', 'Kom terug als je honger hebt! Er is altijd curry.'];
  if (reshman.state === 'new') return ['Namaste! Hé! Jullie daar!', 'Kom eens proeven… nou ja, er is nog niks te proeven.'];
  const left = partsLeft();
  if (!left.length) return ['Je hebt ze alle drie! Kom gauw hier, dan ga ik koken!'];
  return [`Nog ${left.length} ingrediënt${left.length > 1 ? 'en' : ''}…`, ...left.map((k) => PARTS[k].hint)];
} });

// ---------- animals to copy ----------
function flyer(g) {
  const tail = squirrel(g, 0x8a7a6a);
  const skin = [-1, 1].map((s) => { const m = mk(new THREE.BoxGeometry(0.35, 0.04, 0.5), toon(0xa89a8a), 0.3 * s, 0.4, 0, g, 0); return m; });
  return (t) => { skin.forEach((m, i) => (m.rotation.z = (i ? -1 : 1) * (0.2 + Math.sin(t * 2) * 0.15))); tail.rotation.x = -0.4 + Math.sin(t * 3) * 0.2; };
}
function scampi(g) { const tail = squirrel(g); return (t) => { tail.rotation.x = -0.4 + Math.sin(t * 5) * 0.25; g.position.y = g.userData.y0 + Math.max(0, Math.sin(t * 2.5)) * 0.15; }; }
function frog(g) {
  const grn = toon(0x5ad84a);
  mk(new THREE.SphereGeometry(0.3, 12, 10), grn, 0, 0.28, 0, g).scale.set(1.1, 0.8, 1);
  for (const s of [-1, 1]) { mk(new THREE.SphereGeometry(0.11, 8, 6), toon(0xff5a3a), 0.15 * s, 0.5, 0.15, g, 0); mk(new THREE.SphereGeometry(0.05, 6, 4), ink, 0.15 * s, 0.53, 0.24, g, 0); mk(new THREE.SphereGeometry(0.1, 6, 4), toon(0xff9a4a), 0.28 * s, 0.05, 0.25, g, 0); }
  return (t) => { g.position.y = g.userData.y0 + Math.max(0, Math.sin(t * 2.7)) * 0.6; };
}
function beetle(g) {
  const sh = toon(0x3a2a5a);
  mk(new THREE.SphereGeometry(0.45, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2), sh, 0, 0.12, 0, g).scale.set(1, 0.9, 1.3);
  mk(new THREE.SphereGeometry(0.22, 10, 8), sh, 0, 0.2, 0.55, g);
  const horn = mk(new THREE.ConeGeometry(0.08, 0.5, 6), toon(0x2a1a3a), 0, 0.42, 0.75, g, 0); horn.rotation.x = 0.6;
  return (t) => { horn.rotation.x = 0.6 + Math.sin(t * 1.5) * 0.15; };
}
function firefly(g) {
  mk(new THREE.SphereGeometry(0.16, 8, 6), toon(0x3a3a2a), 0, 0.9, 0, g, 0);
  mk(new THREE.SphereGeometry(0.2, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffa0 }), 0, 0.8, -0.2, g, 0);
  g.add(new THREE.PointLight(0xffff8a, 4, 6, 2));
  return (t) => { g.position.y = g.userData.y0 + Math.sin(t * 2.2) * 0.4; g.position.x = g.userData.x0 + Math.sin(t * 0.9) * 0.6; };
}
const KINDS = {
  grijp: { name: 'Eekhoorn', make: scampi, lines: ['*krrt krrt* (de eekhoorn rent zomaar recht tegen de boom op)'] },
  zweef: { name: 'Vliegende eekhoorn', make: flyer, lines: ['*wiiie!* (hij spreidt zijn vel en zweeft)'] },
  veer: { name: 'Boomkikker', make: frog, lines: ['*kwak!* *boing*'] },
  zwaar: { name: 'Neushoornkever', make: beetle, lines: ['*bzzzrm* (hij kan honderd keer zijn eigen gewicht tillen)'] },
  gloei: { name: 'Vuurvliegje', make: firefly, lines: ['*bliep bliep*'] },
};
const A = ARENA;
const ANIMALS = [
  ['grijp', -3, 0, 60, 2.4], ['grijp', T.kast[0] + 2, top('kast'), T.kast[1] - 3, 0.5], ['grijp', MAM_DECK.x - 1, 26, MAM_DECK.z + 1, -0.8], ['grijp', T.wilg[0] - 2, top('wilg'), T.wilg[1] + 1.5, -1.2],
  ['grijp', T.berk[0] + 1.6, top('berk'), T.berk[1] + 1.2, 2], ['grijp', 14, 0, -16, 1], ['grijp', -26, 0, 20, 1.5],
  ['zweef', A.x, A.y, A.z - 9.5, 0], ['zweef', T.den[0] - 1.2, top('den'), T.den[1] - 1.4, 1.2],
  ['veer', DEN_LEDGE.x + 1.5, 18, DEN_LEDGE.z - 2.5, -1.5], ['zwaar', 20, 0, 50, -0.5], ['gloei', -48, 0, 30, 0],
];
const animals = ANIMALS.map(([ab, x, y, z, yaw]) => {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = yaw; g.userData.y0 = y; g.userData.x0 = x; scene.add(g);
  const K = KINDS[ab], tick = K.make(g);
  scannables.push({ name: K.name, ability: ab, obj: g, offset: V3(0, 1.2, 0) });
  addSpeaker(g, { y: 1.5, radius: 3.5, linger: 8, lines: K.lines });
  return { g, tick };
});

// ---------- Bonk, after the fight ----------
addSpeaker(bonk, { y: 4.4, radius: 7, linger: 12, lines: () => (boss.state === 'dead'
  ? ['Kayo & Yara betaalden me in noten. Rotte noten. Ik had het kunnen weten.', 'Hun basis zit boven in de Gladde Boom. Ik heb er gaatjes in gepikt: nu kun je erop klimmen.', 'Ze zijn er niet, hoor. Ze zijn al weg. Maar ze lieten wel iets liggen…']
  : ['TOK TOK TOK. Bouwplaats! Verboden toegang!']) });

// ---------- talking ----------
const lastP = V3();
function who(p) {
  if (p.distanceTo(reshman.g.position) < 3.4 && (reshman.state === 'new' || (reshman.state === 'search' && !partsLeft().length))) return 'reshman';
  return trialWho(p);
}
export function nearMilo(p) { return !!who(p); }
export const npcPrompt = () => { const w = who(lastP); return w === 'reshman' ? 'praten met Reshman' : trialPrompt(w); };
export function talk() {
  const w = who(lastP);
  if (w === 'reshman') reshmanTalk();
  else trialTalk(w);
}
function reshmanTalk() {
  const R = reshman.g.position, K = KITCHEN;
  const cam = shot(V3(R.x + 2.4, R.y + 1.8, R.z + 3.4), V3(R.x, R.y + 1.2, R.z));
  if (reshman.state === 'new') {
    play([
      { say: { who: 'RESHMAN', text: 'Namaste! Een raket, midden in mijn keuken! Welkom! Ik ben Reshman. Kok. Reiziger. Curry-zoeker.' }, cam },
      { say: { who: 'RESHMAN', text: 'Ik reis door de hele melkweg op zoek naar de beste ingrediënten. En dit woud… dit woud heeft de allerbeste.' }, cam: shot(V3(R.x + 6, R.y + 4, R.z + 8), V3(T.kast[0], 20, T.kast[1])) },
      { say: { who: 'RESHMAN', text: 'Wilde honing. Boomkaneel. En mistpeper, die alleen diep in de mist groeit. Met die drie maak ik de curry van mijn leven.' }, cam },
      { say: { who: 'RESHMAN', text: 'Alleen… ze groeien hoog in de bomen. En ik? Ik kan niet klimmen. Ik heb het geprobeerd. Mijn knieën ook.' }, cam },
      { say: { who: BYTE(), text: 'De eekhoorns klimmen overal tegenop. Als ik er een scan, kan Josh dat misschien ook!' }, cam },
      { say: { who: 'RESHMAN', text: 'Ja! Maar alleen waar de schors ruw is, of waar klimop groeit. Op gladde schors glijden zelfs de eekhoorns eraf.' }, cam },
      { say: { who: 'RESHMAN', text: 'En pas op voor die specht. Hij hakt de hele dag gaten in de Mammoetboom. TOK TOK TOK. Ik word er gek van.' }, cam },
    ], () => { reshman.state = 'search'; save.reshman = 'search'; persist(); toast('Scan een eekhoorn (E) voor Grijp, en zoek de drie ingrediënten.'); });
  } else {
    play([
      { say: { who: 'RESHMAN', text: 'Honing! Kaneel! Mistpeper! Alle drie! Achteruit, achteruit, de chef gaat koken!' }, cam },
      {
        dur: 3.4, say: { who: 'RESHMAN', text: '*sist* *roert* *proeft* …nog een snufje… *roert*' },
        start() { sfx.click(); setTimeout(() => sfx.pop(), 700); setTimeout(() => sfx.pop(), 1500); setTimeout(() => sfx.chime(), 2600); },
        update(dt, k) { if (Math.random() < 0.7) puff(V3(K.x + (Math.random() - 0.5) * 0.8, 1.5, K.z + (Math.random() - 0.5) * 0.8), 1, [0xffc23d, 0xe0443a, 0xf4ecd8][Math.floor(k * 12) % 3], 1, 2); },
        cam: shot(V3(K.x + 2, 2.6, K.z + 2.6), V3(K.x, 1.2, K.z)),
      },
      { say: { who: 'RESHMAN', text: 'Proef maar. Allebei. Ook de hond.' }, cam },
      { say: { who: 'OTIS', text: '*slurp* …… WOEF!!! *rent drie rondjes om de raket*', sub: `${LOOK.droneName || 'Byte'} vertaalt: “HEET! Heet heet heet! …Mag ik nog een bordje?”` }, cam: shot(V3(K.x - 3, 2, K.z + 5), V3(K.x - 3, 0.6, K.z + 1)), start() { sfx.fanfare(); if (ctx) ctx.shake(0.3); } },
      { say: { who: 'RESHMAN', text: 'Dit is hem. De curry van mijn leven. Hier: dit lag onder in mijn kruidenkist. Het gloeit. Net als die peper.' }, cam },
    ], () => { reshman.state = 'done'; save.reshman = 'done'; persist(); addCookie(R.x - 1.4, 1.2, R.z + 1.4, COOKIE_CURRY); });
  }
}

// ---------- every frame ----------
export function updateNPCs(dt, t, p) {
  lastP.copy(p);
  // Reshman stirs his pot, or waves when you come close
  const near = p.distanceTo(reshman.g.position) < 6;
  reshman.arms[0].rotation.z = near ? 2.4 + Math.sin(t * 8) * 0.3 : 0;
  reshman.arms[1].rotation.x = -0.9 + Math.sin(t * 3) * 0.3;
  reshman.g.rotation.y = near ? Math.atan2(p.x - reshman.g.position.x, p.z - reshman.g.position.z) : Math.atan2(KITCHEN.x - reshman.g.position.x, KITCHEN.z - reshman.g.position.z);
  barkFlap.rotation.z = kaneelOut ? 0.9 : 0; barkFlap.position.x = BARK.x + (kaneelOut ? 0.6 : 0);
  for (const o of partObjs) {
    const got = save.parts.includes(o.k), hidden = PARTS[o.k].hidden && !kaneelOut;
    o.g.visible = !got && !hidden;
    if (!o.g.visible) continue;
    o.g.position.y = PARTS[o.k].at.y + Math.sin(t * 2) * 0.12; o.g.rotation.y = t * 1.6;
    if (p.clone().add(V3(0, 0.8, 0)).distanceTo(o.g.position) < 1.4) {
      save.parts.push(o.k); persist(); sfx.cosmic(); puff(o.g.position.clone(), 18, PARTS[o.k].color, 4, 2);
      fillJar(JAR[o.k], PARTS[o.k].color);
      const left = partsLeft();
      toast(left.length ? `Je hebt ${PARTS[o.k].name}! Nog ${left.length} voor Reshman.` : `Je hebt ${PARTS[o.k].name}! Breng ze naar Reshman.`);
    }
  }
  for (const a of animals) a.tick(t);
}

// back after a refresh
export function restoreNPCs(s, gotSet) {
  restoreTrials(s, gotSet);
  for (const k of save.parts) fillJar(JAR[k], PARTS[k].color);
  if (save.reshman === 'done' && !gotSet.has(COOKIE_CURRY)) addCookie(reshman.g.position.x - 1.4, 1.2, reshman.g.position.z + 1.4, COOKIE_CURRY);
}
