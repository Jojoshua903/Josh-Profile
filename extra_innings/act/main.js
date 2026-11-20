'use strict';
/* =========================================================
   ACT I MAIN · Zones 2–4 (The Deep Quarry, the Ventilation
   Shafts, the Pyrotechnic Foundry). Shared systems live in
   zone/common.js; this file wires up rooms, gadgets, the
   Renas chase, bosses and per-zone looks.
   ========================================================= */
const Act = { vein: true, renas: null, lift: null, carts: [], fans: [], drafts: [], belts: [], leaving: false, introStarted: false, fightIntro: false };
const PAL = {
  z2: { a: '#2a1a16', b: '#24160f', top: '#6b3a22', top2: '#4a2614', side: '#341e14', plank: '#7a5232', plankHi: '#9a6a42', spike: '#ffc890', vein: 'rgba(255,110,30,A)', crystal: '#8fe3ff', rivet: null, fog: '90,30,10' },
  z3: { a: '#1f2a33', b: '#1a242c', top: '#5f7a8a', top2: '#3e5462', side: '#2a3842', plank: '#6b7a86', plankHi: '#8c9ba6', spike: '#d9e2e8', vein: null, crystal: null, rivet: '#4a5d6a', fog: '30,60,80' },
  z4: { a: '#2a1c1c', b: '#241818', top: '#7a4a2a', top2: '#552f1a', side: '#3a2420', plank: '#8a5a3a', plankHi: '#b8733c', spike: '#e8d0a8', vein: null, crystal: null, rivet: '#5a3a2a', fog: '80,30,20' },
  z12: { a: '#16262a', b: '#122024', top: '#3f6a4e', top2: '#2a4a38', side: '#1c3034', plank: '#5a6a5a', plankHi: '#7a8f78', spike: '#cfe8e0', vein: null, crystal: '#7ff0dc', rivet: '#2e4a4e', fog: '20,70,70' },
};
Object.assign(PAGE, {
  id: 'z2', benchKey: 'bench2', benches: A.benches,
  zoneOf: id => ROOM[id].zone,
  zoneHere: () => Zone.room ? Zone.room.zone : 'z2',
  arriveAtBell(id) {
    const b = A.bells[id], hp = Player.hp;
    Player.reset(b.pos, true); Player.hp = hp; enterRoom(ROOM[b.room]); snapCamera();
  },
});

/* ---------- Maps ---------- */
function collectMapZ2() {
  Save.data.maps.z2 = true; saveGame(); themeCheck();
  showCard('ITEM ACQUIRED', 'ZONE 2 MAP', 'Reshman left another map, a bit singed. The Deep Quarry is charted now.', [`<kbd>${Bindings.label('map')}</kbd> open map`]);
}
function collectMapZ4() {
  Save.data.maps.z4 = true; saveGame();
  showCard('ITEM ACQUIRED', 'FOUNDRY BLUEPRINT', 'A scorched factory floor plan pinned to the wall. Someone circled the Foundry Core about forty times and wrote "BOOM" next to it.', [`<kbd>${Bindings.label('map')}</kbd> open map`]);
}

