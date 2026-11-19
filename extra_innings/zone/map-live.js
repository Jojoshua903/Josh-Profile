'use strict';
/* =========================================================
   THE LIVING MAP · the pause menu's map as one parchment you
   slide around and zoom into (Silksong style)
   · drag to pan (with a little inertia), scroll / Z X / triggers to zoom
   · three zoom levels: the Full Spire (tower) → Regional Blueprint
     (rooms as colour-coded blocks and links) → Room Detail (benches,
     bells, boss marks, pins, Reshman's margin sketches)
   · a map cursor (WASD / arrows / left stick) that pans at the edges;
     click or Enter on the map opens a 4-pin radial wheel, click a pin
     to pull it out
   · rooms explored since your last bench are "wet pencil": hatched
     graphite with a flickering edge. Die before resting and they smudge
     away until you explore them again. Resting inks them in, and the
     next time you open the map an ink wash sweeps across them
   · Josh's Radar Scanner (Act III) pings hidden Lucky Pebbles and
     Cursed Spellbooks
   Loaded after zone/pausemenu.js and zone/kit.js.
   ========================================================= */
const ML = { zm: 1, cx: 0, cy: 0, vx: 0, vy: 0, drag: null, cur: null, curOn: false, held: {}, wheel: null, wet: null, wash: null, last: 0, rustleT: 0, padZ: [false, false], wheelAcc: 0 };
const ML_MIN = 1, ML_MAX = 3, ML_MICRO = 2.3;
const ML_BOSS = { server: 'bossDead', q_elevator: 'adamDead', v_chase: 'chase', f_core: 'danielDead', g_pedestal: 'fionnDead', s_fountain: 'miloDead',
  i_throne: 'denizDead', t_court: 'evilAdamDead', z_core: 'zennithDead' };
const ML_WHEEL = [['ball', 0, -1], ['bolt', 1, 0], ['star', 0, 1], ['skull', -1, 0]];   // pin, direction on the wheel
const mlZoneCol = z => (PM_ZONES.find(r => r[0] === z) || [0, 0, '#c8a060'])[2];
const mlQ = () => { const q = Save.data.q; q.lostWet = q.lostWet || {}; if (!q.mapSeen) q.mapSeen = Object.assign({}, q.inked); return q; };
const mlWetRooms = z => { const D = Save.data, q = mlQ(); return pmZoneRooms(z).filter(rm => D.visited[rm.id] && !q.inked[rm.id] && !q.lostWet[rm.id]); };

/* ---------- Josh's Radar Scanner ---------- */
const ML_RADAR = { id: 'radar', name: 'Radar Scanner', cost: 90, tag: 'ACT III',
  desc: 'Pings your maps: faint pulsing rings wherever a Lucky Pebble or a Cursed Spellbook is still hidden, even in rooms you haven\'t found yet.',
  line: '"It beeps. I don\'t know why it beeps. Please stop asking why it beeps."',
  locked: D => D.stadium || D.gateOpen ? '' : '"Still calibrating. Come back once you\'ve made it to the Stadium."' };
// Josh's list is a function by now (quests and endings wrap it): add the scanner on top of whatever it returns
try {
  if (typeof VENDORS !== 'undefined' && VENDORS.josh) {
    const J = VENDORS.josh, base = J.items;
    if (typeof base === 'function') J.items = function () { const l = base.apply(this, arguments).slice(); if (!l.some(i => i.id === 'radar')) l.push(ML_RADAR); return l; };
    else if (Array.isArray(base) && !base.some(i => i.id === 'radar')) base.push(ML_RADAR);
  }
} catch (e) { logErr('map-live: radar', e); }

/* ---------- wet pencil: lost on death, inked at a bench ---------- */
const _mlRespawn = respawnAtBench;
respawnAtBench = function () {
  const D = Save.data, q = mlQ(), dreaming = typeof DR !== 'undefined' && DR.on;
  if (!dreaming && D.up.quill) {
    let n = 0;
    for (const k in D.visited) if (D.visited[k] && !q.inked[k] && !q.lostWet[k]) { q.lostWet[k] = 1; n++; }
    if (n) setTimeout(() => toast(`THE WET PENCIL SMUDGED · ${n} UNSAVED AREA${n > 1 ? 'S' : ''} LOST FROM YOUR MAP`), 1800);
  }
  return _mlRespawn.apply(this, arguments);
};
const _mlEnter = enterRoom;
enterRoom = function (r) { const q = mlQ(); if (r && q.lostWet[r.id]) delete q.lostWet[r.id]; return _mlEnter.apply(this, arguments); };
const _mlRest = PAGE.onRest;
PAGE.onRest = function () {
  const r = _mlRest ? _mlRest.apply(this, arguments) : undefined, q = mlQ();
  for (const k in q.lostWet) delete q.inked[k];   // smudged rooms stay off the map until you walk them again
  return r;
};

