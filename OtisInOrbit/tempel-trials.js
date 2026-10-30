import { THREE, scene, toon, addOutline, V3, puff, toast, damp, label } from './core.js';
import { addCookie } from './cookies.js';
import { getSave } from './save.js';
import * as sfx from './sfx.js';
import { block, pillar, movers, boxes, syncBox, STONE, GOLD, DARK, fountain, FOUNTAIN, PUMP, SYMBOLS, ORDER, SECRET, MURAL, secretTiles, LEDGE, HOURGLASS } from './tempel-world.js';
import { HALL, ZIG } from './tempel-terrain.js';

// The temple's puzzles. Each one opens something: a part for Byte, something for Otis, or a cosmic cookie.
//   Blokkenhof     – push stone blocks onto the plates (and a third one into the little alcove)
//   Spiegelzaal    – ground-pound the mirror stands to turn them; lead the sunbeam to the sun (and the moon)
//   Zonnetempel    – pound the four symbol stones in the order on the mural (and in the glowing order under it)
//   Pomphuisje     – crawl in tiny and turn the wheel: the fountain runs again
//   Donkere kloof  – platforms only a glowing Josh can see
//   Zandloperdeur  – a plate opens the gate for a few seconds
//   Byte's radar   – once he has his antenna, he beeps near something buried
const { save, persist } = getSave('tempel');
save.puz = save.puz || {};
export const puz = save.puz;
const done = (k) => !!puz[k];
function finish(k) { puz[k] = true; persist(); }
export const TRIAL_RARE = 3;
const NAMES = { blok: 'Het derde blok', geheim: 'Het geheim van de muurschildering', begraven: 'Het begraven koekje' };
let lastP = null;
let hinted = {};
const hintOnce = (k, msg) => { if (!hinted[k]) { hinted[k] = true; toast(msg); } };
const glow = (b, col) => b.mesh.material.forEach((m) => m.emissive && m.emissive.setHex(col));

