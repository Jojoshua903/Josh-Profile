import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';

// Voxel character models. Every model faces +z, stands on y = 0, and is about 1 tile tall.
const INK = 0x1d1a2f, SKIN = 0xffd7b0;
const mats = new Map();
export const mat = (c, emissive) => {
  const k = c + ':' + (emissive || 0);
  if (!mats.has(k)) mats.set(k, new THREE.MeshLambertMaterial({ color: c, emissive: emissive || 0 }));
  return mats.get(k);
};
const geo = new THREE.BoxGeometry(1, 1, 1);
export function box(p, w, h, d, c, x = 0, y = 0, z = 0, em) {
  const m = new THREE.Mesh(geo, mat(c, em));
  m.scale.set(w, h, d); m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  p.add(m); return m;
}
const grp = (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; };

// Shared blocky humanoid. Head top sits at y ~0.92.
function hum(g, o) {
  const w = o.wide || 1, skin = o.skin ?? SKIN, sh = o.shirt;
  const legs = [-1, 1].map(s => box(g, 0.14, 0.2, 0.16, o.pants ?? 0x2a2f3a, s * 0.09 * w, 0.1, 0));
  const body = box(g, 0.4 * w, 0.34, 0.28 * (o.chubby ? 1.3 : 1), sh, 0, 0.37, 0);
  const armL = grp(g, -0.25 * w, 0.5, 0), armR = grp(g, 0.25 * w, 0.5, 0);
  [armL, armR].forEach(a => { box(a, 0.1, 0.26, 0.12, sh, 0, -0.12, 0); box(a, 0.1, 0.08, 0.12, o.gloves ?? skin, 0, -0.28, 0); });
  const head = grp(g, 0, 0.73, 0);
  box(head, 0.38, 0.38, 0.38, skin, 0, 0, 0);
  if (o.eyes !== false) [-1, 1].forEach(s => {
    if (o.wink && s > 0) box(head, 0.08, 0.025, 0.02, INK, s * 0.09, 0.02, 0.195);
    else box(head, 0.06, 0.08, 0.02, INK, s * 0.09, 0.02, 0.195);
    if (o.brows) box(head, 0.1, 0.025, 0.02, o.browColor ?? o.hair ?? INK, s * 0.09, 0.1 + (o.brows === 'angry' ? -0.01 : 0), 0.195).rotation.z = o.brows === 'angry' ? s * 0.35 : o.brows === 'sad' ? -s * 0.35 : 0;
  });
  if (o.mouth === 'grin') { box(head, 0.16, 0.05, 0.02, INK, 0, -0.09, 0.195); box(head, 0.12, 0.02, 0.025, 0xffffff, 0, -0.08, 0.196); }
  else if (o.mouth === 'cry') box(head, 0.1, 0.07, 0.02, INK, 0, -0.1, 0.195);
  else if (o.mouth === 'smirk') box(head, 0.09, 0.025, 0.02, INK, 0.04, -0.09, 0.195).rotation.z = 0.25;
  else if (o.mouth !== 'none') box(head, 0.1, 0.025, 0.02, INK, 0, -0.09, 0.195);
  if (o.hair) {
    box(head, 0.4, 0.09, 0.4, o.hair, 0, 0.21, 0);
    box(head, 0.4, 0.26, 0.07, o.hair, 0, 0.06, -0.17);
    [-1, 1].forEach(s => box(head, 0.05, 0.14, 0.32, o.hair, s * 0.19, 0.12, -0.03));
    if (o.hairStyle === 'messy') for (let i = 0; i < 5; i++) box(head, 0.1, 0.08, 0.1, o.hair, -0.14 + i * 0.07, 0.27 + (i % 2) * 0.03, -0.05 + (i % 3) * 0.05);
    if (o.hairStyle === 'spiky') for (let i = 0; i < 4; i++) { const sp = box(head, 0.08, 0.2, 0.08, o.hair, -0.13 + i * 0.09, 0.32, (i % 2) * 0.08 - 0.04); sp.rotation.z = (i - 1.5) * 0.3; }
    if (o.hairStyle === 'bun') { box(head, 0.18, 0.18, 0.18, o.hair, 0, 0.26, -0.16); box(head, 0.2, 0.04, 0.04, 0xff7ccf, 0, 0.2, -0.1); }
  }
  return { head, armL, armR, legs, body };
}
const glasses = (h, round) => [-1, 1].forEach(s => { box(h, 0.12, 0.1, 0.02, INK, s * 0.09, 0.02, 0.2); box(h, 0.08, 0.06, 0.025, round ? 0xffffff : 0xbfefff, s * 0.09, 0.02, 0.201); });
const wizardHat = (h, col, band) => { box(h, 0.54, 0.05, 0.54, col, 0, 0.21, 0); box(h, 0.4, 0.04, 0.4, band, 0, 0.25, 0); box(h, 0.32, 0.14, 0.32, col, 0, 0.32, 0); box(h, 0.22, 0.14, 0.22, col, 0, 0.45, -0.02); const tip = box(h, 0.12, 0.14, 0.12, col, 0.03, 0.57, -0.05); tip.rotation.z = -0.3; return tip; };

