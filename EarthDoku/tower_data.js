// ---------- Enemy Tower data: heroes, moves, goods, relics and events ----------
const TW_KEY = "earthdoku-tower2", TW_TOP = 40;
const twOld = store.get("earthdoku-tower") || {};
const tw = Object.assign({best:0, runs:0, clears:0, found:[], xpDay:null, hard:{}, bestHard:0, heatMax:0, heat:0, bestEndless:0, heroes:{}}, store.get(TW_KEY) || {});
const twSave = () => store.set(TW_KEY, tw);
const WBS = (dir, f) => `https://cdn.wikibound.info/${dir}/${f}`;

// r = ratings out of 10 for [HP, PP, Offense, Defense, Speed].
// Mother and EarthBound ratings follow the stat growth rates on WikiBound; WikiBound has no growth
// tables for Mother 3, so Lucas, Kumatora, Duster, Boney and Flint follow their roles in battle.
// start = moves known when they join; learn = moves that can show up as upgrades later.
const HEROES = [
  {id:"ninten", name:"Ninten", game:"M1", spr:WBS("e/eb", "Ninten_sprite.png"), r:[6, 5, 5, 5, 5], start:["lifeup"], learn:["hypnosis", "shield", "healing", "lifeupB", "offup"], role:"All-rounder who heals"},
  {id:"ana", name:"Ana", game:"M1", spr:WBS("9/9c", "Ana_sprite.png"), r:[4, 9, 2, 3, 4], start:["pkfire"], learn:["pkbeam", "pkfreeze", "pkfireB", "lifeup", "healing", "pkthunder", "shield"], role:"PSI powerhouse, fragile"},
  {id:"lloyd", name:"Lloyd", game:"M1", spr:WBS("4/43", "Lloyd_sprite.png"), r:[4, 0, 4, 2, 2], start:["rocket"], learn:["bombT", "bigrocket", "spray"], role:"No PSI, big bottle rockets"},
  {id:"teddy", name:"Teddy", game:"M1", spr:WBS("b/b0", "Teddy_sprite.png"), r:[9, 0, 9, 8, 9], start:["slash"], learn:["glare", "fury"], role:"Brawler with a blade"},
  {id:"ness", name:"Ness", game:"EB", spr:WBS("3/32", "Ness_sprite.png"), r:[8, 5, 8, 5, 4], start:["lifeup"], learn:["pkrockin", "hypnosis", "shield", "healing", "lifeupB", "pkrockinB"], role:"Strong hitter who heals"},
  {id:"paula", name:"Paula", game:"EB", spr:WBS("7/78", "Paula_sprite.png"), r:[3, 8, 5, 3, 8], start:["pkfire"], learn:["pray", "pkfreeze", "pkfireB", "pkthunder", "shield", "offup", "magnet"], role:"Fast, fire PSI and Pray"},
  {id:"jeff", name:"Jeff", game:"EB", spr:WBS("8/80", "Jeff_sprite.png"), r:[5, 0, 4, 6, 4], start:["spy"], learn:["rocket", "bombT", "bigrocket", "spray"], role:"Gadgets: Spy, rockets, bombs"},
  {id:"poo", name:"Poo", game:"EB", spr:WBS("a/a7", "Poo_sprite.png"), r:[6, 8, 9, 9, 6], start:["pkfreeze"], learn:["starstorm", "lifeupB", "magnet", "shield", "paralysis"], role:"PSI Starstorm"},
  {id:"lucas", name:"Lucas", game:"M3", spr:WBS("f/fc", "Lucas_stand.png"), r:[6, 7, 5, 5, 5], start:["lifeup"], learn:["pklove", "pkloveB", "shield", "offup", "healing", "lifeupB", "defdown"], role:"PK Love and healing"},
  {id:"kumatora", name:"Kumatora", game:"M3", spr:WBS("3/38", "Kumatora_M3_Sprite.png"), r:[5, 9, 4, 4, 7], start:["pkfire"], learn:["pkfreeze", "pkthunder", "pkfireB", "starstorm", "magnet", "hypnosis", "offup"], role:"Attack PSI specialist"},
  {id:"duster", name:"Duster", game:"M3", spr:WBS("f/f4", "Duster_M3_Sprite.png"), r:[7, 0, 7, 6, 6], start:["tickle"], learn:["staples", "ropesnake", "smoke", "fury"], role:"Thief tools: pin and weaken"},
  {id:"boney", name:"Boney", game:"M3", spr:WBS("b/bb", "Boney_Handkerchief.png"), r:[5, 0, 6, 4, 9], start:["sniff"], learn:["bite", "bark"], role:"Very fast, sniffs out weak spots"},
  {id:"flint", name:"Flint", game:"M3", spr:WBS("2/2e", "Flint.png"), r:[9, 0, 9, 7, 5], start:["smash"], learn:["toughen", "glare"], role:"Brute force"}
];
const HERO = Object.fromEntries(HEROES.map(h => [h.id, h]));

// kind: hit (uses defense), psi (mostly ignores it), heal, healall, cure, sleep, stun, weak, offup,
// shield, magnet, pray, tough, run. all = hits every enemy.
const TMOVES = {
  lifeup:{n:"Lifeup α", kind:"heal", pp:5, pow:.4, d:"Heals the most hurt friend"},
  lifeupB:{n:"Lifeup β", kind:"healall", pp:12, pow:.35, d:"Heals the whole party"},
  healing:{n:"Healing α", kind:"cure", pp:4, d:"Cures sleep, crying and poison for everyone"},
  hypnosis:{n:"Hypnosis α", kind:"sleep", pp:5, chance:.6, d:"May put one enemy to sleep"},
  paralysis:{n:"Paralysis α", kind:"stun", pp:6, chance:.6, d:"May numb one enemy for 2 turns"},
  shield:{n:"Shield α", kind:"shield", pp:8, d:"Party takes 40% less damage for 3 turns"},
  offup:{n:"Offense up α", kind:"offup", pp:8, d:"Party hits 30% harder for 3 turns"},
  defdown:{n:"Defense down α", kind:"weak", pp:4, d:"Lowers one enemy's defense"},
  magnet:{n:"PSI Magnet α", kind:"magnet", pp:0, d:"Steals PP from an enemy"},
  pkbeam:{n:"PK Beam α", kind:"psi", pp:7, pow:2},
  pkrockin:{n:"PK Rockin α", kind:"psi", pp:10, pow:2.4},
  pkrockinB:{n:"PK Rockin β", kind:"psi", pp:18, pow:2.1, all:true},
  pkfire:{n:"PK Fire α", kind:"psi", pp:6, pow:1.7},
  pkfireB:{n:"PK Fire β", kind:"psi", pp:12, pow:1.5, all:true},
  pkfreeze:{n:"PK Freeze α", kind:"psi", pp:5, pow:1.9},
  pkthunder:{n:"PK Thunder α", kind:"psi", pp:7, pow:2.3, miss:.25, d:"Strong but can miss"},
  pklove:{n:"PK Love α", kind:"psi", pp:10, pow:2.5},
  pkloveB:{n:"PK Love β", kind:"psi", pp:20, pow:2.2, all:true},
  starstorm:{n:"PSI Starstorm α", kind:"psi", pp:22, pow:2.8, all:true},
  pray:{n:"Pray", kind:"pray", d:"Something random happens"},
  rocket:{n:"Bottle Rocket", kind:"hit", pow:2.7, cd:3, d:"Huge hit, 3-turn reload"},
  bigrocket:{n:"Big Bottle Rocket", kind:"hit", pow:4, cd:4, d:"Even bigger hit, 4-turn reload"},
  bombT:{n:"Bomb", kind:"hit", pow:1.6, all:true, cd:3, d:"Hits every enemy, 3-turn reload"},
  spray:{n:"Defense spray", kind:"shield", cd:4, d:"Party takes 40% less damage for 3 turns"},
  spy:{n:"Spy", kind:"weak", d:"Finds weak points: one enemy's defense drops"},
  sniff:{n:"Sniff", kind:"weak", d:"Sniffs out weak points: one enemy's defense drops"},
  tickle:{n:"Tickle Stick", kind:"weak", d:"Lowers one enemy's defense"},
  staples:{n:"Wall Staples", kind:"stun", chance:.7, cd:3, d:"Pins one enemy for 2 turns"},
  ropesnake:{n:"Rope Snake", kind:"stun", chance:.55, cd:2, d:"Ties up one enemy for 2 turns"},
  smoke:{n:"Smoke Ball", kind:"run", d:"Escape from a normal battle"},
  bite:{n:"Bite", kind:"hit", pow:1.7},
  bark:{n:"Bark", kind:"cry", chance:.7, d:"Scares every enemy into crying (they miss more)"},
  slash:{n:"Blade Slash", kind:"hit", pow:2.2, miss:.25, d:"Strong but can miss"},
  fury:{n:"Flurry", kind:"hit", pow:1.1, all:true, d:"Hits every enemy"},
  glare:{n:"Glare", kind:"cry", chance:.6, d:"Scares every enemy into crying (they miss more)"},
  smash:{n:"Power Smash", kind:"hit", pow:3, miss:.45, d:"SMAAAASH, but misses often"},
  toughen:{n:"Toughen Up", kind:"tough", d:"Raises this hero's defense"}
};

// Goods are real items from the series. dmg items scale with the floor.
const GOODS = {
  cookie:{n:"Cookie", ic:"🍪", kind:"heal", amt:.25, price:10, d:"Heals 25% HP"},
  hamburger:{n:"Hamburger", ic:"🍔", kind:"heal", amt:.55, price:26, d:"Heals 55% HP"},
  picnic:{n:"Picnic lunch", ic:"🧺", kind:"healall", amt:.35, price:48, d:"Heals the whole party 35%"},
  caramel:{n:"PSI Caramel", ic:"🍬", kind:"pp", amt:.35, price:30, d:"Restores 35% PP"},
  truffle:{n:"Magic truffle", ic:"🍄", kind:"pp", amt:.8, price:55, d:"Restores 80% PP"},
  noodles:{n:"Cup of Lifenoodles", ic:"🍜", kind:"revive", amt:.5, price:60, d:"Revives a fallen friend at 50%"},
  horn:{n:"Horn of life", ic:"📯", kind:"revive", amt:1, price:120, d:"Revives a fallen friend at full HP"},
  bomb:{n:"Bomb", ic:"💣", kind:"dmgall", pow:1, price:40, d:"Damages every enemy"},
  rocket:{n:"Bottle rocket", ic:"🎆", kind:"dmg", pow:2, price:32, d:"Big damage to one enemy"},
  dragonite:{n:"Bag of Dragonite", ic:"🐉", kind:"dmgall", pow:1.8, price:80, d:"Breathes fire on every enemy"},
  insecticide:{n:"Insecticide spray", ic:"🧴", kind:"dmg", pow:.8, vs:"Bug", price:24, d:"Huge damage to bugs, a little to others"},
  rust:{n:"Rust promoter", ic:"🧪", kind:"dmg", pow:.8, vs:"Machine", price:24, d:"Huge damage to machines, a little to others"},
  flyhoney:{n:"Fly honey", ic:"🍯", kind:"distract", price:35, d:"Every enemy gets distracted and loses a turn"}
};
const FOOD = ["cookie", "hamburger", "picnic"];

