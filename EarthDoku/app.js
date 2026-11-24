// ---------- state ----------
const $ = s => document.querySelector(s);
const MAX_GUESSES = 9;
const ALL_GAMES = ["M1", "EB", "M3"];
const EPOCH = new Date(2026, 10, 24); // puzzle #1

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function puzzleNo() {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  return Math.round((d - EPOCH) / 864e5) + 1;
}
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};
const badge = e => `<span class="gb ${e.game}" title="${GAMES[e.game].full}">${GAMES[e.game].short}</span>`;

let game, world;
function newGame(mode, seed, games) {
  // build into locals so a failed practice grid never breaks the grid already on screen
  const w = buildWorld(games);
  let grid = null;
  for (let n = 0; !grid && n < 6; n++) grid = generate(n ? hashStr(seed + "#" + n) : seed, w);
  if (!grid) {
    if (game) return say("• Couldn't build a fair grid from just those games. Try adding another game.");
    if (mode === "daily") return newGame("practice", (Math.random() * 2 ** 32) >>> 0, ALL_GAMES);
    return;
  }
  world = w;
  const key = mode === "daily" ? "earthdoku3-" + todayKey() : null;
  const saved = key && store.get(key);
  const same = saved && saved.rows && saved.cols && Array.isArray(saved.cells) &&
    saved.rows.join() === grid.rows.join() && saved.cols.join() === grid.cols.join();
  game = same ? saved : {
    mode, key, games, rows:grid.rows, cols:grid.cols,
    cells:Array(9).fill(null), guesses:MAX_GUESSES, done:false
  };
  game.mode = mode;
  $("#results").hidden = true;
  $("#btnDaily").hidden = mode === "daily";
  const names = games.map(g => GAMES[g].l).join(" + ");
  $("#tagline").textContent = mode === "daily"
    ? `Daily enemy grid #${puzzleNo()}`
    : `Infinite grid · ${names}`;
  game.guesses = Math.max(0, game.guesses);
  render(true);
  // a reload during the end-of-game pause could leave a used-up grid open; close it out
  if (game.done || game.guesses <= 0 || game.cells.every(Boolean)) finish(true);
  else if (game.cells.some(Boolean)) say(`• Welcome back! You have ${game.guesses} guesses left.` + markDead());
  else say(`• You encountered a 3×3 grid!\n• Tap a square and name an enemy from ${names} that fits its row AND column. ${MAX_GUESSES} guesses, no repeats.`);
  stateChanged();
}
const save = () => game.key && store.set(game.key, game);
const rowC = i => world.crit.get(game.rows[Math.floor(i / 3)]);
const colC = i => world.crit.get(game.cols[i % 3]);
const cellAnswers = i => answersFor(world, rowC(i), colC(i));
// lets the enemy list know when it may unlock
function stateChanged() { if (window.onGameState) window.onGameState(game); }

// ---------- dialogue typewriter ----------
let sayToken = 0;
function say(text) {
  const el = $("#say"), my = ++sayToken;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) { el.textContent = text; return; }
  el.textContent = "";
  let i = 0;
  (function tick() {
    if (my !== sayToken) return;
    el.textContent = text.slice(0, ++i);
    if (i < text.length) setTimeout(tick, 14);
  })();
}

