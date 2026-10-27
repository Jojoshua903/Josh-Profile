import { THREE, canvas, renderer, scene, camera, sun, V3, clamp, damp, approach, puff, updateParticles, toast } from './core.js?v=muis1';
import { buildJosh, buildDrone } from './josh.js?v=muis1';
import { boxes, movers, lamps, dust, rocket, syncBox, ARENA_ENTRY, ARENA_POS, winOn, winOff, fogMat, crates, SPAWN as WORLD_SPAWN, CHECKPOINTS, TRAVEL, PLANET } from './berg-world.js?v=muis1';
const { save, gotSet, persist, wipe } = getSave(PLANET);
import { boss, updateBoss, resetBoss, bossActive, setBossDead, BOSS_INFO } from './berg-boss.js?v=muis1';
import { enemies } from './berg-enemies.js?v=muis1';
import { getSave } from './save.js?v=muis1';
import { registerPlanet, activePlanet, travel, resumePlanet } from './planets.js?v=muis1';
import { groundAt } from './berg-terrain.js?v=muis1';
import { addCookie, cookies as newCookies } from './cookies.js?v=muis1';
import { scannables, updateNPCs, talk, dialog, nearMilo, PENDING_RARE, npcEvents, restoreNPCs, miloTalked, guideDone, npcPrompt } from './berg-npc.js?v=muis1';
import { S, LOOK, initUI, setAbility, setCookies, setPrompt } from './ui.js?v=muis1';
import { cs, updateCutscene } from './cutscene.js?v=muis1';
import { updateBubbles } from './bubbles.js?v=muis1';
import { setupStory } from './berg-story.js?v=muis1';
import * as sfx from './sfx.js?v=muis1';

const josh = buildJosh();
const drone = buildDrone();
initUI(josh);

const AB = {
  veer: { label: 'Veer', icon: '🦗', desc: 'Springt 1,5× hoger', color: '#6fd3ff', hex: 0x6fd3ff },
  zweef: { label: 'Zweef', icon: '🦅', desc: 'Houd spatie ingedrukt om te zweven', color: '#ffd166', hex: 0xffd166 },
  zwaar: { label: 'Zwaar', icon: '🪨', desc: 'Breekt gebarsten muren, maar springt lager', color: '#ff8a3d', hex: 0xff8a3d },
  haas: { label: 'Haas', icon: '🐇', desc: 'Rent sneller en springt verder', color: '#9be36b', hex: 0x9be36b },
};
const R = 0.32, H = 1.6, SPAWN = WORLD_SPAWN, TERRAIN = { terrain: true };
// this planet's own cookies: adopt everything its modules have added so far (and later, while active)
const cookies = [];
const adoptCookies = () => { while (newCookies.length) cookies.push(newCookies.shift()); };
adoptCookies();
const RARE_TOTAL = cookies.filter((c) => c.rare).length + PENDING_RARE;
const checkpoint = SPAWN.clone();
const life = { hp: 3, inv: 0, calm: 0 };
let shakeT = 0;

const P = {
  pos: SPAWN.clone(), vel: V3(), grounded: false, ground: null, coyote: 0, buffer: 0,
  jumping: false, cut: false, airJump: false, chain: 0, chainT: 0, pound: 0, poundT: 0,
  long: false, flip: 0, facing: Math.PI, ability: null, floating: false, crouch: false, crouchBuf: 0, airT: 0,
};
let coinCount = 0, rareCount = 0;
setCookies(0, 0, RARE_TOTAL);

// ---------- input ----------
const keys = new Set(), pressed = new Set();
const isText = (t) => t instanceof HTMLInputElement && t.type === 'text';
addEventListener('keydown', (e) => {
  if (isText(e.target)) return;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (!e.repeat) pressed.add(e.code);
  keys.add(e.code);
});
addEventListener('keyup', (e) => { keys.delete(e.code); if (e.code === 'Space' && !isText(e.target)) e.preventDefault(); });
addEventListener('blur', () => keys.clear());

let gpPrev = {};
function readPad() {
  const gp = navigator.getGamepads ? navigator.getGamepads()[0] : null;
  if (!gp) return null;
  const b = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed);
  const o = { lx: gp.axes[0] || 0, ly: gp.axes[1] || 0, rx: gp.axes[2] || 0, ry: gp.axes[3] || 0,
    jump: b(0), crouch: b(1) || b(6) || b(7), scan: b(2), drop: b(3) };
  ['jump', 'crouch', 'scan', 'drop'].forEach((k) => (o[k + 'P'] = o[k] && !gpPrev[k]));
  gpPrev = { jump: o.jump, crouch: o.crouch, scan: o.scan, drop: o.drop };
  return o;
}

// ---------- camera ----------
const cam = { yaw: 0, pitch: 0.32, target: V3(SPAWN.x, SPAWN.y + 1.3, SPAWN.z) };
// Mouse look: just move the mouse, no dragging. Clicking once locks the cursor to the game (Esc releases it).
canvas.addEventListener('pointerdown', () => {
  canvas.focus();
  if (document.pointerLockElement !== canvas && canvas.requestPointerLock) {
    try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) {}
  }
});
addEventListener('mousemove', (e) => {
  if (activePlanet() !== PLANET || cs.active) return;
  if (document.pointerLockElement !== canvas && e.target !== canvas) return;
  const dx = e.movementX || 0, dy = e.movementY || 0;
  if (!dx && !dy) return;
  cam.yaw -= dx * 0.004;
  cam.pitch = clamp(cam.pitch + dy * 0.0035, -0.15, 1.25);
  lastDrag = time;
});
canvas.addEventListener('wheel', (e) => { e.preventDefault(); S.cam = clamp(S.cam + e.deltaY * 0.01, 4, 18); }, { passive: false });

