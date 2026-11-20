'use strict';
/* =========================================================
   ACT II MAIN · The Grand Concourse and the three upper biomes.
   Shared systems live in zone/common.js; this file wires up
   rooms, gadgets, bosses, the Pennant Gate and per-zone looks.
   ========================================================= */
const Act2 = { liftNear: null, leaving: false, fightIntro: false, rods: [], prevVx: 0, safe: null, gateNear: false, pennant: null, introStarted: false };
const Gate = { hint: 0, open: 0, insert: 0 };
const PAL = {
  z5: { a: '#2a2218', b: '#251e15', top: '#c9a33a', top2: '#8a6a2a', side: '#3a2e1e', plank: '#8a5a3a', plankHi: '#c9a36b', spike: '#f3ead8', vein: null, crystal: null, rivet: '#6b5530', fog: '120,90,30' },
  z6: { a: '#1e1530', b: '#1a1229', top: '#6a4a9a', top2: '#4a3270', side: '#2a1e40', plank: '#5e5270', plankHi: '#8a7aa8', spike: '#d9b8ff', vein: null, crystal: '#b98bff', rivet: null, fog: '70,30,110' },
  z7: { a: '#1a2420', b: '#16201c', top: '#4a7a5a', top2: '#2e5240', side: '#22302a', plank: '#6b5a4a', plankHi: '#8a7a5a', spike: '#d9e2e8', vein: null, crystal: null, rivet: null, fog: '60,50,100' },
  z8: { a: '#1a2a3a', b: '#172533', top: '#dff6ff', top2: '#9fd8e8', side: '#2a4258', plank: '#8a5a3a', plankHi: '#c9a36b', spike: '#dff6ff', vein: null, crystal: '#bfefff', rivet: null, fog: '120,170,210' },
};
Object.assign(PAGE, {
  id: 'z5', benchKey: 'bench3', benches: A.benches,
  zoneOf: id => ROOM[id].zone,
  zoneHere: () => Zone.room ? Zone.room.zone : 'z5',
  arriveAtBell(id) {
    const b = A.bells[id], hp = Player.hp;
    Player.reset(b.pos, true); Player.hp = hp; enterRoom(ROOM[b.room]); snapCamera();
  },
});

/* ---------- Rooms ---------- */
function enterRoom(r) {
  const D = Save.data, prevZone = Zone.room && Zone.room.zone;
  Zone.room = r;
  Enemies.length = 0; Bolts.length = 0; Balls.length = 0; Pickups.length = 0; Hazards.length = 0; NPCs.length = 0; Breakables.length = 0; FX.length = 0;
  if (Zone.boss) { Zone.boss = null; BossBar.hide(); }
  Act2.fightIntro = false;
  const dead = Zone.killed[r.id] || {};
  (SPAWNS[r.id] || []).forEach((s, i) => {
    if (dead[i]) return;
    const e = makeAct2Enemy(s); if (!e) return;
    e.spawnKey = i; e.spawnRoom = r.id; Enemies.push(e);
  });
  resetIcicles();
  Lasers.length = 0; for (const L of LASERS) if (L.room === r.id) Lasers.push(laserRect(L.tx, L.ty, L.h));
  Act2.rods = RODS.filter(x => x.room === r.id);
  for (const [z, b] of Object.entries(A.bells)) if (b.room === r.id) NPCs.push(new CallBell(b.pos.x, b.pos.y, z));
  for (const [z, p] of Object.entries(A.reshmen)) if (p.room === r.id) NPCs.push(new ReshmanVendor(p.pos.x, p.pos.y, z));
  for (const p of PEBBLES) if (p.room === r.id && !D.pebbles[p.id]) NPCs.push(new LuckyPebble(p.x, p.y, p.id));
  // bosses wait in their arenas
  if (r.id === 'g_pedestal' && !D.fionnDead) { setLock(A.fionnLock, false); Zone.boss = new Fionn(); Enemies.push(Zone.boss); }
  if (r.id === 's_fountain' && !D.miloDead) { setLock(A.miloLock, false); Zone.boss = new Milo(); Enemies.push(Zone.boss); }
  if (r.id === 'i_throne' && !D.denizDead) { setLock(A.denizLock, false); Zone.boss = new Deniz(); Enemies.push(Zone.boss); }
  // zone look + first-visit title card
  Game.tilePal = PAL[r.zone];
  if (r.zone !== prevZone && started) {
    if (!D.seenZones[r.zone]) { D.seenZones[r.zone] = 1; zoneTitle(ZONES[r.zone].name.toUpperCase(), ZONES[r.zone].sub); }
  }
  if (!D.visited[r.id]) { D.visited[r.id] = 1; saveGame(); if (started) roomToast(r.name); }
}
PAGE.onRespawn = () => {
  setLock(A.fionnLock, false); setLock(A.miloLock, false); setLock(A.denizLock, false);
  Zone.boss = null; BossBar.hide(); FX.length = 0; Player.slowT = 0; Player.chargeT = 0;
};

