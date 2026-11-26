// Ridgeline climber rig: a chunky "bean" climber with a painted face and swappable gear.
// Cheap to draw: one capsule body, one head sphere, a face decal (a canvas texture) and a handful of gear meshes.
// Joints: hips → torso → head, shoulders → elbows, hips → knees. Facing -Z.
import { THREE, label } from './world.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ================= options ================= */
export const HATS = ['Pom beanie', 'Striped beanie', 'Trapper', 'Helmet', 'Bucket hat', 'Headband', 'Propeller cap', 'No hat', 'Summit hat']; // the last one is a Summit reward
export const OUTFITS = ['Puffer', 'Anorak', 'Overalls', 'Poncho'];
export const EYES = ['round', 'dot', 'happy', 'sleepy', 'fierce', 'wink', 'lashes'];
export const MOUTHS = ['smile', 'grin', 'open', 'flat', 'smirk', 'teeth', 'cat'];
export const BROWS = ['soft', 'bold', 'worried', 'angry', 'none'];
export const CHEEKS = ['blush', 'freckles', 'none'];
export const SKINS = ['#ffd9b8', '#f0c7a0', '#d9a273', '#a86b45', '#6e4129', '#ffe36e', '#8fd6ff', '#b8f28a', '#ffb3d1', '#c7b0ff', '#ff9a76', '#e8eef7'];
export const DEFAULT_LOOK = {
  skin: '#ffd9b8', eyes: 'round', mouth: 'smile', brows: 'soft', cheeks: 'blush',
  outfit: 0, hat: 0, hatc: '', scarf: '#ffd23f', pack: '', goggles: '#1b2738', gloves: '#27303b', pants: '#33405a', w: 1, h: 1,
};
export const normLook = (l = {}) => {
  const o = { ...DEFAULT_LOOK, ...l };
  o.hat = clamp(+o.hat || 0, 0, HATS.length - 1); o.outfit = clamp(+o.outfit || 0, 0, OUTFITS.length - 1);
  o.w = clamp(+o.w || 1, .82, 1.25); o.h = clamp(+o.h || 1, .86, 1.16); o.rope = o.rope === 'gold' ? 'gold' : '';
  for (const [k, list] of [['eyes', EYES], ['mouth', MOUTHS], ['brows', BROWS], ['cheeks', CHEEKS]]) if (!list.includes(o[k])) o[k] = DEFAULT_LOOK[k];
  return o;
};

