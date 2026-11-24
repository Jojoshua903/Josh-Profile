// ---------- Map Guessr: find where a zoomed-in crop sits on the full maps ----------
const GEO_ROUNDS = 5, GEO_MAX = 5000, HINT_COST = .8, GAME_HINT_COST = .9, STEP = 16;
const mapById = id => MAPS.find(m => m.id === id);
// both hints stack: 🎮 which game (−10%), 🔍 wider view or enemy name (−20%)
const hintMult = r => (r.hint ? HINT_COST : 1) * (r.hintG ? GAME_HINT_COST : 1);
const hintNote = r => [r.hintG && "game", r.hint && (r.enemy ? "name" : "zoom")].filter(Boolean).join(" + ");
const steps = d => Math.max(1, Math.round(d / STEP));
const stepsTxt = d => d == null ? "" : d <= 0 ? "dead on" : `${steps(d).toLocaleString()} step${steps(d) === 1 ? "" : "s"} off`;
const cropFor = m => Math.round(Math.min(160, Math.min(m.w, m.h) * .35));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

let geo = null;                                       // the current run
const mv = {map:null, ready:false, k:1, tx:0, ty:0, fit:1, pin:null}; // map viewer
const found = new Set();                              // maps opened by name this round
const roam = {on:false, back:null, game:"all", q:"", only:false};  // free roam: browse any map and see who lives there

// ---------- images ----------
// Try a CORS load first so crops can be checked for blank areas; fall back to a plain load.
const imgCache = {};
const setSize = (m, img) => { m.w = img.naturalWidth; m.h = img.naturalHeight; };
function loadImg(m) {
  if (imgCache[m.id]) return imgCache[m.id];
  return imgCache[m.id] = new Promise(res => {
    const a = new Image();
    a.crossOrigin = "anonymous";
    a.onload = () => { setSize(m, a); res({img:a, cors:true}); };
    a.onerror = () => {
      const b = new Image();
      b.onload = () => { setSize(m, b); res({img:b, cors:false}); };
      b.onerror = () => { delete imgCache[m.id]; res(null); };
      b.src = m.url;
    };
    a.src = m.url;
  });
}

// pick a spot that isn't empty black space or a flat wall of one color
async function pickSpot(m, rng) {
  const r = await loadImg(m);
  if (!r) return null;
  const crop = cropFor(m);
  const cand = () => ({x:Math.round(crop / 2 + rng() * (m.w - crop)), y:Math.round(crop / 2 + rng() * (m.h - crop))});
  let ctx = null;
  if (r && r.cors) {
    try {
      const c = document.createElement("canvas"); c.width = c.height = 24;
      ctx = c.getContext("2d", {willReadFrequently:true});
      ctx.drawImage(r.img, 0, 0, 1, 1); ctx.getImageData(0, 0, 1, 1);
    } catch { ctx = null; }
  }
  if (!ctx) return {...cand(), crop};
  let best = null, bestS = -1;
  for (let t = 0; t < 40; t++) {
    const p = cand();
    ctx.clearRect(0, 0, 24, 24);
    ctx.drawImage(r.img, p.x - crop / 2, p.y - crop / 2, crop, crop, 0, 0, 24, 24);
    const d = ctx.getImageData(0, 0, 24, 24).data, n = d.length / 4, cols = new Set();
    let sum = 0, sq = 0, dark = 0;
    for (let i = 0; i < d.length; i += 4) {
      const l = d[i + 3] < 20 ? 0 : d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11;
      sum += l; sq += l * l; if (l < 14) dark++;
      cols.add((d[i] >> 5) << 6 | (d[i + 1] >> 5) << 3 | d[i + 2] >> 5);
    }
    const sd = Math.sqrt(Math.max(0, sq / n - (sum / n) ** 2));
    const s = sd * (1 - dark / n) * Math.min(cols.size, 20) / 20;
    if (sd > 22 && dark / n < .35 && cols.size >= 6) return {...p, crop};
    if (s > bestS) { bestS = s; best = p; }
  }
  return {...best, crop};
}

// ---------- runs ----------
// daily: 5 places, same for everyone, saved · practice: 5 random places
// streak: random places until a wrong map · enemy: see a sprite, find a map where it lives
const MODE_LABEL = {daily:"Daily", practice:"Practice", streak:"🔥 Streak", enemy:"👾 Enemy Guessr"};
const BEST_KEY = "earthdoku-geo-best";
const geoSave = () => geo.key && store.set(geo.key, geo);
const geoPhase = () => !geo ? "none" : geo.res[geo.i] ? "reveal" : "guess";
const isEnemyRound = r => !!r.enemy;
const rightMap = (r, pick) => isEnemyRound(r) ? r.maps.includes(pick) : pick === r.map;
const streakLen = () => geo.res.filter((x, i) => x && !x.skipped && rightMap(geo.rounds[i], x.pick)).length;
const bestStreak = () => store.get(BEST_KEY) | 0;

// enemies with a sprite that live somewhere we have a map of
const enemyMaps = e => MAPS.filter(m => m.area && m.game === e.game && e.regions.includes(m.area));
let ENEMY_POOL = null;
const enemyPool = () => ENEMY_POOL || (ENEMY_POOL = ALL.filter(e => spriteUrl(e) && enemyMaps(e).length));
const placeRound = m => ({map:m.id});
const enemyRound = e => { const ms = enemyMaps(e); return {enemy:e.id, maps:ms.map(m => m.id), map:ms[0].id}; };
const roundGame = r => r.enemy ? BY_ID.get(r.enemy).game : mapById(r.map).game;
const curRound = () => geo && geo.rounds[geo.i];

function newGeo(mode, seed) {
  // where enemies live is a "Found in" spoiler, so this mode waits for today's grid like the enemy list
  if (mode === "enemy" && !listUnlocked) {
    geoSay("• 🔒 Enemy Guessr opens once today's grid is finished, since it shows where enemies live.");
    return;
  }
  const rng = mulberry32(seed);
  const shuffle = arr => arr.map(v => [rng(), v]).sort((a, b) => a[0] - b[0]).map(p => p[1]);
  let rounds;
  if (mode === "daily") {
    // the daily run always visits every game: 2 Mother, 2 EarthBound, 1 Mother 3
    const quota = {M1:2, EB:2, M3:1};
    rounds = shuffle(ALL_GAMES.flatMap(g => shuffle(MAPS.filter(m => m.game === g)).slice(0, quota[g]))).map(placeRound);
  } else if (mode === "enemy") rounds = shuffle(enemyPool()).slice(0, GEO_ROUNDS).map(enemyRound);
  else if (mode === "streak") rounds = [placeRound(shuffle(MAPS)[0])];
  else rounds = shuffle(MAPS).slice(0, GEO_ROUNDS).map(placeRound);
  const key = mode === "daily" ? "earthdoku-geo-" + todayKey() : null;
  const fresh = {key, mode, seed, rounds, i:0, res:[], done:false};
  const saved = key && store.get(key);
  // keep a saved daily run even if the map list changed since, as long as its maps still exist
  const same = saved && saved.seed === seed && Array.isArray(saved.rounds) && Array.isArray(saved.res) &&
    saved.rounds.length && saved.rounds.every(r => mapById(r.map));
  geo = same ? saved : fresh;
  geo.mode = geo.mode || mode;
  geo.i = clamp(geo.i | 0, 0, geo.rounds.length - 1);
  $("#geoDaily").hidden = mode === "daily";
  $("#geoShare").hidden = !geo.done;
  $("#geoHere").hidden = true;
  geoRound();
}
const startGeoDaily = () => newGeo("daily", hashStr("earthdoku-geo" + todayKey()));

