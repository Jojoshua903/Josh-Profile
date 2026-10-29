import { THREE, scene, toon, addOutline, V3, damp, puff, toast } from './core.js?v=sub1';
import { addCookie } from './cookies.js?v=sub1';
import { addSpeaker } from './bubbles.js?v=sub1';
import { getSave } from './save.js?v=sub1';
import { groundAt, PLATEAU_H } from './berg-terrain.js?v=sub1';
import { RACE_PATH, RACE_FLAG, KID_ROCK, BUTTON, boxes, syncBox } from './berg-world.js?v=sub1';
import { play, shot, cs } from './cutscene.js?v=sub1';
import { LOOK } from './ui.js?v=sub1';
import { boss } from './berg-boss.js?v=sub1';

// The mountain goats: they live here, chat when you walk by, and drop hints about what's hidden.
// Three of them have a little challenge that ends in a cosmic cookie.
export const scannables = [];
export const dialog = { active: false };
export const PENDING_RARE = 6;          // Sjaak's race, the lost kid, the snowflakes, the crate under the rim, the Lawinereus, Daniel
export const npcEvents = { onChange() {} };
export const miloTalked = () => false;
export const guideDone = () => false;
const { save, persist } = getSave('berg');

const ink = new THREE.MeshBasicMaterial({ color: 0x2b2440 });
const mk = (geo, mat, x, y, z, parent, ol = 1.08) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true;
  if (ol) addOutline(m, ol); parent.add(m); return m;
};
const white = toon(0xf4f1ea), horn = toon(0x9c8266), hoof = toon(0x4a3c3a);
const goats = [];
function makeGoat(x, z, { y = null, scale = 1, fur = white, helmet = false, scarf = null, lines = [], talk = true } = {}) {
  const root = new THREE.Group(); root.position.set(x, y ?? groundAt(x, z, 0), z); scene.add(root);
  const body = new THREE.Group(); body.scale.setScalar(scale); root.add(body);
  mk(new THREE.CapsuleGeometry(0.28, 0.5, 6, 12), fur, 0, 0.62, 0, body).rotation.x = Math.PI / 2;
  const legs = [[-0.15, 0.25], [0.15, 0.25], [-0.15, -0.25], [0.15, -0.25]].map(([lx, lz]) => {
    const p = new THREE.Group(); p.position.set(lx, 0.45, lz); body.add(p);
    mk(new THREE.CylinderGeometry(0.06, 0.05, 0.4, 8), fur, 0, -0.2, 0, p);
    mk(new THREE.CylinderGeometry(0.06, 0.07, 0.08, 8), hoof, 0, -0.42, 0, p, 0);
    return p;
  });
  const head = new THREE.Group(); head.position.set(0, 0.95, 0.42); body.add(head);
  mk(new THREE.BoxGeometry(0.26, 0.28, 0.38), fur, 0, 0, 0.06, head);
  [-1, 1].forEach((s) => {
    const h = mk(new THREE.ConeGeometry(0.05, 0.32, 6), horn, 0.08 * s, 0.22, -0.04, head);
    h.rotation.set(-0.7, 0, -0.25 * s);
    const ear = mk(new THREE.BoxGeometry(0.16, 0.05, 0.08), fur, 0.18 * s, 0.07, -0.02, head, 0);
    ear.rotation.z = 0.4 * s;
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), ink); e.position.set(0.1 * s, 0.05, 0.2); head.add(e);
  });
  mk(new THREE.ConeGeometry(0.06, 0.18, 6), toon(0xd9d2c4), 0, -0.2, 0.16, head, 0).rotation.x = Math.PI;   // beard
  if (helmet) {
    mk(new THREE.SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon(0xffd166), 0, 0.12, 0.02, head, 1.06);
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff1b0 })); l.position.set(0, 0.22, 0.2); head.add(l);
  }
  if (scarf) mk(new THREE.TorusGeometry(0.17, 0.06, 6, 14), toon(scarf), 0, 0.85, 0.32, body, 0).rotation.x = Math.PI / 2 - 0.3;
  const g = { root, body, head, legs, home: root.position.clone(), t: Math.random() * 5, hop: 0, vy: 0, run: 0, busy: false };
  if (talk) g.speaker = addSpeaker(root, { y: 1.8 * scale + 0.2, radius: 5.5, linger: 14, lines });
  goats.push(g);
  return g;
}
const face = (g, x, z, k) => {
  const dy = Math.atan2(x - g.root.position.x, z - g.root.position.z) - g.root.rotation.y;
  g.root.rotation.y += Math.atan2(Math.sin(dy), Math.cos(dy)) * k;
};

