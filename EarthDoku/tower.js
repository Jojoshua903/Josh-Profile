// ---------- Enemy Tower: a roguelike climb. Start with one hero, pick upgrades after every battle ----------
let tr = null, twTimer = null, twLast = 0;
let twPick = null, twMode = "normal";
const rnd = (a, b) => a + Math.random() * (b - a);
const pickR = (arr, r = tr ? tr.rng : Math.random) => arr[Math.floor(r() * arr.length)];
const hasRelic = k => tr && tr.relics.includes(k);
const aliveH = () => tr.team.filter(m => !m.ko);
const hasMod = k => !!(tr && tr.mods && tr.mods.includes(k));
const hasBless = k => !!(tr && tr.bless && tr.bless.includes(k));
const aliveF = () => tr.battle ? tr.battle.foes.filter(f => f.hp > 0) : [];
const isUnlocked = h => tw.found.includes(h.id);
function twLog(t, cls = "") { tr.log.push({t, cls}); tr.log = tr.log.slice(-40); if (window.drawTwLog) drawTwLog(); }

// ---------- hero numbers ----------
const lvMult = lv => 1 + .065 * (lv - 1);
function heroStats(h, lv) {
  const m = 1, [hp, pp, atk, def, spd] = h.r;   // no levels in the tower
  return {mhp:(38 + hp * 9) * m, mpp:pp ? (pp * 5 + 4) * m : 0, atk:(5 + atk * 1.7) * m, def:(2 + def * 1.1) * m, spd:3 + spd};
}
function refresh(m) {
  const s = heroStats(m.h, m.lv), k = 1 + (hasRelic("sound") ? .06 * tr.bosses : 0), b = m.bonus;
  m.mhp = Math.round(s.mhp * k * (1 + b.hp) * (hasCurse("frail") ? .88 : 1) * (hasRelic("bracer") ? 1.08 : 1) * (hasMod("fragile") ? .5 : 1));
  m.mpp = s.mpp ? Math.round(s.mpp * k * (1 + b.pp) * (hasRelic("magicribbon") ? 1.15 : 1) * (hasRelic("magicantbat") ? 1.1 : 1)) : 0;
  m.atk = (s.atk * k + b.atk + (hasRelic("yoyo") ? 2 : 0)) * (hasRelic("swordkings") ? 1.12 : 1) * (hasRelic("magicantbat") ? 1.1 : 1); m.def = s.def * k + b.def + (hasRelic("goddess") ? 3 : 0); m.spd = s.spd + b.spd + (hasRelic("ribbon") ? 2 : 0) + (hasRelic("yoyo") ? 2 : 0);
  m.hp = Math.min(m.hp, m.mhp); m.pp = Math.min(m.pp, m.mpp); m.shown = Math.min(m.shown, m.mhp);
}
function newMember(h, lv) {
  const m = {h, lv, bonus:{hp:0, pp:0, atk:0, def:0, spd:0, psi:0}, moves:[...h.start], hp:1, shown:1, pp:0, ko:false, cd:{}, st:{}, tough:0, guard:false};
  refresh(m); m.hp = m.shown = m.mhp; m.pp = m.mpp;
  return m;
}
function levelUp(m, n) {
  const before = m.mhp, beforeP = m.mpp;
  m.lv += n; refresh(m);
  m.hp += m.mhp - before; m.pp += m.mpp - beforeP; m.shown = m.hp;
}

// ---------- enemies ----------
const pctOr = (e, s) => { const p = percentile(e, s); return p == null ? 50 : p; };
const powerOf = e => (pctOr(e, "hp") + pctOr(e, "off") + pctOr(e, "def")) / 3;
const FINALS = ["EB:Giygas", "M1:Giegue", "M3:Masked Man", "M3:Porky"].filter(id => BY_ID.has(id));
let foeId = 0;
const hasCurse = k => tr && tr.curses && tr.curses.includes(k);
const heat = n => tr && tr.heat >= n;
function makeFoe(e, f, hpM, atkM, traits = []) {
  const ph = pctOr(e, "hp") / 100, po = pctOr(e, "off") / 100, pd = pctOr(e, "def") / 100, ps = pctOr(e, "spd") / 100;
  let hp = (32 + 8.5 * f) * (.75 + .5 * ph) * hpM * (heat(1) ? 1.2 : 1);
  let atk = (6 + 1.05 * f) * (.8 + .4 * po) * atkM * (tr.hard ? 1.12 : 1) * (heat(4) ? 1.15 : 1) * (hasCurse("haunt") ? 1.15 : 1);
  let def = (2 + .45 * f) * (.8 + .4 * pd), spd = (3 + .3 * f) * (.8 + .4 * ps);
  // endless floors past the top get tougher on top of the normal curve
  if (f > TW_TOP) { const x = f - TW_TOP; hp *= 1 + x * .04; atk *= 1 + x * .03; def *= 1 + x * .02; }
  if (hasMod("training")) { hp *= .7; atk *= .7; }
  if (hasMod("elite") && !traits.length) traits = rollTraits(1);
  if (traits.includes("armored")) def *= 1.7;
  if (traits.includes("enraged")) { atk *= 1.3; hp *= .8; }
  if (traits.includes("swift")) spd *= 1.4;
  hp = Math.round(hp);
  return {uid:++foeId, e, mhp:hp, hp, atk, def, spd, st:{}, turns:0, boss:hpM >= 1.9, traits, sturdy:traits.includes("sturdy") ? 3 : 0};
}
function pickEnemy(target, boss, seen, game) {
  let pool = ALL.filter(e => !!e.boss === boss && !FINALS.includes(e.id) && !seen.includes(e.id) && spriteUrl(e));
  const inGame = game ? pool.filter(e => e.game === game) : pool;
  if (inGame.length >= 3) pool = inGame;
  // when every boss of a game has been beaten already, allow repeats
  if (!pool.length) pool = ALL.filter(e => !!e.boss === boss && !FINALS.includes(e.id) && spriteUrl(e) && (!game || e.game === game));
  if (!pool.length) pool = ALL.filter(e => !!e.boss === boss && !FINALS.includes(e.id));
  for (let w = 8; w <= 100; w += 8) {
    const near = pool.filter(e => Math.abs(powerOf(e) - target) <= w);
    if (near.length >= 3) return pickR(near);
  }
  return pickR(pool);
}
const rollTraits = n => { const t = []; while (t.length < n) { const k = pickR(Object.keys(TRAITS)); if (!t.includes(k)) t.push(k); } return t; };
function makeFoes(type) {
  const f = tr.floor, act = actOf(f), step = ((f - 1) % 10) / 9, seen = tr.seen;
  const target = act.lo + (act.hi - act.lo) * step;
  // every 10 endless floors adds another trait to tough foes and bosses
  const extra = Math.min(Object.keys(TRAITS).length - 2, (heat(3) ? 1 : 0) + (hasMod("elite") ? 2 : 0) + (f > TW_TOP ? 1 + Math.floor((f - TW_TOP - 1) / 10) : 0));
  const ag = hasMod("chaos") ? null : act.game;
  if (type === "final") { const e = BY_ID.get(pickR(FINALS)); seen.push(e.id); const x = makeFoe(e, f, 2.8, 1.2, rollTraits(extra)); x.final = true; return [x]; }
  if (type === "boss") { const e = pickEnemy(target, true, seen, ag); seen.push(e.id); return [makeFoe(e, f, 2.1, 1.12, rollTraits((f > 20 ? 1 : 0) + extra))]; }
  if (type === "tough") { const e = pickEnemy(Math.min(100, target + 20), false, seen, ag); seen.push(e.id); return [makeFoe(e, f, 1.7, 1.15, rollTraits((f > 20 ? 2 : 1) + extra))]; }
  const lead = pickEnemy(target, false, seen, ag); seen.push(lead.id);
  let n = 1;
  if (f >= 3 && tr.rng() < .35 + f * .03) n = 2;
  if (f >= 6 && tr.rng() < .2 + f * .02) n = 3;
  if (f >= 21 && tr.rng() < .3) n = 4;
  const foes = [makeFoe(lead, f, n > 1 ? .72 : 1, n > 1 ? .88 : 1)];
  // companions come from the same game, and from the same area when possible
  const mates = ALL.filter(e => e.game === lead.game && !e.boss && spriteUrl(e) && e.id !== lead.id && Math.abs(powerOf(e) - target) < 30);
  const local = mates.filter(e => e.regions.some(r => lead.regions.includes(r)));
  for (let i = 1; i < n; i++) { const e = pickR(local.length ? local : mates.length ? mates : [lead]); foes.push(makeFoe(e, f, .62, .82, f > 25 && tr.rng() < .2 ? rollTraits(1) : [])); }
  return foes;
}