// ================= 1. Blokkenhof =================
const BK = { x0: -29, z0: 3 };               // centre of cell (0,0); cells are 2 m
const cellX = (i) => BK.x0 + 2 * i, cellZ = (j) => BK.z0 + 2 * j;
const PILLARS = new Set(['4,1', '1,4', '3,5']);
const START = [[2, 2], [3, 3], [4, 4]];
const PLATES = [[0, 1], [5, 1]];
const BONUS = [2, 6];
const inside = (i, j) => (i >= 0 && i <= 5 && j >= 0 && j <= 5) || (i === BONUS[0] && j === BONUS[1]);
{
  const H = 6.5;
  const wall = (x, z, w, d) => pillar(x, z, w, d, 0, H, ...STONE);
  wall(-28.2, 1.8, 4.4, 0.4); wall(-19.8, 1.8, 4.4, 0.4);       // north, either side of the gate
  wall(-30.2, 8, 0.4, 12.8);                                      // west
  wall(-17.8, 5.8, 0.4, 8.4); wall(-17.8, 13.2, 0.4, 2.4);         // east, with the way in at z 10–12
  wall(-28.2, 14.2, 4.4, 0.4); wall(-20.9, 14.2, 6.2, 0.4);        // south, with the alcove at x −26…−24
  wall(-26.2, 15.2, 0.4, 2.4); wall(-23.8, 15.2, 0.4, 2.4); wall(-25, 16.2, 2.8, 0.4);  // the alcove
  wall(-26.2, -0.4, 0.4, 4); wall(-21.8, -0.4, 0.4, 4); wall(-24, -2.2, 4.8, 0.4);      // the room behind the gate
  for (const k of PILLARS) { const [i, j] = k.split(',').map(Number); pillar(cellX(i), cellZ(j), 1.8, 1.8, 0, 2.6, ...DARK); }
}
const gate = block(-24, 3.25, 1.8, 4, 6.5, 0.4, 0xe0b860, 0xa88a4a);
const plateMat = () => new THREE.MeshBasicMaterial({ color: 0x8a7a5a });
const plates = [...PLATES, BONUS].map(([i, j]) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.06, 1.7), plateMat()); m.position.set(cellX(i), 0.04, cellZ(j)); scene.add(m);
  // a sun carved in the middle
  const s = new THREE.Mesh(new THREE.CircleGeometry(0.4, 16), new THREE.MeshBasicMaterial({ color: 0x5a4a3a })); s.rotation.x = -Math.PI / 2; s.position.set(cellX(i), 0.08, cellZ(j)); scene.add(s);
  return { i, j, m, on: false };
});
const blocks = START.map(([i, j]) => {
  const b = block(cellX(i), 0.8, cellZ(j), 1.9, 1.6, 1.9, 0xc8b898, 0x9a8a6a, { pushable: true });
  return { b, i, j, slide: null, push: 0, blockedHint: false };
});
// a reset stone outside the gate in: pound it and the blocks go back
const resetStone = block(-16.2, 0.35, 13.6, 1.1, 0.7, 1.1, 0xe0b860, 0xa88a4a, {
  onLand(pound) {
    if (!pound) { hintOnce('reset', 'Een herstelsteen: doe er een ground pound op om de blokken terug te zetten'); return; }
    START.forEach(([i, j], n) => { const k = blocks[n]; k.i = i; k.j = j; k.slide = null; k.b.pos.set(cellX(i), 0.8, cellZ(j)); syncBox(k.b); });
    puff(V3(-24, 1, 8), 30, 0xd8c8a8, 9, 2); sfx.clank(); toast('De blokken schuiven terug naar het begin');
    saveBlocks();
  },
});
label('↺', -16.2, 1.6, 13.6, 0.9);
const occupied = (i, j) => PILLARS.has(`${i},${j}`) || blocks.some((k) => k.i === i && k.j === j);
function saveBlocks() { puz.blocks = blocks.map((k) => [k.i, k.j]); persist(); }
function checkPlates(quiet = false) {
  for (const p of plates) {
    const on = blocks.some((k) => k.i === p.i && k.j === p.j && !k.slide);
    if (on !== p.on) { p.on = on; p.m.material.color.setHex(on ? 0xffd04a : 0x8a7a5a); if (on && !quiet) sfx.click(); }
  }
  if (plates[0].on && plates[1].on && !done('blokken')) { finish('blokken'); if (!quiet) { sfx.fanfare(); toast('Klik… klik! De gouden deur zakt weg.'); } }
  if (plates[2].on && !done('blok')) { finish('blok'); if (!quiet) { sfx.cosmic(); toast('Het derde blok past precies!'); } addCookie(cellX(BONUS[0]), 2.6, cellZ(BONUS[1]), NAMES.blok); }
}
let gateY = 3.25;
function updateBlocks(dt, P) {
  // the gate sinks once both plates are down
  const want = done('blokken') ? -3.4 : 3.25;
  if (gateY !== want) {
    gateY += Math.sign(want - gateY) * Math.min(Math.abs(want - gateY), dt * 4);
    gate.pos.y = gateY; syncBox(gate);
    if (gateY <= -3.3 && boxes.includes(gate)) boxes.splice(boxes.indexOf(gate), 1);
  }
  for (const k of blocks) {
    if (k.slide) {
      k.slide.t += dt / 0.32;
      const s = Math.min(1, k.slide.t), e = s * s * (3 - 2 * s);
      k.b.pos.lerpVectors(k.slide.from, k.slide.to, e); syncBox(k.b);
      if (s >= 1) { k.slide = null; checkPlates(); saveBlocks(); }
      continue;
    }
    // pushing: standing on the floor right next to it, stick pointing at it
    const w = P.wish || { x: 0, z: 0 };
    const along = Math.abs(w.x) > Math.abs(w.z) ? 'x' : 'z', s = Math.sign(along === 'x' ? w.x : w.z);
    const mag = Math.hypot(w.x, w.z);
    const rel = V3().subVectors(P.pos, k.b.pos);
    const near = mag > 0.5 && P.grounded && P.pos.y < 0.4 && P.ground !== k.b &&
      (along === 'x' ? rel.x * s < 0 && Math.abs(rel.x) < 1.5 && Math.abs(rel.z) < 0.75 : rel.z * s < 0 && Math.abs(rel.z) < 1.5 && Math.abs(rel.x) < 0.75);
    if (!near) { k.push = 0; continue; }
    k.push += dt;
    if (k.push < 0.28) continue;
    k.push = 0;
    const ni = k.i + (along === 'x' ? s : 0), nj = k.j + (along === 'z' ? s : 0);
    if (!inside(ni, nj) || occupied(ni, nj)) { if (!k.blockedHint) { k.blockedHint = true; toast('Dit blok kan die kant niet op'); } continue; }
    k.i = ni; k.j = nj;
    k.slide = { t: 0, from: k.b.pos.clone(), to: V3(cellX(ni), 0.8, cellZ(nj)) };
    sfx.clank(); puff(k.b.pos.clone().add(V3(0, -0.6, 0)), 6, 0xd8c8a8, 2, 0.5);
    hintOnce('push', 'Je duwt het blok een vakje verder');
  }
}

