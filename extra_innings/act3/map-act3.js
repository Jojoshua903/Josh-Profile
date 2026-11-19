'use strict';
/* =========================================================
   ACT III MAP SETTINGS: Reshman's chart of the Gilded Stadium
   (the Zennith Core only shows up once you've fallen into it)
   ========================================================= */
const MAP_CFG = {
  current() { return this[PAGE.zoneHere()] || this.z9; },
  z9: {
    title: 'THE GILDED STADIUM', subtitle: 'Zone 9 · The Championship — drawn with Reshman\'s eyes closed',
    rooms: ROOMS,
    hasMap: () => Save.data.maps.z9, noMap: 'NO MAP YET · RESHMAN IS HIDING NEAR THE GOLDEN STEPS',
    labels: { t_steps: [0.5, 0.12], t_bleach: [0.5, 0.12], t_vault: [0.5, 0.06], t_lasers: [0.5, 0.12], t_locker: [0.5, 0.2], t_court: [0.5, 0.12], z_core: [0.5, 0.2] },
    pins(pin, X, Y, V) {
      const D = Save.data, P = D.up, b = A.bells.z9, r = A.reshmen.z9;
      if (P.pinBell && D.bells.z9 && V[b.room]) pin(X(b.pos.x / TILE), Y(b.pos.y / TILE), '#ff8a2a', '♪');
      if (P.pinVendor && D.reshmanMet.z9) pin(X(r.pos.x / TILE), Y(r.pos.y / TILE), '#6a5a8a', 'R');
    },
    landmarks(g, X, Y, s, V) {
      mapInk(g, 1.2, 0.8);
      for (const L of LASERS) if (V[L.room]) { g.strokeStyle = 'rgba(160,40,30,.7)'; g.beginPath(); g.moveTo(X(L.tx + 0.5), Y(L.ty)); g.lineTo(X(L.tx + 0.5), Y(L.ty + L.h)); g.stroke(); }
    },
    notes(note, g, X, Y, s, V) {
      const D = Save.data;
      if (V.t_steps) note('the pit (bat-launch!)', X(43), Y(31), 11, -0.03);
      if (V.t_bleach) note('auto-servers · parry!', X(120), Y(27), 11, 0.02);
      if (V.t_vault) note('cracked slabs · boom!', X(180), Y(26), 10, -0.04);
      if (V.t_lasers) note('laser grids · static dash', X(240), Y(5), 11, 0.02);
      if (V.t_locker) note(D.evilAdamDead ? 'the locker room' : D.adamAssist ? 'Adam is resting here' : 'someone is breathing…', X(300), Y(6), 10, -0.03);
      if (V.t_court) note(D.evilAdamDead ? (D.coreOpen ? 'a hole in the court…' : 'the trophies still hum') : 'EVIL ADAM', X(360), Y(5), 12, -0.02);
    },
  },
  z10: {
    title: 'THE ZENNITH CORE', subtitle: 'Act IV · Extra Innings — nobody drew this. It drew itself.',
    rooms: ROOMS,
    hasMap: () => true, noMap: '',
    labels: { t_steps: [0.5, 0.12], t_bleach: [0.5, 0.12], t_vault: [0.5, 0.06], t_lasers: [0.5, 0.12], t_locker: [0.5, 0.2], t_court: [0.5, 0.12], z_core: [0.5, 0.2] },
    notes(note, g, X, Y, s, V) { note('rain on the diamond', X(360), Y(26), 12, -0.03); },
  },
};
