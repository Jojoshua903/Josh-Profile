// ==========================================================
// wings.js — interiors of the bigger mansion beyond the first
// four rooms: the West Wing (West Hall, Study, Library,
// Conservatory), the Ballroom & Kitchen, the whole second floor,
// the East Wing (East Hall, Washroom, Storage) and the B1
// basement (Cellar Stairs, Wine Cellar, Boiler Room, Crypt).
// Every builder receives the Mansion instance.
// ==========================================================
import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { ROOM_IDS } from '../config.js';
import { CHARACTERS } from '../characters.js';
import { makeTrappedPaintingTexture, makeLabelTexture } from '../graphics/textures.js';
import { buildPortraitFrame, buildChandelier, buildArmchair } from '../graphics/models.js';
import {
  T, std, box, glowSprite, M, MX,
  buildTable, buildChair, buildSofa, buildBookshelf, buildClock, buildPlant, buildSideTableVase, buildFireplace,
  buildArmor, buildDesk, buildGlobe, buildTypewriterTable, buildFilingCabinet, buildLadder, buildReadingTable, buildFloatingBooks,
  buildGrandPiano, buildHarp, buildCello, buildMusicStand, buildPalm, buildBust, buildColumn, buildMirror,
  buildStage, buildCurtainDrape, buildEasel, buildCounter, buildStove, buildSink, buildPotRack, buildBarrel, buildCask,
  buildCrate, buildJarShelf, buildPrepTable, buildUmbrellaStand, buildCoatRack, buildWashtub, buildMangle, buildIroningBoard,
  buildBasket, buildDustSheet, buildTrunk, buildBroomBucket, buildCellarHatch, buildStairHead, buildBathtub, buildToilet,
  buildBathSink, buildTowelRack, buildBed, buildWardrobe, buildVanity, buildNightstand, buildCrib, buildRockingHorse,
  buildToyBlocks, buildMobile, buildToyShelf, buildTeaTable, buildTelescope, buildArmillary, buildWineRack, buildTastingTable,
  buildLantern, buildBoiler, buildPipeRun, buildCoalPile, buildSarcophagus, buildFloorCandelabra, buildUrn, buildTreasurePile,
  buildCobweb, buildStarRug,
} from './props.js';

const R = ROOM_IDS;
const PI = Math.PI;

// ---------------------------------------------------------------
// small shared helpers
function chandelier(m, x, z, room, { y = 4.1, color = 0xffb060, base = 9, dist = 13 } = {}) {
  const ch = buildChandelier();
  ch.position.set(x, y, z);
  m.root.add(ch);
  if (!m.extraChandeliers) m.extraChandeliers = [];
  m.extraChandeliers.push(ch);
  m.addLight(x, y - 0.2, z, color, base, dist, 1.4, room, { flickerAmt: 0.18 });
  const f = m.flickers[m.flickers.length - 1];
  f.sprites = ch.userData.flames;
  f.bases = ch.userData.flames.map((s) => s.scale.x);
  return ch;
}

function lantern(m, x, z, room, { y = 4.4, color = 0xffb050, base = 6, dist = 9 } = {}) {
  m.place(buildLantern(), x, z, { room, y, collide: false });
  m.addLight(x, y - 0.3, z, color, base, dist, 1.5, room, { flickerAmt: 0.3 });
}

// a glowing lamp light at a prop's lampPos (desk lamps, nightstands)
function lampLight(m, obj, room, color = 0xffe0a0, base = 4, dist = 6) {
  if (!obj.userData.lampPos) return;
  obj.updateMatrixWorld(true);
  const p = obj.userData.lampPos.clone().applyMatrix4(obj.matrixWorld);
  m.addLight(p.x, p.y, p.z, color, base, dist, 1.6, room, { flickerAmt: 0.05 });
}

function cobweb(m, x, y, z, rotY, size = 1.6) {
  const w = buildCobweb(size);
  w.position.set(x, y, z);
  w.rotation.y = rotY;
  m.root.add(w);
  return w;
}

// cobwebs in the two back (north) corners of a room
function cornerWebs(m, room, y = 4.3) {
  const r = m.rooms[room];
  cobweb(m, r.minX + 0.75, y, r.minZ + 0.75, PI / 4);
  cobweb(m, r.maxX - 0.75, y, r.minZ + 0.75, -PI / 4);
}

function runner(m, x, z, w, d, colors, rot = 0) {
  return m.addRug(x, z, w, d, colors, rot);
}

// a fireplace on a wall with flickering light and particles
function fireplaceAt(m, x, z, rot, room) {
  const fp = buildFireplace();
  m.place(fp, x, z, { room, rot });
  const n = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
  m.addLight(x + n.x * 1.05, 1.1, z + n.z * 1.05, 0xff7a2a, 14, 10, 1.5, room, { flickerAmt: 0.45, fire: true });
  const glow = glowSprite(0xff8a30, 2.6, 0.75);
  glow.position.set(x + n.x * 0.75, 0.7, z + n.z * 0.75);
  m.root.add(glow);
  // particles: the fire sways across the hearth's width (along the wall)
  const origin = new THREE.Vector3(x + n.x * 0.6, 0.25, z + n.z * 0.6);
  const fire = m.makeFireParticles(origin, glow, 0.7);
  if (Math.abs(n.z) > 0.5) {
    // wall runs along x: spread along x instead of z
    fire.alongX = true;
  }
  return fp;
}

// ===================================================================
// AREA 2 — THE WEST WING
// ===================================================================
export function buildWestWing(m) {
  buildWestHall(m);
  buildStudy(m);
  buildLibrary(m);
  buildConservatory(m);
}

