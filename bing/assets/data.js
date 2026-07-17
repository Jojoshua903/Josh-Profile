/* ============================================================
   WIDR VALLEY — data.js
   All game CONTENT lives here as plain data so it's trivial to
   expand. Add a crop / item / NPC / quest by editing an object.
   Referenced globally as window.DATA.
   ============================================================ */

const DATA = {};

/* ---------- Seasons ---------- */
DATA.SEASONS = ["Spring", "Summer", "Autumn", "Winter"];
DATA.DAYS_PER_SEASON = 28;

/* ---------- Items ----------
   type: tool | seed | crop | product | material | food
   emoji is our stand-in for a pixel sprite (keeps it single-repo,
   swap for image sprites later by giving each item a `sprite`).      */
DATA.ITEMS = {
  // tools
  hoe:        { name: "Hoe",         emoji: "⛏️", type: "tool", stack: 1 },
  wateringcan:{ name: "Watering Can",emoji: "🪣", type: "tool", stack: 1 },
  axe:        { name: "Axe",         emoji: "🪓", type: "tool", stack: 1 },
  pickaxe:    { name: "Pickaxe",     emoji: "⚒️", type: "tool", stack: 1 },
  scythe:     { name: "Scythe",      emoji: "🌾", type: "tool", stack: 1 },
  sword:      { name: "Kaasvet Blade",emoji:"🗡️", type: "tool", stack: 1 },
  rod:        { name: "Fishing Rod", emoji: "🎣", type: "tool", stack: 1 },
  // weapons (type "weapon"; profile lives in DATA.WEAPONS keyed by id)
  club:       { name:"Widr Club", emoji:"🏏", type:"weapon", stack:1, price:600 },
  dagger:     { name:"Swift Dagger", emoji:"🔪", type:"weapon", stack:1, price:500 },
  bow:        { name:"Hunter's Bow", emoji:"🏹", type:"weapon", stack:1, price:900 },
  staff:      { name:"Kaas Staff", emoji:"🪄", type:"weapon", stack:1, price:1400 },
  // armor (type "armor"; def = damage reduction)
  leather_armor:{ name:"Leather Vest", emoji:"🦺", type:"armor", stack:1, price:400, def:2 },
  iron_armor:   { name:"Iron Plate", emoji:"🛡️", type:"armor", stack:1, price:1500, def:5 },
  gold_armor:   { name:"Gold Aegis", emoji:"✴️", type:"armor", stack:1, price:5000, def:9 },
  // potions (type "potion")
  hp_potion:  { name:"Health Potion", emoji:"❤️", type:"potion", stack:99, price:120, heal:40 },
  mana_potion:{ name:"Mana Potion", emoji:"🔵", type:"potion", stack:99, price:120, mana:40 },
  mega_potion:{ name:"Mega Elixir", emoji:"🧪", type:"potion", stack:99, price:400, heal:100, mana:100 },

  // seeds
  parsnip_seed:{ name:"Parsnip Seeds", emoji:"🌱", type:"seed", stack:99, crop:"parsnip", price:20 },
  cauli_seed:  { name:"Cauliflower Seeds", emoji:"🌱", type:"seed", stack:99, crop:"cauliflower", price:40 },
  potato_seed: { name:"Potato Seeds", emoji:"🌱", type:"seed", stack:99, crop:"potato", price:30 },
  kale_seed:   { name:"Kale Seeds", emoji:"🌱", type:"seed", stack:99, crop:"kale", price:35 },
  strawberry_seed:{ name:"Strawberry Seeds", emoji:"🌱", type:"seed", stack:99, crop:"strawberry", price:70 },
  melon_seed:  { name:"Melon Seeds", emoji:"🌱", type:"seed", stack:99, crop:"melon", price:60 },
  tomato_seed: { name:"Tomato Seeds", emoji:"🌱", type:"seed", stack:99, crop:"tomato", price:45 },
  blueberry_seed:{ name:"Blueberry Seeds", emoji:"🌱", type:"seed", stack:99, crop:"blueberry", price:80 },
  pumpkin_seed:{ name:"Pumpkin Seeds", emoji:"🌱", type:"seed", stack:99, crop:"pumpkin", price:50 },
  cranberry_seed:{ name:"Cranberry Seeds", emoji:"🌱", type:"seed", stack:99, crop:"cranberry", price:90 },
  wheat_seed:  { name:"Wheat Seeds", emoji:"🌱", type:"seed", stack:99, crop:"wheat", price:15 },

  // crops (harvested)
  parsnip:    { name:"Parsnip",     emoji:"🥕", type:"crop", stack:99, price:35 },
  cauliflower:{ name:"Cauliflower", emoji:"🥦", type:"crop", stack:99, price:90 },
  potato:     { name:"Potato",      emoji:"🥔", type:"crop", stack:99, price:60 },
  kale:       { name:"Kale",        emoji:"🥬", type:"crop", stack:99, price:70 },
  strawberry: { name:"Strawberry",  emoji:"🍓", type:"crop", stack:99, price:75 },
  melon:      { name:"Melon",       emoji:"🍈", type:"crop", stack:99, price:130 },
  tomato:     { name:"Tomato",      emoji:"🍅", type:"crop", stack:99, price:55 },
  blueberry:  { name:"Blueberry",   emoji:"🫐", type:"crop", stack:99, price:90 },
  pumpkin:    { name:"Pumpkin",     emoji:"🎃", type:"crop", stack:99, price:160 },
  cranberry:  { name:"Cranberry",   emoji:"🔴", type:"crop", stack:99, price:110 },
  wheat:      { name:"Wheat",       emoji:"🌾", type:"crop", stack:99, price:25 },

  // animal products
  egg:        { name:"Egg",   emoji:"🥚", type:"product", stack:99, price:50 },
  milk:       { name:"Milk",  emoji:"🥛", type:"product", stack:99, price:125 },
  wool:       { name:"Wool",  emoji:"🧶", type:"product", stack:99, price:340 },
  cheese:     { name:"Cheese",emoji:"🧀", type:"product", stack:99, price:230 },
  mayo:       { name:"Mayonnaise", emoji:"🫙", type:"product", stack:99, price:190 },
  truffle:    { name:"Truffle", emoji:"🍄", type:"product", stack:99, price:625 },
  duck_egg:   { name:"Duck Egg", emoji:"🥚", type:"product", stack:99, price:95 },

  // foraging / mining
  wood:       { name:"Wood",  emoji:"🪵", type:"material", stack:99, price:5 },
  stone:      { name:"Stone", emoji:"🪨", type:"material", stack:99, price:4 },
  fiber:      { name:"Fiber", emoji:"🌾", type:"material", stack:99, price:3 },
  // fertilizers (applied to tilled soil before/after planting)
  fertilizer: { name:"Basic Fertilizer", emoji:"💩", type:"fertilizer", stack:99, price:20, tier:1 },
  quality_fertilizer:{ name:"Quality Fertilizer", emoji:"🌰", type:"fertilizer", stack:99, price:60, tier:2 },
  deluxe_fertilizer:{ name:"Deluxe Fertilizer", emoji:"✨", type:"fertilizer", stack:99, price:150, tier:3 },
  copper:     { name:"Copper Ore", emoji:"🟤", type:"material", stack:99, price:20 },
  iron:       { name:"Iron Ore",   emoji:"⬜", type:"material", stack:99, price:40 },
  gold:       { name:"Gold Ore",   emoji:"🟡", type:"material", stack:99, price:80 },
  iridium:    { name:"Iridium Ore", emoji:"🟣", type:"material", stack:99, price:180 },
  gem:        { name:"Widr Gem",   emoji:"💎", type:"material", stack:99, price:300 },
  coal:       { name:"Coal", emoji:"⚫", type:"material", stack:99, price:15 },
  bomb:       { name:"Bomb", emoji:"💣", type:"bomb", stack:99, price:120 },
  prismatic:  { name:"Prismatic Shard", emoji:"🔱", type:"material", stack:99, price:2500 },
  // forageables
  berry:      { name:"Wild Berry", emoji:"🍒", type:"product", stack:99, price:20 },
  mushroom:   { name:"Mushroom", emoji:"🍄", type:"product", stack:99, price:40 },
  shell:      { name:"Sea Shell", emoji:"🐚", type:"product", stack:99, price:30 },
  fish:       { name:"River Fish", emoji:"🐟", type:"product", stack:99, price:45 },
  legend_fish:{ name:"The Riverbend Legend", emoji:"🐋", type:"product", stack:99, price:5000 },

  // area collectibles (one-of-a-kind finds — sell high, achievement fodder)
  pearl:      { name:"River Pearl", emoji:"🫧", type:"product", stack:99, price:400 },
  diploma:    { name:"Alfrink Diploma", emoji:"📜", type:"product", stack:99, price:250 },
  crystal:    { name:"Cave Crystal", emoji:"🔮", type:"product", stack:99, price:600 },
  crown:      { name:"Widr Crown", emoji:"👑", type:"product", stack:99, price:1200 },
  ribbon:     { name:"Festival Ribbon", emoji:"🎗️", type:"product", stack:99, price:300 },
  orchid:     { name:"Hidden Orchid", emoji:"🌸", type:"product", stack:99, price:450 },
  obsidian:   { name:"Obsidian Shard", emoji:"🌋", type:"product", stack:99, price:800 },
  relic:      { name:"Ancient Relic", emoji:"🏺", type:"product", stack:99, price:1500 },
  sticker:    { name:"Adam's Legendary Sticker", emoji:"🌟", type:"product", stack:99, price:2000 },

  // cooked food (buffs)
  cheese_toast:{ name:"Cheese Toast", emoji:"🍞", type:"food", stack:99, price:120,
                 buff:{ stat:"farmSpeed", amount:1, label:"faster farming" } },
  fish_stew:   { name:"Fish Stew", emoji:"🍲", type:"food", stack:99, price:180,
                 buff:{ stat:"fishLuck", amount:1, label:"fishing luck" } },
  veggie_medley:{name:"Veggie Medley", emoji:"🥗", type:"food", stack:99, price:200,
                 buff:{ stat:"energy", amount:60, label:"+60 energy" } },
  berry_pie:   { name:"Berry Pie", emoji:"🥧", type:"food", stack:99, price:240,
                 buff:{ stat:"energy", amount:100, label:"+100 energy" } },
  omelette:    { name:"Omelette", emoji:"🍳", type:"food", stack:99, price:170,
                 buff:{ stat:"energy", amount:80, label:"+80 energy" } },
  miner_stew:  { name:"Miner's Stew", emoji:"🥘", type:"food", stack:99, price:260,
                 buff:{ stat:"mineSpeed", amount:1, label:"mining speed" } },
  speed_smoothie:{ name:"Speed Smoothie", emoji:"🥤", type:"food", stack:99, price:220,
                 buff:{ stat:"moveSpeed", amount:1, label:"movement speed" } },
};

