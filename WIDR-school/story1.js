// ---------- STORY PART 1: Chapters 1 & 2 ----------
const SCENES={};

SCENES.start=[
  {bg:'gate', ch:'Chapter 1 · First Day', cast:[]},
  {t:'Monday, 2 November. Rankingland: a country where everything gets a score: bakeries, bus routes, even the weather.'},
  {t:'And at the top of the school rankings is WidR School, where you, {P}, have just transferred into 5vb VWO.'},
  {cast:[['reshman','smile']]},
  {s:'reshman', t:'Yo. You must be {P}. I\'m Reshman, your official tour guide.'},
  {s:'reshman', e:'smirk', t:'Unofficially? Coolest guy at WidR. That\'s not a ranking. That\'s just a fact.'},
  {choice:[
    {t:'"Is everything here really ranked?"', then:[
      {s:'reshman', e:'grin', t:'Everything. The vending machine has a leaderboard. Fionn has held first place for two years. Don\'t tell him I told you.'}]},
    {t:'"Nice sunglasses. It\'s cloudy, though."', then:[
      {s:'reshman', e:'smirk', t:'The sun is always out when you\'re this cool. You\'ll learn.'}]},
    {t:'"Lead the way, coolest guy."', then:[
      {s:'reshman', e:'grin', t:'See, you get it already. We\'re gonna be friends.'}]},
  ]},
  {s:'reshman', e:'neutral', t:'Real talk though. WidR ranks people too. The WidR Ranking. Top of the list? Everyone wants to date you. Bottom? You have to work your way up.'},
  {s:'reshman', e:'smirk', t:'New students start at the bottom. No offence. Here, look.'},
  {rank:'The WidR Ranking: Week 1'},
  {s:'reshman', e:'neutral', t:'Do cool stuff, help people, win things, and you climb. Rankings lock after Valentine\'s Day, so don\'t wait too long. And never get caught dating two people at once. People have dropped ten places for that.'},
  {s:'reshman', e:'neutral', t:'Quick warning before we go in. Duck if anyone yells "HEADS UP."'},
  {n:'???', t:'HEADS UP!!', fx:'shake'},
  {t:'A baseball whistles past your ear and smacks into the school sign.'},
  {cast:[['reshman','surprised'],['natan','surprised'],['daniel','grin']]},
  {s:'natan', t:'Oh no. Oh no no no. Are you okay?! I was aiming for Daniel!'},
  {s:'daniel', t:'He\'s been aiming for me since Year One. He has never hit me once. I\'m Daniel, by the way.'},
  {s:'daniel', e:'smile', t:'Baseball in spring, football the rest of the year. Back home in Afghanistan I played football in the street every day until the sun went down. Natan\'s the reason I picked up a bat.'},
  {s:'natan', e:'smile', t:'And I\'m Natan. Third base, WidR Rankers. Usually I throw better than that. Promise.'},
  {t:'Natan is seventeen, with a mop of brown curls squashed under nothing, because he lost his cap again. He\'s smiling sheepishly.'},
  {choice:[
    {t:'Pick up the ball and toss it back to him. Nice and easy.', aff:{natan:1}, then:[
      {s:'natan', e:'grin', t:'Ooh, nice wrist! You play? You should come to practice sometime. No pressure. Some pressure. Medium pressure.'}]},
    {t:'"Next time aim for the sign. You\'ll hit Daniel for sure."', aff:{natan:1}, then:[
      {s:'natan', e:'grin', t:'HA! Okay, I like you. That\'s mean, but I like you.'},
      {s:'daniel', e:'smirk', t:'Rude. Accurate, but rude.'}]},
    {t:'Ask Daniel which sport is better, baseball or football.', then:[
      {s:'daniel', e:'grin', t:'Football. Obviously. But don\'t say that near Natan, he\'ll cry.'},
      {s:'natan', e:'sad', t:'I would not cry. I would simply be quietly devastated.'}]},
  ]},
  {s:'reshman', e:'smirk', t:'Alright, alright. Class starts in two minutes. Come on, {P}.'},
  {goto:'homeroom'}
];

