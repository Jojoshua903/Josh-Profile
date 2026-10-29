import { THREE, scene, toon, addOutline, V3, damp, puff, toast } from './core.js?v=sub1';
import { addCookie } from './cookies.js?v=sub1';
import { addSpeaker } from './bubbles.js?v=sub1';
import { getSave } from './save.js?v=sub1';
import * as sfx from './sfx.js?v=sub1';
import { BOWLS, BIG_BOWL, GEYSERS, FOLDERS, FLICKER, RAFTS, raftAt, rcookie, ZUIL, syncBox } from './zon-world.js?v=sub1';
import { MAGMA_Y } from './zon-terrain.js?v=sub1';

// The challenges behind the cosmic cookies on the Zon. Three of them make their cookie appear when you
// finish (stofbaden, zonnebellen, Flits); the rest (geisers, vouwpanelen, flikkerkristallen) are just
// hard to get to. Called from the story every frame, and on every ground pound that lands.
const { save, gotSet, persist } = getSave('zon');
// the first version of the Zon had easy cookies in these spots; they're challenges now, so forget them once
if (save.trialsV !== 1) {
  for (const n of ['In de grote stofbadkom', 'Op het hoogste zonnepaneel', 'Op het hoogste kristal', 'Mee met Kleintje', 'Boven de magmastroom', 'Achter de Westrots', 'Bij de poort van De Kroon']) gotSet.delete(n);
  save.crates = []; save.trialsV = 1; persist();
}
const done = (k) => !!(save.trials && save.trials[k]);
function finish(k) { save.trials = { ...(save.trials || {}), [k]: true }; persist(); }
export const TRIAL_RARE = 3;          // cookies that only exist once a trial is done
const NAMES = { stof: 'De drie stofbaden', bel: 'De drie zonnebellen', flits: 'Flits gevangen!' };
const ink = new THREE.MeshBasicMaterial({ color: 0x1a1030 });

// ---------- 1. stofbaden: ground-pound into all three dust bowls on the Stofbadvlot ----------
const bowlLit = new THREE.Color(0xffe060), bowlOff = new THREE.Color(0xf4e0b8);
function bigBowlCookie() { rcookie(RAFTS.stof, BIG_BOWL.lx, BIG_BOWL.y, BIG_BOWL.lz, NAMES.stof); }

// ---------- 2. zonnebellen: three bells on three places; ring them all within 25 seconds ----------
// Westrots → (ride the Kristalvlot, the bell is on board) → Noordrots
const BELL_TIME = 25;
const BELLS = [{ raft: null, lx: -28, lz: -0.5 }, { raft: 'kristal', lx: -3.2, lz: 4.6 }, { raft: null, lx: -3.5, lz: -41 }];
const bellMat = toon(0xf0b840);
for (const bl of BELLS) {
  const g = new THREE.Group(); scene.add(g); bl.g = g;
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.6), toon(0x3a2e32)); post.position.y = 1.3; g.add(post);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1, 0.1, 0.1), toon(0x3a2e32)); arm.position.set(0.45, 2.55, 0); g.add(arm);
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.5, 0.75, 16, 1, true), bellMat.clone()); bell.material.side = THREE.DoubleSide; bell.position.set(0.85, 2.1, 0); addOutline(bell, 1.06); g.add(bell);
  bl.bell = bell;
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.08, 20), toon(0xc07020)); plate.position.set(0.85, 0.04, 0); g.add(plate);
  bl.plate = plate;
  bl.on = false;
}
addSpeaker(BELLS[0].g, { y: 3, radius: 4, linger: 10, lines: () => (done('bel') ? ['*de bellen zoemen nog na*'] : ['Een bel met een plaat eronder. Stamp op de plaat!', 'Er staan er nog twee: één op het Kristalvlot, één op de Noordrots. Snel!']) });
let bellT = 0, bellRun = false;
function bellPos(bl) { return raftAt(bl.raft, bl.lx, bl.lz); }
function bellReward() { const b = bellPos(BELLS[2]); addCookie(b.x + 0.85, 3.6, b.z, NAMES.bel); }

