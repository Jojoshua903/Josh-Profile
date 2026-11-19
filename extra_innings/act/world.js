'use strict';
/* =========================================================
   ACT I · ZONES 2–4 — world layout (one big tile grid)
   Zone 2 The Deep Quarry · Zone 3 The Ventilation Shafts ·
   Zone 4 The Pyrotechnic Foundry. 1 map unit = 40 × 22 tiles.
   ========================================================= */
const UW = 40, UH = 22;
const ROOMS = [
  // Zone 2 · The Deep Quarry
  { id: 'q_mouth',    zone: 'z2', name: 'The Quarry Mouth',    ux: 0, uy: 3, uw: 2, uh: 1, tint: '200,100,50' },
  { id: 'q_shaft',    zone: 'z2', name: 'The Long Shaft',      ux: 2, uy: 1, uw: 1, uh: 3, tint: '170,90,50' },
  { id: 'q_lars',     zone: 'z2', name: 'Lars\'s Cavern',      ux: 1, uy: 2, uw: 1, uh: 1, tint: '220,150,60' },
  { id: 'q_rails',    zone: 'z2', name: 'The Minecart Rails',  ux: 3, uy: 2, uw: 2, uh: 1, tint: '220,80,30' },
  { id: 'q_falls',    zone: 'z2', name: 'The Spark Falls',     ux: 5, uy: 2, uw: 1, uh: 1, tint: '150,80,150', dark: true },
  { id: 'q_crystal',  zone: 'z2', name: 'The Crystal Gallery', ux: 3, uy: 1, uw: 2, uh: 1, tint: '80,160,190' },
  { id: 'q_elevator', zone: 'z2', name: 'The Quarry Elevator', ux: 5, uy: 1, uw: 1, uh: 1, tint: '200,170,70' },
  // Zone 3 · The Ventilation Shafts
  { id: 'v_intake',   zone: 'z3', name: 'The Intake Duct',     ux: 7, uy: 2, uw: 1, uh: 1, tint: '90,130,160' },
  { id: 'v_chase',    zone: 'z3', name: 'The Wind Tunnel',     ux: 8, uy: 0, uw: 8, uh: 3, tint: '110,150,180' },
  { id: 'v_turbine',  zone: 'z3', name: 'The Turbine Hall',    ux: 16, uy: 0, uw: 1, uh: 2, tint: '70,120,150' },
  // Zone 4 · The Pyrotechnic Foundry
  { id: 'f_floor',    zone: 'z4', name: 'The Foundry Floor',   ux: 17, uy: 1, uw: 2, uh: 1, tint: '210,110,50' },
  { id: 'f_fuse',     zone: 'z4', name: 'The Fuse Tower',      ux: 19, uy: 0, uw: 1, uh: 2, tint: '220,150,50' },
  { id: 'f_core',     zone: 'z4', name: 'The Foundry Core',    ux: 20, uy: 0, uw: 1, uh: 1, tint: '220,60,60' },
  // gauntlets (zone/gauntlets.js)
  { id: 'v_shaft',    zone: 'z3', name: 'The Laser Turbine Shaft', ux: 16, uy: 2, uw: 1, uh: 2, tint: '90,170,210', secret: true },
  { id: 'f_run',      zone: 'z4', name: 'The Furnace Shaft',   ux: 20, uy: 1, uw: 1, uh: 3, tint: '240,110,40', secret: true },
];
const ROOM = {};
ROOMS.forEach((r, i) => {
  r.i = i; ROOM[r.id] = r;
  r.x0 = r.ux * UW; r.y0 = r.uy * UH; r.tw = r.uw * UW; r.th = r.uh * UH;
  r.px = { x: r.x0 * TILE, y: r.y0 * TILE, w: r.tw * TILE, h: r.th * TILE };
});
const LINKS = [['q_mouth', 'q_shaft'], ['q_shaft', 'q_lars'], ['q_shaft', 'q_rails'], ['q_shaft', 'q_crystal'], ['q_rails', 'q_falls'], ['q_crystal', 'q_elevator'],
  ['v_intake', 'v_chase'], ['v_chase', 'v_turbine'], ['f_floor', 'f_fuse'], ['f_fuse', 'f_core'], ['v_turbine', 'v_shaft'], ['f_fuse', 'f_run']];