// ---------- helpers ----------
const overlaps = (b, p) =>
  p.x + R > b.min.x && p.x - R < b.max.x && p.z + R > b.min.z && p.z - R < b.max.z && p.y + H > b.min.y && p.y < b.max.y;

const sq = { s: 0, v: 0 };
const squash = (a) => { sq.s = a; sq.v = 0; };

const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24),
  new THREE.MeshBasicMaterial({ color: 0x2b2440, transparent: true, opacity: 0.28, depthWrite: false }));
shadow.rotation.x = -Math.PI / 2; scene.add(shadow);

const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 8, 40), new THREE.MeshBasicMaterial({ color: 0x14b8a6 }));
ring.rotation.x = Math.PI / 2; ring.visible = false; scene.add(ring);

const D = { pos: V3(1, 2, 4), state: 'follow', t: 0, scan: null, boost: 0 };
drone.g.position.copy(D.pos);

function breakCrate(b, silent = false) {
  boxes.splice(boxes.indexOf(b), 1);
  scene.remove(b.mesh);
  if (!silent) { puff(b.pos.clone(), 14, 0xa07040, 5, 3); if (b.wall) sfx.smash(); else sfx.crate(); }
  if (b.rare) addCookie(b.pos.x, b.pos.y + 0.7, b.pos.z, b.rareName || 'Krat in het steegje');
  else for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; addCookie(b.pos.x + Math.cos(a) * 0.9, b.pos.y + 0.3, b.pos.z + Math.sin(a) * 0.9, '', `${b.id}-${i}`); }
  if (!save.crates.includes(b.id)) { save.crates.push(b.id); persist(); }
}

function onLand(fall, wasPound) {
  if (wasPound) {
    sfx.poundLand();
    puff(P.pos.clone().add(V3(0, 0.1, 0)), 16, 0xffffff, 7, 0.4);
    if (P.ground.crate && !P.ground.wall) breakCrate(P.ground);
    squash(0.45);
  } else { squash(Math.min(0.35, -fall * 0.014)); if (fall < -12) sfx.land(); }
  if (P.jumping && !P.long) P.chainT = 0.22;
  if (P.chain === 3) P.chain = 0;
  P.jumping = P.airJump = P.long = P.cut = false;
  P.flip = 0; P.pound = 0;
}

function respawn(msg = 'Oeps! Terug naar je laatste checkpoint') {
  P.pos.copy(checkpoint); P.vel.set(0, 0, 0); P.pound = 0; P.long = false;
  cam.target.set(checkpoint.x, checkpoint.y + 1.3, checkpoint.z);
  if (bossActive()) resetBoss();
  life.hp = 3; setHP();
  toast(msg);
}

// ---------- health: shown in a boss fight, or once you've been hurt ----------
const hpEl = document.getElementById('hp');
function setHP() {
  hpEl.classList.toggle('show', bossActive() || life.hp < 3);
  [...hpEl.children].forEach((h, i) => h.classList.toggle('off', i >= life.hp));
}
// a heart comes back after a while without getting hit
function updateHP(dt) {
  life.inv -= dt; life.calm += dt;
  if (life.hp < 3 && life.calm > 10 && !bossActive()) { life.hp++; life.calm = 0; setHP(); }
}
const bossApi = {
  intro() {
    const t = document.getElementById('title');
    t.querySelector('.t').textContent = BOSS_INFO.name; sfx.wake();
    t.querySelector('.s').textContent = BOSS_INFO.sub;
    t.style.opacity = 1; setTimeout(() => (t.style.opacity = 0), 2800);
    life.hp = 3; setTimeout(setHP, 50);
    if (story.bossIntro) story.bossIntro();
  },
  damage(from) {
    if (life.inv > 0) return;
    life.hp--; life.inv = 1.6; life.calm = 0; shakeT = 0.25; sfx.hurt();
    const d = P.pos.clone().sub(from).setY(0);
    if (d.lengthSq() < 0.01) d.set(0, 0, 1);
    d.setLength(9);
    P.vel.set(d.x, 9, d.z); P.pound = 0; P.long = false; P.grounded = false;
    puff(P.pos.clone().add(V3(0, 1, 0)), 8, 0xff8a8a, 3, 1);
    if (life.hp <= 0) respawn(bossActive() ? BOSS_INFO.fail : 'Au! Terug naar je laatste checkpoint');
    setHP();
  },
  bounce(vy) { sfx.stomp(); P.vel.y = vy; P.grounded = false; P.jumping = true; P.cut = true; P.airJump = false; P.pound = 0; },
  shake(s) { shakeT = Math.max(shakeT, s); },
  win(pos) {
    setHP(); hpEl.classList.remove('show');
    addCookie(pos.x, BOSS_INFO.cookieY, pos.z, BOSS_INFO.cookie);
    if (BOSS_INFO.lightBack) lightBack = 0.0001;
    save.boss = true; persist(); sfx.fanfare();
    const t = document.getElementById('title');
    t.querySelector('.t').textContent = BOSS_INFO.winTitle;
    t.querySelector('.s').textContent = BOSS_INFO.winSub;
    t.style.opacity = 1; setTimeout(() => (t.style.opacity = 0), 4000);
    if (story.bossWin) story.bossWin(pos);
  },
};
const enemyApi = { damage: bossApi.damage, bounce: bossApi.bounce, toast };

