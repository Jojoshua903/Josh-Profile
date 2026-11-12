// ===== WIDR TD: game =====
const cv = document.getElementById('game'), ctx = cv.getContext('2d');
const DPR = Math.min(2, window.devicePixelRatio || 1);
cv.width = W * DPR; cv.height = H * DPR;
let BG = buildBackground(MAP);

const G = {
  cash: 650, lives: 150, wave: 0, running: false, queue: [], waveT: 0, waveHp: 1,
  enemies: [], towers: [], projs: [], fx: [], patches: [], speed: 1, auto: false, freeplay: false,
  sel: null, placing: null, mouse: {x: -99, y: -99, in: false}, t: 0, over: false, won: false, started: false, mute: false, nextId: 1,
  pops: 0, rallyT: 0, shake: 0, spawnAlt: 0,
  // modes: normal · challenge · daily · bossrush · odyssey · sandbox
  mode: 'normal', rules: {}, elite: false, stage: 0, crew: null, challenge: null, mainHero: null, tram: null, ventT: undefined,
};
const WAVE_TIPS = {
  7: 'Shell Crabs have armor. 1 damage hits just clink off. Bombs, lasers and armor-cracking upgrades get through.',
  8: 'Biscotto Sprouts grow their health back if you leave them alone. Pop them fast.',
  9: 'Ghost Notes are invisible to most heroes. Julie and Reshman see them, and plenty of upgrades give ghost sight.',
  10: 'Grumble Brutes burst into Gelato Blobs when popped.',
  11: 'Frozen Gelato is wrapped in ice. Only explosions, lasers, lightning, drones and abilities can crack it.',
  13: 'Grumble Crows fly straight over the map. Only heroes that hit flyers can touch them: Julie, Otis, Chemmy, Milo, Josh, Reshman, Deniz, Sichen and a few upgrades.',
  15: 'BOSS: Toro Ferro charges in. Armored and very tough.',
  17: 'Grumble Medics heal every enemy around them. Take them out first.',
  19: 'Toro Guards carry shields that block hits from the front. Hit them from behind, or use explosions.',
  20: 'BOSS: Zennith, the demon pitcher. His fireballs knock your heroes out for a few seconds.',
  25: 'BOSS: King Grumbleclaw himself. He keeps calling in crabs.',
  27: "BOSS: Byte's mech. At half health it goes into overdrive and gets faster and tougher.",
  29: 'BOSS: Meta AI. It launches flying bots and raises an energy shield every 10 seconds.',
  30: 'FINAL BOSS: Toon de Demoon rises from RhymeRhythm with a ghost choir.',
};

// ---------- Sound ----------
let AC = null;
function sfx(kind) {
  if (G.mute) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const o = AC.createOscillator(), g = AC.createGain(), now = AC.currentTime;
    const P = {pop: ['square', 520, 900, .05, .06], boom: ['sawtooth', 140, 40, .25, .12], laser: ['triangle', 1200, 300, .12, .05], place: ['square', 300, 600, .1, .07],
      up: ['square', 400, 1200, .18, .07], leak: ['sawtooth', 200, 90, .25, .08], snipe: ['square', 900, 200, .08, .04], clink: ['triangle', 1800, 1500, .04, .03],
      ability: ['square', 200, 1600, .4, .09], cash: ['triangle', 900, 1800, .12, .06], zap: ['sawtooth', 1600, 400, .09, .04], freeze: ['sine', 1400, 700, .2, .06],
      laugh: ['square', 500, 300, .12, .05], tram: ['triangle', 300, 320, .6, .08], dig: ['triangle', 200, 150, .06, .05]}[kind];
    o.type = P[0]; o.frequency.setValueAtTime(P[1], now); o.frequency.exponentialRampToValueAtTime(P[2], now + P[3]);
    g.gain.setValueAtTime(P[4], now); g.gain.exponentialRampToValueAtTime(.0001, now + P[3]);
    o.connect(g); g.connect(AC.destination); o.start(now); o.stop(now + P[3] + .02);
  } catch (e) {}
}
let popBudget = 0;

// ---------- Waves ----------
const totalWaves = () => G.mode === 'bossrush' ? BOSS_RUSH.length : WAVES.length;
function waveList(n) { return G.mode === 'bossrush' ? BOSS_RUSH[n] : getWave(n); }
function startWave() {
  if (G.running || G.over || G.paused || (!G.freeplay && G.wave >= totalWaves())) return;
  const wave = waveList(G.wave);
  G.queue = [];
  for (const [type, count, gap, delay] of wave) for (let i = 0; i < count; i++) G.queue.push({type, at: delay + i * gap});
  G.queue.sort((a, b) => a.at - b.at);
  G.waveT = 0; G.running = true; G.sbOnly = false; G.waveHp = wave.hpMult || 1;
  Music.play(wave.some(g => ENEMIES[g[0]].boss) ? 'boss' : 'battle');
  if (G.mode === 'bossrush') toast(`BOSS ${G.wave + 1} / ${BOSS_RUSH.length}`, G.elite ? 'Elite bosses: 2.5x health and nastier tricks.' : '');
  else toast(`WAVE ${G.wave + 1}`, WAVE_TIPS[G.wave + 1] || (G.freeplay ? `Freeplay · enemies at ${Math.round(G.waveHp * 100)}% health` : ''));
  updateHud();
}
function endWave() {
  G.running = false; G.wave++;
  let bonus = G.mode === 'bossrush' ? 600 : 100 + Math.min(G.wave, 40) * 12;
  for (const t of G.towers) bonus += (t.s.jackpot || 0) + (t.s.income || 0);
  G.cash += bonus;
  for (const t of G.towers) if (t.main) heroGainXP(t, 20 + G.wave * 2);
  addText(W / 2, 60, `+$${bonus}`, '#7be36b', 28, 0); sfx('cash');
  if (G.mode === 'normal') saveBest();
  Meta.event('wave');
  masteryWave();
  if (G.mode === 'odyssey' && G.stage < ODYSSEY.length - 1 && G.wave === ODYSSEY[G.stage].waves[1]) { nextStage(); return; }
  if (G.wave === totalWaves() && !G.freeplay) { G.won = true; G.over = true; clearSave(); showEnd(true); heroSay(null, "win"); return; }
  if (G.auto) setTimeout(() => { if (!G.running && G.auto) startWave(); }, 900);
  saveGame();
  updateHud(); refreshInfo();
}
function saveBest() {
  const key = `widrtd_best_${MAP.id}_${DIFF.tag}`, best = +(store.get(key) || 0);
  if (G.wave > best) store.set(key, G.wave);
}
const bestWave = (mapId, tag) => +(store.get(`widrtd_best_${mapId}_${tag}`) || 0);
function nextStage() {
  G.stage++;
  const st = ODYSSEY[G.stage];
  loadMap(st.map); BG = buildBackground(MAP);
  Object.assign(G, {towers: [], patches: [], projs: [], sel: null, placing: null, cash: st.cash});
  setupHazards();
  toast(`STAGE ${G.stage + 1}: ${MAP.name.toUpperCase()}`, 'Your heroes stay behind, but your lives carry over. Build again!');
  saveGame(); updateHud(); refreshInfo(); buildShop();
}
function setupHazards() {
  G.tram = MAP.tram ? {t: MAP.tram.every, x: -999, hit: new Set()} : null;
  G.ventT = MAP.vents ? 14 : undefined;
  DOORS.forEach(d => { d.t = 0; d.closed = false; });
}

