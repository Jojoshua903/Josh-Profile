'use strict';
/* ---------- state ---------- */
let hero = HEROES[0], S = null, P = {x: 0, y: 0};
const keys = new Set();
const SAVE_KEY = 'widrTrickOrTreat';
let SAVE = {ach: {}, best: {}};
try { SAVE = Object.assign(SAVE, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); } catch (e) {}
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) {} };

// stat index: 0 speed, 1 courage, 2 charm, 3 brains, 4 luck
function st(i) {
  let v = hero.stats[i] + (S ? S.bonus[i] : 0);
  if (S && S.costume && S.costume.s === i) v++;
  if (S && i === 1 && S.robinPower) v += 4;
  return clamp(v, 1, 9);
}
const bonus = () => (st(3) - 3) + (hero.id === 'enno' ? 5 : 0);
const roll = (i, diff) => Math.random() * 6 + st(i) * 0.9 + (st(4) - 3) * 0.4 >= diff;

/* ---------- candy ---------- */
const countOf = o => Object.values(o).reduce((a, b) => a + b, 0);
const bagCount = () => countOf(S.bag);
const points = o => Object.entries(o).reduce((a, [k, v]) => a + CANDY[k].pts * v, 0);

function addPieces(type, n) {
  let added = 0;
  for (let i = 0; i < n; i++) { if (bagCount() >= S.cap) break; S.bag[type] = (S.bag[type] || 0) + 1; added++; }
  if (added < n && performance.now() - (S.fullT || 0) > 6000) { S.fullT = performance.now(); toast('🎒 Bag full! Head home 🏠 to stash it.', 'bad'); }
  return added;
}
function pickType(mixName) {
  const m = MIX[mixName] || MIX.std; let tot = 0; for (const k in m) tot += m[k];
  let r = Math.random() * tot; for (const k in m) { r -= m[k]; if (r <= 0) return k; }
  return 'sweet';
}
function doorMult(n) {
  let m = n * (1 + (st(2) - 3) * 0.12);
  if (S.rushUntil > S.min) m *= 2;
  if (S.stormUntil > S.min) m += 2;
  if (hero.id === 'nathan') m += 1;
  if (S.pity) { m *= 3; S.pity = false; toast('😭 Robin sobs on the doorstep. TRIPLE CANDY.', 'good'); }
  return Math.max(1, Math.round(m));
}
function give(n, mix, from) {
  n = doorMult(n); let got = 0; const tally = {};
  for (let i = 0; i < n; i++) { const t = pickType(mix); if (addPieces(t, 1)) { got++; tally[t] = (tally[t] || 0) + 1; } else break; }
  if (got) {
    sfx('coin'); floatText('+' + got);
    toast(`+${got} ${Object.entries(tally).map(([k, v]) => CANDY[k].e + v).join(' ')}${from ? ` from ${from}` : ''}`, 'good');
    S.got += got;
  }
  updHUD();
}
function giveType(type, n, from) {
  const got = addPieces(type, n);
  if (got) { sfx('coin'); floatText(`+${got} ${CANDY[type].e}`); toast(`+${got} ${CANDY[type].e} ${CANDY[type].n}${from ? ` from ${from}` : ''}`, type === 'raisin' ? 'weird' : 'good'); S.got += got; }
  updHUD();
}
function takeCandy(n, quiet) {
  let taken = 0;
  for (let i = 0; i < n; i++) { const ks = Object.keys(S.bag).filter(k => S.bag[k] > 0); if (!ks.length) break; S.bag[pick(ks)]--; taken++; }
  if (taken && !quiet) toast(`−${taken} candy`, 'bad');
  updHUD(); return taken;
}
function dropCandy(n) {
  if (hero.id === 'thomas') { toast('⚪ Thomas just rolls with it. Nothing dropped.', 'good'); return; }
  const t = takeCandy(n, true);
  for (let i = 0; i < t; i++) { const p = freeSpot(P.x, P.y, 70); S.pickups.push({x: p.x, y: p.y, t: 'sweet'}); }
  if (t) toast(`You dropped ${t} candy! Grab them!`, 'bad');
}
function stashBag() {
  const n = bagCount();
  for (const k in S.bag) { S.stash[k] = (S.stash[k] || 0) + S.bag[k]; S.bag[k] = 0; }
  toast(`🏠 Stashed ${n} pieces. Safe and sound.`, 'good'); sfx('good'); updHUD();
}