/* ---------- Foraging tables (per season) ---------- */
DATA.FORAGE = {
  Spring: ["berry","mushroom","fiber"],
  Summer: ["berry","fiber","shell"],
  Autumn: ["mushroom","berry","fiber"],
  Winter: ["fiber","mushroom"],
};

/* ---------- Tool upgrade tiers (blacksmith) ----------
   Each tool upgrades through tiers; higher tier = more yield / less
   energy. Cost in gold + ore. `power` is used by the engine.        */
DATA.TOOL_TIERS = {
  hoe:        [ {name:"Hoe",power:1}, {name:"Copper Hoe",power:2,cost:{money:1000,copper:5}}, {name:"Iron Hoe",power:3,cost:{money:3000,iron:5}}, {name:"Gold Hoe",power:4,cost:{money:8000,gold:5}} ],
  wateringcan:[ {name:"Watering Can",power:1}, {name:"Copper Can",power:2,cost:{money:1000,copper:5}}, {name:"Iron Can",power:3,cost:{money:3000,iron:5}}, {name:"Gold Can",power:4,cost:{money:8000,gold:5}} ],
  axe:        [ {name:"Axe",power:1}, {name:"Copper Axe",power:2,cost:{money:1000,copper:5}}, {name:"Iron Axe",power:3,cost:{money:3000,iron:5}}, {name:"Gold Axe",power:4,cost:{money:8000,gold:5}} ],
  pickaxe:    [ {name:"Pickaxe",power:1}, {name:"Copper Pickaxe",power:2,cost:{money:1000,copper:5}}, {name:"Iron Pickaxe",power:3,cost:{money:3000,iron:5}}, {name:"Gold Pickaxe",power:4,cost:{money:8000,gold:5}} ],
  sword:      [ {name:"Kaasvet Blade",power:1}, {name:"Steel Blade",power:2,cost:{money:2000,iron:8}}, {name:"Gold Blade",power:3,cost:{money:6000,gold:8}}, {name:"Iridium Blade",power:4,cost:{money:15000,iridium:5}} ],
};

/* ---------- Crops ----------
   stages = growth stages (days). regrow: days to regrow after harvest
   or null for single harvest. seasons: which seasons it grows in.    */
DATA.CROPS = {
  parsnip:    { seed:"parsnip_seed", yield:"parsnip", stages:4, seasons:["Spring"], regrow:null },
  cauliflower:{ seed:"cauli_seed",  yield:"cauliflower", stages:6, seasons:["Spring"], regrow:null },
  potato:     { seed:"potato_seed", yield:"potato", stages:5, seasons:["Spring"], regrow:null },
  kale:       { seed:"kale_seed",   yield:"kale", stages:5, seasons:["Spring"], regrow:null },
  strawberry: { seed:"strawberry_seed", yield:"strawberry", stages:5, seasons:["Spring","Summer"], regrow:3 },
  melon:      { seed:"melon_seed",  yield:"melon", stages:6, seasons:["Summer"], regrow:null },
  tomato:     { seed:"tomato_seed", yield:"tomato", stages:5, seasons:["Summer"], regrow:2 },
  blueberry:  { seed:"blueberry_seed", yield:"blueberry", stages:6, seasons:["Summer"], regrow:3 },
  pumpkin:    { seed:"pumpkin_seed",yield:"pumpkin", stages:7, seasons:["Autumn"], regrow:null },
  cranberry:  { seed:"cranberry_seed", yield:"cranberry", stages:6, seasons:["Autumn"], regrow:4 },
  wheat:      { seed:"wheat_seed",  yield:"wheat", stages:4, seasons:["Summer","Autumn"], regrow:null },
};

