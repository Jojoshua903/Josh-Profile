// ---------- STORY PART 2: Chapters 3–8 ----------
const topChar=G=>['natan','lars','adam','fionn','milo'].reduce((a,b)=>G.aff[b]>G.aff[a]?b:a,'lars');
// Connection needed before someone says yes. Your WidR Ranking shifts it (see rankMod).
const BASE={natan:9, lars:7, adam:9, fionn:8, milo:12, mada:11, gian:7};
const need=k=>BASE[k]+rankMod();
const miloGate=G=>G.flags.phonk && G.flags.milo_trust && !G.flags.milo_called && myRank()<=5;
const canDate=(G,k)=>G.aff[k]>=need(k) && (k!=='milo' || miloGate(G)) && (k!=='mada' || myRank()<=3);
const avail=G=>ROM.filter(k=>visible(G,k) && !G.friend.includes(k) && !G.dating.includes(k) && !G.out.includes(k) && !(G.final && G.tried.includes(k)));
const afterConf=G=>G.ret;
function confessMenu(ret, noneText){
  return G=>avail(G).map(k=>({t:CHARS[k].name, do:G=>{G.ret=ret; if(G.final) G.tried.push(k);}, goto:'ask_'+k}))
    .concat(noneText?[{t:noneText, goto:ret}]:[]);
}

// ===== CHAPTER 3 =====
SCENES.ch3=[
  {bg:'classroom', ch:'Chapter 3 · The Festival Pitch', cast:[]},
  {t:`Two weeks pass. You learn the vending machine rankings, Natan's three different laughs, and that Josh's train app is actually incredible.`},
  {n:'Meneer van der Meijs', t:`5vb! The Winter Lights Festival is coming up. Each class runs one booth. Pitches, please. Then we vote.`},
  {cast:[['natan','grin'],['adam','smile'],['fionn','neutral']]},
  {s:'natan', t:`Batting cage! "Strike Out Your Stress." People hit balls, we rank their swings, everyone wins.`},
  {s:'adam', t:`A quiz booth. "Beat the Brain." Beat me at trivia, win a prize. Gianmarco and Giuseppe will be judges.`},
  {s:'fionn', e:'smile', t:`Food stall. Mini pancakes. I have a recipe. It's my grandma's. Don't make it weird.`},
  {cast:[['milo','smirk'],['lars','neutral'],['josh','neutral']]},
  {s:'milo', t:`Silent disco. Headphones. My playlist. You're welcome.`},
  {s:'lars', t:`A fortune-telling booth. I'll predict people's rankings using statistics and a crystal ball I borrowed from my aunt.`},
  {s:'josh', t:`I'll make the schedule for whatever wins. I already made five. Also, side note: do fortune tellers count as renewable energy, because they predict the future, which is technically—`},
  {s:'josh', e:'smile', t:`...Ignore me. Vote!`},
  {t:`Everyone looks at you. As the new student, you vote first.`},
  {choice:[
    {t:`Natan's batting cage.`, aff:{natan:2}, flag:'v_natan'},
    {t:`Adam's quiz booth.`, aff:{adam:2}, flag:'v_adam'},
    {t:`Fionn's pancake stall.`, aff:{fionn:2}, flag:'v_fionn'},
    {t:`Milo's silent disco.`, aff:{milo:2}, flag:'v_milo', do:G=>{if(G.flags.phonk)G.aff.milo+=1;}},
    {t:`Lars's fortune booth.`, aff:{lars:2}, flag:'v_lars'},
  ]},
  {t:`The votes come in. It's a tie between your pick and one other booth. Only Lars hasn't voted yet.`},
  {cast:[['lars','neutral']]},
  {s:'lars', t:`I vote for {P}'s choice. It's the statistically optimal booth.`, eff:{flag:'g_vote'}},
  {s:'lars', e:'smirk', t:`Don't look at me like that. I ran the numbers.`},
  {t:`You're fairly sure he didn't run any numbers. There's nothing on his desk except a doodle of a cat.`},
  {t:`Word gets around that the new kid picked the winning booth.`, eff:{rep:8}},
  {rank:'Festival Rankings'},
  {goto:'rain'}
];

