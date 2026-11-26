// Ridgeline game: climbers, tools, HUD, menus, pause, loading screens, online wiring
import {
  THREE, C, GRID, CX, SIZE, OUT, renderer, scene, buildMaze, exitPos, tileTop, topAt, blockedAt, groundUnder, STEP,
  addMark, aimSurface, spawnStick, settleStick, updateSticks, clearMarksAndSticks, updateWorld,
  audioInit, setVolume, sfx, SANCTUARY_R, maze, sun, rayTargets, stickList,
} from './world.js';
import { COLORS, loadSdk, joinRoom, myId } from './net.js';
import { GRACE, CREEP, fogRadius, fogDepth, updateFog, applyViewFog, buildDoors, updateDoors, leverNear, latchDoor, doorsOpen, doorCount, doorCenter, plateUnder, doorProgress } from './hazard.js';
import { startVoice, stopVoice, syncPeers, onSignal, updateVoice, toggleMute, isMuted, hasMic, micLevel, peerCount } from './voice.js';
import { initPhysics, physicsMode, physRebuild, physStep, physClear, spawnRagdoll, ragdollHead, removeRagdoll } from './physics.js';
import { decorUpdate, zoneFog, ZONE_NAMES } from './decor.js';
import { zoneAt } from './world.js';
import { makeClimber, animateRig, disposeClimber, DEFAULT_LOOK } from './rig.js';
import { openCreator } from './creator.js';
import { initOverlay, updateMarkers, showTip, zoneCard, flashKeys, toggleKeys, tipSeen } from './overlay.js';
import { buildTrail, clearTrail, showTrail, trail, cairnTiles } from './trail.js';
import { buildPuzzles, updatePuzzles, lightBrazier, brazierNear, igniteAt, brazierCount, puzzleHint, nearPuzzle, puzzleSummary } from './puzzles.js';
import { resetTips } from './overlay.js';
import { makeDebug, setDebugMode, debugSample, debugDraw, makeDevMenu, makeDevChip, setDevChip } from './debug.js';
import { STATIONS, stamp, hasStamp, passportDone, resetPassport, showTraining, onSlate, inShed, inPuddle, checkStations, updateTraining } from './training.js';
import { makeViewmodel, disposeViewmodel, vmUse, animateViewmodel, renderViewmodel } from './hands.js';
import { buildSummit, showSummit, SUMMIT, chalkHold, breakHold, updateSummitWorld, campAt, markCamp, zoneAtY, ZONES, inChimney, twinAt, nearCrank, openGate, updateGate } from './summit_world.js';
import { buildHazards, updateHazards, showHazards, flashAt, windAt, COLD } from './summit_hazards.js';
import { climbStep, climbPrompt, updateClimbFx, aimedHold, resetClimber, releaseWall, onKbChalk, onLedge, setHintHold, nextRouteHold } from './climb.js';
import { placePiton, ropeStep, ropePrompt, updateRopes, clearRope, partners, addPiton, pitonByKey, pitonData, jolt, BELAY_HIT } from './rope.js';
import { fx, updateFx } from './fx.js';
import { doorCenter as doorAt, setPace, setGrace, showFog, setRise, showRise, updateRise, applyRiseFog, shadowY, shadowCalm, RISE } from './hazard.js';
import { setGroundVisible, setWind, lightMood, followShadow } from './world.js';
import { renderViews, POST, setPost } from './post.js';
import { showDecor } from './decor.js';
import { enterLobbyWorld, exitLobbyWorld, updateLobby, gondola, startArrival, startDeparture, rideOffset, riding, inGondola, spawnSpot, nearInteract, throwSnowball, setOnBell, setBallHook, setBoard, pinPhoto, photoCam, flashCamera, setGateLight } from './lobby.js';

/* ---------- saved looks (one per local player) ---------- */
let LOOKS = [];
try { LOOKS = JSON.parse(localStorage.getItem('ridgeline_looks') || '[]'); } catch {}
const lookFor = (i, fallbackColor) => ({ ...DEFAULT_LOOK, jacket: fallbackColor, ...(LOOKS[i] || {}) });
const saveLooks = () => { try { localStorage.setItem('ridgeline_looks', JSON.stringify(LOOKS)); } catch {} };
const lobbySettings = { pace: 1, daily: false, route: 'maze', resume: false }; // route: 'maze' or 'summit'; resume: Summit from the saved camp
let bellsRung = 0, departT = -1, uiOpen = null, departArmed = false;
const panelUp = () => !!uiOpen && uiOpen !== 'photo';

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pad = (n) => String(n).padStart(3, '0');
const esc = (s) => String(s).replace(/[<>&"]/g, '');
const newSeed = () => Math.floor(Math.random() * 2 ** 31);
const fmt = (t) => { const m = Math.floor(t / 60), s = t - m * 60; return `${m}:${s < 10 ? '0' : ''}${s.toFixed(1)}`; };

const EYE = 1.62, R = .34, WALK = 5, SPRINT = 8.6, TIRED = 3.6, RIDGE = 2.8, TURN = 2.7;
const CLIMB_V = 1.7, CLIMB_COST = .2; // climb speed (m/s) and stamina per second on a rock step
const GRAV = 18, JUMP_V = 6.2, JUMP_COST = .15, BOOST_V = 12.5;

/* ---------- settings ---------- */
const SET = { sens: 1, fov: 74, bob: 1, vol: .8 };
try { Object.assign(SET, JSON.parse(localStorage.getItem('ridgeline_settings') || '{}')); } catch {}
const saveSet = () => { try { localStorage.setItem('ridgeline_settings', JSON.stringify(SET)); } catch {} };
[['sSens', 'vSens', 'sens', (v) => v.toFixed(2) + '×'], ['sFov', 'vFov', 'fov', (v) => v + '°'], ['sBob', 'vBob', 'bob', (v) => Math.round(v * 100) + '%'], ['sVol', 'vVol', 'vol', (v) => Math.round(v * 100) + '%']]
  .forEach(([inp, out, key, f]) => {
    const el = $(inp); el.value = SET[key]; $(out).textContent = f(SET[key]);
    el.addEventListener('input', () => { SET[key] = +el.value; $(out).textContent = f(SET[key]); saveSet(); if (key === 'vol') setVolume(SET.vol); });
  });
// post effects (bloom, grade, vignette, height mist): on by default, off for slow machines or if you prefer it plain
{ const el = $("sPost"), show = () => { $("vPost").textContent = POST.broken ? "Unavailable" : POST.on ? "On" : "Off"; }; el.value = POST.on ? 1 : 0; show(); el.addEventListener("input", () => { setPost(+el.value === 1); show(); }); }

/* ---------- loading screens ---------- */
const TIPS = [
  'Chalk arrows on the floor point the way you were facing when you drew them.',
  'Crosses on walls mean "been here". Two crosses in a row? Turn around.',
  'Glowsticks bounce. Throw one down a long corridor to see where it ends.',
  'Stand by a wall and let a friend boost you up. From the ridge you can see the beam.',
  'The ridge wind drains stamina. When it runs out, you slip off.',
  'Sprinting and jumping both cost stamina. Run dry and the bar turns red until you rest.',
  'The compass in the corner always points at the sanctuary beam in the centre.',
  'Stone doors need two climbers on two plates. Step off before it is fully up and it slams.',
  'Ember Gates open when every brazier is lit. Look for blue pilot flames in dead ends.', 'Rune Gates show a row of runes. Step on the matching floor tiles in that order.', 'The Shadow wakes after a head start. Inside it you cannot rest, only drain.',
];
const trailPts = [[20, 160], [80, 140], [55, 120], [105, 100], [90, 78], [120, 60], [125, 34]];
function loaderSet(title, step, pct) {
  $('lTitle').textContent = title; $('lStep').textContent = step; $('lBar').style.width = pct + '%';
  const f = clamp(pct / 100, 0, 1) * (trailPts.length - 1), i = Math.min(Math.floor(f), trailPts.length - 2), k = f - i;
  const [x0, y0] = trailPts[i], [x1, y1] = trailPts[i + 1];
  $('ldot').setAttribute('cx', x0 + (x1 - x0) * k); $('ldot').setAttribute('cy', y0 + (y1 - y0) * k);
}
const showLoader = (title) => { document.querySelector('.studio').style.display = 'none'; $('loader').classList.remove('hide'); $('lTip').textContent = 'Tip: ' + TIPS[Math.floor(Math.random() * TIPS.length)]; loaderSet(title, '', 0); };
const hideLoader = () => $('loader').classList.add('hide');
/* screen wipe: chunky coloured bands sweep across, the scene changes underneath, then they sweep away */
const wipeEl = $('wipe');
const cover = () => new Promise((res) => { wipeEl.className = 'reset'; void wipeEl.offsetWidth; wipeEl.className = 'cover'; sfx.whoosh?.(); setTimeout(res, 520); });
const uncover = () => { wipeEl.className = 'uncover'; setTimeout(() => { if (wipeEl.className === 'uncover') wipeEl.className = 'reset'; }, 650); };
async function transition(fn) { await cover(); await fn(); uncover(); }

async function runLoading(title, steps) {
  await cover();
  hideMenu(); showLoader(title);
  uncover();
  try {
    for (let i = 0; i < steps.length; i++) {
      const [label, work] = steps[i];
      loaderSet(title, label + '…', (i / steps.length) * 100); await frame();
      if (typeof work === 'function') await work(); else await sleep(work || 250);
    }
    loaderSet(title, 'Ready', 100); await sleep(240);
    await cover();
  } finally { hideLoader(); }
  uncover();
}

/* ---------- climbers ---------- */
const CTRL = {
  p1: { id: 'p1', ping: ['KeyG'], f: ['KeyW'], b: ['KeyS'], l: ['KeyA'], r: ['KeyD'], run: ['ShiftLeft'], jump: ['Space'], use: ['KeyF'], cycle: ['KeyQ'], boost: ['KeyE'], slots: ['Digit1', 'Digit2', 'Digit3', 'Digit4'], hint: 'WASD · L‑Shift sprint · Space jump · F use · Q switch · E boost / hold to crank', bk: 'E' },
  p2: { id: 'p2', ping: ['Quote'], f: ['ArrowUp'], b: ['ArrowDown'], l: ['ArrowLeft'], r: ['ArrowRight'], run: ['ShiftRight'], jump: ['Enter', 'NumpadEnter'], use: ['Slash'], cycle: ['Period'], boost: ['Comma'], slots: [], hint: 'Arrows · R‑Shift sprint · Enter jump · / use · . switch · , boost / hold to crank', bk: ',' },
  mouse: { id: 'mouse', ping: ['KeyG', 'Mouse1'], f: ['KeyW', 'ArrowUp'], b: ['KeyS', 'ArrowDown'], l: ['ArrowLeft'], r: ['ArrowRight'], sl: ['KeyA'], sr: ['KeyD'], run: ['ShiftLeft', 'ShiftRight'], jump: ['Space'], use: ['Mouse0', 'KeyF'], cycle: ['KeyQ'], boost: ['KeyE'], slots: ['Digit1', 'Digit2', 'Digit3', 'Digit4'], hint: 'Click use · 1 2 3 tools · Space jump · E boost / hold to crank', bk: 'E' },
};
class Climber {
  constructor({ color, name, ctrl, mouse = false, look = {} }) {
    Object.assign(this, { color, name, ctrl, mouse, look, ragId: 'L' + Math.random().toString(36).slice(2, 8), ragdoll: false, sit: null });
    this.mesh = makeClimber(color, name, look); scene.add(this.mesh);
    this.vm = makeViewmodel(color, look); this.push = 0; this.wave = 0; this.shake = 0;
    this.cam = new THREE.PerspectiveCamera(SET.fov, 1, .05, 900); this.cam.rotation.order = 'YXZ';
    Object.assign(this, { x: 0, y: 0, z: 0, vy: 0, ex: 0, ez: 0, yaw: 0, pitch: 0, roll: 0, stamina: 1, exhausted: false, ground: true, phase: 0,
      stumble: 0, land: 0, done: false, sprinting: false, slot: 0, sticks: 3, markCd: 0, boostCd: 0, toastT: 0, vxLast: 0, vzLast: 0, wantJump: false,
      st: 0, crank: -1, inFog: false, collapseT: 0, fogK: 0 });
  }
  setLook(look) {
    this.look = look; this.color = look.jacket || this.color;
    scene.remove(this.mesh); disposeClimber(this.mesh); this.mesh = makeClimber(this.color, this.name, look); scene.add(this.mesh);
    disposeViewmodel(this.vm); this.vm = makeViewmodel(this.color, look);
    if (this.hud) { this.hud.root.style.setProperty('--pc', this.color); this.hud.root.querySelector('.pname .dot').style.background = this.color; }
  }
  dispose() { scene.remove(this.mesh); disposeViewmodel(this.vm); }
}

/* ---------- state ---------- */
let mode = null, state = 'boot', paused = false, players = [], remotes = {}, net = null, sdkReady = false;
let summitCamp = 0; // highest Summit camp the team has reached (0 = trailhead)
let countdown = 0, raceTime = 0, lastCount = -1, seed = 1, sendTimer = 0, lastSent = { x: 0, z: 0, y: 0, yaw: 0, t: 0 };
const inGame = () => ['countdown', 'racing', 'finished', 'lobby', 'departing', 'summit'].includes(state);
const inLobby = () => state === 'lobby' || state === 'departing';
const toolCount = () => state === 'summit' ? 4 : 3; // slot 4 (pitons) only exists on the mountain
const isPointerMode = () => mode === 'solo' || mode === 'online';

/* ---------- input ---------- */
const keys = new Set(), taps = new Set();
const held = (l) => !!l && l.some((k) => keys.has(k));
const tapped = (l) => !!l && l.some((k) => taps.has(k));
const locked = () => document.pointerLockElement === renderer.domElement;
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (uiOpen && uiOpen !== 'photo') { if (e.code === 'Escape') closePanel(); return; }
  if (!e.repeat) taps.add(e.code); keys.add(e.code);
  if (inGame() && /^(Arrow|Space|Slash|Quote|Enter|Period|Comma)/.test(e.code)) e.preventDefault();
  if (e.code === 'Escape' && inGame()) { if (paused) setPause(false); else if (!isPointerMode() || !locked()) setPause(true); }
  if (e.code === 'KeyP' && inGame()) setPause(!paused);
  if (e.code === 'KeyM' && mode === 'online' && inGame() && players[0]) { if (!hasMic()) toast(players[0], 'No microphone available'); else toast(players[0], toggleMute() ? 'Mic muted' : 'Mic live'); }
  if (e.code === 'KeyH' && inGame()) players.forEach((p) => p.ov && toggleKeys(p.ov));
  if (e.code === 'F1' && inGame()) { e.preventDefault(); $('huds').classList.toggle('nohud'); }
  if (e.code === 'KeyR' && state === 'finished' && mode !== 'online' && !paused) newMaze();
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('mouseup', (e) => keys.delete('Mouse' + e.button));
addEventListener('contextmenu', (e) => { if (locked() || inGame()) e.preventDefault(); }); // right click grabs in Summit
addEventListener('blur', () => keys.clear());
addEventListener('mousedown', (e) => { if (!locked()) return; if (e.button === 0) { taps.add('Mouse0'); keys.add('Mouse0'); } if (e.button === 1) { e.preventDefault(); taps.add('Mouse1'); } if (e.button === 2) { e.preventDefault(); taps.add('Mouse2'); keys.add('Mouse2'); } });
addEventListener('wheel', (e) => { if (locked() && players[0]) { const n = toolCount(); players[0].slot = (players[0].slot + (e.deltaY > 0 ? 1 : n - 1)) % n; } }, { passive: true });
addEventListener('mousemove', (e) => {
  if (!locked() || !players[0] || paused) return;
  const p = players[0];
  if (p.spec) { p.specYaw = (p.specYaw || 0) - e.movementX * .0024 * SET.sens; p.specPitch = clamp((p.specPitch || 0) - e.movementY * .0022 * SET.sens, -.5, .9); return; }
  p.yaw -= e.movementX * .0024 * SET.sens; p.pitch = clamp(p.pitch - e.movementY * .0022 * SET.sens, -1.25, 1.25);
});
function lockPointer() { try { const r = renderer.domElement.requestPointerLock(); if (r && r.catch) r.catch(() => updateLock()); } catch { updateLock(); } }
function updateLock() {
  const show = isPointerMode() && inGame() && state !== 'finished' && !paused && !uiOpen && !locked();
  $('lock').style.display = show ? 'flex' : 'none';
}
document.addEventListener('pointerlockchange', () => {
  if (!locked() && isPointerMode() && !paused && !uiOpen && (state === 'racing' || state === 'countdown' || state === 'lobby' || state === 'summit')) setPause(true);
  updateLock();
});
$('lock').addEventListener('click', () => { audioInit(SET.vol); lockPointer(); });

/* ---------- HUD ---------- */
const ICON = {
  map: '<svg width="30" height="30" viewBox="0 0 30 30"><path d="M3 7l7-3 10 3 7-3v19l-7 3-10-3-7 3z" fill="#efe0bd" stroke="#1b2738" stroke-width="2.4" stroke-linejoin="round"/><path d="M10 4v19M20 7v19" stroke="#1b2738" stroke-width="1.6" opacity=".5"/><path d="M6 18q4-6 8-3t9-6" fill="none" stroke="var(--pc)" stroke-width="2.2" stroke-dasharray="2.5 2.5" stroke-linecap="round"/><circle cx="23" cy="9" r="2.6" fill="#e5383b" stroke="#1b2738" stroke-width="1.4"/></svg>',
  chalk: '<svg width="30" height="30" viewBox="0 0 30 30"><path d="M4 25q4-3 8 0t8 0" fill="none" stroke="var(--pc)" stroke-width="3" stroke-linecap="round"/><rect x="11" y="2" width="8" height="20" rx="3" transform="rotate(35 15 12)" fill="#fff" stroke="#1b2738" stroke-width="2.5"/></svg>',
  stick: '<svg width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="12" fill="var(--pc)" opacity=".28"/><rect x="11" y="3" width="8" height="24" rx="4" transform="rotate(-30 15 15)" fill="var(--pc)" stroke="#1b2738" stroke-width="2.5"/></svg>',
  hand: '<svg width="30" height="30" viewBox="0 0 30 30"><path d="M9 16V8a2 2 0 0 1 4 0v6V5a2 2 0 0 1 4 0v9V7a2 2 0 0 1 4 0v10c0 6-3 10-8 10-4 0-6-2-8-6l-3-5a2 2 0 0 1 3-2l2 2" fill="#fff" stroke="#1b2738" stroke-width="2.2" stroke-linejoin="round"/></svg>',
  piton: '<svg width="30" height="30" viewBox="0 0 30 30"><path d="M6 24 22 8" stroke="#c9ced6" stroke-width="4.5" stroke-linecap="round"/><path d="M6 24 22 8" stroke="#1b2738" stroke-width="1.4" stroke-linecap="round" opacity=".5"/><circle cx="21" cy="20" r="5" fill="none" stroke="var(--pc)" stroke-width="3"/><rect x="17" y="3" width="10" height="6" rx="2" transform="rotate(45 22 6)" fill="#ff7a2a" stroke="#1b2738" stroke-width="2"/></svg>',
};
function buildHuds() {
  const wrap = $('huds'); wrap.innerHTML = '';
  players.forEach((p) => {
    const h = document.createElement('div'); h.className = 'hud'; h.style.setProperty('--pc', p.color);
    h.innerHTML = `<div class="vig"></div><div class="fogvig"></div><div class="cross"></div>
      <div class="mic"${mode === 'online' ? '' : ' style="display:none"'}><svg width="16" height="22" viewBox="0 0 16 22"><rect x="4" y="1" width="8" height="13" rx="4" fill="#fff" stroke="#1b2738" stroke-width="2"/><path d="M1.5 10a6.5 6.5 0 0 0 13 0M8 17v4" fill="none" stroke="#1b2738" stroke-width="2"/></svg><span class="lvl"><i></i></span><b>M</b></div>
      <div class="comp"><div class="dial"><div class="needle"><svg width="28" height="60" viewBox="0 0 28 60"><path d="M14 2 L25 30 L14 24 L3 30 Z" fill="#ff5a1f" stroke="#1b2738" stroke-width="2.5" stroke-linejoin="round"/><circle cx="14" cy="30" r="4" fill="#1b2738"/></svg></div></div><div class="dist">— m</div></div>
      <div class="prompt"></div><div class="toast"></div>
      <div class="bottom">
        <div class="pname"><span class="dot" style="background:${esc(p.color)}"></span>${esc(p.name)}</div>
        <div class="stamrow"><svg class="stico" viewBox="0 0 20 20"><path d="M11 1 4 11h5l-1 8 7-10h-5z" fill="#ffd23f" stroke="#1b2738" stroke-width="1.8" stroke-linejoin="round"/></svg><div class="stamina"><u></u><i></i><s></s></div></div>
        <div class="hotbar">
          <div class="slot" data-i="0"><span class="n">1</span>${ICON.chalk}<span class="lbl">Chalk</span></div>
          <div class="slot" data-i="1"><span class="n">2</span>${ICON.stick}<span class="c">3</span><span class="lbl">Glowstick</span></div>
          <div class="slot" data-i="2"><span class="n">3</span>${ICON.hand}<span class="lbl">Hands</span></div>
          <div class="slot pit" data-i="3"><span class="n">4</span>${ICON.piton}<span class="c">0</span><span class="lbl">Pitons</span></div>
        </div>
        <div class="keys">${p.ctrl.hint}</div>
      </div><div class="done">SUMMIT!</div>`;
    wrap.appendChild(h);
    p.hud = { root: h, vig: h.querySelector('.vig'), fogvig: h.querySelector('.fogvig'), mic: h.querySelector('.mic'), micLvl: h.querySelector('.mic .lvl i'), needle: h.querySelector('.needle'), dist: h.querySelector('.dist'), prompt: h.querySelector('.prompt'), toast: h.querySelector('.toast'),
      stam: h.querySelector('.stamina'), stamI: h.querySelector('.stamina i'), ghost: h.querySelector('.stamina u'), cross: h.querySelector('.cross'), slots: [...h.querySelectorAll('.slot')], count: h.querySelector('.slot .c'), slotLbl: h.querySelector('.slot[data-i="1"] .lbl'), pitC: h.querySelector('.slot.pit .c'), done: h.querySelector('.done') };
    p.ov = initOverlay(h, p.ctrl); flashKeys(p.ov, 20);
  });
}
function toast(p, msg) { if (!p.hud) return; p.hud.toast.textContent = msg; p.hud.toast.classList.add('on'); p.toastT = 1.6; }
function updateHud(p, dt) {
  const H = p.hud; if (!H) return;
  H.stamI.style.width = (p.stamina * 100).toFixed(1) + '%';
  // the white ghost bar lingers behind recent stamina loss, so you can see what that jump cost you
  p.ghostS = p.ghostS === undefined ? p.stamina : p.stamina > p.ghostS ? p.stamina : p.ghostS - Math.max(0, p.ghostS - p.stamina) * Math.min(1, dt * 1.6);
  H.ghost.style.width = (p.ghostS * 100).toFixed(1) + '%';
  H.stam.classList.toggle('low', !p.exhausted && p.stamina < .25);
  H.stam.classList.toggle('out', p.exhausted);
  H.vig.style.opacity = p.exhausted ? .85 : p.stamina < .25 ? .4 : 0;
  H.fogvig.style.opacity = p.st === 0 ? Math.min(1, p.fogK * 1.1) : 0;
  H.root.classList.toggle('infog', p.inFog && p.st === 0);
  if (mode === 'online') {
    H.mic.classList.toggle('muted', isMuted() || !hasMic());
    H.micLvl.style.width = (micLevel() * 100).toFixed(0) + '%';
  }
  H.slots.forEach((s, i) => s.classList.toggle('on', i === p.slot));
  { const kh = state === 'summit' ? summitKeys(p) : p.ctrl.hint; if (H.kh !== kh) { H.kh = kh; H.root.querySelector('.keys').textContent = kh; } } // key line follows the mode
  const lob = inLobby();
  if (H.lobby !== lob) { H.lobby = lob; H.slotLbl.textContent = 'Glowstick'; }
  H.count.textContent = lob ? '∞' : p.sticks; H.slots[1].classList.toggle('empty', !lob && p.sticks <= 0);
  const sum = state === 'summit'; H.root.classList.toggle('summit', sum);
  if (sum) { H.pitC.textContent = p.pitons ?? 0; H.slots[3].classList.toggle('empty', !(p.pitons > 0)); }
  // on the mountain the compass points at the next camp the team hasn't reached yet, then the top
  const nextCamp = sum ? SUMMIT.camps.find((c) => c.id > summitCamp) : null;
  const e = sum ? (nextCamp ? { x: nextCamp.x, z: nextCamp.z } : { x: (SUMMIT.faces[0]?.x0 + SUMMIT.faces[0]?.x1) / 2 || p.x, z: SUMMIT.topZ || p.z }) : exitPos(), dx = e.x - p.x, dz = e.z - p.z;
  H.needle.style.transform = `rotate(${-(Math.atan2(-dx, -dz) - p.yaw)}rad)`;
  H.dist.textContent = sum ? (nextCamp ? `${Math.max(0, Math.round(nextCamp.y - p.y))} m up to ${nextCamp.name}` : `${Math.max(0, Math.round(SUMMIT.topY - p.y))} m to the top`) : p.st === 1 ? 'Safe in the sanctuary' : `${Math.round(Math.hypot(dx, dz))} m to sanctuary`;
  let msg = '';
  if (state === 'lobby' && !riding()) {
    const s = p.sit ? null : nearInteract(p.x, p.z, p.yaw);
    if (p.sit) msg = 'Taking a breather · move to stand up';
    else if (s) msg = `${p.ctrl.bk} · ${s.text}`;
    else if (inGondola(p.x, p.z)) msg = !departArmed ? 'Step through Gate 1 into the hall · board again together to climb' : departT >= 0 ? `Departing in ${Math.ceil(departT)}…` : 'Waiting for the rest of the team to board';
  }
  if ((state === 'racing' || state === 'lobby') && p.st === 0 && !riding()) {
    const lv = leverNear(p.x, p.z), plate = plateUnder(p.x, p.z), tg = findTarget(p);
    if (p.crank >= 0) msg = `Cranking… ${Math.round(doorProgress(p.crank) * 100)}% · don't let go`;
    else if (lv >= 0) msg = `Hold ${p.ctrl.bk} · crank the stone door`;
    else if (tg) msg = `${p.ctrl.bk} · ${wallBeside(tg.o) ? 'Boost' : 'Shove'} ${tg.o.name}${wallBeside(tg.o) ? ' up' : ''}`;
    else if (plate) msg = plate.progress > 0 ? `Door rising ${Math.round(plate.progress * 100)}% · hold still!` : 'Pressure plate · needs a partner on the other plate';
    else if (state === 'racing') {
      const bz = brazierNear(p.x, p.z);
      if (bz >= 0) { const c = brazierCount(bz); msg = `${p.ctrl.id === 'p2' ? '/' : p.ctrl.id === 'p1' ? 'F' : 'F / click'} · light the brazier (${c.lit}/${c.total})`; }
      else msg = puzzleHint(p.x, p.z);
    }
  }
  if ((state === 'racing' || state === 'lobby') && p.st === 0 && !p.sit) {
    const jumpKey = p.ctrl.id === 'p2' ? 'Enter' : 'Space';
    if (p.climbing) msg = `Climbing… keep holding ${jumpKey}`;
    else if (!msg) { const f = climbFace(p); if (f) msg = `${jumpKey} · jump and hold to climb (${(f.top - p.y).toFixed(1)} m)`; }
  }
  if (state === 'summit' && p.st === 0 && !msg) msg = ropePrompt(p, summitTeam) || climbPrompt(p);
  if (state === 'summit' && p.st === 0 && SUMMIT.gate && !SUMMIT.gate.open) {
    const pc = Math.round(SUMMIT.gate.prog * 100);
    if (p.gateCrank) msg = `Winding the temple gate… ${pc}% · keep holding ${p.ctrl.bk}`;
    else if (p.ground && nearCrank(p.x, p.y, p.z)) msg = `Hold ${p.ctrl.bk} · wind the temple gate (${pc}%)`;
    else if (p.wall && twinAt(p.x, p.y, p.wall.face) >= 0) msg = 'On a rune ledge · a partner must stand on the other one';
  }
  if (state === 'summit' && p.st !== 2 && nearTripod(p)) msg = `${p.ctrl.bk} · Take the summit photo`;
  else if (state === 'summit' && p.st === 0 && p.ground && !p.belay) { const tg = findTarget(p); if (tg && wallBeside(tg.o)) msg = `${p.ctrl.bk} · Boost ${tg.o.name} up to the high holds`; } // the human ladder
  if (state === 'summit' && p.st === 2 && !p.spec) msg = everyone().some((q) => q.st === 0) ? 'Knocked out · a teammate standing at a camp brings you back' : 'Knocked out · back to camp in a moment';
  H.prompt.style.display = msg ? 'block' : 'none'; if (msg) H.prompt.textContent = msg;
  H.cross.classList.toggle('act', !!msg && msg.includes(' · '));
  if (p.toastT > 0) { p.toastT -= dt; if (p.toastT <= 0) H.toast.classList.remove('on'); }
}

/* ---------- tools & co-op ---------- */
function others(p) { return players.filter((q) => q !== p).concat(Object.values(remotes)); }
function findTarget(p) {
  const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw); let best = null;
  for (const o of others(p)) {
    const dx = o.x - p.x, dz = o.z - p.z, d = Math.hypot(dx, dz);
    if (d > 2.6 || d < .01 || Math.abs(o.y - p.y) > 1.6 || (dx * fx + dz * fz) / d < .8) continue;
    if (!best || d < best.d) best = { o, d, dx, dz };
  }
  return best;
}
function wallBeside(o) {
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const t = topAt(o.x + dx * 1.3, o.z + dz * 1.3); if ((t < OUT || (maze?.summit && t < 300)) && t > o.y + 1.2) return [dx, dz]; }
  return null;
}
function doBoost(p, tg) {
  if (p.boostCd > 0) return;
  if (p.exhausted || p.stamina < .12) { toast(p, 'Too tired to lift anyone'); return; }
  p.boostCd = .8; p.stamina -= .2;
  const o = tg.o, w = wallBeside(o);
  const ev = w ? { type: 'boost', dx: w[0] * 2.4, dz: w[1] * 2.4, from: p.name } : { type: 'push', dx: tg.dx / tg.d * 5.5, dz: tg.dz / tg.d * 5.5, from: p.name };
  sfx.whoosh(); toast(p, w ? `Boosted ${o.name}!` : `Shoved ${o.name}!`);
  p.push = .5; vmUse(p.vm, 'push'); fx.dust(o.x, o.y, o.z, 8, .7);
  if (o.remote) net?.sendEvent(o.id, ev); else applyHit(o, ev);
}
function applyHit(p, ev) {
  if (!p || p.done || !ev) return;
  p.ex = +ev.dx || 0; p.ez = +ev.dz || 0; p.ground = false; p.shake = Math.max(p.shake, .45);
  if (ev.type === 'boost') { p.vy = Math.max(p.vy, BOOST_V); toast(p, `${ev.from} boosted you up!`); sfx.whoosh(); }
  else { p.vy = Math.max(p.vy, 3.2); p.stumble = 1.3; toast(p, `${ev.from} shoved you!`); sfx.oof(); }
}
function useTool(p) {
  if (p.slot === 0) {
    if (state === 'summit') { const h = aimedHold(p); if (h && h.type === 'chalk' && !h.chalked) { chalkHold(h); if (mode === 'online') net?.chalkHold(h.id); sfx.chalk(); vmUse(p.vm, 'chalk'); fx.chalk(h.x, h.y, h.z - .1, 0, 0, -1, '#ffffff'); toast(p, 'Chalked · now you can grip it'); return; } }
    if (p.markCd > 0) return;
    const d = aimSurface(p.cam, p.yaw, p.color);
    if (!d) { toast(p, 'Nothing close enough to chalk'); return; }
    p.markCd = .22; sfx.chalk(); vmUse(p.vm, 'chalk'); fx.chalk(d.x, d.y, d.z, d.nx, d.ny, d.nz, p.color);
    if (net && mode === 'online') { const k = net.newMarkKey(); addMark(d, k); net.putMark(k, d); } else addMark(d);
    if (inLobby() && onSlate(d)) passportStamp(p, 'chalk');
  } else if (p.slot === 1) {
    if (inLobby()) {
      if (p.markCd > 0) return;
      p.markCd = .35; vmUse(p.vm, 'throw'); sfx.whoosh();
      const dir = p.cam.getWorldDirection(new THREE.Vector3()), o = p.cam.position;
      const sb = { type: 'snow', c: p.color, x: +(o.x + dir.x * .5).toFixed(2), y: +(o.y - .1).toFixed(2), z: +(o.z + dir.z * .5).toFixed(2), vx: +(dir.x * 17 + p.vxLast).toFixed(2), vy: +(dir.y * 17 + 3).toFixed(2), vz: +(dir.z * 17 + p.vzLast).toFixed(2) };
      throwSnowball(sb.x, sb.y, sb.z, sb.vx, sb.vy, sb.vz, p.color);
      if (mode === 'online' && net) for (const id of Object.keys(remotes)) net.sendEvent(id, sb);
      return;
    }
    if (p.sticks <= 0) { toast(p, 'Out of glowsticks'); return; }
    p.sticks--;
    const dir = p.cam.getWorldDirection(new THREE.Vector3()), o = p.cam.position;
    let sx = o.x + dir.x * .4, sz = o.z + dir.z * .4;
    if (topAt(sx, sz) > o.y) { sx = p.x; sz = p.z; }
    const d = { x: +sx.toFixed(3), y: +(o.y - .15).toFixed(3), z: +sz.toFixed(3), vx: +(dir.x * 9 + p.vxLast).toFixed(3), vy: +(dir.y * 9 + 2.2).toFixed(3), vz: +(dir.z * 9 + p.vzLast).toFixed(3), c: p.color, t: Date.now(), rest: false };
    sfx.crack(); vmUse(p.vm, 'throw'); toast(p, `${p.sticks} glowstick${p.sticks === 1 ? '' : 's'} left`);
    if (net && mode === 'online') { d.owner = myId; const k = net.newStickKey(); spawnStick(d, k, (s) => net?.restStick(k, s)); net.putStick(k, d); }
    else spawnStick(d);
  } else if (p.slot === 3) { // piton (Summit only)
    if (state !== 'summit') return;
    if (!p.wall) { toast(p, 'Get on the wall first · pitons go into the rock'); return; }
    if (p.markCd > 0) return;
    if (p.pitons <= 0) { toast(p, 'Out of pitons · every camp has a fresh bundle'); sfx.oof?.(); return; }
    const r = placePiton(p, mode === 'online' && net ? net.newPitonKey() : undefined); p.markCd = .4; vmUse(p.vm, 'chalk');
    if (r && r.fresh && mode === 'online' && net) net.putPiton(r.pit.key, pitonData(r.pit));
    if (r && r.fresh) { p.pitons--; p.pitonsUsed = (p.pitonsUsed || 0) + 1; toast(p, `Piton in · you're clipped (${p.pitons} left)`); }
    else toast(p, 'Clipped into the piton here');
    if (p.ov) showTip(p.ov, 'piton', 'Pitons catch your falls', 'You are clipped into the last piton you placed or climbed past. Fall, and it catches you about a metre and a half below it. Grab a hold to climb on.', 'stam');
  } else {
    const tg = findTarget(p); if (tg) doBoost(p, tg); else if (state !== 'summit') toast(p, 'Nobody close enough to boost');
  }
}

