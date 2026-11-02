// ---------- STORY PART 3: Confessions, consequences and canon endings ----------
// A "yes" before the ball means you start dating and the story carries on.
// A "yes" at the ball (or the ball with your partner) finishes that person's canon storyline.
const yesThen=k=>[
  {if:G=>G.final?'end_'+k:null},
  {do:G=>{G.dating.push(k);}, eff:{rep:6}},
  {t:G=>G.dating.length>1?`You're now dating ${G.dating.map(d=>CHARS[d].name).join(' AND ')}. Nobody else knows... yet. Valentine's Day is coming.`:`You and ${CHARS[k].name} are officially together. The news reaches the WidR Ranking by Monday.`},
  {goto:afterConf}
];
const outThen=k=>[{do:G=>{G.out.push(k);}},{goto:afterConf}];
const lateLine=(G,txt)=>G.final?`It's too late now, {P}. The year's over. `+txt:txt;

// ----- NATAN -----
SCENES.conf_natan=[
  {cast:[['natan','smile']]},
  {s:'natan', t:`Hey, {P}! I was hoping you'd come over.`},
  {if:G=>canDate(G,'natan')?null:'fail_natan'},
  {s:'natan', e:'shy', t:`Can I say something? I've been weird about Lars for a long time. I always look for him.`},
  {s:'natan', e:'neutral', t:`But lately... the person I look for in the stands is you. Every time. I didn't plan that.`},
  {s:'natan', e:'blush', t:`{P}, will you go out with me?`},
  {choice:[
    {t:`"Yes. I'd really like that."`, then:[{cast:[['natan','happy']], fx:'sparkle'},{s:'natan', t:`YES?! Okay. Be cool, Natan. ...I'm not being cool. I don't care!`}], goto:'yes_natan'},
    {t:`"I'm sorry, Natan. I don't feel the same."`, goto:'no_natan'},
  ]},
];
SCENES.yes_natan=yesThen('natan');
SCENES.no_natan=[
  {cast:[['natan','sad']]},
  {s:'natan', t:`...Yeah. Okay. That's fair. Thanks for being honest, {P}.`},
  {t:`He sits for a while. Then something in his face changes, like a decision being made.`},
  {s:'natan', e:'neutral', t:`You know what? Being scared is part of it, right? I'm going to stop being scared.`},
  {cast:[['natan','shy'],['lars','surprised']]},
  {t:`You watch Natan walk straight up to Lars and say something. Lars blinks. Then, slowly, he nods.`},
  {t:`The next day, Natan and Lars sit together at lunch. Natan still waves at you every morning and calls you his good luck charm.`},
  ...outThen('natan')
];
SCENES.fail_natan=[
  {s:'P', t:`Natan... I think I like you. As more than a friend.`},
  {cast:[['natan','surprised']]},
  {s:'natan', e:'sad', t:G=>lateLine(G,`I think you're awesome. But I don't know you well enough yet to feel the same. And there's someone I've never stopped looking for.`)},
  {t:G=>G.final?`It stings. But the night goes on.`:`It stings. But Natan is still Natan: the next morning he throws you a ball across the hallway like nothing happened. Maybe there's still time.`},
  {goto:afterConf}
];

// ----- LARS -----
SCENES.conf_lars=[
  {cast:[['lars','surprised']]},
  {t:`You find Lars on his own. A fluffy grey cat is sitting next to him, staring at him very intently.`},
  {s:'lars', t:`{P}. Hi. I'm in a standoff with this cat. I'm winning.`},
  {if:G=>canDate(G,'lars')?null:'fail_lars'},
  {s:'lars', e:'neutral', t:`Actually, I need to tell you something. And this isn't a genius move. It's the opposite.`},
  {s:'lars', e:'shy', t:`I've liked you since the first day you walked into 5vb. Everything was on purpose.`},
  {if:G=>G.flags.g_seat?'lars_r1':'lars_r2'}
];
SCENES.lars_r1=[{s:'lars', e:'blush', t:`The "window glare." There was no glare. I just wanted to sit behind you.`},{goto:'lars_r2'}];
SCENES.lars_r2=[{if:G=>G.flags.g_cafe?'lars_r2a':'lars_r3'}];
SCENES.lars_r2a=[{s:'lars', e:'shy', t:`I swapped my café shift to be with you. I've never swapped a shift in two years.`},{goto:'lars_r3'}];
SCENES.lars_r3=[
  {s:'lars', e:'smirk', t:`The tie-breaking vote for the booth? I didn't run any numbers. I voted for whatever you voted for.`},
  {if:G=>G.flags.g_umbrella?'lars_r3a':'lars_r4'}];
