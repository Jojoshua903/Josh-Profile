// ===== WIDR TD: Ratjetoe, tier 4/5 on every path, hero categories, reward track =====

// ---------- Ratjetoe, the mechanic rat from Otis in Orbit ----------
TOWERS.ratjetoe = {
  name:'Ratjetoe', from:'Otis in Orbit', role:'Rat Mechanic', cost:500, color:'#4a6fd1',
  blurb:'Fires rivets from his nail gun and builds sentry turrets around his workshop.',
  base:{range:130, rate:.7, dmg:1, pierce:2, kind:'nail', shots:1, spread:0, speed:720},
  paths:[
    {name:'Nail Gun', ups:[
      {name:'Rapid Rivets', cost:200, desc:'Fires 35% faster.', apply:s=>{s.rate*=.65;}},
      {name:'Hot Rivets', cost:450, desc:'+1 damage, +2 pierce, and rivets crack armor.', apply:s=>{s.dmg+=1; s.pierce+=2; s.crush=true;}},
      {name:'Rivet Storm', cost:2200, desc:'Fires 3 rivets at a time, 30% faster.', apply:s=>{s.shots=3; s.spread=.15; s.rate*=.7;}},
    ]},
    {name:'Sentries', ups:[
      {name:'Sentry Turret', cost:350, desc:'Builds a sentry turret that zaps enemies for 1 damage.', apply:s=>{s.sentries=1; s.sDmg=1; s.sRate=.9;}},
      {name:'Twin Sentries', cost:800, desc:'2 sentries that zap for 2 damage.', apply:s=>{s.sentries=2; s.sDmg=2;}},
      {name:'Laser Sentries', cost:2600, desc:'3 sentries with 4 damage lasers that fire 40% faster.', apply:s=>{s.sentries=3; s.sDmg=4; s.sRate=.55;}},
    ]},
    {name:'Tune-Up', ups:[
      {name:'Oil Change', cost:300, desc:'Heroes near Ratjetoe attack 10% faster.', apply:s=>{s.aura=Object.assign({r:130}, s.aura, {rate:.1});}},
      {name:'Spare Parts', cost:650, desc:'Sells scrap: +$60 at the end of every wave.', apply:s=>{s.income=(s.income||0)+60;}},
      {name:'Overclock', cost:2600, desc:'ABILITY: heroes within 200 attack 3x as fast for 8 seconds.', apply:ab('overclock','Overclock','🔧',45)},
    ]},
  ]};
TOWERS.ratjetoe.paths[0].ups.push(
  {name:'Industrial Riveter', cost:6500, desc:'5 rivets at a time, 6 damage each.', apply:s=>{s.shots=5; s.dmg=6; s.spread=.14;}},
  {name:'Rocket Riveter', cost:32000, desc:'7 rivets, 18 damage, +10 pierce, 40% faster.', apply:s=>{s.shots=7; s.dmg=18; s.pierce+=10; s.rate*=.6;}});

