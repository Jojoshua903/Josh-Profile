import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { initAccount } from './account.js?v=20261129f';      // first, so it sees every change to the save
import { HEROES, MAPS, DIFFICULTY, TUNING, SURVIVOR_MAP, SURVIVOR, HILL, DUEL, CART } from './data.js?v=20261129f';
import { initSurvivor, updateSurvivor, survivorLeaders, stormInfo, inStorm } from './survivor.js?v=20261129f';
import { initHill, updateHill, hillVisuals, onHill } from './hill.js?v=20261129f';
import { initCart, updateCart, nearCart, cartLead } from './payload.js?v=20261129f';
import { initPotato, updatePotato, potatoHit, holdsPotato, POTATO } from './potato.js?v=20261129f';
import { initBall, updateBall, BALL } from './ball.js?v=20261129f';
import { addPlayerXp, storyXp } from './level.js?v=20261129f';
import { initGuardians, updateGuardians, netGuardSlam, guardianOf } from './guardian.js?v=20261129f';
import { initMapFx, updateMapFx } from './mapfx.js?v=20261129f';
import { MISSIONS, initStory, updateStory, storyInfo, finishMission, GOAL, awardMedal, MEDALS, MEDAL_ICON, fmtTime, storyClears } from './story.js?v=20261129f';
import { initRaid, updateRaid, raidInfo, raidAlert, RAID } from './raid.js?v=20261129f';
import { buildWorld, mirror, hasLOS } from './world.js?v=20261129f';
import { PRISM, createHero, spawnHero, createStructure, spawnMinion, fire, releaseFire, chargeLevel, startReload, tickHero, tickCorpse, chestOf,
  updateMinions, updateStructures, updateProjectiles, updateFx, dirFrom, eyeOf, TEAM_COLOR } from './units.js?v=20261129f';
import { steer, initBot, updateBot } from './botbrain.js?v=20261129f';
import { castSlot, updateAbilities } from './abilities.js?v=20261129f';
import { floatText, poseHero } from './anim.js?v=20261129f';
import { cfg, applyGraphics } from './settings.js?v=20261129f';
import { initMenu, showMenu, menuFrame, openSettings, settingsVisible } from './menu.js?v=20261129f';
import { dressed, heroOwned, wear, myCosIds, resolveCos, matchXp, award, rewardInfo, tierProgress, SEASON, MAX_TIER, cosById, cosOwned, equippedCos, skinById } from './pass.js?v=20261129f';
import { aimSpray, placeSpray, SPRAY_CD } from './sprays.js?v=20261129f';
import { EMOTES, EMOTE_CD, BOT_EMOTES, startEmote, stopEmote, wheelEmotes } from './emotes.js?v=20261129f';
import { headshot } from './portraits.js?v=20261129f';
import './personality.js?v=20261129f';
import { openSession, tickPuppet, myUid, lobbyState, leaveRoom, onLobby } from './net.js?v=20261129f';
import { initAudio, applyVolume, tone, noise, ABIL_SFX, audioTap } from './audio.js?v=20261129f';
import { startClipRec, saveClip, sendClip } from './clips.js?v=20261129f';
import { playMusic } from './music.js?v=20261129f';
import { sparks, castFx, lightFlash } from './vfx.js?v=20261129f';
import { castCue, clearCastCue } from './castcue.js?v=20261129f';
import { applyEnvironment, canNight } from './stage.js?v=20261129f';
import { perfFrame } from './perf.js?v=20261129f';
import { gainMastery } from './mastery.js?v=20261129f';
import { recordMatch, tasksDone } from './contracts.js?v=20261129f';
import { recordDaily } from './daily.js?v=20261129f';
import { kb, keyOf, padGlyph } from './keys.js?v=20261129f';
import { initPad, padFrame, pad, padMode, rumble } from './pad.js?v=20261129f';
import { recordHistory } from './history.js?v=20261129f';
import { hitStop, timeScale, shotBloom, crossScale, landDust, resetJuice, juiceFrame, killIcon } from './juice.js?v=20261129f';
import { updateOutlines } from './outline.js?v=20261129f';
import { applyCrosshair } from './crosshair.js?v=20261129f';
import { victoryOf, poseVictory } from './victory.js?v=20261129f';
import { publishCard } from './social.js?v=20261129f';
import { startTutorial, stopTutorial, tickTutorial, tutorialCast, tutorialKill, onTutorialPass } from './tutorial.js?v=20261129f';
import { initReplay, recFrame, recEvent, recKill, finalClip, startPlayback, tickPlayback, stopPlayback } from './replay.js?v=20261129f';
import { startKillCam, tickKillCam, endKillCam, killCamRender } from './killcam.js?v=20261129f';
import { feat, bumpAndCheck, endMatch as achEndMatch, setStory, onAchievement } from './achieve.js?v=20261129f';
import { ranked as rankedState, recordRanked, botSkill, botDiffKey } from './ranked.js?v=20261129f';
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
applyCrosshair($("cross"));
initMenu({
  onStart: m => startGame(m),
  onRanked: s => { rankedNext = s; startGame(s.mode); },
  onStartOnline: m => startGame('hill', m),
  onPractice: id => { practiceId = id; startGame('practice'); },
  blip: f => { initAudio(); tone(f, 0.06, 'triangle', 0.05, 1.3); },
  onSettings(key) {
    if (key === 'quality' || key === 'shadows') applyGraphics(renderer, G?.scene);
    if (key === 'fov') { camera.fov = cfg.fov; camera.updateProjectionMatrix(); }
    if (key.startsWith('xh')) applyCrosshair($('cross'));
    if (key === 'volume' || key === 'music' || key === 'sfx') { applyVolume(); if (key !== 'music') tone(660, 0.08, 'triangle', 0.08, 1); }
  },
  onSettingsClosed() { if (running && paused) $('pause').classList.remove('hidden'); },
});
document.querySelectorAll('#pause [data-open-settings]').forEach(b => { b.onclick = () => { $('pause').classList.add('hidden'); openSettings(); }; });


// ---------- audio (effects in audio.js, soundtrack in music.js) ----------
playMusic('menu');
initAccount();                                      // signed in? pull a newer save from the account
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
  slime: v => { noise(0.12, 0.08 * v, 500, 0, { type: 'lowpass', to: 200 }); tone(260, 0.12, 'sine', 0.07 * v, 0.5); },
  brawler: v => { noise(0.08, 0.14 * v, 900); tone(120, 0.08, 'sine', 0.1 * v, 0.6); },
  chipmunk: v => { tone(640, 0.04, 'square', 0.03 * v, 0.6); noise(0.03, 0.05 * v, 2600); },
  elf: v => { noise(0.06, 0.06 * v, 3200, 0, { type: 'bandpass', to: 1200, q: 3 }); tone(220, 0.09, 'triangle', 0.06 * v, 0.6); },
  dancer: v => { noise(0.14, 0.05 * v, 2400, 0, { type: 'bandpass', to: 5200, q: 2 }); tone(1046, 0.08, 'sine', 0.025 * v, 1.2); },
  mole: v => { noise(0.16, 0.12 * v, 700); for (let i = 0; i < 3; i++) tone(900 + i * 220, 0.03, 'square', 0.02 * v, 0.8, 0.04 + i * 0.03); },
  medic: v => { noise(0.04, 0.06 * v, 3800, 0, { type: 'bandpass', to: 2400, q: 2 }); tone(880, 0.06, 'sine', 0.03 * v, 1.4); },
  spark: v => { noise(0.05, 0.05 * v, 5000); tone(1200 + Math.random() * 400, 0.04, 'square', 0.02 * v, 0.5); },
  builder: v => { tone(140, 0.12, 'sine', 0.08 * v, 0.6); noise(0.1, 0.1 * v, 700); },
  wellington: v => { noise(0.12, 0.08 * v, 500, 0, { type: 'lowpass', to: 250 }); tone(330, 0.1, 'sine', 0.05 * v, 0.6); },
  shepherd: v => { noise(0.1, 0.06 * v, 2200, 0, { type: 'bandpass', to: 700, q: 2 }); tone(260, 0.06, 'triangle', 0.04 * v, 0.7); },
  microwave: v => { tone(120, 0.08, 'sawtooth', 0.025 * v, 1); if (Math.random() < 0.25) tone(1568, 0.25, 'sine', 0.04 * v, 1, 0.02); },
  chef: v => { noise(0.3, 0.16 * v, 900, 0, { type: 'lowpass', to: 200 }); tone(70, 0.25, 'sine', 0.1 * v, 0.5); },
  manspider: v => { noise(0.07, 0.07 * v, 4200, 0, { type: 'bandpass', to: 2400, q: 3 }); tone(1400, 0.04, 'sine', 0.02 * v, 0.6); },
  pinball: v => { tone(880, 0.05, "square", 0.03 * v, 1.6); tone(1320, 0.06, "square", 0.02 * v, 1.2, 0.03); },
  clawbot: v => { noise(0.1, 0.08 * v, 1400, 0, { type: "bandpass", to: 600, q: 2 }); tone(220, 0.1, "sawtooth", 0.03 * v, 0.6); },
  pixel: v => { tone(660, 0.04, "square", 0.03 * v, 1); tone(990, 0.05, "square", 0.025 * v, 1, 0.04); },
  owl: v => { noise(0.05, 0.08 * v, 5200, 0, { type: "highpass", to: 3000 }); noise(0.05, 0.06 * v, 4600, 0.05, { type: "highpass", to: 2800 }); },
  magnet: v => { tone(220, 0.05, "sawtooth", 0.03 * v, 2.2); tone(880, 0.06, "square", 0.015 * v, 0.6, 0.02); },
  swapper: v => { tone(1046, 0.05, "triangle", 0.03 * v, 1.8); tone(1568, 0.08, "sine", 0.02 * v, 0.6, 0.03); },
  hippo: v => { noise(0.07, 0.05 * v, 1800, 0, { type: "bandpass", to: 900 }); },
  unicorn: v => { tone(1568, 0.06, "triangle", 0.03 * v, 1.5); tone(2093, 0.07, "sine", 0.02 * v, 1.3, 0.03); },
};

// ---------- game state ----------
let G = null, P = null, running = false, paused = false;
const keys = new Set();
let mouseDown = false, recoil = 0, bob = 0, viewGun = null, hurt = 0, immuneTipT = 0, bannerT = 0, hillBannerT = 0;
let zoomDown = false, zoomA = 0;                       // right mouse button: zoom in to aim
let shake = 0, landA = 0, sprintA = 0, wasGround = true, fallV = 0, ultWasReady = false, viewHand = null;

// First-person gun, shaped per hero, plus an off-hand that rises when casting.
const VIEW = {
  vanguard: { len: 0.55, w: 0.12, barrel: 0.03 }, striker: { len: 0.36, w: 0.1, barrel: 0.025, mag: true },
  ember: { len: 0.55, w: 0.13, barrel: 0.08, copper: true }, warden: { len: 0.85, w: 0.1, barrel: 0.025, rings: true },
  thicket: { len: 0.45, w: 0.16, barrel: 0.05, twin: true }, ratchet: { len: 0.45, w: 0.13, barrel: 0.035, drum: true },
  mirage: { len: 0.32, w: 0.08, barrel: 0.02, cards: true }, avalanche: { len: 0.6, w: 0.17, barrel: 0.1, hopper: true },
  tempo: { len: 0.42, w: 0.16, barrel: 0.05, horn: true }, kestrel: { len: 0.52, w: 0.09, barrel: 0.02, bow: true },
  croc: { len: 0.42, w: 0.17, barrel: 0.09, hopper: true }, cavalier: { len: 0.62, w: 0.08, barrel: 0.025 },
  slime: { len: 0.38, w: 0.15, barrel: 0.06, goo: true }, brawler: { len: 0.16, w: 0.18, barrel: 0.001, glove: true }, chipmunk: { len: 0.5, w: 0.17, barrel: 0.06, drum: true },
  elf: { len: 0.5, w: 0.05, barrel: 0.012, longbow: true }, dancer: { len: 0.28, w: 0.035, barrel: 0.008, ribbon: true }, mole: { len: 0.55, w: 0.06, barrel: 0.02, shovel: true },
  medic: { len: 0.55, w: 0.08, barrel: 0.02, vial: true }, spark: { len: 0.3, w: 0.1, barrel: 0.03, clamps: true }, builder: { len: 0.5, w: 0.16, barrel: 0.07, bricks: true },
  wellington: { len: 0.26, w: 0.14, barrel: 0.03, gravy: true }, shepherd: { len: 0.2, w: 0.06, barrel: 0.01, sling: true }, microwave: { len: 0.3, w: 0.1, barrel: 0.04, dish: true },
  chef: { len: 0.75, w: 0.2, barrel: 0.12, copper: true }, manspider: { len: 0.3, w: 0.1, barrel: 0.03, vial: true },
  swapper: { len: 0.5, w: 0.035, barrel: 0.01 }, pinball: { len: 0.4, w: 0.14, barrel: 0.06 }, clawbot: { len: 0.45, w: 0.16, barrel: 0.04, clamps: true }, pixel: { len: 0.6, w: 0.07, barrel: 0.02 }, owl: { len: 0.5, w: 0.09, barrel: 0.02 }, unicorn: { len: 0.4, w: 0.08, barrel: 0.03 }, magnet: { len: 0.42, w: 0.14, barrel: 0.04 }, hippo: { len: 0.5, w: 0.16, barrel: 0.08, copper: true },
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
  if (v.glove) { add(new THREE.SphereGeometry(0.17, 18, 12), trim, 0, 0.02, bz + 0.12).scale.set(1, 0.9, 1.2); add(new THREE.SphereGeometry(0.07, 10, 8), trim, -0.14, 0.05, bz + 0.16); }
  if (v.goo) add(new THREE.SphereGeometry(0.09, 12, 10), new THREE.MeshStandardMaterial({ color: p.main, emissive: p.main, emissiveIntensity: 0.5, roughness: 0.05 }), 0, 0.1, 0.02);
  if (v.bow) for (const s of [-1, 1]) { const b = add(new THREE.BoxGeometry(0.3, 0.025, 0.03), trim, s * 0.15, 0.02, bz + 0.06); b.rotation.y = s * 0.4; }
  if (v.longbow) { const b = add(new THREE.TorusGeometry(0.34, 0.016, 6, 24, Math.PI * 0.8), L(0x8a5a3a), 0, 0.02, bz + 0.08); b.rotation.set(0, Math.PI / 2, Math.PI / 2 + Math.PI * 0.1); }
  if (v.ribbon) for (let i = 0; i < 6; i++) { const r = add(new THREE.BoxGeometry(0.06, 0.008, 0.12), L(i % 2 ? 0xffffff : def.color), Math.sin(i) * 0.04, 0.02 + i * 0.03, bz - 0.05 - i * 0.07); r.rotation.set(0.3, i * 0.4, 0.2); }
  if (v.shovel) { const s = add(new THREE.BoxGeometry(0.22, 0.025, 0.24), L(0xb8c0cc), 0, 0.01, bz - 0.02); s.rotation.x = -0.3; for (let i = 0; i < 3; i++) add(new THREE.SphereGeometry(0.03, 6, 4), L(0x9a8a72), (i - 1) * 0.06, 0.04, bz - 0.02); }
  if (v.vial) { add(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 10), new THREE.MeshStandardMaterial({ color: 0x7affc0, emissive: 0x7affc0, emissiveIntensity: 0.8 }), 0, 0.1, -0.05).rotation.x = Math.PI / 2; add(new THREE.BoxGeometry(0.06, 0.015, 0.015), L(p.trim), 0, 0.075, 0.12); add(new THREE.BoxGeometry(0.015, 0.06, 0.015), L(p.trim), 0, 0.075, 0.12); }
  if (v.clamps) { for (const s of [-1, 1]) { const j = add(new THREE.BoxGeometry(0.035, 0.05, 0.16), L(s < 0 ? 0xff4f6b : 0x1d1d24), s * 0.04, 0, bz - 0.06); j.rotation.y = s * 0.15; } add(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: 0x7af0ff }), 0, 0, bz - 0.17); }
  if (v.bricks) for (let i = 0; i < 3; i++) add(new THREE.BoxGeometry(0.15, 0.06, 0.09), L([0xd9733a, 0xc8642e, 0xe0844a][i]), 0, 0.1 + i * 0.065, 0.05 - i * 0.02);
  if (v.gravy) { add(new THREE.SphereGeometry(0.11, 14, 10), L(0xffffff), 0, 0.03, bz + 0.1).scale.set(1, 0.6, 1.7); add(new THREE.CylinderGeometry(0.09, 0.09, 0.02, 14), L(0x6a3a1a), 0, 0.08, bz + 0.1).scale.set(1, 1, 1.6); }
  if (v.sling) { for (const s of [-1, 1]) add(new THREE.CylinderGeometry(0.005, 0.005, 0.3, 4), L(0xd8c8a0), s * 0.025, -0.12, bz + 0.1); add(new THREE.SphereGeometry(0.05, 8, 6), L(0x6b4a33), 0, -0.28, bz + 0.1).scale.set(1.2, 0.7, 1); }
  if (v.dish) { add(new THREE.ConeGeometry(0.13, 0.11, 16), L(p.main), 0, 0, bz - 0.04).rotation.x = -Math.PI / 2; add(new THREE.SphereGeometry(0.045, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffd27a }), 0, 0, bz - 0.1); }
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

