// ===== WIDR TD: profile, levels, unlockables, achievements =====
// XP from waves levels you up and unlocks maps. Biscotti (🍪) from wins, events and achievements buy items in the Trophy Store.
// Every item fills one equip slot: a hero skin (slot = hero id), pads, toon, pop, tint, musicBattle or musicBoss.

const skinItem = (hero, id, name, desc, cost, s) => ({id, cat: 'Skins', slot: hero, hero, name, desc, cost, skin: s});
const STORE_ITEMS = [
  skinItem('guiseppe', 'skin_guiseppe', 'Granny Smith', 'A crisp green apple Guiseppe.', 120, {body:'#8fd14f', shade:'rgba(40,90,20,.35)'}),
  skinItem('julie', 'skin_julie', 'Film Noir', 'Grey trench coat and a black detective hat.', 120, {coat:'#6b6f7a', hat:'#2b2a33', band:'#55535e'}),
  skinItem('daniel', 'skin_daniel', 'Desert Ops', 'Sand-camo vest with an orange strap.', 120, {vest:'#c9a46a', stripe:'#ff8a1f', strap:'#ff8a1f'}),
  skinItem('daniel', 'skin_daniel_demo', 'Demolition Run', 'Hazard-yellow vest straight from the Demolition Run.', 200, {vest:'#ffcc29', stripe:'#22172b', strap:'#e8334a'}),
  skinItem('otis', 'skin_otis', 'Husky Pilot', 'A grey-and-white husky in orbit.', 160, {fur:'#a3abbd', ear:'#5d6577', patch:'#ffffff'}),
  skinItem('nathan', 'skin_nathan', 'Away Jersey', 'Red cap and a grey road uniform.', 120, {cap:'#e8222f', brim:'#b81a25', jersey:'#d9dde3', stripe:'#e8222f'}),
  skinItem('chemmy', 'skin_chemmy', 'Gold Medalist', 'Champion gold polo and a gold paddle.', 160, {polo:'#ffcc29', paddle:'#ffcc29', tie:'#2f6fe0'}),
  skinItem('chemmy', 'skin_chemmy_turbo', 'Turbo Racer', 'Red racing suit from WIDR Turbo.', 220, {polo:'#e8222f', paddle:'#22172b', tie:'#ffffff'}),
  skinItem('lars', 'skin_lars', 'Diamond Miner', 'Diamond helmet and a deep-blue tunic.', 160, {helmet:'#7fe3ff', tunic:'#3b56a0', beard:'#6b4424'}),
  skinItem('milo', 'skin_milo', 'Storm Wizard', 'A thundercloud robe with a golden hat.', 160, {robe:'#3a2a5a', hat:'#ffcc29'}),
  skinItem('josh', 'skin_josh', 'Desert Pilot', 'Sand flight jacket for long missions.', 140, {jacket:'#c9a46a'}),
  skinItem('reshman', 'skin_reshman', 'Crimson Ninja', 'Red suit and a golden headband.', 180, {suit:'#b81a25', mask:'#b81a25', band:'#ffcc29'}),
  skinItem('fionn', 'skin_fionn', 'Golden Egg', 'Purple coat and a lucky golden egg.', 160, {coat:'#7a4fd1', egg:'#ffcc29'}),
  skinItem('deniz', 'skin_deniz', 'Aurora', 'Northern-lights robe with a green hat.', 160, {robe:'#c7b8ff', hat:'#7be36b'}),
  skinItem('sichen', 'skin_sichen', 'Black Tie', 'A sharp tuxedo for the big show.', 140, {suit:'#2e2a3a', tie:'#ff7ab6'}),
  skinItem('anna', 'skin_anna', 'Autumn Harvest', 'Pumpkin-orange apron and a straw hat.', 140, {apron:'#d96a00', hat:'#ff9f1a'}),
  skinItem('ratjetoe', 'skin_ratjetoe', 'Grease Monkey', 'Green work overalls and a yellow cap.', 140, {overalls:'#5a8f5c', cap:'#ffcc29'}),
  skinItem('thomas', 'skin_thomas', 'White Tie', 'A white suit for the VIP gala.', 160, {suit:'#e9e4da', tie:'#b81a25'}),
  skinItem('jorn', 'skin_jorn', 'School Trip', 'A green hoodie and a red backpack.', 120, {hoodie:'#4fb86b', pack:'#e8334a', hair:'#3a2a22'}),
  skinItem("raaf", "skin_raaf", "Albino Raven", "A rare snow-white raven with a golden beak.", 180, {feathers:"#f2eee6", beak:"#ffcc29"}),
  skinItem("kayoyara", "skin_kayoyara", "Midnight Heist", "Two black cats in a black trenchcoat, ready for the big job.", 180, {coat:"#2b2b33", yara:"#3a3a44", kayo:"#1d1d22"}),
  skinItem("dih", "skin_dih", "Glow Worm", "A neon-green worm that lights up the tunnels.", 160, {worm:"#7be36b", worm2:"#c8ff6e"}),
  skinItem("alexander", "skin_alexander", "White Suit Don", "A cream suit and a white fedora for the boss of bosses.", 200, {suit:"#efe6d2", hat:"#f7f3ea"}),
  skinItem("stormmoeder", "skin_stormmoeder", "Sun Dragon", "Golden scales and fiery wings, a storm made of sunlight.", 260, {scales:"#d9a21a", wings:"#ff7a1f", belly:"#ffd66b", horns:"#fff3d6"}),
  skinItem("a438", "skin_a438", "Negative", "A black head with a white eye. Some say it sees the other side.", 240, {head:"#1d1a24", shade:"#0e0c12", eye:"#f4f1ea", glow:"#7fe3ff", leg:"#e9e4da", leg2:"#b8b0a0", body:"#23324f", gold:"#7fe3ff", gold2:"#3aa9d8", eye2:"#3aa9d8"}),
  skinItem("kimchi", "skin_kimchi", "Night Market", "A black chef jacket from the late-night street food stalls.", 160, {jacket:"#2b2b33"}),
  skinItem("dean", "skin_dean", "Midnight Rider", "Black hat, black shirt and a silver-grey bandana.", 180, {shirt:"#2b2b33", bandana:"#9aa3b5", hat:"#1d1d22"}),
  skinItem("maat", "skin_maat", "Fallen Angel", "A dark robe with crimson trim and silver hair.", 220, {robe:"#2e2a3a", trim:"#b81a25", hair:"#e8e8f0"}),
  skinItem("janpool", "skin_janpool", "Gold Edition", "A limited golden calculator with a blue screen.", 180, {case:"#c99a1a", screen:"#9fe3ff"}),
  skinItem("appster", "skin_appster", "Golden Monkey", "A golden monkey with gold headphones and a black DJ shirt.", 200, {fur:"#d9a64a", shirt:"#1d1d22", phones:"#ffcc29"}),
  {id:'toon_pumpkin', cat:'Skins', slot:'toon', name:'Pumpkin Toon', desc:'Toon de Demoon becomes a giant spooky pumpkin.', cost:250},
  {id:'pads_gold', cat:'Effects', slot:'pads', name:'Golden Pads', desc:'Every hero stands on a shiny gold base.', cost:300},
  {id:'pop_fruit', cat:'Effects', slot:'pop', name:'Fruit Salad Pops', desc:'Enemies burst into fruit chunks.', cost:120},
  {id:'pop_gelato', cat:'Effects', slot:'pop', name:'Gelato Splats', desc:'Enemies splat into pastel gelato.', cost:150},
  {id:'pop_notes', cat:'Effects', slot:'pop', name:'Music Notes', desc:'Every pop plays a little tune of notes.', cost:180},
  {id:'tint_night', cat:'Maps', slot:'tint', name:'Night Mode', desc:'Every map at night, under the moon.', cost:200},
  {id:'tint_autumn', cat:'Maps', slot:'tint', name:'Autumn Colours', desc:'Warm orange autumn on every map.', cost:200},
  {id:'tint_neon', cat:'Maps', slot:'tint', name:'Neon Glow', desc:'Synthwave purple and pink everywhere.', cost:260},
  {id:'music_rhyme', cat:'Music', slot:'musicBattle', name:'RhymeRhythm Beats', desc:'A laid-back hip-hop groove for every wave.', cost:180},
  {id:'music_boss', cat:'Music', slot:'musicBoss', name:'Boss Remix', desc:'A faster, heavier song for boss fights.', cost:220},
];
const STORE_CATS = ["Skins", "Effects", "Maps", "Music", "Titles"];
const ALL_ITEMS = STORE_ITEMS.concat(TRACK_ITEMS);

