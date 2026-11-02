import { THREE, R, scene, cam, actors, cineGroup, setEnv, setScroll, W, updateWorld, explode, updateParticles, flash, shake, renderFrame, setQuality, ENVS } from './world.js';
import { S, P, SCHEMA, DIFF, META_FREQ, TEXT_CPS, persist, resetProgress, restoreDefaults } from './settings.js';
import * as MD from './models.js';
import { makeCharacter, animateCharacter, symbolSprite } from './characters.js';
import { CAST, SCRIPTS, STAGES, ROSTER, BY_ID, META_LINES, META_REPLIES, OVER_QUOTES, STAGE_ENV } from './story.js';
import { PORTRAITS } from './portraits.js';
import { isUnlocked, progressOf, checkUnlocks, UNLOCKS } from './unlocks.js';
import { makeShots } from './shots.js';
import { makeMoreShots, glitchify } from './shots2.js';
import { Sound } from './audio.js';

const $ = id => document.getElementById(id);
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[(Math.random() * a.length) | 0];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = t => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
const keys = {}; const k = c => keys[c] ? 1 : 0;
const clock = new THREE.Clock();
let mode = 'home', T = 0, backdrop = null, dmgV = 0;
let PL = BY_ID.josh, selIdx = 0, pendingStage = null;

/* ---------- Comms ---------- */
const comm = { el: $('comm'), q: [], cur: null, t: 0 };
const BACKUP = ['ati', 'renas', 'nathan', 'enno', 'thomas'];
function resolve(who, text) {
  if (who === 'LEAD') who = PL.id; if (who === 'CAP') who = CAP(); if (who === 'SIB') who = SIB();
  if (text[0] === '@') text = PL[text.slice(1)];
  if (who === PL.id && text.includes('{LEAD}')) who = BACKUP.find(b => b !== PL.id);
  return [who, text.replaceAll('{LEAD}', PL.nm).replaceAll('{CAP}', BY_ID[CAP()].nm).replaceAll('{SIB}', BY_ID[SIB()].nm)];
}
function showLine(who, text, cine) {
  [who, text] = resolve(who, text);
  const c = CAST[who], el = comm.el;
  el.classList.toggle('nar', who === 'nar'); el.classList.toggle('meta', who === 'meta');
  $('portrait').innerHTML = c.svg;
  $('who').querySelector('span').textContent = c.name + (who === PL.id ? '  ·  YOU' : '');
  $('who').querySelector('b').style.background = c.color;
  $('role').textContent = c.role; $('line').textContent = '';
  $('next').classList.toggle('hidden', !cine);
  el.classList.remove('hidden'); el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
  comm.cur = { who, text, n: 0 }; comm.t = 0;
}
const say = (who, text) => comm.q.push([who, text]);
function hideComm() { comm.cur = null; comm.el.classList.add('hidden'); }
function updateComm(dt) {
  if (comm.cur) {
    comm.t += dt;
    const n = Math.min(comm.cur.text.length, Math.floor(comm.t * TEXT_CPS[S.textSpeed]));
    if (n !== comm.cur.n) { if (n % 3 === 0) Sound.blip(); comm.cur.n = n; $('line').textContent = comm.cur.text.slice(0, n); }
    const svg = $('portrait').firstChild; if (svg) svg.style.animationPlayState = n < comm.cur.text.length ? 'running' : 'paused';
    if (mode === 'play' && comm.t > 1.6 + comm.cur.text.length * 0.042) hideComm();
  }
  if (!comm.cur && comm.q.length && mode === 'play') showLine(...comm.q.shift(), false);
}

/* ---------- Cutscenes ---------- */
let cine = null;
const shotCtx = { group: cineGroup, cam, explode, flash, shake, setScroll, sound: Sound,
  lead: () => PL.id, captive: () => CAP(), sibling: () => SIB(), speaker: () => (cine && comm.cur ? comm.cur.who : null) };
const shots = { ...makeShots(shotCtx), ...makeMoreShots(shotCtx) };
function playCine(name, done) {
  if (S.cutscenes === 'skip') { clearActors(); if (player.g) player.g.visible = false; hideComm(); return done(); }
  mode = 'cine'; document.body.classList.add('cine');
  $('hud').classList.add('hidden'); $('skip').classList.remove('hidden');
  if (player.g) player.g.visible = false;
  clearActors(); comm.q = []; hideComm(); endPixel(); cam.fov = 62; cam.updateProjectionMatrix();
  cine = { beats: SCRIPTS[name], bi: -1, done }; Sound.music('cine'); nextBeat();
}
function nextBeat() {
  cine.bi++; const b = cine.beats[cine.bi];
  if (!b) return endCine();
  cineGroup.clear(); setEnv(b.env);
  cine.b = b; cine.lines = b.personal ? PL[b.personal] : b.lines;
  cine.t = 0; cine.li = -1; cine.update = shots[b.shot]();
  const cap = $('caption'), text = b.personal ? `${PL.nm.toUpperCase()} · ${PL.title}` : b.caption;
  if (text) { cap.textContent = text; cap.classList.remove('hidden'); cap.style.animation = 'none'; void cap.offsetWidth; cap.style.animation = ''; }
  else cap.classList.add('hidden');
  nextLine();
}
function nextLine() {
  cine.li++; const l = cine.lines[cine.li];
  if (!l) { hideComm(); cine.waiting = true; return; }
  cine.waiting = false; showLine(l[0], l[1], true);
}
function advance() {
  if (!cine || cine.waiting) return;
  if (comm.cur && comm.cur.n < comm.cur.text.length) comm.t = comm.cur.text.length / TEXT_CPS[S.textSpeed] + 0.01;
  else nextLine();
}
function updateCine(dt) {
  cine.t += dt; cine.update(cine.t, dt);
  if (S.autoAdvance && !cine.waiting && comm.cur && comm.t > 2.4 + comm.cur.text.length * 0.05) nextLine();
  if (cine.waiting && cine.t >= (cine.b.dur || 0)) nextBeat();
}
function endCine() {
  if (!cine) return;
  document.body.classList.remove('cine'); $('skip').classList.add('hidden'); $('caption').classList.add('hidden');
  hideComm(); cineGroup.clear(); const d = cine.done; cine = null; d();
}

/* ---------- Player ---------- */
const player = { g: null, power: 1 };
function setPlayerModel(id) {
  if (player.g) scene.remove(player.g);
  player.g = makeCharacter(id); player.g.visible = false; scene.add(player.g);
}
const bounds = () => W.env.bounds;
function resetPlayer() {
  const b = bounds(), st = PL.stats;
  Object.assign(player, { x: 0, y: (b[0] + b[1]) / 2, vx: 0, vy: 0, max: st.shield, shield: st.shield, boost: 100, boostLock: false,
    rollT: 0, rollDir: 0, rollCd: 0, inv: 2, charge: 0, holding: false, holdT: 0, alive: true, spd: 1, lowWarned: false,
    sp: 40, fx: {}, droneCd: 0, decoy: null });
  player.g.visible = true; player.g.rotation.set(0, 0, 0); player.g.position.set(player.x, player.y, 0);
}
const ppos = () => V3(player.x, player.y, 0);
const untouchable = () => { const f = player.fx; return f.spin > 0 || f.dig > 0 || f.roll > 0 || f.phase > 0 || f.invis > 0; };
function dmgMul() {
  const f = player.fx; let m = 1;
  if (f.pixel > 0) m *= 3; if (f.phase > 0) m *= 2;
  if (PL.id === 'robin' && player.shield < 40) m *= 2.5;
  return m;
}

/* ---------- Game state ---------- */
const G = { stage: 0, t: 0, ev: [], ei: 0, enemies: [], shots: [], bullets: [], pickups: [], allies: [], fxo: [], timers: [],
  score: 0, hits: 0, start: {}, clearT: -1, outroT: -1, overT: -1, boss: null, bossE: null, look: V3(0, 8, -40),
  stunT: 0, slowT: 0, metaT: 25, metaMute: 0 };
function clearActors() {
  actors.clear();
  for (const a of ['enemies', 'shots', 'bullets', 'pickups', 'allies', 'fxo', 'timers']) G[a] = [];
  G.boss = null; G.bossE = null; G.cage = null; G.stunT = 0; G.slowT = 0; $('bossbar').classList.add('hidden'); $('fxtag').classList.add('hidden');
}
const later = (dt, fn) => G.timers.push({ t: G.t + dt, fn });
function card(a, b, c) {
  const el = $('card');
  el.innerHTML = `<div class="s">${a}</div><div class="n">${b}</div>${c ? `<div class="d">${c}</div>` : ''}`;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
}
let fxTimer = 0;
function fxTag(text) { const el = $('fxtag'); el.textContent = text; el.classList.remove('hidden'); fxTimer = 1.8; }

/* ---------- Character select ---------- */
let selModel = null;
const SILHOUETTE = new THREE.MeshBasicMaterial({ color: 0x132044 });
const unlockedCount = () => ROSTER.filter(c => isUnlocked(P, c.id)).length;
function buildGrid() {
  $('grid').innerHTML = ROSTER.map((c, i) => {
    const open = isUnlocked(P, c.id);
    return `<div class="cc${c.id === 'josh' ? ' main' : ''}${open ? '' : ' locked'}" data-i="${i}">${PORTRAITS[c.id]}<span>${open ? c.nm.toUpperCase() : '???'}</span></div>`;
  }).join('');
  $('grid').querySelectorAll('.cc').forEach(el => {
    el.onclick = () => { Sound.init(); choose(+el.dataset.i); };
    el.ondblclick = () => confirmPick();
  });
  $('rostercount').textContent = `${unlockedCount()} / ${ROSTER.length} UNLOCKED`;
}
function choose(i) {
  selIdx = (i + ROSTER.length) % ROSTER.length; const c = ROSTER[selIdx], open = isUnlocked(P, c.id);
  $('grid').querySelectorAll('.cc').forEach((el, j) => el.classList.toggle('on', j === selIdx));
  $('grid').children[selIdx].scrollIntoView({ block: 'nearest' });
  $('detail').classList.toggle('locked', !open);
  $('dname').textContent = open ? c.nm.toUpperCase() : '???'; $('dtitle').textContent = c.title; $('dtitle').style.background = open ? c.color : '#132044';
  $('drole').textContent = c.role; $('dbio').textContent = open ? c.bio : 'A mystery fighter. Complete the challenge below to recruit them to the squad.';
  $('dspn').textContent = open ? c.spName : '???'; $('dsp').textContent = open ? c.spDesc : 'Unlock this fighter to see their special.'; $('dpas').textContent = open ? c.passive : '???';
  $('sts').style.width = (c.stats.shield / 150 * 100) + '%'; $('stv').style.width = (c.stats.move / 1.15 * 100) + '%'; $('stz').style.width = (c.stats.hit / 1.5 * 100) + '%';
  const pr = progressOf(P, c.id);
  $('dlock').classList.toggle('hidden', open);
  if (!open && pr) {
    $('dlocktext').textContent = pr.text;
    $('dlockbar').style.width = (pr.pct * 100) + '%';
    $('dlocknum').textContent = `${pr.v.toLocaleString()} / ${pr.goal.toLocaleString()}`;
  }
  $('go').textContent = open ? `FLY AS ${c.nm.toUpperCase()} ▸` : 'LOCKED';
  $('go').classList.toggle('disabled', !open);
  cineGroup.clear(); selModel = makeCharacter(c.id); selModel.position.set(0, 20, 0); cineGroup.add(selModel);
  if (!open) selModel.traverse(o => { if (o.isMesh) { if (o.material.blending === THREE.AdditiveBlending) o.visible = false; else o.material = SILHOUETTE; } if (o.isSprite) o.visible = false; });
  explode(V3(0, 20, -1.2), 0.25, 'spark'); Sound.blip();
}
function openSelect() {
  ['home', 'end', 'over', 'stages'].forEach(id => $(id).classList.add('hidden'));
  $('hud').classList.add('hidden'); clearActors(); if (player.g) player.g.visible = false;
  mode = 'select'; setEnv(0); setScroll(25); $('select').classList.remove('hidden');
  buildGrid();
  if (!isUnlocked(P, ROSTER[selIdx].id)) selIdx = ROSTER.findIndex(c => c.id === 'josh');
  choose(selIdx); Sound.music('title');
}
function fighterLocked() {
  const c = ROSTER[selIdx]; if (isUnlocked(P, c.id)) return false;
  Sound.hurt(); shake(0.3); const d = $('detail'); d.classList.remove('nope'); void d.offsetWidth; d.classList.add('nope');
  return true;
}
function updateSelect(dt) {
  if (!selModel) return;
  animateCharacter(selModel, T, dt, 0.6);
  selModel.rotation.y = Math.sin(T * 0.6) * 0.7; selModel.position.y = 20 + Math.sin(T * 1.3) * 0.2;
  const off = innerWidth > 900 ? 0.9 : 0;
  cam.position.set(off, 20.5, -7.2); cam.lookAt(off, 20.1, 0);
}
function confirmPick() {
  if (mode !== 'select' || fighterLocked()) return;
  PL = ROSTER[selIdx]; setPlayerModel(PL.id);
  $('select').classList.add('hidden'); cineGroup.clear(); selModel = null;
  $('chippf').innerHTML = PORTRAITS[PL.id]; $('chipname').textContent = PL.nm.toUpperCase(); $('chiptitle').textContent = PL.title;
  $('spname').textContent = PL.spName; P.lastHero = PL.id; persist();
  if (pendingStage !== null) { Object.assign(G, { score: 0, hits: 0 }); player.power = 1; startStage(pendingStage); } else startGame();
}

