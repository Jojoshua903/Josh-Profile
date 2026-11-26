// Ridgeline training trail: six hands-on stations around Base Camp that stamp a Climber's Passport.
// Each one practises something the maze will ask of you: sprinting, chalk, glowsticks, stone gates, the Shadow and climbing.
import { THREE, scene, flake, rayTargets } from './world.js';
import { fx } from './fx.js';

export const STATIONS = [
  { id: 'sprint', name: 'Sprint lane', hint: 'Sprint the painted lane by the railing, start to finish' },
  { id: 'chalk', name: 'Chalk slate', hint: 'Chalk a mark on the slate easel (slot 1)' },
  { id: 'glow', name: 'Light the shed', hint: 'Throw a glowstick into the dark shed (slot 2)' },
  { id: 'gate', name: 'Practice gate', hint: 'Open the stone gate: two plates, or hold the crank' },
  { id: 'shadow', name: 'Shadow puddle', hint: 'Stand in the purple puddle and feel it drain you' },
  { id: 'climb', name: 'Boulder summit', hint: 'Climb the practice boulder to the very top' },
];
let stamps = new Set();
try { stamps = new Set(JSON.parse(localStorage.getItem('ridgeline_passport') || '[]')); } catch {}
const save = () => { try { localStorage.setItem('ridgeline_passport', JSON.stringify([...stamps])); } catch {} };
export const hasStamp = (id) => stamps.has(id);
export const passportDone = () => STATIONS.every((s) => stamps.has(s.id));
export function resetPassport() { stamps.clear(); save(); }
/** Returns true the first time a station is stamped. */
export function stamp(id) { if (stamps.has(id)) return false; stamps.add(id); save(); lit[id]?.(); return true; }

/* ================= where things are (Base Camp uses 4 m tiles) ================= */
export const LANE = { x0: 50, x1: 66, z0: 60.6, z1: 63.6 };
export const PUDDLE = { x: 46, z: 41, r: 1.9 };
export const SLATE = { x: 44, y: 1.55, z: 58, w: 2.2, h: 1.3 };
export const SHED = { x0: 36.2, x1: 39.8, z0: 60.2, z1: 63.8, y1: 2.3 };
export const BOULDER_TOP = { i: 16, j: 10, y: 5 };

const group = new THREE.Group(); group.visible = false; scene.add(group);
const anim = { t: 0, swirl: [], lantern: null, lanternLight: null, flags: [] };
const lit = {};
let built = false, slateMesh = null;
const std = (c, r = .85, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, ...extra });
const add = (geo, mat, x, y, z, parent = group) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
function label(text, w, h, x, y, z, ry = 0, bg = '#fff6e5', fg = '#1b2738') {
  const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w); const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height); g.strokeStyle = fg; g.lineWidth = 10; g.strokeRect(5, 5, c.width - 10, c.height - 10);
  g.fillStyle = fg; g.font = `900 ${Math.round(c.height * .42)}px ui-rounded, "Arial Rounded MT Bold", system-ui`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, c.width / 2, c.height / 2 + 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide })); m.position.set(x, y, z); m.rotation.y = ry; group.add(m); return m;
}
function flag(x, z, color, text) {
  const pole = add(new THREE.CylinderGeometry(.04, .04, 2.2, 6), std(0x5b4630), x, 1.1, z);
  const f = add(new THREE.PlaneGeometry(.8, .5), new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide }), x + .4, 1.95, z); anim.flags.push(f);
  if (text) label(text, 1.5, .35, x, .45, z + .02, 0);
  return pole;
}