const RELICS = {
  franklin:{n:"Franklin badge", ic:"⚡", d:"Boss attacks that hit the whole party deal 40% less"},
  sound:{n:"Sound Stone", ic:"🔮", d:"Each boss you beat gives the party +6% to all stats"},
  coin:{n:"Mr. Saturn coin", ic:"🪙", d:"+50% money from battles"},
  rabbit:{n:"Rabbit's foot", ic:"🐇", d:"SMAAAASH chance doubled"},
  teddy:{n:"Teddy bear", ic:"🧸", d:"Takes the first enemy hit in every battle"},
  flyingman:{n:"Flying Men", ic:"🪽", d:"Another Flying Man swoops in to attack every round"},
  frog:{n:"Save Frog", ic:"🐸", d:"If your party falls, retry that floor once", normalOnly:true},
  phone:{n:"Dad's phone", ic:"☎️", d:"Dad deposits money after every boss"}
};

// what each kind of room looks like on the floor picker
const ROOMS = {
  battle:{ic:"⚔️", n:"Battle", d:"Enemies ahead. Win an upgrade."},
  tough:{ic:"💀", n:"Tough foe", d:"One strong enemy. Rare upgrade and double money."},
  shop:{ic:"🛒", n:"Mr. Saturn shop", d:"Spend money on goods and relics."},
  spring:{ic:"♨️", n:"Hot spring", d:"Recover HP and PP; fallen friends get back up.", normalOnly:true},
  present:{ic:"🎁", n:"Present box", d:"Something is inside..."},
  event:{ic:"❓", n:"Someone's here", d:"A familiar face from the series."},
  boss:{ic:"👑", n:"Boss", d:"A boss blocks the stairs."},
  final:{ic:"🌀", n:"The top", d:"The final foe."}
};

// relics added for the longer tower
Object.assign(RELICS, {
  swordkings:{n:"Sword of kings", ic:"🗡️", d:"The whole party hits 12% harder"},
  ribbon:{n:"Ribbon", ic:"🎀", d:"+2 Speed for the whole party"},
  hardhat:{n:"Hard hat", ic:"⛑️", d:"The party takes 12% less damage"},
  gutsy:{n:"Gutsy bat", ic:"🏏", d:"Bash lands SMAAAASH much more often"}
});
// curses come from the Mani Mani Statue's deals; they show in red next to your relics
const CURSES = {
  greed:{n:"Greed", ic:"💸", d:"Shop prices +40%"},
  frail:{n:"Frailty", ic:"🦴", d:"−12% Max HP for everyone"},
  haunt:{n:"Haunted", ic:"👻", d:"Enemies hit 15% harder"},
  fog:{n:"Fog", ic:"🌫️", d:"Only 2 rooms to choose from on each floor"}
};
Object.assign(ROOMS, {
  statue:{ic:"🗿", n:"Mani Mani Statue", d:"It offers a deal: a relic, for a curse."},
  dojo:{ic:"🥋", n:"Dalaam training", d:"Trade HP for a new move."}
});

// the tower is four acts of 10 floors; each act draws its enemies from one game, then the last mixes all three
const ACTS = [
  {n:"Act 1 · Eagleland", game:"EB", lo:0, hi:65},
  {n:"Act 2 · Podunk and Magicant", game:"M1", lo:15, hi:80},
  {n:"Act 3 · The Nowhere Islands", game:"M3", lo:30, hi:92},
  {n:"Act 4 · Beyond space and time", game:null, lo:50, hi:100}
];
const actOf = f => ACTS[Math.min(ACTS.length - 1, Math.floor((f - 1) / 10))];

// tough foes and (later) bosses get a trait
const TRAITS = {
  armored:{n:"Armored", ic:"🛡️", d:"Much higher defense"},
  swift:{n:"Swift", ic:"💨", d:"Sometimes acts twice"},
  vampiric:{n:"Vampiric", ic:"🩸", d:"Heals from the damage it deals"},
  enraged:{n:"Enraged", ic:"😡", d:"Hits much harder but has less HP"},
  sturdy:{n:"Sturdy", ic:"🧱", d:"The first 3 hits only do half damage"},
  regen:{n:"Regenerating", ic:"🌱", d:"Heals a little every round"},
  thorny:{n:"Thorny", ic:"🌵", d:"Hitting it up close hurts you back a little"},
  psiward:{n:"PSI-proof", ic:"🔮", d:"PSI only does half damage"},
  summoner:{n:"Summoner", ic:"📣", d:"Calls for help once it's hurt"},
  explosive:{n:"Explosive", ic:"💥", d:"Blows up when defeated, hurting your whole party"}
};

// Heat: optional extra difficulty. Reaching the top at one level unlocks the next.
const HEAT = [
  "No extra rules",
  "Enemies have 20% more HP",
  "Shops cost 30% more and hot springs heal less",
  "Tough foes and bosses get an extra trait",
  "Enemies hit 15% harder",
  "Only 2 upgrades to choose from, and no skipping for money"
];

// more party members from the series. Sprites are from WikiBound.
HEROES.push(
  {id:"pippi", name:"Pippi", game:"M1", spr:"https://cdn.wikibound.info/8/81/Pippi_sprite.png", r:[5, 0, 8, 7, 8], start:["slingshot"], learn:["fury", "glare"], role:"No PSI, but grows as fast as Teddy"},
  {id:"flyingman", name:"Flying Man", game:"M1", spr:"https://cdn.wikibound.info/5/57/Flying_Man_EB.png", r:[7, 0, 8, 6, 6], start:["dive"], learn:["fury", "glare"], role:"Brave birdman from Magicant"},
  {id:"king", name:"King", game:"EB", spr:"https://cdn.wikibound.info/2/2c/King_sprite.gif", r:[5, 0, 5, 3, 7], start:["bite"], learn:["lunge", "charge", "bark"], role:"Ness's dog: bites, lunges, charges"},
  {id:"picky", name:"Picky", game:"EB", spr:"https://cdn.wikibound.info/2/23/Picky_sprite.gif", r:[3, 0, 2, 3, 5], start:["chant"], learn:["spy", "glare"], role:"Weak, but chants a magical spell"},
  {id:"buzzbuzz", name:"Buzz Buzz", game:"EB", spr:"https://cdn.wikibound.info/4/4b/BuzzBuzzFlying.gif", r:[2, 8, 3, 2, 9], start:["shield"], learn:["lifeup", "pkbeam", "healing", "lifeupB"], role:"Tiny warrior from 10 years in the future"},
  {id:"bubblemonkey", name:"Bubble Monkey", game:"EB", spr:"https://cdn.wikibound.info/0/0f/Bubble_Monkey_sprite.gif", r:[4, 0, 3, 4, 9], start:["gum"], learn:["bite", "tricks"], role:"Very fast; blows protective bubbles"},
  {id:"dungeonman", name:"Dungeon Man", game:"EB", spr:"https://cdn.wikibound.info/6/6d/Dungeon_Man_sprite.gif", r:[10, 0, 6, 10, 1], start:["stomp"], learn:["toughen", "glare"], role:"A walking dungeon: huge and slow"},
  {id:"salsa", name:"Salsa", game:"M3", spr:"https://cdn.wikibound.info/1/1e/Salsa.png", r:[4, 0, 3, 3, 8], start:["tricks"], learn:["tickle", "bite", "gum"], role:"Monkey Tricks distract every enemy"}
);
HEROES.forEach(h => HERO[h.id] = h);
Object.assign(TMOVES, {
  slingshot:{n:"Slingshot", kind:"hit", pow:1.6},
  dive:{n:"Dive bomb", kind:"hit", pow:2.4, miss:.15, d:"Strong but can miss"},
  lunge:{n:"Growl and lunge", kind:"hit", pow:2.2},
  charge:{n:"Charge forward", kind:"hit", pow:1.2, all:true, d:"Hits every enemy"},
  chant:{n:"Chant a spell", kind:"chant", d:"Usually does nothing... usually"},
  gum:{n:"Blow a bubble", kind:"shield", cd:3, d:"Party takes 40% less damage for 3 turns"},
  stomp:{n:"Stomp", kind:"hit", pow:1.3, all:true, d:"Hits every enemy"},
  tricks:{n:"Monkey Tricks", kind:"cry", chance:.7, d:"Every enemy gets distracted and misses more"}
});

// Only Ninten, Ness and Lucas start out. Everyone else has to be found in the tower:
// each one only shows up in one act, from a certain floor, behind a rare ✨ room.
const STARTERS = ["ninten", "ness", "lucas"];
const FIND = {
  paula:[2, 2, "Paula's voice calls out to you in a dream..."], king:[3, 2, "A dog is sniffing around. It's King!"],
  picky:[4, 3, "Someone is fast asleep behind a rock. It's Picky."], buzzbuzz:[5, 4, "A buzzing sound... a bee? It's Buzz Buzz!"],
  jeff:[7, 6, "A Sky Runner crash-lands nearby. Jeff climbs out of the wreck."], bubblemonkey:[7, 6, "A monkey blowing a bubble... it wants gum."],
  dungeonman:[9, 8, "The floor rumbles. A dungeon is walking toward you!"],
  pippi:[12, 11, "A casket creaks open. Pippi pops out!"], lloyd:[13, 12, "A nervous boy with glasses peeks out. It's Lloyd."],
  ana:[15, 14, "A girl in a pink hat says she has been waiting for you. It's Ana."], teddy:[17, 16, "The leader of the Bla-Bla Gang blocks the way. It's Teddy."],
  flyingman:[18, 17, "A tall birdman salutes you. Flying Man is ready to fight!"],
  boney:[22, 21, "A dog with a handkerchief barks at you. It's Boney!"], duster:[23, 22, "Someone limps out of the shadows. It's Duster."],
  kumatora:[25, 24, "A pink-haired princess kicks the door open. It's Kumatora!"], salsa:[26, 25, "A monkey is dancing all alone. It's Salsa."],
  flint:[29, 28, "A cowboy stands quietly in the rain. It's Flint."], poo:[34, 33, "A prince from Dalaam floats down from the sky. It's Poo."]
};
STARTERS.forEach(id => { if (!tw.found.includes(id)) tw.found.push(id); });
ROOMS.meet = {ic:"✨", n:"A familiar presence", d:"Someone from the series is nearby..."};

