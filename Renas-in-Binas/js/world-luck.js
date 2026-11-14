import { World, planetStem, addStars, addBackdropPlanet, LL, frameDir, V3, toon, basic, mk, THREE, surf, coinRing, coinLine, coinOn, crystal, rock, lamp, sign, addRocket, questItem, rareItem, setupFriend, setupLocal, addMore } from './worlds-common.js?v=20261114j';
import { fbm } from './world.js?v=20261114j';
import { buildFionn, buildLuckyStone, buildHorseshoe, textBoard, buildLocal } from './models.js?v=20261114j';
import { Lorcan } from './bosses.js?v=20261114j';
import { addParkour, buildBeacon } from './parkour.js?v=20261114j';
import { duelModels } from './duels.js?v=20261114j';

// World 4 on the route: SMARAGDEILAND. Fionn's green island: Irish hills, very old rocks and a lot of luck.
// Boss: Lorcan Pech, the Bad-Luck Leprechaun, on the Rainbow Ring.
const RAINBOW = [0xff4a4a, 0xff9a2a, 0xffd23a, 0x5cd85a, 0x3a9aff, 0x8a5aff];
export function buildLuck(ctx) {
  const w = new World('fionn');
  Object.assign(w, {
    index: 4, title: 'Smaragdeiland', sub: 'Rocks, rainbows and a whole lot of luck.', friendName: 'Fionn',
    arenaTitle: 'De Regenboogring', arenaSub: 'Lorcan is shuffling his pots',
    sky: 'linear-gradient(180deg,#2a6ab0 0%,#6aaee0 40%,#bfe8d0 78%,#fff2c8 100%)',
    arenaSky: 'linear-gradient(180deg,#0e2a1a 0%,#1a5a3a 45%,#5aa84a 80%,#ffd23a 100%)',
    music: 'luck', bossMusic: 'boss5', lights: [0xffffff, 0x3a7a4a],
    quest: { icon: '🍀', label: 'Lucky stones', got: 0, need: 3 },
  });
  w.quest.got = ctx.ws(w).items.length;
  addStars(w, 500);
  addBackdropPlanet(w, V3(200, 100, -120), 22, 0x5cd85a, 0xffd23a);
  addBackdropPlanet(w, V3(-180, -70, 160), 15, 0x8a8a7a);

  const g1 = new THREE.Color(0x5cc85a), g2 = new THREE.Color(0x3aa84a), g3 = new THREE.Color(0x2a8a3a), wall = new THREE.Color(0xa8a898), clover = new THREE.Color(0x1f7a2f), path = new THREE.Color(0xd8c89a);
  const pl = w.addPlanet({
    c: V3(0, 0, 0), r: 24, shape: 'appel', atmo: 0xbfffd0, atmoOp: 0.1,
    paint: (p, out) => {
      const n = fbm(p, 2.4);
      out.copy(n > 0.6 ? g1 : n > 0.45 ? g2 : g3);
      if (fbm(p, 6) > 0.74) out.copy(clover);                                   // clover patches
      const lon = Math.atan2(p.x, p.z);
      if (Math.abs(Math.sin(lon * 5 + n * 3)) < 0.03 && p.z < 0.9) out.copy(wall);   // old stone walls over the hills
      if (p.z > 0.965 && Math.abs(p.x) < 0.05) out.copy(path);
    },
  });
  w.main = pl;
  planetStem(w, pl, { h: 4.5, color: 0x6a4a2a, leaf: 0x3aa84a });   // Smaragdeiland is an apple: stem and leaf on top
  const m1 = new THREE.Color(0x4aa84a), m2 = new THREE.Color(0x2a7a3a), mg = new THREE.Color(0xffd23a);
  const arena = w.addPlanet({
    c: V3(0, 30, -120), r: 14, atmo: 0xffd23a, atmoOp: 0.14,
    paint: (p, out) => { const n = fbm(p, 3); out.copy(Math.abs(n - 0.5) < 0.018 ? mg : n > 0.5 ? m1 : m2); },
  });
  w.arena = arena;
  w.spawn = { dir: LL(0, 0), fwd: V3(0, 1, 0) };
  w.arenaSpawn = { dir: arena.c.clone().negate().normalize(), fwd: V3(0, 1, 0) };
  addRocket(w, ctx, pl, LL(-4, 9));
  // a big rainbow arching over the Rainbow Ring
  for (let i = 0; i < RAINBOW.length; i++) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(19 - i * 0.6, 0.3, 6, 64, Math.PI), basic(RAINBOW[i], { transparent: true, opacity: 0.8 }));
    t.position.copy(arena.c); t.rotation.y = 0.6; w.group.add(t);
  }

  // ---------- Fionn at his dig site ----------
  const fionn = buildFionn();
  const npc = w.addNPC(pl, fionn, LL(5, 12), { name: 'Fionn', bubbleY: 2.0, anim: (dt, t, n) => {
    const s = (t % 2.4) / 2.4;                                   // tap tap tap on a rock with the hammer
    n.model.arms[1].rotation.x = s < 0.5 ? -0.8 - Math.abs(Math.sin(s * Math.PI * 6)) * 0.6 : -0.4;
    n.model.arms[0].rotation.x = -0.9;                          // holding the magnifying glass up
    n.model.head.rotation.x = 0.2;
  } });
  const dig = new THREE.Group();
  for (let i = 0; i < 5; i++) mk(new THREE.DodecahedronGeometry(0.25 + (i % 2) * 0.12), toon([0x8a8a7a, 0x5cd85a, 0xa8a898, 0xffd23a, 0x6a6a5a][i]), Math.sin(i * 1.3) * 0.9, 0.2, Math.cos(i * 1.3) * 0.7, dig, 1.08);
  mk(new THREE.BoxGeometry(0.7, 0.4, 0.5), toon(0x8a5a34), -0.9, 0.2, -0.4, dig, 1.06);   // a crate of samples
  w.put(pl, dig, LL(7, 16), 0, 0.3);
  setupFriend(w, ctx, npc, {
    name: 'Fionn',
    first: [
      ['FIONN', 'Well hello there! Watch your step, that rock is four hundred million years old. Older than my granny. Just about.'],
      ['RÊNAS', 'Are you a… rock scientist?'],
      ['FIONN', 'A geologist! Fionn, from Ireland. Rocks, crystals, fossils. And luck. Mostly luck.'],
      ['FIONN', 'Every geologist needs a bit of luck. You never know which rock has a crystal inside until you crack it open.'],
      ['FIONN', 'But my luck ran out this morning. A leprechaun called Lorcan Pech nicked my three lucky stones. And with them, all the luck on the island.'],
      ['FIONN', 'Now everything goes wrong. Rocks roll uphill. Toast lands butter-side down. Sheep walk backwards.'],
      ['RÊNAS', 'A leprechaun? Like, with a pot of gold?'],
      ['FIONN', 'Three pots, actually. He hides in one and shuffles them. He also grabbed one of your cores. A four-leaf clover started glowing inside it, so now he calls it the Klaverkern. Lucky core, that.'],
      ['FIONN', 'He dropped my stones while running off. One is on top of the Giant’s Causeway in the west. One is at the top of the rainbow. One is on the sea cliffs up north.'],
      ['FIONN', 'And Saoirse and Paddy each found a star shard in the hills. Give them a hand and they’ll give them to you. Sure look, that’s how it works around here.'],
    ],
    progress: (got) => [['FIONN', `Lucky stones: ${got}/5. The Giant’s Causeway, the top of the rainbow, and the sea cliffs.`]],
    needLocals: (left) => [['FIONN', `All five lucky stones! Grand! But the Launch Star still needs star shards. ${left.join(' and ')} still need${left.length === 1 ? 's' : ''} you. Look for the yellow “!”.`]],
    done: [
      ['FIONN', 'My lucky stones! Feel that? That’s the luck coming back. A sheep just walked forwards!'],
      ['FIONN', 'The Launch Star is awake. It takes you to the Rainbow Ring. That’s where Lorcan is.'],
      ['FIONN', 'He hides in one of his three pots and shuffles them around. Keep your eyes on the right one.'],
      ['FIONN', 'A geologist’s tip: the pot with him inside is heavier. It sits a bit lower, and it hiccups. Land on that pot, or ground pound it!'],
      ['FIONN', 'And mind the boulders. Bad luck rolls downhill. Fast.'],
    ],
    after: [['FIONN', 'Watch the pot that hiccups. Then pound it. Science and luck, lad. Science and luck.']],
    bubbles: {
      new: ['Mind the rocks!', 'What’s the craic?', '*taps a rock with a hammer*'],
      progress: ['My lucky stones…', 'That rock is older than my granny.', 'Bad luck everywhere.', 'Psst. The Lucky Cave has a golden gear at the end.'],
      done: ['To the Launch Star!', 'Watch the hiccup!', 'Sláinte!'],
    },
  });

  // ---------- the locals ----------
  setupLocal(w, ctx, {
    id: 'saoirse', name: 'Saoirse', who: 'SAOIRSE', dir: LL(-10, -18), bubbleY: 1.9,
    model: buildLocal({ s: 0.68, skin: 0xf6d8c0, shirt: 0x2a9a4a, pants: 0x3a3e4e, hair: 0xb84a1a, hat: 'curls', shoes: 0x5a3a20 }),
    anim: (dt, t, n) => { n.model.arms[1].rotation.x = -1.2 + Math.sin(t * 8) * 0.15; n.model.arms[0].rotation.x = -1.0; n.model.head.rotation.z = Math.sin(t * 2) * 0.1; },   // fiddling
    task: { type: 'fetch', dir: LL(-32, -60), alt: 6.1, model: buildHorseshoe(), banner: 'GOLDEN HORSESHOE!', found: 'You found my horseshoe! Bring it back, quick, before the luck runs out!' },
    first: [
      ['SAOIRSE', 'Ah no, not another bit of bad luck! Oh, hello. I’m Saoirse. Say it like “Seer-sha”.'],
      ['SAOIRSE', 'My golden horseshoe brings luck to the whole village. Lorcan kicked it right up onto the old stone table on the hill.'],
      ['SAOIRSE', 'Bounce on the lucky clover next to it to get up there. Bring it back and my star shard is yours.'],
    ],
    progress: () => [['SAOIRSE', 'The horseshoe is on top of the old stone table in the stone circle. Bounce on the clover!']],
    done: [
      ['SAOIRSE', 'My horseshoe! Hang it the right way up, or the luck falls out.'],
      ['SAOIRSE', 'Here’s the star shard. Found it in a four-leaf clover patch. Lucky, wasn’t I?'],
    ],
    after: [['SAOIRSE', 'I’ve been playing my fiddle for the sheep. They love it. Paddy says they’re just hungry.']],
    bubbles: { new: ['Oh no…', 'My horseshoe!', 'Hello!'], progress: ['The stone table!', 'Bounce on the clover!', 'Luck, come back…'], done: ['Lucky again!', 'Thank you!', '*plays the fiddle*'] },
  });
  // the stone circle with the old stone table (a dolmen) in the middle
  for (let i = 0; i < 8; i++) {
    const d = frameDir(LL(-32, -60), 90 - 6, i * 45);
    const st = new THREE.Group(); mk(new THREE.BoxGeometry(0.8, 2.6, 0.5), toon(0xa8a898), 0, 1.3, 0, st, 1.05); w.put(pl, st, d, 0, i * 0.8); w.addSolid(pl, d, 0.45, 2.6);
  }
  for (const [x, z] of [[-1, -0.6], [1, -0.6], [0, 0.8]]) { const leg = new THREE.Group(); mk(new THREE.BoxGeometry(0.5, 4.6, 0.5), toon(0x8a8a7a), x, 2.3, z, leg, 1.05); w.put(pl, leg, LL(-32, -60), 0); }
  w.addPlatform(pl, { lat: -32, lon: -60, hx: 1.6, hz: 1.4, h: 5.0, b: 4.4, color: 0x9a9a8a, top: 0x6a8a5a });
  w.addPlatform(pl, { lat: -26, lon: -54, r: 1.3, h: 0.4, color: 0x2a9a4a, top: 0x5cd85a, bounce: 21, puff: 0x5cd85a });   // the lucky clover
  setupLocal(w, ctx, {
    id: 'paddy', name: 'Paddy', who: 'PADDY', dir: LL(12, 26), bubbleY: 2.0,
    model: buildLocal({ s: 0.8, skin: 0xf0c0a0, shirt: 0x8a6a4a, pants: 0x3a4a3a, hat: 'cap', capC: 0x5a5a4a, beard: 0xa8a8a8, shoes: 0x3a2a1a }),
    anim: (dt, t, n) => { n.model.arms[1].rotation.x = -0.3 + Math.sin(t * 1.5) * 0.1; n.model.body.rotation.z = Math.sin(t * 1.1) * 0.04; },
    task: { type: 'duel', game: 'hop', target: 8, time: 28, window: 2.6, tiles: 6, color: 0x5cd85a, model: duelModels.clover, winTitle: 'CLOVER CHAMP!', found: 'Eight clovers! You beat my record! Come back, lad, I owe you one!', lost: 'Not quite eight, lad. My record stands! Talk to me for another go.' },
    first: [
      ['PADDY', 'Grand day for it. Well. It was.'],
      ['PADDY', 'Paddy. Sheep farmer. Ever since the luck went, the lucky clovers pop up and vanish before my sheep can eat them.'],
      ['PADDY', 'Only one way to catch them: be quick. My record is seven in one go. Seven! Nobody’s beaten it.'],
      ['RÊNAS', 'Seven? I can do eight.'],
      ['PADDY', 'Ha! Step on each clover that lights up before it fades. Get eight and the star shard I found is yours.'],
    ],
    progress: () => [['PADDY', 'Another go? Eight clovers, lad. Watch for the glow.']],
    done: [
      ['PADDY', 'Eight! You beat my record! Listen to the sheep. That’s happy baa-ing, that is.'],
      ['PADDY', 'Here’s the star shard. My best sheep, Dolly, found it. She wants a thank-you. Baa.'],
    ],
    after: [['PADDY', 'Count my sheep with me? One… two… *snore*']],
    bubbles: { new: ['Grand day.', 'My clover…', 'Beat my record?'], progress: ['Another go?', 'Watch the glow!', 'Eight clovers!'], done: ['Record breaker!', 'Good lad.', 'Baaa!'] },
  });

  // ---------- decor: sheep, standing stones, clover, a pub sign ----------
  const sheep = (dir, yaw) => {
    const g = new THREE.Group();
    const wool = toon(0xf8f8f0), face = toon(0x2b2440);
    mk(new THREE.SphereGeometry(0.5, 12, 10), wool, 0, 0.6, 0, g, 1.06).scale.set(1, 0.85, 1.3);
    for (let i = 0; i < 5; i++) mk(new THREE.SphereGeometry(0.22, 8, 6), wool, Math.sin(i * 1.3) * 0.35, 0.9, Math.cos(i * 1.3) * 0.45, g, 0);
    mk(new THREE.SphereGeometry(0.2, 10, 8), face, 0, 0.7, 0.62, g, 1.08).scale.set(0.9, 1.1, 1);
    for (const [x, z] of [[-0.25, 0.35], [0.25, 0.35], [-0.25, -0.35], [0.25, -0.35]]) mk(new THREE.CylinderGeometry(0.06, 0.06, 0.4), face, x, 0.2, z, g, 0);
    w.put(pl, g, dir, 0, yaw); w.addSolid(pl, dir, 0.6, 1.2);
    const ph = Math.random() * 6; w.updaters.push((dt, t) => { g.children[0].position.y = 0.6 + Math.abs(Math.sin(t * 2 + ph)) * 0.03; });
  };
  [[-30, 36], [-40, 50], [-28, 54], [-44, 40], [20, -60], [24, 200], [-12, 260]].forEach(([la, lo], i) => sheep(LL(la, lo), i * 1.7));
  [[16, -30], [-50, 160], [10, 230], [-10, 280], [50, 300], [40, -80], [-60, 60]].forEach(([la, lo], i) => rock(w, pl, LL(la, lo), 0.9 + (i % 3) * 0.4, 0x9a9a8a));
  [[20, 160, 0x5cd85a], [-40, 230, 0xffd23a], [54, 250, 0x5cd85a]].forEach(([la, lo, c], i) => crystal(w, pl, LL(la, lo), c, 0.9 + i * 0.3));
  [[-8, -8], [10, 6], [-6, 22]].forEach(([la, lo]) => lamp(w, pl, LL(la, lo), 0xffd23a, 2.8));
  sign(w, pl, LL(12, -6), textBoard('SMARAGDEILAND', 3.4, 0.9, '#2a9a4a', '#fff8ec'), 0.3, 2.6);
  sign(w, pl, LL(-12, 14), textBoard('THE LUCKY ROCK ▸', 2.8, 0.7, '#fff8ec', '#2a7a3a'), -0.4, 1.8);
  // floating four-leaf clovers
  for (let i = 0; i < 9; i++) {
    const c = new THREE.Group();
    for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2; mk(new THREE.SphereGeometry(0.35, 10, 8), toon(0x5cd85a), Math.cos(a) * 0.35, Math.sin(a) * 0.35, 0, c, 1.08).scale.z = 0.4; }
    w.put(pl, c, LL(-60 + i * 14, i * 41), 8 + (i % 3) * 2, i);
    w.updaters.push((dt) => { c.rotation.z += dt * 0.8; });
  }

  // ---------- A: the Giant's Causeway (west): hexagonal basalt columns ----------
  const basalt = 0x3a3a44, basaltTop = 0x5a5a68;
  const cw = [[14, -12, 1.2], [19, -18, 2.2], [24, -24, 3.2], [28, -31, 4.4], [31, -39, 5.6]].map(([la, lo, h]) => w.addPlatform(pl, { lat: la, lon: lo, r: 1.35, h, sides: 6, color: basalt, top: basaltTop }));
  cw.slice(0, 4).forEach((pf) => coinOn(w, pf));
  for (let i = 0; i < 14; i++) { const d = frameDir(LL(24, -26), 90 - (3 + (i % 4) * 2.4), i * 51); w.addPlatform(pl, { dir: d, r: 1.2, h: 0.4 + (i % 5) * 0.45, sides: 6, color: basalt, top: basaltTop }); }
  questItem(w, ctx, pl, cw[4].n, 6.7, 'stone1', buildLuckyStone(0x2ad85a));

  // ---------- B: up the rainbow (south-east) ----------
  const rb = [[-8, 60, 1.4], [-12, 68, 2.4], [-16, 76, 3.4], [-20, 84, 4.4], [-24, 92, 5.4], [-28, 100, 6.4]].map(([la, lo, h], i) => w.addPlatform(pl, { lat: la, lon: lo, r: 1.3, h, float: true, thick: 0.4, color: RAINBOW[i], top: 0xffffff, ...(i === 2 || i === 4 ? { bob: [0.35, 1.6, i] } : {}) }));
  rb.slice(0, 5).forEach((pf) => coinOn(w, pf));
  questItem(w, ctx, pl, rb[5].n, 7.5, 'stone2', buildLuckyStone(0xffd23a));

  // ---------- C: the sea cliffs (north) ----------
  const cl1 = w.addPlatform(pl, { lat: 50, lon: 54, hx: 1.5, hz: 1.5, h: 2.4, color: 0x8a8a7a, top: 0x4aa84a });
  const cl2 = w.addPlatform(pl, { lat: 56, lon: 66, r: 1.2, h: 3.8, float: true, color: 0xa8a898, crumble: true });
  const cl3 = w.addPlatform(pl, { lat: 62, lon: 56, r: 1.2, h: 4.4, float: true, color: 0xa8a898, crumble: true });
  const cl4 = w.addPlatform(pl, { lat: 68, lon: 66, hx: 1.6, hz: 1.6, h: 5.8, color: 0x8a8a7a, top: 0x4aa84a });
  [cl1, cl2, cl3].forEach((pf) => coinOn(w, pf));
  questItem(w, ctx, pl, cl4.n, 6.9, 'stone3', buildLuckyStone(0xff5ab4));
  w.addPlatform(pl, { lat: 78, lon: 66, r: 1.1, h: 7.4, float: true, color: 0xa8a898, crumble: true });
  rareItem(w, ctx, pl, LL(78, 66), 8.4, 'fionn-r3', 'On top of the sea cliffs');

  // ---------- Launch Star under a stone arch ----------
  const arch = new THREE.Group();
  for (const s of [-1, 1]) mk(new THREE.BoxGeometry(0.7, 3, 0.7), toon(0xa8a898), 1.6 * s, 1.5, 0, arch, 1.05);
  mk(new THREE.BoxGeometry(4.2, 0.6, 0.8), toon(0x8a8a7a), 0, 3.2, 0, arch, 1.05);
  w.put(pl, arch, LL(-6, 204), 0);
  w.launchStar = w.addLaunchStar(pl, LL(-8, 194), { label: 'Launch to the Rainbow Ring!', lockedText: 'Fionn needs his 5 lucky stones, and the Launch Star needs 3 star shards', use: () => ctx.toArena(w) });
  w.unlockLaunch = () => w.launchStar.setActive(true);
  if (ctx.ws(w).fstate === 'done') w.unlockLaunch();

  // ---------- secrets: the end of the rainbow ----------
  for (let i = 0; i < RAINBOW.length; i++) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(10 - i * 0.35, 0.18, 6, 48, Math.PI), basic(RAINBOW[i], { transparent: true, opacity: 0.75 }));
    const holder = new THREE.Group(); holder.add(t); t.rotation.y = Math.PI / 2;
    w.put(pl, holder, LL(-52, 150), -0.4);
  }
  w.addPlatform(pl, { lat: -46, lon: 140, r: 1.3, h: 0.4, color: 0x2a9a4a, top: 0x5cd85a, bounce: 21, puff: 0xffd23a });
  const endR = w.addPlatform(pl, { lat: -56, lon: 140, r: 1.6, h: 5.8, float: true, thick: 0.8, color: 0xf8f8f0, top: 0xffffff });
  { const pot = new THREE.Group(); mk(new THREE.CylinderGeometry(0.55, 0.42, 0.7, 14), toon(0x23232e), 0, 0.35, 0, pot, 1.06); mk(new THREE.SphereGeometry(0.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon(0xffd23a), 0, 0.68, 0, pot, 0); pot.position.set(0.6, endR.h, 0.6); endR.mesh.add(pot); }
  rareItem(w, ctx, pl, endR.n, 7.0, 'fionn-r1', 'At the end of the rainbow');
  w.addPlatform(pl, { lat: -82, lon: 0, r: 2, h: 1.2, float: true, color: 0x8a8a7a, bob: [0.5, 1, 0] });
  rareItem(w, ctx, pl, LL(-90, 0), 2.4, 'fionn-r2', 'Under the island');
  coinRing(w, pl, LL(-90, 0), 5, 8);
  coinRing(w, pl, LL(0, 0), 4.5, 8);
  coinLine(w, pl, LL(30, 200), LL(30, 260), 5);
  coinLine(w, pl, LL(-4, 40), LL(-8, 56), 4);

  // ---------- De Geluksgrot: a parkour over a bottomless void, inside the hill ----------
  const cave = new THREE.Group();
  mk(new THREE.SphereGeometry(2.3, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), toon(0x3aa84a), 0, 0, 0, cave, 1.04);
  mk(new THREE.CircleGeometry(1.2, 18), basic(0x0e1a10), 0, 0.9, 2.15, cave, 0);
  for (const s of [-1, 1]) mk(new THREE.BoxGeometry(0.4, 2.2, 0.4), toon(0xa8a898), 1.4 * s, 1.1, 1.9, cave, 1.05);
  mk(new THREE.BoxGeometry(3.2, 0.4, 0.5), toon(0xa8a898), 0, 2.3, 1.9, cave, 1.05);
  const caveSign = textBoard('LUCKY CAVE', 2.4, 0.6, '#2a9a4a', '#fff8ec'); caveSign.position.set(0, 2.95, 1.9); cave.add(caveSign);
  w.put(pl, cave, LL(-16, -32), 0, 0.5);
  addParkour(w, ctx, {
    home: pl, entryDir: LL(-16, -32), entryPrompt: '<kbd>E</kbd> enter the Lucky Cave', exitDir: LL(-11, -25), exitFwd: LL(0, 0),
    title: 'De Geluksgrot', sub: 'Mind the void. Clover beacons are checkpoints.', voidText: 'Into the void! Back to the last clover beacon.',
    rareId: 'fionn-r4', rareName: 'The end of the Lucky Cave', marker: () => buildBeacon(0xa8a898, 0x5cd85a),
    theme: {
      sky: 'radial-gradient(ellipse at 50% 40%,#1a3a1a 0%,#0e1a10 55%,#030604 100%)',
      dome: [0x4a5a3a, 0x2a3a2a, 0x1a2418, 0xffd23a], gems: [0x5cd85a, 0xffd23a, 0xff5ab4], core: 0x0e2a14, glow: 0x5cd85a,
      plat: 0x3a3a44, platTop: 0x4aa84a, alt: 0x8a8a7a, crumble: 0xa8a898, bounce: 0x5cd85a, puff: 0xffd23a, cpTop: 0xffd23a, finTop: 0xffd23a, signFg: '#5cd85a', signBg: '#14281a',
    },
    route: [['hop', 3], ['zig', 3], ['bob', 3], ['cp'], ['circle', 2], ['crumble', 4], ['cp'], ['bounce'], ['down', 3], ['gap'], ['hop', 2]],
  });

  // ---------- enemies: bad-luck boulders and rock gnomes ----------
  [[-20, 170], [30, 110], [-30, 140], [20, 260], [40, -70]].forEach(([la, lo]) => w.addEnemy(pl, LL(la, lo), 'boulder', { roam: 0.2 }));
  [[-40, 270], [-10, 70], [10, 40], [-50, 100], [50, 200], [0, 320], [30, -110]].forEach(([la, lo]) => w.addEnemy(pl, LL(la, lo), 'gnome', { roam: 0.15 }));

  // ---------- boss ----------
  // ---------- more: lucky stones 4 and 5, and Niamh ----------
  addMore(w, ctx, pl, {
    item: () => buildLuckyStone(0x5ef2e0), prefix: 'stone', color: 0x3a3a44, top: 0x4aa84a,
    local: {
      id: 'niamh', name: 'Niamh', who: 'NIAMH',
      model: buildLocal({ s: 0.76, skin: 0xf4d0b0, shirt: 0x4aa84a, pants: 0x6a5a3a, hair: 0xc84a2a }),
      anim: (dt, t, n) => { n.model.body.rotation.z = Math.sin(t * 2) * 0.06; },
      task: { type: 'stomp', enemy: 'gnome', n: 4, found: 'They’re gone! Come back to me!' },
      first: [
        ['NIAMH', 'Top o’ the mornin’! I’m Niamh. I grow four-leaf clovers.'],
        ['NIAMH', 'But four grumpy Pech-Kabouters are stomping all over my clover field up north! Bad luck, that. Can you chase them off?'],
      ],
      progress: (l) => [['NIAMH', `${l.left} Pech-Kabouters left in my clover field up north!`]],
      done: [['NIAMH', 'My clovers! Every single one has four leaves again!'], ['NIAMH', 'Here, a star shard. It was growing between the clovers. Lucky!']],
      after: [['NIAMH', 'I found a five-leaf clover once. Ate it by accident.']],
      bubbles: { new: ['Top o’ the mornin’!', 'My clovers…', 'Kabouters!'], progress: ['Up north!', 'Chase them off!', 'Bad luck!'], done: ['Lucky!', 'Grand!', '*hums a tune*'] },
    },
  });

  w.boss = new Lorcan(w, arena);
  w.hitLines = [['FIONN', '(radio) You found him! That’s science, that is!'], ['FIONN', '(radio) He’s shuffling faster now! Watch the hiccup!']];
  w.winLines = [
    ['LORCAN', 'Alright, alright! You win! Here, take the Klaverkern. And the luck. All of it.'],
    ['LORCAN', 'Nobody ever finds me. Nobody! …Was it the hiccups? It was the hiccups.'],
    ['RATJETOE', 'Fuel secured: the Klaverkern. Luck levels: restored. Range: growing. Next fuel stop: Het Oerwoud.'],
    ['RÊNAS', 'Fionn was right. Science AND luck!'],
  ];
  return w;
}