/* ================= the face (painted on a canvas) ================= */
const INK = '#1b2738';
function drawFace(g, L, mode, S = 256, bg = false) {
  const s = S / 256; g.save(); g.scale(s, s);
  if (bg) { g.fillStyle = L.skin; g.beginPath(); g.arc(128, 128, 124, 0, 7); g.fill(); g.lineWidth = 6; g.strokeStyle = INK; g.stroke(); }
  g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = INK; g.fillStyle = INK;
  const EY = 112, EX = [80, 176];
  // cheeks
  if (L.cheeks === 'blush') { g.fillStyle = 'rgba(255,105,120,.42)'; for (const x of [56, 200]) { g.beginPath(); g.ellipse(x, 150, 20, 12, 0, 0, 7); g.fill(); } }
  if (L.cheeks === 'freckles') { g.fillStyle = 'rgba(120,60,30,.55)'; for (const x of [56, 200]) for (const [dx, dy] of [[-9, -3], [3, -6], [10, 3], [-3, 5]]) { g.beginPath(); g.arc(x + dx, 148 + dy, 3, 0, 7); g.fill(); } }
  g.fillStyle = INK;
  // brows
  const brow = (x, side) => {
    g.lineWidth = L.brows === 'bold' ? 11 : 6; g.beginPath();
    if (L.brows === 'soft' || L.brows === 'bold') { g.moveTo(x - 18, 80); g.quadraticCurveTo(x, 70, x + 18, 80); }
    if (L.brows === 'worried' || (mode === 'tired' && L.brows !== 'none')) { g.moveTo(x - 18 * side, 76); g.lineTo(x + 18 * side, 86); }
    else if (L.brows === 'angry') { g.moveTo(x - 18 * side, 72); g.lineTo(x + 16 * side, 86); }
    g.stroke();
  };
  if (L.brows !== 'none') { brow(EX[0], 1); brow(EX[1], -1); }
  // eyes
  const closed = (x) => { g.lineWidth = 7; g.beginPath(); g.moveTo(x - 15, EY + 2); g.quadraticCurveTo(x, EY + 9, x + 15, EY + 2); g.stroke(); };
  const happy = (x) => { g.lineWidth = 8; g.beginPath(); g.moveTo(x - 15, EY + 6); g.quadraticCurveTo(x, EY - 14, x + 15, EY + 6); g.stroke(); };
  const dot = (x) => { g.beginPath(); g.ellipse(x, EY, 10, 15, 0, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x + 3, EY - 6, 4, 0, 7); g.fill(); g.fillStyle = INK; };
  const round = (x) => { g.fillStyle = '#fff'; g.lineWidth = 5; g.beginPath(); g.arc(x, EY, 21, 0, 7); g.fill(); g.stroke(); g.fillStyle = INK; g.beginPath(); g.arc(x + 2, EY + 2, 11, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x + 6, EY - 3, 4, 0, 7); g.fill(); g.fillStyle = INK; };
  const lid = (x, side, cut) => { g.fillStyle = L.skin; g.beginPath(); g.moveTo(x - 26, EY - 26); g.lineTo(x + 26, EY - 26); g.lineTo(x + 26, EY - 26 + cut * (side > 0 ? 1.6 : .4)); g.lineTo(x - 26, EY - 26 + cut * (side > 0 ? .4 : 1.6)); g.fill(); g.fillStyle = INK; };
  const eye = (x, i) => {
    const side = i ? -1 : 1;
    if (mode === 'down') { g.lineWidth = 7; g.beginPath(); g.moveTo(x - 12, EY - 12); g.lineTo(x + 12, EY + 12); g.moveTo(x + 12, EY - 12); g.lineTo(x - 12, EY + 12); g.stroke(); return; }
    if (mode === 'tired') { g.lineWidth = 7; g.beginPath(); g.moveTo(x - 13 * side, EY - 10); g.lineTo(x + 11 * side, EY); g.lineTo(x - 13 * side, EY + 10); g.stroke(); return; }
    if (mode === 'blink' && L.eyes !== 'happy') return closed(x);
    if (mode === 'joy') return happy(x);
    switch (L.eyes) {
      case 'dot': return dot(x);
      case 'happy': return happy(x);
      case 'sleepy': round(x); g.fillStyle = L.skin; g.fillRect(x - 24, EY - 26, 48, 24); g.fillStyle = INK; g.lineWidth = 5; g.beginPath(); g.moveTo(x - 22, EY - 2); g.lineTo(x + 22, EY - 2); g.stroke(); return;
      case 'fierce': round(x); lid(x, side, 20); g.lineWidth = 5; g.beginPath(); g.moveTo(x - 24, EY - 26 + 20 * (side > 0 ? .4 : 1.6)); g.lineTo(x + 24, EY - 26 + 20 * (side > 0 ? 1.6 : .4)); g.stroke(); return;
      case 'wink': return i ? happy(x) : round(x);
      case 'lashes': dot(x); g.lineWidth = 4; g.beginPath(); for (const a of [-.9, -.45, 0]) { const ax = Math.cos(Math.PI + a * side) * 0 + x - 10 * side, ay = EY - 12; g.moveTo(ax, ay); g.lineTo(ax - 9 * side, ay - 8 - a * 3); } g.stroke(); return;
      default: return round(x);
    }
  };
  EX.forEach(eye);
  // mouth
  const MY = 164; g.lineWidth = 7;
  const m = mode === 'tired' ? 'pant' : mode === 'down' ? 'flat' : mode === 'joy' ? 'grin' : L.mouth;
  g.beginPath();
  switch (m) {
    case 'grin': case 'teeth':
      g.moveTo(98, MY - 6); g.quadraticCurveTo(128, MY - 2, 158, MY - 6); g.quadraticCurveTo(156, MY + 30, 128, MY + 30); g.quadraticCurveTo(100, MY + 30, 98, MY - 6); g.closePath(); g.fill();
      if (m === 'teeth') { g.fillStyle = '#fff'; g.fillRect(106, MY - 4, 44, 9); g.fillStyle = INK; }
      else { g.fillStyle = '#ff7c8a'; g.beginPath(); g.ellipse(128, MY + 20, 15, 8, 0, 0, 7); g.fill(); g.fillStyle = INK; }
      break;
    case 'open': g.ellipse(128, MY + 6, 11, 14, 0, 0, 7); g.fill(); break;
    case 'pant': g.ellipse(128, MY + 8, 14, 18, 0, 0, 7); g.fill(); g.fillStyle = '#ff7c8a'; g.beginPath(); g.ellipse(128, MY + 18, 9, 6, 0, 0, 7); g.fill(); g.fillStyle = INK; break;
    case 'flat': g.moveTo(108, MY + 6); g.lineTo(148, MY + 6); g.stroke(); break;
    case 'smirk': g.moveTo(104, MY + 8); g.quadraticCurveTo(132, MY + 12, 154, MY - 4); g.stroke(); break;
    case 'cat': g.moveTo(102, MY); g.quadraticCurveTo(115, MY + 16, 128, MY + 2); g.quadraticCurveTo(141, MY + 16, 154, MY); g.stroke(); break;
    default: g.moveTo(102, MY); g.quadraticCurveTo(128, MY + 24, 154, MY); g.stroke();
  }
  g.restore();
}
const faceCache = new Map();
function faceTex(L, mode) {
  const key = [L.skin, L.eyes, L.mouth, L.brows, L.cheeks, mode].join('|');
  let t = faceCache.get(key);
  if (!t) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    drawFace(c.getContext('2d'), L, mode);
    t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; faceCache.set(key, t);
  }
  return t;
}
/** A small round picture of a face, used for the option buttons in the creator. */
export function faceThumb(look, size = 72) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  drawFace(c.getContext('2d'), normLook(look), 'open', size, true);
  return c.toDataURL();
}