/* ---------- The Renas chase (Zone 3 · Wind Tunnel) ---------- */
const CP = [{ x: 332 * TILE, y: 58 * TILE }, { x: 467 * TILE, y: 58 * TILE }, { x: 467 * TILE, y: 13 * TILE }, { x: 626 * TILE, y: 13 * TILE }];
const CL = [CP[1].x - CP[0].x, CP[1].y - CP[2].y, CP[3].x - CP[2].x], CTOTAL = CL[0] + CL[1] + CL[2];
const Chase = { on: false, s: 0, t: 0, dur: 90, failT: 0 };
function chasePoint(s) {
  s = clamp(s, 0, CTOTAL);
  if (s <= CL[0]) return { x: CP[0].x + s, y: CP[0].y, leg: 0 };
  if (s <= CL[0] + CL[1]) return { x: CP[1].x, y: CP[1].y - (s - CL[0]), leg: 1 };
  return { x: CP[2].x + (s - CL[0] - CL[1]), y: CP[2].y, leg: 2 };
}
function chaseProgress(c) {
  if (c.x < 461 * TILE) return c.x - CP[0].x;
  if (c.x < 476 * TILE && c.y > 20 * TILE) return CL[0] + clamp(CP[1].y - c.y, 0, CL[1]);
  return CL[0] + CL[1] + Math.max(0, c.x - CP[2].x);
}
function startChase() {
  Object.assign(Chase, { on: true, s: 0, t: 0, failT: 0 });
  Act.renas = { x: CP[0].x + 300, y: 65 * TILE, facing: 1, moving: true, t: 0 };
  $('#chase').classList.add('show'); SFX.scooter();
  pop(Player.x + 11, Player.y - 40, 'GO!', { size: 50 });
}
function stopChase() { Chase.on = false; $('#chase').classList.remove('show', 'hurry'); }
function failChase() {
  stopChase(); Act.renas = null;
  SFX.deny(); toast('TOO SLOW! RENAS IS WAITING AT THE START…');
  Game.fadeTarget = 1;
  setTimeout(() => {
    Player.reset(T(312, 65), true); Player.invuln = 1;
    enterRoom(ROOM.v_intake); snapCamera(); Game.fadeTarget = 0;
  }, 650);
}
function updateChase(dt) {
  if (!Chase.on) return;
  const P = Player, c = P.center();
  Chase.t += dt;
  const pt = chasePoint(Chase.s), lead = pt.leg === 1 ? VH * 0.22 : VW * 0.28;
  Chase.s = Math.min(CTOTAL, Math.max(Chase.s + (CTOTAL / Chase.dur) * dt, chaseProgress(c) - lead));
  const left = Math.max(0, Math.ceil(Chase.dur - Chase.t));
  $('#chaseT').textContent = left; $('#chase').classList.toggle('hurry', left <= 10);
  // Renas zooms along just ahead of the screen centre
  const rp = chasePoint(Chase.s + VW * 0.3), r = Act.renas;
  if (r) { r.x = rp.x; r.y = rp.leg === 0 ? 65 * TILE : rp.leg === 2 ? 20 * TILE : rp.y + 80; r.t += dt; r.facing = 1; }
  // fell behind the scrolling screen → fail
  const cam = Game.cam;
  if (!P.dead && (c.x < cam.x - 24 || c.y > cam.y + VH + 40 || c.x > cam.x + VW + 60)) { Chase.failT += dt; if (Chase.failT > 0.15) failChase(); }
  else Chase.failT = 0;
  // made it!
  if (chaseProgress(c) >= CTOTAL - 3 * TILE && P.onGround) {
    stopChase(); Act.renas = { x: 628 * TILE, y: 20 * TILE, facing: -1, moving: true, t: 0 };
    Story.chaseEnd();
  }
}
Zone.camOverride = dt => {
  if (!Chase.on) return false;
  const p = chasePoint(Chase.s), cam = Game.cam;
  cam.x = lerp(cam.x, p.x - VW / 2, 1 - Math.exp(-6 * dt)); cam.y = lerp(cam.y, p.y - VH / 2, 1 - Math.exp(-6 * dt));
  clampCam(); return true;
};