// even more faces for the roster (sprites from WikiBound). Not all of them fought in their own games.
HEROES.push(
  {id:"eve", name:"EVE", game:"M1", spr:"https://cdn.wikibound.info/0/06/Eve.gif", r:[9, 0, 10, 9, 3], start:["charge"], learn:["toughen", "glare"], role:"Robot built by George to protect Ninten"},
  {id:"claus", name:"Claus", game:"M3", spr:"https://cdn.wikibound.info/5/5a/Claus_child_sprite.png", r:[6, 6, 6, 5, 7], start:["slash"], learn:["pkfire", "pkthunder", "offup"], role:"Lucas's bold twin brother"},
  {id:"pokey", name:"Pokey", game:"EB", spr:"https://cdn.wikibound.info/f/fc/Pokey_sprite.gif", r:[3, 0, 1, 2, 4], start:["pokeyshield"], learn:[], role:"Useless in a fight, and proud of it"},
  {id:"tony", name:"Tony", game:"EB", spr:"https://cdn.wikibound.info/9/9a/Tony.png", r:[4, 0, 3, 4, 5], start:["cheer"], learn:["spy"], role:"Jeff's best friend from Winters"},
  {id:"mrsaturn", name:"Mr. Saturn", game:"EB", spr:"https://cdn.wikibound.info/a/a3/EB_Mr_Saturn.png", r:[4, 5, 3, 3, 4], start:["boing"], learn:["lifeup", "healing", "lifeupB"], role:"BOinG! Heals friends with a ZOOm"},
  {id:"applekid", name:"Apple Kid", game:"EB", spr:"https://cdn.wikibound.info/7/7d/AppleKid.gif", r:[4, 0, 2, 3, 4], start:["invent"], learn:["bombT", "spray"], role:"Inventor. Results may vary"},
  {id:"andonuts", name:"Dr. Andonuts", game:"EB", spr:"https://cdn.wikibound.info/b/b8/DrAndonuts.gif", r:[4, 0, 4, 4, 3], start:["spray"], learn:["bigrocket", "bombT", "rocket"], role:"Jeff's father, the genius scientist"}
);
HEROES.forEach(h => HERO[h.id] = h);
Object.assign(TMOVES, {
  pokeyshield:{n:"Use a friend as a shield", kind:"guard", d:"Pokey hides. Takes half damage until his next turn"},
  cheer:{n:"Cheer everyone on", kind:"offup", cd:4, d:"Party hits 30% harder for 3 turns"},
  boing:{n:"BOinG!", kind:"heal", cd:2, pow:.3, d:"Heals the most hurt friend, no PP needed"},
  invent:{n:"Try an invention", kind:"invent", cd:2, d:"Makes a random battle item... or blows up"}
});
Object.assign(FIND, {
  pokey:[3, 3, "Someone is hiding behind a bush, shaking. It's Pokey."], applekid:[4, 4, "A boy covered in grease waves a wrench at you. It's Apple Kid."],
  tony:[6, 6, "A boy from a boarding school is looking for his friend. It's Tony."], mrsaturn:[8, 8, "\"Hi HO. mE mR. SatURn.\" A Mr. Saturn wants to come along!"],
  andonuts:[9, 9, "An old scientist is muttering about the Phase Distorter. It's Dr. Andonuts."],
  eve:[19, 19, "A huge robot rises out of the water. EVE has been waiting to protect you."],
  claus:[27, 27, "A boy with orange hair grins at you. It's Claus!"]
});

// more goods from the series
Object.assign(GOODS, {
  bread:{n:"Bread", ic:"🍞", kind:"heal", amt:.2, price:8, d:"Heals 20% HP"},
  magicherb:{n:"Magic Herb", ic:"🌿", kind:"heal", amt:.4, price:20, d:"Heals 40% HP"},
  pizza:{n:"Pizza", ic:"🍕", kind:"heal", amt:.7, price:36, d:"Heals 70% HP"},
  kingburger:{n:"King Burger", ic:"🍔", kind:"heal", amt:.6, price:32, d:"Heals 60% HP"},
  nutbread:{n:"Nut Bread", ic:"🥖", kind:"heal", amt:.3, price:14, d:"Heals 30% HP"},
  brainfood:{n:"Brain food lunch", ic:"🍱", kind:"full", price:90, d:"Fully restores one friend's HP and PP"},
  psistone:{n:"PSI Stone", ic:"💎", kind:"pp", amt:.5, price:40, d:"Restores 50% PP"},
  asthma:{n:"Asthma Spray", ic:"💨", kind:"cure", price:18, d:"Cures sleep, crying and poison for everyone"},
  rockcandy:{n:"Rock candy", ic:"🍭", kind:"stat", price:70, d:"Permanently raises one friend's stats a little"},
  magiccandy:{n:"Magic Candy", ic:"🍬", kind:"stat", price:70, d:"Permanently raises one friend's stats a little"},
  superbomb:{n:"Super Bomb", ic:"💥", kind:"dmgall", pow:2, price:75, d:"Big damage to every enemy"},
  multirocket:{n:"Multi bottle rocket", ic:"🎇", kind:"dmg", pow:3.5, price:65, d:"Huge damage to one enemy"},
  thunderbomb:{n:"Thunder Bomb", ic:"⚡", kind:"dmgall", pow:1.3, price:50, d:"Thunder damage to every enemy"},
  dragofang:{n:"Drago Fang", ic:"🦷", kind:"dmg", pow:2.5, price:45, d:"Big damage to one enemy"}
});
FOOD.push("bread", "magicherb", "pizza", "kingburger", "nutbread");

// more relics from the series
Object.assign(RELICS, {
  earthpendant:{n:"Earth Pendant", ic:"🌍", d:"Attacks that hit the whole party deal 25% less"},
  magicribbon:{n:"Magic Ribbon", ic:"🎗️", d:"+15% Max PP for the whole party"},
  onyx:{n:"Onyx Hook", ic:"🪝", d:"Hot springs heal everyone fully"},
  cherub:{n:"Cherub's band", ic:"😇", d:"Everyone standing recovers 4% HP every round"},
  diadem:{n:"Diadem of kings", ic:"👑", d:"PSI deals 15% more damage"},
  casey:{n:"Casey bat", ic:"⚾", d:"Bash hits 60% harder, but misses a quarter of the time"},
  magicantbat:{n:"Magicant bat", ic:"🌀", d:"+10% Offense and +10% Max PP for the whole party"},
  hawkeye:{n:"Hawk eye", ic:"🦅", d:"Your attacks and moves never miss"},
  egglight:{n:"Egg of Light", ic:"🥚", d:"Once per run, if everyone falls, the whole party gets back up at 30%"},
  yoyo:{n:"Friend's Yo-yo", ic:"🪀", d:"+2 Offense and +2 Speed for the whole party"},
  spittoon:{n:"Noble Spittoon", ic:"🏺", d:"+25% money from battles"}
});

// more relics from all three games
Object.assign(RELICS, {
  goddess:{n:"Goddess band", ic:"💍", d:"+3 Defense for the whole party"},
  bracer:{n:"Bracer of kings", ic:"🛡️", d:"+8% Max HP for the whole party"},
  legendbat:{n:"Legendary bat", ic:"🦴", d:"Bash hits 25% harder"},
  butterfly:{n:"Magic butterfly", ic:"🦋", d:"Everyone standing recovers 3% PP every round"},
  peacecoin:{n:"Peace coin", ic:"☮️", d:"Shop prices −15%"},
  bike:{n:"Bicycle", ic:"🚲", d:"Running away from normal battles always works"},
  repelring:{n:"Repel ring", ic:"⭕", d:"Battle rooms show up less often"},
  thieftools:{n:"Thief tools", ic:"🧰", d:"Swipe a bit of food after every battle you win"},
  sunflower:{n:"Sunflower", ic:"🌻", d:"Everyone standing heals 8% HP on each new floor"},
  ropesnake:{n:"Rope Snake", ic:"🐍", d:"At the start of every battle, the snake ties up one enemy for a turn"}
});

