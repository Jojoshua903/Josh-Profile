// ---------- minigames: quick games that all pay money for Saturn's shop ----------
const MG_KEY = "earthdoku-mini";
const mg = Object.assign({best:{}, plays:{}, xpDay:{}, hist:[]}, store.get(MG_KEY) || {});
const mgSave = () => store.set(MG_KEY, mg);
const mgRand = arr => arr[Math.floor(Math.random() * arr.length)];
const mgShuffle = arr => arr.map(v => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(p => p[1]);
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;"}[c]));
let mgCur = null;   // id of the game on screen
let mgTimer = null; // blitz clock

// a name typed by the player matches if it's exact, or one slip away in longer names
const nameHit = (typed, name) => { const t = norm(typed), n = norm(name); return t === n || (t.length >= 6 && editDist(t, n) <= 1); };

// end of a run: save the best, log it, pay out (full pay for the first run of each game per day)
function mgEnd(id, score, base, line) {
  const prev = mg.best[id];
  const isBest = prev == null || score > prev;
  if (isBest) mg.best[id] = score;
  mg.plays[id] = (mg.plays[id] || 0) + 1;
  mg.hist.push({d:todayKey(), g:id, s:score});
  mg.hist = mg.hist.slice(-300);
  const first = mg.xpDay[id] !== todayKey();
  mg.xpDay[id] = todayKey();
  mgSave();
  const name = (MINIGAMES.find(g => g.id === id) || {name:"Minigame"}).name;
  const cash = window.shopMiniCash ? shopMiniCash(base, first, name) : "";
  sfx(score > 0 ? "win" : "lose");
  drawMgMenu();
  return `<div class="mgEnd"><b>${line}</b>${isBest && prev != null ? `<span class="mgNew">🏆 New best!</span>` : ""}
    ${cash ? `<small>${cash}</small>` : `<small>Score some points to earn money for Saturn's shop.</small>`}
    <div class="mgBtns"><button class="btn hot" id="mgAgain">Play again</button><button class="btn" id="mgBack">All minigames</button></div></div>`;
}
function bindEnd() {
  const a = $("#mgAgain"), b = $("#mgBack");
  if (a) a.onclick = () => startMg(mgCur);
  if (b) b.onclick = () => { mgCur = null; drawMgIntro(); drawMgMenu(); };
}
const stage = () => $("#mgStage");

// ---------- 1. Higher or Lower ----------
const HL_STATS = [["hp", "HP"], ["off", "Offense"], ["def", "Defense"], ["spd", "Speed"], ["pp", "PP"]];
let hl;
function hlPair(keep) {
  const [s, lb] = mgRand(HL_STATS);
  // compare within one game, since each game uses its own stat scale
  const g = keep ? keep.game : mgRand(ALL_GAMES);
  const pool = ALL.filter(e => e.game === g && has(e[s]));
  const a = keep && has(keep[s]) ? keep : mgRand(pool);
  let b; do b = mgRand(pool); while (b.id === a.id);
  return {s, lb, a, b};
}
function startHL() { hl = {streak:0, ...hlPair()}; drawHL(); }
function hlCard(e, val) {
  return `<div class="hlCard">${spriteHTML(e, "mgSpr")}<b>${e.name}</b>${badge(e)}<span class="hlVal">${val}</span></div>`;
}
function drawHL(result) {
  const {a, b, s, lb, streak} = hl;
  stage().innerHTML = `<h2>⬆️⬇️ Higher or Lower <small>streak ${streak}</small></h2>
    <p class="mgSay">${result || `Does <b>${b.name}</b> have higher or lower <b>${lb}</b> than ${a.name}? Ties count as right.`}</p>
    <div class="hlRow">${hlCard(a, `${lb} ${a[s]}`)}<span class="hlVs">VS</span>${hlCard(b, result ? `${lb} ${b[s]}` : `${lb} ?`)}</div>
    <div class="mgBtns" id="hlBtns">${result ? "" : `<button class="btn hot" data-h="1">⬆️ Higher</button><button class="btn hot" data-h="0">⬇️ Lower</button>`}</div>`;
  document.querySelectorAll("#hlBtns [data-h]").forEach(btn => btn.onclick = () => hlAnswer(btn.dataset.h === "1"));
}
function hlAnswer(up) {
  const {a, b, s} = hl;
  const right = a[s] === b[s] || (up ? b[s] > a[s] : b[s] < a[s]);
  if (right) {
    hl.streak++; sfx("ok");
    drawHL(`✔️ ${b.name} has ${hl.lb} ${b[s]}. Streak ${hl.streak}!`);
    setTimeout(() => { if (mgCur !== "hl") return; Object.assign(hl, hlPair(b)); drawHL(); }, 1100);
  } else {
    sfx("bad");
    drawHL(`✖ ${b.name} has ${hl.lb} ${b[s]}, ${b[s] > a[s] ? "higher" : "lower"} than ${a[s]}.`);
    $("#hlBtns").innerHTML = mgEnd("hl", hl.streak, 5 + hl.streak * 4, `Streak of ${hl.streak}`);
    bindEnd();
  }
}

// ---------- 2. Silhouette Guessr ----------
const SIL_ROUNDS = 5;
let sil;
function startSil() {
  // Mother sprites have solid backgrounds, so their silhouettes are just black boxes: only EarthBound and Mother 3 here
  const pool = mgShuffle(ALL.filter(e => e.game !== "M1" && spriteUrl(e)));
  sil = {rounds:pool.slice(0, SIL_ROUNDS), i:0, step:0, pts:[], done:false, msg:""};
  drawSil();
}
function silClues(e, step) {
  const c = [];
  if (step >= 1) c.push(`🎮 ${GAMES[e.game].l}`);
  if (step >= 2) c.push(`${e.kinds.map(k => KINDS[k] ? KINDS[k].e + " " + KINDS[k].l : k).join(", ")}${has(e.hp) ? ` · ❤️ HP ${e.hp}` : ""}`);
  if (step >= 3) c.push(`🔤 Starts with “${e.name[0]}” · ${e.name.split(/\s+/).length} word${e.name.split(/\s+/).length > 1 ? "s" : ""}`);
  return c;
}
function drawSil() {
  const e = sil.rounds[sil.i], over = sil.pts[sil.i] != null;
  const total = sil.pts.reduce((s, p) => s + p, 0);
  stage().innerHTML = `<h2>👤 Silhouette Guessr <small>round ${sil.i + 1}/${SIL_ROUNDS} · ${total} pts</small></h2>
    <div class="silWrap"><img class="silImg${over ? " shown" : ""}" data-step="${sil.step}" src="${spriteUrl(e)}" alt="Mystery enemy silhouette" referrerpolicy="no-referrer" draggable="false"></div>
    <ul class="silClues">${silClues(e, over ? 3 : sil.step).map(c => `<li>${c}</li>`).join("")}</ul>
    <p class="mgSay">${sil.msg || `Who's that enemy? Worth ${4 - sil.step} pts now. Each wrong guess or hint costs 1.`}</p>
    ${over ? `<div class="mgBtns" id="silEnd"><button class="btn hot" id="silNext">${sil.i < SIL_ROUNDS - 1 ? "Next enemy ▶" : "Results ▶"}</button></div>`
      : `<form class="mgForm" id="silForm" autocomplete="off"><input class="search" id="silQ" placeholder="Type the enemy's name…" spellcheck="false"><button class="btn hot">Guess</button><button class="btn" type="button" id="silHint">${sil.step < 3 ? "Hint (−1)" : "Give up"}</button></form>`}`;
  if (over) { $("#silNext").onclick = silNext; return; }
  $("#silForm").onsubmit = ev => {
    ev.preventDefault();
    const v = $("#silQ").value.trim();
    if (!v) return;
    if (nameHit(v, e.name)) { silScore(4 - sil.step, `✔️ SMAAAASH!! It's ${e.name} (${GAMES[e.game].l})! +${4 - sil.step}`); sfx("smash"); }
    else { sfx("bad"); silWorse(`✖ Not “${esc(v)}”.`); }
  };
  $("#silHint").onclick = () => silWorse("");
  setTimeout(() => $("#silQ") && $("#silQ").focus(), 30);
}
function silWorse(msg) {
  const e = sil.rounds[sil.i];
  if (sil.step >= 3) { silScore(0, `${msg} It was ${e.name} (${GAMES[e.game].l}).`); return; }
  sil.step++; sil.msg = msg + (msg ? " " : "") + `New clue! Now worth ${4 - sil.step}.`; drawSil();
}
function silScore(p, msg) { sil.pts[sil.i] = p; sil.msg = msg; drawSil(); }
function silNext() {
  if (sil.i < SIL_ROUNDS - 1) { sil.i++; sil.step = 0; sil.msg = ""; drawSil(); return; }
  const total = sil.pts.reduce((s, p) => s + p, 0);
  $("#silEnd").innerHTML = mgEnd("sil", total, total * 3, `${total}/${SIL_ROUNDS * 4} pts`);
  bindEnd();
}