const ACHIEVEMENTS = [
  {id:'pop1', icon:'💥', name:'First Pop', desc:'Pop your first enemy.', reward:10, prog:p => [p.stats.pops, 1]},
  {id:'pop1k', icon:'🎯', name:'Pop Star', desc:'Pop 1,000 enemies.', reward:60, prog:p => [p.stats.pops, 1000]},
  {id:'pop10k', icon:'🌋', name:'Popocalypse', desc:'Pop 10,000 enemies.', reward:200, prog:p => [p.stats.pops, 10000]},
  {id:'wave10', icon:'🌊', name:'Getting Started', desc:'Clear wave 10 on any map.', reward:30, prog:p => [bestAny(), 10]},
  {id:'win1', icon:'🏝', name:'Defender', desc:'Beat any map on any difficulty.', reward:100, prog:p => [p.stats.wins, 1]},
  {id:'winHard', icon:'🦀', name:'Grumble Tamer', desc:'Beat any map on Grumble Mode.', reward:200, test:p => medalCount('HARD') > 0},
  {id:'winExtreme', icon:'🐙', name:'Toon Slayer', desc:'Beat any map on Toon de Demoon.', reward:500, test:p => medalCount('EXTREME') > 0},
  {id:'allMaps', icon:'🗺', name:'World Tour', desc:'Beat every map at least once.', reward:300, prog:p => [MAPS.filter(m => Object.keys(p.medals[m.id] || {}).length).length, MAPS.length]},
  {id:'abil25', icon:'⚡', name:'Signature Moves', desc:'Use 25 abilities.', reward:80, prog:p => [p.stats.abilities, 25]},
  {id:'tier3', icon:'⭐', name:'Fully Upgraded', desc:'Buy a tier 3 upgrade.', reward:40, test:p => p.flags.tier3},
  {id:'paradise', icon:'🌈', name:'Paradise Found', desc:'Buy a tier 5 Paradise upgrade.', reward:150, test:p => p.flags.paradise},
  {id:'hero10', icon:'👑', name:'Main Character', desc:'Get your main hero to level 10.', reward:100, test:p => p.flags.hero10},
  {id:'team', icon:'👥', name:'Full Squad', desc:'Have 8 different heroes on the map at once.', reward:60, test:p => p.flags.team},
  {id:'roster', icon:'📇', name:'Whole Crew', desc:'Place every hero at least once.', reward:120, prog:p => [Object.keys(p.placed || {}).length, TOWER_ORDER.length]},
  {id:'rich', icon:'💰', name:'Hundredaire x100', desc:'Hold $10,000 at once.', reward:100, test:p => p.flags.rich},
  {id:'free40', icon:'♾', name:'Endless Defender', desc:'Reach wave 40 in Freeplay.', reward:250, prog:p => [bestAny(), 40]},
  {id:'daily3', icon:'📅', name:'Daily Habit', desc:'Win the Daily Challenge 3 days in a row.', reward:120, prog:p => [p.daily.streak, 3]},
  {id:'chall4', icon:'🎟', name:'Challenger', desc:'Beat 4 challenges.', reward:100, prog:p => [Object.keys(p.challenges).length, 4]},
  {id:'challAll', icon:'🏅', name:'Challenge Champ', desc:'Beat every challenge.', reward:300, prog:p => [Object.keys(p.challenges).length, CHALLENGES.length]},
  {id:'rush', icon:'👹', name:'Boss Buster', desc:'Beat Boss Rush.', reward:120, test:p => p.rush.normal},
  {id:'rushElite', icon:'💀', name:'Elite Buster', desc:'Beat Boss Rush with elite bosses.', reward:300, test:p => p.rush.elite},
  {id:'odyssey', icon:'⛵', name:'Odyssey Complete', desc:'Finish the Odyssey.', reward:200, test:p => p.odyssey > 0},
  {id:'collector', icon:'🛍', name:'Collector', desc:'Own 3 items from the Trophy Store.', reward:50, prog:p => [Object.keys(p.owned).length, 3]},
  {id:'hoarder', icon:'🧺', name:'Hoarder', desc:'Own 12 items from the Trophy Store.', reward:200, prog:p => [Object.keys(p.owned).length, 12]},
  {id:'lv10', icon:'🎁', name:'On Track', desc:'Reach level 10 on the Season Pass.', reward:80, prog:p => [Meta.level(), 10]},
  {id:'lv30', icon:'🌟', name:'End of the Line', desc:'Reach level 30 and finish Season 1 of the Season Pass.', reward:400, prog:p => [Meta.level(), 30]},
  {id:'tier5', icon:'🌈', name:'Triple Paradise', desc:'Buy a tier 5 upgrade on all three paths (on different heroes).', reward:250, test:p => p.flags.t5p0 && p.flags.t5p1 && p.flags.t5p2},
  {id:"master5", icon:"⭐", name:"Dedicated", desc:"Get any hero to mastery level 5.", reward:100, test:p => TOWER_ORDER.some(k => masteryLevel(k) >= 5)},
  {id:"master10", icon:"💎", name:"True Master", desc:"Get any hero to Diamond mastery (level 10).", reward:300, test:p => TOWER_ORDER.some(k => masteryLevel(k) >= 10)},
  {id:"raafOmen", icon:"🪶", name:"Dark Omen", desc:"Use Raaf's Nevermore.", reward:40, test:p => p.flags.nevermore},
];