// ---------- de tipgevers ----------
makeGoat(-14, 38, { lines: [
  'Mèèh. Welkom in het dal.',
  'Drie wegen naar de top: door het bos, door de mijn, of over de oostkam. Kies maar.',
  'Ik kijk soms over de rand, achter de tenten. Daar gloeit iets. Mèèh.',
] });
makeGoat(-11, 3, { lines: [
  'Al dat water komt van de waterval daarginds.',
  'Wat er áchter de waterval zit? Geen idee. Geiten worden niet graag nat.',
  'Mèèh. *drinkt*',
] });
makeGoat(-46, -40, { y: null, lines: [
  'Klimmen, klimmen, klimmen. Mèèh.',
  'Zie je die losse rots daar in de lucht? Daar kom je alleen met een lange sprong.',
  'Rennen, Shift, spatie. Zo doen wij geiten dat. Nou ja… ongeveer.',
] });
makeGoat(36, -23, { helmet: true, lines: [
  'Welkom in de mijn. Helm op! O, jij hebt geen helm.',
  'Het karretje stopt nooit. Spring er op tijd op… en op tijd weer af.',
  'Boven het gat hangt al jaren een kosmisch koekje. Niemand durft. Mèèh.',
  'Dat ijzererts verderop maakt je loodzwaar. Zwaar genoeg voor die gebarsten muur bij de ingang…',
] });
makeGoat(8, -36, { y: PLATEAU_H, lines: [
  'Alle wegen komen hier uit. De top is daar, bij het paarse licht!',
  'De gletsjer kraakt. Op één plek gloeit het ijs.',
  'Als je daar heel hard op stampt… Mèèh. Ik zeg niks.',
] });
const TOP_BEFORE = [
  'Ssst! Daarboven slaapt de Lawinereus.',
  'Hij rolt zich op tot een sneeuwbal zo groot als een tent. En dan rolt hij achter je aan. Mèèh.',
  'Hij draait slecht. Ren langs een rotspilaar en laat hem ertegenaan knallen. Dan ligt hij op zijn rug…',
];
const TOP_AFTER = [
  'Mèèh! Je hebt hem verslagen! De top is weer van iedereen.',
  'Zie je dat eilandje achter de top? Daar kom je alleen zwevend. Vraag het de arend maar.',
  'Ik woon hier al honderd jaar. In geitenjaren. Dat is… ook honderd.',
];
makeGoat(9.5, -67, { scarf: 0xff5a36, lines: () => (boss.state === 'dead' ? TOP_AFTER : TOP_BEFORE) });
makeGoat(-6, -20, { y: PLATEAU_H, lines: [
  'Zie je die wolk daar boven het dal? Er ligt iets paars op.',
  'De arenden zweven er zo naartoe. Wij geiten kunnen dat niet. Mèèh.',
  'Er woont er één onderaan de klifwand, aan de rand van het bos.',
] });

// ---------- de zweefarenden: Byte can copy how they glide ----------
const feather = toon(0x7a5a40), featherLight = toon(0xe9dccb), beak = toon(0xffc23d);
const eagles = [];
function eagle(x, z, yaw) {
  const root = new THREE.Group(); root.position.set(x, groundAt(x, z, 0), z); root.rotation.y = yaw; scene.add(root);
  mk(new THREE.CylinderGeometry(0.12, 0.16, 0.5, 8), toon(0x6b6f7e), 0, 0.25, 0, root);     // perch
  const bird = new THREE.Group(); bird.position.y = 0.55; root.add(bird);
  mk(new THREE.CapsuleGeometry(0.22, 0.35, 6, 10), feather, 0, 0.32, 0, bird).rotation.x = 0.3;
  const head = mk(new THREE.SphereGeometry(0.17, 10, 8), featherLight, 0, 0.72, 0.1, bird);
  mk(new THREE.ConeGeometry(0.06, 0.18, 6), beak, 0, -0.03, 0.18, head, 0).rotation.x = Math.PI / 2;
  [-1, 1].forEach((s) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 5), ink); e.position.set(0.08 * s, 0.04, 0.13); head.add(e); });
  const wings = [-1, 1].map((s) => {
    const p = new THREE.Group(); p.position.set(0.2 * s, 0.45, 0); bird.add(p);
    mk(new THREE.BoxGeometry(0.1, 0.5, 0.35), feather, 0.03 * s, -0.15, -0.05, p, 1.05);
    return { p, s };
  });
  eagles.push({ root, bird, head, wings, t: Math.random() * 5 });
  scannables.push({ name: 'Zweefarend', ability: 'zweef', obj: root, offset: V3(0, 1.6, 0) });
  addSpeaker(root, { y: 1.7, radius: 4, linger: 20, lines: ['*krijs*', '*kijkt je streng aan*', '*spreidt de vleugels en zweeft even op de wind*'] });
}
eagle(-11, -67.5, 2.6);
eagle(-44, -27, 0.4);
// ---------- het ijzererts in de mijn: copying it makes Josh heavy ----------
const ore = new THREE.Group(); ore.position.set(41, 0, -5.5); scene.add(ore);
{
  const dark = toon(0x4a4440), glow = new THREE.MeshBasicMaterial({ color: 0xff8a3d });
  for (const [x, y, z, s] of [[0, 0.45, 0, 0.6], [0.5, 0.3, 0.4, 0.4], [-0.45, 0.3, 0.3, 0.42], [0.1, 0.95, -0.1, 0.35]]) {
    const r = mk(new THREE.DodecahedronGeometry(s, 0), dark, x, y, z, ore, 1.06); r.rotation.set(x * 3, z * 3, y);
  }
  for (const [x, y, z] of [[0.3, 0.7, 0.4], [-0.3, 0.55, 0.55], [0.15, 1.2, 0.15], [0.6, 0.5, 0.65]]) {
    const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.12), glow); c.position.set(x, y, z); ore.add(c);
  }
  const light = new THREE.PointLight(0xff8a3d, 5, 5, 2); light.position.set(0, 1, 0.6); ore.add(light);
}
scannables.push({ name: 'IJzererts', ability: 'zwaar', obj: ore, offset: V3(0, 1.4, 0.4) });

