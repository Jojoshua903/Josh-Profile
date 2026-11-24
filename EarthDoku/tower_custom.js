// ---------- your own heroes: pick or draw a sprite, a name, stats, a combo and a handful of moves ----------
// saved in the tower save as tw.customs (up to CU_MAX); each one lives in HEROES like everyone else, marked mine:true
const CUSTOM_ID = "custom", CU_MAX = 6, CU_POINTS = 30, CU_LEARN = 5, CU_NAME = 16, CU_ROLE = 48;
const CU_STATS = ["HP", "PP", "Offense", "Defense", "Speed"];
// quick starting points for the stat sliders (each adds up to 30)
const CU_PRESETS = [["⚖️", "Balanced", [6, 6, 6, 6, 6]], ["💪", "Bruiser", [8, 0, 9, 7, 6]], ["🔮", "Psychic", [5, 10, 3, 4, 8]],
  ["💨", "Speedster", [5, 3, 7, 4, 10]], ["🧱", "Tank", [10, 2, 6, 10, 2]], ["💚", "Healer", [6, 9, 3, 6, 6]]];
// looks you can tint your hero with: every color swap, every moving look, and gold once they've reached the top
const cuLooks = id => Object.keys(HLOOKS).filter(k => !k.startsWith("sig_") && (k !== "champ" || (id && champWon(id))));

// ---------- hand-drawn sprites: stored as a tiny palette plus one character per pixel ----------
const PX_CH = "123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const PX_URLS = new Map();
function pxEncode(px, n) {
  const pal = [...new Set(px.filter(Boolean))].slice(0, PX_CH.length);
  return {k:"draw", n, pal, d:px.map(c => { const i = pal.indexOf(c); return c && i >= 0 ? PX_CH[i] : "."; }).join("")};
}
const pxDecode = s => s.d.split("").map(c => c === "." ? "" : s.pal[PX_CH.indexOf(c)] || "");
function pxUrl(s) {
  const key = s.n + "|" + s.pal.join(",") + "|" + s.d;
  if (PX_URLS.has(key)) return PX_URLS.get(key);
  const cv = document.createElement("canvas"); cv.width = cv.height = s.n;
  const ctx = cv.getContext("2d");
  pxDecode(s).forEach((c, i) => { if (c) { ctx.fillStyle = c; ctx.fillRect(i % s.n, Math.floor(i / s.n), 1, 1); } });
  const url = cv.toDataURL("image/png");
  PX_URLS.set(key, url);
  return url;
}
const cuSprUrl = s => {
  if (!s) return HERO.mrsaturn.spr;
  if (s.k === "draw" && s.d) return pxUrl(s);
  if (s.k === "enemy") { const e = BY_ID.get(s.id); return (e && spriteUrl(e)) || HERO.mrsaturn.spr; }
  return (HERO[s.id] && !HERO[s.id].mine && HERO[s.id].spr) || HERO.mrsaturn.spr;
};
const cuDefault = () => ({id:null, name:"Hero", role:"A brand-new face from Onett", game:"EB", spr:{k:"hero", id:"mrsaturn"}, look:null,
  r:[6, 6, 6, 6, 6], start:"pkfire", learn:["lifeup", "pkfireB"], combo:"ness"});

// older saves had a single tw.custom
if (!Array.isArray(tw.customs)) { tw.customs = tw.custom ? [{...tw.custom, id:CUSTOM_ID}] : []; delete tw.custom; twSave(); }
const cuNewId = () => { let id; do id = "c_" + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36); while (HERO[id]); return id; };

// tw.customs → the hero objects the tower uses (kept as the same objects, so edits show up everywhere)
function cuApply() {
  const ids = new Set(tw.customs.map(c => c.id));
  HEROES.filter(h => h.mine && !ids.has(h.id)).forEach(h => { HEROES.splice(HEROES.indexOf(h), 1); delete HERO[h.id]; delete COMBOS[h.id]; });
  tw.found = tw.found.filter(id => !(id === CUSTOM_ID || id.startsWith("c_")) || ids.has(id));
  tw.customs.forEach((c, i) => {
    let h = HERO[c.id];
    if (!h) { h = {id:c.id}; HEROES.splice(i, 0, h); HERO[c.id] = h; }
    Object.assign(h, {name:c.name, game:c.game, spr:cuSprUrl(c.spr), r:c.r.slice(), start:[c.start], learn:c.learn.slice(), role:c.role || "Your very own hero", look:c.look || null, mine:true});
    COMBOS[c.id] = COMBOS[c.combo] || COMBOS.ness;
    if (!tw.found.includes(c.id)) tw.found.push(c.id);
  });
}
cuApply();

// a hero can't be changed in the middle of a climb they're part of
const cuBusy = id => {
  if (tr && tr.team.some(m => m.h.id === id)) return true;
  const s = twSaved();
  return !!(s && s.tr.team.some(m => m.h === id));
};