function roomAt(px, py) {
  for (const r of ROOMS) if (px >= r.px.x && px < r.px.x + r.px.w && py >= r.px.y && py < r.px.y + r.px.h) return r;
  return null;
}
const T = (tx, row) => ({ x: tx * TILE + TILE / 2, y: row * TILE });   // tile column + surface row → feet position
const R = (tx, ty, tw, th) => ({ x: tx * TILE, y: ty * TILE, w: tw * TILE, h: th * TILE });

/* ---------- Key places ---------- */
const A = {
  benches: [
    { pos: T(14, 83), room: 'q_mouth' }, { pos: T(58, 65), room: 'q_lars' },
    { pos: T(298, 65), room: 'v_intake' }, { pos: T(690, 42), room: 'f_floor' },
    { pos: T(648, 42), room: 'v_turbine' }, { pos: T(793, 42), room: 'f_fuse' },        // outside the two gauntlets
  ],
  bells: { z2: { pos: T(8, 83), room: 'q_mouth' }, z3: { pos: T(634, 20), room: 'v_chase' }, z4: { pos: T(697, 42), room: 'f_floor' } },
  arriveZ1: T(4, 83),
  exitZ1: R(0, 77, 2, 6),
  lars: T(47, 65), vein: R(41, 57, 2, 8),
  reshman: T(233, 65),
  // Reshman the map-maker hides in a corner of every zone
  reshmen: { z2: { pos: T(233, 65), room: 'q_falls' }, z3: { pos: T(644, 42), room: 'v_turbine' }, z4: { pos: T(685, 42), room: 'f_floor' } },
  sparkFall: { x: 226 * TILE, y0: 47 * TILE, y1: 65 * TILE },
  adam: T(226, 43), adamLock: { tx: 200, ty: 37, w: 1, h: 6 }, adamTrigger: 210 * TILE,
  liftQ: R(232, 37, 6, 6), liftV: R(283, 59, 6, 6),
  arriveV: T(286, 65), arriveQ: T(234, 43),
  blueprint: T(704, 42),
  daniel: T(834, 14), cannonMouth: { x: 829 * TILE, y: 12.6 * TILE }, danielLock: { tx: 800, ty: 16, w: 1, h: 5 }, danielTrigger: 806 * TILE,
  danielFloor: T(824, 21),
  // Phase 4: a golden lift hidden behind Big Bertha → the Grand Concourse
  liftC: R(835, 8, 4, 6), arriveC: T(836, 14),
};

