// ---------- stats: everything you've done, read back from saved games ----------
const dayKeys = re => {
  const out = [];
  try { for (let k = 0; k < localStorage.length; k++) { const key = localStorage.key(k); if (re.test(key)) out.push(key); } } catch {}
  return out.sort();
};
const isoDay = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
// consecutive days played, ending today (or yesterday if today isn't played yet)
function streaks(days) {
  const set = new Set(days);
  let best = 0, run = 0, prev = null;
  days.forEach(d => {
    const t = new Date(d + "T12:00");
    run = prev && (t - prev) / 864e5 < 1.5 ? run + 1 : 1;
    best = Math.max(best, run); prev = t;
  });
  const d = new Date();
  if (!set.has(isoDay(d))) d.setDate(d.getDate() - 1);
  let cur = 0;
  while (set.has(isoDay(d))) { cur++; d.setDate(d.getDate() - 1); }
  return {cur, best};
}
const shortDay = d => { const [, m, dd] = d.split("-"); return `${+m}/${+dd}`; };

function gridHistory() {
  return dayKeys(/^earthdoku3-\d{4}-\d\d-\d\d$/).map(k => {
    const g = store.get(k);
    if (!g || !Array.isArray(g.cells)) return null;
    return {d:k.slice(11), right:g.right != null ? g.right : g.cells.filter(Boolean).length, iq:g.iq, done:!!g.done, hard:!!g.hardUsed && !g.easyUsed};
  }).filter(Boolean);
}
function geoHistory() {
  return dayKeys(/^earthdoku-geo-\d{4}-\d\d-\d\d$/).map(k => {
    const g = store.get(k);
    if (!g || !Array.isArray(g.res)) return null;
    return {d:k.slice(14), total:g.res.reduce((s, x) => s + (x && x.score || 0), 0), done:!!g.done, rounds:(g.rounds || []).length};
  }).filter(Boolean);
}

const tile = (big, label, sub = "") => `<div class="stTile"><b>${big}</b><span>${label}</span>${sub ? `<small>${sub}</small>` : ""}</div>`;