/* ---------- Rooms ---------- */
function enterRoom(r) {
  const D = Save.data, prevZone = Zone.room && Zone.room.zone;
  Zone.room = r;
  Enemies.length = 0; Bolts.length = 0; Balls.length = 0; Pickups.length = 0; Hazards.length = 0; NPCs.length = 0; Breakables.length = 0; FX.length = 0;
  if (Zone.boss) { Zone.boss = null; BossBar.hide(); }
  Act.fightIntro = false;
  const dead = Zone.killed[r.id] || {};
  (SPAWNS[r.id] || []).forEach((s, i) => {
    if (dead[i]) return;
    const e = makeActEnemy(s); if (!e) return;
    e.spawnKey = i; e.spawnRoom = r.id; Enemies.push(e);
  });
  // gadgets in this room
  Act.carts = CART_SPECS.filter(c => c.room === r.id).map(c => new Cart(c));
  Act.fans = FANS.filter(f => f.room === r.id).map(f => new Fan(f));
  Act.drafts = UPDRAFTS.filter(u => u.room === r.id);
  Act.belts = CONVEYORS.filter(c => c.room === r.id);
  FUSES.forEach(f => { if (f.state !== 'idle') { fill(f.tx, f.ty, f.w, 1, 1); f.state = 'idle'; } });
  // people & things
  for (const [z, b] of Object.entries(A.bells)) if (b.room === r.id) NPCs.push(new CallBell(b.pos.x, b.pos.y, z));
  for (const o of ORES) if (o.room === r.id && !D.ores[o.id]) NPCs.push(new OreChunk(o.x, o.y, o.id));
  for (const b of BREAKS) if (b.room === r.id && !D.walls[b.id]) Breakables.push({ x: b.tx * TILE, y: b.ty * TILE, w: b.w * TILE, h: b.h * TILE, id: b.id, onBreak: breakWall(b) });
  Lasers.length = 0; for (const L of LASERS) if (L.room === r.id) Lasers.push(laserRect(L.tx, L.ty, L.h));
  for (const p of PEBBLES) if (p.room === r.id && !D.pebbles[p.id]) NPCs.push(new LuckyPebble(p.x, p.y, p.id));
  if (r.id === 'f_core' && D.danielDead && !D.walls.f_core && started) setTimeout(() => toast(D.up.boom ? 'THE WALL BEHIND BIG BERTHA IS CRACKED… EXPLOSIVE BASEBALL?' : 'THE WALL BEHIND BIG BERTHA IS CRACKED… DANIEL WOULD KNOW WHAT TO DO'), 900);
  if (r.id === 'q_lars') Act.vein = !D.lars;
  if (r.id === 'q_lars' && !D.lars) NPCs.push(Act.lars = new CampNPC('lars', A.lars.x, A.lars.y, { cats: true, forge: true, fixed: true, facing: -1, triggered: false }));
  for (const [z, p] of Object.entries(A.reshmen)) if (p.room === r.id) NPCs.push(new ReshmanVendor(p.pos.x, p.pos.y, z));
  if (r.id === 'q_elevator' && !D.adamDead) { setLock(A.adamLock, false); Zone.boss = new Adam(A.adam.x, A.adam.y); Enemies.push(Zone.boss); }
  if (r.id === 'f_core' && !D.danielDead) { setLock(A.danielLock, false); Zone.boss = new Daniel(); Enemies.push(Zone.boss); }
  // zone look + first-visit title card
  Game.tilePal = PAL[r.zone];
  if (r.zone !== prevZone && D.introSeen !== undefined && started) {
    if (!D.seenZones[r.zone]) { D.seenZones[r.zone] = 1; zoneTitle(ZONES[r.zone].name.toUpperCase(), ZONES[r.zone].sub); }
  }
  if (!D.visited[r.id]) { D.visited[r.id] = 1; saveGame(); if (started) roomToast(r.name); }
  if (r.id === 'v_chase' && !D.chase && D.renasMet && started) startChase();
}
function breakWall(b) {
  return () => {
    const D = Save.data; D.walls[b.id] = 1; saveGame(); fill(b.tx, b.ty, b.w, b.h, 0);
    burst((b.tx + b.w / 2) * TILE, (b.ty + b.h / 2) * TILE, 28, { colors: ['#4a2c1a', '#7a5232', '#2a1a16'], maxSpeed: 480, grav: 1300, type: 'debris' });
    pop((b.tx + b.w / 2) * TILE, b.ty * TILE - 10, 'CRUMBLE!', { size: 34 });
    if (b.id === 'f_core') { toast('A GOLDEN LIFT WAS HIDING BEHIND THE CANNON!'); themeCheck(); }
    else if (b.id === 'q_floor') toast('THE FLOOR CAVES IN · SOMETHING IS DRIPPING DOWN THERE…');
    else toast('A SECRET PASSAGE!');
  };
}
PAGE.onRespawn = () => {
  setLock(A.adamLock, false); setLock(A.danielLock, false);
  Zone.boss = null; BossBar.hide(); FX.length = 0; stopChase(); Act.renas = null;
};