// ---------- de berghaas op de oostkam: copying it makes Josh fast ----------
const hare = { root: new THREE.Group(), home: V3(56, 14, 10), t: 0, hop: 0, target: V3(56, 14, 10) };
{
  const fur = toon(0xc9a27a), belly = toon(0xf4ead8);
  const r = hare.root; r.position.copy(hare.home); scene.add(r);
  hare.body = new THREE.Group(); r.add(hare.body);
  mk(new THREE.SphereGeometry(0.28, 12, 10), fur, 0, 0.3, 0, hare.body).scale.set(0.9, 0.85, 1.2);
  mk(new THREE.SphereGeometry(0.17, 10, 8), belly, 0, 0.27, 0.15, hare.body, 0);
  const head = mk(new THREE.SphereGeometry(0.17, 10, 8), fur, 0, 0.55, 0.28, hare.body);
  [-1, 1].forEach((s) => {
    const ear = mk(new THREE.CapsuleGeometry(0.05, 0.3, 4, 8), fur, 0.07 * s, 0.28, -0.04, head, 1.1); ear.rotation.set(-0.3, 0, 0.15 * s);
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 5), ink); e.position.set(0.09 * s, 0.04, 0.13); head.add(e);
  });
  mk(new THREE.SphereGeometry(0.09, 8, 6), belly, 0, 0.32, -0.32, hare.body, 0);      // tail
}
scannables.push({ name: 'Berghaas', ability: 'haas', obj: hare.root, offset: V3(0, 1.2, 0) });
function updateHare(dt, p) {
  hare.t -= dt;
  const pos = hare.root.position;
  if (hare.t <= 0) {
    hare.t = 0.9 + Math.random() * 1.6;
    const a = Math.random() * Math.PI * 2, r = Math.random() * 4;
    hare.target.set(hare.home.x + Math.cos(a) * r, hare.home.y, hare.home.z + Math.sin(a) * r);
  }
  const d = V3(hare.target.x - pos.x, 0, hare.target.z - pos.z);
  if (d.length() > 0.2) {
    hare.hop += dt * 9;
    pos.addScaledVector(d.normalize(), Math.min(d.length(), 3 * dt));
    hare.root.rotation.y = Math.atan2(d.x, d.z);
    hare.body.position.y = Math.abs(Math.sin(hare.hop)) * 0.35;
  } else hare.body.position.y *= 1 - damp(10, dt);
  pos.y = groundAt(pos.x, pos.z, 0);
}

function updateEagles(dt, t) {
  for (const e of eagles) {
    e.t += dt;
    const spread = Math.max(0, Math.sin(e.t * 0.5) - 0.7) / 0.3;     // now and then it spreads its wings
    e.wings.forEach(({ p, s }) => (p.rotation.z = s * spread * 1.4));
    e.bird.position.y = 0.55 + spread * 0.08;
    e.head.rotation.y = Math.sin(e.t * 0.8) * 0.8;
  }
}

// ---------- Sjaak: race him to the flag in the forest ----------
const RACE_NAME = 'Sneller dan Sjaak';
const race = { state: 'idle', t: 0, seg: 0, done: false };
// line sets are fixed arrays so a goat keeps cycling through them instead of restarting every time
const SJAAK_DONE = ['Mèèh… jij bent echt snel. Respect.', 'Volgend jaar win ik. Ik train elke dag. Nou ja, elke week.'];
const SJAAK_IDLE = ['Ik ben Sjaak, de snelste geit van de berg!', 'Race je mee naar de vlag in het bos? Druk op E.', 'Niemand heeft mij ooit verslagen. Mèèh.'];
const NONE = [];
const sjaak = makeGoat(RACE_PATH[0].x, RACE_PATH[0].z, { fur: toon(0xc9a27a), scarf: 0x14b8a6, lines: () =>
  race.done ? SJAAK_DONE : race.state === 'idle' ? SJAAK_IDLE : NONE });