// ---------- Enemies ----------
// pi = which path; flyers use the straight 'air' route, everyone else takes turns between a map's paths
function spawnEnemy(type, d = 0, pi) {
  const def = ENEMIES[type];
  // flyers launched by a boss start at the same share of the way along the straight air route
  if (def.fly) { if (pi !== undefined && pi !== 'air') d = d / pathOf(pi).len * AIR.len; pi = 'air'; } else if (pi === undefined || pi === 'air') pi = G.spawnAlt++ % PATHS.length;
  const scale = (!def.boss && G.wave >= 20 ? 1 + (Math.min(G.wave, 30) - 19) * .07 : 1) * G.waveHp * (def.boss && G.elite ? 2.5 : 1);
  const hp = Math.max(1, Math.round(def.hp * scale * DIFF.hp));
  const e = {id: G.nextId++, type, d, pi, hp, maxHp: hp, x: 0, y: 0, ang: 0, seed: Math.random() * 9, flash: 0, stun: 0, slow: 0, slowT: 0,
    spawnT: def.spawn ? def.spawn.every : 0, healT: def.heal ? def.heal.every : 0, specT: def.special && def.special.every ? def.special.every : 0,
    shieldT: 0, phase2: false, spdMult: 1, armorBonus: 0, dead: false, stripped: false};
  const p = posAt(d, pi); e.x = p.x; e.y = p.y; e.ang = p.ang;
  G.enemies.push(e);
  if (def.boss) toast((G.elite ? 'ELITE ' : '') + def.name, 'has entered the map!');
  if (def.boss) heroSay(null, "boss");
  return e;
}
// o.src is the hero that dealt the hit · o.type: sharp (default), blast, energy, cold, magic
function damage(e, amt, o = {}) {
  if (e.dead) return false;
  const def = ENEMIES[e.type], src = o.src, type = o.type || 'sharp';
  if (e.shieldT > 0 && type !== 'magic') { if (Math.random() < .1) addText(e.x, e.y - 20, 'IMMUNE', '#9fe3ff', 13, 0); return false; }
  if (def.fly && type !== 'magic' && !(src && src.s.air)) return false;
  if (def.frozen && !['blast', 'energy', 'magic'].includes(type)) { if (Math.random() < .12) { addText(e.x, e.y - 14, 'ICE', '#bfe9f9', 13, 0); sfx('clink'); } return false; }
  if (def.shield && src && !['blast', 'magic'].includes(type)) {
    const dx = src.x - e.x, dy = src.y - e.y, L = Math.hypot(dx, dy) || 1;
    if ((dx * Math.cos(e.ang) + dy * Math.sin(e.ang)) / L > .45) { if (Math.random() < .12) addText(e.x, e.y - 16, 'BLOCK', '#cdd6e4', 13, 0); return false; }
  }
  let a = amt * (def.boss && o.bossMult ? o.bossMult : 1);
  if (src && src.dmgBuff) a *= 1 + src.dmgBuff;
  if (e.markT > 0) a *= 2; // marked by Raaf's Nevermore
  const armor = (def.armor || 0) + e.armorBonus;
  if (armor && src && src.s.armorMult) a *= src.s.armorMult;
  if (src && src.s.strip && armor && !e.stripped) { e.stripped = true; addText(e.x, e.y - 18, 'EXPOSED', '#b5d84a', 13, 0); }
  if (src && src.s.shatter && e.stun > 0) a *= src.s.shatter;
  if (!o.pierceArmor && !(src && src.s.crush) && armor && !e.stripped) a -= armor;
  if (a <= 0) { if (Math.random() < .15) { addText(e.x, e.y - 14, 'CLINK', '#ddd', 13, (Math.random() - .5) * .4); sfx('clink'); } return false; }
  e.hp -= a; e.flash = .06;
  e.dAcc = (e.dAcc || 0) + a; if (def.boss) e.dBoss = true;
  if (o.stun) e.stun = Math.max(e.stun, def.boss ? o.stun * .25 : o.stun);
  if (o.slow) { e.slow = Math.max(e.slow, def.boss ? o.slow * .5 : o.slow); e.slowT = o.slowT || 1.5; }
  if (e.hp <= 0) kill(e, src);
  return true;
}
const POPS = ['POP!', 'WHAM', 'BAM', 'ZAP', 'BONK', 'POW'];
function kill(e, src) {
  e.dead = true;
  const def = ENEMIES[e.type];
  G.cash += def.reward; G.pops++;
  if (src) {
    src.pops = (src.pops || 0) + 1;
    if (src.s.bounty) G.cash += src.s.bounty;
    if (src.main) heroGainXP(src, def.boss ? 40 : 1);
  }
  popEffect(e, def);
  if (def.boss) { G.fx.push({kind: 'boom', x: e.x, y: e.y, r: 110, t: 0, life: .6, col: PAL.coral}); addText(e.x, e.y - 30, 'K.O.!', PAL.sun, 46, -.1); sfx('boom'); G.shake = .5; }
  else if (popBudget > 0 && Math.random() < .35) { popBudget--; addText(e.x, e.y - 10, POPS[(Math.random() * POPS.length) | 0], [PAL.sun, '#fff', PAL.water][(Math.random() * 3) | 0], 16, (Math.random() - .5) * .5); }
  if (popBudget > 0) { popBudget -= .5; sfx('pop'); }
  if (def.children) def.children.forEach((c, i) => { const ch = spawnEnemy(c, Math.max(0, e.d - i * 10), e.pi); ch.stun = .2; });
}
// pop effect from the Trophy Store
function popEffect(e, def) {
  const style = Meta.p.equipped.pop, n = def.boss ? 40 : 6;
  if (style === 'pop_gelato') { G.fx.push({kind: 'splat', x: e.x, y: e.y, r: def.boss ? 60 : 16, t: 0, life: .5, col: ['#ffb3d1', '#7ad3ff', '#fff1a8', '#b5f0c0'][(Math.random() * 4) | 0]}); return; }
  if (style === 'pop_notes') { for (let i = 0; i < (def.boss ? 12 : 2); i++) G.fx.push({kind: 'note', x: e.x + (Math.random() - .5) * 20, y: e.y, txt: ['♪', '♫', '♬'][i % 3], size: 18, col: ['#a65cff', '#ff7ab6', PAL.sun][i % 3], t: 0, life: .9}); return; }
  if (style === "pop_confetti" || style === "pop_stars" || style === "pop_rainbow") {
    for (let i = 0; i < n + 2; i++) G.fx.push({kind: style === "pop_stars" ? "star" : "confetti", x: e.x, y: e.y, vx: (Math.random() - .5) * (def.boss ? 420 : 240), vy: (Math.random() - .9) * (def.boss ? 420 : 240), t: 0, life: .6 + Math.random() * .3, s: style === "pop_stars" ? 6 : 5 + Math.random() * 3, rot: Math.random() * 6,
      col: style === "pop_stars" ? PAL.sun : style === "pop_rainbow" ? `hsl(${(i * 47) % 360},90%,60%)` : ["#ff5a4e", "#ffcc29", "#5fd0d6", "#a65cff", "#7be36b"][i % 5]});
    return;
  }
  const kind = style === 'pop_fruit' ? 'fruitbit' : 'bit';
  for (let i = 0; i < n; i++) G.fx.push({kind, x: e.x, y: e.y, vx: (Math.random() - .5) * (def.boss ? 400 : 220), vy: (Math.random() - .8) * (def.boss ? 400 : 220), t: 0, life: .5 + Math.random() * .3, s: 4 + Math.random() * 4, rot: Math.random() * 6, col: kind === 'fruitbit' || Math.random() < .5 ? FRUITS[i % 4] : def.color});
}