let mode = 'lane', practiceId = null;              // practice: a solo run through one hero's kit against dummies
// Lane Breaker bases: each side's towers and core, always built in the same order (online keys rely on it)
function buildBases(G, map) {
  for (const [team, s] of [['blue', 1], ['red', -1]]) {
    for (const [x, z] of map.towers) createStructure(G, 'tower', team, x * s, z * s);
    createStructure(G, 'core', team, 0, -s * (map.L - 11));
  }
  if (G.mode === 'lane') initGuardians(G);                       // a stone Guardian stands over each spawn
}
let rankedNext = null;                                  // the drafted teams for the next ranked match (rankedui.js)
function startGame(m = mode, online = null) {
  dropClip();
  if (online) m = online.mode === 'duel' || online.mode === 'lane' ? online.mode : 'hill';
  const uid = online && myUid(), mine = online && online.roster.find(r => r.uid === uid);
  if (online && !mine) { showMenu('online'); return; }            // no slot for us in this match
  // online starts arrive from the server, not a menu click, so close the lobby here
  if (online) { $('front').classList.add('hidden'); $('end').classList.add('hidden'); }
  mode = m;
  initAudio();
  const rk = online ? null : rankedNext; rankedNext = null;           // Ranked: the mode, stage and both teams come from the draft
  const story = mode === 'story' ? MISSIONS.find(s => s.hero === cfg.storyId) || MISSIONS[0] : null;   // Story: one hero's mission
  const surv = mode === 'survivor', hill = mode === 'hill', duel = mode === 'duel', practice = mode === 'practice', tut = mode === 'tutorial' || practice, cart = mode === 'cart', potato = mode === 'potato', ball = mode === 'ball';
  let raid = mode === 'raid';                                       // the tutorial (and practice) is a Lane Breaker match on the plaza
  // online rooms send "stage@night" for the night version; offline it's the Day/Night choice on the stage screen
  const [mapId, tod] = String(tut ? 'plaza' : story ? story.map : online ? online.map : rk ? rk.map + (rk.night ? '@night' : '') : cfg.map).split('@');
  let map = surv ? SURVIVOR_MAP : MAPS.find(x => x.id === mapId) || MAPS[0];
  if (!surv && !tut && !story && (online || rk ? tod === 'night' : !!cfg.night) && canNight(map)) map = { ...map, night: true };
  playMusic(map.id);
  // practice runs can try any hero, owned or not
  let def = dressed((rk && HEROES.find(h => h.id === rk.me)) || (practice && HEROES.find(h => h.id === practiceId)) || (story && HEROES.find(h => h.id === story.hero)) || HEROES.find(h => h.id === cfg.hero && heroOwned(h.id)) || HEROES[0]);
  const scene = new THREE.Scene();
  if (G?.net) G.net.close();
  stopTutorial();
  G = { scene, map, mode: tut ? 'lane' : mode, storyM: story, ranked: rk, diffKey: rk ? botDiffKey() : cfg.diff, tutorial: tut, practice, heroes: [], minions: [], structures: [], projectiles: [], fx: [], score: { blue: 0, red: 0 },
    zones: [], walls: [], timers: [], camera,
    time: 0, waveT: surv || hill || duel || tut || cart || potato || ball || raid || story ? Infinity : TUNING.firstWave, playerTeam: online ? mine.team : 'blue', D: rk ? botSkill() : DIFFICULTY[(online && DIFFICULTY[online.diff] ? online.diff : cfg.diff)], over: false, ev: events, net: null };
  const world = buildWorld(scene, map);
  G.colliders = world.colliders; G.worldTick = world.tick;
  initMapFx(G);                                                    // gravity, jump pads and the tide, if this stage has them
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
    if (G.mode === 'lane') buildBases(G, map);                      // every machine builds the same towers and cores; the host runs them
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
    if (!hill && !cart && !potato && !ball && !raid && !story) buildBases(G, map);
    if (tut) {
      // three training dummies stand in the middle of the plaza, out of both towers' reach
      [['vanguard', -4], ['avalanche', 0], ['croc', 4]].forEach(([id, x], i) => {
        const d = HEROES.find(h => h.id === id) || HEROES[i];
        const b = createHero(G, d, 'red', 'Dummy ' + (i + 1), false); initBot(G, b, i);
        b.dummy = true; b.dummyAt = { x, z: -10 }; spawnHero(G, b);
      });
    } else if (story && !raid) {
      initStory(G, P, story);                                          // the mission makes its own enemies and allies
    } else if (rk) {
      // Ranked: the drafted teams, in pick order
      const make = (id, team, i) => { const d = HEROES.find(h => h.id === id) || HEROES[i], b = createHero(G, d, team, d.callsign, false); initBot(G, b, team === 'blue' ? i + 1 : i); };
      rk.blue.forEach((id, i) => make(id, 'blue', i));
      rk.red.forEach((id, i) => make(id, 'red', i));
    } else {
      // one shuffled pool for both teams, without your hero, so nobody appears twice in the match
      const pool = HEROES.filter(h => h.id !== def.id).sort(() => Math.random() - 0.5);
      for (let i = 0; i < 2; i++) { const d = pool.pop(), b = createHero(G, d, 'blue', d.callsign, false); initBot(G, b, i + 1); }
      if (!raid) for (let i = 0; i < 3; i++) { const d = pool.pop(), b = createHero(G, d, 'red', d.callsign, false); initBot(G, b, i); }   // a raid's only enemy is the boss
    }
    if (hill) initHill(G);
    if (cart) initCart(G);
    if (potato) initPotato(G);
    if (ball) initBall(G);
    if (raid) initRaid(G, cfg.diff, cfg.raidBoss);
  }
  $('hud').classList.toggle('surv', surv); $('coreB').classList.remove('objLow');
  $('hud').classList.toggle('hill', hill || cart || potato || ball || raid || !!story); $('hud').classList.toggle('duel', duel);
  $('lB').textContent = story && !raid ? 'Objective' : raid ? G.raid.def.name : hill ? 'Blue hill' : cart ? 'Blue push' : duel ? 'Blue rounds' : potato ? 'Blue blasts' : ball ? 'Blue goals' : 'Blue core'; $('lR').textContent = story && !raid ? (story.stages[0].time ? 'Time left' : 'Time') : raid ? 'Time left' : hill ? 'Red hill' : cart ? 'Red push' : duel ? 'Red rounds' : potato ? 'Red blasts' : ball ? 'Red goals' : 'Red core';
  survEndT = 0; hitT = 0; tally.t = 0; flashing.clear(); $('recap').classList.add('hidden'); P._log = [];
  hidePotg();
  if (!tut) { initReplay(G); G.rec.potg = !surv && !raid && !story; }           // every match records for the kill cam; team modes also get a play of the game

  camera.fov = cfg.fov; camera.updateProjectionMatrix();
  resetJuice(); clearCastCue();
  scene.add(camera);
  while (camera.children.length) camera.remove(camera.children[0]);
  const vm = makeViewGun(def); viewGun = vm.gun; viewHand = vm.hand; camera.add(viewGun, viewHand);

  $('hName').textContent = def.callsign;
  const pv = $('hPas'); pv.classList.toggle('hidden', !def.passive); pv.classList.remove('on');
  if (def.passive) { pv.querySelector('span').textContent = def.passive.name; pv.title = def.passive.desc; pv.style.setProperty('--hc', hex(def.color)); }
  for (const [slot, key] of [['q', 'Q'], ['ability', 'E'], ['ult', 'F']]) $('ab' + key).querySelector('span').textContent = def[slot].name;
  ultWasReady = false;
  $('wName').textContent = def.weapon.name; $('wName').style.color = ''; $('magMax').textContent = def.weapon.mag;
  $('feed').innerHTML = '';
  ['end', 'pause'].forEach(id => $(id).classList.add('hidden'));
  $('again').textContent = online ? 'Back to lobby' : rk ? 'Next ranked match' : 'Play again';
  $('toMenu').classList.toggle('hidden', !!online);
  applyGraphics(renderer);
  $('hud').classList.remove('hidden');
  // create the explosion light now and compile every shader up front, so the first blast
  // or ability doesn't freeze the game while materials rebuild
  lightFlash(G, new THREE.Vector3(0, -50, 0), 0xffffff, 0);
  for (const h of G.heroes) headshot(h.def);                         // the scoreboard shows portraits; draw them now, not mid-fight
  renderer.compile(G.scene, camera);
  running = true; paused = false; streak = { multi: 0, lastT: -9, life: 0 };
  if (rk) { const r = rankedState().rank; banner(`${r.icon} Ranked · ${r.label}`, '#' + r.color.toString(16).padStart(6, '0'), 'Win to climb · leaving early counts as a loss'); }
  [['abQ', 'q'], ['abE', 'ability'], ['abF', 'ult']].forEach(([el, id]) => { $(el).querySelector('b').textContent = keyOf(id); });   // your keys on the ability bar
  G.countT = tut ? 0 : COUNT_FROM; $('myEmote').className = 'hidden'; $('countdown').className = 'hidden'; $('countdown').textContent = '';
  lockMouse();
  if (surv) banner('Survive!', '#9b5cff', 'You start somewhere on the island. Loot up, stay hidden, last one standing wins.');
  else if (duel) { const n = G.heroes.filter(h => h.team === 'blue').length; banner(n > 1 ? `Duel · ${n}v${n}` : 'Duel!', '#1d2340', `${map.name} · first to ${DUEL.toWin} rounds${n > 1 ? ' · knock out the whole team' : ''}`); }
  else if (cart) banner('Push the cart', '#3ccf9a', `${map.name} · get it to their flag`);
  else if (potato) banner('Hot Potato', '#ff5a2a', `Hit an enemy to pass the bomb · first to ${POTATO.toWin} blasts`);
  else if (ball) banner('Smash Ball', '#3ccf9a', `Shoot or run the ball into their goal · first to ${BALL.toWin}`);
  else if (hill) banner('Take the hill', '#e0a100', `${map.name} · first to ${HILL.target}${online ? ' · online' : ''}`);
  else if (tut) { banner(practice ? `Practice · ${def.callsign}` : 'Training', '#1d2340', 'Follow the checklist on the left'); startTutorial(P, practice); onTutorialPass(() => { tone(880, 0.1, 'triangle', 0.06, 1.3); tone(1320, 0.14, 'triangle', 0.05, 1, 0.08); }); }
  else if (story) banner(story.title, '#1d2340', `Part 1 · ${GOAL[story.stages[0].type](story.stages[0])}`);
  else if (raid) banner(G.raid.def.name, 'var(--red)', `${G.raid.def.title} · beat it in 5 minutes`);
  else banner(`Break the ${map.lanes.length > 1 ? 'lanes' : 'lane'}`, '#1d2340', map.name);
  say(P, 'spawn');
  // a hello between friends on the same team, a moment after the match starts
  { const g = G; setTimeout(() => {
    if (G !== g || !running) return;
    const mate = G.heroes.find(h => h !== P && h.team === P.team && (P.def.friends?.[h.def.id] || h.def.friends?.[P.def.id]));
    if (!mate) return;
    if (P.def.friends?.[mate.def.id]) sayLine(P, P.def.friends[mate.def.id]); else sayLine(mate, mate.def.friends[P.def.id]);
  }, 3200); }
}