async function geoRound() {
  const run = geo, r = geo.rounds[geo.i], m = mapById(r.map), enemy = isEnemyRound(r);
  drawGeoBar();
  $("#geoRound").textContent = `${MODE_LABEL[run.mode]} · Round ${run.i + 1}${run.mode === "streak" ? "" : "/" + run.rounds.length}`;
  $("#geoHint").textContent = enemy ? "🔍 Name" : "🔍 Zoom out";
  $("#geoHint").title = enemy ? "Show the enemy's name for −20% (Z)" : "Show a wider view for −20% (Z)";
  $("#geoClue").style.backgroundImage = "";
  $("#geoClueE").innerHTML = "";
  $("#geoClueMsg").hidden = false;
  $("#geoClueMsg").textContent = "Loading the clue…";
  $("#geoHint").disabled = $("#geoHintG").disabled = $("#geoGuess").disabled = true;
  $("#geoNext").hidden = true;
  hideResult(); drawPip();
  if (!enemy) {
    if (r.x == null) {
      Object.assign(r, await pickSpot(m, mulberry32(hashStr(run.seed + "/" + run.i))));
      if (run !== geo) return;   // a new run started while this one was loading
      geoSave();
    }
    const ok = await loadImg(m);
    if (run !== geo) return;
    if (!ok) {
      $("#geoClueMsg").textContent = "This map image didn't load. Skip the round to keep going.";
      $("#geoNext").hidden = false; $("#geoNext").textContent = "Skip round ▶";
      $("#geoNext").onclick = () => { geo.res[geo.i] = {pick:null, score:0, d:null, skipped:true}; geoSave(); nextRound(); };
      return;
    }
  }
  $("#geoClueMsg").hidden = true;
  drawClue();
  $("#geoNext").onclick = nextRound;
  if (geoPhase() === "reveal") reveal(true);
  else {
    // every round starts with the viewer closed: maps have to be found by name again
    mv.pin = null;
    // a round that finishes loading while you roam leaves your map open; it closes when you go back
    found.clear(); fogReset(); if (roam.on) roam.back = null; else closeMap(); drawFound();
    const first = geo.i === 0 && !geo.res.length;
    geoSay(enemy
      ? (first ? "• Where does this enemy live? Name a place to open its map, drop a pin anywhere on it and press Guess. Any map it appears on counts."
               : "• Next enemy! Which map is it found on?")
      : first ? "• Somewhere in these games is the spot on the left. Type the name of a place to open its map, drag to pan, scroll or pinch to zoom, then click to drop your pin."
              : geo.mode === "streak" ? `• 🔥 ${streakLen()} in a row! Keep it going: name the place and pin the spot.`
              : "• New clue! Name the place, find the spot and drop your pin.");
    $("#geoHint").disabled = !!r.hint;
    $("#geoHintG").disabled = !!r.hintG;
    drawOver(); updateGuessBtn();
  }
}

// the clue is painted as a crop of the full map; the same crop can float over the viewer
function paintCrop(box, r, m) {
  const c = r.hint ? Math.min(Math.round(r.crop * 2.2), m.w, m.h) : r.crop;
  const cx = clamp(r.x, c / 2, m.w - c / 2), cy = clamp(r.y, c / 2, m.h - c / 2);
  const s = box.clientWidth / c;
  box.style.backgroundImage = `url("${m.url}")`;
  box.style.backgroundSize = `${m.w * s}px ${m.h * s}px`;
  box.style.backgroundPosition = `${-(cx - c / 2) * s}px ${-(cy - c / 2) * s}px`;
}
function drawClue() {
  const r = geo.rounds[geo.i], box = $("#geoClue");
  const shown = r.hintG || geoPhase() === "reveal";
  $("#geoClueTag").innerHTML = shown ? `🎮 ${GAMES[roundGame(r)].l}` : "";
  if (isEnemyRound(r)) {
    const e = BY_ID.get(r.enemy), named = r.hint || geoPhase() === "reveal";
    box.classList.add("enemyClue");
    box.style.backgroundImage = "";
    box.setAttribute("aria-label", named ? `${e.name}: find where it lives` : "An enemy: find where it lives");
    $("#geoClueE").innerHTML = spriteHTML(e, "big") + (named ? `<span class="clueName">${e.name}</span>` : "");
    drawPip();
    return;
  }
  box.classList.remove("enemyClue");
  box.setAttribute("aria-label", "Zoomed-in piece of a map to find");
  $("#geoClueE").innerHTML = "";
  paintCrop(box, r, mapById(r.map));
  drawPip();
}

// 📌 floating copy of the clue in the corner of the map, so you can compare while you pan
const PIP_KEY = "earthdoku-geo-pip";
let pipOn = !!store.get(PIP_KEY);
function drawPip() {
  const el = $("#geoPip"), r = curRound();
  $("#geoPipBtn").classList.toggle("on", pipOn);
  $("#geoPipBtn").setAttribute("aria-pressed", pipOn);
  const show = pipOn && r && !isEnemyRound(r) && r.x != null && geoPhase() === "guess" && !roam.on && $("#geoClueMsg").hidden;
  el.hidden = !show;
  if (show) paintCrop(el, r, mapById(r.map));
}
function setPip(on) { pipOn = on; store.set(PIP_KEY, on); drawPip(); }

function geoSay(t) { $("#geoSay").textContent = t; }

function scoreGuess(r, pickId, gx, gy) {
  const m = mapById(r.map), p = mapById(pickId);
  let s, d = null;
  if (isEnemyRound(r)) s = r.maps.includes(pickId) ? GEO_MAX : p.game === m.game ? 500 : 0;
  else if (pickId !== r.map) s = p.game === m.game ? 500 : 0;
  else {
    d = Math.round(Math.hypot(gx - r.x, gy - r.y));
    const diag = Math.hypot(m.w, m.h);
    // inside the clue square is perfect; after that it fades, but the right map is always worth 1500+
    s = d <= r.crop / 2 ? GEO_MAX : Math.round(1500 + 3500 * Math.exp(-(d - r.crop / 2) / (diag * .1)));
  }
  if (r.hint || r.hintG) s = Math.round(s * hintMult(r));
  return {score:s, d};
}

const geoTotal = () => geo.res.reduce((s, x) => s + (x ? x.score : 0), 0);
const geoEmoji = s => s >= 4000 ? "🟩" : s >= 1500 ? "🟨" : s > 0 ? "🟧" : "🟥";

function drawGeoBar() {
  $("#geoBar").innerHTML = geo.mode === "streak"
    ? `<span class="streakN">🔥 ${streakLen()} in a row · best ${Math.max(bestStreak(), streakLen())}</span>`
    : geo.rounds.map((r, i) => {
        const x = geo.res[i];
        return `<span class="gbx${i === geo.i ? " cur" : ""}${x ? "" : " todo"}" title="Round ${i + 1}${x ? ": " + x.score.toLocaleString() + " pts" : ""}">${x ? geoEmoji(x.score) : i + 1}</span>`;
      }).join("");
  $("#geoTotal").textContent = `${geoTotal().toLocaleString()} pts`;
}

function makeGuess() {
  if (geoPhase() !== "guess" || !mv.pin) return;
  const r = geo.rounds[geo.i];
  geo.res[geo.i] = {pick:mv.pin.map, gx:Math.round(mv.pin.x), gy:Math.round(mv.pin.y), fog:fog.on, ...scoreGuess(r, mv.pin.map, mv.pin.x, mv.pin.y)};
  const res = geo.res[geo.i], right = rightMap(r, res.pick);
  if (window.shopMapCash) res.cash = shopMapCash(res.score, geo.mode !== "daily", fog.on);
  if (geo.mode === "streak") {
    if (!right) geo.done = true;
    if (streakLen() > bestStreak()) store.set(BEST_KEY, streakLen());
  } else if (geo.i === geo.rounds.length - 1) geo.done = true;
  geoSave();
  if (geo.done && window.checkAch) checkAch();
  reveal(false);
}