// ================= 2. Spiegelzaal =================
const MX = (i) => 20.5 + 3 * i, MZ = (j) => -4.5 + 3 * j, BY = HALL.y + 1.2;
// states: 0 '/', 1 '\', 2 down (the beam goes straight over it)
const MIRRORS = [{ i: 0, j: 3, s: 1 }, { i: 3, j: 3, s: 1 }, { i: 0, j: 1, s: 1 }, { i: 2, j: 1, s: 0 }];
const mirrorMat = new THREE.MeshBasicMaterial({ color: 0xd8f4ff });
for (const [n, mr] of MIRRORS.entries()) {
  if (puz.mirrors) mr.s = puz.mirrors[n];
  mr.base = block(MX(mr.i), HALL.y + 0.35, MZ(mr.j), 1.3, 0.7, 1.3, 0xe0b860, 0xa88a4a, {
    onLand(pound) {
      if (!pound) { hintOnce('mirror', 'Doe een ground pound op de sokkel om de spiegel te draaien'); return; }
      mr.s = (mr.s + 1) % 3; puz.mirrors = MIRRORS.map((m) => m.s); persist(); sfx.click(); trace();
    },
  });
  mr.g = new THREE.Group(); mr.g.position.set(MX(mr.i), HALL.y + 0.7, MZ(mr.j)); scene.add(mr.g);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.1, 0.08), mirrorMat); glass.position.y = 0.55; addOutline(glass, 1.06); mr.g.add(glass);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 0.14), toon(0xa88a4a)); frame.position.y = 1.12; mr.g.add(frame);
  mr.y = 0; mr.rot = 0;
}
// the sun stone outside the low south wall throws the beam in
{
  pillar(MX(0), HALL.z1 + 1.5, 1.2, 1.2, 0, BY - 0.4, ...GOLD);
  const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.45), new THREE.MeshBasicMaterial({ color: 0xffe080 })); c.position.set(MX(0), BY, HALL.z1 + 1.5); scene.add(c);
  const l = new THREE.PointLight(0xffd070, 6, 8, 2); l.position.copy(c.position); scene.add(l);
}
const sunDisk = new THREE.Mesh(new THREE.CircleGeometry(0.6, 24), new THREE.MeshBasicMaterial({ color: 0x8a6a3a }));
sunDisk.position.set(MX(3), BY, HALL.z0 + 0.42); scene.add(sunDisk);
const moonDisk = new THREE.Mesh(new THREE.CircleGeometry(0.6, 24), new THREE.MeshBasicMaterial({ color: 0x5a5a6a }));
moonDisk.position.set(HALL.x1 - 0.42, BY, MZ(1)); moonDisk.rotation.y = -Math.PI / 2; scene.add(moonDisk);
label(SYMBOLS.zon, MX(3), BY + 1.3, HALL.z0 + 0.45, 1); label(SYMBOLS.maan, HALL.x1 - 0.45, BY + 1.3, MZ(1), 1).rotation.y = -Math.PI / 2;
// the beam: a few thin glowing sticks
const beamMat = new THREE.MeshBasicMaterial({ color: 0xffe68a, transparent: true, opacity: 0.85 });
const beamPool = Array.from({ length: 8 }, () => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1, 8), beamMat); m.visible = false; scene.add(m); return m; });
let sunLit = false, moonLit = false;
function trace() {
  const pts = [V3(MX(0), BY, HALL.z1 + 1.5)];
  let i = 0, j = 4, di = 0, dj = -1, exit = null;
  for (let n = 0; n < 30; n++) {
    i += di; j += dj;
    if (i < 0 || i > 3 || j < 0 || j > 3) {
      exit = dj < 0 ? ['n', i] : dj > 0 ? ['s', i] : di > 0 ? ['e', j] : ['w', j];
      const x = di > 0 ? HALL.x1 - 0.4 : di < 0 ? HALL.x0 + 0.4 : MX(i), z = dj < 0 ? HALL.z0 + 0.4 : dj > 0 ? HALL.z1 - 0.4 : MZ(j);
      pts.push(V3(x, BY, z)); break;
    }
    const mr = MIRRORS.find((m) => m.i === i && m.j === j);
    if (mr && mr.s < 2) { pts.push(V3(MX(i), BY, MZ(j))); [di, dj] = mr.s === 0 ? [-dj, -di] : [dj, di]; }
  }
  beamPool.forEach((m, n) => {
    if (n >= pts.length - 1) { m.visible = false; return; }
    const a = pts[n], b = pts[n + 1], L = a.distanceTo(b);
    m.visible = true; m.scale.set(1, L, 1); m.position.lerpVectors(a, b, 0.5);
    m.quaternion.setFromUnitVectors(V3(0, 1, 0), V3().subVectors(b, a).normalize());
  });
  sunLit = !!exit && exit[0] === 'n' && exit[1] === 3;
  moonLit = !!exit && exit[0] === 'e' && exit[1] === 1;
  sunDisk.material.color.setHex(sunLit || done('zon') ? 0xffd04a : 0x8a6a3a);
  moonDisk.material.color.setHex(moonLit || done('maan') ? 0xd8e8ff : 0x5a5a6a);
  if (sunLit && !done('zon')) { finish('zon'); sfx.fanfare(); toast('De zonneschijf gloeit! Midden in de zaal komt een sokkel omhoog.'); }
  if (moonLit && !done('maan')) { finish('maan'); sfx.fanfare(); toast('De maanschijf gloeit! In de hoek gaat een lift omhoog.'); }
}
// the lens pedestal (the lens itself is one of Byte's parts: see npc.js)
export const LENS_AT = V3(23.5, HALL.y + 1.6, 1.5);
const lensBase = block(LENS_AT.x, HALL.y - 0.5, LENS_AT.z, 1, 1, 1, 0xe0b860, 0xa88a4a);
// the tower in the corner and the lift up to it
{
  pillar(30.9, -6.6, 1.4, 1.6, HALL.y, 13.4, ...STONE);
  addCookie(30.9, 14.6, -6.6, 'Op de toren van de spiegelzaal');
}
const lift = block(29.5, HALL.y + 0.2, -4.5, 1.9, 0.4, 1.9, 0xc8e4f0, 0x8ab4cc);
lift.mesh.material.forEach((m) => m.emissive && m.emissive.setHex(0x1a2a3a));
let liftT = 0, liftY = HALL.y + 0.2;
lift.mover = { b: lift, delta: V3(), fn() { return V3(29.5, liftY, -4.5); } };
movers.push(lift.mover);
function updateHall(dt) {
  for (const mr of MIRRORS) {
    const wantRot = mr.s === 1 ? -Math.PI / 4 : Math.PI / 4, wantY = mr.s === 2 ? -1.3 : 0;
    mr.rot += (wantRot - mr.rot) * damp(10, dt); mr.y += (wantY - mr.y) * damp(8, dt);
    mr.g.rotation.y = mr.rot; mr.g.position.y = HALL.y + 0.7 + mr.y;
  }
  // the lens pedestal
  const py = done('zon') ? HALL.y + 0.5 : HALL.y - 0.5;
  lensBase.pos.y += (py - lensBase.pos.y) * damp(2, dt); syncBox(lensBase);
  // the lift: up, wait, down, wait
  if (done('maan')) {
    liftT += dt;
    const u = liftT % 14, lo = HALL.y + 0.2, hi = 13.2;
    const k = u < 3 ? 0 : u < 7 ? (u - 3) / 4 : u < 10 ? 1 : (14 - u) / 4;
    liftY = lo + (hi - lo) * (k * k * (3 - 2 * k));
  }
}
export const lensUp = () => done('zon') && lensBase.pos.y > HALL.y + 0.3;