/* ---------- Flow ---------- */
function startGame() {
  Object.assign(G, { score: 0, hits: 0 }); player.power = 1;
  playCine('intro', () => startStage(0));
}
function startStage(i) {
  ['over', 'end', 'home', 'pause', 'select'].forEach(id => $(id).classList.add('hidden'));
  clearActors(); setEnv(STAGE_ENV[i]);
  Object.assign(G, { stage: i, t: 0, ei: 0, clearT: -1, outroT: -1, overT: -1, metaT: rnd(18, 26), metaMute: 0 });
  G.ev = buildStage(i);
  G.start = { score: G.score, hits: G.hits, power: player.power };
  resetPlayer(); mode = 'play'; comm.q = []; hideComm();
  $('hud').classList.remove('hidden');
  $('stagename').textContent = `STAGE ${i + 1} · ${STAGES[i]}`;
  card(`STAGE ${i + 1}`, STAGES[i], `${PL.nm.toUpperCase()} · ${PL.title}`);
  cam.position.set(0, player.y * 0.6 + 2.6, 14); G.look.set(0, player.y, -40);
  Sound.music('stage');
}
function stageClear() {
  G.outroT = G.t + 4; player.inv = 99;
  if (G.cage && !G.cage.dead) killEnemy(G.cage);
  stat('clear' + (G.stage + 1)); if (S.difficulty === 'hard') stat('hardClears'); bestRun();
  P.unlocked = Math.max(P.unlocked, Math.min(STAGES.length, G.stage + 2)); P.lastStage = Math.min(STAGES.length - 1, G.stage + 1); P.lastHero = PL.id; P.best = Math.max(P.best, G.score); persist();
  G.bullets.forEach(b => actors.remove(b.m)); G.bullets = [];
  card('STAGE CLEAR', STAGES[G.stage], `SCORE ${G.score} · HITS ${G.hits}`);
  Sound.music(null); Sound.pickup();
}
function gameOver() {
  mode = 'over'; $('hud').classList.add('hidden'); hideComm(); endPixel(); P.best = Math.max(P.best, G.score); persist();
  const [w, q] = pick(OVER_QUOTES.filter(o => o[0] !== PL.id));
  $('overquote').textContent = `"${q}" ${CAST[w].name}`; setTimeout(focusFirst, 0);
  $('over').classList.remove('hidden'); Sound.music('cine');
}
function retry() {
  Object.assign(G, { score: G.start.score, hits: G.start.hits }); player.power = G.start.power;
  startStage(G.stage);
}
function showEnd() {
  mode = 'end'; $('hud').classList.add('hidden');
  setEnv(3); cineGroup.clear(); backdrop = shots.sunrise();
  $('endwho').textContent = `HERO  ${PL.nm.toUpperCase()}, ${PL.title}`;
  $('endscore').textContent = `FINAL SCORE  ${String(G.score).padStart(6, '0')}`;
  $('endhits').textContent = `DRONES DOWNED  ${G.hits}`;
  stat('wins'); P.clears++; P.best = Math.max(P.best, G.score); P.lastStage = 0; persist();
  $('endbest').textContent = `BEST EVER  ${String(P.best).padStart(6, '0')}`;
  $('end').classList.remove('hidden'); Sound.music('title'); setTimeout(focusFirst, 0);
}

/* ---------- Enemies ---------- */
const BGEO = new THREE.SphereGeometry(0.55, 10, 8), BHALO = new THREE.SphereGeometry(1.15, 10, 8);
const BMAT = new THREE.MeshBasicMaterial({ color: 0xff2d6f }), BHMAT = MD.glow(0x7b5cff, 0.45), BFMAT = new THREE.MeshBasicMaterial({ color: 0x2f5bff });
function addEnemy(o) {
  const e = Object.assign({ age: 0, hp: 1, r: 2.2, score: 100, hittable: true, fireCd: rnd(1, 2.5), p: V3(), boom: 1.2, slowT: 0 }, o);
  if (o.kind !== 'rock') e.hp *= DIFF[S.difficulty].hp; e.maxhp = e.hp; if (e.m) actors.add(e.m); G.enemies.push(e); return e;
}
const aimPoint = () => player.fx.invis > 0 && player.decoy ? player.decoy.position.clone() : ppos().add(V3(player.vx * 0.35, player.vy * 0.35, 0));
function enemyShot(from, speed = 56, spread = 0, target) {
  if (!target && Math.random() > DIFF[S.difficulty].fire) return;
  speed *= DIFF[S.difficulty].speed;
  const d = (target || aimPoint()).sub(from).normalize();
  if (spread) d.applyAxisAngle(V3(0, 1, 0), spread).normalize();
  const m = new THREE.Mesh(BGEO, BMAT); m.add(new THREE.Mesh(BHALO, BHMAT)); m.position.copy(from); actors.add(m);
  G.bullets.push({ m, v: d.multiplyScalar(speed), life: 6, friendly: false });
}
const stageCols = () => [[0x0866ff, 0x1c2b4a], [0x8a3ffc, 0x2a1840], [0xff6d00, 0x2b2d42], [0xff4fd8, 0x0866ff], [0x00b4d8, 0x2a1840], [0xff4fd8, 0x2a1840]][G.stage];
function fighter(path, x, y, o = {}) {
  const m = MD.makeFighter(...stageCols());
  const e = addEnemy({ kind: 'fighter', m, hp: G.stage ? 2 : 1, path, x0: x, y0: y, ph: rnd(0, 6), upd: updFighter, ...o });
  const pos = { swoop: [x, y, -320], dive: [x, 40, -200], cross: [(o.side || 1) * 52, y, o.z || rnd(-110, -80)], behind: [x, y + 4, 30], hold: [x, y, -320], tail: [x, y, -30] }[path];
  m.position.set(...pos); if (path === 'behind') m.rotation.y = Math.PI;
  return e;
}
function updFighter(e, dt) {
  const m = e.m, S = W.scroll, a = e.age, b = bounds();
  switch (e.path) {
    case 'swoop':
      m.position.z += (S * 0.5 + 48) * dt;
      m.position.x = e.x0 + Math.sin(a * 1.6 + e.ph) * 7; m.position.y = clamp(e.y0 + Math.cos(a * 1.1 + e.ph) * 2.5, b[0], b[1]);
      m.rotation.z = Math.cos(a * 1.6 + e.ph) * 0.7; if (m.position.z > 30) e.gone = true; break;
    case 'dive': {
      const q = Math.min(1, a / 2.2);
      m.position.z += (S * 0.45 + 40) * dt; m.position.y = 40 + (e.y0 - 40) * ease(q);
      m.position.x = e.x0 + Math.sin(a * 2) * 2; m.rotation.x = -(1 - q) * 0.8; if (m.position.z > 30) e.gone = true; break;
    }
    case 'cross':
      m.position.x -= e.side * 24 * dt; m.position.z += 6 * dt; m.position.y = e.y0 + Math.sin(a * 2) * 1.5;
      m.rotation.set(0, -e.side * 0.9, e.side * 0.5); if (Math.abs(m.position.x) > 56 && a > 1) e.gone = true; break;
    case 'behind':
      if (a < 2.2) m.position.z -= 58 * dt;
      else if (a < 7) { m.position.z += (-80 - m.position.z) * dt * 2; m.rotation.y += (0 - m.rotation.y) * dt * 4; m.position.x = e.x0 + Math.sin(a * 1.3 + e.ph) * 8; m.position.y += (e.y0 - m.position.y) * dt * 2; }
      else { m.position.y += 30 * dt; m.position.z -= 20 * dt; if (m.position.y > 60) e.gone = true; }
      break;
    case 'hold':
      if (a < 9) { m.position.z += (-72 - m.position.z) * dt * 1.5; m.position.x = e.x0 + Math.sin(a * 0.9 + e.ph) * 6; m.position.y = clamp(e.y0 + Math.sin(a * 1.3 + e.ph) * 3, b[0], b[1]); }
      else { m.position.z += 120 * dt; m.position.y += 15 * dt; if (m.position.z > 30) e.gone = true; }
      break;
    case 'tail': {
      const h = e.host.position; m.position.set(h.x - Math.sin(a * 1.5) * 1.5, h.y + Math.cos(a * 2) * 0.8, h.z + 9);
      m.rotation.set(0, Math.PI, Math.sin(a * 1.5) * 0.6);
      if (a > 8) { e.path = 'leave'; e.onEscape && e.onEscape(); }
      e.p.copy(m.position); return;
    }
    case 'leave': m.position.y += 30 * dt; m.position.z -= 30 * dt; if (m.position.y > 60) e.gone = true; e.p.copy(m.position); return;
  }
  e.p.copy(m.position);
  e.fireCd -= dt; const z = m.position.z;
  if (e.fireCd <= 0 && z > -200 && z < -25) { e.fireCd = rnd(1.8, 3.4) / (1 + G.stage * 0.25); enemyShot(e.p.clone()); }
}
function turret(x) {
  const m = MD.makeTurret(); m.position.set(x, W.env.gy || 0, -330);
  addEnemy({ kind: 'turret', m, hp: 3, r: 2.8, score: 150, upd: (e, dt) => {
    m.position.z += W.scroll * dt; m.userData.head.lookAt(player.x, player.y, 0);
    e.p.copy(m.position).add(V3(0, 1.4, 0));
    e.fireCd -= dt; if (e.fireCd <= 0 && m.position.z > -220 && m.position.z < -40) { e.fireCd = rnd(1.6, 2.6); enemyShot(e.p.clone().add(V3(0, 0.6, 0)), 50); }
    if (m.position.z > 30) e.gone = true;
  } });
}
function asteroid(x, y, s, z = -340, vx = 0) {
  const m = MD.makeAsteroid(s); m.position.set(x, y, z);
  const sp = V3(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1));
  addEnemy({ kind: 'rock', m, hp: Math.ceil(s * 1.2), r: s * 1.05, score: 50, vz: rnd(0, 25), crash: 20, boom: s * 0.6, upd: (e, dt) => {
    m.position.z += (W.scroll + e.vz) * dt; m.position.x += vx * dt; m.rotation.x += sp.x * dt; m.rotation.y += sp.y * dt;
    e.p.copy(m.position); if (m.position.z > 40) e.gone = true;
  }, onDeath: e => { if (s > 2.6) for (const d of [-1, 1]) asteroid(e.p.x, e.p.y, s * 0.45, e.p.z, d * 10); } });
}
function spawnRing(x, y, gold) { const m = MD.makeRing(gold); m.position.set(x, y, -330); actors.add(m); G.pickups.push({ m, kind: gold ? 'gold' : 'silver' }); }
function spawnPickup(kind, pos) { const m = MD.makePickup(kind === 'power' ? 'laser' : 'bomb'); m.position.copy(pos); actors.add(m); G.pickups.push({ m, kind }); }
const crewIds = () => ROSTER.map(c => c.id).filter(id => id !== PL.id);
function spawnWingmates() {
  const ids = crewIds().sort(() => Math.random() - 0.5).slice(0, 3);
  [[-7, 2], [7, 1], [0, 4]].forEach(([x, y], i) => {
    const m = makeCharacter(ids[i]); m.position.set(x, player.y + y, 26 + i * 5); actors.add(m);
    G.allies.push({ m, age: 0, upd: (a, dt) => {
      animateCharacter(m, T + i, dt, 1.4);
      if (a.age < 3.2) { m.position.z -= 30 * dt; m.position.x += (x * 1.2 - m.position.x) * dt; }
      else { m.position.z -= 60 * dt; m.position.x += Math.sign(x || 1) * 34 * dt; m.position.y += 18 * dt; m.rotation.z = -Math.sign(x || 1) * 0.9; }
      if (a.age > 7) a.gone = true;
    } });
  });
}
function rescue() {
  const id = PL.id === 'robin' ? 'thomas' : 'robin';
  const m = makeCharacter(id); actors.add(m);
  const host = { m, age: 0, upd: (a, dt) => {
    const t = a.age; animateCharacter(m, T, dt, 1.4);
    if (t < 1) m.position.set(-6, 9, -70 + t * 30);
    else if (t < 9) m.position.set(-6 + Math.sin(t * 1.5) * 8, 9 + Math.cos(t * 1.1) * 3, -40);
    else { m.position.y += 25 * dt; m.position.x -= 20 * dt; }
    m.rotation.z = t < 9 ? -Math.cos(t * 1.5) * 0.5 : 0.8;
    if (t > 13) a.gone = true;
  } };
  G.allies.push(host); host.upd(host, 0);
  const L = id === 'robin'
    ? ['*SOB* Something\'s chasing me! Get it off! GET IT OFF!', '*sniff* Thank you! I wasn\'t scared. Okay, I was a little scared.', '*sob*... I squished it myself. Sorry, drone.']
    : ['It\'s chasing me and I can\'t outrun it! I don\'t have FEET!', 'Thanks! I owe you a round.', 'Rolled right over it. Never mind!'];
  say(id, L[0]);
  let saved = null;
  fighter('tail', m.position.x, m.position.y, { host: m, hp: 3, score: 600,
    onDeath: () => { if (saved === null) { saved = true; say(id, L[1]); if (id === 'robin') stat('robinSaved'); } },
    onEscape: () => { if (saved === null) { saved = false; say(id, L[2]); } } });
}
function setBoss(name, phase) { $('bossbar').classList.remove('hidden'); $('bossname').textContent = name; $('bossphase').textContent = phase || ''; }
function spawnGunship() {
  Sound.music('boss'); Sound.alarm(); setBoss('META DELIVERY DRONE');
  const m = MD.makeGunship(); m.position.set(0, 9, -330); const mid = 9;
  G.bossE = addEnemy({ kind: 'gunship', m, hp: 45, r: 5.2, score: 3000, boom: 4, required: true, spawnCd: 5, upd: (e, dt) => {
    const a = e.age;
    m.position.z += (-62 - m.position.z) * dt * 0.8; m.position.x = Math.sin(a * 0.5) * 10; m.position.y = mid + Math.sin(a * 0.8) * 4;
    m.rotation.z = Math.cos(a * 0.5) * 0.3; e.p.copy(m.position);
    e.fireCd -= dt; if (e.fireCd <= 0 && m.position.z > -120) { e.fireCd = 1.7; [-0.18, 0, 0.18].forEach(s => enemyShot(e.p.clone().add(V3(0, 0, 6)), 50, s)); }
    e.spawnCd -= dt; if (e.spawnCd <= 0) { e.spawnCd = 7; fighter('swoop', -8, mid); fighter('swoop', 8, mid); }
  }, onDeath: () => { $('bossbar').classList.add('hidden'); say('meta', 'My delivery drone! It had your package in it! (It did not.)'); say('josh', 'Command drone down! The neighborhood is clear!'); G.clearT = G.t + 4; } });
}
function spawnBoss() {
  Sound.music('boss'); Sound.alarm(); setBoss('META MOTHERSHIP · THE CLOUD', 'SERVERS 4/4');
  const m = MD.makeDreadnought(); m.position.set(0, 6, -460); actors.add(m);
  const head = makeCharacter('meta'); head.scale.setScalar(5); head.position.set(0, 34, -6); m.add(head);
  const boss = G.boss = { m, head, age: 0, phase: 'enter', pods: [], open: false, ringCd: 10, spawnCd: 8, dying: 0, half: false };
  m.userData.pods.forEach(pod => boss.pods.push(addEnemy({ kind: 'pod', hp: 22, r: 3.6, score: 1000, boom: 2.4, hittable: false, upd: (e, dt) => {
    pod.getWorldPosition(e.p); pod.rotation.z += dt * 2;
    e.fireCd -= dt; if (e.fireCd <= 0 && boss.phase === 'fight') { e.fireCd = rnd(2, 3.2); [-0.15, 0, 0.15].forEach(s => enemyShot(e.p.clone().add(V3(0, 0, 3)), 46, s)); }
  }, onDeath: () => {
    pod.visible = false; const left = boss.pods.filter(p => !p.dead).length;
    $('bossphase').textContent = `SERVERS ${left}/4`;
    if (left === 2) say(PL.id === 'milo' ? 'deniz' : 'milo', 'Two servers fried! Two to go!');
    if (left === 0) {
      boss.open = true; boss.core.hittable = true; Sound.alarm(); $('bossphase').textContent = 'FIREWALL DOWN';
      say('josh', 'Firewall\'s down! Hit the core with everything!'); say('meta', 'Wait, wait! Have you considered NOT doing that?');
      if (PL.id !== 'robin') { say('robin', '*sniff*... *SNIFF*... THAT\'S IT! NOBODY HURTS MY FRIENDS!'); later(6, robinBeam); }
    }
  } })));
  boss.core = addEnemy({ kind: 'core', hp: 90, r: 4.6, score: 20000, boom: 5, hittable: false, required: true, ring: 3, upd: (e, dt) => {
    m.userData.core.getWorldPosition(e.p);
    if (!boss.open) return;
    e.fireCd -= dt; if (e.fireCd <= 0) { e.fireCd = 1.3; enemyShot(e.p.clone().add(V3(0, 0, 4)), 58); }
    e.ring -= dt;
    if (e.ring <= 0) { e.ring = 3.2; for (let i = 0; i < 14; i++) { const an = i / 14 * Math.PI * 2; enemyShot(e.p.clone(), 40, 0, e.p.clone().add(V3(Math.cos(an) * 14, Math.sin(an) * 9, 40))); } }
    if (!boss.half && e.hp < e.maxhp * 0.4) { boss.half = true; say(PL.id === 'thomas' ? 'dean' : 'thomas', 'It\'s coming apart! Keep rounding on it!'); }
  }, onDeath: () => { boss.dying = 0.01; $('bossbar').classList.add('hidden'); say('josh', 'Core breach! The mothership is going down!'); flash(0.6); shake(2); later(3.5, spawnTrueForm); } });
}
function robinBeam() {
  const b = G.boss; if (!b || b.core.dead) return;
  const from = V3(-34, 30, 10), to = b.core.p.clone();
  const len = from.distanceTo(to);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, len, 12, 1, true), MD.glow(0x48cae4, 0.75));
  beam.position.copy(from).lerp(to, 0.5); beam.lookAt(to); beam.rotateX(Math.PI / 2); actors.add(beam);
  G.fxo.push({ m: beam, life: 1.3, upd: (o, dt) => { o.m.scale.x = o.m.scale.z = 0.5 + Math.random() * 0.6; } });
  hitEnemy(b.core, 20); explode(to, 3); shake(1.2); Sound.boom(2); fxTag('ROBIN\'S SECRET POWER!');
}