function reveal(restoring) {
  const r = geo.rounds[geo.i], m = mapById(r.map), x = geo.res[geo.i], enemy = isEnemyRound(r);
  drawGeoBar();
  drawClue();
  $("#geoHint").disabled = $("#geoHintG").disabled = $("#geoGuess").disabled = true;
  $("#geoNext").hidden = false;
  $("#geoNext").textContent = geo.done && geo.i === geo.rounds.length - 1 ? "See results ▶" : "Next round ▶";
  const where = `${m.name} (${GAMES[m.game].l})`, p = x.pick && mapById(x.pick);
  let msg;
  if (x.skipped) msg = `• Round skipped. It was ${where}.`;
  else if (enemy) {
    const e = BY_ID.get(r.enemy), homes = r.maps.map(id => mapById(id).name).join(" / ");
    msg = rightMap(r, x.pick) ? `• SMAAAASH!! ${e.name} lives in ${p.name}! +${x.score.toLocaleString()}`
      : `• ${e.name} lives in ${homes} (${GAMES[e.game].l}). You picked ${p.name}. +${x.score}`;
  } else if (x.pick === r.map) msg = x.score >= Math.round(GEO_MAX * hintMult(r))
    ? `• SMAAAASH!! Right on the spot in ${where}! +${x.score.toLocaleString()}`
    : `• Right map! ${where}, ${stepsTxt(x.d)}. +${x.score.toLocaleString()}`;
  else msg = p.game === m.game
    ? `• Right game, wrong map. You picked ${p.name}; it was ${m.name}. +${x.score}`
    : `• It was ${where}. You picked ${p.name} (${GAMES[p.game].l}). +0`;
  if (geo.mode === "streak") msg += geo.done ? ` Streak over at ${streakLen()}!` : ` 🔥 ${streakLen()} in a row!`;
  if (!restoring && window.sfx) sfx(x.skipped ? "bad" : rightMap(r, x.pick) ? (x.score >= GEO_MAX * .9 ? "smash" : "ok") : "bad");
  geoSay(msg + (hintNote(r) ? ` (hints: ${hintNote(r)})` : "") + (x.cash && !restoring ? x.cash : ""));
  drawHere(m);
  showResult(r, x, restoring);
  // show the answer on its map and glide the camera over to it; reloading keeps whatever map the player had open
  const target = enemy && rightMap(r, x.pick) ? x.pick : r.map;
  if (roam.on) roam.back = target;
  else if (!mv.map || mv.map.id !== target) openMap(target, restoring ? null : frameReveal);
  else if (!restoring) frameReveal();
  else drawOver();
  drawFog(); drawPip();
  if (geo.done && !restoring) setTimeout(() => geo.done && geoPhase() === "reveal" && geo.i === geo.rounds.length - 1 && showGeoSummary(), 1800);
  $("#geoShare").hidden = !geo.done;
}

// ---------- round result banner over the map ----------
const resultLine = (r, x) => {
  if (x.skipped) return "Round skipped";
  const p = mapById(x.pick), m = mapById(r.map);
  if (isEnemyRound(r)) return rightMap(r, x.pick) ? `Found it in ${p.name}` : p.game === roundGame(r) ? "Right game, wrong map" : "Wrong game";
  if (x.pick === r.map) return x.score >= Math.round(GEO_MAX * hintMult(r)) ? "Right on the spot!" : `Right map · ${stepsTxt(x.d)}`;
  return p.game === m.game ? `Right game · it was ${m.name}` : `Wrong game · it was ${m.name}`;
};
let countRaf = 0;
function showResult(r, x, restoring) {
  const el = $("#geoResult");
  const pct = Math.round(x.score / GEO_MAX * 100);
  el.className = "geoResult " + (x.score >= 4000 ? "great" : x.score >= 1500 ? "good" : x.score > 0 ? "meh" : "miss");
  el.innerHTML = `<span class="grE">${geoEmoji(x.score)}</span>
    <div class="grMain"><b class="grScore">+0</b><small>${resultLine(r, x)}${hintNote(r) ? ` · hints: ${hintNote(r)}` : ""}</small>
    <div class="grMeter" aria-hidden="true"><i style="width:${restoring ? pct : 0}%"></i></div></div>
    <button class="btn hot" id="geoNext2">${$("#geoNext").textContent}</button>`;
  el.hidden = false;
  $("#geoNext2").onclick = () => $("#geoNext").click();
  const sc = el.querySelector(".grScore");
  cancelAnimationFrame(countRaf);
  if (restoring || matchMedia("(prefers-reduced-motion:reduce)").matches) { sc.textContent = `+${x.score.toLocaleString()}`; el.querySelector(".grMeter i").style.width = pct + "%"; return; }
  requestAnimationFrame(() => { const i = el.querySelector(".grMeter i"); if (i) i.style.width = pct + "%"; });
  const t0 = performance.now(), dur = 900;
  const tick = t => {
    const k = Math.min(1, (t - t0) / dur), v = Math.round(x.score * (1 - (1 - k) ** 3));
    sc.textContent = `+${v.toLocaleString()}`;
    if (k < 1) countRaf = requestAnimationFrame(tick);
  };
  countRaf = requestAnimationFrame(tick);
}
function hideResult() { cancelAnimationFrame(countRaf); $("#geoResult").hidden = true; $("#geoResult").innerHTML = ""; }

// frame the answer square and the pin together (place rounds), or just the pin (enemy rounds)
function frameReveal() {
  const r = curRound(), x = geo && geo.res[geo.i];
  if (!mv.ready || !r || !x || roam.on) return;
  const pts = [];
  if (!isEnemyRound(r) && mv.map.id === r.map && r.x != null) pts.push([r.x - r.crop / 2, r.y - r.crop / 2], [r.x + r.crop / 2, r.y + r.crop / 2]);
  if (x.pick === mv.map.id && x.gx != null) pts.push([x.gx, x.gy]);
  if (!pts.length) return drawOver();
  const m = mv.map, W = gView.clientWidth, H = gView.clientHeight;
  let x0 = Math.min(...pts.map(p => p[0])), x1 = Math.max(...pts.map(p => p[0]));
  let y0 = Math.min(...pts.map(p => p[1])), y1 = Math.max(...pts.map(p => p[1]));
  // leave room around the box, and never zoom in further than a few clue squares
  const minS = (r.crop || 160) * 3.2, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const bw = Math.max(x1 - x0, minS) * 1.35, bh = Math.max(y1 - y0, minS) * 1.35;
  // the result banner covers the bottom of the viewer, so frame a little higher
  const k = clamp(Math.min(W / bw, (H - 110) / bh), mv.fit, Math.max(6, mv.fit * 2));
  glideTo(k, W / 2 - cx * k, (H - 70) / 2 - cy * k);
}
let glideRaf = 0;
function glideTo(k, tx, ty) {
  cancelAnimationFrame(glideRaf);
  if (matchMedia("(prefers-reduced-motion:reduce)").matches) { mv.k = k; mv.tx = tx; mv.ty = ty; return applyView(); }
  const a = {k:mv.k, tx:mv.tx, ty:mv.ty}, t0 = performance.now(), dur = 650;
  const step = t => {
    if (!mv.ready) return;
    const p = Math.min(1, (t - t0) / dur), e = p < .5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2;
    // zoom in log space so it feels even
    mv.k = Math.exp(Math.log(a.k) + (Math.log(k) - Math.log(a.k)) * e);
    mv.tx = a.tx + (tx - a.tx) * e; mv.ty = a.ty + (ty - a.ty) * e;
    applyView();
    if (p < 1) glideRaf = requestAnimationFrame(step);
  };
  glideRaf = requestAnimationFrame(step);
}

// who lives here (only once the enemy list is open, so it can't spoil today's grid)
function drawHere(m) {
  const el = $("#geoHere");
  const list = m.area ? ALL.filter(e => e.game === m.game && e.regions.includes(m.area)) : [];
  if (!list.length) { el.hidden = true; return; }
  el.hidden = false;
  if (!listUnlocked) { el.innerHTML = `<span class="sub">Enemies here</span> 🔒 Finish today's grid to see who lives in ${m.area}.`; return; }
  el.innerHTML = `<span class="sub">Enemies in ${m.area}</span><span class="hereRow">${list.slice(0, 10).map(e =>
    `<button class="hereE" data-id="${e.id}" title="${e.name}">${spriteHTML(e, "mini")}</button>`).join("")}${list.length > 10 ? `<small>+${list.length - 10}</small>` : ""}</span>`;
  el.querySelectorAll(".hereE").forEach(b => b.onclick = () => openCard(BY_ID.get(b.dataset.id)));
}

