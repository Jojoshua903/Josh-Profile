// DE RIJ: one shared runner. Whoever is at the front of the line gets 60 seconds,
// then control passes to the next person in line, wherever in the world they are.
const TURN = 60, READY = 6, LIVE_MS = 15000;
const $ = id => document.getElementById(id);
const cv = $('game'), ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;

// ---------- room + identity ----------
const params = new URLSearchParams(location.search);
const ROOM = (params.get('room') || 'main').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24) || 'main';
const store = makeStore(window.DERIJ_DB || '', ROOM);
const ONLINE = store.online;
const T = () => store.tree;
const now = () => store.now();
const rid = () => Math.random().toString(36).slice(2, 10);

const ME_KEY = 'derij-me-' + ROOM;
let me = null;
try { me = JSON.parse(localStorage.getItem(ME_KEY)); } catch (e) {}
if (!me || !me.id) me = {id: 'u' + rid(), name: '', look: null};
const saveMe = () => { try { localStorage.setItem(ME_KEY, JSON.stringify(me)); } catch (e) {} };
saveMe();
const VIEWER = 'v' + rid();
let joined = false, rejoinChecked = !ONLINE;

// ---------- reading the shared tree ----------
const charOf = look => ROSTER.find(r => r.id === (look && look.char)) || ROSTER[0];
const colorOf = look => (look && look.tint) || charOf(look).color;
const allPlayers = () => Object.values(T().players || {}).filter(p => p && p.id && p.name && p.look);
const livePlayers = () => allPlayers().filter(p => !ONLINE || now() - (p.seen || 0) < LIVE_MS);
const byQt = (a, b) => (a.qt || 0) - (b.qt || 0) || (a.id < b.id ? -1 : 1);
function lineup(){
  const ps = livePlayers().sort(byQt), t = T().turn;
  if (t){ const i = ps.findIndex(p => p.id === t.pid); if (i > 0) ps.unshift(ps.splice(i, 1)[0]); }
  return ps;
}
const holder = () => { const t = T().turn; return t ? (T().players || {})[t.pid] : null; };
const isMine = () => { const t = T().turn; return !!t && (!ONLINE || t.pid === me.id); };
const gstate = () => Object.assign({room: 1, cleared: 0, deaths: 0}, T().state || {});
let paused = null; // offline only
function phase(){
  const t = T().turn;
  if (!t) return 'idle';
  if (paused) return 'paused';
  const n = now();
  return n < t.start ? 'ready' : n < t.start + TURN * 1000 ? 'play' : 'over';
}
const timeLeft = () => {
  const t = T().turn, ph = phase();
  if (ph === 'play') return Math.max(0, (t.start + TURN * 1000 - now()) / 1000);
  if (ph === 'paused') return Math.max(0, (t.start + TURN * 1000 - paused.at) / 1000);
  return ph === 'over' ? 0 : TURN;
};

// ---------- chat ----------
const post = msg => { msg.at = SV_NOW; store.push('feed', msg); };
const sys = text => post({s: 1, x: text});
const say = (who, text, color) => post({w: who, x: text, c: color || '#1d1a2f'});
const DEATH_LINES = [
  ['meta', 'Would you like some tips on jumping? 👋'], ['ati', 'AGAIN?!'], ['robin', '😭😭😭'], ['dih', 'hehe'],
  ['enno', 'That angle was 3° off.'], ['guiseppe', 'In MY game this wouldn’t happen.'], ['ankervos', 'ha. ha. ha.'],
  ['daniel', 'I’d have just blown it up.'], ['zennith', '…'], ['nathan', 'Strike one.'], ['lars', 'Spikes. Hate spikes.'],
  ['yassin', 'Keep your guard up!'], ['ash', 'I could do that blindfolded'], ['meta', 'Here’s a summary of what went wrong: everything.']
];
const WIN_LINES = [
  ['nathan', 'HOME RUN! ⚾'], ['milo', '⚡⚡⚡'], ['josh', 'clean.'], ['dean', 'smooth moves'], ['oela', 'GOOOAL'],
  ['fionn', 'Solid as granite, that.'], ['renas', 'WOOO'], ['adam', 'Ace.'], ['casper', 'Tuned to perfection.'], ['thomas', 'Rolled right through.']
];
function bot(lines, chance){
  if (Math.random() > chance) return;
  const [id, line] = lines[Math.floor(Math.random() * lines.length)], c = ROSTER.find(r => r.id === id);
  setTimeout(() => say(c.name, line, c.color), 300 + Math.random() * 900);
}

