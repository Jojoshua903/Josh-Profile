'use strict';
/* =========================================================
   ACT III STORY · the Gilded Stadium, Adam's assist, Evil Adam,
   Ending A ("Game, Set, Match"), the vortex into the Zennith Core,
   and Ending B ("Extra Innings"). Extends zone/story.js.
   ========================================================= */
Object.assign(Story.tagColors, { ZENNITH: '#2a1238', NATHAN: '#e8361c' });
// full-screen ending scenes (the neighborhood, the credits, the post-credits)
const Scene = { on: null, t: 0, mode: 'A', lie: 1, white: 0, ballT: -1, scroll: 0 };
const CREDITS = [
  ['EXTRA INNINGS', ''], ['an Ibrahim Interactive production', ''], ['', ''],
  ['CREATED, WRITTEN & BUILT BY', 'Ibrahim Interactive'], ['', ''],
  ['GAME DIRECTOR', 'You'], ['LEAD HERO', 'Nathan "MVP" — #7'], ['THE RIVAL', 'Adam'], ['THE VILLAIN', 'Evil Adam (it\'s complicated)'],
  ['ENGINEERING (SPITE)', 'Josh'], ['LOGISTICS & SCOOTERS', 'Renas'], ['CARTOGRAPHY', 'Reshman (…blorp)'], ['METALLURGY & CATS', 'Lars, Pebble & Grit'],
  ['PYROTECHNICS', 'Daniel (unlicensed)'], ['GEOLOGY', 'Fionn & every named rock'], ['WEATHER', 'Milo'], ['CLIMATE CONTROL', 'Deniz'], ['COACHING (LOUDLY)', 'Coach Monfort'], ['OFFICIATING', 'The Umpire'],
  ['', ''], ['SPECIAL THANKS', 'The Spare Bat'], ['', ''], ['THANKS FOR PLAYING', ''],
];
const scr = (x, y) => ({ x: Game.cam.x + x, y: Game.cam.y + y });
// who's standing in the neighborhood field at the end, left to right (offset in scaled px)
function fieldCrew() {
  const D = Save.data, L = [];
  if (D.lars) L.push(['lars', -250, { cats: true }]);
  if (D.fionnDead) L.push(['fionn', -196, {}]);
  if (D.josh) L.push(['josh', -146, {}]);
  if (D.chase) L.push(['renas', -96, { moving: false }]);
  L.push(['adam', -42, {}], ['nathan', 0, {}]);
  if (D.danielDead) L.push(['daniel', 56, { rocket: false }]);
  if (D.miloDead) L.push(['milo', 108, {}]);
  if (D.denizDead) L.push(['deniz', 160, {}]);
  if (D.reshman) L.push(['reshman', 290, {}]);
  return L;
}
const FIELD_S = 1.6, fieldY = () => VH * 0.8;
function fieldHead(kind) {
  const m = fieldCrew().find(c => c[0] === kind); if (!m) return scr(VW / 2, fieldY() - 120);
  return scr(VW / 2 + m[1] * FIELD_S, fieldY() - ((HEADS[kind] || 60) + 10) * FIELD_S * (1 - Scene.lie * 0.6));
}

