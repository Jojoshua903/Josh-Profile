import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { S, WH, ROWS, COLS, MAP, W, resetWorld, setLevelData, cell, solidAt, moveCircle, los, walkable, sfx, audio, setVolume, makeTex, windLevel } from './core.js';
import { buildLevel, makeEnemy, makeHollow, makeShade, makeHand, makePickup, MAT } from './level.js';
import { updateEnemy, alertEnemy, separate } from './ai.js';
import { FX, resetFX, tickFX, sparks, decal, tracer, fireball, puff } from './effects.js';
import { Comms } from './comms.js';
import { LEVELS } from './levels.js';
import { setChime } from './decor2.js';
import { sealWell } from './decor3.js';
import { breakFork, freeCage, shatterBell } from './decor4.js';
import { makeDaniel } from './cutscene2.js';
import { Save } from './save.js';
import { ACH, CREDITS } from './extras.js';

const $ = id => document.getElementById(id);
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.autoClear = false;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf1e4c8);
scene.fog = new THREE.Fog(0xefe1c3, 22, 78);
const camera = new THREE.PerspectiveCamera(75, 1, .05, 200); camera.rotation.order = 'YXZ'; scene.add(camera);
const hemi = new THREE.HemisphereLight(0xfff4e0, 0xb39a72, 1.05); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d6, 2.2);
const CX = COLS * S / 2, CZ = ROWS * S / 2;
sun.position.set(CX + 30, 60, CZ + 18); sun.target.position.set(CX, 0, CZ);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -58, right: 58, top: 58, bottom: -58, near: 10, far: 140 }); sun.shadow.bias = -.0005; sun.shadow.camera.updateProjectionMatrix();
scene.add(sun, sun.target);
const boomLight = new THREE.PointLight(0xffa040, 0, 30, 1.2); scene.add(boomLight);
const muzLight = new THREE.PointLight(0xffd36b, 0, 9, 1.5); scene.add(muzLight);