// ---------- audio ----------
let AC = null;
const wake = () => { if (!AC) try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} };
function beep(f, d = 0.08, type = 'square', v = 0.05, slide = 0){
  if (!AC) return;
  const o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime;
  o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), t + d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d);
}
const sfx = {
  jump: () => beep(420, 0.09, 'square', 0.035, 300),
  die: () => beep(220, 0.25, 'sawtooth', 0.05, -180),
  exit: () => { beep(523, 0.08); setTimeout(() => beep(659, 0.08), 70); setTimeout(() => beep(880, 0.14), 140); },
  tickS: () => beep(990, 0.05, 'square', 0.03),
  over: () => { beep(660, 0.12, 'triangle', 0.08); setTimeout(() => beep(440, 0.2, 'triangle', 0.08), 120); },
  mine: () => { beep(440, 0.1, 'triangle', 0.08); setTimeout(() => beep(660, 0.1, 'triangle', 0.08), 110); setTimeout(() => beep(990, 0.18, 'triangle', 0.08), 220); }
};
addEventListener('pointerdown', wake);

// ---------- input ----------
const keys = {}; let jumpEdge = false, modal = false;
const JUMP = ['Space', 'KeyW', 'ArrowUp', 'KeyZ'];
addEventListener('keydown', e => {
  wake();
  if (modal){ if (e.code === 'Escape') closeCustom(); return; }
  if (e.target && e.target.tagName === 'INPUT') return;
  const mine = isMine(), ph = phase();
  if (mine && (JUMP.includes(e.code) || e.code.startsWith('Arrow'))) e.preventDefault();
  if (JUMP.includes(e.code) && !keys[e.code]) jumpEdge = true;
  keys[e.code] = true;
  if (!ONLINE && (e.code === 'KeyP' || e.code === 'Escape')) togglePause();
  if (e.code === 'Enter' && mine && ph === 'ready') store.patch('turn', {start: Math.round(now())});
  if (e.code === 'KeyR' && mine && ph === 'play' && !pl.dead) die('gave up');
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; if (!ONLINE && phase() === 'play') togglePause(); });
const input = () => ({left: keys.KeyA || keys.ArrowLeft, right: keys.KeyD || keys.ArrowRight, jump: JUMP.some(k => keys[k]), jumpPressed: jumpEdge});

function togglePause(){
  const t = T().turn;
  if (!t) return;
  if (paused){ store.patch('turn', {start: Math.round(t.start + (now() - paused.at))}); paused = null; }
  else if (phase() === 'play') paused = {at: now()};
}

// ---------- turn handover (any client can do it, so the line never stalls) ----------
let lastAdv = 0;
const elector = (ps, t) => { const c = ps.filter(p => !t || p.id !== t.pid).sort(byQt)[0] || ps[0]; return c && c.id; };
function maybeAdvance(){
  if (paused) return;
  const n = now();
  if (n - lastAdv < 2500) return;
  const t = T().turn, ps = livePlayers();
  const holderLive = !!t && ps.some(p => p.id === t.pid);
  const over = !!t && n >= t.start + TURN * 1000;
  let go = false;
  if (!ps.length) go = !!t;
  else if (!t || !holderLive) go = !ONLINE || elector(ps, t) === me.id;
  else if (over) go = !ONLINE || t.pid === me.id || (n > t.start + TURN * 1000 + 4000 && elector(ps, t) === me.id);
  if (!go) return;
  lastAdv = n;
  const next = ps.filter(p => !t || p.id !== t.pid).sort(byQt)[0] || (holderLive ? ps.find(p => p.id === t.pid) : null);
  const upd = {turn: next ? {pid: next.id, start: Math.round(n + READY * 1000), n: ((t && t.n) || 0) + 1} : null};
  if (holderLive && over){ upd['players/' + t.pid + '/qt'] = Math.round(n); sys(`Time! ${T().players[t.pid].name} goes to the back of the line`); }
  else if (t && !holderLive && ps.length) sys('The player at the front left, so the line moves on');
  if (next) sys(`${next.name} has the controls next`);
  store.patch('', upd);
}

let lastSweep = 0;
function sweep(){
  if (!ONLINE || now() - lastSweep < 10000) return;
  lastSweep = now();
  const ps = livePlayers();
  if (ps.length && elector(ps, T().turn) !== me.id) return;
  const upd = {}, old = now() - 60000;
  for (const p of Object.values(T().players || {})) if (p && p.id && (p.seen || 0) < old) upd['players/' + p.id] = null;
  for (const [k, v] of Object.entries(T().viewers || {})) if ((v || 0) < old) upd['viewers/' + k] = null;
  const fk = Object.keys(T().feed || {}).sort();
  if (fk.length > 80) for (const k of fk.slice(0, fk.length - 50)) upd['feed/' + k] = null;
  if (Object.keys(upd).length) store.patch('', upd);
}

function heartbeat(){
  if (!ONLINE) return;
  store.put('viewers/' + VIEWER, SV_NOW);
  if (joined) store.patch('players/' + me.id, {seen: SV_NOW});
}
setInterval(heartbeat, 4000);
addEventListener('pagehide', () => { if (ONLINE) store.goodbye(['viewers/' + VIEWER].concat(joined ? ['players/' + me.id] : [])); });

