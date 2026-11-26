// Ridgeline puzzles: the Ember Gate (light every brazier hidden in the dead ends) and the Rune Gate
// (step on the rune tiles in the order carved on the gate). world.js plans them from the seed; this file draws and runs them.
import { THREE, C, scene, maze, flake, sfx, disposeTree } from './world.js';
import { fx } from './fx.js';

const group = new THREE.Group(); scene.add(group);
let braziers = [], runeSets = [], emberGates = [], t = 0;

/* ================= glyphs ================= */
// six simple carved shapes; the same drawing is used on the floor tiles, the gate plaque and the HUD hint
export const GLYPH_NAMES = ['Sun', 'Peak', 'Wave', 'Eye', 'Key', 'Star'];
const GLYPH_COL = ['#ffd23f', '#ff8a3d', '#2ec4f1', '#8ee34d', '#ff5fa2', '#b48cff'];
function drawGlyph(g, k, cx, cy, s, col) {
  g.save(); g.translate(cx, cy); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = s * .12; g.lineCap = g.lineJoin = 'round';
  g.beginPath();
  if (k === 0) { g.arc(0, 0, s * .36, 0, 7); g.stroke(); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; g.moveTo(Math.cos(a) * s * .48, Math.sin(a) * s * .48); g.lineTo(Math.cos(a) * s * .6, Math.sin(a) * s * .6); } g.stroke(); }
  else if (k === 1) { g.moveTo(-s * .5, s * .38); g.lineTo(-s * .1, -s * .42); g.lineTo(s * .12, -s * .02); g.lineTo(s * .26, -s * .22); g.lineTo(s * .5, s * .38); g.closePath(); g.stroke(); }
  else if (k === 2) { for (const y of [-.22, 0, .22]) { g.moveTo(-s * .5, y * s); for (let i = 0; i <= 8; i++) g.lineTo(-s * .5 + i * s / 8, y * s + Math.sin(i / 8 * Math.PI * 2) * s * .09); } g.stroke(); }
  else if (k === 3) { g.ellipse(0, 0, s * .52, s * .3, 0, 0, 7); g.stroke(); g.beginPath(); g.arc(0, 0, s * .14, 0, 7); g.fill(); }
  else if (k === 4) { g.arc(-s * .2, 0, s * .2, 0, 7); g.moveTo(0, 0); g.lineTo(s * .5, 0); g.moveTo(s * .38, 0); g.lineTo(s * .38, s * .18); g.moveTo(s * .26, 0); g.lineTo(s * .26, s * .14); g.stroke(); }
  else { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, d = i % 2 ? s * .2 : s * .5; i ? g.lineTo(Math.cos(a) * d, Math.sin(a) * d) : g.moveTo(Math.cos(a) * d, Math.sin(a) * d); } g.closePath(); g.stroke(); }
  g.restore();
}
const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h); const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.userData = { c, g }; return tx; };

/* ================= shared meshes ================= */
const stone = new THREE.MeshStandardMaterial({ color: 0x6d6662, roughness: .95, flatShading: true });
const coal = new THREE.MeshStandardMaterial({ color: 0x2a2220, roughness: 1, emissive: 0xff4a1a, emissiveIntensity: 0 });
const pedGeo = new THREE.CylinderGeometry(.35, .5, 1, 8), bowlGeo = new THREE.CylinderGeometry(.62, .34, .38, 10, 1, true), coalGeo = new THREE.CylinderGeometry(.5, .5, .1, 10);
const tileGeo = new THREE.CylinderGeometry(1.35, 1.45, .14, 6);
const flameMat = (c) => new THREE.SpriteMaterial({ map: flake, color: c, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false });