SCENES.homeroom=[
  {bg:'classroom', cast:[]},
  {t:'Class 5vb VWO. The teacher, Meneer van der Meijs, waves you toward four empty seats. Somehow there are exactly four.'},
  {n:'Meneer van der Meijs', t:'Sit wherever you like, {P}. Choose wisely. Seating charts are permanent until the next ranking cycle.'},
  {t:'You look around.'},
  {choice:[
    {t:'The window seat, next to the boy with blue eyes and a cat hair on his sleeve.', aff:{lars:2}, goto:'seat_lars'},
    {t:'Front row, next to the boy arranging two erasers very carefully.', aff:{adam:2}, goto:'seat_adam'},
    {t:'The middle seat, where someone\'s bag is "just resting" on the chair.', aff:{fionn:2}, goto:'seat_fionn'},
    {t:'Back row, next to the sharply dressed boy with earbuds in.', aff:{milo:2}, goto:'seat_milo'},
  ]},
];

SCENES.seat_lars=[
  {cast:[['lars','surprised']]},
  {t:'As you sit down, the boy by the window looks up, then very quickly looks back down at his notebook.'},
  {s:'lars', e:'neutral', t:'Hi. Lars. That seat gets the best light, so. Good choice. Scientifically.'},
  {t:'He\'s sixteen, with light brown curls, a crisp white shirt, and very skinny jeans. His eyes are a startling blue.'},
  {choice:[
    {t:'"Is that cat hair on your sleeve?"', aff:{lars:1}, then:[
      {s:'lars', e:'shy', t:'No.'},
      {t:'It is definitely cat hair.'},
      {s:'lars', e:'neutral', t:'...I like cats. A lot. I just can\'t, um. Touch them. Long story. Medical. Kind of. Sort of. Magical. Never mind.'}]},
    {t:'"Scientifically? You measured the light?"', aff:{lars:1}, then:[
      {s:'lars', e:'smirk', t:'I measure everything. That\'s how you stay ahead in Rankingland.'},
      {t:'He says it smoothly, but his ears have gone slightly pink.'}]},
  ]},
  {eff:{flag:'sat_lars'}, goto:'roll_call'}
];

SCENES.seat_adam=[
  {cast:[['adam','smile']]},
  {s:'adam', t:'Oh, hey! Careful, don\'t knock them. This is Gianmarco, and this is Giuseppe.'},
  {t:'He holds up a pink strawberry-scented eraser and a green apple-scented one, completely seriously.'},
  {s:'adam', e:'grin', t:'Gianmarco handles pencil. Giuseppe handles the emotional damage. I\'m Adam.'},
  {t:'Adam has bright green eyes and a sporty quarter-zip. He looks like he\'d be just as at home at a table tennis table as in a library.'},
  {choice:[
    {t:'"Nice to meet you, Gianmarco. And Giuseppe."', aff:{adam:2}, then:[
      {s:'adam', e:'surprised', t:'You greeted them by name. Nobody greets them by name.'},
      {s:'adam', e:'happy', t:'Giuseppe likes you. I can tell.'}]},
    {t:'"You named your erasers?"', aff:{adam:1}, then:[
      {s:'adam', e:'smirk', t:'You don\'t name yours? How do you even call for them in an emergency?'}]},
  ]},
  {goto:'roll_call'}
];

SCENES.seat_fionn=[
  {cast:[['fionn','angry']]},
  {s:'fionn', t:'Hey, that\'s my bag! I mean, it\'s fine. It wasn\'t saving a seat. It was just resting. Bags need rest too.'},
  {t:'He scoops the bag up a little too quickly. Fionn has black hair, dark eyes and braces that flash when he talks. He is a little chubby (just a little, but you can tell) in a green football jersey.'},
  {s:'fionn', e:'neutral', t:'Fionn. Don\'t get the wrong idea. I just don\'t like empty seats next to me. They\'re creepy.'},
  {choice:[
    {t:'"So you WERE saving it."', aff:{fionn:2}, then:[
      {s:'fionn', e:'blush', t:'I was NOT! ...Okay, I saw your name on the transfer list and figured the new kid would need somewhere to sit. That\'s just logistics!'}]},
    {t:'"Thanks, Fionn. Seriously."', aff:{fionn:1}, then:[
      {s:'fionn', e:'blush', t:'D-don\'t thank me! Ugh. ...You\'re welcome.'}]},
  ]},
  {goto:'roll_call'}
];