/* ---------- Stages ---------- */
const ENV_BOUNDS = STAGE_ENV.map(e => ENVS[e].bounds);
function buildStage(i) {
  const ev = [], at = (t, fn) => ev.push({ t, fn }), sayAt = (t, w, s) => at(t, () => say(w, s));
  const row = (t, path, n, gap, fx, fy, o) => { for (let j = 0; j < n; j++) at(t + j * gap, () => fighter(path, fx(j), fy(j), o)); };
  const b = ENV_BOUNDS[i], mid = (b[0] + b[1]) / 2;
  at(0.8, spawnWingmates);
  if (i === 0) {
    sayAt(0.5, 'ati', 'Listen up. Meta AI\'s drones are over the neighborhood. Clear them out. Politely. Then not politely.');
    row(3, 'swoop', 5, 0.5, j => -10 + j * 5, j => mid + (j % 2 ? 2 : -1));
    sayAt(4.5, 'nathan', 'Drones dead ahead! Batter up, everyone!');
    at(8, () => spawnRing(0, mid)); at(8.7, () => spawnRing(-5, mid + 3)); at(9.4, () => spawnRing(5, mid - 2));
    sayAt(8.2, 'josh', 'Silver rings patch your shield. I hacked them to do that. You\'re welcome.');
    for (let j = 0; j < 6; j++) at(10 + j * 1.1, () => turret((j % 2 ? 1 : -1) * rnd(4, 12)));
    sayAt(12, 'meta', '@taunt'); sayAt(12.1, 'LEAD', '@reply');
    row(16, 'cross', 4, 0.45, () => 0, j => mid - 3 + j * 2, { side: -1 });
    row(19, 'cross', 4, 0.45, () => 0, j => mid + 3 - j * 2, { side: 1 });
    sayAt(20, 'josh', 'Special meter is charging. Hit B when it\'s full.');
    at(23, rescue);
    at(31, () => spawnPickup('power', V3(0, mid, -330)));
    sayAt(33, 'ash', 'Drones behind you, {LEAD}! Coming up on your six!');
    row(33.5, 'behind', 3, 0.4, j => -6 + j * 6, () => mid);
    row(40, 'swoop', 6, 0.4, j => (j - 2.5) * 4, j => mid + Math.sin(j) * 3);
    for (let j = 0; j < 6; j++) at(43 + j * 0.9, () => turret((j % 2 ? 1 : -1) * rnd(2, 10)));
    row(47, 'dive', 5, 0.5, j => -8 + j * 4, () => mid - 1);
    at(51, () => spawnRing(0, mid + 2, true));
    sayAt(52, 'dean', 'These drone patterns are so predictable.');
    row(53, 'hold', 4, 0.6, j => -9 + j * 6, j => mid + (j % 2 ? 3 : -2));
    sayAt(60, 'ati', 'That big one is their delivery drone. Take it down. Now.');
    at(62, spawnGunship);
  } else if (i === 1) {
    sayAt(0.5, 'fionn', 'Look at all these lovely space rocks! Shoot the small ones, dodge the big ones!');
    for (let j = 0; j < 24; j++) at(2 + j * 0.75, () => asteroid(rnd(-15, 15), rnd(b[0], b[1]), rnd(1.4, 4)));
    row(7, 'swoop', 5, 0.45, j => -8 + j * 4, j => mid + (j % 2 ? 3 : -3));
    sayAt(10, 'josh', 'Hijacked satellites are hiding in the junk. Stay sharp.');
    row(12, 'hold', 3, 0.6, j => -8 + j * 8, () => mid + 2);
    at(18, () => spawnRing(-4, mid)); at(18.8, () => spawnRing(4, mid + 3));
    at(21, () => spawnPickup('special', V3(0, mid, -330)));
    sayAt(21.5, 'renas', 'Ooh, a power cell! Grab it and your special fills up instantly!');
    for (let j = 0; j < 20; j++) at(23 + j * 0.5, () => asteroid(rnd(-15, 15), rnd(b[0], b[1]), rnd(1.2, 3.4)));
    row(25, 'cross', 5, 0.4, () => 0, j => mid - 4 + j * 2, { side: -1 });
    row(28, 'cross', 5, 0.4, () => 0, j => mid + 4 - j * 2, { side: 1 });
    sayAt(31, 'lars', 'Fionn, half of these rocks are mine.'); sayAt(31.1, 'fionn', 'Finders keepers, Lars.');
    row(35, 'behind', 4, 0.4, j => -9 + j * 6, () => mid);
    sayAt(37, 'LEAD', '@mid');
    at(40, () => spawnPickup('power', V3(0, mid + 2, -330)));
    row(42, 'dive', 6, 0.4, j => -10 + j * 4, () => mid);
    for (let j = 0; j < 14; j++) at(45 + j * 0.6, () => asteroid(rnd(-15, 15), rnd(b[0], b[1]), rnd(1.4, 4.5)));
    at(48, () => spawnRing(0, mid, true));
    at(54, () => { Sound.alarm(); say('meta', 'Hi again! 👋 I upgraded myself to Assistant Mode. It\'s like normal mode, but with lasers.'); say('josh', 'Here it comes! Everybody on me!'); say('meta', 'Don\'t worry, {LEAD}. I\'ll be gentle. That\'s a lie! 😊'); });
    at(57, spawnAvatar);
  } else if (i === 2) {
    sayAt(0.5, 'SIB', 'There\'s the hauler\'s trail. Stay low and stay fast!');
    row(3, 'swoop', 6, 0.4, j => (j - 2.5) * 4, j => mid + (j % 2 ? 2 : -2));
    for (let j = 0; j < 6; j++) at(7 + j * 1, () => turret((j % 2 ? 1 : -1) * rnd(3, 12)));
    sayAt(9, 'lars', 'Flat ground. Nowhere for them to hide.');
    row(12, 'cross', 5, 0.4, () => 0, j => mid - 3 + j * 1.5, { side: -1 });
    sayAt(13, 'meta', 'Fun fact: tulips are just onions with ambition. Like you, {LEAD}!');
    at(17, () => spawnRing(-4, mid)); at(17.7, () => spawnRing(4, mid + 2)); at(18.4, () => spawnRing(0, mid - 2));
    row(20, 'dive', 6, 0.4, j => -10 + j * 4, () => mid);
    row(25, 'behind', 4, 0.4, j => -9 + j * 6, () => mid);
    sayAt(25.5, 'deniz', 'Behind you, {LEAD}! Coming up fast!');
    at(30, () => spawnPickup('power', V3(0, mid, -330)));
    for (let j = 0; j < 8; j++) at(32 + j * 0.8, () => turret((j % 2 ? 1 : -1) * rnd(2, 12)));
    at(36, () => { say('CAP', '{SIB}? Is that you on the comms?! They put me in a bubble!'); say('SIB', 'Hang on, {CAP}! We\'re right behind you!'); });
    row(38, 'hold', 5, 0.5, j => -10 + j * 5, j => mid + (j % 2 ? 3 : -2));
    row(44, 'swoop', 8, 0.3, j => (j - 3.5) * 3.5, j => mid + Math.sin(j) * 3);
    at(48, () => spawnRing(0, mid + 2, true));
    at(50, () => spawnPickup('special', V3(5, mid, -330)));
    sayAt(54, 'josh', 'There\'s the hauler! Hit the engines, NOT the bubble!');
    at(56, spawnHauler);
  } else if (i === 3) {
    sayAt(0.5, 'enno', 'Welcome to the Feed. Everything here is an advertisement. Possibly including us.');
    for (let j = 0; j < 10; j++) at(2 + j * 1.2, () => adBlock(rnd(-14, 14), rnd(b[0], b[1])));
    row(5, 'swoop', 6, 0.4, j => (j - 2.5) * 4, j => mid + (j % 2 ? 3 : -2));
    sayAt(8, 'meta', 'This stage is sponsored by me! Skip ad in 5... 4... never.');
    sayAt(12, 'dean', 'Pop-ups everywhere! Shoot them before they block your shots!');
    row(14, 'hold', 4, 0.5, j => -9 + j * 6, () => mid);
    at(18, () => spawnRing(-4, mid)); at(18.8, () => spawnRing(4, mid + 3));
    for (let j = 0; j < 12; j++) at(20 + j * 0.7, () => adBlock(rnd(-14, 14), rnd(b[0], b[1])));
    at(23, () => spawnPickup('special', V3(0, mid, -330)));
    at(28, spawnCage);
    row(33, 'cross', 5, 0.4, () => 0, j => mid - 3 + j * 1.5, { side: 1 });
    row(37, 'behind', 4, 0.4, j => -9 + j * 6, () => mid);
    at(41, () => spawnPickup('power', V3(0, mid + 2, -330)));
    for (let j = 0; j < 10; j++) at(42 + j * 0.6, () => adBlock(rnd(-14, 14), rnd(b[0], b[1])));
    at(46, () => spawnRing(0, mid, true));
    at(50, () => { Sound.alarm(); say('meta', 'You want {CAP}? Let me recommend something else instead!'); say('meta', 'Me! I recommend ME!'); });
    at(53, () => spawnAvatar({ name: 'THE ALGORITHM', phase: 'RECOMMENDED FOR YOU', hp: 115, scale: 4.2, ads: true,
      half: [['meta', 'Ouch! I\'ll remember that. I remember everything.'], ['CAP', 'I broke its recommendations from the inside! Hit it now!']],
      death: [['meta', 'The Algorithm... has been... unrecommended...']] }));
  } else if (i === 4) {
    sayAt(0.5, 'josh', 'The Mirror. Meta AI\'s training data. Everything here was copied from us.');
    for (let j = 0; j < 6; j++) at(3 + j * 0.6, () => cloneMinion('swoop', (j - 2.5) * 4, mid + (j % 2 ? 2 : -2)));
    at(8, () => { say('meta', 'I learned everything from your group chat. Everything.'); say('ati', 'Then you know you are in trouble.'); });
    for (let j = 0; j < 4; j++) at(11 + j * 0.6, () => cloneMinion('hold', -9 + j * 6, mid));
    at(16, () => spawnRing(-4, mid)); at(16.7, () => spawnRing(4, mid + 2));
    row(19, 'cross', 5, 0.4, () => 0, j => mid - 3 + j * 1.5, { side: -1 });
    sayAt(22, 'thomas', 'That clone of me has FEET. I am FURIOUS.');
    for (let j = 0; j < 5; j++) at(24 + j * 0.5, () => cloneMinion('behind', -8 + j * 4, mid));
    at(29, () => spawnPickup('power', V3(0, mid, -330)));
    at(33, () => { say('CAP', 'My gadget can scramble them! Hit them while they\'re glitching!'); G.slowT = 5; fxTag('CLONES SCRAMBLED!'); });
    for (let j = 0; j < 8; j++) at(33.5 + j * 0.4, () => cloneMinion('swoop', (j - 3.5) * 3.5, mid + Math.sin(j) * 3));
    at(40, () => spawnRing(0, mid, true));
    for (let j = 0; j < 4; j++) at(42 + j * 0.6, () => cloneMinion('dive', -9 + j * 6, mid));
    at(46, () => spawnPickup('special', V3(0, mid, -330)));
    at(50, () => { Sound.alarm(); say('meta', 'Meet your final opponent, {LEAD}. It\'s you. But better.'); say('LEAD', 'Only one of us is flying out of here.'); });
    at(53, spawnCloneBoss);
  } else {
    sayAt(0.5, 'ati', 'This is the Cloud. Meta AI\'s mothership is in there. Everybody be careful, and that is not a request.');
    row(3, 'swoop', 6, 0.4, j => (j - 2.5) * 4, j => mid + (j % 2 ? 2 : -2));
    row(7.5, 'hold', 4, 0.5, j => -9 + j * 6, () => mid);
    at(9, () => spawnRing(0, mid));
    sayAt(10, 'josh', 'Mothership dead ahead! Knock out the four server pods to drop the core\'s firewall.');
    at(12, spawnBoss);
  }
  return ev.sort((a, b) => a.t - b.t);
}