let survEndT = 0;
// End the match after a short beat for the banner, unless the player has already left it.
function endLater(win, ms) { const g = G; setTimeout(() => { if (G && G === g) endGame(win); }, ms); }
const END_MODE = { lane: 'Lane Breaker', hill: 'Hill Rush', cart: 'Payload', potato: 'Hot Potato', ball: 'Smash Ball', survivor: 'Survivor', duel: 'Duel', raid: 'Boss Raid' };
function endGame(win) {
  if (!G || G.ended) return;
  if (G.victory) return;                                // the pose finishes first
  if (win && !G.tutorial && !G.victoryDone && victoryOf(P.def.id)) { startVictory(); return; }
  G.over = true;
  G.net?.flush?.();                                     // online: get the last update out before this machine stops sending
  G.ended = true; running = false; paused = false;
  document.exitPointerLock();
  $('pause').classList.add('hidden'); $('scoreboard').classList.add('hidden');
  if (G.tutorial) {
    $('endTitle').innerHTML = G.practice ? `Practice complete<small>${P.def.callsign}’s kit, start to finish</small>` : 'Training complete<small>You know the basics</small>';
    $('endTitle').style.color = 'var(--blue)';
  } else if (G.storyM) {
    $('endTitle').innerHTML = `${win ? 'Mission complete' : 'Mission failed'}<small>${P.def.callsign} · ${G.storyM.title}</small>`;
    $('endTitle').style.color = win ? 'var(--blue)' : 'var(--red)';
  } else if (G.mode === 'survivor') {
    const place = win ? 1 : P.place;
    $('endTitle').innerHTML = win ? 'MAXX OUT!<small>#1 of ' + G.heroes.length + '</small>' : `#${place}<small>of ${G.heroes.length} · eliminated</small>`;
    $('endTitle').style.color = win ? '#9b5cff' : 'var(--red)';
  } else if (G.mode === 'duel') {
    const p = G.duel.pts;
    $('endTitle').innerHTML = `${win ? 'Duel won' : 'Duel lost'}<small>Rounds ${p.blue} – ${p.red}</small>`;
    $('endTitle').style.color = win ? 'var(--blue)' : 'var(--red)';
  } else if (G.mode === 'ball') {
    const p = G.ball.pts, us = G.playerTeam, them = us === 'blue' ? 'red' : 'blue';
    $('endTitle').innerHTML = `${win ? 'Victory' : 'Defeat'}<small>Goals ${p[us]} – ${p[them]}${G.ball.ot ? ' · golden goal' : ''}</small>`;
    $('endTitle').style.color = win ? 'var(--blue)' : 'var(--red)';
  } else if (G.mode === 'potato') {
    const p = G.potato.pts, us = G.playerTeam, them = us === 'blue' ? 'red' : 'blue';
    $('endTitle').innerHTML = `${win ? 'Victory' : 'Defeat'}<small>Blasts ${p[us]} – ${p[them]}</small>`;
    $('endTitle').style.color = win ? 'var(--blue)' : 'var(--red)';
  } else if (G.mode === 'cart') {
    const L = cartLead(G.cart), mine = G.playerTeam === 'blue' ? L.blue : L.red, theirs = G.playerTeam === 'blue' ? L.red : L.blue;
    $('endTitle').innerHTML = `${win ? 'Victory' : 'Defeat'}<small>${win ? `Cart pushed ${Math.round(mine * 100)}%` : `They pushed it ${Math.round(theirs * 100)}%`}</small>`;
    $('endTitle').style.color = win ? 'var(--blue)' : 'var(--red)';
  } else if (G.mode === 'hill') {
    const p = G.hill.pts2;
    $('endTitle').innerHTML = `${win ? 'Victory' : 'Defeat'}<small>Hill ${Math.floor(p.blue)} – ${Math.floor(p.red)}</small>`;
    $('endTitle').style.color = win ? 'var(--blue)' : 'var(--red)';
  } else if (G.mode === 'raid') {
    const R = G.raid, left = Math.max(0, R.time);
    $('endTitle').innerHTML = `${win ? 'Raid cleared' : 'Raid failed'}<small>${win ? `${R.def.name} down with ${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')} left` : `${R.def.name} at ${Math.ceil(R.boss.hp / R.boss.maxHp * 100)}% · phase ${R.phase}`}</small>`;
    $('endTitle').style.color = win ? 'var(--blue)' : 'var(--red)';
  } else {
    $('endTitle').innerHTML = `${win ? 'Victory' : 'Defeat'}<small>${win ? 'Their core is rubble' : 'Our core fell'}</small>`;
    $('endTitle').style.color = win ? 'var(--blue)' : 'var(--red)';
  }
  const end = $('end');
  end.classList.toggle('win', !!win); end.classList.toggle('lose', !win);
  end.style.setProperty('--rc', $('endTitle').style.color);
  $('endMode').textContent = G.tutorial ? (G.practice ? `Practice · ${P.def.callsign}` : 'Training') : `${END_MODE[G.mode] || 'Match'} · ${G.map.name}${G.net ? ' · online' : ''} · ${fmtT(G.time || 0)}`;
  $('endMe').innerHTML = meCard(win);
  $('endTable').innerHTML = scoreTable();
  showPassGain(win);
  const clip = finalClip(G);
  if (clip) potgT = setTimeout(() => playPotg(clip), 1400);
  else potgT = setTimeout(showEnd, 1200);
}

// Your own line on the results screen: hero, and the numbers that matter for the mode.
function meCard(win) {
  const s = [['Kills', P.kills], ['Deaths', P.deaths], ['Damage', Math.round(P.dmgDealt)]];
  if (P.assists > 0) s.splice(2, 0, ['Assists', P.assists]);
  if (P.healDone > 0) s.push(['Healing', Math.round(P.healDone)]);
  if (G.mode === 'hill' || G.mode === 'cart' || G.mode === 'potato') s.push([G.mode === 'hill' ? 'On hill' : G.mode === 'cart' ? 'On cart' : 'Bomb held', fmtT(P.objT || 0)]);
  if (G.mode === 'ball') s.push(['Goals', P.goals || 0]);
  if ((G.mode === 'lane' || G.mode === 'raid') && P.objDmg > 0) s.push([G.mode === 'raid' ? 'Boss damage' : 'Siege', Math.round(P.objDmg)]);
  if (G.mode === 'survivor') s.splice(1, 1, ['Place', `#${P.alive ? 1 : P.place}`]);
  return `<img src="${headshot(P.def)}" alt="" style="--hc:${hex(P.def.color)}">
    <div class="rs-me-n"><small>You played</small><b>${P.def.callsign}</b>${!G.tutorial && P.def.quips[win ? 'win' : 'lose'] ? `<em>“${pick(P.def.quips[win ? 'win' : 'lose'])}”</em>` : ''}</div>
    <div class="rs-stats">${s.map(([k, v]) => `<span><b>${v}</b><small>${k}</small></span>`).join('')}</div>`;
}

// ---------- play of the game ----------
// A title card for the star of the match, then their best moment replayed from over the shoulder.
let potgT = 0, potgG = null;
// the highlight is recorded as it plays, so it can be saved to the Clip Vault or sent afterwards
let clipRec = null, clipTap = null, clipProg = 0, lastClip = null, clipSaved = false;
function finishClip() {
  if (!clipRec) return;
  const r = clipRec; clipRec = null;
  r.stop().then(c => { clipTap?.stop(); clipTap = null; if (c && c.dur > 1.5) { lastClip = c; clipSaved = false; clipButtons(); } });
}
function dropClip() { if (clipRec) { clipRec.stop(); clipRec = null; } clipTap?.stop(); clipTap = null; lastClip = null; clipSaved = false; clipButtons(); }
function clipButtons() {
  const s = $('clipSave'), n = $('clipSend'); if (!s) return;
  s.hidden = n.hidden = !lastClip;
  s.disabled = clipSaved; s.innerHTML = clipSaved ? '✓ In your Clip Vault' : '💾 Save clip'; n.innerHTML = '📤 Send clip';
}
function playPotg(clip) {
  if (!G || !G.over) return;
  const star = G.heroes[clip.i]; if (!star) return showEnd();
  potgG = G; G.hadPotg = true;
  const name = star.isPlayer ? 'You' : star.name, el = $('potg'), img = headshot(star.def);
  el.style.setProperty('--hc', hex(star.def.color));
  el.innerHTML = `
    <div class="pc-bars t"></div><div class="pc-bars b"></div>
    <div class="pc-card"><div class="pc-in"><small>Play of the game</small><img src="${img}" alt="">
      <h2>${name}</h2><b>${star.def.callsign} · ${star.def.role}</b><em>${clip.label}</em></div></div>
    <div class="pc-live"><img src="${img}" alt=""><div><small>Play of the game</small><b>${name} · ${clip.label}</b></div></div>
    <div class="pc-feed"></div><div class="pc-bar"><i></i></div>
    <button class="pc-skip">Skip ▸ <kbd>Space</kbd></button>${postNav(0)}`;
  el.querySelector('.pc-skip').onclick = showEnd;
  wireLeave(el);
  el.className = 'intro';
  $('hud').classList.add('hidden'); $('center').classList.add('hidden');
  viewGun.visible = false; viewHand.visible = false;
  [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.06, 1, i * 0.11));
  potgT = setTimeout(() => {
    if (potgG !== G) return;
    el.className = 'live';
    clipTap = audioTap(); clipProg = 0;
    clipRec = startClipRec(renderer.domElement, { who: name, callsign: star.def.callsign, heroId: star.def.id, color: star.def.color, label: clip.label, map: G.map.name, mode: END_MODE[G.mode] || 'Match' }, clipTap?.stream);
    startPlayback(G, clip, {
      shot: h => { const d = h.pos.distanceTo(camera.position); if (d < 40) SHOT[h.def.id]?.(0.6 * (1 - d / 40)); },
      ability: (h, slot) => { ABIL_SFX[h.def[slot]?.id]?.(h === star ? 0.8 : 0.4); if (slot === 'ult') ultFlash(h.def.color); },
      kill: (k, v) => {
        tone(600, 0.2, 'triangle', 0.07, 2);
        const f = document.createElement('div');
        f.innerHTML = `<span class="k">${k.isPlayer ? 'You' : k.name}</span><i>▶</i>${v.isPlayer ? 'You' : v.name}`;
        el.querySelector('.pc-feed')?.prepend(f);
      },
      progress: p => { clipProg = p; const b = el.querySelector('.pc-bar i'); if (b) b.style.width = (p * 100).toFixed(1) + '%'; },
    });
  }, 2400);
}
function hidePotg() { clearTimeout(potgT); finishClip(); potgG = null; $('potg').className = 'hidden'; $('potg').innerHTML = ''; hideMvp(); }
// The strip along the top of the highlight and awards: where you are, and a way straight out.
const postNav = at => {
  const steps = [G?.hadPotg && 'Highlight', 'Standouts', 'Results'].filter(Boolean), cur = steps.length - 3 + at;
  return `<div class="pn"><ol>${steps.map((s, i) => `<li class="${i < cur ? 'done' : i === cur ? 'on' : ''}">${s}</li>`).join('')}</ol>
  <button class="pn-leave">✕ Main menu <kbd>Esc</kbd></button></div>`;
};
const wireLeave = el => { el.querySelector('.pn-leave').onclick = () => toMenu('main'); };
function showEnd() {
  if (!G) return;
  stopPlayback(G); finishClip(); clearTimeout(potgT); potgG = null; $('potg').className = 'hidden'; $('potg').innerHTML = '';
  if (!G.tutorial && !G.storyM && !G.mvpShown) { G.mvpShown = true; if (showMvp()) return; }
  hideMvp();
  $('end').classList.remove('hidden');
}

// ---------- MVP cards ----------
// Up to four standouts, each for a different stat, shown between the highlight and the results.
let mvpT = 0, mvpG = null;
const fmtT = s => s >= 60 ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : `${Math.round(s)}s`;
function mvpAwards() {
  const hs = G.heroes.filter(h => !h.gone);
  const objective = {
    hill: { t: 'Hill hog', v: h => h.objT || 0, f: fmtT, s: 'on the hill' },
    cart: { t: 'Cart pusher', v: h => h.objT || 0, f: fmtT, s: 'on the cart' },
    potato: { t: 'Hot hands', v: h => h.objT || 0, f: fmtT, s: 'holding the bomb' },
    ball: { t: 'Golden boot', v: h => (h.goals || 0) * 1000 + (h.touches || 0), f: (v, h) => h.goals || 0, s: 'goals scored' },
    lane: { t: 'Siege master', v: h => h.objDmg || 0, f: Math.round, s: 'damage to towers and cores' },
    survivor: { t: 'Last one standing', v: h => h.alive ? 100 : 100 - (h.place || 99), f: (v, h) => `#${h.alive ? 1 : h.place}`, s: 'final place' },
  }[G.mode];
  const list = [
    { t: 'Most eliminations', v: h => h.kills, f: v => v, s: v => v === 1 ? 'elimination' : 'eliminations' },
    { t: 'Heavy hitter', v: h => h.dmgDealt, f: Math.round, s: 'damage dealt' },
    objective,
    { t: 'Top healer', v: h => h.healDone || 0, f: Math.round, s: 'healing done' },
    { t: 'Iron will', v: h => h.bestLife || 0, f: fmtT, s: 'longest life' },
  ].filter(Boolean);
  const used = new Set(), out = [];
  for (const a of list) {
    if (out.length >= 4) break;
    const ranked = hs.filter(h => a.v(h) > 0).sort((x, y) => a.v(y) - a.v(x));
    const h = ranked.find(x => !used.has(x)) || null;
    if (!h) continue;
    used.add(h);
    const v = a.v(h);
    out.push({ h, title: a.t, value: a.f(v, h), sub: typeof a.s === 'function' ? a.s(v) : a.s });
  }
  return out;
}
function showMvp() {
  const awards = mvpAwards();
  if (!awards.length) return false;
  mvpG = G;
  const el = $('mvp');
  el.innerHTML = `<div class="mv-in"><small>Match standouts</small><h2>${G.mode === 'survivor' ? 'Top players' : 'MVP awards'}</h2>
    <div class="mv-cards">${awards.map((a, i) => {
      const h = a.h, team = G.mode === 'survivor' ? (h.isPlayer ? 'b' : 'n') : h.team === G.playerTeam ? 'b' : 'r';
      return `<div class="mv-card ${team} ${h.isPlayer ? 'me' : ''}" style="--hc:${hex(h.def.color)};animation-delay:${0.15 + i * 0.22}s">
        <span class="mv-t">${a.title}</span><img src="${headshot(h.def)}" alt="">
        <b>${h.isPlayer ? 'You' : h.name}</b><em>${h.def.callsign}</em>
        <div class="mv-v"><strong>${a.value}</strong><span>${a.sub}</span></div></div>`;
    }).join('')}</div>
    <button class="mv-go">Continue ▸ <kbd>Space</kbd></button></div>${postNav(1)}`;
  el.querySelector('.mv-go').onclick = () => showEnd();
  wireLeave(el);
  el.classList.remove('hidden');
  awards.forEach((a, i) => setTimeout(() => { if (mvpG === G) tone(520 + i * 130, 0.14, 'triangle', 0.06, 1.2); }, 150 + i * 220));
  mvpT = setTimeout(() => { if (mvpG === G) showEnd(); }, 9000);
  return true;
}
function hideMvp() { clearTimeout(mvpT); mvpG = null; $('mvp').classList.add('hidden'); $('mvp').innerHTML = ''; }

