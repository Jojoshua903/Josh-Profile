'use strict';
/* =========================================================
   ZONE 1 MAIN · The Scrapyard Dugout
   Rooms, Zone 1 story hooks, Base Camp regulars and the
   cellar secret. Shared systems live in zone/common.js.
   ========================================================= */
Object.assign(Zone, { gateAnim: 0, clonk: false, gateMsgT: 0 });
Object.assign(PAGE, {
  id: 'z1', benchKey: 'bench',
  benches: Z.bench.map((pos, i) => ({ pos, room: Z.benchRoom[i] })),
  zoneOf: () => 'z1', zoneHere: () => 'z1',
});

function collectMap() {
  Save.data.map = true; Save.data.maps.z1 = true; saveGame();
  showCard('ITEM ACQUIRED', 'ZONE 1 MAP', 'Reshman left you his map. Rooms you\'ve explored are filled in; doors you haven\'t been through show as dashed outlines.',
    [`<kbd>${Bindings.label('map')}</kbd> open map`, `<kbd>${Bindings.label('map', 'pad')}</kbd> on controller`]);
}

/* ---------- End of Zone 1 → The Deep Quarry ---------- */
function showEnd() {
  const D = Save.data; D.cleared = true; saveGame(); themeCheck(400);
  const t = Math.floor(D.time), mm = Math.floor(t / 60), ss = String(t % 60).padStart(2, '0');
  const ups = ['launcher', 'core', 'magnet'].filter(k => D.up[k]).length;
  $('#endStats').innerHTML = [[`${mm}:${ss}`, 'TIME'], [D.bolts, 'BOLTS'], [D.deaths, 'STRIKE OUTS'], [`${ups}/3`, 'UPGRADES']]
    .map(([v, l]) => `<div><b>${v}</b><small>${l}</small></div>`).join('');
  SFX.unlock(); openModal('end');
}
$('#endStay').addEventListener('click', () => { closeModal(); Player.x -= 4 * TILE; Player.vx = 0; Zone.ended = false; });
$('#endMenu').addEventListener('click', () => { saveGame(); location.href = 'index.html#menu'; });
$('#endGo').addEventListener('click', () => { closeModal(); goToPage('act1.html#from-z1'); });

/* ---------- The cracked floorboards (Explosive Baseballs) ---------- */
function breakFloor() {
  const D = Save.data; D.walls.z1floor = 1; saveGame();
  openCellar();
  const c = Z.cracked;
  burst(c.x + c.w / 2, c.y + 8, 30, { colors: ['#6b4a30', '#a8734c', '#3a2616'], maxSpeed: 520, grav: 1400, type: 'debris' });
  pop(c.x + c.w / 2, c.y - 30, 'CRASH!', { size: 40 });
  setTimeout(() => toast('THE FLOORBOARDS BLEW OPEN · SOMETHING DOWN THERE…'), 500);
}