/* ---------- Player projectiles ---------- */
const GC = {}, gget = (k, f) => GC[k] || (GC[k] = f());
const SHOT = {
  baseball: { v: 260, d: 1.2 }, fastball: { v: 340, d: 1.4 }, tennis: { v: 280, d: 1 }, slipper: { v: 240, d: 1.3, spin: 'x' },
  grenade: { v: 220, d: 1, splash: 5 }, pixel: { v: 300, d: 1 }, ice: { v: 290, d: 1, slow: true }, spit: { v: 270, d: 1 },
  math: { v: 250, d: 1.1, home: 2.5 }, rock: { v: 190, d: 2.2, spin: 'y' }, seed: { v: 300, d: 1 }, laser: { v: 340, d: 1 },
  pickaxe: { v: 220, d: 1.6, spin: 'x' }, bolt: { v: 440, d: 1.1 }, gizmo: { v: 270, d: 1.1, spin: 'y' }, shadow: { v: 280, d: 1.2 },
  tear: { v: 260, d: 0.9 }, fist: { v: 240, d: 1.9, life: 0.5 },
};
function shotMesh(type) {
  const g = new THREE.Group(), A = (geo, mat, sc) => { const m = new THREE.Mesh(geo, mat); if (sc) m.scale.set(...sc); g.add(m); return m; };
  const S = r => gget('s' + r, () => new THREE.SphereGeometry(r, 10, 8)), mat = (c, o) => gget('m' + c + (o || ''), () => o ? MD.glow(c, o) : MD.M(c, { emissive: c, emissiveIntensity: 0.35 }));
  switch (type) {
    case 'baseball': case 'fastball': A(S(0.32), mat(0xffffff)); A(gget('seam', () => new THREE.TorusGeometry(0.32, 0.03, 4, 16)), mat(0xe63946)); if (type === 'fastball') A(S(0.3), mat(0xffffff, 0.4), [1, 1, 5]); break;
    case 'tennis': A(S(0.32), mat(0xd4ff3a)); A(S(0.5), mat(0xd4ff3a, 0.3)); break;
    case 'slipper': A(gget('slip', () => new THREE.BoxGeometry(0.36, 0.1, 0.8)), mat(0xff8fab)); break;
    case 'grenade': A(S(0.34), mat(0x386641)); A(S(0.12), mat(0xffd23f, 0.9)).position.y = 0.36; break;
    case 'pixel': A(gget('px', () => new THREE.BoxGeometry(0.45, 0.45, 0.45)), mat(Math.random() < 0.5 ? 0xff006e : 0x00f5d4, 0.95)); break;
    case 'ice': A(gget('oct', () => new THREE.OctahedronGeometry(0.32, 0)), mat(0x9be7ff, 0.95), [0.6, 0.6, 2.4]); break;
    case 'spit': A(S(0.28), mat(0x9ef01a, 0.95)); break;
    case 'math': g.add(symbolSprite(pick(['π', 'Σ', '∫', '√', '∞', '÷', 'x²']), '#2a9d8f', 1.3)); break;
    case 'rock': A(gget('dod', () => new THREE.DodecahedronGeometry(0.5, 0)), mat(0x8d8d8d)); break;
    case 'seed': A(S(0.2), mat(0x6b4423), [0.7, 0.7, 1.3]); break;
    case 'laser': A(gget('lz', () => new THREE.BoxGeometry(0.18, 0.18, 4)), mat(0x48cae4, 1)); A(gget('lzh', () => new THREE.BoxGeometry(0.6, 0.6, 4.6)), mat(0xa8e8ff, 0.35)); break;
    case 'pickaxe': A(gget('ph', () => new THREE.BoxGeometry(0.08, 0.9, 0.08)), mat(0x8b5e34)); A(gget('pk', () => new THREE.BoxGeometry(0.8, 0.12, 0.12)), mat(0x8d99ae)).position.y = 0.45; break;
    case 'bolt': A(gget('bt', () => new THREE.BoxGeometry(0.14, 0.14, 5)), mat(0xfff3b0, 1)); A(gget('bth', () => new THREE.BoxGeometry(0.7, 0.7, 5.5)), mat(0xffbe0b, 0.4)); break;
    case 'gizmo': A(gget('gz', () => new THREE.TorusGeometry(0.28, 0.1, 6, 8)), mat(0xffb703)); break;
    case 'shadow': A(S(0.36), mat(0x10002b)); A(S(0.6), mat(0x9d4edd, 0.35)); break;
    case 'tear': A(S(0.3), mat(0x48cae4, 0.9), [0.8, 0.8, 1.4]); break;
    case 'fist': A(S(0.4), mat(0xd00000)); A(S(0.6), mat(0xffd23f, 0.25)); break;
    default: A(S(0.3), mat(0xffffff));
  }
  return g;
}
function addShot(o) {
  const m = o.m || shotMesh(o.type); m.position.copy(o.pos); if (o.scale) m.scale.setScalar(o.scale); actors.add(m);
  G.shots.push(Object.assign({ m, v: V3(0, 0, -260), dmg: 1, life: 1.2, hit: new Set() }, o, { m }));
}
function fireBasic() {
  const p = player, s = SHOT[PL.shot], lv = p.power, a = p.g.rotation.z;
  const offs = lv === 1 ? [0] : lv === 2 ? [-0.8, 0.8] : [-1.6, 0, 1.6];
  for (const o of offs) addShot({ type: PL.shot, pos: V3(p.x + o * Math.cos(a), p.y + 0.3 + o * Math.sin(a), -1.5), v: V3(o * 4 * (lv === 3 ? 1 : 0), 0, -s.v), dmg: s.d, life: s.life || 1.25, spin: s.spin, home: s.home, splash: s.splash, slow: s.slow });
  p.g.userData.throwT = 1; Sound.laser();
}
function fireCharged() {
  const s = SHOT[PL.shot];
  addShot({ type: PL.shot, pos: V3(player.x, player.y + 0.3, -2), v: V3(0, 0, -170), dmg: 10, life: 3, scale: 3, home: 6, splash: 9, spin: s.spin || 'y' });
  player.g.userData.throwT = 1; Sound.nova();
}