// ---------- the editor ----------
let cu = null;                                   // the draft being edited
const cuUi = {tab:"start", cat:"all", q:"", view:"main", sk:"hero", sg:"all", sq:""};
const cuSpent = () => cu.r.reduce((a, b) => a + b, 0);
const cuNeedsPP = k => !!(TMOVES[k] && TMOVES[k].pp);
const cuStars = () => cu.learn.filter(k => TMOVES[k].sig).length;
// the moves on offer: everything except moves that only make sense for one hero's gimmick
const CU_POOL = Object.keys(TMOVES).filter(k => !["pokeyshield"].includes(k));
const CU_CATS = [["all", "All"], ["picked", "✔ Picked"], ["atk", "⚔️ Attacks"], ["psi", "✨ PSI"], ["heal", "💚 Healing"], ["sup", "🛡️ Support"], ["sig", "★ Signature"]];
const cuCat = k => { const m = TMOVES[k]; return m.sig ? "sig" : m.kind === "hit" ? "atk" : m.kind === "psi" ? "psi" : ["heal", "healall", "cure", "revive", "ppall"].includes(m.kind) ? "heal" : "sup"; };
const cuPicked = k => cu.start === k || cu.learn.includes(k);
const cuMoveList = () => CU_POOL.filter(k => (cuUi.cat === "all" || (cuUi.cat === "picked" ? cuPicked(k) : cuCat(k) === cuUi.cat))
    && (!cuUi.q || norm(TMOVES[k].n + " " + (TMOVES[k].d || "")).includes(norm(cuUi.q))))
  .sort((a, b) => (cu.start === b) - (cu.start === a) || cu.learn.includes(b) - cu.learn.includes(a) || TMOVES[a].n.localeCompare(TMOVES[b].n));
// anything that would make the hero unplayable, as a message (or "" when it's fine)
function cuProblem() {
  if (!cu.name.trim()) return "Give your hero a name.";
  if (cuSpent() > CU_POINTS) return `That's ${cuSpent() - CU_POINTS} stat point${cuSpent() - CU_POINTS === 1 ? "" : "s"} too many.`;
  if (!cu.r[0]) return "HP needs at least 1 point.";
  if (!cu.start) return "Pick a starting move.";
  if (!cu.r[1] && [cu.start, ...cu.learn].some(cuNeedsPP)) return "Moves that cost PP need at least 1 point in PP.";
  if (TMOVES[cu.start].sig) return "Signature moves can only be learned later, not known from the start.";
  if (cuStars() > 1) return "Only one ★ signature move.";
  const known = [cu.start, ...cu.learn], miss = known.find(k => PSI_NEEDS[k] && !known.includes(PSI_NEEDS[k]));
  if (miss) return `${TMOVES[miss].n} needs ${TMOVES[PSI_NEEDS[miss]].n} too.`;
  return "";
}

// id: edit that hero; nothing: make a new one
function openCustom(id) {
  const c = id && tw.customs.find(x => x.id === id);
  if (c && cuBusy(c.id)) {
    openModal("✏️ Your hero", `<p class="ceNote">${c.name} is in the middle of a climb right now. Finish or give up that climb first, then come back to change them.</p>
      <div class="actions"><button class="btn" id="ceOk">OK</button></div>`);
    $("#ceOk").onclick = closeModal;
    return;
  }
  if (!c && tw.customs.length >= CU_MAX) {
    openModal("✏️ Your heroes", `<p class="ceNote">You already have ${CU_MAX} heroes of your own, which is the most there's room for. Delete one from their ✏️ Edit page to make space.</p>
      <div class="actions"><button class="btn" id="ceOk">OK</button></div>`);
    $("#ceOk").onclick = closeModal;
    return;
  }
  cu = JSON.parse(JSON.stringify(c || cuDefault()));
  cuUi.view = "main"; cuUi.tab = "start"; cuUi.cat = "all"; cuUi.q = "";
  openModal(c ? `✏️ Edit ${c.name}` : `✨ Create a hero <small style="font-family:var(--mono)">${tw.customs.length + 1}/${CU_MAX}</small>`, `<div class="ceWrap" id="ceWrap"></div>`);
  drawCustom();
}

