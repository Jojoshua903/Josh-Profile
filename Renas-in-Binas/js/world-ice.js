import { World, addStars, addBackdropPlanet, LL, frameDir, V3, toon, basic, mk, THREE, surf, coinRing, coinLine, coinOn, crystal, rock, lamp, sign, addRocket, questItem, rareItem, setupFriend, setupLocal, addMore } from './worlds-common.js?v=20261111s';
import { fbm } from './world.js?v=20261111s';
import { buildPingo, buildDeniz, buildAuraCrystal, buildScarf, textBoard, buildLocal, buildTrinket } from './models.js?v=20261111s';
import { Deniz } from './bosses.js?v=20261111s';
import { addParkour, buildBeacon } from './parkour.js?v=20261111s';

// World 3 on the route: HET HERTOGDOM IJS. A frozen planet ruled by Deniz, the Duke of Ice, who has way too much aura.
// Boss: Deniz himself, in the Aura Throne Room.
export function buildIce(ctx) {
  const w = new World('deniz');
  Object.assign(w, {
    index: 3, title: 'Hertogdom IJs', sub: 'Everything is frozen. Even the air. Especially the aura.', friendName: 'Pingo',
    arenaTitle: 'De Auratroonzaal', arenaSub: 'Deniz is posing',
    sky: 'linear-gradient(180deg,#0e2a5a 0%,#2a6ab0 38%,#8ad0f0 75%,#e8fbff 100%)',
    arenaSky: 'linear-gradient(180deg,#040a1e 0%,#0e2a5a 45%,#2a5ab0 80%,#9fe8ff 100%)',
    music: 'ice', bossMusic: 'boss4', lights: [0xe8f8ff, 0x5a7aa8],
    quest: { icon: '💎', label: 'Aura crystals', got: 0, need: 3 },
  });
  w.quest.got = ctx.ws(w).items.length;
  addStars(w);
  addBackdropPlanet(w, V3(-200, 110, -160), 26, 0x9fe8ff, 0xffffff);
  addBackdropPlanet(w, V3(190, -60, 140), 14, 0x5ef2e0);
  addBackdropPlanet(w, V3(80, 170, -280), 34, 0x2a4aa8, 0x9fe8ff);

  const snow = new THREE.Color(0xf4fbff), snow2 = new THREE.Color(0xd8ecf8), blue = new THREE.Color(0xa8d8f0), lake = new THREE.Color(0x7ac8f0), crack = new THREE.Color(0xe8fbff), tile = new THREE.Color(0xbfe4f8);
  const pl = w.addPlanet({
    c: V3(0, 0, 0), r: 24, shape: 'kristal', atmo: 0x9fe8ff, atmoOp: 0.12,
    paint: (p, out) => {
      if (p.z > 0.965) { const a = Math.floor(Math.atan2(p.x, p.z) * 30), b = Math.floor(Math.asin(p.y) * 30); out.copy((a + b) & 1 ? tile : snow); return; }   // the frozen plaza where you land
      const n = fbm(p, 2.6);
      out.copy(n > 0.6 ? snow : n > 0.45 ? snow2 : blue);
      // the frozen lake to the south-east, with white cracks
      const lon = Math.atan2(p.x, p.z), lat = Math.asin(p.y);
      if (Math.hypot(lat + 0.52, (lon - 1.65) * 0.8) < 0.42) { out.copy(lake); if (Math.abs(Math.sin(n * 40)) < 0.06) out.copy(crack); }
    },
  });
  w.main = pl;
  const iceA = new THREE.Color(0x9fd8ff), iceB = new THREE.Color(0x5a9ad8), iceC = new THREE.Color(0xe8fbff);
  const arena = w.addPlanet({
    c: V3(0, 30, -120), r: 14, atmo: 0x7dfcff, atmoOp: 0.16,
    paint: (p, out) => { const n = fbm(p, 3.2); out.copy(Math.abs(n - 0.5) < 0.02 ? iceC : n > 0.5 ? iceA : iceB); },
  });
  w.arena = arena;
  w.spawn = { dir: LL(0, 0), fwd: V3(0, 1, 0) };
  w.arenaSpawn = { dir: arena.c.clone().negate().normalize(), fwd: V3(0, 1, 0) };
  addRocket(w, ctx, pl, LL(-4, 9));

  // ---------- Pingo, Deniz' royal butler, by the palace gate ----------
  const pingo = buildPingo();
  const npc = w.addNPC(pl, pingo, LL(5, 12), { name: 'Pingo', bubbleY: 2.0, anim: (dt, t, n) => {
    n.model.body.rotation.z = Math.sin(t * 2.2) * 0.06;                       // a dignified waddle on the spot
    n.model.arms[1].rotation.z = 0.2 + Math.max(0, Math.sin(t * 1.3)) * 0.4;  // adjusting the bow tie
  } });
  setupFriend(w, ctx, npc, {
    name: 'Pingo',
    first: [
      ['PINGO', 'Ah. A visitor. Welcome to the Hertogdom IJs. Mind the floor. It is… everything.'],
      ['RÊNAS', 'A penguin in a bow tie! Who are you?'],
      ['PINGO', 'Pingo. Royal butler to His Frostiness, Deniz, the Duke of Ice.'],
      ['PINGO', 'His Frostiness heard that a little astronaut saved two Energiekernen. Now the whole galaxy says YOU have the most aura.'],
      ['PINGO', 'He did not like that. He froze his own core, the IJskern, into his throne. He will only hand it to someone with more aura than him.'],
      ['RÊNAS', 'Aura? Like… being cool?'],
      ['PINGO', 'Being cool. Standing cool. Breathing cool. He practises his pose in the mirror. Seven hours a day.'],
      ['PINGO', 'His aura got so strong it sucked up the three Aura Crystals that power our Launch Star. Then it spat them out all over the planet.'],
      ['PINGO', 'One is up the Frozen Waterfall, to the west. One floats over the ice floes on the lake. One sits on top of the palace towers. Mind the cracked ice.'],
      ['PINGO', 'The core’s chill also froze star shards into the snow. Little Yuna and old Henk each dug one up. Help them, and they will give them to you.'],
    ],
    progress: (got) => [['PINGO', `Aura Crystals: ${got}/5. The Frozen Waterfall, the ice floes on the lake, and the palace towers.`]],
    needLocals: (left) => [['PINGO', `All five crystals. Splendid. But the Launch Star still wants its star shards. ${left.join(' and ')} still need${left.length === 1 ? 's' : ''} you. Look for the yellow “!”.`]],
    done: [
      ['PINGO', 'The Launch Star is glowing. His Frostiness awaits you in the Aura Throne Room.'],
      ['PINGO', 'A tip from someone who irons his capes: you cannot touch him while his aura is up. It freezes you solid.'],
      ['PINGO', 'But he always overdoes it. After a few spells his aura overloads and SHATTERS. Then he sits down on his throne, out of breath.'],
      ['PINGO', 'That is your moment. Jump on his crown, or ground pound the throne. He hates that. It ruins his hair.'],
    ],
    after: [['PINGO', 'Aura up: dodge. Aura shattered: crown. And please, do not tell him I told you.']],
    bubbles: {
      new: ['A visitor. How… warm.', '*polishes an ice cube*', 'Mind the floor.'],
      progress: ['The crystals, please.', 'His Frostiness is practising his pose.', 'Brr.', 'Psst. The Frozen Abyss has a golden gear at the end.'],
      done: ['To the Launch Star!', 'Crown. Not aura. Crown.', 'I will iron your cape afterwards.'],
    },
  });

  // ---------- the locals ----------
  setupLocal(w, ctx, {
    id: 'yuna', name: 'Yuna', who: 'YUNA', dir: LL(-10, -18), bubbleY: 1.7,
    model: buildLocal({ s: 0.55, skin: 0xf0d0b0, shirt: 0x5ef2e0, pants: 0x2a4aa8, hair: 0x2a1a14, hat: 'beanie', capC: 0xe03a5a, shoes: 0xe03a5a }),
    anim: (dt, t, n) => { n.model.r.position.y = Math.max(0, Math.sin(t * 6)) * 0.05; n.model.arms[0].rotation.z = -0.3 - Math.max(0, Math.sin(t * 6)) * 0.4; n.model.arms[1].rotation.z = 0.3 + Math.max(0, Math.sin(t * 6)) * 0.4; },
    task: { type: 'fetch', dir: LL(-46, -110), alt: 6.6, model: buildScarf(), banner: 'YUNA’S SCARF!', found: 'My scarf! I can see it from here! Bring it back, pleeease!' },
    first: [
      ['YUNA', 'Hiii! Are you a snowman? You’re very round. Nice helmet!'],
      ['YUNA', 'I’m Yuna! Grandma knitted me a red scarf, and when the Duke did his big aura pose, the wind blew it right off!'],
      ['YUNA', 'It’s stuck on the high ice ledge past the snow mound. Bounce on the mound to get up there!'],
      ['YUNA', 'Bring it back and you can have my star shard. I found it in a snowball. True story.'],
    ],
    progress: () => [['YUNA', 'The high ice ledge! Bounce on the snow mound! Hurry, my neck is cold!']],
    done: [
      ['YUNA', 'MY SCARF! It still smells like grandma’s cookies.'],
      ['YUNA', 'Here’s the star shard! When you beat the Duke, tell him his aura is a 6 out of 10. Maybe a 7.'],
    ],
    after: [['YUNA', 'I’m building a snowman of you. He has a LOT of aura.']],
    bubbles: { new: ['Hiii!', 'My scarf…', 'Brrr!'], progress: ['The high ledge!', 'Bounce on the mound!', 'Cold neck…'], done: ['Warm again!', 'Thank you!!', 'Snowball fight?'] },
  });
  w.addPlatform(pl, { lat: -34, lon: -98, r: 1.5, h: 0.5, color: 0xf4fbff, top: 0xffffff, bounce: 21, puff: 0xffffff });   // the snow mound
  w.addPlatform(pl, { lat: -46, lon: -110, r: 1.6, h: 5.5, float: true, thick: 0.7, color: 0x9fd8ff, top: 0xf4fbff });
  setupLocal(w, ctx, {
    id: 'henk', name: 'Henk', who: 'HENK', dir: LL(12, 26), bubbleY: 1.9,
    model: buildLocal({ s: 0.7, skin: 0xf0c8a0, shirt: 0x2a6ab0, pants: 0x3a3e4e, hat: 'beanie', capC: 0xffa23a, beard: 0xf4f1ea, shoes: 0x5a3a20 }),
    anim: (dt, t, n) => { n.model.arms[1].rotation.x = -1.0 + Math.sin(t * 1.2) * 0.1; n.model.head.rotation.x = Math.sin(t * 0.7) * 0.1; },
    task: { type: 'duel', game: 'race', to: LL(-36, 44), speed: 7.2, color: 0xffa23a, winTitle: 'RACE WON!', found: 'You beat me to my fishing hole! Come back, lad, I’ve got something for you!', lost: 'Ha! Forty years on this ice, lad. Talk to me if you want another go.' },
    first: [
      ['HENK', 'Shh. The fish are sleeping. …They WERE sleeping.'],
      ['HENK', 'Henk. Ice fisher. Forty years on this lake. In my day I won the Big Ice Race every winter.'],
      ['RÊNAS', 'Every winter? That’s a lot of winters.'],
      ['HENK', 'Forty, lad. Want to see if the old man still has it? Race me to my fishing hole, past the pines. Orange flag.'],
      ['HENK', 'The ice is slippery, so mind your feet. Beat me and the star shard I pulled out of the ice is yours.'],
    ],
    progress: () => [['HENK', 'Another race? To my fishing hole, past the pines. Mind the ice.']],
    done: [
      ['HENK', 'Beaten by a kid in a fishbowl. Well done, lad. Well done.'],
      ['HENK', 'Here’s your star shard. Pulled it out of the ice this morning. Thought it was a very shiny fish.'],
    ],
    after: [['HENK', 'Biggest fish I ever caught? A frozen pizza. Still ate it.']],
    bubbles: { new: ['Shh…', 'The fish are sleeping.', 'Fancy a race?'], progress: ['Another race?', 'Mind the ice!', 'Orange flag, lad.'], done: ['Well done, lad.', 'Fast feet.', 'Shh, the fish snore.'] },
  });
  // Henk's fishing hole
  { const hole = new THREE.Group(); mk(new THREE.CircleGeometry(1.1, 24), basic(0x1a4a7a), 0, 0.03, 0, hole, 0).rotation.x = -Math.PI / 2; mk(new THREE.TorusGeometry(1.15, 0.12, 6, 24), toon(0xe8fbff), 0, 0.05, 0, hole, 0).rotation.x = Math.PI / 2; w.put(pl, hole, LL(-36, 44), 0); }

  // ---------- decor: pine trees, ice crystals, the palace and a VERY humble statue ----------
  const pine = (dir, s = 1) => {
    const g = new THREE.Group();
    mk(new THREE.CylinderGeometry(0.15 * s, 0.2 * s, 0.8 * s, 8), toon(0x6a4a30), 0, 0.4 * s, 0, g, 1.08);
    for (let i = 0; i < 3; i++) { mk(new THREE.ConeGeometry((1.1 - i * 0.28) * s, 1.2 * s, 10), toon(0x2a6a5a), 0, (1 + i * 0.75) * s, 0, g, 1.05); mk(new THREE.ConeGeometry((0.75 - i * 0.2) * s, 0.5 * s, 10), toon(0xf4fbff), 0, (1.45 + i * 0.75) * s, 0, g, 0); }
    w.put(pl, g, dir, 0, Math.random() * 6); w.addSolid(pl, dir, 0.4 * s, 3 * s);
  };
  [[14, -30], [-16, 30], [26, 40], [-28, -40], [40, -80], [-20, 100], [30, 130], [-50, 160], [10, 230], [-10, 280], [50, 300], [-40, 320], [-24, 52], [-44, 36], [-30, 60], [60, 200]].forEach(([la, lo], i) => pine(LL(la, lo), 0.9 + (i % 3) * 0.25));
  [[10, 30, 0x9fe8ff], [-14, -40, 0x7dfcff], [30, 50, 0xffffff], [-34, 70, 0x9fe8ff], [44, -60, 0x7dfcff], [-50, -30, 0xffffff], [20, 170, 0x9fe8ff], [-40, 230, 0x7dfcff], [54, 250, 0xffffff], [-6, 300, 0x9fe8ff]].forEach(([la, lo, c], i) => crystal(w, pl, LL(la, lo), c, 0.9 + (i % 3) * 0.3));
  [[16, 10], [-18, 18], [36, 210], [-20, 330]].forEach(([la, lo], i) => rock(w, pl, LL(la, lo), 0.9 + (i % 3) * 0.4, 0xd8ecf8));
  [[-8, -8], [10, 6], [-6, 22]].forEach(([la, lo]) => lamp(w, pl, LL(la, lo), 0x9fe8ff, 2.8));
  sign(w, pl, LL(12, -6), textBoard('HERTOGDOM IJS', 3.4, 0.9, '#2a4aa8', '#e8fbff'), 0.3, 2.6);
  // the statue of Deniz, of course
  { const st = buildDeniz(); st.root.scale.setScalar(1.5); st.root.traverse((o) => { if (o.isMesh && o.material.type === 'MeshToonMaterial') o.material = toon(0xd8f4ff); }); w.put(pl, st.root, LL(14, 2), 0.6, -0.4); w.addSolid(pl, LL(14, 2), 1.0, 4.5);
    const ped = new THREE.Group(); mk(new THREE.CylinderGeometry(1.1, 1.3, 0.6, 6), toon(0x9fd8ff), 0, 0.3, 0, ped, 1.06); w.put(pl, ped, LL(14, 2), 0);
    sign(w, pl, LL(10, 6), textBoard('DENIZ · 100% AURA', 3.0, 0.7, '#e8fbff', '#2a4aa8'), -0.4, 1.6); }
  // snow falling all around the planet
  {
    const N = 700, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { const d = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(25 + Math.random() * 14); pos.set([d.x, d.y, d.z], i * 3); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const flakes = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.22, transparent: true, opacity: 0.85, depthWrite: false }));
    w.group.add(flakes);
    w.updaters.push((dt) => { flakes.rotation.y += dt * 0.02; flakes.rotation.x += dt * 0.012; });
  }

  // ---------- A: the Frozen Waterfall (west) ----------
  const fall = new THREE.Group();
  const fm = mk(new THREE.BoxGeometry(2.4, 7, 0.6), basic(0xbff2ff, { transparent: true, opacity: 0.75 }), 0, 3.5, 0, fall, 1.04); void fm;
  w.put(pl, fall, LL(32, -48), 0, 0.8);
  const steps = [[16, -12, 1.5], [22, -19, 2.9], [28, -26, 4.3]].map(([la, lo, h]) => w.addPlatform(pl, { lat: la, lon: lo, r: 1.3, h, sides: 6, color: 0x9fd8ff, top: 0xf4fbff }));
  steps.forEach((pf) => coinOn(w, pf));
  const far = w.addPlatform(pl, { lat: 30, lon: -40, r: 1.4, h: 5.4, float: true, color: 0x7dfcff, top: 0xe8fbff, bob: [0.3, 1.2, 0] });
  questItem(w, ctx, pl, far.n, 6.5, 'aura1', buildAuraCrystal());

  // ---------- B: the ice floes on the frozen lake (south-east) ----------
  const floes = [[-24, 80, 1.6, null], [-28, 90, 2.4, [0.4, 1.5, 0]], [-34, 98, 3.2, [0.4, 1.5, 1.6]], [-30, 108, 4.0, null]];
  floes.forEach(([la, lo, h, bob], i) => { const pf = w.addPlatform(pl, { lat: la, lon: lo, r: 1.4, h, float: true, thick: 0.5, color: 0xe8fbff, top: 0xffffff, ...(bob ? { bob } : {}) }); if (i < 3) coinOn(w, pf); });
  const floeTop = w.addPlatform(pl, { lat: -36, lon: 118, r: 1.5, h: 4.8, float: true, thick: 0.5, color: 0x9fd8ff, top: 0xffffff, bob: [0.35, 1.3, 0.8] });
  questItem(w, ctx, pl, floeTop.n, 6.0, 'aura2', buildAuraCrystal());
  coinLine(w, pl, LL(-10, 50), LL(-20, 74), 5);

  // ---------- C: the ice palace and its towers (north-east) ----------
  const palace = new THREE.Group();
  mk(new THREE.BoxGeometry(6, 3.2, 4), toon(0xd8f4ff), 0, 1.6, 0, palace, 1.03);
  mk(new THREE.BoxGeometry(1.6, 2.2, 0.1), basic(0x2a4aa8), 0, 1.1, 2.03, palace, 0);
  for (const x of [-2.4, 0, 2.4]) { mk(new THREE.ConeGeometry(0.9, 2.2, 6), toon(0x9fd8ff), x, 4.3, 0, palace, 1.05); mk(new THREE.OctahedronGeometry(0.25), basic(0x7dfcff), x, 5.6, 0, palace, 0); }
  w.put(pl, palace, LL(36, 30), 0, -0.9); w.addSolid(pl, LL(36, 30), 3.6, 4.5);
  const t1 = w.addPlatform(pl, { lat: 48, lon: 52, hx: 1.3, hz: 1.3, h: 2.2, color: 0xd8f4ff, top: 0x9fd8ff });
  const t2 = w.addPlatform(pl, { lat: 54, lon: 64, r: 1.3, h: 3.8, float: true, color: 0xbff2ff, crumble: true });
  const t3 = w.addPlatform(pl, { lat: 60, lon: 52, r: 1.3, h: 3.6, float: true, color: 0x9fd8ff, bob: [0.6, 1.4, 0] });
  const t4 = w.addPlatform(pl, { lat: 66, lon: 64, hx: 1.5, hz: 1.5, h: 5.6, color: 0xd8f4ff, top: 0x7dfcff });
  [t1, t2, t3].forEach((pf) => coinOn(w, pf));
  for (const pf of [t1, t4]) { const sp = new THREE.Group(); mk(new THREE.ConeGeometry(0.4, 1.2, 6), toon(0x9fd8ff), 0, pf.h + 0.6, 0, sp, 1.06); sp.position.set(1.0, 0, 1.0); pf.mesh.add(sp); }
  questItem(w, ctx, pl, t4.n, 6.7, 'aura3', buildAuraCrystal());
  w.addPlatform(pl, { lat: 76, lon: 64, r: 1.1, h: 7.2, float: true, color: 0xbff2ff, crumble: true });
  rareItem(w, ctx, pl, LL(76, 64), 8.2, 'deniz-r1', 'Above the palace towers');

  // ---------- Launch Star at the frozen gate ----------
  const gate = new THREE.Group();
  for (const s of [-1, 1]) { const c = mk(new THREE.OctahedronGeometry(0.8), toon(0x9fd8ff), 1.8 * s, 1.6, 0, gate, 1.06); c.scale.y = 2.4; }
  mk(new THREE.TorusGeometry(1.9, 0.18, 6, 24, Math.PI), toon(0xd8f4ff), 0, 2.6, 0, gate, 1.06);
  w.put(pl, gate, LL(-6, 202), 0);
  w.launchStar = w.addLaunchStar(pl, LL(-8, 194), { label: 'Launch to the Aura Throne Room!', lockedText: 'Pingo needs 5 Aura Crystals, and the Launch Star needs 3 star shards', use: () => ctx.toArena(w) });
  w.unlockLaunch = () => w.launchStar.setActive(true);
  if (ctx.ws(w).fstate === 'done') w.unlockLaunch();

  // ---------- secrets ----------
  w.addPlatform(pl, { lat: 60, lon: -120, r: 1.4, h: 0.45, color: 0xf4fbff, top: 0xffffff, bounce: 22, puff: 0x9fe8ff });
  const hi = w.addPlatform(pl, { lat: 70, lon: -120, r: 1.4, h: 6.2, float: true, color: 0x7dfcff });
  rareItem(w, ctx, pl, hi.n, 7.3, 'deniz-r3', 'The secret snow mound');
  w.addPlatform(pl, { lat: -82, lon: 0, r: 2, h: 1.2, float: true, color: 0x9fd8ff, bob: [0.5, 1, 0] });
  rareItem(w, ctx, pl, LL(-90, 0), 2.4, 'deniz-r2', 'The bottom of the planet');
  coinRing(w, pl, LL(-90, 0), 5, 8);
  coinRing(w, pl, LL(0, 0), 4.5, 8);
  coinLine(w, pl, LL(30, 200), LL(30, 260), 5);

  // ---------- De Bevroren Kloof: a parkour over a bottomless void, inside the ice cave ----------
  const cave = new THREE.Group();
  mk(new THREE.SphereGeometry(2.2, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), toon(0xd8f4ff), 0, 0, 0, cave, 1.04);
  mk(new THREE.CircleGeometry(1.2, 18), basic(0x0a1a3a), 0, 0.9, 2.05, cave, 0);
  for (let i = 0; i < 5; i++) { const ic = mk(new THREE.ConeGeometry(0.12, 0.5, 6), toon(0xbff2ff), -0.8 + i * 0.4, 1.95, 1.7, cave, 0); ic.rotation.x = Math.PI; }
  const caveSign = textBoard('FROZEN ABYSS', 2.6, 0.6, '#2a4aa8', '#e8fbff'); caveSign.position.set(0, 2.8, 1.2); cave.add(caveSign);
  w.put(pl, cave, LL(-16, -32), 0, 0.5);
  addParkour(w, ctx, {
    home: pl, entryDir: LL(-16, -32), entryPrompt: '<kbd>E</kbd> enter the Frozen Abyss', exitDir: LL(-11, -25), exitFwd: LL(0, 0),
    title: 'De Bevroren Kloof', sub: 'Mind the void. Ice beacons are checkpoints.', voidText: 'Into the void! Back to the last ice beacon.',
    rareId: 'deniz-r4', rareName: 'The end of the Frozen Abyss', marker: () => buildBeacon(0xd8f4ff, 0x7dfcff),
    theme: {
      sky: 'radial-gradient(ellipse at 50% 40%,#1a3a6a 0%,#0a1a3a 55%,#02060e 100%)',
      dome: [0x5a8ac8, 0x2a4a8a, 0x14285a, 0xffffff], gems: [0x9fe8ff, 0xffffff, 0x7dfcff], core: 0x0a1a3a, glow: 0x7dfcff,
      plat: 0x9fd8ff, platTop: 0xf4fbff, alt: 0xbff2ff, crumble: 0xe8fbff, bounce: 0x7dfcff, puff: 0xffffff, cpTop: 0x7dfcff, finTop: 0xffd23a, signFg: '#7dfcff', signBg: '#14285a',
    },
    route: [['hop', 3], ['bob', 3], ['circle', 2], ['cp'], ['crumble', 4], ['zig', 4], ['cp'], ['bounce'], ['down', 3], ['gap']],
  });

  // ---------- enemies: IJspinguïns (Deniz' guards) and frost bats ----------
  [[-20, 170], [30, 110], [-30, 140], [20, 260], [-40, 270], [40, -60], [-10, 70]].forEach(([la, lo]) => w.addEnemy(pl, LL(la, lo), 'slider', { roam: 0.18 }));
  [[30, -30], [-30, 110], [0, 150], [40, 180], [-50, 250], [60, -100], [-10, 300]].forEach(([la, lo]) => w.addEnemy(pl, LL(la, lo), 'icebat', { roam: 0.14 }));

  // ---------- boss ----------
  // ---------- more: aura crystals 4 and 5, and Elif ----------
  addMore(w, ctx, pl, {
    item: () => buildAuraCrystal(), prefix: 'aura', color: 0x9fd8ff, top: 0xf4fbff,
    local: {
      id: 'elif', name: 'Elif', who: 'ELIF',
      model: buildLocal({ s: 0.7, skin: 0xd8a878, shirt: 0xff5a6e, pants: 0x3a4a7a, hair: 0x2b1a10, hat: 'cap', capC: 0xfff8ec }),
      anim: (dt, t, n) => { n.model.arms[1].rotation.x = -0.6 + Math.sin(t * 12) * 0.15; n.model.body.position.x = Math.sin(t * 20) * 0.01; },
      task: { type: 'fetch', model: buildTrinket('mitten'), banner: 'ELIF’S MITTEN!', found: 'My mitten! Bring it back before my hand freezes off!' },
      first: [
        ['ELIF', 'Brrr! Hi. I’m Elif. I lost my mitten. My favourite one, with the little penguin on it.'],
        ['ELIF', 'The wind blew it up onto the icy steps up north. My hand is turning into a popsicle. Can you get it?'],
      ],
      progress: () => [['ELIF', 'My mitten is on the icy steps up north. My fingers are freezing!']],
      done: [['ELIF', 'My mitten! Ahh, warm again.'], ['ELIF', 'This star shard was frozen in a snowball. You can have it.']],
      after: [['ELIF', 'Snowball fight? …Later. When I have two mittens again. Oh wait, I do now!']],
      bubbles: { new: ['Brrr!', 'My mitten…', 'So cold!'], progress: ['Up north!', 'The icy steps!', 'Brrr…'], done: ['Warm!', 'Thank you!', '*claps with mittens*'] },
    },
  });

  w.boss = new Deniz(w, arena);
  w.hitLines = [['PINGO', '(radio) His hair! You touched his hair! Oh, he is furious.'], ['PINGO', '(radio) His aura is flickering, sir Rênas! One more!']];
  w.winLines = [
    ['DENIZ', '…Fine. FINE. Your aura is… acceptable. Take the IJskern.'],
    ['DENIZ', 'But I am still the coolest. Literally. I am made of ice. Mostly.'],
    ['RENAS-1', 'Fuel secured: the IJskern. Aura levels: off the charts. Range: still not enough for Homerun Heuvel.'],
    ['RENAS-1', 'One more fuel stop. Next signal: Smaragdeiland.'],
    ['RÊNAS', 'Josh is never going to believe this. A Duke! Of ICE!'],
  ];
  void frameDir;
  return w;
}
