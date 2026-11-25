import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { HEROES, MAPS, DIFFICULTY, TUNING, SURVIVOR_MAP, SURVIVOR, HILL, DUEL } from './data.js?v=20261125b';
import { initSurvivor, updateSurvivor, survivorLeaders, stormInfo, inStorm } from './survivor.js?v=20261125b';
import { initHill, updateHill, hillVisuals, onHill } from './hill.js?v=20261125b';
import { buildWorld, mirror } from './world.js?v=20261125b';
import { createHero, spawnHero, createStructure, spawnMinion, fire, releaseFire, chargeLevel, startReload, tickHero, tickCorpse, chestOf,
  updateMinions, updateStructures, updateProjectiles, updateFx, dirFrom, eyeOf, TEAM_COLOR } from './units.js?v=20261125b';
import { steer, initBot, updateBot } from './botbrain.js?v=20261125b';
import { castSlot, updateAbilities } from './abilities.js?v=20261125b';
import { floatText } from './anim.js?v=20261125b';
import { cfg, applyGraphics } from './settings.js?v=20261125b';
import { initMenu, showMenu, menuFrame, openSettings, settingsVisible } from './menu.js?v=20261125b';
import { dressed, heroOwned, wear, myCosIds, resolveCos, matchXp, award, rewardInfo, tierProgress, SEASON, MAX_TIER } from './pass.js?v=20261125b';
import { headshot } from './portraits.js?v=20261125b';
import { openSession, tickPuppet, myUid, lobbyState, leaveRoom, onLobby } from './net.js?v=20261125b';
import { initAudio, applyVolume, tone, noise, ABIL_SFX } from './audio.js?v=20261125b';
import { playMusic } from './music.js?v=20261125b';
import { sparks, castFx, lightFlash } from './vfx.js?v=20261125b';
import { applyEnvironment } from './stage.js?v=20261125b';
import { perfFrame } from './perf.js?v=20261125b';
import { gainMastery } from './mastery.js?v=20261125b';
import { startTutorial, stopTutorial, tickTutorial, tutorialCast, tutorialKill, onTutorialPass } from './tutorial.js?v=20261125b';
let envRT = null;

const $ = id => document.getElementById(id);
const canvas = $('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.08;   // keeps the bright palette, softens blown-out glows
const camera = new THREE.PerspectiveCamera(90, 1, 0.05, 400);
function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

// ---------- settings & front end ----------
const hex = c => '#' + c.toString(16).padStart(6, '0');
applyGraphics(renderer);
initMenu({
  onStart: m => startGame(m),
  onStartOnline: m => startGame('hill', m),
  blip: f => { initAudio(); tone(f, 0.06, 'triangle', 0.05, 1.3); },
  onSettings(key) {
    if (key === 'quality' || key === 'shadows') applyGraphics(renderer, G?.scene);
    if (key === 'fov') { camera.fov = cfg.fov; camera.updateProjectionMatrix(); }
    if (key === 'volume' || key === 'music' || key === 'sfx') { applyVolume(); if (key !== 'music') tone(660, 0.08, 'triangle', 0.08, 1); }
  },
  onSettingsClosed() { if (running && paused) $('pause').classList.remove('hidden'); },
});
document.querySelectorAll('#pause [data-open-settings]').forEach(b => { b.onclick = () => { $('pause').classList.add('hidden'); openSettings(); }; });


// ---------- audio (effects in audio.js, soundtrack in music.js) ----------
playMusic('menu');
const SHOT = {
  vanguard: v => { noise(0.08, 0.12 * v, 900); tone(170, 0.07, 'square', 0.05 * v); },
  striker: v => { noise(0.05, 0.08 * v, 1600); tone(260, 0.04, 'square', 0.03 * v); },
  ember: v => { tone(120, 0.25, 'sawtooth', 0.09 * v, 0.3); noise(0.15, 0.06 * v, 300); },
  warden: v => { tone(1400, 0.35, 'sawtooth', 0.06 * v, 0.15); noise(0.12, 0.08 * v, 2000); },
  thicket: v => { noise(0.18, 0.16 * v, 400); tone(90, 0.12, 'square', 0.06 * v, 0.4); },
  ratchet: v => { tone(700, 0.05, 'square', 0.04 * v, 0.3); noise(0.04, 0.06 * v, 3000); },
  mirage: v => { noise(0.06, 0.05 * v, 4000); tone(900, 0.08, 'triangle', 0.04 * v, 1.6); },
  avalanche: v => { noise(0.2, 0.1 * v, 600); tone(200, 0.15, 'sine', 0.06 * v, 0.6); },
  tempo: v => { tone(110, 0.09, 'sine', 0.07 * v, 0.7); tone(440, 0.04, 'square', 0.015 * v, 1.5); },
  kestrel: v => { noise(0.05, 0.07 * v, 2500); tone(520, 0.07, 'triangle', 0.05 * v, 0.45); },
  croc: v => { tone(80, 0.18, 'sine', 0.09 * v, 0.5); noise(0.14, 0.09 * v, 350); },
  cavalier: v => { noise(0.07, 0.12 * v, 1800); tone(300, 0.05, 'square', 0.04 * v, 0.5); },
};

// ---------- game state ----------
let G = null, P = null, running = false, paused = false;
const keys = new Set();
let mouseDown = false, recoil = 0, bob = 0, viewGun = null, hurt = 0, immuneTipT = 0, bannerT = 0, hillBannerT = 0;
let shake = 0, landA = 0, sprintA = 0, wasGround = true, fallV = 0, ultWasReady = false, viewHand = null;

// First-person gun, shaped per hero, plus an off-hand that rises when casting.
const VIEW = {
  vanguard: { len: 0.55, w: 0.12, barrel: 0.03 }, striker: { len: 0.36, w: 0.1, barrel: 0.025, mag: true },
  ember: { len: 0.55, w: 0.13, barrel: 0.08, copper: true }, warden: { len: 0.85, w: 0.1, barrel: 0.025, rings: true },
  thicket: { len: 0.45, w: 0.16, barrel: 0.05, twin: true }, ratchet: { len: 0.45, w: 0.13, barrel: 0.035, drum: true },
  mirage: { len: 0.32, w: 0.08, barrel: 0.02, cards: true }, avalanche: { len: 0.6, w: 0.17, barrel: 0.1, hopper: true },
  tempo: { len: 0.42, w: 0.16, barrel: 0.05, horn: true }, kestrel: { len: 0.52, w: 0.09, barrel: 0.02, bow: true },
  croc: { len: 0.42, w: 0.17, barrel: 0.09, hopper: true }, cavalier: { len: 0.62, w: 0.08, barrel: 0.025 },
};
function makeViewGun(def) {
  const v = VIEW[def.id], p = def.palette;
  const g = new THREE.Group();
  const f = p.finish || {}, L = c => new THREE.MeshStandardMaterial({ color: c, roughness: f.rough ?? 0.42, metalness: Math.min(0.3, f.metal || 0.08) });   // matches the rig's soft shading
  const main = L(v.copper ? 0xb87333 : p.main), dark = L(0x1d2340), trim = L(p.trim);
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };
  add(new THREE.BoxGeometry(v.w, 0.13, v.len), main, 0, 0, 0);
  add(new THREE.BoxGeometry(v.w + 0.005, 0.04, v.len * 0.6), trim, 0, 0.05, 0.02);
  const bz = -v.len / 2 - 0.12;
  for (const x of v.twin ? [-0.035, 0.035] : [0]) add(new THREE.CylinderGeometry(v.barrel, v.barrel * 1.1, 0.28, 10), dark, x, 0, bz).rotation.x = Math.PI / 2;
  add(new THREE.BoxGeometry(0.08, 0.16, 0.09), dark, 0, -0.12, v.len * 0.25).rotation.x = 0.3;
  if (v.mag) add(new THREE.BoxGeometry(0.05, 0.18, 0.07), trim, 0, -0.14, -0.05);
  if (v.rings) for (let i = 0; i < 3; i++) add(new THREE.TorusGeometry(0.05, 0.012, 6, 14), new THREE.MeshLambertMaterial({ color: p.main, emissive: p.main, emissiveIntensity: 0.8 }), 0, 0, bz + 0.05 - i * 0.1);
  if (v.drum) add(new THREE.CylinderGeometry(0.07, 0.07, 0.09, 12), trim, 0, 0.1, 0.05);
  if (v.hopper) add(new THREE.BoxGeometry(0.16, 0.14, 0.16), L(0xffffff), 0, 0.12, 0.08);
  if (v.cards) for (let i = 0; i < 3; i++) { const c = add(new THREE.BoxGeometry(0.1, 0.14, 0.005), L(i % 2 ? 0xffffff : 0xd94fa0), 0.02 * i, 0.1, 0.05 - i * 0.02); c.rotation.z = -0.2 + i * 0.2; }
  if (v.horn) { add(new THREE.CylinderGeometry(0.15, 0.05, 0.2, 14), trim, 0, 0, bz - 0.12).rotation.x = -Math.PI / 2; add(new THREE.CylinderGeometry(0.06, 0.06, 0.1, 10), dark, 0, 0.1, 0.05); }
  if (v.bow) for (const s of [-1, 1]) { const b = add(new THREE.BoxGeometry(0.3, 0.025, 0.03), trim, s * 0.15, 0.02, bz + 0.06); b.rotation.y = s * 0.4; }
  const tip = new THREE.Object3D(); tip.position.z = bz - 0.16; tip.name = 'tip'; g.add(tip);
  g.position.set(0.24, -0.22, -0.45);
  // off-hand for casting: a glove with a glowing ring in the hero's colour
  const hand = new THREE.Group(); hand.name = 'hand';
  hand.add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), L(p.skin)));
  const glow = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.015, 6, 20), new THREE.MeshBasicMaterial({ color: def.color }));
  glow.name = 'glow'; hand.add(glow);
  hand.position.set(-0.22, -0.6, -0.42);
  return { gun: g, hand };
}

