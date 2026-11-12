// ===== WIDR TD: data =====
const W = 960, H = 600;

// ===== Maps =====
// Each map has one or more paths (enemies take turns between them), blockers you can't build on, and a colour theme.
// Blockers on water maps are water spots: heroes marked "water" (Otis, Guiseppe, Deniz, Josh) can be placed on them.
// Optional moving parts: vents (eruptions disable nearby heroes), doors (close and hold enemies back), tram (runs over enemies on its track).
const PATH_W = 46;
const MAPS = [
  {id:'isles', name:'Biscotto Isles', tier:'Beginner', level:1, sign:[130,560],
   blurb:'The classic. One long sandy road winding around two ponds. Otis, Guiseppe, Deniz and Josh can be placed on the water.',
   theme:{ground:'#c3e57e', ground2:'#a9d468', tuft:'#7fb24a', path:'#ffd98c', path2:'#f2b65c', dash:'#e89c3e', decor:'island', block:'water'},
   paths:[[[-40,110],[200,110],[200,290],[90,290],[90,480],[400,480],[400,190],[590,190],[590,450],[800,450],[800,130],[1000,130]]],
   blockers:[{x:290,y:335,r:46},{x:700,y:300,r:50}]},
  {id:'stoep', name:'Stoep Street', tier:'Beginner', level:1, sign:[540,560], tram:{y:300, every:16},
   blurb:"Joep's neighbourhood from RhymeRhythm. A tram crosses the street every 16 seconds and runs over anything on the tracks.",
   theme:{ground:'#f4e3c7', ground2:'#e8cfa6', tuft:'#d4b07a', path:'#ffd6a8', path2:'#f2b07a', dash:'#ffffff', decor:'town', block:'water'},
   paths:[[[-40,90],[180,90],[180,510],[420,510],[420,90],[660,90],[660,510],[880,510],[880,-40]]],
   blockers:[{x:300,y:200,r:40},{x:540,y:400,r:40},{x:780,y:200,r:40}]},
  {id:'quarry', name:'Demolition Quarry', tier:'Intermediate', level:2, sign:[820,560], vents:[{x:60,y:440},{x:380,y:230}],
   blurb:"Daniel's blast site. The road crosses itself twice, and lava vents erupt every 14 seconds, knocking out nearby heroes for 3 seconds.",
   theme:{ground:'#f6d3a0', ground2:'#e9b77a', tuft:'#c98a4a', path:'#d8c8b6', path2:'#bba793', dash:'#ffffff', decor:'quarry', block:'rock'},
   paths:[[[-40,300],[300,300],[300,80],[150,80],[150,520],[620,520],[620,150],[460,150],[460,420],[1000,420]]],
   blockers:[{x:230,y:190,r:34},{x:380,y:400,r:40},{x:780,y:250,r:45},{x:540,y:280,r:30}]},
  {id:'glacier', name:'Gelato Glacier', tier:'Intermediate', level:3, sign:[580,45], mods:{speed:1.12},
   blurb:'A long icy zigzag from top to bottom. Enemies slide 12% faster on the ice.',
   theme:{ground:'#eef6fb', ground2:'#d3e7f4', tuft:'#a9cbe3', path:'#cdebfa', path2:'#a9d6ef', dash:'#ffffff', decor:'snow', block:'ice'},
   paths:[[[120,-40],[120,470],[300,470],[300,120],[480,120],[480,470],[660,470],[660,120],[840,120],[840,640]]],
   blockers:[{x:210,y:250,r:40},{x:570,y:300,r:42},{x:390,y:545,r:34},{x:910,y:330,r:38}]},
  {id:'hotel', name:'Conference Hotel', tier:'Intermediate', level:3, sign:[300,560], doors:[{x:400,y:250},{x:800,y:300}],
   blurb:'Codename: Conference. Red-carpet corridors with two security doors that slam shut every 11 seconds and hold enemies back.',
   theme:{ground:'#f7e6d0', ground2:'#ecd3b2', tuft:'#d9b98e', path:'#ff9a9a', path2:'#e8606a', dash:'#ffd166', decor:'hotel', block:'pillar'},
   paths:[[[-40,500],[160,500],[160,100],[400,100],[400,400],[560,400],[560,100],[800,100],[800,500],[1000,500]]],
   blockers:[{x:280,y:300,r:30},{x:680,y:300,r:30},{x:480,y:520,r:30},{x:900,y:250,r:34}]},
  {id:'orbit', name:'Orbit Station', tier:'Advanced', level:4, sign:[180,560],
   blurb:'Two launch lanes. Enemies arrive from the left and from above, then merge for the final stretch.',
   theme:{ground:'#e6dff8', ground2:'#d2c6f2', tuft:'#b3a3e6', path:'#f6f8fc', path2:'#d4dbe8', dash:'#5fb8ff', decor:'space', block:'crater'},
   paths:[[[-40,150],[260,150],[260,300],[700,300],[700,450],[1000,450]], [[480,-40],[480,300],[700,300],[700,450],[1000,450]]],
   blockers:[{x:120,y:330,r:50},{x:380,y:470,r:55},{x:600,y:150,r:45},{x:850,y:250,r:50}]},
  {id:'turbo', name:'WIDR Turbo Raceway', tier:'Advanced', level:5, sign:[480,300],
   blurb:'A spiral race track that loops inward and then crosses itself on the way out.',
   theme:{ground:'#cdeaa0', ground2:'#b5dc84', tuft:'#8fc25a', path:'#dcdce6', path2:'#c3c3d2', dash:'#ffffff', decor:'race', block:'tires'},
   paths:[[[-40,520],[120,520],[120,110],[840,110],[840,490],[240,490],[240,230],[720,230],[720,370],[1000,370]]],
   blockers:[{x:480,y:170,r:30},{x:480,y:430,r:34},{x:60,y:300,r:34},{x:900,y:220,r:34}]},
  {id:'stage', name:"Toon's Stage", tier:'Expert', level:6, sign:[130,560],
   blurb:"Toon de Demoon's concert hall. The road is short, so there's very little time to pop anything.",
   theme:{ground:'#ffd6ea', ground2:'#ffb8dc', tuft:'#f08cc0', path:'#ffe9a8', path2:'#f5c84a', dash:'#e8334a', decor:'stage', block:'speaker'},
   paths:[[[-40,300],[220,300],[220,120],[480,120],[480,480],[740,480],[740,300],[1000,300]]],
   blockers:[{x:110,y:140,r:36},{x:350,y:300,r:40},{x:610,y:300,r:40},{x:870,y:480,r:36},{x:350,y:510,r:34},{x:610,y:110,r:34}]},
  {id:'studio', name:'Hundredaire Studio', tier:'Expert', level:7, sign:[400,570],
   blurb:"Chemmy's game show set. Three roads, from the left, the top and the bottom, merge into one gold carpet.",
   theme:{ground:'#d9ecff', ground2:'#c2dcf7', tuft:'#9fc3ea', path:'#ffd84d', path2:'#f0a500', dash:'#e8334a', decor:'studio', block:'podium'},
   paths:[[[-40,300],[720,300],[720,80],[880,80],[880,520],[1000,520]],
          [[260,-40],[260,170],[560,170],[560,300],[720,300],[720,80],[880,80],[880,520],[1000,520]],
          [[260,640],[260,430],[560,430],[560,300],[720,300],[720,80],[880,80],[880,520],[1000,520]]],
   blockers:[{x:130,y:170,r:34},{x:410,y:235,r:32},{x:410,y:365,r:32},{x:800,y:300,r:34},{x:130,y:430,r:34}]},
];
let MAP = MAPS[0], PATHS = [], SEGS = [], PONDS = [], GATES = [], ENTRIES = [], AIR = null, DOORS = [];
const onScreen = (p, m = 0) => p.x >= m && p.x <= W - m && p.y >= m && p.y <= H - m;
function buildPath(pts) {
  const segs = []; let len = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1,y1] = pts[i], [x2,y2] = pts[i+1], l = Math.hypot(x2-x1, y2-y1);
    segs.push({x1,y1,x2,y2,len:l,start:len}); len += l;
  }
  return {pts, segs, len};
}
function loadMap(id) {
  MAP = MAPS.find(m => m.id === id) || MAPS[0];
  PONDS = MAP.blockers;
  PATHS = MAP.paths.map(buildPath);
  SEGS = PATHS.flatMap(p => p.segs);
  // flying enemies ignore the road and go straight from the first entrance to the exit
  const P0 = MAP.paths[0]; AIR = buildPath([P0[0], P0[P0.length - 1]]);
  // entry = where the path first comes on screen, gate = just inside where it leaves
  ENTRIES = PATHS.map((P, i) => { let d = 0; while (d < P.len && !onScreen(posAt(d, i))) d += 2; return posAt(d, i); });
  GATES = PATHS.map((P, i) => { let d = P.len; while (d > 0 && !onScreen(posAt(d, i), 20)) d -= 2; return posAt(d - 30, i); });
  DOORS = (MAP.doors || []).map(dr => {
    let best = {dist: 1e9};
    PATHS.forEach((P, pi) => { for (let d = 0; d < P.len; d += 3) { const q = posAt(d, pi), dist = Math.hypot(q.x - dr.x, q.y - dr.y); if (dist < best.dist) best = {dist, pi, d, x: q.x, y: q.y, ang: q.ang}; } });
    return best;
  });
}
const pathOf = pi => pi === 'air' ? AIR : (PATHS[pi] || PATHS[0]);
function posAt(d, pi = 0) {
  const P = pathOf(pi);
  d = Math.max(0, Math.min(P.len, d));
  for (const s of P.segs) {
    if (d <= s.start + s.len) {
      const t = (d - s.start) / s.len;
      return {x: s.x1 + (s.x2-s.x1)*t, y: s.y1 + (s.y2-s.y1)*t, ang: Math.atan2(s.y2-s.y1, s.x2-s.x1)};
    }
  }
  const s = P.segs[P.segs.length-1];
  return {x:s.x2, y:s.y2, ang:Math.atan2(s.y2-s.y1, s.x2-s.x1)};
}
function distToSeg(px,py,s) {
  const dx = s.x2-s.x1, dy = s.y2-s.y1;
  let t = ((px-s.x1)*dx + (py-s.y1)*dy) / (dx*dx+dy*dy);
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px-(s.x1+dx*t), py-(s.y1+dy*t));
}
loadMap('isles');