/* ---------- climber physics ---------- */
function stepClimber(p, dt, time) {
  const c = p.ctrl, ride = inLobby() && (riding() || gondola.phase === 'gone');
  const live = (state === 'racing' || state === 'summit' || (state === 'lobby' && !ride)) && p.st !== 2 && !paused && !panelUp() && !p.spec;
  const on = (l) => live && held(l);
  const fwd = (on(c.f) ? 1 : 0) - (on(c.b) ? 1 : 0), side = p.mouse ? (on(c.sr) ? 1 : 0) - (on(c.sl) ? 1 : 0) : 0;
  if (!paused && !panelUp() && p.st !== 2) p.yaw += ((held(c.l) ? 1 : 0) - (held(c.r) ? 1 : 0)) * TURN * dt;
  // riding the gondola: carried along the cable, no walking
  if (ride) {
    const ro = rideOffset(); p.x = p.rideX + ro.x; p.z = p.rideZ; p.y = ro.y; p.vy = 0; p.ground = true;
    poseClimber(p, dt, time, 0); return;
  }
  // sitting on a bench: stay put, recover fast, any movement stands you up
  if (p.sit) {
    if (fwd || side || tapped(c.jump) || !inLobby()) { p.sit = null; sfx.step(false); }
    else { p.x = p.sit.x; p.z = p.sit.z; p.y = 0; p.stamina = Math.min(1, p.stamina + .5 * dt); if (p.stamina > .4) p.exhausted = false; poseClimber(p, dt, time, 0); return; }
  }
  if (state === 'summit') { // on the cliff: hands grab holds (climb.js), otherwise walk as normal
    // belay: hold E (boost) while a roped teammate is below you, standing or on the wall with both hands
    p.belay = live && p.st === 0 && !p.hang && held(c.boost) && !nearCrank(p.x, p.y, p.z) && (p.ground || (p.wall && p.wall.hands.every(Boolean))) && partners(summitTeam, p).some((q) => q.st === 0 && q.y < p.y - 1);
    const side = (held(c.r) || held(c.sr) ? 1 : 0) - (held(c.l) || held(c.sl) ? 1 : 0);
    const onWall = climbStep(p, dt, { live, tapL: taps.has('Mouse0'), tapR: taps.has('Mouse2'), holdL: keys.has('Mouse0'), holdR: keys.has('Mouse2'), fwd: live && held(c.f), back: live && held(c.b), side: live ? side : 0, jump: live && tapped(c.jump), jumpKeys: c.jump }, { toast, consume: (k) => taps.delete(k), onBreak: (h) => { if (mode === 'online') net?.breakHold(h.id); } });
    if (onWall) { p.gateCrank = false; p.crank = -1; // hands on the rock: not on the gate crank
      if (live) { // tools still work on the wall: chalk a slick hold, hammer in a piton
        c.slots.forEach((k, i) => { if (taps.has(k)) p.slot = i; });
        if (tapped(c.cycle)) p.slot = (p.slot + 1) % toolCount();
        if (tapped(c.use)) useTool(p);
        if (tapped(c.ping)) doPing(p);
      }
      p.inFog = p.st === 0 && !DEV.sleep && p.y + 1.2 < summitSY; if (p.inFog) p.stamina -= .12 * dt;
      p.stamina -= (1 - COLD[zoneAtY(p.y)]) * .025 * dt; // cold fingers higher up // the Shadow drains you on the wall too (climb.js drops you at 0)
      p.markCd -= dt; p.airTop = p.y; poseClimber(p, dt, time, 0); return;
    }
  }
  if (DEV.fly && devAllowed() && p.st !== 2) { flyClimber(p, dt, time, live, fwd, side); return; }
  const lever = live && p.st === 0 && (state === 'racing' || state === 'lobby') ? leverNear(p.x, p.z) : -1;
  if (live) {
    c.slots.forEach((k, i) => { if (taps.has(k) && i < toolCount()) p.slot = i; });
    if (tapped(c.cycle)) p.slot = (p.slot + 1) % toolCount();
    if (tapped(c.use)) { const bz = state === 'racing' ? brazierNear(p.x, p.z) : -1; if (bz >= 0) lightLocal(bz, p); else useTool(p); }
    if (tapped(c.boost) && lever < 0) {
      const spot = state === 'lobby' ? nearInteract(p.x, p.z, p.yaw) : null;
      if (spot) interact(p, spot); else if (state === 'summit' && nearTripod(p)) takePhoto({ summit: true }); else { const tg = findTarget(p); if (tg) doBoost(p, tg); }
    }
    if (tapped(c.jump)) p.wantJump = true;
    if (tapped(c.ping)) doPing(p);
  }
  // hold the boost key at a lever to crank its door (heavy work: drains stamina, let go and it slams)
  const wasCranking = p.crank >= 0;
  p.crank = lever >= 0 && held(c.boost) && !p.exhausted && p.ground ? lever : -1;
  if (p.crank >= 0) p.stamina -= .1 * dt;
  // the temple gate crank on the mountain: same pose and stamina cost, shared with the room through crank = GATE_CRANK
  p.gateCrank = state === 'summit' && live && p.st === 0 && p.ground && held(c.boost) && !p.exhausted && nearCrank(p.x, p.y, p.z);
  if (p.gateCrank) { p.crank = GATE_CRANK; p.stamina -= .05 * dt; }
  if (wasCranking && p.crank < 0 && p.exhausted) toast(p, 'Too tired, you let go of the crank!');
  p.markCd -= dt; p.boostCd -= dt; p.stumble = Math.max(0, p.stumble - dt); p.land = Math.max(0, p.land - dt * 3);

  const onRidge = p.ground && p.y > 6 && state !== 'summit'; // only real wall-tops count as ridges (Summit terraces are ledges)
  p.sprinting = live && held(c.run) && fwd > 0 && !p.exhausted && p.ground && !onRidge && p.stamina > 0;
  let spd = p.sprinting ? SPRINT : WALK;
  if (p.exhausted) spd = TIRED; if (onRidge) spd = RIDGE; if (p.stumble > 0) spd *= .5;
  if (p.belay && state === 'summit') spd = 0; // belaying: plant your feet
  const sy = Math.sin(p.yaw), cy = Math.cos(p.yaw);
  let vx = -sy * fwd + cy * side, vz = -cy * fwd - sy * side;
  const len = Math.hypot(vx, vz); if (len > 1) { vx /= len; vz /= len; }
  const air = p.ground ? 1 : .75; vx *= spd * air; vz *= spd * air;
  const decay = Math.exp(-dt * (p.ground ? 4 : .6)); p.ex *= decay; p.ez *= decay;
  const ox = p.x, oz = p.z;
  const nx = p.x + (vx + p.ex) * dt; if (!blockedAt(nx, p.z, p.y, R)) p.x = nx; else p.ex = 0;
  const nz = p.z + (vz + p.ez) * dt; if (!blockedAt(p.x, nz, p.y, R)) p.z = nz; else p.ez = 0;
  p.vxLast = (p.x - ox) / Math.max(dt, 1e-4); p.vzLast = (p.z - oz) / Math.max(dt, 1e-4);
  const sp = Math.hypot(p.vxLast, p.vzLast);

  // climbing: jump at a rock step and keep holding jump to climb it (drains stamina); reach the lip to haul yourself over
  const face = live && p.st === 0 ? climbFace(p) : null;
  if (p.climbing && (!face || !held(c.jump) || p.stamina <= 0)) {
    p.climbing = false;
    if (p.stamina <= 0) { toast(p, 'Lost your grip!'); sfx.oof(); p.vy = -1; p.stumble = .6; }
  } else if (!p.climbing && face && held(c.jump) && !p.ground && p.vy < 4 && !p.exhausted && p.stamina > .06) {
    p.climbing = true; p.climbDir = { dx: face.dx, dz: face.dz }; p.wantJump = false; fx.chalk(p.x + face.dx * R, p.y + 1.2, p.z + face.dz * R, -face.dx, 0, -face.dz, '#ffffff');
  }
  if (p.climbing) {
    p.wantJump = false; p.vy = 0; p.ground = false;
    p.y += CLIMB_V * dt; p.stamina -= CLIMB_COST * dt; p.climbPh = (p.climbPh || 0) + dt * 6.5;
    if (Math.floor(p.climbPh / Math.PI) !== Math.floor((p.climbPh - dt * 6.5) / Math.PI)) sfx.step(false);
    if (p.y >= face.top - .3) { // mantle over the lip
      p.y = face.top; p.x += face.dx * .7; p.z += face.dz * .7; p.climbing = false; p.ground = true; p.land = .35;
      sfx.land(); fx.dust(p.x, p.y, p.z, 8, .6); p.vy = 0;
    }
  }
  if (p.wantJump) {
    p.wantJump = false;
    if (p.ground && !p.exhausted && p.stamina >= JUMP_COST) { p.vy = JUMP_V; p.stamina -= JUMP_COST; p.ground = false; sfx.jump(); fx.dust(p.x, p.y, p.z, 6, .6); }
    else if (p.ground) toast(p, 'Too tired to jump');
  }
  if (!p.climbing) { p.vy -= GRAV * dt; p.y += p.vy * dt; }
  const g = groundUnder(p.x, p.z, p.y, R);
  if (!p.ground) p.airTop = Math.max(p.airTop ?? p.y, p.y);
  if (!p.climbing && p.y <= g && !p.ground && state === 'summit') { // a long fall hurts: stamina and a stumble, more the further you dropped
    const drop = (p.airTop ?? p.y) - g;
    if (drop > 3.5) { p.stamina = Math.max(0, p.stamina - Math.min(.7, (drop - 3.5) * .05)); p.stumble = Math.min(2.5, .4 + drop * .08); p.shake = Math.max(p.shake, Math.min(1, drop / 14)); toast(p, drop > 9 ? `Ouch! A ${Math.round(drop)} m fall` : 'Oof, that was a drop'); sfx.oof?.(); p.falls = (p.falls || 0) + 1; }
    if (drop > 13 && p.st === 0) knockOut(p, drop);
  }
  if (!p.climbing && p.y <= g) { if (!p.ground && p.vy < -8) { sfx.land(); p.land = Math.min(1, -p.vy / 16); fx.dust(p.x, g, p.z, 10 + Math.round(p.land * 10), .6 + p.land); p.shake = Math.max(p.shake, p.land * .5); } p.y = g; p.vy = 0; p.ground = true; }
  else p.ground = false;
  if (p.ground) p.airTop = p.y;

  // the Shadow Fog: no rest inside it, stamina bleeds away, and you collapse if you stay empty
  p.inFog = (state === 'racing' && p.st === 0 && fogDepth(p.x, p.z, raceTime) > 0) || (state === 'summit' && p.st === 0 && !DEV.sleep && p.y + 1.2 < summitSY);
  if (p.sprinting) p.stamina -= .34 * dt;
  else if (p.inFog) p.stamina -= .12 * dt;
  else if (onRidge && live) p.stamina -= .07 * dt;
  else if (p.ground && p.crank < 0) p.stamina += (sp > .3 ? .16 : .28) * dt * (state === 'summit' && !p.campIn ? COLD[zoneAtY(p.y)] : 1); // the cold slows recovery away from camp fires
  if (p.sprinting && p.inFog) p.stamina -= .08 * dt;
  p.stamina = clamp(p.stamina, 0, 1);
  if (DEV.god && devAllowed()) { p.stamina = 1; p.exhausted = false; p.collapseT = 0; }
  if (p.stamina <= 0 && !p.exhausted) { p.exhausted = true; sfx.tired(); toast(p, p.inFog ? 'The Shadow is draining you. Get out!' : onRidge ? 'Losing your grip…' : 'Out of breath!'); }
  if (p.exhausted && p.stamina >= .4) p.exhausted = false;
  if (p.inFog && p.stamina <= 0) {
    const before = Math.floor(p.collapseT);
    p.collapseT += dt;
    if (Math.floor(p.collapseT) !== before) sfx.heartbeat();
    if (p.collapseT >= 3) collapse(p);
  } else p.collapseT = Math.max(0, p.collapseT - dt);
  if (p.st === 0 && state === 'racing' && p.y < 1 && Math.hypot(p.x - CX, p.z - CX) < SANCTUARY_R) reachSanctuary(p);
  const zone = zoneAt(p.x, p.z);
  if (zone !== p.zone) { if (p.zone !== undefined && state === 'racing' && zone > p.zone && p.ov) zoneCard(p.ov, ZONE_NAMES[zone], `Zone ${zone + 1} of 3 · keep heading for the centre`, 'z' + zone); p.zone = zone; }
  if (onRidge && live && p.stamina <= .001) {
    const i = Math.floor(p.x / C), j = Math.floor(p.z / C);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (tileTop(i + dx, j + dz) === 0) { p.ex = dx * 4.5; p.ez = dz * 4.5; p.vy = 2.5; p.ground = false; toast(p, 'Lost your footing!'); sfx.oof(); break; }
  }

  const prev = Math.floor(p.phase / Math.PI);
  if (p.ground) p.phase += sp * dt * 1.75;
  if (p.ground && sp > .5 && Math.floor(p.phase / Math.PI) !== prev) { sfx.step(p.sprinting); if (p.sprinting) fx.kick(p.x, p.y, p.z, -Math.sin(p.yaw), -Math.cos(p.yaw)); }
  poseClimber(p, dt, time, sp);
}
function poseClimber(p, dt, time, sp) {
  const B = SET.bob, low = p.exhausted || p.stamina < .25;
  const bob = p.ground && sp > .3 ? Math.sin(p.phase) * (p.sprinting ? .085 : .05) * B : 0;
  let roll = 0, droop = 0;
  if (p.sprinting) roll += Math.sin(p.phase * .5) * .035 * B;
  if (low) { roll += Math.sin(time * 1.4) * .035 * B; droop = (-.03 + Math.sin(time * 2.3) * .018) * B; }
  if (p.stumble > 0) roll += Math.sin(time * 11) * .22 * p.stumble * Math.max(B, .3);
  if (p.inFog) { roll += Math.sin(time * .9) * .05 * B; droop += Math.sin(time * 1.7) * .02 * B; }
  if (p.st === 2) roll = .5;
  p.roll += (roll - p.roll) * Math.min(1, dt * 8);
  p.cam.fov += (SET.fov + (p.sprinting ? 7 : 0) + (p.inFog ? -6 : 0) - p.cam.fov) * Math.min(1, dt * 5);
  const eye = p.st === 2 ? .35 : p.sit ? 1.05 : EYE + bob - p.land * .35;
  p.cam.position.set(p.x, p.y + eye, p.z);
  p.cam.rotation.set(p.st === 2 ? -.15 : p.pitch + droop, p.yaw, p.roll);
  p.mesh.position.set(p.x, p.y + (p.st === 2 ? .3 : Math.abs(bob) * .6), p.z); p.mesh.rotation.set(p.st === 2 ? -Math.PI / 2 : 0, p.sit ? p.sit.yaw : p.wall ? Math.PI : p.yaw, 0, 'YXZ');
  if (p.ragdoll) { const h = ragdollHead(p.ragId); if (h) p.cam.position.set(h.x, h.y + .12, h.z); }
  p.push = Math.max(0, p.push - dt); p.wave = Math.max(0, p.wave - dt);
  animateRig(p.mesh, { speed: sp, ground: p.ground, vy: p.vy, sprint: p.sprinting, crank: p.crank >= 0, stumble: p.stumble, tired: p.exhausted || p.stamina < .2, wave: p.wave, push: p.push, down: p.st === 2, sit: !!p.sit, climb: p.climbing ? p.climbPh : null, grip: p.wall ? p.wall.hands : null }, dt);
  p.bobScale = B;
  animateViewmodel(p.vm, p, dt, time);
  // camera shake from slams, hard landings and shoves
  if (p.shake > 0) {
    p.shake = Math.max(0, p.shake - dt * 1.8);
    const s = p.shake * p.shake * .35;
    p.cam.position.x += (Math.random() - .5) * s; p.cam.position.y += (Math.random() - .5) * s; p.cam.rotation.z += (Math.random() - .5) * s * .6;
  }
  updateHud(p, dt);
}

