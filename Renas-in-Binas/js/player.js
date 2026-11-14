import { THREE, G, scene, camera, canvas, V3, clamp, damp, puff, anyPerp, orientOn, altOf, dirOf, surf, rOf, tangentTo, $ } from './core.js?v=20261114j';
import { sfx } from './audio.js?v=20261114j';
import { buildRenas } from './models.js?v=20261114j';
import { makeShadow } from './fx.js?v=20261114j';
import { cutSpeaker, cutTyping } from './cutscene.js?v=20261114j';

// Movement feel copied from Otis in Orbit (ui.js FEEL_DEF + main.js), on round planets instead of flat ground.
export const S = { speed: 7, jump: 12, gravity: 30, air: 0.45 };
const PR = 0.3, PH = 1.3;

// ---------- input ----------
export const keys = new Set(), pressed = new Set();
const BLOCK = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'];
addEventListener('keydown', (e) => {
  if (BLOCK.includes(e.code) && !/^(TEXTAREA|INPUT)$/.test(e.target.tagName)) e.preventDefault();   // typing a save code still works
  if (!e.repeat) pressed.add(e.code);
  keys.add(e.code);
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => keys.clear());
export const mouse = { dx: 0, dy: 0, dragging: false, lx: 0, ly: 0 };
export const locked = () => document.pointerLockElement === canvas;
canvas.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  pressed.add('Mouse0');
  if (!locked()) { mouse.dragging = true; mouse.lx = e.clientX; mouse.ly = e.clientY; }
});
addEventListener('mousemove', (e) => {
  if (locked()) { mouse.dx += e.movementX; mouse.dy += e.movementY; }
  else if (mouse.dragging) { mouse.dx += e.clientX - mouse.lx; mouse.dy += e.clientY - mouse.ly; mouse.lx = e.clientX; mouse.ly = e.clientY; }
});
addEventListener('mouseup', () => (mouse.dragging = false));
export function requestLock() {
  try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* the browser said no: dragging still works */ }
}
export function consumePressed() { pressed.clear(); }
export const anyPressed = (...codes) => codes.some((c) => pressed.has(c));

// ---------- the player ----------
export const P = {
  planet: null, pos: V3(), up: V3(0, 1, 0), vt: V3(), vr: 0, fwd: V3(0, 0, 1),
  grounded: false, ground: null, coyote: 0, buffer: 0, chain: 0, chainT: 0, jumping: false, cut: false,
  airJump: false, long: false, pound: 0, poundT: 0, crouch: false, crouchBuf: 0, airT: 0, flip: 0,
  hidden: false, spinT: 0, spinCd: 0, spinLift: false, hp: 3, maxHp: 3, inv: 0, alt: 0, prevAlt: 0, thrustT: 0, dead: false, wallT: 0,
  dashT: 0, dashCd: 0, dashAir: false, dashEnd: 0, dashDir: V3(0, 0, 1),
};
G.P = P;
const R = buildRenas();
// the colour of the jetpack puffs and flame. A trail from Knabbels Werkplaats (G.trail) changes it
const TRAILS = { blauw: [0x5ef2e0, 0x9fe8ff], vuur: [0xff7a2a, 0xffd23a], hartjes: [0xff5a8a, 0xffa8c8], goud: [0xffd23a, 0xfff2a0] };
const _tc = new THREE.Color();
function tcol(i) { if (G.trail === 'regenboog') return _tc.setHSL(((G.t || 0) * 0.9 + i * 0.18 + Math.random() * 0.1) % 1, 0.95, 0.6).getHex(); return (TRAILS[G.trail] || TRAILS.blauw)[i]; }
export const model = { root: new THREE.Group(), pivot: new THREE.Group(), R };
model.root.add(model.pivot); model.pivot.position.y = 0.6;
model.pivot.add(R.g); R.g.position.y = -0.6;
scene.add(model.root);
const shadow = makeShadow(scene);
const sq = { s: 0, v: 0 };
export function squash(v) { sq.v += v * 18; }