// ---------- 3. Connections ----------
let con;
function conGroups() {
  const w = buildWorld(ALL_GAMES);
  // "Found in" groups would spoil today's grid, so they only show up after it's finished
  const pool = w.pool.filter(c => (c.fam !== "region" || listUnlocked) && c.fam !== "multi");
  for (let tries = 0; tries < 400; tries++) {
    const picks = [], fams = new Set();
    for (const c of mgShuffle(pool)) { if (!fams.has(c.fam)) { picks.push(c); fams.add(c.fam); } if (picks.length === 4) break; }
    // each enemy must fit exactly one of the four groups, so there's only one solution
    const groups = picks.map(c => w.list.filter(e => c.test(e) && picks.every(o => o === c || !o.test(e))));
    if (groups.every(g => g.length >= 4)) {
      // no two tiles share a name (Starman is in more than one game)
      const used = new Set();
      const sets = groups.map(g => {
        const s = [];
        for (const e of mgShuffle(g)) { if (s.length === 4) break; if (!used.has(e.name)) { used.add(e.name); s.push(e); } }
        return s;
      });
      if (sets.some(s => s.length < 4)) continue;
      return picks.map((c, i) => ({c, ids:sets[i].map(e => e.id)}));
    }
  }
  return null;
}
function startCon() {
  const groups = conGroups();
  if (!groups) { stage().innerHTML = `<p class="mgSay">Couldn't build a puzzle this time. Try again!</p>`; return; }
  con = {groups, tiles:mgShuffle(groups.flatMap(g => g.ids)), sel:new Set(), solved:[], left:4, msg:"", done:false};
  drawCon();
}
function drawCon() {
  const solvedIds = new Set(con.solved.flatMap(i => con.groups[i].ids));
  const rows = con.solved.map(i => { const g = con.groups[i];
    return `<div class="conRow c${con.solved.indexOf(i)}"><b>${g.c.ic} ${g.c.sub}: ${g.c.lb}</b><span>${g.ids.map(id => BY_ID.get(id).name).join(" · ")}</span></div>`; }).join("");
  const tiles = con.tiles.filter(id => !solvedIds.has(id)).map(id => { const e = BY_ID.get(id);
    return `<button class="conTile${con.sel.has(id) ? " on" : ""}" data-id="${id}">${spriteHTML(e, "mini")}<span>${e.name}</span>${badge(e)}</button>`; }).join("");
  stage().innerHTML = `<h2>🧩 Connections <small>${"❤️".repeat(con.left)}${"🖤".repeat(4 - con.left)}</small></h2>
    <p class="mgSay">${con.msg || "Find four groups of four. Groups use the same rules as grid headers: kind, game, stats, name, boss" + (listUnlocked ? ", location" : "") + "."}</p>
    <div class="conRows">${rows}</div><div class="conGrid">${tiles}</div>
    <div class="mgBtns" id="conBtns">${con.done ? "" : `<button class="btn" id="conShuf">🔀 Shuffle</button><button class="btn" id="conClr">Deselect</button><button class="btn hot" id="conGo" ${con.sel.size === 4 ? "" : "disabled"}>Submit</button>`}</div>`;
  if (con.done) return;
  document.querySelectorAll(".conTile").forEach(t => t.onclick = () => {
    const id = t.dataset.id;
    if (con.sel.has(id)) con.sel.delete(id); else if (con.sel.size < 4) con.sel.add(id);
    sfx("click"); con.msg = ""; drawCon();
  });
  $("#conShuf").onclick = () => { con.tiles = mgShuffle(con.tiles); drawCon(); };
  $("#conClr").onclick = () => { con.sel.clear(); drawCon(); };
  $("#conGo").onclick = conSubmit;
}
function conSubmit() {
  const sel = [...con.sel];
  const gi = con.groups.findIndex((g, i) => !con.solved.includes(i) && sel.every(id => g.ids.includes(id)));
  if (gi >= 0) {
    con.solved.push(gi); con.sel.clear(); sfx("smash");
    con.msg = `✔️ ${con.groups[gi].c.ic} ${con.groups[gi].c.lb}!`;
  } else {
    con.left--; sfx("bad");
    const close = con.groups.some((g, i) => !con.solved.includes(i) && sel.filter(id => g.ids.includes(id)).length === 3);
    con.msg = close ? "✖ One away…" : "✖ Not a group.";
  }
  const won = con.solved.length === 4, lost = con.left <= 0;
  if (won || lost) {
    con.done = true;
    const n = con.solved.length;
    if (lost) con.groups.forEach((g, i) => { if (!con.solved.includes(i)) con.solved.push(i); });
    drawCon();
    // best score: groups found ×10 + hearts left
    $("#conBtns").innerHTML = mgEnd("con", n * 10 + con.left, n * 10 + con.left * 6,
      won ? `Solved with ${con.left} ❤️ left!` : `Found ${n} of 4 groups`);
    bindEnd();
  } else drawCon();
}

