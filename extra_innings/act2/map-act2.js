'use strict';
/* =========================================================
   ACT II MAP SETTINGS: parchment charts for Zones 5–8
   ========================================================= */
const zoneRooms = z => ROOMS.filter(r => r.zone === z);
function act2Pins(z) {
  return (pin, X, Y, V) => {
    const D = Save.data, P = D.up;
    const b = A.bells[z]; if (P.pinBell && b && D.bells[z] && V[b.room]) pin(X(b.pos.x / TILE), Y(b.pos.y / TILE), '#ff8a2a', '♪');
    const r = A.reshmen[z]; if (P.pinVendor && r && D.reshmanMet[z]) pin(X(r.pos.x / TILE), Y(r.pos.y / TILE), '#6a5a8a', 'R');
    if (P.pinPebble) for (const p of PEBBLES) if (ROOM[p.room].zone === z && V[p.room] && !D.pebbles[p.id]) pin(X(p.x / TILE), Y(p.y / TILE), '#9be36a', '•');
  };
}
const MAP_CFG = {
  current() { return this[PAGE.zoneHere()] || this.z5; },
  z5: {
    title: 'THE GRAND CONCOURSE', subtitle: 'Zone 5 · Act II Hub — measured twice by Reshman',
    rooms: zoneRooms('z5'),
    hasMap: () => Save.data.maps.z5, noMap: 'NO MAP YET · RESHMAN IS HIDING IN THE CONCOURSE (WEST LEDGE)',
    labels: { c_hall: [0.5, 0.12] },
    pins: act2Pins('z5'),
    notes(note, g, X, Y, s, V) {
      const D = Save.data;
      if (!V.c_hall) return;
      note(D.gateOpen ? 'the Pennant Gate (OPEN!)' : `the Pennant Gate · ${PENNANTS.filter(k => D.slots[k]).length}/${PENNANTS.length}`, X(180), Y(74), 12, -0.02);
      note('← caves', X(124), Y(54), 11, 0); note('up the golden draft ↑', X(192), Y(48), 11, 0); note('ice →', X(234), Y(80), 11, 0);
      note(D.up.staticDash ? 'lasers (dash through!)' : 'red lasers?!', X(229), Y(66), 10, 0.04);
      note('lift ↓ Foundry', X(127), Y(80), 10, 0);
    },
  },
  z6: {
    title: 'THE GEODE CAVERNS', subtitle: 'Zone 6 · Respect the Rocks — sketched from behind a stalagmite',
    rooms: zoneRooms('z6'),
    hasMap: () => Save.data.maps.z6, noMap: 'NO MAP YET · RESHMAN IS HIDING DOWN IN THE FLOATING FIELDS',
    labels: { g_mouth: [0.4, 0.2], g_fields: [0.5, 0.06], g_pedestal: [0.3, 0.2] },
    pins: act2Pins('z6'),
    landmarks(g, X, Y, s, V) {
      mapInk(g, 1, 0.5);
      for (const f of FIELDS) { const rm = roomAt(f.x + 1, f.y + 1); if (!rm || !V[rm.id] || rm.zone !== 'z6') continue; g.setLineDash([4, 4]); g.strokeStyle = 'rgba(120,80,190,.6)'; g.strokeRect(X(f.x / TILE), Y(f.y / TILE), f.w / TILE * s, f.h / TILE * s); g.setLineDash([]); }
    },
    notes(note, g, X, Y, s, V) {
      const D = Save.data;
      if (V.g_fields) note('low gravity! (purple)', X(30), Y(32), 11, -0.03);
      if (V.g_pedestal) note(D.fionnDead ? 'Fionn moved to camp' : 'a man with a clipboard', X(56), Y(10), 11, -0.03);
    },
  },
  z7: {
    title: 'THE STORM ATRIUM', subtitle: 'Zone 7 · Bring an Umbrella — some of the ink is rain',
    rooms: zoneRooms('z7'),
    hasMap: () => Save.data.maps.z7, noMap: 'NO MAP YET · RESHMAN IS HIDING IN THE GREENHOUSE GATE',
    labels: { s_gate: [0.4, 0.25], s_gusts: [0.5, 0.15], s_fountain: [0.5, 0.15] },
    pins: act2Pins('z7'),
    landmarks(g, X, Y, s, V) {
      if (!V.s_gusts && !V.s_fountain) return;
      mapInk(g, 1.2, 0.8);
      for (const r of RODS) if (V[r.room]) { g.beginPath(); g.moveTo(X(r.tx + 0.5), Y(r.row)); g.lineTo(X(r.tx + 0.5), Y(r.row - 3.5)); g.stroke(); g.beginPath(); g.moveTo(X(r.tx + 0.2), Y(r.row - 4.6)); g.lineTo(X(r.tx + 0.7), Y(r.row - 3.8)); g.lineTo(X(r.tx + 0.3), Y(r.row - 3.8)); g.lineTo(X(r.tx + 0.8), Y(r.row - 3)); g.stroke(); }
    },
    notes(note, g, X, Y, s, V) {
      const D = Save.data;
      if (V.s_gusts) note('gusts! ← →  (they swap)', X(198), Y(5), 11, -0.02);
      if (V.s_fountain) note(D.miloDead ? 'Milo moved to camp' : 'a very proud wizard', X(258), Y(5), 11, -0.03);
    },
  },
  z8: {
    title: 'THE GLACIER CROWN', subtitle: 'Zone 8 · No Pleases Allowed — drawn with cold fingers',
    rooms: zoneRooms('z8'),
    hasMap: () => Save.data.maps.z8, noMap: 'NO MAP YET · RESHMAN IS SHIVERING IN THE FROZEN STEPS',
    labels: { i_steps: [0.5, 0.08], i_halls: [0.5, 0.15], i_throne: [0.6, 0.2] },
    pins: act2Pins('z8'),
    landmarks(g, X, Y, s, V) {
      if (!V.i_halls) return;
      mapInk(g, 1.1, 0.8);
      for (const i of ICICLES) { const x = X(i.tx + 1), y = Y(45); g.beginPath(); g.moveTo(x - s * 0.6, y); g.lineTo(x, y + s * 1.8); g.lineTo(x + s * 0.6, y); g.stroke(); }
    },
    notes(note, g, X, Y, s, V) {
      const D = Save.data;
      if (V.i_steps) note('slippery!', X(256), Y(62), 11, 0.04);
      if (V.i_halls) note('icicles → stepping stones', X(318), Y(60), 10, -0.03);
      if (V.i_throne) note(D.denizDead ? 'Deniz moved to camp (tea!)' : 'a grumpy king', X(300), Y(28), 11, -0.03);
    },
  },
};
