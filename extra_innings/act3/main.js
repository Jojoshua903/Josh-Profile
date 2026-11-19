'use strict';
/* =========================================================
   ACT III MAIN · The Gilded Stadium gauntlet, the locker room,
   Evil Adam's court, and the secret Zennith Core underneath.
   ========================================================= */
const Act3 = { liftNear: false, leaving: false, fightIntro: false, introStarted: false, adamStarted: false, adam: null, doorNear: false, doorOpen: 0,
  grav: 'normal', gravWarn: false, refillT: 0, slowT: 0, shatter: 0, dark: 0, trophiesBroken: 0, trophies: [], goldBall: null, crumble: 0, portal: null, vortex: null,
  sunlight: 0, shieldT: 0, assist: null, buddy: null, reshmanUsed: false, reshmanPop: null, lastHp: 0, courtNote: false, endShown: false, wantChecklist: false };
const PAL = {
  z9: { a: '#d9cbb0', b: '#cfc0a2', top: '#f2c14e', top2: '#c9a33a', side: '#b8a888', plank: '#c9a33a', plankHi: '#ffe08a', spike: '#f3ead8', vein: null, crystal: null, rivet: null, fog: '255,214,150' },
  z10: { a: '#140c22', b: '#110a1d', top: '#6a4a9a', top2: '#3a2a5a', side: '#22163a', plank: '#3a2a5a', plankHi: '#8a6ab8', spike: '#d9b8ff', vein: null, crystal: '#b98bff', rivet: null, fog: '40,20,60' },
};
Object.assign(PAGE, {
  id: 'z9', benchKey: 'bench4', benches: A.benches,
  zoneOf: id => ROOM[id].zone,
  zoneHere: () => Zone.room ? Zone.room.zone : 'z9',
  arriveAtBell(id) { const b = A.bells[id] || A.bells.z9, hp = Player.hp; Player.reset(b.pos, true); Player.hp = hp; enterRoom(ROOM[b.room]); snapCamera(); },
});

/* ---------- slow motion (the 7th parry) ---------- */
const _stepA3 = step;
step = function (dt) { if (Act3.slowT > 0) { Act3.slowT -= dt; dt *= 0.3; } return _stepA3(dt); };
/* ---------- the storm shield & Reshman's one-time save ---------- */
const _hurtA3 = Player.hurt;
Player.hurt = function (dir) {
  if (this.invuln > 0 || this.dead || this.hazard || (this.dashT > 0 && Save.data.up.staticDash)) return _hurtA3.call(this, dir);
  if (Act3.shieldT > 0) {
    this.invuln = 0.35; SFX.crystal(); SFX.deflect();
    const c = this.center(); ring(c.x, c.y, 20, 60, 0.3, '#9fe6ff', 5); pop(c.x, this.y - 22, 'SHIELDED!', { size: 26, color: '#9fe6ff', burstColor: '#2a4a66' });
    return;
  }
  if (Zone.boss instanceof Zennith && this.hp <= 1 && this.shield <= 0 && !Act3.reshmanUsed && !OPT.god) { reshmanParry(false); return; }
  return _hurtA3.call(this, dir);
};

/* ---------- music: picked automatically from the room and the boss (see game/music.js) ---------- */
function roomMusic() { SFX.musicAuto(); }

