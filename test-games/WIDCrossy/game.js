import * as THREE from 'https://artifactcdn.diabrowser.engineering/ajax/libs/three.js/three.module.js';
import { CHARS, byId, buildChar, box } from './chars.js';
import { STORY, QUIPS } from './lore.js';
import { World, COLS } from './world.js';
import { Cutscene } from './cutscene.js';
import { ABILITIES } from './abilities.js';

const $ = id => document.getElementById(id);
const show = (id, on = true) => $(id).classList.toggle('hidden', !on);

// ---------- save ----------
const KEY = 'widrCrossy.v1';
const save = Object.assign({ coins: 0, best: 0, unlocked: ['josh', 'nathan'], sel: 'josh', seen: [] }, JSON.parse(localStorage.getItem(KEY) || '{}'));
const store = () => localStorage.setItem(KEY, JSON.stringify(save));

// ---------- sound ----------
let ac;
function tone(f, d, type = 'square', v = 0.08, f2) {
  ac = ac || new (window.AudioContext || window.webkitAudioContext)();
  const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
  o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g).connect(ac.destination); o.start(t); o.stop(t + d + 0.02);
}
function sfx(n) {
  try {
    if (n === 'hop') tone(420, 0.08, 'square', 0.05, 640);
    else if (n === 'coin') { tone(990, 0.08, 'square', 0.06); setTimeout(() => tone(1480, 0.14, 'square', 0.06), 70); }
    else if (n === 'squash') tone(180, 0.35, 'sawtooth', 0.12, 40);
    else if (n === 'splash') tone(900, 0.4, 'triangle', 0.1, 80);
    else if (n === 'train') { tone(330, 0.5, 'sawtooth', 0.05); tone(392, 0.5, 'sawtooth', 0.05); }
    else if (n === 'bell') tone(1200, 0.12, 'triangle', 0.05);
    else if (n === 'chapter') [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'square', 0.05), i * 90));
    else if (n === 'talk') tone(300 + Math.random() * 200, 0.05, 'square', 0.03);
    else if (n === 'meta') { tone(880, 0.12, 'sine', 0.07, 1320); setTimeout(() => tone(660, 0.1, 'sine', 0.06), 90); }
    else if (n === 'unlock') [659, 784, 988, 1318].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'triangle', 0.08), i * 110));
  } catch (e) {}
}

// ---------- renderer & world ----------
const renderer = new THREE.WebGLRenderer({ canvas: $('game'), antialias: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0xbfe9ff);
const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
scene.add(new THREE.HemisphereLight(0xffffff, 0x99aa88, 1.5));
const sun = new THREE.DirectionalLight(0xfff4e0, 1.9); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 50 });
scene.add(sun, sun.target);
const world = new World(scene);
world.safeRows = new Set(STORY.filter(c => c.at > 0).map(c => c.at));
const cut = new Cutscene(renderer, sfx);
const metaHawk = buildChar('meta'); metaHawk.root.scale.setScalar(2.2); metaHawk.root.visible = false; scene.add(metaHawk.root);
const fx = new THREE.Group(); scene.add(fx);

// ---------- player ----------
const P = { col: 0, row: 0, x: 0, maxRow: 0, hop: null, queue: null, log: null, logOff: 0, dead: false, idle: 0, grace: 0 };
const is = id => save.sel === id;
function setPlayerModel() {
  if (P.m) scene.remove(P.m.root);
  P.m = buildChar(save.sel); scene.add(P.m.root);
}

let state = 'title', camRow = 0, camX = 0, started = false, deathT = 0, deathCause = '', T = 0;

function resetRun() {
  world.reset(); fx.clear();
  Object.assign(P, { col: 0, row: 0, x: 0, maxRow: 0, hop: null, queue: null, log: null, dead: false, idle: 0, grace: 0,
    cd: 0, slowT: 0, slowAmt: 1, lives: is('robin') ? 1 : 0, shield: is('adam'), shieldAt: 0, bounceCd: 0, combo: 0, lastHop: -9 });
  setPlayerModel(); P.m.root.position.set(0, 0, 0); P.m.root.rotation.set(0, 0, 0); P.m.inner.scale.setScalar((byId(save.sel).scale || 1) * 0.85);
  metaHawk.root.visible = false; camRow = 0; camX = 0; started = false;
  world.warnTime = is('niek') ? 3 : 1.4;
  updateHud(); updateAbilityHud();
}

