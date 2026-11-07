import { THREE, R, scene, cam, actors, cineGroup, setEnv, setScroll, W, updateWorld, explode, updateParticles, flash, shake, renderFrame, setQuality, ENVS, turnWorld } from './world.js';
import { S, P, SCHEMA, DIFF, META_FREQ, TEXT_CPS, persist, resetProgress, restoreDefaults } from './settings.js';
import * as MD from './models.js';
import { makeCharacter, animateCharacter, symbolSprite } from './characters.js';
import { CAST, SCRIPTS, STAGES, ROSTER, BY_ID, META_LINES, META_REPLIES, OVER_QUOTES, STAGE_ENV, SECRETS } from './story.js';
import { PORTRAITS } from './portraits.js';
import { isUnlocked, progressOf, checkUnlocks, UNLOCKS } from './unlocks.js';
import { stageRank, betterRank, RANK_COLOR, MODIFIERS, modMul, SKINS, dailyChallenge, todayKey, TROPHIES, trophyProgress, checkTrophies, summary, TOKENS_PER_STAGE } from './replay.js';
import { makeShots } from './shots.js';
import { makeMoreShots, glitchify } from './shots2.js';
import { Sound } from './audio.js';
import { SHOP, SHOP_BY, dealOfDay, priceOf, NIFFO_LINES, NIFFO_BUY, NIFFO_BROKE, wearHat } from './shop.js';
import { SIDES, GOAL_TEXT } from './sides.js';

const $ = id => document.getElementById(id);
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[(Math.random() * a.length) | 0];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = t => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
const keys = {}; const k = c => keys[c] ? 1 : 0;
const clock = new THREE.Clock();
let mode = 'home', T = 0, backdrop = null, dmgV = 0;
let PL = BY_ID.josh, selIdx = 0, pendingStage = null, pendingMode = null, pendingSide = null;

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
  player.g = applySkin(makeCharacter(id), id); wearHat(player.g, P.hat); player.g.visible = false; scene.add(player.g);
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
  if (PL.id === 'yassin') m *= 1.25;
  if (hasMod('glass')) m *= 2;
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
  $('sts').style.width = (c.stats.shield / 150 * 100) + '%'; $('stv').style.width = Math.min(100, c.stats.move / 1.3 * 100) + '%'; $('stz').style.width = (c.stats.hit / 1.5 * 100) + '%';
  const pr = progressOf(P, c.id);
  $('dlock').classList.toggle('hidden', open);
  if (!open && pr) {
    $('dlocktext').textContent = pr.text;
    $('dlockbar').style.width = (pr.pct * 100) + '%';
    $('dlocknum').textContent = `${pr.v.toLocaleString()} / ${pr.goal.toLocaleString()}`;
  }
  $('go').textContent = open ? `FLY AS ${c.nm.toUpperCase()} ▸` : 'LOCKED';
  $('go').classList.toggle('disabled', !open);
  cineGroup.clear(); selModel = applySkin(makeCharacter(c.id), c.id); if (open) wearHat(selModel, P.hat); selModel.position.set(0, 20, 0); cineGroup.add(selModel);
  renderSkins(c, open);
  if (!open) selModel.traverse(o => { if (o.isMesh) { if (o.material.blending === THREE.AdditiveBlending) o.visible = false; else o.material = SILHOUETTE; } if (o.isSprite) o.visible = false; });
  explode(V3(0, 20, -1.2), 0.25, 'spark'); Sound.blip();
}
function openSelect() {
  ['home', 'end', 'over', 'stages'].forEach(id => $(id).classList.add('hidden'));
  $('hud').classList.add('hidden'); clearActors(); if (player.g) player.g.visible = false;
  mode = 'select'; setEnv(0); setScroll(25); $('select').classList.remove('hidden'); p2.picking = false; refreshCoopBtn();
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
  if (pendingMode === 'trio' && !pendingSide && trioPickStep()) return;
  if (p2.want && !p2.picking && pendingMode !== 'trio') { PL = ROSTER[selIdx]; p2.picking = true; selIdx = (selIdx + 1) % ROSTER.length; while (!isUnlocked(P, ROSTER[selIdx].id)) selIdx = (selIdx + 1) % ROSTER.length; choose(selIdx); setSelText(); Sound.pickup(); return; }
  if (p2.picking) { p2.c = ROSTER[selIdx]; p2.picking = false; } else { PL = ROSTER[selIdx]; p2.c = null; }
  setPlayerModel(PL.id);
  $('select').classList.add('hidden'); cineGroup.clear(); selModel = null;
  $('chippf').innerHTML = PORTRAITS[PL.id]; $('chipname').textContent = PL.nm.toUpperCase(); $('chiptitle').textContent = PL.title;
  $('spname').textContent = PL.spName; P.lastHero = PL.id; persist();
  if (pendingSide) startSide(pendingSide); else if (pendingMode) startMode(pendingMode); else if (pendingSecret !== null) { Object.assign(G, { score: 0, hits: 0, routeRun: [] }); player.power = 1; startSecret(pendingSecret); } else if (pendingStage !== null) { Object.assign(G, { score: 0, hits: 0 }); player.power = 1; startStage(pendingStage); } else startGame();
}

/* ---------- Flow ---------- */
function startGame() {
  Object.assign(G, { score: 0, hits: 0, routeRun: [], trueEnd: false }); player.power = 1;
  playCine('intro', () => startStage(0));
}
function startStage(i) {
  ['over', 'end', 'home', 'pause', 'select'].forEach(id => $(id).classList.add('hidden'));
  clearActors(); setEnv(STAGE_ENV[i]);
  Object.assign(G, { mode: 'story', daily: null, hpMul: 1, mods: [], scoreMul: 1, dmgTaken: 0, spawned: 0, kills: 0, tokensGot: 0, stage: i, t: 0, ei: 0, clearT: -1, outroT: -1, overT: -1, metaT: rnd(18, 26), metaMute: 0,
    secret: null, gateTaken: false, flags: {}, ringsSpawned: 0, ringsGot: 0, arena: false, trueEnd: false });
  G.ev = buildStage(i); scheduleTokens(i);
  G.start = { score: G.score, hits: G.hits, power: player.power };
  resetPlayer(); applyBoosts(); setupP2(); $('trio').classList.add('hidden'); mode = 'play'; comm.q = []; hideComm();
  $('hud').classList.remove('hidden');
  $('stagename').textContent = `STAGE ${i + 1} · ${STAGES[i]}`;
  card(`STAGE ${i + 1}`, STAGES[i], `${PL.nm.toUpperCase()} · ${PL.title}`);
  cam.position.set(0, player.y * 0.6 + 2.6, 14); G.look.set(0, player.y, -40);
  Sound.music('stage');
}
function stageClear() {
  if (G.secret !== null && G.secret !== undefined) return secretClear();
  G.outroT = G.t + 4; player.inv = 99;
  if (G.cage && !G.cage.dead) killEnemy(G.cage);
  stat('clear' + (G.stage + 1)); if (S.difficulty === 'hard') stat('hardClears'); if (p2.on) stat('coopClears'); bestRun();
  const sh = awardShells(G.score - G.start.score);
  P.unlocked = Math.max(P.unlocked, Math.min(STAGES.length, G.stage + 2)); P.lastStage = Math.min(STAGES.length - 1, G.stage + 1); P.lastHero = PL.id; P.best = Math.max(P.best, G.score); persist();
  G.bullets.forEach(b => actors.remove(b.m)); G.bullets = [];
  const rank = stageRank({ dmg: G.dmgTaken, kills: G.kills, spawned: G.spawned, tokens: G.tokensGot });
  P.ranks = P.ranks || {}; const prevRank = P.ranks[G.stage]; P.ranks[G.stage] = prevRank ? betterRank(rank, prevRank) : rank;
  if (G.dmgTaken <= 0) stat('flawless');
  card('STAGE CLEAR', `RANK ${rank}`, `${STAGES[G.stage]} · SCORE ${G.score} · TOKENS ${G.tokensGot}/${TOKENS_PER_STAGE} · +${sh} 🐚${G.gateTaken ? ' · SECRET ROUTE NEXT' : ''}${prevRank && rank !== prevRank && betterRank(rank, prevRank) === rank ? ' · NEW BEST RANK' : ''}`);
  checkAll(); persist();
  Sound.music(null); Sound.pickup();
}
function gameOver() {
  if (isArcade()) return showResults(false);
  mode = 'over'; $('hud').classList.add('hidden'); hideComm(); endPixel(); P.best = Math.max(P.best, G.score); awardShells(G.score - G.start.score); persist();
  const [w, q] = pick(OVER_QUOTES.filter(o => o[0] !== PL.id));
  $('overquote').textContent = `"${q}" ${CAST[w].name}`; setTimeout(focusFirst, 0);
  $('over').classList.remove('hidden'); Sound.music('cine');
}
function retry() {
  if (G.mode === 'side') return startSide(G.sideId);
  if (isArcade()) return startMode(G.mode);
  Object.assign(G, { score: G.start.score, hits: G.start.hits }); player.power = G.start.power;
  if (G.secret !== null && G.secret !== undefined) return startSecret(G.secret);
  startStage(G.stage);
}
function showEnd() {
  mode = 'end'; $('hud').classList.add('hidden');
  setEnv(3); cineGroup.clear(); backdrop = shots.sunrise();
  $('endwho').textContent = `HERO  ${PL.nm.toUpperCase()}, ${PL.title}${G.trueEnd ? '  ·  TRUE ENDING' : (G.routeRun || []).length ? `  ·  SECRET ROUTES ${G.routeRun.length}/3` : ''}`;
  if (G.trueEnd) stat('trueEnd');
  $('endscore').textContent = `FINAL SCORE  ${String(G.score).padStart(6, '0')}`;
  $('endhits').textContent = `DRONES DOWNED  ${G.hits}`;
  P.winners = P.winners || {}; P.winners[PL.id] = 1; grantSkin(PL.id, 'gold'); if (S.difficulty === 'hard') stat('hardWins');
  stat('wins'); P.clears++; P.best = Math.max(P.best, G.score); P.lastStage = 0; persist();
  $('endbest').textContent = `BEST EVER  ${String(P.best).padStart(6, '0')}`;
  $('end').classList.remove('hidden'); Sound.music('title'); setTimeout(focusFirst, 0);
}

