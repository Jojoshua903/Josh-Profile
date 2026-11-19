'use strict';
/* =========================================================
   ZONE 1 · THE SCRAPYARD DUGOUT — world layout
   One big tile grid; each room is a rectangle the camera locks to.
   Map units: 1 unit = 40 × 22 tiles.
   ========================================================= */
const UW = 40, UH = 22;
const ROOMS = [
  { id: 'crash',  name: 'The Crash Site',     ux: 0, uy: 2, uw: 1, uh: 1 },
  { id: 'climb',  name: 'The Bleacher Climb', ux: 1, uy: 1, uw: 1, uh: 2 },
  { id: 'pipes',  name: 'The Coolant Pipes',  ux: 2, uy: 1, uw: 2, uh: 1 },
  { id: 'alley',  name: 'The Dark Alley',     ux: 3, uy: 0, uw: 1, uh: 1, dark: true },
  { id: 'server', name: 'The Server Pit',     ux: 4, uy: 1, uw: 1, uh: 1 },
  { id: 'hub',    name: 'Base Camp',          ux: 2, uy: 2, uw: 5, uh: 1 },
  { id: 'cellar', name: 'The Old Cellar',     ux: 0, uy: 3, uw: 1, uh: 1, secret: true },
  { id: 'g_pit',  name: 'The Scrapyard Pit',  ux: 6, uy: 3, uw: 1, uh: 1, secret: true },   // gauntlet (zone/gauntlets.js)
];
const ROOM = {};
ROOMS.forEach((r, i) => {
  r.i = i; ROOM[r.id] = r;
  r.x0 = r.ux * UW; r.y0 = r.uy * UH; r.tw = r.uw * UW; r.th = r.uh * UH;
  r.px = { x: r.x0 * TILE, y: r.y0 * TILE, w: r.tw * TILE, h: r.th * TILE };
});
// door connections (used by the map to outline unexplored neighbours)
const LINKS = [['crash', 'climb'], ['climb', 'pipes'], ['pipes', 'alley'], ['pipes', 'server'], ['server', 'hub'], ['hub', 'climb'], ['crash', 'cellar'], ['hub', 'g_pit']];

function roomAt(px, py) {
  for (const r of ROOMS) if (px >= r.px.x && px < r.px.x + r.px.w && py >= r.px.y && py < r.px.y + r.px.h) return r;
  return null;
}
const T = (tx, row) => ({ x: tx * TILE + TILE / 2, y: row * TILE });   // tile column + surface row → feet position

/* ---------- Geometry ---------- */
const Z = {
  gate:      { x: 81 * TILE, y: 58 * TILE, w: TILE, h: 4 * TILE },          // hub → tunnel shortcut gate
  bossDoor:  { tx: 159, ty: 36, w: 2, h: 5 },
  bossHole:  { tx: 163, ty: 41, w: 4, h: 4 },
  cracked:   { x: 10 * TILE, y: 62 * TILE, w: 2 * TILE, h: TILE },          // blown open by Explosive Baseballs → the cellar
  jumbo:     { x: 15 * TILE, y: 46 * TILE, w: 13 * TILE, h: 7 * TILE },
  exitZone2: { x: 275 * TILE, y: 55 * TILE, w: 4 * TILE, h: 7 * TILE },
  bench:     [T(17, 62), T(150, 62), T(248, 62)],      // the third sits beside the Scrapyard Pit hatch
  benchRoom: ['crash', 'hub', 'hub'],
  spawn:     T(5, 59),
  workbench: T(104, 62),                    // the fold-out tech table under the bus awning
  reshman:   T(123, 21),
  bossPos:   T(180, 41),
  // Phase 3 · Base Camp regulars + the backtrack secret
  bell:      T(85, 62),                    // the Caravan Bay bell; the Dugout Express parks to its right
  lars:      T(208, 62),
  cats:      [T(215, 62), T(217, 62)],
  daniel:    T(177, 62),
  fromZone2: T(272, 62),
  spareBat:  T(30, 76),
  // Phase 4 · Act II bosses who move into Base Camp
  fionn:     T(191, 57),
  milo:      T(118, 62),
  deniz:     T(95, 57),                     // a deck chair on the Dugout Express roof
};
/* Base Camp, laid out like a Silksong hub (tile columns, floor surface row 62):
   · Left Wing   82-125  · the Caravan Bay: the bell, the Dugout Express (89-105), Renas at its bumper,
                           Josh's table under its awning, a crate + lamppost, Milo · up top: Deniz on the bus roof
   · Courtyard  126-170  · the bench alone under its spotlight, the locker and the clipboard on
                           the back wall either side; Reshman's nook under the floor grate
   · Right Wing 171-220  · Daniel's stall, Immanuel, Lars by the campfire with the cats
                           upstairs: Monfort's lookout with Fionn (row 57, up the crate)
   · past it    221-278  · the batting cage, the Scrapyard Pit hatch, the chasm to Zone 2 */