SCENES.seat_milo=[
  {cast:[['milo','neutral']]},
  {t:'Low, rumbling cowbell music leaks from the boy\'s earbuds. He tugs one out.'},
  {s:'milo', t:'Milo.'},
  {t:'That\'s it. That\'s the introduction. He is very, very well dressed: camel coat, black turtleneck, hair perfectly in place.'},
  {choice:[
    {t:'"Is that phonk you\'re listening to?"', aff:{milo:2}, flag:'phonk_seen', then:[
      {s:'milo', e:'surprised', t:'...You know phonk?'},
      {s:'milo', e:'smirk', t:'Huh. Maybe you\'re not boring.'}]},
    {t:'"Nice coat."', aff:{milo:1}, then:[
      {s:'milo', e:'smirk', t:'I know.'}]},
  ]},
  {t:'The door opens and Daniel walks in late. Milo\'s gaze follows him all the way to his seat, then snaps back to the window.'},
  {goto:'roll_call'}
];

SCENES.roll_call=[
  {cast:[['josh','neutral']]},
  {t:'Meneer van der Meijs starts roll call. The boy in the orange hoodie beside your row answers before his name is even finished.'},
  {s:'josh', t:'Josh. Present. I\'ve also already finished the reading, made a summary and colour-coded it.'},
  {s:'josh', e:'grin', t:'Speaking of colours, did you know flamingos are only pink because of shrimp, and also I think I left my lunch on the bus, and also can I show you my train timetable app later?'},
  {t:'Josh is usually the calmest person in the room. Then his ADHD kicks in, and his brain picks five topics at once and talks about all of them.'},
  {s:'josh', e:'smile', t:'Sorry. I\'m back. Welcome to 5vb, {P}.'},
  {cast:[['natan','smile'],['lars','neutral'],['fionn','neutral']]},
  {t:'Natan slides into the seat beside Lars, ruffling his curls as he passes.'},
  {s:'natan', e:'grin', t:'Morning, Lars! Did you do the homework? Can I— no, wait, I did it myself this time. Look. Proud of me?'},
  {s:'lars', e:'neutral', t:'Natan, that\'s last week\'s homework.'},
  {s:'natan', e:'sad', t:'...Noooo.'},
  {t:'Natan laughs it off, but he keeps glancing sideways at Lars for a long time after.'},
  {if:G=>!G.flags.sat_lars && G.aff.lars<2 ? 'lars_moves' : null},
  {goto:'lunch'}
];

SCENES.lars_moves=[
  {cast:[['lars','neutral']]},
  {t:'At break, Lars asks Meneer van der Meijs something. Then he picks up his bag and moves to the seat directly behind yours.'},
  {s:'lars', t:'The window glare was affecting my grades. Purely academic decision.'},
  {t:'You hadn\'t noticed any glare. It is very cloudy.', eff:{flag:'g_seat', aff:{lars:1}}},
  {goto:'lunch'}
];