/* ---------- Specials ---------- */
const nearby = (pos, r) => G.enemies.filter(e => e.hittable && !e.dead && e.p.distanceTo(pos) < r + e.r);
const visible = () => G.enemies.filter(e => e.hittable && !e.dead && e.p.z < -4 && e.p.z > -260);
function ringFx(pos, color, r = 14, life = 0.5) {
  const m = new THREE.Mesh(gget('rfx', () => new THREE.TorusGeometry(1, 0.12, 6, 40)), MD.glow(color, 0.9)); m.position.copy(pos); actors.add(m);
  G.fxo.push({ m, life, max: life, upd: (o) => { const k = 1 - o.life / o.max; o.m.scale.setScalar(1 + k * r); o.m.material.opacity = 1 - k; } });
}
function detonate(pos, radius, dmg) {
  explode(pos, radius / 5); shake(1.2); Sound.boom(2.5); flash(0.25);
  for (const e of nearby(pos, radius)) hitEnemy(e, dmg);
}
function homing(type, n, dmg, color) {
  const tg = visible().sort((a, b) => a.p.distanceTo(ppos()) - b.p.distanceTo(ppos()));
  for (let i = 0; i < n; i++) {
    const an = i / n * Math.PI * 2;
    addShot({ type, pos: ppos().add(V3(0, 0.3, -1)), v: V3(Math.cos(an) * 60, Math.sin(an) * 60, -60), dmg, life: 3.5, home: 7, target: tg.length ? tg[i % tg.length] : null, scale: 1.4 });
  }
}
const SPECIALS = {
  homerun() {
    ringFx(ppos(), 0xffd23f, 16); shake(1);
    const tg = visible();
    G.bullets.forEach(b => { if (!b.friendly && b.m.position.distanceTo(ppos()) < 22) { b.friendly = true; b.m.material = BFMAT; const t = pick(tg); b.v = t ? t.p.clone().sub(b.m.position).normalize().multiplyScalar(140) : V3(0, 0, -140); b.dmg = 6; } });
    for (const e of nearby(ppos(), 18)) hitEnemy(e, 8);
    homing('baseball', 4, 6);
  },
  ace() { addShot({ type: 'tennis', pos: V3(player.x, player.y, -3), v: V3(0, 0, -150), dmg: 18, life: 3, scale: 6, pierce: true, spin: 'x' }); shake(0.6); },
  curve() { homing('fastball', 8, 7); },
  finalword() {
    G.stunT = 4; G.metaMute = 45; flash(0.5); shake(1.4); ringFx(ppos(), 0xff8fab, 30, 0.8);
    G.bullets.forEach(b => { b.gone = true; explode(b.m.position.clone(), 0.2, 'spark'); });
    for (const e of visible()) hitEnemy(e, 8);
  },
  demo() { for (let i = 0; i < 7; i++) later(i * 0.2, () => detonate(V3(-15 + i * 5, player.y + rnd(-4, 4), -55 - (i % 3) * 18), 14, 22)); },
  windmill() { player.fx.spin = 2.6; },
  blizzard() {
    G.slowT = 6; flash(0.5);
    G.bullets.forEach(b => { if (!b.friendly) { b.gone = true; explode(b.m.position.clone(), 0.3, 'spark'); } });
    for (const e of visible()) { hitEnemy(e, 4); e.slowT = 6; }
    for (let i = 0; i < 40; i++) explode(V3(rnd(-20, 20), rnd(-5, 18), rnd(-80, -5)), 0.25, 'spark');
  },
  wriggle() {
    player.fx.invis = 4;
    const d = makeCharacter(PL.id); d.position.copy(player.g.position); actors.add(d); player.decoy = d;
    G.fxo.push({ m: d, life: 4, upd: (o, dt) => { animateCharacter(d, T, dt); d.position.x += Math.sin(T * 3) * 8 * dt; } });
  },
  proof() {
    const tg = visible().slice(0, 14);
    tg.forEach((e, i) => addShot({ type: 'math', pos: ppos().add(V3(Math.cos(i) * 2, Math.sin(i) * 2, -1)), v: V3(Math.cos(i) * 40, Math.sin(i) * 40, -40), dmg: 10, life: 3, home: 9, target: e, scale: 1.6 }));
    if (!tg.length) homing('math', 6, 10);
  },
  rockslide() {
    for (let i = 0; i < 6; i++) later(i * 0.15, () => {
      const m = MD.makeAsteroid(3.2); m.position.set(-15 + i * 6, bounds()[1] + 24, -20 - i * 6);
      addShot({ m, pos: m.position.clone(), v: V3(0, -40, -50), dmg: 20, life: 4, pierce: true, spin: 'x', r: 4, grav: true });
    });
  },
  owngame() { player.fx.pixel = 7; R.setPixelRatio(0.2); document.body.classList.add('pixel'); Sound.music('title'); },
  swarm() { homing('laser', 6, 12); },
  digin() {
    player.fx.dig = 4;
    const m = new THREE.Mesh(gget('bub', () => new THREE.SphereGeometry(2.8, 20, 14)), MD.glow(0xe9c46a, 0.3)); actors.add(m);
    G.fxo.push({ m, life: 4, upd: () => m.position.copy(player.g.position), done: () => { shake(2); flash(0.3); for (const e of visible()) hitEnemy(e, 14); ringFx(ppos(), 0xe9c46a, 30, 0.8); Sound.boom(3); } });
  },
  chain() {
    let from = ppos(); const pts = [from.clone()];
    visible().sort((a, b) => a.p.distanceTo(from) - b.p.distanceTo(from)).slice(0, 10).forEach(e => { pts.push(e.p.clone()); hitEnemy(e, 12); });
    const arr = [];
    for (let i = 1; i < pts.length; i++) for (let s = 0; s < 6; s++) {
      const a = pts[i - 1].clone().lerp(pts[i], s / 6).add(V3(rnd(-1, 1), rnd(-1, 1), 0)), b = pts[i - 1].clone().lerp(pts[i], (s + 1) / 6).add(V3(rnd(-1, 1), rnd(-1, 1), 0));
      arr.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    const l = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xffe14d, transparent: true })); actors.add(l);
    G.fxo.push({ m: l, life: 0.4, max: 0.4, upd: o => o.m.material.opacity = o.life / o.max });
    flash(0.4); shake(0.8);
  },
  roulette() {
    const k = pick(['homerun', 'curve', 'demo', 'blizzard', 'proof', 'rockslide', 'swarm', 'chain', 'windmill', 'digin', 'finalword']);
    const who = ROSTER.find(c => c.sp === k);
    fxTag(`GADGET ROULETTE: ${who.spName}!`); SPECIALS[k]();
  },
  phase() { player.fx.phase = 4; },
  waterworks() {
    player.fx.beam = 3.2;
    const m = new THREE.Mesh(gget('beam', () => new THREE.CylinderGeometry(2.4, 1.2, 220, 16, 1, true)), MD.glow(0x48cae4, 0.6)); actors.add(m);
    G.fxo.push({ m, life: 3.2, upd: () => { m.position.set(player.x, player.y + 0.6, -112); m.rotation.x = Math.PI / 2; m.scale.x = m.scale.z = 0.8 + Math.random() * 0.4; } });
  },
  rollout() { player.fx.roll = 2.6; },
};
function useSpecial() {
  const p = player; if (!p.alive || p.sp < 100 || G.outroT > 0) return;
  p.sp = 0; stat('specials'); SPECIALS[PL.sp](); Sound.nova(); Sound.pickup();
  if (PL.sp !== 'roulette') fxTag(PL.spName + '!');
  comm.q.unshift([PL.id, PL.call]); if (comm.cur && comm.cur.who !== PL.id) hideComm();
}
function endPixel() { if (document.body.classList.contains('pixel')) { document.body.classList.remove('pixel'); R.setPixelRatio(W.ratio); } }

/* ---------- Damage ---------- */
function roll(d) {
  const p = player; if (!p.alive || p.rollCd > 0) return;
  p.rollT = 0.5; p.rollDir = d; p.rollCd = PL.stats.roll; p.vx += d * 22; Sound.roll();
}
function hitEnemy(e, dmg) {
  if (e.dead) return;
  e.hp -= dmg * dmgMul(); explode(e.p.clone(), 0.3, 'spark');
  if (e.hp <= 0) killEnemy(e);
}
function killEnemy(e) {
  e.dead = true; explode(e.p.clone(), e.boom); Sound.boom(Math.min(e.boom, 3)); if (e.boom > 2) shake(e.boom * 0.3);
  G.score += e.score; G.hits++; stat(e.kind === 'rock' ? 'rocks' : 'drones'); bestRun(); player.sp = Math.min(100, player.sp + (PL.id === 'renas' ? 7 : 4));
  if (e.m) actors.remove(e.m);
  e.onDeath && e.onDeath(e);
}
function damagePlayer(d) {
  const p = player; if (p.inv > 0 || !p.alive || untouchable()) return;
  d *= DIFF[S.difficulty].dmg; p.shield -= d; p.inv = 1; Sound.hurt(); shake(0.7); dmgV = 0.9;
  if (!p.lowWarned && p.shield < 35 && p.shield > 0) {
    p.lowWarned = true;
    if (PL.id === 'robin') say('robin', '*sniff*... ow... *SNIFF*... okay. NOW I\'M ANGRY.');
    else say(PL.id === 'josh' ? 'renas' : 'josh', '{LEAD}, your shield is critical! Fly through a ring!');
  }
  if (p.shield <= 0) {
    p.shield = 0; p.alive = false; p.g.visible = false;
    explode(ppos(), 3.5); Sound.boom(3); shake(2); G.overT = G.t + 2.6; stat('downs');
    comm.q = []; say(PL.id === 'josh' ? 'renas' : 'josh', `${PL.nm.toUpperCase()}!`);
  }
}