// ---------- 4. Enemy Chain ----------
let chain;
function chainLink(a, b) {
  const k = a.kinds.find(x => b.kinds.includes(x));
  if (k) return `${KINDS[k] ? KINDS[k].e + " " + KINDS[k].l : k}`;
  const r = a.game === b.game && a.regions.find(x => b.regions.includes(x));
  return r ? `📍 ${r}` : null;
}
function startChain() {
  if (!listUnlocked) {
    stage().innerHTML = `<h2>🔗 Enemy Chain</h2><p class="mgSay">🔒 Enemy Chain opens once today's grid is finished, since it uses where enemies live.</p>`;
    return;
  }
  const first = mgRand(ALL.filter(e => e.kinds.length && e.regions.length));
  chain = {list:[first.id], lives:3, msg:"", done:false};
  drawChain();
}
function drawChain() {
  const cur = BY_ID.get(chain.list[chain.list.length - 1]);
  stage().innerHTML = `<h2>🔗 Enemy Chain <small>length ${chain.list.length - 1} · ${"❤️".repeat(chain.lives)}${"🖤".repeat(3 - chain.lives)}</small></h2>
    <p class="mgSay">${chain.msg || "Name an enemy that shares a <b>kind</b> with the current one, or lives in the <b>same place</b> in the same game. No repeats!"}</p>
    <div class="chainCur">${spriteHTML(cur, "mgSpr")}<div><b>${cur.name}</b> ${badge(cur)}<br><small>${cur.kinds.map(k => KINDS[k] ? KINDS[k].e + " " + KINDS[k].l : k).join(", ")} · 📍 ${cur.regions.join(", ") || "?"}</small></div></div>
    ${chain.done ? "" : `<form class="mgForm" id="chForm" autocomplete="off"><input class="search" id="chQ" placeholder="Next enemy…" spellcheck="false"><button class="btn hot">Link</button><button class="btn" type="button" id="chStop">End chain</button></form><div class="chSug" id="chSug"></div>`}
    <div class="chainList">${chain.list.map(id => { const e = BY_ID.get(id); return `<span title="${e.name}">${spriteHTML(e, "mini")}</span>`; }).join("<i>›</i>")}</div>
    <div id="chEnd"></div>`;
  if (chain.done) return;
  const q = $("#chQ");
  const tryE = e => {
    const used = chain.list.includes(e.id), link = !used && chainLink(cur, e);
    if (link) { chain.list.push(e.id); chain.msg = `✔️ ${e.name} links by ${link}!`; sfx("ok"); drawChain(); return; }
    chain.lives--; sfx("bad");
    chain.msg = used ? `✖ ${e.name} is already in the chain.` : `✖ ${e.name} (${GAMES[e.game].l}) doesn't share a kind or place with ${cur.name}.`;
    if (chain.lives <= 0) return chainOver();
    drawChain();
  };
  q.oninput = () => {
    const t = norm(q.value);
    $("#chSug").innerHTML = t.length < 2 ? "" : ALL.filter(e => norm(e.name).includes(t)).slice(0, 6)
      .map(e => `<button class="chS" data-id="${e.id}">${spriteHTML(e, "mini")} ${e.name} ${badge(e)}</button>`).join("");
    document.querySelectorAll(".chS").forEach(b => b.onclick = () => tryE(BY_ID.get(b.dataset.id)));
  };
  $("#chForm").onsubmit = ev => {
    ev.preventDefault();
    const hits = ALL.filter(e => nameHit(q.value, e.name));
    if (!hits.length) { chain.msg = `No enemy called “${esc(q.value.trim())}”. No life lost.`; drawChain(); return; }
    tryE(hits.find(e => !chain.list.includes(e.id) && chainLink(cur, e)) || hits[0]);
  };
  $("#chStop").onclick = chainOver;
  setTimeout(() => q.focus(), 30);
}
function chainOver() {
  chain.done = true;
  const n = chain.list.length - 1;
  drawChain();
  $("#chEnd").innerHTML = mgEnd("chain", n, n * 5, `Chain of ${n}`);
  bindEnd();
}