let mode = 'lane';
function startGame(m = mode, online = null) {
  if (online) m = online.mode === 'duel' ? 'duel' : 'hill';
  const uid = online && myUid(), mine = online && online.roster.find(r => r.uid === uid);
  if (online && !mine) { showMenu('online'); return; }            // no slot for us in this match
  mode = m;
  initAudio();
  const surv = mode === 'survivor', hill = mode === 'hill', duel = mode === 'duel', tut = mode === 'tutorial';   // the tutorial is a Lane Breaker match on the plaza
  const map = surv ? SURVIVOR_MAP : MAPS.find(x => x.id === (tut ? 'plaza' : online ? online.map : cfg.map)) || MAPS[0];
  playMusic(map.id);
  let def = dressed(HEROES.find(h => h.id === cfg.hero && heroOwned(h.id)) || HEROES[0]);
  const scene = new THREE.Scene();
  if (G?.net) G.net.close();
  stopTutorial();
  G = { scene, map, mode: tut ? 'lane' : mode, tutorial: tut, heroes: [], minions: [], structures: [], projectiles: [], fx: [], score: { blue: 0, red: 0 },
    zones: [], walls: [], timers: [], camera,
    time: 0, waveT: surv || hill || duel || tut ? Infinity : TUNING.firstWave, playerTeam: online ? mine.team : 'blue', D: DIFFICULTY[cfg.diff], over: false, ev: events, net: null };
  const world = buildWorld(scene, map);
  G.colliders = world.colliders; G.worldTick = world.tick;
  envRT?.dispose(); envRT = applyEnvironment(renderer, scene);     // sky-lit reflections for every surface

  if (online) {
    // everyone builds the same roster in the same order; we own our hero, the host owns the bots
    const host = !!lobbyState()?.host;
    online.roster.forEach((r, i) => {
      const base = HEROES.find(h => h.id === r.hero) || HEROES[0], me = r.uid === uid;
      const name = String(r.name || 'Player').replace(/[<>&"'`]/g, '').slice(0, 16);   // names end up in the HUD's HTML
      const h = createHero(G, me ? dressed(base) : wear(base, r.skin), r.team, me ? 'You' : r.uid ? name : base.callsign, me);
      h.key = r.key; h.uid = r.uid || ''; h.local = me || (!r.uid && host); h.cos = resolveCos(me ? myCosIds() : r.cos);
      if (me) P = h;
      if (!r.uid && host) initBot(G, h, i % 3);
    });
    def = P.def;
    if (hill) initHill(G);
    if (duel) G.duel = { round: 1, pts: { blue: 0, red: 0 }, state: 'fight' };
    G.net = openSession(G, online.match);
  } else { P = createHero(G, def, 'blue', 'You', true); P.cos = resolveCos(myCosIds()); }
  if (online) { /* roster and hill are set up above */ }
  else if (surv) {
    // free for all: every bot is its own team; repeat heroes get a numbered callsign
    const seen = {};
    for (let i = 1; i < SURVIVOR.players; i++) {
      const d = HEROES[Math.floor(Math.random() * HEROES.length)];
      seen[d.id] = (seen[d.id] || 0) + 1;
      const name = d.callsign + (seen[d.id] > 1 ? ' ' + ['', '', 'II', 'III', 'IV', 'V'][Math.min(5, seen[d.id])] : '');
      const b = createHero(G, d, 'b' + i, name, false); initBot(G, b, 0);
    }
    initSurvivor(G);
  } else {
    if (!hill) for (const [team, s] of [['blue', 1], ['red', -1]]) {
      for (const [x, z] of map.towers) createStructure(G, 'tower', team, x * s, z * s);
      createStructure(G, 'core', team, 0, -s * (map.L - 11));
    }
    if (tut) {
      // three training dummies stand in the middle of the plaza, out of both towers' reach
      [['vanguard', -4], ['avalanche', 0], ['croc', 4]].forEach(([id, x], i) => {
        const d = HEROES.find(h => h.id === id) || HEROES[i];
        const b = createHero(G, d, 'red', 'Dummy ' + (i + 1), false); initBot(G, b, i);
        b.dummy = true; b.dummyAt = { x, z: -10 }; spawnHero(G, b);
      });
    } else {
      const allyPool = HEROES.filter(h => h.id !== def.id).sort(() => Math.random() - 0.5);
      for (let i = 0; i < 2; i++) { const b = createHero(G, allyPool[i], 'blue', allyPool[i].callsign, false); initBot(G, b, i + 1); }
      const redPool = [...HEROES].sort(() => Math.random() - 0.5);
      for (let i = 0; i < 3; i++) { const b = createHero(G, redPool[i], 'red', redPool[i].callsign, false); initBot(G, b, i); }
    }
    if (hill) initHill(G);
  }
  $('hud').classList.toggle('surv', surv);
  $('hud').classList.toggle('hill', hill); $('hud').classList.toggle('duel', duel);
  $('lB').textContent = hill ? 'Blue hill' : duel ? 'Blue rounds' : 'Blue core'; $('lR').textContent = hill ? 'Red hill' : duel ? 'Red rounds' : 'Red core';
  survEndT = 0; hitT = 0; tally.t = 0; flashing.clear(); $('recap').classList.add('hidden'); P._log = [];

  camera.fov = cfg.fov; camera.updateProjectionMatrix();
  scene.add(camera);
  while (camera.children.length) camera.remove(camera.children[0]);
  const vm = makeViewGun(def); viewGun = vm.gun; viewHand = vm.hand; camera.add(viewGun, viewHand);

  $('hName').textContent = def.callsign;
  for (const [slot, key] of [['q', 'Q'], ['ability', 'E'], ['ult', 'F']]) $('ab' + key).querySelector('span').textContent = def[slot].name;
  ultWasReady = false;
  $('wName').textContent = def.weapon.name; $('magMax').textContent = def.weapon.mag;
  $('feed').innerHTML = '';
  ['end', 'pause'].forEach(id => $(id).classList.add('hidden'));
  $('again').textContent = online ? 'Back to lobby' : 'Play again';
  $('toMenu').classList.toggle('hidden', !!online);
  applyGraphics(renderer);
  $('hud').classList.remove('hidden');
  // create the explosion light now and compile every shader up front, so the first blast
  // or ability doesn't freeze the game while materials rebuild
  lightFlash(G, new THREE.Vector3(0, -50, 0), 0xffffff, 0);
  renderer.compile(G.scene, camera);
  running = true; paused = false; streak = { multi: 0, lastT: -9, life: 0 };
  canvas.requestPointerLock();
  if (surv) banner('Drop in!', '#9b5cff', 'Steer your glider with WASD. Last one standing wins.');
  else if (duel) banner('Duel!', '#1d2340', `${map.name} · first to ${DUEL.toWin} rounds`);
  else if (hill) banner('Take the hill', '#e0a100', `${map.name} · first to ${HILL.target}${online ? ' · online' : ''}`);
  else if (tut) { banner('Training', '#1d2340', 'Follow the checklist on the left'); startTutorial(P); onTutorialPass(() => { tone(880, 0.1, 'triangle', 0.06, 1.3); tone(1320, 0.14, 'triangle', 0.05, 1, 0.08); }); }
  else banner(`Break the ${map.lanes.length > 1 ? 'lanes' : 'lane'}`, '#1d2340', map.name);
  say(P, 'spawn');
}

let survEndT = 0;
function endGame(win) {
  G.over = true; running = false;
  document.exitPointerLock();
  if (G.tutorial) {
    $('endTitle').innerHTML = 'Training complete<small>You know the basics</small>';
    $('endTitle').style.color = 'var(--blue)';
  } else if (G.mode === 'survivor') {
    const place = win ? 1 : P.place;
    $('endTitle').innerHTML = win ? 'MAXX OUT!<small>#1 of ' + G.heroes.length + '</small>' : `#${place}<small>of ${G.heroes.length} · eliminated</small>`;
    $('endTitle').style.color = win ? '#9b5cff' : 'var(--red)';
  } else if (G.mode === 'duel') {
    const p = G.duel.pts;
    $('endTitle').innerHTML = `${win ? 'Duel won' : 'Duel lost'}<small>Rounds ${p.blue} – ${p.red}</small>`;
    $('endTitle').style.color = win ? 'var(--blue)' : 'var(--red)';
  } else if (G.mode === 'hill') {
    const p = G.hill.pts2;
    $('endTitle').innerHTML = `${win ? 'Victory' : 'Defeat'}<small>Hill ${Math.floor(p.blue)} – ${Math.floor(p.red)}</small>`;
    $('endTitle').style.color = win ? 'var(--blue)' : 'var(--red)';
  } else {
    $('endTitle').textContent = win ? 'Victory' : 'Defeat';
    $('endTitle').style.color = win ? 'var(--blue)' : 'var(--red)';
  }
  $('endTable').innerHTML = scoreTable();
  showPassGain(win);
  setTimeout(() => $('end').classList.remove('hidden'), 1200);
}

// Season pass payout, shown under the scoreboard with the bar filling from old to new XP.
function showPassGain(win) {
  if (G.awarded) return;
  G.awarded = true;
  if (G.tutorial) {
    $('passGain').innerHTML = `<div class="pg-top"><span>Tutorial complete</span><b>You're ready</b></div>
      <div class="pg-parts">Try Lane Breaker, Survivor or Hill Rush from the main menu. Matches earn season pass and hero mastery XP.</div>`;
    return;
  }
  const res = award(matchXp({ mode: G.mode, win, kills: P.kills, place: win ? 1 : P.place, players: G.heroes.length }));
  const mst = gainMastery(P.def.id, { win, kills: P.kills, dmg: P.dmgDealt });
  const p0 = tierProgress(res.before), p1 = tierProgress(res.after);
  const el = $('passGain');
  const chip = r => { const inf = rewardInfo(r); return inf.cos ? `<span class="cos"><i>${inf.glyph}</i>${inf.title} · ${inf.sub}</span>`
    : `<span class="${r.type}" style="--hc:#${inf.def.color.toString(16).padStart(6, '0')}"><img src="${headshot(inf.def)}" alt="">${r.type === 'hero' ? 'New hero: ' : ''}${inf.title}${r.type === 'skin' ? ` · ${inf.sub}` : ''}</span>`; };
  el.innerHTML = `
    <div class="pg-top"><span>Season ${SEASON.n} pass</span><b>+${res.gained} XP</b></div>
    <div class="pg-parts">${res.parts.map(([k, v]) => `${k} +${v}`).join(' · ')}</div>
    <div class="pg-bar"><i style="width:${res.t1 > res.t0 ? 0 : p0.frac * 100}%"></i></div>
    <div class="pg-tier"><span>Tier ${res.t0}${res.t1 > res.t0 ? ` → <b>${res.t1}</b>` : ''}</span><span>${p1.tier >= MAX_TIER ? 'Pass complete!' : `${p1.into} / ${p1.need} XP to tier ${p1.tier + 1}`}</span></div>
    ${res.unlocked.length ? `<div class="pg-un">${res.unlocked.map(chip).join('')}</div>` : ''}
    ${mst ? `<div class="pg-mst" style="--mc:${mst.after.rank.color}">
      <div class="pg-top"><span>${P.def.callsign} mastery</span><b>+${mst.gained} XP</b></div>
      <div class="pg-bar"><i style="width:${mst.levelUp ? 0 : mst.before.frac * 100}%"></i></div>
      <div class="pg-tier"><span>${mst.after.rank.name} · Lv ${mst.before.level}${mst.levelUp ? ` → <b>${mst.after.level}</b>` : ''}</span><span>${mst.after.max ? 'Mastered!' : `${mst.after.into} / ${mst.after.need} XP`}</span></div>
      ${mst.rankUp ? `<div class="pg-rank">New rank: ${mst.after.rank.name}!</div>` : ''}</div>` : ''}`;
  if (mst) setTimeout(() => { const b = el.querySelector('.pg-mst .pg-bar i'); if (b) b.style.width = (mst.after.frac * 100) + '%'; }, 1700);
  if (mst?.levelUp) setTimeout(() => { tone(523, 0.15, 'square', 0.05, 1); tone(784, 0.25, 'square', 0.05, 1, 0.12); }, 1800);
  setTimeout(() => { el.querySelector('.pg-bar i').style.width = (p1.frac * 100) + '%'; }, 1500);
  if (res.unlocked.length) setTimeout(() => { tone(660, 0.2, 'triangle', 0.08, 1.5); tone(990, 0.3, 'triangle', 0.06, 1.3); }, 1600);
}

function scoreTable() {
  if (G.mode === 'survivor') {
    const rows = survivorLeaders(G).slice(0, 12).map((h, i) => `<tr class="${h.isPlayer ? 'me' : ''}"><td>${h.alive ? '●' : '#' + h.place}</td><td><b>${h.isPlayer ? 'You' : h.name}</b></td><td>${h.def.name}</td><td>${h.kills}</td><td>${Math.round(h.dmgDealt)}</td></tr>`).join('');
    return `<table><tr><th>Place</th><th>Player</th><th>Hero</th><th>Kills</th><th>Dmg</th></tr>${rows}</table>`;
  }
  const rows = t => G.heroes.filter(h => h.team === t).sort((a, b) => b.kills - a.kills).map(h =>
    `<tr><td class="${t}T"><b>${h.isPlayer ? "You" : h.name}</b></td><td>${h.def.name}</td><td>${h.kills}</td><td>${h.deaths}</td><td>${Math.round(h.dmgDealt)}</td></tr>`).join('');
  return `<table><tr><th>Blue</th><th>Hero</th><th>K</th><th>D</th><th>Dmg</th></tr>${rows('blue')}
    <tr><th>Red</th><th></th><th></th><th></th><th></th></tr>${rows('red')}</table>`;
}

// ---------- hit feedback ----------
// Hitmarker that pops and fades (white body, yellow head, red kill), a running damage tally
// beside the crosshair, and a white flash on whatever you hit.
const HIT_DUR = { hit: 0.16, head: 0.24, kill: 0.55 };
let hitT = 0, hitMax = 1, hitKind = 'hit', lastHitSnd = -1;
const tally = { v: 0, t: 0, pop: 0, head: 0 };
function hitMark(kind) {
  if (hitKind === 'kill' && hitT > 0.2 && kind !== 'kill') return;
  hitKind = kind; hitT = hitMax = HIT_DUR[kind];
  $('hit').setAttribute('class', kind === 'hit' ? '' : kind);
  const c = $('cross'); c.classList.add('hitpulse'); clearTimeout(c._t); c._t = setTimeout(() => c.classList.remove('hitpulse'), 70);
}

// ---------- feedback: damage direction, streaks, cooldown pings ----------
function dmgDir(from) {
  const f = new THREE.Vector3(-Math.sin(P.yaw), 0, -Math.cos(P.yaw)), r = new THREE.Vector3(Math.cos(P.yaw), 0, -Math.sin(P.yaw));
  const to = new THREE.Vector3(from.x - P.pos.x, 0, from.z - P.pos.z);
  if (to.lengthSq() < 0.5) return;
  const box = $('dmgdir'), last = box.lastElementChild;
  const a = Math.atan2(to.dot(r), to.dot(f));
  if (last && Math.abs(last._a - a) < 0.3 && performance.now() - last._t < 250) return;   // merge rapid hits from one side
  const el = document.createElement('i'); el._a = a; el._t = performance.now();
  el.style.transform = `rotate(${a}rad)`; box.append(el);
  while (box.children.length > 6) box.firstElementChild.remove();
  setTimeout(() => { el.style.opacity = 0; }, 60); setTimeout(() => el.remove(), 1000);
}
const MULTI = ['', '', 'Double kill', 'Triple kill', 'Quad kill', 'Maxxacre'];
const SPREE = { 3: 'Killing spree', 5: 'Rampage', 8: 'Unstoppable', 12: 'Legendary' };
let streak = { multi: 0, lastT: -9, life: 0 };
function onPlayerKill() {
  streak.multi = G.time - streak.lastT < 4.5 ? streak.multi + 1 : 1; streak.lastT = G.time; streak.life++;
  const m = MULTI[Math.min(5, streak.multi)], sp = SPREE[streak.life];
  if (!m && !sp) return;
  const s = $('streak');
  s.innerHTML = (m || sp) + (m && sp ? `<small>${sp}</small>` : '');
  s.classList.remove('on'); void s.offsetWidth; s.classList.add('on');
  [660, 830, 990, 1320].slice(0, 1 + Math.min(3, streak.multi)).forEach((f, i) => tone(f, 0.12, 'square', 0.05, 1, i * 0.07));
}
let cdPing = null;
function readyPing(name) {
  tone(880, 0.07, 'triangle', 0.05, 1.2); tone(1320, 0.09, 'triangle', 0.035, 1, 0.06);
  const el = $('cdping'); el.textContent = `${name} ready`; el.style.opacity = 1;
  clearTimeout(cdPing); cdPing = setTimeout(() => { el.style.opacity = 0; }, 900);
}
let beatT = 0;

// ---------- kill cam & death recap ----------
const unitName = u => !u ? (G.mode === 'survivor' ? 'The storm' : 'The fountain') : u.kind === 'hero' ? (u.isPlayer ? 'You' : u.name) : u.kind === 'tower' ? 'A tower' : u.kind === 'core' ? 'The core' : u.deploy ? `${u.owner?.name || 'A'}'s gadget` : 'A minion';
function deathRecap(src) {
  const killer = src?.kind === 'hero' ? src : src?.owner?.kind === 'hero' ? src.owner : null;
  G.killCam = killer && killer !== P ? { who: killer, t: 3.4 } : null;
  // damage taken in the last 10 seconds, grouped by who dealt it
  const by = new Map();
  for (const e of (P._log || [])) {
    if (G.time - e.t > 10) continue;
    const k = e.src?.kind === 'hero' ? e.src : e.src?.owner?.kind === 'hero' ? e.src.owner : e.src;
    const r = by.get(k) || { u: k, amt: 0, heads: 0 }; r.amt += e.amt; r.heads += e.head ? 1 : 0; by.set(k, r);
  }
  P._log = [];
  const rows = [...by.values()].sort((a, b) => b.amt - a.amt).slice(0, 4), total = rows.reduce((a, r) => a + r.amt, 0) || 1;
  const col = u => u?.kind === 'hero' ? hex(u.def.color) : '#8a8f99';
  const el = $('recap');
  el.innerHTML = `
    <div class="rc-head">
      ${killer ? `<img src="${headshot(killer.def)}" alt="">` : '<div class="rc-skull">☠</div>'}
      <div><small>Eliminated by</small><b>${unitName(killer || src)}</b>
        ${killer ? `<span>${killer.def.callsign} · ${killer.def.role}${killer.alive ? ` · ${Math.ceil(killer.hp)} HP left` : ''}</span>` : ''}</div>
    </div>
    ${rows.length ? `<div class="rc-rows">${rows.map(r => `<div class="rc-row"><i style="background:${col(r.u)};width:${Math.max(8, r.amt / total * 100)}%"></i>
      <span>${unitName(r.u)}</span><b>${Math.round(r.amt)}${r.heads ? ` <em>· ${r.heads} head</em>` : ''}</b></div>`).join('')}</div>` : ''}`;
  el.classList.remove('hidden', 'on'); void el.offsetWidth; el.classList.add('on');
}
const camBack = new THREE.Vector3(), camLook = new THREE.Vector3();
function killCamera(dt) {
  const kc = G.killCam;
  if (!kc || kc.t <= 0 || !kc.who.alive) return false;
  kc.t -= dt;
  const k = kc.who, f = dirFrom(k.yaw, k.pitch || 0), side = new THREE.Vector3(Math.cos(k.yaw), 0, -Math.sin(k.yaw));
  camBack.copy(k.pos).addScaledVector(new THREE.Vector3(f.x, 0, f.z).normalize(), -3.2).addScaledVector(side, 0.9); camBack.y = k.pos.y + 2.4;
  camera.position.lerp(camBack, Math.min(1, dt * 6));
  camLook.copy(eyeOf(k)).addScaledVector(f, 18);
  camera.lookAt(camLook);
  return true;
}
const FLASH = new THREE.MeshBasicMaterial({ color: 0xffffff });
const flashing = new Set();
function flashUnit(u) {
  if (!u.mesh) return;
  if (!u._flash) {
    u._flash = [];
    u.mesh.traverse(o => {
      if (!o.isMesh || o.parent === u.bar || !o.visible || !o.material || o.material.transparent) return;
      u._flash.push([o, o.material]); o.material = FLASH;
    });
  }
  u._flashT = 0.07; flashing.add(u);
}
function tickFlash(dt) {
  for (const u of flashing) {
    if ((u._flashT -= dt) > 0) continue;
    for (const [o, m] of u._flash) o.material = m;
    u._flash = null; flashing.delete(u);
  }
}

// ---------- events from the simulation ----------
const events = {
  damage(t, amt, src, head) {
    if (src === P && t !== P) {
      tally.v += amt; tally.t = 1.3;
      if (amt >= 2 || head) {                       // burns and bleeds tick too small to mark
        hitMark(head ? 'head' : 'hit');
        flashUnit(t);
        sparks(G, chestOf(t), head ? 0xffd23c : 0xffffff, head ? 10 : 5, head ? 7 : 5);
        tally.pop = 1; if (head) tally.head = 0.7;
        if (G.time - lastHitSnd > 0.04) {
          lastHitSnd = G.time;
          tone(head ? 1500 : 1050, 0.045, 'square', head ? 0.06 : 0.045, 1.05);
          if (head) tone(2200, 0.08, 'triangle', 0.04, 1);
        }
      }
      // batch small ticks (burns, zones) into one number every quarter second
      t._acc = (t._acc || 0) + amt;
      if (t._acc >= 8 || head || G.time - (t._accT || 0) > 0.25) {
        if (cfg.dmgNumbers) floatText(G, chestOf(t).setY(t.pos.y + (t.kind === 'hero' ? 2.1 : 1.4)), String(Math.round(t._acc)), head ? '#ffd23c' : '#ffffff', head ? 1.3 : 1);
        t._acc = 0; t._accT = G.time;
      }
    }
    if (t === P && src) { hurt = Math.min(1, hurt + amt / 60); if (src.pos && amt >= 2) dmgDir(src.pos);
      (P._log ||= []).push({ src, amt, head, t: G.time }); if (P._log.length > 200) P._log.splice(0, 100); }
  },
  heal(u, amt, src) {
    if (cfg.dmgNumbers && amt >= 1 && (u === P || src === P)) floatText(G, chestOf(u).setY(u.pos.y + 2.1), '+' + Math.round(amt), '#5fe0a0');
  },
  flash(u, text) {
    if (u === P || u.lastHitBy === P || G.heroes.some(h => h.isPlayer && h.pos.distanceTo(u.pos) < 30)) floatText(G, chestOf(u).setY(u.pos.y + 2.5), text, '#ffe08a', 1.2);
  },
  boom(p, w = { splash: 3.5 }) {
    const d = p.distanceTo(P.pos);
    if (d < 45 && (w.splash > 0 || w.onExplode)) { noise(0.25, 0.12 * (1 - d / 45), 200); tone(80, 0.3, 'sine', 0.12 * (1 - d / 45), 0.5); }
    if (cfg.screenShake && d < 10 && w.splash > 2) shake = Math.max(shake, 0.4 * (1 - d / 10));
  },
  shake(h, k) { const d = h.pos.distanceTo(P.pos); if (cfg.screenShake && d < 16) shake = Math.max(shake, k * (1 - d / 16)); },
  loot(h, t) {
    if (h !== P) return;
    tone(t.id === 'power' ? 880 : 700, 0.15, 'triangle', 0.08, 1.6); tone(1050, 0.1, 'sine', 0.05, 1.2);
    floatText(G, P.pos.clone().setY(P.pos.y + 1.4).addScaledVector(dirFrom(P.yaw, 0), 2), t.label, hex(t.color), 1.1);
  },
  storm(state, s) {
    if (state === 'shrink') { banner('The storm is closing', '#9b5cff', 'Move to the white circle'); tone(140, 0.8, 'sawtooth', 0.06, 0.6); }
    else if (s.state !== 'final') banner('Storm holding', '#9b5cff', 'Next circle is marked on your map');
  },
  landed(h) { if (h === P) { tone(180, 0.15, 'sine', 0.1, 0.5); landA = 0.6; } },
  turretShot(m) { const d = m.pos.distanceTo(P.pos); if (d < 30) tone(1200, 0.03, 'square', 0.03 * (1 - d / 30), 0.6); },
  kill(t, src) {
    if (t.kind === 'hero' && src === P && t !== P) { onPlayerKill(); if (G.tutorial) tutorialKill(); }
    if (t === P) { streak.life = 0; deathRecap(src); }
    const env = G.mode === 'survivor' ? 'The storm' : 'Fountain';
    const nm = u => u ? (u.kind === 'hero' ? (u.isPlayer ? 'You' : u.name) : u.kind === 'tower' ? 'Tower' : u.kind === 'core' ? 'Core' : 'Minion') : env;
    if (t.kind === 'hero' || t.kind === 'tower' || t.kind === 'core') {
      // killer ──▶ victim, coloured by side; your own kills and deaths stand out
      const side = u => !u ? 'n' : u.team === G.playerTeam ? 'b' : 'r';
      const dot = u => u && u.kind === 'hero' ? `<i class="dot" style="background:${hex(u.def.color)}"></i>` : '';
      const victim = t.kind === 'hero' ? nm(t) : (t.team === 'blue' ? 'Blue ' : 'Red ') + nm(t);
      const el = document.createElement('div');
      el.className = src === P ? 'me' : t === P ? 'died' : '';
      el.innerHTML = `<span class="${side(src)}">${dot(src)}${nm(src)}</span>`
        + `<span class="arr ${side(src)}">${t.killedByHead && src && src.kind === 'hero' ? '<em>HEAD</em>' : ''}</span>`
        + `<span class="${side(t)}">${dot(t)}${victim}</span>`;
      $('feed').prepend(el);
      setTimeout(() => el.remove(), 6000);
      while ($('feed').children.length > 6) $('feed').lastChild.remove();
    }
    if (src === P && t.kind === 'hero') hitMark('kill');
    if (t.kind === 'hero' && src === P) { banner(`Eliminated ${t.name}`, 'var(--red)', `“${pick(P.def.quips.kill)}”`); tone(600, 0.25, 'triangle', 0.08, 2); }
    else if (t.kind === 'hero' && src && src.kind === 'hero') say(src, 'kill');
    if (t.kind === 'tower') { banner(t.team === 'red' ? 'Enemy tower down. Core exposed' : 'Our tower fell', t.team === 'red' ? 'var(--blue)' : 'var(--red)'); tone(90, 0.6, 'sawtooth', 0.1, 0.4); }
    if (t.kind === 'core') endGame(t.team === 'red');
    if (G.duel && t.kind === 'hero' && (!G.net || G.net.host)) duelKnockout(t, src);
    if (G.mode === 'survivor' && t.kind === 'hero') {
      const left = G.aliveCount;
      if (t === P) { survEndT = 2.6; banner(`Eliminated · #${t.place}`, 'var(--red)', src && src.kind === 'hero' ? `by ${src.name}` : 'The storm got you'); }
      else if (P.alive && left === 1) { banner('MAXX OUT!', '#9b5cff', 'Last one standing'); setTimeout(() => endGame(true), 1500); G.over = true; }
      else if (P.alive && (left <= 5 || src === P)) $('feed').firstChild && ($('feed').firstChild.innerHTML += ` <small>· ${left} left</small>`);
    }
  },
  immune(t, src) {
    if (src === P && G.time > immuneTipT) { immuneTipT = G.time + 3; banner('Core is shielded. Take down a tower first', '#1d2340'); }
  },
  hill(type, H, team) {
    const ours = team === G.playerTeam;
    if (type === 'capture' && G.time > hillBannerT) {
      hillBannerT = G.time + 4;
      banner(ours ? 'We have the hill' : 'Enemy took the hill', ours ? 'var(--blue)' : 'var(--red)');
      tone(ours ? 660 : 200, 0.3, 'triangle', 0.08, ours ? 1.5 : 0.7);
    } else if (type === 'contest' && onHill(G, P)) tone(330, 0.1, 'square', 0.04, 1);
    else if (type === 'soon') { banner(`Hill moves in ${HILL.warn}`, '#e0a100', 'Get ready to rotate'); tone(520, 0.15, 'sine', 0.06, 1); }
    else if (type === 'move') { banner('The hill moved', '#e0a100', 'Follow the beam'); tone(440, 0.4, 'sawtooth', 0.06, 1.8); hillBannerT = G.time + 2; }
    else if (type === 'win') {
      G.over = true;
      if (G.net?.host) G.net.queue({ k: 'end', w: team });
      banner(ours ? 'Hill secured' : 'They held the hill', ours ? 'var(--blue)' : 'var(--red)', `${Math.floor(H.pts2.blue)} – ${Math.floor(H.pts2.red)}`);
      setTimeout(() => endGame(ours), 1400);
    }
  },
  // online: the host called the result
  netRound(e) { applyDuel(e); },
  netEnd(team) {
    if (G.over) return;
    G.over = true;
    const ours = team === G.playerTeam, H = G.hill;
    banner(ours ? 'Hill secured' : 'They held the hill', ours ? 'var(--blue)' : 'var(--red)', `${Math.floor(H.pts2.blue)} – ${Math.floor(H.pts2.red)}`);
    setTimeout(() => endGame(ours), 1400);
  },
  netLeft(h) {
    const el = document.createElement('div');
    el.innerHTML = `<span class="n">${h.name} left the match</span>`;
    $('feed').prepend(el); setTimeout(() => el.remove(), 6000);
  },
  shot(h) {
    if (h === P) { if (h.def.id !== 'avalanche' || Math.random() < 0.5) SHOT[h.def.id](1); recoil = Math.min(1, recoil + RECOIL[h.def.id]); return; }
    const d = h.pos.distanceTo(P.pos);
    if (d < 40 && (h.def.id !== 'avalanche' || Math.random() < 0.3)) SHOT[h.def.id](0.5 * (1 - d / 40));
  },
  surface(h) {
    const d = h === P ? 0 : h.pos.distanceTo(P.pos);
    if (d < 40) { const v = h === P ? 1 : 0.6 * (1 - d / 40); noise(0.5, 0.14 * v, 1200, 0, { type: 'lowpass', to: 200 }); tone(90, 0.4, 'sine', 0.18 * v, 0.5); }
  },
  ability(h, slot) {
    if (h === P || !(h.invisT > 0)) castFx(G, h, slot);
    if (h === P && G.tutorial) tutorialCast(slot);
    const d = h === P ? 0 : h.pos.distanceTo(P.pos), near = d < 25;
    const sfx = ABIL_SFX[h.def[slot]?.id];
    if (sfx) { if (d < 45) sfx(h === P ? 1 : 0.6 * (1 - d / 45)); }
    else if (near) tone(slot === 'ult' ? 200 : 360, 0.25, 'triangle', 0.05, 1.6);
    if (h === P && slot === 'ult') { tone(220, 0.6, 'sawtooth', 0.05, 3); ultFlash(h.def.color); }
    if (slot === 'ult') {
      banner(`${h.isPlayer ? 'You' : h.def.callsign}: ${h.def.ult.name}!`, h.team === 'blue' ? 'var(--blue)' : 'var(--red)', `“${pick(h.def.quips.ult)}”`);
      say(h, 'ult');
    } else if (near && Math.random() < 0.6) say(h, 'ability');
  },
};

// Per-hero feel for the first-person gun.
const RECOIL = { vanguard: 0.25, striker: 0.18, ember: 0.7, warden: 1, thicket: 0.9, ratchet: 0.3, mirage: 0.3, avalanche: 0.55, tempo: 0.06, kestrel: 0.4, croc: 0.6, cavalier: 0.45 };
const SPIN_RELOAD = new Set(['striker', 'mirage', 'ratchet']);
function ultFlash(color) {
  const f = $('ultflash'); f.style.background = `radial-gradient(circle, transparent 40%, ${hex(color)}aa)`;
  f.style.transition = 'none'; f.style.opacity = 1;
  requestAnimationFrame(() => { f.style.transition = 'opacity .8s'; f.style.opacity = 0; });
}

function banner(text, color, sub = '') {
  const b = $('banner'); b.innerHTML = `${text}${sub ? `<small>${sub}</small>` : ''}`; b.style.color = color; b.style.opacity = 1; bannerT = 2.4;
}

// Hero voice lines, shown as a speech strip above the vitals.
const pick = a => a[Math.floor(Math.random() * a.length)];
let voiceT = 0;
function say(h, kind) {
  if (!cfg.voiceLines) return;
  const line = pick(h.def.quips[kind] || []);
  if (!line) return;
  const v = $('voice');
  const side = h.team === 'blue' ? 'b' : 'r';
  v.innerHTML = `<b class="${side}">${h.isPlayer ? 'You' : h.def.callsign}</b> “${line}”`;
  v.style.opacity = 1; voiceT = 2;
}

// ---------- input ----------
addEventListener('keydown', e => {
  if (e.code === 'Tab') { e.preventDefault(); if (running) { $('sbBody').innerHTML = scoreTable(); $('scoreboard').classList.remove('hidden'); } }
  keys.add(e.code);
  if (!running || paused) return;
  if (e.code === 'KeyR') startReload(P);
  const slot = { KeyQ: 'q', KeyE: 'ability', KeyF: 'ult' }[e.code];
  if (slot && !castSlot(G, P, slot, { wish: wishDir(), aim: dirFrom(P.yaw, P.pitch) })) tone(160, 0.08, 'square', 0.04, 1);
});
addEventListener('keyup', e => { keys.delete(e.code); if (e.code === 'Tab') $('scoreboard').classList.add('hidden'); });
addEventListener('mousedown', e => { if (e.button === 0) mouseDown = true; });
addEventListener('mouseup', e => { if (e.button === 0) mouseDown = false; });
canvas.addEventListener('click', () => { if (running && !document.pointerLockElement) canvas.requestPointerLock(); });
document.addEventListener('pointerlockchange', () => {
  const locked = document.pointerLockElement === canvas;
  if (running && !locked) {
    paused = true; mouseDown = false; keys.clear();
    $('pause').querySelector('p').textContent = G?.net ? 'The online match keeps going. Click resume to jump back in.' : 'Click resume to lock the mouse again.';
    $('pause').classList.remove('hidden');
  }
  if (locked) { paused = false; $('pause').classList.add('hidden'); }
});
document.addEventListener('mousemove', e => {
  if (!running || paused || !P) return;
  const k = 0.0022 * cfg.sens;
  P.yaw -= e.movementX * k;
  P.pitch = Math.max(-1.5, Math.min(1.5, P.pitch - e.movementY * k * (cfg.invertY ? -1 : 1)));
});

$('resume').onclick = () => canvas.requestPointerLock();
// Leaving an online match mid-game also leaves the room; after a match you go back to the lobby.
const toMenu = (where = 'main') => {
  const net = G?.net, midMatch = net && !G.over;
  net?.close();
  if (midMatch || (net && where === 'main')) leaveRoom();
  running = false; paused = false; G = null; document.exitPointerLock?.(); stopTutorial();
  playMusic('menu');
  ['end', 'pause'].forEach(id => $(id).classList.add('hidden')); $('hud').classList.add('hidden');
  showMenu(net && !midMatch && where !== 'main' ? 'online' : where);
};
$('again').onclick = () => (G?.net ? toMenu('online') : startGame());
$('quit').onclick = () => toMenu('main'); $('toMenu').onclick = () => toMenu('roster'); $('toMain').onclick = () => toMenu('main');
// the host closing the room ends the match for everyone else
onLobby((st, extra) => {
  if (!extra?.closed || !G?.net || G.over) return;
  G.over = true; G.net.close();
  banner('The host left the match', 'var(--red)', 'Back to the lobby screen…');
  setTimeout(() => { if (G?.net) toMenu('online'); }, 2500);
});

function wishDir() {
  const f = new THREE.Vector3(-Math.sin(P.yaw), 0, -Math.cos(P.yaw));
  const r = new THREE.Vector3(Math.cos(P.yaw), 0, -Math.sin(P.yaw));
  const w = new THREE.Vector3();
  if (keys.has('KeyW')) w.add(f); if (keys.has('KeyS')) w.sub(f);
  if (keys.has('KeyD')) w.add(r); if (keys.has('KeyA')) w.sub(r);
  return w.lengthSq() ? w.normalize() : w;
}

// ---------- per-frame ----------
function updatePlayer(dt) {
  if (!P.alive) {
    P.respawnT -= dt;
    $('center').classList.remove('hidden');
    const kc = killCamera(dt);
    $('center').textContent = kc ? `Kill cam · ${G.killCam.who.name}` : G.mode === 'survivor' ? (G.over ? 'Spectating' : 'Eliminated') : G.mode === 'duel' ? (G.over ? 'Duel over' : 'Knocked out · next round soon') : `Respawning in ${Math.max(0, P.respawnT).toFixed(1)}s`;
    if (!kc) {
      camera.position.lerp(new THREE.Vector3(P.pos.x, P.pos.y + 14, P.pos.z - Math.sign(P.pos.z || 1) * 10), Math.min(1, dt * 2));
      camera.lookAt(P.pos);
    }
    viewGun.visible = false; viewHand.visible = false;
    if (G.mode === 'survivor') { if (survEndT > 0 && (survEndT -= dt) <= 0) endGame(false); return; }
    if (P.respawnT <= 0) { spawnHero(G, P); say(P, "spawn"); G.killCam = null; $('recap').classList.add('hidden'); }
    return;
  }
  $('center').classList.add('hidden'); $('recap').classList.add('hidden');
  viewGun.visible = true; viewHand.visible = true;
  const w = wishDir();
  const sprint = keys.has('ShiftLeft') && keys.has('KeyW') && !mouseDown && P.onGround;
  steer(P, w, sprint, keys.has('Space'), dt);
  const vyBefore = P.vel.y;
  tickHero(G, P, dt);
  if (!wasGround && P.onGround) landA = Math.min(1, Math.max(0, -fallV - 4) / 10);
  wasGround = P.onGround; fallV = vyBefore;
  if (mouseDown) {
    const tip = viewGun.getObjectByName('tip').getWorldPosition(new THREE.Vector3());
    if (fire(G, P, dirFrom(P.yaw, P.pitch), tip)) {
      P.pitch = Math.min(1.5, P.pitch + RECOIL[P.def.id] * 0.03);
    }
  }
  if (!mouseDown && P.chargeStart != null) {
    const tip = viewGun.getObjectByName('tip').getWorldPosition(new THREE.Vector3());
    const c = chargeLevel(G, P);
    if (releaseFire(G, P, dirFrom(P.yaw, P.pitch), tip)) P.pitch = Math.min(1.5, P.pitch + 0.015 + c * 0.04);
  }
  const spd = Math.hypot(P.vel.x, P.vel.z);
  bob += dt * spd * (P.onGround ? 1.5 : 0);
  recoil = Math.max(0, recoil - dt * 6);
  landA = Math.max(0, landA - dt * 4);
  sprintA += ((sprint && spd > 4 ? 1 : 0) - sprintA) * Math.min(1, dt * 8);
  shake = Math.max(0, shake - dt * 2);
  P.castA = Math.max(0, (P.castA || 0) - dt * 1.8);

  // camera: bob, landing dip, shake, stun wobble
  eyeOf(P, camera.position);
  camera.position.y += Math.sin(bob * 2) * 0.04 * Math.min(1, spd / 6) - landA * 0.22;
  const sh = shake * 0.12;
  const wob = P.stunT > 0 ? Math.sin(G.time * 9) * 0.06 : 0;
  camera.rotation.set(P.pitch + (Math.random() - 0.5) * sh, P.yaw + (Math.random() - 0.5) * sh, wob, 'YXZ');

  // view model: sway, recoil, sprint tilt, reload flourish, cast dip
  const cast = Math.min(1, P.castA);
  const rl = P.reloadT > 0 ? 1 - P.reloadT / P.def.weapon.reload : 0;
  const rlArc = Math.sin(rl * Math.PI);
  viewGun.position.set(
    0.24 + Math.cos(bob) * 0.012 + sprintA * 0.04,
    -0.22 + Math.abs(Math.sin(bob)) * 0.012 - cast * 0.18 - landA * 0.05 - rlArc * 0.06,
    -0.45 + recoil * 0.09);
  viewGun.rotation.set(
    recoil * 0.15 + rlArc * (SPIN_RELOAD.has(P.def.id) ? 0.3 : 0.75) - sprintA * 0.25 + cast * 0.4,
    sprintA * 0.5,
    SPIN_RELOAD.has(P.def.id) ? rl * Math.PI * 2 : rlArc * 0.35);
  viewHand.position.set(-0.22 + cast * 0.08, -0.6 + Math.sin(cast * Math.PI * 0.5) * 0.42, -0.42 - cast * 0.08);
  // slot flavour: Q punches the hand forward, the ultimate raises it high and spins the gun
  if (P.castSlot === 'q') { viewHand.position.z -= Math.sin(cast * Math.PI) * 0.22; viewHand.rotation.x = -Math.sin(cast * Math.PI) * 0.5; }
  else if (P.castSlot === 'ult') { viewHand.position.y += Math.sin(cast * Math.PI * 0.5) * 0.12; viewGun.rotation.z += Math.min(1, P.castA / 1.6) * Math.PI * 2 * (P.castA > 0 ? 1 : 0); }
  else viewHand.rotation.x = 0;
  const glowMat = viewHand.getObjectByName('glow')?.material;
  if (glowMat && glowMat.opacity != null) { glowMat.transparent = true; glowMat.opacity = 0.55 + cast * 0.45; }
  const glow = viewHand.getObjectByName('glow');
  glow.rotation.x += dt * 6; glow.rotation.y += dt * 4; glow.scale.setScalar(1 + cast * 0.8);
  const fovT = cfg.fov + sprintA * 6 + (P.castA > 1 ? 8 : 0) + (P.dashT > 0 ? 10 : 0);
  if (Math.abs(camera.fov - fovT) > 0.1) { camera.fov += (fovT - camera.fov) * Math.min(1, dt * 8); camera.updateProjectionMatrix(); }
}

function spawnWave() {
  G.map.lanes.forEach((_, li) => {
    for (const team of ['blue', 'red']) for (let i = 0; i < TUNING.minionsPerWave; i++) spawnMinion(G, team, li, (i - 1.5) * 1.2);
  });
}

// Lane Breaker round timer: a warning a minute out, overtime, then a decision on core health.
function laneClock() {
  const t = G.time;
  if (!G.otWarn && t > TUNING.overtime - 60) { G.otWarn = true; banner('1 minute to overtime', '#1d2340', 'Cores lose their shields at 5:00'); }
  if (!G.otOn && t > TUNING.overtime) {
    G.otOn = true; banner('OVERTIME', 'var(--red)', 'Cores are exposed and take double damage');
    tone(110, 0.8, 'sawtooth', 0.1, 2); tone(165, 0.8, 'sawtooth', 0.06, 2);
  }
  if (t > TUNING.laneLimit) {
    const core = team => G.structures.find(s => s.kind === 'core' && s.team === team);
    const b = core('blue').hp / core('blue').maxHp, r = core('red').hp / core('red').maxHp;
    const win = b === r ? G.score.blue >= G.score.red : b > r;
    G.over = true;
    banner('Time!', win ? 'var(--blue)' : 'var(--red)', `Cores: ${Math.round(b * 100)}% – ${Math.round(r * 100)}%`);
    setTimeout(() => endGame(win), 1600);
  }
}

function updateHud(dt) {
  const w = P.def.weapon;
  $('hpBar').style.width = (100 * P.hp / P.maxHp) + '%';
  $('hpBar').style.background = P.hp / P.maxHp < 0.35 ? 'var(--red)' : 'var(--mint)';
  $('hHp').textContent = `${Math.ceil(P.hp)} / ${P.maxHp}`;
  $('mag').textContent = P.reloadT > 0 ? '··' : P.ammo;
  for (const [slot, key] of [['q', 'Q'], ['ability', 'E']]) {
    const left = P.cd[slot];
    $('cd' + key).style.transform = `scaleX(${Math.min(1, left / P.def[slot].cd)})`;
    $('ab' + key).querySelector('i').textContent = left > 0 ? Math.ceil(left) : '';
    $('ab' + key).classList.toggle('ready', left <= 0);
    P._cdWas ??= {};
    if (left <= 0 && P._cdWas[slot] > 0.5 && P.alive) readyPing(P.def[slot].name);
    P._cdWas[slot] = left;
  }
  // reload ring around the crosshair
  const rr = $('reloadRing');
  rr.style.opacity = P.reloadT > 0 ? 1 : 0;
  if (P.reloadT > 0) rr.firstElementChild.style.strokeDashoffset = (100.5 * P.reloadT / w.reload).toFixed(1);
  // low health: pulsing vignette and a heartbeat
  const low = P.alive && P.hp / P.maxHp < 0.3;
  $('hud').classList.toggle('lowhp', low);
  if (low && (beatT -= dt) <= 0) { beatT = 0.95; tone(60, 0.12, 'sine', 0.14, 0.7); tone(55, 0.12, 'sine', 0.1, 0.7, 0.16); }
  const ult = Math.floor(P.ult);
  $('cdF').style.transform = `scaleY(${1 - P.ult / 100})`;
  $('abF').querySelector('i').textContent = ult >= 100 ? 'READY' : ult + '%';
  $('abF').classList.toggle('ready', ult >= 100);
  if (ult >= 100 && !ultWasReady) { tone(660, 0.2, 'triangle', 0.07, 1.5); banner('Ultimate ready', hex(P.def.color), `Press F for ${P.def.ult.name}`); }
  ultWasReady = ult >= 100;
  const st = [];
  if (P.stunT > 0) st.push('Stunned'); if (P.rootT > 0) st.push('Rooted');
  if (P.slowT > 0 || P.zoneSlow < 1) st.push('Slowed'); if (P.markT > 0) st.push('Marked');
  if (P.hasteT > 0) st.push('Haste'); if (P.invisT > 0) st.push('Invisible'); if (P.barrierT > 0 || P.zoneMult < 1) st.push('Shielded');
  if (P.lurkT > 0) st.push('Lurking'); if (P.rallyT > 0) st.push('Rallied +30% dmg'); if (P.jamT > 0) st.push('Jammed'); if (P.rushT > 0) st.push('Rush Hour');
  $('status').textContent = st.join(' · ');
  $('hud').classList.toggle('invis', P.invisT > 0);
  const t = Math.floor(G.mode === 'lane' ? Math.max(0, TUNING.laneLimit - G.time) : G.time);
  $('clock').firstChild.textContent = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
  if (G.mode === 'survivor') updateSurvHud(); else if (G.mode === 'hill') updateHillHud(); else if (G.mode === 'duel') updateDuelHud(dt); else {
    $('kB').textContent = G.score.blue; $('kR').textContent = G.score.red;
    const core = t => G.structures.find(s => s.kind === 'core' && s.team === t);
    $('coreB').style.width = (100 * core('blue').hp / core('blue').maxHp) + '%';
    $('coreR').style.width = (100 * core('red').hp / core('red').maxHp) + '%';
    $('wave').textContent = `minions in ${Math.ceil(G.waveT)}`;
  }
  const ch = chargeLevel(G, P);
  $("charge").style.opacity = P.chargeStart != null ? 1 : 0;
  $("charge").style.setProperty("--c", (ch * 100).toFixed(0) + "%");
  $("charge").classList.toggle("full", ch >= 1);
  hitT = Math.max(0, hitT - dt);
  const hk = hitT / hitMax;
  $('hit').style.opacity = hitT > 0 ? Math.min(1, hk * 3).toFixed(2) : 0;
  $('hit').style.transform = `scale(${(1 + (hitKind === 'kill' ? 0.9 : 0.5) * hk * hk).toFixed(3)})${hitKind === 'kill' ? ` rotate(${(hk * 20).toFixed(1)}deg)` : ''}`;
  tally.t -= dt; tally.pop = Math.max(0, tally.pop - dt * 7); tally.head = Math.max(0, tally.head - dt);
  if (tally.t <= 0) tally.v = 0;
  const tl = $('tally');
  tl.style.opacity = tally.v >= 1 ? Math.min(1, tally.t * 2.5).toFixed(2) : 0;
  if (tally.v >= 1) {
    tl.innerHTML = Math.round(tally.v) + (tally.head > 0 ? '<small>HEAD</small>' : '');
    tl.classList.toggle('head', tally.head > 0);
    tl.style.transform = `scale(${(1 + tally.pop * 0.35).toFixed(3)})`;
  }
  hurt = Math.max(0, hurt - dt * 1.5);
  $('vign').style.boxShadow = `inset 0 0 160px rgba(255,60,40,${(hurt * 0.7 + (P.hp / P.maxHp < 0.3 ? 0.25 : 0)).toFixed(2)})`;
  bannerT -= dt; if (bannerT <= 0) $('banner').style.opacity = 0;
  voiceT -= dt; if (voiceT <= 0) $("voice").style.opacity = 0;
  drawMinimap();
  void w;
}

const mini = $('mini'), mctx = mini.getContext('2d');
function drawMinimap() {
  const m = G.map, W = mini.width, H = mini.height, pad = 10;
  const sx = (W - pad * 2) / (m.W * 2), sz = (H - pad * 2) / (m.L * 2), s = Math.min(sx, sz);
  const X = x => W / 2 - x * s, Y = z => H / 2 - z * s;
  mctx.clearRect(0, 0, W, H);
  mctx.fillStyle = '#efe5d2'; mctx.fillRect(X(m.W), Y(m.L), m.W * 2 * s, m.L * 2 * s);
  mctx.strokeStyle = hex(m.accent); mctx.lineWidth = 4; mctx.globalAlpha = 0.6;
  for (const lane of m.lanes) { mctx.beginPath(); lane.forEach(([x, z], i) => i ? mctx.lineTo(X(x), Y(z)) : mctx.moveTo(X(x), Y(z))); mctx.stroke(); }
  mctx.globalAlpha = 1; mctx.fillStyle = '#c9b996';
  for (const [x, z, w, d] of mirror(m.blocks)) mctx.fillRect(X(x + w / 2), Y(z + d / 2), w * s, d * s);
  for (const st of G.structures) {
    mctx.fillStyle = st.alive ? hex(TEAM_COLOR[st.team]) : '#b8ab90';
    const r = st.kind === 'core' ? 6 : 4;
    mctx.fillRect(X(st.pos.x) - r, Y(st.pos.z) - r, r * 2, r * 2);
  }
  for (const mn of G.minions) { mctx.fillStyle = hex(TEAM_COLOR[mn.team]); mctx.fillRect(X(mn.pos.x) - 1.5, Y(mn.pos.z) - 1.5, 3, 3); }
  if (G.mode === 'hill') {                          // the ring, tinted by who's scoring
    const H = G.hill, holder = !H.contested && (H.count.blue ? 'blue' : H.count.red ? 'red' : null);
    mctx.fillStyle = H.contested ? 'rgba(255,201,60,.75)' : holder ? hex(TEAM_COLOR[holder]) + 'aa' : 'rgba(255,201,60,.4)';
    mctx.strokeStyle = '#1d2340'; mctx.lineWidth = 2;
    mctx.beginPath(); mctx.arc(X(H.pos.x), Y(H.pos.z), Math.max(4, H.r * s), 0, 7); mctx.fill(); mctx.stroke();
  }
  if (G.mode === 'survivor') {                      // current storm edge + next safe circle
    const st = G.storm;
    mctx.fillStyle = 'rgba(155,92,255,.28)'; mctx.beginPath(); mctx.rect(0, 0, W, H); mctx.arc(X(st.cx), Y(st.cz), Math.max(0, st.r) * s, 0, 7, true); mctx.fill();
    mctx.strokeStyle = '#9b5cff'; mctx.lineWidth = 2; mctx.beginPath(); mctx.arc(X(st.cx), Y(st.cz), Math.max(0, st.r) * s, 0, 7); mctx.stroke();
    mctx.strokeStyle = '#fff'; mctx.setLineDash([4, 3]); mctx.beginPath(); mctx.arc(X(st.to.cx), Y(st.to.cz), Math.max(0.5, st.to.r) * s, 0, 7); mctx.stroke(); mctx.setLineDash([]);
    for (const l of G.loot) if (l.alive && Math.hypot(l.pos.x - P.pos.x, l.pos.z - P.pos.z) < 30) { mctx.fillStyle = hex(l.type.color); mctx.fillRect(X(l.pos.x) - 1.5, Y(l.pos.z) - 1.5, 3, 3); }
  }
  const allies = G.heroes.filter(h => h.team === G.playerTeam && h.alive);
  for (const h of G.heroes) {
    if (!h.alive || h === P) continue;
    if (h.team !== G.playerTeam && !allies.some(a => a.pos.distanceTo(h.pos) < (G.mode === 'survivor' ? 26 : 32))) continue;
    mctx.fillStyle = hex(TEAM_COLOR[h.team]); mctx.strokeStyle = '#1d2340'; mctx.lineWidth = 1.5;
    mctx.beginPath(); mctx.arc(X(h.pos.x), Y(h.pos.z), 4, 0, 7); mctx.fill(); mctx.stroke();
  }
  if (P.alive) {
    const px = X(P.pos.x), pz = Y(P.pos.z), a = P.yaw;
    mctx.save(); mctx.translate(px, pz); mctx.rotate(-a + Math.PI);
    mctx.fillStyle = '#ffc93c'; mctx.strokeStyle = '#1d2340'; mctx.lineWidth = 1.5;
    mctx.beginPath(); mctx.moveTo(0, -7); mctx.lineTo(5, 5); mctx.lineTo(-5, 5); mctx.closePath(); mctx.fill(); mctx.stroke();
    mctx.restore();
  }
}

const clock = new THREE.Clock();
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, clock.getDelta());
  perfFrame(renderer, G?.net ? `online · ${G.heroes.length} players` : G ? `${G.heroes.length} heroes · ${G.minions.length} minions` : "menu");
  if (!G) { if (!menuFrame(renderer, dt)) renderer.clear(); return; }
  // online matches can't pause: the sim keeps running behind the pause sheet
  const live = running && (!paused || !!G.net);
  if (live) {
    G.time += dt;
    G.waveT -= dt;
    if (G.waveT <= 0) { G.waveT = TUNING.waveEvery; spawnWave(); }
    if (G.mode === 'lane' && !G.over && !G.tutorial) laneClock();
    if (G.tutorial && !G.over && tickTutorial(G, { dt, sprinting: sprintA > 0.6 }) === 'done') { G.over = true; banner('Training complete', 'var(--blue)', 'Nicely done'); setTimeout(() => endGame(true), 2200); }
    updateAbilities(G, dt);
    updatePlayer(dt);
    for (const h of G.heroes) {
      if (h === P) continue;
      if (G.net && !h.local) { tickPuppet(G, h, dt, camera); continue; }
      if (!h.alive) { tickCorpse(G, h, dt); if (G.mode === "survivor") continue; h.respawnT -= dt; if (h.respawnT <= 0) { spawnHero(G, h); if (h.ai) { h.ai.wp = 0; h.ai.retreat = false; } } continue; }
      if (h.dummy) { tickHero(G, h, dt); continue; }                    // training dummies just stand there
      updateBot(G, h, dt, G.D);
      tickHero(G, h, dt);
    }
    updateMinions(G, dt);
    updateStructures(G, dt);
    updateProjectiles(G, dt);
    if (G.mode === 'survivor') updateSurvivor(G, dt);
    if (G.mode === 'hill') { if (G.net && !G.net.host) hillVisuals(G, dt); else updateHill(G, dt); }
    G.net?.tick(dt);
    tickFlash(dt);
    updateHud(dt);
  }
  if (live) G.worldTick(dt, G.time);
  updateFx(G, live ? dt : 0, camera);
  renderer.render(G.scene, camera);
}
loop();

