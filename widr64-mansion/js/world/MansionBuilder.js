// ==========================================================
// MansionBuilder.js — the whole haunted mansion: 23 rooms over
// three floors (1F, 2F and the B1 basement). Walls are generated
// from the room rectangles, doors sit in any wall, staircases and
// trapdoors link the floors, and a pooled light rig + per-room
// culling keeps the big house running smoothly.
// ==========================================================
import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { CONFIG, ROOM_IDS } from '../config.js';
import { CHARACTERS, PROFESSOR } from '../characters.js';
import {
  makeWoodTexture, makeWallpaperTexture, makeWainscotTexture, makeCheckerTexture, makeRugTexture,
  makeStoneTexture, makeTableclothTexture, makeDoorTexture, makeWindowTexture, makeGlowTexture,
  makePortraitTexture, makeTrappedPaintingTexture, makeLabelTexture, PORTRAIT_NAMES, makeReliefMaps,
} from '../graphics/textures.js';
import {
  buildPortraitFrame, buildChandelier, buildSconce, buildArmchair, buildCurtainCloth, buildBanquetTable, buildDoorLeaf, buildChest,
} from '../graphics/models.js';
import { Furniture, Curtain, Chest, Door, TrappedPainting } from '../entities/Interactable.js';
import {
  H, T, DOOR_H, std, box, glowSprite, repeatTex, M,
  buildTable, buildChair, buildSofa, buildBookshelf, buildClock, buildPlant, buildSideTableVase, buildFireplace,
  buildCandlestick, buildHutch, buildPlate, buildFood, buildStairFlight, buildWindow, buildMoonShaft, buildLockedSign,
} from './props.js';
import { buildWestWing, buildBallroomAndKitchen, buildUpstairs, buildEastWing, buildBasement } from './wings.js';

const R = ROOM_IDS;
const FH = CONFIG.ghost.floatHeight;

// ---------------------------------------------------------------
// FLOOR PLAN (world units; y up; the camera looks from +z toward -z)
// Each floor lives in its own region of the XZ plane; staircases and
// trapdoors carry the hero between them with a fade.
//
//   2F (z -122 … -88)      NURSERY | MASTER BEDROOM | OBSERVATORY
//                          BATH  |   UPPER HALL   |  GUEST ROOM
//
//   1F (z -40 … 22)        LIBRARY | CONSERVATORY | BALLROOM ───────┐
//                     W    STUDY   |   PARLOR     | DINING | KITCHEN
//                     HALL ────────┴── HALLWAY ───┴────────┤ EAST HALL | WASHROOM
//                                     FOYER                │           | STORAGE
//
//   B1 (z 82 … 114)        WINE CELLAR | STAIRWELL | BOILER ROOM
//                                       |  CRYPT   |
// ---------------------------------------------------------------
export const LEVEL_NAMES = { '1F': 'FIRST FLOOR', '2F': 'SECOND FLOOR', B1: 'BASEMENT' };

const wood = (base) => ({ type: 'wood', base });
const checker = (a, b, tiles = 4) => ({ type: 'checker', a, b, tiles });
const stone = (base) => ({ type: 'stone', base });

