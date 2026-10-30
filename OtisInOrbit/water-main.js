import { THREE, canvas, renderer, scene, camera, sun, V3, clamp, damp, approach, puff, updateParticles, toast } from './core.js';
import { buildJosh, buildDrone } from './josh.js';
import { boxes, movers, lamps, dust, rocket, syncBox, ARENA_ENTRY, ARENA_POS, winOn, winOff, fogMat, crates, SPAWN as WORLD_SPAWN, CHECKPOINTS, TRAVEL, PLANET } from './water-world.js';
import * as WORLD from './water-world.js';
const { save, gotSet, persist, wipe } = getSave(PLANET);
import { boss, updateBoss, resetBoss, bossActive, setBossDead, BOSS_INFO } from './water-boss.js';
import { enemies } from './water-enemies.js';
import { getSave } from './save.js';
import { registerPlanet, activePlanet, travel, resumePlanet, pageInfo } from './planets.js';
import { groundAt } from './water-terrain.js';
import { addCookie, cookies as newCookies } from './cookies.js';
import { scannables, updateNPCs, talk, dialog, nearMilo, PENDING_RARE, npcEvents, restoreNPCs, miloTalked, guideDone, npcPrompt } from './water-npc.js';
import { S, LOOK, initUI, setAbility, setCookies, setPrompt } from './ui.js';
import { cs, updateCutscene } from './cutscene.js';
import { updateBubbles } from './bubbles.js';
import { setupStory } from './water-story.js';
import { setupSubs, hasSub } from './subareas.js';
import * as sfx from './sfx.js';

const josh = buildJosh();
const drone = buildDrone();
const joshGlow = new THREE.PointLight(0x7af5ff, 0, 11, 1.6); joshGlow.position.y = 1.2; josh.root.add(joshGlow);
initUI(josh);

const AB = {
  veer: { label: 'Veer', icon: '🦗', desc: 'Springt 1,5× hoger', color: '#6fd3ff', hex: 0x6fd3ff },
  zweef: { label: 'Zweef', icon: '🦅', desc: 'Houd spatie ingedrukt om te zweven', color: '#ffd166', hex: 0xffd166 },
  zwaar: { label: 'Zwaar', icon: '🪨', desc: 'Breekt gebarsten muren, maar springt lager', color: '#ff8a3d', hex: 0xff8a3d },
  haas: { label: 'Haas', icon: '🐇', desc: 'Rent sneller en springt verder', color: '#9be36b', hex: 0x9be36b },
  stuiter: { label: 'Stuiter', icon: '🍄', desc: 'Houd spatie ingedrukt bij het landen: elke stuiter hoger', color: '#ff7ab6', hex: 0xff7ab6 },
  krimp: { label: 'Krimp', icon: '🐛', desc: 'Josh wordt piepklein en past door kleine gaatjes', color: '#b6e36b', hex: 0xb6e36b },
  gloei: { label: 'Gloei', icon: '✨', desc: 'Josh geeft licht en ziet verborgen platforms', color: '#7af5ff', hex: 0x7af5ff },
  magneet: { label: 'Magneet', icon: '🧲', desc: 'Spring nog eens in de lucht bij een magneet: hij trekt je erheen. Nog een keer = wegslingeren', color: '#ff5a5a', hex: 0xff5a5a },
  vonk: { label: 'Vonk', icon: '⚡', desc: 'Druk op F om een vonk te schieten: dode machines gaan weer aan', color: '#ffe14a', hex: 0xffe14a },
  chinchilla: { label: 'Chinchilla', icon: '🐹', desc: 'Spring in de lucht nog een extra keer', color: '#e8dcc8', hex: 0xe8dcc8 },
  vries: { label: 'Vries', icon: '❄️', desc: 'Druk op F: bevries het water voor je tot een ijsschots', color: '#9ae8ff', hex: 0x9ae8ff },
  galm: { label: 'Galm', icon: '📯', desc: 'Druk op F: een geluidsgolf die gongs laat klinken en dingen wegblaast', color: '#ff9ad8', hex: 0xff9ad8 },
  neon: { label: 'Neon', icon: '💡', desc: 'Druk op F in de lucht: een flitsende dash naar voren', color: '#ff4ad8', hex: 0xff4ad8 },
  grijp: { label: 'Grijp', icon: '🐿️', desc: 'Spring of loop tegen ruwe schors, klimop of een liaan: je klimt erop. W/S klimmen, A/D opzij, spatie = afzetten, Shift = loslaten', color: '#d8925a', hex: 0xd8925a },
  // the Combo mixes (Raaf builds the mixer into Byte on the Wolkeneilanden): hold one, scan the other
  wervel: { label: 'Wervelwind', icon: '🌪️', desc: 'Zweef + Galm. Druk op F: een wervelwind gooit je hoog de lucht in en blaast alles om je heen weg. Houd spatie om te zweven', color: '#c8b8ff', hex: 0xc8b8ff, mix: ['zweef', 'galm'] },
  regenboog: { label: 'Regenboog', icon: '🌈', desc: 'Gloei + Vries. Druk op F: een brug van regenboog-ijs voor je voeten, een paar seconden lang', color: '#ff9a6a', hex: 0xff9a6a, mix: ['gloei', 'vries'] },
  meteoor: { label: 'Meteoor', icon: '☄️', desc: 'Zwaar + Veer. Springt hoog, en een stamp (Shift in de lucht) wordt een inslag die alles om je heen breekt', color: '#ff6a3a', hex: 0xff6a3a, mix: ['zwaar', 'veer'] },
};
// ---------- the Combo: once Byte has the mixer, a second scan mixes two abilities into a new one ----------
const COMBO_KEY = 'byte-combo-save-v1';     // ends in -save-v1, so starting the game over wipes it too
let comboOn = false;
try { comboOn = localStorage.getItem(COMBO_KEY) === '1'; } catch (e) {}
const comboEl = document.querySelector('#skills .slot:last-child');
const mixOf = (a, b) => Object.keys(AB).find((k) => AB[k].mix && AB[k].mix.includes(a) && AB[k].mix.includes(b) && a !== b) || null;
function showCombo() {
  if (!comboEl) return;
  comboEl.classList.toggle('locked', !comboOn);
  const mix = P.ability && AB[P.ability] && AB[P.ability].mix;
  comboEl.querySelector('.ring').textContent = !comboOn ? '🔒' : mix ? mix.map((k) => AB[k].icon).join('') : '＋';
  comboEl.querySelector('.ring').style.fontSize = mix ? '17px' : '';
  comboEl.querySelector('.lbl').textContent = 'Combo';
}
function unlockCombo() {
  comboOn = true;
  try { localStorage.setItem(COMBO_KEY, '1'); } catch (e) {}
  showCombo();
}
// magnet points of this planet (only the Schroothoop has them)
const MAGNETS = WORLD.MAGNETS || [];
// a boss that hacks Byte: while he's taken, there's no copying, and the ability you had waits until he's back
const hacked = () => !!(BOSS_INFO.hacksDrone && boss.hacked);
// a planet can switch Byte off (broken after the crash) or just his scanner
const droneOff = () => !!(story.droneOff && story.droneOff());
const noScan = () => droneOff() || !!(story.noScan && story.noScan());
let wasHacked = false;
const FULL = { R: 0.32, H: 1.6 }, SMALL = { R: 0.2, H: 0.7 };
let R = FULL.R, H = FULL.H;
const SPAWN = WORLD_SPAWN, TERRAIN = { terrain: true };
// the rocket can have several destinations (R switches between them)
const DESTS = TRAVEL.dests || [TRAVEL];
let destI = 0;
const dest = () => DESTS[destI];
// this planet's own cookies: adopt everything its modules have added so far (and later, while active)
const cookies = [];
const adoptCookies = () => { while (newCookies.length) cookies.push(newCookies.shift()); };
adoptCookies();
const RARE_TOTAL = cookies.filter((c) => c.rare).length + PENDING_RARE + (hasSub(PLANET) ? 1 : 0);     // (+ the sub-area's cookie, made a bit later)
const checkpoint = SPAWN.clone();
const life = { hp: 3, inv: 0, calm: 0 };
let shakeT = 0;

