// ---------- Enemy Tower screens ----------
// hero sprites wear whatever skin the player picked in Saturn's shop
const heroImg = (h, cls = "") => { const k = heroLook(h.id); return `<img class="twSpr ${cls}${k ? lookClass(k) : ""}" src="${h.spr}" alt="" referrerpolicy="no-referrer" draggable="false"${k ? lookStyle(k) : ""}>`; };
const twUi = {goods:false};
const stIcons = st => `${st.sleep ? "💤" : ""}${st.cry ? "😢" : ""}${st.poison ? "☠️" : ""}${st.stun ? "📌" : ""}${st.weak ? "🎯" : ""}${st.distract ? "🍯" : ""}`;
const dailyHero = () => HERO[STARTERS[Math.floor(mulberry32(hashStr("tower2-" + todayKey()))() * STARTERS.length)]];

function drawTower() {
  const el = $("#twWrap");
  if (!el) return;
  $("#viewTower").dataset.act = tr ? Math.min(4, Math.floor((Math.min(tr.floor, TW_TOP) - 1) / 10) + 1) : 0;
  el.classList.toggle("isPick", !tr);
  if (!tr) return drawPicker(el);
  noteRelics();
  if (tr.phase === "map" || tr.phase === "bless") twSaveRun();
  const relics = (tr.bless || []).filter((k, i, a) => a.indexOf(k) === i).map(k => `<button class="twRel twBlessIc" data-rel="b:${k}" title="${BLESSINGS[k].n}: ${BLESSINGS[k].d}">${BLESSINGS[k].ic}</button>`).join("") + tr.relics.map(k => `<button class="twRel" data-rel="r:${k}" title="${RELICS[k].n}: ${RELICS[k].d}">${RELICS[k].ic}</button>`).join("") + tr.curses.map(k => `<button class="twRel twCurse" data-rel="c:${k}" title="Curse · ${CURSES[k].n}: ${CURSES[k].d}">${CURSES[k].ic}</button>`).join("");
  const bag = Object.keys(tr.goods).length;
  let body = "";
  const fighting = ["fight", "target", "ally", "busy", "combo", "fled"].includes(tr.phase);
  el.classList.toggle("isFight", fighting);
  const swirl = fighting && tr.battle && !tr.battle.swirled ? (tr.battle.swirled = true, `<div class="twSwirl ${tr.battle.type}"></div>`) : "";
  if (fighting) body = `${swirl}<section class="twArena ${tr.battle.type}" id="twFoes"></section><div class="twLogWrap"><div class="win dialog twLog" id="twLog" aria-live="polite"></div><div class="twComboOver" id="twComboOver" hidden></div></div><div class="twMenu" id="twMenu"></div>`;
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
      ${tr.bellHero && HERO[tr.bellHero] ? `<div class="twMeetHero twBellHero">${heroImg(HERO[tr.bellHero])}<b>🔔 ${HERO[tr.bellHero].name}</b> ${badge({game:HERO[tr.bellHero].game})}<small>${tr.bellJoined ? "came running at the sound of the Friend bell, and joins the party!" : "came running at the sound of the Friend bell! Pick them as a starting hero next time."}</small></div>` : ""}
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
  if (["statue", "dojo", "meet", "arcade", "library", "vault", "chest", "workshop", "moonside"].includes(t)) {
    const cs = r.choices || [], wide = t === "vault" || t === "library" || t === "workshop";
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
    ${r.cash ? `<small class="twCash">💰 +${r.cash} for Saturn's shop!${tr.mods && tr.mods.length && !hasMod("training") ? ` (New Run+ ${cashTag(modCash(tr.mods))})` : ""}</small>` : ""}
    <small>${r.tokens ? `🎟️ +${r.tokens} Tower Token${r.tokens === 1 ? "" : "s"}! ` : ""}You have ${tw.tokens} 🎟️ to spend on perks.</small>` : ""}
    ${tr.weekly ? `<small>📅 Weekly best this week: floor ${tw.weekly[weekKey()] || 0}${r.weekNew ? " · new best!" : ""}</small>` : ""}
    ${tr.bellHero && HERO[tr.bellHero] ? `<div class="twBellMeet">${heroImg(HERO[tr.bellHero])}<small>🔔 The Friend bell brought <b>${HERO[tr.bellHero].name}</b>! They can be picked as a starting hero from now on.</small></div>` : ""}
    <small>Heroes found so far: ${tw.found.length}/${HEROES.length}</small>${r.heatUp ? `<small>🌡️ Heat ${tw.heatMax} unlocked: ${HEAT[tw.heatMax]}.</small>` : ""}${r.endlessNew && r.endlessNew.length ? `<small>🏅 New endless best for ${r.endlessNew.join(", ")}! See 📊 Records.</small>` : ""}${r.champs && r.champs.length ? `<small class="twCash">🏆 Champion skin${r.champs.length === 1 ? "" : "s"} unlocked for ${r.champs.join(", ")}! Wear ${r.champs.length === 1 ? "it" : "them"} from Saturn's shop.</small>` : ""}
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
  if (!el || !tr || !tr.battle) return hideFoeTip();
  const b = tr.battle, picking = tr.phase === "target";
  el.innerHTML = `<div class="twFoes${picking ? " picking" : ""}">${b.foes.map(x => {
    const p = x.hp / x.mhp, e = x.e;
    return `<button class="twFoe${x.hp <= 0 ? " gone" : ""}" data-foe="${x.uid}" ${picking && x.hp > 0 ? "" : `aria-disabled="true"`}>
      <span class="twFoeSpr">${spriteHTML(e, "big")}</span>
      <span class="twFoeInfo"><b>${e.name}</b> ${badge(e)}${x.boss ? " 👑" : ""}${x.angry ? " 😤" : ""} <span>${stIcons(x.st)}</span>${x.traits.length ? `<span class="twTraits">${x.traits.map(t => `<span>${TRAITS[t].ic} ${TRAITS[t].n}</span>`).join("")}${x.sturdy ? ` <span>×${x.sturdy}</span>` : ""}</span>` : ""}
      <span class="twBar"><span style="width:${p * 100}%;background:${p > .5 ? "#3fae5a" : p > .2 ? "#f2b33d" : "#e2352c"}"></span></span></span>
      </button>`; }).join("")}</div>`;
  el.querySelectorAll("[data-foe]").forEach(btn => btn.onclick = () => {
    const foe = b.foes.find(x => x.uid === +btn.dataset.foe);
    if (tr.phase === "target" && foe && foe.hp > 0) { const k = b.pending; tr.phase = "fight"; act(k, foe); }
  });
  el.querySelectorAll("[data-foe]").forEach(btn => {
    const uid = +btn.dataset.foe;
    btn.onpointerenter = btn.onfocus = () => showFoeTip(uid);
    btn.onpointerleave = btn.onblur = () => { if (tipUid === uid) hideFoeTip(); };
  });
  // the enemies redraw after every hit, so keep the card on whoever is still under the pointer
  if (tipUid != null) showFoeTip(tipUid);
}
// ---------- enemy hover card: floats above the page so the battle frame can't cut it off ----------
let tipUid = null;
function showFoeTip(uid) {
  const x = tr && tr.battle && tr.battle.foes.find(f => f.uid === uid), btn = document.querySelector(`[data-foe="${uid}"]`);
  if (!x || x.hp <= 0 || !btn || $("#viewTower").hidden) return hideFoeTip();
  tipUid = uid;
  let tip = $("#twFoeTip");
  if (!tip) { tip = document.createElement("div"); tip.id = "twFoeTip"; tip.className = "twFoeTip"; tip.setAttribute("role", "tooltip"); document.body.appendChild(tip); }
  tip.innerHTML = foeTip(x); tip.hidden = false;
  const r = btn.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
  const left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2));
  // below the enemy when there's room, otherwise above it
  const top = r.bottom + 8 + h < innerHeight ? r.bottom + 8 : Math.max(8, r.top - h - 8);
  tip.style.left = left + "px"; tip.style.top = top + "px";
}
function hideFoeTip() { tipUid = null; const tip = $("#twFoeTip"); if (tip) tip.hidden = true; }
// if the pointer slipped off while the enemies were redrawing, the card goes away on the next move
document.addEventListener("pointermove", ev => { if (tipUid != null && !(ev.target.closest && ev.target.closest(`[data-foe="${tipUid}"]`))) hideFoeTip(); }, {passive:true});
// the card that pops up when you hover over an enemy: its numbers in this fight, and what its traits and statuses mean
const FOE_ST = {sleep:["💤", "Asleep: skips turns until it wakes"], cry:["😢", "Crying: its attacks miss more"], poison:["☠️", "Poisoned"],
  stun:["📌", "Pinned down: can't move"], weak:["🎯", "Weak spot found: lower defense"], distract:["🍯", "Distracted: loses its next turn"]};