function buildWestHall(m) {
  const RM = R.WEST_HALL;
  const P = (o, x, z, opts = {}) => m.place(o, x, z, { room: RM, ...opts });
  runner(m, -21, -15, 1.7, 40, ['#3a1a14', '#c9952e', '#1f3a2a']);
  // suits of armour standing guard along the west wall
  for (const z of [-9.5, -18, -31.5]) P(buildArmor(), -23.3, z, { rot: PI / 2, loot: { coin: 3, bill: 1 } });
  P(buildArmor(), -18.7, -13, { rot: -PI / 2, loot: { coin: 2, pearl: 0.5 } });
  P(buildPlant(), -18.8, -34.8, { loot: { coin: 3 } });
  P(buildPlant(), -23.2, 5.2, { loot: { coin: 2, bill: 1 } });
  P(buildSideTableVase(), -18.85, -8, { rot: -PI / 2, loot: { coin: 3, bill: 1 } });
  P(buildSideTableVase(), -23.15, -21.5, { rot: PI / 2, loot: { bill: 2 } });
  const clock = buildClock();
  P(clock, -23.2, -35.2, { loot: { coin: 2, pearl: 1 } });
  m.anims.push({
    room: RM,
    fn: (t) => {
      clock.userData.pendulum.rotation.z = Math.sin(t * 2.4 + 1) * 0.28;
      clock.userData.hand.rotation.z = -t * 0.04;
    },
  });
  m.addSconce(-24 + T / 2 + 0.03, -6, PI / 2, RM);
  m.addSconce(-24 + T / 2 + 0.03, -21, PI / 2, RM);
  m.addSconce(-18 - T / 2 - 0.03, -20, -PI / 2, RM);
  m.addSconce(-18 - T / 2 - 0.03, -31, -PI / 2, RM);
  m.hangPortrait('art_peaks', RM, 'e', -4, {});
  m.hangPortrait('art_sea', RM, 'w', -14, {});
  m.hangPortrait('sonata', RM, 'e', -31.5, { frame: 0x9a6ad6 });
  m.hangPortrait('art_moon', RM, 'w', 0.5, { size: 1.0 });
  m.windowOn(RM, 'n', -21, { curtains: true, curtainColor: 0x1f3a2a });
  cornerWebs(m, RM);
  m.placeChest(-22.6, -12, RM, { coin: 5, bill: 2, pearl: 1 }, PI / 2);
}

function buildStudy(m) {
  const RM = R.STUDY;
  const P = (o, x, z, opts = {}) => m.place(o, x, z, { room: RM, ...opts });
  m.addRug(-33, -2.5, 6.5, 5, ['#2a3a5a', '#c9b27a', '#5a1a24']);
  const desk = P(buildDesk(), -31.5, -7, { loot: { coin: 4, bill: 3 } });
  lampLight(m, desk, RM, 0xd8ffc0, 4.5, 6);
  P(buildChair(M.velvetGreen), -31.5, -8.6, {});
  for (const [x, w] of [[-38.2, 2.2], [-35.8, 2.2], [-29.6, 2.2], [-27.2, 2.2]]) P(buildBookshelf(w, 3.6, 6), x, -13.55, { loot: { coin: 2, bill: 1 } });
  fireplaceAt(m, -39.35, -2, PI / 2, RM);
  m.place(buildArmchair(M.velvetRed), -35.6, 0.6, { room: RM, rot: -PI / 2 - 0.4, loot: { coin: 3, bill: 1 } });
  m.place(buildArmchair(M.velvetRed), -35.6, -4.6, { room: RM, rot: -PI / 2 + 0.4, loot: { coin: 2, pearl: 0.5 } });
  P(buildGlobe(), -37.5, -10, { loot: { coin: 2, gem: 0.3 } });
  P(buildTypewriterTable(), -27.5, 2.5, { loot: { coin: 3 } });
  P(buildFilingCabinet(), -24.8, -10.8, { rot: -PI / 2, loot: { bill: 3 } });
  P(buildFilingCabinet(), -24.8, -12, { rot: -PI / 2, loot: { coin: 3 } });
  P(buildPlant(), -39.1, 5.1, { loot: { coin: 3 } });
  P(buildPlant(), -24.9, 5.1, { loot: { coin: 2, bill: 1 } });
  m.windowOn(RM, 'w', 3.6, { curtains: true, curtainColor: 0x2a3a5a });
  m.windowOn(RM, 'w', -9.5, { curtains: true, curtainColor: 0x2a3a5a });
  m.hangPortrait('art_ship', RM, 'w', -6.2, { y: 3.7, size: 1.0 });
  m.hangPortrait('patchnotes', RM, 'e', -8, { frame: 0x5ac898 });
  m.addSconce(-24 - T / 2 - 0.03, 1.5, -PI / 2, RM);
  m.addSconce(-24 - T / 2 - 0.03, -7, -PI / 2, RM);
  cornerWebs(m, RM);
  m.placeChest(-38.2, -11.6, RM, { coin: 6, bill: 3, pearl: 1 });
  // Professor Patchnotes codes at the desk, facing the room
  m.bossSpots.patchnotes = { room: RM, pos: new THREE.Vector3(-31.5, 1.5, -8.4), roam: new THREE.Vector3(-32, 0, -2) };
}

function buildLibrary(m) {
  const RM = R.LIBRARY;
  const P = (o, x, z, opts = {}) => m.place(o, x, z, { room: RM, ...opts });
  m.addRug(-31, -25, 8, 6, ['#3a1a14', '#d6a647', '#203a5e']);
  // towering shelves on the north wall
  for (const x of [-38.3, -36, -33.7, -31.4, -29.1, -26.8]) P(buildBookshelf(2.2, 4.4, 7), x, -35.55, { loot: { coin: 2, bill: 1 } });
  // west wall shelves around a window
  for (const z of [-31.5, -29.2, -19.5, -17.2]) P(buildBookshelf(2.2, 4.0, 6), -39.55, z, { rot: PI / 2, loot: { coin: 2 } });
  m.windowOn(RM, 'w', -24.5, { curtains: true, curtainColor: 0x5a1a24 });
  // a freestanding double row of stacks
  for (const x of [-37, -34.8]) {
    P(buildBookshelf(2.2, 3.2, 5), x, -22.75, { loot: { coin: 2, bill: 1 } });
    P(buildBookshelf(2.2, 3.2, 5), x, -23.3, { rot: PI, collide: false });
  }
  P(buildReadingTable(), -29, -30, { loot: { coin: 3, bill: 2 } });
  P(buildReadingTable(), -29, -18.5, { loot: { coin: 3, pearl: 0.6 } });
  for (const [x, z, r] of [[-29, -31.1, 0], [-29, -28.9, PI], [-29, -19.6, 0], [-29, -17.4, PI]]) P(buildChair(M.velvetRed), x + 0.5, z, { rot: r });
  P(buildFloatingBooks(7, 1.3), -29, -30, { collide: false });
  P(buildFloatingBooks(5, 1.0), -35.9, -26, { collide: false });
  P(buildLadder(4.0), -25.6, -35.1, { collide: false });
  P(buildGlobe(), -25.4, -15.6, { loot: { gem: 0.4, coin: 1 } });
  chandelier(m, -32, -25, RM, { color: 0xffc070 });
  m.hangPortrait('art_fruit', RM, 'e', -32, {});
  m.hangPortrait('art_stars', RM, 'e', -18, { size: 1.0 });
  m.addSconce(-24 - T / 2 - 0.03, -21, -PI / 2, RM);
  cornerWebs(m, RM);
  m.placeChest(-37.6, -15.5, RM, { coin: 6, bill: 4, gem: 0.6 });
}