// odd friends who never joined the party in their own games (sprites from WikiBound)
HEROES.push(
  {id:"mick", name:"Mick", game:"M1", spr:"https://cdn.wikibound.info/5/57/Mick.png", r:[5, 0, 7, 4, 9], start:["bite", "bark"], learn:["lunge", "sniff"], role:"Ninten's loyal dog. Fast, scrappy, a very good boy"},
  {id:"queenmary", name:"Queen Mary", game:"M1", spr:"https://cdn.wikibound.info/6/6a/QueenMary.png", r:[6, 9, 2, 5, 4], start:["lullaby"], learn:["hypnosis", "lifeupB", "healing"], role:"Queen of Magicant. Her song heals everyone"},
  {id:"mimmie", name:"Mimmie & Minnie", game:"M1", spr:"https://cdn.wikibound.info/e/ee/Mimmie.png", r:[4, 3, 4, 3, 7], start:["pester", "twinhug"], learn:["lifeup", "cheer"], role:"Ninten's twin sisters. Annoying to enemies, sweet to you"},
  {id:"laura", name:"Laura", game:"M1", spr:"https://cdn.wikibound.info/b/b2/Canary.png", r:[2, 6, 2, 2, 10], start:["chirp"], learn:["hypnosis", "flutterpp"], role:"The canary who remembers a melody. Tiny, but very fast"},
  {id:"brickroad", name:"Brick Road", game:"EB", spr:"https://cdn.wikibound.info/7/70/BrickRoad.gif", r:[6, 0, 5, 7, 3], start:["builddungeon"], learn:["stomp", "staples"], role:"Dungeon designer. Builds walls in the middle of fights"},
  {id:"maxwell", name:"Maxwell", game:"EB", spr:"https://cdn.wikibound.info/d/d5/Maxwell.png", r:[4, 0, 3, 4, 5], start:["explain"], learn:["savegame", "spy"], role:"Jeff's roommate. Knows a lot, explains even more"},
  {id:"cat", name:"A cat", game:"EB", spr:"https://cdn.wikibound.info/9/97/EB_cat.gif", r:[3, 0, 6, 3, 10], start:["scratch"], learn:["purr", "fury"], role:"Just a cat. Meow. It does what it wants"},
  {id:"everdred", name:"Everdred", game:"EB", spr:"https://cdn.wikibound.info/3/32/EB_Everdred_Overworld_sprite.png", r:[6, 0, 5, 6, 4], start:["swipe"], learn:["bite", "glare"], role:"Burglin Park's boss. Steals from enemies mid-battle"},
  {id:"alec", name:"Alec", game:"M3", spr:"https://cdn.wikibound.info/a/a0/Alec.png", r:[6, 0, 4, 5, 3], start:["nutbreadshare"], learn:["cheer", "toughen"], role:"Lucas's grandpa. Always has lunch to share"},
  {id:"butch", name:"Butch", game:"M3", spr:"https://cdn.wikibound.info/0/04/Butch.png", r:[7, 0, 6, 5, 3], start:["wrangle"], learn:["swipe", "charge"], role:"Pig farmer who loves money a little too much"},
  {id:"fuel", name:"Fuel", game:"M3", spr:"https://cdn.wikibound.info/e/e1/FuelYoung.png", r:[5, 0, 6, 4, 7], start:["dash"], learn:["slingshot", "rescue"], role:"Lighter's son. Brave, a little reckless"},
  {id:"butterfly", name:"Magic Butterfly", game:"M3", spr:"https://cdn.wikibound.info/3/31/Magic_Butterfly.gif", r:[1, 8, 1, 1, 9], start:["flutterpp"], learn:["healing", "lifeup"], role:"Restores the whole party's PP. Very fragile"}
);
HEROES.forEach(h => HERO[h.id] = h);
Object.assign(TMOVES, {
  lullaby:{n:"Sing a lullaby", kind:"healall", cd:3, pow:.22, d:"Heals the whole party a little, no PP needed"},
  pester:{n:"Pester", kind:"cry", chance:.6, d:"Annoys every enemy into crying (they miss more)"},
  twinhug:{n:"Twin hug", kind:"heal", cd:3, pow:.3, d:"Hugs one friend better, no PP needed"},
  chirp:{n:"Chirp the melody", kind:"sleep", chance:.45, cd:2, d:"May lull one enemy to sleep"},
  flutterpp:{n:"Flutter", kind:"ppall", cd:2, d:"Everyone standing recovers some PP"},
  builddungeon:{n:"Build a wall", kind:"shield", cd:4, d:"Party takes 40% less damage for 3 turns"},
  explain:{n:"Explain the enemy", kind:"weak", d:"Points out one enemy's weak spot: its defense drops"},
  savegame:{n:"Save the game", kind:"guard", cd:3, d:"Everyone's progress is safe... Maxwell takes half damage until his next turn"},
  scratch:{n:"Scratch", kind:"hit", pow:1.5},
  purr:{n:"Purr", kind:"heal", cd:3, pow:.25, d:"A friend feels better, no PP needed"},
  swipe:{n:"Swipe", kind:"steal", pow:1.1, d:"Hits one enemy and steals some money (and sometimes food)"},
  nutbreadshare:{n:"Share Nut Bread", kind:"heal", cd:2, pow:.3, d:"Heals one friend, no PP needed"},
  wrangle:{n:"Wrangle", kind:"stun", chance:.6, cd:2, d:"Grabs one enemy so it can't move for 2 turns"},
  dash:{n:"Brave dash", kind:"hit", pow:2, miss:.1, d:"A strong hit that rarely misses"},
  rescue:{n:"Fire rescue", kind:"cure", d:"Cures sleep, crying and poison for everyone"}
});
Object.assign(FIND, {
  brickroad:[2, 2, "Bricks are stacked in a strange pattern. A man pops out of them: it's Brick Road!"],
  everdred:[3, 3, "Someone jumps off a rooftop in a Hawaiian shirt. It's Everdred, and he seems friendly today."],
  cat:[5, 5, "A cat is sitting in the middle of the hallway. It looks at you. It decides to follow you."],
  maxwell:[7, 7, "A boy with glasses is reading a very thick book. It's Maxwell, Jeff's roommate."],
  mick:[11, 11, "A dog runs up wagging its tail. It's Mick, all the way from Podunk!"],
  mimmie:[13, 13, "Two girls giggle behind a door. It's Mimmie and Minnie, Ninten's sisters!"],
  laura:[15, 15, "A canary chirps the same few notes over and over. It's Laura!"],
  queenmary:[18, 18, "A soft song drifts down the hall. Queen Mary is looking for someone..."],
  alec:[21, 21, "An old man with a beard waves a ladder at you. It's Alec, Lucas's grandpa!"],
  butch:[23, 23, "A big man is counting coins next to a pig pen. It's Butch."],
  fuel:[24, 24, "A boy covered in soot runs up, out of breath. It's Fuel!"],
  butterfly:[26, 26, "A glowing butterfly lands on your shoulder and won't leave."]
});

// New Run+ options: twists you can switch on before a normal climb (never in Daily Hard)
// each one is unlocked its own way, and changes Saturn's shop money for the climb: easier twists pay less, harder ones pay more
const towerEarned = () => typeof shop !== "undefined" && shop.by ? shop.by.tower || 0 : 0;
const gamesSpread = () => Math.min(...["M1", "EB", "M3"].map(g => HEROES.filter(h => !h.mine && h.game === g && isUnlocked(h)).length));
const RUNMODS = [
  {id:"training", ic:"🐣", n:"Training wheels", d:"Enemies are 30% weaker, but nothing from this run counts toward your records or Heat.", cash:0, prog:() => [tw.runs, 1], lock:"Finish your first climb"},
  {id:"mystery", ic:"🎲", n:"Mystery hero", d:"Your starting hero is picked at random from everyone you've found. +25% battle money.", cash:1.1, prog:() => [tw.found.length, 5], lock:"Find 5 heroes"},
  {id:"rich", ic:"💰", n:"Head start", d:"Start with $150 and a random relic.", cash:.8, prog:() => [towerEarned(), 300], lock:"Earn $300 for Saturn's shop from Tower climbs"},
  {id:"glass", ic:"🗡️", n:"Glass cannon", d:"Your party deals 50% more damage and takes 50% more.", cash:1.15, prog:() => [tw.best, 10], lock:"Reach floor 10"},
  {id:"noshop", ic:"🚫", n:"No shops", d:"Mr. Saturn's shops never show up. Present boxes and visitors are more common.", cash:1.25, prog:() => [tw.runs, 10], lock:"Play 10 climbs"},
  {id:"bossrush", ic:"👑", n:"Boss rush", d:"Every battle room is a tough foe instead. +50% battle money.", cash:1.4, prog:() => [tw.best, 15], lock:"Reach floor 15"},
  {id:"squad", ic:"👥", n:"Full squad", d:"Start with three more heroes you've found, but nobody new will ever join.", cash:.7, prog:() => [tw.found.length, 8], lock:"Find 8 heroes"},
  {id:"chaos", ic:"🌀", n:"Chaos acts", d:"Every act mixes enemies from all three games.", cash:1.1, prog:() => [gamesSpread(), 3], lock:"Find 3 heroes from each game"},
  {id:"quick", ic:"⏩", n:"Quick start", d:"Skip Act 1: start on floor 11 with three free upgrades.", cash:.75, prog:() => [tw.best, 20], lock:"Reach floor 20"},
  {id:"cursed", ic:"😈", n:"Devil's bargain", d:"Start with two random relics... and two random curses.", cash:1.1, prog:() => [tw.tokensAll || 0, 10], lock:"Earn 10 Tower Tokens from run goals"},
  {id:"fragile", ic:"💔", n:"Fragile hearts", d:"Everyone has half Max HP. Hot springs and Dr. Saturn heal fully.", cash:1.35, prog:() => [tw.clears, 1], lock:"Reach the top once"},
  {id:"elite", ic:"💀", n:"Elite foes", d:"Every enemy has a trait, and bosses have two more. +30% battle money.", cash:1.4, prog:() => [tw.heatMax || 0, 2], lock:"Unlock Heat 2"}
];
RUNMODS.forEach(m => m.need = () => { const [n, goal] = m.prog(); return n >= goal; });
const RUNMOD = Object.fromEntries(RUNMODS.map(m => [m.id, m]));
// all the twists in a climb multiply together, from ×0.25 up to ×3 (training wheels always pays nothing)
const MOD_CASH_MIN = .25, MOD_CASH_MAX = 3;
const modCash = mods => mods.some(k => RUNMOD[k] && RUNMOD[k].cash === 0) ? 0
  : Math.min(MOD_CASH_MAX, Math.max(MOD_CASH_MIN, mods.reduce((x, k) => x * (RUNMOD[k] ? RUNMOD[k].cash : 1), 1)));
const cashTag = x => x === 0 ? "💰 ×0" : `💰 ×${+x.toFixed(2)}`;
if (!Array.isArray(tw.mods)) tw.mods = [];