// ---------- Tier 4 and 5 on paths 2 and 3 (path 1 got its own earlier) ----------
// abPow makes the path 3 ability stronger (damage × pow, longer effects) and recharge faster
const abPow = (pow, cdMul) => s => { if (s.ability) s.ability = Object.assign({}, s.ability, {pow, cd: Math.round(s.ability.cd * cdMul)}); };
const aura = o => s => { s.aura = Object.assign({r: 130}, s.aura, o); };
const both = (...fs) => s => fs.forEach(f => f(s));
const UPPER = {
  guiseppe: [
    [['Fruit Ninja Chef', 5500, '+40 range, sees ghosts, throws 40% faster.', s=>{s.range+=40; s.camo=true; s.rate*=.6;}],
     ['Big Apple', 30000, 'Giant apples: +17 damage, +15 pierce, double vs bosses.', s=>{s.dmg+=17; s.pierce+=15; s.size=2.6; s.fruit='melon'; s.bossMult=2;}]],
    [['Fruit Empire', 6000, '+$300 per wave. Fruit Salad Rain hits twice as hard and recharges 30% faster.', both(s=>{s.income=(s.income||0)+300;}, abPow(2, .7))],
     ['Biscotti Tycoon', 28000, '+$1,000 per wave. Fruit Salad Rain hits 5x as hard and recharges twice as fast.', both(s=>{s.income=(s.income||0)+700;}, abPow(5, .5))]]],
  julie: [
    [['Cold Case Unit', 7000, 'Hits 4 suspects per shot and fires 50% faster.', s=>{s.targets=4; s.rate*=.5;}],
     ['Agency Director', 36000, 'Hits 8 suspects per shot, +20 damage.', s=>{s.targets=8; s.dmg+=20;}]],
    [['Secret Service', 7500, 'Nearby heroes attack 20% faster. Interpol Raid hits twice as hard.', both(aura({rate:.2}), abPow(2, .7))],
     ['Interpol Chief', 34000, 'Nearby heroes get +35% attack speed and +15% range. Raid hits 4x as hard.', both(aura({rate:.35, range:.15}), abPow(4, .5))]]],
  daniel: [
    [['Bunker Buster', 8000, 'Blasts stun for 1s, triple damage vs bosses, +30 range.', s=>{s.stun=1; s.bossMult=Math.max(s.bossMult||1, 3); s.range+=30;}],
     ['Orbital Strike', 42000, '40 damage blasts, 5x damage vs bosses.', s=>{s.dmg=40; s.bossMult=5; s.radius=Math.max(s.radius, 100);}]],
    [['Carpet Bombing', 7000, '+$3 per kill. Airstrike drops more bombs that hit twice as hard.', both(s=>{s.bounty=3;}, abPow(2, .7))],
     ['Operation Thunder', 36000, '5x damage vs armor. Airstrike hits 4x as hard and recharges twice as fast.', both(s=>{s.armorMult=5;}, abPow(4, .5))]]],
  otis: [
    [['Event Horizon', 8500, 'Black hole every 4s, and the beam slows 70%.', s=>{s.blackhole=4; s.slow=.7;}],
     ['Singularity', 40000, 'Black hole every 2s, +15 beam damage.', s=>{s.blackhole=2; s.dmg+=15;}]],
    [['Best Boy', 6500, '+$150 per wave, nearby heroes attack 30% faster. Moon Bark hits twice as hard.', both(s=>{s.income=(s.income||0)+150;}, aura({rate:.3}), abPow(2, .7))],
     ['Cosmic Companion', 32000, 'Nearby heroes get +50% attack speed and +20% range. Moon Bark hits 4x as hard.', both(aura({rate:.5, range:.2, r:160}), abPow(4, .5))]]],
  nathan: [
    [['Cleanup Hitter', 6000, 'A Home Run every 3rd swing, 40% crit chance.', s=>{s.homerun=3; s.crit=.4;}],
     ['Legendary Slugger', 32000, 'A 120 damage Home Run every other swing, +10 damage.', s=>{s.homerun=2; s.hrDmg=120; s.dmg+=10;}]],
    [['Team MVP', 7000, 'Nearby heroes attack 25% faster. Seventh-Inning Stretch lasts 50% longer.', both(aura({rate:.25}), abPow(2, .7))],
     ['Hall of Fame Manager', 35000, 'Nearby heroes get +40% attack speed and +15% range. Stretch lasts twice as long.', both(aura({rate:.4, range:.15}), abPow(3, .6))]]],
  chemmy: [
    [['Prime Time', 7000, '+$250 every wave, and balls stun for 0.6s.', s=>{s.jackpot=250; s.stun=.6;}],
     ['Hundredaire Hall of Fame', 34000, '+$800 every wave, +6 damage.', s=>{s.jackpot=800; s.dmg+=6;}]],
    [['Head Coach', 6500, 'Nearby heroes get +30% range and +15% attack speed. Lightning Round lasts 50% longer.', both(aura({range:.3, rate:.15}), abPow(2, .7))],
     ['Olympic Legend', 33000, 'Nearby heroes get +40% range and +30% attack speed. Lightning Round lasts twice as long.', both(aura({range:.4, rate:.3, r:160}), abPow(3, .6))]]],
  lars: [
    [['Mithril Pick', 6000, '14 damage, +12 pierce, stuns for 0.8s.', s=>{s.dmg=14; s.pierce+=12; s.stun=.8;}],
     ['Mountain King', 31000, '40 damage, +30 range, +30 pierce.', s=>{s.dmg=40; s.range+=30; s.pierce+=30;}]],
    [['Clan Elder', 6500, 'Swings 30% faster. Cave-In hits twice as hard.', both(s=>{s.rate*=.7;}, abPow(2, .7))],
     ['High King', 30000, 'Nearby heroes attack 30% faster. Cave-In hits 4x as hard.', both(aura({rate:.3}), abPow(4, .5))]]],
  milo: [
    [['Thunder Dome', 7000, 'Casts 3 chains at once, stuns for 0.6s, triple vs bosses.', s=>{s.shots=3; s.stun=.6; s.bossMult=3;}],
     ['Eye of the Storm', 36000, 'Casts 5 chains at once, +12 damage.', s=>{s.shots=5; s.dmg+=12;}]],
    [['Archmage', 7500, '+40 range, nearby heroes attack 25% faster. Lightning Storm hits twice as hard.', both(s=>{s.range+=40;}, aura({rate:.25}), abPow(2, .7))],
     ['Grand Sorcerer', 38000, 'Nearby heroes attack 40% faster. Lightning Storm hits 4x as hard.', both(aura({rate:.4, r:160}), abPow(4, .5))]]],
  josh: [
    [['Hellfire Missiles', 7500, '12 damage zaps with bigger explosions.', s=>{s.dmg=12; s.zapBlast=55;}],
     ['Reaper Fleet', 38000, '30 damage zaps, 4x vs bosses, huge explosions.', s=>{s.dmg=30; s.bossMult=4; s.zapBlast=70;}]],
    [['Mission Control', 6500, '+50 range and 2 extra drones. Drone Strike hits twice as hard.', both(s=>{s.range+=50; s.drones+=2;}, abPow(2, .7))],
     ['Satellite Network', 32000, '+150 range and 4 extra drones. Drone Strike hits 4x as hard.', both(s=>{s.range+=150; s.drones+=4;}, abPow(4, .5))]]],
  reshman: [
    [['Abyss', 7000, '10 damage shuriken, 70% slow.', s=>{s.dmg=10; s.slow=.7;}],
     ['Blob Overlord', 34000, '25 damage, +15 pierce, triple vs bosses.', s=>{s.dmg=25; s.pierce+=15; s.bossMult=3;}]],
    [['Ninja Academy', 7000, 'Nearby heroes attack 25% faster, stuns for 0.6s. Shadow Clones last 50% longer.', both(aura({rate:.25}), s=>{s.stun=.6;}, abPow(2, .7))],
     ['Shadow Shogun', 34000, 'Nearby heroes attack 40% faster. Shadow Clones last twice as long.', both(aura({rate:.4, r:160}), abPow(3, .6))]]],
  fionn: [
    [['Seismologist', 6500, '+40 range, boulders slow 80%.', s=>{s.range+=40; s.slow=.8;}],
     ['Professor of Rock', 33000, '+30 damage, 6x damage vs bosses.', s=>{s.dmg+=30; s.bossMult=6;}]],
    [['Crystal Cave', 6500, '+$250 per wave, triple vs armor. Earthquake hits twice as hard.', both(s=>{s.income=(s.income||0)+250; s.armorMult=3;}, abPow(2, .7))],
     ['Planet Core', 34000, '+$850 per wave. Earthquake hits 4x as hard.', both(s=>{s.income=(s.income||0)+600;}, abPow(4, .5))]]],
  deniz: [
    [['Frostbite', 6000, '4x damage to frozen or stunned enemies, 4x vs armor.', s=>{s.shatter=4; s.armorMult=4;}],
     ['Diamond Dust', 32000, '+15 damage and waves twice as often.', s=>{s.dmg+=15; s.rate*=.5;}]],
    [['Frost Archmage', 7000, 'Nearby heroes get +30% range and +15% attack speed. Big Freeze lasts 50% longer.', both(aura({range:.3, rate:.15}), abPow(2, .7))],
     ['Winter King', 34000, 'Nearby heroes get +40% range and +30% attack speed. Big Freeze lasts twice as long.', both(aura({range:.4, rate:.3, r:160}), abPow(3, .6))]]],
  sichen: [
    [['World Tour', 6500, 'Nearby heroes get +60% attack speed and +20% range.', aura({rate:.6, range:.2, r:170})],
     ['Comedy Festival', 33000, 'Nearby heroes get +80% attack speed and +30% range in a huge area.', aura({rate:.8, range:.3, r:220})]],
    [['Late Night Host', 7000, '+$200 per wave. The Roast takes 50% more health.', both(s=>{s.income=(s.income||0)+200;}, abPow(2, .7))],
     ['Roast Master', 33000, '+$700 per wave. The Roast takes 2.5x as much health.', both(s=>{s.income=(s.income||0)+500;}, abPow(4, .5))]]],
  anna: [
    [['Man-Eating Plants', 7000, 'Swallows non-boss enemies up to 40 health, 75% slow.', s=>{s.devour=40; s.slow=.75;}],
     ['Carnivorous Jungle', 36000, 'Swallows enemies up to 150 health, +10 damage.', s=>{s.devour=150; s.dmg+=10;}]],
    [['Greenhouse', 6500, '+$200 per wave, nearby heroes attack 20% faster. Bloom lasts 50% longer.', both(s=>{s.income=(s.income||0)+200;}, aura({rate:.2}), abPow(2, .7))],
     ['Mother Nature', 32000, '+$700 per wave, nearby heroes attack 35% faster. Bloom lasts twice as long.', both(s=>{s.income=(s.income||0)+500;}, aura({rate:.35}), abPow(3, .6))]]],
  ratjetoe: [
    [['Mech Bay', 7500, '4 sentries, 8 damage each, and they see ghosts.', s=>{s.sentries=4; s.sDmg=8; s.camo=true;}],
     ['Rat-Bot Army', 36000, '6 sentries, 20 damage each, and everything hits flyers.', s=>{s.sentries=6; s.sDmg=20; s.sRate=.4; s.air=true;}]],
    [['Turbo Workshop', 7000, 'Nearby heroes get +25% attack speed and +10% range. Overclock lasts 50% longer.', both(aura({rate:.25, range:.1}), abPow(2, .7))],
     ['Rocket Garage', 34000, 'Nearby heroes get +40% attack speed, +20% range and ghost sight. Overclock lasts twice as long.', both(aura({rate:.4, range:.2, camo:true, r:160}), abPow(3, .6))]]],
};
for (const k in UPPER) UPPER[k].forEach((pair, j) => pair.forEach(([name, cost, desc, f], i) =>
  TOWERS[k].paths[j + 1].ups.push({name, cost, desc, apply: f})));