// the moon slowly brightens after the boss is beaten
let lightBack = 0;
const hemi = scene.children.find((o) => o.isHemisphereLight);
const fogFrom = scene.fog.color.clone(), fogTo = new THREE.Color(0xb7c3dc);
function updateLightBack(dt) {
  if (!lightBack || lightBack >= 1) return;
  lightBack = Math.min(1, lightBack + dt / 4);
  const k = lightBack;
  scene.fog.density = 0.026 - 0.014 * k;
  scene.fog.color.copy(fogFrom).lerp(fogTo, k);
  hemi.intensity = 1.5 + 1.2 * k;
  hemi.color.setHex(0xb4c0e0).lerp(new THREE.Color(0xfff1d8), k);
  sun.intensity = 1.5 + 1.3 * k;
  sun.color.setHex(0xc9d6ff).lerp(new THREE.Color(0xffe2b8), k);
  fogMat.opacity = 0.1 * (1 - k);
  if (k > 0.5) winOff.color.copy(winOn.color);
  document.body.style.background = `linear-gradient(180deg, ${k < 1 ? '#5a6a96' : '#7fa3d9'} 0%, #b9c6e4 50%, #ffd9b0 100%)`;
}

// ---------- player update ----------
function updatePlayer(dt, t) {
  const pad = readPad();
  // walking is WASD only; the arrow keys (and J/L) turn the camera
  let ix = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
  let iy = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0);
  if (pad) {
    if (Math.abs(pad.lx) > 0.15) ix = pad.lx;
    if (Math.abs(pad.ly) > 0.15) iy = -pad.ly;
    if (Math.abs(pad.rx) > 0.15) { cam.yaw -= pad.rx * 2.6 * dt; lastDrag = time; }
    if (Math.abs(pad.ry) > 0.15) cam.pitch = clamp(cam.pitch + pad.ry * 1.8 * dt, -0.15, 1.25);
  }
  const turnL = keys.has('KeyJ') || keys.has('ArrowLeft'), turnR = keys.has('KeyL') || keys.has('ArrowRight');
  const tiltU = keys.has('ArrowUp'), tiltD = keys.has('ArrowDown');
  if (turnL || turnR || tiltU || tiltD) lastDrag = time;
  if (turnL) cam.yaw += 2.2 * dt;
  if (turnR) cam.yaw -= 2.2 * dt;
  if (tiltU) cam.pitch = clamp(cam.pitch + 1.4 * dt, -0.15, 1.25);
  if (tiltD) cam.pitch = clamp(cam.pitch - 1.4 * dt, -0.15, 1.25);
  const len = Math.hypot(ix, iy);
  if (len > 1) { ix /= len; iy /= len; }
  if (dialog.active || launch.on || cs.active) { ix = 0; iy = 0; }
  const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
  const mx = fx * iy + rx * ix, mz = fz * iy + rz * ix;

  const live = !dialog.active && !launch.on && !cs.active;
  const jumpP = live && (pressed.has('Space') || (pad && pad.jumpP));
  const jumpH = live && (keys.has('Space') || (pad && pad.jump));
  const crouchH = live && (keys.has('ShiftLeft') || keys.has('ShiftRight') || keys.has('KeyC') || (pad && pad.crouch));
  const crouchP = live && (pressed.has('ShiftLeft') || pressed.has('ShiftRight') || pressed.has('KeyC') || (pad && pad.crouchP));
  const interactP = !cs.active && !launch.on && (pressed.has("KeyE") || (pad && (pad.scanP || (dialog.active && pad.jumpP))));
  const dropP = live && (pressed.has('KeyQ') || (pad && pad.dropP));
  pressed.clear();
  let scanP = false;
  if (interactP) {
    if (dialog.active || (P.grounded && nearMilo(P.pos))) talk();
    else if (P.grounded && nearRocket()) tryLaunch();
    else scanP = true;
  }

  if (jumpP) P.buffer = 0.14;
  if (crouchP) P.crouchBuf = 0.22;
  P.buffer -= dt; P.chainT -= dt; P.coyote -= dt; P.crouchBuf -= dt;
  P.airT = P.grounded ? 0 : P.airT + dt;
  const v = P.vel;
  const abMult = P.ability === 'veer' ? 1.5 : P.ability === 'zwaar' ? 0.8 : 1;
  const haas = P.ability === 'haas';
  P.crouch = crouchH && P.grounded;
  const longJump = () => {
    const lj = haas ? 19 : 14;
    v.x = Math.sin(P.facing) * lj; v.z = Math.cos(P.facing) * lj;
    v.y = S.jump * 0.7; P.long = true; P.chain = 0; P.cut = true;
    puff(P.pos.clone().add(V3(0, 0.3, 0)), 8, 0xffd166, 2.5, 0.3); sfx.longJump();
  };

  if (P.pound === 1) {
    v.set(0, 0, 0);
    P.poundT -= dt;
    if (P.poundT <= 0) { P.pound = 2; v.y = -32; }
  } else {
    if (P.pound === 0) {
      const target = S.speed * (P.crouch ? 0.3 : 1) * (P.floating && P.ability === 'zweef' ? 1.6 : 1) * (haas ? 1.45 : 1);
      // crouching keeps momentum (a short slide) so the long jump window stays open
      const acc = (P.grounded ? (P.crouch ? 9 : 60) : P.long ? 6 : 60 * S.air) * dt;
      if (!P.long || len > 0.1) {
        v.x = approach(v.x, mx * target, acc);
        v.z = approach(v.z, mz * target, acc);
      }
      const hs = Math.hypot(v.x, v.z);
      if (P.buffer > 0 && (P.grounded || P.coyote > 0)) {
        if ((crouchH || P.crouchBuf > 0) && hs > 1.5) {
          longJump();
        } else {
          P.chain = P.chainT > 0 && hs > 3 ? Math.min(P.chain + 1, 3) : 1;
          v.y = S.jump * [1, 1.18, 1.45][P.chain - 1] * abMult;
          if (P.chain === 3) P.flip = 0.0001;
          sfx.jump(P.chain);
        }
        P.buffer = 0; P.coyote = 0; P.grounded = false; P.jumping = true; P.cut = P.long;
        // jumping off something that moves (the mine cart) keeps its speed
        if (P.ground && P.ground.mover) { v.x += P.ground.mover.delta.x / dt; v.z += P.ground.mover.delta.z / dt; }
        puff(P.pos.clone().add(V3(0, 0.1, 0)), 6, 0xffffff, 2, 0.5);
        squash(-0.2);
      } else if (jumpP && !P.grounded && !P.airJump) {
        v.y = S.jump * 0.85; P.airJump = true; P.buffer = 0; P.jumping = true; P.cut = false; P.long = false;
        D.boost = 0.28; sfx.airJump();
        puff(P.pos.clone(), 10, 0x5ef2e0, 3, 0.2);
        squash(-0.2);
      }
      if (!jumpH && P.jumping && !P.cut && v.y > 0) { v.y *= 0.45; P.cut = true; }
      if (crouchP && !P.grounded) {
        // Shift right after takeoff turns the jump into a long jump instead of a ground pound
        if (P.jumping && P.airT < 0.16 && !P.long && P.chain <= 1 && !P.airJump && hs > 1.5) longJump();
        else if (P.coyote <= 0) { P.pound = 1; P.poundT = 0.2; P.long = false; v.set(0, 0, 0); sfx.pound(); }
      }
    }
    v.y -= S.gravity * (v.y < 0 ? 1.6 : 1) * dt;
    P.floating = (P.ability === 'ballon' || P.ability === 'zweef') && jumpH && v.y < 0 && P.pound === 0 && !P.grounded;
    if (P.floating) v.y = Math.max(v.y, P.ability === 'zweef' ? -1.6 : -1.4);
    v.y = Math.max(v.y, -34);
  }

  // moving platforms (carry the player along)
  for (const m of movers) {
    const np = m.base.clone().addScaledVector(m.axis, Math.sin(t * m.speed) * m.amp);
    m.delta.subVectors(np, m.b.pos);
    m.b.pos.copy(np); syncBox(m.b);
  }
  if (P.grounded && P.ground && P.ground.mover) P.pos.add(P.ground.mover.delta);

  // collisions, axis by axis, in substeps
  P.prevY = P.pos.y;
  const wasGrounded = P.grounded, fall = v.y, wasPound = P.pound === 2;
  P.grounded = false;
  const smash = new Set();
  const steps = Math.max(1, Math.ceil((Math.max(Math.abs(v.x), Math.abs(v.y), Math.abs(v.z)) * dt) / 0.2));
  const h = dt / steps;
  for (let i = 0; i < steps; i++) {
    for (const ax of ['x', 'z']) {
      const before = P.pos[ax];
      P.pos[ax] += v[ax] * h;
      // terrain columns: small steps are climbed, tall ones are walls
      const g = groundAt(P.pos.x, P.pos.z, R * 0.9);
      if (g > P.pos.y + 0.02) {
        if (g - P.pos.y <= 0.75 && (wasGrounded || P.grounded) && v.y <= 0) P.pos.y = g;
        else { P.pos[ax] = before; v[ax] = 0; }
      }
      for (const b of boxes) {
        if (!overlaps(b, P.pos)) continue;
        // a moving platform that rose into Josh: put him on top instead of shoving him sideways
        if (b.mover && b.max.y - P.pos.y < 0.8 && v.y <= 0.5) {
          P.pos.y = b.max.y; if (v.y < 0) v.y = 0; P.grounded = true; P.ground = b; continue;
        }
        if (b.max.y - P.pos.y < 0.35 && (wasGrounded || P.grounded) && v.y <= 0) { P.pos.y = b.max.y; continue; }
        // heavy Josh walks straight through cracked walls
        if (b.wall && P.ability === 'zwaar') { smash.add(b); continue; }
        if (b.wall && !b.hinted) { b.hinted = true; toast('Deze muur is gebarsten… met iets zwaars kom je er wel doorheen'); }
        const goNeg = v[ax] > 0 || (v[ax] === 0 && P.pos[ax] < b.pos[ax]);
        P.pos[ax] = goNeg ? b.min[ax] - R - 1e-4 : b.max[ax] + R + 1e-4;
        v[ax] = 0;
      }
    }
    const prevY = P.pos.y;
    P.pos.y += v.y * h;
    for (const b of boxes) {
      if (smash.has(b) || !overlaps(b, P.pos)) continue;
      const slack = b.mover ? 0.8 : 0.05;     // a rising platform may have moved up past Josh's feet this frame
      if (v.y <= 0 && prevY >= b.max.y - slack) { P.pos.y = b.max.y; v.y = 0; P.grounded = true; P.ground = b; }
      else if (v.y > 0) { P.pos.y = b.min.y - H - 1e-4; v.y = 0; }
    }
    const g = groundAt(P.pos.x, P.pos.z, R * 0.9);
    if (P.pos.y < g && v.y <= 0) { P.pos.y = g; v.y = 0; P.grounded = true; P.ground = TERRAIN; }
  }
  for (const b of smash) { breakCrate(b); shakeT = Math.max(shakeT, 0.3); puff(b.pos.clone(), 20, 0x9a948a, 6, 2); }

  if (P.grounded) {
    if (!wasGrounded) onLand(fall, wasPound);
    P.coyote = 0.1;
  }
  if (P.pos.y < -20) respawn();

  // facing
  const hs = Math.hypot(v.x, v.z);
  if (hs > 0.5 && P.pound === 0 && !P.long) {
    const tgt = Math.atan2(v.x, v.z);
    let d = tgt - P.facing;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    P.facing += d * damp(14, dt);
  }

  // drone scanning / dropping
  if (dropP && P.ability) { P.ability = null; setAbility(null); toast('Eigenschap losgelaten'); sfx.drop(); save.ability = null; persist(); }
  const near = nearestScannable();
  if (scanP) {
    if (D.state !== 'follow') {}
    else if (!near) toast('Niks om te scannen in de buurt');
    else if (P.ability === near.ability) toast(`${LOOK.droneName || 'Drone'} heeft ${AB[near.ability].label} al`);
    else { D.state = 'go'; D.t = 0; D.scan = near; sfx.scanStart(); }
  }
  ring.visible = !!near && D.state === 'follow' && P.ability !== near.ability && !dialog.active;
  if (ring.visible) {
    const p = near.obj.position;
    ring.position.set(p.x, groundAt(p.x, p.z, 0) + 0.05, p.z);
    ring.scale.setScalar(1.2 + Math.sin(t * 5) * 0.08);
    setPrompt(`<kbd>E</kbd> scan ${near.name}`);
  } else if (!dialog.active && P.grounded && nearMilo(P.pos)) setPrompt(`<kbd>E</kbd> ${npcPrompt()}`);
  else if (!launch.on && P.grounded && nearRocket()) setPrompt(`<kbd>E</kbd> ${TRAVEL.label}` + (TRAVEL.need ? ` <span style="opacity:.8">(${Math.min(rareCount, TRAVEL.need)}/${TRAVEL.need} 🌟)</span>` : ""));
  else setPrompt('');

  return hs;
}

