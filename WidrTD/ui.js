// ===== WIDR TD: UI =====
const $ = id => document.getElementById(id);

function portrait(type, size = 64, sc = 1.15) {
  const c = document.createElement('canvas');
  c.width = size * DPR; c.height = size * DPR; c.style.width = c.style.height = size + 'px';
  const g = c.getContext('2d'); g.scale(DPR, DPR);
  drawHero(g, type, size / 2, size / 2 + 2, sc * size / 64 / Math.max(1, heroSize(type) * .75), Math.PI * .25, null, [0, 0, 0], 0);
  return c;
}

// ---------- Shop ----------
let shopCat = null;
function buildShop() {
  const shop = $('shop'); shop.innerHTML = '';
  // one category at a time, picked from the icon tabs, so the shop fits with any number of heroes
  if (!CATEGORIES.find(c => c.id === shopCat)) shopCat = CATEGORIES[0].id;
  const tabs = document.createElement('div'); tabs.className = 'shopTabs';
  for (const c of CATEGORIES) {
    const b = document.createElement('button');
    b.className = 'shopTab' + (c.id === shopCat ? ' on' : ''); b.style.setProperty('--c', c.color); b.title = c.name; b.textContent = c.icon;
    if (G.rules.allowed && !c.heroes.some(allowedHero)) b.classList.add('banned');
    b.onclick = () => { shopCat = c.id; buildShop(); refreshInfo(); };
    tabs.appendChild(b);
  }
  shop.appendChild(tabs);
  const cat = CATEGORIES.find(c => c.id === shopCat);
  shop.insertAdjacentHTML('beforeend', `<div class="shopCat" style="--c:${cat.color}">${cat.icon} ${cat.name}</div>`);
  for (const type of cat.heroes) {
    const d = TOWERS[type], ok = allowedHero(type);
    const b = document.createElement('button');
    b.className = 'card' + (ok ? '' : ' banned'); b.dataset.type = type; b.style.setProperty('--c', d.color);
    if (ok) b.dataset.cost = heroCost(type);
    b.title = `${d.name}: ${d.role}${ok ? '' : ' (not allowed in this mode)'}`;
    b.appendChild(portrait(type, 38));
    b.insertAdjacentHTML('beforeend', `<span class="nm">${d.name}</span><span class="rl">${d.role}</span><span class="cost">${ok ? '$' + heroCost(type) : '🔒'}</span>${masteryBadge(type)}${d.key ? `<kbd>${d.key}</kbd>` : ''}${type === G.mainHero ? '<span class="crown">👑</span>' : ''}`);
    b.onclick = () => choose(type);
    shop.appendChild(b);
  }
}
function choose(type) {
  if (!G.started || G.over || G.paused) return;
  if (!allowedHero(type)) { toast('NOT ALLOWED', `${TOWERS[type].name} can't be used in this mode.`); sfx('clink'); return; }
  if (heroCapReached()) { toast('HERO LIMIT', `Only ${G.rules.maxHeroes} heroes allowed here.`); sfx('clink'); return; }
  if (G.cash < heroCost(type)) { flashCash(); return; }
  if (catOf(type).id !== shopCat) { shopCat = catOf(type).id; buildShop(); }
  G.placing = G.placing === type ? null : type; G.sel = null; refreshInfo();
}
function flashCash() { const c = $('cashChip'); c.classList.remove('shake'); void c.offsetWidth; c.classList.add('shake'); }

// ---------- Info panel ----------
function rulesHtml() {
  const r = G.rules, out = [];
  if (G.mode === 'sandbox') out.push('Sandbox · unlimited cash');
  if (G.mode === 'odyssey') out.push(`Odyssey stage ${G.stage + 1}/3`);
  if (G.mode === 'bossrush') out.push(G.elite ? 'Elite Boss Rush' : 'Boss Rush');
  if (G.mode === 'daily') out.push('Daily Challenge');
  if (G.mode === 'challenge') out.push((CHALLENGES.find(c => c.id === G.challenge) || {}).name);
  if (r.allowed && G.mode !== 'odyssey') out.push('Only: ' + r.allowed.map(k => TOWERS[k].name).join(', '));
  if (r.noPath3) out.push('No Path 3');
  if (r.maxTier) out.push(`Max tier ${r.maxTier}`);
  if (r.maxHeroes) out.push(`Max ${r.maxHeroes} heroes`);
  if (r.enemySpeed) out.push(`Enemies ${Math.round(r.enemySpeed * 100)}% speed`);
  if (r.lives) out.push(`${r.lives} lives`);
  return out.length ? `<div class="rules">${out.map(s => `<span>${s}</span>`).join('')}</div>` : '';
}
const ENEMY_TAGS = [['camo', 'ghost'], ['armor', 'armor'], ['fly', 'flying'], ['frozen', 'frozen'], ['shield', 'shield'], ['heal', 'healer'], ['regrow', 'regrows'], ['boss', 'boss']];
function refreshInfo() {
  const el = $('info');
  document.querySelectorAll('.card').forEach(c => c.classList.toggle('on', c.dataset.type === G.placing));
  if (G.sel) {
    const t = G.sel, d = TOWERS[t.type];
    const lv = t.main ? heroLevel(t.hxp) : 0, need = HERO_XP[lv], prev = HERO_XP[lv - 1] || 0;
    el.innerHTML = `<div class="ihead" style="--c:${d.color}"><div class="pp"></div><div><b>${t.main ? '👑 ' : ''}${d.name}</b><small>${d.role}</small></div></div>
      ${t.main ? `<div class="hlv">Lv ${lv}<span class="bar"><i style="width:${need ? Math.min(100, (t.hxp - prev) / (need - prev) * 100) : 100}%"></i></span>${need ? `${Math.floor(t.hxp)}/${need} XP` : 'MAX'}</div>` : ''}
      <div class="row"><button class="chip" id="tgtBtn" title="Tab">🎯 ${t.target.toUpperCase()}</button>
      <button class="chip" id="treeBtn">📖 Skill tree</button>
      <span class="stat">${t.s.camo || t.camoGiven ? '👁 Ghosts' : '🙈 No ghosts'} · ${t.s.air ? '🪽 Hits flyers' : '⛔ No flyers'} · 💥 <b id="popStat">${t.pops}</b></span></div>${t.s.ability ? `<button class="abil big${abilityReady(t) ? '' : ' cool'}" id="abilBtn">${t.s.ability.icon} ${t.s.ability.name}</button>` : ''}
      ${heroStatusHtml(t)}
      <div class="paths">${d.paths.map((p, i) => pathHtml(t, p, i)).join('')}</div>
      <button class="sell" id="sellBtn">Sell for $${Math.floor(t.spent * .7)} <kbd>⌫</kbd></button>`;
    el.querySelector('.pp').appendChild(portrait(t.type, 52));
    $('sellBtn').onclick = () => sellTower(t);
    $('tgtBtn').onclick = () => cycleTarget();
    $('treeBtn').onclick = () => openTree(t.type, t);
    if ($('abilBtn')) $('abilBtn').onclick = () => useAbility(t);
    if ($('formBtn')) $('formBtn').onclick = () => swapForm(t);
    el.querySelectorAll('.up[data-p]').forEach(b => b.onclick = () => upgrade(t, +b.dataset.p));
  } else if (G.placing) {
    const d = TOWERS[G.placing];
    el.innerHTML = `<div class="ihead" style="--c:${d.color}"><div class="pp"></div><div><b>${d.name}</b><small>${d.role}</small></div></div>
      <p class="blurb">${d.blurb}</p>
      <div class="pathsum">${d.paths.map((p, i) => `<div><em class="p${i}">${p.name}</em>${p.ups.map(u => u.name).join(' → ')}</div>`).join('')}</div>
      <button class="chip" id="treeBtn">📖 Full skill tree</button>
      <p class="hint">Click the map to place${d.water ? ' (water works too)' : ''} · Esc to cancel${G.placing === G.mainHero && !G.towers.some(t => t.main) ? '<br>👑 This will be your main hero.' : ''}</p>`;
    el.querySelector('.pp').appendChild(portrait(G.placing, 52));
    $('treeBtn').onclick = () => openTree(G.placing);
  } else {
    const more = G.freeplay || G.wave < totalWaves(), next = more && G.mode !== 'sandbox' ? waveList(G.wave) : null;
    el.innerHTML = `${rulesHtml()}<h3>${G.mode === 'sandbox' ? 'Sandbox' : next ? `Up next · ${G.mode === 'bossrush' ? 'Boss' : 'Wave'} ${G.wave + 1}` : 'All waves cleared'}</h3>
      <ul class="next">${next ? next.map(([ty, n]) => `<li><i style="background:${ENEMIES[ty].color}"></i>${n}× ${ENEMIES[ty].name}${ENEMY_TAGS.filter(([k]) => ENEMIES[ty][k]).map(([, l]) => ` <span class="tag">${l}</span>`).join('')}</li>`).join('') : ''}</ul>
      ${G.mode === 'sandbox' ? '<p class="hint">Spawn any enemy from the panel on the map (shift+click for 10). Cash and lives are unlimited, and nothing here counts towards your profile.</p>' : ''}
      <p class="hint"><b>${MAP.name}</b>: ${MAP.blurb}</p>
      <p class="hint">Pick a hero, then click the map. Click a placed hero to upgrade it. Upgrade up to two paths: any one of them all the way to tier 5, the other up to tier 2.</p>`;
  }
  hudTick(true);
}
function pathHtml(t, p, i) {
  const tier = t.tiers[i], st = canUpgrade(t, i), up = p.ups[tier];
  const pips = p.ups.map((u, k) => `<span class="pip ${k < tier ? 'got' : ''}${u.paradise ? ' para' : ''}" title="${u.name}"></span>`).join('');
  let btn;
  if (st === 'max') btn = `<div class="up done">MAXED</div>`;
  else if (st === 'locked') btn = `<div class="up done">🔒 Path closed</div>`;
  else btn = `<button class="up${up.paradise ? ' paradise' : ''}" data-p="${i}" data-cost="${price(up.cost)}"><b>${up.paradise ? '🌈 ' : ''}${up.name}</b><span>${up.desc}</span><em>$${price(up.cost)}</em><kbd>${[',', '.', '/'][i]}</kbd></button>`;
  return `<div class="path p${i}"><div class="ph">${p.name}<span class="pips">${pips}</span></div>${btn}</div>`;
}
function cycleTarget() {
  if (!G.sel) return;
  G.sel.target = TARGETS[(TARGETS.indexOf(G.sel.target) + 1) % TARGETS.length]; refreshInfo();
}

