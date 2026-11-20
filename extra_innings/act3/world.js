'use strict';
/* =========================================================
   ACT III · THE ENDGAME — world layout (one tile grid)
   Zone 9 The Gilded Stadium: a linear 4-room Championship
   Gauntlet → the Grand Locker Room → the Championship Court.
   Act IV The Zennith Core (secret) sits under the court.
   1 map unit = 40 × 22 tiles.
   ========================================================= */
const UW = 40, UH = 22;
const ROOMS = [
  { id: 't_steps',  zone: 'z9',  name: 'The Golden Steps',              ux: 0, uy: 1, uw: 2, uh: 1, tint: '220,170,70' },
  { id: 't_bleach', zone: 'z9',  name: 'The Gilded Bleachers',          ux: 2, uy: 1, uw: 2, uh: 1, tint: '200,150,90' },
  { id: 't_vault',  zone: 'z9',  name: 'The Trophy Vault',              ux: 4, uy: 0, uw: 1, uh: 2, tint: '160,110,200' },
  { id: 't_lasers', zone: 'z9',  name: 'The Laser Concourse',           ux: 5, uy: 0, uw: 2, uh: 1, tint: '220,90,80' },
  { id: 't_locker', zone: 'z9',  name: 'The Grand Locker Room',         ux: 7, uy: 0, uw: 1, uh: 1, tint: '200,180,140' },
  { id: 't_court',  zone: 'z9',  name: 'The Grand Championship Court',  ux: 8, uy: 0, uw: 2, uh: 1, tint: '150,90,200' },
  { id: 'z_core',   zone: 'z10', name: 'The Zennith Core',              ux: 8, uy: 1, uw: 2, uh: 1, tint: '90,70,140', secret: true },
  // gauntlet (zone/gauntlets.js): the VIP wing under the locker room
  { id: 't_colo',   zone: 'z9',  name: 'The Championship Colosseum',    ux: 6, uy: 1, uw: 2, uh: 1, tint: '230,180,90', secret: true },
  // the Hall of Legends' gate wing (zone/legends-hall.js): sealed rock unless you're dreaming there
  { id: 't_hall',   zone: 'z9',  name: 'The Hall of Legends',           ux: 5, uy: 1, uw: 1, uh: 1, tint: '240,220,170', secret: true, dream: true },
  // secret (zone/abyss.js): the Overtime Abyss, far below the stadium · no benches
  { id: 'a_breach', zone: 'z11', name: 'The Secret Breach',             ux: 0, uy: 2, uw: 2, uh: 2, tint: '230,210,160', secret: true },
  { id: 'a_canyon', zone: 'z11', name: 'The Pogo Canyon',               ux: 1, uy: 4, uw: 3, uh: 1, tint: '240,220,170', secret: true },
  { id: 'a_shaft',  zone: 'z11', name: 'The Laser Shaft',               ux: 4, uy: 2, uw: 1, uh: 3, tint: '240,200,150', secret: true },
  { id: 'a_pitch',  zone: 'z11', name: 'The Endless Pitch',             ux: 5, uy: 2, uw: 2, uh: 1, tint: '230,230,200', secret: true },
  { id: 'a_final',  zone: 'z11', name: 'The Final Stretch',             ux: 7, uy: 2, uw: 3, uh: 2, tint: '255,240,190', secret: true },
];
const ROOM = {};
ROOMS.forEach((r, i) => {
  r.i = i; ROOM[r.id] = r;
  r.x0 = r.ux * UW; r.y0 = r.uy * UH; r.tw = r.uw * UW; r.th = r.uh * UH;
  r.px = { x: r.x0 * TILE, y: r.y0 * TILE, w: r.tw * TILE, h: r.th * TILE };
});
const LINKS = [['t_steps', 't_bleach'], ['t_bleach', 't_vault'], ['t_vault', 't_lasers'], ['t_lasers', 't_locker'], ['t_locker', 't_court'], ['t_court', 'z_core'], ['t_locker', 't_colo'],
  ['t_locker', 'a_breach'], ['a_breach', 'a_canyon'], ['a_canyon', 'a_shaft'], ['a_shaft', 'a_pitch'], ['a_pitch', 'a_final']];
function roomAt(px, py) {
  for (const r of ROOMS) if (px >= r.px.x && px < r.px.x + r.px.w && py >= r.px.y && py < r.px.y + r.px.h) return r;
  return null;
}
const T = (tx, row) => ({ x: tx * TILE + TILE / 2, y: row * TILE });   // tile column + surface row → feet position
const R = (tx, ty, tw, th) => ({ x: tx * TILE, y: ty * TILE, w: tw * TILE, h: th * TILE });