function foeTip(x) {
  const e = x.e, row = (l, v) => `<span><small>${l}</small><b>${v}</b></span>`;
  const sts = Object.keys(x.st || {}).filter(k => FOE_ST[k]);
  const notes = [
    x.final ? "🌀 The final foe: it gets back up once" : "",
    x.boss && !x.final ? `👑 Boss: hits the whole party every ${x.angry ? 2 : 3} turns` : "",
    x.boss && !x.angry ? "Gets furious below half HP" : "",
    x.angry ? "😤 Furious: hits harder" : ""
  ].filter(Boolean);
  const real = [has(e.hp) ? "HP " + e.hp : "", has(e.off) ? "Off " + e.off : "", has(e.def) ? "Def " + e.def : "", has(e.spd) ? "Spd " + e.spd : ""].filter(Boolean).join(" · ");
  return `
    <b class="twTipName">${e.name}</b>
    <span class="twTipStats">${row("HP", `${Math.max(0, Math.ceil(x.hp))}/${x.mhp}`)}${row("Offense", Math.round(x.atk))}${row("Defense", Math.round(x.def * (x.st.weak ? .55 : 1)))}${row("Speed", Math.round(x.spd))}</span>
    ${x.traits.length ? `<span class="twTipList">${x.traits.map(t => `<span><b>${TRAITS[t].ic} ${TRAITS[t].n}</b> ${TRAITS[t].d}${t === "sturdy" ? ` (${x.sturdy} left)` : t === "summoner" && x.called ? " (already called)" : ""}</span>`).join("")}</span>` : `<span class="twTipNone">No special traits</span>`}
    ${sts.length ? `<span class="twTipList">${sts.map(k => `<span>${FOE_ST[k][0]} ${FOE_ST[k][1]}</span>`).join("")}</span>` : ""}
    ${notes.length ? `<span class="twTipList">${notes.map(n => `<span>${n}</span>`).join("")}</span>` : ""}
    ${real ? `<small class="twTipReal">In ${GAMES[e.game].l}: ${real}</small>` : ""}
  `;
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
    <div class="win twMember${m === actor ? " on" : ""}${m.ko ? " ko" : ""}${ok.includes(m) ? " pick" : pk ? " nopick" : ""}" data-i="${i}"${ok.includes(m) ? ` role="button" tabindex="0" data-ally="${i}"` : pk ? "" : ` role="button" tabindex="0" data-info="${i}" title="See ${m.h.name}'s moves"`}>
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
  // any other time, tapping a hero opens their sheet (but never in the middle of a combo)
  el.querySelectorAll("[data-info]").forEach(c => {
    const go = () => { if (tr.phase !== "combo") heroSheet(+c.dataset.info); };
    c.onclick = go; c.onkeydown = ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); go(); } };
  });
}
function drawMenu() {
  const el = $("#twMenu");
  if (!el || !tr || !tr.battle) return;
  const b = tr.battle, m = b.actor;
  // the combo minigame sits on top of the battle text; the button bar keeps its size and has nothing to press
  const over = $("#twComboOver");
  if (tr.phase !== "combo") { el.style.minHeight = ""; if (over) { over.hidden = true; over.innerHTML = ""; } }
  if (tr.phase === "fled") { el.innerHTML = `<button class="btn hot" id="twOnF">Continue ▶</button>`; $("#twOnF").onclick = () => goMap(true); return; }
  if (tr.phase === "combo") {
    if (!over) { el.innerHTML = comboShell(b.combo); cRedraw(b.combo); return; }
    if (!el.style.minHeight) el.style.minHeight = el.offsetHeight + "px";
    el.innerHTML = `<span class="twWho">⚡ Combo time! Play it in the box above.</span>`;
    // nothing else keeps focus, so Space and Enter can't press a button behind the minigame
    if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
    // clicking the minigame never moves focus onto its buttons, so a later key press can't click them twice
    over.onmousedown = ev => ev.preventDefault();
    over.innerHTML = comboShell(b.combo); over.hidden = false; cRedraw(b.combo); return;
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
      return `<button class="btn" data-k="${k}" ${noPP || cd || none ? "disabled" : ""} title="${mvDesc(mv)}${mvEst(masteredMove(m, k), m) ? ` (${mvEst(masteredMove(m, k), m)})` : ""}">${mv.sig ? "★ " : ""}${mv.n}${masteryOf(m, k) ? ` <small class="twMast">${"✦".repeat(masteryOf(m, k))}</small>` : ""}${mv.pp ? ` <small>${mv.pp}PP</small>` : ""}${cd ? ` <small>⏳${m.cd[k]}</small>` : ""}</button>`;
    };
    el.innerHTML = `<span class="twWho">${m.h.name}:</span><button class="btn hot" data-k="bash">Bash</button>${shownMoves(m).map(btn).join("")}
      <button class="btn" id="twGoods">🎒 Goods</button><button class="btn" data-k="defend">Defend</button>${b.type === "battle" ? `<button class="btn" data-k="run">Run</button>` : ""}<button class="btn twSmall" id="twSheet" title="See ${m.h.name}'s moves (I)">📋 Moves</button>
      <label class="twAuto"><input type="checkbox" id="twAutoBox" ${tr.auto ? "checked" : ""}> Auto</label>`;
    $("#twGoods").onclick = () => { twUi.goods = true; drawMenu(); };
    $("#twSheet").onclick = () => heroSheet(tr.team.indexOf(m));
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
// tabs: all, one game each (series heroes only), or ✏️ Yours for the heroes you made
const inTab = (h, g) => g === "all" || (g === "mine" ? !!h.mine : !h.mine && h.game === g);
const carList = () => { const l = HEROES.filter(h => inTab(h, twCar.game)); return [...l.filter(isUnlocked), ...l.filter(h => !isUnlocked(h))]; };
// Daily Hard and Weekly climbs use a set hero
const fixedHero = () => twMode === "weekly" ? HERO[weeklyPlan().hero] : dailyHero();
function pickerSel() {
  if (twMode !== "normal") return fixedHero();
  const list = carList();
  let h = HERO[twView] || HERO[twPick] || HERO.ness;
  if (!list.length) return null;   // the ✏️ Yours tab before you've made anyone
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
        <p class="twMoveList"><b>Starts with</b> ${sel.start.map(k => TMOVES[k].n).join(", ")}<br><b>Can learn</b> ${sel.learn.map(k => (TMOVES[k].sig ? "★ " : "") + TMOVES[k].n + (PSI_NEEDS[k] ? ` <small>(after ${TMOVES[PSI_NEEDS[k]].n})</small>` : "")).join(", ")}<br>${comboLine(sel)}</p>` : ""}
        ${found ? `<span class="twProfBtns"><button class="btn twSmall twCodexOne" id="twCodexOne">📘 Codex page</button>${sel.mine ? `<button class="btn twSmall twCodexOne" id="twEditMine">✏️ Edit hero</button>` : ""}</span>` : ""}
      </div>
      <div class="twStart">
        <div class="chips" id="twModes"><button data-m="normal" class="${fixed ? "" : "on"}">Normal</button><button data-m="hard" class="${hard ? "on" : ""}" title="Everyone gets the same hero, rooms and enemies today. No hot springs, Save Frog or act rests, and enemies hit harder.">🔥 Daily Hard</button><button data-m="weekly" class="${weekly ? "on" : ""}" title="The same hero, twists and tower for everyone all week. Retry as often as you like.">📅 Weekly</button></div>
        ${hard ? `<small class="twHeatTx">Today's hero is <b>${dh.name}</b>. Everyone starts with the same hero and meets the same rooms.</small>`
        : weekly ? `<small class="twHeatTx">This week's hero is <b>${dh.name}</b>, with ${wp.mods.map(k => `${RUNMOD[k].ic} <b>${RUNMOD[k].n}</b>`).join(" and ")}. The same tower for everyone until Monday, and you can retry as often as you like.${wBest != null ? ` Your best this week: floor <b>${wBest}</b>.` : ""}</small>`
        : ""}
        ${fixed ? "" : `<div class="twModRow"><label class="twHeat">🌡️ Heat <select id="twHeatSel">${HEAT.map((d, i) => `<option value="${i}" ${i === heatNow ? "selected" : ""} ${i > (tw.heatMax || 0) ? "disabled" : ""}>${i}${i > (tw.heatMax || 0) ? " 🔒" : ""}</option>`).join("")}</select></label><button class="btn twSmall twModsBtn" id="twModsBtn">✨ New Run+${activeMods().length ? ` · ${activeMods().length} on · ${cashTag(modCash(activeMods()))}` : ""}</button>${activeMods().map(k => `<span class="twModChip" title="${RUNMOD[k].n}: ${RUNMOD[k].d}">${RUNMOD[k].ic}</span>`).join("")}<button class="btn twSmall twModsBtn" id="twPerksBtn" title="Spend Tower Tokens from run goals on permanent perks">🎖️ Perks · ${tw.tokens} 🎟️</button></div><small class="twHeatTx">${heatNow ? HEAT.slice(1, heatNow + 1).join(" · ") : "Reach the top to unlock Heat 1."}</small>`}
        <button class="btn hot twGo" id="twGo" ${canGo ? "" : "disabled"}>${fixed ? `Climb with ${dh.name} ▶` : canGo ? `Climb with ${HERO[twPick].name} ▶` : "Pick a hero you've found"}</button>
      </div>
      ${typeof shop !== "undefined" && shop.bell ? `<p class="twBellNote">🔔 Friend bell ready: reach the top of your next climb and a hero you haven't met will come running. It stays with you until then.</p>` : ""}
      <p class="twBest">Best floor <b>${tw.best}</b> · Runs ${tw.runs} · Reached the top ${tw.clears}× · Heroes found <b>${tw.found.length}/${HEROES.length}</b>${tw.bestEndless ? ` · ♾️ Endless best <b>${tw.bestEndless}</b>` : ""}${hardDone ? ` · Daily Hard today: floor ${tw.hard[day]}` : ""}</p>
    </section>`;
}
function bindProfile(el, sel) {
  el.querySelectorAll("#twModes button").forEach(b => b.onclick = () => { twMode = b.dataset.m; drawPicker(el); });
  const hs = $("#twHeatSel"); if (hs) hs.onchange = () => { tw.heat = +hs.value; twSave(); drawPicker(el); };
  const cb = $("#twCodexOne"); if (cb) cb.onclick = () => codexPage(sel);
  const eb = $("#twEditMine"); if (eb) eb.onclick = () => { sfx("open"); openCustom(sel.id); };
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
    ${sel ? profileHTML(sel) : `<section class="twProfile twMineEmpty" id="twProfile"><div class="twMineArt">🎨</div><div class="twProfileInfo"><h2>Your own heroes</h2>
      <p class="twRole">Make up to ${CU_MAX} heroes of your own. Draw their sprite pixel by pixel (or borrow any hero or enemy sprite), name them, spend ${CU_POINTS} stat points and pick their moves.</p>
      <button class="btn hot twGo" id="twMakeBig">✨ Create your first hero</button></div></section>`}
    <section class="twRoster">
      <h2 class="twTitle">🗼 Enemy Tower <button class="btn twSmall twCodexBtn" id="twCodex">📘 Hero codex ${tw.found.length}/${HEROES.length}</button><button class="btn twSmall twCodexBtn" id="twRecords">📊 Records${relicNew() ? ` · 📖 ${relicNew()} new` : ""}</button><button class="btn twSmall twCodexBtn twMakeBtn" id="twMake" title="Make your own hero: sprite, name, stats and moves">✨ New hero <small>${tw.customs.length}/${CU_MAX}</small></button>${resumeHTML()}</h2>
      <div class="chips twCarG" id="twCarG">${[["all", "All"], ["M1", "Mother"], ["EB", "EarthBound"], ["M3", "Mother 3"], ["mine", "✏️ Yours"]].map(([g, l]) =>
        `<button data-g="${g}" class="${twCar.game === g ? "on" : ""}" ${hard ? "disabled" : ""}>${l} <small>${g === "mine" ? `${tw.customs.length}/${CU_MAX}` : `${HEROES.filter(h => inTab(h, g) && isUnlocked(h)).length}/${HEROES.filter(h => inTab(h, g)).length}`}</small></button>`).join("")}</div>
      <div class="twCar${hard ? " hard" : ""}" id="twCar" tabindex="0" aria-label="Hero carousel: use the arrow keys, scroll, or swipe to browse">
        <div class="twCarStage" id="twCarStage">${(hard ? [sel] : list).map(card).join("")}</div>
        <button class="twCarNav prev" data-step="-1" aria-label="Previous hero" ${hard ? "disabled" : ""}>◀</button>
        <button class="twCarNav next" data-step="1" aria-label="Next hero" ${hard ? "disabled" : ""}>▶</button>
      </div>
      <div class="twCarInfo" id="twCarInfo"></div>
      <details class="twHow"><summary>How the tower works</summary>
        <p>Start with one hero and climb ${TW_TOP} floors over four acts: EarthBound enemies, then Mother, then Mother 3, then all three at once. Pick a room on every floor. After every win, pick an upgrade: a new move, stat boosts, gear, goods, a relic, or sometimes a recruit you've already found.</p>
        <p>Only Ninten, Ness and Lucas are known at first. Everyone else is hidden behind rare ✨ rooms: each one only shows up in one act, from a certain floor on. Find them once and they're yours for good.</p>
        <p>✏️ You can also make up to ${CU_MAX} heroes of your own with <b>✨ New hero</b> (they live under the ✏️ Yours tab): draw a sprite pixel by pixel or pick any hero or enemy sprite, a color, a name, how to spend ${CU_POINTS} stat points, a combo minigame, one starting move and up to ${CU_LEARN} moves to learn along the way. They can join climbs as a recruit too, and earn their own gold look by reaching the top.</p>
        <p>Battles work like the games: Bash, PSI, Goods, Defend, Run and Auto. HP rolls down, so you can heal before it hits zero. After a Bash, every hero plays their own combo minigame (a swing, a charge, a spelling test...) for extra hits. A boss waits every 5 floors.</p>
        <p>♾️ Beat the final foe on floor ${TW_TOP} in a normal run and you can keep climbing in Endless mode. Every floor past the top gets tougher, and your best endless floor is saved.</p>
        <p>✨ Each act starts with a choice of blessings. Every run also has 3 goals: finish them for 🎟️ Tower Tokens, and spend those on permanent 🎖️ Perks for normal climbs. Watch for the 🎰 Arcade, 📚 Library and 🗝️ Vault rooms, and the rare 💎 Golden chest that holds a cosmetic for Saturn's shop, and use 🔄 Reroll when you don't like an upgrade pick.</p>
      </details>
    </section>
  </div>`;
  if (sel) bindProfile(el, sel);
  else $("#twMakeBig").onclick = () => { sfx("open"); openCustom(); };
  $("#twCodex").onclick = () => codexAll();
  $("#twRecords").onclick = () => { sfx("click"); openRecords(); };
  $("#twMake").onclick = () => { sfx("open"); openCustom(); };
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
  if (!n) { $("#twCarInfo").innerHTML = "<span>No heroes of your own yet</span>"; return; }
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
    if (ev.code === "Space" || ev.key === "Enter" || ev.key.startsWith("Arrow")) ev.preventDefault();
    if (k && comboKey(k)) ev.preventDefault();
    return;
  }
  if ((tr.phase === "target" || tr.phase === "ally" || twUi.useK) && ev.key === "Escape") { const c = $("#twCancel") || $("#twUseCancel"); if (c) c.click(); return; }
  // I: the sheet for whoever's turn it is (or the leader)
  if ((ev.key === "i" || ev.key === "I") && !ev.metaKey && !ev.ctrlKey && tr.team.length) {
    const a = tr.battle && tr.battle.actor; ev.preventDefault(); heroSheet(a ? tr.team.indexOf(a) : 0); return;
  }
  if (tr.phase !== "fight") return;
  const btns = [...document.querySelectorAll("#twMenu .btn:not(:disabled)")], n = +ev.key;
  if (n >= 1 && n <= btns.length) { ev.preventDefault(); btns[n - 1].click(); }
});