// ---------- starting and moving through the tower ----------
function startTower(heroId, mode) {
  const hard = mode === "hard", weekly = mode === "weekly";
  const rng = hard ? mulberry32(hashStr("tower2-" + todayKey())) : weekly ? mulberry32(hashStr("tower-week-run-" + weekKey())) : Math.random;
  tr = {mode, hard, rng, floor:1, money:20, goods:{cookie:2}, relics:[], curses:[], team:[], seen:[], log:[], bosses:0, frogUsed:false, auto:false, phase:"map",
    heat:hard || weekly ? 0 : Math.min(tw.heat || 0, tw.heatMax || 0)};
  if (hard) heroId = pickR(STARTERS, rng);
  if (weekly) heroId = weeklyPlan().hero;
  tr.weekly = weekly;
  tr.rk = Date.now().toString(36);   // tells climbs apart, so a golden chest can't be reopened by reloading
  tr.seed = hard ? "tower2-" + todayKey() : weekly ? "tower-week-run-" + weekKey() : null;
  const perks = !hard && !weekly;   // Tower perks only help normal climbs
  tr.perks = perks;
  tr.bless = []; tr.blessAt = []; tr.rerolls = 1 + (perks ? perkLv("reroll") : 0);
  tr.st = {wins:0, psi:0, special:0, maxMoney:0, maxTeam:1, soloTo:0};
  // New Run+ options only apply to normal climbs
  tr.mods = hard ? [] : weekly ? weeklyPlan().mods : (tw.mods || []).filter(k => RUNMOD[k] && RUNMOD[k].need());
  const found = HEROES.filter(isUnlocked);
  if (hasMod("mystery")) heroId = pickR(found).id;
  tr.team.push(newMember(HERO[heroId], 1));
  heroRec(heroId).runs++;
  const relicLeft = () => Object.keys(RELICS).filter(k => !tr.relics.includes(k) && !(RELICS[k].normalOnly && tr.hard));
  const addRelic = () => { const left = relicLeft(); if (left.length) tr.relics.push(pickR(left)); };
  if (hasMod("squad")) mgShuffle(found.filter(h => h.id !== heroId)).slice(0, 3).forEach(h => tr.team.push(newMember(h, 1)));
  if (hasMod("rich")) { tr.money += 130; addRelic(); }
  if (hasMod("cursed")) {
    addRelic(); addRelic();
    mgShuffle(Object.keys(CURSES)).slice(0, 2).forEach(k => tr.curses.push(k));
  }
  if (hasMod("quick")) {
    tr.floor = 11;
    for (let i = 0; i < 3; i++) { const o = makeOffers(true).filter(x => x.kind !== "Recruit"); if (o.length) pickR(o).apply(); }
  }
  tr.team.forEach(m => { refresh(m); m.hp = m.shown = m.mhp; m.pp = m.mpp; });
  if (perks) {
    tr.money += 40 * perkLv("pocket");
    if (perkLv("lunch")) tr.goods.hamburger = (tr.goods.hamburger || 0) + 1;
    if (perkLv("oldfriend")) addRelic();
  }
  // three goals for this run, each worth Tower Tokens
  tr.goals = mgShuffle(Object.keys(GOALS)).slice(0, 3);
  if (hard || weekly) { const g = Object.keys(GOALS); tr.goals = []; while (tr.goals.length < 3) { const k = pickR(g); if (!tr.goals.includes(k)) tr.goals.push(k); } }
  if (tr.mods.length) twLog(`• New Run+: ${tr.mods.map(k => `${RUNMOD[k].ic} ${RUNMOD[k].n}`).join(", ")}`, "good");
  // supplies bought in Saturn's shop join normal runs (the daily Hard climb stays the same for everyone)
  const packed = !hard && !weekly && typeof shopTowerPack === "function" ? shopTowerPack(tr) : "";
  if (packed) twLog(packed, "good");
  tw.runs++; twSave();
  sfx("open");
  goMap(false);
}
function makeDoors() {
  const f = tr.floor;
  if (f === TW_TOP && !tr.endless) return ["final"];
  if (f % 5 === 0) return ["boss"];
  if (f === 1) return [hasMod("bossrush") ? "tough" : "battle"];
  const w = {meet:meetable().length ? .15 : 0, battle:5, tough:f >= 3 ? 1.8 : 0, shop:f >= 2 ? 1.3 : 0, spring:!tr.hard && f >= 3 ? 1.1 : 0, present:.9, event:1.3, statue:f >= 4 ? .7 : 0, dojo:f >= 3 ? .8 : 0};
  if (f % 5 === 4) { if (!tr.hard) w.spring += 2.5; w.shop += 1.5; }
  if (hasRelic("repelring")) w.battle *= .6;
  if (hasMod("noshop")) { w.shop = 0; w.present += .8; w.event += .8; }
  Object.assign(w, {arcade:f >= 3 ? .7 : 0, library:f >= 4 ? .6 : 0, vault:f >= 6 ? .45 : 0, workshop:f >= 4 ? .6 : 0, moonside:f >= 5 ? .5 : 0});
  // golden chests are rare: at most two a climb, never in training runs, and not in the shared Daily Hard and Weekly towers
  w.chest = f >= 4 && !tr.seed && !hasMod("training") && (tr.chests || 0) < 2 && typeof shopTowerChest === "function" ? .22 : 0;
  const doors = [], count = (hasCurse("fog") ? 2 : 3) + (tr.perks && perkLv("scout") ? 1 : 0);
  while (doors.length < count) {
    const keys = Object.keys(w).filter(k => w[k] > 0 && !doors.includes(k)), tot = keys.reduce((s, k) => s + w[k], 0);
    if (!keys.length) break;   // early floors can run out of room types when an extra door is on
    let r = tr.rng() * tot, k = keys[0];
    for (const x of keys) { r -= w[x]; if (r <= 0) { k = x; break; } }
    doors.push(k);
  }
  if (!doors.includes("battle") && !doors.includes("tough")) doors[0] = "battle";
  if (hasMod("bossrush")) return doors.map(d => d === "battle" ? "tough" : d).filter((d, i, a) => a.indexOf(d) === i);
  return doors;
}
function goMap(advance) {
  stopRolling();
  if (advance) { tr.floor++; if (hasRelic("sunflower")) tr.team.forEach(m => { if (!m.ko) m.hp = m.shown = Math.min(m.mhp, m.hp + Math.max(1, Math.round(m.mhp * .08))); }); }
  if (tr.seed) tr.rng = mulberry32(hashStr(tr.seed + ":" + tr.floor));
  tr.battle = null; tr.offers = null; tr.room = null;
  tr.doors = makeDoors();
  tr.phase = "map";
  runTrack();
  // the first floor of every act starts with a blessing to choose
  if ((tr.floor - 1) % 10 === 0 && !tr.blessAt.includes(tr.floor)) {
    const n = 3 + (tr.perks && perkLv("blessing") ? 1 : 0), keys = Object.keys(BLESSINGS).filter(k => !tr.bless.includes(k) || ["feast", "insight", "wealth", "fortune"].includes(k));
    tr.blessOpts = []; while (tr.blessOpts.length < Math.min(n, keys.length)) { const k = pickR(keys); if (!tr.blessOpts.includes(k)) tr.blessOpts.push(k); }
    tr.phase = "bless";
  }
  // a snapshot for the Save Frog
  tr.snap = {team:tr.team.map(m => ({hp:m.hp, pp:m.pp, ko:m.ko})), goods:{...tr.goods}};
  drawTower();
}
function enterRoom(type) {
  sfx("click");
  if (tr.phase === "map") twSaveRun(type);
  if (["battle", "tough", "boss", "final"].includes(type)) return startBattle(type);
  tr.room = {type};
  if (type === "shop") makeShop();
  else if (type === "spring") {
    const p = hasRelic("onyx") || hasMod("fragile") ? 1 : heat(2) ? .3 : .45;
    tr.team.forEach(m => { if (m.ko) { m.ko = false; m.hp = Math.round(m.mhp * .3); } else m.hp = Math.min(m.mhp, m.hp + Math.round(m.mhp * p)); m.pp = Math.min(m.mpp, m.pp + Math.round(m.mpp * p)); m.shown = m.hp; m.st = {}; });
    tr.room.text = `Ahhh... a hot spring. Everyone soaked for a while and recovered ${Math.round(p * 100)}% HP and PP. Fallen friends got back on their feet.`;
    sfx("ok");
  } else if (type === "present") openPresent();
  else if (type === "event") makeEvent();
  else if (type === "statue") makeStatue();
  else if (type === "dojo") makeDojo();
  else if (type === "meet") makeMeet();
  else if (type === "arcade") { tr.st.special++; makeArcade(); }
  else if (type === "library") { tr.st.special++; makeLibrary(); }
  else if (type === "vault") { tr.st.special++; makeVault(); }
  else if (type === "chest") makeChest();
  else if (type === "workshop") { tr.st.special++; makeWorkshop(); }
  else if (type === "moonside") { tr.st.special++; makeMoonside(); }
  tr.phase = "room";
  drawTower();
}

// ---------- the rolling HP meter: damage counts down over time, so a fast heal can still save someone ----------
function startRolling() { clearInterval(twTimer); twLast = performance.now(); twTimer = setInterval(rollTick, 50); }
function stopRolling() {
  clearInterval(twTimer);
  if (!tr) return;
  // whatever damage was still rolling when the battle ended never lands
  tr.team.forEach(m => { if (!m.ko) { m.hp = Math.max(1, Math.ceil(m.shown)); m.shown = m.hp; } });
}
function rollTick() {
  const now = performance.now(), dt = Math.min(.2, (now - twLast) / 1000); twLast = now;
  if (!tr || !tr.battle || tr.battle.over || $("#viewTower").hidden || document.hidden || !$("#modal").hidden) return;
  let fell = false;
  tr.team.forEach(m => {
    if (m.ko || m.shown === m.hp) return;
    const rate = 9 + m.mhp * .05;
    m.shown = m.shown > m.hp ? Math.max(m.hp, m.shown - rate * dt) : Math.min(m.hp, m.shown + rate * 4 * dt);
    if (m.shown <= 0) { m.shown = 0; m.hp = 0; m.ko = true; m.st = {}; fell = true; twLog(`• ${m.h.name} got hurt and collapsed...`, "bad"); sfx("lose"); twFaint(m); }
    if (window.drawOdo) drawOdo(m);
  });
  if (!fell) return;
  if (!aliveH().length && hasRelic("egglight") && !tr.eggUsed) { tr.eggUsed = true; tr.team.forEach(x => { x.ko = false; x.hp = x.shown = Math.round(x.mhp * .3); x.st = {}; }); twLog("• The Egg of Light glowed! Everyone got back up!", "good"); sfx("reward"); drawTeam(); return; }
  if (!aliveH().length) return twDefeat();
  const b = tr.battle;
  if (b.actor && b.actor.ko) { b.actor = null; b.pending = null; tr.phase = "busy"; b.idx++; later(nextActor, 300); drawMenu(); drawFoes(); }
  drawTeam();
}

// ---------- battle flow: everyone acts in speed order, like EarthBound ----------
function later(fn, ms) { const b = tr && tr.battle, tok = b && b.tok; setTimeout(() => { if (tr && tr.battle && tr.battle.tok === tok && !tr.battle.over) fn(); }, ms); }
function startBattle(type) {
  tr.battle = {type, foes:makeFoes(type), round:0, idx:0, order:[], tok:Math.random(), teddy:false, party:{}, over:false};
  tr.team.forEach(m => { m.cd = {}; m.guard = false; m.tough = 0; });
  tr.phase = "fight"; tr.log = [];
  const names = tr.battle.foes.map(x => x.e.name), first = names[0];
  drawTower();
  sfx(type === "battle" ? "open" : "smash");
  twLog(type === "final" ? `• The final foe, ${first}, appears! The air itself feels wrong...`
    : type === "boss" ? `• Floor ${tr.floor}: ${first} blocks the stairs!`
    : names.length > 1 ? `• You confront ${first} and its cohorts!` : `• You encountered ${first}!`);
  startRolling();
  if (hasRelic("ropesnake")) { const x = pickR(tr.battle.foes, Math.random); x.st.stun = Math.max(x.st.stun || 0, 1); twLog(`• The Rope Snake wrapped around ${x.e.name}! It can't move this turn.`, "good"); }
  // EarthBound's swirls: a faster party sometimes gets the jump on normal battles, a slower one gets ambushed
  if (type === "battle" || type === "tough") {
    const avg = a => a.reduce((s, x) => s + x.spd, 0) / a.length, edge = (avg(aliveH()) - avg(tr.battle.foes)) / Math.max(1, avg(tr.battle.foes));
    const r = Math.random(), green = clamp(.14 + edge * .25, .05, .3), red = clamp(.1 - edge * .2, .03, .22);
    if (r < green) { tr.battle.open = "green"; twLog("• 🟢 You caught them off guard! Your party gets a free turn.", "good"); }
    else if (r < green + red) { tr.battle.open = "red"; twLog("• 🔴 Ambush! The enemies attack first.", "bad"); }
  }
  // bosses get a title card first; the fight starts once it closes
  if (type !== "battle" && window.bossCard) bossCard(() => later(newRound, 250));
  else later(newRound, 700);
}
function newRound() {
  const b = tr.battle; b.round++;
  let units = [...aliveH().map(m => ({m})), ...aliveF().map(f => ({f}))];
  // the first round of a swirl battle belongs to one side
  if (b.round === 1 && b.open) units = units.filter(u => b.open === "green" ? u.m : u.f);
  units.forEach(u => u.ord = (u.m ? u.m.spd : u.f.spd) * rnd(.75, 1.25));
  b.order = units.sort((a, c) => c.ord - a.ord); b.idx = 0;
  nextActor();
}
function nextActor() {
  const b = tr.battle;
  b.actor = null;
  if (b.idx >= b.order.length) return endRound();
  const u = b.order[b.idx];
  if (u.m) {
    const m = u.m;
    if (m.ko) { b.idx++; return nextActor(); }
    m.guard = false;
    if (m.st.sleep) {
      if (Math.random() < .35) { delete m.st.sleep; twLog(`• ${m.h.name} woke up!`); }
      else { twLog(`• ${m.h.name} is asleep. Zzz...`); b.idx++; return later(nextActor, 550); }
    }
    b.actor = m; tr.phase = "fight"; b.pending = null;
    drawTeam(); drawMenu();
    if (tr.auto) later(autoAct, 450);
  } else {
    if (u.f.hp <= 0) { b.idx++; return nextActor(); }
    drawMenu();
    later(() => {
      enemyAct(u.f);
      if (u.f.traits.includes("swift") && u.f.hp > 0 && aliveH().length && Math.random() < .35) { twLog(`• ${u.f.e.name} moves again in a blur!`); enemyAct(u.f); }
      afterAction();
    }, 550);
  }
}
function afterAction() {
  tr.battle.fx = null;
  if (checkEnd()) return;
  tr.battle.idx++;
  drawFoes(); drawTeam();
  later(nextActor, 380);
}
function endRound() {
  const f = tr.floor, foes = aliveF();
  if (hasRelic("flyingman") && aliveF().length) hurtFoe(pickR(aliveF(), Math.random), Math.round((8 + f * 4) * rnd(.85, 1.15)), "🦅 A Flying Man swooped in!");
  if (checkEnd()) return;
  aliveH().forEach(m => {
    if (m.st.poison) { const d = Math.max(1, Math.round(m.mhp * .05)); m.hp = Math.max(0, m.hp - d); twLog(`• ${m.h.name} took ${d} damage from poison.`, "bad"); }
    Object.keys(m.cd).forEach(k => { if (m.cd[k] > 0) m.cd[k]--; });
    if (m.st.cry && --m.st.cry <= 0) delete m.st.cry;
  });
  aliveF().forEach(x => ["weak", "cry"].forEach(s => { if (x.st[s] && --x.st[s] <= 0) delete x.st[s]; }));
  aliveF().filter(x => x.traits.includes("regen")).forEach(x => { const a = Math.round(x.mhp * .05); x.hp = Math.min(x.mhp, x.hp + a); twLog(`• ${x.e.name} regenerated ${a} HP.`); });
  if (hasRelic("cherub")) aliveH().forEach(x => { x.hp = Math.min(x.mhp, x.hp + Math.max(1, Math.round(x.mhp * .04))); });
  if (hasRelic("butterfly")) aliveH().filter(x => x.mpp).forEach(x => { x.pp = Math.min(x.mpp, x.pp + Math.max(1, Math.round(x.mpp * .03))); });
  const p = tr.battle.party;
  ["shield", "offup"].forEach(s => { if (p[s] && --p[s] <= 0) { delete p[s]; twLog(s === "shield" ? "• The shield disappeared." : "• Offense went back to normal."); } });
  drawFoes(); drawTeam();
  later(newRound, 500);
}
function checkEnd() {
  // the final foe gets back up once, like Giygas in EarthBound
  const fin = tr.battle.foes.find(x => x.final && x.hp <= 0 && !x.phase2);
  if (fin) {
    fin.phase2 = true; fin.hp = Math.round(fin.mhp * .6); fin.atk *= 1.15; fin.angry = true; fin.st = {};
    twLog(`• ...It's not right... not... right... ${fin.e.name} rose again, stronger than before!`, "bad");
    sfx("smash"); drawFoes();
    return false;
  }
  if (!aliveF().length) { twVictory(); return true; }
  return false;
}

