// ---------- Saturn Valley Tactics: grid battles where where you stand matters ----------
// You lead your own squad (separate from the Tower) across four campaigns of hand-made maps. Each turn every hero
// can move once and act once, then the enemies move. Heroes have classes, level up, and recruit friends as you win.
// Positioning is the point: team up on enemies, shove them into lava, take the high ground, hide in forests.
// Everything lives inside this function, so none of its names can clash with the rest of the game.
(() => {
  const KEY = "earthdoku-tactics";
  const START = ["ninten", "ness", "lucas"].filter(id => HERO[id]);
  const sv = Object.assign({stars:{}, wins:0, roster:[], xp:{}}, store.get(KEY) || {});
  // the first version used the same map names for different maps, so its stars are cleared once
  if (sv.v !== 2) { sv.stars = {}; sv.v = 2; }
  START.forEach(id => { if (!sv.roster.includes(id)) sv.roster.push(id); });
  const save = () => store.set(KEY, sv);

  // ---------- the ground ----------
  // map letters: H hero start, E enemy, B boss, S someone to rescue, R where reinforcements arrive (all grass underneath)
  const TERR = {
    ".":{n:"Grass", cost:1},
    "^":{n:"Forest", cost:2, def:.3, d:"+30% defense. Costs 2 steps to enter."},
    "h":{n:"Hill", cost:2, hill:true, d:"High ground: ranged attacks reach 1 tile further, and every attack from here hits 15% harder. Costs 2 steps."},
    "#":{n:"Rock", block:true, wall:true, d:"Blocks walking, beams and rockets."},
    "~":{n:"Water", block:true, d:"Blocks walking. Beams fly over it."},
    "s":{n:"Hot spring", cost:1, heal:.25, d:"Whoever stands here heals 25% at the start of their turn."},
    "x":{n:"Exit", cost:1, d:"On escape maps, a hero who steps here gets away safely."},
    "p":{n:"Present box", cost:1, d:"Step on it to open it."},
    "l":{n:"Lava", cost:1, lava:.15, d:"Burns whoever stands here for 15% at the start of their turn. Shove enemies in!"},
    "t":{n:"Moonside warp", cost:1, d:"Step on it and you're sent to its twin. Shoved enemies warp too."}
  };
  const TILE_CLS = {".":"g", "^":"f", "h":"hl", "#":"r", "~":"w", "s":"sp", "x":"ex", "p":"pr", "l":"lv", "t":"tp"};

  // ---------- what each map asks of you ----------
  const OBJ = {
    rout:{ic:"⚔️", n:"Rout", d:() => "Defeat every enemy."},
    boss:{ic:"👑", n:"Topple the boss", d:() => "Defeat the boss. The others don't matter."},
    survive:{ic:"⏳", n:"Hold out", d:m => `Survive ${m.turns} turns. More enemies keep arriving.`},
    escape:{ic:"🚪", n:"Escape", d:() => "Get every hero onto an exit tile."},
    rescue:{ic:"🆘", n:"Rescue", d:m => `Reach ${HERO[m.npc] ? HERO[m.npc].name : "them"} before the enemies take them down.`}
  };

  // ---------- your squad's classes, picked from each hero's strengths ----------
  const CLASS = {
    medic:{ic:"💚", n:"Medic", pas:"Heals 25% more.",
      skill:{k:"triage", ic:"⛑️", n:"Triage", self:true, pp:8, d:"Heals every friend within 2 tiles (and yourself) by 20%."}},
    psychic:{ic:"🔮", n:"Psychic", pas:"PSI reaches 1 tile further.",
      skill:{k:"burst", ic:"💥", n:"PSI Burst", range:3, psi:true, pp:7, pow:1.05, splash:true, d:"PSI that also hits every enemy next to the target."}},
    vanguard:{ic:"🛡️", n:"Vanguard", pas:"Friends standing next to them take 20% less damage.",
      skill:{k:"taunt", ic:"📣", n:"Taunt", self:true, cd:3, d:"Every enemy within 3 tiles has to come after this hero next turn."}},
    striker:{ic:"⚔️", n:"Striker", pas:"+30% damage to enemies below half HP.",
      skill:{k:"charge", ic:"🐗", n:"Charge", charge:3, pow:1.5, cd:2, d:"Rush up to 3 tiles in a straight line and slam the first enemy in the way."}},
    scout:{ic:"💨", n:"Scout", pas:"+1 move, and forests and hills only cost 1 step.",
      skill:{k:"hitrun", ic:"🏃", n:"Hit and run", range:1, pow:1, cd:2, d:"Hit an enemy next to you, then you can move again."}}
  };
  const SKILL_LV = 3, MOVE_LV = 6, MAX_LV = 10;

  // ---------- how each kind of enemy fights ----------
  const AI = {
    melee:{ic:"👊", n:"Brawler", mv:3, d:"Walks up and hits. Moves 3."},
    swift:{ic:"💨", n:"Fast", mv:4, d:"Quick on its feet. Moves 4."},
    beam:{ic:"⚡", n:"Beam", mv:2, line:3, d:"Fires a beam in a straight line up to 3 tiles (4 from a hill). Rocks block it. Moves 2."},
    root:{ic:"🌱", n:"Rooted", mv:0, d:"Never moves. Hits and poisons anyone next to it."},
    phase:{ic:"👻", n:"Ghost", mv:3, d:"Floats over rocks and water. Moves 3."},
    bomb:{ic:"💣", n:"Bomb", mv:3, d:"Walks up to you, then blows up on its next turn, hitting everyone next to it. Shove it away or take it out first!"},
    warp:{ic:"🌀", n:"Warper", mv:3, d:"Teleports next to the most hurt hero within 6 tiles and hits."},
    boss:{ic:"👑", n:"Boss", mv:3, d:"Hits very hard. Every other turn it slams everyone within 2 tiles."}
  };
  const aiOf = (e, boss) => {
    if (boss) return "boss";
    const k = e.kinds || [];
    if (k.includes("Machine") || k.includes("Alien")) return "beam";
    if (k.includes("Plant")) return "root";
    if (k.includes("Ghost")) return "phase";
    if (k.includes("Object")) return "bomb";
    if (k.includes("Weird")) return "warp";
    if (k.includes("Animal") || k.includes("Bug")) return "swift";
    return "melee";
  };

  // ---------- the maps ----------
  const MAPS = [
    // Eagleland
    {id:"eb1", g:"EB", n:"Onett Hilltop", lv:0, tier:10, par:6, obj:"rout", recruit:"king", rows:[
      ".........", ".H...^..E", "....##.h.", ".H..p...E", "....##...", ".H...^..E", "........."]},
    {id:"eb2", g:"EB", n:"Peaceful Rest Valley", lv:1, tier:22, par:6, obj:"escape", recruit:"paula", rows:[
      "^^...~~..x", "H..^.~~...", "H....E..^x", "H..^...E..", "...p..^...", "^^...~~.Ex", "^^...~~..."]},
    {id:"eb3", g:"EB", n:"Happy Happy Village", lv:1, tier:28, par:7, obj:"rout", recruit:"jeff", rows:[
      "..##..##.", ".H##..##E", ".H...p...", ".....^..E", ".H##..##.", "..##..##E", "........."]},
    {id:"eb4", g:"EB", n:"Saturn Valley", lv:2, tier:36, par:5, obj:"rescue", npc:"mrsaturn", recruit:"mrsaturn", rows:[
      "^...#...^", ".H..s..E.", ".H...#...", "...h..SE.", ".H...#...", "....s..E.", "^...#...^"]},
    {id:"eb5", g:"EB", n:"Fire Spring", lv:3, tier:45, par:8, obj:"boss", recruit:"poo", rows:[
      "##l...l##", ".H..l..E.", ".H.....l.", "..l.h..B.", ".H.....l.", "...l...E.", "##l...l##"]},
    // Mother
    {id:"m11", g:"M1", n:"Podunk Fields", lv:1, tier:20, par:6, obj:"rout", recruit:"mick", rows:[
      ".........", ".H..^^.E.", "....h....", ".H.~~~..E", "....p....", ".H..^^.E.", "........."]},
    {id:"m12", g:"M1", n:"Merrysville", lv:2, tier:32, par:4, obj:"survive", turns:5, recruit:"lloyd", rows:[
      "R...#...R", ".^.....^.", "...H.H...", "#..s.p..#", "...H.....", ".^..E..^.", "R...#..ER"]},
    {id:"m13", g:"M1", n:"Duncan's Factory", lv:3, tier:44, par:8, obj:"rout", recruit:"ana", rows:[
      "#.#.#.#.#", ".H.....E.", ".H.##....", "...##.pE.", ".H.....E.", "#.#.#.#.#", "...h....."]},
    {id:"m14", g:"M1", n:"Ellay Live House", lv:3, tier:50, par:6, obj:"escape", recruit:"teddy", rows:[
      "x..#..#..H", "...#..#...", "x...E....H", "..^...h...", "x...E....H", "...#..#.E.", "...#..#..."]},
    {id:"m15", g:"M1", n:"Mt. Itoi", lv:4, tier:58, par:9, obj:"boss", recruit:"flyingman", rows:[
      "^^..#..^^", ".H..#..E.", ".H..^..h.", "...^^^.B.", ".H..^....", "....#.pE.", "^^..#..^^"]},
    // the Nowhere Islands
    {id:"m31", g:"M3", n:"Sunshine Forest", lv:2, tier:34, par:7, obj:"rout", recruit:"boney", rows:[
      "^^^...^^^", ".H.^...E.", ".H...^..p", "..^...^.E", ".H...^...", ".^...^.E.", "^^^...^^^"]},
    {id:"m32", g:"M3", n:"Drago Plateau", lv:3, tier:46, par:7, obj:"boss", recruit:"duster", rows:[
      "....##...", ".H...#.E.", ".H...h...", "..##...B.", ".H...#...", ".....#.E.", "..p.##..."]},
    {id:"m33", g:"M3", n:"Osohe Castle", lv:4, tier:54, par:6, obj:"rescue", npc:"kumatora", recruit:"kumatora", rows:[
      "#########", "#H..#..E#", "#H.....S#", "#...~~.E#", "#H..p..E#", "#...#...#", "#########"]},
    {id:"m34", g:"M3", n:"Tanetane Island", lv:5, tier:60, par:5, obj:"survive", turns:6, recruit:"salsa", rows:[
      "R.^..~..R", "..^.....^", "..H.s.H..", "~...p...~", "..H......", "^..E...E.", "R...~..^R"]},
    {id:"m35", g:"M3", n:"Chimera Laboratory", lv:5, tier:66, par:9, obj:"boss", recruit:"flint", rows:[
      "#.#######", "H.#..t..E", "H...##..#", "H.l..B..t", "#...##...", "#..p..E.#", "#########"]},
    // Moonside: opens once all three bosses are beaten
    {id:"mo1", g:"MO", n:"Moonside Streets", lv:6, tier:70, par:7, obj:"rout", recruit:"cat", rows:[
      "t...#...t", ".H..#..E.", ".H.....E.", "...#.#...", ".H.....E.", "t..p#..Et", "....#...."]},
    {id:"mo2", g:"MO", n:"Monotoli Building", lv:7, tier:76, par:6, obj:"escape", recruit:"applekid", rows:[
      "x.#..t#..H", "..#...#...", "x....E...H", "..t.h..E..", "x....E...H", "..#...#...", "..#..p#..."]},
    {id:"mo3", g:"MO", n:"Topolla Theater", lv:7, tier:80, par:6, obj:"survive", turns:6, recruit:"everdred", rows:[
      "R..t.t..R", ".^.....^.", "..H.s.H..", "#..p.p..#", "..H......", ".^.E.E.^.", "R.......R"]},
    {id:"mo4", g:"MO", n:"Moonside Depths", lv:8, tier:88, par:10, obj:"boss", recruit:"venus", rows:[
      "t#.....#t", ".H..#..E.", ".H..l..E.", "..h.#.B..", ".H..l..E.", ".......p.", "t#.....#t"]}
  ];
  const CAMPS = [["EB", "Eagleland"], ["M1", "Podunk and Magicant"], ["M3", "The Nowhere Islands"], ["MO", "Moonside"]];
  const BOSS_MAPS = ["eb5", "m15", "m35"];
  const moonOpen = () => BOSS_MAPS.every(id => (sv.stars[id] || 0) > 0);
  const mapById = id => MAPS.find(m => m.id === id);
  const open = m => {
    if (m.g === "MO" && !moonOpen()) return false;
    const camp = MAPS.filter(x => x.g === m.g), i = camp.indexOf(m);
    return i === 0 || (sv.stars[camp[i - 1].id] || 0) > 0;
  };
  // Moonside mixes enemies from every game
  const gameOf = m => m.g === "MO" ? null : m.g;

  // ---------- small helpers ----------
  const pct = (e, s) => { const v = percentile(e, s); return v == null ? 50 : v; };
  const epow = e => (pct(e, "hp") + pct(e, "off") + pct(e, "def")) / 3;
  const md = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const fam = n => n.replace(/ [αβγΣΩ]$/, "");
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  // ---------- the squad: classes and levels ----------
  const knows = h => [...h.start, ...h.learn].map(k => TMOVES[k]).filter(Boolean);
  function classOf(h) {
    const ks = knows(h), r = h.r;
    if (r[1] > 0 && ks.some(m => m.kind === "heal" || m.kind === "healall")) return "medic";
    if (r[1] >= 7) return "psychic";
    const tank = (r[0] + r[3]) / 2;
    return r[2] >= tank && r[2] >= r[4] ? "striker" : r[4] > tank ? "scout" : "vanguard";
  }
  const xpOf = id => sv.xp[id] || 0;
  const lvOf = id => Math.min(MAX_LV, 1 + Math.floor(Math.sqrt(xpOf(id) / 12)));
  const xpFor = lv => 12 * (lv - 1) * (lv - 1);
  function heroStats(h) {
    const L = lvOf(h.id), c = classOf(h), r = h.r;
    return {lv:L, cls:c,
      mhp:Math.round((24 + r[0] * 5) * (1 + .06 * (L - 1))), atk:(5 + r[2] * 1.1) * (1 + .05 * (L - 1)), def:(1 + r[3] * .6) * (1 + .04 * (L - 1)),
      mv:3 + (r[4] >= 7 ? 1 : 0) + (c === "scout" ? 1 : 0) + (L >= MOVE_LV ? 1 : 0), mpp:Math.round(r[1] * 4 * (1 + .05 * (L - 1)))};
  }
  function heroAbils(h) {
    const ks = knows(h), st = heroStats(h), out = [{k:"bash", ic:"👊", n:"Bash", range:1, pow:1, d:"Hit an enemy next to you."}];
    const psi = ks.find(m => m.kind === "psi"), heal = ks.find(m => m.kind === "heal" || m.kind === "healall");
    const rocket = ks.find(m => m.kind === "hit" && m.cd && /rocket|bomb/i.test(m.n));
    if (psi && h.r[1] > 0) out.push({k:"psi", ic:"✨", n:fam(psi.n), range:3, psi:true, pow:1.35, pp:4, d:"PSI at an enemy up to 3 tiles away."});
    if (rocket) out.push({k:"rocket", ic:"🎆", n:rocket.n, line:4, pow:1.9, cd:2, d:"Fires in a straight line up to 4 tiles. Rocks block it. Reloads for a turn."});
    if (heal && h.r[1] > 0) out.push({k:"heal", ic:"💚", n:fam(heal.n), range:2, ally:true, pp:5, d:"Heals a friend within 2 tiles by 35% and cures poison."});
    out.push({k:"shove", ic:"✋", n:"Shove", range:1, d:"Push an enemy next to you 1 tile away. If something's in the way it takes bump damage. Lava burns and warps send it flying."});
    if (st.lv >= SKILL_LV) out.push({...CLASS[st.cls].skill, cls:true});
    out.push({k:"guard", ic:"🛡️", n:"Guard", self:true, d:"Take half damage until your next turn."});
    return out;
  }

  // ---------- units ----------
  let uid = 0;
  function makeHero(h, x, y) {
    const s = heroStats(h);
    return {id:++uid, side:"h", h, name:h.name, x, y, hp:s.mhp, mhp:s.mhp, atk:s.atk, def:s.def, mv:s.mv, pp:s.mpp, mpp:s.mpp,
      lv:s.lv, cls:s.cls, abil:heroAbils(h), cd:{}, kills:0};
  }
  function makeFoe(e, x, y, map, boss, elite) {
    const L = 1 + map.lv * .2, ai = aiOf(e, boss);
    const mhp = Math.round((14 + pct(e, "hp") * .3) * L * (boss ? 3.2 : 1) * (elite ? 1.5 : 1));
    return {id:++uid, side:"e", e, name:e.name, x, y, hp:mhp, mhp, atk:(5 + pct(e, "off") * .09) * L * (boss ? 1.25 : 1) * (elite ? 1.15 : 1),
      def:(1 + pct(e, "def") * .06) * L, ai, mv:AI[ai].mv, boss, elite, turns:0};
  }
  // each map always starts with the same enemies, picked near its difficulty
  function foePool(map, boss) {
    const g = gameOf(map);
    return ALL.filter(e => (!g || e.game === g) && !!e.boss === !!boss && spriteUrl(e)).sort((a, b) => Math.abs(epow(a) - map.tier) - Math.abs(epow(b) - map.tier)).slice(0, boss ? 3 : 14);
  }
  function pickFoes(map, n, boss, rng) { const near = foePool(map, boss); return Array.from({length:n}, () => near[Math.floor(rng() * near.length)]); }

  // ---------- the battle ----------
  let st = null;
  const ui = {view:"menu", map:null, pick:[], sel:null, ab:null, hover:null, hoverTile:null, danger:false};
  const up = u => u.hp > 0 && !u.escaped;
  const alive = side => st.units.filter(u => u.side === side && up(u));
  const unitAt = (x, y) => st.units.find(u => up(u) && u.x === x && u.y === y);
  const inside = (x, y) => x >= 0 && y >= 0 && x < st.W && y < st.H;
  const tile = (x, y) => inside(x, y) ? st.grid[y][x] : "#";
  const T = (x, y) => TERR[tile(x, y)];
  const log = (t, cls = "") => { st.log.push({t, cls}); st.log = st.log.slice(-40); };
  const unitBy = id => st && st.units.find(u => u.id === id);

  function startMap(id) {
    const map = mapById(id), heroes = ui.pick.map(k => HERO[k]).filter(Boolean), rng = mulberry32(hashStr("tactics2-" + map.id));
    st = {map, W:map.rows[0].length, H:map.rows.length, grid:[], units:[], turn:1, phase:"player", log:[], over:null, lost:0, kills:0, rein:[], tele:[]};
    const at = {H:[], E:[], B:[], S:[]};
    map.rows.forEach((row, y) => st.grid.push(row.split("").map((c, x) => {
      if (at[c]) at[c].push([x, y]);
      if (c === "R") st.rein.push([x, y]);
      if (c === "t") st.tele.push([x, y]);
      return "HEBSR".includes(c) ? "." : c;
    })));
    heroes.slice(0, at.H.length).forEach((h, i) => st.units.push(makeHero(h, ...at.H[i])));
    pickFoes(map, at.E.length, false, rng).forEach((e, i) => st.units.push(makeFoe(e, ...at.E[i], map, false, map.lv >= 3 && rng() < .25)));
    if (at.B.length) pickFoes(map, 1, true, rng).forEach(e => st.units.push(makeFoe(e, ...at.B[0], map, true, false)));
    if (at.S.length && HERO[map.npc]) { const h = HERO[map.npc], hp = Math.round(30 * (1 + map.lv * .2)); st.units.push({id:++uid, side:"n", h, name:h.name, x:at.S[0][0], y:at.S[0][1], hp, mhp:hp, atk:0, def:2 + map.lv, mv:0}); }
    ui.view = "battle"; ui.sel = ui.ab = ui.hover = ui.hoverTile = null;
    log(`${OBJ[map.obj].ic} ${map.n}: ${OBJ[map.obj].d(map)}`, "good");
    sfx("open");
    draw();
  }

  // ---------- moving ----------
  // where a unit can walk this turn: forest and hills cost 2 (1 for scouts), ghosts float over anything,
  // friends can be passed but not stood on
  function reach(u) {
    const best = {[u.x + "," + u.y]:0}, q = [[u.x, u.y, 0]], out = [], ghost = u.ai === "phase", light = u.cls === "scout";
    while (q.length) {
      q.sort((a, b) => a[2] - b[2]);
      const [x, y, c] = q.shift();
      DIRS.forEach(([dx, dy]) => {
        const nx = x + dx, ny = y + dy;
        if (!inside(nx, ny)) return;
        const t = T(nx, ny);
        if (t.block && !ghost) return;
        const o = unitAt(nx, ny);
        if (o && (u.side === "e" ? o.side !== "e" : o.side === "e")) return;
        const nc = c + (ghost || light ? 1 : t.block ? 1 : t.cost);
        const k = nx + "," + ny;
        if (nc > u.mv || (best[k] != null && best[k] <= nc)) return;
        best[k] = nc; q.push([nx, ny, nc]);
      });
    }
    Object.keys(best).forEach(k => {
      const [x, y] = k.split(",").map(Number), o = unitAt(x, y);
      if (!T(x, y).block && (!o || o === u)) out.push({x, y, c:best[k]});
    });
    return out;
  }
  // what happens when a unit arrives somewhere: warps, presents, exits, finding the one you came to rescue
  function land(u, shoved) {
    const c = tile(u.x, u.y);
    if (c === "t" && st.tele.length > 1) {
      const i = st.tele.findIndex(([x, y]) => x === u.x && y === u.y), [tx, ty] = st.tele[i ^ 1] || [];
      if (tx != null && !unitAt(tx, ty)) { u.x = tx; u.y = ty; log(`🌀 ${u.name} warped across Moonside!`); }
    }
    if (shoved && tile(u.x, u.y) === "l") { const d = Math.max(2, Math.round(u.mhp * .2)); u.hp = Math.max(0, u.hp - d); log(`🔥 ${u.name} was shoved into the lava! ${d} damage!${u.hp <= 0 ? ` ${u.name} was defeated!` : ""}`, "good"); flash(u); }
    if (u.side !== "h" || !up(u)) return;
    if (tile(u.x, u.y) === "p") openPresent(u);
    if (tile(u.x, u.y) === "x" && st.map.obj === "escape") { u.escaped = true; log(`🚪 ${u.name} escaped!`, "good"); sfx("ok"); }
    const npc = st.units.find(n => n.side === "n" && up(n));
    if (npc && !st.rescued && md(u, npc) === 1) { st.rescued = true; log(`🆘 ${u.name} reached ${npc.name}! Rescued!`, "good"); }
  }
  function openPresent(u) {
    st.grid[u.y][u.x] = ".";
    const r = Math.random();
    if (r < .3) { const a = Math.round(u.mhp * .4); u.hp = Math.min(u.mhp, u.hp + a); log(`🎁 A Hamburger! ${u.name} recovered ${a} HP.`, "good"); }
    else if (r < .5 && u.mpp) { u.pp = u.mpp; log(`🎁 A Magic Truffle! ${u.name}'s PP is full.`, "good"); }
    else if (r < .8) { u.buff = true; log(`🎁 A Bottle of Power! ${u.name} hits 25% harder for the rest of this battle.`, "good"); }
    else { alive("h").forEach(x => x.hp = Math.min(x.mhp, x.hp + Math.round(x.mhp * .15))); log(`🎁 Cookies for everyone! The whole squad recovered 15% HP.`, "good"); }
    sfx("reward");
  }

  // ---------- reaching enemies ----------
  // straight lines only, and rocks in between block the shot
  function lineClear(a, b, len) {
    if (a.x !== b.x && a.y !== b.y) return false;
    const d = md(a, b);
    if (d < 1 || d > len) return false;
    const sx = Math.sign(b.x - a.x), sy = Math.sign(b.y - a.y);
    for (let i = 1; i < d; i++) if (T(a.x + sx * i, a.y + sy * i).wall) return false;
    return true;
  }
  const onHill = u => !!T(u.x, u.y).hill;
  const rangeOf = (u, ab) => (ab.range || ab.line || 0) + (ab.psi && u.cls === "psychic" ? 1 : 0) + ((ab.psi || ab.line) && onHill(u) ? 1 : 0);
  // a charge goes straight until it meets an enemy; returns the enemy and where the charger stops
  function chargeHits(u, ab) {
    const out = [];
    DIRS.forEach(([dx, dy]) => {
      for (let i = 1; i <= ab.charge + 1; i++) {
        const x = u.x + dx * i, y = u.y + dy * i;
        if (!inside(x, y) || T(x, y).block) break;
        const v = unitAt(x, y);
        if (v) { if (v.side === "e") out.push({t:v, x:u.x + dx * (i - 1), y:u.y + dy * (i - 1)}); break; }
      }
    });
    return out;
  }
  function targets(u, ab) {
    if (ab.pp && u.pp < ab.pp) return [];
    if (ab.cd && u.cd[ab.k] > 0) return [];
    if (ab.self) return [u];
    if (ab.charge) return chargeHits(u, ab).map(c => c.t);
    if (ab.ally) return alive("h").filter(t => md(u, t) <= rangeOf(u, ab));
    const R = rangeOf(u, ab);
    return alive("e").filter(t => ab.line ? lineClear(u, t, R) : md(u, t) >= 1 && md(u, t) <= R);
  }

  // ---------- damage ----------
  const adjTo = (t, f) => st.units.filter(v => up(v) && v !== t && md(v, t) === 1 && f(v));
  function dmg(att, tgt, pow) {
    let a = att.atk * pow * (onHill(att) ? 1.15 : 1) * (att.buff ? 1.25 : 1), team = false;
    if (att.side === "h") {
      // team-up: a friend already next to the target makes every hit land harder
      if (adjTo(tgt, v => v.side === "h" && v !== att).length) { a *= 1.25; team = true; }
      if (att.cls === "striker" && tgt.hp < tgt.mhp / 2) a *= 1.3;
    }
    const def = tgt.def * (1 + (T(tgt.x, tgt.y).def || 0));
    let d = Math.max(1, Math.round((a - def * .5) * rnd(.85, 1.15)));
    if (tgt.guard) d = Math.ceil(d / 2);
    if (tgt.side !== "e" && adjTo(tgt, v => v.side === "h" && v.cls === "vanguard").length) d = Math.max(1, Math.round(d * .8));
    return {d, team};
  }
  function hit(att, tgt, pow, what) {
    const {d, team} = dmg(att, tgt, pow);
    tgt.hp = Math.max(0, tgt.hp - d);
    const dead = tgt.hp <= 0;
    log(`${what}${team ? " 🤝 Team-up!" : ""} ${d} damage to ${tgt.name}!${dead ? ` ${tgt.name} ${tgt.side === "e" ? "was defeated" : "collapsed"}!` : ""}`, att.side === "h" ? "" : "bad");
    if (dead) killed(tgt, att);
    flash(tgt);
  }
  function killed(t, by) {
    if (t.side === "e") { st.kills++; if (by && by.side === "h") by.kills++; }
    else if (t.side === "h") st.lost++;
  }
  function flash(u) { u.flash = Date.now(); }

  // ---------- shoving ----------
  function shove(u, t) {
    const dx = Math.sign(t.x - u.x), dy = Math.sign(t.y - u.y), nx = t.x + dx, ny = t.y + dy;
    const blocker = inside(nx, ny) ? unitAt(nx, ny) : null;
    // bosses are too heavy to move: they just take the bump
    if (!t.boss && inside(nx, ny) && !T(nx, ny).block && !blocker) {
      t.x = nx; t.y = ny;
      log(`✋ ${u.name} shoved ${t.name}!`);
      land(t, true);
      if (t.hp <= 0) killed(t, u);
    } else {
      const d = Math.max(2, Math.round(t.mhp * .12));
      t.hp = Math.max(0, t.hp - d);
      log(`✋ ${u.name} shoved ${t.name} into ${blocker ? blocker.name : inside(nx, ny) ? `the ${T(nx, ny).n.toLowerCase()}` : "the wall"}! ${d} bump damage!${t.hp <= 0 ? ` ${t.name} was defeated!` : ""}`, "good");
      if (t.hp <= 0) killed(t, u);
      if (blocker && blocker.side === "e") { const b = Math.ceil(d / 2); blocker.hp = Math.max(0, blocker.hp - b); log(`💥 ${blocker.name} took ${b} damage too!`, "good"); if (blocker.hp <= 0) killed(blocker, u); flash(blocker); }
    }
    flash(t); sfx("smash");
  }

  // ---------- your actions ----------
  const healAmt = (u, t, p) => Math.round(t.mhp * p * (u.cls === "medic" ? 1.25 : 1));
  function heroAct(u, ab, t) {
    if (ab.pp) u.pp -= ab.pp;
    if (ab.cd) u.cd[ab.k] = ab.cd;
    const k = ab.k;
    if (k === "guard") { u.guard = true; log(`🛡️ ${u.name} is on guard.`); }
    else if (k === "heal") { const a = healAmt(u, t, .35); t.hp = Math.min(t.mhp, t.hp + a); t.poison = false; log(`💚 ${u.name} used ${ab.n}! ${t.name} recovered ${a} HP.`, "good"); sfx("ok"); }
    else if (k === "triage") { alive("h").filter(x => md(u, x) <= 2).forEach(x => { x.hp = Math.min(x.mhp, x.hp + healAmt(u, x, .2)); x.poison = false; }); log(`⛑️ ${u.name} patched up everyone nearby!`, "good"); sfx("ok"); }
    else if (k === "taunt") { const near = alive("e").filter(f => md(u, f) <= 3); near.forEach(f => f.taunt = u.id); log(`📣 ${u.name} taunted ${near.length ? near.map(f => f.name).join(", ") : "nobody"}!`, "good"); }
    else if (k === "shove") shove(u, t);
    else if (k === "charge") {
      const c = chargeHits(u, ab).find(x => x.t === t);
      if (c) { u.x = c.x; u.y = c.y; land(u); }
      hit(u, t, ab.pow, `🐗 ${u.name} charged!`); sfx("smash");
    } else if (k === "burst") {
      const near = alive("e").filter(f => f !== t && md(f, t) === 1);
      hit(u, t, ab.pow, `💥 ${u.name} used PSI Burst!`);
      near.forEach(f => hit(u, f, ab.pow * .7, "The blast spread:"));
      sfx("smash");
    } else {
      hit(u, t, ab.pow, `${ab.ic} ${u.name} used ${ab.n}!`);
      sfx(k === "bash" || k === "hitrun" ? "click" : "smash");
    }
    u.acted = true;
    // hit and run leaves a move for afterwards
    if (k === "hitrun") { u.moved = false; u.from = null; ui.ab = null; log(`🏃 ${u.name} can still move.`); }
    else { u.moved = true; u.from = null; ui.sel = ui.ab = null; }
    afterHeroAction();
  }
  const done = u => u.acted && u.moved;
  function afterHeroAction() {
    if (checkEnd()) return;
    if (alive("h").every(done)) { draw(); return setTimeout(endTurn, 450); }
    draw();
  }

  // ---------- the enemy turn ----------
  function tickGround(side) {
    st.units.filter(u => up(u) && (side === "h" ? u.side !== "e" : u.side === "e")).forEach(u => {
      const t = T(u.x, u.y);
      if (t.heal) { const a = Math.round(u.mhp * t.heal); u.hp = Math.min(u.mhp, u.hp + a); log(`♨️ ${u.name} soaked in the hot spring (+${a} HP).`, u.side === "e" ? "" : "good"); }
      if (t.lava) {
        const d = Math.max(1, Math.round(u.mhp * t.lava));
        u.hp = u.side === "e" ? Math.max(0, u.hp - d) : Math.max(1, u.hp - d);
        log(`🔥 The lava burned ${u.name} for ${d}!${u.hp <= 0 ? ` ${u.name} was defeated!` : ""}`, u.side === "e" ? "good" : "bad");
        if (u.hp <= 0) killed(u);
      }
    });
  }
  function reinforce() {
    if (st.map.obj !== "survive" || st.turn % 2 || !st.rein.length) return;
    const free = st.rein.filter(([x, y]) => !unitAt(x, y)), pool = foePool(st.map, false);
    free.sort(() => Math.random() - .5).slice(0, 2).forEach(([x, y]) => {
      const f = makeFoe(pool[Math.floor(Math.random() * pool.length)], x, y, st.map, false, Math.random() < .15);
      st.units.push(f); log(`📯 ${f.name} arrived as reinforcements!`, "bad");
    });
  }
  function endTurn() {
    if (!st || st.phase !== "player" || st.over) return;
    st.phase = "enemy"; ui.sel = ui.ab = null;
    log(`— Enemy turn —`);
    tickGround("e");
    if (checkEnd()) return;
    reinforce();
    draw();
    const foes = alive("e");
    let i = 0;
    const next = () => {
      if (!st || st.over) return;
      if (i >= foes.length) return startPlayerTurn();
      const f = foes[i++];
      if (up(f)) foeTurn(f);
      draw();
      if (checkEnd()) return;
      setTimeout(next, 420);
    };
    setTimeout(next, 350);
  }
  const preyOf = f => {
    const prey = st.units.filter(u => up(u) && u.side !== "e");
    const t = f.taunt && prey.find(u => u.id === f.taunt);
    return t ? [t] : prey;
  };
  function foeCanHit(f, from, h) { return f.ai === "beam" ? lineClear(from, h, AI.beam.line + (T(from.x, from.y).hill ? 1 : 0)) : md(from, h) === 1; }
  function moveFoe(f, s) { if (s && (s.x !== f.x || s.y !== f.y)) { f.x = s.x; f.y = s.y; land(f); } }
  function foeTurn(f) {
    f.turns++;
    const prey = preyOf(f);
    f.taunt = null;
    if (!prey.length) return;
    // bombs: light the fuse next to you, then go off on the following turn
    if (f.ai === "bomb") {
      if (st.units.some(u => up(u) && u.side !== "e" && md(u, f) === 1)) {
        log(`💣 ${f.name} exploded!`, "bad"); sfx("smash");
        st.units.filter(u => up(u) && u !== f && md(u, f) === 1).forEach(u => hit(f, u, 1.6, "The blast hit"));
        f.hp = 0; return;
      }
      walkToward(f, prey);
      if (prey.some(u => md(u, f) === 1)) { f.lit = true; log(`💣 ${f.name}'s fuse is lit! Get away or take it out!`, "bad"); }
      return;
    }
    // warpers pop up next to whoever is most hurt
    if (f.ai === "warp") {
      const v = prey.filter(u => md(u, f) <= 6).sort((a, b) => a.hp / a.mhp - b.hp / b.mhp)[0];
      const spot = v && DIRS.map(([dx, dy]) => ({x:v.x + dx, y:v.y + dy})).find(p => inside(p.x, p.y) && !T(p.x, p.y).block && !unitAt(p.x, p.y));
      if (spot) { f.x = spot.x; f.y = spot.y; log(`🌀 ${f.name} warped next to ${v.name}!`, "bad"); return attack(f, v); }
    }
    const spots = f.ai === "root" ? [{x:f.x, y:f.y, c:0}] : reach(f);
    let best = null;
    spots.forEach(s => prey.forEach(h => {
      if (!foeCanHit(f, s, h)) return;
      const score = 100 - h.hp / h.mhp * 60 + (h.side === "n" ? 25 : 0) + (T(s.x, s.y).def || T(s.x, s.y).hill ? 5 : 0) - (T(s.x, s.y).lava ? 40 : 0) - s.c * .5;
      if (!best || score > best.score) best = {s, h, score};
    }));
    if (best) moveFoe(f, best.s);
    else if (f.ai !== "root") walkToward(f, prey);
    // bosses slam everyone close by every other turn
    if (f.ai === "boss" && f.turns % 2 === 0) {
      const near = st.units.filter(u => up(u) && u.side !== "e" && md(u, f) <= 2);
      if (near.length) { log(`👑 ${f.name} slammed the ground!`, "bad"); near.forEach(u => hit(f, u, .85, "The shockwave hit")); sfx("smash"); return; }
    }
    const h = best && up(best.h) && foeCanHit(f, f, best.h) ? best.h : prey.find(x => up(x) && foeCanHit(f, f, x));
    if (h) attack(f, h);
  }
  function attack(f, h) {
    hit(f, h, f.ai === "boss" ? 1.25 : f.ai === "beam" ? .9 : 1, f.ai === "beam" ? `⚡ ${f.name} fired a beam!` : `${f.boss ? "👑" : "👾"} ${f.name} attacked ${h.name}!`);
    if (f.ai === "root" && up(h) && !h.poison) { h.poison = true; log(`☠️ ${h.name} got poisoned!`, "bad"); }
    sfx("bad");
  }
  // nothing in range: walk toward the nearest target, avoiding lava
  function walkToward(f, prey) {
    const far = field(f, prey), spots = reach(f);
    const s = spots.slice().sort((a, b) => (far[a.y][a.x] + (T(a.x, a.y).lava ? 3 : 0)) - (far[b.y][b.x] + (T(b.x, b.y).lava ? 3 : 0)) || (a.c - b.c))[0];
    moveFoe(f, s);
  }
  function field(f, prey) {
    const d = Array.from({length:st.H}, () => Array(st.W).fill(99)), q = [];
    prey.forEach(h => { d[h.y][h.x] = 0; q.push([h.x, h.y]); });
    while (q.length) {
      const [x, y] = q.shift();
      DIRS.forEach(([dx, dy]) => {
        const nx = x + dx, ny = y + dy;
        if (!inside(nx, ny) || d[ny][nx] <= d[y][x] + 1) return;
        if (T(nx, ny).block && f.ai !== "phase") return;
        d[ny][nx] = d[y][x] + 1; q.push([nx, ny]);
      });
    }
    return d;
  }
  function startPlayerTurn() {
    st.turn++; st.phase = "player";
    if (st.map.obj === "survive" && st.turn > st.map.turns) return win();
    alive("h").forEach(h => {
      h.moved = h.acted = h.guard = false; h.from = null;
      Object.keys(h.cd).forEach(k => { if (h.cd[k] > 0) h.cd[k]--; });
      if (h.poison) { const d = 2 + st.map.lv; h.hp = Math.max(1, h.hp - d); log(`☠️ ${h.name} took ${d} poison damage.`, "bad"); }
    });
    tickGround("h");
    log(`— Turn ${st.turn}${st.map.obj === "survive" ? ` of ${st.map.turns}` : st.turn > st.map.par ? " (over par)" : ""} —`);
    draw();
  }

  // ---------- winning and losing ----------
  function checkEnd() {
    if (st.over) return true;
    const heroes = st.units.filter(u => u.side === "h" && u.hp > 0), npc = st.units.find(u => u.side === "n");
    if (!heroes.length || (npc && npc.hp <= 0 && !st.rescued)) { st.over = {won:false, why:!heroes.length ? "Your squad fell..." : `${npc.name} was taken down...`}; sfx("bad"); draw(); return true; }
    const o = st.map.obj;
    const won = o === "rout" ? !alive("e").length
      : o === "boss" ? !st.units.some(u => u.boss && u.hp > 0)
      : o === "escape" ? heroes.every(u => u.escaped)
      : o === "rescue" ? !!st.rescued : false;
    if (won) { win(); return true; }
    return false;
  }
  function win() {
    const m = st.map, third = m.obj === "survive" ? st.kills >= m.par : st.turn <= m.par;
    const stars = 1 + (st.lost === 0 ? 1 : 0) + (third ? 1 : 0), before = sv.stars[m.id] || 0;
    sv.stars[m.id] = Math.max(before, stars); sv.wins++;
    // experience for everyone who came, plus a bonus for each enemy they took down
    const ups = [];
    st.units.filter(u => u.side === "h").forEach(u => {
      const lv0 = lvOf(u.h.id), s0 = lv0 >= SKILL_LV;
      sv.xp[u.h.id] = xpOf(u.h.id) + 14 + 5 * m.lv + 6 * u.kills;
      const lv1 = lvOf(u.h.id);
      if (lv1 > lv0) ups.push(`${u.name} reached Lv ${lv1}!${!s0 && lv1 >= SKILL_LV ? ` Learned ${CLASS[u.cls].skill.ic} ${CLASS[u.cls].skill.n}!` : ""}${lv0 < MOVE_LV && lv1 >= MOVE_LV ? " +1 move!" : ""}`);
    });
    const joined = m.recruit && HERO[m.recruit] && !sv.roster.includes(m.recruit) ? HERO[m.recruit] : null;
    if (joined) sv.roster.push(joined.id);
    save();
    const gained = Math.max(0, stars - before), cash = gained * (8 + m.lv * 4);
    const got = cash && typeof earn === "function" ? earn(cash, `Tactics: ${m.n}`, "tactics") : "";
    st.over = {won:true, stars, gained, got, ups, joined, third};
    sfx("win"); draw();
  }

  // the tiles enemies could hit next turn, for the danger view
  function dangerTiles() {
    const out = new Set();
    alive("e").forEach(f => {
      const spots = f.ai === "root" ? [{x:f.x, y:f.y}] : f.ai === "warp" ? [] : reach(f);
      if (f.ai === "warp") preyOf(f).filter(u => md(u, f) <= 6).forEach(u => out.add(u.x + "," + u.y));
      spots.forEach(s => {
        if (f.ai === "beam") {
          const R = AI.beam.line + (T(s.x, s.y).hill ? 1 : 0);
          DIRS.forEach(([dx, dy]) => { for (let i = 1; i <= R; i++) { const x = s.x + dx * i, y = s.y + dy * i; if (!inside(x, y) || T(x, y).wall) break; out.add(x + "," + y); } });
        } else DIRS.forEach(([dx, dy]) => { const x = s.x + dx, y = s.y + dy; if (inside(x, y) && !T(x, y).block) out.add(x + "," + y); });
      });
    });
    return out;
  }

  // ---------- drawing ----------
  function draw() {
    const el = $("#txWrap");
    if (!el) return;
    if (ui.view === "battle" && st) return drawBattle(el);
    if (ui.view === "party") return drawParty(el);
    drawMenu(el);
  }
  const starStr = n => "★".repeat(n) + "☆".repeat(3 - n);
  const campName = g => g === "MO" ? "" : badge({game:g});
  const xpBar = id => { const L = lvOf(id), a = xpFor(L), b = xpFor(L + 1), p = L >= MAX_LV ? 1 : (xpOf(id) - a) / (b - a); return `<span class="txXp" title="${L >= MAX_LV ? "Max level" : `${xpOf(id) - a}/${b - a} XP to Lv ${L + 1}`}"><i style="width:${Math.round(p * 100)}%"></i></span>`; };
  function drawMenu(el) {
    const total = MAPS.reduce((s, m) => s + (sv.stars[m.id] || 0), 0);
    el.innerHTML = `<section class="win txMenu"><h2>♟️ Saturn Valley Tactics</h2>
      <p class="txNote">Lead your own squad through grid battles. Each turn every hero can <b>move</b> once and <b>act</b> once, then the enemies move. Team up on enemies, shove them into lava, grab the high ground, and use the danger view to see where the enemies can reach.</p>
      <p class="txNote">⭐ <b>${total}/${MAPS.length * 3}</b> stars · 👥 ${sv.roster.length} in your squad · Win maps to recruit new heroes. Moonside opens once all three bosses are beaten.</p>
      <div class="txCamps">${CAMPS.map(([g, n]) => { const locked = g === "MO" && !moonOpen();
        return `<div class="txCamp g${g}${locked ? " locked" : ""}"><h3>${g === "MO" ? "🌀 " : ""}${n} ${campName(g)}</h3>${locked ? `<p class="txNote">🔒 Beat Fire Spring, Mt. Itoi and Chimera Laboratory to open the way to Moonside.</p>` : ""}${MAPS.filter(m => m.g === g).map(m => {
          const ok = open(m), s = sv.stars[m.id] || 0, o = OBJ[m.obj], rec = m.recruit && HERO[m.recruit];
          return `<button class="txMapBtn${ok ? "" : " locked"}" data-map="${m.id}" ${ok ? "" : "disabled"}>${miniMap(m)}<span><b>${ok ? m.n : "🔒 " + m.n}</b><small>${o.ic} ${o.n} · Lv ${m.lv + 1}${rec ? ` · 🤝 ${sv.roster.includes(rec.id) ? rec.name : "?"}` : ""}</small><em>${starStr(s)}</em></span></button>`;
        }).join("")}</div>`; }).join("")}</div>
      <section class="txSquad"><h3>👥 Your squad</h3><div class="txSquadList">${sv.roster.map(id => HERO[id]).filter(Boolean).map(h => { const s = heroStats(h), c = CLASS[s.cls];
        return `<button class="txSq" data-stats="${h.id}" title="See ${h.name}'s stats">${heroImg(h)}<span class="txSqTx"><b>${h.name} <small>Lv ${s.lv}</small></b><small>${c.n}</small>${xpBar(h.id)}</span></button>`; }).join("")}</div><p class="txNote">Tap a hero to see their stats.</p></section>
      <details class="twHow"><summary>How it works</summary>
        <p><b>Classes:</b> every hero gets one from their strengths. At Lv ${SKILL_LV} they learn their class skill, and at Lv ${MOVE_LV} they move 1 tile further.</p>
        ${Object.values(CLASS).map(c => `<p>${c.ic} <b>${c.n}:</b> ${c.pas} Skill: ${c.skill.ic} <b>${c.skill.n}</b>, ${c.skill.d.charAt(0).toLowerCase() + c.skill.d.slice(1)}</p>`).join("")}
        <p>🤝 <b>Team-up:</b> hitting an enemy that already has one of your heroes next to it does 25% more damage.</p>
        <p>✋ <b>Shove:</b> everyone can push an enemy 1 tile. Push them into rocks or each other for bump damage, into lava to burn them, or onto a warp to send them away.</p>
        <p><b>Ground:</b> ${Object.values(TERR).filter(t => t.d).map(t => `<b>${t.n}</b>: ${t.d}`).join(" ")}</p>
        <p><b>Enemies:</b> ${Object.values(AI).map(a => `${a.ic} <b>${a.n}</b>: ${a.d}`).join(" ")} Machines and aliens fire beams, plants are rooted, ghosts float, objects are bombs, weird ones warp, animals and bugs are fast, and everyone else is a brawler. ★ marks a tougher elite.</p>
      </details></section>`;
    el.querySelectorAll("[data-map]").forEach(b => b.onclick = () => { sfx("click"); ui.map = b.dataset.map; ui.view = "party"; draw(); });
    el.querySelectorAll("[data-stats]").forEach(b => b.onclick = () => statScreen(b.dataset.stats));
  }
  // ---------- stat screen: everything about one squad member, or one unit in battle ----------
  function statScreen(id, u) {
    const h = HERO[id];
    if (!h) return;
    const s = heroStats(h), c = CLASS[s.cls], L = s.lv, a = xpFor(L), b = xpFor(L + 1);
    const cur = u && u.side === "h" ? u : null;
    const num = (l, v, sub) => `<div><b>${v}</b><small>${l}${sub ? `<em>${sub}</em>` : ""}</small></div>`;
    const abil = heroAbils(h).map(x => `<li class="cxMv txMvPlain${x.cls ? " sig" : ""}"><div class="cxMvTx"><div class="cxMvTop"><b>${x.n}</b>${x.cls ? `<span class="cxStar">Class skill</span>` : ""}</div><small>${x.d}</small>
      <div class="cxTags">${[x.pp ? `${x.pp} PP` : "free", x.cd ? `${x.cd}-turn reload` : "", x.range ? `range ${x.range}` : "", x.line ? `line ${x.line}` : "", x.charge ? `charge ${x.charge}` : ""].filter(Boolean).map(t => `<span>${t}</span>`).join("")}${cur && x.cd && cur.cd[x.k] > 0 ? `<span class="no">ready in ${cur.cd[x.k]}</span>` : ""}</div></div></li>`).join("");
    const nextUp = L >= MAX_LV ? "Max level!" : L < SKILL_LV ? `Lv ${SKILL_LV}: learns ${c.skill.n}` : L < MOVE_LV ? `Lv ${MOVE_LV}: +1 move` : `Lv ${L + 1}: more HP, Offense and Defense`;
    sfx("open");
    openModal(h.name, `<div class="cxPage cxNew txStat">
      <section class="cxHero g${h.game}"><div class="cxArt">${heroImg(h, "big")}</div>
        <div class="cxId"><h2>${h.name} ${badge({game:h.game})}</h2><p class="cxRole">Level ${L} ${c.n}${cur ? ` · in battle${cur.poison ? " · poisoned" : ""}${cur.guard ? " · guarding" : ""}${cur.buff ? " · powered up" : ""}` : ""}</p>
          <div class="cxRecs txStatNums">${num("HP", cur ? `${cur.hp}/${cur.mhp}` : s.mhp)}${num("PP", cur ? (cur.mpp ? `${cur.pp}/${cur.mpp}` : "–") : s.mpp || "–")}${num("Offense", Math.round(s.atk))}${num("Defense", Math.round(s.def))}${num("Move", s.mv)}</div>
          <div class="txStatXp">${xpBar(h.id)}<small>${L >= MAX_LV ? "Max level" : `${xpOf(h.id) - a}/${b - a} XP to Lv ${L + 1}`} · Next: ${nextUp}</small></div></div></section>
      <section class="cxBox"><h3>${c.n}</h3><p class="cxMet">${c.pas} Class skill: <b>${c.skill.n}</b>, ${c.skill.d.charAt(0).toLowerCase() + c.skill.d.slice(1)}${L < SKILL_LV ? ` <i>(unlocks at Lv ${SKILL_LV})</i>` : ""}</p></section>
      <section class="cxBox"><h3>Actions <small>${heroAbils(h).length}</small></h3><ul class="cxMvs">${abil}</ul></section>
      ${cur ? `<section class="cxBox"><h3>This battle</h3><p class="cxMet">Enemies defeated: ${cur.kills}. Standing on: ${T(cur.x, cur.y).n}.</p></section>` : ""}
    </div>`);
  }
  // the same for an enemy (or the one you're rescuing) in battle
  function foeScreen(u) {
    const t = T(u.x, u.y), num = (l, v) => `<div><b>${v}</b><small>${l}</small></div>`;
    sfx("open");
    if (u.side === "n") return openModal(u.name, `<div class="cxPage cxNew txStat"><section class="cxBox"><p class="cxMet">${u.name} has ${u.hp}/${u.mhp} HP. Reach them with any hero before the enemies take them down.</p></section></div>`);
    openModal(u.name, `<div class="cxPage cxNew txStat">
      <section class="cxHero"><div class="cxArt">${spriteHTML(u.e, "big")}</div>
        <div class="cxId"><h2>${u.name} ${badge(u.e)}</h2><p class="cxRole">${AI[u.ai].n}${u.boss ? " · Boss" : ""}${u.elite ? " · Elite" : ""}${u.lit ? " · fuse lit!" : ""}</p>
          <div class="cxRecs txStatNums">${num("HP", `${u.hp}/${u.mhp}`)}${num("Offense", Math.round(u.atk))}${num("Defense", Math.round(u.def * (1 + (t.def || 0))))}${num("Move", u.mv)}</div></div></section>
      <section class="cxBox"><h3>How it fights</h3><p class="cxMet">${AI[u.ai].d}${u.elite ? " Elites are tougher than usual." : ""}</p></section>
      <section class="cxBox"><h3>Where it stands</h3><p class="cxMet"><b>${t.n}</b>${t.d ? `: ${t.d}` : "."}</p></section>
    </div>`);
  }
  const miniMap = m => `<span class="txMini" style="grid-template-columns:repeat(${m.rows[0].length},7px)">${m.rows.join("").split("").map(c => `<i class="m${c === "H" ? "h" : "EB".includes(c) ? "e" : c === "S" ? "s" : TILE_CLS[c] || "g"}"></i>`).join("")}</span>`;
  function drawParty(el) {
    const m = mapById(ui.map), slots = m.rows.join("").split("H").length - 1, o = OBJ[m.obj];
    const heroes = sv.roster.map(id => HERO[id]).filter(Boolean);
    ui.pick = ui.pick.filter(k => sv.roster.includes(k)).slice(0, slots);
    if (!ui.pick.length) ui.pick = heroes.slice(0, slots).map(h => h.id);
    el.innerHTML = `<section class="win txParty"><div class="txPartyTop"><button class="btn twSmall" id="txBack">◀ Maps</button><h2>${m.n} ${campName(m.g)}</h2>
        <span class="txNote">Pick up to ${slots} · ${ui.pick.length}/${slots}</span><button class="btn hot" id="txGo" ${ui.pick.length ? "" : "disabled"}>⚔️ Start battle</button></div>
      <div class="txBrief">${miniMap(m)}<div><p class="txNote"><b>${o.ic} ${o.n}:</b> ${o.d(m)}</p>
        <p class="txNote">⭐ Win · ⭐ Nobody collapses · ⭐ ${m.obj === "survive" ? `Defeat ${m.par}+ enemies` : `Win within ${m.par} turns`}</p>
        ${m.recruit && HERO[m.recruit] && !sv.roster.includes(m.recruit) ? `<p class="txNote">🤝 Win to recruit someone new!</p>` : ""}</div></div>
      <div class="txSlots">${Array.from({length:slots}, (_, i) => { const h = HERO[ui.pick[i]];
        return h ? `<button class="txSlot on" data-h="${h.id}" title="Remove ${h.name}">${heroImg(h)}<b>${h.name}</b><span class="txSlotX">Remove</span></button>` : `<div class="txSlot"><span>Slot ${i + 1}</span><b>Empty</b></div>`; }).join("")}</div>
      <div class="txHeroes">${heroes.map(h => { const s = heroStats(h), c = CLASS[s.cls], i = ui.pick.indexOf(h.id);
        return `<div class="txHero${i >= 0 ? " on" : ""}" data-h="${h.id}" role="button" tabindex="0" aria-pressed="${i >= 0}">
          ${i >= 0 ? `<span class="txPickNo">${i + 1}</span>` : ""}
          <div class="txHeroTop">${heroImg(h)}<div class="txHeroId"><b>${h.name}</b><small>Lv ${s.lv} · ${c.n}</small>${xpBar(h.id)}</div>
            <button class="txInfoBtn" data-stats="${h.id}" title="See ${h.name}'s stats" aria-label="See ${h.name}'s stats">Stats</button></div>
          <div class="txHeroNums"><span><small>HP</small><b>${s.mhp}</b></span><span><small>Off</small><b>${Math.round(s.atk)}</b></span><span><small>Def</small><b>${Math.round(s.def)}</b></span><span><small>Move</small><b>${s.mv}</b></span><span><small>PP</small><b>${s.mpp || "–"}</b></span></div>
          <div class="txChips">${heroAbils(h).map(a => `<span class="${a.cls ? "sk" : ""}" title="${a.d}">${a.n}</span>`).join("")}${s.lv < SKILL_LV ? `<span class="lock" title="${c.skill.d}">${c.skill.n} (Lv ${SKILL_LV})</span>` : ""}</div>
        </div>`; }).join("")}</div>
      <p class="txNote">Tap a hero to add or remove them. Stats shows everything about them.</p></section>`;
    $("#txBack").onclick = () => { ui.view = "menu"; draw(); };
    $("#txGo").onclick = () => startMap(ui.map);
    el.querySelectorAll("[data-stats]").forEach(b => b.onclick = ev => { ev.stopPropagation(); statScreen(b.dataset.stats); });
    el.querySelectorAll("[data-h]").forEach(b => b.onkeydown = ev => { if (ev.target === b && (ev.key === "Enter" || ev.key === " ")) { ev.preventDefault(); b.click(); } });
    el.querySelectorAll("[data-h]").forEach(b => b.onclick = () => {
      const k = b.dataset.h, i = ui.pick.indexOf(k);
      if (i >= 0) ui.pick.splice(i, 1); else if (ui.pick.length < slots) ui.pick.push(k); else { ui.pick.shift(); ui.pick.push(k); }
      sfx("click"); draw();
    });
  }
  function objLine() {
    const m = st.map, heroes = st.units.filter(u => u.side === "h" && u.hp > 0), npc = st.units.find(u => u.side === "n");
    if (m.obj === "survive") return `⏳ Turn ${st.turn}/${m.turns} · ${st.kills} defeated`;
    if (m.obj === "escape") return `🚪 Escaped ${heroes.filter(u => u.escaped).length}/${heroes.length}`;
    if (m.obj === "rescue") return `🆘 ${npc ? `${npc.name}: ${npc.hp}/${npc.mhp} HP` : ""}`;
    if (m.obj === "boss") { const b = st.units.find(u => u.boss); return `👑 ${b ? `${b.name}: ${b.hp}/${b.mhp} HP` : ""}`; }
    return `⚔️ ${alive("e").length} enemies left`;
  }
  function drawBattle(el) {
    const s = unitBy(ui.sel), mine = st.phase === "player" && !st.over;
    const moves = s && mine && !s.moved ? reach(s) : [];
    const tg = s && mine && !s.acted ? targets(s, ui.ab || s.abil[0]) : [];
    const key = (x, y) => x + "," + y, mv = new Set(moves.map(p => key(p.x, p.y))), tset = new Set(tg.map(t => key(t.x, t.y)));
    const dz = ui.danger && mine ? dangerTiles() : new Set();
    let cells = "";
    for (let y = 0; y < st.H; y++) for (let x = 0; x < st.W; x++) {
      const c = st.grid[y][x], u = unitAt(x, y), k = key(x, y);
      const cls = ["txC", "t" + TILE_CLS[c], mv.has(k) && !u ? "mv" : "", tset.has(k) ? (ui.ab && ui.ab.ally ? "aly" : "tgt") : "", dz.has(k) ? "dz" : ""].filter(Boolean).join(" ");
      cells += `<div class="${cls}" data-x="${x}" data-y="${y}">${u ? unitHTML(u, s) : ""}</div>`;
    }
    el.innerHTML = `<section class="win txTop"><b>♟️ ${st.map.n} ${campName(st.map.g)}</b>
        <span class="txTurn${st.map.obj !== "survive" && st.turn > st.map.par ? " over" : ""}">Turn ${st.turn}${st.map.obj === "survive" ? "" : ` · par ${st.map.par}`}</span>
        <span class="txObj">${objLine()}</span>
        <span class="txPhase ${st.phase}">${st.over ? "" : st.phase === "player" ? "Your turn" : "Enemy turn..."}</span>
        <button class="btn twSmall${ui.danger ? " hot" : ""}" id="txDanger" title="Show where enemies can hit next turn (D)">👁️ Danger</button>
        <button class="btn hot" id="txEnd" ${mine ? "" : "disabled"} title="End your turn (E)">End turn ▶</button>
        <button class="btn twSmall" id="txQuit">🏳️ Retreat</button></section>
      <section class="txMain"><div class="txBoard" id="txBoard" style="grid-template-columns:repeat(${st.W},1fr);max-width:${st.W * 68}px">${cells}${st.over ? overHTML() : ""}</div>
        <div class="win txSide"><div id="txSel">${selHTML(s)}</div><div id="txInfo">${infoHTML()}</div><div class="txLog">${st.log.slice().reverse().map(l => `<p class="${l.cls}">${l.t}</p>`).join("")}</div></div></section>`;
    bindBattle();
  }
  function unitHTML(u, s) {
    const p = u.hp / u.mhp, img = u.side !== "e" ? heroImg(u.h) : `<img src="${spriteUrl(u.e)}" alt="" referrerpolicy="no-referrer" draggable="false">`;
    const badgeTx = u.side === "n" ? "🆘" : u.guard ? "🛡️" : u.poison ? "☠️" : u.side === "e" ? (u.lit ? "🔥" : AI[u.ai].ic) : u.buff ? "💪" : "";
    return `<div class="txU ${u.side}${u.flash && Date.now() - u.flash < 600 ? " hit" : ""}${s === u ? " sel" : ""}${u.side === "h" && done(u) && st.phase === "player" ? " done" : ""}${u.boss ? " boss" : ""}${u.elite ? " elite" : ""}">${img}
      <span class="txHp"><i style="width:${p * 100}%;background:${p > .5 ? "#3fae5a" : p > .2 ? "#f2b33d" : "#e2352c"}"></i></span>
      ${badgeTx ? `<span class="txBadge${u.side === "e" ? " ai" : ""}">${badgeTx}</span>` : ""}${u.elite ? `<span class="txStar">★</span>` : ""}${u.taunt ? `<span class="txTaunt">📣</span>` : ""}</div>`;
  }
  function selHTML(s) {
    if (st.over) return "";
    if (!s) return `<p class="txHint">${st.phase === "player" ? "Tap a hero to move them. Blue tiles show where they can walk; red shows who they can hit. Hover anything for details." : "The enemies are moving..."}</p>`;
    const c = CLASS[s.cls];
    return `<div class="txCard"><div class="txCardTop">${heroImg(s.h)}<button class="txInfoBtn" data-ustats="${s.id}" title="Full stats">Stats</button><span><b>${s.name} <small>Lv ${s.lv}</small></b><small>${c.ic} ${c.n} · HP ${s.hp}/${s.mhp}${s.mpp ? ` · PP ${s.pp}/${s.mpp}` : ""} · Move ${s.mv}</small></span></div>
      <div class="txAbils">${s.abil.map((a, i) => { const t = s.acted ? [] : targets(s, a), why = s.acted ? "Already acted" : a.pp && s.pp < a.pp ? `Needs ${a.pp} PP` : a.cd && s.cd[a.k] > 0 ? `Ready in ${s.cd[a.k]}` : !t.length ? "Nothing in range" : "";
        return `<button class="btn${ui.ab === a ? " hot" : ""}${a.cls ? " txSkill" : ""}" data-ab="${i}" ${why ? "disabled" : ""} title="${a.d}${why ? ` (${why})` : ""}">${a.ic} ${a.n}${a.pp ? ` <small>${a.pp}PP</small>` : ""}<kbd>${i + 1}</kbd></button>`; }).join("")}</div>
      <div class="txAbils">${s.moved && !s.acted && s.from ? `<button class="btn twSmall" id="txUndo">↩️ Undo move</button>` : ""}${!done(s) ? `<button class="btn twSmall" id="txWait">⏸️ Wait</button>` : ""}</div>
      <p class="txHint">${ui.ab ? `${ui.ab.d} Tap a ${ui.ab.ally ? "green" : "red"} tile.` : done(s) ? `${s.name} is done for this turn.` : s.acted ? "Pick a tile to move to, or Wait." : s.moved ? "Pick an action, or Wait." : `${c.ic} ${c.pas}`}</p></div>`;
  }
  function infoHTML() {
    const u = ui.hover && unitBy(ui.hover), tt = ui.hoverTile && TERR[tile(...ui.hoverTile)];
    let h = "";
    if (u && up(u)) {
      const t = T(u.x, u.y);
      h += `<div class="txInfoCard ${u.side}"><div class="txInfoTop"><b>${u.elite ? "★ " : ""}${u.name}</b>${u.side === "e" ? ` ${badge(u.e)}` : ""}<button class="txInfoBtn" data-ustats="${u.id}" title="Full stats">Stats</button></div>
        <small>HP ${u.hp}/${u.mhp}${u.side !== "n" ? ` · Off ${Math.round(u.atk)} · Def ${Math.round(u.def)}${t.def ? " (+30% in cover)" : ""} · Move ${u.mv}` : ""}</small>
        ${u.side === "e" ? `<small><b>${AI[u.ai].ic} ${AI[u.ai].n}:</b> ${AI[u.ai].d}${u.elite ? " Elite: tougher than usual." : ""}${u.lit ? " 🔥 Its fuse is lit!" : ""}</small>`
          : u.side === "n" ? `<small>Reach them with any hero before the enemies take them down.</small>`
          : `<small>${CLASS[u.cls].ic} ${CLASS[u.cls].n}: ${CLASS[u.cls].pas}</small><small>${u.abil.map(a => `${a.ic} ${a.n}`).join(" · ")}</small>`}</div>`;
    }
    if (tt && tt.d) h += `<div class="txInfoCard tile"><b>${tt.n}</b><small>${tt.d}</small></div>`;
    return h;
  }
  function overHTML() {
    const o = st.over, m = st.map;
    return `<div class="txOver"><div class="win"><h2>${o.won ? "🏆 Victory!" : `💀 ${o.why}`}</h2>
      ${o.won ? `<p class="txStars">${starStr(o.stars)}</p><p class="txNote">✓ Won · ${st.lost === 0 ? "✓ Nobody collapsed" : "✗ Someone collapsed"} · ${o.third ? "✓" : "✗"} ${m.obj === "survive" ? `${st.kills}/${m.par} defeated` : `${st.turn}/${m.par} turns`}</p>
        ${o.got ? `<p class="txNote">💰 ${o.got} for Saturn's shop (${o.gained} new star${o.gained === 1 ? "" : "s"})</p>` : ""}
        ${o.ups.map(t => `<p class="txNote txUp">⬆️ ${t}</p>`).join("")}
        ${o.joined ? `<div class="txJoin">${heroImg(o.joined)}<p class="txNote">🤝 <b>${o.joined.name}</b> joined your squad! ${CLASS[classOf(o.joined)].ic} ${CLASS[classOf(o.joined)].n}</p></div>` : ""}`
        : `<p class="txNote">Try the danger view, a different squad, or more cover.</p>`}
      <div class="actions">${o.won && nextMap() ? `<button class="btn hot" id="txNext">Next: ${nextMap().n} ▶</button>` : ""}<button class="btn${o.won ? "" : " hot"}" id="txRetry">🔁 Retry</button><button class="btn" id="txMaps">🗺️ Maps</button></div></div></div>`;
  }
  const nextMap = () => { const camp = MAPS.filter(x => x.g === st.map.g), i = camp.indexOf(st.map), n = camp[i + 1]; return n && open(n) ? n : null; };

  // ---------- input ----------
  function bindBattle() {
    const on = (id, fn) => { const b = $(id); if (b) b.onclick = fn; };
    on("#txEnd", () => { sfx("click"); endTurn(); });
    on("#txDanger", () => { ui.danger = !ui.danger; sfx("click"); draw(); });
    on("#txQuit", () => { if (st.over || confirm("Retreat from this battle? You won't earn anything.")) { st = null; ui.view = "menu"; draw(); } });
    on("#txRetry", () => startMap(st.map.id));
    on("#txMaps", () => { st = null; ui.view = "menu"; draw(); });
    on("#txNext", () => { ui.map = nextMap().id; st = null; ui.view = "party"; draw(); });
    on("#txUndo", () => { const s = unitBy(ui.sel); if (s && s.from) { s.x = s.from.x; s.y = s.from.y; s.from = null; s.moved = false; ui.ab = null; sfx("click"); draw(); } });
    on("#txWait", () => { const s = unitBy(ui.sel); if (s) { s.acted = s.moved = true; s.from = null; ui.sel = ui.ab = null; sfx("click"); afterHeroAction(); } });
    document.querySelectorAll("[data-ab]").forEach(b => b.onclick = () => pickAbil(+b.dataset.ab));
    // the side panel redraws on hover, so its stat buttons are handled in one place
    const side = $(".txSide");
    if (side) side.onclick = ev => { const b = ev.target.closest && ev.target.closest("[data-ustats]"); if (!b) return; const u = unitBy(+b.dataset.ustats); if (u) u.side === "h" ? statScreen(u.h.id, u) : foeScreen(u); };
    document.querySelectorAll(".txC").forEach(c => {
      const x = +c.dataset.x, y = +c.dataset.y;
      c.onclick = () => tap(x, y);
      c.onpointerenter = () => {
        const u = unitAt(x, y), id = u ? u.id : null;
        if (id === ui.hover && ui.hoverTile && ui.hoverTile[0] === x && ui.hoverTile[1] === y) return;
        if (ui.pin && !id) return;
        ui.pin = false; ui.hover = id; ui.hoverTile = [x, y];
        const i = $("#txInfo"); if (i) i.innerHTML = infoHTML();
      };
    });
  }
  function pickAbil(i) {
    const s = unitBy(ui.sel);
    if (!s || s.acted || st.phase !== "player") return;
    const a = s.abil[i];
    if (!a || !targets(s, a).length) return;
    if (a.self) return heroAct(s, a, s);
    ui.ab = ui.ab === a ? null : a; sfx("click"); draw();
  }
  function tap(x, y) {
    if (!st || st.phase !== "player" || st.over) return;
    const u = unitAt(x, y), s = unitBy(ui.sel);
    if (s && up(s) && !done(s)) {
      if (!s.acted) {
        const ab = ui.ab || s.abil[0];
        if (u && targets(s, ab).includes(u)) return heroAct(s, ab, u);
        if (ui.ab) { ui.ab = null; return draw(); }
      }
      if (!u && !s.moved && reach(s).some(p => p.x === x && p.y === y)) {
        s.from = s.acted ? null : {x:s.x, y:s.y}; s.x = x; s.y = y; s.moved = true; sfx("click");
        land(s);
        if (s.acted) ui.sel = null;
        return afterHeroAction();
      }
    }
    if (u && u.side === "h" && !done(u)) { ui.sel = u.id; ui.ab = null; sfx("click"); return draw(); }
    // tapping anyone else shows their details in the side panel (handy without a mouse)
    if (u) { ui.hover = u.id; ui.hoverTile = [x, y]; ui.pin = true; }
    ui.sel = ui.ab = null; draw();
  }
  document.addEventListener("keydown", ev => {
    if ($("#viewTactics").hidden || !st || ui.view !== "battle" || !$("#modal").hidden) return;
    if (ev.target.closest && ev.target.closest("input,textarea")) return;
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    if (ev.key === "Escape") { if (ui.ab) ui.ab = null; else ui.sel = null; draw(); }
    else if (ev.key === "e" || ev.key === "E") { ev.preventDefault(); endTurn(); }
    else if (ev.key === "d" || ev.key === "D") { ev.preventDefault(); ui.danger = !ui.danger; draw(); }
    else if (/^[1-8]$/.test(ev.key) && ui.sel) { ev.preventDefault(); pickAbil(+ev.key - 1); }
  });
  window.onTacticsShow = () => draw();
})();
