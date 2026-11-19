'use strict';
/* =========================================================
   SIDE-QUEST SCENES · Monfort, Byte, Pip & Squeak, the
   Grounds-Keeper, and errands for Lars, Josh & Renas, Milo, Deniz
   ========================================================= */
Object.assign(Story.tagColors, { MONFORT: '#2f6a3a', IMMANUEL: '#1f4f8a', BYTE: '#3b4f66', PIP: '#5a3a24', SQUEAK: '#3a2a1a', 'GROUNDS-KEEPER': '#3a4a5a' });
const BYTE_V = { voice: 1.7, plain: true, font: MONO_FONT, color: '#dff5e4' };
const VANCE_V = { voice: 0.75 };
const qd = () => Save.data.q;

Object.assign(Story, {
  /* ---------- Coach Monfort · The Training Montage ---------- */
  vanceTalk(n) {
    return this.run(async () => {
      const q = qd(), h = () => n.head(), nh = () => this.nathanHead();
      Player.facing = sgn(n.x - Player.x) || 1; this.camTarget = { x: (Player.x + n.x) / 2, y: n.y - 70 };
      if (!q.vance) {
        await this.say('MONFORT', 'HUSTLE! HUSTLE! …Oh. You\'re not my team. Are you anyone\'s team?', h, VANCE_V);
        await this.say('NATHAN', 'I\'m Nathan. Baseball? You know. Bats?', nh);
        await this.say('MONFORT', 'Bats, rackets, pucks, whatever. Thirty years scouting and I never once checked which sport.', h, VANCE_V);
        this.zoomTo(1.3);
        await this.say('MONFORT', 'But look at those legs. Lazy. Slow. GORGEOUS potential.', h, VANCE_V);
        await this.say('MONFORT', 'I hid a stopwatch post in every zone from here to the Glacier Crown. Run through the post, sprint to my flag, beat my par.', h, VANCE_V);
        await this.say('MONFORT', 'Every two you beat, come see me and I\'ll lace you into better cleats.', h, VANCE_V);
        await this.say('NATHAN', 'Your stopwatch is broken.', nh);
        this.punch(0.06, 5);
        await this.say('MONFORT', 'It\'s ALWAYS been broken. Doesn\'t mean it\'s wrong. HUSTLE!', h, VANCE_V);
        q.vance = true; n.prompt = 'TRIALS'; saveGame();
        return;
      }
      const beat = Quests.count('trials'), tier = Math.min(CLEATS.length, Math.floor(beat / 2));
      if (tier > (q.cleats || 0)) {
        await this.say('MONFORT', `${beat} trials under par! THAT'S what I call HUSTLE. Sit. Feet up. Don't argue.`, h, VANCE_V);
        while ((q.cleats || 0) < tier) {
          q.cleats = (q.cleats || 0) + 1; saveGame();
          SFX.unlock(); this.impact(Player.x + Player.w / 2, Player.y + Player.h, '#9be36a');
          pop(Player.x + Player.w / 2, Player.y - 30, CLEATS[q.cleats - 1].toUpperCase() + '!', { size: 30, color: '#9be36a' });
          await this.wait(0.7);
        }
        const c = q.cleats;
        this.afterScene = () => showCard('CLEAT UPGRADE', CLEATS[c - 1].toUpperCase(), `Coach Monfort laced you into his ${CLEATS[c - 1]}. You now run ${c * 5}% faster and steer ${c * 12}% sharper in the air.`, [`trials beaten ${beat} / 8`, c < CLEATS.length ? `next pair at ${c * 2 + 2}` : 'top of the depth chart']);
        await this.say('MONFORT', c >= CLEATS.length ? 'Hall of Fame cleats. I\'ve got nothing left to teach you. I never did. HUSTLE!' : 'Now get out there. Stopwatch posts don\'t sprint to themselves.', h, VANCE_V);
      } else {
        const next = (q.cleats || 0) * 2 + 2;
        await this.say('MONFORT', beat >= 8 ? 'Every trial under par. I\'m tearing up. That\'s sweat. Sweat from my eyes.'
          : `${beat} of 8 trials beaten. Beat ${next - beat} more and the next cleats are yours. The posts have a stopwatch on top. Can't miss 'em.`, h, VANCE_V);
      }
    }).then(() => { if (this.afterScene) { const f = this.afterScene; this.afterScene = null; f(); } });
  },

  /* ---------- Immanuel · Set Piece ---------- */
  immanuelTalk(n) {
    return this.run(async () => {
      const q = qd(), h = () => n.head(), nh = () => this.nathanHead(), v = { voice: 1.15 }, buried = Quests.count('goals');
      Player.facing = sgn(n.x - Player.x) || 1; this.camTarget = { x: (Player.x + n.x) / 2, y: n.y - 60 }; this.zoomTo(1.3);
      if (q.immanuel === 'done') { await this.say('IMMANUEL', 'Still quick, still holding that bat like a cricket paddle. I\'ll take the win.', h, v); return; }
      if (!q.immanuel) {
        await this.say('IMMANUEL', 'OI! Watch the ball! …That WAS my ball. You\'ve just battered my ball.', h, v);
        await this.say('NATHAN', 'Sorry. Reflex. Also — what ball?', nh);
        await this.say('IMMANUEL', 'IMMANUEL. Striker. Free kicks, corners, the occasional very dramatic fall. Signed with this lot the day the Spire swallowed us.', h, v);
        await this.say('IMMANUEL', 'Turns out it\'s a BASEBALL team. Nobody told me. Nobody passes. Somebody handed me a chicken on a stick instead of a ball.', h, v);
        this.zoomTo(1.4);
        await this.say('IMMANUEL', 'Crew plays the Concourse lads next match, whenever "next" means in here. I need one thing from you: three shots, buried.', h, v);
        await this.say('IMMANUEL', 'I strung three training goals around the Spire — the Bleacher Climb, the Foundry Floor, the Floating Fields. White posts, and a ball sat on the spot.', h, v);
        await this.say('IMMANUEL', 'Swing that bat at the ball. Any angle. I don\'t care if it\'s legal, I care if it\'s in.', h, v);
        await this.say('NATHAN', 'And what do I get?', nh);
        await this.say('IMMANUEL', 'My warm-up. The one that makes defenders cry. You\'ll run like you mean it instead of like a man carrying a fridge.', h, v);
        q.immanuel = 'active'; n.prompt = 'DRILLS'; saveGame();
        return;
      }
      if (buried < GOAL_TOTAL) {
        const left = GOAL_TOTAL - buried;
        await this.say('IMMANUEL', `${buried} of ${GOAL_TOTAL} buried. ${left} net${left > 1 ? 's' : ''} still empty. Bleacher Climb, Foundry Floor, Floating Fields — follow the white posts.`, h, v);
        return;
      }
      await this.say('IMMANUEL', 'THREE! Three goals, off a BASEBALL bat, in a drill I invented in a car park!', h, v);
      SFX.confetti(); SFX.crowd(1.6); this.impact(Player.x + Player.w / 2, Player.y + Player.h, '#9be36a');
      await this.say('IMMANUEL', 'Right. Warm-up. Hips low, arms loose, and STOP leaning into your first step like a fridge with legs.', h, v);
      await this.wait(0.6);
      SFX.unlock(); this.impact(Player.x + Player.w / 2, Player.y, '#9be36a');
      q.immanuel = 'done'; saveGame(); applyUpgrades();
      await this.say('IMMANUEL', 'There. Eight percent faster, forever. Don\'t tell Monfort — he\'ll swear he taught me that.', h, v);
      await this.say('NATHAN', 'What\'s the chicken for?', nh);
      await this.say('IMMANUEL', 'Lunch. It is a stick with lunch on it. Baseball is a very strange sport, skip.', h, v);
    }).then(() => {
      if (qd().immanuel === 'done' && !qd().immanuelCard) { qd().immanuelCard = 1; saveGame(); showCard('SET PIECE', 'WINGER BOOTS', 'Immanuel put you through the winger\'s warm-up: you now run 8% faster, permanently. He also ate the chicken.', ['permanent upgrade', `all ${GOAL_TOTAL} training goals buried`]); }
      else if (qd().immanuel === 'active' && !Quests.count('goals')) toast('SIDE QUEST · SET PIECE · BURY 3 SHOTS IN IMMANUEL\'S TRAINING GOALS');
    });
  },

  /* ---------- Renas at camp · Sibling Rivalry ---------- */
  renasCamp(n) {
    return this.run(async () => {
      const q = qd(), h = () => n.head(), v = { voice: 1.7 };
      this.twoShot(Player, n, 1.26); SFX.scooter(); dust(n.x, n.y, 4);
      Player.facing = sgn(n.x - Player.x) || 1;
      if (q.rivalry === 'active' && (q.caps || 0) >= 5) {
        if (!n.confirm) { n.confirm = true; await this.say('RENAS', 'FIVE capacitors?! Hand \'em over! …Talk to me again to give them to me. Or go waste them on Josh\'s workbench.', h, v); return; }
        await this.rivalryGive('renas', true); return;
      }
      if (q.rivalry === 'active') { await this.say('RENAS', `${q.caps || 0} of 5 capacitors. The drones in the Ventilation Shafts are stuffed with them. Go smash!`, h, v); return; }
      await this.say('RENAS', ['Pay a stop once and it\'s yours. After that, ring and I come zooming. Mostly on time.', 'Josh says my scooter is "a fire hazard". It\'s a fire FEATURE.', 'You\'re getting faster, old man. Still slow, though.'][(Math.random() * 3) | 0], h, v);
    });
  },
  rivalryStart() {
    return this.run(async () => {
      const josh = NPCs.find(n => n.kind === 'josh'), ren = NPCs.find(n => n.kind === 'renas'), jh = () => josh.head(), rh = () => ren.head();
      const jv = { voice: 1.3 }, rv = { voice: 1.7 };
      this.camTarget = { x: (josh.x + ren.x) / 2, y: ren.y - 80 }; this.zoomTo(1.05);
      await this.wait(0.5);
      this.punch(0.06, 5);
      await this.say('JOSH', 'RENAS. Where is my prototype battery?', jh, jv);
      await this.say('RENAS', 'Define "your".', rh, rv);
      await this.say('JOSH', 'It had my NAME on it. Engraved. In a font I designed.', jh, jv);
      SFX.scooter();
      await this.say('RENAS', 'And now it has a scooter on it. Way better font.', rh, rv);
      this.camTarget = { x: Player.x, y: Player.y - 60 }; this.zoomTo(1.25);
      await this.say('RENAS', 'Nathan! Settle this. Whose tech is better?', rh, rv);
      await this.say('JOSH', 'The drones in the Ventilation Shafts are full of Overcharged Capacitors. Bring me five and I\'ll overclock your baseballs.', jh, jv);
      await this.say('RENAS', 'OR bring them to ME and I turbo the scooter. Every drop-off comes with a free nitro boost. Your call, slowpoke.', rh, rv);
      qd().rivalry = 'active'; qd().caps = qd().caps || 0; saveGame();
    }).then(() => toast('SIDE QUEST · SIBLING RIVALRY · 5 CAPACITORS FROM THE VENT DRONES'));
  },
  async rivalryGive(who, inline) {
    const go = async () => {
      const q = qd(), josh = NPCs.find(n => n.kind === 'josh'), ren = NPCs.find(n => n.kind === 'renas');
      const jh = () => josh ? josh.head() : this.nathanHead(), rh = () => ren ? ren.head() : this.nathanHead();
      q.rivalry = who; q.caps = 0; saveGame(); applyUpgrades();
      const tgt = who === 'josh' ? josh : ren;
      if (tgt) { this.camTarget = { x: tgt.x, y: tgt.y - 70 }; this.impact(tgt.x, tgt.y - 30, who === 'josh' ? '#6fd3ff' : '#ff8a2a'); }
      SFX.unlock(); SFX.drill();
      if (who === 'josh') {
        await this.say('JOSH', 'FINALLY. Someone with taste. Hold still, this might sting your wallet.', jh, { voice: 1.3 });
        await this.say('RENAS', 'Whatever. My scooter\'s still faster than your whole personality.', rh, { voice: 1.7 });
      } else {
        await this.say('RENAS', 'YES! NITRO TIME! Shotgun forever!', rh, { voice: 1.7 });
        await this.say('JOSH', 'Unbelievable. I raised him. Partially.', jh, { voice: 1.3 });
      }
      this.afterScene = () => who === 'josh'
        ? showCard('SIBLING RIVALRY · JOSH', 'OVERCLOCKED BASEBALLS', 'Josh overclocked your gear. Kinetic Baseballs now pop with a small shockwave when they hit something, and Explosive Baseball blasts are 35% wider.', ['permanent upgrade'])
        : showCard('SIBLING RIVALRY · RENAS', 'NITRO DROP-OFFS', 'Renas turbo-charged the scooter. Every time he drops you off at a call bell, you get 6 seconds of blazing speed.', ['permanent upgrade', 'ring any call bell']);
    };
    const done = () => { if (this.afterScene) { const f = this.afterScene; this.afterScene = null; f(); } };
    if (inline) { await go(); setTimeout(done, 50); return; }
    return this.run(go).then(done);
  },

  /* ---------- Lars · The Great Cat Round-Up ---------- */
  catsRunAway() {
    return this.run(async () => {
      const lars = NPCs.find(n => n.kind === 'lars'), dan = NPCs.find(n => n.kind === 'daniel'), cats = NPCs.filter(n => n.kind === 'cat');
      const lh = () => lars.head(), dh = () => dan.head(), lv = { voice: 0.65 }, dv = { voice: 1.4 };
      this.camTarget = { x: (dan.x + lars.x) / 2, y: dan.y - 80 }; this.zoomTo(1.05);
      await this.wait(0.5);
      await this.say('DANIEL', 'Okay okay okay, this one is SMALL. Barely a sparkler. Watch—', dh, dv);
      SFX.fuse(); await this.wait(0.6);
      SFX.firework(); SFX.boom(); this.impact(dan.x + 40, dan.y - 60, '#ff4aa0');
      burst(dan.x + 40, dan.y - 60, 40, { colors: ['#ff4aa0', '#6fd3ff', GOLD, '#7dff9a'], maxSpeed: 520, grav: 300 });
      for (const c of cats) { c.sleepy = false; c.petT = 0; pop(c.x, c.y - 30, 'YOWL!', { size: 24, burst: false, color: BONE }); }
      SFX.purr();
      await Promise.all(cats.map((c, i) => { c.facing = i ? 1 : -1; return this.tween(c, 'x', c.x + (i ? 900 : -900), 0.9); }));
      for (const c of cats) c.gone = true;
      this.camTarget = { x: lars.x, y: lars.y - 60 }; this.zoomTo(1.3);
      await this.say('LARS', 'PEBBLE! GRIT! Ye great sooty lummox, look what ye\'ve done!', lh, lv);
      await this.say('DANIEL', 'In my defense, that was a LOT bigger than the label said.', dh, dv);
      this.camTarget = { x: (Player.x + lars.x) / 2, y: lars.y - 60 }; this.zoomTo(1.2);
      await this.say('LARS', 'Slugger. Me cats. Pebble loves a warm pipe, she\'ll be napping somewhere hot in the Foundry.', lh, lv);
      await this.say('LARS', 'Grit can\'t resist anything shiny. Mark me, he\'s off pawing crystals in the Geode Caverns.', lh, lv);
      await this.say('LARS', 'Bring \'em home and I\'ll forge ye somethin\' special. Rock and stone.', lh, lv);
      qd().cats = 'lost'; qd().catsFound = {}; saveGame();
    }).then(() => toast('SIDE QUEST · THE GREAT CAT ROUND-UP · CHECK THE DUGOUT CLIPBOARD'));
  },
  catFound(n) {
    return this.run(async () => {
      const ch = () => ({ x: n.x, y: n.y - 30 }), nh = () => this.nathanHead();
      Player.facing = sgn(n.x - Player.x) || 1; this.camTarget = { x: (Player.x + n.x) / 2, y: n.y - 50 }; this.zoomTo(1.35);
      SFX.purr(); for (let k = 0; k < 5; k++) spawnParticle({ x: n.x + rand(-8, 8), y: n.y - 24, vx: rand(-30, 30), vy: rand(-90, -50), life: 0.9, size: 3, color: '#ff9fb0', type: 'dot' });
      await this.say('NATHAN', n.cat === 'Pebble' ? 'There you are, Pebble. Lars is worried sick. …You\'re very warm.' : 'Grit! Quit batting the crystals, they\'re older than you.', nh);
      pop(n.x, n.y - 36, 'mrrp!', { size: 22, burst: false, color: '#ff9fb0' });
      await this.wait(0.4);
      SFX.whoosh(); n.facing = sgn(n.x - Player.x) || 1;
      await this.tween(n, 'x', n.x + n.facing * 700, 0.8); n.gone = true;
      qd().catsFound[n.cat] = 1; saveGame();
    }).then(() => { const k = Object.keys(qd().catsFound).length; toast(k >= 2 ? 'BOTH CATS FOUND · THEY\'RE HEADING HOME TO LARS' : `${n.cat.toUpperCase()} FOUND · ${k} / 2 · SHE\'S OFF HOME TO CAMP`.replace('SHE\'S', n.cat === 'Grit' ? 'HE\'S' : 'SHE\'S')); });
  },
  catsHome() {
    return this.run(async () => {
      const lars = NPCs.find(n => n.kind === 'lars'), lh = () => lars ? lars.head() : this.nathanHead(), lv = { voice: 0.65 };
      if (lars) { this.camTarget = { x: lars.x + 30, y: lars.y - 60 }; this.zoomTo(1.25); }
      SFX.purr(); await this.wait(0.5);
      await this.say('LARS', 'There\'s me wee rascals! Not a whisker singed. Ye\'ve a good heart, slugger.', lh, lv);
      await this.say('LARS', 'Now hold that bat still. I\'ve been savin\' a lump o\' cat-iron for a day like this.', lh, lv);
      for (let k = 0; k < 3; k++) { SFX.anvil(); if (lars) burst(lars.x + lars.facing * 26, lars.y - 30, 10, { color: GOLD, maxSpeed: 320, maxLife: 0.3 }); await this.wait(0.35); }
      this.impact(Player.x + Player.w / 2, Player.y + 10, GOLD);
      Save.data.up.heavy = true; qd().cats = 'done'; saveGame(); applyUpgrades();
      await this.say('LARS', 'The Heavy Swing charm. Big hits, bigger knockback. Rock and stone!', lh, lv);
    }).then(() => showCard('THE GREAT CAT ROUND-UP', 'HEAVY SWING CHARM', 'Lars forged a cat-shaped iron charm onto your bat. Enemies get knocked back 60% further, and you can bat back big projectiles that were too heavy to hit before, like Fionn\'s giant boulders.', ['permanent upgrade']));
  },

  /* ---------- Byte · Hardware Upgrade ---------- */
  byteTalk(n) {
    return this.run(async () => {
      const q = qd(), h = () => n.head(), nh = () => this.nathanHead(), boards = Quests.count('boards');
      Player.facing = sgn(n.x - Player.x) || 1; this.camTarget = { x: (Player.x + n.x) / 2, y: n.y - 50 }; this.zoomTo(1.3);
      if (!q.byte) {
        SFX.staticBuzz(0.6);
        await this.say('BYTE', '[BOOT… BOOT… BOOT FAILED]', h, BYTE_V);
        await this.say('BYTE', '[ERROR: USER_SKILL_NOT_FOUND]', h, BYTE_V);
        await this.say('NATHAN', 'Rude. Are you one of Josh\'s drones?', nh);
        await this.say('BYTE', '[FORMER OWNER: JOSH. STATUS: ABANDONED. FEELINGS: 404]', h, BYTE_V);
        await this.say('BYTE', '[REQUEST: 3x SCRAP MOTHERBOARD. SOURCE: ELITE ENEMIES. LOOK FOR THE GOLDEN GLOW]', h, BYTE_V);
        await this.say('NATHAN', 'If I fix you, do you stop insulting me?', nh);
        await this.say('BYTE', '[ERROR: CANNOT PROMISE THAT]', h, BYTE_V);
        q.byte = 'met'; n.prompt = 'BYTE'; saveGame();
        return;
      }
      if (boards < 3) { await this.say('BYTE', `[MOTHERBOARDS: ${boards}/3. PROGRESS: DISAPPOINTING. ELITES GLOW GOLD. HIT THOSE]`, h, BYTE_V); return; }
      // the repair
      SFX.drill();
      for (let k = 0; k < 3; k++) { burst(n.x, n.y - 22, 14, { colors: ['#50dc78', GOLD, '#6fd3ff'], maxSpeed: 320 }); SFX.clang(); addShake(4); await this.wait(0.35); }
      this.impact(n.x, n.y - 22, '#50dc78');
      q.byte = 'fixed'; saveGame();
      Quests.buddy = new ByteBuddy(); Quests.buddy.x = n.x; Quests.buddy.y = n.y - 22; NPCs.push(Quests.buddy); n.gone = true;
      const bh = () => ({ x: Quests.buddy.x, y: Quests.buddy.y - 20 });
      await this.wait(0.5);
      await this.say('BYTE', '[REBOOT COMPLETE. HELLO, USER]', bh, BYTE_V);
      await this.say('BYTE', '[NEW DIRECTIVE: FOLLOW NATHAN. COLLECT BOLTS. ZAP ANYTHING THAT FLIES]', bh, BYTE_V);
      await this.say('NATHAN', 'Aw. You like me.', nh);
      await this.say('BYTE', '[ERROR: FEELING NOT FOUND] … [FOUND IT. MILD]', bh, BYTE_V);
    }).then(() => { if (qd().byte === 'fixed' && !qd().byteCard) { qd().byteCard = 1; saveGame(); showCard('HARDWARE UPGRADE', 'BYTE JOINS YOU', 'Byte now hovers beside you everywhere you go. It pulls in Scrap Bolts from far away and zaps flying enemies every couple of seconds.', ['companion']); } });
  },

  /* ---------- Pip & Squeak · VIP Access ---------- */
  scalpersMeet(n) {
    return this.run(async () => {
      const ph = () => ({ x: n.x, y: n.y - 76 }), sh = () => ({ x: n.x, y: n.y - 42 }), nh = () => this.nathanHead(), pv = { voice: 1.1 }, sv = { voice: 1.9 };
      Player.facing = sgn(n.x - Player.x) || 1; this.camTarget = { x: (Player.x + n.x) / 2, y: n.y - 60 }; this.zoomTo(1.3);
      await this.say('PIP', 'Psst. PSST. Hey, kid. Over here. In the coat.', ph, pv);
      await this.say('SQUEAK', 'We are definitely one tall adult man.', sh, sv);
      await this.say('NATHAN', '…You\'re two little shadow guys in a trench coat.', nh);
      await this.say('PIP', 'Rude AND correct. I\'m Pip. Bottom half\'s Squeak. Reshman\'s cousins. Twice removed. Once from a concert.', ph, pv);
      await this.say('SQUEAK', 'We deal in VIP merch. Badges. The good stuff. No bolts though. Bolts are for squares.', sh, sv);
      this.zoomTo(1.4);
      await this.say('PIP', 'Golden Stubs. Rare tickets, hidden in the nastiest climbs in the Spire. Bring \'em to us and we\'ll hook you up.', ph, pv);
      qd().scalpers = true; n.vendor = 'scalpers'; n.prompt = 'VIP'; saveGame();
    }).then(() => toast(`SIDE QUEST · VIP ACCESS · GOLDEN STUBS ${stubsFound()} / ${STUB_TOTAL}`));
  },

  /* ---------- The Grounds-Keeper's flashbacks ---------- */
  keeperTalk(n) {
    return this.run(async () => {
      const q = qd(), k = q.keeper || 0, h = () => n.head(), nh = () => this.nathanHead();
      Player.facing = sgn(n.x - Player.x) || 1; this.camTarget = { x: (Player.x + n.x) / 2, y: n.y - 90 }; this.zoomTo(1.15);
      n.stop = true; await this.wait(0.6);
      if (k >= 3) { await this.say('GROUNDS-KEEPER', '…', h, { voice: 0.4 }); n.stop = false; await this.say('NATHAN', '(He just nods, and keeps sweeping.)', nh); return; }
      await this.tween(n, 'lift', 1, 0.5); SFX.staticBuzz(0.3);
      await this.say('GROUNDS-KEEPER', '…', h, { voice: 0.4 });
      Quests.flash = { n: k, t: 0 }; SFX.crowd(1.6);
      await this.wait(6.2);
      Quests.flash = null; q.keeper = k + 1; saveGame();
      await this.tween(n, 'lift', 0, 0.4); n.stop = false;
      await this.say('NATHAN', ['(…A scoreboard. Bottom of the ninth. Why does he have that?)', '(Strike three. I remember the silence after.)', '(That\'s my bat. That\'s MY swing. What did I do?)'][k], nh, { color: '#e6d6ff' });
    }).then(() => { n.stop = false; n.lift = 0; Quests.flash = null; });
  },
});

