'use strict';
/* ---------- helpers ---------- */
const INK = '#1d1a2f';
const rnd = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(rnd(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

/* ---------- playable trick-or-treaters (from the WIDR roster) ---------- */
// stats: [speed, courage, charm, brains, luck]
const HEROES = [
 {id:'nathan', name:'Nathan', title:'Baseball Slugger', color:'#ff3b3b', shirt:'#ffffff', cap:'#ff3b3b', icon:'⚾', stats:[3,4,3,2,3],
  desc:'The main character. A big-swinging slugger who never backs down from a pitch.',
  ab:{name:'Home Run', kind:'autowin', n:2, icon:'⚾', desc:'Smash any challenge for an instant win.'}, passive:'Main character energy: +1 candy at every door.'},
 {id:'ash', name:'Ash', title:'Little Pitcher', color:'#3c8dff', hair:'#5a3416', cap:'#3c8dff', icon:'🥎', stats:[5,2,4,2,3],
  desc:'Nathan’s little brother. Small, quick, and throws a fastball faster than a kart.',
  ab:{name:'Fastball Sprint', kind:'speed', n:3, icon:'🥎', desc:'12 seconds of top speed.'}, passive:'Small and quick: Anker Vos chases him slower.'},
 {id:'josh', name:'Josh', title:'Tech Whiz', color:'#607d8b', hair:'#2a1a0a', glasses:true, icon:'🛸', stats:[3,3,3,5,2],
  desc:'Tech whiz who never goes anywhere without his drone. Renas’s big brother.',
  ab:{name:'Drone Scout', kind:'reveal', n:3, icon:'🛸', desc:'Drone reveals what every house is hiding for 40s.'}, passive:'Drone always peeks at houses close by.'},
 {id:'renas', name:'Renas', title:'Gadget Kid', color:'#ffb02e', hair:'#2a1a0a', icon:'🎒', stats:[3,3,4,3,4],
  desc:'Josh’s little brother. His backpack is full of half-finished inventions.',
  ab:{name:'Random Gadget', kind:'gadget', n:4, icon:'🎒', desc:'Pulls a random gadget: boost, shield, freeze, scan or item.'}, passive:'Starts the night with a mystery gadget.'},
 {id:'daniel', name:'Daniel', title:'Demolition Bomber', color:'#ff7a1f', cap:'#ffd23f', icon:'💣', stats:[3,5,2,3,3],
  desc:'Demolition expert. If it’s in his way, it’s coming down.',
  ab:{name:'Demolition Bomb', kind:'blast', n:2, icon:'💣', r:280, desc:'Blasts nearby pests away and pops open dark houses.'}, passive:'Army-tough: jump scares hit half as hard.'},
 {id:'dean', name:'Dean', title:'Breakdancer Gamer', color:'#8a5cff', cap:'#1fb5a6', headphones:true, icon:'🌀', stats:[4,3,4,3,3],
  desc:'Breakdancer by day, top-ranked gamer by night. Perfect reflexes, smooth moves.',
  ab:{name:'Windmill', kind:'blast', n:3, icon:'🌀', r:180, speed:true, desc:'Spins pests away and gets a quick boost.'}, passive:'Rhythm battles are easier.'},
 {id:'deniz', name:'Deniz', title:'Ice Wizard', color:'#4fa8e8', hair:'#eaf6ff', wizard:'#2f7bff', icon:'❄️', stats:[3,4,3,4,2],
  desc:'A frost wizard who never slips. Icy roads feel like normal tarmac to him.',
  ab:{name:'Blizzard', kind:'freeze', n:2, icon:'❄️', desc:'Freezes every pest on the street for 15s.'}, passive:'Never slips: storms don’t slow him down.'},
 {id:'dih', name:'Dih', title:'Cheeky Worm', color:'#ff9ab0', kind:'worm', icon:'🪱', stats:[4,2,5,1,4],
  desc:'A cheeky little worm with a big grin. Light as a feather and impossible to pin down.',
  ab:{name:'Burrow', kind:'ghost', n:3, icon:'🪱', desc:'Digs underground: untouchable and fast for 9s.'}, passive:'Tiny: Meta AI has trouble finding him.'},
 {id:'enno', name:'Enno', title:'The Mathematician', color:'#1fb5a6', hair:'#8a7a6a', glasses:true, icon:'📐', stats:[2,3,2,5,3],
  desc:'Calculates the perfect racing line in his head. Every corner is just geometry.',
  ab:{name:'Perfect Line', kind:'autowin', n:2, icon:'📐', desc:'Solve any challenge perfectly: instant win.'}, passive:'+5 seconds on every timed puzzle.'},
 {id:'fionn', name:'Fionn', title:'Irish Geologist', color:'#2f9a46', beard:'#e0661f', cap:'#6b7a4a', icon:'🪨', stats:[2,4,3,4,4],
  desc:'An Irish geologist who knows every rock by name, and how hard each one hits.',
  ab:{name:'Boulder Toss', kind:'blast', n:2, icon:'🪨', r:320, desc:'Rolls a boulder through every pest nearby.'}, passive:'Sturdy: storms don’t slow him down.'},
 {id:'guiseppe', name:'Guiseppe', title:'Sentient Apple', color:'#e0201f', kind:'apple', icon:'🍎', stats:[3,3,5,2,3],
  desc:'A sentient apple with a magnificent mustache. He even has his own video game, and he’ll remind you.',
  ab:{name:'It’s-a My Game!', kind:'autowin', n:2, icon:'🍎', desc:'His game, his rules: instant win on any challenge.'}, passive:'Houses handing out apples? “That’s my cousin!” Bonus candy.'},
 {id:'adam', name:'Adam', title:'Tennis Ace', color:'#8fd400', shirt:'#ffffff', hair:'#7a4a24', band:'#2fbf71', icon:'🎾', stats:[4,3,3,3,3],
  desc:'A tennis ace with a lightning backhand. He can return anything, even cannonballs.',
  ab:{name:'Return Shot', kind:'shield', n:3, icon:'🎾', desc:'Racket up: blocks the next 2 thefts or frights.'}, passive:'Starts the night with a shield already up.'},
 {id:'lars', name:'Lars', title:'Dwarf Miner', color:'#8b5a2b', beard:'#5a3416', cap:'#d9a441', wide:1.25, icon:'⛏️', stats:[2,4,2,3,3],
  desc:'A stout dwarf miner. Short, wide and as solid as the mountains he digs through.',
  ab:{name:'Mine Cart Rush', kind:'ghost', n:2, icon:'⛏️', desc:'Charges like a runaway mine cart: fast and untouchable.'}, passive:'Huge sack: carries 30 extra pieces.'},
 {id:'milo', name:'Milo', title:'Lightning Wizard', color:'#5a3dff', hair:'#ffe066', wizard:'#3a2a8a', icon:'⚡', stats:[5,3,2,3,2],
  desc:'A storm-calling wizard. Fastest legs on the street, a little wild in the corners.',
  ab:{name:'Thunderstrike', kind:'blast', n:2, icon:'⚡', r:900, desc:'Lightning zaps every pest on screen.'}, passive:'Thunderstorms give him a speed boost instead.'},
 {id:'robin', name:'Robin', title:'Big Crybaby', color:'#b388ff', hair:'#e0a060', wide:1.25, cry:true, icon:'😭', stats:[2,1,5,2,3],
  desc:'A big, goofy kid who cries at everything. Push him too far and meet the most overpowered kid on the street.',
  ab:{name:'Big Cry', kind:'pity', n:3, icon:'😭', desc:'Sob on the next doorstep: triple candy.'}, passive:'Fright over 70%? Secret power: fearless and fast.'},
 {id:'thomas', name:'Thomas', title:'“The Rounder”', color:'#ffc48a', kind:'round', icon:'⚪', stats:[3,4,3,2,3],
  desc:'A perfectly round fighter with no feet. He rolls with every punch and keeps on coming.',
  ab:{name:'Roll Out', kind:'ghost', n:3, icon:'⚪', desc:'Curls up and rolls: fast and untouchable for 9s.'}, passive:'Round: never drops candy when startled.'},
 {id:'yassin', name:'Yassin', title:'The Kickboxer', color:'#1a1a1a', skin:'#c98d5e', hair:'#1a120c', gloves:'#e8202a', wide:1.25, icon:'🥊', stats:[4,5,2,2,3],
  desc:'Nobody bets against his push-up count anymore. His roundhouse sends anything flying.',
  ab:{name:'Roundhouse', kind:'blast', n:3, icon:'🥊', r:200, desc:'Kicks nearby pests clean off the street.'}, passive:'Button-mash contests are easier.'},
 {id:'niek', name:'Niek', title:'Nerd & Boy Scout', color:'#c8b273', hair:'#b5651d', glasses:true, icon:'🏕️', stats:[2,3,3,5,3],
  desc:'A proud nerd and boy scout with every merit badge there is. His backpack has something for every situation.',
  ab:{name:'Scout Backpack', kind:'scout', n:3, icon:'🏕️', desc:'A shield and a fresh item from the backpack.'}, passive:'Always prepared: starts with a flashlight.'},
 {id:'oela', name:'Oela', title:'The Footballer', color:'#1fa04a', skin:'#5a3420', hair:'#140c08', icon:'⚽', stats:[4,4,3,2,3],
  desc:'A footballer with magic in his boots. When he shoots, the whole street ducks.',
  ab:{name:'Banana Kick', kind:'blast', n:2, icon:'⚽', r:420, desc:'A curling shot that clears pests and knocks loot loose.'}, passive:'Timing challenges are easier.'},
 {id:'casper', name:'Casper', title:'The Car Expert', color:'#2a3a5a', hair:'#3a2414', gloves:'#1d1a2f', icon:'🔧', stats:[5,3,3,3,2],
  desc:'A real autokenner. He can tune anything in seconds, including his own sneakers.',
  ab:{name:'Turbo Tune', kind:'speed', n:3, icon:'🔧', long:true, desc:'Long turbo boost that also shakes off scrambled controls.'}, passive:'Starts the night with roller skates.'},
];

/* ---------- residents: who lives on the street ---------- */
const RESIDENTS = [
 {id:'chemmy', name:'Chemmy', title:'HOST · Who Wants to Be a Hundredaire?', color:'#ffc21f', hair:'#2a1a0a', icon:'🎤', game:'ladder',
  intro:'WELCOME, contestant! Four questions. Every right answer doubles your candy. Wrong answer? You leave with nothing. Walk away whenever you like!'},
 {id:'fyon', name:'Fyon', title:'EGGHEAD · Hundredaire', color:'#7fd8ff', hair:'#6a4a2a', glasses:true, icon:'🧠', game:'trivia', reward:9,
  intro:'Ah, a trick-or-treater. I only give candy to people who know their WIDR lore. Two questions.'},
 {id:'jacques', name:'Jacques', title:'CONTESTANT · Hundredaire', color:'#ff9ab0', hair:'#3a2216', icon:'🙋', game:'trivia', reward:8,
  intro:'I’m practising for the show and I need a lifeline! Help me with two questions and I’ll share my snacks.'},
 {id:'sichen', name:'Sichen', title:'JOKESTER · Hundredaire', color:'#ff7a1f', hair:'#1a1a1a', icon:'🃏', game:'shell', reward:10,
  intro:'Hehe. Candy’s under one of these hats. Keep your eyes on it. I’m very, very fast.'},
 {id:'ati', name:'Ati', title:'THE STRICT MOM', color:'#d94fd0', hair:'#3a2216', bun:true, icon:'🩴', game:'manners', reward:12, loseScare:15,
  intro:'Hm. Another one. Before you get anything from me, let’s see if you have manners.'},
 {id:'ratjetoe', name:'Ratjetoe', title:'BOSS · Otis in Orbit', color:'#2f7bff', kind:'rat', icon:'🔧', game:'whack', reward:11,
  intro:'My doorbell is falling apart! Tighten the loose bolts before they pop out and I’ll pay you in cheese. Fine. Candy.'},
 {id:'brothers', name:'Joep, Cas & Luur', title:'THE BROTHERS · RhymeRhythm', color:'#ff3b5c', hair:'#5a3416', icon:'🎵', game:'rhythm', reward:14,
  intro:'Yo! Nobody gets candy at this house without a rhythm battle. Hit the notes, keep the beat.'},
 {id:'julie', name:'Julie', title:'DETECTIVE · Codename Conference', color:'#5a4a3a', hair:'#c8915a', icon:'🔍', game:'simon', reward:12,
  intro:'Someone’s been swiping candy on this street. Memorise the suspect lineup and repeat it back to me.'},
 {id:'anna', name:'Anna', title:'COMMS · Codename Conference', color:'#2a3a5a', hair:'#1a1a1a', headphones:true, icon:'📡', game:'typing', reward:10,
  intro:'Incoming transmission. It’ll only show for a moment. Copy it word for word.'},
 {id:'isa', name:'Isa', title:'ICE MAGICIAN · Watt Wizardry', color:'#bff3ff', hair:'#ffffff', wizard:'#7fd8ff', icon:'❄️', game:'reaction', reward:10,
  intro:'When my crystal turns to ice, tap it. Too slow and it melts. Too early and, well, you freeze.'},
 {id:'lyra', name:'Lyra', title:'FRIEND · Watt Wizardry', color:'#ffb6dc', hair:'#ffe066', icon:'✨', game:'pairs', reward:11,
  intro:'I enchanted my candy cards! Match all the pairs before the spell wears off.'},
 {id:'otis', name:'Otis', title:'HERO · Otis in Orbit', color:'#3cc8ff', hair:'#2a1a0a', icon:'🚀', game:'catch', reward:0,
  intro:'Candy is raining down from orbit! Catch it in your bag, but dodge the space rocks.'},
 {id:'kayoyara', name:'Kayo & Yara', title:'VILLAINS · Otis in Orbit', color:'#4a2a6a', hair:'#1a1a1a', icon:'🥚', game:'dodge', reward:12, loseScare:12,
  intro:'Trick or treat? We pick TRICK. Survive the egg barrage and we’ll hand over the treats.'},
 {id:'grumbleclaw', name:'Grumbleclaw', title:'VILLAIN · The Guiseppe Game', color:'#6b7a4a', hair:'#2a2a1a', icon:'🧩', game:'riddle', reward:12, loseScare:10,
  intro:'Grrr. Answer my riddles or be gone. Two riddles. No hints.'},
 {id:'gianmarco', name:'Gianmarco', title:'FRIEND · The Guiseppe Game', color:'#3ccf6e', hair:'#2a1a0a', icon:'🤝', game:null,
  intro:'Ciao amico! No games here, just friends. Take a big handful!'},
 {id:'enno', name:'Enno', title:'THE MATHEMATICIAN', color:'#1fb5a6', hair:'#8a7a6a', glasses:true, icon:'📐', game:'math', reward:11, hero:true,
  intro:'Five sums, one bowl of candy. The clock is already running. Well, it will be.'},
 {id:'oela', name:'Oela', title:'THE FOOTBALLER', color:'#1fa04a', skin:'#5a3420', hair:'#140c08', icon:'⚽', game:'timing', reward:11, hero:true,
  intro:'Penalty shootout! Three kicks. Score two and the candy is yours.'},
 {id:'yassin', name:'Yassin', title:'THE KICKBOXER', color:'#1a1a1a', skin:'#c98d5e', hair:'#1a120c', gloves:'#e8202a', wide:1.25, icon:'🥊', game:'mash', reward:12, hero:true,
  intro:'Push-up contest. Five seconds. Go as fast as you can. Nobody beats me, but try.'},
 {id:'daniel', name:'Daniel', title:'ARMY VET · Demolition Run', color:'#ff7a1f', cap:'#ffd23f', icon:'💣', game:'wires', reward:13, loseScare:18, hero:true,
  intro:'Don’t panic, but my candy bowl is rigged. Read the clue and cut ONE wire. Quickly.'},
 {id:'guiseppe', name:'Guiseppe', title:'HERO · The Guiseppe Game', color:'#e0201f', kind:'apple', icon:'🍎', game:'gamble', hero:true,
  intro:'It’s-a my house AND my game! Take 8 candies, or pick an apple and maybe triple it!'},
];
const GOONPOSTER = {id:'goonposter', name:'Goonposter', title:'BOSS · The Guiseppe Game', color:'#ffffff', kind:'sheet', icon:'👻'};
const TOON = {id:'toon', name:'Toon', title:'VILLAIN · RhymeRhythm', color:'#7fff7f', kind:'alien', icon:'👽'};
const ANKER = {id:'ankervos', name:'Anker Vos', title:'THE ANNOYING FOX', color:'#ff7a1f', kind:'fox'};
const META = {id:'meta', name:'Meta AI', title:'THE MEDDLING CHATBOT', color:'#0866ff', kind:'meta'};
const ZENNITH = {id:'zennith', name:'Zennith', title:'THE LIVING DARK', color:'#1a1030', kind:'zennith'};
const RESHMAN = {id:'reshman', name:'Reshman', title:'MYSTERIOUS NINJA', color:'#2a2238', kind:'blob'};
const BYTE = {id:'byte', name:'Byte', title:'SIDEKICK · Otis in Orbit', color:'#9aa8b8', kind:'robot'};
const MILO_NPC = HEROES.find(h => h.id === 'milo');

const NEIGHBOURS = ['Mevrouw Jansen','Meneer Bakker','Oma Visser','Meneer de Boer','Familie Smit','Mevrouw Mulder','Meneer Peters','Familie Dekker','Oma Bos','Mevrouw de Wit','Meneer Hendriks','Familie Kok','Opa Brouwer','Mevrouw van Dijk'];
const NCOLORS = ['#ffd23f','#7fd8ff','#ff9ab0','#b388ff','#8fd400','#ffb02e','#1fb5a6','#ff7a1f'];
const NHAIR = ['#3a2216','#c8c8c8','#e0a060','#1a1a1a','#8a5a2a','#f0e0b0'];

/* ---------- candy ---------- */
const CANDY = {
  choc:{e:'🍫', pts:3, n:'Chocolate'}, sweet:{e:'🍬', pts:1, n:'Sweets'}, lolly:{e:'🍭', pts:2, n:'Lollipops'},
  cookie:{e:'🍪', pts:2, n:'Cookies'}, full:{e:'🌟', pts:10, n:'Full-size bars'}, raisin:{e:'🍇', pts:0, n:'Raisins'}, apple:{e:'🍎', pts:1, n:'Apples'},
};
const MIX = {
  std:{sweet:5, choc:3, lolly:2, cookie:1}, choc:{choc:6, sweet:2, lolly:1}, sweet:{sweet:6, lolly:3},
  cookie:{cookie:5, sweet:2}, lolly:{lolly:5, sweet:3},
};

const COSTUMES = [
  {e:'👻', n:'Ghost', s:1, d:'+1 courage'}, {e:'🧛', n:'Vampire', s:2, d:'+1 charm'}, {e:'🎃', n:'Pumpkin', s:4, d:'+1 luck'},
  {e:'🧙', n:'Wizard', s:3, d:'+1 brains'}, {e:'🦇', n:'Bat', s:0, d:'+1 speed'}, {e:'💀', n:'Skeleton', s:1, d:'+1 courage'},
];

const ITEMS = {
  flash:{e:'🔦', n:'Flashlight', d:'Held: halves fright', passive:true},
  skates:{e:'🛼', n:'Roller skates', d:'20s of speed'},
  snack:{e:'🍖', n:'Fox snack', d:'Lures every pest away'},
  field:{e:'🛡️', n:'Force field', d:'+1 shield'},
  map:{e:'🗺️', n:'Street map', d:'Reveal houses for 40s'},
  magnet:{e:'🧲', n:'Candy magnet', d:'Pull street candy for 30s'},
  calm:{e:'🧃', n:'Juice box', d:'−30 fright'},
};

/* ---------- trivia ---------- */
const QUIZ = [
  {q:'What is Isa’s role in Watt Wizardry?', a:'Ice magician', w:['Host','Villain','Jokester']},
  {q:'Who is Nathan’s little brother?', a:'Ash', w:['Renas','Robin','Dih']},
  {q:'What does Ati throw at people?', a:'Her slipper', w:['A shoe horn','A baguette','Her phone']},
  {q:'Ratjetoe never goes anywhere without his…', a:'Wrench', w:['Cheese','Jetpack','Overdue library book']},
  {q:'Which game has three brothers stopping an alien in Amsterdam?', a:'RhymeRhythm', w:['WIDR Turbo','Otis in Orbit','Demolition Run']},
  {q:'Guiseppe is a sentient…', a:'Apple', w:['Pear','Tomato','Pizza']},
  {q:'Who is Josh’s little brother?', a:'Renas', w:['Ash','Enno','Casper']},
  {q:'Who is the Lightning Wizard?', a:'Milo', w:['Deniz','Isa','Lyra']},
  {q:'Fionn is an Irish…', a:'Geologist', w:['Footballer','Dentist','Pirate']},
  {q:'Lars is a stout dwarf…', a:'Miner', w:['Baker','Wizard','Lawyer']},
  {q:'What is Meta AI known for?', a:'Butting in uninvited', w:['Baking','Breakdancing','Silence']},
  {q:'What’s Daniel’s role in Demolition Run?', a:'Army vet', w:['Mysterious ninja','Detective','Host']},
  {q:'Reshman is a…', a:'Mysterious ninja', w:['Ice wizard','Game show host','Tennis ace']},
  {q:'Who hosts Who Wants to Be a Hundredaire?', a:'Chemmy', w:['Sichen','Fyon','Jacques']},
  {q:'In Codename Conference, Julie is the…', a:'Detective', w:['Comms officer','Villain','Chef']},
  {q:'Anker Vos is a very annoying…', a:'Fox', w:['Goose','Ferret','Chatbot']},
  {q:'Adam’s sport is…', a:'Tennis', w:['Baseball','Kickboxing','Darts']},
  {q:'Thomas is nicknamed…', a:'“The Rounder”', w:['“The Square”','“Big Toe”','“The Rocket”']},
  {q:'Who never goes anywhere without a drone?', a:'Josh', w:['Casper','Niek','Enno']},
  {q:'What is Dutch for “trick or treat”?', a:'Snoep of je leven', w:['Lekker spoken','Snoep of zoen','Boe of snoep']},
  {q:'Jack-o’-lanterns were first carved in Ireland out of…', a:'Turnips', w:['Pumpkins','Potatoes','Cheese']},
  {q:'Botanically speaking, a pumpkin is a…', a:'Fruit', w:['Vegetable','Nut','Mushroom']},
  {q:'What is Casper an expert on?', a:'Cars', w:['Candy','Clouds','Castles']},
  {q:'Zennith is known as…', a:'The Living Dark', w:['The Annoying Fox','The Rounder','The Strict Mom']},
];
const RIDDLES = [
  {q:'What has keys but can’t open a single lock?', a:'A piano', w:['A janitor','A map']},
  {q:'The more you take, the more you leave behind. What am I?', a:'Footsteps', w:['Candy','Time']},
  {q:'What gets wetter the more it dries?', a:'A towel', w:['A sponge','The sea']},
  {q:'What has a head and a tail but no body?', a:'A coin', w:['A snake','A comet']},
  {q:'What has hands but can’t clap?', a:'A clock', w:['A glove','A ghost']},
  {q:'Which room do ghosts avoid?', a:'The living room', w:['The attic','The bathroom']},
  {q:'What can you catch but not throw?', a:'A cold', w:['A ball','A fox']},
  {q:'I go up but never come down. What am I?', a:'Your age', w:['A balloon','A drone']},
];
const MANNERS = [
  {q:'“You’re out very late. What do you say to me?”', a:'“Good evening Ati! Happy Halloween!”', w:['“Candy. Now.”','“Is that a slipper behind your back?”']},
  {q:'“Did you wipe your feet?”', a:'“Of course, twice.”', w:['“Feet?”','“I floated here.”']},
  {q:'“Have you finished your homework?”', a:'“Yes, all of it.”', w:['“It’s Halloween!”','“The dog ate it, then my candy.”']},
  {q:'“How many candies will you take?”', a:'“Just one, thank you.”', w:['“The whole bowl.”','“Depends. How many do you have?”']},
  {q:'“Say thank you.”', a:'“Thank you very much, Ati.”', w:['“Thanks I guess.”','“You’re welcome.”']},
];
const TRANSMISSIONS = ['TRICK OR TREAT','SNOEP OF JE LEVEN','THE FOX HAS THE CANDY','RATJETOE IS NEAR','BAG IS FULL','MEET AT THE PUMPKIN','THE EAGLE WANTS CHOCOLATE','ZENNITH AT NINE'];
const WIRES = [
  {w:['red','blue','yellow','green'], a:'yellow', clue:'Cut the colour of Milo’s lightning bolts.'},
  {w:['green','red','blue','white'], a:'white', clue:'Never red. Cut the colour of a ghost.'},
  {w:['blue','yellow','red','green'], a:'red', clue:'Cut the colour of Guiseppe.'},
  {w:['white','green','blue','yellow'], a:'green', clue:'Cut the colour of Guiseppe’s leaf.'},
  {w:['yellow','white','blue','red'], a:'blue', clue:'Cut the colour of Meta AI’s ring. The part that isn’t purple.'},
  {w:['red','green','white','blue'], a:'red', clue:'Cut the colour of Nathan’s cap.'},
];
const WIRECOL = {red:'#ff3b3b', blue:'#2f7bff', yellow:'#ffd23f', green:'#2fbf71', white:'#ffffff'};
const META_LINES = [
  'Hi! 👋 Did you know candy is made of sugar?',
  'I see you are trick or treating. Want 14 tips about walking?',
  'Fun fact: I was not invited. I came anyway!',
  'I’ve summarised your bag: it contains candy.',
  'Knock knock! Who’s there? Meta AI! Meta AI who? Meta AI, here to help!',
  'Would you like me to rewrite “trick or treat” to sound more professional?',
];

/* ---------- achievements ---------- */
const ACH = {
  first:['First Knock','Knock on your first door'],
  fullsize:['Full-Size Finder','Score a full-size bar'],
  raisin:['Raisin Hell','Get handed raisins'],
  dentist:['Dentist’s Pet','Receive a toothbrush'],
  hundred:['Hundredaire','Win all four of Chemmy’s questions'],
  rhythm:['Brother Beats','Win the brothers’ rhythm battle'],
  toon:['Close Encounter','Beat Toon the alien'],
  haunted:['Goonbuster','Clear Goonposter’s haunted house'],
  robbed:['Out-Foxed','Get robbed by Anker Vos'],
  foxhunt:['Fox Hunter','Knock Anker Vos’s loot loose'],
  meta:['Do Not Disturb','Close a Meta AI chat'],
  dark:['Lights Out','Survive Zennith’s darkness'],
  ati:['Slipper Dodger','Pass Ati’s manners test'],
  kind:['Good Samaritan','Reach 5 kindness'],
  home:['Home by Nine','Be home when the clock hits 21:00'],
  baron:['Candy Baron','Finish with 250+ points'],
  faint:['Robin Carried Me','Faint from fright'],
  shadow:['Shadow Deal','Trade with Reshman'],
  street:['Full Street','Visit 20 houses in one night'],
  detective:['Junior Detective','Crack Julie’s lineup'],
};