// ---------- 3. Flits: a cheeky chinchilla with a cookie, who keeps hopping away ----------
// He waits on the landing rock and hops off when you get close: over the Panelenvlot, the Oostrots,
// Kleintje and the Ringvlot to the lone pillar. Catch him there.
const FLITS_PATH = [
  { raft: null, lx: 9.5, lz: 31.5, y: 0 },
  { raft: 'panelen', lx: 4, lz: -3, y: 4.8 },
  { raft: null, lx: 30.5, lz: -6.2, y: 0 },
  { raft: 'klein', lx: 0, lz: 0, y: 0 },
  { raft: 'ring', lx: 0, lz: 2.5, y: 0 },
  { raft: null, lx: ZUIL.x, lz: ZUIL.z, y: ZUIL.top },
];
const flits = { i: 0, hop: null, g: new THREE.Group() };
{
  const g = flits.g; scene.add(g);
  const fur = toon(0xd8c0a0), belly = toon(0xfff4e4);
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.36, 14, 10), fur); b.position.y = 0.36; addOutline(b, 1.08); g.add(b);
  const h = new THREE.Mesh(new THREE.SphereGeometry(0.27, 14, 10), fur); h.position.set(0, 0.76, 0.06); addOutline(h, 1.08); g.add(h);
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), fur); e.scale.set(1, 1.2, 0.35); e.position.set(0.18 * s, 1.0, 0.02); e.rotation.z = -0.35 * s; g.add(e);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), ink); eye.position.set(0.1 * s, 0.8, 0.3); g.add(eye);
  }
  const bel = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8), belly); bel.scale.set(1, 1, 0.6); bel.position.set(0, 0.32, 0.2); g.add(bel);
  // a racing stripe headband, and the cookie in his mouth
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.04, 6, 16), toon(0xff3a6a)); band.position.set(0, 0.86, 0.06); band.rotation.x = Math.PI / 2 - 0.3; g.add(band);
  const ck = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), new THREE.MeshBasicMaterial({ color: 0xb79cff })); ck.position.set(0, 0.68, 0.33); g.add(ck);
  flits.ck = ck;
}
const FLITS_LINES = ['Haha! Pak me dan!', 'Ik ben de snelste van de zon!', 'Opa zegt dat ik niet zo mag rennen. Opa is traag!', 'Dit koekje? Is van mij! Tenzij je me pakt.'];
addSpeaker(flits.g, { y: 1.5, radius: 6, linger: 10, lines: () => (done('flits') ? ['Oké oké, jij bent ook snel.', 'Revanche? Nee? Oké.'] : FLITS_LINES) });
function flitsAt(i) { const s = FLITS_PATH[i]; return raftAt(s.raft, s.lx, s.lz, s.y); }

// ---------- every frame ----------
export function updateTrials(dt, t, P) {
  const p = P.pos;
  // geysers
  for (const g of GEYSERS) {
    const u = (((t - g.offset) % g.period) + g.period) % g.period;
    const warn = u > g.period - 1.4, blow = u < 1.6;
    const h = g.top - MAGMA_Y;
    g.col.scale.set(1, h, 1); g.col.position.set(g.x, MAGMA_Y + h / 2, g.z);
    g.col.material.opacity += ((blow ? 0.35 : 0) - g.col.material.opacity) * damp(10, dt);
    g.ring.material.opacity = warn ? 0.4 + Math.sin(t * 24) * 0.35 : blow ? 0.6 : 0;
    if (warn && Math.random() < dt * 20) puff(V3(g.x + (Math.random() - 0.5) * 2, MAGMA_Y + 0.3, g.z + (Math.random() - 0.5) * 2), 1, 0xffffff, 2, 2);
    if (blow && Math.random() < dt * 30) puff(V3(g.x + (Math.random() - 0.5) * 1.6, MAGMA_Y + 1 + Math.random() * h * 0.8, g.z + (Math.random() - 0.5) * 1.6), 1, 0xfff4c0, 3, 6);
    if (blow && Math.hypot(p.x - g.x, p.z - g.z) < 1.5 && p.y < g.top && p.y > MAGMA_Y - 0.5) {
      P.vel.y = Math.max(P.vel.y, 14); P.grounded = false; P.airJump = P.airJump2 = false; P.pound = 0;
      if (!g.sfxT || t - g.sfxT > 0.8) { g.sfxT = t; sfx.whir(); }
    }
  }
  // folding panels: a short moment after you land they fold away, and come back up after a while
  for (const f of FOLDERS) {
    const on = P.grounded && P.ground === f.b;
    if (on) f.load += dt;
    else if (f.load > 0 && f.load < 0.4) f.load = 0;
    if (f.load >= 0.4) { f.down = Math.min(1, f.down + dt * 3); f.away = (f.away || 0) + dt; }
    if (f.away > 3) { f.down = Math.max(0, f.down - dt * 2); if (f.down === 0) { f.load = 0; f.away = 0; } }
    const wob = f.load > 0 && f.load < 0.4 ? Math.sin(t * 50) * 0.06 : 0;
    f.b.mesh.rotation.z = wob + f.down * 1.2;
  }
  // flickering crystals: each is solid for 1.6 s out of every 3, one after the other
  for (const c of FLICKER) {
    const u = (((t - c.phase * 1) % 3) + 3) % 3, solid = u < 1.6, fading = u > 1.2 && u < 1.6;
    c.b.ghost = !solid;
    const o = solid ? (fading ? 0.5 + Math.sin(t * 30) * 0.4 : 1) : 0.18;
    for (const m of c.mats) m.opacity = o;
  }
  // bells
  if (bellRun) {
    bellT -= dt;
    if (bellT <= 0) {
      bellRun = false; BELLS.forEach((b) => { b.on = false; b.bell.material.color.setHex(0xf0b840); });
      toast('Te laat! De bellen zijn stil. Begin opnieuw bij de eerste.'); sfx.drop();
    } else if (Math.floor(bellT + dt) !== Math.floor(bellT) && bellT < 10) toast(`Nog ${Math.ceil(bellT)} seconden!`);
  }
  for (const bl of BELLS) {
    const at = bellPos(bl); bl.g.position.copy(at);
    bl.bell.rotation.z = bl.on ? Math.sin(t * 14) * 0.25 : 0;
  }
  // Flits
  if (!done('flits')) {
    if (flits.hop) {
      const h = flits.hop; h.t += dt;
      const k = Math.min(1, h.t / h.dur), to = flitsAt(flits.i);
      flits.g.position.lerpVectors(h.from, to, k); flits.g.position.y += Math.sin(k * Math.PI) * h.height;
      flits.g.rotation.y = Math.atan2(to.x - h.from.x, to.z - h.from.z);
      if (k >= 1) { flits.hop = null; puff(to.clone().add(V3(0, 0.2, 0)), 8, 0xfff4e4, 3, 1); }
    } else {
      const at = flitsAt(flits.i);
      flits.g.position.set(at.x, at.y + Math.abs(Math.sin(t * 5)) * 0.15, at.z);
      const d = Math.atan2(p.x - at.x, p.z - at.z);
      flits.g.rotation.y += Math.atan2(Math.sin(d - flits.g.rotation.y), Math.cos(d - flits.g.rotation.y)) * damp(5, dt);
      const close = Math.hypot(p.x - at.x, p.z - at.z) < 2.4 && Math.abs(p.y - at.y) < 2;
      if (close && flits.i < FLITS_PATH.length - 1) {
        flits.hop = { from: at.clone(), t: 0, dur: 1.1, height: 5 }; flits.i++;
        sfx.jump(2); if (flits.i === 1) toast('Flits gaat er met een kosmisch koekje vandoor! Achter hem aan!');
      } else if (close) {
        finish('flits'); flits.ck.visible = false; sfx.squeak();
        toast('Gevangen! Flits geeft het koekje terug.');
        addCookie(at.x, at.y + 1.6, at.z, NAMES.flits);
      }
    }
  } else if (flits.home) {
    // after he's caught he goes home and sits by Opa Pluis
    flits.g.position.set(-8.5, Math.abs(Math.sin(t * 5)) * 0.15, 33.5);
  }
  flits.ck.rotation.y = t * 3;
}