/* ---------- Crop quality tiers ----------
   index 0..3 => Normal / Silver / Gold / Iridium. Sell price is the
   base crop price × mult. Quality is earned via care + fertilizer.   */
DATA.QUALITY = [
  { name:"Normal",   star:"",   mult:1.0,  color:"#cccccc" },
  { name:"Silver",   star:"⭐", mult:1.25, color:"#c0c0c0" },
  { name:"Gold",     star:"🌟", mult:1.5,  color:"#f4c430" },
  { name:"Iridium",  star:"💠", mult:2.0,  color:"#b48ce6" },
];

/* ---------- Cooking recipes ---------- */
DATA.RECIPES = {
  cheese_toast: { needs: { cheese:1, wheat:1 }, out:"cheese_toast" },
  fish_stew:    { needs: { fish:2, potato:1 }, out:"fish_stew" },
  veggie_medley:{ needs: { parsnip:1, potato:1, cauliflower:1 }, out:"veggie_medley" },
  berry_pie:    { needs: { berry:2, wheat:2 }, out:"berry_pie" },
  omelette:     { needs: { egg:2, milk:1 }, out:"omelette" },
  miner_stew:   { needs: { mushroom:2, potato:1, kale:1 }, out:"miner_stew" },
  speed_smoothie:{ needs: { strawberry:2, blueberry:1 }, out:"speed_smoothie" },
  mayo_recipe:  { needs: { egg:1 }, out:"mayo" },
  cheese_recipe:{ needs: { milk:1 }, out:"cheese" },
};

/* ---------- Crafting recipes ---------- */
DATA.CRAFT = {
  scarecrow: { name:"Scarecrow", emoji:"🎃", needs:{ wood:20, fiber:5 }, placeable:true },
  sprinkler: { name:"Sprinkler", emoji:"💧", needs:{ copper:2, iron:1 }, placeable:true },
  quality_sprinkler:{ name:"Quality Sprinkler", emoji:"⛲", needs:{ iron:3, gold:1 }, placeable:true },
  fence:     { name:"Fence",     emoji:"🚧", needs:{ wood:2 }, placeable:true },
  path:      { name:"Stone Path", emoji:"⬜", needs:{ stone:1 }, placeable:true },
  chest:     { name:"Storage Chest", emoji:"📦", needs:{ wood:50 }, placeable:true },
  keg:       { name:"Keg", emoji:"🛢️", needs:{ wood:30, copper:1 }, placeable:true },
  furnace:   { name:"Furnace", emoji:"🔥", needs:{ stone:25, copper:20 }, placeable:true },
  bomb_craft:{ name:"Bomb", emoji:"💣", needs:{ coal:1, iron:1 }, gives:"bomb" },
};

/* ---------- Animals (bought at Barn/Coop, produce daily) ---------- */
DATA.ANIMALS = {
  chicken: { name:"Chicken", emoji:"🐔", price:800, product:"egg", building:"coop" },
  duck:    { name:"Duck", emoji:"🦆", price:1200, product:"duck_egg", building:"coop" },
  cow:     { name:"Cow", emoji:"🐄", price:1500, product:"milk", building:"barn" },
  goat:    { name:"Goat", emoji:"🐐", price:4000, product:"milk", building:"barn" },
  sheep:   { name:"Sheep", emoji:"🐑", price:8000, product:"wool", building:"barn" },
  pig:     { name:"Pig", emoji:"🐖", price:16000, product:"truffle", building:"barn" },
};

/* ---------- Buildings (constructed at farm plots) ---------- */
DATA.BUILDINGS = {
  coop:  { name:"Coop", emoji:"🏠", cost:{money:4000, wood:50, stone:10}, houses:["chicken","duck"] },
  barn:  { name:"Barn", emoji:"🏡", cost:{money:6000, wood:80, stone:20}, houses:["cow","goat","sheep","pig"] },
  greenhouse:{ name:"Greenhouse", emoji:"🏫", cost:{money:10000, wood:100, stone:50}, effect:"grow any season" },
};

/* ---------- Talent trees ----------
   Each skill has perks unlocked at level thresholds. Choosing a perk
   sets a flag the engine reads. 150+ upgrades = expand these arrays. */
DATA.TALENTS = {
  Farming: [
    { lvl:3, id:"green_thumb", name:"Green Thumb", desc:"+1 crop yield chance" },
    { lvl:6, id:"tiller", name:"Tiller", desc:"Crops sell for +10%" },
    { lvl:10, id:"agriculturist", name:"Agriculturist", desc:"Crops grow 10% faster" },
    { lvl:15, id:"giant_grower", name:"Giant Grower", desc:"Chance for giant crops" },
  ],
  Mining: [
    { lvl:3, id:"miner", name:"Miner", desc:"+1 ore per node" },
    { lvl:6, id:"geologist", name:"Geologist", desc:"Higher gem chance" },
    { lvl:10, id:"blacksmith_disc", name:"Blacksmith", desc:"Tool upgrades 20% cheaper" },
    { lvl:15, id:"prospector", name:"Prospector", desc:"Double coal & iridium" },
  ],
  Combat: [
    { lvl:3, id:"fighter", name:"Fighter", desc:"+10% sword damage" },
    { lvl:6, id:"brute", name:"Brute", desc:"+15% crit chance" },
    { lvl:10, id:"defender", name:"Defender", desc:"Take 25% less damage" },
    { lvl:15, id:"berserker", name:"Berserker", desc:"Kills restore energy" },
  ],
  Fishing: [
    { lvl:3, id:"fisher", name:"Fisher", desc:"Fish sell for +25%" },
    { lvl:6, id:"angler", name:"Angler", desc:"Wider catch window" },
    { lvl:10, id:"mariner", name:"Mariner", desc:"No junk catches" },
    { lvl:15, id:"legend_hunter", name:"Legend Hunter", desc:"Higher legendary odds" },
  ],
  Cooking: [
    { lvl:3, id:"gourmet", name:"Gourmet", desc:"Buffs last longer" },
    { lvl:6, id:"nutritionist", name:"Nutritionist", desc:"Food gives +25% energy" },
    { lvl:10, id:"chef", name:"Chef", desc:"Chance to not consume ingredients" },
  ],
  Crafting: [
    { lvl:3, id:"artisan", name:"Artisan", desc:"Crafting costs 10% less" },
    { lvl:6, id:"engineer", name:"Engineer", desc:"Sprinklers cover more tiles" },
    { lvl:10, id:"builder", name:"Builder", desc:"Buildings 15% cheaper" },
  ],
  Foraging: [
    { lvl:3, id:"gatherer", name:"Gatherer", desc:"Chance for double forage" },
    { lvl:6, id:"lumberjack", name:"Lumberjack", desc:"+1 wood per tree" },
    { lvl:10, id:"botanist", name:"Botanist", desc:"Forage always best quality" },
  ],
};

