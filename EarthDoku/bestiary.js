// ---------- enemy list ----------
const view = {game:"all", kind:"", region:"", boss:false, coll:"", q:"", sort:"name", asc:true, mode:"table"};
let listUnlocked = false;

const TABS = {grid:["#viewGrid", "#tabGrid"], list:["#viewList", "#tabList"], geo:["#viewGeo", "#tabGeo"], shop:["#viewShop", "#tabShop"],
  tower:["#viewTower", "#tabTower"], mini:["#viewMini", "#tabMini"], stats:["#viewStats", "#tabStats"]};
function setTab(which) {
  document.body.dataset.tab = which;
  Object.entries(TABS).forEach(([k, [v, t]]) => {
    const on = k === which;
    $(v).hidden = !on;
    $(t).classList.toggle("on", on);
    $(t).setAttribute("aria-selected", on);
  });
  if (which === "list") drawList();
  else if (which === "grid") drawEotd();
  else if (which === "shop") { if (window.onShopShow) window.onShopShow(); }
  else if (which === "mini") { if (window.onMiniShow) window.onMiniShow(); }
  else if (which === "stats") { if (window.onStatsShow) window.onStatsShow(); }
  else if (which === "tower") { if (window.onTowerShow) window.onTowerShow(); }
  else if (window.onGeoShow) window.onGeoShow();
  if (window.onTabSound) window.onTabSound(which);
  if (window.checkAch) checkAch();
}
Object.keys(TABS).forEach(k => $(TABS[k][1]).onclick = () => setTab(k));

window.onGameState = g => {
  listUnlocked = !!g && g.done;
  $("#lockIcon").hidden = listUnlocked;
  $("#listLocked").hidden = listUnlocked;
  $("#listBody").hidden = !listUnlocked;
  if (listUnlocked && !$("#viewList").hidden) drawList();
};

// filter dropdowns
Object.entries(KINDS).forEach(([k, v]) => $("#fKind").insertAdjacentHTML("beforeend", `<option value="${k}">${v.e} ${v.l}</option>`));
function fillRegions() {
  const sel = $("#fRegion"), keep = view.region;
  const regs = new Map();
  ALL.filter(e => view.game === "all" || e.game === view.game)
    .forEach(e => e.regions.forEach(r => regs.set(e.game + "|" + r, r)));
  const opts = [...regs.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  sel.innerHTML = `<option value="">Any location</option>` + opts.map(([k, r]) =>
    `<option value="${k}">${r}${view.game === "all" ? " · " + GAMES[k.split("|")[0]].short : ""}</option>`).join("");
  view.region = regs.has(keep) ? keep : "";
  sel.value = view.region;
}
fillRegions();

$("#fq").oninput = ev => { view.q = norm(ev.target.value); drawList(); };
$("#fKind").onchange = ev => { view.kind = ev.target.value; drawList(); };
$("#fRegion").onchange = ev => { view.region = ev.target.value; drawList(); };
$("#fColl").onchange = ev => { view.coll = ev.target.value; drawList(); };
$("#fBoss").onchange = ev => { view.boss = ev.target.checked; drawList(); };
document.querySelectorAll("#fGame button").forEach(b => b.onclick = () => {
  view.game = b.dataset.g;
  document.querySelectorAll("#fGame button").forEach(x => x.classList.toggle("on", x === b));
  fillRegions(); drawList();
});
document.querySelectorAll("#fMode button").forEach(b => b.onclick = () => {
  view.mode = b.dataset.m;
  document.querySelectorAll("#fMode button").forEach(x => x.classList.toggle("on", x === b));
  drawList();
});
document.querySelectorAll(".bestiary th[data-s]").forEach(th => th.onclick = () => {
  const s = th.dataset.s;
  view.asc = view.sort === s ? !view.asc : s === "name" || s === "game";
  view.sort = s; drawList();
});

// the enemies that pass every filter; the table and the charts share this
function filteredRows() {
  const [rg, rn] = view.region.split("|");
  return ALL.filter(e =>
    (view.game === "all" || e.game === view.game) &&
    (!view.kind || e.kinds.includes(view.kind)) &&
    (!view.region || (e.game === rg && e.regions.includes(rn))) &&
    (!view.boss || e.boss) &&
    (!view.coll || (view.coll === "yes") === isCollected(e)) &&
    (!view.q || norm(e.name).includes(view.q)));
}

function drawCollBar() {
  const cs = collectionStats();
  const pct = n => Math.round(n / cs.total * 100);
  $("#collBar").innerHTML = `<span class="cbT">★ Collection</span>
    <span class="cbN"><b>${cs.have}</b> / ${cs.total}</span>
    <span class="cbTrack" role="img" aria-label="${pct(cs.have)}% collected"><span style="width:${pct(cs.have)}%"></span></span>
    ${["M1", "EB", "M3"].map(g => `<span class="cbG">${GAMES[g].short} ${cs.by[g].have}/${cs.by[g].total}</span>`).join("")}`;
}

function drawList() {
  if (!listUnlocked) return;
  drawCollBar();
  const rows = filteredRows();
  const charts = view.mode === "charts";
  $("#tableWrap").hidden = charts;
  $("#chartsWrap").hidden = !charts;
  $("#fCount").textContent = `${rows.length} of ${ALL.length} enemies` + (charts ? " · charts follow your filters" : " · click a row for its card");
  if (charts) { if (window.drawCharts) window.drawCharts(rows); return; }

  const s = view.sort, dir = view.asc ? 1 : -1;
  rows.sort((a, b) => {
    if (s === "name") return dir * a.name.localeCompare(b.name);
    if (s === "game") return dir * (ALL_GAMES.indexOf(a.game) - ALL_GAMES.indexOf(b.game)) || a.name.localeCompare(b.name);
    if (s === "coll") return dir * (isCollected(b) - isCollected(a)) || a.name.localeCompare(b.name);
    const av = a[s], bv = b[s];
    if (!has(av) && !has(bv)) return 0;
    if (!has(av)) return 1;            // unknowns always sink to the bottom
    if (!has(bv)) return -1;
    return dir * (av - bv) || a.name.localeCompare(b.name);
  });
  document.querySelectorAll(".bestiary th[data-s]").forEach(th => {
    th.classList.toggle("sorted", th.dataset.s === s);
    th.classList.toggle("asc", th.dataset.s === s && view.asc);
  });
  const num = v => has(v) ? v.toLocaleString() : `<span class="unk">?</span>`;
  $("#fRows").innerHTML = rows.map(e => `<tr data-id="${e.id}" tabindex="0">
    <td class="spc">${spriteHTML(e, "row")}</td>
    <td class="nm">${e.name}${e.boss ? " 👑" : ""}</td>
    <td class="st">${isCollected(e) ? `<span class="star" title="Collected">★</span>` : `<span class="unk">☆</span>`}</td>
    <td>${badge(e)}</td>
    <td>${e.kinds.map(k => `${KINDS[k].e} ${KINDS[k].l}`).join("<br>")}</td>
    <td class="loc">${e.regions.join(", ") || `<span class="unk">unlisted</span>`}</td>
    <td class="n">${num(e.hp)}</td><td class="n">${num(e.pp)}</td><td class="n">${num(e.off)}</td>
    <td class="n">${num(e.def)}</td><td class="n">${num(e.spd)}</td></tr>`).join("");
}
$("#fRows").onclick = ev => { const tr = ev.target.closest("tr[data-id]"); if (tr) openCard(BY_ID.get(tr.dataset.id)); };
$("#fRows").onkeydown = ev => { if (ev.key === "Enter") $("#fRows").onclick(ev); };

startDaily();