/* ---------- fright, shields, items ---------- */
function addScare(n, kind) {
  if (n > 0) {
    if (S.robinPower) return;
    if (performance.now() < S.ghostUntil) n *= 0.5;
    if (S.items.includes('flash')) n *= 0.5;
    if (kind === 'jump' && hero.id === 'daniel') n *= 0.5;
    n *= (1.35 - st(1) * 0.1);
    S.flash = performance.now();
  }
  S.scare = clamp(S.scare + n, 0, 100); S.peak = Math.max(S.peak || 0, S.scare);
  if (hero.id === 'robin' && S.scare >= 70 && !S.robinPower) {
    S.robinPower = true; S.scare = 70;
    news(hero, '😭➡️💪 ROBIN’S SECRET POWER AWAKENS. Fearless and fast for the rest of the night!');
  }
  updHUD();
  if (S.scare >= 100) endNight('faint');
}
function blocked(what) {
  if (S.shield > 0) { S.shield--; toast(`🛡️ Shield blocked ${what}!`, 'good'); sfx('good'); updHUD(); return true; }
  return false;
}
function addItem(id) {
  if (S.items.length >= 4) { toast(`Pockets full! ${ITEMS[id].e} left behind.`, ''); return; }
  S.items.push(id); toast(`${ITEMS[id].e} Got: ${ITEMS[id].n}. ${ITEMS[id].d}`, 'good'); renderItems();
}
function useItem(i) {
  const id = S.items[i]; if (!id || ITEMS[id].passive || S.modal || S.over) return;
  S.items.splice(i, 1); const now = performance.now();
  if (id === 'skates') S.boostUntil = now + 20000;
  if (id === 'snack') { S.hazards.forEach(h => { if (h.type !== 'reshman') h.flee = now + 8000; }); toast('🍖 Every pest runs after the snack!', 'good'); }
  if (id === 'field') S.shield++;
  if (id === 'map') S.revealUntil = now + 40000;
  if (id === 'magnet') S.magnetUntil = now + 30000;
  if (id === 'calm') addScare(-30);
  sfx('good'); renderItems(); updHUD();
}

/* ---------- abilities ---------- */
function useAbility() {
  if (!S || S.modal || S.over || S.busy) return;
  const ab = hero.ab;
  if (ab.kind === 'autowin') { toast(`${ab.icon} Save ${ab.name} for a challenge. It shows up inside every mini-game.`, ''); return; }
  if (S.charges <= 0) { toast('No charges left tonight.', ''); return; }
  S.charges--; doAbility(ab.kind, ab); updHUD();
}
function doAbility(kind, ab) {
  const now = performance.now();
  switch (kind) {
    case 'speed': S.boostUntil = now + (ab.long ? 18000 : 12000); if (ab.long) S.scrambleUntil = 0; toast(`${ab.icon} ${ab.name}! Zoom.`, 'good'); break;
    case 'ghost': S.ghostUntil = now + 9000; S.boostUntil = Math.max(S.boostUntil, now + 9000); toast(`${ab.icon} ${ab.name}! Untouchable for 9s.`, 'good'); break;
    case 'reveal': S.revealUntil = now + 40000; toast(`${ab.icon} ${ab.name}! Every porch revealed.`, 'good'); break;
    case 'freeze': freezeAll(15000); toast(`${ab.icon} ${ab.name}! Every pest frozen solid.`, 'good'); break;
    case 'blast': blast(ab.r || 250, ab); if (ab.speed) S.boostUntil = now + 5000; break;
    case 'pity': S.pity = true; toast('😭 Robin is ready to cry. Next door gives TRIPLE.', 'good'); break;
    case 'shield': S.shield += 2; toast(`${ab.icon} ${ab.name}! +2 shield.`, 'good'); break;
    case 'scout': S.shield += 1; toast(`${ab.icon} ${ab.name}! +1 shield.`, 'good'); addItem(pick(['flash', 'skates', 'snack', 'map', 'magnet', 'calm'])); break;
    case 'gadget': {
      const g = pick(['speed', 'ghost', 'reveal', 'freeze', 'shield', 'item']);
      const names = {speed: 'Spring Boots', ghost: 'Cloak-o-matic', reveal: 'X-Ray Specs', freeze: 'Freeze Ray', shield: 'Force Field'};
      if (g === 'item') addItem(pick(Object.keys(ITEMS)));
      else doAbility(g, {name: 'Gadget: ' + names[g], icon: '🎒'});
      break;
    }
  }
  sfx('power');
}
function blast(r, ab) {
  const now = performance.now(); let hit = 0;
  S.blastFx = {x: P.x, y: P.y, r, t: now};
  for (const h of S.hazards) {
    if (h.type === 'reshman' || Math.hypot(h.x - P.x, h.y - P.y) > r) continue;
    hit++;
    if (h.type === 'fox' && h.loot > 0) {
      for (let i = 0; i < h.loot; i++) { const p = freeSpot(h.x, h.y, 60); S.pickups.push({x: p.x, y: p.y, t: 'choc'}); }
      toast(`🦊 Anker Vos drops ${h.loot} stolen candies!`, 'good', ANKER); h.loot = 0; ach('foxhunt');
    }
    h.flee = now + 7000; h.stun = now + 1500;
  }
  if (hero.id === 'daniel') {
    for (const hs of S.houses) {
      if (hs.kind === 'dark' && Math.hypot(hs.door.x - P.x, hs.door.y - P.y) < r) {
        hs.kind = 'event'; hs.event = 'bowl'; hs.done = false; hit++;
        toast('💣 A dark house’s door blows open… there’s a candy bowl inside!', 'good');
      }
    }
  }
  toast(`${ab.icon} ${ab.name}! ${hit ? hit + ' hit.' : 'Nothing in range.'}`, hit ? 'good' : '');
}
function freezeAll(ms) { const now = performance.now(); S.hazards.forEach(h => h.frozen = now + ms); }