// Season pass payout, shown under the scoreboard with the bar filling from old to new XP.
function showPassGain(win) {
  if (G.awarded) return;
  G.awarded = true;
  if (G.tutorial) {
    $('passGain').innerHTML = G.practice
      ? `<div class="pg-top"><span>Practice run</span><b>${P.def.callsign}</b></div>
      <div class="pg-parts">Practice runs don’t earn XP, but you can try any hero, even ones you haven’t unlocked. Hit Play again to go through the kit once more.</div>`
      : `<div class="pg-top"><span>Tutorial complete</span><b>You're ready</b></div>
      <div class="pg-parts">Try Lane Breaker, Survivor or Hill Rush from the main menu. Matches earn season pass and hero mastery XP.</div>`;
    return;
  }
  // achievements: everything this match counts towards
  achEndMatch({ win, mode: G.mode, map: G.map.id, night: !!G.map.night, online: !!G.net, hero: P.def.id, arch: P.def.arch, kills: P.kills, deaths: P.deaths,
    heal: P.healDone || 0, goals: P.goals || 0, ownGoal: !!G.ownGoal, heads: P._heads || 0,
    shutout: G.mode === 'duel' && G.duel?.pts?.[P.team === 'blue' ? 'red' : 'blue'] === 0 });
  if (G.ranked) {
    // Ranked: rank points instead of player level and season pass XP. Mastery, contracts and dailies still count.
    const rr = recordRanked({ win, kills: P.kills, deaths: P.deaths, assists: P.assists || 0, mode: G.mode, map: G.map.id, hero: P.def.id });
    const mst = gainMastery(P.def.id, { win, kills: P.kills, dmg: P.dmgDealt });
    const ct = recordMatch({ win, kills: P.kills, dmg: P.dmgDealt, heal: P.healDone || 0, arch: P.def.arch, mode: G.mode, map: G.map.id, cs: P.cs || {} });
    const dl = recordDaily({ win, kills: P.kills, dmg: P.dmgDealt, arch: P.def.arch, mode: G.mode });
    recordHistory({ mode: G.mode, map: G.map.id, hero: P.def.id, win, place: null, players: G.heroes.length, ranked: true,
      kills: P.kills, deaths: P.deaths, dmg: P.dmgDealt, heal: P.healDone || 0, online: false, score: [G.score[P.team] || 0, G.score[P.team === 'blue' ? 'red' : 'blue'] || 0] });
    publishCard();
    if (win) feat('rankwin');
    if (rr.after.i >= 2) feat('rankgold');
    if (rr.after.i >= 6) feat('ranklegend');
    const a = rr.after, b = rr.before, col = c => '#' + c.toString(16).padStart(6, '0'), legend = a.i === 6;
    const chip = r => {
      if (r.type === 'tokens') return `<span class="cos"><i>🎰</i>+${r.n} tokens</span>`;
      if (r.type === 'hero') { const h = HEROES.find(x => x.id === r.id); return `<span class="hero" style="--hc:${col(h.color)}"><img src="${headshot(h)}" alt="">New hero: ${h.callsign}</span>`; }
      const s = skinById(r.id), h = HEROES.find(x => x.id === s.hero);
      return `<span class="skin pg-legend" style="--hc:${col(s.color)}"><img src="${headshot(dressed(h, s.id))}" alt="">★ Legendary: ${h.callsign} · ${s.name}${r.bonus ? ` · +${r.bonus} tokens` : ''}</span>`;
    };
    const el = $('passGain');
    el.innerHTML = `<div class="pg-rk ${rr.delta >= 0 ? 'up' : 'down'}" style="--rc:${col(a.color)}">
      <div class="pg-top"><span>${a.icon} Ranked · ${a.label}</span><b>${rr.delta >= 0 ? '+' : ''}${rr.delta} RP</b></div>
      ${legend ? `<div class="pg-tier"><span>${a.rp.toLocaleString()} RP</span><span>Top of the ladder</span></div>`
        : `<div class="pg-bar pg-rkbar"><i style="width:${(a.i === b.i && a.div === b.div ? b.frac : rr.delta >= 0 ? 0 : 1) * 100}%"></i></div>
      <div class="pg-tier"><span>${b.label !== a.label ? `${b.label} → <b>${a.label}</b>` : a.label}</span><span>${a.into} / ${a.need} RP</span></div>`}
      ${rr.promoted && a.i > b.i ? `<div class="pg-rank">Promoted to ${a.name}! ${a.icon}</div>` : rr.promoted ? `<div class="pg-rank">Up to ${a.label}!</div>` : ''}
      ${rr.demoted ? `<div class="pg-rank down">Down to ${a.label}</div>` : ''}
      ${rr.saved ? '<div class="pg-rank">🛡️ Rank protection: you stay in ' + a.name + '. Lose again from here and you drop a rank.</div>' : ''}
      ${rr.streak >= 2 ? `<div class="pg-parts">🔥 ${rr.streak} wins in a row · streak bonus on your next win</div>` : ''}
      ${rr.unlocked.length ? `<div class="pg-un">${rr.unlocked.map(chip).join('')}</div>` : ''}
      <div class="pg-parts">Ranked matches don’t give player level or season pass XP.</div></div>
      ${mst ? `<div class="pg-mst" style="--mc:${mst.after.rank.color}"><div class="pg-top"><span>${P.def.callsign} mastery</span><b>+${mst.gained} XP</b></div>
        <div class="pg-tier"><span>${mst.after.rank.name} · Lv ${mst.after.level}</span>${mst.rankUp || mst.bonus ? `<span class="pg-tok">+${mst.tokens} token${mst.tokens > 1 ? 's' : ''} 🎰</span>` : ''}</div></div>` : ''}`;
    if (ct.recruited.length || dl.done.length || dl.token) el.insertAdjacentHTML('beforeend', `<div class="pg-ct">${ct.recruited.map(id => `<span>Recruited: <b>${HEROES.find(x => x.id === id).callsign}</b>!</span>`).join('')}${
      dl.done.map(c => `<span>✅ Daily challenge: <b>${c.text}</b></span>`).join('')}${dl.token ? '<span class="pg-tok">All 3 daily challenges done! +1 token 🎰</span>' : ''}</div>`);
    if (!legend) setTimeout(() => { const i = el.querySelector('.pg-rkbar i'); if (i) i.style.width = (a.frac * 100) + '%'; }, 900);
    if (rr.promoted || rr.unlocked.length) setTimeout(() => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, 'triangle', 0.06, 1, i * 0.09)), 1000);
    else if (rr.demoted) setTimeout(() => { tone(392, 0.2, 'triangle', 0.05, 1); tone(294, 0.3, 'triangle', 0.05, 1, 0.15); }, 900);
    return;
  }
  if (G.storyM) {
    // Story: the ending, the medal, and a token the first time you clear it (and for the first gold)
    const M = G.storyM, first = win && finishMission(M.hero), S = G.story;
    if (first) setStory(storyClears());
    const time = Math.max(0, (S?.endT ?? G.time) - (S?.t0 || 0)), md = win ? awardMedal(M, time, P.deaths) : null;
    const goal = md && md.got < 3 ? (md.got === 1 ? `🥈 Silver: finish with 1 knockout or fewer` : `🥇 Gold: no knockouts, under ${fmtTime(md.par)}`) : '';
    const medal = md ? `<div class="pg-medal m${md.got}"><span>${MEDAL_ICON[md.got]}</span><div><b>${MEDALS[md.got]} medal${md.better && md.was ? ' · new best!' : ''}</b>
        <small>${fmtTime(time)}${md.newBest ? ' (best time!)' : ''} · ${P.deaths} knockout${P.deaths === 1 ? '' : 's'} · par ${fmtTime(md.par)}</small>${goal ? `<em>Next: ${goal}</em>` : ''}</div></div>` : '';
    $('passGain').innerHTML = `<div class="pg-top"><span>📖 Story · ${P.def.callsign}</span><b>${M.title}</b></div>
      ${medal}
      <div class="pg-parts pg-story">${win ? M.outro : 'Not this time. Every hero gets another chance: hit Play again to retry the mission.'}</div>
      ${first ? '<div class="pg-ct"><span>🎰 First clear: <b>+1 token</b> for the slot machine</span></div>' : ''}
      ${md?.goldFirst ? '<div class="pg-ct"><span>🥇 First gold: <b>+1 token</b></span></div>' : ''}`;
    const lv = addPlayerXp(storyXp(win, md?.got || 0));
    $("passGain").insertAdjacentHTML("beforeend", levelBlock(lv)); fillLevelBar($("passGain"), lv.ups > 0);
    if (md?.better) setTimeout(() => [523, 659, 784, md.got === 3 ? 1046 : 0].filter(Boolean).forEach((f, i) => tone(f, 0.16, 'triangle', 0.06, 1, i * 0.09)), 600);
    return;
  }
  const res = award(matchXp({ mode: G.mode, win, kills: P.kills, place: win ? 1 : P.place, players: G.heroes.length }));
  const lv = addPlayerXp(res.gained);                  // player level: the same XP, and a token per level
  const mst = gainMastery(P.def.id, { win, kills: P.kills, dmg: P.dmgDealt });
  const ct = recordMatch({ win, kills: P.kills, dmg: P.dmgDealt, heal: P.healDone || 0, arch: P.def.arch, mode: G.mode, map: G.map.id, cs: P.cs || {} });
  const dl = recordDaily({ win, kills: P.kills, dmg: P.dmgDealt, arch: P.def.arch, mode: G.mode });
  recordHistory({ mode: G.mode, map: G.map.id, hero: P.def.id, win, place: G.mode === 'survivor' ? (win ? 1 : P.place) : null, players: G.heroes.length,
    kills: P.kills, deaths: P.deaths, dmg: P.dmgDealt, heal: P.healDone || 0, online: !!G.net, score: [G.score[P.team] || 0, G.score[P.team === 'blue' ? 'red' : 'blue'] || 0] });
  publishCard();                                       // signed in: friends see your updated profile card
  const p0 = tierProgress(res.before), p1 = tierProgress(res.after);
  const el = $('passGain');
  const chip = r => { const inf = rewardInfo(r); return inf.cos ? `<span class="cos"><i>${inf.glyph}</i>${inf.title} · ${inf.sub}</span>`
    : `<span class="${r.type}" style="--hc:#${inf.def.color.toString(16).padStart(6, '0')}"><img src="${headshot(inf.def)}" alt="">${r.type === 'hero' ? 'New hero: ' : ''}${inf.title}${r.type === 'skin' ? ` · ${inf.sub}` : ''}</span>`; };
  el.innerHTML = `
    <div class="pg-top"><span>Season ${SEASON.n} pass</span><b>+${res.gained} XP</b></div>
    <div class="pg-parts">${res.parts.map(([k, v]) => `${k} +${v}`).join(' · ')}</div>
    <div class="pg-bar pg-pass"><i style="width:${res.t1 > res.t0 ? 0 : p0.frac * 100}%"></i></div>
    <div class="pg-tier"><span>Tier ${res.t0}${res.t1 > res.t0 ? ` → <b>${res.t1}</b>` : ''}</span><span>${p1.tier >= MAX_TIER ? 'Pass complete!' : `${p1.into} / ${p1.need} XP to tier ${p1.tier + 1}`}</span></div>
    ${res.unlocked.length ? `<div class="pg-un">${res.unlocked.map(chip).join('')}</div>` : ''}
    ${mst ? `<div class="pg-mst" style="--mc:${mst.after.rank.color}">
      <div class="pg-top"><span>${P.def.callsign} mastery</span><b>+${mst.gained} XP</b></div>
      <div class="pg-bar"><i style="width:${mst.levelUp || mst.bonus ? 0 : mst.before.frac * 100}%"></i></div>
      <div class="pg-tier"><span>${mst.after.rank.name} · Lv ${mst.before.level}${mst.levelUp ? ` → <b>${mst.after.level}</b>` : ''}</span><span>${mst.after.max ? `${mst.after.into} / ${mst.after.need} to bonus token` : `${mst.after.into} / ${mst.after.need} XP`}</span></div>
      ${mst.rankUp ? `<div class="pg-rank">New rank: ${mst.after.rank.name}! <span class="pg-tok">+${(mst.tokens - mst.bonus)} token${(mst.tokens - mst.bonus) > 1 ? "s" : ""} 🎰</span></div>` : ''}
      ${mst.bonus ? `<div class="pg-rank">Mastery bonus! <span class="pg-tok">+${mst.bonus} token${mst.bonus > 1 ? "s" : ""} 🎰</span></div>` : ''}</div>` : ''}`;
  el.insertAdjacentHTML("afterbegin", levelBlock(lv)); fillLevelBar(el, lv.ups > 0);
  // recruitment contracts: a chip for anyone just recruited, and a line for contracts that moved
  if (ct.recruited.length || ct.progressed.length || ct.opened.length) el.insertAdjacentHTML('beforeend', `<div class="pg-ct">${
    ct.recruited.map(id => { const h = HEROES.find(x => x.id === id); return `<span class="pg-new" style="--hc:#${h.color.toString(16).padStart(6, '0')}"><img src="${headshot(h)}" alt="">Recruited: <b>${h.callsign}</b>!</span>`; }).join('')}${
    ct.progressed.map(id => `<span>📜 ${HEROES.find(x => x.id === id).callsign}’s contract · ${tasksDone(id)} of 3 tasks</span>`).join('')}${
    ct.opened.map(id => `<span>✉️ New contract: <b>${HEROES.find(x => x.id === id).callsign}</b> wants to join. See Contracts</span>`).join('')}</div>`);
  // daily challenges: a line for each one just finished, and the token when all three are done
  if (dl.done.length || dl.token) el.insertAdjacentHTML('beforeend', `<div class="pg-ct pg-daily">${dl.done.map(c => `<span>✅ Daily challenge: <b>${c.text}</b></span>`).join('')}${
    dl.token ? '<span class="pg-tok">All 3 daily challenges done! +1 token 🎰</span>' : ''}</div>`);
  if (mst) setTimeout(() => { const b = el.querySelector('.pg-mst .pg-bar i'); if (b) b.style.width = (mst.after.frac * 100) + '%'; }, 1700);
  if (mst?.levelUp) setTimeout(() => { tone(523, 0.15, 'square', 0.05, 1); tone(784, 0.25, 'square', 0.05, 1, 0.12); }, 1800);
  setTimeout(() => { const b = el.querySelector('.pg-pass i'); if (b) b.style.width = (p1.frac * 100) + '%'; }, 1500);
  if (res.unlocked.length) setTimeout(() => { tone(660, 0.2, 'triangle', 0.08, 1.5); tone(990, 0.3, 'triangle', 0.06, 1.3); }, 1600);
}

// Player level on the results screen: the XP, the bar, and a token for every level gained
function levelBlock(lv) {
  const a = lv.after, up = lv.ups > 0;
  return `<div class="pg-lvl${up ? ' up' : ''}">
    <div class="pg-top"><span>Player level</span><b>+${lv.gained} XP</b></div>
    <div class="pg-bar"><i style="width:${up ? 0 : lv.before.frac * 100}%" data-to="${a.frac * 100}"></i></div>
    <div class="pg-tier"><span>Level ${lv.before.level}${up ? ` → <b>${a.level}</b>` : ''}</span><span>${a.into.toLocaleString()} / ${a.need.toLocaleString()} XP to level ${a.level + 1}</span></div>
    ${up ? `<div class="pg-rank">Level up! <span class="pg-tok">+${lv.ups} token${lv.ups > 1 ? 's' : ''} 🎰</span></div>` : ''}</div>`;
}
function fillLevelBar(el, up) {
  const bar = el.querySelector('.pg-lvl .pg-bar i'); if (!bar) return;
  setTimeout(() => { bar.style.width = bar.dataset.to + '%'; }, 1300);
  if (up) setTimeout(() => { tone(523, 0.15, 'square', 0.05, 1); tone(784, 0.2, 'square', 0.05, 1, 0.1); tone(1046, 0.3, 'square', 0.05, 1, 0.2); }, 1500);
}
function scoreTable() {
  const who = h => `<td class="sb-who"><div><img src="${headshot(h.def)}" alt="" style="--hc:${hex(h.def.color)}"><span><b>${h.isPlayer ? 'You' : h.name}</b><small>${h.def.callsign}</small></span></div></td>`;
  if (G.mode === 'survivor') {
    const rows = survivorLeaders(G).slice(0, 12).map(h => `<tr class="${h.isPlayer ? 'me' : ''}"><td class="sb-pl">${h.alive ? '★' : '#' + h.place}</td>${who(h)}<td>${h.kills}</td><td>${h.assists || 0}</td><td>${Math.round(h.dmgDealt)}</td></tr>`).join('');
    return `<table class="sb"><tr><th>#</th><th>Player</th><th title="Kills">K</th><th title="Assists: 45%+ of the damage on a kill">A</th><th>Damage</th></tr>${rows}</table>`;
  }
  const side = t => {
    const hs = G.heroes.filter(h => h.team === t).sort((a, b) => b.kills - a.kills || b.dmgDealt - a.dmgDealt);
    const K = hs.reduce((s, h) => s + h.kills, 0);
    return `<tr class="sb-team ${t}"><th>${t === 'blue' ? 'Blue' : 'Red'} team${t === G.playerTeam ? ' · yours' : ''}</th><th>${K}</th><th></th><th></th><th></th></tr>`
      + hs.map(h => `<tr class="${h.isPlayer ? 'me' : ''} ${t}">${who(h)}<td>${h.kills}</td><td>${h.deaths}</td><td>${h.assists || 0}</td><td>${Math.round(h.dmgDealt)}</td></tr>`).join('');
  };
  const order = G.playerTeam === 'red' ? ['red', 'blue'] : ['blue', 'red'];
  return `<table class="sb team"><tr><th>Player</th><th title="Kills">K</th><th title="Deaths">D</th><th title="Assists: 45%+ of the damage on a kill">A</th><th>Damage</th></tr>${order.map(side).join('')}</table>`;
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
  if (!G.tutorial) { if (streak.multi === 2) feat('double'); if (streak.multi === 3) feat('triple'); if (streak.multi >= 5) feat('maxxacre'); }
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

// Achievement toasts: slide in at the top, stack if several unlock at once.
const achQueue = [];
let achBusy = false;
onAchievement((a, token) => { achQueue.push([a, token]); if (!achBusy) nextAchToast(); });
function nextAchToast() {
  const it = achQueue.shift(); if (!it) { achBusy = false; return; }
  achBusy = true;
  const [a, token] = it, el = document.createElement('div');
  el.className = 'ach-toast';
  el.innerHTML = `<i>${a.icon}</i><div><small>Achievement unlocked</small><b>${a.name}</b><span>${a.desc}${token ? ' · <em>+1 token 🎰</em>' : ''}</span></div>`;
  document.body.appendChild(el);
  [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.14, 'triangle', 0.05, 1, i * 0.07));
  requestAnimationFrame(() => el.classList.add('on'));
  setTimeout(() => { el.classList.remove('on'); setTimeout(() => { el.remove(); nextAchToast(); }, 420); }, 3600);
}

