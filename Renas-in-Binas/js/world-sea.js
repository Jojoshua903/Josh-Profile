import { World, addStars, addBackdropPlanet, LL, frameDir, V3, toon, basic, mk, THREE, coinRing, coinLine, coinOn, rock, lamp, sign, addRocket, questItem, rareItem, setupFriend, setupLocal, geyser, addMore } from './worlds-common.js?v=20261114i';
import { fbm } from './world.js?v=20261114i';
import { buildSami, buildPearl, textBoard, buildLocal, buildTrinket } from './models.js?v=20261114i';
import { Kraak } from './bosses.js?v=20261114i';
import { addParkour, buildBeacon } from './parkour.js?v=20261114i';
import { rOf } from './core.js?v=20261114i';
import { duelModels } from './duels.js?v=20261114i';

// World 9 on the route: DE KORAALZEE. A planet under the sea: coral, kelp, a sunken ship and giant clams.
// New here: you're underwater, so you float a little, and bubble streams shoot you up high.
// Boss: KRAAK, the giant octopus, in De Diepe Trog.
export function buildSea(ctx) {
  const w = new World('sami');
  Object.assign(w, {
    index: 9, title: 'De Koraalzee', sub: 'Coral, bubbles and one very grumpy octopus.', friendName: 'Sami',
    arenaTitle: 'De Diepe Trog', arenaSub: 'Kraak is waving all eight arms',
    sky: 'linear-gradient(180deg,#0a2a5a 0%,#1a6aa8 40%,#3ab0d8 75%,#9fe8ff 100%)',
    arenaSky: 'linear-gradient(180deg,#020a1a 0%,#0a2a4a 50%,#1a4a6a 85%,#3a6a8a 100%)',
    music: 'sea', bossMusic: 'boss10', lights: [0xc8f0ff, 0x1a4a7a],
    quest: { icon: '🦪', label: 'Pearls', got: 0, need: 3 },
  });
  w.quest.got = ctx.ws(w).items.length;
  addStars(w, 200);
  addBackdropPlanet(w, V3(-180, 100, -150), 18, 0x3ab0d8, 0xfff2b0);
  addBackdropPlanet(w, V3(170, -70, 160), 11, 0xff9ac8);

  const s1 = new THREE.Color(0xf0dca0), s2 = new THREE.Color(0xe0c888), s3 = new THREE.Color(0xc8b070), sea = new THREE.Color(0x3a8ab8), weed = new THREE.Color(0x3a9a7a), path = new THREE.Color(0xfff2d0);
  const pl = w.addPlanet({
    c: V3(0, 0, 0), r: 24, shape: 'druppel', atmo: 0x9fe8ff, atmoOp: 0.18,
    paint: (p, out) => {
      const n = fbm(p, 2.8);
      out.copy(n > 0.6 ? s1 : n > 0.45 ? s2 : s3);
      if (fbm(p, 6) > 0.74) out.copy(weed);                     // seagrass patches
      if (fbm(p, 3.5) < 0.25) out.copy(sea);                   // deep blue holes
      if (p.z > 0.965 && Math.abs(p.x) < 0.05) out.copy(path);
    },
  });
  pl.grav = 0.75;   // underwater: you float a little
  w.main = pl;
  const a1 = new THREE.Color(0x2a4a6a), a2 = new THREE.Color(0x1a3a5a), ag = new THREE.Color(0xff9ac8);
  const arena = w.addPlanet({
    c: V3(0, -30, -120), r: 14, atmo: 0x3ab0d8, atmoOp: 0.14,
    paint: (p, out) => { const n = fbm(p, 3); out.copy(n > 0.66 ? ag : n > 0.48 ? a1 : a2); },
  });
  arena.grav = 0.8;
  w.arena = arena;
  w.spawn = { dir: LL(0, 0), fwd: V3(0, 1, 0) };
  w.arenaSpawn = { dir: arena.c.clone().negate().normalize(), fwd: V3(0, 1, 0) };
  addRocket(w, ctx, pl, LL(-4, 9));

  // bubbles drifting up everywhere
  {
    const bub = [];
    for (let i = 0; i < 40; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.1 + (i % 3) * 0.05, 8, 6), basic(0xe8fbff, { transparent: true, opacity: 0.5, depthWrite: false }));
      const d = LL(-80 + (i * 41) % 160, i * 37); w.group.add(b); bub.push({ b, d, h: (i * 1.7) % 12, s: 0.8 + (i % 4) * 0.3 });
    }
    w.updaters.push((dt) => { for (const o of bub) { o.h += dt * o.s; if (o.h > 12) o.h = 0; o.b.position.copy(pl.c).addScaledVector(o.d, rOf(pl, o.d) + o.h); } });
  }

  // ---------- Sami by her little boat house ----------
  const sami = buildSami();
  const npc = w.addNPC(pl, sami, LL(5, 12), { name: 'Sami', bubbleY: 2.2, anim: (dt, t, n) => {
    n.model.r.position.y = Math.abs(Math.sin(t * 1.4)) * 0.2;        // floating up and down
    n.model.arms[0].rotation.z = -0.6 + Math.sin(t * 2) * 0.4; n.model.arms[1].rotation.z = 0.6 - Math.sin(t * 2) * 0.4;   // swimming arms
  } });
  {
    const hut = new THREE.Group();
    mk(new THREE.CylinderGeometry(1.0, 1.1, 1.6, 10), toon(0xff9ac8), 0, 0.8, 0, hut, 1.05);
    mk(new THREE.ConeGeometry(1.3, 1.0, 10), toon(0x3ab0d8), 0, 2.1, 0, hut, 1.05);
    mk(new THREE.CircleGeometry(0.3, 12), basic(0xffe27a), 0, 1.0, 1.06, hut, 0);
    w.put(pl, hut, LL(9, 18), 0, 1.2); w.addSolid(pl, LL(9, 18), 1.1, 1.6);
  }
  setupFriend(w, ctx, npc, {
    name: 'Sami',
    first: [
      ['SAMI', 'Blub! A visitor! In a fishbowl! Oh wait, that’s a helmet. Hi! I’m Sami. I dive here every day.'],
      ['RÊNAS', 'Hi Sami! Wow, everything is so… floaty.'],
      ['SAMI', 'That’s the water! You jump higher and fall slower. And the bubble streams shoot you up really high. Try one!'],
      ['SAMI', 'But there’s a problem. A big one with eight arms. Kraak, the giant octopus. He stole my three pearls.'],
      ['SAMI', 'And he’s hugging a glowing core down in De Diepe Trog. The Zeekern. That’s your fuel, right?'],
      ['RÊNAS', 'Yes! That’s one of mine. Raaf built it for my station.'],
      ['SAMI', 'One pearl is on top of the Koraaltoren, the coral tower to the west. One is in the crow’s nest of the sunken ship.'],
      ['SAMI', 'And one is on the giant clam up north. Ride a bubble stream to get up there!'],
      ['SAMI', 'Mo and Juul each found a star shard. Help them and they’ll give them to you. Blub!'],
    ],
    progress: (got) => [['SAMI', `Pearls: ${got}/5. The Koraaltoren, the sunken ship, and the giant clam. Ride the bubbles!`]],
    needLocals: (left) => [['SAMI', `All five pearls! Blub blub! But the Launch Star still needs star shards. ${left.join(' and ')} still need${left.length === 1 ? 's' : ''} you. Look for the yellow “!”.`]],
    done: [
      ['SAMI', 'My pearls! They’re so shiny. Thank you!'],
      ['SAMI', 'The Launch Star by the ship’s anchor is awake. It takes you to De Diepe Trog. That’s where Kraak is.'],
      ['SAMI', 'He squirts ink blobs: watch the red circles. And he spins his tentacles round: jump over them.'],
      ['SAMI', 'Diver secret: when he rears up and SMASHES the floor, he gets dizzy. Then jump on his head!'],
    ],
    after: [['SAMI', 'Ink: dodge. Tentacles: jump. Smash: then bonk his head. Blub!']],
    bubbles: {
      new: ['Blub!', 'A visitor!', '*swims in circles*'],
      progress: ['My pearls…', 'Ride the bubbles!', 'Watch the crabs!', 'Psst. The Bellenkloof has a golden gear at the end.'],
      done: ['To the Launch Star!', 'Bonk his head!', 'Blub blub!'],
    },
  });

  // ---------- the locals ----------
  setupLocal(w, ctx, {
    id: 'mo', name: 'Mo', who: 'MO', dir: LL(-30, -76), bubbleY: 2.0,
    model: buildLocal({ s: 0.74, skin: 0xd8a070, shirt: 0xffd23a, pants: 0x3a8ad8, hair: 0x2b1a10, hat: 'cap', capC: 0xff5ab4 }),
    anim: (dt, t, n) => { n.model.r.position.y = Math.abs(Math.sin(t * 1.6)) * 0.2; n.model.head.rotation.y = Math.sin(t) * 0.5; },
    task: { type: 'fetch', dir: LL(-46, -94), alt: 9.0, model: buildTrinket('snorkel'), banner: 'MO’S SNORKEL!', found: 'My snorkel! Bring it back, I can’t breathe without it! …Okay, I can. But still!' },
    first: [
      ['MO', 'Hi! I’m Mo. I’m learning to dive. Sami is teaching me.'],
      ['MO', 'But a big wave took my snorkel and dropped it on top of the coral rocks over there. They’re SO high.'],
      ['MO', 'You float really well here. Hop up the rocks. Bring it back and my star shard is yours.'],
    ],
    progress: () => [['MO', 'My snorkel is on top of the coral rocks. Hop up, you float really well here!']],
    done: [['MO', 'My snorkel! Now I can dive again!'], ['MO', 'Here’s the star shard. It was stuck in a sponge. Squishy.']],
    after: [['MO', 'Blub blub! …Was that right? Sami says it like that.']],
    bubbles: { new: ['Hi!', 'My snorkel…', 'Blub?'], progress: ['The coral rocks!', 'Hop up!', 'So high…'], done: ['Blub blub!', 'Thank you!', '*dives*'] },
  });
  [[-34, -82, 1.8], [-37, -86, 3.8], [-41, -89, 5.8], [-46, -94, 7.8]].forEach(([la, lo, h], i) => w.addPlatform(pl, { lat: la, lon: lo, r: i === 3 ? 1.5 : 1.1, h, sides: 7, color: 0xff7a9a, top: 0xffb8c8 }));
  setupLocal(w, ctx, {
    id: 'juul', name: 'Juul', who: 'JUUL',
    dir: LL(-30, 196), bubbleY: 2.0,
    model: buildLocal({ s: 0.82, skin: 0xf0c8a0, shirt: 0x3a6a8a, pants: 0x2b2440, hair: 0xd8c8a0, hat: 'cap', capC: 0x2b2440, beard: 0xe8e0d0 }),
    anim: (dt, t, n) => { n.model.arms[1].rotation.x = -1.6 + Math.sin(t * 2) * 0.2; },
    task: { type: 'duel', game: 'hop', target: 9, time: 28, window: 2.3, tiles: 7, color: 0xfff4f8, model: duelModels.pearl, winTitle: 'PEARL DIVER!', found: 'Nine pearls! A true pirate! Come back, matey!', lost: 'Not enough pearls, matey! Talk to me for another dive.' },
    first: [
      ['JUUL', 'Ahoy, little sailor! Captain Juul. That sunken ship? That was MY ship. Long story.'],
      ['JUUL', 'Every pirate has to pass the Pearl Test. The clams round here open up one by one, just for a moment.'],
      ['JUUL', 'Grab the pearl before the clam snaps shut! Nine pearls and you’re a real pirate.'],
      ['RÊNAS', 'Nine pearls. Aye aye, captain!'],
      ['JUUL', 'That’s the spirit! Pass the test and my star shard is yours.'],
    ],
    progress: () => [['JUUL', 'Another dive? Nine pearls, matey. Quick feet!']],
    done: [['JUUL', 'Nine pearls! You’re a real pirate now! Yo ho ho!'], ['JUUL', 'Here’s the star shard. Best treasure I ever found. Don’t tell the others.']],
    after: [['JUUL', 'Yo ho ho, and a bottle of… lemonade. I’m a nice pirate.']],
    bubbles: { new: ['Ahoy!', 'Pearl Test?', 'Yo ho!'], progress: ['Another dive?', 'Nine pearls!', 'Quick feet!'], done: ['Yo ho ho!', 'Real pirate!', '*salutes*'] },
  });

  // ---------- decor: kelp, coral, rocks, fish ----------
  const kelp = [];
  [[14, 30], [-10, 40], [30, 80], [-50, 30], [50, -10], [-10, 120], [20, 170], [-60, 160], [10, 230], [40, 260], [-30, 290], [60, 320], [-6, -60], [-56, -40]].forEach(([la, lo], i) => {
    const k = new THREE.Group();
    for (let s = 0; s < 3; s++) { const st = new THREE.Group(); st.position.set((s - 1) * 0.3, 0, (s % 2) * 0.2); k.add(st); for (let j = 0; j < 6; j++) mk(new THREE.CapsuleGeometry(0.08, 0.5, 3, 6), toon(j % 2 ? 0x2a8a5a : 0x3aa86a), 0, 0.3 + j * 0.55, 0, st, 0); kelp.push({ st, ph: i + s }); }
    w.put(pl, k, LL(la, lo), 0, i);
  });
  w.updaters.push((dt, t) => { for (const o of kelp) o.st.rotation.z = Math.sin(t * 1.2 + o.ph) * 0.15; });
  for (let i = 0; i < 16; i++) {   // coral
    const c = new THREE.Group(), col = [0xff7a9a, 0xffb03a, 0xc87ad8, 0xff5ab4][i % 4];
    for (let k = 0; k < 4; k++) { const b = mk(new THREE.CapsuleGeometry(0.12, 0.6 + (k % 2) * 0.4, 3, 6), toon(col), Math.cos(k * 1.7) * 0.2, 0.4, Math.sin(k * 1.7) * 0.2, c, 1.06); b.rotation.set(Math.cos(k) * 0.5, 0, Math.sin(k) * 0.5); }
    w.put(pl, c, LL(-66 + (i * 31) % 132, 15 + i * 41), 0, i);
  }
  [[16, -20], [-26, 160], [12, 290], [44, 200], [-50, 240], [-34, 196], [-46, 206]].forEach(([la, lo], i) => rock(w, pl, LL(la, lo), 0.9 + (i % 3) * 0.4, 0x6a8a9a));
  const fish = [];
  for (let i = 0; i < 10; i++) {
    const f = new THREE.Group(), col = [0xffb03a, 0x5ef2e0, 0xff5ab4][i % 3];
    mk(new THREE.SphereGeometry(0.22, 10, 8), toon(col), 0, 0, 0, f, 1.06).scale.set(0.7, 0.9, 1.3);
    mk(new THREE.ConeGeometry(0.16, 0.3, 4), toon(col), 0, 0, -0.35, f, 1.06).rotation.x = -Math.PI / 2;
    w.group.add(f); fish.push({ f, d: LL(-50 + i * 11, i * 36), h: 2 + (i % 4), ph: i });
  }
  w.updaters.push((dt, t) => { for (const o of fish) { const a = t * 0.3 + o.ph; const d = frameDir(o.d, 90 - 6, (a * 180) / Math.PI); const nx = frameDir(o.d, 90 - 6, ((a + 0.1) * 180) / Math.PI); o.f.position.copy(pl.c).addScaledVector(d, rOf(pl, d) + o.h); o.f.lookAt(pl.c.clone().addScaledVector(nx, rOf(pl, nx) + o.h)); } });
  [[-8, -8], [10, 6], [-6, 22]].forEach(([la, lo]) => lamp(w, pl, LL(la, lo), 0x9fe8ff, 2.8));
  sign(w, pl, LL(12, -6), textBoard('DE KORAALZEE', 3.4, 0.9, '#1a6aa8', '#fff8ec'), 0.3, 2.6);
  sign(w, pl, LL(-12, 14), textBoard('BUBBLES GO UP!', 2.8, 0.7, '#9fe8ff', '#1a4a7a'), -0.4, 1.8);

  // ---------- A: the Koraaltoren (west): climb round a giant coral pillar ----------
  const T0 = LL(22, -40);
  {
    const tw = new THREE.Group();
    mk(new THREE.CylinderGeometry(0.8, 1.3, 9, 10), toon(0xff7a9a), 0, 4.5, 0, tw, 1.04);
    for (let k = 0; k < 8; k++) { const b = mk(new THREE.CapsuleGeometry(0.18, 0.8, 3, 6), toon(k % 2 ? 0xffb03a : 0xc87ad8), Math.cos(k) * 0.9, 1.5 + k * 0.9, Math.sin(k) * 0.9, tw, 1.06); b.rotation.set(Math.cos(k) * 0.9, 0, Math.sin(k) * 0.9); }
    w.put(pl, tw, T0, 0); w.addSolid(pl, T0, 1.1, 9);
  }
  const spiral = [];
  for (let i = 0; i < 8; i++) spiral.push(w.addPlatform(pl, { dir: frameDir(T0, 90 - 6.5, i * 50), r: 1.05, h: 1.0 + i * 1.1, float: true, thick: 0.35, sides: 8, color: 0xff9ac8, top: 0xfff2d0, ...(i % 3 === 2 ? { bob: [0.3, 1.2, i] } : {}) }));
  spiral.slice(0, 7).forEach((pf) => coinOn(w, pf));
  w.addPlatform(pl, { dir: T0, r: 1.6, h: 9.6, float: true, thick: 0.6, color: 0xff7a9a, top: 0xffb8c8 });
  questItem(w, ctx, pl, frameDir(T0, 90 - 2.6, 120), 10.6, 'pearl1', buildPearl());
  w.addPlatform(pl, { dir: frameDir(T0, 90 - 5.5, 320), r: 1.0, h: 11, float: true, thick: 0.3, color: 0x3ab0d8, top: 0x9fe8ff, bob: [0.3, 1.2, 0] });
  geyser(w, pl, frameDir(T0, 90 - 9, 300), { color: 0xe8fbff, rock: 0x6a8a9a, period: 4, phase: 0, launch: true });
  rareItem(w, ctx, pl, frameDir(T0, 90 - 5.5, 320), 12, 'sami-r1', 'Above the Koraaltoren');

  // ---------- B: the sunken ship (south-east): up the tilted deck, then the mast ----------
  const SH = LL(-22, 80);
  {
    const ship = new THREE.Group();
    mk(new THREE.BoxGeometry(2.6, 1.6, 7), toon(0x6a4a2a), 0, 0.6, 0, ship, 1.04);
    mk(new THREE.BoxGeometry(2.8, 0.2, 7.2), toon(0x8a6a3a), 0, 1.45, 0, ship, 0);
    mk(new THREE.CylinderGeometry(0.12, 0.15, 8, 8), toon(0x5a3a1a), 0, 5, 0.8, ship, 1.06);
    const sail = mk(new THREE.PlaneGeometry(2.2, 2.4), toon(0xe8e0c8), 0, 5.5, 0.85, ship, 0); sail.material.side = THREE.DoubleSide;
    ship.rotation.z = 0.12;
    w.put(pl, ship, SH, 0, 0.3);
  }
  const deck = [[-14, 62, 1.4], [-17, 69, 2.5], [-20, 75, 3.6], [-22, 80, 4.7], [-24, 86, 5.8], [-25, 82, 7.0]].map(([la, lo, h], i) => w.addPlatform(pl, { lat: la, lon: lo, hx: 1.4, hz: 0.9, h, float: true, thick: 0.4, color: 0x6a4a2a, top: 0x8a6a3a, ...(i % 2 ? { bob: [0.3, 1.3, i] } : {}) }));
  deck.slice(0, 5).forEach((pf) => coinOn(w, pf));
  const nest = w.addPlatform(pl, { dir: frameDir(SH, 90 - 2.0, 90), r: 1.2, h: 8.4, float: true, thick: 0.5, color: 0x5a3a1a, top: 0xffd23a });
  questItem(w, ctx, pl, nest.n, 9.3, 'pearl2', buildPearl());
  w.addPlatform(pl, { lat: -32, lon: 100, r: 1.0, h: 10, float: true, thick: 0.4, sides: 6, color: 0x3ab0d8, top: 0x9fe8ff, bob: [0.5, 1, 2] });
  geyser(w, pl, LL(-30, 96), { color: 0xe8fbff, rock: 0x6a8a9a, period: 4.5, phase: 1.5, launch: true });
  rareItem(w, ctx, pl, LL(-32, 100), 11, 'sami-r3', 'High above the sunken ship');

  // ---------- C: the giant clam (north): ride a bubble stream up to it ----------
  const TP = LL(48, 150);
  {
    const clam = new THREE.Group();
    const lo = mk(new THREE.SphereGeometry(2.2, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon(0xc8a8e8), 0, 0, 0, clam, 1.04); lo.scale.set(1, 0.3, 1); lo.rotation.x = Math.PI;
    const up = mk(new THREE.SphereGeometry(2.2, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon(0xd8c0f0), 0, 0.2, -1.8, clam, 1.04); up.scale.set(1, 0.3, 1); up.rotation.x = -1.2;
    const hold = new THREE.Group(); hold.add(clam); clam.position.y = 7.6; w.put(pl, hold, TP, 0);
    mk(new THREE.CylinderGeometry(0.3, 0.5, 7.4, 8), toon(0xc87ad8), 0, 3.7, 0, hold, 0);
  }
  const clamTop = w.addPlatform(pl, { dir: TP, r: 2.0, h: 7.7, float: true, thick: 0.4, color: 0xc8a8e8, top: 0xfff0ff });
  questItem(w, ctx, pl, clamTop.n, 8.6, 'pearl3', buildPearl());
  geyser(w, pl, frameDir(TP, 90 - 7, 200), { color: 0xe8fbff, rock: 0x6a8a9a, period: 3.5, phase: 0.8, launch: true });
  geyser(w, pl, frameDir(TP, 90 - 7, 20), { color: 0xe8fbff, rock: 0x6a8a9a, period: 3.5, phase: 2.5, launch: true });
  sign(w, pl, frameDir(TP, 90 - 11, 200), textBoard('RIDE THE BUBBLES ▲', 3.0, 0.6, '#9fe8ff', '#1a4a7a'), 0, 1.8);
  [0, 120, 240].forEach((az, i) => w.addPlatform(pl, { dir: frameDir(TP, 90 - 4.6, az + 60), r: 0.9, h: 4.2 + i * 0.6, float: true, thick: 0.3, color: 0xc8a8e8, top: 0xfff0ff, bob: [0.3, 1.1, i] }));

  // ---------- Launch Star by the ship's anchor ----------
  const anchor = new THREE.Group();
  mk(new THREE.CylinderGeometry(0.15, 0.15, 3, 8), toon(0x5a5a68), 0, 1.5, 0, anchor, 1.06);
  mk(new THREE.TorusGeometry(0.9, 0.15, 6, 16, Math.PI), toon(0x5a5a68), 0, 0.5, 0, anchor, 1.06).rotation.z = Math.PI;
  mk(new THREE.TorusGeometry(0.3, 0.08, 6, 12), toon(0x5a5a68), 0, 3.1, 0, anchor, 1.06);
  w.put(pl, anchor, LL(-4, 254), 0);
  w.launchStar = w.addLaunchStar(pl, LL(-6, 244), { label: 'Launch to De Diepe Trog!', lockedText: 'Sami needs her 5 pearls, and the Launch Star needs 3 star shards', use: () => ctx.toArena(w) });
  w.unlockLaunch = () => w.launchStar.setActive(true);
  if (ctx.ws(w).fstate === 'done') w.unlockLaunch();

  // ---------- secrets ----------
  w.addPlatform(pl, { lat: -82, lon: 0, r: 2, h: 1.4, float: true, color: 0xff9ac8, top: 0xfff2d0, bob: [0.5, 1, 0] });
  rareItem(w, ctx, pl, LL(-90, 0), 2.6, 'sami-r2', 'Under the sea… under the sea');
  coinRing(w, pl, LL(-90, 0), 5, 8);
  coinRing(w, pl, LL(0, 0), 4.5, 8);
  coinLine(w, pl, LL(20, 190), LL(26, 240), 5);
  coinLine(w, pl, LL(-4, 30), LL(-10, 46), 4);

  // ---------- De Bellenkloof: a parkour over a bottomless void, through a giant shell ----------
  const shell = new THREE.Group();
  const sh = mk(new THREE.SphereGeometry(2.2, 16, 10, 0, Math.PI, 0, Math.PI / 2), toon(0xffb8c8), 0, 0, 0, shell, 1.04); sh.rotation.y = -Math.PI / 2;
  mk(new THREE.CircleGeometry(1.0, 16), basic(0x0a2a4a), 0, 1.0, 1.4, shell, 0);
  const shSign = textBoard('BELLENKLOOF', 2.4, 0.6, '#1a6aa8', '#fff8ec'); shSign.position.set(0, 2.5, 1.5); shell.add(shSign);
  w.put(pl, shell, LL(-16, -26), 0, 0.5);
  addParkour(w, ctx, {
    home: pl, entryDir: LL(-16, -26), entryPrompt: '<kbd>E</kbd> enter the Bellenkloof', exitDir: LL(-11, -19), exitFwd: LL(0, 0),
    title: 'De Bellenkloof', sub: 'Mind the void. Shell beacons are checkpoints.', voidText: 'Into the void! Back to the last shell beacon.',
    rareId: 'sami-r4', rareName: 'The end of the Bellenkloof', marker: () => buildBeacon(0xff9ac8, 0x9fe8ff),
    theme: {
      sky: 'radial-gradient(ellipse at 50% 40%,#0a3a6a 0%,#04182e 55%,#01060e 100%)',
      dome: [0x2a5a8a, 0x1a3a6a, 0x0a2a4a, 0x9fe8ff], gems: [0x9fe8ff, 0xff9ac8, 0xffd23a], core: 0x0a2a4a, glow: 0x9fe8ff,
      plat: 0xff7a9a, platTop: 0xfff2d0, alt: 0xc8a8e8, crumble: 0x6a8a9a, bounce: 0x5ef2e0, puff: 0x9fe8ff, cpTop: 0x5ef2e0, finTop: 0xffd23a, signFg: '#9fe8ff', signBg: '#0a2a4a',
    },
    route: [['hop', 3], ['bob', 3], ['circle', 2], ['cp'], ['zig', 3], ['crumble', 3], ['cp'], ['bounce'], ['gap'], ['circle', 2], ['down', 2], ['hop', 2]],
  });

  // ---------- enemies: jellyfish and crabs ----------
  [[-50, 120], [10, 70], [20, 40], [-10, 170], [50, 290], [-30, 320], [34, -80]].forEach(([la, lo]) => w.addEnemy(pl, LL(la, lo), 'jelly', { roam: 0.15 }));
  [[-20, 140], [30, 110], [40, 230], [-40, 60], [0, 300]].forEach(([la, lo]) => w.addEnemy(pl, LL(la, lo), 'crab', { roam: 0.2 }));

  // ---------- more: pearls 4 and 5, and Bo ----------
  addMore(w, ctx, pl, {
    item: () => buildPearl(), prefix: 'pearl', color: 0xff9ac8, top: 0xfff2d0,
    local: {
      id: 'bo', name: 'Bo', who: 'BO',
      model: buildLocal({ s: 0.66, skin: 0xf0c8a0, shirt: 0xff9ac8, pants: 0x3ab0d8, hair: 0xffd23a, hat: 'bun' }),
      anim: (dt, t, n) => { n.model.body.position.y = Math.abs(Math.sin(t * 5)) * 0.08; },
      task: { type: 'fetch', model: buildTrinket('starfish'), banner: 'BO’S STARFISH!', found: 'Stella! Bring her back, she misses me!' },
      first: [
        ['BO', 'Hi! I’m Bo! My pet starfish is called Stella. She swam away!'],
        ['BO', 'She’s on the steps up north. Starfish are slow, but she’s VERY stubborn. Can you bring her back?'],
      ],
      progress: () => [['BO', 'Stella is on the steps up north. Bring her back, please!']],
      done: [['BO', 'Stella! I missed you SO much!'], ['BO', 'She was holding this star shard. Starfish love stars. Here!']],
      after: [['BO', 'Stella says thank you. She says it very slowly.']],
      bubbles: { new: ['Hi!', 'Stella…', 'My starfish!'], progress: ['Up north!', 'Stella!', 'Please!'], done: ['Stella!', 'Thank you!', '*hugs a starfish*'] },
    },
  });

  // ---------- boss ----------
  w.boss = new Kraak(w, arena);
  w.hitLines = [['SAMI', '(radio) BONK! Right on the head! Blub blub!'], ['SAMI', '(radio) He’s really angry now! More ink, more tentacles! Keep going!']];
  w.winLines = [
    ['KRAAK', '…Blub. My head. Okay, okay. You win, tiny fishbowl.'],
    ['KRAAK', 'Take the Zeekern. And tell Sami… sorry about the pearls. I just like round things.'],
    ['RATJETOE', 'Fuel secured: the Zeekern. Range: still not enough. Next signal: the Spookplaneet. Readings: very… spooky. I am not scared. *squeaks very quietly*'],
    ['RÊNAS', 'Ratjetoe… why do I hear meowing on your radio?'],
    ['RATJETOE', 'Meowing? That’s… static. Cat-shaped static. Very normal. *squeak*'],
    ['RÊNAS', 'Thanks, Sami! A ghost planet? I’m not scared. …I’m a little scared.'],
  ];
  return w;
}
