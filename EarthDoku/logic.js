// ---------- data ----------
const GAMES = {
  M1: {l:"Mother", full:"Mother / EarthBound Beginnings", short:"M1"},
  EB: {l:"EarthBound", full:"EarthBound", short:"EB"},
  M3: {l:"Mother 3", full:"Mother 3", short:"M3"}
};
const toEnemy = g => r => ({
  id: g + ":" + r[0], game: g,
  name: r[0], hp: r[1], pp: r[2], off: r[3], def: r[4], spd: r[5],
  regions: r[6] ? r[6].split("|") : [], kinds: r[7].split("|"), boss: !!r[8]
});
const ALL = [...RAW_M1.map(toEnemy("M1")), ...RAW.map(toEnemy("EB")), ...RAW_M3.map(toEnemy("M3"))];
const BY_ID = new Map(ALL.map(e => [e.id, e]));
// names that show up in more than one game (Starman, Mr. Batty, Zombie Dog...)
const NAME_GAMES = {};
ALL.forEach(e => (NAME_GAMES[e.name] = NAME_GAMES[e.name] || new Set()).add(e.game));
const multiGame = e => NAME_GAMES[e.name].size > 1;

const KINDS = {
  Human:   {e:"🧑", l:"Human"},
  Animal:  {e:"🐾", l:"Animal"},
  Bug:     {e:"🐜", l:"Bug & Arachnid"},
  Plant:   {e:"🍄", l:"Plant & Fungus"},
  Machine: {e:"🤖", l:"Machine & Robot"},
  Alien:   {e:"👽", l:"Alien & Starmen"},
  Ghost:   {e:"👻", l:"Ghost & Undead"},
  Object:  {e:"🎲", l:"Living Object"},
  Weird:   {e:"🌀", l:"Weird & Abstract"}
};

const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const firstLetter = e => e.name.replace(/^[^A-Za-z]+/, "")[0].toUpperCase();
const wordCount = e => e.name.trim().split(/\s+/).length;
const has = v => v !== null && v !== undefined;