/* ---------- Physics hooks: updrafts, low gravity, gusts, ice, frost ---------- */
PAGE.physics = dt => {
  const P = Player, z = Zone.room.zone;
  for (const u of UPDRAFTS) applyUpdraft(u, dt);
  applyFields(dt);
  if (Zone.room.id === 's_gusts') applyGust(dt);
  // the Glacier Crown is slippery: solid ice floors keep your momentum (wooden planks don't)
  const [a, b] = standingOn(P);
  if (z === 'z8' && P.onGround && P.dashT <= 0 && P.recoilT <= 0 && (a === 1 || b === 1) && a !== 3 && b !== 3) {
    P.vx = Act2.prevVx + (P.vx - Act2.prevVx) * 0.14;
    if (Math.abs(P.vx) > 60 && Math.random() < 0.3) spawnParticle({ x: P.x + P.w / 2, y: P.y + P.h, vx: -P.vx * 0.2, vy: rand(-40, -10), life: 0.35, size: 2.5, color: '#dff6ff', type: 'dot' });
  }
  Act2.prevVx = P.vx;
  // frost needles slow you down
  if (P.slowT > 0) {
    P.slowT -= dt;
    const nx = P.x - P.vx * dt * 0.45, edge = P.vx < 0 ? nx + P.w : nx;
    if (!pointSolid(edge, P.y + 6) && !pointSolid(edge, P.y + P.h - 6)) P.x = nx;
    if (Math.random() < 0.3) spawnParticle({ x: P.x + rand(0, P.w), y: P.y + rand(0, P.h), vx: 0, vy: -20, life: 0.4, size: 2.5, color: '#bfefff', type: 'dot' });
  }
  // icicle stepping stones are temporary: never respawn on one
  if (onIcicleStone(P)) { if (Act2.safe) P.lastSafe = Act2.safe; }
  else Act2.safe = { x: P.lastSafe.x, y: P.lastSafe.y };
};
PAGE.update = dt => {
  updateFX(dt);
  for (const r of Act2.rods) updateRod(r, dt);
  if (Zone.room.id === 'i_halls') for (const i of ICICLES) updateIcicle(i, dt);
  if (Zone.room.id === 's_gusts') updateGust(dt);
};
PAGE.tick = dt => {
  const P = Player;
  Gate.hint = Math.max(0, Gate.hint - dt); Gate.insert = Math.max(0, Gate.insert - dt * 2);
  if (Act2.pennant) Act2.pennant.t += dt;
  // a charged bat (harvested from a lightning rod) hits twice as hard
  if (P.chargeT > 0) {
    P.chargeT -= dt; P.batDmg = P.batDmgBase * 2;
    if (Math.random() < 0.5) spawnParticle({ x: P.x + P.w / 2 + P.facing * rand(10, 30), y: P.y + rand(4, 24), vx: rand(-60, 60), vy: rand(-60, 60), life: 0.2, size: 2, color: '#fff27a', type: 'spark' });
    if (P.chargeT <= 0) { P.batDmg = P.batDmgBase; toast('THE CHARGE FIZZLES OUT'); }
  }
};