Object.assign(Story, {
  /* ---------- arriving at the peak ---------- */
  stadiumArrive() {
    return this.run(async () => {
      const nh = () => this.nathanHead();
      this.zoom = 1.35; this.zoomTo(1.3);
      await this.wait(0.5);
      await this.say('NATHAN', 'Whoa. Okay. That is a LOT of gold.', nh);
      this.zoomTo(1.0); this.camTarget = { x: 44 * TILE, y: 33 * TILE };
      for (let k = 0; k < 50; k++) spawnParticle({ x: 44 * TILE + rand(-VW / 2, VW / 2), y: 33 * TILE - rand(100, 300), vx: rand(-20, 20), vy: rand(30, 80), vr: rand(-6, 6), life: rand(2, 3.5), size: rand(2, 4), color: k % 3 ? GOLD : BONE, type: 'debris', drag: 0.4 });
      await this.wait(1.2);
      await this.say('NATHAN', 'Floating above the clouds… and is that a CHOIR?', nh);
      await this.say('NATHAN', 'Bottomless pit, dark-flag umpires, laser grids. He really wants me to use everything.', nh);
      this.camTarget = null; Save.data.stadium = true; saveGame();
    }).then(() => toast('THE CHAMPIONSHIP GAUNTLET · BAT-LAUNCH ACROSS THE PIT'));
  },

  /* ---------- the Grand Locker Room: normal Adam's assist ---------- */
  adamAssist(adam) {
    return this.run(async () => {
      const P = Player, D = Save.data, h = () => adam.head(), nh = () => this.nathanHead(), v = { voice: 1.05 };
      P.facing = 1; adam.facing = -1;
      this.camTarget = { x: (P.x + adam.x) / 2, y: adam.y - 60 }; this.zoomTo(1.24);
      await this.wait(0.7);
      await this.say('NATHAN', 'Adam?! You look terrible.', nh);
      await this.say('ADAM', 'Don\'t look at me like that, Nathan. I had him on the ropes…', h, v);
      await this.say('ADAM', '…until he pulled out those cursed trophies. He\'s not playing a game anymore. He\'s trying to erase the whole bracket.', h, v);
      await this.say('NATHAN', 'Good thing I don\'t play by the rules anyway.', nh);
      adam.o.pose = 'serve'; SFX.toss();
      await this.say('ADAM', 'Take this. Keep him off balance.', h, v);
      // the glowing golden tennis ball arcs over
      Act3.goldBall = { x: adam.x - 10, y: adam.y - 60, t: 0, from: { x: adam.x - 10, y: adam.y - 60 } };
      await this.wait(0.8);
      Act3.goldBall = null; adam.o.pose = 'kneel';
      SFX.unlock(); SFX.launch(); this.impact(P.x + P.w / 2, P.y + P.h / 2, FLAME); this.zoomTo(1.36);
      D.up.maxBat = true; saveGame(); applyUpgrades();
      burst(P.x + P.w / 2, P.y + 10, 40, { colors: [FLAME, GOLD, '#ff4a1a', BONE], maxSpeed: 520 });
      ring(P.x + P.w / 2, P.y + P.h / 2, 10, 120, 0.5, FLAME, 8);
      pop(P.x + P.w / 2, P.y - 40, 'MAX BAT POWER!', { size: 54, life: 1.4 });
      await this.wait(0.9);
      await this.say('ADAM', 'Don\'t let him get to match point.', h, v);
      D.adamAssist = true; saveGame();
    }).then(() => showCard('MAX BAT POWER', 'THE GOLDEN CORE', 'Adam\'s glowing golden tennis ball fused into your bat. Every swing hits 50% harder and leaves a blazing flame-red trail. The doors to the Championship Court are just ahead.',
      ['permanent upgrade', `<kbd>${Bindings.label('up')}</kbd> at the doors to kick them open`]));
  },
  adamTalk(adam) {
    const lines = ['Go. I\'ll catch my breath.', 'He blocks from the front. Make him serve, then send it back.', 'Bat his dark serves back. That\'s how I almost had him.', 'Hey. Don\'t miss.'];
    return this.run(async () => {
      Player.facing = sgn(adam.x - Player.x) || 1; this.twoShot(Player, adam, 1.26);
      // gold dust still drifting off him from the fusion
      for (let k = 0; k < 10; k++) spawnParticle({ x: adam.x + rand(-12, 12), y: adam.y - rand(10, 50), vy: rand(-50, -20), life: rand(0.8, 1.4), size: rand(2, 3), color: k % 2 ? GOLD : BONE, type: 'dot' });
      await this.say('ADAM', lines[(adam.talk = ((adam.talk || 0) + 1)) % lines.length], () => adam.head(), { voice: 1.05 });
    });
  },
  kickDoors() {
    return this.run(async () => {
      const P = Player, D = Save.data;
      this.camTarget = { x: A.doors.x, y: A.doors.y + 60 };
      P.facing = 1; P.sx = 1.3; P.sy = 0.8; await this.wait(0.3);
      SFX.kick(); SFX.boom(); this.impact(A.doors.x, A.doors.y + 60, GOLD); this.zoomTo(1.0);
      await this.tween(Act3, 'doorOpen', 1, 0.35);
      setLock(A.doorLock, false); D.walls.court_door = 1; saveGame();
      SFX.crowd(3.2); await this.wait(0.8);
    }).then(() => toast('THE GRAND CHAMPIONSHIP COURT'));
  },

  /* ---------- Evil Adam ---------- */
  evilIntro(b) {
    return this.run(async () => {
      const P = Player, h = () => ({ x: b.x + b.w / 2, y: b.y - 16 }), nh = () => this.nathanHead(), v = { voice: 0.62, color: '#e6d6ff' };
      setLock(A.courtLock, true); SFX.gate(); this.punch(0.07, 8); this.zoomTo(1.18);
      this.camTarget = { x: (P.x + b.x) / 2 + 40, y: b.y - 40 }; P.facing = 1; b.facing = -1;
      // the crowd hushes; violet embers curl off him
      const aura = n => { for (let k = 0; k < n; k++) spawnParticle({ x: b.x + rand(0, b.w), y: b.y + rand(0, b.h), vx: rand(-20, 20), vy: rand(-120, -40), life: rand(0.8, 1.5), size: rand(3, 7), color: k % 3 ? 'rgba(122,31,110,.7)' : 'rgba(217,184,255,.8)', type: 'puff', drag: 1 }); };
      aura(20);
      await this.wait(0.9);
      await this.say('EVIL ADAM', 'Always swinging for the fences, Nathan. Always playing the hero.', h, v);
      aura(20); this.zoomTo(1.36); this.lines = 0.7; this.linesAt = h(); SFX.thunder();
      await this.say('EVIL ADAM', 'You know what happens when the MVP misses? Everyone loses.', h, v);
      this.camTarget = { x: P.x + 60, y: P.y - 20 }; this.zoomTo(1.42);
      await this.say('NATHAN', 'I don\'t miss.', nh);
      this.punch(0.1, 10); SFX.clang(); this.camTarget = { x: (P.x + b.x) / 2 + 40, y: b.y - 40 }; this.zoomTo(1.05);
      await this.wait(0.4);
      await racketTrick(this, b, '#d9b8ff');   // the dark ball: two bounces, a toss, the slam (zone/boss-anims.js)
    }).then(() => {
      BossBar.show('EVIL ADAM · MATCH POINT'); b.begin(); SFX.drill(); SFX.crowd(2.4);
      setTimeout(() => toast('TIP · HE BLOCKS FROM THE FRONT · BAT HIS DARK SERVES BACK TO BREAK HIS GUARD'), 1600);
    });
  },
  evilAdamDefeat(b) {
    return this.run(async () => {
      const P = Player, D = Save.data, nh = () => this.nathanHead(), h = () => ({ x: b.x + b.w / 2, y: b.y - 6 });
      BossBar.flash(); SFX.music(null);
      this.camTarget = { x: (P.x + b.x) / 2, y: b.y - 20 };
      this.impact(b.x + b.w / 2, b.y + b.h / 2, '#d9b8ff');
      // a long, silent push-in on him
      this.zoomTo(1.45);
      await this.wait(2.0);
      // his dark racket shatters, the aura evaporates, and it's just Adam
      b.racketGone = true; SFX.bigCrack(); SFX.crystal();
      this.impact(b.x + b.w / 2 + b.facing * 20, b.y + 10, GOLD);
      burst(b.x + b.w / 2 + b.facing * 20, b.y + 10, 30, { colors: ['#1a0f22', GOLD, '#d9b8ff'], maxSpeed: 520, grav: 900, type: 'debris' });
      await this.wait(0.9);
      SFX.poof(); for (let k = 0; k < 30; k++) spawnParticle({ x: b.x + rand(0, b.w), y: b.y + rand(0, b.h), vx: rand(-60, 60), vy: rand(-220, -60), life: rand(0.8, 1.6), size: rand(4, 9), color: k % 3 ? 'rgba(122,31,110,.6)' : 'rgba(242,193,78,.6)', type: 'puff', drag: 1 });
      for (let k = 0; k < 4; k++) ring(b.x + b.w / 2, b.y + b.h / 2, 10, 90 + k * 40, 0.6 + k * 0.15, k % 2 ? '#d9b8ff' : BONE, 3);
      Game.flashWhite = 0.5;
      b.normal = true; BossBar.hide(); Zone.boss = null;
      D.evilAdamDead = true; D.where = 'z9'; saveGame(); themeCheck(800);
      await this.wait(1.0);
      this.zoomTo(1.3);
      await this.say('ADAM', '…Nathan? Was that me? The version of me that never learned how to lose?', h, { voice: 1.05 });
      await this.say('NATHAN', 'It was. Not anymore. Welcome back, Adam.', () => this.nathanHead());
      if (trueEndingReady()) await this.vortex(b);
      else await this.endingA(b);
    }).then(() => { if (Save.data.endingA && !Save.data.coreOpen) endCard('A'); });
  },

  /* ---------- Ending A · "Game, Set, Match" ---------- */
  async endingA(b) {
    const P = Player, D = Save.data, nh = () => this.nathanHead(), ar = ROOM.t_court.px;
    // without the Cursed Trophies holding it together, the Spire crumbles
    Act3.crumble = 1; SFX.thunder(); SFX.slam(); addShake(18); this.zoomTo(1.12);
    // chunks of gilded ceiling raining down
    for (let k = 0; k < 40; k++) spawnParticle({ x: ar.x + rand(0, ar.w), y: A.courtFloor - rand(300, 520), vx: rand(-30, 30), vy: rand(60, 200), vr: rand(-5, 5), grav: 1100, life: rand(0.9, 1.6), size: rand(4, 9), color: ['#d9cbb0', GOLD, '#8a7a5a'][k % 3], type: 'debris' });
    await this.say('NATHAN', 'Uh oh. The whole Spire\'s coming apart.', nh);
    const portal = { x: ar.x + 5 * TILE, y: A.courtFloor - 50, open: 0 }; Act3.portal = portal;
    SFX.summon(); this.impact(portal.x, portal.y, '#6fd3ff'); await this.tween(portal, 'open', 1, 0.6);
    const josh = new Actor('josh', portal.x, A.courtFloor, { facing: 1 }), renas = new Actor('renas', portal.x, A.courtFloor, { facing: 1, o: { moving: true } }), milo = new Actor('milo', portal.x, A.courtFloor, { facing: 1, o: { float: true } });
    NPCs.push(josh); josh.walkTo = portal.x + 70; await this.wait(0.35);
    NPCs.push(renas); renas.walkTo = portal.x + 130; renas.speed = 320; await this.wait(0.35);
    NPCs.push(milo); milo.walkTo = portal.x + 40; await this.wait(0.6);
    this.camTarget = { x: portal.x + 200, y: A.courtFloor - 120 }; this.zoomTo(1.2);
    await this.say('JOSH', 'Portal\'s held together with tape and spite. MOVE.', () => josh.head(), { voice: 1.3 });
    await this.say('RENAS', 'Slowpokes! In! Now!', () => renas.head(), { voice: 1.5 });
    SFX.thunder(); this.punch(0.06, 10);
    await this.say('MILO', 'It\'s stable! Mostly! On purpose! GO!', () => milo.head(), { voice: 1.2 });
    // everyone through the portal
    const adam = new Actor('adam', b.x + b.w / 2, A.courtFloor, { facing: -1, o: { pose: 'kneel' }, speed: 240 }); b.gone = true; NPCs.push(adam);
    adam.o.pose = 'idle'; adam.walkTo = portal.x; P.facing = -1;
    this.zoomTo(1.35);
    await this.tween(P, 'x', portal.x - P.w / 2, 1.4);
    Scene.white = 0; this.punch(0.15, 6); await this.tween(Scene, 'white', 1, 0.8);
    for (const n of [josh, renas, milo, adam]) n.gone = true; Act3.portal = null; Act3.crumble = 0;
    // the neighborhood
    Object.assign(Scene, { on: 'hood', mode: 'A', t: 0, lie: 1 }); SFX.music('victory');
    await this.tween(Scene, 'white', 0, 1.4);
    await this.title('HOME', 'THE NEIGHBORHOOD FIELD · SUNSET', 2.6);
    await this.tween(Scene, 'lie', 0, 1.4);
    await this.say('ADAM', 'Did we… just wake up on the field? Was that a dream?', () => fieldHead('adam'), { voice: 1.05 });
    await this.say('JOSH', 'If it was, I want my server back.', () => fieldHead('josh'), { voice: 1.3 });
    await this.wait(0.6);
    Scene.lookBat = 1;
    await this.say('NATHAN', '(Still a fleck of gold in the grain of my bat. From the trophy I smashed after the final.)', () => fieldHead('nathan'), { color: '#e6d6ff' });
    await this.say('NATHAN', '(Nobody needs to know about the trophy.)', () => fieldHead('nathan'), { color: '#e6d6ff' });
    Scene.smirk = 1; await this.wait(1.2);
    await this.credits();
    D.endingA = true; saveGame();
  },
  async credits() {
    // the credits (and anything after them) can be skipped by holding attack
    Scene.on = 'credits'; Scene.scroll = 0; this.skippable = true; this.skipHold = 0;
    await this.tween(Scene, 'scroll', 1, 26);
    await this.wait(0.6);
  },

  /* ---------- the vortex: down into the Zennith Core ---------- */
  async vortex(b) {
    const P = Player, D = Save.data, nh = () => this.nathanHead();
    await this.wait(0.6);
    await this.say('NATHAN', '…Wait. The trophies aren\'t fading.', nh);
    Act3.vortex = { t: 0, r: 0 }; SFX.summon(); SFX.thunder(); addShake(10);
    this.camTarget = { x: A.net, y: A.courtFloor - 120 }; this.zoomTo(1.15);
    this.lines = 1; this.linesAt = { x: A.net, y: A.courtFloor - 120 };
    await this.tween(Act3.vortex, 'r', 1, 2.2);
    this.zoomTo(1.3);
    await this.say('ADAM', 'They\'re fusing together! Nathan, get back!', () => ({ x: b.x + b.w / 2, y: b.y - 6 }), { voice: 1.05 });
    SFX.bigCrack(); SFX.boom(); this.impact(A.net, A.courtFloor, '#d9b8ff'); addShake(24);
    openCoreHole(); D.coreOpen = true; saveGame();
    burst(A.net, A.courtFloor, 60, { colors: ['#d9cbb0', '#1a0f22', GOLD, '#d9b8ff'], maxSpeed: 700, grav: 1400, type: 'debris' });
    P.x = clamp(P.x, A.hole.tx * TILE + 2 * TILE, (A.hole.tx + A.hole.w) * TILE - 2 * TILE - P.w);
    b.gone = true; NPCs.push(Act3.courtAdam = new Actor('adam', clamp(b.x + b.w / 2, ROOM.t_court.px.x + 3 * TILE, A.hole.tx * TILE - 2 * TILE), A.courtFloor, { facing: 1, o: { pose: 'kneel' } }));
    await this.say('ADAM', 'NATHAN!', () => Act3.courtAdam.head(), { voice: 1.2 });
    Act3.vortex = null; this.camTarget = null;
  },
  coreReveal(z) {
    return this.run(async () => {
      const D = Save.data, P = Player, h = () => ({ x: z.x + z.w / 2, y: z.y - 10 }), nh = () => this.nathanHead(), v = { voice: 1, color: '#d9c8e8' };
      SFX.musicAuto();   // solo piano in the rain, until the crew jumps in
      this.camTarget = { x: (P.x + z.x + z.w / 2) / 2, y: z.y + 80 }; this.zoomTo(1.05);
      await this.wait(1.8);
      if (!D.coreSeen) {
        await this.title('THE ZENNITH CORE', 'THE BOTTOM OF THE NINTH', 3.0);
        this.zoomTo(1.25);
        await this.say('NATHAN', 'Rain. A baseball diamond. I know this place.', nh);
        this.camTarget = { x: z.x + z.w / 2, y: z.y + 60 }; this.zoomTo(1.18);
        await this.say('ZENNITH', 'Of course you do. Bottom of the ninth. The championship.', h, v);
        this.camTarget = { x: P.x + 40, y: P.y - 20 }; this.zoomTo(1.45); this.punch(0.08, 6);
        await this.say('NATHAN', '…That voice. That\'s MY voice.', nh);
        this.camTarget = { x: (P.x + z.x + z.w / 2) / 2, y: z.y + 80 }; this.zoomTo(1.15);
        await this.say('ZENNITH', 'You choked on the final swing, Nathan. And your pride couldn\'t take it.', h, v);
        this.zoomTo(1.22);
        await this.say('ZENNITH', 'So you smashed the trophy. And it trapped all of you here, in a Spire built from your worst fears.', h, v);
        await this.say('ZENNITH', 'Adam\'s fear of losing. Milo\'s fear of failing. Deniz\'s cold arrogance.', h, v);
        await this.say('ZENNITH', 'Fionn\'s fear of being ignored. Daniel\'s fear of being boring. Josh\'s fear of not being needed.', h, v);        this.zoomTo(1.32); this.lines = 0.7; this.linesAt = h(); SFX.thunder();
        await this.say('ZENNITH', 'And Evil Adam? Adam\'s worst self. Fed every day by your refusal to ever accept defeat.', h, v);
        this.camTarget = { x: P.x + 40, y: P.y - 20 }; this.zoomTo(1.5);
        await this.say('NATHAN', '…So this whole thing was my fault.', nh);
        this.camTarget = { x: z.x + z.w / 2, y: z.y + 60 }; this.zoomTo(1.2);
        SFX.bigCrack(); this.impact(z.x + z.w / 2, z.y + z.h / 2, '#7a1f6e');
        await this.say('ZENNITH', 'I am Zennith. The Unforgiving. And I will never let you forget that swing.', h, v);
        this.camTarget = { x: (P.x + z.x + z.w / 2) / 2, y: z.y + 80 }; this.zoomTo(1.3);
        await this.say('NATHAN', 'Then let\'s play one more inning.', nh);
        this.punch(0.1, 8); SFX.clang();
        D.coreSeen = true; saveGame();
      } else {
        await this.say('ZENNITH', 'Back again, MVP? The rain never stops down here.', h, v);
        await this.say('NATHAN', 'Neither do I.', nh);
      }
    }).then(() => { BossBar.show('ZENNITH · THE UNFORGIVING'); z.begin(); SFX.drill(); });
  },
  batBreak(z) {
    return this.run(async () => {
      const P = Player, nh = () => this.nathanHead(), h = () => ({ x: z.x + z.w / 2, y: z.y - 10 }), v = { voice: 1, color: '#d9c8e8' };
      SFX.bigCrack(); SFX.clang(); addHitstop(0.3);
      this.impact(P.x + P.w / 2 + P.facing * 24, P.y + 14, FLAME); this.zoomTo(1.4);
      P.noBat = true; P.batLook = null;
      burst(P.x + P.w / 2 + P.facing * 24, P.y + 14, 30, { colors: [FLAME, GOLD, '#c9a36b', INK], maxSpeed: 560, grav: 1200, type: 'debris' });
      pop(P.x + P.w / 2, P.y - 40, 'SNAP!', { size: 60 });
      await this.wait(1.0);
      await this.say('NATHAN', 'My bat…!', nh);
      this.camTarget = { x: z.x + z.w / 2, y: z.y + 60 }; this.zoomTo(1.2);
      await this.say('ZENNITH', 'Gold. Titanium. Storm magic. None of it was ever really yours.', h, v);
      this.camTarget = null; this.zoomTo(1.32);
      await this.wait(0.4);
      SFX.toss(); P.noBat = false; P.batLook = 'wood'; P.sx = 1.2; P.sy = 0.8;
      this.punch(0.08, 5); ring(P.x + P.w / 2, P.y + P.h / 2, 8, 90, 0.5, '#d9b77a', 5);
      for (let k = 0; k < 16; k++) spawnParticle({ x: P.x + P.w / 2 + rand(-20, 20), y: P.y + rand(0, P.h), vx: rand(-40, 40), vy: rand(-120, -40), life: rand(0.6, 1.1), size: rand(2, 3), color: k % 2 ? '#ffe2a8' : BONE, type: 'dot' });
      pop(P.x + P.w / 2, P.y - 30, 'THE SPARE BAT', { size: 34, color: '#d9b77a', burstColor: '#5a3a20' });
      await this.say('NATHAN', 'Good thing I always keep a spare under my pillow.', nh);
      await this.say('NATHAN', 'Plain old wood. Just like Little League.', nh);
    }).then(() => toast('YOUR FRIENDS ARE COMING · HOLD ON'));
  },

  /* ---------- Ending B · "Extra Innings" ---------- */
  trueEndingScene(z) {
    return this.run(async () => {
      const D = Save.data;
      BossBar.hide(); SFX.music(null);
      this.camTarget = { x: z.x + z.w / 2, y: z.y + 100 }; this.zoomTo(1.15);
      // the core shatters, and the void fills with sunlight
      for (let k = 0; k < 10; k++) {
        const x = z.x + rand(0, z.w), y = z.y + rand(0, z.h);
        burst(x, y, 20, { colors: [GOLD, BONE, '#7a1f6e', FLAME], maxSpeed: 700, grav: 300 }); SFX.hit(true); addShake(10);
        if (k % 3 === 0) this.impact(x, y, k % 2 ? GOLD : BONE);
        this.zoomTo(1.15 + k * 0.025);
        await this.wait(0.16);
      }
      SFX.bossDie(); SFX.bigCrack();
      this.impact(z.x + z.w / 2, z.y + z.h / 2, BONE);
      z.dissolve = 1; await this.tween(z, 'dissolve', 0, 1.2);
      this.zoomTo(1.0);
      Act3.sunlight = 0; await this.tween(Act3, 'sunlight', 1, 1.6);
      Scene.white = 0; await this.tween(Scene, 'white', 1, 0.8);
      Zone.boss = null; Act3.buddy = null; Act3.assist = null;
      D.zennithDead = true; D.trueEnding = true; D.where = 'z9'; saveGame(); themeCheck(800);
      Object.assign(Scene, { on: 'hood', mode: 'B', t: 0, lie: 1, lookBat: 0, smirk: 0, ballT: -1 }); SFX.music('victory');
      await this.tween(Scene, 'white', 0, 1.6);
      await this.title('EXTRA INNINGS', 'THE NEIGHBORHOOD FIELD · MORNING', 3.0);
      await this.wait(0.6);
      await this.say('DANIEL', 'Did anyone else just get blown up in a giant tower? No? Just me?', () => fieldHead('daniel'), { voice: 0.9 });
      await this.tween(Scene, 'lie', 0, 1.6);
      await this.say('MILO', 'I would like to formally say that the storm was NOT on purpose.', () => fieldHead('milo'), { voice: 1.2 });
      await this.say('DENIZ', 'Whatever it was, man… we made it. Together.', () => fieldHead('deniz'), { voice: 0.7 });
      await this.wait(0.5);
      Scene.lookBat = 1;
      await this.say('NATHAN', '(Plain wood. Signed by the whole team.)', () => fieldHead('nathan'), { color: '#fff6d8' });
      await this.say('NATHAN', '(I lost that game. And that\'s okay.)', () => fieldHead('nathan'), { color: '#fff6d8' });
      Scene.lookBat = 0; Scene.ballT = 0; SFX.toss();
      await this.wait(1.0);
      await this.say('ADAM', 'Rematch?', () => fieldHead('adam'), { voice: 1.05 });
      Scene.smirk = 1;
      await this.say('NATHAN', 'You\'re on.', () => fieldHead('nathan'));
      await this.wait(0.8);
      await this.credits();
      // post-credits: Lars's two cats, asleep on Josh's server
      Scene.on = 'post'; Scene.t = 0; SFX.purr();
      await this.wait(5.5);
    }).then(() => endCard('B'));
  },
});