function buildConservatory(m) {
  const RM = R.CONSERVATORY;
  const P = (o, x, z, opts = {}) => m.place(o, x, z, { room: RM, ...opts });
  const rug = buildStarRug(3.4);
  rug.position.set(-9, 0.014, -31);
  m.root.add(rug);
  // Madame Sonata's grand piano (keyboard faces the audience)
  P(buildGrandPiano(), -9, -31, {});
  m.bossSpots.sonata = { room: RM, pos: new THREE.Vector3(-9, 1.5, -32.75), roam: new THREE.Vector3(-9, 0, -25) };
  P(buildHarp(), -4.2, -33.2, { rot: -0.4, loot: { coin: 3, pearl: 0.5 } });
  P(buildCello(), -14, -33.2, { rot: 0.4, loot: { coin: 3, bill: 1 } });
  P(buildMusicStand(), -5.6, -29.6, { rot: 0.3 });
  P(buildMusicStand(), -12.4, -29.6, { rot: -0.3 });
  // two rows of audience chairs facing the piano
  for (const z of [-24.2, -21.8]) {
    for (let x = -14; x <= -4; x += 2) P(buildChair(M.velvetGreen), x, z, { rot: PI });
  }
  for (const [x, z] of [[-16.6, -34.6], [-1.4, -34.6], [-16.6, -17.4], [-1.4, -17.4]]) P(buildPalm(), x, z, { loot: { coin: 2, bill: 1 } });
  P(buildBust(0xe8e4dc), -17.1, -20.5, { rot: PI / 2, loot: { coin: 2 } });
  P(buildBust(0xd0c8b8), -0.9, -27.5, { rot: -PI / 2, loot: { bill: 2 } });
  m.windowOn(RM, 'n', -14, { curtains: true, curtainColor: 0x1f5a3a });
  m.windowOn(RM, 'n', -4, { curtains: true, curtainColor: 0x1f5a3a });
  chandelier(m, -9, -25, RM, { color: 0xd8ffe0 });
  m.addSconce(-18 + T / 2 + 0.03, -32, PI / 2, RM);
  m.addSconce(-T / 2 - 0.03, -32, -PI / 2, RM);
  m.hangPortrait('art_flowers', RM, 'e', -21.5, {});
  // drifting music notes around the piano
  const notes = [];
  for (let i = 0; i < 5; i++) {
    const n = glowSprite(0xffd23a, 0.35, 0);
    m.root.add(n);
    notes.push({ n, ph: i / 5 });
  }
  m.anims.push({
    room: RM,
    fn: (t) => {
      for (const k of notes) {
        const u = (t * 0.25 + k.ph) % 1;
        k.n.position.set(-9 + Math.sin(u * 6 + k.ph * 9) * 1.4, 1.4 + u * 3, -31 + Math.cos(u * 5 + k.ph * 4) * 0.8);
        k.n.material.opacity = Math.sin(u * PI) * 0.8;
      }
    },
  });
  m.placeChest(-2.2, -18.6, RM, { coin: 8, bill: 4, gem: 1 });
}

// ===================================================================
// FINALE & AREA 4 — BALLROOM AND KITCHEN
// ===================================================================
export function buildBallroomAndKitchen(m) {
  buildBallroom(m);
  buildKitchen(m);
}

