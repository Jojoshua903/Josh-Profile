'use strict';
/* =========================================================
   SIDE QUESTS · core state, placement and hooks
   Loaded last on every story page (after the page's main.js).
   Cast & gadgets: zone/quest-cast.js, zone/quest-gadgets.js
   Scenes & the quest log: zone/quest-story.js
   ========================================================= */
// the drone used to be called Patch and shared q.patch with Josh's Reality Patch upgrade (zone/endings.js):
// its quest now keeps its own q.byte, and q.patch is the upgrade alone
(function () {
  const q = Save.data.q;
  if (q.patch === 'met' || q.patch === 'fixed') { q.byte = q.patch; delete q.patch; if (q.patchCard) { q.byteCard = 1; delete q.patchCard; } saveGame(); }
})();
// where everything lives: [tile column, surface row], snapped to real floor at runtime
const QUEST_SPOTS = {
  vance: { room: 'hub', at: [197, 57] }, renas: { room: 'hub', at: [88, 62] }, clipboard: { room: 'hub', at: [157, 62] },
  immanuel: { room: 'hub', at: [121, 62] },
  goals: [
    { id: 'gl_z1', room: 'climb', at: [50, 31], where: 'the Bleacher Climb (Scrapyard Dugout)' },
    { id: 'gl_z4', room: 'f_floor', at: [706, 42], where: 'the Foundry Floor (Pyrotechnic Foundry)' },
    { id: 'gl_z6', room: 'g_fields', at: [52, 30], where: 'the Floating Fields (Geode Caverns)' },
  ],
  byte: { room: 'v_turbine', at: [654, 42] }, scalpers: { room: 'c_hall', at: [149, 87] }, keeper: { room: 't_locker', at: [294, 20] },
  stubs: [
    { id: 'st_z1', room: 'climb', at: [61, 31] }, { id: 'st_z2', room: 'q_rails', at: [155, 50] }, { id: 'st_z3', room: 'v_chase', at: [382, 61] },
    { id: 'st_z4', room: 'f_fuse', at: [768, 18] }, { id: 'st_z6', room: 'g_fields', at: [26, 28] }, { id: 'st_z7', room: 's_gusts', at: [205, 9] },
    { id: 'st_z8', room: 'i_steps', at: [268, 65] }, { id: 'st_z9', room: 't_lasers', at: [247, 13] },
  ],
  books: [
    { id: 'bk_quarry', room: 'q_crystal', at: [183, 41], where: 'the Crystal Gallery (Deep Quarry)' },
    { id: 'bk_vents', room: 'v_turbine', at: [656, 24], where: 'the Turbine Hall (Ventilation Shafts)' },
    { id: 'bk_geode', room: 'g_fields', at: [44, 41], where: 'the Floating Fields (Geode Caverns)' },
    { id: 'bk_glacier', room: 'i_halls', at: [324, 58], where: 'the Icicle Halls (Glacier Crown)' },
  ],
  herbs: [
    { id: 'hb_lava', room: 'q_mouth', at: [44, 80], name: 'Fire Mint', where: 'over the lava pit at the Quarry Mouth' },
    { id: 'hb_storm', room: 's_gate', at: [170, 30], name: 'Thunder Chamomile', where: 'up in the Greenhouse Gate (Storm Atrium)' },
    { id: 'hb_frost', room: 'i_halls', at: [313, 65], name: 'Frostleaf', where: 'frozen solid in the Icicle Halls (Glacier Crown)', frozen: true },
  ],
  cats: [
    { id: 'Pebble', room: 'f_run', at: [819, 28], color: '#e08a3a', where: 'napping at the very top of the Furnace Shaft, behind the Fuse Tower (Pyrotechnic Foundry)' },
    { id: 'Grit', room: 'g_fields', at: [70, 47], color: '#2b2228', where: 'batting at crystals in the Geode Caverns' },
  ],
  elites: [
    { id: 'mb_pipes', room: 'pipes', idx: 4 }, { id: 'mb_crystal', room: 'q_crystal', idx: 0 }, { id: 'mb_foundry', room: 'f_floor', idx: 0 },
    { id: 'mb_geode', room: 'g_fields', idx: 1 }, { id: 'mb_glacier', room: 'i_halls', idx: 1 }, { id: 'mb_vault', room: 't_vault', idx: 0 },
  ],
  capDrones: { v_intake: [[305, 52]], v_chase: [[400, 40], [470, 30], [540, 30]] },
  trials: {
    z1: { room: 'climb', a: [42, 55], b: [62, 31] }, z2: { room: 'q_mouth', a: [18, 83], b: [52, 79] },
    z3: { room: 'v_chase', a: [378, 61], b: [628, 20] }, z4: { room: 'f_floor', a: [694, 42], b: [745, 39] },
    z5: { room: 'c_hall', a: [144, 87], b: [192, 60] }, z6: { room: 'g_fields', a: [12, 65], b: [72, 30] },
    z7: { room: 's_gusts', a: [152, 12], b: [234, 21] }, z8: { room: 'i_halls', a: [296, 53], b: [352, 46] },
  },
};
const CLEATS = ['Rookie Cleats', 'Varsity Cleats', 'All-Star Cleats', 'Hall of Fame Cleats'];
const BADGES = [
  { id: 'laststand', name: 'Last Stand Badge', stubs: 3, desc: 'At 1 HP, every swing hits twice as hard.', line: '"Fell off a truck. A very brave truck."' },
  { id: 'blast', name: 'Blast Radius Badge', stubs: 2, desc: 'Explosive Baseball blasts are 30% wider.', line: '"Daniel tried to buy this. We said no. For safety."' },
  { id: 'hustle', name: 'Hustle Badge', stubs: 2, desc: 'Your dash recharges 40% faster.', line: '"Some coach keeps yelling about hustle. Here."' },
  { id: 'cut', name: 'Scalper\'s Cut', stubs: 1, desc: 'Enemies drop 50% more Scrap Bolts.', line: '"Our cut, your cut. Everybody gets a cut."' },
];
const STUB_TOTAL = QUEST_SPOTS.stubs.length;
// badges only work while pinned to your jersey (the loadout lives in zone/badges.js); old saves with no loadout yet keep everything on
function badgesOn() {
  const q = Save.data.q, own = q.badges || {}, eq = q.eq;
  if (!eq) return own;
  const on = {}; for (const k in eq) if (eq[k] && own[k]) on[k] = 1;
  return on;
}
const GOAL_TOTAL = QUEST_SPOTS.goals.length;
const STUB_SVG = '<svg viewBox="0 0 24 16"><path d="M2 2 H22 V6 A2 2 0 0 0 22 10 V14 H2 V10 A2 2 0 0 0 2 6 Z" fill="#f2c14e" stroke="#0d0b10" stroke-width="2"/></svg>';
const stubsFound = () => Object.keys(Save.data.q.stubs || {}).length;
const stubsLeft = () => stubsFound() - (Save.data.q.stubsSpent || 0);
const QBASE = { run: TUNE.runSpeed, air: TUNE.airAccel, knock: TUNE.knockback, dashCD: TUNE.dashCooldown };
// room → zone id (Zone 1 rooms don't carry one)
const QZ = r => r.zone || PAGE.zoneOf(r.id);
// a standable spot near a tile: solid / one-way floor with two air tiles above (never spikes)
function spotNear(tx, row) {
  const DX = [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6], DY = [0, -1, 1, -2, 2, -3, 3, -4, 4];
  for (const dy of DY) for (const dx of DX) {
    const x = tx + dx, r = row + dy, g = tileAt(x, r);
    if ((g === 1 || g === 3) && tileAt(x, r - 1) === 0 && tileAt(x, r - 2) === 0) return QT(x, r);
  }
  return QT(tx, row);
}
// an open-air spot (for flying drones)
function airNear(tx, ty) {
  for (let d = 0; d < 9; d++) for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) {
    const x = tx + dx, y = ty + dy; let ok = true;
    for (let i = -1; i <= 1 && ok; i++) for (let j = -1; j <= 1 && ok; j++) if (tileAt(x + i, y + j) !== 0) ok = false;
    if (ok) return { x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 };
  }
  return { x: tx * TILE, y: ty * TILE };
}