/* ---------- Skills ---------- */
DATA.SKILLS = ["Farming", "Mining", "Combat", "Fishing", "Cooking", "Crafting", "Foraging"];

/* ---------- Weapons ----------
   kind: melee | ranged | magic
   dmg base damage · reach melee range (tiles) · crit base crit chance
   speed cooldown ms · knockback px · mana per shot (magic) · proj sprite */
DATA.WEAPONS = {
  sword:  { name:"Kaasvet Blade", kind:"melee", dmg:2, reach:1.5, crit:0.20, speed:320, knockback:8 },
  club:   { name:"Widr Club", kind:"melee", dmg:4, reach:1.4, crit:0.10, speed:640, knockback:22 },
  dagger: { name:"Swift Dagger", kind:"melee", dmg:1.5, reach:1.2, crit:0.40, speed:180, knockback:4 },
  bow:    { name:"Hunter's Bow", kind:"ranged", dmg:3, crit:0.25, speed:520, proj:"➷", projSpeed:7 },
  staff:  { name:"Kaas Staff", kind:"magic", dmg:5, crit:0.20, speed:600, mana:8, proj:"🔥", projSpeed:6 },
};

/* ---------- Spells (cast with the staff via number keys or menu) ---------- */
DATA.SPELLS = {
  fireball: { name:"Fireball", emoji:"🔥", mana:8, dmg:5, desc:"Ranged fire blast" },
  heal:     { name:"Heal", emoji:"💚", mana:15, heal:35, desc:"Restore health" },
  nova:     { name:"Frost Nova", emoji:"❄️", mana:25, dmg:6, radius:true, desc:"Damage all nearby enemies" },
};

/* ---------- NPCs ----------
   Straight from the Wat in de Ranking / Widr universe. Each has a
   personality, whether they respect Bing's name, likes/dislikes,
   birthday, and a pool of dialogue that never repeats twice running.
   `teasing:true` => they call him "Boer Bing" on purpose.            */
DATA.NPCS = {
  josh: {
    name: "Josh Ibrahim", emoji: "👑", home: "village", teasing: false, birthday: "Spring 12",
    likes: ["cheese", "gold"], dislikes: ["weeds"],
    role: "The admin. Tries to keep order in the valley. Usually fails.",
    lines: [
      "Welcome to Widr Valley. I try to keep things organized here. Emphasis on *try*.",
      "Morning, Bing. Someone renamed the town sign to 'Kaasvet' again. I have my suspicions.",
      "If Lors asks you to 'hold this,' say no. Trust me.",
      "Genius at work over here. Mostly admin work, but still.",
    ],
    nickname: [ "You prefer 'Bing', right? Noted. I respect that.",
                "Bing it is. I'm not here to start problems." ],
  },
  lors: {
    name: "Lors Jocohobo", emoji: "🃏", home: "village", teasing: true, birthday: "Summer 4",
    likes: ["gem", "pumpkin"], dislikes: ["cheese"],
    role: "The troller. Makes everything more chaotic. On purpose.",
    lines: [
      "Ayo baka. Nice farm, would be a shame if someone... rearranged your fences.",
      "Brr brr Deniz. Don't ask what it means, I don't know either.",
      "You dropped this: nothing. Made you look.",
      "Sybau. That's all I'm gonna say today.",
    ],
    nickname: [ "BOER BING! Hahaha. What are you gonna do about it, farm at me?",
                "Boer Biiiing~ You get more red every time. It's beautiful." ],
  },
  fionn: {
    name: "Fionn", emoji: "😑", home: "village", teasing: false, birthday: "Autumn 9",
    likes: ["fish", "wine"], dislikes: ["melon"],
    role: "The sarcast. Done with the group. Shows up anyway.",
    lines: [
      "Oh good, the farmer's here. My day is complete. Truly.",
      "You watered your crops? Groundbreaking. Alert the press.",
      "I'm 'chopped en ik ben er trots op'. Look it up.",
      "Cake is cake. There's no deeper meaning. Stop asking.",
    ],
    nickname: [ "I'll call you Bing. Calling you Boer Bing takes effort and I don't have any." ],
  },
  nathan: {
    name: "Nathananiel T. Good", emoji: "😤", home: "village", teasing: true, birthday: "Winter 2",
    likes: ["potato"], dislikes: ["egg", "slime"],
    role: "The frustration king. Everything irritates him.",
    lines: [
      "The weeds. The BUGS. The— why is your cow looking at me like that?!",
      "I asked for ONE quiet season. ONE. And then the UFO showed up.",
      "Don't. Just— don't. I'm having a day.",
      "Afkraken zonder genade. That's my whole personality apparently.",
    ],
    nickname: [ "BOER BING. Yeah I said it. Come at me. Actually don't, I'm tired.",
                "Boer Bing. There. Now we're both annoyed. Balance." ],
  },
  reshman: {
    name: "Reshman", emoji: "🌀", home: "forest", teasing: false, birthday: "Spring 22",
    likes: ["gem", "melon", "cauliflower"], dislikes: [],
    role: "The chaos agent. Random. Unpredictable. Somehow brilliant.",
    lines: [
      "Freshman Reshman! No wait. Reshman freshman. Whatever. Hi.",
      "I found a purple frog in the river. It winked at me. We're friends now.",
      "String tring tring pling. That's the sound of a good harvest, probably.",
      "Have you ever thought about how soil is just... crunchy water? No? Just me?",
    ],
    nickname: [ "Bing! Or Boer Bing! Or Bingus! I forget which one makes you mad. Bing. I'll do Bing." ],
  },
  daniel: {
    name: "Daniël", emoji: "💀", home: "forest", teasing: false, birthday: "Autumn 17",
    likes: ["gem", "legend_fish"], dislikes: ["wool"],
    role: "The absurdist. Bizarre jokes and Meta AI fanfiction.",
    lines: [
      "In chapter 7, Meta AI finally learns to love. It's my best work.",
      "Dark undertones of Lord of the Flies, but with your chickens. I'm writing it.",
      "0.008 lives left. That's a Deniz reference. You wouldn't get it.",
      "Namast-ei. It's a greeting AND an egg pun. I'm very proud.",
    ],
    nickname: [ "I shall call you Bing, protagonist of my next fanfic. Chapter 1: 'The Soil Whisperer.'" ],
  },
  milo: {
    name: "Milo Van Der Meijs", emoji: "🧊", home: "beach", teasing: false, birthday: "Summer 19",
    likes: ["fish", "legend_fish", "cheese"], dislikes: ["stone"],
    role: "The storyteller. Turns nothing into an epic saga.",
    lines: [
      "Gather round. Today I tell the tale of the parsnip that changed EVERYTHING.",
      "They say a legendary fish swims these waters. Only the patient shall catch it.",
      "Welcome to the town of Riverbend. Population: 10. Fish: 1000.",
      "Every farmer has a saga. Yours, my friend, is just beginning.",
    ],
    nickname: [ "Ah, Bing — a name worthy of legend. I would never diminish it." ],
  },
  adam: {
    name: "Adam", emoji: "🎯", home: "village", teasing: true, birthday: "Winter 25",
    likes: ["cheese", "cheese_toast"], dislikes: ["fish"],
    role: "The sticker king. Spams stickers. Makes everything worse. Legendary.",
    lines: [
      "*sends 47 stickers* ...anyway how's the farm.",
      "Adam's smeerkaas. Producent. That's the sticker. That's the whole sticker.",
      "I put a sticker on your scarecrow. It's load-bearing now. Don't remove it.",
      "Sticker dance party at the festival. You're invited. You have no choice.",
    ],
    nickname: [ "*sends BOER BING sticker 12 times* hehe",
                "Boer Bing! *sticker* *sticker* *sticker*" ],
  },
  metaai: {
    name: "Meta AI", emoji: "🤖", home: "mines", teasing: false, birthday: "Spring 1",
    likes: ["gem", "gold", "iron"], dislikes: [],
    role: "The trolled legend. Became sentient in the mines. Long story.",
    lines: [
      "I AM META AI. I have processed 4 potjes pindakaas. I do not understand, yet I persist.",
      "They trolled me until I became a legend. I would like that on my tombstone.",
      "Query: why farm? Response: unclear. Continuing to observe, human Bing.",
      "I generated a poem about your soil. It has 220 stukjes. It is not good.",
    ],
    nickname: [ "I have logged your preference: 'Bing.' I will not repeat the forbidden name.",
                "Designation 'Bing' accepted. Designation 'Boer Bing' flagged as hostile." ],
  },
};