const P = {
  pos: SPAWN.clone(), vel: V3(), grounded: false, ground: null, coyote: 0, buffer: 0,
  jumping: false, cut: false, airJump: false, chain: 0, chainT: 0, pound: 0, poundT: 0,
  long: false, flip: 0, facing: Math.PI, ability: null, floating: false, crouch: false, crouchBuf: 0, airT: 0, small: false, size: 1,
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
    jump: b(0), crouch: b(1) || b(6) || b(7), scan: b(2), drop: b(3), fire: b(5) };
  ['jump', 'crouch', 'scan', 'drop', 'fire'].forEach((k) => (o[k + 'P'] = o[k] && !gpPrev[k]));
  gpPrev = { jump: o.jump, crouch: o.crouch, scan: o.scan, drop: o.drop, fire: o.fire };
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
// hidden platforms only exist for a glowing Josh who is close by
const solidFor = (b) => !b.ghost || (P.ability === 'gloei' && Math.hypot(b.pos.x - P.pos.x, b.pos.z - P.pos.z) < 11);
// Krimp: shrink right away, but only grow back once there's room above you
function updateSize(dt) {
  const want = P.ability === 'krimp';
  if (want && !P.small) { P.small = true; R = SMALL.R; H = SMALL.H; }
  if (!want && P.small) {
    R = FULL.R; H = FULL.H;
    const blocked = boxes.some((b) => solidFor(b) && overlaps(b, P.pos)) || groundAt(P.pos.x, P.pos.z, R) > P.pos.y + 0.05;
    if (blocked) { R = SMALL.R; H = SMALL.H; if (!P.roomHint) { P.roomHint = true; toast('Hier is geen ruimte om te groeien…'); } }
    else { P.small = false; P.roomHint = false; puff(P.pos.clone().add(V3(0, 0.6, 0)), 8, 0xb6e36b, 2, 1); }
  }
  P.size += ((P.small ? 0.44 : 1) - P.size) * damp(12, dt);
}

const sq = { s: 0, v: 0 };
const squash = (a) => { sq.s = a; sq.v = 0; };

const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24),
  new THREE.MeshBasicMaterial({ color: 0x2b2440, transparent: true, opacity: 0.28, depthWrite: false }));
shadow.rotation.x = -Math.PI / 2; scene.add(shadow);

const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 8, 40), new THREE.MeshBasicMaterial({ color: 0x14b8a6 }));
ring.rotation.x = Math.PI / 2; ring.visible = false; scene.add(ring);
const magBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 6), new THREE.MeshBasicMaterial({ color: 0xff5a5a, transparent: true, opacity: 0.6, depthWrite: false }));
magBeam.visible = false; scene.add(magBeam);
// the arena wall: while a boss is awake you can't leave his arena. It glows up when you walk into it.
const AR = BOSS_INFO.arena;
const arenaWall = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 7, 64, 1, true), new THREE.MeshBasicMaterial({ color: 0xffe14a, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
if (AR) { arenaWall.scale.set(AR.r, 1, AR.r); arenaWall.position.set(AR.x, AR.y + 3, AR.z); }
arenaWall.visible = false; scene.add(arenaWall);
function lockArena(dt) {
  arenaWall.visible = !!AR && bossActive();
  if (!arenaWall.visible) return;
  const dx = P.pos.x - AR.x, dz = P.pos.z - AR.z, L = Math.hypot(dx, dz), R = AR.r - 0.6;
  if (L > R) {
    P.pos.x = AR.x + (dx / L) * R; P.pos.z = AR.z + (dz / L) * R;
    const out = (P.vel.x * dx + P.vel.z * dz) / L;
    if (out > 0) { P.vel.x -= (dx / L) * out; P.vel.z -= (dz / L) * out; }
  }
  const want = 0.05 + 0.4 * clamp((L - (R - 2.5)) / 2.5, 0, 1);
  arenaWall.material.opacity += (want - arenaWall.material.opacity) * damp(8, dt);
}

const D = { pos: V3(1, 2, 4), state: 'follow', t: 0, scan: null, boost: 0 };
drone.g.position.copy(D.pos);

function breakCrate(b, silent = false) {
  boxes.splice(boxes.indexOf(b), 1);
  scene.remove(b.mesh);
  if (!silent) { puff(b.pos.clone(), 14, 0xa07040, 5, 3); if (b.wall) sfx.smash(); else sfx.crate(); }
  // after a reload, a crate you broke earlier only gives back the cookies you haven't picked up yet
  if (b.rare) { if (!gotSet.has(b.rareName || 'Krat in het steegje')) addCookie(b.pos.x, b.pos.y + 0.7, b.pos.z, b.rareName || 'Krat in het steegje'); }
  else for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; if (!gotSet.has(`${b.id}-${i}`)) addCookie(b.pos.x + Math.cos(a) * 0.9, b.pos.y + 0.3, b.pos.z + Math.sin(a) * 0.9, '', `${b.id}-${i}`); }
  if (!save.crates.includes(b.id)) { save.crates.push(b.id); persist(); }
}

function onLand(fall, wasPound) {
  if (wasPound) {
    sfx.poundLand();
    puff(P.pos.clone().add(V3(0, 0.1, 0)), 16, 0xffffff, 7, 0.4);
    if (P.ground.crate && !P.ground.wall) breakCrate(P.ground);
    if (P.ability === 'meteoor') impact();
    squash(0.45);
  } else { squash(Math.min(0.35, -fall * 0.014)); if (fall < -12) sfx.land(); }
  if (P.jumping && !P.long) P.chainT = 0.22;
  if (P.chain === 3) P.chain = 0;
  P.jumping = P.airJump = P.airJump2 = P.long = P.cut = P.wervelUsed = false;
  P.flip = 0; P.pound = 0;
}

function respawn(msg = 'Oeps! Terug naar je laatste checkpoint') {
  P.pos.copy(checkpoint); P.vel.set(0, 0, 0); P.pound = 0; P.long = false; P.climb = null;
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
    if (life.inv > 0) return false;
    life.hp--; life.inv = 1.6; life.calm = 0; shakeT = 0.25; sfx.hurt();
    const d = P.pos.clone().sub(from).setY(0);
    if (d.lengthSq() < 0.01) d.set(0, 0, 1);
    d.setLength(9);
    if (P.climb) letGo(0.6);
    P.vel.set(d.x, 9, d.z); P.pound = 0; P.long = false; P.grounded = false;
    puff(P.pos.clone().add(V3(0, 1, 0)), 8, 0xff8a8a, 3, 1);
    if (life.hp <= 0) respawn(bossActive() ? BOSS_INFO.fail : 'Au! Terug naar je laatste checkpoint');
    setHP();
    return true;
  },
  bounce(vy) { sfx.stomp(); P.vel.y = vy; P.grounded = false; P.jumping = true; P.cut = true; P.airJump = P.airJump2 = false; P.pound = 0; },
  shake(s) { shakeT = Math.max(shakeT, s); },
  heal() { life.hp = 3; setHP(); },
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
// Magneet: in the air, jump again near a magnet and it pulls you in. You hang there a moment; jump once more
// and it slings you off the way you're steering. A magnet you've used won't grab you again until you land,
// so chaining them always takes you onwards.
function findMagnet() {
  let best = null, bd = 10;
  for (const m of MAGNETS) {
    m.obj.getWorldPosition(m.at || (m.at = V3()));
    const d = m.at.distanceTo(P.pos);
    if (P.usedMags && P.usedMags.has(m)) continue;
    if (d < bd && m.at.y > P.pos.y - 1) { bd = d; best = m; }
  }
  return best;
}
function magnetJump(mx, mz, len) {
  if (P.ability !== 'magneet') return false;
  const v = P.vel;
  if (P.mag && P.mag.state === 'hang') {
    const dir = len > 0.1 ? V3(mx, 0, mz).normalize() : V3(Math.sin(P.facing), 0, Math.cos(P.facing));
    v.set(dir.x * 11, 12.5, dir.z * 11);
    P.mag = null; P.airJump = false; P.jumping = true; P.cut = true; P.long = false; P.flip = 0.0001;
    sfx.jump(3); puff(P.pos.clone().add(V3(0, 1, 0)), 10, 0xff5a5a, 3, 0.5);
    return true;
  }
  if (P.mag) return true;
  const m = findMagnet();
  if (!m) return false;
  P.mag = { m, state: 'pull', t: 0 };
  (P.usedMags || (P.usedMags = new Set())).add(m);
  sfx.scanStart();
  return true;
}

// Vonk: F shoots a spark the way you're facing (it homes in a little on a power box or enemy in front of you)
const POWER = WORLD.POWER || [];
const sparks = [];
const sparkGeo = new THREE.SphereGeometry(0.2, 10, 8), sparkMat = new THREE.MeshBasicMaterial({ color: 0xffe14a });
function fireSpark() {
  const from = P.pos.clone().add(V3(0, H * 0.7, 0));
  const fwd = V3(Math.sin(P.facing), 0, Math.cos(P.facing));
  let aim = null, best = 0.55;
  const consider = (p) => {
    const d = p.clone().sub(from), L = d.length();
    if (L > 24 || L < 0.5) return;
    const ang = Math.acos(Math.max(-1, Math.min(1, V3(d.x, 0, d.z).normalize().dot(fwd))));
    if (ang < best) { best = ang; aim = p; }
  };
  for (const p of POWER) if (!p.on) consider(p.pos.clone().add(V3(0, 0.8, 0)));
  for (const e of enemies.list || []) if (!e.dead && !e.hidden) consider(e.pos.clone().add(V3(0, 0.6, 0)));
  const dir = aim ? aim.clone().sub(from).normalize() : fwd;
  const m = new THREE.Mesh(sparkGeo, sparkMat); m.position.copy(from); scene.add(m);
  sparks.push({ m, v: dir.multiplyScalar(26), life: 1 });
  sfx.zap();
}
function updateSparks(dt) {
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i], q = s.m.position;
    q.addScaledVector(s.v, dt); s.life -= dt;
    if (Math.random() < 0.6) puff(q.clone(), 1, 0xffe14a, 1.5, 0.3);
    let hit = s.life <= 0 || groundAt(q.x, q.z, 0) > q.y;
    for (const p of POWER) {
      if (hit) break;
      if (q.distanceTo(p.pos.clone().add(V3(0, 0.8, 0))) < 1.1) { p.zapped = true; hit = true; }
    }
    if (!hit && enemies.zap && enemies.zap(q, 0.5, enemyApi)) hit = true;
    if (!hit) for (const b of boxes) if (!b.ghost && q.x > b.min.x && q.x < b.max.x && q.z > b.min.z && q.z < b.max.z && q.y > b.min.y && q.y < b.max.y) { hit = true; break; }
    if (hit) { puff(q.clone(), 10, 0xffe14a, 4, 1); scene.remove(s.m); sparks.splice(i, 1); }
  }
}