/* ---------- Rooms ---------- */
function enterRoom(r) {
  const D = Save.data;
  Zone.room = r;
  Enemies.length = 0; Bolts.length = 0; Balls.length = 0; Pickups.length = 0; Hazards.length = 0; NPCs.length = 0; Breakables.length = 0;
  const dead = Zone.killed[r.id] || {};
  (SPAWNS[r.id] || []).forEach((s, i) => {
    if (dead[i]) return;
    const e = makeZoneEnemy(s); if (!e) return;
    e.spawnKey = i; e.spawnRoom = r.id; Enemies.push(e);
  });
  if (r.id === 'alley') NPCs.push(new ReshmanVendor(Z.reshman.x, Z.reshman.y, 'z1'));
  if (r.id === 'hub') {
    if (D.lars) {
      NPCs.push(new CampNPC('cat', Z.cats[0].x, Z.cats[0].y, { name: 'Pebble', color: '#e08a3a', facing: -1, reach: 24, prompt: 'PET', sleepy: true }));
      NPCs.push(new CampNPC('cat', Z.cats[1].x, Z.cats[1].y, { name: 'Grit', color: '#2b2228', facing: 1, reach: 24, prompt: 'PET' }));
      NPCs.push(new CampNPC('lars', Z.lars.x, Z.lars.y, { vendor: 'lars', prompt: 'UPGRADES', forge: true, lamp: false, fixed: true, facing: -1 }));
    }
    if (D.josh) { const j = new Josh(Z.workbench.x + 46, Z.workbench.y); j.shop = true; j.vendor = 'josh'; NPCs.push(j); }
    if (D.danielDead) NPCs.push(new CampNPC('daniel', Z.daniel.x, Z.daniel.y, { vendor: 'daniel', prompt: 'FIREWORKS', stand: true, fixed: true, facing: 1 }));
    if (D.fionnDead) NPCs.push(new CampNPC('fionn', Z.fionn.x, Z.fionn.y, { prompt: 'PEBBLES', facing: 1, fixed: true, onTalk: n => Story.fionnCamp(n) }));
    if (D.miloDead) NPCs.push(new CampNPC('milo', Z.milo.x, Z.milo.y, { prompt: 'TALK', facing: -1, onTalk: n => Story.miloCamp(n) }));
    if (D.denizDead) NPCs.push(new CampNPC('deniz', Z.deniz.x, Z.deniz.y, { prompt: 'TEA', facing: -1, fixed: true, onTalk: n => Story.denizTea(n) }));
    NPCs.push(new CallBell(Z.bell.x, Z.bell.y, 'z1'));
  }
  if (r.id === 'crash' && !D.walls.z1floor) Breakables.push({ x: Z.cracked.x, y: Z.cracked.y, w: Z.cracked.w, h: 2 * TILE, id: 'z1floor', onBreak: breakFloor });
  if (r.id === 'cellar' && !D.spareBat) NPCs.push(new SpareBat(Z.spareBat.x, Z.spareBat.y));
  for (const p of PEBBLES) if (p.room === r.id && !D.pebbles[p.id]) NPCs.push(new LuckyPebble(p.x, p.y, p.id));
  if (r.id === 'server' && !D.bossDead) { Zone.boss = null; setBossDoor(false); }
  if (!D.visited[r.id]) { D.visited[r.id] = 1; saveGame(); if (D.introSeen) roomToast(r.name); }
}
function startBoss() {
  setBossDoor(true); SFX.gate(); addShake(6);
  Zone.boss = new RogueServer(Z.bossPos.x, Z.bossPos.y);
  Enemies.push(Zone.boss);
  BossBar.show('THE ROGUE SERVER');
  pop(Z.bossPos.x, Z.bossPos.y - 230, 'SYSTEM ONLINE', { size: 40, color: '#ff4a3a', burstColor: INK, life: 1.4 });
  SFX.summon();
}
PAGE.onRespawn = () => { if (!Save.data.bossDead) { setBossDoor(false); Zone.boss = null; BossBar.hide(); } };

/* ---------- Zone 1 interactions (called from the shared step) ---------- */
PAGE.interact = (dt, c, feet) => {
  const P = Player, D = Save.data;
  // boss arena
  if (Zone.room.id === 'server' && !D.bossDead && !Zone.boss && c.x > 164 * TILE) startBoss();
  // shortcut gate
  Zone.gateMsgT -= dt;
  if (!D.gate) {
    const g = Z.gate, hubSide = Zone.room.id === 'hub' && c.x > g.x && c.x < g.x + 4 * TILE && feet > g.y;
    Zone.gateNear = hubSide;
    const swingHit = P.attackT > 0 && P.attackType === 'fwd' && overlap(P.hitbox(), { x: g.x - 4, y: g.y, w: g.w + 8, h: g.h });
    if ((hubSide && Input.pressed('up')) || (hubSide && swingHit)) {
      D.gate = true; saveGame(); openGate(); Zone.gateAnim = 1;
      SFX.kick(); SFX.gate(); addShake(8); pop(g.x + 16, g.y - 10, 'KICK!', { size: 34 }); dust(g.x + 16, g.y + g.h, 10);
      toast('SHORTCUT OPENED · BACK TO THE CRASH SITE');
    } else if (!hubSide && swingHit && Zone.gateMsgT <= 0) {
      Zone.gateMsgT = 1.5; SFX.clang(); toast('WON\'T BUDGE FROM THIS SIDE');
    }
  } else Zone.gateNear = false;
  // the cracked floorboards: a bat just goes CLONK
  if (Zone.room.id === 'crash' && !D.walls.z1floor && P.attackT > 0 && P.attackType === 'down' && overlap(P.hitbox(), Z.cracked)) {
    if (!Zone.clonk) {
      Zone.clonk = true; SFX.clang(); pop(Z.cracked.x + 32, Z.cracked.y - 20, 'CLONK', { size: 24, burst: false });
      toast(D.up.boom ? 'CRACKED BOARDS… TRY AN EXPLOSIVE BASEBALL (' + Bindings.label('swap') + ' TO SWAP)' : 'THE BOARDS ARE CRACKED… SOMETHING\'S UNDER THERE. NEEDS EXPLOSIVES.');
    }
  } else if (P.attackT <= 0) Zone.clonk = false;
  // exit to the Deep Quarry
  if (Zone.room.id === 'hub' && !Zone.ended && overlap(P, Z.exitZone2)) {
    Zone.ended = true;
    if (!D.cleared) showEnd(); else goToPage('act1.html#from-z1');
  }
};
PAGE.tick = dt => { Zone.gateAnim = Math.max(0, Zone.gateAnim - dt * 2); };

