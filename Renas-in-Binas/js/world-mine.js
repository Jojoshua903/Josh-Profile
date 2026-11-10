import { World, addStars, addBackdropPlanet, LL, frameDir, V3, toon, basic, mk, THREE, surf, coinRing, coinLine, coinOn, crystal, rock, lamp, sign, addRocket, questItem, rareItem, setupFriend, setupLocal, addMore } from './worlds-common.js?v=20261111l';
import { fbm } from './world.js?v=20261111l';
import { buildLars, buildLantern, textBoard, buildLocal, buildPickaxe } from './models.js?v=20261111l';
import { Gruis } from './bosses.js?v=20261111l';
import { addParkour } from './parkour.js?v=20261111l';

// World 2: DE DIEPE MIJN. Lars' mining planet, full of crystals and rails. Boss: Gruis the ore golem.
export function buildMine(ctx) {
  const w = new World('lars');
  Object.assign(w, {
    index: 1, title: 'De Diepe Mijn', sub: 'Dig deep. Then dig a bit deeper.', friendName: 'Lars',
    arenaTitle: 'De Kristalkern', arenaSub: 'Gruis is hugging your core',
    sky: 'linear-gradient(180deg,#2a1a30 0%,#5a3a4a 35%,#b0704a 72%,#f0c27a 100%)',
    arenaSky: 'linear-gradient(180deg,#140c1e 0%,#3a1e44 45%,#7a3a6a 80%,#ff7ad8 100%)',
    music: 'mine', bossMusic: 'boss2', lights: [0xffe0b0, 0x5a3a2a],
    quest: { icon: '🏮', label: 'Lanterns', got: 0, need: 3 },
  });
  w.quest.got = ctx.ws(w).items.length;
  addStars(w);
  addBackdropPlanet(w, V3(-180, 100, -200), 26, 0xc88a4a, 0x8a5a34);
  addBackdropPlanet(w, V3(220, -40, 80), 12, 0xff7ad8);

  const ochre = new THREE.Color(0xc89050), brown = new THREE.Color(0x9a6a40), dark = new THREE.Color(0x6a4a30), cyan = new THREE.Color(0x5ef2e0), path = new THREE.Color(0xe0b878);
  const pl = w.addPlanet({
    c: V3(0, 0, 0), r: 24, shape: 'aardappel', atmo: 0xffc070, atmoOp: 0.1,
    paint: (p, out) => {
      const n = fbm(p, 2.8);
      out.copy(n > 0.6 ? brown : n > 0.44 ? ochre : dark);
      if (n > 0.8) out.copy(cyan);
      if (Math.abs(p.y + 0.407) < 0.012) out.copy(path);   // under the rails
    },
  });
  w.main = pl;
  const vein = new THREE.Color(0xff7ad8), stone = new THREE.Color(0x3e3050), stone2 = new THREE.Color(0x52406a);
  const arena = w.addPlanet({
    c: V3(0, 30, -120), r: 14, atmo: 0xff7ad8, atmoOp: 0.14,
    paint: (p, out) => { const n = fbm(p, 3.4); out.copy(Math.abs(n - 0.5) < 0.02 ? vein : n > 0.5 ? stone2 : stone); },
  });
  w.arena = arena;
  w.spawn = { dir: LL(0, 0), fwd: V3(0, 1, 0) };
  w.arenaSpawn = { dir: arena.c.clone().negate().normalize(), fwd: V3(0, 1, 0) };
  addRocket(w, ctx, pl, LL(-4, 9));

  // ---------- Lars at his little mine entrance ----------
  const lars = buildLars();
  const npc = w.addNPC(pl, lars, LL(4, -12), { name: 'Lars', bubbleY: 1.9, anim: (dt, t, n) => {
    n.model.arms[1].rotation.x = -0.4 + Math.max(0, Math.sin(t * 3)) * -1.6;   // little pickaxe swings
    n.model.r.position.y = Math.abs(Math.sin(t * 3)) * 0.03;
  } });
  const arch = new THREE.Group();
  for (const s of [-1, 1]) mk(new THREE.BoxGeometry(0.4, 2.6, 0.4), toon(0x8a5a34), 1.4 * s, 1.3, 0, arch, 1.1);
  mk(new THREE.BoxGeometry(3.4, 0.4, 0.5), toon(0x8a5a34), 0, 2.7, 0, arch, 1.1);
  mk(new THREE.PlaneGeometry(2.4, 2.4), basic(0x140c10), 0, 1.2, -0.05, arch, 0);
  const sg = textBoard('LARS’ MIJN', 2.2, 0.6, '#fff8ec', '#5a7ad8'); sg.position.set(0, 3.3, 0.3); arch.add(sg);
  w.put(pl, arch, LL(8, -18), 0, 0.5);
  setupFriend(w, ctx, npc, {
    name: 'Lars',
    first: [
      ['LARS', 'Hey! Down here! …No, lower.'],
      ['RÊNAS', 'Lars! You’re Josh’s best friend!'],
      ['LARS', 'And you’re his little brother! You’re almost as small as me. Almost. I’m still the smallest. I win.'],
      ['LARS', 'Josh once brought my hat back after those cats blew it off my head. All the way over the ravine. Nobody does that for a hat.'],
      ['LARS', 'I moved out of the Paddenstoelenbos. Everyone kept thinking I was a mushroom. Down here, everyone thinks I’m a rock. Progress.'],
      ['RÊNAS', 'Did a giant glowing core fall down here?'],
      ['LARS', 'Straight down the main shaft. Right onto Gruis, the ore golem. He thinks it’s a crystal. He’s been hugging it all day.'],
      ['LARS', 'He’s sweet when he’s asleep. He is not asleep.'],
      ['LARS', 'The shaft is pitch dark, and the Launch Star won’t fly in the dark. Find my three mine lanterns and we’ll light it up.'],
      ['LARS', 'One is past the Crystal Steps, to the west. One is on a high ledge by the rails, so ride the mine cart. One is on the ore pillars up north. Careful: the Kristalkevers charge. Stomp them twice.'],
      ['LARS', 'Oh, and the core’s crash shook star shards loose all over the mine. Opa Gerrit and Kiki each dug one up.'],
      ['LARS', 'No shards, no Launch Star. That’s just science. Help them both and they’ll give theirs to you.'],
    ],
    progress: (got) => [['LARS', `Lanterns: ${got}/5. Crystal Steps to the west, the mine cart ledge to the south, ore pillars up north.`]],
    needLocals: (left) => [['LARS', `Five lanterns! Bright! But the Launch Star is still hungry for star shards. ${left.join(' and ')} still need${left.length === 1 ? 's' : ''} your help. Look for the yellow “!”.`]],
    done: [
      ['LARS', 'Light! Look at that. Josh would love this.'],
      ['LARS', 'The Launch Star by the main shaft is glowing now. It takes you down to the Kristalkern. That’s where Gruis is.'],
      ['LARS', 'Gruis rolls at people. If he rolls into one of the crystal pillars, he gets dizzy and falls over. Then jump on the crystal on his back!'],
      ['LARS', 'If he jumps up high, get away from the red circle. Then jump the shockwave.'],
      ['LARS', 'Tell Josh I said hi. Tell him I’m taller now. Don’t check.'],
      ['LARS', 'And if you ever reach Homerun Heuvel: say hi to Nathan. He’s my best friend. We have a secret handshake. It takes eleven minutes.'],
    ],
    after: [['LARS', 'Make him roll into the pillars. Then: his back. Easy. For you. Not for me. I can’t reach.']],
    bubbles: {
      new: ['Down here!', 'Nope, lower.', '*taps hat proudly*', 'Psst. My mine has a parkour inside. Mind the void!'],
      progress: ['Kristalkevers have hard shells. Stomp twice!', 'Or ground pound them. That works too.', 'This hat has seen things.', 'Try my mine! There’s a golden gear at the bottom of it. Well, the end.'],
      done: ['Go on! Gruis is waiting.', 'Pillars! Roll him into the pillars!', 'You can borrow my hat once. Once.'],
    },
  });

  // ---------- the locals ----------
  setupLocal(w, ctx, {
    id: 'gerrit', name: 'Opa Gerrit', who: 'OPA GERRIT', dir: LL(-14, -40), bubbleY: 1.8,
    model: buildLocal({ s: 0.62, skin: 0xf0c8a0, shirt: 0x8a5a34, pants: 0x3a3e4e, hat: 'helmet', beard: 0xf4f1ea, shoes: 0x5a3a20 }),
    anim: (dt, t, n) => { n.model.body.rotation.x = 0.15; n.model.head.rotation.z = Math.sin(t * 0.8) * 0.08; },
    task: { type: 'fetch', dir: LL(-48, -116), alt: 6.1, model: buildPickaxe(), banner: 'PIKKIE!', found: 'Is that Pikkie? I can see her shine from here! Bring her home, lad!' },
    first: [
      ['OPA GERRIT', 'Eh? Speak up, lad. I’ve been mining since before the stars got their twinkle.'],
      ['OPA GERRIT', 'I’m Lars’ grandpa. Well. Grandpa-ish. Every dwarf down here calls me Opa.'],
      ['OPA GERRIT', 'When that core crashed into the shaft, the BOOM blew my golden pickaxe right out of my hands. Pikkie. Sixty years together.'],
      ['OPA GERRIT', 'She landed on the high rocks. My knees don’t do “high” anymore.'],
      ['OPA GERRIT', 'Bring Pikkie home and you get the star shard I dug up this morning.'],
    ],
    progress: () => [['OPA GERRIT', 'Pikkie is on the high rocks. Mind the crumbly one. Rocks are like people: some just give way.']],
    done: [
      ['OPA GERRIT', 'Pikkie! Oh, look at her shine. Thank you, lad.'],
      ['OPA GERRIT', 'Here’s your star shard. And tell your brother Josh: Lars talks about him every single day. Every. Single. Day.'],
    ],
    after: [['OPA GERRIT', 'In my day we didn’t have Launch Stars. We had ladders. Very long ladders.']],
    bubbles: { new: ['Eh? Who’s there?', 'Where’s my Pikkie…', 'Back in my day…'], progress: ['The high rocks, lad!', 'Mind the crumbly one.', 'Pikkie…'], done: ['Pikkie and me, together again.', 'Good lad.', 'Say hi to Josh.'] },
  });
  w.addPlatform(pl, { lat: -36, lon: -96, hx: 1.3, hz: 1.3, h: 1.8, color: 0x6a4a30, top: 0xc89050 });
  w.addPlatform(pl, { lat: -42, lon: -106, r: 1.3, h: 3.4, float: true, color: 0xffd36a, crumble: true });
  w.addPlatform(pl, { lat: -48, lon: -116, r: 1.5, h: 5.0, color: 0x8a6a4a, top: 0xffd36a });
  setupLocal(w, ctx, {
    id: 'kiki', name: 'Kiki', who: 'KIKI', dir: LL(14, 22), bubbleY: 1.7,
    model: buildLocal({ s: 0.55, skin: 0xf0c8a0, shirt: 0xff7ad8, pants: 0x5a3a20, hair: 0xd9a35a, hat: 'beanie', capC: 0x5ef2e0 }),
    anim: (dt, t, n) => { n.model.r.position.y = Math.max(0, Math.sin(t * 5)) * 0.06; n.model.arms[0].rotation.z = -0.4 - Math.max(0, Math.sin(t * 5)) * 0.5; },
    task: { type: 'stomp', enemy: 'kever', at: LL(-42, 30), n: 3, spread: 5, found: 'They’re gone! The mushrooms are glowing happy! Come back!' },
    first: [
      ['KIKI', 'Shh! Don’t step on the mushrooms! I grow them from spores Lars brought from the Paddenstoelenbos.'],
      ['KIKI', 'They glow, so the mine isn’t so dark. But Kristalkevers keep sneaking into my garden and munching them!'],
      ['KIKI', 'Three of them are in there right now, past the rails. Munch munch munch. Rude!'],
      ['RÊNAS', 'Their shells are hard. I’ll stomp twice.'],
      ['KIKI', 'Or ground pound them! Save my garden and you get my star shard. It’s my best one. My only one.'],
    ],
    progress: (l) => [['KIKI', `${l.left} Kristalkevers still munching in my garden, past the rails! Stomp twice, or ground pound!`]],
    done: [
      ['KIKI', 'My mushrooms are safe! Look, they’re glowing happy!'],
      ['KIKI', 'Here’s the star shard. Don’t lose it. Lars loses everything. Once he lost his hat while it was ON his head.'],
    ],
    after: [['KIKI', 'When I grow up I want to be a mushroom. Lars says that’s not a job. I say it is.']],
    bubbles: { new: ['Shh! Mushrooms!', 'Help!', 'Munch munch… rude!'], progress: ['Past the rails!', 'Stomp twice!', 'My poor mushrooms…'], done: ['They glow again!', 'Thank you!!', 'Mushroom power!'] },
  });
  // Kiki's glowing mushroom garden
  for (let i = 0; i < 9; i++) {
    const m = new THREE.Group(), c = [0x5ef2e0, 0xff7ad8, 0xffd36a][i % 3];
    mk(new THREE.CylinderGeometry(0.08, 0.1, 0.4, 8), toon(0xfff8ec), 0, 0.2, 0, m, 1.1);
    mk(new THREE.SphereGeometry(0.3, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), basic(c), 0, 0.38, 0, m, 1.08);
    w.put(pl, m, frameDir(LL(-42, 30), 90 - 2 - (i % 3) * 3, i * 40), 0, i);
  }

  // ---------- decor ----------
  [[10, 30, 0x5ef2e0], [-14, -30, 0xff7ad8], [30, 50, 0xff7ad8], [-30, 70, 0x5ef2e0], [40, -70, 0x5ef2e0], [-50, -20, 0xff7ad8], [20, 160, 0x5ef2e0], [-40, 220, 0xff7ad8], [50, 250, 0x5ef2e0], [-10, 300, 0xff7ad8], [70, 200, 0xff7ad8], [-70, 140, 0x5ef2e0]].forEach(([la, lo, c], i) => crystal(w, pl, LL(la, lo), c, 0.9 + (i % 3) * 0.3));
  [[16, 10], [-16, 20], [26, -50], [-36, 40], [60, 30], [-60, 250], [36, 210], [-20, 330]].forEach(([la, lo], i) => rock(w, pl, LL(la, lo), 0.9 + (i % 3) * 0.4, 0x8a6a4a));
  [[-8, -10], [10, 6], [-6, 24]].forEach(([la, lo]) => lamp(w, pl, LL(la, lo), 0xffd36a, 2.6));
  // the rails: a ring round the southern part of the planet. They follow the lumps of the potato-shaped ground
  const rails = new THREE.Group();
  for (const off of [-0.5, 0.5]) {
    const lat = -24 + (off / pl.r) * (180 / Math.PI), pts = [];
    for (let i = 0; i < 240; i++) pts.push(surf(pl, LL(lat, i * 1.5), 0.12));
    rails.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 480, 0.06, 6, true), toon(0x9aa0b8)));
  }
  w.group.add(rails);
  for (let i = 0; i < 48; i++) { const s = new THREE.Group(); mk(new THREE.BoxGeometry(1.4, 0.08, 0.25), toon(0x6a4a2a), 0, 0.04, 0, s, 0); w.put(pl, s, LL(-24, i * 7.5), 0, 0); }

  // ---------- A: the Crystal Steps (west) ----------
  const steps = [[18, -12, 1.5], [24, -20, 2.9], [30, -28, 4.3]].map(([la, lo, h]) => w.addPlatform(pl, { lat: la, lon: lo, r: 1.3, h, sides: 6, color: 0x5ef2e0, top: 0xd8fff8 }));
  steps.forEach((pf) => coinOn(w, pf));
  const far = w.addPlatform(pl, { lat: 30, lon: -44, r: 1.4, h: 4.0, float: true, color: 0xff7ad8, top: 0xffe0f4, bob: [0.25, 1.2, 0] });
  coinLine(w, pl, slerpLL(30, -28, 30, -44, 0.33), slerpLL(30, -28, 30, -44, 0.66), 2, 5.2);
  questItem(w, ctx, pl, far.n, 5.1, 'lantern1', buildLantern());

  // ---------- B: the mine cart (ride it!) ----------
  const cart = w.addPlatform(pl, { lat: -24, lon: 0, hx: 0.9, hz: 1.2, h: 1.1, b: 0.15, color: 0x8a5a34, top: 0x5a3a20, orbit: [V3(0, 1, 0), 0.19] });
  for (const z of [-0.8, 0.8]) for (const x of [-0.8, 0.8]) { const wh = mk(new THREE.CylinderGeometry(0.22, 0.22, 0.1, 12), toon(0x2b2440), x, 0.2, z, cart.mesh, 0); wh.rotation.z = Math.PI / 2; }
  const ledge = w.addPlatform(pl, { lat: -17, lon: 120, hx: 1.3, hz: 1.2, h: 4.6, color: 0x6a4a30, top: 0xc89050 });
  questItem(w, ctx, pl, ledge.n, 5.7, 'lantern2', buildLantern());
  coinLine(w, pl, LL(-24, 20), LL(-24, 100), 8, 1.9);
  const fl = w.addPlatform(pl, { lat: -31, lon: 200, r: 1.2, h: 3.0, float: true, color: 0xffd36a });
  rareItem(w, ctx, pl, fl.n, 4.1, 'lars-r1', 'Hop off the mine cart');

  // ---------- C: the ore pillars (north) ----------
  const o1 = w.addPlatform(pl, { lat: 56, lon: 90, hx: 1.3, hz: 1.3, h: 2.2, color: 0x8a6a4a, top: 0xffd36a });
  const o2 = w.addPlatform(pl, { lat: 62, lon: 104, r: 1.3, h: 3.8, float: true, color: 0xffd36a, bob: [0.8, 1.4, 0] });
  const o3 = w.addPlatform(pl, { lat: 68, lon: 90, r: 1.6, h: 5.4, color: 0x8a6a4a, top: 0xffd36a });
  [o1, o2].forEach((pf) => coinOn(w, pf));
  questItem(w, ctx, pl, o3.n, 6.5, 'lantern3', buildLantern());
  w.addPlatform(pl, { lat: 80, lon: 90, r: 1.1, h: 7.0, float: true, color: 0xff7ad8, crumble: true });
  rareItem(w, ctx, pl, LL(80, 90), 8.0, 'lars-r2', 'On top of the ore pillars');

  // ---------- secrets ----------
  w.addPlatform(pl, { lat: -60, lon: -60, r: 1.4, h: 0.45, color: 0xffd36a, top: 0xffffff, bounce: 22, puff: 0xffd36a });
  const hi = w.addPlatform(pl, { lat: -70, lon: -60, r: 1.4, h: 6.2, float: true, color: 0x5ef2e0 });
  rareItem(w, ctx, pl, hi.n, 7.3, 'lars-r3', 'The gold bounce rock');
  coinRing(w, pl, LL(0, 0), 4.5, 8);
  coinRing(w, pl, LL(-60, -60), 4, 6);
  coinLine(w, pl, LL(20, 40), LL(40, 80), 5);
  coinLine(w, pl, LL(-5, 150), LL(-5, 175), 4);

  // ---------- Launch Star at the main shaft ----------
  const shaft = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3, 0.35, 8, 30), toon(0x8a5a34)); ring.rotation.x = Math.PI / 2; ring.position.y = 0.1; shaft.add(ring);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(2.7, 30), basic(0x140c10)); hole.rotation.x = -Math.PI / 2; hole.position.y = 0.04; shaft.add(hole);
  w.put(pl, shaft, LL(-6, 196), 0);
  w.launchStar = w.addLaunchStar(pl, LL(-6, 186), { label: 'Launch down to the Kristalkern!', lockedText: 'Lars needs 5 lanterns, and the Launch Star needs 3 star shards', use: () => ctx.toArena(w) });
  w.unlockLaunch = () => w.launchStar.setActive(true);
  if (ctx.ws(w).fstate === 'done') w.unlockLaunch();

  // ---------- enemies: Kristalkevers ----------
  [[50, 70], [52, 110], [44, 90], [20, -40], [-10, 60], [-40, 160], [10, 230], [-30, 280]].forEach(([la, lo]) => w.addEnemy(pl, LL(la, lo), 'kever', { roam: 0.14 }));
  [[-60, 60], [30, 300], [0, 100]].forEach(([la, lo]) => w.addEnemy(pl, LL(la, lo), 'kever', { roam: 0.14 }));
  // Grotvleermuizen: they circle up high and dive at you. Jump on them when they swoop low
  [[30, -30], [-30, 110], [0, 150], [40, 180], [-50, 250], [60, -100], [-10, 270]].forEach(([la, lo]) => w.addEnemy(pl, LL(la, lo), 'bat', { roam: 0.14 }));

  // ---------- Lars' Mijngang: a parkour inside the mine, over a bottomless void ----------
  addParkour(w, ctx, {
    home: pl, entryDir: LL(8, -18), entryPrompt: '<kbd>E</kbd> enter Lars’ mine', exitDir: LL(6, -8), exitFwd: LL(0, 0),
    title: 'Lars’ Mijngang', sub: 'Mind the void. Lanterns are checkpoints.', voidText: 'Into the void! Back to the last lantern.',
    rareId: 'lars-r4', rareName: 'Deep in Lars’ mine', marker: buildLantern,
    theme: {
      sky: 'radial-gradient(ellipse at 50% 40%,#3a2440 0%,#1a0f1e 55%,#07040a 100%)',
      dome: [0x5a3a2a, 0x3e2a22, 0x2a1c18, 0x5ef2e0], gems: [0x5ef2e0, 0xff7ad8, 0xffd36a], core: 0x2a0f3a, glow: 0x8a3ad8,
      plat: 0x8a5a34, platTop: 0xc89050, alt: 0x6a4a30, crumble: 0xffd36a, bounce: 0xff7ad8, cpTop: 0x5ef2e0, finTop: 0xffd23a,
    },
    route: [['hop', 4], ['bob', 4], ['crumble', 4], ['cp'], ['zig', 4], ['bounce'], ['down', 4], ['cp'], ['gap'], ['crumble', 1]],
  });

  // ---------- more: lanterns 4 and 5, and Daniel the demolition expert (from joshibrahim.nl) ----------
  addMore(w, ctx, pl, {
    item: () => buildLantern(), prefix: 'lantern', color: 0x8a5a34, top: 0xc89050,
    local: {
      id: 'fenna', name: 'Daniel', who: 'DANIEL',
      model: buildLocal({ s: 0.8, skin: 0xf0c8a0, shirt: 0xff7a1f, pants: 0x3a3e4e, hair: 0x3a2216, hat: 'cap', capC: 0xffd23f }),
      anim: (dt, t, n) => { n.model.arms[1].rotation.x = -1.2 + Math.sin(t * 7) * 0.5; },
      task: { type: 'stomp', enemy: 'kever', n: 3, found: 'They’re all gone! Come tell me!' },
      first: [
        ['DANIEL', 'Hey! I’m Daniel, demolition expert. If it’s in my way, it’s coming down. I’m blasting a new tunnel for Lars.'],
        ['DANIEL', 'But three Kristalkevers are sitting right where my bombs go, up north. I can’t blow up kevers, that’s mean. Stomp them twice, please!'],
      ],
      progress: (l) => [['DANIEL', `${l.left} Kristalkevers left by my tunnel up north. Stomp them twice!`]],
      done: [['DANIEL', 'All clear! Now stand back… KABOOM! Perfect tunnel.'], ['DANIEL', 'This star shard flew out of the rock. It’s yours.']],
      after: [['DANIEL', 'Need anything blown up? No? Are you sure? Not even a little bit?']],
      bubbles: { new: ['Hey!', 'Stand back!', 'Kevers!'], progress: ['Up north!', 'Stomp twice!', 'Careful!'], done: ['KABOOM!', 'Thanks!', '*lights a fuse*'] },
    },
  });

  w.boss = new Gruis(w, arena);
  w.hitLines = [['LARS', 'Yes! Right in the crystal! Just like Josh would do it!'], ['LARS', 'He’s getting faster! Keep your eyes on the pillars!']];
  w.winLines = [
    ['LARS', '(radio) He’s asleep again. Look at him. Sweet.'],
    ['RENAS-1', 'Energiekern 2 of 3 secured. Last signal: Homerun Heuvel. Distance: too far. Fuel: low.'],
    ['RENAS-1', 'Nearest fuel source: the Hertogdom IJs. Warning: extreme aura levels detected.'],
    ['RÊNAS', 'Extreme aura? Then they’ve never met me. Hold on, Nathan, I’m coming!'],
  ];
  void surf; void sign;
  return w;
}
function slerpLL(a, b, c, d, k) { return LL(a, b).lerp(LL(c, d), k).normalize(); }