function nextRound() {
  // streaks go on until a wrong map: add the next place (not one of the last dozen)
  if (geo.mode === "streak" && !geo.done && geo.i === geo.rounds.length - 1) {
    const recent = new Set(geo.rounds.slice(-12).map(r => r.map));
    const pool = MAPS.filter(m => !recent.has(m.id));
    geo.rounds.push(placeRound(pool[Math.floor(Math.random() * pool.length)]));
  }
  if (geo.i < geo.rounds.length - 1) { geo.i++; geoSave(); $("#geoHere").hidden = true; geoRound(); }
  else { geo.done = true; geoSave(); showGeoSummary(); }
}

function geoShareText() {
  const fogged = geo.res.some(x => x && x.fog) ? " · 🌫️ Fog" : "";
  const squares = geo.rounds.map((r, i) => geoEmoji(geo.res[i] ? geo.res[i].score : 0)).join("");
  if (geo.mode === "streak") return `EarthDoku Map Guessr · 🔥 Streak of ${streakLen()}${fogged}\n${squares}`;
  const name = geo.mode === "enemy" ? "Enemy Guessr" : "Map Guessr " + (geo.mode === "daily" ? "#" + puzzleNo() : "(practice)");
  return `EarthDoku ${name} · ${geoTotal().toLocaleString()}/${(GEO_MAX * geo.rounds.length).toLocaleString()}${fogged}\n${squares}`;
}

// little thumbnail of each round's clue for the results screen (only for maps that loaded this session)
function thumbHTML(r) {
  if (isEnemyRound(r)) return `<span class="gsThumb e">${spriteHTML(BY_ID.get(r.enemy), "mini")}</span>`;
  const m = mapById(r.map);
  if (r.x == null || !m.w) return `<span class="gsThumb">🗺️</span>`;
  const s = 46 / r.crop;
  return `<span class="gsThumb" style="background-image:url(&quot;${m.url}&quot;);background-size:${m.w * s}px ${m.h * s}px;background-position:${-(r.x - r.crop / 2) * s}px ${-(r.y - r.crop / 2) * s}px"></span>`;
}
function untilTomorrow() {
  const now = new Date(), next = new Date(now); next.setHours(24, 0, 0, 0);
  const min = Math.max(1, Math.round((next - now) / 60000));
  return min >= 60 ? `${Math.floor(min / 60)}h ${min % 60}m` : `${min}m`;
}

function showGeoSummary() {
  const tot = geoTotal(), max = GEO_MAX * geo.rounds.length, pct = tot / max, n = streakLen();
  const title = geo.mode === "streak"
    ? (n >= 10 ? `A ${n}-place streak! Legendary!` : n >= 5 ? `Streak of ${n}. Nice run!` : `Streak over at ${n}.`)
    : pct >= .8 ? "You're a walking Town Map!" : pct >= .5 ? "Nice sense of direction!" : pct >= .2 ? "Mr. Saturn would get lost too, boing." : "Maybe ask a Runaway Five bus driver?";
  const again = geo.mode === "daily" ? "practice" : geo.mode;
  const cash = geo.res.reduce((s, x) => s + (x && x.cash ? +((String(x.cash).match(/\$([\d,]+)/) || [0, "0"])[1].replace(/,/g, "")) : 0), 0);
  // daily runs show how today stacks up against past days
  let hist = "";
  if (geo.mode === "daily" && window.geoHistory) {
    const done = geoHistory().filter(g => g.done), best = done.length ? Math.max(...done.map(g => g.total)) : tot;
    const avg = done.length ? Math.round(done.reduce((s, g) => s + g.total, 0) / done.length) : tot;
    hist = `<div class="gsStats"><span><b>${done.length}</b>daily runs</span><span><b>${best.toLocaleString()}</b>${tot >= best ? "best ✨ today!" : "best"}</span><span><b>${avg.toLocaleString()}</b>average</span><span><b>${untilTomorrow()}</b>next daily</span></div>`;
  } else if (geo.mode === "streak") hist = `<div class="gsStats"><span><b>${n}</b>this streak</span><span><b>${bestStreak()}</b>best streak</span><span><b>${tot.toLocaleString()}</b>points</span></div>`;
  const head = geo.mode === "streak" ? "" : `<div class="gsTotal"><b>${tot.toLocaleString()}</b><small>/ ${max.toLocaleString()} pts</small>
    <div class="grMeter"><i style="width:${Math.round(pct * 100)}%"></i></div></div>`;
  openModal(`🗺️ ${title}`,
    `${head}${hist}<ul class="geoSum">${geo.rounds.map((r, i) => {
      const m = mapById(r.map), x = geo.res[i] || {score:0}, p = x.pick && mapById(x.pick);
      const label = isEnemyRound(r) ? `${BY_ID.get(r.enemy).name} ${badge(BY_ID.get(r.enemy))}` : `${m.name} ${badge(m)}`;
      const how = x.skipped ? "skipped" : !p ? "no guess" : rightMap(r, p.id) ? (x.d != null ? stepsTxt(x.d) : `found in ${p.name}`) : `picked ${p.name}`;
      return `<li data-i="${i}" tabindex="0" title="Look at this round again">${thumbHTML(r)}<span class="gsTxt"><span class="an">${label}</span>
        <small>${geoEmoji(x.score)} ${how}${hintNote(r) ? ` · hints: ${hintNote(r)}` : ""}${x.fog ? " · 🌫️" : ""}</small>
        <span class="gsBar"><i style="width:${Math.round(x.score / GEO_MAX * 100)}%"></i></span></span><b class="gsPts">${x.score.toLocaleString()}</b></li>`;
    }).join("")}</ul>
    ${cash ? `<p class="gsCash">💰 Earned $${cash} this run</p>` : ""}
    <pre class="geoPre">${geoShareText()}</pre>
    <div class="actions"><button class="btn hot" id="geoShare2">📋 Share result</button><button class="btn" id="geoAgain">${again === "practice" ? "🗺️ Practice run" : "🔁 Play again"}</button><button class="btn" id="geoModes2">🎮 Other modes</button></div>`);
  document.querySelectorAll(".geoSum li").forEach(li => {
    li.onclick = () => { closeModal(); geo.i = +li.dataset.i; geoRound(); };
    li.onkeydown = ev => { if (ev.key === "Enter") li.onclick(); };
  });
  $("#geoShare2").onclick = shareGeo;
  $("#geoAgain").onclick = () => { closeModal(); newGeo(again, (Math.random() * 2 ** 32) >>> 0); };
  $("#geoModes2").onclick = openModes;
  $("#geoShare").hidden = false;
}

async function shareGeo() {
  const text = geoShareText();
  try { await navigator.clipboard.writeText(text); closeModal(); geoSay("• Copied your result! Paste it anywhere."); }
  catch { openModal("Copy your result", `<textarea class="search" rows="4" readonly>${text}</textarea>`); }
}

// ---------- mode picker ----------
function openModes() {
  const lockE = !listUnlocked;
  openModal("🗺️ Choose a run", `<div class="modeList">
    <button class="modeBtn" data-mode="practice"><b>🗺️ Practice</b><small>5 random places from all three games</small></button>
    <button class="modeBtn" data-mode="streak"><b>🔥 Streak</b><small>Keep finding the right map. One wrong map ends it. Best: ${bestStreak()}</small></button>
    <button class="modeBtn" data-mode="enemy"${lockE ? " disabled" : ""}><b>👾 Enemy Guessr</b><small>${lockE ? "🔒 Finish today's grid first: it shows where enemies live" : "See an enemy sprite, name the place where it lives"}</small></button>
    <button class="modeBtn" data-mode="daily"><b>📅 Daily run</b><small>Today's 5 places, the same for everyone</small></button>
    <button class="modeBtn" data-mode="roam"><b>🧭 Free roam</b><small>No clues, no score: browse every map and see which enemies live there</small></button>
  </div>
  <label class="fogChk"><input type="checkbox" id="fogChk2"${fog.on ? " checked" : ""}> 🌫️ <b>Fog of war</b> <small>maps start dark; move your cursor or finger to light them up. +25% money</small></label>`);
  document.querySelectorAll(".modeBtn").forEach(b => b.onclick = () => {
    closeModal();
    if (b.dataset.mode === "roam") openRoam();
    else if (b.dataset.mode === "daily") startGeoDaily();
    else newGeo(b.dataset.mode, (Math.random() * 2 ** 32) >>> 0);
  });
  $("#fogChk2").onchange = ev => setFog(ev.target.checked);
}