const CAMP = {
  balconyL: { tx: 89, w: 17, row: 57, bus: true }, stepL: { tx: 108, w: 2 },   // the left "balcony" is the bus roof
  balconyR: { tx: 186, w: 16, row: 57 }, stepR: { tx: 188, w: 2 },
  grate: { tx: 126, w: 2 }, nook: { tx: 124, w: 12 },          // the nook is rows 63-64, its floor is row 65
  campfire: T(212, 62), lamppost: T(108, 60), bus: { x0: 89, x1: 106, floor: 62 },
};
// Lucky Pebbles hidden in Zone 1 (6 of the 50)
const PEBBLES = [
  { id: 'z1_crash', room: 'crash', ...T(35, 55) }, { id: 'z1_climb', room: 'climb', ...T(64, 31) },
  { id: 'z1_alley', room: 'alley', ...T(129, 19) }, { id: 'z1_server', room: 'server', ...T(189, 35) },
  { id: 'z1_cellar', room: 'cellar', ...T(12, 73) }, { id: 'z1_hub', room: 'hub', ...T(134, 65) },
];

function buildZone() {
  LW = 280; LH = 88; grid = new Uint8Array(LW * LH).fill(1);
  const carve = (x, y, w, h) => fill(x, y, w, h, 0);

  // R1 · Crash Site
  carve(1, 45, 38, 17);
  fill(3, 59, 6, 3, 1);                      // pile of broken bleachers (wake-up spot)
  fill(14, 60, 2, 2, 1); fill(20, 59, 3, 3, 1); fill(26, 58, 2, 4, 1);   // crates
  fill(30, 55, 9, 3, 1);                     // ledge with tunnel underneath
  carve(38, 50, 4, 5);                       // door → Bleacher Climb
  carve(38, 58, 4, 4);                       // tunnel → (gate) → Base Camp

  // R2 · Bleacher Climb
  carve(41, 23, 38, 39);
  fill(41, 55, 38, 3, 1);                    // spike-pit floor / tunnel ceiling
  fill(47, 54, 32, 1, 2);                    // rusted spikes
  fill(48, 52, 4, 1, 3); fill(43, 49, 4, 1, 3); fill(48, 46, 4, 1, 3);   // stacked stadium seats
  fill(70, 44, 9, 2, 1);                     // landing ledge
  fill(72, 26, 2, 14, 1);                    // chimney pillar (wall-jump)
  fill(77, 32, 2, 1, 1);                     // exit lip
  fill(60, 31, 6, 1, 3);                     // high bonus perch
  carve(78, 27, 4, 5);                       // door → Coolant Pipes
  carve(78, 58, 4, 4);                       // tunnel → hub
  fill(81, 58, 1, 4, 1);                     // the shortcut gate (opened from the hub side)

  // R3 · Coolant Pipes
  carve(81, 23, 78, 18);
  fill(81, 32, 8, 9, 1);                     // entry block
  fill(91, 38, 4, 1, 3); fill(89, 35, 3, 1, 3);                         // steps back up
  fill(98, 36, 6, 1, 3); fill(108, 33, 8, 1, 3); fill(120, 36, 6, 1, 3); // pipe platforms
  fill(116, 38, 3, 3, 1);                    // pipe stack
  fill(140, 38, 4, 1, 3); fill(145, 35, 4, 1, 3); fill(140, 32, 4, 1, 3); fill(145, 29, 4, 1, 3); fill(150, 26, 4, 1, 3);
  carve(150, 21, 4, 2);                      // hatch up to the Dark Alley
  fill(150, 23, 4, 1, 3); fill(150, 21, 4, 1, 3);
  carve(158, 36, 4, 5);                      // door → Server Pit

  // R4 · Dark Alley
  carve(121, 1, 38, 20);
  fill(150, 21, 4, 1, 3);
  fill(128, 19, 3, 2, 1); fill(138, 18, 2, 3, 1); fill(144, 15, 4, 1, 3);

  // R5 · Server Pit
  carve(161, 23, 38, 18);
  fill(163, 38, 4, 1, 3); fill(166, 35, 7, 1, 3);
  fill(193, 38, 4, 1, 3); fill(186, 35, 7, 1, 3);

  // R6 · Base Camp + the chasm to Zone 2
  carve(81, 45, 198, 17);
  fill(81, 58, 1, 4, 1);                     // gate (re-assert)
  for (const s of [CAMP.stepL, CAMP.stepR]) fill(s.tx, 60, s.w, 2, 1);                 // crates to climb onto
  for (const b of [CAMP.balconyL, CAMP.balconyR]) fill(b.tx, b.row, b.w, 1, 3);        // scrap scaffolding decks
  carve(CAMP.nook.tx, 63, CAMP.nook.w, 2); fill(CAMP.grate.tx, 62, CAMP.grate.w, 1, 3); // Reshman's nook, under a drop-through grate
  carve(252, 62, 16, 3); fill(252, 64, 16, 1, 2);   // the chasm

  // R7 · The Old Cellar (sealed until the cracked floorboards are blown open)
  carve(1, 67, 34, 12);
  fill(6, 70, 8, 1, 3);                              // landing ledge under the boards (wall-jump / launch back up the hole)
  fill(10, 73, 4, 1, 3); fill(3, 76, 4, 1, 3);       // rickety shelves
  fill(17, 77, 3, 2, 1); fill(20, 75, 2, 4, 1);      // old crates
  fill(26, 76, 8, 3, 1);                             // the equipment rack with the Spare Bat

  // R8 · The Scrapyard Pit (gauntlet): a steel cage under the far end of Base Camp
  carve(244, 64, 2, 3);                              // shaft under the rusted hatch (rows 62-63 blow open)
  carve(241, 67, 38, 18);                            // the cage floor is row 85
  [[82, 246], [79, 251], [76, 246], [73, 251], [70, 244]].forEach(([row, x]) => fill(x, row, 5, 1, 3));   // scaffold back up to the hatch
}
// the blast hole from the Crash Site down into the cellar
function openCellar() { fill(10, 62, 2, 5, 0); }