/* ---------- Enemies ---------- */
const BGEO = new THREE.SphereGeometry(0.55, 10, 8), BHALO = new THREE.SphereGeometry(1.15, 10, 8);
const BMAT = new THREE.MeshBasicMaterial({ color: 0xff2d6f }), BHMAT = MD.glow(0x7b5cff, 0.45), BFMAT = new THREE.MeshBasicMaterial({ color: 0x2f5bff });
function addEnemy(o) {
  const e = Object.assign({ age: 0, hp: 1, r: 2.2, score: 100, hittable: true, fireCd: rnd(1, 2.5), p: V3(), boom: 1.2, slowT: 0 }, o);
  if (o.kind !== 'rock') e.hp *= DIFF[S.difficulty].hp * (G.hpMul || 1); if (COUNTED.includes(o.kind)) G.spawned = (G.spawned || 0) + 1; e.maxhp = e.hp; if (e.m) actors.add(e.m); G.enemies.push(e); return e;
}
const aimPoint = () => player.fx.invis > 0 && player.decoy ? player.decoy.position.clone() : p2.on && p2.alive && Math.random() < 0.4 ? p2.pos.clone() : ppos().add(V3(player.vx * 0.35, player.vy * 0.35, 0));
function enemyShot(from, speed = 56, spread = 0, target) {
  if (!target && Math.random() > DIFF[S.difficulty].fire) return;
  speed *= DIFF[S.difficulty].speed * (hasMod('turbo') ? 1.3 : 1);
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
function spawnRing(x, y, gold) { const m = MD.makeRing(gold); m.position.set(x, y, -330); actors.add(m); G.pickups.push({ m, kind: gold ? 'gold' : 'silver' }); G.ringsSpawned = (G.ringsSpawned || 0) + 1; }
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
    onDeath: () => { if (saved === null) { saved = true; say(id, L[1]); G.flags.saved = true; if (id === 'robin') stat('robinSaved'); } },
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
    at(56, () => { if (G.flags.saved) spawnGate(0); });
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
    at(55.5, () => { if (G.ringsSpawned > 0 && G.ringsGot >= G.ringsSpawned) spawnGate(1); });
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
    at(17, () => { Sound.alarm(); say('evil_adam', 'Hello, Adam. Miss me?'); say(PL.id === 'adam' ? 'LEAD' : 'adam', 'Oh no. Not HIM. Meta AI dug my evil twin out of the training data.'); say('evil_adam', 'Meta AI gave me wings. I gave it my serve.'); });
    at(19, () => spawnEvilAdam(true));
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
  chop: { v: 280, d: 1.25 }, fish: { v: 260, d: 1.1, home: 1.5, spin: 'y' }, hoop: { v: 320, d: 1.1, home: 2.2 }, chalk: { v: 300, d: 1, spin: 'x' }, gem: { v: 280, d: 1.1, spin: 'y' },
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
    case 'chop': A(gget('chop', () => new THREE.BoxGeometry(0.7, 0.12, 0.5)), mat(0xc68642)); A(gget('choph', () => new THREE.BoxGeometry(1.2, 0.3, 1.0)), mat(0xff4d4d, 0.35)); break;
    case 'fish': { A(S(0.26), mat(0x9fd8ff), [0.6, 0.8, 1.6]); const t = A(gget('ftail', () => new THREE.ConeGeometry(0.22, 0.4, 4)), mat(0x48cae4)); t.position.z = 0.5; t.rotation.x = -Math.PI / 2; break; }
    case 'hoop': A(S(0.34), mat(0xff7b00)); A(gget('seam2', () => new THREE.TorusGeometry(0.34, 0.025, 4, 16)), mat(0x1b1b1b)); break;
    case 'chalk': A(gget('chk', () => new THREE.CylinderGeometry(0.07, 0.07, 0.5, 6)), mat(0xffffff)); A(S(0.3), mat(0xffffff, 0.25)); break;
    case 'gem': A(gget('oct', () => new THREE.OctahedronGeometry(0.32, 0)), mat(0xb388ff, 0.95), [1, 1.5, 1]); A(S(0.5), mat(0xe0c3ff, 0.25)); break;
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
  brickbreak() { [-9, 0, 9].forEach((x, i) => later(i * 0.15, () => { addShot({ type: 'chop', pos: V3(x, player.y, -3), v: V3(0, 0, -170), dmg: 16, life: 2.6, scale: 7, pierce: true }); shake(0.5); })); },
  bigcatch() {
    const c = V3(player.x, player.y, -60);
    const net = new THREE.Mesh(gget('net', () => new THREE.SphereGeometry(7, 12, 8)), new THREE.MeshBasicMaterial({ color: 0xfff6e4, wireframe: true, transparent: true })); net.position.copy(c); actors.add(net);
    G.fxo.push({ m: net, life: 0.9, max: 0.9, upd: o => { const k = o.life / o.max; o.m.scale.setScalar(0.4 + k * 1.6); o.m.material.opacity = k; o.m.rotation.y += 0.1; } });
    for (const e of visible()) { if (!['ace', 'gunship', 'core', 'pod'].includes(e.kind) && e.m) { e.m.position.lerp(c, 0.7); e.p.copy(e.m.position); } hitEnemy(e, 10); }
    later(0.6, () => detonate(c, 14, 10));
  },
  buzzer() { homing('hoop', 6, 14); flash(0.2); },
  popquiz() {
    for (const e of visible()) {
      const s = symbolSprite(e.hp <= 12 ? 'F' : 'D', '#e63946', 3); s.position.copy(e.p).add(V3(0, 3, 0)); actors.add(s);
      G.fxo.push({ m: s, life: 1.2, upd: o => { o.m.position.y += 0.05; } });
      hitEnemy(e, 12);
    }
    flash(0.3); shake(0.6);
  },
  prism() {
    ringFx(ppos(), 0xb388ff, 18); player.inv = Math.max(player.inv, 1.5);
    G.bullets.forEach(b => { if (!b.friendly && b.m.position.distanceTo(ppos()) < 20) { b.friendly = true; b.m.material = BFMAT; b.v = V3(0, 0, -140); b.dmg = 6; } });
    homing('gem', 10, 8);
  },
};
function useSpecial() {
  if (G.mode === 'obstacle') { fxTag('NO SPECIALS IN OBSTACLE RUN'); return; }
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
  G.score += Math.round(e.score * comboHit() * (G.scoreMul || 1)); G.hits++; if (COUNTED.includes(e.kind)) G.kills = (G.kills || 0) + 1; stat(e.kind === 'rock' ? 'rocks' : 'drones'); bestRun(); player.sp = Math.min(100, player.sp + (PL.id === 'renas' ? 7 : PL.id === 'bastiaan' ? 8 : 4));
  if (e.m) actors.remove(e.m);
  if (COUNTED.includes(e.kind) || e.kind === 'rock') sideProgress('kills');
  e.onDeath && e.onDeath(e);
}
function damagePlayer(d) {
  const p = player; if (p.inv > 0 || !p.alive || untouchable()) return;
  d *= DIFF[S.difficulty].dmg * (hasMod('glass') ? 2 : 1) * (PL.id === 'marloes' ? 0.7 : 1) * (G.mode === 'trio' ? 1.4 : 1); G.dmgTaken = (G.dmgTaken || 0) + d; p.shield -= d; p.inv = 1; Sound.hurt(); shake(0.7); dmgV = 0.9;
  if (!p.lowWarned && p.shield < 35 && p.shield > 0) {
    p.lowWarned = true;
    if (PL.id === 'robin') say('robin', '*sniff*... ow... *SNIFF*... okay. NOW I\'M ANGRY.');
    else say(PL.id === 'josh' ? 'renas' : 'josh', '{LEAD}, your shield is critical! Fly through a ring!');
  }
  if (p.shield <= 0 && G.revive) { G.revive = false; p.shield = Math.ceil(p.max / 2); p.inv = 2.5; flash(0.6); Sound.pickup(); fxTag('SECOND CHANCE!'); say('niffo', 'Second Chance, as purchased. No refunds on the next one.'); return; }
  if (p.shield <= 0 && G.mode === 'trio' && tagIn()) return;
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
    const solo = !p2.on;
    const ax = (k('KeyD') || (solo && k('ArrowRight'))) - (k('KeyA') || (solo && k('ArrowLeft')));
    const ay = (S.invertY ? -1 : 1) * ((k('KeyW') || (solo && k('ArrowUp'))) - (k('KeyS') || (solo && k('ArrowDown'))));
    const mv = PL.stats.move;
    p.vx += (ax * 24 * mv - p.vx) * Math.min(1, dt * 7); p.vy += (ay * 18 * mv - p.vy) * Math.min(1, dt * 7);
    if (G.arena) { p.turn = p.vx / 24 * 1.5; p.x += (0 - p.x) * Math.min(1, dt * 4); } else p.x = clamp(p.x + p.vx * dt, -16, 16);
    p.y = clamp(p.y + p.vy * dt, b[0], b[1]);
    const boosting = k('ShiftLeft') || (solo && k('ShiftRight')), braking = k('KeyC') || k('ControlLeft');
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
  setScroll((G.mode === 'obstacle' ? G.runSpeed || 60 : G.arena ? 48 : 65) * p.spd);
  p.rollCd -= dt; p.inv -= dt;
  let ra = 0; if (p.rollT > 0) { p.rollT -= dt; ra = p.rollDir * Math.PI * 2 * ease(1 - p.rollT / 0.5); }
  const g = p.g; g.position.set(p.x, p.y, 0);
  g.rotation.set(p.vy * 0.03, -p.vx * 0.012, -p.vx * 0.03 - ra);
  if (f.roll > 0) g.rotation.x = -T * 18;
  if (f.spin > 0) g.rotation.y = T * 25;
  animateCharacter(g, T, dt, p.spd > 1.2 ? 2 : p.spd < 0.8 ? 0.45 : 1);
  if (g.userData.aura) g.userData.aura.material.opacity = p.shield < 40 ? 0.12 + Math.sin(T * 10) * 0.06 : 0;
  if (g.userData.hat && g.userData.hat.userData.spin) g.userData.hat.userData.spin.rotation.y += dt * 14;
  if (p.alive) emitTrail(dt, g.position);
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
    if (p2.on && p2.alive && e.m && e.hittable && !e.dead && e.p.distanceTo(p2.pos) < e.r + p2.c.stats.hit) { damageP2(e.crash || 15); hitEnemy(e, 5); }
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
    if (b.life <= 0 || (G.arena ? b.m.position.lengthSq() > 250000 : b.m.position.z > 25 || b.m.position.z < -500)) { b.gone = true; continue; }
    if (!b.friendly && p2Hit(b)) { b.gone = true; continue; }
    if (!b.friendly) {
      const d = b.m.position.distanceTo(pp), deflecting = player.rollT > 0 || player.fx.spin > 0;
      if (player.alive && d < (deflecting ? defR : hr)) {
        if (deflecting) { b.friendly = true; b.v.negate().multiplyScalar(2.6); b.m.material = BFMAT; b.dmg = 3 * defMul; Sound.deflect(); G.score += 10; stat('deflects'); sideProgress('deflects'); }
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
    const m = it.m; if (!G.arena) m.position.z += W.scroll * dt;
    if (it.kind === 'silver' || it.kind === 'gold') m.rotation.z += dt; else if (it.kind === 'gate') { m.rotation.z += dt * 0.8; m.children.forEach((c, i) => { if (i) c.rotation.z -= dt * (1 + i); }); } else if (it.kind === 'token') { m.rotation.y += dt * 4; m.position.y += Math.sin(T * 3) * 0.02; } else { m.rotation.y += dt * 3; m.rotation.x += dt; }
    if (G.arena ? m.position.lengthSq() > 360000 : m.position.z > 25) { it.gone = true; continue; }
    if (PL.id === 'niffo' && it.kind !== 'gate' && p.alive && m.position.z > -70 && m.position.z < 2) { const k = Math.min(1, dt * 2.5); m.position.x += (p.x - m.position.x) * k; m.position.y += (p.y - m.position.y) * k; }
    const rr = it.kind === 'gate' ? 6.5 : 2.8, byP1 = p.alive && Math.abs(m.position.z) < 2.6 && Math.hypot(m.position.x - p.x, m.position.y - p.y) < rr;
    const byP2 = !byP1 && p2.on && p2.alive && it.kind !== 'gate' && Math.abs(m.position.z - p2.pos.z) < 2.6 && Math.hypot(m.position.x - p2.pos.x, m.position.y - p2.pos.y) < rr;
    if (byP1 || byP2) {
      it.gone = true; Sound.pickup(); explode(m.position.clone(), 0.4, 'spark');
      if (it.kind === 'gate') { takeGate(it.k); continue; }
      if (it.kind === 'silver' || it.kind === 'gold') { stat('rings'); G.ringsGot = (G.ringsGot || 0) + 1; sideProgress('rings'); if (G.mode === 'obstacle') { G.runRings++; G.bonus += it.kind === 'gold' ? 1000 : 250; fxTag(it.kind === 'gold' ? 'GOLD RING +1000' : 'RING +250'); } }
      if (it.kind === 'gold') { stat('golds'); if (G.mode === 'score') { G.timeLeft += 5; fxTag('+5 SECONDS'); } }
      const heal = n => { if (byP2) p2.shield = Math.min(p2.max, p2.shield + n); else p.shield = Math.min(p.max, p.shield + n); };
      if (it.kind === 'silver') heal(25);
      if (it.kind === 'gold') { heal(45); G.score += 500; }
      if (it.kind === 'power') { p.power = Math.min(3, p.power + 1); fxTag(p.power === 2 ? 'DOUBLE SHOT!' : 'TRIPLE SHOT!'); }
      if (it.kind === 'special') { if (byP2) p2.sp = 100; else p.sp = 100; fxTag('SPECIAL READY!'); }
      if (it.kind === 'token') collectToken(it);
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
    G.metaT = rnd(22, 34) * (PL.id === 'ati' ? 1.7 : 1) * (META_FREQ[S.meta] || 1) * (hasMod('chaos') ? 0.25 : 1);
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
  updatePlayer(dt); if (p2.on) updateP2(dt); if (G.arena) arenaWarp(dt); updateShots(dt); updateBoss(dt); updateEnemies(dt); updateBullets(dt); updatePickups(dt); updateFx(dt); if (isArcade()) updateDirector(dt);
  if (G.clearT > 0 && G.t >= G.clearT) { G.clearT = -1; if (isArcade()) modeBossDown(); else stageClear(); }
  if (G.outroT > 0 && G.t >= G.outroT) { G.outroT = -1; afterStage(); return; }
  if (G.overT > 0 && G.t >= G.overT) { G.overT = -1; gameOver(); }
  updateHUD(); updateP2HUD(); drawRadar();
}


/* ---------- Menus ---------- */
const SCREENS = ['home', 'settings', 'stages', 'howto', 'credits', 'pause', 'modes', 'results', 'trophies', 'shop', 'sides'];
let focusIdx = 0, settingsBack = null, resetArmed = false;
function showScreen(id) { SCREENS.forEach(s => $(s).classList.toggle('hidden', s !== id)); if (id) focusFirst(); }
function activeScreen() { for (const s of [...SCREENS, 'over', 'end']) if (!$(s).classList.contains('hidden')) return $(s); return null; }
const items = () => { const scr = activeScreen(); return scr ? [...scr.querySelectorAll('.mi:not(.locked), .srow, .scard:not(.locked), .item, .side:not(.locked)')].filter(el => el.offsetParent !== null) : []; };
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
  const el = e.target.closest && e.target.closest('.mi, .srow, .scard, .item, .side'); if (!el) return;
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
  const sm = summary(P); $('bestline').textContent = `BEST ${String(P.best).padStart(6, '0')} · 🏆 ${sm.trophies}/${TROPHIES.length} · 🪙 ${sm.tokens}/18`;
  $('trophysub').textContent = `${sm.trophies} of ${TROPHIES.length} trophies · ${sm.sRanks} S ranks · ${sm.skins} skins`; refreshDaily(); refreshExtras();
}
function goHome() {
  cine = null; mode = 'home'; endPixel(); clearActors(); cineGroup.clear(); selModel = null; G.arena = false; p2Off(); $('radar').classList.add('hidden'); $('trio').classList.add('hidden');
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
  pendingStage = stage; pendingMode = null; pendingSide = null; pendingSecret = null; showScreen(null); openSelect();
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
  $('stagecards').innerHTML = STAGE_INFO.map((s, i) => `<button class="scard${i >= P.unlocked ? ' locked' : ''}" data-i="${i}"><div class="art" style="background:${s[2]}"><b>${i + 1}</b></div><div class="txt"><h3>${s[0]}</h3>${stageBadges(i)}<p>${i >= P.unlocked ? 'Clear the stage before this one to unlock it.' : s[1]}</p></div></button>`).join('');
  $('stagecards').querySelectorAll('.scard').forEach(el => el.onclick = () => { if (+el.dataset.i < P.unlocked) toSelect(+el.dataset.i); });
  renderRoute();
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
const GAME_KEYS = ['Enter', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Slash', 'Period'];
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
    else if (c === 'Digit2' || c === 'Numpad2') toggleCoop();
    else if (c === 'Enter' || c === 'Space') confirmPick();
    else if (c === 'Escape' && pendingMode === 'trio' && trioPick.length) { trioPick.pop(); $('selmode').textContent = trioText(); markTrioGrid(); Sound.blip(); }
    else if (c === 'Escape' && p2.picking) { p2.picking = false; selIdx = ROSTER.indexOf(PL); choose(selIdx); setSelText(); }
    else if (c === 'Escape') { const st = pendingStage, pm = pendingMode; goHome(); if (pm) openModes(); else if (st !== null) openStages(); }
  }
  else if (mode === 'cine') { if (c === 'Escape') endCine(); else if (c === 'Enter' || c === 'Space') advance(); }
  else if (mode === 'play') {
    if (c === 'Escape' || c === 'KeyP') return pauseGame();
    if (p2.on && P2_KEYS.includes(c)) return p2Key(c);
    if (!player.alive || G.outroT >= 0) return;
    if (c === 'Space' || c === 'KeyJ') { player.holding = true; player.holdT = 0; fireBasic(); }
    if (c === 'KeyQ') roll(-1); if (c === 'KeyE') roll(1);
    if (c === 'KeyB' || c === 'KeyF') useSpecial();
  }
  else if (activeScreen()) menuKey(c);
});
addEventListener('keyup', e => {
  keys[e.code] = false;
  if (p2.on && P2_FIRE.includes(e.code)) p2.holding = false;
  if ((e.code === 'Space' || e.code === 'KeyJ') && mode === 'play') {
    if (player.charge >= 1 && player.alive) fireCharged();
    player.holding = false; player.charge = 0; player.holdT = 0;
  }
});
addEventListener('blur', () => { for (const c in keys) keys[c] = false; if (mode === 'play') pauseGame(); });
const on = (id, fn) => $(id).onclick = e => { e.currentTarget.blur(); Sound.init(); fn(); };
on('m-shop', openShop); on('m-sides', openSides); on('coopbtn', toggleCoop);
on('m-continue', continueGame); on('m-story', () => toSelect(null)); on('m-stages', openStages); on('m-modes', openModes); on('m-trophies', openTrophies); on('m-daily', startDaily);
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
  updateComm(dt); updateHomeBubble(dt); updateToasts(dt); updateModeHUD();
  dmgV = Math.max(0, dmgV - dt * 2); $('dmg').style.opacity = dmgV.toFixed(2);
  if (S.fps) { fpsN++; fpsT += dt; if (fpsT > 0.5) { $('fps').textContent = Math.round(fpsN / fpsT) + ' FPS'; fpsN = 0; fpsT = 0; } }
  Sound.tick(); renderFrame(mode === 'pause' ? 0 : dt);
}

/* ---------- Unlock tracking ---------- */
const toastQ = []; let toastT = 0;
function stat(key, n = 1) {
  P.stats[key] = (P.stats[key] || 0) + n;
  const fresh = checkUnlocks(P);
  fresh.forEach(id => toastQ.push(id)); checkAll();
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
  const it = toastQ.shift(), tr = typeof it === 'string' ? null : it;
  $('toastkick').textContent = tr ? tr.kick : 'NEW FIGHTER UNLOCKED';
  $('toastpf').innerHTML = tr ? `<div class="temoji">${tr.icon}</div>` : PORTRAITS[it];
  $('toastname').textContent = tr ? tr.title : `${BY_ID[it].nm.toUpperCase()} · ${BY_ID[it].title}`;
  $('toastwhy').textContent = tr ? tr.why : UNLOCKS[it].text.split('.')[0] + '.';
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
      if (o.flee && a > o.flee && !e.gone) { e.gone = true; $('bossbar').classList.add('hidden'); Sound.music('stage'); (o.fled || []).forEach(l => say(...l)); }
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

// Evil Adam: Adam's dark twin, dug out of Meta AI's training data. Mini-boss in The Mirror (he flees if you're slow), full boss in Boss Rush and Endless.
function spawnEvilAdam(story) {
  const foe = PL.id === 'adam' ? 'LEAD' : 'adam';
  spawnDuelist({ name: 'EVIL ADAM', phase: 'SAME REFLEXES · NO MORALS', hp: story ? 60 : 85, r: 3.2, score: 7000, faceCam: true, jink: 30, speed: 26, burst: 3, fireGap: 1.4, rings: 4.2, flee: story ? 26 : 0,
    make: () => { const c = makeCharacter('evil_adam'); c.scale.multiplyScalar(2.3); c.rotation.y = Math.PI; return c; },
    half: [['evil_adam', 'You hit like the good Adam. Weak.'], [foe, 'The good Adam is RIGHT HERE.']],
    fled: [['evil_adam', 'Bored now. I\'ll be back. With topspin.'], ['josh', 'He flew off. Forget him, keep moving!']],
    onDeath: e => {
      explode(e.p.clone(), 3); shake(1); stat('evilAdam'); G.score += 3000; fxTag('EVIL ADAM DEFEATED!');
      say('evil_adam', 'Game... set... I\'ll be back...'); say(foe, 'Return to sender.');
      if (story) { Sound.music('stage'); later(2.5, () => spawnGate(2)); } else G.clearT = G.t + 4;
    } });
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
      say('meta', 'Would you like... to rate... this... conversa—');
      if (G.mode === 'story' && (G.routeRun || []).length >= 3) later(3.5, spawnRootAccess); else G.clearT = G.t + 3;
    } });
}


/* ---------- Game modes: Endless, Boss Rush, Score Attack ---------- */
const MODES = {
  endless: { name: 'ENDLESS', sub: 'Wave after wave, harder every time. A boss every 6 waves. How far can you get?', art: 'linear-gradient(135deg,#2f5bff,#9fd8ff)' },
  trio: { name: 'TRIPLE THREAT', sub: 'VERY HARD. Pick 3 fighters. When one goes down, the next one tags in. Tougher enemies, more of them, a boss every 5 waves.', art: 'linear-gradient(135deg,#1b1b1b,#9d0208 55%,#ff5a1f)' },
  arena: { name: 'ARENA', sub: 'No rails. Fly anywhere in an open arena. A / D to turn, watch the radar. A dogfight boss every 4 waves.', art: 'linear-gradient(135deg,#2a1840,#9b5de5 55%,#ffd23f)' },
  bossrush: { name: 'BOSS RUSH', sub: 'Every boss in the game, back to back, against the clock. Shield only partly refills.', art: 'linear-gradient(135deg,#ff3d7f,#ffd23f)' },
  score: { name: 'SCORE ATTACK', sub: 'Two minutes. Chain kills for up to ×8 combo. Gold rings add 5 seconds.', art: 'linear-gradient(135deg,#00b4d8,#c7f9e8)' },
  obstacle: { name: 'OBSTACLE RUN', sub: 'Fly through walls, pillars, gates and spinning bars. It keeps getting faster. Hit anything and you\'re out.', art: 'linear-gradient(135deg,#ff5a1f,#ffd23f 55%,#2f5bff)' },
};
const isArcade = () => !!G.mode && G.mode !== 'story';
const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const RUSH = [
  { name: 'META DELIVERY DRONE', env: 0, stage: 0, spawn: () => spawnGunship() },
  { name: 'ASSISTANT MODE', env: 1, stage: 1, spawn: () => spawnAvatar() },
  { name: 'META HAULER', env: 4, stage: 2, spawn: () => spawnHauler() },
  { name: 'THE ALGORITHM', env: 5, stage: 3, spawn: () => spawnAvatar({ name: 'THE ALGORITHM', phase: 'RECOMMENDED FOR YOU', hp: 115, scale: 4.2, ads: true }) },
  { name: 'EVIL ADAM', env: 6, stage: 4, spawn: () => spawnEvilAdam(false) },
  { name: 'YOUR META CLONE', env: 6, stage: 4, spawn: () => spawnCloneBoss() },
  { name: 'THE MOTHERSHIP + TRUE FORM', env: 2, stage: 5, spawn: () => spawnBoss() },
];
const ENDLESS_BOSSES = RUSH.slice(0, -1);

