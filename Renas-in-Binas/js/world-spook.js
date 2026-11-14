import { World, surf, planetStem, addStars, addBackdropPlanet, LL, frameDir, V3, toon, basic, mk, THREE, coinRing, coinLine, coinOn, rock, lamp, sign, addRocket, questItem, rareItem, setupFriend, setupLocal, addMore } from './worlds-common.js?v=20261114i';
import { fbm } from './world.js?v=20261114i';
import { buildSaar, buildCandle, textBoard, buildLocal, buildTrinket } from './models.js?v=20261114i';
import { Boe } from './bosses.js?v=20261114i';
import { addParkour, buildBeacon } from './parkour.js?v=20261114i';

// World 10 on the route: SPOOKPLANEET. A dark, purple planet with a haunted house, a graveyard and a giant dead tree.
// New here: ghost platforms. They fade away and come back on a timer: watch them blink, then jump.
// Boss: KONING BOE, the ghost king, in De Spookzaal.
export function buildSpook(ctx) {
  const w = new World('saar');
  Object.assign(w, {
    index: 10, title: 'Spookplaneet', sub: 'Creaky, spooky, and only a little bit scary.', friendName: 'Saar',
    arenaTitle: 'De Spookzaal', arenaSub: 'Koning Boe is polishing his crown',
    sky: 'radial-gradient(ellipse at 50% 30%,#3a1a5a 0%,#1a0a2e 60%,#06020e 100%)',
    arenaSky: 'radial-gradient(ellipse at 50% 30%,#1a3a2a 0%,#0a1a14 60%,#020604 100%)',
    music: 'spook', bossMusic: 'boss11', lights: [0xd8c8ff, 0x2a1a4a],
    quest: { icon: '🕯️', label: 'Candles', got: 0, need: 3 },
  });
  w.quest.got = ctx.ws(w).items.length;
  addStars(w, 700);
  addBackdropPlanet(w, V3(160, 110, -170), 26, 0xfff2b0);   // a big full moon
  addBackdropPlanet(w, V3(-190, -60, 130), 10, 0x7dffb0);

  const g1 = new THREE.Color(0x4a3a6a), g2 = new THREE.Color(0x3a2a5a), g3 = new THREE.Color(0x2a1a44), moss = new THREE.Color(0x3a6a4a), path = new THREE.Color(0x8a7aa8), fog = new THREE.Color(0x6a5a8a);
  const pl = w.addPlanet({
    c: V3(0, 0, 0), r: 24, shape: 'pompoen', atmo: 0x9a7aff, atmoOp: 0.14,
    paint: (p, out) => {
      const n = fbm(p, 2.6);
      out.copy(n > 0.6 ? g1 : n > 0.45 ? g2 : g3);
      if (fbm(p, 6) > 0.76) out.copy(moss);
      if (fbm(p, 4) < 0.24) out.copy(fog);
      if (p.z > 0.965 && Math.abs(p.x) < 0.05) out.copy(path);
    },
  });
  w.main = pl;
  planetStem(w, pl, { h: 3.2, r0: 1.1, r1: 0.6, color: 0x4a6a2a, tilt: 0.3 });   // the Spookplaneet is a pumpkin: a stubby stem on top
  const a1 = new THREE.Color(0x2a2a3a), a2 = new THREE.Color(0x1a1a2a), ag = new THREE.Color(0x7dffb0);
  const arena = w.addPlanet({
    c: V3(0, 30, -120), r: 14, atmo: 0x7dffb0, atmoOp: 0.1,
    paint: (p, out) => { const n = fbm(p, 3); out.copy(Math.abs(n - 0.5) < 0.012 ? ag : n > 0.5 ? a1 : a2); },
  });
  w.arena = arena;
  w.spawn = { dir: LL(0, 0), fwd: V3(0, 1, 0) };
  w.arenaSpawn = { dir: arena.c.clone().negate().normalize(), fwd: V3(0, 1, 0) };
  addRocket(w, ctx, pl, LL(-4, 9));

  // ghost platforms: solid for a while, then they blink and fade away, then they come back
  const ghost = (pf, period = 5, phase = 0) => {
    const h0 = pf.h, b0 = pf.b, mats = [];
    pf.mesh.traverse((o) => { if (o.material) { o.material = o.material.clone(); o.material.transparent = true; mats.push(o.material); } });
    w.updaters.push((dt, t) => {
      const k = ((t + phase) % period) / period;
      const on = k < 0.68, blink = k > 0.5 && k < 0.68;
      pf.h = on ? h0 : -99; pf.b = on ? b0 : -100;
      const op = on ? (blink ? (Math.sin(t * 30) > 0 ? 0.9 : 0.25) : 0.9) : 0.08;
      for (const m of mats) m.opacity = op;
    });
    return pf;
  };

  // ---------- Saar, a friendly little ghost, by her lantern ----------
  const saar = buildSaar();
  const npc = w.addNPC(pl, saar, LL(5, 12), { name: 'Saar', bubbleY: 2.2, anim: (dt, t, n) => {
    n.model.r.position.y = 0.3 + Math.sin(t * 2) * 0.15;
    n.model.arms[0].rotation.z = Math.sin(t * 3) * 0.3; n.model.arms[1].rotation.z = -Math.sin(t * 3 + 1) * 0.3;
    n.model.body.rotation.z = Math.sin(t * 1.3) * 0.06;
  } });
  lamp(w, pl, LL(9, 18), 0x7dffb0, 3.0);
  setupFriend(w, ctx, npc, {
    name: 'Saar',
    first: [
      ['SAAR', 'Boo! …Did I scare you? No? Oh. I’m not very good at that. Hi! I’m Saar. I’m a ghost. A nice one.'],
      ['RÊNAS', 'A real ghost?! Hi Saar! I’m Rênas. Captain Rênas. And I’m not scared. At all. Mostly.'],
      ['SAAR', 'Watch out for the ghost platforms. They fade away and come back. When they blink, they’re about to go. Jump before that!'],
      ['SAAR', 'But I have a problem. Koning Boe, the ghost king, stole my three candles. Without them, the whole planet goes dark.'],
      ['SAAR', 'And he wears a glowing core in his crown. The Spookkern. That’s your fuel, isn’t it?'],
      ['RÊNAS', 'Yes! That’s one of mine. Raaf built it for my station.'],
      ['SAAR', 'His bats dropped my candles. One is on the chimney of the haunted house, to the west. One is on top of the crypt in the graveyard.'],
      ['SAAR', 'And one is at the top of the Dode Boom, the giant dead tree up north. Its branches are ghost platforms. Careful!'],
      ['SAAR', 'Vlad and Wendy each found a star shard. Help them and they’ll give them to you. Boo! …Still nothing? Okay.'],
    ],
    progress: (got) => [['SAAR', `Candles: ${got}/5. The haunted house, the crypt, and the top of the Dode Boom. Mind the blinking platforms!`]],
    needLocals: (left) => [['SAAR', `All five candles! Boo-tiful! But the Launch Star still needs star shards. ${left.join(' and ')} still need${left.length === 1 ? 's' : ''} you. Look for the yellow “!”.`]],
    done: [
      ['SAAR', 'My candles! Look, the whole planet is glowing again!'],
      ['SAAR', 'The Launch Star by the old gate is awake. It takes you to De Spookzaal. That’s where Koning Boe is.'],
      ['SAAR', 'He throws ghost fire: watch the red circles. Sometimes he vanishes and spooky spikes pop up: keep moving!'],
      ['SAAR', 'Ghost secret: when he rises up high, he’s going to SWOOP at you. Dodge, and he crashes into the floor. Then jump on his crown!'],
    ],
    after: [['SAAR', 'Fire: dodge. Spikes: move. Swoop: dodge, then bonk the crown. Boo!']],
    bubbles: {
      new: ['Boo!', '…Scared?', '*floats*'],
      progress: ['My candles…', 'Mind the blinking!', 'Boo?', 'Psst. The Griezelgang has a golden gear at the end.'],
      done: ['To the Launch Star!', 'Bonk the crown!', 'Boo-tiful!'],
    },
  });

  // ---------- the locals ----------
  setupLocal(w, ctx, {
    id: 'vlad', name: 'Vlad', who: 'VLAD', dir: LL(-30, -76), bubbleY: 2.0,
    model: buildLocal({ s: 0.74, skin: 0xe8e0f0, shirt: 0x2b2440, pants: 0x2b2440, hair: 0x1a1020 }),
    anim: (dt, t, n) => { n.model.arms[0].rotation.x = n.model.arms[1].rotation.x = -0.4 + Math.sin(t * 2) * 0.1; n.model.head.rotation.y = Math.sin(t * 0.8) * 0.4; },
    task: { type: 'fetch', dir: LL(-46, -94), alt: 6.8, model: buildTrinket('teddy'), banner: 'VLAD’S TEDDY!', found: 'Mister Fangs! Bring him back. I can’t sleep without him!' },
    first: [
      ['VLAD', 'Good evening. I am Vlad. I am a little vampire. I only drink tomato juice.'],
      ['VLAD', 'A bat took my teddy bear, Mister Fangs, and dropped him on top of the bone tower over there.'],
      ['VLAD', 'I can’t sleep without him. And vampires sleep ALL day. Please bring him back. My star shard is yours.'],
    ],
    progress: () => [['VLAD', 'Mister Fangs is on top of the bone tower. Hop up, please. I’m very sleepy.']],
    done: [['VLAD', 'Mister Fangs! I missed you! …Don’t look, I’m not crying. Vampires don’t cry.'], ['VLAD', 'Here, a star shard. It was in my coffin. Under my pillow.']],
    after: [['VLAD', 'Goodnight. …It’s morning somewhere, right?']],
    bubbles: { new: ['Good evening.', 'Mister Fangs…', '*yawns*'], progress: ['The bone tower!', 'So sleepy…', 'Please…'], done: ['Mister Fangs!', 'Thank you.', '*sleeps standing up*'] },
  });
  [[-34, -82, 1.6], [-37, -86, 3.0], [-41, -89, 4.4], [-46, -94, 5.8]].forEach(([la, lo, h], i) => w.addPlatform(pl, { lat: la, lon: lo, r: i === 3 ? 1.5 : 1.1, h, sides: 6, color: 0xe8e0d0, top: 0xfff8ec }));
  setupLocal(w, ctx, {
    id: 'wendy', name: 'Wendy', who: 'WENDY', dir: LL(-30, 196), bubbleY: 2.0,
    model: buildLocal({ s: 0.76, skin: 0x8a5a3a, shirt: 0x5a2a8a, pants: 0x2b2440, hair: 0x1a1010, hat: 'curls' }),
    anim: (dt, t, n) => { n.model.arms[1].rotation.x = -2.0 + Math.sin(t * 4) * 0.3; },
    task: { type: 'duel', game: 'simon', rounds: [3, 4, 5], speed: 0.9, colors: [0x9a5aff, 0x5cff9a, 0xff8a2a, 0xe8e0ff], names: ['PURPLE!', 'GREEN!', 'ORANGE!', 'WHITE!'], winTitle: 'SPELL CAST!', found: 'You cast the whole spell! Come back to me!', lost: 'Oops, wrong stone! The spell went poof. Talk to me to try again!' },
    first: [
      ['WENDY', 'Hi! I’m Wendy. I’m a witch. A trainee witch. I can already do one spell: making pumpkins.'],
      ['WENDY', 'But for the big spell I need a helper. Press the magic buttons after me: my four glowing stones.'],
      ['RÊNAS', 'What does the big spell do?'],
      ['WENDY', 'It makes… cupcakes. Hopefully. Last time it made a frog. The frog was nice.'],
      ['WENDY', 'Watch my stones light up, then press them in the same order. Three spells. Get them right and my star shard is yours!'],
    ],
    progress: () => [['WENDY', 'Let’s try again! Abracadabra… watch closely!']],
    done: [['WENDY', 'We did it! …It made a pumpkin. A very small one. Still counts!'], ['WENDY', 'Here, a star shard. It fell out of my spell book.']],
    after: [['WENDY', 'Abracadabra! …Nope, still no cupcakes.']],
    bubbles: { new: ['Hi!', 'Need a helper!', 'Abracadabra!'], progress: ['Try again!', 'Watch closely!', 'Magic steps!'], done: ['Thank you!', 'Cupcakes next!', '*waves her wand*'] },
  });

  // ---------- decor: gravestones, dead trees, pumpkins, wisps ----------
  [[14, 30], [-10, 40], [30, 80], [-50, 30], [50, -10], [-10, 120], [20, 170], [-60, 160], [10, 230], [40, 260], [-30, 290], [60, 320]].forEach(([la, lo], i) => {
    const tr = new THREE.Group(), bark = toon(0x3a2a3a);
    mk(new THREE.CylinderGeometry(0.15, 0.3, 3, 6), bark, 0, 1.5, 0, tr, 1.06);
    for (let k = 0; k < 4; k++) { const b = mk(new THREE.CylinderGeometry(0.05, 0.1, 1.4, 5), bark, 0, 2.2 + k * 0.25, 0, tr, 1.06); b.rotation.set(Math.cos(k * 1.7) * 1.0, k, Math.sin(k * 1.7) * 1.0); b.position.x = Math.cos(k * 1.7) * 0.5; b.position.z = Math.sin(k * 1.7) * 0.5; }
    w.put(pl, tr, LL(la, lo), 0, i); w.addSolid(pl, LL(la, lo), 0.35, 3);
  });
  for (let i = 0; i < 18; i++) {   // gravestones
    const s = new THREE.Group();
    mk(new THREE.BoxGeometry(0.7, 0.9, 0.2), toon(0x8a8a9c), 0, 0.45, 0, s, 1.06);
    mk(new THREE.CylinderGeometry(0.35, 0.35, 0.2, 12, 1, false, 0, Math.PI), toon(0x8a8a9c), 0, 0.9, 0, s, 1.06).rotation.set(Math.PI / 2, 0, Math.PI / 2);
    w.put(pl, s, LL(-64 + (i * 29) % 128, 25 + i * 37), 0, i * 0.7);
  }
  for (let i = 0; i < 10; i++) {   // jack-o'-lanterns
    const p = new THREE.Group();
    mk(new THREE.SphereGeometry(0.35, 12, 10), toon(0xff8a1a), 0, 0.3, 0, p, 1.06).scale.y = 0.8;
    for (const s of [-1, 1]) mk(new THREE.ConeGeometry(0.06, 0.1, 3), basic(0xffe14a), 0.12 * s, 0.36, 0.32, p, 0).rotation.x = Math.PI / 2;
    w.put(pl, p, LL(-50 + (i * 23) % 100, 10 + i * 53), 0, i);
  }
  const wisps = [];
  for (let i = 0; i < 12; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), basic(0x7dffb0, { transparent: true, opacity: 0.7 })); w.group.add(m); wisps.push({ m, d: LL(-60 + i * 10, i * 30), ph: i }); }
  w.updaters.push((dt, t) => { for (const o of wisps) { const d = frameDir(o.d, 90 - 4, (t * 20 + o.ph * 30) % 360); o.m.position.copy(surf(pl, d, 2 + Math.sin(t * 2 + o.ph) * 0.6)); } });
  [[16, -20], [-26, 160], [12, 290], [44, 200], [-50, 240], [-34, 196], [-46, 206]].forEach(([la, lo], i) => rock(w, pl, LL(la, lo), 0.9 + (i % 3) * 0.4, 0x4a4a5a));
  [[-8, -8], [10, 6], [-6, 22]].forEach(([la, lo]) => lamp(w, pl, LL(la, lo), 0x7dffb0, 2.8));
  sign(w, pl, LL(12, -6), textBoard('SPOOKPLANEET', 3.4, 0.9, '#2b1a44', '#7dffb0'), 0.3, 2.6);
  sign(w, pl, LL(-12, 14), textBoard('BLINK = JUMP NOW!', 2.8, 0.7, '#7dffb0', '#2b1a44'), -0.4, 1.8);

  // ---------- A: the haunted house (west): up the porch, the roof, then the chimney ----------
  const T0 = LL(22, -40);
  {
    const house = new THREE.Group();
    mk(new THREE.BoxGeometry(4, 4, 3.4), toon(0x4a3a5a), 0, 2, 0, house, 1.04);
    const roof = mk(new THREE.ConeGeometry(3.2, 2.4, 4), toon(0x2a1a3a), 0, 5.2, 0, house, 1.04); roof.rotation.y = Math.PI / 4;
    for (const [x, y] of [[-1, 2.6], [1, 2.6], [-1, 1.0], [1, 1.0]]) mk(new THREE.PlaneGeometry(0.6, 0.7), basic(0xffe14a), x, y, 1.71, house, 0);
    mk(new THREE.PlaneGeometry(0.8, 1.3), basic(0x1a0a2e), 0, 0.65, 1.71, house, 0);
    w.put(pl, house, T0, 0); w.addSolid(pl, T0, 2.2, 4);
  }
  const porch = [];
  for (let i = 0; i < 7; i++) porch.push(w.addPlatform(pl, { dir: frameDir(T0, 90 - 9.5, 200 + i * 40), hx: 1.0, hz: 0.8, h: 0.9 + i * 1.0, float: true, thick: 0.35, color: 0x5a4a3a, top: 0x8a7a5a }));
  porch.forEach((pf, i) => { coinOn(w, pf); if (i === 3 || i === 5) ghost(pf, 5, i); });
  w.addPlatform(pl, { dir: frameDir(T0, 90 - 4.5, 80), hx: 1.2, hz: 1.2, h: 7.6, float: true, thick: 0.4, color: 0x2a1a3a, top: 0x5a4a6a });
  const chimney = w.addPlatform(pl, { dir: frameDir(T0, 90 - 2.0, 30), hx: 0.8, hz: 0.8, h: 9.0, float: true, thick: 1.2, color: 0x6a3a3a, top: 0x8a5a4a });
  questItem(w, ctx, pl, chimney.n, 9.9, 'candle1', buildCandle());
  ghost(w.addPlatform(pl, { dir: frameDir(T0, 90 - 5, 320), r: 1.0, h: 11, float: true, thick: 0.3, color: 0x9a7aff, top: 0x7dffb0 }), 4, 1);
  rareItem(w, ctx, pl, frameDir(T0, 90 - 5, 320), 12, 'saar-r1', 'Above the haunted house');

  // ---------- B: the graveyard (south-east): up the big gravestones to the crypt ----------
  const stones = [[-14, 62, 1.2], [-17, 68, 2.2], [-20, 74, 3.2], [-23, 80, 4.2], [-26, 86, 5.2]].map(([la, lo, h], i) => w.addPlatform(pl, { lat: la, lon: lo, hx: 0.9, hz: 0.5, h, color: 0x8a8a9c, top: 0xa8a8b8, ...(i === 2 ? {} : {}) }));
  stones.forEach((pf) => coinOn(w, pf));
  const CR = LL(-30, 94);
  {
    const crypt = new THREE.Group();
    mk(new THREE.BoxGeometry(3, 3, 3), toon(0x6a6a7c), 0, 1.5, 0, crypt, 1.04);
    mk(new THREE.BoxGeometry(3.4, 0.4, 3.4), toon(0x5a5a6c), 0, 3.2, 0, crypt, 1.04);
    mk(new THREE.PlaneGeometry(1, 1.6), basic(0x0a0414), 0, 0.8, 1.51, crypt, 0);
    w.put(pl, crypt, CR, 0, 0.6);
  }
  ghost(w.addPlatform(pl, { lat: -28, lon: 90, r: 1.0, h: 5.4, float: true, thick: 0.3, color: 0x9a7aff, top: 0x7dffb0 }), 5, 2);
  const cryptTop = w.addPlatform(pl, { dir: CR, hx: 1.7, hz: 1.7, h: 6.4, float: true, thick: 0.5, color: 0x5a5a6c, top: 0x7a7a8c });
  questItem(w, ctx, pl, cryptTop.n, 7.3, 'candle2', buildCandle());
  ghost(w.addPlatform(pl, { lat: -34, lon: 100, r: 1.0, h: 9.0, float: true, thick: 0.3, color: 0x9a7aff, top: 0x7dffb0 }), 4.5, 0.5);
  rareItem(w, ctx, pl, LL(-34, 100), 10, 'saar-r3', 'Over the crypt');

  // ---------- C: the Dode Boom (north): its branches are ghost platforms ----------
  const TP = LL(48, 150);
  {
    const tree = new THREE.Group(), bark = toon(0x3a2a3a);
    mk(new THREE.CylinderGeometry(0.7, 1.3, 10, 8), bark, 0, 5, 0, tree, 1.04);
    for (let k = 0; k < 7; k++) { const b = mk(new THREE.CylinderGeometry(0.1, 0.25, 3, 6), bark, Math.cos(k * 0.9) * 1.2, 2 + k * 1.2, Math.sin(k * 0.9) * 1.2, tree, 1.06); b.rotation.set(Math.cos(k * 0.9) * 1.1, 0, Math.sin(k * 0.9) * 1.1); }
    w.put(pl, tree, TP, 0); w.addSolid(pl, TP, 1.1, 10);
  }
  const branches = [];
  for (let i = 0; i < 8; i++) branches.push(w.addPlatform(pl, { dir: frameDir(TP, 90 - 6.5, i * 50), r: 1.05, h: 1.0 + i * 1.1, float: true, thick: 0.35, color: 0x5a4a6a, top: 0x9a7aff }));
  branches.forEach((pf, i) => { if (i < 7) coinOn(w, pf); if (i % 2 === 1) ghost(pf, 5, i * 0.7); });
  const crown = w.addPlatform(pl, { dir: TP, r: 1.6, h: 10.4, float: true, thick: 0.5, color: 0x3a2a3a, top: 0x7dffb0 });
  questItem(w, ctx, pl, frameDir(TP, 90 - 2.4, 90), 11.4, 'candle3', buildCandle());
  void crown;

  // ---------- Launch Star under the old cemetery gate ----------
  const gate = new THREE.Group();
  for (const s of [-1, 1]) mk(new THREE.BoxGeometry(0.6, 3.6, 0.6), toon(0x4a4a5a), 1.8 * s, 1.8, 0, gate, 1.05);
  const arch = mk(new THREE.TorusGeometry(1.8, 0.15, 6, 16, Math.PI), toon(0x2a2a3a), 0, 3.6, 0, gate, 1.05); void arch;
  for (const s of [-1, 1]) mk(new THREE.SphereGeometry(0.2, 8, 6), basic(0x7dffb0), 1.8 * s, 3.8, 0, gate, 0);
  w.put(pl, gate, LL(-4, 254), 0);
  w.launchStar = w.addLaunchStar(pl, LL(-6, 244), { label: 'Launch to De Spookzaal!', lockedText: 'Saar needs her 5 candles, and the Launch Star needs 3 star shards', use: () => ctx.toArena(w) });
  w.unlockLaunch = () => w.launchStar.setActive(true);
  if (ctx.ws(w).fstate === 'done') w.unlockLaunch();

  // ---------- secrets ----------
  w.addPlatform(pl, { lat: -82, lon: 0, r: 2, h: 1.2, float: true, color: 0x5a4a6a, top: 0x9a7aff, bob: [0.5, 1, 0] });
  rareItem(w, ctx, pl, LL(-90, 0), 2.4, 'saar-r2', 'Under the Spookplaneet');
  coinRing(w, pl, LL(-90, 0), 5, 8);
  coinRing(w, pl, LL(0, 0), 4.5, 8);
  coinLine(w, pl, LL(20, 190), LL(26, 240), 5);
  coinLine(w, pl, LL(-4, 30), LL(-10, 46), 4);

  // ---------- De Griezelgang: a parkour over a bottomless void, through a creaky door ----------
  const door = new THREE.Group();
  mk(new THREE.BoxGeometry(2.4, 3.2, 0.6), toon(0x4a4a5a), 0, 1.6, 0, door, 1.04);
  mk(new THREE.BoxGeometry(1.2, 2.2, 0.1), basic(0x0a0414), 0, 1.1, 0.31, door, 0);
  const dSign = textBoard('GRIEZELGANG', 2.4, 0.6, '#2b1a44', '#7dffb0'); dSign.position.set(0, 3.5, 0.35); door.add(dSign);
  w.put(pl, door, LL(-16, -26), 0, 0.5);
  addParkour(w, ctx, {
    home: pl, entryDir: LL(-16, -26), entryPrompt: '<kbd>E</kbd> enter the Griezelgang', exitDir: LL(-11, -19), exitFwd: LL(0, 0),
    title: 'De Griezelgang', sub: 'Mind the void. Candle beacons are checkpoints.', voidText: 'Into the void! Back to the last candle beacon.',
    rareId: 'saar-r4', rareName: 'The end of the Griezelgang', marker: () => buildBeacon(0x4a4a5a, 0x7dffb0),
    theme: {
      sky: 'radial-gradient(ellipse at 50% 40%,#2a1a44 0%,#12081e 55%,#030106 100%)',
      dome: [0x3a2a5a, 0x2a1a44, 0x1a0a2e, 0x7dffb0], gems: [0x7dffb0, 0x9a7aff, 0xff8a1a], core: 0x1a0a2e, glow: 0x7dffb0,
      plat: 0x5a4a6a, platTop: 0x9a7aff, alt: 0x8a8a9c, crumble: 0x4a4a5a, bounce: 0xff8a1a, puff: 0x7dffb0, cpTop: 0x7dffb0, finTop: 0xffd23a, signFg: '#7dffb0', signBg: '#1a0a2e',
    },
    route: [['hop', 3], ['bob', 3], ['zig', 3], ['cp'], ['crumble', 3], ['circle', 2], ['cp'], ['bounce'], ['zig', 2], ['gap'], ['down', 2], ['hop', 2]],
  });

  // ---------- enemies: little ghosts and rolling pumpkins ----------
  [[-50, 120], [10, 70], [20, 40], [-10, 170], [50, 290], [-30, 320], [34, -80]].forEach(([la, lo]) => w.addEnemy(pl, LL(la, lo), 'ghost', { roam: 0.15 }));
  [[-20, 140], [30, 110], [40, 230], [-40, 60], [0, 300]].forEach(([la, lo]) => w.addEnemy(pl, LL(la, lo), 'pumpkin', { roam: 0.2 }));

  // ---------- more: candles 4 and 5, and Noor ----------
  addMore(w, ctx, pl, {
    item: () => buildCandle(), prefix: 'candle', color: 0x5a4a6a, top: 0x9a7aff,
    local: {
      id: 'noor', name: 'Noor', who: 'NOOR',
      model: buildLocal({ s: 0.74, skin: 0xd8a070, shirt: 0x3a6a4a, pants: 0x2b2440, hair: 0x2b1a10, hat: 'bun' }),
      anim: (dt, t, n) => { n.model.arms[0].rotation.x = n.model.arms[1].rotation.x = -1.2; n.model.head.rotation.x = 0.3; },
      task: { type: 'fetch', model: buildTrinket('book'), banner: 'NOOR’S STORYBOOK!', found: 'My storybook! Bring it back, I want to know how it ends!' },
      first: [
        ['NOOR', 'Shh! Oh, hi. I’m Noor. I collect ghost stories. Real ones. From real ghosts.'],
        ['NOOR', 'But a gust of wind blew my storybook up onto the steps up north. Right at the scariest part! Can you get it?'],
      ],
      progress: () => [['NOOR', 'My storybook is on the steps up north. Hurry, I need to know how it ends!']],
      done: [['NOOR', 'My storybook! …Oh! The ghost was nice all along. I KNEW it.'], ['NOOR', 'Here, a star shard. I used it as a bookmark.']],
      after: [['NOOR', 'Once upon a time, a little astronaut came to the Spookplaneet… That’s you! You’re in my book now!']],
      bubbles: { new: ['Shh!', 'My book…', 'The scary part!'], progress: ['Up north!', 'Hurry!', 'How does it end?'], done: ['The end!', 'Thank you!', '*reads*'] },
    },
  });

  // ---------- boss ----------
  w.boss = new Boe(w, arena);
  w.hitLines = [['SAAR', '(radio) BONK! Right on the crown! Boo-tiful!'], ['SAAR', '(radio) He’s really angry now! More ghost fire! Keep going!']];
  w.winLines = [
    ['KONING BOE', 'Booo… hoo. Okay. OKAY. You win, little astronaut. You’re braver than you look.'],
    ['KONING BOE', 'Take the Spookkern. And give Saar back her candles. I was just… scared of the dark.'],
    ['RATJETOE', 'Fuel secured: the Spookkern. Range: one more stop. Warning: Kayo & Yara signal detected. Next: Maankrater.'],
    ['RATJETOE', 'Oh, and… the cats sent me a message. Something about a cheese the size of a moon. I deleted it! …Probably.'],
    ['RÊNAS', 'Kayo and Yara?! On the moon? I’m coming for you, cats!'],
  ];
  return w;
}