sjaak.root.rotation.y = -Math.PI / 2;
{ // finish flag
  const p = RACE_FLAG.clone(); p.y = groundAt(p.x, p.z, 0);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 3), toon(0x3a3e4e)); pole.position.set(p.x, p.y + 1.5, p.z); scene.add(pole);
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8), new THREE.MeshBasicMaterial({ color: 0x14b8a6, side: THREE.DoubleSide }));
  cloth.position.set(p.x + 0.6, p.y + 2.6, p.z); scene.add(cloth);
  race.cloth = cloth; RACE_FLAG.y = p.y;
}
function resetSjaak() {
  race.state = 'idle'; race.seg = 0;
  sjaak.root.position.copy(RACE_PATH[0]); sjaak.root.position.y = groundAt(RACE_PATH[0].x, RACE_PATH[0].z, 0);
  sjaak.home.copy(sjaak.root.position); sjaak.root.rotation.y = -Math.PI / 2; sjaak.busy = false;
}
function raceWon(silent = false) {
  race.done = true; race.state = 'done';
  sjaak.root.position.set(RACE_FLAG.x + 1.6, RACE_FLAG.y, RACE_FLAG.z + 1); sjaak.home.copy(sjaak.root.position); sjaak.busy = false;
  if (!silent) { save.race = true; persist(); }
}
const prize = (x, y, z, name) => { addCookie(x, y, z, name); puff(V3(x, y, z), 18, 0xb79cff, 4, 2); };
function updateRace(dt, p) {
  if (race.state === 'count') {
    const before = Math.ceil(race.t);
    race.t -= dt;
    if (Math.ceil(race.t) !== before && race.t > 0) toast(String(Math.ceil(race.t)));
    if (race.t <= 0) { race.state = 'run'; race.seg = 1; toast('Go! Naar de vlag in het bos!'); sjaak.speaker.say('Mèèh! Doei!', 1.5); }
  }
  if (race.state === 'run') {
    const tgt = RACE_PATH[race.seg], pos = sjaak.root.position;
    const d = Math.hypot(tgt.x - pos.x, tgt.z - pos.z), step = 6.1 * dt;
    if (d <= step) race.seg++;
    else { pos.x += (tgt.x - pos.x) / d * step; pos.z += (tgt.z - pos.z) / d * step; }
    face(sjaak, tgt.x, tgt.z, damp(10, dt));
    const g = groundAt(pos.x, pos.z, 0.2);
    if (g > pos.y + 0.3) { sjaak.vy = 7; sjaak.hop = 1; pos.y = g; } else pos.y += (g - pos.y) * damp(12, dt);
    sjaak.run = 1;
    if (Math.hypot(p.x - RACE_FLAG.x, p.z - RACE_FLAG.z) < 3 && Math.abs(p.y - RACE_FLAG.y) < 2.5) {
      raceWon();
      toast('Gewonnen! Sjaak is verslagen!');
      prize(RACE_FLAG.x, RACE_FLAG.y + 2.2, RACE_FLAG.z, RACE_NAME);
      setTimeout(() => sjaak.speaker.say('Mèèh?! Hoe dan?! Oké… dit koekje is voor jou.', 3.5), 600);
    } else if (race.seg >= RACE_PATH.length) {
      race.state = 'lost'; race.t = 3; sjaak.run = 0;
      sjaak.speaker.say('Mèèh! Te traag! Kom maar terug naar de start als je nog een keer wil.', 3.5);
      toast('Sjaak was eerder bij de vlag');
    }
  }
  if (race.state === 'lost') { race.t -= dt; if (race.t <= 0) { puff(sjaak.root.position.clone(), 8, 0xffffff, 2, 1); resetSjaak(); } }
  if (race.state !== 'run') sjaak.run = 0;
}

// ---------- Moeder Mie and her kid, who climbed somewhere high in the forest ----------
const KID_NAME = 'Geitje terug bij mama';
const kidState = { found: false };
const MOM = V3(-40, 6, 8);
const MOM_AFTER = ['Dankjewel! Ze klimt al sinds ze kan lopen.', 'Mèèh. Nu even een dutje. Voor mij dan.'];
const MOM_BEFORE = ['Mèèh… heb jij mijn geitje gezien?', 'Ze klimt altijd ergens hoog. Ergens in het bos, denk ik.', 'Ze is klein en ze zegt alleen maar “mèh”. Met één è.'];
makeGoat(MOM.x, MOM.z, { fur: toon(0xe9dccb), lines: () => (kidState.found ? MOM_AFTER : MOM_BEFORE) });
const kid = makeGoat(KID_ROCK.x, KID_ROCK.z, { y: KID_ROCK.y, scale: 0.55, lines: ['Mèh!', 'Mèh mèh!', '*durft niet naar beneden*'] });
function kidHome(silent = false) {
  kidState.found = true;
  kid.root.position.set(MOM.x + 1.1, MOM.y, MOM.z + 0.9); kid.home.copy(kid.root.position);
  if (!silent) { save.kid = true; persist(); }
}
function updateKid(p) {
  if (kidState.found) return;
  if (p.distanceTo(kid.root.position) < 1.8) {
    puff(kid.root.position.clone().add(V3(0, 0.4, 0)), 10, 0xffffff, 3, 2);
    kidHome();
    puff(kid.root.position.clone().add(V3(0, 0.4, 0)), 10, 0xffffff, 3, 2);
    toast('Mèh! Het geitje springt terug naar mama');
    prize(MOM.x, MOM.y + 2.4, MOM.z, KID_NAME);
  }
}