// every tier 4 and 5 counts as a Paradise upgrade (glow + rainbow card)
for (const k in TOWERS) TOWERS[k].paths.forEach(p => p.ups.forEach((u, i) => {
  if (i < 3 || u.paradise) return;
  const f = u.apply; u.paradise = i + 1;
  u.apply = s => { f(s); s.paradise = Math.max(s.paradise || 0, i + 1); };
}));

// ---------- Hero categories ----------
const CATEGORIES = [
  {id:'throw', name:'Throwers', icon:'🎯', color:'#ff9f1a', blurb:'Fruit, baseballs, balls, shuriken and boulders.', heroes:['guiseppe', 'nathan', 'chemmy', 'reshman', 'fionn']},
  {id:'tech', name:'Agents & Tech', icon:'⚙️', color:'#5fd0d6', blurb:'Snipers, bombs, lasers, drones and gadgets.', heroes:['julie', 'daniel', 'otis', 'josh', 'ratjetoe']},
  {id:'magic', name:'Magic', icon:'✨', color:'#a65cff', blurb:'Lightning, frost and living vines.', heroes:['milo', 'deniz', 'anna']},
  {id:'support', name:'Support', icon:'🤝', color:'#7be36b', blurb:'Cash, buffs and crowd control.', heroes:['lars', 'sichen']},
];
TOWER_ORDER.length = 0;
CATEGORIES.forEach(c => c.heroes.forEach(k => { TOWER_ORDER.push(k); TOWERS[k].cat = c.id; }));
const HERO_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='];
TOWER_ORDER.forEach((k, i) => TOWERS[k].key = HERO_KEYS[i] || '');
const catOf = k => CATEGORIES.find(c => c.id === TOWERS[k].cat);

