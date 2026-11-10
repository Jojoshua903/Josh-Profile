import { World, addStars, addBackdropPlanet, LL, frameDir, V3, toon, basic, mk, THREE, coinRing, coinLine, coinOn, crystal, rock, lamp, sign, addRocket, questItem, rareItem, setupFriend, setupLocal, lavaFloor, geyser, addMore } from './worlds-common.js?v=20261111q';
import { fbm } from './world.js?v=20261111q';
import { puff } from './core.js?v=20261111q';
import { buildImmanuel, buildFireGem, buildHammer, textBoard, buildLocal } from './models.js?v=20261111q';
import { Smeul } from './bosses.js?v=20261111q';
import { addParkour, buildBeacon } from './parkour.js?v=20261111q';
import { duelModels } from './duels.js?v=20261111q';

// World 6 on the route: DE ASBERG. A volcano planet: rivers of lava, geysers, basalt towers.
// New here: the lava floor burns (hop out!) and geysers that hurt, or shoot you sky-high.
// Boss: Smeul, the fire dragon, on the Krater Kroon.
export function buildLava(ctx) {
  const w = new World('lotte');
  Object.assign(w, {
    index: 6, title: 'De Asberg', sub: 'Lava, geysers and one grumpy dragon.', friendName: 'Immanuel',
    arenaTitle: 'De Krater Kroon', arenaSub: 'Smeul is heating up',
    sky: 'linear-gradient(180deg,#1a0a10 0%,#4a1a1a 40%,#c8502a 80%,#ffb03a 100%)',
    arenaSky: 'linear-gradient(180deg,#0a0408 0%,#3a0a0a 45%,#a8301a 80%,#ff7a2a 100%)',
    music: 'lava', bossMusic: 'boss7', lights: [0xffe0c0, 0x5a1a1a],
    quest: { icon: '🔥', label: 'Fire gems', got: 0, need: 3 },
  });
  w.quest.got = ctx.ws(w).items.length;
  addStars(w, 300);
  addBackdropPlanet(w, V3(190, 110, -130), 18, 0xff7a2a, 0x5a1a1a);
  addBackdropPlanet(w, V3(-170, -80, 150), 12, 0x8a6a6a);

  // places that must never be lava: where you land, the friends, the quest spots, the Launch Star
  const SAFE = [LL(0, 0), LL(5, 12), LL(-4, 9), LL(-30, -76), LL(-30, 196), LL(-40, 220), LL(-6, 244), LL(-4, 254), LL(-16, -26), LL(-11, -19), LL(-90, 0)].map((d) => [d, 0.982]).concat([[LL(22, -40), 0.955], [LL(48, 150), 0.955]]);
  const LAKE = LL(-22, 78);
  const lavaAt = (p) => {
    for (const [d, c] of SAFE) if (p.dot(d) > c) return false;
    if (p.dot(LAKE) > 0.955) return true;                                     // the lava lake
    return fbm(p, 2.2) < 0.34 && p.z < 0.8;
  };
  const b1 = new THREE.Color(0x3a3038), b2 = new THREE.Color(0x2a2228), b3 = new THREE.Color(0x4a3a40), lava = new THREE.Color(0xff6a2a), glow = new THREE.Color(0xffb03a), ash = new THREE.Color(0x6a5a5a);
  const pl = w.addPlanet({
    c: V3(0, 0, 0), r: 24, shape: 'vulkaan', atmo: 0xff7a2a, atmoOp: 0.14,
    paint: (p, out) => {
      const n = fbm(p, 2.6);
      out.copy(n > 0.6 ? b3 : n > 0.45 ? b1 : b2);
      if (fbm(p, 7) > 0.76) out.copy(ash);
      if (lavaAt(p)) out.copy(fbm(p, 9) > 0.55 ? glow : lava);
      if (p.z > 0.965 && Math.abs(p.x) < 0.05) out.copy(ash);
    },
  });
  w.main = pl;
  lavaFloor(w, pl, lavaAt);
  const a1 = new THREE.Color(0x3a3038), a2 = new THREE.Color(0x2a2228), al = new THREE.Color(0xff6a2a);
  const arena = w.addPlanet({
    c: V3(0, 30, -120), r: 14, atmo: 0xff5a2a, atmoOp: 0.16,
    paint: (p, out) => { const n = fbm(p, 3); out.copy(Math.abs(n - 0.5) < 0.02 ? al : n > 0.5 ? a1 : a2); },
  });
  w.arena = arena;
  w.spawn = { dir: LL(0, 0), fwd: V3(0, 1, 0) };
  w.arenaSpawn = { dir: arena.c.clone().negate().normalize(), fwd: V3(0, 1, 0) };
  addRocket(w, ctx, pl, LL(-4, 9));

  // ---------- Immanuel at his measuring station, keeping his ball up ----------
  const imm = buildImmanuel();
  const npc = w.addNPC(pl, imm, LL(5, 12), { name: 'Immanuel', bubbleY: 2.0, anim: (dt, t, n) => {
    // keepie-uppies: the ball bounces off his right foot, he kicks in rhythm
    const k = (t * 1.6) % 1, foot = n.model.legs[1];
    n.model.ball.position.y = 0.2 + Math.sin(k * Math.PI) * 0.9;
    n.model.ball.rotation.x += dt * 8;
    foot.rotation.x = k < 0.12 || k > 0.92 ? -0.7 : 0;
    n.model.arms[0].rotation.z = -0.35 + Math.sin(t * 10) * 0.05; n.model.arms[1].rotation.z = 0.35 - Math.sin(t * 10) * 0.05;
    n.model.head.rotation.x = -0.15 - Math.sin(k * Math.PI) * 0.25;   // eyes on the ball
  } });
  {   // a little soccer goal next to his station
    const goal = new THREE.Group(), post = toon(0xfbf7ef);
    for (const s of [-1, 1]) mk(new THREE.CylinderGeometry(0.06, 0.06, 1.4, 8), post, 1.1 * s, 0.7, 0, goal, 1.08);
    mk(new THREE.CylinderGeometry(0.06, 0.06, 2.3, 8), post, 0, 1.4, 0, goal, 1.08).rotation.z = Math.PI / 2;
    const net = mk(new THREE.PlaneGeometry(2.2, 1.4, 6, 4), basic(0xfbf7ef, { wireframe: true, transparent: true, opacity: 0.5 }), 0, 0.7, -0.5, goal, 0); net.rotation.x = -0.3;
    w.put(pl, goal, LL(2, 20), 0, 2.4);
  }
  {
    const st = new THREE.Group();
    mk(new THREE.BoxGeometry(0.8, 1.0, 0.6), toon(0xd8dce8), 0, 0.5, 0, st, 1.06);
    mk(new THREE.BoxGeometry(0.6, 0.4, 0.02), basic(0x14283a), 0, 0.7, 0.31, st, 0);
    const needle = mk(new THREE.BoxGeometry(0.04, 0.3, 0.02), basic(0xff3a3a), 0, 0.7, 0.33, st, 0);
    mk(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 6), toon(0x9aa0b8), 0.3, 1.5, 0, st, 0);
    w.put(pl, st, LL(8, 16), 0, 0.4); w.addSolid(pl, LL(8, 16), 0.5, 1.0);
    w.updaters.push((dt, t) => { needle.rotation.z = Math.sin(t * 7) * 0.6 + Math.sin(t * 23) * 0.2; });
  }
  setupFriend(w, ctx, npc, {
    name: 'Immanuel',
    first: [
      ['IMMANUEL', 'Stop! Don’t step on the orange bits! That’s lava. Oh, hey! Welcome to De Asberg.'],
      ['RÊNAS', 'Lava?! Is that… normal? And why are you playing soccer next to a volcano?'],
      ['IMMANUEL', 'I’m Immanuel. I measure the volcano, and in between I train. Best place to practise: if the ball goes in the lava, you learn not to miss.'],
      ['IMMANUEL', 'But we have a problem. Smeul. A fire dragon. He lives in the crater and he’s in a VERY bad mood.'],
      ['IMMANUEL', 'He blew my three fire gems right out of my measuring station. Without them I can’t predict the next eruption. Red card for Smeul.'],
      ['RÊNAS', 'Does he have an energy core, by any chance?'],
      ['IMMANUEL', 'How did you know? The Vuurkern. Forged in lava. He sleeps on it like a pillow.'],
      ['IMMANUEL', 'One gem landed on the floating rocks over the lava lake. One is on top of the Basalt Towers in the west: use the geyser to get up there.'],
      ['IMMANUEL', 'And one is on the summit of the old cone in the north. Mind the geysers on the way up. They go off every few seconds.'],
      ['IMMANUEL', 'Bram the blacksmith and little Pip each found a star shard. Help them and they’ll give them to you. And remember: orange is hot!'],
    ],
    progress: (got) => [['IMMANUEL', `Fire gems: ${got}/5. The lava lake, the Basalt Towers, and the summit of the old cone. Orange is hot!`]],
    needLocals: (left) => [['IMMANUEL', `All five fire gems! Hat-trick! But the Launch Star still needs star shards. ${left.join(' and ')} still need${left.length === 1 ? 's' : ''} you. Look for the yellow “!”.`]],
    done: [
      ['IMMANUEL', 'My fire gems! GOOOAL! The needle is moving again. Prediction: one very angry dragon.'],
      ['IMMANUEL', 'The Launch Star is awake. It takes you to the Krater Kroon. That’s where Smeul is.'],
      ['IMMANUEL', 'He throws meteors, he flies, and his stomps send lava waves. Jump over those.'],
      ['IMMANUEL', 'But his flame breath takes all his air. After that he’s out of breath and his head drops to the ground. THAT’s your chance. Shoot!'],
    ],
    after: [['IMMANUEL', 'Meteors: dodge. Waves: jump. After the flame breath: jump on his head. Like a penalty. Go!']],
    bubbles: {
      new: ['Orange is hot!', 'Watch your step!', '*keeps the ball up*'],
      progress: ['My fire gems…', 'Use the geyser!', 'Mind the lava!', 'Psst. The Magmagang has a golden gear at the end.'],
      done: ['To the Launch Star!', 'Out of breath = shoot!', 'GOOOAL!'],
    },
  });

  // ---------- the locals ----------
  setupLocal(w, ctx, {
    id: 'bram', name: 'Bram', who: 'BRAM', dir: LL(-30, -76), bubbleY: 2.0,
    model: buildLocal({ s: 0.86, skin: 0xe0b090, shirt: 0x5a3a2a, pants: 0x3a3640, hair: 0x2b2440, beard: 0x3a2a20, shoes: 0x2b2440 }),
    anim: (dt, t, n) => { n.model.arms[1].rotation.x = -0.4 - Math.abs(Math.sin(t * 3)) * 0.3; n.model.body.rotation.z = Math.sin(t * 1.2) * 0.04; },
    task: { type: 'fetch', dir: LL(-44, -92), alt: 6.6, model: buildHammer(), banner: 'BRAM’S HAMMER!', found: 'My hammer! Bring it back, and don’t drop it in the lava!' },
    first: [
      ['BRAM', 'Hmph. A visitor. I’m Bram. Blacksmith. I forge things in the lava. Swords, pans, the occasional spoon.'],
      ['BRAM', 'Smeul sneezed and my hammer flew right onto the tall rock past the lava stream. I can’t jump. I’m a blacksmith.'],
      ['BRAM', 'Hop across the floating stones. Bring it back and my star shard is yours.'],
    ],
    progress: () => [['BRAM', 'My hammer is on the tall rock past the lava stream. Hop across the floating stones.']],
    done: [['BRAM', 'My hammer! Ah. It’s still warm. Good.'], ['BRAM', 'Here’s the star shard. It fell into my forge. I fished it out with tongs.']],
    after: [['BRAM', '*CLANG* …Sorry. Spoon emergency.']],
    bubbles: { new: ['Hmph.', 'My hammer…', '*clang*'], progress: ['The tall rock!', 'Floating stones.', 'Don’t fall in.'], done: ['Thanks.', '*CLANG*', 'Good hammer.'] },
  });
  w.addPlatform(pl, { lat: -44, lon: -92, hx: 1.6, hz: 1.6, h: 5.6, color: 0x3a3038, top: 0x5a4a50 });
  [[-34, -82, 1.2], [-37, -86, 2.4], [-40, -88, 3.6], [-42, -90, 4.8]].forEach(([la, lo, h], i) => w.addPlatform(pl, { lat: la, lon: lo, r: 1.0, h, float: true, thick: 0.4, color: 0x4a3a40, top: 0xff9a2a, ...(i % 2 ? { bob: [0.35, 1.3, i] } : {}) }));
  setupLocal(w, ctx, {
    id: 'pip', name: 'Pip', who: 'PIP', dir: LL(-30, 196), bubbleY: 1.6,
    model: buildLocal({ s: 0.6, skin: 0xf6d8c0, shirt: 0xff7a3a, pants: 0x3a4a7a, hair: 0xd8602a, hat: 'beanie', capC: 0xffd23a, shoes: 0xfbf7ef }),
    anim: (dt, t, n) => { n.model.arms[0].rotation.x = n.model.arms[1].rotation.x = -2.4 + Math.sin(t * 8) * 0.3; n.model.r.position.y = Math.abs(Math.sin(t * 5)) * 0.1; },
    task: { type: 'duel', game: 'dodge', time: 20, every: 0.95, fly: 1.05, color: 0xff7a2a, model: duelModels.rock, winTitle: 'DODGE MASTER!', found: 'You dodged everything! Come back, I want to say thank you!', lost: 'Got you! Volcano scientist wins! Talk to me for a rematch!' },
    first: [
      ['PIP', 'Whoa, a real astronaut! I’m Pip. I’m going to measure volcanoes too. Like Immanuel. And play soccer like him.'],
      ['PIP', 'I’m practising being a volcano. Volcanoes throw rocks. So I throw rocks! Soft ones. Mostly.'],
      ['RÊNAS', 'At me?'],
      ['PIP', 'At you! The red circle shows where they land. Don’t get hit for twenty seconds!'],
      ['PIP', 'If you can do that, you get my star shard. It glows in the dark!'],
    ],
    progress: () => [['PIP', 'Again? Okay! I’m a volcano! RUMBLE RUMBLE!']],
    done: [['PIP', 'You dodged EVERYTHING! You’re like a… a… rock that doesn’t get hit!'], ['PIP', 'Here’s the star shard. It glows in the dark. I used it as a nightlight.']],
    after: [['PIP', 'When I grow up I’m going to name a volcano after you. Mount Rênas.']],
    bubbles: { new: ['A real astronaut!', 'I’m a volcano!', 'Dodge this!'], progress: ['Again?', 'RUMBLE!', 'Watch the circles!'], done: ['Thank you!', 'Mount Rênas!', 'You’re fast!'] },
  });

  // ---------- decor: black rocks, smoking vents, glowing crystals ----------
  [[16, -20], [-26, 160], [12, 290], [44, 200], [-50, 240], [-36, 206], [-46, 214], [30, 60], [-8, 120]].forEach(([la, lo], i) => rock(w, pl, LL(la, lo), 0.9 + (i % 3) * 0.4, 0x2a2228));
  [[20, 100, 0xff7a2a], [-40, 160, 0xffd23a], [54, 250, 0xff5a2a], [-58, 20, 0xff7a2a]].forEach(([la, lo, c], i) => crystal(w, pl, LL(la, lo), c, 0.9 + i * 0.2));
  for (let i = 0; i < 10; i++) {
    const v = new THREE.Group(); mk(new THREE.ConeGeometry(0.6, 0.8, 8), toon(0x2a2228), 0, 0.4, 0, v, 1.06);
    const d = LL(-60 + (i * 31) % 120, i * 37 + 10); w.put(pl, v, d, 0);
    w.updaters.push((dt) => { if (Math.random() < dt * 2.5) puff(v.position.clone().addScaledVector(d, 0.8), 1, 0x8a7a7a, 1, 1.2, d); });
  }
  [[-8, -8], [10, 6], [-6, 22]].forEach(([la, lo]) => lamp(w, pl, LL(la, lo), 0xff9a2a, 2.8));
  sign(w, pl, LL(12, -6), textBoard('DE ASBERG', 3.4, 0.9, '#3a3038', '#ff9a2a'), 0.3, 2.6);
  sign(w, pl, LL(-12, 14), textBoard('ORANGE = HOT!', 2.8, 0.7, '#ff7a2a', '#2a2228'), -0.4, 1.8);
  // geysers that hurt, scattered around
  [[-10, 60], [30, 120], [-50, 180], [20, 230], [-20, 300], [50, 40]].forEach(([la, lo], i) => geyser(w, pl, LL(la, lo), { period: 4.5 + (i % 3), phase: i * 1.3 }));

  // ---------- A: floating rocks over the lava lake (south-east) ----------
  const lk = [[-12, 62, 1.2], [-15, 68, 2.0], [-18, 73, 2.8], [-21, 78, 3.6], [-24, 83, 4.4]].map(([la, lo, h], i) => w.addPlatform(pl, { lat: la, lon: lo, r: 1.2, h, float: true, thick: 0.5, color: 0x3a3038, top: 0x5a4a50, ...(i % 2 ? { bob: [0.5, 1.2, i] } : {}), ...(i === 3 ? { crumble: true } : {}) }));
  lk.forEach((pf) => coinOn(w, pf));
  const lkEnd = w.addPlatform(pl, { lat: -27, lon: 88, r: 1.5, h: 5.2, float: true, thick: 0.6, color: 0x3a3038, top: 0xff9a2a });
  questItem(w, ctx, pl, lkEnd.n, 6.2, 'gem1', buildFireGem());
  // a little island in the middle of the lake, with a secret
  w.addPlatform(pl, { dir: LAKE, r: 1.3, h: 0.6, color: 0x3a3038, top: 0x5a4a50 });
  rareItem(w, ctx, pl, LAKE, 1.6, 'lotte-r3', 'In the middle of the lava lake');

  // ---------- B: the Basalt Towers (west), with a launch geyser ----------
  const T0 = LL(22, -40);
  const tw = [[0, 0, 8.5], [3.8, 0, 2.0], [3.8, 120, 3.6], [3.8, 240, 5.2]].map(([off, ang, h]) => w.addPlatform(pl, { dir: off ? frameDir(T0, 90 - off * 2.4, ang) : T0, r: 1.3, h, sides: 6, color: 0x2a2228, top: 0x4a3a40 }));
  tw.slice(1).forEach((pf) => coinOn(w, pf));
  questItem(w, ctx, pl, T0, 9.6, 'gem2', buildFireGem());
  geyser(w, pl, frameDir(T0, 90 - 13, 300), { color: 0xff9a2a, period: 3.2, launch: true });
  w.addPlatform(pl, { dir: frameDir(T0, 90 - 19, 300), r: 1.3, h: 8.6, float: true, thick: 0.5, color: 0x4a3a40, top: 0xffd23a });   // off to the side: steer over while you fly
  rareItem(w, ctx, pl, frameDir(T0, 90 - 19, 300), 9.6, 'lotte-r1', 'On top of the launch geyser');
  sign(w, pl, frameDir(T0, 90 - 17, 300), textBoard('GEYSER ▸ UP!', 2.2, 0.6, '#ffd23a', '#2a2228'), 0, 1.6);

  // ---------- C: the old cone (north): climb the rings, mind the geysers ----------
  const TP = LL(48, 150);
  const cone = [[4.2, 1.2], [3.2, 2.6], [2.2, 4.0], [1.3, 5.6]].map(([r, h]) => w.addPlatform(pl, { dir: TP, r, h, sides: 12, color: 0x3a3038, top: 0x5a4a50 }));
  void cone;
  [[3.7, 30], [2.7, 150], [1.75, 270]].forEach(([off, ang], i) => geyser(w, pl, frameDir(TP, 90 - off * 2.4, ang), { period: 3.6, phase: i * 1.2 }));
  questItem(w, ctx, pl, TP, 6.6, 'gem3', buildFireGem());
  w.addPlatform(pl, { dir: frameDir(TP, 90 - 15, 0), r: 1.2, h: 0.4, color: 0x2a2228, top: 0xff9a2a, bounce: 19, puff: 0xff9a2a });   // a shortcut vent

  // ---------- Launch Star between two lava pillars ----------
  const gate = new THREE.Group();
  for (const s of [-1, 1]) { mk(new THREE.CylinderGeometry(0.5, 0.7, 3.6, 6), toon(0x2a2228), 1.8 * s, 1.8, 0, gate, 1.05); mk(new THREE.SphereGeometry(0.35, 10, 8), basic(0xff9a2a), 1.8 * s, 3.8, 0, gate, 0); }
  w.put(pl, gate, LL(-4, 254), 0);
  w.launchStar = w.addLaunchStar(pl, LL(-6, 244), { label: 'Launch to the Krater Kroon!', lockedText: 'Immanuel needs his 5 fire gems, and the Launch Star needs 3 star shards', use: () => ctx.toArena(w) });
  w.unlockLaunch = () => w.launchStar.setActive(true);
  if (ctx.ws(w).fstate === 'done') w.unlockLaunch();

  // ---------- secrets ----------
  w.addPlatform(pl, { lat: -82, lon: 0, r: 2, h: 1.2, float: true, color: 0x3a3038, top: 0x5a4a50, bob: [0.5, 1, 0] });
  rareItem(w, ctx, pl, LL(-90, 0), 2.4, 'lotte-r2', 'Under the volcano planet');
  coinRing(w, pl, LL(-90, 0), 5, 8);
  coinRing(w, pl, LL(0, 0), 4.5, 8);
  coinLine(w, pl, LL(20, 190), LL(26, 240), 5);
  coinLine(w, pl, LL(-4, 30), LL(-10, 46), 4);

  // ---------- De Magmagang: a parkour over a bottomless void, inside a lava tube ----------
  const tube = new THREE.Group();
  mk(new THREE.SphereGeometry(2.3, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), toon(0x2a2228), 0, 0, 0, tube, 1.04);
  mk(new THREE.CircleGeometry(1.2, 18), basic(0x1a0404), 0, 0.9, 2.15, tube, 0);
  mk(new THREE.TorusGeometry(1.25, 0.12, 6, 20, Math.PI), basic(0xff7a2a), 0, 0.9, 2.18, tube, 0);
  const tubeSign = textBoard('MAGMAGANG', 2.4, 0.6, '#ff7a2a', '#1a0404'); tubeSign.position.set(0, 2.6, 1.9); tube.add(tubeSign);
  w.put(pl, tube, LL(-16, -26), 0, 0.5);
  addParkour(w, ctx, {
    home: pl, entryDir: LL(-16, -26), entryPrompt: '<kbd>E</kbd> enter the Magmagang', exitDir: LL(-11, -19), exitFwd: LL(0, 0),
    title: 'De Magmagang', sub: 'Mind the void. Ember beacons are checkpoints.', voidText: 'Into the void! Back to the last ember beacon.',
    rareId: 'lotte-r4', rareName: 'The end of the Magmagang', marker: () => buildBeacon(0x2a2228, 0xff7a2a),
    theme: {
      sky: 'radial-gradient(ellipse at 50% 40%,#3a0a0a 0%,#1a0404 55%,#060101 100%)',
      dome: [0x3a2028, 0x2a1418, 0x1a0a0c, 0xff7a2a], gems: [0xff7a2a, 0xffd23a, 0xff3a2a], core: 0x2a0a04, glow: 0xff7a2a,
      plat: 0x2a2228, platTop: 0xff7a2a, alt: 0x4a3a40, crumble: 0x6a5a5a, bounce: 0xffd23a, puff: 0xff9a2a, cpTop: 0xffd23a, finTop: 0xffd23a, signFg: '#ff9a2a', signBg: '#1a0404',
    },
    route: [['hop', 3], ['crumble', 3], ['zig', 3], ['cp'], ['bob', 3], ['circle', 2], ['cp'], ['bounce'], ['crumble', 2], ['gap'], ['down', 2], ['hop', 2]],
  });

  // ---------- enemies: magma slugs and fire bats ----------
  [[-50, 120], [10, 70], [20, 40], [-10, 170], [50, 290], [-30, 320], [34, -80]].forEach(([la, lo]) => w.addEnemy(pl, LL(la, lo), 'slug', { roam: 0.15 }));
  [[-20, 140], [30, 100], [40, 230], [0, 300], [-40, 40]].forEach(([la, lo]) => w.addEnemy(pl, LL(la, lo), 'firebat', { roam: 0.2 }));

  // ---------- boss ----------
  // ---------- more: fire gems 4 and 5, and Yassin the kickboxer (from joshibrahim.nl) ----------
  addMore(w, ctx, pl, {
    item: () => buildFireGem(), prefix: 'gem', color: 0x2a2228, top: 0x5a4a50,
    local: {
      id: 'mila', name: 'Yassin', who: 'YASSIN',
      model: buildLocal({ s: 0.82, skin: 0xb07a50, shirt: 0xff3a3a, pants: 0x2b2440, hair: 0x1a1010 }),
      anim: (dt, t, n) => { n.model.arms[0].rotation.x = -1.4 + Math.sin(t * 8) * 0.5; n.model.arms[1].rotation.x = -1.4 - Math.sin(t * 8) * 0.5; },
      task: { type: 'stomp', enemy: 'slug', n: 3, found: 'They’re gone! Come back to me!' },
      first: [
        ['YASSIN', 'Hey! I’m Yassin. Kickboxer. I train up north, by the hot spring. Two hundred push-ups a day.'],
        ['YASSIN', 'But three Lavaslakken slid onto my training spot. I can’t kick them, they’re way too hot! Can you stomp them for me?'],
      ],
      progress: (l) => [['YASSIN', `${l.left} Lavaslakken left on my training spot up north!`]],
      done: [['YASSIN', 'My training spot is free! Time for push-ups. One… two… two hundred!'], ['YASSIN', 'This star shard was under the slugs. Take it, champ!']],
      after: [['YASSIN', 'Want to see my roundhouse kick? …Maybe step back a little first.']],
      bubbles: { new: ['Hey!', 'Too hot!', '*shadowboxes*'], progress: ['Up north!', 'Stomp them!', 'Ouch, hot!'], done: ['Champ!', 'Thanks!', '*does push-ups*'] },
    },
  });

  w.boss = new Smeul(w, arena);
  w.hitLines = [['IMMANUEL', '(radio) Right on the snout! What a shot!'], ['IMMANUEL', '(radio) He’s REALLY hot now! More meteors incoming!']];
  w.winLines = [
    ['SMEUL', '*cough* *cough* …Okay. OKAY. You’re hotter than me, little bubble. Take the Vuurkern.'],
    ['SMEUL', 'And tell Immanuel… sorry about the gems. I had a cold. Dragons sneeze FIRE.'],
    ['RENAS-1', 'Fuel secured: the Vuurkern. Very hot. Range: still not enough. Next signal: Duinenrijk.'],
    ['RÊNAS', 'Thanks, Immanuel! Next stop: the desert!'],
  ];
  return w;
}