// ===== Enemies: Grumbleclaw's army, Toon's ghosts and a few new threats =====
// frozen: only blast, energy and magic hurt it · fly: ignores the road, only heroes with air reach can hit it
// regrow: heals over time · heal: patches up nearby enemies · shield: blocks hits from the front
const ENEMIES = {
  bit:    {name:'Biscotto Bit',  hp:1,   speed:70,  reward:2,  leak:1,   r:11, color:'#ff5a4e', shape:'blob'},
  gelato: {name:'Gelato Blob',   hp:2,   speed:98,  reward:3,  leak:2,   r:12, color:'#7ad3ff', shape:'drip'},
  bull:   {name:'Toro Calf',     hp:4,   speed:150, reward:4,  leak:3,   r:13, color:'#c9853f', shape:'bull'},
  sprout: {name:'Biscotto Sprout', hp:5, speed:80,  reward:4,  leak:2,   r:12, color:'#8fd14f', shape:'sprout', regrow:1.5},
  crab:   {name:'Shell Crab',    hp:10,  speed:50,  reward:6,  leak:6,   r:16, color:'#ff8a3d', shape:'crab', armor:1},
  ghost:  {name:'Ghost Note',    hp:3,   speed:92,  reward:4,  leak:3,   r:12, color:'#c7b8ff', shape:'ghost', camo:true},
  icegel: {name:'Frozen Gelato', hp:7,   speed:68,  reward:6,  leak:4,   r:14, color:'#bfe9f9', shape:'icegel', frozen:true},
  crow:   {name:'Grumble Crow',  hp:5,   speed:105, reward:5,  leak:4,   r:13, color:'#5d4f73', shape:'crow', fly:true},
  brute:  {name:'Grumble Brute', hp:14,  speed:55,  reward:8,  leak:12,  r:19, color:'#7fbf4d', shape:'brute', children:['gelato','gelato','gelato']},
  medic:  {name:'Grumble Medic', hp:12,  speed:55,  reward:9,  leak:8,   r:16, color:'#f6f6f6', shape:'medic', heal:{every:3, r:95, amt:4}},
  guard:  {name:'Toro Guard',    hp:10,  speed:72,  reward:8,  leak:6,   r:15, color:'#b97a3a', shape:'guard', shield:true},
  bot:    {name:'Meta Bot',      hp:8,   speed:120, reward:4,  leak:4,   r:11, color:'#9fe3ff', shape:'bot', fly:true},
  toro:   {name:'TORO FERRO',    hp:450, speed:40,  reward:120,leak:100, r:30, color:'#8a5a2b', shape:'toro', armor:2, boss:true},
  zennith:{name:'ZENNITH',       hp:2400,speed:34,  reward:300,leak:250, r:34, color:'#ff6a3d', shape:'zennith', armor:2, boss:true, special:{kind:'disable', every:6, dur:3, n:2}},
  grumble:{name:'KING GRUMBLECLAW',hp:1400,speed:30,reward:250,leak:200, r:36, color:'#3fa36b', shape:'king', armor:3, boss:true, spawn:{type:'crab',every:6,n:2}},
  byte:   {name:'BYTE MECH',     hp:3400,speed:28,  reward:350,leak:300, r:38, color:'#8c9ab5', shape:'byte', armor:3, boss:true, special:{kind:'phase'}},
  meta:   {name:'META AI',       hp:4600,speed:30,  reward:400,leak:400, r:36, color:'#5f7cff', shape:'metaai', armor:2, boss:true, spawn:{type:'bot',every:5,n:3}, special:{kind:'shield', every:10, dur:3}},
  toon:   {name:'TOON DE DEMOON',hp:4200,speed:26,  reward:0,  leak:999, r:42, color:'#e8334a', shape:'octo', armor:2, boss:true, spawn:{type:'ghost',every:4.5,n:3}},
};