// ---------- HUD ----------
let lastCash = -1, lastLives = -1;
function updateHud() {
  const n = G.wave + (G.running ? 1 : 0);
  $('wave').textContent = G.mode === 'sandbox' ? 'Sandbox' : G.freeplay ? `${n} ∞` : `${Math.min(n, totalWaves())}/${totalWaves()}${G.mode === 'odyssey' ? ` · S${G.stage + 1}` : ''}`;
  $('startBtn').disabled = G.running || G.over;
  $('startBtn').innerHTML = G.running ? 'Wave in progress' : G.mode === 'bossrush' ? `▶ Boss ${G.wave + 1} <kbd>Space</kbd>` : `▶ Start wave ${G.wave + 1} <kbd>Space</kbd>`;
  $('diffChip').textContent = {normal: DIFF.tag, sandbox: 'SANDBOX', daily: 'DAILY', challenge: 'CHALLENGE', bossrush: G.elite ? 'ELITE RUSH' : 'BOSS RUSH', odyssey: 'ODYSSEY'}[G.mode];
  $('diffChip').style.background = DIFF.color;
  $('mapName').textContent = MAP.name;
  $('sandbox').classList.toggle('show', G.mode === 'sandbox' && G.started);
  hudTick(true);
}
function hudTick(force) {
  if (!force && G.cash === lastCash && G.lives === lastLives) return;
  lastCash = G.cash; lastLives = G.lives;
  $('cash').textContent = G.mode === 'sandbox' ? '∞' : '$' + Math.floor(G.cash);
  $('lives').textContent = G.mode === 'sandbox' ? '∞' : G.lives;
  document.querySelectorAll('.app [data-cost]').forEach(b => b.classList.toggle('poor', G.cash < +b.dataset.cost));
  if ($('popStat') && G.sel) $('popStat').textContent = G.sel.pops;
}

// ---------- Ability bar ----------
const ABIL_KEYS = ['q', 'w', 'e', 'r', 'y', 'u', 'i', 'o', 'p'];
const abilTowers = () => G.towers.filter(t => t.s.ability).slice(0, ABIL_KEYS.length);
let abilKey = '';
function abilityTick() {
  const bar = $('abilities'), list = G.started ? abilTowers() : [];
  const key = list.map(t => t.id + t.s.ability.id).join();
  if (key !== abilKey) {
    abilKey = key;
    bar.innerHTML = list.map((t, i) => `<button class="ab" data-id="${t.id}" title="${TOWERS[t.type].name}: ${t.s.ability.name}"><span class="ic">${t.s.ability.icon}</span><span class="cdv"></span><kbd>${ABIL_KEYS[i].toUpperCase()}</kbd></button>`).join('');
    bar.querySelectorAll('.ab').forEach(b => b.onclick = () => { const t = G.towers.find(x => x.id === +b.dataset.id); if (t) useAbility(t); });
  }
  bar.querySelectorAll('.ab').forEach(b => {
    const t = G.towers.find(x => x.id === +b.dataset.id); if (!t) return;
    const k = Math.max(0, t.abCd) / t.s.ability.cd;
    b.style.setProperty('--k', (k * 360) + 'deg');
    b.classList.toggle('ready', k === 0);
    b.querySelector('.cdv').textContent = k ? Math.ceil(t.abCd) : '';
  });
  const ab = $('abilBtn');
  if (ab && G.sel) ab.classList.toggle('cool', !abilityReady(G.sel));
}

// ---------- Toasts ----------
let toastT, mtoastT;
function toast(big, small) {
  const el = $('toast'); el.innerHTML = `<b>${big}</b>${small ? `<span>${small}</span>` : ''}`;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), small ? 3800 : 1600);
}
// level-ups, reward track, achievements and mastery: small cards stacked in the bottom-left corner
function notify(big, small) {
  const box = $('corner'), el = document.createElement('div');
  el.className = 'cn'; el.innerHTML = `<b>${big}</b>${small ? `<span>${small}</span>` : ''}`;
  box.appendChild(el);
  while (box.children.length > 3) box.firstElementChild.remove();
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 4200);
  refreshHub();
}

// ---------- End screen ----------
function showEnd(won) {
  const lvBefore = levelInfo(G.xp0).lv;
  G.rewardLine = '';
  masteryEnd(won);
  Meta.event(won ? 'win' : 'lose');
  Music.play('menu');
  const o = $('overlay');
  const mvp = [...G.towers].sort((a, b) => b.pops - a.pops)[0];
  const best = bestWave(MAP.id, DIFF.tag);
  const title = won ? {normal: 'MAP CLEARED!', daily: 'DAILY WON!', challenge: 'CHALLENGE BEATEN!', bossrush: 'BOSSES BUSTED!', odyssey: 'ODYSSEY COMPLETE!'}[G.mode] : 'DEFEATED';
  const line = won ? (G.mode === 'normal' ? `You beat <b>${MAP.name}</b> on <b>${DIFF.name}</b> and earned the ${DIFF.tag.toLowerCase()} medal.` : G.rewardLine)
    : `The enemies broke through on ${G.mode === 'bossrush' ? 'boss' : 'wave'} ${G.wave + 1} of ${MAP.name}.`;
  o.innerHTML = `<div class="panel ${won ? 'win' : 'lose'}"><h1>${title}</h1>
    <p>${line}</p>
    <div class="endStats"><div><b>${G.wave}</b>${G.mode === 'bossrush' ? 'bosses beaten' : 'waves cleared'}</div><div><b>${G.pops}</b>enemies popped</div><div><b>+${Meta.p.xp - G.xp0}</b>XP earned</div><div><b>+${Meta.p.biscotti - G.bis0} 🍪</b>Biscotti earned</div></div>
    ${mvp && mvp.pops ? `<div class="mvp"><span class="mvpP"></span><div><small>MVP</small><b>${TOWERS[mvp.type].name}</b> ${mvp.tiers.join('-')} · ${mvp.pops} pops${mvp.main ? ` · hero level ${heroLevel(mvp.hxp)}` : ''}</div></div>` : ''}
    <p class="small">Level ${Meta.level()}${Meta.level() > lvBefore ? ' · LEVEL UP!' : ''}${G.mode === 'normal' ? ` · best wave on this map and difficulty: ${best}` : ''}</p>
    <div class="btnrow">${won && G.mode === 'normal' ? '<button class="big" id="freeBtn">∞ Keep going (Freeplay)</button>' : ''}<button class="big${won && G.mode === 'normal' ? ' alt' : ''}" id="againBtn">Play again</button><button class="big alt" id="toMenuBtn">Main menu</button></div></div>`;
  $('againBtn').onclick = resetGame; $('toMenuBtn').onclick = showMenu;
  if ($('freeBtn')) $('freeBtn').onclick = () => { G.freeplay = true; G.over = false; o.classList.remove('show'); Music.play('battle'); toast('FREEPLAY', 'Endless waves, getting tougher every round. A boss shows up every few waves.'); saveGame(); updateHud(); refreshInfo(); };
  if (mvp && mvp.pops) o.querySelector('.mvpP').appendChild(portrait(mvp.type, 56));
  o.classList.add('show');
}

// ---------- Pause ----------
function showPause() {
  if (!G.started || G.over) return;
  G.paused = true;
  const o = $('overlay');
  o.innerHTML = `<div class="panel"><h1>PAUSED<em>${MAP.name} · ${$('diffChip').textContent} · wave ${G.wave + (G.running ? 1 : 0)}</em></h1>
    <div class="stack"><button class="big" id="resumeBtn">▶ Resume</button><button class="big alt" id="pTreeBtn">📖 Skill trees</button>
    <button class="big alt" id="restartBtn">↺ Restart</button><button class="big alt" id="quitBtn">⌂ Main menu</button></div>
    <p class="small">${G.mode === 'sandbox' ? 'Sandbox games are not saved.' : 'Your game is saved after every wave. Pick Continue on the main menu to come back.'}</p></div>`;
  $('resumeBtn').onclick = hidePause; $('pTreeBtn').onclick = () => openTree(TOWER_ORDER[0]);
  $('restartBtn').onclick = () => { Meta.bank(); Meta.save(); resetGame(); };
  $('quitBtn').onclick = () => { Meta.bank(); Meta.save(); showMenu(); };
  o.classList.add('show');
}
function hidePause() { $('overlay').classList.remove('show'); G.paused = false; }
const pauseOpen = () => G.started && !G.over && $('overlay').classList.contains('show');