const cuTags = m => [m.pp ? `${m.pp} PP` : "free", m.cd ? `${m.cd}-turn reload` : "", m.all ? "all enemies" : "", m.times ? `×${m.times}` : "", m.miss ? "can miss" : ""].filter(Boolean);
const cuMoveRow = k => {
  const m = TMOVES[k], [ic, kind] = CX_KIND[m.kind] || ["•", "Move"];
  const isStart = cu.start === k, isLearn = cu.learn.includes(k);
  const ppBad = !cu.r[1] && cuNeedsPP(k);
  const tags = [...cuTags(m), PSI_NEEDS[k] ? `needs ${TMOVES[PSI_NEEDS[k]].n}` : ""].filter(Boolean);
  const on = cuUi.tab === "start" ? isStart : isLearn;
  const off = cuUi.tab === "start" ? !!m.sig : (!isLearn && (isStart || cu.learn.length >= CU_LEARN || (m.sig && cuStars() >= 1)));
  return `<button class="ceMv${on ? " on" : ""}${isStart || isLearn ? " picked" : ""}${ppBad ? " bad" : ""}${m.sig ? " sig" : ""}" data-mv="${k}" ${off && !on ? "disabled" : ""}>
    <span class="ceMvIc" title="${kind}">${ic}</span><span class="ceMvTx"><b>${m.n}${m.sig ? " ★" : ""}</b><small>${m.d || kind}</small><em>${tags.join(" · ")}</em></span>
    <span class="ceMvTag${isStart ? " st" : isLearn ? " ln" : ""}">${isStart ? "⭐ Start" : isLearn ? "📚 Learn" : cuUi.tab === "start" ? "" : off ? "" : "+"}</span></button>`;
};
// the hero's kit at a glance: the starting move and every learn slot, filled or empty
function kitHTML() {
  const slot = (k, kind) => {
    if (!k) return `<button class="ceSlot empty" data-slot="${kind}"><span class="ceSlotIc">＋</span><span class="ceSlotTx"><b>${kind === "start" ? "Pick a starting move" : "Empty slot"}</b><small>${kind === "start" ? "Known from floor 1" : "Tap to add a move"}</small></span></button>`;
    const m = TMOVES[k], [ic, label] = CX_KIND[m.kind] || ["•", "Move"], bad = !cu.r[1] && cuNeedsPP(k);
    return `<div class="ceSlot${kind === "start" ? " start" : ""}${m.sig ? " sig" : ""}${bad ? " bad" : ""}" title="${(m.d || label).replace(/"/g, "&quot;")}">
      <span class="ceSlotIc">${ic}</span><span class="ceSlotTx"><b>${m.n}${m.sig ? " ★" : ""}</b><small>${label} · ${cuTags(m).join(" · ")}${bad ? " · ⚠️ needs PP" : ""}</small></span>
      ${kind === "start" ? `<button class="ceX" data-slot="start" title="Change the starting move" aria-label="Change the starting move">✎</button>` : `<button class="ceX" data-rm="${k}" title="Remove ${m.n}" aria-label="Remove ${m.n}">✕</button>`}</div>`;
  };
  const learn = Array.from({length:CU_LEARN}, (_, i) => slot(cu.learn[i], "learn"));
  return `<div class="ceKit"><div class="ceKitCol"><span class="ceKitHead">⭐ Starts with</span>${slot(cu.start, "start")}</div>
    <div class="ceKitCol wide"><span class="ceKitHead">📚 Can learn <small>${cu.learn.length}/${CU_LEARN}${cuStars() ? " · ★ 1/1" : ""}</small></span><div class="ceKitGrid">${learn.join("")}</div></div></div>`;
}

function drawCustom() {
  const el = $("#ceWrap");
  if (!el) return;
  if (cuUi.view === "spr") return drawSpritePick(el);
  if (cuUi.view === "draw") return drawPixelEditor(el);
  const left = CU_POINTS - cuSpent(), prob = cuProblem();
  const look = cu.look && HLOOKS[cu.look] ? cu.look : null, url = cuSprUrl(cu.spr);
  const img = `<img class="twSpr big${look ? lookClass(look) : ""}" src="${url}" alt="" referrerpolicy="no-referrer" draggable="false"${look ? lookStyle(look) : ""}>`;
  const nums = (() => { const s = heroStats({r:cu.r}, 1); return [s.mhp, s.mpp, s.atk, s.def, s.spd].map(Math.round); })();
  const combos = Object.entries(COMBOS).filter(([id]) => HERO[id] && !HERO[id].mine);
  const preset = CU_PRESETS.find(p => p[2].every((v, i) => v === cu.r[i]));
  el.innerHTML = `
    <section class="ceTop">
      <div class="cePrev">
        <div class="ceArt">${img}</div>
        <div class="ceArtBtns"><button class="btn twSmall" id="ceSprBtn">🖼️ Pick a sprite</button><button class="btn twSmall hot" id="ceDrawBtn">🎨 ${cu.spr.k === "draw" ? "Edit drawing" : "Draw your own"}</button></div>
        <div class="ceLooks" role="group" aria-label="Color">${[null, ...cuLooks(cu.id)].map(k => `<button class="ceLook${(k || null) === look ? " on" : ""}" data-look="${k || ""}" title="${k ? HLOOKS[k].n : "Original colors"}"><img class="twSpr${k ? lookClass(k) : ""}" src="${url}" alt="" referrerpolicy="no-referrer"${k ? lookStyle(k) : ""}></button>`).join("")}</div>
      </div>
      <div class="ceId">
        <label class="ceField"><span>Name</span><input class="search" id="ceName" maxlength="${CU_NAME}" value="${cu.name.replace(/"/g, "&quot;")}" autocomplete="off" spellcheck="false"></label>
        <label class="ceField"><span>Tagline</span><input class="search" id="ceRole" maxlength="${CU_ROLE}" value="${(cu.role || "").replace(/"/g, "&quot;")}" placeholder="Your very own hero" autocomplete="off"></label>
        <div class="ceField"><span>From</span><div class="chips" id="ceGame">${ALL_GAMES.map(g => `<button data-g="${g}" class="${cu.game === g ? "on" : ""}">${GAMES[g].l}</button>`).join("")}</div></div>
        <label class="ceField"><span>Combo</span><select id="ceCombo">${combos.map(([id, c]) => `<option value="${id}"${cu.combo === id ? " selected" : ""}>${c.ic} ${c.n} (like ${HERO[id].name})</option>`).join("")}</select></label>
        <small class="ceTip">${(COMBOS[cu.combo] || COMBOS.ness).tip} after every Bash.</small>
        <button class="btn twSmall ceDice" id="ceDice" title="Random sprite, stats, combo and moves">🎲 Surprise me</button>
      </div>
    </section>
    <section class="ceBox"><h3>📊 Stats <small class="${left < 0 ? "over" : ""}">${left} of ${CU_POINTS} points left</small></h3>
      <div class="chips cePresets" id="cePresets">${CU_PRESETS.map(([ic, n], i) => `<button data-p="${i}" class="${preset && preset[1] === n ? "on" : ""}">${ic} ${n}</button>`).join("")}</div>
      <div class="ceStats">${CU_STATS.map((l, i) => `<div class="ceStat"><span>${l}</span>
        <button class="ceSt" data-st="${i}" data-d="-1" aria-label="Less ${l}" ${cu.r[i] <= (i ? 0 : 1) ? "disabled" : ""}>−</button>
        <b style="--w:${cu.r[i] * 10}%"><i>${cu.r[i]}</i></b>
        <button class="ceSt" data-st="${i}" data-d="1" aria-label="More ${l}" ${cu.r[i] >= 10 || left <= 0 ? "disabled" : ""}>+</button>
        <em>${nums[i] || "–"}</em></div>`).join("")}</div>
      <small class="ceTip">Most heroes land around 25 to 35 points. A 0 in PP means no PSI at all.</small></section>
    <section class="ceBox"><h3>🎓 Moves</h3>
      ${kitHTML()}
      <div class="chips ceTabs" id="ceTabs"><button data-t="start" class="${cuUi.tab === "start" ? "on" : ""}">⭐ Choosing: starting move</button><button data-t="learn" class="${cuUi.tab === "learn" ? "on" : ""}">📚 Choosing: moves to learn</button></div>
      <p class="ceTip">${cuUi.tab === "start" ? "Your hero knows this from floor 1. Tap a move below to make it the starting move." : `Tap moves below to add or remove them (up to ${CU_LEARN}, including one ★ signature move). They show up later as upgrades, in the Library and in the Dojo. Stronger PSI needs the weaker one first.`}</p>
      <div class="ceFilter"><div class="chips" id="ceCats">${CU_CATS.map(([k, l]) => `<button data-c="${k}" class="${cuUi.cat === k ? "on" : ""}">${l}</button>`).join("")}</div>
        <input class="search" id="ceQ" placeholder="Search moves…" value="${cuUi.q.replace(/"/g, "&quot;")}" autocomplete="off"></div>
      <div class="ceMoves" id="ceMoves">${cuMoveList().map(cuMoveRow).join("") || `<p class="ceTip">No moves match that.</p>`}</div>
    </section>
    <p class="ceProb" id="ceProb" aria-live="polite">${prob ? "⚠️ " + prob : "✔️ Ready to climb!"}</p>
    <div class="actions ceActs">${cu.id ? `<button class="btn" id="ceDel">🗑️ Delete</button>` : ""}<button class="btn" id="ceCancel">Cancel</button><button class="btn hot" id="ceSave" ${prob ? "disabled" : ""}>${cu.id ? "💾 Save changes" : "✨ Create hero"}</button></div>`;
  bindCustom();
}