// ===== Waves: [type, count, gap(s), delay(s)] =====
const WAVES = [
  [['bit',20,.6,0]],
  [['bit',30,.45,0]],
  [['bit',20,.5,0],['gelato',8,.7,3]],
  [['gelato',25,.4,0]],
  [['bit',30,.25,0],['gelato',12,.5,4]],
  [['bull',10,.8,0],['gelato',20,.35,2]],
  [['crab',6,1.2,0],['bit',30,.2,1]],
  [['sprout',15,.6,0],['bull',10,.6,3]],
  [['ghost',12,.6,0],['gelato',20,.3,2]],
  [['brute',4,2,0],['bull',20,.35,3]],
  [['icegel',10,.8,0],['crab',8,.9,2]],
  [['ghost',15,.45,0],['sprout',20,.35,1]],
  [['crow',12,.7,0],['gelato',30,.2,2]],
  [['bit',60,.12,0],['gelato',30,.2,4]],
  [['toro',1,0,0],['bull',20,.4,4]],
  [['crab',20,.6,0],['ghost',20,.4,1],['crow',10,.6,4]],
  [['medic',5,1.5,0],['brute',10,.9,1]],
  [['ghost',40,.25,0],['icegel',12,.6,3]],
  [['guard',15,.6,0],['crab',15,.6,2]],
  [['zennith',1,0,0],['bull',30,.25,3]],
  [['crab',30,.4,0],['ghost',30,.3,1],['crow',15,.5,3]],
  [['brute',20,.6,0],['medic',8,1,2],['gelato',40,.1,4]],
  [['bull',50,.15,0],['guard',20,.45,2]],
  [['brute',30,.5,0],['ghost',30,.3,1],['icegel',20,.4,3]],
  [['grumble',1,0,0],['crab',20,.6,3]],
  [['crab',40,.3,0],['ghost',40,.25,1],['crow',25,.35,3]],
  [['byte',1,0,0],['brute',30,.4,3]],
  [['bull',80,.1,0],['ghost',40,.15,1],['guard',25,.35,3]],
  [['meta',1,0,0],['grumble',1,0,12],['brute',40,.35,3]],
  [['toon',1,0,0],['ghost',50,.3,4],['crab',30,.5,8],['crow',30,.4,10]],
];

