// ---------- Saturn's shop: money from the grid, Map Guessr and minigames buys windows, wallpapers and more ----------
const SHOP_KEY = "earthdoku-shop";
const SATURN_SPR = "https://cdn.wikibound.info/a/a3/EB_Mr_Saturn.png";
// window skins: free ones first, the rest are for sale (prices in dollars, like the games)
const SKINS = [
  {id:"mint", n:"Mint", p:0, d:"The classic EarthBound text box."},
  {id:"strawberry", n:"Strawberry", p:0, d:"Sweet and pink."},
  {id:"banana", n:"Banana", p:0, d:"Bright and sunny."},
  {id:"peanut", n:"Peanut", p:0, d:"Toasty brown."},
  {id:"grape", n:"Grape", p:150, d:"A deep purple flavor."},
  {id:"plain", n:"Plain", p:150, d:"Grey stripes for serious adventurers."},
  {id:"podunk", n:"Podunk Farm", p:200, d:"Fence posts and fresh grass."},
  {id:"yucca", n:"Yucca Desert", p:200, d:"Hot sand from Ninten's travels."},
  {id:"peaceful", n:"Peaceful Rest", p:200, d:"A calm valley green."},
  {id:"tazmily", n:"Tazmily Wood", p:250, d:"Warm planks from a quiet village."},
  {id:"onett", n:"Onett Sunset", p:250, d:"The sky over the hilltop meteor."},
  {id:"twoson", n:"Twoson Brick", p:250, d:"Red bricks from a busy little town."},
  {id:"snowman", n:"Snowman", p:250, d:"White as Snowman's winter."},
  {id:"bubblegum", n:"Bubble Gum", p:250, d:"Chewed fresh by Bubble Monkey."},
  {id:"saturn", n:"Mr. Saturn", p:300, d:"Peach with polka dots. Boing!"},
  {id:"winters", n:"Winters Snow", p:300, d:"Icy blue with falling snow."},
  {id:"duncan", n:"Duncan's Factory", p:300, d:"Hazard stripes and humming machines."},
  {id:"dusty", n:"Dusty Dunes", p:300, d:"Rolling sand under a hot sun."},
  {id:"grapefruit", n:"Grapefruit Falls", p:300, d:"Cool water from a famous waterfall."},
  {id:"clayman", n:"Clay Factory", p:300, d:"Molded by hard-working Claymen."},
  {id:"tenda", n:"Tenda Village", p:350, d:"Mossy green, very shy."},
  {id:"summers", n:"Summers Beach", p:350, d:"Sea to sand, like a postcard."},
  {id:"holyloly", n:"Holy Loly", p:350, d:"Mountain trails and wild grass."},
  {id:"happyhappy", n:"Happy Happy Blue", p:350, d:"Painted blue, of course."},
  {id:"sunshine", n:"Sunshine Forest", p:350, d:"Bright leaves before the fire."},
  {id:"fourside", n:"Fourside Night", p:400, d:"City lights after dark."},
  {id:"threed", n:"Threed Night", p:400, d:"A spooky town after sundown."},
  {id:"flyhoney", n:"Fly Honey", p:400, d:"Sticky, sweet and a little suspicious."},
  {id:"pigmask", n:"Pigmask Pink", p:400, d:"Standard-issue army pink."},
  {id:"magicant", n:"Magicant", p:450, d:"A dreamy pastel swirl."},
  {id:"ellay", n:"Ellay Neon", p:450, d:"Live music and bright signs."},
  {id:"stonehenge", n:"Stonehenge", p:450, d:"Old grey stones, hiding a base."},
  {id:"osohe", n:"Osohe Castle", p:450, d:"Haunted halls and friendly ghosts."},
  {id:"scaraba", n:"Scaraba Gold", p:500, d:"Pyramids, teal skies and gold."},
  {id:"magypsy", n:"Magypsy", p:500, d:"Fabulous pastel sparkle."},
  {id:"dalaam", n:"Dalaam Palace", p:550, d:"Red and gold, fit for a prince."},
  {id:"runaway", n:"Runaway Five", p:550, d:"Stage curtains for the big show."},
  {id:"moonside", n:"Moonside", p:600, d:"Welcome to Moonside. Yes. No."},
  {id:"deepdark", n:"Deep Darkness", p:600, d:"Swampy, murky and full of fog."},
  {id:"thunder", n:"Thunder Tower", p:600, d:"Crackling yellow on black."},
  {id:"chimera", n:"Chimera Lab", p:650, d:"Striped like a Pigmask lab."},
  {id:"underworld", n:"Lost Underworld", p:650, d:"Jungle green over hot lava."},
  {id:"starman", n:"Starman Silver", p:650, d:"Shiny chrome from another world."},
  {id:"dcmc", n:"DCMC Rock", p:650, d:"The band everyone came to see."},
  {id:"lumine", n:"Lumine Hall", p:700, d:"Glowing walls that read your thoughts."},
  {id:"titiboo", n:"Club Titiboo", p:700, d:"Disco lights all night long."},
  {id:"pokey", n:"Pokey Gold", p:750, d:"Gaudy gold, just how he likes it."},
  {id:"franklin", n:"Franklin Badge", p:750, d:"Gold with a lightning-proof shine."},
  {id:"pastcave", n:"Cave of the Past", p:800, d:"Cold steel at the end of time."},
  {id:"newpork", n:"New Pork City", p:800, d:"Pink neon, all for one king."},
  {id:"soundstone", n:"Sound Stone", p:900, d:"All eight melodies in one window."},
  {id:"swirl", n:"Battle Swirl", p:1000, d:"The swirl before every fight."},
  {id:"manimani", n:"Mani Mani", p:1200, d:"A golden glow that warps the mind."},
  {id:"giygas", n:"Giygas", p:1500, d:"You cannot grasp the true form of this window."}
].map(s => ({...s, cat:"skin"}));
// wallpapers change the backdrop behind every tab
const WALLS = [
  {id:"w_classic", n:"Classic swirl", p:0, d:"The spinning stripes you started with."},
  {id:"w_onett", n:"Onett hilltop", p:300, d:"Green hills under a sunset sky."},
  {id:"w_tazmily", n:"Tazmily meadow", p:300, d:"Clover dots and wooden fences."},
  {id:"w_saturn", n:"Saturn Valley", p:350, d:"Pink polka dots. Very zoom."},
  {id:"w_snow", n:"Winters snowfall", p:350, d:"Soft snow on a pale sky."},
  {id:"w_summers", n:"Summers shore", p:400, d:"Sky, sea and a stripe of sand."},
  {id:"w_fourside", n:"Fourside skyline", p:450, d:"A tall city in the distance."},
  {id:"w_magicant", n:"Magicant clouds", p:500, d:"Pastel sky full of fluffy clouds."},
  {id:"w_moonside", n:"Moonside lights", p:600, d:"Neon dots on a lilac night."},
  {id:"w_lumine", n:"Lumine glow", p:700, d:"A gentle teal shimmer."},
  {id:"w_sound", n:"Sound Stone rainbow", p:900, d:"Eight soft colors around the stone."},
  {id:"w_giygas", n:"Giygas ripples", p:1200, d:"Red rings, but friendly. Mostly."},
  {id:"w_underworld", n:"Lost Underworld", p:500, d:"Jungle leaves over a warm lava glow."},
  {id:"w_dalaam", n:"Dalaam sunrise", p:650, d:"Golden rays over the mountain palace."},
  {id:"w_starman", n:"Starman twilight", p:750, d:"Drifting stars in a lilac evening sky."},
  {id:"w_newpork", n:"New Pork neon", p:900, d:"A glowing grid that never stops scrolling."},
  {id:"w_battle", n:"Battle backdrop", p:1300, d:"Wavy bands like the fights in EarthBound. It moves!"}
].map(s => ({...s, cat:"wall"}));
// hit text: what pops out of a square when you place an enemy
const HITS = [
  {id:"h_smash", n:"SMAAAASH!!", p:0, d:"The classic critical hit."},
  {id:"h_boing", n:"BOING!", p:80, d:"Mr. Saturn's favorite word."},
  {id:"h_zoom", n:"ZOOM!", p:80, d:"Fast like a Sky Runner."},
  {id:"h_okey", n:"Okey dokey!", p:120, d:"Straight from Ness's mom."},
  {id:"h_yes", n:"Yes yes yes!", p:150, d:"Enthusiastic agreement."},
  {id:"h_fuzzy", n:"Fuzzy pickles!", p:150, d:"Say it for the photo man."},
  {id:"h_pkfire", n:"PK FIRE!!", p:200, d:"Paula's signature."},
  {id:"h_thunder", n:"PK THUNDER!", p:200, d:"Hard to aim, great to shout."},
  {id:"h_starstorm", n:"PK STARSTORM!", p:350, d:"Poo's ultimate move."},
  {id:"h_rockin", n:"PK ROCKIN Ω!", p:400, d:"Named after your favorite thing."},
  {id:"h_love", n:"PK LOVE Ω!", p:500, d:"The power of the Dragon."}
].map(s => ({...s, cat:"hit"}));
// tower supplies: goods added to your bag at the start of your next normal Tower run
const SUPPLIES = [
  {id:"t_cookies", n:"Cookie bag", p:45, g:"cookie", x:3, d:"3 Cookies to start your next run."},
  {id:"t_burgers", n:"Hamburger pair", p:70, g:"hamburger", x:2, d:"2 Hamburgers to start your next run."},
  {id:"t_caramel", n:"PSI Caramels", p:60, g:"caramel", x:2, d:"2 PSI Caramels for PP emergencies."},
  {id:"t_bomb", n:"Bomb", p:70, g:"bomb", x:1, d:"One Bomb for a crowded room."},
  {id:"t_lunch", n:"Brain food lunch", p:120, g:"brainfood", x:1, d:"Fully restores one friend."},
  {id:"t_superbomb", n:"Super Bomb", p:140, g:"superbomb", x:1, d:"A very big bang."},
  {id:"t_candy", n:"Rock candy", p:160, g:"rockcandy", x:1, d:"A small permanent stat boost."},
  {id:"t_horn", n:"Horn of life", p:220, g:"horn", x:1, d:"Revives a fallen friend at full HP."}
].map(s => ({...s, cat:"tower"}));
// keepsakes: collectibles for your shelf (the Piggy bank is the only one that does something)
const KEEPS = [
  {id:"k_townmap", n:"Town map", ic:"🗺️", p:100, d:"Folds back up perfectly. Every time."},
  {id:"k_bat", n:"Cracked bat", ic:"🏏", p:100, d:"Ness's first weapon. Still has a dent."},
  {id:"k_teddy", n:"Teddy bear", ic:"🧸", p:120, d:"Takes the hit so you don't have to."},
  {id:"k_rope", n:"Rope", ic:"🪢", p:120, d:"Good for climbing out of trouble."},
  {id:"k_handaid", n:"Hand-Aid", ic:"🩹", p:140, d:"Somehow heals everything."},
  {id:"k_franklin", n:"Franklin badge", ic:"⚡", p:150, d:"Reflects lightning. Shiny, too."},
  {id:"k_cap", n:"Mr. Baseball cap", ic:"🧢", p:160, d:"Signed by nobody in particular."},
  {id:"k_coffee", n:"Saturn coffee", ic:"☕", p:180, d:"Makes you think about your journey."},
  {id:"k_eraser", n:"Pencil eraser", ic:"✏️", p:220, d:"Erases pencil statues. Only those."},
  {id:"k_ocarina", n:"Ocarina", ic:"🎶", p:250, d:"Plays Pollyanna, if you're lucky."},
  {id:"k_butterfly", n:"Magic butterfly", ic:"🦋", p:300, d:"Restores your PP just by being near."},
  {id:"k_soundstone", n:"Sound Stone", ic:"🪨", p:400, d:"Hums all eight melodies at once."},
  {id:"k_bike", n:"Bicycle", ic:"🚲", p:500, d:"Ring ring! Faster than walking."},
  {id:"k_needle", n:"Dragon Needle", ic:"🪡", p:600, d:"Seven of these hold the islands together."},
  {id:"k_piggy", n:"Piggy bank", ic:"🐷", p:800, d:"Adds 10% to every dollar you earn."}
].map(s => ({...s, cat:"keep"}));
const ITEMS = [...SKINS, ...WALLS, ...HITS, ...SUPPLIES, ...KEEPS];
const ITEM = Object.fromEntries(ITEMS.map(s => [s.id, s]));
const SKIN = Object.fromEntries(SKINS.map(s => [s.id, s]));
const FREE = ITEMS.filter(s => !s.p && s.cat !== "tower").map(s => s.id);
const shop = (() => {
  const s = Object.assign({money:40, earned:0, spent:0, owned:[], by:{grid:0, map:0, mini:0}, log:[], told:[], v:0,
    wall:"w_classic", hit:"h_smash", bag:{}, heroSkin:{}}, store.get(SHOP_KEY) || {});
  // first visit: whatever skin you were already wearing comes with you
  if (!s.v) {
    const worn = store.get("earthdoku-flavor");
    if (worn && SKIN[worn] && SKIN[worn].p && !s.owned.includes(worn)) s.owned.push(worn);
    s.v = 1;
  }
  return s;
})();
const shopSave = () => store.set(SHOP_KEY, shop);
// hero skins are added by the Tower: originals are always yours, Champion looks are earned at the top
const owns = id => { const s = ITEM[id]; return FREE.includes(id) || shop.owned.includes(id) || !!(s && (s.base || s.champ && typeof champWon === "function" && champWon(s.h))); };
const fmt$ = n => "$" + Math.round(n).toLocaleString();
// one permanent item is 30% off each day
const dealId = () => { const pool = ITEMS.filter(s => s.p && s.cat !== "tower" && s.cat !== "hero"); return pool[hashStr("saturn-deal-" + todayKey()) % pool.length].id; };
// Saturn's weekly special: one hero skin is 40% off from Monday to Sunday. It's picked from heroes you've found and stays put all week
const WEEKLY_OFF = .4;
function weeklyId() {
  if (typeof weekKey !== "function" || typeof HEROES === "undefined" || typeof isUnlocked !== "function") return null;
  const wk = weekKey();
  if (!shop.weekly || shop.weekly.wk !== wk || (shop.weekly.id && !ITEM[shop.weekly.id])) {
    const pool = ITEMS.filter(s => s.cat === "hero" && s.p && !owns(s.id) && isUnlocked(HERO[s.h]));
    shop.weekly = {wk, id:pool.length ? pool[hashStr("saturn-week-" + wk) % pool.length].id : null};
    shopSave();
  }
  return shop.weekly.id;
}
const weekDaysLeft = () => 7 - ((new Date().getDay() + 6) % 7);
const priceOf = id => Math.round(ITEM[id].p * (id === dealId() ? .7 : id === weeklyId() ? 1 - WEEKLY_OFF : 1) / 5) * 5;
const bagCount = () => Object.values(shop.bag).reduce((s, n) => s + n, 0);

