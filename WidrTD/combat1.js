// ===== WIDR TD: heroes from Wat in de Combat (part 1) =====
const P5 = (k) => TOWERS[k].paths.forEach(p => p.ups.forEach((u, i) => {
  if (i < 3 || u.paradise) return;
  const f = u.apply; u.paradise = i + 1;
  u.apply = s => { f(s); s.paradise = Math.max(s.paradise || 0, i + 1); };
}));
const up = (name, cost, desc, apply) => ({name, cost, desc, apply});

// ---------- Kayo & Yara: two cats in a trenchcoat, swap who's on top at any time ----------
TOWERS.kayoyara = {
  name:'Kayo & Yara', from:'Wat in de Combat', role:'Two Cats, One Coat', cost:550, color:'#c98a4a',
  blurb:'UNIQUE: swap which cat is on top whenever you like. Yara scratches fast and sees ghosts; Kayo pounds slowly, hits hard, stuns and cracks armor.',
  forms:{
    yara: s => { s.camo = true; },
    kayo: s => { s.dmg = s.dmg * (3 + (s.kayoLv || 0)) + 1; s.rate *= 2.4; s.stun = Math.max(s.stun || 0, s.kayoStun || .4); s.pierce += 4; s.armorMult = Math.max(s.armorMult || 1, 2); s.range += 10; if (s.kayoKnock) s.knock = s.kayoKnock; },
  },
  formName:{yara:'Yara on top: fast scratches', kayo:'Kayo on top: heavy pounds'},
  base:{range:85, rate:.45, dmg:1, pierce:4, kind:'claw'},
  paths:[
    {name:"Yara's Claws", ups:[
      up('Sharp Claws', 180, 'Scratches 15% faster with +1 pierce.', s=>{s.rate*=.85; s.pierce+=1;}),
      up('Fur Flurry', 420, '+1 damage.', s=>{s.dmg+=1;}),
      up('Cat Scratch Fever', 1900, 'Scratches 40% faster with +4 pierce.', s=>{s.rate*=.6; s.pierce+=4;}),
      up('Nine Lives', 6500, '+4 damage, and every hit slows 30%.', s=>{s.dmg+=4; s.slow=.3;}),
      up('Queen of Cats', 31000, '+12 damage, +30 range, 40% faster.', s=>{s.dmg+=12; s.range+=30; s.rate*=.6;}),
    ]},
    {name:"Kayo's Paws", ups:[
      up('Heavy Paws', 250, 'With Kayo on top: 4x damage instead of 3x.', s=>{s.kayoLv=1;}),
      up('Pounce', 600, 'With Kayo on top: pounces knock enemies back.', s=>{s.kayoKnock=30;}),
      up('Mokerpoot', 2200, 'With Kayo on top: 5x damage and 0.8s stuns.', s=>{s.kayoLv=2; s.kayoStun=.8;}),
      up('Big Bruiser', 6800, 'With Kayo on top: 7x damage, triple vs bosses.', s=>{s.kayoLv=4; s.bossMult=3;}),
      up('Mega Moker', 33000, 'With Kayo on top: 11x damage and bigger knockback.', s=>{s.kayoLv=8; s.kayoKnock=60;}),
    ]},
    {name:'Trenchcoat', ups:[
      up('Fake Watches', 300, 'Sells fake watches from the coat: +$40 per wave.', s=>{s.income=(s.income||0)+40;}),
      up('Inner Pockets', 700, '+$60 more per wave, nearby heroes get +10% range.', both(s=>{s.income=(s.income||0)+60;}, aura({range:.1}))),
      up('Wissel!', 2400, 'ABILITY: both cats fight at once for 8 seconds and attack 2.5x as fast.', s=>{s.ability={id:'double', name:'Wissel!', icon:'🐈', cd:40, rateBoost:2.5};}),
      up('Two Cats One Coat', 7000, '+$150 per wave. Wissel! lasts 50% longer.', both(s=>{s.income=(s.income||0)+150;}, abPow(2, .7))),
      up('Purrfect Crime', 32000, '+$500 per wave, nearby heroes attack 20% faster. Wissel! lasts twice as long.', both(s=>{s.income=(s.income||0)+500;}, aura({rate:.2}), abPow(3, .6))),
    ]},
  ]};