SCENES.rain=[
  {bg:'rain', ch:'', cast:[]},
  {t:`After school, the sky opens. You forgot your umbrella. Of course you did.`},
  {if:G=>'rain_'+topChar(G)}
];
SCENES.rain_natan=[
  {cast:[['natan','grin']]},
  {s:'natan', t:`{P}! Get under here!`},
  {t:`He holds his varsity jacket over both your heads. It doesn't really work. You're both soaked and laughing.`},
  {s:'natan', e:'neutral', t:`Can I ask you something? Hypothetically. If a friend liked someone, but was scared it'd ruin everything... should they say it?`},
  {choice:[
    {t:`"They should say it. Being scared is part of it."`, aff:{natan:2}, flag:'natan_brave', then:[
      {s:'natan', e:'smile', t:`Yeah. Maybe. Thanks, {P}. You make things feel simpler.`}]},
    {t:`"Maybe they should figure out who they really look for first."`, aff:{natan:2}, then:[
      {s:'natan', e:'shy', t:`...Who they look for. Huh.`},
      {t:`He looks at you for a long second, then at the rain.`}]},
  ]},
  {goto:'ch4'}
];
SCENES.rain_lars=[
  {cast:[['lars','surprised']]},
  {s:'lars', t:`Oh! {P}. What a coincidence. I happened to be at this exact bus stop at this exact time.`},
  {t:`He opens one umbrella. Just one. Big enough for two, if you stand close.`},
  {s:'lars', e:'neutral', t:`I only have the one. Forgot my second. Tragic.`, eff:{flag:'g_umbrella'}},
  {t:`Later, when he opens his bag for his bus card, you spot a second umbrella inside. Folded. Brand new. Dry.`},
  {choice:[
    {t:`Say nothing. Just enjoy the walk.`, aff:{lars:2}, then:[
      {s:'lars', e:'smile', t:`...This is nice. The rain, I mean. Rain is nice. Statistically.`}]},
    {t:`"Lars, there's an umbrella in your bag."`, aff:{lars:2}, then:[
      {s:'lars', e:'surprised', t:`That's a decoy. For decoy purposes.`},
      {s:'lars', e:'blush', t:`Very advanced umbrella strategy. You wouldn't understand.`}]},
  ]},
  {goto:'ch4'}
];
SCENES.rain_adam=[
  {cast:[['adam','smile']]},
  {s:'adam', t:`Here, take my hood. Gianmarco's in a waterproof pocket, so my priorities are secured.`},
  {t:`He talks about last night's table tennis final like it's an action film, sound effects included.`},
  {s:'adam', e:'neutral', t:`Can I tell you something? I got my mid-term results today. Fourth in the year.`},
  {choice:[
    {t:`"Fourth in the whole year? That's amazing."`, aff:{adam:2}, then:[
      {s:'adam', e:'shy', t:`...Nobody's said "amazing" about fourth before.`}]},
    {t:`"Then we'll study together until it's third."`, aff:{adam:2}, then:[
      {s:'adam', e:'grin', t:`Deal. Giuseppe is witness. It's legally binding.`}]},
  ]},
  {goto:'ch4'}
];
SCENES.rain_fionn=[
  {cast:[['fionn','angry']]},
  {s:'fionn', t:`You're soaking! Ugh. Here.`},
  {t:`He throws his hoodie at your face. It's warm and smells like pancakes.`},
  {s:'fionn', e:'blush', t:`It's too small for me anyway! Not because I care if you catch a cold! Colds are just... inefficient.`},
  {choice:[
    {t:`"Thanks, Fionn. You're really sweet, you know."`, aff:{fionn:2}, then:[
      {s:'fionn', e:'angry', t:`I'M NOT SWEET! I'm savoury! Like a strong, savoury pancake!`}]},
    {t:`Put it on. "I'm keeping this."`, aff:{fionn:2}, flag:'fionn_hoodie', then:[
      {s:'fionn', e:'surprised', t:`You can't just KEEP it!`},
      {s:'fionn', e:'shy', t:`...Fine. It looks better on you anyway. Shut up.`}]},
  ]},
  {goto:'ch4'}
];
SCENES.rain_milo=[
  {cast:[['milo','neutral']]},
  {t:`Milo is under the bus shelter. Without a word, he offers you one earbud.`},
  {t:`It isn't phonk. It's slow and soft, piano under gentle rain.`},
  {s:'milo', e:'shy', t:`I made it. Don't tell anyone. It ruins the image.`},
  {if:G=>G.flags.milo_trust?'rain_milo2':null},
  {s:'milo', e:'smirk', t:`Bus is here. See you, {P}.`, eff:{aff:{milo:1}}},
  {goto:'ch4'}
];
SCENES.rain_milo2=[
  {s:'milo', e:'sad', t:`You know who it's about. You're the only one who noticed and didn't make it a joke.`},
  {s:'milo', t:`He's never going to look at me like that. I've known for a year.`},
  {choice:[
    {t:`"Maybe it's okay to look somewhere new."`, aff:{milo:3}, flag:'milo_hope', then:[
      {s:'milo', e:'shy', t:`...Maybe.`},
      {t:`He doesn't take the earbud back for the whole ride.`}]},
    {t:`"You won't know unless you tell him."`, aff:{milo:1}, flag:'milo_push', then:[
      {s:'milo', e:'neutral', t:`Maybe one day. When I'm braver.`}]},
  ]},
  {goto:'ch4'}
];