/* ================= shared geometry (built once) ================= */
const HEAD_R = .362;
const G = {
  body: new THREE.CapsuleGeometry(.36, .5, 6, 16),
  head: new THREE.SphereGeometry(HEAD_R, 24, 16),
  face: new THREE.SphereGeometry(HEAD_R + .004, 20, 14, Math.PI * 1.5 - .85, 1.7, Math.PI * .22, Math.PI * .55),
  jacket: new THREE.LatheGeometry([[0, -.25], [.18, -.235], [.31, -.15], [.385, -.02], [.4, .15], [.395, .32], [.375, .42], [.335, .47]].map(([r, y]) => new THREE.Vector2(r, y)), 22),
  overall: new THREE.LatheGeometry([[0, -.25], [.18, -.235], [.31, -.15], [.385, -.02], [.398, .14], [.392, .22]].map(([r, y]) => new THREE.Vector2(r, y)), 22),
  poncho: new THREE.CylinderGeometry(.34, .6, .46, 22, 1, true),
  ponchoBand: new THREE.CylinderGeometry(.585, .61, .07, 22, 1, true),
  quilt: new THREE.TorusGeometry(.398, .03, 6, 26),
  collar: new THREE.TorusGeometry(.31, .085, 8, 20),
  // long, skinny noodle limbs with round joints so the bends always look smooth
  upper: new THREE.CapsuleGeometry(.058, .3, 4, 10),
  lower: new THREE.CapsuleGeometry(.054, .28, 4, 10),
  joint: new THREE.SphereGeometry(.064, 10, 8),
  mitt: new THREE.SphereGeometry(.105, 12, 10),
  thumb: new THREE.SphereGeometry(.046, 8, 6),
  thigh: new THREE.CapsuleGeometry(.07, .3, 4, 10),
  shin: new THREE.CapsuleGeometry(.065, .26, 4, 10),
  boot: new THREE.BoxGeometry(.23, .16, .34),
  toe: new THREE.SphereGeometry(.118, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2),
  sole: new THREE.BoxGeometry(.25, .04, .4),
  scarf: new THREE.TorusGeometry(.345, .075, 8, 22),
  tail: new THREE.BoxGeometry(.11, .26, .05),
  bag: new THREE.BoxGeometry(.46, .52, .24),
  roll: new THREE.CylinderGeometry(.11, .11, .54, 12),
  cap: new THREE.SphereGeometry(HEAD_R + .016, 22, 10, 0, Math.PI * 2, 0, Math.PI * .37),
  helmet: new THREE.SphereGeometry(HEAD_R + .028, 22, 10, 0, Math.PI * 2, 0, Math.PI * .42),
  cuff: new THREE.TorusGeometry(.345, .052, 8, 26),
  ring1: new THREE.TorusGeometry(.305, .028, 6, 26), ring2: new THREE.TorusGeometry(.235, .028, 6, 24),
  pom: new THREE.SphereGeometry(.1, 10, 8),
  flap: new THREE.BoxGeometry(.08, .24, .17),
  brim: new THREE.CylinderGeometry(.5, .54, .035, 24),
  bucket: new THREE.CylinderGeometry(.33, .37, .2, 22),
  band: new THREE.TorusGeometry(.355, .045, 8, 26),
  visor: new THREE.BoxGeometry(.3, .03, .2),
  stem: new THREE.CylinderGeometry(.018, .018, .12, 6),
  blade: new THREE.BoxGeometry(.36, .012, .07),
  lamp: new THREE.BoxGeometry(.11, .07, .06),
  gband: new THREE.TorusGeometry(.282, .03, 6, 24),
  lens: new THREE.CylinderGeometry(.076, .076, .06, 14),
  zip: new THREE.BoxGeometry(.03, .4, .02),
  pocket: new THREE.BoxGeometry(.22, .12, .03),
  bib: new THREE.BoxGeometry(.32, .24, .05),
  strap: new THREE.BoxGeometry(.065, .26, .04),
  button: new THREE.SphereGeometry(.03, 8, 6),
};

