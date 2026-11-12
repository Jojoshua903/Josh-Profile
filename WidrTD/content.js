// ===== WIDR TD: new heroes, tier 4/5 upgrades, game modes =====

// ---------- 8 more heroes from the WIDR crew ----------
const ab = (id, name, icon, cd) => s => { s.ability = {id, name, icon, cd}; };
Object.assign(TOWERS, {
  lars: {
    name:'Lars', from:'Wat in de Combat', role:'Mining Dwarf', cost:450, color:'#a0662b',
    blurb:'Swings his pickaxe at everything nearby and digs up gold during waves.',
    base:{range:70, rate:1.1, dmg:2, pierce:6, kind:'pick', mine:{every:8, amt:20}},
    paths:[
      {name:'Deep Mine', ups:[
        {name:'Gold Vein', cost:300, desc:'Digs up $40 at a time.', apply:s=>{s.mine={every:8, amt:40};}},
        {name:'Mine Cart', cost:700, desc:'Digs $60 every 6 seconds.', apply:s=>{s.mine={every:6, amt:60};}},
        {name:'Motherlode', cost:2200, desc:'Digs $150 every 5 seconds.', apply:s=>{s.mine={every:5, amt:150};}},
      ]},
      {name:'Pickaxe', ups:[
        {name:'Sharpened Pick', cost:250, desc:'3 damage and the pick cracks armor.', apply:s=>{s.dmg=3; s.crush=true;}},
        {name:'Wide Swing', cost:450, desc:'+25 range and +6 pierce.', apply:s=>{s.range+=25; s.pierce+=6;}},
        {name:'Earthshaker', cost:1900, desc:'6 damage swings that stun for 0.5s.', apply:s=>{s.dmg=6; s.stun=.5;}},
      ]},
      {name:'Dwarf Clan', ups:[
        {name:'Miner\'s Lantern', cost:250, desc:'Lars can see ghosts.', apply:s=>{s.camo=true;}},
        {name:'Beard Power', cost:600, desc:'Swings 25% faster.', apply:s=>{s.rate*=.75;}},
        {name:'Cave-In', cost:2600, desc:'ABILITY: rocks fall on the 15 toughest enemies for 30 damage and stun them.', apply:ab('caveIn','Cave-In','⛏',45)},
      ]},
    ]},
  milo: {
    name:'Milo', from:'Wat in de Combat', role:'Lightning Wizard', cost:550, color:'#ffd23a',
    blurb:'Lightning that jumps between enemies standing close together. Hits flyers.',
    base:{range:130, rate:1.2, dmg:1, kind:'chain', chains:4, air:true},
    paths:[
      {name:'Storm', ups:[
        {name:'Forked Bolt', cost:350, desc:'Jumps to 2 more enemies.', apply:s=>{s.chains+=2;}},
        {name:'Thunderhead', cost:800, desc:'3 damage per jump.', apply:s=>{s.dmg=3;}},
        {name:'Tempest', cost:2600, desc:'Jumps 12 times and casts 40% faster.', apply:s=>{s.chains=12; s.rate*=.6;}},
      ]},
      {name:'Static', ups:[
        {name:'Static Shock', cost:300, desc:'Every jump stuns for 0.3s.', apply:s=>{s.stun=.3;}},
        {name:'Overload', cost:700, desc:'Double damage against bosses.', apply:s=>{s.bossMult=2;}},
        {name:'Ball Lightning', cost:2400, desc:'Casts two separate chains at once.', apply:s=>{s.shots=2;}},
      ]},
      {name:'Wizard School', ups:[
        {name:'Spellbook', cost:250, desc:'+25 range.', apply:s=>{s.range+=25;}},
        {name:'Mana Surge', cost:800, desc:'Heroes near Milo attack 15% faster.', apply:s=>{s.aura=Object.assign(s.aura||{r:130},{rate:.15});}},
        {name:'Lightning Storm', cost:2800, desc:'ABILITY: 30 bolts strike random enemies for 12 damage each.', apply:ab('lightningStorm','Lightning Storm','🌩',45)},
      ]},
    ]},
  josh: {
    name:'Josh', from:'Wat in de Combat', role:'Drone Controller', cost:600, color:'#5a8f5c', water:true,
    blurb:'Sends out drones that circle him and zap the nearest enemy. Hits flyers.',
    base:{range:140, rate:.9, dmg:1, kind:'drone', drones:2, air:true},
    paths:[
      {name:'Swarm', ups:[
        {name:'Extra Drone', cost:350, desc:'3 drones.', apply:s=>{s.drones=3;}},
        {name:'Swarm Protocol', cost:900, desc:'5 drones.', apply:s=>{s.drones=5;}},
        {name:'Hive Mind', cost:2800, desc:'8 drones that fire 30% faster.', apply:s=>{s.drones=8; s.rate*=.7;}},
      ]},
      {name:'Payload', ups:[
        {name:'Heavy Rotors', cost:300, desc:'Zaps deal 2 damage.', apply:s=>{s.dmg=2;}},
        {name:'Micro Missiles', cost:800, desc:'Zaps explode, hitting enemies around the target.', apply:s=>{s.zapBlast=30;}},
        {name:'Predator Drone', cost:2500, desc:'6 damage zaps, double against bosses.', apply:s=>{s.dmg=6; s.bossMult=2;}},
      ]},
      {name:'Controller', ups:[
        {name:'Signal Booster', cost:250, desc:'+30 range.', apply:s=>{s.range+=30;}},
        {name:'Night Vision', cost:450, desc:'Drones can see ghosts.', apply:s=>{s.camo=true;}},
        {name:'Drone Strike', cost:3000, desc:'ABILITY: 12 drones dive-bomb the enemies closest to the gate.', apply:ab('droneStrike','Drone Strike','🛸',45)},
      ]},
    ]},
  reshman: {
    name:'Reshman', from:'Demolition Run', role:'Ninja Blob', cost:400, color:'#2e2a3a',
    blurb:'Throws shuriken in pairs. Sees ghosts and hits flyers.',
    base:{range:135, rate:.65, dmg:1, pierce:2, kind:'star', shots:2, spread:.12, speed:700, camo:true, air:true},
    paths:[
      {name:'Ninja', ups:[
        {name:'Triple Star', cost:250, desc:'3 shuriken and +1 pierce.', apply:s=>{s.shots=3; s.pierce+=1;}},
        {name:'Shadow Step', cost:550, desc:'Throws 40% faster.', apply:s=>{s.rate*=.6;}},
        {name:'Grandmaster', cost:2300, desc:'6 shuriken, 3 damage each.', apply:s=>{s.shots=6; s.spread=.2; s.dmg=3;}},
      ]},
      {name:'Black Blob', ups:[
        {name:'Goo Coating', cost:250, desc:'Hits slow enemies by 30%.', apply:s=>{s.slow=.3;}},
        {name:'Tar Pit', cost:600, desc:'+1 damage and a stronger 50% slow.', apply:s=>{s.dmg+=1; s.slow=.5;}},
        {name:'Void Form', cost:2400, desc:'4 damage, +6 pierce, cracks armor.', apply:s=>{s.dmg=4; s.pierce+=6; s.crush=true;}},
      ]},
      {name:'Smoke Arts', ups:[
        {name:'Smoke Bomb', cost:300, desc:'Hits stun for 0.35s.', apply:s=>{s.stun=.35;}},
        {name:'Sensei', cost:700, desc:'Heroes near Reshman attack 15% faster.', apply:s=>{s.aura=Object.assign(s.aura||{r:130},{rate:.15});}},
        {name:'Shadow Clones', cost:2500, desc:'ABILITY: for 8 seconds Reshman throws 3x the shuriken, twice as fast.', apply:ab('shadowClones','Shadow Clones','🥷',40)},
      ]},
    ]},
  fionn: {
    name:'Fionn', from:'Who Wants to Be a Hundredaire?', role:'Egghead Geologist', cost:500, color:'#f2e2b8',
    blurb:'Rolls boulders back down the road, flattening a whole line of enemies.',
    base:{range:140, rate:2.2, dmg:2, pierce:10, kind:'boulder'},
    paths:[
      {name:'Landslide', ups:[
        {name:'Bigger Boulders', cost:350, desc:'4 damage and 16 pierce.', apply:s=>{s.dmg=4; s.pierce=16;}},
        {name:'Avalanche', cost:750, desc:'Rolls 40% more often.', apply:s=>{s.rate*=.6;}},
        {name:'Tectonic Shift', cost:2600, desc:'10 damage, 40 pierce, stuns.', apply:s=>{s.dmg=10; s.pierce=40; s.stun=.6;}},
      ]},
      {name:'Survey', ups:[
        {name:'Topographer', cost:250, desc:'+40 range.', apply:s=>{s.range+=40;}},
        {name:'Fault Lines', cost:600, desc:'Boulders slow everything they hit by 40%.', apply:s=>{s.slow=.4;}},
        {name:'Egghead Genius', cost:2200, desc:'Triple damage against bosses.', apply:s=>{s.bossMult=3;}},
      ]},
      {name:'Rock Collector', ups:[
        {name:'Gem Hunter', cost:300, desc:'+$50 at the end of every wave.', apply:s=>{s.income=(s.income||0)+50;}},
        {name:'Geode Cracker', cost:700, desc:'Double damage against armored enemies.', apply:s=>{s.armorMult=2;}},
        {name:'Earthquake', cost:2800, desc:'ABILITY: every enemy takes 15 damage and is stunned for 2 seconds.', apply:ab('earthquake','Earthquake','🌋',50)},
      ]},
    ]},
  deniz: {
    name:'Deniz', from:'WIDR crew', role:'Ice Wizard', cost:400, color:'#7fd6ff', water:true,
    blurb:'Frost waves hit everything nearby and slow it down. Can stand on water.',
    base:{range:85, rate:1.3, dmg:1, pierce:30, kind:'frost', slow:.3, air:true},
    paths:[
      {name:'Blizzard', ups:[
        {name:'Cold Snap', cost:250, desc:'Waves deal 2 damage.', apply:s=>{s.dmg=2;}},
        {name:'Permafrost', cost:550, desc:'55% slow and +20 range.', apply:s=>{s.slow=.55; s.range+=20;}},
        {name:'Absolute Zero', cost:2400, desc:'Every wave freezes enemies solid for 1.2s and deals 4 damage.', apply:s=>{s.stun=1.2; s.dmg=4;}},
      ]},
      {name:'Shatter', ups:[
        {name:'Brittle', cost:300, desc:'Frozen or stunned enemies take double damage from Deniz.', apply:s=>{s.shatter=2;}},
        {name:'Ice Spikes', cost:650, desc:'Double damage against armored enemies.', apply:s=>{s.armorMult=2;}},
        {name:'Glacial Spire', cost:2000, desc:'+40 range and waves 40% more often.', apply:s=>{s.range+=40; s.rate*=.6;}},
      ]},
      {name:'Ice Wizard', ups:[
        {name:'Snow Globe', cost:300, desc:'Heroes near Deniz get +15% range.', apply:s=>{s.aura=Object.assign(s.aura||{r:130},{range:.15});}},
        {name:'Frost Sight', cost:500, desc:'Deniz and nearby heroes can see ghosts.', apply:s=>{s.camo=true; s.aura=Object.assign(s.aura||{r:130},{camo:true});}},
        {name:'Big Freeze', cost:2600, desc:'ABILITY: freezes every enemy for 4 seconds (bosses 1.5s).', apply:ab('bigFreeze','Big Freeze','❄️',50)},
      ]},
    ]},
  sichen: {
    name:'Sichen', from:'Who Wants to Be a Hundredaire?', role:'Comedian', cost:450, color:'#ff7ab6',
    blurb:'His airplane joke never lands, so it stuns everyone nearby. Also hypes up nearby heroes.',
    base:{range:90, rate:3, dmg:0, pierce:20, kind:'joke', stun:.5, air:true, aura:{r:120, rate:.08}},
    paths:[
      {name:'Stand-Up', ups:[
        {name:'Punchline', cost:300, desc:'Jokes stun for 0.9s and deal 1 damage.', apply:s=>{s.stun=.9; s.dmg=1;}},
        {name:'Crowd Work', cost:500, desc:'+30 range.', apply:s=>{s.range+=30;}},
        {name:'The Airplane Joke', cost:2300, desc:'Stuns for 1.6s and deals 5 damage. It really didn\'t land.', apply:s=>{s.stun=1.6; s.dmg=5;}},
      ]},
      {name:'Hype', ups:[
        {name:'Warm-Up Act', cost:300, desc:'Nearby heroes attack 20% faster.', apply:s=>{s.aura=Object.assign({},s.aura,{rate:.2});}},
        {name:'Standing Ovation', cost:800, desc:'+30% attack speed and +10% range nearby.', apply:s=>{s.aura=Object.assign({},s.aura,{rate:.3, range:.1});}},
        {name:'Sold-Out Show', cost:2600, desc:'+45% attack speed nearby, and nearby heroes see ghosts.', apply:s=>{s.aura=Object.assign({},s.aura,{rate:.45, camo:true, r:150});}},
      ]},
      {name:'Sidekick', ups:[
        {name:'Heckler', cost:250, desc:'Jokes also slow enemies by 40%.', apply:s=>{s.slow=.4;}},
        {name:'Laugh Track', cost:650, desc:'+$60 at the end of every wave.', apply:s=>{s.income=(s.income||0)+60;}},
        {name:'The Roast', cost:2700, desc:'ABILITY: every enemy loses 10% of its max health (bosses 5%).', apply:ab('roast','The Roast','🎤',45)},
      ]},
    ]},
  anna: {
    name:'Anna', from:'Codename: Conference', role:'Botanist', cost:450, color:'#4fb86b',
    blurb:'Grows thorny vines on the road that keep hurting everything walking through them.',
    base:{range:120, rate:2.4, dmg:1, kind:'vine', patches:3, radius:26, dur:8},
    paths:[
      {name:'Thorns', ups:[
        {name:'Bramble', cost:300, desc:'Vines deal 2 damage.', apply:s=>{s.dmg=2;}},
        {name:'Thicket', cost:600, desc:'Bigger vines that last 4 seconds longer.', apply:s=>{s.radius+=10; s.dur+=4;}},
        {name:'Rose Garden', cost:2300, desc:'5 damage vines, up to 6 at once.', apply:s=>{s.dmg=5; s.patches=6;}},
      ]},
      {name:'Overgrowth', ups:[
        {name:'Creepers', cost:250, desc:'Vines slow enemies by 35%.', apply:s=>{s.slow=.35;}},
        {name:'Strangle Vines', cost:600, desc:'A stronger 60% slow.', apply:s=>{s.slow=.6;}},
        {name:'Venus Flytrap', cost:2500, desc:'Vines swallow any non-boss enemy with 10 health or less.', apply:s=>{s.devour=10;}},
      ]},
      {name:'Botanist', ups:[
        {name:'Herbarium', cost:300, desc:'Anna and nearby heroes can see ghosts.', apply:s=>{s.camo=true; s.aura=Object.assign(s.aura||{r:130},{camo:true});}},
        {name:'Compost', cost:650, desc:'+$70 at the end of every wave.', apply:s=>{s.income=(s.income||0)+70;}},
        {name:'Bloom', cost:2500, desc:'ABILITY: for 8 seconds every vine is twice as big and deals triple damage.', apply:ab('bloom','Bloom','🌸',40)},
      ]},
    ]},
});
TOWER_ORDER.push('lars', 'milo', 'josh', 'reshman', 'fionn', 'deniz', 'sichen', 'anna');
TOWER_ORDER.forEach((k, i) => TOWERS[k].key = i < 9 ? String(i + 1) : i === 9 ? '0' : '');
TOWERS.otis.water = true; TOWERS.guiseppe.water = true;

