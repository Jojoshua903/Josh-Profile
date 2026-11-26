// Ridgeline Summit: climbing a cliff face with two hands.
// Look at a hold and hold LEFT click (left hand) or RIGHT click (right hand) to grab it. Your body hangs under your hands,
// so grabbing a higher hold pulls you up. Let go of a button and that hand lets go. No hands and nothing under your
// feet and you fall. Stamina: two hands drain slowly, one hand fast, pulling up costs a little, rest ledges refill.
import { THREE, scene, sfx } from './world.js';
import { fx } from './fx.js';
import { SUMMIT, breakHold, chalkHold } from './summit_world.js';

export const REACH = 1.95;          // metres from the chest a hand can reach
const BODY_OFF = .45;               // body distance from the face while on it
const PULL_V = 2.1;                 // m/s the body moves towards where the hands put it
const DRAIN2 = .035, DRAIN1 = .16, PULL_COST = .045, LEDGE_REGEN = .22;
const ICE_HOLD = 2.4, CRUMBLE_HOLD = 2;

const chest = (p) => ({ x: p.x, y: p.y + 1.3, z: p.z });
const dist3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const faceOf = (h) => SUMMIT.faces[h.face];

/** Holds within reach of this climber (used for the highlight). */
export function reachable(p) {
  const c = chest(p), out = [];
  for (const h of SUMMIT.holds) if (!h.broken && !h.sealed && !(h.dark && !h.lit) && Math.abs(h.z - p.z) < 2.6 && dist3(c, h) < REACH) out.push(h); // dark chimney holds only once lit
  return out;
}
const _o = new THREE.Vector3(), _d = new THREE.Vector3();
/** The reachable hold closest to where the climber is looking, or null. */
export function aimedHold(p) {
  p.cam.getWorldPosition(_o); p.cam.getWorldDirection(_d);
  let best = null, ba = .16;
  for (const h of reachable(p)) {
    const vx = h.x - _o.x, vy = h.y - _o.y, vz = h.z - _o.z, t = vx * _d.x + vy * _d.y + vz * _d.z;
    if (t <= .1) continue;
    const px = vx - _d.x * t, py = vy - _d.y * t, pz = vz - _d.z * t, a = Math.hypot(px, py, pz) / t;
    if (a < ba) { ba = a; best = h; }
  }
  return best;
}
export function onLedge(p) {
  if (!p.wall) return null;
  for (const l of SUMMIT.ledges) if (l.face === p.wall.face && p.x > l.x0 - .1 && p.x < l.x1 + .1 && Math.abs(p.y - l.y) < .22) return l;
  return null;
}
function grab(p, k, h, toast) {
  if (h.type === 'chalk' && !h.chalked) { toast(p, 'Too slick · chalk it first (slot 1, then click it)'); sfx.oof?.(); return false; }
  if (!p.wall) { p.wall = { face: h.face, hands: [null, null], grip: [0, 0] }; p.vy = 0; p.ex = p.ez = 0; p.airTop = p.y; }
  if (p.wall.face !== h.face) return false;
  if (p.wall.hands[1 - k] === h) return false; // the other hand already has it
  p.wall.hands[k] = h; p.wall.grip[k] = 0;
  sfx.grab?.(); fx.chalk(h.x, h.y, h.z - .1, 0, 0, -1, '#ffffff');
  return true;
}
function letGo(p, why, toast) {
  if (!p.wall) return;
  const f = SUMMIT.faces[p.wall.face];
  p.wall = null; p.climbing = false; p.handVM = null;
  p.z = Math.min(p.z, f.z - BODY_OFF - .05); p.ground = false; p.vy = Math.min(p.vy, 0); p.airTop = p.y;
  if (why) toast(p, why);
}

/**
 * One step for a climber in Summit. Returns true when this module moved the climber (on the wall),
 * false to let the normal walking code run. input: { live, tapL, tapR, holdL, holdR, fwd, jump }.
 * consume(code) removes a mouse tap so the tool code doesn't also fire.
 */
