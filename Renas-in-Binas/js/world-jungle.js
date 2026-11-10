import { World, addStars, addBackdropPlanet, LL, frameDir, V3, toon, basic, mk, THREE, surf, coinRing, coinLine, coinOn, rock, lamp, sign, palm, addRocket, questItem, rareItem, setupFriend, setupLocal, addMore } from './worlds-common.js?v=20261111l';
import { fbm } from './world.js?v=20261111l';
import { buildReshman, buildMonkey, buildGoldBanana, buildCamera, textBoard, buildLocal, buildTrinket } from './models.js?v=20261111l';
import { Kokos } from './bosses.js?v=20261111l';
import { addParkour, buildBeacon } from './parkour.js?v=20261111l';

// World 5 on the route: HET OERWOUD. Reshman the monkey's jungle: giant trees, a river, an old temple.
// Boss: Koning Kokos, the gorilla king, in the Apenarena.
export function buildJungle(ctx) {
  const w = new World('reshman');
  Object.assign(w, {
    index: 5, title: 'Het Oerwoud', sub: 'Giant trees, vines and one very cheeky monkey.', friendName: 'Reshman',
    arenaTitle: 'De Apenarena', arenaSub: 'Koning Kokos is beating his chest',
    sky: 'linear-gradient(180deg,#1a5a3a 0%,#4aa86a 40%,#bfe89a 78%,#fff2b0 100%)',
    arenaSky: 'linear-gradient(180deg,#0e1a10 0%,#2a4a1a 45%,#8a6a2a 80%,#ffb03a 100%)',
    music: 'jungle', bossMusic: 'boss6', lights: [0xfff8e0, 0x2a5a2a],
    quest: { icon: '🍌', label: 'Golden bananas', got: 0, need: 3 },
  });
  w.quest.got = ctx.ws(w).items.length;
  addStars(w, 400);
  addBackdropPlanet(w, V3(-200, 90, -140), 20, 0x3a9a4a, 0x8a5a34);
  addBackdropPlanet(w, V3(170, -80, 150), 13, 0xffb03a);

  const g1 = new THREE.Color(0x3a9a3a), g2 = new THREE.Color(0x2a7a2a), g3 = new THREE.Color(0x1f5a24), mud = new THREE.Color(0x7a5a34), water = new THREE.Color(0x3aa8c8), path = new THREE.Color(0xc8a060), moss = new THREE.Color(0x5cc84a);
  const pl = w.addPlanet({
    c: V3(0, 0, 0), r: 24, shape: 'pinda', atmo: 0xc8ffb0, atmoOp: 0.12,
    paint: (p, out) => {
      const n = fbm(p, 2.6);
      out.copy(n > 0.6 ? g1 : n > 0.45 ? g2 : g3);
      if (fbm(p, 7) > 0.75) out.copy(moss);
      if (fbm(p, 4) < 0.24) out.copy(mud);                                                   // muddy patches
      if (Math.abs(p.y + 0.34 + Math.sin(Math.atan2(p.x, p.z) * 3) * 0.06) < 0.035) out.copy(water);   // the winding river
      if (p.z > 0.965 && Math.abs(p.x) < 0.05) out.copy(path);
    },
  });
  w.main = pl;
  const a1 = new THREE.Color(0x8a6a3a), a2 = new THREE.Color(0x6a4a2a), ag = new THREE.Color(0x3a8a3a);
  const arena = w.addPlanet({
    c: V3(0, -30, -120), r: 14, atmo: 0xffb03a, atmoOp: 0.12,
    paint: (p, out) => { const n = fbm(p, 3); out.copy(n > 0.62 ? ag : n > 0.48 ? a1 : a2); },
  });
  w.arena = arena;
  w.spawn = { dir: LL(0, 0), fwd: V3(0, 1, 0) };
  w.arenaSpawn = { dir: arena.c.clone().negate().normalize(), fwd: V3(0, 1, 0) };
  addRocket(w, ctx, pl, LL(-4, 9));

  // ---------- Reshman in his hammock between two palms ----------
  const resh = buildReshman();
  const npc = w.addNPC(pl, resh, LL(5, 12), { name: 'Reshman', bubbleY: 2.0, anim: (dt, t, n) => {
    const s = (t % 3) / 3;                                        // juggles a banana, then scratches his head
    n.model.arms[1].rotation.x = s < 0.6 ? -1.2 - Math.abs(Math.sin(s * Math.PI * 5)) * 0.8 : -0.3;
    n.model.arms[0].rotation.x = s >= 0.6 ? -2.6 : -0.4;
    n.model.tail.rotation.z = Math.sin(t * 3) * 0.3;
    n.model.body.position.y = Math.abs(Math.sin(t * 4)) * 0.05;
  } });
  palm(w, pl, LL(8, 18), 0x8a5a34, 0x3aa84a, 4.5);
  palm(w, pl, LL(2, 20), 0x8a5a34, 0x5cc84a, 4.8);
  setupFriend(w, ctx, npc, {
    name: 'Reshman',
    first: [
      ['RESHMAN', 'Oe oe AA AA! A visitor! A tiny one in a bubble! Welcome to Het Oerwoud!'],
      ['RÊNAS', 'A talking monkey! Hi! I’m Rênas. Captain Rênas.'],
      ['RESHMAN', 'Reshman. Best climber, best jumper, best banana-eater in the whole jungle. Ask anyone. Ask the trees.'],
      ['RESHMAN', 'But I’ve got a problem. A big one. A BIG, hairy one with a crown.'],
      ['RESHMAN', 'Koning Kokos. The gorilla king. He took my three golden bananas, the ones that keep the jungle growing.'],
      ['RESHMAN', 'And he’s sitting on a glowing core in his arena. A Kokoskern. It hums like a beehive. That’s your fuel, isn’t it?'],
      ['RÊNAS', 'Yes! My station runs on energy cores. Long story.'],
      ['RESHMAN', 'His monkeys dropped my bananas while they ran off. One is on top of the Reuzenboom, the giant tree to the west. Climb round and round.'],
      ['RESHMAN', 'One is over the river, on the floating logs. And one is on top of the old temple in the north. Watch the crumbly stones.'],
      ['RESHMAN', 'Oh, and Zara and my little brother Bobo each found a star shard. Help them, and they’ll give them to you. Oe oe!'],
    ],
    progress: (got) => [['RESHMAN', `Golden bananas: ${got}/5. The Reuzenboom, the river logs, and the top of the temple. Oe oe!`]],
    needLocals: (left) => [['RESHMAN', `All five golden bananas! AA AA! But the Launch Star still needs star shards. ${left.join(' and ')} still need${left.length === 1 ? 's' : ''} your help. Look for the yellow “!”.`]],
    done: [
      ['RESHMAN', 'My golden bananas! Look, the flowers are opening again!'],
      ['RESHMAN', 'The Launch Star by the temple gate is awake. It takes you to the Apenarena. That’s where Koning Kokos is.'],
      ['RESHMAN', 'He throws coconuts. Lots of coconuts. Keep moving. And when he beats his chest, JUMP. The ground shakes.'],
      ['RESHMAN', 'Monkey secret: when he leaps at you, his big fists get stuck in the mud. Then jump on his head! Or ground pound right next to him!'],
    ],
    after: [['RESHMAN', 'Coconuts: run. Chest-beating: jump. Fists in the mud: BONK his head. Easy. Oe oe!']],
    bubbles: {
      new: ['Oe oe AA AA!', 'Banana?', '*scratches head*'],
      progress: ['My bananas…', 'Climb, climb, climb!', 'Watch the snakes!', 'Psst. The Lianenkloof has a golden gear at the end.'],
      done: ['To the Launch Star!', 'BONK his head!', 'Oe oe!'],
    },
  });

  // ---------- the locals ----------
  setupLocal(w, ctx, {
    id: 'zara', name: 'Zara', who: 'ZARA', dir: LL(-30, -76), bubbleY: 1.9,
    model: buildLocal({ s: 0.72, skin: 0xc8946a, shirt: 0xc8a060, pants: 0x6a5a3a, hair: 0x2b1a10, hat: 'cap', capC: 0xc8a060, shoes: 0x5a3a20 }),
    anim: (dt, t, n) => { n.model.arms[1].rotation.x = -1.4 + Math.sin(t * 2) * 0.1; n.model.arms[0].rotation.x = -1.4; n.model.head.rotation.y = Math.sin(t * 0.9) * 0.5; },   // binoculars
    task: { type: 'fetch', dir: LL(-44, -90), alt: 7.0, model: buildCamera(), banner: 'ZARA’S CAMERA!', found: 'My camera! Bring it back down, carefully. All my photos are on there!' },
    first: [
      ['ZARA', 'Shhh! You’ll scare the birds. Oh, hi. I’m Zara. Explorer. Nature photographer.'],
      ['ZARA', 'A toucan stole my camera and dropped it on top of the waterfall. Toucans love shiny things.'],
      ['ZARA', 'Bounce on the big jungle flower next to the cliff to get up there. Bring it back and my star shard is yours.'],
    ],
    progress: () => [['ZARA', 'My camera is on top of the waterfall. Bounce on the big flower!']],
    done: [
      ['ZARA', 'My camera! And look, the toucan took a selfie. Rude, but a good photo.'],
      ['ZARA', 'Here’s the star shard. I found it behind the waterfall. It sparkled in every photo.'],
    ],
    after: [['ZARA', 'Smile! …Got you. That’s going in my jungle book.']],
    bubbles: { new: ['Shhh!', 'My camera…', 'Birds!'], progress: ['The waterfall!', 'Bounce on the flower!', 'Silly toucan.'], done: ['Smile!', 'Thank you!', '*click*'] },
  });
  // the waterfall cliff, with the bounce flower next to it
  w.addPlatform(pl, { lat: -44, lon: -90, hx: 2.2, hz: 1.8, h: 6.0, color: 0x6a6a5a, top: 0x3a9a3a });
  {
    const fall = new THREE.Group();
    mk(new THREE.BoxGeometry(1.6, 6, 0.2), basic(0x7ad8f8, { transparent: true, opacity: 0.7 }), 0, 3, 1.95, fall, 0);
    mk(new THREE.CylinderGeometry(1.6, 1.8, 0.2, 18), basic(0x3aa8c8, { transparent: true, opacity: 0.8 }), 0, 0.1, 2.8, fall, 0);
    w.put(pl, fall, LL(-44, -90), 0);
    const foam = fall.children[1]; w.updaters.push((dt, t) => { foam.scale.setScalar(1 + Math.sin(t * 6) * 0.04); });
  }
  {
    const fl = w.addPlatform(pl, { lat: -37, lon: -84, r: 1.3, h: 0.4, color: 0x2a8a3a, top: 0xff5ab4, bounce: 23, puff: 0xff5ab4 });
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; mk(new THREE.SphereGeometry(0.5, 10, 8), toon(0xff7ad8), Math.cos(a) * 1.0, 0.45, Math.sin(a) * 1.0, fl.mesh, 1.06).scale.set(1, 0.3, 0.6); }
  }
  setupLocal(w, ctx, {
    id: 'bobo', name: 'Bobo', who: 'BOBO', dir: LL(-20, 196), bubbleY: 1.5,
    model: buildMonkey({ s: 0.6, fur: 0xa86a3a, bandana: 0x3a8ad8, banana: false }),
    anim: (dt, t, n) => { n.model.arms[0].rotation.x = n.model.arms[1].rotation.x = -2.6 + Math.sin(t * 9) * 0.3; n.model.body.position.y = Math.abs(Math.sin(t * 6)) * 0.12; n.model.tail.rotation.z = Math.sin(t * 6) * 0.4; },   // hops up and down
    task: { type: 'stomp', enemy: 'snake', at: LL(-40, 220), n: 3, spread: 6, found: 'The snakes are gone! Come back, come back! Oe!' },
    first: [
      ['BOBO', 'Oe! Oe! You’re the bubble-head! Reshman told me about you!'],
      ['BOBO', 'I’m Bobo. His little brother. I’m almost as fast as him. Almost.'],
      ['BOBO', 'Three Slingerslangen moved into my climbing tree, past the big rocks. They hiss at me. Every time!'],
      ['RÊNAS', 'Snakes? I’ll stomp them!'],
      ['BOBO', 'Jump on their heads! Clear them out and I’ll give you my star shard. I keep it in my cheek. …It’s clean. Mostly.'],
    ],
    progress: (l) => [['BOBO', `${l.left} Slingerslangen left in my tree, past the big rocks. Jump on their heads!`]],
    done: [
      ['BOBO', 'My tree! I can climb again! Look! …Okay, you can’t see, I’m too fast.'],
      ['BOBO', 'Here’s the star shard. I wiped it off. With my tail.'],
    ],
    after: [['BOBO', 'Race you to the temple! …You’re too slow. I already won.']],
    bubbles: { new: ['Oe! Oe!', 'Snakes!', 'Hiss is scary!'], progress: ['Past the big rocks!', 'Jump on their heads!', 'Hissss…'], done: ['My tree!', 'Oe oe!', 'Race you!'] },
  });

  // ---------- decor: palms, ferns, big leaves, rocks, totems ----------
  [[14, 30], [-10, 40], [30, 80], [-50, 30], [50, -10], [-10, 120], [20, 170], [-60, 160], [10, 230], [40, 260], [-30, 290], [60, 320], [-6, -60], [-56, -40]].forEach(([la, lo], i) => palm(w, pl, LL(la, lo), i % 2 ? 0x8a5a34 : 0x6a4020, i % 3 ? 0x3aa84a : 0x5cc84a, 4 + (i % 3) * 0.8));
  [[16, -20], [-26, 160], [12, 290], [44, 200], [-50, 240], [-34, 196], [-46, 206]].forEach(([la, lo], i) => rock(w, pl, LL(la, lo), 0.9 + (i % 3) * 0.4, 0x6a6a5a));
  // big ferns
  for (let i = 0; i < 14; i++) {
    const f = new THREE.Group();
    for (let k = 0; k < 5; k++) { const l = mk(new THREE.ConeGeometry(0.25, 1.6, 4), toon(k % 2 ? 0x2a8a3a : 0x5cc84a), 0, 0.5, 0, f, 0); l.rotation.set(0.9, (k / 5) * Math.PI * 2, 0); l.position.set(Math.sin((k / 5) * Math.PI * 2) * 0.5, 0.5, Math.cos((k / 5) * Math.PI * 2) * 0.5); }
    w.put(pl, f, LL(-70 + (i * 37) % 140, i * 53), 0, i);
  }
  // jungle flowers
  for (let i = 0; i < 12; i++) {
    const f = new THREE.Group(), c = [0xff5ab4, 0xffd23a, 0xff7a3a][i % 3];
    for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; mk(new THREE.SphereGeometry(0.18, 8, 6), toon(c), Math.cos(a) * 0.2, 0.35, Math.sin(a) * 0.2, f, 0).scale.y = 0.4; }
    mk(new THREE.SphereGeometry(0.1, 8, 6), toon(0xffe27a), 0, 0.38, 0, f, 0);
    w.put(pl, f, LL(-60 + (i * 29) % 120, 20 + i * 47), 0, i);
  }
  // tiki totems by the path
  [[-8, -8], [10, 6]].forEach(([la, lo], i) => {
    const t = new THREE.Group();
    for (let k = 0; k < 3; k++) { mk(new THREE.CylinderGeometry(0.4, 0.42, 0.9, 10), toon([0x8a5a34, 0x6a4020, 0xa86a3a][k]), 0, 0.45 + k * 0.9, 0, t, 1.06); for (const s of [-1, 1]) mk(new THREE.SphereGeometry(0.08, 6, 4), basic(0xffd23a), 0.14 * s, 0.55 + k * 0.9, 0.38, t, 0); }
    w.put(pl, t, LL(la, lo), 0, i * 3); w.addSolid(pl, LL(la, lo), 0.45, 2.7);
  });
  lamp(w, pl, LL(-6, 22), 0xffb03a, 2.8);
  sign(w, pl, LL(12, -6), textBoard('HET OERWOUD', 3.4, 0.9, '#2a7a2a', '#fff8ec'), 0.3, 2.6);
  sign(w, pl, LL(-12, 14), textBoard('◂ REUZENBOOM', 2.8, 0.7, '#fff8ec', '#6a4020'), -0.4, 1.8);
  // butterflies
  for (let i = 0; i < 8; i++) {
    const b = new THREE.Group(), c = [0x3a8ad8, 0xff5ab4, 0xffd23a][i % 3];
    const wings = [-1, 1].map((s) => { const p = new THREE.Group(); b.add(p); mk(new THREE.CircleGeometry(0.22, 8), basic(c, { side: THREE.DoubleSide }), 0.22 * s, 0, 0, p, 0); return p; });
    w.put(pl, b, LL(-50 + i * 13, i * 45), 2.5 + (i % 3), i);
    const ph = i; w.updaters.push((dt, t) => { const f = Math.sin(t * 14 + ph) * 1.1; wings[0].rotation.y = f; wings[1].rotation.y = -f; b.position.y += Math.sin(t * 2 + ph) * 0.004; });
  }

  // ---------- A: the Reuzenboom (west): climb round and round the trunk ----------
  const T0 = LL(22, -40);
  {
    const tree = new THREE.Group();
    mk(new THREE.CylinderGeometry(0.9, 1.4, 9, 12), toon(0x6a4020), 0, 4.5, 0, tree, 1.04);
    for (let k = 0; k < 6; k++) { const root = mk(new THREE.CylinderGeometry(0.2, 0.45, 2.4, 6), toon(0x5a3a1a), Math.sin(k) * 1.4, 0.6, Math.cos(k) * 1.4, tree, 1.06); root.rotation.set(Math.cos(k) * 0.8, 0, -Math.sin(k) * 0.8); }
    for (let k = 0; k < 7; k++) { const a = (k / 7) * Math.PI * 2; mk(new THREE.SphereGeometry(1.4, 12, 10), toon(k % 2 ? 0x2a8a3a : 0x3aa84a), Math.cos(a) * 1.1, 12.6 + (k % 2) * 0.5, Math.sin(a) * 1.1, tree, 1.04).scale.y = 0.6; }
    w.put(pl, tree, T0, 0); w.addSolid(pl, T0, 1.2, 9);
    // vines hanging down
    for (let k = 0; k < 4; k++) { const v = mk(new THREE.CylinderGeometry(0.04, 0.04, 4, 5), toon(0x2a7a2a), Math.cos(k * 1.6) * 1.5, 7.4, Math.sin(k * 1.6) * 1.5, tree, 0); void v; }
  }
  const spiral = [];
  for (let i = 0; i < 8; i++) spiral.push(w.addPlatform(pl, { dir: frameDir(T0, 90 - 6.5, i * 50), r: 1.05, h: 1.0 + i * 1.05, float: true, thick: 0.35, color: 0x8a5a34, top: 0x5cc84a, ...(i === 5 ? { crumble: true } : {}) }));
  spiral.slice(0, 7).forEach((pf) => coinOn(w, pf));
  const canopy = w.addPlatform(pl, { dir: T0, r: 1.6, h: 9.6, float: true, thick: 0.6, color: 0x2a8a3a, top: 0x5cc84a });
  questItem(w, ctx, pl, frameDir(T0, 90 - 2.6, 120), 10.6, 'banana1', buildGoldBanana());
  // a flower on the canopy bounces you up to a secret
  w.addPlatform(pl, { dir: frameDir(T0, 90 - 2.4, 300), r: 0.6, h: 9.9, float: true, thick: 0.3, color: 0x2a8a3a, top: 0xffd23a, bounce: 21, puff: 0xffd23a });
  w.addPlatform(pl, { dir: frameDir(T0, 90 - 5.5, 320), r: 1.0, h: 14, float: true, thick: 0.3, color: 0x3aa84a, top: 0x5cc84a, bob: [0.3, 1.2, 0] });
  rareItem(w, ctx, pl, frameDir(T0, 90 - 5.5, 320), 15, 'reshman-r1', 'Above the Reuzenboom');
  void canopy;

  // ---------- B: over the river on floating logs (south-east) ----------
  const logs = [[-14, 54, 1.2], [-18, 62, 2.0], [-21, 70, 2.8], [-24, 78, 3.6], [-27, 86, 4.4], [-30, 95, 5.4]].map(([la, lo, h], i) => w.addPlatform(pl, { lat: la, lon: lo, hx: 1.7, hz: 0.7, h, float: true, thick: 0.5, color: 0x6a4020, top: 0x8a5a34, ...(i % 2 ? { bob: [0.4, 1.4, i] } : {}) }));
  logs.slice(0, 5).forEach((pf) => coinOn(w, pf));
  const lily = w.addPlatform(pl, { lat: -33, lon: 104, r: 1.5, h: 6.2, float: true, thick: 0.3, color: 0x2a8a3a, top: 0x5cc84a, bob: [0.25, 1, 2] });
  questItem(w, ctx, pl, lily.n, 7.2, 'banana2', buildGoldBanana());

  // ---------- C: the old temple (north): a stepped pyramid with crumbly stones on top ----------
  const TP = LL(48, 150);
  const steps = [[3.6, 1.2], [2.8, 2.4], [2.0, 3.6], [1.3, 4.8]].map(([s, h]) => w.addPlatform(pl, { dir: TP, hx: s, hz: s, h, color: 0x8a8a6a, top: 0x6a8a4a }));
  [0, 1, 2].forEach((i) => coinOn(w, steps[i], 1));
  const tc1 = w.addPlatform(pl, { dir: frameDir(TP, 90 - 6.5, 40), r: 1.0, h: 5.8, float: true, thick: 0.4, color: 0x9a9a7a, crumble: true });
  const tc2 = w.addPlatform(pl, { dir: frameDir(TP, 90 - 9.5, 60), r: 1.0, h: 6.6, float: true, thick: 0.4, color: 0x9a9a7a, crumble: true });
  const altar = w.addPlatform(pl, { dir: frameDir(TP, 90 - 12.5, 75), hx: 1.4, hz: 1.4, h: 7.4, float: true, thick: 0.7, color: 0x8a8a6a, top: 0xffd23a });
  [tc1, tc2].forEach((pf) => coinOn(w, pf));
  questItem(w, ctx, pl, altar.n, 8.3, 'banana3', buildGoldBanana());
  {   // a stone monkey face on the temple
    const face = new THREE.Group();
    mk(new THREE.BoxGeometry(1.4, 1.2, 0.3), toon(0x9a9a7a), 0, 0, 0, face, 1.05);
    for (const s of [-1, 1]) mk(new THREE.BoxGeometry(0.3, 0.2, 0.1), basic(0x5cd85a), 0.35 * s, 0.2, 0.17, face, 0);
    mk(new THREE.BoxGeometry(0.7, 0.12, 0.1), basic(0x2b2440), 0, -0.3, 0.17, face, 0);
    face.position.set(0, 0.6, 3.7); const holder = new THREE.Group(); holder.add(face); w.put(pl, holder, TP, 0);
  }
  w.addPlatform(pl, { dir: frameDir(TP, 90 - 12.5, 75), r: 0.9, h: 9.4, float: true, thick: 0.3, color: 0x9a9a7a, crumble: true });
  rareItem(w, ctx, pl, frameDir(TP, 90 - 12.5, 75), 10.4, 'reshman-r3', 'Over the temple altar');
  w.addPlatform(pl, { dir: frameDir(TP, 90 - 5, 210), r: 1.2, h: 0.4, color: 0x2a8a3a, top: 0xff5ab4, bounce: 19, puff: 0xff5ab4 });   // a shortcut flower

  // ---------- Launch Star under the temple gate ----------
  const gate = new THREE.Group();
  for (const s of [-1, 1]) mk(new THREE.BoxGeometry(0.8, 3.4, 0.8), toon(0x8a8a6a), 1.7 * s, 1.7, 0, gate, 1.05);
  mk(new THREE.BoxGeometry(4.6, 0.8, 1.0), toon(0x6a6a4a), 0, 3.6, 0, gate, 1.05);
  for (const s of [-1, 1]) mk(new THREE.SphereGeometry(0.16, 8, 6), basic(0x5cd85a), 0.6 * s, 3.6, 0.52, gate, 0);
  w.put(pl, gate, LL(-4, 254), 0);
  w.launchStar = w.addLaunchStar(pl, LL(-6, 244), { label: 'Launch to the Apenarena!', lockedText: 'Reshman needs his 5 golden bananas, and the Launch Star needs 3 star shards', use: () => ctx.toArena(w) });
  w.unlockLaunch = () => w.launchStar.setActive(true);
  if (ctx.ws(w).fstate === 'done') w.unlockLaunch();

  // ---------- secrets ----------
  w.addPlatform(pl, { lat: -82, lon: 0, r: 2, h: 1.2, float: true, color: 0x6a4020, top: 0x5cc84a, bob: [0.5, 1, 0] });
  rareItem(w, ctx, pl, LL(-90, 0), 2.4, 'reshman-r2', 'Under the jungle');
  coinRing(w, pl, LL(-90, 0), 5, 8);
  coinRing(w, pl, LL(0, 0), 4.5, 8);
  coinLine(w, pl, LL(20, 190), LL(26, 240), 5);
  coinLine(w, pl, LL(-4, 30), LL(-10, 46), 4);

  // ---------- De Lianenkloof: a parkour over a bottomless void, through a hollow tree ----------
  const hollow = new THREE.Group();
  mk(new THREE.CylinderGeometry(1.9, 2.3, 4, 14, 1, true), toon(0x6a4020), 0, 2, 0, hollow, 1.04);
  mk(new THREE.CircleGeometry(1.0, 16), basic(0x0e1a10), 0, 1.1, 2.2, hollow, 0);
  for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; mk(new THREE.SphereGeometry(1.2, 10, 8), toon(0x3aa84a), Math.cos(a) * 1.3, 4.3, Math.sin(a) * 1.3, hollow, 1.04).scale.y = 0.6; }
  const holeSign = textBoard('LIANENKLOOF', 2.4, 0.6, '#2a7a2a', '#fff8ec'); holeSign.position.set(0, 2.9, 2.35); hollow.add(holeSign);
  w.put(pl, hollow, LL(-16, -26), 0, 0.5);
  addParkour(w, ctx, {
    home: pl, entryDir: LL(-16, -26), entryPrompt: '<kbd>E</kbd> enter the Lianenkloof', exitDir: LL(-11, -19), exitFwd: LL(0, 0),
    title: 'De Lianenkloof', sub: 'Mind the void. Banana beacons are checkpoints.', voidText: 'Into the void! Back to the last banana beacon.',
    rareId: 'reshman-r4', rareName: 'The end of the Lianenkloof', marker: () => buildBeacon(0x6a4020, 0xffd23a),
    theme: {
      sky: 'radial-gradient(ellipse at 50% 40%,#1a3a14 0%,#0e1a0a 55%,#030602 100%)',
      dome: [0x3a5a2a, 0x2a3a1a, 0x1a2a10, 0xffd23a], gems: [0x5cc84a, 0xffd23a, 0xff5ab4], core: 0x14280a, glow: 0x5cc84a,
      plat: 0x6a4020, platTop: 0x5cc84a, alt: 0x8a5a34, crumble: 0x9a9a7a, bounce: 0xff5ab4, puff: 0xffd23a, cpTop: 0xffd23a, finTop: 0xffd23a, signFg: '#5cc84a', signBg: '#14280a',
    },
    route: [['hop', 3], ['bob', 3], ['zig', 3], ['cp'], ['crumble', 3], ['circle', 2], ['cp'], ['bounce'], ['zig', 2], ['gap'], ['down', 2], ['hop', 2]],
  });

  // ---------- enemies: jungle snakes and angry coconuts ----------
  [[-20, 140], [30, 110], [40, 230], [-40, 60], [0, 300]].forEach(([la, lo]) => w.addEnemy(pl, LL(la, lo), 'coco', { roam: 0.2 }));
  [[-50, 120], [10, 70], [20, 40], [-10, 170], [50, 290], [-30, 320], [34, -80]].forEach(([la, lo]) => w.addEnemy(pl, LL(la, lo), 'snake', { roam: 0.15 }));

  // ---------- boss ----------
  // ---------- more: golden bananas 4 and 5, and Kofi ----------
  addMore(w, ctx, pl, {
    item: () => buildGoldBanana(), prefix: 'banana', color: 0x6a4020, top: 0x5cc84a,
    local: {
      id: 'kofi', name: 'Kofi', who: 'KOFI',
      model: buildLocal({ s: 0.8, skin: 0x6a4028, shirt: 0xd8a040, pants: 0x5a6a3a, hair: 0x1a1010, hat: 'cap', capC: 0x8a6a3a }),
      anim: (dt, t, n) => { n.model.arms[0].rotation.x = -1.3; n.model.arms[1].rotation.x = -1.3; n.model.head.rotation.y = Math.sin(t * 0.8) * 0.8; },
      task: { type: 'fetch', model: buildTrinket('compass'), banner: 'KOFI’S COMPASS!', found: 'My compass! Bring it back so I know where I am!' },
      first: [
        ['KOFI', 'Hello! I’m Kofi. I make the maps of Het Oerwoud. Well, I try.'],
        ['KOFI', 'A monkey borrowed my compass and left it on the vine steps up north. Without it, everything is “that way”. Can you get it back?'],
      ],
      progress: () => [['KOFI', 'My compass is on the vine steps up north. Probably. I don’t have a compass.']],
      done: [['KOFI', 'My compass! North is… that way! Finally!'], ['KOFI', 'Here’s a star shard. I found it where my map said “here be shiny things”.']],
      after: [['KOFI', 'I’m putting you on my map. Right there. “Rênas was here.”']],
      bubbles: { new: ['Hello!', 'Which way…?', 'My compass…'], progress: ['Up north!', 'The vine steps!', 'That way!'], done: ['North!', 'Thank you!', '*draws a map*'] },
    },
  });

  w.boss = new Kokos(w, arena);
  w.hitLines = [['RESHMAN', '(radio) BONK! Right on the crown! Oe oe AA AA!'], ['RESHMAN', '(radio) He’s really angry now! More coconuts, more vines! Keep going!']];
  w.winLines = [
    ['KOKOS', '…Ooh. My head. Okay. OKAY. You win, little bubble.'],
    ['KOKOS', 'Take the Kokoskern. And tell Reshman… sorry about the bananas. They were just really, really shiny.'],
    ['RENAS-1', 'Fuel secured: the Kokoskern. Range: still too short for Homerun Heuvel. Next signal: De Asberg. Temperature: very hot.'],
    ['RÊNAS', 'Thanks, Reshman! Next stop: a volcano. Oe oe!'],
  ];
  return w;
}