// who can hit flying enemies
TOWERS.julie.base.air = true; TOWERS.otis.base.air = true; TOWERS.chemmy.base.air = true;
const addAir = (type, p, i, note) => { const u = TOWERS[type].paths[p].ups[i], f = u.apply; u.apply = s => { f(s); s.air = true; }; u.desc += ' ' + note; };
addAir('guiseppe', 1, 0, 'Can now hit flyers.');
addAir('nathan', 0, 0, 'Can now hit flyers.');
addAir('daniel', 1, 0, 'Bombs can now hit flyers.');

// ---------- Tier 4 and 5 on every hero's first path ----------
const PARADISE = {
  guiseppe: [['Biscotti Volcano', 6500, 'Erupts 20 fruit at once, +3 damage, +4 pierce.', s=>{s.shots=20; s.spread='ring'; s.dmg+=3; s.pierce+=4;}],
             ['Fruit Apocalypse', 32000, '32 fruit per throw, +10 damage, 40% faster.', s=>{s.shots=32; s.dmg+=10; s.rate*=.6;}]],
  julie:    [['Case of the Century', 7500, '45 damage pears that stun for 1.5s.', s=>{s.dmg=45; s.stun=1.5;}],
             ['Master Detective', 38000, '120 damage, 3 suspects per shot.', s=>{s.dmg=120; s.targets=3;}]],
  daniel:   [['Demolition Expert', 8000, '8 damage, huge blasts, 8 cluster bombs.', s=>{s.dmg=8; s.radius=90; s.cluster=8; s.pierce+=20;}],
             ['Total Demolition', 42000, '25 damage, enormous blasts, 12 cluster bombs.', s=>{s.dmg=25; s.radius=120; s.cluster=12; s.pierce+=40;}]],
  otis:     [['Death Star Pup', 9000, '18 damage, 80 pierce, a much wider beam.', s=>{s.dmg=18; s.pierce=80; s.width=30;}],
             ['Big Bang Bark', 45000, '50 damage, 200 pierce, fires twice as fast.', s=>{s.dmg=50; s.pierce=200; s.rate*=.5; s.width=40;}]],
  nathan:   [['Cy Young', 6500, '5 heaters per pitch, +3 damage, 30% faster.', s=>{s.shots=5; s.spread=.1; s.dmg+=3; s.rate*=.7;}],
             ['Hall of Famer', 34000, '9 homing heaters, +10 damage.', s=>{s.shots=9; s.dmg+=10; s.homing=true;}]],
  chemmy:   [['World Champion', 7000, '10 damage balls with 25 bounces.', s=>{s.dmg=10; s.bounces=25; s.bounceRange=200;}],
             ['Ping-Pong Deity', 36000, '25 damage, 50 bounces, serves twice as fast.', s=>{s.dmg=25; s.bounces=50; s.rate*=.5;}]],
  lars:     [['Diamond Drill', 6000, 'Digs $300 every 5 seconds and +4 pick damage.', s=>{s.mine={every:5, amt:300}; s.dmg+=4;}],
             ['Kingdom Under the Mountain', 30000, 'Digs $700 every 4 seconds and swings twice as fast.', s=>{s.mine={every:4, amt:700}; s.rate*=.5; s.dmg+=8;}]],
  milo:     [['Superconductor', 7500, '6 damage, 20 jumps.', s=>{s.dmg=6; s.chains=20;}],
             ['God of Thunder', 40000, '14 damage, 40 jumps, casts twice as fast.', s=>{s.dmg=14; s.chains=40; s.rate*=.5;}]],
  josh:     [['Mothership', 8000, '12 drones, +3 damage.', s=>{s.drones=12; s.dmg+=3;}],
             ['Skynet Swarm', 40000, '20 drones, +8 damage, 40% faster.', s=>{s.drones=20; s.dmg+=8; s.rate*=.6;}]],
  reshman:  [['Flash Bomber', 6500, '8 shuriken, 5 damage, stuns.', s=>{s.shots=8; s.dmg=5; s.stun=.3;}],
             ['Way of the Blob', 33000, '12 shuriken, 10 damage, +10 pierce.', s=>{s.shots=12; s.dmg=10; s.pierce+=10; s.spread=.25;}]],
  fionn:    [['Mountain Mover', 7500, '25 damage boulders with 60 pierce.', s=>{s.dmg=25; s.pierce=60;}],
             ['Continental Drift', 38000, '60 damage, 120 pierce, rolls 40% more often.', s=>{s.dmg=60; s.pierce=120; s.rate*=.6;}]],
  deniz:    [['Ice Age', 7000, '8 damage, 1.5s freeze, +30 range.', s=>{s.dmg=8; s.stun=1.5; s.range+=30;}],
             ['Eternal Winter', 35000, '20 damage, 80% slow, waves 40% more often.', s=>{s.dmg=20; s.slow=.8; s.rate*=.6;}]],
  sichen:   [['Netflix Special', 6500, 'Stuns for 2s and deals 12 damage.', s=>{s.stun=2; s.dmg=12;}],
             ['Comedy Legend', 32000, 'Stuns for 2.5s, 30 damage, +40 range.', s=>{s.stun=2.5; s.dmg=30; s.range+=40;}]],
  anna:     [['Ancient Grove', 7000, '12 damage vines, up to 8 at once.', s=>{s.dmg=12; s.patches=8;}],
             ['World Tree', 36000, '30 damage vines, up to 10, much bigger.', s=>{s.dmg=30; s.patches=10; s.radius+=20;}]],
};
for (const k in PARADISE) PARADISE[k].forEach(([name, cost, desc, f], i) =>
  TOWERS[k].paths[0].ups.push({name, cost, desc, paradise: i + 4, apply: s => { f(s); s.paradise = i + 4; }}));