export function climbStep(p, dt, input, { toast, consume, onBreak }) {
  if (!SUMMIT.built) return false;
  const kb = !p.mouse;
  // grabbing (also from the ground or mid-air)
  if (input.live && p.mouse) for (const [k, tap, code] of [[0, input.tapL, 'Mouse0'], [1, input.tapR, 'Mouse2']]) {
    if (!tap) continue;
    const h = aimedHold(p); if (!h) continue;
    consume(code);
    if (p.stamina <= .02) { toast(p, 'Too tired to grip'); continue; }
    grab(p, k, h, toast);
  }
  // keyboard climbers (local co-op): jump at the wall grabs the two holds nearest your shoulders
  if (kb && input.live && !p.wall && input.jump && p.stamina > .02) {
    const L = kbPick(p, null, { x: p.x + .4, y: p.y + 1.85 }), Rh = kbPick(p, L, { x: p.x - .4, y: p.y + 1.85 });
    if (L && Rh && L.face === Rh.face) { (input.jumpKeys || []).forEach(consume); input.jump = false; grab(p, 0, L, toast); grab(p, 1, Rh, toast); }
  }
  if (!p.wall) return false;
  const W = p.wall, f = SUMMIT.faces[W.face];
  // releasing a button releases that hand (keyboard climbers keep holding until they move a hand)
  if (!kb && !input.holdL && W.hands[0]) W.hands[0] = null;
  if (!kb && !input.holdR && W.hands[1]) W.hands[1] = null;
  if (kb && input.live) { kbReach(p, dt, input, toast); let dy = Math.PI - p.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); p.yaw += dy * Math.min(1, dt * 8); p.pitch += (.3 - p.pitch) * Math.min(1, dt * 4); }
  // hold behaviour: ice slips after a while, crumbling holds break
  for (let k = 0; k < 2; k++) {
    const h = W.hands[k]; if (!h) continue;
    if (h.broken) { W.hands[k] = null; toast(p, "The hold broke away!"); continue; } // someone else crumbled it
    W.grip[k] += dt;
    if (h.type === 'ice' && W.grip[k] > ICE_HOLD) { W.hands[k] = null; toast(p, 'Your hand slid off the ice!'); sfx.oof?.(); }
    else if (h.type === 'crumble' && W.grip[k] > CRUMBLE_HOLD) { W.hands[k] = null; breakHold(h); onBreak?.(h); fx.dust(h.x, h.y, h.z - .2, 14, .7, 0x8a6a4a); sfx.crack?.(); toast(p, 'The hold crumbled!'); p.shake = Math.max(p.shake || 0, .3); }
  }
  const held = W.hands.filter(Boolean), ledge = onLedge(p);
  if (ledge && !W.wasLedge) p.rests = (p.rests || 0) + 1; W.wasLedge = !!ledge; // counted for the summit summary
  if (!held.length && !ledge) { letGo(p, null, toast); return false; }
  // where the hands put the body: hanging under them (lower on one hand)
  let tx = p.x, ty = p.y;
  if (held.length) {
    const ax = held.reduce((s, h) => s + h.x, 0) / held.length, ay = held.reduce((s, h) => s + h.y, 0) / held.length;
    tx = ax; ty = ay - (held.length === 2 ? 1.75 : 1.95);
    if (ledge) ty = Math.max(ty, ledge.y);
    if (held.some((h) => h.type === 'ice')) ty -= Math.min(.4, held.filter((h) => h.type === 'ice').length * W.grip.reduce((a, b) => Math.max(a, b), 0) * .08); // icy holds sag
  } else ty = ledge.y;
  ty = Math.max(ty, f.y0); // never pulled below the foot of the face
  const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy), step = Math.min(d, PULL_V * dt);
  if (d > 1e-4) { p.x += dx / d * step; const up = dy / d * step; p.y += up; if (up > 0) p.stamina -= up * PULL_COST; }
  p.z = f.z - BODY_OFF; p.vy = 0; p.ground = false; p.climbing = true; p.climbPh = (p.climbPh || 0) + step * 3.2;
  // stamina: a rest ledge under your feet refills, otherwise grip drains it
  if (ledge && held.length < 2) p.stamina = Math.min(1, p.stamina + LEDGE_REGEN * dt);
  else if (ledge) p.stamina = Math.min(1, p.stamina + LEDGE_REGEN * .6 * dt);
  else p.stamina -= (held.length === 2 ? DRAIN2 : DRAIN1) * dt;
  if (p.stamina <= 0) { p.stamina = 0; p.exhausted = true; letGo(p, 'Lost your grip!', toast); sfx.oof?.(); p.stumble = .6; return false; }
  // at the lip: push forward (W) to haul yourself over the top
  if (input.fwd && p.y > f.y1 - 1.9 && held.some((h) => h.lip || h.y > f.y1 - .5)) {
    p.wall = null; p.climbing = false; p.handVM = null; p.y = f.y1; p.z = f.z + .8; p.ground = true; p.vy = 0; p.land = .35; p.airTop = p.y;
    sfx.land(); fx.dust(p.x, p.y, p.z, 8, .6); return true;
  }
  // jump pushes you off the wall
  if (input.jump) { letGo(p, null, toast); p.ez = -2.5; p.vy = 2.5; return false; }
  // hand targets for the first-person hands (camera space, roughly)
  p.handVM = W.hands.map((h) => h ? handTarget(p, h) : null);
  return true;
}
/** Let go of the wall (a rope yank, for example). */
export function releaseWall(p, why, toast) { letGo(p, why, toast); }