/* ---------- Key places ---------- */
const A = {
  benches: [{ pos: T(13, 40), room: 't_steps' }, { pos: T(289, 20), room: 't_locker' }],
  bells: { z9: { pos: T(19, 40), room: 't_steps' } },
  reshmen: { z9: { pos: T(25, 40), room: 't_steps' } },
  liftS: R(2, 34, 6, 6), arriveS: T(5, 40),           // the Pennant Gate elevator, back down to the Concourse
  adam: T(305, 20), adamTrigger: 298 * TILE,           // normal Adam, bruised, by a marble pillar
  doors: R(316, 13, 4, 7), doorLock: { tx: 318, ty: 13, w: 1, h: 7 },
  courtLock: { tx: 321, ty: 13, w: 1, h: 7 }, courtTrigger: 334 * TILE,
  evil: T(376, 20), net: 360 * TILE, courtFloor: 20 * TILE,
  hole: { tx: 345, ty: 20, w: 30, h: 3 },             // where the court floor shatters into the Core
  coreFloor: 40 * TILE, zennith: { x: 376 * TILE, y: 32 * TILE },
};

/* ---------- Geometry ---------- */
function buildAct3() {
  LW = 400; LH = 110; grid = new Uint8Array(LW * LH).fill(1);   // rows 44+ hold the secret Overtime Abyss
  const carve = (x, y, w, h) => fill(x, y, w, h, 0);
  const plank = (row, x, w) => fill(x, row, w, 1, 3);

  /* === 1 · The Golden Steps: a bottomless pit only a Bat-Launch can cross === */
  carve(1, 23, 78, 17);
  carve(28, 40, 30, 2); fill(28, 42, 30, 1, 2);       // the pit (spikes = the long fall)
  fill(41, 35, 4, 1, 1);                              // one floating marble step mid-pit
  carve(77, 35, 5, 5);                                // → Bleachers

  /* === 2 · The Gilded Bleachers: hop the stands while Auto-Servers fire === */
  carve(81, 23, 78, 17);
  carve(93, 40, 58, 2); fill(93, 42, 58, 1, 2);
  [[37, 96], [34, 103], [37, 110], [34, 117], [37, 124], [34, 131], [37, 138], [35, 145]].forEach(([row, x]) => plank(row, x, 4));
  fill(107, 23, 2, 6, 1); fill(128, 23, 2, 6, 1);     // hanging marble pillars (turret mounts)
  carve(157, 35, 5, 5);                               // → Trophy Vault

  /* === 3 · The Trophy Vault: blast your way up with Explosive Baseballs === */
  carve(161, 1, 38, 39);
  fill(161, 30, 38, 1, 1);                            // cracked slab I (breakable middle)
  fill(161, 20, 38, 1, 1);                            // cracked slab II (and the upper floor)
  plank(37, 168, 5); plank(34, 176, 6);
  plank(27, 170, 4); plank(27, 187, 5);
  plank(15, 166, 5); plank(11, 176, 4);
  fill(196, 15, 2, 5, 1);                             // cracked wall in front of the exit
  carve(198, 15, 4, 5);                               // → Laser Concourse

  /* === 4 · The Laser Concourse: Static Dash through the grids === */
  carve(201, 1, 78, 19);
  fill(218, 19, 19, 1, 2);                            // spike gutter
  plank(16, 220, 4); plank(16, 229, 4);
  plank(13, 241, 4);
  carve(277, 15, 5, 5);                               // → Locker Room

  /* === 5 · The Grand Locker Room === */
  carve(281, 1, 38, 19);
  carve(316, 13, 6, 7);                               // the stadium's double doors

  /* === 6 · The Grand Championship Court === */
  carve(321, 1, 78, 19);
  plank(15, 333, 5); plank(15, 384, 5); plank(11, 357, 6);

  /* === 7 · The Zennith Core (under the court) === */
  carve(321, 23, 78, 17);
  plank(35, 333, 5); plank(35, 384, 5); plank(31, 357, 6);

  /* === Gauntlet · The Championship Colosseum (VIP lift from the locker room) === */
  carve(241, 23, 78, 18);                             // the floor is row 41
  plank(36, 262, 6); plank(36, 296, 6); plank(32, 279, 7);
  fill(309, 34, 10, 7, 1);                            // the VIP stage (Big Bertha parks on it)
  carve(201, 23, 39, 18);                             // the Hall of Legends' gate wing: column 240 stays rock until the dream opens it

  /* === Secret · The Overtime Abyss (zone/abyss.js places its hazards) === */
  // the breach: a low tunnel through a triple laser, then a long dark shaft
  carve(1, 45, 52, 3); carve(46, 45, 6, 44);
  // Room 1 · The Pogo Canyon: no floor, saws above and below
  carve(41, 89, 118, 20);
  fill(41, 96, 14, 13, 1);                            // start ledge
  fill(116, 94, 2, 7, 1);                             // the ice-coated wall strip
  fill(150, 98, 9, 11, 1); carve(158, 92, 3, 6);      // exit ledge → Laser Shaft
  // Room 2 · The Laser Shaft: a narrow chimney
  carve(161, 92, 10, 6); carve(163, 46, 8, 52);
  carve(160, 70, 3, 4);                               // the alcove across the wind
  carve(171, 50, 30, 4);                              // the top ledge → Endless Pitch
  // Room 3 · The Endless Pitch: open void in the clouds
  carve(201, 45, 78, 20);
  fill(201, 54, 6, 11, 1); fill(266, 54, 13, 11, 1);  // start and exit ledges
  carve(278, 50, 4, 4);                               // → Final Stretch
  // Room 4 · The Final Stretch
  carve(281, 45, 118, 42);
  fill(281, 54, 8, 33, 1);                            // start pillar
  fill(326, 60, 2, 27, 1); fill(333, 52, 2, 35, 1);   // the two ice-coated pillars
  fill(388, 66, 10, 21, 1);                           // the white marble platform
}
function setLock(L, closed) { fill(L.tx, L.ty, L.w, L.h, closed ? 1 : 0); }