/* ================= build ================= */
export function makeClimber(color, name, look = {}) {
  const L = normLook(look);
  const root = new THREE.Group();
  const std = (c, r = .8, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, ...extra });
  const jc = new THREE.Color(color);
  const skin = std(L.skin, .65), jacket = std(jc, .75, { side: THREE.DoubleSide }), jDark = std(jc.clone().offsetHSL(0, 0, -.12), .8, { side: THREE.DoubleSide });
  const pants = std(L.pants, .85), gloves = std(L.gloves, .8), boot = std(0x5a3a24, .9), white = std(0xffffff), cream = std(0xf3e6c8, 1);
  const hatMat = std(L.hatc || jc, .75), sole = std(0x2a1d14, .95), scarfC = L.scarf === 'frost' ? '#cdeeff' : L.scarf;
  const add = (parent, geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; };
  const pivot = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };

  const hips = pivot(root, 0, .8, 0);
  const torso = pivot(hips, 0, 0, 0);
  add(torso, G.body, skin, 0, .4, 0);
  // outfit
  const sleeve = L.outfit === 2 ? skin : jacket;
  if (L.outfit === 0) { add(torso, G.jacket, jacket); for (const y of [.06, .26]) add(torso, G.quilt, jDark, 0, y, 0).rotation.x = Math.PI / 2; }
  if (L.outfit === 1) {
    add(torso, G.jacket, jacket); add(torso, G.collar, jDark, 0, .41, .02).rotation.x = Math.PI / 2;
    add(torso, G.zip, white, 0, .2, -.405); add(torso, G.pocket, jDark, 0, .02, -.398);
  }
  if (L.outfit === 2) {
    add(torso, G.overall, jacket); add(torso, G.bib, jacket, 0, .28, -.375);
    for (const s of [-1, 1]) { add(torso, G.strap, jacket, s * .13, .44, -.372); add(torso, G.strap, jacket, s * .13, .44, .372); add(torso, G.button, std(0xffd23f, .4), s * .13, .38, -.4); }
  }
  if (L.outfit === 3) {
    add(torso, G.jacket, jDark); add(torso, G.poncho, jacket, 0, .2, 0); add(torso, G.ponchoBand, std(L.scarf === 'none' ? 0xffffff : scarfC, .8), 0, .02, 0);
    add(torso, G.collar, jacket, 0, .41, 0).rotation.x = Math.PI / 2;
  }
  if (L.scarf !== 'none') {
    const sm = std(scarfC, .85, L.scarf === 'frost' ? { emissive: 0x6fc8ff, emissiveIntensity: .35 } : {}); // frost scarf: Standard summit reward
    add(torso, G.scarf, sm, 0, .4, 0).rotation.x = Math.PI / 2;
    const tl = add(torso, G.tail, sm, .15, .27, -.4); tl.rotation.z = -.18;
  }
  // backpack
  const bag = pivot(torso, 0, .28, .44);
  if (L.pack !== 'none') {
    add(bag, G.bag, std(L.pack ? L.pack : jc.clone().offsetHSL(.05, -.1, -.18), .9));
    add(bag, G.roll, cream, 0, .34, 0).rotation.z = Math.PI / 2;
  }
  // head
  const head = pivot(torso, 0, .65, 0);
  add(head, G.head, skin);
  const faceMat = new THREE.MeshStandardMaterial({ map: faceTex(L, 'open'), transparent: true, depthWrite: false, roughness: .6, polygonOffset: true, polygonOffsetFactor: -2 });
  const face = add(head, G.face, faceMat); face.castShadow = false; face.renderOrder = 2;
  let pom = new THREE.Group(), prop = null; head.add(pom);
  const hy = .0;
  switch (L.hat) {
    case 0: add(head, G.cap, hatMat, 0, hy); add(head, G.cuff, white, 0, .15).rotation.x = Math.PI / 2; pom = add(head, G.pom, white, 0, .44); break;
    case 1: add(head, G.cap, hatMat, 0, hy); add(head, G.ring1, white, 0, .24).rotation.x = Math.PI / 2; add(head, G.ring2, white, 0, .3).rotation.x = Math.PI / 2; add(head, G.cuff, hatMat, 0, .15).rotation.x = Math.PI / 2; pom = add(head, G.pom, hatMat, 0, .43); pom.scale.setScalar(.7); break;
    case 2: add(head, G.cap, hatMat, 0, hy); add(head, G.cuff, cream, 0, .15).rotation.x = Math.PI / 2; for (const s of [-1, 1]) { const f = add(head, G.flap, hatMat, s * .36, -.02, 0); f.rotation.z = s * .2; } break;
    case 3: { const shell = std(L.hatc || 0xff8a2a, .35, { metalness: .1 }); add(head, G.helmet, shell); add(head, G.lamp, new THREE.MeshBasicMaterial({ color: 0xfff1a0 }), 0, .27, -.3); break; }
    case 4: add(head, G.bucket, hatMat, 0, .26); add(head, G.brim, hatMat, 0, .17); add(head, G.cap, hatMat, 0, .02).scale.set(.95, .9, .95); break;
    case 5: add(head, G.band, hatMat, 0, .19).rotation.x = Math.PI / 2; { const k = add(head, G.pom, hatMat, 0, .19, .36); k.scale.set(.6, .5, .4); } break;
    case 6: {
      add(head, G.cap, hatMat, 0, hy); add(head, G.visor, hatMat, 0, .16, -.34).rotation.x = -.2;
      add(head, G.stem, std(0x888888, .4), 0, .43);
      prop = pivot(head, 0, .5, 0); const cols = [0xff6f59, 0xffd23f, 0x2ec4f1];
      [0, 1].forEach((k) => { const b = add(prop, G.blade, std(cols[k], .5)); b.rotation.y = k * Math.PI / 2; });
      add(prop, G.button, std(cols[2], .5));
      break;
    }
    case 8: { const gold = std(0xffc531, .35, { metalness: .5 }); add(head, G.cap, std(L.hatc || 0xe5383b, .75), 0, hy); add(head, G.cuff, gold, 0, .15).rotation.x = Math.PI / 2; pom = add(head, G.pom, gold, 0, .44); break; } // Summit hat (Gentle summit reward)
    default: break;
  }
  if (L.goggles !== 'none') {
    const gm = std(L.goggles, .25, { metalness: .5 }), lm = std(0xbfe8ff, .1, { metalness: .2, emissive: 0x335566, emissiveIntensity: .3 });
    // pushed up on the forehead, or resting on the hat
    const onHat = ![5, 7].includes(L.hat), gy = .2, gr = L.hat === 4 ? .385 : onHat ? .338 : .308;
    const gb = add(head, G.gband, gm, 0, gy, 0); gb.rotation.x = Math.PI / 2 - .1; gb.scale.setScalar(gr / .282);
    for (const s of [-1, 1]) { const l = add(head, G.lens, lm, s * .1, gy + .02, -(gr - .005)); l.rotation.x = Math.PI / 2 - .45; }
  }

  const arm = (side) => {
    const sh = pivot(torso, side * .35, .42, 0);
    add(sh, G.joint, sleeve);
    add(sh, G.upper, sleeve, 0, -.18, 0);
    const el = pivot(sh, 0, -.36, 0);
    add(el, G.joint, sleeve).scale.setScalar(.92);
    add(el, G.lower, sleeve, 0, -.17, 0);
    const hand = pivot(el, 0, -.36, 0);
    add(hand, G.mitt, gloves).scale.set(1, 1.12, .92);
    add(hand, G.thumb, gloves, -side * .07, .03, -.05);
    return { sh, el, hand };
  };
  const leg = (side) => {
    const hip = pivot(hips, side * .15, 0, 0);
    add(hip, G.thigh, pants, 0, -.2, 0);
    const knee = pivot(hip, 0, -.4, 0);
    add(knee, G.joint, pants).scale.setScalar(1.08);
    add(knee, G.shin, pants, 0, -.15, 0);
    add(knee, G.boot, boot, 0, -.32, .02);
    add(knee, G.toe, boot, 0, -.4, -.13).scale.set(1, .85, 1);
    add(knee, G.sole, sole, 0, -.4, -.03);
    return { hip, knee };
  };
  const rig = { hips, torso, head, bag, pom, prop, face: faceMat, look: L, mode: 'open', blink: 2 + Math.random() * 3, armL: arm(-1), armR: arm(1), legL: leg(-1), legR: leg(1), phase: 0, t: Math.random() * 10, v: {}, lastYaw: null, lastVy: 0, wasGround: true };
  root.userData.rig = rig;
  root.userData.torso = torso;
  root.scale.set(L.w, L.h, L.w);
  if (name) { const lb = label(name, color); lb.position.y /= L.h; root.add(lb); }
  return root;
}
/** Free the per-climber materials when a climber is rebuilt (geometry and face textures are shared). */
export function disposeClimber(root) {
  root.traverse((o) => { if (o.isMesh && o.material && !o.material.map) o.material.dispose(); });
}