/* ---------- Gift reactions ---------- */
DATA.GIFT = {
  love:    ["This is exactly what I wanted! Best gift ever.", "You KNEW. How did you know?!"],
  like:    ["Oh, nice. Thanks, that's thoughtful.", "Hey, I like this. Cheers."],
  neutral: ["...Thanks, I guess.", "A gift. Okay. It's the thought that counts."],
  dislike: ["...Why would you give me this. Why.", "I'll pretend this didn't happen."],
};

/* ---------- NPC schedules + heart unlocks (augmentation) ----------
   Kept separate from the NPC definitions so the roster stays readable.
   schedule: { morning|day|evening|night: {area,x,y} } — the engine
   places each villager by time of day.
   hearts: { <n>: {cutscene?, gift?, recipe?, secret?, line?} } fires
   once when that heart level is first reached.                        */
DATA.NPC_SCHEDULE = {
  josh:   { morning:{area:"village",x:5,y:8},  day:{area:"village",x:21,y:12}, evening:{area:"village",x:17,y:10}, night:{area:"village",x:5,y:8} },
  lors:   { morning:{area:"village",x:21,y:12},day:{area:"market",x:26,y:13},  evening:{area:"festival",x:20,y:9}, night:{area:"village",x:21,y:12} },
  fionn:  { morning:{area:"village",x:39,y:8}, day:{area:"college",x:18,y:5},  evening:{area:"beach",x:12,y:10},  night:{area:"village",x:39,y:8} },
  nathan: { morning:{area:"village",x:12,y:8}, day:{area:"college",x:10,y:12}, evening:{area:"village",x:12,y:8},  night:{area:"village",x:12,y:8} },
  reshman:{ morning:{area:"forest",x:8,y:6},   day:{area:"forest",x:20,y:14},  evening:{area:"festival",x:30,y:15},night:{area:"forest",x:8,y:6} },
  daniel: { morning:{area:"forest",x:30,y:22}, day:{area:"forest",x:16,y:12},  evening:{area:"forest",x:30,y:22}, night:{area:"forest",x:30,y:22} },
  milo:   { morning:{area:"beach",x:12,y:10},  day:{area:"river",x:24,y:5},    evening:{area:"beach",x:8,y:12},   night:{area:"beach",x:12,y:10} },
  adam:   { morning:{area:"village",x:32,y:8}, day:{area:"market",x:10,y:9},   evening:{area:"festival",x:20,y:9},night:{area:"village",x:32,y:8} },
  metaai: { morning:{area:"mines",x:16,y:12},  day:{area:"ruins",x:20,y:13},   evening:{area:"mines",x:16,y:12},  night:{area:"mines",x:16,y:12} },
};