function updateHud() {
  $('score').textContent = P.maxRow; $('best').textContent = 'TOP ' + Math.max(save.best, P.maxRow);
  $('coins').querySelector('b').textContent = save.coins; $('walletCoins').textContent = save.coins;
}
let toastT;
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 1800); }

function addCoins(n) {
  if (!n) return;
  save.coins += n * (is('ankervos') ? 2 : 1); store(); updateHud(); sfx('coin');
}

// ---------- particles ----------
function burst(x, row, color, n = 10, up = 4, size = 0.12) {
  for (let i = 0; i < n; i++) {
    const d = box(fx, size, size, size, color, x, 0.4, -row, color);
    d.userData = { v: new THREE.Vector3((Math.random() - 0.5) * 5, up * (0.6 + Math.random() * 0.6), (Math.random() - 0.5) * 3), life: 0.9 };
  }
}
function projectile(color, rows, size = 0.22) {
  const d = box(fx, size, size, size, color, P.x, 0.5, -P.row, color);
  d.userData = { v: new THREE.Vector3(0, 0, -rows / 0.5), life: 0.5, spin: true, noGrav: true };
}
function updateFx(dt) {
  for (const d of [...fx.children]) {
    const u = d.userData; if (!u.v) continue;
    if (!u.noGrav) u.v.y -= 12 * dt;
    d.position.addScaledVector(u.v, dt);
    if (u.spin) { d.rotation.x += dt * 14; d.rotation.y += dt * 9; }
    if (u.life !== undefined) { u.life -= dt; if (u.life <= 0) fx.remove(d); }
  }
}

// ---------- abilities ----------
const roadsAhead = (from, to) => { const out = []; for (let r = from; r <= to; r++) { const l = world.lane(r); if (l && l.type === 'road') out.push(r); } return out; };
const knock = (rows, secs, color) => rows.forEach(r => world.clearRoad(r, secs).forEach(x => burst(x, r, color, 6, 6, 0.16)));

