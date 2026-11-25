// Maps and tuning shared across the game. The hero roster lives in heroes.js.
export { HEROES } from './heroes.js';


export const DIFFICULTY = {
  easy:   { label: 'Rookie', aimErr: 0.09, turn: 3.2, react: 0.7, fireCone: 0.12 },
  normal: { label: 'Regular', aimErr: 0.05, turn: 5.0, react: 0.4, fireCone: 0.08 },
  hard:   { label: 'Veteran', aimErr: 0.025, turn: 8.0, react: 0.2, fireCone: 0.05 },
};

export const TUNING = {
  gravity: 24, jump: 8.2, radius: 0.45, eye: 1.6, step: 0.35,
  respawn: 6, waveEvery: 20, firstWave: 4, minionsPerWave: 4,
  towerHp: 1050, coreHp: 1700, towerRange: 18, towerDmg: 20, towerRate: 1.4,
  minionHp: 70, minionDmg: 9, minionRange: 7, minionSpeed: 4.2,
  fountainHeal: 45,
  // Lane Breaker rounds: at overtime both cores lose their shield and take double damage;
  // at the time limit the team whose core has more health left wins
  overtime: 300, laneLimit: 420,
};

// Map notes: blue base is at -z, red base at +z. Blocks and towers are listed for the
// blue half only; the red half is the point mirror (x -> -x, z -> -z). Lanes are listed in full.
// Block: [x, z, width, depth, height]
export const MAPS = [
  {
    id: 'plaza', theme: 'plaza', name: 'Solmare Piazza', lanesLabel: '1 lane · seaside town',
    desc: 'A whitewashed harbour square at golden hour. One straight lane, lots of low cover, fast fights.',
    W: 22, L: 62, accent: 0xd9734e,
    hills: [[0, 0], [0, -24], [0, 0], [0, 24]], duel: [0, -26],
    lanes: [[[0, -50], [0, 50]]],
    towers: [[3, -32]],
    blocks: [
      [-7, -22, 4, 1.6, 1.15], [7, -24, 4, 1.6, 1.15], [-5, -14, 5, 1.4, 2.6],
      [-14, -9, 3, 9, 4], [10, 0, 3, 6, 3], [-6, -4, 2.2, 2.2, 1.3],
      [6, -40, 3, 3, 3.2], [-6, -44, 3, 3, 3.2], [-15, -30, 4, 4, 1.2], [15, -18, 3, 3, 2],
    ],
  },
  {
    id: 'canals', theme: 'canals', name: 'Lantern Canals', lanesLabel: '2 lanes · canal city',
    desc: 'Gabled houses, bikes and tulips. Two lanes split by a canal wall. Wade the water to rotate.',
    W: 34, L: 66, accent: 0x4f9fc0,
    hills: [[-18, 0], [18, 0]], duel: [-18, -28],
    lanes: [
      [[0, -54], [-18, -44], [-18, 44], [0, 54]],
      [[0, -54], [18, -44], [18, 44], [0, 54]],
    ],
    towers: [[-21, -32], [21, -32]],
    blocks: [
      [0, -28, 3, 18, 4.5], [0, 0, 3, 10, 4.5],
      [-22, -20, 4, 1.5, 1.2], [-25, -12, 2, 7, 3], [-11, -8, 2, 5, 2.4], [-14, -6, 2.4, 2.4, 1.3],
      [14, -14, 4, 1.5, 1.2], [26, -24, 2, 6, 3], [11, -20, 2, 4, 2.4],
      [-9, -42, 4, 3, 2.5], [9, -40, 4, 3, 2.5],
    ],
  },
  {
    id: 'terraces', theme: 'terraces', name: 'Mossgarden Ruins', lanesLabel: '3 lanes · mountain temple',
    desc: 'An overgrown temple under cherry blossoms. Three lanes with a raised jungle in between.',
    W: 44, L: 72, accent: 0xe98aa6,
    hills: [[0, 0], [-30, 0], [0, 0], [30, 0]], duel: [0, -30],
    lanes: [
      [[0, -60], [0, 60]],
      [[0, -60], [-30, -48], [-30, 48], [0, 60]],
      [[0, -60], [30, -48], [30, 48], [0, 60]],
    ],
    towers: [[3, -38], [-33, -34], [33, -34]],
    blocks: [
      [-15, -26, 7, 12, 1.2], [15, -14, 7, 12, 1.2], [-15, -26, 2.5, 2.5, 3.6], [15, -14, 2.5, 2.5, 3.6],
      [-15, -6, 8, 2, 4], [15, -34, 8, 2, 4],
      [7, -22, 5, 1.5, 1.2], [-4, -10, 2, 2, 2.2], [4, -6, 2, 2, 2.2],
      [-34, -18, 4, 1.5, 1.2], [-36, -8, 2, 6, 3], [26, -20, 4, 1.5, 1.2], [37, -28, 2, 6, 3],
      [-8, -48, 4, 3, 3], [8, -50, 4, 3, 3], [-23, 0, 3, 3, 2],
    ],
  },
];