const Quests = {
  trial: null, flash: null, buddy: null, capsOut: 0, hubT: 0, boostT: 0,
  ticker: { kind: 'qtick', gone: false, update(dt) { Quests.tick(dt); }, draw() {} },
  get q() { return Save.data.q; },
  count(k) { return Object.keys(this.q[k] || {}).length; },
  mark(k, id) { (this.q[k] = this.q[k] || {})[id] = 1; saveGame(); },

  /* ---------- fill a room with whatever the quests need ---------- */
  populate(r) {
    const D = Save.data, q = this.q, id = r.id, S = QUEST_SPOTS, at = s => spotNear(s.at[0], s.at[1]);
    this.capsOut = 0; this.hubT = 0;
    NPCs.push(this.ticker);
    if (this.trial && this.trial.room !== id) this.failTrial('YOU LEFT THE COURSE');
    // Base Camp: Coach Monfort, the clipboard, Renas, and the cats
    if (id === 'hub') {
      const v = at(S.vance); NPCs.push(new QNPC('vance', v.x, v.y, { prompt: q.vance ? 'TRIALS' : 'TALK', fixed: true, facing: -1, onTalk: n => Story.vanceTalk(n) }));
      const c = at(S.clipboard); NPCs.push(new QNPC('clipboard', c.x, c.y, { prompt: 'QUEST LOG', reach: 30, fixed: true, onTalk: () => Quests.openLog() }));
      const im = at(S.immanuel); NPCs.push(new QNPC('immanuel', im.x, im.y, { prompt: q.immanuel === 'done' ? 'DRILLS' : 'TALK', fixed: true, facing: 1, onTalk: n => Story.immanuelTalk(n) }));
      if (D.chase) { const rn = at(S.renas); NPCs.push(new QNPC('renas', rn.x, rn.y, { reach: 34, onTalk: n => Story.renasCamp(n) })); }
      if (q.cats === 'lost') for (const n of NPCs) if (n.kind === 'cat' && !(q.catsFound || {})[n.name]) n.gone = true;
    }
    // Immanuel's training goals, while his drill is on
    if (q.immanuel === 'active') for (const s of S.goals) if (s.room === id && !(q.goals || {})[s.id]) { const p = at(s); NPCs.push(new QGoal(p.x, p.y, s.id)); }
    // the lost cats
    if (q.cats === 'lost') for (const s of S.cats) if (s.room === id && !(q.catsFound || {})[s.id]) {
      const p = at(s); NPCs.push(new QNPC('lostcat', p.x, p.y, { cat: s.id, color: s.color, reach: 34, prompt: 'PICK UP', fixed: true, onTalk: n => Story.catFound(n) }));
    }
    // Byte's scrap pile, and the elites that carry motherboards
    if (id === S.byte.room && D.chase && q.byte !== 'fixed') { const p = at(S.byte); NPCs.push(new QNPC('bytepile', p.x, p.y, { reach: 44, prompt: q.byte ? 'BYTE' : '???', fixed: true, onTalk: n => Story.byteTalk(n) })); }
    if (q.byte === 'met') for (const s of S.elites) if (s.room === id && !(q.boards || {})[s.id]) {
      const e = Enemies.find(e => e.spawnRoom === id && e.spawnKey === s.idx && !e.dead);
      if (e && !e.eliteId) { e.eliteId = s.id; e.maxHp = (e.maxHp || e.hp) * 3; e.hp *= 3; e.bolts = (e.bolts || 4) * 2; NPCs.push(new EliteAura(e)); }
    }
    if (q.byte === 'fixed') { if (!this.buddy) this.buddy = new ByteBuddy(); this.buddy.snap(); NPCs.push(this.buddy); }
    // the Josh vs. Renas capacitor drones
    if (q.rivalry === 'active' && (q.caps || 0) < 5 && S.capDrones[id])
      for (const [tx, ty] of S.capDrones[id]) { const p = airNear(tx, ty); Enemies.push(new StrayDrone(p.x, p.y)); }
    // collectibles
    for (const s of S.stubs) if (s.room === id && !(q.stubs || {})[s.id]) { const p = at(s); NPCs.push(new QItem('stub', p.x, p.y, s.id)); }
    if (q.milo === 'active') for (const s of S.books) if (s.room === id && !(q.books || {})[s.id]) { const p = at(s); NPCs.push(new SpellBook(p.x, p.y, s.id)); }
    if (q.deniz === 'active') for (const s of S.herbs) if (s.room === id && !(q.herbs || {})[s.id]) { const p = at(s); NPCs.push(s.frozen ? new QFrozenHerb(p.x, p.y, s.id) : new QItem('herb', p.x, p.y, s.id)); }
    // Monfort's time trials
    if (q.vance) for (const [z, T2] of Object.entries(S.trials)) if (T2.room === id) {
      const a = spotNear(T2.a[0], T2.a[1]), b = spotNear(T2.b[0], T2.b[1]);
      const par = Math.round((6 + Math.hypot(b.x - a.x, b.y - a.y) / 110) * 2) / 2;
      if ((q.par || {})[z] !== par) { (q.par = q.par || {})[z] = par; saveGame(); }
      NPCs.push(new TrialPost('start', a.x, a.y, z), new TrialPost('finish', b.x, b.y, z));
    }
    // the Concourse scalpers and the Grounds-Keeper
    if (id === S.scalpers.room) { const p = at(S.scalpers); NPCs.push(new QNPC('scalpers', p.x, p.y, { reach: 40, prompt: q.scalpers ? 'VIP' : '…PSST', vendor: q.scalpers ? 'scalpers' : undefined, onTalk: n => Story.scalpersMeet(n) })); }
    if (id === S.keeper.room) { const p = at(S.keeper); NPCs.push(new QNPC('keeper', p.x, p.y, { reach: 50, prompt: '…', facing: -1, fixed: true, onTalk: n => Story.keeperTalk(n) })); }
  },

  /* ---------- every step ---------- */
  tick(dt) {
    const D = Save.data, q = this.q, P = Player, bd = badgesOn();
    if (this.flash) this.flash.t += dt;
    // cleats + Renas's nitro trail
    this.boostT = Math.max(0, this.boostT - dt);
    const cl = q.cleats || 0;
    const wing = q.immanuel === 'done' ? 1.08 : 1;   // Immanuel's winger warm-up
    TUNE.runSpeed = QBASE.run * (1 + 0.05 * cl) * (this.boostT > 0 ? 1.35 : 1) * wing;
    TUNE.airAccel = QBASE.air * (1 + 0.12 * cl);
    if (this.boostT > 0 && Math.abs(P.vx) > 60 && Math.random() < 0.9) spawnParticle({ x: P.x + P.w / 2 - sgn(P.vx) * 10, y: P.y + P.h - rand(2, 14), vx: -P.vx * 0.2, vy: rand(-60, -10), life: 0.35, size: rand(3, 6), color: Math.random() < 0.5 ? '#ff8a2a' : '#6fd3ff', type: 'dot' });
    if (q.boostPending && started && !Story.active && !UI.modal && !P.dead) {
      q.boostPending = 0; saveGame(); this.boostT = 6;
      pop(P.x + P.w / 2, P.y - 30, 'NITRO!', { size: 34, color: '#ff8a2a' }); SFX.scooter(); toast('RENAS\'S NITRO DROP-OFF · 6 SECONDS OF TURBO');
    }
    // Last Stand badge
    if (bd.laststand && !(P.chargeT > 0)) {
      P.batDmg = P.batDmgBase * (P.hp === 1 ? 2 : 1);
      if (P.hp === 1 && Math.random() < 0.15) spawnParticle({ x: P.x + rand(0, P.w), y: P.y + rand(0, P.h), vy: -50, life: 0.4, size: 2.5, color: '#ff4a3a', type: 'dot' });
    }
    // the time trial clock
    if (this.trial) { if (P.dead) this.failTrial('STRIKE OUT · TRIAL OVER'); else if (!Story.active) this.trial.t += dt; }
    // Base Camp story beats, queued one after another
    if (Zone.room && Zone.room.id === 'hub' && started && !Story.active && !UI.modal && P.onGround && !P.dead) {
      this.hubT += dt;
      if (this.hubT > 0.9) {
        const s = this.hubScene();
        if (s) { this.hubT = -2; Story[s](); }
      }
    }
  },
  hubScene() {
    const D = Save.data, q = this.q, has = k => NPCs.some(n => n.kind === k && !n.gone);
    if (q.cats === 'lost' && Object.keys(q.catsFound || {}).length >= 2) return 'catsHome';
    if (D.lars && D.danielDead && !q.cats && has('lars') && has('daniel') && has('cat')) return 'catsRunAway';
    if (D.josh && D.chase && !q.rivalry && has('josh') && has('renas')) return 'rivalryStart';
    return null;
  },

  /* ---------- pickups ---------- */
  got(it) {
    const q = this.q;
    if (it.look === 'stub') {
      this.mark('stubs', it.id); const n = stubsFound();
      pop(it.x, it.y - 40, 'GOLDEN STUB!', { size: 28 });
      if (n === 1) showCard('ITEM ACQUIRED', 'GOLDEN STUB', q.scalpers ? 'A rare VIP ticket. Pip & Squeak in the Grand Concourse trade badges for these.' : 'A rare golden VIP ticket, tucked away in a nasty climb. Someone shady would pay well for this.', [`${n} / ${STUB_TOTAL} found`]);
      else toast(`GOLDEN STUB · ${n} / ${STUB_TOTAL}`);
    } else if (it.look === 'board') {
      this.mark('boards', it.id); const n = this.count('boards');
      pop(it.x, it.y - 40, 'MOTHERBOARD!', { size: 28, color: '#50dc78' });
      toast(n >= 3 ? 'SCRAP MOTHERBOARD 3/3 · TAKE THEM TO BYTE IN THE TURBINE HALL' : `SCRAP MOTHERBOARD · ${n} / 3`);
    } else if (it.look === 'cap') {
      this.capsOut = Math.max(0, this.capsOut - 1); q.caps = Math.min(5, (q.caps || 0) + 1); saveGame();
      pop(it.x, it.y - 40, 'CAPACITOR!', { size: 26, color: '#6fd3ff' });
      toast(q.caps >= 5 ? 'OVERCHARGED CAPACITORS 5/5 · GIVE THEM TO JOSH OR RENAS AT BASE CAMP' : `OVERCHARGED CAPACITOR · ${q.caps} / 5`);
    } else if (it.look === 'herb') {
      this.mark('herbs', it.id); const s = QUEST_SPOTS.herbs.find(h => h.id === it.id), n = this.count('herbs');
      pop(it.x, it.y - 40, s.name.toUpperCase() + '!', { size: 26, color: '#9be36a' });
      toast(n >= 3 ? 'ALL THREE RARE HERBS · BRING THEM TO DENIZ' : `${s.name.toUpperCase()} · RARE HERBS ${n} / 3`);
    }
  },
  goalScored(id) {
    this.mark('goals', id); const n = this.count('goals');
    toast(n >= GOAL_TOTAL ? 'ALL THREE SHOTS BURIED · TELL IMMANUEL AT BASE CAMP' : `SHOT BURIED · IMMANUEL\'S GOALS ${n} / ${GOAL_TOTAL}`);
  },
  sealBook(id) {
    this.mark('books', id); const n = this.count('books');
    toast(n >= 4 ? 'ALL FOUR SPELLBOOKS SEALED · TELL MILO' : `CURSED SPELLBOOK SEALED · ${n} / 4`);
  },
  onKill(e) {
    const q = this.q, r = Zone.room;
    if (e.eliteId) NPCs.push(new QItem('board', e.x + e.w / 2, e.y + e.h, e.eliteId, { fall: true }));
    if (q.rivalry === 'active' && r && QZ(r) === 'z3' && e instanceof StrayDrone && (q.caps || 0) + this.capsOut < 5) {
      this.capsOut++; NPCs.push(new QItem('cap', e.x + e.w / 2, e.y + e.h, 'cap', { fall: true }));
    }
  },

  /* ---------- Monfort's trials ---------- */
  startTrial(z) {
    const par = (this.q.par || {})[z];
    this.trial = { z, room: Zone.room.id, t: 0, par };
    SFX.drill(); pop(Player.x + Player.w / 2, Player.y - 30, 'GO! GO! GO!', { size: 34, color: '#9be36a' });
  },
  finishTrial(z) {
    const T2 = this.trial; if (!T2 || T2.z !== z) return;
    this.trial = null;
    const q = this.q, t = Math.round(T2.t * 100) / 100, best = (q.best || {})[z];
    if (best === undefined || t < best) (q.best = q.best || {})[z] = t;
    if (t <= T2.par) {
      const first = !(q.trials || {})[z]; this.mark('trials', z);
      SFX.unlock(); SFX.confetti(); Story.impact(Player.x + Player.w / 2, Player.y, '#9be36a');
      pop(Player.x + Player.w / 2, Player.y - 40, 'UNDER PAR!', { size: 44, color: '#9be36a' });
      toast(`TIME TRIAL BEATEN · ${t.toFixed(2)}s (PAR ${T2.par}s)${first ? ' · TELL COACH MONFORT' : ''}`);
    } else { SFX.deny(); pop(Player.x + Player.w / 2, Player.y - 40, 'TOO SLOW!', { size: 34, color: BONE }); toast(`${t.toFixed(2)}s · PAR IS ${T2.par}s · HUSTLE AND TRY AGAIN`); }
    saveGame();
  },
  failTrial(msg) { this.trial = null; toast('TIME TRIAL FAILED · ' + msg); },

  /* ---------- rewards that ride on top of applyUpgrades() ---------- */
  applyBonuses() {
    const D = Save.data, q = D.q, bd = badgesOn();
    Player.boomR = (Player.boomR || 86) * (bd.blast ? 1.3 : 1) * (q.rivalry === 'josh' ? 1.35 : 1);
    Player.heavySwing = !!D.up.heavy;
    Player.kineticBoom = q.rivalry === 'josh';
    TUNE.knockback = QBASE.knock * (D.up.heavy ? 1.6 : 1);
    TUNE.dashCooldown = QBASE.dashCD * (bd.hustle ? 0.6 : 1);
  },
};

