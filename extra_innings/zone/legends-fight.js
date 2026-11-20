'use strict';
/* =========================================================
   THE HALL OF LEGENDS · the fights (act3.html only)
   Every match runs on the Colosseum's own cup machinery (COLO in
   zone/gauntlets.js), with the Hall taking over while LG.on:
   · its own spawner: story-strength bosses (Rookie), +30% HP and
     ×1.2 speed (All-Star, Grand Slam), the dream versions, the
     new bosses; the Rogue Server, Evil Adam and Zennith borrow
     their old arenas' anchors for the length of the fight
   · All-Star: every hit costs 2 HP · Grand Slam: one hit and out
   · the bindings, enforced every frame while a fight runs
   · halfway through a cup: the seventh-inning stretch (Hype
     fountain, Golden Dugout Bench, the Golden Dugout shields)
   · losing never costs a death, a shattered save or your map:
     you're flashed back to the gate you came from
   ========================================================= */
if (PAGE.id === 'z9' && typeof COLO !== 'undefined' && typeof ROOM !== 'undefined' && ROOM.t_colo) {
  const LG_PAL = { a: '#e9e2d2', b: '#ddd4c0', top: '#f2c14e', top2: '#e6dcc6', side: '#cfc4ab', plank: '#c9a33a', plankHi: '#ffe08a', spike: '#f3ead8', vein: null, crystal: null, rivet: null, fog: '255,236,200' };
  const LG_AKEYS = ['daniel', 'cannonMouth', 'danielFloor', 'fionn', 'milo', 'denizSeat', 'denizFloor', 'courtFloor', 'net', 'evil', 'coreFloor', 'zennith'];
  const dreamIce = () => { if (DR.ice) { Object.assign(TUNE, DR.ice); DR.ice = null; } };

  /* ---------- borrowed arenas: the old bosses read their rooms and anchors, so point them at the Colosseum ---------- */
  function lgProxy() {
    if (LG.snap) return;
    LG.snap = { room: { server: ROOM.server, t_court: ROOM.t_court, z_core: ROOM.z_core }, A: {}, act3: { trophies: Act3.trophies, reshmanUsed: Act3.reshmanUsed } };
    for (const k of LG_AKEYS) LG.snap.A[k] = A[k];
    ROOM.server = ROOM.t_colo; ROOM.t_court = ROOM.t_colo; ROOM.z_core = ROOM.t_colo;
  }
  function lgUnproxy() {
    const S = LG.snap; if (!S) return;
    for (const k in S.room) { if (S.room[k]) ROOM[k] = S.room[k]; else delete ROOM[k]; }
    for (const k in S.A) { if (S.A[k] === undefined) delete A[k]; else A[k] = S.A[k]; }
    Object.assign(Act3, S.act3, { grav: 'normal', gravWarn: false, slowT: 0, shatter: 0, dark: 0, trophiesBroken: 0, assist: null, buddy: null });
    Player.gravK = 1; LG.snap = null;
  }
  function lgEnforce() {
    const P = Player;
    if (lgBind('wood')) P.batDmg = 1;
    if (lgBind('cap')) { P.maxHp = 4; if (P.hp > 4) P.hp = 4; }
    if (lgBind('hype')) { const m = TUNE.healCost || 33; P.hypeMax = m; if (P.hype > m) P.hype = m; }
  }
  function lgSpeed(b, sp) {
    if (!sp || sp === 1) return;
    const raw = b.update; b.update = function (dt) { return raw.call(this, dt * (/Wind|Hold|Warn|warn|Aim|aim/.test(this.state || '') ? 1 : sp)); };   // faster, but windups stay readable
  }
  function lgCleanup() {
    const L = LG.F; LG.F = null; LG.binds = null;
    DR.on = false; DR.fx = null; dreamIce();
    lgUnproxy();
    FX.length = 0; Hazards.length = 0; for (const b of Bolts) b.dead = true;
    if (Zone.boss) { Zone.boss.dead = true; Zone.boss = null; } BossBar.hide();
    try { applyUpgrades(); } catch (e) { logErr('legends: upgrades', e); }
    if (L && L.sh0 !== undefined) Player.shield = Math.min(Player.shield || 0, L.sh0);
    return L;
  }
  // back to the gate you came from, healed, with the hall rebuilt around you
  function lgPlace() {
    const p = LG.gate || lgSpot(LG_X.gates[0]);
    Player.reset(p, true); applyUpgrades(); Player.hp = Player.maxHp; Player.facing = 1; Player.invuln = 1;
    enterRoom(roomAt(p.x, p.y - TILE) || ROOM.t_colo); snapCamera(); HUD.hpPop = true;
  }
  function lgReturn(msg, after) {
    Gaunt.warping = true; Input.enabled = false; Game.fadeTarget = 1;
    setTimeout(() => {
      try { lgPlace(); } catch (e) { logErr('legends: return', e); }
      Game.fade = 1; Game.fadeTarget = 0; Input.enabled = true; Gaunt.warping = false;
      if (msg) toast(msg);
      if (after) setTimeout(after, 500);
    }, 520);
  }

  /* ---------- starting a match ---------- */
  function lgFight(cfg) {
    if (COLO.F || LG.F || Story.active || Gaunt.warping) return;
    closeModal();
    LG.gate = { x: Player.x + Player.w / 2, y: Player.y + Player.h };
    Gaunt.warping = true; Input.enabled = false; Game.fadeTarget = 1; SFX.gate();
    setTimeout(() => {
      Gaunt.warping = false; Input.enabled = true;
      try {
        Player.reset(lgSpot(250), true); Player.facing = 1;
        if (Zone.room !== ROOM.t_colo) enterRoom(ROOM.t_colo);   // the gates are in the wing; the matches are played in the ring
        NPCs.length = 0; Enemies.length = 0; Bolts.length = 0; FX.length = 0; Hazards.length = 0;
        lgProxy();
        LG.F = Object.assign({ rested: false, sh0: Player.shield || 0 }, cfg, { restAt: cfg.kind === 'cup' ? Math.floor(cfg.list.length / 2) : 0 });
        LG.binds = cfg.binds || {};
        applyUpgrades(); lgEnforce(); Player.hp = Player.maxHp; HUD.hpPop = true;
        COLO.F = { cup: { key: 'legends', name: cfg.name, color: cfg.color, list: cfg.list }, i: 0, st: 'next', t: 1.6, boss: null };
        Gaunt.start(COLO);
        snapCamera(); Game.fade = 1; Game.fadeTarget = 0; Game.flashWhite = 0.3;
        SFX.bell(); SFX.crowd(1.6);
        pop(Player.x + Player.w / 2, Player.y - 40, cfg.kind === 'cup' ? cfg.name.replace('THE ', '') + '!' : LG_TIERS[cfg.tier].name + '!', { size: 40, color: cfg.color });
        toast(cfg.kind === 'cup' ? `${cfg.list.length} BOSSES · A REST STOP HALFWAY · NOTHING LOST IF YOU FALL` : cfg.tier === 'grand' ? 'GRAND SLAM · ONE HIT AND YOU\'RE OUT' : cfg.tier === 'allstar' ? 'ALL-STAR · EVERY HIT COSTS 2 HP' : 'ROOKIE · THE STORY VERSION');
      } catch (e) { logErr('legends: start', e); COLO.F = null; Gaunt.stop(); lgCleanup(); lgReturn('THE UMPIRE CALLS A DELAY · TRY AGAIN'); }
    }, 480);
  }
  window.lgFight = lgFight;

  /* ---------- the spawner ---------- */
  function lgSpawn(k) {
    const F = COLO.F, L = LG.F, R = LG_RIVAL[k], T = LG_TIERS[L.tier] || LG_TIERS.rookie, P = Player, fl = 41 * TILE, mid = lgSpot(300);
    DR.on = false; DR.fx = null; dreamIce();
    if (R.dream) {   // the dream versions: the Colosseum's dream spawn, plus the tier on top
      DR.on = true; DR.k = R.base;
      if (R.base === 'deniz') { DR.ice = { groundAccel: TUNE.groundAccel, groundDecel: TUNE.groundDecel }; TUNE.groundAccel *= 0.45; TUNE.groundDecel *= 0.12; }
      _lgSpawn.call(COLO, R.base);
      const b = F.boss; if (!b) throw new Error('no dream boss for ' + k);
      if (T.hp !== 1) { b.hp *= T.hp; b.maxHp *= T.hp; }
      lgSpeed(b, T.sp);
      return;
    }
    let b = null;
    switch (k) {
      case 'server': b = new RogueServer(mid.x, fl); b.begin = b.begin || (() => {}); break;
      case 'adam': b = new Adam(mid.x, fl); break;
      case 'daniel': Object.assign(A, { daniel: lgSpot(314), cannonMouth: { x: 309 * TILE, y: 32.6 * TILE }, danielFloor: lgSpot(304) }); A.daniel.y = 34 * TILE; b = new Daniel(); break;
      case 'fionn': A.fionn = mid; b = new Fionn(); break;
      case 'milo': A.milo = { x: 285 * TILE, y: 29 * TILE }; b = new Milo(); break;
      case 'deniz': A.denizSeat = { x: 311 * TILE + TILE / 2, y: 34 * TILE }; A.denizFloor = mid; b = new Deniz(); break;
      case 'evil': A.courtFloor = fl; A.net = 280 * TILE; A.evil = mid; Act3.trophies = []; b = new EvilAdam(); break;
      case 'zennith': A.coreFloor = fl; A.zennith = { x: 285 * TILE, y: 31 * TILE }; Act3.reshmanUsed = true; b = new LgZennith(); break;
      case 'monfort': b = new LgMonfort(mid.x, fl); break;
      case 'twins': b = new LgTwins(mid.x, fl); break;
      case 'prime': b = new LgPrimeAdam(mid.x, fl); break;
    }
    if (!b) throw new Error('no boss for ' + k);
    if (T.hp !== 1) { b.hp *= T.hp; b.maxHp *= T.hp; }
    lgSpeed(b, T.sp * (R.sp || 1));
    F.boss = b; Zone.boss = b; Enemies.push(b); BossBar.show(R.bar || R.short.toUpperCase());
    F.st = 'intro'; F.t = 1.3;
    burst(300 * TILE, 38 * TILE, 30, { colors: [L.color, BONE, GOLD], maxSpeed: 480 }); SFX.summon(); addShake(8);
    P.facing = 1;
  }
  const _lgSpawn = COLO.spawn;
  COLO.spawn = function (k) {
    if (!LG.F) return _lgSpawn.call(this, k);
    try { lgSpawn(k); }
    catch (e) {   // a boss that can't load on this page is skipped, never a soft-lock
      logErr('legends: spawn ' + k, e);
      const F = this.F; F.boss = null; F.i++;
      if (F.i >= F.cup.list.length) this.won(); else { F.st = 'next'; F.t = 0.6; }
    }
  };
  // a K.O.: the dream twist stops, drones go home, and a new boss earns its statue
  const _lgDown = COLO.down;
  COLO.down = function (b) {
    const r = _lgDown.call(this, b);
    if (r && LG.F) {
      DR.on = false; DR.fx = null; dreamIce();
      for (const e of Enemies) if (e.type === 'drone') e.dead = true;
      Object.assign(Act3, { grav: 'normal', gravWarn: false, slowT: 0 }); Player.gravK = 1;
      const k = this.F.cup.list[this.F.i], R = LG_RIVAL[k];
      if (R && R.isNew && !lgQ().seen[k]) { lgQ().seen[k] = 1; saveGame(); }
    }
    return r;
  };
  // the Rogue Server's cornered finale counts as its K.O. here
  const _lgFinale = Story.bossFinale;
  Story.bossFinale = function (b) { if (LG.F && COLO.F && COLO.F.boss === b) { COLO.down(b); return; } return _lgFinale.apply(this, arguments); };
  // the seventh-inning stretch
  const _lgUpd = COLO.update;
  COLO.update = function (dt) {
    const F = this.F, L = LG.F;
    if (L && F && F.st === 'rest') return;
    _lgUpd.call(this, dt);
    if (L && this.F && this.F.st === 'next' && L.restAt && this.F.i === L.restAt && !L.rested) lgRest();
  };
  function lgRest() {
    const F = COLO.F, P = Player, sh = lgShields();
    F.st = 'rest';
    if (sh) { P.shield = (P.shield || 0) + sh; HUD.hpPop = true; }
    NPCs.push(new LgFountain(lgSpot(262).x, 41 * TILE), new LgBench(lgSpot(268).x, 41 * TILE, true),
      new GPost(lgSpot(278).x, 41 * TILE, { look: 'pad', label: 'NEXT INNING · PLAY BALL', lgRest: true, go: () => lgResume() }));
    SFX.chime ? SFX.chime() : SFX.bell();
    toast(`THE SEVENTH-INNING STRETCH · HYPE FOUNTAIN & BENCH${sh ? ` · +${sh} GOLDEN SHIELD${sh > 1 ? 'S' : ''}` : ''}`);
  }
  function lgResume() {
    const F = COLO.F, L = LG.F; if (!F || !L || F.st !== 'rest') return;
    if (Player.sitting) Player.standUp();
    for (const n of NPCs) if (n.lgRest) n.gone = true;
    L.rested = true; F.st = 'next'; F.t = 1.2; SFX.bell();
  }
  // a match won
  const _lgWon = COLO.won;
  COLO.won = function () { if (!LG.F) return _lgWon.call(this); lgWon(); };
  function lgWon() {
    const L = LG.F, Q = lgQ(), P = Player;
    COLO.F = null; Gaunt.stop();
    let first = false;
    if (L.kind === 'rival') { const r = Q.rivals[L.k] = Q.rivals[L.k] || {}; first = !r[L.tier]; r[L.tier] = 1; }
    else {
      const c = Q.cups[L.key] = Q.cups[L.key] || {}; c.b = c.b || {};
      first = !c.done; c.done = 1;
      const on = LG_BINDS.filter(b => L.binds && L.binds[b.id]); on.forEach(b => { c.b[b.id] = 1; }); if (on.length === LG_BINDS.length) c.all = 1;
    }
    for (const k of L.list) if (LG_RIVAL[k] && LG_RIVAL[k].isNew) Q.seen[k] = 1;
    const allCups = LG_CUP_ORDER.every(k => Q.cups[k] && Q.cups[k].done), outfitNew = allCups && !Q.outfit;
    if (outfitNew) Q.outfit = 1;
    saveGame();
    SFX.confetti(); SFX.crowd(2); Story.impact(P.x + P.w / 2, P.y + P.h, L.color);
    pop(P.x + P.w / 2, P.y - 50, L.kind === 'cup' ? L.name.replace('THE ', '') + ' WON!' : `${LG_TIERS[L.tier].name} · BEATEN!`, { size: 46, color: L.color, burstColor: FLAME });
    lgCleanup();
    const outfitCard = () => { if (outfitNew) showCard('ALL FOUR CUPS', 'THE GOLDEN UMPIRE', 'A black-and-white striped umpire\'s uniform with a glowing gold half-mask, and your bat becomes a gleaming golden flagpole. Find it in Lars\'s locker at Base Camp.', ['outfit · Lars\'s locker']); };
    setTimeout(() => lgReturn(null, () => {
      if (L.kind === 'cup' && L.key === 'zennith' && !Q.fame) { const p = Story.hallOfFame(); if (p && p.then) p.then(outfitCard); else outfitCard(); return; }
      if (L.kind === 'rival') { toast(first ? (L.tier === 'grand' ? 'GRAND SLAM · A GOLDEN WREATH FOR THE STATUE' : `${LG_TIERS[L.tier].name} WIN · A NEW PIP ON THE PLINTH`) : 'BEATEN AGAIN · THE CROWD GOES WILD'); outfitCard(); return; }
      if (first) {
        const C = LG_CUPS[L.key], nx = LG_CUP_ORDER[LG_CUP_ORDER.indexOf(L.key) + 1];
        showCard('THE HALL OF LEGENDS', C.name, `${C.list.length} rivals in a row. The golden shadow-fans won't stop chanting.${nx ? ` The gate to ${LG_CUPS[nx].title} swings open.` : ''}`, nx ? [`unlocked · ${LG_CUPS[nx].title}`] : [], outfitNew ? outfitCard : null);
      } else { toast(`${L.name} · WON AGAIN${L.binds && LG_BINDS.some(b => L.binds[b.id]) ? ' · THE GATE GLEAMS' : ''}`); outfitCard(); }
    }), 1800);
  }
  const _lgAbort = COLO.abort;
  COLO.abort = function () { const was = !!LG.F; _lgAbort.call(this); if (was) lgCleanup(); };
  const _lgBanner = COLO.banner;
  COLO.banner = function () {
    const F = this.F, L = LG.F; if (!L || !F) return _lgBanner.call(this);
    if (F.st === 'rest') return `${L.name} · THE SEVENTH-INNING STRETCH · ▲ ON THE PAD TO PLAY ON`;
    const tags = LG_BINDS.filter(b => L.binds && L.binds[b.id]).map(b => b.short).join(' · ');
    return `${L.name}${L.kind === 'cup' ? ` · ROUND ${Math.min(F.i + 1, F.cup.list.length)} / ${F.cup.list.length}` : ''}${tags ? ' · ' + tags : ''}`;
  };
  // the room: furniture instead of podiums, marble tiles, a sky instead of the stands
  const _lgEnterColo = COLO.enter;
  COLO.enter = function (r) { if (LG.on && r.id === 't_colo') { if (!LG.F) lgBuildHall('t_colo'); return; } return _lgEnterColo.call(this, r); };
  const _lgER = enterRoom;
  enterRoom = function (r) {
    _lgER.apply(this, arguments);
    if (!LG.on || !r) return;
    if (r.id === 't_hall') { delete Save.data.visited.t_hall; if (!LG.F) lgBuildHall('t_hall'); }   // a dream isn't a visit
    if (r.id === 't_colo' || r.id === 't_hall') Game.tilePal = LG_PAL; else LG.on = false;   // wandered off: the dream ends
  };
  const _lgBehind = COLO.draw_behindTiles;
  COLO.draw_behindTiles = function () { if (LG.on && (Zone.room.id === 't_colo' || Zone.room.id === 't_hall')) { drawLgSky(Zone.room.px); return; } return _lgBehind.apply(this, arguments); };
  Gaunt.add({ id: 'legends', page: 'z9',
    draw_screen() {
      if (!LG.on || DR.on) return;
      ctx.save();
      const vg = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.35, VW / 2, VH / 2, VH * 0.95); vg.addColorStop(0, 'rgba(255,230,160,0)'); vg.addColorStop(1, 'rgba(255,214,140,.32)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, VW, VH);
      ctx.font = `italic 13px ${SERIF_FONT}`; ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(90,60,20,.75)'; ctx.fillText('…the Hall of Legends', VW - 24, VH - 24);
      ctx.restore();
    } });

  /* ---------- the tiers and the bindings ---------- */
  const _lgHurt = Player.hurt;
  Player.hurt = function (dir) {
    const L = LG.F;
    if (!L || L.tier === 'rookie' || !COLO.F) return _lgHurt.apply(this, arguments);
    const hp0 = this.hp, r = _lgHurt.apply(this, arguments);
    if (this.hp < hp0 && !this.dead) {
      if (L.tier === 'grand') { this.hp = 0; this.die(); }
      else { this.hp = Math.max(0, this.hp - 1); HUD.hpPop = true; if (this.hp <= 0) this.die(); }
    }
    return r;
  };
  const _lgTick = PAGE.tick;
  PAGE.tick = function (dt) { if (_lgTick) _lgTick.apply(this, arguments); if (LG.F) lgEnforce(); };
  const _lgApply = applyUpgrades;
  applyUpgrades = function () { _lgApply.apply(this, arguments); if (LG.F) lgEnforce(); };

  /* ---------- striking out: zero risk ---------- */
  const _lgRespawn = respawnAtBench;
  respawnAtBench = function () {
    if (!LG.on) return _lgRespawn.apply(this, arguments);
    Game.respawnT = 0;
    try { Gaunt.abort(); } catch (e) { logErr('legends: abort', e); }
    COLO.F = null; lgCleanup();
    try { if (PAGE.onRespawn) PAGE.onRespawn(); } catch (e) { logErr('legends: onRespawn', e); }
    try { lgPlace(); } catch (e) { logErr('legends: place', e); }
    Game.fadeTarget = 0; Game.combo = 0;
    toast('THE UMPIRE CALLS TIME · BACK AT THE GATE · NOTHING LOST');
  };

  /* ---------- waking up in the Hall ---------- */
  if (ARRIVE === 'legends') {
    const q = Save.data.q;
    if (!q.legendsPrev && q.pages) delete q.pages['act3.html'];   // a dream isn't a visit
    LG.on = true;
    fill(240, 23, 1, 18, 0);   // the dream opens the wall between the gate wing and the Colosseum
    Player.reset(lgSpot(LG_X.pad + 2), true); Player.facing = 1; applyUpgrades(); Player.hp = Player.maxHp;
    enterRoom(ROOM.t_hall); snapCamera(); Game.fade = 1; Game.fadeTarget = 0;
    setTimeout(() => {
      SFX.music('anthem');
      if (!lgQ().met) Story.umpireIntro(); else toast('THE HALL OF LEGENDS · THE UMPIRE TIPS HIS CAP');
    }, 900);
  }
}
