// True or false: a = true/false
const TF = [
  {q:"Napoleon was unusually short for his time.", a:false, f:"He was about 5'7\", roughly average. British cartoonists did the rest."},
  {q:"A group of crows is called a murder.", a:true, f:"A murder of crows. Spooky but true."},
  {q:"Goldfish only have a three-second memory.", a:false, f:"Goldfish can remember things for months. They can even be trained."},
  {q:"Bananas are slightly radioactive.", a:true, f:"They contain potassium-40. You'd need millions to worry."},
  {q:"The Great Wall of China is visible from the Moon with the naked eye.", a:false, f:"Nope. It's long, but far too narrow."},
  {q:"Sharks existed before trees.", a:true, f:"Sharks: about 450 million years. Trees: about 385 million."},
  {q:"Lightning never strikes the same place twice.", a:false, f:"The Empire State Building gets hit about 20 times a year."},
  {q:"Venus is the hottest planet in the solar system.", a:true, f:"Hotter than Mercury, thanks to its thick greenhouse atmosphere."},
  {q:"Table tennis became an Olympic sport in 1988.", a:true, f:"Seoul 1988! I was in the crowd. Crying. Not because I wasn't picked. Mostly."},
  {q:"Measured from base to peak, Everest is the tallest mountain on Earth.", a:false, f:"Mauna Kea in Hawaii is taller from base to peak, but most of it is underwater."},
  {q:"Bats are blind.", a:false, f:"Bats can see. Many use echolocation on top."},
  {q:"The Eiffel Tower can grow taller in summer.", a:true, f:"Heat expands the iron by up to about 15 cm."},
  {q:"There are no snakes native to Ireland.", a:true, f:"None! St Patrick gets the credit, but the Ice Age did the work."},
  {q:"A very fresh egg will float in a glass of water.", a:false, f:"Fresh eggs sink. Old ones float. Fyon is checking his own buoyancy."},
  {q:"A day on Mars is less than an hour longer than a day on Earth.", a:true, f:"A Martian day is about 24 hours and 37 minutes."},
  {q:"Old church windows are thicker at the bottom because glass slowly flows.", a:false, f:"Glass doesn't flow. Old glassmakers just put the thick edge at the bottom."},
  {q:"Octopuses have blue blood.", a:true, f:"Their blood uses copper, not iron, to carry oxygen."},
  {q:"The world's shortest scheduled flight lasts under two minutes.", a:true, f:"Westray to Papa Westray in Orkney, about 90 seconds. Sichen's had longer jokes."},
  {q:"An aeroplane's 'black box' is actually black.", a:false, f:"It's bright orange, so it's easier to find."},
  {q:"'Checkmate' comes from Persian words meaning 'the king is helpless'.", a:true, f:"From 'shāh māt'. Chess has been trash-talking for centuries."}
];

// Closest guess: a = answer, tol = tolerance for full marks (half marks within 2.5x)
const NUM = [
  {q:"In what year did table tennis make its Olympic debut?", a:1988, tol:3, f:"Seoul 1988."},
  {q:"How tall is the Eiffel Tower in metres, antennas included?", a:330, tol:25, f:"About 330 m since a new antenna was added in 2022."},
  {q:"How many keys are on a standard piano?", a:88, tol:5, f:"88: 52 white and 36 black."},
  {q:"How many bones are in the adult human body?", a:206, tol:12, f:"206. Babies start with around 300 that fuse together."},
  {q:"How many member states does the United Nations have?", a:193, tol:8, f:"193 members, plus two observer states."},
  {q:"In what year was the Rubik's Cube invented?", a:1974, tol:3, f:"1974, by Ernő Rubik in Budapest."},
  {q:"What's the boiling point of water at sea level in Fahrenheit?", a:212, tol:8, f:"212 °F."},
  {q:"How long is a regulation table tennis table, in centimetres?", a:274, tol:15, f:"274 cm long, 152.5 cm wide and 76 cm high. I've measured hundreds."},
  {q:"How long is a marathon, in kilometres?", a:42.195, tol:1.5, f:"42.195 km. That odd .195 dates back to the 1908 London Olympics."},
  {q:"How tall is Mount Everest, in metres?", a:8849, tol:250, f:"8,849 m, by the 2020 survey."},
  {q:"In what year was the Eiffel Tower completed?", a:1889, tol:4, f:"1889, for the World's Fair."},
  {q:"Counting squares of every size, how many squares are on a chessboard?", a:204, tol:20, f:"204! 64 small ones plus all the bigger ones made of them."},
  {q:"Roughly how fast was the fastest recorded table tennis smash, in km/h?", a:116, tol:15, f:"About 116 km/h. I once hit 90. Tailwind."},
  {q:"About how many litres of blood does an average adult have?", a:5, tol:0.8, f:"About 5 litres."},
  {q:"How many hours are in a week?", a:168, tol:6, f:"7 × 24 = 168."}
];