function reproject(v, up, keepLen) {
  const L = v.length();
  v.addScaledVector(up, -v.dot(up));
  // `!(x >= …)` is also true for NaN: a broken vector gets replaced instead of staying broken forever
  if (keepLen) { if (!Number.isFinite(L) || !(v.lengthSq() >= 0)) v.set(0, 0, 0); else if (v.lengthSq() > 1e-10) v.setLength(L); }
  else if (!(v.lengthSq() >= 1e-10)) v.copy(anyPerp(up)); else v.normalize();
}
// every joint of Rênas: if one ever gets a NaN rotation it would stay NaN (they're smoothed toward a target),
// and three.js then simply doesn't draw that limb. This puts any broken joint back to 0
function healJoints() {
  const R = model.R;
  let broke = false;
  for (const o of [...R.legs, ...R.knees, ...R.arms, ...R.elbows, R.head, model.pivot, model.root]) {
    const r = o.rotation;
    if (!Number.isFinite(r.x + r.y + r.z)) { r.set(0, 0, 0); broke = true; }
    if (!Number.isFinite(o.position.x + o.position.y + o.position.z)) { o.position.set(0, o === model.pivot ? 0.6 : 0, 0); broke = true; }
    if (!Number.isFinite(o.scale.x + o.scale.y + o.scale.z)) { o.scale.set(1, 1, 1); broke = true; }
  }
  if (!Number.isFinite(A.phase)) { A.phase = 0; broke = true; }
  if (broke && !healJoints.warned) { healJoints.warned = true; console.warn('Rênas: broken (NaN) joint repaired'); }
}
const signedAngle = (a, b, n) => Math.atan2(new THREE.Vector3().crossVectors(a, b).dot(n), a.dot(b));

export function spawnPlayer(planet, dir, fwdHint) {
  P.planet = planet;
  P.up.copy(dir).normalize();
  P.pos.copy(planet.c).addScaledVector(P.up, rOf(planet, P.up) + 0.02);
  P.vt.set(0, 0, 0); P.vr = 0;
  P.fwd.copy(fwdHint || anyPerp(P.up)); reproject(P.fwd, P.up, false);
  Object.assign(P, { grounded: false, ground: null, coyote: 0, buffer: 0, chain: 0, chainT: 0, jumping: false, cut: false, airJump: false, long: false, pound: 0, poundT: 0, flip: 0, spinT: 0, spinLift: false, alt: 0.02, prevAlt: 0.02, thrustT: 0, dead: false, hidden: false, inv: 0, dashT: 0, dashCd: 0, dashAir: false, dashEnd: 0 });
  model.pivot.rotation.set(0, 0, 0);
  placeModel();
  resetCam();
}
export function setHp(n) { P.hp = n; drawHearts(); }
export function drawHearts() {
  const el = $('hp');
  el.innerHTML = '';
  for (let i = 0; i < P.maxHp; i++) { const h = document.createElement('i'); if (i >= P.hp) h.className = 'off'; el.appendChild(h); }
}

// platform test: is the player (up, alt) inside this platform's footprint? Returns the way out.
export function pfTest(pf, up, alt, Rr, margin = PR) {
  const cosA = up.dot(pf.n);
  if (cosA < 0.5) return null;
  const rad = Rr + alt;
  if (pf.shape === 'box') {
    const lx = Math.atan2(up.dot(pf.e1), cosA) * rad, lz = Math.atan2(up.dot(pf.e2), cosA) * rad;
    const ox = pf.hx + margin - Math.abs(lx), oz = pf.hz + margin - Math.abs(lz);
    if (ox <= 0 || oz <= 0) return null;
    const dir = (ox < oz ? pf.e1.clone().multiplyScalar(Math.sign(lx) || 1) : pf.e2.clone().multiplyScalar(Math.sign(lz) || 1));
    dir.addScaledVector(up, -dir.dot(up));
    if (dir.lengthSq() < 1e-8) dir.copy(anyPerp(up)); else dir.normalize();
    return { dir, amt: Math.min(ox, oz) };
  }
  const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  const d = Math.atan2(sinA, cosA) * rad;
  const over = pf.r + margin - d;
  if (over <= 0) return null;
  const dir = up.clone().multiplyScalar(cosA).sub(pf.n);
  if (dir.lengthSq() < 1e-10) dir.copy(anyPerp(up)); else dir.normalize();
  return { dir, amt: over };
}