/**
 * s: { speed, ground, vy, sprint, crank, stumble, tired, wave, push, down, sit, joy }
 * Blends towards the target pose every frame so state changes never pop.
 */
export function animateRig(root, s, dt) {
  const r = root.userData.rig; if (!r) return;
  r.t += dt;
  const t = r.t, k = Math.min(1, dt * 14), speed = s.speed || 0;
  const run = clamp((speed - 4) / 4.6, 0, 1), walk = clamp(speed / 2.2, 0, 1);
  if (s.ground) r.phase += dt * (speed > .2 ? 2.4 + speed * 1.15 : 0);
  const ph = r.phase, sw = Math.sin(ph);

  // ---- face: blinking and expressions ----
  r.blink -= dt;
  let mode = s.down ? 'down' : s.tired ? 'tired' : (s.wave > 0 || s.joy) ? 'joy' : 'open';
  if (mode === 'open' && r.blink < .12) mode = 'blink';
  if (r.blink <= 0) r.blink = 2 + Math.random() * 3.5;
  if (mode !== r.mode) { r.mode = mode; r.face.map = faceTex(r.look, mode); }

  // ---- target pose ----
  const P = { lt: 0, lk: 0, rt: 0, rk: 0, las: 0, laz: -.18, lae: .15, ras: 0, raz: .18, rae: .15, tx: 0, ty: 0, tz: 0, hx: 0, hy: 0, hipY: .8, br: 1 };
  const legAmp = (.45 + .5 * run) * walk, armAmp = (.45 + .85 * run) * walk;
  P.lt = sw * legAmp; P.rt = -sw * legAmp;
  P.lk = -Math.max(0, Math.sin(ph + 1.3)) * (.55 + .8 * run) * walk - .04;
  P.rk = -Math.max(0, Math.sin(ph + 1.3 + Math.PI)) * (.55 + .8 * run) * walk - .04;
  P.las = -sw * armAmp; P.ras = sw * armAmp;
  P.lae = P.rae = .2 + 1.1 * run;
  P.tx = -(.05 * walk + .2 * run); P.ty = sw * .12 * walk; P.tz = Math.cos(ph) * .05 * walk; // a little waddle
  P.hy = -P.ty * .7;
  P.hipY = .8 + Math.abs(Math.cos(ph)) * .06 * walk - .05 * run;
  const idle = 1 - walk;
  P.br = 1 + Math.sin(t * 2.1) * .022 * idle;
  P.hy += Math.sin(t * .45) * .35 * idle; P.hx = Math.sin(t * .7) * .06 * idle;
  P.laz -= Math.sin(t * 2.1) * .04 * idle; P.raz += Math.sin(t * 2.1) * .04 * idle;
  if (s.tired) {
    P.tx -= .3 + Math.sin(t * 5) * .04; P.hx += .25; P.br = 1 + Math.sin(t * 5) * .04;
    if (walk < .3) { P.las = P.ras = .55; P.lae = P.rae = .3; P.lk = P.rk = -.35; P.lt = P.rt = .25; P.hipY = .74; }
  }
  if (!s.ground) {
    if ((s.vy || 0) > 0) { P.lt = .7; P.rt = -.15; P.lk = -1.1; P.rk = -.5; P.las = -.4; P.ras = -.4; P.laz = -1.1; P.raz = 1.1; P.lae = P.rae = .6; P.tx = -.12; }
    else { const f = Math.sin(t * 16) * .35; P.lt = .3 + f * .3; P.rt = -.1 - f * .3; P.lk = -.5; P.rk = -.7; P.laz = -1.7 - f; P.raz = 1.7 - f; P.las = P.ras = .2; P.lae = P.rae = .3; P.tx = .05; }
  }
  if (s.crank) {
    const c = t * 7;
    P.las = 1.25 + Math.sin(c) * .35; P.ras = 1.25 + Math.sin(c) * .35; P.lae = P.rae = .5 + Math.cos(c) * .35;
    P.laz = -.05; P.raz = .05; P.tx = -.28 + Math.sin(c) * .05; P.ty = Math.cos(c) * .08;
    P.lt = .4; P.rt = -.35; P.lk = -.45; P.rk = -.2; P.hipY = .74;
  }
  if (s.push > 0) { const e = clamp(s.push / .5, 0, 1); P.las = P.ras = 1.5 * e + P.las * (1 - e); P.lae = P.rae = .05; P.tx = -.25 * e; }
  if (s.wave > 0) { P.raz = 2.6; P.ras = .2; P.rae = .5 + Math.sin(t * 16) * .5; P.hy = -.2; P.tz = Math.sin(t * 8) * .06; }
  if (s.stumble > 0) { const a = Math.sin(t * 20); P.laz = -1.4 - a * .8; P.raz = 1.4 - a * .8; P.las = a * .8; P.ras = -a * .8; P.tz = Math.sin(t * 11) * .35 * Math.min(1, s.stumble); }
  if (s.down) { P.laz = -1.3; P.raz = 1.4; P.las = .3; P.ras = -.2; P.lt = .4; P.rt = -.2; P.lk = -.6; P.rk = -.2; P.hx = .4; P.hy = .5; P.br = 1; }
  if (s.sit) { P.hipY = .5; P.lt = P.rt = 1.5; P.lk = P.rk = -1.5; P.tx = -.1; P.las = P.ras = 1.1 + Math.sin(t * 1.5) * .05; P.lae = P.rae = .7; P.laz = -.25; P.raz = .25; P.hx = .1; }
  // climbing a rock face: arms reach overhead hand over hand, knees come up to find footholds
  if (s.climb != null) {
    const c = s.climb, a = Math.sin(c), up = Math.max(0, a), dn = Math.max(0, -a);
    P.las = 2.65 + a * .4; P.ras = 2.65 - a * .4; P.laz = -.3; P.raz = .3; P.lae = .35 + dn * .8; P.rae = .35 + up * .8;
    P.lt = .85 + a * .55; P.rt = .85 - a * .55; P.lk = -1.25 - up * .4; P.rk = -1.25 - dn * .4;
    P.tx = .12; P.ty = a * .08; P.tz = 0; P.hx = -.35; P.hy = 0; P.hipY = .8; P.br = 1;
  }
  if (s.joy && !s.wave) { const b = Math.abs(Math.sin(t * 7)); P.hipY = .8 + b * .12; P.laz = -2.4; P.raz = 2.4; P.lae = P.rae = .3 + b * .3; P.lk = P.rk = -.3 * b; }

  // ---- floppy limbs: arms and legs follow their pose on springs, so they overshoot and wobble ----
  // turning flings the arms out; landing makes them flop up and bounce back
  const yawNow = root.rotation.y;
  if (r.lastYaw === null) r.lastYaw = yawNow;
  const turn = clamp(Math.atan2(Math.sin(yawNow - r.lastYaw), Math.cos(yawNow - r.lastYaw)) / Math.max(dt, 1e-3), -8, 8); r.lastYaw = yawNow;
  P.laz -= Math.abs(turn) * .045; P.raz += Math.abs(turn) * .045; P.las += turn * .02; P.ras -= turn * .02;
  if (s.ground && !r.wasGround) { const kick = clamp(-(r.lastVy || 0) * .7, 0, 9); r.v.laz = (r.v.laz || 0) - kick; r.v.raz = (r.v.raz || 0) + kick; r.v.lae = (r.v.lae || 0) + kick * .6; r.v.rae = (r.v.rae || 0) + kick * .6; r.v.lk = (r.v.lk || 0) - kick * .5; r.v.rk = (r.v.rk || 0) - kick * .5; }
  r.wasGround = !!s.ground; r.lastVy = s.vy || 0;
  const S = (o, prop, v, key, stiff, damp) => { const vel = (r.v[key] || 0) + ((v - o[prop]) * stiff - (r.v[key] || 0) * damp) * dt; r.v[key] = vel; o[prop] += vel * dt; };
  const AK = 120, AD = 10, LK = 300, LD = 28; // arms loose and wobbly, legs firmer so feet still plant
  S(r.armL.sh.rotation, 'x', P.las, 'las', AK, AD); S(r.armL.sh.rotation, 'z', P.laz, 'laz', AK, AD); S(r.armL.el.rotation, 'x', P.lae, 'lae', AK * .8, AD * .8);
  S(r.armR.sh.rotation, 'x', P.ras, 'ras', AK, AD); S(r.armR.sh.rotation, 'z', P.raz, 'raz', AK, AD); S(r.armR.el.rotation, 'x', P.rae, 'rae', AK * .8, AD * .8);
  S(r.legL.hip.rotation, 'x', P.lt, 'lt', LK, LD); S(r.legR.hip.rotation, 'x', P.rt, 'rt', LK, LD);
  S(r.legL.knee.rotation, 'x', P.lk, 'lk', LK, LD); S(r.legR.knee.rotation, 'x', P.rk, 'rk', LK, LD);
  // mittens trail a little behind the forearm swing
  r.armL.hand.rotation.x = -(r.v.lae || 0) * .04; r.armR.hand.rotation.x = -(r.v.rae || 0) * .04;
  const B = (o, prop, v) => { o[prop] += (v - o[prop]) * k; };
  B(r.torso.rotation, 'x', P.tx); B(r.torso.rotation, 'y', P.ty); B(r.torso.rotation, 'z', P.tz);
  B(r.head.rotation, 'x', P.hx); B(r.head.rotation, 'y', P.hy);
  B(r.hips.position, 'y', P.hipY);
  // squash and stretch: breathing, plus a squish on landing-height changes
  r.torso.scale.y += (P.br - r.torso.scale.y) * k;
  r.torso.scale.x = r.torso.scale.z = 1 + (1 - r.torso.scale.y) * .6;
  // follow-through: backpack, pom-pom and propeller
  r.bag.rotation.x += ((-P.tx * .35 + Math.sin(ph * 2) * .06 * walk) - r.bag.rotation.x) * Math.min(1, dt * 8);
  r.pom.position.x = Math.sin(ph) * .03 * walk;
  if (r.prop) r.prop.rotation.y += dt * (3 + speed * 4 + (s.ground ? 0 : 14));
  // on the Summit wall: each arm reaches for the exact hold it grips (s.grip = [left hold, right hold], world positions)
  if (s.grip) { root.updateWorldMatrix(true, true); gripArm(r, r.armL, s.grip[0], 'la', dt); gripArm(r, r.armR, s.grip[1], 'ra', dt); }
}
// two-bone reach: point the upper arm past the hold and bend the elbow so the mitten lands on it
const UPPER = .36, LOWER = .44, _t = new THREE.Vector3();
function gripArm(r, arm, h, key, dt) {
  if (!h) return;
  _t.set(h.x, h.y, h.z); r.torso.worldToLocal(_t); _t.sub(arm.sh.position);
  const D = Math.min(UPPER + LOWER - .01, Math.max(.15, _t.length())); _t.normalize();
  const sx = Math.atan2(-_t.z, -_t.y), sz = Math.asin(clamp(_t.x, -1, 1));
  const a = Math.acos(clamp((UPPER * UPPER + D * D - LOWER * LOWER) / (2 * UPPER * D), -1, 1));
  const e = Math.PI - Math.acos(clamp((UPPER * UPPER + LOWER * LOWER - D * D) / (2 * UPPER * LOWER), -1, 1));
  const k = Math.min(1, dt * 16);
  arm.sh.rotation.x += (sx - a - arm.sh.rotation.x) * k; arm.sh.rotation.z += (sz - arm.sh.rotation.z) * k; arm.el.rotation.x += (e - arm.el.rotation.x) * k;
  r.v[key + 's'] = r.v[key + 'z'] = r.v[key + 'e'] = 0; // the springs pick up from here when the hand lets go
}