/** The rock step right in front of a climber, if there is one low enough to climb (walls are far too tall).
 *  Once you are on a face it stays locked: the direction you grabbed it, and it keeps counting right up to the lip
 *  (otherwise the last half metre reads as "low enough to step onto" and you'd drop off just before hauling over). */
function climbFace(p) {
  if (!maze) return null;
  let dx, dz;
  if (p.climbing && p.climbDir) ({ dx, dz } = p.climbDir);
  else { const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), ax = Math.abs(fx) > Math.abs(fz); dx = ax ? Math.sign(fx) : 0; dz = ax ? 0 : Math.sign(fz); }
  const i = Math.floor((p.x + dx * (R + .45)) / C), j = Math.floor((p.z + dz * (R + .45)) / C);
  if (i < 0 || j < 0 || i >= GRID || j >= GRID || (i === Math.floor(p.x / C) && j === Math.floor(p.z / C))) return null;
  const top = maze.g[i][j] ? (maze.top[i][j] <= 6.5 ? maze.top[i][j] : 0) : maze.low[i][j];
  const need = top - p.y;
  if (!top || need > 4.4 || need < (p.climbing ? -.05 : STEP + .2)) return null;
  return { top, dx, dz };
}
function reachSanctuary(p) {
  p.st = 1; p.done = true; p.doneAt = time; p.exhausted = false; sfx.fanfare();
  p.wave = 2.5; fx.confetti(p.x, p.y + 1.5, p.z, 70); fx.sparkle(p.x, p.y + .5, p.z, 0xffd23f, 20);
  p.hud.done.textContent = 'SAFE'; p.hud.done.style.display = 'flex';
  setTimeout(() => { if (p.hud) p.hud.done.style.display = 'none'; }, 1800);
  toast(p, 'You reached the sanctuary!');
  if (mode === 'online') sendNow();
}
function collapse(p) {
  if (p.st !== 0) return;
  p.st = 2; p.done = true; p.doneAt = time; p.crank = -1; sfx.doom(); fx.wisps(p.x, p.y, p.z); p.shake = .8;
  p.ragdoll = spawnRagdoll(p.ragId, { x: p.x, y: p.y, z: p.z, yaw: p.yaw, color: p.color, skin: p.look?.skin, vx: p.vxLast, vz: p.vzLast });
  p.hud.done.textContent = 'COLLAPSED'; p.hud.done.style.display = 'flex'; p.hud.done.classList.add('dead');
  toast(p, 'The Shadow took you…');
  if (mode === 'online') sendNow();
}

// Remote climbers are drawn a little in the past (INTERP seconds) and smoothly interpolated between the snapshots they
// sent, so 13 Hz network updates look like smooth 60 fps movement. If a packet is late we keep them moving the same way
// for up to a quarter second instead of freezing, then hold. Big jumps (teleports, new rounds) snap instead of sliding.
const INTERP = .13;
function remoteSample(r, now) {
  const S = r.snaps; if (!S || !S.length) return null;
  const t = now - INTERP;
  if (t <= S[0].t) return S[0];
  for (let k = S.length - 1; k > 0; k--) {
    const a = S[k - 1], b = S[k];
    if (t >= a.t && t <= b.t) {
      const f = (t - a.t) / Math.max(1e-4, b.t - a.t); let dy = b.yaw - a.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, z: a.z + (b.z - a.z) * f, yaw: a.yaw + dy * f };
    }
  }
  const b = S[S.length - 1], a = S[S.length - 2];
  if (!a || b.t - a.t > .5) return b;
  const k = Math.min(t - b.t, .25) / Math.max(1e-3, b.t - a.t);
  return { x: b.x + (b.x - a.x) * k, y: b.y, z: b.z + (b.z - a.z) * k, yaw: b.yaw };
}
function pushSnap(r, p) {
  const now = performance.now() / 1000, last = r.snaps.at(-1), y = p.y || 0;
  r.rx = now;
  if (last && last.x === p.x && last.y === y && last.z === p.z && last.yaw === p.yaw) return;
  if (last && Math.hypot(p.x - last.x, p.z - last.z) > 12) r.snaps.length = 0;
  else if (last && now - last.t > .3) r.snaps.push({ ...last, t: now - .1 }); // was standing still: start moving from here, don't pop
  r.snaps.push({ t: now, x: p.x, y, z: p.z, yaw: p.yaw });
  if (r.snaps.length > 12) r.snaps.splice(0, r.snaps.length - 12);
}
function updateRemotes(dt) {
  const now = performance.now() / 1000;
  for (const r of Object.values(remotes)) {
    const px = r.x, pz = r.z;
    const s = remoteSample(r, now); if (s) { r.x = s.x; r.y = s.y; r.z = s.z; r.yaw = s.yaw; }
    const sp = Math.hypot(r.x - px, r.z - pz) / Math.max(dt, 1e-4);
    r.phase = (r.phase || 0) + sp * dt * 1.75;
    const down = r.st === 2;
    if (down && !r.ragdoll) r.ragdoll = spawnRagdoll('R' + r.id, { x: r.x, y: r.y, z: r.z, yaw: r.yaw, color: r.color, skin: r.skin });
    if (!down && r.ragdoll) { removeRagdoll('R' + r.id); r.ragdoll = false; }
    r.mesh.visible = !r.ragdoll;
    r.mesh.position.set(r.x, r.y + (down ? .3 : sp > .3 ? Math.abs(Math.sin(r.phase)) * .035 : 0), r.z);
    // on the Summit wall the short summit string says which holds their hands are on: reach for exactly those
    const sm = state === 'summit' && r.crank === -2 && r.sm ? String(r.sm).split(',') : null, onFace = sm && sm[6] !== undefined && sm[6] !== '';
    const grip = onFace ? [SUMMIT.holds[+sm[0]] || null, SUMMIT.holds[+sm[1]] || null] : null;
    r.mesh.rotation.set(down ? -Math.PI / 2 : 0, onFace ? Math.PI : r.yaw, 0, 'YXZ');
    const vy = (r.y - (r.py ?? r.y)) / Math.max(dt, 1e-4); r.py = r.y;
    animateRig(r.mesh, { speed: sp, ground: Math.abs(vy) < .6, vy, sprint: sp > 6, crank: (r.crank ?? -1) >= 0, tired: false, down: down && !r.ragdoll, sit: r.st === 3, climb: r.crank === -2 ? r.climbPh = (r.climbPh || 0) + dt * 6.5 : null, grip }, dt);
  }
}

/* ---------- rounds ---------- */
function placeAtStart() {
  const sx = C * 1.5, sz = C * 1.5, alongX = !tileTop(2, 1), yaw = alongX ? -Math.PI / 2 : Math.PI;
  players.forEach((p, i) => {
    const off = players.length > 1 ? (i ? .75 : -.75) : 0;
    Object.assign(p, { x: sx + (alongX ? 0 : off), z: sz + (alongX ? off : 0), y: 0, vy: 0, ex: 0, ez: 0, yaw, pitch: 0, roll: 0, stamina: 1, exhausted: false,
      ground: true, done: false, sticks: 3, slot: 0, stumble: 0, st: 0, crank: -1, inFog: false, collapseT: 0, fogK: 0 });
  });
}
function prepRound(s, opts = {}) {
  // opts: { pace, grace, maxDoors, first } (the gentle first climb uses these)
  roundOpts = { ...opts }; const pace = opts.pace ?? lobbySettings.pace; roundOpts.pace = pace; setPace(pace); if (opts.grace) setGrace(opts.grace);
  DEV.graceWas = GRACE; if (DEV.sleep && devAllowed()) setGrace(1e7);
  seed = s; showSummit(false); updateClimbFx(null, false); clearRope(); showRise(false); showHazards(false); boltEl.style.opacity = 0; endPractice(); clearMarksAndSticks(); buildMaze(s, { maxDoors: opts.maxDoors, puzzles: !opts.first }); buildDoors(); buildPuzzles(); physRebuild(s); placeAtStart(); endShown = false;
  buildTrail(maze, pace); showTrail(true);
  players.forEach((p) => { p.ragdoll = false; });
  Object.values(remotes).forEach((r) => { r.ragdoll = false; r.st = 0; r.mesh.visible = true; });
  players.forEach((p) => { if (p.hud) { p.hud.done.style.display = 'none'; p.hud.done.classList.remove('dead'); } });
  $('expNo').textContent = pad(seed % 1000);
  devApplyLooks();
}
function goCountdown() {
  state = 'countdown'; raceTime = 0; lastCount = -1;
  countdown = mode === 'online' && net ? Math.max(.2, (net.startAt - net.now()) / 1000) : 3.2;
  $('banner').style.display = 'none'; $('timer').style.display = 'block'; $('fogbar').style.display = 'flex';
  players.forEach((p) => { if (p.ov) flashKeys(p.ov, 16); p.bestD = Infinity; p.lostT = 0; });
  updateLock();
}
function startRound(s) { prepRound(s); goCountdown(); }
function newMaze() {
  if (mode === 'online') return;
  if (roundOpts.summit) { const won = roundOpts.won; enterSummitTest(won ? newSeed() : SUMMIT.seed, won ? 0 : summitCamp, SUMMIT.pace ?? lobbySettings.pace, !!roundOpts.dev); return; } // retry the mountain from the last camp
  startRound(newSeed());
}

// Everyone still climbing must reach the sanctuary. The round ends when nobody is left climbing.
let endShown = false;
function everyone() {
  const list = players.map((p) => ({ name: p.name, st: p.st }));
  if (mode === 'online') for (const r of Object.values(remotes)) list.push({ name: r.name, st: r.st || 0 });
  return list;
}
function checkEnd() {
  if (state !== 'racing' || endShown) return;
  if (fogRadius(raceTime) <= .5) players.forEach((p) => p.st === 0 && collapse(p)); // the centre is gone
  const all = everyone();
  if (all.some((p) => p.st === 0)) return;
  const outcome = { win: all.some((p) => p.st === 1), time: +raceTime.toFixed(1), escaped: all.filter((p) => p.st === 1).map((p) => p.name), lost: all.filter((p) => p.st === 2).map((p) => p.name) };
  if (mode === 'online') { net?.endRound(outcome); return; }
  showEnd(outcome);
}
function showEnd(o) {
  endShown = true; state = 'finished'; document.exitPointerLock?.(); updateLock();
  const total = o.escaped.length + o.lost.length;
  let title, sub;
  if (o.win && roundOpts.first && !roundOpts.dev) { try { localStorage.setItem('ridgeline_firstclimb', '1'); } catch {} }
  if (o.summit) { // the mountain
    roundOpts.won = o.win;
    const campName = CAMP_NAMES[o.camp || 0] || 'Trailhead';
    if (o.win) { title = o.lost.length ? `${o.escaped.length} of ${total} reached the summit` : total > 1 ? 'The whole team reached the summit' : 'You reached the summit'; sub = `Top in ${fmt(o.time)}` + (o.lost.length ? ` · lost: ${o.lost.join(', ')}` : ''); }
    else { title = total > 1 ? 'The Shadow swallowed the mountain' : 'The Shadow caught you'; sub = `Highest camp: ${campName} · lasted ${fmt(o.time)}` + ((o.camp || 0) > 0 ? ' · the next climb can resume from that camp (trail board)' : ''); }
    const T = (k) => players.reduce((s, p) => s + (p[k] || 0), 0); // team summary (this screen's climbers)
    sub += ` · ${T("falls")} falls · ${T("ropeCatches")} rope catches · ${T("hauls")} hauls · ${T("pitonsUsed")} pitons · ${T("rests")} rests`;
    if (roundOpts.dev) sub += " · dev tools were on, so no rewards";
    $('banner').classList.toggle('lose', !o.win);
    $('bFlag').innerHTML = o.win ? '<svg class="i sm"><use href="#i-sun"/></svg>Summit reached' : '<svg class="i sm"><use href="#i-moon"/></svg>Game over';
    $('again').textContent = (o.camp || 0) > 0 && !o.win ? `Retry from ${campName} · R` : 'Climb again · R';
    showBanner(title, sub + (mode === 'online' ? ' · back to the hall in 8 seconds' : ''), { again: mode !== 'online' });
    if (o.win) domConfetti(true); else sfx.doom();
    return;
  }
  $('again').textContent = 'New maze · R';
  if (o.win) {
    title = o.lost.length ? `${o.escaped.length} of ${total} escaped` : total > 1 ? 'Everyone escaped the Shadow' : 'You escaped the Shadow';
    sub = `Sanctuary reached in ${fmt(o.time)}` + (o.lost.length ? ` · lost: ${o.lost.join(', ')}` : '');
    if (roundOpts.dev) sub += ' · dev tools were on, so this run is not counted';
    else if (mode === 'solo') {
      const best = getBest();
      if (o.time < best) { try { localStorage.setItem('ridgeline_best', o.time); } catch {} sub += ' · new personal best!'; } else sub += ` · best ${fmt(best)}`;
    }
  } else {
    title = total > 1 ? 'The Shadow took everyone' : 'The Shadow took you';
    sub = `Lasted ${fmt(o.time)} · ${doorsOpen()}/${doorCount()} doors opened`;
  }
  $('banner').classList.toggle('lose', !o.win);
  $('bFlag').innerHTML = o.win ? '<svg class="i sm"><use href="#i-sun"/></svg>Sanctuary reached' : '<svg class="i sm"><use href="#i-moon"/></svg>Game over';
  showBanner(title, sub + (mode === 'online' ? ' · back to the hall in 8 seconds' : ''), { again: mode !== 'online' });
  if (o.win) domConfetti(true); else sfx.doom();
}
function domConfetti(win) {
  const host = $('banner'), cols = ['#ff6f59', '#ffd23f', '#2ec4f1', '#8ee34d', '#a37bff', '#ff5fa2'];
  for (let i = 0; i < 80; i++) {
    const c = document.createElement('i'); c.className = 'conf';
    c.style.cssText = `left:${Math.random() * 100}%;background:${cols[i % cols.length]};animation-delay:${Math.random() * .6}s;animation-duration:${2.2 + Math.random() * 1.6}s;--r:${(Math.random() - .5) * 1440}deg;--dx:${(Math.random() - .5) * 240}px;width:${8 + Math.random() * 8}px;height:${10 + Math.random() * 10}px`;
    host.appendChild(c); setTimeout(() => c.remove(), 4600);
  }
  if (win) sfx.fanfare();
}
function showBanner(title, sub, { again = false } = {}) {
  $('bTitle').textContent = title; $('bSub').textContent = sub;
  $('again').style.display = again ? '' : 'none';
  $('banner').style.display = 'flex';
}
const getBest = () => { try { return +localStorage.getItem('ridgeline_best') || Infinity; } catch { return Infinity; } };
const refreshBest = () => { const b = getBest(); $('bestTime').textContent = isFinite(b) ? fmt(b) : 'No climb yet'; };

/* ---------- puzzle gates (Ember Gate, Rune Gate) ---------- */
// Lighting a brazier is shared online through the doors list (id 100 + brazier), so late joiners see it too.
function lightLocal(k, p) {
  if (!lightBrazier(k)) return;
  if (p) { vmUse(p.vm, 'push'); p.wave = Math.max(p.wave, .6); }
  brazierToast(k);
  if (mode === 'online' && net) net.latchDoor(100 + k);
}
function brazierToast(k) { const c = brazierCount(k); if (c) players.forEach((q) => toast(q, c.lit >= c.total ? 'Every brazier is lit · the Ember Gate opens!' : `Brazier lit · ${c.lit} of ${c.total}`)); }
function gateToast(kind) { players.forEach((q) => toast(q, kind === 'ember' ? 'The Ember Gate is open!' : kind === 'rune' ? 'The Rune Gate is open!' : 'A gate opened!')); sfx.fanfare?.(); }

/* ---------- pings, teammate markers and one-time tips ---------- */
const pings = []; let pingSeq = 0;
const pingRay = new THREE.Raycaster();
function doPing(p) {
  if ((p.pingCd || 0) > time) return;
  p.pingCd = time + .6;
  const o = p.cam.getWorldPosition(new THREE.Vector3()), dir = p.cam.getWorldDirection(new THREE.Vector3());
  pingRay.set(o, dir); pingRay.far = 90;
  const hit = pingRay.intersectObjects(rayTargets, false)[0];
  const pt = hit ? hit.point : o.clone().addScaledVector(dir, 25);
  addPing(pt.x, pt.y + .4, pt.z, p.name, p.color);
  vmUse(p.vm, 'push'); p.wave = Math.max(p.wave, .6);
  if (mode === 'online' && net) for (const id of Object.keys(remotes)) net.sendEvent(id, { type: 'ping', x: +pt.x.toFixed(2), y: +(pt.y + .4).toFixed(2), z: +pt.z.toFixed(2), from: p.name, c: p.color });
}
function addPing(x, y, z, name, color) {
  // one ping per climber at a time: a new ping replaces their old one
  const old = pings.findIndex((q) => q.name === name); if (old >= 0) pings.splice(old, 1);
  pings.push({ key: 'ping' + (pingSeq++), x, y, z, name, color, t: time });
  sfx.chime?.(); fx.ring(x, y - .3, z, new THREE.Color(color).getHex()); fx.sparkle(x, y, z, new THREE.Color(color).getHex(), 10);
}
function drawMarkers(p, w, h) {
  if (!p.ov) return;
  for (let i = pings.length - 1; i >= 0; i--) if (time - pings[i].t > 7) pings.splice(i, 1);
  const list = [];
  const mate = (key, o, st) => {
    const tag = st === 1 ? 'safe' : st === 2 ? 'down' : o.inFog || (state === 'racing' && fogDepth(o.x, o.z, raceTime) > 0) ? 'in the Shadow' : st === 3 ? 'resting' : inLobby() && inGondola(o.x, o.z) ? 'aboard' : '';
    const say = o.say && time - o.say.t < 4.5 ? `"${o.say.text}"` : '';
    list.push({ key, kind: 'mate', name: o.name, color: o.color, x: o.x, y: (o.y || 0) + 2.15, z: o.z, tag: say || tag, say: !!say });
  };
  players.forEach((q, i) => { if (q !== p) mate('L' + i, q, q.st); });
  Object.values(remotes).forEach((r) => mate('R' + r.id, r, r.st));
  for (const q of pings) list.push({ key: q.key, kind: 'ping', name: q.name, color: q.color, x: q.x, y: q.y, z: q.z, tag: 'ping' });
  updateMarkers(p.ov, p.cam, w, h, list, frameDt);
}
let frameDt = 0;
// short, once-per-device tips that appear the first time each danger shows up
function checkTips(p) {
  const O = p.ov; if (!O || state !== 'racing' || p.st !== 0) return;
  if (raceTime > GRACE && raceTime < GRACE + 3) showTip(O, 'fogwake', 'The Shadow is awake', 'It creeps in from the edges towards the centre. Keep moving and follow the compass.', 'fog');
  { const pz = nearPuzzle(p.x, p.z);
    if (pz === 'ember') showTip(O, 'ember', 'Ember Gate', `This gate opens once every brazier is lit. They glow blue in dead ends behind you: walk up and press ${p.ctrl.id === 'p2' ? '/' : p.ctrl.id === 'p1' ? 'F' : 'F or click'}, or throw a glowstick in.`, 'door');
    if (pz === 'rune') showTip(O, 'rune', 'Rune Gate', 'The gate shows a row of runes. Find the matching rune tiles in the corridors nearby and step on them in that order. A wrong step resets them.', 'door'); }
  if (p.inFog) showTip(O, 'infog', "You're in the Shadow", "You can't catch your breath in here and your stamina drains. Get out before it runs dry.", 'fog');
  if (p.exhausted) showTip(O, 'tired', 'Out of breath', 'Stand still on flat ground to recover. Sprinting, jumping and ridges all cost stamina.', 'stam');
  if (!tipSeen('door')) for (let k = 0; k < doorCount(); k++) {
    const c = doorAt(k); if (!maze.doors[k]?.kind && doorProgress(k) < 1 && Math.hypot(p.x - c.x, p.z - c.z) < 9) { showTip(O, 'door', 'Stone door ahead', `Two climbers stand on both pressure plates, or one holds ${p.ctrl.bk} at the crank lever. Don't let go halfway.`, 'door'); break; }
  }
  { const f = climbFace(p); if (f) showTip(O, 'climb', 'Rock step ahead', `Jump at it, then keep holding ${p.ctrl.id === 'p2' ? 'Enter' : 'Space'} to climb. Climbing drains stamina, so catch your breath first if you are low.`, 'stam'); }
  // "lost" helper: no real progress towards the sanctuary for 30 seconds
  const d = Math.hypot(p.x - CX, p.z - CX);
  if (d < (p.bestD ?? Infinity) - 2) { p.bestD = d; p.lostT = 0; } else p.lostT = (p.lostT || 0) + frameDt;
  if (p.lostT > 30) showTip(O, 'lost', 'Feeling lost?', `Press 1 and ${p.ctrl.id === 'mouse' ? 'click' : 'use'} to chalk arrows where you've been. Glowsticks (2) light up dead ends.`, 'chalk');
}