function buildBallroom(m) {
  const RM = R.BALLROOM;
  const P = (o, x, z, opts = {}) => m.place(o, x, z, { room: RM, ...opts });
  m.addRug(12, -27, 11, 8, ['#3a1a3a', '#f0d080', '#5a1a24']);
  P(buildStage(14, 4.5), 12, -37.6, {});
  const easel = buildEasel();
  P(easel, 10.4, -37.4, { y: 0.62, collide: false });
  m.bossSpots.varnish = { room: RM, pos: new THREE.Vector3(12.8, 2.2, -36.8), roam: new THREE.Vector3(12, 0, -27) };
  P(buildCurtainDrape(3, 5, 0x7a1a28), 3.8, -39.6, { collide: false });
  P(buildCurtainDrape(3, 5, 0x7a1a28), 20.2, -39.6, { collide: false });
  for (const [x, z] of [[2.6, -31], [2.6, -22], [21.4, -31], [21.4, -22]]) P(buildColumn(5.2), x, z, {});
  chandelier(m, 7.5, -27, RM, { color: 0xfff0c0, base: 10, dist: 14 });
  chandelier(m, 16.5, -27, RM, { color: 0xfff0c0, base: 10, dist: 14 });
  const mir1 = buildMirror(1.6, 2.6);
  P(mir1, 0 + T / 2 + 0.06, -34, { y: 2.6, rot: PI / 2, collide: false });
  const mir2 = buildMirror(1.6, 2.6);
  P(mir2, 0 + T / 2 + 0.06, -18.5, { y: 2.6, rot: PI / 2, collide: false });
  P(buildSofa(M.velvetPurple), 0.9, -26.5, { rot: PI / 2, loot: { coin: 4, bill: 2 } });
  P(buildSofa(M.velvetPurple), 23.1, -26.5, { rot: -PI / 2, loot: { coin: 3, pearl: 1 } });
  for (const z of [-34, -20]) m.windowOn(RM, 'e', z, { curtains: true, curtainColor: 0x4a2a6a });
  for (const [x, z] of [[1.2, -39.2], [22.8, -39.2], [1.2, -17], [17.5, -17.2]]) P(buildPalm(), x, z, { loot: { coin: 3 } });
  m.addSconce(T / 2 + 0.03, -30, PI / 2, RM);
  m.addSconce(T / 2 + 0.03, -22.5, PI / 2, RM);
  m.addSconce(24 - T / 2 - 0.03, -27, -PI / 2, RM);
  // the cursed painting (hidden until Master Varnish is captured)
  const ptex = makeTrappedPaintingTexture(CHARACTERS[1], false);
  const frame = buildPortraitFrame(ptex, 1.5, 1.875, 0x9a6ad6);
  frame.position.set(12, 3.4, -40 + T / 2 + 0.07);
  frame.visible = false;
  m.root.add(frame);
  const pglow = glowSprite(0xb07dff, 4.5, 0);
  pglow.position.set(0, 0, 0.3);
  frame.add(pglow);
  m.paintingFrame = frame;
  m.paintingGlow = pglow;
  m.trapped = null;
  // a sign over the stage
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.5), new THREE.MeshStandardMaterial({
    map: makeLabelTexture('GALLERY OF LOST SOULS', { bg: '#2a1020', fg: '#f0d080', w: 512, h: 64, font: 'bold 34px Georgia, serif' }), emissive: 0x2a1a00,
  }));
  sign.position.set(12, 4.75, -40 + T / 2 + 0.05);
  m.root.add(sign);
  m.placeChest(2.2, -18.2, RM, { coin: 10, bill: 5, gem: 1, pearl: 1 });
}

function buildKitchen(m) {
  const RM = R.KITCHEN;
  const P = (o, x, z, opts = {}) => m.place(o, x, z, { room: RM, ...opts });
  P(buildCounter(3.2), 27.6, -15.5, { loot: { coin: 3, bill: 1 } });
  const stove = P(buildStove(), 31.8, -15.4, { loot: { coin: 2, pearl: 0.5 } });
  m.addLight(31.8, 0.8, -14.6, 0xff7a2a, 6, 6, 1.6, RM, { flickerAmt: 0.4, fire: true });
  P(buildCounter(2.4), 33.5, -11.6, { rot: -PI / 2, loot: { coin: 2 } });
  P(buildSink(), 33.5, -8, { rot: -PI / 2, loot: { bill: 2 } });
  P(buildJarShelf(2.2), 33.7, -3.6, { rot: -PI / 2, loot: { coin: 3, bill: 1 } });
  P(buildPrepTable(), 27, -7.5, { loot: { coin: 4, bill: 2 } });
  P(buildPotRack(2.8), 27, -7.5, { y: 4.2, collide: false });
  P(buildBarrel(1.2), 20.8, -7, { loot: { coin: 3 } });
  P(buildBarrel(1.0), 20.9, -8.3, { loot: { bill: 1 } });
  P(buildCrate(1), 20.9, -11.2, { loot: { coin: 2 } });
  P(buildCrate(0.7), 20.9, -12.4, {});
  for (const [x, z, r] of [[25.6, -6.3, PI], [28.4, -6.3, PI], [25.6, -8.8, 0], [28.4, -8.8, 0]]) P(buildChair(std(0x9a6a3a)), x, z, { rot: r });
  m.windowOn(RM, 'e', -12.2, {});
  m.hangPortrait('art_fruit', RM, 'w', -12.5, {});
  lantern(m, 24, -11, RM, { color: 0xffd090 });
  lantern(m, 30, -4, RM, { color: 0xffd090 });
  cornerWebs(m, RM);
  m.placeChest(30, -2.2, RM, { coin: 7, bill: 3, pearl: 1 });
  void stove;
}

// ===================================================================
// AREA 3 — THE SECOND FLOOR
// ===================================================================
export function buildUpstairs(m) {
  buildUpperHall(m);
  buildBathroom(m);
  buildGuestRoom(m);
  buildNursery(m);
  buildBedroom(m);
  buildObservatory(m);
}

function buildUpperHall(m) {
  const RM = R.UPPER_HALL;
  const P = (o, x, z, opts = {}) => m.place(o, x, z, { room: RM, ...opts });
  runner(m, 0, -97, 1.6, 27, ['#4a1a2a', '#e0b060', '#203a5e'], PI / 2);
  const head = buildStairHead(3.6, 3);
  P(head, 0, -94.2, { collide: false });
  m.addCollider(-1.9, -1.7, -95.7, -92.7, 'furniture');
  m.addCollider(1.7, 1.9, -95.7, -92.7, 'furniture');
  P(buildBust(0xe8e4dc), -6, -99.3, { loot: { coin: 2, bill: 1 } });
  P(buildBust(0xc8c0d8), 8.5, -99.3, { loot: { coin: 3 } });
  P(buildSideTableVase(), -2.6, -99.4, { loot: { coin: 3, bill: 1 } });
  P(buildSideTableVase(), 11.5, -99.4, { loot: { bill: 2 } });
  P(buildPlant(), -13.1, -92.9, { loot: { coin: 2 } });
  P(buildPlant(), 13.1, -92.9, { loot: { coin: 3 } });
  m.hangPortrait('art_moon', RM, 'n', -7.5, { size: 1.1 });
  m.hangPortrait('snoozewell', RM, 'n', 9.8, { frame: 0x6a90d0 });
  m.hangPortrait('art_mansion', RM, 'n', -0.5, { size: 1.0, y: 3.2 });
  m.addSconce(-4.5, -100 + T / 2 + 0.03, 0, RM);
  m.addSconce(6, -100 + T / 2 + 0.03, 0, RM);
  m.addSconce(12.8, -100 + T / 2 + 0.03, 0, RM);
  m.placeChest(10.5, -93.5, RM, { coin: 6, bill: 3 });
}