function nearestScannable() {
  let best = null, bd = 9;
  for (const s of scannables) {
    const d = s.obj.position.distanceTo(P.pos);
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}

// ---------- drone ----------
function updateDrone(dt, t) {
  const f = P.facing;
  const fwd = V3(Math.sin(f), 0, Math.cos(f)), right = V3(-Math.cos(f), 0, Math.sin(f));
  const home = P.pos.clone().addScaledVector(right, 0.75).addScaledVector(fwd, -0.45).add(V3(0, 1.9 + Math.sin(t * 3) * 0.08, 0));
  let goal = home, k = 7;
  D.boost -= dt;
  if (D.boost > 0) { goal = P.pos.clone().add(V3(0, -0.2, 0)); k = 30; }

  if (D.state === 'go') {
    goal = D.scan.obj.position.clone().add(D.scan.offset); k = 9;
    D.t += dt;
    if (D.pos.distanceTo(goal) < 0.35 || D.t > 0.9) { D.state = 'scan'; D.t = 0; }
  } else if (D.state === 'scan') {
    goal = D.scan.obj.position.clone().add(D.scan.offset); k = 12;
    D.t += dt;
    const tp = D.scan.obj.position;
    drone.beam.visible = true;
    drone.beam.position.copy(drone.g.position);
    drone.beam.lookAt(tp);
    drone.beam.scale.set(1, 1, drone.g.position.distanceTo(tp));
    drone.beamMat.opacity = 0.25 + Math.sin(t * 30) * 0.12;
    if (D.t > 0.75) {
      drone.beam.visible = false;
      P.ability = D.scan.ability;
      save.ability = P.ability; persist();
      const info = AB[P.ability];
      setAbility(P.ability, info);
      sfx.copy(); toast(`${LOOK.droneName || 'Drone'} kopieerde: ${info.label}!`);
      puff(D.pos.clone(), 10, info.hex, 2.5, 1);
      D.state = 'return';
    }
  } else if (D.state === 'return') {
    k = 9;
    if (D.pos.distanceTo(home) < 0.5) D.state = 'follow';
  }

  const prev = D.pos.clone();
  D.pos.lerp(goal, damp(k, dt));
  drone.g.position.copy(D.pos);
  const vel = D.pos.clone().sub(prev).divideScalar(Math.max(dt, 1e-4));
  const look = D.state === 'scan' || D.state === 'go' ? Math.atan2(goal.x - D.pos.x, goal.z - D.pos.z) : f;
  let dy = look - drone.g.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  drone.g.rotation.y += dy * damp(8, dt);
  drone.tilt.rotation.x = clamp(vel.length() * 0.04, 0, 0.5);
  drone.props.forEach((p, i) => (p.rotation.y += dt * (i ? 40 : -40)));
  drone.eyeMat.color.set(P.ability ? AB[P.ability].hex : 0x5ef2e0);
}

// ---------- animation ----------
const A = { phase: 0 };
function animate(dt, t, hs) {
  const k = damp(18, dt);
  const run = Math.min(hs / Math.max(S.speed, 1), 1);
  A.phase += hs * dt * 1.9;
  const sw = Math.sin(A.phase) * 0.95 * run;
  let L0 = 0, L1 = 0, A0x = 0, A1x = 0, Az = 0.12, lean = 0, bob = 0;
  if (P.pound) { L0 = L1 = -1.3; Az = 2.5; }
  else if (P.long) { L0 = 0.5; L1 = 0.8; A0x = A1x = -2.8; Az = 0.2; lean = 1.15; }
  else if (P.floating && P.ability === 'zweef') { L0 = 0.3; L1 = 0.5; A0x = A1x = 0; Az = 1.5; lean = 0.55; }   // arms out like wings
  else if (P.grounded) {
    L0 = sw; L1 = -sw; A0x = -sw * 0.9; A1x = sw * 0.9; bob = Math.abs(Math.cos(A.phase)) * 0.06 * run;
    lean = run * 0.12;
  } else { L0 = -0.7; L1 = 0.35; A0x = -0.3; A1x = 0.3; Az = P.floating ? 2.7 : 1.7; }
  josh.legs[0].rotation.x += (L0 - josh.legs[0].rotation.x) * k;
  josh.legs[1].rotation.x += (L1 - josh.legs[1].rotation.x) * k;
  josh.arms[0].rotation.x += (A0x - josh.arms[0].rotation.x) * k;
  josh.arms[1].rotation.x += (A1x - josh.arms[1].rotation.x) * k;
  josh.arms[0].rotation.z += (-Az - josh.arms[0].rotation.z) * k;
  josh.arms[1].rotation.z += (Az - josh.arms[1].rotation.z) * k;

  // flips & spins
  if (P.flip > 0) { P.flip = Math.min(P.flip + dt * 2.1, 1); josh.pivot.rotation.x = P.flip * Math.PI * 2 + lean; if (P.flip >= 1) P.flip = 0; }
  else josh.pivot.rotation.x += (lean - josh.pivot.rotation.x) * k;
  josh.pivot.rotation.y = P.pound === 1 ? (1 - P.poundT / 0.2) * Math.PI * 2 : 0;
  josh.pivot.position.y = 0.8 + bob;

  // squash & stretch spring, plus crouch
  sq.v += (-200 * sq.s - 16 * sq.v) * dt;
  sq.s += sq.v * dt;
  const crouch = P.crouch ? 0.72 : 1;
  josh.root.scale.set(1 + sq.s * 0.5, (1 - sq.s) * crouch, 1 + sq.s * 0.5);
  josh.root.position.copy(P.pos);
  josh.root.rotation.y = P.facing;

  const puffUp = P.floating && P.ability === 'ballon' ? 1.3 : 1;
  const tv = josh.torso.scale;
  tv.x += (1.05 * puffUp - tv.x) * k; tv.z += (0.85 * puffUp - tv.z) * k;
  josh.tip.material.color.set(P.ability ? AB[P.ability].hex : 0x5ef2e0);

  // blob shadow on the highest surface below Josh
  let top = -50;
  const tg = groundAt(P.pos.x, P.pos.z, 0);
  if (tg <= P.pos.y + 0.05) top = tg;
  for (const b of boxes) {
    if (P.pos.x > b.min.x && P.pos.x < b.max.x && P.pos.z > b.min.z && P.pos.z < b.max.z && b.max.y <= P.pos.y + 0.05) top = Math.max(top, b.max.y);
  }
  shadow.visible = top > -50;
  shadow.position.set(P.pos.x, top + 0.02, P.pos.z);
  shadow.scale.setScalar(clamp(1 - (P.pos.y - top) * 0.06, 0.4, 1));
}

// ---------- world update ----------
let smokeT = 0;
function updateWorld(dt, t) {
  for (const m of movers) m.b.mesh.position.copy(m.b.pos);
  // flickering lanterns, the blinking telescope light, drifting dust, smoke from the crashed rocket
  for (const l of lamps) {
    if (l.flicker) l.flicker.intensity = l.base * (0.85 + Math.sin(t * 7 + l.seed) * 0.08 + (Math.random() < 0.02 ? -0.4 : 0));
    if (l.blink) { const on = Math.sin(t * 2.5) > 0.2; l.blink.visible = on; l.glow.visible = on; l.light.intensity = on ? 14 : 0; }
  }
  dust.position.set(Math.sin(t * 0.05) * 3, Math.sin(t * 0.13) * 0.6, Math.cos(t * 0.04) * 3);
  dust.rotation.y = t * 0.01;
  smokeT -= dt;
  if (smokeT <= 0) {
    smokeT = 0.35;
    puff(rocket.localToWorld(V3(0, 4.6, 0)), 2, 0x8a8f9e, 0.4, 2.2);
  }
  updateNPCs(dt, t, P.pos);
  const head = P.pos.clone().add(V3(0, 0.8, 0));
  for (const c of cookies) {
    if (c.got) continue;
    c.g.rotation.y += dt * (c.rare ? 2.2 : 4);
    c.g.position.y = c.base + Math.sin(t * 2.5 + c.g.position.x) * (c.rare ? 0.15 : 0.06);
    if (c.anim) c.anim(t);
    if (c.g.position.distanceTo(head) < (c.rare ? 1.3 : 1.0)) {
      c.got = true; scene.remove(c.g);
      if (c.rare) {
        rareCount++; sfx.cosmic();
        puff(c.g.position.clone(), 16, 0xffd166, 4, 2);
        showBanner(rareCount === RARE_TOTAL ? `${c.name} · alle kosmische koekjes van ${document.title.replace(/^De /, "de ")}! 🐶🚀` : c.name);
      } else {
        coinCount++; sfx.coin();
        puff(c.g.position.clone(), 4, 0xffd166, 1.5, 1);
      }
      setCookies(coinCount, rareCount, RARE_TOTAL);
      gotSet.add(c.id); save.coins = coinCount; save.rare = rareCount; persist();
    }
  }
}

const banner = document.getElementById('banner');
let bannerTimer;
function showBanner(name) {
  document.getElementById('bannerName').textContent = name;
  banner.classList.add('show');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => banner.classList.remove('show'), 2200);
}

