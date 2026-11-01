// Cast banter, sponsors, stories, achievements and unlocks
const JOKE = "You know the joke about the airplane? Well, it didn't really land for most people!";

const LINES = {
  sichenRight: [
    JOKE + " Unlike that answer. Nailed it.",
    "Correct! And you know the joke about the airplane? Well, it didn't really land for most people!",
    "Got it! Speaking of things that land: you know the joke about the airplane?… It didn't really land for most people!",
    "Smooth touchdown! Which is more than I can say for my airplane joke. It didn't really land for most people!",
    "Correct! I'm on fire. Unlike my airplane joke, which didn't really land for most people!",
    "Right answer! Write that down. Also write down: you know the joke about the airplane? It didn't really land for most people!"
  ],
  sichenWrong: [
    "Ah, missed. Like my airplane joke. You know it? It didn't really land for most people!",
    JOKE,
    "Wrong, but hey: you know the joke about the airplane? Well, it didn't really land for most people! …Still nothing? Tough crowd.",
    "That answer had turbulence. You know the joke about the airplane? Well, it didn't really land for most people!",
    "Nope. But I have prepared remarks: you know the joke about the airplane? Well, it didn't really land for most people!"
  ],
  fyonRight: ["Grand so! I'm not just a pretty shell.", "Sure that was eggs-actly what I was thinking.", "Ah, I'm on a roll now. Not a sausage roll, mind.",
    "Get in! Me mammy back in Mullingar'll be delighted.", "Hard-boiled genius, so I am.", "Ha! Sunny side UP!", "Not bad for a fella with an egg for a head, wha'?"],
  fyonWrong: ["Ah no, I'm after cracking under the pressure.", "That's me scrambled, so.", "Jaysus, I'm only a shell of meself today.",
    "Ah sure look, it's not all it's cracked up to be.", "I had a feeling in me yolk that was wrong.", "Ah, I've egg on me face. Well, more than usual.", "Poached it, so I did. Badly."],
  jacquesRight: ["Correct. From up 'ere I could see ze answer coming. Being two metres tall 'as its advantages.", "Oui. Easy. Did my glasses dazzle you? Zey do zat.",
    "Bien sûr. Even ze studio lights are jealous of my lenses.", "Correct! I would wink, but you would not survive ze sparkle."],
  jacquesWrong: ["Non! Ze lights reflected off my glasses into my own eyes.", "Ah, zut. Ze air is thin up 'ere, it affects ze brain.",
    "Wrong? Impossible. I demand to see ze question at my eye level.", "Pfff. I was distracted by my own reflection."],
  chemmyRight: ["Topspin! Clean winner.", "Straight down the line, beautiful!", "That's a smash, that is!", "Edge of the table and IN!", "Like my backhand in '91. Unreturnable."],
  chemmyWrong: ["Into the net, I'm afraid.", "Ooh, long! Off the end of the table.", "That one had too much sidespin.", "Let. No, wait, that's just wrong.", "A miss! Happens to the best of us. Rarely to me, but still."],
  chemmyTimeout: ["Time's up! You froze like a rookie at the Worlds.", "Clock ran out! Serve faster next time.", "Too slow! I could've played a full rally in that time."]
};

const CHEMMY_STORIES = [
  "Did I ever tell you about the 1987 Regional Final? 21–19 in the fifth, and my shoelace came undone mid-rally. I won with one shoe. They called me 'Hop-Along Chemmy'.",
  "When I retired, they gave me a golden paddle. I use it to flip pancakes. Best backhand in the kitchen.",
  "Fun fact: I once played a rally that lasted 11 minutes. My opponent fell asleep. Technically I won.",
  "In 1991 I lost a match to a 12-year-old. That 12-year-old went on to win three national titles. I like to think I taught them humility. I taught them nothing.",
  "People ask if I miss competing. Every day. Then I remember the knee brace and I feel better.",
  "My coach always said: 'Chemmy, watch the ball.' I watched it so hard I forgot to hit it. Different times.",
  "I was once disqualified for celebrating too hard. I did a cartwheel. Over the net. During the point.",
  "Back in my day, balls were 38 millimetres and so were our attention spans.",
  "Jacques once played table tennis against me. Two metres tall. Never had to bend down. I've never been so offended.",
  "Quick safety reminder from the studio: please do not look directly at Jacques' glasses."
];