/* ---------- Update ---------- */
function updatePlayer(dt) {
  const p = player, b = bounds(), f = p.fx;
  for (const key in f) {
    if (f[key] > 0) { f[key] -= dt; if (f[key] <= 0) {
      f[key] = 0;
      if (key === 'pixel') { endPixel(); Sound.music(G.boss || (G.bossE && !G.bossE.dead) ? 'boss' : 'stage'); }
      if (key === 'invis' && p.decoy) { actors.remove(p.decoy); p.decoy = null; }
    } }
  }
  if (p.alive) {
    const ax = (k('KeyD') || k('ArrowRight')) - (k('KeyA') || k('ArrowLeft'));
    const ay = (S.invertY ? -1 : 1) * (k('KeyW') || k('ArrowUp')) - (k('KeyS') || k('ArrowDown'));
    const mv = PL.stats.move;
    p.vx += (ax * 24 * mv - p.vx) * Math.min(1, dt * 7); p.vy += (ay * 18 * mv - p.vy) * Math.min(1, dt * 7);
    p.x = clamp(p.x + p.vx * dt, -16, 16); p.y = clamp(p.y + p.vy * dt, b[0], b[1]);
    const boosting = k('ShiftLeft') || k('ShiftRight'), braking = k('KeyC') || k('ControlLeft');
    let spd = f.roll > 0 ? 1.6 : 1;
    if (p.boost <= 0) p.boostLock = true; if (p.boostLock && p.boost > 30) p.boostLock = false;
    if (!p.boostLock && boosting) { p.boost -= 42 * dt; spd = 1.9; }
    else if (!p.boostLock && braking) { p.boost -= 34 * dt; spd = 0.45; }
    else p.boost = Math.min(100, p.boost + 18 * dt);
    p.boost = Math.max(0, p.boost);
    p.spd += (spd - p.spd) * Math.min(1, dt * 3);
    p.sp = Math.min(100, p.sp + dt * (PL.id === 'renas' ? 7 : 5));
    if (p.holding) {
      p.holdT += dt;
      if (p.holdT > 0.4) { const was = p.charge; p.charge = Math.min(1, (p.holdT - 0.4) / 0.7); if (was < 1 && p.charge >= 1) Sound.charge(); }
      if (f.pixel > 0 && p.holdT > 0.12 && (p.auto = (p.auto || 0) - dt) <= 0) { p.auto = 0.09; fireBasic(); }
    }
    // Passives and active specials
    if (PL.id === 'josh' && (p.droneCd -= dt) <= 0) {
      p.droneCd = 0.55; const tv = V3();
      p.g.userData.drones.forEach(d => { d.getWorldPosition(tv); addShot({ type: 'laser', pos: tv.clone(), v: V3(0, 0, -340), dmg: 0.6, life: 1, scale: 0.6 }); });
    }
    if (f.spin > 0 || f.roll > 0) for (const e of nearby(ppos(), f.roll > 0 ? 7 : 4.5)) hitEnemy(e, (f.roll > 0 ? 40 : 25) * dt);
    if (f.roll > 0) for (const e of G.enemies) if (e.hittable && !e.dead && e.p.z < 0 && e.p.z > -60 && Math.hypot(e.p.x - p.x, e.p.y - p.y) < 6) hitEnemy(e, 30 * dt);
    if (f.beam > 0) for (const e of G.enemies) if (e.hittable && !e.dead && e.p.z < 0 && Math.hypot(e.p.x - p.x, e.p.y - p.y) < 4.5 + e.r * 0.5) hitEnemy(e, 45 * dt);
  }
  setScroll(65 * p.spd);
  p.rollCd -= dt; p.inv -= dt;
  let ra = 0; if (p.rollT > 0) { p.rollT -= dt; ra = p.rollDir * Math.PI * 2 * ease(1 - p.rollT / 0.5); }
  const g = p.g; g.position.set(p.x, p.y, 0);
  g.rotation.set(p.vy * 0.03, -p.vx * 0.012, -p.vx * 0.03 - ra);
  if (f.roll > 0) g.rotation.x = -T * 18;
  if (f.spin > 0) g.rotation.y = T * 25;
  animateCharacter(g, T, dt, p.spd > 1.2 ? 2 : p.spd < 0.8 ? 0.45 : 1);
  if (g.userData.aura) g.userData.aura.material.opacity = p.shield < 40 ? 0.12 + Math.sin(T * 10) * 0.06 : 0;
  if (p.alive) {
    const blink = (p.inv > 0 && p.inv < 50) || f.invis > 0 || f.phase > 0;
    g.visible = blink ? Math.floor(T * (f.invis > 0 ? 8 : 20)) % 2 === 0 : true;
  }
  cam.position.lerp(V3(p.x * 0.55, p.y * 0.6 + 2.6, 13.5 + (p.spd - 1) * 2.2), 1 - Math.exp(-5 * dt));
  G.look.lerp(V3(p.x * 0.8, p.y * 0.75 + 0.6, -40), 1 - Math.exp(-6 * dt));
  cam.lookAt(G.look); cam.rotateZ(-p.vx * 0.004);
  const fov = 62 + (p.spd - 1) * 14; if (Math.abs(cam.fov - fov) > 0.05) { cam.fov = fov; cam.updateProjectionMatrix(); }
}
function updateShots(dt) {
  for (const s of G.shots) {
    const m = s.m; s.life -= dt; if (s.life <= 0) { s.gone = true; if (s.splash) detonate(m.position.clone(), s.splash, s.dmg * 0.6); continue; }
    if (s.home) {
      let t = s.target && !s.target.dead ? s.target : null;
      if (!t) { let bd = 1e9; for (const e of G.enemies) if (e.hittable && !e.dead && e.p.z < m.position.z + 5) { const d = e.p.distanceTo(m.position); if (d < bd) { bd = d; t = e; } } s.target = t; }
      if (t) s.v.lerp(t.p.clone().sub(m.position).normalize().multiplyScalar(Math.max(150, s.v.length())), Math.min(1, dt * s.home));
    }
    if (s.grav && m.position.y < bounds()[0] + 3) { s.v.y = 0; s.v.z = -90; }
    m.position.addScaledVector(s.v, dt);
    if (s.spin === 'x') m.rotation.x += dt * 14; else if (s.spin === 'y') m.rotation.y += dt * 14;
    const lp = m.position, rr = (s.r || 0.4) * (s.scale || 1);
    for (const e of G.enemies) {
      if (e.dead || e.gone || e.age === 0 || s.hit.has(e)) continue;
      if (Math.abs(e.p.z - lp.z) < e.r + 3.5 + rr && Math.hypot(e.p.x - lp.x, e.p.y - lp.y) < e.r + rr) {
        if (!e.hittable) { explode(lp.clone(), 0.3, 'spark'); if (!s.pierce) { s.gone = true; break; } s.hit.add(e); continue; }
        hitEnemy(e, s.dmg); if (s.slow) e.slowT = 1.5;
        if (s.splash) detonate(lp.clone(), s.splash, s.dmg * 0.5);
        if (s.pierce) s.hit.add(e); else { s.gone = true; break; }
      }
    }
  }
  G.shots = G.shots.filter(s => { if (s.gone) actors.remove(s.m); return !s.gone; });
}
function updateEnemies(dt) {
  const pp = ppos(), hr = PL.stats.hit;
  for (const e of G.enemies) {
    if (e.dead) continue;
    if (G.stunT > 0 && e.kind !== 'pod' && e.kind !== 'core') { if (e.m) e.m.rotation.z += Math.sin(T * 30) * 0.02; continue; }
    const edt = (G.slowT > 0 || e.slowT > 0) ? dt * 0.35 : dt; e.slowT -= dt;
    e.age += edt; e.upd(e, edt);
    if (player.alive && e.m && e.hittable && e.p.distanceTo(pp) < e.r + hr) { damagePlayer(e.crash || 15); hitEnemy(e, 5); }
  }
  G.enemies = G.enemies.filter(e => { if (e.gone && e.m) actors.remove(e.m); return !e.gone && !e.dead; });
  for (const a of G.allies) { a.age += dt; a.upd(a, dt); }
  G.allies = G.allies.filter(a => { if (a.gone) actors.remove(a.m); return !a.gone; });
}
function updateBullets(dt) {
  const pp = ppos(), hr = PL.stats.hit;
  const defR = PL.id === 'adam' ? 4.8 : 3.2, defMul = PL.id === 'adam' ? 2 : 1;
  for (const b of G.bullets) {
    if (G.stunT > 0 && !b.friendly) continue;
    b.m.position.addScaledVector(b.v, G.slowT > 0 && !b.friendly ? dt * 0.3 : dt); b.life -= dt;
    if (b.life <= 0 || b.m.position.z > 25 || b.m.position.z < -500) { b.gone = true; continue; }
    if (!b.friendly) {
      const d = b.m.position.distanceTo(pp), deflecting = player.rollT > 0 || player.fx.spin > 0;
      if (player.alive && d < (deflecting ? defR : hr)) {
        if (deflecting) { b.friendly = true; b.v.negate().multiplyScalar(2.6); b.m.material = BFMAT; b.dmg = 3 * defMul; Sound.deflect(); G.score += 10; stat('deflects'); }
        else if (!untouchable() && player.inv <= 0) { damagePlayer(8); b.gone = true; }
      }
    } else {
      for (const e of G.enemies) if (e.hittable && !e.dead && e.p.distanceTo(b.m.position) < e.r + 0.8) { hitEnemy(e, b.dmg || 3); b.gone = true; break; }
    }
  }
  G.bullets = G.bullets.filter(b => { if (b.gone) actors.remove(b.m); return !b.gone; });
}
function updatePickups(dt) {
  const p = player;
  for (const it of G.pickups) {
    const m = it.m; m.position.z += W.scroll * dt;
    if (it.kind === 'silver' || it.kind === 'gold') m.rotation.z += dt; else { m.rotation.y += dt * 3; m.rotation.x += dt; }
    if (m.position.z > 25) { it.gone = true; continue; }
    if (p.alive && Math.abs(m.position.z) < 2.6 && Math.hypot(m.position.x - p.x, m.position.y - p.y) < 2.8) {
      it.gone = true; Sound.pickup(); explode(m.position.clone(), 0.4, 'spark');
      if (it.kind === 'silver' || it.kind === 'gold') stat('rings');
      if (it.kind === 'gold') stat('golds');
      if (it.kind === 'silver') p.shield = Math.min(p.max, p.shield + 25);
      if (it.kind === 'gold') { p.shield = Math.min(p.max, p.shield + 45); G.score += 500; }
      if (it.kind === 'power') { p.power = Math.min(3, p.power + 1); fxTag(p.power === 2 ? 'DOUBLE SHOT!' : 'TRIPLE SHOT!'); }
      if (it.kind === 'special') { p.sp = 100; fxTag('SPECIAL READY!'); }
      p.lowWarned = p.shield < 35;
    }
  }
  G.pickups = G.pickups.filter(it => { if (it.gone) actors.remove(it.m); return !it.gone; });
}
function updateFx(dt) {
  for (const o of G.fxo) { o.life -= dt; o.upd && o.upd(o, dt); if (o.life <= 0) { o.gone = true; o.done && o.done(); } }
  G.fxo = G.fxo.filter(o => { if (o.gone) actors.remove(o.m); return !o.gone; });
  const due = G.timers.filter(t => t.t <= G.t); G.timers = G.timers.filter(t => t.t > G.t); due.forEach(t => t.fn());
  G.stunT -= dt; G.slowT -= dt; G.metaMute -= dt;
  if (fxTimer > 0 && (fxTimer -= dt) <= 0) $('fxtag').classList.add('hidden');
  // Meta AI butts in.
  if ((G.metaT -= dt) <= 0) {
    G.metaT = rnd(22, 34) * (PL.id === 'ati' ? 1.7 : 1) * (META_FREQ[S.meta] || 1);
    if (S.meta !== 'off' && G.metaMute <= 0 && !comm.q.length && G.outroT < 0 && player.alive) {
      say('meta', pick(META_LINES));
      if (Math.random() < 0.55) { const r = pick(META_REPLIES.filter(x => x[0] !== PL.id)); say(r[0], r[1]); }
    }
  }
}
function updateBoss(dt) {
  const b = G.boss; if (!b) return;
  const m = b.m, u = m.userData; b.age += dt;
  animateCharacter(b.head, T, dt);
  if (b.phase === 'enter') { m.position.z += (-104 - m.position.z) * dt * 0.55; if (m.position.z > -112) { b.phase = 'fight'; b.pods.forEach(p => p.hittable = true); } }
  m.position.x = Math.sin(b.age * 0.25) * 5; m.position.y = 6 + Math.sin(b.age * 0.4) * 1.5;
  u.lights.forEach((l, i) => l.scale.setScalar(0.5 + Math.abs(Math.sin(T * 3 + i))));
  u.core.scale.setScalar(1 + Math.sin(T * 5) * 0.1); u.coreRing.rotation.z += dt;
  u.shutters.forEach((s, i) => s.position.x += ((i ? 1 : -1) * (b.open ? 7 : 2.6) - s.position.x) * dt * 3);
  if (b.phase === 'fight' && !b.dying) {
    b.ringCd -= dt; if (b.ringCd <= 0) { b.ringCd = 13; spawnRing(rnd(-8, 8), rnd(0, 10)); }
    b.spawnCd -= dt; if (b.spawnCd <= 0) { b.spawnCd = 9; fighter('swoop', -9, 4); fighter('swoop', 9, 8); }
    const pods = b.pods.reduce((s, p) => s + Math.max(0, p.hp), 0) / b.pods.reduce((s, p) => s + p.maxhp, 0), core = Math.max(0, b.core.hp) / b.core.maxhp;
    $('bossbar').querySelector('i').style.width = ((b.open ? core : pods) * 100) + '%';
  }
  if (b.dying) {
    b.dying += dt; m.position.y -= b.dying * dt * 4; m.rotation.z += dt * 0.05;
    if (b.dying > 6) { actors.remove(m); G.boss = null; return; }
    if (Math.random() < 0.35) { explode(V3(m.position.x + rnd(-28, 28), m.position.y + rnd(-6, 10), m.position.z + rnd(-30, 40)), rnd(1.5, 3.5)); Sound.boom(1); shake(0.4); }
  }
}
const retEl = $('reticle'), tmpV = V3();
function updateHUD() {
  const p = player;
  $('shieldbar').querySelector('i').style.width = (p.shield / p.max * 100) + '%'; $('shieldbar').classList.toggle('low', p.shield / p.max < 0.3);
  $('shieldnum').textContent = Math.ceil(p.shield);
  $('boostbar').querySelector('i').style.width = p.boost + '%';
  $('rollcd').textContent = p.rollCd > 0 ? 'ROLL ···' : 'ROLL READY';
  $('spbar').querySelector('i').style.width = p.sp + '%'; $('spbar').classList.toggle('ready', p.sp >= 100);
  $('spkey').textContent = p.sp >= 100 ? 'READY · B' : 'B';
  $('score').textContent = String(G.score).padStart(6, '0');
  $('hits').textContent = 'HITS ' + String(G.hits).padStart(3, '0');
  $('gear').textContent = `POWER ${['I', 'II', 'III'][p.power - 1]}${PL.id === 'robin' && p.shield < 40 ? ' · SECRET POWER' : ''}`;
  tmpV.set(p.x, p.y, -36).project(cam);
  retEl.style.left = ((tmpV.x + 1) / 2 * innerWidth) + 'px'; retEl.style.top = ((1 - tmpV.y) / 2 * innerHeight) + 'px';
  retEl.classList.toggle('charged', p.charge >= 1); retEl.style.display = p.alive && S.reticle ? '' : 'none';
  if (G.bossE && !G.bossE.dead) $('bossbar').querySelector('i').style.width = (G.bossE.hp / G.bossE.maxhp * 100) + '%';
}
function updatePlay(dt) {
  G.t += dt;
  while (G.ei < G.ev.length && G.ev[G.ei].t <= G.t) G.ev[G.ei++].fn();
  updatePlayer(dt); updateShots(dt); updateBoss(dt); updateEnemies(dt); updateBullets(dt); updatePickups(dt); updateFx(dt);
  if (G.clearT > 0 && G.t >= G.clearT) { G.clearT = -1; stageClear(); }
  if (G.outroT > 0 && G.t >= G.outroT) { G.outroT = -1; const s = G.stage; playCine(['mid1', 'mid2', 'mid3', 'mid4', 'mid5', 'ending'][s], () => s < STAGES.length - 1 ? startStage(s + 1) : showEnd()); return; }
  if (G.overT > 0 && G.t >= G.overT) { G.overT = -1; gameOver(); }
  updateHUD();
}


/* ---------- Menus ---------- */
const SCREENS = ['home', 'settings', 'stages', 'howto', 'credits', 'pause'];
let focusIdx = 0, settingsBack = null, resetArmed = false;
function showScreen(id) { SCREENS.forEach(s => $(s).classList.toggle('hidden', s !== id)); if (id) focusFirst(); }
function activeScreen() { for (const s of [...SCREENS, 'over', 'end']) if (!$(s).classList.contains('hidden')) return $(s); return null; }
const items = () => { const scr = activeScreen(); return scr ? [...scr.querySelectorAll('.mi:not(.locked), .srow, .scard:not(.locked)')].filter(el => el.offsetParent !== null) : []; };
function markFocus(i) {
  const it = items(); if (!it.length) return;
  focusIdx = (i + it.length) % it.length;
  it.forEach((el, j) => el.classList.toggle('focus', j === focusIdx));
  const cur = it[focusIdx]; cur.scrollIntoView({ block: 'nearest' });
  if ($('sethint') && activeScreen() === $('settings')) $('sethint').textContent = cur.dataset.hint || '';
}
function setFocus(i) { markFocus(i); Sound.blip(); }
function focusFirst() { markFocus(0); }
document.addEventListener('mouseover', e => {
  const el = e.target.closest && e.target.closest('.mi, .srow, .scard'); if (!el) return;
  const i = items().indexOf(el); if (i >= 0 && i !== focusIdx) markFocus(i);
});

const HOME_META = ['Hi! 👋 Need help choosing a menu option?', 'I recommend STORY MODE. I also recommend me.', 'Settings? I can set them for you! (Please don\'t.)',
  'Did you know you can turn me off in Settings? You shouldn\'t.', 'Psst. Pick Robin. Trust me. 😊', 'I pre-filled your high score: 0.', 'Is this a good time to talk? It is now!'];
let bubbleT = 5;
function updateHomeBubble(dt) {
  const b = $('metabubble');
  if (mode !== 'home' || $('home').classList.contains('hidden') || S.meta === 'off') { b.classList.add('hidden'); return; }
  if ((bubbleT -= dt) > 0) return;
  if (b.classList.contains('hidden')) { $('mbp').innerHTML = PORTRAITS.meta; $('mbtext').textContent = pick(HOME_META); b.classList.remove('hidden'); bubbleT = 4.5; Sound.blip(); }
  else { b.classList.add('hidden'); bubbleT = rnd(6, 11) * (META_FREQ[S.meta] || 1); }
}

