'use strict';
/* =========================================================
   ZONE 1 MAP SETTINGS: what the parchment shows for the
   Scrapyard Dugout (rooms, pins, scribbled notes).
   ========================================================= */
const MAP_CFG = {
  current() { return this.z1; },
  z1: {
    title: 'THE SCRAPYARD DUGOUT',
    subtitle: 'Zone 1 · The Lower Bracket — charted (mostly) by Reshman',
    rooms: ROOMS,
    hasMap: () => Save.data.maps.z1,
    noMap: 'NO MAP YET · BUY ONE FROM RESHMAN IN THE BACK ALLEY',
    showSecret: () => Save.data.walls.z1floor,
    labels: { crash: [0.5, 0.62], climb: [0.62, 0.42], pipes: [0.3, 0.45], alley: [0.5, 0.35], server: [0.5, 0.12], hub: [0.3, 0.3], cellar: [0.62, 0.36] },
    sketch: (g, X, Y, s) => mapSpireSketch(g, X, Y, s),
    landmarks(g, X, Y, s, V) {
      mapLandmarks(g, X, Y, s, V);
      if (V.cellar) {
        // the Spare Bat on its rack, and the trophy cabinet
        mapInk(g, 1.3);
        const bx = X(30), by = Y(75.4);
        g.beginPath(); g.moveTo(bx - s * 2.4, by + s * 0.4); g.lineTo(bx + s * 1.8, by - s * 0.4); g.stroke();
        g.beginPath(); g.ellipse(bx + s * 1.9, by - s * 0.42, s * 0.5, s * 0.28, -0.2, 0, 7); g.stroke();
        if (!Save.data.spareBat) { g.fillStyle = 'rgba(242,193,78,.35)'; g.beginPath(); g.arc(bx, by, s * 2.2, 0, 7); g.fill(); }
        wob(g, [[X(22.7), Y(79)], [X(22.7), Y(74.3)], [X(24.6), Y(74.3)], [X(24.6), Y(79)]], true); g.stroke();
      }
    },
    pins(pin, X, Y, V) {
      const D = Save.data, P = D.up;
      if (P.pinVendor && V.hub && D.josh) pin(X(Z.workbench.x / TILE + 1.5), Y(Z.workbench.y / TILE), '#8fd3ff', 'J');
      if (P.pinVendor && V.hub && D.lars) pin(X(Z.lars.x / TILE), Y(Z.lars.y / TILE), '#c8561c', 'L');
      if (P.pinVendor && V.hub && D.danielDead) pin(X(Z.daniel.x / TILE), Y(Z.daniel.y / TILE), '#b8283c', 'D');
      if (P.pinVendor && D.reshmanMet.z1) pin(X(Z.reshman.x / TILE), Y(Z.reshman.y / TILE), '#6a5a8a', 'R');
      if (P.pinBell && V.hub && D.bells.z1) pin(X(Z.bell.x / TILE), Y(Z.bell.y / TILE), '#ff8a2a', '♪');
      if (P.pinVendor && V.hub && D.fionnDead) pin(X(Z.fionn.x / TILE), Y(Z.fionn.y / TILE), '#8c7b6b', 'F');
      if (P.pinVendor && V.hub && D.denizDead) pin(X(Z.deniz.x / TILE), Y(Z.deniz.y / TILE), '#6fd3ff', 'T');
      if (P.pinPebble) for (const p of PEBBLES) if (V[p.room] && !D.pebbles[p.id]) pin(X(p.x / TILE), Y(p.y / TILE), '#9be36a', '•');
    },
    notes(note, g, X, Y, s, V) {
      const D = Save.data;
      if (V.alley && D.reshmanMet.z1) note('…blorp', X(Z.reshman.x / TILE), Y(Z.reshman.y / TILE) - 8, 11, -0.1);
      if (V.climb) note('spikes!', X(60), Y(53.2), 10, 0.05);
      if (V.crash && !D.gate) note('gate — locked', X(33), Y(64.4), 10);
      if (V.crash) note(D.walls.z1floor ? 'blown open!' : 'cracked boards?', X(11), Y(64.4), 10, 0.06);
      if (V.cellar) note(D.spareBat ? 'the old cellar' : 'something glints…', X(30), Y(72.4), 10, -0.04);
      if (V.server) note(D.bossDead ? 'Rogue Server (scrapped)' : 'something big lives here', X(180), Y(43.6), 11, -0.03);
      if (V.hub) {
        note('the chasm', X(260), Y(60), 11, 0.03);
        const ax = X(274), ay = Y(57);
        g.strokeStyle = INKM; g.lineWidth = 1.6; g.beginPath(); g.moveTo(ax, ay); g.lineTo(ax + 22, ay); g.moveTo(ax + 16, ay - 5); g.lineTo(ax + 22, ay); g.lineTo(ax + 16, ay + 5); g.stroke();
        note('to the Deep Quarry', X(272), Y(54.5), 11, 0);
      }
      // the gate bars, while it's still shut
      if (!D.gate && (V.hub || V.climb)) {
        const gx = X(81), gy = Y(58);
        g.strokeStyle = INKM; g.lineWidth = 1.4;
        for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(gx + k * s * 0.33 + 1, gy); g.lineTo(gx + k * s * 0.33 + 1, gy + 4 * s); g.stroke(); }
      }
    },
    bestiary: (g, w, h, V) => mapBestiary(g, w, h, V),
  },
};