// ===== Towers: the WIDR 64 cast =====
// Each upgrade's apply() mutates the computed stats object.
const TOWERS = {
  guiseppe: {
    name:'Guiseppe', from:'The Guiseppe Game', role:'Fruit Flinger', cost:200, key:'1', color:'#ff4d3d',
    blurb:'Hurls Italian fruit at whatever comes first.',
    base:{range:120, rate:.9, dmg:1, pierce:2, kind:'fruit', shots:1, spread:0, speed:620},
    paths:[
      {name:'Triple Flip', ups:[
        {name:'Triple Toss', cost:140, desc:'Throws 3 fruit in a fan.', apply:s=>{s.shots=3; s.spread=.22;}},
        {name:'Lemon Zest', cost:280, desc:'Sour lemons: +3 pierce, +1 damage.', apply:s=>{s.pierce+=3; s.dmg+=1; s.fruit='lemon';}},
        {name:'Fruit Frenzy', cost:1150, desc:'Erupts 12 fruit in every direction.', apply:s=>{s.shots=12; s.spread='ring'; s.rate*=.75; s.pierce+=2;}},
      ]},
      {name:'Sharp Eye', ups:[
        {name:'Long Arms', cost:100, desc:'+30 range.', apply:s=>{s.range+=30;}},
        {name:'Espresso Shot', cost:240, desc:'Throws 40% faster.', apply:s=>{s.rate*=.6;}},
        {name:'Watermelon Mode', cost:1400, desc:'Giant melons: +3 damage, +4 pierce.', apply:s=>{s.dmg+=3; s.pierce+=4; s.fruit='melon'; s.size=1.8;}},
      ]},
    ]},
  julie: {
    name:'Julie', from:'Codename: Conference', role:'Pear Detective', cost:350, key:'2', color:'#ffcf3a',
    blurb:'Snipes anywhere on the map. Spots ghosts.',
    base:{range:2000, rate:1.6, dmg:2, pierce:1, kind:'snipe', camo:true, targets:1},
    paths:[
      {name:'Pear Pressure', ups:[
        {name:'Ripe Pears', cost:300, desc:'4 damage per pear.', apply:s=>{s.dmg=4;}},
        {name:'Stunning Deduction', cost:450, desc:'Pears stun for 0.5s.', apply:s=>{s.stun=.5;}},
        {name:'Golden Pear', cost:2400, desc:'18 damage, 1s stun, double vs bosses.', apply:s=>{s.dmg=18; s.stun=1; s.bossMult=2; s.golden=true;}},
      ]},
      {name:'Case Closed', ups:[
        {name:'Night Shift', cost:250, desc:'Fires 30% faster.', apply:s=>{s.rate*=.7;}},
        {name:'Sidekick Sichen', cost:520, desc:'Hits 2 suspects per shot.', apply:s=>{s.targets=2;}},
        {name:'Full Investigation', cost:2600, desc:'Fires 3x as fast.', apply:s=>{s.rate*=.33;}},
      ]},
    ]},
  daniel: {
    name:'Daniel', from:'Demolition Run', role:'Demolitionist', cost:500, key:'3', color:'#5a5a6e',
    blurb:'Lobs bombs. Explosions crack armor.',
    base:{range:135, rate:1.4, dmg:1, pierce:18, kind:'bomb', radius:48, speed:380},
    paths:[
      {name:'Bigger Boom', ups:[
        {name:'Bigger Charges', cost:300, desc:'Bigger blast radius.', apply:s=>{s.radius=66; s.pierce+=10;}},
        {name:'Double Payload', cost:650, desc:'Blasts deal 3 damage.', apply:s=>{s.dmg=3;}},
        {name:'Cluster Strike', cost:2800, desc:'Every bomb splits into 6 more.', apply:s=>{s.cluster=6;}},
      ]},
      {name:'Blink Ring', ups:[
        {name:'Blink Ring', cost:260, desc:'Throws 25% faster, +15 range.', apply:s=>{s.rate*=.75; s.range+=15;}},
        {name:'Shockwave', cost:600, desc:'Blasts stun for 0.4s.', apply:s=>{s.stun=.4;}},
        {name:'Classified Nuke', cost:3500, desc:'Huge 10 damage blasts, triple vs bosses.', apply:s=>{s.dmg=10; s.bossMult=3; s.radius=Math.max(s.radius,90); s.rate*=1.4; s.nuke=true;}},
      ]},
    ]},
  otis: {
    name:'Otis', from:'Otis in Orbit', role:'Space Dog', cost:650, key:'4', color:'#3fc1c9',
    blurb:'Good boy with a laser. Pierces and ignores armor.',
    base:{range:150, rate:1.1, dmg:2, pierce:6, kind:'laser', width:10},
    paths:[
      {name:'Laser', ups:[
        {name:'Focused Lens', cost:400, desc:'3 damage, +4 pierce.', apply:s=>{s.dmg=3; s.pierce+=4;}},
        {name:'Overcharge', cost:900, desc:'Fires 45% faster.', apply:s=>{s.rate*=.55;}},
        {name:'Supernova Beam', cost:4000, desc:'7 damage mega-beam, 40 pierce.', apply:s=>{s.dmg=7; s.pierce=40; s.rate*=.5; s.width=22; s.nova=true;}},
      ]},
      {name:'Gravity', ups:[
        {name:'Zero-G Field', cost:300, desc:'Beam slows enemies 35%.', apply:s=>{s.slow=.35;}},
        {name:'Deep Space Radar', cost:500, desc:'Detects ghosts, +30 range.', apply:s=>{s.camo=true; s.range+=30;}},
        {name:'Black Hole', cost:3000, desc:'Every 7s yanks enemies back along the path.', apply:s=>{s.blackhole=7;}},
      ]},
    ]},
  nathan: {
    name:'Nathan', from:'Wat in de Combat', role:'Baseball Star', cost:250, key:'5', color:'#2f6fe0',
    blurb:'Fast fastballs at a single target.',
    base:{range:130, rate:.55, dmg:1, pierce:1, kind:'ball', speed:900},
    paths:[
      {name:'Fastball', ups:[
        {name:'Curveball', cost:180, desc:'Pitches curve to chase their target.', apply:s=>{s.homing=true; s.pierce+=1;}},
        {name:'Heater', cost:400, desc:'Pitches 40% faster.', apply:s=>{s.rate*=.6;}},
        {name:'Perfect Game', cost:2300, desc:'Throws 3 heaters at once, 2 damage each.', apply:s=>{s.shots=3; s.spread=.12; s.dmg+=1; s.rate*=.8;}},
      ]},
      {name:'Slugger', ups:[
        {name:'Line Drive', cost:220, desc:'+2 damage, +2 pierce.', apply:s=>{s.dmg+=2; s.pierce+=2;}},
        {name:'Grand Slam', cost:600, desc:'25% chance to crit for 4x damage.', apply:s=>{s.crit=.25;}},
        {name:'Home Run Derby', cost:2700, desc:'Every 5th swing hits a Home Run: 25 damage, knocks enemies back.', apply:s=>{s.homerun=5;}},
      ]},
    ]},
  chemmy: {
    name:'Chemmy', from:'Who Wants to Be a Hundredaire?', role:'Table Tennis Champ', cost:400, key:'6', color:'#ff8a1f',
    blurb:'Ping-pong balls bounce from enemy to enemy.',
    base:{range:125, rate:.8, dmg:1, kind:'pong', bounces:3, bounceRange:120, speed:720},
    paths:[
      {name:'Topspin', ups:[
        {name:'Smash', cost:250, desc:'Balls deal 2 damage.', apply:s=>{s.dmg=2;}},
        {name:'Topspin', cost:500, desc:'+4 bounces, longer jumps.', apply:s=>{s.bounces+=4; s.bounceRange=160;}},
        {name:'Championship Rally', cost:2500, desc:'4 damage, 14 bounces, 2x as fast.', apply:s=>{s.dmg=4; s.bounces=14; s.rate*=.5; s.rally=true;}},
      ]},
      {name:'Game Show Host', ups:[
        {name:'Quick Reflexes', cost:220, desc:'Serves 30% faster.', apply:s=>{s.rate*=.7;}},
        {name:'Ask the Audience', cost:450, desc:'Sees ghosts, +25 range.', apply:s=>{s.camo=true; s.range+=25;}},
        {name:'Hundredaire Jackpot', cost:2200, desc:'+$99 every wave, and balls stun for 0.3s. (D: Toast)', apply:s=>{s.jackpot=99; s.stun=.3;}},
      ]},
    ]},
};
const TOWER_ORDER = ['guiseppe','julie','daniel','otis','nathan','chemmy'];
const MAX_TIER = 3, OTHER_MAX = 2; // 3-2-0: one path to 3, a second to 2, the third stays at 0