/* ---------- map ---------- */
const W = 1800, H = 1200, HY = [240, 600, 960], VX = [340, 920, 1500];
const COLS = [150, 520, 740, 1100, 1320, 1680];
const ROWS = [{y: 95, dir: 'bottom'}, {y: 295, dir: 'top'}, {y: 465, dir: 'bottom'}, {y: 655, dir: 'top'}, {y: 825, dir: 'bottom'}, {y: 1015, dir: 'top'}];
const HOUSECOL = ['#ffd6a5', '#fdffb6', '#caffbf', '#9bf6ff', '#ffc6ff', '#ffadad', '#bdb2ff', '#ffe5b4'];
const ROOFCOL = ['#ff7a1f', '#8a5cff', '#1fb5a6', '#ff3b5c', '#3c8dff', '#8b5a2b', '#2f9a46'];

function inHouse(x, y, m = 0) { return S.houses.some(h => !h.gone && x > h.x - m && x < h.x + h.w + m && y > h.y - m && y < h.y + h.h + m); }
function onRoad(x, y, m = 0) { return HY.some(r => Math.abs(y - r) < 40 + m) || VX.some(r => Math.abs(x - r) < 40 + m); }
function roadPoint() { return Math.random() < 0.55 ? {x: rnd(30, W - 30), y: pick(HY) + rnd(-28, 28)} : {x: pick(VX) + rnd(-28, 28), y: rnd(30, H - 30)}; }
function snapRoad(x, y) {
  const dy = HY.map(r => Math.abs(y - r)), dx = VX.map(r => Math.abs(x - r));
  const my = Math.min(...dy), mx = Math.min(...dx);
  return my < mx ? {x, y: HY[dy.indexOf(my)]} : {x: VX[dx.indexOf(mx)], y};
}
function freeSpot(x, y, r) {
  for (let i = 0; i < 12; i++) { const p = {x: clamp(x + rnd(-r, r), 20, W - 20), y: clamp(y + rnd(-r, r), 20, H - 20)}; if (!inHouse(p.x, p.y, 8)) return p; }
  return snapRoad(x, y);
}