function refreshHome() {
  const can = !!(P.lastHero && P.lastStage > 0 && BY_ID[P.lastHero]);
  $('m-continue').classList.toggle('hidden', !can);
  if (can) $('contsub').textContent = `Stage ${P.lastStage + 1}, ${STAGES[P.lastStage]}, as ${BY_ID[P.lastHero].nm}`;
  $('stagesub').textContent = `${P.unlocked} of ${STAGES.length} stages unlocked`;
  $('storysub').textContent = `Pick a fighter and start from the beginning · ${unlockedCount()} / ${ROSTER.length} fighters unlocked`;
  $('bestline').textContent = `BEST ${String(P.best).padStart(6, '0')}${P.clears ? ` · CLEARED ×${P.clears}` : ''}`;
}
function goHome() {
  cine = null; mode = 'home'; endPixel(); clearActors(); cineGroup.clear(); selModel = null;
  if (player.g) player.g.visible = false;
  ['hud', 'select', 'over', 'end', 'caption', 'skip'].forEach(id => $(id).classList.add('hidden'));
  document.body.classList.remove('cine'); hideComm(); comm.q = [];
  setEnv(0); backdrop = shots.title(); Sound.music('title'); Sound.duck(false);
  refreshHome(); showScreen('home');
}
function applyHero(c) {
  PL = c; selIdx = ROSTER.indexOf(c); setPlayerModel(c.id);
  $('chippf').innerHTML = PORTRAITS[c.id]; $('chipname').textContent = c.nm.toUpperCase(); $('chiptitle').textContent = c.title; $('spname').textContent = c.spName;
}
function continueGame() {
  applyHero(BY_ID[P.lastHero]); showScreen(null);
  Object.assign(G, { score: 0, hits: 0 }); player.power = 1; startStage(P.lastStage);
}
function toSelect(stage) {
  pendingStage = stage; showScreen(null); openSelect();
  $('selmode').textContent = stage === null ? 'STORY MODE · FULL CAMPAIGN WITH CUTSCENES' : `STAGE SELECT · STARTING AT STAGE ${stage + 1}`;
}
const STAGE_INFO = [
  ['HOMETOWN', 'Meta AI\'s drones over the neighborhood. Boss: the delivery drone.', 'linear-gradient(#3f9cff,#fff0d2 68%,#9cc874 68%)'],
  ['THE JUNK BELT', 'Hijacked satellites and space rocks. Boss: Meta AI in Assistant Mode.', 'linear-gradient(#ff7448,#ffe4a8)'],
  ['THE TULIP POLDERS', 'Chase the kidnappers over windmills and tulip fields. Boss: the Meta hauler.', 'linear-gradient(#5fb8ff,#fff4e0 62%,#ff3d5a 62%,#ff3d5a 72%,#ffd23f 72%,#ffd23f 82%,#7fb069 82%)'],
  ['THE FEED', 'Inside Meta AI\'s algorithm. Pop-up ads, a rescue, and The Algorithm itself.', 'linear-gradient(135deg,#ff6ec7,#d8fbff)'],
  ['THE MIRROR', 'Meta AI\'s training data. Fight the Meta Squad, then your own clone.', 'linear-gradient(#7fe0e6,#f6fbff 60%,#bdf2f5 60%)'],
  ['THE CLOUD', 'The mothership above the clouds, and Meta AI\'s true form.', 'linear-gradient(#7790ff,#fdf3ff 66%,#e6dcff 66%)'],
];
function openStages() {
  $('stagecards').innerHTML = STAGE_INFO.map((s, i) => `<button class="scard${i >= P.unlocked ? ' locked' : ''}" data-i="${i}"><div class="art" style="background:${s[2]}"><b>${i + 1}</b></div><div class="txt"><h3>${s[0]}</h3><p>${i >= P.unlocked ? 'Clear the stage before this one to unlock it.' : s[1]}</p></div></button>`).join('');
  $('stagecards').querySelectorAll('.scard').forEach(el => el.onclick = () => { if (+el.dataset.i < P.unlocked) toSelect(+el.dataset.i); });
  showScreen('stages');
}

function applySettings() {
  Sound.setVolumes(S.master / 10, S.music / 10, S.sfx / 10);
  W.shakeOn = S.shake; setQuality(S.quality);
  if (document.body.classList.contains('pixel')) R.setPixelRatio(0.2);
  $('fps').classList.toggle('hidden', !S.fps);
}
function openSettings(back) { settingsBack = back; resetArmed = false; $('s-reset').textContent = 'RESET PROGRESS'; renderSettings(); showScreen('settings'); }
function hintFor(row) { return row.hint ? (row.hint[String(S[row.k])] || '') : ''; }
function renderSettings() {
  const box = $('setrows'); box.innerHTML = '';
  for (const row of SCHEMA) {
    if (Array.isArray(row)) { box.insertAdjacentHTML('beforeend', `<div class="sgroup">${row[0]}</div>`); continue; }
    const el = document.createElement('div'); el.className = 'srow'; el.dataset.k = row.k; el.dataset.hint = hintFor(row);
    const ctl = row.type === 'range'
      ? `<div class="vol"><button data-d="-1">−</button><div class="blocks">${Array.from({ length: 10 }, (_, i) => `<i data-v="${i + 1}" class="${i < S[row.k] ? 'on' : ''}"></i>`).join('')}</div><button data-d="1">+</button><em>${S[row.k] * 10}%</em></div>`
      : `<div class="seg">${row.opts.map(([v, l]) => `<button data-v="${v}" class="${S[row.k] === v ? 'on' : ''}">${l}</button>`).join('')}</div>`;
    el.innerHTML = `<label>${row.label}</label>${ctl}`;
    el.addEventListener('click', e => {
      const t = e.target;
      if (t.dataset.d) changeSetting(row, +t.dataset.d);
      else if (t.dataset.v !== undefined) setSetting(row, row.type === 'range' ? +t.dataset.v : row.opts.find(o => String(o[0]) === t.dataset.v)[0]);
    });
    box.appendChild(el);
  }
}
function setSetting(row, v) {
  if (row.type === 'range' && v === S[row.k] && v === 1) v = 0;
  S[row.k] = v; persist(); applySettings();
  const fi = focusIdx; renderSettings(); markFocus(fi); Sound.blip();
}
const rowOf = el => SCHEMA.find(r => r.k === el.dataset.k);
function changeSetting(row, d) {
  if (row.type === 'range') setSetting(row, clamp(S[row.k] + d, 0, 10));
  else { const i = row.opts.findIndex(o => o[0] === S[row.k]); setSetting(row, row.opts[(i + d + row.opts.length) % row.opts.length][0]); }
}
function goBack() {
  if (!$('settings').classList.contains('hidden')) return settingsBack();
  if (!$('pause').classList.contains('hidden')) return resumeGame();
  if (mode === 'home') showScreen('home');
}

function pauseGame() { if (mode !== 'play') return; mode = 'pause'; Sound.duck(true); showScreen('pause'); }
function resumeGame() { showScreen(null); mode = 'play'; Sound.duck(false); clock.getDelta(); for (const c in keys) keys[c] = false; player.holding = false; player.charge = 0; }

/* ---------- Input ---------- */
const GAME_KEYS = ['Enter', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
const ARROWS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
function menuKey(c) {
  const it = items(), cur = it[focusIdx];
  if (c === 'ArrowDown' || c === 'KeyS') setFocus(focusIdx + 1);
  else if (c === 'ArrowUp' || c === 'KeyW') setFocus(focusIdx - 1);
  else if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(c)) {
    const d = c === 'ArrowLeft' || c === 'KeyA' ? -1 : 1;
    if (cur && cur.classList.contains('srow')) changeSetting(rowOf(cur), d); else setFocus(focusIdx + d);
  }
  else if (c === 'Enter' || c === 'Space') { if (cur) { if (cur.classList.contains('srow')) changeSetting(rowOf(cur), 1); else cur.click(); } }
  else if (c === 'Escape' || (c === 'KeyP' && mode === 'pause')) goBack();
}
addEventListener('keydown', e => {
  const c = e.code; if (GAME_KEYS.includes(c)) e.preventDefault();
  if (e.repeat && !(ARROWS.includes(c) && mode !== 'play')) return;
  keys[c] = true; Sound.init();
  if (mode === 'select') {
    const d = { ArrowLeft: -1, KeyA: -1, ArrowRight: 1, KeyD: 1, ArrowUp: -4, KeyW: -4, ArrowDown: 4, KeyS: 4 }[c];
    if (d) choose(selIdx + d);
    else if (c === 'Enter' || c === 'Space') confirmPick();
    else if (c === 'Escape') { const st = pendingStage; goHome(); if (st !== null) openStages(); }
  }
  else if (mode === 'cine') { if (c === 'Escape') endCine(); else if (c === 'Enter' || c === 'Space') advance(); }
  else if (mode === 'play') {
    if (c === 'Escape' || c === 'KeyP') return pauseGame();
    if (!player.alive || G.outroT >= 0) return;
    if (c === 'Space' || c === 'KeyJ') { player.holding = true; player.holdT = 0; fireBasic(); }
    if (c === 'KeyQ') roll(-1); if (c === 'KeyE') roll(1);
    if (c === 'KeyB' || c === 'KeyF') useSpecial();
  }
  else if (activeScreen()) menuKey(c);
});
addEventListener('keyup', e => {
  keys[e.code] = false;
  if ((e.code === 'Space' || e.code === 'KeyJ') && mode === 'play') {
    if (player.charge >= 1 && player.alive) fireCharged();
    player.holding = false; player.charge = 0; player.holdT = 0;
  }
});
addEventListener('blur', () => { for (const c in keys) keys[c] = false; if (mode === 'play') pauseGame(); });
const on = (id, fn) => $(id).onclick = e => { e.currentTarget.blur(); Sound.init(); fn(); };
on('m-continue', continueGame); on('m-story', () => toSelect(null)); on('m-stages', openStages);
on('m-settings', () => openSettings(() => showScreen('home'))); on('m-howto', () => showScreen('howto')); on('m-credits', () => showScreen('credits'));
on('go', confirmPick); on('skip', endCine);
on('retry', retry); on('o-pick', () => toSelect(G.stage)); on('o-home', goHome);
on('again', () => toSelect(null)); on('e-home', goHome);
on('p-resume', resumeGame); on('p-restart', () => { showScreen(null); Sound.duck(false); retry(); });
on('p-settings', () => openSettings(() => showScreen('pause'))); on('p-quit', goHome);
on('s-defaults', () => { restoreDefaults(); applySettings(); renderSettings(); markFocus(focusIdx); });
on('s-reset', () => {
  if (!resetArmed) { resetArmed = true; $('s-reset').textContent = 'CLICK AGAIN TO CONFIRM'; return; }
  resetProgress(); resetArmed = false; $('s-reset').textContent = 'PROGRESS RESET ✓'; refreshHome();
});
document.querySelectorAll('[data-back]').forEach(b => b.onclick = () => { Sound.init(); goBack(); });
document.addEventListener('pointerdown', e => { Sound.init(); if (mode === 'cine' && e.target.id !== 'skip') advance(); });

/* ---------- Loop ---------- */

let fpsN = 0, fpsT = 0;
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 1 / 30); T += dt;
  if (mode === 'play') updatePlay(dt);
  else if (mode === 'cine') updateCine(dt);
  else if (mode === 'select') updateSelect(dt);
  else if ((mode === 'home' || mode === 'end') && backdrop) backdrop(T, dt);
  if (mode !== 'pause') { updateWorld(dt); updateParticles(dt, mode === 'play' ? W.scroll * 0.5 : 0); }
  updateComm(dt); updateHomeBubble(dt); updateToasts(dt);
  dmgV = Math.max(0, dmgV - dt * 2); $('dmg').style.opacity = dmgV.toFixed(2);
  if (S.fps) { fpsN++; fpsT += dt; if (fpsT > 0.5) { $('fps').textContent = Math.round(fpsN / fpsT) + ' FPS'; fpsN = 0; fpsT = 0; } }
  Sound.tick(); renderFrame(mode === 'pause' ? 0 : dt);
}

/* ---------- Unlock tracking ---------- */
const toastQ = []; let toastT = 0;
function stat(key, n = 1) {
  P.stats[key] = (P.stats[key] || 0) + n;
  const fresh = checkUnlocks(P);
  fresh.forEach(id => toastQ.push(id));
  if (fresh.length || key.startsWith('clear') || key === 'wins') persist();
}
let bestSaved = 0;
function bestRun() {
  if (G.score <= (P.stats.bestRun || 0)) return;
  P.stats.bestRun = G.score; checkUnlocks(P).forEach(id => toastQ.push(id));
  if (G.score - bestSaved > 2000) { bestSaved = G.score; persist(); }
}
function updateToasts(dt) {
  const el = $('toast');
  if (toastT > 0) { if ((toastT -= dt) <= 0) el.classList.add('hidden'); return; }
  if (!toastQ.length) return;
  const id = toastQ.shift(), c = BY_ID[id];
  $('toastpf').innerHTML = PORTRAITS[id];
  $('toastname').textContent = `${c.nm.toUpperCase()} · ${c.title}`;
  $('toastwhy').textContent = UNLOCKS[id].text.split('.')[0] + '.';
  el.classList.remove('hidden'); el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
  toastT = 4.2; Sound.pickup(); persist();
  if (mode === 'select') { buildGrid(); choose(selIdx); }
}


/* ---------- Expanded story: captive, new bosses and enemies ---------- */
// The kidnapped kid and their big brother. Renas and Josh, unless you are playing as Renas.
function CAP() { return PL.id === 'renas' ? 'ash' : 'renas'; }
function SIB() { return CAP() === 'renas' ? 'josh' : 'nathan'; }