// ---------- kill cam & death recap ----------
const unitName = u => !u ? (G.mode === 'survivor' ? 'The storm' : 'The fountain') : u.kind === 'hero' ? (u.isPlayer ? 'You' : u.name) : u.kind === 'tower' ? 'A tower' : u.kind === 'core' ? 'The core' : u.kind === 'guardian' ? 'The enemy Guardian' : u.kind === 'boss' ? u.name : u.deploy ? `${u.owner?.name || 'A'}'s gadget` : 'A minion';
function deathRecap(src) {
  const killer = src?.kind === 'hero' ? src : src?.owner?.kind === 'hero' ? src.owner : null;
  // follow the killer for most of the respawn wait (up to 5s); in Survivor and Duel there is no respawn, so the full 5s
  const rt = P.respawnT, camT = Number.isFinite(rt) && rt > 2.5 ? Math.min(KILLCAM_T, rt - 1.4) : KILLCAM_T;
  endKillCam(G, G.killCam?.rp);
  G.killCam = killer && killer !== P ? { who: killer, t: camT, gone: 0, rp: startKillCam(G, killer, P, Math.min(KILLCAM_LEN, camT - 1.2)) } : null;
  // everything that hurt you this life, grouped by who dealt it, shown as a share of the total
  const by = new Map();
  for (const e of (P._log || [])) {
    const k = e.src?.kind === 'hero' ? e.src : e.src?.owner?.kind === 'hero' ? e.src.owner : e.src;
    const r = by.get(k) || { u: k, amt: 0, heads: 0 }; r.amt += e.amt; r.heads += e.head ? 1 : 0; by.set(k, r);
  }
  P._log = [];
  const all = [...by.values()].sort((a, b) => b.amt - a.amt), total = all.reduce((a, r) => a + r.amt, 0) || 1;
  // whole percentages that still add up to 100: round down, then hand the leftovers to the biggest remainders
  all.forEach(r => { r.exact = r.amt / total * 100; r.pct = Math.floor(r.exact); });
  let spare = 100 - all.reduce((a, r) => a + r.pct, 0);
  [...all].sort((a, b) => (b.exact - b.pct) - (a.exact - a.pct)).forEach(r => { if (spare > 0) { r.pct++; spare--; } });
  const rows = all.slice(0, 6);
  const col = u => u?.kind === 'hero' ? hex(u.def.color) : '#8a8f99';
  const el = $('recap');
  el.innerHTML = `
    <div class="rc-head">
      ${killer ? `<img src="${headshot(killer.def)}" alt="">` : '<div class="rc-skull">☠</div>'}
      <div><small>Eliminated by</small><b>${unitName(killer || src)}</b>
        ${killer ? `<span>${killer.def.callsign} · ${killer.def.role}${killer.alive ? ` · ${Math.ceil(killer.hp)} HP left` : ''}</span>` : ''}</div>
    </div>
    ${rows.length ? `<div class="rc-rows">${rows.map(r => `<div class="rc-row"><i style="background:${col(r.u)};width:${Math.max(6, r.pct)}%"></i>
      <span>${unitName(r.u)}</span><b>${r.pct}%${r.heads ? ` <em>· ${r.heads} head</em>` : ''}</b></div>`).join('')}${all.length > rows.length ? `<div class="rc-more">+${all.length - rows.length} more · ${all.slice(rows.length).reduce((a, r) => a + r.pct, 0)}%</div>` : ''}</div>` : ''}`;
  el.classList.remove('hidden', 'on'); void el.offsetWidth; el.classList.add('on');
}
const camBack = new THREE.Vector3(), camLook = new THREE.Vector3();
const KILLCAM_T = 5.5, KILLCAM_AFTER = 0.5, KILLCAM_LEN = 4.2;   // seconds for the kill cam, how long to linger on a live killer who goes down too, and how much to replay
function killCamera(dt) {
  const kc = G.killCam;
  if (!kc) return false;
  // the replay through the killer's eyes; if there's no recording to show, follow them live instead
  if (kc.rp) { if (tickKillCam(G, kc.rp, dt, camera)) return true; kc.rp = null; kc.t = 0; return false; }
  if (kc.t <= 0) return false;
  if (!kc.who.alive && (kc.gone += dt) > KILLCAM_AFTER) return false;
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
    if (src === P && head && t.kind === 'hero' && t !== P) P._heads = (P._heads || 0) + 1;
    if (src?.kind === 'hero' && (t.kind === 'tower' || t.kind === 'core' || t.kind === 'boss')) src.objDmg = (src.objDmg || 0) + amt;
    if (G.potato && src?.kind === 'hero') potatoHit(G, src, t);
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
      if (amt >= 2) rumble(Math.min(0.9, amt / 70), Math.min(1, amt / 40), 90 + Math.min(160, amt * 3));
      if (P.alive && P.hp < P.maxHp * 0.3 && !P._lowSaid) { P._lowSaid = true; say(P, 'lowhp'); }
      (P._log ||= []).push({ src, amt, head, t: G.time }); if (P._log.length > 1500) P._log.splice(0, 500); }
  },
  passive(u) {
    if (u !== P) return;
    const pv = $('hPas'); pv.classList.remove('on'); void pv.offsetWidth; pv.classList.add('on');
    clearTimeout(pv._t); pv._t = setTimeout(() => pv.classList.remove('on'), 2200);
    tone(880, 0.08, 'triangle', 0.05, 1.4); tone(1320, 0.1, 'triangle', 0.04, 1.2, 0.06);
  },
  netSpray(h, id, p, n, yaw) { const c = cosById(id); if (c?.type === 'spray') placeSpray(G, h.key, c, p, n, yaw); },
  netEmote(h, id) { if (id) startEmote(G, h, id); else stopEmote(G, h); },
  // Tilt’s bumpers and bouncing shots: a pinball ding, quieter for ricochets
  bump(at, small) {
    const d = Math.hypot(at.x - P.pos.x, at.z - P.pos.z), v = Math.max(0, 1 - d / 35) * (small ? 0.45 : 1);
    if (v > 0.02) { tone(small ? 1568 : 1047, 0.07, "square", 0.04 * v, 1); tone(small ? 2093 : 1397, 0.08, "square", 0.03 * v, 1, 0.04); }
  },
  // Lane Breaker base Guardians: a deep groan on the wind-up, a crash on the slam
  guardian(type, g, at) {
    const d = Math.hypot(g.pos.x - P.pos.x, g.pos.z - P.pos.z), v = Math.max(0, 1 - d / 45);
    if (type === 'wind' && v > 0) { tone(65, 0.9, 'sawtooth', 0.08 * v, 0.6); tone(98, 0.7, 'square', 0.03 * v, 0.7, 0.1); }
    if (type === 'slam' && v > 0) {
      noise(0.7, 0.18 * v, 220, 0, { type: 'lowpass', to: 60 }); tone(48, 0.6, 'sine', 0.14 * v, 0.5);
      const near = Math.hypot(at.x - P.pos.x, at.z - P.pos.z);
      if (cfg.screenShake && near < 14) shake = Math.max(shake, 0.9 * (1 - near / 14));
    }
  },
  netGuard(team, x, z) { netGuardSlam(G, team, x, z); },
  // Skyreach jump pads: a springy boing for anyone near
  pad(h) {
    const d = Math.hypot(h.pos.x - P.pos.x, h.pos.z - P.pos.z), v = h === P ? 1 : Math.max(0, 1 - d / 30);
    if (v > 0.02) { tone(220, 0.35, 'sine', 0.07 * v, 3); tone(440, 0.25, 'triangle', 0.03 * v, 2.5, 0.05); }
  },
  // Tidewater Docks: warn before the tide, and say when it turns
  tide(type, n) {
    if (type === 'warn') { banner('The tide is coming in!', '#3fa8c8', `${n}s · get up on the piers and crates`); tone(98, 0.9, 'sine', 0.08, 1.2); }
    if (type === 'in') { banner('High tide!', '#3fa8c8', 'Anyone in the water is slowed'); noise(1.4, 0.08, 600, 0, { type: 'lowpass', to: 200 }); }
    if (type === 'out') banner('The tide is going out', '#3fa8c8', '');
  },
  // Pumpkin Hollow: warn before a gust, then a whoosh as it hits
  gust(type, n) {
    if (type === 'warn') { banner('The wind is picking up!', '#e8742a', `${n}s · stay clear of ledges and keep your footing`); noise(1.2, 0.03, 900, 0, { type: 'bandpass', to: 1400 }); }
    if (type === 'blow') { banner('Gust of wind!', '#e8742a', 'Everyone is blown sideways'); noise(2.6, 0.09, 1200, 0, { type: 'bandpass', to: 500 }); }
  },
  // Story missions: pick-ups, deliveries and checkpoints, then the end
  story(type, S) {
    if (type === 'pickup') tone(880, 0.12, 'triangle', 0.06, 1.4);
    else if (type === 'drop') banner(`You dropped the ${S.K.item}`, 'var(--red)', 'Pick it up again where you went down');
    else if (type === 'deliver') { banner(`${S.have} of ${S.K.n} delivered`, '#3ccf9a', S.have < S.K.n ? 'A new one is waiting' : ''); [523, 659, 784].forEach((f, i) => tone(f, 0.15, 'triangle', 0.06, 1, i * 0.07)); }
    else if (type === 'part') { banner('Part 1 complete', 'var(--blue)', S.K.title); [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, 'triangle', 0.06, 1, i * 0.08)); }
    else if (type === 'stage') {
      const K = S.K, line = $('styLine');
      line.innerHTML = `<small>Part ${S.stage + 1} · ${K.title}</small>${K.line || ''}`;
      line.classList.remove('on'); void line.offsetWidth; line.classList.add('on');
      setTimeout(() => {
        if (G?.story !== S) return;
        if (K.type === 'boss') { $('lB').textContent = G.raid.def.name; $('lR').textContent = 'Time left'; banner(G.raid.def.name, 'var(--red)', `${G.raid.def.title} · Part ${S.stage + 1}`); tone(80, 1.2, 'sawtooth', 0.1, 0.5); }
        else banner(`Part ${S.stage + 1} · ${K.title}`, '#1d2340', S.goal);
      }, 2200);
    }
    else if (type === 'checkpoint') { tone(660 + S.cp * 60, 0.15, 'square', 0.05, 1.3); }
    else if ((type === 'win' || type === 'fail') && !G.over) {
      S.endT = G.time;
      G.over = true;
      banner(type === 'win' ? 'Mission complete!' : 'Mission failed', type === 'win' ? 'var(--blue)' : 'var(--red)', S.M.title);
      tone(type === 'win' ? 660 : 160, 0.6, 'triangle', 0.08, type === 'win' ? 1.8 : 0.6);
      endLater(type === 'win', 1800);
    }
  },
  // Boss Raid: wind-ups, impacts and phase changes; running out of time or a wipe loses
  raid(type, x, warn) {
    const D = G.raid?.def;
    if (type === 'wind') {
      tone(x === 'wave' || x === 'laser' ? 90 : 70, 0.7, 'sawtooth', 0.07, x === 'rain' || x === 'icicles' ? 1.6 : 0.6);
      if (warn) banner(warn[0], 'var(--red)', warn[1].includes('Jump') ? `${warn[1]} (${keyOf('jump')})` : warn[1]);
      if (x === 'breath' || x === 'freeze') noise(1, 0.08, 3000, 0.4, { type: 'highpass', to: 1500 });
      if (x === 'laser') tone(1200, 1.2, 'square', 0.03, 0.6, 1);
    }
    else if (type === 'impact') { const d = Math.hypot(x.x - P.pos.x, x.z - P.pos.z), v = Math.max(0, 1 - d / 40); if (v > 0) { noise(0.5, 0.15 * v, 260, 0, { type: 'lowpass', to: 60 }); tone(55, 0.4, 'sine', 0.12 * v, 0.5); } }
    else if (type === 'launch') [880, 990, 1100].forEach((f, i) => tone(f, 0.15, 'square', 0.03, 0.5, i * 0.08));
    else if (type === 'pod') {
      if (x === 'heal') { banner('A seed pod hatched', 'var(--red)', `${D.name} healed 7%`); tone(523, 0.3, 'triangle', 0.06, 1.5); }
      else { tone(660, 0.12, 'triangle', 0.06, 1.2); tone(880, 0.15, 'triangle', 0.05, 1.2, 0.06); }
    }
    else if (type === 'phase') { const [t, s] = x === 3 ? D.enraged : D.phase; banner(t, 'var(--red)', s); tone(80, 1.2, 'sawtooth', 0.1, 0.5); tone(120, 1, 'square', 0.05, 0.6, 0.1); }
    else if ((type === 'time' || type === 'wipe') && !G.over) {
      G.over = true;
      banner(type === 'time' ? 'Time’s up' : 'Wiped out', 'var(--red)', type === 'time' ? `${D.name} outlasted you` : 'Everyone went down at once');
      endLater(false, 1800);
    }
  },
  emote(h, e) {                                         // sound and, for the hero line, a quip; only heard up close
    if (h !== P && P?.pos && h.pos.distanceTo(P.pos) > VOICE_NEAR) return;
    EMOTE_SFX[e.id]?.();
    if (e.id === 'line') { const q = h.def.quips; sayLine(h, pick([...(q.spawn || []), ...(q.kill || []), ...(q.ability || [])])); }
  },
  tunnel(u) {
    if (u !== P && u.pos.distanceTo(P.pos) > 25) return;
    const v = u === P ? 1 : 0.4;
    noise(0.35, 0.1 * v, 300, 0, { type: 'lowpass', to: 900 }); tone(180, 0.2, 'sine', 0.07 * v, 2.2);
  },
  pickup(u) {
    if (u !== P) return;
    tone(660, 0.1, 'sine', 0.08, 1.5); tone(990, 0.14, 'sine', 0.06, 1.3, 0.08);
    floatText(G, chestOf(u).setY(u.pos.y + 2.4), 'Slime snack!', '#8af06a', 1);
  },
  heal(u, amt, src) {
    if (u === P && P.hp > P.maxHp * 0.6) P._lowSaid = false;
    // thank a teammate once they've patched you up a fair bit
    if (u === P && src?.kind === 'hero' && src !== P && src.team === P.team) {
      P._healAcc = (P._healAcc || 0) + amt;
      if (P._healAcc >= 40 && G.time > (P._thanksT || 0)) { P._healAcc = 0; P._thanksT = G.time + 15; say(P, 'thanks'); }
    }
    if (src?.kind === 'hero' && src !== u) { src.healDone = (src.healDone || 0) + amt; (u.healLog ||= new Map()).set(src, G.time); }   // healing on teammates (stats, contracts, Story) and heal assists
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
    if (src === P && t !== P && t.kind === 'hero') rumble(0.35, 0.7, 160);      // a kick for your eliminations
    if (src === P && t !== P && !G.tutorial) {                                    // achievements
      if (t.kind === 'hero') {
        P._lastKillT = G.time; bumpAndCheck('kills');
        if (P.alive && P.hp < P.maxHp * 0.1) feat('clutch');
        if (P.def.id === 'pinball' && t.bankT > G.time - 0.05) feat('bank');
      } else if (t.kind === 'tower') bumpAndCheck('towers');
    }
    recKill(G, t, src);
    // bots celebrate now and then (online, only the machine running that bot decides)
    if (t.kind === 'hero' && src?.kind === 'hero' && src !== t && !src.isPlayer && (!G.net || src.local) && !G.tutorial && Math.random() < 0.3)
      G.timers.push({ t: 0.5, fn: () => { const id = pick(BOT_EMOTES); if (src.alive && !src.emote && startEmote(G, src, id)) G.net?.emote(src, id); } });
    if (t.kind === 'hero' && src === P && t !== P) { onPlayerKill(); if (G.tutorial) tutorialKill(); }
    if (t === P) { streak.life = 0; deathRecap(src); }
    const env = G.mode === 'survivor' ? 'The storm' : G.mode === 'potato' ? 'The bomb' : 'Fountain';
    const nm = u => u ? (u.kind === 'hero' ? (u.isPlayer ? 'You' : u.name) : u.kind === 'tower' ? 'Tower' : u.kind === 'core' ? 'Core' : u.kind === 'guardian' ? 'Guardian' : u.kind === 'boss' ? u.name : 'Minion') : env;
    if (t.kind === 'hero' || t.kind === 'tower' || t.kind === 'core' || t.kind === 'boss') {
      // killer ──▶ victim, coloured by side; your own kills and deaths stand out
      const side = u => !u ? 'n' : u.team === G.playerTeam ? 'b' : 'r';
      const dot = u => u && u.kind === 'hero' ? `<i class="dot" style="background:${hex(u.def.color)}"></i>` : '';
      const victim = t.kind === 'hero' || t.kind === 'boss' ? nm(t) : (t.team === 'blue' ? 'Blue ' : 'Red ') + nm(t);
      const el = document.createElement('div');
      el.className = src === P ? 'me' : t === P ? 'died' : '';
      el.innerHTML = `<span class="${side(src)}">${dot(src)}${nm(src)}</span>`
        + `<span class="arr ${side(src)}">${t.killedByHead && src && src.kind === 'hero' ? '<em>HEAD</em>' : ''}</span>`
        + `<span class="${side(t)}">${dot(t)}${victim}</span>`
        + (t.assisters?.length ? `<span class="as">+ ${t.assisters.length > 2 ? t.assisters.length : t.assisters.map(nm).join(", ")}</span>` : "");
      $('feed').prepend(el);
      setTimeout(() => el.remove(), 6000);
      while ($('feed').children.length > 6) $('feed').lastChild.remove();
    }
    if (src === P && t.kind === 'hero') {
      hitMark('kill'); hitStop(G, t.killedByHead ? 0.11 : 0.08);
      killIcon(camera, chestOf(t).setY(t.pos.y + 1.6), t.killedByHead ? 'head' : 'kill', streak.multi > 1 ? '×' + streak.multi : t.killedByHead ? 'Headshot' : '');
      tone(140, 0.14, 'square', 0.05, 0.5); if (t.killedByHead) tone(2400, 0.12, 'triangle', 0.04, 1.2, 0.04);
    }
    if (t.kind === 'hero' && src !== P && t.assisters?.includes(P)) {             // you helped: an assist
      killIcon(camera, chestOf(t).setY(t.pos.y + 1.6), 'assist', 'Assist');
      tone(740, 0.08, 'triangle', 0.05, 1.3); tone(1110, 0.1, 'triangle', 0.04, 1.2, 0.06);
    }
    if (t.kind === 'hero' && src === P) { banner(`Eliminated ${t.name}`, 'var(--red)', `“${P.def.rivals?.[t.def.id] && Math.random() < 0.7 ? P.def.rivals[t.def.id] : pick(P.def.quips.kill)}”`); tone(600, 0.25, 'triangle', 0.08, 2); }
    else if (t === P && src?.kind === 'hero' && src.def.rivals?.[P.def.id]) sayLine(src, src.def.rivals[P.def.id]);   // rivals gloat
    else if (t === P) say(P, 'death');
    else if (t.kind === 'hero' && src && src.kind === 'hero') say(src, 'kill', t);
    if (t.kind === 'tower') { const theirs = t.team !== G.playerTeam; banner(theirs ? 'Enemy tower down. Core exposed' : 'Our tower fell', theirs ? 'var(--blue)' : 'var(--red)'); tone(90, 0.6, 'sawtooth', 0.1, 0.4); }
    if (t.kind === 'boss' && !G.over) { G.over = true; if (G.story) G.story.endT = G.time; banner(`${G.raid.def.name.toUpperCase()} FALLS!`, 'var(--blue)', `With ${Math.floor(G.raid.time / 60)}:${String(Math.floor(G.raid.time % 60)).padStart(2, '0')} to spare`); tone(110, 1, 'sawtooth', 0.1, 0.3); endLater(true, 2200); }
    if (t.kind === 'core' && !G.over) {                // the host tells everyone, so nobody is left playing after the core falls
      const w = t.team === 'blue' ? 'red' : 'blue', ours = w === G.playerTeam;
      G.over = true;
      if (G.net?.host) G.net.queue({ k: 'end', w, y: 'core' });
      banner(ours ? 'Enemy core destroyed!' : 'Our core fell', ours ? 'var(--blue)' : 'var(--red)');
      endLater(ours, 1400);
    }
    if (G.duel && t.kind === 'hero' && (!G.net || G.net.host)) duelKnockout(t, src);
    if (G.mode === 'survivor' && t.kind === 'hero') {
      const left = G.aliveCount;
      if (t === P) { survEndT = 2.6; banner(`Eliminated · #${t.place}`, 'var(--red)', src && src.kind === 'hero' ? `by ${src.name}` : 'The storm got you'); }
      else if (P.alive && left === 1) { banner('MAXX OUT!', '#9b5cff', 'Last one standing'); endLater(true, 1500); G.over = true; }
      else if (P.alive && (left <= 5 || src === P)) $('feed').firstChild && ($('feed').firstChild.innerHTML += ` <small>· ${left} left</small>`);
    }
  },
  immune(t, src) {
    if (src === P && G.time > immuneTipT) { immuneTipT = G.time + 3; banner('Core is shielded. Take down a tower first', '#1d2340'); }
  },
  // Smash Ball: goals, golden goal and full time
  ball(type, T, team, scorer, own, assist) {
    const nm = u => u.isPlayer ? 'You' : u.name, us = G.playerTeam;
    if (type === 'kickoff') { tone(880, 0.08, 'square', 0.05, 1); tone(1320, 0.12, 'square', 0.05, 1, 0.08); }
    if (type === 'stuck') banner('Ball reset', '#1d2340', 'Nobody could reach it');
    if (type === 'ot') { banner('Golden goal!', '#e0a100', 'Level at full time · next goal wins'); [523, 659, 784].forEach((f, i) => tone(f, 0.14, 'square', 0.05, 1, i * 0.08)); }
    if (type === 'goal') {
      if (own && scorer === P) G.ownGoal = true;
      const ours = team === us;
      banner(ours ? 'GOAL!' : 'They scored', ours ? 'var(--blue)' : 'var(--red)',
        `${scorer ? (own ? `${nm(scorer)} · own goal!` : `${nm(scorer)} scores${assist ? ` · assist ${nm(assist)}` : ''}`) : 'Goal'} · ${T.pts[us]} – ${T.pts[us === 'blue' ? 'red' : 'blue']}`);
      (ours ? [523, 659, 784, 1046, 1318] : [330, 262, 196]).forEach((f, i) => tone(f, 0.16, ours ? 'square' : 'triangle', 0.06, 1, i * 0.08));
      if (scorer === P && !own) killIcon(camera, T.pos.clone().setY(T.pos.y + 2), 'kill', 'Goal!');
    }
    if (type === 'end' && !G.over) {
      G.over = true;
      const ours = team === us;
      banner(ours ? 'You win!' : 'They win', ours ? 'var(--blue)' : 'var(--red)', `Full time · ${T.pts[us]} – ${T.pts[us === 'blue' ? 'red' : 'blue']}`);
      tone(ours ? 660 : 160, 0.6, 'triangle', 0.08, ours ? 1.8 : 0.6);
      endLater(ours, 1800);
    }
  },
  potato(type, T, h, from, scorer) {
    const nm = u => u.isPlayer ? 'You' : u.name;
    if (type === 'start') {
      banner(h === P ? 'You have the bomb!' : `${nm(h)} has the bomb`, h.team === G.playerTeam ? 'var(--blue)' : 'var(--red)', h === P ? 'Hit an enemy to pass it on' : `Round ${T.round} · ${Math.round(T.maxFuse)}s fuse`);
      tone(h === P ? 220 : 440, 0.3, 'sawtooth', 0.06, h === P ? 0.7 : 1.3);
    } else if (type === 'pass') {
      if (h === P) { banner('Tag, you’re it!', 'var(--red)', `${nm(from)} gave you the bomb. Hit an enemy!`); tone(180, 0.25, 'square', 0.07, 0.6); }
      else if (from === P) { banner('Passed it!', 'var(--blue)', `${nm(h)} has the bomb now`); tone(880, 0.12, 'triangle', 0.07, 1.4); }
      else tone(h.team === G.playerTeam ? 260 : 620, 0.08, 'triangle', 0.04, 1);
    } else if (type === 'hop' && h === P) { banner('The bomb jumped to you!', 'var(--red)', 'Your holder went down. Hit an enemy!'); tone(200, 0.2, 'square', 0.06, 0.7); }
    else if (type === 'boom' || type === 'win') {
      const ours = scorer === G.playerTeam;
      tone(70, 0.7, 'sawtooth', 0.12, 0.4); tone(110, 0.6, 'square', 0.06, 0.5, 0.05);
      if (type === 'win') { G.over = true; banner(ours ? 'Last blast!' : 'They got the last blast', ours ? 'var(--blue)' : 'var(--red)', `${T.pts.blue} – ${T.pts.red}`); endLater(ours, 1500); }
      else banner(ours ? `BOOM! ${nm(h)} blew up` : `BOOM! We lost ${nm(h)}`, ours ? 'var(--blue)' : 'var(--red)', `${T.pts.blue} – ${T.pts.red} · next bomb in ${POTATO.between}s`);
    }
  },
  cart(type, C, team) {
    const ours = team === G.playerTeam, col = ours ? 'var(--blue)' : 'var(--red)';
    if (type === 'push' && G.time > hillBannerT) {
      hillBannerT = G.time + 5;
      banner(ours ? 'Cart moving' : 'They have the cart', col, ours ? 'Stay close to keep it rolling' : 'Get on it to stop them');
      tone(ours ? 620 : 210, 0.25, 'triangle', 0.07, ours ? 1.4 : 0.7);
    } else if (type === 'contest' && nearCart(G, P)) tone(330, 0.1, 'square', 0.04, 1);
    else if (type === 'half') { banner(ours ? 'Halfway to their flag' : 'Cart halfway to our base!', col); tone(ours ? 780 : 180, 0.35, 'sawtooth', 0.06, ours ? 1.5 : 0.6); hillBannerT = G.time + 3; }
    else if (type === 'overtime') { banner('OVERTIME', '#3ccf9a', 'Dead even. First push wins'); tone(110, 0.8, 'sawtooth', 0.1, 2); }
    else if (type === 'win' || type === 'time') {
      G.over = true;
      const L = cartLead(C);
      banner(type === 'win' ? (ours ? 'Cart delivered!' : 'They delivered the cart') : (ours ? 'Time! The cart is on their side' : 'Time! The cart is on our side'), col,
        `${Math.round(L.blue * 100)}% – ${Math.round(L.red * 100)}%`);
      endLater(ours, 1400);
    }
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
      endLater(ours, 1400);
    }
  },
  // online: the host called the result
  netRound(e) { applyDuel(e); },
  netEnd(team, why) {
    if (G.over) return;
    G.over = true;
    const ours = team === G.playerTeam, H = G.hill;
    if (why === 'core') banner(ours ? 'Enemy core destroyed!' : 'Our core fell', ours ? 'var(--blue)' : 'var(--red)');
    else if (H) banner(ours ? 'Hill secured' : 'They held the hill', ours ? 'var(--blue)' : 'var(--red)', `${Math.floor(H.pts2.blue)} – ${Math.floor(H.pts2.red)}`);
    else {                                                            // Lane Breaker went to time
      const core = t => G.structures.find(s => s.kind === 'core' && s.team === t), pct = t => Math.round(core(t).hp / core(t).maxHp * 100);
      banner('Time!', ours ? 'var(--blue)' : 'var(--red)', `Cores: ${pct('blue')}% – ${pct('red')}%`);
    }
    endLater(ours, 1400);
  },
  netLeft(h) {
    const el = document.createElement('div');
    el.innerHTML = `<span class="n">${h.name} left the match</span>`;
    $('feed').prepend(el); setTimeout(() => el.remove(), 6000);
  },
  shot(h) {
    recEvent(G, 'shot', h);
    if (h === P) { if (h.def.id !== 'avalanche' || Math.random() < 0.5) SHOT[h.def.id](1); recoil = Math.min(1, recoil + RECOIL[h.def.id]); return; }
    const d = h.pos.distanceTo(P.pos);
    if (d < 40 && (h.def.id !== 'avalanche' || Math.random() < 0.3)) SHOT[h.def.id](0.5 * (1 - d / 40));
  },
  surface(h) {
    const d = h === P ? 0 : h.pos.distanceTo(P.pos);
    if (d < 40) { const v = h === P ? 1 : 0.6 * (1 - d / 40); noise(0.5, 0.14 * v, 1200, 0, { type: 'lowpass', to: 200 }); tone(90, 0.4, 'sine', 0.18 * v, 0.5); }
  },
  ability(h, slot) {
    recEvent(G, slot, h);
    if (h === P || !(h.invisT > 0)) { castFx(G, h, slot); castCue(G, h, slot, h === P); }
    if (h === P && G.tutorial) tutorialCast(slot);
    const d = h === P ? 0 : h.pos.distanceTo(P.pos), near = d < 25;
    const sfx = ABIL_SFX[h.def[slot]?.id];
    if (sfx) { if (d < 45) sfx(h === P ? 1 : 0.6 * (1 - d / 45)); }
    else if (near) tone(slot === 'ult' ? 200 : 360, 0.25, 'triangle', 0.05, 1.6);
    if (h === P && slot === 'ult') { tone(220, 0.6, 'sawtooth', 0.05, 3); ultFlash(h.def.color); }
    // super call-outs (banner and voice line) only for your own super or ones going off nearby
    if (slot === 'ult' && (h === P || d < ULT_NEAR)) {
      banner(`${h.isPlayer ? 'You' : h.def.callsign}: ${h.def.ult.name}!`, h.team === 'blue' ? 'var(--blue)' : 'var(--red)', `“${pick(h.def.quips.ult)}”`);
      say(h, 'ult');
    } else if (near && Math.random() < 0.6) say(h, 'ability');
  },
};