/* ---------- Rooms ---------- */
function enterRoom(r) {
  const D = Save.data, prevZone = Zone.room && Zone.room.zone;
  Zone.room = r;
  Enemies.length = 0; Bolts.length = 0; Balls.length = 0; Pickups.length = 0; Hazards.length = 0; NPCs.length = 0; Breakables.length = 0; FX.length = 0;
  if (Zone.boss) { Zone.boss = null; BossBar.hide(); }
  Object.assign(Act3, { fightIntro: false, assist: null, buddy: null, grav: 'normal', gravWarn: false, shieldT: 0, dark: 0, trophiesBroken: 0, adam: null, courtNote: false, reshmanPop: null });
  Player.gravK = 1;
  const dead = Zone.killed[r.id] || {};
  (SPAWNS[r.id] || []).forEach((s, i) => {
    if (dead[i]) return;
    const e = makeAct3Enemy(s); if (!e) return;
    e.spawnKey = i; e.spawnRoom = r.id; Enemies.push(e);
  });
  TURRETS.forEach((t, i) => { if (t.room !== r.id || dead[100 + i]) return; const e = new AutoServer(t); e.spawnKey = 100 + i; e.spawnRoom = r.id; Enemies.push(e); });
  for (const [z, b] of Object.entries(A.bells)) if (b.room === r.id) NPCs.push(new CallBell(b.pos.x, b.pos.y, z));
  for (const [z, p] of Object.entries(A.reshmen)) if (p.room === r.id) NPCs.push(new ReshmanVendor(p.pos.x, p.pos.y, z));
  for (const b of BREAKS) if (b.room === r.id && !D.walls[b.id]) Breakables.push({ x: b.tx * TILE, y: b.ty * TILE, w: b.w * TILE, h: b.h * TILE, id: b.id, onBreak: breakWall(b) });
  Lasers.length = 0; for (const L of LASERS) if (L.room === r.id) Lasers.push(laserRect(L.tx, L.ty, L.h));
  // normal Adam, bruised, by a marble pillar in the locker room
  if (r.id === 't_locker' && !D.evilAdamDead) {
    Act3.adam = new Actor('adam', A.adam.x, A.adam.y, { facing: -1, o: { pose: 'kneel', bruised: true } });
    if (D.adamAssist) Object.assign(Act3.adam, { reach: 50, prompt: 'TALK', onTalk: n => Story.adamTalk(n) });
    NPCs.push(Act3.adam);
  }
  // the bosses
  if (r.id === 't_court' && !D.evilAdamDead) { setLock(A.courtLock, false); Zone.boss = new EvilAdam(); Enemies.push(Zone.boss); }
  if (r.id === 'z_core' && !D.zennithDead) { Zone.boss = new Zennith(); Enemies.push(Zone.boss); Act3.reshmanUsed = false; }
  // zone look + first-visit title card
  Game.tilePal = PAL[r.zone];
  if (r.zone !== prevZone && started && !D.seenZones[r.zone]) { D.seenZones[r.zone] = 1; zoneTitle(ZONES[r.zone].name.toUpperCase(), ZONES[r.zone].sub); }
  if (!D.visited[r.id]) { D.visited[r.id] = 1; saveGame(); if (started) roomToast(r.name); }
  if (started) roomMusic();
  // gauntlet hints, first time through each room
  const HINT = { t_bleach: 'AUTO-SERVERS · SWING TO PARRY THEIR BALLS STRAIGHT BACK', t_vault: 'CRACKED SLABS · EXPLOSIVE BASEBALLS (' + Bindings.label('swap') + ' TO SWAP)', t_lasers: 'LASER GRIDS · STATIC DASH STRAIGHT THROUGH' };
  if (started && HINT[r.id] && !Zone['hint_' + r.id]) { Zone['hint_' + r.id] = true; setTimeout(() => toast(HINT[r.id]), 900); }
}
function breakWall(b) {
  return () => {
    const D = Save.data; D.walls[b.id] = 1; saveGame(); fill(b.tx, b.ty, b.w, b.h, 0);
    burst((b.tx + b.w / 2) * TILE, (b.ty + b.h / 2) * TILE, 28, { colors: ['#d9cbb0', '#c9a33a', '#8a7a5a'], maxSpeed: 480, grav: 1300, type: 'debris' });
    pop((b.tx + b.w / 2) * TILE, b.ty * TILE - 10, 'CRUMBLE!', { size: 34 });
    toast(b.id === 'v_wall' ? 'THE WAY TO THE LASER CONCOURSE' : 'THE SLAB CRACKS OPEN · BAT-LAUNCH UP');
  };
}
function openCoreHole() { const H = A.hole; fill(H.tx, H.ty, H.w, H.h, 0); }
PAGE.onRespawn = () => {
  setLock(A.courtLock, false);
  Zone.boss = null; BossBar.hide(); FX.length = 0;
  Object.assign(Act3, { grav: 'normal', gravWarn: false, slowT: 0, shieldT: 0, assist: null, buddy: null, reshmanPop: null, dark: 0, trophiesBroken: 0 });
  Player.gravK = 1; Player.noBat = false; applyUpgrades(); SFX.musicAuto();
};
Story.vortexAgain = function () {
  return this.run(async () => {
    const P = Player, nh = () => this.nathanHead();
    await this.say('NATHAN', 'The trophies… they\'re reacting to me. To everything I\'ve got.', nh);
    Act3.vortex = { t: 0, r: 0 }; SFX.summon(); SFX.thunder(); addShake(10);
    this.camTarget = { x: A.net, y: A.courtFloor - 120 };
    await this.tween(Act3.vortex, 'r', 1, 2.2);
    SFX.bigCrack(); SFX.boom(); Game.flashWhite = 0.8; addShake(24);
    openCoreHole(); Save.data.coreOpen = true; saveGame();
    burst(A.net, A.courtFloor, 60, { colors: ['#d9cbb0', '#1a0f22', GOLD, '#d9b8ff'], maxSpeed: 700, grav: 1400, type: 'debris' });
    P.x = clamp(P.x, A.hole.tx * TILE + 2 * TILE, (A.hole.tx + A.hole.w) * TILE - 2 * TILE - P.w);
    Act3.vortex = null; this.camTarget = null;
  });
};