function midY() { const b = bounds(); return (b[0] + b[1]) / 2; }
const WAVES = [
  () => { const m = midY(); for (let j = 0; j < 6; j++) later(j * 0.4, () => fighter('swoop', (j - 2.5) * 4, m + (j % 2 ? 2 : -2))); },
  () => { const m = midY(), s = Math.random() < 0.5 ? 1 : -1; for (let j = 0; j < 5; j++) later(j * 0.4, () => fighter('cross', 0, m - 3 + j * 1.5, { side: s })); },
  () => { const m = midY(); for (let j = 0; j < 4; j++) later(j * 0.4, () => fighter('behind', -9 + j * 6, m)); },
  () => { const m = midY(); for (let j = 0; j < 5; j++) later(j * 0.45, () => fighter('dive', -8 + j * 4, m)); },
  () => { const m = midY(); for (let j = 0; j < 4; j++) later(j * 0.5, () => fighter('hold', -9 + j * 6, m + (j % 2 ? 3 : -2))); },
  () => { const b = bounds(); if (W.env.ground && (W.env.gy || 0) === 0) for (let j = 0; j < 5; j++) later(j * 0.8, () => turret((j % 2 ? 1 : -1) * rnd(3, 12))); else for (let j = 0; j < 8; j++) later(j * 0.5, () => asteroid(rnd(-15, 15), rnd(b[0], b[1]), rnd(1.4, 3.6))); },
  () => { const b = bounds(); for (let j = 0; j < 6; j++) later(j * 0.6, () => adBlock(rnd(-14, 14), rnd(b[0], b[1]))); },
  () => { const m = midY(); for (let j = 0; j < 5; j++) later(j * 0.5, () => cloneMinion('swoop', (j - 2) * 4, m + (j % 2 ? 2 : -2))); },
];

function openModes() {
  P.modeBest = P.modeBest || {};
  const best = { endless: b => b ? `Best: wave ${b.wave} · ${b.score.toLocaleString()} pts` : 'No run yet',
    arena: b => b ? `Best: wave ${b.wave} · ${b.score.toLocaleString()} pts` : 'No run yet',
    trio: b => b ? `Best: wave ${b.wave} · ${b.score.toLocaleString()} pts · ${b.team}` : 'No run yet',
    bossrush: b => b ? (b.cleared ? `Best time: ${fmt(b.time)} · ${b.score.toLocaleString()} pts` : `Best: ${b.bosses} / ${RUSH.length} bosses`) : 'No run yet',
    obstacle: b => b ? `Best: ${Math.floor(b.dist).toLocaleString()} m · ${b.score.toLocaleString()} pts` : 'No run yet',
    score: b => b ? `Best: ${b.score.toLocaleString()} pts · max combo ×${b.combo}` : 'No run yet' };
  $('modecards').innerHTML = Object.entries(MODES).map(([k, m]) => `<button class="scard" data-m="${k}"><div class="art" style="background:${m.art}"><b>${m.name}</b></div><div class="txt"><p>${m.sub}</p><h3 class="mbest">${best[k](P.modeBest[k])}</h3></div></button>`).join('');
  $('modecards').querySelectorAll('.scard').forEach(el => el.onclick = () => toSelectMode(el.dataset.m));
  renderMods(); showScreen('modes');
}
function toSelectMode(m) {
  pendingMode = m; pendingStage = null; pendingSide = null; pendingSecret = null; showScreen(null); openSelect();
  trioPick = []; $('selmode').textContent = m === 'trio' ? trioText() : `${MODES[m].name} · NO CUTSCENES, JUST FIGHTING`;
}
function startMode(m) {
  ['over', 'end', 'home', 'pause', 'select', 'results', 'modes'].forEach(id => $(id).classList.add('hidden'));
  if (m === 'trio') { if (trioPick.length < 3) return toSelectMode('trio'); G.trioI = 0; setFighter(BY_ID[trioPick[0]]); p2.c = null; renderTrio(); }
  $('trio').classList.toggle('hidden', m !== 'trio');
  Object.assign(G, { score: 0, hits: 0 }); player.power = 1;
  clearActors(); setEnv(m === 'bossrush' ? RUSH[0].env : 0);
  Object.assign(G, { daily: null, mods: [...(pendingMods || [])], dmgTaken: 0, spawned: 0, kills: 0, tokensGot: 0, mode: m, stage: 0, t: 0, ev: [], ei: 0, clearT: -1, outroT: -1, overT: -1, metaT: rnd(18, 26), metaMute: 0,
    hpMul: 1, wave: 0, waveT: 2.5, bossActive: false, bi: 0, rushT: 0, timeLeft: 120, combo: 0, maxCombo: 0, lastKill: -9, envRot: 0, done: false });
  G.start = { score: 0, hits: 0, power: 1 };
  G.scoreMul = modMul(G.mods); if (hasMod('chaos')) G.hpMul = 1.3;
  resetPlayer(); if (hasMod('onehit') || m === 'obstacle') { player.max = 1; player.shield = 1; }
  applyBoosts(); setupP2();
  if (m === 'obstacle') Object.assign(G, { obs: [], obsT: 1.2, runSpeed: 60, dist: 0, bonus: 0, runRings: 0, gates: 0, nextZone: 600 });
  if (m === 'arena') { setEnv(9); startArena(); }
  mode = 'play'; comm.q = []; hideComm();
  $('hud').classList.remove('hidden'); $('stagename').textContent = MODES[m].name;
  card(MODES[m].name, m === 'bossrush' ? RUSH[0].name : m === 'score' ? '2:00 ON THE CLOCK' : m === 'obstacle' ? 'DON\'T HIT ANYTHING' : 'WAVE 1', `${PL.nm.toUpperCase()} · ${PL.title}`);
  cam.position.set(0, player.y * 0.6 + 2.6, 14); G.look.set(0, player.y, -40);
  Sound.music(m === 'bossrush' ? 'boss' : 'stage');
  if (m !== 'obstacle' && m !== 'arena') spawnWingmates();
  if (m === 'bossrush') { G.bossActive = true; later(3, () => RUSH[0].spawn()); }
}
function comboHit() {
  if (G.mode !== 'score') return 1;
  G.combo = G.t - G.lastKill < 2.2 ? Math.min(8, G.combo + 1) : 1; G.lastKill = G.t;
  G.maxCombo = Math.max(G.maxCombo, G.combo);
  if (G.combo >= 3) fxTag(`COMBO ×${G.combo}`);
  return G.combo;
}
function updateDirector(dt) {
  if (G.mode === 'obstacle') return updateObstacles(dt);
  if (G.mode === 'arena') return updateArenaMode(dt);
  if (G.mode === 'side') return updateSide(dt);
  if (G.done || !player.alive) return;
  if (G.mode === 'score') {
    if (G.t - G.lastKill > 2.2) G.combo = 0;
    G.timeLeft -= dt;
    if (G.timeLeft <= 0) { G.timeLeft = 0; G.done = true; player.inv = 99; card('TIME UP', String(G.score).padStart(6, '0')); later(2.5, () => showResults(true)); return; }
  }
  if (G.mode === 'bossrush') { if (!G.done) G.rushT += dt; return; }
  if (G.bossActive || (G.waveT -= dt) > 0) return;
  G.wave++;
  const m = midY();
  if (G.mode === 'endless' || G.mode === 'trio') {
    const trio = G.mode === 'trio', every = trio ? 5 : 6;
    G.hpMul = trio ? 1.35 + G.wave * 0.09 : 1 + G.wave * 0.05; G.stage = Math.min(5, G.envRot);
    if (G.wave % every === 0) {
      const bb = ENDLESS_BOSSES[(G.wave / every - 1) % ENDLESS_BOSSES.length];
      G.bossActive = true; Sound.alarm(); card(`WAVE ${G.wave}`, bb.name); later(2, bb.spawn); return;
    }
    const n = trio ? 2 + Math.floor(G.wave / 3) : 1 + Math.floor(G.wave / 4);
    for (let k = 0; k < n; k++) later(k * 1.4, () => pick(WAVES)());
    if (G.wave % 3 === 0) spawnRing(rnd(-8, 8), m, G.wave % 9 === 0);
    if (G.wave % 4 === 0) spawnPickup(G.wave % 8 === 0 ? 'special' : 'power', V3(rnd(-6, 6), m, -330));
    if (G.wave > 1) fxTag(`WAVE ${G.wave}`);
    G.waveT = trio ? Math.max(2.6, 6 - G.wave * 0.2) : Math.max(3.5, 8 - G.wave * 0.2);
  } else {
    pick(WAVES)(); if (G.t > 30 && Math.random() < 0.6) later(1.2, () => pick(WAVES)());
    if (G.wave % 4 === 0) spawnRing(rnd(-8, 8), m, Math.random() < 0.45);
    if (G.wave % 7 === 0) spawnPickup(Math.random() < 0.5 ? 'special' : 'power', V3(rnd(-6, 6), m, -330));
    G.waveT = G.t > 60 ? 2.2 : 3;
  }
}
function modeBossDown() {
  $('bossbar').classList.add('hidden'); G.bossE = null;
  G.bullets.forEach(b => actors.remove(b.m)); G.bullets = [];
  if (G.mode === 'arena') return arenaBossDown();
  if (G.mode === 'side') return sideWin();
  if (G.mode === 'endless' || G.mode === 'trio') {
    G.bossActive = false; G.score += 2000 * G.wave / 6;
    player.shield = Math.min(player.max, player.shield + 30);
    G.envRot++; setEnv(STAGE_ENV[G.envRot % STAGE_ENV.length]);
    card(`WAVE ${G.wave} CLEAR`, 'BOSS DOWN', `+${(2000 * G.wave / 6).toLocaleString()} · NEW WORLD`);
    Sound.music('stage'); Sound.pickup(); G.waveT = 4;
  } else if (G.mode === 'bossrush') {
    G.bi++;
    if (G.bi >= RUSH.length) { G.done = true; player.inv = 99; card('BOSS RUSH', 'CLEARED', fmt(G.rushT)); later(3, () => showResults(true)); return; }
    player.shield = Math.min(player.max, player.shield + 30);
    card(`BOSS ${G.bi + 1} / ${RUSH.length}`, RUSH[G.bi].name, `TIME ${fmt(G.rushT)}`); Sound.pickup();
    later(3.5, () => { const r = RUSH[G.bi]; setEnv(r.env); G.stage = r.stage; r.spawn(); });
  }
}
function showResults(won) {
  if (mode === 'results') return;
  mode = 'results'; endPixel(); hideComm(); comm.q = []; $('hud').classList.add('hidden');
  if (player.g) player.g.visible = false;
  P.modeBest = P.modeBest || {}; P.best = Math.max(P.best, G.score);
  const prev = P.modeBest[G.mode]; let rec = false, title, lines;
  if (G.mode === 'trio') {
    const team = trioTeam().map(c => c.nm).join(', ');
    rec = !prev || G.wave > prev.wave || (G.wave === prev.wave && G.score > prev.score);
    if (rec) P.modeBest.trio = { wave: G.wave, score: G.score, team };
    title = 'SQUAD WIPED'; lines = [`WAVE REACHED  ${G.wave}`, `SCORE  ${G.score.toLocaleString()}`, `KILLS  ${G.hits}`, `TEAM  ${team.toUpperCase()}`];
  } else if (G.mode === 'endless') {
    rec = !prev || G.wave > prev.wave || (G.wave === prev.wave && G.score > prev.score);
    if (rec) P.modeBest.endless = { wave: G.wave, score: G.score };
    title = 'SHIELD DOWN'; lines = [`WAVE REACHED  ${G.wave}`, `SCORE  ${G.score.toLocaleString()}`, `KILLS  ${G.hits}`];
  } else if (G.mode === 'bossrush') {
    const bosses = won ? RUSH.length : G.bi;
    rec = !prev || (won && (!prev.cleared || G.rushT < prev.time)) || (!won && !prev.cleared && bosses > prev.bosses);
    if (rec) P.modeBest.bossrush = { cleared: won, time: G.rushT, bosses, score: G.score };
    title = won ? 'ALL BOSSES DOWN' : 'SHIELD DOWN'; lines = [`BOSSES BEATEN  ${bosses} / ${RUSH.length}`, `TIME  ${fmt(G.rushT)}`, `SCORE  ${G.score.toLocaleString()}`];
  } else if (G.mode === 'arena') {
    rec = !prev || G.wave > prev.wave || (G.wave === prev.wave && G.score > prev.score);
    if (rec) P.modeBest.arena = { wave: G.wave, score: G.score };
    title = 'SHOT DOWN'; lines = [`WAVE REACHED  ${G.wave}`, `SCORE  ${G.score.toLocaleString()}`, `KILLS  ${G.hits}`];
  } else if (G.mode === 'side') {
    const sd = SIDES[G.sideId];
    rec = won && !G.sideWasDone;
    title = won ? 'SIDE STORY CLEAR' : 'SHIELD DOWN'; lines = [sd.title, `SCORE  ${G.score.toLocaleString()}`, `KILLS  ${G.hits}`];
    if (won) lines.push(G.sideWasDone ? 'Already finished. Still a good run.' : 'First clear! +150 🐚 bonus');
  } else if (G.mode === 'obstacle') {
    rec = !prev || G.dist > prev.dist;
    if (rec) P.modeBest.obstacle = { dist: G.dist, score: G.score };
    P.stats.runBest = Math.max(P.stats.runBest || 0, Math.floor(G.dist)); checkUnlocks(P).forEach(id => toastQ.push(id));
    title = 'CRASHED!'; lines = [`DISTANCE  ${Math.floor(G.dist).toLocaleString()} m`, `GATES CLEARED  ${G.gates}`, `RINGS  ${G.runRings}`, `SCORE  ${G.score.toLocaleString()}`];
  } else {
    rec = !prev || G.score > prev.score;
    if (rec) P.modeBest.score = { score: G.score, combo: G.maxCombo };
    title = won ? 'TIME UP' : 'SHIELD DOWN'; lines = [`SCORE  ${G.score.toLocaleString()}`, `MAX COMBO  ×${G.maxCombo}`, `KILLS  ${G.hits}`];
  }
  lines.push(`SHELLS  +${awardShells(G.score)} 🐚`);
  persist();
  $('reskicker').textContent = `${G.mode === 'side' ? 'SIDE STORY' : MODES[G.mode].name} · ${PL.nm.toUpperCase()}${p2.on ? ' + ' + p2.c.nm.toUpperCase() : ''}`;
  $('restitle').textContent = title;
  $('resstats').innerHTML = lines.map(l => `<div class="stat">${l}</div>`).join('');
  $('resrec').classList.toggle('hidden', !rec);
  showScreen('results'); Sound.music(won ? 'title' : 'cine');
}
function updateModeHUD() {
  if (!isArcade() || mode !== 'play') return;
  const t = G.mode === 'trio' ? `TRIPLE THREAT · WAVE ${Math.max(1, G.wave)} · ${3 - G.trioI} / 3 LEFT` : G.mode === 'side' ? sideHUD() : G.mode === 'arena' ? `ARENA · WAVE ${Math.max(1, G.wave)}` : G.mode === 'obstacle' ? `OBSTACLE RUN · ${Math.floor(G.dist || 0).toLocaleString()} m` : G.mode === 'endless' ? `ENDLESS · WAVE ${Math.max(1, G.wave)}` : G.mode === 'bossrush' ? `BOSS RUSH · ${Math.min(G.bi + 1, RUSH.length)}/${RUSH.length} · ${fmt(G.rushT)}` : `SCORE ATTACK · ${fmt(G.timeLeft)}${G.combo > 1 ? ` · COMBO ×${G.combo}` : ''}`;
  if ($('stagename').textContent !== t) $('stagename').textContent = t;
  $('stagename').classList.toggle('hurry', G.mode === 'score' && G.timeLeft < 15);
}
on('r-retry', () => G.mode === 'side' ? startSide(G.sideId) : G.daily ? startDaily() : startMode(G.mode)); on('r-pick', () => G.mode === 'side' ? (goHome(), openSides()) : toSelectMode(G.mode));
on('r-modes', () => { goHome(); openModes(); }); on('r-home', goHome);


/* ---------- Replay value: tokens, ranks, skins, trophies, daily, modifiers ---------- */
const COUNTED = ['fighter', 'turret', 'ad'];
let pendingMods = [];
const hasMod = k => (G.mods || []).includes(k);
const checkAll = () => checkTrophies(P).forEach(t => toastQ.push({ kick: 'TROPHY UNLOCKED', icon: t[1], title: t[2], why: t[3] }));