/* ---------- Interactions ---------- */
const near = (rect, c, feet) => c.x > rect.x && c.x < rect.x + rect.w && feet > rect.y && feet <= rect.y + rect.h + 2;
PAGE.interact = (dt, c, feet) => {
  const P = Player, D = Save.data, id = Zone.room.id, B = Zone.boss;
  // first look around the Concourse
  if (id === 'c_hall' && !D.concourse && !Act2.introStarted && P.onGround) { Act2.introStarted = true; Story.concourseArrive(); }
  // the golden lift back down to the Foundry
  Act2.liftNear = id === 'c_hall' && near(A.liftC, c, feet);
  if (Act2.liftNear && Input.pressed('up') && P.onGround && !Act2.leaving) {
    // sequence breakers (the Renas Shortcut / Shadow Portals) arrive before Daniel: the Foundry end is still sealed
    if (!D.danielDead) { SFX.deny(); toast('THE LIFT WON\'T BUDGE · THE FOUNDRY BELOW IS STILL LOCKED DOWN'); }
    else { Act2.leaving = true; SFX.gate(); goToPage('act1.html#from-z5'); }
  }
  // the Pennant Gate
  Act2.gateNear = id === 'c_hall' && near(A.gate, c, feet);
  if (Act2.gateNear && Input.pressed('up') && P.onGround) Story.gateUse();
  // bosses
  if (B && B.state === 'wait' && !Act2.fightIntro && P.onGround) {
    if (id === 'g_pedestal' && c.x > A.fionnTrigger) { Act2.fightIntro = true; Story.fionnIntro(B); }
    if (id === 's_fountain' && c.x > A.miloTrigger) { Act2.fightIntro = true; Story.miloIntro(B); }
    if (id === 'i_throne' && c.x < A.denizTrigger) { Act2.fightIntro = true; Story.denizIntro(B); }
  }
  // swing at a freshly struck lightning rod to charge your bat
  if (P.attackT > 0 && P.attackType !== 'launch') for (const r of Act2.rods) if (r.charged > 0 && overlap(P.hitbox(), rodRect(r))) {
    r.charged = 0; P.chargeT = 9; SFX.unlock(); SFX.staticBuzz(0.4); addShake(6);
    pop(r.x, r.y - 130, 'CHARGED BAT!', { size: 34, color: '#fff27a', burstColor: '#4a3a8a' });
    burst(r.x, r.y - 116, 20, { colors: ['#fff27a', '#ffffff'], maxSpeed: 420 });
    if (!D.chargeTip) { D.chargeTip = true; saveGame(); toast('CHARGED BAT · DOUBLE DAMAGE FOR 9 SECONDS'); }
  }
};