/* ---------- Physics hooks: cursed gravity, the ceiling, the draft out of the Core ---------- */
PAGE.physics = dt => {
  const P = Player, id = Zone.room.id;
  P.gravK = Act3.grav === 'flip' ? -0.42 : Act3.grav === 'low' ? 0.4 : 1;
  if (Act3.grav === 'flip' && !P.dead && !P.hazard) {
    // you can't land, so the Spire keeps refilling your baseballs and air dash
    Act3.refillT -= dt; if (Act3.refillT <= 0) { Act3.refillT = 0.9; P.balls = TUNE.ballCount; P.canDash = true; }
    // dark energy pools on the ceiling
    if (P.y < ROOM.t_court.px.y + 3 * TILE) { P.hurt(1); P.vy = Math.max(P.vy, 520); }
  }
  if (Act3.grav !== 'normal' && Math.random() < 0.3) spawnParticle({ x: P.x + rand(0, P.w), y: Act3.grav === 'flip' ? P.y : P.y + P.h, vx: rand(-20, 20), vy: Act3.grav === 'flip' ? rand(-80, -30) : rand(-50, -20), life: 0.5, size: 2.5, color: '#d9b8ff', type: 'dot' });
};
PAGE.update = dt => {
  updateFX(dt);
  if (Act3.assist) { Act3.assist.update(dt); if (Act3.assist.done) Act3.assist = null; }
  if (Act3.buddy) Act3.buddy.update(dt);
};
PAGE.tick = dt => {
  const P = Player, B = Zone.boss;
  Act3.shatter = Math.max(0, Act3.shatter - dt * 0.45);
  Act3.shieldT = Math.max(0, Act3.shieldT - dt);
  if (Act3.reshmanPop) Act3.reshmanPop.t += dt;
  if (Scene.on) Scene.t += dt;
  if (Act3.vortex) Act3.vortex.t += dt;
  if (Act3.trophiesBroken) Act3.dark = Math.min(1, Act3.dark + dt * 0.8);
  if (Act3.goldBall) { const g = Act3.goldBall; g.t += dt; const k = Math.min(1, g.t / 0.8); g.x = lerp(g.from.x, P.x + P.w / 2, k); g.y = lerp(g.from.y, P.y + 10, k) - Math.sin(k * Math.PI) * 90; }
  // Evil Adam twists Adam's catchphrases whenever he lands a hit
  if (B instanceof EvilAdam && B.state !== 'wait' && B.state !== 'beaten' && P.hp < Act3.lastHp) B.taunt();
  Act3.lastHp = P.hp;
  // the Spire crumbling (Ending A)
  if (Act3.crumble && Math.random() < 0.5) spawnParticle({ x: Game.cam.x + rand(0, VW), y: Game.cam.y - 10, vx: rand(-40, 40), vy: rand(200, 500), life: 1.6, size: rand(5, 12), grav: 900, color: Math.random() < 0.5 ? '#d9cbb0' : '#c9a33a', type: 'debris', rot: rand(0, 6), vr: rand(-6, 6) });
  if (Act3.crumble) addShake(4);
  // after an ending card closes, carry on from the locker room bench
  if (Act3.endShown && UI.modal !== 'end') {
    Act3.endShown = false; Scene.on = null; Scene.white = 0;
    const b = A.benches[1], D = Save.data; D.bench4 = 1; D.where = 'z9'; Game.checkpoint = 1; saveGame();
    Player.reset(b.pos, true); applyUpgrades(); enterRoom(ROOM[b.room]); snapCamera(); Game.fade = 1; Game.fadeTarget = 0;
    if (Act3.wantChecklist) { Act3.wantChecklist = false; setTimeout(showTrueChecklist, 400); }
  }
};

