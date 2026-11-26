// Ridgeline Summit: the mountain. Five zones stacked up a cliff, each with its own idea:
//   Frost cliffs (ice holds) · Ice caverns (a dark chimney: throw glowsticks to see the holds) · Temple ruins (crumbling
//   stone, and a high start you need a boost for) · Storm ridge (wind gusts, lightning) · The Summit (the final push).
// The mountain is a stack of terraces on the 4 m tile grid. Terrace tops are walkable with the normal collision
// (they are just tall wall tiles you stand on); the vertical front of each terrace is a climbable FACE with holds.
// Everything comes from rng(seed), so every client builds the same mountain.
import { THREE, C, GRID, scene, rng, useLayout, rayTargets, flake, setStickHook } from './world.js';

const TILE = 4; // summit always uses the 4 m camp tile size (useLayout switches to it)
const X0T = 10, X1T = 22; // the mountain is tiles x 10..22 wide (40..92 m)
const START = { zt0: 3, zt1: 7 }; // the snowy start shelf
const GATE_DX = 3.2, GATE_H = 3.6; // temple gate: twin ledges either side of the face centre, a sealed band of rock above them
// each zone: two faces (heights in metres), the second one ends on a camp terrace (zone 5: Camp V, then the summit)
export const ZONES = [
  { name: 'Frost cliffs', idea: 'Icy holds slide out of your hand · move on quickly', faces: [14, 16], rock: 0x8f8f99, sky: 0xdfe9f4 },
  { name: 'Ice caverns', idea: 'The chimney is pitch dark · throw a glowstick in to see the holds', faces: [16, 18], rock: 0x7f97a8, sky: 0xcfe2ee },
  { name: 'Temple ruins', idea: 'Old stone crumbles · boost each other up · two on the rune ledges open the gate', faces: [18, 18], rock: 0xb39a72, sky: 0xe9dcc0 },
  { name: 'Storm ridge', idea: 'Wind gusts tear you off · hold on with both hands when it howls', faces: [20, 20], rock: 0x6d7180, sky: 0x9aa3b4 },
  { name: 'The Summit', idea: 'Past Camp V the Shadow speeds up · the final push', faces: [20, 26], rock: 0xa9a6ad, sky: 0xf2f6ff },
];

export const SUMMIT = { faces: [], holds: [], ledges: [], camps: [], spawn: null, topY: 0, seed: 0, built: false, zoneTop: [], chimney: null, tripod: null, gate: null, practice: false, cam: new THREE.PerspectiveCamera(62, 4 / 3, .1, 600) };
const group = new THREE.Group(); group.visible = false; scene.add(group);