function buildMap() {
  S.houses = [];
  ROWS.forEach((r, row) => COLS.forEach((cx, col) => {
    const w = 130, hh = 90, x = cx - 65, y = r.y;
    S.houses.push({
      x, y, w, h: hh, cx, row, col, dir: r.dir,
      door: {x: cx, y: r.dir === 'bottom' ? y + hh : y},
      stand: {x: cx, y: r.dir === 'bottom' ? y + hh + 22 : y - 22},
      color: pick(HOUSECOL), roof: pick(ROOFCOL), done: false, kind: 'event',
    });
  }));
  const home = S.houses.find(h => h.row === 3 && h.col === 0);
  home.kind = 'home'; home.color = '#fff'; home.roof = '#ff7a1f'; S.home = home;
  const haunt = S.houses.find(h => h.row === 5 && h.col === 5);
  haunt.kind = 'haunted'; haunt.color = '#d8d0e8'; haunt.roof = '#4a3a6a';
  const rest = shuffle(S.houses.filter(h => h.kind === 'event'));
  const res = RESIDENTS.filter(r => r.id !== hero.id);
  const names = shuffle(NEIGHBOURS);
  rest.forEach((h, i) => {
    h.host = {name: names[i % names.length], title: 'NEIGHBOUR', color: pick(NCOLORS), hair: pick(NHAIR)};
    if (i < res.length) { h.kind = 'res'; h.res = res[i]; }
    else if (i < res.length + 4) h.kind = 'dark';
    else h.event = weightedEvent();
  });
  shuffle(rest.filter(h => h.kind === 'event')).slice(0, 3).forEach(h => h.mimic = true);
  // decor
  S.trees = []; let guard = 0;
  while (S.trees.length < 80 && guard++ < 3000) {
    const x = rnd(10, W - 10), y = rnd(10, H - 10);
    if (!onRoad(x, y, 18) && !inHouse(x, y, 22)) S.trees.push({x, y, r: rnd(12, 22), c: pick(['#a9c97a', '#94bb63', '#c2d68a', '#e8a65a'])});
  }
}
function weightedEvent() {
  const ids = Object.keys(DOOR_EVENTS); let tot = 0; ids.forEach(k => tot += DOOR_EVENTS[k].w);
  let r = Math.random() * tot; for (const k of ids) { r -= DOOR_EVENTS[k].w; if (r <= 0) return k; }
  return 'normal';
}
function rumorHouse() {
  const open = S.houses.filter(h => h.kind === 'event' && !h.done && !h.rumor);
  if (!open.length) return null;
  const h = open.find(x => x.event === 'fullsize') || pick(open);
  h.event = 'fullsize'; h.rumor = true; return h;
}

/* ---------- friends wandering the street ---------- */
const GX = [40, 340, 920, 1500, 1760], GY = [40, 240, 600, 960, 1160];
const nodeOk = (xi, yi) => VX.includes(GX[xi]) || HY.includes(GY[yi]);
function nextNode(f) {
  const opts = [];
  if (HY.includes(GY[f.yi])) { if (f.xi > 0) opts.push([f.xi - 1, f.yi]); if (f.xi < GX.length - 1) opts.push([f.xi + 1, f.yi]); }
  if (VX.includes(GX[f.xi])) { if (f.yi > 0) opts.push([f.xi, f.yi - 1]); if (f.yi < GY.length - 1) opts.push([f.xi, f.yi + 1]); }
  const ok = opts.filter(([a, b]) => nodeOk(a, b));
  const [a, b] = pick(ok.length ? ok : [[f.xi, f.yi]]);
  f.xi = a; f.yi = b; f.tx = GX[a] + rnd(-18, 18); f.ty = GY[b] + rnd(-18, 18);
}
function spawnFriends() {
  const resHeroes = RESIDENTS.filter(r => r.hero).map(r => r.id);
  const pool = shuffle(HEROES.filter(h => h.id !== hero.id && !resHeroes.includes(h.id) && ENCOUNTERS[h.id]));
  S.friends = pool.slice(0, 7).map(ch => {
    let xi, yi; do { xi = ri(0, GX.length - 1); yi = ri(0, GY.length - 1); } while (!nodeOk(xi, yi));
    const f = {ch, xi, yi, x: GX[xi], y: GY[yi], met: false};
    nextNode(f); return f;
  });
}

