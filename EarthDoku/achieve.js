// ---------- achievements: each one earns a title, and some come with a free item from Saturn's shop ----------
const ACH_KEY = "earthdoku-ach";
const ach = Object.assign({got:{}, title:null, v:0}, store.get(ACH_KEY) || {});
const achSave = () => store.set(ACH_KEY, ach);

// everything the checks need, gathered once per check
function achFacts() {
  const grids = gridHistory().filter(g => g.done), geos = geoHistory().filter(g => g.done);
  const coll = Object.keys(collection).filter(id => BY_ID.has(id)).map(id => BY_ID.get(id));
  const starmen = ALL.filter(e => /starman/i.test(e.name));
  return {
    grids, geos, coll,
    streak:streaks(grids.map(g => g.d)).best,
    iq:Math.max(0, ...grids.map(g => g.iq || 0)),
    perGame:g => coll.filter(e => e.game === g).length,
    starmen:starmen.length && starmen.every(e => collection[e.id]),
    geoBest:Math.max(0, ...geos.map(g => g.total)),
    mgRuns:Object.values(mg.plays).reduce((s, n) => s + n, 0),
    paidWindows:SKINS.filter(s => s.p && owns(s.id)).length
  };
}
// {id, ic, n: name, d: how to get it, t: title, r: reward item id (optional), ok: check}
const ACHS = [
  {id:"grid1", ic:"🎯", n:"First battle", d:"Finish a daily grid.", t:"Rookie", ok:x => x.grids.length >= 1},
  {id:"grid25", ic:"📅", n:"Veteran", d:"Finish 25 daily grids.", t:"Veteran", ok:x => x.grids.length >= 25},
  {id:"perfect", ic:"⭐", n:"Perfect grid", d:"Fill all 9 squares of a daily grid.", t:"Grid master", r:"franklin", ok:x => x.grids.some(g => g.right === 9)},
  {id:"hardperf", ic:"🔥", n:"Perfect on Hard", d:"Get a perfect daily grid played fully on Hard.", t:"PSI prodigy", r:"thunder", ok:x => x.grids.some(g => g.right === 9 && g.hard)},
  {id:"streak7", ic:"📆", n:"One week straight", d:"Play the daily grid 7 days in a row.", t:"Regular", r:"w_saturn", ok:x => x.streak >= 7},
  {id:"streak30", ic:"🗓️", n:"A whole month", d:"Play the daily grid 30 days in a row.", t:"Lifer", r:"soundstone", ok:x => x.streak >= 30},
  {id:"iq", ic:"🧠", n:"Big brain", d:"Score 250+ Grid IQ in a daily grid.", t:"Dr. Andonuts' pupil", r:"h_okey", ok:x => x.iq >= 250},
  {id:"coll50", ic:"★", n:"Enemy watcher", d:"Collect 50 enemies.", t:"Enemy watcher", ok:x => x.coll.length >= 50},
  {id:"coll150", ic:"📖", n:"Field researcher", d:"Collect 150 enemies.", t:"Field researcher", r:"pastcave", ok:x => x.coll.length >= 150},
  {id:"collall3", ic:"🎮", n:"Series fan", d:"Collect 25 enemies from each game.", t:"Series fan", ok:x => ["M1", "EB", "M3"].every(g => x.perGame(g) >= 25)},
  {id:"bosses", ic:"👑", n:"Boss hunter", d:"Collect 10 bosses.", t:"Boss hunter", ok:x => x.coll.filter(e => e.boss).length >= 10},
  {id:"starmen", ic:"🌟", n:"Star gazer", d:"Collect every enemy with Starman in its name.", t:"Star gazer", r:"starman", ok:x => x.starmen},
  {id:"geo1", ic:"🗺️", n:"Tourist", d:"Finish a daily Map Guessr run.", t:"Tourist", ok:x => x.geos.length >= 1},
  {id:"geo20k", ic:"📍", n:"Navigator", d:"Score 20,000+ in a daily Map Guessr run.", t:"Navigator", r:"fourside", ok:x => x.geoBest >= 20000},
  {id:"geostreak", ic:"🧭", n:"Never lost", d:"Get a Map Guessr streak of 10.", t:"Never lost", r:"w_summers", ok:() => bestStreak() >= 10},
  {id:"mgall", ic:"🕹️", n:"Arcade kid", d:"Play every minigame at least once.", t:"Arcade kid", r:"h_zoom", ok:() => MINIGAMES.every(g => mg.plays[g.id])},
  {id:"mg50", ic:"🎰", n:"Arcade regular", d:"Play 50 minigame runs.", t:"High scorer", ok:x => x.mgRuns >= 50},
  {id:"sil", ic:"👤", n:"Sharp eyes", d:"Score 20/20 in Silhouette Guessr.", t:"Sharp eyes", r:"osohe", ok:() => (mg.best.sil || 0) >= 20},
  {id:"quote", ic:"💬", n:"Script reader", d:"Get every line right in Who Said It?", t:"Script reader", r:"h_yes", ok:() => (mg.best.quote || 0) >= QUOTE_ROUNDS},
  {id:"tw10", ic:"🗼", n:"Climber", d:"Reach floor 10 of the Tower.", t:"Climber", ok:() => tw.best >= 10},
  {id:"twtop", ic:"🏆", n:"Tower champion", d:"Beat the final foe on floor 40.", t:"Tower champion", r:"manimani", ok:() => tw.clears >= 1},
  {id:"twend", ic:"♾️", n:"Beyond the top", d:"Reach floor 50 in Endless mode.", t:"Endless one", r:"swirl", ok:() => (tw.bestEndless || 0) >= 50},
  {id:"twhard", ic:"🔥", n:"Daily daredevil", d:"Reach floor 25 in a Daily Hard climb.", t:"Daredevil", r:"dalaam", ok:() => tw.bestHard >= 25},
  {id:"heroes10", ic:"🤝", n:"Making friends", d:"Find 10 Tower heroes.", t:"Good friend", ok:() => tw.found.length >= 10},
  {id:"heroesall", ic:"💞", n:"Friend to all", d:"Find every Tower hero.", t:"Friend to all", r:"w_lumine", ok:() => tw.found.length >= HEROES.length},
  {id:"rich", ic:"💰", n:"Saving up", d:"Have $1,000 in your wallet at once.", t:"Piggy banker", ok:() => shop.money >= 1000},
  {id:"spender", ic:"🛍️", n:"Big spender", d:"Spend $3,000 in Saturn's shop.", t:"Big spender", ok:() => shop.spent >= 3000},
  {id:"windows", ic:"🪟", n:"Window shopper", d:"Own 10 bought (or won) window skins.", t:"Window shopper", ok:x => x.paidWindows >= 10},
];
const ACH = Object.fromEntries(ACHS.map(a => [a.id, a]));
const rewardName = id => { const s = ITEM[id]; return s ? `${s.n} ${{skin:"window", wall:"wallpaper", hit:"hit text"}[s.cat] || ""}`.trim() : ""; };