SCENES.lunch=[
  {bg:'cafeteria', ch:'Chapter 2 · Finding Your People', cast:[]},
  {t:'Lunch. Stroopwafel Day. The cafeteria is loud, and you have a tray and absolutely no plan.'},
  {cast:[['reshman','smirk']]},
  {s:'reshman', t:'Rule one of WidR: where you eat lunch decides who you become. Rule two: I made rule one up. Sit wherever.'},
  {choice:[
    {t:'The baseball table with Natan and Daniel.', aff:{natan:2}, then:[
      {cast:[['natan','grin'],['daniel','smile']]},
      {s:'natan', t:'{P}! Over here! Daniel, move your stuff.'},
      {s:'daniel', e:'smirk', t:'He\'s been telling everyone about your "nice wrist."'},
      {s:'natan', e:'blush', t:'In a baseball way!! It\'s a scouting observation!'},
      {s:'natan', e:'smile', t:'Hey, uh, is Lars coming to lunch today? He always eats on the rooftop. Alone. Not that I check.'},
      {t:'He definitely checks.'}]},
    {t:'The quiet table where Adam and Josh are quizzing each other.', aff:{adam:2}, then:[
      {cast:[['adam','smile'],['josh','smile']]},
      {s:'adam', t:'Quick, {P}: capital of Rankingland\'s third-ranked province?'},
      {s:'josh', t:'He\'s been doing this since Year One. It\'s Bovenstad, by the way.'},
      {s:'adam', e:'grin', t:'Josh! It was {P}\'s question! Giuseppe, look away, there\'s been a crime.'},
      {t:'Adam turns out to be surprisingly funny. He talks about yesterday\'s match like it was a thriller.'}]},
    {t:'Fionn\'s table, where he is guarding a suspicious amount of stroopwafels.', aff:{fionn:2}, then:[
      {cast:[['fionn','angry']]},
      {s:'fionn', t:'These are MINE. ...You can have one. Fine. Two. Don\'t look at me like that, take three.'},
      {s:'fionn', e:'smile', t:'Did you watch the match last night? The keeper was robbed. ROBBED! I wrote a three-page analysis.'},
      {t:'He gets so animated talking about it that he forgets to be grumpy for a full ten minutes.'}]},
    {t:'Follow the cowbell music. Milo\'s eating alone in the corner.', aff:{milo:1}, then:[
      {cast:[['milo','neutral']]},
      {s:'milo', t:'...You can sit. Don\'t talk during the drop.'},
      {t:'You wait for the drop. The table actually vibrates.'},
      {s:'milo', e:'smirk', t:'Okay. You passed.'},
      {t:'Across the room, Daniel laughs at something. Milo turns his music up.'}]},
  ]},
  {goto:'clubfair'}
];

SCENES.clubfair=[
  {bg:'hallway', cast:[['reshman','smile'],['josh','neutral']]},
  {t:'After lunch, the hallway turns into the WidR Club Fair. Every club wants you. Every club has a ranking.'},
  {s:'josh', t:'New students have to try one activity this week. I recommend the train club. We have zero members. It\'s very peaceful.'},
  {s:'reshman', e:'smirk', t:'Pick something with people in it, {P}.'},
  {choice:[
    {t:'Baseball practice on the field.', goto:'club_natan'},
    {t:'Volunteering at the Pawsome Cat Café.', goto:'club_lars'},
    {t:'Table tennis club (study session afterwards).', goto:'club_adam'},
    {t:'The "Sports Analysis Society" (watching matches with snacks).', goto:'club_fionn'},
    {t:'The music club on the rooftop.', goto:'club_milo'},
  ]},
];

SCENES.club_natan=[
  {bg:'field', cast:[['natan','grin'],['daniel','smile']]},
  {s:'natan', t:'YOU CAME! Okay, okay. Be cool, Natan. Welcome to practice.'},
  {t:'He hands you a glove and shows you how to stand, how to watch the ball, and how to not get hit by Daniel\'s pitches.'},
  {s:'daniel', e:'smirk', t:'I am a perfectly safe pitcher.'},
  {fx:'shake', t:'The ball goes straight over everyone\'s heads.'},
  {s:'natan', e:'smile', t:'See? Perfectly safe. For us. Not for the parking lot.'},
  {t:'Later, sitting in the grass, Natan goes quiet and looks toward the empty stands.'},
  {s:'natan', e:'sad', t:'Lars used to come watch. Back in Year One. He\'d sit up there reading and pretend he wasn\'t watching.'},
  {choice:[
    {t:'"You miss him being there."', aff:{natan:2}, flag:'natan_open', then:[
      {s:'natan', e:'shy', t:'...Yeah. Is that weird? He\'s my best friend. That\'s all. Probably. I don\'t know.'},
      {s:'natan', e:'smile', t:'Anyway! You\'re here now. That counts for a lot, {P}. Seriously.'}]},
    {t:'"Well, I\'m watching now. Show me your best throw."', aff:{natan:2}, then:[
      {s:'natan', e:'grin', t:'Oh, you asked for it.'},
      {t:'It\'s a beautiful throw. It hits Daniel in the back.'},
      {s:'daniel', e:'angry', t:'FIRST TIME IN THREE YEARS AND YOU DO IT NOW?!'},
      {s:'natan', e:'happy', t:'You\'re my good luck charm, {P}!'}]},
  ]},
  {eff:{rep:3}, goto:'ch3'}
];