/* ---------- view maths: sheet coords (CSS px of the parchment) ↔ screen ---------- */
const mlS = (x, y) => { const M = MapView; return [(x - ML.cx) * ML.zm + M.w / 2, (y - ML.cy) * ML.zm + M.h / 2]; };
const mlSheet = (sx, sy) => { const M = MapView; return [ML.cx + (sx - M.w / 2) / ML.zm, ML.cy + (sy - M.h / 2) / ML.zm]; };
const mlT = (tx, ty) => { const M = MapView; return mlS(M.ox + tx * M.s, M.oy + ty * M.s); };   // tile → screen
function mlClamp() {
  const M = MapView, hx = M.w / 2 / ML.zm, hy = M.h / 2 / ML.zm, pad = 70 * (1 - 1 / ML.zm);
  ML.cx = clamp(ML.cx, hx - pad, M.w - hx + pad); ML.cy = clamp(ML.cy, hy - pad, M.h - hy + pad);
}
function mlZoomTo(z, sx, sy) {
  const M = MapView; if (sx === undefined) { sx = M.w / 2; sy = M.h / 2; }
  const [px, py] = mlSheet(sx, sy);
  ML.zm = clamp(z, ML_MIN, ML_MAX);
  ML.cx = px - (sx - M.w / 2) / ML.zm; ML.cy = py - (sy - M.h / 2) / ML.zm; mlClamp();
}
function mlToTower() { ML.wheel = null; PM.mapMode = 'tower'; SFX.paper(); pmRender(); }
function mlZoomStep(d) {
  if (PM.mapMode === 'tower') { if (d > 0) pmZoomIn(); return; }
  if (ML.wheel) { ML.wheel = null; return; }
  if (d < 0 && ML.zm <= ML_MIN + 0.05) { mlToTower(); return; }
  const at = ML.curOn && ML.cur ? mlS(ML.cur[0], ML.cur[1]) : [];
  mlZoomTo(d > 0 ? (ML.zm < ML_MICRO - 0.1 ? ML_MICRO : ML_MAX) : (ML.zm > ML_MICRO + 0.1 ? ML_MICRO : ML_MIN), at[0], at[1]);
  SFX.paper();
}

const ML_ORIG = { build: pmBuildZone, draw: pmDrawZone, coords: pmMapCoords, click: pmMapClick };   // the old sheet, kept as a fallback
/* ---------- building a zone sheet ---------- */
pmBuildZone = function () {
  const z = PM.zone, C = MAP_CFG[z], cv = $('#mapCanvas'), host = $('#pmMapHost');
  if (!C || !cv || !host) return;
  const hw = host.clientWidth, hh = host.clientHeight;
  cv.style.width = Math.floor(Math.min(hw, hh / 0.56)) + 'px';
  const D = Save.data, V = D.visited, UP = D.up, cur = MAP_CFG.current, keep = [UP.pinBench, UP.pinBell];
  // only rested-in rooms are inked; benches and bells get the new icons instead of letter pins
  MAP_CFG.current = () => C; D.visited = pmInked(); UP.pinBench = false; UP.pinBell = false;
  try { buildMapLayer(2.5); } catch (e) { logErr('map-live: build map', e); } finally { MAP_CFG.current = cur; D.visited = V; [UP.pinBench, UP.pinBell] = keep; }
  // unexplored rooms behind an open door: dashed outlines, with a little arrow at the doorway
  const inZ = pmZoneRooms(z), byId = {}; inZ.forEach(rm => { byId[rm.id] = rm; });
  const seen = new Set(), out = [], doors = [];
  if (typeof LINKS !== 'undefined') for (const [a, b] of LINKS) {
    for (const [from, to] of [[a, b], [b, a]]) if (V[from] && byId[to] && !V[to] && !byId[to].secret) {
      if (!seen.has(to)) { seen.add(to); out.push(byId[to]); }
      if (ROOM[from]) doors.push([ROOM[from], byId[to]]);
    }
  }
  PM.dashed = out; ML.doors = doors;
  // the wet-pencil layer
  const M = MapView, wet = mlWetRooms(z);
  ML.wet = null;
  if (wet.length && UP.quill) {
    const L = document.createElement('canvas'); L.width = M.layer.width; L.height = M.layer.height;
    const g = L.getContext('2d'), k = M.dpr * M.res; g.scale(k, k);
    const X = tx => M.ox + tx * M.s, Y = ty => M.oy + ty * M.s;
    for (const rm of wet) {
      g.save(); g.beginPath();
      for (let ty = rm.y0; ty < rm.y0 + rm.th; ty++) for (let tx = rm.x0; tx < rm.x0 + rm.tw; tx++) if (tileAt(tx, ty) !== 1) g.rect(X(tx) - 0.3, Y(ty) - 0.3, M.s + 0.6, M.s + 0.6);
      g.clip();
      g.fillStyle = 'rgba(120,118,128,.22)'; g.fillRect(X(rm.x0), Y(rm.y0), rm.tw * M.s, rm.th * M.s);
      g.strokeStyle = 'rgba(55,55,64,.32)'; g.lineWidth = 0.8;
      const x0 = X(rm.x0), y0 = Y(rm.y0), rw = rm.tw * M.s, rh = rm.th * M.s;
      g.beginPath(); for (let d = -rh; d < rw; d += 5) { g.moveTo(x0 + d, y0 + rh); g.lineTo(x0 + d + rh, y0); g.moveTo(x0 + d, y0); g.lineTo(x0 + d + rh, y0 + rh); } g.stroke();
      g.restore();
      // graphite walls, a bit shaky
      g.strokeStyle = 'rgba(45,45,54,.75)'; g.lineWidth = Math.max(1, M.s * 0.32); g.lineCap = 'round'; g.beginPath();
      for (let ty = rm.y0; ty < rm.y0 + rm.th; ty++) for (let tx = rm.x0; tx < rm.x0 + rm.tw; tx++) {
        if (tileAt(tx, ty) === 1) continue;
        const j = (mhash(tx, ty) - 0.5) * M.s * 0.5;
        if (tileAt(tx, ty - 1) === 1) { g.moveTo(X(tx), Y(ty) + j); g.lineTo(X(tx + 1), Y(ty) + j); }
        if (tileAt(tx, ty + 1) === 1) { g.moveTo(X(tx), Y(ty + 1) + j); g.lineTo(X(tx + 1), Y(ty + 1) + j); }
        if (tileAt(tx - 1, ty) === 1) { g.moveTo(X(tx) + j, Y(ty)); g.lineTo(X(tx) + j, Y(ty + 1)); }
        if (tileAt(tx + 1, ty) === 1) { g.moveTo(X(tx + 1) + j, Y(ty)); g.lineTo(X(tx + 1) + j, Y(ty + 1)); }
      }
      g.stroke();
    }
    ML.wet = L;
  }
  // freshly inked rooms you haven't looked at yet get the ink-wash sweep
  const q = mlQ(), fresh = inZ.filter(rm => q.inked[rm.id] && !q.mapSeen[rm.id] && M.shown.includes(rm));
  ML.wash = fresh.length ? { rooms: fresh, t0: performance.now() + 500 } : null;
  for (const rm of fresh) q.mapSeen[rm.id] = 1;
  // open on Nathan (or the middle), at the zoom you asked for
  ML.zm = ML.pendingZ || ML_MIN; ML.pendingZ = null;
  ML.cx = M.w / 2; ML.cy = M.h / 2; ML.vx = ML.vy = 0; ML.wheel = null; ML.drag = null;
  if (z === PAGE.zoneHere() && Zone.room && M.rooms.includes(Zone.room)) {
    const c = Player.center(); ML.cur = [M.ox + (c.x / TILE) * M.s, M.oy + ((Player.y + Player.h) / TILE) * M.s - 6];
    if (ML.zm > 1) { ML.cx = ML.cur[0]; ML.cy = ML.cur[1]; }
  } else ML.cur = [M.w / 2, M.h / 2];
  mlClamp();
  PM.built = true; MapView.t0 = performance.now(); ML.last = performance.now();
};