// Each active returns false when it couldn't fire, so the cooldown isn't spent.
const ACTIVE = {
  josh() { world.freezeT = 3; burst(P.x, P.row, 0x00e5ff, 14); toast('📡 Grid hacked! Traffic frozen'); },
  nathan() { const r = roadsAhead(P.row, P.row + 8).slice(0, 2); if (!r.length) return false; knock(r, 4, 0xffffff); projectile(0xffffff, 4, 0.14); toast('⚾ HOME RUN!'); },
  ati() { const r = roadsAhead(P.row, P.row + 5); projectile(0xff7ccf, 5, 0.26); if (r.length) knock(r, 3, 0xff7ccf); toast('🩴 The slipper never misses'); },
  daniel() {
    const c = Math.round(P.x);
    world.smash(P.row, c, 2).forEach(([x, r]) => burst(x, r, 0x8b5a2b, 6, 5, 0.18));
    const near = [0, 1, -1, 2, -2].map(d => P.row + d).filter(r => world.lane(r) && world.lane(r).type === 'road');
    if (near.length) knock([near[0]], 3, 0xff7a1f);
    burst(P.x, P.row, 0xffa000, 20, 6, 0.2); toast('💣 KABOOM');
  },
  deniz() {
    let n = 0; for (let r = P.row; r <= P.row + 10; r++) { const l = world.lane(r); if (l && l.type === 'river') { l.frozenT = 5; n++; } }
    P.slowT = 5; P.slowAmt = 0.6; burst(P.x, P.row, 0xbff3ff, 18, 5); toast(n ? '❄️ Blizzard! Rivers frozen' : '❄️ Blizzard! Traffic slowed');
  },
  enno() { P.slowT = 4; P.slowAmt = 0.3; toast('🧮 Calculating… world slowed'); },
  fionn() {
    const c = Math.round(P.x);
    for (let r = P.row + 1; r <= P.row + 5; r++) {
      const l = world.lane(r);
      if (l && l.type === 'river' && !world.logAt(r, c)) { world.addStone(r, c); projectile(0x8a8178, r - P.row, 0.18); toast('🪨 Stepping stone!'); return; }
    }
    toast('No open river close by'); return false;
  },
  milo() {
    const c = Math.round(P.x);
    for (let n = 3; n >= 1; n--) {
      const r = P.row + n; world.ensure(r + 22); const l = world.lane(r);
      if (!l || l.blocked.has(c)) continue;
      if (l.type === 'river' && !world.frozen(r) && !world.logAt(r, c)) continue;
      if (world.carHit(r, c, 0.6) || world.trainHit(r, c)) continue;
      burst(P.x, P.row, 0xfff27a, 14, 6);
      P.hop = null; P.queue = null; P.log = null; P.row = r; P.x = c; P.col = c; P.grace = 0.8;
      const lg = l.type === 'river' && world.logAt(r, c); if (lg) { P.log = lg; P.logOff = c - lg.x; }
      if (world.takeCoin(r, c)) addCoins(1);
      burst(P.x, P.row, 0xfff27a, 14, 6); sfx('chapter');
      if (r > P.maxRow) { P.maxRow = r; updateHud(); checkStory(); }
      toast('⚡ ZAP!'); return;
    }
    toast('Nowhere safe to dash'); return false;
  },
  renas() {
    const pool = Object.keys(ACTIVE).filter(k => k !== 'renas');
    const k = pool[Math.floor(Math.random() * pool.length)];
    const ok = ACTIVE[k]();
    setTimeout(() => toast('🎒 Gadget: ' + ABILITIES[k].name), 40);
    return ok;
  },
  reshman() { P.grace = 3; P.phase = 3; toast('👤 Shadow phase'); },
  yassin() { knock([P.row - 1, P.row, P.row + 1], 3, 0xe8202a); burst(P.x, P.row, 0xe8202a, 8, 3); toast('🥊 ROUNDHOUSE'); },
  oela() {
    const c = Math.round(P.x); let n = 0;
    for (let r = P.row + 1; r <= P.row + 12; r++) if (world.takeCoin(r, c)) n++;
    projectile(0xffffff, 12, 0.18); addCoins(n); toast(n ? `⚽ Through ball! +${n * (is('ankervos') ? 2 : 1)} 🪙` : '⚽ Through ball! (no coins in that line)');
  },
  zennith() { world.darkT = 6; toast('🌑 Lights out'); },
};

function useAbility() {
  const a = ABILITIES[save.sel];
  if (state !== 'play' || P.dead || a.type !== 'active' || P.cd > 0) return;
  if (ACTIVE[save.sel]() === false) return;
  P.cd = a.cd; started = true; P.idle = 0; sfx('unlock'); updateAbilityHud();
}

function updateAbilityHud() {
  const a = ABILITIES[save.sel], el = $('abil'); if (!el) return;
  $('abIcon').textContent = a.icon; $('abName').textContent = a.name;
  let sub = 'Passive', fill = 1;
  if (a.type === 'active') { sub = P.cd > 0 ? Math.ceil(P.cd) + 's' : 'Ready · E'; fill = 1 - P.cd / a.cd; }
  if (is('adam')) { sub = P.shield ? 'Shield up' : 'Recharging · lane ' + (P.shieldAt + 40); fill = P.shield ? 1 : Math.min(1, (P.maxRow - P.shieldAt) / 40); }
  if (is('robin')) { sub = P.lives ? '1 extra life' : 'Rage used'; fill = P.lives ? 1 : 0; }
  if (is('thomas')) { sub = P.bounceCd > 0 ? Math.ceil(P.bounceCd) + 's' : 'Bounce ready'; fill = 1 - P.bounceCd / 15; }
  if (is('dean')) { sub = 'Combo ' + P.combo; fill = (P.combo % 10) / 10; }
  $('abSub').textContent = sub; $('abFill').style.width = Math.max(0, Math.min(1, fill)) * 100 + '%';
  el.classList.toggle('ready', a.type === 'active' && P.cd <= 0);
  el.classList.toggle('passive', a.type !== 'active');
}