// ---------- replayability: blessings, run goals, Tower Tokens and perks, weekly challenge ----------
["tokens", "tokensAll"].forEach(k => { if (typeof tw[k] !== "number") tw[k] = 0; });
if (!tw.perks || typeof tw.perks !== "object") tw.perks = {};
if (!tw.weekly || typeof tw.weekly !== "object") tw.weekly = {};
// at the start of every act you pick one of these
const BLESSINGS = {
  might:{ic:"⚔️", n:"Blessing of Might", d:"+3 Offense for the whole party", now:() => tr.team.forEach(m => { m.bonus.atk += 3; refresh(m); })},
  ward:{ic:"🛡️", n:"Blessing of the Ward", d:"+3 Defense for the whole party", now:() => tr.team.forEach(m => { m.bonus.def += 3; refresh(m); })},
  swift:{ic:"💨", n:"Blessing of Wind", d:"+2 Speed for the whole party", now:() => tr.team.forEach(m => { m.bonus.spd += 2; refresh(m); })},
  vigor:{ic:"❤️", n:"Blessing of Vigor", d:"+15% Max HP for the whole party", now:() => tr.team.forEach(m => { const b = m.mhp; m.bonus.hp += .15; refresh(m); m.hp += m.mhp - b; m.shown = m.hp; })},
  mind:{ic:"🧠", n:"Blessing of the Mind", d:"+20% Max PP and +10% PSI power", now:() => tr.team.forEach(m => { m.bonus.pp += .2; m.bonus.psi += .1; refresh(m); m.pp = m.mpp; })},
  wealth:{ic:"💰", n:"Blessing of Wealth", d:"$80 now, and +15% battle money for the rest of the run", now:() => { tr.money += 80; }},
  feast:{ic:"🍱", n:"Blessing of Plenty", d:"Three random foods for the bag", now:() => { for (let i = 0; i < 3; i++) { const k = pickR(FOOD); tr.goods[k] = (tr.goods[k] || 0) + 1; } }},
  insight:{ic:"🔮", n:"Blessing of Insight", d:"Your next 3 upgrade picks are all rare ones", now:() => { tr.rareLeft = (tr.rareLeft || 0) + 3; }},
  regen:{ic:"🌿", n:"Blessing of Growth", d:"After every battle, everyone standing heals 8% HP", now:() => {}},
  fortune:{ic:"🍀", n:"Blessing of Fortune", d:"+1 upgrade reroll now, and SMAAAASH comes a bit more often", now:() => { tr.rerolls = (tr.rerolls || 0) + 1; }},
  relicB:{ic:"🏺", n:"Blessing of Old Things", d:"A random relic, but −10% Max HP for everyone", now:() => {
    const left = Object.keys(RELICS).filter(k => !tr.relics.includes(k) && !(RELICS[k].normalOnly && tr.hard));
    if (left.length) tr.relics.push(pickR(left));
    tr.team.forEach(m => { m.bonus.hp -= .1; refresh(m); });
  }}
};
// three of these are picked at the start of every run; each one done earns Tower Tokens
const GOALS = {
  f15:{n:"Reach floor 15", t:1, ok:(s, f) => f >= 15},
  f25:{n:"Reach floor 25", t:2, ok:(s, f) => f >= 25},
  top:{n:"Reach the top", t:3, ok:() => !!tr.cleared},
  noko:{n:"Reach floor 10 before anyone faints", t:2, ok:(s, f) => f >= 10 && (!s.firstKO || s.firstKO > 10)},
  rich:{n:"Hold $400 at once", t:1, ok:s => s.maxMoney >= 400},
  relics:{n:"Carry 5 relics", t:2, ok:() => tr.relics.length >= 5},
  psi:{n:"Use PSI 25 times", t:1, ok:s => s.psi >= 25},
  nogoods:{n:"Reach floor 12 without using goods", t:2, ok:(s, f) => f >= 12 && (!s.firstGood || s.firstGood > 12)},
  solo:{n:"Reach floor 10 with only one hero", t:2, ok:(s, f) => f >= 10 && s.soloTo >= 10},
  boss5:{n:"Beat 5 bosses", t:2, ok:() => tr.bosses >= 5},
  full:{n:"Have a full party of 4", t:1, ok:s => s.maxTeam >= 4},
  wins:{n:"Win 20 battles", t:1, ok:s => s.wins >= 20},
  rooms:{n:"Visit 3 special rooms (arcade, library, vault, workshop or Moonside)", t:1, ok:s => s.special >= 3}
};
// permanent upgrades bought with Tower Tokens (they don't apply to the Daily Hard or Weekly climbs)
const PERKS = {
  reroll:{ic:"🔄", n:"Second opinion", d:"+1 upgrade reroll per run", cost:[3, 6]},
  pocket:{ic:"👛", n:"Pocket money", d:"+$40 at the start of every run", cost:[2, 4, 6]},
  lunch:{ic:"🍔", n:"Packed lunch", d:"Start every run with a Hamburger", cost:[2]},
  keen:{ic:"🪙", n:"Keen eye", d:"+10% battle money", cost:[3, 6]},
  blessing:{ic:"✨", n:"Many blessings", d:"Pick from 4 blessings instead of 3", cost:[5]},
  scout:{ic:"🔭", n:"Scout ahead", d:"An extra door to choose from on every floor", cost:[6]},
  secondwind:{ic:"💫", n:"Second wind", d:"Once per run, the first hero to faint gets back up at 25%", cost:[6]},
  oldfriend:{ic:"🎒", n:"Lucky charm", d:"Start every run with a random relic", cost:[8]}
};
const perkLv = k => tw.perks[k] || 0;
ROOMS.arcade = {ic:"🎰", n:"Arcade", d:"Feeling lucky? Spin for prizes."};
ROOMS.library = {ic:"📚", n:"Library", d:"Pick one new move to learn."};
ROOMS.vault = {ic:"🗝️", n:"Vault", d:"Pick a relic, paid for in HP."};
ROOMS.chest = {ic:"💎", n:"Golden chest", d:"Rare! Something for Saturn's shop is locked inside."};
ROOMS.workshop = {ic:"🔧", n:"Apple Kid's workshop", d:"Tune up a move, or take a gadget."};
ROOMS.moonside = {ic:"🌀", n:"Moonside", d:"Three doors. Yes. No. Anything could happen."};
// the weekly challenge: same hero, same twists and same tower for everyone all week
const weekKey = () => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const WEEKLY_MODS = ["glass", "noshop", "bossrush", "chaos", "cursed", "fragile", "elite", "rich"];
function weeklyPlan() {
  const r = mulberry32(hashStr("tower-week-" + weekKey())), pick = a => a[Math.floor(r() * a.length)];
  const hero = pick(STARTERS), m1 = pick(WEEKLY_MODS);
  let m2 = pick(WEEKLY_MODS); while (m2 === m1) m2 = pick(WEEKLY_MODS);
  return {hero, mods:[m1, m2]};
}

// ---------- 10 more heroes (50 in all): sprites from WikiBound's file pages ----------
Object.assign(TMOVES, {
  gangrumble:{n:"Gang rumble", kind:"hit", pow:1.1, all:true, d:"Hits every enemy"},
  checkup:{n:"Checkup", kind:"heal", cd:2, pow:.35, d:"Heals one friend, no PP needed"},
  crackedbat:{n:"Cracked bat", kind:"hit", pow:1.5},
  escargo:{n:"Escargo Express", kind:"healall", cd:3, pow:.15, d:"A delivery of snacks heals the whole party a little"},
  nightstick:{n:"Nightstick", kind:"hit", pow:1.8},
  arrest:{n:"You're under arrest!", kind:"stun", chance:.55, cd:2, d:"Cuffs one enemy so it can't move for 2 turns"},
  serenade:{n:"Sing on stage", kind:"sleep", chance:.5, cd:2, d:"May lull one enemy to sleep"},
  homecooking:{n:"Home cooking", kind:"healall", cd:4, pow:.25, d:"A warm family meal heals the whole party, no PP needed"},
  axe:{n:"Swing the axe", kind:"hit", pow:1.9, miss:.12, d:"A heavy chop that sometimes misses"},
  sizeup:{n:"Reggie sizes it up", kind:"weak", d:"Reggie spots one enemy's weak spot: its defense drops"},
  monkeysamba:{n:"Monkey samba", kind:"cry", chance:.6, d:"Dances circles around every enemy (they miss more)"}
});
HEROES.push(
  {id:"bbgang", name:"B.B. Gang member", game:"M1", spr:"https://cdn.wikibound.info/3/30/B.B.GangOverworld.png", r:[6, 0, 6, 4, 6], start:["gangrumble"], learn:["glare", "charge"], role:"One of the Bla-Bla Gang's toughs. Hits hard, talks big"},
  {id:"benny", name:"Old Sawbones Benny", game:"M1", spr:"https://cdn.wikibound.info/1/1e/DoctorEBB.png", r:[5, 0, 2, 4, 3], start:["checkup"], learn:["rescue", "toughen"], role:"The old doctor. Patches the party up mid-fight"},
  {id:"tracy", name:"Tracy", game:"EB", spr:"https://cdn.wikibound.info/8/88/Tracy.gif", r:[4, 0, 4, 3, 7], start:["crackedbat", "escargo"], learn:["cheer", "smoke"], role:"Ness's little sister. Works for Escargo Express"},
  {id:"captainstrong", name:"Captain Strong", game:"EB", spr:"https://cdn.wikibound.info/3/3d/EB_Captain_Strong_Overworld_sprite.png", r:[7, 0, 6, 6, 3], start:["nightstick", "arrest"], learn:["toughen", "glare"], role:"Onett's chief of police. Strong, and he wants you to know it"},
  {id:"venus", name:"Venus", game:"EB", spr:"https://cdn.wikibound.info/d/dc/Venus.png", r:[4, 6, 3, 3, 6], start:["serenade"], learn:["lullaby", "cheer", "hypnosis"], role:"The Topolla Theater's star singer"},
  {id:"orangekid", name:"Orange Kid", game:"EB", spr:"https://cdn.wikibound.info/d/df/Orange_Kid.gif", r:[4, 0, 4, 4, 5], start:["invent"], learn:["spray", "rocket"], role:"A young inventor who's always looking for investors"},
  {id:"lisa", name:"Lisa", game:"M3", spr:"https://cdn.wikibound.info/5/59/Lisa.png", r:[6, 0, 4, 5, 3], start:["homecooking"], learn:["nutbreadshare", "rescue"], role:"Thomas's wife, mother of Nichol and Richie. Keeps everyone fed"},
  {id:"lou", name:"Lou", game:"M3", spr:"https://cdn.wikibound.info/1/17/Lou.png", r:[7, 0, 6, 5, 3], start:["axe"], learn:["charge", "toughen"], role:"One of Lighter's lumberjacks. Strong arms, slow feet"},
  {id:"reggie", name:"Reggie", game:"M3", spr:"https://cdn.wikibound.info/d/d4/Reggie.png", r:[5, 0, 5, 4, 5], start:["sizeup"], learn:["dash", "cheer"], role:"Lives in a teepee west of Tazmily's square. Reggie talks about Reggie a lot"},
  {id:"samba", name:"Samba", game:"M3", spr:"https://cdn.wikibound.info/f/f9/Samba.png", r:[3, 0, 4, 3, 9], start:["monkeysamba"], learn:["tricks", "purr"], role:"Salsa's sweetheart. A quick little dancer"}
);
HEROES.forEach(h => HERO[h.id] = h);
tw.found = tw.found.filter(id => HERO[id]); twSave();
Object.assign(FIND, {
  tracy:[4, 4, "A girl in an Escargo Express cap waves at you. It's Tracy, Ness's little sister!"],
  captainstrong:[6, 6, "\"Halt!\" A big police officer blocks the hallway. Captain Strong has decided to keep the peace up here."],
  orangekid:[8, 8, "A boy with a clipboard asks if you'd like to invest in his latest idea. It's Orange Kid."],
  venus:[9, 9, "Music drifts from behind a curtain. Venus is taking a break between shows."],
  bbgang:[14, 14, "A guy in a leather jacket cracks his knuckles. A B.B. Gang member wants in on the action."],
  benny:[16, 16, "An old doctor with a black bag peers at you. \"Say ahh.\" It's Old Sawbones Benny."],
  reggie:[22, 22, "Someone has pitched a teepee in the hallway. \"Reggie is staying calm,\" says Reggie. It's Reggie from Tazmily."],
  lou:[24, 24, "Thunk, thunk. Someone is chopping firewood. It's Lou, one of Lighter's lumberjacks."],
  lisa:[25, 25, "Something smells delicious. A woman is cooking for the whole floor. It's Lisa from Tazmily."],
  samba:[27, 27, "A little monkey is dancing all by herself. It's Samba, Salsa's sweetheart!"]
});