/* ---------- Cracked slabs & walls (Explosive Baseballs) ---------- */
const BREAKS = [
  { id: 'v_slab1', room: 't_vault', tx: 176, ty: 30, w: 8, h: 1 },
  { id: 'v_slab2', room: 't_vault', tx: 186, ty: 20, w: 8, h: 1 },
  { id: 'v_wall',  room: 't_vault', tx: 196, ty: 15, w: 2, h: 5 },
];
// red laser grids (Static Dash only)
const LASERS = [
  { room: 't_lasers', tx: 210, ty: 1, h: 19 },
  { room: 't_lasers', tx: 225, ty: 1, h: 18 },
  { room: 't_lasers', tx: 250, ty: 1, h: 19 }, { room: 't_lasers', tx: 256, ty: 1, h: 19 }, { room: 't_lasers', tx: 262, ty: 1, h: 19 },
];
// Auto-Server Turrets: wall- and pillar-mounted tennis ball cannons
const TURRETS = [
  { room: 't_bleach', x: 108 * TILE, y: 29 * TILE + 12, dir: 'down' },
  { room: 't_bleach', x: 129 * TILE, y: 29 * TILE + 12, dir: 'down' },
  { room: 't_bleach', x: 159 * TILE - 14, y: 30 * TILE, dir: 'left' },
  { room: 't_bleach', x: 81 * TILE + 14, y: 28 * TILE, dir: 'right' },
];
// a memory-portal back up to the locker room (only when the Core is quiet)
const CORE_EXIT = T(326, 40);

/* ---------- Enemy placement per room ---------- */
const SPAWNS = {
  t_steps: [{ k: 'golddrone', x: 43 * TILE, y: 30 * TILE }, { k: 'golddrone', x: 66 * TILE, y: 33 * TILE }, { k: 'umpire', ...T(70, 40) }],
  t_bleach: [{ k: 'golddrone', x: 120 * TILE, y: 28 * TILE }, { k: 'crate', id: 't_bleach', ...T(154, 40), bolts: 20 }],
  t_vault: [{ k: 'umpire', ...T(186, 40) }, { k: 'umpire', ...T(168, 30) }, { k: 'golddrone', x: 190 * TILE, y: 25 * TILE }, { k: 'umpire', ...T(180, 20) }],
  t_lasers: [{ k: 'golddrone', x: 244 * TILE, y: 9 * TILE }, { k: 'umpire', ...T(240, 20) }, { k: 'umpire', ...T(270, 20) }, { k: 'crate', id: 't_lasers', ...T(243, 13), bolts: 20 }],
  t_locker: [],
  t_court: [],
  z_core: [],
};
