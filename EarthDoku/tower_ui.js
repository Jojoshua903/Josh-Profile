// ---------- Enemy Tower screens ----------
const heroImg = (h, cls = "") => `<img class="twSpr ${cls}" src="${h.spr}" alt="" referrerpolicy="no-referrer" draggable="false">`;
const twUi = {goods:false};
const stIcons = st => `${st.sleep ? "💤" : ""}${st.cry ? "😢" : ""}${st.poison ? "☠️" : ""}${st.stun ? "📌" : ""}${st.weak ? "🎯" : ""}${st.distract ? "🍯" : ""}`;
const dailyHero = () => HERO[STARTERS[Math.floor(mulberry32(hashStr("tower2-" + todayKey()))() * STARTERS.length)]];

function drawTower() {
  const el = $("#twWrap");
  if (!el) return;
  $("#viewTower").dataset.act = tr ? Math.min(4, Math.floor((Math.min(tr.floor, TW_TOP) - 1) / 10) + 1) : 0;
  el.classList.toggle("isPick", !tr);
  if (!tr) return drawPicker(el);
  if (tr.phase === "map" || tr.phase === "bless") twSaveRun();
  const relics = (tr.bless || []).filter((k, i, a) => a.indexOf(k) === i).map(k => `<button class="twRel twBlessIc" data-rel="b:${k}" title="${BLESSINGS[k].n}: ${BLESSINGS[k].d}">${BLESSINGS[k].ic}</button>`).join("") + tr.relics.map(k => `<button class="twRel" data-rel="r:${k}" title="${RELICS[k].n}: ${RELICS[k].d}">${RELICS[k].ic}</button>`).join("") + tr.curses.map(k => `<button class="twRel twCurse" data-rel="c:${k}" title="Curse · ${CURSES[k].n}: ${CURSES[k].d}">${CURSES[k].ic}</button>`).join("");
  const bag = Object.keys(tr.goods).length;
  let body = "";
  const fighting = ["fight", "target", "ally", "busy", "combo", "fled"].includes(tr.phase);
  el.classList.toggle("isFight", fighting);
  const swirl = fighting && tr.battle && !tr.battle.swirled ? (tr.battle.swirled = true, `<div class="twSwirl ${tr.battle.type}"></div>`) : "";
  if (fighting) body = `${swirl}<section class="twArena ${tr.battle.type}" id="twFoes"></section><div class="win dialog twLog" id="twLog" aria-live="polite"></div><div class="twMenu" id="twMenu"></div>`;
  else if (tr.phase === "map") body = mapHTML();
  else if (tr.phase === "reward") body = rewardHTML();
  else if (tr.phase === "room") body = roomHTML();
  else if (tr.phase === "over") body = overHTML();
  else if (tr.phase === "summit") body = summitHTML();
  else if (tr.phase === "bless") body = blessHTML();
  el.innerHTML = `
    <div class="twTop"><b class="twFloorN">${tr.endless ? `${tr.floor}<small>F ♾️</small>` : `${Math.min(tr.floor, TW_TOP)}<small>/${TW_TOP}F</small>`}</b>${stripHTML()}<span class="twMoney">$${tr.money}</span>
      ${tr.hard ? `<span class="twTag">🔥 Daily Hard</span>` : tr.weekly ? `<span class="twTag">📅 Weekly</span>` : tr.heat ? `<span class="twTag">🌡️ Heat ${tr.heat}</span>` : ""}${tr.mods && tr.mods.length ? `<span class="twTag" title="New Run+: ${tr.mods.map(k => RUNMOD[k].n).join(", ")}">✨ ${tr.mods.map(k => RUNMOD[k].ic).join("")}</span>` : ""}<span class="twRelics">${relics}</span>
      <span class="twSpacer"></span>
      ${!fighting && tr.phase !== "over" && bag ? `<button class="btn twSmall" id="twBag">🎒 Goods (${Object.values(tr.goods).reduce((a, b) => a + b, 0)})</button>` : ""}
      ${tr.phase === "map" || tr.phase === "bless" ? `<button class="btn twSmall" id="twSaveQuit" title="Your run is saved at the start of every floor. Come back any time.">💾 Save &amp; quit</button>` : ""}
      ${tr.phase !== "over" ? `<button class="btn twSmall" id="twQuit" title="End this run">🏳️ Give up</button>` : ""}</div>
    <div id="twTip"></div>
    ${!fighting && twUi.goods && tr.phase !== "over" ? bagHTML() : ""}
    ${body}
    <section class="twTeam" id="twTeam"></section>`;
  drawTeam();
  if (fighting) { drawFoes(); drawTwLog(); drawMenu(); }
  el.querySelectorAll(".twLog").forEach(l => { l.scrollTop = l.scrollHeight; });
  bindTower();
}
function bindTower() {
  const on = (sel, fn) => { const b = $(sel); if (b) b.onclick = fn; };
  on("#twQuit", () => { if (confirm("Give up this tower run?")) { stopRolling(); twEnd(false, true); } });
  on("#twBag", () => { twUi.goods = !twUi.goods; drawTower(); });
  on("#twSaveQuit", twSaveQuit);
  document.querySelectorAll("[data-door]").forEach(b => b.onclick = () => enterRoom(b.dataset.door));
  document.querySelectorAll("[data-offer]").forEach(b => b.onclick = () => takeOffer(+b.dataset.offer));
  document.querySelectorAll("[data-use]").forEach(b => b.onclick = () => bagUse(b.dataset.use));
  document.querySelectorAll("[data-rel]").forEach(b => b.onclick = () => { twUi.tip = twUi.tip === b.dataset.rel ? null : b.dataset.rel; sfx("click"); drawTip(); });
  on("#twUseCancel", () => { twUi.useK = null; drawTower(); });
  drawTip();
  document.querySelectorAll("[data-buy]").forEach(b => b.onclick = () => buy(b.dataset.buy));
  on("#twSkip", skipOffer);
  on("#twReroll", rerollOffers);
  document.querySelectorAll("[data-bless]").forEach(b => b.onclick = () => chooseBless(b.dataset.bless));
  on("#twOn", () => goMap(true));
  on("#twRetry", () => goMap(false));
  on("#twYes", eventYes);
  document.querySelectorAll("[data-ch]").forEach(b => b.onclick = () => roomChoice(+b.dataset.ch));
  on("#twAgain", () => { tr = null; drawTower(); });
  on("#twTrophy", () => twEnd(true));
  on("#twEndless", goEndless);
  on("#twShare", () => {
    const r = tr.result, names = tr.team.map(m => m.h.name).join(", ");
    const text = `EarthDoku Enemy Tower${tr.hard ? " · 🔥 Daily Hard #" + puzzleNo() : tr.weekly ? " · 📅 Weekly " + weekKey() : ""} · ${r.endless ? `♾️ Endless floor ${r.floors} 🏆` : `Floor ${r.floors}/${TW_TOP}${r.cleared ? " 🏆" : ""}`}${tr.mods && tr.mods.length ? " · ✨" + tr.mods.map(k => RUNMOD[k].ic).join("") : ""}\n${names}`;
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => { $("#twShare").textContent = "Copied!"; }, () => alert(text));
  });
}
function bagHTML() {
  const usable = k => { const g = GOODS[k]; return ["heal", "healall", "full", "cure", "stat"].includes(g.kind) || (g.kind === "revive" && tr.team.some(m => m.ko)) || (g.kind === "pp" && tr.team.some(m => m.mpp && !m.ko)); };
  if (twUi.useK && tr.goods[twUi.useK]) return `<div class="win twBag twPickBar"><span class="twWho">${GOODS[twUi.useK].ic} ${GOODS[twUi.useK].n}: tap a friend below</span><button class="btn twSmall" id="twUseCancel">Back</button></div>`;
  return `<div class="win twBag">${Object.keys(tr.goods).map(k => `<button class="btn twSmall" data-use="${k}" ${usable(k) ? "" : "disabled"} title="${GOODS[k].d}${usable(k) ? "" : " (battle only)"}">${GOODS[k].ic} ${GOODS[k].n} ×${tr.goods[k]}</button>`).join("")}</div>`;
}
function mapHTML() {
  const f = tr.floor, end = tr.endless && f > TW_TOP, act = actOf(f), actName = end ? "♾️ Endless climb" : act.n, newAct = f > 1 && (f - 1) % 10 === 0;
  return `<section class="win twStage">${newAct ? `<p class="twActBanner">— ${end ? `♾️ Endless · floors ${f}–${f + 9}` : act.n} —</p>` : ""}<h2>${f === TW_TOP && !tr.endless ? "The top of the tower" : f % 5 === 0 ? `Floor ${f}: ${f % 10 === 0 ? (end ? "a mighty boss" : "the act boss") : "a boss"}` : `Floor ${f}: pick a room`} <small class="twAct">${actName}</small></h2>
    <div class="twDoors">${tr.doors.map(d => `<button class="twDoor" data-door="${d}"><span class="twDoorIc">${ROOMS[d].ic}</span><b>${ROOMS[d].n}</b><small>${ROOMS[d].d}</small></button>`).join("")}</div>
    <p class="twHint">${end ? `♾️ Endless: foes here are ${Math.round((f - TW_TOP) * 4)}% tougher than the normal climb, and gain another trait every 10 floors. Best endless floor: ${tw.bestEndless || "–"}.` : `A boss waits every 5 floors, and the final foe is on floor ${TW_TOP}.`}${end ? "" : act.game ? ` Enemies in this act come from ${GAMES[act.game].l}.` : " Enemies now come from all three games."}${tr.team.length < 4 ? " Win battles to recruit more heroes (up to 4)." : ""}</p>${goalsHTML()}</section>`;
}
// this run's three goals, ticked off as they're done
function goalsHTML() {
  if (!tr.goals || !tr.goals.length) return "";
  const f = tr.floor - 1;
  return `<div class="twGoals"><b>🎯 Run goals</b>${tr.goals.map(k => { const g = GOALS[k], ok = !hasMod("training") && g.ok(tr.st, f);
    return `<span class="twGoal${ok ? " ok" : ""}">${ok ? "✓" : "○"} ${g.n} <small>${g.t} 🎟️</small></span>`; }).join("")}</div>`;
}
// the first floor of every act: pick one blessing for the rest of the run
function blessHTML() {
  const a = actOf(Math.min(tr.floor, TW_TOP));
  return `<section class="win twStage"><h2>✨ A blessing for ${tr.endless && tr.floor > TW_TOP ? "the endless climb" : a.n}</h2>
    <p class="twSay">A soft light fills the stairwell. Choose one blessing to carry for the rest of the run.</p>
    <div class="twBless">${(tr.blessOpts || []).map(k => { const b = BLESSINGS[k], again = tr.bless.includes(k);
      return `<button class="twBlessCard" data-bless="${k}"><span class="twBlessBig">${b.ic}</span><b>${b.n}</b><small>${b.d}</small>${again ? `<small class="twBlessAgain">You have this one: take it again</small>` : ""}</button>`; }).join("")}</div>
    ${goalsHTML()}</section>`;
}
// after the final foe in a normal run: take the trophy, or keep going
function summitHTML() {
  return `<div class="win dialog twLog">${tr.log.map(l => `<p class="${l.cls}">${l.t}</p>`).join("")}</div>
    <section class="win twStage twSummit"><h2>🏆 You reached the top of the tower!</h2>
      <p class="twSay">The clear is saved${tr.heatUp ? ` and Heat ${tw.heatMax} is unlocked` : ""}. But a staircase keeps going up, into the swirl...</p>
      <p class="twHint">♾️ Endless mode: floors past ${TW_TOP} get tougher every time, with a boss every 5 floors. You keep your party, goods and relics. Your best endless floor is ${tw.bestEndless || "not set yet"}.</p>
      <div class="twMenu"><button class="btn hot" id="twEndless">♾️ Keep climbing</button><button class="btn" id="twTrophy">🏆 Take the trophy and leave</button></div></section>`;
}
function rewardHTML() {
  return `<div class="win dialog twLog">${tr.log.map(l => `<p class="${l.cls}">${l.t}</p>`).join("")}</div>
    <section class="twOffers">${tr.offers.map((o, i) => `<button class="win twOffer" data-offer="${i}"><small class="twKind">${o.kind}</small>
      ${o.hero ? heroImg(o.hero) : `<span class="twOfferIc">${o.ic || "✨"}</span>`}<b>${o.title}</b><small>${o.sub}</small></button>`).join("")}</section>
    <div class="twMenu">${tr.rerolls > 0 ? `<button class="btn" id="twReroll" title="Swap these upgrades for new ones">🔄 Reroll (${tr.rerolls} left)</button>` : ""}${tr.heat >= 5 ? "" : `<button class="btn" id="twSkip">Skip (+$${10 + tr.floor * 3})</button>`}</div>`;
}
function roomHTML() {
  const r = tr.room, t = r.type;
  if (t === "shop") {
    const row = (key, ic, n, d, cost) => `<button class="btn twBuy" data-buy="${key}" ${tr.money < cost ? "disabled" : ""} title="${d}"><span>${ic} ${n}</span><small>${d}</small><b>$${cost}</b></button>`;
    return `<section class="win twStage"><h2>🛒 Mr. Saturn shop</h2><p class="twSay">“${r.text}”</p>
      <div class="twShop">${r.stock.map(k => row(k, GOODS[k].ic, GOODS[k].n, GOODS[k].d, price(GOODS[k].price))).join("")}
      ${r.relic ? row("relic", RELICS[r.relic].ic, RELICS[r.relic].n, RELICS[r.relic].d, price(130)) : ""}
      ${row("hospital", "🏥", "Dr. Saturn", "Heals and revives the whole party", price(30))}</div>
      <div class="twMenu"><button class="btn hot" id="twOn">Leave ▶</button></div></section>`;
  }
  if (t === "event") {
    const quoted = r.ev.narr ? r.text : `“${r.text}”`;
    return `<section class="win twStage"><h2>❓ ${r.ev.who}${r.ev.game ? ` ${badge({game:r.ev.game})}` : ""}</h2><p class="twSay">${quoted}</p>
      <div class="twMenu">${r.done ? `<button class="btn hot" id="twOn">Onward ▶</button>` : `<button class="btn hot" id="twYes">${r.ev.yes}</button><button class="btn" id="twOn">No thanks ▶</button>`}</div></section>`;
  }
  if (["statue", "dojo", "meet", "arcade", "library", "vault"].includes(t)) {
    const cs = r.choices || [], wide = t === "vault" || t === "library";
    return `<section class="win twStage${t === "meet" ? " twMeet" : ""}${wide ? " twPickRoom" : ""}"><h2>${ROOMS[t].ic} ${ROOMS[t].n}</h2>${r.hero ? `<div class="twMeetHero">${heroImg(r.hero)}<b>${r.hero.name}</b> ${badge({game:r.hero.game})}</div>` : ""}<p class="twSay">${r.text}</p>
      <div class="twMenu">${r.done || !cs.length ? `<button class="btn hot" id="twOn">Onward ▶</button>` : cs.map((c, i) => `<button class="btn hot" data-ch="${i}">${c.label}</button>`).join("") + `<button class="btn" id="twOn">Leave ▶</button>`}</div></section>`;
  }
  const title = {spring:"♨️ Hot spring", present:"🎁 Present box", frog:"🐸 Save Frog"}[t];
  return `<section class="win twStage"><h2>${title}</h2><p class="twSay">${r.text}</p>
    <div class="twMenu"><button class="btn hot" id="${t === "frog" ? "twRetry" : "twOn"}">${t === "frog" ? "Try again ▶" : "Onward ▶"}</button></div></section>`;
}
function overHTML() {
  const r = tr.result, names = tr.team.map(m => m.h.name).join(", ");
  const title = r.endless ? `♾️ ${r.left ? "You left the endless climb" : "The endless climb ended"} on floor ${r.left ? r.floors : tr.floor}.`
    : r.cleared ? "🏆 You reached the top of the tower!" : r.left ? `You left the tower after ${r.floors} floor${r.floors === 1 ? "" : "s"}.` : `Your party fell on floor ${tr.floor}.`;
  return `<div class="mgEnd twOver"><b>${title}</b><small>${r.floors} floor${r.floors === 1 ? "" : "s"} cleared with ${names}${tr.hard ? " · 🔥 Daily Hard" : ""}${r.endless ? " · 🏆 top reached" : ""} · Best ever: ${tw.best}${tw.bestEndless ? ` · ♾️ Endless best: ${tw.bestEndless}` : ""}</small>
    ${tr.mods && tr.mods.length ? `<small>✨ New Run+: ${tr.mods.map(k => `${RUNMOD[k].ic} ${RUNMOD[k].n}`).join(", ")}${hasMod("training") ? " (training run: records not saved)" : ""}</small>` : ""}
    ${r.goals && r.goals.length ? `<div class="twGoals twGoalsEnd">${r.goals.map(g => `<span class="twGoal${g.ok ? " ok" : ""}">${g.ok ? "✓" : "✗"} ${GOALS[g.k].n} <small>${GOALS[g.k].t} 🎟️</small></span>`).join("")}</div>
    ${r.cash ? `<small class="twCash">💰 +$${r.cash} for Saturn's shop!</small>` : ""}
    <small>${r.tokens ? `🎟️ +${r.tokens} Tower Token${r.tokens === 1 ? "" : "s"}! ` : ""}You have ${tw.tokens} 🎟️ to spend on perks.</small>` : ""}
    ${tr.weekly ? `<small>📅 Weekly best this week: floor ${tw.weekly[weekKey()] || 0}${r.weekNew ? " · new best!" : ""}</small>` : ""}
    <small>Heroes found so far: ${tw.found.length}/${HEROES.length}</small>${r.heatUp ? `<small>🌡️ Heat ${tw.heatMax} unlocked: ${HEAT[tw.heatMax]}.</small>` : ""}
    <div class="mgBtns"><button class="btn hot" id="twAgain">New run</button><button class="btn" id="twShare">Share</button></div></div>`;
}