/* ---------- Backgrounds per zone ---------- */
const BGR = Array.from({ length: 16 }, (_, i) => ({ x: i * 240 + Math.random() * 100, h: 120 + Math.random() * 260, w: 60 + Math.random() * 120, s: Math.random() }));
function bgConcourse(cx, cy) {
  const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#2a3a5a'); g.addColorStop(0.55, '#7a5a4a'); g.addColorStop(1, '#3a2418');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  // the open sky above the atrium, with drifting clouds
  for (let k = 0; k < 6; k++) { const x = ((k * 380 - cx * 0.05 + Game.time * 8) % 2280 + 2280) % 2280 - 300, y = 60 + (k % 3) * 70 - cy * 0.03; ctx.fillStyle = 'rgba(255,230,200,.12)'; ctx.beginPath(); ctx.ellipse(x, y, 160, 28, 0, 0, 7); ctx.ellipse(x + 90, y - 14, 90, 22, 0, 0, 7); ctx.fill(); }
  // colossal marble pillars
  const span = 6 * 420;
  for (let k = 0; k < 6; k++) {
    const x = ((k * 420 - cx * 0.25) % span + span) % span - 200;
    ctx.fillStyle = 'rgba(60,45,30,.55)'; ctx.fillRect(x, 0, 90, VH);
    ctx.fillStyle = 'rgba(242,193,78,.08)'; ctx.fillRect(x + 10, 0, 12, VH);
    ctx.fillStyle = 'rgba(40,28,18,.6)'; ctx.fillRect(x - 12, VH * 0.2 - cy * 0.06 % 300, 114, 18);
  }
  // golden light shafts
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 4; k++) { const x = ((k * 520 - cx * 0.12) % 2080 + 2080) % 2080 - 200; const lg = ctx.createLinearGradient(x, 0, x + 160, VH); lg.addColorStop(0, `rgba(255,210,122,${0.12 + Math.sin(Game.time + k) * 0.03})`); lg.addColorStop(1, 'rgba(255,210,122,0)'); ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 70, 0); ctx.lineTo(x + 260, VH); ctx.lineTo(x + 140, VH); ctx.fill(); }
  ctx.restore();
}
function bgGeode(cx, cy) {
  const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#0c0718'); g.addColorStop(0.6, '#1a0f2e'); g.addColorStop(1, '#0f2a22');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 5; k++) { const x = ((k * 600 - cx * 0.1) % 3000 + 3000) % 3000 - 300, y = VH * (0.25 + (k % 3) * 0.22); const rg = ctx.createRadialGradient(x, y, 0, x, y, 260); rg.addColorStop(0, k % 2 ? 'rgba(80,220,150,.14)' : 'rgba(170,110,255,.16)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = rg; ctx.fillRect(x - 260, y - 260, 520, 520); }
  ctx.restore();
  // giant floating geodes, cracked open
  for (const r of BGR.slice(0, 7)) {
    const x = ((r.x * 1.3 - cx * 0.2) % 3400 + 3400) % 3400 - 200, y = VH * (0.2 + r.s * 0.55) - cy * 0.04 + Math.sin(Game.time * 0.6 + r.x) * 10, R2 = 30 + r.w * 0.35;
    ctx.fillStyle = 'rgba(40,30,60,.85)'; ctx.beginPath(); ctx.ellipse(x, y, R2, R2 * 0.8, 0.3, 0, 7); ctx.fill();
    ctx.fillStyle = r.s > 0.5 ? 'rgba(185,139,255,.35)' : 'rgba(155,227,200,.3)'; ctx.beginPath(); ctx.ellipse(x + R2 * 0.15, y, R2 * 0.55, R2 * 0.45, 0.3, 0, 7); ctx.fill();
  }
  // survey markers
  ctx.fillStyle = 'rgba(242,193,78,.25)';
  for (let k = 0; k < 4; k++) { const x = ((k * 700 - cx * 0.35) % 2800 + 2800) % 2800 - 100; ctx.fillRect(x, VH * 0.7, 4, 60); ctx.beginPath(); ctx.moveTo(x + 4, VH * 0.7); ctx.lineTo(x + 30, VH * 0.7 + 8); ctx.lineTo(x + 4, VH * 0.7 + 16); ctx.fill(); }
}
function bgStorm(cx, cy) {
  const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#0e0a1e'); g.addColorStop(0.5, '#221a3a'); g.addColorStop(1, '#14201a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  // swirling purple tornadoes on the horizon
  for (let k = 0; k < 3; k++) {
    const x = ((k * 800 - cx * 0.08) % 2400 + 2400) % 2400 - 200;
    for (let s = 0; s < 14; s++) { const y = VH - s * 40, w = 20 + s * 9, sw = Math.sin(Game.time * 2 + s * 0.5 + k) * 20; ctx.fillStyle = `rgba(110,80,160,${0.06 + s * 0.008})`; ctx.beginPath(); ctx.ellipse(x + sw, y, w, 12, 0, 0, 7); ctx.fill(); }
  }
  // shattered greenhouse frames
  ctx.strokeStyle = 'rgba(30,40,50,.8)'; ctx.lineWidth = 6;
  for (let k = 0; k < 5; k++) {
    const x = ((k * 520 - cx * 0.3) % 2600 + 2600) % 2600 - 200, y = VH * 0.35 - cy * 0.05;
    ctx.beginPath(); ctx.moveTo(x, VH); ctx.lineTo(x, y + 80); ctx.quadraticCurveTo(x + 130, y - 60, x + 260, y + 80); ctx.lineTo(x + 260, VH); ctx.stroke();
    ctx.lineWidth = 3; for (let j = 1; j < 4; j++) { ctx.beginPath(); ctx.moveTo(x + j * 65, y + 30 - Math.sin(j / 4 * Math.PI) * 60); ctx.lineTo(x + j * 65, VH); ctx.stroke(); } ctx.lineWidth = 6;
  }
  // rain
  ctx.strokeStyle = 'rgba(180,200,255,.22)'; ctx.lineWidth = 1.5;
  for (let k = 0; k < 70; k++) { const x = ((k * 61 + Game.time * 260) % (VW + 100)) - 50, y = ((k * 113 + Game.time * 900) % (VH + 40)) - 20; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 6, y + 18); ctx.stroke(); }
  // distant lightning
  const fl = Math.sin(Game.time * 0.7) > 0.985 || Math.sin(Game.time * 1.9 + 2) > 0.992;
  if (fl) { ctx.fillStyle = 'rgba(217,184,255,.18)'; ctx.fillRect(0, 0, VW, VH); if (!Act2.flashOn) { Act2.flashOn = true; SFX.thunder(); } } else Act2.flashOn = false;
}
function bgGlacier(cx, cy) {
  const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#0a1626'); g.addColorStop(0.6, '#16304a'); g.addColorStop(1, '#2a4a66');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  // frosted stained-glass windows
  for (let k = 0; k < 4; k++) {
    const x = ((k * 640 - cx * 0.18) % 2560 + 2560) % 2560 - 200, y = VH * 0.18 - cy * 0.04;
    ctx.fillStyle = 'rgba(10,20,34,.8)'; ctx.beginPath(); ctx.moveTo(x, y + 260); ctx.lineTo(x, y + 60); ctx.quadraticCurveTo(x + 70, y - 30, x + 140, y + 60); ctx.lineTo(x + 140, y + 260); ctx.fill();
    const cols = ['rgba(111,211,255,.25)', 'rgba(185,139,255,.2)', 'rgba(242,193,78,.18)', 'rgba(125,255,154,.16)'];
    for (let j = 0; j < 6; j++) { ctx.fillStyle = cols[(j + k) % 4]; ctx.fillRect(x + 12 + (j % 2) * 60, y + 70 + Math.floor(j / 2) * 60, 54, 54); }
    ctx.fillStyle = 'rgba(223,246,255,.15)'; ctx.fillRect(x, y + 250, 140, 10);
  }
  // jagged ice spires
  ctx.fillStyle = 'rgba(160,210,240,.12)';
  for (const r of BGR) { const x = ((r.x - cx * 0.35) % 3840 + 3840) % 3840 - 200, base = VH + 20 - cy * 0.04; ctx.beginPath(); ctx.moveTo(x, base); ctx.lineTo(x + r.w * 0.5, base - r.h); ctx.lineTo(x + r.w, base); ctx.fill(); }
  // snow
  ctx.fillStyle = 'rgba(240,250,255,.7)';
  const heavy = Zone.boss && Zone.boss.blizz ? 1 + Zone.boss.blizz * 3 : 1;
  for (let k = 0; k < 60 * heavy; k++) { const x = ((k * 71 + Math.sin(Game.time + k) * 30 - Game.time * 40 * heavy) % VW + VW) % VW, y = ((k * 97 + Game.time * (40 + (k % 4) * 15) * heavy) % VH); ctx.fillRect(x, y, 2 + (k % 2), 2 + (k % 2)); }
}

