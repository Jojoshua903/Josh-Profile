// ===== WIDR TD: heroes from Wat in de Combat (part 2) =====

// ---------- Kim Chi: the chef, sets enemies on fire with spicy kimchi ----------
TOWERS.kimchi = {
  name:'Kim Chi', from:'Wat in de Combat', role:'Spicy Chef', cost:500, color:'#e8334a',
  blurb:'UNIQUE: throws jars of spicy kimchi that set enemies on fire. Burning ignores armor, ice, shields and works on flyers.',
  base:{range:125, rate:.9, dmg:1, pierce:2, kind:'kimchi', shots:1, spread:0, speed:520, burn:1, burnT:3},
  paths:[
    {name:'Hakmes', ups:[
      up('Sharp Knife', 180, '+1 damage.', s=>{s.dmg+=1;}),
      up('Double Chop', 450, 'Throws 2 jars at a time.', s=>{s.shots=2; s.spread=.2;}),
      up('Knife Juggler', 1900, '4 jars at a time, +3 pierce.', s=>{s.shots=4; s.pierce+=3;}),
      up('Master Chef', 6500, '7 damage per jar.', s=>{s.dmg=7;}),
      up('Iron Chef', 32000, '6 jars, 18 damage, 40% faster.', s=>{s.shots=6; s.dmg=18; s.rate*=.6;}),
    ]},
    {name:'Pittige Kimchi', ups:[
      up('Gochugaru', 250, 'Burns for 2 damage a second.', s=>{s.burn=2;}),
      up('Fermented', 600, 'Burns for 3 a second, for 5 seconds.', s=>{s.burn=3; s.burnT=5;}),
      up('Fire Kimchi', 2300, 'Burns for 7 a second, and burning enemies set others on fire when they pop.', s=>{s.burn=7; s.burnSpread=true;}),
      up('Ghost Pepper', 7000, 'Burns for 18 a second.', s=>{s.burn=18;}),
      up('Volcano Kimchi', 34000, 'Burns for 50 a second.', s=>{s.burn=50;}),
    ]},
    {name:'Restaurant', ups:[
      up('Takeout', 250, '+$50 per wave.', s=>{s.income=(s.income||0)+50;}),
      up('Family Recipe', 650, 'Nearby heroes deal 10% more damage.', aura({dmg:.1})),
      up('Kimchi Feast', 2500, 'ABILITY: sets every enemy on the map on fire for 10 damage a second for 6 seconds.', ab('feast', 'Kimchi Feast', '🌶', 45)),
      up('Michelin Star', 7000, '+$200 per wave. The Feast burns twice as hot.', both(s=>{s.income=(s.income||0)+200;}, abPow(2, .7))),
      up('Kimchi Empire', 33000, '+$600 per wave, nearby heroes deal 20% more damage. The Feast burns 3x as hot.', both(s=>{s.income=(s.income||0)+600;}, aura({dmg:.2}), abPow(3, .6))),
    ]},
  ]};