/* ---------- Render hooks ---------- */
Game.hooks = {
  noGrid: true,
  behindTiles() {
    if (Zone.room.id === 'crash') drawJumbotron(Story.jumbo.on, Story.jumbo.on ? 0.3 + Math.random() * 0.7 : Story.jumbo.flicker);
    if (Zone.room.id === 'cellar') drawCellar();
  },
  back() {
    const id = Zone.room.id;
    if (id === 'crash' && !Save.data.walls.z1floor) drawCrackedBoards();
    if (!Save.data.gate || Zone.gateAnim > 0) if (id === 'hub' || id === 'climb') drawGate(Save.data.gate ? Zone.gateAnim : 1);
    if (Zone.gateNear) { ctx.font = `14px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = GOLD; ctx.fillText('▲ ' + Bindings.label('up', Game.lastInput) + ' · KICK OPEN', Z.gate.x + 16, Z.gate.y - 18 + Math.sin(Game.time * 4) * 2); }
    if (id === 'server' && Zone.boss && !Save.data.bossDead) drawBars({ x: Z.bossDoor.tx * TILE, y: Z.bossDoor.ty * TILE, w: Z.bossDoor.w * TILE, h: Z.bossDoor.h * TILE });
    if (id === 'hub') {
      drawArchway(); drawCampProps(); drawCampfire(CAMP.campfire.x, CAMP.campfire.y);
      if (Save.data.josh) drawWorkbench(Z.workbench.x, Z.workbench.y);
    }
    for (const n of NPCs) n.draw();
    drawPickups(); drawHazards();
  },
  front() {
    if (Zone.room.dark) {
      const c = Player.center(), r = Zone.room.px;
      const g = ctx.createRadialGradient(c.x, c.y, 30, c.x, c.y, 270);
      g.addColorStop(0, 'rgba(5,3,8,0)'); g.addColorStop(0.6, 'rgba(5,3,8,.6)'); g.addColorStop(1, 'rgba(5,3,8,.94)');
      ctx.fillStyle = g; ctx.fillRect(r.x, r.y, r.w, r.h);
    }
    Story.drawBeam();
  },
  top() {
    if (Zone.room.dark) {
      drawNeon(134 * TILE, 9 * TILE, 'OPEN', 'rgba(255,80,160,A)', Game.time);
      drawNeon(150 * TILE, 6 * TILE, 'EAT', 'rgba(111,211,255,A)', Game.time + 1.7);
      for (const n of NPCs) if (n.kind === 'reshman' && !n.gone) n.drawEyes();
    }
    Story.drawBubble();
  },
  screen() { Story.drawScreen(); }
};

/* ---------- Boot ---------- */
buildZone();
(function boot() {
  const D = Save.data;
  if (D.gate) openGate();
  if (D.bossDead) openBossHole();
  if (D.walls.z1floor) openCellar();
  LEVEL = { signs: [], benches: Z.bench.map(b => ({ x: b.x, y: b.y })), labels: [], spawn: Z.spawn };
  Game.checkpoint = D.bench;
  const arrival = ARRIVE === 'bell-z1' ? { pos: Z.bell, face: 1, line: 'Renas drops you off at Base Camp.' }
    : ARRIVE === 'from-z2' ? { pos: Z.fromZone2, face: -1, line: 'Back up from the Deep Quarry, at the edge of the chasm.' } : null;
  if (D.introSeen && arrival) {
    Player.reset(arrival.pos, false); Player.facing = arrival.face;
    enterRoom(ROOM.hub);
    setStartCard(null, null, arrival.line);
  } else if (D.introSeen) {
    Player.reset(Z.bench[D.bench], false);
    enterRoom(ROOM[Z.benchRoom[D.bench]]);
    setStartCard(null, null, `Welcome back. ${D.bolts} scrap bolts in your pocket${D.bossDead ? ', and Josh is open for business at Base Camp' : ''}.`);
  } else {
    Player.reset(Z.spawn, false);
    Player.lie = 1; Player.noBat = true;
    enterRoom(ROOM.crash);
    Story.intro.black = 1; Story.intro.blackTarget = 1;
  }
})();
PAGE.start = () => {
  if (!Save.data.introSeen) Story.playIntro();
  else { Game.fade = 1; Game.fadeTarget = 0; SFX.bench(); if (!Save.data.seenZones.z1) { Save.data.seenZones.z1 = 1; zoneTitle(Zone.room.name.toUpperCase(), 'The Scrapyard Dugout'); } }
};
runPage();