/* ---------- Render helpers ---------- */
function drawLift(rect, label) {
  const x = rect.x, y = rect.y + rect.h, w = rect.w;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x + 6, y - 400, w - 12, 400);
  ctx.strokeStyle = '#6b5530'; ctx.lineWidth = 3; for (const cx2 of [x + 12, x + w - 12]) { ctx.beginPath(); ctx.moveTo(cx2, y - 400); ctx.lineTo(cx2, y - 150); ctx.stroke(); }
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(x + 4, y - 150, w - 8, 150);
  ctx.strokeStyle = GOLD; ctx.lineWidth = 2; for (let k = 1; k < 6; k++) { ctx.beginPath(); ctx.moveTo(x + 4 + k * (w - 8) / 6, y - 150); ctx.lineTo(x + 4 + k * (w - 8) / 6, y); ctx.stroke(); }
  rr(x, y - 8, w, 8, 2); inked('#8a6a2a', 3); rr(x, y - 158, w, 10, 2); inked('#5a4320', 3);
  ctx.fillStyle = Math.sin(Game.time * 6) > 0 ? '#7dff9a' : '#2a5a3a'; ctx.beginPath(); ctx.arc(x + w / 2, y - 170, 5, 0, 7); ctx.fill();
  ctx.restore();
  if (Act2.liftNear) { ctx.font = `14px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = GOLD; ctx.fillText('▲ ' + Bindings.label('up', Game.lastInput) + ' · ' + label, x + w / 2, y - 186 + Math.sin(Game.time * 4) * 2); }
}
// the Pennant Gate: a massive golden elevator door with four pennant slots
function drawPennantGate() {
  const g = A.gate, D = Save.data, t = Game.time, cx = g.x + g.w / 2, bot = g.y + g.h, op = Gate.open || (D.gateOpen ? 1 : 0);
  ctx.save(); ctx.lineJoin = 'round';
  // frame + arch
  ctx.beginPath(); ctx.moveTo(g.x - 30, bot); ctx.lineTo(g.x - 30, g.y + 40); ctx.quadraticCurveTo(cx, g.y - 90, g.x + g.w + 30, g.y + 40); ctx.lineTo(g.x + g.w + 30, bot); ctx.closePath(); inked('#5a4320', 4);
  // what's behind: a beam of light up the shaft once it's open
  if (op > 0) {
    ctx.fillStyle = '#fff6d8'; ctx.fillRect(g.x + 8, g.y + 30, g.w - 16, g.h - 30);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const lg = ctx.createLinearGradient(0, g.y - 600, 0, bot); lg.addColorStop(0, 'rgba(255,230,160,0)'); lg.addColorStop(1, `rgba(255,230,160,${0.5 * op})`);
    ctx.fillStyle = lg; ctx.fillRect(g.x + 20, g.y - 600, g.w - 40, 600 + g.h); ctx.restore();
  }
  // the two door halves slide apart
  const half = (g.w - 16) / 2, slide = op * half;
  for (const s of [-1, 1]) {
    const dx = s < 0 ? g.x + 8 - slide : cx + slide;
    rr(dx, g.y + 30, half, g.h - 30, 3); inked('#c9a33a', 3);
    ctx.strokeStyle = 'rgba(90,67,32,.8)'; ctx.lineWidth = 2;
    for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(dx + 8, g.y + 30 + k * (g.h - 30) / 4); ctx.lineTo(dx + half - 8, g.y + 30 + k * (g.h - 30) / 4); ctx.stroke(); }
  }
  // the four slots (west · up · east · down)
  PENNANTS.forEach((k, i) => {
    const sx = cx + (i - 1.5) * 100, sy = g.y + 4;
    rr(sx - 22, sy - 30, 44, 62, 6); inked('#3a2c16', 3);
    if (D.slots[k]) { drawPennant(sx - 12, sy + 28, t + i, 0.9); if (Gate.insert > 0) { ctx.fillStyle = `rgba(255,240,180,${Gate.insert})`; ctx.fillRect(sx - 22, sy - 30, 44, 62); } }
    else { ctx.strokeStyle = `rgba(242,193,78,${0.35 + 0.2 * Math.sin(t * 3 + i)})`; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.strokeRect(sx - 14, sy - 22, 28, 46); ctx.setLineDash([]); }
  });
  ctx.font = `16px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = GOLD; ctx.fillText('THE PENNANT GATE', cx, g.y - 58);
  ctx.restore();
  // hint: three glowing arrows pointing at the biomes
  if (Gate.hint > 0) {
    const a = Math.min(1, Gate.hint), bob = Math.sin(t * 5) * 6;
    ctx.save(); ctx.globalAlpha = a; ctx.font = `15px ${DISPLAY_FONT}`; ctx.textAlign = 'center';
    const arrow = (x, y, ang, col, label, done) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
      ctx.beginPath(); ctx.moveTo(-26, -8); ctx.lineTo(8, -8); ctx.lineTo(8, -18); ctx.lineTo(30, 0); ctx.lineTo(8, 18); ctx.lineTo(8, 8); ctx.lineTo(-26, 8); ctx.closePath(); inked(done ? '#6b6f7a' : col, 3);
      ctx.restore(); ctx.fillStyle = done ? '#9aa3ad' : col; ctx.fillText(done ? label + ' ✓' : label, x, y + (ang === -Math.PI / 2 ? 40 : -26));
    };
    arrow(g.x - 90 + bob * -1, g.y + 30, Math.PI, '#b98bff', 'GEODE CAVERNS', D.pennants.fionn);
    arrow(cx, g.y - 110 - bob, -Math.PI / 2, '#d9b8ff', 'STORM ATRIUM', D.pennants.milo);
    arrow(g.x + g.w + 90 + bob, g.y + 30, 0, '#bfefff', 'GLACIER CROWN', D.pennants.deniz);
    arrow(cx, bot - 60 + bob, Math.PI / 2, '#5fd6c0', 'DOWN · UNDER THE DEEP QUARRY', D.pennants.maya);
    ctx.restore();
  }
  if (Act2.gateNear && !Story.active) { ctx.font = `14px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = GOLD; ctx.fillText('▲ ' + Bindings.label('up', Game.lastInput) + (D.gateOpen ? ' · RIDE TO THE PEAK' : ' · PENNANT GATE'), cx, bot - 170 + Math.sin(t * 4) * 2); }
}
function drawGoldDraft(u) {
  const t = Game.time;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(u.x, 0, u.x + u.w, 0); g.addColorStop(0, 'rgba(255,210,122,0)'); g.addColorStop(0.5, 'rgba(255,210,122,.16)'); g.addColorStop(1, 'rgba(255,210,122,0)');
  ctx.fillStyle = g; ctx.fillRect(u.x, u.y, u.w, u.h);
  for (let k = 0; k < 18; k++) { const x = u.x + ((k * 37) % u.w), y = u.y + u.h - ((t * 300 + k * 113) % u.h); ctx.fillStyle = 'rgba(255,230,160,.6)'; ctx.fillRect(x, y, 2, 10); }
  ctx.restore();
}
function drawPedestal() {
  const p = A.pedestal, t = Game.time;
  if (!Save.data.fionnDead || Act2.pennant) {
    const pt = Act2.pennant ? Act2.pennant.t : 0;
    const g = ctx.createRadialGradient(p.x, p.y - 40, 0, p.x, p.y - 40, 90); g.addColorStop(0, `rgba(242,193,78,${0.3 + Math.sin(t * 3) * 0.08})`); g.addColorStop(1, 'rgba(242,193,78,0)');
    ctx.fillStyle = g; ctx.fillRect(p.x - 90, p.y - 130, 180, 180);
    drawPennant(p.x - 4, p.y - pt * 70, t);
  }
  ctx.font = `11px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(243,234,216,.6)'; ctx.fillText('PROPERTY OF THE PEBBLE SOCIETY', p.x, p.y + 52);
}
function drawFountain() {
  const x = 260 * TILE, y = 19 * TILE, t = Game.time;
  ctx.save(); ctx.lineJoin = 'round';
  rr(x - 22, y - 70, 44, 70, 4); inked('#4a5a50', 3);
  ctx.beginPath(); ctx.ellipse(x, y - 74, 52, 10, 0, 0, 7); inked('#5a6a5e', 3);
  ctx.strokeStyle = 'rgba(13,11,16,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 10, y - 70); ctx.lineTo(x - 2, y - 40); ctx.lineTo(x - 12, y - 18); ctx.stroke();
  // water that now spirals upward into the storm
  ctx.strokeStyle = 'rgba(150,200,255,.45)'; ctx.lineWidth = 3;
  for (let k = 0; k < 3; k++) { ctx.beginPath(); for (let s = 0; s < 20; s++) { const yy = y - 80 - s * 12, xx = x + Math.sin(t * 4 + s * 0.6 + k * 2) * (8 + s * 1.5); s ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); }
  ctx.restore();
}
function drawThrone() {
  const x = 288 * TILE, y = 37 * TILE;
  ctx.save(); ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(x - 60, y); ctx.lineTo(x - 56, y - 110); ctx.lineTo(x - 36, y - 80); ctx.lineTo(x - 20, y - 150); ctx.lineTo(x, y - 96); ctx.lineTo(x + 20, y - 150); ctx.lineTo(x + 36, y - 80); ctx.lineTo(x + 56, y - 110); ctx.lineTo(x + 60, y); ctx.closePath();
  inked('rgba(191,239,255,.7)', 3);
  ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(x - 22, y - 130, 3, 90); ctx.fillRect(x + 18, y - 130, 3, 90);
  ctx.restore();
}