/* ---------- icons, drawn in screen space so they stay crisp at every zoom ---------- */
function mlBench(g, x, y, a) {
  g.save(); g.globalAlpha = a; g.translate(x, y);
  const h = g.createRadialGradient(0, -4, 0, 0, -4, 16); h.addColorStop(0, 'rgba(255,214,120,.55)'); h.addColorStop(1, 'rgba(255,214,120,0)');
  g.fillStyle = h; g.beginPath(); g.arc(0, -4, 16, 0, 7); g.fill();
  g.strokeStyle = '#0d0b10'; g.lineWidth = 1.5; g.fillStyle = '#f2c14e';
  g.fillRect(-8, -9, 16, 3); g.strokeRect(-8, -9, 16, 3); g.fillRect(-9, -4, 18, 3); g.strokeRect(-9, -4, 18, 3);
  g.fillStyle = '#0d0b10'; g.fillRect(-7, -1, 2, 4); g.fillRect(5, -1, 2, 4);
  g.restore();
}
function mlBell(g, x, y, a) {
  g.save(); g.globalAlpha = a; g.translate(x, y - 6);
  g.shadowColor = '#6fe3ff'; g.shadowBlur = 8;
  g.beginPath(); g.moveTo(-6, 4); g.quadraticCurveTo(-6, -7, 0, -7); g.quadraticCurveTo(6, -7, 6, 4); g.closePath();
  g.fillStyle = '#6fe3ff'; g.fill(); g.shadowBlur = 0; g.lineWidth = 1.5; g.strokeStyle = '#0d0b10'; g.stroke();
  g.fillStyle = '#0d0b10'; g.fillRect(-7.5, 4, 15, 2); g.beginPath(); g.arc(0, 7.5, 1.8, 0, 7); g.fill();
  g.restore();
}
// a scooter-stop icon: dim grey while the toll is unpaid, bright cyan once it's open
function mlStop(g, x, y, a, open) {
  const c = open ? '#6fe3ff' : '#8a8a92';
  g.save(); g.globalAlpha = a * (open ? 1 : 0.75); g.translate(x, y - 6);
  if (open) { g.shadowColor = c; g.shadowBlur = 8; }
  g.strokeStyle = '#0d0b10'; g.lineWidth = 1.5; g.fillStyle = c;
  g.beginPath(); g.arc(-6, 5, 3, 0, 7); g.arc(6, 5, 3, 0, 7); g.fill(); g.shadowBlur = 0; g.stroke();
  g.beginPath(); g.moveTo(-9, 1); g.lineTo(6, 1); g.lineTo(4, -8); g.lineTo(8, -8); g.lineWidth = 2.5; g.strokeStyle = c; g.stroke();
  g.lineWidth = 1; g.strokeStyle = '#0d0b10'; g.stroke();
  g.restore();
}
function mlBoss(g, x, y, beaten, storm, a) {
  g.save(); g.globalAlpha = a; g.translate(x, y); g.lineCap = 'round';
  if (beaten) {
    // two crossed bats
    for (const s of [-1, 1]) { g.save(); g.rotate(s * 0.75); g.strokeStyle = '#3a2616'; g.lineWidth = 4.5; g.beginPath(); g.moveTo(0, 9); g.lineTo(0, -9); g.stroke(); g.strokeStyle = '#c9a36b'; g.lineWidth = 2.6; g.beginPath(); g.moveTo(0, 8); g.lineTo(0, -8); g.stroke(); g.restore(); }
  } else {
    g.globalAlpha = a * (0.45 + 0.15 * Math.sin(performance.now() / 600));
    g.strokeStyle = '#3a2616'; g.lineWidth = 1.6; g.beginPath();
    if (storm) { g.arc(-2, -1, 5, Math.PI * 0.9, Math.PI * 1.9); g.arc(4, -2, 4, Math.PI * 1.2, Math.PI * 0.3); g.moveTo(1, 2); g.lineTo(-2, 8); g.lineTo(2, 6); g.lineTo(0, 11); }
    else { g.moveTo(-8, 5); g.lineTo(-8, -3); g.lineTo(-4, 1); g.lineTo(0, -7); g.lineTo(4, 1); g.lineTo(8, -3); g.lineTo(8, 5); g.closePath(); }
    g.stroke();
  }
  g.restore();
}
function mlRadar(g, x, y, col, a, ph) {
  const t = performance.now() / 1000 + ph, k = (t * 0.6) % 1;
  g.save(); g.globalAlpha = a * (1 - k) * 0.7; g.strokeStyle = col; g.lineWidth = 1.5;
  g.beginPath(); g.arc(x, y, 4 + k * 14, 0, 7); g.stroke();
  g.globalAlpha = a * 0.35; g.fillStyle = col; g.beginPath(); g.arc(x, y, 2.5, 0, 7); g.fill();
  g.restore();
}