/* ---------- Geometry ---------- */
function buildAct() {
  LW = 840; LH = 88; grid = new Uint8Array(LW * LH).fill(1);
  const carve = (x, y, w, h) => fill(x, y, w, h, 0);

  /* === Zone 2 · The Deep Quarry === */
  // Quarry Mouth (arrive from Zone 1 on the left)
  carve(1, 70, 78, 13); carve(0, 77, 2, 6);
  fill(28, 80, 4, 3, 1);
  carve(40, 83, 8, 2); fill(40, 84, 8, 1, 2); fill(42, 80, 4, 1, 3);       // lava pit
  carve(60, 83, 6, 2); fill(60, 84, 6, 1, 2);                              // lava pit
  fill(50, 79, 5, 1, 3);
  carve(78, 78, 4, 5);                                                    // → Long Shaft

  // The Long Shaft: zig-zag ledges up the quarry wall
  carve(81, 24, 38, 59);
  const cols = [83, 92, 101, 110], pat = [0, 1, 2, 3, 2, 1];
  for (let i = 0, row = 80; row >= 32; i++, row -= 3) fill(cols[pat[i % 6]], row, 6, 1, 3);
  carve(78, 60, 4, 5); fill(81, 65, 6, 1, 1);                             // ← Lars's Cavern
  carve(118, 49, 4, 5); fill(112, 54, 7, 1, 1);                           // → Minecart Rails
  carve(118, 26, 4, 5); fill(111, 31, 8, 1, 1);                           // → Crystal Gallery

  // Lars's Cavern (side cavern, halfway up)
  carve(41, 47, 38, 18);
  fill(64, 62, 3, 3, 1);

  // Minecart Rails over the lava
  carve(121, 47, 78, 18);
  fill(121, 54, 8, 11, 1);                                                // entry ledge
  fill(129, 64, 61, 1, 2);                                                // lava river
  fill(160, 58, 3, 7, 1);                                                 // rest pillar
  fill(190, 55, 9, 10, 1);                                                // far ledge
  fill(150, 50, 3, 1, 3);                                                 // high titanium perch
  carve(198, 50, 4, 5);                                                   // → Spark Falls

  // The Spark Falls (dark; Reshman hides behind the falls)
  carve(201, 47, 38, 18);
  fill(201, 55, 6, 10, 1);
  carve(201, 60, 4, 5);                                                   // secret nook behind a cracked wall
  fill(214, 61, 3, 4, 1);

  // The Crystal Gallery
  carve(121, 25, 78, 18);
  fill(121, 31, 6, 12, 1);
  fill(132, 42, 6, 1, 2);
  fill(140, 40, 4, 3, 1);
  fill(150, 42, 20, 1, 2);                                                // crystal spike bed
  fill(152, 40, 2, 1, 3); fill(158, 37, 3, 1, 3); fill(165, 40, 2, 1, 3);
  fill(186, 41, 3, 2, 1);
  carve(198, 37, 4, 6);                                                   // → Quarry Elevator

  // The Quarry Elevator (Adam's duel)
  carve(201, 25, 38, 18);
  fill(206, 37, 5, 1, 3); fill(222, 34, 5, 1, 3);

  /* === Zone 3 · The Ventilation Shafts === */
  // Intake Duct (elevator arrives here)
  carve(281, 47, 38, 18);
  carve(318, 57, 4, 8);                                                   // → Wind Tunnel
  // laser nook (Phase 4 · Static Dash secret)
  fill(300, 56, 14, 1, 3); fill(299, 47, 1, 9, 1);
  fill(306, 62, 5, 1, 3); fill(313, 59, 5, 1, 3);

  // The Wind Tunnel: leg A (bottom, →), leg B (updraft shaft, ↑), leg C (top, →)
  carve(321, 50, 150, 15);
  fill(340, 64, 6, 1, 2);
  fill(372, 64, 9, 1, 2); fill(375, 61, 3, 1, 3);
  fill(392, 58, 3, 7, 1);
  fill(425, 64, 16, 1, 2); fill(429, 60, 2, 1, 3); fill(435, 58, 2, 1, 3);
  carve(462, 8, 12, 57);
  carve(462, 6, 176, 14);
  fill(495, 12, 2, 8, 1);
  fill(505, 19, 10, 1, 2);
  fill(550, 10, 2, 10, 1);
  fill(560, 19, 18, 1, 2); fill(565, 16, 2, 1, 3); fill(572, 15, 2, 1, 3);
  fill(605, 13, 2, 7, 1);
  carve(637, 14, 5, 6);                                                   // → Turbine Hall

  // The Turbine Hall
  carve(641, 4, 38, 38);
  fill(641, 20, 7, 1, 1);
  fill(650, 24, 5, 1, 3); fill(658, 28, 5, 1, 3); fill(650, 32, 5, 1, 3); fill(659, 36, 5, 1, 3);
  fill(674, 9, 4, 1, 3);                                                  // titanium perch at the top of the updraft
  carve(652, 1, 4, 3);                                                    // secret: a maintenance vent in the ceiling (zone/endings.js · the Renas Shortcut)
  carve(678, 36, 4, 6);                                                   // → Foundry Floor

  /* === Zone 4 · The Pyrotechnic Foundry === */
  // Foundry Floor
  carve(681, 25, 78, 17);
  fill(738, 41, 14, 1, 2);                                                // spike pit under the fuse crates
  carve(758, 36, 4, 6);                                                   // → Fuse Tower

  // The Fuse Tower
  carve(761, 3, 38, 39);
  fill(768, 41, 22, 1, 2);
  fill(773, 36, 3, 1, 3); fill(784, 30, 3, 1, 3); fill(789, 24, 3, 1, 3);
  fill(762, 30, 3, 1, 3); fill(762, 24, 3, 1, 3); fill(762, 18, 3, 1, 3);
  fill(795, 21, 4, 1, 1);
  carve(798, 16, 4, 5);                                                   // → Foundry Core

  // The Foundry Core: three tiers of scaffolding and Daniel's cannon
  carve(801, 2, 38, 19);
  fill(805, 17, 9, 1, 3); fill(818, 17, 8, 1, 3);
  fill(803, 13, 7, 1, 3); fill(813, 13, 8, 1, 3);
  fill(808, 9, 9, 1, 3);
  fill(829, 14, 10, 7, 1);
  fill(836, 7, 3, 7, 1);                                                  // cracked wall behind the cannon (Phase 4)

  /* === Gauntlet · The Laser Turbine Shaft (under the Turbine Hall floor) === */
  carve(659, 44, 3, 2);                                                   // the drop under the cracked floor (rows 42-43 blow open)
  carve(654, 46, 23, 5);                                                  // top corridor (red laser at col 664)
  carve(671, 51, 6, 30);                                                  // the spiky chute down the right side
  fill(671, 57, 3, 1, 2); fill(674, 63, 3, 1, 2); fill(671, 69, 3, 1, 2); fill(674, 75, 3, 1, 2);
  carve(645, 81, 32, 5);                                                  // bottom corridor (sweeping lasers)
  fill(656, 85, 4, 1, 2); fill(664, 85, 3, 1, 2);
  carve(645, 46, 7, 35);                                                  // the updraft column, turbine blades all the way up
  fill(645, 51, 7, 1, 3);                                                 // the reward alcove's floor (ride up through it)

  /* === Gauntlet · The Foundry Conveyor Run (an abandoned furnace shaft behind the Fuse Tower) === */
  carve(801, 24, 38, 62);                                                 // rows 24-85; the slag rises from the bottom
  fill(801, 36, 8, 1, 1); fill(801, 42, 8, 2, 1);                         // the entry nook behind the cracked wall
  fill(806, 83, 6, 1, 3); fill(815, 80, 6, 1, 3); fill(824, 77, 6, 1, 3); // the bottom
  fill(806, 62, 24, 1, 3); fill(831, 59, 6, 1, 3);                        // batting plank under grate I
  fill(801, 58, 38, 1, 1);                                                // grate I
  fill(824, 56, 5, 1, 1); fill(815, 53, 6, 1, 1); fill(806, 50, 6, 1, 1); fill(815, 47, 6, 1, 1); fill(826, 44, 6, 1, 1);   // conveyor ledges
  fill(812, 41, 15, 1, 3);                                                // batting plank under grate II
  fill(809, 38, 30, 1, 1);                                                // grate II
  fill(801, 26, 1, 10, 2); fill(838, 26, 1, 10, 2);                       // scorching walls: no wall-climbing the last stretch
  fill(812, 28, 16, 2, 1);                                                // the top of the furnace

  FUSES.forEach(f => { fill(f.tx, f.ty, f.w, 1, 1); markUnsafe(f.tx, f.ty, f.w, 1); });
  markUnsafe(801, 58, 38, 1); markUnsafe(809, 38, 30, 1);                 // the grates blow open in the gauntlet
}
function setLock(L, closed) { fill(L.tx, L.ty, L.w, L.h, closed ? 1 : 0); }