Game.hooks = {
  noGrid: true,
  background(cx, cy) { const z = Zone.room.zone; if (z === 'z5') bgConcourse(cx, cy); else if (z === 'z6') bgGeode(cx, cy); else if (z === 'z7') bgStorm(cx, cy); else bgGlacier(cx, cy); },
  behindTiles() {
    const id = Zone.room.id;
    for (const f of FIELDS) drawField(f);
    for (const u of UPDRAFTS) u.gold ? drawGoldDraft(u) : drawUpdraft(u);
    if (id === 'c_hall') { drawLift(A.liftC, 'DOWN TO THE FOUNDRY'); drawPennantGate(); }
    if (id === 'g_pedestal') drawPedestal();
    if (id === 's_fountain') drawFountain();
    if (id === 'i_throne') drawThrone();
  },
  back() {
    for (const r of Act2.rods) drawRod(r);
    if (Zone.room.id === 'i_halls') for (const i of ICICLES) drawIcicle(i);
    drawLasers();
    for (const n of NPCs) n.draw();
    drawPickups(); drawHazards(); drawFX();
  },
  front() {},
  top() {
    if (Zone.room.id === 's_gusts') drawGust();
    for (const n of NPCs) if (n.kind === 'reshman' && !n.gone) n.drawEyes();
    Story.drawBubble();
  },
  screen() { Story.drawScreen(); }
};