// ---------- 5. Place Blitz ----------
const BLITZ_SECS = 60;
// towns and areas with no enemies and no map, so they'd otherwise be missing (names from WikiBound's location lists)
const EXTRA_PLACES = [
  ["M1", "Canary Village"], ["M1", "Union Station"], ["M1", "Twinkle Elementary School", "Twinkle Elementary"],
  ["EB", "Dalaam"], ["EB", "Tenda Village", "Tenda"], ["EB", "Burglin Park"],
  ["M3", "Tazmily Village", "Tazmily"], ["M3", "East Tazmily Village"], ["M3", "Cerulean Beach", "Cerulean"],
  ["M3", "Unknown Valley"], ["M3", "Railway"], ["M3", "Ropeway"], ["M3", "Old Man's Paradise"], ["M3", "Yado Inn"],
  ["M3", "Alec's Log House", "Alec's House"], ["M3", "Mole Cricket Hole"], ["M3", "Clayman Factory"], ["M3", "Club Titiboo", "Titiboo"]
];
let BLITZ = null;
function blitzPlaces() {
  if (BLITZ) return BLITZ;
  const by = new Map();
  const add = (name, game, keys) => keys.forEach(k => {
    if (!k) return;
    const p = by.get(k) || {name, games:new Set()};
    p.games.add(game); by.set(k, p);
  });
  ALL.forEach(e => e.regions.forEach(r => add(r, e.game, [mapKey(r)])));
  // "Tazmily Village (Chapters 1–3)" and "(Chapters 4–7)" count as one place
  MAPS.filter(m => !/^Room sheet/.test(m.name)).forEach(m => add(m.area || m.name.replace(/\s*\(.*\)$/, ""), m.game, [mapKey(m.name), ...m.keys.filter(k => k.length > 2), m.area && mapKey(m.area)]));
  EXTRA_PLACES.forEach(([game, name, ...alt]) => add(name, game, [name, ...alt].map(mapKey)));
  // one entry per place name, reachable from all its spellings
  const places = new Map();
  by.forEach((p, k) => { const id = mapKey(p.name); if (!places.has(id)) places.set(id, {name:p.name, games:new Set()}); p.games.forEach(g => places.get(id).games.add(g)); });
  const keys = new Map();
  by.forEach((p, k) => keys.set(k, mapKey(p.name)));
  return BLITZ = {places, keys};
}
let blz;
function startBlitz() {
  clearInterval(mgTimer);
  blz = {found:[], left:BLITZ_SECS, started:false, done:false, msg:""};
  drawBlitz();
}
function drawBlitz() {
  const {places} = blitzPlaces();
  stage().innerHTML = `<h2>⏱️ Place Blitz <small>${blz.found.length} found · <span id="bzT">${blz.left}s</span></small></h2>
    <p class="mgSay" id="bzSay">${blz.msg || `Name as many places from the series as you can in ${BLITZ_SECS} seconds: towns, caves, dungeons, any game. The clock starts on your first answer.`}</p>
    ${blz.done ? "" : `<form class="mgForm" id="bzForm" autocomplete="off"><input class="search" id="bzQ" placeholder="Onett, Tazmily, Magicant…" spellcheck="false"><button class="btn hot">Enter</button></form>`}
    <div class="bzFound">${blz.found.map(id => { const p = places.get(id);
      return `<span class="chip">${p.name} ${[...p.games].map(g => `<span class="gb ${g}">${GAMES[g].short}</span>`).join("")}</span>`; }).join("")}</div>
    <div id="bzEnd"></div>`;
  if (blz.done) return;
  const q = $("#bzQ");
  $("#bzForm").onsubmit = ev => {
    ev.preventDefault();
    const t = mapKey(q.value);
    if (!t) return;
    const {keys} = blitzPlaces();
    let id = keys.get(t);
    if (!id && t.length >= 6) { const near = [...keys.keys()].filter(k => editDist(k, t) <= 1); if (near.length === 1) id = keys.get(near[0]); }
    if (!blz.started) { blz.started = true; mgTimer = setInterval(blitzTick, 1000); }
    if (!id) { blz.msg = `✖ “${esc(q.value.trim())}” isn't a place we know.`; sfx("bad"); }
    else if (blz.found.includes(id)) { blz.msg = `Already got ${places.get(id).name}!`; sfx("bad"); }
    else { blz.found.unshift(id); blz.msg = `✔️ ${places.get(id).name}!`; sfx("ok"); }
    drawBlitz();
  };
  setTimeout(() => q.focus(), 30);
}
function blitzTick() {
  if (mgCur !== "blitz") { clearInterval(mgTimer); return; }
  blz.left--;
  const t = $("#bzT"); if (t) t.textContent = blz.left + "s";
  if (blz.left <= 5 && blz.left > 0) sfx("tick");
  if (blz.left > 0) return;
  clearInterval(mgTimer);
  blz.done = true;
  const {places} = blitzPlaces(), n = blz.found.length;
  const missed = mgShuffle([...places.keys()].filter(k => !blz.found.includes(k))).slice(0, 8).map(k => places.get(k).name);
  blz.msg = `⏰ Time! You named ${n} of ${places.size} places.` + (missed.length ? ` Some you missed: ${missed.join(", ")}.` : "");
  drawBlitz();
  $("#bzEnd").innerHTML = mgEnd("blitz", n, n * 4, `${n} places in ${BLITZ_SECS}s`);
  bindEnd();
}

// ---------- 6. Song Quiz (EarthBound): song title → where it plays ----------
// fan names and locations from the EarthBound Wiki music list (titles that name their own place are left out)
const EB_SONGS = [
  ["Sunrise & Onett Theme", "Onett"], ["One Fateful Night...", "Onett"], ["Onett's Arcade", "Onett"], ["Home Sweet Home", "Onett", "Ness's house"],
  ["Happy-Happy is Blue", "Happy Happy Village"], ["Dead-End Chaos Theatre", "Twoson", "the Chaos Theater"],
  ["Runaway Five ~ The Daily Show", "Twoson", "the Runaway Five's first show"], ["Heartless Hotel", "Threed", "the hotel on your first visit"],
  ["Snowman (Snow Wood Boarding House)", "Winters", "Snow Wood Boarding School"], ["Dr. Andonuts' Lab", "Winters", "Dr. Andonuts' lab"],
  ["Tessie!", "Winters", "riding Tessie on Lake Tess"], ["Hi Hi Hi", "Saturn Valley"], ["Super Dry Dance", "Dusty Dunes Desert"],
  ["Save the Miners!", "Gold Mine", "until all five moles are beaten"], ["Topolla Theatre, Home to the One & Only Venus", "Fourside"],
  ["Venus Live", "Fourside", "Venus's show at the Topolla Theater"], ["Boris' Cocktail", "Fourside", "Jackie's Café"],
  ["Runaway Five's Final Performance", "Fourside", "the Runaway Five's last show"], ["Bad Morning to You", "Moonside", "waking up in its hotel"],
  ["Mu Training", "Dalaam", "Poo's Mu training"], ["Bazaar", "Scaraba", "the town"], ["Morning in the Desert", "Scaraba", "waking up there"],
  ["The Unforgiving Desert", "Scaraba", "its desert"], ["Inside the Dungeon", "Dungeon Man"], ["The Submarine", "Deep Darkness", "the sub ride there"],
  ["The Tendas' Cave", "Tenda Village"], ["Eight Melodies", "Magicant", "its introduction"], ["Welcome Home", "Magicant"],
  ["The Jolly Flying Man", "Magicant", "the Flying Man's house"], ["Sea of Eden", "Magicant", "the Sea of Eden"], ["The Place", "Cave of the Past"]
];
const SONG_DECOYS = ["Peaceful Rest Valley", "Summers", "Lost Underworld", "Grapefruit Falls", "Lilliput Steps", "Milky Well"];
const SONG_ROUNDS = 8;
let sq;
function startSong() {
  const places = [...new Set([...EB_SONGS.map(s => s[1]), ...SONG_DECOYS])];
  sq = {rounds:mgShuffle(EB_SONGS).slice(0, SONG_ROUNDS).map(s => ({s, opts:mgShuffle([s[1], ...mgShuffle(places.filter(p => p !== s[1])).slice(0, 3)])})), i:0, picks:[]};
  drawSong();
}
function drawSong() {
  const r = sq.rounds[sq.i], [title, place, where] = r.s, pick = sq.picks[sq.i];
  const right = sq.picks.filter((p, i) => p === sq.rounds[i].s[1]).length;
  stage().innerHTML = `<h2>🎶 Song Quiz <small>song ${sq.i + 1}/${SONG_ROUNDS} · ${right} right</small></h2>
    <p class="mgSay">Where in <b>EarthBound</b> does this song play?</p>
    <div class="win songCard"><span class="songNote">♪</span><b>“${title}”</b></div>
    <div class="songOpts">${r.opts.map(o => `<button class="btn${pick ? (o === place ? " good" : o === pick ? " badc" : "") : ""}" data-o="${esc(o)}" ${pick ? "disabled" : ""}>${o}</button>`).join("")}</div>
    <p class="mgSay">${pick ? (pick === place ? "✔️ Right! " : "✖ ") + `It plays in ${place}${where ? ` (${where})` : ""}.` : ""}</p>
    <div class="mgBtns" id="sqEnd">${pick ? `<button class="btn hot" id="sqNext">${sq.i < SONG_ROUNDS - 1 ? "Next song ▶" : "Results ▶"}</button>` : ""}</div>
    <p class="mgCredit">Song names are the fan names listed on the <a href="https://earthbound.fandom.com/wiki/Category:EarthBound_Music" target="_blank" rel="noopener">EarthBound Wiki</a>.</p>`;
  document.querySelectorAll(".songOpts [data-o]").forEach(b => b.onclick = () => { sq.picks[sq.i] = b.dataset.o; sfx(b.dataset.o === place ? "ok" : "bad"); drawSong(); });
  if (!pick) return;
  $("#sqNext").onclick = () => {
    if (sq.i < SONG_ROUNDS - 1) { sq.i++; drawSong(); return; }
    const n = sq.picks.filter((p, i) => p === sq.rounds[i].s[1]).length;
    $("#sqEnd").innerHTML = mgEnd("song", n, n * 5, `${n}/${SONG_ROUNDS} songs placed`);
    bindEnd();
  };
}