SCENES.lars_r3a=[{s:'lars', e:'blush', t:`And yes. I had two umbrellas. I knew you saw it. I nearly died.`},{goto:'lars_r4'}];
SCENES.lars_r4=[{if:G=>G.flags.g_play?'lars_r4a':'lars_r5'}];
SCENES.lars_r4a=[{s:'lars', e:'shy', t:`The school play. I've never acted in my life. I saw your name on the audition list and signed up five minutes later.`},{goto:'lars_r5'}];
SCENES.lars_r5=[
  {s:'lars', e:'neutral', t:`Even at the fireworks. "The view is better over here." The view was you. That's embarrassingly poetic. I'm aware.`},
  {s:'lars', e:'shy', t:`So. {P}. Will you go out with me? No strategy. Just asking.`},
  {choice:[
    {t:`"Yes. And I can't believe I never noticed."`, then:[{cast:[['lars','happy']], fx:'sparkle'},{s:'lars', t:`You didn't notice because I'm a genius. But I'm really, really glad you said yes.`}], goto:'yes_lars'},
    {t:`"Lars... I'm sorry. I don't feel that way."`, goto:'no_lars'},
  ]},
];
SCENES.yes_lars=yesThen('lars');
SCENES.no_lars=[
  {cast:[['lars','sad']]},
  {s:'lars', t:`...Okay.`},
  {s:'lars', e:'smirk', t:`Genius move: I'm going to pretend that didn't hurt, and then go and pet this cat.`},
  {fx:'flash', expr:{lars:['sad','girl']}, t:`POOF.`},
  {cast:[['lars','sad','girl'],['natan','neutral']]},
  {t:`A few minutes later, Natan sits down next to Lars without a word and stays until the change wears off.`},
  {t:`Lars is polite to you after that. Friendly, even. But the genius moves stop.`},
  ...outThen('lars')
];
SCENES.fail_lars=[
  {s:'P', t:`Lars, I like you. Maybe more than a friend.`},
  {cast:[['lars','surprised']]},
  {s:'lars', e:'neutral', t:`That's... a very interesting hypothesis.`},
  {s:'lars', e:'smirk', t:G=>G.final?`But I need more data, and we've run out of school year. Bad timing. Statistically tragic.`:`I need more data before I can respond. Ask me again later. Bring evidence.`},
  {t:`He says it smoothly. Then he looks at the cat for a long time and doesn't look at you at all.`},
  {goto:afterConf}
];

// ----- ADAM -----
SCENES.conf_adam=[
  {cast:[['adam','smile']]},
  {s:'adam', t:`Hey, {P}. I'm explaining the offside rule to Gianmarco. He keeps getting it wrong.`},
  {if:G=>canDate(G,'adam')?null:'fail_adam'},
  {s:'adam', e:'shy', t:`Actually, I have something for you.`},
  {t:`He takes out a third eraser. It's peach-scented and still in its wrapper.`},
  {s:'adam', e:'blush', t:`Gianmarco and Giuseppe held a vote. It was unanimous. This one is named {P}.`},
  {s:'adam', t:`What I'm trying to say is: I like you. More than studying. More than table tennis. Will you go out with me?`},
  {choice:[
    {t:`"Yes. Tell Gianmarco and Giuseppe I said hi."`, then:[{cast:[['adam','happy']], fx:'sparkle'},{s:'adam', t:`They heard. They're thrilled. Everyone in this pencil case is thrilled.`}], goto:'yes_adam'},
    {t:`"Adam, I'm sorry. I see you as a friend."`, goto:'no_adam'},
  ]},
];
SCENES.yes_adam=yesThen('adam');
SCENES.no_adam=[
  {cast:[['adam','sad']]},
  {s:'adam', t:`Oh. That's okay. Giuseppe's here for mistakes.`},
  {s:'adam', e:'surprised', t:`Not that YOU'RE a mistake! I meant me. No, I'm not a mistake either. Nobody's a mistake. Okay.`},
  {t:`Later you see him using Giuseppe to quietly rub out a tiny heart in the corner of his planner. He's still your study partner. The peach eraser stays in its wrapper.`},
  ...outThen('adam')
];
SCENES.fail_adam=[
  {s:'P', t:`Adam, I think I like you. As more than a study buddy.`},
  {cast:[['adam','surprised']]},
  {s:'adam', e:'shy', t:G=>lateLine(G,`That's really kind. But I don't think I know you well enough yet. I'd rather get it right than rush it. Like an exam.`)},
  {goto:afterConf}
];

