'use strict';
/* =========================================================
   ACT II · THE OPEN MID-GAME — world layout (one tile grid)
   Zone 5 The Grand Concourse (hub) · Zone 6 The Geode Caverns ·
   Zone 7 The Storm Atrium · Zone 8 The Glacier Crown.
   1 map unit = 40 × 22 tiles.
   ========================================================= */
const UW = 40, UH = 22;
const ROOMS = [
  // Zone 5 · The Grand Concourse
  { id: 'c_hall',     zone: 'z5', name: 'The Grand Concourse',  ux: 3, uy: 2, uw: 3, uh: 2, tint: '220,170,70' },
  // Zone 6 · The Geode Caverns (west)
  { id: 'g_mouth',    zone: 'z6', name: 'The Geode Mouth',      ux: 2, uy: 2, uw: 1, uh: 1, tint: '150,90,200' },
  { id: 'g_fields',   zone: 'z6', name: 'The Floating Fields',  ux: 0, uy: 1, uw: 2, uh: 2, tint: '120,80,210' },
  { id: 'g_pedestal', zone: 'z6', name: 'The Pebble Pedestal',  ux: 0, uy: 0, uw: 2, uh: 1, tint: '80,190,140' },
  // Zone 7 · The Storm Atrium (above)
  { id: 's_gate',     zone: 'z7', name: 'The Greenhouse Gate',  ux: 4, uy: 1, uw: 1, uh: 1, tint: '90,140,110' },
  { id: 's_gusts',    zone: 'z7', name: 'The Gale Gardens',     ux: 3, uy: 0, uw: 3, uh: 1, tint: '110,100,170' },
  { id: 's_fountain', zone: 'z7', name: 'The Ruined Fountain',  ux: 6, uy: 0, uw: 1, uh: 1, tint: '150,90,200' },
  // Zone 8 · The Glacier Crown (east)
  { id: 'i_steps',    zone: 'z8', name: 'The Frozen Steps',     ux: 6, uy: 2, uw: 1, uh: 2, tint: '120,180,220' },
  { id: 'i_halls',    zone: 'z8', name: 'The Icicle Halls',     ux: 7, uy: 2, uw: 2, uh: 1, tint: '150,200,230' },
  { id: 'i_throne',   zone: 'z8', name: 'The Frost Throne',     ux: 7, uy: 1, uw: 2, uh: 1, tint: '100,160,220' },
  // gauntlet (zone/gauntlets.js): a sealed cavern under the Geode Mouth
  { id: 'g_trial',    zone: 'z6', name: 'The Crystal Zero-G Trial', ux: 0, uy: 3, uw: 3, uh: 1, tint: '150,100,240', secret: true },
];
const ROOM = {};
ROOMS.forEach((r, i) => {
  r.i = i; ROOM[r.id] = r;
  r.x0 = r.ux * UW; r.y0 = r.uy * UH; r.tw = r.uw * UW; r.th = r.uh * UH;
  r.px = { x: r.x0 * TILE, y: r.y0 * TILE, w: r.tw * TILE, h: r.th * TILE };
});
const LINKS = [['c_hall', 'g_mouth'], ['g_mouth', 'g_fields'], ['g_fields', 'g_pedestal'], ['c_hall', 's_gate'], ['s_gate', 's_gusts'], ['s_gusts', 's_fountain'],
  ['c_hall', 'i_steps'], ['i_steps', 'i_halls'], ['i_halls', 'i_throne'], ['g_mouth', 'g_trial']];
function roomAt(px, py) {
  for (const r of ROOMS) if (px >= r.px.x && px < r.px.x + r.px.w && py >= r.px.y && py < r.px.y + r.px.h) return r;
  return null;
}
const T = (tx, row) => ({ x: tx * TILE + TILE / 2, y: row * TILE });   // tile column + surface row → feet position
const R = (tx, ty, tw, th) => ({ x: tx * TILE, y: ty * TILE, w: tw * TILE, h: th * TILE });