/* ================= build per round ================= */
export function buildPuzzles() {
  disposeTree(group, true); group.clear(); braziers = []; runeSets = []; emberGates = []; t = 0;
  if (!maze || maze.lobby) return;
  for (const d of maze.doors) {
    if (d.kind === 'ember') buildEmber(d);
    if (d.kind === 'rune') buildRune(d);
  }
}
// a plaque on the approach side of a puzzle gate (it fades out once the gate opens)
function plaque(d, tex, w, h) {
  const [ax, az] = d.approach, dx = Math.sign(ax - d.i), dz = Math.sign(az - d.j);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }));
  m.position.set(d.i * C + C / 2 + dx * (C / 2 + .04), 2.5, d.j * C + C / 2 + dz * (C / 2 + .04));
  m.rotation.y = Math.atan2(dx, dz); group.add(m); return m;
}
function buildEmber(d) {
  const gate = { d, plaque: null, tex: null, list: [], drawn: -1, solved: false };
  gate.tex = canvasTex(512, 300, () => {}); gate.plaque = plaque(d, gate.tex, 3.4, 2);
  for (const [i, j] of d.braziers) {
    const x = i * C + C / 2, z = j * C + C / 2, root = new THREE.Group(); root.position.set(x, 0, z); group.add(root);
    const ped = new THREE.Mesh(pedGeo, stone); ped.position.y = .5; ped.castShadow = true; root.add(ped);
    const bowl = new THREE.Mesh(bowlGeo, stone); bowl.position.y = 1.18; bowl.material = stone; root.add(bowl);
    const coals = new THREE.Mesh(coalGeo, coal.clone()); coals.position.y = 1.1; root.add(coals);
    const pilot = new THREE.Sprite(flameMat(0x6fc8ff)); pilot.scale.setScalar(.5); pilot.position.y = 1.3; root.add(pilot);
    const f1 = new THREE.Sprite(flameMat(0xff6a1a)), f2 = new THREE.Sprite(flameMat(0xffd27a)); f1.position.y = f2.position.y = 1.75; f1.visible = f2.visible = false; root.add(f1, f2);
    // a soft column of light so a lit brazier shows over the walls, and an unlit one glints blue
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(.18, .32, 14, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0x6fc8ff, transparent: true, opacity: .16, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: false }));
    beam.position.y = 8; root.add(beam);
    const b = { gate, x, z, lit: false, root, coals, pilot, f1, f2, beam, ph: Math.random() * 6, idx: braziers.length };
    braziers.push(b); gate.list.push(b);
  }
  emberGates.push(gate); drawEmberPlaque(gate);
}
function drawEmberPlaque(gate) {
  const lit = gate.list.filter((b) => b.lit).length; if (lit === gate.drawn) return; gate.drawn = lit;
  const { c, g } = gate.tex.userData, W = c.width, H = c.height;
  g.clearRect(0, 0, W, H);
  g.fillStyle = 'rgba(32,18,14,.88)'; g.beginPath(); g.roundRect(6, 6, W - 12, H - 12, 26); g.fill();
  g.strokeStyle = '#ff8a3d'; g.lineWidth = 8; g.stroke();
  g.fillStyle = '#ffd9a0'; g.font = '900 46px ui-rounded, system-ui, sans-serif'; g.textAlign = 'center'; g.fillText('EMBER GATE', W / 2, 66);
  g.font = '700 26px ui-rounded, system-ui, sans-serif'; g.fillStyle = '#f3d6b8';
  g.fillText(`Light the ${gate.list.length} braziers hidden in dead ends`, W / 2, 108);
  const n = gate.list.length, sp = 120, x0 = W / 2 - (n - 1) * sp / 2;
  for (let k = 0; k < n; k++) {
    const x = x0 + k * sp, y = 190, on = k < lit;
    g.fillStyle = on ? '#ff8a3d' : '#3a2a24'; g.beginPath(); g.arc(x, y, 38, 0, 7); g.fill(); g.lineWidth = 6; g.strokeStyle = on ? '#ffd27a' : '#6d5a50'; g.stroke();
    g.fillStyle = on ? '#fff3c4' : '#5a4a42'; g.beginPath(); g.moveTo(x, y - 26); g.quadraticCurveTo(x + 22, y + 4, x, y + 22); g.quadraticCurveTo(x - 22, y + 4, x, y - 26); g.fill();
  }
  g.font = '800 24px ui-rounded, system-ui, sans-serif'; g.fillStyle = lit === n ? '#8ee34d' : '#f3d6b8';
  g.fillText(lit === n ? 'The gate is opening!' : `${lit} of ${n} lit · F to light · or throw a glowstick in`, W / 2, 266);
  gate.tex.needsUpdate = true;
}
function buildRune(d) {
  const set = { d, tiles: [], step: 0, solved: false, plaque: null };
  for (const u of d.runes) {
    const x = u.i * C + C / 2, z = u.j * C + C / 2;
    const slab = new THREE.Mesh(tileGeo, new THREE.MeshStandardMaterial({ color: 0x5b5560, roughness: .9, flatShading: true })); slab.position.set(x, .07, z); slab.receiveShadow = true; group.add(slab);
    const tex = canvasTex(256, 256, (g) => { g.clearRect(0, 0, 256, 256); drawGlyph(g, u.g, 128, 128, 190, '#ffffff'); });
    const mat = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(GLYPH_COL[u.g]).multiplyScalar(.45), transparent: true, depthWrite: false, toneMapped: false });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), mat); face.rotation.x = -Math.PI / 2; face.position.set(x, .16, z); group.add(face);
    set.tiles.push({ ...u, x, z, mat, base: new THREE.Color(GLYPH_COL[u.g]), on: false, occ: false });
  }
  const tex = canvasTex(512, 300, (g, W, H) => {
    g.fillStyle = 'rgba(12,30,34,.9)'; g.beginPath(); g.roundRect(6, 6, W - 12, H - 12, 26); g.fill(); g.strokeStyle = '#3dffd2'; g.lineWidth = 8; g.stroke();
    g.fillStyle = '#c9fff2'; g.font = '900 46px ui-rounded, system-ui, sans-serif'; g.textAlign = 'center'; g.fillText('RUNE GATE', W / 2, 64);
    g.font = '700 24px ui-rounded, system-ui, sans-serif'; g.fillStyle = '#a9e6dc'; g.fillText('Step on the runes nearby in this order', W / 2, 102);
    const n = d.order.length, sp = 112, x0 = W / 2 - (n - 1) * sp / 2;
    d.order.forEach((k, i) => {
      const x = x0 + i * sp; g.fillStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.arc(x, 186, 46, 0, 7); g.fill();
      drawGlyph(g, k, x, 186, 70, GLYPH_COL[k]);
      g.fillStyle = '#a9e6dc'; g.font = '800 20px ui-rounded, system-ui, sans-serif'; g.fillText(`${i + 1}`, x, 262);
      if (i < n - 1) { g.fillStyle = '#3dffd2'; g.beginPath(); g.moveTo(x + 48, 180); g.lineTo(x + 62, 186); g.lineTo(x + 48, 192); g.fill(); }
    });
  });
  set.plaque = plaque(d, tex, 3.4, 2);
  runeSets.push(set);
}