// ---------- Dean: the outlaw with a 6-shot revolver that has to reload ----------
TOWERS.dean = {
  name:'Dean', from:'Wat in de Combat', role:'Outlaw', cost:600, color:'#7a4f2e',
  blurb:'UNIQUE: fires 6 lightning-fast revolver shots, then has to reload. Long range.',
  base:{range:175, rate:.14, dmg:3, pierce:1, kind:'revolver', ammo:6, reload:2.2, shots:1},
  paths:[
    {name:'Quick Draw', ups:[
      up('Speed Loader', 200, 'Reloads 30% faster.', s=>{s.reload*=.7;}),
      up('Fan the Hammer', 500, 'Shoots 40% faster.', s=>{s.rate*=.6;}),
      up('Big Iron', 2200, '8 bullets per reload, 6 damage.', s=>{s.ammo=8; s.dmg=6;}),
      up('Dual Revolvers', 7000, 'Every shot hits 2 enemies.', s=>{s.shots=2;}),
      up('Fastest in the West', 34000, '12 bullets, 16 damage, reloads twice as fast.', s=>{s.ammo=12; s.dmg=16; s.reload*=.5;}),
    ]},
    {name:'Bounty Hunter', ups:[
      up('Wanted', 250, '+$1 for every enemy he pops.', s=>{s.bounty=1;}),
      up('Silver Bullets', 600, 'Bullets crack armor, and he sees ghosts.', s=>{s.crush=true; s.camo=true;}),
      up('Golden Gun', 2300, '+3 damage, triple vs bosses, +$2 per pop.', s=>{s.dmg+=3; s.bossMult=3; s.bounty=2;}),
      up('Dead or Alive', 7000, '5x vs bosses, +$4 per pop.', s=>{s.bossMult=5; s.bounty=4;}),
      up('Legend of the West', 33000, '+20 damage, +$6 per pop.', s=>{s.dmg+=20; s.bounty=6;}),
    ]},
    {name:'Outlaw', ups:[
      up('Lasso', 300, 'Every shot slows 40%.', s=>{s.slow=.4;}),
      up('Dust Cloud', 650, 'Every shot stuns for 0.3s.', s=>{s.stun=.3;}),
      up('High Noon', 2600, 'ABILITY: one shot at each of the 12 strongest enemies for 10x damage.', ab('highnoon', 'High Noon', '🤠', 45)),
      up('Most Wanted', 7000, 'Nearby heroes get +15% range. High Noon is twice as strong.', both(aura({range:.15}), abPow(2, .7))),
      up('Wild West', 34000, 'Nearby heroes attack 25% faster. High Noon is 3x as strong.', both(aura({rate:.25, range:.15}), abPow(3, .6))),
    ]},
  ]};

// ---------- Maat: the guardian angel catches enemies before they leak ----------
TOWERS.maat = {
  name:'Maat', from:'Wat in de Combat', role:'Guardian Angel', cost:700, color:'#c9a26b',
  blurb:'UNIQUE: catches a few enemies every wave right before they reach the exit, so you don\'t lose lives (bosses excepted). Fights with a crystal sword.',
  base:{range:90, rate:.9, dmg:2, pierce:8, kind:'sword', saves:2},
  paths:[
    {name:'Crystal Sword', ups:[
      up('Sharp Crystal', 200, '+1 damage.', s=>{s.dmg+=1;}),
      up('Radiant Blade', 500, '+15 range, +6 pierce.', s=>{s.range+=15; s.pierce+=6;}),
      up('Zinc Blade', 2200, '7 damage, and she sees ghosts.', s=>{s.dmg=7; s.camo=true;}),
      up('Archangel Blade', 7000, '16 damage, and she hits flyers.', s=>{s.dmg=16; s.air=true;}),
      up('Sword of Light', 34000, '40 damage, +30 range, triple vs bosses.', s=>{s.dmg=40; s.range+=30; s.bossMult=3;}),
    ]},
    {name:'Guardian', ups:[
      up('Watchful', 250, 'Catches 4 enemies per wave.', s=>{s.saves=4;}),
      up('Shield of Faith', 600, 'Catches 7 enemies per wave.', s=>{s.saves=7;}),
      up('Zinc Crystal', 2400, 'Catches 12 per wave and gives back 5 lives every wave.', s=>{s.saves=12; s.regen=5;}),
      up('Sanctuary', 7000, 'Catches 25 per wave, +15 lives every wave.', s=>{s.saves=25; s.regen=15;}),
      up('Eternal Guardian', 32000, 'Catches 60 per wave, +40 lives every wave.', s=>{s.saves=60; s.regen=40;}),
    ]},
    {name:'Halo', ups:[
      up('Holy Light', 300, 'Nearby heroes see ghosts.', aura({camo:true})),
      up('Blessing', 700, 'Nearby heroes deal 15% more damage.', aura({dmg:.15})),
      up('Heavenly Light', 2600, 'ABILITY: gives back 25 lives and hits every enemy for 25.', ab('heaven', 'Heavenly Light', '😇', 60)),
      up('Seraph', 7000, 'Nearby heroes deal 25% more damage. Heavenly Light is twice as strong.', both(aura({dmg:.25}), abPow(2, .7))),
      up('Divine Shield', 34000, 'Nearby heroes deal 35% more damage with +10% range. Heavenly Light is 3x as strong.', both(aura({dmg:.35, range:.1}), abPow(3, .6))),
    ]},
  ]};