export function updatePlayer(dt, t, ctrl = true) {
  const pl = P.planet; if (!pl) return 0;
  const c = pl.c;
  let Rr = rOf(pl, P.pos.clone().sub(c).normalize());   // the ground radius under Rênas (changes on shaped planets)
  P.up.copy(P.pos).sub(c).normalize();
  reproject(P.vt, P.up, true); reproject(P.fwd, P.up, false);

  // ---------- input ----------
  let ix = 0, iy = 0;
  if (ctrl) {
    if (keys.has('KeyW')) iy += 1;
    if (keys.has('KeyS')) iy -= 1;
    if (keys.has('KeyD')) ix += 1;
    if (keys.has('KeyA')) ix -= 1;
  }
  const jumpP = ctrl && pressed.has('Space'), jumpH = ctrl && keys.has('Space');
  // Shift = sprint. C = crouch: C + Space while running is the long jump. In the air, Shift or C = ground pound.
  const sprintH = ctrl && (keys.has('ShiftLeft') || keys.has('ShiftRight'));
  const crouchH = ctrl && (keys.has('KeyC'));
  const crouchP = ctrl && (pressed.has('KeyC'));
  const poundP = crouchP || (ctrl && (pressed.has('ShiftLeft') || pressed.has('ShiftRight')));
  const spinP = ctrl && (pressed.has('KeyF') || (pressed.has('Mouse0') && locked()));
  // X = Komeetduik: Rênas' own move. A short jetpack burst in the direction you steer, once per jump
  const dashP = ctrl && !G.noDash && pressed.has('KeyX');   // G.noDash: the Komeetband in De Sterrentempel
  const { fwd: cf, right: cr } = camBasis();
  const move = V3().addScaledVector(cf, iy).addScaledVector(cr, ix);
  // VR: the left stick walks relative to where your head looks (vr.js hands over the direction, and how far the stick is pushed)
  if (ctrl && G.vrMove) { const m = G.vrMove; move.set(0, 0, 0).addScaledVector(m.fwd, m.y).addScaledVector(m.right, m.x); reproject(move, P.up, true); }
  let len = move.length();
  if (len > 1) { move.divideScalar(len); len = 1; }

  if (jumpP) P.buffer = 0.14;
  if (crouchP) P.crouchBuf = 0.3;
  P.buffer -= dt; P.chainT -= dt; P.coyote -= dt; P.crouchBuf -= dt; P.spinCd -= dt; P.inv -= dt; P.thrustT -= dt; P.wallT -= dt; P.dashCd -= dt; P.dashEnd -= dt;
  P.airT = P.grounded ? 0 : P.airT + dt;
  P.crouch = crouchH && P.grounded;
  const v = P.vt;
  const feet = () => P.pos.clone().addScaledVector(P.up, 0.1);
  const longJump = () => {
    v.copy(P.fwd).multiplyScalar(14);
    P.vr = S.jump * 0.7; P.long = true; P.chain = 0; P.cut = true;
    puff(feet(), 8, 0xffd166, 2.5, 0.3); sfx.longJump();
  };

  if (P.pound === 1) {
    v.set(0, 0, 0); P.vr = 0;
    P.poundT -= dt;
    if (P.poundT <= 0) { P.pound = 2; P.vr = -32; }
  } else {
    // Komeetduik: start it. Grounded you can dash every 0.8 s; in the air once per jump.
    // Stomping an enemy gives the air dash back, so good players can chain stomp > dash > stomp.
    if (dashP && P.pound === 0 && !P.long && P.dashT <= 0 && P.dashCd <= 0 && (P.grounded || !P.dashAir)) {
      P.dashDir.copy(len > 0.1 ? move.clone().normalize() : P.fwd); reproject(P.dashDir, P.up, false);
      P.dashT = 0.22; P.dashCd = 0.8; if (!P.grounded) P.dashAir = true;
      P.vr = 0; P.jumping = false; P.cut = true; P.thrustT = 0.25; P.fwd.copy(P.dashDir);
      sfx.whoosh(); squash(-0.15); G.shake = Math.max(G.shake, 0.08);
      puff(P.pos.clone().addScaledVector(P.up, 0.6).addScaledVector(P.dashDir, -0.4), 12, tcol(0), 3.5, 0.2);
    }
    if (P.dashT > 0) {
      // a straight burst that ignores gravity. You can still cancel it into a spin or a ground pound
      reproject(P.dashDir, P.up, false);
      v.copy(P.dashDir).multiplyScalar(16); P.vr = 0;
      P.dashT -= dt;
      if (Math.random() < 0.7) puff(P.pos.clone().addScaledVector(P.up, 0.7).addScaledVector(P.dashDir, -0.5), 1, tcol(1), 0.6, 0.05);
      if (P.dashT <= 0) { v.setLength(9); P.dashEnd = 0.14; }
      if (poundP && !P.grounded) { P.dashT = 0; P.pound = 1; P.poundT = 0.2; v.set(0, 0, 0); P.vr = 0; sfx.pound(); }
      if (spinP && P.spinCd <= 0) { P.dashT = 0; v.setLength(7.5); P.spinT = 0.38; P.spinCd = 1.0; P.spinId = (P.spinId || 0) + 1; sfx.spin(); puff(P.pos.clone().addScaledVector(P.up, 0.6), 10, 0x7ac8ff, 4, 0.1); }
    } else if (P.pound === 0) {
      const target = S.speed * (P.crouch ? 0.3 : sprintH ? 1.45 : 1);
      // crouching keeps momentum (a short slide) so the long jump window stays open
      // speed up smoothly (no lunge), brake a bit quicker
      const braking = move.dot(v) < 0 || len < 0.1;
      const acc = (P.grounded ? (P.crouch ? 9 : braking ? 42 : 22) : P.long ? 6 : 22 * 0.8) * dt;
      if (!P.long || len > 0.1) {
        const goal = move.clone().multiplyScalar(target);
        const diff = goal.sub(v), dl = diff.length();
        if (dl <= acc || dl < 1e-9) v.add(diff); else v.addScaledVector(diff, Math.max(0, acc) / dl);   // never divide by 0
      }
      const hs = v.length();
      if (P.buffer > 0 && (P.grounded || P.coyote > 0)) {
        if ((crouchH || P.crouchBuf > 0) && (hs > 1.5 || len > 0.3)) longJump();
        else {
          P.chain = P.chainT > 0 && hs > 3 ? Math.min(P.chain + 1, 3) : 1;
          P.vr = S.jump * [1, 1.18, 1.45][P.chain - 1];
          if (P.chain === 3) P.flip = 0.0001;
          sfx.jump(P.chain);
        }
        P.buffer = 0; P.coyote = 0; P.grounded = false; P.jumping = true; P.cut = P.long;
        puff(feet(), 6, 0xffffff, 2, 0.5);
        squash(-0.2);
      } else if (jumpP && !P.grounded && !P.airJump) {
        // the backpack thruster: Rênas' air jump (Josh gets his from Byte)
        P.vr = S.jump * 0.85; P.airJump = true; P.buffer = 0; P.jumping = true; P.cut = false; P.long = false;
        P.thrustT = 0.3; sfx.airJump();
        puff(P.pos.clone().addScaledVector(P.up, 0.5).addScaledVector(P.fwd, -0.3), 10, tcol(0), 3, 0.2);
        squash(-0.2);
      }
      if (!jumpH && P.jumping && !P.cut && P.vr > 0) { P.vr *= 0.45; P.cut = true; }
      if (poundP && !P.grounded && !P.long) {
        P.pound = 1; P.poundT = 0.2; v.set(0, 0, 0); P.vr = 0; sfx.pound();
      }
      if (spinP && P.spinCd <= 0) {
        P.spinT = 0.38; P.spinCd = 1.0; P.spinId = (P.spinId || 0) + 1; sfx.spin();
        if (!P.grounded && !P.spinLift) { P.vr = Math.max(P.vr, 5); P.spinLift = true; }
        puff(P.pos.clone().addScaledVector(P.up, 0.6), 10, 0x7ac8ff, 4, 0.1);
      }
    }
    if (P.pound !== 1 && P.dashT <= 0) {
      P.vr -= S.gravity * (pl.grav || 1) * (P.vr < 0 ? 1.6 : 1) * (P.dashEnd > 0 ? 0.4 : 1) * dt;   // a planet can have its own gravity (the moon: pl.grav < 1)
      P.vr = Math.max(P.vr, -34);
    }
  }
  P.spinT -= dt;

  // ---------- move + collide, in substeps ----------
  const wasGrounded = P.grounded, fall = P.vr, wasPound = P.pound === 2;
  if (P.grounded && P.ground && P.ground.carry) P.ground.carry(P);
  P.grounded = false; P.ground = null;
  const spd = Math.max(v.length(), Math.abs(P.vr));
  const steps = Math.max(1, Math.ceil((spd * dt) / 0.2));
  const h = dt / steps;
  for (let i = 0; i < steps; i++) {
    P.prevAlt = P.alt;
    P.pos.addScaledVector(v, h).addScaledVector(P.up, P.vr * h);
    let r = P.pos.distanceTo(c);
    P.up.copy(P.pos).sub(c).divideScalar(r);
    Rr = rOf(pl, P.up);
    let alt = r - Rr;
    for (const pf of pl.platforms) {
      if (pf.off) continue;
      const res = pfTest(pf, P.up, alt, Rr);
      if (!res) continue;
      if (alt <= pf.h + 0.001 && P.prevAlt >= pf.h - (pf.slack || 0.06) && P.vr <= 0) { alt = pf.h; P.vr = 0; P.grounded = true; P.ground = pf; continue; }
      if ((wasGrounded || P.grounded) && P.vr <= 0 && pf.h - alt <= 0.35 && pf.h > alt && alt > pf.b - 0.1) { alt = pf.h; P.grounded = true; P.ground = pf; continue; }
      if (alt + PH > pf.b && alt < pf.h) {
        if (P.vr > 0 && P.prevAlt + PH <= pf.b + 0.12) { alt = pf.b - PH; P.vr = 0; continue; }
        P.pos.addScaledVector(res.dir, res.amt);
        r = P.pos.distanceTo(c); P.up.copy(P.pos).sub(c).divideScalar(r); Rr = rOf(pl, P.up); alt = r - Rr;
        const into = v.dot(res.dir); if (into < 0) v.addScaledVector(res.dir, -into);
        if (pf.hurt) G.onHazard && G.onHazard(pf);
        P.wallT = 0.15;
      }
    }
    // walking downhill on a shaped planet: stick to the ground instead of hopping off every slope
    if (pl.shape && !P.grounded && wasGrounded && P.vr <= 0 && P.ground === null && alt > 0 && alt < 0.5 && !P.jumping && !P.long) alt = 0;
    if (alt <= 0 && P.vr <= 0) { alt = 0; P.vr = 0; P.grounded = true; P.ground = pl.surface; }
    else if (alt < 0) alt = 0;
    P.pos.copy(c).addScaledVector(P.up, Rr + alt);
    P.alt = alt;
    reproject(v, P.up, true);
  }
  if (P.grounded) {
    if (!wasGrounded) onLand(fall, wasPound);
    if (P.grounded) P.coyote = 0.2;
  }
  // MARIO GALAXY: jump off a little planet into the pull of another one and its gravity takes over.
  // Only planets with a gravity field (pl.field, in metres above their surface) pull you in.
  if (!P.grounded && pl.world && pl.world.planets.length > 1) {
    let to = null, bd = P.alt;
    for (const q of pl.world.planets) {
      if (q === pl || !q.field) continue;
      const d = P.pos.distanceTo(q.c) - rOf(q, P.pos.clone().sub(q.c).normalize());   // height above its ground (shaped planets too)
      if (d < q.field && d < bd) { bd = d; to = q; }
    }
    if (to) {
      const vel = v.clone().addScaledVector(P.up, P.vr);
      P.planet = to; P.up.copy(P.pos).sub(to.c).normalize();
      P.vr = vel.dot(P.up); v.copy(vel).addScaledVector(P.up, -P.vr);
      P.alt = P.prevAlt = P.pos.distanceTo(to.c) - rOf(to, P.up);
      P.ground = null; P.coyote = 0; reproject(P.fwd, P.up, false);
      if (G.onGravity) G.onGravity(to);
    }
  }

  // facing
  const hs = v.length();
  if (hs > 0.5 && P.pound === 0 && !P.long) {
    const a = signedAngle(P.fwd, v.clone().divideScalar(hs), P.up);
    P.fwd.applyAxisAngle(P.up, a * damp(14, dt));
  }
  // in a conversation: turn to face whoever you're talking to
  if (P.talkTo && !G.cutscene) P.talkTo = null;
  if (P.talkTo) {
    const to = P.talkTo.g.position.clone().sub(P.pos); to.addScaledVector(P.up, -to.dot(P.up));
    if (to.lengthSq() > 0.04) P.fwd.applyAxisAngle(P.up, signedAngle(P.fwd, to.normalize(), P.up) * damp(7, dt));
  }
  animate(dt, t, hs);
  return hs;
}

