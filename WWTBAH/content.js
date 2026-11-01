// Extra banter
LINES.sichenRight.push(
  "Correct! I'm on fire. Unlike my airplane joke, which didn't really land for most people!",
  "Boom! Okay, okay, while I'm hot: you know the joke about the airplane? Well, it didn't really land for most people!",
  "Right answer! Write that down. Also write down: you know the joke about the airplane? It didn't really land for most people!"
);
LINES.sichenWrong.push(
  "Wrong! Stay with me, though. You know the joke about the airplane? Well, it didn't really land for most people! …Hello? Is this thing on?",
  "Missed it. Like a pilot in my favourite joke. You know the joke about the airplane? It didn't really land for most people!",
  "Nope. But I have prepared remarks: you know the joke about the airplane? Well, it didn't really land for most people!"
);
LINES.fyonRight.push("Ha! Sunny side UP!", "Not bad for a fella with an egg for a head, wha'?", "That's the yolk's on youse.");
LINES.fyonWrong.push("Ah, I've egg on me face. Well, more than usual.", "Poached it, so I did. Badly.", "Sure I'll get the next one. Or I won't. Que sera, sera.");

const AI_TYPED = {
  sichen: ["Final answer: {a}. And you know the joke about the airplane?…", "{a}! Locking it in before I tell the joke again."],
  fyon: ["I'll say {a}, God help me.", "{a}, I'd say. Me shell's tingling."]
};

const CHEMMY_STORIES = [
  "Did I ever tell you about the 1987 Regional Final? 21–19 in the fifth, and my shoelace came undone mid-rally. I won with one shoe. They called me 'Hop-Along Chemmy'.",
  "When I retired, they gave me a golden paddle. I use it to flip pancakes. Best backhand in the kitchen.",
  "Fun fact: I once played a rally that lasted 11 minutes. My opponent fell asleep. Technically I won.",
  "In 1991 I lost a match to a 12-year-old. That 12-year-old went on to win three national titles. I like to think I taught them humility. I taught them nothing.",
  "People ask if I miss competing. Every day. Then I remember the knee brace and I feel better.",
  "My coach always said: 'Chemmy, watch the ball.' I watched it so hard I forgot to hit it. Different times.",
  "I was once disqualified for celebrating too hard. I did a cartwheel. Over the net. During the point.",
  "Back in my day, balls were 38 millimetres and so were our attention spans."
];

const ADS = [
  {t:"FYON'S FREE-RANGE HAIR TONIC", b:"Not a single hair on Fyon's head, and that's how we know it's working on something.", s:"Results not guaranteed. Results not observed."},
  {t:"SICHEN AIRWAYS", b:"Our jokes don't land, and neither do our planes! *legally we have been asked to clarify that the planes land.", s:"Now boarding: Group Pun."},
  {t:"CHEMMY'S PADDLE PALACE", b:"Paddles! Balls! Nets! A signed photo of Chemmy for €4.99, or two for €10!", s:"No refunds on the photo."},
  {t:"HUNDREDAIRE MONTHLY", b:"The magazine for people with nearly a hundred dollars. This month: 'Is it rude to ask for change for a twenty?'", s:"€3.50, or 3.5% of your fortune."},
  {t:"MULLINGAR EGG BOARD", b:"Eggs: they're great. Please stop putting them in baskets all at once. Signed, a concerned egg.", s:"A message from Fyon's extended family."},
  {t:"WHIFF-WHAFF CEREAL", b:"Round, white, bouncy, and 40 mm across. Surprisingly not crunchy.", s:"Do not eat the balls."}
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
  {id:'marathon', ic:'🏃', n:"Marathoner", d:"Finish a Marathon game"}
];

const PLAYER_COLORS = [['#F2B230','#24345C'],['#F49AA8','#1E8C84'],['#9fd3f0','#E2412B'],['#BFE6C9','#6b3fa0']];