// ---------- toasts ----------
document.body.insertAdjacentHTML("beforeend", `<div class="toasts" id="toasts" aria-live="polite"></div>`);
function toast(html) {
  const el = document.createElement("div");
  el.className = "win toast";
  el.innerHTML = html;
  $("#toasts").appendChild(el);
  setTimeout(() => el.classList.add("out"), 4200);
  setTimeout(() => el.remove(), 4700);
}

// ---------- earning ----------
function drawWallet(bump) {
  const w = $("#walletTop");
  w.textContent = fmt$(shop.money);
  if (bump) { w.classList.remove("bump"); void w.offsetWidth; w.classList.add("bump"); }
}
function earn(n, why, src) {
  n = Math.max(1, Math.round(n * (owns("k_piggy") ? 1.1 : 1)));
  shop.money += n; shop.earned += n;
  shop.by[src] = (shop.by[src] || 0) + n;
  shop.log.push({d:todayKey(), why, n});
  shop.log = shop.log.slice(-30);
  // a heads-up the first time you can afford each window skin
  const now = SKINS.filter(s => s.p && !owns(s.id) && !shop.told.includes(s.id) && shop.money >= priceOf(s.id));
  if (now.length) {
    now.forEach(s => shop.told.push(s.id));
    const s = now[now.length - 1];
    toast(`<img class="tSat" src="${SATURN_SPR}" alt="" referrerpolicy="no-referrer"><div><b>Saturn's shop</b><br><small>You can afford the ${s.n} window now! ZOOM!</small></div>`);
  }
  shopSave(); drawWallet(true);
  if (window.checkAch) checkAch();
  if (!$("#viewShop").hidden) drawShop();
  return fmt$(n);
}
// grid: rarer squares pay more; infinite grids pay half, hard mode pays 1.5×
function shopGridCash(answers, practice, hard) {
  const n = (4 + Math.ceil(16 / answers)) * (hard ? 1.5 : 1) * (practice ? .5 : 1);
  return `\n• 💰 +${earn(n, "Grid square", "grid")}`;
}
function shopBonusCash(n, why, practice) {
  return `\n• 💰 ${why} bonus! +${earn(n * (practice ? .5 : 1), why, "grid")}`;
}
// map: up to $20 a round, +25% with fog of war, half outside the daily run
function shopMapCash(score, practice, fog) {
  if (score <= 0) return "";
  return ` · 💰 +${earn(score / 250 * (fog ? 1.25 : 1) * (practice ? .5 : 1), "Map Guessr round", "map")}`;
}
// tower: paid when a climb ends, about $1.5 a floor, +$40 for reaching the top; Daily Hard and Weekly pay 25% more, each Heat level 10% more,
// and New Run+ twists scale it up or down
function shopTowerCash(floors, cleared, seeded, heat = 0, mods = 1) {
  const base = (floors * 1.5 + (cleared ? 40 : 0)) * (seeded ? 1.25 : 1) * (1 + .1 * heat) * mods;
  return base >= 1 ? earn(base, "Enemy Tower climb", "tower") : 0;
}
// minigames: first run of each game every day pays full, replays pay half
function shopMiniCash(base, first, name) {
  if (base <= 0) return "";
  return `💰 +${earn(Math.min(90, base) * .25 * (first ? 1 : .5), name, "mini")}${first ? "" : " (replay: half pay)"}`;
}