/* ---------- Key places ---------- */
const A = {
  benches: [{ pos: T(140, 87), room: 'c_hall' }, { pos: T(116, 57), room: 'g_mouth' }, { pos: T(180, 43), room: 's_gate' }, { pos: T(246, 87), room: 'i_steps' },
    { pos: T(85, 65), room: 'g_mouth' }],                 // right beside the crack down to the Zero-G Trial
  bells: { z5: { pos: T(158, 87), room: 'c_hall' }, z6: { pos: T(110, 57), room: 'g_mouth' }, z7: { pos: T(174, 43), room: 's_gate' }, z8: { pos: T(252, 87), room: 'i_steps' } },
  reshmen: { z5: { pos: T(124, 57), room: 'c_hall' }, z6: { pos: T(4, 65), room: 'g_fields' }, z7: { pos: T(197, 43), room: 's_gate' }, z8: { pos: T(276, 87), room: 'i_steps' } },
  liftC: R(124, 81, 6, 6), arriveC: T(127, 87),
  gate: R(173, 76, 14, 11),                       // the Pennant Gate (golden elevator door)
  // bosses
  fionn: T(62, 21), pedestal: T(72, 19), fionnLock: { tx: 6, ty: 21, w: 8, h: 1 }, fionnTrigger: 22 * TILE,
  milo: { x: 260 * TILE, y: 9 * TILE }, miloLock: { tx: 240, ty: 16, w: 1, h: 5 }, miloTrigger: 247 * TILE,
  denizSeat: T(288, 37), denizFloor: T(300, 43), denizLock: { tx: 348, ty: 43, w: 6, h: 1 }, denizTrigger: 338 * TILE,
};

/* ---------- Geometry ---------- */
function buildAct2() {
  LW = 360; LH = 88; grid = new Uint8Array(LW * LH).fill(1);
  const carve = (x, y, w, h) => fill(x, y, w, h, 0);
  const plank = (row, x, w) => fill(x, row, w, 1, 3);

  /* === Zone 5 · The Grand Concourse: a towering open-air atrium === */
  carve(121, 45, 118, 42);
  // west zig-zag up to the Geode Caverns
  [[84, 143], [81, 136], [78, 143], [75, 136], [72, 143], [69, 136], [66, 143], [63, 136], [60, 143]].forEach(([row, x]) => plank(row, x, 6));
  plank(57, 121, 21);
  carve(118, 52, 4, 5);                                       // → Geode Mouth
  // golden updraft hole in the ceiling → Storm Atrium
  carve(190, 43, 5, 2);
  // east floor door → Glacier Crown
  carve(238, 82, 4, 5);
  // the laser nook (Static Dash secret)
  [[84, 230], [81, 223], [78, 230], [75, 223], [72, 214]].forEach(([row, x]) => plank(row, x, 6));
  fill(220, 70, 18, 2, 1); fill(220, 61, 18, 2, 1);

  /* === Zone 6 · The Geode Caverns === */
  // Geode Mouth
  carve(81, 45, 38, 20);
  fill(108, 57, 11, 8, 1);                                    // entry shelf (bench + bell)
  plank(62, 98, 5); plank(59, 103, 5);                        // steps back up to the shelf
  plank(60, 90, 4);
  carve(78, 59, 4, 6);                                        // → Floating Fields
  // The Floating Fields (anti-gravity crystal fields)
  carve(1, 23, 78, 42);
  [[59, 64], [53, 54], [47, 64]].forEach(([row, x]) => plank(row, x, 6));
  plank(41, 52, 6);
  fill(20, 41, 32, 2, 1);                                     // long crystal ledge
  plank(35, 24, 5); plank(29, 14, 5); plank(26, 7, 6);
  carve(6, 21, 8, 2);                                         // hole up to the Pedestal
  // The Pebble Pedestal (Fionn's arena)
  carve(1, 1, 78, 20);
  plank(16, 24, 6); plank(13, 38, 6); plank(16, 52, 6);
  fill(70, 19, 5, 2, 1);                                      // the pedestal itself

  /* === Zone 7 · The Storm Atrium === */
  // Greenhouse Gate
  carve(161, 23, 38, 20);
  carve(164, 21, 5, 2);                                       // updraft hole → Gale Gardens
  plank(38, 184, 4);
  // The Gale Gardens: wind gusts, spike beds, lightning rods
  carve(121, 1, 118, 20);
  fill(172, 20, 10, 1, 2); fill(192, 20, 12, 1, 2); fill(214, 20, 11, 1, 2);
  plank(18, 175, 4); plank(18, 194, 4); plank(18, 200, 3); plank(18, 217, 4);
  plank(12, 150, 5); plank(11, 185, 5); plank(12, 215, 5);
  carve(238, 16, 4, 5);                                       // → Ruined Fountain
  // The Ruined Fountain (Milo's arena)
  carve(241, 1, 38, 20);
  fill(256, 19, 8, 2, 1);                                     // the broken fountain basin
  plank(15, 245, 5); plank(15, 271, 5); plank(11, 257, 6);

  /* === Zone 8 · The Glacier Crown === */
  // The Frozen Steps
  carve(241, 45, 38, 42);
  fill(258, 85, 6, 2, 1);
  [[83, 250], [80, 258], [77, 250], [74, 258], [71, 250], [68, 258]].forEach(([row, x]) => plank(row, x, 6));
  fill(266, 65, 13, 2, 1);
  carve(278, 59, 4, 6);                                       // → Icicle Halls
  // The Icicle Halls
  carve(281, 45, 78, 20);
  plank(62, 284, 5); plank(59, 290, 5); plank(56, 284, 5);
  plank(53, 282, 15); fill(297, 45, 1, 9, 1);                 // laser nook ledge + wall
  fill(300, 64, 12, 1, 2); fill(322, 64, 12, 1, 2);           // spike pits (icicles make stepping stones)
  fill(340, 63, 4, 2, 1);
  [[61, 345], [58, 352], [55, 345], [52, 352], [49, 345]].forEach(([row, x]) => plank(row, x, 5));
  plank(46, 349, 4);
  carve(348, 43, 6, 2);                                       // hole up to the throne
  // The Frost Throne (Deniz's arena)
  carve(281, 23, 78, 20);
  fill(282, 37, 12, 6, 1);                                    // the ice throne
  plank(37, 300, 5); plank(33, 316, 5); plank(37, 332, 5); plank(29, 322, 4);

  /* === Gauntlet · The Crystal Zero-G Trial (a sealed cavern under the Geode Mouth) === */
  carve(90, 65, 3, 4);                                        // a crack in the Geode Mouth floor
  carve(76, 69, 18, 5);                                       // the antechamber: three red lasers
  carve(1, 67, 75, 19);                                       // the floorless cavern
  fill(1, 85, 75, 1, 2);                                      // a bed of crystal spikes where the floor should be
  fill(70, 74, 6, 1, 1);                                      // the last solid ground
  fill(20, 70, 1, 7, 2); fill(52, 72, 1, 7, 2);               // suspended spike walls
  fill(33, 79, 7, 1, 2); fill(8, 75, 5, 1, 2); fill(60, 70, 5, 1, 2);
  fill(8, 81, 5, 1, 1); fill(26, 77, 5, 1, 1); fill(42, 75, 5, 1, 1); fill(58, 80, 5, 1, 1);   // floating crystal islands (crabs nest here)
}
function setLock(L, closed) { fill(L.tx, L.ty, L.w, L.h, closed ? 1 : 0); }

