'use strict';
/* =========================================================
   ACT I · ZONES 2–4 — world layout (one big tile grid)
   Zone 2 The Deep Quarry · Zone 3 The Ventilation Shafts ·
   Zone 4 The Pyrotechnic Foundry. 1 map unit = 40 × 22 tiles.
   Under the Quarry Mouth (rows 88-153): Zone 2½ The Sunken Bullpen.
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
  // Zone 2½ · The Sunken Bullpen (under the Deep Quarry, behind the cracked floor of the Quarry Mouth · act/bullpen.js)
  { id: 'b_drain',    zone: 'z12', name: 'The Drain Shaft',      ux: 0, uy: 4, uw: 1, uh: 2, tint: '70,150,140' },
  { id: 'b_pump',     zone: 'z12', name: 'The Pump Room',        ux: 1, uy: 4, uw: 2, uh: 1, tint: '90,160,150' },
  { id: 'b_tunnel',   zone: 'z12', name: 'The Batting Tunnels',  ux: 1, uy: 5, uw: 2, uh: 1, tint: '80,140,150' },
  { id: 'b_arches',   zone: 'z12', name: 'The Mossy Arches',     ux: 3, uy: 5, uw: 2, uh: 1, tint: '90,170,110' },
  { id: 'b_glow',     zone: 'z12', name: 'The Glowpools',        ux: 3, uy: 4, uw: 2, uh: 1, tint: '60,210,190' },
  { id: 'b_locks',    zone: 'z12', name: 'The Floodgate Locks',  ux: 5, uy: 4, uw: 1, uh: 3, tint: '70,130,170' },
  { id: 'b_mound',    zone: 'z12', name: 'The Pitcher\'s Mound', ux: 6, uy: 5, uw: 2, uh: 1, tint: '200,190,90' },
  { id: 'b_dugout',   zone: 'z12', name: 'The Flooded Dugout',   ux: 3, uy: 6, uw: 2, uh: 1, tint: '110,150,130' },
  { id: 'b_cistern',  zone: 'z12', name: 'The Old Cistern',      ux: 1, uy: 6, uw: 2, uh: 1, tint: '70,120,140' },
  { id: 'b_vault',    zone: 'z12', name: 'The Rain Delay',       ux: 0, uy: 6, uw: 1, uh: 1, tint: '120,180,200', secret: true },
];
const ROOM = {};
ROOMS.forEach((r, i) => {
  r.i = i; ROOM[r.id] = r;
  r.x0 = r.ux * UW; r.y0 = r.uy * UH; r.tw = r.uw * UW; r.th = r.uh * UH;
  r.px = { x: r.x0 * TILE, y: r.y0 * TILE, w: r.tw * TILE, h: r.th * TILE };
});
const LINKS = [['q_mouth', 'q_shaft'], ['q_shaft', 'q_lars'], ['q_shaft', 'q_rails'], ['q_shaft', 'q_crystal'], ['q_rails', 'q_falls'], ['q_crystal', 'q_elevator'],
  ['v_intake', 'v_chase'], ['v_chase', 'v_turbine'], ['f_floor', 'f_fuse'], ['f_fuse', 'f_core'], ['v_turbine', 'v_shaft'], ['f_fuse', 'f_run'],
  ['q_mouth', 'b_drain'], ['b_drain', 'b_pump'], ['b_drain', 'b_tunnel'], ['b_tunnel', 'b_arches'], ['b_arches', 'b_glow'], ['b_arches', 'b_dugout'], ['b_arches', 'b_locks'],
  ['b_glow', 'b_locks'], ['b_locks', 'b_mound'], ['b_locks', 'b_dugout'], ['b_dugout', 'b_cistern'], ['b_cistern', 'b_vault']];
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
    { pos: T(8, 131), room: 'b_drain' }, { pos: T(160, 153), room: 'b_dugout' },          // the Sunken Bullpen
  ],
  bells: { z2: { pos: T(8, 83), room: 'q_mouth' }, z3: { pos: T(634, 20), room: 'v_chase' }, z4: { pos: T(697, 42), room: 'f_floor' }, z12: { pos: T(150, 153), room: 'b_dugout' } },
  arriveZ1: T(4, 83),
  exitZ1: R(0, 77, 2, 6),
  lars: T(47, 65), vein: R(41, 57, 2, 8),
  reshman: T(233, 65),
  // Reshman the map-maker hides in a corner of every zone
  reshmen: { z2: { pos: T(233, 65), room: 'q_falls' }, z3: { pos: T(644, 42), room: 'v_turbine' }, z4: { pos: T(685, 42), room: 'f_floor' }, z12: { pos: T(50, 104), room: 'b_pump' } },
  sparkFall: { x: 226 * TILE, y0: 47 * TILE, y1: 65 * TILE },
  adam: T(226, 43), adamLock: { tx: 200, ty: 37, w: 1, h: 6 }, adamTrigger: 210 * TILE,
  liftQ: R(232, 37, 6, 6), liftV: R(283, 59, 6, 6),
  arriveV: T(286, 65), arriveQ: T(234, 43),
  blueprint: T(704, 42),
  daniel: T(834, 14), cannonMouth: { x: 829 * TILE, y: 12.6 * TILE }, danielLock: { tx: 800, ty: 16, w: 1, h: 5 }, danielTrigger: 806 * TILE,
  danielFloor: T(824, 21),
  // Phase 4: a golden lift hidden behind Big Bertha → the Grand Concourse
  liftC: R(835, 8, 4, 6), arriveC: T(836, 14),
  // the Sunken Bullpen: Coach Maya on her mound, and the door that shuts behind you
  maya: T(281, 129), mayaLock: { tx: 239, ty: 116, w: 2, h: 5 }, mayaTrigger: 253 * TILE,
};

/* ---------- Geometry ---------- */
function buildAct() {
  LW = 840; LH = 154; grid = new Uint8Array(LW * LH).fill(1);
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

  /* === Zone 2½ · The Sunken Bullpen (rows 88-153, under the Quarry Mouth) === */
  // The Drain Shaft: drop through the cracked Quarry Mouth floor (rows 83-87 blow open)
  carve(34, 88, 4, 1);
  carve(1, 89, 38, 42);                                                   // rows 89-130; floor 131
  { const cols = [2, 11, 20, 29], pat = [0, 1, 2, 3, 2, 1]; for (let i = 0, row = 128; row >= 101; i++, row -= 3) fill(cols[pat[i % 6]], row, 6, 1, 3); }
  fill(30, 97, 8, 1, 3); fill(31, 93, 7, 1, 3); fill(36, 90, 2, 1, 3);    // the last steps up to the crack (act/bullpen.js adds one more inside it)
  fill(32, 104, 7, 1, 3);                                                 // the ledge by the Pump Room door
  fill(33, 128, 6, 3, 1);                                                 // the step by the tunnel door (top 128)
  carve(38, 99, 4, 5);                                                    // → the Pump Room
  carve(38, 123, 4, 5);                                                   // → the Batting Tunnels

  // The Pump Room: Reshman's dry corner, the pump pool, and the armoured vault
  carve(41, 89, 78, 20);                                                  // rows 89-108; floor 109
  fill(41, 104, 25, 5, 1);                                                // west bank (top 104)
  fill(96, 104, 23, 5, 1);                                                // east bank (top 104)
  fill(72, 100, 5, 1, 3); fill(84, 100, 5, 1, 3);                         // planks over the pump pool (x66-95)
  fill(108, 89, 11, 7, 1);                                                // vault roof; the vault gate is x108-109 rows 96-103

  // The Batting Tunnels: a low brick ceiling and the first flooded lane
  carve(41, 111, 78, 20);                                                 // rows 111-130; floor 131
  fill(41, 111, 78, 5, 1);                                                // the low ceiling (rows 111-115)
  fill(41, 128, 29, 3, 1);                                                // west bank (top 128)
  fill(101, 128, 18, 3, 1);                                               // east bank (top 128); the lane x70-100 drains to the floor
  carve(118, 123, 4, 5);                                                  // → the Mossy Arches

  // The Mossy Arches: pillar-hop over the long pool
  carve(121, 111, 78, 20);                                                // rows 111-130; floor 131
  fill(121, 128, 10, 3, 1); fill(186, 128, 13, 3, 1);                     // west & east landings (top 128)
  fill(136, 125, 3, 6, 1); fill(145, 122, 3, 9, 1); fill(154, 119, 3, 12, 1);
  fill(163, 122, 3, 9, 1); fill(172, 125, 3, 6, 1); fill(180, 126, 3, 5, 1);
  fill(151, 115, 9, 1, 3);                                                // moss ledge under the hole to the Glowpools
  carve(192, 128, 4, 5);                                                  // ↓ the Flooded Dugout
  carve(198, 123, 4, 5);                                                  // → the Floodgate Locks

  // The Glowpools (dark; the pools light the way)
  carve(121, 89, 78, 20);                                                 // rows 89-108; floor 109
  fill(121, 105, 78, 4, 1);                                               // the cave floor (top 105)
  carve(130, 105, 12, 4); carve(166, 105, 15, 4);                         // two glowing pools
  fill(134, 101, 4, 1, 3); fill(170, 101, 4, 1, 3); fill(175, 98, 3, 1, 3);   // lily pads
  carve(152, 105, 5, 6); fill(152, 110, 2, 1, 3);                         // ↓ the hole to the Mossy Arches, a foothold inside it
  carve(198, 100, 4, 5);                                                  // → the Floodgate Locks

  // The Floodgate Locks: one tall lock; the bottom floods and drains on a cycle
  carve(201, 89, 38, 64);                                                 // rows 89-152; floor 153
  fill(201, 105, 7, 1, 1); fill(201, 128, 6, 1, 1); fill(233, 121, 6, 1, 1);   // landings: Glowpools door · Arches door · Mound door
  fill(209, 109, 5, 1, 3); fill(217, 113, 5, 1, 3); fill(226, 117, 5, 1, 3);   // down from the Glowpools
  fill(210, 125, 5, 1, 3); fill(219, 121, 5, 1, 3);                       // up from the Arches
  fill(207, 149, 5, 1, 3); fill(216, 145, 5, 1, 3); fill(225, 141, 5, 1, 3);   // the tidal climb from the bottom
  fill(232, 137, 5, 1, 3); fill(222, 133, 5, 1, 3); fill(213, 129, 5, 1, 3);
  carve(238, 116, 4, 5);                                                  // → the Pitcher's Mound
  markUnsafe(201, 132, 38, 22);                                           // never save a respawn point below the high-water line

  // The Pitcher's Mound (Coach Maya)
  carve(241, 111, 78, 20);                                                // rows 111-130; floor 131
  fill(241, 121, 8, 10, 1);                                               // the bullpen gate ledge (top 121)
  fill(276, 129, 10, 2, 1);                                               // the mound (top 129)
  fill(251, 126, 5, 1, 3); fill(305, 126, 5, 1, 3);                       // catwalks

  // The Old Cistern: the second flooded lane
  carve(41, 133, 78, 20);                                                 // rows 133-152; floor 153
  fill(41, 150, 17, 3, 1); fill(104, 150, 15, 3, 1);                      // west & east banks (top 150); the lane x58-103 drains to the floor

  // The Flooded Dugout: bench, call bell and the climb back up to the Arches
  carve(121, 133, 78, 20);                                                // rows 133-152; floor 153
  fill(196, 149, 3, 1, 3); fill(189, 145, 4, 1, 3); fill(196, 141, 3, 1, 3); fill(189, 137, 4, 1, 3); fill(193, 133, 3, 1, 3);
  fill(126, 149, 9, 1, 3);                                                // the old bat-rack shelf
  carve(118, 147, 4, 6);                                                  // ← the Old Cistern
  carve(198, 147, 4, 6);                                                  // → the Floodgate Locks (Floodgate B, x199-200)

  // The Rain Delay (secret, behind the cracked west wall of the Cistern)
  carve(1, 133, 38, 20); fill(1, 150, 38, 3, 1);                          // rows 133-149, floor top 150

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
  { id: 'b_glow', room: 'b_glow', ...T(176, 98) }, { id: 'b_cistern', room: 'b_cistern', ...T(45, 150) }, { id: 'b_pump', room: 'b_pump', ...T(115, 104) },
];
const BREAKS = [{ id: 'q_falls', room: 'q_falls', tx: 205, ty: 60, w: 2, h: 5 }, { id: 'f_core', room: 'f_core', tx: 836, ty: 7, w: 3, h: 7 },
  // gauntlet entrances: the Turbine Hall floor behind the fan, the Fuse Tower's back wall
  { id: 'v_shaft', room: 'v_turbine', tx: 659, ty: 42, w: 3, h: 2 }, { id: 'f_run', room: 'f_fuse', tx: 799, ty: 37, w: 2, h: 5 },
  // the Sunken Bullpen: the cracked Quarry Mouth floor, and the Cistern's west wall
  { id: 'q_floor', room: 'q_mouth', tx: 34, ty: 83, w: 4, h: 5 }, { id: 'b_vault', room: 'b_cistern', tx: 39, ty: 146, w: 2, h: 4 }];
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
  // the Sunken Bullpen ('catcher' is the masked Catcher Bot from act/bullpen.js)
  b_drain: [{ k: 'drone', x: 20 * TILE, y: 112 * TILE }],
  b_pump: [{ k: 'hopper', ...T(58, 104) }, { k: 'catcher', ...T(102, 104), dir: -1 }, { k: 'crate', id: 'b_pump', ...T(112, 104), bolts: 30 }],
  b_tunnel: [{ k: 'tick', tx: 80, ty: 116, surf: 'up' }, { k: 'tick', tx: 112, ty: 116, surf: 'up' }],
  b_arches: [{ k: 'tick', tx: 146, ty: 121, surf: 'down' }, { k: 'drone', x: 150 * TILE, y: 117 * TILE }, { k: 'drone', x: 178 * TILE, y: 119 * TILE }],
  b_glow: [{ k: 'hopper', ...T(160, 105) }, { k: 'drone', x: 188 * TILE, y: 96 * TILE }],
  b_locks: [{ k: 'drone', x: 220 * TILE, y: 100 * TILE }],
  b_mound: [],
  b_dugout: [{ k: 'catcher', ...T(140, 153), dir: 1 }, { k: 'mole', x0: 168, x1: 183, row: 153 }, { k: 'crate', id: 'b_dugout', ...T(124, 153), bolts: 15 }],
  b_cistern: [{ k: 'tick', tx: 80, ty: 133, surf: 'up' }, { k: 'drone', x: 90 * TILE, y: 140 * TILE }],
  b_vault: [{ k: 'crate', id: 'b_vault', ...T(20, 150), bolts: 60 }],
};