// ---------- Modes ----------
// rules: allowed (hero list), noPath3, maxHeroes, maxTier, cash, lives, enemySpeed
const CHALLENGES = [
  {id:'batterUp', name:'Batter Up', icon:'⚾', desc:'Only Nathan allowed.', map:'isles', diff:'normal', rules:{allowed:['nathan']}, reward:150},
  {id:'basics', name:'Back to Basics', icon:'🔒', desc:'No Path 3 upgrades at all.', map:'quarry', diff:'hard', rules:{noPath3:true}, reward:220},
  {id:'wizards', name:'Wizards Only', icon:'🧙', desc:'Only Milo, Deniz and Otis.', map:'glacier', diff:'normal', rules:{allowed:['milo','deniz','otis']}, reward:200},
  {id:'squad5', name:'Squad of Five', icon:'5️⃣', desc:'Place at most 5 heroes.', map:'stoep', diff:'normal', rules:{maxHeroes:5}, reward:180},
  {id:'budget', name:'Budget Cuts', icon:'💸', desc:'Start with $300 and nothing past tier 2.', map:'hotel', diff:'normal', rules:{cash:300, maxTier:2}, reward:240},
  {id:'fast', name:'Fast & Furious', icon:'🏎', desc:'Enemies move 30% faster.', map:'turbo', diff:'normal', rules:{enemySpeed:1.3}, reward:260},
  {id:'glass', name:'Glass Isles', icon:'💔', desc:'One single life, even on Biscotto Breeze.', map:'isles', diff:'easy', rules:{lives:1}, reward:160},
  {id:'showtime', name:'Showtime', icon:'🎤', desc:'Only the Hundredaire cast: Chemmy, Sichen and Fionn.', map:'studio', diff:'normal', rules:{allowed:['chemmy','sichen','fionn']}, reward:350},
];
const DAILY_MODS = [
  {name:'Speedy enemies', rules:{enemySpeed:1.2}}, {name:'Rich start ($1500)', rules:{cash:1500}}, {name:'No Path 3', rules:{noPath3:true}},
  {name:'Six heroes max', rules:{maxHeroes:6}}, {name:'Tier 2 cap', rules:{maxTier:2}}, {name:'50 lives', rules:{lives:50}},
];
function seeded(str) { let h = 2166136261; for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296; }
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
function dailyChallenge() {
  const R = seeded('widrtd' + todayKey());
  const map = MAPS[Math.floor(R() * MAPS.length)], diff = ['easy', 'normal', 'hard'][Math.floor(R() * 3)];
  const pool = [...TOWER_ORDER], allowed = [];
  while (allowed.length < 4) allowed.push(pool.splice(Math.floor(R() * pool.length), 1)[0]);
  const mod = DAILY_MODS[Math.floor(R() * DAILY_MODS.length)];
  return {id: 'daily-' + todayKey(), name: 'Daily Challenge', map: map.id, diff, mod: mod.name, rules: Object.assign({allowed}, mod.rules), reward: 150};
}
// Boss Rush: every boss back to back, with escorts. Elite bosses have 2.5x health and use their tricks more often.
const BOSS_RUSH = [
  [['toro',1,0,0],['bull',20,.3,3]],
  [['zennith',1,0,0],['guard',12,.5,3]],
  [['grumble',1,0,0],['crab',15,.5,3]],
  [['byte',1,0,0],['brute',12,.6,3]],
  [['meta',1,0,0],['crow',20,.4,3]],
  [['toon',1,0,0],['ghost',30,.3,3]],
];
// Odyssey: three maps in a row with a crew of five. Lives carry over; heroes don't.
const ODYSSEY = [
  {map:'isles', waves:[0, 10], cash:650},
  {map:'quarry', waves:[10, 20], cash:2200},
  {map:'glacier', waves:[20, 30], cash:5000},
];