// ---------- movement ----------
const FACE = { f: Math.PI, b: 0, l: -Math.PI / 2, r: Math.PI / 2 };
function tryMove(dir) {
  if (state !== 'play' || P.dead) return;
  if (P.hop) { P.queue = dir; return; }
  const dc = dir === 'l' ? -1 : dir === 'r' ? 1 : 0, dr = dir === 'f' ? 1 : dir === 'b' ? -1 : 0;
  P.m.root.rotation.y = FACE[dir];
  const tc = Math.round(P.x) + dc, tr = P.row + dr;
  world.ensure(tr + 22);
  const L = world.lane(tr);
  if (L && L.blocked.has(tc) && is('lars') && L.type !== 'wall' && Math.abs(tc) <= COLS) {
    world.smash(tr, tc).forEach(([x, r]) => burst(x, r, 0x8b5a2b, 8, 4, 0.16));
  }
  if (Math.abs(tc) > COLS || !L || L.blocked.has(tc)) { P.m.inner.scale.y *= 0.8; return; }
  started = true; P.idle = 0;
  if (is('dean') && dir === 'f') {
    P.combo = T - P.lastHop < 0.6 ? P.combo + 1 : 1; P.lastHop = T;
    if (P.combo % 10 === 0) { addCoins(3); toast('🎧 Combo x' + P.combo + '! +3 🪙'); }
  } else if (is('dean')) P.combo = 0;
  P.hop = { fx: P.x, fz: -P.row, tx: tc, tr, t: 0, dur: is('ash') ? 0.08 : 0.13 };
  P.log = null; sfx('hop');
}

function floatOn(L) {
  // Guiseppe bobs on the water and drifts at the lane's current
  const v = (L.movers.find(m => !m.stone) || { vx: 0 }).vx * 0.7;
  P.log = { x: P.x, vx: v, len: 1, float: true }; P.logOff = 0;
}

function land() {
  const h = P.hop; P.hop = null; P.row = h.tr; P.x = h.tx; P.col = h.tx;
  if (P.row > P.maxRow) { P.maxRow = P.row; updateHud(); }
  if (is('adam') && !P.shield && P.maxRow >= P.shieldAt + 40) { P.shield = true; toast('🎾 Backhand ready'); }
  const L = world.lane(P.row);
  if (L.type === 'river' && !world.frozen(P.row)) {
    const lg = world.logAt(P.row, P.x);
    if (!lg) { if (is('guiseppe')) floatOn(L); else return die('water'); }
    else {
      P.log = lg; lg.sink = 0.08;
      P.logOff = Math.max(-lg.len / 2 + 0.4, Math.min(lg.len / 2 - 0.4, P.x - lg.x));
    }
  }
  let n = world.takeCoin(P.row, P.col) ? 1 : 0;
  if (is('niek') || is('meta')) [[0, -1], [0, 1], [1, 0], [1, -1], [1, 1]].forEach(([dr, dc]) => { if (world.takeCoin(P.row + dr, P.col + dc)) n++; });
  addCoins(n);
  if (checkStory()) { P.queue = null; return; }
  if (P.queue) { const q = P.queue; P.queue = null; tryMove(q); }
}

// ---------- death ----------
// Passive abilities that can cancel a hit. Returns true if the player survives.
function saved(cause) {
  if (cause !== 'car' && cause !== 'train') return false;
  if (is('thomas') && cause === 'car' && P.bounceCd <= 0) {
    P.bounceCd = 15; P.grace = 1.2; P.hop = null;
    const back = world.lane(P.row - 1);
    if (back && back.type !== 'river' && !back.blocked.has(Math.round(P.x)) && P.row - 1 > camRow - 4) { P.row -= 1; P.log = null; }
    burst(P.x, P.row, 0xffc48a, 10); toast('🟠 Rolled with it!'); sfx('hop'); return true;
  }
  if (is('adam') && P.shield) {
    P.shield = false; P.shieldAt = P.maxRow; P.grace = 1.5;
    burst(P.x, P.row, 0xd6ff3a, 14, 6); toast('🎾 BACKHAND! Returned to sender'); sfx('coin'); return true;
  }
  if (is('robin') && P.lives > 0) {
    P.lives--; P.grace = 3;
    burst(P.x, P.row, 0x5ac8ff, 18, 6); toast('😭 ROBIN IS FURIOUS'); sfx('squash'); return true;
  }
  return false;
}