// Is this point inside the world (terrain columns or a solid box)? Used to keep the camera out of walls.
function camBlocked(x, y, z) {
  if (groundAt(x, z, 0.35) > y - 0.35) return true;
  for (const b of boxes) {
    if (x > b.min.x - 0.2 && x < b.max.x + 0.2 && z > b.min.z - 0.2 && z < b.max.z + 0.2 && y > b.min.y - 0.2 && y < b.max.y + 0.2) return true;
  }
  return false;
}
let camDist = S.cam, lastDrag = -10;
function updateCamera(dt) {
  const goal = P.pos.clone().add(V3(0, 1.3, 0));
  cam.target.x += (goal.x - cam.target.x) * damp(12, dt);
  cam.target.z += (goal.z - cam.target.z) * damp(12, dt);
  cam.target.y += (goal.y - cam.target.y) * damp(P.grounded ? 6 : 2.5, dt);

  // Like Mario: when you run and haven't touched the camera for a bit, it slowly swings behind you.
  const hs = Math.hypot(P.vel.x, P.vel.z);
  if (hs > 2.5 && time - lastDrag > 1.5 && !P.long) {
    const want = Math.atan2(-P.vel.x, -P.vel.z);
    const d = Math.atan2(Math.sin(want - cam.yaw), Math.cos(want - cam.yaw));
    cam.yaw += d * damp(0.9 * Math.min(1, hs / S.speed), dt);
  }

  // pull the camera in front of walls instead of letting it sit inside the mountain
  const dir = V3(Math.sin(cam.yaw) * Math.cos(cam.pitch), Math.sin(cam.pitch), Math.cos(cam.yaw) * Math.cos(cam.pitch));
  let allowed = S.cam;
  for (let s = 0.8; s <= S.cam; s += 0.4) {
    const p = cam.target.clone().addScaledVector(dir, s);
    if (camBlocked(p.x, p.y, p.z)) { allowed = Math.max(1.2, s - 0.6); break; }
  }
  camDist += (allowed - camDist) * damp(allowed < camDist ? 25 : 3, dt);
  camera.position.copy(cam.target).addScaledVector(dir, camDist);
  camera.lookAt(cam.target);
  sun.position.copy(P.pos).add(V3(10, 22, 8));
  sun.target.position.copy(P.pos);
}