// letting go of Space ends a charge combo
document.addEventListener("keyup", ev => { if (tr && tr.phase === "combo" && (ev.code === "Space" || ev.key === "Enter")) { ev.preventDefault(); comboKey("up"); } });
// a hero's starting numbers, in the same order as the rating bars
const statNums = h => { const s = heroStats(h, 1); return [s.mhp, s.mpp, s.atk, s.def, s.spd].map(Math.round); };
const comboLine = h => { const c = comboOf(h); return `<b>Combo</b> ${c.ic} ${c.n}: ${c.tip.charAt(0).toLowerCase() + c.tip.slice(1)}`; };

// ---------- hero codex: a page for every hero you've found ----------
function codexMet(h) {
  if (h.mine) return "You made them yourself in the hero maker. Edit them any time from the Tower picker.";
  if (STARTERS.includes(h.id)) return "Known from the very start.";
  const x = FIND[h.id];
  return x ? `Met in ${actOf(x[0]).n}, from floor ${x[0]} on. “${x[2]}”` : "Met somewhere in the tower.";
}
// what each kind of move does, shown as a small icon and label on the codex page
const CX_KIND = {hit:["⚔️", "Attack"], psi:["✨", "PSI attack"], heal:["💚", "Heal"], healall:["💚", "Party heal"], cure:["🩹", "Cure"],
  sleep:["💤", "Sleep"], stun:["⛓️", "Pin down"], weak:["🔻", "Weaken"], revive:["💖", "Revive"], cry:["😵", "Distract"], shield:["🛡️", "Shield"],
  offup:["💪", "Power up"], magnet:["🧲", "Drain PP"], tough:["🪨", "Toughen"], pray:["🙏", "Prayer"], chant:["🎵", "Chant"], guard:["🙈", "Guard"],
  invent:["🔧", "Gadget"], steal:["💰", "Steal"], ppall:["🔋", "Restore PP"], run:["🏃", "Escape"]};