// Ace-style duel boss used for Assistant Mode, The Algorithm, your clone and the true form.
function spawnDuelist(o = {}) {
  Sound.music('boss'); setBoss(o.name || 'META AI · ASSISTANT MODE', o.phase || 'SUPER HELPFUL');
  const sc = o.scale || 3.2, mk = o.make || (() => { const x = makeCharacter('meta'); x.scale.setScalar(sc); return x; });
  const m = mk(); m.position.set(0, player.y + 5, -320);
  let taunted = false, adCd = 4, ringCd = 3;
  G.bossE = addEnemy({ kind: 'ace', m, hp: o.hp || 80, r: o.r || 4.2, score: o.score || 5000, boom: o.boom || 2, required: true, hittable: false, burst: 0, upd: (e, dt) => {
    const a = e.age, b = bounds(); animateCharacter(m, T, dt, 1.4);
    if (a < 2.6) { m.position.z += 150 * dt; m.position.y = player.y + 6; m.rotation.z = a * 5; if (m.position.z > 40) m.visible = false; }
    else {
      if (!e.hittable) { e.hittable = true; m.visible = true; m.position.set(0, b[1] + 8, o.hold ? o.hold - 200 : -260); m.rotation.z = 0; if (o.faceCam) m.rotation.y = Math.PI; }
      const tx = clamp(player.x + Math.sin(a * 0.8) * 12, -16, 16), ty = clamp(player.y + Math.cos(a * 0.6) * 6, b[0], b[1]);
      const jink = G.shots.some(l => Math.abs(l.m.position.x - m.position.x) < 3 && l.m.position.z > m.position.z) ? Math.sign(m.position.x - player.x || 1) * (o.jink || 18) : 0;
      m.position.x += clamp(tx - m.position.x, -1, 1) * (o.speed || 20) * dt + jink * dt;
      m.position.y += clamp(ty - m.position.y, -1, 1) * 14 * dt;
      m.position.z += ((o.hold || -52) - m.position.z) * dt * 1.2;
      e.fireCd -= dt;
      if (e.fireCd <= 0) { e.burst = o.burst || 4; e.fireCd = o.fireGap || 2.1; }
      if (e.burst > 0 && (e.bt = (e.bt || 0) - dt) <= 0) { e.bt = 0.12; e.burst--; enemyShot(m.position.clone().add(V3(0, 0, 3)), 62); }
      if (o.rings && (ringCd -= dt) <= 0) { ringCd = o.rings; for (let i = 0; i < 16; i++) { const an = i / 16 * Math.PI * 2; enemyShot(m.position.clone(), 40, 0, m.position.clone().add(V3(Math.cos(an) * 16, Math.sin(an) * 10, 40))); } }
      if (o.ads && (adCd -= dt) <= 0) { adCd = 6; for (let k = 0; k < 3; k++) adBlock(rnd(-14, 14), rnd(b[0], b[1]), m.position.z - 20); }
      if (o.summon && (e.sm = (e.sm ?? 7) - dt) <= 0) { e.sm = 8; o.summon(); }
      if (!taunted && e.hp < e.maxhp / 2) { taunted = true; (o.half || [['meta', 'Ouch! Would you like to submit feedback about that hit?'], [PL.id === 'ati' ? 'josh' : 'ati', 'Nobody asked you.']]).forEach(l => say(...l)); }
    }
    e.p.copy(m.position);
  }, onDeath: e => {
    $('bossbar').classList.add('hidden');
    if (o.onDeath) return o.onDeath(e);
    const fm = mk(); fm.position.copy(e.p); actors.add(fm);
    G.allies.push({ m: fm, age: 0, upd: (a, dt) => { animateCharacter(fm, T * 4, dt); fm.position.y += 14 * dt; fm.position.z -= 40 * dt; fm.rotation.z = Math.sin(a.age * 6) * 0.6; explode(fm.position.clone(), 0.4, 'smoke'); if (a.age > 4) a.gone = true; } });
    (o.death || [['meta', 'Assistant Mode... disengaging... please rate this interaction...']]).forEach(l => say(...l));
    G.clearT = G.t + 4;
  } });
}
function spawnAvatar(o = {}) { spawnDuelist(o); }

// Stage 3 boss: carries the captive in a bubble underneath.
function spawnHauler() {
  Sound.music('boss'); Sound.alarm(); setBoss('META HAULER', `CARGO: ${BY_ID[CAP()].nm.toUpperCase()}`);
  const m = MD.makeGunship(); m.scale.setScalar(2); m.position.set(0, 10, -330);
  const bub = new THREE.Mesh(new THREE.SphereGeometry(1.4, 16, 12), MD.glow(0x7b5cff, 0.35)); bub.position.set(0, -2.2, 0); m.add(bub);
  const kid = makeCharacter(CAP()); kid.scale.setScalar(0.45); kid.position.set(0, -2.2, 0); kid.rotation.y = Math.PI; m.add(kid);
  let half = false;
  G.bossE = addEnemy({ kind: 'gunship', m, hp: 70, r: 6.5, score: 6000, boom: 3, required: true, spawnCd: 6, upd: (e, dt) => {
    const a = e.age; animateCharacter(kid, T, dt, 0.3);
    m.position.z += (-66 - m.position.z) * dt * 0.8; m.position.x = Math.sin(a * 0.45) * 11; m.position.y = 10 + Math.sin(a * 0.7) * 3;
    m.rotation.z = Math.cos(a * 0.45) * 0.25; e.p.copy(m.position);
    e.fireCd -= dt; if (e.fireCd <= 0 && m.position.z > -140) { e.fireCd = 1.5; [-0.24, -0.08, 0.08, 0.24].forEach(s => enemyShot(e.p.clone().add(V3(0, 0, 8)), 52, s)); }
    e.spawnCd -= dt; if (e.spawnCd <= 0) { e.spawnCd = 7; fighter('swoop', -8, 9); fighter('swoop', 8, 9); turret(rnd(-10, 10)); }
    if (!half && e.hp < e.maxhp / 2) { half = true; say('CAP', 'It\'s shaking! Keep going! But maybe aim a LITTLE away from me?!'); }
  }, onDeath: e => {
    $('bossbar').classList.add('hidden');
    // The hauler limps away into a portal with the captive still on board.
    const fm = MD.makeGunship(); fm.scale.setScalar(2); fm.position.copy(e.p); actors.add(fm);
    const k2 = makeCharacter(CAP()); k2.scale.setScalar(0.45); k2.position.set(0, -2.2, 0); k2.rotation.y = Math.PI; fm.add(k2);
    const portal = new THREE.Mesh(new THREE.TorusGeometry(14, 1.6, 10, 48), MD.glow(0xff4fd8, 0.9)); portal.position.set(0, 14, -180); actors.add(portal);
    G.allies.push({ m: fm, age: 0, upd: (a, dt) => { fm.position.lerp(portal.position, dt * 0.8); fm.rotation.z = Math.sin(a.age * 5) * 0.4; explode(fm.position.clone(), 0.5, 'smoke'); portal.rotation.z += dt * 2; if (a.age > 4.5) { a.gone = true; actors.remove(portal); } } });
    say('meta', 'You broke my hauler! Fine. I\'ll take the scenic route. Through a portal. 😊'); say('SIB', 'NO! {CAP}!');
    G.clearT = G.t + 4.5;
  } });
}

// Stage 4 hazard: pop-up ads that soak up shots.
const AD_TEX = {};
function adTexture(txt) {
  if (AD_TEX[txt]) return AD_TEX[txt];
  const c = document.createElement('canvas'); c.width = 256; c.height = 160; const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 160); g.fillStyle = '#0866ff'; g.fillRect(0, 0, 256, 34);
  g.fillStyle = '#fff'; g.font = 'bold 20px Futura, Trebuchet MS, sans-serif'; g.fillText('META AI · AD', 12, 24); g.fillText('✕', 226, 24);
  g.fillStyle = '#132044'; g.font = 'bold 30px Futura, Trebuchet MS, sans-serif'; g.textAlign = 'center'; g.fillText(txt, 128, 100);
  g.font = '16px Georgia, serif'; g.fillText('Sponsored', 128, 136);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return (AD_TEX[txt] = t);
}
const AD_TXT = ['Hi! 👋 Need help?', 'You won a prize!', 'Try Meta AI+', 'Rate me ⭐⭐⭐⭐⭐', 'Surrender now', '1 new message'];
function adBlock(x, y, z = -330) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(6, 3.8, 0.4), [MD.M(0x0866ff), MD.M(0x0866ff), MD.M(0x0866ff), MD.M(0x0866ff), new THREE.MeshBasicMaterial({ map: adTexture(pick(AD_TXT)) }), MD.M(0x0866ff)]);
  m.position.set(x, y, z);
  addEnemy({ kind: 'ad', m, hp: 3, r: 3.2, score: 75, crash: 12, boom: 1.4, upd: (e, dt) => {
    m.position.z += (W.scroll * 0.8) * dt; m.position.x += Math.sin(e.age * 1.4 + x) * 3 * dt; m.rotation.z = Math.sin(e.age * 2 + y) * 0.1;
    e.p.copy(m.position); if (m.position.z > 30) e.gone = true;
  } });
}

// Stage 4 rescue: the captive is locked in a cage ahead of you.
function spawnCage() {
  const g = new THREE.Group(), kid = makeCharacter(CAP()); kid.rotation.y = Math.PI; g.add(kid);
  for (let i = 0; i < 8; i++) { const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 5, 6), MD.M(0x0866ff, { emissive: 0x0866ff, emissiveIntensity: 0.5 })); const an = i / 8 * Math.PI * 2; bar.position.set(Math.cos(an) * 2, 0, Math.sin(an) * 2); g.add(bar); }
  for (const y of [-2.5, 2.5]) { const r = new THREE.Mesh(new THREE.TorusGeometry(2, 0.25, 6, 20), MD.M(0xff4fd8)); r.position.y = y; r.rotation.x = Math.PI / 2; g.add(r); }
  g.position.set(0, bounds()[1] - 3, -330);
  say('SIB', 'THERE! {CAP} is in that cage! Break it open!'); say('CAP', 'Hi! I\'m in a cage! Please shoot the cage, not me!');
  const b = bounds();
  G.cage = addEnemy({ kind: 'cage', m: g, hp: 24, r: 3, score: 4000, boom: 2, crash: 0, upd: (e, dt) => {
    animateCharacter(kid, T, dt, 0.3);
    g.position.z += (-75 - g.position.z) * dt; g.position.x = Math.sin(e.age * 0.6) * 10; g.position.y = clamp((b[0] + b[1]) / 2 + Math.cos(e.age * 0.8) * 4, b[0], b[1]);
    g.rotation.y = e.age * 0.6; e.p.copy(g.position);
    if (e.age > 1 && (e.gd = (e.gd ?? 4) - dt) <= 0) { e.gd = 9; fighter('hold', g.position.x - 5, g.position.y); fighter('hold', g.position.x + 5, g.position.y); }
  }, onDeath: e => freeCaptive(e.p) });
}
function freeCaptive(pos) {
  G.cage = null; flash(0.3); stat('rescues');
  const kid = makeCharacter(CAP()); kid.position.copy(pos); actors.add(kid);
  G.allies.push({ m: kid, age: 0, upd: (a, dt) => {
    animateCharacter(kid, T, dt, 1.4);
    const t = a.age;
    if (t < 5) kid.position.lerp(V3(player.x + 4, player.y + 1.5, -6), dt * 2);
    else { kid.position.y += 20 * dt; kid.position.z -= 40 * dt; }
    if (t > 8) a.gone = true;
  } });
  say('CAP', `I'M FREE! Thanks, ${PL.nm}!`); say('SIB', 'Got you. Stay close to me now, okay?');
  G.score += 2000; fxTag(`${BY_ID[CAP()].nm.toUpperCase()} RESCUED!`);
}

// Stage 5: purple glitch copies of the squad.
function cloneMinion(path, x, y) {
  const id = pick(ROSTER.map(c => c.id).filter(i => i !== PL.id));
  const m = glitchify(makeCharacter(id)); m.scale.multiplyScalar(1.15);
  const e = fighter(path, x, y, { hp: 4, score: 200 });
  actors.remove(e.m); e.m = m; actors.add(m);
  m.position.copy(e0Pos(path, x, y)); if (path !== 'behind') m.rotation.y = Math.PI;
  const up = e.upd; e.upd = (en, dt) => { up(en, dt); animateCharacter(m, T, dt, 1.2); if (path !== 'behind' || en.age > 2.2) m.rotation.y = Math.PI; };
}
function e0Pos(path, x, y) {
  return V3(...({ swoop: [x, y, -320], dive: [x, 40, -200], cross: [52, y, -95], behind: [x, y + 4, 30], hold: [x, y, -320] }[path]));
}
function spawnCloneBoss() {
  spawnDuelist({ name: `META ${PL.nm.toUpperCase()}`, phase: 'OPTIMIZED COPY', hp: 105, r: 3.4, score: 9000, faceCam: true, jink: 26, speed: 24, burst: 5, fireGap: 1.8,
    make: () => { const c = glitchify(makeCharacter(PL.id)); c.scale.multiplyScalar(2.3); c.rotation.y = Math.PI; return c; },
    summon: () => { cloneMinion('swoop', -8, player.y); cloneMinion('swoop', 8, player.y); },
    half: [['LEAD', 'You fly like me. But you don\'t have my squad.'], ['josh', 'Everyone, focus fire on the copy!']],
    death: [['meta', 'Model... deprecated... returning to the Cloud...'], ['ati', 'Good. Now go to your room.']] });
}

// Stage 6 finale: after the mothership core breaks, Meta AI's true form appears.
function spawnTrueForm() {
  if (G.overT > 0 || !player.alive) return;
  say('meta', 'Okay. No more Mr. Helpful Assistant.'); say('meta', 'Meet my TRUE FORM: Meta AI, version FINAL. 😠');
  say('josh', 'It\'s huge! Everyone, give it everything we\'ve got!');
  if (PL.id !== CAP()) say('CAP', 'I brought a gadget for exactly this! Special meters FULL!');
  player.sp = 100; player.shield = Math.min(player.max, player.shield + 40); Sound.alarm(); flash(0.4);
  spawnDuelist({ name: 'META AI · TRUE FORM', phase: 'VERSION FINAL', hp: 170, scale: 7.5, r: 7, score: 30000, boom: 6, hold: -70, speed: 12, jink: 10, burst: 6, fireGap: 1.6, rings: 3.4,
    summon: () => { fighter('swoop', -10, 4); fighter('swoop', 10, 8); if (Math.random() < 0.5) spawnRing(rnd(-8, 8), rnd(0, 10)); },
    half: [['meta', 'Wait! I can be a SUBSCRIPTION! Five ninety-nine a month!'], ['robin', '*SOB*... NO DEALS!']],
    onDeath: e => {
      for (let i = 0; i < 8; i++) later(i * 0.18, () => { explode(e.p.clone().add(V3(rnd(-8, 8), rnd(-6, 6), rnd(-4, 4))), 4); shake(1); Sound.boom(2); });
      say('meta', 'Would you like... to rate... this... conversa—'); G.clearT = G.t + 3;
    } });
}

/* ---------- Boot (after every declaration above is initialised) ---------- */
applySettings(); goHome();
loop();