SCENES.club_lars=[
  {bg:'catcafe', cast:[['lars','surprised']]},
  {s:'lars', t:'{P}?! What are you doing here?'},
  {t:'Lars is wearing a café apron over his white shirt. He\'s standing very, very far from every cat in the room.'},
  {s:'lars', e:'neutral', t:'I mean. Hello. I\'ve volunteered here for two years. Coincidence. Total coincidence that I swapped to your shift. I mean, that you swapped to my shift.'},
  {eff:{flag:'g_cafe'}},
  {t:'He hands you a feather toy. Eleven cats immediately notice you.'},
  {s:'lars', e:'smile', t:'That\'s Pannenkoek, that\'s Bitterbal, and the black one is Duchess. She\'s ranked number one in Rankingland\'s cutest cat list. She knows it.'},
  {t:'He talks about each cat with so much love that you almost miss how he keeps his hands tucked behind his back.'},
  {choice:[
    {t:'"Why don\'t you ever pet them?"', aff:{lars:2}, then:[
      {s:'lars', e:'shy', t:'It\'s... complicated. Something happens when I—'}]},
    {t:'Put a cat in his arms as a surprise.', aff:{lars:1}, flag:'cat_prank', then:[
      {s:'lars', e:'surprised', t:'WAIT, {P}, DON\'T—'}]},
  ]},
  {t:'Duchess leaps from the shelf, lands on Lars\'s shoulder, and rubs her face against his cheek.'},
  {fx:'flash', t:'POOF.'},
  {expr:{lars:['surprised','girl']}, fx:'sparkle', t:'Where Lars was standing, there\'s now a girl with the same blue eyes, the same curls (longer now), the same white shirt and skinny jeans.'},
  {s:'lars', e:'blush', t:'...So. This is the complicated part.'},
  {s:'lars', e:'neutral', t:'It happens when I touch cats. It wears off in an hour. Nobody knows except Natan. And now you.'},
  {choice:[
    {t:'"Your secret\'s safe with me. Want me to cover for you with the manager?"', aff:{lars:3}, flag:'lars_secret', then:[
      {s:'lars', e:'shy', t:'...You\'d do that?'},
      {t:'You spend the next hour telling the manager that "Lars\'s cousin" is filling in. The manager doesn\'t question it. Rankingland is like that.'},
      {s:'lars', e:'smile', t:'Thank you, {P}. Genuinely.'}]},
    {t:'"Honestly? It suits you."', aff:{lars:2}, flag:'lars_suits', then:[
      {s:'lars', e:'surprised', t:'...'},
      {s:'lars', e:'blush', t:'Don\'t say things like that so casually. I— I\'m analysing it. Analysing what you said. For science.'}]},
  ]},
  {expr:{lars:['neutral','']}, fx:'flash', t:'An hour later, the change wears off. Lars is back, scratching Duchess with one very careful glove.'},
  {s:'lars', e:'smirk', t:'For the record, you didn\'t see anything. You hallucinated. Café lighting. Very common.'},
  {eff:{rep:3}, goto:'ch3'}
];

SCENES.club_adam=[
  {bg:'gym', cast:[['adam','grin']]},
  {s:'adam', t:'You came to table tennis?! Okay, warm-up rule: if you miss, you have to say something nice about Gianmarco.'},
  {t:'Adam is fast. Ridiculously fast. You miss eleven times in a row.'},
  {s:'adam', e:'smirk', t:'Eleven compliments. Gianmarco has never felt so seen.'},
  {t:'Afterwards, you study together in the library. He explains Rankingland\'s ranking maths so clearly that it actually makes sense.'},
  {bg:'library'},
  {s:'adam', e:'smile', t:'People think studying is boring. But it\'s like a match. You learn their moves, then you beat them.'},
  {s:'adam', e:'sad', t:'My parents expect me to be top three this term. Sometimes I feel like Giuseppe is the only one who sees my mistakes and doesn\'t mind.'},
  {choice:[
    {t:'"You\'re more than your ranking, Adam."', aff:{adam:3}, flag:'adam_seen', then:[
      {s:'adam', e:'shy', t:'...Say that again? No. Don\'t. I\'ll get emotional on Giuseppe.'},
      {s:'adam', e:'smile', t:'Thanks, {P}. Really.'}]},
    {t:'"Then let\'s get you to top three. I\'ll quiz you."', aff:{adam:2}, then:[
      {s:'adam', e:'grin', t:'A study partner? A real one? Not just Josh, who reads ahead and spoils everything?'},
      {t:'You quiz him until the librarian kicks you both out.'}]},
  ]},
  {eff:{rep:3}, goto:'ch3'}
];