/* ---------- the frame ---------- */
pmDrawZone = function (now) {
  const M = MapView, cv = M.cv, g = cv.getContext('2d'), t = (now - M.t0) / 1000, z = PM.zone, col = mlZoneCol(z), D = Save.data, q = mlQ();
  const dt = Math.min(0.05, (now - (ML.last || now)) / 1000); ML.last = now;
  mlInput(dt);
  if (!ML.drag && (ML.vx || ML.vy)) {
    ML.cx += ML.vx * dt; ML.cy += ML.vy * dt; const f = Math.exp(-dt * 5); ML.vx *= f; ML.vy *= f;
    if (Math.hypot(ML.vx, ML.vy) < 4) ML.vx = ML.vy = 0; mlClamp();
  }
  const W = M.w, H = M.h, dpr = M.dpr;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
  g.fillStyle = '#0b0a0d'; g.fillRect(0, 0, cv.width, cv.height);
  // unroll from the centre
  const k = Math.min(1, t / 0.45), half = (cv.width / 2) * (1 - Math.pow(1 - k, 3));
  g.save(); g.beginPath(); g.rect(cv.width / 2 - half, 0, half * 2, cv.height); g.clip();
  // the parchment, through the view
  g.setTransform(dpr * ML.zm, 0, 0, dpr * ML.zm, dpr * (W / 2 - ML.cx * ML.zm), dpr * (H / 2 - ML.cy * ML.zm));
  g.drawImage(M.layer, 0, 0, W, H);
  g.globalCompositeOperation = 'multiply'; g.fillStyle = pmRGBA(col, 0.3); g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over';
  // wet pencil, with a flickering edge
  if (ML.wet) { g.globalAlpha = 0.78 + 0.14 * Math.sin(now / 70) * Math.sin(now / 23); g.drawImage(ML.wet, 0, 0, W, H); g.globalAlpha = 1; }
  // the ink wash sweeping over freshly saved rooms
  if (ML.wash) {
    const wt = (now - ML.wash.t0) / 1100;
    if (wt >= 1) ML.wash = null;
    else {
      const e = wt <= 0 ? 0 : 1 - Math.pow(1 - wt, 2);
      for (const rm of ML.wash.rooms) {
        const x0 = M.ox + rm.x0 * M.s, y0 = M.oy + rm.y0 * M.s, rw = rm.tw * M.s, rh = rm.th * M.s, edge = x0 + rw * e;
        g.fillStyle = 'rgba(233,217,180,.92)'; g.fillRect(edge, y0, x0 + rw - edge, rh);
        const band = g.createLinearGradient(edge - 18, 0, edge + 4, 0); band.addColorStop(0, 'rgba(58,38,22,0)'); band.addColorStop(0.8, 'rgba(58,38,22,.55)'); band.addColorStop(1, 'rgba(58,38,22,0)');
        g.fillStyle = band; g.fillRect(edge - 18, y0, 22, rh);
      }
    }
  }
  // Regional Blueprint: rooms as colour-coded blocks, linked up (fades out as you zoom in)
  const bp = clamp((1.75 - ML.zm) / 0.55, 0, 1), shown = M.shown || [];
  if (bp > 0) {
    g.save(); g.globalAlpha = bp;
    const ctr = rm => [M.ox + (rm.x0 + rm.tw / 2) * M.s, M.oy + (rm.y0 + rm.th / 2) * M.s];
    g.setLineDash([4, 4]); g.strokeStyle = 'rgba(58,38,22,.65)'; g.lineWidth = 1.4; g.beginPath();
    if (typeof LINKS !== 'undefined') for (const [a, b] of LINKS) if (shown.includes(ROOM[a]) && shown.includes(ROOM[b])) { const [ax, ay] = ctr(ROOM[a]), [bx, by] = ctr(ROOM[b]); g.moveTo(ax, ay); g.lineTo(bx, by); }
    g.stroke(); g.setLineDash([]);
    for (const rm of shown) {
      const c = rm.tint ? `rgba(${rm.tint},.34)` : pmRGBA(mlZoneCol(pmRoomZone(rm)), 0.34);
      g.fillStyle = c; g.fillRect(M.ox + rm.x0 * M.s + 2, M.oy + rm.y0 * M.s + 2, rm.tw * M.s - 4, rm.th * M.s - 4);
      g.strokeStyle = rm.tint ? `rgba(${rm.tint},.9)` : col; g.lineWidth = 2; g.strokeRect(M.ox + rm.x0 * M.s + 2, M.oy + rm.y0 * M.s + 2, rm.tw * M.s - 4, rm.th * M.s - 4);
    }
    g.restore();
  }
  // doors you haven't been through
  g.setLineDash([6, 5]); g.strokeStyle = 'rgba(58,38,22,.75)'; g.lineWidth = 1.6 / ML.zm * 1.4;
  for (const rm of PM.dashed) g.strokeRect(M.ox + rm.x0 * M.s + 2, M.oy + rm.y0 * M.s + 2, rm.tw * M.s - 4, rm.th * M.s - 4);
  g.setLineDash([]);
  // back to screen space for the icons
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  // a faint blueprint grid that slides slower than the map: depth
  g.save(); g.globalCompositeOperation = 'multiply'; g.strokeStyle = 'rgba(40,30,20,.05)'; g.lineWidth = 1;
  const gs = 20, gox = ((-(ML.cx * ML.zm) * 0.7) % gs + gs) % gs, goy = ((-(ML.cy * ML.zm) * 0.7) % gs + gs) % gs;
  g.beginPath(); for (let x = gox; x < W; x += gs) { g.moveTo(x, 0); g.lineTo(x, H); } for (let y = goy; y < H; y += gs) { g.moveTo(0, y); g.lineTo(W, y); } g.stroke(); g.restore();
  // little arrows into the doorways
  g.fillStyle = 'rgba(58,38,22,.8)';
  for (const [from, to] of ML.doors || []) {
    const fx = from.x0 + from.tw / 2, fy = from.y0 + from.th / 2, ex = clamp(fx, to.x0 + 1, to.x0 + to.tw - 1), ey = clamp(fy, to.y0 + 1, to.y0 + to.th - 1);
    const [sx, sy] = mlT(ex, ey), a = Math.atan2(ey - fy, ex - fx);
    g.save(); g.translate(sx, sy); g.rotate(a); g.beginPath(); g.moveTo(7, 0); g.lineTo(-3, -4.5); g.lineTo(-1, 0); g.lineTo(-3, 4.5); g.closePath(); g.fill(); g.restore();
  }
  // Room Detail icons
  const mi = clamp((ML.zm - 1.25) / 0.6, 0, 1) * 0.7 + 0.3, inZ = M.rooms.filter(rm => pmRoomZone(rm) === z);
  const showRoom = id => shown.some(rm => rm.id === id);
  PAGE.benches.forEach(B => { const rm = ROOM[B.room]; if (rm && inZ.includes(rm) && (D.up.pinBench || q.inked[B.room])) { const [x, y] = mlT(B.pos.x / TILE, B.pos.y / TILE); mlBench(g, x, y, mi); } });
  const bellAt = typeof A !== 'undefined' && A.bells && A.bells[z] ? A.bells[z] : z === 'z1' && typeof Z !== 'undefined' && Z.bell ? { pos: Z.bell, room: 'hub' } : null;
  // scooter stops mark themselves once you walk past: grey while locked, cyan once the toll is paid
  if (bellAt && (D.bells[z] || (q.stopSeen || {})[z])) { const [x, y] = mlT(bellAt.pos.x / TILE, bellAt.pos.y / TILE); mlStop(g, x, y, mi, !!D.bells[z]); }
  for (const id in ML_BOSS) if (ROOM[id] && inZ.includes(ROOM[id]) && showRoom(id)) {
    const rm = ROOM[id], [x, y] = mlT(rm.x0 + rm.tw / 2, rm.y0 + rm.th * 0.62); mlBoss(g, x, y, !!D[ML_BOSS[id]], id === 's_fountain', mi);
  }
  if (D.up.radar) {
    if (typeof PEBBLES !== 'undefined') PEBBLES.forEach((p, i) => { const rm = ROOM[p.room]; if (rm && inZ.includes(rm) && !D.pebbles[p.id]) { const [x, y] = mlT(p.x / TILE, p.y / TILE); mlRadar(g, x, y, '#9be36a', 1, i * 0.37); } });
    if (typeof QUEST_SPOTS !== 'undefined') QUEST_SPOTS.books.forEach((b, i) => { const rm = ROOM[b.room]; if (rm && inZ.includes(rm) && !((q.books || {})[b.id])) { const [x, y] = mlT(b.at[0] + 0.5, b.at[1] - 1); mlRadar(g, x, y, '#b388ff', 1, i * 0.61); } });
  }
  // your pins
  for (const p of (q.pins[z] || [])) { const [x, y] = mlT(p.x, p.y); pmDrawPin(g, x, y, p.t); }
  if (PM.pin && PM.mouse && !ML.wheel) { const [x, y] = mlS(PM.mouse.x, PM.mouse.y); g.globalAlpha = 0.55; pmDrawPin(g, x, y, PM.pin); g.globalAlpha = 1; }
  // Nathan
  if (k >= 1 && D.up.compass && z === PAGE.zoneHere() && Zone.room && M.rooms.includes(Zone.room) && shown.includes(Zone.room)) {
    const c = Player.center(), [x, y] = mlT(c.x / TILE, (Player.y + Player.h) / TILE), pulse = ((now / 1000) * 0.6) % 1;
    g.strokeStyle = `rgba(242,193,78,${0.85 * (1 - pulse)})`; g.lineWidth = 2; g.beginPath(); g.arc(x, y - 6, 9 + pulse * 18, 0, 7); g.stroke();
    pmCap(g, x, y - 6, 1.05);
  }
  // the map cursor
  if (ML.curOn && ML.cur && !ML.wheel) {
    const [x, y] = mlS(ML.cur[0], ML.cur[1]);
    g.strokeStyle = 'rgba(58,38,22,.9)'; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, 9, 0, 7);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { g.moveTo(x + dx * 5, y + dy * 5); g.lineTo(x + dx * 14, y + dy * 14); }
    g.stroke();
    const hp = mlPinAt(x, y); if (hp >= 0) { g.fillStyle = 'rgba(58,38,22,.85)'; g.font = 'italic 12px "Iowan Old Style", Palatino, Georgia, serif'; g.textAlign = 'center'; g.fillText('remove pin', x, y + 26); }
  }
  // the radial pin wheel
  if (ML.wheel) mlDrawWheel(g);
  g.restore();
  // a heavy inner shadow: the parchment sits recessed in its frame
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const sh = 46;
  for (const [x0, y0, x1, y1, rx, ry, rw, rh] of [[0, 0, 0, sh, 0, 0, W, sh], [0, H, 0, H - sh, 0, H - sh, W, sh], [0, 0, sh, 0, 0, 0, sh, H], [W, 0, W - sh, 0, W - sh, 0, sh, H]]) {
    const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, 'rgba(5,4,6,.75)'); gr.addColorStop(1, 'rgba(5,4,6,0)'); g.fillStyle = gr; g.fillRect(rx, ry, rw, rh);
  }
  g.strokeStyle = 'rgba(217,207,184,.35)'; g.lineWidth = 1; g.strokeRect(3.5, 3.5, W - 7, H - 7);
  g.font = 'italic 12px "Iowan Old Style", Palatino, Georgia, serif'; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillStyle = 'rgba(233,226,208,.7)';
  g.fillText(ML.zm < 1.6 ? 'Regional blueprint' : 'Room detail', 16, H - 14);
};