/* ---- keyboard climbing: holds are picked for you, W/S/A/D say which way the next hand goes ---- */
// facing the cliff means facing +z, so screen-right is -x
let chalkHook = null;
export const onKbChalk = (fn) => { chalkHook = fn; };
function kbOk(p, h) {
  if (h.type !== 'chalk' || h.chalked) return true;
  if (p.slot === 0) { chalkHold(h); chalkHook?.(h); fx.chalk(h.x, h.y, h.z - .1, 0, 0, -1, '#ffffff'); return true; } // chalk in hand: chalk it as you grab
  return false;
}
function kbPick(p, not, want, ok = () => true) {
  let best = null, bd = 1e9;
  for (const h of reachable(p)) {
    if (h === not || (p.wall && h.face !== p.wall.face) || (h.type === 'chalk' && !h.chalked && p.slot !== 0) || !ok(h)) continue;
    const d = Math.hypot(h.x - want.x, (h.y - want.y) * .8);
    if (d < bd) { bd = d; best = h; }
  }
  if (best && !kbOk(p, best)) return null;
  return best;
}
function kbReach(p, dt, input, toast) {
  const W = p.wall; W.kbT = (W.kbT || 0) - dt; if (W.kbT > 0) return;
  const up = input.fwd ? 1 : input.back ? -1 : 0, sd = input.side || 0; if (!up && !sd) return;
  const [L, Rh] = W.hands;
  // which hand moves: the lower one going up, the higher one going down, the one on that side going sideways
  const k = !L ? 0 : !Rh ? 1 : up > 0 ? (L.y <= Rh.y ? 0 : 1) : up < 0 ? (L.y >= Rh.y ? 0 : 1) : sd > 0 ? 1 : 0;
  const cur = W.hands[k], other = W.hands[1 - k], ref = other || cur || { x: p.x, y: p.y + 1.8 };
  const want = { x: ref.x + (k === 0 ? .45 : -.45) - sd * .8, y: ref.y + up * .85 };
  const h = kbPick(p, other, want, (h) => h !== cur && (up > 0 ? h.y > (cur ? cur.y : p.y + 1) + .2 : up < 0 ? h.y < (cur ? cur.y : p.y + 2) - .2 : (h.x - (cur ? cur.x : p.x)) * -sd > .25));
  W.kbT = .3;
  if (!h) { if (up > 0 && !(W.hands.some((q) => q && q.lip))) toast(p, 'No hold in reach that way · try A / D'); return; }
  W.hands[k] = h; W.grip[k] = 0; sfx.grab?.(); fx.chalk(h.x, h.y, h.z - .1, 0, 0, -1, '#ffffff');
}