// ---------- the Combo mixes ----------
const twisters = [], bridges = [];
const twistMat = new THREE.MeshBasicMaterial({ color: 0xe8e0ff, transparent: true, opacity: 0.55, depthWrite: false });
const twistGeo = new THREE.TorusGeometry(1, 0.12, 6, 20);
const RAINBOW = [0xff5a5a, 0xffa04a, 0xffe14a, 0x7aff6a, 0x5ac8ff, 0xb07aff, 0xff7ad8];
// Wervelwind: a whirlwind under Josh throws him up, and blows away whatever is around him
function wervel() {
  if (!P.grounded && P.wervelUsed) return;
  P.wervelUsed = true;
  P.vel.y = 21; P.grounded = false; P.jumping = true; P.cut = true; P.pound = 0; P.long = false; P.coyote = 0;
  const g = new THREE.Group(); g.position.copy(P.pos); scene.add(g);
  for (let i = 0; i < 5; i++) { const r = new THREE.Mesh(twistGeo, twistMat); r.rotation.x = Math.PI / 2; r.position.y = i * 0.7; r.scale.setScalar(0.6 + i * 0.35); g.add(r); }
  twisters.push({ g, t: 0 });
  sfx.whir(); if (sfx.galm) sfx.galm();
  for (const e of enemies.list || []) if (!e.dead && !e.hidden && e.pos.distanceTo(P.pos) < 4.5) enemies.zap(e.pos.clone().add(V3(0, 0.5, 0)), 0.3, enemyApi);
  if (story.blow) story.blow(P.pos.clone());
}
// Regenboog: a bridge of rainbow ice runs out in front of Josh's feet, and melts after a while
function regenboog() {
  for (const b of bridges) b.t = Math.max(b.t, 5.6);           // the old bridge melts
  const f = V3(Math.sin(P.facing), 0, Math.cos(P.facing));
  const top = P.grounded ? P.pos.y : P.pos.y - 0.3;
  const segs = [];
  for (let i = 0; i < 7; i++) {
    const at = P.pos.clone().addScaledVector(f, 1.3 + i * 1.6); at.y = top - 0.15;
    segs.push({ at, col: RAINBOW[i], box: null });
  }
  bridges.push({ segs, t: 0 });
  sfx.chime ? sfx.chime() : sfx.copy();
}
function updateBridges(dt) {
  for (let i = bridges.length - 1; i >= 0; i--) {
    const br = bridges[i]; br.t += dt;
    br.segs.forEach((s, k) => {
      if (!s.box && br.t > k * 0.06 && br.t < 6) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.3, 1.8), new THREE.MeshBasicMaterial({ color: s.col, transparent: true, opacity: 0.85 }));
        m.position.copy(s.at); scene.add(m);
        s.box = { pos: m.position, half: V3(0.9, 0.15, 0.9), min: V3(), max: V3(), mesh: m };
        syncBox(s.box); boxes.push(s.box);
        puff(s.at.clone(), 3, s.col, 2, 0.5);
      }
      if (s.box) s.box.mesh.visible = br.t < 4.5 || Math.floor(br.t * 10) % 2 === 0;
    });
    if (br.t > 6) {
      for (const s of br.segs) if (s.box) { const j = boxes.indexOf(s.box); if (j >= 0) boxes.splice(j, 1); scene.remove(s.box.mesh); }
      bridges.splice(i, 1);
    }
  }
}
// Meteoor: the ground pound lands like a meteor: crates and cracked walls round Josh break, enemies are knocked out
function impact() {
  shakeT = Math.max(shakeT, 0.5); sfx.smash();
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; puff(P.pos.clone().add(V3(Math.cos(a) * 2.5, 0.3, Math.sin(a) * 2.5)), 3, 0xff6a3a, 4, 1); }
  for (const b of [...boxes]) if ((b.crate || b.wall) && Math.hypot(b.pos.x - P.pos.x, b.pos.z - P.pos.z) < 4.5 && Math.abs(b.pos.y - P.pos.y) < 3) breakCrate(b);
  for (const e of enemies.list || []) if (!e.dead && !e.hidden && e.pos.distanceTo(P.pos) < 4.5) enemies.zap(e.pos.clone().add(V3(0, 0.5, 0)), 0.3, enemyApi);
  if (story.meteor) story.meteor(P.pos.clone());
}
function comboFire() {
  if (P.ability === 'wervel') { wervel(); return true; }
  if (P.ability === 'regenboog') { regenboog(); return true; }
  return false;
}
function updateCombo(dt, t) {
  for (let i = twisters.length - 1; i >= 0; i--) {
    const w = twisters[i]; w.t += dt;
    w.g.rotation.y += dt * 14; w.g.position.y += dt * 4;
    w.g.children.forEach((r, k) => { r.position.x = Math.sin(t * 9 + k) * 0.2; });
    twistMat.opacity = 0.55 * Math.max(0, 1 - w.t / 0.9);
    if (w.t > 0.9) { scene.remove(w.g); twisters.splice(i, 1); }
  }
  if (!twisters.length) twistMat.opacity = 0.55;
  updateBridges(dt);
  if (P.ability === 'meteoor' && Math.random() < dt * 6) puff(P.pos.clone().add(V3(0, 0.4, 0)), 1, 0xff6a3a, 1.5, 1);
}
const glider = () => P.ability === 'zweef' || P.ability === 'wervel';