/* ---------- training trail, passport, briefing cards and the gentle first climb ---------- */
let roundOpts = {};
const isFirstClimb = () => { try { return !localStorage.getItem('ridgeline_firstclimb'); } catch { return false; } };
function passportStamp(p, id, done = false) {
  if (!done && !stamp(id)) return;
  const st = STATIONS.find((s) => s.id === id); if (!st || !p) return;
  sfx.chime?.(); fx.confetti(p.x, p.y + 1.6, p.z, 30);
  toast(p, `Passport stamp · ${st.name}`);
  renderPassport(id);
  if (passportDone()) players.forEach((q) => q.ov && zoneCard(q.ov, 'Passport complete!', 'You are ready for the mountain · board the gondola', 'camp'));
}
function renderPassport(fresh) {
  const n = STATIONS.filter((s) => hasStamp(s.id)).length;
  $('passport').innerHTML = `<div class="pp-h"><b>Climber's passport</b><span>${n}/${STATIONS.length}</span></div>` +
    STATIONS.map((s) => `<div class="pp-r${hasStamp(s.id) ? ' done' : ''}${s.id === fresh ? ' pop' : ''}"><i></i><div><b>${esc(s.name)}</b>${hasStamp(s.id) ? '' : `<small>${esc(s.hint)}</small>`}</div></div>`).join('') +
    (n === STATIONS.length ? '<p class="pp-done">All stamped. Off you go!</p>' : '<p class="pp-done">Optional · practise anything before you board</p>') +
    `<p class="pp-done">Summit badges: ${["Gentle", "Standard", "Brutal"].map((n, i) => summitWins().includes(i) ? `<b>${n}</b>` : `<s style="opacity:.5">${n}</s>`).join(" · ")}</p>`;
}
setBallHook((pos) => { if (!inShed(pos)) return false; if (stamp('glow')) passportStamp(players[0], 'glow', true); return true; });
function lobbyTraining(dt) {
  updateTraining(dt);
  const people = players.map((p) => ({ x: p.x, y: p.y, z: p.z, crank: p.crank })).concat(Object.values(remotes).map((r) => ({ x: r.x, y: r.y, z: r.z, crank: r.crank ?? -1 })));
  updateDoors(dt, people, {
    onLatch: () => players.forEach((p) => passportStamp(p, 'gate')),
    onSlam: () => players.forEach((p) => toast(p, 'The gate slammed! Keep both plates held, or keep cranking')),
  });
  for (const p of players) {
    if (inPuddle(p.x, p.z) && p.y < .5) { p.stamina = Math.max(0, p.stamina - .4 * dt); p.inFog = true; } else p.inFog = false;
    const id = checkStations(p, dt, time); if (id) passportStamp(p, id, true);
  }
}
// five picture cards: shown on your first visit to Base Camp, after two weeks away, and at the top of the Field Guide
const CARDS = [
  ['Reach the Sanctuary', 'Follow the compass to the glowing centre. Everyone still climbing has to get there.', '<circle cx="40" cy="40" r="30" fill="#fff6e5" stroke="#1b2738" stroke-width="4"/><path d="M40 14 50 40 40 34 30 40z" fill="#ff5a1f" stroke="#1b2738" stroke-width="3" stroke-linejoin="round"/><path d="M40 66 30 40 40 46 50 40z" fill="#c9d6e3" stroke="#1b2738" stroke-width="3" stroke-linejoin="round"/>'],
  ['Outrun the Shadow', 'After a head start, purple fog closes in from the edges. Inside it you can\'t recover stamina.', '<rect x="8" y="8" width="64" height="64" rx="10" fill="#2b1840"/><rect x="22" y="22" width="36" height="36" rx="6" fill="#ffd23f" stroke="#1b2738" stroke-width="3"/><path d="M8 20q10-8 20 0t20 0 24 0" fill="none" stroke="#b48cff" stroke-width="4"/><circle cx="40" cy="40" r="5" fill="#ff6f59" stroke="#1b2738" stroke-width="2.5"/>'],
  ['Open stone gates', 'Stone doors: two on the plates or one on the crank. Ember Gates: light every brazier. Rune Gates: step on the runes in the order shown.', '<rect x="26" y="10" width="28" height="44" rx="3" fill="#b9ab95" stroke="#1b2738" stroke-width="3.5"/><path d="M33 20h14M33 30h14M33 40h14" stroke="#ff7a2a" stroke-width="3"/><ellipse cx="16" cy="64" rx="11" ry="5" fill="#ffd23f" stroke="#1b2738" stroke-width="3"/><ellipse cx="64" cy="64" rx="11" ry="5" fill="#ffd23f" stroke="#1b2738" stroke-width="3"/>'],
  ['Climb rock steps', 'Jump at a step, then keep holding jump to climb. Climbing drains stamina.', '<path d="M10 70 18 36 34 30 48 40 62 28 72 70z" fill="#9c8f82" stroke="#1b2738" stroke-width="3.5" stroke-linejoin="round"/><circle cx="30" cy="44" r="3.5" fill="#fff6e5"/><circle cx="44" cy="52" r="3.5" fill="#ff8a3d"/><circle cx="56" cy="42" r="3.5" fill="#fff6e5"/><path d="M40 22l8-8 4 4" fill="none" stroke="#1b2738" stroke-width="3.5" stroke-linecap="round"/>'],
  ['Mark your way', 'Chalk arrows (1), glowsticks (2), and gold-capped cairns that sit on the true path.', '<path d="M12 60 L44 28" stroke="#fff" stroke-width="9" stroke-linecap="round"/><path d="M30 24h18v18" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 60 L44 28M30 24h18v18" fill="none" stroke="#1b2738" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="60" cy="58" r="13" fill="#8ee34d" opacity=".35"/><rect x="55" y="44" width="10" height="28" rx="5" transform="rotate(-25 60 58)" fill="#8ee34d" stroke="#1b2738" stroke-width="3"/>'],
];
const cardsHtml = () => CARDS.map(([t, d, svg], i) => `<div class="pcard2" style="--i:${i}"><svg viewBox="0 0 80 80">${svg}</svg><b>${i + 1}. ${t}</b><p>${d}</p></div>`).join('');
document.querySelectorAll('.cards5').forEach((el) => el.innerHTML = cardsHtml());
function maybeBriefing() {
  document.querySelector('[data-panel="brief"] .cards5').innerHTML = cardsHtml(); // the Summit briefing may have swapped the cards
  let last = 0; try { last = +localStorage.getItem('ridgeline_last') || 0; localStorage.setItem('ridgeline_last', Date.now()); } catch {}
  if (!last) { $('briefTitle').textContent = 'Welcome, climber'; $('briefSub').textContent = 'Five things to know before your first climb. The training wing in the boarding hall lets you try each one.'; openPanel('brief'); }
  else if (Date.now() - last > 14 * 864e5) {
    resetPassport(); renderPassport();
    $('briefTitle').textContent = 'Welcome back'; $('briefSub').textContent = "It's been a while, so here's a quick refresher. Your passport has been reset if you want to warm up at the stations.";
    openPanel('brief');
  }
}

/* ---------- Summit climb: the test mountain with rope, pitons, camps and the rising Shadow (solo, local co-op, online) ---------- */
const SUMMIT_SKY = new THREE.Color(0xdfe9f4);
const PITON_N = [8, 5, 3];          // pitons per climber per camp, by pace
const SUMMIT_SAVE = 'ridgeline_summit_cp';
const CAMP_NAMES = ['Trailhead', 'Camp I', 'Camp II', 'Camp III', 'Camp IV', 'Camp V'];
const summitSave = () => { try { return JSON.parse(localStorage.getItem(SUMMIT_SAVE) || 'null'); } catch { return null; } };
// the camp the next Summit can resume from: this device's save offline, the room's checkpoint online
const resumeCamp = () => (mode === 'online' ? net?.meta?.save?.camp : summitSave()?.camp) || 0;
let summitSY = -10, summitTeam = [], campTimes = {}, summitStartCamp = 0, summitFlash = 0;
const _zoneSky = new THREE.Color();
const summitPauses = () => Object.values(campTimes);
const boltEl = document.createElement('div'); boltEl.style.cssText = 'position:fixed;inset:0;background:#eef4ff;opacity:0;pointer-events:none;z-index:5;mix-blend-mode:screen'; document.body.appendChild(boltEl); // lightning
onKbChalk((h) => { if (mode === 'online') net?.chalkHold(h.id); });
/** Dev menu: straight onto the test mountain (solo or local co-op). */
function enterSummitTest(s = newSeed(), camp = 0, pace = lobbySettings.pace, dev = true) {
  closeDev(true);
  return transition(() => { if (inLobby() || $('huds').classList.contains('lobby')) leaveLobbyWorld(); enterSummitNow(s, camp, pace); })
    .then(() => { if (dev) roundOpts.dev = true; if (isPointerMode()) lockPointer(); }); // dev-menu runs don't earn rewards
}
/** Build the mountain from a seed and put everyone at a camp (0 = the trailhead). Used offline, online and for late joiners. */
function enterSummitNow(s, camp = 0, pace = 1, { late = false, startCamp = camp, practice: prac = false } = {}) {
  endPractice(); if (prac) practice = { done: new Set(), dummy: null, by: null, beat: 0, hall: null, finished: false };
  state = 'summit'; paused = false; endShown = false; raceTime = 0; departT = -1; summitCamp = 0; campTimes = {}; seed = s;
  roundOpts = { pace, summit: true, firstSummit: !prac && isFirstSummit() };
  ['banner', 'count', 'pause', 'depart'].forEach((id) => $(id).style.display = 'none'); $('timer').style.display = 'block'; $('fogbar').style.display = 'flex';
  clearMarksAndSticks(); clearTrail(); showTrail(false); showDecor(false); showFog(false); setGroundVisible(false); clearRope();
  buildSummit(s, pace, { practice: prac }); buildDoors(); buildPuzzles(); physRebuild(1);
  if (prac) { $('fogbar').style.display = 'none'; $('timer').style.display = 'none'; }
  SUMMIT.pace = pace; setRise(pace); showRise(!prac); buildHazards(s, pace); showHazards(!prac);
  const start = SUMMIT.camps[Math.min(camp, SUMMIT.camps.length - 1)];
  for (const c of SUMMIT.camps) if (c.id <= start.id && c.id > 0) markCamp(c);
  gateBoth = 0; if (SUMMIT.gate && start.y >= SUMMIT.faces[SUMMIT.gate.face].y1 - .5) openGate(); // resuming above the temple gate: it is already open
  summitCamp = start.id; summitStartCamp = Math.min(startCamp, start.id);
  RISE.base = summitStartCamp ? SUMMIT.camps[summitStartCamp].y - 24 : -4; // resuming: the Shadow starts a little below that camp (same for everyone, also late joiners)
  if (prac) RISE.base = -1e4; // no Shadow on the Practice Wall
  if (summitStartCamp === SUMMIT.camps.length - 1) campTimes[summitStartCamp] = 0; // resumed at the last camp: the final push is on
  players.forEach((p, i) => {
    Object.assign(p, { vy: 0, ex: 0, ez: 0, pitch: .25, roll: 0, stamina: 1, exhausted: false, ground: true, done: false,
      st: 0, crank: -1, sit: null, slot: 2, sticks: 3, summited: false, ragdoll: false, inFog: false, collapseT: 0, stumble: 0,
      pitons: PITON_N[pace] ?? 5, clip: null, hang: null, belay: false, falls: 0, ropeCatches: 0, pitonsUsed: 0, downT: 0, summitZone: start.zone ?? 0, gustT: 0, hauls: 0, rests: 0, hauled: false, ropeGold: p.look?.rope === 'gold', netId: mode === 'online' ? myId : 'L' + i });
    resetClimber(p); placeAtCamp(p, start, i + (late ? Object.keys(remotes).length : 0));
    if (p.hud) { p.hud.done.style.display = 'none'; p.hud.done.classList.remove('dead'); }
  });
  Object.values(remotes).forEach((r) => { if (r.ragdoll) removeRagdoll('R' + r.id); r.ragdoll = false; r.mesh.visible = true; r.rp = null; });
  $('pRestart').style.display = 'none'; $('pLeave').querySelector('b').textContent = mode === 'online' && !prac ? 'Leave to menu' : 'Back to the boarding hall';
  renderPractice();
  updateLock();
  setTimeout(() => players.forEach((p) => {
    if (!p.ov) return;
    const kb = !p.mouse, two = p.ctrl.id === 'p2';
    zoneCard(p.ov, late ? `Joined at ${start.name}` : start.id ? `Back at ${start.name}` : prac ? 'Practice Wall' : roundOpts.firstSummit ? 'Your first Summit · Gentle hints on' : 'The Summit', kb ? `${two ? 'Enter' : 'Space'} at the wall to grab · ${two ? 'arrows' : 'W A S D'} move a hand` : 'Look at a hold · hold left or right click to grab it', 'goal');
    if (!kb) showTip(p.ov, 'grab', 'Climb with two hands', 'Look at a hold and hold LEFT click for your left hand, RIGHT click for your right. Grab higher holds to pull yourself up. Let go of both and you fall.', 'stam');
    else showTip(p.ov, 'grabkb', 'Climbing on the keyboard', 'Jump at the wall to grab it. Up moves your lower hand higher, down moves a hand lower, left and right reach sideways. Jump again to push off.', 'stam');
  }), 700);
}
function placeAtCamp(p, c, i) {
  const n = Math.max(players.length, i + 1), off = (i - (n - 1) / 2) * 1.3;
  Object.assign(p, { x: c.x + off - (c.id ? 5 : 0), y: c.y, z: c.z - (c.id ? 2.5 : 0), yaw: Math.PI, vy: 0, ground: true, airTop: c.y });
}
/** Summit fall too long for the rope or a piton: knocked out until a teammate brings you back at a camp. */
function knockOut(p, drop) {
  p.st = 2; p.done = true; p.doneAt = time; p.downT = 0; p.hang = null; p.clip = null; p.belay = false; releaseWall(p, null, toast);
  sfx.doom(); p.shake = 1; fx.dust(p.x, p.y, p.z, 20, 1.4, 0xffffff);
  p.hud.done.textContent = 'KNOCKED OUT'; p.hud.done.style.display = 'flex'; p.hud.done.classList.add('dead');
  toast(p, `A ${Math.round(drop)} m fall · knocked out`);
  players.forEach((q) => { if (q !== p && q.st === 0) toast(q, `${p.name} is knocked out · stand at a camp to bring them back`); });
  if (mode === 'online') sendNow();
}
function reviveAt(p, c) {
  if (p.ragdoll) { removeRagdoll(p.ragId); p.ragdoll = false; }
  Object.assign(p, { st: 0, done: false, stamina: .7, exhausted: false, stumble: 0, downT: 0, hang: null, clip: null, collapseT: 0, inFog: false, spec: null });
  resetClimber(p); placeAtCamp(p, c, players.indexOf(p));
  if (p.hud) { p.hud.done.style.display = 'none'; p.hud.done.classList.remove('dead'); }
  fx.sparkle(p.x, p.y + 1, p.z, 0xffd23f, 18); sfx.chime?.(); toast(p, `Back on your feet at ${c.name}`);
  if (mode === 'online') sendNow();
}
/** The rope team in a fixed order every client agrees on (local climbers, plus proxies for online teammates). */
function teamList() {
  if (practice) { const t = players.slice(); if (practice.dummy) t.splice(Math.max(0, t.indexOf(practice.by)) + 1, 0, practice.dummy); return t; } // Practice Wall: you and the sandbag, nobody online
  if (mode !== "online") return players.slice();
  const list = players.concat(Object.values(remotes).map(proxyOf));
  return list.sort((a, b) => (a.netId < b.netId ? -1 : a.netId > b.netId ? 1 : 0));
}
// An online teammate as the rope rules see them, rebuilt from their position and their short summit string (sm)
function proxyOf(r) {
  const q = r.rp || (r.rp = { remote: true, id: r.id, netId: r.id, ragId: 'R' + r.id, ctrl: { bk: 'E' } }); q.ropeGold = String(r.lookStr || '').includes('"rope":"gold"');
  const [hl, hr, ck, g, b, k, f] = String(r.sm || '').split(',');
  const face = f === undefined || f === '' ? -1 : +f, H = SUMMIT.holds;
  Object.assign(q, { name: r.name, color: r.color, x: r.x, y: r.y || 0, z: r.z, st: r.st || 0, hang: g === '1', belay: b === '1', campId: k === undefined ? -1 : +k,
    wall: face >= 0 ? { face, hands: [H[+hl] || null, H[+hr] || null] } : null, clip: ck ? pitonByKey(ck) : null, gone: false });
  q.ground = !q.wall && !q.hang;
  return q;
}
const smOf = (p) => { const W = p.wall; return `${W?.hands[0]?.id ?? -1},${W?.hands[1]?.id ?? -1},${p.clip?.key || ''},${p.hang ? 1 : 0},${p.belay ? 1 : 0},${p.campIn ? p.campIn.id : -1},${W ? W.face : ''}`; };
/** Everything the mountain does each frame: the Shadow, rope, camps, checkpoints, getting knocked-out teammates back. */
function summitTick(dt) {
  summitSY = shadowY(raceTime, summitPauses(), campTimes[SUMMIT.camps.length - 1] ?? Infinity);
  // zone hazards: rocks, wind, lightning (all from the seed and the round clock)
  const viewer = players[0]?.spec ? remotes[players[0].spec] : players[0];
  updateHazards(raceTime, dt, players.filter((p) => p.st === 0), viewer, { zoneOf: zoneAtY, rockHit, gust, thunder: () => sfx.thunder(viewer && zoneAtY(viewer.y) >= 3 ? 1 : .5) });
  summitFlash = viewer && zoneAtY(viewer.y) >= 3 ? flashAt(raceTime) : 0;
  summitFeel(dt, viewer);
  if (windAt(raceTime).k === 0) players.forEach((p) => { p.gustT = 0; p.gustSaid = false; });
  // the sky and light follow the zone you are in
  if (viewer) SUMMIT_SKY.lerp(_zoneSky.set(ZONES[zoneAtY(viewer.y)].sky), Math.min(1, dt * 1.2));
  for (const p of players) {
    if (p.st !== 0) continue;
    const z = zoneAtY(p.y);
    if (z > (p.summitZone ?? 0)) { p.summitZone = z; if (p.ov) { zoneCard(p.ov, ZONES[z].name, `Zone ${z + 1} of 5 · ${ZONES[z].idea}`, 'z' + Math.min(z, 2)); } sfx.chime?.(); }
    // breath clouds in the cold
    if (z >= 1 && !p.campIn && (p.breathT = (p.breathT || 0) - dt) <= 0) { p.breathT = 1.8 + Math.random(); const fwx = -Math.sin(p.yaw), fwz = -Math.cos(p.yaw); fx.dust(p.x + fwx * .5, p.y + 1.5, p.z + fwz * .5, 3, .12, 0xffffff); }
  }
  const cx = (SUMMIT.faces[0]?.x0 + SUMMIT.faces[0]?.x1) / 2 || 66, cz = SUMMIT.topZ || 50;
  updateRise(summitSY, dt, cx, cz);
  ropeStep(summitTeam, dt, { toast, letGo: (q, why) => releaseWall(q, why, toast), remoteHit: (q, kind, from) => net?.sendEvent(q.id, { type: kind, from }) });
  updateRopes(summitTeam, dt);
  if (practice) { practiceTick(dt); summitHints(dt); players.forEach(summitTips); return; } // the Practice Wall: no camps, no Shadow, no end
  gateTick(dt);
  summitHints(dt); players.forEach(summitTips);
  const alive = players.filter((p) => p.st === 0);
  for (const p of alive) {
    const c = p.ground ? campAt(p.x, p.y, p.z) : null;
    p.campIn = c;
    if (!c) continue;
    if (c.id > 0) p.stamina = Math.min(1, p.stamina + .25 * dt); // the fire warms you up
    const full = PITON_N[SUMMIT.pace] ?? 5;
    if ((p.pitons < full || p.sticks < 3) && c.id > 0) { p.pitons = Math.max(p.pitons, full); p.sticks = 3; toast(p, `Pitons (${full}) and glowsticks refilled`); }
    p.clip = null;
    if (c.id > summitCamp) reachCamp(c, p.name);
  }
  // knocked out or taken by the Shadow: a teammate standing in a camp above the Shadow brings you back there;
  // with nobody left standing anywhere, everyone wakes at the team's last camp (if the Shadow hasn't reached it)
  const safe = (c) => c && c.y > summitSY + .5;
  const helperCamp = () => {
    for (const q of alive) if (safe(q.campIn)) return q.campIn;
    if (mode === 'online') for (const r of Object.values(remotes)) { const q = proxyOf(r); if (q.st === 0 && q.campId >= 0 && safe(SUMMIT.camps[q.campId])) return SUMMIT.camps[q.campId]; }
    return null;
  };
  const anyoneUp = alive.length || (mode === 'online' && Object.values(remotes).some((r) => (r.st || 0) === 0));
  for (const p of players) if (p.st === 2) {
    p.downT += dt;
    const c = helperCamp();
    if (c && p.downT > 2) reviveAt(p, c);
    else if (!anyoneUp && p.downT > 3.5 && safe(SUMMIT.camps[summitCamp])) reviveAt(p, SUMMIT.camps[summitCamp]);
  }
  // the top: you're safe (st 1) and can watch the others
  for (const p of alive) if (p.ground && p.y >= SUMMIT.topY - .1 && !p.summited) {
    p.summited = true; p.st = 1; p.done = true; p.doneAt = time; p.specOff = true; /* stay up here for the photo */ sfx.fanfare?.(); fx.confetti(p.x, p.y + 1.5, p.z, 70); p.wave = 2.5;
    p.hud.done.textContent = 'SUMMIT!'; p.hud.done.style.display = 'flex'; setTimeout(() => { if (p.hud) p.hud.done.style.display = 'none'; }, 2200);
    if (p.ov) zoneCard(p.ov, 'You reached the summit!', `Top in ${fmt(raceTime)} · ${p.falls || 0} falls · ${p.ropeCatches || 0} rope catches · ${p.pitonsUsed || 0} pitons`, 'goal');
    players.forEach((q) => { if (q !== p) toast(q, `${p.name} reached the summit!`); });
    summitReward(p); try { localStorage.setItem("ridgeline_firstsummit", "1"); } catch {}
    if (mode === 'online') sendNow();
  }
  checkSummitEnd();
}
/* ---------- the temple gate: two climbers on the twin rune ledges at once, or one on the crank ---------- */
const GATE_CRANK = 98;           // crank value a gate-cranking climber sends (remotes play the crank pose)
const CRANK_T = [10, 14, 18];    // seconds of winding to open it, by pace
let gateBoth = 0;
function gateTick(dt) {
  const G = SUMMIT.gate; if (!G) return;
  const on = [false, false];
  for (const p of players) if (p.st === 0 && p.wall) { const k = twinAt(p.x, p.y, p.wall.face); if (k >= 0) on[k] = true; }
  if (mode === 'online') for (const r of Object.values(remotes)) {
    if ((r.st || 0) !== 0) continue;
    const f = String(r.sm || '').split(',')[6]; if (f === undefined || f === '') continue;
    const k = twinAt(r.x, r.y, +f); if (k >= 0) on[k] = true;
  }
  if (!G.open) {
    const n = players.filter((p) => p.gateCrank).length + (mode === 'online' ? Object.values(remotes).filter((r) => r.crank === GATE_CRANK && nearCrank(r.x, r.y, r.z)).length : 0);
    const before = G.prog;
    G.prog = n ? Math.min(1, G.prog + dt / CRANK_T[SUMMIT.pace ?? 1] * Math.min(2, n)) : Math.max(0, G.prog - dt * .03); // let go and it slowly unwinds
    if (n && Math.floor(before * 24) !== Math.floor(G.prog * 24)) sfx.grind();
    gateBoth = on[0] && on[1] ? gateBoth + dt : 0;
    if (on.some(Boolean) && !G.wasOn) sfx.click(); G.wasOn = on.some(Boolean);
    if (gateBoth > .6) gateOpened('twin', true); else if (G.prog >= 1) gateOpened('crank', true);
  }
  updateGate(dt, on);
}
function gateOpened(how, local) {
  if (!openGate()) return;
  const G = SUMMIT.gate, f = SUMMIT.faces[G.face], mid = G.y + G.h / 2;
  sfx.slam(); setTimeout(() => sfx.unlock(), 250);
  fx.dust(f.cx, mid, f.z - .6, 40, 2, 0xd8c8a8); fx.sparkle(f.cx, mid, f.z - .5, 0xffd23f, 30);
  const sub = how === 'twin' ? 'Two climbers on the rune ledges · the holds came out' : how === 'crank' ? 'The crank wound the seal open · climb on' : 'Your team opened the seal · climb on';
  players.forEach((p) => { if (Math.abs(p.y - mid) < 30) { p.shake = Math.max(p.shake, .5); if (p.ov) zoneCard(p.ov, 'The temple gate is open!', sub, 'goal'); } });
  if (local && mode === 'online') net?.openGate(G.face);
}
// sound and feel on the mountain: a wind bed that follows altitude and gusts, camp fires crackling, a heartbeat when your arms give out
let windOn = false, windT = 0;
function summitFeel(dt, v) {
  if ((windT -= dt) <= 0 && v) {
    windT = .25; const z = zoneAtY(v.y), w = windAt(raceTime);
    setWind(practice ? .05 : inChimney(v.x, v.y + 1.6, v.z) ? .03 : .08 + z * .06 + (z >= 3 ? w.k * .6 : 0)); windOn = true;
  }
  const p0 = players[0]; if (p0?.campIn && p0.campIn.id > 0 && Math.random() < dt * 5) sfx.crackle();
  for (const p of players) if (p.st === 0 && (p.wall || p.hang) && p.stamina < .25 && (p.hbT = (p.hbT || 0) - dt) <= 0) { p.hbT = .5 + p.stamina * 3; sfx.heartbeat(); }
}
const handsOn = (p) => p.wall ? p.wall.hands.filter(Boolean).length : 0;
/** A falling rock (or icicle) reached a local climber. */
function rockHit(p, onFace) {
  p.shake = Math.max(p.shake, .85); sfx.oof?.(); fx.dust(p.x, p.y + 1.5, p.z, 10, .6, 0x8a7a6a); p.stamina = Math.max(0, p.stamina - .25);
  if (p.wall && handsOn(p) < 2) releaseWall(p, 'A rock knocked you off! Watch for the dark streaks', toast);
  else if (p.wall) toast(p, 'Rock! You held on with both hands');
  else if (!onFace) { p.stumble = Math.max(p.stumble, 1); toast(p, 'Hit by a falling rock!'); }
  else toast(p, 'A rock hit you on the rope!');
  if (p.ov) showTip(p.ov, 'rocks', 'Falling rocks', 'A dark streak down the face means a rock is coming. Move sideways out of it, or hold on with both hands.', 'fog');
}
/** Storm ridge wind: hold on with both hands, or stay away from the edge. k 0..1. */
function gust(p, k, dir, dt) {
  if (!p.gustSaid) { p.gustSaid = true; toast(p, handsOn(p) === 2 ? 'Gust! Hold on…' : 'Gust! Grab on with both hands!'); if (p.ov) showTip(p.ov, 'wind', 'Wind gusts', 'When the wind howls, hold on with both hands. One hand, or standing on a ledge, and the gust can tear you off.', 'fog'); }
  if (p.wall) {
    const n = handsOn(p);
    if (n === 2) p.stamina -= .09 * k * dt;
    else if (n === 1) { p.stamina -= .25 * k * dt; p.gustT = (p.gustT || 0) + dt * k; if (p.gustT > 1.1) { releaseWall(p, 'The wind tore you off! Use both hands in a gust', toast); p.ex = dir * 3; } }
    else { releaseWall(p, 'A gust blew you off the ledge!', toast); p.ex = dir * 3; }
  } else if (p.hang) p.x += dir * k * 1.6 * dt;
  else { p.ex += dir * k * 7 * dt; p.ez -= k * 3.5 * dt; } // on a terrace it shoves you towards the edge
}
function reachCamp(c, by, fromNet = false, t = raceTime) {
  if (c.id <= summitCamp && fromNet) { campTimes[c.id] = t; return; } // we got there first locally: take the room's time for the Shadow pause
  if (c.id <= summitCamp) return;
  summitCamp = c.id; markCamp(c); campTimes[c.id] = t;
  if (!roundOpts.dev) { try { localStorage.setItem("ridgeline_firstsummit", "1"); } catch {} } // the guided first climb ends at Camp I
  if (mode === 'online' && net && !fromNet) net.reachCamp(c.id, raceTime, by);
  if (mode !== 'online' && !roundOpts.dev) { try { localStorage.setItem(SUMMIT_SAVE, JSON.stringify({ seed: SUMMIT.seed, pace: SUMMIT.pace, camp: c.id, t: Date.now() })); } catch {} }
  sfx.bell(); setTimeout(() => sfx.bell(), 450); fx.confetti(c.x, c.y + 2, c.z, 80, 1.95); sfx.camp(); fx.sparkle(c.x, c.y + 1, c.z, 0xffa040, 30);
  const last = c.id === SUMMIT.camps.length - 1;
  const sub = last ? `The final push · after ${RISE.pause} s the Shadow rises faster · go for the top!` : `Checkpoint saved · the Shadow pauses for ${RISE.pause} s · pitons and glowsticks refilled · fallen climbers wake up here`;
  players.forEach((q) => { if (q.ov) zoneCard(q.ov, `${c.name} reached!`, sub, 'goal'); if (q.name !== by) toast(q, `${by} reached ${c.name}`); });
  if (mode === 'online') feed(`<b>${esc(by)}</b> reached ${esc(c.name)} · checkpoint saved`, 'good');
}
// Nobody left climbing: the summit was reached (win) or the Shadow has swallowed the last camp (lose)
function checkSummitEnd() {
  if (endShown || (mode === 'online' && net && net.outcomeShown === net.round)) return;
  const all = everyone();
  if (all.some((p) => p.st === 0)) return;
  const campGone = summitSY > SUMMIT.camps[summitCamp].y - .5;
  if (!all.every((p) => p.st === 1) && !campGone) return; // the fallen can still wake at camp
  const outcome = { summit: true, win: all.some((p) => p.st === 1), time: +raceTime.toFixed(1), escaped: all.filter((p) => p.st === 1).map((p) => p.name), lost: all.filter((p) => p.st === 2).map((p) => p.name), camp: summitCamp };
  if (outcome.win) { if (mode === 'online') net?.clearSave(); else { try { localStorage.removeItem(SUMMIT_SAVE); } catch {} } }
  if (mode === 'online') { endShown = true; net?.endRound(outcome); return; }
  showEnd(outcome);
}
function updateSummitBar() {
  const p = players.find((q) => q.st === 0) || players[0], left = RISE.grace - raceTime, top = SUMMIT.topY || 1;
  const below = p ? p.y - summitSY : 0;
  const pushAt = campTimes[SUMMIT.camps.length - 1], pushing = pushAt !== undefined && raceTime > pushAt + RISE.pause;
  boltEl.style.opacity = (summitFlash * .45).toFixed(2);
  $('fogTxt').textContent = left > 0 ? `The Shadow wakes in ${Math.ceil(left)}s` : shadowCalm(raceTime, summitPauses()) ? 'Camp reached · the Shadow holds still' : pushing && below > 0 ? `Final push · the Shadow is speeding up · ${Math.round(below)} m below` : below > 0 ? `Shadow rising · ${Math.round(below)} m below you` : 'You are in the Shadow · climb!';
  $('fogFill').style.width = Math.max(0, Math.min(100, (1 - Math.max(0, summitSY) / top) * 100)) + '%';
  $('fogbar').classList.toggle('danger', left <= 0 && below < 4);
  $('doorTxt').textContent = `Camps ${summitCamp}/${SUMMIT.camps.length - 1}`;
}
/* ---------- Summit onboarding: Practice Wall, first-climb hints, tips, briefing cards · and the rewards ---------- */
const jumpKey = (p) => p.ctrl.id === 'p2' ? 'Enter' : 'Space';
const PRACTICE_STEPS = [
  ['grab', 'Grab a hold with one hand', (p) => p.mouse ? 'Look at a hold, then hold LEFT or RIGHT click' : `${jumpKey(p)} at the wall to grab it`],
  ['two', 'Climb up using both hands', (p) => p.mouse ? 'Hold one button, grab higher with the other, swap' : `${p.ctrl.id === 'p2' ? 'Up arrow' : 'W'} moves your lower hand higher`],
  ['rest', 'Rest on the stone ledge', () => 'Climb onto the ledge halfway up · your stamina refills there'],
  ['piton', 'Hammer in a piton', (p) => `Press ${p.ctrl.id === 'p2' ? '. to pick pitons, then /' : '4, then F'} while you are on the wall`],
  ['fall', 'Fall safely on the rope', () => 'Climb a metre above your piton, then let go of both hands'],
  ['haul', 'Haul a friend up', (p) => `At the top, hold ${p.ctrl.bk} near the edge to haul the sandbag up`],
];
let practice = null; // { done: Set, dummy, by, beat, hall: {x,z,yaw}, finished }
const practiceEl = document.createElement('div'); practiceEl.id = 'practice'; document.body.appendChild(practiceEl);
function enterPractice() {
  if (state !== 'lobby') return;
  const p0 = players[0], hall = p0 ? { x: p0.x, z: p0.z, yaw: p0.yaw } : null;
  closePanel(true);
  return transition(() => { leaveLobbyWorld(); enterSummitNow(4242, 0, 0, { practice: true }); practice.hall = hall; })
    .then(() => { if (isPointerMode()) lockPointer(); });
}
function renderPractice() {
  if (!practice) { practiceEl.style.display = 'none'; return; }
  const p = players[0], next = PRACTICE_STEPS.find(([id]) => !practice.done.has(id));
  practiceEl.style.display = 'block';
  practiceEl.innerHTML = `<div class="pp-h"><b>Practice Wall</b><span>${practice.done.size}/${PRACTICE_STEPS.length}</span></div>` +
    PRACTICE_STEPS.map(([id, name, hint]) => `<div class="pp-r${practice.done.has(id) ? ' done' : ''}${id === practice.fresh ? ' pop' : ''}"><i></i><div><b>${esc(name)}</b>${next && next[0] === id ? `<small>${esc(hint(p))}</small>` : ''}</div></div>`).join('') +
    `<p class="pp-done">${practice.finished ? 'All done! Back to the hall in a moment' : 'Esc · leave any time · come back whenever you like'}</p>`;
}
function endPractice() {
  if (!practice) return;
  if (practice.dummy) { scene.remove(practice.dummy.mesh); disposeClimber(practice.dummy.mesh); }
  practice = null; renderPractice(); setHintHold(null);
}
function practiceTick(dt) {
  const P = practice, f = SUMMIT.faces[0];
  const mark = (id, p) => { if (P.done.has(id)) return; P.done.add(id); P.fresh = id; sfx.chime?.(); fx.sparkle(p.x, p.y + 1.4, p.z, 0x8ee34d, 18); toast(p, `Practice · ${PRACTICE_STEPS.find((s) => s[0] === id)[1]} · done`); renderPractice(); };
  for (const p of players) {
    if (p.st !== 0) continue;
    const n = p.wall ? p.wall.hands.filter(Boolean).length : 0;
    if (n >= 1) mark('grab', p);
    if (n === 2 && p.y > 2) mark('two', p);
    if (p.wall && onLedge(p)) mark('rest', p);
    if ((p.pitonsUsed || 0) > 0) mark('piton', p);
    if ((p.ropeCatches || 0) > 0) mark('fall', p);
    // at the top: a sandbag "friend" appears hanging on your rope below the edge
    if (!P.dummy && p.ground && p.y >= SUMMIT.topY - .2) {
      const d = { dummy: true, name: 'Sandbag', st: 0, x: Math.max(f.x0 + 2, Math.min(f.x1 - 2, p.x)), y: f.y1 - 6.5, z: f.z - .45, vy: 0, ex: 0, ez: 0, stamina: 1, ctrl: { bk: 'E' }, ragId: 'sandbag', ground: false, land: 0, shake: 0, netId: 'zz' };
      d.hang = { a: null, len: 5.6, by: p, hauling: false };
      d.mesh = makeClimber(0xb07a43, 'Sandbag', { hat: 7, outfit: 2, skin: '#d9b48a', scarf: 'none', goggles: 'none' }); scene.add(d.mesh);
      P.dummy = d; P.by = p; toast(p, `Your sandbag friend is hanging below the edge · hold ${p.ctrl.bk} to haul it up`);
      if (p.ov) showTip(p.ov, 'haul', 'Haul a teammate', `Stand at the edge above them and hold ${p.ctrl.bk}. You reel them in, and it costs your stamina.`, 'stam');
    }
  }
  const d = P.dummy;
  if (d) {
    if (!d.hang && !d.ground) { d.y = Math.max(f.y0, d.y - 6 * dt); if (d.y <= f.y0) d.ground = true; } // dropped: it lands at the foot
    if (d.ground && !d.hauled && d.y < f.y1 - 1 && P.by?.st === 0 && P.by.ground && P.by.y >= SUMMIT.topY - .2) { d.ground = false; d.y = f.y1 - 6.5; d.x = Math.max(f.x0 + 2, Math.min(f.x1 - 2, P.by.x)); d.z = f.z - .45; d.hang = { a: null, len: 5.6, by: P.by, hauling: false }; } // dropped it? it goes back on the rope
    if (d.hauled) mark('haul', P.by || players[0]);
    d.mesh.position.set(d.x, d.y, d.z); d.mesh.rotation.y = d.ground ? 0 : Math.PI;
  }
  // every 3 s online, tell the room we are still here (standing in the hall where we left)
  if (mode === 'online' && net && P.hall && (P.beat = (P.beat || 0) - dt) <= 0) { P.beat = 3; net.sendState({ x: P.hall.x, y: 0, z: P.hall.z, yaw: P.hall.yaw, crank: -1, st: 3, sm: '' }); }
  if (P.done.size === PRACTICE_STEPS.length && !P.finished) {
    P.finished = true; renderPractice();
    passportStamp(players[0], 'wall'); fx.confetti(players[0].x, players[0].y + 2, players[0].z, 80); sfx.fanfare?.();
    players.forEach((q) => q.ov && zoneCard(q.ov, 'Practice Wall complete!', "You're ready for the Summit · back to the boarding hall", 'camp'));
    setTimeout(() => { if (practice?.finished && state === 'summit') toCamp(); }, 5000);
  }
}
// the first Summit climb on this device: a beacon on the next hold after 5 s of being stuck (also on the Practice Wall)
const isFirstSummit = () => { try { return !localStorage.getItem('ridgeline_firstsummit'); } catch { return false; } };
function summitHints(dt) {
  const p = players[0];
  if (!p || p.st !== 0 || p.spec || !(roundOpts.firstSummit || practice)) { setHintHold(null); return; }
  if (Math.abs(p.y - (p.hintY ?? p.y)) > .5 || p.hang) { p.hintY = p.y; p.idleT = 0; } else p.idleT = (p.idleT || 0) + dt;
  if (p.idleT < 5) { setHintHold(null); return; }
  const h = nextRouteHold(p);
  setHintHold(h, time);
  if ((p.hintToastT = (p.hintToastT || 0) - dt) <= 0) { p.hintToastT = 7; toast(p, h ? (p.mouse ? 'Try the glowing green hold · look at it and click' : `Try the glowing green hold · ${p.ctrl.id === 'p2' ? 'arrows' : 'W A S D'}`) : 'Walk up to the cliff and look up at the holds'); }
}
// one-time tips, shown the first time they matter
function summitTips(p) {
  const O = p.ov; if (!O || p.st !== 0) return;
  if (p.hang) showTip(O, 'hang', 'Caught by the rope', `Grab any hold to climb on. A teammate above can hold ${p.ctrl.bk} to haul you up.`, 'stam');
  if (partners(summitTeam, p).some((q) => q.st === 0 && q.y < p.y - 1 && !q.ground)) showTip(O, 'belay', 'Belay your team', `Hold ${p.ctrl.bk} while a teammate climbs below you: you catch their fall and can haul them up.`, 'stam');
  if (p.wall && p.stamina < .45) showTip(O, 'wallstam', 'Arms getting tired', 'Two hands drain slowly, one hand fast. Stand on a stone ledge to recover, or hang on a piton.', 'stam');
  if (p.mouse && state === 'summit') { const a = aimedHold(p); if (a && a.type === 'chalk' && !a.chalked) showTip(O, 'slick', 'Slick hold', 'Dark red holds are too slick to grip. Pick chalk (1) and click them first.', 'chalk'); }
  if (!practice && raceTime > RISE.grace && raceTime < RISE.grace + 3) showTip(O, 'rise', 'The Shadow is rising', 'Keep climbing. It holds still for a while every time your team reaches a camp.', 'fog');
  if (inChimney(p.x, p.y + 1.6, p.z)) showTip(O, 'chimney', 'Dark chimney', 'Throw a glowstick (2) at the rock. It sticks and lights up the holds around it.', 'ping');
  { const G = SUMMIT.gate; if (G && !G.open && p.y > SUMMIT.faces[G.face].y0 - .5 && p.y < G.y && Math.hypot(p.x - SUMMIT.faces[G.face].cx, p.z - SUMMIT.faces[G.face].z) < 16) showTip(O, 'gate', 'Temple gate', `The carved band above is sealed. Two climbers stand on the glowing rune ledges at the same time, or one holds ${p.ctrl.bk} at the crank at the foot of the wall.`, 'door'); }
  if (SUMMIT.tripod && p.ground && p.y >= SUMMIT.topY - .2) showTip(O, 'photo', 'Summit photo', `Walk to the tripod beside the flag and press ${p.ctrl.bk} for a team photo.`, 'ping');
}
// five picture cards for the Summit: in the briefing the first time you pick the route, and in the Field Guide
const SUMMIT_CARDS = [
  ['Grab with two hands', 'Look at a hold and hold left or right click. Grab higher holds to pull yourself up the cliff.', '<path d="M8 72 20 10h40l12 62z" fill="#9c8f82" stroke="#1b2738" stroke-width="3.5" stroke-linejoin="round"/><circle cx="30" cy="30" r="5" fill="#e9b27a" stroke="#1b2738" stroke-width="2.5"/><circle cx="50" cy="44" r="5" fill="#e9b27a" stroke="#1b2738" stroke-width="2.5"/><circle cx="36" cy="58" r="5" fill="#bfeaff" stroke="#1b2738" stroke-width="2.5"/><circle cx="30" cy="30" r="9" fill="none" stroke="#ffd23f" stroke-width="3"/>'],
  ['Mind your stamina', 'Two hands drain slowly, one hand fast. Stand on stone ledges and sit by camp fires to recover.', '<rect x="10" y="30" width="60" height="20" rx="10" fill="#fff6e5" stroke="#1b2738" stroke-width="3.5"/><rect x="14" y="34" width="34" height="12" rx="6" fill="#ffd23f"/><path d="M40 8 30 26h8l-4 14 14-20h-8l4-12z" fill="#ffd23f" stroke="#1b2738" stroke-width="2.5" stroke-linejoin="round"/><rect x="14" y="60" width="52" height="8" rx="3" fill="#9c8f82" stroke="#1b2738" stroke-width="3"/>'],
  ['Rope up and use pitons', 'You are roped to your team. Press 4 for pitons and hammer one in: it catches you if you fall.', '<path d="M14 70C30 50 20 30 40 22s30 6 26-14" fill="none" stroke="#ff7a2a" stroke-width="5" stroke-linecap="round"/><path d="M44 20l14-6" stroke="#c9ced6" stroke-width="6" stroke-linecap="round"/><circle cx="44" cy="22" r="5" fill="none" stroke="#1b2738" stroke-width="3"/><circle cx="14" cy="70" r="6" fill="#ff6f59" stroke="#1b2738" stroke-width="3"/>'],
  ['Belay and haul', 'Hold E while a teammate climbs below you: you catch their fall and can haul them up. E also boosts.', '<path d="M8 30h46v42" fill="#9c8f82" stroke="#1b2738" stroke-width="3.5"/><circle cx="26" cy="20" r="8" fill="#8ee34d" stroke="#1b2738" stroke-width="3"/><path d="M30 26C50 30 56 44 58 62" fill="none" stroke="#ff7a2a" stroke-width="4"/><circle cx="60" cy="66" r="7" fill="#2ec4f1" stroke="#1b2738" stroke-width="3"/><path d="M66 40v-12m-5 5 5-5 5 5" fill="none" stroke="#1b2738" stroke-width="3" stroke-linecap="round"/>'],
  ['Camps and the rising Shadow', 'Purple Shadow rises from below. Each camp saves your progress, refills gear and holds the Shadow back for a while.', '<rect x="6" y="52" width="68" height="22" rx="4" fill="#2b1840"/><path d="M6 52q12-8 22 0t22 0 24 0" fill="none" stroke="#b48cff" stroke-width="4"/><path d="M30 46 40 26l10 20z" fill="#ff8a3d" stroke="#1b2738" stroke-width="3" stroke-linejoin="round"/><path d="M40 26V8l12 4-12 4" fill="#ffd23f" stroke="#1b2738" stroke-width="3" stroke-linejoin="round"/>'],
];
const summitCardsHtml = () => SUMMIT_CARDS.map(([t, d, svg], i) => `<div class="pcard2" style="--i:${i}"><svg viewBox="0 0 80 80">${svg}</svg><b>${i + 1}. ${t}</b><p>${d}</p></div>`).join('');
document.querySelectorAll('.cards5.summitcards').forEach((el) => el.innerHTML = summitCardsHtml());
function summitBriefing() {
  try { if (localStorage.getItem('ridgeline_summitbrief')) return false; localStorage.setItem('ridgeline_summitbrief', '1'); } catch { return false; }
  document.querySelector('[data-panel="brief"] .cards5').innerHTML = summitCardsHtml();
  $('briefTitle').textContent = 'The Summit climb'; $('briefSub').textContent = 'Five things before you rope up. The Practice Wall door by the radio desk lets you try them all.';
  openPanel('brief'); return true;
}
// HUD key line on the mountain
const summitKeys = (p) => p.mouse ? 'L / R click grab · 1 chalk · 2 glowstick · 4 piton · E belay / boost · Space push off'
  : p.ctrl.id === 'p2' ? 'Enter grab · arrows move a hand · / use · . switch tool · , belay / boost' : 'Space grab · W A S D move a hand · F use · Q switch tool · E belay / boost';