// ---------- Who Said It? ----------
// EarthBound lines are copied word for word from the GameFAQs EarthBound game script (by TIDQ);
// Giegue's lines come from the Nintendo Wiki's Giygas quotes page.
const QUOTES = [
  ["Pokey", "EB", "Ness, you pin-headed idiot, you're just a half-step too slow!"],
  ["Pokey", "EB", "If you refuse me, I'll say something that'll cut you like a knife."],
  ["Pokey", "EB", "Hah! I lied! See you, sucker!"],
  ["Pokey", "EB", "Well, it is a gazillion years too early for you to oppose Giygas!"],
  ["Buzz Buzz", "EB", "Three things are of the utmost importance: wisdom, courage, and friendship."],
  ["Buzz Buzz", "EB", "I'm from 10 years in the future."],
  ["Ness's Mom", "EB", "You're my very own natural born fighter...You'll go far..."],
  ["Ness's Dad", "EB", "Good Luck, m'boy! I feel like such a hero!"],
  ["King", "EB", "(Oh, I get it. You just wanted to talk to me because I'm so lovable.)"],
  ["Picky", "EB", "Geez! Sometimes I wonder which one of us is the real big brother."],
  ["Frank", "EB", "\"Fail-proof\" Frank is now just \"failure\" Frank."],
  ["Captain Strong", "EB", "At times like this, kids like you should be playing Nintendo games."],
  ["B.H. Pirkle", "EB", "I'll be able to avoid any responsibility, right?"],
  ["Paula", "EB", "If you didn't come, I would have had to try to bust out of here."],
  ["Paula", "EB", "Don't worry about me, just kick butt like I know you can!"],
  ["Apple Kid", "EB", "I haven't taken a bath in quite a while, so I may be kind of stinky."],
  ["Apple Kid", "EB", "I expected there to be about a seven percent chance that you'd rescue me."],
  ["Mr. Carpainter", "EB", "I need your assistance to help make the world blue"],
  ["Everdred", "EB", "I'll see you at another time, in another space."],
  ["Maxwell", "EB", "\"Machine that Opens Doors, especially when you have a slightly bad key.\""],
  ["Tony", "EB", "Jeff, where are you going in the middle of the night?"],
  ["Dr. Andonuts", "EB", "Jeff wets his bed sometimes. But other than that, he's a good boy."],
  ["Jeff", "EB", "Man, oh, man, did that ever scare me!..."],
  ["Master Belch", "EB", "The city will soon be in worse condition than living in your own puke!"],
  ["Talah Rama", "EB", "The truth of space and time moves through the universe like a wave..."],
  ["Geldegarde Monotoli", "EB", "Look at my skinny arms, thin body, and gray hair..."],
  ["Poo", "EB", "I am the servant of Ness. I will obey Ness."],
  ["Venus", "EB", "Okay, I'll give you my autograph on this banana peel..."],
  ["Brick Road", "EB", "There's a \"Goodbye Exit\" ...over there."],
  ["Tenda Chief", "EB", "Rumor, I heard a book to fix shyness, there is."],
  ["Tenda", "EB", "You guys smell really good! *sniff, sniff, sniff*"],
  ["Ness's Nightmare", "EB", "I'm the evil part of your brain."],
  ["Mr. Saturn", "EB", "KiDnaPPED. i waS. BOinG!"],
  ["Giygas", "EB", "It's not right... not... right..."],
  ["Mr. Poochyfud", "EB", "I've got no complaints now that I have my money."],
  ["Giegue", "M1", "You puny little Earth bugs! Shut up, and STOP singing!!"],
  ["Giegue", "M1", "How could I be defeated by a song like that? I will... sometime... Ninten! We SHALL meet again!"],
  // more EarthBound lines from the same GameFAQs script
  ["Pokey", "EB", "I blame the cops... it certainly wasn't my fault at all."],
  ["Pokey", "EB", "Looks like you're the world-class loser again!"],
  ["Pokey", "EB", "So now which one of us do you think is the cool guy?!"],
  ["Pokey", "EB", "I'm not going to fight you, but these guys will... Later potater..."],
  ["Pokey", "EB", "What an all-mighty idiot!"],
  ["Ness's Mom", "EB", "But, I think you should change out of your jammies before you leave."],
  ["Ness's Dad", "EB", "What? Well, the father of a hero, at least. Wa ha ha!"],
  ["King", "EB", "(I guess I have no choice. Let's go.)"],
  ["Buzz Buzz", "EB", "I hate to go over it again, but I guess I'll start over..."],
  ["Starman Deluxe", "EB", "You're much stronger *whirr* than our intelligence indicated..."],
  ["Pokey's Dad", "EB", "I'm tired of your family living next door."],
  ["Pokey's Mom", "EB", "I think it's a dung beetle! I'll smash your guts out!"],
  ["Shark", "EB", "Come back after you finish EarthBound!"],
  ["Frank", "EB", "C'mon, can't you at least say your name?"],
  ["B.H. Pirkle", "EB", "I'm a very important man in these parts. Do you think I'm important?"],
  ["Onett Cop", "EB", "Your average policeman is stronger than any super hero!"],
  ["Captain Strong", "EB", "get ready for my \"Super Ultra Mambo-Tango-Foxtrot martial arts!\""],
  ["Titanic Ant", "EB", "This is the first \"Your Sanctuary\" location. But it's mine now."],
  ["Everdred", "EB", "When I jumped off the roof, I twisted my ankle."],
  ["Everdred", "EB", "I'm not that nice of a guy. Besides. I'm slipping away..."],
  ["Paula's Dad", "EB", "P P P Paula! Where are you? It's time for a yummy piece of pie!"],
  ["Paula's Dad", "EB", "My daughter doesn't want to talk to media monkeys like you."],
  ["Apple Kid", "EB", "Please choose something edible... I'm not a garbage can, you know."],
  ["Apple Kid's Mouse", "EB", "I am a mouse. No one has given me a name yet."],
  ["Paula", "EB", "I'm able to use a little psychic power that is actually pretty deadly..."],
  ["Paula", "EB", "Now wipe your eyes, blow your nose, and smile before we take off."],
  ["Paula", "EB", "...There was something I wanted to tell you, but I've forgotten it."],
  ["Mr. Carpainter", "EB", "You fool, I have drawn you into my trap."],
  ["Maxwell", "EB", "It's like saving the game. Ah, ha, ha, ha, ha."],
  ["Tony", "EB", "That's right, you--the one holding the controller."],
  ["Jeff", "EB", "maybe I'll be the one that fixes your broken electronic appliances."],
  ["Bubble Monkey", "EB", "Kye uki kukyi (Now she's my type...)"],
  ["Brickroad", "EB", "I've devoted my life to making dungeons."],
  ["Dr. Andonuts", "EB", "Uh, those glasses look good on you."],
  ["Master Belch", "EB", "Don't you think that's an incredibly masculine taunt to throw at you?"],
  ["Master Belch", "EB", "Gha Gha Gha! Get ready to feel the pain of true nausea!"],
  ["Mole", "EB", "I'm truly the third strongest master of this hole."],
  ["Topolla Manager", "EB", "That Diamond is worth maybe... MAYBE... $50."],
  ["Gerardo", "EB", "This hole's great! Good hole, good hole, good hole..."],
  ["Connected Eyebrow Guy", "EB", "Don't you think my eyebrows rock?"],
  ["Monotoli", "EB", "Don't do anything to me! I am... I am not Monotoli!"],
  ["Mr. Spoon", "EB", "I don't care if the autograph is written on toilet paper..."],
  ["Poo", "EB", "Ness! My life is in your hands."],
  ["Sailor", "EB", "I threw my slippers at the beast... Maybe you didn't notice."],
  ["Sphinx", "EB", "Are you a thief, a warrior, or one who has come to see my majesty?"],
  ["Orange Kid", "EB", "I'm still working on the way to change boiled eggs into raw eggs."],
  ["Giygas", "EB", "I'm h...a...p...p...y..."],
  ["Mr. Saturn", "EB", "wE fEEl GROOvE!"],
  ["Mach Pizza Delivery Man", "EB", "I made the decision that you're Ness, no matter what..."],
  ["Elevator Operator", "EB", "Quit staring at my hips... why don't you stand somewhere else instead of behind me?"],
  // Mother 3 lines from spookychee's 2006 story translation on GameFAQs (Fassad is "Yokuba" and Wess is "Wes" there)
  ["Claus", "M3", "Lucaaaaaaaaassssss!!!! How long are you going to sleep?"],
  ["Hinawa", "M3", "Now you look like a million bucks. Have fun."],
  ["Alec", "M3", "It feels good to save. And saving is completely...free of charge."],
  ["Thomas", "M3", "I'll walk behind you. Ok? I love walking behind people!!"],
  ["Okera", "M3", "Move it, move it, move it, mooooooooove it. Okera coming through!"],
  ["Nicole", "M3", "T..Th...The Telly Fire is on forest! No, no. The Forest Felly is on tire."],
  ["Mapson", "M3", "I am the map-liking, map-carrying, one and only Mapson."],
  ["Jill", "M3", "If you're going to listen to Thomas, I would only listen to about half of what he says."],
  ["Fuel", "M3", "Thank you, All-Black Flint."],
  ["Lighter", "M3", "Man, I would love to pound destiny with this 2x4."],
  ["Kumatora", "M3", "You better shut your mouth or I'll shut it for you!"],
  ["Duster", "M3", "I really am Duster. Duster. Everyone, it's me, Duster!"],
  ["Fassad", "M3", "Nuhahahah, make sure some thief doesn't come along and swipe it from you."],
  ["Butch", "M3", "I'm anti-violence. And you're trying to do violence. Violence!"],
  ["Ionia", "M3", "Hello, beautiful! Hmmm, no make-up. You know, I look pretty hot even without it."],
  ["Wess", "M3", "Don't look!!!! I'm not sticking out my butt or anything like that."],
  ["Boney", "M3", "Woof Woof! (Leave it to me!)"],
  ["Lucas", "M3", "No, no, no. Claus is NOT thinking that he's going to defeat Drago and he did NOT take Dad's knife and head towards the mountain... oops."],
  ["Nan", "M3", "Whatever I say will be of no use to you. What should I do?"],
  ["Chimney", "M3", "If I had really barfed it would have been all your fault."],
  ["Abbey", "M3", "That was so nice of me to tell you that, wasn't it?"],
  ["Isack", "M3", "Regular mice and conventional snakes and common Drago...this forest was pretty boring three years ago."]
];
const QUOTE_ROUNDS = 10;
let qz = null;
function startQuote() {
  const speakers = [...new Set(QUOTES.map(q => q[0]))];
  const gameOf = Object.fromEntries(QUOTES.map(q => [q[0], q[1]]));
  // one line per speaker so the same name never comes up twice in a run
  const picks = mgShuffle(speakers).slice(0, QUOTE_ROUNDS).map(s => mgShuffle(QUOTES.filter(q => q[0] === s))[0]);
  // wrong answers come from the same game when there are enough speakers to pick from
  const decoys = q => { const same = speakers.filter(s => s !== q[0] && gameOf[s] === q[1]); return mgShuffle(same.length >= 3 ? same : speakers.filter(s => s !== q[0])).slice(0, 3); };
  qz = {rounds:picks.map(q => ({q, opts:mgShuffle([q[0], ...decoys(q)])})), i:0, picks:[]};
  drawQuote();
}
function drawQuote() {
  const r = qz.rounds[qz.i], [who, game, line] = r.q, pick = qz.picks[qz.i];
  const right = qz.picks.filter((p, i) => p === qz.rounds[i].q[0]).length;
  stage().innerHTML = `<h2>💬 Who Said It? <small>line ${qz.i + 1}/${QUOTE_ROUNDS} · ${right} right</small></h2>
    <div class="win dialog quoteCard"><p>@${esc(line)}</p></div>
    <div class="songOpts">${r.opts.map(o => `<button class="btn${pick ? (o === who ? " good" : o === pick ? " badc" : "") : ""}" data-o="${esc(o)}" ${pick ? "disabled" : ""}>${esc(o)}</button>`).join("")}</div>
    <p class="mgSay">${pick ? (pick === who ? "✔️ Right! " : "✖ ") + `That was <b>${esc(who)}</b> in ${GAMES[game].l}.` : "Pick who said this line."}</p>
    <div class="mgBtns" id="qzEnd">${pick ? `<button class="btn hot" id="qzNext">${qz.i < QUOTE_ROUNDS - 1 ? "Next line ▶" : "Results ▶"}</button>` : ""}</div>
    <p class="mgCredit">Lines quoted from the <a href="https://gamefaqs.gamespot.com/snes/588301-earthbound/faqs/34560" target="_blank" rel="noopener">EarthBound game script on GameFAQs</a> , spookychee's <a href="https://gamefaqs.gamespot.com/gba/914622-mother-3/faqs/42740" target="_blank" rel="noopener">Mother 3 story translation on GameFAQs</a> and the <a href="https://nintendo.fandom.com/wiki/Giygas/quotes" target="_blank" rel="noopener">Nintendo Wiki</a>.</p>`;
  document.querySelectorAll(".songOpts [data-o]").forEach(b => b.onclick = () => { qz.picks[qz.i] = b.dataset.o; sfx(b.dataset.o === who ? "ok" : "bad"); drawQuote(); });
  if (!pick) return;
  $("#qzNext").onclick = () => {
    if (qz.i < QUOTE_ROUNDS - 1) { qz.i++; drawQuote(); return; }
    const n = qz.picks.filter((p, i) => p === qz.rounds[i].q[0]).length;
    $("#qzEnd").innerHTML = mgEnd("quote", n, n * 5, `${n}/${QUOTE_ROUNDS} lines matched`);
    bindEnd();
  };
}