// a plain description for moves that don't have one written, built from their numbers
function mvDesc(m) {
  if (m.d) return m.d;
  const who = m.all ? "every enemy" : "one enemy", pw = m.pow ? ` (${m.pow}× power)` : "";
  if (m.kind === "hit") return `Hits ${who}${m.times ? ` ${m.times} times` : ""}${pw}${m.miss ? ", but can miss" : ""}`;
  if (m.kind === "psi") return `PSI damage to ${who}${pw}${m.miss ? ", but can miss" : ""}`;
  if (m.kind === "heal") return `Heals one friend by ${Math.round((m.pow || 0) * 100)}% of their max HP`;
  if (m.kind === "healall") return `Heals the whole party by ${Math.round((m.pow || 0) * 100)}% of max HP`;
  if (m.kind === "revive") return `Revives a fallen friend with ${Math.round((m.pow || 0) * 100)}% HP`;
  return (CX_KIND[m.kind] || ["", "A special move"])[1];
}
// rough damage or healing for one hero right now, before the enemy's defense
function mvEst(m, mem) {
  if (!mem) return "";
  const offup = tr && tr.battle && tr.battle.party.offup ? 1.3 : 1;
  if (m.kind === "hit" && m.pow) return `≈${Math.round(mem.atk * 2 * m.pow * offup * (m.times || 1))} dmg`;
  if (m.kind === "psi" && m.pow) return `≈${Math.round((12 + mem.atk * 1.05) * m.pow * (1 + mem.bonus.psi) * offup)} dmg`;
  if ((m.kind === "heal" || m.kind === "healall") && m.pow) return `≈${Math.round(mem.mhp * m.pow)} HP`;
  return "";
}
function cxMove(k, mem) {
  const m = TMOVES[k];
  if (!m) return "";
  const [ic, kind] = CX_KIND[m.kind] || ["•", "Move"];
  const targets = ["hit", "psi", "weak"].includes(m.kind) ? (m.all ? "every enemy" : "one enemy") : "";
  // for a hero in your party: can they use it right now, and how well do they know it?
  const mm = mem ? masteredMove(mem, k) : m, lv = mem ? masteryOf(mem, k) : 0, used = mem && mem.uses ? mem.uses[k] || 0 : 0;
  const mast = !mem ? "" : lv >= 2 ? `<span class="mast">✦✦ mastered</span>` : `<span class="mast">${"✦".repeat(lv) || "✧"} ${used}/${MASTERY[lv + 1]} uses to ${"✦".repeat(lv + 1)}</span>`;
  const now = !mem ? "" : mem.ko ? "" : m.pp && mem.pp < m.pp ? `<span class="no">needs ${m.pp - mem.pp} more PP</span>` : mem.cd[k] > 0 ? `<span class="no">⏳ ready in ${mem.cd[k]}</span>` : `<span class="ok">ready</span>`;
  const tags = [m.pp ? `${m.pp} PP` : "free", mm.cd ? `${mm.cd}-turn reload` : "", targets, m.times ? `hits ×${m.times}` : "", m.miss ? "can miss" : "", mvEst(mm, mem),
    !mem && PSI_NEEDS[k] ? `after ${TMOVES[PSI_NEEDS[k]].n}` : ""].filter(Boolean);
  return `<li class="cxMv${m.sig ? " sig" : ""}"><span class="cxMvIc" title="${kind}">${ic}</span>
    <div class="cxMvTx"><div class="cxMvTop"><b>${m.n}</b>${m.sig ? `<span class="cxStar">★ Signature</span>` : ""}<span class="cxKindTag">${kind}</span></div>
      <small>${mvDesc(m)}</small><div class="cxTags">${tags.map(t => `<span>${t}</span>`).join("")}${now}${mast}</div></div></li>`;
}
// ---------- hero sheet: tap a hero in your party to see what they can do right now ----------
function heroSheet(i) {
  if (!tr || !tr.team[i]) return;
  const mem = tr.team[i], h = mem.h, c = comboOf(h);
  const left = h.learn.filter(k => TMOVES[k] && !mem.moves.includes(k));
  const st = Object.keys(mem.st || {}).length ? stIcons(mem.st) : "";
  const num = (l, v, sub) => `<div><b>${v}</b><small>${l}${sub ? ` <em>${sub}</em>` : ""}</small></div>`;
  const nav = tr.team.length > 1 ? `<div class="cxNav">${tr.team.map((x, j) => `<button class="btn${j === i ? " hot" : ""}" data-sheet="${j}">${x.h.name}</button>`).join("")}</div>` : "";
  sfx("open");
  openModal(`📋 ${h.name}`, `<div class="cxPage cxNew twSheet">
    <section class="cxHero g${h.game}">
      <div class="cxArt">${heroImg(h, "big")}</div>
      <div class="cxId"><h2>${h.name} ${badge({game:h.game})}</h2><p class="cxRole">Level ${mem.lv} · ${h.role}${mem.ko ? " · 😵 Unconscious" : ""}${st ? ` · ${st}` : ""}</p>
        <div class="cxRecs twSheetNums">${num("HP", `${Math.ceil(mem.hp)}/${mem.mhp}`)}${mem.mpp ? num("PP", `${mem.pp}/${mem.mpp}`) : ""}${num("Offense", Math.round(mem.atk))}${num("Defense", Math.round(mem.def))}${num("Speed", Math.round(mem.spd))}${mem.bonus.psi ? num("PSI power", `+${Math.round(mem.bonus.psi * 100)}%`) : ""}</div></div>
    </section>
    <section class="cxBox"><h3>Moves <small>${mem.moves.length}</small></h3><ul class="cxMvs">
      <li class="cxMv"><span class="cxMvIc">👊</span><div class="cxMvTx"><div class="cxMvTop"><b>Bash</b><span class="cxKindTag">Attack</span></div><small>A normal hit on one enemy. Always free.</small><div class="cxTags"><span>free</span><span>one enemy</span>${mvEst({kind:"hit", pow:1}, mem) ? `<span>${mvEst({kind:"hit", pow:1}, mem)}</span>` : ""}</div></div></li>
      ${mem.moves.map(k => cxMove(k, mem)).join("")}</ul></section>
    <section class="cxBox"><h3>${c.ic} Combo · ${c.n}</h3><p class="cxMet">${c.tip}.</p></section>
    ${left.length ? `<section class="cxBox twSheetLeft"><h3>Can still learn <small>${left.length}</small></h3><ul class="cxMvs">${left.map(k => cxMove(k)).join("")}</ul></section>` : ""}
    ${nav}
  </div>`);
  document.querySelectorAll("[data-sheet]").forEach(b => b.onclick = () => heroSheet(+b.dataset.sheet));
}
function codexPage(h) {
  if (!isUnlocked(h)) return codexAll();
  const r = tw.heroes[h.id] || {runs:0, team:0, best:0, clears:0};
  const list = HEROES.filter(isUnlocked), i = list.indexOf(h);
  const prev = list[(i - 1 + list.length) % list.length], next = list[(i + 1) % list.length];
  const nums = statNums(h), c = comboOf(h);
  const rates = ["HP", "PP", "Offense", "Defense", "Speed"].map((l, k) => `<div class="cxStat"><span>${l}</span><b style="--w:${h.r[k] * 10}%"></b><em>${nums[k] || "–"}</em></div>`).join("");
  // signature moves go last, so the everyday moves are easy to scan
  const learn = h.learn.slice().sort((a, b) => !!(TMOVES[a] && TMOVES[a].sig) - !!(TMOVES[b] && TMOVES[b].sig));
  const rec = (v, l) => `<div><b>${v}</b><small>${l}</small></div>`;
  openModal(`📘 Hero codex <small style="font-family:var(--mono)">${i + 1}/${list.length}</small>`, `<div class="cxPage cxNew">
    <section class="cxHero g${h.game}">
      <div class="cxArt">${heroImg(h, "big")}</div>
      <div class="cxId"><h2>${h.name} ${badge({game:h.game})}</h2><p class="cxRole">${h.role}</p>
        <div class="cxStats">${rates}</div></div>
    </section>
    <div class="cxRecs">${rec(r.runs, "runs started")}${rec(r.team, "in the party")}${rec(r.best || "–", "best floor")}${rec(r.clears, "times at the top")}${rec(r.endless ? `♾️ ${r.endless}` : "–", "endless best")}</div>
    <div class="cxTwo">
      <section class="cxBox"><h3>🤝 How you met</h3><p class="cxMet">${codexMet(h)}</p></section>
      <section class="cxBox"><h3>${c.ic} Combo · ${c.n}</h3><p class="cxMet">${c.tip}.</p></section>
    </div>
    <section class="cxBox"><h3>Starts with <small>${h.start.length}</small></h3><ul class="cxMvs">${h.start.map(k => cxMove(k)).join("")}</ul></section>
    <section class="cxBox"><h3>Can learn <small>${learn.length}</small></h3>${learn.length ? `<ul class="cxMvs">${learn.map(k => cxMove(k)).join("")}</ul>` : `<p class="cxMet">Nothing. ${h.name} is happy just as they are.</p>`}</section>
    <div class="cxNav"><button class="btn" data-cx="${prev.id}">◀ ${prev.name}</button><button class="btn" data-cx="all">All heroes</button><button class="btn" data-cx="${next.id}">${next.name} ▶</button></div>
  </div>`);
  bindCodex();
}
function codexAll() {
  const found = HEROES.filter(isUnlocked).length;
  openModal(`📘 Hero codex <small style="font-family:var(--mono)">${found}/${HEROES.length} found</small>`, `<div class="cxAll">
    ${["M1", "EB", "M3", ...(tw.customs.length ? ["mine"] : [])].map(g => `<h3>${g === "mine" ? "✏️ Your heroes" : GAMES[g].l} <small>${HEROES.filter(h => inTab(h, g) && isUnlocked(h)).length}/${HEROES.filter(h => inTab(h, g)).length}</small></h3><div class="cxGrid">${HEROES.filter(h => inTab(h, g)).map(h => {
      const ok = isUnlocked(h), r = tw.heroes[h.id];
      return ok ? `<button class="cxTile" data-cx="${h.id}">${heroImg(h)}<b>${h.name}</b><small>${r && r.best ? `best floor ${r.best}` : "no runs yet"}</small></button>`
        : `<div class="cxTile locked">${heroImg(h)}<b>???</b><small>${FIND[h.id] ? `hiding in ${actOf(FIND[h.id][0]).n.split(" · ")[0]}` : "somewhere"}</small></div>`;
    }).join("")}</div>`).join("")}</div>`);
  bindCodex();
}
function bindCodex() {
  document.querySelectorAll("#mBody [data-cx]").forEach(b => b.onclick = () => { sfx("click"); b.dataset.cx === "all" ? codexAll() : codexPage(HERO[b.dataset.cx]); });
}