/* ---------- Gadgets ---------- */
// anti-gravity crystal fields: gravity halved inside
const FIELDS = [R(46, 34, 32, 31), R(2, 22, 30, 19), R(4, 14, 12, 8), R(2, 2, 16, 12),
  R(3, 68, 15, 12), R(24, 68, 26, 15), R(55, 72, 13, 12)];      // the Zero-G Trial
// rising air currents
const UPDRAFTS = [{ ...R(190, 37, 5, 50), cap: -560, gold: true }, { ...R(164, 14, 5, 29), cap: -560 }];
// copper lightning rods (strikes charge them; swing to harvest a charged bat)
const RODS = [
  { room: 's_gusts', tx: 186, row: 21, period: 5.5, ph: 0 }, { room: 's_gusts', tx: 208, row: 21, period: 5.5, ph: 1.8 }, { room: 's_gusts', tx: 231, row: 21, period: 5.5, ph: 3.6 },
  { room: 's_fountain', tx: 243, row: 21, period: 7, ph: 0 }, { room: 's_fountain', tx: 276, row: 21, period: 7, ph: 3.5 },
].map(r => Object.assign(r, { x: r.tx * TILE + 16, y: r.row * TILE, t: 0, charged: 0, flash: 0, warned: false }));
// icicles over the spike pits: they fall, then sit as temporary stepping stones
const ICICLES = [{ tx: 303 }, { tx: 308 }, { tx: 325 }, { tx: 330 }].map(i => Object.assign(i, { room: 'i_halls', ty: 45, state: 'hang', t: 0, y: 45 * TILE, vy: 0, row: -1 }));
// red laser barriers (Static Dash)
const LASERS = [{ room: 'c_hall', tx: 226, ty: 63, h: 7 }, { room: 'i_halls', tx: 291, ty: 45, h: 8 },
  { room: 'g_trial', tx: 87, ty: 69, h: 5 }, { room: 'g_trial', tx: 83, ty: 69, h: 5 }, { room: 'g_trial', tx: 79, ty: 69, h: 5 }];