// rewards: Gentle unlocks the Summit hat, Standard the frost scarf, Brutal the golden rope (gear locker · Gear · Summit rewards)
const REWARD_NAMES = ['the Summit hat', 'the frost scarf', 'the golden rope'];
const summitWins = () => { try { return JSON.parse(localStorage.getItem('ridgeline_summit_wins') || '[]'); } catch { return []; } };
function summitReward(p) {
  if (roundOpts.dev || practice) return;
  const pace = SUMMIT.pace ?? 1, w = summitWins();
  if (!w.includes(pace)) { w.push(pace); try { localStorage.setItem('ridgeline_summit_wins', JSON.stringify(w)); } catch {} setTimeout(() => { if (p.ov) zoneCard(p.ov, `Unlocked ${REWARD_NAMES[pace]}!`, 'Find it in the gear locker · Gear · Summit rewards', 'camp'); }, 3500); }
}
const nearTripod = (p) => !!SUMMIT.tripod && p.ground && Math.abs(p.y - SUMMIT.tripod.y) < 1.2 && Math.hypot(p.x - SUMMIT.tripod.x, p.z - SUMMIT.tripod.z) < 2.4;

/* ---------- base camp lobby ---------- */
function enterLobby() { return transition(enterLobbyNow); }
function enterLobbyNow() {
  state = 'lobby'; paused = false; endShown = false; departT = -1; departArmed = false; bellsRung = 0; raceTime = 0;
  ['banner', 'timer', 'count', 'fogbar', 'pause'].forEach((id) => $(id).style.display = 'none');
  closePanel(true);
  clearMarksAndSticks(); clearTrail(); showDecor(false); showFog(false); setGroundVisible(false);
  showSummit(false); updateClimbFx(null, false); clearRope(); showRise(false); showHazards(false); boltEl.style.opacity = 0; endPractice(); setWind(0); windOn = false;
  enterLobbyWorld(); buildDoors(); buildPuzzles(); physRebuild(1); // buildPuzzles on the hall layout just clears the braziers and runes
  players.forEach((p, i) => {
    const s = spawnSpot(i + (mode === 'online' ? Object.keys(remotes).length : 0));
    Object.assign(p, { x: s.x, z: s.z, rideX: s.x, rideZ: s.z, y: 0, vy: 0, ex: 0, ez: 0, yaw: s.yaw, pitch: 0, roll: 0, stamina: 1, exhausted: false, ground: true, done: false,
      sticks: 3, slot: 1, stumble: 0, st: 0, crank: -1, inFog: false, collapseT: 0, fogK: 0, ragdoll: false, sit: null });
    if (p.hud) { p.hud.done.style.display = 'none'; p.hud.done.classList.remove('dead'); }
  });
  Object.values(remotes).forEach((r) => { if (r.ragdoll) removeRagdoll('R' + r.id); r.ragdoll = false; r.st = 0; r.mesh.visible = true; });
  $('huds').classList.add('lobby');
  $('pRestart').style.display = 'none'; $('pLeave').querySelector('b').textContent = 'Leave to menu';
  startArrival(); sfx.grind?.(); updateBoard();
  showTraining(true); renderPassport(); $('passport').style.display = 'block';
  setTimeout(() => { if (state === 'lobby') maybeBriefing(); }, 4200);
  if (mode === 'online') sendNow();
  updateLock();
  setTimeout(() => players.forEach((p) => { if (!p.ov) return; zoneCard(p.ov, 'Ridgeline Boarding Hall', 'Board the gondola at Gate 1 together to climb', 'camp'); flashKeys(p.ov, 20); }), 3300);
  if (mode !== 'solo') setTimeout(() => players.forEach((p) => p.ov && showTip(p.ov, 'ping', 'Point things out', `Press ${p.ctrl.id === 'p2' ? "'" : p.ctrl.id === 'p1' ? 'G' : 'G or middle-click'} to ping a spot. Your team sees it through walls.`, 'ping')), 9000);
}
function leaveLobbyWorld() {
  exitLobbyWorld(); showDecor(true); showFog(true); $('huds').classList.remove('lobby'); $('depart').style.display = 'none';
  showTraining(false); $('passport').style.display = 'none';
  players.forEach((p) => { p.sit = null; p.slot = 0; });
  $('pRestart').style.display = mode === 'online' ? 'none' : ''; $('pLeave').querySelector('b').textContent = 'Back to the boarding hall';
}
// everyone aboard, doors shut, cabin rides up the cable, wipe into the maze (or onto the mountain: sm = { summit, camp, pace })
function depart(seed, sm = null) {
  const first = mode !== 'online' && isFirstClimb() && !sm;
  if (state !== 'lobby') return;
  state = 'departing'; departT = -1; closePanel(true); $('depart').style.display = 'none';
  players.forEach((p) => { p.rideX = p.x; p.rideZ = p.z; p.sit = null; });
  sfx.slam?.(); startDeparture(() => transition(() => {
    leaveLobbyWorld();
    if (sm) enterSummitNow(seed, sm.camp || 0, sm.pace ?? lobbySettings.pace);
    else { prepRound(seed, first ? { pace: 0, grace: 60, maxDoors: 1, first: true } : {}); goCountdown(); }
    if (mode === 'online' && net) net.subscribeRound(net.meta.round);
  }).then(() => { if (sm && isPointerMode()) lockPointer(); }));
}
/** Offline departure: the maze, or the Summit (a new mountain, or the saved one from its last camp). */
function departLocal() {
  if (lobbySettings.route !== 'summit') return depart(lobbySettings.daily ? dailySeed() : newSeed());
  const save = summitSave(), res = lobbySettings.resume && save;
  depart(res ? save.seed : lobbySettings.daily ? dailySeed() : newSeed(), { summit: true, camp: res ? save.camp : 0, pace: res ? (save.pace ?? 1) : isFirstSummit() ? 0 : lobbySettings.pace }); // the first Summit is always Gentle
}
function aboardCount() {
  let n = players.filter((p) => inGondola(p.x, p.z)).length, total = players.length;
  if (mode === 'online') for (const r of Object.values(remotes)) { total++; if (inGondola(r.x, r.z)) n++; }
  return { n, total };
}
function updateDeparture(dt) {
  setGateLight(departT >= 0 ? 1 : 0);
  if (state !== 'lobby' || riding() || uiOpen === 'photo') return;
  const { n, total } = aboardCount(), el = $('depart');
  if (n < total) departArmed = true; // you arrive inside the cabin, so wait until someone has stepped out once
  const all = departArmed && n === total && total > 0;
  if (departT === -99 && !all) departT = -1;
  if (all && departT === -1) { departT = 5; sfx.beep(false); }
  if (!all && departT >= 0) { departT = -1; players.forEach((p) => toast(p, 'Someone stepped off · departure paused')); }
  if (departT >= 0) {
    const before = Math.ceil(departT); departT -= dt;
    if (Math.ceil(departT) !== before && departT > 0) sfx.beep(false);
    el.style.display = 'flex'; el.querySelector('b').textContent = Math.max(0, Math.ceil(departT));
    el.querySelector('span').textContent = total > 1 ? `All ${total} aboard · departing` : 'Departing';
    if (departT <= 0) {
      departT = -1;
      if (mode === 'online' && net) { // the lowest id on board asks the room to start; everyone departs on the meta change
        const ids = [myId, ...Object.keys(remotes)].sort();
        if (ids[0] === myId) net.depart();
        setTimeout(() => { if (state === 'lobby' && departT === -99) departT = -1; }, 5000);
        departT = -99; // wait for the room
      } else { sfx.beep(true); departLocal(); }
    }
  } else if (n > 0 && departArmed) { el.style.display = 'flex'; el.querySelector('b').textContent = `${n}/${total}`; el.querySelector('span').textContent = 'Aboard the gondola · waiting for the team'; }
  else el.style.display = 'none';
}
const dailySeed = () => { const d = new Date(); return (d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate()) * 2654435761 % 2147483647; };
const PACE = ['GENTLE', 'STANDARD', 'BRUTAL'];
let boardT = 0;
function updateBoard() {
  const { n, total } = aboardCount(), g = gondola.phase;
  const st = g === 'arrive' ? 'ARRIVING' : g === 'depart' ? 'DEPARTING' : departT >= 0 ? `BOARDING · ${Math.ceil(departT)}` : 'ON PLATFORM';
  setBoard([
    'RIDGELINE CABLEWAY GATE 1',
    `GONDOLA  ${st}`,
    `SHADOW   ${PACE[lobbySettings.pace] || 'STANDARD'}`,
    lobbySettings.route === 'summit' ? `ROUTE    SUMMIT${lobbySettings.resume && resumeCamp() ? ' · ' + CAMP_NAMES[resumeCamp()].toUpperCase() : lobbySettings.daily ? ' · DAILY' : ''}` : `MAZE     ${lobbySettings.daily ? 'DAILY CLIMB' : 'RANDOM'}`,
    `ABOARD   ${n}/${total}   BELLS ${bellsRung}`,
    mode === 'online' && net ? `ROOM     ${net.room}` : isFirstClimb() ? 'NEXT     FIRST CLIMB · EASY' : `MODE     ${mode === 'local' ? 'LOCAL CO-OP' : 'SOLO'}`,
  ]);
}
setOnBell(() => { bellsRung++; players.forEach((p) => toast(p, `Bell rung! ${bellsRung} so far`)); updateBoard(); });