// ---------- Otis' raket: to the next planet ----------
const launch = { on: false, t: 0 };
const nearRocket = () => Math.hypot(P.pos.x - TRAVEL.pos.x, P.pos.z - TRAVEL.pos.z) < 3.6;
function startLaunch() {
  launch.on = true; launch.t = 0;
  launch.pos = rocket.position.clone(); launch.rot = rocket.rotation.clone();
  josh.root.visible = false; drone.g.visible = false; sfx.launch();
  persist();
  toast(`Otis start de motor… op naar ${TRAVEL.name}!`);
}
function tryLaunch() {
  if (rareCount < TRAVEL.need) {
    toast(`Otis heeft nog ${TRAVEL.need - rareCount} kosmische koekjes nodig om op te stijgen`);
    return;
  }
  if (story.launch) story.launch(startLaunch); else startLaunch();
}
const fade = document.createElement('div');
fade.className = 'planet-fade';
fade.style.cssText = 'position:fixed;inset:0;background:#fff8ec;opacity:0;pointer-events:none;transition:opacity 1s;z-index:20';
document.body.appendChild(fade);
function updateLaunch(dt) {
  if (!launch.on) return;
  launch.t += dt;
  const k = Math.min(1, launch.t / 1.2);
  rocket.rotation.x *= 1 - k * 0.1; rocket.rotation.z *= 1 - k * 0.1;     // stand upright
  if (launch.t > 1.2) rocket.position.y += dt * (launch.t - 1.2) * 18;
  rocket.position.x += (Math.random() - 0.5) * 0.06;
  if (Math.random() < 0.6) puff(rocket.localToWorld(V3(0, -0.2, 0)), 3, launch.t > 1.2 ? 0xffb45e : 0xc9cdd8, 3, -1);
  shakeT = Math.max(shakeT, 0.12);
  if (launch.t > 2.6) fade.style.opacity = 1;
  // fly to the next planet, once, inside this same page
  if (launch.t > 3.7 && !launch.left) {
    launch.left = true;
    travel(TRAVEL.planet).catch((e) => {
      console.error(e);
      fade.style.opacity = 0; landHere();
      toast('De raket kon niet vertrekken. Probeer het nog eens bij de raket.');
    });
  }
}
// back on this planet (after a trip, or a failed launch): rocket on the ground, Josh next to it
function landHere() {
  launch.on = false; launch.left = false;
  if (launch.pos) { rocket.position.copy(launch.pos); rocket.rotation.copy(launch.rot); }
  ctx.hideJosh = false; drone.g.visible = true;
  P.pos.set(TRAVEL.pos.x - 2.5, groundAt(TRAVEL.pos.x - 2.5, TRAVEL.pos.z + 2.5, 0.4), TRAVEL.pos.z + 2.5);
  P.vel.set(0, 0, 0); P.pound = 0; P.long = false;
  ctx.resetCam();
}
registerPlanet(PLANET, {
  arrivesWithCutscene: !save.intro,
  activate() {
    keys.clear(); pressed.clear(); clock.getDelta();
    landHere();
    if (story.landed) story.landed();
    setCookies(coinCount, rareCount, RARE_TOTAL);
    if (P.ability && AB[P.ability]) setAbility(P.ability, AB[P.ability]); else setAbility(null);
  },
});