// Main hero levels (like BTD6 heroes): XP needed to reach each level, 1 to 10
const HERO_XP = [0, 40, 100, 180, 280, 400, 550, 730, 950, 1200];
const heroLevel = xp => HERO_XP.filter(x => xp >= x).length;

function computeStats(t) {
  const def = TOWERS[t.type];
  const s = Object.assign({}, def.base);
  for (let p = 0; p < def.paths.length; p++)
    for (let i = 0; i < (t.tiers[p] || 0); i++) def.paths[p].ups[i].apply(s);
  if (t.main) applyHeroLevel(s, t.type, heroLevel(t.hxp || 0));
  return s;
}
// every level adds damage, speed and range; level 5 sees ghosts, level 7 gets the Path 3 ability for free, level 10 inspires nearby heroes
function applyHeroLevel(s, type, lv) {
  const k = lv - 1;
  if (s.dmg) s.dmg = +(s.dmg * (1 + k * .07)).toFixed(2);
  if (s.rate) s.rate /= 1 + k * .05;
  if (s.range && s.range < 1000) s.range *= 1 + k * .02;
  if (lv >= 5) s.camo = true;
  if (lv >= 7 && !s.ability) {
    const tmp = {income: 0, aura: {r: 130}, rate: 1, shots: 1};
    try { TOWERS[type].paths[2].ups[2].apply(tmp); } catch (e) {}
    if (tmp.ability) s.ability = tmp.ability;
  }
  if (lv >= 10) s.aura = Object.assign({r: 150}, s.aura || {}, {rate: Math.max((s.aura && s.aura.rate) || 0, .15)});
  s.heroLv = lv;
}