// ---------- Game flow ----------
// RUN describes the game being played, so "Play again" can restart it exactly
let RUN = {mode: 'normal', map: 'isles', diff: 'normal', rules: {}};
function resetGame() {
  DIFF = DIFFS[RUN.diff] || DIFFS.normal;
  const R = RUN.rules || {};
  loadMap(RUN.mode === 'odyssey' ? ODYSSEY[0].map : RUN.map); BG = buildBackground(MAP);
  const main = allowedHeroFor(R, Meta.p.mainHero) ? Meta.p.mainHero : null;
  Object.assign(G, {mode: RUN.mode, rules: R, elite: !!RUN.elite, challenge: RUN.challenge || null, crew: RUN.crew || null, stage: 0, mainHero: main,
    cash: R.cash || (RUN.mode === 'odyssey' ? ODYSSEY[0].cash : DIFF.cash), lives: R.lives || DIFF.lives, wave: 0, running: false, queue: [], waveT: 0, enemies: [], towers: [], projs: [], fx: [], patches: [],
    sel: null, placing: null, over: false, won: false, started: true, paused: false, speed: 1, freeplay: false, pops: 0, banked: 0, rallyT: 0, waveHp: 1, shake: 0, spawnAlt: 0, runT: 0});
  setupHazards();
  $('speedBtn').textContent = '» 1x'; $('speedBtn').classList.remove('lit');
  $('overlay').classList.remove('show'); $('menu').classList.remove('show');
  clearSave();
  Meta.event('start'); G.xp0 = Meta.p.xp; G.bis0 = Meta.p.biscotti;
  buildShop(); buildSandbox(); refreshInfo(); updateHud();
  Music.play('battle');
  const intro = {normal: `${DIFF.name}: ${MAP.blurb}`, sandbox: 'Sandbox: spawn anything, test any build. Nothing counts here.', daily: `Today's twist: ${RUN.modName || ''}`,
    challenge: (CHALLENGES.find(c => c.id === RUN.challenge) || {}).desc, bossrush: `Six bosses back to back${G.elite ? ', all elite' : ''}. Clock is running!`,
    odyssey: 'Stage 1 of 3. Beat 10 waves on each map with your crew.'}[RUN.mode];
  toast(MAP.name.toUpperCase(), intro);
}
const allowedHeroFor = (rules, type) => !rules.allowed || rules.allowed.includes(type);
function startRun(cfg) { RUN = Object.assign({rules: {}}, cfg); sfx('up'); resetGame(); }
let pickedMap = MAPS[0], pickMode = 'normal';
function begin(diffKey) { startRun({mode: 'normal', map: pickedMap.id, diff: diffKey}); }
function continueGame() {
  const s = savedGame(); if (!s) return;
  loadGame(s);
  RUN = {mode: s.mode, map: s.mode === 'odyssey' ? ODYSSEY[0].map : s.map, diff: s.diff, rules: s.rules || {}, elite: s.elite, challenge: s.challenge, crew: s.crew};
  $('menu').classList.remove('show'); $('overlay').classList.remove('show');
  $('speedBtn').textContent = '» 1x'; $('speedBtn').classList.remove('lit');
  buildShop(); buildSandbox(); refreshInfo(); updateHud();
  Music.play('battle'); sfx('up');
  toast('WELCOME BACK', `${MAP.name} · wave ${G.wave + 1} is next.`);
}
function showMenu() {
  G.started = false; G.paused = false; G.over = false;
  $('overlay').classList.remove('show'); closeTree();
  $('menu').classList.add('show'); showPanel('menuMain');
  Music.play('menu');
}

// ---------- Sandbox spawn panel ----------
function buildSandbox() {
  const el = $('sandbox');
  if (G.mode !== 'sandbox') { el.innerHTML = ''; return; }
  el.innerHTML = `<b>🧪 Spawn</b><small>click 1 · shift+click 10</small> <button id="sbMin" style="display:inline-flex;float:right">–</button>
    <div class="sbList">${Object.keys(ENEMIES).map(k => `<button data-k="${k}"><i style="background:${ENEMIES[k].color}"></i>${ENEMIES[k].name}</button>`).join('')}
    <button id="sbElite" class="${G.elite ? 'on' : ''}">💀 Elite bosses</button><button id="sbClear">🧹 Clear</button></div>`;
  el.querySelectorAll('[data-k]').forEach(b => b.onclick = ev => { sandboxSpawn(b.dataset.k, ev.shiftKey ? 10 : 1); sfx('place'); });
  $('sbElite').onclick = () => { G.elite = !G.elite; $('sbElite').classList.toggle('on', G.elite); };
  $('sbClear').onclick = () => { G.enemies = []; G.queue = []; G.running = false; updateHud(); };
  $('sbMin').onclick = () => el.classList.toggle('min');
}

// ---------- Main menu hub ----------
function showPanel(id) {
  document.querySelectorAll('.mpanel').forEach(p => p.classList.toggle('hidden', p.id !== id));
  $('menu').classList.toggle('inSub', id !== 'menuMain');
  ({menuMaps: renderMaps, menuAch: renderAch, menuStore: renderStore, menuCareer: renderCareer, menuSet: syncSettings, menuEvents: renderEvents, menuCrew: renderCrew, menuTrack: renderTrack})[id]?.();
  refreshHub();
}
function refreshHub() {
  const L = levelInfo(Meta.p.xp);
  $('hubLevel').textContent = L.lv;
  $('hubXpFill').style.width = (L.into / L.need * 100) + '%';
  $('hubXpText').textContent = `${L.into} / ${L.need} XP`;
  const title = ALL_ITEMS.find(i => i.id === Meta.p.equipped.title);
  $('hubTitle').textContent = title ? title.name : ['Recruit', 'Isle Scout', 'Fruit Ranger', 'Pear Agent', 'Demo Expert', 'Orbit Ace', 'Hundredaire', 'WIDR Legend'][Math.min(7, L.lv - 1)];
  let nextLv = L.lv + 1; while (nextLv < TRACK.length && !trackReward(nextLv).length) nextLv++;
  $('hubTrack').textContent = `Next at LV ${nextLv}: ${trackReward(nextLv).map(r => r.text).join(' + ')}`;
  $('hubBis').textContent = Meta.p.biscotti;
  $('hubAch').textContent = `${Object.keys(Meta.p.ach).length} / ${ACHIEVEMENTS.length}`;
  $('hubMaps').textContent = `${MAPS.filter(mapUnlocked).length} / ${MAPS.length} maps`;
  $('hubStore').textContent = `${Object.keys(Meta.p.owned).length} / ${STORE_ITEMS.length + ALL_ITEMS.filter(i => i.track && Meta.p.owned[i.id]).length} owned`;
  $('hubEvents').textContent = Meta.p.daily.last === todayKey() ? `Daily done ✓ · streak ${Meta.p.daily.streak}` : 'Daily Challenge ready! Plus Boss Rush, Odyssey and more';
  const s = savedGame();
  $('mCont').classList.toggle('hidden', !s);
  if (s) $('contInfo').textContent = `${(MAPS.find(m => m.id === s.map) || MAPS[0]).name} · wave ${s.wave + 1}${s.mode !== 'normal' ? ' · ' + {daily: 'Daily', challenge: 'Challenge', bossrush: 'Boss Rush', odyssey: 'Odyssey'}[s.mode] : ''}`;
}
function buildMenu() {
  $('mPlay').onclick = () => { pickMode = 'normal'; showPanel('menuMaps'); };
  $('mCont').onclick = continueGame;
  $('mTrack').onclick = () => showPanel('menuTrack');
  document.querySelector('.hubTop .player').onclick = () => showPanel('menuTrack');
  $('mHeroes').onclick = () => openTree(TOWER_ORDER[0]);
  $('mAch').onclick = () => showPanel('menuAch');
  $('mStore').onclick = () => showPanel('menuStore');
  $('mEvents').onclick = () => showPanel('menuEvents');
  $('mCareer').onclick = () => showPanel('menuCareer');
  $('mHow').onclick = () => showPanel('menuHow');
  $('mSet').onclick = () => showPanel('menuSet');
  $('hubGear').onclick = () => showPanel('menuSet');
  document.querySelectorAll('.back').forEach(b => b.onclick = () => showPanel(b.dataset.to || 'menuMain'));
  const heroRow = $('hubHeroes'); TOWER_ORDER.slice(0, 8).forEach(t => heroRow.appendChild(portrait(t, 40)));
  $('setMusic').onchange = e => { Music.setOn(e.target.checked); };
  $('setVol').oninput = e => Music.setVol(+e.target.value);
  $('setSfx').onchange = e => { G.mute = !e.target.checked; syncSettings(); };
  $('setVoice').onchange = e => setPref('voice', e.target.checked);
  $('setDmg').onchange = e => setPref('dmg', e.target.checked);
  $('crewGo').onclick = () => {
    if (crew.length !== 5) { sfx('clink'); return; }
    startRun({mode: 'odyssey', map: ODYSSEY[0].map, diff: 'normal', rules: {allowed: [...crew]}, crew: [...crew]});
  };
  $('resetBtn').onclick = e => {
    // two clicks to confirm, since browser popups may be blocked here
    if (!e.target.dataset.armed) { e.target.dataset.armed = 1; e.target.textContent = 'Click again to wipe everything'; return; }
    delete e.target.dataset.armed; e.target.textContent = 'Reset progress';
    store.set('widrtd_profile', ''); clearSave(); MAPS.forEach(m => DIFF_ORDER.forEach(k => store.set(`widrtd_best_${m.id}_${DIFFS[k].tag}`, 0)));
    Meta.load(); refreshHub(); showPanel('menuMain');
  };
}
function syncSettings() {
  $('setMusic').checked = Music.on; $('setVol').value = Music.vol; $('setSfx').checked = !G.mute; $('setVoice').checked = PREFS.voice; $('setDmg').checked = PREFS.dmg;
  $('musicBtn').classList.toggle('lit', Music.on); $('muteBtn').textContent = G.mute ? '🔇' : '🔊';
}