SCENES.club_fionn=[
  {bg:'living', cast:[['fionn','angry']]},
  {t:'The "Sports Analysis Society" turns out to be Fionn, a TV in his living room, and a mountain of snacks.'},
  {s:'fionn', t:'You\'re late. Not that I was waiting. The kickoff waited. Kickoffs are very patient.'},
  {t:'During the match, Fionn shouts at the referee, explains offside three times, and quietly slides the best snacks toward you.'},
  {s:'fionn', e:'smile', t:'When I like something, I go all in. Football. Sports. Pancakes. People. I don\'t do halfway.'},
  {s:'fionn', e:'sad', t:'Some guys in Year One used to joke about me being "the chubby one." I pretended I didn\'t care.'},
  {choice:[
    {t:'"Honestly, you look great. And you\'re the best person to watch a match with."', aff:{fionn:3}, flag:'fionn_kind', then:[
      {s:'fionn', e:'blush', t:'Sh-shut up! You can\'t just say that! ...Say it again so I can be annoyed properly.'}]},
    {t:'"Those guys were idiots. Want me to rank them on the idiot list?"', aff:{fionn:2}, then:[
      {s:'fionn', e:'grin', t:'HA! Number one: Jeroen. Number two: also Jeroen, he counts twice.'}]},
  ]},
  {t:'WidR scores. Fionn hugs you out of pure excitement, then lets go like you\'re on fire.'},
  {s:'fionn', e:'angry', t:'That was a SPORTS hug! It doesn\'t count!'},
  {eff:{rep:3}, goto:'ch3'}
];

SCENES.club_milo=[
  {bg:'rooftop', cast:[['milo','neutral']]},
  {t:'The "music club" is just Milo on the rooftop with a speaker and a lot of bass.'},
  {s:'milo', t:'Members: one. Applications: closed.'},
  {s:'milo', e:'smirk', t:'...You can audit.'},
  {choice:[
    {t:'"Play me your favourite track. Loud."', aff:{milo:2}, flag:'phonk', then:[
      {s:'milo', e:'surprised', t:'Nobody asks for loud.'},
      {fx:'shake', t:'The cowbell hits. Pigeons flee. Milo actually smiles.'},
      {s:'milo', e:'smile', t:'Okay. Okay. You\'re alright, {P}.'}]},
    {t:'"Can we turn it down a bit and just talk?"', aff:{milo:1}, then:[
      {s:'milo', e:'neutral', t:'Talking is overrated. ...Fine. Five minutes.'}]},
  ]},
  {t:'From up here you can see the football pitch. Daniel is running drills alone. Milo watches him like it\'s the only thing worth looking at.'},
  {choice:[
    {t:'Say nothing. Some things aren\'t yours to point out.', aff:{milo:2}, flag:'milo_trust', then:[
      {s:'milo', e:'shy', t:'...You saw that, didn\'t you. And you\'re not going to say anything.'},
      {s:'milo', e:'neutral', t:'Thanks. That\'s rarer than good taste.'}]},
    {t:'"You like Daniel, don\'t you?"', aff:{milo:-1}, flag:'milo_called', then:[
      {s:'milo', e:'angry', t:'I like his footwork. That\'s it. Drop it.'},
      {t:'He puts his earbuds back in. The conversation is over.'}]},
  ]},
  {eff:{rep:3}, goto:'ch3'}
];