/* ---------- Dynamic geometry ---------- */
function setBossDoor(closed) { const d = Z.bossDoor; fill(d.tx, d.ty, d.w, d.h, closed ? 1 : 0); }
function openBossHole() { const h = Z.bossHole; fill(h.tx, h.ty, h.w, h.h, 0); }
function openGate() { fill(81, 58, 1, 4, 0); }

/* ---------- Enemy placement per room ---------- */
const SPAWNS = {
  crash: [],
  climb: [{ k: 'orb', x: 55 * TILE + 16, y: 46 * TILE + 16 }, { k: 'orb', x: 59 * TILE + 16, y: 46 * TILE + 16 },
          { k: 'orb', x: 63 * TILE + 16, y: 46 * TILE + 16 }, { k: 'orb', x: 67 * TILE + 16, y: 46 * TILE + 16 },
          { k: 'crate', id: 'perch', ...T(62, 31), bolts: 10 }],
  pipes: [{ k: 'scuttler', ...T(100, 41) }, { k: 'scuttler', ...T(110, 33) }, { k: 'scuttler', ...T(127, 41) },
          { k: 'drone', x: 113 * TILE, y: 29 * TILE }, { k: 'bumper', ...T(133, 41) }],
  alley: [{ k: 'scuttler', ...T(140, 21) }, { k: 'crate', id: 'alley', ...T(146, 15), bolts: 12 }],
  server: [],
  hub:   [{ k: 'scuttler', ...T(233, 62) }, { k: 'bumper', ...T(250, 62) }, { k: 'drone', x: 238 * TILE, y: 53 * TILE },
          { k: 'crate', id: 'hub', ...T(222, 62), bolts: 8 }],
  cellar: [{ k: 'crate', id: 'cellar', ...T(18, 77), bolts: 15 }],
};