// ---------- hero actions ----------
const needsFoe = mv => ["hit", "psi", "sleep", "stun", "weak", "magnet", "steal"].includes(mv.kind) && !mv.all;
// healing PSI and goods that help one friend let you pick who gets them
function allyNeed(key) {
  if (key.startsWith("g:")) { const g = GOODS[key.slice(2)]; return g && ["heal", "full", "stat", "pp", "revive"].includes(g.kind) ? g.kind : null; }
  const mv = TMOVES[key]; return mv && (mv.kind === "heal" || mv.kind === "revive") ? mv.kind : null;
}
// PSI with several levels (α, β, γ, Ω) only shows the strongest one you have the PP for
const psiFam = k => { const r = TMOVES[k].n.match(/^(.*) ([αβγΣΩ])$/); return r ? [r[1], "αβγΣΩ".indexOf(r[2])] : [k, 0]; };
function shownMoves(m) {
  const best = {};
  m.moves.forEach(k => {
    if (!TMOVES[k]) return;
    const [f, lv] = psiFam(k), mv = TMOVES[k], ok = (!mv.pp || m.pp >= mv.pp) && !(m.cd[k] > 0), cur = best[f];
    if (!cur || (ok && !cur.ok) || (ok === cur.ok && (ok ? lv > cur.lv : lv < cur.lv))) best[f] = {k, lv, ok};
  });
  return m.moves.filter(k => TMOVES[k] && best[psiFam(k)[0]].k === k);
}
const allyOpts = kind => kind === "revive" ? tr.team.filter(x => x.ko) : kind === "pp" ? aliveH().filter(x => x.mpp) : aliveH();
function choose(key) {
  const b = tr.battle, m = b && b.actor;
  if (!m || tr.phase !== "fight") return;
  const need = allyNeed(key);
  if (need) {
    const opts = allyOpts(need);
    if (opts.length > 1) { b.pending = key; tr.phase = "ally"; drawMenu(); drawTeam(); return; }
    return act(key, null, opts[0]);
  }
  if (key === "bash" || (TMOVES[key] && needsFoe(TMOVES[key])) || (key.startsWith("g:") && GOODS[key.slice(2)].kind === "dmg")) {
    if (aliveF().length > 1) { b.pending = key; tr.phase = "target"; drawMenu(); drawFoes(); return; }
    return act(key, aliveF()[0]);
  }
  act(key, null);
}
function act(key, foe, ally) {
  const b = tr.battle, m = b.actor;
  if (!m || m.ko) return;
  tr.phase = "busy"; b.pending = null; b.actor = null;
  // battle effects: remember what was used and by whom, so each hit can show that move's look
  b.fx = key; b.fxN = 0; b.fxT = null; b.lastActor = m;
  // thorny enemies only hurt back when they're hit up close
  b.melee = key === "bash" || (TMOVES[key] && ["hit", "steal"].includes(TMOVES[key].kind));
  drawMenu();
  if (key === "bash") { if (window.fxCast) fxCast(m, key); return doBash(m, foe); }
  if (key === "defend") { m.guard = true; twLog(`• ${m.h.name} is on guard.`); return afterAction(); }
  if (key === "run") return tryRun(m, false);
  if (key.startsWith("g:")) { if (window.fxCast) fxCast(m, key); useGood(key.slice(2), m, foe, ally); if (window.fxMove) fxMove(m, key, foe, ally); return afterAction(); }
  const base = TMOVES[key];
  if (base.pp && m.pp < base.pp) { twLog(`• Not enough PP for ${base.n}.`); b.actor = m; tr.phase = "fight"; return drawMenu(); }
  const mv = masteredMove(m, key);
  m.pp -= mv.pp || 0;
  if (mv.pp) tr.st.psi++;
  if (mv.cd) m.cd[key] = mv.cd + 1;
  if (window.fxCast) fxCast(m, key);
  doMove(m, mv, foe, ally);
  if (window.fxMove) fxMove(m, key, foe, ally);
  practice(m, key);
  if (mv.kind === "run") return;
  afterAction();
}
// ---------- move mastery: the more a hero uses a move, the better they get at it ----------
const MASTERY = [0, 4, 10];   // uses needed for ✦ and ✦✦
const masteryOf = (m, k) => { const u = (m.uses && m.uses[k]) || 0; return u >= MASTERY[2] ? 2 : u >= MASTERY[1] ? 1 : 0; };
// ✦ hits 15% harder (and lands status moves more often); ✦✦ hits 30% harder and comes back a turn sooner
function masteredMove(m, k) {
  const mv = TMOVES[k], lv = masteryOf(m, k);
  if (!lv) return mv;
  const x = {...mv};
  if (x.pow) x.pow *= 1 + .15 * lv;
  if (x.chance) x.chance = Math.min(.95, x.chance + .08 * lv);
  if (lv >= 2 && x.cd > 1) x.cd--;
  return x;
}
function practice(m, k) {
  m.uses = m.uses || {};
  const before = masteryOf(m, k);
  m.uses[k] = (m.uses[k] || 0) + 1;
  const now = masteryOf(m, k);
  if (now > before) { twLog(`• ${m.h.name} has mastered ${TMOVES[k].n}! ${"✦".repeat(now)}${now === 2 ? " It hits harder and reloads faster." : " It's stronger now."}`, "good"); sfx("reward"); }
}
function crit() { return Math.random() < (hasRelic("rabbit") ? 1 / 8 : 1 / 16) + (hasRelic("gutsy") ? .1 : 0) + (hasBless("fortune") ? .04 : 0); }
function hitDmg(m, foe, pow, smashy) {
  const off = m.atk * 2 * pow * (tr.battle.party.offup ? 1.3 : 1), def = foe.def * (foe.st.weak ? .55 : 1);
  return Math.max(1, Math.round(smashy ? off * 2 - def * .3 : (off - def) * rnd(.85, 1.15)));
}
function psiDmg(m, foe, pow) {
  const base = (12 + m.atk * 1.05) * pow * (1 + m.bonus.psi) * (hasRelic("diadem") ? 1.15 : 1) * (tr.battle.party.offup ? 1.3 : 1) * (foe.traits.includes("psiward") ? .5 : 1);
  return Math.max(1, Math.round(base * rnd(.9, 1.1) - foe.def * .25 * (foe.st.weak ? .5 : 1)));
}
function hurtFoe(foe, d, what, smashy) {
  if (hasMod("glass")) d = Math.round(d * 1.5);
  if (foe.sturdy > 0) { foe.sturdy--; d = Math.max(1, Math.ceil(d / 2)); }
  const wasUp = foe.hp > 0;
  foe.hp = Math.max(0, foe.hp - d);
  if (foe.st.sleep && Math.random() < .5) delete foe.st.sleep;
  twLog(`• ${what}${smashy ? " SMAAAASH!!" : ""} ${d} HP of damage to ${foe.e.name}!${foe.hp <= 0 ? ` ${foe.e.name} was defeated!` : ""}`, smashy ? "good" : "");
  if (smashy) sfx("smash");
  if (window.flashFoe) flashFoe(foe);
  if (window.fxFoe) fxFoe(foe, smashy);
  const b = tr.battle, who = b && b.lastActor;
  // thorny: hitting it up close hurts
  if (foe.traits.includes("thorny") && b && b.melee && who && !who.ko && b.order[b.idx] && b.order[b.idx].m === who) {
    const t = Math.max(1, Math.round(d * .15)); who.hp = Math.max(0, who.hp - t);
    twLog(`• ${foe.e.name}'s spikes hurt ${who.h.name}! ${t} HP of damage.`, "bad");
  }
  // explosive: it goes out with a bang
  if (foe.traits.includes("explosive") && wasUp && foe.hp <= 0) {
    twLog(`• ${foe.e.name} exploded! The blast hit everyone.`, "bad"); sfx("smash");
    aliveH().forEach(m => { m.hp = Math.max(0, m.hp - Math.max(1, Math.round(m.mhp * .08 + tr.floor * .6))); });
  }
  drawFoes();
}
function doBash(m, foe) {
  if (m.st.cry && !hasRelic("hawkeye") && Math.random() < .5) { twLog(`• ${m.h.name} attacked, but was crying too hard to aim. Missed!`); return afterAction(); }
  if (!hasRelic("hawkeye") && Math.random() < (hasRelic("casey") ? .25 : .04)) { twLog(`• ${m.h.name} attacked... just missed!`); return afterAction(); }
  const smashy = crit(), d = hitDmg(m, foe, (hasRelic("casey") ? 1.6 : 1) * (hasRelic("legendbat") ? 1.25 : 1), smashy);
  hurtFoe(foe, d, `${m.h.name} attacked!`, smashy);
  if (tr.auto || foe.hp <= 0) return afterAction();
  startCombo(m, foe, d);
}
function healOne(t, amt, what) {
  if (!t) return;
  t.hp = Math.min(t.mhp, t.hp + amt);
  if (window.fxHero) fxHero(t);
  twLog(`• ${what} ${t.h.name} recovered ${amt} HP!`, "good");
}
const mostHurt = () => aliveH().sort((a, c) => a.shown / a.mhp - c.shown / c.mhp)[0];
function doMove(m, mv, foe, ally) {
  const b = tr.battle, foes = mv.all ? aliveF() : [foe], boss = foe && foe.boss;
  const said = `${m.h.name} ${mv.kind === "psi" || mv.pp ? "tried" : "used"} ${mv.n}!`;
  if (mv.kind === "hit") {
    if (mv.miss && !hasRelic("hawkeye") && Math.random() < mv.miss) return twLog(`• ${said} ...but missed!`);
    if (mv.all) twLog(`• ${said}`);
    if (mv.times) twLog(`• ${said}`);
    foes.forEach(x => { for (let i = 0; i < (mv.times || 1) && x.hp > 0; i++) { const s = crit(); hurtFoe(x, hitDmg(m, x, mv.pow, s), mv.all || mv.times ? "" : said, s); } });
  } else if (mv.kind === "psi") {
    if (mv.miss && !hasRelic("hawkeye") && Math.random() < mv.miss) return twLog(`• ${said} ...it missed!`);
    if (mv.all) twLog(`• ${said}`);
    foes.forEach(x => hurtFoe(x, psiDmg(m, x, mv.pow), mv.all ? "" : said));
  } else if (mv.kind === "heal") { const t = ally && !ally.ko ? ally : mostHurt(); healOne(t, Math.round(t.mhp * mv.pow), said); }
  else if (mv.kind === "healall") { twLog(`• ${said}`, "good"); aliveH().forEach(t => healOne(t, Math.round(t.mhp * mv.pow), "")); }
  else if (mv.kind === "cure") { aliveH().forEach(t => t.st = {}); twLog(`• ${said} Everyone feels better.`, "good"); }
  else if (mv.kind === "sleep" || mv.kind === "stun") {
    const ok = Math.random() < (boss ? mv.chance / 2 : mv.chance);
    if (!ok) return twLog(`• ${said} ...it didn't work on ${foe.e.name}.`);
    if (mv.kind === "sleep") { foe.st.sleep = 1; twLog(`• ${said} ${foe.e.name} fell asleep!`, "good"); }
    else { foe.st.stun = 2; twLog(`• ${said} ${foe.e.name} can't move!`, "good"); }
  } else if (mv.kind === "weak") { foes.forEach(x => x.st.weak = 3); twLog(`• ${said} ${mv.all ? "Every enemy's" : foe.e.name + "'s"} defense went down!`, "good"); }
  else if (mv.kind === "revive") {
    const t = ally && ally.ko ? ally : tr.team.find(x => x.ko);
    if (!t) twLog(`• ${said} ...but nobody needed it.`);
    else { t.ko = false; t.hp = t.shown = Math.round(t.mhp * mv.pow); t.st = {}; b.fxT = t; twLog(`• ${said} ${t.h.name} was revived!`, "good"); }
  }
  else if (mv.kind === "cry") {
    aliveF().forEach(x => { if (Math.random() < (x.boss ? mv.chance / 2 : mv.chance)) x.st.cry = 3; });
    twLog(`• ${said} ${aliveF().filter(x => x.st.cry).map(x => x.e.name).join(", ") || "Nobody"} started crying!`, "good");
  } else if (mv.kind === "shield") { b.party.shield = 3; twLog(`• ${said} The party is protected!`, "good"); }
  else if (mv.kind === "offup") { b.party.offup = 3; twLog(`• ${said} Everyone's offense went up!`, "good"); }
  else if (mv.kind === "magnet") {
    const amt = Math.round(6 + tr.floor * .8);
    m.pp = Math.min(m.mpp, m.pp + amt); twLog(`• ${said} Drained ${amt} PP from ${foe.e.name}!`, "good");
  } else if (mv.kind === "tough") { m.tough = Math.min(3, m.tough + 1); twLog(`• ${said} ${m.h.name}'s defense went up!`, "good"); }
  else if (mv.kind === "pray") pray(m);
  else if (mv.kind === "chant") chant(m);
  else if (mv.kind === "guard") { m.guard = true; twLog(`• ${m.h.name} used ${mv.n === "Use a friend as a shield" ? "a friend as a shield" : mv.n}!`); }
  else if (mv.kind === "invent") invent(m);
  else if (mv.kind === "steal") {
    const s = crit(); hurtFoe(foe, hitDmg(m, foe, mv.pow, s), said, s);
    const c = 6 + tr.floor * 2; tr.money += c;
    if (Math.random() < .3) { const k = pickR(FOOD, Math.random); tr.goods[k] = (tr.goods[k] || 0) + 1; twLog(`• ${m.h.name} swiped $${c} and a ${GOODS[k].n}!`, "good"); }
    else twLog(`• ${m.h.name} swiped $${c}!`, "good");
  } else if (mv.kind === "ppall") {
    twLog(`• ${said}`, "good");
    aliveH().filter(x => x.mpp).forEach(x => { const a = Math.max(3, Math.round(x.mpp * .15)); x.pp = Math.min(x.mpp, x.pp + a); });
    twLog("• Everyone with PSI recovered some PP!", "good");
  }
  else if (mv.kind === "run") tryRun(m, true);
  sfx(["heal", "healall", "cure", "revive"].includes(mv.kind) ? "ok" : "click");
}
// Paula's Pray, with the effects and odds listed on WikiBound (simplified)
function pray(m) {
  const r = Math.random() * 16, f = 1 + .08 * tr.floor;
  twLog(`• ${m.h.name} prayed from the bottom of her heart...`);
  if (r < 1) aliveF().forEach(x => hurtFoe(x, Math.round(rnd(60, 180) * f), "A dazzling light!"));
  else if (r < 3) { aliveF().forEach(x => x.st.cry = 2); twLog("• A dazzling light! The enemies began to cry.", "good"); }
  else if (r < 4) { const t = pickR(aliveH(), Math.random); healOne(t, t.mhp, "A golden light!"); }
  else if (r < 5) { aliveF().forEach(x => x.st.stun = 1); twLog("• A heaven-rending sound! The enemies can't move.", "good"); }
  else if (r < 6) { aliveF().forEach(x => x.st.weak = 3); twLog("• The air grew heavy. Enemy defense dropped.", "good"); }
  else if (r < 7) { aliveF().forEach(x => { if (!x.boss) x.st.sleep = 1; }); twLog("• A mysterious aroma... the enemies got drowsy!", "good"); }
  else if (r < 8) { aliveH().forEach(x => x.pp = Math.min(x.mpp, x.pp + 2 + Math.floor(Math.random() * 6))); twLog("• A mysterious light. Everyone recovered a little PP.", "good"); }
  else if (r < 13) aliveH().forEach(x => healOne(x, Math.max(1, Math.floor(x.mhp / 16)), "A very subtle light."));
  else if (r < 15) aliveH().forEach(x => healOne(x, Math.max(1, Math.floor(x.mhp / 8)), "A warm light."));
  else {
    const down = tr.team.filter(x => x.ko);
    down.forEach(x => { x.ko = false; x.hp = x.shown = Math.round(x.mhp / 3); });
    twLog(down.length ? "• A rainbow-colored light! Fallen friends got back up!" : "• A rainbow-colored light... but nobody needed it.", "good");
  }
}
function tryRun(m, sure) {
  const b = tr.battle;
  if (b.type !== "battle") { twLog("• You can't run from this fight!"); return afterAction(); }
  const avg = a => a.reduce((s, x) => s + x.spd, 0) / a.length;
  const chance = Math.max(.2, Math.min(.95, .55 + (avg(aliveH()) - avg(aliveF())) * .05));
  if (sure || hasRelic("bike") || Math.random() < chance) {
    b.over = true; twLog(`• ${sure ? "A cloud of smoke! " : ""}The party ran away safely.`); sfx("click");
    stopRolling();
    tr.phase = "fled";
    return drawMenu();
  }
  twLog("• You tried to run away... but couldn't!", "bad");
  afterAction();
}
function useGood(k, m, foe, ally) {
  const pick = ok => ally && ok(ally) ? ally : null, up = x => !x.ko;
  const g = GOODS[k], f = tr.floor;
  tr.goods[k]--; if (tr.goods[k] <= 0) delete tr.goods[k];
  if (!tr.st.firstGood) tr.st.firstGood = tr.floor;
  const who = m ? m.h.name : "You";
  if (g.kind === "full") { const t = pick(up) || mostHurt(); t.hp = t.mhp; t.pp = t.mpp; twLog(`• ${who} used the ${g.n}. ${t.h.name} is fully restored!`, "good"); }
  else if (g.kind === "cure") { aliveH().forEach(x => x.st = {}); twLog(`• ${who} used the ${g.n}. Everyone feels better.`, "good"); }
  else if (g.kind === "stat") { const t = pick(up) || pickR(aliveH(), Math.random), k = pickR(["atk", "def", "spd", "hp"], Math.random), a = {atk:2, def:2, spd:1, hp:.06}[k]; t.bonus[k] += a; const before = t.mhp; refresh(t); if (k === "hp") t.hp += t.mhp - before; twLog(`• ${who} used the ${g.n}. ${t.h.name}'s ${({atk:"Offense", def:"Defense", spd:"Speed", hp:"Max HP"})[k]} went up!`, "good"); }
  else if (g.kind === "heal") { const t = pick(up) || mostHurt(); healOne(t, Math.round(t.mhp * g.amt), `${who} used the ${g.n}.`); }
  else if (g.kind === "healall") { twLog(`• ${who} shared the ${g.n}.`, "good"); aliveH().forEach(t => healOne(t, Math.round(t.mhp * g.amt), "")); }
  else if (g.kind === "pp") { const t = pick(x => up(x) && x.mpp) || aliveH().filter(x => x.mpp).sort((a, c) => a.pp / a.mpp - c.pp / c.mpp)[0]; if (t) { const a = Math.max(8, Math.round(t.mpp * g.amt)); t.pp = Math.min(t.mpp, t.pp + a); twLog(`• ${who} used the ${g.n}. ${t.h.name} recovered ${a} PP!`, "good"); } }
  else if (g.kind === "revive") { const t = pick(x => x.ko) || tr.team.find(x => x.ko); if (t) { t.ko = false; t.hp = t.shown = Math.round(t.mhp * g.amt); t.st = {}; if (tr.battle) tr.battle.fxT = t; twLog(`• ${who} used the ${g.n}. ${t.h.name} was revived!`, "good"); } }
  else if (g.kind === "dmgall") { twLog(`• ${who} used the ${g.n}!`); aliveF().forEach(x => hurtFoe(x, Math.round((20 + f * 8) * g.pow * rnd(.9, 1.1)), "")); }
  else if (g.kind === "dmg") { const hit = g.vs && foe.e.kinds.includes(g.vs) ? 4 : 1; hurtFoe(foe, Math.round((20 + f * 8) * g.pow * hit * rnd(.9, 1.1)), `${who} used the ${g.n}!${hit > 1 ? " It's super effective!" : ""}`); }
  else if (g.kind === "distract") { aliveF().forEach(x => x.st.distract = 1); twLog(`• ${who} opened the ${g.n}. The enemies can't stop staring at it!`, "good"); }
  sfx("ok");
}
// outside battle, healing goods can be used from the bag
function useGoodOutside(k, ally) {
  const g = GOODS[k];
  if (!["heal", "healall", "pp", "revive", "full", "cure", "stat"].includes(g.kind)) return;
  tr.log = [];
  useGood(k, null, null, ally);
  tr.team.forEach(m => m.shown = m.hp);
  drawTower();
}
function autoAct() {
  const b = tr.battle, m = b.actor;
  if (!m) return;
  const can = k => { const mv = TMOVES[k]; return mv && (!mv.pp || m.pp >= mv.pp) && !(m.cd[k] > 0); };
  const low = aliveH().find(x => x.shown / x.mhp < .35);
  const moves = shownMoves(m), down = tr.team.find(x => x.ko);
  const revive = down && moves.find(k => can(k) && TMOVES[k].kind === "revive");
  if (revive) return act(revive, null, down);
  const heal = moves.find(k => can(k) && (TMOVES[k].kind === "heal" || TMOVES[k].kind === "healall"));
  if (low && heal) return act(heal, null);
  const atk = moves.filter(k => can(k) && ["hit", "psi"].includes(TMOVES[k].kind) && (!TMOVES[k].pp || m.pp > m.mpp * .3))
    .sort((a, c) => (TMOVES[c].pow || 0) * (TMOVES[c].all ? aliveF().length : 1) - (TMOVES[a].pow || 0) * (TMOVES[a].all ? aliveF().length : 1))[0];
  const foe = aliveF().sort((a, c) => a.hp - c.hp)[0];
  act(atk || "bash", foe);
}