// ---------- the snowflake button on the east ridge ----------
const FLAKE_NAME = 'Alle sneeuwvlokken';
const FLAKE_TIME = 30;
const flakeSpots = [[40, 0, 14.9], [52, -2], [60, 10], [35, 16], [48, 24], [69, 2, 14.9], [74, -4, 16.7], [58, -11]].map(([x, z, y]) => V3(x, y ?? groundAt(x, z, 0) + 0.9, z));
const flakeMat = new THREE.MeshBasicMaterial({ color: 0xbfeaff });
const flakes = flakeSpots.map((s) => {
  const g = new THREE.Group(); g.position.copy(s); g.visible = false; scene.add(g);
  for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.09, 0.09), flakeMat); b.rotation.z = (i / 3) * Math.PI; g.add(b); }
  return { g, got: false };
});
const fl = { state: 'idle', t: 0, done: false };
const button = new THREE.Group();
{
  const by = groundAt(BUTTON.x, BUTTON.z, 0); BUTTON.y = by;
  button.position.set(BUTTON.x, by, BUTTON.z); scene.add(button);
  mk(new THREE.CylinderGeometry(0.9, 1, 0.16, 20), toon(0x9a948a), 0, 0.08, 0, button, 1.04);
  fl.cap = mk(new THREE.CylinderGeometry(0.6, 0.6, 0.18, 20), toon(0xff5a36), 0, 0.2, 0, button, 1.06);
}
const RIDGE_AFTER = ['Mèèh! Alle acht! Nog nooit gezien.', 'Vanaf hier klim je via de rotsen naar de hoogvlakte.'];
const RIDGE_BEFORE = ['Stap op de rode knop en pak alle sneeuwvlokken voordat ze smelten!', 'Die oude brug naar het oosten brokkelt af zodra je erop stapt. Alleen een haas is snel genoeg.', 'Een paar waaien altijd naar de rotsjes in de lucht. Mèèh.', 'Vanaf hier klim je via de rotsen naar de hoogvlakte.'];
makeGoat(45, 1, { lines: () => (fl.done ? RIDGE_AFTER : RIDGE_BEFORE) });
const timerEl = document.createElement('div');
timerEl.style.cssText = 'position:fixed;top:18px;left:50%;transform:translateX(-50%);padding:8px 16px;border-radius:999px;background:rgba(255,248,236,.92);color:#2b2440;font:800 18px ui-rounded,"Avenir Next",system-ui,sans-serif;box-shadow:0 3px 0 #2b2440;display:none;z-index:6';
document.body.appendChild(timerEl);
function endFlakes() { fl.state = 'idle'; flakes.forEach((f) => (f.g.visible = false)); timerEl.style.display = 'none'; fl.cap.position.y = 0.2; }
function updateFlakes(dt, t, p) {
  if (fl.state === 'idle' && !fl.done && Math.hypot(p.x - BUTTON.x, p.z - BUTTON.z) < 1 && Math.abs(p.y - BUTTON.y - 0.3) < 0.5) {
    fl.state = 'run'; fl.t = FLAKE_TIME; fl.cap.position.y = 0.1;
    flakes.forEach((f) => { f.got = false; f.g.visible = true; puff(f.g.position.clone(), 6, 0xbfeaff, 2, 1); });
    toast('Pak alle 8 sneeuwvlokken!');
  }
  if (fl.state !== 'run') return;
  fl.t -= dt;
  const head = p.clone().add(V3(0, 0.8, 0));
  let left = 0;
  for (const f of flakes) {
    if (f.got) continue;
    f.g.rotation.y = t * 2; f.g.rotation.x = Math.sin(t * 1.3) * 0.4;
    if (f.g.position.distanceTo(head) < 1.2) { f.got = true; f.g.visible = false; puff(f.g.position.clone(), 8, 0xbfeaff, 2.5, 1); continue; }
    left++;
  }
  timerEl.style.display = 'block';
  timerEl.textContent = `❄️ ${8 - left}/8 · ${Math.ceil(fl.t)}s`;
  if (!left) {
    endFlakes(); fl.done = true; save.flakes = true; persist();
    toast('Alle sneeuwvlokken!');
    prize(BUTTON.x, BUTTON.y + 1.8, BUTTON.z, FLAKE_NAME);
  } else if (fl.t <= 0) {
    endFlakes();
    toast('De sneeuwvlokken zijn gesmolten… stap nog eens op de knop');
  }
}