// ===== CHAPTER 4 =====
SCENES.ch4=[
  {bg:'hallway', ch:'Chapter 4 · Winter Lights Festival', cast:[['reshman','grin'],['josh','smile']]},
  {t:`Festival day. WidR is covered in lanterns, flags and ranking boards for every stall.`},
  {s:'josh', t:`Our booth is running perfectly. I scheduled you a free hour, {P}. Hour three. Use it wisely. Or chaotically. Both are valid.`},
  {s:'reshman', e:'smirk', t:`Festivals are where rankings are made. Go be seen.`},
  {t:`Who do you spend your free hour with?`},
  {choice:[
    {t:`Find Natan at the batting cage.`, goto:'fest_natan'},
    {t:`Wander the stalls with Lars.`, goto:'fest_lars'},
    {t:`Check on Adam. He looks panicked.`, goto:'fest_adam'},
    {t:`Visit Fionn behind the pancake grill.`, goto:'fest_fionn'},
    {t:`Go to the DJ booth with Milo.`, goto:'fest_milo'},
  ]},
];
SCENES.fest_natan=[
  {bg:'field', cast:[['natan','grin']]},
  {s:'natan', t:`Okay, stance, eyes on the ball... now SWING!`},
  {fx:'flash', t:`CRACK. The ball sails over the fence. Half the school sees it.`, eff:{rep:6}},
  {s:'natan', e:'happy', t:`{P}!!! THAT'S A HOME RUN!`},
  {t:`He lifts you clean off the ground, then sets you down, a little embarrassed.`},
  {s:'natan', e:'shy', t:`I used to always look up at the rooftop to see if Lars was there. Today I forgot to look. I was busy watching you.`, eff:{aff:{natan:3}}},
  {goto:'fireworks'}
];
SCENES.fest_lars=[
  {bg:'hallway', cast:[['lars','smile']]},
  {s:'lars', t:`I have exactly fifty-eight minutes until my booth shift. Not that I planned this.`},
  {t:`You win him a stuffed cat at the ring toss. He holds it like it's made of glass. It's not a real cat, so nothing happens.`},
  {s:'lars', e:'smirk', t:`Let me read your fortune. Free of charge.`},
  {s:'lars', e:'neutral', t:`I see... a party. Soon. And someone there will tell you something important.`},
  {s:'lars', e:'shy', t:`Probably. Statistically. The crystal ball is borrowed, so no refunds.`, eff:{aff:{lars:3}, rep:2, flag:'g_festival'}},
  {goto:'fireworks'}
];
SCENES.fest_adam=[
  {bg:'classroom', cast:[['adam','surprised']]},
  {s:'adam', t:`{P}! Code red. Gianmarco is missing. I had him at the quiz booth and now he's GONE.`},
  {t:`You search together. Under desks. In the recycling. Inside a suspicious pancake.`},
  {cast:[['adam','sad'],['josh','surprised']]},
  {s:'josh', t:`Oh. Is this him? He was in my hoodie pocket. I got distracted thinking about strawberries and— yeah. Sorry, Adam.`},
  {cast:[['adam','happy']]},
  {s:'adam', t:`GIANMARCO! Oh, buddy. You smell so strawberry.`},
  {s:'adam', e:'smile', t:`Thank you, {P}. You didn't laugh. You just helped.`, eff:{aff:{adam:3}, rep:3}},
  {goto:'fireworks'}
];
SCENES.fest_fionn=[
  {bg:'cafeteria', cast:[['fionn','neutral']]},
  {s:'fionn', t:`You came to my stall. Obviously. Everyone does. We're ranked number one.`},
  {t:`He hands you a pancake. It's shaped like the first letter of your name.`, eff:{rep:3}},
  {s:'fionn', e:'blush', t:`It's a random letter! The batter went that way! Pancakes have free will!`},
  {choice:[
    {t:`"It's perfect. Make me another one?"`, aff:{fionn:3}, then:[
      {s:'fionn', e:'smile', t:`...Yeah. Okay. As many as you want.`}]},
    {t:`"Fionn, I can tell you practised this."`, aff:{fionn:2}, then:[
      {s:'fionn', e:'angry', t:`I did NOT practise for three nights!`},
      {s:'fionn', e:'shy', t:`...Two nights.`}]},
  ]},
  {goto:'fireworks'}
];
SCENES.fest_milo=[
  {bg:'rooftop', cast:[['milo','smirk']]},
  {s:'milo', t:`Silent disco's on break. Want to press the button?`},
  {t:`He lets you hit the drop. Forty people in headphones jump at once. Everyone wants to know who you are.`, eff:{rep:5}},
  {s:'milo', e:'smile', t:`See? Phonk unites people.`, do:G=>{G.aff.milo+=G.flags.phonk?3:2;}},
  {s:'milo', e:'neutral', t:`Daniel's down there. Usually I'd be watching him. Right now I'm kind of... not.`},
  {goto:'fireworks'}
];
SCENES.fireworks=[
  {bg:'night', ch:'', cast:[['natan','smile'],['lars','neutral'],['milo','neutral']]},
  {t:`Nightfall. The whole class gathers on the field to watch the fireworks.`},
  {t:`Natan stands next to Lars. Milo stands a careful one step away from Daniel.`},
  {s:'lars', t:`The view is better over here. Objectively.`},
  {t:`Lars steps away from Natan and ends up right beside you. Natan's smile fades just a little.`, eff:{flag:'g_firework'}},
  {fx:'sparkle', t:`BOOM. The sky fills with gold.`},
  {t:`Who do you stand closest to?`},
  {choice:[
    {t:`Natan.`, aff:{natan:2}, then:[{cast:[['natan','happy']]},{s:'natan',t:`Best festival ever. Seriously.`}]},
    {t:`Lars, who's already beside you.`, aff:{lars:2}, then:[{cast:[['lars','shy']]},{s:'lars',t:`Pure coincidence. ...I'm glad, though.`}]},
    {t:`Adam.`, aff:{adam:2}, then:[{cast:[['adam','smile']]},{s:'adam',t:`Gianmarco and Giuseppe are watching too. They say hi.`}]},
    {t:`Fionn.`, aff:{fionn:2}, then:[{cast:[['fionn','blush']]},{s:'fionn',t:`You came over here? Fine. Stay. I mind a normal amount.`}]},
    {t:`Milo.`, aff:{milo:2}, then:[{cast:[['milo','shy']]},{s:'milo',t:`...These would go hard with a bass drop.`}]},
  ]},
  {goto:'ch5'}
];