// ---------- using what you own ----------
function setFlavor(f) {
  if (!SKIN[f] || !owns(f)) f = "mint";
  document.body.dataset.flavor = f;
  store.set("earthdoku-flavor", f);
}
function setWall(w) {
  if (!ITEM[w] || ITEM[w].cat !== "wall" || !owns(w)) w = "w_classic";
  shop.wall = w; document.body.dataset.wall = w;
}
const hitWord = () => (ITEM[shop.hit] && owns(shop.hit) ? ITEM[shop.hit] : ITEM.h_smash).n;
// called by the Tower when a normal run starts: empties the bag into the run
function shopTowerPack(run) {
  const got = Object.entries(shop.bag).filter(([, n]) => n > 0);
  if (!got.length) return "";
  got.forEach(([g, n]) => run.goods[g] = (run.goods[g] || 0) + n);
  shop.bag = {}; shopSave();
  const names = got.map(([g, n]) => `${n}× ${(typeof GOODS !== "undefined" && GOODS[g] ? GOODS[g].n : g)}`).join(", ");
  return `• Mr. Saturn packed your bag: ${names}. Boing!`;
}
setFlavor(store.get("earthdoku-flavor") || "mint");
setWall(shop.wall);
drawWallet();

const SAT_LINES = ["Hi HO! Me sell window. Very nice. ding!", "ZOOM! Money from grid, map, games. Bring here. boing!",
  "Window make text box pretty. Me like pretty. zoom.", "Today one thing is cheap. Look for tag! ding.",
  "Me Mr. Saturn. You customer. Happy happy. BOING!", "Wear window, take off window. Free! Only buying cost. zoom.",
  "Money not grow on tree. Me checked. boing.", "Keepsake make shelf happy. Shelf have feelings. ding!"];