// Three hidden Meta tokens per story stage, tucked against the edges of the screen.
const TOKEN_TIMES = [14, 31, 46];
function scheduleTokens(i) {
  const b = ENV_BOUNDS[i];
  TOKEN_TIMES.forEach((t, k) => G.ev.push({ t, fn: () => {
    const x = [-15, 15, -14, 14, 0, -15][(i + k) % 6], y = (i + k) % 2 ? b[1] - 0.5 : b[0] + 0.5;
    spawnToken(i, k, x, y);
  } }));
  G.ev.sort((a, c) => a.t - c.t);
}
const TOKEN_GOLD = MD.M(0xffc93a, { metalness: 0.85, roughness: 0.2, emissive: 0x7a5200, emissiveIntensity: 0.5 });
function spawnToken(stage, k, x, y) {
  const had = ((P.tokens || {})[stage] || [])[k];
  const g = new THREE.Group();
  const coin = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.28, 28), had ? MD.glow(0xffc93a, 0.35) : TOKEN_GOLD); coin.rotation.x = Math.PI / 2; g.add(coin);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.16, 8, 24), had ? MD.glow(0x7b5cff, 0.35) : MD.M(0x0866ff, { emissive: 0x0866ff, emissiveIntensity: 0.6 })); ring.position.z = 0.16; g.add(ring);
  g.add(new THREE.Mesh(new THREE.SphereGeometry(2.1, 14, 10), MD.glow(0xffd23f, had ? 0.08 : 0.2)));
  g.position.set(x, y, -330); actors.add(g);
  G.pickups.push({ m: g, kind: 'token', stage, k, ghost: had });
  if (!had && (G.tokenHint = (G.tokenHint || 0) + 1) === 1) say('renas', 'Ooh, a Meta token! There are three hidden in every stage!');
}
function collectToken(it) {
  G.tokensGot++; G.score += it.ghost ? 250 : 1500;
  if (it.ghost) { fxTag('TOKEN (ALREADY FOUND) +250'); return; }
  P.tokens = P.tokens || {}; const arr = P.tokens[it.stage] = P.tokens[it.stage] || [false, false, false];
  arr[it.k] = true;
  P.stats.tokensFound = Object.values(P.tokens).reduce((s, a) => s + a.filter(Boolean).length, 0); checkUnlocks(P).forEach(id => toastQ.push(id));
  persist(); checkAll();
  fxTag(`META TOKEN ${arr.filter(Boolean).length}/${TOKENS_PER_STAGE}`); Sound.alarm();
}
function stageBadges(i) {
  const r = (P.ranks || {})[i], t = ((P.tokens || {})[i] || []);
  const dots = Array.from({ length: TOKENS_PER_STAGE }, (_, k) => `<i class="${t[k] ? 'on' : ''}"></i>`).join('');
  return `<div class="badges"><span class="rk" style="background:${r ? RANK_COLOR[r] : '#d9d9e3'}">${r || '–'}</span><span class="tk" title="Meta tokens">${dots}</span></div>`;
}

// Skins: gold for beating the story, glitch for clearing Boss Rush, per fighter.
const GOLD_SKIN = new THREE.MeshStandardMaterial({ color: 0xffc93a, metalness: 0.85, roughness: 0.25, emissive: 0x6a4a00, emissiveIntensity: 0.3, flatShading: true });
function applySkin(m, id) {
  const k = (P.skinSel || {})[id];
  if (k === 'gold') m.traverse(o => { if (o.isMesh && o.material.blending !== THREE.AdditiveBlending) o.material = GOLD_SKIN; });
  if (k === 'glitch') glitchify(m);
  return m;
}
const ownsSkin = (id, k) => k === 'classic' || ((P.skins || {})[id] || []).includes(k);
function grantSkin(id, k) {
  P.skins = P.skins || {}; const a = P.skins[id] = P.skins[id] || [];
  if (a.includes(k)) return;
  a.push(k); persist();
  toastQ.push({ kick: 'NEW SKIN', icon: k === 'gold' ? '✨' : '👾', title: `${BY_ID[id].nm.toUpperCase()} · ${SKINS[k].name}`, why: 'Equip it on the character select screen.' });
  checkAll();
}
function renderSkins(c, open) {
  const box = $('dskins'); box.classList.toggle('hidden', !open); if (!open) return;
  const sel = (P.skinSel || {})[c.id] || 'classic';
  box.innerHTML = '<b>SKIN</b>' + Object.entries(SKINS).map(([k, s]) => {
    const own = ownsSkin(c.id, k);
    return `<button class="${sel === k ? 'on' : ''}${own ? '' : ' lockd'}" data-k="${k}" title="${own ? s.name : s.how}">${own ? '' : '🔒 '}${s.name}</button>`;
  }).join('') + `<small>${ownsSkin(c.id, 'gold') && ownsSkin(c.id, 'glitch') ? 'All skins earned.' : Object.values(SKINS).filter((s, i) => !ownsSkin(c.id, Object.keys(SKINS)[i])).map(s => s.how).join(' · ')}</small>`;
  box.querySelectorAll('button').forEach(btn => btn.onclick = e => {
    e.stopPropagation(); const k = btn.dataset.k;
    if (!ownsSkin(c.id, k)) { Sound.hurt(); return; }
    P.skinSel = P.skinSel || {}; P.skinSel[c.id] = k; persist(); choose(selIdx);
  });
}

// Trophy room.
function openTrophies() {
  const sm = summary(P);
  $('trophysum').innerHTML = [['🏆', `${sm.trophies}/${TROPHIES.length}`, 'TROPHIES'], ['⭐', `${sm.sRanks}/6`, 'S RANKS'], ['🪙', `${sm.tokens}/18`, 'TOKENS'], ['✨', `${sm.skins}/${ROSTER.length * 2}`, 'SKINS']]
    .map(([i, v, l]) => `<div><span>${i}</span><b>${v}</b><small>${l}</small></div>`).join('');
  $('trophygrid').innerHTML = TROPHIES.map(t => {
    const p = trophyProgress(P, t);
    return `<div class="tro${p.done ? ' done' : ''}"><div class="ti">${p.done ? t[1] : '🔒'}</div><div><b>${t[2]}</b><p>${t[3]}</p>${p.done ? '' : `<div class="lockbar"><i style="width:${(p.v / p.g * 100).toFixed(0)}%"></i></div><small>${p.v.toLocaleString()} / ${p.g.toLocaleString()}</small>`}</div></div>`;
  }).join('');
  showScreen('trophies');
}

// Daily challenge: same fighter, mode and modifier for everyone today, including fighters you haven't unlocked.
function refreshDaily() {
  const d = dailyChallenge(ROSTER.map(c => c.id)), done = (P.daily || {}).date === d.key;
  $('dailysub').textContent = `${MODES[d.mode].name} as ${BY_ID[d.hero].nm} · ${d.mods.map(k => MODIFIERS[k].name).join(', ')}${done ? ` · today's best ${P.daily.best.toLocaleString()}` : ''}${(P.daily || {}).streak > 1 ? ` · 🔥 ${P.daily.streak}-day streak` : ''}`;
}
function startDaily() {
  const d = dailyChallenge(ROSTER.map(c => c.id));
  showScreen(null); applyHero(BY_ID[d.hero]);
  const keep = pendingMods; pendingMods = d.mods; startMode(d.mode); pendingMods = keep;
  G.daily = d.key; $('stagename').textContent = 'DAILY CHALLENGE';
  card('DAILY CHALLENGE', MODES[d.mode].name, `${BY_ID[d.hero].nm.toUpperCase()} · ${d.mods.map(k => MODIFIERS[k].name).join(', ')}`);
}
function recordDaily() {
  const key = G.daily, D = P.daily = P.daily || { played: 0, streak: 0 };
  if (D.date !== key) {
    const y = new Date(); y.setDate(y.getDate() - 1);
    const yk = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
    D.streak = D.date === yk ? (D.streak || 0) + 1 : 1; D.played = (D.played || 0) + 1; D.date = key; D.best = 0;
  }
  D.best = Math.max(D.best || 0, G.score);
}

// Modifier chips on the Game Modes screen.
function renderMods() {
  $('modchips').innerHTML = '<b>MODIFIERS</b>' + Object.entries(MODIFIERS).map(([k, m]) => `<button class="${pendingMods.includes(k) ? 'on' : ''}" data-k="${k}" title="${m.desc}">${m.name} <em>×${m.mul}</em></button>`).join('') + `<small>Score ×${modMul(pendingMods).toFixed(1)}${pendingMods.length ? ' · ' + pendingMods.map(k => MODIFIERS[k].desc).join(' ') : ' · Stack modifiers for a bigger score multiplier.'}</small>`;
  $('modchips').querySelectorAll('button').forEach(btn => btn.onclick = () => { const k = btn.dataset.k; pendingMods = pendingMods.includes(k) ? pendingMods.filter(x => x !== k) : [...pendingMods, k]; Sound.blip(); renderMods(); });
}


/* ---------- Obstacle Run ---------- */
const OB_COLS = [[0xff5a1f, 0xfff6e4], [0x2f5bff, 0xffd23f], [0xff3d7f, 0xfff6e4], [0x2a9d8f, 0xffd23f]];
const OB_DEPTH = 1.6, WALL_W = 60;
function obPart(g, w, h, x, y, col, d = OB_DEPTH) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), MD.M(col, { emissive: col, emissiveIntensity: 0.18 }));
  m.position.set(x, y, 0); m.userData.half = new THREE.Vector3(w / 2, h / 2, d / 2); g.add(m);
  // Hazard stripe along the edge so obstacles read clearly against any sky.
  const s = new THREE.Mesh(new THREE.BoxGeometry(w + 0.05, Math.min(0.5, h), d + 0.05), MD.M(0x132044)); s.position.set(x, y + h / 2 - 0.25, 0); g.add(s);
  return m;
}
function gapWall(gw, gh, gx, gy, col) {
  const g = new THREE.Group(), b = bounds(), top = b[1] + 6, bot = b[0] - 6;
  const L = gx - gw / 2, Rr = gx + gw / 2, T = gy + gh / 2, Bm = gy - gh / 2;
  obPart(g, L + WALL_W / 2, top - bot, (-WALL_W / 2 + L) / 2, (top + bot) / 2, col[0]);
  obPart(g, WALL_W / 2 - Rr, top - bot, (Rr + WALL_W / 2) / 2, (top + bot) / 2, col[0]);
  obPart(g, gw, top - T, gx, (top + T) / 2, col[0]);
  obPart(g, gw, Bm - bot, gx, (Bm + bot) / 2, col[0]);
  // Frame around the gap so you can see where to aim.
  const fr = new THREE.Mesh(new THREE.TorusGeometry(Math.min(gw, gh) * 0.5, 0.12, 4, 4), MD.glow(col[1], 0.9)); fr.rotation.z = Math.PI / 4; fr.scale.set(gw / Math.min(gw, gh) * 1.41, gh / Math.min(gw, gh) * 1.41, 1); fr.position.set(gx, gy, 0.9); g.add(fr);
  return g;
}
// Every obstacle type has its own colour so you can read what's coming from far away.
const OB_TYPE_COL = { wall: 0xff5a1f, slider: 0x2a9d8f, pillars: 0x2f5bff, bars: 0xffd23f, spinner: 0xff3d7f, double: 0xc1121f,
  checker: 0x3a86ff, orbs: 0x9b5de5, lasers: 0xff1f3d, crusher: 0xf77f00, donut: 0x00b4d8, swing: 0xe0a800, rotor: 0x2ec27e,
  windmill: 0xf4e3c1, asteroids: 0xff7b00, phones: 0xf72585, serpent: 0x38b000, eye: 0x0866ff, gate: 0x9c6644 };