/* ---------- Hazards & gadgets ---------- */
const LAVA = [R(40, 83.6, 8, 1.4), R(60, 83.6, 6, 1.4), R(129, 63.6, 61, 1.4)];
const CART_SPECS = [{ room: 'q_rails', x0: 129 * TILE, x1: 157 * TILE, y: 58 * TILE }, { room: 'q_rails', x0: 163 * TILE, x1: 187 * TILE, y: 58 * TILE, phase: 1.5 }];
const UPDRAFTS = [
  { room: 'v_chase', ...R(386, 50, 6, 15) }, { room: 'v_chase', ...R(462, 6, 12, 59), cap: -620 },
  { room: 'v_chase', ...R(489, 6, 6, 14) }, { room: 'v_chase', ...R(544, 6, 6, 14) }, { room: 'v_chase', ...R(599, 6, 6, 14) },
  { room: 'v_turbine', ...R(667, 6, 7, 36) },
  { room: 'v_shaft', ...R(645, 52, 7, 34), cap: -600 },
];
// spinning fan blades: centre tile, radius (px), optional sway (dx/dy tiles, speed)
const FANS = [
  { room: 'v_chase', tx: 360, ty: 57, r: 46, dy: 4, sp: 1.3 },
  { room: 'v_chase', tx: 408, ty: 54, r: 42, dy: 2, sp: 2 }, { room: 'v_chase', tx: 415, ty: 61, r: 42, dy: 2, sp: 2, ph: 3 },
  { room: 'v_chase', tx: 452, ty: 57, r: 52, dx: 3, sp: 1.6 },
  { room: 'v_chase', tx: 464.5, ty: 45, r: 50, dx: 2, sp: 1.4 }, { room: 'v_chase', tx: 471, ty: 34, r: 50, dx: 2, sp: 1.4, ph: 2 }, { room: 'v_chase', tx: 464.5, ty: 23, r: 50, dx: 2, sp: 1.7, ph: 1 },
  { room: 'v_chase', tx: 510, ty: 13, r: 44, dx: 3, sp: 1.8 },
  { room: 'v_chase', tx: 530, ty: 10, r: 40, dy: 2, sp: 2 }, { room: 'v_chase', tx: 537, ty: 16, r: 40, dy: 2, sp: 2, ph: 3 },
  { room: 'v_chase', tx: 590, ty: 13, r: 46, dy: 4, sp: 1.5 },
  { room: 'v_turbine', tx: 670.5, ty: 30, r: 44, dx: 2, sp: 1.2 }, { room: 'v_turbine', tx: 670.5, ty: 18, r: 44, dx: 2, sp: 1.6, ph: 2 },
  // the Laser Turbine Shaft: three blades up the updraft, swaying out of step
  { room: 'v_shaft', tx: 648.5, ty: 76, r: 40, dx: 2, sp: 1.5 }, { room: 'v_shaft', tx: 648.5, ty: 67, r: 40, dx: 2, sp: 1.5, ph: 3.1 },
  { room: 'v_shaft', tx: 648.5, ty: 58, r: 40, dx: 2, sp: 1.9, ph: 1.4 },
];
const CONVEYORS = [{ room: 'f_floor', x0: 711 * TILE, x1: 723 * TILE, y: 42 * TILE, dir: 1 }, { room: 'f_floor', x0: 725 * TILE, x1: 736 * TILE, y: 42 * TILE, dir: -1 },
  { room: 'f_run', x0: 815 * TILE, x1: 821 * TILE, y: 53 * TILE, dir: -1 }, { room: 'f_run', x0: 815 * TILE, x1: 821 * TILE, y: 47 * TILE, dir: 1 }];