// ---------- Daniel: the mine's blaster. Kayo & Yara stole his fuses and brought the tunnel down ----------
const DANIEL_NAME = 'Daniels grote knal';
const DANIEL_AT = V3(38.2, 0, -9.6);
const ROCKFALL = V3(39, 0, -13);
const dan = { state: 'new', fuses: new Set(), root: new THREE.Group(), t: 0 };
{
  const r = dan.root; r.position.copy(DANIEL_AT); r.rotation.y = Math.PI * 0.85; scene.add(r);
  const skin = toon(0xe8b98f), shirt = toon(0x4a5a70), vest = toon(0xff7a3d), pants = toon(0x3a3e4e), boot = toon(0x2b2440);
  const legs = [-1, 1].map((s) => mk(new THREE.CapsuleGeometry(0.11, 0.42, 4, 8), pants, 0.13 * s, 0.38, 0, r));
  legs.forEach((l) => mk(new THREE.BoxGeometry(0.2, 0.12, 0.3), boot, 0, -0.3, 0.04, l, 0));
  const body = mk(new THREE.CapsuleGeometry(0.26, 0.42, 6, 12), shirt, 0, 1.05, 0, r);
  mk(new THREE.CylinderGeometry(0.29, 0.29, 0.4, 14, 1, true), vest, 0, 0.02, 0, body, 0);
  [-1, 1].forEach((s) => { const a = mk(new THREE.CapsuleGeometry(0.08, 0.42, 4, 8), shirt, 0.36 * s, 1.05, 0.04, r); a.rotation.z = 0.12 * s; });
  dan.head = mk(new THREE.SphereGeometry(0.24, 14, 12), skin, 0, 1.68, 0, r);
  mk(new THREE.SphereGeometry(0.27, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon(0xffd166), 0, 0.06, 0, dan.head, 1.05);
  mk(new THREE.CylinderGeometry(0.33, 0.33, 0.03, 16), toon(0xffd166), 0, 0.06, 0.02, dan.head, 0);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff1b0 })); lamp.position.set(0, 0.2, 0.25); dan.head.add(lamp);
  [-1, 1].forEach((s) => {
    const e = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.03, 0.02), ink); e.position.set(0.09 * s, 0.01, 0.23); dan.head.add(e);     // narrowed, serious eyes
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.025, 0.02), ink); brow.position.set(0.09 * s, 0.07, 0.23); brow.rotation.z = 0.25 * s; dan.head.add(brow);
  });
  // a round black bomb on his belt, and a bag of them next to him
  const bombMat = toon(0x2b2b33);
  const belt = mk(new THREE.SphereGeometry(0.13, 12, 10), bombMat, 0.3, 0.78, 0.12, r, 1.1);
  mk(new THREE.CylinderGeometry(0.02, 0.02, 0.1), toon(0xd9b98a), 0, 0.15, 0, belt, 0);
  for (const [x, z] of [[0.9, 0.3], [1.15, 0.05], [1, -0.25]]) mk(new THREE.SphereGeometry(0.22, 12, 10), bombMat, x, 0.22, z, r, 1.08);
}
const DAN_LINES = {
  new: ['…', 'Niet verder. Instortingsgevaar.', '*kijkt serieus naar het puin*'],
  search: () => [`Nog ${3 - dan.fuses.size} lont${3 - dan.fuses.size === 1 ? '' : 'en'}. Ik wacht hier.`, 'Ik ben goed in wachten.', 'Oranje gloed. Ergens in het dal, op de grond.'],
  ready: ['Je hebt ze alle drie. Goed. Praat met me.'],
  done: ['Graag gedaan. Nee. Jij bedankt. Ik bedoel: bedankt.', 'Die katten zijn met een raketje vertrokken. Vanaf de top. Richting de sterren.', 'Volgende keer neem ik grotere bommen mee. Voor de zekerheid.'],
};
const danLinesNow = () => (dan.state === 'search' ? (dan.searchLines ||= DAN_LINES.search()) : DAN_LINES[dan.state]);
dan.speaker = addSpeaker(dan.root, { y: 2.3, radius: 5, linger: 14, lines: danLinesNow });

// the rockfall that blocks the tunnel into the mine hall
const rockfall = [];
{
  const m = toon(0x7d766d);
  for (const [x, y, z, w, h, d] of [[39, 1.6, -13, 6, 3.2, 2], [39, 4, -13.3, 6, 2, 1.4], [37.2, 0.6, -11.6, 1.6, 1.2, 1], [40.8, 0.5, -11.8, 1.4, 1, 1]]) {
    const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), m);
    mesh.scale.set(w / 1.7, h / 1.7, d / 1.7); mesh.position.set(x, y, z); mesh.castShadow = true; addOutline(mesh, 1.04); scene.add(mesh);
    const b = { pos: V3(x, y, z), half: V3(w / 2, h / 2, d / 2), min: V3(), max: V3(), mesh };
    syncBox(b); boxes.push(b); rockfall.push(b);
  }
}
function clearRockfall() {
  for (const b of rockfall) { scene.remove(b.mesh); const i = boxes.indexOf(b); if (i >= 0) boxes.splice(i, 1); }
}