function die(cause) {
  if (P.dead || (P.grace > 0 && (cause === 'car' || cause === 'train' || cause === 'meta'))) return;
  if (saved(cause)) return updateAbilityHud();
  P.dead = true; deathCause = cause; deathT = 0; P.hop = null;
  if (cause === 'car') { sfx('squash'); P.m.inner.scale.set(1.3, 0.12, 1.3); P.m.root.position.y = 0.02; }
  if (cause === 'water') { sfx('splash'); for (let i = 0; i < 10; i++) { const d = box(fx, 0.12, 0.12, 0.12, 0xffffff, P.x, 0, -P.row); d.userData.v = new THREE.Vector3((Math.random() - 0.5) * 3, 3 + Math.random() * 2, (Math.random() - 0.5) * 3); } }
  if (cause === 'train') { sfx('train'); P.fly = new THREE.Vector3(world.lane(P.row).dir * 14, 7, -2); }
  if (cause === 'meta') { sfx('meta'); metaHawk.root.visible = true; metaHawk.root.position.set(P.x + 10, 9, -P.row + 4); }
  if (P.maxRow > save.best) save.best = P.maxRow;
  store();
}

function showDeath() {
  state = 'dead';
  $('deathScore').textContent = P.maxRow;
  $('deathBest').textContent = P.maxRow >= save.best && P.maxRow > 0 ? '★ New top rank!' : 'Top rank: ' + save.best;
  const q = QUIPS[deathCause]; $('deathQuip').textContent = q[Math.floor(Math.random() * q.length)];
  show('hud', false); show('death');
}

// ---------- story ----------
// Chapters only start while standing on grass, so a scene never begins mid-road or on a log.
// A chapter you passed on a road or river waits for the next grass lane.
function checkStory() {
  const L = world.lane(P.row);
  if (P.dead || P.hop || !L || L.type !== 'grass') return false;
  const ch = STORY.find(c => c.at > 0 && P.maxRow >= c.at && !save.seen.includes(c.id));
  if (!ch) return false;
  playChapter(ch, () => { state = 'play'; show('hud'); P.grace = 1.5; P.idle = 0; camRow = Math.max(camRow, P.row - 1.5); });
  return true;
}
function playChapter(ch, after) {
  state = 'cut'; show('hud', false);
  cut.play(ch, save.sel, () => {
    const first = !save.seen.includes(ch.id);
    if (first) save.seen.push(ch.id);
    if (ch.unlock && !save.unlocked.includes(ch.unlock)) { save.unlocked.push(ch.unlock); popUnlock(ch.unlock); }
    store(); after();
  });
}
function popUnlock(id) {
  const c = byId(id); $('upName').textContent = c.name + ' joined!'; $('upTitle').textContent = c.title;
  show('unlockPop'); sfx('unlock'); setTimeout(() => show('unlockPop', false), 2200);
}

// ---------- flow ----------
function startRun() {
  sfx('hop');
  show('title', false); show('death', false);
  resetRun();
  const go = () => { state = 'play'; show('hud'); };
  if (!save.seen.includes('prologue')) playChapter(STORY[0], go); else go();
}
function toTitle() { show('death', false); show('hud', false); show('title'); resetRun(); state = 'title'; }

$('btnPlay').onclick = startRun; $('btnRetry').onclick = startRun;
$('btnDeathMenu').onclick = toTitle;
$('btnChars').onclick = () => openSelect('title'); $('btnDeathChars').onclick = () => openSelect('dead');
$('btnStory').onclick = openStory;
document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => { show('select', false); show('story', false); toTitle(); });