/* ---------- Physics hooks: carts, updrafts, conveyors ---------- */
PAGE.physics = dt => {
  for (const c of Act.carts) c.update(dt);
  for (const u of Act.drafts) applyUpdraft(u, dt);
  for (const b of Act.belts) applyConveyor(b, dt);
};
PAGE.update = dt => {
  for (const f of Act.fans) f.update(dt);
  for (const f of FUSES) updateFuse(f, dt, Zone.room.id);
  updateFX(dt);
  updateChase(dt);
};
PAGE.tick = dt => {
  if (Zone.room.zone === 'z4') updateSky(dt, Zone.boss && Zone.boss.lucky >= 2 && Zone.boss.state !== 'beaten' ? 0.14 : Zone.room.id === 'f_core' ? 0.7 : 1.6);
  if (Act.renas && !Chase.on) Act.renas.t += dt;
  if (Act.lift) Act.lift.t += dt * 1.4;
};

/* ---------- Interactions ---------- */
const near = (rect, c, feet) => c.x > rect.x && c.x < rect.x + rect.w && feet > rect.y && feet <= rect.y + rect.h + 2;
PAGE.interact = (dt, c, feet) => {
  const P = Player, D = Save.data, id = Zone.room.id, B = Zone.boss;
  // back to Zone 1
  if (id === 'q_mouth' && !Act.leaving && overlap(P, A.exitZ1)) { Act.leaving = true; goToPage('zone1.html#from-z2'); }
  // Lars
  if (id === 'q_lars' && Act.lars && !Act.lars.triggered && !D.lars && Math.abs(c.x - Act.lars.x) < 170) { Act.lars.triggered = true; Story.larsScene(Act.lars); }
  // bosses
  if (id === 'q_elevator' && B && B.state === 'wait' && !Act.fightIntro && c.x > A.adamTrigger) { Act.fightIntro = true; Story.adamIntro(B); }
  if (id === 'f_core' && B && B.state === 'wait' && !Act.fightIntro && c.x > A.danielTrigger) { Act.fightIntro = true; Story.danielIntro(B); }
  // Renas zooms past
  if (id === 'v_intake' && !D.renasMet && !Act.introStarted) { Act.introStarted = true; Story.renasIntro(); }
  // the Quarry Elevator
  Act.liftNear = null;
  if (id === 'q_elevator' && D.adamDead && near(A.liftQ, c, feet)) Act.liftNear = 'up';
  if (id === 'v_intake' && near(A.liftV, c, feet)) Act.liftNear = 'down';
  if (id === 'f_core' && D.walls.f_core && !Zone.boss && near(A.liftC, c, feet)) Act.liftNear = 'concourse';
  if (Act.liftNear && Input.pressed('up') && P.onGround) {
    if (Act.liftNear === 'concourse') { if (!Act.leaving) { Act.leaving = true; SFX.gate(); Act.lift = { t: 0, dir: 1 }; goToPage('act2.html#from-z4'); } }
    else Story.elevator(Act.liftNear === 'up' ? 1 : -1);
  }
};