// ---------- enemy turns ----------
function enemyAct(foe) {
  const b = tr.battle;
  foe.turns++;
  if (foe.st.distract) { delete foe.st.distract; return twLog(`• ${foe.e.name} is distracted by the Fly honey.`); }
  if (foe.st.sleep) { if (Math.random() < .35) { delete foe.st.sleep; return twLog(`• ${foe.e.name} woke up!`); } return twLog(`• ${foe.e.name} is sleeping soundly. Zzz...`); }
  if (foe.st.stun) { foe.st.stun--; if (!foe.st.stun) delete foe.st.stun; return twLog(`• ${foe.e.name} can't move!`); }
  const targets = aliveH();
  if (!targets.length) return;
  // summoner: once it's hurt, it calls for help (one time only)
  if (foe.traits.includes("summoner") && !foe.called && foe.hp < foe.mhp * .6 && aliveF().length < 4) {
    foe.called = true;
    const mates = ALL.filter(e => e.game === foe.e.game && !e.boss && spriteUrl(e) && Math.abs(powerOf(e) - powerOf(foe.e)) < 35);
    const e = mates.length ? pickR(mates, Math.random) : foe.e, x = makeFoe(e, tr.floor, .55, .8);
    b.foes.push(x);
    twLog(`• ${foe.e.name} called for help! ${e.name} joined the battle!`, "bad"); sfx("open");
    return drawFoes();
  }
  // bosses get angry when they're hurt
  if (foe.boss && !foe.angry && foe.hp < foe.mhp / 2) { foe.angry = true; foe.atk *= 1.25; twLog(`• ${foe.e.name} is furious! Its attacks got stronger.`, "bad"); }
  if (foe.boss && foe.turns % (foe.angry ? 2 : 3) === 0) {
    twLog(`• ${foe.e.name} unleashed a mighty attack on everyone!${hasRelic("franklin") ? " The Franklin badge deflected some of it!" : ""}`, "bad");
    return targets.forEach(m => hitHero(foe, m, hasRelic("franklin") ? .36 : .6));
  }
  // smarter enemies gang up on whoever looks weakest
  const weakest = targets.slice().sort((a, c) => a.shown / a.mhp - c.shown / c.mhp)[0];
  const t = Math.random() < .3 + tr.floor * .006 ? weakest : pickR(targets, Math.random), k = foe.e.kinds[0];
  if (Math.random() < .2) {
    if (k === "Bug" || k === "Plant" && Math.random() < .5) { if (!t.st.poison) { t.st.poison = 1; return twLog(`• ${foe.e.name} stung ${t.h.name}! ${t.h.name} got poisoned!`, "bad"); } }
    else if (k === "Ghost" || k === "Weird") { t.st.cry = 3; return twLog(`• ${foe.e.name} did something spooky. ${t.h.name} started crying!`, "bad"); }
    else if (k === "Plant" || k === "Object") { if (!t.st.sleep) { t.st.sleep = 1; return twLog(`• ${foe.e.name} scattered spores... ${t.h.name} fell asleep!`, "bad"); } }
    else if (k === "Alien" || k === "Machine") { twLog(`• ${foe.e.name} fired a beam at the whole party!`, "bad"); return targets.forEach(m => hitHero(foe, m, .45)); }
  }
  hitHero(foe, t, 1);
}
function hitHero(foe, m, scale) {
  const b = tr.battle;
  if (!b.teddy && hasRelic("teddy")) { b.teddy = true; return twLog(`• ${foe.e.name} attacked, but the Teddy bear took the hit!`, "good"); }
  if (Math.random() < (foe.st.cry ? .45 : 0) + .05 + m.spd * .005) return twLog(`• ${foe.e.name} attacked ${m.h.name}... ${m.h.name} dodged quickly!`);
  const smashy = Math.random() < 1 / 18, def = m.def * (1 + .3 * m.tough);
  let d = smashy ? foe.atk * 3.2 : (foe.atk * 2 - def) * rnd(.85, 1.15);
  d = Math.max(1, Math.round(d * scale * (hasMod("glass") ? 1.5 : 1) * (b.party.shield ? .6 : 1) * (m.guard ? .5 : 1) * (hasRelic("hardhat") ? .88 : 1) * (scale < 1 && hasRelic("earthpendant") ? .75 : 1)));
  const wasUp = m.hp > 0;
  m.hp = Math.max(0, m.hp - d);
  if (foe.traits.includes("vampiric") && foe.hp > 0) foe.hp = Math.min(foe.mhp, foe.hp + Math.round(d * .5));
  if (m.st.sleep && Math.random() < .5) delete m.st.sleep;
  twLog(`• ${scale === 1 ? foe.e.name + " attacked " + m.h.name + "!" : ""}${smashy ? " SMAAAASH!!" : ""} ${d} HP of damage to ${m.h.name}!${wasUp && m.hp === 0 ? " Mortal damage! Heal fast!" : ""}`, "bad");
  sfx("bad");
  if (window.flashHero) flashHero(m);
  if (window.fxEnemy) fxEnemy(foe, m, smashy, scale);
}