// ---------- story: Otis, cutscenes, ambient life ----------
const ctx = {
  P, josh, drone, save, persist, LOOK, hideJosh: false,
  rare: () => rareCount,
  shake: (s) => { shakeT = Math.max(shakeT, s); },
  resetCam() { cam.target.set(P.pos.x, P.pos.y + 1.3, P.pos.z); },
};
const story = setupStory(ctx);

// ---------- saved progress ----------
npcEvents.onChange = () => { save.milo = miloTalked(); save.guide = guideDone(); persist(); };
{
  const hadSave = save.got.length || save.crates.length || save.milo || save.cp;
  restoreNPCs(save, gotSet);
  for (const id of save.crates) { const b = crates.find((c) => c.id === id); if (b && boxes.includes(b)) breakCrate(b, true); }
  if (save.boss) {
    setBossDead();
    if (!gotSet.has(BOSS_INFO.cookie)) addCookie(BOSS_INFO.cookieAt.x, BOSS_INFO.cookieAt.y, BOSS_INFO.cookieAt.z, BOSS_INFO.cookie);
    if (BOSS_INFO.lightBack) lightBack = 0.999;
    if (story.restoreLight) story.restoreLight();
  }
  for (const c of cookies) if (gotSet.has(c.id)) { c.got = true; scene.remove(c.g); }
  coinCount = save.coins; rareCount = save.rare;
  setCookies(coinCount, rareCount, RARE_TOTAL);
  if (save.ability && AB[save.ability]) { P.ability = save.ability; setAbility(P.ability, AB[P.ability]); }
  if (save.cp) {
    checkpoint.fromArray(save.cp); P.pos.copy(checkpoint);
    cam.target.set(checkpoint.x, checkpoint.y + 1.3, checkpoint.z);
  }
  if (hadSave && save.intro) setTimeout(() => toast('Voortgang geladen'), 600);
  story.start();
  resumePlanet();
}
// Delete / Backspace twice to start the whole game over
let wipeArmed = 0;
addEventListener('keydown', (e) => {
  if (e.code !== 'Delete' && e.code !== 'Backspace') return;
  if (activePlanet() !== PLANET) return;
  e.preventDefault();
  if (performance.now() - wipeArmed < 2500) {
    wipe(); wipeArmed = 0;
    toast('Alle voortgang gewist! Het spel begint opnieuw…');
    setTimeout(() => { try { location.reload(); } catch (err) {} }, 900);
    setTimeout(() => toast('Alles gewist. Ververs de pagina (⌘R) om opnieuw te beginnen.'), 2500);
  } else { wipeArmed = performance.now(); toast('Nog een keer om ALLE voortgang te wissen (beide planeten)'); }
});