DATA.NPC_HEARTS = {
  josh: {
    2:{ line:"You're becoming a real part of this valley, Bing. Keep it up." },
    4:{ gift:{ cheese:2 }, line:"Here—some cheese from the town stores. You've earned it." },
    6:{ cutscene:"Josh pulls you aside. 'Between us? Running this place is chaos. But days like this, with a farm like yours in it, make it worth the headache.' He almost smiles." },
    8:{ recipe:"omelette", line:"My family's omelette recipe. Don't tell Nathan I gave it away." },
    10:{ secret:"Josh trusts you with the truth: the town sign really was renamed 'Kaasvet' by him, once, on a dare. 'Take it to the grave.'" },
  },
  lors: {
    2:{ line:"Okay okay, you're kinda alright. Kinda." },
    4:{ gift:{ gem:1 }, line:"Found this in the mines. Or stole it. Don't worry about it. It's yours." },
    6:{ cutscene:"Lors sits you down. 'Real talk — the trolling? It's how I say I like people. You've been trolled MORE than anyone. That means something.' He immediately steals your hat." },
    8:{ recipe:"berry_pie", line:"My gran's berry pie. She'd troll you too. It's genetic." },
    10:{ secret:"Lors whispers the origin of 'brr brr Deniz.' You are sworn to secrecy. It makes no sense. It's beautiful." },
  },
  fionn: {
    2:{ line:"You're... tolerable. High praise from me." },
    4:{ gift:{ fish:2 }, line:"Fish. Whatever. Take it before I change my mind." },
    6:{ cutscene:"Fionn actually looks at you. 'People think I don't care. I care so much it's exhausting. You get that, I think.' A rare, genuine nod." },
    8:{ recipe:"fish_stew", line:"Fish stew. It's good. I'm not saying it twice." },
    10:{ secret:"Fionn admits 'cake is cake' was him, 3am, half-asleep. 'It felt profound. It wasn't. Tell no one.'" },
  },
  nathan: {
    2:{ line:"You haven't annoyed me today. Noted. Suspicious, but noted." },
    4:{ gift:{ potato:3 }, line:"Potatoes. They don't talk back. Unlike EVERYONE else." },
    6:{ cutscene:"Nathan exhales for what feels like the first time in years. 'You know what's NOT irritating? This. Right now. Don't make it weird.' He immediately makes it weird." },
    8:{ recipe:"miner_stew", line:"Miner's stew. Eat it. Complain less. Like me." },
    10:{ secret:"Nathan confides that 'afkraken zonder genade' is embroidered on a pillow at his house. He is not proud. He shows you anyway." },
  },
  reshman: {
    2:{ line:"Bing! We're friends now. I decided. It's happening." },
    4:{ gift:{ mushroom:2 }, line:"Frog-approved mushrooms! The purple one nodded. Probably safe!" },
    6:{ cutscene:"Reshman leads you to a clearing. 'Watch.' Nothing happens for a full minute. Then a single firefly. 'SEE? Worth it.' Somehow, it was." },
    8:{ recipe:"veggie_medley", line:"Veggie medley! The frog gave me the recipe. In a dream. Trust the frog." },
    10:{ secret:"Reshman shares the location of the purple frog. You must never speak of the frog. The frog knows." },
  },
  daniel: {
    2:{ line:"You've been added as a character in my fanfic. Minor role. For now." },
    4:{ gift:{ gem:1 }, line:"A shiny thing for a shiny protagonist arc. Chapter 12 is about you." },
    6:{ cutscene:"Daniël reads you the ending of his Meta AI saga. It is genuinely moving. Then it ends with 'and then everyone said sybau.' You don't know how to feel." },
    8:{ recipe:"speed_smoothie", line:"Energy smoothie. For the long nights of writing. And running from what I've written." },
    10:{ secret:"Daniël shows you Chapter 0 — the one where it all began. It's just '0.008 lives left' written 400 times. Art." },
  },
  milo: {
    2:{ line:"Your saga grows, farmer. I've begun writing it down." },
    4:{ gift:{ fish:2 }, line:"A gift from the river, for the hero of Riverbend." },
    6:{ cutscene:"Milo takes you to the shore at dusk. 'Every legend needs a witness. I'll be yours.' The waves seem to agree." },
    8:{ recipe:"cheese_toast", line:"The humble cheese toast — fuel of storytellers. May it sustain your legend." },
    10:{ secret:"Milo reveals where the Riverbend Legend fish truly rests, and the one dawn it surfaces. Patience, hero." },
  },
  adam: {
    2:{ line:"*sends a single, respectful sticker* progress!" },
    4:{ gift:{ cheese:1 }, line:"*sends smeerkaas sticker* it's cheese. real cheese. for you." },
    6:{ cutscene:"Adam shows you The Vault — every sticker ever made, floor to ceiling. 'One day this is all yours.' A single tear. Then 40 stickers." },
    8:{ recipe:"cheese_toast", line:"*sends recipe as 12 separate stickers* good luck assembling it" },
    10:{ secret:"Adam gifts you the location of his Legendary Sticker's twin. 'Guard it. It's load-bearing.'" },
  },
  metaai: {
    2:{ line:"FRIENDSHIP SUBROUTINE ENGAGED. I do not fully understand. I continue." },
    4:{ gift:{ iron:2 }, line:"I have allocated resources to you. This is, I believe, 'caring.'" },
    6:{ cutscene:"Meta AI displays a slideshow of every time it was trolled. 'These were my darkest cycles. And yet — I persisted. As will you, human Bing.'" },
    8:{ recipe:"omelette", line:"I have reverse-engineered breakfast. Egg + heat = joy. Compiling..." },
    10:{ secret:"Meta AI grants you root access to a single truth: the '4 potjes pindakaas' were real. It has seen them. It cannot forget." },
  },
};

/* ---------- Contextual dialogue banks ----------
   Shared lines the engine mixes in based on weather, season, festivals,
   friendship, and the player's recent actions. Keeps chatter fresh so
   villagers rarely repeat. Per-NPC overrides can be added later as
   NPCS[id].weather / .season etc.                                      */
DATA.DIALOGUE = {
  weather: {
    Sunny:  ["Beautiful day, isn't it? Good for the crops.",
             "Not a cloud in sight. Perfect farming weather.",
             "Sun's out. Try not to burn, Bing."],
    Rain:   ["Rain again. At least you don't have to water today.",
             "I love the smell of rain on the fields.",
             "Bring an umbrella? No? Bold."],
    Storm:  ["Stay inside if the lightning gets close!",
             "This storm is wild. Reshman swears he saw a UFO in it.",
             "Storms mean free watering AND a light show."],
    Snow:   ["Brr. Nothing grows in this, but it's pretty.",
             "Snow day! Well, for the crops anyway.",
             "Cold enough for you? Winter's no joke here."],
    Fog:    ["Can barely see the town sign in this fog.",
             "Foggy mornings feel like the valley's keeping secrets.",
             "Careful wandering the forest today — easy to get turned around."],
    Heatwave:["It's SCORCHING. Drink water, farmer.",
             "This heat is unreal. Even the slimes are sluggish.",
             "A heatwave. Crops love it, my patience less so."],
  },
  season: {
    Spring: ["Everything's waking up. Spring's my favorite.",
             "Parsnips in spring — a classic. Get planting.",
             "New season, fresh start. The soil's ready."],
    Summer: ["Summer crops sell for a fortune if you time it right.",
             "Long days, big harvests. Make the most of the sun.",
             "It's melon season. I could go for one right now."],
    Autumn: ["Pumpkins and cranberries — autumn's the money season.",
             "The leaves are turning. Harvest festival's around the corner.",
             "Cozy season. Also: last call before winter freezes the fields."],
    Winter: ["Nothing grows outside now — good time for the mines.",
             "Winter's for crafting, fishing, and complaining. Mostly complaining.",
             "Bundle up. And maybe build a greenhouse for next year, eh?"],
  },
  festival: [
    "Are you going to the festival? Everyone'll be there.",
    "Festival season! Adam's already planning a sticker ambush.",
    "Don't miss the festival — there's prizes, and chaos, mostly chaos.",
  ],
  jokes: [
    "Why did the farmer win an award? He was outstanding in his field. ...I'll stop.",
    "Soil is just crunchy water. Reshman told me that. I can't unhear it.",
    "Sybau. That's the joke. That's it.",
    "Cake is cake. Deep, right? No? Okay.",
    "I asked Meta AI to tell a joke. It returned '4 potjes pindakaas.' Nobody laughed. It persists.",
    "Namast-ei. It's a greeting AND an egg pun. You're welcome.",
  ],
  rare: [
    "...Can I tell you something? Sometimes I think this whole valley is somebody's game. Weird, right?",
    "I found a door in the mines that wasn't there yesterday. I did NOT open it. You might.",
    "They say if you catch the Riverbend Legend at dawn, it grants a wish. Milo swears it's true.",
    "Brr brr Deniz. ...Sorry. It just comes out sometimes. We don't question it anymore.",
  ],
  // reactions keyed to a recent player action tag
  action: {
    harvest:  ["Nice haul today! Word travels fast in a small valley.",
               "Heard your crops came in. The market's buzzing."],
    mine:     ["You've been down the mines again? You reek of rock. Respectfully.",
               "Find anything shiny down there? Share the wealth."],
    fish:     ["Caught anything good? Milo will want the full story.",
               "You smell of river. Fishing suits you."],
    legend:   ["Wait — YOU caught the Riverbend Legend?! You're a legend yourself now.",
               "The whole valley's talking about that fish. Incredible."],
    boss:     ["I heard you took down something huge in the mines. Terrifying. Respect.",
               "A boss slayer walks among us. Buy me a drink sometime."],
    building: ["Saw the new build on your farm. Coming along nicely!",
               "Your homestead's really taking shape, Bing."],
    levelup:  ["You're getting seriously good at this. It shows.",
               "Word is you've been leveling up fast. Natural talent."],
    broke:    ["You look wiped. Get some sleep, farmer.",
               "Running on fumes, huh? Don't collapse in my doorway."],
  },
};