function drawStats() {
  const grids = gridHistory(), done = grids.filter(g => g.done);
  const gs = streaks(done.map(g => g.d));
  const perfect = done.filter(g => g.right === 9).length;
  const avg = done.length ? (done.reduce((s, g) => s + g.right, 0) / done.length).toFixed(1) : "–";
  const iqs = done.filter(g => g.iq != null).map(g => g.iq);
  const geos = geoHistory(), gdone = geos.filter(g => g.done);
  const geoBest = gdone.length ? Math.max(...gdone.map(g => g.total)) : 0;
  const geoAvg = gdone.length ? Math.round(gdone.reduce((s, g) => s + g.total, 0) / gdone.length) : 0;
  const cs = collectionStats();
  const skinsHave = SKINS.filter(s => owns(s.id)).length;
  const mgPlays = Object.values(mg.plays).reduce((s, n) => s + n, 0);

  $("#stBody").innerHTML = `
    <section class="win stCard"><h3>🎯 Daily grid</h3><div class="stTiles">
      ${tile(done.length, "grids played")}${tile(gs.cur + "🔥", "day streak", `best ${gs.best}`)}
      ${tile(avg, "avg squares", "out of 9")}${tile(perfect, "perfect grids")}
      ${tile(iqs.length ? Math.max(...iqs) : "–", "best Grid IQ", iqs.length ? `avg ${Math.round(iqs.reduce((s, x) => s + x, 0) / iqs.length)}` : "")}
      ${tile(done.filter(g => g.hard).length, "🔥 hard grids")}</div>
      <div class="cbox stBox"><canvas id="stGrid" aria-label="Bar chart of squares filled in each daily grid"></canvas></div>
      ${done.length ? "" : `<p class="cs">Finish a daily grid to start your history.</p>`}</section>

    <section class="win stCard"><h3>🗺️ Map Guessr</h3><div class="stTiles">
      ${tile(gdone.length, "daily runs")}${tile(geoBest.toLocaleString(), "best daily", "of 25,000")}
      ${tile(geoAvg.toLocaleString(), "avg daily")}${tile(bestStreak(), "best 🔥 streak", "maps in a row")}</div>
      <div class="cbox stBox"><canvas id="stGeo" aria-label="Line chart of daily Map Guessr scores"></canvas></div>
      ${gdone.length ? "" : `<p class="cs">Finish a daily map run to chart your scores.</p>`}</section>

    <section class="win stCard"><h3>★ Collection</h3>
      <div class="stTiles">${tile(`${cs.have}/${cs.total}`, "enemies collected", `${Math.round(cs.have / cs.total * 100)}%`)}</div>
      <div class="stBars">${ALL_GAMES.map(g => { const x = cs.by[g], p = x.total ? x.have / x.total * 100 : 0;
        return `<div class="stBar"><span class="stBl">${GAMES[g].l}</span><span class="stTrack"><span style="width:${p}%;background:${GAME_COLOR[g]}"></span></span><span class="stBn">${x.have}/${x.total}</span></div>`; }).join("")}</div></section>

    <section class="win stCard"><h3>🪐 Saturn's shop</h3><div class="stTiles">
      ${tile(fmt$(shop.money), "in your wallet")}${tile(fmt$(shop.earned), "total earned")}
      ${tile(fmt$(shop.spent), "spent")}${tile(`${skinsHave}/${SKINS.length}`, "windows owned")}</div>
      <div class="stBars">${[["grid", "🎯 Grid", "#e2352c"], ["map", "🗺️ Map", "#2f9e5b"], ["mini", "🕹️ Games", "#e0458f"], ["tower", "🗼 Tower", "#7d1fd1"]].map(([k, l, c]) => { const n = shop.by[k] || 0, p = shop.earned ? n / shop.earned * 100 : 0;
        return `<div class="stBar"><span class="stBl">${l}</span><span class="stTrack"><span style="width:${p}%;background:${c}"></span></span><span class="stBn">${fmt$(n)}</span></div>`; }).join("")}</div>
      ${shop.earned ? "" : `<p class="cs">Fill grid squares, guess maps and play minigames to earn money.</p>`}</section>

    <section class="win stCard"><h3>🕹️ Minigames</h3><div class="stTiles">${tile(mgPlays, "runs played")}</div>
      <table class="stTable"><thead><tr><th>Game</th><th>Best</th><th class="n">Runs</th></tr></thead><tbody>
      ${MINIGAMES.map(g => `<tr><td>${g.ic} ${g.name}</td><td>${mg.best[g.id] != null ? g.fmt(mg.best[g.id]) : "–"}</td><td class="n">${mg.plays[g.id] || 0}</td></tr>`).join("")}
      </tbody></table></section>
    ${window.achCardHTML ? achCardHTML() : ""}`;
  if (window.achBind) achBind();
  drawStatCharts(done.slice(-30), gdone.slice(-30));
}

function drawStatCharts(grids, geos) {
  if (!window.Chart) { document.querySelectorAll(".stBox").forEach(b => b.innerHTML = `<p class="cs">Charts couldn't load.</p>`); return; }
  const BAR = "#3446b8";
  if (grids.length) make("stGrid", {type:"bar",
    data:{labels:grids.map(g => shortDay(g.d)), datasets:[{label:"Squares filled", data:grids.map(g => g.right),
      backgroundColor:BAR, borderRadius:{topLeft:4, topRight:4}, borderSkipped:"bottom", maxBarThickness:22}]},
    options:{maintainAspectRatio:false, plugins:{legend:{display:false}, tooltip:{...tooltip, callbacks:{label:c => {
      const g = grids[c.dataIndex]; return ` ${g.right}/9${g.iq != null ? ` · IQ ${g.iq}` : ""}${g.hard ? " · 🔥 hard" : ""}`; }}}},
      scales:{x:axis(""), y:axis("squares", {min:0, max:9, ticks:{stepSize:3, padding:6, color:INK2}})}}});
  else document.getElementById("stGrid").closest(".stBox").hidden = true;
  if (geos.length) make("stGeo", {type:"line",
    data:{labels:geos.map(g => shortDay(g.d)), datasets:[{label:"Daily score", data:geos.map(g => g.total),
      borderColor:BAR, backgroundColor:BAR, borderWidth:2, pointRadius:4, pointHoverRadius:6, pointBorderColor:SURFACE, pointBorderWidth:2, tension:.25}]},
    options:{maintainAspectRatio:false, interaction:{mode:"index", intersect:false},
      plugins:{legend:{display:false}, tooltip:{...tooltip, callbacks:{label:c => ` ${c.parsed.y.toLocaleString()} pts`}}},
      scales:{x:axis(""), y:axis("points", {min:0, max:25000})}}});
  else document.getElementById("stGeo").closest(".stBox").hidden = true;
}
window.onStatsShow = drawStats;