// fuse crates: solid wooden boxes that ignite when stepped on
const FUSES = [
  { room: 'f_floor', tx: 739, ty: 39, w: 2 }, { room: 'f_floor', tx: 744, ty: 39, w: 2 }, { room: 'f_floor', tx: 749, ty: 39, w: 2 },
  { room: 'f_fuse', tx: 768, ty: 39, w: 2 }, { room: 'f_fuse', tx: 779, ty: 33, w: 2 }, { room: 'f_fuse', tx: 790, ty: 27, w: 2 },
  { room: 'f_fuse', tx: 767, ty: 33, w: 2 }, { room: 'f_fuse', tx: 767, ty: 27, w: 2 }, { room: 'f_fuse', tx: 767, ty: 21, w: 2 },
  // the Furnace Shaft: burning stepping stones up the middle stretch
  { room: 'f_run', tx: 831, ty: 74, w: 3 }, { room: 'f_run', tx: 825, ty: 71, w: 3 }, { room: 'f_run', tx: 818, ty: 68, w: 3 }, { room: 'f_run', tx: 811, ty: 65, w: 3 },
].map(f => Object.assign(f, { state: 'idle', t: 0 }));
const ORES = [
  { id: 'rails', room: 'q_rails', ...T(151, 50) }, { id: 'crystal', room: 'q_crystal', ...T(159, 37) },
  { id: 'falls', room: 'q_falls', ...T(202, 65) }, { id: 'turbine', room: 'v_turbine', ...T(675, 9) }, { id: 'fuse', room: 'f_fuse', ...T(763, 18) },
];
const BREAKS = [{ id: 'q_falls', room: 'q_falls', tx: 205, ty: 60, w: 2, h: 5 }, { id: 'f_core', room: 'f_core', tx: 836, ty: 7, w: 3, h: 7 },
  // gauntlet entrances: the Turbine Hall floor behind the fan, the Fuse Tower's back wall
  { id: 'v_shaft', room: 'v_turbine', tx: 659, ty: 42, w: 3, h: 2 }, { id: 'f_run', room: 'f_fuse', tx: 799, ty: 37, w: 2, h: 5 }];
