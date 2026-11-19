'use strict';
/* =========================================================
   ACT I STORY: Lars · Reshman #2 · Adam · Renas · Daniel
   (extends the Story system from zone/story.js)
   ========================================================= */
Object.assign(Story, {
  larsScene(n) {
    return this.run(async () => {
      const P = Player, D = Save.data, h = () => n.head(), nh = () => this.nathanHead();
      P.facing = sgn(n.x - P.x) || -1;
      this.camTarget = { x: (P.x + n.x) / 2, y: n.y - 90 }; this.zoomTo(1.2);
      await this.wait(1.1);
      n.forge = false; n.facing = sgn(P.x - n.x) || 1; n.fixed = false;
      await this.say('LARS', 'Rock and stone! Watch where you\'re swinging that toothpick, slugger. You\'re scaring the cats.', h, { voice: 0.65 });
      await this.say('NATHAN', 'Toothpick?! This bat is a legend.', nh);
      await this.say('LARS', 'Aye, legendary flimsy. Name\'s Lars. Ginger one\'s Pebble. Grumpy one\'s Grit.', h, { voice: 0.65 });
      await this.say('LARS', 'Bring me Scrap Bolts and Raw Titanium Ore, and I\'ll hammer that stick into somethin\' worth swingin\'.', h, { voice: 0.65 });
      // he cracks the vein: a free chunk of ore
      n.facing = -1; n.fixed = true; n.forge = true; await this.wait(0.8);
      SFX.anvil(); SFX.crystal(); Act.vein = false; this.impact(A.vein.x + 30, A.vein.y + 120, '#bff3ff');
      burst(A.vein.x + 30, A.vein.y + 120, 22, { colors: ['#bff3ff', '#9fd8e8', GOLD], maxSpeed: 440 });
      n.forge = false;
      D.ores.lars = 1; D.ore++; D.lars = true; saveGame();
      pop(P.x + 11, P.y - 30, '+1 TITANIUM', { size: 30, color: '#bff3ff', burstColor: '#2a4a66' }); SFX.coin();
      n.facing = sgn(P.x - n.x) || 1;
      await this.say('LARS', 'There. A freebie. I\'ll haul my anvil up to that camp of yours. The cats like campfires.', h, { voice: 0.65 });
      await this.say('LARS', 'Titanium hides in the nasty spots, mind. Over lava, under fans, that sort o\' thing.', h, { voice: 0.65 });
      SFX.poof(); burst(n.x, n.y - 24, 24, { colors: ['#4a3324', '#7a5232', '#2a1a16'], type: 'puff', maxSpeed: 220, minSize: 6, maxSize: 14, maxLife: 0.9, drag: 2 });
      n.gone = true; this.punch(0.04, 4); await this.wait(0.6);
    }).then(() => { toast('LARS JOINED BASE CAMP · BAT UPGRADES AT HIS ANVIL'); themeCheck(); });
  },

  reshmanScene(r) {   // Reshman sighting #2, behind the spark falls
    return this.run(async () => {
      r.startled = 0.6; SFX.blorp(); Player.facing = sgn(r.x - Player.x) || 1;
      Save.data.reshman2 = true; saveGame();
      this.twoShot(Player, r, 1.22, 50);
      // the spark falls hiss around him while he talks
      const sparks = k => { for (let i = 0; i < k; i++) spawnParticle({ x: r.x + rand(-60, 60), y: r.y - rand(80, 140), vx: rand(-30, 30), vy: rand(80, 220), grav: 700, life: rand(0.5, 0.9), size: rand(2, 3.5), color: i % 2 ? GOLD : FLAME, type: 'spark' }); };
      sparks(14);
      await this.wait(0.4);
      const h = () => r.head();
      this.zoomTo(1.36);
      await this.say('RESHMAN', '…blorp.', h, { voice: 0.45 });
      sparks(14); this.zoomTo(1.48);
      await this.say('RESHMAN', 'Sparks are a great hiding spot. You still can\'t see me.', h, { voice: 0.5 });
      this.shadowPuff(r.x, r.y - 14); this.punch(0.06, 4); sparks(20);
      r.gone = true;
      NPCs.push(new MapPaper(r.x, r.y, collectMapZ2)); SFX.paper();
      this.zoomTo(1.15);
      await this.wait(0.9);
    });
  },

  adamIntro(a) {
    return this.run(async () => {
      const P = Player, h = () => ({ x: a.x + a.w / 2, y: a.y - 18 }), nh = () => this.nathanHead();
      setLock(A.adamLock, true); SFX.gate(); this.punch(0.06, 8);
      this.camTarget = { x: (P.x + a.x) / 2 + 40, y: a.y - 30 };
      a.facing = -1; P.facing = 1;
      await this.wait(0.8);
      await this.say('ADAM', 'Took you long enough.', h, { voice: 1.1 });
      await this.say('NATHAN', 'ADAM! You\'re okay! Wait… you\'re not evil, right?', nh);
      this.zoomTo(1.26); await this.say('ADAM', 'Evil? Please. I\'m just better than you.', h, { voice: 1.1 });
      a.pose = 'serve'; SFX.serve(); this.lines = 0.9; this.linesAt = h(); this.punch(0.08, 6); this.zoomTo(1.34);
      await this.say('ADAM', 'I\'m not letting you reach the finals before me, Nathan. Warm-up match. Right now!', h, { voice: 1.1 });
      await racketTrick(this, a, '#fff27a');   // two bounces, a toss, the slam (zone/boss-anims.js)
      a.pose = 'idle';
    }).then(() => {
      BossBar.show('ADAM · THE RIVAL'); a.begin();
      pop(a.x + a.w / 2, a.y - 40, 'MATCH START!', { size: 44 }); SFX.drill();
      setTimeout(() => toast('TIP · SWING AT HIS SERVE TO HIT IT BACK'), 1500);
    });
  },

  adamDefeat(a) {
    return this.run(async () => {
      const P = Player, D = Save.data, h = () => ({ x: a.x + a.w / 2, y: a.y - 10 }), nh = () => this.nathanHead();
      BossBar.flash(); SFX.bossDie(); a.pose = 'kneel';
      this.impact(a.x + a.w / 2, a.y + a.h / 2, '#9be36a');
      pop(a.x + a.w / 2, a.y - 30, 'GAME, SET!', { size: 46, life: 1.4 });
      this.camTarget = { x: (P.x + a.x) / 2, y: a.y - 20 }; this.zoomTo(1.3);
      // he kneels, panting, sweat flicking off
      for (let i = 0; i < 6; i++) { spawnParticle({ x: a.x + a.w / 2 + rand(-8, 8), y: a.y + 6, vx: rand(-90, 90), vy: rand(-160, -80), grav: 700, life: 0.6, size: 2.5, color: '#bfe8ff', type: 'dot' }); await this.wait(0.2); }
      await this.say('ADAM', '*huff*… *huff*…', h, { voice: 1.0 });
      await this.say('ADAM', 'Wind was in my eyes. Next time, it\'s match point.', h, { voice: 1.1 });
      this.zoomTo(1.08);
      a.state = 'off'; a.pose = 'air'; SFX.whoosh(); dust(a.x + a.w / 2, a.y + a.h, 10); ring(a.x + a.w / 2, a.y + a.h, 6, 70, 0.4, BONE, 4);
      await this.tween(a, 'y', a.y - 760, 0.55);
      a.dead = true; Zone.boss = null;
      this.zoomTo(1.25);
      await this.say('NATHAN', '…Show-off.', nh);
      dropBolts(A.adam.x, A.adam.y - 30, 25);
      setLock(A.adamLock, false); D.adamDead = true; saveGame(); BossBar.hide();
    }).then(() => { toast('RIVAL DUEL WON · THE ELEVATOR IS UNLOCKED'); themeCheck(); });
  },

  renasIntro() {
    return this.run(async () => {
      const P = Player, D = Save.data, room = ROOM.v_intake.px, nh = () => this.nathanHead();
      const r = { x: room.x + room.w + 60, y: 65 * TILE, facing: -1, moving: true, t: 0 };
      Act.renas = r; SFX.scooter();
      this.camTarget = { x: P.x + 160, y: P.y - 40 }; this.zoomTo(1.16);
      // the scooter screams in, spitting sparks off the floor
      const sparks = setInterval(() => { if (r.moving) burst(r.x + 18, r.y - 4, 3, { colors: [GOLD, FLAME, BONE], angle: -Math.PI / 2 + 0.9, spread: 0.5, maxSpeed: 300, maxLife: 0.3 }); }, 40);
      await this.tween(r, 'x', P.x + 150, 1.0);
      r.moving = false; dust(r.x, r.y, 10); SFX.land(); this.punch(0.06, 7); ring(r.x, r.y, 8, 80, 0.35, BONE, 4);
      const h = () => ({ x: r.x, y: r.y - 66 });
      P.facing = 1;
      this.zoomTo(1.26);
      await this.say('RENAS', 'Whoa! A real human! Not a robot! Sick.', h, { voice: 1.7 });
      await this.say('NATHAN', '…Who are you?', nh);
      await this.say('RENAS', 'Renas. Josh\'s little brother. The cool one. This scooter? Built it out of his drones.', h, { voice: 1.7 });
      await this.say('RENAS', 'Catch me if you can, slowpoke! Tell Josh his security system sucks!', h, { voice: 1.7 });
      r.facing = 1; r.moving = true; SFX.scooter(); this.lines = 0.7; this.linesAt = { x: r.x, y: r.y - 30 }; this.zoomTo(1.1);
      await this.tween(r, 'x', room.x + room.w + 220, 0.8);
      clearInterval(sparks);
      D.renasMet = true; saveGame();
    }).then(() => toast('CHASE RENAS THROUGH THE WIND TUNNEL →'));
  },

  chaseEnd() {
    return this.run(async () => {
      const P = Player, D = Save.data, r = Act.renas, nh = () => this.nathanHead();
      r.moving = false; r.facing = -1; dust(r.x, r.y, 12); SFX.land();
      // the scooter skids to a stop in a spray of sparks
      SFX.clang(); this.punch(0.07, 8); ring(r.x, r.y, 8, 90, 0.4, BONE, 4);
      burst(r.x - 10, r.y - 4, 22, { colors: [GOLD, FLAME, BONE], angle: -Math.PI / 2 - 0.9, spread: 0.6, maxSpeed: 420, maxLife: 0.4 });
      const h = () => ({ x: r.x, y: r.y - 66 });
      this.camTarget = { x: (P.x + r.x) / 2, y: r.y - 80 }; this.zoomTo(1.2);
      await this.wait(0.5);
      await this.say('RENAS', 'Okay, OKAY. You\'re fast. For an old guy.', h, { voice: 1.7 });
      this.twoShot(P, null, 1.36, 60);
      await this.say('NATHAN', 'I\'m like two years older than you.', nh);
      this.camTarget = { x: (P.x + r.x) / 2, y: r.y - 80 }; this.zoomTo(1.22);
      await this.say('RENAS', 'Ancient. Fine — every Scooter Call Bell is a stop. Pay the fare once and that stop rides free forever.', h, { voice: 1.7 });
      await this.say('RENAS', 'Ring it and I\'ll zoom you anywhere you\'ve been. Mostly safely.', h, { voice: 1.7 });
      // a call bell rings somewhere, as if on cue
      SFX.bell(); ring(r.x, r.y - 40, 10, 80, 0.6, GOLD, 3);
      await this.say('RENAS', 'Need a map of the vents? That creepy blob guy sells them. He\'s hiding in the Turbine Hall.', h, { voice: 1.7 });
      D.chase = true; D.bells.z1 = 1; D.bells.z2 = 1; D.bells.z3 = 1; saveGame();
      r.facing = 1; r.moving = true; SFX.scooter(); this.zoomTo(1.08);
      this.lines = 0.7; this.linesAt = { x: r.x, y: r.y - 30 };
      const trail = setInterval(() => { if (r.moving) burst(r.x - 14, r.y - 4, 3, { colors: [GOLD, FLAME], angle: Math.PI, spread: 0.5, maxSpeed: 260, maxLife: 0.3 }); }, 40);
      await this.tween(r, 'x', r.x + 700, 0.9);
      clearInterval(trail);
      Act.renas = null;
    }).then(() => {
      themeCheck();
      showCard('NEW ABILITY', 'FAST TRAVEL', 'Ring a Scooter Call Bell and Renas zooms you to any zone whose bell you\'ve found: Base Camp, the Quarry Mouth, right here, and one more somewhere in the Foundry.',
        [`<kbd>${Bindings.label('up')}</kbd> at a call bell`]);
    });
  },

  danielIntro(d) {
    return this.run(async () => {
      const P = Player, h = () => ({ x: d.fx, y: d.fy - 62 }), nh = () => this.nathanHead();
      setLock(A.danielLock, true); SFX.gate(); this.punch(0.06, 8);
      this.camTarget = { x: (P.x + d.fx) / 2, y: d.fy - 60 }; this.zoomTo(1.18);
      // rockets popping over the factory while he talks
      const sky = () => { const x = d.fx + rand(-260, 260), y = d.fy - rand(200, 320), c = ['#ff4aa0', '#6fd3ff', GOLD, '#7dff9a'][(Math.random() * 4) | 0];
        burst(x, y, 30, { colors: [c, BONE], maxSpeed: 340, grav: 260, maxLife: 1.1, drag: 2 }); ring(x, y, 4, 70, 0.5, c, 3); SFX.firework(); };
      await this.wait(0.8); sky();
      await this.say('DANIEL', 'NATHAN! Buddy! You found my FACTORY!', h, { voice: 1.4 });
      sky();
      await this.say('NATHAN', 'Daniel? Why is everything on fire?', nh);
      sky(); sky(); this.zoomTo(1.3); this.punch(0.07, 6);
      await this.say('DANIEL', 'Evil Adam gave me UNLIMITED GUNPOWDER to "improve the Spire\'s defenses." Best. Day. EVER.', h, { voice: 1.4 });
      sky();
      await this.say('DANIEL', 'Wait till you see the grand finale, Nathan! Every bomb\'s got a lucky one in there somewhere!', h, { voice: 1.4 });
      SFX.boom(); this.impact(d.fx, d.fy - 40, '#ff4aa0');
    }).then(() => {
      BossBar.show('DANIEL · THE PYROMANIAC'); d.begin();
      setTimeout(() => toast('TIP · SMACK THE GLOWING GREEN LUCKY BOMBS BACK INTO HIS CANNON'), 9000);
    });
  },

  danielFinale(d) {
    return this.run(async () => {
      const P = Player, D = Save.data, h = () => ({ x: d.fx, y: d.fy - 62 }), nh = () => this.nathanHead();
      BossBar.flash(); FX.length = 0; Hazards.length = 0;
      this.camTarget = { x: A.cannonMouth.x + 40, y: A.cannonMouth.y - 40 }; this.zoomTo(1.22);
      for (let k = 0; k < 9; k++) {
        const x = A.cannonMouth.x + rand(-20, 120), y = A.cannonMouth.y + rand(-40, 30);
        burst(x, y, 26, { colors: ['#ff4aa0', '#6fd3ff', GOLD, '#7dff9a', BONE], maxSpeed: 620, grav: 500, maxLife: 1.2, type: 'debris' });
        SFX.confetti(); if (k % 3 === 0) { SFX.boom(); this.impact(x, y, ['#ff4aa0', '#6fd3ff', GOLD][k / 3]); }
        await this.wait(0.16);
      }
      d.cannonGone = true; d.setPos(A.danielFloor.x, A.danielFloor.y);
      pop(A.cannonMouth.x + 50, A.cannonMouth.y - 40, 'GRAND FINALE!', { size: 50, life: 1.6, burstColor: '#ff4aa0' });
      for (let k = 0; k < 14; k++) spawnParticle({ x: A.cannonMouth.x + 50 + rand(-40, 40), y: A.cannonMouth.y, vx: rand(-60, 60), vy: rand(-80, -20), life: rand(1, 1.8), size: rand(10, 20), color: 'rgba(60,50,60,.6)', type: 'puff', drag: 1 });
      // falling confetti over the whole arena
      for (let k = 0; k < 70; k++) spawnParticle({ x: A.cannonMouth.x + rand(-500, 500), y: A.cannonMouth.y - rand(150, 400), vx: rand(-40, 40), vy: rand(20, 90), vr: rand(-8, 8), grav: 60, life: rand(2, 3.4), size: rand(3, 6), color: ['#ff4aa0', '#6fd3ff', GOLD, '#7dff9a', BONE][k % 5], type: 'debris', drag: 0.6 });
      SFX.bossDie(); BossBar.hide();
      this.camTarget = { x: (P.x + d.fx) / 2, y: d.fy - 60 }; this.zoomTo(1.28);
      await this.wait(1.4);
      await this.say('DANIEL', '…', h, { voice: 1.4 });
      this.punch(0.1, 8); SFX.firework(); burst(d.fx, d.fy - 70, 24, { colors: ['#ff4aa0', GOLD, '#6fd3ff'], maxSpeed: 380 });
      await this.say('DANIEL', 'THAT. WAS. AMAZING!', h, { voice: 1.5 });
      this.zoomTo(1.16);
      await this.say('NATHAN', 'You okay? You\'re, like, completely covered in soot.', nh);
      await this.say('DANIEL', 'Never better! I\'m coming with you. Base Camp NEEDS a fireworks stand. Trust me.', h, { voice: 1.4 });
      SFX.poof(); burst(d.fx, d.fy - 30, 30, { colors: ['#2b2228', '#4a3d5c', '#ff4aa0', GOLD], type: 'puff', maxSpeed: 260, minSize: 6, maxSize: 16, maxLife: 1, drag: 2 });
      d.gone = true; d.dead = true; Zone.boss = null;
      dropBolts(d.fx, d.fy - 30, 40);
      setLock(A.danielLock, false); D.danielDead = true; D.actCleared = true; saveGame();
      await this.wait(0.8);
    }).then(() => {
      themeCheck(800);
      showCard('ACT I COMPLETE', 'DANIEL JOINED CAMP', 'Daniel set up a fireworks stand at Base Camp, next to Josh and Lars. Ring a call bell, ride back, and see what he\'s selling… those cracked floorboards at the Crash Site won\'t blow themselves up.',
        ['ring a Scooter Call Bell', 'visit Daniel at Base Camp']);
    });
  },

  elevator(dir) {   // ride the Quarry Elevator up to the vents (or back down)
    return this.run(async () => {
      SFX.gate(); addShake(5);
      Act.lift = { t: 0, dir };
      // the cage lurches, chains rattle, sparks fall off the pulleys
      const P = Player;
      this.twoShot(P, null, 1.18, 50); SFX.clang();
      for (let k = 0; k < 4; k++) {
        burst(P.x + P.w / 2 + rand(-60, 60), P.y - rand(60, 120), 6, { colors: [GOLD, FLAME, BONE], maxSpeed: 220, grav: 900, maxLife: 0.5 });
        addShake(3); SFX.tick(); await this.wait(0.12);
      }
      this.zoomTo(1.3); this.punch(0.04, 6);
      Game.fadeTarget = 1; await this.wait(0.9);
      const to = dir > 0 ? { pos: A.arriveV, room: 'v_intake' } : { pos: A.arriveQ, room: 'q_elevator' };
      const hp = Player.hp; Player.reset(to.pos, true); Player.hp = hp; enterRoom(ROOM[to.room]); snapCamera();
      // arrive with a clunk
      this.zoom = 1.3; this.zoomTo(1.05);
      Game.fadeTarget = 0; Act.lift = null; SFX.gate(); this.punch(0.05, 7);
      dust(Player.x + Player.w / 2, Player.y + Player.h, 10);
      await this.wait(0.6);
    });
  },
});