// ================= 3. Zonnetempel: the symbol stones =================
const TOP = ZIG.L4;
const STONES = [['ster', -2.6, -46.4], ['zon', 2.6, -46.4], ['maan', -2.6, -41.6], ['oog', 2.6, -41.6]];
let seq = [];
const stones = STONES.map(([sym, x, z]) => {
  const st = { sym };
  st.b = block(x, TOP + 0.45, z, 1.3, 0.9, 1.3, 0xe0b860, 0xa88a4a, { onLand(pound) { if (pound) pressStone(st); else hintOnce('stone', 'Doe een ground pound op de stenen. De volgorde staat op de muurschildering bij de fontein.'); } });
  label(SYMBOLS[sym], x, TOP + 1.9, z, 1.1);
  return st;
});
export const ANTENNA_AT = V3(0, TOP + 1, -44);
function lightStones() { for (const s of stones) glow(s.b, seq.includes(s.sym) ? 0x6a4a00 : 0x000000); }
function pressStone(st) {
  if (seq.includes(st.sym)) return;
  seq.push(st.sym); lightStones(); sfx.click();
  const fits = (o) => seq.every((s, n) => o[n] === s);
  const okMain = !done('symbolen') && fits(ORDER), okSecret = !done('geheim') && fits(SECRET);
  if (!okMain && !okSecret) {
    seq = []; setTimeout(lightStones, 350); sfx.hurt(); puff(V3(0, TOP + 1, -44), 16, 0x8a7a6a, 5, 1);
    toast(done('symbolen') && !done('geheim') ? 'Verkeerde volgorde… misschien staat er nóg een rij op de muur?' : 'Verkeerde volgorde… de stenen doven. Kijk nog eens naar de muurschildering.');
    return;
  }
  if (seq.length < 4) return;
  if (okMain && fits(ORDER)) { finish('symbolen'); sfx.fanfare(); toast('De zonnetempel ontwaakt! In het midden komt iets omhoog.'); }
  else if (okSecret) { finish('geheim'); sfx.cosmic(); toast('De geheime volgorde! De stenen gloeien paars.'); addCookie(0, TOP + 1.4, -44.8, NAMES.geheim); }
  seq = []; setTimeout(lightStones, 600);
}