function build() {
  built = true;
  // 1. sprint lane: painted stripes with start and finish flags
  const paint = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .8 });
  for (const z of [LANE.z0, LANE.z1]) { const s = add(new THREE.PlaneGeometry(LANE.x1 - LANE.x0, .12), paint, (LANE.x0 + LANE.x1) / 2, .03, z); s.rotation.x = -Math.PI / 2; s.castShadow = false; }
  for (let x = LANE.x0 + 2; x < LANE.x1 - 1; x += 2) { const d = add(new THREE.PlaneGeometry(.7, .08), paint, x, .03, (LANE.z0 + LANE.z1) / 2); d.rotation.x = -Math.PI / 2; d.castShadow = false; }
  for (const [x, c] of [[LANE.x0, 0x8ee34d], [LANE.x1, 0xff6f59]]) { const l = add(new THREE.PlaneGeometry(.25, LANE.z1 - LANE.z0), new THREE.MeshBasicMaterial({ color: c }), x, .035, (LANE.z0 + LANE.z1) / 2); l.rotation.x = -Math.PI / 2; l.castShadow = false; }
  flag(LANE.x0, LANE.z0 - .4, 0x8ee34d, 'SPRINT'); flag(LANE.x1, LANE.z0 - .4, 0xff6f59, 'FINISH');

  // 2. chalk slate on an easel (facing south, towards the lane)
  const wood = std(0x8a5a33);
  for (const s of [-1, 1]) { const leg = add(new THREE.BoxGeometry(.08, 2.4, .08), wood, SLATE.x + s * 1.05, 1.15, SLATE.z - .25); leg.rotation.x = .12; }
  const back = add(new THREE.BoxGeometry(.08, 2.2, .08), wood, SLATE.x, 1.05, SLATE.z - .6); back.rotation.x = -.35;
  slateMesh = add(new THREE.BoxGeometry(SLATE.w, SLATE.h, .06), std(0x2b3a35, .95), SLATE.x, SLATE.y, SLATE.z);
  add(new THREE.BoxGeometry(SLATE.w + .14, .08, .14), wood, SLATE.x, SLATE.y - SLATE.h / 2 - .02, SLATE.z + .04);
  label('CHALK ME', 1.2, .3, SLATE.x, SLATE.y + SLATE.h / 2 + .22, SLATE.z + .04, 0, '#ffd23f');

  // 3. the dark shed: open front facing east, black inside, an unlit lantern hanging in the middle
  const plank = std(0x6b4a33), dark = new THREE.MeshBasicMaterial({ color: 0x07080c });
  const cx = (SHED.x0 + SHED.x1) / 2, cz = (SHED.z0 + SHED.z1) / 2;
  add(new THREE.BoxGeometry(.15, SHED.y1, SHED.z1 - SHED.z0), plank, SHED.x0, SHED.y1 / 2, cz);
  for (const z of [SHED.z0, SHED.z1]) add(new THREE.BoxGeometry(SHED.x1 - SHED.x0, SHED.y1, .15), plank, cx, SHED.y1 / 2, z);
  const roof = add(new THREE.BoxGeometry(SHED.x1 - SHED.x0 + .6, .16, SHED.z1 - SHED.z0 + .6), std(0xd94f3d), cx, SHED.y1 + .15, cz); roof.rotation.z = -.12;
  add(new THREE.BoxGeometry(SHED.x1 - SHED.x0 - .3, SHED.y1 - .2, SHED.z1 - SHED.z0 - .4), dark, cx - .1, SHED.y1 / 2, cz).castShadow = false;
  const lantern = add(new THREE.SphereGeometry(.22, 12, 10), new THREE.MeshBasicMaterial({ color: 0x3a3226, toneMapped: false }), cx + .4, 1.5, cz);
  anim.lantern = lantern;
  label('DARK SHED · THROW A GLOWSTICK IN', 3.4, .32, SHED.x1 + .05, SHED.y1 + .55, cz, Math.PI / 2, '#a37bff', '#ffffff');
  lit.glow = () => { lantern.material.color.set(0xffd27a); anim.lanternLit = true; };

  // 4. practice gate balcony: a small wooden platform past the gate with the passport stamp on a pedestal
  const deckMat = std(0xb07a43);
  add(new THREE.BoxGeometry(4.2, .3, 4), deckMat, 70, -.15, 54);
  for (const z of [52.1, 55.9]) add(new THREE.BoxGeometry(4, .08, .08), wood, 70, 1.05, z);
  add(new THREE.BoxGeometry(.08, .08, 3.8), wood, 72, 1.05, 54);
  for (const [x, z] of [[68.1, 52.1], [68.1, 55.9], [72, 52.1], [72, 55.9], [72, 54]]) add(new THREE.CylinderGeometry(.06, .06, 1.1, 6), wood, x, .55, z);
  add(new THREE.CylinderGeometry(.35, .45, 1, 10), std(0x8b8178), 70.6, .5, 54);
  const stampTop = add(new THREE.CylinderGeometry(.28, .28, .25, 16), std(0xe5383b), 70.6, 1.15, 54);
  add(new THREE.CylinderGeometry(.07, .07, .35, 8), wood, 70.6, 1.42, 54);
  add(new THREE.SphereGeometry(.12, 10, 8), wood, 70.6, 1.62, 54);
  label('PRACTICE GATE', 2.6, .4, 63.95, 3.75, 54, -Math.PI / 2, '#ff9f1c');
  lit.gate = () => { stampTop.material.color.set(0xffd23f); fx.confetti(70.6, 2, 54, 50); };

  // 5. shadow puddle: a dark violet disc with drifting wisps
  const disc = add(new THREE.CircleGeometry(PUDDLE.r, 40), new THREE.MeshBasicMaterial({ color: 0x2b1840, transparent: true, opacity: .85, depthWrite: false }), PUDDLE.x, .025, PUDDLE.z);
  disc.rotation.x = -Math.PI / 2; disc.castShadow = false;
  const ring = add(new THREE.RingGeometry(PUDDLE.r - .08, PUDDLE.r + .06, 48), new THREE.MeshBasicMaterial({ color: 0x9b5cff, toneMapped: false }), PUDDLE.x, .03, PUDDLE.z);
  ring.rotation.x = -Math.PI / 2; ring.castShadow = false;
  for (let k = 0; k < 14; k++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: flake, color: 0x9b5cff, transparent: true, opacity: .5, depthWrite: false })); s.scale.setScalar(.9); group.add(s);
    anim.swirl.push({ s, a: k / 14 * Math.PI * 2, r: .3 + Math.random() * (PUDDLE.r - .4), h: Math.random() * 1.6, sp: .4 + Math.random() * .6 });
  }
  label('SHADOW PUDDLE · STEP IN', 2.6, .34, PUDDLE.x, .35, PUDDLE.z - PUDDLE.r - .35, 0, '#2b1840', '#e6d4ff');

}

