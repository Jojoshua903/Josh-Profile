import { World, addStars, addBackdropPlanet, LL, frameDir, V3, toon, basic, mk, THREE, coinRing, coinLine, coinOn, rock, palm, lamp, sign, addRocket, questItem, rareItem, setupFriend, setupLocal, quicksand, gusts, addMore } from './worlds-common.js?v=20261111u';
import { fbm } from './world.js?v=20261111u';
import { buildFarah, buildCamel, buildScarab, buildScroll, textBoard, buildLocal, buildTrinket } from './models.js?v=20261111u';
import { Gruizel } from './bosses.js?v=20261111u';
import { addParkour, buildBeacon } from './parkour.js?v=20261111u';
import { duelModels } from './duels.js?v=20261111u';

// World 7 on the route: DUINENRIJK. A desert planet with a pyramid, an obelisk and an oasis.
// New here: quicksand slows you down, sandstorms push you around, and cacti prick.
// Boss: Gruizel, the giant sandworm, in the Zandkuil.
export function buildDesert(ctx) {
  const w = new World('farah');
  Object.assign(w, {
    index: 7, title: 'Duinenrijk', sub: 'Dunes, pyramids and a worm the size of a train.', friendName: 'Farah',
    arenaTitle: 'De Zandkuil', arenaSub: 'Something is moving under the sand',
    sky: 'linear-gradient(180deg,#3a6ad8 0%,#7ab0e8 40%,#ffd8a0 78%,#ffb06a 100%)',
    arenaSky: 'linear-gradient(180deg,#2a1a3a 0%,#8a4a5a 45%,#ff9a5a 80%,#ffd8a0 100%)',
    music: 'desert', bossMusic: 'boss8', lights: [0xfff4e0, 0x8a5a3a],
    quest: { icon: '🪲', label: 'Golden scarabs', got: 0, need: 3 },
  });
  w.quest.got = ctx.ws(w).items.length;
  addStars(w, 200);
  addBackdropPlanet(w, V3(-190, 100, -140), 22, 0xffd8a0, 0xc8945a);
  addBackdropPlanet(w, V3(160, -90, 150), 11, 0xff9a5a);

  const SAFE = [LL(0, 0), LL(5, 12), LL(-4, 9), LL(-30, -76), LL(-30, 196), LL(-40, 220), LL(-6, 244), LL(-4, 254), LL(-16, -26), LL(-11, -19), LL(-90, 0)].map((d) => [d, 0.982])
    .concat([[LL(22, -40), 0.955], [LL(48, 150), 0.955], [LL(-22, 78), 0.97]]);
  const sandAt = (p) => { for (const [d, c] of SAFE) if (p.dot(d) > c) return false; return fbm(p, 2.4) < 0.33 && p.z < 0.85; };
  const s1 = new THREE.Color(0xf0c888), s2 = new THREE.Color(0xe0b070), s3 = new THREE.Color(0xd8a060), qs = new THREE.Color(0xb88a50), rockC = new THREE.Color(0xc87a4a), path = new THREE.Color(0xf8e0b0);
  const pl = w.addPlanet({
    c: V3(0, 0, 0), r: 24, shape: 'piramide', atmo: 0xffd8a0, atmoOp: 0.12,
    paint: (p, out) => {
      const n = fbm(p, 2.0), dune = Math.sin(p.x * 14 + p.y * 9 + n * 4);
      out.copy(dune > 0.4 ? s1 : dune > -0.3 ? s2 : s3);
      if (fbm(p, 6) > 0.78) out.copy(rockC);
      if (sandAt(p)) out.copy(fbm(p, 12) > 0.5 ? qs : s3);
      if (p.z > 0.965 && Math.abs(p.x) < 0.05) out.copy(path);
    },
  });
  w.main = pl;
  quicksand(w, pl, sandAt);
  gusts(w, pl, { every: 13, len: 3.5, power: 5.5, text: '🌪️ Sandstorm!' });
  const a1 = new THREE.Color(0xe0b070), a2 = new THREE.Color(0xc8945a), a3 = new THREE.Color(0xf0c888);
  const arena = w.addPlanet({
    c: V3(0, -30, -120), r: 14, atmo: 0xff9a5a, atmoOp: 0.12,
    paint: (p, out) => { const d = Math.sin(p.x * 12 + p.z * 8); out.copy(d > 0.4 ? a3 : d > -0.3 ? a1 : a2); },
  });
  w.arena = arena;
  w.spawn = { dir: LL(0, 0), fwd: V3(0, 1, 0) };
  w.arenaSpawn = { dir: arena.c.clone().negate().normalize(), fwd: V3(0, 1, 0) };
  addRocket(w, ctx, pl, LL(-4, 9));

  // ---------- Farah and her camel Karel at the dig site ----------
  const farah = buildFarah();
  const npc = w.addNPC(pl, farah, LL(5, 12), { name: 'Farah', bubbleY: 2.0, anim: (dt, t, n) => {
    const s = (t % 3.2) / 3.2;                                   // looks through her magnifying glass, then brushes the sand
    n.model.arms[0].rotation.x = s < 0.5 ? -1.6 : -0.5;
    n.model.arms[1].rotation.x = s >= 0.5 ? -0.8 + Math.sin(t * 12) * 0.3 : -0.3;
    n.model.head.rotation.x = s < 0.5 ? 0.3 : 0.15;
  } });
  const camel = buildCamel(); w.put(pl, camel, LL(9, 18), 0, 2.2); w.addSolid(pl, LL(9, 18), 1.0, 2.6);
  w.updaters.push((dt, t) => { camel.children[3].rotation.x = Math.sin(t * 0.8) * 0.1; });
  setupFriend(w, ctx, npc, {
    name: 'Farah',
    first: [
      ['FARAH', 'Careful! You’re standing on three thousand years of history. Oh, hello! Welcome to Duinenrijk.'],
      ['RÊNAS', 'Hi! Is that a camel?'],
      ['FARAH', 'That’s Karel. He’s my assistant. He mostly chews. I’m Farah, archaeologist. I dig up very old things.'],
      ['FARAH', 'But something dug ME up. Gruizel, the giant sandworm. He swims through the sand like it’s water.'],
      ['FARAH', 'He swallowed my dig site, burped, and my three golden scarabs flew all over the planet.'],
      ['RÊNAS', 'And let me guess… he has an energy core?'],
      ['FARAH', 'The Zandkern! Very heavy. Of course. He keeps it in his belly. Don’t ask how I know.'],
      ['FARAH', 'One scarab landed on top of the pyramid in the north. One is on top of the obelisk in the west: ride the floating stones round and round.'],
      ['FARAH', 'And one is on the stone arch by the oasis. Watch out for the quicksand, the dark patches. And the sandstorms. And the cacti. It’s a desert.'],
      ['FARAH', 'Professor Pim and Tess each found a star shard. Help them and they’ll give them to you. Karel says good luck. …Karel says nothing. He’s chewing.'],
    ],
    progress: (got) => [['FARAH', `Golden scarabs: ${got}/5. The pyramid, the obelisk, and the stone arch by the oasis. Mind the quicksand!`]],
    needLocals: (left) => [['FARAH', `All five golden scarabs! Wonderful! But the Launch Star still needs star shards. ${left.join(' and ')} still need${left.length === 1 ? 's' : ''} you. Look for the yellow “!”.`]],
    done: [
      ['FARAH', 'My scarabs! Look at them shine. Three thousand years old and not a scratch.'],
      ['FARAH', 'The Launch Star is awake. It takes you to the Zandkuil. That’s Gruizel’s nest.'],
      ['FARAH', 'He spits sand balls and sends sand waves: jump over those. When a dust trail comes at you, he’s hunting you.'],
      ['FARAH', 'When the red circle appears: GET OUT. He bursts up, sways… and then smacks down flat on the sand. Run to his head and jump on it!'],
    ],
    after: [['FARAH', 'Dust trail: run. Red circle: get out. Flat on the sand: jump on his head. Karel agrees. *chew*']],
    bubbles: {
      new: ['Careful!', 'Three thousand years!', '*brushes the sand*'],
      progress: ['My scarabs…', 'Mind the quicksand!', 'Ride the stones!', 'Psst. The Zandloper has a golden gear at the end.'],
      done: ['To the Launch Star!', 'Jump on his head!', 'Karel says hi.'],
    },
  });

  // ---------- the locals ----------
  setupLocal(w, ctx, {
    id: 'pim', name: 'Pim', who: 'PIM', dir: LL(-30, -76), bubbleY: 2.0,
    model: buildLocal({ s: 0.8, skin: 0xf0c8a0, shirt: 0xf0e0b8, pants: 0x6a5a3a, hair: 0xd8d8d8, beard: 0xe8e8e8, hat: 'cap', capC: 0xe8d098, shoes: 0x6a4a2a }),
    anim: (dt, t, n) => { n.model.arms[0].rotation.x = -1.2; n.model.head.rotation.y = Math.sin(t * 0.7) * 0.6; },
    task: { type: 'fetch', dir: LL(-44, -92), alt: 6.6, model: buildScroll(), banner: 'THE TREASURE MAP!', found: 'My treasure map! Bring it back before the wind takes it!' },
    first: [
      ['PIM', 'Ah, a young explorer! Professor Pim. I’ve been looking for the lost treasure of Duinenrijk for forty years.'],
      ['PIM', 'And a sandstorm just blew my treasure map onto the top of that rock tower. Forty years of work. Gone with the wind.'],
      ['PIM', 'Bounce on the cactus flower next to it. It’s springy. Bring my map back and my star shard is yours.'],
    ],
    progress: () => [['PIM', 'My map is on top of the rock tower. Bounce on the springy cactus flower!']],
    done: [['PIM', 'My map! Now, where was I… ah. The treasure is… under my own tent. Hm.'], ['PIM', 'Here’s the star shard. I found it in my soup. Desert life.']],
    after: [['PIM', 'Forty years… and it was under my tent. Don’t tell Farah.']],
    bubbles: { new: ['A young explorer!', 'My map…', 'Forty years!'], progress: ['The rock tower!', 'Bounce on the cactus!', 'Gone with the wind.'], done: ['Thank you!', 'Under my tent…', 'Hm.'] },
  });
  w.addPlatform(pl, { lat: -44, lon: -92, hx: 1.6, hz: 1.6, h: 5.6, color: 0xc87a4a, top: 0xe0a060 });
  {
    const fl = w.addPlatform(pl, { lat: -37, lon: -84, r: 1.2, h: 0.5, color: 0x3a8a3a, top: 0xff5ab4, bounce: 23, puff: 0xff5ab4 });
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; mk(new THREE.SphereGeometry(0.45, 10, 8), toon(0xff7ad8), Math.cos(a) * 0.9, 0.55, Math.sin(a) * 0.9, fl.mesh, 1.06).scale.set(1, 0.3, 0.6); }
  }
  setupLocal(w, ctx, {
    id: 'tess', name: 'Tess', who: 'TESS', dir: LL(-30, 196), bubbleY: 1.8,
    model: buildLocal({ s: 0.68, skin: 0xc8946a, shirt: 0xe03a5a, pants: 0x3a3e4e, hair: 0x2b1a10, hat: 'bun', shoes: 0xfbf7ef }),
    anim: (dt, t, n) => { n.model.arms[1].rotation.x = -1.0 + Math.sin(t * 4) * 0.4; n.model.arms[0].rotation.z = -0.5; },
    task: { type: 'duel', game: 'grab', n: 13, time: 25, speed: 5.4, color: 0xffe14a, model: duelModels.lemon, winTitle: 'LEMON CHAMP!', found: 'You got more lemons than me! Come back, I’ve got something for you!', lost: 'More lemons for me! Talk to me if you want a rematch!', tie: 'A tie! The lemons can’t decide. Talk to me for a rematch!' },
    first: [
      ['TESS', 'Hi! I’m Tess. I run the lemonade stand at the oasis. Best lemonade in the desert. Only lemonade in the desert.'],
      ['TESS', 'Oh no, a sandstorm blew my lemons everywhere! …Okay, I threw them. It’s a game.'],
      ['TESS', 'Lemon Rush! We both grab lemons. Whoever has the most when time’s up wins.'],
      ['RÊNAS', 'I’m going to win this.'],
      ['TESS', 'Everyone says that. Beat me and you get my star shard. And a free lemonade.'],
    ],
    progress: () => [['TESS', 'Lemon Rush, round two! I already threw them. Go go go!']],
    done: [['TESS', 'You beat me at Lemon Rush! Nobody beats me at Lemon Rush!'], ['TESS', 'Here’s the star shard, and a lemonade. …The lemonade is warm. It’s a desert.']],
    after: [['TESS', 'Lemonade! Warm lemonade! Get your warm lemonade!']],
    bubbles: { new: ['Lemonade!', 'Lemon Rush?', 'Hi!'], progress: ['Round two!', 'Grab the lemons!', 'Go go go!'], done: ['Thank you!', 'Warm lemonade!', 'Lemon champ!'] },
  });

  // ---------- decor: cacti (they prick!), palms at the oasis, rocks, bones ----------
  const cactus = (dir, h = 2.4) => {
    const g = new THREE.Group(), cm = toon(0x3a9a4a);
    mk(new THREE.CapsuleGeometry(0.3, h - 0.6, 4, 10), cm, 0, h / 2, 0, g, 1.06);
    for (const s of [-1, 1]) { const a = new THREE.Group(); a.position.set(0.3 * s, h * 0.5, 0); g.add(a); mk(new THREE.CapsuleGeometry(0.16, 0.4, 4, 8), cm, 0.25 * s, 0, 0, a, 1.06).rotation.z = Math.PI / 2; mk(new THREE.CapsuleGeometry(0.16, 0.5, 4, 8), cm, 0.45 * s, 0.35, 0, a, 1.06); }
    mk(new THREE.SphereGeometry(0.14, 8, 6), toon(0xff5ab4), 0, h, 0, g, 0);
    w.put(pl, g, dir, 0, Math.random() * 6);
    w.addPlatform(pl, { dir, r: 0.45, h, b: -1, hurt: true, mat: basic(0x000000, { visible: false }) }).mesh.visible = false;
  };
  [[14, 30], [-10, 40], [30, 80], [-50, 30], [50, -10], [-10, 120], [20, 170], [-60, 160], [10, 230], [40, 260], [-30, 290], [60, 320], [-6, -60], [-56, -40]].forEach(([la, lo], i) => cactus(LL(la, lo), 2 + (i % 3) * 0.5));
  [[16, -20], [-26, 160], [12, 290], [44, 200], [-50, 240], [-36, 206], [-46, 214]].forEach(([la, lo], i) => rock(w, pl, LL(la, lo), 0.9 + (i % 3) * 0.4, 0xc87a4a));
  for (let i = 0; i < 6; i++) {   // old bones in the sand
    const b = new THREE.Group(); const bm = toon(0xf4f1ea);
    mk(new THREE.CapsuleGeometry(0.08, 0.9, 4, 6), bm, 0, 0.1, 0, b, 1.08).rotation.z = Math.PI / 2;
    for (let k = 0; k < 4; k++) mk(new THREE.TorusGeometry(0.3, 0.05, 5, 10, Math.PI), bm, -0.3 + k * 0.2, 0.1, 0, b, 0).rotation.y = Math.PI / 2;
    w.put(pl, b, LL(-50 + i * 19, 40 + i * 53), 0, i);
  }
  [[-8, -8], [10, 6], [-6, 22]].forEach(([la, lo]) => lamp(w, pl, LL(la, lo), 0xffb03a, 2.8));
  sign(w, pl, LL(12, -6), textBoard('DUINENRIJK', 3.4, 0.9, '#c87a4a', '#fff8ec'), 0.3, 2.6);
  sign(w, pl, LL(-12, 14), textBoard('DARK SAND = SLOW', 2.8, 0.7, '#fff8ec', '#8a5a34'), -0.4, 1.8);

  // ---------- A: the pyramid (north) ----------
  const TP = LL(48, 150);
  const steps = [[4.0, 1.2], [3.2, 2.4], [2.4, 3.6], [1.6, 4.8], [0.9, 6.0]].map(([s, h]) => w.addPlatform(pl, { dir: TP, hx: s, hz: s, h, color: 0xe0b070, top: 0xf0c888 }));
  [0, 1, 2, 3].forEach((i) => coinOn(w, steps[i], 1));
  questItem(w, ctx, pl, TP, 7.0, 'scarab1', buildScarab());
  mk(new THREE.OctahedronGeometry(0.4), basic(0xffd23a), 0, 0, 0, steps[4].mesh, 0).position.set(0, 6.5, 0);
  w.addPlatform(pl, { dir: frameDir(TP, 90 - 4, 45), r: 0.8, h: 8.6, float: true, thick: 0.3, color: 0xe0b070, crumble: true });
  w.addPlatform(pl, { dir: frameDir(TP, 90 - 7, 70), r: 0.8, h: 10.2, float: true, thick: 0.3, color: 0xe0b070, crumble: true });
  rareItem(w, ctx, pl, frameDir(TP, 90 - 7, 70), 11.2, 'farah-r1', 'High above the pyramid');

  // ---------- B: the obelisk (west): floating stones circle round it ----------
  const T0 = LL(22, -40);
  { const ob = new THREE.Group(); mk(new THREE.BoxGeometry(1.4, 9, 1.4), toon(0xc87a4a), 0, 4.5, 0, ob, 1.04); mk(new THREE.ConeGeometry(1.0, 1.2, 4), basic(0xffd23a), 0, 9.6, 0, ob, 1.06).rotation.y = Math.PI / 4; w.put(pl, ob, T0, 0); w.addSolid(pl, T0, 0.9, 9); }
  const ring = [];
  for (let i = 0; i < 6; i++) ring.push(w.addPlatform(pl, { dir: frameDir(T0, 90 - 7.5, i * 60), r: 1.05, h: 1.4 + i * 1.3, float: true, thick: 0.4, color: 0xe0b070, top: 0xf0c888, orbit: [T0, 0.35] }));
  ring.forEach((pf) => coinOn(w, pf));
  const obTop = w.addPlatform(pl, { dir: T0, r: 1.3, h: 9.6, float: true, thick: 0.4, color: 0xc87a4a, top: 0xffd23a });
  questItem(w, ctx, pl, frameDir(T0, 90 - 1.5, 0), 10.6, 'scarab2', buildScarab());
  void obTop;

  // ---------- C: the oasis with a stone arch (south-east) ----------
  const OA = LL(-22, 78);
  { const pond = new THREE.Mesh(new THREE.CircleGeometry(3, 24), basic(0x3aa8c8)); pond.rotation.x = -Math.PI / 2; const h = new THREE.Group(); h.add(pond); pond.position.y = 0.03; w.put(pl, h, OA, 0); }
  [[0, 0], [60, 0], [140, 0], [220, 0], [300, 0]].forEach(([a], i) => palm(w, pl, frameDir(OA, 90 - 9, a), 0x8a5a34, 0x3aa84a, 4 + (i % 2)));
  const arch = [[-8, 70, 1.4, 1.0], [-11, 73, 2.6, 1.0], [-14, 76, 3.8, 1.0], [-18, 79, 5.0, 1.4], [-22, 82, 3.8, 1.0], [-25, 85, 2.6, 1.0]].map(([la, lo, h, r]) => w.addPlatform(pl, { lat: la, lon: lo, r, h, float: true, thick: 0.6, color: 0xc87a4a, top: 0xe0a060 }));
  arch.slice(0, 3).forEach((pf) => coinOn(w, pf));
  questItem(w, ctx, pl, arch[3].n, 6.0, 'scarab3', buildScarab());

  // ---------- Launch Star between two sphinx-ish statues ----------
  const gate = new THREE.Group();
  for (const s of [-1, 1]) { mk(new THREE.BoxGeometry(0.9, 1.4, 1.8), toon(0xe0b070), 1.9 * s, 0.7, 0, gate, 1.05); mk(new THREE.BoxGeometry(0.8, 0.9, 0.7), toon(0xe0b070), 1.9 * s, 1.8, 0.6, gate, 1.05); mk(new THREE.ConeGeometry(0.4, 0.5, 4), basic(0x14a8a0), 1.9 * s, 2.5, 0.6, gate, 0); }
  w.put(pl, gate, LL(-4, 254), 0);
  w.launchStar = w.addLaunchStar(pl, LL(-6, 244), { label: 'Launch to the Zandkuil!', lockedText: 'Farah needs her 5 golden scarabs, and the Launch Star needs 3 star shards', use: () => ctx.toArena(w) });
  w.unlockLaunch = () => w.launchStar.setActive(true);
  if (ctx.ws(w).fstate === 'done') w.unlockLaunch();

  // ---------- secrets ----------
  w.addPlatform(pl, { lat: -82, lon: 0, r: 2, h: 1.2, float: true, color: 0xc87a4a, top: 0xe0a060, bob: [0.5, 1, 0] });
  rareItem(w, ctx, pl, LL(-90, 0), 2.4, 'farah-r2', 'Under the desert');
  w.addPlatform(pl, { dir: OA, r: 1.0, h: 0.4, color: 0x3a8a3a, top: 0xff5ab4, bounce: 22, puff: 0x3aa8c8 });
  w.addPlatform(pl, { dir: frameDir(OA, 90 - 2.5, 200), r: 1.0, h: 6.4, float: true, thick: 0.3, color: 0x3aa84a, top: 0x5cc84a, bob: [0.3, 1, 1] });
  rareItem(w, ctx, pl, frameDir(OA, 90 - 2.5, 200), 7.4, 'farah-r3', 'High over the oasis');
  coinRing(w, pl, LL(-90, 0), 5, 8);
  coinRing(w, pl, LL(0, 0), 4.5, 8);
  coinLine(w, pl, LL(20, 190), LL(26, 240), 5);
  coinLine(w, pl, LL(-4, 30), LL(-10, 46), 4);

  // ---------- De Zandloper: a parkour over a bottomless void, through a tomb door ----------
  const tomb = new THREE.Group();
  mk(new THREE.BoxGeometry(3.6, 3.0, 1.2), toon(0xe0b070), 0, 1.5, 0, tomb, 1.04);
  mk(new THREE.BoxGeometry(1.6, 2.0, 0.1), basic(0x1a0e04), 0, 1.0, 0.62, tomb, 0);
  mk(new THREE.ConeGeometry(2.6, 1.4, 4), toon(0xc87a4a), 0, 3.7, 0, tomb, 1.04).rotation.y = Math.PI / 4;
  const tombSign = textBoard('ZANDLOPER', 2.4, 0.6, '#c87a4a', '#fff8ec'); tombSign.position.set(0, 2.5, 0.65); tomb.add(tombSign);
  w.put(pl, tomb, LL(-16, -26), 0, 0.5); w.addSolid(pl, LL(-17, -27), 1.2, 3);
  addParkour(w, ctx, {
    home: pl, entryDir: LL(-16, -26), entryPrompt: '<kbd>E</kbd> enter the Zandloper', exitDir: LL(-11, -19), exitFwd: LL(0, 0),
    title: 'De Zandloper', sub: 'Mind the void. Scarab beacons are checkpoints.', voidText: 'Into the void! Back to the last scarab beacon.',
    rareId: 'farah-r4', rareName: 'The end of the Zandloper', marker: () => buildBeacon(0xc87a4a, 0xffd23a),
    theme: {
      sky: 'radial-gradient(ellipse at 50% 40%,#3a2a14 0%,#1a1208 55%,#060402 100%)',
      dome: [0x8a6a3a, 0x5a4a2a, 0x3a2a14, 0xffd23a], gems: [0xffd23a, 0x14a8a0, 0xff7a3a], core: 0x2a1a08, glow: 0xffd23a,
      plat: 0xc87a4a, platTop: 0xf0c888, alt: 0xe0b070, crumble: 0xd8a060, bounce: 0xff5ab4, puff: 0xffd23a, cpTop: 0xffd23a, finTop: 0xffd23a, signFg: '#ffd23a', signBg: '#2a1a08',
    },
    route: [['hop', 3], ['circle', 2], ['zig', 3], ['cp'], ['crumble', 4], ['bob', 2], ['cp'], ['bounce'], ['zig', 2], ['gap'], ['down', 2], ['hop', 2]],
  });

  // ---------- enemies: scorpions and tumbleweeds ----------
  [[-50, 120], [10, 70], [20, 40], [-10, 170], [50, 290], [-30, 320], [34, -80]].forEach(([la, lo]) => w.addEnemy(pl, LL(la, lo), 'scorpion', { roam: 0.15 }));
  [[-20, 140], [30, 110], [40, 230], [-40, 60], [0, 300]].forEach(([la, lo]) => w.addEnemy(pl, LL(la, lo), 'tumble', { roam: 0.2 }));

  // ---------- boss ----------
  // ---------- more: golden scarabs 4 and 5, and Omar ----------
  addMore(w, ctx, pl, {
    item: () => buildScarab(), prefix: 'scarab', color: 0xc87a4a, top: 0xf0c888,
    local: {
      id: 'omar', name: 'Omar', who: 'OMAR',
      model: buildLocal({ s: 0.8, skin: 0xb07a50, shirt: 0xfff8ec, pants: 0x8a6a4a, hair: 0x1a1010, hat: 'cap', capC: 0x3a8ad8 }),
      anim: (dt, t, n) => { n.model.arms[1].rotation.x = -1.8 + Math.sin(t * 3) * 0.3; },
      task: { type: 'fetch', model: buildTrinket('bottle'), banner: 'OMAR’S WATER BOTTLE!', found: 'My bottle! Bring it back before it gets warm!' },
      first: [
        ['OMAR', 'Salaam! I’m Omar. I sell cold drinks to the people at the dig site.'],
        ['OMAR', 'A sandstorm blew my biggest water bottle up onto the dune steps up north. Without it, everyone gets thirsty. Can you fetch it?'],
      ],
      progress: () => [['OMAR', 'My water bottle is on the dune steps up north. Stay out of the sun!']],
      done: [['OMAR', 'My bottle! And it’s still cold. Amazing.'], ['OMAR', 'Here, a star shard. I found it in the sand. And drinks are on me!']],
      after: [['OMAR', 'Cold drinks! Cold drinks! The first one is free for heroes.']],
      bubbles: { new: ['Salaam!', 'So thirsty…', 'My bottle…'], progress: ['Up north!', 'The dune steps!', 'Stay cool!'], done: ['Cold drinks!', 'Thank you!', '*pours a drink*'] },
    },
  });

  w.boss = new Gruizel(w, arena);
  w.hitLines = [['FARAH', '(radio) Right on the head! Karel is cheering! …Chewing. Same thing.'], ['FARAH', '(radio) He’s angry now! He’ll hunt you faster. Keep moving!']];
  w.winLines = [
    ['GRUIZEL', '*BURP* …Okay. You win, tiny bubble. Here. The Zandkern. Bit sandy.'],
    ['GRUIZEL', 'I wasn’t trying to eat the dig site. I just like old stuff. It’s crunchy.'],
    ['RENAS-1', 'Fuel secured: the Zandkern. Range: still not enough. Next signal: De Koraalzee. It’s… underwater?'],
    ['RÊNAS', 'Underwater? Good thing my helmet is a fishbowl!'],
  ];
  return w;
}