function levelInfo(xp) {
  let lv = 1, need = 200;
  while (xp >= need) { xp -= need; lv++; need = 200 + (lv - 1) * 100; }
  return {lv, into: Math.floor(xp), need};
}
const medalCount = tag => MAPS.filter(m => (Meta.p.medals[m.id] || {})[tag]).length;
const bestAny = () => Math.max(0, ...MAPS.flatMap(m => DIFF_ORDER.map(k => bestWave(m.id, DIFFS[k].tag))));
const mapUnlocked = m => Meta.level() >= m.level;
const yesterdayKey = () => { const d = new Date(Date.now() - 864e5); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };

let skinOverride = null; // used by the store preview
function skinFor(type) {
  if (skinOverride && skinOverride.hero === type) return skinOverride.skin;
  const it = ALL_ITEMS.find(i => i.id === Meta.p.equipped[type]);
  return it ? it.skin : {};
}
const goldPads = () => Meta.p.equipped.pads || null;
const TRACK_AFTER = 50; // Biscotti for every level past the end of the track
// what a level gives: its track reward plus any map that unlocks there
function trackReward(lv) {
  const r = TRACK[lv], maps = MAPS.filter(m => m.level === lv && lv > 1);
  const out = [];
  if (r && r.it) { const it = ALL_ITEMS.find(i => i.id === r.it); out.push({kind: 'item', it, text: it.name}); }
  if (r && r.bis) out.push({kind: 'bis', n: r.bis, text: `${r.bis} Biscotti`});
  if (!r && lv >= TRACK.length) out.push({kind: 'bis', n: TRACK_AFTER, text: `${TRACK_AFTER} Biscotti`});
  maps.forEach(m => out.push({kind: 'map', m, text: `Map: ${m.name}`}));
  return out;
}

