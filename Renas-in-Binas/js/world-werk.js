import { World, addStars, addBackdropPlanet, LL, frameDir, V3, toon, basic, mk, THREE, coinRing, coinLine, coinOn, rock, lamp, sign, addRocket, questItem, rareItem, setupFriend, setupLocal, addMore, lavaFloor } from './worlds-common.js?v=20261114b';
import { fbm } from './world.js?v=20261114b';
import { buildLars, buildNathan, buildMilo, buildBlueprint, buildGear, textBoard, buildLocal, buildTrinket } from './models.js?v=20261114b';
import { Tandwieltron } from './bosses.js?v=20261114b';
import { addParkour, buildBeacon } from './parkour.js?v=20261114b';
import { G, toast, banner, puff, surf } from './core.js?v=20261114b';
import { P } from './player.js?v=20261114b';
import { sfx } from './audio.js?v=20261114b';
import { duelModels } from './duels.js?v=20261114b';

// BONUS planet, after the finale: DE GOUDEN WERKPLAATS. Lars and Nathan built it as a thank-you for Rênas,
// but Kayo & Yara snuck in and took over Tandwieltron, the big builder robot.
// Hard on purpose: turning gear platforms, pistons, crumbling steps and a floor of molten gold.
// The Gouden Kluis opens only for someone with all 53 golden gears from the other planets.
export function buildWerk(ctx) {
  const w = new World('werk');
  Object.assign(w, {
    index: 11, title: 'De Gouden Werkplaats', sub: 'Bonus planet: gears, pistons, and no mercy.', friendName: 'Lars',
    arenaTitle: 'De Gouden Hal', arenaSub: 'Tandwieltron is warming up',
    sky: 'radial-gradient(ellipse at 50% 30%,#5a3a1a 0%,#2a1a0a 60%,#0a0602 100%)',
    arenaSky: 'radial-gradient(ellipse at 50% 30%,#6a2a1a 0%,#2a0e06 60%,#0a0302 100%)',
    music: 'werk', bossMusic: 'boss12', lights: [0xffe8c0, 0x4a3a2a],
    quest: { icon: '📜', label: 'Blueprints', got: 0, need: 3 },
  });
  w.quest.got = ctx.ws(w).items.length;
  addStars(w, 700);
  addBackdropPlanet(w, V3(170, 100, -160), 22, 0xffd23a);
  addBackdropPlanet(w, V3(-180, -70, 140), 12, 0xc8b070);

  const m1 = new THREE.Color(0x8a7a5a), m2 = new THREE.Color(0x6a5a44), m3 = new THREE.Color(0x4a4034), plate = new THREE.Color(0xa89870), path = new THREE.Color(0xffd23a), melt = new THREE.Color(0xff9a1a);
  const PIT = LL(-22, 78);   // the molten-gold pit under the pistons
  const inPit = (u) => u.dot(PIT) > Math.cos(THREE.MathUtils.degToRad(13));
  const pl = w.addPlanet({
    c: V3(0, 0, 0), r: 26, shape: 'dobbelsteen', atmo: 0xffd23a, atmoOp: 0.12,
    paint: (p, out) => {
      const n = fbm(p, 2.4);
      out.copy(n > 0.6 ? m1 : n > 0.45 ? m2 : m3);
      // riveted floor plates in a grid
      if (Math.abs(Math.sin(p.x * 22)) < 0.06 || Math.abs(Math.sin(p.y * 22)) < 0.06) out.copy(plate);
      if (p.z > 0.965 && Math.abs(p.x) < 0.05) out.copy(path);
      if (inPit(p)) out.copy(fbm(p, 8) > 0.5 ? melt : path);
    },
  });
  w.main = pl;
  const a1 = new THREE.Color(0x6a5a44), a2 = new THREE.Color(0x4a4034), ag = new THREE.Color(0xffd23a);
  const arena = w.addPlanet({
    c: V3(0, 30, -120), r: 14, atmo: 0xff8a1a, atmoOp: 0.1,
    paint: (p, out) => { const n = fbm(p, 3); out.copy(Math.abs(n - 0.5) < 0.012 ? ag : n > 0.5 ? a1 : a2); },
  });
  w.arena = arena;
  w.spawn = { dir: LL(0, 0), fwd: V3(0, 1, 0) };
  w.arenaSpawn = { dir: arena.c.clone().negate().normalize(), fwd: V3(0, 1, 0) };
  addRocket(w, ctx, pl, LL(-4, 9));
  lavaFloor(w, pl, inPit, 0xffb03a);

  // ---------- Lars, by his workbench ----------
  const lars = buildLars();
  const npc = w.addNPC(pl, lars, LL(5, 12), { name: 'Lars', bubbleY: 1.9, anim: (dt, t, n) => {
    n.model.arms[1].rotation.x = -0.6 + Math.sin(t * 3) * 0.6;
    n.model.head.rotation.y = Math.sin(t * 0.7) * 0.3;
  } });
  {
    const bench = new THREE.Group();
    mk(new THREE.BoxGeometry(2.2, 0.15, 1.0), toon(0x8a5a34), 0, 0.9, 0, bench, 1.05);
    for (const [x, z] of [[-1, -0.4], [1, -0.4], [-1, 0.4], [1, 0.4]]) mk(new THREE.BoxGeometry(0.12, 0.9, 0.12), toon(0x5a3a24), x, 0.45, z, bench, 1.05);
    const gr = buildGear(0.3, 0xffd23a, 8, 0.1); gr.position.set(-0.5, 1.03, 0); bench.add(gr);
    w.put(pl, bench, LL(8, 16), 0, 0.4);
  }
  setupFriend(w, ctx, npc, {
    name: 'Lars',
    first: [
      ['LARS', 'BINAS! You came! Welcome to De Gouden Werkplaats!'],
      ['RÊNAS', 'Lars! Whoa… this whole planet is a workshop?'],
      ['LARS', 'Nathan and I built it. For you! A thank-you for saving all those planets. That’s what best friends do.'],
      ['LARS', 'In the big hall there’s the Gouden Kern, the golden core. With that, your station would be super fast.'],
      ['LARS', 'But… Kayo and Yara snuck in. They took over Tandwieltron, our big builder robot, and he blew my three blueprints all over the planet.'],
      ['RÊNAS', 'Those cats again?!'],
      ['LARS', 'Fair warning, Binas: this planet is HARD. Turning gears, crumbling steps, pistons, and a pit of molten gold. We built it for experts.'],
      ['LARS', 'One blueprint is on top of the Tandwieltoren, the gear tower to the west. Its gears keep turning, so time your jumps.'],
      ['LARS', 'One is on top of De Pers, past the pistons over the gold pit. And one hangs from the end of the crane up north.'],
      ['LARS', 'Enno and Nathan each found a star shard. Help them and they’ll give them to you.'],
    ],
    progress: (got) => [['LARS', `Blueprints: ${got}/5. The Tandwieltoren, De Pers, and the crane. Time your jumps, Binas!`]],
    needLocals: (left) => [['LARS', `All five blueprints! You’re a legend, Binas! But the Launch Star still needs star shards. ${left.join(' and ')} still need${left.length === 1 ? 's' : ''} you. Look for the yellow “!”.`]],
    done: [
      ['LARS', 'My blueprints! Every single one. You’re the best, Binas.'],
      ['LARS', 'The Launch Star under the gear arch is awake. It takes you to De Gouden Hal. That’s where Tandwieltron is.'],
      ['LARS', 'He drops bolts: watch the red circles. He stamps out saw rings: jump. And pistons punch up out of the floor: keep moving!'],
      ['LARS', 'Builder secret: when he revs up and CHARGES, dodge. He slams into the floor and overheats, and the hatch on his head pops open. Jump on it!'],
    ],
    after: [['LARS', 'Bolts: dodge. Saws: jump. Charge: dodge, then jump on the hatch. Five times. You’ve got this, Binas!']],
    bubbles: {
      new: ['Binas!', 'Over here!', '*taps his pickaxe*'],
      progress: ['Time your jumps!', 'My blueprints…', 'Psst. The Gouden Gang has a golden gear at the end.', 'Have you seen the vault?'],
      done: ['To the Launch Star!', 'Jump on the hatch!', 'Go, Binas!'],
    },
  });

  // ---------- the locals ----------
  setupLocal(w, ctx, {
    id: 'tiktak', name: 'Enno', who: 'ENNO', dir: LL(-30, -76), bubbleY: 2.0,
    model: buildLocal({ s: 0.76, skin: 0xf0c8a0, shirt: 0x1fb5a6, pants: 0x3a3e4e, hair: 0x8a7a6a, hat: 'curls' }),
    anim: (dt, t, n) => { n.model.head.rotation.y = Math.sin(t * 1.5) * 0.3; n.model.arms[0].rotation.x = -1.0 + Math.sin(t * 3) * 0.2; },
    task: { type: 'fetch', dir: LL(-46, -94), alt: 6.8, model: buildTrinket('stopwatch'), banner: 'ENNO’S CLOCK!', found: 'My clock! Bring it back. Without it my calculations are all wrong!' },
    first: [
      ['ENNO', 'Hello. I’m Enno, the mathematician. I calculated every gear on this planet for Lars. Exactly 4,096.'],
      ['ENNO', 'But Tandwieltron threw my clock on top of the gear stack over there. Without it I can’t time the gears. Chaos!'],
      ['ENNO', 'The steps crumble when you stand on them. I calculated 0.65 seconds. Be quick. Bring my clock back and my star shard is yours.'],
    ],
    progress: () => [['ENNO', 'My clock is on top of the gear stack. The steps crumble in 0.65 seconds. Be quick!']],
    done: [['ENNO', 'My clock! Tik, tak. Everything adds up again. You are my favourite number: one.'], ['ENNO', 'Here is a star shard. Probability that you deserve it: one hundred percent.']],
    after: [['ENNO', 'Fun fact: you jumped 412 times on this planet. I counted. Okay, I estimated.']],
    bubbles: { new: ['Hello.', 'π = 3.14…', '*calculates*'], progress: ['The gear stack!', 'Be quick.', '0.65 seconds!'], done: ['It adds up!', 'Thank you.', '*counts happily*'] },
  });
  [[-34, -82, 1.6], [-37, -86, 3.0], [-41, -89, 4.4], [-46, -94, 5.8]].forEach(([la, lo, h], i) => w.addPlatform(pl, { lat: la, lon: lo, r: i === 3 ? 1.5 : 1.0, h, float: i > 0, thick: 0.5, sides: 10, color: 0x8a6a2a, top: 0xffd23a, crumble: i === 1 || i === 2 }));
  setupLocal(w, ctx, {
    id: 'nathan2', name: 'Nathan', who: 'NATHAN', dir: LL(-30, 196), bubbleY: 2.0,
    model: buildNathan(),
    anim: (dt, t, n) => { n.model.arm.rotation.y = Math.sin(t * 2) * 0.4; n.model.head.rotation.y = Math.sin(t * 0.9) * 0.3; },
    task: { type: 'duel', game: 'dodge', time: 22, every: 0.85, fly: 0.9, color: 0xfff8ec, model: duelModels.ball, winTitle: 'DODGE MASTER!', found: 'You dodged every pitch! Come back, buddy!', lost: 'Strike! Got you, buddy! Talk to me for a rematch!' },
    first: [
      ['NATHAN', 'Rênas! Buddy! Lars and I built this whole place in a week. Okay, Lars built it. I held the flashlight.'],
      ['NATHAN', 'Now I’ve got my own pitching machine! It’s me. I’m the machine.'],
      ['RÊNAS', 'You want me to hit them?'],
      ['NATHAN', 'Nope! Dodge them! I throw, you dodge. The circle shows where each ball lands. Don’t get hit for twenty-two seconds!'],
      ['NATHAN', 'Survive my fastball and my star shard is yours.'],
    ],
    progress: () => [['NATHAN', 'Rematch? Batter up! Well. Dodger up!']],
    done: [['NATHAN', 'You dodged every single pitch! Lars is gonna flip when he hears this.'], ['NATHAN', 'Here’s the star shard. I found it in my glove. Lucky glove.']],
    after: [['NATHAN', 'Lars is my best friend. But don’t tell him I said that. …Actually, do tell him.']],
    bubbles: { new: ['Buddy!', 'Batter up!', '*winds up*'], progress: ['Rematch?', 'Dodger up!', 'Fastball!'], done: ['Home run!', 'Thanks, buddy!', '*swings happily*'] },
  });

  // ---------- decor: big gears, chimneys, crates, lamps ----------
  const spinners = [];
  [[14, 30, 1.6], [-10, 40, 1.2], [30, 80, 2.0], [-50, 30, 1.4], [50, -10, 1.8], [-10, 130, 1.4], [20, 175, 2.2], [-60, 160, 1.6], [10, 235, 1.8], [40, 265, 1.4], [-30, 290, 2.0], [60, 320, 1.6], [-36, 212, 2.4], [-44, 228, 2.0]].forEach(([la, lo, r], i) => {
    const holder = new THREE.Group(), gr = buildGear(r, i % 3 ? 0xc8a040 : 0xffd23a, 10, 0.35);
    gr.rotation.x = Math.PI / 2; gr.position.y = r + 0.1; holder.add(gr);
    w.put(pl, holder, LL(la, lo), 0, i * 0.8); w.addSolid(pl, LL(la, lo), Math.min(1.2, r * 0.5), r * 2);
    spinners.push([gr, (i % 2 ? 1 : -1) * (0.6 / r)]);
  });
  w.updaters.push((dt) => { for (const [gr, s] of spinners) gr.rotation.z += s * dt * 2; });
  for (let i = 0; i < 6; i++) {   // chimneys puffing steam
    const c = new THREE.Group();
    mk(new THREE.CylinderGeometry(0.5, 0.6, 4, 10), toon(0x6a4a3a), 0, 2, 0, c, 1.05);
    mk(new THREE.CylinderGeometry(0.6, 0.6, 0.3, 10), toon(0x3a2a24), 0, 4, 0, c, 1.05);
    const d = LL(-40 + (i * 37) % 90, 20 + i * 61);
    w.put(pl, c, d, 0); w.addSolid(pl, d, 0.6, 4);
    w.updaters.push((dt) => { if (Math.random() < dt * 3) puff(surf(pl, d, 4.4), 1, 0xe8e0d0, 1.5, 1.4, d); });
  }
  for (let i = 0; i < 12; i++) {   // crates
    const b = new THREE.Group();
    mk(new THREE.BoxGeometry(0.9, 0.9, 0.9), toon(0xa8743a), 0, 0.45, 0, b, 1.05);
    mk(new THREE.BoxGeometry(0.95, 0.12, 0.95), toon(0x6a4a2a), 0, 0.45, 0, b, 0);
    w.put(pl, b, LL(-55 + (i * 29) % 110, 15 + i * 41), 0, i);
  }
  [[16, -20], [-26, 160], [12, 290], [44, 200], [-50, 240]].forEach(([la, lo], i) => rock(w, pl, LL(la, lo), 0.9 + (i % 3) * 0.4, 0x6a5a44));
  [[-8, -8], [10, 6], [-6, 22]].forEach(([la, lo]) => lamp(w, pl, LL(la, lo), 0xffd23a, 2.8));
  sign(w, pl, LL(12, -6), textBoard('GOUDEN WERKPLAATS', 3.6, 0.9, '#2b1a0a', '#ffd23a'), 0.3, 2.6);
  sign(w, pl, LL(-12, 14), textBoard('EXPERTS ONLY!', 2.8, 0.7, '#ffd23a', '#2b1a0a'), -0.4, 1.8);

  // ---------- A: the Tandwieltoren (west): gear platforms that circle the tower ----------
  const T0 = LL(20, -45);
  {
    const tower = new THREE.Group();
    mk(new THREE.CylinderGeometry(1.4, 1.8, 10.4, 12), toon(0x6a5a44), 0, 5.2, 0, tower, 1.04);
    for (let k = 0; k < 4; k++) { const gr = buildGear(1.9, 0xc8a040, 12, 0.25); gr.position.y = 1.5 + k * 2.6; tower.add(gr); }
    w.put(pl, tower, T0, 0); w.addSolid(pl, T0, 1.7, 10.4);
  }
  const ring = [];
  for (let i = 0; i < 9; i++) ring.push(w.addPlatform(pl, { dir: frameDir(T0, 90 - 8, i * 40), r: 1.0, h: 1.0 + i * 1.15, float: true, thick: 0.3, sides: 10, color: 0x8a6a2a, top: 0xffd23a, orbit: [T0, 0.32] }));
  ring.forEach((pf, i) => { if (i < 8) coinOn(w, pf); });
  const towerTop = w.addPlatform(pl, { dir: T0, r: 2.0, h: 11.4, float: true, thick: 1.0, sides: 12, color: 0x5a4a3a, top: 0xffd23a });
  questItem(w, ctx, pl, towerTop.n, 12.3, 'blueprint1', buildBlueprint());
  w.addPlatform(pl, { dir: frameDir(T0, 90 - 6, 300), r: 0.9, h: 13.2, float: true, thick: 0.3, sides: 10, color: 0x8a6a2a, top: 0xffd23a, crumble: true });
  rareItem(w, ctx, pl, frameDir(T0, 90 - 6, 300), 14.2, 'werk-r1', 'Above the Tandwieltoren');

  // ---------- B: De Pers (south-east): pistons and crumbling plates over the molten-gold pit ----------
  const press = [[-13, 58, 1.4], [-15, 64, 2.4], [-18, 70, 3.4], [-21, 76, 4.4], [-24, 82, 5.4], [-27, 88, 6.4], [-30, 93, 7.4]];
  press.forEach(([la, lo, h], i) => {
    const piston = i % 2 === 0;
    const pf = w.addPlatform(pl, piston
      ? { lat: la, lon: lo, r: 1.0, h, sides: 8, color: 0x5a5a6a, top: 0xffd23a, bob: [0.9, 1.6, i * 1.3] }
      : { lat: la, lon: lo, hx: 0.9, hz: 0.9, h, float: true, thick: 0.3, color: 0x8a6a2a, top: 0xc8a040, crumble: true });
    if (i < 6) coinOn(w, pf);
  });
  const PR = LL(-33, 101);
  const pressTop = w.addPlatform(pl, { dir: PR, hx: 1.7, hz: 1.7, h: 8.6, color: 0x5a4a3a, top: 0xffd23a });
  questItem(w, ctx, pl, pressTop.n, 9.5, 'blueprint2', buildBlueprint());
  w.addPlatform(pl, { lat: -37, lon: 108, r: 0.9, h: 10.2, float: true, thick: 0.3, sides: 10, color: 0x8a6a2a, top: 0xffd23a, crumble: true });
  rareItem(w, ctx, pl, LL(-37, 108), 11.2, 'werk-r3', 'Over De Pers');

  // ---------- C: the crane (north): up the mast, then out along the swinging hooks ----------
  const TP = LL(48, 150);
  {
    const crane = new THREE.Group(), steel = toon(0xffb01a);
    mk(new THREE.BoxGeometry(1.2, 10.8, 1.2), steel, 0, 5.4, 0, crane, 1.04);
    for (let k = 0; k < 10; k++) mk(new THREE.BoxGeometry(1.3, 0.12, 1.3), toon(0x3a2a1a), 0, 0.6 + k * 1.05, 0, crane, 0);
    w.put(pl, crane, TP, 0); w.addSolid(pl, TP, 0.9, 10.8);
  }
  const mast = [];
  for (let i = 0; i < 8; i++) mast.push(w.addPlatform(pl, { dir: frameDir(TP, 90 - 5, i * 55), hx: 0.75, hz: 0.75, h: 1.0 + i * 1.2, float: true, thick: 0.3, color: 0x8a6a2a, top: 0xffb01a, crumble: i % 3 === 2 }));
  mast.forEach((pf, i) => { if (i < 7) coinOn(w, pf); });
  w.addPlatform(pl, { dir: TP, hx: 1.2, hz: 1.2, h: 11.4, float: true, thick: 0.6, color: 0x3a2a1a, top: 0xffb01a });
  for (let i = 0; i < 4; i++) w.addPlatform(pl, { dir: frameDir(TP, 90 - (5 + i * 5), 90), r: 0.8, h: 11.4, float: true, thick: 0.3, sides: 8, color: 0x5a5a6a, top: 0xffd23a, bob: [0.6, 1.5, i * 1.1] });
  questItem(w, ctx, pl, frameDir(TP, 90 - 20, 90), 12.8, 'blueprint3', buildBlueprint());

  // ---------- De Gouden Kluis: opens only for all 53 golden gears from the other planets ----------
  const VK = LL(10, 112);
  const vault = new THREE.Group();
  mk(new THREE.BoxGeometry(4, 4, 2), toon(0x6a5a44), 0, 2, 0, vault, 1.04);
  const door = new THREE.Group(); door.position.set(-1.2, 1.7, 1.02); vault.add(door);
  mk(new THREE.CylinderGeometry(1.2, 1.2, 0.2, 24), toon(0xffd23a), 1.2, 0, 0, door, 1.06).rotation.x = Math.PI / 2;
  const wheel = buildGear(0.45, 0x8a6a2a, 8, 0.1); wheel.rotation.x = Math.PI / 2; wheel.position.set(1.2, 0, 0.15); door.add(wheel);
  const vSign = textBoard('⚙️ 53', 1.6, 0.6, '#2b1a0a', '#ffd23a'); vSign.position.set(0, 4.4, 1.0); vault.add(vSign);
  const trophy = buildGear(0.6, 0xffd23a, 10, 0.2); trophy.rotation.x = Math.PI / 2; trophy.position.set(0, 1.7, 0.4); trophy.visible = false; vault.add(trophy);
  w.put(pl, vault, VK, 0, 0); w.addSolid(pl, VK, 2.0, 4);
  const gearsElsewhere = () => Object.keys(ctx.save.rares).filter((k) => !k.startsWith('werk')).length;
  let vOpen = !!ctx.save.trophy, vNag = 0;
  if (vOpen) { door.rotation.y = -1.6; trophy.visible = true; }
  w.updaters.push((dt, t) => {
    vNag -= dt; wheel.rotation.z += dt * (vOpen ? 0 : 0.5); if (trophy.visible) trophy.rotation.z += dt * 2;
    if (vOpen || P.planet !== pl || P.dead || G.cutscene || P.pos.distanceTo(surf(pl, VK, 1)) > 4.2) return;
    const n = gearsElsewhere();
    if (n >= 53) {
      vOpen = true; ctx.save.trophy = true; ctx.persist();
      door.rotation.y = -1.6; trophy.visible = true; sfx.win(); G.shake = 0.4;
      puff(surf(pl, VK, 2), 30, 0xffd23a, 5, 1.2, VK);
      banner('DE GOUDEN KLUIS!', 'Golden Rênas: you found every golden gear!', '#ffd23a');
    } else if (vNag <= 0) { vNag = 6; toast(`The Gouden Kluis needs all 53 golden gears from the other planets. You have ${n}.`, 3400); }
  });

  // ---------- Launch Star under the gear arch ----------
  const arch = new THREE.Group();
  for (const s of [-1, 1]) mk(new THREE.BoxGeometry(0.6, 3.6, 0.6), toon(0x6a5a44), 1.8 * s, 1.8, 0, arch, 1.05);
  const archGear = buildGear(1.4, 0xffd23a, 12, 0.3); archGear.rotation.x = Math.PI / 2; archGear.position.y = 4.0; arch.add(archGear);
  w.updaters.push((dt) => { archGear.rotation.z += dt * 0.6; });
  w.put(pl, arch, LL(-4, 254), 0);
  w.launchStar = w.addLaunchStar(pl, LL(-6, 244), { label: 'Launch to De Gouden Hal!', lockedText: 'Lars needs his 5 blueprints, and the Launch Star needs 3 star shards', use: () => ctx.toArena(w) });
  w.unlockLaunch = () => w.launchStar.setActive(true);
  if (ctx.ws(w).fstate === 'done') w.unlockLaunch();

  // ---------- secrets ----------
  w.addPlatform(pl, { lat: -82, lon: 0, r: 2, h: 1.2, float: true, color: 0x5a4a3a, top: 0xffd23a, bob: [0.5, 1, 0] });
  rareItem(w, ctx, pl, LL(-90, 0), 2.4, 'werk-r2', 'Under the Werkplaats');
  coinRing(w, pl, LL(-90, 0), 5, 8);
  coinRing(w, pl, LL(0, 0), 4.5, 8);
  coinLine(w, pl, LL(20, 190), LL(26, 240), 5);
  coinLine(w, pl, LL(-4, 30), LL(-10, 46), 4);

  // ---------- De Gouden Gang: the longest, hardest parkour in the game ----------
  const gate = new THREE.Group();
  mk(new THREE.BoxGeometry(2.4, 3.2, 0.6), toon(0x6a5a44), 0, 1.6, 0, gate, 1.04);
  mk(new THREE.BoxGeometry(1.2, 2.2, 0.1), basic(0x1a0e04), 0, 1.1, 0.31, gate, 0);
  const gSign = textBoard('GOUDEN GANG', 2.4, 0.6, '#2b1a0a', '#ffd23a'); gSign.position.set(0, 3.5, 0.35); gate.add(gSign);
  w.put(pl, gate, LL(-16, -26), 0, 0.5);
  addParkour(w, ctx, {
    home: pl, entryDir: LL(-16, -26), entryPrompt: '<kbd>E</kbd> enter the Gouden Gang', exitDir: LL(-11, -19), exitFwd: LL(0, 0),
    title: 'De Gouden Gang', sub: 'Experts only. Gear beacons are checkpoints.', voidText: 'Into the void! Back to the last gear beacon.',
    rareId: 'werk-r4', rareName: 'The end of the Gouden Gang', marker: () => buildBeacon(0x6a5a44, 0xffd23a),
    theme: {
      sky: 'radial-gradient(ellipse at 50% 40%,#4a2a0a 0%,#1e1004 55%,#060301 100%)',
      dome: [0x6a5a44, 0x4a4034, 0x2a2014, 0xffd23a], gems: [0xffd23a, 0xff8a1a, 0xc8c8d0], core: 0x2a1a0a, glow: 0xffd23a,
      plat: 0x8a6a2a, platTop: 0xffd23a, alt: 0x5a5a6a, crumble: 0xc8a040, bounce: 0xff8a1a, puff: 0xffd23a, cpTop: 0x5ef2e0, finTop: 0xffd23a, signFg: '#ffd23a', signBg: '#1e1004',
    },
    route: [['hop', 3], ['crumble', 3], ['zig', 3], ['cp'], ['bob', 3], ['circle', 3], ['crumble', 2], ['cp'], ['bounce'], ['zig', 3], ['gap'], ['crumble', 3], ['cp'], ['circle', 2], ['bob', 2], ['gap'], ['down', 2], ['hop', 2]],
  });

  // ---------- enemies: rolling gears and Kayo & Yara's cat robots ----------
  [[-50, 120], [10, 70], [20, 40], [-10, 170], [50, 290], [-30, 320], [34, -80], [0, 140]].forEach(([la, lo]) => w.addEnemy(pl, LL(la, lo), 'cog', { roam: 0.18 }));
  [[-20, 140], [30, 110], [40, 230], [-44, 50], [0, 300], [24, 200]].forEach(([la, lo]) => w.addEnemy(pl, LL(la, lo), 'kattenbot', { roam: 0.2 }));

  // ---------- more: blueprints 4 and 5, and Milo ----------
  addMore(w, ctx, pl, {
    item: () => buildBlueprint(), prefix: 'blueprint', color: 0x8a6a2a, top: 0xffd23a,
    local: {
      id: 'milo2', name: 'Milo', who: 'MILO',
      model: buildMilo(),
      anim: (dt, t, n) => { n.model.head.rotation.x = Math.sin(t * 6) * 0.12; },
      task: { type: 'fetch', model: buildTrinket('headphones'), banner: 'MILO’S HEADPHONES!', found: 'My headphones! Bring them back, I can’t hear the beat!' },
      first: [
        ['MILO', 'Yo, Rênas! Lars invited me to the party. I brought the music! …Well, I had music.'],
        ['MILO', 'A cat robot snatched my headphones and dropped them on the steps up north. Can you get them? The beat must go on!'],
      ],
      progress: () => [['MILO', 'My headphones are on the steps up north. No beat, no party!']],
      done: [['MILO', 'My headphones! The beat is back! *nods his head*'], ['MILO', 'Here, a star shard. It was bouncing to the bass.']],
      after: [['MILO', 'This planet goes so hard. Literally. Everything is made of metal.']],
      bubbles: { new: ['Yo!', 'No beat…', '*hums*'], progress: ['Up north!', 'No beat, no party!', 'Hurry!'], done: ['The beat is back!', 'Thanks, Rênas!', '*dances*'] },
    },
  });

  // ---------- boss ----------
  w.boss = new Tandwieltron(w, arena);
  w.hitLines = [['LARS', '(radio) BONK! Right in the hatch! Again, Binas!'], ['LARS', '(radio) He’s going faster now! More saws, more pistons! Keep going!']];
  w.winLines = [
    ['TANDWIELTRON', 'BZZT… SYSTEM… COOLING DOWN. Cats… no longer… in control. Hello. I am Tandwieltron. I like building things.'],
    ['TANDWIELTRON', 'Here. The Gouden Kern. For the little astronaut who jumped on my head five times. Ouch.'],
    ['LARS', '(radio) You did it, Binas! He’s back to normal! And look, Kayo and Yara are running away again!'],
    ['RATJETOE', 'Gouden Kern installed. Station speed: SUPER. Warning: Captain Rênas is now the coolest captain in the galaxy. *happy squeak*'],
    ['RÊNAS', 'Thanks, Lars! Thanks, Nathan! Best. Friends. Ever!'],
  ];
  return w;
}