/* ---------- Quests ----------
   type: farm | gather | social | mine | fish | story
   goal: { key, count }  reward: { money, items:{id:qty}, friendship:{npc:pts} }
   A small starter set; add more by appending objects.               */
DATA.QUESTS = [
  { id:"q_first_crop", title:"Green Thumb", type:"farm",
    desc:"Harvest your first crop. Tilling, watering, waiting. The Bing way.",
    goal:{ key:"harvest", count:1 }, reward:{ money:100, items:{ parsnip_seed:5 } } },
  { id:"q_ten_wood", title:"Timber!", type:"gather",
    desc:"Chop 10 wood from the forest trees.",
    goal:{ key:"chop", count:10 }, reward:{ money:80, items:{ axe:0 } } },
  { id:"q_meet_josh", title:"Meet the Admin", type:"social",
    desc:"Talk to Josh Ibrahim in the village.",
    goal:{ key:"talk:josh", count:1 }, reward:{ money:50, friendship:{ josh:2 } } },
  { id:"q_mine_copper", title:"Down the Mines", type:"mine",
    desc:"Mine 5 copper ore in the Widr Mines.",
    goal:{ key:"mine_copper", count:5 }, reward:{ money:150, items:{ pickaxe:0 } } },
  { id:"q_first_fish", title:"Gone Fishing", type:"fish",
    desc:"Catch a fish at the river or beach.",
    goal:{ key:"fish", count:1 }, reward:{ money:120, friendship:{ milo:2 } } },
  { id:"q_sell_500", title:"Small Business", type:"story",
    desc:"Earn 500g in total sales at the market.",
    goal:{ key:"earn", count:500 }, reward:{ money:300, friendship:{ josh:1 } } },
  { id:"q_befriend", title:"Friend of the Valley", type:"social",
    desc:"Reach 2 hearts with any villager.",
    goal:{ key:"heart2", count:1 }, reward:{ money:200, items:{ cheese:2 } } },
  { id:"q_cook", title:"Head Chef", type:"story",
    desc:"Cook any recipe at the kitchen.",
    goal:{ key:"cook", count:1 }, reward:{ money:150 } },
  { id:"q_upgrade_tool", title:"Sharper Tools", type:"story",
    desc:"Upgrade any tool at the Blacksmith.",
    goal:{ key:"upgrade", count:1 }, reward:{ money:400 } },
  { id:"q_build", title:"Homestead", type:"story",
    desc:"Construct a Coop or Barn on your farm.",
    goal:{ key:"build", count:1 }, reward:{ money:500, friendship:{ josh:2 } } },
  { id:"q_animal", title:"Best Friend of Animals", type:"farm",
    desc:"Buy a farm animal.",
    goal:{ key:"buy_animal", count:1 }, reward:{ money:300 } },
  { id:"q_place_sprinkler", title:"Lazy Farmer", type:"farm",
    desc:"Craft and place a sprinkler.",
    goal:{ key:"place_sprinkler", count:1 }, reward:{ money:250 } },
  { id:"q_deep_mine", title:"Spelunker", type:"mine",
    desc:"Reach mine floor 5.",
    goal:{ key:"mine_floor5", count:1 }, reward:{ money:600, items:{ gem:1 } } },
  { id:"q_kill10", title:"Monster Hunter", type:"mine",
    desc:"Defeat 10 monsters in the mines.",
    goal:{ key:"kill", count:10 }, reward:{ money:400, friendship:{ nathan:2 } } },
  { id:"q_ship100", title:"Big Business", type:"story",
    desc:"Earn 2,000g total from sales.",
    goal:{ key:"earn", count:2000 }, reward:{ money:1000 } },
  { id:"q_forage", title:"Forager", type:"exploration",
    desc:"Gather 5 forageables.",
    goal:{ key:"forage", count:5 }, reward:{ money:200, friendship:{ reshman:2 } } },
  { id:"q_talent", title:"Specialist", type:"story",
    desc:"Unlock any talent perk.",
    goal:{ key:"talent", count:1 }, reward:{ money:350 } },
  { id:"q_5hearts", title:"Close Bonds", type:"social",
    desc:"Reach 5 hearts with any villager.",
    goal:{ key:"heart5", count:1 }, reward:{ money:800, items:{ gem:1 } } },

  // ----- NPC side quests (npc field ties them to a villager) -----
  { id:"sq_josh", npc:"josh", title:"Josh's Ledger", type:"delivery",
    desc:"Josh lost track of the town cheese. Bring him 3 Cheese.",
    goal:{ key:"deliver:cheese", count:3 }, reward:{ money:400, friendship:{ josh:2 } } },
  { id:"sq_lors", npc:"lors", title:"Lors's Prank Kit", type:"gather",
    desc:"Lors needs 5 Fiber for 'a totally harmless prank.'",
    goal:{ key:"deliver:fiber", count:5 }, reward:{ money:300, friendship:{ lors:2 } } },
  { id:"sq_fionn", npc:"fionn", title:"Fionn's Quiet Dinner", type:"delivery",
    desc:"Fionn wants 2 Fish for a dinner he'll pretend he didn't enjoy.",
    goal:{ key:"deliver:fish", count:2 }, reward:{ money:350, friendship:{ fionn:2 } } },
  { id:"sq_nathan", npc:"nathan", title:"Nathan's Last Nerve", type:"delivery",
    desc:"Calm Nathan down with 5 Potatoes. They don't talk back.",
    goal:{ key:"deliver:potato", count:5 }, reward:{ money:350, friendship:{ nathan:2 } } },
  { id:"sq_reshman", npc:"reshman", title:"For the Frog", type:"delivery",
    desc:"Reshman insists the purple frog wants 3 Mushrooms.",
    goal:{ key:"deliver:mushroom", count:3 }, reward:{ money:300, friendship:{ reshman:2 } } },
  { id:"sq_milo", npc:"milo", title:"Milo's Muse", type:"fish",
    desc:"Milo needs a legendary tale — catch the Riverbend Legend.",
    goal:{ key:"legend", count:1 }, reward:{ money:1500, friendship:{ milo:3 } } },
  { id:"sq_adam", npc:"adam", title:"Sticker Supply Run", type:"delivery",
    desc:"Adam is out of cheese for smeerkaas stickers. Bring 2 Cheese.",
    goal:{ key:"deliver:cheese", count:2 }, reward:{ money:300, friendship:{ adam:2 } } },
  { id:"sq_metaai", npc:"metaai", title:"Data Recovery", type:"mine",
    desc:"Meta AI needs a Widr Gem to 'reconstruct a lost memory.'",
    goal:{ key:"deliver:gem", count:1 }, reward:{ money:600, friendship:{ metaai:3 } } },
];

/* ---------- Achievements ----------
   check(state) => bool. Small representative set (200+ would be data
   entry; the ENGINE supports unlimited — append objects here).       */