// ================= 4. Pomphuisje: the wheel =================
const wheel = new THREE.Group(); wheel.position.set(PUMP.x - 1.1, 0.9, PUMP.z); scene.add(wheel);
{
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.07, 8, 20), toon(0xc87838)); rim.rotation.y = Math.PI / 2; addOutline(rim, 1.1); wheel.add(rim);
  for (let k = 0; k < 3; k++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.8, 0.05), toon(0xc87838)); s.rotation.x = (k / 3) * Math.PI; wheel.add(s); }
  pillar(PUMP.x - 1.6, PUMP.z, 0.3, 0.3, 0, 0.9, ...DARK);
}
let wheelSpin = 0;
function setFountain(on) {
  fountain.water.visible = on; fountain.jet.visible = on; fountain.spout.bounce = on ? 22 : 0;
}
function updatePump(dt, t, P) {
  if (!done('fontein') && Math.hypot(P.pos.x - wheel.position.x, P.pos.z - wheel.position.z) < 0.9 && P.pos.y < 1.5) {
    finish('fontein'); setFountain(true); wheelSpin = 1.6; sfx.clank(); sfx.fanfare();
    toast('Je draait aan het wiel… het water stroomt weer! Hoor je de fontein?');
    puff(V3(FOUNTAIN.x, 2, FOUNTAIN.z), 30, 0xbfeaff, 8, 4);
  }
  if (wheelSpin > 0) { wheelSpin -= dt; wheel.rotation.x += dt * 8; }
  if (done('fontein')) {
    fountain.jet.scale.y = 1 + Math.sin(t * 6) * 0.05;
    if (Math.random() < dt * 20) puff(V3(FOUNTAIN.x + (Math.random() - 0.5), 8, FOUNTAIN.z + (Math.random() - 0.5)), 1, 0xe8f8ff, 2, -2);
    if (Math.hypot(P.pos.x - FOUNTAIN.x, P.pos.z - FOUNTAIN.z) < 2.5 && P.pos.y < 1.4) hintOnce('jet', 'Spring op de waterstraal in het midden!');
  }
}

