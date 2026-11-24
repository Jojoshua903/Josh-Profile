// ---------- stat charts (Chart.js) ----------
// Game colors are fixed per game (never by rank), from a validated categorical order.
const GAME_COLOR = {M1:"#2a78d6", EB:"#eb6834", M3:"#1baf7a"};
const INK2 = "#52514e", GRID = "#e1e0d9", AXIS = "#c3c2b7", SURFACE = "#fffaf0";
const HP_BANDS = [[0, 50, "<50"], [50, 100, "50–99"], [100, 250, "100–249"], [250, 500, "250–499"],
  [500, 1000, "500–999"], [1000, 2500, "1k–2.5k"], [2500, Infinity, "2.5k+"]];
const charts = {};

if (window.Chart) {
  Chart.defaults.font.family = 'Menlo, Monaco, "Courier New", monospace';
  Chart.defaults.font.size = 11;
  Chart.defaults.color = INK2;
  Chart.defaults.animation.duration = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 300;
}

const axis = (title, extra = {}) => ({
  grid:{color:GRID, drawTicks:false}, border:{color:AXIS},
  ticks:{padding:6, color:INK2}, title:{display:!!title, text:title, color:INK2}, ...extra
});
const tooltip = {
  backgroundColor:"#fff", titleColor:"#0b0b0b", bodyColor:"#0b0b0b", borderColor:"#2b2140", borderWidth:2,
  padding:8, cornerRadius:8, displayColors:true, boxPadding:4
};
function legend(el, games) {
  $(el).innerHTML = games.map(g => `<span class="lgi"><span class="sw" style="background:${GAME_COLOR[g]}"></span>${GAMES[g].l}</span>`).join("");
}
function make(id, cfg) {
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(document.getElementById(id), cfg);
}

window.drawCharts = rows => {
  drawCollGames();
  if (!window.Chart) {
    document.querySelectorAll(".cbox").forEach(b => b.innerHTML = `<p class="cs">Charts couldn't load. The table view still has every number.</p>`);
    return;
  }
  const games = ALL_GAMES.filter(g => rows.some(e => e.game === g));

  // 1. offense vs defense
  legend("#lgScatter", games);
  make("cScatter", {
    type:"scatter",
    data:{datasets:games.map(g => ({
      label:GAMES[g].l,
      data:rows.filter(e => e.game === g && has(e.off) && has(e.def)).map(e => ({x:e.off, y:e.def, e})),
      backgroundColor:GAME_COLOR[g], borderColor:SURFACE, borderWidth:1.5,
      pointRadius:4.5, pointHoverRadius:7, pointHitRadius:8
    }))},
    options:{
      responsive:true, maintainAspectRatio:false,
      scales:{x:axis("Offense", {beginAtZero:true}), y:axis("Defense", {beginAtZero:true})},
      plugins:{legend:{display:false}, tooltip:{...tooltip, callbacks:{
        title:items => items.map(i => `${i.raw.e.name} (${GAMES[i.raw.e.game].short})`),
        label:i => `Off ${i.raw.x} · Def ${i.raw.y}`
      }}},
      onClick:(ev, els) => { if (els[0]) openCard(els[0].element.$context.raw.e); },
      onHover:(ev, els) => ev.native.target.style.cursor = els.length ? "pointer" : "default"
    }
  });

  // 2. HP bands, grouped by game
  legend("#lgHp", games);
  make("cHp", {
    type:"bar",
    data:{labels:HP_BANDS.map(b => b[2]), datasets:games.map(g => ({
      label:GAMES[g].l,
      data:HP_BANDS.map(([lo, hi]) => rows.filter(e => e.game === g && has(e.hp) && e.hp >= lo && e.hp < hi).length),
      backgroundColor:GAME_COLOR[g], borderRadius:4, borderSkipped:"start",
      categoryPercentage:.8, barPercentage:.88
    }))},
    options:{
      responsive:true, maintainAspectRatio:false,
      scales:{x:axis("HP", {grid:{display:false}, border:{color:AXIS}}), y:axis("Enemies", {beginAtZero:true, ticks:{precision:0, color:INK2, padding:6}})},
      plugins:{legend:{display:false}, tooltip:{...tooltip, mode:"index", intersect:false, callbacks:{
        title:items => `HP ${items[0].label}`, label:i => ` ${i.dataset.label}: ${i.raw}`
      }}}
    }
  });

  // 3. kinds, stacked by game
  legend("#lgKind", games);
  const kinds = Object.keys(KINDS);
  make("cKind", {
    type:"bar",
    data:{labels:kinds.map(k => `${KINDS[k].e} ${KINDS[k].l}`), datasets:games.map(g => ({
      label:GAMES[g].l,
      data:kinds.map(k => rows.filter(e => e.game === g && e.kinds.includes(k)).length),
      backgroundColor:GAME_COLOR[g], borderColor:SURFACE, borderWidth:{left:0, right:2, top:0, bottom:0},
      borderRadius:3, borderSkipped:false, barPercentage:.8, categoryPercentage:.9
    }))},
    options:{
      indexAxis:"y", responsive:true, maintainAspectRatio:false,
      scales:{x:axis("Enemies", {stacked:true, beginAtZero:true, ticks:{precision:0, color:INK2, padding:6}}),
        y:axis("", {stacked:true, grid:{display:false}, border:{color:AXIS}})},
      plugins:{legend:{display:false}, tooltip:{...tooltip, mode:"index", intersect:false, callbacks:{
        label:i => ` ${i.dataset.label}: ${i.raw}`,
        footer:items => `Total: ${items.reduce((s, i) => s + i.raw, 0)}`
      }}}
    }
  });
};

// 4. collection progress per game (plain HTML bars)
function drawCollGames() {
  const cs = collectionStats();
  $("#collGames").innerHTML = ALL_GAMES.map(g => {
    const {have, total} = cs.by[g], p = Math.round(have / total * 100);
    return `<div class="cg"><span class="cgL">${GAMES[g].l}</span>
      <span class="cgT" role="img" aria-label="${have} of ${total} collected"><span style="width:${Math.max(p, have ? 2 : 0)}%;background:${GAME_COLOR[g]}"></span></span>
      <span class="cgN">${have}/${total} · ${p}%</span></div>`;
  }).join("") + (cs.have ? "" : `<p class="cs">Nothing collected yet. Every enemy you place correctly in a grid lands here.</p>`);
}