function onLand(fall, wasPound) {
  P.jumping = false; P.airJump = false; P.long = false; P.spinLift = false; P.chainT = 0.2; P.dashAir = false;
  const gb = P.ground;
  if (wasPound) {
    P.pound = 0; sfx.poundLand(); G.shake = Math.max(G.shake, 0.35);
    puff(P.pos.clone().addScaledVector(P.up, 0.15), 18, 0xffffff, 6, 0.4);
    if (G.onPoundLand) G.onPoundLand(P.pos.clone(), gb);
  } else if (fall < -5) {
    squash(0.25 * Math.min(1, -fall / 20)); sfx.land();
    puff(P.pos.clone().addScaledVector(P.up, 0.1), 4, 0xffffff, 1.5, 0.3);
  }
  if (gb && gb.onLand) gb.onLand(wasPound);
  if (gb && gb.bounce) {
    P.vr = gb.bounce * (wasPound ? 1.25 : 1); P.grounded = false; P.jumping = true; P.cut = true; P.coyote = 0; P.airJump = false;
    squash(0.4); sfx.jump(3); puff(P.pos.clone(), 8, gb.puff || 0xff7ab6, 3, 0.6);
  }
}
export function bouncePlayer(vy = 14) {
  P.vr = vy; P.grounded = false; P.jumping = true; P.cut = true; P.airJump = false; P.pound = 0; P.long = false; P.spinLift = false;
  P.dashT = 0; P.dashAir = false;   // a stomp gives the Komeetduik back
}