// red laser barriers: only Milo's Static Dash gets through
const LASERS = [{ room: 'v_intake', tx: 309, ty: 47, h: 9 }, { room: 'v_shaft', tx: 664, ty: 46, h: 5 }];
// Lucky Pebbles hidden in Act I (14 of the 50)
const PEBBLES = [
  { id: 'q_mouth', room: 'q_mouth', ...T(52, 79) }, { id: 'q_shaft', room: 'q_shaft', ...T(103, 32) }, { id: 'q_lars', room: 'q_lars', ...T(65, 62) },
  { id: 'q_crystal', room: 'q_crystal', ...T(187, 41) }, { id: 'q_falls', room: 'q_falls', ...T(204, 65) },
  { id: 'v_nook1', room: 'v_intake', ...T(302, 56) }, { id: 'v_nook2', room: 'v_intake', ...T(305, 56) }, { id: 'v_chase', room: 'v_chase', ...T(376, 61) },
  { id: 'v_turbine', room: 'v_turbine', ...T(652, 24) },
  { id: 'f_floor', room: 'f_floor', ...T(745, 39) }, { id: 'f_fuse1', room: 'f_fuse', ...T(796, 21) }, { id: 'f_fuse2', room: 'f_fuse', ...T(785, 30) },
  { id: 'f_core1', room: 'f_core', ...T(812, 9) }, { id: 'f_core2', room: 'f_core', ...T(822, 17) },
];

/* ---------- Enemy placement per room ---------- */
// tick: tile it sits in + which side its surface is on (down/up/left/right)
const SPAWNS = {
  q_mouth: [{ k: 'tick', tx: 30, ty: 70, surf: 'up' }, { k: 'mole', x0: 50, x1: 58, row: 83 }, { k: 'crate', id: 'q_mouth', ...T(70, 83), bolts: 8 }],
  q_shaft: [{ k: 'tick', tx: 81, ty: 70, surf: 'left' }, { k: 'tick', tx: 118, ty: 58, surf: 'right' }, { k: 'tick', tx: 81, ty: 40, surf: 'left' }, { k: 'drone', x: 100 * TILE, y: 45 * TILE }],
  q_lars: [],
  q_rails: [{ k: 'tick', tx: 140, ty: 47, surf: 'up' }, { k: 'tick', tx: 176, ty: 47, surf: 'up' }, { k: 'drone', x: 172 * TILE, y: 52 * TILE }, { k: 'crate', id: 'q_rails', ...T(196, 55), bolts: 10 }],
  q_falls: [{ k: 'tick', tx: 215, ty: 47, surf: 'up' }, { k: 'scuttler', ...T(220, 65) }],
  q_crystal: [{ k: 'hopper', ...T(135, 43) }, { k: 'hopper', ...T(178, 43) }, { k: 'mole', x0: 172, x1: 185, row: 43 }, { k: 'mole', x0: 144, x1: 149, row: 43 }, { k: 'tick', tx: 160, ty: 25, surf: 'up' }],
  q_elevator: [],
  v_intake: [], v_chase: [],
  v_turbine: [{ k: 'drone', x: 655 * TILE, y: 16 * TILE }, { k: 'drone', x: 660 * TILE, y: 30 * TILE }, { k: 'drone', x: 649 * TILE, y: 9 * TILE }],   // the third is a pogo stepping stone to the ceiling vent
  f_floor: [{ k: 'bumper', ...T(718, 42) }, { k: 'scuttler', ...T(730, 42) }, { k: 'drone', x: 726 * TILE, y: 32 * TILE }, { k: 'tick', tx: 700, ty: 25, surf: 'up' }, { k: 'crate', id: 'f_floor', ...T(755, 42), bolts: 12 }],
  f_fuse: [{ k: 'drone', x: 780 * TILE, y: 14 * TILE }, { k: 'tick', tx: 798, ty: 30, surf: 'right' }],
  f_core: [],
};