// ---------- Odd One Out: three enemies share a grid header, one doesn't ----------
const ODD_ROUNDS = 8;
let odd;
function oddRound(w, pool, used) {
  // the game badge is shown on every tile, so "Appears in" headers would be too easy as answers
  const answers = pool.filter(c => c.fam !== "game");
  for (let tries = 0; tries < 300; tries++) {
    const c = mgRand(answers), free = e => !used.has(e.name);
    const yes = w.list.filter(e => free(e) && c.test(e)), no = w.list.filter(e => free(e) && !c.test(e));
    if (yes.length < 3 || !no.length) continue;
    const three = mgShuffle(yes).slice(0, 3), out = mgRand(no), four = [...three, out];
    if (new Set(four.map(e => e.name)).size < 4) continue;
    // no other header may leave out a different single enemy, so there's only one answer
    const clash = pool.some(o => { if (o === c) return false; const fail = four.filter(e => !o.test(e)); return fail.length === 1 && fail[0] !== out; });
    if (clash) continue;
    four.forEach(e => used.add(e.name));
    return {c, ids:mgShuffle(four).map(e => e.id), out:out.id};
  }
  return null;
}
function startOdd() {
  const w = buildWorld(ALL_GAMES), used = new Set();
  // "Found in" headers would spoil today's grid, so they only show up after it's finished
  const pool = w.pool.filter(c => (c.fam !== "region" || listUnlocked) && c.fam !== "multi");
  const rounds = [];
  for (let i = 0; i < ODD_ROUNDS; i++) { const r = oddRound(w, pool, used); if (r) rounds.push(r); }
  if (rounds.length < ODD_ROUNDS) { stage().innerHTML = `<p class="mgSay">Couldn't build a puzzle this time. Try again!</p>`; return; }
  odd = {rounds, i:0, picks:[]};
  drawOdd();
}
function drawOdd() {
  const r = odd.rounds[odd.i], pick = odd.picks[odd.i];
  const right = odd.picks.filter((p, i) => p === odd.rounds[i].out).length;
  stage().innerHTML = `<h2>🎯 Odd One Out <small>round ${odd.i + 1}/${ODD_ROUNDS} · ${right} right</small></h2>
    <p class="mgSay">${pick ? `${pick === r.out ? "✔️ Right!" : `✖ It was ${BY_ID.get(r.out).name}.`} The other three are all <b>${r.c.ic} ${r.c.sub}: ${r.c.lb}</b>.`
      : `Three of these enemies share a grid header (kind, stats, name, boss${listUnlocked ? ", location" : ""}). Tap the one that doesn't belong.`}</p>
    <div class="conGrid oddGrid">${r.ids.map(id => { const e = BY_ID.get(id);
      return `<button class="conTile${pick ? (id === r.out ? " good" : id === pick ? " badc" : " dim") : ""}" data-id="${id}" ${pick ? "disabled" : ""}>${spriteHTML(e, "mini")}<span>${e.name}</span>${badge(e)}</button>`; }).join("")}</div>
    <div class="mgBtns" id="oddEnd">${pick ? `<button class="btn hot" id="oddNext">${odd.i < ODD_ROUNDS - 1 ? "Next round ▶" : "Results ▶"}</button>` : ""}</div>`;
  document.querySelectorAll(".oddGrid [data-id]").forEach(b => b.onclick = () => { odd.picks[odd.i] = b.dataset.id; sfx(b.dataset.id === r.out ? "smash" : "bad"); drawOdd(); });
  if (!pick) return;
  $("#oddNext").onclick = () => {
    if (odd.i < ODD_ROUNDS - 1) { odd.i++; drawOdd(); return; }
    const n = odd.picks.filter((p, i) => p === odd.rounds[i].out).length;
    $("#oddEnd").innerHTML = mgEnd("odd", n, n * 5, `${n}/${ODD_ROUNDS} odd ones found`);
    bindEnd();
  };
}

// ---------- Enemy Scramble: unscramble as many enemy names as you can before time runs out ----------
const SCR_SECS = 75;
let scr;
// shuffles the letters inside each word, keeping the words in order
function scrMix(name) {
  return name.split(" ").map(wd => {
    if (wd.length < 3) return wd;
    let m = wd;
    for (let t = 0; t < 8 && m.toLowerCase() === wd.toLowerCase(); t++) m = mgShuffle([...wd]).join("");
    return m.toUpperCase();
  }).join(" ").toUpperCase();
}
function scrNext() {
  const pool = ALL.filter(e => /^[A-Za-z ]+$/.test(e.name) && e.name.replace(/ /g, "").length >= 4 && e.name.length <= 18 && !scr.used.has(e.name));
  const e = mgRand(pool);
  scr.used.add(e.name);
  scr.cur = {id:e.id, mix:scrMix(e.name)}; scr.hint = false;
}
function startScr() {
  clearInterval(mgTimer);
  scr = {left:SCR_SECS, started:false, done:false, solved:[], skipped:[], used:new Set(), msg:"", cur:null, hint:false};
  scrNext();
  drawScr();
}
function scrClock() { if (!scr.started) { scr.started = true; mgTimer = setInterval(scrTick, 1000); } }
function scrCost(s) { scr.left = Math.max(1, scr.left - s); const t = $("#scrT"); if (t) t.textContent = scr.left + "s"; }
function drawScr() {
  const e = BY_ID.get(scr.cur.id);
  const tiles = scr.cur.mix.split(" ").map(wd => `<span class="scrWord">${[...wd].map(ch => `<span class="scrL">${ch}</span>`).join("")}</span>`).join("");
  const kinds = e.kinds.map(k => KINDS[k] ? KINDS[k].e + " " + KINDS[k].l : k).join(", ");
  stage().innerHTML = `<h2>🔤 Enemy Scramble <small>${scr.solved.length} solved · <span id="scrT">${scr.left}s</span></small></h2>
    <p class="mgSay">${scr.msg || `Unscramble the enemy's name. The letters in each word are mixed up, but the words stay in order. You have ${SCR_SECS} seconds, and the clock starts on your first answer.`}</p>
    ${scr.done ? "" : `<div class="win scrCard"><div class="scrTiles">${tiles}</div><div class="scrMeta">${badge(e)}${scr.hint ? `<span>${kinds || "?"} · starts with “${e.name[0]}”</span>` : ""}</div></div>
    <form class="mgForm" id="scrForm" autocomplete="off"><input class="search" id="scrQ" placeholder="Type the enemy's name…" spellcheck="false"><button class="btn hot">Guess</button>
      <button class="btn" type="button" id="scrHint" ${scr.hint ? "disabled" : ""}>Hint (−5s)</button><button class="btn" type="button" id="scrSkip">Skip (−5s)</button></form>`}
    <div class="bzFound">${scr.solved.map(id => `<span class="chip">${BY_ID.get(id).name} ${badge(BY_ID.get(id))}</span>`).join("")}</div>
    <div id="scrEnd"></div>`;
  if (scr.done) return;
  const q = $("#scrQ");
  $("#scrForm").onsubmit = ev => {
    ev.preventDefault();
    const v = q.value.trim();
    if (!v) return;
    scrClock();
    if (nameHit(v, e.name)) { scr.solved.unshift(e.id); scr.msg = `✔️ ${e.name}!`; sfx("ok"); scrNext(); }
    else { scr.msg = `✖ Not “${esc(v)}”.`; sfx("bad"); }
    drawScr();
  };
  $("#scrHint").onclick = () => { scrClock(); scr.hint = true; scrCost(5); scr.msg = "Here's a clue. (−5s)"; sfx("click"); drawScr(); };
  $("#scrSkip").onclick = () => { scrClock(); scr.skipped.push(e.id); scrCost(5); scr.msg = `Skipped: it was ${e.name}. (−5s)`; sfx("click"); scrNext(); drawScr(); };
  setTimeout(() => q.focus(), 30);
}
function scrTick() {
  if (mgCur !== "scr") { clearInterval(mgTimer); return; }
  scr.left--;
  const t = $("#scrT"); if (t) t.textContent = scr.left + "s";
  if (scr.left <= 5 && scr.left > 0) sfx("tick");
  if (scr.left > 0) return;
  clearInterval(mgTimer);
  scr.done = true;
  const n = scr.solved.length;
  scr.msg = `⏰ Time! You unscrambled ${n} name${n === 1 ? "" : "s"}. The last one was ${BY_ID.get(scr.cur.id).name}.`;
  drawScr();
  $("#scrEnd").innerHTML = mgEnd("scr", n, n * 5, `${n} names unscrambled`);
  bindEnd();
}

// ---------- menu ----------
const MINIGAMES = [
  {id:"hl", ic:"⬆️", name:"Higher or Lower", desc:"Guess which enemy has the bigger stat. Go for a streak.", start:startHL, fmt:n => `streak ${n}`},
  {id:"sil", ic:"👤", name:"Silhouette Guessr", desc:"Name the blacked-out sprite. Clues cost points.", start:startSil, fmt:n => `${n}/20 pts`},
  {id:"con", ic:"🧩", name:"Connections", desc:"Sort 16 enemies into 4 hidden groups.", start:startCon, fmt:n => `${Math.floor(n / 10)}/4 · ${n % 10}❤️`},
  {id:"chain", ic:"🔗", name:"Enemy Chain", desc:"Link enemies that share a kind or a place.", start:startChain, fmt:n => `chain ${n}`, lock:() => !listUnlocked},
  {id:"blitz", ic:"⏱️", name:"Place Blitz", desc:"Name as many places as you can in 60 seconds.", start:startBlitz, fmt:n => `${n} places`},
  {id:"song", ic:"🎶", name:"Song Quiz", desc:"Match EarthBound song titles to where they play.", start:startSong, fmt:n => `${n}/${SONG_ROUNDS}`},
  {id:"quote", ic:"💬", name:"Who Said It?", desc:"Match real lines from the script to the character who said them.", start:startQuote, fmt:n => `${n}/${QUOTE_ROUNDS}`},
  {id:"odd", ic:"🎯", name:"Odd One Out", desc:"Three enemies share a grid header. Spot the one that doesn't.", start:startOdd, fmt:n => `${n}/${ODD_ROUNDS}`},
  {id:"scr", ic:"🔤", name:"Enemy Scramble", desc:"Unscramble enemy names against the clock.", start:startScr, fmt:n => `${n} names`}
];
function startMg(id) {
  clearInterval(mgTimer);
  mgCur = id;
  sfx("open");
  MINIGAMES.find(g => g.id === id).start();
  drawMgMenu();
}
function drawMgMenu() {
  $("#mgMenu").innerHTML = MINIGAMES.map(g => `<button class="mgItem${mgCur === g.id ? " on" : ""}" data-g="${g.id}">
      <span class="mgIc">${g.ic}</span><span class="mgTx"><b>${g.name}${g.lock && g.lock() ? " 🔒" : ""}</b>
      <small>${mg.best[g.id] != null ? "Best: " + g.fmt(mg.best[g.id]) : "Not played yet"}${mg.xpDay[g.id] === todayKey() ? " · ✔ today" : ""}</small></span></button>`).join("");
  document.querySelectorAll(".mgItem").forEach(b => b.onclick = () => startMg(b.dataset.g));
}
function drawMgIntro() {
  clearInterval(mgTimer);
  stage().innerHTML = `<h2>🕹️ Minigames</h2>
    <p class="mgSay">Nine quick games. Each one pays money for Saturn's shop: full pay for the first run of each game every day, half pay for replays.</p>
    <div class="mgCards">${MINIGAMES.map(g => `<button class="win mgCard" data-g="${g.id}"><span class="mgIc">${g.ic}</span><b>${g.name}${g.lock && g.lock() ? " 🔒" : ""}</b><small>${g.desc}</small></button>`).join("")}</div>`;
  document.querySelectorAll(".mgCard").forEach(b => b.onclick = () => startMg(b.dataset.g));
}
window.onMiniShow = () => { drawMgMenu(); if (!mgCur) drawMgIntro(); };