/* ---------- Backgrounds per zone ---------- */
const BGR = Array.from({ length: 16 }, (_, i) => ({ x: i * 240 + Math.random() * 100, h: 120 + Math.random() * 260, w: 60 + Math.random() * 120 }));
function bgQuarry(cx, cy) {
  const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#0e0605'); g.addColorStop(0.6, '#231008'); g.addColorStop(1, '#431708');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  const glow = ctx.createRadialGradient(VW * 0.5, VH * 1.1, 0, VW * 0.5, VH * 1.1, VH); glow.addColorStop(0, 'rgba(255,100,30,.28)'); glow.addColorStop(1, 'rgba(255,100,30,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, VW, VH);
  // distant magma falls
  for (let k = 0; k < 3; k++) {
    const x = ((k * 700 - cx * 0.15) % 2100 + 2100) % 2100 - 200;
    const lg = ctx.createLinearGradient(x - 20, 0, x + 20, 0); lg.addColorStop(0, 'rgba(255,120,30,0)'); lg.addColorStop(0.5, `rgba(255,140,40,${0.22 + Math.sin(Game.time * 2 + k) * 0.05})`); lg.addColorStop(1, 'rgba(255,120,30,0)');
    ctx.fillStyle = lg; ctx.fillRect(x - 20, 0, 40, VH);
  }
  // jagged rock layers
  for (const [par, col, base] of [[0.2, '#1c0d08', 0.55], [0.4, '#160a06', 0.75]]) {
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, VH);
    const span = 16 * 240;
    for (const r of BGR) { const x = ((r.x - cx * par) % span + span) % span - 200; ctx.lineTo(x, VH * base - r.h * 0.5 - cy * par * 0.05); ctx.lineTo(x + r.w, VH * base + 20); }
    ctx.lineTo(VW, VH); ctx.closePath(); ctx.fill();
  }
  for (let k = 0; k < 40; k++) { const x = ((k * 97 - cx * 0.3) % VW + VW) % VW, y = VH - ((Game.time * (20 + k % 5 * 8) + k * 53) % VH); ctx.fillStyle = `rgba(255,${120 + (k % 4) * 30},40,${0.3 + (k % 3) * 0.15})`; ctx.fillRect(x, y, 2, 2); }
}
function bgVents(cx, cy) {
  const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#0a1219'); g.addColorStop(0.6, '#13202a'); g.addColorStop(1, '#1b2c38');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  // giant distant turbines
  for (let k = 0; k < 3; k++) {
    const x = ((k * 900 - cx * 0.12) % 2700 + 2700) % 2700 - 300, y = VH * (0.35 + k * 0.15) - cy * 0.03, R2 = 180 + k * 40;
    ctx.save(); ctx.translate(x, y); ctx.fillStyle = 'rgba(30,48,60,.7)'; ctx.beginPath(); ctx.arc(0, 0, R2 + 16, 0, 7); ctx.fill();
    ctx.rotate(Game.time * (0.6 + k * 0.2)); ctx.fillStyle = 'rgba(18,30,40,.9)';
    for (let b = 0; b < 4; b++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(0, -14); ctx.quadraticCurveTo(R2 * 0.6, -60, R2, -20); ctx.lineTo(R2, 20); ctx.quadraticCurveTo(R2 * 0.5, 20, 0, 14); ctx.fill(); }
    ctx.restore();
  }
  // duct bands
  ctx.fillStyle = 'rgba(40,60,75,.55)'; for (let k = 0; k < 3; k++) { const y = ((k * 260 - cy * 0.25) % 780 + 780) % 780 - 60; ctx.fillRect(0, y, VW, 46); ctx.fillStyle = 'rgba(20,32,42,.6)'; ctx.fillRect(0, y + 46, VW, 6); ctx.fillStyle = 'rgba(40,60,75,.55)'; }
  // wind streaks
  ctx.strokeStyle = 'rgba(200,230,255,.12)'; ctx.lineWidth = 1.5;
  for (let k = 0; k < 26; k++) { const y = (k * 47) % VH, x = ((Game.time * (300 + k * 13) + k * 211) % (VW + 200)) - 100; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 60 + (k % 4) * 20, y); ctx.stroke(); }
}
function bgFoundry(cx, cy) {
  const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#120708'); g.addColorStop(0.6, '#2a0f10'); g.addColorStop(1, '#45190f');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  drawSky();
  // chimneys & factory silhouettes
  const span = 16 * 240;
  for (const r of BGR) {
    const x = ((r.x - cx * 0.3) % span + span) % span - 200, base = VH + 60 - cy * 0.05;
    ctx.fillStyle = '#1a0b0b'; ctx.fillRect(x, base - r.h - 120, r.w, r.h + 120); ctx.fillRect(x + r.w * 0.3, base - r.h - 220, 22, 110);
    ctx.fillStyle = `rgba(255,150,60,${0.25 + 0.15 * Math.sin(Game.time * 2 + r.x)})`;
    for (let k = 0; k < 3; k++) ctx.fillRect(x + 10 + k * 18, base - r.h - 80, 8, 12);
    if (Math.random() < 0.02) spawnParticle({ x: cx + x + r.w * 0.3 + 11, y: cy + base - r.h - 220, vx: rand(-10, 10), vy: -40, life: 1.4, size: 10, color: 'rgba(60,40,40,.4)', type: 'puff', drag: 0.5 });
  }
}