// ---------- Towers ----------
const waterAt = (x, y) => PONDS.find(p => (p.kind || MAP.theme.block) === 'water' && Math.hypot(x - p.x, y - p.y) < p.r - 6);
function placeTower(type, x, y) {
  const def = TOWERS[type];
  const t = {id: G.nextId++, type, x, y, tiers: [0, 0, 0], spent: heroCost(type), cd: .2, ang: Math.PI / 2, target: 'first', bhT: 2, buff: 0, rangeBuff: 0, camoGiven: false,
    pops: 0, abCd: 0, boostT: 0, disabledT: 0, drones: [], mineT: 4, onWater: !!waterAt(x, y) && !TOWERS[type].flying, main: false, hxp: 0};
  if (type === G.mainHero && !G.towers.some(m => m.main)) t.main = true;
  t.s = computeStats(t);
  G.towers.push(t); G.cash -= heroCost(type); sfx('place');
  G.fx.push({kind: 'ring', x, y, r: 40, t: 0, life: .4, col: def.color});
  if (t.main) addText(x, y - 40, 'MAIN HERO', PAL.sun, 15, 0);
  heroSay(t, "place");
  Meta.event('place');
  return t;
}
function heroGainXP(t, n) {
  const before = heroLevel(t.hxp);
  t.hxp += n;
  const after = heroLevel(t.hxp);
  if (after > before) { t.s = computeStats(t); addText(t.x, t.y - 46, `HERO LEVEL ${after}!`, PAL.sun, 16, 0); sfx('up'); Meta.event('herolevel', after); if (G.sel === t) refreshInfo(); }
}
const allowedHero = type => !G.rules.allowed || G.rules.allowed.includes(type);
const heroCapReached = () => G.rules.maxHeroes && G.towers.length >= G.rules.maxHeroes;
function validPlace(x, y, type = G.placing) {
  if (x < 18 || x > W - 18 || y < 22 || y > H - 18) return false;
  if (GATES.some(q => Math.hypot(x - q.x, y - q.y) < 75)) return false;
  if (TOWERS[type] && TOWERS[type].onRoad) return roadPlace(x, y);
  if (SEGS.some(s => distToSeg(x, y, s) < PATH_W / 2 + 15 * heroSize(type || 'guiseppe'))) return false;
  if ((MAP.vents || []).some(v => Math.hypot(x - v.x, y - v.y) < 42)) return false;
  if (MAP.tram && Math.abs(y - MAP.tram.y) < 34) return false;
  const pond = PONDS.find(p => Math.hypot(x - p.x, y - p.y) < p.r + 14);
  if (pond && !(type && TOWERS[type].water && waterAt(x, y)) && !(type && TOWERS[type].flying)) return false;
  if (G.towers.some(t => Math.hypot(t.x - x, t.y - y) < 18 * (heroSize(t.type) + heroSize(type || 'guiseppe')))) return false;
  return true;
}
// 3-2-0 (5-2-0 on the first path): at most two paths get upgrades, and only one of them goes past tier 2
function canUpgrade(t, p) {
  const ups = TOWERS[t.type].paths[p].ups, nt = t.tiers[p] + 1, others = t.tiers.filter((v, i) => i !== p);
  if (nt > ups.length) return 'max';
  if (G.rules.noPath3 && p === 2) return 'locked';
  if (G.rules.maxTier && nt > G.rules.maxTier) return 'locked';
  if (t.tiers[p] === 0 && others.filter(v => v > 0).length >= 2) return 'locked';
  if (nt > OTHER_MAX && others.some(v => v > OTHER_MAX)) return 'locked';
  return 'ok';
}
function upgrade(t, p) {
  if (canUpgrade(t, p) !== 'ok') return;
  const up = TOWERS[t.type].paths[p].ups[t.tiers[p]];
  if (G.cash < price(up.cost)) { flashCash(); return; }
  G.cash -= price(up.cost); t.spent += price(up.cost); t.tiers[p]++; t.s = computeStats(t);
  sfx('up'); G.fx.push({kind: 'ring', x: t.x, y: t.y, r: up.paradise ? 120 : 50, t: 0, life: up.paradise ? .9 : .5, col: PAL.sun});
  addText(t.x, t.y - 30, up.name.toUpperCase() + '!', PAL.sun, up.paradise ? 20 : 15, 0);
  if (up.paradise) { G.shake = .4; G.fx.push({kind: 'flash', t: 0, life: .4, col: 'rgba(255,204,41,.35)'}); }
  if (t.s.ability) addText(t.x, t.y - 48, 'ABILITY READY', '#fff', 13, 0);
  heroSay(t, up.paradise ? "para" : "up");
  Meta.event('upgrade', t);
  refreshInfo(); updateHud();
}
function sellTower(t) {
  G.cash += Math.floor(t.spent * .7);
  G.towers = G.towers.filter(x => x !== t); G.patches = G.patches.filter(p => p.src !== t);
  G.sel = null; refreshInfo(); updateHud();
}
const TARGETS = ['first', 'last', 'strong', 'close'];
function canSee(t, e) { const d = ENEMIES[e.type]; return (!d.camo || t.s.camo || t.camoGiven) && (!d.fly || t.s.air); }
const rangeOf = t => t.s.range * (1 + t.rangeBuff);
function inRange(t, e, extra = 0) { return Math.hypot(e.x - t.x, e.y - t.y) <= rangeOf(t) + ENEMIES[e.type].r * .6 + extra; }
function pickTargets(t, n = 1) {
  const list = G.enemies.filter(e => !e.dead && canSee(t, e) && inRange(t, e));
  const key = {first: e => -e.d, last: e => e.d, strong: e => -(e.maxHp * 100 + e.d * .01), close: e => Math.hypot(e.x - t.x, e.y - t.y)}[t.target];
  list.sort((a, b) => key(a) - key(b));
  return list.slice(0, n);
}
const boosting = (t, id) => t.boostT > 0 && t.s.ability && t.s.ability.id === id;