// ================= 5. De donkere kloof: platforms only a glowing Josh sees =================
const ghostMat = new THREE.MeshBasicMaterial({ color: 0x7af5ff, transparent: true, opacity: 0, depthWrite: false });
const ghosts = [];
function ghostPad(x, y, z, r = 1.2) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.8, 0.35, 16), ghostMat.clone());
  m.position.set(x, y - 0.18, z); scene.add(m);
  const b = { pos: V3(x, y - 0.18, z), half: V3(r * 0.8, 0.18, r * 0.8), min: V3(), max: V3(), ghost: true, mesh: m };
  syncBox(b); boxes.push(b); ghosts.push(b);
}
for (const [x, y, z] of [[-21.5, 0, -28.5], [-25, 0, -30.2], [-28.6, 0, -28], [-32.2, 0, -29.6]]) ghostPad(x, y, z);
for (const [x, y, z] of [[-37, 1.4, -24.8], [-34.4, 2.8, -23], [-36.2, 4.2, -20.6], [-34.2, 5.6, -19.2]]) ghostPad(x, y, z, 1.0);
void LEDGE;
function updateGhosts(dt, t, P) {
  const glowing = P.ability === 'gloei';
  for (const b of ghosts) {
    const d = Math.hypot(b.pos.x - P.pos.x, b.pos.z - P.pos.z);
    const want = glowing && d < 11 ? 0.75 : 0.035 + Math.sin(t * 2 + b.pos.x) * 0.02;
    b.mesh.material.opacity += (want - b.mesh.material.opacity) * damp(6, dt);
  }
  // the second row on the mural: glow paint
  const md = Math.hypot(P.pos.x - MURAL.x, P.pos.z - MURAL.z);
  for (const m of secretTiles) m.material.opacity += ((glowing && md < 11 ? 0.95 : 0) - m.material.opacity) * damp(5, dt);
  if (P.pos.x < -16 && P.pos.x > -20 && P.pos.z < -20 && P.pos.z > -38 && !glowing) hintOnce('pit', 'Een bodemloze kloof… Is daar iets? Het is te donker om te zien.');
}