// toggling a move in or out of the learn list, keeping PSI tiers in order
function cuToggleLearn(k) {
  if (cu.learn.includes(k)) {
    // dropping a PSI tier drops the stronger ones that needed it
    const drop = new Set([k]);
    let grew = true;
    while (grew) { grew = false; cu.learn.forEach(x => { if (!drop.has(x) && drop.has(PSI_NEEDS[x])) { drop.add(x); grew = true; } }); }
    cu.learn = cu.learn.filter(x => !drop.has(x));
    return "";
  }
  // a stronger PSI tier brings the weaker ones along, if there's room
  const add = [];
  for (let x = k; x && ![cu.start, ...cu.learn, ...add].includes(x); x = PSI_NEEDS[x]) add.unshift(x);
  if (cu.learn.length + add.length > CU_LEARN) return `⚠️ ${TMOVES[k].n} needs ${TMOVES[add[0]].n} first, and there isn't room for both.`;
  cu.learn.push(...add);
  return "";
}
function cuSurprise() {
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const s = cuSprites(), pool = [...s.hero, ...s.enemy], p = pick(pool);
  cu.spr = {k:p.k, id:p.id};
  cu.look = Math.random() < .4 ? pick(cuLooks(cu.id)) : null;
  cu.r = pick(CU_PRESETS)[2].slice();
  cu.combo = pick(Object.keys(COMBOS).filter(id => HERO[id] && !HERO[id].mine));
  cu.game = pick(ALL_GAMES);
  const ok = k => !TMOVES[k].sig && (cu.r[1] || !cuNeedsPP(k)) && !PSI_NEEDS[k];
  cu.start = pick(CU_POOL.filter(ok));
  cu.learn = [];
  for (let t = 0; t < 40 && cu.learn.length < CU_LEARN; t++) {
    const k = pick(CU_POOL);
    if (k === cu.start || cu.learn.includes(k) || (!cu.r[1] && cuNeedsPP(k)) || (TMOVES[k].sig && cuStars())) continue;
    cuToggleLearn(k);
  }
}