// ---------- winning, losing and upgrades ----------
function twVictory() {
  const b = tr.battle; b.over = true;
  if (b.combo) { comboClear(b.combo); b.combo = null; }
  stopRolling();
  const f = tr.floor, mult = {battle:1, tough:2, boss:3, final:0}[b.type];
  let cash = Math.round(b.foes.reduce((s, x) => s + (5 + f * 3) * rnd(.8, 1.2), 0) * mult * (hasRelic("coin") ? 1.5 : 1) * (hasRelic("spittoon") ? 1.25 : 1) * (hasMod("mystery") ? 1.25 : 1) * (hasMod("bossrush") ? 1.5 : 1) * (hasMod("elite") ? 1.3 : 1) * (hasBless("wealth") ? 1.15 : 1) * (tr.perks ? 1 + .1 * perkLv("keen") : 1) * (1 + .05 * (tr.heat || 0)));
  if (b.type === "boss" && hasRelic("phone")) cash += 40 + f * 6;
  if (hasRelic("thieftools") && b.type !== "final") { const k = pickR(FOOD, Math.random); tr.goods[k] = (tr.goods[k] || 0) + 1; twLog(`• Thief tools: you swiped a ${GOODS[k].n}!`, "good"); }
  tr.money += cash;
  if (b.type === "boss" || b.type === "final") { tr.bosses++; tr.team.forEach(refresh); }
  if (b.type === "boss" && !tr.hard) tr.team.forEach(m => { if (m.ko) { m.ko = false; m.hp = m.shown = Math.round(m.mhp * .25); } });
  // the end of each act gives everyone a full rest before the next one (not in Daily Hard)
  const actEnd = b.type === "boss" && f % 10 === 0 && !tr.hard;
  if (actEnd) tr.team.forEach(m => { m.ko = false; m.hp = m.shown = m.mhp; m.pp = m.mpp; });
  tr.team.forEach(m => { m.st = {}; m.shown = m.hp; });
  sfx(b.type === "battle" ? "ok" : "win");
  twLog(`• YOU WON!${cash ? ` Found $${cash}.` : ""}`, "good");
  if (actEnd) twLog(`• ${actOf(f).n} is over! Everyone rested and is back to full strength. Next: ${actOf(f + 1).n}.`, "good");
  if (f > tw.best && !hasMod("training")) { tw.best = f; twSave(); }
  // beating the final foe: Daily Hard ends here, normal runs can take the trophy or keep climbing forever
  if (b.type === "final") {
    if (tr.hard) return twEnd(true);
    twClear(); tr.phase = "summit"; drawTower(); return;
  }
  tr.st.wins++; if (tr.team.length === 1) tr.st.soloTo = f; runTrack();
  if (hasBless("regen")) aliveH().forEach(m => { m.hp = m.shown = Math.min(m.mhp, m.hp + Math.max(1, Math.round(m.mhp * .08))); });
  tr.lastRare = b.type !== "battle" || (tr.rareLeft > 0 && tr.rareLeft-- > 0);
  tr.offers = makeOffers(tr.lastRare);
  tr.phase = "reward";
  drawTower();
}
function twDefeat() {
  const b = tr.battle; b.over = true;
  if (b.combo) { comboClear(b.combo); b.combo = null; }
  clearInterval(twTimer);
  if (hasRelic("frog") && !tr.frogUsed && !tr.hard) {
    tr.frogUsed = true;
    tr.team.forEach((m, i) => { const s = tr.snap.team[i]; if (s) { m.hp = m.shown = s.hp; m.pp = s.pp; m.ko = s.ko; } else { m.hp = m.shown = m.mhp; m.ko = false; } m.st = {}; });
    tr.goods = {...tr.snap.goods};
    if (tr.team.every(m => m.ko)) tr.team[0].ko = false, tr.team[0].hp = tr.team[0].shown = Math.round(tr.team[0].mhp / 2);
    tr.room = {type:"frog", text:"Everyone fell... but the Save Frog remembered where you were. \"Be careful. And say hi to the next frog for me.\" Try this floor again."};
    tr.phase = "room";
    sfx("open");
    return drawTower();
  }
  twLog("• Everyone fell... you lost the battle.", "bad");
  twEnd(false);
}
function makeOffers(rare) {
  const r = tr.rng, out = [], f = tr.floor, team = tr.team;
  const free = HEROES.filter(h => isUnlocked(h) && !team.some(m => m.h.id === h.id));
  const add = o => { if (o && !out.some(x => x.key === o.key)) out.push(o); };
  const recruit = () => {
    if (team.length >= 4 || !free.length || hasMod("squad")) return null;
    const h = pickR(free);
    return {key:"r:" + h.id, kind:"Recruit", hero:h, title:`${h.name} joins!`, sub:`${h.role}. Knows ${h.start.map(k => TMOVES[k].n).join(", ")}.`,
      apply:() => { team.push(newMember(h, 1)); twLog(`• ${h.name} joined your party!`, "good"); }};
  };
  const learn = () => {
    const opts = team.flatMap(m => m.h.learn.filter(k => canLearn(m, k)).map(k => [m, k]));
    if (!opts.length) return null;
    const [m, k] = pickR(opts), mv = TMOVES[k];
    return {key:"l:" + m.h.id + k, kind:"New move", hero:m.h, title:`${m.h.name} learns ${mv.n}`, sub:`${mvDesc(mv)}${mv.pp ? ` · ${mv.pp} PP` : ""}`,
      apply:() => { m.moves.push(k); twLog(`• ${m.h.name} learned ${mv.n}!`, "good"); }};
  };
  const stat = () => {
    const S = [["hp", "Max HP", .2, "%"], ["atk", "Offense", 4, ""], ["def", "Defense", 3, ""], ["spd", "Speed", 1.5, ""], ["pp", "Max PP", .3, "%"], ["psi", "PSI power", .15, "%"]];
    const all = rare && r() < .5, m = pickR(team), opts = S.filter(s => !["pp", "psi"].includes(s[0]) || (all ? team.some(x => x.mpp) : m.mpp));
    const [k, l, amt0] = pickR(opts), amt = amt0 * (rare ? 1.6 : 1), pct = k === "hp" || k === "pp" || k === "psi";
    const shown = pct ? `+${Math.round(amt * 100)}%` : `+${Math.round(amt * 10) / 10}`;
    return {key:"s:" + (all ? "all" : m.h.id) + k, kind:"Stat boost", hero:all ? null : m.h, ic:all ? "💪" : null, title:`${shown} ${l} for ${all ? "the whole party" : m.h.name}`, sub:"Lasts for the rest of the run.",
      apply:() => (all ? team : [m]).forEach(x => { x.bonus[k] += amt; const before = x.mhp; refresh(x); if (k === "hp") { x.hp += x.mhp - before; x.shown = x.hp; } })};
  };
  const gear = () => {
    const m = pickR(team), weapon = r() < .5, amt = Math.round((weapon ? 3 + f * .6 : 2 + f * .45) * (rare ? 1.6 : 1));
    return {key:"g:" + m.h.id + weapon, kind:weapon ? "Weapon" : "Armor", hero:m.h, title:`${weapon ? "Better weapon" : "Sturdier gear"} for ${m.h.name}`, sub:`+${amt} ${weapon ? "Offense" : "Defense"}`,
      apply:() => { m.bonus[weapon ? "atk" : "def"] += amt; refresh(m); }};
  };
  const relic = () => {
    const left = Object.keys(RELICS).filter(k => !tr.relics.includes(k) && !(RELICS[k].normalOnly && tr.hard));
    if (!left.length) return null;
    const k = pickR(left), x = RELICS[k];
    return {key:"x:" + k, kind:"Relic", ic:x.ic, title:x.n, sub:x.d, apply:() => { tr.relics.push(k); twLog(`• You got the ${x.n}!`, "good"); }};
  };
  const goods = () => {
    const a = pickR(Object.keys(GOODS)), c = pickR(Object.keys(GOODS));
    return {key:"o:" + a + c, kind:"Goods", ic:GOODS[a].ic + (a === c ? "" : GOODS[c].ic), title:a === c ? `2 × ${GOODS[a].n}` : `${GOODS[a].n} + ${GOODS[c].n}`, sub:a === c ? GOODS[a].d : `${GOODS[a].d}. ${GOODS[c].d}.`,
      apply:() => { tr.goods[a] = (tr.goods[a] || 0) + 1; tr.goods[c] = (tr.goods[c] || 0) + 1; }};
  };
  // a recruit is always on offer while you're alone, and often after that
  if (team.length < 4 && r() < (team.length < 2 ? .3 : .12)) add(recruit());
  if (rare) add(relic());
  const pool = [learn, learn, stat, stat, gear, goods, relic];
  for (let tries = 0; out.length < 3 && tries < 40; tries++) add(pickR(pool)());
  return out.slice(0, heat(5) ? 2 : 3);
}
function takeOffer(i) {
  const o = tr.offers && tr.offers[i];
  if (!o) return;
  o.apply(); sfx("reward");
  goMap(true);
}
function skipOffer() { if (heat(5)) return; const cash = 10 + tr.floor * 3; tr.money += cash; sfx("click"); goMap(true); }