function interact(p, s) {
  if (s.seat) { p.sit = s.seat; p.x = s.seat.x; p.z = s.seat.z; p.yaw = s.seat.yaw; sfx.step(false); toast(p, 'Taking a seat'); return; }
  if (s.id === 'camera') return takePhoto();
  if (s.id === 'practice') return enterPractice();
  openPanel(s.id, players.indexOf(p));
}

/* gear locker, trail board, radio panels */
let panelOwner = 0;
function openPanel(id, who = 0) {
  uiOpen = id; panelOwner = Math.max(0, who); keys.clear(); document.exitPointerLock?.();
  document.querySelectorAll('.lpanel').forEach((el) => el.classList.toggle('on', el.dataset.panel === id));
  $('lpanels').style.display = 'flex'; sfx.click?.();
  if (id === 'locker') renderLocker();
  if (id === 'trail') renderTrail();
  if (id === 'radio') renderRadio();
  updateLock();
}
function closePanel(silent) {
  if (!uiOpen) return;
  const was = uiOpen; uiOpen = null; $('lpanels').style.display = 'none'; $('polaroid').style.display = 'none'; devMenu?.open(false);
  if (!silent && isPointerMode() && inGame()) lockPointer();
  if (was === 'locker' && !silent) sfx.unlock?.();
  updateLock();
}
document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => closePanel()));

function currentLook() { const p = players[panelOwner] || players[0]; return { ...DEFAULT_LOOK, jacket: p.color, ...p.look }; }
function renderLocker() {
  const p = players[panelOwner] || players[0];
  $('lkWho').textContent = players.length > 1 ? `Dressing ${p.name}` : 'Swap gear, then head back out';
  openCreator($('lockerBody'), { look: currentLook(), onChange: (lk) => { applyLook(panelOwner, lk); sfx.tink(); } });
}
function applyLook(i, lk) {
  const p = players[i]; if (!p) return;
  p.setLook(lk); LOOKS[i] = lk; saveLooks();
  fx.sparkle(p.x, p.y + 1, p.z, new THREE.Color(lk.jacket).getHex(), 18);
  if (mode === 'online' && net) { net.setLook(lk.jacket, lk); sendNow(); }
}
function renderTrail() {
  const rc = resumeCamp();
  const rows = [['route', [['Shadow maze', 'maze', 'Race the closing Shadow to the sanctuary'], ['Summit climb', 'summit', 'Rope up and climb while the Shadow rises']]],
    ['pace', [['Gentle', 0, lobbySettings.route === 'summit' ? 'Slow Shadow · lots of pitons' : 'Shadow creeps for about 13 min'], ['Standard', 1, lobbySettings.route === 'summit' ? 'The climb as it is meant' : 'Shadow creeps for about 9 min'], ['Brutal', 2, lobbySettings.route === 'summit' ? 'Fast Shadow · few pitons' : 'Shadow creeps for about 5 min']]],
    ['daily', [['Random', false, 'A new mountain every time'], ['Daily climb', true, 'Same one for everyone today']]]];
  if (lobbySettings.route === 'summit' && rc > 0) rows.push(['resume', [['Fresh start', false, 'From the trailhead'], [`Resume at ${CAMP_NAMES[rc]}`, true, 'Same mountain, from the saved checkpoint']]]);
  $('trailOpts').innerHTML = rows.map(([k, opts]) => `<div class="trow">${opts.map(([l, v, d]) => `<button class="topt${lobbySettings[k] === v ? ' on' : ''}" data-k="${k}" data-v="${v}"><b>${l}</b><small>${d}</small></button>`).join('')}</div>`).join('');
  $('trailOpts').querySelectorAll('button').forEach((b) => b.onclick = () => {
    const k = b.dataset.k, v = k === 'pace' ? +b.dataset.v : k === 'route' ? b.dataset.v : b.dataset.v === 'true';
    lobbySettings[k] = v; setPace(lobbySettings.pace); sfx.click?.(); renderTrail(); updateBoard();
    if (mode === 'online' && net) net.setSettings({ [k]: v });
    if (k === 'route' && v === 'summit') summitBriefing(); // first time only
  });
  $('trailNote').textContent = mode === 'online' ? 'Changes apply to everyone in the room.' : 'Pick your poison, then board the gondola.';
}
function inviteLink() { const u = new URL(location.href); u.search = ''; u.hash = ''; u.searchParams.set('room', net?.room || 'lobby'); return u.toString(); }
function renderRadio() {
  const online = mode === 'online' && net;
  $('radioRoom').textContent = online ? net.room : 'Offline';
  $('radioInfo').textContent = online ? `${aboardCount().total} climber${aboardCount().total === 1 ? '' : 's'} in the hall · ${peerCount()} on voice${isMuted() ? ' · you are muted' : ''}` : 'Play online to invite friends. Solo and local co-op stay on this screen.';
  $('radioLink').value = online ? inviteLink() : '';
  $('radioCopy').disabled = !online; $('radioMute').style.display = online ? '' : 'none';
  $('radioMute').querySelector('b').textContent = isMuted() ? 'Unmute mic' : 'Mute mic';
}
$('radioCopy').onclick = async () => {
  const v = $('radioLink').value; let ok = false;
  try { await navigator.clipboard.writeText(v); ok = true; } catch { $('radioLink').select(); try { ok = document.execCommand('copy'); } catch {} }
  $('radioCopy').querySelector('b').textContent = ok ? 'Copied!' : 'Select and copy'; sfx.chime?.();
  setTimeout(() => { $('radioCopy').querySelector('b').textContent = 'Copy invite link'; }, 1600);
};
$('radioMute').onclick = () => { toggleMute(); renderRadio(); };

/* group photo: 3-2-1 from the tripod, then a polaroid pinned to the memories board */
// opts.summit: the tripod on the summit (its own camera, the mountain sky, a summit caption)
function takePhoto(opts = {}) {
  if (uiOpen) return;
  uiOpen = 'photo'; let n = 3; const el = $('photoCount');
  players.forEach((p) => { p.wave = 3.6; toast(p, opts.summit ? 'Summit photo! Stand by the flag and wave' : 'Group photo! Get in front of the fire and wave'); });
  el.style.display = 'flex';
  const tick = () => {
    if (uiOpen !== 'photo') { el.style.display = 'none'; return; }
    if (n > 0) { el.textContent = n; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); sfx.beep(false); n--; setTimeout(tick, 800); return; }
    el.style.display = 'none'; snap(opts);
  };
  tick();
}
function snap(opts = {}) {
  const pc = opts.summit ? SUMMIT.cam : photoCam;
  sfx.shutter(); flashCamera();
  const W = 640, H = 480, w = innerWidth, h = innerHeight;
  // draw one frame from the tripod camera, everyone visible
  players.forEach((q) => q.mesh.visible = !q.ragdoll);
  if (opts.summit) applyRiseFog(renderer, pc.position.y, summitSY, SUMMIT_SKY); else applyViewFog(renderer, pc.position.x, pc.position.z, 0, false, LOBBY_SKY);
  renderer.setScissorTest(false); renderer.setViewport(0, 0, w, h);
  pc.aspect = w / h; pc.updateProjectionMatrix(); renderer.render(scene, pc);
  const shot = document.createElement('canvas'); shot.width = W; shot.height = H;
  const g = shot.getContext('2d'), src = renderer.domElement, sw = src.width, sh = src.height, crop = Math.min(sw, sh * 4 / 3);
  g.drawImage(src, (sw - crop) / 2, (sh - crop * .75) / 2, crop, crop * .75, 0, 0, W, H);
  // warm film look
  g.globalCompositeOperation = 'soft-light'; g.fillStyle = 'rgba(255,170,90,.35)'; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over';
  const v = g.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, H * .85); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(40,20,10,.45)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
  pinPhoto(shot);
  const card = document.createElement('canvas'); card.width = W + 60; card.height = H + 170;
  const c = card.getContext('2d'); c.fillStyle = '#fffdf6'; c.fillRect(0, 0, card.width, card.height); c.drawImage(shot, 30, 30);
  const names = players.map((p) => p.name).concat(Object.values(remotes).map((r) => r.name)).join(' · ');
  c.fillStyle = '#1b2738'; c.font = '900 34px "Lilita One", "Arial Rounded MT Bold", system-ui'; c.textAlign = 'center';
  c.fillText(opts.summit ? `THE SUMMIT · ${fmt(raceTime)}` : 'RIDGELINE CABLEWAY', card.width / 2, H + 90);
  c.font = '600 20px system-ui'; c.fillStyle = '#5a6475'; c.fillText(`${names}  ·  ${new Date().toLocaleDateString()}`.slice(0, 64), card.width / 2, H + 128);
  const url = card.toDataURL('image/png');
  $('polImg').src = url; $('polSave').href = url;
  $('polaroid').style.display = 'flex'; $('lpanels').style.display = 'none';
  uiOpen = 'polaroid'; document.exitPointerLock?.(); updateLock();
}
const LOBBY_SKY = new THREE.Color(0xf2b98a);

/* ---------- modes ---------- */
function clearPlayers() {
  players.forEach((p) => p.dispose()); players = [];
  Object.values(remotes).forEach((r) => scene.remove(r.mesh)); remotes = {};
  $('huds').innerHTML = ''; $('roster').style.display = 'none';
  feedEl.innerHTML = ''; netWarn.style.display = 'none'; qchatEl.classList.remove('on');
}
function setupPlayers(m, opts = {}) {
  clearPlayers(); mode = m; paused = false;
  const mk = (i, color, name, ctrl, mouse) => { const look = lookFor(i, color); return new Climber({ color: look.jacket, name, ctrl, mouse, look }); };
  if (m === 'local') players = [mk(0, COLORS[1], 'Climber 1', CTRL.p1, false), mk(1, COLORS[2], 'Climber 2', CTRL.p2, false)];
  if (m === 'solo') players = [mk(0, COLORS[1], 'You', CTRL.mouse, true)];
  if (m === 'online') players = [new Climber({ color: opts.color, name: opts.name, ctrl: CTRL.mouse, mouse: true, look: { ...lookFor(0, opts.color), jacket: opts.color } })];
  buildHuds();
  $('pauseBtn').style.display = 'block';
  $('pRestart').style.display = m === 'online' ? 'none' : '';
}
async function startLocal(m, o = {}) {
  audioInit(SET.vol); state = 'loading';
  lobbySettings.pace = 1; lobbySettings.daily = false; lobbySettings.route = 'maze'; lobbySettings.resume = false; setPace(1);
  await runLoading(m === 'solo' ? 'Solo climb' : 'Local co‑op', [
    ['Lacing up boots', 260],
    ['Unpacking your gear locker', () => { setupPlayers(m); }],
    ['Opening the boarding hall', 260],
    ['Calling the gondola', 220],
    ['Arriving at the boarding hall', () => enterLobbyNow()],
  ]);
  if (state !== "lobby") return;
  if (o.practice) { enterPractice(); return; }
  if (o.route === "summit") { lobbySettings.route = "summit"; updateBoard(); if (!uiOpen) summitBriefing(); }
}

const handlers = {
  onMeta(m) {
    if (!net) return;
    net.meta = m;
    if (m.pace !== undefined && m.pace !== lobbySettings.pace) { lobbySettings.pace = m.pace; setPace(m.pace); }
    if (m.daily !== undefined) lobbySettings.daily = !!m.daily;
    lobbySettings.route = m.route === 'summit' ? 'summit' : 'maze'; lobbySettings.resume = !!m.resume;
    if (uiOpen === 'trail') renderTrail();
    if (inLobby()) updateBoard();
    // the room set off up the mountain: ride the gondola (or go straight there if we are not in the hall)
    if (m.phase === 'summit' && m.round !== net.round) {
      net.startAt = m.startAt || net.now(); net.outcomeShown = -1; net.round = m.round;
      if (state === 'lobby') { depart(m.seed, { summit: true, camp: m.camp || 0, pace: m.pace ?? 1 }); return; }
      if (state === 'departing') return;
      transition(() => { if (inLobby() || $('huds').classList.contains('lobby')) leaveLobbyWorld(); enterSummitNow(m.seed, m.camp || 0, m.pace ?? 1, { late: true, startCamp: m.startCamp ?? 0 }); net.subscribeRound(m.round); }).then(() => lockPointer());
      return;
    }
    // the room left for a new maze: ride the gondola up (or jump straight in if we are not at camp)
    if (m.phase === 'maze' && m.round !== net.round) {
      net.startAt = m.startAt || net.now(); net.outcomeShown = -1; net.round = m.round;
      if (state === 'lobby') { depart(m.seed); return; }
      if (state === 'departing') return;
      if (inLobby()) leaveLobbyWorld();
      startRound(m.seed); net.subscribeRound(m.round); return;
    }
    if (m.phase === 'lobby' && !inLobby() && inGame()) { enterLobby(); return; }
    if ((m.phase === 'maze' || m.phase === 'summit') && m.outcome && net.outcomeShown !== m.round) {
      net.outcomeShown = m.round;
      showEnd({ summit: !!m.outcome.summit, camp: m.outcome.camp || 0, win: !!m.outcome.win, time: m.outcome.time || 0, escaped: m.outcome.escaped || [], lost: m.outcome.lost || [] });
      const rd = m.round; setTimeout(() => net?.backToLobby(rd), 8000);
    }
  },
  onPlayers(ps) {
    const firstCall = !net?.seenRoster; if (net) { net.seenRoster = true; net.ps = ps; }
    for (const [id, p] of Object.entries(ps)) {
      if (id === myId) continue;
      if (!p.name) continue; // a half-written record while someone reconnects: wait for the full one
      let r = remotes[id];
      const lk = (() => { try { return JSON.parse(p.look || '{}'); } catch { return {}; } })();
      if (!r) {
        r = remotes[id] = { id, name: p.name, color: p.color, remote: true, lookStr: p.look || '', mesh: makeClimber(p.color, p.name, lk), x: p.x, y: p.y || 0, z: p.z, yaw: p.yaw, snaps: [] }; scene.add(r.mesh);
        if (!firstCall) { feed(`${chip(p.color)}<b>${esc(p.name)}</b> joined the room`); sfx.chime?.(); }
      }
      else if ((p.look || '') !== r.lookStr || p.color !== r.color) {
        r.lookStr = p.look || ''; r.color = p.color; const vis = r.mesh.visible;
        scene.remove(r.mesh); disposeClimber(r.mesh); r.mesh = makeClimber(p.color, p.name, lk); r.mesh.visible = vis; scene.add(r.mesh);
        if (inLobby()) fx.sparkle(r.x, r.y + 1, r.z, new THREE.Color(p.color).getHex(), 14);
      }
      const st = p.st || 0;
      if (r.st !== undefined && r.st !== st && state === 'summit') {
        if (st === 1) feed(`${chip(p.color)}<b>${esc(p.name)}</b> reached the summit!`, 'good');
        if (st === 2) feed(`${chip(p.color)}<b>${esc(p.name)}</b> is down · stand at a camp to bring them back`, 'bad');
        if (st === 0 && r.st === 2) feed(`${chip(p.color)}<b>${esc(p.name)}</b> is back on their feet`);
      }
      if (r.st !== undefined && r.st !== st && state === 'racing') {
        if (st === 1) feed(`${chip(p.color)}<b>${esc(p.name)}</b> reached the sanctuary`);
        if (st === 2) feed(`${chip(p.color)}<b>${esc(p.name)}</b> was taken by the Shadow`, 'bad');
      }
      pushSnap(r, p);
      r.skin = lk.skin; r.tx = p.x; r.ty = p.y || 0; r.tz = p.z; r.tyaw = p.yaw; r.st = st; r.crank = p.crank ?? -1; r.sm = p.sm || '';
    }
    for (const id of Object.keys(remotes)) if (!ps[id]) { feed(`${chip(remotes[id].color)}<b>${esc(remotes[id].name)}</b> left the room`, 'dim'); removeRagdoll('R' + id); if (remotes[id].rp) { remotes[id].rp.gone = true; remotes[id].rp.st = 2; } scene.remove(remotes[id].mesh); delete remotes[id]; }
    syncPeers(Object.keys(remotes));
    renderRoster();
  },
  onMark: (d, k) => addMark(d, k),
  onStick: (d, k) => spawnStick(d, k, d.owner === myId ? (s) => net?.restStick(k, s) : null),
  onStickRest: (d, k) => settleStick(k, d),
  onEvent: (ev) => {
    if (ev?.type === 'snow') { if (inLobby()) throwSnowball(+ev.x, +ev.y, +ev.z, +ev.vx, +ev.vy, +ev.vz, ev.c ? String(ev.c) : '#ffd23f'); return; }
    if (ev?.type === 'ping') { addPing(+ev.x, +ev.y, +ev.z, String(ev.from || 'Climber').slice(0, 16), String(ev.c || '#ffd23f')); return; }
    if (ev?.type === 'chat') { showChat(String(ev.from || 'Climber').slice(0, 16), String(ev.c || '#ffd23f'), clamp(Math.floor(+ev.i) || 0, 0, QUICK.length - 1), String(ev.id || '')); return; }
    // Summit rope: an online teammate fell on our rope
    if (ev?.type === 'jolt' || ev?.type === 'yank' || ev?.type === 'belay') {
      const p = players[0], from = String(ev.from || 'Climber').slice(0, 16); if (!p || state !== 'summit' || p.st !== 0) return;
      if (ev.type === 'belay') { p.stamina -= BELAY_HIT; toast(p, `Caught ${from}!`); p.shake = Math.max(p.shake, .3); }
      else if (ev.type === 'jolt') jolt(p, null, from, { toast });
      else releaseWall(p, `${from} yanked you off the wall!`, toast);
      return;
    }
    applyHit(players[0], ev);
  },
  onConnection: (ok) => { netWarn.style.display = ok ? 'none' : 'block'; if (ok) { feed('Reconnected to the room', 'good'); sendNow(); } },
  onDoor: (id) => {
    if (id >= 100) { if (lightBrazier(id - 100)) brazierToast(id - 100); return; } // braziers share the doors list, offset by 100
    const d = maze?.doors?.[id]; if (d?.kind && !d.latched) gateToast(d.kind);
    latchDoor(id);
  },
  onSignal: (from, msg) => onSignal(from, msg),
  // Summit shared world (summit/{round}/...): late joiners get all of it on subscribe
  onPiton: (d, key) => { if (state === 'summit' && SUMMIT.built) addPiton(d, key); },
  onHoldBreak: (id) => { const h = SUMMIT.holds[id]; if (h && !h.broken) { breakHold(h); fx.dust(h.x, h.y, h.z - .2, 10, .6, 0x8a6a4a); } },
  onChalk: (id) => { const h = SUMMIT.holds[id]; if (h && !h.chalked) chalkHold(h); },
  onGate: (id) => { if (SUMMIT.gate && SUMMIT.gate.face === id) gateOpened('remote', false); },
  onCamp: (id, d) => { const c = SUMMIT.camps[id]; if (c && state === 'summit') reachCamp(c, String(d.by || 'A climber').slice(0, 16), true, +d.t || raceTime); },
};
function sendNow() { sendTimer = 0; lastSent.t = 0; }

async function startOnline() {
  if (!sdkReady) return;
  const name = $('inName').value.trim().slice(0, 16) || 'Climber', room = $('inRoom').value.trim() || 'lobby';
  try { localStorage.setItem('ridgeline_name', name); } catch {}
  audioInit(SET.vol); state = 'loading'; $('onlineMsg').textContent = '';
  let n = null, inMaze = false, inSummit = false;
  const saved = LOOKS[0] ? lookFor(0, '') : {};
  try {
    await runLoading('Online expedition', [
      ['Lacing up boots', 200],
      ['Radioing the boarding hall', async () => { n = await Promise.race([joinRoom(room, name, handlers, saved), sleep(12000).then(() => { throw new Error('timeout'); })]); }],
      ['Checking who is in the hall', () => {
        net = n; net.outcomeShown = -1; net.startAt = n.meta.startAt; inMaze = n.meta.phase === 'maze'; inSummit = n.meta.phase === 'summit';
        lobbySettings.pace = n.meta.pace ?? 1; lobbySettings.daily = !!n.meta.daily; lobbySettings.route = n.meta.route === 'summit' ? 'summit' : 'maze'; lobbySettings.resume = !!n.meta.resume; setPace(lobbySettings.pace);
        setupPlayers('online', { color: n.color, name });
        if (inMaze) prepRound(n.meta.seed);
        if (inSummit) enterSummitNow(n.meta.seed, n.meta.camp || 0, n.meta.pace ?? 1, { late: true, startCamp: n.meta.startCamp ?? 0 }); // late join: spawn at the team's highest camp
      }],
      ['Warming up the radio', async () => {
        const ok = await Promise.race([startVoice({ myId, send: (to, msg) => n.signal(to, msg) }), sleep(15000).then(() => false)]);
        if (!ok) setTimeout(() => players[0] && toast(players[0], 'No mic: you can still hear others'), 4500);
      }],
      ['Arriving at the boarding hall', () => { if (!inMaze && !inSummit) enterLobbyNow(); }],
    ]);
  } catch (e) {
    console.error(e); if (n) n.leave(); stopVoice(); net = null; clearPlayers(); mode = null; state = 'menu';
    showMenu('online');
    $('onlineMsg').textContent = /permission/i.test(e?.message || '') ? 'Firebase said no. Publish the database rules first.' : "Couldn't reach Firebase. Check the database rules and your connection.";
    return;
  }
  if (inMaze) { goCountdown(); setTimeout(() => players[0] && toast(players[0], 'Your team was already climbing, so you joined them'), 1200); }
  if (inSummit) setTimeout(() => players[0] && toast(players[0], 'Your team is on the mountain, so you joined them at their camp'), 1200);
  net.start();
  if (pendingRoute && !inMaze && !inSummit) net.setSettings({ route: pendingRoute }); // came in through Summit climb · Online summit
  pendingRoute = null;
}