export function hurtPlayer(from, knock = 8) {
  if (P.inv > 0 || P.dead || G.cutscene || !P.planet) return false;
  P.hp--; P.inv = 1.6; drawHearts();
  sfx.hurt(); G.shake = Math.max(G.shake, 0.3);
  let away = P.fwd.clone().negate();
  if (from) { const d = dirOf(P.planet, from); if (d.dot(P.up) < 0.99999) away = tangentTo(P.up, d).negate(); }
  P.vt.copy(away).multiplyScalar(knock); P.vr = 8; P.grounded = false; P.pound = 0; P.long = false; P.dashT = 0;
  const el = $('hp'); el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit');
  if (P.hp <= 0) { P.dead = true; if (G.onDie) G.onDie(); }
  return true;
}
export function healPlayer(n = 1) { if (P.hp >= P.maxHp) return false; P.hp = Math.min(P.maxHp, P.hp + n); drawHearts(); sfx.heal(); return true; }

// ---------- animation (from OiO main.js animate) ----------
const A = { phase: 0 };
function animate(dt, t, hs) {
  if (!Number.isFinite(hs)) hs = 0;
  healJoints();
  const k = damp(18, dt);
  const run = Math.min(hs / Math.max(S.speed, 1), 1);
  A.phase += hs * dt * 1.9;
  const sw = Math.sin(A.phase) * 0.95 * run;
  // hips (L), knees (K), shoulders (A), elbows (E)
  let L0 = 0, L1 = 0, K0 = 0.05, K1 = 0.05, A0x = 0, A1x = 0, E0 = -0.25, E1 = -0.25, Az = 0.14, lean = 0, bob = 0;
  if (P.pound) { L0 = L1 = -1.4; K0 = K1 = 1.9; Az = 2.5; E0 = E1 = 0; }
  else if (P.long) { L0 = 0.5; L1 = 0.8; K0 = 0.3; K1 = 0.6; A0x = A1x = -2.8; E0 = E1 = 0; Az = 0.2; lean = 1.15; }
  else if (P.grounded) {
    L0 = sw; L1 = -sw;
    // the knee bends while the leg swings back and comes forward again
    K0 = 0.08 + Math.max(0, -Math.sin(A.phase - 0.6)) * 1.25 * run;
    K1 = 0.08 + Math.max(0, Math.sin(A.phase - 0.6)) * 1.25 * run;
    A0x = -sw * 0.9; A1x = sw * 0.9; E0 = E1 = -0.25 - 0.9 * run;
    bob = Math.abs(Math.cos(A.phase)) * 0.06 * run;
    lean = run * 0.06;
    if (hs < 0.3) { Az = 0.14 + Math.sin(t * 2) * 0.03; bob = Math.sin(t * 2) * 0.008; }
  } else { L0 = -0.8; L1 = 0.35; K0 = 1.1; K1 = 0.4; A0x = -0.3; A1x = 0.3; E0 = E1 = -0.6; Az = 1.7; }
  if (P.dashT > 0) { L0 = 0.45; L1 = 0.7; K0 = 0.5; K1 = 0.3; A0x = A1x = 1.1; E0 = E1 = 0; Az = 0.35; lean = 1.2; bob = 0; }
  if (P.spinT > 0) { Az = 1.45; A0x = A1x = 0; E0 = E1 = 0; }
  // talking with someone: gestures while Rênas speaks, nods along while he listens
  let HX = -lean * 0.3, HZ = 0;
  if (P.talkTo && G.cutscene && P.grounded && hs < 0.6 && P.spinT <= 0 && P.dashT <= 0) {
    const g = cutTyping() ? 1 : 0.35;
    if (cutSpeaker() === 'RÊNAS') {
      A0x = -0.95 + Math.sin(t * 7) * 0.4 * g; A1x = -0.45 + Math.sin(t * 5.3 + 1) * 0.5 * g;
      E0 = -1.15 + Math.sin(t * 9) * 0.35 * g; E1 = -0.8 + Math.sin(t * 6.1) * 0.3 * g;
      Az = 0.3 + Math.sin(t * 6) * 0.12 * g; L0 = L1 = 0; K0 = K1 = 0.08;
      bob = Math.abs(Math.sin(t * 7)) * 0.03 * g;
      HX = Math.sin(t * 8) * 0.07 * g; HZ = Math.sin(t * 2.3) * 0.1;
    } else {
      A0x = A1x = -0.15; E0 = E1 = -1.5; Az = 0.6; L0 = L1 = 0; K0 = K1 = 0.06;   // hands on the hips
      HX = Math.max(0, Math.sin(t * 2.6)) * 0.2 * g + 0.04; HZ = 0.13;              // nodding, head a bit tilted
      bob = Math.sin(t * 2) * 0.01;
    }
  }
  const RR = model.R;
  RR.legs[0].rotation.x += (L0 - RR.legs[0].rotation.x) * k;
  RR.legs[1].rotation.x += (L1 - RR.legs[1].rotation.x) * k;
  RR.knees[0].rotation.x += (K0 - RR.knees[0].rotation.x) * k;
  RR.knees[1].rotation.x += (K1 - RR.knees[1].rotation.x) * k;
  RR.arms[0].rotation.x += (A0x - RR.arms[0].rotation.x) * k;
  RR.arms[1].rotation.x += (A1x - RR.arms[1].rotation.x) * k;
  RR.elbows[0].rotation.x += (E0 - RR.elbows[0].rotation.x) * k;
  RR.elbows[1].rotation.x += (E1 - RR.elbows[1].rotation.x) * k;
  RR.arms[0].rotation.z += (-Az - RR.arms[0].rotation.z) * k;
  RR.arms[1].rotation.z += (Az - RR.arms[1].rotation.z) * k;
  RR.head.rotation.x += (HX - RR.head.rotation.x) * damp(10, dt);
  RR.head.rotation.z += (HZ - RR.head.rotation.z) * damp(10, dt);
  const pv = model.pivot;
  if (P.flip > 0) { P.flip = Math.min(P.flip + dt * 2.1, 1); pv.rotation.x = P.flip * Math.PI * 2 + lean; if (P.flip >= 1) P.flip = 0; }
  else pv.rotation.x += (lean - pv.rotation.x) * k;
  pv.rotation.y = P.pound === 1 ? (1 - P.poundT / 0.2) * Math.PI * 2 : P.spinT > 0 ? (1 - P.spinT / 0.38) * Math.PI * 4 : 0;
  pv.position.y = 0.6 + bob;
  RR.flame.visible = P.thrustT > 0;
  if (RR.flame.visible) { RR.flame.scale.set(1, 0.7 + Math.random() * 0.6, 1); RR.flame.material.color.setHex(tcol(0)); }
  // antenna tip: cyan while thrusting, grey while the Komeetduik recharges, blinking red when it's ready
  RR.tip.material.color.setHex(P.thrustT > 0 || P.spinT > 0 ? 0x5ef2e0 : P.dashCd > 0 || (P.dashAir && !P.grounded) ? 0x4a4658 : Math.sin(t * 4) > 0.6 ? 0xff3a3a : 0x8a1a1a);
  // squash & stretch spring, plus crouch
  sq.v += (-200 * sq.s - 16 * sq.v) * dt;
  sq.s += sq.v * dt;
  if (!isFinite(sq.s) || !isFinite(sq.v)) sq.s = sq.v = 0;
  sq.s = clamp(sq.s, -0.45, 0.45);
  const crouch = P.crouch ? 0.72 : 1;
  model.root.scale.set(1 + sq.s * 0.5, (1 - sq.s) * crouch, 1 + sq.s * 0.5);
  // only hidden on purpose (cutscenes, flights) or as a short blink after getting hit
  model.root.visible = !P.hidden && !(P.inv > 0.25 && Math.floor(t * 10) % 3 === 0);
  placeModel();
  healJoints();
}
export function placeModel() {
  model.root.position.copy(P.pos);
  orientOn(model.root, P.up, P.fwd);
  const pl = P.planet; if (!pl) return;
  // drop shadow straight down, onto whatever is under Rênas
  let best = 0; const Rg = rOf(pl, P.up);
  for (const pf of pl.platforms) {
    if (pf.off || pf.h > P.alt + 0.05) continue;
    if (pfTest(pf, P.up, P.alt, Rg, 0) && pf.h > best) best = pf.h;
  }
  shadow.position.copy(pl.c).addScaledVector(P.up, Rg + best + 0.04);
  orientOn(shadow, P.up, P.fwd);
  const hgt = P.alt - best;
  shadow.scale.setScalar(clamp(1 - hgt * 0.06, 0.45, 1));
  shadow.material.opacity = clamp(0.34 - hgt * 0.02, 0.12, 0.34);
  shadow.visible = !P.hidden;
}
export function showPlayer(v) { P.hidden = !v; model.root.visible = v; shadow.visible = v; }

