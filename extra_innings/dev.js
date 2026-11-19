'use strict';
/* =========================================================
   DEV PANEL · a sandbox for testing that never touches the save file
   ---------------------------------------------------------
   Open it by typing dev() in the browser console (no hotkey until then).
   The first time it opens, saveGame() is switched off for the rest of
   the page's life, and trophies, endings and menu styles stop being
   written too (unless you switch GLOBAL UNLOCKS on). Your real save in
   localStorage ('ei_zone1') stays exactly as it was.
   · The panel sits beside the game: the game keeps running while it's open.
   · After dev() once, the ` key (backquote) shows and hides it.
   · Shift + click anywhere in the world teleports Nathan there.
   · Page jumps (warps, doors, dreams) carry the dev session along in this
     tab only; a plain reload brings your real save back.
   · Console helpers: dev.help()
   Loaded last, on every story page.
   ========================================================= */

const DEV_CARRY_KEY = 'ei_dev_carry';
const DEV_FLAGS = ['god', 'fly', 'infHype', 'infBalls', 'boxes', 'unlockAll', 'globals', 'bossIntro'];
const Dev = {
  on: false, shown: false, tab: 'player', snap: null, log: [], filter: '',
  god: false, fly: false, infHype: false, infBalls: false, boxes: false, unlockAll: false, globals: false, bossIntro: false,
  speed: 1, advance: 0, acc: 0, fps: 0, fpsN: 0, pending: null,

  // swallow every save from this point on (once per page load)
  arm(snap) {
    if (this.on) return;
    this.on = true;
    if (snap !== undefined) this.snap = snap;
    else { try { this.snap = JSON.stringify(Save.data); } catch (e) { logErr("dev.js: snapshot", e); this.snap = null; } }
    this.sync();
    this.note('SAVES DISABLED · SESSION ONLY');
  },
  // push the toggles into the engine and the corner badge
  sync() {
    OPT.god = this.god; OPT.infHype = this.infHype; OPT.boxes = this.boxes;
    window.DEV_LOCK = this.on && !this.globals;
    const b = devBadge();
    b.style.display = this.on ? 'block' : 'none';
    const bits = ['DEV · SAVES OFF'];
    if (this.speed !== 1) bits.push(this.speed === 0 ? 'FROZEN' : '×' + this.speed);
    if (this.fly) bits.push('FLY');
    if (this.god) bits.push('NO DMG');
    if (this.globals) bits.push('GLOBALS ON');
    b.textContent = bits.join(' · ');
  },
  note(msg) {
    this.log.unshift(msg); this.log = this.log.slice(0, 5);
    const el = document.getElementById('devLog');
    if (el) el.innerHTML = this.log.map(t => `<span>› ${t}</span>`).join('');
  },
  show(v) {
    if (v) this.arm();
    this.shown = v;
    devPanel().classList.toggle('show', v);
    if (v) this.paint();
  },
  set(flag, v) {
    this[flag] = v;
    if (flag === 'fly' && !v) { Player.vx = 0; Player.vy = 0; }
    this.sync(); this.paint();
  },
  // put the in-memory save back the way it was when the session started
  restore() {
    if (!this.snap) { this.note('NOTHING TO REVERT'); return; }
    let keep = null;
    try { keep = JSON.parse(this.snap); } catch (e) { logErr("dev.js: revert", e); return; }
    for (const k of Object.keys(Save.data)) delete Save.data[k];
    Object.assign(Save.data, keep);
    devRefresh();
    this.note('REVERTED TO SESSION START');
  },
  paint() {
    if (!this.shown) return;
    devPaintStats();
    $$('#devTabs [data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === this.tab));
    const body = document.getElementById('devBody');
    if (body) body.innerHTML = (DEV_TABS[this.tab] || DEV_TABS.player)();
    const f = document.getElementById('devFilter');
    if (f) { f.value = this.filter; }
  },
};

/* ---------- small helpers ---------- */
const devQ = () => Save.data.q;
function devRefresh() {
  // re-apply everything the save drives, and rebuild the room so NPCs match the new flags
  applyUpgrades();
  if (typeof applyOutfit === 'function') applyOutfit();
  if (Zone.room && !Story.active) enterRoom(Zone.room);
  Dev.paint();
}
function devBadge() {
  let el = document.getElementById('devBadge');
  if (!el) {
    el = document.createElement('div'); el.id = 'devBadge';
    el.style.cssText = 'position:fixed;left:10px;top:10px;z-index:61;display:none;font:600 10px ui-monospace,Menlo,monospace;' +
      'letter-spacing:.14em;color:#ff8a7a;background:rgba(20,10,12,.74);border:1px solid #ff5a4a;padding:4px 7px;border-radius:3px;pointer-events:none';
    document.body.appendChild(el);
  }
  return el;
}
const devZoneName = z => (ZONES[z] && ZONES[z].name) || (z === 'z11' ? 'The Overtime Abyss' : z.toUpperCase());
const devRoomZone = r => r.zone || PAGE.zoneOf(r.id);

/* ---------- warping ---------- */
// somewhere Nathan can stand: the room's bench, or the first floor tile near the middle
function devSpot(r) {
  const B = PAGE.benches.find(b => b.room === r.id);
  if (B) return B.pos;
  const cx = r.x0 + (r.tw >> 1), open = (tx, ty) => tileAt(tx, ty) === 0;
  for (let d = 0; d < r.tw / 2; d++) for (const tx of [cx - d, cx + d]) {
    for (let ty = r.y0 + 3; ty < r.y0 + r.th - 1; ty++) {
      const below = tileAt(tx, ty + 1);
      if (open(tx, ty) && open(tx, ty - 1) && open(tx, ty - 2) && (below === 1 || below === 3)) return { x: tx * TILE + TILE / 2, y: (ty + 1) * TILE };
    }
  }
  return { x: (r.x0 + r.tw / 2) * TILE, y: (r.y0 + r.th / 2) * TILE };
}
function devWarp(r, pos) {
  if (!r) return false;
  if (Story.active) { Dev.note('WAIT FOR THE CUTSCENE TO END'); return false; }
  if (typeof Cage !== 'undefined' && Cage.on) Cage.stop();
  // a warp mid scooter ride: cancel the ride so Nathan doesn't stay tucked away on the scooter
  if (typeof RIDE !== 'undefined' && !RIDE.tunnel) { RIDE.R = null; RIDE.dial = null; RIDE.arrive = null; RIDE.ride = false; window.EI_RIDE = false; }
  Player.hidden = false; Input.enabled = true;
  const P = Player, hp = P.hp;
  P.reset(pos || devSpot(r), true); P.hp = Math.min(hp, P.maxHp); P.invuln = 1;
  if (r !== Zone.room) enterRoom(r);
  snapCamera(); Game.fade = Math.max(Game.fade, 0.6); Game.fadeTarget = 0;
  Dev.note('WARP · ' + r.name.toUpperCase());
  return true;
}
// write the dev session into this tab so the next page picks it up instead of the real save
function devCarry(file) {
  const flags = {}; for (const k of DEV_FLAGS) flags[k] = Dev[k];
  try {
    sessionStorage.setItem(DEV_CARRY_KEY, JSON.stringify({ page: file, save: Save.data, snap: Dev.snap, flags, speed: Dev.speed, tab: Dev.tab, shown: Dev.shown, pending: Dev.pending, globals: Dev.globals }));
  } catch (e) { logErr("dev.js: carry", e); }
}
// a zone on another page: ride Renas's scooter there, then hop to the zone's first room
function devGoZone(z) {
  const page = z === 'z11' ? 'act3.html' : ZONES[z].page;
  const hash = page === 'zone1.html' ? 'bell-z1' : page === 'act3.html' ? 'bell-z9' : 'bell-' + z;
  if (page === PAGE_FILE) { devWarp(ROOMS.find(r => devRoomZone(r) === z)); return; }
  Dev.pending = { zone: z };
  Dev.note('TRAVELLING · ' + devZoneName(z).toUpperCase());
  goToPage(page + '#' + hash);
}
/* ---------- boss warps ---------- */
// each boss: its room, and a floor column just inside the arena door but before the fight trigger
const DEV_BOSS_WARPS = [
  { id: 'server',  name: 'ROGUE SERVER', page: 'zone1.html', zone: 'z1', room: 'server',     tx: 161, flag: 'bossDead' },
  { id: 'adam',    name: 'ADAM',         page: 'act1.html',  zone: 'z2', room: 'q_elevator', tx: 203, flag: 'adamDead' },
  { id: 'daniel',  name: 'DANIEL',       page: 'act1.html',  zone: 'z4', room: 'f_core',     tx: 803, flag: 'danielDead' },
  { id: 'fionn',   name: 'FIONN',        page: 'act2.html',  zone: 'z6', room: 'g_pedestal', tx: 18,  flag: 'fionnDead' },
  { id: 'milo',    name: 'MILO',         page: 'act2.html',  zone: 'z7', room: 's_fountain', tx: 243, flag: 'miloDead' },
  { id: 'deniz',   name: 'KING DENIZ',   page: 'act2.html',  zone: 'z8', room: 'i_throne',   tx: 342, flag: 'denizDead' },
  { id: 'evil',    name: 'EVIL ADAM',    page: 'act3.html',  zone: 'z9', room: 't_court',    tx: 325, flag: 'evilAdamDead' },
  { id: 'zennith', name: 'ZENNITH',      page: 'act3.html',  zone: 'z10', room: 'z_core',     tx: 326, flag: 'zennithDead' },
];
// the lowest floor near column tx inside room r
function devSpotAt(r, tx) {
  const open = (x, y) => tileAt(x, y) === 0;
  for (let d = 0; d < 10; d++) for (const x of [tx + d, tx - d]) {
    if (x <= r.x0 || x >= r.x0 + r.tw - 1) continue;
    for (let ty = r.y0 + r.th - 2; ty > r.y0 + 2; ty--) {
      const below = tileAt(x, ty + 1);
      if (open(x, ty) && open(x, ty - 1) && open(x, ty - 2) && (below === 1 || below === 3)) return { x: x * TILE + TILE / 2, y: (ty + 1) * TILE };
    }
  }
  return devSpot(r);
}
// put the boss back in the session save (beaten or not), optionally with its full first-time intro
function devBossReset(b) {
  const D = Save.data, q = D.q;
  D[b.flag] = false;
  if (Dev.bossIntro) {
    if (q.bossIntroSeen) delete q.bossIntroSeen[b.id];
    if (b.id === 'zennith') D.coreSeen = false;
  }
  q.pages = q.pages || {}; q.pages[b.page] = 1;   // the panel may cross into pages this save hasn't reached
}
// arrive at the arena on this page: rebuild the room with the boss in it, then step inside
function devBossArrive(b) {
  const r = ROOM[b.room];
  if (!r) { Dev.note('NO ROOM ' + b.room.toUpperCase() + ' ON THIS PAGE'); return; }
  if (Story.active) { Dev.note('WAIT FOR THE CUTSCENE TO END'); return; }
  if (Zone.boss) { Zone.boss = null; BossBar.hide(); }
  if (typeof Act !== 'undefined') Act.fightIntro = false;
  if (typeof Act2 !== 'undefined') Act2.fightIntro = false;
  if (typeof Act3 !== 'undefined') Act3.fightIntro = false;
  if (b.id === 'server' && typeof Z !== 'undefined' && Z.bossHole) { const h = Z.bossHole; fill(h.tx, h.ty, h.w, h.h, 1); }
  applyUpgrades();
  if (Zone.room === r) enterRoom(r);   // same room: rebuild it so the boss spawns again
  devWarp(r, devSpotAt(r, b.tx));
  Dev.note('BOSS · ' + b.name + (Dev.bossIntro ? ' · FULL INTRO' : ''));
  Dev.paint();
}
function devGoBoss(id) {
  const b = DEV_BOSS_WARPS.find(x => x.id === id);
  if (!b) return;
  if (Story.active) { Dev.note('WAIT FOR THE CUTSCENE TO END'); return; }
  devBossReset(b);
  if (b.page === PAGE_FILE) { devBossArrive(b); return; }
  Dev.pending = { boss: b.id };
  Dev.note('TRAVELLING · ' + b.name);
  const hash = b.page === 'zone1.html' ? 'bell-z1' : b.page === 'act3.html' ? 'bell-z9' : 'bell-' + b.zone;
  goToPage(b.page + '#' + hash);
}

// every page change during a session (doors, scooter, dreams, the panel) keeps the session going
const _devGo = goToPage;
goToPage = function (url) {
  const out = _devGo.apply(this, arguments);
  if (Dev.on) devCarry(url.split('#')[0]);
  return out;
};

/* ---------- the actions ---------- */
const DEV_UP = ['launcher', 'core', 'magnet', 'boom', 'bigboom', 'quill', 'compass', 'staticDash', 'tea', 'chillTea', 'heavy', 'maxBat', 'uppercut',
  'pinBench', 'pinVendor', 'pinBell', 'pinOre', 'pinPebble'];
const DEV_FRIENDS = ['josh', 'lars', 'danielDead', 'chase', 'renasMet', 'fionnDead', 'miloDead', 'denizDead'];
const DEV_BOSSES = ['bossDead', 'adamDead', 'danielDead', 'fionnDead', 'miloDead', 'denizDead', 'evilAdamDead', 'zennithDead'];
const DEV_QUESTS = { milo: [undefined, 'active', 'done'], deniz: [undefined, 'active', 'done'], immanuel: [undefined, 'active', 'done'], byte: [undefined, 'met', 'fixed'], abyss: [undefined, 'done'] };
const devDo = {
  // player
  god: () => Dev.set('god', !Dev.god),
  fly: () => Dev.set('fly', !Dev.fly),
  infHype: () => Dev.set('infHype', !Dev.infHype),
  infBalls: () => Dev.set('infBalls', !Dev.infBalls),
  heal: () => {
    const P = Player;
    P.hp = P.maxHp; P.hype = P.hypeMax || P.hype; P.dead = false;
    HUD.hpPop = true; SFX.heal();
    Dev.note('HEARTS + HYPE REFILLED');
  },
  hurt: () => { const P = Player; P.hp = Math.max(1, P.hp - 1); HUD.hpPop = true; Game.flashRed = 0.4; Dev.note('−1 HEART · ' + P.hp + ' LEFT'); },
  die: () => {
    const P = Player, was = Dev.god;
    Dev.god = false; OPT.god = false; P.invuln = 0; P.shield = 0; P.hp = 1; P.dashT = 0;
    P.hurt(P.facing || 1);
    Dev.god = was; Dev.sync();
    Dev.note(P.dead ? 'STRUCK OUT · RESPAWN TEST' : 'COULDN\'T KILL HIM HERE');
  },
  bolts: n => { Save.data.bolts += +n; HUD.boltBump = true; SFX.coin(); Dev.note(`+${n} SCRAP BOLTS`); },
  ore: () => { Save.data.ore += 5; Dev.note('+5 TITANIUM ORE'); },
  bat: () => { const D = Save.data; D.batLv = (D.batLv || 0) >= 3 ? 0 : (D.batLv || 0) + 1; applyUpgrades(); Dev.note('BAT LEVEL ' + D.batLv); },
  charms: () => { const D = Save.data; D.charms = (D.charms || 0) >= 5 ? 0 : 5; applyUpgrades(); Dev.note(D.charms + ' BAT CHARMS'); },
  moves: () => {
    const D = Save.data;
    D.abil = { dash: true, wall: true, double: true, launch: true, boom: true };
    D.up.core = true; D.up.launcher = true; D.up.boom = true; D.up.staticDash = true;
    applyUpgrades(); Dev.note('ALL MOVES + STATIC DASH');
  },
  stance: id => { if (typeof setStance === 'function') { setStance(id); Dev.note('STANCE · ' + id.toUpperCase()); } },
  outfit: id => {
    devQ().outfit = id;
    if (typeof applyOutfit === 'function') applyOutfit();
    Dev.note('OUTFIT · ' + id.toUpperCase());
  },
  // world
  speed: s => { Dev.speed = +s; Dev.acc = 0; Dev.advance = 0; Dev.sync(); Dev.note(Dev.speed === 0 ? 'WORLD FROZEN · USE STEP' : 'GAME SPEED ×' + Dev.speed); },
  // freezes first if needed; one 60 fps frame is two simulation steps
  frame: () => { if (Dev.speed !== 0) devDo.speed(0); Dev.advance += 2; Dev.note('STEPPED ONE FRAME'); },
  boxes: () => Dev.set('boxes', !Dev.boxes),
  kill: () => {
    let n = 0;
    for (const e of Enemies) if (!e.dead && e !== Zone.boss) { e.hp = 0; enemyDie(e); n++; }
    Dev.note(`KILLED ${n} ENEM${n === 1 ? 'Y' : 'IES'}`);
  },
  boss: () => {
    const b = Zone.boss;
    if (!b || b.dead) { Dev.note('NO BOSS IN THIS ROOM'); return; }
    b.hp = 1; Dev.note('BOSS DOWN TO 1 HP · ONE HIT LEFT');
  },
  respawn: () => { forgetKills(); enterRoom(Zone.room); Dev.note('ROOM RELOADED · ENEMIES BACK'); },
  map: () => {
    const D = Save.data;
    for (const z of Object.keys(ZONES)) D.maps[z] = true;
    D.map = true; D.up.quill = true; D.up.compass = true;
    for (const r of ROOMS) D.visited[r.id] = 1;
    Dev.note('EVERY MAP + QUILL + COMPASS');
  },
  bells: () => {
    const D = Save.data;
    for (const id of Object.keys(ZONES)) if (!ZONES[id].secret) D.bells[id] = 1;
    D.chase = true; D.renasMet = true;
    Dev.note('EVERY CALL BELL + RENAS');
  },
  // warp
  room: id => devWarp(ROOM[id]),
  zone: z => devGoZone(z),
  bossGo: id => devGoBoss(id),
  bossIntro: () => { Dev.set('bossIntro', !Dev.bossIntro); Dev.note(Dev.bossIntro ? 'BOSS WARPS PLAY THE FULL INTRO' : 'BOSS WARPS SKIP TO THE FIGHT'); },
  // progress
  friends: () => { const D = Save.data; for (const k of DEV_FRIENDS) D[k] = true; devRefresh(); Dev.note('EVERY FRIEND AT BASE CAMP'); },
  bosses: () => { const D = Save.data; for (const k of DEV_BOSSES) D[k] = true; D.stadium = true; devRefresh(); Dev.note('EVERY BOSS MARKED BEATEN'); },
  ups: () => {
    const D = Save.data;
    for (const k of DEV_UP) D.up[k] = true;
    D.abil = { dash: true, wall: true, double: true, launch: true, boom: true };
    D.batLv = 3; D.charms = 5;
    devRefresh(); Dev.note('EVERY UPGRADE · BAT III · 5 CHARMS');
  },
  pebbles: () => {
    const D = Save.data;
    if (typeof PEBBLES !== 'undefined') for (const p of PEBBLES) D.pebbles[p.id] = 1;
    for (let i = 0; Object.keys(D.pebbles).length < PEBBLE_TOTAL; i++) D.pebbles['dev' + i] = 1;
    devRefresh(); Dev.note(`ALL ${PEBBLE_TOTAL} LUCKY PEBBLES`);
  },
  sparebat: () => { Save.data.spareBat = true; devRefresh(); Dev.note('SPARE BAT IN YOUR BAG'); },
  truend: () => { devDo.friends(); devDo.pebbles(); devDo.sparebat(); Dev.note('TRUE ENDING READY: ' + (trueEndingReady() ? 'YES' : 'NOT YET')); },
  quests: () => {
    const D = Save.data, q = devQ();
    q.milo = 'done'; q.deniz = 'done'; q.immanuel = 'done'; q.byte = 'fixed'; q.abyss = 'done'; q.chalk = 1;
    D.up.uppercut = true; D.up.chillTea = true;
    devRefresh(); Dev.note('SIDE QUESTS DONE (+ THEIR REWARDS)');
  },
  badges: () => {
    const q = devQ(); q.badges = q.badges || {};
    if (typeof LOADOUT !== 'undefined') for (const b of LOADOUT) q.badges[b.id] = 1;
    q.notchBuy = 2;
    devRefresh(); Dev.note('EVERY BADGE OWNED (PIN THEM AT A BENCH)');
  },
  unlockAll: () => { Dev.set('unlockAll', !Dev.unlockAll); devRefresh(); },
  sudden: () => { const q = devQ(); q.sudden = !q.sudden; Dev.note('SUDDEN DEATH · ' + (q.sudden ? 'ON' : 'OFF')); },
  cagePrize: () => { const c = devQ().cage = devQ().cage || { best: 0, bestCombo: 0, prize: 0 }; c.prize = 1; (devQ().badges = devQ().badges || {}).goldbat = 1; devRefresh(); Dev.note('CAGE PRIZE · GOLD BAT BADGE'); },
  cage95: () => {
    if (typeof Cage === 'undefined' || !Cage.on) { Dev.note('START A CAGE ROUND FIRST'); return; }
    Cage.combo = 95; Cage.bestRun = Math.max(Cage.bestRun || 0, 95); Dev.note('CAGE COMBO 95 · FIVE MORE');
  },
  essences: () => { const q = devQ(); q.dream = q.dream || {}; for (const d of DREAMS) q.dream[d.k] = 1; devRefresh(); Dev.note('ALL 4 ASTRAL ESSENCES'); },
  dream: k => {
    const q = devQ();
    q.dreamPrev = !!q.pages['act3.html']; q.dreamFrom = 'z1';
    Dev.note('DRIFTING OFF · ' + k.toUpperCase());
    goToPage('act3.html#dream-' + k);
  },
  globals: () => { Dev.set('globals', !Dev.globals); Dev.note(Dev.globals ? 'TROPHIES / ENDINGS / STYLES WILL SAVE' : 'TROPHIES / ENDINGS / STYLES BLOCKED'); },
  // flags
  flag: path => {
    const [a, b] = path.split('.'), D = Save.data;
    if (a === 'q') {
      const opts = DEV_QUESTS[b], i = opts.indexOf(D.q[b]);
      D.q[b] = opts[(i + 1) % opts.length];
      if (D.q[b] === undefined) delete D.q[b];
    } else if (b) D[a][b] = !D[a][b];
    else D[a] = !D[a];
    devRefresh();
  },
  reroom: () => { devRefresh(); Dev.note('ROOM REBUILT'); },
  // save
  copy: () => {
    const txt = JSON.stringify(Save.data);
    try { navigator.clipboard.writeText(txt).then(() => Dev.note('SAVE COPIED TO CLIPBOARD'), e => { logErr('dev.js: clipboard', e); console.log(txt); Dev.note('CLIPBOARD BLOCKED · PRINTED TO CONSOLE'); }); }
    catch (e) { logErr('dev.js: clipboard', e); console.log(txt); Dev.note('PRINTED TO CONSOLE'); }
  },
  load: () => {
    const t = document.getElementById('devJson');
    if (!t || !t.value.trim()) { Dev.note('PASTE A SAVE FIRST'); return; }
    devLoad(t.value);
  },
  revert: () => Dev.restore(),
  end: () => {
    try { sessionStorage.removeItem(DEV_CARRY_KEY); } catch (e) { logErr('dev.js: end', e); }
    let real = null; try { real = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { logErr('dev.js: end', e); }
    window.DEV_LOCK = false;
    location.href = !real ? 'index.html' : (ZONES[real.where] || {}).page || 'zone1.html';
  },
};
function devLoad(json) {
  let d = null;
  try { d = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { logErr('dev.js: load', e); Dev.note('NOT VALID SAVE JSON'); return false; }
  if (!d || typeof d !== 'object' || !d.abil) { Dev.note('THAT DOESN\'T LOOK LIKE A SAVE'); return false; }
  const f = Save.fresh();
  for (const k of Object.keys(Save.data)) delete Save.data[k];
  Object.assign(Save.data, f, d, { abil: Object.assign(f.abil, d.abil), up: Object.assign(f.up, d.up), q: d.q || {} });
  devRefresh(); Dev.note('SAVE LOADED INTO THIS SESSION');
  return true;
}

/* ---------- the tabs ---------- */
const devBtn = (act, label, arg, on) => `<button class="dv-b${on === true ? ' on' : on === false ? ' off' : ''}" data-dev="${act}"${arg !== undefined ? ` data-arg="${arg}"` : ''}>${label}${on === undefined ? '' : `<i>${on ? 'ON' : 'OFF'}</i>`}</button>`;
const devHead = t => `<p class="dv-h">${t}</p>`;
const devGrid = (html, cols) => `<div class="dv-g${cols === 1 ? ' one' : cols === 3 ? ' three' : ''}">${html}</div>`;
const DEV_TABS = {
  player() {
    const D = Save.data;
    let h = devHead('CHEATS') + devGrid(
      devBtn('god', 'NO DAMAGE', undefined, Dev.god) + devBtn('fly', 'FLY / NOCLIP', undefined, Dev.fly) +
      devBtn('infHype', 'INFINITE HYPE', undefined, Dev.infHype) + devBtn('infBalls', 'INFINITE BALLS', undefined, Dev.infBalls));
    h += devHead('HEALTH') + devGrid(devBtn('heal', 'FULL HEAL') + devBtn('hurt', '−1 HEART') + devBtn('die', 'STRIKE OUT'), 3);
    h += devHead('STUFF') + devGrid(
      devBtn('bolts', '+100 BOLTS', 100) + devBtn('bolts', '+1000 BOLTS', 1000) + devBtn('ore', '+5 TITANIUM') +
      devBtn('bat', `BAT LV ${D.batLv || 0} → ${(D.batLv || 0) >= 3 ? 0 : (D.batLv || 0) + 1}`) + devBtn('charms', (D.charms || 0) >= 5 ? 'CHARMS → 0' : 'CHARMS → 5') + devBtn('moves', 'ALL MOVES'), 3);
    if (typeof STANCES !== 'undefined') {
      const now = stanceNow().id;
      h += devHead('STANCE' + (Dev.unlockAll ? '' : ' · LOCKED ONES NEED “UNLOCK ALL GEAR”')) +
        devGrid(STANCES.map(s => devBtn('stance', s.name.replace(' Stance', '').toUpperCase(), s.id, s.id === now ? true : s.have(D) ? undefined : false)).join(''));
    }
    if (typeof OUTFITS !== 'undefined') {
      const now = outfitNow().id;
      h += devHead('OUTFIT') + devGrid(OUTFITS.map(o => devBtn('outfit', o.name.toUpperCase(), o.id, o.id === now ? true : o.have(D) ? undefined : false)).join(''));
    }
    return h;
  },
  world() {
    let h = devHead('GAME SPEED') + devGrid([0, 0.25, 0.5, 1, 2, 3].map(s => devBtn('speed', s === 0 ? 'FREEZE' : '×' + s, s, Dev.speed === s ? true : undefined)).join(''), 3);
    h += devGrid(devBtn('frame', 'STEP ONE FRAME ▸'), 1);
    h += devHead('ROOM') + devGrid(
      devBtn('kill', 'KILL ENEMIES') + devBtn('boss', 'BOSS → 1 HP') + devBtn('respawn', 'RESPAWN ENEMIES') + devBtn('boxes', 'HITBOXES', undefined, Dev.boxes));
    h += devHead('MAPS & TRAVEL') + devGrid(devBtn('map', 'REVEAL ALL MAPS') + devBtn('bells', 'ALL FAST TRAVEL'));
    h += `<p class="dv-tip">Shift + click in the world to teleport there.</p>`;
    return h;
  },
  warp() {
    const here = Zone.room && Zone.room.id, zones = [];
    for (const r of ROOMS) { const z = devRoomZone(r); if (!zones.includes(z)) zones.push(z); }
    let h = devHead('BOSSES · BEATEN ONES COME BACK FOR THIS SESSION') + devGrid(DEV_BOSS_WARPS.map(b =>
      devBtn('bossGo', (b.page === PAGE_FILE ? '' : '↗ ') + b.name + (Save.data[b.flag] ? ' ✓' : ''), b.id, Zone.room && Zone.room.id === b.room ? true : undefined)).join(''));
    h += devGrid(devBtn('bossIntro', 'FULL INTRO CUTSCENE', undefined, Dev.bossIntro), 1);
    for (const z of zones) {
      h += devHead(devZoneName(z).toUpperCase()) + devGrid(ROOMS.filter(r => devRoomZone(r) === z)
        .map(r => devBtn('room', (r.secret ? '★ ' : '') + r.name.replace(/^The /, '').toUpperCase(), r.id, r.id === here ? true : undefined)).join(''));
    }
    const away = [...Object.keys(ZONES), 'z11'].filter(z => !zones.includes(z) && (z === 'z11' || ZONES[z].page !== PAGE_FILE));
    if (away.length) h += devHead('OTHER PAGES · THE SESSION COMES ALONG') + devGrid(away.map(z => devBtn('zone', devZoneName(z).replace(/^The /, '').toUpperCase(), z)).join(''));
    if (typeof DREAMS !== 'undefined') h += devHead('DREAM REMATCHES') + devGrid(DREAMS.map(d => devBtn('dream', d.k.toUpperCase() + ' DREAM', d.k)).join(''));
    return h;
  },
  progress() {
    const q = devQ();
    let h = devHead('STORY') + devGrid(
      devBtn('friends', 'RESCUE ALL FRIENDS') + devBtn('bosses', 'BEAT ALL BOSSES') + devBtn('ups', 'EVERY UPGRADE') +
      devBtn('pebbles', 'ALL 50 PEBBLES') + devBtn('sparebat', 'SPARE BAT') + devBtn('truend', 'TRUE ENDING READY'));
    h += devHead('EXTRAS') + devGrid(
      devBtn('quests', 'SIDE QUESTS DONE') + devBtn('badges', 'ALL BADGES') + devBtn('unlockAll', 'UNLOCK ALL GEAR', undefined, Dev.unlockAll) +
      devBtn('sudden', 'SUDDEN DEATH', undefined, !!q.sudden));
    h += devHead('CAGE & DREAMS') + devGrid(devBtn('cage95', 'CAGE COMBO → 95') + devBtn('cagePrize', 'CAGE PRIZE') + devBtn('essences', 'ALL 4 ESSENCES'));
    h += devHead('OUTSIDE THIS SAVE') + devGrid(devBtn('globals', 'GLOBAL UNLOCKS', undefined, Dev.globals), 1);
    h += `<p class="dv-tip">Off: trophies, endings and menu styles you earn now are not kept. On: they are written for real.</p>`;
    return h;
  },
  flags() {
    return `<input id="devFilter" class="dv-in" placeholder="filter… (e.g. dead, up., q.)" spellcheck="false">` +
      devGrid(devBtn('reroom', 'REBUILD ROOM'), 1) + `<div id="devFlagList">${devFlagRows()}</div>`;
  },
  save() {
    let bytes = 0; try { bytes = JSON.stringify(Save.data).length; } catch (e) { logErr("dev.js: size", e); }
    return devHead('THIS SESSION · ' + bytes + ' BYTES') + devGrid(devBtn('copy', 'COPY SAVE JSON') + devBtn('revert', 'REVERT SESSION')) +
      `<textarea id="devJson" class="dv-in" rows="4" placeholder="paste a save here…" spellcheck="false"></textarea>` +
      devGrid(devBtn('load', 'LOAD PASTED SAVE'), 1) +
      devHead('DONE TESTING') + devGrid(devBtn('end', 'END SESSION · BACK TO REAL SAVE'), 1) +
      `<p class="dv-tip">Nothing here is ever written to your real save. Copy a save to keep a test setup.</p>`;
  },
};
const DEV_TAB_NAMES = [['player', 'PLAYER'], ['world', 'WORLD'], ['warp', 'WARP'], ['progress', 'PROGRESS'], ['flags', 'FLAGS'], ['save', 'SAVE']];
function devFlagRows() {
  const D = Save.data, f = Dev.filter.toLowerCase(), rows = [];
  for (const k of Object.keys(D)) if (typeof D[k] === 'boolean') rows.push([k, D[k]]);
  for (const k of new Set([...DEV_UP, ...Object.keys(D.up)])) rows.push(['up.' + k, !!D.up[k]]);
  for (const k of Object.keys(D.abil)) rows.push(['abil.' + k, !!D.abil[k]]);
  for (const k of Object.keys(DEV_QUESTS)) rows.push(['q.' + k, D.q[k] || '—']);
  return rows.filter(([k]) => !f || k.toLowerCase().includes(f)).map(([k, v]) =>
    `<button class="dv-row" data-dev="flag" data-arg="${k}"><span>${k}</span><b class="${v === true || v === 'done' || v === 'fixed' ? 'y' : v === false || v === '—' ? 'n' : ''}">${v === true ? 'YES' : v === false ? 'no' : v}</b></button>`).join('')
    || '<p class="dv-tip">No flag matches that.</p>';
}

/* ---------- live numbers at the top ---------- */
function devPaintStats() {
  const el = document.getElementById('devStats'); if (!el) return;
  const D = Save.data, P = Player, b = Zone.boss && !Zone.boss.dead ? Zone.boss : null;
  const foes = Enemies.filter(e => !e.dead).length;
  const cell = (k, v) => `<span><em>${k}</em> <b>${v}</b></span>`;
  el.innerHTML = [
    cell('ZONE', devZoneName(PAGE.zoneHere())),
    cell('ROOM', Zone.room ? Zone.room.id : '—'),
    cell('TILE', `${Math.floor((P.x + P.w / 2) / TILE)}, ${Math.floor((P.y + P.h) / TILE)}`),
    cell('HEARTS', `${P.hp} / ${P.maxHp}`),
    cell('HYPE', `${Math.round(P.hype || 0)} / ${P.hypeMax || 99}`),
    cell('BOLTS', D.bolts),
    cell('ENEMIES', foes + (b ? ` · BOSS ${b.constructor.name}${typeof b.hp === 'number' ? ' ' + Math.ceil(b.hp) + ' HP' : ''}` : '')),
    cell('FPS', Dev.fps + (Dev.speed !== 1 ? ` · ×${Dev.speed}` : '')),
  ].join('');
}

/* ---------- the panel itself ---------- */
function devPanel() { return document.getElementById('devPanel'); }
(function buildDevPanel() {
  const css = document.createElement('style');
  css.textContent = `
    #devPanel{position:fixed;right:12px;top:12px;z-index:60;width:300px;max-height:calc(100vh - 24px);display:none;flex-direction:column;background:rgba(8,12,18,.95);border:2px solid #22303f;border-radius:4px;box-shadow:0 12px 34px rgba(0,0,0,.62);color:#8fa3bd;font:10px/1.4 ui-monospace,Menlo,Consolas,monospace;text-align:left}
    #devPanel.show{display:flex}
    #devPanel header{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px 6px;border-bottom:1px solid #1e2a37;cursor:move;user-select:none}
    #devPanel header .t{font-size:9px;letter-spacing:2px;color:#5ce1a6}
    #devPanel header .s{font-size:8px;letter-spacing:1.2px;padding:2px 5px;border:1px solid #ff5a4a;color:#ff8a7a;background:rgba(255,90,74,.08)}
    #devPanel header button{font:inherit;font-size:12px;line-height:1;padding:1px 7px;background:#131b24;color:#c9d4e3;border:2px solid #33465c;border-radius:3px;cursor:pointer}
    #devStats{display:grid;grid-template-columns:1fr 1fr;gap:0 8px;padding:6px 10px;font-size:9px;border-bottom:1px solid #1e2a37}
    #devStats span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    #devStats em{font-style:normal;color:#4d5b70} #devStats b{color:#c9d4e3;font-weight:600}
    #devTabs{display:flex;flex-wrap:wrap;gap:2px;padding:6px 10px 0}
    #devTabs button{flex:1;font:inherit;font-size:8.5px;letter-spacing:.06em;padding:4px 2px;background:transparent;color:#6b7d94;border:1px solid #22303f;border-bottom:none;border-radius:3px 3px 0 0;cursor:pointer}
    #devTabs button.on{background:#131b24;color:#5ce1a6;border-color:#33465c}
    #devBody{overflow:auto;padding:4px 10px 8px;border-top:1px solid #33465c;flex:1}
    #devPanel.min #devStats,#devPanel.min #devTabs,#devPanel.min #devBody,#devPanel.min #devLog{display:none}
    .dv-h{margin:8px 0 4px;font-size:8.5px;letter-spacing:.14em;color:#4d5b70}
    .dv-g{display:grid;grid-template-columns:1fr 1fr;gap:4px} .dv-g.one{grid-template-columns:1fr;margin-top:4px} .dv-g.three{grid-template-columns:1fr 1fr 1fr}
    .dv-b{position:relative;font:inherit;font-size:9px;letter-spacing:.03em;line-height:1.2;padding:6px 7px;text-align:left;background:#131b24;color:#c9d4e3;border:2px solid #33465c;border-radius:3px;cursor:pointer}
    .dv-b:hover{border-color:#5a7896;color:#fff}
    .dv-b i{font-style:normal;opacity:.7;margin-left:5px}
    .dv-b.on{border-color:#5ce1a6;color:#5ce1a6}
    .dv-b.off{opacity:.45}
    .dv-row{display:flex;justify-content:space-between;width:100%;font:inherit;font-size:9.5px;padding:3px 6px;background:transparent;color:#c9d4e3;border:none;border-bottom:1px solid #16202b;cursor:pointer;text-align:left}
    .dv-row:hover{background:#131b24}
    .dv-row b.y{color:#5ce1a6} .dv-row b.n{color:#4d5b70;font-weight:400}
    .dv-in{box-sizing:border-box;width:100%;margin-top:6px;font:inherit;font-size:9.5px;padding:5px 6px;background:#0d131a;color:#c9d4e3;border:1px solid #33465c;border-radius:3px;resize:vertical}
    .dv-tip{margin:6px 0 0;font-size:8.5px;color:#4d5b70}
    #devLog{padding:5px 10px 8px;font-size:9px;color:#5ce1a6;display:flex;flex-direction:column;gap:1px;border-top:1px solid #1e2a37}`;
  document.head.appendChild(css);
  const el = document.createElement('div');
  el.id = 'devPanel';
  el.innerHTML = `
    <header><span class="t">DEV PANEL</span><span style="display:flex;align-items:center;gap:5px">
      <span class="s" title="saveGame() is off until you reload this page">SAVES OFF</span>
      <button data-ui="min" title="Fold up">–</button><button data-ui="close" title="Close (\` or dev())">×</button></span></header>
    <div id="devStats"></div>
    <div id="devTabs">${DEV_TAB_NAMES.map(([id, n]) => `<button data-tab="${id}">${n}</button>`).join('')}</div>
    <div id="devBody"></div>
    <div id="devLog"></div>`;
  document.body.appendChild(el);
  // buttons never take keyboard focus, so Space/Enter keep driving the game
  el.addEventListener('mousedown', ev => { if (ev.target.closest('button')) ev.preventDefault(); });
  el.addEventListener('click', ev => {
    const ui = ev.target.closest('[data-ui]'), tab = ev.target.closest('[data-tab]'), btn = ev.target.closest('[data-dev]');
    if (ui) { SFX.ui(); if (ui.dataset.ui === 'close') Dev.show(false); else el.classList.toggle('min'); return; }
    if (tab) { SFX.ui(); Dev.tab = tab.dataset.tab; Dev.paint(); return; }
    if (!btn) return;
    SFX.ui();
    const fn = devDo[btn.dataset.dev];
    if (!fn) return;
    try { fn(btn.dataset.arg); } catch (e) { logErr('dev.js: ' + btn.dataset.dev, e); Dev.note('THAT FAILED · SEE CONSOLE'); }
    if (btn.dataset.dev === 'flag') { const L = document.getElementById('devFlagList'); if (L) L.innerHTML = devFlagRows(); devPaintStats(); }
    else Dev.paint();
  });
  el.addEventListener('input', ev => {
    if (ev.target.id !== 'devFilter') return;
    Dev.filter = ev.target.value;
    const L = document.getElementById('devFlagList'); if (L) L.innerHTML = devFlagRows();
  });
  // drag it around by the title bar
  const head = el.querySelector('header');
  head.addEventListener('pointerdown', ev => {
    if (ev.target.closest('button')) return;
    const r = el.getBoundingClientRect(), ox = ev.clientX - r.left, oy = ev.clientY - r.top;
    const move = e => { el.style.left = Math.max(0, Math.min(innerWidth - 60, e.clientX - ox)) + 'px'; el.style.top = Math.max(0, Math.min(innerHeight - 30, e.clientY - oy)) + 'px'; el.style.right = 'auto'; };
    const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); };
    addEventListener('pointermove', move); addEventListener('pointerup', up);
  });
  setInterval(() => { Dev.fps = Dev.fpsN * 2; Dev.fpsN = 0; if (Dev.shown) devPaintStats(); }, 500);
})();

/* ---------- engine hooks ---------- */
// nothing may be written to the save file while dev is on
const _devSaveGame = saveGame;
saveGame = function () { if (Dev.on) return; return _devSaveGame.apply(this, arguments); };
const _devHurt = Player.hurt;
Player.hurt = function (dir) { if (Dev.god || Dev.fly) return; return _devHurt.call(this, dir); };
// fly: no gravity, no walls, hold dash to go faster
const _devUpdate = Player.update;
Player.update = function (dt) {
  if (!Dev.fly || this.dead) return _devUpdate.call(this, dt);
  const ix = (Input.down('right') ? 1 : 0) - (Input.down('left') ? 1 : 0);
  const iy = (Input.down('down') ? 1 : 0) - (Input.down('up') || Input.down('jump') ? 1 : 0);
  const sp = Input.down('dash') ? 1100 : 460;
  this.vx = ix * sp; this.vy = iy * sp; this.x += this.vx * dt; this.y += this.vy * dt;
  if (ix) this.facing = ix;
  this.onGround = false; this.hazard = false; this.invuln = Math.max(this.invuln, 0.2);
  this.attackT = Math.max(0, this.attackT - dt);
};
// game speed, freeze and single-frame steps
const _devStep = step;
step = function (dt) {
  if (!Dev.on || Dev.speed === 1) { _devStep(dt); devPerStep(); return; }
  if (Dev.speed === 0) { if (Dev.advance > 0) { Dev.advance--; _devStep(dt); devPerStep(); } return; }
  Dev.acc += Dev.speed;
  while (Dev.acc >= 1) { Dev.acc -= 1; _devStep(dt); devPerStep(); }
};
function devPerStep() {
  if (Dev.infBalls && !Player.dead) Player.balls = TUNE.ballCount;
}
const _devRender = render;
render = function () { _devRender.apply(this, arguments); Dev.fpsN++; };
// "unlock all gear": every outfit, stance and badge notch, for this session only
if (typeof OUTFITS !== 'undefined') for (const o of OUTFITS) { const h = o.have; o.have = D => Dev.unlockAll || h(D); }
if (typeof STANCES !== 'undefined') for (const s of STANCES) { const h = s.have; s.have = D => Dev.unlockAll || h(D); }
if (typeof Loadout !== 'undefined') {
  const _devOwned = Loadout.owned, _devNotches = Loadout.notches;
  Loadout.owned = function (id) { return Dev.unlockAll || _devOwned.call(this, id); };
  Loadout.notches = function () { return _devNotches.call(this) + (Dev.unlockAll ? 8 : 0); };
}
// shift + click: teleport
cv.addEventListener('pointerdown', ev => {
  if (!Dev.on || !ev.shiftKey || !started || Story.active) return;
  ev.preventDefault();
  const x = Game.cam.x + ev.clientX * DPR / SCALE, y = Game.cam.y + ev.clientY * DPR / SCALE;
  const r = roomAt(x, y);
  if (!r) { Dev.note('NO ROOM THERE'); return; }
  const P = Player;
  if (r !== Zone.room) devWarp(r, { x, y: y + P.h / 2 });
  else { P.x = x - P.w / 2; P.y = y - P.h / 2; P.vx = P.vy = 0; P.invuln = Math.max(P.invuln, 0.5); Dev.note('TELEPORT · TILE ' + Math.floor(x / TILE) + ', ' + Math.floor(y / TILE)); }
});

/* ---------- keyboard: typing in the panel never moves Nathan ---------- */
addEventListener('keydown', e => {
  const t = e.target;
  if (t && t.closest && t.closest('#devPanel') && /^(INPUT|TEXTAREA)$/.test(t.tagName)) {
    e.stopImmediatePropagation();
    if (e.code === 'Escape') t.blur();
    return;
  }
  if (Dev.on && e.code === 'Backquote' && !e.repeat) { e.preventDefault(); e.stopImmediatePropagation(); Dev.show(!Dev.shown); }
}, true);

/* ---------- arriving from another page mid-session ---------- */
if (typeof DEV_CARRY !== 'undefined' && DEV_CARRY) {
  const C = DEV_CARRY;
  Object.assign(Dev, C.flags || {}, { speed: C.speed === undefined ? 1 : C.speed, tab: C.tab || 'player', pending: null });
  Dev.arm(C.snap || null);
  if (C.shown) Dev.show(true);
  const want = C.pending && C.pending.zone;
  if (want) {
    let tries = 0;
    const go = () => {
      if (++tries > 60) return;
      if (!started || Story.active || !Zone.room) { setTimeout(go, 200); return; }
      if (PAGE.zoneHere() !== want) devWarp(ROOMS.find(r => devRoomZone(r) === want));
    };
    setTimeout(go, 300);
  }
  const boss = C.pending && C.pending.boss && DEV_BOSS_WARPS.find(b => b.id === C.pending.boss);
  if (boss) {
    let tries = 0;
    const go = () => {
      if (++tries > 60) return;
      if (!started || Story.active || !Zone.room) { setTimeout(go, 200); return; }
      devBossArrive(boss);
    };
    setTimeout(go, 300);
  }
}

/* ---------- console: dev() opens and closes the panel ---------- */
window.dev = function () {
  if (Dev.shown) { Dev.show(false); return 'Dev panel hidden. Press ` or type dev() to bring it back.'; }
  if (!started) return 'Not yet: wait for the game to start, then try dev() again.';
  Dev.show(true);
  return 'Dev panel open. Nothing is saved until you reload the page. ` toggles it, Shift + click teleports, dev.help() lists console commands.';
};
Object.assign(window.dev, {
  help() {
    console.log([
      'dev()                 show / hide the panel (also the ` key once it has been opened)',
      'dev.rooms()           list the rooms on this page',
      'dev.warp("t_colo")    warp to a room on this page, or a zone: dev.warp("z7")',
      'dev.boss("deniz")     warp to a boss arena (beaten bosses come back): server adam daniel fionn milo deniz evil zennith',
      'dev.tp(x, y)          teleport to a tile position',
      'dev.get("up.core")    read a save value     dev.set("bolts", 999)   write one',
      'dev.speed(0.5)        game speed (0 = frozen)',
      'dev.god() dev.fly()   toggle no damage / fly',
      'dev.kill()            kill every enemy in the room',
      'dev.save()            the session save as JSON     dev.load(json)   load one',
      'dev.end()             end the session and go back to your real save',
    ].join('\n'));
    return 'Commands listed above.';
  },
  rooms() { console.table(ROOMS.map(r => ({ id: r.id, name: r.name, zone: devRoomZone(r), secret: !!r.secret }))); return ROOMS.length + ' rooms on this page.'; },
  warp(id) {
    Dev.arm();
    if (ROOM[id]) return devWarp(ROOM[id]) ? 'Warped to ' + ROOM[id].name + '.' : 'Not right now.';
    if (ZONES[id] || id === 'z11') { devGoZone(id); return 'Going to ' + devZoneName(id) + '.'; }
    return `No room or zone "${id}" here. dev.rooms() lists this page's rooms.`;
  },
  boss(id) {
    Dev.arm();
    if (!DEV_BOSS_WARPS.some(b => b.id === id)) return 'Bosses: ' + DEV_BOSS_WARPS.map(b => b.id).join(', ');
    devGoBoss(id); return Dev.log[0];
  },
  tp(tx, ty) {
    Dev.arm();
    const x = tx * TILE + TILE / 2, y = ty * TILE, r = roomAt(x, y - 4);
    if (!r) return 'That tile is outside every room.';
    devWarp(r, { x, y }); return `Teleported to tile ${tx}, ${ty}.`;
  },
  get(path) { return path.split('.').reduce((o, k) => (o == null ? o : o[k]), Save.data); },
  set(path, v) {
    Dev.arm();
    const ks = path.split('.'), last = ks.pop();
    const o = ks.reduce((a, k) => (a[k] = a[k] && typeof a[k] === 'object' ? a[k] : {}), Save.data);
    o[last] = v; devRefresh();
    return `${path} = ${JSON.stringify(v)}`;
  },
  speed(s) { Dev.arm(); devDo.speed(Math.max(0, Math.min(4, +s || 0))); Dev.paint(); return 'Game speed ×' + Dev.speed; },
  god(v) { Dev.arm(); Dev.set('god', v === undefined ? !Dev.god : !!v); return 'No damage ' + (Dev.god ? 'on' : 'off'); },
  fly(v) { Dev.arm(); Dev.set('fly', v === undefined ? !Dev.fly : !!v); return 'Fly ' + (Dev.fly ? 'on' : 'off'); },
  kill() { Dev.arm(); devDo.kill(); return Dev.log[0]; },
  save() { return JSON.stringify(Save.data); },
  load(json) { Dev.arm(); return devLoad(json) ? 'Save loaded into this session.' : Dev.log[0]; },
  end() { devDo.end(); return 'Back to your real save…'; },
});