// ---------- Hill Rush ----------
// 3v3 on the lane stages, no towers or minions. Stand in the ring alone to score;
// the ring hops to the next spot in map.hills every `rotate` seconds.
export const HILL = {
  target: 100, rate: 1, extra: 0.25, radius: 6.5, rotate: 50, warn: 10,
  respawn: 5, spawnHaste: { dur: 4, speed: 1.45 },
};

// ---------- Survivor ----------
// A big open island. Blocks are generated (seeded) on the -z half and point-mirrored like the
// lane maps: ruined houses with doorways, crates, pillars and jumpable platforms.
function islandBlocks() {
  let s = 1337;
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const out = [];
  const ruin = (cx, cz, w, d) => {
    const t = 0.6, h = 3.2, door = 2.4;
    const side = Math.floor(r() * 4);
    const walls = [[cx, cz - d / 2, w, t], [cx, cz + d / 2, w, t], [cx - w / 2, cz, t, d], [cx + w / 2, cz, t, d]];
    walls.forEach(([x, z, ww, dd], i) => {
      if (i !== side && r() < 0.85) { out.push([x, z, ww, dd, h]); return; }
      // wall with a doorway: two stubs
      if (ww > dd) { const seg = (ww - door) / 2; out.push([x - door / 2 - seg / 2, z, seg, dd, h], [x + door / 2 + seg / 2, z, seg, dd, h]); }
      else { const seg = (dd - door) / 2; out.push([x, z - door / 2 - seg / 2, ww, seg, h], [x, z + door / 2 + seg / 2, ww, seg, h]); }
    });
    out.push([cx + (r() - 0.5) * w * 0.4, cz + (r() - 0.5) * d * 0.4, 1.4, 1.4, 1.1]);   // crate inside
  };
  const spots = [[-48, -52], [-12, -60], [30, -50], [55, -22], [-58, -14], [-24, -30], [14, -24], [44, -64]];
  for (const [x, z] of spots) ruin(x, z, 8 + r() * 4, 8 + r() * 4);
  for (let i = 0; i < 26; i++) {
    const x = (r() * 2 - 1) * 72, z = -6 - r() * 66, big = r() < 0.35;
    out.push([x, z, 1.6 + r() * 2.2, 1.6 + r() * 2.2, big ? 2.4 : 1.15]);
  }
  for (let i = 0; i < 6; i++) out.push([(r() * 2 - 1) * 66, -10 - r() * 60, 1.6, 1.6, 6]);              // pillars
  for (let i = 0; i < 5; i++) out.push([(r() * 2 - 1) * 60, -14 - r() * 54, 6 + r() * 3, 6 + r() * 3, 1.2]); // platforms
  out.push([0, 0, 10, 10, 1.2], [0, 0, 4, 4, 2.4]);                                                      // centre stage
  return out;
}

export const SURVIVOR_MAP = {
  id: 'island', theme: 'terraces', survivor: true, name: 'Maxx Island', lanesLabel: 'Free for all',
  desc: 'Twelve drop in. One walks out.',
  W: 80, L: 80, accent: 0x9b5cff, propScale: 3,
  lanes: [], towers: [],
  blocks: islandBlocks(),
};

export const SURVIVOR = {
  players: 12,
  dropHeight: 48, glideFall: 7,
  // storm phases: wait, then shrink over `shrink` seconds to `r` (fraction of start radius); dps outside
  phases: [
    { wait: 40, shrink: 20, r: 0.62, dps: 2 },
    { wait: 30, shrink: 18, r: 0.38, dps: 4 },
    { wait: 25, shrink: 15, r: 0.2, dps: 7 },
    { wait: 20, shrink: 12, r: 0.08, dps: 11 },
    { wait: 15, shrink: 12, r: 0.0, dps: 16 },
  ],
  loot: 70,
  lootTypes: [
    { id: 'health', w: 35, label: '+60 Health', color: 0xff5a5a },
    { id: 'shield', w: 30, label: '+50 Shield', color: 0x4fb4ff },
    { id: 'power', w: 20, label: 'Power up', color: 0xffc93c },
    { id: 'ult', w: 15, label: '+50% Ultimate', color: 0xb98cff },
  ],
};

// ---------- Duel (online 1v1) ----------
// Round based: a round ends on the first knockout, first to `toWin` rounds takes the duel.
export const DUEL = { toWin: 3, breakT: 3.5 };