// map select
const THUMBS = {};
function thumb(m) {
  if (!THUMBS[m.id]) THUMBS[m.id] = buildBackground(m);
  const c = document.createElement('canvas'); c.width = 320 * DPR; c.height = 200 * DPR;
  c.getContext('2d').drawImage(THUMBS[m.id], 0, 0, c.width, c.height);
  return c;
}
function renderMaps() {
  const grid = $('mapGrid'); grid.innerHTML = '';
  document.querySelector('#menuMaps h2').textContent = pickMode === 'sandbox' ? 'Sandbox: choose a map' : 'Choose a map';
  MAPS.forEach((m, i) => {
    const open = mapUnlocked(m) || pickMode === 'sandbox', medals = Meta.p.medals[m.id] || {};
    const bestM = Math.max(...DIFF_ORDER.map(k => bestWave(m.id, DIFFS[k].tag)));
    const b = document.createElement('button');
    b.className = 'mapCard' + (open ? '' : ' locked'); b.style.setProperty('--r', ((i % 2 ? 1 : -1) * (.6 + (i % 5) * .2)) + 'deg');
    b.innerHTML = `<div class="thumb"></div><div class="mInfo"><span class="mTier t${m.tier[0]}">${m.tier}</span><b>${m.name}</b><p>${m.blurb}</p>
      <div class="medals">${DIFF_ORDER.map(k => `<i class="${medals[DIFFS[k].tag] ? 'got' : ''}" style="--c:${DIFFS[k].color}" title="${DIFFS[k].name}"></i>`).join('')}
      <small>${bestM ? `Best wave ${bestM}` : 'Not played yet'}</small></div></div>
      ${open ? '' : `<div class="lock">🔒<b>Reach level ${m.level}</b><small>You're level ${Meta.level()}</small></div>`}`;
    b.querySelector('.thumb').appendChild(thumb(m));
    b.onclick = () => {
      if (!open) { sfx('clink'); return; }
      pickedMap = m;
      if (pickMode === 'sandbox') { startRun({mode: 'sandbox', map: m.id, diff: 'normal'}); return; }
      renderDiffs(); showPanel('menuDiff');
    };
    grid.appendChild(b);
  });
}
function renderDiffs() {
  $('diffTitle').textContent = pickedMap.name;
  const grid = $('diffGrid'); grid.innerHTML = '';
  for (const k of DIFF_ORDER) {
    const d = DIFFS[k], b = document.createElement('button'), best = bestWave(pickedMap.id, d.tag), medal = (Meta.p.medals[pickedMap.id] || {})[d.tag];
    b.className = 'dcard'; b.style.setProperty('--c', d.color);
    b.innerHTML = `<span class="dtag">${d.tag}</span><b>${d.name}</b><p>${d.blurb}</p>
      <ul><li>❤️ ${d.lives}</li><li>🪙 $${d.cash}</li><li>🏷 ${Math.round(d.cost * 100)}% prices</li><li>💪 ${Math.round(d.hp * 100)}% enemy HP</li></ul>
      <span class="best">${medal ? '🏅 Medal earned · ' : ''}${best ? `Best wave ${best}` : 'Not played yet'} · win: +${d.reward} 🍪</span>`;
    b.onclick = () => begin(k);
    grid.appendChild(b);
  }
  renderMainPick();
}
// a small category label before the first hero of each category
function catLabel(el, k) { const c = catOf(k); if (c.heroes[0] === k) el.insertAdjacentHTML('beforeend', `<span class="pickCat" style="--c:${c.color}">${c.icon}<b>${c.name}</b></span>`); }
function renderMainPick() {
  const el = $('mainPick'); el.innerHTML = '';
  for (const k of TOWER_ORDER) {
    catLabel(el, k);
    const b = document.createElement('button');
    b.className = 'hpick' + (Meta.p.mainHero === k ? ' on' : ''); b.title = TOWERS[k].name;
    b.appendChild(portrait(k, 42)); b.insertAdjacentHTML("beforeend", masteryBadge(k));
    if (Meta.p.mainHero === k) b.insertAdjacentHTML('beforeend', `<em>${TOWERS[k].name}</em>`);
    b.onclick = () => { Meta.p.mainHero = k; Meta.save(); sfx('place'); renderMainPick(); };
    el.appendChild(b);
  }
}

// events
function heroStrip(list, size = 30) { const d = document.createElement('div'); d.className = 'evHeroes'; list.forEach(k => d.appendChild(portrait(k, size))); return d; }
function renderEvents() {
  const grid = $('eventGrid'); grid.innerHTML = '';
  const p = Meta.p, D = dailyChallenge(), dm = MAPS.find(m => m.id === D.map), claimed = p.daily.last === todayKey();
  const card = (html) => { const c = document.createElement('div'); c.className = 'evCard live'; c.innerHTML = html; grid.appendChild(c); return c; };
  const daily = card(`<span>📅</span><b>Daily Challenge</b><p>${dm.name} · ${DIFFS[D.diff].name}<br>Twist: ${D.mod}</p><div class="hs"></div>
    <div class="evMeta">${claimed ? '✓ Won today' : `Win: +${150 + Math.min(p.daily.streak, 6) * 25} 🍪`} · streak ${p.daily.streak} 🔥</div><div class="evBtns"><button class="evBtn">${claimed ? 'Play again' : 'Play'}</button></div>`);
  daily.querySelector('.hs').appendChild(heroStrip(D.rules.allowed));
  daily.querySelector('.evBtn').onclick = () => startRun({mode: 'daily', map: D.map, diff: D.diff, rules: D.rules, challenge: D.id, modName: D.mod});
  const rush = card(`<span>👹</span><b>Boss Rush</b><p>Toro Ferro, Zennith, Grumbleclaw, Byte, Meta AI and Toon de Demoon, one after another on Gelato Glacier.</p>
    <div class="evMeta">Best: ${p.rush.normalTime ? fmtTime(p.rush.normalTime) : '—'} · Elite best: ${p.rush.eliteTime ? fmtTime(p.rush.eliteTime) : '—'}</div>
    <div class="evBtns"><button class="evBtn" id="rushN">Normal</button><button class="evBtn dark" id="rushE">💀 Elite</button></div>`);
  rush.querySelector('#rushN').onclick = () => startRun({mode: 'bossrush', map: 'glacier', diff: 'normal', rules: {cash: 3500}});
  rush.querySelector('#rushE').onclick = () => startRun({mode: 'bossrush', map: 'glacier', diff: 'normal', rules: {cash: 5000}, elite: true});
  const ody = card(`<span>⛵</span><b>Odyssey</b><p>Three maps in a row with a crew of five heroes. Lives carry over between maps.</p>
    <div class="evMeta">${p.odyssey ? `Completed ${p.odyssey}×` : 'First clear: +300 🍪'}</div><div class="evBtns"><button class="evBtn">Pick crew</button></div>`);
  ody.querySelector('.evBtn').onclick = () => showPanel('menuCrew');
  const sb = card(`<span>🧪</span><b>Sandbox</b><p>Unlimited cash and lives on any map. Spawn any enemy and test builds. Nothing is saved.</p>
    <div class="evMeta">Every map is open here</div><div class="evBtns"><button class="evBtn alt">Choose map</button></div>`);
  sb.querySelector('.evBtn').onclick = () => { pickMode = 'sandbox'; showPanel('menuMaps'); };
  const cg = $('challGrid'); cg.innerHTML = '';
  for (const c of CHALLENGES) {
    const done = !!p.challenges[c.id], m = MAPS.find(x => x.id === c.map);
    const b = document.createElement('button');
    b.className = 'chCard' + (done ? ' done' : '');
    b.innerHTML = `<span class="ic">${c.icon}</span><b>${c.name}</b><em>${done ? '✓' : `+${c.reward} 🍪`}</em><p>${c.desc}</p><small>${m.name} · ${DIFFS[c.diff].name}</small>`;
    b.onclick = () => startRun({mode: 'challenge', map: c.map, diff: c.diff, rules: c.rules, challenge: c.id});
    cg.appendChild(b);
  }
}
let crew = [];
function renderCrew() {
  const el = $('crewPick'); el.innerHTML = '';
  for (const k of TOWER_ORDER) {
    catLabel(el, k);
    const on = crew.includes(k), b = document.createElement('button');
    b.className = 'hpick' + (on ? ' on' : crew.length >= 5 ? ' off' : ''); b.title = TOWERS[k].name;
    b.appendChild(portrait(k, 42)); b.insertAdjacentHTML('beforeend', `<em>${TOWERS[k].name}</em>`);
    b.onclick = () => { if (on) crew = crew.filter(x => x !== k); else if (crew.length < 5) crew.push(k); else { sfx('clink'); return; } sfx('place'); renderCrew(); };
    el.appendChild(b);
  }
  $('crewGo').textContent = crew.length === 5 ? '⛵ Set sail!' : `Pick ${5 - crew.length} more`;
}