// Emoji puzzles: e = emoji, h = hint, a = accepted answers (first is canonical), bad = AI wrong guesses
const EMOJI = [
  {e:"🦁👑", h:"Film", a:["The Lion King","Lion King"], bad:["Lion Queen","Narnia"]},
  {e:"🕷️🧑", h:"Superhero", a:["Spider-Man","Spiderman"], bad:["Ant-Man","Charlotte's Web"]},
  {e:"❄️👸", h:"Film", a:["Frozen"], bad:["Ice Princess","The Snow Queen"]},
  {e:"🧙‍♂️💍🌋", h:"Film series", a:["The Lord of the Rings","Lord of the Rings","LOTR"], bad:["Harry Potter","The Hobbit Volcano"]},
  {e:"🚢🧊💔", h:"Film", a:["Titanic"], bad:["Ice Age","The Love Boat"]},
  {e:"🦈🏖️", h:"Film", a:["Jaws"], bad:["Shark Tale","Baywatch"]},
  {e:"🍫🏭🎫", h:"Book / film", a:["Charlie and the Chocolate Factory","Willy Wonka","Wonka"], bad:["Chocolat","Factory Girl"]},
  {e:"👻🔫🚫", h:"Film", a:["Ghostbusters"], bad:["Casper","No Ghosts Allowed"]},
  {e:"🐠🔍", h:"Film", a:["Finding Nemo","Finding Dory"], bad:["The Little Mermaid","Fish Detective"]},
  {e:"🌧️🐱🐶", h:"Saying", a:["Raining cats and dogs","It's raining cats and dogs"], bad:["Pet weather","Cats vs dogs"]},
  {e:"🍎👁️", h:"Saying", a:["Apple of my eye","The apple of my eye"], bad:["Eye apple","Seeing apples"]},
  {e:"🐘🛋️", h:"Saying", a:["Elephant in the room","The elephant in the room"], bad:["Heavy sofa","Elephant chair"]},
  {e:"🥚🥚🥚🧺", h:"Saying (Fyon disapproves)", a:["Don't put all your eggs in one basket","All your eggs in one basket","Eggs in one basket"], bad:["Easter","Breakfast"]},
  {e:"🔨🧊", h:"Saying", a:["Break the ice","Breaking the ice"], bad:["Ice hammer","Cold hands"]},
  {e:"✈️😂🛬❌", h:"Sichen's speciality", a:["The airplane joke","Airplane joke","It didn't land","The joke didn't land","Didn't land"], bad:["Air humour","Plane crash"]},
  {e:"🦇👨", h:"Superhero", a:["Batman"], bad:["Dracula","Bat Boy"]},
  {e:"🍕🐢🥋", h:"TV / film", a:["Teenage Mutant Ninja Turtles","Ninja Turtles","TMNT"], bad:["Pizza Turtles","Kung Fu Panda"]},
  {e:"👸🐸💋", h:"Fairy tale", a:["The Frog Prince","Frog Prince","The Princess and the Frog","Princess and the Frog"], bad:["Shrek","Kermit"]},
  {e:"🏠🎈👴", h:"Film", a:["Up"], bad:["Balloon House","Grandpa's Flight"]},
  {e:"🌙🚶", h:"Dance move", a:["Moonwalk","The moonwalk","Moon walk"], bad:["Night stroll","Lunar dance"]}
];

// Typed answers
const TYPED = [
  {q:"Which is the only continent with no native ant species?", a:["Antarctica"], bad:["Australia","Europe"], f:"Antarctica. Too cold for picnics."},
  {q:"What is the capital city of Australia?", a:["Canberra"], bad:["Sydney","Melbourne"], f:"Canberra, a compromise because Sydney and Melbourne couldn't agree."},
  {q:"Which chemical element has the symbol 'K'?", a:["Potassium"], bad:["Krypton","Calcium"], f:"Potassium, from the Latin 'kalium'."},
  {q:"What is the smallest country in the world?", a:["Vatican City","Vatican","The Vatican","Holy See"], bad:["Monaco","Malta"], f:"Vatican City, about 0.44 km²."},
  {q:"Which planet is famous for its Great Red Spot?", a:["Jupiter"], bad:["Mars","Saturn"], f:"Jupiter. That spot is a storm bigger than Earth."},
  {q:"Mullingar, Fyon's hometown, is the county town of which Irish county?", a:["Westmeath","County Westmeath","Co Westmeath"], bad:["Meath","Offaly"], f:"Westmeath! Fyon is waving at his mammy."},
  {q:"What is the capital of Canada?", a:["Ottawa"], bad:["Toronto","Vancouver"], f:"Ottawa. Not Toronto. Never Toronto."},
  {q:"In which sport would you play a 'chop', a 'loop' and a 'pendulum serve'?", a:["Table tennis","Ping pong","Ping-pong","Whiff-whaff","Whiff whaff"], bad:["Tennis","Badminton"], f:"Table tennis! My one true love."},
  {q:"What colour is an aircraft's 'black box' flight recorder?", a:["Orange","Bright orange"], bad:["Black","Yellow"], f:"Orange. Sichen has a joke about it. You can guess how it lands."},
  {q:"What is the largest organ of the human body?", a:["Skin","The skin"], bad:["Liver","Lungs"], f:"Your skin!"},
  {q:"What is the word for the fear of the number 13?", a:["Triskaidekaphobia"], bad:["Thirteenophobia","Numerophobia"], f:"Triskaidekaphobia. Good luck spelling it under pressure."},
  {q:"What is a baby kangaroo called?", a:["Joey","A joey"], bad:["Kit","Pup"], f:"A joey."},
  {q:"Which country gave the Statue of Liberty to the United States?", a:["France"], bad:["England","Italy"], f:"France, in 1886."},
  {q:"What sport's balls are officially 40 mm across and weigh 2.7 grams?", a:["Table tennis","Ping pong","Ping-pong"], bad:["Golf","Squash"], f:"Table tennis, of course. I can tell the weight blindfolded."}
];

