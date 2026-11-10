import { World, addStars, addBackdropPlanet, LL, frameDir, V3, toon, basic, mk, THREE, surf, coinRing, coinLine, coinOn, palm, lamp, sign, pulseSpeaker, addRocket, questItem, rareItem, setupFriend, setupLocal, slerpDir, addMore } from './worlds-common.js?v=20261111s';
import { fbm } from './world.js?v=20261111s';
import { buildMilo, buildBarrelBooth, buildVinyl, textBoard, buildLocal, buildTrinket, buildSneaker } from './models.js?v=20261111s';
import { Miauwtron } from './bosses.js?v=20261111s';
import { addParkour, buildBeacon } from './parkour.js?v=20261111s';

// World 1: PLANETA PHONK. Milo's neon party planet. Boss: DJ Miauwtron on the Bass Drop Moon.
export function buildPhonk(ctx) {
  const w = new World('milo');
  Object.assign(w, {
    index: 0, title: 'Planeta Phonk', sub: 'Bass so loud the moon moved.', friendName: 'Milo',
    arenaTitle: 'The Bass Drop Moon', arenaSub: 'DJ Miauwtron is on the decks',
    sky: 'linear-gradient(180deg,#2a0f4a 0%,#5a1f7a 38%,#c8408a 72%,#ffb06a 100%)',
    arenaSky: 'linear-gradient(180deg,#0e0620 0%,#2a0f4a 45%,#7a1f6a 80%,#ff5a8a 100%)',
    music: 'phonk', bossMusic: 'boss1', lights: [0xffd0f0, 0x5a2a7a],
    quest: { icon: '💿', label: 'Vinyls', got: 0, need: 3 },
  });
  w.quest.got = ctx.ws(w).items.length;
  addStars(w);
  addBackdropPlanet(w, V3(160, 90, -240), 22, 0xffb06a, 0xff5ab4);
  addBackdropPlanet(w, V3(-200, -60, 120), 14, 0x5ef2e0);
  addBackdropPlanet(w, V3(-120, 140, -300), 30, 0x8a3ad8, 0xffd23a);

  const pink = new THREE.Color(0xff5ab4), mid = new THREE.Color(0x9a3ad8), deep = new THREE.Color(0x6a2aa8), gold = new THREE.Color(0xffd23a), ink = new THREE.Color(0x3a1a5a);
  const pl = w.addPlanet({
    c: V3(0, 0, 0), r: 24, shape: 'plaat', atmo: 0xff5ab4, atmoOp: 0.1,
    paint: (p, out) => {
      if (p.z > 0.965) { // the checkered dance floor where you land
        const a = Math.floor(Math.atan2(p.x, p.z) * 40), b = Math.floor(Math.asin(p.y) * 40);
        out.copy((a + b) & 1 ? gold : ink); return;
      }
      const n = fbm(p, 2.4);
      out.copy(n > 0.62 ? pink : n > 0.47 ? mid : deep);
      if (Math.abs(Math.sin(p.y * 26)) < 0.05 && n > 0.4) out.lerp(new THREE.Color(0x5ef2e0), 0.6);
    },
  });
  w.main = pl;
  const grid = new THREE.Color(0x5ef2e0), dark = new THREE.Color(0x24103e);
  const arena = w.addPlanet({
    c: V3(0, 30, -120), r: 14, atmo: 0x5ef2e0, atmoOp: 0.14,
    paint: (p, out) => {
      const lat = Math.asin(p.y), lon = Math.atan2(p.x, p.z);
      const g = Math.abs(Math.sin(lat * 14)) < 0.06 || Math.abs(Math.sin(lon * 10)) < 0.05 * (1 / Math.max(0.2, Math.cos(lat)));
      out.copy(g ? grid : dark);
    },
  });
  w.arena = arena;
  w.spawn = { dir: LL(0, 0), fwd: V3(0, 1, 0) };
  w.arenaSpawn = { dir: arena.c.clone().negate().normalize(), fwd: V3(0, 1, 0) };
  addRocket(w, ctx, pl, LL(-4, -9));

  // ---------- Milo + his barrel booth ----------
  const milo = buildMilo();
  const npc = w.addNPC(pl, milo, LL(5, 12), { name: 'Milo', bubbleY: 2.4, anim: (dt, t, n) => {
    n.model.body.position.y = Math.abs(Math.sin(t * 4.67)) * 0.06;            // bopping on the beat
    n.model.arms[1].rotation.x = -1.2 + Math.sin(t * 9.3) * 0.25; n.model.arms[0].rotation.z = -0.3;
    n.model.head.rotation.x = Math.sin(t * 9.3) * 0.08;
  } });
  const booth = buildBarrelBooth();
  w.put(pl, booth.g, LL(8, 16), 0, -0.6);
  w.addSolid(pl, LL(8, 16), 0.7, 1.2);
  w.updaters.push((dt) => booth.decks.forEach((d) => (d.rotation.y += dt * 5)));
  setupFriend(w, ctx, npc, {
    name: 'Milo',
    first: [
      ['MILO', '¡Ey, ey, EY! Is that… Rênas? Josh’s little brother? Same hair. Same chaos.'],
      ['RÊNAS', 'Milo? From the Mistmaan? The guy who lived in a barrel?'],
      ['MILO', 'FORMER guy in a barrel. When Josh brought the light back, I came out. Now the barrel is my DJ booth. Glow-up.'],
      ['MILO', 'Look at the fit. Puffer jacket, gold chain, sunglasses at night. Some things don’t change.'],
      ['MILO', 'I make phonk edits now. My biggest one? “Josh vs. the Lichtvreter (slowed + reverb)”. Two million views. On the Mistmaan. Population: me.'],
      ['RÊNAS', 'Did a giant glowing core land here? Kayo and Yara threw it.'],
      ['MILO', 'Those cats. They landed here, stole my three vinyls, my unreleased tracks, and built DJ Miauwtron. It only plays cat sounds.'],
      ['MILO', 'MIAUW. MIAUW. At 140 BPM. It’s horrible. …Okay, the beat is kind of hard. But horrible.'],
      ['MILO', 'Your core is powering it now. Get my three vinyls back and I’ll wake up the Launch Star. Then we drop the bass on that thing.'],
      ['MILO', 'One is on top of the Speaker Stairs. One is up on the Disco Pole, at the top of the planet. One is in Graffiti Alley on the far side. The speakers there kick, so jump the rings.'],
      ['MILO', 'And one more thing. When that core crashed in, it cracked into star shards. My cousin Rosa and little Tito each found one.'],
      ['MILO', 'A Launch Star only flies on star shards. So help them out too. They’re good people. Tito is a little loud. I respect it.'],
    ],
    progress: (got) => [['MILO', `Vinyls: ${got}/5. Speaker Stairs, the Disco Pole up top, and Graffiti Alley on the far side. Phonk waits for no one.`]],
    needLocals: (left) => [['MILO', `All five vinyls, ¡qué bueno! But the Launch Star still needs its star shards. Go help ${left.join(' and ')}. Look for the yellow “!”.`]],
    done: [
      ['MILO', 'MY VINYLS! ¡Qué locura! You did it, hermanito!'],
      ['MILO', 'The Launch Star is awake. Far side, past Graffiti Alley. It shoots you straight to the Bass Drop Moon.'],
      ['MILO', 'Pro tip from a professional: after a few drops, Miauwtron overheats and the Drop Button on top opens. Jump up there and GROUND POUND it. Shift in the air.'],
      ['MILO', 'And jump the bass rings. Don’t try to outrun them. Nobody outruns bass.'],
    ],
    after: [['MILO', 'Bass rings: jump. Cowbells: look at the shadows. Drop Button: ground pound. That’s the whole music industry, honestly.']],
    bubbles: {
      new: ['¡Ey! Over here!', 'Nice helmet. Very astronaut.', 'This beat? Mine.', 'Psst. Behind the neon door: my Bass Tunnel. Don’t fall!'],
      progress: ['My vinyls… my babies…', 'Phonk waits for no one.', 'If you see a cat, it’s not me.', 'Try the Bass Tunnel! There’s a golden gear at the end.'],
      done: ['Go get that core!', 'Ground pound the Drop Button!', 'I’m recording this.'],
    },
  });

  // ---------- the locals ----------
  const neon3 = [0x5ef2e0, 0xffd23a, 0xff5ab4];
  setupLocal(w, ctx, {
    id: 'rosa', name: 'Rosa', who: 'ROSA', dir: LL(-8, 36), bubbleY: 2.0,
    model: buildLocal({ skin: 0xd8a070, shirt: 0x5ef2e0, pants: 0x2b2440, hair: 0x2a1a14, hat: 'bun', item: 'spray', shoes: 0xff5ab4 }),
    anim: (dt, t, n) => { n.model.arms[1].rotation.x = -1.3 + Math.sin(t * 7) * 0.15; n.model.arms[1].rotation.z = Math.sin(t * 3) * 0.3; },
    task: { type: 'duel', game: 'simon', rounds: [3, 4, 5], speed: 1.0, colors: [0xff5ab4, 0xffd23a, 0x5ef2e0, 0x9a7aff], names: ['PINK!', 'YELLOW!', 'BLUE!', 'PURPLE!'], winTitle: 'DANCE-OFF WON!', found: '¡Eso! You copied every step! Come get your star shard!', lost: 'Wrong step, astronaut! Talk to me for a rematch. I’ll go slower. …No I won’t.' },
    first: [
      ['ROSA', '¡Oye! Careful, the paint is still wet. I’m Rosa, Milo’s cousin. I paint everything he raps about.'],
      ['ROSA', 'Milo says you’ve got moves. Milo says a LOT of things.'],
      ['RÊNAS', 'I do have moves. I can ground pound.'],
      ['ROSA', 'That’s not dancing, that’s falling with style. Let’s see. DANCE-OFF!'],
      ['ROSA', 'Look at my four paint tiles: pink, yellow, blue and purple. I dance from tile to tile and each one lights up. When it’s your turn, press the same colour buttons in the same order.'],
      ['ROSA', 'First three steps, then four, then five. One wrong tile and you lose. Win, and the star shard from my paint bucket is yours.'],
    ],
    progress: () => [['ROSA', 'Rematch? Okay. Watch my feet, not my face. My face is distracting. ¡Vamos!']],
    done: [
      ['ROSA', '¡No puede ser! You copied every step! Milo was right. Don’t tell him.'],
      ['ROSA', 'Here, one star shard. Still a bit sticky. I’m painting you next: “RÊNAS, DANCE MACHINE”.'],
    ],
    after: [['ROSA', 'Hold still. …No, keep dancing. I’ll paint you dancing.']],
    bubbles: { new: ['Psst! Got moves?', 'Wet paint!', 'Dance-off?'], progress: ['Rematch?', 'Watch my feet!', '¡Vamos!'], done: ['¡Gracias, artista!', 'Dance machine!', 'Next mural: you.'] },
  });
  const tw = [[24, 62, 1.8], [30, 70, 3.4], [36, 78, 5.0]].map(([la, lo, h], i) => w.addPlatform(pl, { lat: la, lon: lo, r: 1.3, h, float: i > 0, color: 0x2b2440, top: neon3[i], bob: i === 1 ? [0.35, 1.6, 0] : undefined }));
  coinOn(w, tw[0]); coinOn(w, tw[1]);
  setupLocal(w, ctx, {
    id: 'tito', name: 'Tito', who: 'TITO', dir: LL(16, 24), bubbleY: 1.8,
    model: buildLocal({ s: 0.62, skin: 0xe0b08a, shirt: 0xffd23a, pants: 0x9a3ad8, hair: 0x2a1a14, hat: 'cap', capC: 0xff3d7f }),
    anim: (dt, t, n) => { n.model.r.position.y = Math.abs(Math.sin(t * 4.67)) * 0.08; n.model.legs[0].rotation.x = -0.5; },
    task: { type: 'fetch', dir: tw[2].n, alt: tw[2].h + 1.1, model: buildSneaker(), banner: 'GOLD SNEAKER!', found: 'MY SNEAKER! You got it! Bring it down here!' },
    first: [
      ['TITO', 'Are you famous? You look famous. I’m Tito. I’m Milo’s biggest fan. I have all of his edits. Both of them.'],
      ['TITO', 'I was copying his dance moves and my gold sneaker flew off. All the way up the speaker tower!'],
      ['TITO', 'Milo says a real fit is never missing a shoe. Can you get it? I found a shiny star shard, you can have it.'],
      ['RÊNAS', 'A whole tower? For one sneaker?'],
      ['TITO', 'It’s a GOLD sneaker.'],
    ],
    progress: () => [['TITO', 'My sneaker is on top of the speaker tower. Climb up! I’m standing on one foot until you’re back.']],
    done: [
      ['TITO', 'MY SNEAKER! I’m 100% drip again.'],
      ['TITO', 'Here, the star shard. Tell Milo his last edit was fire. Both of them.'],
    ],
    after: [['TITO', 'Watch this. *does the worm* …I’m okay.']],
    bubbles: { new: ['Hey! Hey you!', 'Have you seen a sneaker?', '*hops on one foot*'], progress: ['The speaker tower!', 'One-shoe life…', 'Hurry, my foot is cold.'], done: ['Drip restored!', 'Milo is my hero.', 'You’re hero number 2.'] },
  });

  // ---------- decor ----------
  const neon = [0x5ef2e0, 0xffd23a, 0xff5ab4];
  [[12, -30], [-14, 30], [26, 40], [-30, -40], [40, -80], [-20, 100], [30, 130], [-50, 160], [10, 230], [-10, 280], [50, 300], [-40, 320], [-60, 60], [60, 200]].forEach(([la, lo], i) => palm(w, pl, LL(la, lo), 0x3a1a5a, 0xff5ab4, 5 + (i % 3), neon[i % 3]));
  [[-6, 22], [6, -22], [-12, -6], [14, 4]].forEach(([la, lo], i) => lamp(w, pl, LL(la, lo), neon[i % 3], 3.2));
  sign(w, pl, LL(12, -6), textBoard('PLANETA PHONK', 3.4, 0.9, '#ff5ab4', '#2b2440'), 0.3, 2.6);
  sign(w, pl, LL(-12, 14), textBoard('MILO EDITS ▸', 2.6, 0.7, '#fff8ec', '#ff3d7f'), -0.4, 1.8);
  // floating music notes in the sky
  for (let i = 0; i < 10; i++) {
    const n = new THREE.Group();
    mk(new THREE.SphereGeometry(0.45, 10, 8), toon(neon[i % 3]), 0, 0, 0, n, 1.1).scale.set(1.2, 0.9, 0.7);
    mk(new THREE.BoxGeometry(0.12, 1.6, 0.12), toon(neon[i % 3]), 0.45, 0.8, 0, n, 1.15);
    w.put(pl, n, LL(-60 + i * 13, i * 37), 9 + (i % 3) * 2, i);
  }

  // ---------- A: the Speaker Stairs (north-west) ----------
  const spk = (dir, h, bob) => {
    const pf = w.addPlatform(pl, { dir, hx: 1.4, hz: 1.4, h, color: 0x2b2440, top: 0xff5ab4, bob });
    for (const [x, y] of [[0, h * 0.35], [0, h * 0.72]]) { const cone = mk(new THREE.CylinderGeometry(0.6, 0.7, 0.1, 18), toon(0x5ef2e0), x, y, 1.42, pf.mesh, 0); cone.rotation.x = Math.PI / 2; cone.position.y = y - 1.2 * 0 + 0; }
    return pf;
  };
  const stairs = [[16, -10, 1.6], [22, -16, 3.0], [28, -22, 4.4], [34, -28, 5.8]].map(([la, lo, h], i) => spk(LL(la, lo), h, i % 2 ? [0.45, 2.93, 0] : [0.45, 2.93, Math.PI]));
  stairs.slice(0, 3).forEach((pf) => coinOn(w, pf));
  questItem(w, ctx, pl, stairs[3].n, 6.9, 'vinyl1', buildVinyl());
  coinLine(w, pl, LL(4, -2), LL(13, -8), 4);

  // ---------- B: the Disco Pole (top of the planet) ----------
  w.addPlatform(pl, { lat: 64, lon: 0, r: 1.3, h: 0.45, color: 0xff3d7f, top: 0xffd23a, bounce: 21, puff: 0xffd23a });
  for (let i = 0; i < 3; i++) w.addPlatform(pl, { lat: 78, lon: i * 120, r: 1.6, h: 3.6, float: true, thick: 0.6, color: 0x5ef2e0, top: 0xfff8ec, orbit: [V3(0, 1, 0), 0.4] });
  const pole = w.addPlatform(pl, { lat: 90, lon: 0, r: 2.2, h: 5.6, float: true, thick: 0.8, color: 0x9a3ad8, top: 0xffd23a });
  const ball = new THREE.Group();
  const db = mk(new THREE.IcosahedronGeometry(1.1, 1), toon(0xd8e0f0), 0, 0, 0, ball, 1.06); void db;
  mk(new THREE.CylinderGeometry(0.03, 0.03, 4), toon(0x2b2440), 0, 2.4, 0, ball, 0);
  w.put(pl, ball, LL(90, 0), 10.5);
  w.updaters.push((dt) => (ball.children[0].rotation.y += dt));
  questItem(w, ctx, pl, pole.n, 6.7, 'vinyl2', buildVinyl());
  rareItem(w, ctx, pl, LL(84, 180), 7.4, 'milo-r1', 'Above the Disco Pole');
  coinRing(w, pl, LL(78, 0), 0.01, 1);
  coinLine(w, pl, LL(40, 0), LL(60, 0), 5);

  // ---------- C: Graffiti Alley (far side) ----------
  const a0 = w.addPlatform(pl, { lat: -6, lon: 150, hx: 1.5, hz: 1.5, h: 1.8, color: 0x2b2440, top: 0x5ef2e0 });
  const c1 = w.addPlatform(pl, { lat: -6, lon: 160, r: 1.3, h: 3.2, float: true, color: 0xffd23a, crumble: true });
  const c2 = w.addPlatform(pl, { lat: -2, lon: 169, r: 1.3, h: 4.4, float: true, color: 0xffd23a, crumble: true });
  const tall = w.addPlatform(pl, { lat: 2, lon: 178, hx: 1.6, hz: 1.6, h: 5.6, color: 0x2b2440, top: 0xff5ab4 });
  [a0, c1, c2].forEach((pf) => coinOn(w, pf));
  questItem(w, ctx, pl, tall.n, 6.7, 'vinyl3', buildVinyl());
  for (const [la, lo, txt, col] of [[-14, 140, 'BASS', '#5ef2e0'], [8, 150, 'MIAUW?!', '#ff5ab4'], [-16, 175, 'PHONK', '#ffd23a']]) {
    const pf = w.addPlatform(pl, { lat: la, lon: lo, hx: 2.4, hz: 0.4, h: 2.4, color: 0x3a1a5a, yaw: 0.2 });
    const b = textBoard(txt, 4.4, 2, '#2b2440', col); b.position.set(0, 1.25, 0.42); pf.mesh.add(b);
    const b2 = b.clone(); b2.position.z = -0.42; b2.rotation.y = Math.PI; pf.mesh.add(b2);
  }
  pulseSpeaker(w, pl, LL(-14, 160), { every: 3.0 });
  pulseSpeaker(w, pl, LL(-12, 186), { every: 3.4, offset: 1.5 });
  for (const d of [LL(-14, 160), LL(-12, 186)]) { const s = new THREE.Group(); mk(new THREE.BoxGeometry(1.6, 1.8, 1.6), toon(0x2b2440), 0, 0.9, 0, s, 1.05); mk(new THREE.CylinderGeometry(0.6, 0.6, 0.1, 18), toon(0xff3d7f), 0, 1.85, 0, s, 0); w.put(pl, s, d, 0); w.addSolid(pl, d, 1.0, 1.8); }

  // ---------- Launch Star ----------
  w.launchStar = w.addLaunchStar(pl, LL(-8, 196), { label: 'Launch to the Bass Drop Moon!', lockedText: 'Milo needs his 5 vinyls, and the Launch Star needs 3 star shards', use: () => ctx.toArena(w) });
  w.unlockLaunch = () => w.launchStar.setActive(true);
  if (ctx.ws(w).fstate === 'done') w.unlockLaunch();

  // ---------- secrets ----------
  const sp1 = w.addPlatform(pl, { lat: 14, lon: 48, hx: 1.2, hz: 1.2, h: 2.4, color: 0x2b2440, top: 0x5ef2e0 });
  const fl = w.addPlatform(pl, { lat: 14, lon: 62, r: 1.3, h: 2.6, float: true, color: 0xff5ab4, bob: [0.3, 1.5, 0] });
  void sp1;
  rareItem(w, ctx, pl, fl.n, 3.7, 'milo-r2', 'Long jump to the floating speaker');
  w.addPlatform(pl, { lat: -82, lon: 0, r: 2, h: 1.2, float: true, color: 0x5ef2e0, bob: [0.5, 1, 0] });
  rareItem(w, ctx, pl, LL(-90, 0), 2.4, 'milo-r3', 'The bottom of the planet');
  coinRing(w, pl, LL(-90, 0), 5, 8);
  coinRing(w, pl, LL(0, 0), 4.5, 8);
  coinLine(w, pl, LL(-20, 60), LL(-20, 120), 6);
  coinLine(w, pl, LL(30, 200), LL(30, 260), 5);

  // ---------- enemies: Beatbugs that hop to the beat ----------
  [[-20, 170], [-24, 150], [-2, 140], [20, 80], [-30, 40], [40, 250], [-40, 270], [30, -60]].forEach(([la, lo]) => w.addEnemy(pl, LL(la, lo), 'beatbug', { roam: 0.15 }));
  [[60, 40], [-55, 100], [0, 320], [-20, 230], [50, 200]].forEach(([la, lo]) => w.addEnemy(pl, LL(la, lo), 'beatbug', { roam: 0.15 }));
  // Bassbollen: little speakers that hop at you on the beat. Jump on them between hops
  [[-10, 60], [30, 110], [-40, 200], [10, 260], [50, 140], [-60, -40]].forEach(([la, lo]) => w.addEnemy(pl, LL(la, lo), 'bassbol', { roam: 0.12 }));

  // ---------- Milo's Bass Tunnel: a parkour over a bottomless void, behind the neon club door ----------
  const door = new THREE.Group();
  for (const s of [-1, 1]) {
    mk(new THREE.BoxGeometry(0.9, 2.8, 0.9), toon(0x2b2440), 1.6 * s, 1.4, 0, door, 1.06);
    for (const y of [0.8, 2.0]) { const cone = mk(new THREE.CylinderGeometry(0.32, 0.36, 0.08, 16), toon(0x5ef2e0), 1.6 * s, y, 0.46, door, 0); cone.rotation.x = Math.PI / 2; }
  }
  mk(new THREE.BoxGeometry(4.1, 0.4, 0.9), toon(0x2b2440), 0, 3.0, 0, door, 1.06);
  mk(new THREE.PlaneGeometry(2.3, 2.6), basic(0x0e0620), 0, 1.3, 0.02, door, 0);
  mk(new THREE.BoxGeometry(2.5, 0.12, 0.12), basic(0xff5ab4), 0, 2.66, 0.1, door, 0);
  const clubSign = textBoard('BASS TUNNEL', 2.8, 0.7, '#ff5ab4', '#2b2440'); clubSign.position.set(0, 3.6, 0.3); door.add(clubSign);
  w.put(pl, door, LL(-16, -24), 0, 0.6);
  addParkour(w, ctx, {
    home: pl, entryDir: LL(-16, -24), entryPrompt: '<kbd>E</kbd> enter Milo’s Bass Tunnel', exitDir: LL(-11, -17), exitFwd: LL(0, 0),
    title: 'Milo’s Bass Tunnel', sub: 'Mind the void. Speakers are checkpoints.', voidText: 'Into the void! Back to the last speaker.',
    rareId: 'milo-r4', rareName: 'The end of the Bass Tunnel', marker: () => buildBeacon(0x2b2440, 0xff5ab4),
    theme: {
      sky: 'radial-gradient(ellipse at 50% 40%,#3a0f5a 0%,#1a0630 55%,#06020e 100%)',
      dome: [0x3a1a5a, 0x24103e, 0x140828, 0xff5ab4], gems: [0x5ef2e0, 0xff5ab4, 0xffd23a], gemShape: 'ball', core: 0x2a0f4a, glow: 0xff5ab4, pulse: 4.67,
      plat: 0x2b2440, platTop: 0xff5ab4, alt: 0x3a1a5a, crumble: 0xffd23a, bounce: 0x5ef2e0, puff: 0xff5ab4, cpTop: 0x5ef2e0, finTop: 0xffd23a, signFg: '#ff5ab4',
    },
    route: [['hop', 3], ['circle', 3], ['bob', 4], ['cp'], ['crumble', 4], ['zig', 3], ['cp'], ['bounce'], ['down', 3], ['gap']],
  });

  // ---------- boss ----------
  // ---------- more: vinyls 4 and 5, and Luna ----------
  addMore(w, ctx, pl, {
    item: () => buildVinyl(), prefix: 'vinyl', color: 0x2b2440, top: 0xff5ab4,
    local: {
      id: 'luna', name: 'Luna', who: 'LUNA',
      model: buildLocal({ s: 0.74, skin: 0xc8946a, shirt: 0xff5ab4, pants: 0x2b2440, hair: 0x1a1020, hat: 'cap', capC: 0x5ef2e0 }),
      anim: (dt, t, n) => { n.model.head.rotation.x = Math.abs(Math.sin(t * 4.6)) * 0.2; },
      task: { type: 'fetch', model: buildTrinket('headphones'), banner: 'LUNA’S HEADPHONES!', found: 'My headphones! Bring them back, I need to hear the drop!' },
      first: [
        ['LUNA', 'Yo! I’m Luna. I make the beats Milo dances to. Well, I did. Until a beatbug knocked my headphones off.'],
        ['LUNA', 'They flew all the way up onto the steps up north. Get them back and my star shard is yours.'],
      ],
      progress: () => [['LUNA', 'My headphones are on the steps up north. Go go go!']],
      done: [['LUNA', 'My headphones! The bass is back in my ears!'], ['LUNA', 'Here, a star shard. It fell out of the sky during the drop. Keep it.']],
      after: [['LUNA', 'Boom-tss, boom-tss. That one’s for you.']],
      bubbles: { new: ['Yo!', 'My headphones…', 'No beats…'], progress: ['Up north!', 'The steps!', 'Hurry!'], done: ['Boom-tss!', 'Thanks!', '*nods to the beat*'] },
    },
  });

  w.boss = new Miauwtron(w, arena);
  w.hitLines = [['MILO', '¡ESO! That’s going in the edit!'], ['MILO', 'Slow-motion replay! Reverb on it! ONE MORE!']];
  w.winLines = [
    ['MILO', '(radio) “Rênas vs. Miauwtron (phonk remix)”. Uploading… You’re famous now. On the Mistmaan.'],
    ['RENAS-1', 'Energiekern 1 of 3 secured. Next signal: De Diepe Mijn.'],
    ['RÊNAS', 'The mine? That’s where Lars lives. Josh’s best friend!'],
  ];
  void slerpDir; void frameDir; void surf; void basic;
  return w;
}