function fire(t, target) {
  const s = t.s;
  t.ang = Math.atan2(target.y - t.y, target.x - t.x);
  const hx = t.x + Math.cos(t.ang) * 20, hy = t.y + Math.sin(t.ang) * 14 - 2;
  switch (s.kind) {
    case 'fruit': case 'star': case 'nail': case 'feather': case 'plane': case 'vinyl': case 'digit': case 'kimchi': {
      const n = s.shots * (boosting(t, 'shadowClones') ? 3 : 1), spread = s.spread === 'ring' ? 'ring' : (s.spread || 0) * (n > s.shots ? .6 : 1);
      for (let i = 0; i < n; i++) {
        const a = spread === 'ring' ? t.ang + i / n * Math.PI * 2 : t.ang + (i - (n - 1) / 2) * spread;
        G.projs.push({kind: s.kind, src: t, x: hx, y: hy, vx: Math.cos(a) * s.speed, vy: Math.sin(a) * s.speed, dmg: s.dmg, pierce: s.pierce, hit: new Set(), life: rangeOf(t) * 1.5 / s.speed,
          size: s.size || 1, fruit: s.fruit, col: s.kind === 'star' ? '#cdd6e4' : FRUITS[(Math.random() * 4) | 0], spin: 0, homing: s.homing ? target : null, opts: {stun: s.stun, slow: s.slow, bossMult: s.bossMult, burn: s.burn, burnT: s.burnT, burnSpread: s.burnSpread}});
      }
      break;
    }
    case 'snipe': {
      for (const e of pickTargets(t, s.targets)) {
        damage(e, s.dmg, {stun: s.stun, bossMult: s.bossMult, pierceArmor: s.golden, src: t});
        G.fx.push({kind: 'tracer', x: hx, y: hy, x2: e.x, y2: e.y, t: 0, life: .15, col: s.golden ? PAL.sun : '#b5d84a'});
        G.fx.push({kind: 'boom', x: e.x, y: e.y, r: 12, t: 0, life: .2, col: s.golden ? PAL.sun : '#b5d84a'});
      }
      sfx('snipe'); break;
    }
    case 'bomb': {
      const dist = Math.hypot(target.x - hx, target.y - hy);
      const lead = target.pi === 'air' ? target : posAt(target.d + ENEMIES[target.type].speed * (dist / s.speed) * .8, target.pi);
      G.projs.push({kind: 'bomb', src: t, sx: hx, sy: hy, tx: lead.x, ty: lead.y, x: hx, y: hy, t: 0, dur: Math.max(.25, dist / s.speed), s, nuke: s.nuke});
      break;
    }
    case 'laser': {
      const len = rangeOf(t) * 1.2, x2 = t.x + Math.cos(t.ang) * len, y2 = t.y + Math.sin(t.ang) * len;
      const seg = {x1: t.x, y1: t.y, x2, y2};
      const hits = G.enemies.filter(e => !e.dead && distToSeg(e.x, e.y, seg) <= s.width / 2 + ENEMIES[e.type].r)
        .sort((a, b) => Math.hypot(a.x - t.x, a.y - t.y) - Math.hypot(b.x - t.x, b.y - t.y)).slice(0, s.pierce);
      hits.forEach(e => damage(e, s.dmg, {pierceArmor: true, slow: s.slow, src: t, type: 'energy'}));
      G.fx.push({kind: 'beam', x: hx, y: hy, x2, y2, w: s.width, t: 0, life: s.nova ? .25 : .14, col: s.nova ? PAL.sun : s.slow ? '#9b7bff' : PAL.water});
      sfx('laser'); break;
    }
    case 'ball': {
      t.shotN = (t.shotN || 0) + 1;
      const hr = s.homerun && t.shotN % s.homerun === 0;
      const n = hr ? 1 : (s.shots || 1);
      for (let i = 0; i < n; i++) {
        const a = t.ang + (i - (n - 1) / 2) * (s.spread || 0), spd = hr ? 700 : s.speed;
        const crit = !hr && s.crit && Math.random() < s.crit;
        G.projs.push({kind: 'ball', src: t, x: hx, y: hy, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, dmg: hr ? (s.hrDmg || 25) : s.dmg * (crit ? 4 : 1), pierce: hr ? 60 : s.pierce,
          hit: new Set(), life: hr ? 3 : rangeOf(t) * 1.6 / spd, size: hr ? 2 : 1, homing: !hr && s.homing ? target : null, knock: hr ? 70 : 0, crit, hr, spin: 0});
      }
      if (hr) { addText(t.x, t.y - 34, 'HOME RUN!', PAL.sun, 18, -.05); sfx('boom'); } else sfx('snipe');
      break;
    }
    case 'pong':
      G.projs.push({kind: 'pong', x: hx, y: hy, tgt: target, dmg: s.dmg, bounces: s.bounces + (boosting(t, 'lightning') ? 6 : 0), range: s.bounceRange, spd: s.speed, stun: s.stun, tower: t, hit: new Set(), life: 4, trail: []});
      sfx('clink'); break;
    case 'chain': {
      const firsts = s.shots > 1 ? pickTargets(t, s.shots) : [target];
      firsts.forEach(f => chainBolt(t, f, hx, hy));
      sfx('zap'); break;
    }
    case 'boulder':
      if (target.pi === 'air') break;
      G.projs.push({kind: 'boulder', src: t, pi: target.pi, d: Math.min(pathOf(target.pi).len, target.d + 30), x: target.x, y: target.y, dmg: s.dmg, pierce: s.pierce, hit: new Set(), spd: 260, size: s.dmg >= 10 ? 1.5 : 1, spin: 0});
      sfx('dig'); break;
    case 'vine': {
      G.patches.push({x: target.x, y: target.y, r: s.radius, dur: s.dur, t: 0, tick: 0, src: t});
      const mine = G.patches.filter(p => p.src === t);
      if (mine.length > s.patches) G.patches.splice(G.patches.indexOf(mine[0]), 1);
      G.fx.push({kind: 'ring', x: target.x, y: target.y, r: s.radius, t: 0, life: .3, col: '#4fb86b'});
      break;
    }
  }
}
function chainBolt(t, first, hx, hy) {
  const s = t.s, pts = [{x: hx, y: hy}], hit = new Set();
  let cur = first;
  for (let i = 0; i <= s.chains && cur; i++) {
    hit.add(cur.id); pts.push({x: cur.x, y: cur.y});
    damage(cur, s.dmg, {type: 'energy', stun: s.stun, bossMult: s.bossMult, src: t});
    let best = null, bd = 110;
    for (const e of G.enemies) { if (e.dead || hit.has(e.id) || !canSee(t, e)) continue; const d = Math.hypot(e.x - cur.x, e.y - cur.y); if (d < bd) { bd = d; best = e; } }
    cur = best;
  }
  G.fx.push({kind: 'bolt', pts, t: 0, life: .18});
}
// area attacks around the hero: Lars's pickaxe, Deniz's frost and Sichen's jokes
function pulse(t) {
  const s = t.s, hits = G.enemies.filter(e => !e.dead && inRange(t, e)).slice(0, s.pierce);
  const type = (PULSE_TYPE[s.kind] || {}).type;
  hits.forEach(e => { if (s.dmg) damage(e, s.dmg, {type, stun: s.stun, slow: s.slow, slowT: 1.5, src: t}); else if (canSee(t, e) || !ENEMIES[e.type].camo) { if (s.stun) e.stun = Math.max(e.stun, ENEMIES[e.type].boss ? s.stun * .25 : s.stun); if (s.slow) { e.slow = Math.max(e.slow, s.slow); e.slowT = 1.5; } } });
  if (s.knock) hits.forEach(e => { if (!e.dead && !ENEMIES[e.type].boss && e.pi !== 'air') e.d = Math.max(0, e.d - s.knock); });
  const col = (PULSE_TYPE[s.kind] || {}).col;
  G.fx.push({kind: 'ring', x: t.x, y: t.y, r: rangeOf(t), t: 0, life: .4, col});
  if (s.kind === 'joke') { addText(t.x + (Math.random() - .5) * 30, t.y - 30, ['HA!', 'HAHA', 'BA-DUM TSS', 'GET IT?'][(Math.random() * 4) | 0], '#ff7ab6', 14, (Math.random() - .5) * .3); sfx('laugh'); }
  else if (s.kind === 'frost') sfx('freeze'); else if (s.kind === 'stomp') { sfx('boom'); G.shake = Math.max(G.shake, .15); } else sfx('dig');
}
function explode(x, y, r, s, src) {
  let n = 0;
  for (const e of G.enemies) {
    if (e.dead || n >= s.pierce) continue;
    if (Math.hypot(e.x - x, e.y - y) <= r + ENEMIES[e.type].r * .5) { damage(e, s.dmg, {pierceArmor: true, stun: s.stun, bossMult: s.bossMult, src, type: 'blast'}); n++; }
  }
  G.fx.push({kind: 'boom', x, y, r, t: 0, life: .35, col: s.nuke ? PAL.coral : PAL.sun});
}