// ---------- shop, presents and events ----------
const price = k => Math.round(k * (1 + tr.floor * .03) * (heat(2) ? 1.3 : 1) * (hasCurse("greed") ? 1.4 : 1) * (hasRelic("peacecoin") ? .85 : 1));
function makeShop() {
  const keys = Object.keys(GOODS), stock = [];
  while (stock.length < 4) { const k = pickR(keys); if (!stock.includes(k)) stock.push(k); }
  const left = Object.keys(RELICS).filter(k => !tr.relics.includes(k) && !(RELICS[k].normalOnly && tr.hard));
  tr.room.stock = stock; tr.room.relic = left.length ? pickR(left) : null;
  tr.room.text = "Hi Hi Hi. yOU cOmE BUyinG?";
}
function buy(what) {
  const s = tr.room;
  if (what === "hospital") {
    const cost = price(30);
    if (tr.money < cost) return sfx("bad");
    tr.money -= cost; tr.team.forEach(m => { m.ko = false; m.hp = m.shown = m.mhp; m.pp = m.mpp; m.st = {}; });
    s.text = "yOU aaaaaaall fiXED UP. GOODy! BOinG!"; sfx("ok");
  } else if (what === "relic") {
    const cost = price(130);
    if (tr.money < cost || !s.relic) return sfx("bad");
    tr.money -= cost; tr.relics.push(s.relic); s.text = `OH, yOU tHank. (You got the ${RELICS[s.relic].n}.)`; s.relic = null; sfx("reward");
  } else {
    const cost = price(GOODS[what].price);
    if (tr.money < cost) return sfx("bad");
    tr.money -= cost; tr.goods[what] = (tr.goods[what] || 0) + 1; s.text = `OH, yOU tHank. (You bought the ${GOODS[what].n}.)`; sfx("ok");
  }
  drawTower();
}
function openPresent() {
  const r = tr.rng(), who = tr.team[0].h.name, left = Object.keys(RELICS).filter(k => !tr.relics.includes(k) && !(RELICS[k].normalOnly && tr.hard));
  let got;
  if (r < .2 && left.length) { const k = pickR(left); tr.relics.push(k); got = `the ${RELICS[k].n}! (${RELICS[k].d})`; }
  else if (r < .45) { const c = 25 + tr.floor * 6; tr.money += c; got = `$${c}!`; }
  else { const k = pickR(Object.keys(GOODS)); tr.goods[k] = (tr.goods[k] || 0) + 1; got = `a ${GOODS[k].n}! (${GOODS[k].d})`; }
  tr.room.text = `${who} opened the present. Inside was ${got}`;
  sfx("reward");
}
// each event quotes a real line, then gives a choice (EarthBound quotes are from the GameFAQs scripts).
// Mother and Mother 3 faces (narr) describe the scene instead of quoting.
const EVENTS = [
  {who:"Mr. Saturn", say:"DRink cOffEE BEfORE GO?", yes:"Drink the coffee", run:() => { tr.team.forEach(m => { if (!m.ko) { m.hp = m.shown = Math.min(m.mhp, m.hp + Math.round(m.mhp * .4)); m.pp = Math.min(m.mpp, m.pp + Math.round(m.mpp * .4)); } }); return "BOttOmS UP! BOinG! Everyone recovered 40% HP and PP."; }},
  {who:"Dr. Andonuts", say:"How about a donut?", yes:"Have a donut", run:() => { const m = pickR(tr.team); m.bonus.atk += 2; m.bonus.def += 2; refresh(m); return `"Well, I was only offering... I'd also like a donut right about now." He tuned up ${m.h.name}'s gear: +2 Offense, +2 Defense.`; }},
  {who:"Apple Kid", say:"Hello... this is Apple Kid. I've just finished work on this great invention!", yes:"Take the invention", run:() => { const k = pickR(["bomb", "rocket", "dragonite", "insecticide", "rust", "flyhoney"]); tr.goods[k] = (tr.goods[k] || 0) + 1; if (tr.rng() < .25) { tr.team.forEach(m => { if (!m.ko) m.hp = m.shown = Math.max(1, m.hp - Math.round(m.mhp * .12)); }); return `(Kaboooom!) It blew up a little. Everyone lost some HP... but you still got a ${GOODS[k].n}.`; } return `You got a ${GOODS[k].n}! (${GOODS[k].d})`; }},
  {who:"Gerardo", say:"Man, am I starving. Do you have any food you can spare?", yes:"Give him food", can:() => FOOD.some(k => tr.goods[k]), run:() => { const k = FOOD.find(x => tr.goods[x]); tr.goods[k]--; if (!tr.goods[k]) delete tr.goods[k]; const c = 60 + tr.floor * 8; tr.money += c; return `"Thank you. If I find the gold, I'll give it to you." Later, his brother George brought you a Diamond worth $${c}.`; }},
  {who:"Sailor's Wife", say:"You came from far off just to eat my Magic cake?... Dig in!", yes:"Eat the Magic cake", run:() => { tr.team.forEach(m => { if (!m.ko) { m.bonus.hp += .05; refresh(m); m.pp = m.mpp; } }); return "You had a very clear, and a very strange, dream. Everyone gained 5% Max HP and recovered all PP."; }},
  {who:"Frog", say:"This is what people call \"Saving\". So, RIBBIT, do you want to save?", yes:"Save", hardSkip:true, can:() => !tr.relics.includes("frog"), run:() => { tr.relics.push("frog"); return "Be careful. And say hi to the next frog for me. (You got the Save Frog: if your party falls, you retry that floor once.)"; }},
  {who:"Tutoriole", say:"Using this kind of game language is pretty rare, right? But it's all so tweet. I mean, sweet.", yes:"Listen to the tip", run:() => { tr.goods.cookie = (tr.goods.cookie || 0) + 2; return "Tip: after a Bash, every hero has their own combo game. Win it to keep hitting! And now, like the bird I am....TWEEET! (It dropped 2 Cookies.)"; }},
  {who:"Ness's Dad", say:"Just remember, I'm always behind you 100%. Don't be afraid.", yes:"Check the bank", run:() => { const c = 40 + tr.floor * 5; tr.money += c; return `Dad deposited $${c} into your account. "Good Luck, m'boy! I feel like such a hero!"`; }},
  {who:"Everdred", say:"Use the money any way you like. You cannot refuse my generosity. Just accept it.", yes:"Accept it", run:() => { const c = 70 + tr.floor * 7; tr.money += c; return `You got $${c}. "I'll see you at another time, in another space."`; }},
  {who:"Talah Rama", say:"The truth of space and time moves through the universe like a wave...", yes:"Meditate with him", run:() => { tr.team.forEach(m => { m.bonus.spd += 1; m.bonus.pp += .1; refresh(m); }); return "\"In truth, all is pre-determined...\" Everyone gained +1 Speed and 10% more Max PP."; }},
  {who:"Sphinx", say:"Are you a thief, a warrior, or one who has come to see my majesty?", yes:"\"A warrior.\" (fight a tough foe)", run:() => { startBattle("tough"); return null; }},
  {who:"Topolla Manager", say:"This band owes me a million bucks.", yes:"Pay part of the Runaway Five's debt", can:() => tr.money >= 40 + tr.floor * 3, run:() => { tr.money -= 40 + tr.floor * 3; tr.team.forEach(m => { m.bonus.atk += 2; refresh(m); }); return "The Runaway Five played a show just for you. Everyone feels pumped: +2 Offense for the whole party."; }},
  {who:"Orange Kid", say:"I'm still working on the way to change boiled eggs into raw eggs.", yes:"Invest $30", can:() => tr.money >= 30, run:() => { tr.money -= 30; const k = pickR(Object.keys(GOODS)), c = pickR(Object.keys(GOODS)); tr.goods[k] = (tr.goods[k] || 0) + 1; tr.goods[c] = (tr.goods[c] || 0) + 1; return `It didn't work, but he gave you a ${GOODS[k].n} and a ${GOODS[c].n} as thanks.`; }},
  {who:"Mr. Spoon", say:"Do you want to know about something \"extraordinary\"?", yes:"Sure", run:() => { const left = Object.keys(RELICS).filter(k => !tr.relics.includes(k) && !(RELICS[k].normalOnly && tr.hard)); if (left.length && tr.rng() < .5) { const k = pickR(left); tr.relics.push(k); return `He showed you something extraordinary: the ${RELICS[k].n}! (${RELICS[k].d})`; } return "\"I don't care if the autograph is written on toilet paper...\" He wandered off. Nothing happened."; }},
  {who:"Queen Mary", game:"M1", narr:true, say:"In a dreamy pink room, Queen Mary hums a half-remembered lullaby.", yes:"Listen to her song", run:() => { aliveH().forEach(m => { m.hp = m.shown = m.mhp; m.pp = m.mpp; m.st = {}; }); return "The melody fills the room. Everyone standing is fully restored."; }},
  {who:"Mimmie & Minnie", game:"M1", narr:true, say:"Ninten's little sisters wave from a window: come home and rest for a bit!", yes:"Rest at home", run:() => { tr.team.forEach(m => { if (m.ko) { m.ko = false; m.hp = m.shown = Math.round(m.mhp * .5); } else m.hp = m.shown = Math.min(m.mhp, m.hp + Math.round(m.mhp * .25)); m.st = {}; }); return "Mom made dinner. Everyone feels better, and fallen friends are back on their feet."; }},
  {who:"Mayor of Podunk", game:"M1", narr:true, say:"The Mayor of Podunk wants a photo with some real heroes for the town paper.", yes:"Pose for the photo", run:() => { const c = 50 + tr.floor * 6; tr.money += c; return `Say cheese! The Mayor pays you $${c} for your trouble.`; }},
  {who:"George's journal", game:"M1", narr:true, say:"An old journal lies open on a desk. It's George's notes on PSI.", yes:"Read it", run:() => { const opts = tr.team.flatMap(m => m.h.learn.filter(k => canLearn(m, k)).map(k => [m, k])); if (opts.length) { const [m, k] = pickR(opts); m.moves.push(k); return `${m.h.name} studied the notes and learned ${TMOVES[k].n}!`; } tr.team.forEach(m => { m.bonus.pp += .1; refresh(m); }); return "Nobody can learn anything new from it yet, but reading it still sharpens the mind. +10% Max PP."; }},
  {who:"Canary chick", game:"M1", narr:true, say:"A lost canary chick chirps a short melody, over and over.", yes:"Hum along", run:() => { tr.team.forEach(m => { m.bonus.spd += 1; m.bonus.pp += .05; refresh(m); }); return "The chick flutters off happily. Everyone feels lighter: +1 Speed and +5% Max PP."; }},
  {who:"Alec", game:"M3", narr:true, say:"Lucas's grandpa Alec has packed far too much lunch for one person.", yes:"Take some lunch", run:() => { tr.goods.hamburger = (tr.goods.hamburger || 0) + 1; tr.goods.nutbread = (tr.goods.nutbread || 0) + 2; return "He insists. You got a Hamburger and 2 Nut Bread."; }},
  {who:"Hinawa", game:"M3", narr:true, say:"A warm, familiar light fills the room. Hinawa smiles at you.", yes:"Stay a moment", run:() => { tr.team.forEach(m => { m.ko = false; m.bonus.hp += .03; refresh(m); m.hp = m.shown = m.mhp; m.pp = m.mpp; m.st = {}; }); return "When the light fades, everyone is fully restored and a little stronger (+3% Max HP)."; }},
  {who:"Wess", game:"M3", narr:true, say:"An old man is doing a very strange dance. It's Wess, Duster's dad.", yes:"Learn the dance", run:() => { const m = pickR(tr.team); tr.team.forEach(x => { x.bonus.spd += 2; refresh(x); }); m.bonus.atk += 3; refresh(m); return `"Again! Lift that leg!" Everyone gets +2 Speed, and ${m.h.name} gets +3 Offense.`; }},
  {who:"Aeolia", game:"M3", narr:true, say:"A fabulous Magypsy twirls into the room and offers a makeover.", yes:"Get a makeover", run:() => { tr.team.forEach(m => { m.bonus.pp += .1; refresh(m); m.pp = m.mpp; m.st = {}; }); return "Fabulous! Everyone's PP is full, and Max PP goes up 10%."; }},
  {who:"Leder", game:"M3", narr:true, say:"A very, very tall man stands silently in the corner. He looks like he has a story to tell.", yes:"Listen to his story", run:() => { tr.team.forEach(m => { m.bonus.def += 2; refresh(m); }); return "His long, strange story leaves you feeling steady. +2 Defense for everyone."; }},
  {who:"Bronson", game:"M3", narr:true, say:"Bronson bursts in. He has good news and bad news.", yes:"Hear the news", run:() => { const c = 80 + tr.floor * 8; tr.money += c; aliveH().forEach(m => { m.hp = m.shown = Math.max(1, m.hp - Math.round(m.mhp * .1)); }); return `The bad news: he tripped over everyone (−10% HP). The good news: he found $${c}!`; }},
  {who:"Magic butterfly", game:"M3", narr:true, say:"A glowing butterfly flutters slowly around the room.", yes:"Catch it", run:() => { tr.team.forEach(m => { if (!m.ko) m.pp = m.mpp; }); return "It lands on your hand for a moment. Everyone standing has full PP."; }}
];
// the Mani Mani Statue's deal: a relic now, a curse for the rest of the run
function makeStatue() {
  const left = Object.keys(RELICS).filter(k => !tr.relics.includes(k) && !(RELICS[k].normalOnly && tr.hard));
  const curses = Object.keys(CURSES).filter(k => !tr.curses.includes(k));
  const r = left.length ? pickR(left) : null, c = curses.length ? pickR(curses) : null;
  tr.room.text = r && c ? `The golden statue glows. It offers you the ${RELICS[r].ic} ${RELICS[r].n} (${RELICS[r].d}), but you'll carry ${CURSES[c].ic} ${CURSES[c].n} (${CURSES[c].d}) for the rest of the run.` : "The golden statue is silent. It has nothing left to offer.";
  tr.room.choices = r && c ? [{label:"Accept the deal", fn:() => { tr.relics.push(r); tr.curses.push(c); tr.team.forEach(refresh); return `You got the ${RELICS[r].n}... and the ${CURSES[c].n} curse.`; }}] : [];
}
// Dalaam training: give up HP now for a new move or more power
function makeDojo() {
  const opts = tr.team.flatMap(m => m.h.learn.filter(k => canLearn(m, k)).map(k => [m, k]));
  const cost = m => Math.round(m.mhp * .35);
  tr.room.text = "\"Prince Poo, the time has now come for you to undertake your final trial.\" The masters of Dalaam will train one of your heroes, but the training hurts.";
  tr.room.choices = [];
  if (opts.length) {
    const [m, k] = pickR(opts);
    tr.room.choices.push({label:`${m.h.name} learns ${TMOVES[k].n} (−${cost(m)} HP)`, fn:() => { m.moves.push(k); m.hp = m.shown = Math.max(1, m.hp - cost(m)); return `${m.h.name} endured the training and learned ${TMOVES[k].n}!`; }});
  }
  const t = pickR(aliveH().length ? aliveH() : tr.team);
  tr.room.choices.push({label:`${t.h.name} trains hard: +4 Offense, +2 Defense (−${cost(t)} HP)`, fn:() => { t.bonus.atk += 4; t.bonus.def += 2; refresh(t); t.hp = t.shown = Math.max(1, t.hp - cost(t)); return `${t.h.name} came back stronger.`; }});
}
function roomChoice(i) {
  const c = tr.room.choices && tr.room.choices[i];
  if (!c || tr.room.done) return;
  tr.room.text = c.fn(); tr.room.done = !c.again; sfx("reward");
  drawTower();
}
function makeEvent() {
  const ok = EVENTS.filter(e => !(e.hardSkip && tr.hard) && (!e.can || e.can()) || e.who === "Gerardo");
  const ev = pickR(ok);
  tr.room.ev = ev; tr.room.text = ev.say;
}
function eventYes() {
  const ev = tr.room.ev;
  if (!ev || tr.room.done) return;
  if (ev.can && !ev.can()) { tr.room.text = ev.who === "Gerardo" ? "\"The humanitarian thing is to help people out when they're hungry.\" (You don't have any food.)" : "You can't afford it right now."; }
  else {
    const text = ev.run();
    if (text == null) return;   // the event started a battle
    tr.room.text = text;
  }
  tr.room.done = true; sfx("ok");
  drawTower();
}