function bindCustom() {
  const live = () => { const p = cuProblem(); $("#ceProb").textContent = p ? "⚠️ " + p : "✔️ Ready to climb!"; $("#ceSave").disabled = !!p; };
  $("#ceName").oninput = ev => { cu.name = ev.target.value.slice(0, CU_NAME); live(); };
  $("#ceRole").oninput = ev => { cu.role = ev.target.value.slice(0, CU_ROLE); };
  $("#ceGame").onclick = ev => { const b = ev.target.closest("[data-g]"); if (b) { cu.game = b.dataset.g; sfx("click"); drawCustom(); } };
  $("#ceCombo").onchange = ev => { cu.combo = ev.target.value; drawCustom(); };
  $("#ceSprBtn").onclick = () => { cuUi.view = "spr"; sfx("open"); drawCustom(); };
  $("#ceDrawBtn").onclick = () => { pxStart(); cuUi.view = "draw"; sfx("open"); drawCustom(); };
  $("#ceDice").onclick = () => { cuSurprise(); sfx("smash"); drawCustom(); };
  document.querySelectorAll(".ceLook").forEach(b => b.onclick = () => { cu.look = b.dataset.look || null; sfx("click"); drawCustom(); });
  $("#cePresets").onclick = ev => { const b = ev.target.closest("[data-p]"); if (!b) return; cu.r = CU_PRESETS[+b.dataset.p][2].slice(); sfx("click"); drawCustom(); };
  document.querySelectorAll(".ceSt").forEach(b => b.onclick = () => {
    const i = +b.dataset.st, d = +b.dataset.d;
    cu.r[i] = clamp(cu.r[i] + d, i ? 0 : 1, 10);
    sfx("click"); drawCustom();
  });
  // the kit: ✕ removes a learned move, empty slots and ✎ jump to picking
  document.querySelectorAll(".ceKit [data-rm]").forEach(b => b.onclick = () => { cuToggleLearn(b.dataset.rm); sfx("click"); drawCustom(); });
  document.querySelectorAll(".ceKit [data-slot]").forEach(b => b.onclick = () => {
    cuUi.tab = b.dataset.slot; if (cuUi.cat === "picked") cuUi.cat = "all";
    sfx("click"); drawCustom();
    const t = $("#ceTabs"); if (t) t.scrollIntoView({block:"nearest", behavior:"smooth"});
  });
  $("#ceTabs").onclick = ev => { const b = ev.target.closest("[data-t]"); if (b) { cuUi.tab = b.dataset.t; drawCustom(); } };
  $("#ceCats").onclick = ev => { const b = ev.target.closest("[data-c]"); if (b) { cuUi.cat = b.dataset.c; drawCustom(); } };
  // typing only redraws the list, so the search box keeps its focus
  $("#ceQ").oninput = ev => { cuUi.q = ev.target.value; $("#ceMoves").innerHTML = cuMoveList().map(cuMoveRow).join("") || `<p class="ceTip">No moves match that.</p>`; };
  $("#ceMoves").onclick = ev => {
    const b = ev.target.closest("[data-mv]");
    if (!b || b.disabled) return;
    const k = b.dataset.mv;
    if (cuUi.tab === "start") { cu.start = k; cu.learn = cu.learn.filter(x => x !== k); }
    else { const msg = cuToggleLearn(k); if (msg) { $("#ceProb").textContent = msg; sfx("bad"); return; } }
    // keep the list where it was, so picking several moves in a row doesn't jump around
    const top = $("#ceMoves").scrollTop;
    sfx("click"); drawCustom();
    $("#ceMoves").scrollTop = top;
  };
  $("#ceCancel").onclick = () => { closeModal(); cu = null; };
  $("#ceSave").onclick = cuSave;
  const del = $("#ceDel");
  if (del) del.onclick = () => {
    if (!confirm(`Delete ${cu.name}? Their records stay in your history.`)) return;
    const id = cu.id;
    tw.customs = tw.customs.filter(c => c.id !== id); cuApply(); twSave();
    if (twPick === id) twPick = null;
    if (twView === id) twView = null;
    closeModal(); cu = null; drawTower();
  };
}