// the three fuses Kayo & Yara dropped while running off: glowing orange spools outside the mine
const FUSE_SPOTS = [V3(18, 0.9, -10), V3(24, 0.9, 12), V3(5, 0.9, 19)];      // on the valley floor, spread out in front of the mine
block2(28.2, 0.6, 3.2, 1.6, 1.2, 1.4, 0x7a5a40);          // an old broken cart: the step up to the beam over the entrance
solid2(29.8, 5, 0, 0.6, 0.6, 7);                          // and the beam itself
const fuses = FUSE_SPOTS.map((p, i) => {
  const g = new THREE.Group(); g.position.copy(p); scene.add(g);
  const spool = mk(new THREE.CylinderGeometry(0.22, 0.22, 0.26, 14), toon(0x8a5d34), 0, 0, 0, g, 1.1); spool.rotation.z = Math.PI / 2;
  mk(new THREE.TorusGeometry(0.2, 0.06, 6, 16), new THREE.MeshBasicMaterial({ color: 0xff8a3d }), 0, 0, 0, g, 0).rotation.y = Math.PI / 2;
  const l = new THREE.PointLight(0xff8a3d, 4, 5, 2); g.add(l);
  return { g, id: 'f' + i };
});
function block2(x, y, z, w, h, d, col) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(col)); mesh.position.set(x, y, z); mesh.castShadow = true; addOutline(mesh, 1.03); scene.add(mesh);
  solid2(x, y, z, w, h, d);
}
function solid2(x, y, z, w, h, d) { const b = { pos: V3(x, y, z), half: V3(w / 2, h / 2, d / 2), min: V3(), max: V3() }; syncBox(b); boxes.push(b); }

function updateFuses(t, p) {
  const head = p.clone().add(V3(0, 0.8, 0));
  for (const f of fuses) {
    if (dan.fuses.has(f.id)) continue;
    f.g.rotation.y = t * 2; f.g.position.y = FUSE_SPOTS[fuses.indexOf(f)].y + Math.sin(t * 3) * 0.1;
    if (f.g.position.distanceTo(head) < 1.3) {
      dan.fuses.add(f.id); f.g.visible = false; dan.searchLines = null;
      puff(f.g.position.clone(), 12, 0xff8a3d, 3, 1.5);
      save.fuses = [...dan.fuses]; persist();
      const left = 3 - dan.fuses.size;
      toast(left ? `Een lont van Daniel! Nog ${left}` : 'Alle drie de lonten! Terug naar Daniel in de mijn');
      if (!left && dan.state === 'search') dan.state = 'ready';
    }
  }
}
const nearDaniel = (p) => p.distanceTo(dan.root.position) < 3 && dan.state !== 'done' && dan.state !== 'search';
function danielTalk() {
  const BYTE = (LOOK.droneName || 'Byte').toUpperCase();
  const danCam = shot(V3(DANIEL_AT.x - 2.6, 1.9, DANIEL_AT.z + 2.4), V3(DANIEL_AT.x, 1.5, DANIEL_AT.z));
  if (dan.state === 'new') {
    play([
      { say: { who: 'DANIEL', text: 'Stop. Niet verder. Instortingsgevaar.' }, cam: danCam },
      { say: { who: 'DANIEL', text: 'Ik ben Daniel. Ik maak hier tunnels. Met explosieven. Heel voorzichtig.' }, cam: danCam },
      { say: { who: 'DANIEL', text: 'Gisteren kwamen hier twee katten langs. Ze pakten mijn lonten en lieten de tunnel instorten.' }, cam: shot(V3(36, 2.4, -8), V3(39, 1.8, -13)) },
      { say: { who: BYTE, text: 'Twee katten…? Kayo & Yara!' }, cam: danCam },
      { say: { who: 'DANIEL', text: 'Ze renden naar de top. Sindsdien is de Lawinereus wakker. Toeval? Nee.' }, cam: danCam },
      { say: { who: 'DANIEL', text: 'Ze lieten drie lonten vallen in het dal, voor de mijn. Oranje gloed. Breng ze hier, dan blaas ik dit op.' }, cam: danCam },
    ], () => { if (dan.state === 'new') dan.state = dan.fuses.size >= 3 ? 'ready' : 'search'; });
  } else if (dan.state === 'ready') {
    play([
      { say: { who: 'DANIEL', text: 'Drie lonten. Goed. Achteruit. Verder. Nog verder.' }, cam: danCam },
      {
        dur: 1.6, cam: shot(V3(37, 2.2, -4), V3(39, 1.5, -12)),
        start() { dan.root.position.set(39, 0, -11.2); dan.root.rotation.y = Math.PI; },
        update(dt, k) { if (Math.random() < 0.5) puff(V3(39 + (Math.random() - 0.5) * 2, 0.6, -12), 1, 0xff8a3d, 1, 1); },
        finish() { dan.root.position.copy(DANIEL_AT); dan.root.rotation.y = Math.PI * 0.85; },
      },
      {
        dur: 1.4, cam: shot(V3(36, 2.6, -3), V3(39, 2, -13)),
        start() {
          clearRockfall();
          for (let i = 0; i < 4; i++) puff(V3(39 + (Math.random() - 0.5) * 4, 1 + Math.random() * 3, -13), 18, i % 2 ? 0xff8a3d : 0x9a948a, 9, 3);
          if (P_SHAKE) P_SHAKE(0.7);
        },
      },
      { say: { who: 'DANIEL', text: '…Dat was een kleine knal. Voor mijn doen.' }, cam: danCam },
      { say: { who: 'DANIEL', text: 'Hier. Dit lag onder het puin. Het gloeit paars. Ik denk dat jij zoiets verzamelt.' }, cam: danCam },
    ], () => {
      dan.state = 'done'; save.daniel = true; persist();
      prize(39, 1.5, -13, DANIEL_NAME);
    });
  }
}
let P_SHAKE = null;
export const setShake = (f) => (P_SHAKE = f);