// first-person weapon, rendered in its own pass so it never clips into walls
const gunScene = new THREE.Scene(), gunCam = new THREE.PerspectiveCamera(60, 1, .01, 10);
const gunKey = new THREE.DirectionalLight(0xffffff, 1.5); gunKey.position.set(1, 2, 1);
gunScene.add(new THREE.HemisphereLight(0xfff4e0, 0x8a7a5a, 2), gunKey);
const gun = new THREE.Group(); gunScene.add(gun);
{
  const L = o => new THREE.MeshLambertMaterial(o), B = (w, h, d, m, x, y, z, rx = 0) => { const k = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); k.position.set(x, y, z); k.rotation.x = rx; gun.add(k); };
  const body = L({ color: 0x2b2a27 }), red = L({ color: 0xd2391b }), glove = L({ color: 0xa88454 }), sleeve = L({ color: 0x5b5f3a });
  B(.09, .11, .42, body, 0, 0, 0); B(.045, .045, .22, body, 0, .02, -.31); B(.092, .022, .24, red, 0, .045, -.02);
  B(.02, .03, .03, body, 0, .075, -.17); B(.03, .035, .03, body, 0, .075, .16);
  B(.06, .17, .08, body, 0, -.12, .02, .25); B(.065, .15, .075, body, 0, -.1, .15, -.2);
  B(.11, .1, .15, glove, .005, -.11, .2); B(.13, .13, .3, sleeve, .01, -.13, .38);
  B(.1, .085, .16, glove, -.03, -.05, -.13); B(.12, .12, .28, sleeve, -.09, -.1, .02, .5);
}
const flashTex = makeTex((g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,250,220,1)'); gr.addColorStop(.35, 'rgba(255,190,80,.9)'); gr.addColorStop(1, 'rgba(255,120,30,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, 64, 64);
const muzzle = new THREE.Mesh(new THREE.PlaneGeometry(.26, .26), new THREE.MeshBasicMaterial({ map: flashTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
muzzle.position.set(0, .02, -.45); muzzle.visible = false; gun.add(muzzle);
const GUN_BASE = new THREE.Vector3(.2, -.2, -.48);
// breaching shotgun, swapped in with 2
const sgun = new THREE.Group(); gunScene.add(sgun); sgun.visible = false;
{
  const L = o => new THREE.MeshLambertMaterial(o), B = (w, h, d, m, x, y, z) => { const k = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); k.position.set(x, y, z); sgun.add(k); return k; };
  const body = L({ color: 0x2b2a27 }), wood = L({ color: 0x8a6a42 }), red = L({ color: 0xd2391b }), glove = L({ color: 0xa88454 }), sleeve = L({ color: 0x5b5f3a });
  B(.1, .12, .5, body, 0, 0, 0); B(.06, .06, .5, body, 0, .03, -.48); B(.05, .05, .42, body, 0, -.04, -.42); B(.09, .08, .2, wood, 0, -.05, -.3);
  B(.09, .14, .3, wood, 0, -.06, .35); B(.102, .03, .2, red, 0, .06, 0);
  B(.1, .1, .14, glove, 0, -.1, .14); B(.13, .13, .3, sleeve, .01, -.13, .34); B(.1, .085, .16, glove, -.02, -.09, -.3); B(.12, .12, .28, sleeve, -.09, -.13, -.12);
}
const sgMuzzle = muzzle.clone(); sgMuzzle.position.set(0, .03, -.76); sgMuzzle.scale.setScalar(1.6); sgun.add(sgMuzzle);
const knife = new THREE.Group(); gunScene.add(knife); knife.visible = false;
{ const k = new THREE.Mesh(new THREE.BoxGeometry(.03, .02, .3), new THREE.MeshLambertMaterial({ color: 0xd8d8d0 })); k.position.z = -.2; knife.add(k); const h = new THREE.Mesh(new THREE.BoxGeometry(.05, .05, .14), new THREE.MeshLambertMaterial({ color: 0x2b2a27 })); knife.add(h); }
// Daniel's demolition sledge, "Mother": pivot at the grip so swings arc naturally
const hammer = new THREE.Group(); gunScene.add(hammer); hammer.visible = false;
{
  const L = o => new THREE.MeshLambertMaterial(o), B = (w, h, d, m, x, y, z) => { const k = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); k.position.set(x, y, z); hammer.add(k); return k; };
  const wood = L({ color: 0x8a6a42 }), steel = L({ color: 0x55574f }), red = L({ color: 0xd2391b }), tape = L({ color: 0x1d1b16 }), glove = L({ color: 0xa88454 });
  B(.045, .045, .78, wood, 0, 0, -.32); B(.05, .05, .16, tape, 0, 0, -.02); B(.05, .05, .1, tape, 0, 0, -.5);
  B(.14, .14, .3, steel, 0, 0, -.72).rotation.y = Math.PI / 2; B(.145, .145, .06, red, 0, 0, -.72).rotation.y = Math.PI / 2; B(.18, .16, .06, steel, .17, 0, -.72); B(.18, .16, .06, steel, -.17, 0, -.72);
  B(.1, .1, .14, glove, 0, -.02, -.02); B(.1, .1, .14, glove, 0, -.02, -.3);
}
const HAMMER_BASE = new THREE.Vector3(.24, -.32, -.32);
const WEAPONS = {
  pistol: { name: 'MK-9 SIDEARM', mag: 15, rate: .13, reload: 1.4, pellets: 1, dmg: 34, head: 100, spread: .004, noise: 24 },
  shotgun: { name: 'BRK-12 BREACHER', mag: 6, rate: .85, reload: 2.1, pellets: 8, dmg: 17, head: 34, spread: .075, noise: 32 },
  hammer: { name: 'SLEDGE · "MOTHER"', mag: 0, reload: 1, melee: true },
};
const SWING = { light: { dmg: 55, range: 2.7, cone: .45, time: .42, noise: 5 }, heavy: { dmg: 135, range: 3.6, cone: -.2, time: .7, noise: 14 } };

function resize() {
  const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false);
  camera.aspect = gunCam.aspect = w / h; camera.updateProjectionMatrix(); gunCam.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

// ---------- state ----------
let L, G, P, LVI = 0, LV = LEVELS[0];
const objList = $('objList'), fogCol = new THREE.Color();
function applyTheme() {
  const t = LV.theme;
  scene.background.setHex(t.bg); scene.fog.color.setHex(t.fog); fogCol.setHex(t.fog);
  hemi.color.setHex(t.sky); hemi.groundColor.setHex(t.ground); hemi.intensity = t.hemi; sun.intensity = t.sun;
  document.body.classList.toggle('lv2', LV.id === 2); document.body.classList.toggle('lv3', LV.id === 3); document.body.classList.toggle('lv4', LV.id === 4); document.body.classList.toggle('lv5', LV.id === 5 || LV.id === 7); document.body.classList.toggle('lv6', LV.id === 6);
  document.querySelector('#objPanel .tag').textContent = LV.tag;
  document.querySelector('#timerWrap .tlabel').textContent = LV.timerLabel;
}
function newGame(idx, withCine = false) {
  LVI = idx; LV = LEVELS[idx];
  if (L) scene.remove(L.group);
  sfx.alarm(false); sfx.hum(false); sfx.drone(false); Comms.reset();
  setLevelData(LV.data); resetWorld(); applyTheme();
  L = buildLevel(scene, LV, withCine); resetFX(L.group);
  L.baseEnemies = L.enemies.length; L.basePickups = L.pickups.length;
  G = { state: G ? G.state : 'brief', armed: false, timer: LV.timer, kills: 0, shots: 0, hits: 0, heads: 0, t: 0, playT: 0, shake: 0, outro: 0, gateY: 0,
    paT: LV.pa.every, paI: 0, stepT: 0, ventT: 0, clankT: 6, grav: 18, echo: false, echoBuf: [], echoT: 0, ghost: null, broken: 0, shards: [], tint: null, sealY: 0,
    intel: 0, takedowns: 0, camsDown: 0, secret: false, bossDown: false, chimeStep: 0, dmgTaken: 0, knifeT: 0, lockY: 0, wardenSplit: false,
    wellsDown: 0, heartDown: false, ending: null, beatT: 0,
    bellT: 28, bellCharge: 0, bellWarned: false, forksDown: 0, freed: 0, bellPlantable: false, asheStage: 0, saltT: 2, freeP: 0, bellP: 0,
    stormT: 22, storm: false, stormK: 0, windX: 1, windZ: 0, stormTD: 0, beamA: 0, beamCd: 0, beamHits: 0, songT: 10, songWarned: false, endTile: null, spotted: 0, spotCd: 0 };
  P = { x: L.start.x, z: L.start.z, y: 0, vy: 0, yaw: LV.startYaw, pitch: 0, hp: 100, armor: 0, charges: 2, reload: 0, fireCd: 0, throwCd: 0, heat: 0, bob: 0, speedNow: 0, sprint: false, crouch: false, eye: 1.6, recoil: 0, plant: 0, alive: true, held: [],
    wpn: 'pistol', wp: { pistol: { has: true, ammo: 15, reserve: 60 }, shotgun: { has: false, ammo: 6, reserve: 12 }, hammer: { has: true, ammo: 0, reserve: 0 } }, key: false, blink: false, blinkCd: 0, blade: false, regen: false, glassT: 0, lastHurt: 0,
    hCharge: 0, swingT: 0, swingKind: null, swingHit: false };
  const gear = LV.startGear;
  if (gear) { if (gear.shotgun) { P.wp.shotgun.has = true; P.wp.shotgun.reserve = 18; } P.blink = !!gear.blink; P.armor = gear.armor || 0; }
  if (gear?.noGuns) { P.wp.pistol.has = false; P.wpn = 'hammer'; } // the bonus trial: mallet, blade and wits only
  if (gear?.blade) P.blade = true;
  document.querySelector('#vitals .name').innerHTML = LV.hero || 'DANIEL <span>DEMOLITIONS SPECIALIST</span>';
  if (LV.variant) { // carry the Level 3 choice forward
    const v = LV.variant(Save.lastEnding || 'X'); LV.story.win = v.win; LV.text.win = v.winText; LV.perkToast = v.perkToast;
    if (v.perk === 'blade') P.blade = true; else P.regen = true;
  }
  renderObjectives();
  $('timerWrap').classList.add('hidden'); $('timerWrap').classList.remove('crit'); show('boss', false); show('abil', P.blink); show('memory', false); show('bellWarn', false);
}
function optDone() {
  return { secret: G.secret, boss: G.bossDown, cams: L.cameras.length > 0 && G.camsDown >= L.cameras.length, wells: !!L.wells && G.wellsDown >= L.wells.length,
    forks: !!L.forks && G.forksDown >= L.forks.length, prisoners: !!L.prisoners && G.freed >= L.prisoners.length,
    walls: L.crackedCount > 0 && (L.brokenWalls?.length || 0) >= L.crackedCount, quiet: G.stormTD >= 3, beam: !!LV.beam && G.heartDown && G.beamHits === 0, ghost: G.spotted === 0 && G.broken >= 3 };
}
function secretsFound() { const d = optDone(); return LV.optional.filter(([k]) => d[k]).length; }
function renderObjectives() {
  const done = optDone();
  const prog = { cams: ` ${G.camsDown}/${L.cameras.length}`, wells: ` ${G.wellsDown}/${L.wells?.length || 0}`, forks: ` ${G.forksDown}/${L.forks?.length || 0}`, prisoners: ` ${G.freed}/${L.prisoners?.length || 0}`, walls: ` ${L.brokenWalls?.length || 0}/${L.crackedCount || 0}`, quiet: ` ${Math.min(3, G.stormTD)}/3`, beam: G.beamHits ? ` · seen ${G.beamHits}×` : '', ghost: G.spotted ? ` · seen ${G.spotted}×` : '' };
  const exitOpen = LV.choice ? G.heartDown : G.armed;
  objList.innerHTML = L.targets.filter(t => t.idx !== 99).map(t => `<li data-i="${t.idx}" class="${t.planted ? 'done' : ''}"><i></i>${t.name}</li>`).join('')
    + (LV.choice ? `<li class="${W.gateOpen ? '' : 'locked'} ${G.heartDown ? 'done' : ''}"><i></i>BREAK ${LV.bossName}</li>` : '')
    + (LV.allBroken ? `<li class="${G.broken >= 3 ? '' : 'locked'} ${G.bossDown ? 'done' : ''}"><i></i>DEFEAT ${LV.bossName}</li>` : '')
    + (LV.bell ? `<li class="${G.bellPlantable || G.armed ? '' : 'locked'} ${G.armed ? 'done' : ''}"><i></i>C4 ON THE GREAT BELL</li>` : '')
    + `<li class="${exitOpen ? '' : 'locked'}" data-i="x"><i></i>${LV.exitLabel}</li>`
    + LV.optional.map(([k, label]) => `<li class="opt ${done[k] ? 'done' : ''}"><i></i>${label}${prog[k] || ''}</li>`).join('')
    + `<li class="intel ${G.intel >= 5 ? 'done' : ''}"><i></i>${LV.intelName} ${G.intel}/5</li>`;
}
function extra(key) { const lines = LV.extra?.[key]; if (lines) Comms.once(LV.id + 'x' + key, lines); }
function award(id) {
  const a = ACH.find(x => x[0] === id); if (!a || !Save.award(id)) return;
  const d = document.createElement('div'); d.className = 'achPop'; d.innerHTML = `<i>★</i><div><small>ACHIEVEMENT UNLOCKED</small><b>${a[1]}</b><span>${a[2]}</span></div>`;
  document.body.appendChild(d); sfx.intel(); setTimeout(() => d.remove(), 4200);
}
function tally(k, n, goal, id) { if (Save.addTotal(k, n) >= goal) award(id); }

// ---------- codex: every scrap of lore, kept across playthroughs ----------
const CODEX_KEY = 'daniel-demolition-codex';
let codex = new Set();
try { codex = new Set(JSON.parse(localStorage.getItem(CODEX_KEY) || '[]')); } catch (err) { /* storage unavailable */ }
function unlockCodex(id) {
  if (codex.has(id)) return; codex.add(id);
  try { localStorage.setItem(CODEX_KEY, JSON.stringify([...codex])); } catch (err) { /* keep it for this session */ }
}
const WHO = { RESHMAN: 'Reshman', RESH_GLITCH: 'Reshman?', RESH_TRUE: 'Reshman', VAULT: 'The Vault', DANIEL: 'Daniel', PA: 'PA', MIRA: 'Mira', MIRA_TRUE: 'Mira', SAND: 'The Sand', PRISONER: 'Prisoner', ABBESS: 'Abbess Tenet', UNENDING: 'The Unending', DEEP: 'The Deep Choir', LETTER: 'A letter', ELDER: 'Master Ilka', YOUNG_RESH: 'Reshman' };
function codexEntries() {
  return LEVELS.map(lv => ({
    tag: lv.tag, entries: [
      ...(lv.memories || []).map((m, i) => ({ id: `${lv.id}-m${i}`, title: m.title, body: m.text })),
      ...lv.intel.map((lines, i) => ({ id: `${lv.id}-i${i}`, title: `${lv.intelName} · ${i + 1}`, body: lines.map(([w, t]) => `${WHO[w]}: ${t}`).join('\n') })),
      ...(lv.testimony || []).map((p, i) => ({ id: `${lv.id}-p${i}`, title: p.title, body: `${p.who}: ` + p.lines.filter(([w]) => w === 'PRISONER').map(([, t]) => t).join(' ') })),
      ...Object.entries(lv.endings || {}).map(([k, e]) => ({ id: `end-${k}`, title: e.stamp, body: e.text })),
    ],
  }));
}
function openCodex(from) {
  const groups = codexEntries(), total = groups.reduce((n, g) => n + g.entries.length, 0), found = groups.reduce((n, g) => n + g.entries.filter(e => codex.has(e.id)).length, 0);
  $('codexCount').textContent = `${found} / ${total} found`;
  $('codexBody').innerHTML = groups.map(g => `<section><h4>${g.tag}</h4>${g.entries.map(e => codex.has(e.id)
    ? `<article><b>${e.title}</b><p>${e.body.replace(/\n/g, '<br>')}</p></article>`
    : `<article class="lock"><b>${e.title}</b><p>Not yet found.</p></article>`).join('')}</section>`).join('');
  $('codex').dataset.from = from; show(from, false); show('codex', true);
}
$('codexClose').onclick = () => { show('codex', false); show($('codex').dataset.from || 'brief', true); };
['codexBtn2', 'codexBtn3'].forEach((id, i) => $(id).onclick = () => openCodex(['pause', 'end'][i]));
let memT = 0;
function showMemory(m, id) {
  $('memTitle').textContent = m.title; $('memText').textContent = m.text; show('memory', true); memT = 12; unlockCodex(id); sfx.bell(330);
}
G = null; newGame(0, true);

// ---------- input ----------
const keys = {}; let locked = false, fallback = false, mouseDown = false;
addEventListener('keydown', e => {
  keys[e.code] = true;
  if (G.state === 'cine') { if (e.code === 'Escape' || e.code === 'Enter') cut.skip(); else if (e.code === 'Space') cut.click(); }
  if (G.state === 'play') {
    if (e.code === 'KeyR') startReload();
    if (e.code === 'KeyQ') throwCharge();
    if (e.code === 'Space' && P.y <= 0) P.vy = 6.2;
    if (e.code === 'Digit1') swapTo('pistol');
    if (e.code === 'Digit2') swapTo('shotgun');
    if (e.code === 'Digit3') swapTo('hammer');
    if (e.code === 'KeyC' || e.code === 'ControlLeft') { P.crouch = !P.crouch; }
    if (e.code === 'KeyF') takedown();
    if (e.code === 'KeyV') blinkStep();
    if (e.code === 'Escape' && fallback) pause();
  } else if (G.state === 'pause' && e.code === 'Escape' && fallback) resume();
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouseDown = false; });
canvas.addEventListener('mousedown', e => { if (G.state === 'cine') { if (cut.waiting) lock(); cut.click(); return; } if (G.state !== 'play') return; if (!locked && !fallback) lock(); if (e.button === 0) { mouseDown = true; shoot(); } });
$('wake').addEventListener('click', () => { if (G.state === 'cine') { lock(); cut.click(); } });
$('wake').style.pointerEvents = 'auto';
addEventListener('mouseup', e => { if (e.button === 0) mouseDown = false; });
addEventListener('mousemove', e => {
  if (G.state !== 'play' || !(locked || fallback)) return;
  const SET = Save.settings, k = .0022 * SET.sens;
  P.yaw -= e.movementX * k; P.pitch = Math.max(-1.45, Math.min(1.45, P.pitch - e.movementY * k * (SET.invert ? -1 : 1)));
});
let everLocked = false;
function lock() {
  if (fallback) return;
  // if pointer lock is never granted (e.g. embedded frame), fall back to free mouse look
  const fail = () => { if (!everLocked) fallback = true; };
  try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(fail); } catch (err) { fail(); }
}
document.addEventListener('pointerlockchange', () => { locked = document.pointerLockElement === canvas; if (locked) everLocked = true; if (!locked && G.state === 'play' && !fallback) pause(); });
document.addEventListener('pointerlockerror', () => { if (!everLocked) fallback = true; });

function show(id, on) { $(id).classList.toggle('hidden', !on); }
let cut = null;
function startCine() {
  audio(); G.state = 'cine'; show('brief', false); show('hud', false); show('end', false); show('pause', false); $('wake').textContent = 'Click to get up';
  cut = LV.cutscene({ scene, camera, L, P, bg: LV.theme.bg, ending: Save.lastEnding || 'X', onDone: () => { cut = null; start(); } });
}
function ambientOn(on) { if (LV.ambient.hum) sfx.hum(on); if (LV.ambient.drone) sfx.drone(on); if (LV.ambient.wind) sfx.wind(on); }
function start() {
  audio(); LV.onStart?.(L); G.state = 'play'; show('brief', false); show('pause', false); show('end', false); show('hud', true); if (!locked) lock(); ambientOn(true);
  story('start'); checkpoint();
  if (LV.perkToast) setTimeout(() => G.state === 'play' && toast(LV.perkToast, 'yel'), 1200);
}
function pause() {
  if (G.state !== 'play') return; G.state = 'pause'; mouseDown = false; show('pause', true); sfx.alarm(false); ambientOn(false);
  const cp = Save.checkpoint, here = cp && !cp.fresh && cp.level === LVI;
  $('pauseTag').textContent = LV.tag;
  $('pauseInfo').textContent = G.armed ? 'No saving while the clock is running. Quitting now returns you to your last checkpoint.' : here ? `Last checkpoint ${ago(cp.savedAt)}.` : 'No checkpoint in this level yet.';
  $('loadCp').disabled = !here;
}
function resume() { G.state = 'play'; show('pause', false); lock(); ambientOn(true); if (G.armed && LV.id === 1) sfx.alarm(true); }
$('skip').onclick = () => cut && cut.skip();
$('resume').onclick = resume;
$('restart2').onclick = () => { newGame(LVI, false); start(); };
$('replay').onclick = () => { newGame(LVI, false); start(); };
$('next').onclick = () => { newGame(LVI + 1, true); startCine(); };
$('loadCp').onclick = () => loadCheckpoint();
$('retryCp').onclick = () => loadCheckpoint();
$('quitMenu').onclick = () => { checkpoint(true); toMenu(); };
$('toMenu').onclick = () => toMenu();

// ---------- checkpoints: rebuild the level fresh, then replay what Daniel had already done ----------
const ago = ts => { const m = Math.round((Date.now() - ts) / 60000); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`; };
const idxWhere = (arr, f) => arr.map((x, i) => f(x) ? i : -1).filter(i => i >= 0);
function snapshot() {
  const boss = L.enemies.find(e => e.kind === 'commander');
  return {
    level: LVI, fresh: false, label: `${LV.tag} · ${L.targets.filter(t => t.planted).length}/3 targets`,
    P: { x: P.x, z: P.z, yaw: P.yaw, hp: P.hp, armor: P.armor, charges: P.charges, wpn: P.wpn, wp: JSON.parse(JSON.stringify(P.wp)), key: P.key, blink: P.blink, blade: P.blade },
    G: Object.fromEntries(['kills', 'shots', 'hits', 'heads', 'takedowns', 'playT', 'dmgTaken', 'intel', 'camsDown', 'secret', 'bossDown', 'wardenSplit', 'wellsDown', 'broken', 'paI', 'forksDown', 'freed', 'bellPlantable', 'stormTD', 'beamHits'].map(k => [k, G[k]])),
    dead: idxWhere(L.enemies.slice(0, L.baseEnemies), e => !e.alive),
    taken: idxWhere(L.pickups.slice(0, L.basePickups), k => k.taken),
    planted: L.targets.filter(t => t.planted).map(t => t.idx),
    barrels: idxWhere(L.barrels, b => b.dead || b.fuse >= 0),
    cams: idxWhere(L.cameras, c => !c.alive), wells: idxWhere(L.wells || [], w => !w.alive),
    forks: idxWhere(L.forks || [], f => !f.alive), freed: idxWhere(L.prisoners || [], p => p.freed),
    gate: W.gateOpen, lock: W.lockOpen, boss: boss && !boss.alive ? [boss.x, boss.z] : null, said: [...Comms.said], walls: [...(L.brokenWalls || [])],
  };
}
function checkpoint(silent = false) {
  if (!['play', 'pause'].includes(G.state) || G.armed || !P.alive) return;
  if (Save.storeCheckpoint(snapshot()) && !silent) flashSave();
}
function flashSave() {
  const s = $('saveIcon'); s.classList.add('hidden'); void s.offsetWidth; s.classList.remove('hidden');
  clearTimeout(flashSave.t); flashSave.t = setTimeout(() => s.classList.add('hidden'), 2200);
}
function placeC4(t, dx = 1, dz = 0) {
  const ax = Math.abs(dx) > Math.abs(dz);
  const c4 = new THREE.Mesh(new THREE.BoxGeometry(ax ? .12 : .6, .4, ax ? .6 : .12), MAT.c4);
  c4.position.set(t.x + (ax ? Math.sign(dx) * 1.46 : 0), 1.1, t.z + (ax ? 0 : Math.sign(dz) * 1.46));
  const led = new THREE.Mesh(new THREE.BoxGeometry(.1, .1, .1), MAT.led); led.position.y = .25; c4.add(led);
  L.group.add(c4); t.led = led; t.c4 = c4;
}
function restore(cp) {
  Object.assign(G, cp.G); Object.assign(P, cp.P); show('abil', P.blink);
  P.wp.hammer ||= { has: true, ammo: 0, reserve: 0 }; // saves from before the sledge existed
  for (const k of cp.walls || []) breakWall(k % COLS, Math.floor(k / COLS), true);
  for (const i of cp.dead) { const e = L.enemies[i]; if (!e) continue; e.alive = false; e.g.visible = false; L.hitList = L.hitList.filter(m => m.userData.enemy !== e); }
  for (const i of cp.taken) { const k = L.pickups[i]; if (k) { k.taken = true; L.group.remove(k.mesh); } }
  if (cp.boss && !P.key && LV.lockBy === 'key' && !cp.lock) makePickup(L, 'Y', cp.boss[0], cp.boss[1]);
  for (const i of cp.barrels) { const b = L.barrels[i]; b.dead = true; L.group.remove(b.mesh); L.hitList = L.hitList.filter(m => m !== b.mesh); }
  for (const i of cp.cams) { const c = L.cameras[i]; c.alive = false; c.cone.visible = false; c.head.rotation.x = .9; L.hitList = L.hitList.filter(m => m.userData.cam !== c); }
  for (const i of cp.wells) { const w = L.wells[i]; sealWell(w); L.hitList = L.hitList.filter(m => m.userData.well !== w); }
  for (const i of cp.forks || []) { const f = L.forks[i]; if (f) { breakFork(f); L.hitList = L.hitList.filter(m => m.userData.fork !== f); } }
  for (const i of cp.freed || []) { const p = L.prisoners[i]; if (p) freeCage(p); }
  for (const idx of cp.planted) { const t = L.targets.find(x => x.idx === idx); t.planted = true; if (LV.instant) LV.breakTarget(t); else placeC4(t); }
  if (LV.instant) G.broken = cp.planted.length;
  if (LV.applyStage && G.broken) LV.applyStage(G.broken, { G, L, tint: c => { G.tint = new THREE.Color(c); } });
  if (cp.gate) { W.gateOpen = true; G.gateY = 1; L.statics = L.statics.filter(m => !L.gateMeshes.includes(m)); L.gateMeshes.forEach(m => m.position.y = 2.1 - 4.3); }
  if (cp.lock) { W.lockOpen = true; G.lockY = 1; L.statics = L.statics.filter(m => !L.lockMeshes.includes(m)); L.lockMeshes.forEach(m => m.position.y = WH / 2 - (WH + .1)); L.anim.chimes?.forEach(q => q.lit = true); }
  Comms.said = new Set(cp.said);
  if (LV.allBroken && G.broken >= 3 && !G.bossDown) (LV.bell ? summonAshe : summonHand)(true); // the boss was already out when the save was made
  renderObjectives();
}
function loadCheckpoint() {
  const cp = Save.checkpoint;
  if (!cp) { newGame(LVI, false); start(); return; }
  if (cp.fresh) { newGame(cp.level, true); startCine(); return; }
  newGame(cp.level, false); restore(cp); start(); toast('Checkpoint loaded');
}

// ---------- main menu ----------
function toMenu() {
  G.state = 'brief'; mouseDown = false; cut = null;
  sfx.alarm(false); sfx.chopper(false); ambientOn(false); Comms.clear(); document.exitPointerLock?.();
  document.body.classList.remove('cinema'); $('fade').style.opacity = 0;
  ['hud', 'pause', 'end', 'cine', 'memory', 'codex'].forEach(id => show(id, false)); show('brief', true);
  refreshMenu(); menuPanel('story');
}
function menuPanel(name) {
  document.querySelectorAll('#menuPanel section').forEach(s => s.classList.toggle('hidden', s.dataset.panel !== name));
  document.querySelectorAll('#menuNav button').forEach(b => b.classList.toggle('on', b.dataset.act === name));
}
let newArmed = false;
function refreshMenu() {
  const cp = Save.checkpoint, prog = Save.progress;
  $('mContinue').disabled = !cp;
  $('contInfo').textContent = cp ? `${cp.fresh ? LEVELS[cp.level].tag + ' · start' : cp.label} · ${ago(cp.savedAt)}` : 'no save yet';
  newArmed = false; $('mNew').classList.remove('confirm'); $('newInfo').textContent = '';
  $('chapterList').innerHTML = LEVELS.map((lv, i) => {
    const open = lv.id <= prog.unlocked, rank = prog.ranks[lv.id];
    const ends = lv.endings ? ` · endings ${Object.keys(lv.endings).filter(k => prog.endings.includes(k)).length}/${Object.keys(lv.endings).length}` : '';
    return `<div class="chapter ${open ? '' : 'locked'}"><div class="num">${lv.bonus ? 'B' : lv.id}</div><div><h5>${lv.tag.split('· ')[1]}</h5>
      <p>${open ? CHAPTER_BLURB[i] : lv.bonus ? 'Finish the final chapter to unlock.' : 'Finish the previous chapter to unlock.'}</p>${open ? `<div class="best">BEST RANK ${rank || '—'}${ends}</div>` : ''}</div>`
      + (open ? `<div class="acts"><button data-ch="${i}" data-cine="1">PLAY ▸</button><button class="ghost" data-ch="${i}">Skip intro</button></div>` : '') + '</div>';
  }).join('');
  const got = Save.progress.ach || [];
  $('achCount').textContent = `${got.length} / ${ACH.length}`;
  $('achList').innerHTML = ACH.map(([id, name, desc]) => `<div class="ach ${got.includes(id) ? 'got' : ''}"><i>${got.includes(id) ? '★' : '☆'}</i><div><b>${name}</b><span>${desc}</span></div></div>`).join('');
  const s = Save.settings;
  $('sSens').value = s.sens; $('oSens').textContent = s.sens.toFixed(2) + '×';
  $('sVol').value = s.vol; $('oVol').textContent = Math.round(s.vol * 100) + '%';
  $('sFov').value = s.fov; $('oFov').textContent = s.fov + '°';
  $('sInvert').checked = s.invert; $('sShake').checked = s.shake;
}
const CHAPTER_BLURB = [
  'Crash into the Crimson Watch base. Rig comms, fuel and power, then run.',
  'The desert swallows Daniel. Glass things sing in the dark under Ironveil.',
  "Inside Reshman's memory, a city of ink. The truth, and a choice.",
  'Saltcrown, nine days later. The Watch has cast a bell from Vault glass, and a stranger called Mira is on the radio.',
  "Sarrat, the Order's monastery in the red canyon, is under siege. Something that used to be Ashe's arm is inside.",
  'The final chapter. The sea has started to sing, and the last of the Watch walked into it. Four ways it can end.',
  'A thousand and four years ago, the night before the Order chose its blade. Play as young Reshman: no guns, and three strikes.',
];
document.querySelectorAll('#menuNav button').forEach(b => b.onclick = () => {
  const act = b.dataset.act; audio();
  if (act === 'continue') loadCheckpoint();
  else if (act === 'new') {
    if (Save.checkpoint && !newArmed) { newArmed = true; b.classList.add('confirm'); $('newInfo').textContent = 'click again to overwrite your save'; return; }
    Save.clearCheckpoint(); newGame(0, true); startCine();
  } else if (act === 'codex') openCodex('brief');
  else if (act === 'credits') rollCredits(null, () => $('mNew').focus());
  else menuPanel(act);
});
$('chapterList').onclick = e => {
  const b = e.target.closest('button[data-ch]'); if (!b) return; audio();
  const i = +b.dataset.ch; newGame(i, !!b.dataset.cine); b.dataset.cine ? startCine() : start();
};
function applySettings() { const s = Save.settings; setVolume(s.vol); camera.fov = s.fov; camera.updateProjectionMatrix(); }
[['sSens', 'sens', v => +v], ['sVol', 'vol', v => +v], ['sFov', 'fov', v => +v]].forEach(([id, k, f]) => $(id).oninput = e => { Save.setSetting(k, f(e.target.value)); applySettings(); refreshMenu(); });
$('sInvert').onchange = e => Save.setSetting('invert', e.target.checked);
$('sShake').onchange = e => Save.setSetting('shake', e.target.checked);
let wipeArmed = false;
$('wipeBtn').onclick = () => {
  if (!wipeArmed) { wipeArmed = true; $('wipeBtn').textContent = 'Click again to erase everything'; return; }
  wipeArmed = false; Save.wipe(); codex.clear(); try { localStorage.removeItem(CODEX_KEY); } catch (err) { /* nothing stored */ }
  $('wipeBtn').textContent = 'Save data erased'; applySettings(); refreshMenu();
};
addEventListener('keydown', e => { // arrow-key navigation through the menu
  if (G.state !== 'brief' || !$('codex').classList.contains('hidden')) return;
  if (e.code !== 'ArrowUp' && e.code !== 'ArrowDown') return;
  const items = [...document.querySelectorAll('#menuNav button:not([disabled])')];
  const i = items.indexOf(document.activeElement), n = e.code === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
  items[i < 0 ? 0 : n].focus();
});
applySettings(); refreshMenu();
requestAnimationFrame(() => ($('mContinue').disabled ? $('mNew') : $('mContinue')).focus());

function story(key, idx) {
  const s = LV.story[key]; if (!s) return;
  const lines = idx === undefined ? s : s[idx]; if (!lines) return;
  Comms.once(LV.id + key + (idx ?? ''), lines);
}

// shout bubbles over guards (and whispers over the glass ones)
const barkTex = {};
function barkTexture(text, glass) {
  return barkTex[text] ||= makeTex((g, w, h) => {
    g.font = '40px Impact'; const tw = g.measureText(text).width + 40;
    g.fillStyle = glass ? '#e4f2ef' : '#f7f0e1'; g.strokeStyle = glass ? '#2a9d9a' : '#1d1b16'; g.lineWidth = 5; const x = (w - tw) / 2;
    g.fillRect(x, 10, tw, 64); g.strokeRect(x, 10, tw, 64);
    g.fillStyle = glass ? '#1f7d7a' : '#9e2b25'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, 44);
  }, 512, 96);
}
function bark(e, kind) {
  if (G.state !== 'play') return;
  const glass = e.kind === 'hollow', list = LV.barks[glass ? 'hollow' : 'soldier']?.[kind]; if (!list) return;
  const text = list[Math.floor(Math.random() * list.length)];
  if (!e.barkS) { e.barkS = new THREE.Sprite(new THREE.SpriteMaterial({ fog: false, depthTest: false })); e.barkS.scale.set(2.4, .45, 1); e.barkS.position.y = 2.95; e.barkS.renderOrder = 10; e.g.add(e.barkS); }
  e.barkS.material.map = barkTexture(text, glass); e.barkS.material.needsUpdate = true; e.barkS.visible = true; e.barkT = 1.8;
  if (glass && kind === 'alert') sfx.whisper();
  if (kind === 'alert') { story(glass ? 'hollow' : 'spotted'); if (e.boss) extra('boss'); seenBy(); }
}
// being seen: counted for the Ghost achievement, and in the bonus trial three strikes end it
function seenBy() {
  if (G.spotCd > G.t) return; G.spotCd = G.t + 3; G.spotted++; renderObjectives();
  if (!LV.spotLimit) return;
  toast(`SEEN · ${G.spotted}/${LV.spotLimit}`, 'red');
  if (G.spotted >= LV.spotLimit) { sfx.bell(660); endGame(false, LV.text.spotted, LV.text.spottedTitle); }
}

// ---------- HUD helpers ----------
function toast(text, cls = '') { const d = document.createElement('div'); d.className = 'toast ' + cls; d.textContent = text; $('toasts').appendChild(d); setTimeout(() => d.remove(), 2600); }
function hitmark(head) { const h = $('hitmk'); h.className = ''; void h.offsetWidth; h.className = 'show' + (head ? ' head' : ''); }
let vignT = 0, dirT = 0;
function hurtFrom(sx, sz) {
  const dx = sx - P.x, dz = sz - P.z, fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
  $('dmgdir').style.transform = `rotate(${Math.atan2(dx * rx + dz * rz, dx * fx + dz * fz)}rad)`; dirT = 1;
}

// ---------- combat ----------
const ray = new THREE.Raycaster(); ray.far = 140;
const fwd = () => new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation);

function shoot() {
  if (G.state !== 'play' || P.reload > 0 || P.fireCd > 0 || G.knifeT > 0 || P.wpn === 'hammer') return;
  const wp = P.wp[P.wpn], W8 = WEAPONS[P.wpn];
  if (wp.ammo <= 0) { sfx.click(); P.fireCd = .25; startReload(); return; }
  wp.ammo--; P.fireCd = W8.rate; G.shots++; P.recoil = P.wpn === 'shotgun' ? 1.8 : 1; P.pitch = Math.min(1.45, P.pitch + (P.wpn === 'shotgun' ? .04 : .014));
  const mz = P.wpn === 'shotgun' ? sgMuzzle : muzzle;
  P.wpn === 'shotgun' ? sfx.pump() : sfx.shot(); mz.visible = true; mz.rotation.z = Math.random() * 3; muzLight.intensity = 25; muzLight.position.copy(camera.position);
  setTimeout(() => mz.visible = false, 45);
  noise(P.x, P.z, W8.noise);
  const spread = W8.spread + (P.speedNow > .5 ? .018 : 0) + P.heat * .02 + (P.y > 0 ? .03 : 0) - (P.crouch ? .003 : 0); P.heat = Math.min(1, P.heat + .2);
  const pool = L.statics.concat(L.hitList); let landed = false;
  const dmgTo = new Map();
  for (let i = 0; i < W8.pellets; i++) {
    const dir = fwd().add(new THREE.Vector3((Math.random() - .5) * spread, (Math.random() - .5) * spread, (Math.random() - .5) * spread)).normalize();
    ray.set(camera.position, dir);
    const hits = ray.intersectObjects(pool, false);
    if (!hits.length) continue;
    const h = hits[0], ud = h.object.userData;
    if (ud.enemy) {
      if (!ud.enemy.alive) continue;
      const falloff = P.wpn === 'shotgun' ? Math.max(.25, 1 - h.distance / 22) : 1;
      const cur = dmgTo.get(ud.enemy) || { d: 0, head: false };
      const glassHide = ud.enemy.kind === 'hand' && !(ud.enemy.stunT > 0) ? .3 : 1; // the Hand shrugs off bullets unless stunned
      if (glassHide < 1) extra('handGlass');
      cur.d += (ud.head ? W8.head : W8.dmg) * falloff * glassHide; cur.head ||= ud.head; dmgTo.set(ud.enemy, cur);
      sparks(h.point, P.wpn === 'shotgun' ? 3 : 7, ud.enemy.kind === 'hollow' ? 0x9fe6e0 : 0x9e2b25, 3); landed = true;
    } else if (ud.barrel) { landed = true; igniteBarrel(ud.barrel, .15); sparks(h.point, 8); }
    else if (ud.cam) { landed = true; breakCamera(ud.cam); }
    else if (ud.well) { landed = true; damageWell(ud.well, W8.dmg * .6); sparks(h.point, 4, 0x1d1b16, 3); }
    else if (ud.fork) { landed = true; damageFork(ud.fork, W8.dmg); sparks(h.point, 5, 0x9feef4, 3); }
    else if (ud.bellHit) { if (i === 0) { sfx.chime(220 + Math.random() * 60); extra('bellImmune'); } sparks(h.point, 4, 0x9feef4, 2); }
    else if (ud.chime !== undefined) { if (i === 0) hitChime(ud.chime); sparks(h.point, 6, 0xffe08a, 3); }
    else if (ud.crystal) { if (i === 0) sfx.chime(900 + Math.random() * 900); sparks(h.point, 6, 0x9fe6e0, 3); }
    else { sparks(h.point, P.wpn === 'shotgun' ? 2 : 5); if (h.face && (i < 3)) decal(h.point, h.face.normal.clone().transformDirection(h.object.matrixWorld)); }
  }
  let anyHead = false;
  for (const [e, { d, head }] of dmgTo) { damageEnemy(e, d, head); anyHead ||= head; if (e.kind === 'hollow') sfx.chime(1800 + Math.random() * 600); }
  if (dmgTo.size) { G.hits++; hitmark(anyHead); sfx.hit(anyHead); } else if (landed) G.hits++;
}
function startReload() {
  if (WEAPONS[P.wpn].melee) return;
  const wp = P.wp[P.wpn], W8 = WEAPONS[P.wpn];
  if (P.reload > 0 || wp.ammo >= W8.mag || wp.reserve <= 0) { if (wp.reserve <= 0 && wp.ammo <= 0) toast('Out of ammo. Find a supply box.'); return; }
  P.reload = W8.reload; sfx.reload();
}
function swapTo(w) {
  if (!P.wp[w]?.has || P.wpn === w) return;
  P.wpn = w; P.reload = 0; P.fireCd = .35; P.recoil = 2; P.hCharge = 0; P.swingT = 0; sfx.click();
}
// ---------- the sledge: quick swings, or hold to wind up a smash that hits everything around you ----------
function startSwing(kind) {
  const S8 = SWING[kind]; P.swingKind = kind; P.swingT = S8.time; P.swingHit = false; P.hCharge = 0; sfx.swing();
}
function swingImpact() {
  const S8 = SWING[P.swingKind], heavy = P.swingKind === 'heavy';
  const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw);
  const inArc = (x, z, extra = 0) => { const dx = x - P.x, dz = z - P.z, d = Math.hypot(dx, dz); return d < S8.range + extra && (d < .8 || (dx * fx + dz * fz) / d > S8.cone); };
  let hitSomething = false;
  for (const e of L.enemies) {
    if (!e.alive) continue;
    const big = e.kind === 'heart' || e.kind === 'hand' ? 2 : e.boss ? .6 : 0;
    if (!inArc(e.x, e.z, big)) continue;
    let dmg = S8.dmg * (e.kind === 'hand' ? 1.6 : 1);
    if (e.state !== 'alert' && !e.boss) dmg *= 2; // a sledge from behind ends most conversations
    damageEnemy(e, dmg, false); hitSomething = true;
    if (!e.alive) tally('sledge', 1, 25, 'mother');
    if (e.kind !== 'heart') { const d = Math.max(.1, Math.hypot(e.x - P.x, e.z - P.z)); moveCircle(e, (e.x - P.x) / d * (heavy ? 1.6 : .6), (e.z - P.z) / d * (heavy ? 1.6 : .6), .4); }
    if (heavy && e.kind === 'hand') e.stunT = 2.2;
    sparks(new THREE.Vector3(e.x, 1.3, e.z), 8, e.kind === 'hollow' || e.glassGuard || e.kind === 'hand' ? 0x9feef4 : e.kind === 'shade' ? 0x1d1b16 : 0x9e2b25, 4);
  }
  for (const b of L.barrels) if (!b.dead && inArc(b.x, b.z)) { igniteBarrel(b, .4); hitSomething = true; }
  for (const f of L.forks || []) if (f.alive && inArc(f.x, f.z, .6)) { damageFork(f, heavy ? 90 : 45); hitSomething = true; }
  for (const w of L.wells || []) if (w.alive && inArc(w.x, w.z, .6)) { damageWell(w, heavy ? 120 : 50); hitSomething = true; }
  // walls: anything cracked within reach in front of Daniel comes down
  for (const d of [1.6, 2.8, 3.6]) {
    if (!heavy && d > 2.8) break;
    const c = Math.floor((P.x + fx * d) / S), r = Math.floor((P.z + fz * d) / S);
    if (cell(c, r) === 'w') { if (heavy) breakWall(c, r); else { sfx.thud(); toast('Cracked. Hold to wind up a heavy smash.'); extra('crackHint'); } hitSomething = true; break; }
  }
  if (heavy) {
    G.shake = Math.max(G.shake, .3); sfx.smash(); noise(P.x, P.z, S8.noise);
    const ring = new THREE.Mesh(new THREE.RingGeometry(.4, .7, 24), new THREE.MeshBasicMaterial({ color: 0xd8c39a, transparent: true, opacity: .7, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(P.x + fx * 1.4, .06, P.z + fz * 1.4); L.group.add(ring); let k = 0;
    FX.list.push(dt => { k += dt; ring.scale.setScalar(1 + k * 9); ring.material.opacity = .7 * (1 - k / .45); if (k > .45) { L.group.remove(ring); return false; } return true; });
    puff(new THREE.Vector3(P.x + fx * 1.6, .3, P.z + fz * 1.6), 1, 1.2, 0xd8c39a, .4, .5);
  } else { noise(P.x, P.z, S8.noise); if (hitSomething) sfx.thud(); }
  if (hitSomething) { hitmark(false); G.hits++; }
  G.shots++;
}
function breakWall(c, r, silent = false) {
  if (cell(c, r) !== 'w') return;
  W.grid[r][c] = '.'; (L.brokenWalls ||= []).push(r * COLS + c);
  const m = L.cracked?.[r * COLS + c]; if (m) { L.group.remove(m); L.statics = L.statics.filter(s => s !== m); }
  if (silent) return;
  const p = new THREE.Vector3(c * S + S / 2, 1.5, r * S + S / 2);
  sfx.rubble(); G.shake = Math.max(G.shake, .4);
  for (let i = 0; i < 5; i++) puff(p.clone().add(new THREE.Vector3((Math.random() - .5) * 3, Math.random() * 2, (Math.random() - .5) * 3)), 1.4, 1.8, 0xd8b48a, .5, .6);
  sparks(p, 20, 0xb5653c, 6); toast('WALL DOWN', 'yel'); extra('wall'); award('firstWall'); tally('walls', 1, 10, 'wrecker'); checkpoint();
}
// silent knife takedown on someone who hasn't noticed you
function takedownTarget() {
  const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw);
  for (const e of L.enemies) {
    if (!e.alive || e.kind === 'heart' || e.kind === 'hand' || (e.boss && e.kind === 'hollow')) continue;
    if (e.state === 'alert' && !P.blade) continue;
    const dx = e.x - P.x, dz = e.z - P.z, d = Math.hypot(dx, dz);
    if (d < (P.blade ? 2.7 : 2) && (dx * fx + dz * fz) / d > .55) return e;
  }
  return null;
}
function takedown() {
  const e = takedownTarget(); if (!e || G.knifeT > 0) return;
  G.knifeT = .45; P.blade ? sfx.slash() : sfx.knife(); G.takedowns++; tally('takedowns', 1, 25, 'quiet25');
  if (G.storm && !e.boss) { G.stormTD++; renderObjectives(); if (G.stormTD === 3) { toast('THE QUIET WAY · optional complete', 'yel'); extra('quietDone'); award('storm'); } }
  if (e.boss) { damageEnemy(e, 120, false); toast('BLADE STRIKE', 'yel'); return; }
  damageEnemy(e, 9999, false, true);
  toast('SILENT TAKEDOWN', 'yel'); extra('takedown');
}
function blinkStep() {
  if (!P.blink || P.blinkCd > 0) return;
  const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), from = new THREE.Vector3(P.x, 1.2, P.z);
  let moved = 0;
  for (let i = 0; i < 32; i++) { const ox = P.x, oz = P.z; moveCircle(P, fx * .25, fz * .25, .4); if (P.x === ox && P.z === oz) break; moved += .25; }
  if (moved < .5) return;
  P.blinkCd = 2.5; sfx.blink(); camera.fov = Save.settings.fov + 17; camera.updateProjectionMatrix();
  sparks(from, 14, 0x7ff7ee, 4); sparks(new THREE.Vector3(P.x, 1.2, P.z), 14, 0x7ff7ee, 4);
}
function blink(e) {
  for (let i = 0; i < 14; i++) {
    const c = Math.floor(e.x / S) + Math.round((Math.random() - .5) * 5), r = Math.floor(e.z / S) + Math.round((Math.random() - .5) * 5);
    if (!walkable(c, r) || cell(c, r) === 'X') continue;
    sparks(new THREE.Vector3(e.x, 1.4, e.z), 10, 0x9fe6e0, 4); e.x = c * S + S / 2; e.z = r * S + S / 2; e.path = null; sfx.blink();
    sparks(new THREE.Vector3(e.x, 1.4, e.z), 10, 0x9fe6e0, 4); return;
  }
}
function damageEnemy(e, dmg, head, silent = false) {
  if (!e.alive) return;
  if (e.glassGuard && forkShielding(e)) { // a live tuning fork nearby hardens their glass
    dmg *= e.kind === 'marshal' ? .5 : .3; sparks(new THREE.Vector3(e.x, 1.5, e.z), 5, 0x9feef4, 2); extra('forkShield');
  }
  e.hp -= dmg; e.hurtT = .12;
  if (e.hp <= 0) {
    e.alive = false; G.kills++; if (head) G.heads++;
    L.hitList = L.hitList.filter(m => m.userData.enemy !== e);
    if (e.kind === 'hollow') { e.g.visible = false; sparks(new THREE.Vector3(e.x, 1.3, e.z), e.boss ? 60 : 24, 0xbff4f0, e.boss ? 9 : 6); sparks(new THREE.Vector3(e.x, 2, e.z), 6, 0xf2b51c, 3); sfx.shatter(); }
    if (e.kind === 'shade') { e.g.visible = false; for (let i = 0; i < 4; i++) puff(new THREE.Vector3(e.x + (Math.random() - .5), .6 + i * .4, e.z + (Math.random() - .5)), .8, 1.4, 0x1d1b16, .6, .7); sfx.ink(); }
    if (e.kind === 'heart') { heartBroken(e); return; }
    if (!silent) toast(e.boss ? `${e.name} DOWN` : e.kind === 'hollow' ? (head ? 'GEM SHATTERED' : 'Glass broken') : (head ? 'HEADSHOT' : 'Hostile down'), head || e.boss ? 'red' : '');
    if (e.boss) {
      G.bossDown = true; extra('bossDown'); show('boss', false);
      if (e.kind === 'commander') makePickup(L, 'Y', e.x, e.z);
      else if (e.kind === 'hollow') { P.charges += 3; toast('+3 sticky charges (the Warden dropped them?)', 'yel'); }
      else if (e.kind === 'marshal') { G.bellPlantable = true; for (let i = 0; i < 3; i++) sparks(new THREE.Vector3(e.x, 1.4, e.z), 20, 0xcdf1f6, 6); sfx.shatter(); }
      else if (e.kind === 'hand') {
        e.g.visible = false; if (e.slam) { L.group.remove(e.slam.ring); e.slam = null; } sfx.shatter(); sfx.smash(); G.shake = .8; fireball(new THREE.Vector3(e.x, 2.5, e.z), 2);
        for (let i = 0; i < 5; i++) setTimeout(() => sparks(new THREE.Vector3(e.x, 2.4, e.z), 30, i % 2 ? 0xf2b51c : 0xd6f3f8, 9), i * 110);
        for (const o of L.enemies) if (o.alive && o.glassGuard) damageEnemy(o, 9999, false, true); // the song stops; the Unending stop with it
        setTimeout(() => G.state === 'play' && arm(), 700);
      }
      renderObjectives(); setTimeout(checkpoint, 0);
    }
    story('kill1'); if (G.kills === 5) story('kill5');
  } else {
    if (e.kind === 'heart') { if (e.hp < e.maxHp / 2) extra('bossHalf'); return; }
    if (e.kind === 'hand') { if (e.state !== 'alert') { e.state = 'alert'; extra('boss'); } if (e.hp < e.maxHp / 2) extra('bossHalf'); return; }
    if (e.kind === 'marshal') { // at two-thirds and one-third, Ashe calls guards and rings the bell early
      const stage = e.hp < e.maxHp / 3 ? 2 : e.hp < e.maxHp * 2 / 3 ? 1 : 0;
      if (stage > G.asheStage) {
        G.asheStage = stage; toast('ASHE RINGS THE BELL', 'red'); G.bellT = Math.min(G.bellT, 5.5);
        for (const [c, r] of [[8, 10], [16, 10]]) { const g = makeEnemy(L, c * S + S / 2, r * S + S / 2, true, { glass: true }); puff(new THREE.Vector3(g.x, .6, g.z), 1.2, 1.4, 0xf4efe8, .6, .6); }
        Comms.say('PA', stage === 1 ? 'CHOIRGUARD, TO YOUR MARSHAL.' : 'WE. SHALL. NOT. END.', 2.4);
      }
    }
    alertEnemy(e, P, e.boss ? .15 : .3);
    if (e.kind === 'hollow' && Math.random() < (e.boss ? .55 : .45)) blink(e);
    if (e.boss && e.kind === 'hollow' && !G.wardenSplit && e.hp < e.maxHp / 2) {
      G.wardenSplit = true; toast('THE WARDEN SPLITS', 'red'); sfx.shatter();
      for (let i = 0; i < 2; i++) { const h = makeHollow(L, e.x + (i ? 1.5 : -1.5), e.z, true); blink(h); }
    }
  }
}
function damagePlayer(d, sx, sz) {
  if (!P.alive || G.state !== 'play') return;
  if (P.armor > 0) { const soak = Math.min(P.armor, d * .6); P.armor -= soak; d -= soak; }
  G.dmgTaken += d; P.lastHurt = G.t;
  P.hp = Math.max(0, P.hp - d); vignT = 1; sfx.hurt(); hurtFrom(sx, sz); G.shake = Math.max(G.shake, .08);
  if (P.hp < 40 && P.hp > 0) story('lowhp');
  if (P.hp <= 0) { P.alive = false; endGame(false, LV.text.death, 'Daniel is down.'); }
}
function noise(x, z, rad) { for (const e of L.enemies) if (e.alive && Math.hypot(e.x - x, e.z - z) < rad) alertEnemy(e, P, .9); }

const shardGeo = new THREE.OctahedronGeometry(.16, 0), shardMat = new THREE.MeshBasicMaterial({ color: 0x5ff2e6 });
function enemyFire(e, dist) {
  if (e.kind === 'shade') { // ink blades: up close only
    if (dist < 2.3) { damagePlayer(13, e.x, e.z); sfx.slash(); e.blade.rotation.x = .9; setTimeout(() => e.blade && (e.blade.rotation.x = -.6), 160); }
    return;
  }
  if (e.kind === 'hollow') { // a slow crystal shard you can sidestep (the Warden throws a fan of three)
    const from = new THREE.Vector3(e.x + Math.sin(e.yaw) * .6, e.boss ? 2.6 : 1.7, e.z + Math.cos(e.yaw) * .6);
    const lead = P.speedNow > 0 ? .25 : 0;
    const to = new THREE.Vector3(P.x - Math.sin(P.yaw) * P.speedNow * lead, 1.3 + P.y, P.z - Math.cos(P.yaw) * P.speedNow * lead);
    const base = to.clone().sub(from).normalize();
    for (const a of e.boss ? [-.14, 0, .14] : [0]) {
      const v = base.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), a).multiplyScalar(e.boss ? 15 : 13);
      const m = new THREE.Mesh(shardGeo, shardMat); m.position.copy(from); m.scale.set(1, 1, 2.6); m.lookAt(from.clone().add(v)); L.group.add(m);
      G.shards.push({ m, v, t: 0, src: e, dmg: e.boss ? 14 : 12 });
    }
    e.flashT = .15; sfx.shard(); return;
  }
  let p = .7 - dist * .018; if (P.speedNow > .5) p *= .7; if (P.sprint) p *= .8; if (P.crouch) p *= .85; p = Math.max(.15, p);
  const from = new THREE.Vector3(e.x + Math.sin(e.yaw) * .9 + Math.cos(e.yaw) * .14, 1.34, e.z + Math.cos(e.yaw) * .9 - Math.sin(e.yaw) * .14);
  const hit = Math.random() < p, to = new THREE.Vector3(P.x, 1.2 + P.y, P.z);
  if (!hit) { to.x += (Math.random() - .5) * 2.4; to.y += Math.random() * 1.4 - .4; to.z += (Math.random() - .5) * 2.4; if (dist < 9) sfx.whiz(); }
  tracer(from, to, 0xffb347); e.flashT = .06; sfx.enemyShot(dist);
  if (hit) damagePlayer((e.boss ? 9 : 6) + Math.random() * 5, e.x, e.z);
}
function updateShards(dt) {
  G.shards = G.shards.filter(s => {
    s.t += dt; s.m.position.addScaledVector(s.v, dt); s.m.rotateZ(dt * 12);
    const p = s.m.position;
    if (Math.hypot(p.x - P.x, p.z - P.z) < .6 && Math.abs(p.y - (1.2 + P.y)) < 1) { damagePlayer(s.dmg || 12, s.src.x, s.src.z); sparks(p.clone(), 8, 0x9fe6e0, 3); L.group.remove(s.m); return false; }
    if (solidAt(p.x, p.z) || p.y < 0 || s.t > 3) { sparks(p.clone(), 5, 0x9fe6e0, 2); L.group.remove(s.m); return false; }
    return true;
  });
}
const aiCtx = {
  get P() { return P; }, get t() { return G.t; }, fire: enemyFire, bark: (e, k) => bark(e, k), heart: (e, dt) => heartTick(e, dt), hand: (e, dt) => handTick(e, dt),
  get sight() { return LV.storm ? 30 - G.stormK * 20 : 30; },
  shareSight(e) { for (const o of L.enemies) if (o !== e && o.alive && Math.hypot(o.x - e.x, o.z - e.z) < 12) alertEnemy(o, P, 1.1); },
};

// ---------- level 3: the First Note and the ink wells ----------
function spawnShadeNear(x, z, rings = 2) {
  for (let i = 0; i < 12; i++) {
    const c = Math.floor(x / S) + Math.round((Math.random() - .5) * rings * 2), r = Math.floor(z / S) + Math.round((Math.random() - .5) * rings * 2);
    if (!walkable(c, r) || '#XZ'.includes(cell(c, r))) continue;
    const sx = c * S + S / 2, sz = r * S + S / 2; if (Math.hypot(sx - P.x, sz - P.z) < 4) continue;
    makeShade(L, sx, sz, true); puff(new THREE.Vector3(sx, .5, sz), 1.4, 1.6, 0x1d1b16, .8, .7); return true;
  }
  return false;
}
function heartTick(e, dt) {
  const t = G.t;
  e.rings.forEach((r, i) => { r.rotation.x = t * (.4 + i * .2); r.rotation.y = t * (.3 - i * .1); });
  e.shards.forEach((s, i) => { const a = t * .8 + i * Math.PI / 4; s.position.set(Math.cos(a) * 2.4, 3 + Math.sin(t * 2 + i) * .6, Math.sin(a) * 2.4); s.rotation.y += dt * 2; });
  e.heart.rotation.y += dt * 3; e.shell.rotation.y -= dt * .4; e.shell.position.y = e.heart.position.y = 3 + Math.sin(t * 1.3) * .2;
  e.hurtT -= dt; e.glass.emissive.setHex(e.hurtT > 0 ? 0x661100 : e.baseEm);
  e.light.intensity = 26 + Math.sin(t * 6) * 6;
  if (!W.gateOpen || G.state !== 'play') return;
  if (LV.deepSong && e.state === 'alert') deepSong(e, dt);
  const dx = P.x - e.x, dz = P.z - e.z, d = Math.hypot(dx, dz);
  if (d > 30 || (d > 3 && !los(e.x + dx / d * 2.8, e.z + dz / d * 2.8, P.x, P.z))) return; // look from just outside its own plinth
  if (e.state !== 'alert') { e.state = 'alert'; extra('boss'); sfx.beat(); }
  G.beatT -= dt; if (G.beatT <= 0) { G.beatT = e.hp < e.maxHp / 2 ? .8 : 1.3; sfx.beat(); }
  e.fireT -= dt; e.spawnT -= dt; e.pulseT -= dt;
  if (e.fireT <= 0) { // a fan of shards
    e.fireT = e.hp < e.maxHp / 2 ? 1.1 : 1.7;
    const from = new THREE.Vector3(e.x, 3, e.z), base = new THREE.Vector3(P.x, 1.3 + P.y, P.z).sub(from).normalize();
    for (const a of [-.3, -.15, 0, .15, .3]) {
      const v = base.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), a).multiplyScalar(14);
      const m = new THREE.Mesh(shardGeo, shardMat); m.position.copy(from); m.scale.set(1.3, 1.3, 3); m.lookAt(from.clone().add(v)); L.group.add(m);
      G.shards.push({ m, v, t: 0, src: e, dmg: 13 });
    }
    sfx.shard();
  }
  if (e.spawnT <= 0) {
    e.spawnT = e.hp < e.maxHp / 2 ? 9 : 13;
    if (LV.deepSong) { e.spawnT += 6; if (L.enemies.filter(o => o.alive && o.glassGuard).length < 6) { spawnChoirNear(e.x, e.z + S); spawnChoirNear(e.x, e.z + S); sfx.chime(196); } }
    else { spawnShadeNear(e.x, e.z, 3); spawnShadeNear(e.x, e.z, 3); sfx.ink(); }
  }
  if (e.pulseT <= 0 && d < 8) { // shockwave: get out of the ring
    e.pulseT = 7; sfx.pulse(); G.shake = .4;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1, .12, 6, 40), new THREE.MeshBasicMaterial({ color: 0x1d1b16, transparent: true }));
    ring.rotation.x = Math.PI / 2; ring.position.set(e.x, .4, e.z); L.group.add(ring); let k = 0, hit = false;
    FX.list.push(dt2 => { k += dt2; ring.scale.setScalar(1 + k * 9); ring.material.opacity = 1 - k / .9;
      if (!hit && Math.abs(Math.hypot(P.x - e.x, P.z - e.z) - (1 + k * 9)) < .8 && P.y < .5) { hit = true; damagePlayer(18, e.x, e.z); }
      if (k > .9) { L.group.remove(ring); return false; } return true; });
  }
}
function heartBroken(e) {
  G.bossDown = true; G.heartDown = true; show('boss', false);
  for (let i = 0; i < 5; i++) setTimeout(() => sparks(new THREE.Vector3(e.x, 3, e.z), 30, i % 2 ? 0xf2b51c : 0xf4f0ff, 9), i * 120);
  fireball(new THREE.Vector3(e.x, 3, e.z), 2.4); sfx.shatter(); sfx.boom(1); sfx.bell(262); G.shake = .8;
  e.g.visible = false; show('bellWarn', false);
  for (const o of L.enemies) if (o.alive && (o.kind === 'shade' || o.glassGuard)) damageEnemy(o, 9999, false, true);
  toast(`${e.name} IS BROKEN`, 'red');
  G.armed = true; G.timer = LV.timer; show('timerWrap', true); renderObjectives();
  Comms.queue = []; extra('bossDown');
}
function damageWell(w, dmg) {
  if (!w.alive) return;
  w.hp -= dmg;
  if (w.hp <= 0) {
    sealWell(w); G.wellsDown++; sfx.bell(440 + G.wellsDown * 60); puff(new THREE.Vector3(w.x, 1, w.z), 2, 2, 0x1d1b16, 1, .7);
    L.hitList = L.hitList.filter(m => m.userData.well !== w);
    toast(`Ink well sealed · ${G.wellsDown}/${L.wells.length}`, 'yel'); renderObjectives();
    if (G.wellsDown === L.wells.length) { extra('wells'); unlockDoor(); }
  }
}
function updateWells(dt) {
  if (!L.wells) return;
  const shades = L.enemies.filter(e => e.alive && e.kind === 'shade').length;
  for (const w of L.wells) {
    if (!w.alive) continue; w.spawnT -= dt;
    if (w.spawnT <= 0) { w.spawnT = 18 + Math.random() * 8; if (shades < 9 && Math.hypot(w.x - P.x, w.z - P.z) < 34 && spawnShadeNear(w.x, w.z, 1)) sfx.ink(); }
  }
}

function explode(p, rad, dmg, size = 1) {
  fireball(p, size); sfx.boom(Math.min(1, size * .9 / Math.max(1, Math.hypot(p.x - P.x, p.z - P.z) / 14)));
  boomLight.position.copy(p).setY(2); boomLight.intensity = 400 * size;
  const pd = Math.hypot(p.x - P.x, p.z - P.z); G.shake = Math.max(G.shake, Math.max(0, .6 * size - pd * .02));
  for (const e of L.enemies) {
    if (!e.alive) continue; const d = Math.hypot(e.x - p.x, e.z - p.z), heart = e.kind === 'heart' || e.kind === 'hand';
    if (d < rad + (heart ? 1.6 : 0) && (heart || los(p.x, p.z, e.x, e.z))) damageEnemy(e, dmg * (1 - Math.min(d, rad) / rad) + 25, false);
  }
  for (const w of L.wells || []) if (w.alive && Math.hypot(w.x - p.x, w.z - p.z) < rad) damageWell(w, dmg);
  for (const f of L.forks || []) if (f.alive && Math.hypot(f.x - p.x, f.z - p.z) < rad) damageFork(f, dmg);
  for (let r = Math.floor((p.z - rad * .6) / S); r <= Math.floor((p.z + rad * .6) / S); r++) for (let c = Math.floor((p.x - rad * .6) / S); c <= Math.floor((p.x + rad * .6) / S); c++)
    if (cell(c, r) === 'w' && Math.hypot(c * S + S / 2 - p.x, r * S + S / 2 - p.z) < rad * .75) breakWall(c, r);
  if (pd < rad && los(p.x, p.z, P.x, P.z)) damagePlayer(dmg * .55 * (1 - pd / rad), p.x, p.z);
  for (const b of L.barrels) if (!b.dead && b.fuse < 0 && Math.hypot(b.x - p.x, b.z - p.z) < rad * .8) igniteBarrel(b, .25 + Math.random() * .2);
  noise(p.x, p.z, 32);
}
function igniteBarrel(b, t) { if (!b.dead && b.fuse < 0) b.fuse = t; }

// ---------- level 1 cameras ----------
function breakCamera(cam) {
  if (!cam.alive) return;
  cam.alive = false; cam.cone.visible = false; cam.head.rotation.x = .9; sparks(new THREE.Vector3(cam.x, WH - .5, cam.z), 14, 0xffc861, 4); sfx.clank();
  L.hitList = L.hitList.filter(m => m.userData.cam !== cam);
  G.camsDown++; toast(`Camera down · ${G.camsDown}/${L.cameras.length}`); renderObjectives();
  if (G.camsDown === L.cameras.length) extra('cams');
}
function updateCameras(dt) {
  for (const c of L.cameras) {
    if (!c.alive) continue;
    c.ph += dt * .55; c.cool -= dt;
    const dx = P.x - c.x, dz = P.z - c.z, d = Math.hypot(dx, dz);
    let watching = false;
    if (c.sus > 0 && d < 14 && los(c.x, c.z, P.x, P.z)) c.yaw += wrapTo(c.yaw, Math.atan2(dx, dz)) * Math.min(1, dt * 3);
    else c.yaw = c.base + Math.sin(c.ph) * 1.05;
    c.head.rotation.y = c.yaw;
    if (P.alive && d < 13 && d > .5 && los(c.x, c.z, P.x, P.z)) { const dot = (Math.sin(c.yaw) * dx + Math.cos(c.yaw) * dz) / d; watching = dot > Math.cos(.42); }
    c.sus = Math.max(0, Math.min(1, c.sus + (watching ? dt * (P.crouch ? .7 : 1.4) : -dt * .5)));
    c.coneMat.color.setHex(c.sus > .05 ? (c.sus > .6 ? 0xff5a3a : 0xffb347) : 0xffe08a); c.coneMat.opacity = .12 + c.sus * .12;
    if (c.sus >= 1 && c.cool <= 0) {
      c.cool = 6; c.sus = .6; sfx.camera(); toast('CAMERA SPOTTED YOU', 'red'); extra('camera'); seenBy();
      for (const e of L.enemies) if (e.alive && Math.hypot(e.x - P.x, e.z - P.z) < 30) alertEnemy(e, P, 1);
    } else if (watching && c.sus > .25) extra('camera');
  }
}

// ---------- level 2 chime puzzle and locked doors ----------
function hitChime(idx) {
  if (G.secret || W.lockOpen) return;
  const A = L.anim;
  if (idx === G.chimeStep) {
    setChime(A, idx, true); sfx.chime([660, 880, 1320][idx]); G.chimeStep++;
    if (G.chimeStep === 3) { setTimeout(() => sfx.chime(1760), 250); unlockDoor(); }
  } else if (!A.chimes.find(q => q.idx === idx).lit) {
    G.chimeStep = 0; A.chimes.forEach(q => q.lit = false); sfx.sour(); extra('chimeWrong');
  }
}
function unlockDoor() {
  if (W.lockOpen) return;
  W.lockOpen = true; G.lockY = 0.0001; G.secret = true; sfx.unlock(); renderObjectives(); setTimeout(checkpoint, 0);
  L.statics = L.statics.filter(m => !L.lockMeshes.includes(m));
  toast(LV.id === 1 ? 'ARMORY UNLOCKED' : 'SOMETHING OPENED IN THE NORTH', 'yel'); extra('unlock');
}
function nearLock() {
  for (const m of L.lockMeshes) if (Math.hypot(m.position.x - P.x, m.position.z - P.z) < 3.4) return m;
  return null;
}

// ---------- level 4: Saltcrown's bell, forks, prisoners and the collapse ----------
function forkShielding(e) { return (L.forks || []).some(f => f.alive && Math.hypot(f.x - e.x, f.z - e.z) < 14); }
function damageFork(f, dmg) {
  if (!f.alive) return;
  f.hp -= dmg; sfx.chime(1400 + Math.random() * 500);
  if (f.hp > 0) return;
  breakFork(f); G.forksDown++; sfx.shatter(); sparks(new THREE.Vector3(f.x, 3.5, f.z), 24, 0x9feef4, 6);
  L.hitList = L.hitList.filter(m => m.userData.fork !== f);
  toast(`Tuning fork broken · ${G.forksDown}/${L.forks.length}`, 'yel'); renderObjectives();
  if (G.forksDown === L.forks.length) extra('forksAll');
}
function summonAshe(silent = false) {
  const b = L.bell, x = b.x, z = b.z + S; // Ashe steps out just south of the bell
  makeEnemy(L, x, z, true, { boss: true, marshal: true, name: LV.bossName });
  renderObjectives();
  if (silent) return;
  for (let i = 0; i < 3; i++) sparks(new THREE.Vector3(x, 1.4 + i * .5, z), 16, 0xcdf1f6, 5);
  toast(`${LV.bossName} ENTERS THE COURTYARD`, 'red'); sfx.toll(); G.shake = .4;
  Comms.queue = []; Comms.say('PA', 'This is your Grand Marshal. Small fire. You broke my furnaces. Come and look at my bell.', 4); extra('boss');
  checkpoint();
}
function bellSees() {
  const b = L.bell; if (!b || !b.alive) return false;
  const dx = P.x - b.x, dz = P.z - b.z, d = Math.hypot(dx, dz);
  if (d < 2.6) return true; if (d > 70) return false;
  return los(b.x + dx / d * 2.4, b.z + dz / d * 2.4, P.x, P.z);
}
function updateBell(dt) {
  const b = L.bell;
  if (!LV.bell || !b || !b.alive || b.planted || G.state !== 'play') { show('bellWarn', false); return; }
  G.bellT -= dt * (1 + G.broken * .15 + (G.broken >= 3 && !G.bossDown ? .3 : 0));
  const el = $('bellWarn');
  if (G.bellT < 5) {
    G.bellCharge = 1 - Math.max(0, G.bellT) / 5;
    if (!G.bellWarned) { G.bellWarned = true; sfx.tollWarn(); extra('bellWarn'); }
    const seen = bellSees();
    show('bellWarn', true); el.classList.toggle('exposed', seen); el.classList.toggle('safe', !seen);
    el.innerHTML = `<b>${seen ? 'THE BELL CAN SEE YOU' : 'HIDDEN FROM THE BELL'}</b><span>TOLL IN ${Math.max(0, Math.ceil(G.bellT))}</span>`;
  } else { G.bellCharge = Math.max(0, G.bellCharge - dt * .8); show('bellWarn', false); }
  if (G.bellT > 0) return;
  // the toll: anything in the bell's sight starts turning to glass
  G.bellT = 24; G.bellWarned = false; sfx.toll(); G.shake = Math.max(G.shake, .35);
  const wave = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), new THREE.MeshBasicMaterial({ color: 0x9feef4, transparent: true, opacity: .35, depthWrite: false, side: THREE.DoubleSide }));
  wave.position.set(b.x, 4, b.z); L.group.add(wave); let k = 0;
  FX.list.push(d2 => { k += d2; wave.scale.setScalar(2 + k * 60); wave.material.opacity = .35 * (1 - k); if (k >= 1) { L.group.remove(wave); return false; } return true; });
  if (bellSees()) { damagePlayer(26, b.x, b.z); P.glassT = 3.2; toast('GLASSED · SLOWED', 'red'); extra('bellHit'); }
  for (const e of L.enemies) if (e.alive && e.glassGuard && Math.hypot(e.x - b.x, e.z - b.z) < 30) { e.hp = Math.min(e.maxHp, e.hp + 40); sparks(new THREE.Vector3(e.x, 1.6, e.z), 6, 0x9feef4, 2); }
}
function bellPlantSpot() { const b = L.bell; return LV.bell && b && G.bellPlantable && !b.planted && Math.hypot(b.x - P.x, b.z - P.z) < 4.4 ? b : null; }
function plantBell() {
  const b = L.bell; b.planted = true; G.bellPlantable = false; G.bellCharge = 0; sfx.plant(); show('bellWarn', false);
  const c4 = new THREE.Mesh(new THREE.BoxGeometry(.6, .4, .14), MAT.c4); c4.position.set(b.x, 1.4, b.z + 1.95);
  const led = new THREE.Mesh(new THREE.BoxGeometry(.1, .1, .1), MAT.led); led.position.y = .25; c4.add(led); L.group.add(c4);
  L.targets.push({ idx: 99, name: 'GREAT BELL', x: b.x, z: b.z, planted: true, led, broken: true }); // so the timer's blink and final blast include it
  arm();
}
function nearCage() { return (L.prisoners || []).find(p => !p.freed && Math.hypot(p.x - P.x, p.z - P.z) < 3.2) || null; }
function freePrisoner(p) {
  freeCage(p); G.freed++; sfx.free(); puff(new THREE.Vector3(p.x, .8, p.z), 1, 1.4, 0xf4efe8, .6, .5);
  const tm = LV.testimony[p.idx]; unlockCodex(`${LV.id}-p${p.idx}`);
  toast(`Prisoner freed · ${G.freed}/${L.prisoners.length} · added to Codex`, 'yel');
  Comms.queue = Comms.queue.filter(q => q.who !== LV.pa.who); tm.lines.forEach(([w, t, d]) => Comms.say(w, t, d));
  if (G.freed === L.prisoners.length) Comms.say('MIRA', "That's all of them. They know the way out through the salt drains. I left it open for them weeks ago.");
  renderObjectives(); checkpoint();
}
// during the escape the citadel comes down: salt slabs drop where their shadows show
function updateSaltfall(dt) {
  if (!LV.bell || !G.armed || G.state !== 'play') return;
  G.saltT -= dt; if (G.saltT > 0) return; G.saltT = .55 + Math.random() * .5;
  const a = Math.random() * 6.28, r = Math.random() * 5, x = P.x - Math.sin(P.yaw) * 2.5 + Math.cos(a) * r, z = P.z - Math.cos(P.yaw) * 2.5 + Math.sin(a) * r;
  if (solidAt(x, z)) return;
  const ring = new THREE.Mesh(new THREE.RingGeometry(.9, 1.4, 24), new THREE.MeshBasicMaterial({ color: 0x9e2b25, transparent: true, opacity: .6, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(x, .05, z); L.group.add(ring);
  const slab = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.2, 1.7), MAT.c4); slab.position.set(x, 16, z); slab.rotation.y = Math.random() * 3; slab.castShadow = true; L.group.add(slab);
  let t = 0, hit = false;
  FX.list.push(d2 => {
    t += d2; ring.material.opacity = .35 + .35 * Math.sin(t * 22);
    if (t > .9 && !hit) {
      slab.position.y = Math.max(.6, 16 - (t - .9) ** 2 * 110);
      if (slab.position.y <= .6) { hit = true; L.group.remove(ring); sfx.crack(); puff(new THREE.Vector3(x, .6, z), 1.4, 1.4, 0xf4efe8, .8, .6); if (Math.hypot(P.x - x, P.z - z) < 1.6) damagePlayer(20, x, z); }
    }
    if (t > 5) { L.group.remove(slab); return false; }
    return true;
  });
}

// ---------- level 5: the Unending Hand and the canyon storms ----------
function summonHand(silent = false) {
  const x = 11 * S, z = 10 * S + 2; // it rises out of the central hall
  makeHand(L, x, z, LV.bossName);
  renderObjectives();
  if (silent) return;
  for (let i = 0; i < 4; i++) sparks(new THREE.Vector3(x, 1 + i * .6, z), 18, 0x9feef4, 6);
  puff(new THREE.Vector3(x, .5, z), 3, 3, 0xe6b98e, 1.2, .8);
  toast(`${LV.bossName} RISES`, 'red'); sfx.toll(); G.shake = .5;
  Comms.queue = []; Comms.say('UNENDING', 'You broke her bell. We kept the hand that rang it. We kept singing.', 4); extra('boss');
  checkpoint();
}
function spawnChoirNear(x, z) {
  for (let i = 0; i < 12; i++) {
    const c = Math.floor(x / S) + Math.round((Math.random() - .5) * 6), r = Math.floor(z / S) + Math.round((Math.random() - .5) * 6);
    if (!walkable(c, r) || '#XZw'.includes(cell(c, r))) continue;
    const sx = c * S + S / 2, sz = r * S + S / 2; if (Math.hypot(sx - P.x, sz - P.z) < 6) continue;
    makeEnemy(L, sx, sz, true, { glass: true }); sparks(new THREE.Vector3(sx, 1.2, sz), 12, 0x9feef4, 4); return;
  }
}
function handTick(e, dt) {
  const t = G.t, half = e.hp < e.maxHp / 2;
  e.stunT = Math.max(0, e.stunT - dt);
  const stunned = e.stunT > 0;
  if (stunned && !e.wasStun) { extra('handStun'); toast('THE HAND IS DOWN · HIT IT NOW', 'yel'); sfx.crack(); }
  e.wasStun = stunned;
  // fingers curl as it clenches for a slam, splay when it is stunned
  e.clench += ((e.slam ? 1 : stunned ? -.4 : .15 + Math.sin(t * 1.7) * .1) - e.clench) * Math.min(1, dt * 6);
  e.fingers.forEach((f, i) => { f.rotation.x = e.clench * 1.3 + Math.sin(t * 3 + i) * .06; });
  e.orbit.forEach((s, i) => { const a = t * (stunned ? .3 : 1.1) + i * Math.PI / 3; s.position.set(Math.cos(a) * 2.6, Math.sin(t * 2 + i) * .5, Math.sin(a) * 2.6); s.rotation.y += dt * 3; });
  e.eye.rotation.y += dt * 2;
  e.hurtT -= dt; e.glass.emissive.setHex(e.hurtT > 0 ? 0x661100 : stunned ? 0x5a4a10 : e.baseEm);
  e.light.intensity = stunned ? 8 : 22 + Math.sin(t * 5) * 5;
  const done = () => { e.g.position.set(e.x, e.hover, e.z); e.g.rotation.x = 0; };
  if (G.state !== 'play') return done();
  const dx = P.x - e.x, dz = P.z - e.z, d = Math.hypot(dx, dz);
  const sees = d < 26 && los(e.x, e.z, P.x, P.z);
  if (e.state !== 'alert') { if (!sees) return done(); e.state = 'alert'; extra('boss'); }
  if (e.slam) { // telegraphed slam: it lifts over the marked ring, then drops
    const s = e.slam; s.t += dt; s.ring.material.opacity = .3 + .35 * Math.sin(s.t * 20);
    if (s.t < 1.1) { moveCircle(e, (s.x - e.x) * Math.min(1, dt * 3), (s.z - e.z) * Math.min(1, dt * 3), 1); e.hover += (5.5 - e.hover) * Math.min(1, dt * 5); }
    else {
      e.hover = Math.max(.7, e.hover - dt * 26);
      if (e.hover <= .7) {
        L.group.remove(s.ring); e.slam = null; e.slamCd = half ? 4.5 : 6.5; e.stunT = 1.6; // it sticks in the floor for a moment
        sfx.smash(); sfx.rubble(); G.shake = .7; puff(new THREE.Vector3(e.x, .4, e.z), 3, 2, 0xe6b98e, 1, .7);
        const wave = new THREE.Mesh(new THREE.TorusGeometry(1, .14, 6, 40), new THREE.MeshBasicMaterial({ color: 0x9feef4, transparent: true }));
        wave.rotation.x = Math.PI / 2; wave.position.set(e.x, .3, e.z); L.group.add(wave); let k = 0;
        FX.list.push(d2 => { k += d2; wave.scale.setScalar(1 + k * 6); wave.material.opacity = 1 - k / .5; if (k > .5) { L.group.remove(wave); return false; } return true; });
        if (Math.hypot(P.x - e.x, P.z - e.z) < 3.4 && P.y < .6) damagePlayer(30, e.x, e.z);
      }
    }
    e.yaw = Math.atan2(dx, dz); e.g.rotation.y = e.yaw; e.g.position.set(e.x, e.hover, e.z); return;
  }
  e.slamCd -= dt; e.fireT -= dt; e.spawnT -= dt;
  if (stunned) { e.hover += (1.1 - e.hover) * Math.min(1, dt * 4); e.g.position.set(e.x, e.hover, e.z); e.g.rotation.x = Math.sin(t * 9) * .05; return; }
  e.hover += (2.6 + Math.sin(t * 1.4) * .3 - e.hover) * Math.min(1, dt * 2);
  // drift toward Daniel but keep a little distance; closer when hurt
  const want = half ? 4 : 6, sp = (half ? 3.6 : 2.8) * dt;
  if (d > want + .5) moveCircle(e, dx / d * sp, dz / d * sp, 1); else if (d < want - 1.5) moveCircle(e, -dx / d * sp * .6, -dz / d * sp * .6, 1);
  e.yaw = Math.atan2(dx, dz); e.g.rotation.y = e.yaw;
  if (e.slamCd <= 0 && d < 8) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.6, 3.4, 32), new THREE.MeshBasicMaterial({ color: 0x9e2b25, transparent: true, opacity: .6, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(P.x, .06, P.z); L.group.add(ring);
    e.slam = { t: 0, x: P.x, z: P.z, ring }; sfx.tollWarn();
  } else if (e.fireT <= 0 && sees) { // a fan of glass knuckles
    e.fireT = half ? 1.3 : 2;
    const from = new THREE.Vector3(e.x, e.hover, e.z), base = new THREE.Vector3(P.x, 1.3 + P.y, P.z).sub(from).normalize();
    for (const a of [-.32, -.16, 0, .16, .32]) {
      const v = base.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), a).multiplyScalar(15);
      const m = new THREE.Mesh(shardGeo, shardMat); m.position.copy(from); m.scale.set(1.3, 1.3, 3); m.lookAt(from.clone().add(v)); L.group.add(m);
      G.shards.push({ m, v, t: 0, src: e, dmg: 12 });
    }
    sfx.shard();
  }
  if (e.spawnT <= 0) { e.spawnT = half ? 16 : 22; spawnChoirNear(e.x, e.z); spawnChoirNear(e.x, e.z); sfx.toll(); }
  e.g.position.set(e.x, e.hover, e.z);
}
// sandstorms roll through the canyon: enemies go half-blind, the wind shoves Daniel
function updateStorm(dt) {
  if (!LV.storm) return;
  if (G.state === 'play') {
    G.stormT -= dt;
    if (G.stormT <= 0) {
      G.storm = !G.storm;
      if (G.storm) {
        G.stormT = 14; const a = Math.random() * 6.28; G.windX = Math.cos(a); G.windZ = Math.sin(a);
        sfx.gust(); toast('SANDSTORM · THEY CAN BARELY SEE', 'yel'); extra('storm');
      } else { G.stormT = 26 + Math.random() * 8; toast('The storm passes', ''); }
    }
    if (G.storm && G.stormT < 3 && !G.stormWarned) { G.stormWarned = true; toast('Storm thinning…', ''); }
    if (!G.storm) G.stormWarned = false;
  }
  G.stormK += ((G.storm ? 1 : 0) - G.stormK) * Math.min(1, dt * .9);
  windLevel(.04 + G.stormK * .3);
  if (G.stormK > .2 && P.alive && G.state === 'play') moveCircle(P, G.windX * G.stormK * 1.1 * dt, G.windZ * G.stormK * 1.1 * dt, .4);
}

// ---------- level 6: the Deep Choir's song and Lanternhold's sweeping lamp ----------
function deepSong(e, dt) {
  G.songT -= dt * (e.hp < e.maxHp / 2 ? 1.35 : 1);
  const el = $('bellWarn'), dx = P.x - e.x, dz = P.z - e.z, d = Math.max(.1, Math.hypot(dx, dz));
  const seen = d < 3 || los(e.x + dx / d * 2.8, e.z + dz / d * 2.8, P.x, P.z);
  if (G.songT < 4) {
    if (!G.songWarned) { G.songWarned = true; sfx.tollWarn(); extra('song'); }
    show('bellWarn', true); el.classList.toggle('exposed', seen); el.classList.toggle('safe', !seen);
    el.innerHTML = `<b>${seen ? 'THE SEA CAN SEE YOU' : 'HIDDEN FROM THE SEA'}</b><span>SONG IN ${Math.max(0, Math.ceil(G.songT))}</span>`;
  }
  if (G.songT > 0) return;
  // the verse: anything in its sight starts turning to glass, and its guards drink the song
  G.songT = 11; G.songWarned = false; show('bellWarn', false); sfx.toll(); G.shake = Math.max(G.shake, .35);
  const wave = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), new THREE.MeshBasicMaterial({ color: 0x9feef4, transparent: true, opacity: .35, depthWrite: false, side: THREE.DoubleSide }));
  wave.position.set(e.x, 3, e.z); L.group.add(wave); let k = 0;
  FX.list.push(d2 => { k += d2; wave.scale.setScalar(2 + k * 50); wave.material.opacity = .35 * (1 - k); if (k >= 1) { L.group.remove(wave); return false; } return true; });
  if (seen) { damagePlayer(22, e.x, e.z); P.glassT = 2.8; toast('GLASSED · SLOWED', 'red'); extra('songHit'); }
  for (const o of L.enemies) if (o.alive && o.glassGuard) { o.hp = Math.min(o.maxHp, o.hp + 30); sparks(new THREE.Vector3(o.x, 1.6, o.z), 6, 0x9feef4, 2); }
}
function updateBeam(dt) {
  const A = L.anim; if (!LV.beam || !A.beam) return;
  windLevel(.07 + Math.sin(G.t * .45) * .04); // the surf
  if (G.bossDown) { A.beam.visible = false; return; }
  G.beamA += dt * (.45 + G.broken * .12); A.beam.rotation.y = G.beamA;
  G.beamCd -= dt;
  if (G.state !== 'play' || !P.alive || G.beamCd > 0) return;
  const dx = P.x - A.beamX, dz = P.z - A.beamZ, d = Math.hypot(dx, dz);
  if (d > 50 || d < 4 || Math.abs(wrapTo(G.beamA, Math.atan2(dx, dz))) > .1) return;
  if (!los(A.beamX + dx / d * 5.2, A.beamZ + dz / d * 5.2, P.x, P.z)) return;
  G.beamCd = 2.5; G.beamHits++; P.glassT = Math.max(P.glassT, 1.4); sfx.camera(); sfx.chime(880);
  toast("CAUGHT IN THE LANTERN'S LIGHT", 'red'); extra('beam'); renderObjectives();
  for (const e of L.enemies) if (e.alive && e.kind !== 'heart' && Math.hypot(e.x - P.x, e.z - P.z) < 24) alertEnemy(e, P, 1);
}

function throwCharge() {
  if (P.charges <= 0) { toast('No charges left'); return; }
  if (P.throwCd > 0) return;
  P.charges--; P.throwCd = .6;
  const d = fwd(), m = new THREE.Mesh(new THREE.BoxGeometry(.22, .12, .3), MAT.charge);
  const led = new THREE.Mesh(new THREE.BoxGeometry(.06, .06, .06), MAT.led); led.position.y = .08; m.add(led);
  m.position.copy(camera.position).addScaledVector(d, .6); L.group.add(m);
  P.held.push({ m, led, v: d.multiplyScalar(15).add(new THREE.Vector3(0, 3.2, 0)), t: 0, stuck: false }); sfx.beep(900);
}
function updateCharges(dt) {
  P.held = P.held.filter(c => {
    c.t += dt; const p = c.m.position;
    if (!c.stuck) {
      c.v.y -= G.grav * dt;
      const nx = p.x + c.v.x * dt, ny = p.y + c.v.y * dt, nz = p.z + c.v.z * dt;
      if (ny < .08) { p.set(nx, .08, nz); c.stuck = true; }
      else if (solidAt(nx, nz)) c.stuck = true;
      else p.set(nx, ny, nz);
      c.m.rotation.x += dt * 9;
    }
    c.led.visible = Math.sin(c.t * (8 + c.t * 14)) > 0;
    if (c.t > 1.9) { L.group.remove(c.m); explode(p.clone(), 7.5, 190, 1); return false; }
    return true;
  });
}

// ---------- objectives ----------
function nearestTarget() {
  let best = null, bd = 3.4;
  for (const t of L.targets) { if (t.planted) continue; const d = Math.hypot(t.x - P.x, t.z - P.z); if (d < bd) { bd = d; best = t; } }
  return best;
}
function plantOn(t) {
  t.planted = true; sfx.plant();
  placeC4(t, P.x - t.x, P.z - t.z);
  objList.querySelector(`[data-i="${t.idx}"]`).classList.add('done');
  const left = L.targets.filter(x => !x.planted).length;
  story('plant', LV.instant ? 2 - left : t.idx); if (left === 1) story('one');
  if (LV.instant) { toast(`${LV.plantToast || 'C4 on the'} ${t.name} · BACK UP`, 'yel'); t.fuse = 2.4; if (LV.softBreak) t.c4.visible = false; }
  else if (left) { toast(`C4 set on ${t.name} · ${left} to go`, 'yel'); checkpoint(); } else arm();
}
function shatterStone(t) {
  L.group.remove(t.c4); t.led = null;
  if (LV.softBreak) { sfx.bell([392, 330, 262][G.broken] || 330); sparks(new THREE.Vector3(t.x, 3, t.z), 18, 0xf2b51c, 4); } // the trial bells ring instead of exploding
  else { explode(new THREE.Vector3(t.x, 2.5, t.z), 6.5, 130, 1.5); sfx.shatter(); sfx.chime(660); }
  for (let i = 0; i < 4; i++) sparks(new THREE.Vector3(t.x, 2 + i * 1.4, t.z), 14, i % 2 ? 0x9fe6e0 : 0xf2b51c, 6);
  LV.breakTarget(t); G.broken++;
  if (LV.memories) { // each shrine burns away the Choir's lie and shows what really happened
    const m = LV.memories[t.idx]; showMemory(m, `${LV.id}-m${t.idx}`); Comms.queue = []; m.lines.forEach(([w, tx, d]) => Comms.say(w, tx, d));
    for (let i = 0; i < 2; i++) spawnShadeNear(t.x, t.z, 2);
  } else LV.onShatter(G.broken, { G, L, Comms, toast, tint: c => { G.tint = new THREE.Color(c); } });
  if (G.broken === 3) (LV.allBroken ? (LV.bell ? summonAshe() : summonHand()) : arm()); else checkpoint();
}
function arm() {
  W.gateOpen = true; G.gateY = 0;
  L.statics = L.statics.filter(m => !L.gateMeshes.includes(m));
  if (LV.armTimer !== false) { G.armed = true; G.timer = LV.timer; show('timerWrap', true); }
  renderObjectives();
  toast(LV.armToast, 'red');
  if (LV.id === 1) { sfx.alarm(true); setTimeout(() => G.state === 'play' && toast('Reinforcements at the gate', 'red'), 1600); }
  if (LV.story.arm) { Comms.queue = []; LV.story.arm.forEach(([w, t, d]) => Comms.say(w, t, d)); }
  L.anim.beacons?.forEach(b => b.material.emissive.setHex(0xff2a10));
  for (const [c, r, kind] of LV.reinforce) {
    const x = c * S + S / 2, z = r * S + S / 2;
    if (kind === 'hollow') makeHollow(L, x, z, true); else if (kind === 'shade') makeShade(L, x, z, true); else makeEnemy(L, x, z, true, { glass: kind === 'guard' });
  }
  checkpoint();
  if (LV.memories) Comms.say('RESH_TRUE', "The ink gate is open. The First Note is inside: the Choir's heart, the very first song. Break it.");
  for (const e of L.enemies) if (e.alive && Math.hypot(e.x - P.x, e.z - P.z) < 40) alertEnemy(e, P, 1.2);
}
function endGame(win, text, title) {
  G.state = 'end'; mouseDown = false; sfx.alarm(false); ambientOn(false); Comms.clear(); document.exitPointerLock?.(); show('memory', false);
  const secs = Math.round(G.playT), acc = G.shots ? Math.round(G.hits / G.shots * 100) : 0, more = LVI < LEVELS.length - 1;
  const end = G.ending && LV.endings?.[G.ending];
  if (end) unlockCodex(`end-${G.ending}`);
  $('endStamp').textContent = win ? (end ? end.stamp : LV.text.winStamp) : 'MISSION FAILED';
  $('endStamp').className = 'stamp' + (win ? '' : ' fail');
  document.querySelector('#end .kicker').textContent = LV.tag;
  $('endTitle').textContent = win ? (end ? end.title : LV.text.winTitle) : title;
  $('endText').textContent = text;
  $('stats').innerHTML = [[`${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`, 'TIME'], [G.kills, 'HOSTILES DOWN'], [G.takedowns, 'SILENT TAKEDOWNS'], [acc + '%', 'ACCURACY'], [`${G.intel}/5`, LV.intelName], [secretsFound() + '/' + LV.optional.length, 'OPTIONALS']]
    .map(([v, k]) => `<div><b>${v}</b><span>${k}</span></div>`).join('');
  // rank: finishing fast, quietly and thoroughly scores higher
  const score = (win ? 1000 : 0) - Math.max(0, secs - 180) * 2 + G.intel * 120 + G.takedowns * 70 + secretsFound() * 200 + G.heads * 20 - G.dmgTaken * 1.5;
  const rank = !win ? 'F' : score >= 1700 ? 'S' : score >= 1350 ? 'A' : score >= 1000 ? 'B' : score >= 650 ? 'C' : 'D';
  $('rank').innerHTML = `<b>${rank}</b><span>RANK</span>`;
  $('nextNote').style.display = win ? '' : 'none'; $('nextNote').textContent = LV.text.next;
  show('next', win && more); $('next').textContent = more && LEVELS[LVI + 1].bonus ? 'BONUS CHAPTER ▸' : `LEVEL ${LV.id + 1} ▸`;
  // progress: unlock the next chapter and point Continue at it; on failure offer the last checkpoint
  if (win) {
    Save.completeLevel(LV.id, rank, G.ending, LEVELS.length);
    if (more) Save.storeCheckpoint({ level: LVI + 1, fresh: true }); else Save.clearCheckpoint();
    flashSave();
    checkAchievements(rank, secs);
  }
  const cp = Save.checkpoint; show('retryCp', !win && !!cp && !cp.fresh && cp.level === LVI);
  $('replay').textContent = win ? `REPLAY LEVEL ${LV.id} ▸` : 'TRY AGAIN ▸';
  $('replay').className = win && more ? 'ghost' : '';
  const reveal = () => { show('hud', false); show('end', true); };
  if (win && LV.epilogue) { // the finale: where everyone ended up, then the credits, then the end card
    const king = (Save.lastEnding || 'X') === 'Z';
    setTimeout(() => { show('hud', false); rollCredits([...(LV.epilogue[G.ending] || []), ...LV.epilogueCommon(king)], reveal); }, 600);
  } else setTimeout(reveal, win ? 0 : 900);
}
function checkAchievements(rank, secs) {
  const prog = Save.progress, d = optDone();
  award(`lv${LV.id}`); tally('kills', G.kills, 250, 'veteran');
  if (rank === 'S') award('rankS');
  if (G.spotted === 0) { award('ghost'); if (LV.spotLimit) award('oneBlade'); }
  if (secs < 180) award('fast');
  if (G.dmgTaken < 15) award('untouched');
  if (G.intel >= 5) award('intel');
  if (LV.optional.every(([k]) => d[k])) award('completionist');
  if (LV.beam && G.beamHits === 0) award('lantern');
  if (['X', 'Z'].every(k => prog.endings.includes(k))) award('bothMasks');
  if (['FX', 'FZ', 'KX', 'KZ'].every(k => prog.endings.includes(k))) award('allEndings');
  if (codexEntries().every(g => g.entries.every(e => codex.has(e.id)))) award('archivist');
}

// ---------- epilogue and credits: one slow scroll, click or Esc to skip ----------
let creditsDone = null;
function rollCredits(cards, done) {
  const roll = $('crRoll'), esc = s => s.replace(/</g, '&lt;');
  roll.innerHTML = (cards?.length ? `<section class="epi"><h4>AFTERWARDS</h4>${cards.map(([h, t]) => `<div class="card2"><b>${esc(h)}</b><p>${esc(t)}</p></div>`).join('')}</section>` : '')
    + CREDITS.map(([h, lines]) => `<section>${h ? `<h4>${esc(h)}</h4>` : ''}${lines.map(l => `<p>${esc(l)}</p>`).join('')}</section>`).join('');
  show('credits', true); document.exitPointerLock?.();
  roll.style.transition = 'none'; roll.style.transform = `translateY(${innerHeight}px)`;
  void roll.offsetWidth;
  const h = roll.offsetHeight, dur = Math.max(30, (h + innerHeight) / 42);
  roll.style.transition = `transform ${dur}s linear`; roll.style.transform = `translateY(${-h}px)`;
  const t = setTimeout(() => endCredits(true), dur * 1000 + 300);
  creditsDone = full => { clearTimeout(t); creditsDone = null; show('credits', false); if (full) award('credits'); done?.(); };
}
function endCredits(full = false) { creditsDone?.(full); }
$('credits').addEventListener('click', () => endCredits(false));
addEventListener('keydown', e => { if (creditsDone && (e.code === 'Escape' || e.code === 'Enter' || e.code === 'Space')) endCredits(false); });
function detonateAll(stagger) { L.targets.forEach((t, i) => setTimeout(() => explode(new THREE.Vector3(t.x, 2, t.z), 12, 400, 3), i * stagger)); }

// ---------- per-frame ----------
function updatePlayer(dt) {
  if (keys.ArrowLeft) P.yaw += dt * 2.2; if (keys.ArrowRight) P.yaw -= dt * 2.2;
  if (keys.ArrowUp) P.pitch = Math.min(1.45, P.pitch + dt * 1.6); if (keys.ArrowDown) P.pitch = Math.max(-1.45, P.pitch - dt * 1.6);
  const fw = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), st = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
  P.sprint = !!(keys.ShiftLeft || keys.ShiftRight) && fw > 0;
  if (P.sprint) P.crouch = false;
  const planting = keys.KeyE && (nearestTarget() || bellPlantSpot() || nearCage());
  const sp = (planting ? 0 : P.sprint ? 8.5 : P.crouch ? 2.8 : 5.5) * (P.glassT > 0 ? .5 : 1);
  P.glassT = Math.max(0, P.glassT - dt);
  if (P.regen && P.alive && G.t - P.lastHurt > 3 && P.hp < 100) P.hp = Math.min(100, P.hp + dt * 2.5);
  P.eye += ((P.crouch ? 1.0 : 1.6) - P.eye) * Math.min(1, dt * 10);
  let vx = -Math.sin(P.yaw) * fw + Math.cos(P.yaw) * st, vz = -Math.cos(P.yaw) * fw - Math.sin(P.yaw) * st;
  const len = Math.hypot(vx, vz);
  if (len > 0 && sp > 0) { vx = vx / len * sp * dt; vz = vz / len * sp * dt; moveCircle(P, vx, vz, .4); P.bob += dt * sp * 1.7; }
  P.speedNow = len > 0 ? sp : 0;
  P.vy -= G.grav * dt; P.y = Math.max(0, P.y + P.vy * dt); if (P.y === 0) P.vy = 0;

  P.fireCd -= dt; P.throwCd -= dt; P.blinkCd -= dt; G.knifeT -= dt; P.heat = Math.max(0, P.heat - dt * 2.2); P.recoil = Math.max(0, P.recoil - dt * 9);
  if (mouseDown && P.wpn === 'pistol') shoot();
  if (P.wpn === 'hammer') {
    if (P.swingT > 0) {
      const tot = SWING[P.swingKind].time, prev = P.swingT; P.swingT -= dt;
      if (!P.swingHit && prev > tot * .55 && P.swingT <= tot * .55) { P.swingHit = true; swingImpact(); }
    } else if (mouseDown && G.knifeT <= 0) { P.hCharge = Math.min(1, P.hCharge + dt / .7); if (P.hCharge >= 1 && !P.chargedTick) { P.chargedTick = true; sfx.beep(500); } }
    else if (P.hCharge > 0) { startSwing(P.hCharge >= 1 ? 'heavy' : 'light'); P.chargedTick = false; }
  }
  if (P.reload > 0) { P.reload -= dt; if (P.reload <= 0) { const wp = P.wp[P.wpn], n = Math.min(WEAPONS[P.wpn].mag - wp.ammo, wp.reserve); wp.ammo += n; wp.reserve -= n; } }
  if (camera.fov > Save.settings.fov) { camera.fov = Math.max(Save.settings.fov, camera.fov - dt * 60); camera.updateProjectionMatrix(); }

  const t = nearestTarget(), bellSpot = !t && bellPlantSpot(), cage = !t && !bellSpot && nearCage(), lock = !t && !bellSpot && !cage && !W.lockOpen && nearLock();
  if (t) {
    show('prompt', true);
    if (keys.KeyE) { P.plant += dt / 2.2; if (Math.floor(P.plant * 6) !== Math.floor((P.plant - dt / 2.2) * 6)) sfx.beep(1100 + P.plant * 600); }
    else P.plant = 0;
    $('promptText').innerHTML = keys.KeyE ? `${LV.plantDoing || 'Wiring C4 to'} <b>${t.name}</b>…` : `${LV.plantPrompt || 'Hold <kbd>E</kbd> to plant C4 on'} <b>${t.name}</b>`;
    $('ring').style.strokeDashoffset = 113.1 * (1 - Math.min(1, P.plant));
    if (P.plant >= 1) { P.plant = 0; plantOn(t); }
  } else if (bellSpot) {
    show('prompt', true);
    if (keys.KeyE) { P.plant += dt / 2.6; if (Math.floor(P.plant * 6) !== Math.floor((P.plant - dt / 2.6) * 6)) sfx.beep(900 + P.plant * 700); } else P.plant = 0;
    $('promptText').innerHTML = keys.KeyE ? 'Wiring C4 to <b>THE GREAT BELL</b>…' : 'Hold <kbd>E</kbd> to plant C4 on <b>THE GREAT BELL</b>';
    $('ring').style.strokeDashoffset = 113.1 * (1 - Math.min(1, P.plant));
    if (P.plant >= 1) { P.plant = 0; plantBell(); }
  } else if (cage) {
    show('prompt', true);
    if (keys.KeyE) G.freeP += dt / 1.3; else G.freeP = 0;
    $('promptText').innerHTML = keys.KeyE ? 'Breaking the lock…' : 'Hold <kbd>E</kbd> to <b>free the prisoner</b>';
    $('ring').style.strokeDashoffset = 113.1 * (1 - Math.min(1, G.freeP));
    if (G.freeP >= 1) { G.freeP = 0; freePrisoner(cage); }
  } else if (lock) {
    show('prompt', true); $('ring').style.strokeDashoffset = 113.1;
    if (LV.lockBy === 'key' && P.key) unlockDoor();
    else if (LV.lockBy === 'key') { $('promptText').innerHTML = 'LOCKED · <b>keycard needed</b>'; extra('locked'); }
    else if (LV.lockBy === 'wells') { $('promptText').innerHTML = `SEALED · <b>ink wells ${G.wellsDown}/${L.wells.length}</b>`; extra('locked'); }
    else $('promptText').innerHTML = 'SEALED · <b>it hums, waiting for a song</b>';
  } else { show('prompt', false); P.plant = 0; }
  show('tdPrompt', !t && !!takedownTarget());

  for (const k of L.pickups) {
    if (k.taken) continue;
    k.ph += dt; k.mesh.rotation.y += dt * 1.5; k.mesh.position.y = .6 + Math.sin(k.ph * 2) * .12;
    if (Math.hypot(k.x - P.x, k.z - P.z) < 1.3) {
      if (k.type === 'H' && P.hp >= 100) continue;
      k.taken = true; L.group.remove(k.mesh); sfx.pickup();
      if (k.type === 'H') { P.hp = Math.min(100, P.hp + 45); toast('+45 health'); }
      if (k.type === 'A') { P.wp.pistol.reserve += 45; if (P.wp.shotgun.has) P.wp.shotgun.reserve += 6; toast(P.wp.shotgun.has ? '+45 rounds · +6 shells' : '+45 rounds'); story('ammo'); }
      if (k.type === 'C') { P.charges += 2; toast('+2 sticky charges', 'yel'); story('chg'); }
      if (k.type === 'S') { P.wp.shotgun.has = true; P.wp.shotgun.reserve += 12; swapTo('shotgun'); toast('BRK-12 BREACHER · press 2', 'yel'); extra('shotgun'); }
      if (k.type === 'R') { P.armor = 100; toast('+100 armour', 'yel'); extra('armor'); }
      if (k.type === 'Y') { P.key = true; sfx.intel(); toast("VOSS'S KEYCARD", 'yel'); extra('key'); }
      if (k.type === 'V') { P.blink = true; show('abil', true); sfx.blink(); toast('BLINK · press V', 'yel'); extra('relic'); }
      if (k.type === 'M') { P.blade = true; sfx.slash(); toast('THE QUIET BLADE · F works on anyone now', 'yel'); extra('blade'); }
      if ('SRYVMI'.includes(k.type)) checkpoint();
      if (k.type === 'I') {
        const lines = LV.intel[G.intel]; unlockCodex(`${LV.id}-i${G.intel}`); G.intel++; sfx.intel(); toast(`${LV.intelName} ${G.intel}/5 · added to Codex`, 'yel'); renderObjectives();
        Comms.queue = Comms.queue.filter(q => q.who !== LV.pa.who); lines.forEach(([w, t, d]) => Comms.say(w, t, d));
      }
    }
  }
  if (!G.armed) for (const b of L.barrels) if (!b.dead && Math.hypot(b.x - P.x, b.z - P.z) < 7 && los(P.x, P.z, b.x, b.z)) { story('barrel'); break; }
  if (W.gateOpen && LV.choice && G.heartDown && 'XZ'.includes(cell(Math.floor(P.x / S), Math.floor(P.z / S)))) {
    const tile = cell(Math.floor(P.x / S), Math.floor(P.z / S)); G.endTile = tile; G.state = 'outro'; G.outro = 0; Comms.queue = []; Comms.cur = null;
    G.ending = LV.endKey ? LV.endKey(tile, Save.lastEnding || 'X') : tile; // the finale's ending also depends on the mask
    const end = LV.endings[G.ending], A = L.anim.altars[tile];
    toast(LV.choiceToast ? LV.choiceToast[tile] : tile === 'X' ? 'YOU BREAK THE MASK' : 'YOU PUT ON THE MASK', 'yel');
    if (tile === 'X') { A.mask.visible = false; sparks(new THREE.Vector3(A.g.position.x, 1.7, A.g.position.z), 40, 0x1d1b16, 6); sparks(new THREE.Vector3(A.g.position.x, 1.7, A.g.position.z), 20, 0xc8321e, 5); sfx.shatter(); G.tint = new THREE.Color(0xffffff); }
    else { A.mask.visible = false; sfx.bell(196); G.tint = new THREE.Color(LV.beam ? 0x9fd8d4 : 0xd9b45a); }
    if (LV.beam && tile === 'X') { const b = L.enemies.find(o => o.kind === 'heart'); if (b) setTimeout(() => explode(new THREE.Vector3(b.x, 2, b.z), 6, 0, 2), 1600); }
    end.lines.forEach(([w, t, d]) => Comms.say(w, t, d));
  } else if (W.gateOpen && !LV.choice && cell(Math.floor(P.x / S), Math.floor(P.z / S)) === 'X') {
    G.state = 'outro'; G.outro = 0; sfx.alarm(false); Comms.queue = []; Comms.cur = null;
    toast(LV.exitToast || (LV.id === 1 ? 'EXFIL REACHED' : LV.bell ? 'OUT OF SALTCROWN' : 'THROUGH THE MOON DOOR'), 'yel');
    if (LV.outro === 'detonate') detonateAll(350); else { G.sealing = true; sfx.rumble(1); G.shake = .4; }
    if (L.bell) setTimeout(() => { shatterBell(L.bell); sfx.shatter(); sparks(new THREE.Vector3(L.bell.x, 6, L.bell.z), 60, 0x9feef4, 12); G.tint = new THREE.Color(0xf7f4ef); }, 1300);
    LV.story.win.forEach(([w, t, d]) => Comms.say(w, t, d));
  }
  if (P.speedNow > 0 && P.y === 0) {
    G.stepT -= dt * P.speedNow; if (G.stepT <= 0) { G.stepT = 2.6; if (!P.crouch) sfx.step(); }
    // sprinting footsteps carry: anyone close starts to wonder
    if (P.sprint) for (const e of L.enemies) if (e.alive && e.state !== 'alert' && Math.hypot(e.x - P.x, e.z - P.z) < 7) e.sus = Math.min(.9, e.sus + dt * .6);
  }
  if (L.anim.chimes?.length && !W.lockOpen && L.anim.chimes.some(q => Math.hypot(q.g.position.x - P.x, q.g.position.z - P.z) < 9)) extra('chimeNear');
}

function updateWorld(dt) {
  for (const e of L.enemies) updateEnemy(e, dt, aiCtx);
  separate(L.enemies);
  updateCharges(dt); updateShards(dt); updateCameras(dt); updateWells(dt); updateBell(dt); updateSaltfall(dt); updateStorm(dt); updateBeam(dt);
  if (G.lockY > 0 && G.lockY < 1) { G.lockY = Math.min(1, G.lockY + dt / 1.4); for (const m of L.lockMeshes) m.position.y = WH / 2 - G.lockY * (WH + .1); }
  for (const b of L.barrels) if (!b.dead && b.fuse >= 0) { b.fuse -= dt; if (b.fuse < 0) { b.dead = true; L.group.remove(b.mesh); L.hitList = L.hitList.filter(m => m !== b.mesh); explode(new THREE.Vector3(b.x, .8, b.z), 6.5, 160, 1.1); } }
  for (const t of L.targets) {
    if (t.led) t.led.visible = Math.sin(G.t * (G.armed || LV.instant ? 10 : 5)) > 0;
    if (t.fuse > 0 && G.state === 'play') { t.fuse -= dt; if (t.fuse <= 0) shatterStone(t); }
  }
  if (W.gateOpen && G.gateY < 1 && !G.sealing) { G.gateY = Math.min(1, G.gateY + dt / 2.2); for (const m of L.gateMeshes) m.position.y = 2.1 - G.gateY * 4.3; }
  if (G.sealing && G.gateY > 0) { G.gateY = Math.max(0, G.gateY - dt / 1.6); for (const m of L.gateMeshes) m.position.y = 2.1 - G.gateY * 4.3; if (G.gateY === 0) G.shake = .3; }
  tickFX(dt);
  boomLight.intensity *= Math.pow(.02, dt); muzLight.intensity *= Math.pow(.0001, dt);
  ambience(dt);
}

// the base keeps living around Daniel
function ambience(dt) {
  const A = L.anim, t = G.t;
  if (A.update) A.update(dt, t, P, G);
  if (A.flicker) for (const f of A.flicker) f.l.intensity = Math.random() < .08 ? f.base * .15 : f.base * (.85 + Math.sin(t * 40) * .05);
  if (G.armed && A.lights) { const p = .5 + .5 * Math.sin(t * 6); for (const k of A.lights) { k.l.color.setHex(0xff5a3a); k.l.intensity = k.base * (.35 + p * .5); } A.beacons.forEach(b => b.rotation.y += dt * 8); }
  A.leds?.forEach((l, i) => l.visible = Math.sin(t * (3 + i % 4) + i) > -.3);
  A.screens?.forEach((s, i) => s.material.color.setScalar(.85 + .15 * Math.sin(t * 9 + i * 2)));
  if (A.fireLight && A.fireLight.intensity > 0) {
    A.fireLight.intensity = 16 + Math.random() * 10; A.fireBits.forEach((f, i) => { f.scale.y = .8 + Math.sin(t * 14 + i * 1.7) * .3 + Math.random() * .15; f.rotation.y += dt * 2; });
    if (Math.random() < dt * .4) { const v = A.fireBits[0].position; puff(new THREE.Vector3(v.x, 1, v.z), .5, 2.4, 0x5a5248, 1.2, .45); }
  }
  if (A.dust) { const d = A.dust.geometry.attributes.position; for (let i = 0; i < d.count; i++) { let y = d.getY(i) - dt * .12; if (y < 0) y = WH; d.setY(i, y); d.setX(i, d.getX(i) + Math.sin(t + i) * dt * .05); } d.needsUpdate = true; }
  if (A.vents) { G.ventT -= dt; if (G.ventT <= 0 && A.vents.length) { G.ventT = .18; const v = A.vents[Math.floor(Math.random() * A.vents.length)]; if (Math.hypot(v.x - P.x, v.z - P.z) < 30) puff(v.clone(), .35, 1.6, 0xf2ede2, -.5, .35); } }
  for (const e of L.enemies) {
    if (e.barkS) { e.barkT -= dt; e.barkS.visible = e.barkT > 0 && e.alive; }
    if (e.kind === 'hollow' && e.alive) { const d = Math.hypot(e.x - P.x, e.z - P.z); e.glass.opacity = Math.max(.16, Math.min(.62, .8 - d / 38)) + Math.sin(t * 7 + e.seed) * .05; }
    if (e.kind === 'shade' && e.alive) {
      e.ink.opacity = .75 + Math.sin(t * 9 + e.seed) * .15; e.tail.rotation.x = .7 + Math.sin(t * 8 + e.seed) * .35;
      if (e.state === 'alert' && Math.random() < dt * 4) puff(new THREE.Vector3(e.x, .3 + Math.random(), e.z), .35, .9, 0x1d1b16, .3, .5);
    }
  }
  if (memT > 0) { memT -= dt; if (memT <= 0) show('memory', false); }
  if (G.tint) { scene.background.lerp(G.tint, Math.min(1, dt * .8)); scene.fog.color.lerp(G.tint, Math.min(1, dt * .8)); }
  updateEcho(dt);
  if (G.state !== 'play') return;
  if (LV.ambient.clank || LV.ambient.chime || LV.ambient.bells) { G.clankT -= dt; if (G.clankT <= 0) { G.clankT = 5 + Math.random() * 9; LV.ambient.clank ? sfx.clank() : LV.ambient.bells ? sfx.bell([262, 294, 330, 392, 440][Math.floor(Math.random() * 5)]) : sfx.chime(500 + Math.random() * 1200); } }
  G.paT -= dt; if (G.paT <= 0 && Comms.idle() && !G.armed) { G.paT = LV.pa.every + Math.random() * 20; Comms.say(LV.pa.who, LV.pa.lines[G.paI++ % LV.pa.lines.length], 3.8); }
  if (G.playT > 80) story('before');
  if (G.armed && G.timer < 30) story('t30');
}

// level 2: a glass echo of Daniel retraces his steps twelve seconds behind him
function updateEcho(dt) {
  if (!G.echo || G.state !== 'play') { if (G.ghost) G.ghost.visible = G.state === 'play' || G.state === 'outro'; return; }
  G.echoT -= dt; if (G.echoT <= 0) { G.echoT = .1; G.echoBuf.push([P.x, P.z, P.yaw, P.speedNow]); if (G.echoBuf.length > 400) G.echoBuf.shift(); }
  if (G.echoBuf.length < 120) return;
  if (!G.ghost) { G.ghost = makeDaniel(true); L.group.add(G.ghost); sfx.whisper(); }
  const [x, z, yaw, sp] = G.echoBuf[G.echoBuf.length - 120];
  G.ghost.position.set(x, .05 + Math.sin(G.t * 2) * .05, z); G.ghost.rotation.y = yaw + Math.PI;
  const sw = sp > 0 ? Math.sin(G.t * 9) * .5 : 0; G.ghost.userData.legL.rotation.x = sw; G.ghost.userData.legR.rotation.x = -sw;
  G.ghost.traverse(m => { if (m.material) m.material.opacity = .22 + Math.sin(G.t * 5) * .08 + (Math.random() < .02 ? .3 : 0); });
}

const mm = $('mm').getContext('2d'), CELL = 7;
const MMC = { '#': '#1d1b16', B: '#77794c', K: '#2a9d9a', Q: '#f2b51c', J: '#c8321e', U: '#6a50a8', X: '#2f8f4e', Z: '#b8860b', L: '#9e2b25', F: '#3f7f9a', u: '#7fd6e2', c: '#8a8578', w: '#b5653c' };
function drawMinimap() {
  mm.fillStyle = '#efe4cc'; mm.fillRect(0, 0, 168, 147);
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const ch = W.grid[r][c];
    if (ch === 'D') mm.fillStyle = W.gateOpen ? '#efe4cc' : '#f2b51c'; else if (ch === 'L' && W.lockOpen) continue; else if (MMC[ch]) mm.fillStyle = MMC[ch]; else continue;
    mm.fillRect(c * CELL, r * CELL, CELL, CELL);
  }
  const sc = CELL / S;
  if (LV.beam && L.anim.beam && !G.bossDown) { // the lamp's sweep, so Daniel can time his runs
    const A = L.anim; mm.strokeStyle = 'rgba(242,181,28,.85)'; mm.lineWidth = 3; mm.beginPath(); mm.moveTo(A.beamX * sc, A.beamZ * sc);
    mm.lineTo((A.beamX + Math.sin(G.beamA) * 50) * sc, (A.beamZ + Math.cos(G.beamA) * 50) * sc); mm.stroke();
  }
  for (const t of L.targets) { mm.fillStyle = t.planted ? '#2f8f4e' : '#f2b51c'; mm.strokeStyle = '#1d1b16'; mm.lineWidth = 1.5; mm.fillRect(t.x * sc - 4, t.z * sc - 4, 8, 8); mm.strokeRect(t.x * sc - 4, t.z * sc - 4, 8, 8); }
  for (const e of L.enemies) if (e.alive && (e.state === 'alert' || Math.hypot(e.x - P.x, e.z - P.z) < 14)) { mm.fillStyle = e.kind === 'hollow' ? '#2a9d9a' : e.glassGuard ? '#3f7f9a' : '#d2391b'; mm.beginPath(); mm.arc(e.x * sc, e.z * sc, 2.6, 0, 7); mm.fill(); }
  mm.save(); mm.translate(P.x * sc, P.z * sc); mm.rotate(-P.yaw); mm.fillStyle = '#d2391b'; mm.strokeStyle = '#1d1b16'; mm.lineWidth = 1.5;
  mm.beginPath(); mm.moveTo(0, -6); mm.lineTo(4.5, 4.5); mm.lineTo(0, 2); mm.lineTo(-4.5, 4.5); mm.closePath(); mm.fill(); mm.stroke(); mm.restore();
}
function updateHud(dt) {
  $('hpbar').style.width = P.hp + '%'; $('hpbar').classList.toggle('low', P.hp < 35); $('hpnum').textContent = Math.ceil(P.hp);
  $('arbar').style.width = P.armor + '%'; $('arnum').textContent = Math.ceil(P.armor);
  const wp = P.wp[P.wpn];
  $('ammo').textContent = wp.ammo; $('reserve').textContent = wp.reserve; $('chg').textContent = P.charges;
  $('wname').textContent = P.reload > 0 ? 'RELOADING…' : P.wpn === 'hammer' && P.hCharge >= 1 ? 'WOUND UP · RELEASE' : P.wpn === 'hammer' && LV.hammerName ? LV.hammerName : WEAPONS[P.wpn].name;
  const slot = (k, n, label) => P.wp[k].has ? (P.wpn === k ? `<b>${n} ${label}</b>` : `${n} ${label}`) : `${n} ——`;
  $('wlist').innerHTML = `${slot('pistol', 1, 'MK-9')} · ${slot('shotgun', 2, 'BRK-12')} · ${slot('hammer', 3, LV.hammerSlot || 'SLEDGE')}`;
  if (P.wpn === 'hammer') { $('ammo').textContent = P.hCharge > 0 ? Math.round(P.hCharge * 100) + '%' : '—'; $('reserve').textContent = '∞'; }
  $('abil').classList.toggle('cool', P.blinkCd > 0);
  // stealth readout
  let st = 'HIDDEN', cls = '';
  for (const e of L.enemies) { if (!e.alive) continue; if (e.state === 'alert' && e.canSee) { st = 'SPOTTED'; cls = 'spot'; break; } if (e.sus > .12 && cls !== 'spot') { st = 'SUSPICIOUS'; cls = 'sus'; } }
  for (const c of L.cameras) if (c.alive && c.sus > .05 && !cls) { st = 'ON CAMERA'; cls = 'sus'; }
  if (G.armed && !cls) st = 'ALARM';
  else if (G.storm && !cls) { st = 'IN THE STORM'; cls = 'storm'; }
  $('stealth').textContent = st; $('stealth').className = cls + (P.crouch ? ' crouch' : '');
  // boss bar
  const boss = L.enemies.find(e => e.boss && e.alive && e.state === 'alert' && Math.hypot(e.x - P.x, e.z - P.z) < 45);
  show('boss', !!boss); if (boss) { $('bossName').textContent = boss.name; $('bossbar').style.width = Math.max(0, boss.hp / boss.maxHp * 100) + '%'; }
  if (G.armed) { const s = Math.max(0, Math.ceil(G.timer)); $('timer').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; $('timerWrap').classList.toggle('crit', G.timer < 20); }
  vignT = Math.max(0, vignT - dt * 1.6); dirT = Math.max(0, dirT - dt * 1.2);
  $('vign').style.opacity = Math.max(vignT, P.hp < 30 ? .35 + Math.sin(G.t * 5) * .1 : 0); $('dmgdir').style.opacity = dirT;
  $('glassVign').style.opacity = P.glassT > 0 ? Math.min(1, P.glassT / 1.5) : 0;
  drawMinimap();
}

// ---------- loop ----------
const wrapTo = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - last) / 1000); last = now; G.t += dt;
  if (G.state === 'cine' || G.state === 'play' || G.state === 'outro') Comms.update(dt);
  if (G.state === 'cine') {
    if (cut) cut.update(dt);
    tickFX(dt); boomLight.intensity *= Math.pow(.02, dt);
    if (G.state === 'cine') ambience(dt);
    scene.fog.near = 120; scene.fog.far = 460;
    renderer.clear(); renderer.render(scene, camera);
    return;
  }
  if (G.state === 'play') {
    G.playT += dt; updatePlayer(dt);
    if (G.state === 'play') {
      updateWorld(dt);
      if (G.armed) {
        G.timer -= dt;
        if (G.timer <= 0 && G.state === 'play') {
          if (LV.outro === 'detonate') { detonateAll(120); G.shake = 1.2; if (L.bell) shatterBell(L.bell); } else { G.tint = new THREE.Color(0xffffff); G.shake = 1; sfx.rumble(1); sfx.shatter(); }
          endGame(false, LV.text.timeout, LV.text.timeoutTitle);
        }
      }
      updateHud(dt);
    }
  } else if (G.state === 'outro' || G.state === 'end') {
    updateWorld(dt);
    if (G.state === 'outro') {
      G.outro += dt;
      const alt = LV.choice && L.anim.altars[G.endTile || G.ending];
      const [lx, lz] = alt ? [alt.g.position.x, alt.g.position.z] : LV.outroLook(P), want = Math.atan2(-(lx - P.x), -(lz - P.z));
      P.yaw += wrapTo(P.yaw, want) * Math.min(1, dt * 2.5); P.pitch += ((LV.id >= 2 ? -.12 : .12) - P.pitch) * Math.min(1, dt * 2.5);
      if (LV.id === 2) { const d = Math.hypot(lx - P.x, lz - P.z); if (d > 3.2) moveCircle(P, (lx - P.x) / d * dt * 1.2, (lz - P.z) / d * dt * 1.2, .4); }
      if ((G.outro > 3 && Comms.idle()) || G.outro > 16) endGame(true, alt ? LV.endings[G.ending].text : LV.text.win);
    }
  }

  if (G.state === 'brief') {
    const a = G.t * .06; camera.position.set(CX + Math.cos(a) * 58, 46, CZ + Math.sin(a) * 58); camera.lookAt(CX, 0, CZ);
    scene.fog.near = 90; scene.fog.far = 220;
  } else {
    scene.fog.near = LV.theme.near; scene.fog.far = LV.theme.far;
    if (LV.storm) { scene.fog.near += (3 - scene.fog.near) * G.stormK; scene.fog.far += (24 - scene.fog.far) * G.stormK; }
    G.shake *= Math.pow(.05, dt);
    const bobY = P.speedNow > 0 && P.y === 0 ? Math.sin(P.bob * 2) * .05 : 0;
    const sh = Save.settings.shake ? G.shake : G.shake * .15;
    camera.position.set(P.x + (Math.random() - .5) * sh, P.eye + P.y + bobY + (Math.random() - .5) * sh, P.z + (Math.random() - .5) * sh);
    camera.rotation.set(P.pitch, P.yaw, 0, 'YXZ');
    const rl = P.reload > 0 ? Math.sin((1 - P.reload / WEAPONS[P.wpn].reload) * Math.PI) : 0;
    const g = P.wpn === 'shotgun' ? sgun : gun, kn = G.knifeT > 0;
    gun.visible = !kn && P.wpn === 'pistol'; sgun.visible = !kn && P.wpn === 'shotgun'; knife.visible = kn;
    g.position.copy(GUN_BASE).add(new THREE.Vector3(Math.sin(P.bob) * .012, Math.abs(Math.cos(P.bob)) * .01 - rl * .12 - (P.recoil > 1 ? (P.recoil - 1) * .1 : 0), Math.min(1, P.recoil) * .06));
    g.rotation.set(Math.min(1, P.recoil) * .12 - rl * .9, 0, rl * .3);
    if (kn) { const k = 1 - G.knifeT / .45; knife.position.set(.25 - k * .5, -.15 + Math.sin(k * Math.PI) * .1, -.45); knife.rotation.set(-.3, .6 - k * 1.8, -.5); }
    hammer.visible = !kn && P.wpn === 'hammer';
    if (hammer.visible) {
      // rest: head up over the right shoulder. Winding up pulls it back; a swing sweeps it down and across.
      let rx = .9, ry = -.25, rz = -.2, px = 0, py = 0;
      if (P.swingT > 0) {
        const k = 1 - P.swingT / SWING[P.swingKind].time, heavy = P.swingKind === 'heavy';
        const s = k < .55 ? Math.pow(k / .55, 2) : 1 - (k - .55) / .45 * .9;
        rx = .9 + (heavy ? .5 : .2) - s * (heavy ? 2.6 : 1.9); ry = -.25 + s * (heavy ? .2 : .9); rz = -.2 - s * .3; py = -s * .08;
      } else if (P.hCharge > 0) { rx = .9 + P.hCharge * .7; ry = -.25 - P.hCharge * .2; px = .04 * P.hCharge + (P.hCharge >= 1 ? (Math.random() - .5) * .01 : 0); }
      hammer.position.copy(HAMMER_BASE).add(new THREE.Vector3(px + Math.sin(P.bob) * .015, py + Math.abs(Math.cos(P.bob)) * .012, 0));
      hammer.rotation.set(rx, ry, rz);
    }
  }

  renderer.clear(); renderer.render(scene, camera);
  if (G.state === 'play' || G.state === 'pause' || G.state === 'outro') { renderer.clearDepth(); renderer.render(gunScene, gunCam); }
}
requestAnimationFrame(frame);