// ---------- camera ----------
export const cam = { fwd: V3(0, 0, 1), pitch: 0.32, dist: 7.2, lastIn: -9, pos: V3(), up: V3(0, 1, 0), look: V3(), sens: 1 };
export function camBasis() {
  const f = cam.fwd;
  const r = new THREE.Vector3().crossVectors(f, P.up);
  if (r.lengthSq() < 1e-8) r.copy(anyPerp(P.up)); else r.normalize();
  return { fwd: f, right: r };
}
function camWant() {
  const up = P.up;
  const back = cam.fwd.clone().multiplyScalar(-Math.cos(cam.pitch) * cam.dist).addScaledVector(up, Math.sin(cam.pitch) * cam.dist + 1.4);
  let want = P.pos.clone().add(back);
  if (P.planet && altOf(P.planet, want) < 1.3) want = surf(P.planet, dirOf(P.planet, want), 1.3);
  // never let a rock, crystal, pillar or platform sit between the camera and Rênas: slide the camera in front of it
  const pl = P.planet;
  if (pl) {
    const from = P.pos.clone().addScaledVector(up, 1.1), pt = V3();
    for (let i = 1; i <= 14; i++) {
      const k = i / 14;
      pt.copy(from).lerp(want, k);
      const d = pt.clone().sub(pl.c), r = d.length(); d.divideScalar(r);
      const alt = r - rOf(pl, d);
      let hit = !!pl.shape && alt < 0.4;   // a hill of a shaped planet in the way
      for (const pf of pl.platforms) {
        if (pf.off || alt > pf.h + 0.2 || alt < pf.b) continue;
        if (hit) break;
        if (pfTest(pf, d, alt, r - alt, 0.25)) { hit = true; break; }
      }
      if (hit) { want = from.clone().lerp(want, Math.max(0.12, k - 1 / 14 - 0.04)); break; }
    }
  }
  return want;
}
export function resetCam(fwd) {
  cam.fwd.copy(fwd || P.fwd); reproject(cam.fwd, P.up, false);
  cam.pitch = 0.32;
  cam.pos.copy(camWant()); cam.up.copy(P.up); cam.look.copy(P.pos).addScaledVector(P.up, 1.1);
  camera.position.copy(cam.pos); camera.up.copy(cam.up); camera.lookAt(cam.look);
}
export function updateCamera(dt, t, opts = {}) {
  const up = P.up;
  reproject(cam.fwd, up, false);
  if (mouse.dx || mouse.dy) {
    cam.fwd.applyAxisAngle(up, -mouse.dx * 0.0026 * cam.sens);
    cam.pitch = clamp(cam.pitch + mouse.dy * 0.002 * cam.sens, -0.02, 1.2);
    mouse.dx = mouse.dy = 0; cam.lastIn = t;
  }
  // keys to turn the camera too
  if (keys.has('KeyQ') || keys.has('ArrowLeft')) { cam.fwd.applyAxisAngle(up, 2.2 * dt); cam.lastIn = t; }
  if (keys.has('KeyR') || keys.has('ArrowRight')) { cam.fwd.applyAxisAngle(up, -2.2 * dt); cam.lastIn = t; }
  if (keys.has('ArrowUp')) { cam.pitch = clamp(cam.pitch + 1.1 * dt, -0.02, 1.2); cam.lastIn = t; }
  if (keys.has('ArrowDown')) { cam.pitch = clamp(cam.pitch - 1.1 * dt, -0.02, 1.2); cam.lastIn = t; }
  // Like Mario: when you run and haven't touched the camera for a bit, it slowly swings behind you.
  const hs = P.vt.length();
  if (t - cam.lastIn > 1.4 && hs > 2 && P.pound === 0) {
    if (cam.fwd.dot(P.fwd) > -0.4) cam.fwd.applyAxisAngle(up, signedAngle(cam.fwd, P.fwd, up) * damp(1.1, dt) * Math.min(1, hs / 7));
  }
  if (opts.focus) {   // boss fights: lean the view toward the boss so you can see the attacks coming
    const toB = tangentTo(up, dirOf(P.planet, opts.focus));
    if (t - cam.lastIn > 0.6) cam.fwd.applyAxisAngle(up, signedAngle(cam.fwd, toB, up) * damp(opts.focusK || 1.6, dt));
  }
  cam.pos.lerp(camWant(), damp(9, dt));
  cam.up.lerp(up, damp(6, dt)).normalize();
  cam.look.lerp(P.pos.clone().addScaledVector(up, 1.1), damp(14, dt));
  camera.position.copy(cam.pos);
  if (G.shake > 0) camera.position.add(V3((Math.random() - 0.5) * G.shake, (Math.random() - 0.5) * G.shake, (Math.random() - 0.5) * G.shake));
  camera.up.copy(cam.up);
  camera.lookAt(cam.look);
}