const _v = new THREE.Vector3();
function handTarget(p, h) {
  _v.set(h.x, h.y, h.z); p.cam.worldToLocal(_v);
  const k = Math.min(1, .55 / Math.max(.3, -_v.z));
  return [Math.max(-.42, Math.min(.42, _v.x * k)), Math.max(-.42, Math.min(.3, _v.y * k)), -.45];
}
/** HUD line for Summit. */
export function climbPrompt(p) {
  if (!SUMMIT.built) return '';
  if (!p.mouse) { // keyboard climbers
    const two = p.ctrl.id === 'p2', mv = two ? 'Arrows' : 'W A S D', jk = two ? 'Enter' : 'Space';
    if (p.wall) { const f = SUMMIT.faces[p.wall.face]; if (p.y > f.y1 - 1.9 && p.wall.hands.some((h) => h && (h.lip || h.y > f.y1 - .5))) return `${two ? 'Up' : 'W'} · haul yourself over the top`; return onLedge(p) ? 'Resting on a ledge · catch your breath' : `${mv} · move a hand · ${jk} push off`; }
    return reachable(p).length ? `${jk} · grab the wall` : '';
  }
  const W = p.wall, aim = aimedHold(p);
  const kind = (h) => h.type === 'ice' ? ' (ice · slips)' : h.type === 'crumble' ? ' (crumbling)' : h.type === 'chalk' ? (h.chalked ? ' (chalked)' : ' (needs chalk)') : '';
  if (W) {
    const f = SUMMIT.faces[W.face];
    if (p.y > f.y1 - 1.9 && W.hands.some((h) => h && (h.lip || h.y > f.y1 - .5))) return 'W · haul yourself over the top';
    if (onLedge(p)) return 'Resting on a ledge · catch your breath';
    if (aim && !W.hands.includes(aim)) return `${!W.hands[0] ? 'Left' : !W.hands[1] ? 'Right' : 'Swap'} click · grab${kind(aim)}`;
    const n = W.hands.filter(Boolean).length;
    return n === 1 ? 'One hand · tiring fast · grab with the other' : 'Climbing · look up and grab the next hold';
  }
  if (aim) return `Left / right click · grab${kind(aim)}`;
  return '';
}

/* ---- highlights: reachable holds get a soft ring, the aimed one a bright one ---- */
const ringGeo = new THREE.TorusGeometry(.26, .03, 6, 20);
const ringMat = new THREE.MeshBasicMaterial({ color: 0xfff6e5, transparent: true, opacity: .35, depthWrite: false, toneMapped: false });
const rings = new THREE.InstancedMesh(ringGeo, ringMat, 40); rings.count = 0; rings.frustumCulled = false; scene.add(rings);
const aimRing = new THREE.Mesh(new THREE.TorusGeometry(.32, .045, 6, 24), new THREE.MeshBasicMaterial({ color: 0xffd23f, toneMapped: false, depthWrite: false, transparent: true })); aimRing.visible = false; scene.add(aimRing);
const _m = new THREE.Matrix4();
export function updateClimbFx(p, on, t) {
  if (!on || !p || !SUMMIT.built) { rings.count = 0; aimRing.visible = false; return; }
  const list = reachable(p).slice(0, 40), aim = aimedHold(p);
  list.forEach((h, i) => { _m.makeTranslation(h.x, h.y, h.z - .06); rings.setMatrixAt(i, _m); });
  rings.count = list.length; rings.instanceMatrix.needsUpdate = true;
  aimRing.visible = !!aim; if (aim) { aimRing.position.set(aim.x, aim.y, aim.z - .08); aimRing.scale.setScalar(1 + Math.sin(t * 8) * .08); aimRing.material.color.set(aim.type === 'chalk' && !aim.chalked ? 0xff6f59 : 0xffd23f); }
}
export function resetClimber(p) { p.wall = null; p.handVM = null; p.climbing = false; p.airTop = p.y; }

/* ---- first Summit run: a big pulsing beacon on the hold to try next (after a few seconds of being stuck) ---- */
const hintRing = new THREE.Mesh(new THREE.TorusGeometry(.42, .06, 8, 28), new THREE.MeshBasicMaterial({ color: 0x8ee34d, toneMapped: false, depthWrite: false, depthTest: false, transparent: true }));
hintRing.visible = false; hintRing.renderOrder = 5; scene.add(hintRing);
/** Show the beacon on a hold (null hides it). */
export function setHintHold(h, t = 0) {
  hintRing.visible = !!h && !h.broken; if (!hintRing.visible) return;
  hintRing.position.set(h.x, h.y, h.z - .1); hintRing.scale.setScalar(1 + Math.sin(t * 6) * .18); hintRing.material.opacity = .65 + Math.sin(t * 6) * .3;
}
/** The best hold to try next: the lowest route hold a little above your reach, on the face in front of you. */
export function nextRouteHold(p) {
  const c = chest(p); let best = null, bd = 1e9;
  for (const h of SUMMIT.holds) {
    if (h.broken || h.sealed || h.route === undefined || (h.dark && !h.lit) || Math.abs(h.z - p.z) > 3) continue;
    const up = h.y - c.y; if (up < -.3 || up > 3) continue;
    const d = Math.hypot(h.x - c.x, (up - 1) * 1.5); if (d < bd) { bd = d; best = h; }
  }
  return best;
}