// ---------- render ----------
function odometer(n) {
  const digits = String(n).padStart(2, "0").split("");
  return `<div class="odo" aria-label="${n} guesses left">${digits.map(d =>
    `<span class="dig"><span class="strip" style="transform:translateY(-${d * 1.15}em)">${
      [...Array(10).keys()].map(k => `<span>${k}</span>`).join("")}</span></span>`).join("")}</div>`;
}
function header(c) {
  return `<div class="win hd"><span class="ic">${c.ic}</span><span class="sub">${c.sub}</span><span class="lb">${c.lb}</span></div>`;
}
function render(first) {
  const b = $("#board");
  if (first) {
    b.innerHTML = `<div class="corner"><span class="sub">GUESSES</span>${odometer(game.guesses)}</div>` +
      game.cols.map(id => header(world.crit.get(id))).join("") +
      [0, 1, 2].map(r => header(world.crit.get(game.rows[r])) +
        [0, 1, 2].map(c => `<button class="cell" data-i="${r * 3 + c}"></button>`).join("")).join("");
    b.querySelectorAll(".cell").forEach(el => el.onclick = () => onCell(+el.dataset.i));
  } else {
    const digits = String(game.guesses).padStart(2, "0");
    b.querySelectorAll(".strip").forEach((s, k) => s.style.transform = `translateY(-${digits[k] * 1.15}em)`);
  }
  b.querySelectorAll(".cell").forEach(el => {
    const i = +el.dataset.i, id = game.cells[i];
    el.classList.toggle("filled", !!id);
    el.classList.toggle("done", game.done);
    el.classList.toggle("missed", game.done && !id);
    if (game.done) el.classList.remove("dead");
    if (id) {
      const e = BY_ID.get(id), n = cellAnswers(i).length;
      el.innerHTML = `${badge(e)}${spriteHTML(e, "em")}<span class="nm">${e.name}</span><span class="ct">1 of ${n}</span>`;
      el.setAttribute("aria-label", `${e.name} from ${GAMES[e.game].l}, one of ${n} answers`);
    } else {
      el.innerHTML = game.done ? `<span class="q">?</span><span class="ct">see answers</span>` : `<span class="q">+</span>`;
      el.setAttribute("aria-label", `${rowC(i).lb} and ${colC(i).lb}`);
    }
  });
  $("#btnGiveUp").hidden = game.done;
  $("#btnShare").hidden = !game.done;
}

function statLine(e) {
  const v = x => has(x) ? x : "?";
  return `HP ${v(e.hp)} · PP ${v(e.pp)} · Off ${v(e.off)} · Def ${v(e.def)} · Spd ${v(e.spd)}`;
}

// ---------- interaction ----------
function onCell(i) {
  if (game.done) return showAnswers(i);
  if (game.cells[i]) return openCard(BY_ID.get(game.cells[i]));
  openSearch(i);
}

// ---------- enemy detail card with stat bars ----------
function openCard(e) {
  // the areas we have full maps of, so the card can jump straight to them in Map Guessr
  const maps = typeof enemyMaps === "function" ? enemyMaps(e) : [];
  const day = collection[e.id];
  const bars = STATS.map(([s, label]) => {
    const p = percentile(e, s), v = e[s];
    return `<div class="sbar"><span class="sl">${label}</span>
      <span class="track" role="img" aria-label="${label} ${has(v) ? v + ", higher than " + p + "% of " + GAMES[e.game].l + " enemies" : "unknown"}">
        ${has(v) ? `<span class="fill" style="width:${Math.max(p, 2)}%"></span>` : ""}</span>
      <span class="sv">${has(v) ? v.toLocaleString() : "?"}</span>
      <span class="sp2">${has(v) ? `beats ${p}%` : "unknown"}</span></div>`;
  }).join("");
  openModal(`${e.name} ${badge(e)}${e.boss ? " 👑" : ""}`, `<div class="card">
    <div class="cardTop">
      <div class="stage">${spriteHTML(e, "big")}</div>
      <div class="facts">
        <div><b>Game</b> ${GAMES[e.game].full}</div>
        <div><b>Kind</b> ${e.kinds.map(k => `${KINDS[k].e} ${KINDS[k].l}`).join(", ")}</div>
        <div><b>Found in</b> ${e.regions.join(", ") || "unlisted"}</div>
        ${maps.length ? `<div class="mapLinks"><b>Maps</b> ${maps.map(m => `<button class="mapLink" data-map="${m.id.replace(/"/g, "&quot;")}" title="Explore this map in free roam">🗺️ ${m.name}</button>`).join("")}</div>` : ""}
        <div class="coll ${day ? "yes" : ""}">${day ? `★ In your collection since ${day}` : "☆ Not collected yet. Place it in a grid to add it."}</div>
      </div>
    </div>
    <h3>Stats <small>bar = share of ${GAMES[e.game].l} enemies it beats</small></h3>
    ${bars}
    ${spriteUrl(e) ? `<p class="credit">Sprite via WikiBound</p>` : ""}
  </div>`);
  document.querySelectorAll("#mBody .mapLink").forEach(b => b.onclick = () => {
    closeModal(); setTab("geo");
    requestAnimationFrame(() => openRoam(b.dataset.map));
  });
}