/* ---------- pests ---------- */
function spawnHazard(type, angry) {
  const a = rnd(0, Math.PI * 2);
  const base = {type, x: clamp(P.x + Math.cos(a) * 520, 40, W - 40), y: clamp(P.y + Math.sin(a) * 520, 40, H - 40), frozen: 0, flee: 0, stun: 0, loot: 0};
  if (type === 'fox') Object.assign(base, {ch: ANKER, until: S.min + (angry ? 30 : 24), sp: (angry ? 172 : 148) * (hero.id === 'ash' ? 0.85 : 1)});
  if (type === 'meta') Object.assign(base, {ch: META, until: S.min + 22, sp: 105 * (hero.id === 'dih' ? 0.7 : 1)});
  if (type === 'zennith') Object.assign(base, {ch: ZENNITH, until: S.min + 16, sp: 72});
  if (type === 'reshman') { const p = snapRoad(P.x + rnd(-160, 160), P.y + rnd(-160, 160)); Object.assign(base, {ch: RESHMAN, until: S.min + 14, sp: 0, x: clamp(p.x, 40, W - 40), y: clamp(p.y, 40, H - 40)}); }
  S.hazards.push(base);
}
function contact(h) {
  const now = performance.now();
  if (h.type === 'reshman') { h.dead = true; runBusy(reshmanTrade); return; }
  if (now < S.ghostUntil) return;
  if (h.type === 'fox') {
    h.flee = now + 5000;
    if (blocked('Anker Vos')) return;
    const t = takeCandy(5, true); h.loot += t; sfx('bad');
    toast(t ? `🦊 YOINK! Anker Vos stole ${t} candy. HAHAHAHA! (Blast him to get it back.)` : '🦊 Anker Vos sticks his tongue out at your empty bag.', 'bad', ANKER);
    if (t) ach('robbed');
  } else if (h.type === 'meta') {
    h.flee = now + 9000;
    if (blocked('Meta AI')) return;
    openMetaPop();
  } else if (h.type === 'house') {
    h.flee = now + 2600;
    if (!blocked('a living house')) {
      sfx('scare'); addScare(22, 'jump'); const t = takeCandy(4, true);
      toast(`🏚️ CHOMP! The house bit you${t ? ` and swallowed ${t} candy` : ''}!`, 'bad', houseChar(h.house));
    }
    knockBack(h.x, h.y, 90);
  } else if (h.type === 'bats') {
    h.flee = now + 3000;
    if (!blocked('the bats')) { addScare(12); sfx('scare'); toast('🦇 Bats in your hair! In your costume! EVERYWHERE!', 'bad', BATS); }
  } else if (h.type === 'pumpkin') {
    if (now < (h.hitT || 0)) return; h.hitT = now + 1500;
    if (!blocked('the rolling pumpkin')) { addScare(8); dropCandy(4); toast('🎃 FLATTENED by a giant rolling pumpkin!', 'bad', BIGPUMPKIN); }
    knockBack(h.x, h.y, 70);
  } else if (h.type === 'zennith') {
    if (!blocked('Zennith')) { addScare(25); sfx('scare'); toast('👁️ Zennith passes right through you. Everything goes cold.', 'bad', ZENNITH); }
    const p = roadPoint(); h.x = p.x; h.y = p.y; h.stun = now + 2500;
  }
}
function openMetaPop() {
  const p = document.getElementById('metaPop'); let clicks = 0;
  p.innerHTML = `<b>Meta AI</b><br><span class="ml">${pick(META_LINES)}</span><br><small>Controls scrambled while I’m talking! Close me.</small>`;
  const x = el('button', 'x', '✕'); p.appendChild(x);
  const place = () => { x.style.left = rnd(-12, 228) + 'px'; x.style.top = rnd(-12, 70) + 'px'; };
  place();
  x.onclick = () => { clicks++; if (clicks < 3) { place(); p.querySelector('.ml').textContent = pick(['Wait, one more thing!', 'Are you sure? I have more facts!', ...META_LINES]); } else closeMeta(true); };
  const st_ = document.getElementById('stage');
  p.style.left = (st_.clientWidth / 2 - 125) + 'px'; p.style.top = (st_.clientHeight * 0.32) + 'px';
  p.style.display = 'block'; S.metaOpen = true; S.scrambleUntil = performance.now() + 6000; sfx('news');
  clearTimeout(S.metaTimer); S.metaTimer = setTimeout(() => closeMeta(false), 6000);
}
function closeMeta(byUser) {
  const p = document.getElementById('metaPop');
  if (!S || !S.metaOpen) { p.style.display = 'none'; return; }
  S.metaOpen = false; p.style.display = 'none'; S.scrambleUntil = 0;
  if (byUser) { ach('meta'); toast('💬 Chat closed. Meta AI sulks.', 'good', META); }
}

/* ---------- busy wrapper for async scenes ---------- */
async function runBusy(fn) {
  if (S.busy) return; S.busy = true; keys.clear(); P.target = null;
  try { await fn(); } finally { if (S) S.busy = false; updHUD(); if (S && S.karma >= 5) ach('kind'); }
}
async function knock(h) {
  sfx('knock'); setTimeout(() => sfx('knock'), 140);
  await runBusy(async () => {
    if (h.kind === 'home') return homeVisit();
    if (h.kind === 'dark') { toast(`🌑 ${h.host.name}: lights off, nobody home.`, ''); return; }
    if (h.gone) return;
    if (h.mimic) { h.mimic = false; return mimicReveal(h); }
    h.done = true; h.timeless = false; ach('first');
    if (h.kind === 'res') await residentVisit(h);
    else if (h.kind === 'haunted') await hauntedHouse(h);
    else await DOOR_EVENTS[h.event].run(h);
    if (!h.timeless) S.min += 4;
  });
}