// achievements
function renderAch() {
  $('achGrid').innerHTML = ACHIEVEMENTS.map(a => {
    const done = !!Meta.p.ach[a.id], pr = a.prog ? a.prog(Meta.p) : null;
    const pct = done ? 100 : pr ? Math.min(100, pr[0] / pr[1] * 100) : 0;
    return `<div class="achCard${done ? ' done' : ''}"><span class="aIc">${a.icon}</span><div><b>${a.name}</b><p>${a.desc}</p>
      <div class="bar"><i style="width:${pct}%"></i></div><small>${done ? 'Unlocked' : pr ? `${Math.min(pr[0], pr[1]).toLocaleString()} / ${pr[1].toLocaleString()}` : 'Locked'}</small></div><em>+${a.reward} 🍪</em></div>`;
  }).join('');
}
// trophy store
let storeTab = 'Skins';
function withEquipped(slot, id, fn) { const saved = Meta.p.equipped[slot]; Meta.p.equipped[slot] = id; try { return fn(); } finally { Meta.p.equipped[slot] = saved; } }
const ITEM_ICON = {pop_fruit: '🍉', pop_gelato: '🍦', pop_notes: '🎶', pop_confetti: '🎉', pop_stars: '⭐', pop_rainbow: '🌈', music_rhyme: '🎧', music_boss: '🎸', music_menu64: '🕹'};
const SONG_OF = {musicBattle: 'rhyme', musicBoss: 'bossRemix', musicMenu: 'menu64'};
function itemPreview(it, prev, size = 96) {
  if (it.slot === 'pads') withEquipped('pads', it.id, () => ['guiseppe', 'otis', 'ratjetoe'].forEach(t => prev.appendChild(portrait(t, size * .66))));
  else if (it.slot === 'toon') {
    const w = size * 1.15, h = size * 1.05, c = document.createElement('canvas'); c.width = w * DPR; c.height = h * DPR; c.style.width = w + 'px'; c.style.height = h + 'px';
    const g = c.getContext('2d'); g.scale(DPR, DPR); g.translate(w / 2, h * .54); g.scale(size / 96, size / 96);
    withEquipped('toon', it.id, () => drawEnemy(g, {type: 'toon', x: 0, y: 0, ang: 0, seed: 1, flash: 0, stun: 0, slow: 0, hp: 1, maxHp: 1, pi: 0}, 0));
    prev.appendChild(c);
  } else if (it.slot === 'tint') {
    const bg = withEquipped('tint', it.id, () => buildBackground(MAPS[0]));
    const w = size * 1.55, h = w / 1.6, c = document.createElement('canvas'); c.className = 'tintPrev'; c.width = w * DPR; c.height = h * DPR; c.style.width = w + 'px'; c.style.height = h + 'px';
    c.getContext('2d').drawImage(bg, 0, 0, c.width, c.height); prev.appendChild(c);
  } else if (it.cat === 'Skins') { skinOverride = {hero: it.hero, skin: it.skin}; prev.appendChild(portrait(it.hero, size)); skinOverride = null; }
  else if (it.slot === 'title') prev.innerHTML = `<span class="titleTag">${it.name}</span>`;
  else prev.innerHTML = `<span class="bigIc">${ITEM_ICON[it.id] || '✨'}</span>`;
}
function previewSong(slot) {
  Music.song = SONGS[SONG_OF[slot]]; Music.step = 0; if (!Music.on) Music.setOn(true);
  try { Music.ctx(); Music.next = AC.currentTime + .05; if (!Music.timer) Music.timer = setInterval(() => Music.tick(), 25); } catch (e) {}
  setTimeout(() => { if ($('menu').classList.contains('show')) { Music.song = null; Music.play('menu'); } }, 8000);
}
function slotLabel(it) {
  return it.slot === 'toon' ? 'Boss skin' : it.cat === 'Skins' ? TOWERS[it.hero].name + ' skin' : it.slot === 'pads' ? 'All heroes' : it.slot === 'pop' ? 'Pop effect' : it.slot === 'tint' ? 'Map colours'
    : it.slot === 'musicBoss' ? 'Boss music' : it.slot === 'musicMenu' ? 'Menu music' : it.slot === 'title' ? 'Player title' : 'Battle music';
}
function renderStore() {
  $('storeTabs').innerHTML = STORE_CATS.map(c => `<button class="sTab${c === storeTab ? ' on' : ''}" data-c="${c}">${{Skins: '🎨', Effects: '✨', Maps: '🗺', Music: '🎵', Titles: '🏷'}[c]} ${c}</button>`).join('');
  $('storeTabs').querySelectorAll('.sTab').forEach(b => b.onclick = () => { storeTab = b.dataset.c; renderStore(); });
  const grid = $('storeGrid'); grid.innerHTML = '';
  // Season Pass items only appear here once you've unlocked them
  for (const it of ALL_ITEMS.filter(i => i.cat === storeTab && (!i.track || Meta.p.owned[i.id]))) {
    const own = !!Meta.p.owned[it.id], on = own && Meta.equipped(it);
    const b = document.createElement('div');
    b.className = 'storeCard' + (own ? ' own' : '') + (it.track ? ' track' : '');
    const btn = own ? (on ? '✓ Equipped' : 'Equip') : it.track ? `🎟 Season Pass · LV ${it.track}` : `Buy · ${it.cost} 🍪`;
    b.innerHTML = `${it.track ? '<span class="trackTag">🎟 SEASON 1</span>' : ''}<div class="sPrev"></div><b>${it.name}</b><small>${slotLabel(it)}</small><p>${it.desc}</p>${it.cat === 'Music' ? '<button class="sPrevBtn">▶ Listen</button>' : ''}
      <button class="sBtn ${own ? (on ? 'on' : '') : it.track || Meta.p.biscotti < it.cost ? 'poor' : 'buy'}">${btn}</button>`;
    itemPreview(it, b.querySelector('.sPrev'));
    if (it.cat === 'Music') b.querySelector('.sPrevBtn').onclick = () => previewSong(it.slot);
    b.querySelector('.sBtn').onclick = () => {
      if (!own) {
        if (it.track) { sfx('clink'); notify('🎟 SEASON PASS', `${it.name} unlocks at level ${it.track}. You're level ${Meta.level()}.`); return; }
        if (Meta.buy(it)) { sfx('up'); notify('UNLOCKED!', `${it.name} is now equipped.`); } else { sfx('clink'); return; }
      } else Meta.equip(it, !on);
      Object.keys(THUMBS).forEach(k => delete THUMBS[k]);
      renderStore(); refreshHub(); buildShop();
    };
    grid.appendChild(b);
  }
  if (!grid.children.length) grid.innerHTML = `<p class="storeEmpty">Nothing here yet. ${storeTab} come from the 🎟 Season Pass, so keep levelling up to unlock them.</p>`;
}
// season pass: every level from 2 up, with the next few beyond the end
function renderTrack() {
  const lv = Meta.level(), L = levelInfo(Meta.p.xp), last = Math.max(TRACK.length + 2, lv + 3);
  $('trackHead').innerHTML = `<div class="tLv"><small>LEVEL</small><b>${lv}</b></div><div class="tBar"><div class="xp"><i style="width:${L.into / L.need * 100}%"></i></div>
    <small>${L.into} / ${L.need} XP to level ${lv + 1} · every wave you clear gives XP, harder difficulties give more</small></div>
    <div class="tCount"><b>${Object.keys(Meta.p.track).length}</b> / ${last - 1} claimed</div>`;
  const row = $('trackRow'); row.innerHTML = '';
  for (let n = 2; n <= last; n++) {
    const rs = trackReward(n), got = n <= lv, next = n === lv + 1;
    const c = document.createElement('div');
    c.className = 'tCard' + (got ? ' got' : '') + (next ? ' next' : '') + (rs.some(r => r.kind === 'item') ? ' item' : '');
    c.innerHTML = `<span class="tNum">LV ${n}</span><div class="tPrev"></div><div class="tTxt">${rs.map(r => `<b>${r.text}</b>${r.kind === 'item' ? `<small>${slotLabel(r.it)}</small>` : ''}`).join('')}</div>
      <span class="tState">${got ? '✓ Claimed' : next ? 'Up next!' : '🔒'}</span>`;
    const prev = c.querySelector('.tPrev'), main = rs[0];
    if (main && main.kind === 'item') itemPreview(main.it, prev, 56);
    else if (main && main.kind === 'map') { const t = thumb(main.m); t.style.width = '84px'; t.style.height = '52px'; t.className = 'tintPrev'; prev.appendChild(t); }
    else prev.innerHTML = '<span class="bigIc">🍪</span>';
    if (got && main && main.kind === 'item' && main.it.slot !== 'title') c.onclick = () => { storeTab = main.it.cat; showPanel('menuStore'); };
    row.appendChild(c);
  }
  requestAnimationFrame(() => { const cur = row.querySelector('.next') || row.lastElementChild; if (cur) row.scrollLeft = cur.offsetLeft - row.clientWidth / 2 + cur.clientWidth / 2; });
}
{
  const r = document.getElementById('trackRow');
  if (r) r.addEventListener('wheel', e => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { r.scrollLeft += e.deltaY; e.preventDefault(); } }, {passive: false});
}
// career stats
// mastery bar for a hero: rank, XP to the next level and the discount it gives
function masteryHtml(type) {
  const lv = masteryLevel(type), r = MASTERY_RANK(lv), xp = masteryXP(type), next = MASTERY_XP[lv], prev = MASTERY_XP[lv - 1];
  return `<div class="mBox" style="--m:${r.col}"><span class="mLv">★${lv}</span><div><b>${r.name} mastery</b><div class="mBar"><i style="width:${next ? (xp - prev) / (next - prev) * 100 : 100}%"></i></div>
    <small>${next ? `${xp.toLocaleString()} / ${next.toLocaleString()} XP · next: ${lv}% off placing` : 'Maxed out · 9% off placing'}</small></div></div>`;
}
function renderMastery() {
  return `<h3 class="cSec">⭐ Hero mastery</h3><p class="cNote">Heroes earn mastery XP for every enemy they pop, every wave they're on the map and every win. Each level makes that hero 1% cheaper to place.</p>
    <div class="mGrid">${TOWER_ORDER.map(k => `<div class="mCard"><span class="mP" data-k="${k}"></span><b>${TOWERS[k].name}</b>${masteryHtml(k)}</div>`).join('')}</div>`;
}
function renderCareer() {
  const p = Meta.p, s = p.stats;
  const medals = DIFF_ORDER.map(k => `<div class="cMedal" style="--c:${DIFFS[k].color}"><b>${medalCount(DIFFS[k].tag)}</b>${DIFFS[k].tag.toLowerCase()} medals</div>`).join('');
  $('careerBody').innerHTML = `<div class="cGrid"><div><b>${s.pops.toLocaleString()}</b>enemies popped</div><div><b>${s.waves}</b>waves cleared</div><div><b>${s.wins}</b>games won</div>
    <div><b>${s.games}</b>games played</div><div><b>${s.abilities}</b>abilities used</div><div><b>${bestAny()}</b>best wave</div>
    <div><b>${p.daily.streak}</b>daily streak</div><div><b>${Object.keys(p.challenges).length}/${CHALLENGES.length}</b>challenges</div><div><b>${p.rush.normalTime ? fmtTime(p.rush.normalTime) : '—'}</b>boss rush best</div>
    <div><b>${p.rush.eliteTime ? fmtTime(p.rush.eliteTime) : '—'}</b>elite rush best</div><div><b>${p.odyssey}</b>odysseys</div><div><b>${Object.keys(p.placed).length}/${TOWER_ORDER.length}</b>heroes tried</div></div>
    <div class="cGrid medalsRow">${medals}</div>${renderMastery()}`;
  document.querySelectorAll("#careerBody .mP").forEach(el => el.appendChild(portrait(el.dataset.k, 40)));
}