// ---------- input ----------
const KEYS = { ArrowUp: 'f', KeyW: 'f', ArrowDown: 'b', KeyS: 'b', ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r' };
addEventListener('keydown', e => {
  if (state === 'cut') return;
  if (KEYS[e.code]) { e.preventDefault(); if (!e.repeat) tryMove(KEYS[e.code]); }
  if ((e.code === 'KeyE' || e.code === 'KeyQ' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') && !e.repeat) { e.preventDefault(); useAbility(); }
  if ((e.code === 'Space' || e.code === 'Enter') && !$('title').classList.contains('hidden') && $('select').classList.contains('hidden')) { e.preventDefault(); startRun(); }
  else if ((e.code === 'Space' || e.code === 'Enter') && state === 'dead' && !$('death').classList.contains('hidden')) { e.preventDefault(); startRun(); }
  else if (e.code === 'Space' && state === 'play') { e.preventDefault(); tryMove('f'); }
});
let touch;
$('game').addEventListener('pointerdown', e => { touch = { x: e.clientX, y: e.clientY }; });
$('game').addEventListener('pointerup', e => {
  if (!touch || state !== 'play') return;
  const dx = e.clientX - touch.x, dy = e.clientY - touch.y; touch = null;
  if (Math.hypot(dx, dy) < 24) return tryMove('f');
  tryMove(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'r' : 'l') : (dy > 0 ? 'b' : 'f'));
});
$('abil').addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); useAbility(); });

// ---------- character select ----------
const pr = new THREE.WebGLRenderer({ canvas: $('preview'), antialias: true, alpha: true });
pr.setPixelRatio(Math.min(2, devicePixelRatio));
const ps = new THREE.Scene(), pc = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
ps.add(new THREE.HemisphereLight(0xffffff, 0x998877, 1.8)); const pl = new THREE.DirectionalLight(0xffffff, 1.5); pl.position.set(3, 5, 4); ps.add(pl);
const pedestal = new THREE.Group(); ps.add(pedestal); box(pedestal, 1.6, 0.25, 1.6, 0x9ad85e, 0, -0.125, 0); box(pedestal, 1.6, 0.35, 1.6, 0x8b5a2b, 0, -0.42, 0);
pc.position.set(0, 1.3, 4.2); pc.lookAt(0, 0.55, 0);
let pm = null, viewId = null, selFrom = 'title';
const silhouette = new THREE.MeshBasicMaterial({ color: 0x1d1a2f });
const unlockHint = c => c.unlock === 'ch1' ? 'Reach lane 25 in the story' : c.unlock === 'ch2' ? 'Reach lane 60 in the story' : c.unlock === 'ch3' ? 'Reach lane 100 in the story' : c.unlock === 'finale' ? 'Finish the story (lane 200)' : 'Win from the prize machine';

function openSelect(from) {
  selFrom = from; show('title', false); show('death', false); show('select');
  resize(); renderGrid(); viewChar(save.sel);
}
function renderGrid() {
  $('unlockCount').textContent = save.unlocked.length + ' / ' + CHARS.length + ' unlocked';
  $('grid').innerHTML = '';
  CHARS.forEach(c => {
    const own = save.unlocked.includes(c.id), hidden = !own && c.unlock && c.unlock !== 'start';
    const d = document.createElement('div');
    d.className = 'tile' + (own ? '' : ' locked') + (c.id === viewId ? ' on' : '') + (c.id === save.sel ? ' cur' : '');
    d.innerHTML = `<div class="sw" style="background:${c.color}">${own ? c.name[0] : '?'}</div><b>${hidden ? '???' : c.name}</b><small>${own ? c.title : hidden ? 'Secret' : 'Locked'}</small>`;
    d.onclick = () => { viewChar(c.id); sfx('talk'); };
    $('grid').appendChild(d);
  });
  const pool = CHARS.filter(c => !c.unlock && !save.unlocked.includes(c.id));
  $('btnGacha').disabled = save.coins < 100 || !pool.length;
  $('btnGacha').textContent = pool.length ? `🎰 Prize machine · 100 🪙 (you have ${save.coins})` : '🎰 Prize machine empty!';
}
function viewChar(id) {
  viewId = id; const c = byId(id), own = save.unlocked.includes(id), hidden = !own && c.unlock && c.unlock !== 'start';
  if (pm) pedestal.remove(pm.root);
  pm = buildChar(id); pm.root.position.y = 0; pedestal.add(pm.root);
  if (!own) pm.root.traverse(o => { if (o.isMesh) o.material = silhouette; });
  $('dName').textContent = hidden ? '???' : c.name; $('dTitle').textContent = hidden ? 'Secret character' : c.title;
  $('dBio').textContent = own ? c.bio : hidden ? 'A secret member of the story. Keep crossing to find out who.' : c.bio;
  $('dSecret').textContent = own ? '🔒 Secret file: ' + c.secret : '🔓 ' + unlockHint(c);
  const ab = ABILITIES[id];
  $('dAbil').innerHTML = hidden ? '<b>??? ability</b><span>Unlock to find out.</span>'
    : `<em>${ab.icon}</em><div><b>${ab.name}</b> <i class="${ab.type}">${ab.type === 'active' ? 'Active · E · ' + ab.cd + 's' : 'Passive'}</i><span>${ab.desc}</span></div>`;
  $('btnPick').disabled = !own; $('btnPick').textContent = save.sel === id ? '✔ Picked' : own ? 'Pick ' + c.name : 'Locked';
  renderGrid();
}
$('btnPick').onclick = () => { save.sel = viewId; store(); sfx('coin'); viewChar(viewId); setPlayerModel(); resetRun(); };
$('btnGacha').onclick = () => {
  const pool = CHARS.filter(c => !c.unlock && !save.unlocked.includes(c.id));
  if (save.coins < 100 || !pool.length) return;
  save.coins -= 100; const c = pool[Math.floor(Math.random() * pool.length)];
  save.unlocked.push(c.id); save.sel = c.id; store(); updateHud(); popUnlock(c.id); viewChar(c.id); resetRun();
};