// ===== Difficulty =====
const DIFFS = {
  easy:   {name:'Biscotto Breeze', tag:'EASY',   color:'#7be36b', lives:200, cash:800, cost:.85, hp:.8,  speed:.95, xp:.8, reward:40,  blurb:'200 lives, $800 to start, 15% cheaper heroes, softer enemies.'},
  normal: {name:'Isle Defender',   tag:'NORMAL', color:'#ffcc29', lives:150, cash:650, cost:1,   hp:1,   speed:1,   xp:1,  reward:70,  blurb:'150 lives, $650. The way it was meant to be popped.'},
  hard:   {name:'Grumble Mode',    tag:'HARD',   color:'#ff8a3d', lives:100, cash:600, cost:1.1, hp:1.2, speed:1.08,xp:1.3,reward:120, blurb:'100 lives, pricier heroes, tougher and faster enemies.'},
  demoon: {name:'Toon de Demoon',  tag:'EXTREME',color:'#e8334a', lives:1,   cash:650, cost:1.2, hp:1.35,speed:1.12,xp:1.6,reward:250, blurb:'1 life. A single leak and the map is lost. Good luck.'},
};
const DIFF_ORDER = ['easy','normal','hard','demoon'];
let DIFF = DIFFS.normal;
const price = c => Math.round(c * DIFF.cost / 5) * 5;