function drawTwLog() {
  const el = $("#twLog");
  if (!el || !tr) return;
  // stay pinned to the newest line, unless you've scrolled up to read older ones
  const pinned = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
  el.innerHTML = tr.log.map(l => `<p class="${l.cls}">${l.t}</p>`).join("");
  if (pinned || !el.dataset.seen) el.scrollTop = el.scrollHeight;
  el.dataset.seen = 1;
}
function drawFoes() {
  const el = $("#twFoes");
  if (!el || !tr || !tr.battle) return;
  const b = tr.battle, picking = tr.phase === "target";
  el.innerHTML = `<div class="twFoes${picking ? " picking" : ""}">${b.foes.map(x => {
    const p = x.hp / x.mhp, e = x.e;
    return `<button class="twFoe${x.hp <= 0 ? " gone" : ""}" data-foe="${x.uid}" ${picking && x.hp > 0 ? "" : "disabled"}>
      <span class="twFoeSpr">${spriteHTML(e, "big")}</span>
      <span class="twFoeInfo"><b>${e.name}</b> ${badge(e)}${x.boss ? " 👑" : ""}${x.angry ? " 😤" : ""} <span>${stIcons(x.st)}</span>${x.traits.length ? `<span class="twTraits">${x.traits.map(t => `<span title="${TRAITS[t].d}">${TRAITS[t].ic} ${TRAITS[t].n}</span>`).join("")}${x.sturdy ? ` <span title="Hits left at half damage">×${x.sturdy}</span>` : ""}</span>` : ""}
      <span class="twBar"><span style="width:${p * 100}%;background:${p > .5 ? "#3fae5a" : p > .2 ? "#f2b33d" : "#e2352c"}"></span></span>
      <small class="twReal">In ${GAMES[e.game].l}: ${has(e.hp) ? "HP " + e.hp : "HP ?"}${has(e.off) ? " · Off " + e.off : ""}${has(e.def) ? " · Def " + e.def : ""}</small></span></button>`; }).join("")}</div>`;
  el.querySelectorAll("[data-foe]").forEach(btn => btn.onclick = () => {
    const foe = b.foes.find(x => x.uid === +btn.dataset.foe);
    if (tr.phase === "target" && foe && foe.hp > 0) { const k = b.pending; tr.phase = "fight"; act(k, foe); }
  });
}
function odoDigits(n) { return String(Math.max(0, Math.ceil(n))).padStart(3, "0").split("").map(d => `<span>${d}</span>`).join(""); }
function drawOdo(m) {
  const el = document.querySelector(`.twMember[data-i="${tr.team.indexOf(m)}"] .twOdo`);
  if (el) { el.innerHTML = odoDigits(m.shown); el.classList.toggle("rolling", m.shown > m.hp); }
}
function drawTeam() {
  const el = $("#twTeam");
  if (!el || !tr) return;
  const actor = tr.battle && tr.battle.actor, p = tr.battle ? tr.battle.party : {};
  const pk = tr.phase === "ally" && tr.battle ? allyNeed(tr.battle.pending) : twUi.useK && twUi.goods && tr.goods[twUi.useK] && !["fight", "target", "ally", "busy", "combo", "fled"].includes(tr.phase) ? allyNeed("g:" + twUi.useK) : null;
  const ok = pk ? allyOpts(pk) : [];
  el.innerHTML = tr.team.map((m, i) => `
    <div class="win twMember${m === actor ? " on" : ""}${m.ko ? " ko" : ""}${ok.includes(m) ? " pick" : pk ? " nopick" : ""}" data-i="${i}"${ok.includes(m) ? ` role="button" tabindex="0" data-ally="${i}"` : ""}>
      ${heroImg(m.h)}<div class="twMInfo"><b>${m.h.name}</b><small class="twMStats" title="Combo: ${comboOf(m.h).ic} ${comboOf(m.h).n}"><span>Off <b>${Math.round(m.atk)}</b></span><span>Def <b>${Math.round(m.def)}</b></span><span>Spd <b>${Math.round(m.spd)}</b></span>${m.mpp ? `<span>PSI <b>${Math.round(100 * (1 + m.bonus.psi))}%</b></span>` : ""}<span>${comboOf(m.h).ic}</span></small><small>${stIcons(m.st)}${m.guard ? "🛡️" : ""}${m.tough ? "💪" : ""}${p.shield ? "🔰" : ""}${p.offup ? "🔥" : ""}</small>
      <div class="twStat"><span>HP</span><span class="twOdo${m.shown > m.hp ? " rolling" : ""}">${odoDigits(m.shown)}</span><small>/${m.mhp}</small></div>
      ${m.mpp ? `<div class="twStat"><span>PP</span><span class="twPP">${m.pp}</span><small>/${m.mpp}</small></div>` : ""}
      ${m.ko ? `<small class="twKO">Unconscious</small>` : ""}</div>
    </div>`).join("") + (tr.team.length < 4 ? `<div class="twMember twEmpty">${4 - tr.team.length} open slot${tr.team.length === 3 ? "" : "s"}</div>` : "");
  el.querySelectorAll("[data-ally]").forEach(c => {
    const go = () => {
      const m = tr.team[+c.dataset.ally];
      if (tr.phase === "ally" && tr.battle) { const k = tr.battle.pending; tr.phase = "fight"; act(k, null, m); }
      else if (twUi.useK) { const k = twUi.useK; twUi.useK = null; useGoodOutside(k, m); }
    };
    c.onclick = go; c.onkeydown = ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); go(); } };
  });
}
function drawMenu() {
  const el = $("#twMenu");
  if (!el || !tr || !tr.battle) return;
  const b = tr.battle, m = b.actor;
  if (tr.phase === "fled") { el.innerHTML = `<button class="btn hot" id="twOnF">Continue ▶</button>`; $("#twOnF").onclick = () => goMap(true); return; }
  if (tr.phase === "combo") {
    el.innerHTML = comboShell(b.combo); cRedraw(b.combo); return;
  }
  if (tr.phase === "ally") {
    const k = b.pending, n = k.startsWith("g:") ? GOODS[k.slice(2)].n : TMOVES[k].n;
    el.innerHTML = `<span class="twWho">${n}: pick a friend below</span><button class="btn" id="twCancel">Back</button>`;
    $("#twCancel").onclick = () => { tr.phase = "fight"; b.pending = null; drawMenu(); drawTeam(); }; return;
  }
  if (tr.phase === "target") {
    const k = b.pending, n = k === "bash" ? "Bash" : k.startsWith("g:") ? GOODS[k.slice(2)].n : TMOVES[k].n;
    el.innerHTML = `<span class="twWho">${n}: pick a target above</span><button class="btn" id="twCancel">Back</button>`;
    $("#twCancel").onclick = () => { tr.phase = "fight"; b.pending = null; drawMenu(); drawFoes(); }; return;
  }
  if (tr.phase !== "fight" || !m) { el.innerHTML = `<p class="twWait">...</p>`; return; }
  if (twUi.goods) {
    const keys = Object.keys(tr.goods);
    el.innerHTML = `<span class="twWho">${m.h.name}'s Goods:</span>${keys.length ? keys.map(k => `<button class="btn" data-k="g:${k}" title="${GOODS[k].d}" ${GOODS[k].kind === "revive" && !tr.team.some(x => x.ko) || GOODS[k].kind === "pp" && !tr.team.some(x => x.mpp && !x.ko) ? "disabled" : ""}>${GOODS[k].ic} ${GOODS[k].n} ×${tr.goods[k]}</button>`).join("") : `<span class="twWait">The bag is empty.</span>`}<button class="btn" id="twBack">Back</button>`;
    $("#twBack").onclick = () => { twUi.goods = false; drawMenu(); };
  } else {
    const btn = k => {
      const mv = TMOVES[k], noPP = mv.pp && m.pp < mv.pp, cd = m.cd[k] > 0, none = mv.kind === "revive" && !tr.team.some(x => x.ko);
      return `<button class="btn" data-k="${k}" ${noPP || cd || none ? "disabled" : ""} title="${mv.d || ""}">${mv.sig ? "★ " : ""}${mv.n}${mv.pp ? ` <small>${mv.pp}PP</small>` : ""}${cd ? ` <small>⏳${m.cd[k]}</small>` : ""}</button>`;
    };
    el.innerHTML = `<span class="twWho">${m.h.name}:</span><button class="btn hot" data-k="bash">Bash</button>${shownMoves(m).map(btn).join("")}
      <button class="btn" id="twGoods">🎒 Goods</button><button class="btn" data-k="defend">Defend</button>${b.type === "battle" ? `<button class="btn" data-k="run">Run</button>` : ""}
      <label class="twAuto"><input type="checkbox" id="twAutoBox" ${tr.auto ? "checked" : ""}> Auto</label>`;
    $("#twGoods").onclick = () => { twUi.goods = true; drawMenu(); };
    $("#twAutoBox").onchange = e => { tr.auto = e.target.checked; if (tr.auto && b.actor) autoAct(); };
  }
  el.querySelectorAll("[data-k]").forEach(x => x.onclick = () => { twUi.goods = false; choose(x.dataset.k); });
}
function flashEl(el) { if (!el) return; el.classList.remove("twHit"); void el.offsetWidth; el.classList.add("twHit"); }
const flashFoe = x => flashEl(document.querySelector(`[data-foe="${x.uid}"]`));
const flashHero = m => flashEl(document.querySelector(`.twMember[data-i="${tr.team.indexOf(m)}"]`));