// Colliders: userData.half (box), userData.sphere (radius) or userData.torus ({ R, t }). userData.off switches one off.
function obSphere(g, rad, x, y, z, col) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(rad, 16, 12), MD.M(col, { emissive: col, emissiveIntensity: 0.25 }));
  m.position.set(x, y, z); m.userData.sphere = rad; g.add(m); return m;
}
// Solid box with a matching collider, without the hazard stripe obPart adds.
function obBox(g, w, h, d, x, y, z, col) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), MD.M(col)); m.position.set(x, y, z);
  m.userData.half = new THREE.Vector3(w / 2, h / 2, d / 2); g.add(m); return m;
}
// Detail mesh with no collider, for parts that sit inside or on a collider.
function deco(g, geo, mat, x, y, z) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; }
function spawnObstacle() {
  const t = G.t, b = bounds(), mid = (b[0] + b[1]) / 2;
  const gap = Math.max(5.2, 9.5 - t * 0.05), types = ['wall', 'wall', 'pillars'];
  if (t > 10) types.push('checker', 'orbs');
  if (t > 15) types.push('asteroids');
  if (t > 18) types.push('bars');
  if (t > 20) types.push('windmill');
  if (t > 25) types.push('lasers', 'swing');
  if (t > 30) types.push('phones');
  if (t > 35) types.push('slider', 'slider', 'crusher');
  if (t > 40) types.push('serpent');
  if (t > 45) types.push('donut');
  if (t > 50) types.push('eye');
  if (t > 55) types.push('spinner', 'rotor');
  if (t > 60) types.push('gate');
  if (t > 75) types.push('double');
  const type = pick(types), col = [OB_TYPE_COL[type], OB_COLS[G.envRot % OB_COLS.length][1]];
  let g, o = { type, spin: 0, slide: 0, zEnd: 3, ph: rnd(0, 6) };
  const gx = rnd(-12, 12), gy = rnd(b[0] + gap / 2, b[1] - gap / 2);
  if (type === 'wall' || type === 'slider') {
    g = gapWall(gap * 1.15, gap, gx, gy, col);
    if (type === 'slider') { o.slide = rnd(5, 9) * (Math.random() < 0.5 ? -1 : 1); o.baseX = 0; }
    o.gap = V3(gx, gy, 0);
  } else if (type === 'pillars') {
    g = new THREE.Group();
    const slots = [-14, -7, 0, 7, 14], open = (Math.random() * slots.length) | 0;
    slots.forEach((x, i) => { if (i !== open && Math.random() < 0.85) obPart(g, 3, b[1] - b[0] + 14, x + rnd(-1, 1), mid, col[0]); });
    o.gap = V3(slots[open], mid, 0);
  } else if (type === 'bars') {
    g = new THREE.Group();
    const y1 = rnd(b[0] + 1, mid - 1), y2 = y1 + gap + rnd(1, 4);
    obPart(g, WALL_W, 1.8, 0, y1 - 0.9 - gap / 2, col[0]);
    if (y2 < b[1] + 2) obPart(g, WALL_W, 1.8, 0, y2, col[0]);
    o.gap = V3(0, y1 + (y2 - y1) / 2 - gap / 2, 0);
  } else if (type === 'spinner' || type === 'rotor') {
    g = new THREE.Group(); const hub = new THREE.Group(); hub.position.set(type === 'rotor' ? rnd(-6, 6) : 0, mid, 0); g.add(hub);
    obPart(hub, type === 'rotor' ? 36 : 44, 1.8, 0, 0, col[0]);
    if (type === 'spinner') obPart(hub, 1.8, 44, 0, 0, col[0]);
    obSphere(hub, 1.6, 0, 0, 0, col[1]);
    o.hub = hub; o.spin = (type === 'rotor' ? rnd(1.6, 2.2) : rnd(0.6, 1.1)) * (Math.random() < 0.5 ? -1 : 1) * (1 + t / 200);
  } else if (type === 'checker') {
    // A grid of blocks with two open cells.
    g = new THREE.Group();
    const xs = [-15, -9, -3, 3, 9, 15], top = b[1] + 2, bot = b[0] - 2, ch = (top - bot) / 3;
    const open = [(Math.random() * 18) | 0]; open.push(open[0] % 6 < 5 && Math.random() < 0.5 ? open[0] + 1 : (open[0] + 6) % 18);
    for (let r = 0; r < 3; r++) xs.forEach((x, c) => { if (!open.includes(r * 6 + c)) obPart(g, 5.6, ch - 0.4, x, bot + ch * (r + 0.5), col[0]); });
    o.gap = V3(xs[open[0] % 6], bot + ch * (Math.floor(open[0] / 6) + 0.5), 0);
  } else if (type === 'orbs') {
    // Spiky mines that bob up and down, spread out in depth.
    g = new THREE.Group(); o.mines = []; const n = 5 + Math.min(4, Math.floor(t / 30));
    for (let i = 0; i < n; i++) {
      const m = obSphere(g, 1.4, rnd(-15, 15), rnd(b[0] + 1, b[1] - 1), -i * (14 / n), col[0]);
      for (let k = 0; k < 6; k++) { const s = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.9, 6), MD.M(0x132044)); const d = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]][k]; s.position.set(d[0] * 1.5, d[1] * 1.5, d[2] * 1.5); s.lookAt(d[0] * 9, d[1] * 9, d[2] * 9); s.rotateX(Math.PI / 2); m.add(s); }
      m.userData.sphere = 1.75; m.userData.y0 = m.position.y; m.userData.ph = rnd(0, 6); o.mines.push(m);
    }
    o.zEnd = 17;
    o.upd = (ob, dt) => ob.mines.forEach(m => { m.position.y = clamp(m.userData.y0 + Math.sin(G.t * 2 + m.userData.ph) * 2.2, b[0], b[1]); m.rotation.y += dt * 2; });
  } else if (type === 'lasers') {
    // Two groups of beams that take turns switching on. The warning flicker shows which group is next.
    g = new THREE.Group(); o.beams = [];
    const ys = [b[0] + (b[1] - b[0]) * 0.3, b[0] + (b[1] - b[0]) * 0.7], xs = [rnd(-12, -4), rnd(4, 12)];
    ys.forEach(y => o.beams.push([0, y, WALL_W, 0.5, 0]));
    xs.forEach(x => o.beams.push([x, mid, 0.5, b[1] - b[0] + 12, 1]));
    o.beams = o.beams.map(([x, y, w, h, grp]) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.5), MD.glow(col[0], 0.95)); m.position.set(x, y, 0);
      m.userData.half = new THREE.Vector3(w / 2, h / 2, 0.25); m.userData.grp = grp; g.add(m); return m;
    });
    for (const x of [-17.5, 17.5]) obPart(g, 1.2, b[1] - b[0] + 14, x, mid, 0x132044);
    o.upd = ob => {
      const c = ((G.t + ob.ph) % 2.4) / 2.4, active = c < 0.5 ? 0 : 1, warn = (c > 0.38 && c < 0.5) || c > 0.88;
      ob.beams.forEach(m => { const on = m.userData.grp === active; m.userData.off = !on; m.material.opacity = on ? 0.95 : warn ? (Math.floor(G.t * 20) % 2 ? 0.5 : 0.1) : 0.08; });
    };
  } else if (type === 'crusher') {
    // Full-width blocks from above and below that open and close.
    g = new THREE.Group(); const H = 22, cy = clamp(gy, b[0] + 2, b[1] - 2), topB = new THREE.Group(), botB = new THREE.Group();
    obPart(topB, WALL_W, H, 0, 0, col[0], 3); obPart(botB, WALL_W, H, 0, 0, col[0], 3); g.add(topB); g.add(botB);
    o.upd = ob => { const open = 3.4 + (0.5 + 0.5 * Math.sin(G.t * 2.2 + ob.ph)) * 7; topB.position.y = cy + open / 2 + H / 2; botB.position.y = cy - open / 2 - H / 2; };
    o.upd(o); o.gap = V3(0, cy, 0);
  } else if (type === 'donut') {
    // A ring you have to fly through, set in a wall.
    const R = 4.2, tr = 0.8, cx = clamp(gx, -10, 10), cy = clamp(gy, b[0] + R, b[1] - R);
    g = gapWall(2 * (R + tr), 2 * (R + tr), cx, cy, col); g.remove(g.children[g.children.length - 1]);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R, tr, 12, 40), MD.M(col[1], { emissive: col[1], emissiveIntensity: 0.4 }));
    ring.position.set(cx, cy, 0); ring.userData.torus = { R, t: tr }; g.add(ring);
    // Rotated fillers close the square corners around the ring; their inner tips stop at the ring's centre line.
    const s = 3.4, cd = (R + s / Math.SQRT2) / Math.SQRT2;
    for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { const f = new THREE.Mesh(new THREE.BoxGeometry(s, s, OB_DEPTH), MD.M(col[0], { emissive: col[0], emissiveIntensity: 0.18 })); f.position.set(cx + sx * cd, cy + sy * cd, 0); f.rotation.z = Math.PI / 4; f.userData.half = new THREE.Vector3(s / 2, s / 2, OB_DEPTH / 2); g.add(f); }
    o.gap = V3(cx, cy, 0); o.ring = ring;
    o.upd = (ob, dt) => { ob.ring.rotation.z += dt; };
  } else if (type === 'swing') {
    // Two pendulum hammers swinging in opposite directions.
    g = new THREE.Group(); o.piv = [];
    const py = b[1] + 9, L = py - mid;
    for (const [x, s] of [[-7, 1], [7, -1]]) {
      const piv = new THREE.Group(); piv.position.set(x, py, 0); g.add(piv);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.5, L, 0.5), MD.M(0x132044)); arm.position.y = -L / 2; arm.userData.half = new THREE.Vector3(0.25, L / 2, 0.25); piv.add(arm);
      obPart(piv, 4.4, 3.2, 0, -L, col[0], 3.2);
      piv.userData.s = s; o.piv.push(piv);
    }
    o.upd = ob => ob.piv.forEach(p => { p.rotation.z = Math.sin(G.t * 1.9 + ob.ph) * 1.05 * p.userData.s; });
    o.upd(o);
  } else if (type === 'windmill') {
    // Dutch windmill: brick tower plus four turning sails. The sails, cap, hub and tower are all solid.
    g = new THREE.Group(); const hx = rnd(-5, 5), hy = clamp(mid + rnd(-1, 2), b[0] + 3, b[1] - 3), base = b[0] - 8;
    obBox(g, 4.4, hy + 2 - base, 4, hx, (hy + 2 + base) / 2, -3, 0x9a5b3c);
    obBox(g, 5.4, 1.4, 5, hx, hy + 2.7, -3, 0x3b2a20);
    for (let y = base + 3; y < hy; y += 3) deco(g, new THREE.BoxGeometry(4.5, 0.18, 4.1), MD.M(0x6b3d27), hx, y, -3);
    deco(g, new THREE.BoxGeometry(1.1, 1.6, 0.1), MD.M(0x1d1410), hx, hy - 3, -0.95);
    const hub = new THREE.Group(); hub.position.set(hx, hy, 0); g.add(hub);
    const cap = obSphere(hub, 1.2, 0, 0, 0, 0x3b2a20); cap.material = MD.M(0x3b2a20);
    for (let k = 0; k < 4; k++) {
      const arm = new THREE.Group(); arm.rotation.z = k * Math.PI / 2; hub.add(arm);
      obBox(arm, 15, 0.6, 0.6, 8, 0, 0, 0x5c3b28);
      obBox(arm, 11, 3.2, 0.3, 9.5, 1.95, 0, col[0]);
      for (let s = 0; s < 4; s++) deco(arm, new THREE.BoxGeometry(11, 0.12, 0.34), MD.M(0x5c3b28), 9.5, 0.6 + s * 0.9, 0);
    }
    o.hub = hub; o.spin = (0.8 + t / 250) * (Math.random() < 0.5 ? -1 : 1); o.zEnd = 9;
  } else if (type === 'asteroids') {
    // Tumbling rocks with glowing crystals. The sphere collider sits between the faces and the tips.
    g = new THREE.Group(); o.rocks = []; const n = 6 + Math.min(4, Math.floor(t / 40));
    for (let i = 0; i < n; i++) {
      const R = rnd(1.8, 3.2), m = new THREE.Mesh(new THREE.IcosahedronGeometry(R, 0), MD.M(i % 2 ? 0x6d5a4b : 0x857060, { roughness: 0.9 }));
      m.position.set(rnd(-15, 15), rnd(b[0] + 1, b[1] - 1), -i * (18 / n)); m.userData.sphere = R * 0.9;
      for (let k = 0; k < 3; k++) { const d = V3(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize(); deco(m, new THREE.OctahedronGeometry(R * 0.3, 0), MD.M(col[0], { emissive: col[0], emissiveIntensity: 0.8 }), d.x * R * 0.72, d.y * R * 0.72, d.z * R * 0.72); }
      m.userData.rv = V3(rnd(-1.5, 1.5), rnd(-1.5, 1.5), rnd(-1, 1)); m.userData.vx = rnd(-2, 2);
      g.add(m); o.rocks.push(m);
    }
    o.zEnd = 22;
    o.upd = (ob, dt) => ob.rocks.forEach(m => { const u = m.userData; m.rotation.x += u.rv.x * dt; m.rotation.y += u.rv.y * dt; m.rotation.z += u.rv.z * dt; m.position.x = clamp(m.position.x + u.vx * dt, -17, 17); });
  } else if (type === 'phones') {
    // Doomscroll: a row of giant phones scrolling up and down. Neighbours move in opposite directions.
    g = new THREE.Group(); o.phones = []; const span = b[1] - b[0], H = span * 0.8, A = span * 0.45;
    const tiles = [0xffd23f, 0x2f5bff, 0x2ec27e, 0xff5a1f, 0x9b5de5, 0x00b4d8];
    [-12.3, -4.1, 4.1, 12.3].forEach((x, i) => {
      const p = new THREE.Group(); p.position.set(x, mid, 0); g.add(p);
      obBox(p, 8.1, H, 0.9, 0, 0, 0, 0x15151f);
      deco(p, new THREE.BoxGeometry(7.1, H - 1.6, 0.06), MD.M(col[0], { emissive: col[0], emissiveIntensity: 0.55 }), 0, -0.1, 0.46);
      deco(p, new THREE.BoxGeometry(2.2, 0.35, 0.08), MD.M(0x15151f), 0, H / 2 - 0.55, 0.5);
      for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) deco(p, new THREE.BoxGeometry(1.3, 1.3, 0.08), MD.M(pick(tiles), { emissive: 0xffffff, emissiveIntensity: 0.12 }), -2.2 + c * 2.2, H / 2 - 2.6 - r * 2.2, 0.52);
      p.userData.ph = i % 2 ? Math.PI : 0; o.phones.push(p);
    });
    o.upd = ob => ob.phones.forEach(p => { p.position.y = mid + Math.sin(G.t * 1.6 + ob.ph + p.userData.ph) * A; });
    o.upd(o);
  } else if (type === 'serpent') {
    // Sky serpent slithering side to side, its body trailing back into the distance.
    g = new THREE.Group(); o.segs = []; const n = 12, cy = clamp(mid, b[0] + 4, b[1] - 4);
    for (let i = 0; i < n; i++) {
      const rad = i === 0 ? 1.7 : 1.4 - i * 0.04, s = new THREE.Mesh(new THREE.SphereGeometry(rad, 14, 10), MD.M(i % 2 ? col[0] : 0x1b5e20));
      s.userData.sphere = rad; g.add(s); o.segs.push(s);
      if (i) deco(s, new THREE.ConeGeometry(0.3, 0.8, 5), MD.M(0xffd23f), 0, rad + 0.2, 0);
    }
    const head = o.segs[0];
    for (const sx of [-0.7, 0.7]) {
      deco(head, new THREE.SphereGeometry(0.32, 8, 6), MD.glow(0xffd23f, 1), sx, 0.55, 1.4);
      const horn = deco(head, new THREE.ConeGeometry(0.28, 1.4, 5), MD.M(0xfff6e4), sx, 1.4, -0.4); horn.rotation.x = -0.6;
    }
    deco(head, new THREE.BoxGeometry(1.6, 0.18, 0.4), MD.M(0x5a0d0d), 0, -0.45, 1.5);
    o.zEnd = n * 1.7 + 3;
    o.upd = ob => ob.segs.forEach((s, i) => { const a = G.t * 2.2 + ob.ph - i * 0.5; s.position.set(Math.sin(a) * 13, cy + Math.sin(a * 0.5) * 3, -i * 1.7); if (!i) s.rotation.y = Math.cos(a) * 0.7; });
    o.upd(o);
  } else if (type === 'eye') {
    // Meta's all-seeing eye. It drifts toward you while it's far away, then locks in place and stares.
    g = new THREE.Group(); const eye = new THREE.Group(); eye.position.set(rnd(-8, 8), mid, 0); g.add(eye);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(4, 24, 18), MD.M(0xf4f1ea, { roughness: 0.3 })); ball.userData.sphere = 4; eye.add(ball);
    const look = new THREE.Group(); eye.add(look);
    const iris = deco(look, new THREE.CylinderGeometry(1.9, 1.9, 0.3, 24), MD.M(col[0], { emissive: col[0], emissiveIntensity: 0.5 }), 0, 0, 3.6); iris.rotation.x = Math.PI / 2;
    const pupil = deco(look, new THREE.CylinderGeometry(0.85, 0.85, 0.34, 20), MD.M(0x050510), 0, 0, 3.66); pupil.rotation.x = Math.PI / 2;
    for (let k = 0; k < 5; k++) { const v = deco(ball, new THREE.TorusGeometry(4.02, 0.04, 4, 20, 0.7), MD.M(0xc1121f), 0, 0, 0); v.rotation.set(rnd(0, 6), rnd(0, 6), 0); }
    const rim = new THREE.Mesh(new THREE.TorusGeometry(4.7, 0.5, 10, 36), MD.M(0x132044, { emissive: col[0], emissiveIntensity: 0.2 })); rim.userData.torus = { R: 4.7, t: 0.5 }; eye.add(rim);
    o.eye = eye; o.look = look; o.zEnd = 8; const lim = b;
    o.upd = (ob, dt) => {
      const e = ob.eye.position;
      if (ob.g.position.z < -60) { e.x = clamp(e.x + clamp(player.x - e.x, -1, 1) * dt * 5, -12, 12); e.y = clamp(e.y + clamp(player.y - e.y, -1, 1) * dt * 5, lim[0], lim[1]); }
      ob.look.lookAt(player.x, player.y, 0);
    };
  } else if (type === 'gate') {
    // Castle gate: two heavy doors that swing open and shut. Go through the middle when they're open wide.
    g = new THREE.Group(); const H = b[1] - b[0] + 14, hw = 10, side = WALL_W / 2 - hw - 3.4;
    for (const sx of [-1, 1]) {
      obPart(g, side, H, sx * (hw + 3.4 + side / 2), mid, 0x7a7f8c);
      obBox(g, 3.4, H, 3.4, sx * (hw + 1.7), mid, 0, 0x5f6470);
      for (let y = b[0]; y < b[1]; y += 5) deco(g, new THREE.BoxGeometry(0.5, 1.6, 0.1), MD.M(0x15151f), sx * (hw + 1.7), y, 1.75);
      const hinge = new THREE.Group(); hinge.position.set(sx * hw, mid, 0); g.add(hinge);
      obBox(hinge, hw, H, 0.8, -sx * hw / 2, 0, 0, col[0]);
      for (let y = -H / 2 + 2; y < H / 2; y += 4) deco(hinge, new THREE.BoxGeometry(hw, 0.35, 0.9), MD.M(0x2b2d33, { metalness: 0.6 }), -sx * hw / 2, y, 0);
      hinge.userData.s = -sx; (o.doors = o.doors || []).push(hinge);
    }
    o.upd = ob => { const a = 0.7 + (0.5 + 0.5 * Math.sin(G.t * 1.5 + ob.ph)) * 0.75; ob.doors.forEach(h => { h.rotation.y = a * h.userData.s; }); };
    o.upd(o); o.gap = V3(0, mid, 0);
  } else {
    // Two walls close together with gaps in different places: a quick zig-zag.
    g = new THREE.Group();
    const g1 = gapWall(gap * 1.2, gap, -8, gy, col), g2 = gapWall(gap * 1.2, gap, 8, clamp(gy + rnd(-4, 4), b[0] + gap / 2, b[1] - gap / 2), col);
    g2.position.z = -18; g.add(g1); g.add(g2); o.gap = V3(-8, gy, 0); o.zEnd = 21;
  }
  g.position.z = -340; actors.add(g); o.g = g;
  // A ring in the gap rewards threading it cleanly.
  if (o.gap && type !== 'donut' && Math.random() < 0.55) { const gold = Math.random() < 0.15, r = MD.makeRing(gold); r.position.set(o.gap.x, o.gap.y, -340 + 4); actors.add(r); G.pickups.push({ m: r, kind: gold ? 'gold' : 'silver' }); }
  if (type === 'donut' && Math.random() < 0.5) { const r = MD.makeRing(true); r.position.set(o.gap.x, o.gap.y, -340 + 4); actors.add(r); G.pickups.push({ m: r, kind: 'gold' }); }
  G.obs.push(o);
}
const obTmp = V3();
// Sphere (the ship) against each collider, measured in the collider's own space.
function obstacleHit(o, r, pos) {
  o.g.updateMatrixWorld(true);
  const pp = pos || V3(player.x, player.y, 0);
  let hit = false;
  o.g.traverse(m => {
    const u = m.userData;
    if (hit || !m.isMesh || u.off || !(u.half || u.sphere || u.torus)) return;
    obTmp.copy(pp); m.worldToLocal(obTmp);
    if (u.half) {
      const h = u.half, dx = Math.max(Math.abs(obTmp.x) - h.x, 0), dy = Math.max(Math.abs(obTmp.y) - h.y, 0), dz = Math.max(Math.abs(obTmp.z) - h.z, 0);
      hit = dx * dx + dy * dy + dz * dz < r * r;
    } else if (u.sphere) hit = obTmp.length() < u.sphere + r;
    else hit = Math.hypot(Math.hypot(obTmp.x, obTmp.y) - u.torus.R, obTmp.z) < u.torus.t + r;
  });
  return hit;
}
function crashPlayer() {
  const p = player; if (!p.alive) return;
  if (G.revive) { G.revive = false; p.inv = 2.5; G.obs.forEach(o => { if (o.g.position.z > -40) o.gone = true; }); flash(0.6); Sound.pickup(); fxTag('SECOND CHANCE!'); return; }
  p.shield = 0; p.alive = false; p.g.visible = false;
  explode(ppos(), 3.5); Sound.boom(3); Sound.hurt(); shake(2.2); flash(0.4); dmgV = 1;
  G.overT = G.t + 2.2; stat('downs');
  comm.q = []; say(pick(['josh', 'ati', 'robin', 'dean']), pick(['OOF. That wall came out of nowhere.', 'That\'s gonna leave a mark.', '*SOB* WHO PUT THAT THERE?!', 'Unlucky. Run it back.']));
}
function updateObstacles(dt) {
  const turbo = hasMod('turbo') ? 1.25 : 1;
  G.runSpeed = Math.min(160, 60 + G.t * 0.85) * turbo;
  if (player.alive) {
    G.dist += W.scroll * dt * 0.1;
    G.score = Math.round((Math.floor(G.dist) * 10 + G.bonus) * (G.scoreMul || 1));
  }
  // New zone every 600 m: pause spawning, then switch world once the course is clear.
  if (G.dist >= G.nextZone && !G.zonePending) { G.zonePending = true; fxTag('ZONE CLEAR · NEW WORLD AHEAD'); }
  if (G.zonePending && !G.obs.length) {
    G.zonePending = false; G.nextZone += 600; G.envRot++;
    setEnv(STAGE_ENV[G.envRot % STAGE_ENV.length]); Sound.pickup(); flash(0.25);
    card(`ZONE ${G.envRot + 1}`, STAGES[G.envRot % STAGES.length], `${Math.floor(G.dist)} m`);
    G.obsT = 2;
  }
  if (!G.zonePending && player.alive && (G.obsT -= dt) <= 0) {
    spawnObstacle();
    G.obsT = Math.max(32, 75 - G.t * 0.35) / G.runSpeed * (1 + Math.random() * 0.4);
  }
  const r = PL.stats.hit * 0.62;
  for (const o of G.obs) {
    o.g.position.z += W.scroll * dt;
    if (o.hub) o.hub.rotation.z += o.spin * dt;
    if (o.slide) o.g.position.x = Math.sin(G.t * 1.3 + o.ph) * o.slide;
    if (o.upd) o.upd(o, dt);
    const z = o.g.position.z;
    if (player.alive && z > -20 && z < o.zEnd && obstacleHit(o, r)) crashPlayer();
    if (z > o.zEnd && !o.passed) { o.passed = true; G.gates++; G.bonus += 50; if (G.gates % 10 === 0) fxTag(`${G.gates} GATES!`); }
    if (z > 40) o.gone = true;
  }
  G.obs = G.obs.filter(o => { if (o.gone) actors.remove(o.g); return !o.gone; });
}