// Per-hero feel for the first-person gun.
const RECOIL = { swapper: 0.15, hippo: 0.02, vanguard: 0.25, striker: 0.18, ember: 0.7, warden: 1, thicket: 0.9, ratchet: 0.3, mirage: 0.3, avalanche: 0.55, tempo: 0.06, kestrel: 0.4, croc: 0.6, cavalier: 0.45, slime: 0.5, brawler: 0, chipmunk: 0.12, elf: 0.35, dancer: 0.05, mole: 0.7, medic: 0.2, spark: 0.06, builder: 0.6, wellington: 0.45, shepherd: 0.35, microwave: 0.04, chef: 0.9, manspider: 0.15, pinball: 0.2, clawbot: 0.4, pixel: 0.15, owl: 0.12, unicorn: 0.14, magnet: 0.16 };
const ULT_NEAR = 30;                                  // metres: supers further away than this stay quiet
const VOICE_NEAR = 25;                                // metres: other heroes' voice lines only play inside this
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
// kind picks a random line; on a kill, a rival line for that victim wins most of the time
function say(h, kind, victim) {
  if (kind === 'kill' && victim?.kind === 'hero' && h.def.rivals?.[victim.def.id] && Math.random() < 0.7) return sayLine(h, h.def.rivals[victim.def.id]);
  sayLine(h, pick(h.def.quips[kind] || []));
}
function sayLine(h, line) {
  if (!cfg.voiceLines) return;
  if (!line) return;
  if (h !== P && P?.pos && h.pos && h.pos.distanceTo(P.pos) > VOICE_NEAR) return;   // other heroes are only heard up close
  const v = $('voice');
  const side = h.team === 'blue' ? 'b' : 'r';
  v.innerHTML = `<b class="${side}">${h.def.callsign}${h.isPlayer ? ' <small>(you)</small>' : ''}</b> “${line}”`;
  v.style.opacity = 1; voiceT = Math.min(4, 1.6 + line.length * 0.035);            // longer lines stay up longer
}

// ---------- input ----------
addEventListener('keydown', e => {
  if ((e.code === 'Space' || e.code === kb('jump')) && G?.victory) { e.preventDefault(); endVictory(); return; }
  if ((e.code === 'Space' || e.code === kb('jump')) && ((potgG && potgG === G) || (mvpG && mvpG === G))) { e.preventDefault(); showEnd(); return; }
  // Esc always gets you out once a match is over, from the highlight, the awards or the results
  if (e.code === 'Escape' && G?.ended && $('front').classList.contains('hidden')) { toMenu('main'); return; }
  if (e.code === kb('board')) { e.preventDefault(); if (running) { $('sbBody').innerHTML = scoreTable(); $('scoreboard').classList.remove('hidden'); } }
  keys.add(e.code);
  if (!running || paused) return;
  if (G?.countT > 0) return;
  if (e.code === kb('reload')) startReload(P);
  if (e.code === kb('spray')) trySpray();
  if (e.code === kb('emote') && !e.repeat) openWheel();
  const slot = { [kb('q')]: 'q', [kb('ability')]: 'ability', [kb('ult')]: 'ult' }[e.code];
  if (slot) cancelEmote();
  if (slot) { if (!castSlot(G, P, slot, { wish: wishDir(), aim: dirFrom(P.yaw, P.pitch) })) tone(160, 0.08, 'square', 0.04, 1); else rumble(slot === 'ult' ? 0.6 : 0.12, slot === 'ult' ? 0.9 : 0.3, slot === 'ult' ? 280 : 70); }
});
addEventListener('keyup', e => { keys.delete(e.code); if (e.code === kb('board')) $('scoreboard').classList.add('hidden'); if (e.code === kb('emote')) closeWheel(running && !paused); });
addEventListener('mousedown', e => { if (e.button === 0) mouseDown = true; if (e.button === 2) zoomDown = true; });
addEventListener('contextmenu', e => { if (running) e.preventDefault(); });         // right click zooms in a match, no menu
addEventListener('mouseup', e => { if (e.button === 0) mouseDown = false; if (e.button === 2) zoomDown = false; });
canvas.addEventListener('click', () => { if (running && !document.pointerLockElement) canvas.requestPointerLock(); });
document.addEventListener('pointerlockchange', () => {
  const locked = document.pointerLockElement === canvas;
  if (running && !locked) {
    paused = true; mouseDown = false; zoomDown = false; keys.clear(); closeWheel(false);
    if (padMode()) showPauseSheet(); else $('pause').querySelector('p').textContent = G?.net ? 'The online match keeps going. Click resume to jump back in.' : 'Click resume to lock the mouse again.';
    $('pause').classList.remove('hidden');
  }
  if (locked) { paused = false; $('pause').classList.add('hidden'); }
});
// Browsers only lock the mouse after a click. Players who didn't press Start (online guests)
// get a "click to jump in" sheet instead of a frozen camera.
function askForClick() {
  if (!running || document.pointerLockElement === canvas || padMode()) return;           // a controller doesn't need the mouse locked
  paused = true; mouseDown = false; zoomDown = false; keys.clear();
  $('pause').querySelector('p').textContent = G?.net ? 'The match has started! Click resume to jump in.' : 'Click resume to lock the mouse.';
  $('pause').classList.remove('hidden');
}
function lockMouse() {
  try { const p = canvas.requestPointerLock(); p?.catch?.(askForClick); } catch { askForClick(); }
}
document.addEventListener('pointerlockerror', askForClick);
document.addEventListener('mousemove', e => {
  if (!running || paused || !P) return;
  if (wheel) { wheelMove(e.movementX, e.movementY); return; }              // the wheel borrows the mouse while it's open
  const k = 0.0022 * cfg.sens * (1 - zoomA * 0.42);                       // slower turning while zoomed in
  P.yaw -= e.movementX * k;
  P.pitch = Math.max(-1.5, Math.min(1.5, P.pitch - e.movementY * k * (cfg.invertY ? -1 : 1)));
});

// On a controller there's no mouse to lock: Start pauses and resumes directly.
function padPause() {
  if (!running || paused || G?.ended) return;
  if (document.pointerLockElement === canvas) { document.exitPointerLock(); return; }     // the lock handler shows the pause sheet
  paused = true; mouseDown = false; zoomDown = false; keys.clear(); closeWheel(false);
  showPauseSheet();
}
function showPauseSheet() {
  $('pause').querySelector('p').textContent = G?.net ? `The online match keeps going. Press ${padGlyph('start')} to jump back in.` : `Press ${padGlyph('start')} or Resume to carry on.`;
  $('pause').classList.remove('hidden');
}
function resume() {
  if (!padMode()) { canvas.requestPointerLock(); return; }
  paused = false; $('pause').classList.add('hidden');
}
const pauseOpen = () => running && paused && !$('pause').classList.contains('hidden') && !settingsVisible();
initPad({
  playing: () => running && !paused && !G?.ended && $('front').classList.contains('hidden') && !settingsVisible(),
  inMatch: () => !!G,
  pause: padPause,
  back: () => { if (pauseOpen()) { resume(); return true; } return false; },
  start: () => { if (pauseOpen()) { resume(); return true; } return false; },
  blip: f => tone(f, 0.04, 'triangle', 0.025, 1),
  onMode: on => {
    if (G && running) [['abQ', 'q'], ['abE', 'ability'], ['abF', 'ult']].forEach(([el, id]) => { $(el).querySelector('b').textContent = keyOf(id); });
    if (on && running && paused && !$('pause').classList.contains('hidden')) showPauseSheet();
    if (!on && running && !paused && document.pointerLockElement !== canvas) askForClick();   // picked the mouse back up: lock it again
  },
});
$('resume').onclick = () => resume();
// Leaving an online match mid-game also leaves the room; after a match you go back to the lobby.
const toMenu = (where = 'main') => {
  const net = G?.net, midMatch = net && !G.over;
  if (G?.ranked && !G.ended && !G.awarded && !G.tutorial) { G.awarded = true; recordRanked({ win: false, left: true, mode: G.mode, map: G.map.id, hero: P.def.id }); }   // leaving a ranked match is a loss
  net?.close();
  if (midMatch || (net && where === 'main')) leaveRoom();
  running = false; paused = false; hidePotg(); G = null; document.exitPointerLock?.(); stopTutorial();
  resetJuice(); clearCastCue();
  playMusic('menu');
  ['end', 'pause'].forEach(id => $(id).classList.add('hidden')); $('hud').classList.add('hidden');
  showMenu(net && !midMatch && where !== 'main' ? 'online' : where);
};
$('again').onclick = () => (G?.net ? toMenu('online') : G?.ranked ? toMenu('ranked') : startGame());
$('clipSave').onclick = () => {
  if (!lastClip || clipSaved) return;
  saveClip(lastClip).then(() => { clipSaved = true; clipButtons(); tone(784, 0.12, 'triangle', 0.05, 1.2); }).catch(() => { $('clipSave').textContent = 'Couldn’t save (storage full?)'; });
};
$('clipSend').onclick = () => { if (lastClip) sendClip(lastClip).then(r => { if (r === 'downloaded') $('clipSend').textContent = '✓ Downloaded'; if (r === 'shared') $('clipSend').textContent = '✓ Sent'; }); };
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
  if (keys.has(kb('fwd'))) w.add(f); if (keys.has(kb('back'))) w.sub(f);
  if (keys.has(kb('right'))) w.add(r); if (keys.has(kb('left'))) w.sub(r);
  if (padMode() && (pad.lx || pad.ly)) w.addScaledVector(f, -pad.ly).addScaledVector(r, pad.lx);    // the left stick
  return w.lengthSq() ? w.normalize() : w;
}