/* ---------- Milo · Damage Control, and Deniz · Ultimate Chill (wrap their camp chats) ---------- */
const _qMiloCamp = Story.miloCamp, _qDenizTea = Story.denizTea;
Story.miloCamp = function (n) {
  const q = qd();
  if (q.milo === 'done') return _qMiloCamp.call(this, n);
  return this.run(async () => {
    const h = () => n.head(), nh = () => this.nathanHead(), v = { voice: 1.2 }, sealed = Quests.count('books');
    Player.facing = sgn(n.x - Player.x) || 1;
    if (!q.milo) {
      this.zoomTo(1.25);
      await this.say('MILO', 'Okay, so. Small confession. Tiny. Itsy.', h, v);
      await this.say('MILO', 'I left four of my old spellbooks lying around the Spire. Cursed ones. They\'re making little tornadoes. And lightning. Rogue lightning.', h, v);
      await this.say('NATHAN', 'On purpose?', nh);
      SFX.thunder(); this.punch(0.07, 6);
      await this.say('MILO', 'NOT on purpose! Whack each one with your bat a few times and it\'ll seal shut. Probably. Please hurry.', h, v);
      q.milo = 'active'; saveGame(); return;
    }
    if (sealed < 4) { await this.say('MILO', `${sealed} of 4 sealed. The other ${4 - sealed} are still out there. I can hear them giggling.`, h, v); return; }
    this.zoomTo(1.35);
    await this.say('MILO', 'All four! You absolute legend. Okay, hold still. I\'ve been saving this one.', h, v);
    SFX.laserCharge(); await this.wait(0.6);
    SFX.thunder(); this.impact(Player.x + Player.w / 2, Player.y + Player.h, '#9fe6ff');
    Save.data.up.uppercut = true; q.milo = 'done'; saveGame();
    await this.say('MILO', 'Storm Uppercut! Point up, dash, and the storm throws you skyward. On purpose, this time.', h, v);
  }).then(() => { if (q.milo === 'done' && !q.upperCard) { q.upperCard = 1; saveGame(); showCard('DAMAGE CONTROL', 'STORM UPPERCUT', 'Hold up and press dash to launch straight up in a crackling uppercut that hits anything above you. Reach high ledges without a wall to kick off. Once per jump; it refreshes when you land or grab a wall.', [`hold <kbd>${Bindings.label('up')}</kbd> + <kbd>${Bindings.label('dash')}</kbd>`]); } else if (q.milo === 'active' && !Quests.count('books')) toast('SIDE QUEST · DAMAGE CONTROL · SEAL 4 CURSED SPELLBOOKS'); });
};
Story.denizTea = function (n) {
  const q = qd(), D = Save.data;
  if (!D.teaDrunk || q.deniz === 'done') return _qDenizTea.call(this, n);
  return this.run(async () => {
    const h = () => n.head(), nh = () => this.nathanHead(), v = { voice: 0.7 }, got = Quests.count('herbs'), P = Player;
    P.facing = sgn(n.x - P.x) || 1;
    if (!q.deniz) {
      await this.say('DENIZ', 'Duuude. The energy in this Spire? Terrible. Like, cosmically crunchy.', h, v);
      await this.say('DENIZ', 'I wanna brew the ULTIMATE chill tea. But I need three rare herbs.', h, v);
      this.zoomTo(1.3);
      await this.say('DENIZ', 'Fire Mint, over the lava at the Quarry Mouth. Thunder Chamomile, up in the Storm Atrium greenhouse. And Frostleaf, frozen solid in the Glacier Crown.', h, v);
      await this.say('NATHAN', 'Lava, lightning and ice. Super chill.', nh);
      await this.say('DENIZ', 'Right?! Peace and love, bro.', h, v);
      q.deniz = 'active'; saveGame(); return;
    }
    if (got < 3) {
      await this.say('DENIZ', `${got} of 3 herbs, man. The kettle believes in you. So do I. Mostly the kettle.`, h, v);
      P.hype = P.hypeMax || 99; SFX.heal(); pop(P.x + 11, P.y - 26, 'HYPE REFILLED', { size: 24, color: '#9fe6ff', burstColor: '#2a4a66' });
      return;
    }
    await this.say('DENIZ', 'Bro… you got them all. Okay. Okay. Shh. Let it steep.', h, v);
    for (let k = 0; k < 3; k++) { spawnParticle({ x: n.x + 30, y: n.y - 30, vx: 0, vy: -40, life: 1.4, size: 10, color: 'rgba(243,234,216,.4)', type: 'puff', drag: 1 }); await this.wait(0.4); }
    this.impact(P.x + P.w / 2, P.y + 10, '#9fe6ff');
    D.up.chillTea = true; q.deniz = 'done'; P.shield = Math.max(P.shield, 1); HUD.hpPop = true; saveGame();
    await this.say('DENIZ', 'Ultimate Chill. Every time you rest here at camp, the calm sticks to you like a little blue shield.', h, v);
  }).then(() => { if (q.deniz === 'done' && !q.teaCard2) { q.teaCard2 = 1; saveGame(); showCard('ULTIMATE CHILL', 'BLUE SHIELD HEART', 'Deniz upgraded his tea lounge. Every time you rest at the Base Camp bench, you gain a Blue Shield Heart that blocks the next hit.', ['permanent buff']); } else if (q.deniz === 'active' && !Quests.count('herbs')) toast('SIDE QUEST · ULTIMATE CHILL · FIND 3 RARE HERBS'); });
};