/* ---------- Niffo's shop: shells, boosts and trails ---------- */
// One shell per 250 points, paid out at the end of every stage or run.
function awardShells(score) {
  const n = Math.max(0, Math.floor(score / 250));
  P.shells = (P.shells || 0) + n; persist(); return n;
}
// Armed boosts are used up at the start of the next stage or run.
function applyBoosts() {
  const a = P.armed || {}, used = []; G.revive = false;
  if (a.plating && player.max > 1) { player.max += 40; player.shield += 40; used.push('EXTRA PLATING'); }
  if (a.double) { player.power = Math.max(player.power, 2); used.push('DOUBLE SHOT'); }
  if (a.charged) { player.sp = 100; used.push('FULL SPECIAL'); }
  if (a.revive) { G.revive = true; used.push('SECOND CHANCE'); }
  if (used.length) { P.armed = {}; persist(); later(1.4, () => fxTag('BOOSTS: ' + used.join(' · '))); }
}
let trailT = 0;
const TRAIL_GEO = new THREE.SphereGeometry(0.32, 8, 6), TRAIL_MAT = {};
function emitTrail(dt, pos) {
  const it = P.trail && SHOP_BY[P.trail]; if (!it || mode !== 'play') return;
  if ((trailT -= dt) > 0) return; trailT = 0.035;
  const col = it.col[(Math.random() * it.col.length) | 0];
  const m = new THREE.Mesh(TRAIL_GEO, TRAIL_MAT[col] || (TRAIL_MAT[col] = MD.glow(col, 0.75)));
  m.position.copy(pos).add(V3(rnd(-0.3, 0.3), rnd(-0.6, 0), 1.2)); actors.add(m);
  G.fxo.push({ m, life: 0.6, max: 0.6, upd: (o, d) => { if (!G.arena) o.m.position.z += W.scroll * d; o.m.scale.setScalar(0.2 + o.life / o.max); } });
}
function openShop() { renderShop(pick(NIFFO_LINES)); showScreen('shop'); }
function renderShop(line) {
  $('shoppf').innerHTML = PORTRAITS.niffo; $('shopline').textContent = line; $('shells').textContent = `🐚 ${(P.shells || 0).toLocaleString()}`;
  const deal = dealOfDay(), owned = P.owned || [], armed = P.armed || {};
  const sec = (title, kind) => `<div class="shopsec">${title}</div><div class="row">` + SHOP.filter(i => i.kind === kind).map(i => {
    const own = owned.includes(i.id), on = kind === 'hat' ? P.hat === i.id : kind === 'trail' ? P.trail === i.id : !!armed[i.id], pr = priceOf(i.id);
    const tag = kind === 'boost' ? (on ? 'PACKED FOR YOUR NEXT RUN' : `${pr} 🐚`)
      : own ? (on ? 'WEARING · CLICK TO TAKE OFF' : 'OWNED · CLICK TO WEAR')
      : deal === i.id ? `<s>${i.price}</s> ${pr} 🐚 · TODAY'S DEAL` : `${pr} 🐚`;
    return `<button class="item${own ? ' owned' : ''}${on ? ' on' : ''}${deal === i.id && !own ? ' deal' : ''}" data-id="${i.id}"><div class="ic">${i.icon}</div><div><b>${i.name}</b><p>${i.desc}</p><em>${tag}</em></div></button>`;
  }).join('') + '</div>';
  $('shopgrid').innerHTML = sec('HATS · EVERY FIGHTER WEARS IT', 'hat') + sec('TRAILS', 'trail') + sec('BOOSTS · USED UP ON YOUR NEXT STAGE OR RUN', 'boost');
  $('shopgrid').querySelectorAll('.item').forEach(el => el.onclick = () => { Sound.init(); buyItem(el.dataset.id); });
}
function buyItem(id) {
  const it = SHOP_BY[id], fi = focusIdx; P.owned = P.owned || []; P.armed = P.armed || {};
  const done = line => { persist(); renderShop(line); markFocus(fi); refreshExtras(); };
  if (it.kind !== 'boost' && P.owned.includes(id)) {
    const k = it.kind === 'hat' ? 'hat' : 'trail'; P[k] = P[k] === id ? null : id; Sound.blip();
    return done(P[k] === id ? 'Looks good on you. Mostly.' : 'Taken off. Still yours. No refunds.');
  }
  if (it.kind === 'boost' && P.armed[id]) return done('Already packed for your next run.');
  const pr = priceOf(id);
  if ((P.shells || 0) < pr) { Sound.hurt(); return done(pick(NIFFO_BROKE)); }
  P.shells -= pr; stat('purchases'); Sound.pickup();
  if (it.kind === 'boost') P.armed[id] = true; else { P.owned.push(id); P[it.kind === 'hat' ? 'hat' : 'trail'] = id; }
  done(pick(NIFFO_BUY));
}
function refreshExtras() {
  $('shopsub').textContent = `🐚 ${(P.shells || 0).toLocaleString()} shells · today's deal: ${SHOP_BY[dealOfDay()].name}`;
  $('sidesub').textContent = `${Object.keys(P.sides || {}).length} / ${ROSTER.length} finished · one extra mission for every fighter`;
}

/* ---------- Secret routes: gates, hidden stages and the true ending ---------- */
let pendingSecret = null;
const MID_CINE = ['mid1', 'mid2', 'mid3', 'mid4', 'mid5', 'ending'];
function spawnGate(k) {
  if (G.mode !== 'story' || G.secret !== null || !G.flags || G.flags.gate) return;
  G.flags.gate = true;
  const g = new THREE.Group();
  [[6, 0.45, 0x9b5de5], [5.1, 0.28, 0xffd23f], [4.3, 0.2, 0xff4fd8]].forEach(([r, t, c]) => g.add(new THREE.Mesh(new THREE.TorusGeometry(r, t, 8, 40), MD.glow(c, 0.9))));
  g.add(new THREE.Mesh(new THREE.CircleGeometry(4.2, 32), MD.glow(0x7b5cff, 0.25)));
  const s = symbolSprite('★', '#ffd23f', 2.6); s.position.y = 7.6; g.add(s);
  const b = bounds(); g.position.set(rnd(-8, 8), (b[0] + b[1]) / 2 + 1, -330); actors.add(g);
  G.pickups.push({ m: g, kind: 'gate', k });
  Sound.alarm(); say('josh', 'Whoa, my scanner just found a hidden gate! Fly through it!');
}
function takeGate(k) {
  G.gateTaken = true; G.gateK = k; flash(0.5); shake(0.6); Sound.nova();
  fxTag('SECRET ROUTE OPEN!'); say('josh', `We're in! After this fight we take the secret route: ${SECRETS[k].name}.`);
}
// Runs after the stage-clear card: secret route, then the normal cutscene and next stage.
function afterStage() {
  const s = G.stage;
  if (G.secret === null && G.gateTaken) return startSecret(G.gateK);
  if (s === STAGES.length - 1) return playCine(G.trueEnd ? 'trueEnding' : 'ending', showEnd);
  playCine(MID_CINE[s], () => startStage(s + 1));
}
function startSecret(k) {
  const sc = SECRETS[k];
  ['over', 'end', 'home', 'pause', 'select', 'stages'].forEach(id => $(id).classList.add('hidden'));
  clearActors(); setEnv(sc.env);
  Object.assign(G, { mode: 'story', daily: null, hpMul: 1.15, mods: [], scoreMul: 1, dmgTaken: 0, spawned: 0, kills: 0, tokensGot: 0, stage: sc.after, t: 0, ei: 0, clearT: -1, outroT: -1, overT: -1, metaT: rnd(18, 26), metaMute: 0,
    secret: k, gateTaken: false, flags: { gate: true }, ringsSpawned: 0, ringsGot: 0, arena: false, trueEnd: false });
  G.start = { score: G.score, hits: G.hits, power: player.power };
  resetPlayer(); applyBoosts(); setupP2(); $('trio').classList.add('hidden'); mode = 'play'; comm.q = []; hideComm();
  if (k === 2) startArena(true);
  G.ev = buildSecret(k);
  P.secrets = P.secrets || {}; if (!P.secrets[k]) { P.secrets[k] = 1; persist(); checkAll(); }
  G.routeRun = G.routeRun || []; if (!G.routeRun.includes(k)) G.routeRun.push(k);
  $('hud').classList.remove('hidden');
  $('stagename').textContent = `SECRET ROUTE · ${sc.name}`;
  card('SECRET ROUTE', sc.name, `${PL.nm.toUpperCase()} · ${G.arena ? 'ALL-RANGE MODE' : PL.title}`);
  cam.position.set(0, player.y * 0.6 + 2.6, 14); G.look.set(0, player.y, -40);
  Sound.music('stage');
}
function buildSecret(k) {
  const ev = [], at = (t, fn) => ev.push({ t, fn }), sayAt = (t, w, s) => at(t, () => say(w, s));
  const row = (t, path, n, gap, fx, fy, o) => { for (let j = 0; j < n; j++) at(t + j * gap, () => fighter(path, fx(j), fy(j), o)); };
  const b = W.env.bounds, mid = (b[0] + b[1]) / 2;
  SECRETS[k].open.forEach((l, j) => sayAt(0.5 + j * 0.1, ...l));
  if (k === 0) {
    for (let j = 0; j < 30; j++) at(3 + j * 0.7, () => asteroid(rnd(-15, 15), rnd(b[0], b[1]), rnd(1.4, 3.6)));
    row(6, 'swoop', 6, 0.4, j => (j - 2.5) * 4, j => mid + (j % 2 ? 2 : -2));
    sayAt(9, 'fionn', 'Gold veins in the walls! Grab those rings, they\'re pure gold!');
    for (let j = 0; j < 5; j++) at(10 + j * 1.6, () => spawnRing(rnd(-10, 10), rnd(b[0] + 1, b[1] - 1), j === 4));
    row(16, 'hold', 4, 0.5, j => -9 + j * 6, () => mid);
    row(22, 'behind', 4, 0.4, j => -9 + j * 6, () => mid);
    at(26, () => spawnPickup('power', V3(0, mid, -330)));
    for (let j = 0; j < 20; j++) at(28 + j * 0.45, () => asteroid(rnd(-15, 15), rnd(b[0], b[1]), rnd(1.2, 3.2)));
    row(31, 'dive', 6, 0.4, j => -10 + j * 4, () => mid);
    sayAt(38, 'lars', 'Hear that grinding? That\'s a Meta drill. In MY mine.');
    at(41, () => spawnBigShip({ name: 'THE META DRILL', phase: 'DIGGING WITHOUT PERMISSION', hp: 80, scale: 1.6,
      half: [['lars', 'It\'s cracking! Hit it again!']], line: [['lars', 'Drill\'s down. My mine is my mine again.'], ['robin', '*sniff* Can we go back to the normal route now?']] }));
  } else if (k === 1) {
    sayAt(4, 'josh', 'Those red walls are firewalls. Fly through the gaps, don\'t touch them!');
    for (let j = 0; j < 9; j++) at(5 + j * 3.6, firewall);
    row(7, 'swoop', 6, 0.4, j => (j - 2.5) * 4, j => mid + (j % 2 ? 2 : -2));
    for (let j = 0; j < 10; j++) at(9 + j * 1.3, () => adBlock(rnd(-14, 14), rnd(b[0], b[1])));
    row(15, 'cross', 5, 0.4, () => 0, j => mid - 3 + j * 1.5, { side: 1 });
    at(18, () => spawnRing(0, mid)); at(26, () => spawnRing(0, mid, true));
    row(22, 'hold', 4, 0.5, j => -9 + j * 6, () => mid);
    at(28, () => spawnPickup('special', V3(0, mid, -330)));
    row(31, 'behind', 4, 0.4, j => -9 + j * 6, () => mid);
    sayAt(38, 'meta', 'You found my server farm?! That\'s... that\'s PRIVATE! 😠');
    at(42, () => spawnDuelist({ name: 'META AI · ROOT SERVER', phase: 'FIREWALL MODE', hp: 110, scale: 3.6, rings: 3.2, summon: firewall,
      half: [['meta', 'Stop unplugging things!'], ['enno', 'Statistically, that was the important one.']],
      death: [['meta', 'Server farm... going... offline...'], ['josh', 'Back door\'s still open. Let\'s get back on route!']] }));
  } else {
    at(3, () => { for (let j = 0; j < 5; j++) arenaFighter(true); });
    at(7, () => arenaRings(6));
    sayAt(9, 'josh', 'No rails in here! Turn with A and D, and watch the radar in the corner.');
    at(16, () => { for (let j = 0; j < 6; j++) arenaFighter(j % 2 === 0); });
    at(22, () => arenaPickup('power'));
    at(28, () => { for (let j = 0; j < 7; j++) arenaFighter(j % 2 === 0); arenaRings(4); });
    at(40, () => { Sound.alarm(); say('evil_adam', 'Round two. No rails. No rules.'); say(PL.id === 'adam' ? 'LEAD' : 'adam', 'He\'s circling us! Turn and burn!'); });
    at(42, () => arenaAce({ id: 'evil_adam', name: 'EVIL ADAM', phase: 'NO RAILS · NO RULES', hp: 120, summon: true,
      half: [['evil_adam', 'You turn like a shopping trolley.'], ['marloes', 'Stay on him! He\'s slowing down!']],
      onDeath: () => { stat('evilAdam'); say('evil_adam', 'Fine. FINE. Keep your shiny rocks.'); say('marloes', 'They\'re crystals. Now leave.'); G.clearT = G.t + 4; } }));
  }
  return ev.sort((a, c) => a.t - c.t);
}
// Server Farm hazard: a red wall with a gap. Touching it hurts but doesn't end your run.
function firewall() {
  const b = bounds(), gap = 8, gx = rnd(-10, 10), gy = rnd(b[0] + gap / 2, b[1] - gap / 2);
  const g = gapWall(gap * 1.25, gap, gx, gy, [0xff1f3d, 0xffd23f]); g.position.z = -340;
  addEnemy({ kind: 'wall', m: g, hp: 1, r: 0, hittable: false, score: 0, upd: (e, dt) => {
    g.position.z += W.scroll * dt; e.p.set(0, -999, 0);
    if (!e.hit && player.alive && g.position.z > -2 && g.position.z < 3 && obstacleHit({ g }, PL.stats.hit * 0.62)) { e.hit = true; damagePlayer(25); fxTag('FIREWALL!'); }
    if (p2.on && p2.alive && g.position.z > -2 && g.position.z < 3 && obstacleHit({ g }, p2.c.stats.hit * 0.62, p2.pos)) damageP2(25);
    if (g.position.z > 40) e.gone = true;
  } });
}
// A gunship-style boss with any name, used by secret routes and side stories.
function spawnBigShip(o) {
  Sound.music('boss'); Sound.alarm(); setBoss(o.name, o.phase || '');
  const sc = o.scale || 1.5, mid = midY(), m = MD.makeGunship(); m.scale.setScalar(sc); m.position.set(0, mid, -330);
  G.bossE = addEnemy({ kind: 'gunship', m, hp: o.hp || 70, r: 4.3 * sc, score: 5000, boom: 4, required: true, spawnCd: 5, upd: (e, dt) => {
    const a = e.age;
    m.position.z += (-64 - m.position.z) * dt * 0.8; m.position.x = Math.sin(a * 0.5) * 10; m.position.y = mid + Math.sin(a * 0.8) * 3.5;
    m.rotation.z = Math.cos(a * 0.5) * 0.3; e.p.copy(m.position);
    e.fireCd -= dt; if (e.fireCd <= 0 && m.position.z > -120) { e.fireCd = 1.6; [-0.24, -0.08, 0.08, 0.24].forEach(s => enemyShot(e.p.clone().add(V3(0, 0, 6)), 52, s)); }
    e.spawnCd -= dt; if (e.spawnCd <= 0) { e.spawnCd = 7; fighter('swoop', -8, mid); fighter('swoop', 8, mid); }
    if (!e.half && e.hp < e.maxhp / 2) { e.half = true; (o.half || []).forEach(l => say(...l)); }
  }, onDeath: () => { $('bossbar').classList.add('hidden'); (o.line || []).forEach(l => say(...l)); G.clearT = G.t + 4; } });
}
function secretClear() {
  G.outroT = G.t + 4; player.inv = 99;
  stat('secretClears'); if (p2.on) stat('coopClears'); bestRun();
  const sh = awardShells(G.score - G.start.score) + 100; P.shells += 100;
  G.bullets.forEach(b => actors.remove(b.m)); G.bullets = [];
  card('SECRET ROUTE CLEAR', SECRETS[G.secret].name, `SCORE ${G.score} · +${sh} 🐚 · SECRET ROUTES THIS RUN ${G.routeRun.length}/3`);
  if (G.routeRun.length === 3) later(1.5, () => say('josh', 'That\'s all three back doors! Meta AI has nowhere left to hide.'));
  checkAll(); persist(); Sound.music(null); Sound.pickup();
}
// The true final boss, only after all three secret routes in one run.
function spawnRootAccess() {
  if (G.overT > 0 || !player.alive) return;
  say('meta', 'You found all three of my back doors. Nobody finds all three.'); say('meta', 'ROOT ACCESS GRANTED. To me. 😈');
  say('josh', 'This is its real core! Everything we\'ve got, squad!');
  player.sp = 100; player.shield = Math.min(player.max, player.shield + 50); Sound.alarm(); flash(0.6);
  spawnDuelist({ name: 'META AI · ROOT ACCESS', phase: 'THE TRUE FINAL BOSS', hp: 220, r: 7.2, score: 60000, boom: 7, hold: -72, speed: 14, jink: 12, burst: 7, fireGap: 1.3, rings: 2.8, ads: true,
    make: () => { const c = glitchify(makeCharacter('meta')); c.scale.setScalar(8); return c; },
    summon: () => { cloneMinion('swoop', -8, player.y); cloneMinion('swoop', 8, player.y); if (Math.random() < 0.5) spawnRing(rnd(-8, 8), rnd(0, 10)); },
    half: [['evil_adam', 'Need a hand, losers? Just this once.'], ['adam', '...Fine. Just this once.']],
    onDeath: e => {
      for (let i = 0; i < 12; i++) later(i * 0.15, () => { explode(e.p.clone().add(V3(rnd(-10, 10), rnd(-8, 8), rnd(-4, 4))), 4); shake(1.2); Sound.boom(2); });
      G.trueEnd = true; G.clearT = G.t + 3.5;
    } });
}
function renderRoute() {
  const found = P.secrets || {}, out = [];
  STAGES.forEach((s, i) => {
    out.push(`<span class="nd">${i + 1} ${s}</span>`);
    const k = SECRETS.findIndex(x => x.after === i);
    if (k >= 0) out.push(`<span class="ar">⤳</span><span class="nd sec${found[k] ? ' found' : ''}">${found[k] ? '★ ' + SECRETS[k].name : '???'}</span>`);
    if (i < STAGES.length - 1) out.push('<span class="ar">→</span>');
  });
  const hints = SECRETS.map((s, k) => found[k] ? `★ ${s.name}: ${s.desc}` : `??? ${s.hint}`).join('<br>');
  $('routemap').innerHTML = out.join('') + `<small>${hints}<br><b>True ending:</b> take all three secret routes in one run, starting from Story Mode.</small>`;
  $('stagecards').insertAdjacentHTML('beforeend', SECRETS.map((s, k) => found[k] ? `<button class="scard sec" data-k="${k}"><div class="art" style="background:${s.art}"><b>★</b></div><div class="txt"><h3>${s.name}</h3><p>${s.desc}</p></div></button>` : '').join(''));
  $('stagecards').querySelectorAll('.scard.sec').forEach(el => el.onclick = () => {
    const k = +el.dataset.k; toSelect(SECRETS[k].after); pendingStage = null; pendingSecret = k; $('selmode').textContent = `SECRET ROUTE · ${SECRETS[k].name}`;
  });
}