// ===== CHAPTER 5: Christmas party (first chance) =====
SCENES.ch5=[
  {bg:'party', ch:'Chapter 5 · The Christmas Party', cast:[['fionn','grin']]},
  {t:`The last day before the Christmas break. Fionn throws a party, and somehow all of 5vb fits into his living room.`},
  {s:'fionn', t:`Shoes off! Snacks on the left! Anyone who spills on the sofa gets ranked last in life!`},
  {cast:[['reshman','smirk'],['josh','grin'],['daniel','smile']]},
  {s:'reshman', t:`Look at you, {P}. One term in and people actually know your name.`, eff:{rep:5}},
  {s:'josh', t:`I made a party playlist, a snack schedule and a mini train map of Fionn's house. The kitchen is the central station.`},
  {s:'daniel', e:'smile', t:`Glad you transferred here, {P}. Things got more fun.`},
  {rank:'Christmas Rankings'},
  {bg:'night', cast:[]},
  {t:`Later, you step out onto the porch for some air. There's someone you've been thinking about all term. Do you go and talk to them?`},
  {choice:confessMenu('ch6', `Not yet. Go back in and enjoy the party.`)},
];

// ===== CHAPTER 6: Winter term, climbing the ranking =====
SCENES.ch6=[
  {bg:'hallway', ch:'Chapter 6 · Winter Term', cast:[['reshman','neutral']]},
  {t:`January. The new term starts and fresh rankings go up in the hallway.`},
  {rank:'New Year Rankings'},
  {s:'reshman', t:G=>myRank()<=5?`Top five, {P}? Okay, I see you. Keep it up. Rankings lock on Valentine's Day.`:`Six weeks until Valentine's Day, {P}. Then the rankings lock. If you want to climb, now's the time.`},
  {s:'reshman', e:'smirk', t:`Sign up for stuff. Get seen. Help people. That's how it works here.`},
  {t:`You have time for two big things this term. What's the first?`},
  {goto:'act_pick'}
];
const ACTS=[
  {k:'rep', t:`Run for class representative.`},
  {k:'play', t:`Audition for the school play.`},
  {k:'tour', t:`Join the winter sports tournament.`},
  {k:'tutor', t:`Tutor first-years with Josh.`},
];
SCENES.act_pick=[
  {choice:G=>ACTS.filter(a=>!G.flags['act_'+a.k]).map(a=>({t:a.t, flag:'act_'+a.k, goto:'act_'+a.k}))}
];
const actDone=G=>{G.acts=(G.acts||0)+1; return G.acts>=2?'ice':'act_next';};
SCENES.act_next=[{bg:'hallway', cast:[]},{t:`One more thing before Valentine's Day. What next?`},{goto:'act_pick'}];
SCENES.act_rep=[
  {bg:'classroom', cast:[['adam','grin']]},
  {s:'adam', t:`You're running for class rep? I'm writing your speech. Non-negotiable. Giuseppe will remove any weak sentences.`},
  {t:`The speech is short, funny and promises better vending machine rankings. 5vb votes you in by a landslide.`, eff:{rep:12, aff:{adam:2}}},
  {s:'adam', e:'happy', t:`Class Representative {P}! I'm so proud. Gianmarco is weeping.`},
  {goto:actDone}
];
SCENES.act_play=[
  {bg:'gym', cast:[['lars','surprised'],['milo','smirk']]},
  {t:`You get cast as the lead in the school play. Your co-lead, by "complete coincidence", is Lars.`, eff:{flag:'g_play'}},
  {s:'lars', t:`I only auditioned because the drama club needed someone with stage presence. That's all.`},
  {s:'milo', t:`I'm doing the soundtrack. There's a phonk remix of the sword fight. Don't argue.`},
  {t:`Opening night is a hit. The whole school talks about the sword fight remix for weeks.`, eff:{rep:10, aff:{lars:2, milo:1}}, do:G=>{if(G.flags.phonk)G.aff.milo+=1;}},
  {s:'lars', e:'shy', t:`You were really good. Objectively. I'm just stating data.`},
  {goto:actDone}
];
SCENES.act_tour=[
  {bg:'field', cast:[['natan','grin'],['daniel','smile'],['fionn','angry']]},
  {t:`You join the winter sports tournament with Natan and Daniel. Fionn shows up with a giant sign that says "GO {P}" and then claims it says "GO TEAM."`},
  {s:'fionn', t:`It's a team sign! Your name is just... part of the team!`},
  {s:'natan', e:'happy', t:`Last inning, {P}! You've got this!`},
  {fx:'flash', t:`You make the winning catch. WidR wins its first winter trophy in years.`, eff:{rep:10, aff:{natan:2, fionn:1}}},
  {s:'daniel', e:'grin', t:`Okay, that was actually amazing. Football next?`},
  {goto:actDone}
];
SCENES.act_tutor=[
  {bg:'library', cast:[['josh','smile'],['adam','smile']]},
  {s:'josh', t:`Rule one of tutoring: be patient. Rule two: if I start talking about trains, gently say "Josh."`},
  {t:`The first-years love you. One of them draws a picture of you as a superhero. It gets pinned up in the hallway.`, eff:{rep:6, aff:{adam:1}}},
  {s:'adam', t:`You're really good at explaining things. Like, better than me. Don't tell Giuseppe I said that.`},
  {goto:actDone}
];
SCENES.ice=[
  {bg:'ice', ch:'Chapter 6 · Winter Term', cast:[['fionn','surprised'],['josh','grin']]},
  {t:`At the end of January, 5vb goes ice skating. Fionn falls over three times and blames the ice each time.`},
  {s:'fionn', t:`The ice is RIGGED!`},
  {s:'josh', t:`Fun fact: ice is slippery because of a thin layer of— oh, a duck. Hi, duck.`},
  {cast:[]},
  {t:G=>G.dating.length?`You skate a slow lap on your own. You're already dating ${CHARS[G.dating[0]].name}... but someone else is skating towards you, and you know they like you.`:`You skate a slow lap. Someone you've been thinking about is skating towards you.`},
  {choice:confessMenu('ch7', `Skate back to your friends.`)},
];