function buildBathroom(m) {
  const RM = R.BATHROOM;
  const P = (o, x, z, opts = {}) => m.place(o, x, z, { room: RM, ...opts });
  P(buildBathtub(), -22.8, -98.6, { loot: { coin: 3, pearl: 0.5 } });
  m.addHangingCloth(-24, 1.9, -97.3, 0, RM, { w: 1.0, h: 2.6, color: 0xa8c8f0, loot: { coin: 2, bill: 1 } });
  m.addHangingCloth(-21.8, 1.9, -97.3, 0, RM, { w: 1.0, h: 2.6, color: 0xa8c8f0, loot: { coin: 2 } });
  m.root.add(box(3.4, 0.05, 0.05, M.brass, -22.9, 3.25, -97.3, { cast: false }));
  P(buildToilet(), -15.1, -99.4, { loot: { coin: 1, bill: 1 } });
  P(buildBathSink(), -18.6, -99.55, { loot: { coin: 2 } });
  P(buildTowelRack(), -25.6, -92.6, { rot: PI / 2 });
  const cup = buildWardrobe(0xe8e4dc);
  cup.scale.set(0.7, 0.8, 0.6);
  P(cup, -18, -90.9, { rot: PI, loot: { coin: 3, bill: 1 } });
  m.addRug(-20.5, -94.5, 2.4, 1.6, ['#3a6aa8', '#f2f6fa', '#a8c8f0']);
  m.windowOn(RM, 'w', -96.6, { curtains: true, curtainColor: 0x3a6aa8 });
  m.addSconce(-16.5, -100 + T / 2 + 0.03, 0, RM);
  m.placeChest(-15.6, -91.6, RM, { coin: 5, bill: 2, pearl: 1 });
}

function buildGuestRoom(m) {
  const RM = R.GUEST_ROOM;
  const P = (o, x, z, opts = {}) => m.place(o, x, z, { room: RM, ...opts });
  P(buildBed({ w: 1.7, d: 2.7, blanket: 0x2f6a2a }), 22.4, -98.2, { loot: { coin: 3, bill: 2 } });
  const ns = P(buildNightstand(), 24.8, -99.3, { loot: { coin: 2 } });
  lampLight(m, ns, RM);
  P(buildWardrobe(0x6a3a1a), 16.6, -99.5, { loot: { coin: 3, bill: 1 } });
  P(buildVanity(), 25.35, -92.6, { rot: -PI / 2, loot: { coin: 2, gem: 0.3 } });
  P(buildTrunk(), 15.3, -91.4, { rot: PI / 2, loot: { coin: 4 } });
  m.addRug(20.2, -94.6, 4, 3, ['#3a4a2a', '#d8c890', '#5b1a24']);
  m.windowOn(RM, 'e', -96.4, { curtains: true, curtainColor: 0x2f6a2a });
  m.hangPortrait('art_flowers', RM, 'n', 24.2, { size: 1.0, y: 3.2 });
  m.placeChest(15.2, -98.9, RM, { coin: 5, bill: 3 });
}

function buildNursery(m) {
  const RM = R.NURSERY;
  const P = (o, x, z, opts = {}) => m.place(o, x, z, { room: RM, ...opts });
  m.addRug(-17, -112, 8, 6, ['#f5b8c8', '#a8c8f0', '#f6e08a']);
  P(buildCrib(), -20, -120.7, { loot: { coin: 3, bill: 1 } });
  P(buildMobile(), -20, -120.7, { y: 2.6, collide: false });
  P(buildRockingHorse(), -14, -113, { loot: { coin: 3, pearl: 0.5 } });
  P(buildToyBlocks(), -18.5, -107.5, { collide: false });
  P(buildToyShelf(), -11, -121.4, { loot: { coin: 3, bill: 1 } });
  P(buildTeaTable(), -22.6, -110, { loot: { coin: 2 } });
  const ns = P(buildNightstand({ lampColor: 0xffb0d0 }), -24.9, -121, { loot: { coin: 2 } });
  lampLight(m, ns, RM, 0xffb0d0, 4, 6);
  P(buildWardrobe(0xf0d8e0), -25.2, -104.2, { rot: PI / 2, loot: { coin: 3, bill: 1 } });
  const toybox = buildTrunk();
  toybox.traverse((o) => {
    if (o.isMesh && o.material === M.brass) o.material = MX.pastelYellow;
  });
  P(toybox, -9.2, -106.5, { rot: -PI / 2, loot: { coin: 4, bill: 1 } });
  m.windowOn(RM, 'w', -114.5, { curtains: true, curtainColor: 0xf5b8c8 });
  m.windowOn(RM, 'n', -15.2, { curtains: true, curtainColor: 0xa8c8f0 });
  m.hangPortrait('pip', RM, 'e', -110, { frame: 0xd080b8 });
  m.addSconce(-8 - T / 2 - 0.03, -117, -PI / 2, RM);
  m.placeChest(-24.4, -101.8, RM, { coin: 6, bill: 3, pearl: 1 });
  // Pixel Pip floats over the rug, glued to his handheld
  m.bossSpots.pip = { room: RM, pos: new THREE.Vector3(-17, 1.3, -111.5), roam: new THREE.Vector3(-17, 0, -112) };
}