// ---------- Grijp: climbing rough bark, ivy and lianas ----------
// A planet lists what you can climb (WORLD.CLIMBS): one side of a trunk { x, z, r, a, w, y0, y1, exit }.
// r = the trunk's radius, a = which side (angle from +z towards +x) and w = how far round either way (π = all
// round), y0–y1 = how high. exit 'in': at the top you climb onto the trunk; 'out': onto a ledge above you.
// A liana is just a very thin trunk, all the way round, with no exit. Set .off to switch one off.
const CLIMBS = WORLD.CLIMBS || [];
const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
let climbHint = 0;
function findClimb(towards) {
  for (const c of CLIMBS) {
    if (c.off) continue;
    const dx = P.pos.x - c.x, dz = P.pos.z - c.z, d = Math.hypot(dx, dz), lr = c.r + R + 0.05;
    if (d > lr + 0.45 || d < c.r - 0.3) continue;
    if (P.pos.y < c.y0 - 0.4 || P.pos.y > c.y1 - 0.3) continue;
    const a = Math.atan2(dx, dz);
    if (c.w < Math.PI && Math.abs(wrapA(a - c.a)) > c.w) continue;
    if (towards && (P.wish.x * -dx + P.wish.z * -dz) / (d || 1) < 0.5) continue;
    return { c, a };
  }
  return null;
}
function tryGrab(dt) {
  climbHint -= dt;
  if (P.climb || P.climbCd > 0 || P.pound || P.mag || P.long) return;
  const f = findClimb(P.grounded);
  if (!f) return;
  if (P.ability !== 'grijp') {
    if (climbHint <= 0) { climbHint = 15; toast(f.c.r < 0.6 ? 'Een liaan! Met Grijp kun je erin klimmen.' : 'Ruwe schors! Met Grijp (scan een eekhoorn) kun je hier tegenop klimmen.'); }
    return;
  }
  P.climb = { c: f.c, a: f.a };
  P.vel.set(0, 0, 0); P.grounded = false; P.jumping = P.long = false; P.pound = 0; P.airJump = P.airJump2 = P.wervelUsed = false;
  sfx.click(); squash(0.15);
}
// let go: make sure Josh isn't left standing inside the trunk
function letGo(cd) {
  const c = P.climb.c; P.climb = null; P.climbCd = cd; P.coyote = 0; P.buffer = 0;
  if (c.r < 0.6) return;
  for (let k = 0; k < 12 && groundAt(P.pos.x, P.pos.z, R) > P.pos.y + 0.02; k++) {
    const dx = P.pos.x - c.x, dz = P.pos.z - c.z, d = Math.hypot(dx, dz) || 1;
    P.pos.x += (dx / d) * 0.2; P.pos.z += (dz / d) * 0.2;
  }
}
function climbStep(dt, ix, iy, jumpP, crouchP, fx, fz) {
  const C = P.climb, c = C.c, lr = c.r + R + 0.05, thin = c.r < 0.6;
  if (c.off || P.ability !== 'grijp') { letGo(0.4); return; }
  P.pos.y += iy * 4.2 * dt;
  C.a += (ix * 3.4 * dt) / lr;
  if (c.w < Math.PI) C.a = c.a + clamp(wrapA(C.a - c.a), -c.w, c.w);
  const ox = Math.sin(C.a), oz = Math.cos(C.a);
  P.pos.x = c.x + ox * lr; P.pos.z = c.z + oz * lr;
  P.facing = C.a + Math.PI;
  P.vel.set(0, 0, 0); P.grounded = false; P.airT = 0;
  P.climbAnim = (P.climbAnim || 0) + (Math.abs(iy) + Math.abs(ix)) * dt * 9;
  if (P.pos.y >= c.y1) {
    if (c.exit) {
      // over the top: onto the trunk, or onto the ledge above
      const k = c.exit === 'in' ? c.r - 1.6 : lr + 0.9;
      P.pos.set(c.x + ox * k, c.y1 + 0.05, c.z + oz * k);
      P.climb = null; P.climbCd = 0.4; P.vel.set(0, -1, 0); squash(-0.2); sfx.jump(1);
      return;
    }
    P.pos.y = c.y1;
  }
  if (P.pos.y < c.y0) { P.pos.y = c.y0; if (iy < 0) { letGo(0.6); return; } }
  if (jumpP) {
    // push off: away from the trunk (and a bit sideways if you steer), or from a liana the way the camera looks
    const dir = thin ? V3(fx, 0, fz) : V3(ox, 0, oz);
    if (!thin && Math.abs(ix) > 0.1) dir.add(V3(oz, 0, -ox).multiplyScalar(ix * 0.7));
    dir.normalize();
    letGo(0.35);
    const sp = thin ? 8.5 : 7.5;
    P.vel.set(dir.x * sp, S.jump * 0.95, dir.z * sp);
    P.jumping = true; P.cut = false; P.facing = Math.atan2(dir.x, dir.z);
    sfx.jump(1); puff(P.pos.clone().add(V3(0, 0.6, 0)), 6, 0xc8a070, 2, 0.5); squash(-0.2);
    return;
  }
  if (crouchP) letGo(0.6);
}
function moveMovers(t) {
  for (const m of movers) {
    const np = m.fn ? m.fn(t) : m.base.clone().addScaledVector(m.axis, Math.sin(t * m.speed) * m.amp);
    m.delta.subVectors(np, m.b.pos);
    m.b.pos.copy(np); syncBox(m.b);
  }
}

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
  if (travelMenu.open) menuInput();
  if (dialog.active || launch.on || cs.active || travelMenu.open) { ix = 0; iy = 0; }
  const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
  const mx = fx * iy + rx * ix, mz = fz * iy + rz * ix;
  P.wish = { x: mx, z: mz };          // which way the stick points, for planets that need it (pushing blocks)

  const live = !dialog.active && !launch.on && !cs.active && !travelMenu.open;
  const jumpP = live && (pressed.has('Space') || (pad && pad.jumpP));
  const jumpH = live && (keys.has('Space') || (pad && pad.jump));
  const crouchH = live && (keys.has('ShiftLeft') || keys.has('ShiftRight') || keys.has('KeyC') || (pad && pad.crouch));
  const crouchP = live && (pressed.has('ShiftLeft') || pressed.has('ShiftRight') || pressed.has('KeyC') || (pad && pad.crouchP));
  P.jumpHeld = jumpH;
  const interactP = !cs.active && !launch.on && (pressed.has("KeyE") || (pad && (pad.scanP || (dialog.active && pad.jumpP))));
  const dropP = live && (pressed.has('KeyQ') || (pad && pad.dropP));
  const fireP = live && (pressed.has('KeyF') || (pad && pad.fireP));
  P.fireCd = (P.fireCd || 0) - dt;
  // a planet can take over the controls entirely (riding Byte in the sky battle on the Regenstad)
  if (story.flying && story.flying()) {
    pressed.clear(); P.wish = { x: 0, z: 0 }; setPrompt('');
    const fireH = live && (keys.has('KeyF') || (pad && pad.fire));
    story.fly(dt, { turn: ix, climb: iy, up: jumpH, down: crouchH, fire: fireH });
    return 0;
  }
  // hanging on a trunk or a liana (Grijp)
  P.climbCd = (P.climbCd || 0) - dt;
  if (P.climb) {
    climbStep(dt, ix, iy, jumpP, crouchP, fx, fz);
    pressed.clear(); moveMovers(t);
    setPrompt(P.climb ? '<kbd>W</kbd><kbd>S</kbd> klimmen · <kbd>A</kbd><kbd>D</kbd> opzij · <kbd>spatie</kbd> afzetten · <kbd>Shift</kbd> loslaten' : '');
    return 0;
  }
  if (fireP && P.fireCd <= 0 && comboFire()) P.fireCd = 0.3;
  else if (fireP && P.ability === 'vonk' && P.fireCd <= 0) { P.fireCd = 0.3; fireSpark(); }
  else if (fireP && P.fireCd <= 0 && story.fire && story.fire(P.ability)) P.fireCd = 0.35;   // a planet's own shot (Vries on the Waterplaneet)
  pressed.clear();
  let scanP = false;
  if (interactP) {
    if (dialog.active || (P.grounded && nearMilo(P.pos))) talk();
    else if (P.grounded && subs.near(P.pos)) subs.enter();
    else if (P.grounded && nearRocket() && !launch.on) { addVisited(); if (DESTS.length > 1) openMenu(); else tryLaunch(); }
    else scanP = true;
  }
  P.useP = scanP && hacked();          // during a hacking boss, E throws instead of scanning

  if (jumpP) P.buffer = 0.14;
  if (crouchP) P.crouchBuf = 0.3;
  P.buffer -= dt; P.chainT -= dt; P.coyote -= dt; P.crouchBuf -= dt;
  P.airT = P.grounded ? 0 : P.airT + dt;
  const v = P.vel;
  const abMult = (P.ability === 'veer' || P.ability === 'meteoor' ? 1.5 : P.ability === 'zwaar' ? 0.8 : 1) * (P.small ? 0.75 : 1);
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
      const target = S.speed * (P.crouch ? 0.3 : 1) * (P.floating && glider() ? 1.6 : 1) * (haas ? 1.45 : 1) * (P.small ? 0.8 : 1);
      // crouching keeps momentum (a short slide) so the long jump window stays open
      const acc = (P.grounded ? (P.crouch ? 9 : 60) : P.long ? 6 : 60 * S.air) * dt;
      if (!P.long || len > 0.1) {
        v.x = approach(v.x, mx * target, acc);
        v.z = approach(v.z, mz * target, acc);
      }
      const hs = Math.hypot(v.x, v.z);
      if (P.buffer > 0 && (P.grounded || P.coyote > 0)) {
        if ((crouchH || P.crouchBuf > 0) && (hs > 1.5 || len > 0.3)) {
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
      } else if (jumpP && !P.grounded && magnetJump(mx, mz, len)) {
        P.buffer = 0;                       // grabbed a magnet, or slung yourself off one
      } else if (jumpP && !P.grounded && !P.airJump) {
        v.y = S.jump * 0.85; P.airJump = true; P.buffer = 0; P.jumping = true; P.cut = false; P.long = false;
        D.boost = 0.28; sfx.airJump();
        puff(P.pos.clone(), 10, 0x5ef2e0, 3, 0.2);
        squash(-0.2);
      } else if (jumpP && !P.grounded && P.ability === 'chinchilla' && !P.airJump2) {
        // Chinchilla: one more hop in the air, after the normal one
        v.y = S.jump * 0.85; P.airJump2 = true; P.buffer = 0; P.jumping = true; P.cut = false; P.long = false;
        D.boost = 0.28; sfx.airJump();
        puff(P.pos.clone(), 12, 0xe8dcc8, 3, 0.2);
        squash(-0.2);
      }
      if (!jumpH && P.jumping && !P.cut && v.y > 0) { v.y *= 0.45; P.cut = true; }
      if (crouchP && !P.grounded) {
        // Shift soon after takeoff while you're moving turns the jump into a long jump instead of a ground pound
        const moving = hs > 1.5 || len > 0.3;
        if (P.airT < 0.3 && !P.long && !P.airJump && moving) longJump();
        else if (!P.long) { P.pound = 1; P.poundT = 0.2; P.long = false; v.set(0, 0, 0); sfx.pound(); }
      }
    }
    v.y -= S.gravity * (v.y < 0 ? 1.6 : 1) * dt;
    P.floating = (P.ability === 'ballon' || glider()) && jumpH && v.y < 0 && P.pound === 0 && !P.grounded;
    if (P.floating) v.y = Math.max(v.y, glider() ? -1.6 : -1.4);
    v.y = Math.max(v.y, -34);
    // Magneet: being pulled in, or hanging under one for a moment
    if (P.grounded) P.usedMags = null;
    if (P.mag && (P.pound || P.ability !== 'magneet')) P.mag = null;
    if (P.mag) {
      const m = P.mag.m; m.obj.getWorldPosition(m.at);
      const hangAt = m.at.clone().sub(V3(0, H + 0.35, 0)), d = hangAt.clone().sub(P.pos), L = d.length();
      P.mag.t += dt;
      if (P.mag.state === 'pull') {
        if (L > 0.45) v.copy(d.setLength(Math.min(18, L * 6 + 5)));
        else { P.mag.state = 'hang'; P.mag.t = 0; sfx.clank(); }
        if (P.mag.t > 1.5) P.mag = null;                 // something was in the way
      } else {
        P.pos.copy(hangAt); v.set(0, 0, 0);
        if (P.mag.t > 1.8) P.mag = null;                  // you can't hold on for ever
      }
    }
  }

  // moving platforms (carry the player along)
  moveMovers(t);
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
        if (!solidFor(b) || !overlaps(b, P.pos)) continue;
        // a moving platform that rose into Josh (or that he jumped at just below its top): lift him onto it
        // instead of shoving him sideways. Still going up? Then he keeps his jump, he's just over the lip.
        if (b.mover && b.max.y - P.pos.y < 0.95) {
          P.pos.y = b.max.y;
          if (v.y <= 0.5) { if (v.y < 0) v.y = 0; P.grounded = true; P.ground = b; }
          continue;
        }
        if (b.max.y - P.pos.y < 0.35 && (wasGrounded || P.grounded) && v.y <= 0) { P.pos.y = b.max.y; continue; }
        // heavy Josh walks straight through cracked walls
        if (b.wall && (P.ability === 'zwaar' || P.ability === 'meteoor')) { smash.add(b); continue; }
        if (b.wall && !b.hinted) { b.hinted = true; toast('Deze muur is gebarsten… met iets zwaars kom je er wel doorheen'); }
        const goNeg = v[ax] > 0 || (v[ax] === 0 && P.pos[ax] < b.pos[ax]);
        P.pos[ax] = goNeg ? b.min[ax] - R - 1e-4 : b.max[ax] + R + 1e-4;
        v[ax] = 0;
      }
    }
    const prevY = P.pos.y;
    P.pos.y += v.y * h;
    for (const b of boxes) {
      if (smash.has(b) || !solidFor(b) || !overlaps(b, P.pos)) continue;
      const slack = b.mover ? 0.95 : 0.05;     // a rising platform may have moved up past Josh's feet this frame
      if (v.y <= 0 && prevY >= b.max.y - slack) { P.pos.y = b.max.y; v.y = 0; P.grounded = true; P.ground = b; }
      else if (v.y > 0) { P.pos.y = b.min.y - H - 1e-4; v.y = 0; }
    }
    const g = groundAt(P.pos.x, P.pos.z, R * 0.9);
    if (P.pos.y < g && v.y <= 0) { P.pos.y = g; v.y = 0; P.grounded = true; P.ground = TERRAIN; }
  }
  for (const b of smash) { breakCrate(b); shakeT = Math.max(shakeT, 0.3); puff(b.pos.clone(), 20, 0x9a948a, 6, 2); }

  if (P.grounded) {
    if (!wasGrounded) {
      onLand(fall, wasPound);
      const gb = P.ground;
      if (gb && gb.onLand) gb.onLand(wasPound);
      // bouncy mushroom caps throw you up; with Stuiter you bounce off anything, higher every time
      let up = 0;
      if (gb && gb.bounce) up = gb.bounce * (wasPound ? 1.3 : 1);
      if (P.ability === 'stuiter' && P.jumpHeld && fall < -6) up = Math.max(up, Math.min(27, -fall * 0.95 + 2.5));
      if (up) {
        v.y = up; P.grounded = false; P.jumping = true; P.cut = true; P.coyote = 0;
        squash(0.4); sfx.jump(3); puff(P.pos.clone().add(V3(0, 0.1, 0)), 8, 0xff7ab6, 3, 0.6);
      }
    }
    if (P.grounded) P.coyote = 0.2;   // going down a terrace step you're in the air for a moment: still counts as ground
  }
  tryGrab(dt);
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
  if (dropP && P.ability && !hacked()) { P.ability = null; setAbility(null); showCombo(); toast('Eigenschap losgelaten'); sfx.drop(); save.ability = null; persist(); }
  const near = hacked() || noScan() ? null : nearestScannable();
  if (scanP && !hacked() && noScan()) { toast(story.noScanMsg ? story.noScanMsg() : 'Byte kan nu niet scannen'); scanP = false; }
  if (scanP && !hacked()) {
    if (D.state !== 'follow') {}
    else if (!near) toast('Niks om te scannen in de buurt');
    else if (P.ability === near.ability) toast(`${LOOK.droneName || 'Drone'} heeft ${AB[near.ability].label} al`);
    else { D.state = 'go'; D.t = 0; D.scan = near; sfx.scanStart(); }
  }
  ring.visible = !!near && D.state === 'follow' && P.ability !== near.ability && !dialog.active;
  if (hacked()) setPrompt(BOSS_INFO.prompt ? BOSS_INFO.prompt() : '');
  else if (!dialog.active && P.grounded && nearMilo(P.pos)) setPrompt(`<kbd>E</kbd> ${npcPrompt()}`);     // talking wins over scanning (E does that too)
  else if (ring.visible) {
    const p = near.obj.position;
    const rg = groundAt(p.x, p.z, 0);
    ring.position.set(p.x, (rg === -Infinity ? p.y : rg) + 0.05, p.z);   // things on drifting ground: the ring sits under them
    ring.scale.setScalar(1.2 + Math.sin(t * 5) * 0.08);
    setPrompt(`<kbd>E</kbd> scan ${near.name}`);
  } else if (!dialog.active && P.grounded && nearMilo(P.pos)) setPrompt(`<kbd>E</kbd> ${npcPrompt()}`);
  else if (P.grounded && subs.near(P.pos)) setPrompt(`<kbd>E</kbd> ${subs.prompt(P.pos)}`);
  else if (!launch.on && !travelMenu.open && P.grounded && nearRocket()) setPrompt(DESTS.length > 1 ? '<kbd>E</kbd> reizen met de raket' : `<kbd>E</kbd> ${dest().label}` + (dest().need ? ` <span style="opacity:.8">(${Math.min(rareCount, dest().need)}/${dest().need} 🌟)</span>` : ''));
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
  // broken: Byte isn't flying at all (the planet shows what's left of him)
  if (droneOff()) { drone.g.visible = false; drone.beam.visible = false; D.state = 'follow'; D.pos.copy(P.pos).add(V3(0, 1.9, 0)); drone.g.position.copy(D.pos); D.wasOff = true; return; }
  if (D.wasOff) { D.wasOff = false; drone.g.visible = true; }
  // hacked: Byte is stuck inside the boss
  const slot = hacked() && BOSS_INFO.droneSlot ? BOSS_INFO.droneSlot() : null;
  if (slot) {
    D.state = 'follow'; drone.beam.visible = false;
    D.pos.lerp(slot, damp(10, dt)); drone.g.position.copy(D.pos);
    if (BOSS_INFO.droneYaw) drone.g.rotation.y = BOSS_INFO.droneYaw();
    drone.tilt.rotation.x = 0;
    drone.props.forEach((p, i) => (p.rotation.y += dt * (i ? 60 : -60)));
    drone.eyeMat.color.set(Math.sin(t * 12) > 0 ? 0xff2a2a : 0x8a0a0a);
    drone.g.visible = !(BOSS_INFO.droneHidden && BOSS_INFO.droneHidden());   // inside the boss: he IS the boss now
    return;
  }
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
      const was = P.ability, got = D.scan.ability;
      const mix = comboOn && was && !AB[was].mix ? mixOf(was, got) : null;
      P.ability = mix || got;
      save.ability = P.ability; persist();
      const info = AB[P.ability];
      setAbility(P.ability, info); showCombo();
      const BY = LOOK.droneName || 'Drone';
      if (mix) { sfx.copy(); sfx.cosmic(); toast(`COMBO! ${AB[was].label} + ${AB[got].label} = ${info.label}!`); puff(D.pos.clone(), 30, info.hex, 4, 1.5); }
      else {
        sfx.copy();
        toast(comboOn && was && !AB[was].mix ? `${AB[was].label} en ${AB[got].label} mixen niet… ${BY} kopieerde: ${info.label}` : `${BY} kopieerde: ${info.label}!`);
      }
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
  if (P.climb) { const c = Math.sin(P.climbAnim || 0); L0 = -0.7 + c * 0.5; L1 = -0.7 - c * 0.5; A0x = -2.6 + c * 0.4; A1x = -2.6 - c * 0.4; Az = 0.25; lean = -0.1; }
  else if (P.pound) { L0 = L1 = -1.3; Az = 2.5; }
  else if (P.long) { L0 = 0.5; L1 = 0.8; A0x = A1x = -2.8; Az = 0.2; lean = 1.15; }
  else if (P.floating && glider()) { L0 = 0.3; L1 = 0.5; A0x = A1x = 0; Az = 1.5; lean = 0.55; }   // arms out like wings
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
  josh.root.scale.set((1 + sq.s * 0.5) * P.size, (1 - sq.s) * crouch * P.size, (1 + sq.s * 0.5) * P.size);
  joshGlow.color.setHex(P.ability === 'vonk' ? 0xffe14a : 0x7af5ff);
  joshGlow.intensity += ((P.ability === "gloei" ? 9 : P.ability === 'vonk' ? 3.5 : 0) - joshGlow.intensity) * k;
  if (P.ability === 'vonk' && Math.random() < dt * 7) puff(P.pos.clone().add(V3((Math.random() - 0.5) * 0.8, 0.4 + Math.random() * 1.2, (Math.random() - 0.5) * 0.8)), 1, 0xffe14a, 2.5, 1);
  // the magnet's pull: a red beam from Josh to the magnet
  magBeam.visible = !!P.mag;
  if (P.mag) {
    const a = P.pos.clone().add(V3(0, H * 0.8, 0)), b = P.mag.m.at, d = b.clone().sub(a);
    magBeam.position.copy(a).addScaledVector(d, 0.5); magBeam.scale.set(1, Math.max(0.01, d.length()), 1);
    magBeam.quaternion.setFromUnitVectors(V3(0, 1, 0), d.normalize());
    magBeam.material.opacity = 0.45 + Math.sin(t * 30) * 0.2;
  }
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
    if (solidFor(b) && P.pos.x > b.min.x && P.pos.x < b.max.x && P.pos.z > b.min.z && P.pos.z < b.max.z && b.max.y <= P.pos.y + 0.05) top = Math.max(top, b.max.y);
  }
  shadow.visible = top > -50;
  shadow.position.set(P.pos.x, top + 0.02, P.pos.z);
  shadow.scale.setScalar(clamp(1 - (P.pos.y - top) * 0.06, 0.4, 1) * P.size);
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
    if (!b.ghost && x > b.min.x - 0.2 && x < b.max.x + 0.2 && z > b.min.z - 0.2 && z < b.max.z + 0.2 && y > b.min.y - 0.2 && y < b.max.y + 0.2) return true;
  }
  return false;
}
let camDist = S.cam, lastDrag = -10;
function updateCamera(dt) {
  const fc = story.flyCam && story.flyCam(dt);
  if (fc) {
    camera.position.copy(fc.pos); camera.lookAt(fc.look); cam.target.copy(P.pos);
    sun.position.copy(P.pos).add(V3(10, 22, 8)); sun.target.position.copy(P.pos);
    return;
  }
  const goal = P.pos.clone().add(V3(0, 0.3 + P.size, 0));
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
  // climbing: the camera swings round to look at the trunk from outside
  if (P.climb && time - lastDrag > 1) cam.yaw += wrapA(P.climb.a - cam.yaw) * damp(2.5, dt);

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
  toast(`Otis start de motor… op naar ${dest().name}!`);
}
// ---------- the travel menu: E at the rocket opens it, pick a planet ----------
const travelMenu = { open: false, sel: 0 };
let menuEl = document.getElementById('travelMenu');
if (!menuEl) {
  menuEl = document.createElement('div'); menuEl.id = 'travelMenu';
  menuEl.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:30;display:none;width:min(900px,92vw);max-height:80vh;overflow:hidden;'
    + 'background:#fff8ec;border:5px solid #2b2440;border-radius:24px;padding:18px 18px 12px;font:700 17px ui-rounded,"Avenir Next",system-ui,sans-serif;color:#2b2440;box-shadow:0 10px 0 rgba(43,36,64,.35)';
  document.body.appendChild(menuEl);
}
// a planet you've already been to is always open, from every planet (not just the next one along)
const visited = (p) => p === 'mistmaan' || (p !== PLANET && !!getSave(p).save.intro);
const destOk = (d) => rareCount >= d.need || visited(d.planet);
function addVisited() {
  for (const p of ORDER) {
    if (p === PLANET || DESTS.some((d) => d.planet === p) || !visited(p) || !pageInfo(p)) continue;
    const name = pageInfo(p).title.replace(/^(De|Het) /, (m) => m.toLowerCase());
    DESTS.push({ need: 0, planet: p, name, label: `Naar ${name}` });
  }
}
// left to right in the order you travel them; each with a little planet to look at
const ORDER = ['mistmaan', 'berg', 'bos', 'schroot', 'zon', 'water', 'tempel', 'feest', 'regen', 'wolk', 'woud'];
const ICON = { mistmaan: '🌙', berg: '⛰️', bos: '🍄', schroot: '⚙️', zon: '☀️', water: '🌊', tempel: '🏛️', feest: '🎉', regen: '🌧️', wolk: '☁️', woud: '🌳' };
const menuOrder = () => DESTS.map((d, i) => i).sort((a, b) => ORDER.indexOf(DESTS[a].planet) - ORDER.indexOf(DESTS[b].planet));
function drawMenu() {
  const cards = menuOrder().map((i) => {
    const d = DESTS[i], ok = destOk(d), info = pageInfo(d.planet) || {};
    const bg = info.bg || 'linear-gradient(180deg,#5a6a96 0%,#b9c6e4 50%,#ffd9b0 100%)';
    const name = d.name[0].toUpperCase() + d.name.slice(1);
    const foot = ok ? (d.need ? `${d.need} 🌟` : '&nbsp;') : `🔒 nog ${d.need - rareCount} 🌟`;
    return `<div data-i="${i}" class="tm-card" style="flex:0 0 150px;display:flex;flex-direction:column;align-items:center;gap:8px;padding:14px 10px 12px;border-radius:20px;cursor:pointer;border:4px solid transparent;transition:transform .12s;${ok ? '' : 'filter:grayscale(.85);opacity:.6;'}">`
      + `<div style="position:relative;width:104px;height:104px;border-radius:50%;background:${bg};border:4px solid #2b2440;box-shadow:inset -14px -14px 0 rgba(0,0,0,.18),inset 10px 10px 0 rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center;font-size:46px">${ICON[d.planet] || '🪐'}`
      + (ok ? '' : '<div style="position:absolute;right:-6px;bottom:-6px;font-size:28px">🔒</div>') + '</div>'
      + `<div style="text-align:center;line-height:1.15">${name}</div>`
      + `<div style="font-size:12px;opacity:.75;text-align:center;min-height:2.3em">${info.sub || ''}</div>`
      + `<div style="font-size:14px">${foot}</div></div>`;
  }).join('');
  menuEl.innerHTML = `<div style="font-size:22px;margin:0 6px 12px;text-align:center">🚀 Waar vliegen we heen?</div>`
    + `<div id="tmRow" style="display:flex;gap:8px;overflow-x:auto;padding:4px 4px 10px;scroll-behavior:smooth">${cards}</div>`
    + `<div style="font-size:13px;opacity:.6;margin:8px 6px 0;text-align:center">A/D of pijltjes · E of Enter = vliegen · Esc = sluiten · of klik</div>`;
  menuEl.querySelectorAll('[data-i]').forEach((el) => {
    el.onmouseenter = () => { if (travelMenu.sel !== +el.dataset.i) { travelMenu.sel = +el.dataset.i; markMenu(); } };
    el.onclick = () => { travelMenu.sel = +el.dataset.i; pickDest(); };
  });
  markMenu();
}
function markMenu() {
  menuEl.querySelectorAll('[data-i]').forEach((el) => {
    const on = +el.dataset.i === travelMenu.sel;
    el.style.borderColor = on ? '#2b2440' : 'transparent';
    el.style.background = on ? (destOk(DESTS[+el.dataset.i]) ? '#ffd166' : '#e8dcc8') : 'transparent';
    el.style.transform = on ? 'translateY(-4px)' : '';
    if (on) el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  });
}
function openMenu() {
  if (TRAVEL.locked && TRAVEL.locked()) { toast(TRAVEL.lockedMsg); return; }
  addVisited();
  travelMenu.open = true;
  travelMenu.sel = DESTS.indexOf(dest()) >= 0 && destOk(dest()) ? destI : Math.max(0, DESTS.findIndex(destOk));
  if (document.pointerLockElement && document.exitPointerLock) document.exitPointerLock();
  menuEl.style.display = 'block'; drawMenu(); sfx.click();
}
function closeMenu() { travelMenu.open = false; menuEl.style.display = 'none'; }
function pickDest() {
  const d = DESTS[travelMenu.sel];
  if (!destOk(d)) { toast(`Otis heeft nog ${d.need - rareCount} kosmische koekjes nodig voor ${d.name}`); sfx.hurt(); return; }
  destI = travelMenu.sel; closeMenu(); tryLaunch();
}
function menuInput() {
  const prev = ['KeyA', 'ArrowLeft', 'KeyW', 'ArrowUp'].some((k) => pressed.has(k)), next = ['KeyD', 'ArrowRight', 'KeyS', 'ArrowDown'].some((k) => pressed.has(k));
  if (prev || next) { const o = menuOrder(), at = o.indexOf(travelMenu.sel); travelMenu.sel = o[(at + (next ? 1 : o.length - 1)) % o.length]; markMenu(); sfx.click(); }
  if (pressed.has('KeyE') || pressed.has('Enter') || pressed.has('Space')) pickDest();
  else if (pressed.has('Escape') || pressed.has('KeyQ')) closeMenu();
  pressed.clear();
}
function tryLaunch() {
  if (TRAVEL.locked && TRAVEL.locked()) { toast(TRAVEL.lockedMsg); return; }
  if (!destOk(dest())) {
    toast(`Otis heeft nog ${dest().need - rareCount} kosmische koekjes nodig voor ${dest().name}`);
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
    travel(dest().planet).catch((e) => {
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
  P.vel.set(0, 0, 0); P.pound = 0; P.long = false; P.climb = null;
  ctx.resetCam();
}
registerPlanet(PLANET, {
  arrivesWithCutscene: !save.intro,
  activate() {
    keys.clear(); pressed.clear(); clock.getDelta(); addVisited();
    landHere();
    if (story.landed) story.landed();
    setCookies(coinCount, rareCount, RARE_TOTAL);
    if (P.ability && AB[P.ability]) setAbility(P.ability, AB[P.ability]); else setAbility(null);
    try { comboOn = localStorage.getItem(COMBO_KEY) === '1'; } catch (e) {}
    showCombo();
  },
});

// ---------- story: Otis, cutscenes, ambient life ----------
const ctx = {
  P, josh, drone, save, persist, LOOK, hideJosh: false,
  rare: () => rareCount,
  shake: (s) => { shakeT = Math.max(shakeT, s); },
  hurt: (from) => bossApi.damage(from),
  respawn: (msg) => respawn(msg),
  resetCam() { cam.target.set(P.pos.x, P.pos.y + 1.3, P.pos.z); },
  unlockCombo, comboOn: () => comboOn,
  setAbility(k) { P.ability = k; save.ability = k; persist(); setAbility(k, k && AB[k]); showCombo(); },
  ability: () => P.ability,
};
const story = setupStory(ctx);
// the sub-area: a door on the planet to a little level of its own
const subs = setupSubs({ PLANET, boxes, movers, groundAt, CHECKPOINTS, P, hurt: (f) => bossApi.damage(f), resetCam: () => ctx.resetCam() });
adoptCookies();

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
  // cosmic cookies are counted from which ones you actually have (their ids are their names, with spaces)
  coinCount = save.coins; rareCount = Math.min(RARE_TOTAL, [...gotSet].filter((id) => / /.test(id)).length); save.rare = rareCount;
  setCookies(coinCount, rareCount, RARE_TOTAL);
  if (save.ability && AB[save.ability]) { P.ability = save.ability; setAbility(P.ability, AB[P.ability]); }
  else setAbility(null);          // an ability shown by another planet that loaded first is not yours here
  showCombo();
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

// ---------- lampjes ----------
// Every active point light makes every pixel more expensive, and a changing number of lights rebuilds the shaders.
// So the planet's own lights only mark spots: a fixed few real lights move to the bright spots closest to Josh.
const POOL = 4, pool = [], spots = [];
for (let i = 0; i < POOL; i++) { const l = new THREE.PointLight(0xffffff, 0, 1, 2); l.userData.pool = true; scene.add(l); pool.push(l); }
let spotsAge = 9;
const shown = (o) => { for (o = o.parent; o; o = o.parent) { if (o === scene) return true; if (!o.visible) return false; } return false; };
const lp = V3();
function updateLights(dt) {
  if ((spotsAge += dt) > 0.5) {
    spotsAge = 0; spots.length = 0;
    scene.traverse((o) => { if (o.isPointLight && !o.userData.pool) { o.visible = false; spots.push(o); } });
  }
  const near = [];
  for (const s of spots) {
    if (s.intensity <= 0.05 || !shown(s)) continue;
    lp.setFromMatrixPosition(s.matrixWorld);
    const d = lp.distanceTo(P.pos);
    if (d < s.distance + 30) near.push([d - s.intensity, s, lp.clone()]);
  }
  near.sort((a, b) => a[0] - b[0]);
  pool.forEach((l, i) => {
    const n = near[i];
    if (!n) { l.intensity = 0; return; }
    const s = n[1];
    l.color.copy(s.color); l.intensity = s.intensity; l.distance = s.distance; l.decay = s.decay; l.position.copy(n[2]);
  });
}
// ---------- minimap: top right, turns with the camera. M hides it ----------
let mapEl = document.getElementById('minimap');
if (!mapEl) {
  mapEl = document.createElement('canvas'); mapEl.id = 'minimap'; mapEl.width = mapEl.height = 200;
  mapEl.style.cssText = 'position:fixed;right:18px;top:86px;width:170px;height:170px;border-radius:50%;border:4px solid #2b2440;background:rgba(20,18,40,.45);z-index:5;pointer-events:none';
  document.body.appendChild(mapEl);
}
const MAP = { img: null, x0: 0, z0: 0, step: 1, age: 99, on: true, R: 17, nBoxes: -1 };   // R: how many metres from Josh to the rim
try { MAP.on = localStorage.getItem('minimap-off') !== '1'; } catch (e) {}
// draw the whole planet once (and again every few seconds: bridges appear, gates break)
function buildMap() {
  const st = MAP.step, span = 300, n = Math.ceil(span / st);
  const hs = new Float32Array(n * n);
  let lo = Infinity, hi = -Infinity;
  const outside = groundAt(-9999, -9999, 0);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    let h = groundAt(-span / 2 + i * st, -span / 2 + j * st, 0);
    if (!(h > -30) || h === outside) h = NaN;
    hs[j * n + i] = h;
    if (h === h) { lo = Math.min(lo, h); hi = Math.max(hi, h); }
  }
  const c = MAP.img || document.createElement('canvas'); c.width = c.height = n;
  const g = c.getContext('2d'), id = g.createImageData(n, n);
  for (let k = 0; k < n * n; k++) {
    const h = hs[k];
    if (h !== h) continue;
    const u = hi > lo ? (h - lo) / (hi - lo) : 0.5;     // low = blue-green, high = warm and light
    id.data[k * 4] = 90 + u * 160; id.data[k * 4 + 1] = 150 + u * 90; id.data[k * 4 + 2] = 150 - u * 40; id.data[k * 4 + 3] = 235;
  }
  g.putImageData(id, 0, 0);
  // platforms, bridges, buildings (the ones that don't move)
  g.fillStyle = 'rgba(255,240,210,.9)';
  for (const b of boxes) {
    if (b.mover || b.ghost || b.max.y < -30) continue;
    const w = (b.max.x - b.min.x) / st, d = (b.max.z - b.min.z) / st;
    if (w > 40 || d > 40) continue;
    g.fillRect((b.min.x + span / 2) / st, (b.min.z + span / 2) / st, Math.max(1, w), Math.max(1, d));
  }
  MAP.img = c; MAP.x0 = -span / 2; MAP.z0 = -span / 2; MAP.age = 0;
}
function drawMap(dt) {
  mapEl.style.display = MAP.on && !cs.active && !launch.on && !subs.active() ? 'block' : 'none';
  if (!MAP.on) return;
  // redraw the planet only when something changed (a bridge appeared, a gate broke), and at most every 2 s
  if (!MAP.img || ((MAP.age += dt) > 2 && boxes.length !== MAP.nBoxes)) { buildMap(); MAP.nBoxes = boxes.length; }
  const g = mapEl.getContext('2d'), W = mapEl.width, k = W / 2 / MAP.R, st = MAP.step;
  g.clearRect(0, 0, W, W);
  g.save();
  g.beginPath(); g.arc(W / 2, W / 2, W / 2, 0, Math.PI * 2); g.clip();
  g.translate(W / 2, W / 2); g.rotate(cam.yaw); g.scale(k, k); g.translate(-P.pos.x, -P.pos.z);
  g.imageSmoothingEnabled = true;
  g.drawImage(MAP.img, MAP.x0, MAP.z0, MAP.img.width * st, MAP.img.height * st);
  const dot = (x, z, r, col, ring) => { g.beginPath(); g.arc(x, z, r / k, 0, Math.PI * 2); g.fillStyle = col; g.fill(); if (ring) { g.lineWidth = 1.5 / k; g.strokeStyle = ring; g.stroke(); } };
  // moving platforms
  g.fillStyle = 'rgba(120,220,255,.95)';
  for (const m of movers) { const b = m.b; g.fillRect(b.min.x, b.min.z, b.max.x - b.min.x, b.max.z - b.min.z); }
  for (const c of CHECKPOINTS) dot(c.pos.x, c.pos.z, 3, '#ffffff', '#2b2440');
  for (const c of cookies) if (c.rare && !c.got && c.g.parent) dot(c.g.position.x, c.g.position.z, 4.5, '#9b6bff', '#ffffff');
  // far away? then pin it to the rim, pointing the way
  const rim = (x, z) => { const dx = x - P.pos.x, dz = z - P.pos.z, L = Math.hypot(dx, dz), m = MAP.R * 0.86; return L > m ? [P.pos.x + (dx / L) * m, P.pos.z + (dz / L) * m] : [x, z]; };
  dot(...rim(TRAVEL.pos.x, TRAVEL.pos.z), 6, '#ff5a36', '#ffffff');
  const a = BOSS_INFO.name && boss.state !== 'dead' && (BOSS_INFO.arena || BOSS_INFO.cookieAt);
  if (a) dot(...rim(a.x, a.z), 6, '#ff3a5a', '#2b2440');
  // Josh: an arrow the way he's facing
  g.translate(P.pos.x, P.pos.z); g.rotate(-P.facing);
  g.beginPath(); g.moveTo(0, 7 / k); g.lineTo(-4.5 / k, -4 / k); g.lineTo(4.5 / k, -4 / k); g.closePath();
  g.fillStyle = '#5ef2e0'; g.fill(); g.lineWidth = 2 / k; g.strokeStyle = '#2b2440'; g.stroke();
  g.restore();
  // N on the rim
  const nA = cam.yaw - Math.PI / 2;
  g.fillStyle = '#fff8ec'; g.font = '700 18px ui-rounded, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('N', W / 2 + Math.cos(nA) * (W / 2 - 14), W / 2 + Math.sin(nA) * (W / 2 - 14));
}
addEventListener('keydown', (e) => {
  if (e.code !== 'KeyM' || e.repeat || activePlanet() !== PLANET || isText(e.target)) return;
  MAP.on = !MAP.on; try { localStorage.setItem('minimap-off', MAP.on ? '0' : '1'); } catch (err) {}
});

// ---------- speed ----------
// if the frames get slow, render fewer pixels (and more again when there's room)
let fpsT = 0, fpsN = 0, quality = Math.min(devicePixelRatio, 1.5);
renderer.setPixelRatio(quality);
function watchSpeed(raw) {
  fpsT += raw; fpsN++;
  if (fpsT < 2) return;
  const ms = (fpsT / fpsN) * 1000; fpsT = fpsN = 0;
  if (ms > 22 && quality > 0.75) { quality = Math.max(0.75, quality - 0.25); renderer.setPixelRatio(quality); }
  else if (ms < 13 && quality < Math.min(devicePixelRatio, 1.5)) { quality = Math.min(Math.min(devicePixelRatio, 1.5), quality + 0.25); renderer.setPixelRatio(quality); }
}
// shadows: only redrawn every other frame (nobody can tell, and it's one of the most expensive things)
renderer.shadowMap.autoUpdate = false;
let shadowFlip = 0;

// ---------- loop ----------
const clock = new THREE.Clock();
let time = 0;
function frame() {
  if (activePlanet() !== PLANET) { requestAnimationFrame(frame); return; }   // paused while you're on another planet
  adoptCookies();
  const raw = clock.getDelta(), dt = Math.min(raw, 1 / 30);
  time += dt;
  if (time > 4) watchSpeed(Math.min(raw, 0.5));
  updateSize(dt);
  const hs = updatePlayer(dt, time);
  updateBoss(dt, time, P, P.prevY, bossApi);
  lockArena(dt);
  // Byte taken over (or freed again): park the copied ability until he's back
  if (hacked() !== wasHacked) {
    wasHacked = hacked();
    if (wasHacked) { P.heldAbility = P.ability; P.ability = null; P.mag = null; setAbility(null); }
    else {
      drone.g.visible = true;
      if (P.heldAbility !== undefined) P.ability = P.heldAbility;
      P.heldAbility = undefined;
      if (P.ability && AB[P.ability]) setAbility(P.ability, AB[P.ability]); else setAbility(null);
      showCombo();
    }
  }
  if (!cs.active) enemies.update(dt, time, P, P.prevY, enemyApi, life.inv > 0);
  updateHP(dt);
  sfx.music(bossActive() ? (BOSS_INFO.music || 'boss') : PLANET);
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
  updateSparks(dt);
  updateCombo(dt, time);
  subs.update(dt, time);
  updateParticles(dt);
  updateLights(dt);
  if ((shadowFlip ^= 1) || raw > 0.05) renderer.shadowMap.needsUpdate = true;
  renderer.render(scene, camera);
  drawMap(dt);
  requestAnimationFrame(frame);
}
frame();
