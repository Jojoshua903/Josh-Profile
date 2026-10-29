import { THREE, scene, toon, addOutline, V3, damp, puff } from './core.js?v=sub1';
import { groundAt, pathX } from './terrain.js?v=sub1';
import { addCookie } from './cookies.js?v=sub1';
import { addSpeaker } from './bubbles.js?v=sub1';

export const scannables = [];
const ink = new THREE.MeshBasicMaterial({ color: 0x2b2440 });
const mk = (geo, mat, x, y, z, parent, ol = 1.08) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true;
  if (ol) addOutline(m, ol); parent.add(m); return m;
};

// ---------- Milo, in zijn ton ----------
const MILO_POS = V3(-5, 0, 21);
const milo = { root: new THREE.Group(), body: new THREE.Group(), up: 0, talked: false, line: 0 };
{
  const r = milo.root; r.position.copy(MILO_POS); r.rotation.y = 0.5; scene.add(r);
  const wood = toon(0x7a5434), band = toon(0x3a3e4e);
  mk(new THREE.CylinderGeometry(0.62, 0.55, 1.1, 18), wood, 0, 0.55, 0, r, 1.04);
  for (const y of [0.2, 0.9]) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.04, 6, 24), band); t.rotation.x = Math.PI / 2; t.position.y = y; r.add(t); }
  r.add(milo.body);
  const jacket = toon(0x2c2c36), skin = toon(0xe8b58e), hair = toon(0x1e1a1a);
  mk(new THREE.CapsuleGeometry(0.26, 0.3, 6, 14), jacket, 0, 0.95, 0, milo.body);
  mk(new THREE.SphereGeometry(0.29, 20, 14), skin, 0, 1.55, 0, milo.body, 1.06);
  const quiff = mk(new THREE.SphereGeometry(0.3, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), hair, 0, 1.6, -0.03, milo.body, 1.05);
  quiff.rotation.x = -0.3;
  mk(new THREE.ConeGeometry(0.12, 0.3, 8), hair, 0, 1.92, 0.12, milo.body).rotation.x = 0.9;
  // tough-guy sunglasses, at night, in the fog
  const shades = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.09, 0.05), ink);
  shades.position.set(0, 1.6, 0.27); milo.body.add(shades);
  milo.arms = [-1, 1].map((s) => {
    const p = new THREE.Group(); p.position.set(0.3 * s, 1.15, 0); milo.body.add(p);
    mk(new THREE.CapsuleGeometry(0.08, 0.28, 4, 8), jacket, 0, -0.2, 0, p);
    mk(new THREE.SphereGeometry(0.09, 10, 8), skin, 0, -0.42, 0, p);
    return p;
  });
  milo.body.position.y = -1.2;
}
const MILO_LINES = [
  'W-wie is daar?! …Oh. Gewoon een jongen met een drone. Ik was helemaal niet bang hoor. Ik zat hier gewoon. In een ton.',
  'Ik ben Milo. Welkom op de Mistmaan. Vroeger brandden hier overal lampen, en keek iedereen ’s nachts door de grote telescoop.',
  'Toen kwamen er twee katten. Kayo en Yara. Ze lieten een beest achter dat al het licht opslokt. Sindsdien is er alleen nog mist.',
  'Iedereen is vertrokken. Behalve ik. En de Lichtjes, maar die zijn nog banger dan… eh, die zijn heel verlegen.',
  'Zie je dat rode lampje, ver weg in de mist? Daar staat de telescoop. Daar zit hij. Pad door de mist, door het stadje, de klif op. Je hebt een springmot nodig voor die klif. Die dingen springen hoger dan ik ooit zou durven. Willen. Hoger dan ik zou willen.',
  'Hier. Dit vond ik toen ik… op patrouille was. Ik heb het niet nodig. Ik ben al stoer genoeg.',
];
const MILO_AGAIN = ['Het rode lampje. Volg het rode lampje. De springmot zit ergens in het stadje, bij de klif. Ik bewaak de ton.'];
export const PENDING_RARE = 4;   // Milo, the Lichtje, the alley crate, the boss

export const dialog = { active: false, idx: 0, shown: 0, text: '', lines: [] };
const dEl = document.getElementById('dialog'), dText = document.getElementById('dText'), dWho = document.getElementById('dWho');
export function talk() {
  dWho.textContent = 'MILO';
  if (dialog.active && dialog.shown < dialog.text.length) {      // skip the typing
    dialog.shown = dialog.text.length; dText.textContent = dialog.text; return;
  }
  if (!dialog.active) { dialog.active = true; dialog.lines = milo.talked ? MILO_AGAIN : MILO_LINES; dialog.idx = 0; }
  else dialog.idx++;
  if (dialog.idx >= dialog.lines.length) {
    dialog.active = false; dEl.classList.remove('show');
    if (!milo.talked) {
      milo.talked = true;
      addCookie(MILO_POS.x + 1.4, MILO_POS.y + 1.6, MILO_POS.z + 0.6, 'Milo’s “gevonden” koekje');
      npcEvents.onChange();
    }
    return;
  }
  dialog.text = dialog.lines[dialog.idx];
  dialog.shown = 0; dText.textContent = '';
  dEl.classList.add('show');
}
export function nearMilo(p) { return p.distanceTo(MILO_POS) < 3.2; }