// a ground pound that just landed at p
export function trialPound(p) {
  // dust bowls
  if (!done('stof')) {
    for (const bw of BOWLS) {
      const at = raftAt(bw.raft, bw.lx, bw.lz);
      if (!bw.on && Math.hypot(p.x - at.x, p.z - at.z) < 1.15 && Math.abs(p.y) < 0.5) {
        bw.on = true; bw.dust.material.color.copy(bowlLit); puff(at.clone().add(V3(0, 0.4, 0)), 24, 0xf4e0b8, 5, 2); sfx.stomp();
        const n = BOWLS.filter((x) => x.on).length;
        if (n < BOWLS.length) toast(`Pfoef! Nog ${BOWLS.length - n} stofbad${BOWLS.length - n > 1 ? 'en' : ''}`);
        else { finish('stof'); toast('Alle stofbaden opgeschud! Kijk in de grote kom'); bigBowlCookie(); sfx.copy(); }
      }
    }
  }
  // bells
  if (!done('bel')) {
    BELLS.forEach((bl, i) => {
      const at = bellPos(bl).add(V3(0.85, 0, 0));
      const onPlate = Math.hypot(p.x - at.x, p.z - at.z) < 1.1 && Math.abs(p.y - at.y) < 0.6;
      if (!onPlate || bl.on) return;
      if (i > 0 && !bellRun) { toast('Begin bij de eerste bel, op de Westrots!'); return; }
      if (i > 0 && !BELLS[i - 1].on) { toast('Eerst de vorige bel!'); return; }
      bl.on = true; bl.bell.material.color.setHex(0xfff4a0); puff(at.clone().add(V3(0, 2.2, 0)), 14, 0xffe060, 4, 1);
      sfx.copy();
      if (i === 0) { bellRun = true; bellT = BELL_TIME; toast(`DONG! Nog 2 bellen, binnen ${BELL_TIME} seconden: Kristalvlot en Noordrots!`); }
      else if (i < BELLS.length - 1) toast('DONG! Nog één: op de Noordrots!');
      else { bellRun = false; finish('bel'); toast('DONG DONG DONG! Alle drie de zonnebellen!'); bellReward(); }
    });
  }
}

// back after a refresh
export function restoreTrials(s, got) {
  if (done('stof')) { BOWLS.forEach((b) => { b.on = true; b.dust.material.color.copy(bowlLit); }); if (!got.has(NAMES.stof)) bigBowlCookie(); }
  if (done('bel')) { BELLS.forEach((b) => (b.on = true)); if (!got.has(NAMES.bel)) bellReward(); }
  if (done('flits')) { flits.ck.visible = false; flits.home = true; if (!got.has(NAMES.flits)) { const z = flitsAt(FLITS_PATH.length - 1); addCookie(z.x, z.y + 1.6, z.z, NAMES.flits); } }
  void bowlOff; void syncBox;
}