const ADS = [
  {t:"FYON'S FREE-RANGE HAIR TONIC", b:"Not a single hair on Fyon's head, and that's how we know it's working on something.", s:"Results not guaranteed. Results not observed."},
  {t:"SICHEN AIRWAYS", b:"Our jokes don't land, and neither do our planes! *legally we have been asked to clarify that the planes land.", s:"Now boarding: Group Pun."},
  {t:"CHEMMY'S PADDLE PALACE", b:"Paddles! Balls! Nets! A signed photo of Chemmy for €4.99, or two for €10!", s:"No refunds on the photo."},
  {t:"HUNDREDAIRE MONTHLY", b:"The magazine for people with nearly a hundred dollars. This month: 'Is it rude to ask for change for a twenty?'", s:"€3.50, or 3.5% of your fortune."},
  {t:"MULLINGAR EGG BOARD", b:"Eggs: they're great. Please stop putting them in baskets all at once. Signed, a concerned egg.", s:"A message from Fyon's extended family."},
  {t:"WHIFF-WHAFF CEREAL", b:"Round, white, bouncy, and 40 mm across. Surprisingly not crunchy.", s:"Do not eat the balls."},
  {t:"JACQUES' LUMIÈRE LENSES", b:"Why buy a lighthouse when you can BE ze lighthouse? Lenses so bright, ships will steer around you.", s:"Not suitable for driving, flying, or eye contact."}
];

const ACHIEVEMENTS = [
  {id:'perfect', ic:'💯', n:"Hundredaire", d:"Win the full $100 with a perfect game"},
  {id:'winner', ic:'🏆', n:"Champion", d:"Finish first in a game"},
  {id:'beatai', ic:'🥚', n:"Beat the Egg", d:"Finish ahead of both Sichen and Fyon"},
  {id:'trick', ic:'🧐', n:"Read Every Word", d:"Get every trick question right in a game"},
  {id:'bullseye', ic:'🎯', n:"Bullseye", d:"Guess a number exactly"},
  {id:'emoji', ic:'🤩', n:"Emoji Whisperer", d:"Solve 3 emoji puzzles in one game"},
  {id:'order', ic:'📋', n:"Neat Freak", d:"Get 2 put-in-order questions fully right in one game"},
  {id:'eggadvice', ic:'🍳', n:"Egg-cellent Advice", d:"Follow Fyon's advice to a correct answer"},
  {id:'nolife', ic:'🦾', n:"No Help Needed", d:"Finish a game without using a lifeline"},
  {id:'jokes', ic:'✈️', n:"Heard It All Before", d:"Hear the airplane joke 25 times"},
  {id:'party', ic:'🎉', n:"Party Animal", d:"Finish a game with 3 or more human players"},
  {id:'marathon', ic:'🏃', n:"Marathoner", d:"Finish a Marathon game"},
  {id:'blinded', ic:'😎', n:"Outshine Jacques", d:"Get a question right that Jacques got wrong"},
  {id:'beatjacques', ic:'📏', n:"Stood Tall", d:"Finish a game ahead of Jacques"}
];

const PLAYER_COLORS = [['#F2B230','#24345C'],['#F49AA8','#1E8C84'],['#9fd3f0','#E2412B'],['#BFE6C9','#6b3fa0']];

// What each achievement unlocks in the character creator
const UNLOCKS = {
  'hat:crown': 'winner', 'skin:#FFC93C': 'perfect', 'head:egg': 'beatai', 'extras:crack': 'beatai',
  'eyewear:monocle': 'trick', 'extras:paddle': 'bullseye', 'eyes:wink': 'emoji', 'hair:tufts': 'order',
  'extras:shamrock': 'eggadvice', 'hat:headband': 'nolife', 'extras:mic': 'jokes', 'hat:party': 'party',
  'hair:mohawk': 'marathon', 'eyewear:blinding': 'blinded', 'head:tall': 'beatjacques'
};
const FIELD_NAMES = {hat:'Hat', skin:'Skin', head:'Head', extras:'Extra', eyewear:'Eyewear', eyes:'Eyes', hair:'Hair'};
function lockOf(field, value){ const id = UNLOCKS[field + ':' + value]; return id && !(typeof meta !== 'undefined' && meta.ach && meta.ach[id]) ? ACHIEVEMENTS.find(a => a.id === id) : null; }
function unlocksFor(id){
  return Object.entries(UNLOCKS).filter(([, a]) => a === id).map(([k]) => {
    const [f, v] = k.split(':'), opt = (LOOK_OPTS[f] || []).find(o => Array.isArray(o) && o[0] === v);
    return f === 'skin' ? 'Golden skin' : `${opt ? opt[1] : v} (${FIELD_NAMES[f].toLowerCase()})`;
  });
}
function sanitizeLook(L){
  const d = defaultLook(0);
  ['skin', 'head', 'hair', 'eyes', 'hat', 'eyewear'].forEach(f => { if(lockOf(f, L[f])) L[f] = d[f]; });
  L.extras = (L.extras || []).filter(x => !lockOf('extras', x));
  return L;
}
const _randomLook = randomLook;
randomLook = () => sanitizeLook(_randomLook());