function buildBedroom(m) {
  const RM = R.BEDROOM;
  const P = (o, x, z, opts = {}) => m.place(o, x, z, { room: RM, ...opts });
  m.addRug(3, -111.5, 8, 5.5, ['#2a1a3a', '#c9952e', '#7a1a28']);
  P(buildBed({ w: 3.2, d: 3.6, blanket: 0x4a2a6a, posts: true, canopy: 0x2a1a3a }), 3, -119.6, {});
  m.bossSpots.snoozewell = { room: RM, pos: new THREE.Vector3(3, 1.6, -119.2), roam: new THREE.Vector3(3, 0, -109) };
  const n1 = P(buildNightstand({ lampColor: 0xc8b0ff }), 0.3, -121.2, { loot: { coin: 2, bill: 1 } });
  const n2 = P(buildNightstand({ lampColor: 0xc8b0ff }), 5.7, -121.2, { loot: { coin: 2, pearl: 0.5 } });
  lampLight(m, n1, RM, 0xc8b0ff, 4, 6);
  lampLight(m, n2, RM, 0xc8b0ff, 4, 6);
  P(buildWardrobe(0x4a1a2a), -6.9, -114.5, { rot: PI / 2, loot: { coin: 3, bill: 2 } });
  P(buildWardrobe(0x4a1a2a), -6.9, -110.4, { rot: PI / 2, loot: { coin: 2, gem: 0.3 } });
  P(buildVanity(), 13.3, -116.5, { rot: -PI / 2, loot: { coin: 3, gem: 0.3 } });
  fireplaceAt(m, 13.35, -106.5, -PI / 2, RM);
  m.place(buildArmchair(M.velvetPurple), 9.6, -104.6, { room: RM, rot: PI / 2 - 0.4, loot: { coin: 3 } });
  m.place(buildArmchair(M.velvetPurple), 9.6, -108.4, { room: RM, rot: PI / 2 + 0.4, loot: { coin: 2, bill: 1 } });
  P(buildSideTableVase(), -6.9, -102.5, { rot: PI / 2, loot: { coin: 2 } });
  m.windowOn(RM, 'n', -4.5, { curtains: true, curtainColor: 0x4a2a6a });
  m.windowOn(RM, 'n', 10.5, { curtains: true, curtainColor: 0x4a2a6a });
  m.hangPortrait('art_moon', RM, 'w', -106.5, {});
  chandelier(m, 3, -110, RM, { color: 0xd8c8ff, base: 7 });
  // floating "Z"s over the bed while he sleeps
  const zs = [];
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeLabelTexture('Z', { bg: 'rgba(0,0,0,0)', fg: '#c4d9ff', w: 64, h: 64, font: 'bold 52px Georgia, serif' }), transparent: true, depthWrite: false }));
    s.scale.set(0.6, 0.6, 0.6);
    m.root.add(s);
    zs.push({ s, ph: i / 3 });
  }
  m.snoreZs = zs;
  m.anims.push({
    room: RM,
    fn: (t) => {
      const asleep = !m.snoozeAwake;
      for (const k of zs) {
        const u = (t * 0.3 + k.ph) % 1;
        k.s.position.set(3.6 + u * 1.4, 2.4 + u * 1.8, -119 + Math.sin(u * 6) * 0.3);
        k.s.material.opacity = asleep ? Math.sin(u * PI) : 0;
      }
    },
  });
  m.placeChest(-5.6, -120.2, RM, { coin: 8, bill: 4, gem: 1 });
}

function buildObservatory(m) {
  const RM = R.OBSERVATORY;
  const P = (o, x, z, opts = {}) => m.place(o, x, z, { room: RM, ...opts });
  const rug = buildStarRug(3.2);
  rug.position.set(22, 0.014, -111);
  m.root.add(rug);
  P(buildTelescope(), 22, -117.5, { loot: { gem: 1, pearl: 1 } });
  P(buildArmillary(), 16.8, -106.5, { loot: { coin: 3, gem: 0.3 } });
  m.addLight(16.8, 1.6, -106.5, 0xffc040, 3, 5, 1.6, RM, { flickerAmt: 0.05 });
  const desk = P(buildDesk(), 27.6, -104.5, { rot: -PI / 2, loot: { coin: 3, bill: 2 } });
  lampLight(m, desk, RM, 0xb0d0ff, 4, 6);
  P(buildBookshelf(2.2, 3.6, 6), 16.4, -121.55, { loot: { coin: 2 } });
  P(buildBookshelf(2.2, 3.6, 6), 27.6, -121.55, { loot: { coin: 2, bill: 1 } });
  P(buildGlobe(), 28.6, -112.5, { loot: { coin: 2 } });
  m.windowOn(RM, 'n', 22, {});
  m.windowOn(RM, 'e', -112.5, {});
  m.hangPortrait('art_stars', RM, 'w', -112, {});
  m.hangPortrait('art_stars', RM, 'w', -105.5, { size: 1.0 });
  // twinkling stars painted on the ceiling-height walls
  const stars = [];
  for (let i = 0; i < 24; i++) {
    const s = glowSprite(i % 4 ? 0xe8eeff : 0xffe68c, 0.25, 0.6);
    s.position.set(14.6 + Math.random() * 14.8, 4.2 + Math.random() * 0.8, -121.6 + Math.random() * 0.3);
    m.root.add(s);
    stars.push(s);
  }
  m.anims.push({ room: RM, fn: (t) => stars.forEach((s, i) => (s.material.opacity = 0.35 + Math.sin(t * 2 + i * 1.7) * 0.3)) });
  m.placeChest(28.6, -120.2, RM, { coin: 6, gem: 1, pearl: 1 });
}

// ===================================================================
// AREA 4 — THE EAST WING
// ===================================================================
export function buildEastWing(m) {
  buildEastHall(m);
  buildWashroom(m);
  buildStorage(m);
}

function buildEastHall(m) {
  const RM = R.EAST_HALL;
  const P = (o, x, z, opts = {}) => m.place(o, x, z, { room: RM, ...opts });
  runner(m, 23, 11, 1.7, 20.5, ['#1a2a3a', '#a8c0e0', '#5b1a24']);
  m.windowOn(RM, 'w', 10.5, { curtains: true, curtainColor: 0x1f3f8f });
  m.windowOn(RM, 'w', 17.5, { curtains: true, curtainColor: 0x1f3f8f });
  P(buildCoatRack(), 25.3, 1.2, { loot: { coin: 2, bill: 1 } });
  P(buildUmbrellaStand(), 25.4, 9.2, { loot: { coin: 2 } });
  P(buildArmor(), 25.3, 12.2, { rot: -PI / 2, loot: { coin: 3, pearl: 0.5 } });
  P(buildArmor(), 20.7, 14, { rot: PI / 2, loot: { coin: 3 } });
  P(buildPlant(), 25.2, 21.1, { loot: { coin: 3 } });
  P(buildSideTableVase(), 20.85, 20.5, { rot: PI / 2, loot: { coin: 2, bill: 1 } });
  m.hangPortrait('art_windmill', RM, 'e', 11, {});
  m.hangPortrait('boilerbeard', RM, 'e', 20, { frame: 0xc8622a });
  m.addSconce(20 + T / 2 + 0.03, 14, PI / 2, RM);
  m.addSconce(26 - T / 2 - 0.03, 8, -PI / 2, RM);
  m.addSconce(26 - T / 2 - 0.03, 19, -PI / 2, RM);
  m.placeChest(21.1, 7.4, RM, { coin: 5, bill: 2 }, PI / 2);
}