/* ---------- Interactions ---------- */
const near = (rect, c, feet) => c.x > rect.x && c.x < rect.x + rect.w && feet > rect.y && feet <= rect.y + rect.h + 2;
PAGE.interact = (dt, c, feet) => {
  const P = Player, D = Save.data, id = Zone.room.id, B = Zone.boss;
  if (id === 't_steps' && !D.stadium && !Act3.introStarted && P.onGround) { Act3.introStarted = true; Story.stadiumArrive(); }
  // the Pennant Gate elevator, back down to the Concourse
  Act3.liftNear = id === 't_steps' && near(A.liftS, c, feet);
  if (Act3.liftNear && Input.pressed('up') && P.onGround && !Act3.leaving) { Act3.leaving = true; SFX.gate(); goToPage('act2.html#from-z9'); }
  // Adam in the locker room
  if (id === 't_locker' && Act3.adam && !D.adamAssist && !Act3.adamStarted && c.x > A.adamTrigger && P.onGround) { Act3.adamStarted = true; Story.adamAssist(Act3.adam).then(() => { Object.assign(Act3.adam, { reach: 50, prompt: 'TALK', onTalk: n => Story.adamTalk(n) }); }); }
  // the stadium's double doors
  Act3.doorNear = id === 't_locker' && !D.walls.court_door && c.x > A.doors.x - 2 * TILE && feet > A.doors.y;
  if (Act3.doorNear && Input.pressed('up') && P.onGround) { if (D.adamAssist) Story.kickDoors(); else toast('LOCKED TIGHT. SOMEBODY\'S BREATHING BEHIND THAT PILLAR…'); }
  // Evil Adam
  if (id === 't_court' && B instanceof EvilAdam && B.state === 'wait' && !Act3.fightIntro && P.onGround && c.x > A.courtTrigger) { Act3.fightIntro = true; Story.evilIntro(B); }
  // after Ending A: the Cursed Trophies still hum
  if (id === 't_court' && D.evilAdamDead && !D.coreOpen && !Act3.courtNote && P.onGround && c.x > A.courtTrigger) {
    Act3.courtNote = true;
    if (trueEndingReady()) Story.vortexAgain(); else setTimeout(showTrueChecklist, 300);
  }
  // Zennith
  if (id === 'z_core' && B instanceof Zennith && B.state === 'wait' && !Act3.fightIntro && P.onGround) { Act3.fightIntro = true; Story.coreReveal(B); }
  // the memory-portal back up to the locker room
  Act3.exitNear = id === 'z_core' && !B && Math.abs(c.x - CORE_EXIT.x) < 40 && Math.abs(feet - CORE_EXIT.y) < 12;
  if (Act3.exitNear && Input.pressed('up') && P.onGround && !Act3.leaving) {
    Act3.leaving = true; SFX.summon(); Game.fadeTarget = 1; Input.enabled = false;
    setTimeout(() => { const b = A.benches[1]; Player.reset(b.pos, true); applyUpgrades(); enterRoom(ROOM[b.room]); snapCamera(); Game.fadeTarget = 0; Input.enabled = true; Act3.leaving = false; }, 600);
  }
};