export const ROOM_DEFS = {
  // ======================= AREA 1 =======================
  [R.FOYER]: {
    name: 'FOYER', level: '1F', area: 1, minX: -10, maxX: 10, minZ: 6, maxZ: 22,
    floor: checker('#ece6d8', '#16141c'), wall: ['#5b1a24', '#c99a4a', 'damask'], wain: '#3a1a0c', lit: 0xffd7a0,
    ghosts: [{ kind: 'gold', x: 0, z: 12.5, tutorial: true }],
    reward: { unlock: ['foyer'], tip: 'Foyer cleared — the lights are back on! The <b>Hallway</b> door is unlocked.' },
  },
  [R.HALLWAY]: {
    name: 'HALLWAY', level: '1F', area: 1, minX: -18, maxX: 20, minZ: 0, maxZ: 6,
    floor: wood('#5a3418'), wall: ['#1f2f55', '#8fa8d8', 'stripe'], wain: '#2a1608', lit: 0xd0dcff,
    ghosts: [], litWith: R.PARLOR,
  },
  [R.PARLOR]: {
    name: 'PARLOR', level: '1F', area: 1, minX: -18, maxX: 0, minZ: -16, maxZ: 0,
    floor: wood('#4a2a14'), wall: ['#173a2a', '#9ad08a', 'floral'], wain: '#2e1a0c', lit: 0xffe2b0,
    ghosts: [{ kind: 'blue', x: -12.5, z: -9 }, { kind: 'pink', x: -5, z: -5.5 }],
    reward: { unlock: ['dining'], key: 'Dining Room', sticker: 'parlor_clear', tip: 'The <b>Dining Room</b> key! Its door is at the east end of the Hallway.' },
  },
  [R.DINING]: {
    name: 'DINING ROOM', level: '1F', area: 1, minX: 0, maxX: 20, minZ: -16, maxZ: 0,
    floor: checker('#e2d2b0', '#4a1a2a'), wall: ['#3a1f4a', '#d6a647', 'damask'], wain: '#2a1208', lit: 0xffd0e8,
    ghosts: [], boss: 'grumbleclaw',
    reward: { unlock: ['westhall'], key: 'West Wing', area: 1, sticker: 'boss_grumbleclaw', tip: 'Grumbleclaw\'s chest held the <b>West Wing</b> key — the door at the west end of the Hallway.' },
  },
  // ======================= AREA 2 — WEST WING =======================
  [R.WEST_HALL]: {
    name: 'WEST HALL', level: '1F', area: 2, minX: -24, maxX: -18, minZ: -36, maxZ: 6,
    floor: wood('#4a2a14'), wall: ['#3a2a1a', '#c9952e', 'diamond'], wain: '#2a1608', lit: 0xffe0b0,
    ghosts: [{ kind: 'green', x: -21, z: -6 }, { kind: 'tosser', x: -21, z: -28 }],
    reward: { tip: 'West Hall cleared. Suits of armour don\'t count as ghosts... probably.' },
  },
  [R.STUDY]: {
    name: 'STUDY', level: '1F', area: 2, minX: -40, maxX: -24, minZ: -14, maxZ: 6,
    floor: wood('#5a3a1a'), wall: ['#2a3a2a', '#c9b27a', 'stripe'], wain: '#2a1a0c', lit: 0xffe8c0,
    ghosts: [], boss: 'patchnotes',
    reward: { unlock: ['library'], key: 'Library', sticker: 'boss_patchnotes', tip: 'Professor Patchnotes left the <b>Library</b> key in his chest — the next door down the West Hall.' },
  },
  [R.LIBRARY]: {
    name: 'LIBRARY', level: '1F', area: 2, minX: -40, maxX: -24, minZ: -36, maxZ: -14,
    floor: wood('#3a2010'), wall: ['#3a1a14', '#d6a647', 'damask'], wain: '#2a1208', lit: 0xffd8a0,
    ghosts: [{ kind: 'blue', x: -32, z: -19 }, { kind: 'tosser', x: -28, z: -31 }, { kind: 'purple', x: -36, z: -25 }],
    reward: { unlock: ['conservatory'], key: 'Conservatory', tip: 'A key was tucked inside a book: the <b>Conservatory</b>! Piano music drifts down the West Hall...' },
  },
  [R.CONSERVATORY]: {
    name: 'CONSERVATORY', level: '1F', area: 2, minX: -18, maxX: 0, minZ: -36, maxZ: -16,
    floor: checker('#e8f0e8', '#2a4a3a'), wall: ['#1a3a3a', '#bfe0d0', 'floral'], wain: '#1a2a1a', lit: 0xd8fff0,
    ghosts: [], boss: 'sonata',
    reward: { portals: ['stairsL', 'stairsR'], area: 2, sticker: 'boss_sonata', tip: 'Madame Sonata\'s final bow! The ghostly barrier on the <b>Foyer stairs</b> has lifted — head upstairs.' },
  },
  // ======================= AREA 3 — SECOND FLOOR =======================
  [R.UPPER_HALL]: {
    name: 'UPPER HALL', level: '2F', area: 3, minX: -14, maxX: 14, minZ: -100, maxZ: -92,
    floor: wood('#5a3418'), wall: ['#4a1a2a', '#e0b060', 'stripe'], wain: '#2a1208', lit: 0xffe0c8,
    ghosts: [{ kind: 'gold', x: -8, z: -96.5 }, { kind: 'white', x: 8, z: -96.5 }],
    reward: { tip: 'Upper Hall cleared. Check the <b>Bathroom</b> (west) and the <b>Guest Room</b> (east).' },
  },
  [R.BATHROOM]: {
    name: 'BATHROOM', level: '2F', area: 3, minX: -26, maxX: -14, minZ: -100, maxZ: -90,
    floor: checker('#f2f6fa', '#3a6aa8', 10), wall: ['#d8e8f0', '#4a7aa8', 'diamond'], wain: '#5a7a9a', lit: 0xe8f4ff,
    ghosts: [{ kind: 'water', x: -20, z: -94 }, { kind: 'white', x: -23, z: -97 }],
    reward: { unlock: ['nursery'], key: 'Nursery', tip: 'The rubber duck coughed up the <b>Nursery</b> key!' },
  },
  [R.GUEST_ROOM]: {
    name: 'GUEST ROOM', level: '2F', area: 3, minX: 14, maxX: 26, minZ: -100, maxZ: -90,
    floor: wood('#6a4020'), wall: ['#3a4a2a', '#d8c890', 'floral'], wain: '#2a2010', lit: 0xfff0d0,
    ghosts: [{ kind: 'pink', x: 19, z: -96 }, { kind: 'tosser', x: 23, z: -93 }],
    reward: { unlock: ['observatory'], key: 'Observatory', tip: 'A starry key from under the pillow: the <b>Observatory</b>, through the Guest Room.' },
  },
  [R.NURSERY]: {
    name: 'NURSERY', level: '2F', area: 3, minX: -26, maxX: -8, minZ: -122, maxZ: -100,
    floor: wood('#9a6a3a'), wall: ['#f5d8e0', '#8ac0e8', 'dots'], wain: '#c8a0b0', lit: 0xffe8f0,
    ghosts: [], boss: 'pip',
    reward: { unlock: ['bedroom'], key: 'Master Bedroom', sticker: 'boss_pip', tip: 'Pixel Pip traded you the <b>Master Bedroom</b> key for a high score. Tiptoe — someone is snoring in there...' },
  },
  [R.OBSERVATORY]: {
    name: 'OBSERVATORY', level: '2F', area: 3, minX: 14, maxX: 30, minZ: -122, maxZ: -100,
    floor: wood('#2a1a10'), wall: ['#0f1a3a', '#ffe68c', 'dots'], wain: '#1a1430', lit: 0xc8d8ff,
    ghosts: [{ kind: 'ice', x: 20, z: -108 }, { kind: 'blue', x: 26, z: -115 }],
    reward: { sticker: 'stargazer', tip: 'The stars align — a shower of treasure from the telescope!' },
  },
  [R.BEDROOM]: {
    name: 'MASTER BEDROOM', level: '2F', area: 3, minX: -8, maxX: 14, minZ: -122, maxZ: -100,
    floor: wood('#4a2a14'), wall: ['#2a1a3a', '#c9952e', 'damask'], wain: '#1a0c14', lit: 0xe0d8ff,
    ghosts: [], boss: 'snoozewell',
    reward: { unlock: ['easthall'], key: 'East Wing', area: 3, sticker: 'boss_snoozewell', tip: 'Lord Snoozewell\'s nightcap hid the <b>East Wing</b> key — the door at the east end of the 1F Hallway.' },
  },
  // ======================= AREA 4 — EAST WING & BASEMENT =======================
  [R.EAST_HALL]: {
    name: 'EAST HALL', level: '1F', area: 4, minX: 20, maxX: 26, minZ: 0, maxZ: 22,
    floor: wood('#4a2a14'), wall: ['#1a2a3a', '#a8c0e0', 'stripe'], wain: '#14202a', lit: 0xd0dcff,
    ghosts: [{ kind: 'green', x: 23, z: 9 }, { kind: 'purple', x: 23, z: 18 }],
    reward: { tip: 'East Hall cleared. The <b>Washroom</b> door is open.' },
  },
  [R.WASHROOM]: {
    name: 'WASHROOM', level: '1F', area: 4, minX: 26, maxX: 36, minZ: 0, maxZ: 10,
    floor: checker('#dfe8ee', '#8aa0b0', 8), wall: ['#c8d8e0', '#6a8aa8', 'dots'], wain: '#6a8aa8', lit: 0xe8f4ff,
    ghosts: [{ kind: 'water', x: 31, z: 5 }, { kind: 'white', x: 33, z: 2.5 }],
    reward: { unlock: ['storage'], key: 'Storage Room', tip: 'A key fell out of the wet laundry: the <b>Storage Room</b>!' },
  },
  [R.STORAGE]: {
    name: 'STORAGE ROOM', level: '1F', area: 4, minX: 26, maxX: 36, minZ: 10, maxZ: 22,
    floor: wood('#3a2a1a'), wall: ['#3a3028', '#7a6a50', 'dots'], wain: '#2a2018', lit: 0xffe0b0,
    ghosts: [{ kind: 'gold', x: 30, z: 18.5 }, { kind: 'tosser', x: 33.5, z: 16 }, { kind: 'purple', x: 29, z: 12.5 }],
    reward: { portals: ['cellar'], tip: 'The ghost holding the <b>trapdoor</b> shut is gone. Down to the basement!' },
  },
  [R.STAIRWELL]: {
    name: 'CELLAR STAIRS', level: 'B1', area: 4, minX: -6, maxX: 6, minZ: 100, maxZ: 110,
    floor: stone('#4a4650'), wall: ['#5a5460', '#000000', 'stone'], wain: null, lit: 0xffd8a0,
    ghosts: [{ kind: 'white', x: -2.5, z: 106 }],
    reward: { tip: 'The cellar stairs are safe. The <b>Wine Cellar</b> is to the west.' },
  },
  [R.WINE_CELLAR]: {
    name: 'WINE CELLAR', level: 'B1', area: 4, minX: -26, maxX: -6, minZ: 94, maxZ: 114,
    floor: stone('#4a3a34'), wall: ['#5a4a40', '#000000', 'stone'], wain: null, lit: 0xffc890,
    ghosts: [{ kind: 'red', x: -16, z: 100 }, { kind: 'tosser', x: -12, z: 108 }, { kind: 'purple', x: -20, z: 106 }],
    reward: { unlock: ['boiler'], key: 'Boiler Room', tip: 'Behind a dusty bottle: the <b>Boiler Room</b> key. It\'s warm to the touch...' },
  },
  [R.BOILER_ROOM]: {
    name: 'BOILER ROOM', level: 'B1', area: 4, minX: 6, maxX: 26, minZ: 94, maxZ: 114,
    floor: stone('#3a3436'), wall: ['#4a3a34', '#000000', 'stone'], wain: null, lit: 0xffb080,
    ghosts: [], boss: 'boilerbeard',
    reward: { unlock: ['kitchen', 'crypt'], key: 'Kitchen', area: 4, sticker: 'boss_boilerbeard', tip: 'The <b>Kitchen</b> key, still warm from the boiler — its door is off the East Hall. (The old <b>Crypt</b> door already creaked open.)' },
  },
  [R.CRYPT]: {
    name: 'CRYPT', level: 'B1', area: 4, minX: -6, maxX: 6, minZ: 82, maxZ: 100,
    floor: stone('#3a3a42'), wall: ['#4a4a52', '#000000', 'stone'], wain: null, lit: 0xc8d0ff,
    ghosts: [{ kind: 'white', x: -3, z: 88 }, { kind: 'ice', x: 3, z: 92 }, { kind: 'purple', x: 0, z: 85 }, { kind: 'red', x: 0, z: 96 }],
    reward: { sticker: 'crypt', tip: 'The Crypt is at peace. Its treasure is yours!' },
  },
  [R.KITCHEN]: {
    name: 'KITCHEN', level: '1F', area: 4, minX: 20, maxX: 34, minZ: -16, maxZ: 0,
    floor: checker('#c8b8a0', '#5a3a2a'), wall: ['#d8c8a0', '#7a5a3a', 'diamond'], wain: '#5a3a2a', lit: 0xfff0d0,
    ghosts: [{ kind: 'red', x: 27, z: -8 }, { kind: 'fire', x: 24, z: -4 }, { kind: 'green', x: 31, z: -12 }],
    reward: { unlock: ['ballroom'], key: 'Ballroom', tip: 'The <b>Ballroom</b> key was baked into a pie! The final doors are at the back of the Kitchen...' },
  },
  // ======================= FINALE =======================
  [R.BALLROOM]: {
    name: 'BALLROOM', level: '1F', area: 5, minX: 0, maxX: 24, minZ: -40, maxZ: -16,
    floor: checker('#f2ead8', '#2a1a2a'), wall: ['#3a1a3a', '#f0d080', 'damask'], wain: '#1a0c1a', lit: 0xfff0d0,
    ghosts: [], boss: 'varnish',
    reward: { sticker: 'boss_varnish' },
  },
};