// ---------- Hill Rush HUD ----------
function updateHillHud() {
  const H = G.hill, p = H.pts2;
  $('kB').textContent = Math.floor(p.blue); $('kR').textContent = Math.floor(p.red);
  $('coreB').style.width = (100 * p.blue / HILL.target) + '%';
  $('coreR').style.width = (100 * p.red / HILL.target) + '%';
  $('wave').textContent = H.contested ? 'contested!' : `hill moves in ${Math.ceil(H.moveT)}`;
  const tag = $('hillTag'), on = onHill(G, P);
  const us = G.playerTeam, them = us === 'blue' ? 'red' : 'blue';
  const enemyHolds = !H.contested && H.count[them] > 0;
  tag.className = H.contested ? 'contest' : on ? 'on' : enemyHolds ? 'lost' : '';
  tag.textContent = H.contested ? (on ? 'Contested · clear them out' : 'Hill contested') : on ? `Capturing · ${H.count[us]} on the hill`
    : enemyHolds ? 'Enemy holding the hill' : H.count[us] ? 'Allies holding the hill' : `Hill · ${Math.round(Math.hypot(P.pos.x - H.pos.x, P.pos.z - H.pos.z))}m`;
}

// ---------- Survivor HUD ----------
function updateSurvHud() {
  $('sAlive').textContent = G.aliveCount;
  $('sKills').textContent = P.kills;
  const si = stormInfo(G);
  const t = Math.ceil(si.t);
  $('sStorm').textContent = si.t > 0 ? `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}` : '—';
  $('sStormL').textContent = si.label;
  $('surv').classList.toggle('closing', G.storm.state === 'shrink');
  $('arBar').style.width = (P.armor || 0) + '%';
  $('armorRow').style.display = P.armor > 0 ? '' : 'none';
  $('pow').textContent = P.power ? '★'.repeat(P.power) + ` +${P.power * 15}% dmg` : '';
  const out = P.alive && !P.glide && inStorm(G, P.pos);
  $('stormVign').style.opacity = out ? 0.85 + Math.sin(G.time * 6) * 0.15 : 0;
  if (out && !stormWarned) { banner('You\'re in the storm!', '#9b5cff', 'Get to the safe zone'); stormWarned = true; }
  if (!out) stormWarned = false;
  $('glideTip').style.opacity = P.glide ? 1 : 0;
}
let stormWarned = false;