// ---------- Tower records: an endless leaderboard for every hero, and the last few climbs ----------
const twRec = {tab:"board"};
function boardHTML() {
  const rows = HEROES.filter(isUnlocked).map(h => ({h, r:tw.heroes[h.id] || {}}));
  const ranked = rows.filter(x => x.r.endless).sort((a, b) => b.r.endless - a.r.endless || (b.r.clears || 0) - (a.r.clears || 0) || a.h.name.localeCompare(b.h.name));
  const rest = rows.filter(x => !x.r.endless).sort((a, b) => (b.r.best || 0) - (a.r.best || 0) || a.h.name.localeCompare(b.h.name));
  const medal = i => ["🥇", "🥈", "🥉"][i] || `${i + 1}.`;
  const row = (x, rank) => `<button class="rcRow" data-cx="${x.h.id}"><span class="rcRank">${rank}</span>${heroImg(x.h)}<b>${x.h.name}</b>
    <span class="rcNums"><em>${x.r.endless ? `♾️ ${x.r.endless}` : "–"}</em><small>best ${x.r.best || "–"} · top ${x.r.clears || 0}×</small></span></button>`;
  return `<p class="twModIntro">Every hero's highest endless floor. A hero gets credit for any climb they're in the party for. Training runs don't count. Tap a hero for their codex page.</p>
    ${ranked.length ? `<div class="rcList">${ranked.map((x, i) => row(x, medal(i))).join("")}</div>` : `<p class="rcEmpty">Nobody has gone past floor ${TW_TOP} yet. Beat the final foe in a normal climb, then keep going!</p>`}
    ${rest.length ? `<h3 class="rcSub">Not past the top yet</h3><div class="rcList dim">${rest.map(x => row(x, "·")).join("")}</div>` : ""}`;
}
function historyHTML() {
  if (!tw.history.length) return `<p class="rcEmpty">No climbs saved yet. Your last ${TW_HISTORY} climbs will show up here.</p>`;
  const h = tw.history, counted = h.filter(x => !x.training);
  const avg = counted.length ? Math.round(counted.reduce((s, x) => s + x.floors, 0) / counted.length) : 0;
  const modeTag = x => x.mode === "hard" ? `<span class="twTag">🔥 Daily Hard</span>` : x.mode === "weekly" ? `<span class="twTag">📅 Weekly</span>` : "";
  const result = x => x.endless ? `🏆 Top, then ♾️ ${x.left ? "left on" : "fell on"} floor ${x.left ? x.floors : x.at}` : x.cleared ? "🏆 Reached the top"
    : x.left ? `Left after ${x.floors} floor${x.floors === 1 ? "" : "s"}` : `Fell on floor ${x.at}`;
  const when = t => new Date(t).toLocaleString(undefined, {month:"short", day:"numeric", hour:"2-digit", minute:"2-digit"});
  return `<div class="rcStats"><div><b>${h.length}</b><small>climbs saved</small></div><div><b>${avg}</b><small>average floors</small></div>
      <div><b>${h.filter(x => x.cleared).length}</b><small>reached the top</small></div><div><b>${fmt$(h.reduce((s, x) => s + (x.cash || 0), 0))}</b><small>earned for the shop</small></div></div>
    <div class="rcHist">${h.map(x => `<div class="rcRun${x.cleared ? " top" : ""}">
      <div class="rcRunHead"><b>${result(x)}</b><small>${when(x.t)}</small></div>
      <div class="rcParty">${x.team.filter(id => HERO[id]).map(id => `<span title="${HERO[id].name}">${heroImg(HERO[id])}</span>`).join("")}</div>
      <div class="rcTags">${modeTag(x)}${x.heat ? `<span class="twTag">🌡️ Heat ${x.heat}</span>` : ""}${x.mods.filter(k => RUNMOD[k]).map(k => `<span class="twTag" title="${RUNMOD[k].n}">${RUNMOD[k].ic} ${RUNMOD[k].n}</span>`).join("")}
        ${x.training ? `<span class="twTag">🐣 Training: not counted</span>` : `<span class="twTag">💰 ${fmt$(x.cash)}</span>${x.tokens ? `<span class="twTag">🎟️ ${x.tokens}</span>` : ""}`}</div></div>`).join("")}</div>`;
}
// the relic book: one page per relic, filled in the first time you pick it up
const relicNew = () => Object.values(tw.relicBook).filter(b => !b.seen).length;
function bookHTML() {
  const keys = Object.keys(RELICS), got = keys.filter(k => tw.relicBook[k]);
  const when = t => new Date(t).toLocaleDateString(undefined, {month:"short", day:"numeric"});
  const html = `<p class="twModIntro">Every relic you've ever picked up in the Tower. Look for them in treasure, shops, events, the Arcade and the Vault. <b>${got.length}/${keys.length}</b> found.</p>
    <div class="rcStats rbStats"><div><b>${got.length}</b><small>pages filled</small></div><div><b>${keys.length - got.length}</b><small>still missing</small></div>
      <div><b>${got.length ? RELICS[got.slice().sort((a, c) => tw.relicBook[c].runs - tw.relicBook[a].runs)[0]].ic : "–"}</b><small>carried most</small></div><div><b>${Math.round(got.length / keys.length * 100)}%</b><small>complete</small></div></div>
    <div class="rbGrid">${keys.map((k, i) => { const r = RELICS[k], b = tw.relicBook[k];
      return b ? `<div class="rbTile${b.seen ? "" : " new"}">${b.seen ? "" : `<i class="rbNew">NEW</i>`}<span class="rbNo">#${i + 1}</span><span class="rbIc">${r.ic}</span><b>${r.n}</b><small>${r.d}</small>
          <em>First found ${when(b.t)} on floor ${b.fl} · carried in ${b.runs} climb${b.runs === 1 ? "" : "s"}</em></div>`
        : `<div class="rbTile locked"><span class="rbNo">#${i + 1}</span><span class="rbIc">❔</span><b>???</b><small>Not found yet</small></div>`; }).join("")}</div>`;
  // opening the book marks every page as read
  if (got.some(k => !tw.relicBook[k].seen)) { got.forEach(k => tw.relicBook[k].seen = true); twSave(); }
  return html;
}
function openRecords(tab) {
  if (tab) twRec.tab = tab;
  const fresh = relicNew();
  const tabs = [["board", "🏅 Endless leaderboard"], ["hist", "📜 Run history"], ["book", `📖 Relic book${fresh ? ` <small>${fresh} new</small>` : ""}`]];
  const body = twRec.tab === "board" ? boardHTML() : twRec.tab === "book" ? bookHTML() : historyHTML();
  openModal("📊 Tower records", `<div class="chips rcTabs" role="tablist">${tabs.map(([k, l]) => `<button data-rc="${k}" role="tab" aria-selected="${twRec.tab === k}" class="${twRec.tab === k ? "on" : ""}">${l}</button>`).join("")}</div>
    <div class="rcBody">${body}</div>`);
  document.querySelectorAll("#mBody [data-rc]").forEach(b => b.onclick = () => { sfx("click"); openRecords(b.dataset.rc); });
  bindCodex();
}