// ---------- Abilities ----------
function abilityReady(t) { return t.s.ability && t.abCd <= 0 && G.started && !G.over; }
function useAbility(t) {
  if (!abilityReady(t)) return;
  const ab = t.s.ability, live = () => G.enemies.filter(e => !e.dead), magic = {pierceArmor: true, src: t, type: 'magic'};
  // tiers 4 and 5 on path 3 raise pow: damage × P, effects last L times as long
  const P = ab.pow || 1, L = 1 + (P - 1) * .5;
  t.abCd = ab.cd; sfx('ability'); G.shake = .35; Meta.event('ability'); heroSay(t, "ability");
  addText(t.x, t.y - 40, ab.name.toUpperCase() + '!', '#fff', 20, -.05);
  switch (ab.id) {
    default: if (ab.rateBoost) { t.boostT = 8 * L; t.cd = 0; } else if (ABIL_EXTRA[ab.id]) ABIL_EXTRA[ab.id](t, P, L, live, magic); break;
    case 'fruitRain':
      live().forEach(e => { damage(e, 6 * P, magic); G.fx.push({kind: 'boom', x: e.x, y: e.y, r: 18, t: 0, life: .35, col: FRUITS[(Math.random() * 4) | 0]}); });
      for (let i = 0; i < 40; i++) { const pi = i % PATHS.length, p = posAt(Math.random() * PATHS[pi].len, pi); G.fx.push({kind: 'bit', x: p.x, y: p.y - 200, vx: 0, vy: 300, t: 0, life: .6, s: 9, rot: 0, col: FRUITS[i % 4]}); }
      break;
    case 'raid':
      live().forEach(e => { e.stun = Math.max(e.stun, (ENEMIES[e.type].boss ? .8 : 2.5) * L); damage(e, 10 * P, magic); });
      G.fx.push({kind: 'flash', t: 0, life: .5, col: 'rgba(63,120,255,.35)'});
      break;
    case 'airstrike':
      live().sort((a, b) => b.d - a.d).slice(0, Math.round(8 * L)).forEach((e, i) => setTimeout(() => { if (G.over) return; explode(e.x, e.y, 70, {pierce: 40, dmg: 15 * P, bossMult: 2}, t); sfx('boom'); }, i * 90));
      break;
    case 'moonBark':
      live().forEach(e => damage(e, 20 * P, Object.assign({slow: .5, slowT: 3 * L}, magic)));
      G.fx.push({kind: 'ring', x: t.x, y: t.y, r: 900, t: 0, life: .9, col: '#fff2a8'});
      G.fx.push({kind: 'flash', t: 0, life: .4, col: 'rgba(255,242,168,.45)'});
      break;
    case 'stretch': G.rallyT = 8 * L; G.fx.push({kind: 'flash', t: 0, life: .4, col: 'rgba(47,111,224,.25)'}); break;
    case 'lightning': case 'shadowClones': case 'bloom': t.boostT = 8 * L; t.cd = 0; break;
    case 'overclock':
      G.towers.forEach(o => { if (Math.hypot(o.x - t.x, o.y - t.y) <= 200) { o.overT = 8 * L; o.cd = 0; G.fx.push({kind: 'ring', x: o.x, y: o.y, r: 30, t: 0, life: .4, col: '#ff8a1f'}); } });
      G.fx.push({kind: 'ring', x: t.x, y: t.y, r: 200, t: 0, life: .6, col: '#ff8a1f'});
      break;
    case "nevermore":
      live().forEach(e => { e.markT = 8 * L; damage(e, 5 * P, magic); }); Meta.p.flags.nevermore = true;
      G.fx.push({kind: "flash", t: 0, life: .5, col: "rgba(60,40,110,.4)"});
      break;
    case 'caveIn':
      live().filter(e => e.pi !== 'air').sort((a, b) => b.hp - a.hp).slice(0, Math.round(15 * L)).forEach(e => { damage(e, 30 * P, {pierceArmor: true, src: t, type: 'blast', stun: 1.5}); G.fx.push({kind: 'boom', x: e.x, y: e.y, r: 26, t: 0, life: .4, col: '#a89c90'}); });
      break;
    case 'lightningStorm': {
      const Ls = live();
      for (let i = 0; i < Math.round(30 * L) && Ls.length; i++) { const e = Ls[(Math.random() * Ls.length) | 0]; damage(e, 12 * P, Object.assign({}, magic, {type: 'energy'})); if (i < 12) G.fx.push({kind: 'bolt', pts: [{x: e.x + 20, y: -10}, {x: e.x, y: e.y}], t: 0, life: .25}); }
      G.fx.push({kind: 'flash', t: 0, life: .3, col: 'rgba(255,210,58,.35)'});
      break;
    }
    case 'droneStrike':
      live().sort((a, b) => b.d - a.d).slice(0, Math.round(12 * L)).forEach((e, i) => setTimeout(() => { if (G.over) return; explode(e.x, e.y, 45, {pierce: 20, dmg: 25 * P, bossMult: 2}, t); }, i * 70));
      break;
    case 'earthquake':
      live().forEach(e => damage(e, 15 * P, {pierceArmor: true, src: t, type: 'blast', stun: 2}));
      G.shake = .9; break;
    case 'bigFreeze':
      live().forEach(e => { e.stun = Math.max(e.stun, (ENEMIES[e.type].boss ? 1.5 : 4) * L); damage(e, 10 * P, magic); });
      G.fx.push({kind: 'flash', t: 0, life: .6, col: 'rgba(127,214,255,.45)'});
      break;
    case 'recess': {
      // the whole class shows up and throws paper planes from the edges of the map
      const n = Math.round(36 * L);
      for (let i = 0; i < n; i++) setTimeout(() => { if (G.over) return; const L2 = G.enemies.filter(e => !e.dead); if (!L2.length) return;
        const e = L2[(Math.random() * L2.length) | 0], side = i % 4, x = side === 0 ? -10 : side === 1 ? W + 10 : Math.random() * W, y = side === 2 ? -10 : side === 3 ? H + 10 : Math.random() * H, a = Math.atan2(e.y - y, e.x - x);
        G.projs.push({kind: 'plane', src: t, x, y, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, dmg: 6 * P, pierce: 4, hit: new Set(), life: 3, size: 1.3, homing: e, spin: 0, col: ['#fff', '#ffe9a8', '#d6f4ff'][i % 3], opts: {type: 'magic'}});
      }, i * 45);
      addText(W / 2, H / 2, 'RECESS!', PAL.sun, 40, -.05);
      break;
    }
    case 'lockdown':
      live().forEach(e => { e.stun = Math.max(e.stun, (ENEMIES[e.type].boss ? 1.2 : 3) * L); damage(e, 20 * P, {pierceArmor: true, src: t, type: 'blast'}); });
      G.towers.forEach(o => { if (Math.hypot(o.x - t.x, o.y - t.y) <= 220) o.disabledT = 0; });
      G.fx.push({kind: 'ring', x: t.x, y: t.y, r: 900, t: 0, life: .8, col: '#5fd0d6'}); G.fx.push({kind: 'flash', t: 0, life: .4, col: 'rgba(95,208,214,.3)'}); G.shake = .8;
      addText(W / 2, H / 2, 'LOCKDOWN!', '#5fd0d6', 40, -.05);
      break;
    case 'roast':
      live().forEach(e => damage(e, Math.max(1, e.maxHp * (ENEMIES[e.type].boss ? .05 : .1) * L), magic));
      addText(W / 2, H / 2, 'ROASTED!', '#ff7ab6', 40, -.05);
      break;
  }
  refreshInfo();
}

// ---------- Sandbox ----------
function sandboxSpawn(type, n) {
  const at = G.running ? G.waveT : 0;
  if (!G.running) { G.queue = []; G.waveT = 0; G.running = true; G.waveHp = 1; G.sbOnly = true; }
  for (let i = 0; i < n; i++) G.queue.push({type, at: at + i * .3});
  G.queue.sort((a, b) => a.at - b.at);
}

// ---------- Saving a game in progress (between waves) ----------
function saveGame() {
  if (G.mode === 'sandbox' || G.over || !G.started) return;
  const diffKey = DIFF_ORDER.find(k => DIFFS[k] === DIFF);
  store.set('widrtd_save', JSON.stringify({v: 1, mode: G.mode, map: MAP.id, diff: diffKey, rules: G.rules, elite: G.elite, stage: G.stage, crew: G.crew, challenge: G.challenge,
    mainHero: G.mainHero, wave: G.wave, cash: G.cash, lives: G.lives, freeplay: G.freeplay, pops: G.pops, runT: G.runT, xp0: G.xp0, bis0: G.bis0, when: Date.now(),
    towers: G.towers.map(t => ({type: t.type, x: t.x, y: t.y, tiers: t.tiers, target: t.target, spent: t.spent, pops: t.pops, main: t.main, hxp: t.hxp, form: t.form}))}));
}
const savedGame = () => { try { const s = JSON.parse(store.get('widrtd_save') || 'null'); return s && s.v ? s : null; } catch (e) { return null; } };
const clearSave = () => store.set('widrtd_save', '');
function loadGame(s) {
  DIFF = DIFFS[s.diff] || DIFFS.normal;
  loadMap(s.map); BG = buildBackground(MAP);
  Object.assign(G, {mode: s.mode, rules: s.rules || {}, elite: s.elite, stage: s.stage || 0, crew: s.crew, challenge: s.challenge, mainHero: s.mainHero,
    wave: s.wave, cash: s.cash, lives: s.lives, freeplay: s.freeplay, pops: s.pops || 0, banked: s.pops || 0, runT: s.runT || 0, xp0: s.xp0, bis0: s.bis0,
    running: false, queue: [], enemies: [], projs: [], fx: [], patches: [], sel: null, placing: null, over: false, won: false, started: true, paused: false, speed: 1, rallyT: 0, shake: 0, spawnAlt: 0});
  G.towers = s.towers.map(o => {
    const t = Object.assign({id: G.nextId++, cd: .2, ang: Math.PI / 2, bhT: 2, buff: 0, rangeBuff: 0, camoGiven: false, abCd: 0, boostT: 0, disabledT: 0, drones: [], mineT: 4, onWater: !!waterAt(o.x, o.y), mb: o.pops || 0}, o);
    t.s = computeStats(t); return t;
  });
  setupHazards();
}