// ---------- controller aiming ----------
// The right stick turns at a set speed with a curve for fine aim near the centre, and speeds up
// when held all the way over. Aim assist (offline and online, heroes only) slows the turn a little
// while your crosshair is on an enemy, and drifts with them if they strafe.
let padBoost = 0;
const AIM = { turn: 3.2, pitch: 0.72, curve: 1.8, boost: 0.75, slow: 0.6, pull: 2.4 };
function assistTarget() {
  const eye = eyeOf(P), dir = dirFrom(P.yaw, P.pitch), range = Math.min(80, P.def.weapon.range || 40);
  let best = null, bs = Infinity;
  for (const h of G.heroes) {
    if (h === P || !h.alive || h.team === P.team && G.mode !== 'survivor' || h.invisT > 0 || h.dummy && !G.tutorial) continue;
    const c = chestOf(h), to = c.clone().sub(eye), d = to.length();
    if (d > range || d < 1) continue;
    const along = to.dot(dir); if (along <= 0) continue;
    const side = Math.sqrt(Math.max(0, d * d - along * along)), lim = 1.2 + d * 0.035;     // how far off the crosshair, in metres
    if (side > lim || side / lim >= bs || !hasLOS(eye, c, G.colliders)) continue;
    bs = side / lim; best = c;
  }
  return best;
}
function padAim(dt) {
  const m = Math.hypot(pad.rx, pad.ry);
  padBoost = m > 0.94 ? Math.min(1, padBoost + dt * 2.5) : 0;
  const t = cfg.aimAssist !== false ? assistTarget() : null;
  const k = AIM.turn * cfg.padSens * (1 - zoomA * 0.5) * (1 + padBoost * AIM.boost) * (t ? AIM.slow : 1) * dt, c = m ? Math.pow(m, AIM.curve) / m : 0;
  P.yaw -= pad.rx * c * k;
  P.pitch = Math.max(-1.5, Math.min(1.5, P.pitch - pad.ry * c * k * AIM.pitch * (cfg.padInvert ? -1 : 1)));
  if (t && (m > 0.08 || Math.hypot(pad.lx, pad.ly) > 0.2)) {           // only while you're aiming or moving: it never aims for you
    const e = eyeOf(P), dx = t.x - e.x, dy = t.y - e.y, dz = t.z - e.z;
    let dyaw = Math.atan2(-dx, -dz) - P.yaw; dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw));
    const dpitch = Math.atan2(dy, Math.hypot(dx, dz)) - P.pitch, s = Math.min(1, dt * AIM.pull);
    P.yaw += dyaw * s; P.pitch += dpitch * s * 0.5;
  }
}

// ---------- sprays ----------
// T tags the wall or floor you're looking at with your equipped spray (one on the map at a time).
let sprayAt = -99;
function trySpray() {
  const c = cosById(equippedCos().spray);
  if (!c || c.type !== 'spray' || !cosOwned(c.id)) { floatText(G, chestOf(P).setY(P.pos.y + 2.2), 'No spray equipped (equip one in Slots)', '#ffffff', 0.8); tone(160, 0.08, 'square', 0.04, 1); return; }
  if (!P.alive || G.time - sprayAt < SPRAY_CD) { tone(160, 0.08, 'square', 0.04, 1); return; }
  const hit = aimSpray(G, eyeOf(P), dirFrom(P.yaw, P.pitch));
  if (!hit) { floatText(G, chestOf(P).setY(P.pos.y + 2.2), 'Get closer to a wall', '#ffffff', 0.8); tone(160, 0.08, 'square', 0.04, 1); return; }
  sprayAt = G.time;
  placeSpray(G, P.key || 'me', c, hit.p, hit.n, P.yaw);
  if (!G.tutorial) bumpAndCheck('sprays');
  noise(0.32, 0.07, 2600, 0, { type: 'bandpass', to: 5200, q: 1.2 }); tone(1180, 0.05, 'triangle', 0.03, 1.1, 0.3);
  G.net?.spray(P, c.id, hit.p, hit.n);
}

// ---------- emotes ----------
// Hold B for the emote wheel, nudge the mouse toward one and let go. You keep moving and the
// camera stays first person; firing or using an ability cancels it.
let emoteAt = -99, wheel = null;
const emoteBusy = () => G.time >= emoteAt && G.time - emoteAt < EMOTE_CD;   // a new match restarts the clock
const EMOTE_SFX = {
  wave: () => { tone(660, 0.08, 'triangle', 0.04, 1.2); tone(880, 0.1, 'triangle', 0.04, 1.1, 0.1); },
  cheer: () => { noise(0.5, 0.05, 1800, 0, { type: 'bandpass', to: 3000, q: 0.8 }); [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, 'square', 0.025, 1, i * 0.08)); },
  dance: () => { [392, 494, 587, 494, 392, 587].forEach((f, i) => tone(f, 0.1, 'triangle', 0.035, 1, i * 0.18)); },
  laugh: () => { for (let i = 0; i < 5; i++) tone(520 - i * 30, 0.07, 'sawtooth', 0.025, 0.85, i * 0.12); },
  thumbs: () => { tone(740, 0.08, 'triangle', 0.04, 1); tone(1110, 0.14, 'triangle', 0.04, 1, 0.08); },
  taunt: () => { tone(180, 0.18, 'sawtooth', 0.04, 0.7); tone(140, 0.22, 'sawtooth', 0.04, 0.7, 0.2); },
  bow: () => { tone(880, 0.25, 'sine', 0.04, 0.6); },
  line: () => { tone(980, 0.05, 'triangle', 0.03, 1.1); },
};
function openWheel() {
  if (!P?.alive || wheel || G.tutorial) return;
  wheel = { x: 0, y: 0, sel: -1, list: wheelEmotes() };
  const el = $('emoteWheel');
  el.innerHTML = wheel.list.map((e, i) => {
    const a = i / wheel.list.length * Math.PI * 2 - Math.PI / 2;
    return `<div class="ew-slot" style="left:${50 + Math.cos(a) * 36}%;top:${50 + Math.sin(a) * 36}%"><b>${e.icon}</b><small>${e.name}</small></div>`;
  }).join('') + `<div class="ew-mid">${emoteBusy() ? 'Wait a moment…' : (padMode() ? `Tilt the right stick<br>Release ${keyOf('emote')}` : 'Move the mouse<br>Release B')}</div>`;
  el.classList.remove('hidden');
}
function wheelMove(dx, dy) {
  wheel.x = Math.max(-120, Math.min(120, wheel.x + dx)); wheel.y = Math.max(-120, Math.min(120, wheel.y + dy));
  if (Math.hypot(wheel.x, wheel.y) < 30) wheel.sel = -1;
  else { const n = wheel.list.length, a = Math.atan2(wheel.y, wheel.x) + Math.PI / 2; wheel.sel = ((Math.round(a / (Math.PI * 2) * n) % n) + n) % n; }
  $('emoteWheel').querySelectorAll('.ew-slot').forEach((s, i) => s.classList.toggle('on', i === wheel.sel));
}
function closeWheel(play) {
  if (!wheel) return;
  const sel = wheel.sel, list = wheel.list; wheel = null;
  $('emoteWheel').classList.add('hidden');
  if (play && sel >= 0) tryEmote(list[sel].id);
}
function tryEmote(id) {
  if (!P.alive || emoteBusy()) { tone(160, 0.08, 'square', 0.04, 1); return; }
  if (!startEmote(G, P, id)) return;
  emoteAt = G.time;
  if (!G.tutorial && G.time - (P._lastKillT ?? -99) < 3) feat('showboat');
  G.net?.emote(P, id);
  const el = $('myEmote'), e = EMOTES.find(x => x.id === id);
  el.innerHTML = `<b>${e.icon}</b><small>${e.name}</small>`; el.className = ''; void el.offsetWidth; el.className = 'on';
}
function cancelEmote() {
  if (!P.emote) return;
  $('myEmote').className = 'hidden';
  stopEmote(G, P);
  G.net?.emote(P, null);
}