// ----- FIONN -----
SCENES.conf_fionn=[
  {cast:[['fionn','angry']]},
  {s:'fionn', t:`Why are you over here?! Go enjoy yourself!`},
  {if:G=>canDate(G,'fionn')?null:'fail_fionn'},
  {s:'fionn', e:'blush', t:`...Unless you came to see me. Which would be stupid. Very stupid. Did you?`},
  {s:'fionn', e:'angry', t:`Okay, fine! It's not like I like you or anything!`},
  {s:'fionn', e:'shy', t:`...I do. I really, really do. When I like something I go all in, and I'm all in on you.`},
  {s:'fionn', e:'blush', t:`So... go out with me. Please. Ugh, I said please. This is the worst.`},
  {choice:[
    {t:`"Yes, Fionn. Absolutely yes."`, then:[{cast:[['fionn','happy']], fx:'sparkle'},{s:'fionn', t:`R-really?! I mean. Obviously. Who wouldn't.`}], goto:'yes_fionn'},
    {t:`"I'm sorry... I don't like you like that."`, goto:'no_fionn'},
  ]},
];
SCENES.yes_fionn=yesThen('fionn');
SCENES.no_fionn=[
  {cast:[['fionn','surprised']]},
  {s:'fionn', t:`...`},
  {if:G=>G.ret==='ch6'?null:'no_fionn_pre'},
  {goto:'no_fionn_chase'}
];
SCENES.no_fionn_pre=[
  {s:'fionn', e:'angry', t:`Come to my house. Right now. We are TALKING about this. Properly.`},
  {bg:'living', cast:[['fionn','angry']]},
  {t:`Twenty minutes later you're in Fionn's living room. He has prepared a speech. On cue cards.`},
  {goto:'no_fionn_chase'}
];
SCENES.no_fionn_chase=[
  {fx:'shake', expr:{fionn:'angry'}, s:'fionn', t:`NO?! IN MY HOUSE?!`},
  {t:`You run. Fionn chases you out of the front door, across the lawn and down the street, yelling at full volume.`},
  {s:'fionn', t:`COME BACK HERE! I JUST WANT TO ARGUE ABOUT IT! I HAD CUE CARDS!`},
  {bg:'night', fx:'siren', cast:[['officer','neutral'],['fionn','sad']]},
  {n:'Officer Pim', t:`Young man. You're chasing someone down the street in your socks.`},
  {s:'fionn', t:`I wasn't going to DO anything! I just had feelings! Loudly!`},
  {n:'Officer Pim', t:`Mm-hm. In the car. I'm taking you home. Which is... three houses away.`},
  {t:`Officer Pim lets him off with a warning and a tissue. By Monday it's WidR legend. Fionn insists it "didn't count," and still sends you pancake photos with no caption.`, eff:{rep:3}},
  ...outThen('fionn')
];
SCENES.fail_fionn=[
  {s:'P', t:`Fionn, I came over here because... I like you.`},
  {cast:[['fionn','surprised']]},
  {s:'fionn', e:'blush', t:`Y-you can't just SAY that! We barely hang out! I don't even know your favourite pancake topping!`},
  {s:'fionn', e:'shy', t:G=>G.final?`...And now the year's over. Great timing, {P}. Really great.`:`...Ask me again when I know. Then I'll think about it.`},
  {goto:afterConf}
];

// ----- MILO -----
SCENES.conf_milo=[
  {cast:[['milo','neutral']]},
  {t:`Milo pulls out one earbud when he sees you coming.`},
  {if:G=>canDate(G,'milo')?null:'fail_milo'},
  {s:'milo', t:`I've spent a year looking at someone who's never going to look back.`},
  {s:'milo', e:'shy', t:`Then you showed up. You asked for the music loud. You saw what I was hiding and didn't say a word.`},
  {s:'milo', e:'neutral', t:`This is hard for me. I don't do soft. But I want to try. With you. Go out with me, {P}.`},
  {choice:[
    {t:`"Yes. Put it on the playlist."`, then:[{cast:[['milo','smile']], fx:'sparkle'},{s:'milo', t:`Yeah? ...Cool. Very cool. I'm being extremely cool right now.`}], goto:'yes_milo'},
    {t:`"Milo... I think your heart's still with Daniel."`, goto:'no_milo'},
  ]},
];
SCENES.yes_milo=yesThen('milo');
SCENES.no_milo=[
  {cast:[['milo','sad']]},
  {s:'milo', t:`...Yeah. Figured you'd notice that too.`},
  {t:`He stands up, fixes his coat, and walks straight over to Daniel.`},
  {cast:[['milo','shy'],['daniel','surprised']]},
  {s:'milo', t:`Daniel. I need to tell you something. I've liked you for a year.`},
  {s:'daniel', e:'smile', t:`...Took you long enough. I've been waiting for you to take those earbuds out.`},
  {cast:[['milo','happy'],['daniel','grin']]},
  {t:`From then on, Daniel listens to phonk at football practice, very badly. Milo calls you "the only person with taste" and adds you to every playlist.`},
  ...outThen('milo')
];
SCENES.fail_milo=[
  {s:'P', t:`Milo, I like you. A lot.`},
  {cast:[['milo','surprised']]},
  {if:G=>myRank()>5?'fail_milo_rank':null},
  {s:'milo', e:'neutral', t:G=>lateLine(G,`You're cool. I mean that. But my heart's been on that football pitch for a long time. You'd have to really get me. Nobody has yet.`)},
  {goto:afterConf}
];
SCENES.fail_milo_rank=[
  {s:'milo', e:'smirk', t:G=>G.frozen?`Rankings are locked, {P}. You're #${myRank()}. People like me don't date outside the top five at WidR. Harsh, but that's this school. It's too late now.`:`You're #${myRank()} on the ranking. People like me don't date outside the top five. Climb first. Then we'll talk.`},
  {goto:afterConf}
];