// ---------- criteria ----------
// A "world" is the set of enemies a grid draws from (all games for the daily, or a practice subset).
function buildWorld(games) {
  const list = ALL.filter(e => games.includes(e.game));
  const pool = [];
  const regionCounts = {}, regionGames = {};
  list.forEach(e => e.regions.forEach(r => {
    const k = e.game + "|" + r;
    regionCounts[k] = (regionCounts[k] || 0) + 1;
    (regionGames[r] = regionGames[r] || new Set()).add(e.game);
  }));
  Object.entries(regionCounts).filter(([, n]) => n >= 4).forEach(([k]) => {
    const [g, r] = k.split("|");
    // Magicant and Saturn Valley exist in more than one game, so name the game when it's ambiguous
    const lb = regionGames[r].size > 1 ? `${r} (${GAMES[g].l})` : r;
    pool.push({id:"r:" + k, fam:"region", w:3, ic:"📍", sub:"Found in", lb, test:e => e.game === g && e.regions.includes(r)});
  });
  Object.entries(KINDS).forEach(([k, v]) =>
    pool.push({id:"k:" + k, fam:"kind", w:3, ic:v.e, sub:"Kind", lb:v.l, test:e => e.kinds.includes(k)}));
  if (games.length > 1) {
    games.forEach(g => pool.push({id:"g:" + g, fam:"game", w:1.5, ic:"🎮", sub:"Appears in", lb:GAMES[g].l, test:e => e.game === g}));
    pool.push({id:"multi", fam:"multi", w:.6, ic:"🔁", sub:"Name", lb:"Used in 2+ games", test:multiGame});
  }
  const S = (id, fam, ic, lb, test) => pool.push({id, fam, w:1, ic, sub:"Stat", lb, test});
  S("hp500","hp","❤️","HP 500+", e => has(e.hp) && e.hp >= 500);
  S("hp100","hp","❤️","HP under 100", e => has(e.hp) && e.hp < 100);
  S("pp","pp","✨","Has PP", e => has(e.pp) && e.pp > 0);
  S("nopp","pp","✨","Zero PP", e => e.pp === 0);
  S("spd30","spd","💨","Speed 30+", e => has(e.spd) && e.spd >= 30);
  S("spd10","spd","💨","Speed 10 or less", e => has(e.spd) && e.spd <= 10);
  S("off100","off","⚔️","Offense 100+", e => has(e.off) && e.off >= 100);
  S("off30","off","⚔️","Offense 30 or less", e => has(e.off) && e.off <= 30);
  S("def150","def","🛡️","Defense 150+", e => has(e.def) && e.def >= 150);
  S("def30","def","🛡️","Defense 30 or less", e => has(e.def) && e.def <= 30);
  const letters = {};
  list.forEach(e => { const L = firstLetter(e); letters[L] = (letters[L] || 0) + 1; });
  Object.entries(letters).filter(([, n]) => n >= 6).forEach(([L]) =>
    pool.push({id:"l:" + L, fam:"letter", w:.35, ic:"🔤", sub:"Name", lb:`Starts with “${L}”`, test:e => firstLetter(e) === L}));
  pool.push({id:"w3", fam:"words", w:1, ic:"📜", sub:"Name", lb:"3+ words", test:e => wordCount(e) >= 3});
  pool.push({id:"w1", fam:"words", w:1, ic:"📜", sub:"Name", lb:"One word", test:e => wordCount(e) === 1});
  pool.push({id:"punc", fam:"punc", w:1, ic:"❗", sub:"Name has", lb:"' ! . or -", test:e => /['!.\-]/.test(e.name)});
  pool.push({id:"boss", fam:"boss", w:1.5, ic:"👑", sub:"Role", lb:"Boss", test:e => e.boss});
  return {games, list, pool, crit:new Map(pool.map(c => [c.id, c]))};
}

// ---------- seeded generator ----------
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function hashStr(s) {
  let x = 2166136261;
  for (const ch of s) { x ^= ch.charCodeAt(0); x = Math.imul(x, 16777619); }
  return x >>> 0;
}
const FAM_LIMIT = {region:2, kind:2};

function weightedPick(pool, rng) {
  const total = pool.reduce((s, c) => s + c.w, 0);
  let r = rng() * total;
  for (const c of pool) { r -= c.w; if (r <= 0) return c; }
  return pool[pool.length - 1];
}

function answersFor(world, r, c) { return world.list.filter(e => r.test(e) && c.test(e)); }

function hasMatching(lists) {
  const order = lists.map((l, i) => i).sort((a, b) => lists[a].length - lists[b].length);
  const used = new Set();
  const go = k => {
    if (k === order.length) return true;
    for (const e of lists[order[k]]) {
      if (used.has(e.id)) continue;
      used.add(e.id);
      if (go(k + 1)) return true;
      used.delete(e.id);
    }
    return false;
  };
  return go(0);
}

function generate(seed, world) {
  const rng = mulberry32(seed);
  for (let attempt = 0; attempt < 40000; attempt++) {
    const picks = [], fam = {};
    for (let tries = 0; picks.length < 6 && tries < 300; tries++) {
      const c = weightedPick(world.pool, rng);
      if (picks.includes(c)) continue;
      if ((fam[c.fam] || 0) >= (FAM_LIMIT[c.fam] || 1)) continue;
      picks.push(c); fam[c.fam] = (fam[c.fam] || 0) + 1;
    }
    if (picks.length < 6) continue;
    // keep at least one place clue and one kind clue so it feels like the games, not a stats quiz
    if (!fam.region || !fam.kind) continue;
    const rows = picks.slice(0, 3), cols = picks.slice(3);
    const lists = [];
    let ok = true;
    for (const r of rows) for (const c of cols) {
      const l = answersFor(world, r, c);
      if (l.length < 2) { ok = false; break; }
      lists.push(l);
    }
    if (!ok || !hasMatching(lists)) continue;
    return {rows:rows.map(c => c.id), cols:cols.map(c => c.id)};
  }
  return null;
}