// ===== CHAPTER 7: Valentine's Day =====
SCENES.ch7=[
  {bg:'hallway', ch:`Chapter 7 · Valentine's Day`, cast:[]},
  {t:`February 14th. The hallway is full of paper hearts, and the final rankings get locked at the end of today.`},
  {if:G=>G.dating.length>=2?'val_caught':G.dating.length===1?'val_one':'val_none'}
];
SCENES.val_caught=[
  {cast:G=>[[G.dating[0],'smile'],[G.dating[1],'smile']]},
  {t:G=>`At your locker, ${CHARS[G.dating[0]].name} and ${CHARS[G.dating[1]].name} arrive at exactly the same time. Both are holding chocolates. Both are holding them out to you.`},
  {do:G=>{setExpr(G.dating[0],'surprised');setExpr(G.dating[1],'surprised');}, t:G=>`They look at each other. Then at the chocolates. Then at you.`},
  {s:'P', t:`I can explain.`},
  {do:G=>{setExpr(G.dating[0],'angry');setExpr(G.dating[1],'angry');}, fx:'shake', t:G=>`You can't. The whole hallway has gone silent. Someone is filming. ${CHARS[G.dating[0]].name} drops the chocolates on the floor.`},
  {cast:[['josh','surprised'],['reshman','surprised']]},
  {s:'josh', t:`Oh no. Oh no, this is going straight on the ranking.`},
  {s:'reshman', e:'sad', t:`{P}... I literally warned you on day one.`},
  {eff:{rep:-30, force:true}, do:G=>{G.out.push(...G.dating); G.dating=[]; G.flags.caught=true;}},
  {rank:`Valentine's Day Scandal`},
  {t:`By lunch, everyone at WidR knows. Neither of them will speak to you.`},
  {goto:'val_lock'}
];
SCENES.val_one=[
  {cast:G=>[[G.dating[0],'happy']]},
  {t:G=>`${CHARS[G.dating[0]].name} is waiting at your locker with a small box of chocolates.`},
  {if:G=>'val_'+G.dating[0]},
];
SCENES.val_natan=[{s:'natan', t:`I tried to make them baseball-shaped. They look like potatoes. Happy Valentine's Day, {P}.`, eff:{rep:4}},{goto:'val_lock'}];
SCENES.val_lars=[{s:'lars', t:`These were the statistically best chocolates in Rankingland. I checked forty reviews. Happy Valentine's.`, eff:{rep:4}},{goto:'val_lock'}];
SCENES.val_adam=[{s:'adam', t:`Strawberry and green apple. Gianmarco and Giuseppe picked the flavours. Happy Valentine's Day.`, eff:{rep:4}},{goto:'val_lock'}];
SCENES.val_fionn=[{s:'fionn', e:'blush', t:`These were on SALE! It's not a big deal! ...I made the card myself. Don't read it in front of me.`, eff:{rep:4}},{goto:'val_lock'}];
SCENES.val_milo=[{s:'milo', e:'shy', t:`No chocolates. I made you a track instead. It's on your phone. Don't play it in public.`, eff:{rep:4}},{goto:'val_lock'}];
SCENES.val_none=[
  {cast:[['josh','smile']]},
  {t:G=>{const r=myRank(); return r<=3?`Your locker is overflowing with chocolates. Being near the top of the ranking has its perks.`:r<=6?`There's a handful of chocolates in your locker. Not bad for the new kid.`:r<=9?`There are two chocolates in your locker. One is slightly squashed.`:`There's one chocolate in your locker. It's from Josh.`;}},
  {s:'josh', t:G=>myRank()>9?`It's a statistical courtesy. Everyone deserves one. Happy Valentine's Day, {P}.`:`Happy Valentine's Day, {P}! I gave everyone a chocolate. It's more efficient that way.`},
  {t:`This is your last chance before the rankings lock. Is there someone you want to find today?`},
  {choice:confessMenu('val_lock', `Not today.`)},
];
SCENES.val_lock=[
  {bg:'hallway', cast:[['reshman','neutral']]},
  {t:`At the end of the day, Meneer van der Meijs pins up the final rankings. Locked until next year.`},
  {do:G=>{G.fscore=score(); G.frozen=true;}},
  {rank:'Final Rankings (Locked)'},
  {s:'reshman', t:G=>myRank()<=6?`That's a solid spot, {P}. People notice you now.`:`It is what it is, {P}. The ranking's locked. Now it's about who actually knows you.`},
  {goto:'ch8'}
];