// ---------- signature moves: one-of-a-kind abilities heroes can unlock ----------
Object.assign(TMOVES, {
  lifeupG:{n:"Lifeup γ", kind:"healall", pp:20, pow:.6, sig:1, d:"Heals the whole party a lot"},
  pkbeamG:{n:"PK Beam γ", kind:"psi", pp:16, pow:3.3, sig:1, d:"A powerful beam at one enemy"},
  pkrockinG:{n:"PK Rockin γ", kind:"psi", pp:28, pow:2.6, all:true, sig:1, d:"Ness's own PSI: big damage to every enemy"},
  pkrockinO:{n:"PK Rockin Ω", kind:"psi", pp:40, pow:3.2, all:true, sig:1, d:"The strongest PK Rockin: huge damage to every enemy"},
  pkfreezeG:{n:"PK Freeze γ", kind:"psi", pp:16, pow:3.4, sig:1, d:"A deep freeze on one enemy"},
  starstormO:{n:"PSI Starstorm Ω", kind:"psi", pp:34, pow:3.4, all:true, sig:1, d:"Stars rain down on every enemy"},
  pkloveG:{n:"PK Love γ", kind:"psi", pp:30, pow:2.7, all:true, sig:1, d:"Big damage to every enemy"},
  pkfireG:{n:"PK Fire γ", kind:"psi", pp:22, pow:2.1, all:true, sig:1, d:"A wall of fire hits every enemy"},
  pkthunderG:{n:"PK Thunder γ", kind:"psi", pp:16, pow:2.2, all:true, miss:.15, sig:1, d:"Lightning hits every enemy, but can miss"},
  multirocket:{n:"Multi Bottle Rocket", kind:"hit", pow:1.5, times:3, cd:4, sig:1, d:"Three rockets at one enemy, 4-turn reload"},
  shieldkiller:{n:"Shield Killer", kind:"weak", all:true, cd:3, sig:1, d:"Lowers every enemy's defense, 3-turn reload"},
  doubleslash:{n:"Double slash", kind:"hit", pow:1.3, times:2, sig:1, d:"Two quick slashes at one enemy"},
  thiefkick:{n:"Thief's kick", kind:"steal", pow:1.4, sig:1, d:"Kicks one enemy and pockets some money (and sometimes food)"},
  playdead:{n:"Play dead", kind:"guard", sig:1, d:"Boney flops over. Takes half damage until his next turn"},
  lasso:{n:"Lasso", kind:"stun", chance:.7, cd:2, sig:1, d:"Ropes one enemy so it can't move for 2 turns"},
  pluck:{n:"Pippi's pluck", kind:"offup", cd:4, sig:1, d:"Party hits 30% harder for 3 turns"},
  flyby:{n:"Fly-by", kind:"hit", pow:.9, times:3, sig:1, d:"Swoops at one enemy three times"},
  nuzzle:{n:"Nuzzle", kind:"heal", cd:3, pow:.3, sig:1, d:"King comforts one friend, no PP needed"},
  runhome:{n:"Run home to Mom", kind:"run", sig:1, d:"Escape from a normal battle"},
  prophecy:{n:"Prophecy", kind:"shield", cd:4, sig:1, d:"A warning from the future: party takes 40% less damage for 3 turns"},
  bubblepop:{n:"Bubble pop", kind:"stun", chance:.5, cd:2, sig:1, d:"Pops gum on one enemy so it can't move for 2 turns"},
  boulder:{n:"Rolling boulder", kind:"hit", pow:1.5, all:true, cd:3, sig:1, d:"Hits every enemy, 3-turn reload"},
  rocketpunch:{n:"Rocket punch", kind:"hit", pow:2.8, cd:3, sig:1, d:"Huge hit, 3-turn reload"},
  spidermech:{n:"Spider mech laser", kind:"hit", pow:1.3, all:true, cd:3, sig:1, d:"Pokey's mech zaps every enemy, 3-turn reload"},
  besthug:{n:"Best friend hug", kind:"heal", cd:3, pow:.35, sig:1, d:"Tony hugs one friend better, no PP needed"},
  saturncoffee:{n:"Saturn coffee", kind:"ppall", cd:3, sig:1, d:"Zoom! Everyone with PSI recovers some PP"},
  zombiepaper:{n:"Zombie paper", kind:"stun", chance:.6, cd:3, sig:1, d:"Sticks one enemy in place for 2 turns"},
  disruptor:{n:"Phase disruptor", kind:"weak", all:true, cd:4, sig:1, d:"Lowers every enemy's defense, 4-turn reload"},
  pounce:{n:"Pounce", kind:"hit", pow:2.5, miss:.15, sig:1, d:"A big leap at one enemy that sometimes misses"},
  queensong:{n:"Queen's melody", kind:"revive", cd:5, pow:.4, sig:1, d:"Revives a fallen friend at 40% HP"},
  surgery:{n:"Emergency surgery", kind:"revive", cd:4, pow:.5, sig:1, d:"Revives a fallen friend at 50% HP"},
  hotspring:{n:"Hot spring soak", kind:"healall", cd:4, pow:.3, sig:1, d:"Heals the whole party, no PP needed"},
  shockdance:{n:"Shock dance", kind:"cry", chance:.75, cd:2, sig:1, d:"A frantic dance that startles every enemy (they miss more)"}
});
// every move has a limit: PSI costs PP, and anything that's otherwise free needs a reload.
// harder hits, and hits on every enemy, take longer to come back
const FREE_CD = {chant:2, pray:2};
Object.values(TMOVES).forEach(m => {
  if (m.pp > 0 || m.cd) return;
  if (m.kind === "hit" || m.kind === "steal") {
    const total = (m.pow || 1) * (m.times || 1) * (m.all ? 1.8 : 1);
    m.cd = total < 1.8 ? 2 : total < 2.4 ? 3 : 4;
  } else m.cd = FREE_CD[m.kind] || 3;
});
const SIGNATURE = {ninten:["lifeupG"], ana:["pkbeamG"], ness:["pkrockinG", "pkrockinO"], paula:["pkfreezeG"], poo:["starstormO"], lucas:["pkloveG"],
  kumatora:["pkfireG"], claus:["pkthunderG"], lloyd:["multirocket"], jeff:["shieldkiller"], teddy:["doubleslash"], duster:["thiefkick"], boney:["playdead"],
  flint:["lasso"], pippi:["pluck"], flyingman:["flyby"], king:["nuzzle"], picky:["runhome"], buzzbuzz:["prophecy"], bubblemonkey:["bubblepop"],
  dungeonman:["boulder"], eve:["rocketpunch"], pokey:["spidermech"], tony:["besthug"], mrsaturn:["saturncoffee"], applekid:["zombiepaper"],
  andonuts:["disruptor"], mick:["pounce"], queenmary:["queensong"], benny:["surgery"], alec:["hotspring"], salsa:["shockdance"]};
Object.entries(SIGNATURE).forEach(([id, ks]) => { const h = HERO[id]; if (h) ks.forEach(k => { if (!h.learn.includes(k)) h.learn.push(k); }); });

// ---------- PSI tiers: α → β → γ → Ω. A stronger tier can only be learned once the hero knows the one below it ----------
const PSI_TIERS = ["α", "β", "γ", "\u03A9"];
// the last character of a move's name is its tier; names may use either omega character for Ω
const psiTier = k => { const m = TMOVES[k] && TMOVES[k].n.match(/^(.+) (\S)$/); if (!m) return null; const c = m[2] === "\u2126" ? "\u03A9" : m[2], t = PSI_TIERS.indexOf(c); return t < 0 ? null : [m[1], t]; };
// the next weaker move in the same family (PK Beam γ needs PK Beam α, since there's no PK Beam β)
const PSI_NEEDS = {};
Object.keys(TMOVES).forEach(k => {
  const t = psiTier(k);
  if (!t || !t[1]) return;
  let need = null, best = -1;
  Object.keys(TMOVES).forEach(j => { const u = psiTier(j); if (u && u[0] === t[0] && u[1] < t[1] && u[1] > best) { need = j; best = u[1]; } });
  if (need) PSI_NEEDS[k] = need;
});
// a hero who can learn a stronger tier can always learn the weaker one too, so nothing is out of reach
HEROES.forEach(h => {
  for (let i = 0; i < h.learn.length; i++) {
    const need = PSI_NEEDS[h.learn[i]];
    if (need && !h.start.includes(need) && !h.learn.includes(need)) { h.learn.splice(i, 0, need); i = -1; }
  }
});
const canLearn = (m, k) => !m.moves.includes(k) && (!PSI_NEEDS[k] || m.moves.includes(PSI_NEEDS[k]));