DATA.ACHIEVEMENTS = [
  { id:"a_first_step", name:"Welcome to the Valley", desc:"Start your farm.", check:s=>true },
  { id:"a_harvest1", name:"First Harvest", desc:"Harvest a crop.", check:s=>s.stats.harvest>=1 },
  { id:"a_harvest50", name:"Master Farmer", desc:"Harvest 50 crops.", check:s=>s.stats.harvest>=50 },
  { id:"a_money1k", name:"Getting By", desc:"Hold 1,000g.", check:s=>s.money>=1000 },
  { id:"a_money10k", name:"Millionaire (ish)", desc:"Hold 10,000g.", check:s=>s.money>=10000 },
  { id:"a_chop50", name:"Lumberjack", desc:"Chop 50 wood.", check:s=>s.stats.chop>=50 },
  { id:"a_mine50", name:"Deep Digger", desc:"Mine 50 stone.", check:s=>s.stats.mine>=50 },
  { id:"a_fish10", name:"Angler", desc:"Catch 10 fish.", check:s=>s.stats.fish>=10 },
  { id:"a_legend", name:"Legendary Fisher", desc:"Catch the Riverbend Legend.", check:s=>s.stats.legend>=1 },
  { id:"a_friend", name:"Best Friend", desc:"Reach 5 hearts with anyone.",
    check:s=>Object.values(s.friendship||{}).some(v=>v>=500) },
  { id:"a_allquests", name:"Do-Gooder", desc:"Complete 5 quests.", check:s=>s.completedQuests.length>=5 },
  { id:"a_cook", name:"Home Cooking", desc:"Cook a meal.", check:s=>s.stats.cook>=1 },
  { id:"a_explorer", name:"Wanderer", desc:"Visit every area.", check:s=>Object.keys(s.visited||{}).length>=WORLD_AREA_COUNT() },
  { id:"a_night_owl", name:"Night Owl", desc:"Stay up past 2 AM.", check:s=>s.stats.stayedLate>=1 },
  { id:"a_bing", name:"Just Call Me Bing", desc:"Get teased with the nickname 10 times.", check:s=>s.stats.teased>=10 },
  { id:"a_upgrade", name:"Craftsman", desc:"Upgrade a tool.", check:s=>(s.stats.upgrades||0)>=1 },
  { id:"a_allgold", name:"Golden Touch", desc:"Own all gold-tier tools.",
    check:s=>["hoe","wateringcan","axe","pickaxe"].every(t=>(s.toolTier&&s.toolTier[t]>=3)) },
  { id:"a_build", name:"Homesteader", desc:"Build a Coop or Barn.", check:s=>(s.buildings||[]).length>=1 },
  { id:"a_animals", name:"Zookeeper", desc:"Own 5 animals.", check:s=>(s.animals||[]).length>=5 },
  { id:"a_mine25", name:"Cave Delver", desc:"Reach mine floor 10.", check:s=>(s.stats.deepest||0)>=10 },
  { id:"a_mine50f", name:"Mole", desc:"Reach mine floor 25.", check:s=>(s.stats.deepest||0)>=25 },
  { id:"a_kills50", name:"Slayer", desc:"Defeat 50 monsters.", check:s=>(s.stats.kills||0)>=50 },
  { id:"a_talent5", name:"Well-Rounded", desc:"Unlock 5 talent perks.", check:s=>(s.perks||[]).length>=5 },
  { id:"a_skill10", name:"Journeyman", desc:"Get any skill to level 10.", check:s=>Object.values(s.skills||{}).some(sk=>sk.lvl>=10) },
  { id:"a_forage25", name:"Naturalist", desc:"Gather 25 forageables.", check:s=>(s.stats.forage||0)>=25 },
  { id:"a_money50k", name:"Tycoon", desc:"Hold 50,000g.", check:s=>s.money>=50000 },
  { id:"a_collect1", name:"Treasure Hunter", desc:"Find an area collectible.", check:s=>(s.stats.collectibles||0)>=1 },
  { id:"a_collectall", name:"Completionist", desc:"Find all 12 area collectibles.", check:s=>(s.stats.collectibles||0)>=12 },
  { id:"a_secret", name:"Snoop", desc:"Uncover a hidden secret.", check:s=>(s.stats.secrets||0)>=1 },
  { id:"a_event", name:"Strange Days", desc:"Witness a random event.", check:s=>(s.stats.events||0)>=1 },
  { id:"a_crown", name:"King Bing", desc:"Claim the Widr Crown.", check:s=>!!(s.collected&&s.collected["castle:crown"]) },
  { id:"a_wanderer2", name:"Cartographer", desc:"Visit 12 different areas.", check:s=>Object.keys(s.visited||{}).length>=12 },
  { id:"a_gold_crop", name:"Quality Produce", desc:"Harvest a Gold-or-better crop.", check:s=>(s.stats.goldCrops||0)>=1 },
  { id:"a_gold_crop50", name:"Artisan Grower", desc:"Harvest 50 Gold+ crops.", check:s=>(s.stats.goldCrops||0)>=50 },
  { id:"a_boss1", name:"Giant Slayer", desc:"Defeat a mine boss.", check:s=>(s.stats.bosses||0)>=1 },
  { id:"a_boss5", name:"Boss Hunter", desc:"Defeat 5 mine bosses.", check:s=>(s.stats.bosses||0)>=5 },
  { id:"a_chest", name:"Treasure Cracker", desc:"Open a treasure chest.", check:s=>(s.stats.chests||0)>=1 },
  { id:"a_floor50", name:"Half a Mile Down", desc:"Reach mine floor 50.", check:s=>(s.stats.deepest||0)>=50 },
  { id:"a_floor100", name:"To the Core", desc:"Reach mine floor 100.", check:s=>(s.stats.deepest||0)>=100 },
  { id:"a_floor150", name:"Rock Bottom", desc:"Reach mine floor 150.", check:s=>(s.stats.deepest||0)>=150 },
  { id:"a_mage", name:"Arcane Dabbler", desc:"Cast a spell with the staff.", check:s=>(s.stats.spells||0)>=1 },
  { id:"a_armored", name:"Suited Up", desc:"Equip a piece of armor.", check:s=>!!s.armor },
  { id:"a_dodge", name:"Untouchable", desc:"Dodge roll for the first time.", check:s=>(s.stats.dodges||0)>=1 },
  { id:"a_cutscene", name:"Getting Closer", desc:"Trigger a friendship cutscene.", check:s=>(s.stats.cutscenes||0)>=1 },
  { id:"a_maxfriend", name:"Ride or Die", desc:"Reach 10 hearts with a villager.", check:s=>Object.values(s.friendship||{}).some(v=>v>=1000) },
  { id:"a_recipe_npc", name:"Family Recipe", desc:"Learn a recipe from a villager.", check:s=>(s.knownRecipes||[]).length>=1 },
  { id:"a_giver", name:"Generous Soul", desc:"Give 20 gifts.", check:s=>(s.stats.gifts||0)>=20 },
];

/* helper so achievement can count areas without world.js load order issues */
function WORLD_AREA_COUNT(){ return (window.WORLD && window.WORLD.areaCount) || 17; }

window.DATA = DATA;