// ---------- loop ----------
const clock = new THREE.Clock();
let time = 0;
function frame() {
  if (activePlanet() !== PLANET) { requestAnimationFrame(frame); return; }   // paused while you're on another planet
  adoptCookies();
  const dt = Math.min(clock.getDelta(), 1 / 30);
  time += dt;
  const hs = updatePlayer(dt, time);
  updateBoss(dt, time, P, P.prevY, bossApi);
  if (!cs.active) enemies.update(dt, time, P, P.prevY, enemyApi, life.inv > 0);
  updateHP(dt);
  sfx.music(bossActive() ? 'boss' : PLANET);
  // checkpoints: touching a new one also heals you
  if (P.grounded && !bossActive()) {
    const before = checkpoint.toArray().join();
    for (const c of CHECKPOINTS) if (c.test(P.pos, checkpoint)) checkpoint.copy(c.pos);
    if (checkpoint.toArray().join() !== before) { save.cp = checkpoint.toArray(); persist(); life.hp = 3; setHP(); sfx.checkpoint(); }
  }
  updateLightBack(dt);
  updateLaunch(dt);
  story.update(dt, time);
  updateDrone(dt, time);
  updateWorld(dt, time);
  animate(dt, time, hs);
  josh.root.visible = !launch.on && !ctx.hideJosh && (life.inv <= 0 || Math.floor(time * 20) % 2 === 0);
  updateCamera(dt);
  updateCutscene(dt, camera);
  if (shakeT > 0) {
    shakeT -= dt;
    camera.position.add(V3((Math.random() - 0.5) * shakeT * 2, (Math.random() - 0.5) * shakeT * 2, 0));
  }
  updateBubbles(dt, P.pos, camera, cs.active || dialog.active);
  updateParticles(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
frame();