// ---------- tower progress strip ----------
function stripHTML() {
  // endless: show the current block of 10 floors past the top
  if (tr.endless) {
    const f = Math.max(tr.floor, TW_TOP + 1), a = TW_TOP + Math.floor((f - TW_TOP - 1) / 10) * 10 + 1;
    let s = "";
    for (let i = a; i < a + 10; i++) s += `<i class="${i < f ? "done" : i === f ? "now" : ""}${i % 5 === 0 ? " boss" : ""}" title="Floor ${i}${i % 5 === 0 ? " · boss" : ""}"></i>`;
    return `<span class="twStrip endless" aria-label="Endless floor ${tr.floor}">${s}</span>`;
  }
  const f = Math.min(tr.floor, TW_TOP);
  let s = "";
  for (let i = 1; i <= TW_TOP; i++) s += `<i class="${i < f ? "done" : i === f ? "now" : ""}${i % 5 === 0 ? " boss" : ""}${i % 10 === 1 && i > 1 ? " act" : ""}" title="Floor ${i}${i === TW_TOP ? " · the final foe" : i % 5 === 0 ? " · boss" : ""}"></i>`;
  return `<span class="twStrip" aria-label="Floor ${f} of ${TW_TOP}">${s}</span>`;
}

// ---------- picking a starting hero ----------
let twView = null;   // the hero shown in the big panel, even if they haven't been found yet
const findHint = h => FIND[h.id] ? `Not found yet. Someone is hiding somewhere in ${actOf(FIND[h.id][0]).n}...` : "";
// ---------- the hero carousel: cycle through everyone, the one in the middle is the one you pick ----------
const twCar = {game:"all", busy:0};
// heroes you've found come first, so they sit side by side on the carousel; the unfound ones follow
const carList = () => { const l = HEROES.filter(h => twCar.game === "all" || h.game === twCar.game); return [...l.filter(isUnlocked), ...l.filter(h => !isUnlocked(h))]; };
// Daily Hard and Weekly climbs use a set hero
const fixedHero = () => twMode === "weekly" ? HERO[weeklyPlan().hero] : dailyHero();
function pickerSel() {
  if (twMode !== "normal") return fixedHero();
  const list = carList();
  let h = HERO[twView] || HERO[twPick] || HERO.ness;
  if (!list.includes(h)) h = list.find(isUnlocked) || list[0];
  twView = h.id;
  if (isUnlocked(h)) twPick = h.id;
  return h;
}
function profileHTML(sel) {
  const day = todayKey(), hardDone = tw.hard[day] != null, dh = fixedHero(), hard = twMode === "hard", weekly = twMode === "weekly", fixed = hard || weekly;
  const found = isUnlocked(sel), heatNow = Math.min(tw.heat || 0, tw.heatMax || 0), wp = weeklyPlan(), wBest = tw.weekly[weekKey()];
  const bars = h => { const v = statNums(h); return ["HP", "PP", "Off", "Def", "Spd"].map((l, i) => `<span class="twRate"><i>${l}</i><b style="--w:${h.r[i] * 10}%"></b><em>${v[i] || "–"}</em></span>`).join(""); };
  const canGo = fixed || (twPick && isUnlocked(HERO[twPick]));
  return `<section class="twProfile" id="twProfile">
      <div class="twProfileArt${found ? "" : " locked"}">${heroImg(sel, "big")}</div>
      <div class="twProfileInfo">
        <h2>${found ? sel.name : "???"} ${badge({game:sel.game})}</h2>
        <p class="twRole">${found ? sel.role : findHint(sel)}</p>
        ${found ? `<span class="twRates">${bars(sel)}</span>
        <p class="twMoveList"><b>Starts with</b> ${sel.start.map(k => TMOVES[k].n).join(", ")}<br><b>Can learn</b> ${sel.learn.map(k => (TMOVES[k].sig ? "★ " : "") + TMOVES[k].n).join(", ")}<br>${comboLine(sel)}</p>` : ""}
        ${found ? `<button class="btn twSmall twCodexOne" id="twCodexOne">📘 Codex page</button>` : ""}
      </div>
      <div class="twStart">
        <div class="chips" id="twModes"><button data-m="normal" class="${fixed ? "" : "on"}">Normal</button><button data-m="hard" class="${hard ? "on" : ""}" title="Everyone gets the same hero, rooms and enemies today. No hot springs, Save Frog or act rests, and enemies hit harder.">🔥 Daily Hard</button><button data-m="weekly" class="${weekly ? "on" : ""}" title="The same hero, twists and tower for everyone all week. Retry as often as you like.">📅 Weekly</button></div>
        ${hard ? `<small class="twHeatTx">Today's hero is <b>${dh.name}</b>. Everyone starts with the same hero and meets the same rooms.</small>`
        : weekly ? `<small class="twHeatTx">This week's hero is <b>${dh.name}</b>, with ${wp.mods.map(k => `${RUNMOD[k].ic} <b>${RUNMOD[k].n}</b>`).join(" and ")}. The same tower for everyone until Monday, and you can retry as often as you like.${wBest != null ? ` Your best this week: floor <b>${wBest}</b>.` : ""}</small>`
        : ""}
        ${fixed ? "" : `<div class="twModRow"><label class="twHeat">🌡️ Heat <select id="twHeatSel">${HEAT.map((d, i) => `<option value="${i}" ${i === heatNow ? "selected" : ""} ${i > (tw.heatMax || 0) ? "disabled" : ""}>${i}${i > (tw.heatMax || 0) ? " 🔒" : ""}</option>`).join("")}</select></label><button class="btn twSmall twModsBtn" id="twModsBtn">✨ New Run+${activeMods().length ? ` · ${activeMods().length} on` : ""}</button>${activeMods().map(k => `<span class="twModChip" title="${RUNMOD[k].n}: ${RUNMOD[k].d}">${RUNMOD[k].ic}</span>`).join("")}<button class="btn twSmall twModsBtn" id="twPerksBtn" title="Spend Tower Tokens from run goals on permanent perks">🎖️ Perks · ${tw.tokens} 🎟️</button></div><small class="twHeatTx">${heatNow ? HEAT.slice(1, heatNow + 1).join(" · ") : "Reach the top to unlock Heat 1."}</small>`}
        <button class="btn hot twGo" id="twGo" ${canGo ? "" : "disabled"}>${fixed ? `Climb with ${dh.name} ▶` : canGo ? `Climb with ${HERO[twPick].name} ▶` : "Pick a hero you've found"}</button>
      </div>
      <p class="twBest">Best floor <b>${tw.best}</b> · Runs ${tw.runs} · Reached the top ${tw.clears}× · Heroes found <b>${tw.found.length}/${HEROES.length}</b>${tw.bestEndless ? ` · ♾️ Endless best <b>${tw.bestEndless}</b>` : ""}${hardDone ? ` · Daily Hard today: floor ${tw.hard[day]}` : ""}</p>
    </section>`;
}
function bindProfile(el, sel) {
  el.querySelectorAll("#twModes button").forEach(b => b.onclick = () => { twMode = b.dataset.m; drawPicker(el); });
  const hs = $("#twHeatSel"); if (hs) hs.onchange = () => { tw.heat = +hs.value; twSave(); drawPicker(el); };
  const cb = $("#twCodexOne"); if (cb) cb.onclick = () => codexPage(sel);
  const mb = $("#twModsBtn"); if (mb) mb.onclick = () => openRunMods(el);
  const pb = $("#twPerksBtn"); if (pb) pb.onclick = () => openPerks(el);
  const rb = $("#twResume"); if (rb) rb.onclick = () => { if (!twLoadRun()) drawPicker(el); };
  $("#twGo").onclick = () => {
    if (!(twMode !== "normal" || (twPick && isUnlocked(HERO[twPick])))) return;
    const s = twSaved();
    if (s && !confirm(`Start a new climb? Your saved run on floor ${s.tr.floor} will be lost.`)) return;
    startTower(twPick, twMode);
  };
}
function drawPicker(el) {
  $("#viewTower").dataset.act = 0;
  const sel = pickerSel(), hard = twMode !== "normal", list = carList();
  const card = h => { const ok = isUnlocked(h);
    return `<button class="twCard${ok ? "" : " locked"}" data-h="${h.id}" tabindex="-1" aria-label="${ok ? h.name : "Unknown hero"}">
      <span class="twCardArt">${heroImg(h)}</span><b>${ok ? h.name : "???"}</b>${badge({game:h.game})}</button>`; };
  el.innerHTML = `
  <div class="twPick">
    ${profileHTML(sel)}
    <section class="twRoster">
      <h2 class="twTitle">🗼 Enemy Tower <button class="btn twSmall twCodexBtn" id="twCodex">📘 Hero codex ${tw.found.length}/${HEROES.length}</button>${resumeHTML()}</h2>
      <div class="chips twCarG" id="twCarG">${[["all", "All"], ["M1", "Mother"], ["EB", "EarthBound"], ["M3", "Mother 3"]].map(([g, l]) =>
        `<button data-g="${g}" class="${twCar.game === g ? "on" : ""}" ${hard ? "disabled" : ""}>${l} <small>${HEROES.filter(h => (g === "all" || h.game === g) && isUnlocked(h)).length}/${HEROES.filter(h => g === "all" || h.game === g).length}</small></button>`).join("")}</div>
      <div class="twCar${hard ? " hard" : ""}" id="twCar" tabindex="0" aria-label="Hero carousel: use the arrow keys, scroll, or swipe to browse">
        <div class="twCarStage" id="twCarStage">${(hard ? [sel] : list).map(card).join("")}</div>
        <button class="twCarNav prev" data-step="-1" aria-label="Previous hero" ${hard ? "disabled" : ""}>◀</button>
        <button class="twCarNav next" data-step="1" aria-label="Next hero" ${hard ? "disabled" : ""}>▶</button>
      </div>
      <div class="twCarInfo" id="twCarInfo"></div>
      <details class="twHow"><summary>How the tower works</summary>
        <p>Start with one hero and climb ${TW_TOP} floors over four acts: EarthBound enemies, then Mother, then Mother 3, then all three at once. Pick a room on every floor. After every win, pick an upgrade: a new move, stat boosts, gear, goods, a relic, or sometimes a recruit you've already found.</p>
        <p>Only Ninten, Ness and Lucas are known at first. Everyone else is hidden behind rare ✨ rooms: each one only shows up in one act, from a certain floor on. Find them once and they're yours for good.</p>
        <p>Battles work like the games: Bash, PSI, Goods, Defend, Run and Auto. HP rolls down, so you can heal before it hits zero. After a Bash, every hero plays their own combo minigame (a swing, a charge, a spelling test...) for extra hits. A boss waits every 5 floors.</p>
        <p>♾️ Beat the final foe on floor ${TW_TOP} in a normal run and you can keep climbing in Endless mode. Every floor past the top gets tougher, and your best endless floor is saved.</p>
        <p>✨ Each act starts with a choice of blessings. Every run also has 3 goals: finish them for 🎟️ Tower Tokens, and spend those on permanent 🎖️ Perks for normal climbs. Watch for the 🎰 Arcade, 📚 Library and 🗝️ Vault rooms, and use 🔄 Reroll when you don't like an upgrade pick.</p>
      </details>
    </section>
  </div>`;
  bindProfile(el, sel);
  $("#twCodex").onclick = () => codexAll();
  $("#twCarG").onclick = ev => { const b = ev.target.closest("button[data-g]"); if (!b || hard) return; twCar.game = b.dataset.g; sfx("click"); drawPicker(el); };
  const car = $("#twCar");
  car.querySelectorAll(".twCarNav").forEach(b => b.onclick = () => carStep(+b.dataset.step));
  car.querySelectorAll(".twCard").forEach(b => b.onclick = () => { if (hard) return; const i = carList().findIndex(h => h.id === b.dataset.h), j = carList().findIndex(h => h.id === twView); if (i !== j) carGo(i, i > j ? 1 : -1); });
  // scroll wheel and swipes spin it too
  car.onwheel = ev => { if (hard) return; ev.preventDefault(); const d = Math.abs(ev.deltaX) > Math.abs(ev.deltaY) ? ev.deltaX : ev.deltaY; if (Math.abs(d) < 4) return; carStep(d > 0 ? 1 : -1); };
  let sx = null;
  car.onpointerdown = ev => { if (!ev.target.closest(".twCarNav")) sx = ev.clientX; };
  car.onpointerup = ev => { if (sx == null) return; const dx = ev.clientX - sx; sx = null; if (Math.abs(dx) > 40) { ev.preventDefault(); carStep(dx < 0 ? 1 : -1); twCar.swiped = Date.now(); } };
  const eatClick = ev => { if (twCar.swiped && Date.now() - twCar.swiped < 300) { ev.stopPropagation(); ev.preventDefault(); } };
  car.addEventListener("click", eatClick, true);
  carLayout(false);
}
// lay the cards out around the middle one: the further away, the smaller and dimmer
function carLayout(animate = true) {
  const stage = $("#twCarStage");
  if (!stage) return;
  const list = twMode !== "normal" ? [fixedHero()] : carList(), n = list.length, c = Math.max(0, list.findIndex(h => h.id === twView));
  stage.classList.toggle("still", !animate);
  stage.querySelectorAll(".twCard").forEach((el, i) => {
    let d = i - c;
    if (n > 1) { d = ((d % n) + n) % n; if (d > n / 2) d -= n; }
    const ad = Math.abs(d);
    el.style.setProperty("--d", d); el.style.setProperty("--ad", ad);
    el.classList.toggle("mid", d === 0);
    el.classList.toggle("far", ad > 3);
    el.setAttribute("aria-hidden", ad > 3);
  });
  const h = list[c], ok = isUnlocked(h);
  $("#twCarInfo").innerHTML = twMode !== "normal" ? (twMode === "weekly" ? `📅 Weekly: everyone climbs with <b>${h.name}</b> this week` : `🔥 Daily Hard: everyone climbs with <b>${h.name}</b> today`)
    : `<span>${c + 1} / ${n}</span> <b>${ok ? h.name : "???"}</b> ${ok ? (twPick === h.id ? `<span class="twCarTag">✓ Chosen</span>` : "") : `<span class="twCarTag lock">🔒 Not found yet</span>`}`;
}
function carGo(i, dir) {
  const list = carList();
  if (!list.length) return;
  const h = list[((i % list.length) + list.length) % list.length];
  twView = h.id;
  if (isUnlocked(h)) twPick = h.id;
  sfx("click");
  carLayout(true);
  // only the profile is redrawn, so the carousel keeps sliding smoothly
  const el = $("#twWrap"), p = $("#twProfile");
  if (p) { p.outerHTML = profileHTML(h); bindProfile(el, h); }
}
function carStep(dir) {
  if (twMode !== "normal") return;
  const now = Date.now();
  if (now - twCar.busy < 140) return;   // a fast scroll wheel shouldn't skip half the roster
  twCar.busy = now;
  carGo(carList().findIndex(h => h.id === twView) + dir, dir);
}
// arrow keys work whenever the picker is showing
document.addEventListener("keydown", ev => {
  if ($("#viewTower").hidden || tr || !$("#twCar") || !$("#modal").hidden) return;
  if (ev.target.closest && ev.target.closest("input,textarea,select")) return;
  if (ev.key === "ArrowLeft") { ev.preventDefault(); carStep(-1); }
  else if (ev.key === "ArrowRight") { ev.preventDefault(); carStep(1); }
});

window.onTowerShow = () => { drawTower(); if (tr && tr.battle && !tr.battle.over) startRolling(); };
document.addEventListener("keydown", ev => {
  if ($("#viewTower").hidden || !tr || !$("#modal").hidden) return;
  if (ev.target.closest && ev.target.closest("input,textarea")) return;
  if (tr.phase === "combo") {
    const k = ev.code === "Space" || ev.key === "Enter" ? (ev.repeat ? null : "tap") : {ArrowLeft:"L", ArrowRight:"R", ArrowUp:"U", ArrowDown:"D"}[ev.key] || (/^[1-5]$/.test(ev.key) ? ev.key : /^[a-z]$/i.test(ev.key) && !ev.metaKey && !ev.ctrlKey ? "k:" + ev.key : null);
    if (ev.code === "Space" || ev.key.startsWith("Arrow")) ev.preventDefault();
    if (k && comboKey(k)) ev.preventDefault();
    return;
  }
  if ((tr.phase === "target" || tr.phase === "ally" || twUi.useK) && ev.key === "Escape") { const c = $("#twCancel") || $("#twUseCancel"); if (c) c.click(); return; }
  if (tr.phase !== "fight") return;
  const btns = [...document.querySelectorAll("#twMenu .btn:not(:disabled)")], n = +ev.key;
  if (n >= 1 && n <= btns.length) { ev.preventDefault(); btns[n - 1].click(); }
});

// letting go of Space ends a charge combo
document.addEventListener("keyup", ev => { if (tr && tr.phase === "combo" && (ev.code === "Space" || ev.key === "Enter")) comboKey("up"); });
// a hero's starting numbers, in the same order as the rating bars
const statNums = h => { const s = heroStats(h, 1); return [s.mhp, s.mpp, s.atk, s.def, s.spd].map(Math.round); };
const comboLine = h => { const c = comboOf(h); return `<b>Combo</b> ${c.ic} ${c.n}: ${c.tip.charAt(0).toLowerCase() + c.tip.slice(1)}`; };

// ---------- hero codex: a page for every hero you've found ----------
function codexMet(h) {
  if (STARTERS.includes(h.id)) return "Known from the very start.";
  const x = FIND[h.id];
  return x ? `Met in ${actOf(x[0]).n}, from floor ${x[0]} on. “${x[2]}”` : "Met somewhere in the tower.";
}
function codexPage(h) {
  if (!isUnlocked(h)) return codexAll();
  const r = tw.heroes[h.id] || {runs:0, team:0, best:0, clears:0};
  const list = HEROES.filter(isUnlocked), i = list.indexOf(h);
  const prev = list[(i - 1 + list.length) % list.length], next = list[(i + 1) % list.length];
  const nums = statNums(h), rates = ["HP", "PP", "Off", "Def", "Spd"].map((l, k) => `<span class="twRate"><i>${l}</i><b style="--w:${h.r[k] * 10}%"></b><em>${nums[k] || "–"}</em></span>`).join("");
  const mv = k => { const m = TMOVES[k]; return m ? `<li><b>${m.sig ? "★ " : ""}${m.n}</b>${m.pp ? ` <small>${m.pp} PP</small>` : ""}<br><small>${m.d || ""}</small></li>` : ""; };
  openModal(`📘 ${h.name} ${badge({game:h.game})}`, `<div class="cxPage">
    <div class="cxTop"><div class="cxArt">${heroImg(h, "big")}</div>
      <div><p class="cxRole">${h.role}</p><span class="twRates">${rates}</span><p class="cxCombo">${comboLine(h)}</p></div></div>
    <div class="cxRecs">
      <div><b>${r.runs}</b><small>runs started</small></div><div><b>${r.team}</b><small>runs in the party</small></div>
      <div><b>${r.best || "–"}</b><small>best floor</small></div><div><b>${r.clears}</b><small>times at the top</small></div></div>
    <h3>How you met</h3><p class="cxMet">${codexMet(h)}</p>
    <h3>Moves</h3><div class="cxMoves"><div><span class="cxSub">Starts with</span><ul>${h.start.map(mv).join("")}</ul></div>
      <div><span class="cxSub">Can learn</span><ul>${h.learn.map(mv).join("")}</ul></div></div>
    <div class="cxNav"><button class="btn" data-cx="${prev.id}">◀ ${prev.name}</button><button class="btn" data-cx="all">All heroes</button><button class="btn" data-cx="${next.id}">${next.name} ▶</button></div>
  </div>`);
  bindCodex();
}
function codexAll() {
  const found = HEROES.filter(isUnlocked).length;
  openModal(`📘 Hero codex <small style="font-family:var(--mono)">${found}/${HEROES.length} found</small>`, `<div class="cxAll">
    ${["M1", "EB", "M3"].map(g => `<h3>${GAMES[g].l}</h3><div class="cxGrid">${HEROES.filter(h => h.game === g).map(h => {
      const ok = isUnlocked(h), r = tw.heroes[h.id];
      return ok ? `<button class="cxTile" data-cx="${h.id}">${heroImg(h)}<b>${h.name}</b><small>${r && r.best ? `best floor ${r.best}` : "no runs yet"}</small></button>`
        : `<div class="cxTile locked">${heroImg(h)}<b>???</b><small>${FIND[h.id] ? `hiding in ${actOf(FIND[h.id][0]).n.split(" · ")[0]}` : "somewhere"}</small></div>`;
    }).join("")}</div>`).join("")}</div>`);
  bindCodex();
}
function bindCodex() {
  document.querySelectorAll("#mBody [data-cx]").forEach(b => b.onclick = () => { sfx("click"); b.dataset.cx === "all" ? codexAll() : codexPage(HERO[b.dataset.cx]); });
}

// using goods from the bag between battles: ask who gets it when there's a choice
function bagUse(k) {
  const need = allyNeed("g:" + k), opts = need ? allyOpts(need) : [];
  if (need && opts.length > 1) { twUi.useK = k; sfx("click"); return drawTower(); }
  twUi.useK = null;
  useGoodOutside(k, opts[0]);
}
// tap a relic or curse to see what it does
function drawTip() {
  const el = $("#twTip");
  if (!el || !tr) return;
  const t = twUi.tip;
  const bl = (tr.bless || []).filter((k, i, a) => a.indexOf(k) === i);
  if (!t || !(tr.relics.length || tr.curses.length || bl.length)) { el.innerHTML = ""; return; }
  const row = (kind, k, o) => `<li class="${t === kind + ":" + k ? "on" : ""}${kind === "c" ? " curse" : kind === "b" ? " bless" : ""}"><span class="twTipIc">${o.ic}</span><div><b>${o.n}</b>${kind === "c" ? ` <small class="twTipTag">Curse</small>` : kind === "b" ? ` <small class="twTipTag">Blessing</small>` : ""}<small>${o.d}</small></div></li>`;
  el.innerHTML = `<div class="win twTipBox"><div class="twTipHead"><b>${bl.length ? "Blessings, relics" : "Relics"}${tr.curses.length ? " & curses" : ""}</b><button class="btn twSmall" id="twTipX" aria-label="Close">✕</button></div>
    <ul>${bl.map(k => row("b", k, BLESSINGS[k])).join("")}${tr.relics.map(k => row("r", k, RELICS[k])).join("")}${tr.curses.map(k => row("c", k, CURSES[k])).join("")}</ul></div>`;
  $("#twTipX").onclick = () => { twUi.tip = null; drawTip(); };
  const on = el.querySelector("li.on");
  if (on) on.scrollIntoView({block:"nearest"});
}

// ---------- New Run+ options ----------
const activeMods = () => (tw.mods || []).filter(k => RUNMOD[k] && RUNMOD[k].need());
function openRunMods(el) {
  const draw = () => {
    const on = activeMods();
    $("#mBody").innerHTML = `<p class="twModIntro">Twists for your next normal climb. Mix as many as you like. They never apply to the Daily Hard climb.</p>
      <div class="twModList">${RUNMODS.map(m => { const ok = m.need(), act = on.includes(m.id);
        return `<button class="twMod${act ? " on" : ""}${ok ? "" : " locked"}" data-mod="${m.id}" ${ok ? "" : "disabled"} aria-pressed="${act}">
          <span class="twModIc">${ok ? m.ic : "🔒"}</span><span><b>${m.n}</b><small>${ok ? m.d : `Locked: ${m.lock}`}</small></span><span class="twModSw">${act ? "ON" : ok ? "OFF" : ""}</span></button>`; }).join("")}</div>
      <div class="twModFoot"><span>${on.length} on</span><button class="btn" id="twModClear" ${on.length ? "" : "disabled"}>Turn all off</button><button class="btn hot" id="twModDone">Done</button></div>`;
    document.querySelectorAll("#mBody [data-mod]").forEach(b => b.onclick = () => {
      const k = b.dataset.mod;
      tw.mods = tw.mods.includes(k) ? tw.mods.filter(x => x !== k) : [...tw.mods, k];
      twSave(); sfx("click"); draw(); drawPicker(el);
    });
    $("#twModClear").onclick = () => { tw.mods = []; twSave(); draw(); drawPicker(el); };
    $("#twModDone").onclick = closeModal;
  };
  openModal("✨ New Run+", "");
  draw();
}

// permanent Tower perks, bought with Tower Tokens from run goals
function openPerks(el) {
  const draw = () => {
    $("#mTitle").innerHTML = `🎖️ Tower perks <small class="pkTok">${tw.tokens} 🎟️</small>`;
    $("#mBody").innerHTML = `<p class="twModIntro">Finish run goals to earn Tower Tokens 🎟️ (${tw.tokensAll} earned so far). Perks last forever and help every normal climb, but never the Daily Hard or Weekly climbs.</p>
      <div class="pkList">${Object.entries(PERKS).map(([k, p]) => { const lv = perkLv(k), max = p.cost.length, next = p.cost[lv];
        return `<div class="pkItem${lv ? " got" : ""}"><span class="twModIc">${p.ic}</span><span><b>${p.n}${max > 1 ? ` <small class="pkLv">Lv ${lv}/${max}</small>` : ""}</b><small>${p.d}${max > 1 ? " (per level)" : ""}</small></span>
          ${lv >= max ? `<span class="pkMax">✓ Owned</span>` : `<button class="btn twSmall${tw.tokens >= next ? " hot" : ""}" data-perk="${k}" ${tw.tokens >= next ? "" : "disabled"}>${lv ? "Level up" : "Get"} · ${next} 🎟️</button>`}</div>`; }).join("")}</div>
      <div class="twModFoot"><span>${tw.tokens} 🎟️ to spend</span><button class="btn hot" id="pkDone">Done</button></div>`;
    document.querySelectorAll("#mBody [data-perk]").forEach(b => b.onclick = () => {
      const k = b.dataset.perk, c = PERKS[k].cost[perkLv(k)];
      if (c == null || tw.tokens < c) return sfx("bad");
      tw.tokens -= c; tw.perks[k] = perkLv(k) + 1; twSave(); sfx("reward"); draw(); drawPicker(el);
    });
    $("#pkDone").onclick = closeModal;
  };
  openModal("", "");
  draw();
}

// the saved run, if there is one, shown above the climb button
function resumeHTML() {
  const s = twSaved();
  if (!s) return "";
  const t = s.tr, names = t.team.filter(m => HERO[m.h]).map(m => HERO[m.h].name).join(", ");
  const mode = t.hard ? "🔥 Daily Hard · " : t.weekly ? "📅 Weekly · " : "";
  return `<button class="btn twSmall twResume" id="twResume" title="${names} · $${t.money} · saved ${new Date(s.at).toLocaleString()}">💾 Continue ${mode}floor ${t.floor}${t.endless ? " ♾️" : ""}</button>`;
}