function buildWashroom(m) {
  const RM = R.WASHROOM;
  const P = (o, x, z, opts = {}) => m.place(o, x, z, { room: RM, ...opts });
  P(buildWashtub(), 29.2, 1.6, { loot: { coin: 3 } });
  P(buildWashtub(), 32.2, 1.6, { loot: { coin: 2, bill: 1 } });
  P(buildMangle(), 35, 7.4, { rot: -PI / 2, loot: { coin: 2, pearl: 0.5 } });
  P(buildIroningBoard(), 30.4, 8.9, { loot: { bill: 2 } });
  P(buildBasket(), 35.1, 1.1, { loot: { coin: 2 } });
  P(buildBasket(0x9a7a3a), 27.1, 9.1, { loot: { coin: 1, bill: 1 } });
  // clothesline with vacuumable sheets
  for (const x of [28.9, 35.4]) m.root.add(box(0.08, 4.2, 0.08, M.darkWood, x, 2.1, 5));
  m.root.add(box(6.5, 0.02, 0.02, MX.linen, 32.15, 4.05, 5, { cast: false }));
  m.addHangingCloth(30.1, 2.75, 5, 0, RM, { w: 1.1, h: 2.4, color: 0xf2ead6, loot: { coin: 2, bill: 1 } });
  m.addHangingCloth(32.2, 2.75, 5, 0, RM, { w: 1.1, h: 2.4, color: 0xf5b8c8, loot: { coin: 3 } });
  m.addHangingCloth(34.3, 2.75, 5, 0, RM, { w: 1.1, h: 2.4, color: 0xa8c8f0, loot: { bill: 2 } });
  m.windowOn(RM, 'e', 4, {});
  lantern(m, 31, 7.5, RM, { color: 0xe8f4ff, base: 5 });
  m.placeChest(34.6, 9.1, RM, { coin: 5, bill: 3 });
}

function buildStorage(m) {
  const RM = R.STORAGE;
  const P = (o, x, z, opts = {}) => m.place(o, x, z, { room: RM, ...opts });
  P(buildCrate(1), 27.2, 11.2, { loot: { coin: 2 } });
  P(buildCrate(1), 28.3, 11.2, { loot: { bill: 1 } });
  P(buildCrate(0.8), 27.7, 11.2, { y: 1.0, collide: false });
  P(buildCrate(1.2), 35, 21, { loot: { coin: 3 } });
  P(buildCrate(0.9), 35.1, 19.6, { loot: { coin: 2 } });
  P(buildBarrel(1.2), 35.2, 16.2, { loot: { coin: 2, bill: 1 } });
  P(buildBarrel(1.1), 35.3, 17.4, {});
  P(buildDustSheet(2.0, 1.1, 1.0), 30.4, 20.8, { loot: { coin: 3, bill: 1 } });
  P(buildDustSheet(1.3, 2.3, 0.9), 32.9, 21.1, { loot: { coin: 2, pearl: 0.5 } });
  P(buildDustSheet(1.1, 0.9, 1.1), 28.6, 17.2, { loot: { coin: 3 } });
  P(buildTrunk(), 31, 11.1, { loot: { coin: 4, bill: 1 } });
  P(buildBroomBucket(), 35.3, 11.2, { loot: { coin: 1 } });
  P(buildCellarHatch(), 33, 13, { collide: false });
  m.hangPortrait('art_peaks', RM, 'n', 33.5, { size: 1.0, y: 3.2 });
  lantern(m, 30.5, 15.5, RM, { color: 0xffc070, base: 5 });
  cobweb(m, 35.25, 4.3, 10.75, -PI / 4);
  cobweb(m, 26.75, 4.3, 10.75, PI / 4);
  m.placeChest(27.6, 20.3, RM, { coin: 6, bill: 3, pearl: 1 });
}

// ===================================================================
// AREA 4 — THE BASEMENT (B1)
// ===================================================================
export function buildBasement(m) {
  buildStairwell(m);
  buildWineCellar(m);
  buildBoilerRoom(m);
  buildCrypt(m);
}

function buildStairwell(m) {
  const RM = R.STAIRWELL;
  const P = (o, x, z, opts = {}) => m.place(o, x, z, { room: RM, ...opts });
  // stone steps climbing into the north wall toward the Storage Room
  const stairs = new THREE.Group();
  for (let i = 0; i < 8; i++) stairs.add(box(3, 0.22 * (i + 1), 0.4, MX.stone, 0, 0.11 * (i + 1), 3.2 - i * 0.4));
  const hole = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.0), new THREE.MeshBasicMaterial({ color: 0x030304 }));
  hole.position.set(0, 2.1, T / 2 + 0.03);
  stairs.add(hole);
  stairs.add(box(0.1, 1.0, 3.4, MX.darkSteel, 1.6, 1.4, 1.7));
  const glow = glowSprite(0xffd8a0, 2.4, 0.3);
  glow.position.set(0, 2.6, 0.6);
  stairs.add(glow);
  P(stairs, -3, 100, { collide: false });
  m.addCollider(-4.7, -4.5, 100, 103.6, 'furniture');
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.3), new THREE.MeshStandardMaterial({ map: makeLabelTexture('UP ▲ STORAGE', { bg: '#2a2620', fg: '#d6a647', w: 256, h: 44, font: 'bold 24px monospace' }) }));
  sign.position.set(-3, 3.9, 100 + T / 2 + 0.04);
  m.root.add(sign);
  lantern(m, 3, 104.5, RM, { color: 0xffc070 });
  P(buildBarrel(1.2), 5.1, 108.9, { loot: { coin: 2 } });
  P(buildCrate(0.9), -5, 109, { loot: { coin: 2, bill: 1 } });
  cornerWebs(m, RM);
  m.placeChest(-0.2, 108.8, RM, { coin: 4, bill: 2 });
}

