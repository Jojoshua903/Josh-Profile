// ---------- battle sprites (WikiBound CDN) ----------
// WikiBound notes that LoneWolf.gif is also the Silver Wolf's battle sprite.
SPRITE_FILES["M1:Silver Wolf"] = "LoneWolf.gif";

// Sprites that aren't in WikiBound's battle sprite galleries, linked straight from their file pages
// (WikiBound, plus the EarthBound Wiki for the Fierce Pork Trooper). Tiny Li'l Ghost is invisible
// in battle, so it has no sprite anywhere and keeps its emoji.
const SPRITE_URLS = {
  "EB:Marauder Octobot":"https://cdn.wikibound.info/f/f0/MarauderOctobot.png",
  "EB:Mechanical Octobot":"https://cdn.wikibound.info/d/d7/MechanicalOctobot.png",
  "EB:Red Antoid":"https://cdn.wikibound.info/c/c6/RedAntoid.png",
  "EB:Starman":"https://cdn.wikibound.info/d/d8/StarmanEB.png",
  "EB:Carbon Dog":"https://cdn.wikibound.info/8/84/Carbondog.png",
  "EB:Kraken":"https://cdn.wikibound.info/d/d3/Kraken.png",
  "EB:Ness's Nightmare":"https://cdn.wikibound.info/4/4e/Ness%27s_Nightmare.png",
  "EB:Giygas":"https://cdn.wikibound.info/c/c9/Giygas.png",
  "M3:Fierce Pork Trooper":"https://static.wikia.nocookie.net/earthbound/images/b/be/Fierce_Pork_Trooper_battle.png/revision/latest?cb=20081119235728"
};

function spriteUrl(e) {
  if (SPRITE_URLS[e.id]) return SPRITE_URLS[e.id];
  const file = SPRITE_FILES[e.id];
  if (!file) return null;
  const key = file.replace(/ /g, "_"), dir = SPRITE_DIRS[key];
  if (!dir) return null;
  return "https://cdn.wikibound.info/" + dir + "/" + key.replace(/!/g, "%21").replace(/'/g, "%27");
}
// sprite with the kind emoji as a fallback if there's no file or it fails to load
function spriteHTML(e, cls = "") {
  const url = spriteUrl(e), fb = `<span class="fb" aria-hidden="true">${KINDS[e.kinds[0]].e}</span>`;
  return url
    ? `<span class="sp ${cls}"><img src="${url}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.parentNode.classList.add('noimg')">${fb}</span>`
    : `<span class="sp noimg ${cls}">${fb}</span>`;
}

// ---------- collection: every enemy you've ever placed correctly ----------
const COLL_KEY = "earthdoku-collection";
const collection = (() => {
  let c;
  try { c = JSON.parse(localStorage.getItem(COLL_KEY)) || {}; } catch { c = {}; }
  // back-fill from daily grids played before collecting existed
  try {
    for (let k = 0; k < localStorage.length; k++) {
      const key = localStorage.key(k);
      if (!/^earthdoku3-\d{4}-\d\d-\d\d$/.test(key)) continue;
      const g = JSON.parse(localStorage.getItem(key));
      (g && g.cells || []).forEach(id => { if (id && BY_ID.has(id) && !c[id]) c[id] = key.slice(11); });
    }
  } catch {}
  return c;
})();
function saveCollection() { try { localStorage.setItem(COLL_KEY, JSON.stringify(collection)); } catch {} }
const isCollected = e => !!collection[e.id];
// returns true when the enemy is new to the collection
function collect(e, day) {
  if (collection[e.id]) return false;
  collection[e.id] = day; saveCollection(); return true;
}
function collectionStats() {
  const by = {};
  ["M1", "EB", "M3"].forEach(g => by[g] = {have:0, total:0});
  ALL.forEach(e => { by[e.game].total++; if (collection[e.id]) by[e.game].have++; });
  const have = Object.values(by).reduce((s, x) => s + x.have, 0);
  return {have, total:ALL.length, by};
}

// ---------- stat percentiles within each game (games use different scales) ----------
const STATS = [["hp", "HP"], ["pp", "PP"], ["off", "Offense"], ["def", "Defense"], ["spd", "Speed"]];
const STAT_SORTED = {};
["M1", "EB", "M3"].forEach(g => {
  STAT_SORTED[g] = {};
  STATS.forEach(([s]) => STAT_SORTED[g][s] = ALL.filter(e => e.game === g && has(e[s])).map(e => e[s]).sort((a, b) => a - b));
});
// share of same-game enemies with a strictly lower value
function percentile(e, s) {
  const arr = STAT_SORTED[e.game][s];
  if (!has(e[s]) || !arr.length) return null;
  let lo = 0, hi = arr.length;
  while (lo < hi) { const m = (lo + hi) >> 1; arr[m] < e[s] ? lo = m + 1 : hi = m; }
  return Math.round(lo / arr.length * 100);
}

// ---------- enemy of the day ----------
function enemyOfTheDay(dayKey) {
  const pool = ALL.filter(e => spriteUrl(e));
  return pool[hashStr("eotd-" + dayKey) % pool.length];
}