// ---------- de springmot ----------
export const springmot = new THREE.Group();
{
  const g = springmot; g.position.set(4, groundAt(4, -48, 0) + 1.6, -48); g.userData.base = g.position.clone(); scene.add(g);
  const fur = toon(0xc9cde0), coil = toon(0x6fd3ff);
  mk(new THREE.SphereGeometry(0.28, 16, 12), fur, 0, 0.1, 0, g, 1.08);
  [-1, 1].forEach((s) => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), ink); e.position.set(0.1 * s, 0.17, 0.24); g.add(e);
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3), ink);
    ant.position.set(0.1 * s, 0.45, 0.05); ant.rotation.z = -0.3 * s; g.add(ant);
  });
  for (let i = 0; i < 4; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.03, 6, 16), coil); t.rotation.x = Math.PI / 2; t.position.y = -0.22 - i * 0.09; g.add(t); }
  const wingMat = new THREE.MeshBasicMaterial({ color: 0xbfe9ff, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
  g.userData.wings = [-1, 1].map((s) => {
    const p = new THREE.Group(); p.position.set(0.15 * s, 0.2, -0.05); g.add(p);
    const w = new THREE.Mesh(new THREE.CircleGeometry(0.3, 16), wingMat); w.position.x = 0.28 * s; w.scale.y = 0.6; p.add(w);
    return { p, s };
  });
  const glow = new THREE.PointLight(0x6fd3ff, 4, 6, 2); g.add(glow);
}
scannables.push({ name: 'Springmot', ability: 'veer', obj: springmot, offset: V3(0, 1.1, 0) });

// ---------- Lichtjes ----------
function makeLichtje(x, z) {
  const g = new THREE.Group();
  const gy = groundAt(x, z, 0);
  g.position.set(x, gy, z);
  const inner = new THREE.Group(); g.add(inner);
  mk(new THREE.SphereGeometry(0.28, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffd98a }), 0, 0.42, 0, inner, 1.1);
  const cap = mk(new THREE.ConeGeometry(0.22, 0.2, 6), toon(0x3a3e4e), 0, 0.78, 0, inner);
  cap.rotation.y = 0.5;
  [-1, 1].forEach((s) => {
    const e = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.04, 3, 6), ink); e.position.set(0.09 * s, 0.46, 0.26); inner.add(e);
    mk(new THREE.SphereGeometry(0.07, 8, 6), toon(0x3a3e4e), 0.12 * s, 0.07, 0, inner, 0);
  });
  scene.add(g);
  return { g, inner, home: V3(x, gy, z), hide: 0 };
}
const shy = [[pathX(9) + 1.5, 9], [pathX(-7) - 1.5, -7], [9, -18], [-14, -40], [12, -58], [-8, -70]].map(([x, z]) => makeLichtje(x, z));

// the one that leads you somewhere
const PATH = [[2, -11], [-4, -18], [-12, -23], [-18, -27], [-24, -31]];
const guide = makeLichtje(...PATH[0]);
guide.step = 0; guide.done = false; guide.target = guide.home.clone();
guide.light = new THREE.PointLight(0xffc46b, 7, 9, 2); guide.light.position.y = 0.6; guide.g.add(guide.light);

// ---------- passive dialogue ----------
let lit = false;                                   // true once the Lichtvreter is beaten
export function setNpcLight(v) { lit = v; }
export const miloRoot = milo.root, MILO_AT = MILO_POS;
const pick = (a) => a[Math.floor(Math.random() * a.length)];
addSpeaker(milo.root, {
  y: 2.5, radius: 6, linger: 12,
  cond: () => !dialog.active,
  lines: () => lit
    ? ['Ik heb geen moment getwijfeld.', 'Licht! Ik bedoel… ja hoor. Prima.', 'Misschien kom ik zo wel even uit de ton.', 'Zeg niemand dat ik zat te trillen. Dat was de wind.']
    : milo.talked
      ? ['Het rode lampje, Josh. Volg het rode lampje.', 'Ik bewaak de ton. Iemand moet het doen.', 'Hoorde je dat? …Nee? Ik ook niet.', 'Als je de Lichtvreter ziet… doe hem de groeten. Van ver.']
      : ['…hallo?', 'Ik ben NIET bang.', 'Dit is gewoon een hele fijne ton.', 'Wie is daar? …Ik bedoel: hoi.'],
});
const SHY_LINES = ['Eep!', 'Niet kijken!', 'Ben jij van de katten?', '…licht?', 'Ssst. Hij hoort ons.', 'Ik ben een steen. Ik ben een steen.'];
const LIT_LINES = ['Het licht is terug!', 'Dankjewel!', 'Kijk hoe ik schijn!', 'Jij bent die met de drone!'];
for (const l of shy) {
  l.sp = addSpeaker(l.g, { y: 1.3, radius: 5, linger: 20, lines: () => (lit ? LIT_LINES : []) });
  l.wasNear = false;
}
addSpeaker(guide.g, {
  y: 1.4, radius: 7, linger: 3, cooldown: 2,
  lines: () => (guide.done ? ['Voor jou! Van alle Lichtjes.', 'Hihi. Gevonden!'] : ['Volg mij!', 'Hierheen!', 'Kom je?', 'Bijna!', 'Niet zo snel… wel snel!']),
});