// ---------- hero skins: two color swaps per hero sold in Saturn's shop, plus a Champion look for reaching the top with them ----------
const HLOOKS = {
  moon:{n:"Moonside", f:"invert(1) hue-rotate(180deg)", d:"Colors turned inside out. Yes. No."},
  silver:{n:"Starman Silver", f:"grayscale(1) brightness(1.2) contrast(1.15)", d:"Shiny chrome from another world."},
  pig:{n:"Pigmask Pink", f:"hue-rotate(300deg) saturate(1.5)", d:"Standard-issue army pink."},
  dark:{n:"Deep Darkness", f:"hue-rotate(80deg) brightness(.72) saturate(1.4)", d:"Swampy green and very murky."},
  dream:{n:"Magicant Dream", f:"hue-rotate(200deg) saturate(.6) brightness(1.2)", d:"Soft pastels from a dream."},
  lava:{n:"Fire Spring", f:"sepia(.7) hue-rotate(-35deg) saturate(3)", d:"Red-hot from the volcano."},
  frost:{n:"Winters Frost", f:"hue-rotate(180deg) saturate(.5) brightness(1.25)", d:"Chilly blue from up north."},
  photo:{n:"Fuzzy Pickles", f:"sepia(1) contrast(1.1) brightness(1.05)", d:"An old photo from the camera man."},
  mani:{n:"Mani Mani", f:"hue-rotate(250deg) saturate(2.2) contrast(1.1)", d:"Warped by an evil statue."},
  ghost:{n:"Osohe Ghost", f:"grayscale(.6) brightness(1.35) opacity(.7)", d:"Spooky, see-through and friendly."},
  lumine:{n:"Lumine Glow", f:"hue-rotate(140deg) saturate(1.8) brightness(1.1)", d:"Teal light that reads your thoughts."},
  tenda:{n:"Tenda Moss", f:"hue-rotate(55deg) saturate(1.4)", d:"Leafy green and a little shy."},
  giygas:{n:"Giygas Red", f:"hue-rotate(330deg) saturate(3) contrast(1.35)", d:"Red. Very red. ...It hurts."},
  night:{n:"Threed Night", f:"brightness(.6) hue-rotate(210deg) saturate(.8) contrast(1.25)", d:"After dark in a spooky town."},
  chimera:{n:"Chimera Lab", f:"hue-rotate(110deg) saturate(2.4)", d:"Mixed up in a Pigmask lab."},
  peach:{n:"Saturn Peach", f:"sepia(.5) hue-rotate(-25deg) saturate(1.6) brightness(1.12)", d:"Peachy keen. Boing!"},
  champ:{n:"Champion", f:"sepia(1) saturate(4) hue-rotate(-12deg) brightness(1.12) contrast(1.1) drop-shadow(0 0 3px #ffd84a)", d:"Solid gold, for reaching the top."}
};
const HSKIN_PRICE = [200, 350];
const HSKINS = [];
HEROES.forEach(h => {
  // each hero gets its own pair of looks, picked from the hero's id so it never changes
  const pool = Object.keys(HLOOKS).filter(k => k !== "champ"), a = hashStr("hskin-" + h.id) % pool.length;
  const b = (a + 1 + hashStr("hskin2-" + h.id) % (pool.length - 1)) % pool.length;
  HSKINS.push({id:`hs_${h.id}_base`, h:h.id, look:null, base:true, p:0, n:`${h.name} · Original`, d:"The look they started with."});
  [pool[a], pool[b]].forEach((k, i) => HSKINS.push({id:`hs_${h.id}_${k}`, h:h.id, look:k, p:HSKIN_PRICE[i], n:`${h.name} · ${HLOOKS[k].n}`, d:HLOOKS[k].d}));
  HSKINS.push({id:`hs_${h.id}_champ`, h:h.id, look:"champ", champ:true, p:0, n:`${h.name} · Champion`, d:`Clear floor ${TW_TOP} with ${h.name} in your party.`});
});
// ---------- two more skins per hero: a signature look made just for them, and a moving one ----------
// signature: [name, color filter, glow color, description]
const HSIG = {
  ninten:["Psychic Cap", "hue-rotate(200deg) saturate(1.3)", "#6cf0ff", "PSI passed down from great-grandma Maria."],
  ana:["Snow Wood Angel", "sepia(.3) hue-rotate(300deg) brightness(1.15)", "#ffd1e6", "A gentle glow from Ellay's church."],
  lloyd:["Rocket Scientist", "hue-rotate(30deg) saturate(2)", "#ff9a3d", "Smells faintly of bottle rocket fuel."],
  teddy:["Bla-Bla Boss", "grayscale(.6) contrast(1.4)", "#ff4d4d", "Leader of the toughest gang in Ellay."],
  ness:["Nightmare Ness", "invert(.85) hue-rotate(160deg) saturate(1.5)", "#c49bff", "The dark side waiting in Magicant."],
  paula:["Polestar Pink", "hue-rotate(320deg) saturate(1.6) brightness(1.1)", "#ff9ad5", "Fresh from the Polestar Preschool."],
  jeff:["Winters Chill", "hue-rotate(190deg) saturate(.8) brightness(1.2)", "#9be7ff", "Straight out of Snow Wood Boarding School."],
  poo:["Mu Training", "sepia(.8) hue-rotate(-20deg) saturate(1.8)", "#ffcf3f", "Clear-minded after the trial of Mu."],
  lucas:["Sunflower Field", "sepia(.6) hue-rotate(10deg) saturate(2.2) brightness(1.1)", "#ffe14d", "Warm as the field where it all ends."],
  kumatora:["Osohe Princess", "hue-rotate(280deg) saturate(1.8)", "#ff5fd2", "Royalty, even if she'd never say so."],
  duster:["Thief's Shadow", "brightness(.55) saturate(.5) contrast(1.3)", "#7a6aff", "Quiet steps, quick hands."],
  boney:["Wess's Best Friend", "sepia(.9) saturate(1.4) brightness(1.05)", "#e0b070", "A very good dog with a very loud owner."],
  flint:["Lone Cowboy", "sepia(.7) contrast(1.2) brightness(.9)", "#c08a5a", "Dusty boots and a heavy heart."],
  pippi:["Twinkle Elementary", "hue-rotate(60deg) saturate(1.5)", "#ffe066", "Brave enough to follow Ninten anywhere."],
  flyingman:["Magicant Courage", "hue-rotate(240deg) saturate(1.2) brightness(1.15)", "#fff6c0", "His tombstone says he was brave."],
  king:["Midnight Snack", "brightness(.75) hue-rotate(200deg) saturate(1.2)", "#6fa0ff", "Too sleepy to come along. Usually."],
  picky:["Sleepy Brother", "saturate(.4) brightness(1.2)", "#d8d0ff", "Still in his pajamas from that night."],
  buzzbuzz:["Messenger from the Future", "hue-rotate(140deg) saturate(2) brightness(1.2)", "#5ef2d6", "Ten years ahead and very small."],
  bubblemonkey:["Gum Gum Pink", "hue-rotate(290deg) saturate(2.4)", "#ff9ad5", "Blows the biggest bubbles in Summers."],
  dungeonman:["Living Labyrinth", "sepia(.5) hue-rotate(60deg) contrast(1.2)", "#9cff7a", "Mossy halls and creaky stairs."],
  salsa:["Fassad's Rival", "hue-rotate(100deg) saturate(1.6)", "#7fd35a", "Finally free to dance for himself."],
  eve:["Robot Guardian", "grayscale(.8) brightness(1.1) contrast(1.4)", "#6cf0ff", "George built her to protect Ninten."],
  claus:["Masked Man", "grayscale(.7) brightness(.8) contrast(1.5)", "#ff2d55", "A cold glow behind the mask."],
  pokey:["King of New Pork", "hue-rotate(310deg) saturate(2.2)", "#ff5fd2", "He's the boss now. Just ask him."],
  tony:["Snow Wood Buddy", "hue-rotate(170deg) saturate(.6) brightness(1.25)", "#cdf6ff", "Jeff's truest friend in Winters."],
  mrsaturn:["Saturn Valley Coffee", "sepia(.7) hue-rotate(-30deg) saturate(1.4)", "#c08a5a", "Brewed fresh. Very zoom. Ding!"],
  applekid:["Mad Inventor", "hue-rotate(90deg) saturate(2) contrast(1.1)", "#c8ff6a", "Ideas faster than food can arrive."],
  andonuts:["Phase Distorter", "hue-rotate(250deg) saturate(1.4) contrast(1.2)", "#9a7aff", "Bent slightly out of time."],
  mick:["Podunk Pup", "sepia(.6) saturate(1.5) brightness(1.1)", "#ffb366", "Waiting by the door for Ninten."],
  queenmary:["Lullaby Queen", "hue-rotate(260deg) saturate(.9) brightness(1.2)", "#ffe9a8", "She remembers the melody now."],
  mimmie:["Twin Trouble", "hue-rotate(330deg) saturate(1.8)", "#ff8ac8", "Two times the pestering."],
  laura:["Canary Song", "sepia(.5) hue-rotate(20deg) saturate(3) brightness(1.15)", "#fff04d", "Sings the first of the eight melodies."],
  brickroad:["Dungeon Architect", "sepia(.8) hue-rotate(-15deg) saturate(1.2) contrast(1.15)", "#b5835a", "Half man, half floor plan."],
  maxwell:["Snow Wood Scholar", "hue-rotate(210deg) saturate(.7) brightness(1.1)", "#7aa0ff", "Saves the game. Saves the day."],
  cat:["Midnight Cat", "brightness(.5) contrast(1.4)", "#ffe14d", "Just two glowing eyes in the dark."],
  everdred:["Burglin Park Boss", "hue-rotate(100deg) brightness(.85) saturate(1.3)", "#6fd35a", "Money in every pocket."],
  alec:["Mountain Grandpa", "sepia(.6) brightness(1.05) contrast(1.1)", "#e8d0a0", "Lives up the hill with the cows."],
  butch:["Money Pig", "hue-rotate(300deg) saturate(1.3) brightness(1.1)", "#ffd84a", "Counts his DP twice a day."],
  fuel:["Sunshine Forest Hero", "sepia(.6) hue-rotate(-25deg) saturate(2.6)", "#ff6a1a", "Ran back into the fire, and lived."],
  butterfly:["Dream Wings", "hue-rotate(180deg) saturate(2) brightness(1.2)", "#7ad8ff", "Every flap restores a little hope."],
  bbgang:["Bla-Bla Leather", "grayscale(1) contrast(1.6) brightness(.85)", "#ff6a5c", "Polished jacket, cracked knuckles."],
  benny:["Night Shift", "hue-rotate(160deg) saturate(.6) brightness(1.15)", "#a8ffd8", "The clinic never really closes."],
  tracy:["Delivery Day", "hue-rotate(40deg) saturate(1.7)", "#ffcf3f", "Escargo Express, at your service."],
  captainstrong:["Onett's Finest", "hue-rotate(210deg) saturate(1.8)", "#6fa0ff", "Badge shined, ego too."],
  venus:["Topolla Star", "hue-rotate(270deg) saturate(2)", "#c49bff", "Sold out every night."],
  orangekid:["Big Investor", "sepia(.6) hue-rotate(-10deg) saturate(2.8)", "#ffa24d", "Still waiting on that return."],
  lisa:["Tazmily Kitchen", "sepia(.4) hue-rotate(-15deg) saturate(1.5) brightness(1.1)", "#ffb36b", "Smells like nut bread."],
  lou:["Lighter's Lumberjack", "sepia(.5) hue-rotate(40deg) saturate(1.5)", "#7fcf6a", "Forest green from boots to cap."],
  reggie:["Teepee Zen", "hue-rotate(50deg) saturate(.8) brightness(1.1)", "#e0e8a8", "Reggie is very calm about this."],
  samba:["Dance Floor", "hue-rotate(320deg) saturate(2.2) contrast(1.1)", "#ff5fa2", "Never misses a beat."]
};
// moving looks: the animation sets the whole filter, so each one keeps the sprite's little shadow
const HANIM = {
  rainbow:{n:"Rainbow Rockin", a:"skRainbow 3s linear infinite", d:"Cycles through every color, like PK Rockin."},
  shimmer:{n:"Starman Shimmer", a:"skShimmer 1.6s ease-in-out infinite", d:"Flickers like something from another world."},
  aura:{n:"PSI Aura", a:"skAura 1.8s ease-in-out infinite", d:"A pink and blue glow that pulses with power."},
  ghost:{n:"Ghost Mode", a:"skGhost 2.4s ease-in-out infinite", d:"Fades in and out. Spooky but friendly."},
  glitch:{n:"Giygas Glitch", a:"skGlitch 1.2s steps(1) infinite", d:"It's not there. ...Now it is."},
  flame:{n:"Fire Spring Aura", a:"skFlame .9s ease-in-out infinite alternate", d:"Wrapped in a flickering orange glow."},
  frozen:{n:"Deep Freeze", a:"skFrozen 2s ease-in-out infinite", d:"Icy blue, with a frosty shine."},
  disco:{n:"Club Titiboo", a:"skDisco 1.4s steps(1) infinite", d:"Disco lights, all night long."}
};
const HSKIN_PRICE2 = {sig:500, anim:800};
const HANIM_KEYS = Object.keys(HANIM);
HEROES.forEach(h => {
  const s = HSIG[h.id];
  if (s) {
    HLOOKS["sig_" + h.id] = {n:s[0], f:`${s[1]} drop-shadow(0 0 3px ${s[2]})`, d:s[3]};
    HSKINS.push({id:`hs_${h.id}_sig`, h:h.id, look:"sig_" + h.id, p:HSKIN_PRICE2.sig, n:`${h.name} · ${s[0]}`, d:s[3], sig:true});
  }
  const k = HANIM_KEYS[hashStr("hanim-" + h.id) % HANIM_KEYS.length], a = HANIM[k];
  if (!HLOOKS["anim_" + k]) HLOOKS["anim_" + k] = {n:a.n, f:"brightness(1)", a:a.a, d:a.d};
  HSKINS.push({id:`hs_${h.id}_anim`, h:h.id, look:"anim_" + k, p:HSKIN_PRICE2.anim, n:`${h.name} · ${a.n}`, d:a.d, anim:true});
});
// the style a hero image needs for a look: its color filter, plus a moving animation for the moving looks
const lookStyle = k => { const L = HLOOKS[k]; return L ? ` style="--skf:${L.f}${L.a ? `;--ska:${L.a}` : ""}"` : ""; };
const lookClass = k => HLOOKS[k] && HLOOKS[k].a ? " skA" : "";
HSKINS.forEach(s => { s.cat = "hero"; ITEMS.push(s); ITEM[s.id] = s; });
// champion skins unlock when the hero is in the party that reaches the top (training runs don't count)
const champWon = id => !!(tw.heroes[id] && tw.heroes[id].top);
// older saves: heroes who already reached the top get their Champion skin
if (!tw.skinV) { Object.values(tw.heroes).forEach(r => { if (r.clears) r.top = true; }); tw.skinV = 1; twSave(); }
// run history keeps the last climbs; older saves get each hero's endless best from their best floor past the top
const TW_HISTORY = 30;
if (!Array.isArray(tw.history)) tw.history = [];
// relic book: every relic ever picked up, when it was first found and how many climbs it was carried in
if (!tw.relicBook || typeof tw.relicBook !== "object") tw.relicBook = {};
if (!tw.endlessV) { Object.values(tw.heroes).forEach(r => { if (r.best > TW_TOP && !r.endless) r.endless = r.best; }); tw.endlessV = 1; twSave(); }
// the look a hero is wearing right now (null for the original)
const heroLook = id => { if (HERO[id] && HERO[id].mine) return HERO[id].look && HLOOKS[HERO[id].look] ? HERO[id].look : null; const s = ITEM[shop.heroSkin[id]]; return s && s.look && owns(s.id) ? s.look : null; };