const AISLES = [["skin", "🪟 Windows"], ["wall", "🖼️ Wallpapers"], ["hit", "💥 Hit text"], ["hero", "🎭 Hero skins"], ["tower", "🎒 Tower supplies"], ["keep", "🏺 Keepsakes"], ["closet", "✔ Wear & use"]];
const sv = {tab:"skin", armed:null, line:null, hg:"all"};
const prevHTML = id => `<div class="win shPrev" data-flavor="${id}"><span>• ${hitWord()}</span><small>${SKIN[id].n}</small></div>`;
const HSKIN_LIST = () => ITEMS.filter(s => s.cat === "hero" && !s.base);
function itemPrev(s) {
  if (s.cat === "skin") return prevHTML(s.id);
  if (s.cat === "wall") return `<div class="shWallPrev" data-wall="${s.id}"></div>`;
  if (s.cat === "hit") return `<div class="shHitPrev"><span>${s.n}</span></div>`;
  if (s.cat === "hero") return `<div class="shHeroPrev${s.champ && !owns(s.id) ? " dim" : ""}"><img class="twSpr" src="${HERO[s.h].spr}" alt="" referrerpolicy="no-referrer" draggable="false"${s.look ? ` style="--skf:${HLOOKS[s.look].f}"` : ""}></div>`;
  if (s.cat === "tower") { const g = typeof GOODS !== "undefined" && GOODS[s.g]; return `<div class="shIconPrev">${(g ? g.ic : "🎁").repeat(s.x)}</div>`; }
  return `<div class="shIconPrev${owns(s.id) ? "" : " dim"}">${s.ic}</div>`;
}
const inUse = s => s.cat === "skin" ? document.body.dataset.flavor === s.id : s.cat === "wall" ? shop.wall === s.id : s.cat === "hit" ? shop.hit === s.id
  : s.cat === "hero" ? (s.base ? !heroLook(s.h) : shop.heroSkin[s.h] === s.id && owns(s.id)) : false;