// Marching parade along the bottom of the title screen
const parade = $('parade'), pctx = parade.getContext('2d');
const PARADE = [...'bit,gelato,sprout,bull,crab,icegel,ghost,medic,guard,brute'.split(',').map(t => ({e: t})), {gap: 1}, ...TOWER_ORDER.map(t => ({h: t})), {gap: 1}, {e: 'toro'}, {gap: 1}, {e: 'zennith'}, {gap: 1}];
function drawParade(t) {
  const w = parade.clientWidth, h = parade.clientHeight;
  if (!w) return;
  if (parade.width !== w * DPR) { parade.width = w * DPR; parade.height = h * DPR; }
  pctx.setTransform(DPR, 0, 0, DPR, 0, 0); pctx.clearRect(0, 0, w, h);
  const gy = h - 34;
  pctx.fillStyle = INK; pctx.fillRect(0, gy - 26, w, 52); pctx.fillStyle = PAL.sand; pctx.fillRect(0, gy - 22, w, 44);
  pctx.strokeStyle = '#e89c3e'; pctx.lineWidth = 4; pctx.setLineDash([10, 14]); pctx.lineDashOffset = -t * 70;
  pctx.beginPath(); pctx.moveTo(0, gy); pctx.lineTo(w, gy); pctx.stroke(); pctx.setLineDash([]);
  const span = 62, total = PARADE.length * span + w;
  PARADE.forEach((p, i) => {
    if (p.gap) return;
    const x = ((t * 70 - i * span) % total + total) % total - 60;
    if (p.e) drawEnemy(pctx, {type: p.e, x, y: gy - 4 - (ENEMIES[p.e].boss ? 6 : 0), ang: 0, seed: i, flash: 0, stun: 0, slow: 0, hp: 1, maxHp: 1, pi: 0}, t);
    else drawHero(pctx, p.h, x, gy - 14 - Math.abs(Math.sin(t * 8 + i)) * 5, .9, 0, null, [0, 0, 0], t + i);
  });
}

// ---------- Skill trees (fit on one screen) ----------
const KIND_LABEL = {fruit: 'Thrown fruit', snipe: 'Instant pear snipe', bomb: 'Lobbed bomb (area damage)', laser: 'Piercing laser beam', ball: 'Pitched baseball', pong: 'Bouncing ping-pong ball',
  pick: 'Pickaxe swing (area)', chain: 'Chain lightning', drone: 'Orbiting drones', star: 'Thrown shuriken', boulder: 'Boulder rolled back up the road', frost: 'Frost pulse (area)', joke: 'Joke pulse (stuns)', vine: 'Vine patches on the road', nail: 'Nail gun rivets',
  claw: 'Cat scratches (area)', burrow: 'Bites from under the road (area)', goon: 'Henchmen walking up the road', storm: 'Exploding storm orbs', kick: 'Corner kicks (area)',
  kimchi: 'Burning kimchi jars', revolver: '6-shot revolver', sword: 'Crystal sword (area)', digit: 'Thrown numbers', vinyl: 'Spinning vinyl records', feather: 'Razor feathers', plane: 'Paper planes', stomp: 'Ground stomp (area)'};