// ---------- Dih: a burrowing worm you place ON the road ----------
TOWERS.dih = {
  name:'Dih', from:'Wat in de Combat', role:'Burrowing Worm', cost:400, color:'#ff8fb1', onRoad:true,
  blurb:'UNIQUE: placed on the road itself, not next to it. He bites everything walking over his hole. Can\'t reach flyers.',
  base:{range:50, rate:.6, dmg:1, pierce:5, kind:'burrow'},
  paths:[
    {name:'Big Bite', ups:[
      up('Sharp Teeth', 200, '+1 damage.', s=>{s.dmg+=1;}),
      up('Wide Mouth', 450, '+15 range and +4 pierce.', s=>{s.range+=15; s.pierce+=4;}),
      up('Gulp', 2000, '5 damage and +6 pierce.', s=>{s.dmg=5; s.pierce+=6;}),
      up('Deep Dweller', 6500, '14 damage that cracks armor.', s=>{s.dmg=14; s.crush=true;}),
      up('Sandworm', 33000, '40 damage, +30 range, triple vs bosses.', s=>{s.dmg=40; s.range+=30; s.bossMult=3;}),
    ]},
    {name:'Tunnels', ups:[
      up('Wiggle', 250, 'Bites knock enemies back a little.', s=>{s.knock=20;}),
      up('Dizzy Tunnels', 550, 'Bites stun for 0.4s.', s=>{s.stun=.4;}),
      up('Tunnel Network', 2100, 'Bigger knockback and 30% faster bites.', s=>{s.knock=45; s.rate*=.7;}),
      up('Quake Worm', 6500, 'Even bigger knockback, 0.8s stuns.', s=>{s.knock=60; s.stun=.8;}),
      up('Worm Hole', 30000, 'Huge knockback and 1.2s stuns.', s=>{s.knock=100; s.stun=1.2;}),
    ]},
    {name:'Underground', ups:[
      up('Fertile Soil', 300, '+$50 per wave.', s=>{s.income=(s.income||0)+50;}),
      up('Compost', 650, 'Bites slow enemies by 35%.', s=>{s.slow=.35;}),
      up('Ondergronds', 2500, 'ABILITY: drags every non-boss enemy on the ground 250 back along the road and stuns them.', ab('tunnel', 'Ondergronds', '🪱', 45)),
      up('Worm Colony', 7000, '+$150 per wave. Ondergronds drags twice as hard.', both(s=>{s.income=(s.income||0)+150;}, abPow(2, .7))),
      up('Great Worm Mother', 33000, '+$400 per wave. Ondergronds drags 3x as hard.', both(s=>{s.income=(s.income||0)+400;}, abPow(3, .6))),
    ]},
  ]};

