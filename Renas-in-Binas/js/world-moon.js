import { World, addStars, addBackdropPlanet, LL, frameDir, V3, toon, basic, mk, THREE, coinRing, coinLine, coinOn, crystal, rock, lamp, sign, addRocket, questItem, rareItem, setupFriend, setupLocal, gusts, addMore } from './worlds-common.js?v=20261112d';
import { fbm } from './world.js?v=20261112d';
import { buildNiek, buildBattery, buildFlag, textBoard, buildLocal } from './models.js?v=20261112d';
import { Mecha } from './bosses.js?v=20261112d';
import { addParkour, buildBeacon } from './parkour.js?v=20261112d';
import { rOf } from './core.js?v=20261112d';

// World 8 on the route: MAANKRATER. A grey moon with craters, a radio tower and a satellite that circles it.
// New here: moon gravity. You jump more than twice as high and fall slowly, so everything is built tall.
// Every now and then a solar wind pushes you along. Boss: MECHA-MIAUW, Kayo & Yara's giant robot cat.
export function buildMoon(ctx) {
  const w = new World('kosmo');
  Object.assign(w, {
    index: 8, title: 'Maankrater', sub: 'Low gravity, big jumps, two very naughty cats.', friendName: 'Niek',
    arenaTitle: 'De Donkere Kant', arenaSub: 'Kayo & Yara are warming up their robot',
    sky: 'radial-gradient(ellipse at 50% 30%,#1a1a3a 0%,#0a0a1a 60%,#020208 100%)',
    arenaSky: 'radial-gradient(ellipse at 50% 30%,#2a0a2a 0%,#0e0414 60%,#020104 100%)',
    music: 'moon', bossMusic: 'boss9', lights: [0xe8ecff, 0x2a2a4a],
    quest: { icon: '🔋', label: 'Power cells', got: 0, need: 3 },
  });
  w.quest.got = ctx.ws(w).items.length;
  addStars(w, 900);
  addBackdropPlanet(w, V3(160, 90, -160), 30, 0x3a8ad8, 0x5cc84a);   // a big blue-green planet in the sky
  addBackdropPlanet(w, V3(-200, -60, 120), 10, 0xffd23a);

  const g1 = new THREE.Color(0xb8b8c8), g2 = new THREE.Color(0x9a9aac), g3 = new THREE.Color(0x7a7a8c), dark = new THREE.Color(0x5a5a6c), path = new THREE.Color(0xd8d8e8);
  const CR = [[20, 60, 0.12], [-30, 130, 0.1], [45, 230, 0.14], [-50, -20, 0.09], [10, 300, 0.11], [-10, 190, 0.08]].map(([la, lo, s]) => [LL(la, lo), Math.cos(s)]);
  const pl = w.addPlanet({
    c: V3(0, 0, 0), r: 22, shape: 'kraters', atmo: 0xc8d8ff, atmoOp: 0.06,
    paint: (p, out) => {
      const n = fbm(p, 3);
      out.copy(n > 0.6 ? g1 : n > 0.45 ? g2 : g3);
      for (const [d, c] of CR) { const k = p.dot(d); if (k > c) out.copy(k > c + (1 - c) * 0.25 ? dark : g3); }   // craters
      if (p.z > 0.965 && Math.abs(p.x) < 0.05) out.copy(path);
    },
  });
  pl.grav = 0.5;
  w.main = pl;
  gusts(w, pl, { every: 16, len: 3, power: 4, color: 0xc8d8ff, text: '☄️ Solar wind!', delay: 12 });
  const a1 = new THREE.Color(0x5a5a6c), a2 = new THREE.Color(0x3a3a4c), ag = new THREE.Color(0xff5ab4);
  const arena = w.addPlanet({
    c: V3(0, 30, -120), r: 14, atmo: 0xff5ab4, atmoOp: 0.08,
    paint: (p, out) => { const n = fbm(p, 3); out.copy(Math.abs(n - 0.5) < 0.012 ? ag : n > 0.5 ? a1 : a2); },
  });
  arena.grav = 0.55;
  w.arena = arena;
  w.spawn = { dir: LL(0, 0), fwd: V3(0, 1, 0) };
  w.arenaSpawn = { dir: arena.c.clone().negate().normalize(), fwd: V3(0, 1, 0) };
  addRocket(w, ctx, pl, LL(-4, 9));
  // crater rims
  for (const [d] of CR) { const ring = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.35, 6, 28), toon(0xa8a8b8)); ring.rotation.x = Math.PI / 2; const h = new THREE.Group(); h.add(ring); w.put(pl, h, d, 0); }

  // ---------- Niek next to his moon rover ----------
  const niek = buildNiek();
  const npc = w.addNPC(pl, niek, LL(5, 12), { name: 'Niek', bubbleY: 2.2, anim: (dt, t, n) => {
    // slow moon bounces, waving with one arm
    n.model.r.position.y = Math.abs(Math.sin(t * 1.6)) * 0.35;
    n.model.arms[1].rotation.x = -2.6; n.model.arms[1].rotation.z = 0.4 + Math.sin(t * 6) * 0.35;
    n.model.arms[0].rotation.z = -0.3;
    n.model.head.rotation.z = Math.sin(t * 1.6) * 0.08;
  } });
  {
    const rover = new THREE.Group();
    mk(new THREE.BoxGeometry(1.8, 0.5, 1.2), toon(0xf4f1ea), 0, 0.7, 0, rover, 1.05);
    for (const [x, z] of [[-0.7, 0.6], [0.7, 0.6], [-0.7, -0.6], [0.7, -0.6]]) mk(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 12), toon(0x3a3640), x, 0.3, z, rover, 1.08).rotation.x = Math.PI / 2;
    mk(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 6), toon(0x9aa0b8), 0.6, 1.3, 0, rover, 0);
    mk(new THREE.SphereGeometry(0.35, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon(0xd8d8e8), 0.6, 1.7, 0, rover, 1.06).rotation.x = Math.PI;
    w.put(pl, rover, LL(9, 18), 0, 1.2); w.addSolid(pl, LL(9, 18), 1.1, 1.0);
  }
  setupFriend(w, ctx, npc, {
    name: 'Niek',
    first: [
      ['NIEK', 'Hey! A visitor! Nobody ever comes up here. I’m Niek. I live on the moon base with my rover.'],
      ['RÊNAS', 'Hi Niek! Why do I feel so… floaty?'],
      ['NIEK', 'Moon gravity! You jump twice as high and you fall really slowly. Best trampoline in the galaxy.'],
      ['NIEK', 'But bad news. Two cats landed here in a flying saucer. Kayo and Yara. They built a giant robot cat: MECHA-MIAUW.'],
      ['NIEK', 'They stole my three power cells to charge it. Now my rover won’t drive. I was going to race it around the crater!'],
      ['RÊNAS', 'KAYO AND YARA! Those two stole my cores! Do they have one here?'],
      ['NIEK', 'Yep. The Maankern. It powers the cockpit. They keep it inside the glass dome.'],
      ['NIEK', 'The cells fell out of their saucer. One is on top of the radio tower. One floats on the high asteroids. And one is on the satellite. It circles the moon. Catch it!'],
      ['NIEK', 'Nova and Commandant Bas each found a star shard. Help them and they’ll give them to you. And remember: jump BIG.'],
    ],
    progress: (got) => [['NIEK', `Power cells: ${got}/5. The radio tower, the high asteroids, and the satellite. Jump big!`]],
    needLocals: (left) => [['NIEK', `All five power cells! Yes! But the Launch Star still needs star shards. ${left.join(' and ')} still need${left.length === 1 ? 's' : ''} you. Look for the yellow “!”.`]],
    done: [
      ['NIEK', 'My power cells! The rover is humming again. After this, we race. Deal?'],
      ['NIEK', 'The Launch Star is awake. It takes you to De Donkere Kant, the dark side. That’s where MECHA-MIAUW is.'],
      ['NIEK', 'It shoots lasers from its eyes: jump over them. Missiles: keep moving. And it jumps at you: get out of the red circle.'],
      ['NIEK', 'After that big jump it overheats. The glass dome pops open. Jump INTO the cockpit and bonk those cats!'],
    ],
    after: [['NIEK', 'Lasers: jump. Missiles: move. Dome open: jump in. You’ve got this!']],
    bubbles: {
      new: ['Hey! Up here!', 'A visitor!', '*moon bounce*'],
      progress: ['My power cells…', 'Jump big!', 'Catch the satellite!', 'Psst. The Sterrenbrug has a golden gear at the end.'],
      done: ['To the Launch Star!', 'Jump into the dome!', 'Race you later!'],
    },
  });

  // ---------- the locals ----------
  setupLocal(w, ctx, {
    id: 'nova', name: 'Nova', who: 'NOVA', dir: LL(-30, -76), bubbleY: 2.0,
    model: buildLocal({ s: 0.76, skin: 0xd8a070, shirt: 0xf4f1ea, pants: 0xf4f1ea, hair: 0x2b1a10, hat: 'helmet', shoes: 0x9aa0b8 }),
    anim: (dt, t, n) => { n.model.arms[1].rotation.x = -2.8 + Math.sin(t * 3) * 0.2; n.model.r.position.y = Math.abs(Math.sin(t * 1.5)) * 0.3; },   // floating little hops
    task: { type: 'fetch', dir: LL(-46, -94), alt: 9.2, model: buildFlag(), banner: 'NOVA’S FLAG!', found: 'My flag! Bring it back. Gently, it’s the first flag ever planted on this moon!' },
    first: [
      ['NOVA', 'Hi! I’m Nova. Astronaut, just like you. I came here to plant the very first flag on this moon.'],
      ['NOVA', 'But the solar wind blew it right onto the top of that crater ridge. It’s SO high.'],
      ['NOVA', 'On the moon you jump really far. Hop up the rocks. Bring my flag back and you get my star shard.'],
    ],
    progress: () => [['NOVA', 'My flag is on the very top of the crater ridge. Hop up the rocks, you jump really high here!']],
    done: [['NOVA', 'My flag! First flag on this moon. And look, it’s waving! …There’s no wind here. How is it waving?'], ['NOVA', 'Here’s the star shard. It floated past my helmet. Moon things.']],
    after: [['NOVA', 'One small step for Nova… one giant leap for Rênas!']],
    bubbles: { new: ['Hi, astronaut!', 'My flag…', '*floats*'], progress: ['The crater ridge!', 'Jump high!', 'So high…'], done: ['First flag!', 'Thank you!', 'Giant leap!'] },
  });
  [[-34, -82, 2.0], [-37, -86, 4.2], [-41, -89, 6.4], [-46, -94, 8.2]].forEach(([la, lo, h], i) => w.addPlatform(pl, { lat: la, lon: lo, r: i === 3 ? 1.5 : 1.1, h, sides: 7, color: 0x8a8a9c, top: 0xb8b8c8 }));
  setupLocal(w, ctx, {
    id: 'bas', name: 'Bas', who: 'BAS', dir: LL(-30, 196), bubbleY: 2.1,
    model: buildLocal({ s: 0.84, skin: 0xf0c8a0, shirt: 0x3a4a7a, pants: 0x2b2440, hair: 0xa8a8a8, hat: 'cap', capC: 0x2b2440, beard: 0xc8c8c8, shoes: 0x2b2440 }),
    anim: (dt, t, n) => { n.model.arms[1].rotation.x = -2.2; n.model.arms[1].rotation.z = -0.4; },   // a salute
    task: { type: 'duel', game: 'tag', n: 3, time: 34, speed: 6.2, winTitle: 'DRILL PASSED!', found: 'Training complete! Report back to the commandant, soldier!', lost: 'Too slow, cadet! Talk to me to repeat the drill!' },
    first: [
      ['BAS', 'At ease, cadet. Commandant Bas, moon base Krater-1.'],
      ['BAS', 'Every cadet has to pass the Moon Drill. In low gravity, catching someone is harder than you think.'],
      ['RÊNAS', 'Catching who?'],
      ['BAS', 'Me, cadet. I may be old, but I hop like a moon rabbit. Tag me three times before the clock runs out.'],
      ['BAS', 'Pass the drill and the star shard is yours. Ready? …That was a rhetorical question. GO!'],
    ],
    progress: () => [['BAS', 'Again, cadet? The Moon Drill waits for no one. Catch me!']],
    done: [['BAS', 'Drill passed! Excellent work, cadet. I’m promoting you. To captain.'], ['BAS', 'Here is the star shard. Wait. You were already a captain? …Then you’re a SUPER captain.']],
    after: [['BAS', 'Dismissed, super captain. *salutes*']],
    bubbles: { new: ['At ease, cadet.', 'Moon Drill!', '*salutes*'], progress: ['Again, cadet?', 'Catch me!', 'Hop hop!'], done: ['Super captain!', 'Drill passed!', 'Dismissed.'] },
  });

  // ---------- decor: boulders, moon crystals, a little base ----------
  [[16, -20], [-26, 160], [12, 290], [44, 200], [-50, 240], [-36, 206], [-46, 214], [30, 40], [-8, 110]].forEach(([la, lo], i) => rock(w, pl, LL(la, lo), 0.9 + (i % 3) * 0.4, 0x8a8a9c));
  [[20, 100, 0x9fe8ff], [-40, 160, 0xc8b0ff], [54, 250, 0x9fe8ff], [-58, 20, 0xff5ab4]].forEach(([la, lo, c], i) => crystal(w, pl, LL(la, lo), c, 0.9 + i * 0.2));
  {
    const base = new THREE.Group();
    mk(new THREE.SphereGeometry(1.6, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon(0xf4f1ea), 0, 0, 0, base, 1.04);
    mk(new THREE.CylinderGeometry(0.5, 0.5, 1.2, 12), toon(0xd8d8e8), 1.8, 0.4, 0, base, 1.05).rotation.z = Math.PI / 2;
    for (let i = 0; i < 4; i++) mk(new THREE.CircleGeometry(0.15, 10), basic(0xffd23a), Math.cos(i * 0.6 - 0.9) * 1.55, 0.7, Math.sin(i * 0.6 - 0.9) * 1.55, base, 0).lookAt(V3(Math.cos(i * 0.6 - 0.9) * 5, 0.7, Math.sin(i * 0.6 - 0.9) * 5));
    w.put(pl, base, LL(-24, 186), 0, 0.5); w.addSolid(pl, LL(-24, 186), 1.6, 1.6);
  }
  [[-8, -8], [10, 6], [-6, 22]].forEach(([la, lo]) => lamp(w, pl, LL(la, lo), 0x9fe8ff, 2.8));
  sign(w, pl, LL(12, -6), textBoard('MAANKRATER', 3.4, 0.9, '#2b2440', '#9fe8ff'), 0.3, 2.6);
  sign(w, pl, LL(-12, 14), textBoard('LOW GRAVITY: JUMP BIG!', 3.0, 0.7, '#9fe8ff', '#2b2440'), -0.4, 1.8);

  // ---------- A: the radio tower (west): tall steps, made for moon jumps ----------
  const T0 = LL(22, -40);
  {
    const tower = new THREE.Group();
    for (const [x, z] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) mk(new THREE.CylinderGeometry(0.08, 0.12, 15, 6), toon(0xd8d8e8), x, 7.5, z, tower, 1.08);
    for (let k = 1; k < 7; k++) mk(new THREE.TorusGeometry(0.85, 0.05, 4, 4), toon(0xe03a3a), 0, k * 2.2, 0, tower, 0).rotation.set(Math.PI / 2, 0, Math.PI / 4);
    const dish = mk(new THREE.SphereGeometry(1.2, 14, 8, 0, Math.PI * 2, 0, Math.PI / 3), toon(0xf4f1ea), 0, 16.6, 0, tower, 1.05); dish.rotation.x = Math.PI;
    const blink = mk(new THREE.SphereGeometry(0.15, 8, 6), basic(0xff3a3a), 0, 17.4, 0, tower, 0);
    w.put(pl, tower, T0, 0); w.addSolid(pl, T0, 0.9, 15);
    w.updaters.push((dt, t) => { blink.visible = Math.sin(t * 4) > 0; dish.rotation.z = Math.sin(t * 0.5) * 0.3; });
  }
  const steps = [];
  for (let i = 0; i < 6; i++) steps.push(w.addPlatform(pl, { dir: frameDir(T0, 90 - 7, i * 65), r: 1.1, h: 2.4 + i * 2.2, float: true, thick: 0.4, color: 0x8a8a9c, top: 0x9fe8ff, ...(i === 3 ? { crumble: true } : {}) }));
  steps.forEach((pf) => coinOn(w, pf));
  w.addPlatform(pl, { dir: T0, r: 1.6, h: 15.4, float: true, thick: 0.4, color: 0xd8d8e8, top: 0x9fe8ff });
  questItem(w, ctx, pl, frameDir(T0, 90 - 2.5, 90), 16.4, 'cell1', buildBattery());
  w.addPlatform(pl, { dir: frameDir(T0, 90 - 5, 200), r: 0.9, h: 20, float: true, thick: 0.3, color: 0x8a8a9c, top: 0xffd23a, bob: [0.5, 1, 0] });
  rareItem(w, ctx, pl, frameDir(T0, 90 - 5, 200), 21, 'kosmo-r1', 'Above the radio tower');

  // ---------- B: the high asteroids (south-east): floating rocks drifting up and down ----------
  const ast = [[-12, 62, 2.6], [-16, 70, 5.0], [-20, 77, 7.4], [-24, 84, 9.8], [-28, 92, 12.2]].map(([la, lo, h], i) => w.addPlatform(pl, { lat: la, lon: lo, r: 1.2, h, float: true, thick: 0.9, sides: 7, color: 0x6a6a7c, top: 0x9a9aac, bob: [0.8, 0.7, i * 1.3] }));
  ast.slice(0, 4).forEach((pf) => coinOn(w, pf));
  questItem(w, ctx, pl, ast[4].n, 13.2, 'cell2', buildBattery());
  w.addPlatform(pl, { lat: -34, lon: 100, r: 1.0, h: 17, float: true, thick: 0.6, sides: 6, color: 0x6a6a7c, top: 0xc8b0ff, bob: [0.6, 0.9, 2] });
  rareItem(w, ctx, pl, LL(-34, 100), 18, 'kosmo-r3', 'On the highest asteroid');

  // ---------- C: the satellite: it circles the whole moon. Wait for it, jump on, ride it ----------
  const SAT = LL(60, 150);
  const sat = w.addPlatform(pl, { dir: SAT, hx: 1.6, hz: 1.0, h: 6.5, float: true, thick: 0.5, color: 0xd8d8e8, top: 0x3a8ad8, orbit: [V3(0, 1, 0).applyAxisAngle(V3(1, 0, 0), 0.5), 0.25] });
  for (const s of [-1, 1]) mk(new THREE.BoxGeometry(1.6, 0.06, 1.0), toon(0x3a5ad8), 2.6 * s, 6.25, 0, sat.mesh, 1.08);   // solar panels
  {
    // the power cell rides on the satellite: a quest item that follows the platform every frame
    const it = questItem(w, ctx, pl, sat.n, 7.5, 'cell3', buildBattery());
    if (it) w.updaters.push(() => { if (!it.taken) { it.dir.copy(sat.n); it.obj.position.copy(pl.c).addScaledVector(sat.n, rOf(pl, sat.n) + 7.5); it.obj.quaternion.copy(sat.mesh.quaternion); } });
  }
  // a launch pad on the ground under the satellite's path, to reach it
  w.addPlatform(pl, { dir: SAT, r: 1.3, h: 0.4, color: 0x3a3640, top: 0x5ef2e0, bounce: 15, puff: 0x5ef2e0 });   // the satellite starts right above this pad and comes back every 25 s
  sign(w, pl, frameDir(SAT, 90 - 8, 180), textBoard('WAIT FOR THE SATELLITE ▲', 3.0, 0.6, '#5ef2e0', '#2b2440'), 0, 1.8);

  // ---------- Launch Star between two antennas ----------
  const gate = new THREE.Group();
  for (const s of [-1, 1]) { mk(new THREE.CylinderGeometry(0.1, 0.15, 4, 6), toon(0xd8d8e8), 1.8 * s, 2, 0, gate, 1.08); mk(new THREE.SphereGeometry(0.25, 10, 8), basic(0xff5ab4), 1.8 * s, 4.1, 0, gate, 0); }
  w.put(pl, gate, LL(-4, 254), 0);
  w.launchStar = w.addLaunchStar(pl, LL(-6, 244), { label: 'Launch to the Dark Side!', lockedText: 'Niek needs his 5 power cells, and the Launch Star needs 3 star shards', use: () => ctx.toArena(w) });
  w.unlockLaunch = () => w.launchStar.setActive(true);
  if (ctx.ws(w).fstate === 'done') w.unlockLaunch();

  // ---------- secrets ----------
  w.addPlatform(pl, { lat: -82, lon: 0, r: 2, h: 1.6, float: true, color: 0x8a8a9c, top: 0xb8b8c8, bob: [0.5, 1, 0] });
  rareItem(w, ctx, pl, LL(-90, 0), 2.8, 'kosmo-r2', 'Under the moon');
  coinRing(w, pl, LL(-90, 0), 5, 8);
  coinRing(w, pl, LL(0, 0), 4.5, 8, 2.5);
  coinLine(w, pl, LL(20, 190), LL(26, 240), 5, 3);
  coinLine(w, pl, LL(-4, 30), LL(-10, 46), 4, 3);

  // ---------- De Sterrenbrug: a parkour over a bottomless void, through the base airlock ----------
  const lock = new THREE.Group();
  mk(new THREE.CylinderGeometry(1.6, 1.6, 3, 16, 1, false, 0, Math.PI), toon(0xf4f1ea), 0, 1.5, 0, lock, 1.04).rotation.y = -Math.PI / 2;
  mk(new THREE.BoxGeometry(1.4, 2.0, 0.1), basic(0x14283a), 0, 1.0, 1.58, lock, 0);
  mk(new THREE.BoxGeometry(1.5, 0.12, 0.12), basic(0x5ef2e0), 0, 2.1, 1.6, lock, 0);
  const lockSign = textBoard('STERRENBRUG', 2.4, 0.6, '#2b2440', '#9fe8ff'); lockSign.position.set(0, 2.6, 1.65); lock.add(lockSign);
  w.put(pl, lock, LL(-16, -26), 0, 0.5);
  addParkour(w, ctx, {
    home: pl, entryDir: LL(-16, -26), entryPrompt: '<kbd>E</kbd> enter the Sterrenbrug', exitDir: LL(-11, -19), exitFwd: LL(0, 0),
    title: 'De Sterrenbrug', sub: 'Mind the void. Antenna beacons are checkpoints. Normal gravity in here!', voidText: 'Into the void! Back to the last antenna beacon.',
    rareId: 'kosmo-r4', rareName: 'The end of the Sterrenbrug', marker: () => buildBeacon(0xd8d8e8, 0x5ef2e0),
    theme: {
      sky: 'radial-gradient(ellipse at 50% 40%,#14143a 0%,#08081a 55%,#010104 100%)',
      dome: [0x3a3a5a, 0x2a2a44, 0x14142a, 0x9fe8ff], gems: [0x9fe8ff, 0xc8b0ff, 0xff5ab4], core: 0x0a0a2a, glow: 0x9fe8ff,
      plat: 0x8a8a9c, platTop: 0x9fe8ff, alt: 0xb8b8c8, crumble: 0x6a6a7c, bounce: 0x5ef2e0, puff: 0x9fe8ff, cpTop: 0x5ef2e0, finTop: 0xffd23a, signFg: '#9fe8ff', signBg: '#14142a',
    },
    route: [['hop', 3], ['bob', 3], ['circle', 2], ['cp'], ['zig', 3], ['crumble', 3], ['cp'], ['bounce'], ['gap'], ['circle', 2], ['down', 2], ['hop', 2]],
  });

  // ---------- enemies: moon mites and Kayo & Yara's Kattenbots ----------
  [[-50, 120], [10, 70], [20, 40], [-10, 170], [50, 290], [-30, 320], [34, -80]].forEach(([la, lo]) => w.addEnemy(pl, LL(la, lo), 'mite', { roam: 0.15 }));
  [[-20, 140], [30, 110], [40, 230], [-40, 60], [0, 300]].forEach(([la, lo]) => w.addEnemy(pl, LL(la, lo), 'kattenbot', { roam: 0.2 }));

  // ---------- boss ----------
  // ---------- more: power cells 4 and 5, and Sterre ----------
  addMore(w, ctx, pl, {
    item: () => buildBattery(), prefix: 'cell', color: 0x8a8a9c, top: 0x9fe8ff,
    local: {
      id: 'sterre', name: 'Sterre', who: 'STERRE',
      model: buildLocal({ s: 0.74, skin: 0xf0c8a0, shirt: 0xfff8ec, pants: 0x3a3e6e, hair: 0xe8d070 }),
      anim: (dt, t, n) => { n.model.head.rotation.x = -0.5; n.model.arms[0].rotation.x = n.model.arms[1].rotation.x = -2.2; },
      task: { type: 'stomp', enemy: 'mite', n: 3, found: 'They’re gone! Come back to me!' },
      first: [
        ['STERRE', 'Hi! I’m Sterre. I look at the stars with my telescope up north.'],
        ['STERRE', 'But three Maanmijten keep hopping on my telescope and messing up the focus! Can you stomp them?'],
      ],
      progress: (l) => [['STERRE', `${l.left} Maanmijten left at my telescope up north!`]],
      done: [['STERRE', 'Perfect focus! I can see your station from here!'], ['STERRE', 'Here, a star shard. I watched it fall and caught it.']],
      after: [['STERRE', 'Wave at the telescope! …I can see you waving.']],
      bubbles: { new: ['Hi!', 'My telescope…', 'Mites!'], progress: ['Up north!', 'Stomp them!', 'Blurry…'], done: ['Perfect focus!', 'Thanks!', '*looks up*'] },
    },
  });

  w.boss = new Mecha(w, arena);
  w.hitLines = [['NIEK', '(radio) Direct hit in the cockpit! The cats are panicking!'], ['NIEK', '(radio) Watch out, MECHA-MIAUW is really angry now. More lasers incoming!']];
  w.winLines = [
    ['KAYO', 'MIAUW! MIAUW MIAUW!', '(RENAS-1 translates: “Our robot! You broke our beautiful robot!”)'],
    ['YARA', 'Miauw… miauw.', '(RENAS-1 translates: “Fine. Keep the Maankern. We’ll get you at Homerun Heuvel!”)'],
    ['RENAS-1', 'Fuel secured: the Maankern. Tank: FULL. Range: Homerun Heuvel. Last signal!'],
    ['RÊNAS', 'Thanks, Niek! Next stop: Nathan’s planet. He’s the best baseball player in the galaxy!'],
  ];
  return w;
}