// per-hero records for the codex
const heroRec = id => tw.heroes[id] || (tw.heroes[id] = {runs:0, team:0, best:0, clears:0});
// a relic gets a page in the relic book the first time you hold it (checked every time the tower redraws)
function noteRelics() {
  if (!tr || !tr.relics) return;
  let added = false;
  tr.relics.forEach(k => { if (RELICS[k] && !tw.relicBook[k]) { tw.relicBook[k] = {t:Date.now(), fl:Math.min(tr.floor, 999), runs:0, seen:false}; added = true; } });
  if (added) twSave();
}
// reaching the top counts once per run, even if the party keeps climbing in endless mode
function twClear() {
  if (tr.cleared) return;
  tr.cleared = true;
  if (hasMod("training")) return;
  tw.clears++;
  if (!tr.hard && tr.heat >= (tw.heatMax || 0) && tr.heat < HEAT.length - 1) { tw.heatMax = tr.heat + 1; tr.heatUp = true; }
  ringBell();
  twSave();
}
// the Friend bell from Saturn's shop: reaching the top brings a hero you haven't met. It's only used up when it does
function ringBell() {
  if (typeof shop === "undefined" || !shop.bell) return;
  const left = HEROES.filter(h => !tw.found.includes(h.id));
  if (!left.length) return;
  const h = pickR(left, Math.random);
  tw.found.push(h.id);
  shop.bell = false; shopSave();
  tr.bellHero = h.id;
  // they hop straight into the party for the endless climb if there's room (Full squad runs stay closed)
  tr.bellJoined = tr.team.length < 4 && !hasMod("squad");
  if (tr.bellJoined) tr.team.push(newMember(h, 1));
  twLog(`• 🔔 Ring ring! The Friend bell echoes down the tower... ${h.name} comes running! ${h.name} can now be picked as a starting hero${tr.bellJoined ? ", and joins your party right away" : ""}.`, "good");
  if (window.checkAch) checkAch();
}
function goEndless() {
  tr.endless = true;
  twLog("• ♾️ The tower keeps going... Every floor from here gets tougher. How high can you climb?", "good");
  tr.lastRare = true; tr.offers = makeOffers(true); tr.phase = "reward";
  sfx("open"); drawTower();
}
function twEnd(cleared, left) {
  clearInterval(twTimer);
  if (tr.battle) { tr.battle.over = true; if (tr.battle.combo) comboClear(tr.battle.combo); }
  if (cleared) twClear();
  const floors = tr.cleared && !tr.endless ? TW_TOP : tr.floor - (tr.phase === "reward" || tr.phase === "summit" ? 0 : 1);
  twDropRun();
  tr.phase = "over"; tr.result = {cleared:!!tr.cleared, endless:!!tr.endless, left, floors, heatUp:!!tr.heatUp};
  if (floors > tw.best && !hasMod("training")) tw.best = floors;
  if (tr.endless && !hasMod("training")) tw.bestEndless = Math.max(tw.bestEndless || 0, floors);
  if (tr.hard) { const k = todayKey(); tw.hard[k] = Math.max(tw.hard[k] || 0, floors); tw.bestHard = Math.max(tw.bestHard, floors); }
  tr.team.forEach(m => { const r = heroRec(m.h.id); r.team++; r.best = Math.max(r.best, floors); if (tr.cleared) r.clears++; });
  // reaching the top unlocks each party member's Champion skin
  tr.result.champs = tr.cleared && !hasMod("training") ? tr.team.filter(m => !heroRec(m.h.id).top).map(m => { heroRec(m.h.id).top = true; return m.h.name; }) : [];
  // run goals pay out Tower Tokens (training runs don't count)
  let tokens = 0;
  tr.result.goals = (tr.goals || []).map(k => { const ok = !hasMod("training") && !!tr.st && GOALS[k].ok(tr.st, floors); if (ok) tokens += GOALS[k].t; return {k, ok}; });
  tr.result.tokens = tokens; tw.tokens += tokens; tw.tokensAll += tokens;
  // Saturn's shop money (training runs don't pay)
  tr.result.cash = !hasMod("training") && typeof shopTowerCash === "function" ? shopTowerCash(floors, !!tr.cleared, tr.hard || tr.weekly, tr.heat || 0, modCash(tr.mods || [])) : 0;
  if (tr.weekly) { const w = weekKey(); tr.result.weekNew = floors > (tw.weekly[w] || 0); tw.weekly[w] = Math.max(tw.weekly[w] || 0, floors); }
  // per-hero endless bests for the leaderboard (training runs don't count)
  tr.result.endlessNew = [];
  if (tr.endless && !hasMod("training")) tr.team.forEach(m => { const r = heroRec(m.h.id); if (floors > (r.endless || 0)) { r.endless = floors; tr.result.endlessNew.push(m.h.name); } });
  // every relic carried to the end of this climb counts one more climb in the relic book
  noteRelics(); (tr.relics || []).forEach(k => { if (tw.relicBook[k]) tw.relicBook[k].runs++; });
  // run history: the last few climbs, newest first
  tw.history.unshift({t:Date.now(), mode:tr.hard ? "hard" : tr.weekly ? "weekly" : "normal", team:tr.team.map(m => m.h.id), floors, at:tr.floor,
    cleared:!!tr.cleared, endless:!!tr.endless, left:!!left, heat:tr.heat || 0, mods:[...(tr.mods || [])], cash:+String(tr.result.cash || 0).replace(/[^0-9]/g, "") || 0, tokens, training:hasMod("training")});
  tw.history = tw.history.slice(0, TW_HISTORY);
  tw.xpDay = todayKey();
  twSave();
  sfx(tr.cleared ? "reward" : floors ? "win" : "lose");
  drawTower();
  if (window.checkAch) checkAch();
}

// Picky's magical spell. Usually nothing happens.
function chant(m) {
  const r = Math.random();
  twLog(`• ${m.h.name} chanted a magical spell...`);
  if (r < .55) return twLog("• ...but nothing happened.");
  if (r < .7) { aliveF().forEach(x => x.st.cry = 2); return twLog("• The enemies got scared and started crying!", "good"); }
  if (r < .85) { aliveF().forEach(x => x.st.weak = 2); return twLog("• Somehow, the enemies' defense went down!", "good"); }
  aliveH().forEach(x => healOne(x, Math.max(1, Math.round(x.mhp * .1)), "A tiny sparkle."));
}

// ---------- finding new party members ----------
// a hero can only be met in one act, from a set floor on
const findFloor = id => FIND[id][0];
function meetable() {
  const f = tr.floor;
  return Object.keys(FIND).filter(id => HERO[id] && !tw.found.includes(id) && f >= findFloor(id) && actOf(f) === actOf(findFloor(id)));
}
function makeMeet() {
  const opts = meetable();
  if (!opts.length) { tr.room.text = "...whoever it was, they're gone now."; tr.room.choices = []; return; }
  const id = pickR(opts), h = HERO[id];
  tw.found.push(id); twSave();
  tr.room.hero = h;
  tr.room.text = `${FIND[id][2]} You found ${h.name}! From now on, ${h.name} can be picked as a starting hero and can show up as a recruit.`;
  sfx("reward");
  tr.room.choices = tr.team.length < 4 ? [{label:`${h.name} joins now`, fn:() => {
    // no levels in the tower: everyone joins as they are
    tr.team.push(newMember(h, 1));
    return `${h.name} joined your party!`;
  }}] : [];
}

// Apple Kid's inventions: usually a handy battle item, sometimes a small explosion
function invent(m) {
  const r = Math.random();
  if (r < .25) { aliveH().forEach(x => x.hp = Math.max(0, x.hp - Math.max(1, Math.round(x.mhp * .06)))); return twLog(`• ${m.h.name} tried an invention... (Kaboooom!) Everyone got a little singed.`, "bad"); }
  const k = pickR(["bomb", "rocket", "insecticide", "rust", "flyhoney", "thunderbomb"], Math.random);
  tr.goods[k] = (tr.goods[k] || 0) + 1;
  twLog(`• ${m.h.name} invented a ${GOODS[k].n}! It went into the Goods bag.`, "good");
}