function openModal(title, html) {
  $("#mTitle").innerHTML = title;
  $("#mBody").innerHTML = html;
  $("#modal").hidden = false;
}
function closeModal() { $("#modal").hidden = true; }
$("#mClose").onclick = closeModal;
$("#modal").onclick = ev => { if (ev.target.id === "modal") closeModal(); };
document.addEventListener("keydown", ev => { if (ev.key === "Escape") closeModal(); });

function openSearch(i) {
  if (hardMode) return openHardSearch(i);
  openModal(`${rowC(i).ic} ${rowC(i).lb} <span style="opacity:.7">×</span> ${colC(i).ic} ${colC(i).lb}`,
    `<input class="search" id="q" placeholder="Who are you fighting?" autocomplete="off" spellcheck="false"><ul class="opts" id="opts"></ul>`);
  const q = $("#q"), opts = $("#opts");
  let list = [], hi = 0;
  const draw = () => {
    const t = norm(q.value);
    if (!t) { opts.innerHTML = `<li class="none">Start typing an enemy name…</li>`; list = []; return; }
    list = world.list.filter(e => norm(e.name).includes(t))
      .sort((a, b) => (norm(b.name).startsWith(t) - norm(a.name).startsWith(t)) || a.name.localeCompare(b.name) || ALL_GAMES.indexOf(a.game) - ALL_GAMES.indexOf(b.game))
      .slice(0, 10);
    hi = Math.min(hi, Math.max(0, list.length - 1));
    opts.innerHTML = list.length
      ? list.map((e, k) => `<li class="${k === hi ? "hi" : ""}" data-k="${k}">${spriteHTML(e, "mini")}<span class="pn">${e.name}</span>${badge(e)}</li>`).join("")
      : `<li class="none">No enemy by that name.</li>`;
    opts.querySelectorAll("li[data-k]").forEach(li => li.onclick = () => { closeModal(); guess(i, list[+li.dataset.k]); });
  };
  q.oninput = () => { hi = 0; draw(); };
  q.onkeydown = ev => {
    if (ev.key === "ArrowDown") { hi = Math.min(hi + 1, list.length - 1); draw(); ev.preventDefault(); }
    if (ev.key === "ArrowUp") { hi = Math.max(hi - 1, 0); draw(); ev.preventDefault(); }
    if (ev.key === "Enter" && list[hi]) { closeModal(); guess(i, list[hi]); }
  };
  draw();
  setTimeout(() => q.focus(), 30);
}