// ---------- finding maps: no list to scroll, you have to know the place's name ----------
function lev(a, b) {
  const d = Array.from({length:a.length + 1}, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
function findMaps(q) {
  const k = mapKey(q);
  if (!k) return [];
  const hits = MAPS.filter(m => m.keys.includes(k));
  if (hits.length) return hits;
  // forgive one typo in longer names ("Foursid", "Monside")
  return k.length >= 5 ? MAPS.filter(m => m.keys.some(x => x.length >= 5 && lev(x, k) <= 1)) : [];
}
function findMsg(t) { $("#geoFindMsg").textContent = t; }

// after 3 letters, places whose name (or another name for it) contains them show up as suggestions;
// once the 🎮 hint is used, that game's places come first
function suggestMaps(q) {
  const k = mapKey(q);
  if (k.length < 3) return [];
  const r = !roam.on && curRound(), g = r && r.hintG && geoPhase() === "guess" ? roundGame(r) : null;
  return MAPS.map(m => {
    const at = Math.min(...m.keys.map(x => { const i = x.indexOf(k); return i < 0 ? 99 : i; }));
    return [at, m];
  }).filter(([at]) => at < 99).sort((a, b) => (g ? (a[1].game !== g) - (b[1].game !== g) : 0) || a[0] - b[0] || a[1].name.localeCompare(b[1].name)).slice(0, 8).map(p => p[1]);
}
const pickHTML = list => list.map(m => `<button type="button" data-id="${m.id}">${badge(m)} ${m.name}${found.has(m.id) ? ` <small title="Already opened this round">👁️</small>` : ""}</button>`).join("");
$("#geoQ").oninput = ev => {
  const list = suggestMaps(ev.target.value);
  $("#geoPick").innerHTML = pickHTML(list);
  if (mapKey(ev.target.value).length < 3) findMsg("Type 3 letters of a place to see matching maps.");
  else findMsg(list.length ? "Matching places (↑ ↓ to pick):" : "No place matches that yet.");
};
// ↑ / ↓ walk the suggestions, Enter opens the highlighted one, Esc clears the box
$("#geoQ").onkeydown = ev => {
  const bs = [...$("#geoPick").querySelectorAll("button[data-id]")];
  if (ev.key === "Escape" && ev.target.value) { ev.stopPropagation(); ev.target.value = ""; $("#geoPick").innerHTML = ""; findMsg(""); return; }
  if ((ev.key !== "ArrowDown" && ev.key !== "ArrowUp") || !bs.length) return;
  ev.preventDefault();
  const i = bs.findIndex(b => b.classList.contains("sel"));
  const j = i < 0 ? (ev.key === "ArrowDown" ? 0 : bs.length - 1) : (i + (ev.key === "ArrowDown" ? 1 : -1) + bs.length) % bs.length;
  bs.forEach((b, k) => b.classList.toggle("sel", k === j));
};

$("#geoFind").onsubmit = ev => {
  ev.preventDefault();
  const inp = $("#geoQ"), q = inp.value.trim(), sel = $("#geoPick").querySelector("button.sel");
  if (sel) return sel.click();
  $("#geoPick").innerHTML = "";
  if (!q) return findMsg("Type the name of a town, dungeon or area.");
  let hits = findMaps(q);
  if (!hits.length) {
    const sugg = suggestMaps(q);
    if (sugg.length === 1) hits = sugg;
    else if (sugg.length > 1) { findMsg(`Pick one of the places matching “${q}”:`); $("#geoPick").innerHTML = pickHTML(sugg); return; }
  }
  if (!hits.length) {
    findMsg(`No map called “${q}”. Try another place name.`);
    inp.classList.remove("nope"); void inp.offsetWidth; inp.classList.add("nope");
    return;
  }
  inp.value = "";
  if (hits.length === 1) { openMap(hits[0].id); findMsg(`Opened ${hits[0].name}.`); return; }
  // same name in more than one place (Magicant, Chimera Lab floors…)
  findMsg(`“${q}” has ${hits.length} maps. Pick one:`);
  $("#geoPick").innerHTML = pickHTML(hits);
};
$("#geoPick").onclick = ev => {
  const b = ev.target.closest("button[data-id]");
  if (!b) return;
  $("#geoPick").innerHTML = "";
  $("#geoQ").value = "";
  openMap(b.dataset.id); findMsg(`Opened ${mapById(b.dataset.id).name}.`);
};

// maps already found this round stay one tap away
function drawFound() {
  const list = [...found].map(mapById);
  $("#geoMaps").innerHTML = list.length
    ? list.map(m => `<button data-id="${m.id}" class="${mv.map && mv.map.id === m.id ? "on" : ""}">${badge(m)}<span class="mn">${m.name}</span>${
        mv.pin && mv.pin.map === m.id && geoPhase() === "guess" ? `<span title="Your pin is here">📍</span>` : ""}</button>`).join("")
    : `<p class="geoNone">Maps you open this round show up here.</p>`;
}
$("#geoMaps").onclick = ev => { const b = ev.target.closest("button[data-id]"); if (b) openMap(b.dataset.id); };

// ---------- map viewer: drag to pan, wheel/pinch/buttons to zoom, click to pin ----------
const gView = $("#geoView"), gStage = $("#geoStage"), gImg = $("#geoImg"), gOver = $("#geoOver");

// ---------- fog of war: maps start dark and light up wherever the cursor or finger goes ----------
const FOG_KEY = "earthdoku-geo-fog";
const fog = {on:!!store.get(FOG_KEY), masks:new Map()};
const gFog = $("#geoFog");
// one low-res mask per map, 1 pixel per cell; cleared cells are transparent
function fogMask(m) {
  if (!fog.masks.has(m.id)) {
    const cell = Math.max(6, Math.ceil(Math.max(m.w, m.h) / 480));
    const cv = document.createElement("canvas");
    cv.width = Math.ceil(m.w / cell); cv.height = Math.ceil(m.h / cell);
    const ctx = cv.getContext("2d");
    ctx.fillStyle = "#1c1730"; ctx.fillRect(0, 0, cv.width, cv.height);
    fog.masks.set(m.id, {cv, ctx, cell});
  }
  return fog.masks.get(m.id);
}
const fogActive = () => fog.on && mv.ready && !roam.on && geoPhase() === "guess";
// light radius in map pixels: a bit bigger than the clue square
function fogRadius(m) {
  const r = geo && geo.rounds[geo.i];
  return r && r.crop ? r.crop * 1.1 : Math.max(90, Math.min(m.w, m.h) * .08);
}
function fogLight(x, y) {
  if (!fogActive()) return;
  const m = mv.map, k = fogMask(m), R = fogRadius(m) / k.cell, cx = x / k.cell, cy = y / k.cell;
  const g = k.ctx.createRadialGradient(cx, cy, R * .55, cx, cy, R);
  g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(1, "rgba(0,0,0,0)");
  k.ctx.globalCompositeOperation = "destination-out";
  k.ctx.fillStyle = g;
  k.ctx.beginPath(); k.ctx.arc(cx, cy, R, 0, Math.PI * 2); k.ctx.fill();
  k.ctx.globalCompositeOperation = "source-over";
  drawFog();
}
function drawFog() {
  const W = gView.clientWidth, H = gView.clientHeight, dpr = window.devicePixelRatio || 1;
  if (!fogActive()) { gFog.hidden = true; return; }
  gFog.hidden = false;
  if (gFog.width !== Math.round(W * dpr) || gFog.height !== Math.round(H * dpr)) {
    gFog.width = Math.round(W * dpr); gFog.height = Math.round(H * dpr);
  }
  const ctx = gFog.getContext("2d"), m = mv.map, k = fogMask(m);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(k.cv, mv.tx, mv.ty, k.cv.width * k.cell * mv.k, k.cv.height * k.cell * mv.k);
}
function fogReset() { fog.masks.clear(); drawFog(); }
function setFog(on) {
  fog.on = on;
  store.set(FOG_KEY, on);
  $("#geoFogBtn").classList.toggle("on", on);
  $("#geoFogBtn").setAttribute("aria-pressed", on);
  drawFog();
  geoSay(on ? "• 🌫️ Fog of war on! Maps start dark: move your cursor (or drag your finger) to light them up. +25% money."
            : "• Fog of war off.");
}
let fogRaf = 0, fogAt = null;
gView.addEventListener("pointermove", ev => {
  if (!fogActive()) return;
  const b = gView.getBoundingClientRect();
  fogAt = [(ev.clientX - b.left - mv.tx) / mv.k, (ev.clientY - b.top - mv.ty) / mv.k];
  if (!fogRaf) fogRaf = requestAnimationFrame(() => { fogRaf = 0; if (fogAt) fogLight(...fogAt); });
});

// the pin stays on whichever map it was dropped on while the player looks at others
function openMap(id, then) {
  const m = mapById(id);
  if (!m) return;
  if (!roam.on) found.add(id);
  mv.map = m; mv.ready = false;
  gStage.style.visibility = "hidden";
  $("#geoEmpty").hidden = true;
  const L = $("#geoLoading");
  L.hidden = false; L.textContent = "Loading map…";
  const done = () => {
    if (mv.map !== m) return;
    setSize(m, gImg);
    gImg.style.width = m.w + "px"; gImg.style.height = m.h + "px";
    mv.ready = true; L.hidden = true; gStage.style.visibility = "";
    fitMap();
    if (then) then();
  };
  gImg.onload = done;
  gImg.onerror = () => { if (mv.map === m) L.textContent = "Couldn't load this map."; };
  cancelAnimationFrame(glideRaf);
  if (gImg.getAttribute("src") === m.url && gImg.complete && gImg.naturalWidth) done();
  else gImg.src = m.url;
  $("#geoMapName").innerHTML = `${badge(m)} ${m.name} <a href="${m.page}" target="_blank" rel="noopener" title="Map source on ${m.src}">↗</a>`;
  drawFound(); updateGuessBtn(); drawOver();
  if (roam.on) drawRoamHere();
}
function closeMap() {
  mv.map = null; mv.ready = false;
  gStage.style.visibility = "hidden";
  gImg.onload = gImg.onerror = null;
  gImg.removeAttribute("src");
  $("#geoEmpty").hidden = false;
  $("#geoLoading").hidden = true;
  $("#geoMapName").innerHTML = "";
  drawOver(); drawFog();
}

function fitMap() {
  if (!mv.ready) return;
  const W = gView.clientWidth, H = gView.clientHeight, m = mv.map;
  if (!W || !H) return;
  mv.fit = Math.min(W / m.w, H / m.h);
  mv.k = mv.fit;
  mv.tx = (W - m.w * mv.k) / 2; mv.ty = (H - m.h * mv.k) / 2;
  applyView();
}
function applyView() {
  const W = gView.clientWidth, H = gView.clientHeight, m = mv.map;
  const sw = m.w * mv.k, sh = m.h * mv.k;
  mv.tx = clamp(mv.tx, Math.min(0, W - sw) - W * .4, Math.max(0, W - sw) + W * .4);
  mv.ty = clamp(mv.ty, Math.min(0, H - sh) - H * .4, Math.max(0, H - sh) + H * .4);
  gStage.style.transform = `translate(${mv.tx}px,${mv.ty}px) scale(${mv.k})`;
  drawFog();
  drawOver();
}
function zoomAt(f, px, py) {
  if (!mv.ready) return;
  cancelAnimationFrame(glideRaf);
  const k2 = clamp(mv.k * f, mv.fit * .9, Math.max(6, mv.fit * 2));
  const ix = (px - mv.tx) / mv.k, iy = (py - mv.ty) / mv.k;
  mv.k = k2; mv.tx = px - ix * k2; mv.ty = py - iy * k2;
  applyView();
}
const center = () => [gView.clientWidth / 2, gView.clientHeight / 2];
$("#geoIn").onclick = () => zoomAt(1.6, ...center());
$("#geoOut").onclick = () => zoomAt(1 / 1.6, ...center());
$("#geoFit").onclick = fitMap;

gView.addEventListener("wheel", ev => {
  if (!mv.ready) return;
  ev.preventDefault();
  const b = gView.getBoundingClientRect();
  zoomAt(Math.exp(-ev.deltaY * .0015), ev.clientX - b.left, ev.clientY - b.top);
}, {passive:false});

const ptrs = new Map();
let drag = null;
const ptDist = () => { const [a, b] = [...ptrs.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
gView.addEventListener("pointerdown", ev => {
  if (!mv.ready) return;
  cancelAnimationFrame(glideRaf);
  gView.setPointerCapture(ev.pointerId);
  ptrs.set(ev.pointerId, {x:ev.clientX, y:ev.clientY});
  if (ptrs.size === 1) drag = {x:ev.clientX, y:ev.clientY, tx:mv.tx, ty:mv.ty, moved:false, pinch:0};
  else if (drag) { drag.moved = true; drag.pinch = ptDist(); }
});
gView.addEventListener("pointermove", ev => {
  if (!drag || !ptrs.has(ev.pointerId)) return;
  ptrs.set(ev.pointerId, {x:ev.clientX, y:ev.clientY});
  if (ptrs.size === 2 && drag.pinch) {
    const d = ptDist(), [a, b] = [...ptrs.values()], r = gView.getBoundingClientRect();
    zoomAt(d / drag.pinch, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
    drag.pinch = d;
    return;
  }
  const dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
  if (!drag.moved && Math.hypot(dx, dy) > 5) drag.moved = true;
  if (drag.moved && ptrs.size === 1) {
    mv.tx = drag.tx + dx; mv.ty = drag.ty + dy;
    gView.classList.add("dragging");
    applyView();
  }
});
const endPtr = ev => {
  if (!ptrs.has(ev.pointerId)) return;
  ptrs.delete(ev.pointerId);
  if (ptrs.size) {
    // one finger left after a pinch: carry on panning from where it is
    const [p] = [...ptrs.values()];
    drag = {x:p.x, y:p.y, tx:mv.tx, ty:mv.ty, moved:true, pinch:0};
    return;
  }
  gView.classList.remove("dragging");
  if (drag && !drag.moved && ev.type === "pointerup") placePin(ev);
  drag = null;
};
gView.addEventListener("pointerup", endPtr);
gView.addEventListener("pointercancel", endPtr);

function placePin(ev) {
  if (roam.on || geoPhase() !== "guess" || !mv.ready) return;
  const b = gView.getBoundingClientRect();
  const x = (ev.clientX - b.left - mv.tx) / mv.k, y = (ev.clientY - b.top - mv.ty) / mv.k;
  if (x < 0 || y < 0 || x > mv.map.w || y > mv.map.h) return;
  mv.pin = {map:mv.map.id, x, y}; mv.pinAt = performance.now();
  if (window.sfx) sfx("click");
  drawOver(); drawFound(); updateGuessBtn();
}

function updateGuessBtn() {
  const g = $("#geoGuess");
  g.disabled = geoPhase() !== "guess" || !mv.pin;
  g.textContent = mv.pin && geoPhase() === "guess" ? `📍 Guess: ${mapById(mv.pin.map).name}` : "📍 Drop a pin first";
}

// pins and the answer box live outside the scaled layer so they stay the same size at any zoom
// pins and the answer box live outside the scaled layer so they stay the same size at any zoom
function drawOver() {
  if (!mv.ready || roam.on) { gOver.innerHTML = ""; return; }
  const P = (x, y) => [mv.tx + x * mv.k, mv.ty + y * mv.k];
  const W = gView.clientWidth, H = gView.clientHeight;
  let html = "", line = "";
  const ph = geoPhase(), r = geo && geo.rounds[geo.i], x = geo && geo.res[geo.i];
  if (ph === "reveal" && r && mv.map.id === r.map && r.x != null) {
    const [ax, ay] = P(r.x - r.crop / 2, r.y - r.crop / 2), s = r.crop * mv.k;
    html += `<div class="gAns" style="left:${ax}px;top:${ay}px;width:${s}px;height:${s}px"><span>★ here</span></div>`;
    if (x && x.pick === r.map) {
      const [gx, gy] = P(x.gx, x.gy), [cx, cy] = P(r.x, r.y);
      // a distance tag halfway along the line, unless the pin is inside the square
      if (x.d > r.crop / 2) {
        line = `<line x1="${gx}" y1="${gy}" x2="${cx}" y2="${cy}"/>`;
        html += `<span class="gDist" style="left:${(gx + cx) / 2}px;top:${(gy + cy) / 2}px">${stepsTxt(x.d)}</span>`;
      }
      html += `<div class="gPin" style="left:${gx}px;top:${gy}px">📍</div>`;
    }
  }
  // place rounds draw the pin with the answer box above; otherwise show it wherever it was dropped
  if (ph === "reveal" && x && x.pick && x.pick === mv.map.id && (isEnemyRound(r) || x.pick !== r.map)) {
    const [gx, gy] = P(x.gx, x.gy);
    html += `<div class="gPin${rightMap(r, x.pick) ? "" : " miss"}" style="left:${gx}px;top:${gy}px">${rightMap(r, x.pick) ? "📍" : "❌"}</div>`;
  }
  if (ph === "guess" && mv.pin && mv.pin.map === mv.map.id) {
    const [gx, gy] = P(mv.pin.x, mv.pin.y), fresh = performance.now() - (mv.pinAt || 0) < 300;
    html += `<div class="gPin live${fresh ? " drop" : ""}" style="left:${gx}px;top:${gy}px">📍</div>`;
  }
  gOver.innerHTML = (line ? `<svg class="gLine" width="${W}" height="${H}" aria-hidden="true">${line}</svg>` : "") + html;
}

// ---------- buttons ----------
$("#geoGuess").onclick = makeGuess;
$("#geoHint").onclick = () => {
  const r = curRound();
  if (!r || r.hint || geoPhase() !== "guess" || !$("#geoClueMsg").hidden) return;
  r.hint = true; geoSave(); drawClue();
  $("#geoHint").disabled = true;
  if (window.sfx) sfx("open");
  geoSay(isEnemyRound(r) ? `• It's ${BY_ID.get(r.enemy).name}! This round is now worth 20% less.` : "• Zoomed out! This round is now worth 20% less.");
};
$("#geoHintG").onclick = () => {
  const r = curRound();
  if (!r || r.hintG || geoPhase() !== "guess" || !$("#geoClueMsg").hidden) return;
  r.hintG = true; geoSave(); drawClue();
  $("#geoHintG").disabled = true;
  if (window.sfx) sfx("open");
  geoSay(`• It's somewhere in ${GAMES[roundGame(r)].full}. Places from it now come first when you search. This round is worth 10% less.`);
  if ($("#geoQ").value) $("#geoQ").oninput({target:$("#geoQ")});
};
$("#geoPipBtn").onclick = ev => { ev.stopPropagation(); setPip(!pipOn); };
$("#geoDaily").onclick = startGeoDaily;
$("#geoPractice").onclick = openModes;
$("#geoFogBtn").onclick = () => setFog(!fog.on);
$("#geoFogBtn").classList.toggle("on", fog.on);
$("#geoShare").onclick = shareGeo;
$("#geoHelp").onclick = () => openModal("How Map Guessr works", `<div class="help">
  • The box on the left is a zoomed‑in piece of one of ${MAPS.length} full maps from Mother, EarthBound and Mother 3.<br>
  • There's no list of maps. Start typing the place you think it is (a town, dungeon or area): after 3 letters, matching places pop up. Tap one, or use ↑ ↓ and Enter. Small typos are forgiven.<br>
  • Maps you've opened this round stay as buttons under the search box so you can flip back.<br>
  • Drag to pan; scroll, pinch or use + / − to zoom. Click (or tap) to drop your pin, then press Guess.<br>
  • 📌 on the clue floats a copy of it over the corner of the map, so you can compare while you look around.<br>
  • Up to ${GEO_MAX.toLocaleString()} points a round: landing inside the clue square is perfect, and the right map is always worth at least 1,500. Distance is counted in steps (16 pixels each).<br>
  • Right game but wrong map gets 500. Wrong game gets 0.<br>
  • Two hints a round, and you can use both: 🎮 tells you the game (−10%) and puts its places first in the search; 🔍 shows a wider view, or the enemy's name in Enemy Guessr (−20%).<br>
  • After you guess, the map glides over to the answer and shows how far off you were.<br>
  • The daily run is ${GEO_ROUNDS} rounds (2 Mother, 2 EarthBound, 1 Mother 3) and is the same for everyone.<br>
  <h3>⌨️ Shortcuts</h3>
  • <b>/</b> search · <b>G</b> guess · <b>N</b> or <b>Enter</b> next round · <b>E</b> game hint · <b>Z</b> zoom‑out hint · <b>C</b> float the clue · <b>F</b> fit the map<br>
  • With the map focused: arrows pan, <b>+</b> / <b>−</b> zoom, <b>0</b> fits, Enter or Space drops the pin in the middle.<br>
  <h3>🎮 Modes</h3>
  • 🗺️ <b>Practice</b>: 5 random places.<br>
  • 🔥 <b>Streak</b>: places keep coming until you pick a wrong map. Your best streak is saved.<br>
  • 👾 <b>Enemy Guessr</b>: you see an enemy's sprite and have to open a map where it lives and pin anywhere on it. Any of its maps counts. Opens once today's grid is done.<br>
  • 🌫️ <b>Fog of war</b> (any mode): maps start dark and light up around your cursor or finger. Rounds pay 25% more money while it's on.<br>
  • 🧭 <b>Free roam</b>: browse every map from a list (filter by game, place or enemy), flip through them with ◀ ▶ and see which enemies live on each one. Enemy cards' 🗺️ map buttons open here too. Your current run is paused and picks up where you left it.<br>
  • After each round you'll see which enemies live there, once today's grid is finished.
  <h3>About the maps</h3>
  • Mother and most EarthBound maps come from WikiBound. Twoson, Fourside, Winters and the other EarthBound areas WikiBound is missing come from VGMaps.<br>
  • Mother 3 has a few single‑area maps (Chimera Lab, Clayman Factory, Club Titiboo attic, Mole Cricket Hole). The rest of the game is ripped room by room onto four giant VGMaps sheets: search <b>Sheet A</b> to <b>Sheet D</b>. They're huge, so give them a moment to load.</div>`);
// keyboard: arrows pan, + / − zoom, 0 fits, Enter drops the pin at the center
gView.addEventListener("keydown", ev => {
  if (!mv.ready) return;
  const step = 60, [cx, cy] = center();
  const pan = {ArrowLeft:[step, 0], ArrowRight:[-step, 0], ArrowUp:[0, step], ArrowDown:[0, -step]}[ev.key];
  if (pan) { cancelAnimationFrame(glideRaf); mv.tx += pan[0]; mv.ty += pan[1]; applyView(); }
  else if (ev.key === "+" || ev.key === "=") zoomAt(1.6, cx, cy);
  else if (ev.key === "-") zoomAt(1 / 1.6, cx, cy);
  else if (ev.key === "0") fitMap();
  else if ((ev.key === "Enter" || ev.key === " ") && geoPhase() === "guess") {
    const b = gView.getBoundingClientRect();
    placePin({clientX:b.left + cx, clientY:b.top + cy});
  } else return;
  ev.preventDefault();
});
// shortcuts anywhere on the Map Guessr tab (not while typing or with a window open)
document.addEventListener("keydown", ev => {
  if ($("#viewGeo").hidden || !$("#modal").hidden || ev.ctrlKey || ev.metaKey || ev.altKey || ev.repeat) return;
  const t = ev.target, typing = t.matches && t.matches("input,textarea,select,[contenteditable]");
  if (typing) return;
  const k = ev.key.toLowerCase(), ph = geoPhase(), click = id => { const b = $(id); if (b && !b.disabled && !b.hidden) b.click(); };
  if (ev.key === "/" && !roam.on) { $("#geoQ").focus(); $("#geoQ").select(); }
  else if (roam.on) return;
  else if (k === "g" && ph === "guess") click("#geoGuess");
  else if ((k === "n" || (ev.key === "Enter" && !t.matches("button,a,li"))) && ph === "reveal") click("#geoNext");
  else if (k === "e" && ph === "guess") click("#geoHintG");
  else if (k === "z" && ph === "guess") click("#geoHint");
  else if (k === "c") setPip(!pipOn);
  else if (k === "f") fitMap();
  else return;
  ev.preventDefault();
});

window.onGeoShow = () => {
  if (!geo) startGeoDaily();
  else if (geoPhase() === "reveal") drawHere(mapById(geo.rounds[geo.i].map)); // the grid may have unlocked it since
  requestAnimationFrame(() => { if (mv.map) { fitMap(); if (geoPhase() === "reveal" && !roam.on) frameReveal(); } if (geo && geo.rounds[geo.i].x != null && $("#geoClueMsg").hidden) drawClue(); });
  drawFound();
};
window.addEventListener("resize", () => {
  if ($("#viewGeo").hidden) return;
  if (mv.map) fitMap();
  if (geo && geo.rounds[geo.i].x != null && $("#geoClueMsg").hidden) drawClue();
});

// ---------- free roam: browse every map, no clue and no scoring, and see which enemies live there ----------
const HERE_CACHE = new Map();
const enemiesAt = m => {
  if (!HERE_CACHE.has(m.id)) HERE_CACHE.set(m.id, m.area ? ALL.filter(e => e.game === m.game && e.regions.includes(m.area)).sort((a, b) => !!b.boss - !!a.boss || a.name.localeCompare(b.name)) : []);
  return HERE_CACHE.get(m.id);
};
const roamMaps = () => {
  const q = norm(roam.q);
  return MAPS.filter(m => (roam.game === "all" || m.game === roam.game) && (!roam.only || enemiesAt(m).length)
    && (!q || norm(m.name).includes(q) || (m.area && norm(m.area).includes(q)) || enemiesAt(m).some(e => norm(e.name).includes(q))))
    .sort((a, b) => ["M1", "EB", "M3"].indexOf(a.game) - ["M1", "EB", "M3"].indexOf(b.game) || a.name.localeCompare(b.name));
};
// the panel's frame is drawn once, so typing in the filter box never loses focus
function drawRoam() {
  $("#geoRoam").innerHTML = `<div class="roamHead"><b>🧭 Free roam</b><small>Look around any map, no clues and no score. Tap a place to open it.</small></div>
    <input class="search" id="roamQ" placeholder="Filter by place, area or enemy…" autocomplete="off" spellcheck="false" value="${roam.q.replace(/"/g, "&quot;")}">
    <div class="chips" id="roamG">${[["all", "All"], ["M1", "Mother"], ["EB", "EarthBound"], ["M3", "Mother 3"]].map(([g, l]) => `<button data-g="${g}" class="${roam.game === g ? "on" : ""}">${l}</button>`).join("")}</div>
    <label class="roamOnly"><input type="checkbox" id="roamOnly"${roam.only ? " checked" : ""}> Only maps with an enemy list</label>
    <div class="roamList" id="roamList"></div>
    <div class="roamHere" id="roamHere"></div>`;
  $("#roamQ").oninput = ev => { roam.q = ev.target.value; drawRoamList(); };
  $("#roamOnly").onchange = ev => { roam.only = ev.target.checked; drawRoamList(); };
  $("#roamG").onclick = ev => { const b = ev.target.closest("button[data-g]"); if (!b) return; roam.game = b.dataset.g; drawRoam(); };
  $("#roamList").onclick = ev => { const b = ev.target.closest("button[data-id]"); if (b) { sfx("click"); openMap(b.dataset.id); } };
  drawRoamList(); drawRoamHere();
}
function drawRoamList() {
  const el = $("#roamList");
  if (!el) return;
  const list = roamMaps(), cur = mv.map && mv.map.id;
  el.innerHTML = list.length ? list.map(m => { const n = enemiesAt(m).length;
    return `<button data-id="${m.id.replace(/"/g, "&quot;")}" class="${m.id === cur ? "on" : ""}">${badge(m)}<span class="mn">${m.name}</span>${n ? `<small>👾 ${n}</small>` : ""}</button>`; }).join("")
    : `<p class="geoNone">No maps match that.</p>`;
  const on = el.querySelector("button.on");
  if (on) on.scrollIntoView({block:"nearest"});
}
// who lives on the open map (locked until today's grid is done, same as after a Map Guessr round)
function drawRoamHere() {
  const el = $("#roamHere");
  if (!el) return;
  drawRoamList();
  const m = mv.map;
  if (!m) { el.innerHTML = `<p class="geoNone">Pick a place above to start exploring.</p>`; return; }
  const list = roamMaps(), i = list.findIndex(x => x.id === m.id), es = enemiesAt(m);
  const nav = list.length > 1 ? `<button class="roamNav" data-step="-1" aria-label="Previous map">◀</button>` : "", nav2 = list.length > 1 ? `<button class="roamNav" data-step="1" aria-label="Next map">▶</button>` : "";
  const head = `<div class="roamTitle">${nav}<div><b>${m.name}</b> ${badge(m)}<small>${m.area ? `Area: ${m.area}` : "No area listed"}</small></div>${nav2}</div>`;
  let body;
  if (!es.length) body = `<p class="geoNone">No enemy list for this map. ${m.area ? "Nobody is listed as living here." : "It isn't linked to one of the wiki's enemy areas."}</p>`;
  else if (!listUnlocked) body = `<p class="geoNone">🔒 ${es.length} enem${es.length === 1 ? "y lives" : "ies live"} here. Finish today's grid to see who, so it can't spoil the answers.</p>`;
  else {
    const got = es.filter(isCollected).length, boss = es.filter(e => e.boss).length;
    body = `<p class="roamCount">${es.length} enem${es.length === 1 ? "y" : "ies"}${boss ? ` · ${boss} boss${boss === 1 ? "" : "es"} 👑` : ""} · ★ ${got}/${es.length} collected</p>
      <div class="roamEs">${es.map(e => `<button class="roamE${isCollected(e) ? " got" : ""}" data-id="${e.id}">${spriteHTML(e, "mini")}<span>${e.name}${e.boss ? " 👑" : ""}</span><small>${KINDS[e.kinds[0]].e}${isCollected(e) ? " ★" : ""}</small></button>`).join("")}</div>`;
  }
  el.innerHTML = head + body;
  el.querySelectorAll(".roamE").forEach(b => b.onclick = () => openCard(BY_ID.get(b.dataset.id)));
  el.querySelectorAll(".roamNav").forEach(b => b.onclick = () => {
    const L = roamMaps(); if (!L.length) return;
    const j = L.findIndex(x => x.id === m.id), k = ((j < 0 ? 0 : j + +b.dataset.step) + L.length) % L.length;
    sfx("click"); openMap(L[k].id);
  });
}
function openRoam(id) {
  if (!roam.on) {
    roam.on = true;
    roam.back = mv.map ? mv.map.id : null;
    $("#viewGeo").dataset.roam = "1";
    drawRoam(); drawOver(); drawFog(); drawPip();
  }
  if (id) {
    const m = mapById(id);
    // jumping to a map from an enemy card: show that game's maps
    if (m && roam.game !== "all" && roam.game !== m.game) { roam.game = m.game; drawRoam(); }
    openMap(id);
  } else if (!mv.map) drawRoamHere();
  else drawRoamHere();
}
function closeRoam() {
  roam.on = false;
  delete $("#viewGeo").dataset.roam;
  $("#geoRoam").innerHTML = "";
  if (roam.back) openMap(roam.back); else closeMap();
  roam.back = null;
  drawFound(); updateGuessBtn(); drawOver(); drawFog(); drawPip();
}
$("#geoRoamBtn").onclick = () => { sfx("open"); openRoam(); };
$("#geoRoamExit").onclick = () => { sfx("click"); closeRoam(); };