// ---------- per-frame ----------
function updatePlayer(dt) {
  if (!P.alive) {
    P.respawnT -= dt;
    $('center').classList.remove('hidden');
    const kc = killCamera(dt);
    $('center').textContent = kc ? (G.killCam.rp ? `▶ Kill cam · through ${G.killCam.who.name}’s eyes` : `Kill cam · ${G.killCam.who.name}`) : G.mode === 'survivor' ? (G.over ? 'Spectating' : 'Eliminated') : G.mode === 'duel' ? (G.over ? 'Duel over' : G.heroes.some(h => h.team === P.team && h.alive) ? 'Knocked out · your team fights on' : 'Knocked out · next round soon') : `Respawning in ${Math.max(0, P.respawnT).toFixed(1)}s`;
    if (!kc) {
      camera.position.lerp(new THREE.Vector3(P.pos.x, P.pos.y + 14, P.pos.z - Math.sign(P.pos.z || 1) * 10), Math.min(1, dt * 2));
      camera.lookAt(P.pos);
    }
    viewGun.visible = false; viewHand.visible = false; closeWheel(false);
    if (P.emote) { stopEmote(G, P); $('myEmote').className = 'hidden'; }
    if (G.mode === 'survivor') { if (survEndT > 0 && (survEndT -= dt) <= 0) endGame(false); return; }
    if (P.respawnT <= 0) { spawnHero(G, P); P._lowSaid = false; say(P, "spawn"); endKillCam(G, G.killCam?.rp); G.killCam = null; $('recap').classList.add('hidden'); }
    return;
  }
  $('center').classList.add('hidden'); $('recap').classList.add('hidden');
  viewGun.visible = true; viewHand.visible = true;
  const w = wishDir();
  const firing = mouseDown || pad.fire;
  if (padMode()) {
    if (wheel) {                                                          // the emote wheel follows the right stick
      if (Math.hypot(pad.rx, pad.ry) > 0.45) { wheel.x = wheel.y = 0; wheelMove(pad.rx * 120, pad.ry * 120); }
    } else padAim(dt);
  }
  if (P.emote && firing) cancelEmote();
  const sprint = ((keys.has(kb('sprint')) && keys.has(kb('fwd'))) || (pad.sprint && pad.ly < -0.4)) && !firing && P.onGround;
  steer(P, w, sprint, keys.has(kb('jump')), dt);
  const vyBefore = P.vel.y;
  tickHero(G, P, dt);
  if (!wasGround && P.onGround) { landA = Math.min(1, Math.max(0, -fallV - 4) / 10); landDust(G, P, landA); if (landA > 0.3) rumble(landA * 0.45, landA * 0.2, 90); }
  wasGround = P.onGround; fallV = vyBefore;
  if (firing) {
    const tip = viewGun.getObjectByName('tip').getWorldPosition(new THREE.Vector3());
    if (fire(G, P, dirFrom(P.yaw, P.pitch), tip)) {
      P.pitch = Math.min(1.5, P.pitch + RECOIL[P.def.id] * 0.03);
      shotBloom(P.def.weapon.rate < 0.15 ? 0.18 : 0.4);
    }
  }
  if (!firing && P.chargeStart != null) {
    const tip = viewGun.getObjectByName('tip').getWorldPosition(new THREE.Vector3());
    const c = chargeLevel(G, P);
    if (releaseFire(G, P, dirFrom(P.yaw, P.pitch), tip)) { P.pitch = Math.min(1.5, P.pitch + 0.015 + c * 0.04); shotBloom(0.3 + c * 0.4); }
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
  // your own emote plays for everyone else; in first person you just get the icon on screen
  if (P.emote) { P.emote.t += dt; P.emote.sp.visible = false; if (P.emote.t >= P.emote.dur) { stopEmote(G, P); $('myEmote').className = 'hidden'; } }

  // view model: sway, recoil, sprint tilt, reload flourish, cast dip
  const cast = Math.min(1, P.castA);
  const rl = P.reloadT > 0 ? 1 - P.reloadT / P.def.weapon.reload : 0;
  const rlArc = Math.sin(rl * Math.PI);
  viewGun.position.set(
    (0.24 + Math.cos(bob) * 0.012 + sprintA * 0.04) * (1 - zoomA * 0.85),
    -0.22 + zoomA * 0.06 + Math.abs(Math.sin(bob)) * 0.012 * (1 - zoomA) - cast * 0.18 - landA * 0.05 - rlArc * 0.06,
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
  // zoom: narrow the view, bring the gun to the middle and steady the aim (P.zoomA, read by fire)
  zoomA += (((zoomDown || pad.zoom) && P.alive && !wheel ? 1 : 0) - zoomA) * Math.min(1, dt * 12); P.zoomA = zoomA;
  $("cross").style.transform = `translate(-50%,-50%) scale(${((1 - zoomA * 0.3) * crossScale()).toFixed(3)})`;
  const fovT = cfg.fov * (1 - zoomA * 0.42) + (sprintA * 6 + (P.castA > 1 ? 8 : 0) + (P.dashT > 0 ? 10 : 0)) * (1 - zoomA);
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
  if (t > TUNING.laneLimit && (!G.net || G.net.host)) {             // online, the host calls time
    const core = team => G.structures.find(s => s.kind === 'core' && s.team === team);
    const b = core('blue').hp / core('blue').maxHp, r = core('red').hp / core('red').maxHp;
    const blue = b === r ? G.score.blue >= G.score.red : b > r, win = blue === (G.playerTeam === 'blue');
    G.over = true;
    G.net?.queue({ k: 'end', w: blue ? 'blue' : 'red' });
    banner('Time!', win ? 'var(--blue)' : 'var(--red)', `Cores: ${Math.round(b * 100)}% – ${Math.round(r * 100)}%`);
    endLater(win, 1600);
  }
}

function updateHud(dt) {
  const w = P.def.weapon;
  // inside the enemy Guardian's ring: a big warning, and a countdown to the first slam
  const gw = $('guardWarn'), inG = G.guardians && P.alive && !G.over && guardianOf(G, P);
  gw.classList.toggle('hidden', !inG);
  if (inG) gw.innerHTML = `<b>⚠ Enemy Guardian</b><small>${P.guardT < 1 ? 'Get out of their base!' : 'It’s coming for you. MOVE!'}</small>`;
  $('hpBar').style.width = (100 * P.hp / P.maxHp) + '%';
  $('hpBar').style.background = P.hp / P.maxHp < 0.35 ? 'var(--red)' : 'var(--mint)';
  $('hHp').textContent = `${Math.ceil(P.hp)} / ${P.maxHp}`;
  $('mag').textContent = P.reloadT > 0 ? '··' : P.ammo;
  if (w.mode === 'prism') {                                                 // Prism: the next colour of the rainbow
    const n = PRISM[((P.hue ?? -1) + 1) % PRISM.length], el = $('wName'), night = P.nightT > 0;
    const txt = night ? `${w.name} · NIGHTMARE` : `${w.name} · next ${n.name}`;
    if (el.textContent !== txt) { el.textContent = txt; el.style.color = night ? '#b06aff' : '#' + n.color.toString(16).padStart(6, '0'); }
  }
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
  if (P.lurkT > 0) st.push('Lurking'); if (P.rallyT > 0) st.push('Rallied +30% dmg'); if (P.jamT > 0) st.push('Jammed');
  if (P.vigilT > 0) st.push('Vigil'); if (P.frozenT > 0) st.push('Frozen'); if (P.blindT > 0) st.push('Dazzled'); if (P.wet < 1) st.push('Wading');
  $('dazzle').style.opacity = P.blindT > 0 ? Math.min(0.92, P.blindT / 3 * 0.92 + 0.25) : 0;   // Cinder's Grand Finale whites out your screen
  // status effects: chips beside the minimap, green for buffs and red for debuffs
  const html = st.map(s => `<span class="${/^(Haste|Invisible|Shielded|Lurking|Rallied|Vigil)/.test(s) ? 'buff' : 'debuff'}">${s}</span>`).join('');
  const sEl = $('status'); if (sEl._h !== html) { sEl._h = html; sEl.innerHTML = html; }
  $('hud').classList.toggle('invis', P.invisT > 0);
  const t = Math.floor(G.mode === 'lane' ? Math.max(0, TUNING.laneLimit - G.time) : G.mode === 'cart' ? Math.max(0, CART.limit - G.time) : G.time);
  $('clock').firstChild.textContent = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
  if (G.mode === 'survivor') updateSurvHud(); else if (G.mode === 'hill') updateHillHud(); else if (G.mode === 'cart') updateCartHud(); else if (G.mode === 'potato') updatePotatoHud(); else if (G.mode === 'ball') updateBallHud(); else if (G.mode === 'raid') updateRaidHud(); else if (G.story) updateStoryHud(); else if (G.mode === 'duel') updateDuelHud(dt); else {
    $('kB').textContent = G.score.blue; $('kR').textContent = G.score.red;
    const core = t => G.structures.find(s => s.kind === 'core' && s.team === t);
    $('coreB').style.width = (100 * core('blue').hp / core('blue').maxHp) + '%';
    $('coreR').style.width = (100 * core('red').hp / core('red').maxHp) + '%';
    $('wave').textContent = `minions in ${Math.ceil(G.waveT)}`;
  }
  const ch = chargeLevel(G, P);
  // the ring doubles as Torque's momentum meter
  const melee = P.def.weapon.mode === "melee", wings = P.def.passive?.id === "nightflight" && P.alive && P.chargeStart == null && (P.wing < 100 || !P.onGround);
  const fillC = melee ? (P.momentum || 0) / 100 : wings ? P.wing / 100 : ch;       // ...and Hoot's wing stamina
  $("charge").style.opacity = P.chargeStart != null || (melee && P.alive) || wings ? 1 : 0;
  $("charge").style.setProperty("--c", (fillC * 100).toFixed(0) + "%");
  $("charge").classList.toggle("full", fillC >= 1);
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
    // a small health bar under each standing tower and core
    if (st.alive && st.maxHp) {
      const f = Math.max(0, Math.min(1, st.hp / st.maxHp)), bw = r * 2 + 6, bx = X(st.pos.x) - bw / 2, by = Y(st.pos.z) + r + 2;
      mctx.fillStyle = '#1d2340'; mctx.fillRect(bx - 1, by - 1, bw + 2, 5);
      mctx.fillStyle = f > 0.5 ? '#3ccf9a' : f > 0.25 ? '#ffc93c' : '#ff3a3a'; mctx.fillRect(bx, by, bw * f, 3);
    }
  }
  for (const mn of G.minions) { mctx.fillStyle = hex(TEAM_COLOR[mn.team]); mctx.fillRect(X(mn.pos.x) - 1.5, Y(mn.pos.z) - 1.5, 3, 3); }
  if (G.mode === 'hill') {                          // the ring, tinted by who's scoring
    const H = G.hill, holder = !H.contested && (H.count.blue ? 'blue' : H.count.red ? 'red' : null);
    mctx.fillStyle = H.contested ? 'rgba(255,201,60,.75)' : holder ? hex(TEAM_COLOR[holder]) + 'aa' : 'rgba(255,201,60,.4)';
    mctx.strokeStyle = '#1d2340'; mctx.lineWidth = 2;
    mctx.beginPath(); mctx.arc(X(H.pos.x), Y(H.pos.z), Math.max(4, H.r * s), 0, 7); mctx.fill(); mctx.stroke();
  }
  if (G.mode === 'potato' && G.potato.holder?.alive && G.potato.wait <= 0) {   // the bomb: a pulsing orange dot on whoever holds it
    const h = G.potato.holder, r = 6 + Math.sin(G.time * 10) * 2;
    mctx.fillStyle = '#ff5a2a'; mctx.strokeStyle = '#1d2340'; mctx.lineWidth = 2;
    mctx.beginPath(); mctx.arc(X(h.pos.x), Y(h.pos.z), r, 0, 7); mctx.fill(); mctx.stroke();
  }
  if (G.mode === 'cart') {                          // the cart as a square, tinted by who's pushing
    const C = G.cart, c = C.contested ? '#ffc93c' : C.dir > 0 ? hex(TEAM_COLOR.blue) : C.dir < 0 ? hex(TEAM_COLOR.red) : '#fff3c4';
    mctx.fillStyle = c; mctx.strokeStyle = '#1d2340'; mctx.lineWidth = 2;
    mctx.fillRect(X(C.pos.x) - 6, Y(C.pos.z) - 6, 12, 12); mctx.strokeRect(X(C.pos.x) - 6, Y(C.pos.z) - 6, 12, 12);
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

// ---------- victory pose ----------
// On a win the camera swings round in front of your hero for their victory pose; Space skips it.
const VICTORY_T = 3.6;
function startVictory() {
  G.over = true; G.victory = { t: 0, ang: 0 };
  closeWheel(false); if (P.emote) stopEmote(G, P);
  $('myEmote').className = 'hidden'; $('guardWarn')?.classList.add('hidden'); $('center').classList.add('hidden');
  if (!P.alive) { P.alive = true; P.deathT = 0; P.mesh.rotation.set(0, P.yaw, 0); }     // down at the final whistle: back up for the pose
  const V = victoryOf(P.def.id);
  banner('VICTORY!', 'var(--blue)', `${P.def.callsign} · ${V.name} · “${V.line}”`);
  tone(523, 0.2, 'triangle', 0.08, 1); tone(659, 0.2, 'triangle', 0.08, 1, 0.12); tone(784, 0.2, 'triangle', 0.08, 1, 0.24); tone(1047, 0.5, 'triangle', 0.08, 1, 0.36);
}
function victoryFrame(dt) {
  const v = G.victory;
  v.t += dt; v.ang += dt * 0.22;
  viewGun.visible = viewHand.visible = false;
  P.mesh.visible = true;
  P.anim(dt, 0, G.time); poseHero(G, P, dt, camera, G.playerTeam); poseVictory(G, P, v.t, dt);
  P.bar.visible = false;
  for (const h of G.heroes) if (h !== P && h.alive && !h.dummy) { h.anim(dt, 0, G.time); poseHero(G, h, dt, camera, G.playerTeam); }
  // in front of the hero, drifting slowly round
  const a = P.yaw + v.ang - 0.25, d = 4.4;
  camBack.set(P.pos.x - Math.sin(a) * d, P.pos.y + 1.8, P.pos.z - Math.cos(a) * d);
  if (v.t < dt * 1.5) camera.position.copy(camBack); else camera.position.lerp(camBack, Math.min(1, dt * 5));
  camera.lookAt(P.pos.x, P.pos.y + 1.25, P.pos.z);
  if (v.t >= VICTORY_T) endVictory();
}
function endVictory() {
  if (!G?.victory) return;
  G.victory = null; G.victoryDone = true; P.mesh.visible = false;
  endGame(true);
}

// ---------- start-of-match countdown ----------
const COUNT_FROM = 3;
function countdown(dt) {
  const el = $('countdown'), was = Math.ceil(G.countT);
  G.countT -= dt;
  const n = Math.ceil(G.countT);
  if (n !== was || !el.textContent) {
    el.textContent = n > 0 ? n : 'GO!';
    el.className = n > 0 ? '' : 'go';
    void el.offsetWidth; el.classList.add('pop');
    if (n > 0) tone(440, 0.14, 'square', 0.05, 1); else { tone(880, 0.35, 'square', 0.06, 1); tone(1320, 0.3, 'triangle', 0.04, 1, 0.05); }
    if (n <= 0) setTimeout(() => { if (el.classList.contains('go')) el.className = 'hidden'; }, 800);
  }
  eyeOf(P, camera.position);
  camera.rotation.set(P.pitch, P.yaw, 0, 'YXZ');
  for (const h of G.heroes) if (h !== P && h.alive) { h.anim(dt, 0, G.time); poseHero(G, h, dt, camera, G.playerTeam); }
  updateHud(dt);
}
function loop() {
  requestAnimationFrame(loop);
  const raw = Math.min(0.05, clock.getDelta()), dt = raw * (G && running && !paused ? timeScale(raw) : 1);
  padFrame(raw);
  perfFrame(renderer, G?.net ? `online · ${G.heroes.length} players` : G ? `${G.heroes.length} heroes · ${G.minions.length} minions` : "menu");
  if (!G) { if (!menuFrame(renderer, dt)) renderer.clear(); return; }
  // online matches can't pause: the sim keeps running behind the pause sheet
  const live = running && (!paused || !!G.net);
  const counting = live && G.countT > 0;                 // 3, 2, 1: you can look around, nothing else moves yet
  if (counting) { if (padMode() && P?.alive) padAim(dt); countdown(dt); }
  const posing = live && !!G.victory;                    // you won: your hero's victory pose, then the results
  if (posing) victoryFrame(dt);
  if (live && !counting && !posing) {
    G.time += dt;
    G.waveT -= dt;
    if (G.waveT <= 0) { G.waveT = TUNING.waveEvery; if (!G.net || G.net.host) spawnWave(); }   // online, guests mirror the host's minions
    if (G.mode === 'lane' && !G.over && !G.tutorial) laneClock();
    if (G.tutorial && !G.over && tickTutorial(G, { dt, sprinting: sprintA > 0.6 }) === 'done') { G.over = true; banner('Training complete', 'var(--blue)', 'Nicely done'); endLater(true, 2200); }
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
    updateGuardians(G, dt);
    updateMapFx(G, dt);
    if (G.story) updateStory(G, dt, P);
    updateProjectiles(G, dt);
    recFrame(G, dt);
    if (G.mode === 'survivor') updateSurvivor(G, dt);
    if (G.mode === 'hill') { if (G.net && !G.net.host) hillVisuals(G, dt); else updateHill(G, dt); }
    if (G.mode === 'cart') updateCart(G, dt);
    if (G.mode === 'potato') updatePotato(G, dt);
    if (G.mode === 'ball') updateBall(G, dt);
    if (G.mode === 'raid') updateRaid(G, dt);
    // stats for the MVP cards: time on the objective and the longest life
    if (!G.over) for (const h of G.heroes) {
      if (!h.alive) { h.lifeT = 0; continue; }
      h.lifeT = (h.lifeT || 0) + dt; if (h.lifeT > (h.bestLife || 0)) h.bestLife = h.lifeT;
      if ((G.mode === 'hill' && onHill(G, h)) || (G.mode === 'cart' && nearCart(G, h)) || holdsPotato(G, h)) h.objT = (h.objT || 0) + dt;
    }
    G.net?.tick(dt);
    tickFlash(dt);
    updateHud(dt);
    juiceFrame(G, P, camera, dt, { sprintA, mouseDown: mouseDown || pad.fire, raw });
    updateOutlines(G, P);
  }
  if (live) G.worldTick(dt, G.time);
  const replaying = !!G.replay;
  if (replaying) { G.worldTick(dt, G.replay.t); if (!tickPlayback(G, dt, camera)) showEnd(); }
  updateFx(G, live || replaying ? dt : 0, camera);
  if (G.killCam?.rp && !G.killCam.rp.done && !replaying) killCamRender(G, () => renderer.render(G.scene, camera));
  else renderer.render(G.scene, camera);
  if (clipRec && replaying) clipRec.frame(clipProg);
}
loop();


// ---------- Boss Raid HUD ----------
function updateRaidHud() {
  const I = raidInfo(G), R = G.raid; if (!I) return;
  const m = Math.floor(I.time / 60), s = String(Math.floor(I.time % 60)).padStart(2, '0');
  $('kB').textContent = Math.ceil(I.hp / I.max * 100) + '%'; $('kR').textContent = `${m}:${s}`;
  $('coreB').style.width = (100 * I.hp / I.max) + '%';
  $('coreR').style.width = (100 * I.time / RAID.time) + '%';
  $('wave').textContent = `phase ${I.phase} of 3`;
  const tag = $('hillTag');
  const al = raidAlert(G, P, keyOf('jump'));
  tag.className = al.hot ? 'contest' : 'on'; tag.textContent = al.text;
}
// ---------- Story HUD ----------
function updateStoryHud() {
  const S = storyInfo(G); if (!S || !S.K) return;
  const K = S.K, t = K.time ? S.timeLeft : S.st, m = Math.floor(t / 60), s = String(Math.floor(t % 60)).padStart(2, '0');
  const timed = K.type === 'defend' || K.type === 'survive';
  // defend: the left side is the thing you're protecting, with its health
  const O = K.type === 'defend' && S.obj ? S.obj : null, of = O ? Math.max(0, O.hp / O.maxHp) : 0;
  $('lB').textContent = O ? K.name.replace(/^the /, '').replace(/^./, c => c.toUpperCase()) : 'Objective';
  $('lR').textContent = K.time ? 'Time left' : 'Time';
  $('kB').textContent = O ? `${Math.ceil(of * 100)}%` : timed ? `${Math.floor(S.have)}s` : K.type === 'heal' ? `${S.have.toLocaleString()}` : `${S.have} / ${S.need}`;
  $('coreB').style.width = (100 * (O ? of : Math.min(1, S.have / Math.max(1, S.need)))) + '%';
  $('coreB').classList.toggle('objLow', !!O && of < 0.35);
  $('kR').textContent = `${m}:${s}`;
  $('coreR').style.width = K.time ? (100 * S.timeLeft / K.time) + '%' : '100%';
  $('wave').textContent = `${S.M.title} · part ${S.stage + 1} of ${S.M.stages.length}`;
  const tag = $('hillTag'), hot = K.time && S.timeLeft < 15 && !timed && !S.rest;
  tag.className = hot || /about to fall/.test(S.hint) ? 'contest' : 'on';
  tag.textContent = `${S.goal}${O ? ` · ${Math.max(0, Math.ceil(O.hp)).toLocaleString()} / ${O.maxHp.toLocaleString()} HP` : ""}${S.hint ? " · " + S.hint : ""}`;
}
// ---------- Payload HUD ----------
function updateCartHud() {
  const C = G.cart, L = cartLead(C);
  $('kB').textContent = Math.round(L.blue * 100) + '%'; $('kR').textContent = Math.round(L.red * 100) + '%';
  $('coreB').style.width = (100 * L.blue) + '%';
  $('coreR').style.width = (100 * L.red) + '%';
  $('wave').textContent = C.ot ? 'overtime!' : C.contested ? 'contested!' : C.dir ? `${C.dir > 0 ? 'blue' : 'red'} pushing` : 'cart idle';
  const tag = $('hillTag'), on = nearCart(G, P), us = G.playerTeam, dirUs = us === 'blue' ? 1 : -1;
  tag.className = C.contested ? 'contest' : C.dir === dirUs ? 'on' : C.dir ? 'lost' : '';
  tag.textContent = C.contested ? (on ? 'Contested · clear them off' : 'Cart contested') : C.dir === dirUs ? (on ? `Pushing · ${C.pushers[us]} on the cart` : 'Allies pushing the cart')
    : C.dir ? 'Enemy pushing the cart' : `Cart · ${Math.round(Math.hypot(P.pos.x - C.pos.x, P.pos.z - C.pos.z))}m`;
}

// ---------- Smash Ball HUD ----------
function updateBallHud() {
  const T = G.ball, p = T.pts;
  $('kB').textContent = p.blue; $('kR').textContent = p.red;
  $('coreB').style.width = (100 * p.blue / BALL.toWin) + '%';
  $('coreR').style.width = (100 * p.red / BALL.toWin) + '%';
  const t = Math.max(0, T.time);
  $('wave').textContent = G.over ? 'game over' : T.ot ? 'golden goal!' : `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  const tag = $('hillTag'), us = G.playerTeam, ourHalf = (T.pos.z < 0) === (us === 'blue');
  const d = Math.round(Math.hypot(P.pos.x - T.pos.x, P.pos.z - T.pos.z)), mine = T.last === P, ours = T.last && T.last.team === us;
  tag.className = T.wait > 0 ? '' : ourHalf ? 'lost' : 'on';
  tag.textContent = T.wait > 0 ? (T.over ? 'Full time' : 'Kick-off!') : mine ? `⚽ Your ball · ${d}m` : ours ? `⚽ ${T.last.name} has it · ${d}m` : ourHalf ? `⚽ Ball in your half · ${d}m · clear it!` : `⚽ Ball in their half · ${d}m`;
}
// ---------- Hill Rush HUD ----------
function updatePotatoHud() {
  const T = G.potato, p = T.pts, h = T.holder;
  $('kB').textContent = p.blue; $('kR').textContent = p.red;
  $('coreB').style.width = (100 * p.blue / POTATO.toWin) + '%';
  $('coreR').style.width = (100 * p.red / POTATO.toWin) + '%';
  const fuse = Math.max(0, T.fuse);
  $('wave').textContent = G.over ? 'game over' : T.wait > 0 ? `next bomb in ${Math.ceil(T.wait)}` : `fuse ${fuse.toFixed(1)}s`;
  const tag = $('hillTag'), mine = h === P, ours = h && h.team === G.playerTeam;
  tag.className = !h || T.wait > 0 ? '' : mine ? 'lost' + (fuse < 4 ? ' contest' : '') : ours ? 'on' : 'lost';
  tag.textContent = T.wait > 0 || !h ? 'Bomb incoming' : mine ? `💣 You have it! ${fuse.toFixed(1)}s · hit an enemy`
    : ours ? `Teammate ${h.name} has the bomb · give them space` : `${h.name} has the bomb · ${Math.round(h.pos.distanceTo(P.pos))}m away`;
}
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
  const out = P.alive && inStorm(G, P.pos);
  $('stormVign').style.opacity = out ? 0.85 + Math.sin(G.time * 6) * 0.15 : 0;
  if (out && !stormWarned) { banner('You\'re in the storm!', '#9b5cff', 'Get to the safe zone'); stormWarned = true; }
  if (!out) stormWarned = false;
}
let stormWarned = false;

// ---------- Duel ----------
// The host (or the only machine, offline) calls each round; everyone else follows its events.
function duelKnockout(t, src) {
  const D = G.duel;
  if (D.state !== 'fight' || G.over) return;
  // 2v2 and 3v3: the round only ends once the whole team is down
  if (G.heroes.some(h => h.team === t.team && h !== t && h.alive)) return;
  const w = t.team === 'blue' ? 'red' : 'blue';
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
      endLater(ours, 1800);
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