// Lucky Pebbles hidden in Act II (30 of the 50; five of them are the Zero-G Trial's prize cluster)
const PEBBLES = [
  { id: 'c1', room: 'c_hall', ...T(146, 60) }, { id: 'c2', room: 'c_hall', ...T(192, 60) }, { id: 'c3', room: 'c_hall', ...T(201, 54) },
  { id: 'c4', room: 'c_hall', ...T(230, 70) }, { id: 'c5', room: 'c_hall', ...T(234, 70) }, { id: 'c6', room: 'c_hall', ...T(216, 72) },
  { id: 'g1', room: 'g_mouth', ...T(91, 60) }, { id: 'g3', room: 'g_fields', ...T(10, 65) },
  { id: 'g7', room: 'g_pedestal', ...T(40, 13) },
  { id: 'g2', room: 'g_trial', ...T(70, 73), gx: 'zerog' }, { id: 'g4', room: 'g_trial', ...T(72, 72), gx: 'zerog' }, { id: 'g5', room: 'g_trial', ...T(74, 73), gx: 'zerog' },
  { id: 'g6', room: 'g_trial', ...T(71, 70), gx: 'zerog' }, { id: 'g8', room: 'g_trial', ...T(73, 70), gx: 'zerog' },
  { id: 's1', room: 's_gate', ...T(166, 30) }, { id: 's2', room: 's_gusts', ...T(187, 11) }, { id: 's3', room: 's_gusts', ...T(217, 12) },
  { id: 's4', room: 's_gusts', ...T(152, 12) }, { id: 's5', room: 's_gusts', ...T(201, 9) }, { id: 's6', room: 's_gusts', ...T(234, 21) },
  { id: 's7', room: 's_fountain', ...T(247, 15) }, { id: 's8', room: 's_fountain', ...T(273, 15) },
  { id: 'i1', room: 'i_steps', ...T(253, 71) }, { id: 'i2', room: 'i_steps', ...T(272, 65) }, { id: 'i3', room: 'i_steps', ...T(245, 60) },
  { id: 'i4', room: 'i_halls', ...T(294, 53) }, { id: 'i5', room: 'i_halls', ...T(317, 65) }, { id: 'i6', room: 'i_halls', ...T(328, 58) },
  { id: 'i7', room: 'i_halls', ...T(352, 46) }, { id: 'i8', room: 'i_throne', ...T(318, 33) },
];

/* ---------- Enemy placement per room ---------- */
const SPAWNS = {
  c_hall: [{ k: 'drone', x: 200 * TILE, y: 70 * TILE }, { k: 'crate', id: 'c_nook', ...T(236, 70), bolts: 16 }],
  g_mouth: [{ k: 'crab', ...T(96, 65) }, { k: 'wisp', x: 88 * TILE, y: 52 * TILE }],
  g_fields: [{ k: 'crab', ...T(30, 65) }, { k: 'crab', ...T(58, 65) }, { k: 'wisp', x: 62 * TILE, y: 50 * TILE }, { k: 'wisp', x: 20 * TILE, y: 32 * TILE }, { k: 'crate', id: 'g_fields', ...T(36, 41), bolts: 12 }],
  g_pedestal: [],
  s_gate: [{ k: 'gargoyle', x: 186 * TILE, y: 28 * TILE }],
  s_gusts: [{ k: 'static', x: 177 * TILE, y: 14 * TILE }, { k: 'static', x: 198 * TILE, y: 13 * TILE }, { k: 'static', x: 219 * TILE, y: 14 * TILE },
    { k: 'gargoyle', x: 160 * TILE, y: 5 * TILE }, { k: 'gargoyle', x: 210 * TILE, y: 5 * TILE }, { k: 'crate', id: 's_gusts', ...T(130, 21), bolts: 12 }],
  s_fountain: [],
  i_steps: [{ k: 'bat', x: 262 * TILE, y: 56 * TILE }, { k: 'bat', x: 265 * TILE, y: 54 * TILE }, { k: 'bat', x: 259 * TILE, y: 53 * TILE }],
  i_halls: [{ k: 'sentinel', ...T(316, 65) }, { k: 'sentinel', ...T(347, 65) }, { k: 'bat', x: 328 * TILE, y: 50 * TILE }, { k: 'bat', x: 332 * TILE, y: 49 * TILE },
    { k: 'crate', id: 'i_nook', ...T(296, 53), bolts: 16 }],
  i_throne: [],
};