/* ---------- pause & menus ---------- */
function showPView(v) {
  document.querySelectorAll('.pview').forEach((el) => el.classList.toggle('on', el.dataset.p === v));
  if (v === 'settings') $('pauseSettings').appendChild($('settingsBlock'));
  if (v === 'guide') $('pauseGuide').appendChild($('guideBlock'));
}
function setPause(v) {
  if (!inGame()) return;
  paused = v; $('pause').style.display = v ? 'flex' : 'none';
  if (v) {
    showPView('main'); keys.clear(); closePanel(true); document.exitPointerLock?.();
    $('pInfo').textContent = inLobby() ? `Boarding hall${mode === 'online' && net ? ' · room ' + net.room : ''}` : `No. ${pad(seed % 1000)} · ${fmt(raceTime)}${mode === 'online' ? ' · live' : ''}`;
    $('pLeave').querySelector('b').textContent = practice ? 'Back to the boarding hall' : inLobby() || mode === 'online' ? 'Leave to menu' : 'Back to the boarding hall';
    $('pRestart').style.display = inLobby() || mode === 'online' ? 'none' : '';
  }
  else if (isPointerMode() && state !== 'finished') lockPointer();
  updateLock();
}
function showMenu(screen = 'main') {
  $('menu').style.display = 'block';
  document.querySelectorAll('.screen').forEach((el) => el.classList.toggle('on', el.dataset.s === screen));
  if (screen === 'settings') $('menuSettings').appendChild($('settingsBlock'));
  if (screen === 'guide') $('menuGuide').appendChild($('guideBlock'));
  if (screen === 'online') setTimeout(() => $('inName').focus(), 50);
  if (screen === 'creator') openMenuCreator();
  if (screen === "summit") { const w = summitWins(); $("summitBadges").textContent = w.length ? `Summits: ${["Gentle", "Standard", "Brutal"].filter((_, i) => w.includes(i)).join(" · ")}` : "No summits yet · Gentle unlocks the Summit hat, Standard the frost scarf, Brutal the golden rope"; }
}
const hideMenu = () => { $('menu').style.display = 'none'; };
// main-menu creator: edit Climber 1 (and Climber 2 for local co-op) before you ever leave the menu
let creatorFor = 0;
const DEFAULT_JACKET = [COLORS[1], COLORS[2]];
function openMenuCreator() {
  openCreator($('menuCreator'), {
    look: lookFor(creatorFor, DEFAULT_JACKET[creatorFor]),
    onChange: (lk) => { LOOKS[creatorFor] = lk; saveLooks(); sfx.tink(); },
    who: { names: ['Climber 1', 'Climber 2 (local co-op)'], index: creatorFor, onPick: (i) => { creatorFor = i; openMenuCreator(); } },
  });
}
function toMenu() { if (state !== 'menu') transition(toMenuNow); }
function toMenuNow() {
  if (net) { net.leave(); net = null; }
  stopVoice();
  mode = null; state = 'menu'; paused = false;
  closePanel(true); departT = -1;
  clearTrail();
  if (inLobby() || $('huds').classList.contains('lobby')) leaveLobbyWorld();
  showSummit(false); updateClimbFx(null, false); clearRope(); showRise(false); showHazards(false); boltEl.style.opacity = 0; endPractice(); setWind(0); windOn = false;
  if (maze?.lobby) { setGroundVisible(true); buildMaze(seed || 20261126); buildDoors(); }
  mode = null; state = 'menu';
  clearPlayers(); clearMarksAndSticks(); physClear(); document.exitPointerLock?.();
  ['depart', 'photoCount', 'polaroid', 'lpanels'].forEach((id) => $(id).style.display = 'none');
  ['banner', 'timer', 'count', 'pauseBtn', 'roster', 'lock', 'pause', 'fogbar'].forEach((id) => $(id).style.display = 'none');
  refreshBest(); showMenu('main');
}
addEventListener('pagehide', () => net?.leave());

document.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => showMenu(b.dataset.go)));
document.querySelectorAll('[data-pgo]').forEach((b) => b.addEventListener('click', () => showPView(b.dataset.pgo)));
$('mSolo').onclick = () => startLocal('solo');
$('mLocal').onclick = () => startLocal('local');
// Summit climb menu: the same boarding hall, with the Summit route already picked (or straight through the Practice Wall door)
let pendingRoute = null; // set by Online summit: switch the room to the Summit once we are in
$("sumSolo").onclick = () => startLocal("solo", { route: "summit" });
$("sumLocal").onclick = () => startLocal("local", { route: "summit" });
$("sumPractice").onclick = () => startLocal("solo", { practice: true });
$("sumOnline").onclick = () => { pendingRoute = "summit"; showMenu("online"); };
document.querySelector("#menu [data-go=\"online\"]")?.addEventListener("click", () => { pendingRoute = null; });
$('goOnline').onclick = startOnline;
$('inRoom').addEventListener('keydown', (e) => { if (e.key === 'Enter') startOnline(); });
$('pResume').onclick = () => setPause(false);
$('pRestart').onclick = () => { paused = false; $('pause').style.display = 'none'; newMaze(); if (isPointerMode()) lockPointer(); };
// in the maze (solo/local) leave goes back to base camp; from camp or online it goes to the menu
const toCamp = () => { paused = false; $('pause').style.display = 'none'; enterLobby().then(() => { if (isPointerMode()) lockPointer(); }); };
$('pLeave').onclick = () => (practice ? toCamp() : inLobby() || mode === 'online' ? toMenu() : toCamp()); // the Practice Wall always goes back to the hall
$('pauseBtn').onclick = () => setPause(!paused);
$('again').onclick = () => { newMaze(); if (isPointerMode()) lockPointer(); };
$('toMenu').onclick = () => (mode === 'online' ? toMenu() : toCamp());
try { $('inName').value = localStorage.getItem('ridgeline_name') || ''; } catch {}

/* ---------- loop ---------- */
const clock = new THREE.Clock(), menuCam = new THREE.PerspectiveCamera(55, 1, .1, 1200);
let time = 0;
function update(dt) {
  time += dt; frameDt = dt; updateWorld(dt); decorUpdate(dt); updateLobby(paused && mode !== 'online' ? 0 : dt);
  if (!inGame()) {
    const t = time * .06; menuCam.position.set(CX + Math.cos(t) * SIZE * .78, SIZE * .52, CX + Math.sin(t) * SIZE * .78); menuCam.lookAt(CX, 0, CX);
    updateFog(0, dt, false);
    taps.clear(); return;
  }
  const frozen = (paused || uiOpen === 'dev') && mode !== 'online';
  if (!frozen) {
    const online = mode === 'online' && net;
    if (state === 'countdown') {
      countdown = online ? (net.startAt - net.now()) / 1000 : countdown - dt;
      const n = Math.ceil(countdown), el = $('count');
      if (n !== lastCount) { lastCount = n; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); if (n <= 0) el.classList.add('go'); else el.classList.remove('go'); if (n > 0 && n <= 3) sfx.beep(false); }
      el.style.display = 'flex'; el.textContent = n > 3 ? '…' : n > 0 ? n : 'GO!';
      if (countdown <= 0) { state = 'racing'; sfx.beep(true); players.forEach((p) => p.ov && zoneCard(p.ov, roundOpts.first ? 'Your first climb' : 'Reach the Sanctuary', roundOpts.first ? `Gentle Shadow · one stone gate · ${GRACE}s head start` : (GRACE > 1e6 ? "Follow the compass · the Shadow is asleep (dev)" : `Follow the compass · the Shadow wakes in ${GRACE}s`), 'goal')); setTimeout(() => { if (state !== 'countdown') el.style.display = 'none'; }, 600); }
    }
    if (windOn && state !== 'summit') { windOn = false; setWind(0); } // off the mountain: no wind bed
    if (state === 'summit' || (state === 'finished' && roundOpts.summit)) {
      // online the clock comes from the room's startAt, so the Shadow is at the same height for everyone (and late joiners)
      if (state === 'summit') raceTime = online ? Math.max(0, (net.now() - net.startAt) / 1000) : raceTime + dt;
      $('timer').textContent = fmt(raceTime);
      summitTeam = teamList();
      players.forEach((p) => { specPre(p); stepClimber(p, dt, time); specPost(p, dt); });
      if (SUMMIT.built) summitTick(dt);
      updateClimbFx(players[0], !paused && !players[0]?.spec, time); updateSummitWorld(time, players[0], stickList(), summitFlash); updateSummitBar();
      updateRemotes(dt); updateFx(dt); updateSticks(dt, (s) => { sfx.tink(); fx.sparkle(s.x, s.y, s.z, s.c, 3); });
      if (practice) Object.values(remotes).forEach((r) => { r.mesh.visible = false; }); // they are in the hall, not here
      physStep(dt, players.map((p) => ({ id: p.ragId, x: p.x, y: p.y, z: p.z, down: p.st === 2 })));
      updateFog(0, dt, false);
      if (online && players[0] && !practice) netTick(dt, false); // on the Practice Wall the room only gets a heartbeat (practiceTick)
      taps.clear(); return;
    }
    if (inLobby()) {
      players.forEach((p) => stepClimber(p, dt, time));
      updateRemotes(dt); updateFx(dt); updateDeparture(dt);
      lobbyTraining(dt);
      boardT -= dt; if (boardT <= 0) { boardT = .5; updateBoard(); }
      physStep(dt, []);
      updateFog(0, dt, false);
      if (online && players[0]) netTick(dt, false);
      taps.clear(); return;
    }
    if (state === 'racing') raceTime = online ? Math.max(0, (net.now() - net.startAt) / 1000) : raceTime + dt;
    $('timer').textContent = fmt(raceTime);
    updateFogBar();
    players.forEach((p) => { specPre(p); stepClimber(p, dt, time); specPost(p, dt); });
    players.forEach(checkTips);
    updatePuzzles(dt, players.filter((p) => p.st === 0).map((p) => ({ x: p.x, y: p.y, z: p.z })).concat(Object.values(remotes).filter((r) => (r.st || 0) === 0).map((r) => ({ x: r.x, y: r.y, z: r.z }))), {
      onSolve: (id, kind) => { if (maze.doors[id]?.latched) return; gateToast(kind); latchDoor(id); if (mode === 'online' && net) net.latchDoor(id); const c = doorAt(id); fx.ring(c.x, 2.2, c.z, kind === 'ember' ? 0xff8a3d : 0x3dffd2); fx.sparkle(c.x, 1, c.z, 0xffd23f, 30); },
      onRune: (ok, s) => players.forEach((p) => { if (Math.hypot(p.x - doorAt(s.d.id).x, p.z - doorAt(s.d.id).z) < C * 3) toast(p, ok ? `Rune ${s.step} of ${s.d.order.length}!` : 'Wrong rune · the sequence reset'); }),
    });
    updateRemotes(dt);
    updateSticks(dt, (s) => { sfx.tink(); fx.sparkle(s.x, s.y, s.z, s.c, 3); const bz = state === 'racing' ? igniteAt(s.x, s.y, s.z) : -1; if (bz >= 0) lightLocal(bz, null); });
    updateFx(dt);
    const people = players.map((p) => ({ x: p.x, y: p.y, z: p.z, crank: p.crank })).concat(Object.values(remotes).map((r) => ({ x: r.x, y: r.y, z: r.z, crank: r.crank ?? -1 })));
    updateDoors(dt, people, {
      onLatch: (id) => { if (online) net.latchDoor(id); const c = doorAt(id); fx.ring(c.x, 2.2, c.z, 0xffa24a); fx.sparkle(c.x, .5, c.z, 0xffd23f, 24); players.forEach((p) => toast(p, `Door ${id + 1} of ${doorCount()} is open!`)); },
      onSlam: (d) => { const c = doorCenter(d.id); fx.dust(c.x, 0, c.z, 26, 1.8, 0xd8d2c8); players.forEach((p) => { const dist = Math.hypot(p.x - c.x, p.z - c.z); if (dist < 16) { p.land = .9; p.stumble = Math.max(p.stumble, .5); p.shake = Math.max(p.shake, 1 - dist / 16); toast(p, 'The door slammed shut!'); if (p.ov) showTip(p.ov, 'slam', 'Slam!', 'Doors drop if someone steps off a plate or lets go of the crank before the door is fully up.', 'door'); } }); },
      onGrind: (d) => { const c = doorCenter(d.id); fx.dust(c.x + (Math.random() - .5) * 3, 0, c.z + (Math.random() - .5) * 3, 3, .5, 0xd8d2c8); players.forEach((p) => { if (Math.hypot(p.x - c.x, p.z - c.z) < 10) p.shake = Math.max(p.shake, .18); }); },
    });
    if (state === 'racing' && !(online && net.outcomeShown === net.round)) checkEnd();
    physStep(dt, players.map((p) => ({ id: p.ragId, x: p.x, y: p.y, z: p.z, down: p.st === 2 }))
      .concat(Object.values(remotes).map((r) => ({ id: 'R' + r.id, x: r.x, y: r.y, z: r.z, down: r.st === 2 }))));
    updateFog(raceTime, dt, state === 'racing');
    if (online && players[0]) netTick(dt, true);
  }
  taps.clear();
}
function netTick(dt, maze) {
  updateVoice(players[0], remotes, (x, z) => maze && state === 'racing' && fogDepth(x, z, raceTime) > 0);
  sendTimer -= dt;
  rosterT -= dt; if (rosterT <= 0) { rosterT = 1; renderRoster(); }
  if (sendTimer <= 0) {
    sendTimer = .075; const p = players[0], now = Date.now(), st = p.sit ? 3 : p.st;
    const sm = state === 'summit' || (state === 'finished' && roundOpts.summit) ? smOf(p) : '', ck = p.climbing || p.wall ? -2 : p.crank; // -2: on the rock (remote climbing pose)
    const moved = Math.abs(p.x - lastSent.x) > .03 || Math.abs(p.z - lastSent.z) > .03 || Math.abs(p.y - lastSent.y) > .03 || Math.abs(p.yaw - lastSent.yaw) > .02 || p.crank !== lastSent.crank || st !== lastSent.st || sm !== lastSent.sm;
    if (moved || now - lastSent.t > 3000) { lastSent = { x: p.x, y: p.y, z: p.z, yaw: p.sit ? p.sit.yaw : p.yaw, crank: ck, st, sm, t: now }; net.sendState({ x: p.x, y: p.y, z: p.z, yaw: lastSent.yaw, crank: ck, st, sm }); }
  }
}
function updateFogBar() {
  const left = GRACE - raceTime, r = fogRadius(raceTime), pct = Math.round(r / fogRadius(0) * 100);
  $('fogTxt').textContent = state !== 'racing' ? 'The Shadow sleeps…' : GRACE > 1e6 ? 'The Shadow sleeps (dev menu)' : left > 0 ? `Shadow wakes in ${Math.ceil(left)}s` : `Shadow closing · ${pct}% light left`;
  $('fogFill').style.width = (left > 0 ? 100 : pct) + '%';
  $('fogbar').classList.toggle('danger', left <= 0 && pct < 30);
  $('doorTxt').textContent = doorCount() ? `Gates ${doorsOpen()}/${doorCount()}` : '';
}
function render() {
  const w = innerWidth, h = innerHeight, dt = Math.min(.05, clock.elapsedTime - (render.last ?? clock.elapsedTime)); render.last = clock.elapsedTime;
  if (!inGame() || !players.length) {
    lightMood('day', dt); followShadow(CX, 0, CX, 70); Object.assign(POST.mist, { base: 0, fall: 3, max: .25, reach: 90 });
    menuCam.aspect = w / h; menuCam.updateProjectionMatrix();
    renderViews([{ cam: menuCam, x: 0, y: 0, w, h }], () => { applyViewFog(renderer, CX, CX, 0, false, zoneFog(0, 0)); }, () => {});
    return;
  }
  const n = players.length, vw = w / n, summitView = state === 'summit' || (state === 'finished' && roundOpts.summit);
  // where the action is: the shadow box and the light mood follow the (first) local climber or whoever they watch
  const eyes = players.map((p) => { const sp = p.spec && remotes[p.spec]; return sp ? { x: sp.x, y: sp.y || 0, z: sp.z } : { x: p.x, y: p.y, z: p.z }; });
  const fx0 = eyes.reduce((s, e) => s + e.x, 0) / n, fy0 = eyes.reduce((s, e) => s + e.y, 0) / n, fz0 = eyes.reduce((s, e) => s + e.z, 0) / n;
  const spread = n > 1 ? Math.hypot(eyes[0].x - eyes[1].x, eyes[0].y - eyes[1].y, eyes[0].z - eyes[1].z) : 0;
  followShadow(fx0, fy0, fz0, Math.min(90, Math.max(summitView ? 36 : inLobby() ? 60 : 45, spread / 2 + 30))); // smaller box = sharper shadows; big enough that the edge stays in the fog
  lightMood(summitView ? ['day', 'ice', 'temple', 'storm', 'summit'][zoneAtY(eyes[0].y)] : inLobby() ? 'day' : ['day', 'ice', 'temple'][zoneAt(eyes[0].x, eyes[0].z)] || 'day', dt);
  // height mist: ground haze in the maze and the hall, a sea of cloud far below you on the mountain
  Object.assign(POST.mist, summitView ? { base: 0, fall: 26, max: .55, reach: 140 } : inLobby() ? { base: 0, fall: 1.6, max: .18, reach: 110 } : { base: 0, fall: 2.4, max: .32, reach: 75 });
  const views = players.map((p, i) => ({ cam: p.cam, x: i * vw, y: 0, w: vw, h, p }));
  renderViews(views, ({ p }) => {
    p.cam.aspect = vw / h;
    const sp = p.spec && remotes[p.spec];
    players.forEach((q) => q.mesh.visible = (q !== p || !!sp) && !q.ragdoll);
    if (summitView) {
      const ex = sp ? sp.x : p.x, ey = sp ? (sp.y || 0) + 1.6 : p.cam.position.y, ez = sp ? sp.z : p.z;
      p.fogK = applyRiseFog(renderer, ey, summitSY, SUMMIT_SKY);
      if (inChimney(ex, ey, ez)) renderer.toneMappingExposure *= .4; // the chimney is dark: bring a glowstick
      if (zoneAtY(ey) === 3) renderer.toneMappingExposure *= .8; // storm clouds
      renderer.toneMappingExposure += summitFlash * .9;
    }
    else if (inLobby()) { p.fogK = applyViewFog(renderer, p.x, p.z, 0, false, LOBBY_SKY); scene.fog.near = 40; scene.fog.far = 340; if (inPuddle(p.x, p.z) && p.y < .5) p.fogK = .75; }
    else p.fogK = applyViewFog(renderer, sp ? sp.x : p.x, sp ? sp.z : p.z, raceTime, state === 'racing' && (sp || p.st !== 1), zoneFog(sp ? sp.x : p.x, sp ? sp.z : p.z));
    p.cam.far = Math.max(60, scene.fog.far * 1.1); // nothing past the fog gets drawn: it would be invisible anyway
    p.cam.updateProjectionMatrix();
  }, ({ p }) => {
    const sp = p.spec && remotes[p.spec];
    if (!sp) renderViewmodel(renderer, p.vm, vw / h, players.map((q) => q.vm));
    drawMarkers(p, vw, h);
  });
}
/* ---------- online extras: event feed, quick chat, roster, spectating, connection watch ---------- */
const feedEl = document.createElement('div'); feedEl.id = 'feed'; document.body.appendChild(feedEl);
const netWarn = document.createElement('div'); netWarn.id = 'netwarn'; netWarn.innerHTML = '<i></i>Connection lost · reconnecting…'; document.body.appendChild(netWarn);
const chip = (c) => `<span class="d" style="background:${esc(c)}"></span>`;
/** A short line in the bottom-left feed. tone: '', 'good', 'bad', 'dim'. Lines fade after a few seconds. */
function feed(html, tone = '') {
  const d = document.createElement('div'); d.className = 'fi' + (tone ? ' ' + tone : ''); d.innerHTML = html; feedEl.appendChild(d);
  while (feedEl.children.length > 5) feedEl.firstChild.remove();
  setTimeout(() => { d.classList.add('out'); setTimeout(() => d.remove(), 450); }, 6500);
}
// quick chat: hold T and press 1-6. Fixed phrases, so it works without a mic and there's nothing to moderate.
const QUICK = ['This way!', 'Wait for me!', 'Need someone on the plates', 'Crank the lever!', 'The Shadow is coming, move!', 'Thanks!'];
const qchatEl = document.createElement('div'); qchatEl.id = 'qchat';
qchatEl.innerHTML = '<b>Quick chat</b>' + QUICK.map((q, i) => `<div><kbd>${i + 1}</kbd>${esc(q)}</div>`).join('');
document.body.appendChild(qchatEl);
let chatCd = 0, rosterT = 0;
function showChat(name, color, i, rid) {
  feed(`${chip(color)}<b>${esc(name)}:</b> ${esc(QUICK[i])}`); sfx.chime?.();
  if (rid && remotes[rid]) remotes[rid].say = { text: QUICK[i], t: time };
}
function sendChat(i) {
  const p = players[0];
  if (mode !== 'online' || !net || !p || time < chatCd) return;
  chatCd = time + 1.2; showChat(p.name + ' (you)', p.color, i, null); p.wave = Math.max(p.wave, .8);
  for (const id of Object.keys(remotes)) net.sendEvent(id, { type: 'chat', i, from: p.name, c: p.color, id: myId });
}
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || (uiOpen && uiOpen !== 'photo') || mode !== 'online' || !inGame()) return;
  if (keys.has('KeyT') && /^Digit[1-6]$/.test(e.code)) { e.preventDefault(); taps.delete(e.code); if (!e.repeat) sendChat(+e.code.slice(5) - 1); }
});
function updateQuickChat() { qchatEl.classList.toggle('on', mode === 'online' && inGame() && keys.has('KeyT') && !uiOpen && !paused); }

/** The room list, top left: who is here, what they are doing, how far away, and whether their connection looks shaky. */
function renderRoster() {
  const ps = net?.ps, el = $('roster'); if (!ps || mode !== 'online') return;
  const now = performance.now() / 1000, me = players[0], lobby = inLobby();
  const list = Object.values(ps).filter((p) => p.name);
  const climbing = list.filter((p) => ((p.id === myId ? me?.st : p.st) || 0) === 0).length;
  el.style.display = 'block';
  el.innerHTML = `<b>Room ${esc(net.room)} · ${list.length} ${list.length === 1 ? 'climber' : 'climbers'}${lobby || state !== 'racing' ? '' : ` · ${climbing} still climbing`}</b>` + list.map((p) => {
    const mine = p.id === myId, r = remotes[p.id], st = mine ? (me?.sit ? 3 : me?.st ?? 0) : (p.st || 0);
    const x = mine ? me?.x : r?.x, z = mine ? me?.z : r?.z;
    const tag = lobby ? (st === 3 ? 'seated' : x !== undefined && inGondola(x, z) ? 'aboard' : 'in the hall') : ['climbing', 'safe', 'down', 'resting'][st] ?? '';
    const dist = !mine && r && me && !lobby ? `${Math.round(Math.hypot(r.x - me.x, r.z - me.z))} m` : '';
    const weak = !mine && r && now - (r.rx || now) > 7;
    const watching = me?.spec === p.id;
    return `<div class="rr st${st}${watching ? ' watch' : ''}">${chip(p.color)}<span class="nm">${esc(p.name)}${mine ? ' (you)' : ''}</span><i class="tg">${watching ? 'watching' : tag}</i>${dist ? `<small>${dist}</small>` : ''}${weak ? '<em>weak signal</em>' : ''}</div>`;
  }).join('') + `<p class="rk">${peerCount()} on voice · hold <kbd>T</kbd> to quick chat</p>`;
}

// Spectating: once you are safe or collapsed online, the camera follows a teammate who is still climbing.
// Click (or F) for the next one, V to switch between watching and your own view, move the mouse to look around them.
const specTargets = () => Object.values(remotes).filter((r) => (r.st || 0) === 0);
function specPre(p) {
  if (mode !== 'online' || (state !== 'racing' && state !== 'summit') || p.st === 0 || p !== players[0]) { p.spec = null; p.specOff = false; return; }
  const list = specTargets();
  if (!list.length) { p.spec = null; return; }
  if (taps.has('KeyV')) { taps.delete('KeyV'); if (p.spec) { p.spec = null; p.specOff = true; } else { p.specOff = false; p.spec = list[0].id; } }
  if (!p.spec && !p.specOff && time - (p.doneAt || 0) > 2.5) { p.spec = list[0].id; p.specYaw = 0; p.specPitch = .15; }
  if (p.spec && !list.some((r) => r.id === p.spec)) p.spec = list[0].id; // they finished or left: move on
  if (p.spec && tapped(p.ctrl.use)) {
    p.ctrl.use.forEach((k) => taps.delete(k));
    const k = list.findIndex((r) => r.id === p.spec); p.spec = list[(k + 1) % list.length].id; sfx.click?.();
  }
}
const specV = new THREE.Vector3();
function specPost(p, dt) {
  const r = p.spec && remotes[p.spec], H = p.hud;
  if (!r) {
    if (H && mode === 'online' && (state === 'racing' || state === 'summit') && p.st !== 0 && p.specOff && specTargets().length) { H.prompt.style.display = 'block'; H.prompt.textContent = 'V · watch your team'; }
    return;
  }
  const a = r.yaw + (p.specYaw || 0), back = 4.2, lift = 1.2 + (p.specPitch || 0) * 3.2;
  const hx = r.x, hy = (r.y || 0) + 1.5, hz = r.z;
  // pull the camera in if a wall is between the climber and where it wants to be
  let d = back;
  for (let s = 1; s <= 12; s++) {
    const k = s / 12, x = hx + Math.sin(a) * back * k, z = hz + Math.cos(a) * back * k, y = hy + lift * k;
    if (blockedAt(x, z, y - 1.3, .3)) { d = back * (s - 1) / 12; break; }
  }
  const t = Math.max(.15, d / back);
  specV.set(hx + Math.sin(a) * d, hy + lift * t, hz + Math.cos(a) * d);
  if (p.specFor !== r.id || !p.specPos) { p.specPos = specV.clone(); p.specFor = r.id; }
  else p.specPos.lerp(specV, 1 - Math.exp(-dt * 9));
  p.cam.position.copy(p.specPos); p.cam.lookAt(hx, hy, hz);
  if (H) { H.done.style.display = 'none'; H.prompt.style.display = 'block'; H.prompt.textContent = `Watching ${r.name}${specTargets().length > 1 ? ' · click for next' : ''} · V for your view`; }
}
/* ---------- performance: one shadow pass per frame, auto resolution, F3 stats ---------- */
const PERF = { max: Math.min(devicePixelRatio || 1, 2), ratio: Math.min(devicePixelRatio || 1, 2), min: .75, acc: 0, frames: 0, slow: 0, fast: 0, lite: false, ms: 16.7, show: false };
const PERF_AUTO = { on: true };