/* ---------- Render hooks ---------- */
function drawLift(rect, active, label) {
  const x = rect.x, y = rect.y + rect.h, w = rect.w, dy = Act.lift ? -Math.min(1, Act.lift.t) * 60 : 0;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x + 6, y - 500, w - 12, 500);
  ctx.strokeStyle = '#4a3d5c'; ctx.lineWidth = 3; for (const cx2 of [x + 12, x + w - 12]) { ctx.beginPath(); ctx.moveTo(cx2, y - 500); ctx.lineTo(cx2, y - 150 + dy); ctx.stroke(); }
  ctx.translate(0, dy);
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(x + 4, y - 150, w - 8, 150);
  ctx.strokeStyle = active ? GOLD : '#6b6f7a'; ctx.lineWidth = 2; for (let k = 1; k < 6; k++) { ctx.beginPath(); ctx.moveTo(x + 4 + k * (w - 8) / 6, y - 150); ctx.lineTo(x + 4 + k * (w - 8) / 6, y); ctx.stroke(); }
  rr(x, y - 8, w, 8, 2); inked('#6b4a30', 3); rr(x, y - 158, w, 10, 2); inked('#3a3340', 3);
  ctx.fillStyle = active ? (Math.sin(Game.time * 6) > 0 ? '#7dff9a' : '#2a5a3a') : '#5a1a1a'; ctx.beginPath(); ctx.arc(x + w / 2, y - 170, 5, 0, 7); ctx.fill();
  ctx.restore();
  if (Act.liftNear && active) {
    ctx.font = `14px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = GOLD;
    ctx.fillText('▲ ' + Bindings.label('up', Game.lastInput) + ' · ' + label, x + w / 2, y - 186 + Math.sin(Game.time * 4) * 2);
  }
}
Game.hooks = {
  noGrid: true,
  background(cx, cy) { const z = Zone.room.zone; if (z === 'z2') bgQuarry(cx, cy); else if (z === 'z3') bgVents(cx, cy); else bgFoundry(cx, cy); },
  behindTiles() {
    const id = Zone.room.id;
    for (const u of Act.drafts) drawUpdraft(u);
    for (const c of CART_SPECS) if (c.room === id) drawRails({ x0: c.x0, x1: c.x1, y: c.y, w: 3 * TILE });
    if (id === 'q_elevator') drawLift(A.liftQ, Save.data.adamDead, 'RIDE UP');
    if (id === 'v_intake') drawLift(A.liftV, true, 'RIDE DOWN');
    if (id === 'f_core' && Save.data.walls.f_core) drawLift(A.liftC, true, 'UP TO THE CONCOURSE');
  },
  back() {
    const id = Zone.room.id;
    for (const l of LAVA) if (roomAt(l.x + 1, l.y) === Zone.room) drawLava(l);
    if (id === 'q_lars' && Act.vein) {
      const v = A.vein, p = 0.5 + 0.4 * Math.sin(Game.time * 3);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(v.x + 40, v.y + 120, 0, v.x + 40, v.y + 120, 120); g.addColorStop(0, `rgba(160,230,255,${0.35 * p})`); g.addColorStop(1, 'rgba(160,230,255,0)');
      ctx.fillStyle = g; ctx.fillRect(v.x - 80, v.y, 240, 260); ctx.restore();
      ctx.strokeStyle = '#bff3ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(v.x + 60, v.y + 40); ctx.lineTo(v.x + 40, v.y + 110); ctx.lineTo(v.x + 62, v.y + 160); ctx.lineTo(v.x + 44, v.y + 240); ctx.stroke();
    }
    for (const b of Act.belts) drawConveyor(b);
    for (const f of FUSES) if (f.room === id) drawFuse(f);
    for (const b of Breakables) drawCracks(b);
    drawLasers();
    for (const c of Act.carts) c.draw();
    if (Act.renas) drawRenas(Act.renas.x, Act.renas.y, Act.renas.facing, Act.renas.t + Game.time, { moving: Act.renas.moving });
    for (const n of NPCs) n.draw();
    drawPickups(); drawHazards(); drawFX();
    for (const f of Act.fans) f.draw();
  },
  front() {
    if (Zone.room.dark) {
      const c = Player.center(), r = Zone.room.px;
      const g = ctx.createRadialGradient(c.x, c.y, 30, c.x, c.y, 290);
      g.addColorStop(0, 'rgba(5,3,8,0)'); g.addColorStop(0.6, 'rgba(5,3,8,.6)'); g.addColorStop(1, 'rgba(5,3,8,.94)');
      ctx.fillStyle = g; ctx.fillRect(r.x, r.y, r.w, r.h);
    }
  },
  top() {
    if (Zone.room.id === 'q_falls') {
      drawSparkFall(A.sparkFall);
      for (const n of NPCs) if (n.kind === 'reshman' && !n.gone) n.drawEyes();
    }
    Story.drawBubble();
  },
  screen() { Story.drawScreen(); }
};

/* ---------- Boot ---------- */
buildAct();
(function boot() {
  const D = Save.data;
  D.introSeen = true;   // you can only get here after Zone 1
  for (const b of BREAKS) if (D.walls[b.id]) fill(b.tx, b.ty, b.w, b.h, 0);
  LEVEL = { signs: [], benches: A.benches.map(b => ({ x: b.pos.x, y: b.pos.y })), labels: [], spawn: A.arriveZ1 };
  Game.checkpoint = D.bench2;
  let pos, room, face = 1, line;
  const bell = ARRIVE.startsWith('bell-') && A.bells[ARRIVE.slice(5)];
  if (ARRIVE === 'from-z1') { pos = A.arriveZ1; room = 'q_mouth'; line = 'Across the chasm and down into the dark. The air smells like hot rock.'; }
  else if (ARRIVE === 'from-z5') { pos = A.arriveC; room = 'f_core'; face = -1; line = 'Back down the golden lift, into the smoky Foundry Core.'; }
  else if (ARRIVE === 'from-vent') { pos = T(675, 9); room = 'v_turbine'; face = -1; line = 'You squeeze back out of the maintenance vent, high above the Turbine Hall.'; }
  else if (ARRIVE === 'shadow-z2') { pos = T(230, 65); room = 'q_falls'; face = -1; line = 'You stumble out of a Shadow Portal behind the Spark Falls. Reshman\'s doors work. …Mostly.'; }
  else if (bell) { pos = bell.pos; room = bell.room; line = 'Renas skids to a stop. "Don\'t tell Josh I let you ride."'; }
  else { const b = A.benches[D.bench2] || A.benches[0]; pos = b.pos; room = b.room; line = `Welcome back. ${D.bolts} scrap bolts${D.ore ? ` and ${D.ore} titanium ore` : ''} in your pocket.`; }
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
  if (Zone.room.id === 'v_chase' && !D.chase && D.renasMet) startChase();
};
runPage();