// ===== CANON ENDINGS (only reached at the End-of-Year Ball) =====
SCENES.end_natan=[
  {cast:[['natan','happy']]},
  {s:'natan', t:`I lost my cap again. Don't care. Dance with me?`},
  {bg:'field', cast:[['natan','grin'],['lars','smile']]},
  {t:`Next spring, at the first WidR Rankers game, you're in the stands next to Lars, who swears he only came to read.`},
  {fx:'flash', t:`Natan hits a home run, then points right at you in front of the whole school.`},
  {end:'Home Run', who:'natan', kind:'NATAN · CANON ENDING', sub:'You and Natan', text:`Natan spent every game looking for you in the stands and found you every time. Lars stayed his best friend, and he finally stopped wondering about the rooftop.`}
];
SCENES.end_lars=[
  {cast:[['lars','shy']]},
  {s:'lars', t:`There's one more thing. The changes have been lasting longer since I met you. Two hours. Three. Last week, a whole day.`},
  {s:'lars', e:'neutral', t:`And every time, I didn't want it to wear off. I think it's been trying to tell me something.`},
  {t:`A cat from the neighbour's garden wanders onto the terrace. Lars reaches out and picks it up. On purpose.`},
  {fx:'flash', expr:{lars:['surprised','girl']}, t:`POOF.`},
  {fx:'sparkle', expr:{lars:['smile','girl']}, do:G=>{G.flags.lars_girl=true;}, t:`This time the sparkles don't fade. An hour passes. Then another. It stays.`},
  {s:'lars', e:'happy', t:`It's me. I think it's been me for a while. I just needed someone safe to become it around.`},
  {s:'lars', e:'blush', t:`...Is this okay? Are we still okay?`},
  {s:'P', t:`More than okay.`},
  {end:`The Cat's Out of the Bag`, who:'lars', kind:'LARS · CANON ENDING', sub:'You and Lars', text:`Lars is still Lars, still in white shirts and skinny jeans, and she can finally hold every cat at Pawsome Café. Natan cried happy tears and called it "the best plot twist in WidR history." Her genius moves continue, but now they're all out in the open.`}
];
SCENES.end_adam=[
  {cast:[['adam','grin']]},
  {s:'adam', t:`Results came out this morning. Guess who's THIRD in the year? Gianmarco, Giuseppe and I owe it all to you.`},
  {s:'adam', e:'happy', t:`Now dance with me before I start crying on Giuseppe.`},
  {end:'Perfect Score', who:'adam', kind:'ADAM · CANON ENDING', sub:'You and Adam', text:`You still lose to him at table tennis every Friday. His pencil case now holds three erasers: Gianmarco, Giuseppe, and a peach one with your name on it. That one never gets used. It's too important.`}
];
SCENES.end_fionn=[
  {cast:[['fionn','blush']]},
  {s:'fionn', t:`Don't say anything about the suit. I've been working out. For ME. It has nothing to do with you.`},
  {s:'fionn', e:'shy', t:`...It's for you. I've been jogging past your house at six every morning. I want to be the best version of me, and you make me want to try.`},
  {bg:'gym', cast:[['fionn','grin']]},
  {end:'Gym Buddies', who:'fionn', kind:'FIONN · CANON ENDING', sub:'You and Fionn', text:`He works out every morning and still makes you pancakes every Sunday. He says the pancakes cancel out the workouts, and that's the point. You still have his hoodie. He's stopped asking for it back.`}
];
SCENES.end_milo=[
  {cast:[['milo','smile']]},
  {t:`Milo takes the DJ booth for one song. It starts as soft piano. Then the bass drops, and the whole terrace jumps.`},
  {s:'milo', e:'smirk', t:`It's called "{P}." Obviously.`},
  {end:'Bass Drop', who:'milo', kind:'MILO · CANON ENDING (RARE)', sub:'You and Milo', text:`You won over the hardest heart at WidR. Milo still listens to phonk every day, but now there's a soft piano playlist too, and it's only for you. He even says hi to Daniel now without it hurting.`}
];