const STATS = [
  ['burn', 'Burn damage / sec', v => v], ['burnT', 'Burn duration', v => v + 's'], ['ammo', 'Bullets per reload', v => v], ['reload', 'Reload time', v => (+v).toFixed(1) + 's'],
  ['saves', 'Enemies caught per wave', v => v], ['regen', 'Lives back per wave', v => '+' + v], ['waveScale', 'Damage per wave', v => '+' + v], ['breakAt', 'Pops to break out', v => v],
  ['goonN', 'Henchmen at a time', v => v], ['goonSpd', 'Henchman speed', v => v], ['beat', 'Beat drop every', v => v + 's'], ['dropDmg', 'Drop damage', v => v], ['dropR', 'Drop area', v => v],
  ['knock', 'Knockback', v => v], ['kayoLv', 'Kayo damage multiplier', v => (3 + v) + 'x'],
  ['dmg', 'Damage', v => v], ['pierce', 'Pierce', v => v], ['shots', 'Projectiles', v => v], ['targets', 'Targets per shot', v => v],
  ['bounces', 'Bounces', v => v], ['bounceRange', 'Bounce reach', v => v], ['chains', 'Chain jumps', v => v], ['drones', 'Drones', v => v], ['zapBlast', 'Drone blast radius', v => v],
  ['sentries', 'Sentry turrets', v => v], ['sDmg', 'Sentry damage', v => v], ['sRate', 'Sentry shots / sec', v => (1 / v).toFixed(2)],
  ['radius', 'Blast radius', v => v], ['cluster', 'Cluster bombs', v => v], ['patches', 'Vine patches', v => v], ['dur', 'Patch duration', v => v + 's'],
  ['range', 'Range', v => v >= 1000 ? 'Whole map' : Math.round(v)], ['rate', 'Attacks / sec', v => (1 / v).toFixed(2)], ['width', 'Beam width', v => v],
  ['stun', 'Stun', v => v + 's'], ['slow', 'Slow', v => Math.round(v * 100) + '%'], ['crit', 'Crit chance (4x)', v => Math.round(v * 100) + '%'], ['shatter', 'Damage vs stunned', v => v + 'x'],
  ['homing', 'Homing', v => v ? 'Yes' : 'No'], ['homerun', 'Home Run', v => `every ${v} swings`], ['hrDmg', 'Home Run damage', v => v], ['bossMult', 'Damage vs bosses', v => v + 'x'], ['devour', 'Devours enemies up to', v => v + ' HP'],
  ['blackhole', 'Black hole', v => `every ${v}s`], ['jackpot', 'Cash per wave', v => '+$' + v], ['_mine', 'Mining', v => v],
  ['_armor', 'Cracks armor', v => v ? 'Yes' : 'No'], ['camo', 'Sees ghosts', v => v ? 'Yes' : 'No'], ['air', 'Hits flyers', v => v ? 'Yes' : 'No'], ['_type', 'Damage type', v => v],
  ['income', 'Cash per wave', v => '+$' + v], ['bounty', 'Cash per kill', v => '+$' + v], ['armorMult', 'Damage vs armor', v => v + 'x'], ['strip', 'Strips armor', v => v ? 'Yes' : 'No'],
  ['_aura', 'Support aura', v => v], ['_ab', 'Ability', v => v],
];
const DMG_TYPE = {fruit: 'Sharp', ball: 'Sharp', star: 'Sharp', pong: 'Sharp', snipe: 'Sharp', pick: 'Sharp', vine: 'Sharp', nail: 'Sharp', bomb: 'Blast (cracks ice)', boulder: 'Blast (cracks ice)', laser: 'Energy (cracks ice)', chain: 'Energy (cracks ice)', drone: 'Energy (cracks ice)', frost: 'Cold', joke: 'Magic (hits everything)', claw: 'Sharp', burrow: 'Sharp', goon: 'Sharp', storm: 'Blast (cracks ice)', kick: 'Sharp', kimchi: 'Sharp + fire (fire hits everything)', revolver: 'Sharp', sword: 'Sharp', digit: 'Sharp', vinyl: 'Sharp', feather: 'Sharp', plane: 'Sharp', stomp: 'Blast (cracks ice)'};
function statsFor(type, tiers) {
  const s = computeStats({type, tiers});
  s._armor = s.kind === 'bomb' || s.kind === 'laser' || s.kind === 'boulder' || !!s.golden || !!s.crush;
  s.camo = !!s.camo; s.homing = !!s.homing; s.air = !!s.air; s._type = DMG_TYPE[s.kind];
  if (s.mine) s._mine = `+$${s.mine.amt} every ${s.mine.every}s`;
  if (s.aura) s._aura = [s.aura.rate && `+${Math.round(s.aura.rate * 100)}% attack speed`, s.aura.range && `+${Math.round(s.aura.range * 100)}% range`, s.aura.camo && 'ghost sight'].filter(Boolean).join(', ') + ` within ${s.aura.r}`;
  if (s.ability) s._ab = `${s.ability.icon} ${s.ability.name}${s.ability.pow ? ` ×${s.ability.pow} power` : ''} (${s.ability.cd}s)`;
  if (s.kind === 'ball' || s.kind === 'fruit' || s.kind === 'star' || s.kind === 'nail') s.shots = s.shots || 1;
  return s;
}
const fmt = (row, v) => v === undefined || v === null ? '—' : String(row[2](v));
function statDiff(a, b) {
  return STATS.filter(r => fmt(r, a[r[0]]) !== fmt(r, b[r[0]])).map(r => `<li>${r[1]} <s>${fmt(r, a[r[0]])}</s> → <b>${fmt(r, b[r[0]])}</b></li>`).join('');
}
// why a placed hero can't take the next tier on path p
function lockReason(t, p) {
  const others = t.tiers.filter((v, i) => i !== p), nt = t.tiers[p] + 1;
  if (nt > TOWERS[t.type].paths[p].ups.length) return 'This path is maxed out.';
  if (G.rules.noPath3 && p === 2) return 'Path 3 is not allowed in this mode.';
  if (G.rules.maxTier && nt > G.rules.maxTier) return `This mode caps upgrades at tier ${G.rules.maxTier}.`;
  if (t.tiers[p] === 0 && others.filter(v => v > 0).length >= 2) return 'Two other paths already have upgrades, and a hero can only use two paths.';
  if (nt > OTHER_MAX && others.some(v => v > OTHER_MAX)) return 'Another path is already past tier 2, so this path stops at tier 2.';
  return '';
}
let treeType = null, treeTower = null, treeSel = null, treeSide = 'up';
function openTree(type, tower = null) {
  treeType = type; treeTower = tower && G.towers.includes(tower) ? tower : null; treeSel = null; treeSide = 'up';
  if (G.started) G.paused = true;
  $('tree').classList.add('show'); renderTree();
}
function closeTree() {
  if (!$('tree').classList.contains('show')) return;
  $('tree').classList.remove('show');
  if (G.started && !pauseOpen()) G.paused = false;
  if (G.started) refreshInfo();
}
function nodeState(p, i) {
  const t = treeTower; if (!t) return '';
  if (t.tiers[p] > i) return 'owned';
  if (t.tiers[p] === i && canUpgrade(t, p) === 'ok') return 'next';
  return 'locked';
}
// the details panel on the left: full text, every stat change, and the buy button
function renderDetail(p, i) {
  const d = TOWERS[treeType], u = d.paths[p].ups[i], t = treeTower, st = nodeState(p, i);
  let from, to;
  if (t) { from = [...t.tiers]; to = [...t.tiers]; to[p] = Math.max(i + 1, t.tiers[p]); if (st === 'owned') { from[p] = i; to[p] = i + 1; } }
  else { from = [0, 0, 0]; to = [0, 0, 0]; from[p] = i; to[p] = i + 1; }
  const diff = statDiff(statsFor(treeType, from), statsFor(treeType, to));
  const total = d.paths[p].ups.slice(0, i + 1).reduce((a, x) => a + price(x.cost), 0);
  let status = '';
  if (t) {
    if (st === 'owned') status = '<div class="dStat ok">✓ Owned</div>';
    else if (st === 'next') status = `<button class="dBuy${G.cash < price(u.cost) ? ' poor' : ''}" id="dBuy">Buy for $${price(u.cost)}<small>You have $${Math.floor(G.cash)}</small></button>`;
    else if (t.tiers[p] < i) status = `<div class="dStat">🔒 Buy tier ${t.tiers[p] + 1} of this path first.</div>`;
    else status = `<div class="dStat">🔒 ${lockReason(t, p)}</div>`;
  }
  const el = $('treeDetail');
  el.className = 'tDetail lp' + p + (u.paradise ? ' para' : '');
  el.innerHTML = `<div class="dHead"><span class="tier">PATH ${p + 1} · T${i + 1}</span>${u.paradise ? '<span class="paraTag">🌈 PARADISE</span>' : ''}</div>
    <h3>${u.name}</h3><p>${u.desc}</p>
    <h5>${t ? 'Changes to your hero' : 'What changes'}</h5><ul class="diffs">${diff || '<li>A special effect, see the description.</li>'}</ul>
    <div class="dCost"><em>$${price(u.cost)}</em><small>$${total} for the whole path up to here</small></div>${status}`;
  if ($('dBuy')) $('dBuy').onclick = () => { upgrade(t, p); treeSel = null; renderTree(); };
  // how the hero looks with this upgrade
  const look = document.createElement('div'); look.className = 'dLook';
  look.appendChild(lookPortrait(treeType, 52, to, t)); el.querySelector('.dHead').appendChild(look);
  if (!el.hidden) requestAnimationFrame(() => fitBox(el, 14, 8));
}
function renderTree() {
  const tabs = $('treeTabs'); tabs.innerHTML = '';
  // two levels so the tabs fit with any number of heroes: category icons, then the heroes in that category
  const curCat = catOf(treeType);
  for (const c of CATEGORIES) {
    const b = document.createElement('button');
    b.className = 'tcat' + (c === curCat ? ' on' : ''); b.style.setProperty('--c', c.color); b.title = `${c.name}: ${c.blurb}`;
    b.innerHTML = `${c.icon}${c === curCat ? `<b>${c.name}</b>` : ''}`;
    b.onclick = () => { if (c === curCat) return; treeType = c.heroes[0]; treeTower = null; treeSel = null; renderTree(); };
    tabs.appendChild(b);
  }
  tabs.insertAdjacentHTML('beforeend', '<span class="tsep"></span>');
  for (const k of curCat.heroes) {
    const c = curCat;
    const b = document.createElement('button');
    b.className = 'ttab' + (k === treeType ? ' on' : ''); b.style.setProperty('--c', TOWERS[k].color); b.title = `${TOWERS[k].name} · ${c.name}`;
    b.appendChild(portrait(k, 30)); b.insertAdjacentHTML('beforeend', `<span>${TOWERS[k].name}</span>`);
    b.onclick = () => { treeTower = treeTower && treeTower.type === k ? treeTower : null; treeType = k; treeSel = null; renderTree(); };
    tabs.appendChild(b);
  }
  const d = TOWERS[treeType], t = treeTower, base = statsFor(treeType, [0, 0, 0]), cat = catOf(treeType);
  $('treeOwn').innerHTML = t ? `Your ${d.name} · ${t.tiers.join('-')} · 🪙 $${Math.floor(G.cash)}` : '';
  $('treeOwn').style.display = t ? '' : 'none';
  if (!treeSel) {
    treeSel = {p: 0, i: 0};
    if (t) for (let p = 0; p < 3; p++) if (nodeState(p, t.tiers[p]) === 'next') { treeSel = {p, i: t.tiers[p]}; break; }
  }
  const baseRows = STATS.filter(r => base[r[0]] !== undefined && base[r[0]] !== false).map(r => `<dt>${r[1]}</dt><dd>${fmt(r, base[r[0]])}</dd>`).join('');
  const lanes = d.paths.map((p, pi) => {
    const nodes = p.ups.map((u, i) => {
      const tf = [0, 0, 0], tt = [0, 0, 0]; tf[pi] = i; tt[pi] = i + 1;
      const state = nodeState(pi, i), sel = treeSel.p === pi && treeSel.i === i;
      return `<div class="node ${state}${u.paradise ? ' para' : ''}${sel ? ' sel' : ''}" data-p="${pi}" data-i="${i}"><div class="nTop"><span class="tier">T${i + 1}</span>${state === 'owned' ? '<span class="badge">✓</span>' : state === 'locked' ? '<span class="badge">🔒</span>' : state === 'next' ? '<span class="badge buyable">BUY</span>' : ''}</div>
        <h4>${u.paradise ? '🌈 ' : ''}${u.name}</h4><p>${u.desc}</p><ul class="diffs">${statDiff(statsFor(treeType, tf), statsFor(treeType, tt)) || '<li>Special effect</li>'}</ul>
        <div class="nfoot"><em>$${price(u.cost)}</em></div></div>`;
    }).join('<span class="link"></span>');
    return `<div class="lane p${pi}"><div class="laneHead"><small>PATH ${pi + 1}</small><h3>${p.name}</h3></div><div class="nodes">${nodes}</div></div>`;
  }).join('');
  $('treeBody').innerHTML = `<section class="heroCard" style="--c:${d.color}"><div class="hcTop"><div class="bigP"></div><div><h1>${d.name}</h1><p class="role">${d.role}<br><span class="catTag" style="--c:${cat.color}">${cat.icon} ${cat.name}</span></p></div></div>
      <div class="placeCost">$${heroCost(treeType)} <small>to place · ${DIFF.name} prices${masteryDisc(treeType) ? ` · ${Math.round(masteryDisc(treeType) * 100)}% mastery discount` : ""}${d.water ? ' · floats on water' : ''}</small></div>
      ${masteryHtml(treeType)}
      <div class="sideTabs"><button class="${treeSide === 'up' ? 'on' : ''}" data-s="up">⬆ Upgrade</button><button class="${treeSide === 'base' ? 'on' : ''}" data-s="base">📋 Base stats</button></div>
      <div id="treeDetail" class="tDetail"${treeSide === 'up' ? '' : ' hidden'}></div>
      <div class="baseBox"${treeSide === 'base' ? '' : ' hidden'}><p class="hcBlurb">${d.blurb}</p><h4>${KIND_LABEL[base.kind]}</h4><dl>${baseRows}</dl></div></section>
    <section class="lanes">${lanes}
      <p class="rule"><b>5-2-0 crosspathing:</b> every path has 5 tiers. Upgrade two of the three paths: either one up to tier 5 and the other up to tier 2, in any mix. Tier 4 and 5 are 🌈 Paradise upgrades. Tier 3 of Path 3 is an ability, and its tiers 4 and 5 make it stronger. Click any upgrade to see it in full on the left.</p></section>`;
  $('treeBody').querySelector('.bigP').appendChild(t ? lookPortrait(treeType, 68, t.tiers, t) : portrait(treeType, 68));
  $('treeBody').querySelectorAll('.sideTabs button').forEach(b => b.onclick = () => { treeSide = b.dataset.s; renderTree(); });
  if (treeSide === 'up') renderDetail(treeSel.p, treeSel.i);
  $('treeBody').querySelectorAll('.node').forEach(n => {
    const p = +n.dataset.p, i = +n.dataset.i;
    n.onclick = () => { treeSel = {p, i}; treeSide = 'up'; renderTree(); };
    n.onmouseenter = () => { if (treeSide === 'up') renderDetail(p, i); };
    n.onmouseleave = () => { if (treeSide === 'up') renderDetail(treeSel.p, treeSel.i); };
  });
  requestAnimationFrame(fitTree);
}
// shrink the text inside any card that would otherwise cut something off
function fitBox(el, max, min = 7) {
  let f = max; el.style.fontSize = f + 'px';
  while (f > min && el.scrollHeight > el.clientHeight + 1) { f -= .5; el.style.fontSize = f + 'px'; }
}
function fitTree() {
  if (!$('tree').classList.contains('show')) return;
  document.querySelectorAll('#treeBody .node').forEach(n => fitBox(n, 12.5));
  const dt = $('treeDetail'); if (dt && !dt.hidden) fitBox(dt, 14, 8);
  const bb = document.querySelector('#treeBody .baseBox'); if (bb && !bb.hidden) fitBox(bb, 13, 8);
}
window.addEventListener('resize', () => requestAnimationFrame(fitTree));
$('treeClose').onclick = closeTree;