function openStory() {
  show('title', false); show('story');
  $('chapters').innerHTML = '';
  STORY.forEach(ch => {
    const seen = save.seen.includes(ch.id), li = document.createElement('li');
    li.className = seen ? '' : 'locked';
    li.innerHTML = `<div><div class="n">${ch.title}${ch.at ? ' · lane ' + ch.at : ''}</div><h4>${seen ? ch.name : '? ? ?'}</h4></div>`;
    const b = document.createElement('button'); b.textContent = seen ? '▶ Watch' : '🔒';
    b.disabled = !seen && ch.at > 0;
    if (!seen && ch.at === 0) b.textContent = '▶ Watch';
    b.onclick = () => { show('story', false); resetRun(); playChapter(ch, () => { state = 'title'; openStory(); }); };
    li.appendChild(b); $('chapters').appendChild(li);
  });
}

// ---------- loop ----------
function resize() {
  const w = innerWidth, h = innerHeight, a = w / h;
  renderer.setSize(w, h, false);
  const viewW = Math.max(13, 11.5 * a > 13 ? 11.5 * a : 13), viewH = viewW / a;
  Object.assign(cam, { left: -viewW / 2, right: viewW / 2, top: viewH / 2, bottom: -viewH / 2 }); cam.updateProjectionMatrix();
  const pw = $('preview').clientWidth, ph = $('preview').clientHeight;
  if (pw && ph) { pr.setSize(pw, ph, false); pc.aspect = pw / ph; pc.updateProjectionMatrix(); }
}
addEventListener('resize', resize);

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; T += dt;
  if (state === 'cut') {
    cut.update(dt, T); cut.render(innerWidth, innerHeight);
  } else {
    step(dt);
    renderer.render(scene, cam);
  }
  if (!$('select').classList.contains('hidden')) {
    if (!pr.domElement.width || pr.domElement.width < 10) resize();
    if (pm) { pm.anim(T); pedestal.rotation.y = T * 0.7; }
    pr.render(ps, pc);
  }
  requestAnimationFrame(frame);
}