// ---------- Alexander: the mafia boss sends henchmen up the road ----------
TOWERS.alexander = {
  name:'Alexander', from:'Wat in de Combat', role:'Mafia Boss', cost:800, color:'#3a3a48',
  blurb:'UNIQUE: never attacks himself. He sends henchmen walking backwards up the road from the exit, beating up every enemy they bump into. Can stand anywhere.',
  base:{range:2000, rate:5, dmg:2, pierce:4, kind:'goon', goonN:1, goonSpd:70},
  paths:[
    {name:'Henchmen', ups:[
      up('Tough Guys', 300, 'Each henchman takes 2 more hits.', s=>{s.pierce+=2;}),
      up('More Muscle', 600, 'Sends henchmen 30% more often.', s=>{s.rate*=.7;}),
      up('Brass Knuckles', 2400, '6 damage that cracks armor, 4 more hits each.', s=>{s.dmg=6; s.pierce+=4; s.crush=true;}),
      up('The Family', 7500, 'Sends 2 henchmen at a time, 12 damage.', s=>{s.goonN=2; s.dmg=12;}),
      up('Godfather', 36000, '3 at a time, 30 damage, 10 more hits, triple vs bosses.', s=>{s.goonN=3; s.dmg=30; s.pierce+=10; s.bossMult=3;}),
    ]},
    {name:'Protection Money', ups:[
      up('Protection Racket', 300, '+$80 per wave.', s=>{s.income=(s.income||0)+80;}),
      up('Shakedown', 750, '+$2 for every enemy his crew pops.', s=>{s.bounty=2;}),
      up('Money Laundering', 2500, '+$250 per wave in total.', s=>{s.income=(s.income||0)+170;}),
      up('Offshore Accounts', 7000, '+$600 per wave in total.', s=>{s.income=(s.income||0)+350;}),
      up('Mafia Empire', 30000, '+$1,500 per wave in total and +$4 per pop.', s=>{s.income=(s.income||0)+900; s.bounty=4;}),
    ]},
    {name:'Handlangers', ups:[
      up('Lookouts', 250, 'Henchmen can see ghosts.', s=>{s.camo=true;}),
      up('Getaway Car', 700, 'Henchmen walk 60% faster.', s=>{s.goonSpd=112;}),
      up('Handlangers', 2600, 'ABILITY: sends 12 henchmen onto the road at once.', ab('crew', 'Handlangers', '🕴', 45)),
      up('Hitmen', 7000, 'Henchmen stun for 0.5s. The ability sends twice as many.', both(s=>{s.stun=.5;}, abPow(2, .7))),
      up('Cosa Nostra', 34000, 'Henchmen slow 50%. The ability sends 3x as many.', both(s=>{s.slow=.5;}, abPow(3, .6))),
    ]},
  ]};

// ---------- De Stormmoeder: the huge storm dragon, can sit on water and rocks ----------
TOWERS.stormmoeder = {
  name:'De Stormmoeder', from:'Wat in de Combat', role:'Storm Dragon', cost:1100, color:'#3a2458', size:1.6, flying:true,
  blurb:'UNIQUE: a huge flying dragon. She can be placed on water, rocks and other blockers. Throws storm orbs that explode and hit flyers.',
  base:{range:170, rate:1.6, dmg:3, pierce:12, kind:'storm', radius:45, air:true, shots:1},
  paths:[
    {name:'Stormbol', ups:[
      up('Thunderhead', 350, '+1 damage and bigger blasts.', s=>{s.dmg+=1; s.radius+=8;}),
      up('Twin Storms', 800, 'Throws 2 orbs at a time.', s=>{s.shots=2;}),
      up('Hurricane', 3000, '8 damage, much bigger blasts.', s=>{s.dmg=8; s.radius=65;}),
      up('Cyclone', 8500, '3 orbs, 18 damage, stuns for 0.6s.', s=>{s.shots=3; s.dmg=18; s.stun=.6;}),
      up('Eye of the Mother', 40000, '45 damage, huge blasts, triple vs bosses.', s=>{s.dmg=45; s.radius=90; s.bossMult=3;}),
    ]},
    {name:'Stormbeet', ups:[
      up('Static Scales', 300, 'Every orb also arcs lightning to 2 enemies.', s=>{s.chains=2;}),
      up('Thunder Bite', 700, 'Lightning arcs to 4 enemies, and she sees ghosts.', s=>{s.chains=4; s.camo=true;}),
      up('Living Storm', 2600, 'Throws 40% faster.', s=>{s.rate*=.6;}),
      up('Tempest', 8000, 'Lightning arcs to 8 enemies, +6 damage.', s=>{s.chains=8; s.dmg+=6;}),
      up('Storm Incarnate', 38000, 'Lightning arcs to 14 enemies, throws twice as fast.', s=>{s.chains=14; s.rate*=.5;}),
    ]},
    {name:'Dragon Wings', ups:[
      up('Gale', 300, 'Blasts slow enemies by 30%.', s=>{s.slow=.3;}),
      up('Wind Shear', 650, 'Blasts push enemies back.', s=>{s.knock=40;}),
      up('Storm Call', 2800, 'ABILITY: a storm sweeps the map: 30 damage to everything and a 2s stun.', ab('stormcall', 'Storm Call', '🌩', 50)),
      up('Mother of Storms', 7500, 'Nearby heroes attack 20% faster. Storm Call hits twice as hard.', both(aura({rate:.2, r:170}), abPow(2, .7))),
      up('Endless Storm', 35000, 'Nearby heroes get +35% attack speed and +15% range. Storm Call hits 3x as hard.', both(aura({rate:.35, range:.15, r:190}), abPow(3, .6))),
    ]},
  ]};