function cuSave() {
  if (cuProblem()) return;
  const clean = s => (s || "").replace(/[<>&"`]/g, "").replace(/\s+/g, " ").trim();
  cu.name = clean(cu.name).slice(0, CU_NAME);
  if (!cu.name) return;
  cu.role = clean(cu.role).slice(0, CU_ROLE);
  const isNew = !cu.id;
  if (isNew) { cu.id = cuNewId(); tw.customs.push(cu); }
  else tw.customs = tw.customs.map(c => c.id === cu.id ? cu : c);
  const saved = cu; cu = null;
  cuApply(); twSave();
  twPick = twView = saved.id;
  twCar.game = "mine";
  sfx("smash");
  closeModal();
  drawTower();
  if (window.toast) toast(`<span class="tBig">✨</span><div><b>${isNew ? `${saved.name} is ready!` : `${saved.name} saved`}</b><br><small>Find them under ✏️ Yours in the hero carousel.</small></div>`);
}

// ---------- sprite picker: any hero, or any enemy in the three games ----------
let CU_SPRITES = null;
const cuSprites = () => CU_SPRITES || (CU_SPRITES = {
  hero:HEROES.filter(h => !h.mine).map(h => ({k:"hero", id:h.id, name:h.name, game:h.game, url:h.spr})),
  enemy:ALL.filter(e => spriteUrl(e)).map(e => ({k:"enemy", id:e.id, name:e.name, game:e.game, url:spriteUrl(e)})).sort((a, b) => a.name.localeCompare(b.name))
});
function drawSpritePick(el) {
  const all = cuSprites()[cuUi.sk];
  el.innerHTML = `<div class="ceSprHead"><button class="btn" id="ceSprBack">◀ Back</button>
      <div class="chips" id="ceSprK"><button data-k="hero" class="${cuUi.sk === "hero" ? "on" : ""}">🧒 Heroes <small>${cuSprites().hero.length}</small></button><button data-k="enemy" class="${cuUi.sk === "enemy" ? "on" : ""}">👾 Enemies <small>${cuSprites().enemy.length}</small></button><button data-k="draw">🎨 Draw your own</button></div></div>
    <div class="ceFilter"><div class="chips" id="ceSprG">${[["all", "All"], ...ALL_GAMES.map(g => [g, GAMES[g].l])].map(([g, l]) => `<button data-g="${g}" class="${cuUi.sg === g ? "on" : ""}">${l}</button>`).join("")}</div>
      <input class="search" id="ceSprQ" placeholder="Search by name…" value="${cuUi.sq.replace(/"/g, "&quot;")}" autocomplete="off"></div>
    <div class="ceSprGrid" id="ceSprGrid"></div>`;
  const grid = () => {
    const q = norm(cuUi.sq), list = all.filter(s => (cuUi.sg === "all" || s.game === cuUi.sg) && (!q || norm(s.name).includes(q)));
    $("#ceSprGrid").innerHTML = list.map(s => `<button class="ceSpr${cu.spr.k === s.k && cu.spr.id === s.id ? " on" : ""}" data-k="${s.k}" data-id="${s.id.replace(/"/g, "&quot;")}" title="${s.name}">
      <img src="${s.url}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.parentNode.classList.add('noimg')"><small>${s.name}</small></button>`).join("") || `<p class="ceTip">Nobody by that name.</p>`;
  };
  grid();
  $("#ceSprBack").onclick = () => { cuUi.view = "main"; drawCustom(); };
  $("#ceSprK").onclick = ev => {
    const b = ev.target.closest("[data-k]"); if (!b) return;
    if (b.dataset.k === "draw") { pxStart(); cuUi.view = "draw"; sfx("open"); return drawCustom(); }
    cuUi.sk = b.dataset.k; drawCustom();
  };
  $("#ceSprG").onclick = ev => { const b = ev.target.closest("[data-g]"); if (b) { cuUi.sg = b.dataset.g; drawCustom(); } };
  $("#ceSprQ").oninput = ev => { cuUi.sq = ev.target.value; grid(); };
  $("#ceSprGrid").onclick = ev => {
    const b = ev.target.closest(".ceSpr");
    if (!b) return;
    cu.spr = {k:b.dataset.k, id:b.dataset.id};
    cuUi.view = "main"; sfx("click"); drawCustom();
  };
}

// ---------- pixel editor: draw your own sprite, cell by cell ----------
const PX_SIZES = [16, 24, 32];
const PX_PAL = ["#2b2140", "#000000", "#5a5a6e", "#9c9cb0", "#ffffff", "#fffaf0", "#ffc4a8", "#e0a07a", "#a0643c", "#5a3a22",
  "#e2352c", "#ff7a59", "#ffcf3f", "#fff07a", "#5cbf6a", "#2e7d3a", "#4a8fe0", "#3446b8", "#9be7ff", "#8b5bd6", "#f28fb8", "#d9627a", "#2bb3bf", "#f2a65a"];
// a little kid in a cap to start from (24×24)
const PX_KID = {pal:{k:"#2b2140", c:"#e2352c", w:"#fffaf0", h:"#5a3a22", s:"#ffc4a8", b:"#3446b8", y:"#ffcf3f", p:"#4a8fe0", r:"#e2352c"}, rows:[
  "........................", "........kkkkkkkk........", ".......kcccccccck.......", "......kccccwwcccck......", "......kcccccccccck......",
  ".....kkkkkkkkkkkkkk.....", "......khhsssssshhk......", "......khsssssssshk......", "......kssksssskssk......", "......kssksssskssk......",
  "......kssssssssssk......", ".......kssskksssk.......", "........kkkkkkkk........", ".......kbyybbyybk.......", "......kbbyybbyybbk......",
  ".....ksbbbbbbbbbbsk.....", ".....ksyybbyybbyysk.....", "......kbbbbbbbbbbk......", "......kppppppppppk......", "......kppppkkppppk......",
  "......kpppk..kpppk......", ".....krrrrk..krrrrk.....", ".....kkkkkk..kkkkkk.....", "........................"]};
const pe = {n:24, px:[], color:"#2b2140", tool:"pen", mirror:false, undo:[], redo:[], custom:[], msg:""};
function pxStart() {
  if (cu.spr.k === "draw" && cu.spr.d) { pe.n = cu.spr.n; pe.px = pxDecode(cu.spr); pe.custom = cu.spr.pal.filter(c => !PX_PAL.includes(c)).slice(0, 12); }
  else { pe.n = 24; pe.px = Array(24 * 24).fill(""); pxTemplate("kid"); }
  pe.undo = []; pe.redo = []; pe.msg = ""; pe.tool = "pen";
}
const pxSnap = () => { pe.undo.push(pe.px.slice()); if (pe.undo.length > 40) pe.undo.shift(); pe.redo = []; };
function pxResize(n) {
  if (n === pe.n) return;
  pxSnap();
  const old = pe.px, o = pe.n, px = Array(n * n).fill("");
  // keep the drawing centered: crop when shrinking, pad when growing
  const off = Math.floor((n - o) / 2);
  for (let y = 0; y < o; y++) for (let x = 0; x < o; x++) { const nx = x + off, ny = y + off; if (nx >= 0 && ny >= 0 && nx < n && ny < n) px[ny * n + nx] = old[y * o + x]; }
  pe.n = n; pe.px = px;
}
function pxTemplate(t) {
  pxSnap();
  const n = pe.n, px = Array(n * n).fill("");
  if (t === "kid") {
    const off = Math.floor((n - 24) / 2);
    PX_KID.rows.forEach((row, y) => row.split("").forEach((c, x) => { const nx = x + off, ny = y + off; if (c !== "." && nx >= 0 && ny >= 0 && nx < n && ny < n) px[ny * n + nx] = PX_KID.pal[c]; }));
  }
  pe.px = px;
}
// copy the picked sprite into the grid, shrunk to fit (only works when the image's website allows it)
function pxImport() {
  const src = cu.spr.k === "draw" ? null : cuSprUrl(cu.spr);
  if (!src) { pe.msg = "Pick a hero or enemy sprite first, then come back to copy it."; return drawCustom(); }
  pe.msg = "Copying the sprite…"; drawCustom();
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    try {
      const n = pe.n, s = Math.min(n / img.naturalWidth, n / img.naturalHeight), w = Math.max(1, Math.round(img.naturalWidth * s)), h = Math.max(1, Math.round(img.naturalHeight * s));
      const cv = document.createElement("canvas"); cv.width = cv.height = n;
      const ctx = cv.getContext("2d", {willReadFrequently:true});
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, Math.floor((n - w) / 2), n - h, w, h);
      const d = ctx.getImageData(0, 0, n, n).data;
      // fewer, chunkier colors until it fits the palette
      for (const bits of [4, 3, 2]) {
        const q = v => { const step = 255 / ((1 << bits) - 1); return Math.round(Math.round(v / step) * step); };
        const px = [];
        for (let i = 0; i < d.length; i += 4) px.push(d[i + 3] < 110 ? "" : "#" + [d[i], d[i + 1], d[i + 2]].map(v => q(v).toString(16).padStart(2, "0")).join(""));
        if (new Set(px.filter(Boolean)).size <= PX_CH.length || bits === 2) { pxSnap(); pe.px = px; pe.custom = []; break; }
      }
      pe.msg = "Copied! Now make it your own.";
    } catch { pe.msg = "That sprite's website doesn't allow copying it. Start from the kid template or a blank grid instead."; }
    if (cuUi.view === "draw") drawCustom();
  };
  img.onerror = () => { pe.msg = "That sprite's website doesn't allow copying it. Start from the kid template or a blank grid instead."; if (cuUi.view === "draw") drawCustom(); };
  img.src = src;
}
function pxFill(i, to) {
  const n = pe.n, from = pe.px[i];
  if (from === to) return;
  const st = [i];
  while (st.length) {
    const j = st.pop();
    if (pe.px[j] !== from) continue;
    pe.px[j] = to;
    const x = j % n, y = Math.floor(j / n);
    if (x > 0) st.push(j - 1); if (x < n - 1) st.push(j + 1); if (y > 0) st.push(j - n); if (y < n - 1) st.push(j + n);
  }
}
function pxPaint(x, y) {
  const n = pe.n;
  if (x < 0 || y < 0 || x >= n || y >= n) return;
  const c = pe.tool === "erase" ? "" : pe.color;
  pe.px[y * n + x] = c;
  if (pe.mirror) pe.px[y * n + (n - 1 - x)] = c;
}
function pxRender() {
  const cv = $("#pxCv");
  if (!cv) return;
  const n = pe.n, ctx = cv.getContext("2d");
  ctx.clearRect(0, 0, n, n);
  pe.px.forEach((c, i) => { if (c) { ctx.fillStyle = c; ctx.fillRect(i % n, Math.floor(i / n), 1, 1); } });
  const url = cv.toDataURL("image/png");
  document.querySelectorAll(".pxPrev img").forEach(im => im.src = url);
  const used = new Set(pe.px.filter(Boolean)).size;
  const u = $("#pxUsed"); if (u) u.textContent = `${used} color${used === 1 ? "" : "s"}`;
}
function drawPixelEditor(el) {
  const n = pe.n, pal = [...PX_PAL, ...pe.custom];
  const tool = (k, ic, l) => `<button data-tool="${k}" class="${pe.tool === k ? "on" : ""}" title="${l}">${ic} ${l}</button>`;
  el.innerHTML = `<div class="ceSprHead"><button class="btn" id="pxBack">◀ Back</button><b class="pxTitle">🎨 Draw your own sprite</b></div>
    <div class="pxWrap">
      <div class="pxBoard"><div class="pxBox" id="pxBox" style="--n:${n}"><canvas id="pxCv" width="${n}" height="${n}"></canvas><div class="pxGrid"></div>${pe.mirror ? `<div class="pxMid"></div>` : ""}</div></div>
      <div class="pxSide">
        <div class="chips pxTools" id="pxTools">${tool("pen", "✏️", "Pencil")}${tool("erase", "🧽", "Eraser")}${tool("fill", "🪣", "Fill")}${tool("pick", "💧", "Pick color")}
          <button id="pxMirror" class="${pe.mirror ? "on" : ""}" title="Draw both sides at once">↔️ Mirror</button></div>
        <div class="pxPal" id="pxPal">${pal.map(c => `<button data-c="${c}" class="${c === pe.color ? "on" : ""}" style="--c:${c}" title="${c}" aria-label="Color ${c}"></button>`).join("")}
          <label class="pxCustom" title="Mix your own color"><input type="color" id="pxColor" value="${pe.color}">＋</label></div>
        <div class="pxRow"><button class="btn twSmall" id="pxUndo" ${pe.undo.length ? "" : "disabled"}>↩️ Undo</button><button class="btn twSmall" id="pxRedo" ${pe.redo.length ? "" : "disabled"}>↪️ Redo</button>
          <label class="pxSize">Grid <select id="pxSize">${PX_SIZES.map(s => `<option value="${s}"${s === n ? " selected" : ""}>${s}×${s}</option>`).join("")}</select></label></div>
        <div class="pxRow"><span class="pxLbl">Start from</span><button class="btn twSmall" id="pxBlank">⬜ Blank</button><button class="btn twSmall" id="pxKid">🧢 Kid</button><button class="btn twSmall" id="pxCopy" title="Copy the hero or enemy sprite you picked before">📋 Copy sprite</button></div>
        ${pe.msg ? `<p class="ceTip pxMsg">${pe.msg}</p>` : ""}
        <div class="pxPrevs"><span class="pxLbl">Preview <small id="pxUsed"></small></span>
          <div class="pxPrev"><img alt="" class="p1"><img alt="" class="p2"><span class="pxStage"><img alt="" class="p3 twSpr"></span></div></div>
      </div>
    </div>
    <div class="actions"><button class="btn" id="pxCancel">Cancel</button><button class="btn hot" id="pxUse">✔️ Use this sprite</button></div>`;
  pxRender();
  const box = $("#pxBox");
  let down = false;
  const cell = ev => { const r = box.getBoundingClientRect(); return [Math.floor((ev.clientX - r.left) / r.width * n), Math.floor((ev.clientY - r.top) / r.height * n)]; };
  box.onpointerdown = ev => {
    ev.preventDefault();
    const [x, y] = cell(ev);
    if (x < 0 || y < 0 || x >= n || y >= n) return;
    if (pe.tool === "pick") { const c = pe.px[y * n + x]; if (c) { pe.color = c; if (!PX_PAL.includes(c) && !pe.custom.includes(c)) pe.custom.push(c); } pe.tool = "pen"; return drawCustom(); }
    pxSnap();
    if (pe.tool === "fill") { pxFill(y * n + x, pe.color); pxRender(); $("#pxUndo").disabled = false; return; }
    down = true; box.setPointerCapture(ev.pointerId);
    pxPaint(x, y); pxRender();
  };
  box.onpointermove = ev => { if (!down) return; const [x, y] = cell(ev); pxPaint(x, y); pxRender(); };
  box.onpointerup = box.onpointercancel = () => { if (down) { down = false; $("#pxUndo").disabled = false; $("#pxRedo").disabled = true; } };
  $("#pxTools").onclick = ev => {
    const b = ev.target.closest("button"); if (!b) return;
    if (b.id === "pxMirror") pe.mirror = !pe.mirror; else pe.tool = b.dataset.tool;
    sfx("click"); drawCustom();
  };
  $("#pxPal").onclick = ev => { const b = ev.target.closest("[data-c]"); if (!b) return; pe.color = b.dataset.c; if (pe.tool === "erase" || pe.tool === "pick") pe.tool = "pen"; drawCustom(); };
  $("#pxColor").onchange = ev => {
    const c = ev.target.value.toLowerCase();
    pe.color = c;
    if (!PX_PAL.includes(c) && !pe.custom.includes(c)) { pe.custom.push(c); if (pe.custom.length > 12) pe.custom.shift(); }
    if (pe.tool !== "fill") pe.tool = "pen";
    drawCustom();
  };
  $("#pxUndo").onclick = () => { if (!pe.undo.length) return; pe.redo.push(pe.px); pe.px = pe.undo.pop(); drawCustom(); };
  $("#pxRedo").onclick = () => { if (!pe.redo.length) return; pe.undo.push(pe.px); pe.px = pe.redo.pop(); drawCustom(); };
  $("#pxSize").onchange = ev => { pxResize(+ev.target.value); drawCustom(); };
  $("#pxBlank").onclick = () => { pxTemplate("blank"); pe.msg = ""; drawCustom(); };
  $("#pxKid").onclick = () => { pxTemplate("kid"); pe.msg = ""; drawCustom(); };
  $("#pxCopy").onclick = pxImport;
  $("#pxBack").onclick = $("#pxCancel").onclick = () => { cuUi.view = "main"; drawCustom(); };
  $("#pxUse").onclick = () => {
    if (!pe.px.some(Boolean)) { pe.msg = "The grid is empty. Draw something first!"; sfx("bad"); return drawCustom(); }
    cu.spr = pxEncode(pe.px, pe.n);
    cuUi.view = "main"; sfx("ok"); drawCustom();
  };
}