/* ---------- Arena: all-range mode ---------- */
// The player stays at the centre of the screen; when they turn, everything else turns around them.
const AR_R = 230, _t = V3();
function startArena(story) {
  G.arena = true; G.arenaC = new THREE.Object3D(); actors.add(G.arenaC);
  Object.assign(G, { wave: 0, waveT: 2, bossActive: false, turnWarn: -9 });
  const b = bounds();
  for (let i = 0; i < 26; i++) {
    const s = rnd(3, 9), m = new THREE.Mesh(new THREE.OctahedronGeometry(s, 0), MD.M(i % 3 ? 0xd9c8ff : 0xb388ff, { metalness: 0.5, roughness: 0.2, emissive: 0x7b5cff, emissiveIntensity: 0.25 }));
    const an = rnd(0, Math.PI * 2), d = rnd(50, AR_R);
    m.scale.y = rnd(1.5, 3); m.position.set(Math.sin(an) * d, rnd(b[0] - 14, b[1] + 10), -Math.cos(an) * d - 40); actors.add(m);
  }
  if (!story) say('josh', 'All-range mode! A and D to turn, W and S to climb. The radar shows where they are.');
}
function arenaWarp(dt) {
  const p = player, cp = G.arenaC.position, dist = Math.hypot(cp.x, cp.z);
  // Past the edge of the arena the ship turns itself back towards the middle.
  if (dist > AR_R) {
    p.turn = clamp(Math.atan2(cp.x, -cp.z) * 2, -1.6, 1.6);
    if (T - G.turnWarn > 3) { G.turnWarn = T; fxTag('TURN BACK!'); }
  }
  const a = (p.turn || 0) * dt, s = W.scroll * dt, c = Math.cos(a), sn = Math.sin(a);
  const rot = v => { const x = v.x * c + v.z * sn, z = -v.x * sn + v.z * c; v.x = x; v.z = z; };
  for (const o of actors.children) { rot(o.position); o.position.z += s; o.rotation.y += a; }
  for (const sh of G.shots) rot(sh.v);
  for (const bl of G.bullets) rot(bl.v);
  for (const e of G.enemies) if (e.v) rot(e.v);
  turnWorld(a);
}
function arenaSpot(dmin, dmax) { const an = rnd(0, Math.PI * 2), d = rnd(dmin, dmax), b = bounds(); return V3(Math.sin(an) * d, rnd(b[0] + 1, b[1] - 1), -Math.cos(an) * d); }
function arenaFighter(glitch) {
  const m = glitch ? glitchify(makeCharacter(pick(ROSTER.map(c => c.id).filter(i => i !== PL.id)))) : MD.makeFighter(...stageCols());
  if (glitch) m.scale.multiplyScalar(1.2);
  m.position.copy(arenaSpot(130, 200));
  return addEnemy({ kind: 'fighter', m, hp: glitch ? 4 : 3, r: 2.4, score: 250, v: V3(), ph: rnd(0, 6), glitch, upd: updArenaFighter });
}
function updArenaFighter(e, dt) {
  const m = e.m, b = bounds(), pp = ppos(), a = e.age, orbit = Math.floor((a + e.ph) / 6) % 2 === 0;
  // Circle the player for a while, then make a strafing run at them.
  if (orbit) { const an = a * 0.5 + e.ph, rr = 45 + Math.sin(a * 0.7 + e.ph) * 15; _t.set(Math.sin(an) * rr, clamp(pp.y + Math.sin(a + e.ph) * 6, b[0], b[1]), -Math.cos(an) * rr - 20); }
  else _t.copy(pp).add(V3(Math.sin(e.ph) * 6, 2, -10));
  _t.sub(m.position); if (_t.lengthSq() > 1) _t.normalize().multiplyScalar(orbit ? 46 : 60);
  e.v.lerp(_t, Math.min(1, dt * 1.6));
  m.position.addScaledVector(e.v, dt);
  m.lookAt(m.position.clone().add(e.v)); if (e.glitch) { m.rotateY(Math.PI); animateCharacter(m, T, dt, 1.4); }
  e.p.copy(m.position);
  if ((e.fireCd -= dt) <= 0) { e.fireCd = rnd(1.6, 2.8); if (m.position.length() < 140) enemyShot(e.p.clone(), 58); }
}
function arenaRings(n) {
  for (let i = 0; i < n; i++) { const gold = Math.random() < 0.2, r = MD.makeRing(gold); r.position.copy(arenaSpot(40, 150)); actors.add(r); G.pickups.push({ m: r, kind: gold ? 'gold' : 'silver' }); G.ringsSpawned = (G.ringsSpawned || 0) + 1; }
}
function arenaPickup(kind) { spawnPickup(kind, arenaSpot(40, 120)); }
// Dogfight boss: circles you, then dives straight at you.
function arenaAce(o) {
  Sound.music('boss'); setBoss(o.name, o.phase);
  const m = makeCharacter(o.id); if (o.glitch) glitchify(m); m.scale.multiplyScalar(o.scale || 2.4);
  const b = bounds(); m.position.set(0, (b[0] + b[1]) / 2 + 6, -180);
  let half = false, ringCd = 4;
  G.bossE = addEnemy({ kind: 'ace', m, hp: o.hp || 100, r: 3.6 * (o.scale || 2.4) / 2.4, score: o.score || 9000, boom: 3, required: true, v: V3(0, 0, 40), upd: (e, dt) => {
    const a = e.age, pp = ppos(), cyc = a % 10;
    animateCharacter(m, T, dt, 1.6);
    if (cyc < 6.5) { const an = a * 0.9; _t.set(Math.sin(an) * 38, clamp(pp.y + 4 + Math.sin(a * 1.3) * 5, b[0], b[1] + 4), -Math.cos(an) * 38); }
    else _t.copy(pp).add(V3(0, 1, -6));
    _t.sub(m.position); if (_t.lengthSq() > 1) _t.normalize().multiplyScalar(cyc < 6.5 ? 52 : 75);
    e.v.lerp(_t, Math.min(1, dt * 2.2)); m.position.addScaledVector(e.v, dt);
    m.lookAt(m.position.clone().add(e.v)); m.rotateY(Math.PI);
    e.p.copy(m.position);
    if ((e.fireCd -= dt) <= 0) { e.fireCd = 1.1; for (let i = -1; i <= 1; i++) enemyShot(e.p.clone(), 58, i * 0.12, ppos()); }
    if ((ringCd -= dt) <= 0) { ringCd = 5; for (let i = 0; i < 12; i++) { const an = i / 12 * Math.PI * 2; enemyShot(e.p.clone(), 36, 0, e.p.clone().add(V3(Math.cos(an) * 20, Math.sin(an) * 8, Math.sin(an + 1) * 20))); } }
    if (o.summon && (e.sm = (e.sm ?? 8) - dt) <= 0) { e.sm = 10; arenaFighter(true); arenaFighter(false); }
    if (!half && e.hp < e.maxhp / 2) { half = true; (o.half || []).forEach(l => say(...l)); }
  }, onDeath: e => { $('bossbar').classList.add('hidden'); explode(e.p.clone(), 3); shake(1); if (o.onDeath) o.onDeath(e); else G.clearT = G.t + 4; } });
}
const ARENA_BOSSES = [
  () => arenaAce({ id: 'evil_adam', name: 'EVIL ADAM', phase: 'NO RAILS · NO RULES', hp: 110, summon: true, half: [['evil_adam', 'Dizzy yet?'], ['josh', 'Keep turning! Don\'t let him get behind you!']] }),
  () => arenaAce({ id: 'meta', name: 'META AI · ALL-RANGE', phase: 'SURROUND SOUND', hp: 130, scale: 3, summon: true, half: [['meta', 'I\'m behind you! And in front! I\'m everywhere! 😊'], ['ati', 'Nobody asked.']] }),
  () => arenaAce({ id: PL.id, glitch: true, name: `META ${PL.nm.toUpperCase()}`, phase: 'COPIES YOUR TURNS', hp: 125, summon: true }),
];
function updateArenaMode(dt) {
  if (G.done || !player.alive || G.bossActive || (G.waveT -= dt) > 0) return;
  if (G.enemies.filter(e => !e.dead).length > 3 + G.wave) return;
  G.wave++; G.hpMul = 1 + G.wave * 0.06;
  if (G.wave % 4 === 0) {
    G.bossActive = true; Sound.alarm(); card(`WAVE ${G.wave}`, 'DOGFIGHT', 'BOSS INCOMING');
    later(2, ARENA_BOSSES[(G.wave / 4 - 1) % ARENA_BOSSES.length]); return;
  }
  const n = 3 + Math.floor(G.wave * 1.3);
  for (let j = 0; j < n; j++) later(j * 0.5, () => arenaFighter(G.wave > 2 && j % 3 === 0));
  if (G.wave % 2 === 0) arenaRings(4);
  if (G.wave % 3 === 0) arenaPickup(G.wave % 6 === 0 ? 'special' : 'power');
  if (G.wave > 1) fxTag(`WAVE ${G.wave}`);
  G.waveT = 4;
}
function arenaBossDown() {
  G.bossActive = false; G.bossE = null; const bonus = 1500 * G.wave / 4; G.score += bonus;
  player.shield = Math.min(player.max, player.shield + 35);
  card(`WAVE ${G.wave} CLEAR`, 'BOSS DOWN', `+${bonus.toLocaleString()}`); Sound.music('stage'); Sound.pickup(); G.waveT = 4;
}
const radarCtx = $('radar').getContext('2d');
function drawRadar() {
  const el = $('radar');
  if (!G.arena || mode !== 'play') { if (!el.classList.contains('hidden')) el.classList.add('hidden'); return; }
  el.classList.remove('hidden');
  const g = radarCtx, c = 75, sc = 75 / 240;
  g.clearRect(0, 0, 150, 150);
  g.strokeStyle = 'rgba(255,246,228,.22)'; g.lineWidth = 1; [25, 50, 72].forEach(r => { g.beginPath(); g.arc(c, c, r, 0, 7); g.stroke(); });
  const ac = G.arenaC.position; g.strokeStyle = 'rgba(179,136,255,.9)'; g.lineWidth = 2; g.beginPath(); g.arc(c + ac.x * sc, c + ac.z * sc, AR_R * sc, 0, 7); g.stroke();
  const dot = (p, col, r) => { let x = p.x * sc, y = p.z * sc; const d = Math.hypot(x, y); if (d > 70) { x *= 70 / d; y *= 70 / d; } g.fillStyle = col; g.beginPath(); g.arc(c + x, c + y, r, 0, 7); g.fill(); };
  for (const it of G.pickups) dot(it.m.position, it.kind === 'gold' || it.kind === 'silver' ? '#ffd23f' : '#48cae4', 2);
  for (const e of G.enemies) if (!e.dead && e.m && e.kind !== 'wall') dot(e.m.position, e.kind === 'ace' ? '#ff3d7f' : '#ff5a1f', e.kind === 'ace' ? 5 : 3);
  if (p2.on && p2.alive) dot(p2.pos, '#2ec27e', 3);
  g.fillStyle = '#fff6e4'; g.beginPath(); g.moveTo(c, c - 7); g.lineTo(c + 5, c + 5); g.lineTo(c - 5, c + 5); g.fill();
}