/* ---------- debug screen (F3) and dev menu (`) ---------- */
// Cheats only work in solo and local co-op. Online rooms keep the readouts but lock the cheats, so races stay fair.
// Any cheat used during a climb marks the round as a dev run: it won't set a best time or finish your first climb.
const DEV = { god: false, fly: false, sleep: false, path: false, reveal: false, wire: false, cairns: true, speed: 1, graceWas: 30 };
const DEV_DOWN = ['KeyC', 'ControlRight', 'Numpad0'];
const devAllowed = () => mode !== 'online';
const PACE_NAMES = ['Gentle', 'Standard', 'Brutal'];
const dbg = makeDebug();
const devChip = makeDevChip();
let devMenu = null, pathLine = null, pathFor = null, wireLook = false;

function flyClimber(p, dt, t, live, fwd, side) {
  const c = p.ctrl, up = (live && held(c.jump) ? 1 : 0) - (live && held(DEV_DOWN) ? 1 : 0);
  const spd = live && held(c.run) ? 26 : 10, cp = Math.cos(p.pitch), sy = Math.sin(p.yaw), cy = Math.cos(p.yaw);
  const ox = p.x, oz = p.z;
  p.x += (-sy * cp * fwd + cy * side) * spd * dt;
  p.z += (-cy * cp * fwd - sy * side) * spd * dt;
  p.y = Math.max(0, p.y + (Math.sin(p.pitch) * fwd + up) * spd * dt);
  p.vxLast = (p.x - ox) / Math.max(dt, 1e-4); p.vzLast = (p.z - oz) / Math.max(dt, 1e-4);
  Object.assign(p, { vy: 0, ground: p.y <= .01, climbing: false, sprinting: false, stamina: 1, exhausted: false, inFog: false, collapseT: 0, crank: -1, ex: 0, ez: 0 });
  if (live) { c.slots.forEach((k, i) => { if (taps.has(k)) p.slot = i; }); if (tapped(c.cycle)) p.slot = (p.slot + 1) % 3; if (tapped(c.use)) useTool(p); if (tapped(c.ping)) doPing(p); }
  if (p.st === 0 && state === 'racing' && p.y < 1 && Math.hypot(p.x - CX, p.z - CX) < SANCTUARY_R) reachSanctuary(p);
  poseClimber(p, dt, t, 0);
}
/* ---- teleports (all local climbers move together, side by side) ---- */
const tileC = (i) => i * C + C / 2;
function tpTo(x, z, y = 0, yaw = null) {
  players.forEach((p, k) => {
    const off = players.length > 1 ? (k ? .7 : -.7) : 0, a = (yaw ?? p.yaw) + Math.PI / 2;
    Object.assign(p, { x: x + Math.sin(a) * off, z: z + Math.cos(a) * off, y, vy: 0, ex: 0, ez: 0, climbing: false, sit: null, stumble: 0, land: 0 });
    if (yaw !== null) p.yaw = yaw;
    p.y = Math.max(y, groundUnder(p.x, p.z, y + .1, R));
    poseClimber(p, 0, time, 0);
  });
  fx.sparkle(x, y + 1, z, 0xa37bff, 18); sfx.whoosh?.();
}
const faceYaw = (dx, dz) => Math.atan2(-dx, -dz);
function tpPath(k) {
  const P = trail.path; if (!P.length) return;
  k = clamp(Math.round(k), 0, P.length - 1);
  const [x, z] = P[k], [nx, nz] = P[Math.min(P.length - 1, k + 1)];
  tpTo(tileC(x), tileC(z), 0, k < P.length - 1 ? faceYaw(nx - x, nz - z) : null);
}
function tpNextDoor() {
  const P = trail.path, k = P.findIndex(([x, z]) => maze.doorAt[x][z] >= 0 && !maze.doors[maze.doorAt[x][z]]?.latched);
  if (k > 0) tpPath(k - 1); else devToast('No closed doors on the way');
}
function tpRidge() {
  const p = players[0], ti = Math.floor(p.x / C), tj = Math.floor(p.z / C); let best = null;
  for (let r = 1; r <= 3 && !best; r++) for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
    const i = ti + dx, j = tj + dz;
    if (i < 0 || j < 0 || i >= GRID || j >= GRID || !maze.g[i][j]) continue;
    const d = Math.hypot(dx, dz); if (!best || d < best.d) best = { i, j, d };
  }
  if (best) tpTo(tileC(best.i), tileC(best.j), maze.top[best.i][best.j]); else devToast('No wall nearby');
}
function devToast(msg) { if (players[0]) toast(players[0], msg); }
/* ---- view helpers ---- */
function devApplyLooks() {
  const on = DEV.wire && inGame();
  if (on === wireLook && !on) return;
  wireLook = on;
  scene.traverse((o) => { if (!o.material || o === pathLine) return; for (const m of Array.isArray(o.material) ? o.material : [o.material]) if ('wireframe' in m && !m.isLineBasicMaterial) m.wireframe = on; });
}
function updatePathLine() {
  const want = DEV.path && devAllowed() && inGame() && !inLobby() && trail.path.length > 1;
  if (want && pathFor !== trail.path) {
    if (pathLine) { scene.remove(pathLine); pathLine.geometry.dispose(); }
    const pts = trail.path.map(([x, z]) => new THREE.Vector3(tileC(x), (maze.low[x][z] || 0) + .45, tileC(z)));
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', .2);
    pathLine = new THREE.Mesh(new THREE.TubeGeometry(curve, pts.length * 6, .09, 5, false), pathLine?.material || new THREE.MeshBasicMaterial({ color: 0xff3fd2, depthTest: false, transparent: true, opacity: .85, fog: false }));
    pathLine.renderOrder = 998; pathLine.frustumCulled = false; scene.add(pathLine); pathFor = trail.path;
  }
  if (pathLine) pathLine.visible = want;
}
function activeCheats() {
  if (!devAllowed()) return [];
  const a = [];
  if (DEV.god) a.push('God mode'); if (DEV.fly) a.push('Fly'); if (DEV.sleep) a.push('Shadow asleep');
  if (DEV.speed !== 1) a.push(`Time ×${DEV.speed}`); if (DEV.path) a.push('True path');
  return a;
}
// called once per frame from the loop
function devTick(rawDt) {
  const cheats = activeCheats();
  if (cheats.length && (state === 'racing' || state === 'countdown' || state === 'summit')) roundOpts.dev = true;
  setDevChip(devChip, inGame() ? cheats.concat(DEV.wire ? ['Wireframe'] : []) : []);
  updatePathLine();
  if (wireLook !== (DEV.wire && inGame())) devApplyLooks();
  debugDraw(dbg, rawDt, debugSections);
}
const f1 = (v) => (+v).toFixed(1), f2 = (v) => (+v).toFixed(2), deg = (r) => Math.round(r * 180 / Math.PI) + '°';
function debugSections() {
  const i = renderer.info, p = players[0], out = [];
  out.push(['Render', [
    ['Resolution', `×${PERF.ratio.toFixed(2)} ${PERF_AUTO.on ? 'auto' : 'fixed'}${PERF.lite ? ' · lite shadows' : ''}`],
    ['Draw calls', i.render.calls, i.render.calls > 400 ? 'warn' : ''],
    ['Triangles', (i.render.triangles / 1000).toFixed(0) + 'k'],
    ['Geometries', i.memory.geometries], ['Textures', i.memory.textures], ['Shaders', i.programs?.length ?? '?'],
    ['Views', players.length || 1], ['Physics', physicsMode() === 'rapier' ? 'Rapier' : 'Built-in'],
  ]]);
  if (p && inGame()) {
    const ti = Math.floor(p.x / C), tj = Math.floor(p.z / C), inside = ti >= 0 && tj >= 0 && ti < GRID && tj < GRID;
    const tile = inside ? `${ti}, ${tj}${maze.g[ti][tj] ? ` wall ${f1(maze.top[ti][tj])} m` : maze.low[ti][tj] ? ` step ${f1(maze.low[ti][tj])} m` : ''}${maze.doorAt[ti][tj] >= 0 ? ' door' : ''}` : 'outside';
    const flags = [p.ground && 'ground', p.climbing && 'climbing', p.sprinting && 'sprint', p.exhausted && 'exhausted', p.crank >= 0 && 'crank', p.sit && 'sitting', DEV.fly && devAllowed() && 'fly'].filter(Boolean).join(' · ') || 'air';
    out.push(['Climber · ' + p.name, [
      ['Position', `${f1(p.x)}  ${f2(p.y)}  ${f1(p.z)}`], ['Tile', tile],
      ['Zone', inLobby() ? 'Boarding hall' : ZONE_NAMES[zoneAt(p.x, p.z)] ?? '—'],
      ['Facing', `yaw ${deg(((p.yaw % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI))} · pitch ${deg(p.pitch)}`],
      ['Speed', `${f1(Math.hypot(p.vxLast, p.vzLast))} m/s · vy ${f1(p.vy)}`], ['State', flags],
      ['Stamina', Math.round(p.stamina * 100) + '%', p.stamina < .25 ? 'bad' : ''],
      ['Status', ['climbing', 'safe', 'collapsed'][p.st] ?? p.st],
      ['Fog', inLobby() ? '—' : `depth ${f1(fogDepth(p.x, p.z, raceTime))} · view ${f2(p.fogK)}${p.inFog ? ' · inside' : ''}`, p.inFog ? 'bad' : ''],
    ]]);
  }
  const lobby = inLobby();
  out.push(['Round', [
    ['State', `${state}${paused ? ' (paused)' : ''} · ${mode ?? 'menu'}`],
    ['Seed', lobby ? 'Boarding hall' : `${seed}${roundOpts.first ? ' · first climb' : ''}${roundOpts.dev ? ' · dev run' : ''}`, roundOpts.dev ? 'warn' : ''],
    ['Pace', PACE_NAMES[roundOpts.pace ?? lobbySettings.pace] ?? '—'],
    ['Time', fmt(raceTime)],
    ['Shadow', GRACE > 1e6 ? 'asleep (dev)' : `wakes ${GRACE}s · creep ${Math.round(CREEP)}s · r ${f1(fogRadius(raceTime))} m`],
    ['Gates', `${doorsOpen()}/${doorCount()} open`], ['Puzzles', (() => { const s = puzzleSummary(); return lobby ? '—' : `braziers ${s.lit}/${s.braziers} · runes ${s.runes}`; })()],
    ['Trail', lobby ? '—' : `${trail.path.length} tiles · ${cairnTiles.length} cairns`],
    ['Grid', `${GRID}×${GRID} · tile ${C} m · ${Math.round(SIZE)} m wide`],
  ]]);
  if (mode === 'online') {
    out.push(['Network', [
      ['Room', net?.room ?? '—'], ['My id', String(myId).slice(0, 10)],
      ['Climbers', 1 + Object.keys(remotes).length], ['Voice peers', peerCount()],
      ['Mic', !hasMic() ? 'none' : isMuted() ? 'muted' : `live · ${Math.round(micLevel() * 100)}%`],
      ['Last send', lastSent.t ? `${((Date.now() - lastSent.t) / 1000).toFixed(1)}s ago` : '—'],
    ]]);
  }
  return out;
}
/* ---- the menu ---- */
const racing = () => state === 'racing' || state === 'countdown';
const inMaze = () => inGame() && !inLobby();
const DEV_GROUPS = [
  { title: 'Cheats', items: [
    { kind: 'toggle', label: 'God mode', hint: 'Stamina never runs out, the Shadow can\'t take you', cheat: true, get: () => DEV.god, set: (v) => DEV.god = v },
    { kind: 'toggle', label: 'Fly / noclip', hint: 'Look to steer · Space up · C down · Shift fast', cheat: true, get: () => DEV.fly, set: (v) => { DEV.fly = v; if (!v) players.forEach((p) => { p.vy = 0; }); } },
    { kind: 'toggle', label: 'Shadow asleep', hint: 'The fog never wakes this round', cheat: true, get: () => DEV.sleep,
      set: (v) => { DEV.sleep = v; if (v) { DEV.graceWas = GRACE < 1e6 ? GRACE : DEV.graceWas; setGrace(1e7); } else setGrace(DEV.graceWas); } },
    { kind: 'choice', label: 'Time speed', cheat: true, options: [[.25, '¼×'], [.5, '½×'], [1, '1×'], [2, '2×'], [4, '4×']], get: () => DEV.speed, set: (v) => DEV.speed = v },
  ] },
  { title: 'Teleport', items: [
    { kind: 'button', label: 'Start', cheat: true, when: inMaze, run: () => tpPath(0) },
    { kind: 'button', label: 'Halfway', cheat: true, when: inMaze, run: () => tpPath(trail.path.length / 2) },
    { kind: 'button', label: 'Next closed door', cheat: true, when: inMaze, run: tpNextDoor },
    { kind: 'button', label: 'Sanctuary gate', cheat: true, when: inMaze, run: () => tpPath(trail.path.length - 5) },
    { kind: 'button', label: 'Onto the wall', hint: 'Nearest wall top', cheat: true, when: () => inGame(), run: tpRidge },
  ] },
  { title: 'Round', items: [
    { kind: 'button', label: 'Win now', cheat: true, when: () => state === 'racing', tone: 'go', run: () => players.forEach((p) => p.st === 0 && reachSanctuary(p)) },
    { kind: 'button', label: 'Collapse me', cheat: true, when: () => state === 'racing', tone: 'bad', run: () => { roundOpts.dev = true; collapse(players[0]); } },
    { kind: 'button', label: 'Open every door', cheat: true, when: () => inGame(), run: () => { if (racing()) roundOpts.dev = true; maze.doors.forEach((d) => latchDoor(d.id)); } },
    { kind: 'button', label: 'Wake the Shadow', cheat: true, when: () => state === 'racing', run: () => { roundOpts.dev = true; DEV.sleep = false; DEV.graceWas = GRACE; setGrace(Math.floor(raceTime)); } },
    { kind: 'button', label: 'Skip 30 s', hint: 'Fast-forward the Shadow', cheat: true, when: () => state === 'racing', run: () => { roundOpts.dev = true; raceTime += 30; } },
    { kind: 'button', label: 'Refill glowsticks', cheat: true, when: () => inGame(), run: () => players.forEach((p) => p.sticks = 3) },
    { kind: 'button', label: 'Summit test mountain', hint: 'Dev run · no rewards', cheat: true, when: () => inGame() && mode !== 'online' && state !== 'departing', tone: 'go', run: () => enterSummitTest() },
    { kind: 'button', label: 'Resume Summit at last camp', hint: 'Uses the saved checkpoint', cheat: true, when: () => inGame() && mode !== 'online' && state !== 'departing' && !!summitSave(), run: () => { const s = summitSave(); enterSummitTest(s.seed, s.camp, s.pace ?? 1); } },
    { kind: 'button', label: 'Summit: next camp', cheat: true, when: () => state === 'summit', run: () => { roundOpts.dev = true; const c = SUMMIT.camps.find((k) => k.id > summitCamp) || SUMMIT.camps.at(-1); players.forEach((p, i) => { resetClimber(p); p.hang = null; p.clip = null; placeAtCamp(p, c, i); }); } },
    { kind: 'button', label: 'Summit: +5 pitons', cheat: true, when: () => state === 'summit', run: () => { roundOpts.dev = true; players.forEach((p) => p.pitons = (p.pitons || 0) + 5); } },
    { kind: 'button', label: 'Summit: Shadow +10 m', hint: 'Offline only', cheat: true, when: () => state === 'summit' && mode !== 'online', run: () => { roundOpts.dev = true; raceTime = Math.max(raceTime, RISE.grace) + 10 / RISE.speed; } },
    { kind: 'choice', label: 'Summit: go to camp', cheat: true, when: () => state === 'summit' && !practice, options: [[0, 'Trail'], [1, 'I'], [2, 'II'], [3, 'III'], [4, 'IV'], [5, 'V']], get: () => summitCamp, set: (v) => { roundOpts.dev = true; const c = SUMMIT.camps[v]; if (!c) return; players.forEach((p, i) => { resetClimber(p); p.hang = null; p.clip = null; placeAtCamp(p, c, i); }); if (SUMMIT.gate && c.y >= SUMMIT.faces[SUMMIT.gate.face].y1 - .5) gateOpened('crank', true); } },
    { kind: 'button', label: 'Summit: Shadow 15 m below me', hint: 'Offline only', cheat: true, when: () => state === 'summit' && mode !== 'online' && !practice, run: () => { roundOpts.dev = true; if (raceTime < RISE.grace) raceTime = RISE.grace; RISE.base += (players[0].y - 15) - summitSY; } },
    { kind: 'button', label: 'Summit: open the temple gate', cheat: true, when: () => state === 'summit' && !!SUMMIT.gate && !SUMMIT.gate.open, run: () => { roundOpts.dev = true; gateOpened('crank', true); } },
    { kind: 'seed', label: 'Summit: climb a seed', hint: 'Offline · uses the pace below', cheat: true, when: () => inGame() && mode !== 'online' && state !== 'departing', run: (s) => enterSummitTest(s, 0, lobbySettings.pace) },
    { kind: 'button', label: 'Restart this maze', cheat: true, when: () => inMaze() && state !== 'departing', run: () => { closeDev(); startRound(seed); } },
    { kind: 'button', label: 'New random maze', cheat: true, when: () => inGame() && state !== 'departing', run: () => { closeDev(); if (state === 'lobby') depart(newSeed()); else startRound(newSeed()); } },
    { kind: 'seed', label: 'Play a seed', cheat: true, when: () => inGame() && state !== 'departing', run: (s) => { closeDev(); if (state === 'lobby') depart(s); else startRound(s); } },
    { kind: 'choice', label: 'Pace next round', cheat: true, options: [[0, 'Gentle'], [1, 'Standard'], [2, 'Brutal']], get: () => lobbySettings.pace, set: (v) => { lobbySettings.pace = v; inLobby() && updateBoard(); } },
  ] },
  { title: 'View', items: [
    { kind: 'choice', label: 'Debug screen', options: [[0, 'Off'], [1, 'Compact'], [2, 'Full']], get: () => dbg.mode, set: (v) => setDebugMode(dbg, v) },
    { kind: 'toggle', label: 'Show the true path', hint: 'Pink line through walls, start to sanctuary', cheat: true, get: () => DEV.path, set: (v) => DEV.path = v },
    { kind: 'toggle', label: 'Trail cairns', get: () => DEV.cairns, set: (v) => { DEV.cairns = v; showTrail(v); } },
    { kind: 'toggle', label: 'Wireframe', get: () => DEV.wire, set: (v) => { DEV.wire = v; devApplyLooks(); } },
    { kind: 'toggle', label: 'Hide HUD', hint: 'Same as F1', get: () => $('huds').classList.contains('nohud'), set: (v) => $('huds').classList.toggle('nohud', v) },
    { kind: 'toggle', label: 'Auto resolution', hint: 'Off locks the current render scale', get: () => PERF_AUTO.on, set: (v) => PERF_AUTO.on = v },
  ] },
  { title: 'Saved data on this device', items: [
    { kind: 'button', label: 'Replay one-time tips', run: () => { resetTips(); devToast('Tips will show again'); } },
    { kind: 'button', label: 'Reset passport', run: () => { resetPassport(); renderPassport(); devToast('Passport cleared'); } },
    { kind: 'toggle', label: 'First climb done', hint: 'Off gives the next climb the gentle settings', get: () => !isFirstClimb(), set: (v) => { try { v ? localStorage.setItem('ridgeline_firstclimb', '1') : localStorage.removeItem('ridgeline_firstclimb'); } catch {} inLobby() && updateBoard(); } },
    { kind: 'button', label: 'Show the briefing cards', when: () => inGame(), run: () => { closeDev(true); $('briefTitle').textContent = 'Field briefing'; $('briefSub').textContent = 'The five things every climber should know.'; openPanel('brief'); } },
    { kind: 'button', label: 'Clear best time', tone: 'bad', run: () => { try { localStorage.removeItem('ridgeline_best'); } catch {} refreshBest(); devToast('Best time cleared'); } },
  ] },
];
devMenu = makeDevMenu(document.body, {
  groups: DEV_GROUPS, allowCheats: devAllowed,
  note: () => mode === 'online' ? 'Online room: cheats are locked so races stay fair. Readouts and view options still work.' : inGame() ? 'Cheats on during a climb make it a dev run: no best time, no first-climb credit.' : 'Start a game to use teleports and round tools.',
  onAction: (it) => { if (it.close) closeDev(); else sfx.click?.(); },
});
function openDev() {
  if (uiOpen && uiOpen !== 'dev') closePanel(true);
  uiOpen = 'dev'; keys.clear(); document.exitPointerLock?.(); devMenu.open(true); updateLock();
}
function closeDev(silent) { if (uiOpen === 'dev') closePanel(silent); else devMenu.open(false); }
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' && e.code !== 'F3') return;
  if (e.code === 'F3') { e.preventDefault(); setDebugMode(dbg, (dbg.mode + 1) % 3); devMenu.isOpen && devMenu.refresh(); }
  if (e.code === 'Backquote' && !e.repeat) { e.preventDefault(); if (uiOpen === 'dev') closeDev(); else if (!uiOpen || uiOpen === 'photo') openDev(); }
});
function perfTick(rawDt) {
  PERF.acc += rawDt; PERF.frames++;
  if (PERF.acc < 1) return;
  PERF.ms = PERF.acc / PERF.frames * 1000; PERF.acc = 0; PERF.frames = 0;
  if (document.hidden || !PERF_AUTO.on) return;
  // below ~50 fps for 2 seconds: drop resolution a step; above ~75 fps for 5 seconds: raise it back
  if (PERF.ms > 20) { PERF.slow++; PERF.fast = 0; } else if (PERF.ms < 13.3) { PERF.fast++; PERF.slow = 0; } else { PERF.slow = PERF.fast = 0; }
  if (PERF.slow >= 2) {
    PERF.slow = 0;
    if (PERF.ratio > PERF.min + .01) { PERF.ratio = Math.max(PERF.min, PERF.ratio - .25); renderer.setPixelRatio(PERF.ratio); renderer.setSize(innerWidth, innerHeight); }
    else if (!PERF.lite) { // still slow at the lowest resolution: switch to cheaper, sharper-edged shadows
      PERF.lite = true; POST.bloom = false; renderer.shadowMap.type = THREE.PCFShadowMap; sun.shadow.mapSize.set(1024, 1024);
      sun.shadow.map?.dispose(); sun.shadow.map = null;
      scene.traverse((o) => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.needsUpdate = true); });
    }
  } else if (PERF.fast >= 5 && PERF.ratio < PERF.max - .01) {
    PERF.fast = 0; PERF.ratio = Math.min(PERF.max, PERF.ratio + .25); renderer.setPixelRatio(PERF.ratio); renderer.setSize(innerWidth, innerHeight);
  }
}
function loop() {
  requestAnimationFrame(loop);
  const raw = clock.getDelta();
  update(Math.min(raw, .05) * (devAllowed() ? DEV.speed : 1));
  renderer.info.reset(); renderer.shadowMap.needsUpdate = true;
  render(); perfTick(raw); debugSample(dbg, raw * 1000); devTick(raw); updateQuickChat();
}
addEventListener('resize', () => renderer.setSize(innerWidth, innerHeight));

/* ---------- boot ---------- */
$('menuSettings').appendChild($('settingsBlock'));
$('menuGuide').appendChild($('guideBlock'));
refreshBest();
loaderSet('Ridgeline', 'Hauling gear up the mountain…', 35);
$('lTip').textContent = 'Tip: ' + TIPS[Math.floor(Math.random() * TIPS.length)];
buildMaze(20261126);
buildDoors();
loop();
loaderSet('Ridgeline', 'Checking the weather…', 75);
const physReady = initPhysics().then((m) => {
  $('physTag').textContent = m === 'rapier' ? 'Rapier' : 'Built‑in';
  $('physTag').parentElement.classList.toggle('rapier', m === 'rapier');
});
await Promise.race([physReady, sleep(2500)]);
loaderSet('Ridgeline', 'Ready', 100);
await sleep(250);
await cover();
hideLoader(); state = 'menu'; showMenu('main');
// invite links: ?room=NAME opens the online screen with the room filled in
const inviteRoom = new URLSearchParams(location.search).get('room');
if (inviteRoom) { $('inRoom').value = inviteRoom.slice(0, 24); showMenu('online'); }
uncover();

loadSdk().then(() => {
  sdkReady = true; $('goOnline').disabled = false; $('onlineStatus').textContent = 'Firebase ready · pick a room';
}).catch(() => {
  $('onlineStatus').textContent = 'Needs the hosted page (blocked in this preview)';
  $('onlineMsg').textContent = "Dia's preview blocks Firebase. Host these files and open that link to play online.";
});