/* ---------- the stadium end card ---------- */
function endCard(mode) {
  const D = Save.data, m = Math.floor(D.time / 60), s = Math.floor(D.time % 60);
  Scene.on = null; Scene.white = 0; SFX.music('victory');
  const card = $('#end');
  card.querySelector('.eyebrow').textContent = mode === 'B' ? 'TRUE ENDING' : 'STANDARD ENDING';
  card.querySelector('h1').textContent = mode === 'B' ? 'EXTRA INNINGS' : 'GAME, SET, MATCH';
  card.querySelector('.lede').innerHTML = mode === 'B'
    ? 'The Zennith Core is gone and the whole crew is home. Nathan finally made peace with that swing. Rematch at the neighborhood field, any time.'
    : 'Evil Adam is beaten and everyone made it home. But the Cursed Trophies are still humming up there… <b>something is unfinished.</b>';
  $('#endStats').innerHTML = [`${m}:${String(s).padStart(2, '0')} played`, `${D.deaths} strikeouts`, `${pebblesFound()}/${PEBBLE_TOTAL} pebbles`, D.spareBat ? 'Spare Bat ✓' : 'Spare Bat ✗'].map(x => `<span>${x}</span>`).join('');
  $('#endGo').style.display = mode === 'B' ? 'none' : '';
  SFX.unlock(); openModal('end');
}
function showTrueChecklist() {
  const list = trueEndingChecks();
  showCard('SOMETHING IS UNFINISHED', 'THE CURSED TROPHIES', 'They hum when you walk past. Maybe, with everything in place, they\'d show you what they\'re hiding. ' + list.map(([t, ok]) => (ok ? '✓ ' : '✗ ') + t).join(' · '),
    list.map(([t, ok]) => (ok ? '✓' : '✗') + ' ' + t.split(' (')[0]));
}