// ---------- Reward track: something new at every level ----------
// it: a reward-track-only store item · bis: Biscotti · map: a map unlocking at that level (maps still unlock by level)
const TRACK = [
  null,
  null,
  {bis: 50},
  {it: 'pop_confetti'},
  {bis: 75},
  {it: 'skin_otis_astro'},
  {it: 'title_popper'},
  {bis: 100},
  {it: 'tint_retro'},
  {it: 'skin_ratjetoe_rocket'},
  {bis: 150},
  {it: 'pads_rainbow'},
  {it: 'skin_guiseppe_gold'},
  {it: 'title_tactician'},
  {bis: 200},
  {it: 'pop_stars'},
  {it: 'skin_nathan_allstar'},
  {it: 'music_menu64'},
  {bis: 250},
  {it: 'skin_lars_lava'},
  {it: 'tint_candy'},
  {it: 'title_hundredaire'},
  {bis: 300},
  {it: 'skin_milo_dark'},
  {it: 'toon_robot'},
  {bis: 350},
  {it: 'skin_julie_pink'},
  {it: 'pop_rainbow'},
  {it: 'skin_anna_winter'},
  {bis: 400},
  {it: 'title_legend'},
];
const TRACK_ITEMS = [
  {id:'pop_confetti', cat:'Effects', slot:'pop', name:'Confetti Pops', desc:'Every pop is a little party.'},
  {id:'skin_otis_astro', cat:'Skins', slot:'otis', hero:'otis', name:'Gold Astronaut', desc:'Otis in a shiny gold space suit.', skin:{fur:'#ffcc29', ear:'#c98a00', patch:'#fff6c2'}},
  {id:'title_popper', cat:'Titles', slot:'title', name:'Pro Popper', desc:'A player title for your profile.'},
  {id:'tint_retro', cat:'Maps', slot:'tint', name:'WIDR 64 Retro', desc:'Every map in old-school handheld green.'},
  {id:'skin_ratjetoe_rocket', cat:'Skins', slot:'ratjetoe', hero:'ratjetoe', name:'Rocket Mechanic', desc:'Orange flight overalls from the Otis in Orbit launch pad.', skin:{overalls:'#ff8a1f', cap:'#22172b'}},
  {id:'pads_rainbow', cat:'Effects', slot:'pads', name:'Rainbow Pads', desc:'Every hero stands on a colour-shifting base.'},
  {id:'skin_guiseppe_gold', cat:'Skins', slot:'guiseppe', hero:'guiseppe', name:'Golden Apple', desc:'Guiseppe, but made of solid gold.', skin:{body:'#ffcc29', shade:'rgba(150,90,0,.35)'}},
  {id:'title_tactician', cat:'Titles', slot:'title', name:'Tactician', desc:'A player title for your profile.'},
  {id:'pop_stars', cat:'Effects', slot:'pop', name:'Star Bursts', desc:'Enemies pop into golden stars.'},
  {id:'skin_nathan_allstar', cat:'Skins', slot:'nathan', hero:'nathan', name:'All-Star', desc:'Gold cap and a black all-star jersey.', skin:{cap:'#ffcc29', brim:'#c98a00', jersey:'#2e2a3a', stripe:'#ffcc29'}},
  {id:'music_menu64', cat:'Music', slot:'musicMenu', name:'WIDR 64 Menu Theme', desc:'A chiptune theme for the main menu.'},
  {id:'skin_lars_lava', cat:'Skins', slot:'lars', hero:'lars', name:'Lava Miner', desc:'Fresh from the deepest volcano mine.', skin:{helmet:'#ff5a1f', tunic:'#3a2a2a', beard:'#ff9f1a'}},
  {id:'tint_candy', cat:'Maps', slot:'tint', name:'Candy Land', desc:'Every map in pink candy colours.'},
  {id:'title_hundredaire', cat:'Titles', slot:'title', name:'Hundredaire', desc:'A player title for your profile.'},
  {id:'skin_milo_dark', cat:'Skins', slot:'milo', hero:'milo', name:'Dark Wizard', desc:'A black robe and a crimson hat.', skin:{robe:'#1d1720', hat:'#b81a25'}},
  {id:'toon_robot', cat:'Skins', slot:'toon', name:'Robo Toon', desc:'Toon de Demoon rebuilt as a chrome robot.'},
  {id:'skin_julie_pink', cat:'Skins', slot:'julie', hero:'julie', name:'Agent Pink', desc:'A pink trench coat for undercover work.', skin:{coat:'#ff7ab6', hat:'#b8326e', band:'#ffcc29'}},
  {id:'pop_rainbow', cat:'Effects', slot:'pop', name:'Rainbow Pops', desc:'Every pop bursts in all the colours.'},
  {id:'skin_anna_winter', cat:'Skins', slot:'anna', hero:'anna', name:'Winter Garden', desc:'A frosty apron and a white sun hat.', skin:{apron:'#7fd6ff', hat:'#ffffff'}},
  {id:'title_legend', cat:'Titles', slot:'title', name:'WIDR TD Legend', desc:'The final title on the track.'},
];
TRACK_ITEMS.forEach(it => it.track = TRACK.findIndex(r => r && r.it === it.id));

// ---------- Balance: bosses have 25% less health ----------
const BOSS_HP = .75;
for (const k in ENEMIES) if (ENEMIES[k].boss) ENEMIES[k].hp = Math.round(ENEMIES[k].hp * BOSS_HP / 10) * 10;