// ---------- A4-38: a contained deity that breaks out into its true form, Ø9-38 ----------
TOWERS.a438 = {
  name:'A4-38', from:'Wat in de Combat', role:'Contained Deity', cost:900, color:'#f4f1ea',
  blurb:'UNIQUE: starts as a small contained deity, a square head with one big eye, that fights with corner kicks. After enough pops it breaks its containment and turns into Ø9-38, its giant true form with a god beam, for the rest of the game.',
  forms:{
    a4: s => {},
    o9: s => { const k = 1 + (s.o9Lv || 0) * .75; s.kind = 'laser'; s.width = 16; s.dmg = (s.dmg * 4 + 4) * k; s.pierce += 16; s.range += 90; s.rate = Math.min(s.rate, .5); s.camo = true; s.air = true; s.crush = true; },
  },
  formName:{a4:'A4-38: contained', o9:'Ø9-38: true form'}, formSize:{a4:1, o9:1.7},
  base:{range:80, rate:.8, dmg:2, pierce:6, kind:'kick', breakAt:250},
  paths:[
    {name:'Containment Break', ups:[
      up('Cracks', 250, 'Breaks out after 180 pops instead of 250.', s=>{s.breakAt=180;}),
      up('Leaking Power', 600, 'Breaks out after 120 pops, +1 damage.', s=>{s.breakAt=120; s.dmg+=1;}),
      up('Shattered Seal', 2400, 'Breaks out after 60 pops. The true form is 75% stronger.', s=>{s.breakAt=60; s.o9Lv=1;}),
      up('Unbound', 8000, 'Breaks out after 30 pops. The true form is 2.5x stronger.', s=>{s.breakAt=30; s.o9Lv=2;}),
      up('True God', 40000, 'Starts in the true form, which is 4x stronger.', s=>{s.breakAt=0; s.o9Lv=4;}),
    ]},
    {name:'Hoekschop', ups:[
      up('Sharp Corners', 200, '+1 damage (in both forms).', s=>{s.dmg+=1;}),
      up('Paper Cut', 500, '+6 pierce, 20% faster.', s=>{s.pierce+=6; s.rate*=.8;}),
      up('Corner Kick', 2000, '+3 damage, kicks stun for 0.5s and knock back.', s=>{s.dmg+=3; s.stun=.5; s.knock=25;}),
      up('Folded Steel', 6500, '+8 damage that cracks armor.', s=>{s.dmg+=8; s.crush=true;}),
      up('Origami Deity', 31000, '+20 damage, +30 range.', s=>{s.dmg+=20; s.range+=30;}),
    ]},
    {name:'Inperking', ups:[
      up('Witness', 250, 'Sees ghosts.', s=>{s.camo=true;}),
      up('Gaze', 600, 'Hits slow enemies by 30%.', s=>{s.slow=.3;}),
      up('Inperking', 2600, 'ABILITY: stuns every enemy for 3 seconds. In the true form it also fires Godstraal: 60 damage to every enemy.', ab('inperking', 'Inperking', '👁', 50)),
      up('Higher Being', 7500, 'Nearby heroes deal 15% more damage. Inperking is twice as strong.', both(aura({dmg:.15}), abPow(2, .7))),
      up('Divine Order', 36000, 'Nearby heroes deal 30% more damage. Inperking is 3x as strong.', both(aura({dmg:.3, r:160}), abPow(3, .6))),
    ]},
  ]};
['kayoyara', 'dih', 'alexander', 'stormmoeder', 'a438'].forEach(P5);