// gives the free item (or $50 if you already bought it)
function achReward(a) {
  if (!a.r) return "";
  if (!owns(a.r)) { shop.owned.push(a.r); return `Free: ${rewardName(a.r)}`; }
  shop.money += 50; shop.earned += 50;
  return "You already own its prize, so here's $50";
}
function checkAch() {
  let x;
  try { x = achFacts(); } catch { return; }
  const fresh = ACHS.filter(a => !ach.got[a.id] && (() => { try { return a.ok(x); } catch { return false; } })());
  if (!fresh.length) { if (!ach.v) { ach.v = 1; achSave(); } return; }
  const quiet = !ach.v;   // the first check after this update catches up on old progress in one toast
  const notes = fresh.map(a => { ach.got[a.id] = todayKey(); return {a, prize:achReward(a)}; });
  ach.v = 1; achSave(); shopSave(); drawWallet(true);
  if (quiet && notes.length > 1) {
    const prizes = notes.filter(n => n.a.r).length;
    toast(`<span class="tBig">🏅</span><div><b>${notes.length} achievements already earned!</b><br><small>${prizes ? `${prizes} free prize${prizes === 1 ? "" : "s"} added to Saturn's shop. ` : ""}See them in 📊 Stats.</small></div>`);
  } else notes.forEach(({a, prize}) => toast(`<span class="tBig">${a.ic}</span><div><b>Achievement: ${a.n}</b><br><small>New title “${a.t}”${prize ? ` · ${prize}` : ""}</small></div>`));
  if (window.sfx) sfx("reward");
  drawTitle();
  if (!$("#viewStats").hidden && window.onStatsShow) onStatsShow();
}

// the chosen title shows in the bottom bar next to the logo
function drawTitle() {
  const t = ach.title && ach.got[ach.title] && ACH[ach.title] ? ACH[ach.title].t : null;
  const el = $("#achBadge"); el.hidden = !t; el.textContent = t ? `🏅 ${t}` : "";
}
function achCardHTML() {
  const got = ACHS.filter(a => ach.got[a.id]);
  return `<section class="win stCard achCard"><h3>🏅 Achievements <small>${got.length}/${ACHS.length}</small></h3>
    <label class="achTitle">Your title <select id="achSel"><option value="">None</option>${got.map(a => `<option value="${a.id}" ${ach.title === a.id ? "selected" : ""}>${a.t}</option>`).join("")}</select>
      <small>Shown next to the logo at the bottom.</small></label>
    <div class="achGrid">${ACHS.map(a => { const on = !!ach.got[a.id];
      return `<div class="achItem${on ? " got" : ""}"><span class="achIc">${on ? a.ic : "🔒"}</span><div><b>${a.n}</b><small>${a.d}</small>
        <small class="achPrize">Title: ${a.t}${a.r ? ` · 🎁 ${rewardName(a.r)}` : ""}${on ? ` · ✔ ${ach.got[a.id]}` : ""}</small></div></div>`; }).join("")}</div></section>`;
}
function achBind() {
  const s = $("#achSel");
  if (s) s.onchange = () => { ach.title = s.value || null; achSave(); drawTitle(); sfx("click"); };
}
drawTitle();
setTimeout(checkAch, 400);