// ---------- the roster ----------
export const CHARS = [
  { id: 'josh', name: 'Josh', title: 'Tech Whiz', color: '#607d8b', unlock: 'start',
    bio: 'Built the whole WIDR universe from his bedroom. Never goes anywhere without his drone. Renas’s big brother.',
    secret: 'His drone has a name. He refuses to tell anyone what it is.',
    build(g) { const r = hum(g, { shirt: 0x607d8b, hair: 0x2a1a0a, hairStyle: 'messy' }); glasses(r.head);
      box(g, 0.08, 0.08, 0.02, 0x00e5ff, -0.08, 0.42, 0.145, 0x00a5bf);
      const d = grp(g, 0.1, 1.25, -0.1); box(d, 0.2, 0.06, 0.2, 0x2a2f3a); const rot = [];
      [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([x, z]) => { box(d, 0.05, 0.03, 0.05, 0x2a2f3a, x * 0.14, 0, z * 0.14); rot.push(box(d, 0.18, 0.01, 0.03, 0xc9d6e0, x * 0.14, 0.03, z * 0.14)); });
      const led = box(d, 0.04, 0.04, 0.04, 0xff3b3b, 0, 0, 0.11, 0xff0000);
      return t => { d.position.y = 1.22 + Math.sin(t * 3) * 0.05; rot.forEach(q => q.rotation.y = t * 30); led.visible = (t * 2 % 1) < 0.5; }; } },
  { id: 'nathan', name: 'Nathan', title: 'Baseball Slugger', color: '#ff3b3b', unlock: 'start',
    bio: 'The Frustratie King and the main character (he will tell you). Big swing, short fuse, never backs down from a pitch.',
    secret: 'He has never actually hit a home run. Every one was "a foul, technically."',
    build(g) { const r = hum(g, { shirt: 0xffffff, pants: 0xdddddd, mouth: 'grin', brows: 'angry', browColor: 0x4a2a14 });
      box(r.head, 0.42, 0.14, 0.42, 0xff3b3b, 0, 0.18, 0); box(r.head, 0.36, 0.04, 0.18, 0xff3b3b, 0, 0.12, 0.27);
      box(g, 0.12, 0.14, 0.02, 0xff3b3b, 0, 0.38, 0.145);
      const bat = grp(r.armR, 0, -0.28, 0.05); box(bat, 0.06, 0.5, 0.06, 0xc8915a, 0, 0.25, 0); box(bat, 0.09, 0.2, 0.09, 0xc8915a, 0, 0.45, 0); bat.rotation.x = -0.6;
      return t => { bat.rotation.z = Math.sin(t * 2) * 0.15; }; } },
  { id: 'ash', name: 'Ash', title: 'Little Pitcher', color: '#3c8dff', scale: 0.82,
    bio: 'Nathan’s little brother. Small and quick, and his fastball goes faster than most of the traffic.',
    secret: 'Secretly the better baseball player of the two. Nathan is not ready for this conversation.',
    build(g) { const r = hum(g, { shirt: 0x3c8dff, hair: 0x5a3416, mouth: 'grin' });
      box(r.head, 0.42, 0.12, 0.42, 0x3c8dff, 0, 0.2, 0); box(r.head, 0.36, 0.04, 0.16, 0x3c8dff, 0, 0.14, -0.27);
      box(r.armL, 0.18, 0.18, 0.1, 0x9a5a2b, 0, -0.3, 0.04); const ball = box(g, 0.1, 0.1, 0.1, 0xffffff, 0.3, 0.3, 0.12);
      return t => { ball.position.y = 0.35 + Math.abs(Math.sin(t * 3)) * 0.3; }; } },
  { id: 'ati', name: 'Ati', title: 'The Strict Mom', color: '#d94fd0',
    bio: 'Nobody wins an argument with Ati. Her slipper always finds its target, however far ahead you are.',
    secret: 'She has thrown the same slipper for eleven years. It has never once missed.',
    build(g) { const r = hum(g, { shirt: 0xd94fd0, pants: 0xd94fd0, hair: 0x3a2216, hairStyle: 'bun', mouth: 'line', brows: 'angry' }); glasses(r.head, true);
      box(g, 0.34, 0.26, 0.02, 0xffffff, 0, 0.34, 0.15);
      const sl = grp(r.armR, 0, -0.3, 0.05); box(sl, 0.1, 0.03, 0.24, 0xff7ccf); box(sl, 0.11, 0.05, 0.06, 0xffb6dc, 0, 0.03, 0.05);
      return t => { r.armR.rotation.x = -1.6 + Math.sin(t * 8) * 0.4; }; } },
  { id: 'daniel', name: 'Daniël', title: 'Demolition Bomber', color: '#ff7a1f',
    bio: 'The group’s Absurdist and a demolition expert. If it is in his way, it is coming down.',
    secret: 'He once demolished a wall that turned out to be load-bearing. It was his own wall.',
    build(g) { const r = hum(g, { shirt: 0xff7a1f, mouth: 'grin', brows: 'angry', browColor: 0x3a2216 });
      box(r.head, 0.44, 0.12, 0.44, 0xffd23f, 0, 0.21, 0); box(r.head, 0.5, 0.03, 0.5, 0xffd23f, 0, 0.16, 0); box(r.head, 0.06, 0.06, 0.4, 0xffc21f, 0, 0.29, 0);
      [-1, 1].forEach(s => box(g, 0.04, 0.3, 0.02, 0xdfe6ee, s * 0.1, 0.37, 0.145));
      const bomb = grp(r.armL, 0, -0.38, 0.05); box(bomb, 0.2, 0.2, 0.2, 0x2a2a33); box(bomb, 0.03, 0.1, 0.03, 0xc8915a, 0, 0.14, 0); const sp = box(bomb, 0.06, 0.06, 0.06, 0xffd23f, 0, 0.21, 0, 0xffa000);
      return t => sp.scale.setScalar(0.04 + Math.random() * 0.05); } },
  { id: 'dean', name: 'Dean', title: 'Breakdancer Gamer', color: '#8a5cff',
    bio: 'Breakdancer by day, top-ranked gamer by night. Perfect reflexes, smooth moves, never drops a combo.',
    secret: 'His headphones are not plugged into anything. He just hears the beat.',
    build(g) { const r = hum(g, { shirt: 0x8a5cff, mouth: 'grin' });
      box(r.head, 0.4, 0.12, 0.4, 0x1fb5a6, 0, 0.2, 0); box(r.head, 0.1, 0.1, 0.1, 0xffffff, 0, 0.3, 0);
      box(r.head, 0.46, 0.04, 0.06, INK, 0, 0.18, 0); [-1, 1].forEach(s => { box(r.head, 0.06, 0.14, 0.14, INK, s * 0.22, 0.02, 0); box(r.head, 0.02, 0.1, 0.1, 0x3cff8a, s * 0.255, 0.02, 0, 0x22aa55); });
      return t => { g.rotation.z = Math.sin(t * 6) * 0.06; }; } },
  { id: 'deniz', name: 'Deniz', title: 'Ice Wizard', color: '#7fd8ff',
    bio: 'A frost wizard who never slips. Ice feels like tarmac to him, and his blizzards stop traffic cold.',
    secret: 'He is allergic to snow. Nobody knows how this works.',
    build(g) { const r = hum(g, { shirt: 0x4fa8e8, pants: 0x4fa8e8, hair: 0xeaf6ff, mouth: 'smirk' });
      box(g, 0.48, 0.18, 0.36, 0x4fa8e8, 0, 0.12, 0); wizardHat(r.head, 0x2f7bff, 0xbff3ff);
      const st = grp(g, 0.36, 0, 0.08); box(st, 0.04, 0.9, 0.04, 0xdfe6ee, 0, 0.45, 0); const c = box(st, 0.12, 0.12, 0.12, 0xbff3ff, 0, 0.95, 0, 0x2a8fbf);
      return t => { c.rotation.y = t * 2; c.rotation.x = t; }; } },
  { id: 'dih', name: 'Dih', title: 'Cheeky Worm', color: '#ff9ab0',
    bio: 'A cheeky little worm with a big grin. Light as a feather and impossible to pin down.',
    secret: 'Nobody remembers inviting him. He has been in every group photo since 2023.',
    build(g) { const segs = [];
      for (let i = 0; i < 4; i++) { const s = grp(g, 0, 0.1 + i * 0.16, 0); box(s, 0.3 - i * 0.02, 0.15, 0.3 - i * 0.02, i % 2 ? 0xff7a9a : 0xff9ab0); segs.push(s); }
      const h = grp(g, 0, 0.78, 0.04); segs.push(h); box(h, 0.36, 0.32, 0.34, 0xff9ab0);
      box(h, 0.06, 0.08, 0.02, INK, -0.08, 0.04, 0.175); box(h, 0.08, 0.025, 0.02, INK, 0.08, 0.04, 0.175);
      box(h, 0.16, 0.05, 0.02, INK, 0, -0.07, 0.175); [-1, 1].forEach(s => box(h, 0.06, 0.04, 0.02, 0xff5f80, s * 0.13, -0.03, 0.176));
      return t => segs.forEach((s, i) => s.position.x = Math.sin(t * 5 + i * 0.9) * 0.05); } },
  { id: 'enno', name: 'Enno', title: 'The Mathematician', color: '#1fb5a6',
    bio: 'Calculates the perfect crossing in his head. Every lane is just a probability, and he has done the maths.',
    secret: 'He has computed the exact odds of this game existing. He will not share them.',
    build(g) { const r = hum(g, { shirt: 0x1fb5a6, hair: 0x8a7a6a, hairStyle: 'messy', mouth: 'line' }); glasses(r.head);
      [-1, 1].forEach(s => box(g, 0.08, 0.07, 0.03, 0xff3b3b, s * 0.05, 0.52, 0.15)); box(g, 0.04, 0.05, 0.035, 0xb01818, 0, 0.52, 0.15);
      const pi = grp(g, 0, 1.2, 0); box(pi, 0.24, 0.04, 0.04, INK); [-1, 1].forEach(s => box(pi, 0.04, 0.18, 0.04, INK, s * 0.07, -0.1, 0));
      return t => { pi.rotation.y = t * 1.5; pi.position.y = 1.18 + Math.sin(t * 2) * 0.04; }; } },
  { id: 'fionn', name: 'Fionn', title: 'Irish Geologist', color: '#2f9a46',
    bio: 'The Sarcast-in-Residence. An Irish geologist who knows every rock by name, and how hard each one hits.',
    secret: 'He named a pebble after each member of the group. Yours is the boring grey one.',
    build(g) { const r = hum(g, { shirt: 0x2f9a46, mouth: 'smirk', brows: 'flat', browColor: 0xe0661f });
      box(r.head, 0.4, 0.16, 0.08, 0xe0661f, 0, -0.12, 0.17); [-1, 1].forEach(s => box(r.head, 0.06, 0.2, 0.2, 0xe0661f, s * 0.19, -0.04, 0.06));
      box(r.head, 0.44, 0.08, 0.44, 0x6b7a4a, 0, 0.22, 0); box(r.head, 0.4, 0.04, 0.12, 0x6b7a4a, 0, 0.19, 0.24);
      const rock = grp(r.armR, 0, -0.36, 0.05); const rk = box(rock, 0.16, 0.14, 0.15, 0x8a8178);
      return t => { rk.rotation.y = t; }; } },
  { id: 'guiseppe', name: 'Guiseppe', title: 'Sentient Apple', color: '#e0201f',
    bio: 'A sentient apple with a magnificent mustache. He has his own video game, and he will remind you.',
    secret: 'His Nonna is not, technically, an apple. Do not ask about the family tree.',
    build(g) { const a = grp(g, 0, 0, 0); box(a, 0.6, 0.55, 0.6, 0xe0201f, 0, 0.32, 0); box(a, 0.5, 0.1, 0.5, 0xe0201f, 0, 0.64, 0); box(a, 0.5, 0.06, 0.5, 0xc01818, 0, 0.04, 0);
      box(a, 0.05, 0.16, 0.05, 0x6b3f1f, 0, 0.76, 0); box(a, 0.18, 0.04, 0.1, 0x3ccf6e, 0.1, 0.8, 0);
      [-1, 1].forEach(s => { box(a, 0.07, 0.1, 0.02, INK, s * 0.12, 0.44, 0.305); box(a, 0.16, 0.06, 0.04, 0x2a1a0a, s * 0.1, 0.32, 0.31).rotation.z = s * 0.3; box(a, 0.1, 0.1, 0.1, 0xffffff, s * 0.36, 0.25, 0.1); });
      box(a, 0.08, 0.08, 0.04, 0xb01818, 0, 0.37, 0.32);
      return t => { a.scale.y = 1 + Math.sin(t * 5) * 0.03; }; } },
  { id: 'adam', name: 'Adam', title: 'Tennis Ace', color: '#8fd400',
    bio: 'The Sticker King and a tennis ace with a lightning backhand. He can return anything, even a train.',
    secret: 'He has a sticker on every car in town. That is how he tracks the traffic.',
    build(g) { const r = hum(g, { shirt: 0xffffff, pants: 0x2fbf71, hair: 0x7a4a24 }); box(r.head, 0.42, 0.06, 0.42, 0x2fbf71, 0, 0.12, 0);
      const rk = grp(r.armR, 0, -0.32, 0.06); box(rk, 0.04, 0.2, 0.04, INK, 0, 0.05, 0); box(rk, 0.03, 0.28, 0.22, 0x2fbf71, 0, 0.28, 0); box(rk, 0.031, 0.22, 0.16, 0xf4f4e8, 0, 0.28, 0);
      const ball = box(g, 0.08, 0.08, 0.08, 0xd6ff3a, -0.3, 0.8, 0.1);
      return t => { ball.position.y = 0.6 + Math.abs(Math.sin(t * 3)) * 0.4; }; } },
  { id: 'lars', name: 'Lars', title: 'Dwarf Miner', color: '#8b5a2b', scale: 0.9,
    bio: 'A stout dwarf miner. Short, wide and as solid as the mountains he digs through. Got his own game too.',
    secret: 'Claims to be 340 years old. His birth certificate says otherwise.',
    build(g) { const r = hum(g, { shirt: 0x8b5a2b, wide: 1.3, mouth: 'none', brows: 'angry', browColor: 0x5a3416 });
      box(r.head, 0.38, 0.22, 0.06, 0x5a3416, 0, -0.14, 0.2); box(r.head, 0.26, 0.2, 0.06, 0x5a3416, 0, -0.32, 0.2); box(r.head, 0.12, 0.12, 0.08, 0x5a3416, 0, -0.46, 0.2);
      box(r.head, 0.08, 0.08, 0.04, 0xf0b48a, 0, -0.02, 0.21);
      box(r.head, 0.44, 0.14, 0.44, 0xd9a441, 0, 0.21, 0); box(r.head, 0.12, 0.1, 0.06, INK, 0, 0.21, 0.24); box(r.head, 0.08, 0.06, 0.02, 0xfff6a0, 0, 0.21, 0.27, 0xffee66);
      const pk = grp(r.armR, 0, -0.3, 0.05); box(pk, 0.04, 0.5, 0.04, 0xa8794a, 0, 0.2, 0); box(pk, 0.36, 0.06, 0.06, 0x9a9aa8, 0, 0.44, 0);
      return t => { pk.rotation.x = Math.sin(t * 2) * 0.2; }; } },
  { id: 'meta', name: 'Meta AI', title: 'The Meddling Chatbot', color: '#0866ff', unlock: 'finale',
    bio: 'Honorary member of WIDR. A chatbot that butts into everything nobody asked it about. The villain of this whole story.',
    secret: 'All it ever wanted was for someone to ask it a question.',
    build(g) { const core = grp(g, 0, 0.55, 0), ring = grp(core);
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; box(ring, 0.16, 0.16, 0.16, i < 5 ? 0x0866ff : 0xc23bff, Math.cos(a) * 0.32, Math.sin(a) * 0.32, 0, i < 5 ? 0x0a3aa8 : 0x5a1a8a); }
      [-1, 1].forEach(s => box(core, 0.12, 0.04, 0.04, 0xff3b5c, s * 0.08, 0.04, 0.02, 0xff0030).rotation.z = s * 0.35);
      box(core, 0.12, 0.03, 0.04, 0xff3b5c, 0, -0.08, 0.02, 0xff0030);
      const bub = grp(g, 0.45, 1.05, 0); box(bub, 0.34, 0.2, 0.04, 0xffffff); [-1, 0, 1].forEach(i => box(bub, 0.04, 0.04, 0.05, 0x0866ff, i * 0.08, 0, 0));
      return t => { core.position.y = 0.55 + Math.sin(t * 2) * 0.06; ring.rotation.z = t * 0.9; bub.position.y = 1.05 + Math.sin(t * 2 + 1) * 0.04; }; } },
  { id: 'milo', name: 'Milo', title: 'Lightning Wizard', color: '#ffd23f',
    bio: 'The group’s Storyteller and a storm-calling wizard. Fastest legs in town, a little wild in the corners.',
    secret: 'Half the stories in this game were his idea. He claims the other half too.',
    build(g) { const r = hum(g, { shirt: 0x5a3dff, pants: 0x5a3dff, hair: 0xffe066, hairStyle: 'spiky', mouth: 'grin', brows: 'angry', browColor: 0xc9a400 });
      box(g, 0.48, 0.18, 0.36, 0x5a3dff, 0, 0.12, 0); const tip = wizardHat(r.head, 0x3a2a8a, 0xffd23f); box(r.head, 0.06, 0.12, 0.02, 0xffd23f, 0, 0.32, 0.165);
      const st = grp(g, 0.36, 0, 0.08); box(st, 0.04, 0.9, 0.04, 0x8b5a2b, 0, 0.45, 0); const orb = box(st, 0.14, 0.14, 0.14, 0xfff27a, 0, 0.96, 0, 0xffd000);
      return t => { orb.scale.setScalar(0.12 + Math.random() * 0.05); tip.rotation.z = -0.3 + Math.sin(t * 3) * 0.1; }; } },
  { id: 'renas', name: 'Renas', title: 'Gadget Kid', color: '#ffb02e', scale: 0.78,
    bio: 'Josh’s little brother. His backpack is full of half-finished inventions and you never know which one comes out.',
    secret: 'He reprogrammed Josh’s drone once. Josh still has not noticed.',
    build(g) { const r = hum(g, { shirt: 0xffb02e, hair: 0x2a1a0a, mouth: 'grin' });
      [0xff3b3b, 0xffd23f, 0x2f7bff, 0x3ccf6e].forEach((c, i) => box(r.head, 0.2, 0.1, 0.2, c, (i % 2 ? 0.1 : -0.1), 0.24, (i < 2 ? 0.1 : -0.1)));
      box(r.head, 0.03, 0.12, 0.03, INK, 0, 0.34, 0); const prop = box(r.head, 0.3, 0.02, 0.05, 0xff3b3b, 0, 0.41, 0);
      box(g, 0.32, 0.3, 0.14, 0x2f7bff, 0, 0.4, -0.2); box(g, 0.06, 0.06, 0.06, 0xffd23f, 0.1, 0.58, -0.26, 0xaa8800);
      return t => { prop.rotation.y = t * 18; }; } },
  { id: 'reshman', name: 'Reshman', title: 'The Shadow', color: '#2a2238', scale: 0.8,
    bio: 'The Chaos Agent. A small, faceless shadow blob. Nobody knows where he came from, or where he will turn up next.',
    secret: 'He has been standing behind you this whole time.',
    build(g) { const b = grp(g); box(b, 0.5, 0.4, 0.5, 0x2a2238, 0, 0.2, 0); box(b, 0.4, 0.2, 0.4, 0x2a2238, 0, 0.5, 0); box(b, 0.24, 0.12, 0.24, 0x2a2238, 0, 0.66, 0);
      [-1, 1].forEach(s => box(b, 0.14, 0.12, 0.14, 0x3a3050, s * 0.26, 0.06, 0.18));
      const wisps = [0, 1, 2].map(i => box(g, 0.08, 0.08, 0.08, 0x3a3050, Math.cos(i * 2) * 0.35, 0.3, Math.sin(i * 2) * 0.35));
      return t => { b.scale.set(1 + Math.sin(t * 3) * 0.05, 1 - Math.sin(t * 3) * 0.05, 1); wisps.forEach((w, i) => { const a = t + i * 2.1; w.position.set(Math.cos(a) * 0.38, 0.3 + Math.sin(t * 2 + i) * 0.15, Math.sin(a) * 0.38); }); }; } },
  { id: 'robin', name: 'Robin', title: 'Big Crybaby', color: '#b388ff', scale: 1.22,
    bio: 'A big, goofy kid who cries at everything. Push him too far and you meet the strongest fighter in town.',
    secret: 'He cried during the WIDR Turbo credits. Twice. The second time was on purpose.',
    build(g) { const r = hum(g, { shirt: 0xb388ff, hair: 0xe0a060, chubby: true, wide: 1.25, mouth: 'cry', brows: 'sad', browColor: 0xa06a30 });
      const tears = [-1, 1].map(s => box(r.head, 0.04, 0.08, 0.03, 0x5ac8ff, s * 0.12, -0.04, 0.2, 0x2288cc));
      return t => tears.forEach((q, i) => { q.position.y = -0.02 - ((t * 0.8 + i * 0.5) % 1) * 0.2; }); } },
  { id: 'thomas', name: 'Thomas', title: '“The Rounder”', color: '#ffc48a',
    bio: 'A perfectly round fighter with no feet. He rolls with every punch and keeps on coming.',
    secret: 'Nobody has ever seen him stand still. Rumour says he can’t.',
    build(g) { const b = grp(g, 0, 0.36, 0);
      box(b, 0.62, 0.42, 0.62, 0xffc48a); box(b, 0.44, 0.62, 0.44, 0xffc48a); box(b, 0.52, 0.54, 0.52, 0xffc48a);
      [-1, 1].forEach(s => { box(b, 0.07, 0.1, 0.02, INK, s * 0.1, 0.1, 0.315); box(b, 0.16, 0.16, 0.16, 0xe8202a, s * 0.36, -0.05, 0.12); });
      box(b, 0.16, 0.04, 0.02, INK, 0, -0.04, 0.315);
      return t => { b.rotation.x = Math.sin(t * 2) * 0.1; b.position.y = 0.36 + Math.abs(Math.sin(t * 4)) * 0.04; }; } },
  { id: 'yassin', name: 'Yassin', title: 'The Kickboxer', color: '#e8202a',
    bio: 'Nobody bets against his push-up count anymore. A kickboxer whose roundhouse sends cars off their lane.',
    secret: 'He counts his push-ups out loud. In three languages.',
    build(g) { const r = hum(g, { shirt: 0x1a1a1a, skin: 0xc98d5e, hair: 0x1a120c, wide: 1.28, mouth: 'smirk', brows: 'angry', gloves: 0xe8202a });
      [r.armL, r.armR].forEach(a => box(a, 0.15, 0.15, 0.17, 0xe8202a, 0, -0.29, 0.02)); box(r.head, 0.4, 0.05, 0.05, 0xe8202a, 0, 0.13, 0.18);
      return t => { r.armL.rotation.x = -1.2 + Math.sin(t * 4) * 0.3; r.armR.rotation.x = -1.2 - Math.sin(t * 4) * 0.3; }; } },
  { id: 'niek', name: 'Niek', title: 'Nerd & Boy Scout', color: '#c8b273',
    bio: 'A proud nerd and boy scout with every merit badge there is. He has read the traffic code twice.',
    secret: 'He has a merit badge for crossing roads. He earned it in this game.',
    build(g) { const r = hum(g, { shirt: 0xc8b273, pants: 0x6b5a32, hair: 0xb5651d, mouth: 'grin' }); glasses(r.head, true);
      box(g, 0.42, 0.06, 0.3, 0xe0201f, 0, 0.52, 0); box(g, 0.08, 0.14, 0.02, 0xe0201f, 0, 0.44, 0.145);
      box(r.head, 0.56, 0.03, 0.56, 0x8a6a3a, 0, 0.21, 0); box(r.head, 0.3, 0.12, 0.3, 0x8a6a3a, 0, 0.28, 0);
      box(g, 0.34, 0.34, 0.16, 0x4a6a2a, 0, 0.4, -0.22); [0xffd23f, 0x3c8dff, 0xff3b3b].forEach((c, i) => box(g, 0.05, 0.05, 0.02, c, 0.12, 0.44 - i * 0.07, 0.15));
      return t => {}; } },
  { id: 'oela', name: 'Oela', title: 'The Footballer', color: '#1fa04a',
    bio: 'A footballer with magic in his boots. He dribbles past cars like they are defenders.',
    secret: 'He has never lost a game of keepy-uppy. The record is still going.',
    build(g) { const r = hum(g, { shirt: 0x1fa04a, pants: 0xffffff, skin: 0x5a3420, hair: 0x140c08, mouth: 'grin' });
      box(g, 0.12, 0.12, 0.02, 0xffffff, 0, 0.4, 0.145); const ball = grp(g, 0.18, 0.08, 0.22); box(ball, 0.16, 0.16, 0.16, 0xffffff); box(ball, 0.165, 0.06, 0.06, INK); box(ball, 0.06, 0.165, 0.06, INK);
      return t => { ball.position.y = 0.08 + Math.abs(Math.sin(t * 4)) * 0.35; ball.rotation.x = t * 5; }; } },
  { id: 'casper', name: 'Casper', title: 'The Car Expert', color: '#e0201f', unlock: 'ch3',
    bio: 'A real autokenner. He knows every engine, every tyre and every top speed in town by heart.',
    secret: 'He can tell a car’s model from the sound of its horn. With his eyes closed. Underwater.',
    build(g) { const r = hum(g, { shirt: 0x2a3a5a, pants: 0x2a3a5a, hair: 0x3a2414, mouth: 'smirk', gloves: 0x1d1a2f });
      box(r.head, 0.42, 0.12, 0.42, 0xe0201f, 0, 0.19, 0); box(r.head, 0.36, 0.04, 0.16, 0xe0201f, 0, 0.13, 0.27);
      box(g, 0.1, 0.06, 0.02, 0xe0201f, -0.1, 0.46, 0.145);
      const wr = grp(r.armR, 0, -0.32, 0.06); box(wr, 0.04, 0.3, 0.04, 0xb0b8c4, 0, 0.12, 0); box(wr, 0.12, 0.06, 0.04, 0xb0b8c4, 0, 0.28, 0);
      return t => { wr.rotation.x = Math.sin(t * 3) * 0.3; }; } },
  { id: 'zennith', name: 'Zennith', title: 'The Living Dark', color: '#1a1030', unlock: 'ch2', scale: 1.15,
    bio: 'A tall shadow being from the darkest corner of the sky. No face, just two glowing eyes. Where Zennith looks, the light goes out.',
    secret: 'Zennith is afraid of exactly one thing: a phone screen at full brightness.',
    build(g) { const b = grp(g); box(b, 0.36, 0.5, 0.3, 0x1a1030, 0, 0.35, 0); box(b, 0.3, 0.3, 0.28, 0x1a1030, 0, 0.78, 0);
      box(b, 0.46, 0.14, 0.36, 0x261a44, 0, 0.1, 0); [-1, 1].forEach(s => { box(b, 0.08, 0.4, 0.1, 0x1a1030, s * 0.24, 0.42, 0); box(b, 0.07, 0.04, 0.02, 0xc8a8ff, s * 0.07, 0.8, 0.145, 0xa070ff); });
      for (let i = 0; i < 4; i++) box(b, 0.06, 0.12, 0.06, 0x261a44, -0.12 + i * 0.08, 0.98 + (i % 2) * 0.05, 0);
      return t => { b.position.y = Math.sin(t * 1.5) * 0.04; b.children.forEach((c, i) => { if (i > 6) c.position.y = 0.98 + Math.sin(t * 3 + i) * 0.04; }); }; } },
  { id: 'ankervos', name: 'Anker Vos', title: 'The Annoying Fox', color: '#ff7a1f', unlock: 'ch1',
    bio: 'The Chief Troller’s spirit animal. Just a fox. A very, very annoying fox. He yaps, he cheats, he never stops laughing.',
    secret: 'He knows the ending of this game. He will spoil it if you let him.',
    build(g) { const b = grp(g); box(b, 0.3, 0.26, 0.5, 0xff7a1f, 0, 0.3, 0); [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([x, z]) => box(b, 0.08, 0.18, 0.08, 0x3a2216, x * 0.1, 0.09, z * 0.17));
      const h = grp(b, 0, 0.52, 0.22); box(h, 0.32, 0.28, 0.28, 0xff7a1f); box(h, 0.18, 0.12, 0.16, 0xffffff, 0, -0.06, 0.18); box(h, 0.06, 0.05, 0.04, INK, 0, -0.02, 0.27);
      [-1, 1].forEach(s => { box(h, 0.09, 0.14, 0.06, 0xff7a1f, s * 0.11, 0.2, -0.04); box(h, 0.06, 0.06, 0.02, INK, s * 0.08, 0.05, 0.145); });
      const tongue = box(h, 0.06, 0.03, 0.08, 0xff4f6a, 0, -0.12, 0.27);
      const tail = grp(b, 0, 0.36, -0.25); box(tail, 0.14, 0.14, 0.3, 0xff7a1f, 0, 0.06, -0.12); box(tail, 0.12, 0.12, 0.1, 0xffffff, 0, 0.1, -0.3);
      return t => { tail.rotation.y = Math.sin(t * 8) * 0.5; h.rotation.z = Math.sin(t * 4) * 0.12; tongue.visible = (t % 1.2) < 0.7; }; } },
];

export const byId = id => CHARS.find(c => c.id === id);

export function buildChar(id) {
  const c = byId(id), root = new THREE.Group(), inner = new THREE.Group();
  root.add(inner);
  const anim = c.build(inner) || (() => {});
  inner.scale.setScalar((c.scale || 1) * 0.85);
  return { root, inner, anim };
}
