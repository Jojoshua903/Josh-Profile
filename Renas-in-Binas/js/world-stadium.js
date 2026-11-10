import { World, addStars, addBackdropPlanet, LL, frameDir, V3, toon, basic, mk, THREE, surf, G, P, sfx, coinRing, coinLine, coinOn, rock, sign, addRocket, questItem, rareItem, setupFriend, setupLocal, addMore } from './worlds-common.js?v=20261111l';
import { fbm } from './world.js?v=20261111l';
import { clamp, placeOn, orientOn, tangentTo, stepDir } from './core.js?v=20261111l';
import { hurtPlayer } from './player.js?v=20261111l';
import { buildNathan, buildBaseball, textBoard, buildLocal, buildTrinket, buildMustard } from './models.js?v=20261111l';
import { Zennith } from './bosses.js?v=20261111l';
import { addParkour, buildBeacon } from './parkour.js?v=20261111l';

// World 3: HOMERUN HEUVEL. Nathan's baseball planet. Boss: Zennith, the demon pitcher.
export function buildStadium(ctx) {
  const w = new World('nathan');
  Object.assign(w, {
    index: 2, title: 'Homerun Heuvel', sub: 'The whole planet is the outfield.', friendName: 'Nathan',
    arenaTitle: 'Het Helle Diamant', arenaSub: 'Zennith is warming up',
    sky: 'linear-gradient(180deg,#2a6ad0 0%,#5aa8f0 40%,#a8dcff 75%,#fff2c8 100%)',
    arenaSky: 'linear-gradient(180deg,#1a0a10 0%,#4a1420 45%,#a02a2a 80%,#ff8a3a 100%)',
    music: 'stadium', bossMusic: 'boss3', lights: [0xffffff, 0x4a7a4a],
    quest: { icon: '⚾', label: 'Lucky balls', got: 0, need: 3 },
  });
  w.quest.got = ctx.ws(w).items.length;
  addStars(w, 600);
  addBackdropPlanet(w, V3(200, 120, 60), 24, 0xfff8ec, 0xe03a3a);
  addBackdropPlanet(w, V3(-160, -80, -160), 16, 0x5cc85a);

  const g1 = new THREE.Color(0x5cc85a), g2 = new THREE.Color(0x4ab04a), dirt = new THREE.Color(0xd8a060), chalk = new THREE.Color(0xfff8ec);
  const pl = w.addPlanet({
    c: V3(0, 0, 0), r: 24, atmo: 0xffffff, atmoOp: 0.08,
    paint: (p, out) => {
      // mowing stripes everywhere, and a baseball diamond where you land
      const lon = Math.atan2(p.x, p.z);
      out.copy(Math.floor(lon * 12) & 1 ? g1 : g2);
      if (p.z > 0.9) {
        const x = p.x, y = p.y - 0.13, d = Math.abs(x) + Math.abs(y);
        if (d < 0.14 && d > 0.085) out.copy(dirt);
        if (Math.abs(d - 0.14) < 0.004) out.copy(chalk);
        if (Math.hypot(x, y) < 0.02) out.copy(dirt);
      }
      if (fbm(p, 3) > 0.78) out.lerp(new THREE.Color(0xffe27a), 0.5);   // dandelions
    },
  });
  w.main = pl;
  const lava = new THREE.Color(0xff5a2a), red = new THREE.Color(0x6a1a2a), red2 = new THREE.Color(0x4a1020);
  const arena = w.addPlanet({
    c: V3(0, 34, 118), r: 14, atmo: 0xff5a2a, atmoOp: 0.14,
    paint: (p, out) => { const n = fbm(p, 3); out.copy(Math.abs(n - 0.52) < 0.022 ? lava : n > 0.52 ? red : red2); },
  });
  w.arena = arena;
  w.spawn = { dir: LL(0, 0), fwd: V3(0, 1, 0) };
  w.arenaSpawn = { dir: arena.c.clone().negate().normalize(), fwd: V3(0, 1, 0) };
  addRocket(w, ctx, pl, LL(-4, -10));

  // ---------- Nathan at home plate ----------
  const nathan = buildNathan();
  const npc = w.addNPC(pl, nathan, LL(4, 9), { name: 'Nathan', bubbleY: 2.4, anim: (dt, t, n) => {
    n.model.arm.rotation.x = Math.sin(t * 1.3) * 0.2;
    const s = (t % 5.3) / 5.3;                        // every few seconds: a sneeze
    n.model.head.rotation.x = s > 0.9 ? -0.4 * Math.sin(((s - 0.9) / 0.1) * Math.PI) : 0;
    if (s > 0.98 && !n.sneezed) { n.sneezed = true; if (P.planet === pl && P.pos.distanceTo(n.g.position) < 12) sfx.sneeze(); }
    if (s < 0.5) n.sneezed = false;
  } });
  const plate = new THREE.Group();
  const shape = new THREE.Shape(); shape.moveTo(-0.5, 0.3); shape.lineTo(0.5, 0.3); shape.lineTo(0.5, -0.1); shape.lineTo(0, -0.5); shape.lineTo(-0.5, -0.1); shape.closePath();
  const pm = new THREE.Mesh(new THREE.ShapeGeometry(shape), basic(0xffffff)); pm.rotation.x = -Math.PI / 2; pm.position.y = 0.04; pm.scale.setScalar(1.6); plate.add(pm);
  w.put(pl, plate, LL(1, 4), 0);
  // the batting cage round it
  const cage = new THREE.Group();
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; mk(new THREE.CylinderGeometry(0.06, 0.06, 3.2, 6), toon(0x2b2440), Math.sin(a) * 2.6, 1.6, Math.cos(a) * 2.6, cage, 0); }
  const net = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.7, 3.2, 4, 1, true), basic(0x2b2440, { wireframe: true, transparent: true, opacity: 0.3 })); net.position.y = 1.6; net.rotation.y = Math.PI / 4; cage.add(net);
  w.put(pl, cage, LL(1, 4), 0);
  setupFriend(w, ctx, npc, {
    name: 'Nathan',
    first: [
      ['NATHAN', '*HATSJOE!* Sorry! Are you a cat? …No. A dog? You smell like a dog.'],
      ['RÊNAS', 'That’s Otis. He licked my helmet last week. He said it tastes like window.'],
      ['NATHAN', 'Otis! Josh’s dog! I love that dog. I’m allergic to that dog. *HATSJOE!*'],
      ['NATHAN', 'I’m Nathan. Best baseball player on the planet. Okay, it’s a small planet. But I also beat everyone on the big ones.'],
      ['RÊNAS', 'Lars says hi! He says you’re his best friend.'],
      ['NATHAN', 'LARS! My little buddy! He digs, I hit. Best team in the galaxy. Did he show you our secret handshake? No? Good. It’s secret.'],
      ['NATHAN', 'Last time Kayo & Yara came by, I sneezed so hard their saucer wobbled and they dropped everything they stole. Josh called it the bravest sneeze he’d ever seen.'],
      ['NATHAN', 'But this time they brought HIM. Zennith. The demon pitcher. My worst nightmare. He took your core as a trophy.'],
      ['NATHAN', 'His Kattenbots stole my three lucky baseballs, too. Get them back, then step on the plate in my batting cage.'],
      ['NATHAN', 'I’ll hit you somewhere you’ve never been.'],
      ['NATHAN', 'One is on top of the bleachers. One is out past the pitching machines, so jump the ground balls. And one… a golden Kattenbot ran off with it. It’s fast. Long jump after it! C + Space while running.'],
      ['NATHAN', 'Also! When Zennith flew in with your core, star shards rained on the field. Mies and batboy Tim each caught one.'],
      ['NATHAN', 'Home plate only launches with star shards. Help them out. They’re the best fans on the planet. Also the only fans. *HATSJOE!*'],
    ],
    progress: (got) => [['NATHAN', `Lucky balls: ${got}/5. The bleachers, the outfield past the machines, and that golden Kattenbot. *sniff*`]],
    needLocals: (left) => [['NATHAN', `All five lucky balls! But home plate still needs star shards. ${left.join(' and ')} still need${left.length === 1 ? 's' : ''} you. Look for the yellow “!”. *sniff*`]],
    done: [
      ['NATHAN', 'My lucky balls! Okay. Okay okay okay. Batting practice. Listen up.'],
      ['NATHAN', 'Zennith throws fastballs. White-hot ones: SWING at those. Spin with F right before it reaches you and send it back at him.'],
      ['NATHAN', 'Purple curveballs: never swing at purple. Dodge them. That’s just a life lesson.'],
      ['NATHAN', 'Golden ones you can hit too. Now step on home plate, and I’ll send you to him.'],
    ],
    after: [['NATHAN', 'White: swing. Purple: run. Gold: swing. Red circles: get out of there. Got it? Plate’s right here.']],
    bubbles: {
      new: ['*sniff* …cat?', 'Batter up!', '*HATSJOE*', 'See the blue gate? The Cloud Field. Don’t look down!'],
      progress: ['Kattenbots are fast. You’re faster.', 'Those machines throw grounders. Jump!', 'Practise your swing: F!', 'Try the Cloud Field! A golden gear waits at the end.'],
      done: ['Step on the plate!', 'White: swing. Purple: no.', 'You got this!'],
    },
  });
  w.unlockLaunch = () => { w.plateOn = true; };
  if (ctx.ws(w).fstate === 'done') w.unlockLaunch();
  w.addInteract({ planet: pl, pos: surf(pl, LL(1, 4), 0.4), radius: 1.6, cond: () => w.plateOn, prompt: () => '<kbd>E</kbd> batter up! (launch to Zennith)', use: () => ctx.toArena(w, { bat: npc }) });

  // ---------- the locals ----------
  setupLocal(w, ctx, {
    id: 'mies', name: 'Mies', who: 'MIES', dir: LL(-8, -16), bubbleY: 2.3,
    model: buildLocal({ s: 0.85, skin: 0xf0c8a0, shirt: 0xe03a3a, pants: 0xfff8ec, hat: 'chef', item: 'tray' }),
    anim: (dt, t, n) => { n.model.arms[1].rotation.x = -0.9 + Math.sin(t * 2) * 0.1; },
    task: { type: 'fetch', dir: LL(60, 128), alt: 6.5, model: buildMustard(), banner: 'GOLDEN MUSTARD!', found: 'MY MUSTARD! I can see it shine from here! Bring it back, sweetie!' },
    first: [
      ['MIES', 'Hot dogs! Hot dogs! …Oh, a little astronaut. You want one? I’ve got no mustard.'],
      ['MIES', 'Nathan sneezed SO hard last game that my golden mustard bottle shot into the sky. It landed on the high platform in the outfield.'],
      ['MIES', 'A hot dog without mustard is just a sad sausage. Bring it back and you get my star shard. Found it in the ketchup.'],
      ['RÊNAS', 'Why does everyone keep finding star shards?'],
      ['MIES', 'That core made a big mess when it flew past. Shards everywhere. Use the bounce pad to get up there. Now go!'],
    ],
    progress: () => [['MIES', 'My mustard is on the high outfield platform. Jump on the bounce pad! Hot dogs wait for no one. Well, they do. But they get cold.']],
    done: [
      ['MIES', 'MY MUSTARD! The sausages are saved!'],
      ['MIES', 'Here, one star shard. And a hot dog for later. Don’t give it to Otis. That dog once ate my whole stand.'],
    ],
    after: [['MIES', 'Extra mustard for heroes. Extra extra mustard for heroes who don’t sneeze.']],
    bubbles: { new: ['Hot dogs!', 'No mustard… sigh.', 'Psst, astronaut!'], progress: ['Use the bounce pad!', 'Sad sausages…', 'Mustard please!'], done: ['Hot dogs for everyone!', 'Mustard magic!', 'You’re a star!'] },
  });
  w.addPlatform(pl, { lat: 48, lon: 128, r: 1.4, h: 0.45, color: 0xe03a3a, top: 0xffd23a, bounce: 21, puff: 0xffd23a });
  w.addPlatform(pl, { lat: 60, lon: 128, r: 1.8, h: 5.4, float: true, thick: 0.6, color: 0xfff8ec, top: 0xe03a3a });
  setupLocal(w, ctx, {
    id: 'tim', name: 'Tim', who: 'TIM', dir: LL(14, 26), bubbleY: 1.9,
    model: buildLocal({ s: 0.66, skin: 0xc89a70, shirt: 0xfff8ec, pants: 0x2a4ae0, hair: 0x2a1a14, hat: 'cap', capC: 0x2a4ae0, item: 'bat' }),
    anim: (dt, t, n) => { const s = (t % 3) / 3; n.model.arms[1].rotation.x = s > 0.8 ? -2 + (s - 0.8) * 10 : -0.3; },
    task: { type: 'stomp', enemy: 'kattenbot', at: LL(-32, 30), n: 4, spread: 6, found: 'The dugout is clear! Rookie of the year! Come get your star shard!' },
    first: [
      ['TIM', 'Batboy Tim reporting! Are you the new rookie? Nathan said a rookie was coming.'],
      ['TIM', 'Kattenbots broke into our dugout and they’re playing with our bats. Four of them, past the giant baseball.'],
      ['TIM', 'I tried to scare them off. I meowed at them. They meowed back. It was a lot.'],
      ['TIM', 'Clear them out and I’ll give you my star shard. Nathan says home plate needs them.'],
    ],
    progress: (l) => [['TIM', `${l.left} Kattenbots left in the dugout, past the giant baseball! Jump on them, or spin with F!`]],
    done: [
      ['TIM', 'The dugout is ours again! Rookie of the year!'],
      ['TIM', 'Here’s your star shard. When you beat Zennith, can I have your autograph? And Josh’s? And Otis’ paw print?'],
    ],
    after: [['TIM', 'I’m practising my swing. *swish* …I hit myself.']],
    bubbles: { new: ['Rookie! Over here!', 'Batboy reporting!', 'Our dugout…'], progress: ['Past the giant baseball!', 'Meow back at them!', 'Four Kattenbots!'], done: ['Rookie of the year!', 'Go get Zennith!', '*practice swing*'] },
  });

  // ---------- decor: bleachers crowd, scoreboard, giant baseballs, foul poles ----------
  const crowdC = [0xff6aa8, 0x6ac8ff, 0x9aff6a, 0xb47aff, 0xffd04a, 0xff7a3d];
  const tiers = [];
  for (let i = 0; i < 4; i++) tiers.push(w.addPlatform(pl, { lat: 20 + i * 3.6, lon: -24, hx: 0.8, hz: 3.6, h: 1.2 * (i + 1), color: 0x3a5aa8, top: 0xfff8ec }));
  tiers.forEach((pf, i) => {
    for (let k = -2; k <= 2; k += 2) if ((i + k) % 3) { const fan = new THREE.Group(); mk(new THREE.SphereGeometry(0.35, 12, 10), toon(crowdC[(i * 3 + k + 6) % 6]), 0, 0.35, 0, fan, 1.1); mk(new THREE.SphereGeometry(0.06, 6, 4), basic(0x1a1030), 0.1, 0.45, 0.3, fan, 0); mk(new THREE.SphereGeometry(0.06, 6, 4), basic(0x1a1030), -0.1, 0.45, 0.3, fan, 0); fan.position.set(0.2, pf.h, k * 1.1); fan.rotation.y = -Math.PI / 2; const ph = Math.random() * 6; pf.mesh.add(fan); w.updaters.push((dt, t) => (fan.position.y = pf.h + Math.abs(Math.sin(t * 4 + ph)) * 0.15)); }
  });
  questItem(w, ctx, pl, tiers[3].n, 5.8, 'ball1', buildBaseball());
  const board = w.addPlatform(pl, { lat: 34, lon: -24, hx: 0.5, hz: 2.6, h: 6.2, color: 0x2b2440, top: 0xffd23a });
  const sb = textBoard('HOME 0 · CATS 3', 4.8, 1.6, '#1a1030', '#ffd23a'); sb.position.set(-0.53, 5.0, 0); sb.rotation.y = -Math.PI / 2; board.mesh.add(sb);
  rareItem(w, ctx, pl, board.n, 7.2, 'nathan-r1', 'On top of the scoreboard');
  for (const [la, lo] of [[-14, 30], [26, 60], [-30, 120]]) { const b = buildBaseball(1.6); w.put(pl, b, LL(la, lo), 1.4, Math.random() * 6); w.addSolid(pl, LL(la, lo), 1.6, 3); }
  for (const lo of [70, 130]) { const fp = new THREE.Group(); mk(new THREE.CylinderGeometry(0.2, 0.2, 9, 8), toon(0xffd23a), 0, 4.5, 0, fp, 1.1); w.put(pl, fp, LL(-6, lo), 0); w.addSolid(pl, LL(-6, lo), 0.25, 9); }
  [[12, -40], [-20, -30], [40, 30], [-44, 200], [30, 250], [-10, 300]].forEach(([la, lo], i) => rock(w, pl, LL(la, lo), 0.8 + (i % 2) * 0.4, 0x8a9a8a));
  sign(w, pl, LL(-10, 14), textBoard('HOMERUN HEUVEL', 3.4, 0.9, '#2a4ae0', '#fff8ec'), -0.3, 2.6);
  // hot dog stand
  const hd = new THREE.Group(); mk(new THREE.BoxGeometry(2.4, 1.2, 1.2), toon(0xe03a3a), 0, 0.6, 0, hd, 1.05); mk(new THREE.BoxGeometry(2.8, 0.15, 1.6), toon(0xfff8ec), 0, 2.3, 0, hd, 1.05);
  for (const s of [-1, 1]) mk(new THREE.CylinderGeometry(0.05, 0.05, 1.1), toon(0xfff8ec), 1.2 * s, 1.75, 0.6, hd, 0);
  const hdt = textBoard('HOT DOGS', 2.2, 0.5, '#ffd23a', '#e03a3a'); hdt.position.set(0, 2.6, 0); hd.add(hdt);
  w.put(pl, hd, LL(-12, -22), 0, 0.6); w.addSolid(pl, LL(-12, -22), 1.2, 1.2);

  // ---------- B: the outfield, with pitching machines ----------
  const machine = (dir) => {
    const g = new THREE.Group(); mk(new THREE.BoxGeometry(1.2, 1, 1.2), toon(0x9aa0b8), 0, 0.5, 0, g, 1.08);
    const barrel = mk(new THREE.CylinderGeometry(0.3, 0.35, 1, 12), toon(0x2b2440), 0, 1.3, 0.2, g, 1.08); barrel.rotation.x = 1.2;
    w.put(pl, g, dir, 0); w.addSolid(pl, dir, 0.8, 1.2);
    let t = Math.random() * 2;
    const balls = [];
    w.updaters.push((dt) => {
      // aim at you
      if (P.planet === pl) orientOn(g, dir, tangentTo(dir, P.up));
      t -= dt;
      const near = P.planet === pl && Math.acos(clamp(P.up.dot(dir), -1, 1)) * pl.r < 20 && !G.cutscene;
      if (t <= 0 && near) {
        t = 2.3;
        const m = buildBaseball(0.4); w.group.add(m); sfx.bat();
        balls.push({ m, d: stepDir(dir.clone(), tangentTo(dir, P.up), 1.2, pl.r), f: tangentTo(dir, P.up), life: 2.8 });
      }
      for (let i = balls.length - 1; i >= 0; i--) {
        const b = balls[i]; b.life -= dt;
        stepDir(b.d, b.f, 11 * dt, pl.r); b.f.addScaledVector(b.d, -b.f.dot(b.d)).normalize();
        placeOn(b.m, pl, b.d, 0.45); b.m.rotateX(b.life * 20);
        if (P.planet === pl && Math.acos(clamp(P.up.dot(b.d), -1, 1)) * pl.r < 0.7 && P.alt < 0.8) { hurtPlayer(surf(pl, b.d, 0)); b.life = 0; }
        if (b.life <= 0) { w.group.remove(b.m); balls.splice(i, 1); }
      }
    });
  };
  machine(LL(-14, 74)); machine(LL(-2, 96)); machine(LL(-26, 104));
  const f1 = w.addPlatform(pl, { lat: -20, lon: 90, r: 1.4, h: 2.4, float: true, color: 0xffd23a });
  const f2 = w.addPlatform(pl, { lat: -26, lon: 100, r: 1.3, h: 3.8, float: true, color: 0xfff8ec, crumble: true });
  const f3 = w.addPlatform(pl, { lat: -20, lon: 110, r: 1.5, h: 5.2, float: true, color: 0x2a4ae0, top: 0xfff8ec });
  [f1, f2].forEach((pf) => coinOn(w, pf));
  questItem(w, ctx, pl, f3.n, 6.3, 'ball2', buildBaseball());
  coinLine(w, pl, LL(-4, 40), LL(-14, 66), 6);

  // ---------- C: the golden Kattenbot runs off with ball 3 ----------
  if (!ctx.ws(w).items.includes('ball3')) {
    const gb = w.addEnemy(pl, LL(40, 160), 'goldbot', { roam: 0.7, drops: 3, onDie: (e) => { questItem(w, ctx, pl, e.dir.clone(), 0.9, 'ball3', buildBaseball()); } });
    const carried = buildBaseball(0.3); gb.m.ball.add(carried);
  }
  coinRing(w, pl, LL(40, 160), 6, 10);

  // ---------- secrets ----------
  w.addPlatform(pl, { lat: 60, lon: 0, r: 1.4, h: 0.5, color: 0x8a5a34, top: 0xd8985a, bounce: 21, puff: 0xffd23a });   // a giant glove
  const bal = w.addPlatform(pl, { lat: 72, lon: 0, r: 1.6, h: 6.0, float: true, color: 0xe03a3a, top: 0xfff8ec, bob: [0.4, 1, 0] });
  const balloon = new THREE.Group(); mk(new THREE.SphereGeometry(2.2, 18, 14), toon(0xe03a3a), 0, 0, 0, balloon, 1.04); w.put(pl, balloon, LL(72, 0), 11.5);
  rareItem(w, ctx, pl, bal.n, 7.1, 'nathan-r2', 'The hot-air balloon');
  const deep = w.addPlatform(pl, { lat: -70, lon: 200, r: 1.3, h: 2.6, float: true, color: 0x5cc85a, crumble: true });
  w.addPlatform(pl, { lat: -62, lon: 200, hx: 1.2, hz: 1.2, h: 1.4, color: 0xfff8ec });
  rareItem(w, ctx, pl, deep.n, 3.7, 'nathan-r3', 'Behind the outfield');
  coinRing(w, pl, LL(0, 0), 4.5, 8);
  coinLine(w, pl, LL(10, -10), LL(18, -22), 4);
  coinLine(w, pl, LL(-40, 180), LL(-60, 200), 5);

  // ---------- enemies: Kattenbots ----------
  [[10, 40], [-30, 60], [40, 110], [-20, 150], [20, 200], [-40, 250], [50, 300], [30, -60]].forEach(([la, lo]) => w.addEnemy(pl, LL(la, lo), 'kattenbot', { roam: 0.16 }));
  [[-50, 150], [60, 60], [0, 250], [-25, 320]].forEach(([la, lo]) => w.addEnemy(pl, LL(la, lo), 'kattenbot', { roam: 0.16 }));
  // Rolballen: runaway giant baseballs. They aim, then roll straight: sidestep, then stomp them while they're dizzy
  [[-40, 60], [30, 90], [-10, 200], [45, 280], [-55, 230]].forEach(([la, lo]) => w.addEnemy(pl, LL(la, lo), 'roller', { roam: 0.2 }));

  // ---------- Nathan's Cloud Field: a parkour over a bottomless void, through the stadium gate ----------
  const gate = new THREE.Group();
  for (const s of [-1, 1]) mk(new THREE.BoxGeometry(0.6, 3.0, 0.6), toon(0x2a4ae0), 1.5 * s, 1.5, 0, gate, 1.06);
  mk(new THREE.BoxGeometry(3.8, 0.5, 0.7), toon(0xfff8ec), 0, 3.1, 0, gate, 1.06);
  mk(new THREE.PlaneGeometry(2.4, 2.8), basic(0x0a1a3a), 0, 1.4, 0.02, gate, 0);
  const gateBall = buildBaseball(0.7); gateBall.position.set(0, 3.9, 0); gate.add(gateBall);
  const gateSign = textBoard('CLOUD FIELD', 2.8, 0.7, '#2a4ae0', '#fff8ec'); gateSign.position.set(0, 3.1, 0.38); gate.add(gateSign);
  w.put(pl, gate, LL(-4, -34), 0, 0.5);
  w.updaters.push((dt) => (gateBall.rotation.y += dt));
  addParkour(w, ctx, {
    home: pl, entryDir: LL(-4, -34), entryPrompt: '<kbd>E</kbd> enter Nathan’s Cloud Field', exitDir: LL(-3, -27), exitFwd: LL(0, 0),
    title: 'Nathan’s Cloud Field', sub: 'Mind the void. Flags are checkpoints.', voidText: 'Into the void! Back to the last flag.',
    rareId: 'nathan-r4', rareName: 'Home run over the Cloud Field', marker: () => buildBeacon(0xfff8ec, 0xe03a3a),
    theme: {
      sky: 'radial-gradient(ellipse at 50% 40%,#1a3a7a 0%,#0a1a44 55%,#030818 100%)',
      dome: [0x2a4a8a, 0x1a2e64, 0x0e1a40, 0xfff8ec], gems: [0xfff8ec, 0xffe27a, 0xa8dcff], gemShape: 'ball', core: 0x0a1a3a, glow: 0x5aa8f0,
      plat: 0xfff8ec, platTop: 0x5cc85a, alt: 0xa8dcff, crumble: 0xd8a060, bounce: 0x8a5a34, puff: 0xffd23a, cpTop: 0xd8a060, finTop: 0xffd23a, signFg: '#ffd23a', signBg: '#2a4ae0',
    },
    route: [['hop', 3], ['zig', 4], ['cp'], ['circle', 3], ['bounce'], ['down', 3], ['cp'], ['crumble', 4], ['gap'], ['bob', 3]],
  });

  // ---------- more: lucky balls 4 and 5, and Ash (Nathan's little brother, from joshibrahim.nl) ----------
  addMore(w, ctx, pl, {
    item: () => buildBaseball(), prefix: 'ball', color: 0xfff8ec, top: 0x5cc85a, runnerAt: LL(30, 300),
    friendLine: 'Oh, and two more balls went missing! A second golden Kattenbot ran off with one, and the last one is on top of the Zweeftoren, the sky tower. That makes five!',
    local: {
      id: 'kees', name: 'Ash', who: 'ASH',
      model: buildLocal({ s: 0.66, skin: 0xf0c8a0, shirt: 0x3c8dff, pants: 0xfff8ec, hair: 0x5a3416, hat: 'cap', capC: 0x3c8dff }),
      anim: (dt, t, n) => { n.model.arms[0].rotation.x = -1.5; n.model.head.rotation.y = Math.sin(t * 1.4) * 0.6; },
      task: { type: 'fetch', model: buildTrinket('stopwatch'), banner: 'ASH’S STOPWATCH!', found: 'You found it! Bring it back. I need to time my fastball!' },
      first: [
        ['ASH', 'Hi! I’m Ash, Nathan’s little brother. I’m a pitcher. My fastball is faster than a kart!'],
        ['ASH', 'But a Kattenbot kicked my stopwatch onto the high steps up north. Now I can’t time my fastball! Fetch it and I’ll give you my star shard.'],
      ],
      progress: () => [['ASH', 'My stopwatch is on the high steps up north. Go! I’m not timing you. …Okay, I am.']],
      done: [['ASH', 'My stopwatch! And look at that time. Even faster than my fastball!'], ['ASH', 'Here, a star shard. Don’t tell Nathan, he wanted it for his trophy shelf.']],
      after: [['ASH', 'One day I’ll strike out Nathan. One day!']],
      bubbles: { new: ['Hi!', 'My stopwatch…', '*tosses a ball*'], progress: ['Up north!', 'Hurry!', 'Faster!'], done: ['Record!', 'Thanks!', '*throws a fastball*'] },
    },
  });

  w.boss = new Zennith(w, arena);
  w.hitLines = [['NATHAN', 'HOME RUN! …*HATSJOE!* Sorry. Nervous sneeze.'], ['NATHAN', 'He’s mad now. Watch out, he hits them BACK. Keep swinging!']];
  w.winLines = [];   // the finale takes over from here
  void frameDir; void basic;
  return w;
}