// ---------- joining ----------
function saveLook(name, look, editId){
  if (ONLINE){
    me.name = name; me.look = look; saveMe();
    if (joined) store.patch('players/' + me.id, {name, look});
    else { store.put('players/' + me.id, {id: me.id, name, look, qt: SV_NOW, seen: SV_NOW}); joined = true; sys(`${name} joined the line as ${charOf(look).name}`); }
    store.patch('stats/' + me.id, {name, c: colorOf(look)});
  } else if (editId && T().players && T().players[editId]){
    store.patch('players/' + editId, {name, look});
    store.patch('stats/' + editId, {name, c: colorOf(look)});
  } else {
    const id = 'p' + rid();
    store.put('players/' + id, {id, name, look, qt: SV_NOW});
    store.patch('stats/' + id, {name, c: colorOf(look)});
    sys(`${name} joined the line as ${charOf(look).name}`);
  }
}
function leaveLine(id){
  const p = (T().players || {})[id];
  if (!p) return;
  store.remove('players/' + id);
  sys(`${p.name} left the line`);
  if (id === me.id) joined = false;
}

// ---------- local simulation ----------
let roomObj = genRoom(gstate().room), pl = makePlayer(roomObj);
const shown = {x: pl.x, y: pl.y, face: 1, st: 'idle', t: 0, vis: true, vx: 0, ground: true};
let parts = [], marks = [], tick = 0, flash = 0, lastTurnN = null, lastFx = null, lastPosT = -99, lastPosKey = '', lastRt = null, lastPhase = '', lastSec = -1;

function syncShown(){
  Object.assign(shown, {x: pl.x, y: pl.y, face: pl.face, t: pl.t, vx: pl.vx, ground: pl.ground, vis: !pl.dead,
    st: !pl.ground ? 'air' : Math.abs(pl.vx) > 0.4 ? 'run' : 'idle'});
}
function sendPos(force){
  const pos = {x: Math.round(pl.x * 10) / 10, y: Math.round(pl.y * 10) / 10, f: pl.face, s: pl.dead ? 'dead' : shown.st, r: roomObj.n, g: pl.ground ? 1 : 0};
  const key = JSON.stringify(pos);
  if (!force && (tick - lastPosT < (ONLINE ? 6 : 20) || (key === lastPosKey && tick - lastPosT < 60))) return;
  lastPosKey = key; lastPosT = tick; pos.rt = roomObj.t;
  store.put('pos', pos);
}
function followRemote(){
  const p = T().pos, ok = p && p.r === roomObj.n;
  const tx = ok ? p.x : roomObj.spawn.x - PW / 2, ty = ok ? p.y : roomObj.spawn.y - PH;
  if (ok && p.rt !== lastRt){ lastRt = p.rt; if (Math.abs(roomObj.t - p.rt) > 8) roomObj.t = p.rt; }
  const snap = Math.hypot(tx - shown.x, ty - shown.y) > 40;
  shown.vx = tx - shown.x;
  shown.x = snap ? tx : shown.x + (tx - shown.x) * 0.3;
  shown.y = snap ? ty : shown.y + (ty - shown.y) * 0.3;
  shown.face = ok ? p.f || 1 : 1; shown.st = ok ? p.s : 'idle'; shown.vis = !ok || p.s !== 'dead'; shown.ground = ok ? !!p.g : true; shown.t++;
  if (shown.ground && shown.vis) touchCrumbles(roomObj, tx, ty);
}
function onNewTurn(mine){
  for (const k in keys) keys[k] = false;
  jumpEdge = false;
  if (!mine) return;
  const p = T().pos;
  pl = makePlayer(roomObj);
  if (p && p.r === roomObj.n && p.s !== 'dead'){ pl.x = p.x; pl.y = p.y; pl.face = p.f || 1; }
  syncShown(); sendPos(true);
  if (ONLINE) sfx.mine();
}
function playFx(fx){
  if (fx.k === 'die'){
    sfx.die(); flash = 6; marks.push({x: fx.x, y: fx.y});
    for (let i = 0; i < 26; i++) parts.push({x: fx.x, y: fx.y, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.8) * 5, l: 40 + Math.random() * 20, c: i % 3 ? fx.c : '#1d1a2f', g: 0.2, s: 2});
  } else if (fx.k === 'exit'){
    sfx.exit();
    for (let i = 0; i < 30; i++) parts.push({x: fx.x, y: fx.y, vx: (Math.random() - 0.5) * 4, vy: -Math.random() * 4, l: 30, c: ['#ffd23f', '#ff3b3b', '#2f7bff', '#3ccf6e'][i % 4], g: 0.12, s: 2});
  }
}
function statsPatch(h, field){
  const s = (T().stats || {})[h.id] || {}, o = {};
  o['stats/' + h.id + '/' + field] = (s[field] || 0) + 1;
  o['stats/' + h.id + '/name'] = h.name; o['stats/' + h.id + '/c'] = colorOf(h.look);
  return o;
}
function die(cause){
  if (pl.dead) return;
  pl.dead = 36;
  const h = holder(), gs = gstate();
  const fx = {k: 'die', x: Math.round(pl.x + PW / 2), y: Math.round(pl.y + PH / 2), c: colorOf(h && h.look), n: rid()};
  lastFx = fx.n; playFx(fx);
  store.patch('', Object.assign({'state/deaths': gs.deaths + 1, 'state/room': roomObj.n, fx}, h ? statsPatch(h, 'deaths') : {}));
  if (cause === 'gave up' && h) sys(`${h.name} restarted the room`);
  bot(DEATH_LINES, 0.3);
  syncShown(); sendPos(true);
}
function exitRoom(){
  const h = holder(), gs = gstate(), from = roomObj.n;
  roomObj = genRoom(from + 1); marks = []; pl = makePlayer(roomObj);
  const fx = {k: 'exit', x: Math.round(pl.x + PW / 2), y: Math.round(pl.y + PH / 2), n: rid()};
  lastFx = fx.n; playFx(fx);
  store.patch('', Object.assign({'state/room': from + 1, 'state/cleared': gs.cleared + 1, 'state/deaths': gs.deaths, fx}, h ? statsPatch(h, 'rooms') : {}));
  if (h) say(h.name, `cleared room ${from}`, colorOf(h.look));
  bot(WIN_LINES, 0.45);
  syncShown(); sendPos(true);
}
function playStep(){
  if (pl.dead){
    tickHazards(roomObj);
    if (--pl.dead === 0){ const keep = roomObj.t; roomObj = genRoom(roomObj.n); roomObj.t = keep; pl = makePlayer(roomObj); }
    jumpEdge = false; syncShown(); sendPos(); return;
  }
  const inp = input(); jumpEdge = false;
  const r = step(roomObj, pl, inp);
  if (pl.jumped) sfx.jump();
  if (r === 'die') die();
  else if (r === 'exit') exitRoom();
  syncShown(); sendPos();
}