// Doors: axis 'x' doors sit in walls running along x (fixed z);
// axis 'z' doors sit in walls running along z (fixed x).
export const DOORS = [
  { name: 'foyer', axis: 'x', at: 6, a: -1.5, b: 1.5, rooms: [R.FOYER, R.HALLWAY], locked: true, lockHint: 'Catch the ghost in the Foyer first!' },
  { name: 'parlor', axis: 'x', at: 0, a: -10.5, b: -7.5, rooms: [R.HALLWAY, R.PARLOR] },
  { name: 'dining', axis: 'x', at: 0, a: 8.5, b: 11.5, rooms: [R.HALLWAY, R.DINING], locked: true, lockHint: 'Locked! Clear the Parlor ghosts to find the key.' },
  { name: 'westhall', axis: 'z', at: -18, a: 1.5, b: 4.5, rooms: [R.HALLWAY, R.WEST_HALL], locked: true, lockHint: 'The West Wing is sealed. Whoever is feasting in the Dining Room has the key...' },
  { name: 'study', axis: 'z', at: -24, a: -4.5, b: -1.5, rooms: [R.WEST_HALL, R.STUDY] },
  { name: 'library', axis: 'z', at: -24, a: -27, b: -24, rooms: [R.WEST_HALL, R.LIBRARY], locked: true, lockHint: 'The Library is locked. Professor Patchnotes in the Study has the key.' },
  { name: 'conservatory', axis: 'z', at: -18, a: -27, b: -24, rooms: [R.WEST_HALL, R.CONSERVATORY], locked: true, lockHint: 'Locked. Piano music plays on the other side... the Library ghosts have the key.' },
  { name: 'easthall', axis: 'z', at: 20, a: 1.5, b: 4.5, rooms: [R.HALLWAY, R.EAST_HALL], locked: true, lockHint: 'The East Wing is locked. Someone sleeping upstairs keeps the key under his cap...' },
  { name: 'washroom', axis: 'z', at: 26, a: 3.5, b: 6.5, rooms: [R.EAST_HALL, R.WASHROOM] },
  { name: 'storage', axis: 'z', at: 26, a: 14.5, b: 17.5, rooms: [R.EAST_HALL, R.STORAGE], locked: true, lockHint: 'Locked. Clear the Washroom first.' },
  { name: 'kitchen', axis: 'x', at: 0, a: 21.5, b: 24.5, rooms: [R.EAST_HALL, R.KITCHEN], locked: true, lockHint: 'The Kitchen is locked. The key is somewhere hot... down in the basement.' },
  { name: 'ballroom', axis: 'x', at: -16, a: 20.5, b: 23.5, rooms: [R.KITCHEN, R.BALLROOM], locked: true, lockHint: 'The Ballroom doors are sealed. Clear the Kitchen!' },
  { name: 'bathroom', axis: 'z', at: -14, a: -97.5, b: -94.5, rooms: [R.UPPER_HALL, R.BATHROOM] },
  { name: 'guestroom', axis: 'z', at: 14, a: -97.5, b: -94.5, rooms: [R.UPPER_HALL, R.GUEST_ROOM] },
  { name: 'nursery', axis: 'x', at: -100, a: -12.5, b: -9.5, rooms: [R.UPPER_HALL, R.NURSERY], locked: true, lockHint: 'The Nursery is locked. Try the Bathroom.' },
  { name: 'bedroom', axis: 'x', at: -100, a: 1.5, b: 4.5, rooms: [R.UPPER_HALL, R.BEDROOM], locked: true, lockHint: 'Shhh... loud snoring. Pixel Pip in the Nursery has the key to the Master Bedroom.' },
  { name: 'observatory', axis: 'x', at: -100, a: 18.5, b: 21.5, rooms: [R.GUEST_ROOM, R.OBSERVATORY], locked: true, lockHint: 'Locked. Clear the Guest Room.' },
  { name: 'winecellar', axis: 'z', at: -6, a: 103.5, b: 106.5, rooms: [R.STAIRWELL, R.WINE_CELLAR] },
  { name: 'boiler', axis: 'z', at: 6, a: 103.5, b: 106.5, rooms: [R.STAIRWELL, R.BOILER_ROOM], locked: true, lockHint: 'Too hot to touch! The Wine Cellar holds the key.' },
  { name: 'crypt', axis: 'x', at: 100, a: 2.2, b: 5.2, rooms: [R.STAIRWELL, R.CRYPT], locked: true, lockHint: 'A heavy crypt door. It rumbles in time with the boiler next door...' },
];

// Staircases & trapdoors between floors (press E to use)
export const PORTALS = [
  { id: 'stairsL', room: R.FOYER, x: -8.6, z: 9.8, r: 1.6, label: 'climb the stairs', to: { room: R.UPPER_HALL, x: 0, z: -97.6, facing: Math.PI }, locked: true, lockHint: 'A ghostly barrier blocks the stairs. It hums in tune with a piano somewhere in the West Wing...' },
  { id: 'stairsR', room: R.FOYER, x: 8.6, z: 9.8, r: 1.6, label: 'climb the stairs', to: { room: R.UPPER_HALL, x: 0, z: -97.6, facing: Math.PI }, locked: true, lockHint: 'A ghostly barrier blocks the stairs. It hums in tune with a piano somewhere in the West Wing...' },
  { id: 'stairsDown', room: R.UPPER_HALL, x: 0, z: -94.2, r: 1.7, label: 'go downstairs', to: { room: R.FOYER, x: -6.4, z: 11, facing: 0 } },
  { id: 'cellar', room: R.STORAGE, x: 33, z: 13, r: 1.6, label: 'climb down to the basement', to: { room: R.STAIRWELL, x: 0, z: 105.2, facing: 0 }, locked: true, lockHint: 'A trapdoor... something on the other side is holding it shut!' },
  { id: 'cellarUp', room: R.STAIRWELL, x: -3, z: 101.9, r: 1.6, label: 'climb up to the Storage Room', to: { room: R.STORAGE, x: 30.5, z: 15, facing: 0 } },
];

export class Mansion {
  constructor(scene, { lights = 12 } = {}) {
    this.scene = scene;
    this.root = new THREE.Group();
    this.root.name = 'mansion';
    scene.add(this.root);

    this.rooms = {};
    this.colliders = [];
    this.cutaways = [];
    this.doors = {};
    this.doorList = [];
    this.interactables = [];
    this.flickers = [];
    this.vlights = [];
    this.candlesticks = [];
    this.curtains = [];
    this.animated = [];
    this.anims = [];
    this.portals = PORTALS.map((p) => ({ ...p }));
    this.wallMatCache = new Map();
    this.time = 0;
    this.currentRoomId = R.FOYER;

    this.spawns = {
      player: new THREE.Vector3(0, 0, 19.5),
      tutorialGhost: new THREE.Vector3(0, FH, 12.5),
      parlorGhosts: [new THREE.Vector3(-12.5, FH, -9), new THREE.Vector3(-5, FH, -5.5)],
      bossSeat: new THREE.Vector3(17.4, 0, -8),
      bossRoamCenter: new THREE.Vector3(10, 0, -8),
    };
    // portrait-ghost stations, filled in by the wing builders
    this.bossSpots = {};
    this.tableBounds = { minX: 3.6, maxX: 16.4, minZ: -9.2, maxZ: -6.8 };

    for (const [id, def] of Object.entries(ROOM_DEFS)) {
      this.rooms[id] = {
        id, ...def,
        cx: (def.minX + def.maxX) / 2, cz: (def.minZ + def.maxZ) / 2,
        lit: false, litLevel: 0, light: null,
      };
    }
    this.roomList = Object.values(this.rooms);

    this.buildGround();
    this.buildFloors();
    this.buildWalls();
    this.buildDoors();
    this.buildRoomLights();
    this.buildFoyer();
    this.buildHallway();
    this.buildParlor();
    this.buildDining();
    buildWestWing(this);
    buildBallroomAndKitchen(this);
    buildUpstairs(this);
    buildEastWing(this);
    buildBasement(this);
    this.buildLightPool(lights); // fewer real lights on Low graphics: cheaper per-pixel shading
    this.finalizeCulling();
  }

  // ---------------------------------------------------------------
  roomAt(x, z) {
    // the hero is almost always in the same room as last time: check it first
    const last = this.lastRoomHit;
    if (last && x >= last.minX && x <= last.maxX && z >= last.minZ && z <= last.maxZ) return last;
    for (const r of this.roomList) {
      if (x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ) {
        this.lastRoomHit = r;
        return r;
      }
    }
    return null;
  }

  addCollider(minX, maxX, minZ, maxZ, tag = 'wall') {
    const c = { minX, maxX, minZ, maxZ, enabled: true, tag, stamp: 0 };
    this.colliders.push(c);
    this.gridDirty = true;
    return c;
  }

  // ---------------------------------------------------------------
  // Spatial grid over the colliders (4 m cells). Collision and line-of-
  // sight checks only look at boxes near the query instead of every one
  // of the mansion's colliders, several times per object per frame.
  buildGrid() {
    const S = 4;
    this.gridSize = S;
    this.grid = new Map();
    for (const c of this.colliders) {
      const x0 = Math.floor(c.minX / S);
      const x1 = Math.floor(c.maxX / S);
      const z0 = Math.floor(c.minZ / S);
      const z1 = Math.floor(c.maxZ / S);
      for (let gx = x0; gx <= x1; gx++) {
        for (let gz = z0; gz <= z1; gz++) {
          const key = gx * 100003 + gz;
          let cell = this.grid.get(key);
          if (!cell) this.grid.set(key, (cell = []));
          cell.push(c);
        }
      }
    }
    this.gridDirty = false;
    this.queryStamp = 0;
    this.queryOut = [];
  }

  // colliders overlapping an AABB (shared result array: use it right away)
  queryColliders(minX, maxX, minZ, maxZ) {
    if (this.gridDirty || !this.grid) this.buildGrid();
    const S = this.gridSize;
    const out = this.queryOut;
    out.length = 0;
    const stamp = ++this.queryStamp;
    const x0 = Math.floor(minX / S);
    const x1 = Math.floor(maxX / S);
    const z0 = Math.floor(minZ / S);
    const z1 = Math.floor(maxZ / S);
    for (let gx = x0; gx <= x1; gx++) {
      for (let gz = z0; gz <= z1; gz++) {
        const cell = this.grid.get(gx * 100003 + gz);
        if (!cell) continue;
        for (const c of cell) {
          if (c.stamp === stamp) continue;
          c.stamp = stamp;
          out.push(c);
        }
      }
    }
    return out;
  }