// ---------- passives: every hero has one always-on ability ----------
// the numbers are read in tower.js: stat boosts (hp/atk/def/spd), damage (psiX, rage, fullHpX, statusX, avenger, bashX, wild, critX),
// defense (dodge, dr, lastStand, counter, cover, immune, shy, taunt), start of battle (startShield, startOffup, startCry, pinStart,
// startWeak, startDistract, swirl, noAmbush, first), each round (ppRegen, partyRegen, partyPP), after a win (cash, winCash, winHeal, winPP, loot)
// and a few one-offs (healX, cdMinus, buddy, bashCash, bashStun, weakOnHit, double, lunch, foodX, partyDr, partyDodge, partyCrit, fastMaster)
const PASSIVES = {
  // Mother
  ninten:{ic:"👁️", n:"Sixth sense", d:"Your party is never ambushed, and catches enemies off guard more often", swirl:.15, noAmbush:1},
  ana:{ic:"📿", n:"Prayer necklace", d:"PSI does 10% more damage, and she regains 4% PP every round", psiX:.1, ppRegen:.04},
  lloyd:{ic:"🔧", n:"Genius tinkerer", d:"His moves reload one turn faster", cdMinus:1},
  teddy:{ic:"🗡️", n:"Gang leader's pride", d:"Below 35% HP, his attacks do 35% more damage", rage:.35},
  pippi:{ic:"🎀", n:"Plucky", d:"At full HP, her attacks do 20% more damage", fullHpX:.2},
  flyingman:{ic:"🪶", n:"Brave to the end", d:"Once per battle, hangs on with 1 HP instead of falling", lastStand:1},
  eve:{ic:"🤖", n:"Built to protect", d:"30% of the time, steps in front of a badly hurt friend and takes the hit", cover:.3},
  mick:{ic:"🐕", n:"Scrappy", d:"Does 25% more damage to enemies with a status effect", statusX:.25},
  queenmary:{ic:"🎵", n:"Magicant's song", d:"While she's standing, the whole party heals 3% HP every round", partyRegen:.03},
  mimmie:{ic:"👯", n:"Twin trouble", d:"Her Bash hits a second time 25% of the time", double:.25},
  laura:{ic:"🐤", n:"Early bird", d:"Always acts first in the first round of a battle", first:1},
  bbgang:{ic:"🧢", n:"Bla-Bla bluster", d:"At the start of a battle, one enemy gets scared and starts crying", startCry:1},
  benny:{ic:"🩺", n:"House call", d:"After every win, the whole party heals 10% HP", winHeal:.1},
  // EarthBound
  ness:{ic:"⚾", n:"Home run swing", d:"6% more likely to land a SMAAAASH!!", critX:.06},
  paula:{ic:"🙏", n:"Warm heart", d:"Her healing heals 25% more", healX:.25},
  jeff:{ic:"🎒", n:"Gadget pouch", d:"After a win, 20% chance to find a bomb or bottle rocket", loot:.2, pool:"gadget"},
  poo:{ic:"🧘", n:"Mu training", d:"Can't be put to sleep or made to cry", immune:["sleep", "cry"]},
  king:{ic:"🦴", n:"Loyal bite", d:"When an enemy attacks him, 25% chance to bite back", counter:.25},
  picky:{ic:"🍀", n:"Lucky kid", d:"The whole party is 3% more likely to land a SMAAAASH!!", partyCrit:.03},
  buzzbuzz:{ic:"🐝", n:"From the future", d:"He warns everyone: the whole party dodges 4% more often", partyDodge:.04},
  bubblemonkey:{ic:"🫧", n:"Bubble gum shield", d:"Every battle starts with the party shielded for 2 rounds", startShield:2},
  dungeonman:{ic:"🏰", n:"Walking fortress", d:"Takes 20% less damage, but is 20% slower", dr:.2, spd:-.2},
  mrsaturn:{ic:"☕", n:"Zoom coffee", d:"After every win, the whole party regains 15% PP", winPP:.15},
  pokey:{ic:"🙈", n:"Hides in the back", d:"Enemies pick on him half as often, and he pockets 10% extra money", shy:1, cash:.1},
  tony:{ic:"💙", n:"Best friend", d:"Hits 20% harder when Jeff is in the party", buddy:"jeff"},
  applekid:{ic:"🍎", n:"Results may vary", d:"Every attack does anywhere from 50% to 180% damage", wild:1},
  andonuts:{ic:"🔬", n:"Scientific boost", d:"Every battle starts with the party's offense raised for 2 rounds", startOffup:2},
  brickroad:{ic:"🧱", n:"Dungeon walls", d:"While he's standing, the whole party takes 8% less damage", partyDr:.08},
  maxwell:{ic:"🤓", n:"Know-it-all", d:"At the start of a battle, he points out one enemy's weak spot", startWeak:1},
  cat:{ic:"🐈", n:"Nine lives", d:"Dodges 15% more often", dodge:.15},
  everdred:{ic:"💰", n:"Pickpocket", d:"Every Bash also steals a little money", bashCash:1},
  tracy:{ic:"🐌", n:"Escargo Express", d:"After a win, 25% chance a food delivery arrives", loot:.25, pool:"food"},
  captainstrong:{ic:"👮", n:"Chief of police", d:"20% more Defense", def:.2},
  venus:{ic:"🎤", n:"Starstruck", d:"At the start of a battle, one enemy is too starstruck to move for a turn", pinStart:1},
  orangekid:{ic:"🍊", n:"Investor pitch", d:"Every win brings in a few extra dollars", winCash:1},
  // Mother 3
  lucas:{ic:"🌻", n:"Gentle heart", d:"His healing heals 15% more, and he hits 20% harder when Claus is in the party", healX:.15, buddy:"claus"},
  kumatora:{ic:"👑", n:"Princess's temper", d:"PSI does 20% more damage", psiX:.2},
  duster:{ic:"📌", n:"Wall staple", d:"His Bash pins the enemy in place 15% of the time", bashStun:.15},
  boney:{ic:"👃", n:"Sniff out", d:"His Bash also finds the enemy's weak spot", weakOnHit:1},
  flint:{ic:"🤠", n:"Father's fury", d:"While a friend is knocked out, he hits 30% harder", avenger:.3},
  salsa:{ic:"🐒", n:"Monkey business", d:"At the start of a battle, each enemy has a 25% chance to be distracted", startDistract:.25},
  claus:{ic:"⚡", n:"Bold twin", d:"10% more Offense, and he hits 20% harder when Lucas is in the party", atk:.1, buddy:"lucas"},
  butterfly:{ic:"🦋", n:"Glittering dust", d:"While she's flying, the whole party regains 4% PP every round", partyPP:.04},
  alec:{ic:"🍙", n:"Packed lunch", d:"Once per battle, when a friend drops below 30% HP, he shares lunch and heals them 25%", lunch:.25},
  butch:{ic:"🐖", n:"Money-hungry", d:"Battles pay out 30% more money", cash:.3},
  fuel:{ic:"🔥", n:"Reckless", d:"20% more Offense, but 10% less Defense", atk:.2, def:-.1},
  lisa:{ic:"🍲", n:"Home cooking", d:"While she's standing, food heals 50% more", foodX:.5},
  lou:{ic:"🪓", n:"Lumberjack swing", d:"His Bash does 20% more damage, but he's 10% slower", bashX:.2, spd:-.1},
  reggie:{ic:"🗣️", n:"Reggie talks about Reggie", d:"Enemies can't help but attack him more, but he takes 10% less damage", taunt:1, dr:.1},
  samba:{ic:"💃", n:"Quick step", d:"15% faster, and 20% harder hits when Salsa is in the party", spd:.15, buddy:"salsa"},
  // heroes you make yourself
  _mine:{ic:"✏️", n:"Homemade hero", d:"Masters moves twice as fast", fastMaster:1}
};
const passiveOf = h => h ? PASSIVES[h.id] || (h.mine ? PASSIVES._mine : null) : null;