/* ================= runtime ================= */
/** Light a brazier by index. Returns true if it was newly lit. */
export function lightBrazier(k, quiet = false) {
  const b = braziers[k]; if (!b || b.lit) return false;
  b.lit = true; b.pilot.visible = false; b.f1.visible = b.f2.visible = true; b.coals.material.emissiveIntensity = 1.2;
  b.beam.material.color.set(0xff8a3d); b.beam.material.opacity = .22;
  if (!quiet) { sfx.unlock?.(); fx.sparkle(b.x, 1.6, b.z, 0xffa040, 26); fx.ring?.(b.x, 1.2, b.z, 0xff8a3d); }
  drawEmberPlaque(b.gate);
  return true;
}
/** Index of an unlit brazier within reach of (x,z), or -1. */
export function brazierNear(x, z, r = 2.3) { for (const b of braziers) if (!b.lit && Math.hypot(x - b.x, z - b.z) < r) return b.idx; return -1; }
/** A glowstick that lands in (or right by) a brazier lights it. */
export function igniteAt(x, y, z) { for (const b of braziers) if (!b.lit && Math.hypot(x - b.x, z - b.z) < 1.1 && y < 2.4) return b.idx; return -1; }
export const brazierCount = (k) => { const b = braziers[k]; return b ? { lit: b.gate.list.filter((q) => q.lit).length, total: b.gate.list.length } : null; };

/**
 * Every frame in the maze. people: [{x,y,z}] for everyone (local and remote).
 * cb.onSolve(doorId, kind) when a gate's puzzle is complete; cb.onRune(ok, set) for feedback on each rune step.
 */