/* ---------- hooks into the existing game ---------- */
const _qEnterRoom = enterRoom;
enterRoom = function (r) { _qEnterRoom(r); Quests.populate(r); };
const _qEnemyDie = onEnemyDie;
onEnemyDie = function (e) { _qEnemyDie(e); Quests.onKill(e); };
const _qDropBolts = dropBolts;
dropBolts = function (x, y, n) { return _qDropBolts(x, y, badgesOn().cut ? Math.ceil(n * 1.5) : n); };
const _qApply = applyUpgrades;
applyUpgrades = function () { _qApply(); Quests.applyBonuses(); };
const _qTravel = travelTo;
travelTo = function (i) {
  const id = Travel.list[i], D = Save.data;
  if (D.q.rivalry === 'renas' && id && D.bells[id] && id !== PAGE.zoneHere()) D.q.boostPending = 1;
  return _qTravel(i);
};
// Deniz's Ultimate Chill tea: resting at the Base Camp bench grants a Blue Shield Heart
PAGE.onRest = () => {
  if (Zone.room.id === 'hub' && Save.data.up.chillTea) { Player.shield = Math.max(Player.shield, 1); HUD.hpPop = true; setTimeout(() => toast('ULTIMATE CHILL · +1 BLUE SHIELD HEART'), 900); }
};
// Milo's Storm Uppercut: hold up + dash
const _qPlayerUpdate = Player.update;
Player.update = function (dt) {
  if (!this.dead && !this.hazard && Save.data.up.uppercut && Input.pressed('dash') && Input.down('up') && this.upperReady !== false && this.healT <= 0) {
    Input.consume('dash');
    this.upperReady = false; this.vy = -1150; this.vx *= 0.35; this.dashT = 0; this.launched = false; this.jumping = false; this.onGround = false; this.coyoteT = 0;
    this.startSwing(true, false); this.attackDur = this.attackT = 0.3; this.upperT = 0.4;
    this.sx = 0.7; this.sy = 1.4; SFX.launch(); SFX.djump(); addShake(6);
    const c = this.center();
    ring(c.x, this.y + this.h, 8, 70, 0.3, '#9fe6ff', 6); burst(c.x, this.y + this.h, 16, { angle: Math.PI / 2, spread: 0.9, colors: ['#9fe6ff', BONE, '#ffe85a'], maxSpeed: 420 });
    pop(c.x, this.y - 20, 'STORM UPPERCUT!', { size: 30, color: '#9fe6ff', burstColor: '#2a4a66' });
  }
  _qPlayerUpdate.call(this, dt);
  if (this.upperT > 0) { this.upperT -= dt; spawnParticle({ x: this.x + rand(0, this.w), y: this.y + rand(0, this.h), vx: rand(-80, 80), vy: rand(40, 160), life: 0.25, size: rand(2, 4), color: Math.random() < 0.5 ? '#9fe6ff' : '#ffffff', type: 'spark' }); }
  if (this.onGround || this.sliding) this.upperReady = true;
};
// the trial clock, flashbacks and nitro meter draw over the scene
const _qDrawScreen = Story.drawScreen;
// quest-ui.js adds Quests.drawScreen after this file: a frame can render between the two script tags
Story.drawScreen = function () { _qDrawScreen.call(this); if (typeof Quests.drawScreen === 'function') Quests.drawScreen(); };

/* ---------- boot: this page's first room was filled before we loaded ---------- */
applyUpgrades();
if (Zone.room) Quests.populate(Zone.room);