// ---------- boss intro cards: a title card before every boss, with a line about who you're up against ----------
const BOSS_NAMED = [
  [/giygas/i, "You cannot grasp the true form of Giygas's attack!"], [/pokey|porky/i, "Spankety spankety spankety! He's been waiting for this."],
  [/starman/i, "Your abilities are... interesting. Starmen don't usually say that."], [/belch/i, "The smell arrives before he does."],
  [/mani mani/i, "The statue's eyes follow you everywhere."], [/carpainter/i, "Lightning! Behold the power of the Mani Mani!"],
  [/masked man/i, "..."], [/fassad/i, "Nwehehehe! He brought his bananas."], [/devil|demon/i, "It's been waiting at the top of these stairs a long time."],
  [/robot|cyborg|mecha/i, "Fully charged and fully rude."], [/king/i, "Royalty demands that you lose."]
];
const BOSS_KIND = {
  Human:["has been practicing that evil laugh all week.", "cracks their knuckles. It's personal now.", "says this tower isn't big enough for both of you."],
  Animal:["growls. It definitely skipped breakfast.", "sniffs the air. It smells fear. And cookies.", "is having a very bad day."],
  Bug:["buzzes menacingly. Mostly menacingly.", "has six legs and zero chill.", "wants its floor back."],
  Plant:["is rooted to the spot. On purpose.", "has been photosynthesizing pure rage.", "smells nice, which is somehow worse."],
  Machine:["beeps. Translation: you're in trouble.", "was programmed to ruin your day.", "is running at 110% capacity."],
  Alien:["came from very far away just for this.", "says resistance is pretty futile, actually.", "glows in a way that seems unfriendly."],
  Ghost:["was here before the tower, and it's staying.", "rattles something. You'd rather not know what.", "is dead serious."],
  Object:["is an object. An angry object.", "should not be able to move. And yet.", "has a lot of nerve for a thing."],
  Weird:["...You can't tell which way it's facing.", "is happening. Somehow.", "makes the room feel slightly sideways."]
};
function bossLine(x) {
  const e = x.e, named = BOSS_NAMED.find(([re]) => re.test(e.name));
  if (named) return named[1];
  if (tr.battle.type === "final") return `${e.name} is all that stands between you and the top.`;
  const lines = BOSS_KIND[e.kinds[0]] || BOSS_KIND.Weird;
  return `${e.name} ${lines[hashStr("boss-" + e.name) % lines.length]}`;
}
function bossCard(done) {
  const b = tr.battle, x = b.foes.find(f => f.boss) || b.foes[0], v = $("#viewTower"), fin = b.type === "final";
  if (!x || !v) return done();
  const card = document.createElement("div");
  card.className = "bossCard" + (fin ? " final" : "");
  card.setAttribute("role", "dialog"); card.setAttribute("aria-label", `${fin ? "Final foe" : "Boss"}: ${x.e.name}`);
  const traits = x.traits.length ? `<p class="bcTraits">${x.traits.map(t => `<span>${TRAITS[t].ic} ${TRAITS[t].n}</span>`).join("")}</p>` : "";
  card.innerHTML = `<div class="bcInner win"><small class="bcTag">${fin ? "🌀 THE FINAL FOE" : `👑 BOSS · FLOOR ${tr.floor}`}</small>
    <div class="bcArt">${spriteHTML(x.e, "big")}</div><h2 class="bcName">${x.e.name}</h2><p class="bcGame">${badge(x.e)}${b.foes.length > 1 ? ` <small>and ${b.foes.length - 1} more</small>` : ""}</p>${traits}
    <p class="bcLine">“${bossLine(x)}”</p><small class="bcSkip">Click or press any key to fight</small></div>`;
  let gone = false, shown = false;
  // while the card is up, key presses only close it, so they can't press a battle button by accident
  const key = ev => { if (ev.metaKey || ev.ctrlKey || v.hidden || !$("#modal").hidden) return; ev.preventDefault(); ev.stopPropagation(); close(); };
  const close = () => { if (gone) return; gone = true; document.removeEventListener("keydown", key, true); if (shown) { card.classList.add("out"); setTimeout(() => card.remove(), 250); } done(); };
  card.onclick = close;
  // it slides in once the battle swirl clears, and closes by itself after a few seconds
  setTimeout(() => { if (gone) return; shown = true; v.appendChild(card); document.addEventListener("keydown", key, true); }, fin ? 1050 : 850);
  setTimeout(close, (fin ? 1050 : 850) + (tr.auto ? 1800 : 3600));
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
    const on = activeMods(), mult = modCash(on);
    $("#mBody").innerHTML = `<p class="twModIntro">Twists for your next normal climb. Mix as many as you like. They never apply to the Daily Hard climb. Each one changes the money Mr. Saturn pays when the climb ends: easier twists pay less, harder ones pay more.</p>
      <div class="twModList">${RUNMODS.map(m => { const ok = m.need(), act = on.includes(m.id), [n, goal] = m.prog();
        const tag = `<em class="twModCash ${m.cash > 1 ? "up" : "down"}">${cashTag(m.cash)}</em>`;
        return `<button class="twMod${act ? " on" : ""}${ok ? "" : " locked"}" data-mod="${m.id}" ${ok ? "" : "disabled"} aria-pressed="${act}">
          <span class="twModIc">${ok ? m.ic : "🔒"}</span><span><b>${m.n} ${tag}</b><small>${ok ? m.d : `Locked: ${m.lock} (${Math.min(n, goal).toLocaleString()}/${goal.toLocaleString()})`}</small></span><span class="twModSw">${act ? "ON" : ok ? "OFF" : ""}</span></button>`; }).join("")}</div>
      <div class="twModFoot"><span>${on.length} on${on.length ? ` · ${cashTag(mult)} shop money${mult === MOD_CASH_MAX || mult === MOD_CASH_MIN ? " (limit)" : ""}` : ""}</span><button class="btn" id="twModClear" ${on.length ? "" : "disabled"}>Turn all off</button><button class="btn hot" id="twModDone">Done</button></div>`;
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
