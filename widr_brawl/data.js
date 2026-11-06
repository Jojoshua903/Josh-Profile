// Half map: 13 columns (last = centre column), 17 rows (last = centre row). Mirrored both ways.
// '#' wall (breakable by big blasts) · 'b' bush (hide) · 'w' water (blocks walking, not shots)
const HALF = [
  ".............",
  "..bb.........",
  "..bb...##....",
  "......###....",
  "#............",
  "##...bbb.....",
  "....bbbb..#..",
  "..........#..",
  "...##........",
  "...##...bb...",
  ".......bbb...",
  "bb...........",
  "bbb...##.....",
  "......#......",
  "..ww.........",
  "..ww....b....",
  "............."
];

// Knockout: smaller 3v3 arena. 13 columns (last = centre), 12 rows (last = centre). Mirrored both ways.
const KO_HALF = [
  ".............",
  ".............",
  "..bb....##...",
  "..bb....##...",
  "#............",
  "##...ww......",
  ".....ww..bb..",
  "...b.....bb..",
  "..bbb...#....",
  "........#....",
  "...##........",
  "...##....bbb."
];

// Showdown: big square free-for-all arena. 16 columns, 16 rows (last of each = centre). Mirrored both ways.
// 'c' = power cube box: breaks after enough damage and drops a power cube.
const SD_QUARTER = [
  "................",
  ".bbb......c.....",
  ".bb...##........",
  "......##...bb...",
  "..c........bb...",
  "....###.........",
  "....#.....c....#",
  ".bb....bb......#",
  ".bb....bb...#...",
  "...c........#...",
  "......ww........",
  "..##..ww...c....",
  "..##........bb..",
  "........##..bb..",
  "...c....##......",
  "...........c...."
];

const MODES = {
  gem:      {label:'Gem Grab', emoji:'💎', desc:'3v3 · hold 10 gems for 12 seconds to win'},
  knockout: {label:'Knockout', emoji:'💀', desc:'3v3 · no respawns · first team to win 2 rounds'},
  showdown: {label:'Showdown', emoji:'☠️', desc:'Solo · 10 brawlers · break boxes for power cubes · last one standing'}
};

const BRAWLERS = [
  {id:'josh', name:'Josh', role:'Star Pilot', emoji:'⭐', color:'#ffd23f', hp:3600, spd:255, reload:1.3, range:650, pspd:950, superCost:4200, r:24,
   from:'Star Josh', atk:'Rapid burst of 3 star bolts', sup:'Charged Star: a homing super shot'},
  {id:'nathan', name:'Nathan', role:'The Slugger', emoji:'⚾', color:'#ff9a62', hp:4800, spd:280, reload:1.1, range:140, pspd:0, superCost:4000, r:25,
   from:'Star Josh', atk:'Bat swing with huge knockback', sup:'Home Run: piercing ball that smashes walls'},
  {id:'daniel', name:'Daniel', role:'Demolitions', emoji:'💣', color:'#a3c94f', hp:3200, spd:245, reload:1.6, range:460, pspd:0, superCost:3800, r:24,
   from:'Demolition Run', atk:'Lobs C4 over walls', sup:'Big Boom: blasts walls to rubble'},
  {id:'reshman', name:'Reshman', role:'The "Ninja"', emoji:'🥷', color:'#8a8fb3', hp:3400, spd:290, reload:1.2, range:520, pspd:850, superCost:4000, r:23,
   from:'Demolition Run', atk:'Fan of 3 shuriken', sup:'Blink: slicing dash, then vanish'},
  {id:'guiseppe', name:'Guiseppe', role:'Fruit Hero', emoji:'🍅', color:'#ff6b6e', hp:4200, spd:260, reload:1.35, range:600, pspd:700, superCost:4000, r:25,
   from:'The Guiseppe Game', atk:'Splashing tomato toss', sup:'Ground Pound: leap, slam, stun'},
  {id:'otis', name:'Otis', role:'Lost Cosmonaut', emoji:'🍪', color:'#86d6ff', hp:3600, spd:255, reload:1.3, range:720, pspd:650, superCost:4000, r:24,
   from:'Otis in Orbit', atk:'Cosmic cookies that bounce off walls', sup:'Gravity Well: sucks enemies in'},
  {id:'grumble', name:'Grumbleclaw', role:'Crab King', emoji:'🦀', color:'#ee6a4c', hp:7000, spd:230, reload:1.5, range:330, pspd:900, superCost:4800, r:30,
   from:'The Guiseppe Game', atk:'Point blank claw snaps', sup:'Shockwave: ring that shatters walls'},
  {id:'milo', name:'Milo', role:'Signal Sniper', emoji:'📡', color:'#bb97ff', hp:3000, spd:250, reload:1.7, range:860, pspd:1500, superCost:3600, r:23,
   from:'Otis in Orbit', atk:'Piercing long range laser', sup:'Signal Boost: heal allies, zap foes'},
  {id:'joep', name:'Joep', role:'Beat Maker', emoji:'🎤', color:'#ffb4d9', hp:4000, spd:260, reload:1.25, range:400, pspd:800, superCost:4000, r:24,
   from:'RhymeRhythm', atk:'Wide sound wave that hits everyone in it', sup:'Drop the Beat: speaker that fires notes'},
  {id:'cas', name:'Cas', role:'Pancake Pro', emoji:'🥞', color:'#f4c06a', hp:3800, spd:265, reload:1.2, range:440, pspd:750, superCost:4000, r:24,
   from:'RhymeRhythm', atk:'Pancake that flies out and comes back', sup:'Syrup Spill: sticky puddle that slows'},
  {id:'luur', name:'Luur', role:'Bowling Ace', emoji:'🎳', color:'#7fd4b0', hp:4100, spd:275, reload:1.45, range:620, pspd:600, superCost:3800, r:24,
   from:'RhymeRhythm', atk:'Heavy bowling ball that bounces once', sup:'Marathon: sprint, heal and reload fast'},
  {id:'toon', name:'Toon de Demoon', role:'The Villain', emoji:'🌙', color:'#5b5f9e', hp:4600, spd:250, reload:1.3, range:640, pspd:700, superCost:4200, r:26,
   from:'RhymeRhythm', atk:'Two crescents that curve and cross', sup:'Eclipse: three moons orbit and slam foes'},
  {id:'maat', name:'Maat met Zinkfosfaat', role:'Lab Mentor', emoji:'🧪', color:'#b4e86a', hp:3300, spd:250, reload:1.5, range:500, pspd:0, superCost:3600, r:23,
   from:'RhymeRhythm', atk:'Fizzing flask that also heals allies', sup:'Healing Lab: big zone that heals the team'}
];

// Global range tuning: every projectile and throw reaches 80% as far. Nathan's bat swing is melee and stays as is.
const RANGE = 0.8;
for (const b of BRAWLERS) if (b.id !== 'nathan') b.range = Math.round(b.range * RANGE);

const META_AI = [
  "It looks like you're hiding in a bush. Would you like me to summarize the bush?",
  "Fun fact: gems are not edible. Please do not eat the gems.",
  "I noticed Grumbleclaw is a crab. Would you like some seafood recipes?",
  "You got hit. Have you considered simply not getting hit?",
  "Daniel is blowing up walls again. Shall I file a building permit?",
  "Reminder: Reshman is not a real ninja. Probably.",
  "I can generate an image of you winning. Want that instead?",
  "Guiseppe has been added to the group chat 'Italian Fruits'.",
  "Otis asked me for directions home. I sent him to Lidl.",
  "Nathan's bat is not an approved kitchen utensil."
];