/* ---------- pins: the wheel, placing and pulling ---------- */
function mlPinAt(sx, sy) {
  const L = Save.data.q.pins[PM.zone] || [];
  return L.findIndex(p => { const [x, y] = mlT(p.x, p.y); return Math.hypot(x - sx, y - 17 - sy) < 12; });
}
function mlOpenWheel(sx, sy) {
  const [x, y] = mlSheet(sx, sy);
  ML.wheel = { x, y, sel: ML.wheel ? ML.wheel.sel : 0 }; SFX.flip();
}
function mlPlace(t) {
  const W = ML.wheel; if (!W) return;
  const M = MapView, q = Save.data.q, list = q.pins[PM.zone] = q.pins[PM.zone] || [];
  list.push({ x: +((W.x - M.ox) / M.s).toFixed(2), y: +((W.y - M.oy) / M.s).toFixed(2), t });
  ML.wheel = null; SFX.scratch(); saveGame(); pmRenderMapSide();
}
function mlPull(i) {
  const list = Save.data.q.pins[PM.zone] || []; if (i < 0 || i >= list.length) return;
  list.splice(i, 1); SFX.pinPop(); SFX.scratch(); saveGame(); pmRenderMapSide();
}
function mlDrawWheel(g) {
  const W = ML.wheel, [x, y] = mlS(W.x, W.y), R = 40;
  g.save();
  g.fillStyle = 'rgba(10,8,12,.82)'; g.beginPath(); g.arc(x, y, R + 22, 0, 7); g.fill();
  g.strokeStyle = 'rgba(217,207,184,.5)'; g.lineWidth = 1; g.beginPath(); g.arc(x, y, R + 22, 0, 7); g.stroke();
  ML_WHEEL.forEach(([t, dx, dy], i) => {
    const px = x + dx * R, py = y + dy * R;
    if (i === W.sel) { const h = g.createRadialGradient(px, py, 0, px, py, 20); h.addColorStop(0, 'rgba(230,223,208,.35)'); h.addColorStop(1, 'rgba(230,223,208,0)'); g.fillStyle = h; g.beginPath(); g.arc(px, py, 20, 0, 7); g.fill(); }
    g.globalAlpha = i === W.sel ? 1 : 0.6; pmDrawPin(g, px, py + 17, t); g.globalAlpha = 1;
  });
  g.fillStyle = '#d9cfb8'; g.beginPath(); g.arc(x, y, 2.5, 0, 7); g.fill();
  const name = PM_PINS.find(p => p[0] === ML_WHEEL[W.sel][0]);
  g.font = 'italic 13px "Iowan Old Style", Palatino, Georgia, serif'; g.textAlign = 'center'; g.fillStyle = '#e6dfd0'; g.fillText(name[1], x, y + R + 40);
  g.font = 'italic 11px "Iowan Old Style", Palatino, Georgia, serif'; g.fillStyle = 'rgba(230,223,208,.6)'; g.fillText(name[2], x, y + R + 56);
  g.restore();
}
const mlWheelPick = (sx, sy) => { const [x, y] = mlS(ML.wheel.x, ML.wheel.y), d = Math.hypot(sx - x, sy - y); if (d < 14 || d > 80) return -1; const a = Math.atan2(sy - y, sx - x); return [3, 0, 1, 2][((Math.round(a / (Math.PI / 2)) % 4) + 4 + 2) % 4]; };