// ---------- hard mode: no suggestion list, the full name has to be typed ----------
let hardMode = !!store.get("earthdoku-hard");
$("#hardMode").checked = hardMode;
$("#hardMode").onchange = ev => {
  hardMode = ev.target.checked;
  store.set("earthdoku-hard", hardMode);
  say(hardMode ? "• 🔥 Hard mode on! No suggestions: type each enemy's full name. Squares pay 1.5× money."
               : "• Hard mode off. Suggestions are back.");
};
const editDist = (a, b) => {
  const d = Array.from({length:a.length + 1}, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
};
function openHardSearch(i) {
  openModal(`🔥 ${rowC(i).ic} ${rowC(i).lb} <span style="opacity:.7">×</span> ${colC(i).ic} ${colC(i).lb}`,
    `<form id="hardForm" autocomplete="off"><input class="search" id="q" placeholder="Type the enemy's full name…" spellcheck="false"></form>
     <p class="hardMsg" id="hardMsg">Hard mode: no suggestions. Press Enter to guess. Misspelled names don't cost a guess.</p><div class="hardPick" id="hardPick"></div>`);
  const q = $("#q");
  $("#hardForm").onsubmit = ev => {
    ev.preventDefault();
    const t = norm(q.value);
    $("#hardPick").innerHTML = "";
    if (!t) return;
    let hits = world.list.filter(e => norm(e.name) === t);
    // forgive one slip in longer names, but never guess for the player when it's ambiguous
    if (!hits.length && t.length >= 6) {
      const near = world.list.filter(e => editDist(norm(e.name), t) <= 1);
      if (new Set(near.map(e => e.name)).size === 1) hits = near;
    }
    if (!hits.length) {
      $("#hardMsg").textContent = `No enemy called “${q.value.trim()}”. No guess used. Check the spelling!`;
      q.classList.remove("nope"); void q.offsetWidth; q.classList.add("nope");
      return;
    }
    if (hits.length === 1) { closeModal(); guess(i, hits[0]); return; }
    // same name in more than one game (Starman, Mr. Batty…): pick which one you mean
    $("#hardMsg").textContent = `${hits[0].name} appears in ${hits.length} games. Which one?`;
    $("#hardPick").innerHTML = hits.map((e, k) => `<button class="btn" data-k="${k}">${GAMES[e.game].l}</button>`).join("");
    $("#hardPick").querySelectorAll("button").forEach(b => b.onclick = () => { closeModal(); guess(i, hits[+b.dataset.k]); });
  };
  setTimeout(() => q.focus(), 30);
}

// After a correct pick, check the empty squares can still be filled with unused enemies.
// Each square starts with a valid fill, but a player's own picks can use up a square's only answers.
function markDead() {
  const used = new Set(game.cells.filter(Boolean));
  const empty = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter(i => !game.cells[i]);
  const left = empty.map(i => cellAnswers(i).filter(e => !used.has(e.id)));
  const dead = empty.filter((i, k) => !left[k].length);
  document.querySelectorAll(".cell").forEach(el => el.classList.toggle("dead", dead.includes(+el.dataset.i)));
  if (dead.length) return `\n• Heads up: ${dead.length === 1 ? "one square has" : dead.length + " squares have"} no unused answers left (marked ✖).`;
  if (empty.length && !hasMatching(left)) return `\n• Heads up: the empty squares now share too few answers to all be filled.`;
  return "";
}

function guess(i, e) {
  if (game.done || game.guesses <= 0 || game.cells[i]) return;
  const tag = `${e.name} (${GAMES[e.game].l})`;
  if (game.cells.includes(e.id)) return say(`• ${tag} is already on the board! Pick someone else.`);
  game.guesses--;
  // a grid only counts as Hard if every guess was made with hard mode on
  if (hardMode) game.hardUsed = true; else game.easyUsed = true;
  const r = rowC(i), c = colC(i), cellEl = document.querySelector(`.cell[data-i="${i}"]`);
  if (r.test(e) && c.test(e)) {
    game.cells[i] = e.id;
    const n = cellAnswers(i).length, fresh = collect(e, todayKey());
    render();
    cellEl.classList.add("pop");
    if (window.sfx) sfx(fresh ? "reward" : "smash");
    cellEl.insertAdjacentHTML("beforeend", `<span class="smash">${fresh ? "NEW! ★" : (window.hitWord ? hitWord() : "SMAAAASH!!")}</span>`);
    setTimeout(() => cellEl.classList.remove("pop"), 500);
    const cs = collectionStats();
    const cash = window.shopGridCash ? shopGridCash(n, game.mode !== "daily", hardMode) : "";
    say(`• ${window.hitWord ? hitWord() : "SMAAAASH!!"} ${tag} fits!\n• Only ${n} enem${n === 1 ? "y" : "ies"} could go there.` +
      (fresh ? `\n• ★ New to your collection! (${cs.have}/${cs.total})` : "") + cash +
      (game.guesses > 0 ? markDead() : ""));
    drawEotd();
  } else {
    const fail = !r.test(e) ? r : c;
    render();
    cellEl.classList.add("shake");
    if (window.sfx) sfx("bad");
    setTimeout(() => cellEl.classList.remove("shake"), 450);
    say(`• ${tag} dodged quickly!\n• It doesn't match “${fail.sub} ${fail.lb}”.`);
  }
  // lock input right away so nothing can be guessed during the end-of-game pause
  if (game.guesses <= 0 || game.cells.every(Boolean)) { game.done = true; setTimeout(() => finish(), 900); }
  save();
}

function score() {
  const right = game.cells.filter(Boolean).length;
  const iq = game.cells.reduce((s, id, i) => id ? s + Math.ceil(100 / cellAnswers(i).length) : s, 0);
  return {right, iq};
}
const emojiGrid = () => [0, 1, 2].map(r => [0, 1, 2].map(c => game.cells[r * 3 + c] ? "🟩" : "⬛").join("")).join("\n");

function finish(silent) {
  game.done = true; save(); render();
  const {right, iq} = score();
  // keep the score with the save so the Stats tab can chart it later
  game.right = right; game.iq = iq; save();
  if (!silent && window.sfx) sfx(right >= 6 ? "win" : "lose");
  const msg = right === 9 ? "YOU WON! Perfect grid." : right >= 6 ? "YOU WON!" : right >= 3 ? "The battle ended." : "You lost the battle…";
  const res = $("#results");
  res.hidden = false;
  const cs = collectionStats();
  res.innerHTML = `<div>${msg}</div><div class="big">${right}/9</div>
    <div>Grid IQ <b>${iq}</b> · harder squares earn more IQ</div><pre>${emojiGrid()}</pre>
    <div style="margin-top:6px;opacity:.85">★ Collection ${cs.have}/${cs.total} · tap a square to see every answer</div>`;
  // a perfect grid pays a bonus (only once, when it actually finishes)
  const bonus = !silent && right === 9 && window.shopBonusCash ? shopBonusCash(100, "Perfect grid", game.mode !== "daily") : "";
  if (!silent) say(`• ${msg}\n• You filled ${right} of 9 squares. Tap any square to see all the answers.` + bonus);
  else say(`• You already played this grid: ${right}/9. Browse the enemy list, try an infinite grid, or come back tomorrow.`);
  stateChanged();
  if (window.checkAch) checkAch();
}

function showAnswers(i) {
  const list = cellAnswers(i), mine = game.cells[i];
  openModal(`${rowC(i).ic} ${rowC(i).lb} × ${colC(i).ic} ${colC(i).lb}<br><small style="font-family:var(--mono)">${list.length} valid enemies</small>`,
    `<ul class="ans">${list.map(e => `<li class="${e.id === mine ? "mine" : ""}" data-id="${e.id}" tabindex="0">${spriteHTML(e, "mini")}<span class="an">${e.name} ${badge(e)}${e.boss ? " 👑" : ""}${isCollected(e) ? ` <span class="star" title="Collected">★</span>` : ""}</span><small>${statLine(e)}</small></li>`).join("")}</ul>`);
  document.querySelectorAll(".ans li").forEach(li => {
    li.onclick = () => openCard(BY_ID.get(li.dataset.id));
    li.onkeydown = ev => { if (ev.key === "Enter") li.onclick(); };
  });
}

// ---------- enemy of the day ----------
function drawEotd() {
  const e = enemyOfTheDay(todayKey()), el = $("#eotd");
  el.innerHTML = `${spriteHTML(e, "eo")}<div class="eoText"><span class="sub">ENEMY OF THE DAY</span>
    <span class="eoName">${e.name} ${badge(e)}${e.boss ? " 👑" : ""}</span>
    <span class="eoMeta">${KINDS[e.kinds[0]].e} ${KINDS[e.kinds[0]].l} · ${isCollected(e) ? "★ collected" : "☆ not collected"}</span></div>`;
  el.onclick = () => openCard(e);
}

// ---------- buttons ----------
let giveUpArmed = false;
$("#btnGiveUp").onclick = ev => {
  if (!giveUpArmed) {
    giveUpArmed = true; ev.target.textContent = "Really give up?";
    setTimeout(() => { giveUpArmed = false; ev.target.textContent = "Give up"; }, 3000);
    return;
  }
  giveUpArmed = false; ev.target.textContent = "Give up"; finish();
};
const practiceGames = () => [...document.querySelectorAll("#practiceGames input:checked")].map(i => i.value);
$("#btnPractice").onclick = () => {
  const g = practiceGames();
  if (!g.length) return say("• Pick at least one game for infinite grids.");
  newGame("practice", (Math.random() * 2 ** 32) >>> 0, g);
};
const startDaily = () => newGame("daily", hashStr("earthdoku3" + todayKey()), ALL_GAMES);
$("#btnDaily").onclick = startDaily;
$("#btnHelp").onclick = () => openModal("How to play", `<div class="help">
  • Each square needs an enemy that matches its <b>row</b> and its <b>column</b>.<br>
  • The daily grid mixes Mother, EarthBound and Mother 3. Infinite grids can use any mix.<br>
  • You get ${MAX_GUESSES} guesses. Wrong guesses still use one up.<br>
  • 🔥 Hard mode (checkbox under the buttons) hides the suggestion list: type the enemy's full name and press Enter. Misspelled names don't cost a guess, and every square pays 1.5× money. Grids played fully on Hard get a 🔥 in their share text.<br>
  • Each enemy can only be used once. Same‑named enemies from different games (like Starman) count as different enemies.<br>
  • “Found in” uses the areas the EarthBound Wiki lists for that enemy.<br>
  • Bosses count as enemies too.<br>
  • Tap a filled square to open its enemy card with sprite and stat bars.<br>
  • Grid IQ rewards filling squares with fewer possible answers.<br>
  • Every enemy you place correctly joins your ★ collection (saved in this browser). Track it in the enemy list.<br>
  • 💰 Every square you fill earns money (rarer squares pay more, perfect grids pay a $100 bonus). Spend it on window skins in 🪐 Saturn's shop.<br>
  • The Enemy of the Day changes daily. It's a free peek, not a hint for today's grid.<br>
  • The enemy list and its charts unlock once the current grid is finished.<br>
  • Pick which window you wear in Saturn's shop, just like the game's text boxes.<br>
  • A new daily grid appears every day at midnight.
  <h3>About the data</h3>
  • Stats &amp; locations come from the EarthBound Wiki's enemy lists for each game (Mother 3 uses fan translation names), with EarthBound areas cross‑checked against WikiBound.<br>
  • Battle sprites are loaded from WikiBound (the Fierce Pork Trooper's from the EarthBound Wiki). Tiny Li'l Ghost is invisible in battle, so it shows its kind's emoji instead.<br>
  • Enemy “kinds” are a fan grouping made for this game; the series has no official types.<br>
  • Stats missing from the source count as unknown and never match a stat square.<br>
  • Each game uses its own stat scale, so stat bars compare an enemy only with others from the same game.</div>`);
$("#btnShare").onclick = async () => {
  const {right, iq} = score();
  const hard = game.hardUsed && !game.easyUsed ? " · 🔥 Hard" : "";
  const text = `EarthDoku ${game.mode === "daily" ? "#" + puzzleNo() : "(infinite)"} · ${right}/9 · IQ ${iq}${hard}\n${emojiGrid()}`;
  try { await navigator.clipboard.writeText(text); say("• Copied your result! Paste it anywhere."); }
  catch { openModal("Copy your result", `<textarea class="search" rows="5" readonly>${text}</textarea>`); }
};

drawEotd();

const count = g => ALL.filter(e => e.game === g).length;
$("#totals").textContent = `${ALL.length} enemies (${count("M1")} M1 · ${count("EB")} EB · ${count("M3")} M3)`;