// ---------- Input ----------
function mapXY(ev) { const r = cv.getBoundingClientRect(); return {x: (ev.clientX - r.left) * W / r.width, y: (ev.clientY - r.top) * H / r.height}; }
cv.addEventListener('mousemove', ev => { const p = mapXY(ev); G.mouse.x = p.x; G.mouse.y = p.y; G.mouse.in = true; });
cv.addEventListener('mouseleave', () => G.mouse.in = false);
cv.addEventListener('contextmenu', ev => { ev.preventDefault(); G.placing = null; G.sel = null; refreshInfo(); });
cv.addEventListener('click', ev => {
  if (!G.started || G.over || G.paused) return;
  const {x, y} = mapXY(ev);
  if (G.placing) {
    const type = G.placing, cost = heroCost(type);
    if (heroCapReached()) { G.placing = null; refreshInfo(); return; }
    if (validPlace(x, y) && G.cash >= cost) {
      const t = placeTower(type, x, y);
      G.placing = ev.shiftKey && G.cash >= cost && !heroCapReached() ? type : null;
      if (!G.placing) G.sel = t;
      refreshInfo(); updateHud();
    } else if (G.cash < cost) flashCash();
    return;
  }
  const hit = G.towers.find(t => Math.hypot(t.x - x, t.y - y + 2) < 24 * heroSize(t.type));
  G.sel = hit || null; refreshInfo();
});
window.addEventListener('keydown', ev => {
  if ($('tree').classList.contains('show')) { if (ev.key === 'Escape') closeTree(); return; }
  if (!G.started || $('menu').classList.contains('show')) { if (ev.key === 'Escape') showPanel('menuMain'); return; }
  if (ev.key === 'Escape') {
    if (pauseOpen()) hidePause(); else if (G.placing || G.sel) { G.placing = null; G.sel = null; refreshInfo(); } else showPause();
    return;
  }
  if (G.paused || G.over) return;
  const t = TOWER_ORDER.find(k => TOWERS[k].key && TOWERS[k].key === ev.key);
  if (t) return choose(t);
  if (ev.key === ' ') { ev.preventDefault(); startWave(); }
  else if (ev.key === ',' && G.sel) upgrade(G.sel, 0);
  else if (ev.key === '.' && G.sel) upgrade(G.sel, 1);
  else if (ev.key === '/' && G.sel) { ev.preventDefault(); upgrade(G.sel, 2); }
  else if (ABIL_KEYS.includes(ev.key.toLowerCase())) { const t = abilTowers()[ABIL_KEYS.indexOf(ev.key.toLowerCase())]; if (t) useAbility(t); }
  else if ((ev.key === 'Backspace' || ev.key === 'Delete') && G.sel) sellTower(G.sel);
  else if (ev.key === 'Tab') { ev.preventDefault(); cycleTarget(); }
  else if (ev.key === 'f') cycleSpeed();
  else if (ev.key === 'x' && G.sel && TOWERS[G.sel.type].swap) swapForm(G.sel);
  else if (ev.key === 't' && (G.sel || G.placing)) openTree(G.sel ? G.sel.type : G.placing, G.sel);
});
function cycleSpeed() { G.speed = G.speed === 1 ? 2 : G.speed === 2 ? 3 : 1; $('speedBtn').textContent = '»'.repeat(G.speed) + ` ${G.speed}x`; $('speedBtn').classList.toggle('lit', G.speed > 1); }
$('startBtn').onclick = () => { if (!G.paused) startWave(); };
$('speedBtn').onclick = cycleSpeed;
$('autoBtn').onclick = () => { G.auto = !G.auto; $('autoBtn').classList.toggle('lit', G.auto); if (G.auto && !G.running && !G.paused) startWave(); };
$('muteBtn').onclick = () => { G.mute = !G.mute; syncSettings(); };
$('musicBtn').onclick = () => { Music.setOn(!Music.on); syncSettings(); };
$('menuBtn').onclick = () => pauseOpen() ? hidePause() : showPause();
// browsers only allow audio after a click, so the menu theme starts on the first one
window.addEventListener('pointerdown', () => { if (Music.on && !Music.song) Music.play(G.started ? 'battle' : 'menu'); }, {once: true});

// menu animation
(function menuLoop(now) {
  if ($('menu').classList.contains('show')) drawParade(now / 1000);
  requestAnimationFrame(menuLoop);
})(performance.now());

buildMenu(); buildShop(); refreshInfo(); updateHud(); syncSettings(); refreshHub();

// Fit the board inside whatever space is left, keeping the 16:10 map ratio
(function fitBoard() {
  const wrap = document.querySelector('.boardwrap'), board = document.querySelector('.board');
  const fit = () => {
    const r = wrap.getBoundingClientRect();
    let w = r.width, h = w / 1.6;
    if (h > r.height) { h = r.height; w = h * 1.6; }
    board.style.width = Math.max(200, w) + 'px'; board.style.height = Math.max(125, h) + 'px';
  };
  new ResizeObserver(fit).observe(wrap); window.addEventListener('resize', fit); fit();
})();

// extra status line for heroes with their own mechanic
function heroStatusHtml(t) {
  const d = TOWERS[t.type], s = t.s;
  if (d.swap) return `<button class="chip formBtn" id="formBtn" title="X">🔄 ${d.formName[t.form || 'yara']} · swap <kbd>X</kbd></button>`;
  if (t.type === 'a438') return `<div class="hstat">${t.form === 'o9' ? '👁 Ø9-38: true form unleashed' : `🔒 Containment: ${Math.min(t.pops, s.breakAt)} / ${s.breakAt} pops to break out`}</div>`;
  if (s.saves) return `<div class="hstat">🛡 Catches ${t.savesLeft || 0} / ${s.saves} more enemies this wave${s.regen ? ` · +${s.regen} lives per wave` : ''}</div>`;
  if (t.type === 'dean') return `<div class="hstat">🔫 ${s.ammo} bullets, ${s.reload.toFixed(1)}s reload</div>`;
  if (s.waveScale) return `<div class="hstat">🧮 +${Math.floor(G.wave * s.waveScale)} damage from the wave number</div>`;
  if (s.kind === 'goon') return `<div class="hstat">🕴 ${s.goonN} henchman every ${s.rate.toFixed(1)}s · ${s.pierce} hits each</div>`;
  if (d.onRoad) return `<div class="hstat">🪱 Lives on the road</div>`;
  if (t.type === 'appster') return `<div class="hstat">🎵 Beat drops every ${s.beat}s</div>`;
  return '';
}