export function showTraining(v) {
  if (v && !built) build();
  group.visible = v;
  if (slateMesh) { const k = rayTargets.indexOf(slateMesh); if (v && k < 0) rayTargets.push(slateMesh); }
  if (v) { if (hasStamp('glow')) lit.glow?.(); }
}
/** Is a chalk mark on the slate? */
export const onSlate = (d) => Math.abs(d.x - SLATE.x) < SLATE.w / 2 + .1 && Math.abs(d.y - SLATE.y) < SLATE.h / 2 + .1 && Math.abs(d.z - SLATE.z) < .4;
/** Did a thrown glowstick fly into the shed? */
export const inShed = (p) => p.x > SHED.x0 + .2 && p.x < SHED.x1 + .1 && p.z > SHED.z0 + .2 && p.z < SHED.z1 - .2 && p.y < SHED.y1 - .1;
export const inPuddle = (x, z) => Math.hypot(x - PUDDLE.x, z - PUDDLE.z) < PUDDLE.r;

/**
 * Per local climber, every frame at Base Camp. Returns the id of a station they just completed, or null.
 * p needs x, z, y, sprinting; time is the game clock.
 */
export function checkStations(p, dt, time) {
  // sprint lane: cross the start line, then the finish line within 5 s while sprinting
  const inLane = p.z > LANE.z0 && p.z < LANE.z1;
  if (inLane && p.x < LANE.x0 + .6 && p.x > LANE.x0 - 1.5) p.laneStart = time;
  if (inLane && p.x > LANE.x1 && p.sprinting && p.laneStart && time - p.laneStart < 5) { p.laneStart = 0; if (stamp('sprint')) return 'sprint'; }
  // shadow puddle: two seconds inside
  if (inPuddle(p.x, p.z) && p.y < .5) { p.puddleT = (p.puddleT || 0) + dt; if (p.puddleT > 2 && stamp('shadow')) return 'shadow'; } else p.puddleT = 0;
  // boulder summit
  if (Math.floor(p.x / 4) === BOULDER_TOP.i && Math.floor(p.z / 4) === BOULDER_TOP.j && p.y > BOULDER_TOP.y && stamp('climb')) return 'climb';
  return null;
}

export function updateTraining(dt) {
  if (!group.visible) return;
  anim.t += dt;
  for (const w of anim.swirl) { w.a += dt * w.sp; w.h = (w.h + dt * .35) % 1.8; w.s.position.set(PUDDLE.x + Math.cos(w.a) * w.r, .1 + w.h, PUDDLE.z + Math.sin(w.a) * w.r); w.s.material.opacity = .55 * (1 - w.h / 1.8); }
  anim.flags.forEach((f, k) => { f.rotation.y = Math.sin(anim.t * 3 + k) * .25; });
  if (anim.lanternLit && anim.lantern) anim.lantern.scale.setScalar(1 + Math.sin(anim.t * 6) * .06);
}