function update(){
  tick++;
  for (const q of parts){ q.x += q.vx; q.y += q.vy; q.vy += q.g; q.l--; }
  parts = parts.filter(q => q.l > 0);
  if (flash) flash--;

  if (!store.loaded) return;
  if (!rejoinChecked){
    rejoinChecked = true;
    const mine = (T().players || {})[me.id];
    if (mine && now() - (mine.seen || 0) < LIVE_MS){ joined = true; heartbeat(); }
  }
  if (lastFx === null) lastFx = (T().fx || {}).n || '';
  maybeAdvance(); sweep();

  const gs = gstate();
  if (gs.room !== roomObj.n){ roomObj = genRoom(gs.room); marks = []; if (isMine()) pl = makePlayer(roomObj); }
  const t = T().turn, ph = phase(), mine = isMine();
  const tn = t ? t.pid + ':' + t.n : null;
  if (tn !== lastTurnN){ lastTurnN = tn; if (t) onNewTurn(mine); }
  const fx = T().fx;
  if (fx && fx.n !== lastFx){ lastFx = fx.n; if (!mine) playFx(fx); }
  if (ph !== lastPhase){ if (lastPhase === 'play' && ph === 'over' && mine) sfx.over(); lastPhase = ph; }

  if (mine && ph === 'play') playStep();
  else if (mine && (ph === 'ready' || ph === 'paused')){ if (ph === 'ready') tickHazards(roomObj); syncShown(); }
  else { tickHazards(roomObj); followRemote(); }

  if (ph === 'play'){ const s = Math.ceil(timeLeft()); if (s !== lastSec){ lastSec = s; if (mine && s <= 5 && s > 0) sfx.tickS(); } }

  const h = holder();
  if (h && h.look.trail && h.look.trail !== 'none' && shown.vis && (Math.abs(shown.vx) > 0.5 || !shown.ground) && tick % 3 === 0){
    const tr = h.look.trail;
    parts.push({x: shown.x + PW / 2 + (Math.random() - 0.5) * 6, y: shown.y + PH - 2 - Math.random() * 6, vx: -shown.vx * 0.2,
      vy: tr === 'fire' ? -0.6 : tr === 'heart' ? -0.4 : (Math.random() - 0.5) * 0.4, l: 22, g: 0, s: 1, kind: tr,
      c: tr === 'fire' ? (Math.random() < 0.5 ? '#ff7a1f' : '#ffd23f') : tr === 'spark' ? (Math.random() < 0.5 ? '#ffe066' : '#ffffff') : '#ff3b9a'});
  }
}

