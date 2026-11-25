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
  {id:"t_horn", n:"Horn of life", p:220, g:"horn", x:1, d:"Revives a fallen friend at full HP."},
  {id:"t_bell", n:"Friend bell", p:400, ic:"🔔", bell:true, x:1, d:"Rings when you reach the top of the Tower, and a hero you haven't met yet comes running. Only used up once it brings someone."}
].map(s => ({...s, cat:"tower"}));
// keepsakes used to be sold here. They're gone now, and anyone who bought some gets their money back (see below)
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
// the mystery bag: a random skin you don't own yet. Like supplies, it can be bought again and again
const MYSTERY = [{id:"m_bag", n:"Mystery bag", p:300, ic:"🎁", cat:"mystery", d:"A random skin you don't own yet: a window skin, or a hero skin for someone you've found. Some are worth way more than $300!"}];
const ITEMS = [...SKINS, ...WALLS, ...HITS, ...SUPPLIES, ...MYSTERY];
// things you buy again and again instead of owning once
const bagLike = s => s.cat === "tower" || s.cat === "mystery";
const ITEM = Object.fromEntries(ITEMS.map(s => [s.id, s]));
const SKIN = Object.fromEntries(SKINS.map(s => [s.id, s]));
const FREE = ITEMS.filter(s => !s.p && !bagLike(s)).map(s => s.id);
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
const dealId = () => { const pool = ITEMS.filter(s => s.p && !bagLike(s) && s.cat !== "hero"); return pool[hashStr("saturn-deal-" + todayKey()) % pool.length].id; };
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
// the Friend bell: one at a time, kept until it actually brings a new hero to the top of the Tower
const bellLeft = () => typeof HEROES === "undefined" ? [] : HEROES.filter(h => !tw.found.includes(h.id));
function bellCheck() {
  // everyone was found some other way while the bell was waiting: Mr. Saturn gives the money back
  if (shop.bell && typeof HEROES !== "undefined" && !bellLeft().length) {
    shop.bell = false; shop.money += ITEM.t_bell.p; shopSave(); drawWallet(true);
    sv.line = `You found everyone already! Bell money back, ${fmt$(ITEM.t_bell.p)}. ding!`;
  }
}

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
  n = Math.max(1, Math.round(n));
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
// minigames: first run of each game every day pays full, replays pay half; some games pay extra (mult)
function shopMiniCash(base, first, name, mult = 1) {
  if (base <= 0) return "";
  return `💰 +${earn(Math.min(90, base) * .25 * mult * (first ? 1 : .5), name, "mini")}${mult > 1 ? ` (×${mult} bonus game)` : ""}${first ? "" : " (replay: half pay)"}`;
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
// keepsakes were taken out of the shop: anything you bought is refunded at full price, once
(() => {
  const had = KEEPS.filter(k => shop.owned.includes(k.id));
  if (!had.length) return;
  const back = had.reduce((s, k) => s + k.p, 0);
  shop.owned = shop.owned.filter(id => !KEEPS.some(k => k.id === id));
  shop.money += back; shop.spent = Math.max(0, shop.spent - back);
  shopSave(); drawWallet(true);
  toast(`<img class="tSat" src="${SATURN_SPR}" alt="" referrerpolicy="no-referrer"><div><b>Saturn's shop</b><br><small>Keepsakes are gone from the shop, so Mr. Saturn gave back ${fmt$(back)} for your ${had.length} keepsake${had.length === 1 ? "" : "s"}. Boing!</small></div>`);
})();

const SAT_LINES = ["Hi HO! Me sell window. Very nice. ding!", "ZOOM! Money from grid, map, games. Bring here. boing!",
  "Window make text box pretty. Me like pretty. zoom.", "Today one thing is cheap. Look for tag! ding.",
  "Me Mr. Saturn. You customer. Happy happy. BOING!", "Wear window, take off window. Free! Only buying cost. zoom.",
  "Money not grow on tree. Me checked. boing.", "Me sell hero clothes now. Closet very fancy. ding!"];
const AISLES = [["skin", "🪟 Windows"], ["wall", "🖼️ Wallpapers"], ["hit", "💥 Hit text"], ["wardrobe", "👗 Closet"], ["tower", "🎒 Tower supplies"], ["mystery", "🎁 Mystery bag"]];
const sv = {tab:"skin", armed:null, line:null, hg:"all", ch:null, cs:null, spin:0};
// heroes shown in the Closet carousel: everyone you've found, filtered by game
const clList = () => typeof HEROES === "undefined" ? [] : HEROES.filter(h => !h.mine && isUnlocked(h) && (sv.hg === "all" || h.game === sv.hg));
function clStep(d) {
  const list = clList(), n = list.length;
  if (n < 2) return;
  const i = list.findIndex(h => h.id === sv.ch);
  sv.ch = list[((i + d) % n + n) % n].id; sv.cs = null; sv.armed = null; sv.spin = d;
  sfx("click"); drawShop();
}
const prevHTML = id => `<div class="win shPrev" data-flavor="${id}"><span>• ${hitWord()}</span><small>${SKIN[id].n}</small></div>`;
const HSKIN_LIST = () => ITEMS.filter(s => s.cat === "hero" && !s.base);
// ---------- random cosmetics: the mystery bag and the Tower's golden chests ----------
// anything sold that you don't own yet; hero skins only for heroes you've found, and never Champion looks
const lootable = s => s.p && !owns(s.id) && !s.champ && !bagLike(s) &&
  (s.cat !== "hero" || (typeof isUnlocked === "function" && HERO[s.h] && !HERO[s.h].mine && isUnlocked(HERO[s.h])));
const mysteryPool = () => ITEMS.filter(s => lootable(s) && (s.cat === "skin" || s.cat === "hero"));
const chestPool = () => ITEMS.filter(s => lootable(s) && ["skin", "wall", "hit", "hero"].includes(s.cat));
const LOOT_KIND = {skin:"🪟 Window skin", wall:"🖼️ Wallpaper", hit:"💥 Hit text", hero:"👗 Hero skin"};
function shopUnlock(pool) {
  if (!pool.length) return null;
  const s = pool[Math.floor(Math.random() * pool.length)];
  shop.owned.push(s.id); shopSave();
  if (window.checkAch) checkAch();
  return s;
}
// put on something you just won
function useItem(s) {
  if (s.cat === "skin") setFlavor(s.id);
  else if (s.cat === "wall") setWall(s.id);
  else if (s.cat === "hit") shop.hit = s.id;
  else if (s.cat === "hero") shop.heroSkin[s.h] = s.id;
  shopSave();
}
// the big reveal: the bag (or chest) shakes, then pops open
function showLoot(s, from) {
  const worth = s.p > 300 ? `<small class="lootWorth">Worth ${fmt$(s.p)} in the shop!</small>` : "";
  openModal(`${from === "chest" ? "💎 Golden chest" : "🎁 Mystery bag"}`, `<div class="lootBox">
    <div class="lootShake" id="lootShake">${from === "chest" ? "💎" : "🎁"}</div>
    <div class="lootPrize" id="lootPrize" hidden>
      <div class="lootPrev">${itemPrev(s)}</div>
      <small class="lootKind">${LOOT_KIND[s.cat] || "Cosmetic"}</small><b>${s.n}</b><small>${s.d || ""}</small>${worth}
      <div class="actions"><button class="btn hot" id="lootUse">${s.cat === "hero" ? "👗 Wear it" : "✨ Use it now"}</button><button class="btn" id="lootOk">Keep it for later</button></div>
    </div></div>`);
  const pop = () => { const a = $("#lootShake"), b = $("#lootPrize"); if (!a || !b) return; a.hidden = true; b.hidden = false; sfx("reward"); };
  setTimeout(pop, matchMedia("(prefers-reduced-motion:reduce)").matches ? 0 : 900);
  $("#lootShake").onclick = pop;
  $("#lootUse").onclick = () => { useItem(s); closeModal(); sfx("ok"); if (!$("#viewShop").hidden) drawShop(); if (window.drawTower && !$("#viewTower").hidden) drawTower(); };
  $("#lootOk").onclick = () => { closeModal(); if (!$("#viewShop").hidden) drawShop(); };
}
// called by the Tower's golden chest: a random cosmetic, or money once you own everything
function shopTowerChest() {
  const s = shopUnlock(chestPool());
  if (s) { setTimeout(() => showLoot(s, "chest"), 350); return {item:s}; }
  return {cash:earn(60, "Golden chest", "tower")};
}
function itemPrev(s) {
  if (s.cat === "skin") return prevHTML(s.id);
  if (s.cat === "wall") return `<div class="shWallPrev" data-wall="${s.id}"></div>`;
  if (s.cat === "hit") return `<div class="shHitPrev"><span>${s.n}</span></div>`;
  if (s.cat === "hero") return `<div class="shHeroPrev${s.champ && !owns(s.id) ? " dim" : ""}">${skinImg(HERO[s.h].spr, s.look)}</div>`;
  if (s.cat === "mystery") return `<div class="shIconPrev mys">🎁</div>`;
  if (s.cat === "tower") { const g = typeof GOODS !== "undefined" && GOODS[s.g]; return `<div class="shIconPrev${s.bell && shop.bell ? " ring" : ""}">${(g ? g.ic : s.ic || "🎁").repeat(s.x)}</div>`; }
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
  bellCheck();
  const deal = dealId(), wk = weeklyId(), wkItem = wk && ITEM[wk], days = weekDaysLeft();
  const wkLeft = days === 1 ? "Last day!" : `Ends in ${days} days`;
  const line = sv.line || SAT_LINES[hashStr("sat" + todayKey()) % SAT_LINES.length];
  const perm = ITEMS.filter(s => !bagLike(s) && !s.base), have = perm.filter(s => owns(s.id)).length;
  const earnRows = [["🎯", "Grid square", "$5–20", "rarer squares pay more"], ["⭐", "Perfect grid", "+$40", ""],
    ["🗺️", "Map Guessr round", "up to $20", "+25% in fog"], ["🕹️", "Minigame run", "up to $22", "$34 in bonus games"], ["🗼", "Tower climb", "$1.50 a floor", "+$40 at the top, +10% per Heat"]];
  const left = `<section class="win shCounter">
      <div class="shSat"><img src="${SATURN_SPR}" alt="Mr. Saturn" referrerpolicy="no-referrer"><p class="shSay">${line}</p></div>
      <div class="shPurse"><span>Your wallet</span><b>${fmt$(shop.money)}</b><small>${fmt$(shop.earned)} earned · ${fmt$(shop.spent)} spent</small></div>
      <ul class="shEarn">${earnRows.map(([i, a, b, c]) => `<li><span>${i}</span><b>${a}</b><em>${b}</em>${c ? `<small>${c}</small>` : ""}</li>`).join("")}</ul>
      <p class="shFine">Hard mode grids pay 1.5×. Infinite grids, practice maps and minigame replays pay half. Daily Hard and Weekly climbs pay 1.25×, each Tower Heat level adds 10%, New Run+ twists pay more or less depending on how hard they make the climb, and training climbs pay nothing.</p>
      ${bagCount() ? `<p class="shFine">🎒 Tower bag: ${bagCount()} item${bagCount() === 1 ? "" : "s"} waiting for your next normal run.</p>` : ""}
      ${shop.log.length ? `<div class="shLog"><span>Recent</span>${shop.log.slice(-5).reverse().map(x => `<p>${x.why}<b>+${fmt$(x.n)}</b></p>`).join("")}</div>` : ""}
    </section>`;
  const card = s => {
    const own = !bagLike(s) && owns(s.id), use = inUse(s), price = priceOf(s.id), weekly = s.id === wk && !own, sale = (s.id === deal || weekly) && !own, wearable = s.cat === "skin" || s.cat === "wall" || s.cat === "hit" || s.cat === "hero";
    let action;
    if (own && wearable) action = use ? `<span class="shTag on">✔ In use</span>` : `<span class="shTag got">${sv.tab === "closet" ? "Use" : "Owned · use"}</span>`;

    else if (s.champ) action = `<span class="shTag cant">🏆 Reach floor ${TW_TOP}</span>`;
    else if (sv.armed === s.id) action = `<span class="shTag buy">Sure? Buy for ${fmt$(price)}</span>`;
    else action = `<span class="shTag ${shop.money >= price ? "can" : "cant"}">${sale ? `<s>${fmt$(s.p)}</s> ` : ""}${fmt$(price)}</span>`;
    const bag = s.cat === "mystery" ? `<span class="shTag got">${mysteryPool().length ? `${mysteryPool().length} skins left inside` : "Nothing left: you own every skin!"}</span>`
      : s.bell ? (shop.bell ? `<span class="shTag got">🔔 Ready for your next climb to the top</span>` : !bellLeft().length ? `<span class="shTag got">Everyone found!</span>` : "")
      : s.cat === "tower" && shop.bag[s.g] ? `<span class="shTag got">In bag: ${shop.bag[s.g]}</span>` : "";
    return `<button class="shSkin${use ? " wear" : ""}${sale ? " sale" : ""}" data-sk="${s.id}">${sale ? `<i class="shDeal">${weekly ? `🪐 ${Math.round(WEEKLY_OFF * 100)}% off this week` : "30% off today"}</i>` : ""}
      ${itemPrev(s)}<b>${s.n}</b><small>${s.d}</small><span class="shTags">${action}${bag}</span></button>`;
  };
  const counts = {skin:SKINS, wall:WALLS, hit:HITS, wardrobe:HSKIN_LIST()};
  const chip = ([k, l]) => `<button data-sv="${k}" class="${sv.tab === k ? "on" : ""}"${k === "wardrobe" && wkItem && !owns(wk) ? ` title="🪐 This week: ${wkItem.n} is ${Math.round(WEEKLY_OFF * 100)}% off"` : ""}>${l}${k === "wardrobe" && wkItem && !owns(wk) ? " 🪐" : ""}${counts[k] ? ` <small>${counts[k].filter(s => owns(s.id)).length}/${counts[k].length}</small>` : ""}</button>`;
  let body;
  if (sv.tab === "closet") {
    const cur = document.body.dataset.flavor;
    const sec = (t, list) => `<h4 class="shSec">${t}</h4><div class="shGrid sub">${list.filter(s => owns(s.id)).map(card).join("")}</div>`;
    const heroSec = HSKIN_LIST().some(s => owns(s.id)) ? sec("🎭 Hero skins", HSKIN_LIST()) : "";
    body = `<div class="shNow">${prevHTML(cur)}<div><b>Window: ${SKIN[cur].n} · Wallpaper: ${ITEM[shop.wall].n} · Hit text: ${hitWord()}</b>
        <small>Pick anything you own. Switching is always free. Wallpapers show behind every tab. Tap a hero skin you're wearing to go back to the original.</small></div></div>
      <div class="shScroll">${sec("🪟 Windows", SKINS)}${sec("🖼️ Wallpapers", WALLS)}${sec("💥 Hit text", HITS)}${heroSec}</div>`;
  } else if (sv.tab === "wardrobe") {
    // the Closet: spin through your heroes, try on every skin, then buy it or wear it
    const games = [["all", "All"], ...["M1", "EB", "M3"].map(g => [g, GAMES[g].l])], list = clList();
    const missing = HEROES.filter(h => !isUnlocked(h)).length;
    const gameChips = `<div class="chips shHeroGames" role="group" aria-label="Filter by game">${games.map(([g, l]) => `<button data-hg="${g}" class="${sv.hg === g ? "on" : ""}">${l}</button>`).join("")}</div>`;
    if (!list.length) body = `<div class="clTop">${gameChips}</div><p class="shNote">No heroes found here yet. Climb the Tower to meet them!</p>`;
    else {
      if (!list.some(h => h.id === sv.ch)) { sv.ch = list[0].id; sv.cs = null; }
      const n = list.length, i = list.findIndex(h => h.id === sv.ch), h = HERO[sv.ch];
      const skins = ITEMS.filter(s => s.cat === "hero" && s.h === h.id).sort((a, c) => !!a.champ - !!c.champ);
      if (!skins.some(s => s.id === sv.cs)) sv.cs = (skins.find(s => inUse(s)) || skins[0]).id;
      const sel = ITEM[sv.cs], look = s => s.look, shortN = s => s.base ? "Original" : HLOOKS[s.look].n;
      const img = (hh, lk, cls = "") => skinImg(hh.spr, lk, cls);
      const sale = s => !owns(s.id) && (s.id === wk || s.id === deal);
      const priceTag = s => `${sale(s) ? `<s>${fmt$(s.p)}</s> ` : ""}${fmt$(priceOf(s.id))}`;
      // the carousel: the hero you're dressing in the middle, neighbours shrinking away on each side
      const around = n === 1 ? [0] : n === 2 ? [0, 1] : n <= 4 ? [-1, 0, 1] : [-2, -1, 0, 1, 2];
      const cards = around.map(o => {
        const hh = list[((i + o) % n + n) % n], mine = ITEMS.filter(s => s.cat === "hero" && s.h === hh.id && !s.base);
        return `<button class="clCard p${o}" data-ch="${hh.id}" aria-label="${hh.name}"${o ? ` tabindex="-1"` : ""}>${img(hh, heroLook(hh.id))}<b>${hh.name}</b>
          <small>${mine.filter(s => owns(s.id)).length}/${mine.length}${wkItem && wkItem.h === hh.id && !owns(wk) ? " 🪐" : ""}</small></button>`; }).join("");
      // the big button: wear it, take it off, buy it, or what's needed for the Champion look
      let act;
      if (owns(sel.id)) act = inUse(sel) ? `<button class="btn clBtn on" data-sk="${sel.id}"${sel.base ? " disabled" : ""}>✔ Wearing${sel.base ? "" : " · tap to take off"}</button>` : `<button class="btn hot clBtn" data-sk="${sel.id}">Wear it</button>`;
      else if (sel.champ) act = `<button class="btn clBtn" data-sk="${sel.id}">🏆 Reach floor ${TW_TOP} with ${h.name}</button>`;
      else if (sv.armed === sel.id) act = `<button class="btn hot clBtn buy" data-sk="${sel.id}">Sure? Buy for ${fmt$(priceOf(sel.id))}</button>`;
      else act = `<button class="btn ${shop.money >= priceOf(sel.id) ? "hot" : ""} clBtn" data-sk="${sel.id}">Buy · ${priceTag(sel)}</button>`;
      const swatch = s => { const tag = inUse(s) ? "✔ Wearing" : owns(s.id) ? "Owned" : s.champ ? "🏆 Earn it" : `${s.id === wk ? "🪐 " : ""}${priceTag(s)}`;
        return `<button class="clSw${s.id === sel.id ? " on" : ""}${inUse(s) ? " wear" : ""}${!owns(s.id) ? " notmine" : ""}" data-cs="${s.id}" aria-pressed="${s.id === sel.id}">
          <span class="clSwArt">${img(h, look(s))}</span><b>${shortN(s)}</b><small>${tag}</small></button>`; };
      const kind = sel.base ? "The look they started with" : sel.champ ? "Champion skin" : sel.anim ? "Moving skin" : sel.sig ? `Made just for ${h.name}` : "Color skin";
      const tip = `Tap a skin to try it on. Every hero has two color skins, a signature look, a moving skin, and a gold Champion skin for reaching floor ${TW_TOP} with them (not in training runs). Skins show everywhere in the Tower.${missing ? ` Find ${missing} more hero${missing === 1 ? "" : "es"} in the Tower to fill the Closet.` : ""}`;
      // everything fits the panel without scrolling: the try-on spotlight shrinks to whatever room is left
      body = `<div class="clTop">${gameChips}<span class="clTip" title="${tip}" tabindex="0" aria-label="${tip}">ⓘ How it works</span>${wkItem && !owns(wk) ? `<button class="btn twSmall clWeek" data-ch="${wkItem.h}" data-cs="${wk}">🪐 Weekly special: ${wkItem.n} · ${wkLeft}</button>` : ""}</div>
        <div class="clFit"><div class="clCar" aria-label="Heroes: use the arrow keys, swipe, or tap a side card">
          <button class="clNav" data-cl="-1" aria-label="Previous hero"${n < 2 ? " disabled" : ""}>◀</button>
          <div class="clStage${sv.spin ? (sv.spin > 0 ? " spinR" : " spinL") : ""}">${cards}</div>
          <button class="clNav" data-cl="1" aria-label="Next hero"${n < 2 ? " disabled" : ""}>▶</button></div>
        <div class="clMain">
          <div class="clBig"><span class="clSpot"></span>${img(h, look(sel), "big")}</div>
          <div class="clInfo"><span class="clWho">${h.name} ${badge({game:h.game})} <small>${i + 1}/${n}</small></span>
            <b class="clName">${shortN(sel)}</b><em class="clKind">${kind}</em><small>${sel.d}</small>
            <div class="clAct">${act}</div></div></div>
        <div class="clSkins" role="group" aria-label="${h.name}'s skins">${skins.map(swatch).join("")}</div></div>`;
      sv.spin = 0;
    }
  } else {
    const list = ITEMS.filter(s => s.cat === sv.tab && s.p);
    const note = sv.tab === "tower" ? `<p class="shNote">Supplies go in your bag and are added to your next normal Tower run (not the daily Hard climb). Buy as many as you like. The 🔔 Friend bell is different: it waits, one at a time, until you reach the top of a climb, then brings a hero you haven't met.</p>`
      : sv.tab === "mystery" ? `<p class="shNote">Every bag holds one skin you don't own yet: a window skin, or a hero skin for any hero you've found in the Tower (Champion looks aren't in there). Some are worth a lot more than the bag. Golden chests in the Tower can hold any kind of cosmetic, including wallpapers and hit text.</p>`
      : sv.tab === "wall" ? `<p class="shNote">Wallpapers replace the backdrop behind every tab, and inside the Enemy Tower too.</p>`
      : "";
    body = `${note}<div class="shScroll"><div class="shGrid sub">${list.map(card).join("")}</div></div>`;
  }
  const right = `<section class="win shMain">
      <div class="shHead"><div class="chips shAisles" role="group" aria-label="Shop aisles">${AISLES.map(chip).join("")}</div>
        <span class="shCount">${have}/${perm.length} owned</span>
        <button class="shWearBtn${sv.tab === "closet" ? " on" : ""}" data-sv="closet" title="Wear & use: switch to anything you own" aria-label="Wear and use" aria-pressed="${sv.tab === "closet"}">✅</button></div>
      ${body}
    </section>`;
  $("#shWrap").innerHTML = left + right;
}
$("#viewShop").addEventListener("click", ev => {
  const t = ev.target.closest("[data-sv]");
  if (t) { sv.tab = t.dataset.sv; sv.armed = null; sv.line = null; sfx("click"); return drawShop(); }
  const hg = ev.target.closest("[data-hg]");
  if (hg) { sv.hg = hg.dataset.hg; sv.armed = null; sfx("click"); return drawShop(); }
  // Closet: arrows spin the carousel, side cards jump to that hero, swatches try a skin on
  if (clSwiped && Date.now() - clSwiped < 300) return;
  const cl = ev.target.closest("[data-cl]");
  if (cl) return clStep(+cl.dataset.cl);
  const ch = ev.target.closest("[data-ch]"), cs = ev.target.closest("[data-cs]");
  if (ch || cs) {
    if (ch) { const to = clList().findIndex(h => h.id === ch.dataset.ch), at = clList().findIndex(h => h.id === sv.ch); if (to < 0) sv.hg = "all"; sv.spin = to > at ? 1 : to < at ? -1 : 0; sv.ch = ch.dataset.ch; sv.cs = null; }
    if (cs) sv.cs = cs.dataset.cs;
    sv.armed = null; sfx("click"); return drawShop();
  }
  const b = ev.target.closest("[data-sk]");
  if (!b) return;
  const id = b.dataset.sk, s = ITEM[id];
  if (!bagLike(s) && owns(id)) {
    if (s.cat === "skin") setFlavor(id);
    else if (s.cat === "wall") setWall(id);
    else if (s.cat === "hit") shop.hit = id;
    else if (s.cat === "hero") wearHero(s);
    sv.armed = null; shopSave();
    sv.line = s.cat === "hero" && !inUse(s) ? `${HERO[s.h].name} back to normal. Also nice. ding.` : `${s.n}! Good choice. ding!`;
    sfx("ok");
  } else if (s.champ) {
    sv.armed = null; sv.line = `Gold ${HERO[s.h].name} only for champion. Reach floor ${TW_TOP} with ${HERO[s.h].name} in party! boing.`; sfx("bad");
  } else if (s.cat === "mystery" && !mysteryPool().length) {
    sv.armed = null; sfx("bad"); sv.line = "Bag empty! You own every skin already. Wow. boing.";
  } else if (s.bell && (shop.bell || !bellLeft().length)) {
    sv.armed = null; sfx("bad");
    sv.line = shop.bell ? "You have bell already! It rings at top of tower. One is plenty. boing." : "Everyone already your friend! No bell needed. ding.";
  } else if (shop.money < priceOf(id)) {
    sv.armed = null; sv.line = `Need ${fmt$(priceOf(id) - shop.money)} more. Play grid, map, games! boing.`; sfx("bad");
  } else if (sv.armed !== id) {
    sv.armed = id; sv.line = `${s.n}? ${fmt$(priceOf(id))}. Tap again, it yours. zoom!`; sfx("click");
  } else {
    const p = priceOf(id);
    shop.money -= p; shop.spent += p; sv.armed = null;
    if (s.cat === "mystery") { const got = shopUnlock(mysteryPool()); sv.line = got ? `${got.n}! Lucky lucky. DING!` : "Bag empty?! Strange. boing."; if (got) setTimeout(() => showLoot(got, "bag"), 50); }
    else if (s.bell) { shop.bell = true; sv.line = "Friend bell yours! Reach top of tower and ring ring, new friend come. Bell stay until then. DING!"; }
    else if (s.cat === "tower") { shop.bag[s.g] = (shop.bag[s.g] || 0) + s.x; sv.line = `${s.n} in your bag! Use in tower. BOING!`; }
    else {
      shop.owned.push(id);
      if (s.cat === "skin") setFlavor(id);
      else if (s.cat === "wall") setWall(id);
      else if (s.cat === "hit") shop.hit = id;
      else if (s.cat === "hero") shop.heroSkin[s.h] = id;
      sv.line = `Thank you! ${s.n} yours now! DING! BOING!`;
    }
    shopSave(); drawWallet(true); sfx("reward");
    if (window.checkAch) checkAch();
  }
  drawShop();
});
window.onShopShow = () => { sv.armed = null; sv.line = null; drawShop(); };
// Closet controls: arrow keys spin the carousel (up and down flip through skins), and you can swipe it too
let clSx = null, clSwiped = 0;
document.addEventListener("keydown", ev => {
  if ($("#viewShop").hidden || sv.tab !== "wardrobe" || !$("#modal").hidden) return;
  if (ev.target.closest && ev.target.closest("input,textarea,select")) return;
  if (ev.key === "ArrowLeft" || ev.key === "ArrowRight") { ev.preventDefault(); clStep(ev.key === "ArrowLeft" ? -1 : 1); }
  else if ((ev.key === "ArrowUp" || ev.key === "ArrowDown") && sv.ch) {
    ev.preventDefault();
    const skins = ITEMS.filter(s => s.cat === "hero" && s.h === sv.ch).sort((a, c) => !!a.champ - !!c.champ), i = skins.findIndex(s => s.id === sv.cs);
    sv.cs = skins[((i + (ev.key === "ArrowDown" ? 1 : -1)) % skins.length + skins.length) % skins.length].id; sv.armed = null; sfx("click"); drawShop();
  }
});
$("#viewShop").addEventListener("pointerdown", ev => { clSx = ev.target.closest(".clCar") && !ev.target.closest(".clNav") ? ev.clientX : null; });
$("#viewShop").addEventListener("pointerup", ev => {
  if (clSx == null) return;
  const dx = ev.clientX - clSx; clSx = null;
  if (Math.abs(dx) > 40) { clSwiped = Date.now(); clStep(dx < 0 ? 1 : -1); }
});