// ---------- Jan Pool: the calculator temple guardian, gets stronger every wave ----------
TOWERS.janpool = {
  name:'Jan Pool', from:'Wat in de Combat', role:'Calculator Guardian', cost:500, color:'#8ab478',
  blurb:'UNIQUE: throws numbers whose damage grows with the wave number. Weak early, scary late.',
  base:{range:140, rate:1, dmg:1, pierce:3, kind:'digit', shots:1, spread:0, speed:480, waveScale:.1},
  paths:[
    {name:'Long Division', ups:[
      up('Carry the One', 200, '+2 pierce.', s=>{s.pierce+=2;}),
      up('Double Digits', 500, 'Throws 2 numbers at a time.', s=>{s.shots=2; s.spread=.18;}),
      up('Long Division', 2100, '4 numbers at a time, +3 pierce.', s=>{s.shots=4; s.pierce+=3;}),
      up('Algebra', 6500, '5 numbers, +4 damage.', s=>{s.shots=5; s.dmg+=4;}),
      up('Infinite Series', 32000, '8 numbers, +12 damage.', s=>{s.shots=8; s.dmg+=12;}),
    ]},
    {name:'Exponents', ups:[
      up('Squared', 300, '+1 damage for every 5 waves.', s=>{s.waveScale=.2;}),
      up('Cubed', 700, '+1 damage for every 3 waves.', s=>{s.waveScale=.35;}),
      up('Exponential', 2600, '+3 damage for every 5 waves, 20% faster.', s=>{s.waveScale=.6; s.rate*=.8;}),
      up('Factorial', 7500, '+1 damage every wave, double vs bosses.', s=>{s.waveScale=1; s.bossMult=2;}),
      up('Googol', 36000, '+2 damage every wave.', s=>{s.waveScale=2;}),
    ]},
    {name:'Temple Guardian', ups:[
      up('Riddle', 250, 'Every number stuns for 0.25s.', s=>{s.stun=.25;}),
      up('Ancient Wisdom', 600, 'Sees ghosts, nearby heroes get +15% range.', both(s=>{s.camo=true;}, aura({range:.15}))),
      up('Pi', 2500, 'ABILITY: hits every enemy for 3.14 × the wave number.', ab('pi', 'Pi', 'π', 40)),
      up('Grand Calculator', 7000, '+$150 per wave. Pi is twice as strong.', both(s=>{s.income=(s.income||0)+150;}, abPow(2, .7))),
      up('Temple of Numbers', 33000, '+$500 per wave. Pi is 3x as strong.', both(s=>{s.income=(s.income||0)+500;}, abPow(3, .6))),
    ]},
  ]};