// ---------- FX helpers ----------
function addText(x, y, txt, col, size, rot) { G.fx.push({kind: 'text', x, y, txt, col, size, rot, t: 0, life: .8}); }
// Chemmy's ball jumps to the closest enemy it hasn't hit yet
function nextPong(p) {
  let best = null, bd = p.range;
  for (const e of G.enemies) {
    if (e.dead || p.hit.has(e.id) || !canSee(p.tower, e)) continue;
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

// ---------- Update ----------
function update(dt) {
  G.t += dt; G.runT = (G.runT || 0) + dt;
  if (G.mode === 'sandbox') { G.cash = 999999; G.lives = 9999; }
  if (G.rallyT > 0) G.rallyT -= dt;
  if (G.shake > 0) G.shake -= dt;
  if (G.running) {
    G.waveT += dt;
    while (G.queue.length && G.queue[0].at <= G.waveT) spawnEnemy(G.queue.shift().type);
  }
  updateHazards(dt);
  // support auras
  for (const t of G.towers) { t.buff = 0; t.rangeBuff = 0; t.camoGiven = false; t.dmgBuff = 0; }
  for (const a of G.towers) if (a.s.aura)
    for (const t of G.towers) if (t !== a && Math.hypot(t.x - a.x, t.y - a.y) <= a.s.aura.r) {
      if (a.s.aura.rate) t.buff = Math.max(t.buff, a.s.aura.rate);
      if (a.s.aura.range) t.rangeBuff = Math.max(t.rangeBuff, a.s.aura.range);
      if (a.s.aura.camo) t.camoGiven = true;
      if (a.s.aura.dmg) t.dmgBuff = Math.max(t.dmgBuff, a.s.aura.dmg);
    }
  // enemies
  const mapSpd = (MAP.mods && MAP.mods.speed) || 1, ruleSpd = G.rules.enemySpeed || 1;
  for (const e of G.enemies) {
    if (e.dead) continue;
    const def = ENEMIES[e.type];
    e.flash -= dt;
    if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slow = 0; }
    if (def.regrow && e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + def.regrow * dt);
    if (def.heal && (e.healT -= dt) <= 0) {
      e.healT = def.heal.every;
      for (const o of G.enemies) if (!o.dead && !ENEMIES[o.type].boss && Math.hypot(o.x - e.x, o.y - e.y) < def.heal.r) o.hp = Math.min(o.maxHp, o.hp + def.heal.amt);
      G.fx.push({kind: 'ring', x: e.x, y: e.y, r: def.heal.r, t: 0, life: .5, col: '#7be36b'}); addText(e.x, e.y - 20, '+', '#7be36b', 20, 0);
    }
    if (e.shieldT > 0) e.shieldT -= dt;
    if (e.markT > 0) e.markT -= dt;
    if ((e.dnT = (e.dnT || 0) - dt) <= 0) { e.dnT = .3; if (e.dAcc) { damageNumber(e); e.dAcc = 0; } }
    if (def.special) bossSpecial(e, def, dt);
    if (e.stun > 0) e.stun -= dt;
    else {
      let nd = e.d + def.speed * DIFF.speed * mapSpd * ruleSpd * e.spdMult * (1 - e.slow) * dt;
      for (const dr of DOORS) if (dr.closed && dr.pi === e.pi && e.d <= dr.d - 12 + .5 && nd > dr.d - 12) nd = dr.d - 12;
      e.d = nd;
    }
    if (def.spawn && (e.spawnT -= dt) <= 0) {
      e.spawnT = def.spawn.every * (G.elite ? .7 : 1);
      for (let i = 0; i < def.spawn.n; i++) spawnEnemy(def.spawn.type, Math.max(0, e.d + 20 + i * 14), e.pi);
      G.fx.push({kind: 'ring', x: e.x, y: e.y, r: 60, t: 0, life: .5, col: def.color});
    }
    const p = posAt(e.d, e.pi); e.x = p.x; e.y = p.y; e.ang = p.ang;
    if (e.d >= pathOf(e.pi).len) {
      if (angelSave(e, def)) continue;
      e.dead = true; G.lives -= def.leak; sfx('leak');
      addText(Math.min(W - 40, e.x - 20), Math.min(H - 20, e.y), `-${def.leak}`, PAL.coral, 22, 0);
      if (G.lives <= 0) { G.lives = 0; G.over = true; if (G.mode === 'normal') saveBest(); clearSave(); showEnd(false); }
    }
  }
  // towers
  for (const t of G.towers) {
    const s = t.s;
    if (t.abCd > 0) t.abCd -= dt;
    if (t.overT > 0) t.overT -= dt;
    if (t.boostT > 0) t.boostT -= dt;
    if (t.disabledT > 0) { t.disabledT -= dt; continue; }
    if (s.mine && G.running && (t.mineT -= dt) <= 0) { t.mineT = s.mine.every; G.cash += s.mine.amt; addText(t.x, t.y - 34, `+$${s.mine.amt}`, PAL.sun, 14, 0); sfx('dig'); }
    const rateMult = (1 + t.buff) * (G.rallyT > 0 ? 2 : 1) * (boosting(t, 'lightning') ? 5 : boosting(t, 'shadowClones') ? 2 : 1) * (t.overT > 0 ? 3 : 1) * (t.dropT > 0 ? 1.5 : 1) * (t.boostT > 0 && t.s.ability && t.s.ability.rateBoost ? t.s.ability.rateBoost : 1);
    if (s.kind === 'drone') { updateDrones(t, dt, rateMult); continue; }
    if (HERO_SIDE[t.type]) HERO_SIDE[t.type](t, dt, rateMult);
    if (HERO_TICK[s.kind]) { HERO_TICK[s.kind](t, dt, rateMult); continue; }
    if (s.sentries) updateSentries(t, dt, rateMult);
    if (t.type === 'thomas') thomasTick(t, dt, rateMult);
    t.cd -= dt * rateMult;
    if (s.blackhole && (t.bhT -= dt) <= 0) {
      const near = G.enemies.filter(e => !e.dead && e.pi !== 'air' && inRange(t, e, 20));
      if (near.length) {
        t.bhT = s.blackhole;
        near.forEach(e => { e.d = Math.max(0, e.d - (ENEMIES[e.type].boss ? 40 : 120)); damage(e, 2, {pierceArmor: true, src: t, type: 'energy'}); });
        const c = near.reduce((a, e) => ({x: a.x + e.x / near.length, y: a.y + e.y / near.length}), {x: 0, y: 0});
        G.fx.push({kind: 'hole', x: c.x, y: c.y, r: 70, t: 0, life: .9}); addText(c.x, c.y - 40, 'BLACK HOLE', '#c7b8ff', 16, 0); sfx('boom');
      } else t.bhT = .3;
    }
    if (t.cd > 0) continue;
    if (PULSE_TYPE[s.kind]) {
      if (G.enemies.some(e => !e.dead && inRange(t, e) && (!ENEMIES[e.type].fly || s.air))) { pulse(t); t.cd = s.rate; }
      continue;
    }
    const [tg] = pickTargets(t, 1);
    if (tg) { fire(t, tg); t.cd = s.rate; }
  }
  // vines
  for (const p of G.patches) {
    p.t += dt;
    if ((p.tick -= dt) > 0) continue;
    p.tick = .5;
    const s = p.src.s, boost = boosting(p.src, 'bloom'), r = p.r * (boost ? 2 : 1);
    for (const e of G.enemies) {
      if (e.dead || e.pi === 'air' || Math.hypot(e.x - p.x, e.y - p.y) > r + ENEMIES[e.type].r * .5) continue;
      if (s.devour && !ENEMIES[e.type].boss && e.hp <= s.devour) { damage(e, e.hp + 99, {type: 'magic', src: p.src}); addText(e.x, e.y - 14, 'CHOMP', '#4fb86b', 14, 0); }
      else damage(e, s.dmg * (boost ? 3 : 1), {src: p.src, slow: s.slow, slowT: .8});
    }
  }
  G.patches = G.patches.filter(p => p.t < p.dur && G.towers.includes(p.src));
  // projectiles
  for (const p of G.projs) {
    if (p.kind === 'fruit' || p.kind === 'ball' || p.kind === 'star' || p.kind === 'nail' || p.kind === 'feather' || p.kind === 'plane' || p.kind === 'vinyl' || p.kind === 'digit' || p.kind === 'kimchi') {
      if (p.homing && !p.homing.dead) {
        const sp = Math.hypot(p.vx, p.vy), cur = Math.atan2(p.vy, p.vx), want = Math.atan2(p.homing.y - p.y, p.homing.x - p.x);
        let da = ((want - cur + Math.PI * 3) % (Math.PI * 2)) - Math.PI; da = Math.max(-9 * dt, Math.min(9 * dt, da));
        p.vx = Math.cos(cur + da) * sp; p.vy = Math.sin(cur + da) * sp; p.life = Math.max(p.life, .15);
      }
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; p.spin += dt * 12;
      if (p.life <= 0 || p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20) { p.dead = true; continue; }
      for (const e of G.enemies) {
        if (e.dead || p.hit.has(e.id)) continue;
        if (ENEMIES[e.type].fly && !p.src.s.air) continue;
        if (Math.hypot(e.x - p.x, e.y - p.y) < ENEMIES[e.type].r + 6 * p.size) {
          p.hit.add(e.id); damage(e, p.dmg, Object.assign({src: p.src}, p.opts));
          if (p.knock && !ENEMIES[e.type].boss && e.pi !== 'air') e.d = Math.max(0, e.d - p.knock);
          if (p.crit) { addText(e.x, e.y - 16, 'CRIT!', PAL.coral, 14, .1); p.crit = false; }
          if (--p.pierce <= 0) { p.dead = true; break; }
        }
      }
    } else if (p.kind === 'pong') {
      p.life -= dt;
      p.trail.push({x: p.x, y: p.y}); if (p.trail.length > 6) p.trail.shift();
      if (!p.tgt || p.tgt.dead) p.tgt = nextPong(p);
      if (!p.tgt || p.life <= 0) { p.dead = true; continue; }
      const dx = p.tgt.x - p.x, dy = p.tgt.y - p.y, dist = Math.hypot(dx, dy), step = p.spd * dt;
      if (dist <= step + ENEMIES[p.tgt.type].r * .5) {
        p.x = p.tgt.x; p.y = p.tgt.y; p.hit.add(p.tgt.id);
        damage(p.tgt, p.dmg, {stun: p.stun, src: p.tower});
        if (--p.bounces < 0) { p.dead = true; continue; }
        p.tgt = nextPong(p);
        if (!p.tgt) p.dead = true;
      } else { p.x += dx / dist * step; p.y += dy / dist * step; }
    } else if (p.kind === 'bomb') {
      p.t += dt; const k = Math.min(1, p.t / p.dur);
      p.x = p.sx + (p.tx - p.sx) * k; p.y = p.sy + (p.ty - p.sy) * k;
      if (k >= 1) {
        p.dead = true; explode(p.x, p.y, p.s.radius, p.s, p.src); sfx('boom');
        if (p.s.cluster) for (let i = 0; i < p.s.cluster; i++) { const a = i / p.s.cluster * Math.PI * 2; explode(p.x + Math.cos(a) * p.s.radius * .9, p.y + Math.sin(a) * p.s.radius * .9, p.s.radius * .55, p.s, p.src); }
        if (p.nuke) addText(p.x, p.y - 30, 'KABOOM', PAL.coral, 22, -.1);
      }
    } else if (p.kind === 'boulder') {
      // rolls back down the road towards the entrance
      p.d -= p.spd * dt; p.spin -= dt * 8;
      const q = posAt(p.d, p.pi); p.x = q.x; p.y = q.y;
      for (const e of G.enemies) {
        if (e.dead || p.hit.has(e.id) || e.pi === 'air') continue;
        if (Math.hypot(e.x - p.x, e.y - p.y) < ENEMIES[e.type].r + 12 * p.size) {
          p.hit.add(e.id); damage(e, p.dmg, {src: p.src, type: 'blast', stun: p.src.s.stun, slow: p.src.s.slow, bossMult: p.src.s.bossMult});
          if (--p.pierce <= 0) break;
        }
      }
      if (p.pierce <= 0 || p.d <= 0) { p.dead = true; G.fx.push({kind: 'boom', x: p.x, y: p.y, r: 20, t: 0, life: .3, col: '#a89c90'}); }
    }
  }
  extrasUpdate(dt);
  for (const f of G.fx) { f.t += dt; if (f.kind === 'bit' || f.kind === 'fruitbit') { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 600 * dt; f.rot += dt * 8; } }
  G.enemies = G.enemies.filter(e => !e.dead);
  G.projs = G.projs.filter(p => !p.dead);
  G.fx = G.fx.filter(f => f.t < f.life);
  if (G.fx.length > 500) G.fx.splice(0, G.fx.length - 500);
  if (G.running && !G.queue.length && !G.enemies.length && !G.over) {
    if (G.mode === 'sandbox' && G.sbOnly) G.running = false; else endWave();
  }
}
function updateDrones(t, dt, mult) {
  const s = t.s, n = s.drones;
  while (t.drones.length < n) t.drones.push({cd: Math.random() * s.rate, x: t.x, y: t.y});
  t.drones.length = n;
  t.droneA = (t.droneA || 0) + dt * 1.6;
  t.drones.forEach((d, i) => {
    const a = t.droneA + i / n * Math.PI * 2, R = 34 + (i % 2) * 10;
    d.x = t.x + Math.cos(a) * R; d.y = t.y - 8 + Math.sin(a) * R * .6;
    if ((d.cd -= dt * mult) > 0) return;
    let best = null, bd = 1e9;
    for (const e of G.enemies) { if (e.dead || !canSee(t, e) || !inRange(t, e)) continue; const dd = Math.hypot(e.x - d.x, e.y - d.y); if (dd < bd) { bd = dd; best = e; } }
    if (!best) { d.cd = .15; return; }
    damage(best, s.dmg, {src: t, type: 'energy', bossMult: s.bossMult});
    if (s.zapBlast) for (const o of G.enemies) if (o !== best && !o.dead && Math.hypot(o.x - best.x, o.y - best.y) < s.zapBlast) damage(o, s.dmg * .5, {src: t, type: 'blast'});
    G.fx.push({kind: 'tracer', x: d.x, y: d.y, x2: best.x, y2: best.y, t: 0, life: .1, col: '#5fd0d6'});
    if (s.zapBlast) G.fx.push({kind: 'boom', x: best.x, y: best.y, r: s.zapBlast * .6, t: 0, life: .2, col: PAL.sun});
    d.cd = s.rate * (.85 + Math.random() * .3);
  });
}
// Ratjetoe's sentry turrets stand in a ring around him and zap the closest enemy in range
function updateSentries(t, dt, mult) {
  const s = t.s, n = s.sentries;
  t.sentries = t.sentries || [];
  while (t.sentries.length < n) t.sentries.push({cd: Math.random() * s.sRate, ang: 0});
  t.sentries.length = n;
  t.sentries.forEach((q, i) => {
    const a = i / n * Math.PI * 2 + Math.PI / 4;
    q.x = t.x + Math.cos(a) * 38; q.y = t.y + 4 + Math.sin(a) * 24;
    if ((q.cd -= dt * mult) > 0) return;
    let best = null, bd = 1e9;
    for (const e of G.enemies) { if (e.dead || !canSee(t, e)) continue; const dd = Math.hypot(e.x - q.x, e.y - q.y); if (dd < rangeOf(t) && dd < bd) { bd = dd; best = e; } }
    if (!best) { q.cd = .15; return; }
    q.ang = Math.atan2(best.y - q.y, best.x - q.x);
    damage(best, s.sDmg, {src: t, type: 'energy'});
    G.fx.push({kind: 'tracer', x: q.x, y: q.y, x2: best.x, y2: best.y, t: 0, life: .1, col: s.sDmg >= 4 ? PAL.coral : '#5fd0d6'});
    q.cd = s.sRate;
  });
}
function bossSpecial(e, def, dt) {
  const sp = def.special, fast = G.elite ? .7 : 1;
  if (sp.kind === 'disable' && (e.specT -= dt) <= 0) {
    e.specT = sp.every * fast;
    const pool = [...G.towers].sort(() => Math.random() - .5).slice(0, sp.n + (G.elite ? 1 : 0));
    pool.forEach(t => { if (guarded(t)) { addText(t.x, t.y - 30, 'PROTECTED', '#5fd0d6', 13, 0); return; } t.disabledT = sp.dur; G.fx.push({kind: 'fireball', x: e.x, y: e.y, x2: t.x, y2: t.y, t: 0, life: .5}); setTimeout(() => { G.fx.push({kind: 'boom', x: t.x, y: t.y, r: 26, t: 0, life: .35, col: '#ff6a1f'}); addText(t.x, t.y - 30, 'BURNED', '#ff6a1f', 14, 0); }, 250); });
    if (pool.length) sfx('boom');
  }
  if (sp.kind === 'phase' && !e.phase2 && e.hp < e.maxHp * .5) {
    e.phase2 = true; e.spdMult = 1.6; e.armorBonus = 2;
    for (let i = 0; i < 4; i++) spawnEnemy('guard', Math.max(0, e.d - 20 - i * 16), e.pi);
    toast('OVERDRIVE!', "Byte's mech is faster and tougher now.");
  }
  if (sp.kind === 'shield' && (e.specT -= dt) <= 0) { e.specT = sp.every * fast; e.shieldT = sp.dur; addText(e.x, e.y - 50, 'SHIELD UP', '#9fe3ff', 16, 0); }
}
function updateHazards(dt) {
  for (const dr of DOORS) { dr.t = (dr.t || 0) + dt; const was = dr.closed; dr.closed = dr.t % 11 > 8; if (dr.closed && !was) sfx('clink'); }
  if (G.tram) {
    if (G.running && (G.tram.t -= dt) <= 0) { G.tram.t = MAP.tram.every; G.tram.x = -10; G.tram.hit = new Set(); sfx('tram'); addText(80, MAP.tram.y - 34, 'TRAM!', PAL.sun, 18, 0); }
    if (G.tram.x > -200) {
      G.tram.x += 650 * dt;
      for (const e of G.enemies) if (!e.dead && e.pi !== 'air' && !G.tram.hit.has(e.id) && Math.abs(e.y - MAP.tram.y) < 26 && e.x < G.tram.x && e.x > G.tram.x - 130) { G.tram.hit.add(e.id); damage(e, 8, {type: 'blast', pierceArmor: true}); }
      if (G.tram.x > W + 150) G.tram.x = -999;
    }
  }
  if (G.ventT !== undefined && G.running && (G.ventT -= dt) <= 0) {
    G.ventT = 14;
    MAP.vents.forEach(v => {
      G.towers.forEach(t => { if (Math.hypot(t.x - v.x, t.y - v.y) < 100 && !guarded(t)) t.disabledT = Math.max(t.disabledT, 3); });
      G.fx.push({kind: 'boom', x: v.x, y: v.y, r: 70, t: 0, life: .6, col: '#ff6a1f'});
      for (let k = 0; k < 4; k++) G.fx.push({kind: 'smoke', x: v.x + (Math.random() - .5) * 40, y: v.y, r: 14, t: 0, life: 1.2});
    });
    addText(W / 2, 40, 'ERUPTION!', '#ff6a1f', 22, 0); sfx('boom'); G.shake = .4;
  }
}

// ---------- Render ----------
function render() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (G.shake > 0 && !G.paused) { const k = G.shake * 10; ctx.translate((Math.random() - .5) * k, (Math.random() - .5) * k); }
  ctx.drawImage(BG, 0, 0, W, H);
  for (const p of G.patches) drawPatch(ctx, p, G.t);
  const showRange = G.sel ? {x: G.sel.x, y: G.sel.y, r: rangeOf(G.sel), aura: G.sel.s.aura} :
    G.placing && G.mouse.in ? {x: G.mouse.x, y: G.mouse.y, r: computeStats({type: G.placing, tiers: [0, 0, 0]}).range} : null;
  if (showRange && showRange.aura) {
    ctx.strokeStyle = 'rgba(166,92,255,.7)'; ctx.lineWidth = 2; ctx.setLineDash([3, 7]);
    ctx.beginPath(); ctx.arc(showRange.x, showRange.y, showRange.aura.r, G.t, G.t + 7); ctx.stroke(); ctx.setLineDash([]);
  }
  if (showRange && showRange.r < 1000) {
    const ok = !G.placing || validPlace(G.mouse.x, G.mouse.y);
    ctx.fillStyle = ok ? 'rgba(255,255,255,.28)' : 'rgba(255,90,78,.25)'; ctx.strokeStyle = ok ? INK : PAL.coral; ctx.lineWidth = 2.5; ctx.setLineDash([8, 6]);
    ctx.beginPath(); ctx.arc(showRange.x, showRange.y, showRange.r, 0, 7); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
  }
  drawHazards(ctx, G.t);
  const ground = G.enemies.filter(e => e.pi !== 'air').sort((a, b) => a.y - b.y);
  for (const e of ground) drawEnemy(ctx, e, G.t);
  const towersSorted = [...G.towers].sort((a, b) => a.y - b.y);
  for (const t of towersSorted) {
    if (t.onWater) sticker(ctx, () => ctx.roundRect(t.x - 26, t.y + 4, 52, 16, 6), '#c9935a', 2, 2.5);
    if (t === G.sel) { ctx.strokeStyle = PAL.sun; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(t.x, t.y + 12, 27, 13, 0, 0, 7); ctx.stroke(); }
    if (t.boostT > 0 || G.rallyT > 0) { ctx.strokeStyle = t.boostT > 0 ? PAL.sun : '#2f6fe0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(t.x, t.y + 12, 24 + Math.sin(G.t * 12) * 3, 11, 0, 0, 7); ctx.stroke(); }
    if (t.disabledT > 0) ctx.globalAlpha = .45;
    drawHeroAnimated(ctx, t);
    ctx.globalAlpha = 1;
    if (t.disabledT > 0) { ctx.font = '900 18px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('🔥', t.x, t.y - 26 + Math.sin(G.t * 8) * 2); }
    if (abilityReady(t)) { ctx.font = '900 13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(t.s.ability.icon, t.x + 20, t.y - 22 + Math.sin(G.t * 5) * 2); }
    if (t.s.kind === 'drone') t.drones.forEach(d => drawDrone(ctx, d.x, d.y, G.t));
    if (t.s.sentries && t.sentries) t.sentries.forEach(q => q.x !== undefined && drawSentry(ctx, q.x, q.y, q.ang, G.t, t.s.sDmg >= 4));
    if (t.overT > 0) { ctx.strokeStyle = "#ff8a1f"; ctx.lineWidth = 3; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.ellipse(t.x, t.y + 12, 28, 13, 0, G.t * 4, G.t * 4 + 7); ctx.stroke(); ctx.setLineDash([]); }
  }
  // flyers draw above the heroes
  extrasDraw(ctx);
  for (const e of G.enemies.filter(e => e.pi === 'air')) drawEnemy(ctx, e, G.t);
  for (const e of G.enemies) if (e.markT > 0) { ctx.font = "900 14px sans-serif"; ctx.textAlign = "center"; ctx.fillText("👁", e.x, e.y - ENEMIES[e.type].r - 16 + Math.sin(G.t * 6) * 2); }
  for (const p of G.projs) drawProjectile(ctx, p);
  for (const f of G.fx) drawFx(ctx, f);
  if (G.placing && G.mouse.in) {
    ctx.globalAlpha = validPlace(G.mouse.x, G.mouse.y) ? .85 : .4;
    if (waterAt(G.mouse.x, G.mouse.y) && TOWERS[G.placing].water) sticker(ctx, () => ctx.roundRect(G.mouse.x - 26, G.mouse.y + 4, 52, 16, 6), '#c9935a', 2, 2.5);
    drawHero(ctx, G.placing, G.mouse.x, G.mouse.y, heroSize(G.placing), Math.PI / 2, null, [0, 0, 0], G.t);
    ctx.globalAlpha = 1;
  }
}

// ---------- Loop ----------
let last = performance.now();
function loop(now) {
  let dt = Math.min(.05, (now - last) / 1000); last = now;
  if (G.started && !G.over && !G.paused) { popBudget = Math.min(6, popBudget + dt * 8); for (let i = 0; i < G.speed; i++) update(dt); }
  else G.t += dt;
  render();
  hudTick(); abilityTick();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