// Order: items listed in correct order
const ORDER = [
  {q:"Put these inventions in order, oldest first.", items:["Printing press","Telephone","Television","Smartphone"], f:"About 1440, 1876, the 1920s and the 1990s."},
  {q:"Order these planets by distance from the Sun, closest first.", items:["Venus","Earth","Saturn","Neptune"], f:"Venus, Earth, Saturn, Neptune."},
  {q:"Order these by top speed, slowest first.", items:["Garden snail","Usain Bolt","Racehorse","Cheetah"], f:"Bolt topped out around 44 km/h. Cheetahs reach about 110."},
  {q:"Order these by how long they last, shortest first.", items:["A table tennis game to 11","The Anglo-Zanzibar War","A football match","The Hundred Years' War"], f:"A game to 11 often takes under 10 minutes, the war took about 40, football 90… and then 116 years."},
  {q:"Order these countries by population, smallest first.", items:["Ireland","Netherlands","Germany","Brazil"], f:"About 5, 18, 84 and 210 million."},
  {q:"Order these events, earliest first.", items:["Moon landing","Table tennis joins the Olympics","Fall of the Berlin Wall","First iPhone"], f:"1969, 1988, 1989 and 2007."},
  {q:"Order these by height, shortest first.", items:["Statue of Liberty","Big Ben's tower","Eiffel Tower","Burj Khalifa"], f:"About 93 m (pedestal included), 96 m, 330 m and 828 m."},
  {q:"Order these mountains by height, lowest first.", items:["Ben Nevis","Mont Blanc","Kilimanjaro","K2"], f:"About 1,345 m, 4,806 m, 5,895 m and 8,611 m."},
  {q:"Order these eggs by size, smallest first. Fyon is watching.", items:["Hummingbird egg","Chicken egg","Emu egg","Ostrich egg"], f:"From pea-sized to about 1.4 kg. Fyon's head sits around emu."},
  {q:"Order these Olympic host cities by year, earliest first.", items:["Seoul","Sydney","Beijing","Paris"], f:"1988, 2000, 2008 and 2024."}
];

// Odd one out: c = the odd one, w = the three that belong
const ODD = [
  {q:"Which is the odd one out?", c:"Pluto", w:["Mercury","Venus","Mars"], f:"Pluto has been a dwarf planet since 2006."},
  {q:"Which is the odd one out?", c:"Carrot", w:["Tomato","Cucumber","Pumpkin"], f:"The others are botanically fruits. Carrot is a root."},
  {q:"Which is the odd one out?", c:"Shark", w:["Dolphin","Whale","Seal"], f:"The shark is a fish. The rest are mammals."},
  {q:"Which is the odd one out?", c:"Spider", w:["Ant","Beetle","Bee"], f:"Spiders are arachnids, not insects. Eight legs, too many."},
  {q:"Which is the odd one out?", c:"Mars", w:["Jupiter","Saturn","Neptune"], f:"Mars is rocky. The others are giants."},
  {q:"Which is the odd one out?", c:"Puffin", w:["Penguin","Ostrich","Kiwi"], f:"Puffins can fly. The others can't."},
  {q:"Which is the odd one out?", c:"Brazil", w:["Argentina","Mexico","Spain"], f:"Brazil speaks Portuguese. The others speak Spanish."},
  {q:"Which is the odd one out?", c:"Sydney", w:["Canberra","Ottawa","Wellington"], f:"Sydney isn't a national capital."},
  {q:"Which is the odd one out?", c:"Slam dunk", w:["Forehand loop","Backhand flick","Smash"], f:"No slam dunks in table tennis. I tried once. Banned for a month."},
  {q:"Which is the odd one out?", c:"Panda", w:["Koala","Kangaroo","Wombat"], f:"Pandas aren't marsupials."},
  {q:"Which is the odd one out?", c:"Trumpet", w:["Violin","Cello","Viola"], f:"Trumpet is brass. The rest are strings."},
  {q:"Which is the odd one out?", c:"Bronze", w:["Gold","Silver","Copper"], f:"Bronze is an alloy. The others are elements."}
];