// ===== Third paths: each ends in an ability you trigger yourself =====
const PATH3 = {
  guiseppe: {name:'Orchard', ups:[
    {name:'Fruit Stand', cost:250, desc:'Sells spare fruit: +$40 at the end of every wave.', apply:s=>{s.income=(s.income||0)+40;}},
    {name:'Apple Orchard', cost:700, desc:'+$110 per wave instead, and throws 15% faster.', apply:s=>{s.income=(s.income||0)+70; s.rate*=.85;}},
    {name:'Fruit Salad Rain', cost:2400, desc:'ABILITY: fruit rains on every enemy on the map for 6 damage each.', apply:s=>{s.ability={id:'fruitRain', name:'Fruit Salad Rain', icon:'🍎', cd:40}; s.income+=40;}},
  ]},
  julie: {name:'Undercover', ups:[
    {name:'Magnifying Glass', cost:300, desc:'Heroes near Julie can see ghosts.', apply:s=>{s.aura=Object.assign(s.aura||{r:130},{camo:true});}},
    {name:'Expose Weakness', cost:750, desc:'Pears strip armor off enemies for good. Other heroes then hit them at full damage.', apply:s=>{s.strip=true;}},
    {name:'Interpol Raid', cost:2800, desc:'ABILITY: stuns every enemy on the map (bosses briefly) and deals 10 damage.', apply:s=>{s.ability={id:'raid', name:'Interpol Raid', icon:'🚨', cd:50};}},
  ]},
  daniel: {name:'Demolition Run', ups:[
    {name:'Hazard Pay', cost:300, desc:'+$1 for every enemy Daniel finishes off.', apply:s=>{s.bounty=1;}},
    {name:'Breach Charge', cost:800, desc:'Triple damage against armored enemies.', apply:s=>{s.armorMult=3;}},
    {name:'Airstrike', cost:3200, desc:'ABILITY: 8 huge blasts land on the enemies closest to the gate.', apply:s=>{s.ability={id:'airstrike', name:'Airstrike', icon:'✈️', cd:45};}},
  ]},
  otis: {name:'Good Boy', ups:[
    {name:'Fetch!', cost:250, desc:'Otis fetches loose coins: +$30 per wave.', apply:s=>{s.income=(s.income||0)+30;}},
    {name:'Zoomies', cost:900, desc:'Heroes near Otis attack 20% faster.', apply:s=>{s.aura=Object.assign(s.aura||{r:130},{rate:.2});}},
    {name:'Moon Bark', cost:3000, desc:'ABILITY: a bark from orbit hits every enemy for 20 damage and slows them.', apply:s=>{s.ability={id:'moonBark', name:'Moon Bark', icon:'🌕', cd:50};}},
  ]},
  nathan: {name:'Team Captain', ups:[
    {name:'Pep Talk', cost:250, desc:'Heroes near Nathan attack 10% faster.', apply:s=>{s.aura=Object.assign(s.aura||{r:130},{rate:.1});}},
    {name:'Scouting Report', cost:500, desc:'Nathan and nearby heroes can see ghosts.', apply:s=>{s.aura.camo=true; s.camo=true;}},
    {name:'Seventh-Inning Stretch', cost:2600, desc:'ABILITY: every hero on the map attacks twice as fast for 8 seconds.', apply:s=>{s.ability={id:'stretch', name:'Seventh-Inning Stretch', icon:'⚾', cd:55};}},
  ]},
  chemmy: {name:'Retired Champ', ups:[
    {name:'Training Camp', cost:300, desc:'Heroes near Chemmy get +15% range.', apply:s=>{s.aura=Object.assign(s.aura||{r:130},{range:.15});}},
    {name:'Trophy Cabinet', cost:650, desc:'Prize money: +$75 per wave.', apply:s=>{s.income=(s.income||0)+75;}},
    {name:'Lightning Round', cost:2500, desc:'ABILITY: for 8 seconds Chemmy serves 5x as fast with +6 bounces.', apply:s=>{s.ability={id:'lightning', name:'Lightning Round', icon:'⚡', cd:40};}},
  ]},
};
for (const k in PATH3) TOWERS[k].paths.push(PATH3[k]);

// ===== Freeplay: endless waves after 30 =====
const FREE_POOL = ['bull','crab','ghost','brute','icegel','crow','medic','guard','sprout'];
const FREE_BOSSES = ['grumble','zennith','byte','meta','toon'];
function getWave(n) {
  if (n < WAVES.length) return WAVES[n];
  const k = n - WAVES.length + 1, mult = 1 + k * .25;
  const pool = [0, 1, 2, 3].map(i => FREE_POOL[(k * 2 + i * 3) % FREE_POOL.length]);
  const w = pool.map((t, i) => [t, Math.round((20 + k * 4) * (t === 'brute' || t === 'medic' ? .6 : 1)), Math.max(.06, .3 - k * .01), i * 1.5]);
  if (k % 5 === 0) w.unshift([FREE_BOSSES[(k / 5 - 1) % FREE_BOSSES.length], 1 + Math.floor(k / 25), 6, 0]);
  else if (k % 5 === 3) w.unshift(['toro', 1 + Math.floor(k / 5), 4, 0]);
  w.hpMult = mult;
  return w;
}