function buildWineCellar(m) {
  const RM = R.WINE_CELLAR;
  const P = (o, x, z, opts = {}) => m.place(o, x, z, { room: RM, ...opts });
  for (const x of [-23.6, -20.8, -18, -15.2, -12.4, -9.6]) P(buildWineRack(2.6, 2.8), x, 94.55, { loot: { coin: 2, bill: 1 } });
  for (const z of [99.5, 103.4, 107.3]) P(buildCask(1.8, 0.8), -24.6, z, { rot: PI / 2, loot: { coin: 3, pearl: 0.4 } });
  P(buildWineRack(2.6, 2.4), -16.5, 110.2, { loot: { coin: 2 } });
  P(buildWineRack(2.6, 2.4), -12.5, 110.2, { loot: { bill: 2 } });
  P(buildTastingTable(), -15.5, 104.8, { loot: { coin: 3, bill: 1 } });
  P(buildChair(std(0x5a2a14)), -15.5, 103.7, {});
  P(buildChair(std(0x5a2a14)), -15.5, 105.9, { rot: PI });
  P(buildBarrel(1.2), -7.6, 112.6, { loot: { coin: 2 } });
  P(buildBarrel(1.0), -8.8, 113, {});
  P(buildBarrel(1.2), -7.5, 96.4, { loot: { coin: 2, bill: 1 } });
  lantern(m, -20, 104, RM);
  lantern(m, -11, 101, RM);
  lantern(m, -11, 109, RM, { base: 4 });
  cornerWebs(m, RM);
  cobweb(m, -25.3, 3.6, 113.2, (3 * PI) / 4);
  m.placeChest(-7.6, 99.4, RM, { coin: 6, bill: 3, pearl: 1 }, -PI / 2);
}

function buildBoilerRoom(m) {
  const RM = R.BOILER_ROOM;
  const P = (o, x, z, opts = {}) => m.place(o, x, z, { room: RM, ...opts });
  P(buildBoiler(), 16, 96.5, {});
  m.bossSpots.boilerbeard = { room: RM, pos: new THREE.Vector3(16, 1.6, 100.4), roam: new THREE.Vector3(16, 0, 106) };
  m.addLight(16, 1.0, 98.6, 0xff6a1a, 16, 12, 1.4, RM, { flickerAmt: 0.4, fire: true });
  P(buildPipeRun(18, 4.4), 16, 94.5, { collide: false });
  const east = buildPipeRun(18, 3.6);
  P(east, 25.4, 104, { rot: PI / 2, collide: false });
  P(buildCoalPile(), 9, 97.6, { loot: { coin: 3, gem: 0.3 } });
  const bench = buildTable(2.2, 1.0, 0.95, M.darkWood);
  bench.add(box(0.5, 0.1, 0.2, MX.darkSteel, -0.5, 1.06, 0));
  bench.add(box(0.06, 0.06, 0.6, MX.rust, 0.3, 1.04, 0.1));
  P(bench, 24.6, 109, { rot: -PI / 2, loot: { coin: 2, bill: 2 } });
  P(buildCrate(1), 24.6, 112.6, { loot: { coin: 2 } });
  P(buildBarrel(1.2, MX.rust), 7.2, 112.6, { loot: { coin: 2 } });
  lantern(m, 9, 108, RM, { color: 0xffb070, base: 5 });
  // puffs of steam drifting up from the pipes
  const steam = [];
  for (let i = 0; i < 6; i++) {
    const s = glowSprite(0xffffff, 1.0, 0);
    m.root.add(s);
    steam.push({ s, x: 9 + i * 3, ph: i / 6 });
  }
  m.anims.push({
    room: RM,
    fn: (t) => {
      for (const k of steam) {
        const u = (t * 0.35 + k.ph) % 1;
        k.s.position.set(k.x + Math.sin(u * 4) * 0.3, 3.8 + u * 1.4, 95.2);
        const sc = 0.6 + u * 1.4;
        k.s.scale.set(sc, sc, sc);
        k.s.material.opacity = Math.sin(u * PI) * 0.22;
      }
    },
  });
  m.placeChest(24.3, 96.4, RM, { coin: 8, bill: 4, gem: 1 });
}

function buildCrypt(m) {
  const RM = R.CRYPT;
  const P = (o, x, z, opts = {}) => m.place(o, x, z, { room: RM, ...opts });
  P(buildSarcophagus(0x8a7a5a), -3.2, 89.5, { loot: { coin: 4, pearl: 1 } });
  P(buildSarcophagus(0x7a7a8a), 3.2, 89.5, { loot: { coin: 4, bill: 2 } });
  P(buildSarcophagus(0x9a8a6a), 0, 84.3, { rot: PI / 2, loot: { gem: 1, coin: 3 } });
  for (const [x, z, col] of [[-5, 84, 0x9ab0ff], [5, 84, 0x9ab0ff], [-5, 95, 0xffb050], [5, 95.5, 0xffb050]]) {
    P(buildFloorCandelabra(), x, z, {});
    m.addLight(x, 2.0, z, col, 4, 7, 1.6, RM, { flickerAmt: 0.3 });
  }
  P(buildUrn(), -5.4, 91.5, { loot: { coin: 3, bill: 1 } });
  P(buildUrn(), 5.4, 91.5, { loot: { coin: 2, pearl: 0.6 } });
  P(buildBust(0x8a8a90), -4.8, 98.6, { rot: PI, loot: { coin: 2 } });
  P(buildTreasurePile(), 0, 93.2, { collide: false });
  m.hangPortrait('art_ship', RM, 'w', 92, {});
  m.hangPortrait('varnish', RM, 'n', 3.5, { frame: 0xd0bc60, y: 3.4 });
  cornerWebs(m, RM);
  cobweb(m, -5.25, 3.0, 99.2, (3 * PI) / 4, 1.3);
  m.placeChest(0, 95.4, RM, { gem: 2, pearl: 3, bill: 6, coin: 6 });
}