// ---------- Appster: the radio DJ monkey, every beat drop boosts nearby heroes ----------
TOWERS.appster = {
  name:'Appster', from:'Wat in de Combat', role:'Radio DJ', cost:550, color:'#9aa0ab',
  blurb:'UNIQUE: spins vinyl records, and every few seconds the beat drops: nearby heroes attack 50% faster for a moment and nearby enemies take a hit.',
  base:{range:135, rate:.8, dmg:1, pierce:4, kind:'vinyl', shots:1, spread:0, speed:560, beat:4, dropR:140, dropDur:1.5, dropDmg:1},
  paths:[
    {name:'Vinyl Records', ups:[
      up('Heavy Vinyl', 200, '+3 pierce.', s=>{s.pierce+=3;}),
      up('Double Deck', 500, 'Throws 2 records at a time.', s=>{s.shots=2; s.spread=.2;}),
      up('Scratch Attack', 2000, '4 damage, 30% faster.', s=>{s.dmg=4; s.rate*=.7;}),
      up('Platinum Record', 6500, '3 records, 9 damage.', s=>{s.shots=3; s.dmg=9;}),
      up('Hall of Fame Hits', 32000, '5 records, 22 damage.', s=>{s.shots=5; s.dmg=22;}),
    ]},
    {name:'The Drop', ups:[
      up('Bass Boost', 300, 'Drops hit for 3 in a bigger area.', s=>{s.dropDmg=3; s.dropR=160;}),
      up('Faster BPM', 700, 'The beat drops every 3 seconds.', s=>{s.beat=3;}),
      up('Big Drop', 2600, 'Drops hit for 12 and stun for 0.5s.', s=>{s.dropDmg=12; s.dropStun=.5;}),
      up('Festival Headliner', 7500, 'Drops every 2 seconds for 25, boost lasts longer.', s=>{s.beat=2; s.dropDur=1.8; s.dropDmg=25;}),
      up('Wall of Sound', 36000, 'Drops every 1.5 seconds for 70 in a huge area.', s=>{s.beat=1.5; s.dropDmg=70; s.dropR=200;}),
    ]},
    {name:'Radio DJ', ups:[
      up('Requests', 250, '+$50 per wave.', s=>{s.income=(s.income||0)+50;}),
      up('On Air', 650, 'Nearby heroes get +15% range.', aura({range:.15})),
      up('Live Mix', 2500, 'ABILITY: every hero within 220 attacks 3x as fast for 8 seconds.', ab('livemix', 'Live Mix', '🎚', 45)),
      up('Prime Time Radio', 7000, '+$150 per wave. Live Mix lasts 50% longer.', both(s=>{s.income=(s.income||0)+150;}, abPow(2, .7))),
      up('Number One Station', 33000, '+$500 per wave, nearby heroes attack 20% faster. Live Mix lasts twice as long.', both(s=>{s.income=(s.income||0)+500;}, aura({rate:.2}), abPow(3, .6))),
    ]},
  ]};
['kimchi', 'dean', 'maat', 'janpool', 'appster'].forEach(P5);

// ---------- New hero categories ----------
CATEGORIES.length = 0;
CATEGORIES.push(
  {id:'sports', name:'Sports & Throwers', icon:'🎯', color:'#ff9f1a', blurb:'Fruit, baseballs, ping pong, hurling and paper planes.', heroes:['guiseppe', 'nathan', 'chemmy', 'fionn', 'jorn']},
  {id:'tech', name:'Agents & Tech', icon:'🕵️', color:'#5fd0d6', blurb:'Detectives, bombs, drones, gadgets and a big bodyguard.', heroes:['julie', 'daniel', 'josh', 'ratjetoe', 'thomas', 'janpool']},
  {id:'fight', name:'Fighters & Outlaws', icon:'🥊', color:'#e8334a', blurb:'Ninjas, dwarves, chefs and gunslingers.', heroes:['reshman', 'lars', 'kimchi', 'dean']},
  {id:'magic', name:'Magic & Mythic', icon:'✨', color:'#a65cff', blurb:'Wizards, ice, vines, dragons and gods.', heroes:['milo', 'deniz', 'anna', 'stormmoeder', 'a438']},
  {id:'animals', name:'Animals', icon:'🐾', color:'#7be36b', blurb:'Space dogs, ravens, cats, worms and monkeys.', heroes:['otis', 'raaf', 'kayoyara', 'dih', 'appster']},
  {id:'support', name:'Support & Money', icon:'💰', color:'#ffcc29', blurb:'Buffs, cash and keeping your lives safe.', heroes:['sichen', 'maat', 'alexander']},
);
TOWER_ORDER.length = 0;
CATEGORIES.forEach(c => c.heroes.forEach(k => { TOWER_ORDER.push(k); TOWERS[k].cat = c.id; }));
TOWER_ORDER.forEach((k, i) => TOWERS[k].key = HERO_KEYS[i] || '');
