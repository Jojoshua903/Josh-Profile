'use strict';
/* =========================================================
   ACT I MAP SETTINGS: parchment charts for Zones 2–4
   ========================================================= */
const zoneRooms = z => ROOMS.filter(r => r.zone === z);
function actPins(z) {
  return (pin, X, Y, V) => {
    const D = Save.data, P = D.up;
    for (const [id, b] of Object.entries(A.bells)) if (P.pinBell && id === z && D.bells[id] && V[b.room]) pin(X(b.pos.x / TILE), Y(b.pos.y / TILE), '#ff8a2a', '♪');
    const r = A.reshmen[z];
    if (P.pinVendor && r && D.reshmanMet[z]) pin(X(r.pos.x / TILE), Y(r.pos.y / TILE), '#6a5a8a', 'R');
    // titanium pins: ore you've walked past but not picked up yet
    if (P.pinOre) for (const o of ORES) if (ROOM[o.room].zone === z && V[o.room] && !D.ores[o.id]) pin(X(o.x / TILE), Y(o.y / TILE), '#bfe4f0', 'Ti');
    if (P.pinPebble) for (const p of PEBBLES) if (ROOM[p.room].zone === z && V[p.room] && !D.pebbles[p.id]) pin(X(p.x / TILE), Y(p.y / TILE), '#9be36a', '•');
  };
}
function actBestiary(kinds) {
  return (g, w, h, V) => {
    const seen = kinds.filter(([, rooms]) => rooms.some(r => V[r]));
    if (!seen.length) return;
    const x0 = 46, y0 = h - 74;
    g.save();
    g.font = 'italic 12px "Iowan Old Style", Palatino, Georgia, serif'; g.fillStyle = 'rgba(58,38,22,.75)'; g.textAlign = 'left';
    g.fillText('Things that bite —', x0, y0 - 22);
    seen.forEach(([k], i) => {
      const x = x0 + 18 + i * 104, y = y0;
      mapInk(g, 1.2);
      if (k === 'tick') { g.beginPath(); g.ellipse(x, y, 9, 6, 0, Math.PI, 0); g.closePath(); g.fillStyle = 'rgba(232,84,28,.3)'; g.fill(); g.stroke(); for (const s of [-5, 0, 5]) { g.beginPath(); g.moveTo(x + s, y); g.lineTo(x + s - 2, y + 6); g.stroke(); } }
      else if (k === 'mole') { g.beginPath(); g.ellipse(x, y, 7, 10, 0, 0, 7); g.fillStyle = 'rgba(107,74,58,.3)'; g.fill(); g.stroke(); g.beginPath(); g.moveTo(x - 4, y - 9); g.lineTo(x, y - 17); g.lineTo(x + 4, y - 9); g.stroke(); }
      else if (k === 'hopper') { wob(g, [[x - 9, y + 4], [x - 6, y - 6], [x, y - 10], [x + 7, y - 6], [x + 9, y + 4]], true); g.fillStyle = 'rgba(127,216,240,.3)'; g.fill(); g.stroke(); g.beginPath(); g.moveTo(x, y + 8); g.lineTo(x, y + 14); g.moveTo(x - 6, y + 8); g.lineTo(x - 8, y + 13); g.stroke(); }
      else if (k === 'fan') { g.beginPath(); g.arc(x, y, 10, 0, 7); g.stroke(); for (let a = 0; a < 3; a++) { const an = a * 2.1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(an) * 9, y + Math.sin(an) * 9); g.stroke(); } }
      else if (k === 'tnt') { wob(g, [[x - 9, y - 7], [x + 9, y - 7], [x + 9, y + 7], [x - 9, y + 7]], true); g.fillStyle = 'rgba(168,69,42,.3)'; g.fill(); g.stroke(); g.beginPath(); g.moveTo(x, y - 7); g.quadraticCurveTo(x + 4, y - 12, x + 2, y - 15); g.stroke(); }
      g.fillStyle = 'rgba(58,38,22,.75)'; g.font = 'italic 11px "Iowan Old Style", Palatino, Georgia, serif'; g.textAlign = 'left';
      g.fillText({ tick: 'magma tick · pops!', mole: 'drill mole · watch the dirt', hopper: 'crystal hopper · swing up', fan: 'turbine fan · ouch', tnt: 'fuse crate · keep moving' }[k], x - 14, y + 28);
    });
    g.restore();
  };
}
const MAP_CFG = {
  current() { return this[PAGE.zoneHere()] || this.z2; },
  z2: {
    title: 'THE DEEP QUARRY', subtitle: 'Zone 2 · Rock and Stone — scribbled by Reshman (with soot)',
    rooms: zoneRooms('z2'),
    hasMap: () => Save.data.maps.z2, noMap: 'NO MAP YET · BUY ONE FROM RESHMAN BY THE FALLS',
    labels: { q_mouth: [0.3, 0.3], q_shaft: [0.5, 0.06], q_lars: [0.5, 0.3], q_rails: [0.5, 0.25], q_falls: [0.4, 0.25], q_crystal: [0.4, 0.2], q_elevator: [0.4, 0.25] },
    pins: (pin, X, Y, V) => { actPins('z2')(pin, X, Y, V); },
    landmarks(g, X, Y, s, V) {
      mapInk(g, 1, 0.7);
      for (const l of LAVA) { const rm = roomAt(l.x + 1, l.y); if (!rm || !V[rm.id]) continue; g.strokeStyle = 'rgba(200,70,20,.8)'; g.beginPath(); for (let x = l.x; x < l.x + l.w; x += TILE) { const tx = x / TILE; g.moveTo(X(tx), Y(l.y / TILE + 0.5)); g.quadraticCurveTo(X(tx + 0.5), Y(l.y / TILE), X(tx + 1), Y(l.y / TILE + 0.5)); } g.stroke(); }
      if (V.q_rails) { mapInk(g, 1.1); for (const c of CART_SPECS) { g.beginPath(); g.moveTo(X(c.x0 / TILE), Y(c.y / TILE + 1.2)); g.lineTo(X(c.x1 / TILE + 3), Y(c.y / TILE + 1.2)); g.stroke(); wob(g, [[X(c.x0 / TILE + 1), Y(c.y / TILE)], [X(c.x0 / TILE + 4), Y(c.y / TILE)], [X(c.x0 / TILE + 3.5), Y(c.y / TILE + 1)], [X(c.x0 / TILE + 1.5), Y(c.y / TILE + 1)]], true); g.stroke(); } }
      if (V.q_falls) { g.strokeStyle = 'rgba(200,120,40,.6)'; g.lineWidth = 1; for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(X(225 + k * 0.4), Y(47)); g.lineTo(X(225 + k * 0.4), Y(65)); g.stroke(); } }
      if (V.q_elevator) { mapInk(g, 1.2); wob(g, [[X(232), Y(43)], [X(232), Y(38)], [X(238), Y(38)], [X(238), Y(43)]], true); g.stroke(); g.beginPath(); g.moveTo(X(235), Y(38)); g.lineTo(X(235), Y(25)); g.stroke(); }
    },
    notes(note, g, X, Y, s, V) {
      const D = Save.data;
      if (V.q_mouth) note('← back up to Base Camp', X(10), Y(76), 11, 0);
      if (V.q_lars) note(D.lars ? 'Lars was here (moved to camp)' : 'someone hammering…', X(55), Y(56), 11, -0.03);
      if (V.q_rails) note('lava! ride the carts', X(158), Y(62), 11, 0.03);
      if (V.q_falls && D.reshmanMet.z2) note('…blorp', X(233), Y(62), 11, -0.1);
      if (V.q_falls && !D.walls.q_falls) note('cracked wall?', X(206), Y(59), 10, 0.05);
      if (V.q_elevator) note(D.adamDead ? 'elevator → the vents' : 'Adam?!', X(222), Y(31), 11, -0.04);
    },
    bestiary: actBestiary([['tick', ['q_mouth', 'q_shaft', 'q_rails', 'q_falls', 'q_crystal']], ['mole', ['q_mouth', 'q_crystal']], ['hopper', ['q_crystal']]]),
  },
  z3: {
    title: 'THE VENTILATION SHAFTS', subtitle: 'Zone 3 · Mind the Fans — sold by Reshman (smells of oil)',
    rooms: zoneRooms('z3'),
    hasMap: () => Save.data.maps.z3, noMap: 'NO MAP YET · BUY ONE FROM RESHMAN IN THE TURBINE HALL',
    labels: { v_intake: [0.5, 0.3], v_chase: [0.25, 0.85], v_turbine: [0.5, 0.06] },
    pins: (pin, X, Y, V) => actPins('z3')(pin, X, Y, V),
    landmarks(g, X, Y, s, V) {
      for (const f of FANS) { const rm = ROOM[f.room]; if (!V[rm.id]) continue; mapInk(g, 1.1, 0.8); g.beginPath(); g.arc(X(f.tx), Y(f.ty), f.r / TILE * s, 0, 7); g.stroke(); for (let a = 0; a < 3; a++) { const an = a * 2.1 + 0.4; g.beginPath(); g.moveTo(X(f.tx), Y(f.ty)); g.lineTo(X(f.tx) + Math.cos(an) * f.r / TILE * s, Y(f.ty) + Math.sin(an) * f.r / TILE * s); g.stroke(); } }
      for (const u of UPDRAFTS) { if (!V[u.room]) continue; mapInk(g, 1, 0.55); const cx = X((u.x + u.w / 2) / TILE); for (let y = u.y + u.h - TILE; y > u.y + TILE; y -= 4 * TILE) { g.beginPath(); g.moveTo(cx, Y(y / TILE)); g.lineTo(cx, Y(y / TILE - 2.4)); g.moveTo(cx - 3, Y(y / TILE - 1.8)); g.lineTo(cx, Y(y / TILE - 2.4)); g.lineTo(cx + 3, Y(y / TILE - 1.8)); g.stroke(); } }
    },
    notes(note, g, X, Y, s, V) {
      const D = Save.data;
      if (V.v_intake) note('elevator ↓ quarry', X(286), Y(57), 10, 0);
      if (V.v_intake) note(D.up.staticDash ? 'lasers (dash!)' : 'red lasers?!', X(306), Y(46), 10, 0);
      if (V.v_chase) note(D.chase ? 'beat Renas here!' : 'catch Renas!', X(400), Y(48), 12, -0.03);
      if (V.v_turbine) note('titanium up the draft?', X(668), Y(5), 10, 0.04);
    },
    bestiary: actBestiary([['fan', ['v_chase', 'v_turbine']]]),
  },
  z4: {
    title: 'THE PYROTECHNIC FOUNDRY', subtitle: 'Zone 4 · Act I Finale — sold by Reshman (slightly singed)',
    rooms: zoneRooms('z4'),
    hasMap: () => Save.data.maps.z4, noMap: 'NO MAP YET · BUY ONE FROM RESHMAN ON THE FACTORY FLOOR',
    labels: { f_floor: [0.3, 0.3], f_fuse: [0.5, 0.05], f_core: [0.4, 0.3] },
    pins: (pin, X, Y, V) => actPins('z4')(pin, X, Y, V),
    landmarks(g, X, Y, s, V) {
      for (const f of FUSES) { if (!V[f.room]) continue; mapInk(g, 1.1); wob(g, [[X(f.tx), Y(f.ty)], [X(f.tx + f.w), Y(f.ty)], [X(f.tx + f.w), Y(f.ty + 1)], [X(f.tx), Y(f.ty + 1)]], true); g.fillStyle = 'rgba(168,69,42,.35)'; g.fill(); g.stroke(); }
      if (V.f_core) { mapInk(g, 1.4); const mx = X(A.cannonMouth.x / TILE), my = Y(A.cannonMouth.y / TILE); wob(g, [[mx, my - s], [mx + 4 * s, my - s * 1.2], [mx + 4 * s, my + s * 1.2], [mx, my + s]], true); g.fillStyle = 'rgba(184,40,60,.3)'; g.fill(); g.stroke();
        if (Save.data.danielDead) { g.strokeStyle = 'rgba(138,42,26,.75)'; g.lineWidth = 2; g.beginPath(); g.moveTo(mx - s, my - 2 * s); g.lineTo(mx + 5 * s, my + 2 * s); g.moveTo(mx + 5 * s, my - 2 * s); g.lineTo(mx - s, my + 2 * s); g.stroke(); } }
    },
    notes(note, g, X, Y, s, V) {
      const D = Save.data;
      if (V.f_floor) note('conveyors →← ', X(723), Y(39), 10, 0);
      if (V.f_core) note(D.danielDead ? 'BOOM (it happened)' : 'BOOM BOOM BOOM', X(818), Y(5), 12, -0.05);
      if (V.f_core && D.danielDead) note(D.walls.f_core ? 'golden lift ↑ Concourse' : 'cracked wall?', X(834), Y(18), 10, 0.04);
    },
    bestiary: actBestiary([['tnt', ['f_floor', 'f_fuse']], ['tick', ['f_floor', 'f_fuse']]]),
  },
};