// ---------- Duel ----------
// The host (or the only machine, offline) calls each round; everyone else follows its events.
function duelKnockout(t, src) {
  const D = G.duel;
  if (D.state !== 'fight' || G.over) return;
  const w = src && src.kind === 'hero' && src.team !== t.team ? src.team : t.team === 'blue' ? 'red' : 'blue';
  const pts = { ...D.pts, [w]: D.pts[w] + 1 };
  const e = { k: 'round', w, b: pts.blue, r: pts.red, n: D.round + 1, end: pts[w] >= DUEL.toWin ? 1 : 0 };
  G.net?.queue(e); applyDuel(e);
  if (!e.end) G.timers.push({ t: DUEL.breakT, fn: () => { const s = { k: 'rstart', n: e.n }; G.net?.queue(s); applyDuel(s); } });
}
function applyDuel(e) {
  const D = G?.duel;
  if (!D || G.over) return;
  if (e.k === 'round') {
    D.pts = { blue: e.b, red: e.r }; D.state = 'break'; D.breakT = DUEL.breakT;
    const ours = e.w === G.playerTeam, col = ours ? 'var(--blue)' : 'var(--red)';
    if (e.end) {
      G.over = true;
      banner(ours ? 'Duel won!' : 'Duel lost', col, `Rounds ${e.b} – ${e.r}`);
      tone(ours ? 520 : 180, 0.5, 'triangle', 0.09, ours ? 2 : 0.6);
      setTimeout(() => endGame(ours), 1800);
    } else {
      banner(ours ? 'Round won' : 'Round lost', col, `Blue ${e.b} – ${e.r} Red`);
      tone(ours ? 660 : 220, 0.3, 'triangle', 0.07, ours ? 1.5 : 0.7);
    }
  } else {
    // new round: clear the field and put our own heroes back on their marks
    D.round = e.n; D.state = 'fight';
    for (const z of G.zones) G.scene.remove(z.g); G.zones.length = 0;
    for (const p of G.projectiles) G.scene.remove(p.mesh); G.projectiles.length = 0;
    for (const h of G.heroes) if (!G.net || h.local) { spawnHero(G, h); h.chargeStart = null; if (h.ai) h.ai.wp = 0; }
    const last = D.pts.blue === DUEL.toWin - 1 && D.pts.red === DUEL.toWin - 1;
    banner(`Round ${e.n}`, '#1d2340', last ? 'Final round!' : 'Fight!');
    tone(440, 0.15, 'square', 0.06, 1); setTimeout(() => tone(880, 0.25, 'square', 0.06, 1), 180);
  }
}
function updateDuelHud(dt) {
  const D = G.duel;
  $('kB').textContent = D.pts.blue; $('kR').textContent = D.pts.red;
  $('coreB').style.width = (100 * D.pts.blue / DUEL.toWin) + '%';
  $('coreR').style.width = (100 * D.pts.red / DUEL.toWin) + '%';
  if (D.state === 'break') D.breakT = Math.max(0, D.breakT - dt);
  $('wave').textContent = G.over ? 'duel over' : D.state === 'fight' ? `round ${D.round}` : `next round in ${Math.ceil(D.breakT)}`;
}