/* the forgotten Little League cellar: banner, trophy cabinet, cobwebs */
function drawCellar() {
  const t = Game.time;
  // dusty light falling through the blast hole
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const lg = ctx.createLinearGradient(0, 67 * TILE, 0, 79 * TILE);
  lg.addColorStop(0, 'rgba(242,193,78,.22)'); lg.addColorStop(1, 'rgba(242,193,78,0)');
  ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(10 * TILE, 67 * TILE); ctx.lineTo(12 * TILE, 67 * TILE); ctx.lineTo(15 * TILE, 79 * TILE); ctx.lineTo(7 * TILE, 79 * TILE); ctx.fill();
  ctx.restore();
  for (let k = 0; k < 10; k++) { const px = 10.5 * TILE + Math.sin(t * 0.4 + k * 2.1) * 60, py = 68 * TILE + ((t * 14 + k * 37) % (10 * TILE)); ctx.fillStyle = 'rgba(243,234,216,.35)'; ctx.fillRect(px, py, 2, 2); }
  // banner
  const bx = 15 * TILE, by = 68 * TILE;
  ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + 220, by); ctx.lineTo(bx + 214, by + 44); ctx.lineTo(bx + 110, by + 52); ctx.lineTo(bx + 6, by + 44); ctx.closePath(); inked('#7a1f2a', 3);
  ctx.font = `20px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = GOLD; ctx.fillText('LITTLE LEAGUE CHAMPS', bx + 110, by + 18);
  ctx.font = `12px ${SERIF_FONT}`; ctx.fillStyle = BONE; ctx.fillText('MVP · #7 · NATHAN', bx + 110, by + 37);
  // trophy cabinet against the back wall
  const cx = 23 * TILE, cy = 79 * TILE;
  rr(cx - 10, cy - 150, 60, 150, 3); inked('#3a2a1e', 3);
  ctx.fillStyle = 'rgba(160,200,230,.12)'; ctx.fillRect(cx - 4, cy - 144, 48, 138);
  for (let s = 0; s < 3; s++) {
    ctx.fillStyle = INK; ctx.fillRect(cx - 6, cy - 100 + s * 46, 52, 3);
    ctx.fillStyle = '#c9a33a'; ctx.beginPath(); ctx.moveTo(cx + 10, cy - 124 + s * 46); ctx.lineTo(cx + 30, cy - 124 + s * 46); ctx.lineTo(cx + 24, cy - 108 + s * 46); ctx.lineTo(cx + 16, cy - 108 + s * 46); ctx.closePath(); ctx.fill();
    ctx.fillRect(cx + 18, cy - 108 + s * 46, 4, 6); ctx.fillRect(cx + 13, cy - 103 + s * 46, 14, 3);
  }
  // cobwebs in the corners
  ctx.strokeStyle = 'rgba(243,234,216,.22)'; ctx.lineWidth = 1;
  for (const [wx, wy, sx] of [[1 * TILE, 67 * TILE, 1], [35 * TILE, 67 * TILE, -1]]) {
    for (let k = 1; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(wx + sx * k * 18, wy); ctx.quadraticCurveTo(wx + sx * k * 12, wy + k * 12, wx, wy + k * 18); ctx.stroke(); }
    for (let k = 0; k < 4; k++) { const a = k / 3 * Math.PI / 2; ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + sx * Math.cos(a) * 60, wy + Math.sin(a) * 60); ctx.stroke(); }
  }
}

/* ---------- Props (drawn by the render hooks) ---------- */
function drawJumbotron(on, flicker) {
  const j = Z.jumbo;
  ctx.save();
  // brackets bolted to the wall
  ctx.fillStyle = '#17121d';
  ctx.fillRect(j.x + 30, j.y - 40, 14, 44); ctx.fillRect(j.x + j.w - 44, j.y - 40, 14, 44);
  ctx.fillRect(j.x + j.w / 2 - 6, j.y + j.h, 12, 60);
  rr(j.x - 10, j.y - 10, j.w + 20, j.h + 20, 6); inked('#2a2230', 4);
  for (let i = 0; i < 6; i++) { ctx.fillStyle = '#4a3d5c'; ctx.beginPath(); ctx.arc(j.x - 2 + i * (j.w + 4) / 5, j.y - 3, 3, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(j.x - 2 + i * (j.w + 4) / 5, j.y + j.h + 3, 3, 0, 7); ctx.fill(); }
  ctx.beginPath(); ctx.rect(j.x, j.y, j.w, j.h); ctx.clip();
  if (on && flicker > 0.15) {
    const g = ctx.createLinearGradient(0, j.y, 0, j.y + j.h);
    g.addColorStop(0, '#2a0f33'); g.addColorStop(1, '#0d0612');
    ctx.fillStyle = g; ctx.fillRect(j.x, j.y, j.w, j.h);
    const cx = j.x + j.w / 2, by = j.y + j.h;
    // floating cursed trophies
    for (let i = -1; i <= 1; i += 2) {
      const tx = cx + i * 120, ty = j.y + 70 + Math.sin(Game.time * 2 + i) * 8;
      ctx.shadowColor = '#b98bff'; ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.moveTo(tx - 20, ty - 22); ctx.lineTo(tx + 20, ty - 22); ctx.quadraticCurveTo(tx + 18, ty + 4, tx, ty + 8); ctx.quadraticCurveTo(tx - 18, ty + 4, tx - 20, ty - 22);
      inked('#c9a33a', 3); ctx.shadowBlur = 0;
      ctx.fillStyle = '#7a1f6e'; ctx.fillRect(tx - 4, ty + 8, 8, 12); ctx.fillRect(tx - 12, ty + 20, 24, 6);
    }
    // Evil Adam: dark silhouette, glowing eyes, racket over the shoulder
    ctx.fillStyle = '#060308';
    ctx.beginPath(); ctx.ellipse(cx, by + 10, 90, 70, 0, Math.PI, 0); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, j.y + 88, 40, 0, 7); ctx.fill();
    ctx.strokeStyle = '#060308'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(cx + 40, by - 20); ctx.lineTo(cx + 78, j.y + 60); ctx.stroke();
    ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(cx + 92, j.y + 40, 22, 30, 0.5, 0, 7); ctx.stroke();
    ctx.shadowColor = '#d9a8ff'; ctx.shadowBlur = 16; ctx.fillStyle = '#e6c8ff';
    ctx.beginPath(); ctx.ellipse(cx - 15, j.y + 84, 9, 3.5, 0.2, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 15, j.y + 84, 9, 3.5, -0.2, 0, 7); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#b98bff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - 14, j.y + 104); ctx.quadraticCurveTo(cx + 2, j.y + 110, cx + 16, j.y + 100); ctx.stroke();
    // scanlines + noise
    ctx.fillStyle = 'rgba(0,0,0,.28)'; for (let y = j.y; y < j.y + j.h; y += 4) ctx.fillRect(j.x, y, j.w, 2);
    ctx.fillStyle = `rgba(185,139,255,${0.05 + Math.random() * 0.06})`; ctx.fillRect(j.x, j.y, j.w, j.h);
  } else {
    ctx.fillStyle = '#0b0a10'; ctx.fillRect(j.x, j.y, j.w, j.h);
    ctx.fillStyle = 'rgba(243,234,216,.04)'; ctx.beginPath(); ctx.moveTo(j.x, j.y); ctx.lineTo(j.x + 140, j.y); ctx.lineTo(j.x + 40, j.y + j.h); ctx.lineTo(j.x, j.y + j.h); ctx.fill();
    if (flicker > 0) { ctx.fillStyle = `rgba(243,234,216,${flicker})`; ctx.fillRect(j.x, j.y + j.h / 2 - 2, j.w, 4); }
  }
  ctx.restore();
}

function drawGate(closedAmount) {
  if (closedAmount <= 0) return;
  const g = Z.gate;
  ctx.save(); ctx.globalAlpha = Math.min(1, closedAmount);
  ctx.translate(0, (1 - closedAmount) * -g.h);
  ctx.fillStyle = '#3a3340';
  for (let i = 0; i < 3; i++) { ctx.fillRect(g.x + 2 + i * 10, g.y, 6, g.h); }
  ctx.fillRect(g.x - 2, g.y + 20, g.w + 4, 6); ctx.fillRect(g.x - 2, g.y + g.h - 30, g.w + 4, 6);
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(g.x - 2, g.y, g.w + 4, g.h);
  ctx.fillStyle = GOLD; ctx.fillRect(g.x + g.w - 2, g.y + g.h / 2 - 6, 8, 12);      // latch on the hub side
  ctx.restore();
}
function drawBars(rect) {
  ctx.fillStyle = '#3a3340'; ctx.strokeStyle = INK; ctx.lineWidth = 3;
  for (let i = 0; i < 4; i++) { ctx.fillRect(rect.x + 4 + i * 15, rect.y, 7, rect.h); ctx.strokeRect(rect.x + 4 + i * 15, rect.y, 7, rect.h); }
  ctx.fillRect(rect.x, rect.y + 12, rect.w, 6);
}
function drawCrackedBoards() {
  const c = Z.cracked;
  ctx.fillStyle = '#6b4a30'; ctx.fillRect(c.x, c.y, c.w, 9);
  ctx.strokeStyle = INK; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(c.x + 8, c.y + 1); ctx.lineTo(c.x + 20, c.y + 6); ctx.lineTo(c.x + 30, c.y + 2); ctx.lineTo(c.x + 44, c.y + 8); ctx.lineTo(c.x + 56, c.y + 3); ctx.stroke();
  ctx.fillStyle = INK; ctx.fillRect(c.x, c.y - 1, c.w, 2);
}
function drawArchway() {
  const e = Z.exitZone2, x = e.x + 60, y = e.y;
  ctx.fillStyle = '#05040a'; rr(x - 20, y + 20, 90, e.h - 20, 30); ctx.fill();
  ctx.strokeStyle = '#4a3d5c'; ctx.lineWidth = 6; ctx.stroke();
  ctx.font = `14px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(243,234,216,.6)';
  ctx.fillText('THE DEEP QUARRY →', x + 25, y + 8);
}
function drawCampfire(x, y) {
  ctx.fillStyle = '#5a3a24'; ctx.fillRect(x - 20, y - 6, 40, 6); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(x - 20, y - 6, 40, 6);
  for (let i = 0; i < 3; i++) {
    const h = 18 + Math.sin(Game.time * 9 + i * 2) * 5, ox = (i - 1) * 8;
    ctx.fillStyle = i === 1 ? GOLD : FLAME;
    ctx.beginPath(); ctx.moveTo(x + ox - 7, y - 6); ctx.quadraticCurveTo(x + ox, y - 6 - h * 1.4, x + ox + 7, y - 6); ctx.fill();
  }
  const g = ctx.createRadialGradient(x, y - 14, 0, x, y - 14, 140);
  g.addColorStop(0, `rgba(255,138,42,${0.22 + Math.sin(Game.time * 7) * 0.03})`); g.addColorStop(1, 'rgba(255,138,42,0)');
  ctx.fillStyle = g; ctx.fillRect(x - 140, y - 150, 280, 200);
}
function drawWorkbench(x, y) {
  rr(x - 36, y - 30, 72, 10, 2); inked('#6b4a30', 3);
  ctx.fillStyle = INK; ctx.fillRect(x - 32, y - 20, 5, 20); ctx.fillRect(x + 27, y - 20, 5, 20);
  rr(x - 26, y - 46, 20, 16, 2); inked('#2d3b4a', 2.5);                       // monitor
  ctx.fillStyle = `rgba(111,211,255,${0.6 + Math.sin(Game.time * 5) * 0.2})`; ctx.fillRect(x - 23, y - 43, 14, 10);
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 8, y - 30); ctx.lineTo(x + 20, y - 44); ctx.stroke();   // lamp arm
  ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(x + 22, y - 46, 4, 0, 7); ctx.fill();
}
/* Base Camp's scaffolding decks, the crates up to them, the lamppost, Deniz's lanterns,
   Fionn's pebble tray and the dark nook under the floor grate */