// ---------- shared ----------
const nearSjaak = (p) => race.state === 'idle' && !race.done && p.distanceTo(sjaak.root.position) < 3;
export function nearMilo(p) { return nearSjaak(p) || nearDaniel(p); }
export const npcPrompt = () => (dan.state !== 'done' && dan.state !== 'search' && dan.root.position.distanceTo(lastP) < 3 ? 'praten met Daniel' : 'racen tegen Sjaak');
let lastP = V3();
export function talk() {
  if (nearDaniel(lastP)) return danielTalk();
  if (race.state !== 'idle' || race.done) return;
  race.state = 'count'; race.t = 3; sjaak.busy = true;
  sjaak.speaker.say('Klaar voor de start…', 1.5);
  toast('3');
}

export function updateNPCs(dt, t, p) {
  lastP.copy(p);
  updateFuses(t, p);
  {
    const dy = Math.atan2(p.x - dan.root.position.x, p.z - dan.root.position.z) - dan.root.rotation.y;
    if (p.distanceTo(dan.root.position) < 6 && !cs.active) dan.root.rotation.y += Math.atan2(Math.sin(dy), Math.cos(dy)) * damp(3, dt);
  }
  dan.head.rotation.x = Math.sin(t * 0.7) * 0.05;
  updateRace(dt, p);
  updateKid(p);
  updateFlakes(dt, t, p);
  updateEagles(dt, t);
  updateHare(dt, p);
  for (const g of goats) {
    g.t += dt;
    const near = p.distanceTo(g.root.position) < 6;
    if (near && g.run === 0) face(g, p.x, p.z, damp(3, dt));
    const graze = !near && !g.run && Math.sin(g.t * 0.6) > 0.2;
    g.head.rotation.x += ((graze ? 0.9 : 0) - g.head.rotation.x) * damp(4, dt);
    g.head.position.y += ((graze ? 0.75 : 0.95) - g.head.position.y) * damp(4, dt);
    if (graze) g.head.rotation.z = Math.sin(t * 6 + g.home.x) * 0.08;
    if (g.run) g.legs.forEach((l, i) => (l.rotation.x = Math.sin(t * 16 + (i % 2) * Math.PI) * 0.7));
    if (g.hop <= 0 && !g.run && Math.random() < dt * 0.15) { g.vy = 4; g.hop = 1; }
    if (g.hop > 0) {
      g.vy -= 20 * dt; g.body.position.y += g.vy * dt;
      if (!g.run) g.legs.forEach((l, i) => (l.rotation.x = (i < 2 ? -0.6 : 0.6)));
      if (g.body.position.y <= 0) { g.body.position.y = 0; g.hop = 0; g.legs.forEach((l) => (l.rotation.x = 0)); }
    } else if (!g.run) g.legs.forEach((l) => (l.rotation.x *= 1 - damp(10, dt)));
  }
  if (race.cloth) { race.cloth.rotation.y = Math.sin(t * 3) * 0.3; }
}

// back after a refresh: finished challenges stay finished, and an unclaimed prize waits where it appeared
export function restoreNPCs(s, got) {
  if (s.race) { raceWon(true); if (!got.has(RACE_NAME)) addCookie(RACE_FLAG.x, RACE_FLAG.y + 2.2, RACE_FLAG.z, RACE_NAME); }
  if (s.kid) { kidHome(true); if (!got.has(KID_NAME)) addCookie(MOM.x, MOM.y + 2.4, MOM.z, KID_NAME); }
  if (s.flakes) { fl.done = true; if (!got.has(FLAKE_NAME)) addCookie(BUTTON.x, BUTTON.y + 1.8, BUTTON.z, FLAKE_NAME); }
  (s.fuses || []).forEach((id) => { dan.fuses.add(id); const f = fuses.find((q) => q.id === id); if (f) f.g.visible = false; });
  if (s.daniel) { dan.state = 'done'; clearRockfall(); if (!got.has(DANIEL_NAME)) addCookie(39, 1.5, -13, DANIEL_NAME); }
}