export function updatePuzzles(dt, people, cb = {}) {
  t += dt;
  for (const b of braziers) {
    if (b.lit) { const w = 1 + Math.sin(t * 13 + b.ph) * .12 + Math.sin(t * 23) * .06; b.f1.scale.set(1.3 * w, 1.9 * (2 - w), 1); b.f2.scale.set(.7 * w, 1 * (2 - w), 1); if (Math.random() < dt * 6) fx.sparkle(b.x, 1.8, b.z, 0xffa040, 1); }
    else b.pilot.scale.setScalar(.45 + Math.sin(t * 3 + b.ph) * .08);
  }
  for (const gte of emberGates) {
    if (!gte.solved && gte.list.length && gte.list.every((b) => b.lit)) { gte.solved = true; cb.onSolve?.(gte.d.id, 'ember'); }
    if (gte.d.progress > 0) gte.plaque.material.opacity = Math.max(0, 1 - gte.d.progress * 1.6);
  }
  for (const s of runeSets) {
    if (s.d.progress > 0) s.plaque.material.opacity = Math.max(0, 1 - s.d.progress * 1.6);
    if (s.solved || s.d.latched) { s.solved = true; s.tiles.forEach((tl) => tl.mat.color.copy(tl.base)); continue; }
    for (const tl of s.tiles) {
      const occ = people.some((p) => (p.y || 0) < 1.2 && Math.hypot(p.x - tl.x, p.z - tl.z) < 1.4);
      if (occ && !tl.occ) { // someone just stepped on this rune
        if (tl.on) { /* already lit: no effect */ }
        else if (tl.g === s.d.order[s.step]) {
          tl.on = true; s.step++; sfx.chime?.(); fx.sparkle(tl.x, .4, tl.z, new THREE.Color(GLYPH_COL[tl.g]).getHex(), 18);
          cb.onRune?.(true, s);
          if (s.step >= s.d.order.length) { s.solved = true; cb.onSolve?.(s.d.id, 'rune'); }
        } else {
          s.step = 0; s.tiles.forEach((q) => q.on = false); sfx.oof?.(); fx.dust(tl.x, .1, tl.z, 14, .8, 0x3dffd2);
          cb.onRune?.(false, s);
        }
      }
      tl.occ = occ;
      const pulse = tl.on ? 1 : .38 + Math.sin(t * 2.4 + tl.g) * .08;
      tl.mat.color.copy(tl.base).multiplyScalar(pulse);
    }
  }
}
/** A short hint for the HUD when a climber stands near a puzzle gate or a brazier. */
export function puzzleHint(x, z) {
  for (const gte of emberGates) {
    if (gte.d.latched) continue;
    const gx = gte.d.i * C + C / 2, gz = gte.d.j * C + C / 2;
    if (Math.hypot(x - gx, z - gz) < C * 1.6) { const lit = gte.list.filter((b) => b.lit).length; return `Ember Gate · light the braziers hidden in dead ends (${lit}/${gte.list.length})`; }
  }
  for (const s of runeSets) {
    if (s.solved) continue;
    const gx = s.d.i * C + C / 2, gz = s.d.j * C + C / 2;
    if (Math.hypot(x - gx, z - gz) < C * 1.6) return `Rune Gate · step on the runes in order: ${s.d.order.map((k) => GLYPH_NAMES[k]).join(' → ')} (${s.step}/${s.d.order.length})`;
    for (const tl of s.tiles) if (Math.hypot(x - tl.x, z - tl.z) < 1.4) return `${GLYPH_NAMES[tl.g]} rune${tl.on ? ' · lit' : ''} · ${s.step}/${s.d.order.length} in order`;
  }
  return '';
}
/** Is a climber near a puzzle (for one-time tips)? Returns 'ember', 'rune' or ''. */
export function nearPuzzle(x, z) {
  for (const gte of emberGates) if (!gte.d.latched && Math.hypot(x - (gte.d.i * C + C / 2), z - (gte.d.j * C + C / 2)) < C * 2) return 'ember';
  for (const s of runeSets) if (!s.solved && Math.hypot(x - (s.d.i * C + C / 2), z - (s.d.j * C + C / 2)) < C * 2.5) return 'rune';
  return '';
}
export function showPuzzles(v) { group.visible = v; }
export const puzzleSummary = () => ({ braziers: braziers.length, lit: braziers.filter((b) => b.lit).length, runes: runeSets.map((s) => `${s.step}/${s.d.order.length}`).join(' ') || '—' });