/* ---------- Two players, one keyboard ---------- */
// Player 2 flies as a wingman: arrows to move, Enter or . to fire, / for a special, Right Shift to roll.
const P2_FIRE = ['Enter', 'NumpadEnter', 'Period', 'Numpad0'], P2_SPEC = ['Slash', 'Numpad1'], P2_ROLL = ['ShiftRight', 'Numpad3'];
const P2_KEYS = [...P2_FIRE, ...P2_SPEC, ...P2_ROLL];
const p2 = { want: false, on: false, picking: false, c: null, g: null, pos: V3(), vx: 0, vy: 0, shield: 100, max: 100, sp: 30, alive: true, inv: 0, rollT: 0, rollDir: 1, rollCd: 0, respawn: 0, holding: false, cd: 0 };
function toggleCoop() {
  p2.want = !p2.want; Sound.blip(); refreshCoopBtn(false);
  if (!p2.want && p2.picking) { p2.picking = false; selIdx = ROSTER.indexOf(PL); choose(selIdx); setSelText(); }
}
function refreshCoopBtn(reset = true) {
  $('coopbtn').textContent = `👥 2 PLAYERS: ${p2.want ? 'ON' : 'OFF'} · PRESS 2`; $('coopbtn').classList.toggle('on', p2.want);
  if (reset) delete $('selmode').dataset.p2;
}
function setSelText() {
  const el = $('selmode');
  if (p2.picking) { if (!el.dataset.p2) { el.dataset.base = el.textContent; el.dataset.p2 = '1'; } el.textContent = `PLAYER 2 · PICK YOUR WINGMAN · PLAYER 1 IS ${PL.nm.toUpperCase()}`; }
  else if (el.dataset.p2) { el.textContent = el.dataset.base; delete el.dataset.p2; }
}
function setupP2() {
  if (!p2.c || !p2.want) return p2Off();
  if (!p2.g || p2.g.userData.cid !== p2.c.id) { if (p2.g) scene.remove(p2.g); p2.g = applySkin(makeCharacter(p2.c.id), p2.c.id); p2.g.userData.cid = p2.c.id; scene.add(p2.g); }
  Object.assign(p2, { on: true, alive: true, max: p2.c.stats.shield, shield: p2.c.stats.shield, sp: 30, inv: 2, rollT: 0, rollCd: 0, respawn: 0, vx: 0, vy: 0, holding: false, cd: 0 });
  p2.pos.set(player.x + 6, player.y + 1, 2); p2.g.position.copy(p2.pos); p2.g.visible = true;
  $('p2hud').classList.remove('hidden'); $('p2hud').classList.remove('down'); $('p2pf').innerHTML = PORTRAITS[p2.c.id]; $('p2name').textContent = p2.c.nm.toUpperCase();
}
function p2Off() { p2.on = false; if (p2.g) p2.g.visible = false; $('p2hud').classList.add('hidden'); }
function updateP2(dt) {
  const b = bounds(), c = p2.c, g = p2.g;
  p2.inv -= dt; p2.rollCd -= dt;
  if (!p2.alive) {
    if ((p2.respawn -= dt) <= 0 && player.alive && G.outroT < 0) { p2.alive = true; p2.shield = Math.ceil(p2.max / 2); p2.inv = 2.5; p2.pos.set(player.x, player.y + 2, 2); g.visible = true; $('p2hud').classList.remove('down'); fxTag(`${c.nm.toUpperCase()} IS BACK!`); }
    return;
  }
  if (!player.alive) { g.visible = false; return; }
  const ax = k('ArrowRight') - k('ArrowLeft'), ay = (S.invertY ? -1 : 1) * (k('ArrowUp') - k('ArrowDown')), mv = c.stats.move;
  p2.vx += (ax * 24 * mv - p2.vx) * Math.min(1, dt * 7); p2.vy += (ay * 18 * mv - p2.vy) * Math.min(1, dt * 7);
  p2.pos.x = G.arena ? clamp(p2.pos.x + p2.vx * dt, -14, 14) : clamp(p2.pos.x + p2.vx * dt, -16, 16);
  p2.pos.y = clamp(p2.pos.y + p2.vy * dt, b[0], b[1]); p2.pos.z += (2 - p2.pos.z) * Math.min(1, dt * 3);
  p2.sp = Math.min(100, p2.sp + dt * 5);
  let ra = 0; if (p2.rollT > 0) { p2.rollT -= dt; ra = p2.rollDir * Math.PI * 2 * ease(1 - p2.rollT / 0.5); }
  g.position.copy(p2.pos); g.rotation.set(p2.vy * 0.03, -p2.vx * 0.012, -p2.vx * 0.03 - ra);
  animateCharacter(g, T + 1, dt, 1);
  g.visible = p2.inv > 0 ? Math.floor(T * 20) % 2 === 0 : true;
  if (p2.holding && (p2.cd -= dt) <= 0) { p2.cd = 0.22; p2Fire(); }
  if (G.mode === 'obstacle' && G.obs) for (const o of G.obs) { const z = o.g.position.z; if (z > -20 && z < (o.zEnd || 3) && obstacleHit(o, c.stats.hit * 0.62, p2.pos)) { killP2(); break; } }
}
function p2Fire() {
  if (G.mode === 'obstacle') return;
  const c = p2.c, s = SHOT[c.shot], lv = player.power, offs = lv === 1 ? [0] : lv === 2 ? [-0.8, 0.8] : [-1.6, 0, 1.6];
  for (const o of offs) addShot({ type: c.shot, pos: V3(p2.pos.x + o, p2.pos.y + 0.3, p2.pos.z - 1.5), v: V3(o * 4 * (lv === 3 ? 1 : 0), 0, -s.v), dmg: s.d * 0.85, life: s.life || 1.25, spin: s.spin, home: s.home, splash: s.splash, slow: s.slow });
  p2.g.userData.throwT = 1; Sound.laser();
}
function p2Key(c) {
  if (!p2.alive || !player.alive || G.outroT >= 0) return;
  if (P2_FIRE.includes(c)) { p2.holding = true; p2.cd = 0.22; p2Fire(); }
  else if (P2_SPEC.includes(c)) p2Special();
  else if (P2_ROLL.includes(c) && p2.rollCd <= 0) { p2.rollDir = p2.vx < -1 ? -1 : 1; p2.rollT = 0.5; p2.rollCd = p2.c.stats.roll; p2.vx += p2.rollDir * 22; Sound.roll(); }
}
function p2Special() {
  if (p2.sp < 100 || G.mode === 'obstacle') return;
  p2.sp = 0; stat('specials');
  const tg = visible();
  for (let i = 0; i < 8; i++) { const an = i / 8 * Math.PI * 2; addShot({ type: p2.c.shot, pos: p2.pos.clone().add(V3(0, 0.3, -1)), v: V3(Math.cos(an) * 60, Math.sin(an) * 60, -60), dmg: 9, life: 3.5, home: 7, target: tg.length ? tg[i % tg.length] : null, scale: 1.5 }); }
  ringFx(p2.pos.clone(), 0x2ec27e, 14); Sound.nova(); fxTag(`${p2.c.nm.toUpperCase()}: SQUAD BURST!`);
  comm.q.unshift([p2.c.id, p2.c.call]); if (comm.cur && comm.cur.who !== p2.c.id) hideComm();
}
// Enemy bullet against player 2. Returns true when the bullet is used up.
function p2Hit(b) {
  if (!p2.on || !p2.alive || !player.alive) return false;
  const d = b.m.position.distanceTo(p2.pos);
  if (p2.rollT > 0 && d < 3.2) { b.friendly = true; b.v.negate().multiplyScalar(2.6); b.m.material = BFMAT; b.dmg = 3; Sound.deflect(); stat('deflects'); sideProgress('deflects'); return false; }
  if (d < p2.c.stats.hit && p2.inv <= 0) { damageP2(8); return true; }
  return false;
}
function damageP2(d) {
  if (!p2.alive || p2.inv > 0 || G.outroT >= 0) return;
  d *= DIFF[S.difficulty].dmg * (p2.c.id === 'marloes' ? 0.7 : 1);
  p2.shield -= d; p2.inv = 1; Sound.hurt(); shake(0.4);
  if (p2.shield <= 0) killP2();
}
function killP2() {
  p2.shield = 0; p2.alive = false; p2.g.visible = false; p2.respawn = 6; $('p2hud').classList.add('down');
  explode(p2.pos.clone(), 3); Sound.boom(2); shake(1);
  say(PL.id, `${p2.c.nm.toUpperCase()}! Hang on, you'll be back in a few seconds!`);
}
function updateP2HUD() {
  if (!p2.on) return;
  $('p2shield').querySelector('i').style.width = (Math.max(0, p2.shield) / p2.max * 100) + '%';
  $('p2sp').querySelector('i').style.width = p2.sp + '%';
}

/* ---------- Side stories: one extra mission per fighter ---------- */
const goalLabel = sd => `${GOAL_TEXT[sd.goal[0]]} ${sd.goal[0] === 'survive' ? sd.goal[1] + ' SECONDS' : sd.goal[1]}`;
function openSides() {
  const done = P.sides || {};
  $('sidesum').textContent = `${Object.keys(done).length} of ${ROSTER.length} side stories finished. Each one is a short mission with its own boss. First clear: +150 🐚.`;
  $('sidegrid').innerHTML = ROSTER.map(c => {
    const sd = SIDES[c.id], open = isUnlocked(P, c.id);
    return `<button class="side${open ? '' : ' locked'}${done[c.id] ? ' done' : ''}" data-id="${c.id}">${PORTRAITS[c.id]}<div class="t"><b>${open ? `${c.nm.toUpperCase()} · ${sd.title}` : '???'}</b><small>${open ? `${goalLabel(sd).toLowerCase()}, then ${sd.boss.name}` : 'Unlock this fighter first.'}</small></div></button>`;
  }).join('');
  $('sidegrid').querySelectorAll('.side').forEach(el => el.onclick = () => { Sound.init(); if (isUnlocked(P, el.dataset.id)) startSideFlow(el.dataset.id); });
  showScreen('sides');
}
function startSideFlow(id) {
  applyHero(BY_ID[id]); showScreen(null);
  if (p2.want) {
    pendingSide = id; pendingMode = null; pendingStage = null; pendingSecret = null;
    openSelect(); $('selmode').textContent = `SIDE STORY · ${SIDES[id].title}`;
    p2.picking = true; selIdx = (ROSTER.indexOf(PL) + 1) % ROSTER.length; while (!isUnlocked(P, ROSTER[selIdx].id)) selIdx = (selIdx + 1) % ROSTER.length;
    choose(selIdx); setSelText(); return;
  }
  p2.c = null; startSide(id);
}
function startSide(id) {
  const sd = SIDES[id], si = STAGE_ENV.indexOf(sd.env);
  ['over', 'end', 'home', 'pause', 'select', 'results', 'sides'].forEach(x => $(x).classList.add('hidden'));
  Object.assign(G, { score: 0, hits: 0 }); player.power = 1;
  clearActors(); setEnv(sd.env);
  Object.assign(G, { daily: null, mods: [], dmgTaken: 0, spawned: 0, kills: 0, tokensGot: 0, mode: 'side', sideId: id, sideWasDone: !!(P.sides || {})[id], stage: si >= 0 ? si : 2,
    t: 0, ev: [], ei: 0, clearT: -1, outroT: -1, overT: -1, metaT: rnd(18, 26), metaMute: 0, hpMul: 1, scoreMul: 1, wave: 0, waveT: 2.5, bossActive: false,
    sideN: 0, sidePhase: 'goal', done: false, arena: false, combo: 0, maxCombo: 0, lastKill: -9, secret: null, flags: {} });
  G.start = { score: 0, hits: 0, power: 1 };
  resetPlayer(); applyBoosts(); setupP2(); $('trio').classList.add('hidden'); mode = 'play'; comm.q = []; hideComm();
  $('hud').classList.remove('hidden');
  card('SIDE STORY', sd.title, `${PL.nm.toUpperCase()} · ${goalLabel(sd)}`);
  sd.intro.forEach(l => say(...l));
  cam.position.set(0, player.y * 0.6 + 2.6, 14); G.look.set(0, player.y, -40);
  Sound.music('stage'); spawnWingmates();
}
function sideProgress(type) {
  if (G.mode !== 'side' || G.sidePhase !== 'goal' || SIDES[G.sideId].goal[0] !== type) return;
  G.sideN++;
}
function sideHUD() {
  const sd = SIDES[G.sideId], [type, n] = sd.goal;
  return G.sidePhase === 'goal' ? `${sd.title} · ${GOAL_TEXT[type]} ${Math.floor(G.sideN)} / ${n}${type === 'survive' ? 's' : ''}` : `${sd.title} · ${sd.boss.name}`;
}
function updateSide(dt) {
  if (G.done || !player.alive || G.sidePhase !== 'goal') return;
  const sd = SIDES[G.sideId], [type, n] = sd.goal;
  if (type === 'survive') G.sideN = Math.min(n, G.t);
  if (G.sideN >= n) {
    G.sidePhase = 'boss'; fxTag('GOAL COMPLETE!'); Sound.pickup(); flash(0.3);
    sd.boss_in.forEach(l => say(...l)); later(3, () => spawnSideBoss(sd.boss)); return;
  }
  if ((G.waveT -= dt) > 0) return;
  G.wave++; const m = midY(), b = bounds();
  for (const kind of sd.mix) sideWave(kind, b);
  if (type === 'rings') for (let j = 0; j < 2; j++) later(j * 0.9, () => spawnRing(rnd(-12, 12), rnd(b[0] + 1, b[1] - 1), Math.random() < 0.15));
  else if (G.wave % 3 === 0) spawnRing(rnd(-8, 8), m, G.wave % 6 === 0);
  if (G.wave % 4 === 0) spawnPickup(G.wave % 8 === 0 ? 'special' : 'power', V3(rnd(-6, 6), m, -330));
  G.waveT = type === 'survive' ? 2.4 : 3.6;
}
function sideWave(kind, b) {
  if (kind === 'fighters') pick(WAVES.slice(0, 5))();
  else if (kind === 'rocks') for (let j = 0; j < 7; j++) later(j * 0.4, () => asteroid(rnd(-15, 15), rnd(b[0], b[1]), rnd(1.4, 3.6)));
  else if (kind === 'ads') WAVES[6]();
  else if (kind === 'clones') WAVES[7]();
  else if (kind === 'turrets') for (let j = 0; j < 4; j++) later(j * 0.8, () => turret((j % 2 ? 1 : -1) * rnd(3, 12)));
}
function spawnSideBoss(bs) {
  Sound.alarm();
  if (bs.model === 'ship') return spawnBigShip({ name: bs.name, phase: bs.phase, hp: bs.hp, scale: 1.6 });
  const glitch = bs.model.startsWith('glitch:'), id = glitch ? bs.model.slice(7) : bs.model;
  const make = bs.model === 'meta' ? undefined : bs.model === 'rock' ? () => MD.makeAsteroid(5.5)
    : () => { const c = makeCharacter(id); if (glitch) glitchify(c); c.scale.multiplyScalar(2.3); c.rotation.y = Math.PI; return c; };
  spawnDuelist({ name: bs.name, phase: bs.phase, hp: bs.hp, scale: bs.scale || 3.4, r: bs.model === 'rock' ? 5.5 : 3.6, score: 8000,
    faceCam: bs.model !== 'meta' && bs.model !== 'rock', jink: 24, speed: 22, burst: 4, fireGap: 1.7, rings: bs.rings, ads: bs.ads, make, death: [],
    summon: () => { fighter('swoop', -8, player.y); fighter('swoop', 8, player.y); } });
}
function sideWin() {
  G.done = true; player.inv = 99; const sd = SIDES[G.sideId];
  sd.win.forEach(l => say(...l));
  P.sides = P.sides || {}; if (!P.sides[G.sideId]) { P.sides[G.sideId] = 1; P.shells = (P.shells || 0) + 150; }
  if (p2.on) stat('coopClears'); persist(); checkAll();
  card('SIDE STORY CLEAR', sd.title, PL.nm.toUpperCase()); Sound.music('title');
  later(Math.max(5, sd.win.length * 3), () => showResults(true));
}


/* ---------- Triple Threat: three fighters, tag in when one goes down ---------- */
let trioPick = [];
const trioTeam = () => trioPick.map(id => BY_ID[id]);
const trioText = () => trioPick.length < 3
  ? `TRIPLE THREAT · PICK FIGHTER ${trioPick.length + 1} OF 3${trioPick.length ? ` · TEAM: ${trioTeam().map(c => c.nm.toUpperCase()).join(', ')} · ESC TO UNDO` : ''}`
  : `TRIPLE THREAT · TEAM: ${trioTeam().map(c => c.nm.toUpperCase()).join(', ')}`;
function markTrioGrid() {
  $('grid').querySelectorAll('.cc').forEach((el, j) => { const n = trioPick.indexOf(ROSTER[j].id); el.classList.toggle('picked', n >= 0); el.dataset.n = n >= 0 ? n + 1 : ''; });
}
// Returns true while the team is still being picked.
function trioPickStep() {
  const id = ROSTER[selIdx].id;
  if (trioPick.includes(id)) { Sound.hurt(); return true; }
  trioPick.push(id); markTrioGrid(); $('selmode').textContent = trioText();
  if (trioPick.length < 3) {
    Sound.pickup(); let i = selIdx;
    do i = (i + 1) % ROSTER.length; while (!isUnlocked(P, ROSTER[i].id) || trioPick.includes(ROSTER[i].id));
    choose(i); return true;
  }
  selIdx = ROSTER.indexOf(BY_ID[trioPick[0]]); return false;
}
function setFighter(c) {
  PL = c; setPlayerModel(c.id);
  $('chippf').innerHTML = PORTRAITS[c.id]; $('chipname').textContent = c.nm.toUpperCase(); $('chiptitle').textContent = c.title; $('spname').textContent = c.spName;
}
function renderTrio() {
  $('trio').innerHTML = trioPick.map((id, i) => `<div class="tm${i < G.trioI ? ' down' : ''}${i === G.trioI ? ' on' : ''}">${PORTRAITS[id]}</div>`).join('');
}
// The fighter who just went down is swapped for the next one. Returns false when nobody is left.
function tagIn() {
  if (G.trioI >= 2) return false;
  const p = player, old = PL, x = p.x, y = p.y, pw = Math.max(1, p.power - 1);
  explode(ppos(), 3.5); Sound.boom(3); shake(1.6); stat('downs');
  G.trioI++; setFighter(BY_ID[trioPick[G.trioI]]);
  resetPlayer(); Object.assign(player, { x, y, power: pw, inv: 3 }); player.g.position.set(x, y, 0);
  G.bullets.forEach(b => { if (!b.friendly) b.life = 0; });
  flash(0.6); renderTrio();
  card('TAG IN!', PL.nm.toUpperCase(), `${old.nm.toUpperCase()} IS DOWN · ${3 - G.trioI} OF 3 LEFT`);
  comm.q = []; hideComm(); say(PL.id, G.trioI === 2 ? `Last one standing. ${PL.launch}` : PL.launch);
  return true;
}

/* ---------- Boot (after every declaration above is initialised) ---------- */
applySettings(); goHome();
loop();