function drawCampProps() {
  const t = Game.time, D = Save.data;
  // the nook: a shadowed pocket under the boards (drawn over the cut-out tiles)
  const n = CAMP.nook, nx = n.tx * TILE, ny = 63 * TILE, nw = n.w * TILE, nh = 2 * TILE;
  const ng = ctx.createLinearGradient(nx, 0, nx + nw, 0);
  ng.addColorStop(0, 'rgba(5,3,8,.92)'); ng.addColorStop(0.5, 'rgba(12,9,18,.78)'); ng.addColorStop(1, 'rgba(5,3,8,.92)');
  ctx.fillStyle = ng; ctx.fillRect(nx, ny, nw, nh);
  ctx.strokeStyle = 'rgba(243,234,216,.12)'; ctx.lineWidth = 1;
  for (let k = 1; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(nx + nw - k * 14, ny); ctx.quadraticCurveTo(nx + nw - k * 9, ny + k * 9, nx + nw, ny + k * 14); ctx.stroke(); }
  // the drop-through grate
  const gx = CAMP.grate.tx * TILE, gw = CAMP.grate.w * TILE, gy = 62 * TILE;
  ctx.fillStyle = '#3a3440'; ctx.fillRect(gx, gy, gw, 6); ctx.fillStyle = INK;
  for (let x = gx + 6; x < gx + gw; x += 9) ctx.fillRect(x, gy, 3, 6);
  ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(gx, gy, gw, 6);
  // scaffolding legs and cross-braces under both decks
  for (const b of [CAMP.balconyL, CAMP.balconyR]) {
    if (b.bus) continue;   // the Dugout Express is its own deck (zone/caravan.js)
    const x0 = b.tx * TILE, x1 = (b.tx + b.w) * TILE, y0 = b.row * TILE + 8, y1 = 62 * TILE;
    ctx.strokeStyle = '#4a3624'; ctx.lineWidth = 6;
    for (const x of [x0 + 10, (x0 + x1) / 2, x1 - 10]) { ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(74,54,36,.7)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x0 + 10, y0 + 6); ctx.lineTo((x0 + x1) / 2, y1 - 10); ctx.lineTo(x1 - 10, y0 + 6); ctx.stroke();
    ctx.fillStyle = '#6b4a30'; ctx.fillRect(x0, b.row * TILE, x1 - x0, 7); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(x0, b.row * TILE, x1 - x0, 7);
    ctx.fillStyle = INK; for (let x = x0 + 14; x < x1; x += 48) { ctx.beginPath(); ctx.arc(x, b.row * TILE + 3.5, 1.6, 0, 7); ctx.fill(); }   // bolts
    ctx.strokeStyle = 'rgba(138,143,153,.8)'; ctx.lineWidth = 2;                                    // a scrap railing
    ctx.beginPath(); ctx.moveTo(x0 + 4, b.row * TILE - 22); ctx.lineTo(x0 + 4, b.row * TILE); ctx.moveTo(x1 - 4, b.row * TILE - 22); ctx.lineTo(x1 - 4, b.row * TILE); ctx.stroke();
  }
  // the climbing crates (solid tiles, dressed as wood)
  for (const s of [CAMP.stepL, CAMP.stepR]) {
    const x = s.tx * TILE, y = 60 * TILE, w = s.w * TILE, h = 2 * TILE;
    rr(x, y, w, h, 2); inked('#7a5436', 2.5);
    ctx.strokeStyle = 'rgba(13,11,16,.55)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + 4, y + 4); ctx.lineTo(x + w - 4, y + h - 4); ctx.moveTo(x + w - 4, y + 4); ctx.lineTo(x + 4, y + h - 4); ctx.stroke();
  }
  // the lamppost on the left crate: splits Renas's bell from Josh's workbench
  const lp = CAMP.lamppost;
  ctx.fillStyle = INK; ctx.fillRect(lp.x - 2, lp.y - 54, 4, 54);
  ctx.fillStyle = `rgba(242,193,78,${0.85 + Math.sin(t * 3) * 0.08})`; ctx.beginPath(); ctx.arc(lp.x, lp.y - 58, 6, 0, 7); ctx.fill();
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const lg = ctx.createRadialGradient(lp.x, lp.y - 58, 0, lp.x, lp.y - 58, 90);
  lg.addColorStop(0, 'rgba(242,193,78,.18)'); lg.addColorStop(1, 'rgba(242,193,78,0)'); ctx.fillStyle = lg; ctx.fillRect(lp.x - 90, lp.y - 148, 180, 180);
  // Deniz's hanging lanterns over the tea deck
  if (D.denizDead) {
    const b = CAMP.balconyL, y = b.row * TILE;
    [[b.tx + 3, '#ff8a4a'], [b.tx + 8, '#f2c14e'], [b.tx + 14, '#ff6aa0']].forEach(([tx, c], k) => {
      const x = tx * TILE + Math.sin(t * 1.4 + k) * 2, ly = y - 70;
      ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = 'rgba(243,234,216,.4)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, y - 110); ctx.lineTo(x, ly - 8); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(x, ly, 7, 9, 0, 0, 7); ctx.fillStyle = c; ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(x, ly, 0, x, ly, 40); g.addColorStop(0, 'rgba(255,170,90,.25)'); g.addColorStop(1, 'rgba(255,170,90,0)');
      ctx.fillStyle = g; ctx.fillRect(x - 40, ly - 40, 80, 80);
    });
  }
  ctx.restore();
  // Fionn's pebble tray on the lookout
  if (D.fionnDead) {
    const px = Z.fionn.x + 44, py = Z.fionn.y;
    rr(px - 16, py - 6, 32, 6, 2); inked('#6b4a30', 2);
    [['#9a948a', -9], ['#c9b48a', -2], ['#7d8a96', 5], ['#b07a5a', 11]].forEach(([c, ox], k) => { ctx.beginPath(); ctx.ellipse(px + ox, py - 9 - (k % 2) * 2, 4, 3, 0, 0, 7); ctx.fillStyle = c; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.stroke(); });
  }
}
function drawNeon(x, y, text, color, t) {
  const on = Math.sin(t * 13) > -0.7 || Math.random() < 0.3;
  if (!on) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, 120);
  g.addColorStop(0, color.replace('A', '.28')); g.addColorStop(1, color.replace('A', '0'));
  ctx.fillStyle = g; ctx.fillRect(x - 120, y - 120, 240, 240);
  ctx.restore();
  ctx.font = `22px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = color.replace('A', '1'); ctx.shadowBlur = 14; ctx.fillStyle = color.replace('A', '1');
  ctx.fillText(text, x, y); ctx.shadowBlur = 0;
}