// ================= 6. Zandloperdeur =================
const hg = HOURGLASS;
const hgPlate = block(hg.plate.x, 0.1, hg.plate.z, 1.8, 0.2, 1.8, 0xe0b860, 0xa88a4a, { onLand() { openHourglass(); } });
const hgGate = block(hg.gate.x, 2, hg.gate.z, 0.4, 4, 4, 0x8a6a4a, 0x5a4a30);
label('⌛', hg.plate.x, 1.4, hg.plate.z, 0.9);
let hgT = 0, hgTick = 0;
const HG_TIME = 6.5;
function openHourglass() {
  if (hgT > 0.5) return;
  hgT = HG_TIME; hgTick = 0; sfx.click(); toast(`De zandloper loopt! ${HG_TIME} seconden tot de deur dichtgaat…`);
}
function updateHourglass(dt, P) {
  if (P.grounded && P.ground === hgPlate) openHourglass();
  if (hgT > 0) {
    hgT -= dt; hgTick -= dt;
    if (hgTick <= 0) { hgTick = 1; sfx.scanTick(hgT < 2); }
    // don't drop the gate onto Josh
    if (hgT <= 0 && Math.abs(P.pos.x - hg.gate.x) < 0.8 && Math.abs(P.pos.z - hg.gate.z) < 2.3) hgT = 0.1;
  }
  const want = hgT > 0 ? -2.2 : 2;
  hgGate.pos.y += (want - hgGate.pos.y) * damp(hgT > 0 ? 10 : 6, dt); syncBox(hgGate);
  hgPlate.mesh.position.y = hgT > 0 ? 0.02 : 0.1;
}

// ================= 7. Byte's radar: something buried in the south-west =================
export const BURIED = V3(-33, 0, 30);
let beepT = 0, wasPounding = false;
const byteRadio = () => save.byteUp && (save.parts || []).includes('antenne');
function updateBuried(dt, P) {
  const landedPound = wasPounding && P.pound === 0 && P.grounded;
  wasPounding = P.pound === 2;
  if (done('begraven') || !byteRadio()) return;
  const d = Math.hypot(P.pos.x - BURIED.x, P.pos.z - BURIED.z);
  if (d < 16) {
    beepT -= dt;
    if (beepT <= 0) { beepT = Math.max(0.15, d / 9); sfx.scanTick(d < 3); }
    if (d < 5) hintOnce('dig', 'Byte piept als een gek… hier ligt iets begraven! Doe een ground pound.');
  }
  if (landedPound && d < 1.8) {
    finish('begraven'); sfx.cosmic(); puff(BURIED.clone().add(V3(0, 0.3, 0)), 26, 0x9a7a5a, 6, 3);
    toast('Je hebt iets opgegraven!'); addCookie(BURIED.x, 1.4, BURIED.z, NAMES.begraven);
  }
}

// ---------- every frame ----------
export function updateTrials(dt, t, P) {
  lastP = P;
  updateBlocks(dt, P);
  updateHall(dt);
  updatePump(dt, t, P);
  updateGhosts(dt, t, P);
  updateHourglass(dt, P);
  updateBuried(dt, P);
}
void lastP;

// back after a refresh
export function restoreTrials(s, gotSet) {
  if (puz.blocks) puz.blocks.forEach(([i, j], n) => { const k = blocks[n]; if (!k) return; k.i = i; k.j = j; k.b.pos.set(cellX(i), 0.8, cellZ(j)); syncBox(k.b); });
  checkPlates(true);
  if (done('blok') && !gotSet.has(NAMES.blok)) addCookie(cellX(BONUS[0]), 2.6, cellZ(BONUS[1]), NAMES.blok);
  if (done('blokken')) { gateY = -3.4; gate.pos.y = gateY; syncBox(gate); if (boxes.includes(gate)) boxes.splice(boxes.indexOf(gate), 1); }
  trace();
  if (done('zon')) { lensBase.pos.y = HALL.y + 0.5; syncBox(lensBase); }
  if (done('geheim') && !gotSet.has(NAMES.geheim)) addCookie(0, TOP + 1.4, -44.8, NAMES.geheim);
  if (done('fontein')) setFountain(true);
  if (done('begraven') && !gotSet.has(NAMES.begraven)) addCookie(BURIED.x, 1.4, BURIED.z, NAMES.begraven);
}
trace();