/* ---------- Boot ---------- */
buildAct2();
(function boot() {
  const D = Save.data;
  D.introSeen = true;
  LEVEL = { signs: [], benches: A.benches.map(b => ({ x: b.pos.x, y: b.pos.y })), labels: [], spawn: A.arriveC };
  Game.checkpoint = D.bench3;
  let pos, room, face = 1, line;
  const bell = ARRIVE.startsWith('bell-') && A.bells[ARRIVE.slice(5)];
  if (ARRIVE === 'from-z4') { pos = A.arriveC; room = 'c_hall'; line = 'The golden lift rattles to a stop. Fresh air, for once. And it smells like… rain?'; }
  else if (ARRIVE === 'from-z9') { pos = T(180, 87); room = 'c_hall'; line = 'The Pennant Gate sinks back down to the Concourse. The peak can wait a minute.'; }
  else if (ARRIVE === 'from-vent') { pos = T(126, 21); room = 's_gusts'; line = 'The vent spits you out into a howling garden. That is NOT the Foundry. …Is that a storm?'; }
  else if (ARRIVE === 'shadow-z8') { pos = T(270, 87); room = 'i_steps'; face = -1; line = 'You stumble out of a Shadow Portal into the cold. The Glacier Crown. Reshman, you legend.'; }
  else if (bell) { pos = bell.pos; room = bell.room; line = 'Renas screeches to a halt. "This high up? Sick. Don\'t tell Josh."'; }
  else { const b = A.benches[D.bench3] || A.benches[0]; pos = b.pos; room = b.room; line = `Welcome back. ${D.bolts} scrap bolts and ${pebblesFound()} Lucky Pebbles in your pocket.`; }
  Player.reset(pos, false); Player.facing = face;
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
};
runPage();