// ---------- blessings, rerolls, run goals and the new rooms ----------
function runTrack() {
  const s = tr.st;
  if (!s) return;
  s.maxMoney = Math.max(s.maxMoney, tr.money); s.maxTeam = Math.max(s.maxTeam, tr.team.length);
}
function chooseBless(k) {
  const b = BLESSINGS[k];
  if (!b || tr.phase !== "bless") return;
  b.now(); tr.bless.push(k); tr.blessAt.push(tr.floor); tr.blessOpts = null;
  twLog(`• ${b.ic} ${b.n}: ${b.d}.`, "good");
  sfx("reward");
  tr.phase = "map"; runTrack(); drawTower();
}
function rerollOffers() {
  if (tr.phase !== "reward" || !(tr.rerolls > 0)) return sfx("bad");
  tr.rerolls--; tr.offers = makeOffers(!!tr.lastRare);
  sfx("click"); drawTower();
}
// called the moment a hero collapses: tracks the first faint and the Second wind perk
function twFaint(m) {
  if (!tr.st.firstKO) tr.st.firstKO = tr.floor;
  if (tr.perks && perkLv("secondwind") && !tr.windUsed) {
    tr.windUsed = true;
    m.ko = false; m.hp = m.shown = Math.max(1, Math.round(m.mhp * .25));
    twLog(`• 💫 Second wind! ${m.h.name} got back up!`, "good");
  }
}
// the arcade: up to 3 spins of the slots
function makeArcade() {
  const cost = price(20);
  tr.room.spins = 0;
  tr.room.text = "Lights flash and a slot machine jingles. \"Step right up! Three spins per customer!\"";
  const spin = () => {
    if (tr.money < cost) return "You can't afford another spin.";
    tr.money -= cost; tr.room.spins++;
    const r = tr.rng(), left = Object.keys(RELICS).filter(k => !tr.relics.includes(k) && !(RELICS[k].normalOnly && tr.hard));
    let out;
    if (r < .35) out = "🍋 🍒 🪐 ... no match. Better luck next spin.";
    else if (r < .65) { const c = cost * 2 + tr.floor; tr.money += c; out = `🍒 🍒 🍒! You won $${c}.`; }
    else if (r < .85) { const k = pickR(Object.keys(GOODS)); tr.goods[k] = (tr.goods[k] || 0) + 1; out = `🍔 🍔 🍔! You won a ${GOODS[k].n}.`; }
    else if (r < .95) { tr.team.forEach(m => { m.bonus.atk += 2; refresh(m); }); out = "⭐ ⭐ ⭐! Everyone feels lucky: +2 Offense for the whole party."; }
    else if (left.length) { const k = pickR(left); tr.relics.push(k); out = `🪐 🪐 🪐 JACKPOT! You won the ${RELICS[k].ic} ${RELICS[k].n}! (${RELICS[k].d})`; }
    else { const c = cost * 6; tr.money += c; out = `🪐 🪐 🪐 JACKPOT! You won $${c}!`; }
    runTrack();
    const n = 3 - tr.room.spins;
    if (n <= 0) tr.room.choices = [];
    else tr.room.choices[0].label = `🎰 Spin again ($${cost} · ${n} left)`;
    return out;
  };
  tr.room.choices = [{label:`🎰 Spin ($${cost} · 3 left)`, again:true, fn:spin}];
}
// the library: choose one of up to three moves for your party to learn
function makeLibrary() {
  const opts = mgShuffle(tr.team.flatMap(m => m.h.learn.filter(k => canLearn(m, k)).map(k => [m, k]))).slice(0, 3);
  tr.room.text = "Rows and rows of dusty books. One of them is open to a page about a move you could learn.";
  tr.room.choices = opts.map(([m, k]) => ({label:`📖 ${m.h.name}: ${TMOVES[k].n}`, fn:() => { m.moves.push(k); return `${m.h.name} studied hard and learned ${TMOVES[k].n}!`; }}));
  if (!opts.length) {
    tr.room.text = "Your party already knows everything these books teach.";
    tr.room.choices = [{label:"Read quietly (+10% Max PP for everyone)", fn:() => { tr.team.forEach(m => { m.bonus.pp += .1; refresh(m); }); return "A calm hour of reading. Everyone's Max PP went up 10%."; }}];
  }
}
// the vault: pick one of up to three relics, but the lock takes some HP from everyone
// a golden chest: one random cosmetic for Saturn's shop (or money if you own everything)
function makeChest() {
  const key = (tr.rk || "old") + ":" + tr.floor;
  if (tw.chestKey === key) { tr.room.text = "The golden chest is already open. You emptied it before."; tr.room.choices = []; return; }
  tr.room.text = "A golden chest sits on a little rug, with Mr. Saturn's mark on the lid. It hums softly.";
  tr.room.choices = [{label:"🔓 Open the chest", fn:() => {
    tw.chestKey = key; tr.chests = (tr.chests || 0) + 1; twSave();
    const got = shopTowerChest();
    return got.item ? `Click! Inside: <b>${got.item.n}</b> (${LOOT_KIND[got.item.cat]}). It's yours in Saturn's shop now!`
      : `Click! You already own every cosmetic, so the chest was stuffed with money instead: +${got.cash} for Saturn's shop.`;
  }}];
}
function makeVault() {
  const left = mgShuffle(Object.keys(RELICS).filter(k => !tr.relics.includes(k) && !(RELICS[k].normalOnly && tr.hard))).slice(0, 3);
  tr.room.text = left.length ? "Three old chests sit behind a humming lock. Take one, and the lock will zap everyone for 25% of their Max HP." : "The vault is empty. Someone got here first.";
  tr.room.choices = left.map(k => ({label:`${RELICS[k].ic} ${RELICS[k].n}: ${RELICS[k].d}`, fn:() => {
    tr.relics.push(k);
    tr.team.forEach(m => { if (!m.ko) m.hp = m.shown = Math.max(1, m.hp - Math.round(m.mhp * .25)); });
    return `Zap! Everyone took a jolt... but you got the ${RELICS[k].n}.`;
  }}));
}
// Apple Kid's workshop: tune up one move to the next mastery level, or take a free gadget
function makeWorkshop() {
  const opts = mgShuffle(tr.team.filter(m => !m.ko).flatMap(m => m.moves.filter(k => TMOVES[k] && masteryOf(m, k) < 2).map(k => [m, k]))).slice(0, 3);
  tr.room.text = "\"Oh! Customers! I just finished a new invention!\" Apple Kid wipes off his glasses. He has time to help with one thing.";
  tr.room.choices = opts.map(([m, k]) => {
    const lv = masteryOf(m, k);
    return {label:`🔧 Tune up ${m.h.name}'s ${TMOVES[k].n}: ${"✦".repeat(lv) || "✧"} → ${"✦".repeat(lv + 1)}`, fn:() => {
      m.uses = m.uses || {}; m.uses[k] = Math.max(m.uses[k] || 0, MASTERY[lv + 1]);
      return `Apple Kid tinkered with ${m.h.name}'s technique. ${TMOVES[k].n} is now ${"✦".repeat(lv + 1)}!`;
    }};
  });
  const g = pickR(["rocket", "bomb", "flyhoney", "superbomb"].filter(k => GOODS[k]));
  tr.room.choices.push({label:`🎁 Take his new gadget: ${GOODS[g].ic} ${GOODS[g].n}`, fn:() => { tr.goods[g] = (tr.goods[g] || 0) + 1; return `"It works! Probably!" You got a ${GOODS[g].n}.`; }});
}
// Moonside: three doors, three answers, and nothing is what it seems
function makeMoonside() {
  tr.room.text = "\"Welcome to Moonside.\" The lights flicker in colors that don't exist. A man with no face points at three doors. \"Yes. No. Yes.\"";
  const f = tr.floor, outcomes = [
    () => { const c = 30 + f * 4; tr.money += c; return `A man in a tuxedo hands you $${c}. "No. Yes." He vanishes.`; },
    () => { aliveH().forEach(m => { m.hp = m.shown = Math.min(m.mhp, m.hp + Math.round(m.mhp * .4)); m.pp = Math.min(m.mpp, m.pp + Math.round(m.mpp * .3)); }); return "The room spins and everyone feels... refreshed? +40% HP and +30% PP."; },
    () => { const left = Object.keys(RELICS).filter(k => !tr.relics.includes(k) && !(RELICS[k].normalOnly && tr.hard)); if (!left.length) return "An empty pedestal. \"Yes,\" it says."; const k = pickR(left, Math.random); tr.relics.push(k); tr.team.forEach(refresh); return `On a pedestal: the ${RELICS[k].ic} ${RELICS[k].n}! ${RELICS[k].d}.`; },
    () => { aliveH().forEach(m => { m.hp = m.shown = Math.max(1, m.hp - Math.round(m.mhp * .2)); }); return "An Abstract Art lunges out of the wall! Everyone took a hit (−20% HP) before it melted away."; },
    () => { const l = Math.round(tr.money * .3); tr.money -= l; return `A smiling man shakes your hand... and your wallet is $${l} lighter. "Thank you. No."`; },
    () => { const k = pickR(FOOD, Math.random); tr.goods[k] = (tr.goods[k] || 0) + 1; return `A cup of coffee... no, it's a ${GOODS[k].n}. You keep it anyway.`; },
    () => { const opts = tr.team.filter(m => !m.ko).flatMap(m => m.moves.filter(k => TMOVES[k] && masteryOf(m, k) < 2).map(k => [m, k])); if (!opts.length) return "Nothing happens. That's the strangest part."; const [m, k] = pickR(opts, Math.random), lv = masteryOf(m, k); m.uses = m.uses || {}; m.uses[k] = Math.max(m.uses[k] || 0, MASTERY[lv + 1]); return `${m.h.name} has a strange dream about ${TMOVES[k].n}... and wakes up better at it! ${"✦".repeat(lv + 1)}`; }
  ];
  // the good answers are a bit more common than the bad ones
  const weights = [3, 2, 1, 2, 2, 2, 2];
  const roll = () => { let r = Math.random() * weights.reduce((a, b) => a + b, 0); for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r <= 0) return outcomes[i](); } return outcomes[0](); };
  tr.room.choices = ["🟣 Yes", "🟢 No", "🔵 Yes. No."].map(l => ({label:l, fn:roll}));
}

// ---------- saved runs: the climb is saved at the start of every floor ----------
const TW_RUN_KEY = "earthdoku-tower-run";
// everything in a run is plain data except the dice, the battle, the open room and the upgrade offers
function twSaveRun(entered) {
  if (!tr || tr.phase === "over") return;
  const t = {};
  for (const k in tr) if (!["rng", "battle", "room", "offers", "result"].includes(k)) t[k] = tr[k];
  t.team = tr.team.map(m => ({...m, h:m.h.id}));
  store.set(TW_RUN_KEY, {v:1, day:todayKey(), week:weekKey(), at:Date.now(), entered:entered || null, tr:t});
}
function twDropRun() { store.set(TW_RUN_KEY, null); }
// a Daily Hard save only lasts for its day, and a Weekly save for its week
function twSaved() {
  const s = store.get(TW_RUN_KEY);
  if (!s || s.v !== 1 || !s.tr || !Array.isArray(s.tr.team) || !s.tr.team.some(m => HERO[m.h])) return null;
  if (s.tr.hard && s.day !== todayKey()) return null;
  if (s.tr.weekly && s.week !== weekKey()) return null;
  return s;
}
function twLoadRun() {
  const s = twSaved();
  if (!s) { twDropRun(); return false; }
  const t = s.tr;
  t.team = t.team.filter(m => HERO[m.h]).map(m => ({...m, h:HERO[m.h]}));
  t.rng = t.seed ? mulberry32(hashStr(t.seed + ":" + t.floor + ":" + (s.entered || "map"))) : Math.random;
  t.battle = null; t.room = null; t.offers = null; t.result = null;
  tr = t;
  tr.team.forEach(m => { m.st = {}; m.guard = false; m.cd = m.cd || {}; refresh(m); m.shown = m.hp; });
  if (!tr.doors || !tr.doors.length) tr.doors = makeDoors();
  twUi.goods = false; twUi.useK = null; twUi.tip = null;
  sfx("open");
  if (s.entered && tr.phase === "map") {
    twLog(`• 💾 Welcome back! You left in the middle of floor ${tr.floor}, so you're heading back through the same door.`, "good");
    drawTower(); enterRoom(s.entered);
  } else { twLog(`• 💾 Welcome back to floor ${tr.floor}!`, "good"); drawTower(); }
  return true;
}
function twSaveQuit() {
  if (!tr || !["map", "bless"].includes(tr.phase)) return;
  twSaveRun(); stopRolling(); tr = null; sfx("click"); drawTower();
}