/* ---------- Backgrounds ---------- */
const COLS = Array.from({ length: 7 }, (_, i) => ({ x: i * 360, s: (i * 37) % 5 }));
function bgStadium(cx, cy, court) {
  const t = Game.time;
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#2a0f3a'); g.addColorStop(0.45, '#6a3a8a'); g.addColorStop(0.82, '#f2c14e'); g.addColorStop(1, '#fff0c8');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  // the violet sky swirls
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 5; k++) {
    const x = VW * 0.5 + Math.cos(t * 0.05 + k * 1.3) * VW * 0.42 - cx * 0.02, y = VH * 0.22 + Math.sin(t * 0.07 + k) * 60;
    const rg = ctx.createRadialGradient(x, y, 0, x, y, 280); rg.addColorStop(0, 'rgba(185,139,255,.2)'); rg.addColorStop(1, 'rgba(185,139,255,0)');
    ctx.fillStyle = rg; ctx.fillRect(x - 280, y - 280, 560, 560);
  }
  ctx.restore();
  // clouds far below the floating coliseum
  ctx.fillStyle = 'rgba(255,246,230,.55)';
  for (let k = 0; k < 8; k++) { const x = ((k * 300 - cx * 0.08 + t * 6) % 2400 + 2400) % 2400 - 200, y = VH * 0.88 + (k % 3) * 14; ctx.beginPath(); ctx.ellipse(x, y, 190, 26, 0, 0, 7); ctx.ellipse(x + 110, y - 12, 110, 22, 0, 0, 7); ctx.fill(); }
  // crowd in the stands (court only)
  if (court) {
    for (let row = 0; row < 3; row++) {
      const y = VH * (0.56 + row * 0.09), off = cx * (0.25 + row * 0.05);
      ctx.fillStyle = ['#3a1f4a', '#2a1238', '#1e0c2a'][row]; ctx.fillRect(0, y + 8, VW, VH * 0.09);
      for (let x = -((off) % 26); x < VW + 26; x += 26) { const bob = Math.abs(Math.sin(t * 6 + x * 0.13 + row)) * 4; ctx.beginPath(); ctx.arc(x, y + 6 - bob, 8, 0, 7); ctx.fill(); }
      if (Math.random() < 0.08) { ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillRect(rand(0, VW), y + rand(0, 10), 3, 3); }
    }
  }
  // the marble colonnade, with twisted crest banners between the columns
  const span = 7 * 360;
  for (const c of COLS) {
    const x = ((c.x - cx * 0.3) % span + span) % span - 200;
    ctx.fillStyle = 'rgba(236,226,204,.9)'; ctx.fillRect(x, 0, 70, VH);
    ctx.fillStyle = 'rgba(180,165,135,.6)'; for (let k = 1; k < 4; k++) ctx.fillRect(x + k * 17, 0, 3, VH);
    ctx.fillStyle = '#c9a33a'; ctx.fillRect(x - 10, 18, 90, 16); ctx.fillRect(x - 6, 34, 82, 6);
    const bx = x + 150, sway = Math.sin(t * 1.3 + c.s) * 3;
    ctx.save(); ctx.translate(bx, 40); ctx.rotate(sway * 0.01);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(76, 0); ctx.lineTo(76, 150); ctx.lineTo(38, 130); ctx.lineTo(0, 150); ctx.closePath(); ctx.fillStyle = court && Act3.dark > 0.5 ? '#1a0a24' : '#3a1a4a'; ctx.fill();
    ctx.strokeStyle = '#c9a33a'; ctx.lineWidth = 3; ctx.stroke();
    // a cracked baseball pierced by a thorny racket
    ctx.beginPath(); ctx.arc(38, 60, 18, 0, 7); ctx.fillStyle = '#d9cbb0'; ctx.fill(); ctx.strokeStyle = '#1a0f22'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(32, 44); ctx.lineTo(40, 58); ctx.lineTo(34, 66); ctx.lineTo(42, 76); ctx.stroke();
    ctx.strokeStyle = '#7a1f6e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(10, 100); ctx.lineTo(66, 24); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(66, 24, 9, 6, -0.9, 0, 7); ctx.stroke();
    for (let k = 0; k < 4; k++) { const px = 18 + k * 12, py = 89 - k * 16; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - 6, py - 4); ctx.stroke(); }
    ctx.restore();
  }
  // golden light shafts
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 4; k++) { const x = ((k * 520 - cx * 0.12) % 2080 + 2080) % 2080 - 200; const lg = ctx.createLinearGradient(x, 0, x + 160, VH); lg.addColorStop(0, `rgba(255,230,160,${0.14 + Math.sin(t + k) * 0.03})`); lg.addColorStop(1, 'rgba(255,230,160,0)'); ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 70, 0); ctx.lineTo(x + 260, VH); ctx.lineTo(x + 140, VH); ctx.fill(); }
  ctx.restore();
  if (court && Act3.dark > 0) { ctx.fillStyle = `rgba(20,8,30,${Act3.dark * 0.5})`; ctx.fillRect(0, 0, VW, VH); }
  if (Act3.grav === 'flip') { ctx.fillStyle = 'rgba(122,31,110,.14)'; ctx.fillRect(0, 0, VW, VH); }
}
const MEMS = Array.from({ length: 7 }, (_, i) => ({ x: i * 330 + 60, y: 0.15 + ((i * 41) % 50) / 100, k: i % 3, s: 0.7 + (i % 3) * 0.15 }));
function bgCore(cx, cy) {
  const t = Game.time;
  const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#06040c'); g.addColorStop(0.6, '#140a22'); g.addColorStop(1, '#1e1030');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  // the rainy diamond, far below
  ctx.save(); ctx.translate(VW / 2 - cx * 0.05 % 200, VH * 0.86); ctx.scale(1, 0.32);
  ctx.strokeStyle = 'rgba(217,184,255,.25)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, -240); ctx.lineTo(240, 0); ctx.lineTo(0, 240); ctx.lineTo(-240, 0); ctx.closePath(); ctx.stroke();
  ctx.fillStyle = 'rgba(217,184,255,.25)'; for (const [x, y] of [[0, -240], [240, 0], [0, 240], [-240, 0]]) ctx.fillRect(x - 10, y - 10, 20, 20);
  ctx.restore();
  // floating memories of that night
  for (const m of MEMS) {
    const x = ((m.x - cx * 0.18) % 2310 + 2310) % 2310 - 150, y = VH * m.y + Math.sin(t * 0.5 + m.x) * 12;
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 0.3 + m.x) * 0.06); ctx.scale(m.s, m.s);
    ctx.fillStyle = 'rgba(60,45,70,.7)'; ctx.fillRect(-60, -40, 120, 80); ctx.strokeStyle = 'rgba(217,184,255,.45)'; ctx.lineWidth = 3; ctx.strokeRect(-60, -40, 120, 80);
    ctx.fillStyle = 'rgba(243,234,216,.55)'; ctx.font = `14px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (m.k === 0) { ctx.fillText('HOME 3 · AWAY 4', 0, -8); ctx.font = `11px ${DISPLAY_FONT}`; ctx.fillText('BOTTOM 9TH · 2 OUTS', 0, 12); }
    else if (m.k === 1) { ctx.fillRect(-12, 10, 24, 6); ctx.fillRect(-3, -4, 6, 14); ctx.beginPath(); ctx.moveTo(-18, -28); ctx.lineTo(18, -28); ctx.quadraticCurveTo(16, -6, 0, -4); ctx.quadraticCurveTo(-16, -6, -18, -28); ctx.fill(); ctx.strokeStyle = 'rgba(232,54,28,.7)'; ctx.beginPath(); ctx.moveTo(-6, -28); ctx.lineTo(2, -16); ctx.lineTo(-4, -8); ctx.stroke(); }
    else { ctx.beginPath(); ctx.arc(-10, -14, 8, 0, 7); ctx.fill(); ctx.fillRect(-16, -6, 12, 22); ctx.save(); ctx.translate(-4, -2); ctx.rotate(-0.8); ctx.fillRect(0, -2, 36, 4); ctx.restore(); }
    ctx.restore();
  }
  // rain
  ctx.strokeStyle = 'rgba(190,200,255,.22)'; ctx.lineWidth = 1.5;
  for (let k = 0; k < 80; k++) { const x = ((k * 61 + t * 120) % (VW + 100)) - 50, y = ((k * 113 + t * 820) % (VH + 40)) - 20; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 18); ctx.stroke(); }
  if (Act3.sunlight > 0) { const sg = ctx.createRadialGradient(VW / 2, VH * 0.3, 0, VW / 2, VH * 0.3, VH * 1.2); sg.addColorStop(0, `rgba(255,246,216,${Act3.sunlight})`); sg.addColorStop(1, `rgba(255,210,122,${Act3.sunlight * 0.6})`); ctx.fillStyle = sg; ctx.fillRect(0, 0, VW, VH); }
}

/* ---------- Render helpers ---------- */
function drawLift(rect, label) {
  const x = rect.x, y = rect.y + rect.h, w = rect.w;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x + 6, y - 400, w - 12, 400);
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(x + 4, y - 150, w - 8, 150);
  ctx.strokeStyle = GOLD; ctx.lineWidth = 2; for (let k = 1; k < 6; k++) { ctx.beginPath(); ctx.moveTo(x + 4 + k * (w - 8) / 6, y - 150); ctx.lineTo(x + 4 + k * (w - 8) / 6, y); ctx.stroke(); }
  rr(x, y - 8, w, 8, 2); inked('#8a6a2a', 3); rr(x, y - 158, w, 10, 2); inked('#5a4320', 3);
  PENNANT_KEYS.forEach((k, i) => drawPennant(x + 26 + i * 52, y - 168, Game.time + i, 0.6));
  ctx.restore();
  if (Act3.liftNear) { ctx.font = `14px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = GOLD; ctx.fillText('▲ ' + Bindings.label('up', Game.lastInput) + ' · ' + label, x + w / 2, y - 210 + Math.sin(Game.time * 4) * 2); }
}
const PENNANT_KEYS = ['fionn', 'milo', 'deniz'];
function drawLockers() {
  const r = ROOM.t_locker.px, fy = 20 * TILE;
  ctx.save(); ctx.lineJoin = 'round';
  for (let k = 0; k < 9; k++) { const x = r.x + 2 * TILE + k * 70; rr(x, fy - 150, 60, 150, 3); inked(k % 2 ? '#c9a33a' : '#b8902a', 3); ctx.fillStyle = INK; for (let j = 0; j < 4; j++) ctx.fillRect(x + 12, fy - 136 + j * 6, 36, 2); ctx.fillRect(x + 48, fy - 80, 4, 14); }
  // the marble pillar Adam is leaning on
  const px = A.adam.x + 22; ctx.fillStyle = '#ece2cc'; ctx.fillRect(px, r.y + TILE, 48, fy - r.y - TILE); ctx.fillStyle = 'rgba(180,165,135,.6)'; for (let k = 1; k < 3; k++) ctx.fillRect(px + k * 16, r.y + TILE, 3, fy - r.y - TILE);
  ctx.fillStyle = '#c9a33a'; ctx.fillRect(px - 8, fy - 14, 64, 14);
  ctx.font = `16px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = GOLD; ctx.fillText('VISITORS', r.x + 8 * TILE, fy - 170);
  ctx.restore();
}
function drawDoors() {
  const d = A.doors, op = Act3.doorOpen, cx = d.x + d.w / 2;
  ctx.save(); ctx.lineJoin = 'round';
  ctx.fillStyle = op > 0 ? '#fff0c8' : '#2a1a10'; ctx.fillRect(d.x, d.y, d.w, d.h);
  if (op > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(cx, d.y + d.h / 2, 0, cx, d.y + d.h / 2, 200); g.addColorStop(0, `rgba(255,230,160,${0.5 * op})`); g.addColorStop(1, 'rgba(255,230,160,0)'); ctx.fillStyle = g; ctx.fillRect(cx - 200, d.y - 100, 400, 400); ctx.restore(); }
  const half = d.w / 2, pw = half * (1 - op * 0.85);
  rr(d.x, d.y, pw, d.h, 3); inked('#c9a33a', 3); rr(d.x + d.w - pw, d.y, pw, d.h, 3); inked('#c9a33a', 3);
  if (op < 0.5) { ctx.fillStyle = INK; ctx.fillRect(cx - 8, d.y + d.h / 2, 5, 18); ctx.fillRect(cx + 3, d.y + d.h / 2, 5, 18); }
  ctx.font = `13px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = GOLD; ctx.fillText('GRAND CHAMPIONSHIP COURT', cx, d.y - 18);
  ctx.restore();
  if (Act3.doorNear && !Story.active) { ctx.font = `14px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = GOLD; ctx.fillText('▲ ' + Bindings.label('up', Game.lastInput) + ' · KICK THE DOORS OPEN', cx - 40, d.y - 40 + Math.sin(Game.time * 4) * 2); }
}
function drawNet() {
  const x = A.net, fy = A.courtFloor;
  ctx.save(); ctx.fillStyle = INK; ctx.fillRect(x - 3, fy - 44, 6, 44);
  ctx.strokeStyle = 'rgba(243,234,216,.55)'; ctx.lineWidth = 1; for (let y = fy - 40; y < fy; y += 8) { ctx.beginPath(); ctx.moveTo(x - 1, y); ctx.lineTo(x + 1, y); ctx.stroke(); }
  ctx.fillStyle = BONE; ctx.fillRect(x - 5, fy - 46, 10, 4); ctx.restore();
}
function drawCourtTrophies() {
  const D = Save.data, t = Game.time;
  if (D.zennithDead || (D.coreOpen && D.evilAdamDead)) { Act3.trophies = []; return; }
  // they spin up while Evil Adam folds his arms for phase 2, and stay quicker after
  const b = Zone.boss, want = b && b.state === 'shatter' ? 2.6 : b && b.ph >= 2 && !D.evilAdamDead ? 0.7 : 0.4;
  Act3.orbS = lerp(Act3.orbS || 0.4, want, 0.04); Act3.orbA = (Act3.orbA || t * 0.4) + Act3.orbS * Math.min(0.05, t - (Act3.orbT || t)); Act3.orbT = t;
  Act3.trophies = [0, 1, 2, 3].map(k => { const a = Act3.orbA + k * Math.PI / 2; return { x: A.net + Math.cos(a) * 520, y: 6 * TILE + Math.sin(a * 2) * 40 }; });
  Act3.trophies.forEach((tr, k) => { if (k < Act3.trophiesBroken) return; drawTrophy(tr.x, tr.y, 1.2, t + k, { cracked: D.evilAdamDead }); });
}
function drawVortex() {
  const V = Act3.vortex; if (!V) return;
  const x = A.net, y = A.courtFloor - 5 * TILE, r = 170 * V.r;
  ctx.save();
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 1.6); g.addColorStop(0, 'rgba(10,4,18,.95)'); g.addColorStop(0.6, 'rgba(122,31,110,.6)'); g.addColorStop(1, 'rgba(122,31,110,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 1.6, 0, 7); ctx.fill();
  ctx.strokeStyle = GOLD; ctx.lineWidth = 3;
  for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.arc(x, y, r * (0.3 + k * 0.12), V.t * (3 + k) + k, V.t * (3 + k) + k + 2.2); ctx.stroke(); }
  for (let k = 0; k < 4; k++) { const a = V.t * 4 + k * Math.PI / 2, d = r * (1.4 - V.r * 0.9); drawTrophy(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.5, 0.8, V.t + k); }
  ctx.restore();
}
function drawScreenCracks() {
  const a = Act3.shatter; if (a <= 0) return;
  ctx.save(); ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = 3; ctx.lineCap = 'round';
  const cx = VW / 2, cy = VH / 2;
  for (let k = 0; k < 14; k++) {
    let x = cx, y = cy; const ang = k / 14 * Math.PI * 2 + (k * 37 % 5) * 0.05;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let s = 1; s < 7; s++) { x = cx + Math.cos(ang + Math.sin(s * k) * 0.15) * s * VW * 0.09; y = cy + Math.sin(ang + Math.cos(s * k) * 0.15) * s * VW * 0.09; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  ctx.restore();
}
function drawGravityMeter() {
  const B = Zone.boss;
  if (!(B instanceof EvilAdam) || B.ph !== 2 || Story.active) return;
  const s = Act3.grav === 'normal' ? `NEXT: ${B.gravNext === 'flip' ? 'GRAVITY FLIP' : 'LOW GRAVITY'} · ${Math.max(0, Math.ceil(B.gravT))}` : `${Act3.grav === 'flip' ? 'GRAVITY FLIPPED' : 'LOW GRAVITY'} · ${Math.max(0, Math.ceil(B.gravT))}`;
  ctx.font = `16px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = Act3.grav === 'normal' ? (Act3.gravWarn && Math.sin(Game.time * 20) > 0 ? FLAME : 'rgba(243,234,216,.75)') : '#d9b8ff';
  ctx.fillText(s, VW / 2, VH * 0.14);
}

Game.hooks = {
  noGrid: true,
  background(cx, cy) { const id = Zone.room.id; if (Zone.room.zone === 'z10') bgCore(cx, cy); else bgStadium(cx, cy, id === 't_court'); },
  behindTiles() {
    const id = Zone.room.id;
    if (id === 't_steps') drawLift(A.liftS, 'DOWN TO THE CONCOURSE');
    if (id === 't_locker') drawLockers();
    if (id === 't_locker' || id === 't_court') drawDoors();
    if (id === 't_court') { drawCourtTrophies(); drawNet(); drawVortex(); }
    if (id === 'z_core' && !Zone.boss) {
      drawPortal(CORE_EXIT.x, CORE_EXIT.y - 48, 42, Game.time, '255,210,122', 1);
      if (Act3.exitNear) { ctx.font = `14px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = GOLD; ctx.fillText('▲ ' + Bindings.label('up', Game.lastInput) + ' · BACK TO THE LOCKER ROOM', CORE_EXIT.x, CORE_EXIT.y - 112 + Math.sin(Game.time * 4) * 2); }
    }
  },
  back() {
    drawLasers();
    for (const b of Breakables) drawCracks(b);
    if (Act3.portal) drawPortal(Act3.portal.x, Act3.portal.y, 46, Game.time, '111,211,255', Act3.portal.open);
    for (const n of NPCs) n.draw();
    drawPickups(); drawHazards(); drawFX();
    if (Act3.assist) Act3.assist.draw();
    if (Act3.buddy) Act3.buddy.draw();
    if (Act3.goldBall) { const g = Act3.goldBall, gl = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, 30); gl.addColorStop(0, 'rgba(255,210,122,.8)'); gl.addColorStop(1, 'rgba(255,210,122,0)'); ctx.fillStyle = gl; ctx.fillRect(g.x - 30, g.y - 30, 60, 60); ctx.beginPath(); ctx.arc(g.x, g.y, 8, 0, 7); inked(GOLD, 2.5); }
  },
  front() { drawStormShield(); drawReshmanPop(); },
  top() {
    for (const n of NPCs) if (n.kind === 'reshman' && !n.gone && n.drawEyes) n.drawEyes();
  },
  screen() {
    drawScreenCracks(); drawGravityMeter();
    Story.drawScreen();
    if (Scene.on || Scene.white > 0) {
      drawScene();
      if (Scene.on) Story.drawOverlays();
    }
  }
};

/* ---------- End card buttons ---------- */
$('#endStay').addEventListener('click', () => closeModal());
$('#endMenu').addEventListener('click', () => { saveGame(); location.href = 'index.html#menu'; });
$('#endGo').addEventListener('click', () => { Act3.wantChecklist = true; closeModal(); });
const _endCard = endCard;
endCard = function (mode) { _endCard(mode); Act3.endShown = true; };

/* ---------- Boot ---------- */
buildAct3();
(function boot() {
  const D = Save.data;
  D.introSeen = true;
  for (const b of BREAKS) if (D.walls[b.id]) fill(b.tx, b.ty, b.w, b.h, 0);
  if (D.walls.court_door) { setLock(A.doorLock, false); Act3.doorOpen = 1; } else setLock(A.doorLock, true);
  if (D.coreOpen) openCoreHole();
  LEVEL = { signs: [], benches: A.benches.map(b => ({ x: b.pos.x, y: b.pos.y })), labels: [], spawn: A.arriveS };
  Game.checkpoint = D.bench4;
  let pos, room, line;
  if (ARRIVE === 'from-z5') { pos = A.arriveS; room = 't_steps'; line = 'The Pennant Gate rises… and rises… and stops. Gold everywhere. Somewhere, a choir is singing.'; }
  else if (ARRIVE.startsWith('bell-')) { pos = A.bells.z9.pos; room = 't_steps'; line = 'Renas screeches to a halt. "The PEAK? Respect. Don\'t fall off."'; }
  else {
    const b = A.benches[D.bench4] || A.benches[0]; pos = b.pos; room = b.room;
    line = D.trueEnding ? 'The sun is out over the Spire now. Rematch whenever you like.' : D.evilAdamDead ? 'The Cursed Trophies are still humming above the court…' : `Welcome back. ${D.bolts} scrap bolts in your pocket. Evil Adam is waiting.`;
  }
  Player.reset(pos, false); Player.facing = 1;
  enterRoom(ROOM[room]);
  const z = ROOM[room].zone;
  setStartCard(ZONES[z].sub.toUpperCase(), ZONES[z].name.toUpperCase(), line);
  document.title = 'Extra Innings · ' + ZONES[z].name;
})();
PAGE.start = () => {
  const D = Save.data, z = Zone.room.zone;
  Game.fade = 1; Game.fadeTarget = 0; SFX.bench();
  if (!D.seenZones[z]) D.seenZones[z] = 1;
  zoneTitle(ZONES[z].name.toUpperCase(), ZONES[z].sub);
  roomMusic();
};
runPage();