/* ---------- drawing the ending scenes (screen space) ---------- */
function drawScene() {
  const S = Scene;
  if (S.on === 'hood' || S.on === 'credits') drawHood(S);
  if (S.on === 'credits') {
    const cg = ctx.createLinearGradient(0, 0, 0, VH);
    cg.addColorStop(0, 'rgba(8,5,12,.92)'); cg.addColorStop(0.5, 'rgba(8,5,12,.68)'); cg.addColorStop(1, 'rgba(8,5,12,.92)');
    ctx.fillStyle = cg; ctx.fillRect(0, 0, VW, VH);
    // gold dust drifting up behind the names
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 40; k++) {
      const x = (k * 131 + Math.sin(Game.time * 0.5 + k) * 30) % VW, y = VH - ((Game.time * (18 + k % 7 * 6) + k * 71) % (VH + 40));
      ctx.fillStyle = `rgba(242,193,78,${0.15 + (k % 5) * 0.08})`; ctx.beginPath(); ctx.arc(x, y, 1 + (k % 3), 0, 7); ctx.fill();
    }
    ctx.restore();
    const lh = 34, total = CREDITS.length * lh + VH, y0 = VH + 20 - S.scroll * total;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    CREDITS.forEach(([a, b], i) => {
      const y = y0 + i * lh; if (y < -40 || y > VH + 40) return;
      // names fade in from the bottom and out at the top
      ctx.globalAlpha = clamp(Math.min((VH - y) / 120, y / 120), 0, 1);
      if (i === 0) {
        // the title in tracked serif capitals with a gold glow, over a tapered gold rule
        ctx.font = `600 44px "Cinzel", "Trajan Pro", ${SERIF_FONT}`; if ('letterSpacing' in ctx) ctx.letterSpacing = '6px';
        ctx.shadowColor = 'rgba(197,160,89,.6)'; ctx.shadowBlur = 18; ctx.fillStyle = '#FFF8EB'; ctx.fillText(a, VW / 2, y);
        ctx.shadowBlur = 0; if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
        const rg = ctx.createLinearGradient(VW / 2 - 170, 0, VW / 2 + 170, 0);
        rg.addColorStop(0, 'rgba(197,160,89,0)'); rg.addColorStop(0.5, '#C5A059'); rg.addColorStop(1, 'rgba(197,160,89,0)');
        ctx.fillStyle = rg; ctx.fillRect(VW / 2 - 170, y + 30, 340, 1.5);
        ctx.save(); ctx.translate(VW / 2, y + 31); ctx.rotate(Math.PI / 4); ctx.fillStyle = '#FF3B30'; ctx.fillRect(-3, -3, 6, 6); ctx.restore();
        ctx.globalAlpha = 1; return;
      }
      if (!a && !b) { ctx.fillStyle = 'rgba(197,160,89,.45)'; ctx.save(); ctx.translate(VW / 2, y); ctx.rotate(Math.PI / 4); ctx.fillRect(-3, -3, 6, 6); ctx.restore(); ctx.globalAlpha = 1; return; }
      ctx.font = `600 12px "Cinzel", "Trajan Pro", ${SERIF_FONT}`; if ('letterSpacing' in ctx) ctx.letterSpacing = '3px';
      ctx.fillStyle = 'rgba(197,160,89,.85)'; ctx.fillText(a, VW / 2, y - 8);
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
      ctx.font = `18px ${SERIF_FONT}`; ctx.fillStyle = '#FFF8EB'; ctx.fillText(b, VW / 2, y + 10);
      ctx.globalAlpha = 1;
    });
  }
  if (S.on === 'post') {
    ctx.fillStyle = '#0a0810'; ctx.fillRect(0, 0, VW, VH);
    // night sky over camp: stars and a low moon
    for (let k = 0; k < 70; k++) { const a = 0.3 + 0.5 * Math.abs(Math.sin(Game.time * (0.6 + k % 5 * 0.3) + k)); ctx.fillStyle = `rgba(243,234,216,${a})`; ctx.fillRect((k * 173) % VW, (k * 89) % (VH * 0.55), k % 9 ? 1.5 : 2.5, k % 9 ? 1.5 : 2.5); }
    const mg = ctx.createRadialGradient(VW * 0.8, VH * 0.2, 10, VW * 0.8, VH * 0.2, 120); mg.addColorStop(0, 'rgba(243,234,216,.9)'); mg.addColorStop(0.2, 'rgba(243,234,216,.25)'); mg.addColorStop(1, 'rgba(243,234,216,0)');
    ctx.fillStyle = mg; ctx.fillRect(VW * 0.8 - 120, VH * 0.2 - 120, 240, 240);
    // the campfire's glow, flickering on the server
    const fl = 0.8 + Math.sin(Game.time * 13) * 0.08 + Math.sin(Game.time * 7.3) * 0.08;
    const cf = ctx.createRadialGradient(VW * 0.28, VH * 0.78, 10, VW * 0.28, VH * 0.78, VW * 0.5 * fl);
    cf.addColorStop(0, 'rgba(255,140,60,.45)'); cf.addColorStop(1, 'rgba(255,140,60,0)');
    ctx.fillStyle = cf; ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = '#16101a'; ctx.fillRect(0, VH * 0.7, VW, VH * 0.3);
    ctx.save(); ctx.translate(VW / 2, VH * 0.7); ctx.scale(2.2, 2.2); ctx.lineJoin = 'round';
    // Josh's server, humming quietly at Base Camp
    rr(-40, -60, 80, 60, 4); inked('#2a2a32', 3);
    for (let k = 0; k < 4; k++) { ctx.fillStyle = (Math.sin(Game.time * 3 + k) > 0) ? '#50dc78' : '#1f5a3a'; ctx.fillRect(-32 + k * 9, -50, 5, 3); }
    ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(-36, -40, 72, 4); ctx.fillRect(-36, -30, 72, 4);
    drawCat(-14, -60, 1, Game.time, { color: '#e08a3a', sleep: true, scale: 0.9 });
    drawCat(16, -60, -1, Game.time + 2, { color: '#2b2228', sleep: true, scale: 0.9 });
    // little Zs drifting up off the cats
    ctx.font = `9px ${DISPLAY_FONT}`; ctx.textAlign = 'center';
    for (let k = 0; k < 4; k++) { const p = (Game.time * 0.35 + k / 4) % 1; ctx.fillStyle = `rgba(243,234,216,${(1 - p) * 0.8})`; ctx.fillText('z', (k % 2 ? 16 : -14) + Math.sin(p * 6 + k) * 4 + p * 10, -74 - p * 40); }
    ctx.restore();
    ctx.font = `14px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(243,234,216,.5)'; ctx.fillText('MEANWHILE, BACK AT BASE CAMP…', VW / 2, VH * 0.2);
  }
  if (S.white > 0.001) { ctx.fillStyle = `rgba(255,248,232,${S.white})`; ctx.fillRect(0, 0, VW, VH); }
}
function drawHood(S) {
  const t = Game.time, B = S.mode === 'B', gy = fieldY();
  // sky: a bright morning for the True Ending, a warm sunset for the standard one
  const g = ctx.createLinearGradient(0, 0, 0, gy);
  if (B) { g.addColorStop(0, '#5fb0e0'); g.addColorStop(0.7, '#bfe3f2'); g.addColorStop(1, '#ffe8b0'); }
  else { g.addColorStop(0, '#3a2a5a'); g.addColorStop(0.55, '#e0704a'); g.addColorStop(1, '#ffc07a'); }
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  const sx = VW * (B ? 0.78 : 0.3), sy = B ? VH * 0.18 : gy - 40;
  const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 160); sg.addColorStop(0, B ? 'rgba(255,250,220,.95)' : 'rgba(255,220,150,.95)'); sg.addColorStop(0.25, B ? 'rgba(255,240,190,.6)' : 'rgba(255,170,90,.5)'); sg.addColorStop(1, 'rgba(255,240,190,0)');
  ctx.fillStyle = sg; ctx.fillRect(sx - 160, sy - 160, 320, 320);
  // slow god-rays fanning out of the sun
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 9; k++) {
    const a = k / 9 * Math.PI * 2 + t * 0.04, w = 0.07 + (k % 3) * 0.03;
    const rg = ctx.createRadialGradient(sx, sy, 20, sx, sy, VW * 0.9);
    rg.addColorStop(0, B ? 'rgba(255,250,220,.16)' : 'rgba(255,200,130,.14)'); rg.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = rg; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.arc(sx, sy, VW * 0.9, a, a + w); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = B ? 'rgba(255,255,255,.75)' : 'rgba(255,200,170,.35)';
  for (let k = 0; k < 4; k++) { const x = ((k * 380 + t * 10) % (VW + 300)) - 150, y = 50 + (k % 2) * 46; ctx.beginPath(); ctx.ellipse(x, y, 90, 18, 0, 0, 7); ctx.ellipse(x + 50, y - 10, 50, 14, 0, 0, 7); ctx.fill(); }
  // a few birds crossing the sky
  ctx.strokeStyle = B ? 'rgba(40,50,70,.6)' : 'rgba(40,20,40,.6)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  for (let k = 0; k < 5; k++) {
    const bx = ((t * (28 + k * 5) + k * 260) % (VW + 200)) - 100, by = 90 + k * 22 + Math.sin(t * 0.7 + k) * 10, f = Math.sin(t * 7 + k * 2) * 5;
    ctx.beginPath(); ctx.moveTo(bx - 8, by - f); ctx.quadraticCurveTo(bx - 3, by - 3, bx, by); ctx.quadraticCurveTo(bx + 3, by - 3, bx + 8, by - f); ctx.stroke();
  }
  ctx.lineCap = 'butt';
  // the neighborhood: houses, a fence, a tree
  for (let k = 0; k < 7; k++) {
    const x = k * VW / 6 - 40, w = 110, h = 70 + (k % 3) * 14, by = gy - 46;
    ctx.fillStyle = B ? ['#c97a5a', '#8aa0b8', '#d9b77a'][k % 3] : ['#6a3a40', '#4a3a5a', '#7a4a3a'][k % 3];
    ctx.fillRect(x, by - h, w, h); ctx.beginPath(); ctx.moveTo(x - 10, by - h); ctx.lineTo(x + w / 2, by - h - 40); ctx.lineTo(x + w + 10, by - h); ctx.closePath(); ctx.fillStyle = B ? '#7a3a2a' : '#2a1a24'; ctx.fill();
    ctx.fillStyle = B ? 'rgba(255,255,255,.6)' : 'rgba(255,210,122,.85)'; ctx.fillRect(x + 18, by - h + 18, 18, 16); ctx.fillRect(x + w - 36, by - h + 18, 18, 16);
  }
  ctx.fillStyle = B ? '#e8dcc0' : '#8a6a5a'; for (let x = 0; x < VW; x += 22) ctx.fillRect(x, gy - 50, 8, 34); ctx.fillRect(0, gy - 42, VW, 5);
  // an old oak on the right, leaves swaying
  const tx = VW * 0.9, ty = gy - 20;
  ctx.fillStyle = B ? '#5a3a24' : '#2a1a18'; ctx.beginPath(); ctx.moveTo(tx - 14, ty); ctx.quadraticCurveTo(tx - 6, ty - 80, tx - 18, ty - 150); ctx.lineTo(tx + 6, ty - 150); ctx.quadraticCurveTo(tx + 8, ty - 80, tx + 16, ty); ctx.fill();
  for (let k = 0; k < 7; k++) {
    const a = k / 7 * Math.PI * 2, sw = Math.sin(t * 1.2 + k) * 4;
    ctx.fillStyle = B ? ['#3f8a3a', '#4f9a44', '#2f7a30'][k % 3] : ['#2a3a26', '#34442c', '#1e2e1c'][k % 3];
    ctx.beginPath(); ctx.arc(tx - 6 + Math.cos(a) * 52 + sw, ty - 170 + Math.sin(a) * 34, 44, 0, 7); ctx.fill();
  }
  // the field + chalk diamond
  const fg = ctx.createLinearGradient(0, gy - 20, 0, VH); fg.addColorStop(0, B ? '#5aa03a' : '#3a5a2a'); fg.addColorStop(1, B ? '#3a7a2a' : '#1e3a1a');
  ctx.fillStyle = fg; ctx.fillRect(0, gy - 20, VW, VH - gy + 20);
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(VW / 2 - 360, VH); ctx.lineTo(VW / 2, gy + 6); ctx.lineTo(VW / 2 + 360, VH); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.moveTo(VW / 2 - 12, gy + 26); ctx.lineTo(VW / 2 + 12, gy + 26); ctx.lineTo(VW / 2 + 12, gy + 34); ctx.lineTo(VW / 2, gy + 40); ctx.lineTo(VW / 2 - 12, gy + 34); ctx.fill();
  // the crew, waking up on the grass
  ctx.save(); ctx.translate(VW / 2, gy); ctx.scale(FIELD_S, FIELD_S);
  for (const [kind, ox, o] of fieldCrew()) {
    const f = ox < 0 ? 1 : ox > 0 ? -1 : (S.lookBat ? 1 : -1), lie = kind === 'reshman' ? 0 : S.lie * (0.85 + (Math.abs(ox) % 7) * 0.02);
    const oo = Object.assign({}, o, { lie });
    if (kind === 'nathan') { oo.bat = B ? 'wood' : 'max'; drawCastMember('nathan', ox, 0, f, t, oo); }
    else if (kind === 'adam') { drawCastMember('adam', ox, 0, 1, t, Object.assign(oo, { pose: S.ballT >= 0 ? 'serve' : 'idle' })); }
    else drawCastMember(kind, ox, 0, f, t, oo);
  }
  if (S.ballT >= 0) { S.ballT += 1 / 60; const by = -86 - Math.abs(Math.sin(S.ballT * 3.2)) * 36; ctx.beginPath(); ctx.arc(-34, by, 5, 0, 7); inked(BONE, 2); ctx.strokeStyle = FLAME; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(-37, by, 3, -0.9, 0.9); ctx.stroke(); }
  ctx.restore();
  // foreground grass, fireflies at sunset / dandelion seeds in the morning, and a soft lens flare
  ctx.fillStyle = B ? '#2f6a22' : '#16290f';
  for (let x = -10, k = 0; x < VW + 10; x += 9, k++) {
    const h = 14 + (k * 37 % 13), sw = Math.sin(t * 1.6 + x * 0.03) * 4;
    ctx.beginPath(); ctx.moveTo(x - 4, VH); ctx.quadraticCurveTo(x + sw * 0.5, VH - h * 0.6, x + sw, VH - h); ctx.quadraticCurveTo(x + 2 + sw * 0.5, VH - h * 0.5, x + 4, VH); ctx.fill();
  }
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 22; k++) {
    const ph = k * 2.39, x = (k * 97 + Math.sin(t * 0.4 + ph) * 60 + (B ? t * 18 : 0)) % VW, y = gy - 120 + (k * 53 % 220) + Math.sin(t * 0.9 + ph) * 18;
    const a = B ? 0.55 : Math.max(0, Math.sin(t * 2 + ph)) * 0.9;
    const fg2 = ctx.createRadialGradient(x, y, 0, x, y, B ? 4 : 9);
    fg2.addColorStop(0, B ? `rgba(255,255,255,${a})` : `rgba(220,255,140,${a})`); fg2.addColorStop(1, 'rgba(255,255,200,0)');
    ctx.fillStyle = fg2; ctx.fillRect(x - 10, y - 10, 20, 20);
  }
  const fx = VW / 2 - sx, fy = VH / 2 - sy;
  [[0.5, 30, .08], [0.9, 14, .12], [1.3, 46, .06], [1.7, 10, .14]].forEach(([d, r, a]) => {
    ctx.fillStyle = B ? `rgba(255,250,220,${a})` : `rgba(255,190,120,${a})`; ctx.beginPath();
    for (let i = 0; i < 6; i++) { const ang = i / 6 * Math.PI * 2; ctx.lineTo(sx + fx * d + Math.cos(ang) * r, sy + fy * d + Math.sin(ang) * r); }
    ctx.fill();
  });
  ctx.restore();
  if (S.on === 'hood') { ctx.font = `13px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(13,11,16,.5)'; ctx.fillText(B ? 'EXTRA INNINGS' : 'GAME, SET, MATCH', VW / 2, VH - 24); }
}