// ---------- canvas ----------
let bgCache = {n: -1, s: []};
function render(){
  const R = roomObj, TH = R.theme, h = holder();
  if (bgCache.n !== R.n){ const rnd = rngFrom(R.n * 31 + 7); bgCache = {n: R.n, s: Array.from({length: 7}, () => ({x: rnd() * W, y: 40 + rnd() * 160, r: 20 + rnd() * 50}))}; }
  ctx.fillStyle = TH.bg; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = TH.far;
  for (const s of bgCache.s){ ctx.beginPath(); ctx.arc(Math.round(s.x), Math.round(s.y), s.r, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = 'rgba(29,26,47,.06)';
  for (let y = 8; y < H; y += 16) for (let x = (y / 16 % 2) * 8; x < W; x += 16) ctx.fillRect(x, y, 1, 1);

  ctx.fillStyle = 'rgba(29,26,47,.28)';
  for (const m of marks){ for (let i = -2; i <= 2; i++){ ctx.fillRect(m.x + i, m.y + i, 1, 1); ctx.fillRect(m.x + i, m.y - i, 1, 1); } }

  const d = R.door, glow = 0.5 + Math.sin(tick / 10) * 0.5;
  ctx.fillStyle = `rgba(255,210,63,${0.25 + glow * 0.25})`; ctx.fillRect(d.x - 3, d.y - 3, d.w + 6, d.h + 3);
  ctx.fillStyle = '#1d1a2f'; ctx.fillRect(d.x - 1, d.y - 1, d.w + 2, d.h + 1);
  ctx.fillStyle = '#b5713a'; ctx.fillRect(d.x + 1, d.y + 1, d.w - 2, d.h - 1);
  ctx.fillStyle = '#8f5226'; ctx.fillRect(d.x + 3, d.y + 4, d.w - 6, 9); ctx.fillRect(d.x + 3, d.y + 17, d.w - 6, 10);
  ctx.fillStyle = '#ffd23f'; ctx.fillRect(d.x + d.w - 5, d.y + 16, 2, 2);

  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++){
    const v = R.g[y][x], px = x * TS, py = y * TS;
    if (v === SOLID){
      ctx.fillStyle = TH.tile; ctx.fillRect(px, py, TS, TS);
      ctx.fillStyle = 'rgba(255,255,255,.12)'; if ((x + y) % 2) ctx.fillRect(px + 3, py + 5, 3, 2);
      const up = y > 0 && R.g[y - 1][x] === SOLID;
      if (!up){ ctx.fillStyle = TH.top; ctx.fillRect(px, py, TS, 3); }
      ctx.fillStyle = TH.edge;
      if (!up) ctx.fillRect(px, py, TS, 1);
      if (y < ROWS - 1 && R.g[y + 1][x] !== SOLID) ctx.fillRect(px, py + TS - 1, TS, 1);
      if (x > 0 && R.g[y][x - 1] !== SOLID) ctx.fillRect(px, py, 1, TS);
      if (x < COLS - 1 && R.g[y][x + 1] !== SOLID) ctx.fillRect(px + TS - 1, py, 1, TS);
    } else if (v === CRUMBLE){
      const c = R.crumbles[y * COLS + x] || 0;
      if (c < 26){
        const sh = c ? ((tick >> 1) % 2 ? 1 : -1) : 0;
        ctx.fillStyle = TH.edge; ctx.fillRect(px + sh, py, TS, 7);
        ctx.fillStyle = TH.top; ctx.fillRect(px + 1 + sh, py + 1, TS - 2, 5);
        ctx.fillStyle = TH.edge; ctx.fillRect(px + 5 + sh, py + 1, 1, 3); ctx.fillRect(px + 10 + sh, py + 3, 1, 3);
      } else if (c < 60){
        ctx.fillStyle = TH.top; const f = (c - 26) * 1.5; ctx.fillRect(px + 2, py + f, 4, 3); ctx.fillRect(px + 9, py + f * 1.2, 4, 3);
      }
    } else if (v === SPIKE || v === SPIKE_DN){
      ctx.fillStyle = TH.spike;
      for (let k = 0; k < 2; k++) for (let i = 0; i < 8; i++){
        const hgt = Math.round(8 - Math.abs(3.5 - i) * 2);
        ctx.fillRect(px + k * 8 + i, v === SPIKE ? py + TS - hgt : py, 1, hgt);
      }
    }
  }
  for (const m of R.movers){
    const x = Math.round(m.px || m.x0);
    ctx.fillStyle = '#1d1a2f'; ctx.fillRect(x, m.y, m.w, 6);
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(x + 1, m.y + 1, m.w - 2, 4);
    ctx.fillStyle = '#1d1a2f'; for (let i = 3; i < m.w - 2; i += 6) ctx.fillRect(x + i, m.y + 2, 2, 2);
  }
  for (const s of R.saws){
    const sx = Math.round(s.x ?? s.cx), sy = Math.round(s.y ?? s.cy);
    ctx.fillStyle = 'rgba(29,26,47,.15)';
    if (s.ay) ctx.fillRect(s.cx, s.cy - s.ay, 1, s.ay * 2); else ctx.fillRect(s.cx - s.ax, s.cy, s.ax * 2, 1);
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(tick * 0.3);
    ctx.fillStyle = '#1d1a2f';
    for (let i = 0; i < 8; i++){ ctx.rotate(Math.PI / 4); ctx.fillRect(-1, -s.r - 2, 3, 4); }
    ctx.beginPath(); ctx.arc(0, 0, s.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c9d0da'; ctx.beginPath(); ctx.arc(0, 0, s.r - 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff3b3b'; ctx.fillRect(-2, -2, 4, 4);
    ctx.restore();
  }
  for (const q of parts){
    ctx.globalAlpha = Math.min(1, q.l / 15); ctx.fillStyle = q.c;
    if (q.kind === 'heart'){ const x = Math.round(q.x), y = Math.round(q.y); ctx.fillRect(x, y, 1, 1); ctx.fillRect(x + 2, y, 1, 1); ctx.fillRect(x - 1, y + 1, 5, 1); ctx.fillRect(x, y + 2, 3, 1); ctx.fillRect(x + 1, y + 3, 1, 1); }
    else ctx.fillRect(Math.round(q.x), Math.round(q.y), q.s || 1, q.s || 1);
  }
  ctx.globalAlpha = 1;
  if (shown.vis && h){
    drawChar(ctx, h.look, shown.x + PW / 2, shown.y + PH + 1, shown.face, shown.t, shown.st === 'dead' ? 'idle' : shown.st);
    ctx.font = 'bold 8px ui-monospace,monospace'; ctx.textBaseline = 'top';
    const nm = h.name.toUpperCase(), w = ctx.measureText(nm).width + 6, nx = Math.round(shown.x + PW / 2 - w / 2), ny = Math.round(shown.y - 22);
    ctx.fillStyle = 'rgba(29,26,47,.75)'; ctx.fillRect(nx, ny, w, 10);
    ctx.fillStyle = '#fff'; ctx.fillText(nm, nx + 3, ny + 1);
  }
  if (flash){ ctx.fillStyle = `rgba(255,59,59,${flash / 14})`; ctx.fillRect(0, 0, W, H); }
  ctx.fillStyle = 'rgba(29,26,47,.8)'; ctx.fillRect(4, 4, 58, 11);
  ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 8px ui-monospace,monospace'; ctx.textBaseline = 'top';
  ctx.fillText('ROOM ' + String(R.n).padStart(3, '0'), 8, 6);
  if (ONLINE && !isMine() && phase() === 'play'){
    ctx.fillStyle = 'rgba(29,26,47,.8)'; ctx.fillRect(W - 66, 4, 62, 11);
    ctx.fillStyle = (tick >> 4) % 2 ? '#ff3b3b' : '#ff7ccf'; ctx.fillRect(W - 62, 7, 4, 4);
    ctx.fillStyle = '#fff'; ctx.fillText('WATCHING', W - 54, 6);
  }
}

let acc = 0, last = performance.now();
function frame(t){
  acc += Math.min(100, t - last); last = t;
  while (acc >= 1000 / 60){ update(); acc -= 1000 / 60; }
  render();
  requestAnimationFrame(frame);
}

// ---------- DOM ----------
function paintMini(c, look){
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, c.width, c.height);
  if (look) drawChar(g, look, c.width / 2, c.height - 4, 1, tick, 'idle');
}
const esc = s => String(s).replace(/[&<>"]/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[ch]));
const inviteUrl = () => { const u = new URL(location.href); u.searchParams.set('room', ROOM); return u.toString(); };

let sigQueue = '', sigBoard = '', sigFeed = '';
function renderQueue(){
  const line = lineup(), t = T().turn;
  const sig = JSON.stringify([line.map(p => [p.id, p.name, p.look]), t && t.pid, joined]);
  if (sig === sigQueue) return; sigQueue = sig;
  const ul = $('queue'); ul.innerHTML = '';
  if (!line.length) ul.innerHTML = '<div class="empty">Nobody in line yet. Be the first.</div>';
  line.forEach((p, i) => {
    const li = document.createElement('li'), cur = t && p.id === t.pid, own = !ONLINE || p.id === me.id;
    if (cur) li.className = 'cur';
    if (ONLINE && p.id === me.id) li.classList.add('you');
    li.innerHTML = `<span class="pos">${cur ? '▶' : i + 1}</span><canvas width="32" height="32"></canvas><span class="nm">${esc(p.name)}${ONLINE && p.id === me.id ? ' <em>(you)</em>' : ''}</span>` +
      (own ? '<button title="Edit look">✎</button><button title="Leave the line">✕</button>' : '');
    paintMini(li.querySelector('canvas'), p.look);
    if (own){ const [eb, xb] = li.querySelectorAll('button'); eb.onclick = () => openCustom(p.id); xb.onclick = () => leaveLine(p.id); }
    ul.appendChild(li);
  });
  $('joinBtn2').textContent = ONLINE && joined ? '✎ My look' : '+ Join';
  $('joinBtn').textContent = ONLINE && joined ? '✎ Edit my look' : '+ Join the line';
}
function renderBoard(){
  const rows = Object.entries(T().stats || {}).map(([id, s]) => Object.assign({id}, s)).filter(s => s.name)
    .sort((a, b) => (b.rooms || 0) - (a.rooms || 0) || (a.deaths || 0) - (b.deaths || 0)).slice(0, 8);
  const sig = JSON.stringify(rows);
  if (sig === sigBoard) return; sigBoard = sig;
  $('board').innerHTML = rows.length ? rows.map((p, i) => `<tr><td>${i === 0 && p.rooms ? '👑 ' : ''}<span style="color:${esc(p.c || '#1d1a2f')}">●</span> ${esc(p.name)}</td><td class="n">${p.rooms || 0}</td><td class="n">${p.deaths || 0}</td></tr>`).join('')
    : '<tr><td colspan="3" class="empty">No runs yet.</td></tr>';
}
function renderFeed(){
  const f = T().feed || {}, ks = Object.keys(f).sort().slice(-40);
  const sig = ks.join(',');
  if (sig === sigFeed) return; sigFeed = sig;
  const el = $('feed');
  el.innerHTML = ks.map(k => { const m = f[k] || {}; return m.s ? `<div class="sys">${esc(m.x)}</div>` : `<div><b style="color:${esc(m.c || '#1d1a2f')}">${esc(m.w)}</b> ${esc(m.x)}</div>`; }).join('') || '<div class="sys">Chat is quiet. For now.</div>';
  el.scrollTop = el.scrollHeight;
}
function renderHud(){
  const gs = gstate(), t = T().turn, ph = phase(), h = holder(), mine = isMine(), line = lineup();
  $('cRoom').textContent = gs.room; $('cTheme').textContent = roomObj.theme.name;
  $('cClear').textContent = gs.cleared; $('cDeath').textContent = gs.deaths;
  $('liveChip').style.visibility = ph === 'play' ? 'visible' : 'hidden';
  // connection chip
  const nc = $('netChip');
  if (!ONLINE){ nc.textContent = 'This computer only'; nc.className = 'chip'; }
  else {
    const watching = Object.values(T().viewers || {}).filter(v => now() - (v || 0) < LIVE_MS).length;
    nc.className = 'chip net ' + store.status;
    nc.textContent = store.status === 'live' ? `Room “${ROOM}” · ${Math.max(1, watching)} here · ${line.length} in line`
      : store.status === 'error' ? 'Connection problem' + (store.lastError ? ` (${store.lastError})` : '') : 'Connecting…';
  }
  // now playing
  if (h && t){
    const myPos = ONLINE ? line.findIndex(p => p.id === me.id) : -1;
    $('nowName').textContent = ph === 'ready' ? `Up next: ${h.name}` : mine && ONLINE ? `You (${h.name})` : h.name;
    $('nowSub').textContent = `as ${charOf(h.look).name}` + (ONLINE && !mine ? (myPos > 0 ? ` · you’re #${myPos + 1} in line` : joined ? '' : ' · you’re watching') : '');
    paintMini($('nowCv'), h.look);
  } else { $('nowName').textContent = 'Nobody playing'; $('nowSub').textContent = 'Join the line to play'; paintMini($('nowCv'), null); }
  // timer
  const tl = timeLeft();
  $('tNum').textContent = Math.ceil(tl);
  $('ring').setAttribute('stroke-dashoffset', (100.5 * (1 - tl / TURN)).toFixed(1));
  $('timer').classList.toggle('low', tl <= 10 && ph === 'play');
  // overlays
  $('lobby').classList.toggle('on', ph === 'idle' && !modal);
  $('paused').classList.toggle('on', ph === 'paused');
  const ready = ph === 'ready';
  $('handoff').classList.toggle('on', ready);
  if (ready){
    $('handTop').textContent = mine && ONLINE ? 'It’s your turn' : 'Next in line';
    $('handName').textContent = h ? h.name : '';
    $('handCount').textContent = Math.max(1, Math.ceil((t.start - now()) / 1000));
    $('handSub').textContent = mine ? `Room ${gs.room} · you take over right where it stopped` : `${h ? h.name : 'They'} takes over in room ${gs.room}`;
    $('handGo').style.display = mine ? '' : 'none';
    paintMini($('handCv'), h && h.look);
  }
  $('lobbyNote').innerHTML = ONLINE
    ? `Anyone with the link can watch, join the line, and chat.<br><span class="link">${esc(inviteUrl())}</span>`
    : 'Everyone plays on this computer. Add a database link in <b>config.js</b> to let anyone join from anywhere.';
  $('inviteBtn').style.display = ONLINE ? '' : 'none';
  $('keysPause').style.display = ONLINE ? 'none' : '';
}
setInterval(() => { renderHud(); renderQueue(); renderBoard(); renderFeed(); }, 200);

// ---------- character setup ----------
let edit = null, editId = null;
function pills(el, items, key, label){
  el.innerHTML = '';
  items.forEach(it => {
    const b = document.createElement('button');
    if (key === 'tint'){ b.className = 'sw' + (it ? '' : ' orig'); if (it) b.style.background = it; b.title = it || 'Original colours'; }
    else { b.className = 'pill'; b.textContent = label(it); }
    const val = key === 'tint' ? it : it.id;
    b.classList.toggle('sel', edit[key] === val);
    b.onclick = () => { edit[key] = val; refreshCustom(); };
    el.appendChild(b);
  });
}
function refreshCustom(){
  const c = charOf(edit);
  $('pName').textContent = c.name; $('pTitle').textContent = c.title; $('pTitle').style.background = c.color; $('pDesc').textContent = c.desc;
  document.querySelectorAll('#charGrid .pick').forEach(b => b.classList.toggle('sel', b.dataset.id === edit.char));
  pills($('accRow'), ACCESSORIES, 'acc', a => a.name);
  pills($('tintRow'), TINTS, 'tint');
  pills($('trailRow'), TRAILS, 'trail', a => a.name);
  $('nameIn').placeholder = c.name;
}
function openCustom(id){
  if (ONLINE) id = joined ? me.id : null;
  editId = id || null;
  const p = id && (T().players || {})[id];
  const base = p ? p.look : (ONLINE && me.look) || null;
  edit = base ? Object.assign({acc: 'none', tint: null, trail: 'none'}, base)
    : {char: ROSTER[Math.floor(Math.random() * ROSTER.length)].id, acc: 'none', tint: null, trail: 'none'};
  $('nameIn').value = p ? p.name : ONLINE ? me.name || '' : '';
  $('saveC').textContent = p ? 'Save look' : 'Get in line';
  const grid = $('charGrid'); grid.innerHTML = '';
  ROSTER.forEach(c => {
    const b = document.createElement('button'); b.className = 'pick'; b.dataset.id = c.id;
    b.innerHTML = `<canvas width="32" height="32"></canvas><span>${esc(c.name)}</span>`;
    paintMini(b.querySelector('canvas'), {char: c.id, acc: 'none'});
    b.onclick = () => { edit.char = c.id; refreshCustom(); };
    grid.appendChild(b);
  });
  refreshCustom();
  modal = true; $('custom').classList.add('on');
  setTimeout(() => $('nameIn').focus(), 30);
}
function closeCustom(){ modal = false; $('custom').classList.remove('on'); }
$('nameIn').addEventListener('keydown', e => { if (e.key === 'Enter') $('saveC').click(); });
$('cancelC').onclick = closeCustom;
$('saveC').onclick = () => {
  const name = $('nameIn').value.trim().slice(0, 16) || charOf(edit).name;
  saveLook(name, Object.assign({}, edit), editId);
  closeCustom();
};
setInterval(() => {
  if (!modal) return;
  const c = $('prevCv'), g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, 40, 40);
  const ph = Math.floor(tick / 90) % 3;
  drawChar(g, edit, 20, 36, 1, tick, ph === 1 ? 'run' : ph === 2 ? 'air' : 'idle');
}, 33);

// ---------- buttons ----------
$('joinBtn').onclick = () => openCustom();
$('joinBtn2').onclick = () => openCustom();
$('handGo').onclick = () => { if (isMine() && phase() === 'ready') store.patch('turn', {start: Math.round(now())}); };
$('resumeBtn').onclick = togglePause;
$('inviteBtn').onclick = () => {
  const u = inviteUrl(), b = $('inviteBtn');
  (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(() => { b.textContent = 'Link copied'; }, () => { prompt('Share this link:', u); })
    .finally(() => setTimeout(() => { b.textContent = 'Copy invite link'; }, 1600));
};
$('chatForm').onsubmit = e => {
  e.preventDefault();
  const v = $('chatIn').value.trim().slice(0, 120);
  if (!v) return;
  const h = holder();
  const who = ONLINE ? (me.name || 'Guest') : (h ? h.name : 'Someone');
  const look = ONLINE ? me.look : h && h.look;
  say(who, v, look ? colorOf(look) : '#1d1a2f');
  $('chatIn').value = '';
  $('chatIn').blur();
};

heartbeat();
if (!ONLINE && !Object.keys(T().feed || {}).length) sys('Welcome to DE RIJ. Rooms get harder every 5.');
requestAnimationFrame(frame);