// ---------- update ----------
export function updateNPCs(dt, t, p) {
  // Milo peeks out when you come close; once the light is back he climbs halfway out of the barrel
  const d = p.distanceTo(MILO_POS);
  const target = lit ? 0.35 : d < 7 ? 0 : -1.2;
  milo.up += (target - milo.up) * damp(d < 7 ? 3 : 6, dt);
  milo.body.position.y = milo.up + (d < 7 && !dialog.active && !lit ? Math.sin(t * 9) * 0.015 : 0);   // nervous trembling
  let dy = Math.atan2(p.x - MILO_POS.x, p.z - MILO_POS.z) - milo.root.rotation.y;
  milo.root.rotation.y += Math.atan2(Math.sin(dy), Math.cos(dy)) * damp(3, dt);
  milo.arms[0].rotation.z = dialog.active ? -0.3 + Math.sin(t * 4) * 0.3 : -0.1;
  milo.arms[1].rotation.z = dialog.active ? 1.4 : 0.1;

  if (dialog.active && dialog.shown < dialog.text.length) {
    dialog.shown = Math.min(dialog.text.length, dialog.shown + dt * 45);
    dText.textContent = dialog.text.slice(0, Math.floor(dialog.shown));
  }

  springmot.position.y = springmot.userData.base.y + Math.sin(t * 2.2) * 0.3;
  springmot.position.x = springmot.userData.base.x + Math.sin(t * 0.7) * 1.2;
  springmot.rotation.y = Math.sin(t * 0.7) * 1.2;
  springmot.userData.wings.forEach(({ p: w, s }) => (w.rotation.y = s * Math.sin(t * 22) * 0.9));

  for (const l of shy) {
    const near = !lit && p.distanceTo(l.g.position) < 5;
    if (near && !l.wasNear && l.sp.show <= 0) l.sp.say(pick(SHY_LINES), 1.8);   // squeak as it hides
    l.wasNear = near;
    l.hide += ((near ? 1 : 0) - l.hide) * damp(near ? 10 : 1.5, dt);
    l.inner.scale.setScalar(1 - l.hide * 0.75);
    l.inner.position.y = -l.hide * 0.35 + Math.abs(Math.sin(t * (lit ? 6 : 3) + l.home.x)) * (lit ? 0.25 : 0.05) * (1 - l.hide);
    l.inner.rotation.y = Math.atan2(p.x - l.g.position.x, p.z - l.g.position.z) + Math.PI * l.hide;
  }

  // guide Lichtje: hops to the next spot whenever you get close
  const gl = guide;
  gl.g.position.lerp(gl.target, damp(2.2, dt));
  const hop = gl.g.position.distanceTo(gl.target);
  gl.inner.position.y = Math.min(hop, 1) * Math.abs(Math.sin(t * 10)) * 0.6;
  gl.inner.rotation.y = gl.done ? t * 2 : Math.atan2(gl.target.x - gl.g.position.x, gl.target.z - gl.g.position.z);
  if (!gl.done && hop < 0.3 && p.distanceTo(gl.g.position) < 4.5) {
    gl.step++;
    if (gl.step < PATH.length) {
      const [x, z] = PATH[gl.step];
      gl.target.set(x, groundAt(x, z, 0), z);
      puff(gl.g.position.clone().add(V3(0, 0.4, 0)), 5, 0xffd98a, 1.5, 1);
    } else {
      gl.done = true;
      addCookie(gl.g.position.x + 1.2, gl.g.position.y + 1.2, gl.g.position.z, 'Het Lichtje achterna');
      npcEvents.onChange();
      puff(gl.g.position.clone().add(V3(0, 0.5, 0)), 12, 0xffd98a, 3, 2);
    }
  }
  gl.light.intensity = 6 + Math.sin(t * 5) * 1.5;
}

// ---------- saved progress ----------
export const npcEvents = { onChange() {} };
export const miloTalked = () => milo.talked;
export const guideDone = () => guide.done;
export const npcPrompt = () => 'praten met Milo';
export function restoreNPCs({ milo: talked, guide: done }, got) {
  if (talked) {
    milo.talked = true;
    const n = 'Milo’s “gevonden” koekje';
    if (!got.has(n)) addCookie(MILO_POS.x + 1.4, MILO_POS.y + 1.6, MILO_POS.z + 0.6, n);
  }
  if (done) {
    const [x, z] = PATH[PATH.length - 1];
    guide.step = PATH.length; guide.done = true;
    guide.target.set(x, groundAt(x, z, 0), z); guide.g.position.copy(guide.target);
    const n = 'Het Lichtje achterna';
    if (!got.has(n)) addCookie(x + 1.2, guide.target.y + 1.2, z, n);
  }
}