/* ---------- mouse: drag, inertia, wheel, click ---------- */
pmMapCoords = function (e) {
  const M = MapView, r = M.cv.getBoundingClientRect(), sx = (e.clientX - r.left) * (M.w / r.width), sy = (e.clientY - r.top) * (M.h / r.height);
  const [x, y] = mlSheet(sx, sy);
  return { x, y, sx, sy, tx: (x - M.ox) / M.s, ty: (y - M.oy) / M.s };
};
pmMapClick = function () {};   // clicks are handled on pointer-up below, so a drag never drops a pin
(function mlMouse() {
  const cv = $('#mapCanvas'); if (!cv) return;
  const live = () => !ML.broken && UI.modal === 'pmenu' && PM.tab === 'map' && PM.mapMode === 'zone' && PM.built;
  cv.addEventListener('pointerdown', e => {
    if (!live()) return;
    const p = pmMapCoords(e);
    ML.drag = { sx: p.sx, sy: p.sy, cx: ML.cx, cy: ML.cy, moved: 0, lx: p.sx, ly: p.sy, lt: performance.now() };
    ML.vx = ML.vy = 0; cv.setPointerCapture && cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener('pointermove', e => {
    if (!live()) return;
    const p = pmMapCoords(e), d = ML.drag;
    if (ML.wheel) { const i = mlWheelPick(p.sx, p.sy); if (i >= 0) ML.wheel.sel = i; }
    if (!d) return;
    d.moved = Math.max(d.moved, Math.hypot(p.sx - d.sx, p.sy - d.sy));
    if (d.moved < 5 || ML.wheel) return;
    ML.cx = d.cx - (p.sx - d.sx) / ML.zm; ML.cy = d.cy - (p.sy - d.sy) / ML.zm; mlClamp();
    const now = performance.now(), dtt = Math.max(1, now - d.lt) / 1000;
    ML.vx = -(p.sx - d.lx) / ML.zm / dtt; ML.vy = -(p.sy - d.ly) / ML.zm / dtt; d.lx = p.sx; d.ly = p.sy; d.lt = now;
    if (now - ML.rustleT > 260) { ML.rustleT = now; SFX.rustle(); }
  });
  cv.addEventListener('pointerup', e => {
    if (!live() || !ML.drag) return;
    const d = ML.drag, p = pmMapCoords(e); ML.drag = null;
    if (performance.now() - d.lt > 80) ML.vx = ML.vy = 0;   // held still before letting go: no fling
    if (d.moved >= 5 && !ML.wheel) return;
    ML.vx = ML.vy = 0; ML.cur = [p.x, p.y];
    if (ML.wheel) { const i = mlWheelPick(p.sx, p.sy); if (i >= 0) mlPlace(ML_WHEEL[i][0]); else ML.wheel = null; return; }
    const hit = mlPinAt(p.sx, p.sy);
    if (hit >= 0) { mlPull(hit); return; }
    if (PM.pin) { ML.wheel = { x: p.x, y: p.y, sel: 0 }; mlPlace(PM.pin); return; }   // a pin picked on the right: drop it straight away
    mlOpenWheel(p.sx, p.sy);
  });
  cv.addEventListener('wheel', e => {
    if (!live()) return;
    e.preventDefault();
    const p = pmMapCoords(e), nz = ML.zm * Math.exp(-e.deltaY * 0.0016);
    if (nz < ML_MIN) { ML.wheelAcc += ML_MIN - nz; if (ML.wheelAcc > 0.25) { ML.wheelAcc = 0; mlToTower(); } }
    else ML.wheelAcc = 0;
    ML.wheel = null; mlZoomTo(nz, p.sx, p.sy);
  }, { passive: false });
})();
// the tower: scroll up (or X) on a floor zooms into it
const _mlRenderMap = PM_VIEWS.map.render;
PM_VIEWS.map.render = function (body) {
  _mlRenderMap.apply(this, arguments);
  const tc = $('#pmTowerCv');
  if (tc) tc.addEventListener('wheel', e => {
    e.preventDefault();
    if (e.deltaY < 0) { const s = pmTowerHit(e); if (s) PM.zone = s.z; ML.pendingZ = ML_MIN; pmZoomIn(); }
  }, { passive: false });
  const note = body.querySelector('.pm-mapbar .pm-note');
  if (note && PM.mapMode === 'zone') note.textContent = 'Drag to slide the map · scroll or Z / X to zoom · click to drop a pin, click a pin to pull it.';
};
const ML_HINT0 = PM_VIEWS.map.hint;
Object.defineProperty(PM_VIEWS.map, 'hint', { configurable: true, enumerable: true, get: () => ML.broken ? ML_HINT0 : PM.mapMode === 'tower'
  ? '<kbd>↑</kbd><kbd>↓</kbd> floor · <kbd>X</kbd> / <kbd>Enter</kbd> zoom in'
  : '<kbd>WASD</kbd> cursor · <kbd>Z</kbd><kbd>X</kbd> zoom · <kbd>Enter</kbd> pin · <kbd>K</kbd> back' });

/* ---------- keyboard & controller ---------- */
const ML_KEYS = { ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r', ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd' };
const _mlNav = PM_VIEWS.map.nav, _mlOk = PM_VIEWS.map.ok;
PM_VIEWS.map.nav = function (dx, dy) {
  if (ML.broken || PM.mapMode !== 'zone' || !PM.built) return _mlNav.apply(this, arguments);
  if (ML.wheel) { const i = ML_WHEEL.findIndex(w => w[1] === dx && w[2] === dy); if (i >= 0 && i !== ML.wheel.sel) { ML.wheel.sel = i; SFX.latch(); } return; }
  ML.curOn = true;
  ML.held[dx < 0 ? 'l' : dx > 0 ? 'r' : dy < 0 ? 'u' : 'd'] = performance.now();
};
PM_VIEWS.map.ok = function () {
  if (ML.broken || PM.mapMode !== 'zone' || !PM.built) return _mlOk.apply(this, arguments);
  if (ML.wheel) { mlPlace(ML_WHEEL[ML.wheel.sel][0]); return; }
  if (!ML.cur) ML.cur = [ML.cx, ML.cy];
  ML.curOn = true;
  const [sx, sy] = mlS(ML.cur[0], ML.cur[1]), hit = mlPinAt(sx, sy);
  if (hit >= 0) mlPull(hit); else mlOpenWheel(sx, sy);
};
PM_VIEWS.map.alt = function () { if (ML.broken) return this.ok(); mlZoomStep(-1); };
addEventListener('keyup', e => { const d = ML_KEYS[e.code]; if (d) delete ML.held[d]; });
addEventListener('blur', () => { ML.held = {}; });
addEventListener('keydown', e => {
  if (ML.broken || UI.modal !== 'pmenu' || PM.tab !== 'map' || e.repeat) return;
  if (e.code === 'KeyX') { e.preventDefault(); mlZoomStep(1); }
}, true);
function mlInput(dt) {
  const M = MapView, now = performance.now();
  // a held key keeps refreshing itself through key-repeat; a d-pad tap only nudges
  for (const d in ML.held) if (now - ML.held[d] > 650) delete ML.held[d];
  let ix = (ML.held.r ? 1 : 0) - (ML.held.l ? 1 : 0), iy = (ML.held.d ? 1 : 0) - (ML.held.u ? 1 : 0);
  const pads = navigator.getGamepads ? navigator.getGamepads() : [], p = pads && [...pads].find(Boolean);
  if (p) {
    const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
    if (Math.hypot(ax, ay) > 0.25) { ix = ax; iy = ay; ML.curOn = true; }
    // triggers zoom (LT out, RT in)
    for (const [i, d] of [[6, -1], [7, 1]]) { const b = p.buttons[i], on = !!(b && (b.pressed || b.value > 0.5)); if (on && !ML.padZ[i - 6]) mlZoomStep(d); ML.padZ[i - 6] = on; }
  }
  if ((ix || iy) && ML.cur && !ML.wheel) {
    const sp = 380 / ML.zm;
    ML.cur[0] = clamp(ML.cur[0] + ix * sp * dt, 0, M.w); ML.cur[1] = clamp(ML.cur[1] + iy * sp * dt, 0, M.h);
    // at the edge of the view the map glides along with the cursor
    const [sx, sy] = mlS(ML.cur[0], ML.cur[1]), m = 60;
    if (sx < m) ML.cx -= (m - sx) / ML.zm * dt * 8; if (sx > M.w - m) ML.cx += (sx - (M.w - m)) / ML.zm * dt * 8;
    if (sy < m) ML.cy -= (m - sy) / ML.zm * dt * 8; if (sy > M.h - m) ML.cy += (sy - (M.h - m)) / ML.zm * dt * 8;
    mlClamp();
    if (performance.now() - ML.rustleT > 420) { ML.rustleT = performance.now(); SFX.rustle(); }
  }
}

/* ---------- the side card: a legend for the new marks ---------- */
const _mlSide = pmRenderMapSide;
pmRenderMapSide = function () {
  _mlSide.apply(this, arguments);
  const side = $('#pmMapSide'); if (!side) return;
  const D = Save.data, note = side.querySelector('.pm-pins + .pm-note');
  if (note && PM.mapMode === 'zone') note.textContent = PM.pin
    ? PM_PINS.find(p => p[0] === PM.pin)[2] + '. Click the map to drop it. Click a pin to pull it.'
    : 'Click the map (or press Enter) to open the pin wheel. Click a pin to pull it.';
  const icon = (svg, label) => `<div style="display:flex;align-items:center;gap:9px;font-size:13px;color:rgba(230,223,208,.72);margin:3px 0">${svg}<span>${label}</span></div>`;
  side.insertAdjacentHTML('beforeend', `<hr class="pm-rule"><h3>Legend</h3>
    ${icon('<svg width="22" height="16" viewBox="-11 -12 22 16"><rect x="-8" y="-9" width="16" height="3" fill="#f2c14e" stroke="#0d0b10"/><rect x="-9" y="-4" width="18" height="3" fill="#f2c14e" stroke="#0d0b10"/></svg>', 'Dugout Bench')}
    ${icon('<svg width="22" height="18" viewBox="-11 -14 22 18"><path d="M-6 2 Q-6 -9 0 -9 Q6 -9 6 2 Z" fill="#6fe3ff" stroke="#0d0b10"/></svg>', 'Renas\'s call bell')}
    ${icon('<svg width="22" height="20" viewBox="-11 -10 22 20"><path d="M-6 6 L6 -6 M-6 -6 L6 6" stroke="#c9a36b" stroke-width="3" stroke-linecap="round"/></svg>', 'Boss beaten · a faint crown: not yet')}
    ${icon('<svg width="22" height="18" viewBox="-11 -9 22 18"><rect x="-10" y="-7" width="20" height="14" fill="rgba(120,118,128,.4)" stroke="#555" stroke-dasharray="2 1.5"/></svg>', 'Wet pencil · rest on a bench to ink it')}
    ${D.up.radar ? icon('<svg width="22" height="18" viewBox="-11 -9 22 18"><circle r="7" fill="none" stroke="#9be36a"/><circle r="2.5" fill="#9be36a"/></svg>', 'Radar: something still hidden') : ''}`);
};

/* ---------- safety net: if the live map breaks, the old sheet takes over ---------- */
(function mlSafety() {
  const live = { build: pmBuildZone, draw: pmDrawZone, coords: pmMapCoords, click: pmMapClick, side: pmRenderMapSide, render: PM_VIEWS.map.render };
  const old = { build: ML_ORIG.build, draw: ML_ORIG.draw, coords: ML_ORIG.coords, click: ML_ORIG.click, side: _mlSide, render: _mlRenderMap };
  const guard = k => function () {
    if (!ML.broken) {
      try { return live[k].apply(this, arguments); }
      catch (e) {
        logErr('map-live: ' + k, e); ML.broken = true; ML.wheel = ML.drag = null;
        // rebuild the page with the old sheet once this frame is done
        if (k !== 'render') setTimeout(() => { if (UI.modal === 'pmenu' && PM.tab === 'map') pmRender(); }, 0);
      }
    }
    return old[k].apply(this, arguments);
  };
  pmBuildZone = guard('build'); pmDrawZone = guard('draw'); pmMapCoords = guard('coords'); pmMapClick = guard('click');
  pmRenderMapSide = guard('side'); PM_VIEWS.map.render = guard('render');
})();