function step(dt) {
  const playing = state === 'play';
  // ability timers and world hooks
  P.cd = Math.max(0, P.cd - dt); P.bounceCd = Math.max(0, P.bounceCd - dt); P.slowT = Math.max(0, P.slowT - dt);
  world.slow = P.slowT > 0 ? P.slowAmt : 1;
  world.casperRow = is('casper') ? P.row : null;
  world.update(dt, T, l => { if (Math.abs(l.row - P.row) < 9) { sfx('bell'); } });
  updateFx(dt);
  const dark = world.darkT > 0;
  sun.intensity += ((dark ? 0.35 : 1.9) - sun.intensity) * Math.min(1, dt * 4);
  scene.background.lerp(new THREE.Color(dark ? 0x3a3060 : P.slowT > 0 && is('enno') ? 0xd6f5ec : 0xbfe9ff), Math.min(1, dt * 4));
  if (playing) updateAbilityHud();
  P.m.anim(T);
  P.grace = Math.max(0, P.grace - dt);
  P.m.root.visible = P.grace > 0 ? (T * 12 % 1) < 0.6 : true;

  if (!P.dead) {
    // hop animation with squash and stretch
    if (P.hop) {
      const h = P.hop; h.t += dt / h.dur; const k = Math.min(1, h.t);
      P.x = h.fx + (h.tx - h.fx) * k;
      P.m.root.position.set(P.x, Math.sin(k * Math.PI) * 0.45, h.fz + (-h.tr - h.fz) * k);
      if (h.t >= 1) land();
    } else {
      const L = world.lane(P.row);
      if (P.log && P.log.float) P.log.x += P.log.vx * dt * world.slow * (world.freezeT > 0 || world.frozen(P.row) ? 0 : 1);
      if (P.log) { P.x = P.log.x + P.logOff; if (Math.abs(P.x) > COLS + 1.2) die('water'); }
      // the ice melted under you
      else if (playing && L && L.type === 'river' && !world.frozen(P.row)) {
        const lg = world.logAt(P.row, P.x);
        if (lg) { P.log = lg; P.logOff = P.x - lg.x; } else if (is('guiseppe')) floatOn(L); else die('water');
      }
      P.m.root.position.set(P.x, P.log ? (P.log.float ? -0.05 + Math.sin(T * 4) * 0.05 : 0.16) : 0, -P.row);
      P.idle += playing && started ? dt : 0;
    }
    const s = (byId(save.sel).scale || 1) * 0.85; P.m.inner.scale.lerp(new THREE.Vector3(s, s, s), dt * 14);
    if (playing && !P.dead) {
      const r = P.hop && P.hop.t > 0.5 ? P.hop.tr : P.row;
      if (world.carHit(r, P.x, is('dih') ? 0.02 : 0.22)) die('car');
      else if (world.trainHit(r, P.x)) die('train');
      const idleLimit = is('meta') ? Infinity : is('ati') ? 27 : 9;
      if (!P.hop && started && !P.dead && (P.row < camRow - 4.2 || P.idle > idleLimit)) die('meta');
    }
    if (playing && started) camRow += dt * (0.32 + Math.min(0.5, P.maxRow * 0.003));
    camRow += (Math.max(camRow, P.row - 0.5) - camRow) * Math.min(1, dt * 4);
  } else {
    deathT += dt;
    const r = P.m.root;
    if (deathCause === 'water') r.position.y -= dt * 2;
    if (deathCause === 'train') { r.position.addScaledVector(P.fly, dt); r.rotation.x += dt * 12; r.rotation.z += dt * 9; }
    if (deathCause === 'meta') {
      const m = metaHawk.root, tgt = r.position.clone().add(new THREE.Vector3(0, 0.6, 0));
      if (deathT < 0.7) m.position.lerp(tgt, Math.min(1, dt * 7));
      else { m.position.add(new THREE.Vector3(-8 * dt, 9 * dt, -4 * dt)); r.position.copy(m.position).add(new THREE.Vector3(0, -0.9, 0)); }
      metaHawk.anim(T);
    }
    if (deathT > 1.3 && state === 'play') showDeath();
  }
  world.ensure(P.row + 22); world.cull(Math.floor(camRow) - 12);

  // camera
  if (state === 'title') { camRow = P.row - 0.5 + Math.sin(T * 0.4) * 0.3; }
  camX += (Math.max(-2.5, Math.min(2.5, P.x)) * 0.6 - camX) * Math.min(1, dt * 3);
  const focus = new THREE.Vector3(camX, 0, -camRow - 1.5);
  cam.position.copy(focus).add(new THREE.Vector3(3.2, 12, 7.5)); cam.lookAt(focus);
  sun.position.copy(focus).add(new THREE.Vector3(-5, 14, 6)); sun.target.position.copy(focus);
}

resetRun(); resize(); updateHud(); requestAnimationFrame(frame);