const Meta = {
  p: null,
  load() {
    let saved = null;
    try { saved = JSON.parse(store.get('widrtd_profile') || 'null'); } catch (e) {}
    this.p = Object.assign({xp: 0, biscotti: 0, owned: {}, equipped: {}, stats: {pops: 0, wins: 0, abilities: 0, games: 0, waves: 0}, ach: {}, medals: {}, flags: {},
      placed: {}, challenges: {}, daily: {last: '', streak: 0}, rush: {}, odyssey: 0, mainHero: 'nathan', track: {}}, saved || {});
    this.p.track = this.p.track || {};
    this.grantTrack(true);
  },
  save() { store.set('widrtd_profile', JSON.stringify(this.p)); },
  level() { return levelInfo(this.p.xp).lv; },
  // hands out every reward up to the current level that hasn't been given yet
  grantTrack(silent) {
    const got = [];
    for (let lv = 2; lv <= this.level(); lv++) {
      if (this.p.track[lv]) continue;
      this.p.track[lv] = Date.now();
      for (const r of trackReward(lv)) {
        if (r.kind === 'bis') this.addBiscotti(r.n);
        if (r.kind === 'item') { this.p.owned[r.it.id] = true; if (r.it.slot === 'title') this.p.equipped.title = r.it.id; }
        if (r.kind !== 'map') got.push(r.text);
      }
    }
    if (got.length) { this.save(); if (!silent) notify('🎟 SEASON PASS', got.join(' · ')); }
  },
  addXP(n) {
    const before = this.level();
    this.p.xp += Math.round(n);
    const after = this.level();
    if (after > before) {
      const maps = MAPS.filter(m => m.level > before && m.level <= after).map(m => m.name);
      notify(`LEVEL ${after}!`, maps.length ? `New map unlocked: ${maps.join(', ')}` : 'Keep popping.');
      setTimeout(() => this.grantTrack(false), 1600);
    }
  },
  addBiscotti(n) { this.p.biscotti += n; },
  // banks this run's pops into the career total
  bank() { if (G.pops > (G.banked || 0)) { this.p.stats.pops += G.pops - (G.banked || 0); G.banked = G.pops; } },
  // biscotti for winning a special mode; returns the reward line shown on the end screen
  modeWin() {
    const p = this.p;
    switch (G.mode) {
      case 'challenge': {
        const c = CHALLENGES.find(c => c.id === G.challenge);
        if (!c) return '';
        if (p.challenges[c.id]) { this.addBiscotti(20); return `Challenge replayed: +20 🍪`; }
        p.challenges[c.id] = Date.now(); this.addBiscotti(c.reward); return `Challenge beaten: +${c.reward} 🍪`;
      }
      case 'daily': {
        const key = todayKey();
        if (p.daily.last === key) return 'Daily already claimed today. Come back tomorrow!';
        p.daily.streak = p.daily.last === yesterdayKey() ? p.daily.streak + 1 : 1; p.daily.last = key;
        const r = 150 + Math.min(p.daily.streak - 1, 6) * 25;
        this.addBiscotti(r); return `Daily won! Streak ${p.daily.streak} · +${r} 🍪`;
      }
      case 'bossrush': {
        const k = G.elite ? 'elite' : 'normal', first = !p.rush[k], t = Math.round(G.runT || 0);
        const best = p.rush[k + 'Time'], r = first ? (G.elite ? 400 : 200) : 40;
        p.rush[k] = true; if (!best || t < best) p.rush[k + 'Time'] = t;
        this.addBiscotti(r); return `Boss Rush ${G.elite ? 'Elite ' : ''}cleared in ${fmtTime(t)}${!best || t < best ? ' (new best!)' : ''} · +${r} 🍪`;
      }
      case 'odyssey': { const r = p.odyssey ? 80 : 300; p.odyssey++; this.addBiscotti(r); return `Odyssey complete! +${r} 🍪`; }
    }
    return '';
  },
  event(kind, arg) {
    if (G.mode === 'sandbox') return;
    const p = this.p;
    switch (kind) {
      case 'start': p.stats.games++; G.banked = G.banked || 0; break;
      case 'wave':
        this.bank(); p.stats.waves++;
        this.addXP((15 + Math.min(G.wave, 40) * 3) * DIFF.xp); this.addBiscotti(1);
        if (G.cash >= 10000) p.flags.rich = true;
        break;
      case 'win':
        this.bank(); p.stats.wins++;
        if (G.mode === 'normal') { (p.medals[MAP.id] = p.medals[MAP.id] || {})[DIFF.tag] = true; this.addBiscotti(DIFF.reward); G.rewardLine = `+${DIFF.reward} 🍪`; }
        else G.rewardLine = this.modeWin();
        this.addXP(300 * DIFF.xp);
        break;
      case 'lose': this.bank(); break;
      case 'ability': p.stats.abilities++; break;
      case 'upgrade': if (arg.tiers.some(v => v >= 3)) p.flags.tier3 = true; arg.tiers.forEach((v, i) => { if (v >= 5) { p.flags.paradise = true; p.flags['t5p' + i] = true; } }); break;
      case 'herolevel': if (arg >= 10) p.flags.hero10 = true; break;
      case 'place':
        G.towers.forEach(t => p.placed[t.type] = true);
        if (new Set(G.towers.map(t => t.type)).size >= 8) p.flags.team = true;
        break;
    }
    this.check();
    if (kind !== 'ability' && kind !== 'upgrade') this.save();
  },
  check() {
    for (const a of ACHIEVEMENTS) {
      if (this.p.ach[a.id]) continue;
      const done = a.test ? a.test(this.p) : (([c, g]) => c >= g)(a.prog(this.p));
      if (done) { this.p.ach[a.id] = Date.now(); this.addBiscotti(a.reward); notify(`🏆 ${a.name}`, `${a.desc} +${a.reward} 🍪`); this.save(); }
    }
  },
  buy(item) {
    if (this.p.owned[item.id] || this.p.biscotti < item.cost) return false;
    this.p.biscotti -= item.cost; this.p.owned[item.id] = true;
    this.equip(item, true); this.check(); this.save(); return true;
  },
  equip(item, on) {
    this.p.equipped[item.slot] = on ? item.id : null;
    if (item.slot === 'tint') BG = buildBackground(MAP);
    if (item.cat === 'Music' && Music.song) { Music.song = null; Music.play(Music.want || 'menu'); }
    this.save();
  },
  equipped(item) { return this.p.equipped[item.slot] === item.id; },
};
const fmtTime = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
Meta.load();