// ===== CHAPTER 8: End-of-Year Ball (final chance) =====
SCENES.ch8=[
  {bg:'sunset', ch:'Chapter 8 · The End-of-Year Ball', cast:[['josh','happy'],['reshman','grin'],['daniel','smile']]},
  {t:`June. The End-of-Year Ball is held on the school terrace at sunset. Fairy lights, a slightly bad DJ, and all of 5vb dressed up.`},
  {s:'josh', t:`I timed the sunset. Peak golden hour is in four minutes. Plan accordingly.`},
  {do:G=>{G.final=true;}},
  {if:G=>G.dating.length===1?'ball_partner':'ball_menu'}
];
SCENES.ball_partner=[
  {cast:G=>[[G.dating[0],'happy']]},
  {t:G=>`${CHARS[G.dating[0]].name} finds you at the edge of the terrace, right on time for golden hour.`},
  {if:G=>'end_'+G.dating[0]}
];
SCENES.ball_menu=[
  {bg:'sunset', cast:[]},
  {if:G=>avail(G).length?null:'repeat_year'},
  {t:G=>G.tried.length?`The night isn't over yet. Is there someone else you want to talk to?`:`Tonight is the last chance this year. Who do you go and find?`},
  {choice:confessMenu('ball_menu')},
];
SCENES.repeat_year=[
  {bg:'gate', ch:'Another Year at WidR', cast:[['reshman','smile']]},
  {t:`The ball ends. Summer comes and goes. Your story at WidR isn't finished yet.`},
  {t:`September. 6 VWO begins. Same school, same faces, and a fresh ranking cycle.`},
  {s:'reshman', t:`New year, new rankings, {P}. Everyone gets a second chance at WidR. Even you.`},
  {do:G=>{G.out=[]; G.tried=[]; G.final=false; G.frozen=false; G.fscore=null; G.acts=0; ACTS.forEach(a=>delete G.flags['act_'+a.k]); G.rep=Math.max(G.rep,45);}},
  {goto:'ch6'}
];