/* ================= textures & materials ================= */
const tex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
const rockTex = tex(256, 256, (g, w, h) => {
  g.fillStyle = '#b8b2ad'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? '255,255,255' : '40,30,25'},${.04 + Math.random() * .07})`; const x = Math.random() * w, y = Math.random() * h; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 5; k++) g.lineTo(x + (Math.random() - .5) * 60, y + (Math.random() - .5) * 40); g.fill(); }
  g.strokeStyle = 'rgba(40,30,25,.35)'; g.lineWidth = 2; for (let i = 0; i < 14; i++) { g.beginPath(); let x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (Math.random() - .5) * 50; y += Math.random() * 30; g.lineTo(x, y); } g.stroke(); }
});
const M = {
  snow: new THREE.MeshStandardMaterial({ color: 0xfbfdff, roughness: .7, flatShading: true }),
  ledge: new THREE.MeshStandardMaterial({ color: 0x9c8f82, roughness: .9, flatShading: true }),
  hold: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .7, flatShading: true }),
  flag: new THREE.MeshStandardMaterial({ color: 0xff5a1f, side: THREE.DoubleSide }),
  pole: new THREE.MeshStandardMaterial({ color: 0x3b3f46, metalness: .4, roughness: .4 }),
  dark: new THREE.MeshBasicMaterial({ color: 0x07080d }),
  ice: new THREE.MeshStandardMaterial({ color: 0xd9f3ff, roughness: .2, metalness: .1, transparent: true, opacity: .85 }),
  tick: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .85 }),
};
const rockMat = (col, flat = true) => new THREE.MeshStandardMaterial({ map: rockTex, color: col, roughness: .95, flatShading: flat });
// hold looks: normal (warm), ice (pale blue, glossy), crumbling (cracked brown), chalk-needed (dark red until chalked)
export const HOLD_COLORS = { normal: '#e9b27a', ice: '#bfeaff', crumble: '#8a6a4a', chalk: '#a0303a', chalked: '#fff6e5', dark: '#14161d' };
const holdGeo = new THREE.DodecahedronGeometry(.17, 0);

/* ================= generation ================= */
// terraces: [front tile z, depth in tiles, top height, zone, kind 'ledge' | 'camp' | 'top']
function terraces(practice) {
  if (practice) return [[8, 3, 9, 0, "top"]]; // the Practice Wall: one 9 m face with a ledge, then the top
  const out = []; let zt = 8, h = 0;
  ZONES.forEach((Z, k) => Z.faces.forEach((fh, j) => {
    h += fh; const kind = k === 4 ? (j === 0 ? 'camp' : 'top') : j === 1 ? 'camp' : 'ledge';
    out.push([zt, 2, h, k, kind]); zt += 2;
  }));
  return out;
}
function layoutFor(T) {
  const A = () => Array.from({ length: GRID }, () => new Float32Array(GRID));
  const g = Array.from({ length: GRID }, () => new Uint8Array(GRID).fill(1)), top = A();
  for (let x = 0; x < GRID; x++) top[x].fill(400);
  for (let x = X0T; x <= X1T; x++) for (let z = START.zt0; z <= START.zt1; z++) { g[x][z] = 0; top[x][z] = 0; }
  for (const [zt, depth, h] of T) for (let x = X0T; x <= X1T; x++) for (let z = zt; z < zt + depth; z++) { g[x][z] = 1; top[x][z] = h; }
  const doorAt = Array.from({ length: GRID }, () => new Int8Array(GRID).fill(-1));
  // lobby: true keeps the maze-only systems (props, puzzles, decor) out; summit: true tells the game which mode this is
  return { g, top, low: A(), bridge: A(), doorAt, doors: [], camps: [], spires: [], seed: 0, lobby: true, summit: true };
}

/**
 * Holds for one face. First guaranteed routes bottom to top (every move within easy reach),
 * then optional extras around them. pace 0 gentle: more routes, holds and ledges; 2 brutal: fewer.
 * face.idea changes the mix: 'ice' more icy holds, 'chimney' everything inside a dark slot, 'crumble' crumbling stone
 * (each crumbling route hold has a solid one beside it, so a broken hold never blocks the route), 'ladder' a high start.
 */
function holdsFor(face, r, pace) {
  const out = [], ledges = [], idea = face.idea;
  let w0 = face.x0 + 2, w1 = face.x1 - 2; const H = face.y1 - face.y0;
  if (idea === 'chimney') { w0 = face.cx - 2.6; w1 = face.cx + 2.6; }
  const routes = idea === 'chimney' || idea === 'gate' ? 2 : pace === 0 ? 3 : 2, G = face.gate;
  const gap = [4, 5.5, 7.5][pace] * (idea === 'wind' ? .8 : 1);
  for (let k = 0; k < routes; k++) {
    let x = w0 + (k + .5) * (w1 - w0) / routes + (idea === 'chimney' ? 0 : (r() - .5) * 4), side = r() < .5 ? -1 : 1, n = 0;
    const gx = G ? face.cx + (k ? GATE_DX : -GATE_DX) : 0; let tw = false; // temple gate: both routes run up to a twin rune ledge
    if (G) x = gx + (r() - .5) * .6;
    // the human ladder: on the temple's first face only route 0 starts low (crumbly), the others start out of reach
    let y = face.y0 + 1.6 + r() * .4;
    if (idea === 'ladder' && k > 0) y = face.y0 + 4.3;
    while (y < face.y1 - .3) {
      const roll = r(); let type = 'normal';
      if (idea === "practice") type = "normal";
      else if (n >= 2) {
        if (idea === 'ice') type = roll < .28 ? 'ice' : roll < .36 ? 'chalk' : 'normal';
        else if (idea === 'crumble' || idea === 'gate' || (idea === 'ladder' && k === 0 && y < face.y0 + 5)) type = roll < .3 ? 'crumble' : roll < .38 ? 'chalk' : 'normal';
        else type = roll < .1 + face.zone * .03 ? 'ice' : roll < .2 + face.zone * .02 ? 'chalk' : 'normal';
      } else if (idea === 'ladder' && k === 0) type = 'crumble';
      const pad = idea === 'chimney' ? .3 : 1.4, hx = Math.min(w1 + pad, Math.max(w0 - pad, x + side * (.35 + r() * .25)));
      out.push({ x: Math.min(face.x1 - .6, Math.max(face.x0 + .6, hx)), y, type, route: k, dark: idea === 'chimney' });
      if (type === 'crumble') out.push({ x: Math.min(face.x1 - .6, Math.max(face.x0 + .6, hx - side * .55)), y: y + .15, type: 'normal', route: k, dark: idea === 'chimney' });
      side = -side; y += .75 + r() * .35; x += (r() - .5) * (idea === 'chimney' ? .5 : 1.1); x = Math.max(w0, Math.min(w1, x)); n++;
      if (G) { x = Math.max(gx - .9, Math.min(gx + .9, x)); if (!tw && y > G.ledgeY + 1.6) { tw = true; ledges.push({ x0: x - 1.5, x1: x + 1.5, y: G.ledgeY, route: k, face: face.id, twin: k }); } }
      // rest ledges every few metres on each route (more often on Gentle); on Storm ridge they are many but exposed to the wind
      if (y - face.y0 > 3 && (y - (ledges.filter((l) => l.route === k).at(-1)?.y ?? face.y0)) > gap && y < face.y1 - 2 && !(G && y - 1.7 > G.ledgeY - 3 && y - 1.7 < G.y + G.h + .5)) {
        ledges.push({ x0: x - 1.4, x1: x + 1.4, y: y - 1.7, route: k, face: face.id });
      }
    }
    // two lip holds right under the top so you can haul yourself over
    out.push({ x: x - .4, y: face.y1 - .15, type: 'normal', route: k, lip: true, dark: idea === 'chimney' }, { x: x + .4, y: face.y1 - .15, type: 'normal', route: k, lip: true, dark: idea === 'chimney' });
  }
  // extras: scattered holds, never needed for the route (none outside the chimney slot, none low on the ladder face)
  if (idea !== 'chimney') {
    const extra = Math.round((face.x1 - face.x0) * H * [.09, .06, .04][pace]);
    for (let k = 0; k < extra; k++) {
      const roll = r(), type = idea === 'practice' ? 'normal' : roll < (idea === 'crumble' ? .45 : .3) ? 'crumble' : roll < .4 + face.zone * .05 ? 'ice' : roll < .48 ? 'chalk' : 'normal';
      const y = face.y0 + (idea === 'ladder' ? 4.4 : 1.2) + r() * (H - (idea === 'ladder' ? 4.7 : 1.5));
      out.push({ x: face.x0 + .8 + r() * (face.x1 - face.x0 - 1.6), y, type });
    }
  }
  return { holds: out, ledges };
}

/** Build the mountain from a seed. Swaps in its collision layout. */
export function buildSummit(seed, pace = 1, { practice = false } = {}) {
  clearSummit();
  const r = rng(seed ^ 0x5a3317), T = terraces(practice); SUMMIT.practice = practice;
  const L = layoutFor(T); useLayout(L);
  SUMMIT.seed = seed; SUMMIT.pace = pace;
  const xa = X0T * TILE, xb = (X1T + 1) * TILE, cx = (xa + xb) / 2;
  // start shelf, side cliffs and back wall
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(xb - xa + 30, 2, (START.zt1 - START.zt0 + 1) * TILE + 30), M.snow);
  shelf.position.set(cx, -1, (START.zt0 * TILE + (START.zt1 + 1) * TILE) / 2 - 10); shelf.receiveShadow = true; group.add(shelf);
  const top = T.at(-1), backZ = (top[0] + top[1]) * TILE;
  for (const sx of [xa - 6, xb + 6]) { const s = new THREE.Mesh(new THREE.BoxGeometry(12, top[2] + 40, backZ + 20), rockMat(0x8f8f99)); s.position.set(sx, (top[2] + 40) / 2 - 2, backZ / 2 + 4); s.castShadow = s.receiveShadow = true; group.add(s); }
  const back = new THREE.Mesh(new THREE.BoxGeometry(xb - xa + 24, top[2] + 60, 12), rockMat(0xa9a6ad)); back.position.set(cx, (top[2] + 60) / 2 - 2, backZ + 6); group.add(back);
  // terraces: a rock block each, a top (snow, or temple flagstones), and the climbable face in front
  let prevTop = 0, fid = 0; const jIn = ZONES.map(() => 0);
  SUMMIT.zoneTop = ZONES.map(() => 0);
  for (const [zt, depth, h, zone, kind] of T) {
    const Z = ZONES[zone], z0 = zt * TILE, z1 = (zt + depth) * TILE, j = jIn[zone]++; // j: first or second face of the zone
    const mat = rockMat(Z.rock);
    const blk = new THREE.Mesh(new THREE.BoxGeometry(xb - xa, h, z1 - z0), mat); blk.position.set(cx, h / 2, (z0 + z1) / 2); blk.castShadow = blk.receiveShadow = true; group.add(blk);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(xb - xa, .25, z1 - z0), zone === 2 ? rockMat(0xc9b48a, true) : M.snow); cap.position.set(cx, h + .1, (z0 + z1) / 2); cap.receiveShadow = true; group.add(cap);
    // the idea for this face: the zone's twist, on the face where it matters
    const idea = practice ? "practice" : zone === 0 ? 'ice' : zone === 1 ? (j === 1 ? 'chimney' : 'ice') : zone === 2 ? (j === 0 ? 'ladder' : 'gate') : zone === 3 ? 'wind' : 'push';
    const face = { id: fid++, z: z0, x0: xa, x1: xb, y0: prevTop, y1: h, zone, idea, kind, cx: cx + (r() - .5) * 16, nz: -1 };
    if (idea === 'gate') face.gate = { ledgeY: face.y0 + 6.5, y: face.y0 + 8.8, h: GATE_H };
    const fm = new THREE.Mesh(new THREE.PlaneGeometry(xb - xa, h - prevTop), new THREE.MeshStandardMaterial({ map: rockTex.clone(), color: Z.rock, roughness: .95 }));
    fm.material.map.needsUpdate = true; fm.material.map.repeat.set((xb - xa) / 6, (h - prevTop) / 6);
    fm.position.set(cx, (prevTop + h) / 2, z0 - .02); fm.rotation.y = Math.PI; fm.receiveShadow = true; group.add(fm); rayTargets.push(fm);
    SUMMIT.faces.push(face);
    if (idea === 'chimney') buildChimney(face);
    if (zone === 2) buildRuins(face, r);
    if (zone === 1) buildIcicles(face, r);
    const { holds, ledges } = holdsFor(face, r, pace);
    for (const hd of holds) SUMMIT.holds.push({ ...hd, id: SUMMIT.holds.length, face: face.id, z: z0 - .12, broken: false, chalked: false, grip: 0, lit: false, sealed: !!face.gate && hd.y >= face.gate.y && hd.y < face.gate.y + face.gate.h });
    if (face.gate) buildGate(face, ledges);
    SUMMIT.ledges.push(...ledges);
    SUMMIT.zoneTop[zone] = h;
    prevTop = h;
  }
  SUMMIT.topY = prevTop;
  // holds: one instanced mesh, coloured per type (broken holds get scaled to zero; dark chimney holds stay black until lit)
  const im = new THREE.InstancedMesh(holdGeo, M.hold, SUMMIT.holds.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
  SUMMIT.holds.forEach((hd, i) => {
    q.setFromEuler(e.set(r() * 3, r() * 3, r() * 3)); const k = hd.lip ? 1.5 : hd.type === 'crumble' ? 1.15 : 1;
    m4.compose(p.set(hd.x, hd.y, hd.z), q, s.set(1.6 * k, 1 * k, 1.1 * k)); if (hd.sealed) { hd.m = m4.clone(); m4.makeScale(0, 0, 0); } im.setMatrixAt(i, m4); // sealed holds stay inside the rock until the gate opens
    im.setColorAt(i, new THREE.Color(hd.dark ? HOLD_COLORS.dark : HOLD_COLORS[hd.type]));
  });
  im.castShadow = true; group.add(im); SUMMIT.holdMesh = im;
  // trail help: Gentle ticks a chalk mark beside every hold of route 0, Standard only the first few of each face, Brutal none
  const ticks = SUMMIT.holds.filter((h) => h.route === 0 && !h.lip && !h.sealed && (pace === 0 || (pace === 1 && h.y < SUMMIT.faces[h.face].y0 + 4.5)));
  if (ticks.length && pace < 2) {
    const tm = new THREE.InstancedMesh(new THREE.BoxGeometry(.05, .22, .02), M.tick, ticks.length);
    ticks.forEach((h, i) => { tm.setMatrixAt(i, m4.makeTranslation(h.x + .28, h.y + .05, h.z + .08)); });
    group.add(tm);
  }
  // rest ledges: narrow stone shelves on the face
  for (const l of SUMMIT.ledges) {
    const f = SUMMIT.faces[l.face];
    const lm = new THREE.Mesh(new THREE.BoxGeometry(l.x1 - l.x0, .22, .7), M.ledge); lm.position.set((l.x0 + l.x1) / 2, l.y - .11, f.z - .35); lm.castShadow = lm.receiveShadow = true; group.add(lm);
  }
  // summit flag on the top terrace
  const tz = (top[0] + 1) * TILE;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, 4.4, 8), M.pole); pole.position.set(cx, top[2] + 2.2, tz); group.add(pole);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.1), M.flag); flag.position.set(cx + .9, top[2] + 3.8, tz); group.add(flag); SUMMIT.flag = flag;
  // the summit tripod: press E beside it for a group photo (it gets pinned in the boarding hall too)
  if (!practice) {
    const tx = cx - 6, ty = top[2] + .12, tzz = tz + 2.2;
    for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2, leg = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 1.5, 5), M.pole); leg.position.set(tx + Math.cos(a) * .25, ty + .7, tzz + Math.sin(a) * .25); leg.rotation.set(Math.sin(a) * .25, 0, -Math.cos(a) * .25); group.add(leg); }
    const box = new THREE.Mesh(new THREE.BoxGeometry(.4, .28, .3), new THREE.MeshStandardMaterial({ color: 0x2b3644, roughness: .5 })); box.position.set(tx, ty + 1.55, tzz); group.add(box);
    SUMMIT.tripod = { x: tx, y: ty, z: tzz };
    SUMMIT.cam.position.set(cx - 9, top[2] + 2.4, tz + 6); SUMMIT.cam.lookAt(cx, top[2] + 1.6, tz - 1); SUMMIT.cam.updateMatrixWorld();
  } else SUMMIT.tripod = null;
  for (let i = 0; i < 18; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: flake, color: 0xffffff, transparent: true, opacity: .7, depthWrite: false })); sp.position.set(xa - 60 + r() * (xb - xa + 120), -14 + r() * 6, -40 + r() * 140); sp.scale.set(50 + r() * 40, 16, 1); group.add(sp); }
  SUMMIT.spawn = { x: cx, z: (START.zt0 + 2.5) * TILE, yaw: Math.PI }; // facing +z, towards the first face
  // camps: the trailhead, then Camp I-V on the camp terraces (a fire, benches, a bell and a checkpoint banner)
  SUMMIT.camps = [{ id: 0, name: 'Trailhead', x: SUMMIT.spawn.x, y: 0, z: SUMMIT.spawn.z, r: 7, zone: 0 }];
  T.filter((t) => t[4] === 'camp').forEach(([zt, depth, h, zone], k) => {
    const c = { id: k + 1, name: `Camp ${['I', 'II', 'III', 'IV', 'V'][k]}`, x: cx + 9, y: h, z: (zt + depth / 2) * TILE, r: 7, zone };
    SUMMIT.camps.push(c); buildCamp(c);
  });
  SUMMIT.topZ = tz; SUMMIT.built = true;
  group.visible = true;
  return L;
}
/** Which zone a height is in (0..4). */
export function zoneAtY(y) { for (let k = 0; k < SUMMIT.zoneTop.length; k++) if (y < SUMMIT.zoneTop[k] - .5) return k; return SUMMIT.zoneTop.length - 1; }

/* ================= zone set dressing ================= */
// Ice caverns: a narrow slot with ice fins either side and a black back wall
function buildChimney(f) {
  const H = f.y1 - f.y0, w = 6.4;
  SUMMIT.chimney = { face: f.id, x0: f.cx - w / 2, x1: f.cx + w / 2, y0: f.y0, y1: f.y1 };
  const back = new THREE.Mesh(new THREE.PlaneGeometry(w, H), M.dark); back.position.set(f.cx, (f.y0 + f.y1) / 2, f.z - .04); back.rotation.y = Math.PI; group.add(back);
  for (const s of [-1, 1]) { const fin = new THREE.Mesh(new THREE.BoxGeometry(.8, H, 2.6), M.ice); fin.position.set(f.cx + s * (w / 2 + .4), (f.y0 + f.y1) / 2, f.z - 1.3); group.add(fin); }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 1.6, .6, 2.6), M.ice); roof.position.set(f.cx, f.y1 + .3, f.z - 1.3); group.add(roof);
}
function buildIcicles(f, r) {
  const g = new THREE.ConeGeometry(.18, 1.4, 6).rotateX(Math.PI);
  const im = new THREE.InstancedMesh(g, M.ice, 40), m = new THREE.Matrix4();
  for (let i = 0; i < 40; i++) im.setMatrixAt(i, m.makeTranslation(f.x0 + 1 + r() * (f.x1 - f.x0 - 2), f.y1 - .7, f.z - .2));
  group.add(im);
}
// Temple ruins: carved bands on the faces and broken pillars on the terraces
function buildRuins(f, r) {
  const band = new THREE.Mesh(new THREE.BoxGeometry(f.x1 - f.x0, .5, .25), rockMat(0x9c8460)); band.position.set((f.x0 + f.x1) / 2, f.y1 - 1.2, f.z - .1); group.add(band);
  const pill = rockMat(0xd2bf98);
  for (let i = 0; i < 4; i++) { const h = 1.5 + r() * 3, p = new THREE.Mesh(new THREE.CylinderGeometry(.45, .55, h, 10), pill); p.position.set(f.x0 + 3 + r() * (f.x1 - f.x0 - 6), f.y1 + h / 2, f.z + 2 + r() * 4); p.castShadow = true; group.add(p); }
}

export function clearSummit() {
  group.traverse((o) => { if (o.geometry && o.geometry !== holdGeo) o.geometry.dispose(); });
  group.clear(); SUMMIT.faces = []; SUMMIT.holds = []; SUMMIT.ledges = []; SUMMIT.camps = []; SUMMIT.holdMesh = null; SUMMIT.built = false; SUMMIT.chimney = null; SUMMIT.gate = null; flames.length = 0;
  campLight.visible = false;
}
export function showSummit(v) { group.visible = v && SUMMIT.built; campLight.visible = group.visible; }
export const summitActive = () => group.visible;
/** The camp a climber standing at (x, y, z) is in, or null. */
export function campAt(x, y, z) { for (const c of SUMMIT.camps) if (Math.abs(y - c.y) < 1.2 && Math.hypot(x - c.x, z - c.z) < c.r) return c; return null; }
/** Light the camp's banner once the team has reached it. */
export function markCamp(c) { if (c.banner) { c.banner.material.color.set(0xffd23f); c.reached = true; } }
/** Is (x, y) inside the dark chimney? */
export const inChimney = (x, y, z) => { const c = SUMMIT.chimney, f = c && SUMMIT.faces[c.face]; return !!c && x > c.x0 - .5 && x < c.x1 + .5 && y > c.y0 - 1 && y < c.y1 && z > f.z - 3; };

/* ================= the temple gate (co-op puzzle) ================= */
// Halfway up the second temple face a band of carved stone seals the holds. Two climbers standing on the twin rune
// ledges at the same moment open it, or one climber winds the crank at the foot of the face (hold E, costs stamina).
const gateM = {
  slab: new THREE.MeshStandardMaterial({ color: 0xb59d74, roughness: .9, flatShading: true }),
  wood: new THREE.MeshStandardMaterial({ color: 0x8a5a33, roughness: .9, flatShading: true }),
  brass: new THREE.MeshStandardMaterial({ color: 0xe0b04a, metalness: .6, roughness: .35 }),
};
const RUNES = 10;
function buildGate(f, ledges) {
  const G = f.gate, w = f.x1 - f.x0, cx = (f.x0 + f.x1) / 2;
  const slab = new THREE.Mesh(new THREE.BoxGeometry(w - .2, G.h, .3), gateM.slab); slab.position.set(cx, G.y + G.h / 2, f.z - .15); slab.receiveShadow = true; group.add(slab);
  // a row of runes across the band: they light up as the gate opens
  const runes = [];
  for (let i = 0; i < RUNES; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(.5, .8, .08), new THREE.MeshStandardMaterial({ color: 0x5b4a33, emissive: 0xff9a2a, emissiveIntensity: 0, roughness: .6 }));
    m.position.set(f.cx + (i - (RUNES - 1) / 2) * 1.3, G.y + G.h / 2, f.z - .33); m.rotation.z = (i % 3 - 1) * .3; group.add(m); runes.push(m);
  }
  // rune plates on the twin ledges: dim until someone stands on them
  const plates = ledges.filter((l) => l.twin !== undefined).map((l) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(l.x1 - l.x0 - .4, .05, .5), new THREE.MeshStandardMaterial({ color: 0x6b5a3e, emissive: 0xff9a2a, emissiveIntensity: .15 }));
    m.position.set((l.x0 + l.x1) / 2, l.y + .02, f.z - .4); group.add(m); return m;
  });
  // the crank: a wooden post with a brass wheel, on the terrace at the foot of the face
  const ck = { x: f.cx, y: f.y0, z: f.z - 2.6 };
  const post = new THREE.Mesh(new THREE.CylinderGeometry(.12, .14, 1.3, 8), gateM.wood); post.position.set(ck.x, ck.y + .65, ck.z + .25); post.castShadow = true; group.add(post);
  const wheel = new THREE.Group(); wheel.position.set(ck.x, ck.y + 1.15, ck.z); group.add(wheel);
  wheel.add(new THREE.Mesh(new THREE.TorusGeometry(.45, .05, 6, 20), gateM.brass));
  for (let k = 0; k < 3; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(.9, .05, .05), gateM.brass); sp.rotation.z = k / 3 * Math.PI; wheel.add(sp); }
  const hd = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .3, 6), gateM.wood); hd.rotation.x = Math.PI / 2; hd.position.set(.45, 0, -.15); wheel.add(hd);
  // a rope from the wheel up to the band, so it reads as one machine
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, G.y - f.y0 - 1.1, 5), new THREE.MeshStandardMaterial({ color: 0xc9a36a })); cord.position.set(ck.x, (G.y + f.y0 + 1.1) / 2, f.z - .08); group.add(cord);
  SUMMIT.gate = { face: f.id, y: G.y, h: G.h, ledgeY: G.ledgeY, ledges: ledges.filter((l) => l.twin !== undefined), crank: ck, open: false, prog: 0, slab, runes, plates, wheel, openT: -1 };
}
/** Which twin ledge (0 / 1) someone at (x, y) on face `face` is standing on, or -1. */
export function twinAt(x, y, face) {
  const G = SUMMIT.gate; if (!G || G.open || face !== G.face) return -1;
  for (const l of G.ledges) if (x > l.x0 - .1 && x < l.x1 + .1 && Math.abs(y - l.y) < .3) return l.twin;
  return -1;
}
/** Standing at the crank? */
export const nearCrank = (x, y, z) => { const G = SUMMIT.gate, c = G?.crank; return !!c && !G.open && Math.abs(y - c.y) < .6 && Math.hypot(x - c.x, z - c.z) < 1.7; };
/** Open the gate: the band sinks into the rock and the holds behind it come out. */
export function openGate() {
  const G = SUMMIT.gate; if (!G || G.open) return false;
  G.open = true; G.openT = 0; G.prog = 1;
  for (const h of SUMMIT.holds) if (h.sealed) { h.sealed = false; if (h.m) SUMMIT.holdMesh.setMatrixAt(h.id, h.m); }
  SUMMIT.holdMesh.instanceMatrix.needsUpdate = true;
  return true;
}
/** Every frame: runes, plates and the wheel show the state. on: [ledge 0 held, ledge 1 held]. */
export function updateGate(dt, on = [false, false]) {
  const G = SUMMIT.gate; if (!G) return;
  G.runes.forEach((m, i) => { const lit = G.open || (i + .5) / RUNES < G.prog; m.material.emissiveIntensity += ((lit ? 1.6 : 0) - m.material.emissiveIntensity) * Math.min(1, dt * 6); });
  G.plates.forEach((m, i) => { m.material.emissiveIntensity += ((G.open ? .6 : on[i] ? 1.8 : .15) - m.material.emissiveIntensity) * Math.min(1, dt * 8); });
  G.wheel.rotation.z = -G.prog * Math.PI * 8;
  if (G.openT >= 0 && G.openT < 1.6) { G.openT += dt; const k = Math.min(1, G.openT / 1.4); G.slab.position.z = SUMMIT.faces[G.face].z - .15 + k * .5; G.runes.forEach((m) => { m.position.z = SUMMIT.faces[G.face].z - .33 + k * .5; }); if (k >= 1) { G.slab.visible = false; G.runes.forEach((m) => { m.visible = false; }); } }
}

// glowsticks that hit a face stick to the rock (so you can light the chimney from below)
setStickHook((s, H) => {
  if (!group.visible || s.vz <= 0) return false;
  for (const f of SUMMIT.faces) if (s.z + s.vz * H >= f.z - .08 && s.z < f.z + .3 && s.y > f.y0 && s.y < f.y1 && s.x > f.x0 && s.x < f.x1) { s.z = f.z - .07; return true; }
  return false;
});

/* ================= camps ================= */
const flames = [];
const campM = {
  wood: new THREE.MeshStandardMaterial({ color: 0x8a5a33, roughness: .9, flatShading: true }),
  stone: new THREE.MeshStandardMaterial({ color: 0x7d746c, roughness: 1, flatShading: true }),
  brass: new THREE.MeshStandardMaterial({ color: 0xe0b04a, metalness: .6, roughness: .35 }),
};
// one warm light shared by all camps: it sits at the camp closest to you (every extra light costs every pixel)
const campLight = new THREE.PointLight(0xffa860, 28, 14, 1.6); campLight.visible = false; scene.add(campLight);
function buildCamp(c) {
  const g = new THREE.Group(); g.position.set(c.x, c.y + .12, c.z); group.add(g); c.g = g;
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
  // fire: a ring of stones, crossed logs and two flame sprites
  for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; add(new THREE.DodecahedronGeometry(.2, 0), campM.stone, Math.cos(a) * .75, .1, Math.sin(a) * .75).castShadow = false; } // too small to need a shadow
  for (let k = 0; k < 3; k++) { const l = add(new THREE.CylinderGeometry(.08, .08, 1.1, 6), campM.wood, 0, .18, 0); l.castShadow = false; l.rotation.set(Math.PI / 2, 0, k / 3 * Math.PI); }
  const f1 = new THREE.Sprite(new THREE.SpriteMaterial({ map: flake, color: 0xff6a1a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }));
  const f2 = new THREE.Sprite(f1.material.clone()); f2.material.color.set(0xffd27a); f1.position.y = .7; f2.position.y = .6; g.add(f1, f2);
  flames.push({ f1, f2, c, ph: Math.random() * 6 });
  // two benches facing the fire
  for (const s of [-1, 1]) { add(new THREE.BoxGeometry(2.2, .12, .5), campM.wood, 0, .45, s * 2.1); for (const x of [-.9, .9]) add(new THREE.BoxGeometry(.12, .45, .4), campM.wood, x, .22, s * 2.1); }
  // the camp bell on a post
  add(new THREE.CylinderGeometry(.07, .07, 2.6, 6), campM.wood, -3, 1.3, 0);
  add(new THREE.BoxGeometry(.9, .1, .1), campM.wood, -2.7, 2.55, 0);
  add(new THREE.CylinderGeometry(.12, .26, .36, 12, 1, true), campM.brass, -2.4, 2.3, 0).material.side = THREE.DoubleSide;
  // checkpoint banner: grey until the team gets here, then gold
  add(new THREE.CylinderGeometry(.06, .06, 3.6, 6), M.pole, 3, 1.8, 0);
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128; const x = cv.getContext('2d');
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, 256, 128); x.fillStyle = '#1b2738'; x.font = '900 52px ui-rounded, system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(c.name.toUpperCase(), 128, 66);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(1.8, .9), new THREE.MeshBasicMaterial({ map: t, color: 0xa8b0ba, side: THREE.DoubleSide }));
  banner.position.set(3.95, 3.1, 0); g.add(banner); c.banner = banner;
}
let litT = 0;
const _c = new THREE.Color();
/**
 * Every frame on the mountain. viewer: the local climber (for the shared camp light), sticks: glowsticks in the world,
 * flash: lightning brightness 0..1 (a flash shows the dark holds too).
 */
export function updateSummitWorld(t, viewer, sticks = [], flash = 0) {
  if (SUMMIT.flag) SUMMIT.flag.rotation.y = Math.sin(t * 2) * .25;
  let best = null, bd = 1e9;
  for (const f of flames) {
    const w = 1 + Math.sin(t * 13 + f.ph) * .12 + Math.sin(t * 23) * .06; f.f1.scale.set(1.2 * w, 1.7 * (2 - w), 1); f.f2.scale.set(.7 * w, 1 * (2 - w), 1);
    if (viewer) { const d = Math.hypot(viewer.x - f.c.x, (viewer.y - f.c.y) * 2, viewer.z - f.c.z); if (d < bd) { bd = d; best = f; } f.c.g.visible = Math.abs(viewer.y - f.c.y) < 70; } // camps far above or below you are not drawn
  }
  if (best && bd < 40) { campLight.position.set(best.c.x, best.c.y + 1.3, best.c.z); campLight.intensity = 24 + Math.sin(t * 13) * 3; campLight.visible = group.visible; } else campLight.visible = false;
  // the chimney: a dark hold shows (and can be grabbed) while a glowstick is close to it, or during a lightning flash
  litT -= 1 / 60; if (litT > 0 || !SUMMIT.chimney || !SUMMIT.holdMesh) return; litT = .15;
  const ch = SUMMIT.chimney, near = [];
  for (const s of sticks) if (s.x > ch.x0 - 6 && s.x < ch.x1 + 6 && s.y > ch.y0 - 9 && s.y < ch.y1 + 9) near.push(s);
  let changed = false;
  for (const h of SUMMIT.holds) {
    if (!h.dark || h.broken) continue;
    const lit = flash > .3 || near.some((s) => Math.hypot(h.x - s.x, h.y - s.y) < 6.5 && Math.abs(h.z - s.z) < 4);
    if (lit !== h.lit) { h.lit = lit; SUMMIT.holdMesh.setColorAt(h.id, _c.set(lit ? (h.chalked ? HOLD_COLORS.chalked : HOLD_COLORS[h.type]) : HOLD_COLORS.dark)); changed = true; }
  }
  if (changed) SUMMIT.holdMesh.instanceColor.needsUpdate = true;
}
/** Hide a hold for good (crumbled). */
export function breakHold(h) {
  if (h.broken) return; h.broken = true;
  const m = new THREE.Matrix4().makeScale(0, 0, 0); SUMMIT.holdMesh.setMatrixAt(h.id, m); SUMMIT.holdMesh.instanceMatrix.needsUpdate = true;
}
export function chalkHold(h) { h.chalked = true; if (!h.dark || h.lit) { SUMMIT.holdMesh.setColorAt(h.id, new THREE.Color(HOLD_COLORS.chalked)); SUMMIT.holdMesh.instanceColor.needsUpdate = true; } }