// wearing a hero skin; picking the one already worn (or the original) goes back to the original
function wearHero(s) {
  if (s.base || shop.heroSkin[s.h] === s.id) delete shop.heroSkin[s.h];
  else shop.heroSkin[s.h] = s.id;
}

function drawShop() {
  const deal = dealId(), wk = weeklyId(), wkItem = wk && ITEM[wk], days = weekDaysLeft();
  const wkLeft = days === 1 ? "Last day!" : `Ends in ${days} days`;
  const line = sv.line || SAT_LINES[hashStr("sat" + todayKey()) % SAT_LINES.length];
  const perm = ITEMS.filter(s => s.cat !== "tower" && !s.base), have = perm.filter(s => owns(s.id)).length;
  const earnRows = [["🎯", "Grid square", "$5–20", "rarer squares pay more"], ["⭐", "Perfect grid", "+$40", ""],
    ["🗺️", "Map Guessr round", "up to $20", "+25% in fog"], ["🕹️", "Minigame run", "up to $22", "first run each day"], ["🗼", "Tower climb", "$1.50 a floor", "+$40 at the top, +10% per Heat"]];
  const left = `<section class="win shCounter">
      <div class="shSat"><img src="${SATURN_SPR}" alt="Mr. Saturn" referrerpolicy="no-referrer"><p class="shSay">${line}</p></div>
      <div class="shPurse"><span>Your wallet</span><b>${fmt$(shop.money)}</b><small>${fmt$(shop.earned)} earned · ${fmt$(shop.spent)} spent</small></div>
      <ul class="shEarn">${earnRows.map(([i, a, b, c]) => `<li><span>${i}</span><b>${a}</b><em>${b}</em>${c ? `<small>${c}</small>` : ""}</li>`).join("")}</ul>
      <p class="shFine">Hard mode grids pay 1.5×. Infinite grids, practice maps and minigame replays pay half. Daily Hard and Weekly climbs pay 1.25×, each Tower Heat level adds 10%, New Run+ twists pay more or less depending on how hard they make the climb, and training climbs pay nothing.${owns("k_piggy") ? " 🐷 Piggy bank: +10% on everything." : ""}</p>
      ${bagCount() ? `<p class="shFine">🎒 Tower bag: ${bagCount()} item${bagCount() === 1 ? "" : "s"} waiting for your next normal run.</p>` : ""}
      ${shop.log.length ? `<div class="shLog"><span>Recent</span>${shop.log.slice(-5).reverse().map(x => `<p>${x.why}<b>+${fmt$(x.n)}</b></p>`).join("")}</div>` : ""}
    </section>`;
  const card = s => {
    const own = s.cat !== "tower" && owns(s.id), use = inUse(s), price = priceOf(s.id), weekly = s.id === wk && !own, sale = (s.id === deal || weekly) && !own, wearable = s.cat === "skin" || s.cat === "wall" || s.cat === "hit" || s.cat === "hero";
    let action;
    if (own && wearable) action = use ? `<span class="shTag on">✔ In use</span>` : `<span class="shTag got">${sv.tab === "closet" ? "Use" : "Owned · use"}</span>`;
    else if (own) action = `<span class="shTag got">✔ On your shelf</span>`;
    else if (s.champ) action = `<span class="shTag cant">🏆 Reach floor ${TW_TOP}</span>`;
    else if (sv.armed === s.id) action = `<span class="shTag buy">Sure? Buy for ${fmt$(price)}</span>`;
    else action = `<span class="shTag ${shop.money >= price ? "can" : "cant"}">${sale ? `<s>${fmt$(s.p)}</s> ` : ""}${fmt$(price)}</span>`;
    const bag = s.cat === "tower" && shop.bag[s.g] ? `<span class="shTag got">In bag: ${shop.bag[s.g]}</span>` : "";
    return `<button class="shSkin${use ? " wear" : ""}${sale ? " sale" : ""}" data-sk="${s.id}">${sale ? `<i class="shDeal">${weekly ? `🪐 ${Math.round(WEEKLY_OFF * 100)}% off this week` : "30% off today"}</i>` : ""}
      ${itemPrev(s)}<b>${s.n}</b><small>${s.d}</small><span class="shTags">${action}${bag}</span></button>`;
  };
  const counts = {skin:SKINS, wall:WALLS, hit:HITS, hero:HSKIN_LIST(), keep:KEEPS};
  const chip = ([k, l]) => `<button data-sv="${k}" class="${sv.tab === k ? "on" : ""}"${k === "hero" && wkItem && !owns(wk) ? ` title="🪐 This week: ${wkItem.n} is ${Math.round(WEEKLY_OFF * 100)}% off"` : ""}>${l}${k === "hero" && wkItem && !owns(wk) ? " 🪐" : ""}${counts[k] ? ` <small>${counts[k].filter(s => owns(s.id)).length}/${counts[k].length}</small>` : ""}</button>`;
  let body;
  if (sv.tab === "closet") {
    const cur = document.body.dataset.flavor;
    const sec = (t, list) => `<h4 class="shSec">${t}</h4><div class="shGrid sub">${list.filter(s => owns(s.id)).map(card).join("")}</div>`;
    const heroSec = HSKIN_LIST().some(s => owns(s.id)) ? sec("🎭 Hero skins", HSKIN_LIST()) : "";
    body = `<div class="shNow">${prevHTML(cur)}<div><b>Window: ${SKIN[cur].n} · Wallpaper: ${ITEM[shop.wall].n} · Hit text: ${hitWord()}</b>
        <small>Pick anything you own. Switching is always free. Wallpapers show behind every tab. Tap a hero skin you're wearing to go back to the original.</small></div></div>
      <div class="shScroll">${sec("🪟 Windows", SKINS)}${sec("🖼️ Wallpapers", WALLS)}${sec("💥 Hit text", HITS)}${heroSec}</div>`;
  } else if (sv.tab === "hero") {
    // one row per hero you've found in the Tower: original, two skins for sale, and the Champion look
    const found = HEROES.filter(h => isUnlocked(h)), shown = found.filter(h => sv.hg === "all" || h.game === sv.hg);
    const games = [["all", "All"], ...["M1", "EB", "M3"].map(g => [g, GAMES[g].l])];
    const missing = HEROES.length - found.length;
    body = `<p class="shNote">Each hero has two skins for sale and a gold Champion skin for reaching floor ${TW_TOP} with them in your party (not in training runs). Skins show everywhere in the Tower.${missing ? ` Find ${missing} more hero${missing === 1 ? "" : "es"} in the Tower to see their skins.` : ""}</p>
      <div class="chips shHeroGames" role="group" aria-label="Filter by game">${games.map(([g, l]) => `<button data-hg="${g}" class="${sv.hg === g ? "on" : ""}">${l}</button>`).join("")}</div>
      <div class="shScroll">${wkItem && !owns(wk) ? `<h4 class="shSec">🪐 Weekly special <small>${wkLeft}</small></h4><div class="shGrid sub">${card(wkItem)}</div>` : ""}${shown.length ? shown.map(h => `<div class="shHeroRow"><h4 class="shSec">${h.name} <small>${GAMES[h.game].l}</small></h4>
        <div class="shGrid sub">${ITEMS.filter(s => s.cat === "hero" && s.h === h.id).map(card).join("")}</div></div>`).join("")
        : `<p class="shNote">No heroes found here yet. Climb the Tower to meet them!</p>`}</div>`;
  } else {
    const list = ITEMS.filter(s => s.cat === sv.tab && (s.p || s.cat === "keep"));
    const note = sv.tab === "tower" ? `<p class="shNote">Supplies go in your bag and are added to your next normal Tower run (not the daily Hard climb). Buy as many as you like.</p>`
      : sv.tab === "wall" ? `<p class="shNote">Wallpapers replace the backdrop behind every tab, and inside the Enemy Tower too.</p>`
      : sv.tab === "keep" ? `<p class="shNote">Keepsakes live on your shelf. Collect them all! The Piggy bank also adds 10% to everything you earn.</p>` : "";
    body = `${note}<div class="shScroll"><div class="shGrid sub">${list.map(card).join("")}</div></div>`;
  }
  const right = `<section class="win shMain">
      <div class="shHead"><div class="chips shAisles" role="group" aria-label="Shop aisles">${AISLES.map(chip).join("")}</div>
        <span class="shCount">${have}/${perm.length} owned</span></div>
      ${body}
    </section>`;
  $("#shWrap").innerHTML = left + right;
}
$("#viewShop").addEventListener("click", ev => {
  const t = ev.target.closest("[data-sv]");
  if (t) { sv.tab = t.dataset.sv; sv.armed = null; sv.line = null; sfx("click"); return drawShop(); }
  const hg = ev.target.closest("[data-hg]");
  if (hg) { sv.hg = hg.dataset.hg; sv.armed = null; sfx("click"); return drawShop(); }
  const b = ev.target.closest("[data-sk]");
  if (!b) return;
  const id = b.dataset.sk, s = ITEM[id];
  if (s.cat !== "tower" && owns(id)) {
    if (s.cat === "skin") setFlavor(id);
    else if (s.cat === "wall") setWall(id);
    else if (s.cat === "hit") shop.hit = id;
    else if (s.cat === "hero") wearHero(s);
    sv.armed = null; shopSave();
    sv.line = s.cat === "keep" ? `${s.n}. ${s.d} Me dust it every day. zoom.` : s.cat === "hero" && !inUse(s) ? `${HERO[s.h].name} back to normal. Also nice. ding.` : `${s.n}! Good choice. ding!`;
    sfx("ok");
  } else if (s.champ) {
    sv.armed = null; sv.line = `Gold ${HERO[s.h].name} only for champion. Reach floor ${TW_TOP} with ${HERO[s.h].name} in party! boing.`; sfx("bad");
  } else if (shop.money < priceOf(id)) {
    sv.armed = null; sv.line = `Need ${fmt$(priceOf(id) - shop.money)} more. Play grid, map, games! boing.`; sfx("bad");
  } else if (sv.armed !== id) {
    sv.armed = id; sv.line = `${s.n}? ${fmt$(priceOf(id))}. Tap again, it yours. zoom!`; sfx("click");
  } else {
    const p = priceOf(id);
    shop.money -= p; shop.spent += p; sv.armed = null;
    if (s.cat === "tower") { shop.bag[s.g] = (shop.bag[s.g] || 0) + s.x; sv.line = `${s.n} in your bag! Use in tower. BOING!`; }
    else {
      shop.owned.push(id);
      if (s.cat === "skin") setFlavor(id);
      else if (s.cat === "wall") setWall(id);
      else if (s.cat === "hit") shop.hit = id;
      else if (s.cat === "hero") shop.heroSkin[s.h] = id;
      sv.line = s.cat === "keep" ? `${s.n} go on shelf now. Shelf happy! DING!` : `Thank you! ${s.n} yours now! DING! BOING!`;
    }
    shopSave(); drawWallet(true); sfx("reward");
    if (window.checkAch) checkAch();
  }
  drawShop();
});
window.onShopShow = () => { sv.armed = null; sv.line = null; drawShop(); };
