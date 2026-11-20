'use strict';
/* =========================================================
   STORY PAGES · COMMON
   Save file, toasts, modals, pause, shops, fast travel, HUD,
   camera, simulation step and main loop. Shared by zone1.html
   (Zone 1) and act1.html (Zones 2–4). Each page fills in PAGE.
   ========================================================= */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
function drill() {}            // test-room drills don't exist here
function drillProgress() {}

// Page-specific settings & callbacks (filled in by each page's main.js)
const PAGE = {
  id: 'z1', benches: [], benchKey: 'bench',
  zoneOf: () => 'z1',          // room id → zone id
  zoneHere: () => 'z1',        // zone the player is standing in
  start() {}, interact: null, physics: null, update: null, tick: null, onRespawn: null, lockRoom: null, arriveAtBell: null,
};

/* ---------- Save: one file for the whole of Act I ---------- */
const SAVE_KEY = 'ei_zone1';
const Save = {
  data: null,
  fresh() {
    return { introSeen: false, abil: { dash: true, wall: true, double: false, launch: false, boom: false }, map: false, reshman: false,
      visited: {}, bolts: 0, up: { launcher: false, core: false, magnet: false, boom: false, bigboom: false }, bossDead: false, josh: false, gate: false,
      crates: {}, bench: 0, deaths: 0, time: 0, cleared: false,
      // Phase 3 · Act I
      where: 'z1', bench2: 0, maps: {}, reshman2: false, lars: false, ores: {}, ore: 0, batLv: 0, seenZones: {},
      adamDead: false, renasMet: false, chase: false, bells: {}, danielDead: false, walls: {}, spareBat: false, actCleared: false, reshmanMet: {},
      // Phase 4 · Act II
      bench3: 0, concourse: false, pebbles: {}, pebblesGiven: 0, charms: 0, fionnQuest: false, pennants: {}, slots: {}, gateOpen: false,
      fionnDead: false, miloDead: false, denizDead: false, teaDrunk: false,
      // Phase 5 · Act III & the Endgame
      bench4: 0, stadium: false, adamAssist: false, evilAdamDead: false, endingA: false, coreOpen: false, zennithDead: false, trueEnding: false,
      // Side quests (zone/quests.js)
      q: {} };
  }
};
const RAW_ARRIVE = location.hash.slice(1);   // 'new', 'bell-z2', 'from-z1', … (checked against the save below)
const PAGE_FILE = location.pathname.split('/').pop() || 'index.html';
let SAVE_EXISTED = false;
// dev() page jumps: the session's save rides along in this tab exactly once and is never written back
let DEV_CARRY = null;
try { DEV_CARRY = JSON.parse(sessionStorage.getItem('ei_dev_carry') || 'null'); sessionStorage.removeItem('ei_dev_carry'); } catch (e) { logErr("zone/common.js: dev carry", e); }
if (DEV_CARRY && (DEV_CARRY.page !== PAGE_FILE || !DEV_CARRY.save || RAW_ARRIVE === 'new')) DEV_CARRY = null;
if (DEV_CARRY) window.DEV_LOCK = !DEV_CARRY.globals;
(function loadSave() {
  let d = null;
  // only the Zone 1 page may start a new game: act1.html#new must not wipe your save
  if (DEV_CARRY) d = DEV_CARRY.save;
  else if (RAW_ARRIVE === 'new' && PAGE_FILE === 'zone1.html') { try { localStorage.removeItem(SAVE_KEY); } catch (e) { logErr("zone/common.js:44", e); } }
  else { try { d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { logErr("zone/common.js:45", e); } }
  SAVE_EXISTED = !!d;
  if (RAW_ARRIVE) { try { history.replaceState(null, '', location.pathname); } catch (e) { logErr("zone/common.js:46", e); } }
  const f = Save.fresh();
  Save.data = d ? Object.assign(f, d, { abil: Object.assign(f.abil, d.abil), up: Object.assign(f.up, d.up) }) : f;
  if (Save.data.map) Save.data.maps.z1 = true;     // older saves: the free Zone 1 map still counts
  if (Save.data.reshman) Save.data.reshmanMet.z1 = Save.data.reshmanMet.z1 || 1;
})();
let PAGE_BLOCKED = false;
function saveGame() { if (PAGE_BLOCKED || DEV_CARRY) return; try { localStorage.setItem(SAVE_KEY, JSON.stringify(Save.data)); } catch (e) { logErr("zone/common.js:52", e); } }

const ZONES = {
  z1: { name: 'The Scrapyard Dugout',    sub: 'Zone 1 · The Lower Bracket',   page: 'zone1.html' },
  z2: { name: 'The Deep Quarry',         sub: 'Zone 2 · Rock and Stone',      page: 'act1.html' },
  z3: { name: 'The Ventilation Shafts',  sub: 'Zone 3 · Mind the Fans',       page: 'act1.html' },
  z4: { name: 'The Pyrotechnic Foundry', sub: 'Zone 4 · Act I Finale',        page: 'act1.html' },
  z12: { name: 'The Sunken Bullpen',     sub: 'Under the Quarry · Rain Delay', page: 'act1.html' },
  z5: { name: 'The Grand Concourse',     sub: 'Zone 5 · Act II Hub',          page: 'act2.html' },
  z6: { name: 'The Geode Caverns',       sub: 'Zone 6 · Respect the Rocks',   page: 'act2.html' },
  z7: { name: 'The Storm Atrium',        sub: 'Zone 7 · Bring an Umbrella',   page: 'act2.html' },
  z8: { name: 'The Glacier Crown',       sub: 'Zone 8 · No Pleases Allowed',  page: 'act2.html' },
  z9: { name: 'The Gilded Stadium',      sub: 'Zone 9 · The Championship',    page: 'act3.html' },
  z10: { name: 'The Zennith Core',       sub: 'Act IV · Extra Innings',       page: 'act3.html', secret: true },
};
/* ---------- Gatekeeping: no skipping ahead by typing a URL ----------
   A page only opens if this save has really been there: every in-game
   trip (goToPage) writes the page and its arrival hash into the save first.
   Typing act2.html, or act1.html#bell-z4, into the address bar doesn't. */
const ZONE_PAGES = { 'act1.html': ['z2', 'z3', 'z4'], 'act2.html': ['z5', 'z6', 'z7', 'z8'], 'act3.html': ['z9', 'z10'] };
(function backfillPages() {
  const D = Save.data, q = D.q;
  if (q.pages) return;
  // saves from before the gate: work it out from how far they got
  q.pages = { 'zone1.html': 1 };
  const been = z => D.bells[z] || D.seenZones[z] || D.maps[z] || D.where === z;
  if (D.cleared || ZONE_PAGES['act1.html'].some(been)) q.pages['act1.html'] = 1;
  if (D.actCleared || D.concourse || ZONE_PAGES['act2.html'].some(been)) q.pages['act2.html'] = 1;
  if (D.gateOpen || D.stadium || ZONE_PAGES['act3.html'].some(been)) q.pages['act3.html'] = 1;
})();
function pageAllowed(file) {
  if (file === 'zone1.html' || !ZONE_PAGES[file]) return true;
  const D = Save.data;
  return !!(D.q.pages[file] || (ZONES[D.where] && ZONES[D.where].page === file));
}
// the arrival hash counts only if the game itself sent you here with it
const ARRIVE = (() => {
  if (RAW_ARRIVE === 'new') return PAGE_FILE === 'zone1.html' ? 'new' : '';
  const ok = RAW_ARRIVE && Save.data.q.arrive === PAGE_FILE + '#' + RAW_ARRIVE;
  Save.data.q.arrive = null;
  return ok ? RAW_ARRIVE : '';
})();
if (!pageAllowed(PAGE_FILE)) {
  PAGE_BLOCKED = true;   // nothing on this page may write the save
  const D = Save.data, back = !SAVE_EXISTED ? 'index.html' : ZONES[D.where] && pageAllowed(ZONES[D.where].page) ? ZONES[D.where].page : 'zone1.html';
  const cover = document.createElement('div');
  cover.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#0b0910;color:#f1e6d0;display:flex;align-items:center;justify-content:center;text-align:center;font:16px/1.7 Georgia,serif';
  cover.innerHTML = '<div><div style="font:28px Impact,sans-serif;letter-spacing:.06em">NICE TRY, SLUGGER</div><div style="opacity:.7;margin-top:6px">You haven\'t reached this part of the Spire yet. Taking you back…</div></div>';
  (document.body || document.documentElement).appendChild(cover);
  console.warn(`[Extra Innings] ${PAGE_FILE} isn't unlocked on this save · sending you to ${back}`);
  setTimeout(() => location.replace(back), 1200);
}
// the True Ending: every friend rescued, all 50 Lucky Pebbles, and the plain wooden Spare Bat
function trueEndingChecks() {
  const D = Save.data;
  return [
    ['Every friend rescued and brought to Base Camp', D.josh && D.lars && D.danielDead && D.chase && D.fionnDead && D.miloDead && D.denizDead],
    [`All ${PEBBLE_TOTAL} Lucky Pebbles (${Object.keys(D.pebbles).length}/${PEBBLE_TOTAL})`, Object.keys(D.pebbles).length >= PEBBLE_TOTAL],
    ['The Spare Bat from the Crash Site floorboards', D.spareBat],
  ];
}
const trueEndingReady = () => trueEndingChecks().every(c => c[1]);
// Fionn's bat charms: one per 10 Lucky Pebbles handed in (each also gives +1 max HP)
const CHARMS = [
  { name: 'Barnaby the Basalt', desc: '+3 Hype for every hit you land.' },
  { name: 'The Geode Glint', desc: 'Your bat reaches 20% further.' },
  { name: 'Oscar the Obsidian', desc: 'One extra Kinetic Baseball per jump.' },
  { name: 'Quentin the Quartz', desc: 'Healing with Hype is 30% faster.' },
  { name: 'The Lucky Seven', desc: 'Every swing hits 20% harder.' },
];
const PEBBLE_TOTAL = 50;
const pebblesFound = () => Object.keys(Save.data.pebbles).length;
const TUNE_BASE = { hypePerHit: TUNE.hypePerHit, batReach: TUNE.batReach, ballCount: TUNE.ballCount, healTime: TUNE.healTime };
// everything bought / unlocked, applied to the player
function applyUpgrades() {
  const D = Save.data, ch = D.charms || 0;
  Object.assign(ABIL, D.abil);
  Player.hypeMax = D.up.core ? 132 : 99;
  Player.batDmgBase = ([1, 1.4, 1.8, 2.2][D.batLv] || 1) * (ch >= 5 ? 1.2 : 1) * (D.up.maxBat ? 1.5 : 1);
  Player.batDmg = Player.batDmgBase;
  Player.batLook = D.up.maxBat ? 'max' : null;
  Player.boomR = D.up.bigboom ? 122 : 86;
  if (!ABIL.boom) Player.boomMode = false;
  TUNE.hypePerHit = TUNE_BASE.hypePerHit + (ch >= 1 ? 3 : 0);
  TUNE.batReach = Math.round(TUNE_BASE.batReach * (ch >= 2 ? 1.2 : 1));
  TUNE.ballCount = TUNE_BASE.ballCount + (ch >= 3 ? 1 : 0);
  TUNE.healTime = TUNE_BASE.healTime * (ch >= 4 ? 0.7 : 1);
  // +1 max HP per charm
  Player.bonusHp = ch;
  if (Player.maxHp !== undefined && Player.maxHp !== 5 + ch) {
    const gain = 5 + ch - Player.maxHp; Player.maxHp = 5 + ch; Player.hp = clamp(Player.hp + Math.max(0, gain), 1, Player.maxHp);
  }
}
// Milo's Static Dash: dashing phases through enemies, lasers and attacks
const _plainHurt = Player.hurt;
Player.hurt = function (dir) { if (this.dashT > 0 && Save.data.up.staticDash) return; return _plainHurt.call(this, dir); };

/* ---------- Red laser barriers (only the Static Dash gets through) ---------- */
const Lasers = [];
function laserRect(tx, ty, h) { return { x: tx * TILE + 11, y: ty * TILE, w: 10, h: h * TILE, t: 0, hinted: false }; }
function updateLasers(dt) {
  const P = Player;
  for (const L of Lasers) {
    L.t += dt; L.zap = Math.max(0, (L.zap || 0) - dt);
    if (P.dead || P.hazard || !overlap(P, L)) continue;
    if (P.dashT > 0 && Save.data.up.staticDash) {
      if (L.zap <= 0) { L.zap = 0.4; SFX.laser(); pop(L.x + 5, P.y - 10, 'PHASE!', { size: 30, color: '#9fe6ff', burstColor: '#2a4a66' }); burst(L.x + 5, P.y + P.h / 2, 16, { colors: ['#9fe6ff', '#ffffff', '#ff4a3a'], maxSpeed: 380 }); }
      continue;
    }
    const side = P.x + P.w / 2 < L.x + L.w / 2 ? -1 : 1;
    P.x = side < 0 ? L.x - P.w - 1 : L.x + L.w + 1; P.vx = side * 340; P.vy = Math.min(P.vy, -220); P.dashT = 0; P.launched = false;
    L.zap = 0.4; SFX.laser(); burst(L.x + 5, P.y + P.h / 2, 10, { colors: ['#ff4a3a', '#ffb0a0'], maxSpeed: 300 });
    P.hurt(side);
    if (!L.hinted) { L.hinted = true; toast(Save.data.up.staticDash ? 'DASH THROUGH IT · THE STATIC DASH PHASES RIGHT THROUGH' : 'A RED LASER BARRIER · NOTHING GETS THROUGH THIS… YET'); }
  }
}
function drawLasers() {
  for (const L of Lasers) {
    const flick = 0.75 + 0.25 * Math.sin(L.t * 40) + (L.zap > 0 ? 0.3 : 0);
    ctx.save();
    // emitters
    for (const ey of [L.y - 6, L.y + L.h]) { rr(L.x - 6, ey, L.w + 12, 8, 2); inked('#3a3340', 2.5); ctx.fillStyle = '#ff4a3a'; ctx.fillRect(L.x + 2, ey + 2, L.w - 4, 4); }
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(L.x - 16, 0, L.x + L.w + 16, 0);
    g.addColorStop(0, 'rgba(255,60,40,0)'); g.addColorStop(0.5, `rgba(255,70,50,${0.45 * flick})`); g.addColorStop(1, 'rgba(255,60,40,0)');
    ctx.fillStyle = g; ctx.fillRect(L.x - 16, L.y, L.w + 32, L.h);
    ctx.fillStyle = `rgba(255,220,210,${0.8 * flick})`; ctx.fillRect(L.x + 3, L.y, 4, L.h);
    for (let k = 0; k < 4; k++) { const yy = L.y + ((L.t * 220 + k * L.h / 4) % L.h); ctx.fillStyle = 'rgba(255,190,170,.8)'; ctx.fillRect(L.x - 2, yy, L.w + 4, 2); }
    ctx.restore();
  }
}
// hop to another page (zone) with a fade
function goToPage(url) {
  // a real in-game trip: this save has now earned that page and that arrival point
  const [file, hash] = url.split('#'), q = Save.data.q;
  if (ZONE_PAGES[file] || file === 'zone1.html') { q.pages[file] = 1; q.arrive = hash ? file + '#' + hash : null; }
  saveGame(); Game.fadeTarget = 1; Input.enabled = false;
  setTimeout(() => { location.href = url; }, 600);
}

/* ---------- UI helpers ---------- */
let toastTimer = 0;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}
let roomTimer = 0;
// big story moments unlock main-menu themes (see themes.js)
function themeCheck(delay = 2800) {
  const n = Themes.announce();
  if (n.length) setTimeout(() => { toast('NEW MENU STYLE UNLOCKED! · ' + n.map(t => t.name.toUpperCase()).join(' · ')); SFX.drill(); }, delay);
}
function roomToast(name) {
  const el = $('#roomName'); el.textContent = name.toUpperCase(); el.classList.add('show');
  clearTimeout(roomTimer); roomTimer = setTimeout(() => el.classList.remove('show'), 2400);
}
function zoneTitle(main, sub) {
  const el = $('#zoneTitle'); $('#zoneMain').textContent = main; $('#zoneSub').textContent = sub || '';
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  try { SFX.arrive(); } catch (e) { logErr("zone/common.js:zoneTitle", e); }
}
const BossBar = {
  show(name) {
    const was = $('#bossBar').classList.contains('show');
    if (name) $('#bossBar span').textContent = name; $('#bossBar').classList.add('show'); this.set(1);
    if (!was) Story.bossIntro(name || $('#bossBar span').textContent);
  },
  hide() { $('#bossBar').classList.remove('show'); },
  set(k) { $('#bossFill').style.width = (Math.max(0, k) * 100) + '%'; },
  flash() { const b = $('#bossBar'); b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash'); }
};

/* ---------- Modals (pause, map, shop, travel, unlock card, end card) ---------- */
const UI = { modal: null };
function openModal(id) { UI.modal = id; $('#' + id).classList.add('show'); Input.enabled = false; Input.clear(); }
function closeModal() {
  if (!UI.modal) return;
  $('#' + UI.modal).classList.remove('show'); const was = UI.modal; UI.modal = null;
  Input.enabled = true; Input.clear(); SFX.ui();
  if (was === 'unlock' && UI.afterCard) { const f = UI.afterCard; UI.afterCard = null; f(); }
}
$$('[data-close]').forEach(b => b.addEventListener('click', closeModal));

function showCard(kicker, title, body, keys, after) {
  $('#unlockKicker').textContent = kicker; $('#unlockTitle').textContent = title; $('#unlockBody').textContent = body;
  $('#unlockKeys').innerHTML = keys.map(k => `<span>${k}</span>`).join('');
  UI.afterCard = after || null;
  SFX.unlock(); openModal('unlock');
}

/* ---------- Pause ---------- */
let pauseSel = 0;
const pauseBtns = $$('.pbtn');
function markPause() { pauseBtns.forEach((b, i) => b.classList.toggle('sel', i === pauseSel)); }
function setPaused(p) {
  if (p) { openModal('pause'); pauseSel = 0; markPause(); SFX.ui(); } else closeModal();
}
pauseBtns.forEach((b, i) => {
  b.addEventListener('mouseenter', () => { pauseSel = i; markPause(); });
  b.addEventListener('click', () => pauseAction(b.dataset.p));
});
function pauseAction(a) {
  SFX.ui();
  if (a === 'resume') closeModal();
  if (a === 'map') { closeModal(); openMap(); }
  if (a === 'restart') {
    const btn = pauseBtns.find(b => b.dataset.p === 'restart');
    if (!UI.restartArm) { UI.restartArm = true; btn.textContent = 'Sure? Erases your whole save'; setTimeout(() => { UI.restartArm = false; btn.textContent = 'Start Over'; }, 3000); return; }
    if (location.pathname.endsWith('zone1.html')) { location.hash = 'new'; location.reload(); } else location.href = 'zone1.html#new';
  }
  if (a === 'menu') { saveGame(); location.href = 'index.html#menu'; }
}
$('#vol').value = Math.round(SFX.volume * 100);
$('#vol').addEventListener('input', e => { SFX.volume = e.target.value / 100; });

/* ---------- Shops: Josh, Lars & Daniel at Base Camp ---------- */
const BOLT_SVG = '<svg viewBox="0 0 20 20"><path d="M10 2 L17 6 L17 14 L10 18 L3 14 L3 6 Z" fill="#b8bcc4" stroke="#0d0b10" stroke-width="2"/><circle cx="10" cy="10" r="2.6" fill="#0d0b10"/></svg>';
const ORE_SVG = '<svg viewBox="0 0 20 20"><path d="M3 13 L6 5 L12 2 L17 8 L15 15 L8 18 Z" fill="#9fd8e8" stroke="#0d0b10" stroke-width="2" stroke-linejoin="round"/><path d="M6 5 L10 10 L17 8 M10 10 L8 18" fill="none" stroke="#0d0b10" stroke-width="1.3"/></svg>';
const FACES = {
  josh: ['#2c6e6a', '<svg viewBox="0 0 60 60"><circle cx="30" cy="34" r="19" fill="#f3ead8" stroke="#0d0b10" stroke-width="4"/><path d="M11 33 Q12 10 30 10 Q49 10 49 32 Z" fill="#8fd3ff" stroke="#0d0b10" stroke-width="4" stroke-linejoin="round"/><rect x="11" y="27" width="38" height="5" fill="#6fb8e0"/><circle cx="38" cy="36" r="5" fill="#6fd3ff" stroke="#0d0b10" stroke-width="3"/><path d="M20 35 L26 35" stroke="#0d0b10" stroke-width="3" stroke-linecap="round"/><path d="M24 45 L36 43" stroke="#0d0b10" stroke-width="3" stroke-linecap="round"/></svg>'],
  lars: ['#7a4a20', '<svg viewBox="0 0 60 60"><circle cx="30" cy="31" r="17" fill="#f0cfa8" stroke="#0d0b10" stroke-width="4"/><path d="M12 31 Q30 66 48 31 Q44 45 30 47 Q16 45 12 31Z" fill="#c8561c" stroke="#0d0b10" stroke-width="3.5" stroke-linejoin="round"/><path d="M10 25 Q12 8 30 8 Q48 8 50 25 Z" fill="#f2c14e" stroke="#0d0b10" stroke-width="4" stroke-linejoin="round"/><circle cx="30" cy="15" r="5" fill="#fff6c0" stroke="#0d0b10" stroke-width="2.5"/><path d="M21 29 L27 31 M33 31 L39 29" stroke="#0d0b10" stroke-width="3.5" stroke-linecap="round"/></svg>'],
  daniel: ['#8a1c3a', '<svg viewBox="0 0 60 60"><path d="M12 24 L15 8 L22 18 L28 4 L33 17 L40 6 L43 19 L50 12 L48 28 Z" fill="#2b2228" stroke="#0d0b10" stroke-width="3" stroke-linejoin="round"/><circle cx="30" cy="35" r="17" fill="#f0cfa8" stroke="#0d0b10" stroke-width="4"/><rect x="13" y="21" width="34" height="8" rx="4" fill="#3a3340" stroke="#0d0b10" stroke-width="2.5"/><circle cx="23" cy="25" r="4" fill="#ffd27a" stroke="#0d0b10" stroke-width="2"/><circle cx="37" cy="25" r="4" fill="#ffd27a" stroke="#0d0b10" stroke-width="2"/><circle cx="19" cy="41" r="4" fill="rgba(40,30,30,.35)"/><path d="M21 42 Q30 52 41 41 Z" fill="#fff" stroke="#0d0b10" stroke-width="3" stroke-linejoin="round"/><path d="M24 35 L27 36 M34 36 L37 35" stroke="#0d0b10" stroke-width="3" stroke-linecap="round"/></svg>'],
  renas: ['#c8561c', '<svg viewBox="0 0 60 60"><circle cx="30" cy="35" r="17" fill="#f3ead8" stroke="#0d0b10" stroke-width="4"/><path d="M12 32 Q13 13 30 13 Q47 13 48 32 Z" fill="#ff8a2a" stroke="#0d0b10" stroke-width="4" stroke-linejoin="round"/><rect x="14" y="23" width="32" height="7" rx="3.5" fill="#6fd3ff" stroke="#0d0b10" stroke-width="2.5"/><path d="M22 36 L26 35 M34 35 L38 36" stroke="#0d0b10" stroke-width="3" stroke-linecap="round"/><path d="M23 43 Q31 49 39 41" fill="none" stroke="#0d0b10" stroke-width="3" stroke-linecap="round"/><path d="M35 45 L37 51 L41 45" fill="#e8361c" stroke="#0d0b10" stroke-width="2"/></svg>'],
  reshman: ['#1a1420', '<svg viewBox="0 0 60 60"><path d="M12 56 Q10 22 30 20 Q50 22 48 56 Q44 51 40 56 Q36 51 32 56 Q28 51 24 56 Q20 51 16 56 Z" fill="#000"/><ellipse cx="24" cy="36" rx="3.5" ry="6" fill="#f3ead8"/><ellipse cx="36" cy="36" rx="3.5" ry="6" fill="#f3ead8"/></svg>'],
};
/* ---------- Reshman's maps & mapping tools (Shakra-style) ---------- */
const MAP_STOCK = {
  z1: [30, 'Busted bleachers, coolant pipes and one very dark alley. I charted it from the shadows.'],
  z2: [45, 'Lava, carts, crystals. Mind the moles. I lost a sock down there.'],
  z3: [50, 'Ducts and fans. My first copy blew away. This is the second copy.'],
  z4: [55, 'Everything here explodes. Including my last three maps. Buy this one quickly.'],
  z12: [50, 'Very wet. The ink ran, so I drew it again with a fish. …blorp.'],
  z5: [40, 'A very big room with a very big door. I measured it. Twice. …blorp.'],
  z6: [60, 'Rocks that float. A man who names rocks. I hid from both.'],
  z7: [60, 'Drawn during a hurricane. Some of the ink is rain.'],
  z8: [60, 'Slippery. Cold. A king who yells. Wear socks.'],
  z9: [70, 'Very shiny. Very loud. Very many lasers. I drew it with my eyes closed. …blorp.'],
};
function reshmanStock() {
  const D = Save.data, reached = z => z === 'z1' || D.seenZones[z] || D.maps[z];
  const list = Object.keys(MAP_STOCK).filter(reached).map(z => ({
    id: 'map_' + z, name: 'Map · ' + ZONES[z].name, cost: MAP_STOCK[z][0], desc: MAP_STOCK[z][1], line: '"…blorp. Don\'t lose it."',
    owned: d => !!d.maps[z], grant: d => { d.maps[z] = true; },
    after: () => showCard('MAP ACQUIRED', ZONES[z].name.toUpperCase(), D.up.quill
      ? 'Your Quill inks in every room you explore. Secret places you find get added too.'
      : 'Reshman\'s rough pencil sketch of the zone. Buy his Quill to ink in the rooms you explore, and his Compass to see where you are.',
      [`<kbd>${Bindings.label('map')}</kbd> open map`]),
  }));
  list.push(
    { id: 'quill', name: 'Quill', cost: 40, desc: 'Inks the rooms you explore onto your maps in full detail, and adds secret places you discover.', line: '"Pigeon feather. Very rare pigeon. …blorp."' },
    { id: 'compass', name: 'Compass', cost: 60, desc: 'Shows where you are on the map. It points at you. Always you. Spooky.', line: '"It never points at me. Nobody finds me."' },
    { id: 'pinBench', name: 'Bench Pins', cost: 25, desc: 'Marks every bench on your maps.', line: '"Sit. Rest. Don\'t look behind the bench."' },
    { id: 'pinVendor', name: 'Vendor Pins', cost: 30, desc: 'Marks Josh, Lars, Daniel… and me. If I let you.', line: '"My pin is very small. Squint."' },
    { id: 'pinBell', name: 'Bell Pins', cost: 30, desc: 'Inks Renas\'s Scooter Stops onto the paper maps (the pause map marks them by itself).', line: '"That kid is loud. …blorp."',
      locked: d => d.renasMet ? '' : '"Bell pins? What bells? …Ask me later."' },
    { id: 'pinOre', name: 'Titanium Pins', cost: 40, desc: 'Marks Raw Titanium Ore you haven\'t picked up yet.', line: '"Shiny rocks. The dwarf likes shiny rocks."',
      locked: d => d.lars ? '' : '"Titanium? Who would even want that? …Ask me later."' },
    { id: 'pinPebble', name: 'Pebble Pins', cost: 50, desc: 'Marks Lucky Pebbles you haven\'t picked up yet, in rooms you\'ve already been to.', line: '"The rock man will be pleased. …blorp."',
      locked: d => d.fionnDead ? '' : '"Pebbles? Who collects pebbles? …Ask me later."' },
  );
  return list;
}
const vitems = V => typeof V.items === 'function' ? V.items() : V.items;
const batCard = lv => () => showCard('BAT REINFORCED', 'LEVEL ' + ['I', 'II', 'III'][lv - 1], `Titanium rivets hammered down the barrel. Every swing now hits ${[40, 80, 120][lv - 1]}% harder, and tough enemies go down in fewer hits.`, ['permanent upgrade']);
const VENDORS = {
  reshman: {
    title: 'RESHMAN\'S MAPS & PINS', face: 'reshman',
    hello: D => ['"…blorp. Maps. Bolts. Trade?"', '"You found me again. How. …blorp."', '"Shh. I\'m hiding. But also selling."'][(Math.random() * 3) | 0],
    poor: n => `"…${n} more bolts. …blorp."`,
    owned: '"You already have that. …blorp."',
    items: reshmanStock },
  josh: {
    title: 'JOSH\'S WORKBENCH', face: 'josh',
    hello: D => D.up.launcher ? (D.lars && D.danielDead ? '"Full house at camp now. The dwarf keeps stealing my coffee."' : '"Back already? Spend some bolts."') : '"Before you ask: yes, I can make your baseballs do something cool."',
    poor: n => `"You're ${n} bolts short. Go break some robots."`,
    owned: '"You already have that. I don\'t do refunds either."',
    items: [
      { id: 'launcher', name: 'Kinetic Baseball Launcher', cost: 0, tag: 'STORY', desc: 'Kinetic boosters for your baseballs. Toss one mid‑air and smack it to rocket across huge gaps.', line: '"Free. Consider it a thank‑you for not dying in my server room."',
        grant: D => { D.up.launcher = true; D.abil.launch = true; },
        after: () => showCard('NEW MOVE', 'BAT‑LAUNCH', 'Toss a kinetic baseball and smack it to rocket in any direction. You get one ball per jump, and it refills when you land. There\'s a massive chasm on the far side of Base Camp…',
          [`<kbd>${Bindings.label('ball')}</kbd> toss`, `<kbd>${Bindings.label('attack')}</kbd> smack`, `hold <kbd>${Bindings.label('left')}</kbd><kbd>${Bindings.label('up')}</kbd><kbd>${Bindings.label('right')}</kbd> to aim`]) },
      { id: 'core', name: 'Spite‑Forged Core', cost: 50, desc: 'A bigger Hype Meter. Store an extra heal for when things go sideways.', line: '"Spite‑forged. Don\'t ask what\'s inside."' },
      { id: 'magnet', name: 'Magnet Module', cost: 35, desc: 'Scrap Bolts fly straight to you. No more scraping coins off the floor mid‑combo.', line: '"Works on my machine."' },
    ] },
  lars: {
    title: 'LARS\'S ANVIL', face: 'lars',
    hello: D => D.batLv >= 3 ? '"Finest bat this side o\' the Spire. Now stop pestering me, the cats are napping."' : '"Bolts and titanium, slugger. I\'ll make that toothpick sing."',
    poor: n => `"Ye're ${n} bolts short. Rivets don't grow on trees."`,
    owned: '"Already done that one. Can\'t rivet a rivet."',
    items: [1, 2, 3].map(lv => ({
      id: 'bat' + lv, name: 'Bat Reinforcement ' + ['I', 'II', 'III'][lv - 1], cost: [40, 80, 120][lv - 1], ore: [1, 2, 2][lv - 1],
      desc: ['Titanium rivets down the barrel. Swings hit 40% harder.', 'A titanium core, hammered cold. Swings hit 80% harder.', 'Lars\'s masterwork. Swings hit 120% harder. The cats approve.'][lv - 1],
      line: ['"Rock and stone! Feel that weight?"', '"Now THAT\'S a bat. Try not to break the Spire."', '"Masterwork. Don\'t tell Josh I enjoyed that."'][lv - 1],
      owned: D => D.batLv >= lv,
      locked: D => D.batLv < lv - 1 ? '"One rivet at a time. Get the last upgrade first."' : '',
      grant: D => { D.batLv = lv; },
      after: batCard(lv),
    })) },
  daniel: {
    title: 'DANIEL\'S FIREWORKS STAND', face: 'daniel',
    hello: D => D.up.boom ? '"Blow up anything good lately? Tell me EVERYTHING."' : '"You beat me fair and square! Here, take the good stuff!"',
    poor: n => `"Ha! ${n} bolts short. Go blow something up first!"`,
    owned: '"You already have that one! Use it! Go!"',
    items: [
      { id: 'boom', name: 'Explosive Baseballs', cost: 0, tag: 'STORY', desc: 'Swap to fiery bombs (costs a little Hype per toss). Smack one to fire it: big splash damage, ignores shields, and blows open cracked walls and floors.', line: '"Every bomb\'s got a lucky one in there somewhere!"',
        grant: D => { D.up.boom = true; D.abil.boom = true; },
        after: () => showCard('NEW ABILITY', 'EXPLOSIVE BASEBALLS', `Swap ball types any time. Explosive balls cost ${BOOM_COST} Hype each: toss one, then smack it to fire a bomb that blasts enemies and blows open cracked walls. Hmm… weren't there cracked floorboards back at the Crash Site?`,
          [`<kbd>${Bindings.label('swap')}</kbd> swap balls`, `<kbd>${Bindings.label('ball')}</kbd> toss`, `<kbd>${Bindings.label('attack')}</kbd> fire`]) },
      { id: 'bigboom', name: 'Bigger Bang', cost: 60, desc: 'Double‑packed gunpowder. Explosive Baseball blasts are 40% wider.', line: '"BIGGER! Yes! That\'s the spirit!"',
        locked: D => D.up.boom ? '' : '"Take the free ones first, silly."' },
    ] },
};
const Shop = { v: 'josh', sel: 0 };
const itemOwned = (s, D) => s.owned ? s.owned(D) : !!D.up[s.id];
function openShop(v) {
  const V = VENDORS[v], D = Save.data;
  Shop.v = v; Shop.sel = vitems(V).findIndex(s => !itemOwned(s, D)); if (Shop.sel < 0) Shop.sel = 0;
  const [bg, svg] = FACES[V.face];
  $('#shopFace').innerHTML = svg; $('#shopFace').style.background = bg;
  $('#shopTitle').textContent = V.title;
  $('#joshLine').textContent = V.hello(D);
  renderShop(); SFX.ui(); openModal('shop');
}
function renderShop() {
  const V = VENDORS[Shop.v], D = Save.data;
  $('#shopBolts').innerHTML = Shop.v === 'scalpers' ? STUB_SVG + `<b>${stubsLeft()}</b>` : BOLT_SVG + `<b>${D.bolts}</b>` + (Shop.v === 'lars' || D.ore ? ORE_SVG + `<b>${D.ore}</b>` : '');
  $('#shopItems').innerHTML = vitems(V).map((s, i) => {
    const owned = itemOwned(s, D), lock = !owned && s.locked && s.locked(D);
    const poor = !owned && !lock && (D.bolts < s.cost || D.ore < (s.ore || 0) || (s.stubs && stubsLeft() < s.stubs));
    const price = (s.cost ? BOLT_SVG + s.cost : '') + (s.ore ? ' ' + ORE_SVG + s.ore : '') + (s.stubs ? STUB_SVG + s.stubs : '');
    return `<button class="item ${i === Shop.sel ? 'sel' : ''} ${owned ? 'owned' : ''} ${poor ? 'poor' : ''} ${lock ? 'locked' : ''}" data-i="${i}">
      <b>${s.name}${s.tag ? `<span class="tag">${s.tag}</span>` : ''}</b>
      <span class="cost">${owned ? 'OWNED' : lock ? 'LOCKED' : price || 'FREE'}</span>
      <p>${s.desc}</p></button>`;
  }).join('');
  $$('#shopItems .item').forEach(b => {
    b.addEventListener('mouseenter', () => { Shop.sel = +b.dataset.i; $$('#shopItems .item').forEach((x, j) => x.classList.toggle('sel', j === Shop.sel)); });
    b.addEventListener('click', () => buy(+b.dataset.i));
  });
}
function buy(i) {
  const V = VENDORS[Shop.v], s = vitems(V)[i], D = Save.data;
  const say = t => { $('#joshLine').textContent = t; };
  if (itemOwned(s, D)) { SFX.deny(); say(V.owned); return; }
  const lock = s.locked && s.locked(D);
  if (lock) { SFX.deny(); say(lock); return; }
  if (D.bolts < s.cost) { SFX.deny(); say(V.poor(s.cost - D.bolts)); return; }
  if (D.ore < (s.ore || 0)) { SFX.deny(); say(`"No titanium, no rivets. Bring me ${s.ore - D.ore} more Raw Titanium Ore. It hides in the nasty spots."`); return; }
  if (s.stubs && stubsLeft() < s.stubs) { SFX.deny(); say(V.poorStubs(s.stubs - stubsLeft())); return; }
  D.bolts -= s.cost; D.ore -= s.ore || 0;
  if (s.stubs) D.q.stubsSpent = (D.q.stubsSpent || 0) + s.stubs;
  (s.grant || (d => { d.up[s.id] = true; }))(D);
  SFX.buy(); if (Shop.v === 'lars') SFX.anvil();
  say(s.line); applyUpgrades(); saveGame(); renderShop();
  if (s.after) setTimeout(() => { closeModal(); s.after(); }, 900);
}

/* ---------- Fast travel (Renas's scooter) ---------- */
const Travel = { sel: 0, list: [] };
function ringBell(b) {
  b.ring = 1.4; SFX.bell();
  if (!Save.data.chase) { toast(Save.data.renasMet ? 'NOBODY ANSWERS… RENAS ISN\'T GIVING RIDES YET' : 'A RUSTY CALL BELL. NOBODY ANSWERS… YET'); return; }
  setTimeout(() => { SFX.scooter(); openTravel(); }, 500);
}
function openTravel() {
  const D = Save.data, here = PAGE.zoneHere();
  Travel.list = Object.keys(ZONES).filter(id => !ZONES[id].secret);
  $('#renasLine').textContent = ['"Where to, slowpoke?"', '"Hop on. Don\'t touch the sparky bit."', '"Josh doesn\'t know I borrowed his drone motors. Shh."'][(Math.random() * 3) | 0];
  $('#travelList').innerHTML = Travel.list.map((id, i) => {
    const z = ZONES[id], known = D.bells[id];
    return `<button class="stop ${known ? '' : 'locked'} ${id === here ? 'here' : ''}" data-i="${i}" ${known && id !== here ? '' : 'disabled'}>
      <span class="stop-n">${i + 1}</span><span><b>${known ? z.name : '? ? ?'}</b><small>${id === here ? 'You are here' : known ? z.sub : 'Ring this zone\'s call bell first'}</small></span></button>`;
  }).join('');
  Travel.sel = Travel.list.findIndex(id => D.bells[id] && id !== here); if (Travel.sel < 0) Travel.sel = 0;
  markTravel();
  $$('#travelList .stop').forEach(b => {
    b.addEventListener('mouseenter', () => { Travel.sel = +b.dataset.i; markTravel(); });
    b.addEventListener('click', () => travelTo(+b.dataset.i));
  });
  openModal('travel');
}
function markTravel() { $$('#travelList .stop').forEach((b, i) => b.classList.toggle('sel', i === Travel.sel)); }
function moveTravel(d) {
  const D = Save.data, here = PAGE.zoneHere(), n = Travel.list.length;
  for (let k = 1; k <= n; k++) { const j = (Travel.sel + d * k + n * 4) % n; const id = Travel.list[j]; if (D.bells[id] && id !== here) { Travel.sel = j; break; } }
  markTravel(); SFX.ui();
}
function travelTo(i) {
  const id = Travel.list[i], D = Save.data;
  if (!id || !D.bells[id] || id === PAGE.zoneHere()) { SFX.deny(); return; }
  closeModal(); SFX.scooter(); saveGame();
  if (ZONES[id].page === ZONES[PAGE.id].page && PAGE.arriveAtBell) {
    Game.fadeTarget = 1;
    setTimeout(() => { PAGE.arriveAtBell(id); Game.fade = 1; Game.fadeTarget = 0; }, 550);
  } else goToPage(ZONES[id].page + '#bell-' + id);
}

/* ---------- Enemy memory: kills stick until you rest at a bench ---------- */
const Zone = { room: null, boss: null, ended: false, killed: {}, camOverride: null };
function markKilled(e) {
  if (e.spawnKey === undefined || !e.spawnRoom) return;
  (Zone.killed[e.spawnRoom] = Zone.killed[e.spawnRoom] || {})[e.spawnKey] = 1;
}
function forgetKills() { Zone.killed = {}; }

/* ---------- Camera ---------- */
function clampCam() {
  const r = Zone.room.px, cam = Game.cam;
  // during a cutscene the camera may slip past the room's top/bottom by the letterbox height,
  // so characters standing on a floor at the very edge aren't hidden behind the black bars
  const pad = (typeof Story !== 'undefined' ? Story.letterbox : 0) * VH * 0.12;
  const maxX = r.x + r.w - VW, maxY = r.y + r.h - VH + pad;
  cam.x = maxX < r.x ? r.x + (r.w - VW) / 2 : clamp(cam.x, r.x, maxX);
  cam.y = r.y + r.h - VH < r.y ? r.y + (r.h - VH) / 2 : clamp(cam.y, r.y - pad, maxY);
}
function snapCamera() {
  const c = Player.center();
  Game.cam.x = c.x - VW / 2; Game.cam.y = c.y - VH * 0.55; Game.cam.look = 0; clampCam();
}
function updateCamera(dt) {
  if (Zone.camOverride && Zone.camOverride(dt)) return;
  const cam = Game.cam, c = Player.center();
  let tx, ty, k = 6;
  if (Story.camTarget) { tx = Story.camTarget.x - VW / 2; ty = Story.camTarget.y - VH / 2; k = 2.5; }
  else {
    cam.look = lerp(cam.look, Player.facing * 70 + Player.vx * 0.12, 1 - Math.exp(-3 * dt));
    const fallLead = Player.vy > 400 ? Math.min(140, (Player.vy - 400) * 0.3) : 0;
    tx = c.x + cam.look - VW / 2; ty = c.y - VH * 0.55 + cam.lookY + fallLead;
    if (Player.launched) k = 9;
  }
  cam.x = lerp(cam.x, tx, 1 - Math.exp(-7 * dt));
  cam.y = lerp(cam.y, ty, 1 - Math.exp(-k * dt));
  clampCam();
}

/* ---------- Death & respawn ---------- */
// resting: a soft golden pulse from his chest, then the hearts refill one by one with a little chime
function benchRestFx(P) {
  const c = P.center();
  ring(c.x, c.y - 4, 6, 110, 1.1, 'rgba(242,193,78,.55)', 4); ring(c.x, c.y - 4, 4, 70, 0.8, 'rgba(255,236,190,.45)', 2);
  const need = P.maxHp - P.hp;
  for (let k = 0; k < need; k++) setTimeout(() => { if (!P.dead && P.hp < P.maxHp) { P.hp++; HUD.hpPop = true; SFX.chime(k); } }, 260 + k * 170);
}
// a small golden baseball spins in the bottom-right corner while the game saves
function saveSpin() {
  let el = $('#saveSpin');
  if (!el) {
    el = document.createElement('div'); el.id = 'saveSpin';
    el.innerHTML = '<svg viewBox="0 0 30 30"><circle cx="15" cy="15" r="11" fill="#f2c14e" stroke="#0d0b10" stroke-width="2.5"/><path d="M8 7 Q12.5 15 8 23 M22 7 Q17.5 15 22 23" fill="none" stroke="#8a5a1a" stroke-width="1.8" stroke-dasharray="2.5 2"/></svg>';
    document.body.appendChild(el);
  }
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  try { SFX.arrive(); } catch (e) { logErr("zone/common.js:zoneTitle", e); }
}
function respawnAtBench() {
  forgetKills();   // waking up at a bench counts as resting
  const i = Save.data[PAGE.benchKey] || 0, B = PAGE.benches[i] || PAGE.benches[0];
  Player.reset(B.pos, true);
  Player.invuln = 1;
  Save.data.deaths++; saveGame();
  if (PAGE.onRespawn) PAGE.onRespawn();
  enterRoom(ROOM[B.room]);
  Game.fadeTarget = 0; Game.combo = 0;
  snapCamera();
}

/* ---------- Simulation step ---------- */
function idlePhysics(dt) {
  const P = Player;
  P.vx = approach(P.vx, 0, 3000 * dt);
  P.vy = Math.min(P.vy + TUNE.gravity * dt, TUNE.maxFall);
  moveBody(P, dt);
  P.attackT = Math.max(0, P.attackT - dt); P.invuln -= dt;
  const k = 1 - Math.exp(-14 * dt); P.sx = lerp(P.sx, 1, k); P.sy = lerp(P.sy, 1, k);
}
function step(dt) {
  Game.time += dt;
  Input.pollPad();
  if (Game.hitstop > 0) { Game.hitstop -= dt; return; }
  Save.data.time += dt;
  Story.update(dt);

  if (Game.hazardT > 0) {
    Game.hazardT -= dt;
    if (Game.hazardT <= 0) {
      Player.x = Player.lastSafe.x; Player.y = Player.lastSafe.y; Player.vx = Player.vy = 0;
      Player.hazard = false; Player.invuln = 0.9; Balls.length = 0; Game.fadeTarget = 0; snapCamera();
    }
  }
  if (Game.respawnT > 0) { Game.respawnT -= dt; if (Game.respawnT <= 0) respawnAtBench(); }

  const P = Player;
  P.prevBottom = P.y + P.h;
  if (Story.active) idlePhysics(dt); else P.update(dt);
  if (PAGE.physics) PAGE.physics(dt);          // moving platforms, updrafts, conveyors…
  // Deniz's herbal tea: Hype trickles back in, even out of combat
  if (Save.data.up.tea && !P.dead && !Story.active) P.gainHype(dt * 2.2);
  // the Static Dash crackles
  if (P.dashT > 0 && Save.data.up.staticDash && Math.random() < 0.8)
    spawnParticle({ x: P.x + rand(0, P.w), y: P.y + rand(0, P.h), vx: rand(-60, 60), vy: rand(-60, 60), life: 0.25, size: rand(2, 3.5), color: Math.random() < 0.5 ? '#9fe6ff' : '#ffffff', type: 'spark' });
  // Max Bat Power: every swing leaves a blazing flame-red trail
  if (P.batLook === 'max' && P.attackT > 0 && P.attackType !== 'launch') {
    const hb = P.hitbox();
    for (let k = 0; k < 2; k++) spawnParticle({ x: hb.x + rand(0, hb.w), y: hb.y + rand(0, hb.h), vx: rand(-40, 40), vy: rand(-120, -30), life: rand(0.2, 0.4), size: rand(3, 6), color: Math.random() < 0.6 ? '#ff4a1a' : GOLD, type: 'dot' });
  }

  if (!Story.active) {
    // anything an enemy, shot or ball sounds while it updates is panned to where it is
    for (const e of Enemies) if (!e.dead) { SFX.from(e.x + e.w / 2); e.update(dt); }
    SFX.from(null);
    if (!P.dead && !P.hazard) {
      const hb = P.hurtbox();
      for (const e of Enemies) if (!e.dead && e.harmful && !e.untargetable && overlap(hb, { x: e.x + 4, y: e.y + 4, w: e.w - 8, h: e.h - 8 }))
        P.hurt(sgn(P.x + P.w / 2 - (e.x + e.w / 2)) || 1);
    }
    for (const b of Bolts) { SFX.from(b.x); b.update(dt); }
    for (const b of Balls) { SFX.from(b.x); b.update(dt); }
    SFX.from(null);
    updateHazards(dt);
    updateLasers(dt);
    if (PAGE.update) PAGE.update(dt);
  } else if (Zone.boss) Zone.boss.update(dt);
  for (let i = Bolts.length - 1; i >= 0; i--) if (Bolts[i].dead) Bolts.splice(i, 1);
  for (let i = Balls.length - 1; i >= 0; i--) if (Balls[i].dead) Balls.splice(i, 1);
  for (let i = Enemies.length - 1; i >= 0; i--) if (Enemies[i].dead && Enemies[i] !== Zone.boss) Enemies.splice(i, 1);
  for (const n of NPCs) { SFX.from(n.x); n.update(dt); }
  SFX.from(null);
  for (let i = NPCs.length - 1; i >= 0; i--) if (NPCs[i].gone) NPCs.splice(i, 1);
  updatePickups(dt);

  const c = P.center(), feet = P.y + P.h;
  if (!Story.active && !P.dead && !P.hazard) {
    // room transitions
    const r = roomAt(c.x, c.y);
    if (r && r !== Zone.room && !(PAGE.lockRoom && PAGE.lockRoom())) { Game.fade = Math.max(Game.fade, 0.85); Game.fadeTarget = 0; enterRoom(r); snapCamera(); }
    // benches
    const D = Save.data;
    LEVEL.benches.forEach((b, i) => {
      const B = PAGE.benches[i], z = PAGE.zoneOf(B.room);
      b.near = ROOM[B.room] === Zone.room && Math.abs(c.x - b.x) < 44 && Math.abs(feet - b.y) < 12;
      if (b.near && (D[PAGE.benchKey] !== i || D.where !== z)) { D[PAGE.benchKey] = i; D.where = z; Game.checkpoint = i; saveGame(); toast('CHECKPOINT · DUGOUT BENCH'); SFX.bench(); }
      if (b.near && Input.pressed('up') && P.onGround && !P.sitting && P.sit < 0.01) {
        // he settles onto the bench first, and the rest lands when he's properly seated
        P.sitDown(b, () => {
          benchRestFx(P);
          forgetKills(); enterRoom(Zone.room); saveGame(); saveSpin();
          if (PAGE.onRest) PAGE.onRest(i);
        });
      }
    });
    // shopkeepers, call bells and other "press up" things
    if (Input.pressed('up') && P.onGround) for (const n of NPCs) if (n.near) {
      if (n.vendor) { openShop(n.vendor); break; }
      if (n.kind === 'bell') { ringBell(n); break; }
      if (n.interact) { n.interact(); break; }
    }
    if (PAGE.interact) PAGE.interact(dt, c, feet);
    // map
    if (Input.pressed('map') && !UI.modal) openMap();
  }
  if (PAGE.tick) PAGE.tick(dt);

  // particles, pops, afterimages
  const PS = Game.particles;
  for (let i = PS.length - 1; i >= 0; i--) {
    const p = PS[i]; p.life -= dt;
    if (p.life <= 0) { PPOOL.push(p); PS[i] = PS[PS.length - 1]; PS.pop(); continue; }   // swap-remove, recycle (as in game/main.js)
    const dr = Math.max(0, 1 - p.drag * dt); p.vx *= dr; p.vy = p.vy * dr + p.grav * dt;
    p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
  }
  for (let i = Game.pops.length - 1; i >= 0; i--) { const p = Game.pops[i]; p.t += dt; p.y += p.vy * dt; p.vy *= Math.max(0, 1 - 3 * dt); if (p.t >= p.life) Game.pops.splice(i, 1); }
  for (let i = Game.afterimages.length - 1; i >= 0; i--) { const a = Game.afterimages[i]; a.life -= dt; if (a.life <= 0) Game.afterimages.splice(i, 1); }
  if (Game.comboT > 0) { Game.comboT -= dt; if (Game.comboT <= 0) Game.combo = 0; }

  if (!P.dead && !P.hazard) updateCamera(dt);
  Input.endStep();
}

/* ---------- HUD ---------- */
const HUD = { hp: -1, maxHp: -1, balls: -1, ballMax: -1, hype: -1, hypeMax: -1, combo: -1, bolts: -1, ore: -1, oreOn: null, launch: null, boom: null, shield: -1, hpPop: false, boltBump: false };
const HP_SVG = '<svg viewBox="0 0 30 30"><circle cx="15" cy="15" r="12" fill="#f3ead8" stroke="#0d0b10" stroke-width="3"/><path d="M7 7 Q12 15 7 23" fill="none" stroke="#e8361c" stroke-width="2" stroke-dasharray="3 2"/><path d="M23 7 Q18 15 23 23" fill="none" stroke="#e8361c" stroke-width="2" stroke-dasharray="3 2"/></svg>';
function updateHUD() {
  const P = Player, D = Save.data, max = P.hypeMax || 99;
  if (P.maxHp !== HUD.maxHp) { $('#hp').innerHTML = HP_SVG.repeat(P.maxHp); HUD.maxHp = P.maxHp; HUD.hp = -1; }
  if (P.hp !== HUD.hp || HUD.hpPop) {
    $$('#hp svg').forEach((s, i) => {
      const was = s.classList.contains('empty'); s.classList.toggle('empty', i >= P.hp);
      if (was && i < P.hp) { s.classList.remove('pop'); void s.offsetWidth; s.classList.add('pop'); }
    });
    HUD.hp = P.hp; HUD.hpPop = false;
  }
  if (P.shield !== HUD.shield) { $('#hp').classList.toggle('shielded', P.shield > 0); HUD.shield = P.shield; }
  if (max !== HUD.hypeMax) {
    const el = $('#hype'); el.style.width = (180 * max / 99) + 'px';
    el.querySelectorAll('i').forEach(x => x.remove());
    for (let k = TUNE.healCost; k < max; k += TUNE.healCost) { const i = document.createElement('i'); i.style.left = (k / max * 100) + '%'; el.appendChild(i); }
    HUD.hypeMax = max; HUD.hype = -1;
  }
  const hype = Math.round(P.hype);
  if (hype !== HUD.hype) { $('#hypeFill').style.width = (hype / max * 100) + '%'; $('#hype').classList.toggle('ready', hype >= TUNE.healCost); HUD.hype = hype; }
  if (ABIL.launch !== HUD.launch) { $('#balls').style.display = ABIL.launch ? '' : 'none'; HUD.launch = ABIL.launch; }
  if (P.boomMode !== HUD.boom) { $('#balls').classList.toggle('boom', P.boomMode); HUD.boom = P.boomMode; }
  if (TUNE.ballCount !== HUD.ballMax) { $('#balls').innerHTML = '<span></span>'.repeat(TUNE.ballCount); HUD.ballMax = TUNE.ballCount; HUD.balls = -1; }
  if (P.balls !== HUD.balls) { $$('#balls span').forEach((s, i) => s.classList.toggle('used', i >= P.balls)); HUD.balls = P.balls; }
  if (D.bolts !== HUD.bolts || HUD.boltBump) {
    $('#boltN').textContent = D.bolts; HUD.bolts = D.bolts;
    if (HUD.boltBump) { const b = $('#bolts'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); HUD.boltBump = false; }
  }
  const oreOn = D.lars || D.ore > 0 || Object.keys(D.ores).length > 0;
  if (oreOn !== HUD.oreOn) { $('#ores').style.display = oreOn ? '' : 'none'; HUD.oreOn = oreOn; }
  if (D.ore !== HUD.ore) { $('#oreN').textContent = D.ore; HUD.ore = D.ore; }
  if (Game.combo !== HUD.combo) {
    const el = $('#combo'); el.classList.toggle('show', Game.combo >= 2);
    if (Game.combo >= 2) { $('#comboN').textContent = Game.combo; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
    HUD.combo = Game.combo;
  }
  $('#hud').style.opacity = Story.active ? 0 : 1;
}

/* ---------- Main loop ---------- */
let last = performance.now(), acc = 0, started = false;
function shopStep(d) { const n = vitems(VENDORS[Shop.v]).length; Shop.sel = (Shop.sel + d + n) % n; renderShop(); SFX.ui(); }
function loop(now) {
  // schedule the next frame first: one bad frame must never freeze the game on a black screen
  requestAnimationFrame(loop);
  try {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;   // a background tab never dumps a huge step on the physics
  if (started && !UI.modal) {
    acc += dt * (Game.timeK || 1);   // timeK: the ball wheel (zone/arsenal.js) slows time to half while it is open
    let n = 0;
    while (acc >= STEP && n < 24) { step(STEP); acc -= STEP; n++; }
    if (n >= 24) acc = 0;
  } else {
    // controller navigation for menus
    Input.pollPad();
    const B = Input.buffered;
    if (!started) { if (B.has('jump') || B.has('attack')) startGame(); }
    else if (UI.modal === 'pause') {
      if (B.has('down')) { pauseSel = (pauseSel + 1) % pauseBtns.length; markPause(); SFX.ui(); }
      if (B.has('up')) { pauseSel = (pauseSel + pauseBtns.length - 1) % pauseBtns.length; markPause(); SFX.ui(); }
      if (B.has('jump')) pauseAction(pauseBtns[pauseSel].dataset.p); else if (B.has('dash')) closeModal();
    } else if (UI.modal === 'shop') {
      if (B.has('down')) shopStep(1);
      if (B.has('up')) shopStep(-1);
      if (B.has('jump') || B.has('attack')) buy(Shop.sel); else if (B.has('dash') || B.has('ball')) closeModal();
    } else if (UI.modal === 'travel') {
      if (B.has('down')) moveTravel(1);
      if (B.has('up')) moveTravel(-1);
      if (B.has('jump') || B.has('attack')) travelTo(Travel.sel); else if (B.has('dash') || B.has('ball')) closeModal();
    } else if (UI.modal) { if (B.has('jump') || B.has('attack') || B.has('dash') || B.has('map')) closeModal(); }
    Input.endStep();
  }
  Game.shake *= Math.exp(-dt * 10);
  Game.flashRed = Math.max(0, Game.flashRed - dt * 1.5);
  Game.flashWhite = Math.max(0, Game.flashWhite - dt * 2);
  Game.fade = approach(Game.fade, Game.fadeTarget, dt * 4);
  render(); updateHUD();
  document.body.classList.toggle('playing', started && !UI.modal);
  } catch (e) {
    logErr('frame failed', e);
  }
}

/* ---------- Keyboard for menus ---------- */
addEventListener('keydown', e => {
  if (!started) { if (['Enter', 'Space', 'KeyJ', 'KeyX'].includes(e.code)) { e.preventDefault(); startGame(); } return; }
  const m = UI.modal;
  if (!m) {
    if ((e.code === 'Escape' || e.code === 'KeyP') && !Story.active) { e.preventDefault(); setPaused(true); }
    return;
  }
  if (e.code === 'Escape' || (m === 'map' && KEYMAP[e.code] === 'map')) { e.preventDefault(); closeModal(); return; }
  const dn = e.code === 'ArrowDown' || e.code === 'KeyS', upk = e.code === 'ArrowUp' || e.code === 'KeyW';
  const ok = e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyJ';
  if (m === 'pause') {
    if (dn) { pauseSel = (pauseSel + 1) % pauseBtns.length; markPause(); SFX.ui(); }
    if (upk) { pauseSel = (pauseSel + pauseBtns.length - 1) % pauseBtns.length; markPause(); SFX.ui(); }
    if (ok) { e.preventDefault(); pauseAction(pauseBtns[pauseSel].dataset.p); }
  } else if (m === 'shop') {
    if (dn) shopStep(1);
    if (upk) shopStep(-1);
    if (ok) { e.preventDefault(); buy(Shop.sel); }
    if (e.code === 'KeyK') closeModal();
  } else if (m === 'travel') {
    if (dn) moveTravel(1);
    if (upk) moveTravel(-1);
    if (ok) { e.preventDefault(); travelTo(Travel.sel); }
  } else if (m === 'unlock' || m === 'map') {
    if (ok) { e.preventDefault(); closeModal(); }
  }
});
addEventListener('padpause', () => { if (started && !UI.modal && !Story.active) setPaused(true); else if (UI.modal === 'pause') closeModal(); });

/* ---------- Start ---------- */
// the story pages boot straight into the world now; these card writes are optional
function setStartCard(zoneSub, title, lede) {
  const a = $('#startZone'), b = $('#startTitle'), c = $('#startLede');
  if (a && zoneSub) a.textContent = zoneSub;
  if (b && title) b.textContent = title;
  if (c && lede) c.textContent = lede;
}
function startGame() {
  if (started) return;
  started = true; SFX.ensure();
  const s = $('#start'); if (s) s.classList.remove('show');
  Input.enabled = true; Input.clear();
  PAGE.start();
}
// call at the end of each page's boot
function runPage() {
  if (PAGE_BLOCKED) return;   // locked page: never start the game, just wait for the redirect
  Game.combo = 0; Game.comboT = 0; Game.hazardT = 0; Game.respawnT = 0;
  applyUpgrades(); snapCamera();
  // no start button to click, so the first key or tap is what unlocks audio
  const unlock = () => { SFX.ensure(); };
  addEventListener('pointerdown', unlock, { once: true });
  addEventListener('keydown', unlock, { once: true });
  // start drawing before the first scene runs: if anything in a page's opening
  // throws, we still get a live frame instead of a frozen black screen
  requestAnimationFrame(loop);
  try { startGame(); }
  catch (e) {
    logErr('startGame failed', e);
    Game.fadeTarget = 0; Game.fade = 0; Input.enabled = true;
    if (typeof Story !== 'undefined') Story.active = false;
    toast('OPENING SCENE FAILED · CHECK CONSOLE');
  }
}