  // push a circle (x,z) out of every enabled AABB; returns true if collided
  resolveCircle(pos, r, wallsOnly = false) {
    let hit = false;
    // only boxes within reach of the circle (it moves at most r while resolving)
    const near = this.queryColliders(pos.x - r - 0.6, pos.x + r + 0.6, pos.z - r - 0.6, pos.z + r + 0.6);
    for (let pass = 0; pass < 2; pass++) {
      for (const c of near) {
        if (!c.enabled || (wallsOnly && c.tag !== 'wall' && c.tag !== 'door')) continue;
        if (pos.x < c.minX - r - 0.01 || pos.x > c.maxX + r + 0.01 || pos.z < c.minZ - r - 0.01 || pos.z > c.maxZ + r + 0.01) continue;
        const cx = Math.max(c.minX, Math.min(pos.x, c.maxX));
        const cz = Math.max(c.minZ, Math.min(pos.z, c.maxZ));
        const dx = pos.x - cx;
        const dz = pos.z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 < r * r) {
          hit = true;
          if (d2 > 1e-8) {
            const d = Math.sqrt(d2);
            pos.x += (dx / d) * (r - d);
            pos.z += (dz / d) * (r - d);
          } else {
            // centre inside the box: push out along the shallowest axis
            const left = pos.x - c.minX;
            const right = c.maxX - pos.x;
            const back = pos.z - c.minZ;
            const front = c.maxZ - pos.z;
            const m = Math.min(left, right, back, front);
            if (m === left) pos.x = c.minX - r;
            else if (m === right) pos.x = c.maxX + r;
            else if (m === back) pos.z = c.minZ - r;
            else pos.z = c.maxZ + r;
          }
        }
      }
    }
    return hit;
  }

  // simple segment-vs-AABB line of sight test on the XZ plane
  lineOfSight(a, b) {
    const steps = Math.ceil(a.distanceTo(b) / 0.4);
    const minX = Math.min(a.x, b.x);
    const maxX = Math.max(a.x, b.x);
    const minZ = Math.min(a.z, b.z);
    const maxZ = Math.max(a.z, b.z);
    const walls = this.queryColliders(minX, maxX, minZ, maxZ).filter((c) => c.enabled && c.tag === 'wall' && c.maxX > minX && c.minX < maxX && c.maxZ > minZ && c.minZ < maxZ);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const x = a.x + (b.x - a.x) * t;
      const z = a.z + (b.z - a.z) * t;
      for (const c of walls) {
        if (x > c.minX && x < c.maxX && z > c.minZ && z < c.maxZ) return false;
      }
    }
    return true;
  }

  // ---------------------------------------------------------------
  buildGround() {
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(420, 420), std(0x05060a));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    ground.receiveShadow = true;
    this.root.add(ground);
    this.ground = ground;
  }

  buildFloors() {
    for (const r of Object.values(this.rooms)) {
      const w = r.maxX - r.minX;
      const d = r.maxZ - r.minZ;
      let tex;
      let rough = 0.75;
      if (r.floor.type === 'checker') {
        tex = repeatTex(makeCheckerTexture(r.floor.a, r.floor.b, r.floor.tiles), w / 4, d / 4);
        rough = 0.35;
      } else if (r.floor.type === 'stone') {
        tex = repeatTex(makeStoneTexture(r.floor.base), w / 4, d / 4);
        rough = 0.95;
      } else {
        tex = repeatTex(makeWoodTexture(r.floor.base, r.id.length * 7), w / 5, d / 5);
      }
      const relief = r.floor.type === 'stone' ? { strength: 5, rough: 0.92, roughVar: 0.2 }
        : r.floor.type === 'checker' ? { strength: 1.6, rough: 0.28, roughVar: 0.35 }
        : { strength: 3, rough: 0.55, roughVar: 0.4 };
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), std(0xffffff, { map: tex, roughness: 1, flatShading: false, ...makeReliefMaps(tex, relief), normalScale: new THREE.Vector2(1, 1) }));
      m.rotation.x = -Math.PI / 2;
      m.position.set(r.cx, 0, r.cz);
      m.receiveShadow = true;
      this.root.add(m);
    }
  }

  wallMaterial(roomId, len, h) {
    if (!roomId) return std(0x0c0a10);
    const r = this.rooms[roomId];
    const key = roomId + '|' + len.toFixed(1) + '|' + h.toFixed(1);
    if (this.wallMatCache.has(key)) return this.wallMatCache.get(key);
    const tex = r.wall[2] === 'stone'
      ? repeatTex(makeStoneTexture(r.wall[0]), len / 3, h / 3)
      : repeatTex(makeWallpaperTexture(r.wall[0], r.wall[1], r.wall[2]), len / 2.6, h / 2.6);
    const relief = r.wall[2] === 'stone' ? { strength: 5, rough: 0.95, roughVar: 0.15 } : { strength: 1.4, rough: 0.85, roughVar: 0.2 };
    const m = std(0xffffff, { map: tex, roughness: 1, flatShading: false, ...makeReliefMaps(tex, relief) });
    this.wallMatCache.set(key, m);
    return m;
  }

  makeWallPiece(axis, fixed, s, e, y0, y1, trims = true) {
    const len = e - s;
    const mid = (s + e) / 2;
    const h = y1 - y0;
    const group = new THREE.Group();
    if (axis === 'x') group.position.set(mid, 0, fixed);
    else {
      group.position.set(fixed, 0, mid);
      group.rotation.y = -Math.PI / 2;
    }
    const posPt = axis === 'x' ? [mid, fixed + 0.5] : [fixed - 0.5, mid];
    const negPt = axis === 'x' ? [mid, fixed - 0.5] : [fixed + 0.5, mid];
    const roomPos = this.roomAt(posPt[0], posPt[1]);
    const roomNeg = this.roomAt(negPt[0], negPt[1]);
    const dark = this.darkWallMat || (this.darkWallMat = std(0x120e14));
    const top = this.wallTopMat || (this.wallTopMat = std(0x1a1418));
    const mats = [dark, dark, top, dark, this.wallMaterial(roomPos && roomPos.id, len, h), this.wallMaterial(roomNeg && roomNeg.id, len, h)];
    const wall = new THREE.Mesh(new THREE.BoxGeometry(len, h, T), mats);
    wall.position.y = y0 + h / 2;
    wall.castShadow = true;
    wall.receiveShadow = true;
    group.add(wall);

    if (trims && y0 === 0) {
      for (const [room, sgn] of [[roomPos, 1], [roomNeg, -1]]) {
        if (!room) continue;
        if (room.wain) {
          const wtex = repeatTex(makeWainscotTexture(room.wain), len / 2.5, 1);
          group.add(box(len, 1.15, 0.05, std(0xffffff, { map: wtex, roughness: 1, flatShading: false, ...makeReliefMaps(wtex, { strength: 3, rough: 0.6, roughVar: 0.35 }) }), 0, 0.575, sgn * (T / 2 + 0.025), { cast: false }));
          group.add(box(len, 0.1, 0.1, M.darkWood, 0, 1.2, sgn * (T / 2 + 0.05), { cast: false }));
          group.add(box(len, 0.18, 0.14, M.darkWood, 0, H - 0.09, sgn * (T / 2 + 0.07), { cast: false }));
        } else {
          // bare stone: a rough plinth along the floor
          group.add(box(len, 0.3, 0.12, std(0x2a262c), 0, 0.15, sgn * (T / 2 + 0.06), { cast: false }));
        }
      }
    } else if (trims) {
      group.add(box(len, 0.14, T + 0.12, M.darkWood, 0, y0 + 0.07, 0, { cast: false }));
    }

    this.root.add(group);
    if (axis === 'x') this.cutaways.push({ obj: group, z: fixed, minX: s, maxX: e, cur: 1 });
    return group;
  }

  // Walls are generated from the room rectangles: every room edge is a
  // segment on a wall line; shared edges merge, door openings are cut.
  buildWalls() {
    const lines = new Map();
    const addSeg = (axis, fixed, a, b) => {
      const key = axis + ':' + fixed;
      if (!lines.has(key)) lines.set(key, { axis, fixed, segs: [] });
      lines.get(key).segs.push([Math.min(a, b), Math.max(a, b)]);
    };
    for (const r of Object.values(this.rooms)) {
      addSeg('x', r.minZ, r.minX, r.maxX);
      addSeg('x', r.maxZ, r.minX, r.maxX);
      addSeg('z', r.minX, r.minZ, r.maxZ);
      addSeg('z', r.maxX, r.minZ, r.maxZ);
    }
    for (const line of lines.values()) {
      const segs = line.segs.sort((p, q) => p[0] - q[0]);
      const merged = [];
      for (const s of segs) {
        const last = merged[merged.length - 1];
        if (last && s[0] <= last[1] + 0.001) last[1] = Math.max(last[1], s[1]);
        else merged.push([s[0], s[1]]);
      }
      const openings = DOORS.filter((d) => d.axis === line.axis && Math.abs(d.at - line.fixed) < 0.01).map((d) => [d.a, d.b]).sort((p, q) => p[0] - q[0]);
      for (const [m0, m1] of merged) {
        let cursor = m0 - T / 2;
        const end = m1 + T / 2;
        for (const [oa, ob] of openings) {
          if (ob <= m0 || oa >= m1) continue;
          this.solidWall(line.axis, line.fixed, cursor, oa);
          this.makeWallPiece(line.axis, line.fixed, oa, ob, DOOR_H + 0.1, H);
          cursor = ob;
        }
        this.solidWall(line.axis, line.fixed, cursor, end);
      }
    }
  }

  solidWall(axis, fixed, s, e) {
    if (e - s < 0.01) return;
    this.makeWallPiece(axis, fixed, s, e, 0, H);
    if (axis === 'x') this.addCollider(s, e, fixed - T / 2, fixed + T / 2);
    else this.addCollider(fixed - T / 2, fixed + T / 2, s, e);
  }

  makeDoor({ axis = 'x', at, a, b, rooms, locked = false, name, lockHint }) {
    const w = b - a;
    const wrapper = new THREE.Group();
    this.root.add(wrapper);
    const frameMat = M.darkWood;
    const post = (p) => {
      const m = box(0.22, DOOR_H + 0.2, T + 0.16, frameMat, 0, (DOOR_H + 0.2) / 2, 0);
      if (axis === 'x') m.position.set(p, (DOOR_H + 0.2) / 2, at);
      else {
        m.position.set(at, (DOOR_H + 0.2) / 2, p);
        m.rotation.y = Math.PI / 2;
      }
      wrapper.add(m);
    };
    post(a - 0.05);
    post(b + 0.05);
    const hinge = buildDoorLeaf(w, DOOR_H, makeDoorTexture());
    if (axis === 'x') hinge.position.set(a, 0, at);
    else {
      hinge.position.set(at, 0, a);
      hinge.rotation.y = -Math.PI / 2;
    }
    wrapper.add(hinge);
    let lockMesh = null;
    if (locked) {
      lockMesh = buildLockedSign();
      lockMesh.scale.x = w / 3;
      hinge.add(lockMesh);
    }
    const collider = axis === 'x'
      ? this.addCollider(a, b, at - 0.25, at + 0.25, 'door')
      : this.addCollider(at - 0.25, at + 0.25, a, b, 'door');
    const center = axis === 'x' ? new THREE.Vector3((a + b) / 2, 0, at) : new THREE.Vector3(at, 0, (a + b) / 2);
    const door = new Door({ hinge, collider, center, axis, openDir: 1, rooms, locked, name, lockMesh });
    door.lockHint = lockHint;
    door.wrapper = wrapper;
    if (axis === 'x') this.cutaways.push({ obj: wrapper, z: at, minX: a, maxX: b, cur: 1 });
    this.doors[name] = door;
    this.doorList.push(door);
    return door;
  }

  buildDoors() {
    for (const d of DOORS) this.makeDoor(d);
  }

  // ---------------------------------------------------------------
  // LIGHTING — every lamp, candle, fire and room light is a "virtual"
  // light. A fixed pool of real PointLights is handed to the brightest
  // nearby ones each frame, so the shader light count never changes.
  addLight(x, y, z, color, base, distance, decay, room, { flickerAmt = 0.25, fire = false, kind = 'flicker' } = {}) {
    const v = {
      pos: new THREE.Vector3(x, y, z), color: new THREE.Color(color), base, distance, decay, room,
      amt: flickerAmt, phase: Math.random() * 10, fire, kind, intensity: 0, fade: 0, slot: -1,
    };
    this.vlights.push(v);
    if (kind === 'flicker') this.flickers.push({ v, room });
    return v;
  }

  buildRoomLights() {
    for (const r of Object.values(this.rooms)) {
      const w = r.maxX - r.minX;
      const d = r.maxZ - r.minZ;
      r.light = this.addLight(r.cx, H - 0.6, r.cz, r.lit, 0, Math.max(w, d) * 1.25, 1.1, r.id, { kind: 'room' });
    }
  }

  buildLightPool(n = 12) {
    this.pool = [];
    for (let i = 0; i < n; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 8, 1.5);
      l.position.set(0, -50, 0);
      this.root.add(l);
      this.pool.push({ light: l, owner: null });
    }
  }

  updateLightPool(dt, playerPos) {
    if (!playerPos) return;
    const cur = this.rooms[this.currentRoomId];
    const level = cur ? cur.level : '1F';
    const cand = [];
    for (const v of this.vlights) {
      if (v.intensity < 0.05) continue;
      const room = this.rooms[v.room];
      if (room && room.level !== level) continue;
      const d = Math.hypot(v.pos.x - playerPos.x, v.pos.z - playerPos.z);
      if (d > 34) continue;
      v.score = d + (v.room === this.currentRoomId ? 0 : 6) - (v.slot >= 0 ? 2.5 : 0) - (v.kind === 'room' ? 4 : 0);
      cand.push(v);
    }
    cand.sort((p, q) => p.score - q.score);
    const chosen = new Set(cand.slice(0, this.pool.length));
    for (const s of this.pool) {
      if (s.owner && !chosen.has(s.owner)) {
        s.owner.slot = -1;
        s.owner.fade = 0;
        s.owner = null;
      }
    }
    for (const v of chosen) {
      if (v.slot >= 0) continue;
      const idx = this.pool.findIndex((s) => !s.owner);
      if (idx < 0) break;
      this.pool[idx].owner = v;
      v.slot = idx;
      v.fade = 0;
    }
    for (const s of this.pool) {
      const l = s.light;
      const v = s.owner;
      if (!v) {
        l.intensity = 0;
        continue;
      }
      v.fade = Math.min(1, v.fade + dt * 3);
      l.position.copy(v.pos);
      l.color.copy(v.color);
      l.distance = v.distance;
      l.decay = v.decay;
      l.intensity = v.intensity * v.fade;
    }
  }

  addSconce(x, z, rotY, roomId, y = 2.8) {
    const s = buildSconce();
    s.position.set(x, y, z);
    s.rotation.y = rotY;
    this.root.add(s);
    const off = new THREE.Vector3(0, 0.3, 0.6).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
    const v = this.addLight(x + off.x, y + off.y, z + off.z, 0xff9a40, 7, 7.5, 1.6, roomId);
    this.flickers[this.flickers.length - 1].sprite = s.userData.flame;
    return s;
  }

  addPortrait(subject, x, y, z, rotY, size = 1.25, frameColor = 0xc9952e) {
    const tex = makePortraitTexture(subject, 128);
    const f = buildPortraitFrame(tex, size, size, frameColor);
    f.position.set(x, y, z);
    f.rotation.y = rotY;
    this.root.add(f);
    const name = typeof subject === 'string'
      ? (PORTRAIT_NAMES[subject] || subject.replace('_', ' & ').toUpperCase())
      : subject.name.toUpperCase();
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(size * 0.8, 0.18), new THREE.MeshStandardMaterial({ map: makeLabelTexture(name, { font: 'bold 22px monospace' }), metalness: 0.5, roughness: 0.4 }));
    plate.position.set(0, -size / 2 - 0.28, 0.03);
    f.add(plate);
    return f;
  }

  // hang a portrait flat on a wall: side = 'n' | 's' | 'e' | 'w' wall of a room
  hangPortrait(subject, room, side, along, { y = 2.75, size = 1.25, frame = 0xc9952e } = {}) {
    const r = this.rooms[room];
    const off = T / 2 + 0.06;
    let f;
    if (side === 'n') f = this.addPortrait(subject, along, y, r.minZ + off, 0, size, frame);
    else if (side === 's') f = this.mount(this.addPortrait(subject, along, y, r.maxZ - off, Math.PI, size, frame), r.maxZ);
    else if (side === 'w') f = this.addPortrait(subject, r.minX + off, y, along, Math.PI / 2, size, frame);
    else f = this.addPortrait(subject, r.maxX - off, y, along, -Math.PI / 2, size, frame);
    return f;
  }

  // objects hung on a south-facing wall line sink with the dollhouse cutaway
  mount(obj, z) {
    if (!this.wallMounts) this.wallMounts = {};
    let g = this.wallMounts[z];
    if (!g) {
      g = new THREE.Group();
      this.root.add(g);
      this.wallMounts[z] = g;
      this.cutaways.push({ obj: g, z, minX: -100, maxX: 100, cur: 1 });
    }
    g.add(obj);
    return obj;
  }

  // place a prop: auto collider from its meshes, optional search loot,
  // registers its animation and flickering flame sprites
  place(obj, x, z, { room, rot = 0, y = 0, loot = null, collide = true, pad = 0.08, mountZ = null } = {}) {
    obj.position.set(x, y, z);
    obj.rotation.y = rot;
    if (mountZ !== null) this.mount(obj, mountZ);
    else this.root.add(obj);
    if (collide) {
      obj.updateMatrixWorld(true);
      const bb = new THREE.Box3();
      const tmp = new THREE.Box3();
      obj.traverse((o) => {
        if (o.isMesh && !o.isSprite && o.material && !o.material.transparent) {
          tmp.setFromObject(o);
          bb.union(tmp);
        }
      });
      if (!bb.isEmpty() && bb.min.y < 1.6) this.addCollider(bb.min.x + pad, bb.max.x - pad, bb.min.z + pad, bb.max.z - pad, 'furniture');
    }
    if (loot) this.addSearchable(obj, { room, loot });
    if (obj.userData.anim) this.anims.push({ fn: obj.userData.anim, room });
    if (obj.userData.flames) this.flickers.push({ v: null, room, sprites: obj.userData.flames, bases: obj.userData.flames.map((s) => s.scale.x) });
    return obj;
  }

  // a floor rug (plane) using the procedural rug texture
  addRug(x, z, w, d, colors, rot = 0) {
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(w, d), std(0xffffff, { map: makeRugTexture(...colors), flatShading: false }));
    rug.rotation.x = -Math.PI / 2;
    rug.rotation.z = rot;
    rug.position.set(x, 0.012, z);
    rug.receiveShadow = true;
    this.root.add(rug);
    return rug;
  }

  // chests stay hidden (no collision) until their room is cleared of ghosts
  addChest(group, lid, opts) {
    group.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(group.children[0]); // chest body only (skip the glow sprite)
    const collider = this.addCollider(bb.min.x + 0.05, bb.max.x - 0.05, bb.min.z + 0.05, bb.max.z - 0.05, 'furniture');
    const chest = new Chest(group, lid, { ...opts, hidden: true, collider });
    this.interactables.push(chest);
    return chest;
  }

  // convenience: build + place a hidden reward chest
  placeChest(x, z, room, loot, rot = 0) {
    const chest = buildChest();
    chest.group.position.set(x, 0, z);
    chest.group.rotation.y = rot;
    this.root.add(chest.group);
    return this.addChest(chest.group, chest.lid, { room, glow: chest.glow, loot });
  }

  revealChests(roomId, game) {
    let n = 0;
    for (const it of this.interactables) {
      if (it.kind === 'chest' && it.room === roomId && it.hidden) {
        it.reveal(game);
        n++;
      }
    }
    return n;
  }

  addSearchable(obj, opts) {
    const f = new Furniture(obj, opts);
    this.interactables.push(f);
    return f;
  }

  addWindow(x, y, z, rotY, { curtains = false, curtainColor = 0x7a1a28, room } = {}) {
    const w = buildWindow(1.6, 2.2);
    w.position.set(x, y, z);
    w.rotation.y = rotY;
    this.root.add(w);
    const shaft = buildMoonShaft(1.6, 5.2);
    const n = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
    const pivot = new THREE.Group();
    pivot.position.set(x + n.x * 2.8, 0.02, z + n.z * 2.8);
    pivot.rotation.y = rotY;
    shaft.position.set(0, 0.02, 0);
    pivot.add(shaft);
    this.root.add(pivot);
    this.animated.push({ type: 'shaft', mesh: shaft, phase: Math.random() * 6 });
    if (curtains) {
      for (const side of [-1, 1]) {
        const holder = new THREE.Group();
        holder.position.set(x + Math.cos(rotY) * side * 1.15, y - 0.4, z - Math.sin(rotY) * side * 1.15);
        holder.rotation.y = rotY;
        const cloth = buildCurtainCloth(1.0, 3.2, curtainColor);
        cloth.position.z = 0.25;
        holder.add(cloth);
        this.root.add(holder);
        const c = new Curtain(holder, cloth, { room, normal: n.clone() });
        this.interactables.push(c);
        this.curtains.push(c);
      }
      const rod = box(3.6, 0.08, 0.08, M.brass, 0, 0, 0, { cast: false });
      rod.position.set(x + n.x * 0.3, y + 1.25, z + n.z * 0.3);
      rod.rotation.y = rotY;
      this.root.add(rod);
    }
    return w;
  }

  // window on a room's outer wall: side 'n' | 'w' | 'e' (south walls are cut away)
  windowOn(room, side, along, opts = {}) {
    const r = this.rooms[room];
    const off = T / 2 + 0.02;
    const y = opts.y || 2.6;
    if (side === 'n') return this.addWindow(along, y, r.minZ + off, 0, { room, ...opts });
    if (side === 'w') return this.addWindow(r.minX + off, y, along, Math.PI / 2, { room, ...opts });
    return this.addWindow(r.maxX - off, y, along, -Math.PI / 2, { room, ...opts });
  }

  // a sheet-covered vacuumable curtain (laundry lines, shower curtains)
  addHangingCloth(x, y, z, rotY, room, { w = 1.0, h = 2.4, color = 0xf2ead6, loot = { coin: 2, bill: 1 } } = {}) {
    const holder = new THREE.Group();
    holder.position.set(x, y, z);
    holder.rotation.y = rotY;
    const cloth = buildCurtainCloth(w, h, color);
    holder.add(cloth);
    this.root.add(holder);
    const n = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
    const c = new Curtain(holder, cloth, { room, normal: n, loot });
    this.interactables.push(c);
    this.curtains.push(c);
    return c;
  }

  // ---------------------------------------------------------------
  // THE FOYER — grand double staircase, chandelier, WIDR 64 gallery
  buildFoyer() {
    const RM = R.FOYER;
    const north = (o) => this.mount(o, 6);
    north(buildStairFlight(-1));
    north(buildStairFlight(1));
    this.addCollider(-9.8, -3.4, 6, 8.5, 'stairs');
    this.addCollider(3.4, 9.8, 6, 8.5, 'stairs');
    // landing above the door
    north(box(7.0, 0.3, 2.2, std(0x5a2a14), 0, 3.75, 7.3));
    north(box(7.0, 0.04, 1.3, std(0x7a1a28), 0, 3.92, 7.3, { cast: false }));
    north(box(7.0, 0.1, 0.1, M.darkWood, 0, 4.9, 8.35));
    for (let x = -3.4; x <= 3.4; x += 0.6) north(box(0.06, 1.0, 0.06, M.lightWood, x, 4.4, 8.35, { cast: false }));
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.5), new THREE.MeshStandardMaterial({
      map: makeLabelTexture('WIDR 64 MANSION', { bg: '#1c1830', fg: '#ffc21a', w: 512, h: 76, font: 'bold 44px "Arial Black", sans-serif' }),
      emissive: 0x332200, emissiveIntensity: 0.6,
    }));
    banner.position.set(0, 3.45, 8.42);
    north(banner);

    // ghostly barriers on both stair feet (lift when Madame Sonata is caught)
    this.stairBarriers = [];
    for (const x of [-8.6, 8.6]) {
      const bar = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshBasicMaterial({ color: 0x9a7dff, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
      bar.position.set(x, 1.3, 8.7);
      this.root.add(bar);
      const glow = glowSprite(0x9a7dff, 3, 0.4);
      glow.position.set(x, 1.3, 8.9);
      this.root.add(glow);
      this.stairBarriers.push({ bar, glow, portal: x < 0 ? 'stairsL' : 'stairsR' });
    }

    // grand front doors on the south wall (they sink with the cutaway wall)
    const front = (o) => this.mount(o, 22);
    const fz = 22 - T / 2 - 0.09;
    const doorTex = makeDoorTexture('#3a1a0c');
    const leftLeaf = buildDoorLeaf(1.6, DOOR_H, doorTex);
    leftLeaf.position.set(-1.6, 0, fz);
    leftLeaf.rotation.y = 0.04;
    front(leftLeaf);
    const rightLeaf = buildDoorLeaf(1.6, DOOR_H, doorTex);
    rightLeaf.position.set(1.6, 0, fz);
    rightLeaf.rotation.y = Math.PI - 0.04;
    front(rightLeaf);
    front(box(3.7, 0.3, 0.3, M.darkWood, 0, DOOR_H + 0.15, fz));
    front(box(0.25, DOOR_H + 0.3, 0.3, M.darkWood, -1.75, (DOOR_H + 0.3) / 2, fz));
    front(box(0.25, DOOR_H + 0.3, 0.3, M.darkWood, 1.75, (DOOR_H + 0.3) / 2, fz));
    const fan = new THREE.Mesh(new THREE.CircleGeometry(1.2, 16, 0, Math.PI), new THREE.MeshBasicMaterial({ map: makeWindowTexture(), side: THREE.DoubleSide }));
    fan.position.set(0, DOOR_H + 0.3, fz - 0.02);
    fan.rotation.y = Math.PI;
    front(fan);
    const mat = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.0), new THREE.MeshStandardMaterial({
      map: makeLabelTexture('WELCOME', { bg: '#5a2a14', fg: '#d6a647', w: 256, h: 96, font: 'bold 40px "Arial Black", sans-serif' }),
      roughness: 1,
    }));
    mat.rotation.x = -Math.PI / 2;
    mat.rotation.z = Math.PI;
    mat.position.set(0, 0.013, 21.1);
    mat.receiveShadow = true;
    this.root.add(mat);

    // chandelier
    const ch = buildChandelier();
    ch.position.set(0, 4.1, 14);
    this.root.add(ch);
    this.chandelier = ch;
    this.addLight(0, 3.9, 14, 0xffb060, 9, 13, 1.4, RM, { flickerAmt: 0.18 });
    const f = this.flickers[this.flickers.length - 1];
    f.sprites = ch.userData.flames;
    f.bases = ch.userData.flames.map((s) => s.scale.x);

    this.addRug(0, 14.2, 5, 7.5, ['#6b1d2a', '#d6a647', '#203a5e']);

    // WIDR 64 gallery: the whole cast (plus Kayo & Yara)
    const leftWall = ['nathan', 'josh', 'milo', 'reshman', 'lars'];
    const rightWall = ['daniel', 'koc', 'fionn', 'renas', 'kayo_yara'];
    const zs = [10.2, 12.6, 15.0, 17.4, 19.8];
    const charById = (id) => (id === PROFESSOR.id ? PROFESSOR : CHARACTERS.find((c) => c.id === id) || id);
    leftWall.forEach((id, i) => this.addPortrait(charById(id), -10 + T / 2 + 0.06, 2.75, zs[i], Math.PI / 2));
    rightWall.forEach((id, i) => this.addPortrait(charById(id), 10 - T / 2 - 0.06, 2.75, zs[i], -Math.PI / 2));
    this.catsPortraitPos = new THREE.Vector3(9.7, 1.5, 19.8);

    this.addSconce(-10 + T / 2 + 0.03, 13.8, Math.PI / 2, RM);
    this.addSconce(10 - T / 2 - 0.03, 13.8, -Math.PI / 2, RM);

    north(this.addWindow(-6.5, 3.6, 6 + T / 2 + 0.02, 0, { room: RM }));
    north(this.addWindow(6.5, 3.6, 6 + T / 2 + 0.02, 0, { room: RM }));

    this.place(buildPlant(), -8.9, 21.0, { room: RM, loot: { coin: 4 } });
    this.place(buildPlant(), 8.9, 21.0, { room: RM, loot: { coin: 3, bill: 1 } });
    this.place(buildSideTableVase(), -9.25, 13.8, { room: RM, rot: Math.PI / 2, loot: { coin: 3, bill: 1 } });
    this.place(buildSideTableVase(), 9.25, 13.8, { room: RM, rot: -Math.PI / 2, loot: { coin: 2, bill: 2 } });

    this.placeChest(-6.5, 9.4, RM, { coin: 6, bill: 2 });
  }

  // ---------------------------------------------------------------
  // THE HALLWAY — connects the wings; secret Lawrence portrait
  buildHallway() {
    const RM = R.HALLWAY;
    const runner = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 35), std(0xffffff, { map: makeRugTexture('#203a5e', '#c99a4a', '#5b1a24'), flatShading: false }));
    runner.rotation.x = -Math.PI / 2;
    runner.rotation.z = Math.PI / 2;
    runner.position.set(1, 0.012, 3);
    runner.receiveShadow = true;
    this.root.add(runner);

    this.mount(this.addSconce(-14, T / 2 + 0.03, 0, RM), 0);
    this.mount(this.addSconce(0.5, T / 2 + 0.03, 0, RM), 0);
    this.mount(this.addSconce(15, T / 2 + 0.03, 0, RM), 0);

    const clock = buildClock();
    clock.position.set(16.6, 0, 0.6);
    this.mount(clock, 0);
    this.clock = clock;
    this.addSearchable(clock, { room: RM, loot: { coin: 2, pearl: 1 } });
    this.addCollider(16.1, 17.1, 0.2, 0.95, 'furniture');

    // secret: Lawrence (Fionn's evolution), tucked at the far end
    const law = this.mount(this.addPortrait('lawrence', 18.8, 2.2, T / 2 + 0.06, 0, 0.8, 0x7a8a9a), 0);
    this.lawrence = { pos: new THREE.Vector3(18.8, 1.5, 0.4), found: false, frame: law };
    // foreshadowing: Grumbleclaw
    this.mount(this.addPortrait('grumbleclaw', 13.6, 2.7, T / 2 + 0.06, 0, 1.3, 0x5a2a4a), 0);
    this.mount(this.addPortrait('art_mansion', -2.5, 2.7, T / 2 + 0.06, 0, 1.1), 0);

    // wing signs above the side doors
    const sign = (text, x, rot) => {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.32), new THREE.MeshStandardMaterial({ map: makeLabelTexture(text, { bg: '#2a1608', fg: '#d6a647', w: 256, h: 46, font: 'bold 26px monospace' }), emissive: 0x221100 }));
      s.position.set(x, 4.2, 3);
      s.rotation.y = rot;
      this.root.add(s);
    };
    sign('WEST WING', -18 + T / 2 + 0.03, Math.PI / 2);
    sign('EAST WING', 20 - T / 2 - 0.03, -Math.PI / 2);

    const t1 = buildSideTableVase();
    this.place(t1, -4.5, 0.6, { room: RM, loot: { coin: 3, bill: 1 } });
    this.place(buildPlant(), -16.8, 5.1, { room: RM, loot: { coin: 4 } });
    this.place(buildPlant(), 5.5, 0.7, { room: RM, loot: { bill: 2 } });
    this.place(buildPlant(), 18.8, 5.1, { room: RM, loot: { coin: 3 } });
  }

  // ---------------------------------------------------------------
  // THE PARLOR — crackling fireplace, armchairs, billowing curtains
  buildParlor() {
    const RM = R.PARLOR;
    const fp = buildFireplace();
    fp.position.set(-17.35, 0, -8);
    fp.rotation.y = Math.PI / 2;
    this.root.add(fp);
    this.addCollider(-18, -16.5, -9.8, -6.2, 'furniture');
    this.addLight(-16.3, 1.1, -8, 0xff7a2a, 16, 11, 1.5, RM, { flickerAmt: 0.45, fire: true });
    const fireGlow = glowSprite(0xff8a30, 2.6, 0.75);
    fireGlow.position.set(-16.6, 0.7, -8);
    this.root.add(fireGlow);
    this.fire = this.makeFireParticles(new THREE.Vector3(-16.75, 0.25, -8), fireGlow, 0.7);
    this.fireOrigin = this.fire.origin;

    this.addRug(-11, -8, 5.5, 7, ['#1f3a2a', '#d6a647', '#5b1a24'], Math.PI / 2);
    this.place(buildArmchair(M.velvetGreen), -13.2, -5.6, { room: RM, rot: -Math.PI / 2 - 0.35, loot: { coin: 4, bill: 1 } });
    this.place(buildArmchair(M.velvetGreen), -13.2, -10.4, { room: RM, rot: -Math.PI / 2 + 0.35, loot: { coin: 3, bill: 2 } });
    this.place(buildSofa(M.velvetRed), -7.6, -8, { room: RM, rot: -Math.PI / 2, loot: { coin: 5, pearl: 1 } });
    const tbl = buildTable(1.2, 1.8, 0.55, M.wood);
    const teapot = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), M.porcelain);
    teapot.position.set(0, 0.78, 0.3);
    tbl.add(teapot);
    this.place(tbl, -10.6, -8, { room: RM, loot: { coin: 3 } });
    this.place(buildBookshelf(2.2, 3.2), -2.4, -15.5, { room: RM, loot: { coin: 4, bill: 2 } });
    this.place(buildBookshelf(2.0, 3.2), -16.3, -15.5, { room: RM, loot: { coin: 2, gem: 0.35 } });

    this.addWindow(-12, 2.6, -16 + T / 2 + 0.02, 0, { curtains: true, curtainColor: 0x7a1a28, room: RM });
    this.addWindow(-6.5, 2.6, -16 + T / 2 + 0.02, 0, { curtains: true, curtainColor: 0x7a1a28, room: RM });
    this.addSconce(-T / 2 - 0.03, -8, -Math.PI / 2, RM);
    this.place(buildSideTableVase(), -0.75, -3.2, { room: RM, rot: -Math.PI / 2, loot: { coin: 2, bill: 1 } });
    this.placeChest(-1.4, -13.6, RM, { coin: 6, bill: 3, pearl: 1 }, -Math.PI / 2);
  }

  // shared crackling-fire particle system (fireplaces, stoves)
  makeFireParticles(origin, glow, width = 0.7, N = 60) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3);
    const cols = new Float32Array(N * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.28, map: this.fireTex || (this.fireTex = makeGlowTexture('#ffffff')), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    pts.frustumCulled = false;
    this.root.add(pts);
    const life = new Float32Array(N).map(() => Math.random());
    const f = { pts, life, origin, glow, N, width };
    if (!this.fires) this.fires = [];
    this.fires.push(f);
    return f;
  }

  // ---------------------------------------------------------------
  // THE DINING ROOM — banquet table, floating candlesticks, boss throne
  buildDining() {
    const RM = R.DINING;
    const tb = this.tableBounds;
    const tw = tb.maxX - tb.minX;
    const td = tb.maxZ - tb.minZ;
    const tcx = (tb.minX + tb.maxX) / 2;
    const tcz = (tb.minZ + tb.maxZ) / 2;
    const table = buildBanquetTable(tw, td, repeatTex(makeTableclothTexture(), tw / 2, td / 2));
    table.position.set(tcx, 0, tcz);
    this.root.add(table);
    this.addCollider(tb.minX, tb.maxX, tb.minZ, tb.maxZ, 'table');

    for (let i = 0; i < 6; i++) {
      const x = 5 + i * 2;
      for (const [z, ry] of [[tb.minZ - 0.55, 0], [tb.maxZ + 0.55, Math.PI]]) {
        const c = buildChair(M.velvetPurple);
        c.position.set(x, 0, z);
        c.rotation.y = ry;
        this.root.add(c);
        this.addCollider(x - 0.28, x + 0.28, z - 0.28, z + 0.28, 'furniture');
        const plate = buildPlate();
        plate.position.set(x, 1.07, z < tcz ? tb.minZ + 0.45 : tb.maxZ - 0.45);
        this.root.add(plate);
      }
    }
    [[0, 5.4], [1, 7.7], [2, 12.3], [0, 14.6]].forEach(([kind, x]) => {
      const f = buildFood(kind);
      f.position.set(x, 1.08, tcz);
      this.root.add(f);
    });

    const throne = new THREE.Group();
    throne.add(box(1.4, 0.2, 1.4, M.velvetPurple, 0, 0.6, 0));
    throne.add(box(1.6, 3.2, 0.3, M.gold, 0, 1.8, -0.65));
    throne.add(box(1.2, 2.5, 0.08, M.velvetPurple, 0, 1.8, -0.48));
    throne.add(box(0.2, 0.9, 1.4, M.gold, -0.75, 1.0, 0));
    throne.add(box(0.2, 0.9, 1.4, M.gold, 0.75, 1.0, 0));
    throne.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), std(0xff4f7a, { emissive: 0x6a0020 })));
    throne.children[throne.children.length - 1].position.set(0, 3.5, -0.65);
    throne.position.set(18.6, 0, tcz);
    throne.rotation.y = -Math.PI / 2;
    throne.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    this.root.add(throne);
    this.addCollider(18.0, 19.6, tcz - 0.9, tcz + 0.9, 'furniture');

    for (const x of [5.5, 10, 14.5]) {
      const cs = buildCandlestick();
      cs.position.set(x, 2.3, tcz);
      cs.rotation.y = Math.random() * Math.PI;
      this.root.add(cs);
      this.candlesticks.push({ group: cs, baseY: 2.3, phase: Math.random() * Math.PI * 2, baseRot: cs.rotation.y });
    }
    for (const x of [7.5, 12.5]) this.addLight(x, 3.2, tcz, 0xffaa50, 8, 9, 1.4, RM, { flickerAmt: 0.22 });

    this.addWindow(4.5, 2.6, -16 + T / 2 + 0.02, 0, { curtains: true, curtainColor: 0x4a2a6a, room: RM });
    this.addWindow(15.5, 2.6, -16 + T / 2 + 0.02, 0, { curtains: true, curtainColor: 0x4a2a6a, room: RM });
    this.addSconce(20 - T / 2 - 0.03, -3.5, -Math.PI / 2, RM);
    this.place(buildHutch(), T / 2 + 0.36, -12.5, { room: RM, rot: Math.PI / 2, loot: { coin: 4, bill: 2, pearl: 1 } });
    this.placeChest(18.9, -14.7, RM, { coin: 8, bill: 3, gem: 1 }, -Math.PI / 4);
  }

  // ---------------------------------------------------------------
  setupTrappedPainting(char, onFree) {
    const art = this.paintingFrame.userData.art;
    art.material.map = makeTrappedPaintingTexture(char, false);
    art.material.needsUpdate = true;
    this.trapped = new TrappedPainting(this.paintingFrame, char, (game) => {
      art.material.map = makeTrappedPaintingTexture(char, true);
      art.material.emissive = new THREE.Color(0x224422);
      art.material.needsUpdate = true;
      onFree(game);
    });
    this.trapped.room = R.BALLROOM;
    this.trapped.label = 'free teammate';
    this.trapped.kind = 'painting';
    this.paintingFrame.visible = false;
  }

  revealTrappedPainting() {
    if (!this.trapped) return;
    this.trapped.active = true;
    this.paintingFrame.visible = true;
    this.paintingGlow.material.opacity = 0.6;
    if (!this.interactables.includes(this.trapped)) this.interactables.push(this.trapped);
  }

  setRoomLit(id, instant = false) {
    const r = this.rooms[id];
    if (!r) return;
    r.lit = true;
    if (instant) r.litLevel = 1;
  }

  unlockPortal(id) {
    const p = this.portals.find((q) => q.id === id);
    if (p) p.locked = false;
    if (this.stairBarriers) {
      for (const b of this.stairBarriers) {
        if (b.portal === id) b.fading = true;
      }
    }
  }

  portalNear(pos, roomId) {
    for (const p of this.portals) {
      if (p.room !== roomId) continue;
      if (Math.hypot(p.x - pos.x, p.z - pos.z) < p.r) return p;
    }
    return null;
  }

  nearestInteractable(pos, maxDist, filter = () => true) {
    let best = null;
    let bestD = maxDist;
    for (const it of this.interactables) {
      if (!filter(it)) continue;
      const c = it.worldCenter();
      const d = Math.hypot(c.x - pos.x, c.z - pos.z);
      if (d < bestD) {
        bestD = d;
        best = it;
      }
    }
    return best;
  }

  // group every top-level prop by room so whole rooms can be skipped when
  // they are outside the camera's view
  finalizeCulling() {
    const groups = new Map();
    const tmp = new THREE.Box3();
    for (const child of [...this.root.children]) {
      if (child === this.ground || child.isLight || child.isPoints) continue;
      tmp.setFromObject(child);
      if (tmp.isEmpty()) continue;
      const c = tmp.getCenter(new THREE.Vector3());
      const room = this.roomAt(c.x, c.z);
      const key = room ? room.id : 'misc';
      let g = groups.get(key);
      if (!g) {
        g = new THREE.Group();
        g.name = 'cull:' + key;
        g.userData.box = new THREE.Box3();
        g.userData.level = room ? room.level : null;
        groups.set(key, g);
      }
      g.add(child);
      g.userData.box.union(tmp);
    }
    for (const g of groups.values()) {
      g.userData.box.expandByScalar(1.5);
      this.root.add(g);
    }
    this.cullGroups = [...groups.values()];
    this.frustum = new THREE.Frustum();
    this.projScreen = new THREE.Matrix4();
  }

  cull(camera) {
    if (!camera || !this.cullGroups) return;
    camera.updateMatrixWorld();
    this.projScreen.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.projScreen);
    const cur = this.rooms[this.currentRoomId];
    const level = cur ? cur.level : null;
    for (const g of this.cullGroups) {
      const onFloor = !g.userData.level || !level || g.userData.level === level;
      g.visible = onFloor && this.frustum.intersectsBox(g.userData.box);
    }
  }

  // ---------------------------------------------------------------
  update(dt, t, playerPos, camera = null, currentRoomId = null) {
    this.time = t;
    if (currentRoomId) this.currentRoomId = currentRoomId;
    const cur = this.rooms[this.currentRoomId];
    const level = cur ? cur.level : '1F';

    // dollhouse cutaway: walls between camera and hero sink down
    for (const c of this.cutaways) {
      const cut = playerPos && c.z > playerPos.z + 0.35;
      const target = cut ? 0.12 : 1;
      c.cur += (target - c.cur) * Math.min(1, dt * 6);
      c.obj.scale.y = Math.max(0.001, c.cur);
    }

    // flickering candles, sconces, chandeliers, fires (virtual lights + flame sprites)
    for (const f of this.flickers) {
      const n = Math.sin(t * 9.1 + (f.v ? f.v.phase : 0)) * 0.5 + Math.sin(t * 23.3 + (f.v ? f.v.phase * 2.1 : 1)) * 0.3 + (Math.random() - 0.5) * 0.4;
      if (f.v) {
        const room = this.rooms[f.v.room];
        const litBoost = room ? 1 + room.litLevel * 0.6 : 1;
        f.v.intensity = f.v.base * (1 + n * f.v.amt) * litBoost;
      }
      if (f.sprite) {
        const s = 0.85 + n * 0.12;
        f.sprite.scale.set(s, s, s);
      }
      if (f.sprites) {
        f.sprites.forEach((sp, i) => {
          const s = f.bases[i] * (1 + Math.sin(t * 13 + i * 1.7) * 0.1);
          sp.scale.set(s, s, s);
        });
      }
    }
    if (this.chandelier) {
      this.chandelier.rotation.z = Math.sin(t * 0.7) * 0.025;
      this.chandelier.rotation.x = Math.sin(t * 0.5 + 1) * 0.02;
    }
    if (this.extraChandeliers) {
      this.extraChandeliers.forEach((c, i) => {
        c.rotation.z = Math.sin(t * 0.6 + i) * 0.025;
        c.rotation.x = Math.sin(t * 0.45 + i * 2) * 0.02;
      });
    }

    // fire particles (only on the hero's floor)
    if (this.fires) {
      for (const fire of this.fires) {
        const fr = this.roomAt(fire.origin.x, fire.origin.z);
        fire.pts.visible = !fr || fr.level === level;
        if (!fire.pts.visible) continue;
        const { pts, life, origin, glow, N, width } = fire;
        const p = pts.geometry.attributes.position;
        const c = pts.geometry.attributes.color;
        for (let i = 0; i < N; i++) {
          life[i] += dt * (0.9 + (i % 5) * 0.15);
          if (life[i] > 1) life[i] -= 1;
          const l = life[i];
          const sway = Math.sin(t * 6 + i) * 0.08;
          const across = width * Math.sin(i * 3.1) * (1 - l * 0.7);
          const depth = 0.25 * (1 - l) * Math.sin(i * 7.3) + sway * l;
          if (fire.alongX) p.setXYZ(i, origin.x + across, origin.y + l * 1.3, origin.z + depth);
          else p.setXYZ(i, origin.x + depth, origin.y + l * 1.3, origin.z + across);
          c.setXYZ(i, 1, 0.75 - l * 0.6, 0.25 - l * 0.25);
        }
        p.needsUpdate = true;
        c.needsUpdate = true;
        if (glow) {
          const gs = 2.4 + Math.sin(t * 11) * 0.2 + Math.random() * 0.2;
          glow.scale.set(gs, gs, gs);
        }
      }
    }

    for (const cs of this.candlesticks) {
      cs.group.position.y = cs.baseY + Math.sin(t * 1.3 + cs.phase) * 0.22;
      cs.group.rotation.y = cs.baseRot + Math.sin(t * 0.4 + cs.phase) * 0.4;
      cs.group.rotation.z = Math.sin(t * 0.9 + cs.phase) * 0.08;
    }

    if (this.clock) {
      this.clock.userData.pendulum.rotation.z = Math.sin(t * 2.6) * 0.28;
      this.clock.userData.hand.rotation.z = -t * 0.05;
    }

    for (const a of this.animated) {
      if (a.type === 'shaft') a.mesh.material.opacity = 0.18 + Math.sin(t * 0.6 + a.phase) * 0.05;
    }

    // animated props on the hero's floor
    for (const a of this.anims) {
      const r = this.rooms[a.room];
      if (!r || r.level === level) a.fn(t, dt);
    }

    // ghostly stair barriers fade when unlocked
    if (this.stairBarriers) {
      for (const b of this.stairBarriers) {
        if (b.fading) {
          b.bar.material.opacity = Math.max(0, b.bar.material.opacity - dt * 0.5);
          b.glow.material.opacity = Math.max(0, b.glow.material.opacity - dt * 0.5);
          b.bar.visible = b.bar.material.opacity > 0.01;
          b.glow.visible = b.bar.visible;
        } else {
          b.bar.material.opacity = 0.28 + Math.sin(t * 2.5 + b.bar.position.x) * 0.08;
        }
      }
    }

    // doors are updated by the game loop (they need player context);
    // curtains only animate in the hero's room (their cloth is expensive)
    for (const it of this.interactables) {
      if (it.kind === 'curtain' && it.room !== this.currentRoomId) continue;
      it.update(dt, t);
    }

    // room lights come up once a room is cleared
    for (const r of Object.values(this.rooms)) {
      const target = r.lit ? 1 : 0;
      r.litLevel += (target - r.litLevel) * Math.min(1, dt * 1.2);
      r.light.intensity = r.litLevel * 26;
    }

    if (this.trapped && this.trapped.active && !this.trapped.freed) {
      this.paintingGlow.material.opacity = 0.45 + Math.sin(t * 3) * 0.2;
    } else if (this.paintingGlow) {
      this.paintingGlow.material.opacity *= 0.97;
    }

    this.updateLightPool(dt, playerPos);
    this.cull(camera);
  }
}
