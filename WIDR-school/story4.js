// ---------- STORY PART 4: Weekends, glow-ups, Mada, Gianmarcina, Giuseppina, gender routes ----------

// Run a weekend once, then come back to `next`.
const WK=(n,next)=>({if:G=>{ if(G.flags['wk'+n]) return null; G.flags['wk'+n]=true; G.wkNext=next; G.wkSlots=2; return 'weekend'; }});
// Gianmarco becomes Gianmarcina once Adam reaches 3 hearts.
const GC=ret=>({if:G=>{ if(G.flags.gian || hearts('adam')<3) return null; G.gcRet=ret; return 'gian_born'; }});
[['ch3',1],['ch4',0],['ch5',2],['ch6',3],['ch7',4],['ch8',5]].forEach(([id,n])=>{
  if(n) SCENES[id].unshift(WK(n,id),GC(id)); else SCENES[id].unshift(GC(id));
});

// ----- small story inserts -----
(()=>{
  const i=SCENES.start.findIndex(s=>typeof s.t==='string'&&s.t.startsWith('Yo.'));
  SCENES.start.splice(i+1,0,{s:'reshman',e:'smirk',t:G=>G.gender==='m'
    ?`New guy, huh? Half of WidR is going to check the ranking to see where you land.`
    :`New girl, huh? Half the boys here are already asking who you are. Don't let it go to your head.`});
  const j=SCENES.lunch.findIndex(s=>s.goto==='clubfair'); SCENES.lunch[j]={goto:'mada_intro'};
  const fc=SCENES.ch4.find(s=>Array.isArray(s.choice));
  fc.choice.push({t:`Help Mada at the student council stall.`, goto:'fest_mada'},
                 {t:`Find Gianmarcina at the strawberry stall.`, req:G=>G.flags.gian, goto:'fest_gian'});
  const fw=SCENES.fireworks.find(s=>Array.isArray(s.choice));
  fw.choice.push({t:`Mada.`, aff:{mada:1}, then:[{cast:[['mada','smirk']]},{s:'mada',t:`Bold. Most people are too scared to stand next to me.`}]},
                 {t:`Gianmarcina.`, req:G=>G.flags.gian, aff:{gian:2}, then:[{cast:[['gian','happy']]},{s:'gian',t:`The pink ones look like strawberries! Everything looks like strawberries if you believe hard enough.`}]});
})();

SCENES.mada_intro=[
  {cast:[]},
  {t:`Then the cafeteria goes quiet. A girl from 6 VWO walks in like she owns the place. At WidR, she basically does.`},
  {cast:[['natan','blush'],['fionn','blush'],['daniel','surprised']]},
  {t:`Natan drops his stroopwafel. Fionn forgets how to chew. Daniel says "wow" out loud, then pretends he coughed.`},
  {cast:[['adam','neutral']]},
  {s:'adam', t:`That's my sister. Mada. Number one on the WidR Ranking. Please, I'm begging you, don't.`},
  {cast:[['reshman','smirk']]},
  {s:'reshman', t:G=>G.gender==='m'
    ?`Every guy at WidR has a crush on Mada. She's turned all of them down. She only dates the top of the ranking.`
    :`Half the boys here are in love with Mada. Some of the ones you'll meet, too. Just so you know who you're up against.`},
  {cast:[['mada','smile']]},
  {s:'mada', t:`You must be the new one. {P}, right? Welcome to WidR. Try not to embarrass my brother.`},
  {choice:[
    {t:`"Nice to meet you. I'll try. No promises."`, aff:{mada:1}, then:[{s:'mada',e:'smirk',t:`Funny. Okay. You can stay.`}]},
    {t:`"You're even prettier than everyone said."`, then:[{s:'mada',e:'neutral',t:`I know. Everyone says that. Try something new next time.`}]},
    {t:`Just nod and keep eating.`, aff:{mada:1}, then:[{s:'mada',e:'surprised',t:`...Huh. You're not going to stare? Interesting.`}]},
  ]},
  {goto:'clubfair'}
];

SCENES.gian_born=[
  {bg:'classroom', cast:[['adam','smile']]},
  {s:'adam', t:`Free period. Want to see Gianmarco's good side? It's the side that smells the most like strawberries.`},
  {t:`Adam fumbles. Gianmarco bounces off the desk, rolls across the floor, and stops in a patch of sunlight.`},
  {fx:'flash', t:`POOF.`},
  {fx:'sparkle', cast:[['adam','surprised'],['gian','surprised']], t:`Where the eraser was, there's a girl with strawberry-pink hair, a strawberry clip and a very confused smile.`},
  {s:'gian', t:`Hi! I'm... Gianmarcina? I think I used to be an eraser. I still really, really love strawberries.`},
  {s:'adam', t:`GIANMARCO?!`},
  {s:'gian', e:'smile', t:`Gianmarcina now! Thanks for all the years in the pencil case, Adam. And thank you, {P}. You always said hi to me. I think I wanted to be a person so I could say hi back.`},
  {t:`Adam faints onto Giuseppe.`},
  {t:`By Monday, Gianmarcina is enrolled in 5vb. Nobody asks questions. Rankingland is like that. She's cute, she's friendly, and she's already fairly popular.`, eff:{flag:'gian', aff:{gian:2}}},
  {goto:G=>G.gcRet}
];

// ----- weekends: jobs, glow-ups, hangouts -----
SCENES.weekend=[
  {bg:'town', ch:'Weekend', cast:[]},
  {t:G=>`The weekend. You have €${G.money}, charisma ${cha()}, and ${G.wkSlots} free afternoon${G.wkSlots>1?'s':''}. What do you do?`},
  {choice:[
    {t:`Work a part-time shift (earn money)`, goto:'wk_job'},
    {t:`Go glow-up shopping (spend money)`, goto:'wk_shop'},
    {t:`Hang out with someone`, goto:'wk_hang'},
  ]},
];
SCENES.wk_after=[{do:G=>{G.wkSlots--;}},{if:G=>G.wkSlots>0?'weekend':G.wkNext}];
SCENES.wk_job=[
  {t:`Where do you work?`},
  {choice:[
    {t:`Pawsome Café, with Lars (€35)`, eff:{money:35, aff:{lars:1}}, then:[{bg:'catcafe', cast:[['lars','smile']]},{s:'lars',t:`You're on cat duty. I'm on "standing very far away from the cats" duty. Teamwork.`}], goto:'wk_after'},
    {t:`Fionn's family pancake café (€35)`, eff:{money:35, aff:{fionn:1}}, then:[{bg:'living', cast:[['fionn','grin']]},{s:'fionn',t:`You flipped that like a pro! Not that I'm impressed. I'm a normal amount of impressed.`}], goto:'wk_after'},
    {t:`Babysitting the neighbours' twins (€45)`, eff:{money:45}, then:[{bg:'living', cast:[]},{t:`The twins cover you in stickers and make you watch the same film four times. You earn every cent.`}], goto:'wk_after'},
    {t:`Never mind`, goto:'weekend'},
  ]},
];
const SHOP=[
  {k:'barber', n:'Fresh haircut at the barber', p:25, g:()=>5, max:2},
  {k:'skin',   n:'Skincare routine', p:30, g:G=>G.gender==='f'?7:5, max:2},
  {k:'gym',    n:'A month at the gym', p:35, g:G=>G.gender==='m'?7:5, max:3},
  {k:'fit',    n:'New outfit', p:45, g:()=>6, max:2},
];
SCENES.wk_shop=[
  {t:G=>`You have €${G.money}. Glow-up so far: ${Math.min(30,G.gen.glow)}/30.`},
  {choice:G=>SHOP.map(it=>({
      t:G=>`${it.n} (€${it.p})${(G.buys[it.k]||0)>=it.max?' · maxed':''}`,
      off:G=>G.money<it.p || (G.buys[it.k]||0)>=it.max || G.gen.glow>=30,
      do:G=>{ const before=cha(); G.money-=it.p; G.buys[it.k]=(G.buys[it.k]||0)+1; G.gen.glow=Math.min(30,G.gen.glow+it.g(G)); G.lastCha=[before,cha()]; },
      then:[{t:G=>`Looking good. Charisma ${G.lastCha[0]} → ${G.lastCha[1]}.`, fx:'sparkle'}], goto:'wk_after'}))
    .concat([{t:`Never mind`, goto:'weekend'}])},
];
const HANG={
  natan:[`You and Natan play catch in the park until it gets dark. He only hits one dog walker.`,`Natan drags you to a batting cage. You beat his score. He demands a rematch, then another.`,`You help Natan study for history. He keeps doodling baseballs in the margins.`],
  lars:[`You and Lars visit the cat shelter. He watches the kittens through the glass with his hands in his pockets.`,`Lars takes you to a bookshop and "coincidentally" recommends exactly the book you wanted.`,`You walk along the canal with Lars. He talks about statistics. It's weirdly fun.`],
  adam:[`Table tennis with Adam. You lose 11 to 2. He celebrates with Giuseppe.`,`You watch a football match at Adam's. He commentates every single play.`,`Study session with Adam. Giuseppe erases all your mistakes.`],
  fionn:[`Fionn teaches you his grandma's pancake recipe. He pretends not to be proud when you get it right.`,`You watch a match at Fionn's. He yells at the TV. You yell with him.`,`Fionn "happens" to need help carrying groceries. He insists on carrying all the bags.`],
  milo:[`Milo plays you unreleased tracks in his room. You're the first person to ever hear them.`,`You go thrifting with Milo. He finds a coat that costs €4 and looks like €400.`,`Milo shows you the rooftop at night. The city lights pulse along with the bass.`],
  mada:[`Mada lets you walk her to the train. Three people ask for her number on the way.`,`You run into Mada at a café. She lets you sit with her for exactly one coffee.`,`Mada asks your opinion on two outfits. You pick one. She wears it on Monday.`],
  gian:[`Gianmarcina takes you strawberry picking. She eats more than she picks.`,`You and Gianmarcina try every strawberry dessert in town. She ranks all of them.`,`Gianmarcina teaches you to make strawberry milk. It's 90% strawberries.`],
};
SCENES.wk_hang=[
  {t:`Who do you text?`},
  {choice:G=>ROM.filter(k=>visible(G,k) && !G.out.includes(k)).map(k=>({t:CHARS[k].name+(G.dating.includes(k)?' 💘':''), goto:'hang_'+k}))
    .concat([{t:`Never mind`, goto:'weekend'}])},
];
['natan','lars','adam','fionn','milo','mada','gian'].forEach(k=>{
  SCENES['hang_'+k]=[
    {cast:[[k,'happy']]},
    {t:G=>{ G.hang=G.hang||{}; const n=G.hang[k]||0; G.hang[k]=n+1; return HANG[k][n%3]; }},
    // Mada only warms up fast to people near the top of the ranking.
    {do:G=>{ G.aff[k]+= k==='mada' ? (myRank()<=6?2:1) : 2; if(G.dating.includes(k)) G.aff[k]+=1; }},
    {goto:'wk_after'}
  ];
});

// ----- asking someone out: orientation first, then connection -----
['natan','lars','adam','fionn','milo','mada','gian'].forEach(k=>{ SCENES['ask_'+k]=[{if:G=>accepts(G,k)?'conf_'+k:'refuse_'+k}]; });
const friendThen=k=>[{do:G=>{ if(!G.friend.includes(k)) G.friend.push(k); }},{goto:afterConf}];
SCENES.refuse_adam=[
  {cast:[['adam','shy']]},
  {s:'P', t:`Adam... I like you. As more than a friend.`},
  {s:'adam', e:'sad', t:`{P}, you're one of my best friends. Honestly. But I like girls. I'm really sorry.`},
  {s:'adam', e:'smile', t:`Giuseppe still thinks you're great, though. So do I. Table tennis on Friday?`},
  ...friendThen('adam')
];
SCENES.refuse_fionn=[
  {cast:[['fionn','surprised']]},
  {s:'P', t:`Fionn, I came over here because I like you.`},
  {s:'fionn', e:'blush', t:`W-WHAT?! I'm not— I don't like guys like that!`},
  {s:'fionn', e:'shy', t:`...But you're still my best friend. Don't make it weird. I'm making it weird. Ugh. Pancakes on Sunday?`},
  ...friendThen('fionn')
];
SCENES.refuse_mada=[
  {cast:[['mada','neutral']]},
  {s:'P', t:`Mada, I really like you.`},
  {s:'mada', e:'smile', t:`That's sweet, {P}. Really. But I'm straight.`},
  {s:'mada', t:`You're still one of the only people here who talks to me like a normal person. Don't stop doing that.`},
  ...friendThen('mada')
];
['natan','lars','milo','gian'].forEach(k=>{ SCENES['refuse_'+k]=[{goto:'conf_'+k}]; });

// ----- MADA -----
SCENES.conf_mada=[
  {cast:[['mada','neutral']]},
  {t:`For once, Mada is alone, scrolling through her phone.`},
  {if:G=>canDate(G,'mada')?null:'fail_mada'},
  {s:'mada', e:'smirk', t:`Let me guess. You're here to ask me out.`},
  {s:'mada', e:'shy', t:`Everyone asks me out because I'm number one. You're the first person who actually got to know me first.`},
  {s:'mada', t:G=>`And you're #${myRank()} on the ranking. Not bad at all. So yes, if you're asking. Ask properly.`},
  {choice:[
    {t:`"Mada, will you go out with me?"`, then:[{cast:[['mada','happy']], fx:'sparkle'},{s:'mada',t:`Yes. Don't tell Adam yet. He'll faint again.`}], goto:'yes_mada'},
    {t:`"Actually... I don't think I want to."`, goto:'no_mada'},
  ]},
];
SCENES.yes_mada=yesThen('mada');
SCENES.no_mada=[
  {cast:[['mada','surprised']]},
  {s:'mada', t:`...Did you just turn ME down?`},
  {s:'mada', e:'grin', t:`Nobody's ever done that. Honestly? Respect.`},
  {cast:[['mada','smirk'],['daniel','blush']]},
  {t:`Five minutes later, Daniel finally works up the courage to talk to her. She agrees to one coffee. Just one. Probably.`},
  ...outThen('mada')
];
SCENES.fail_mada=[
  {s:'P', t:`Mada... I like you.`},
  {if:G=>myRank()>3?'fail_mada_rank':null},
  {s:'mada', e:'neutral', t:G=>lateLine(G,`You're sweet. But you don't really know me yet. Everyone wants the girl at the top of the list. I want someone who knows the girl.`)},
  {goto:afterConf}
];
SCENES.fail_mada_rank=[
  {s:'mada', e:'smirk', t:G=>G.frozen
    ?`You're #${myRank()}, {P}. The rankings are locked. I only date the top three. It's too late now. Don't take it personally. That's WidR.`
    :`You're #${myRank()}. I only date the top three. Climb, and then we'll talk.`},
  {goto:afterConf}
];
SCENES.fest_mada=[
  {bg:'hallway', cast:[['mada','neutral']]},
  {s:'mada', t:`You're helping? Good. The student council stall is a disaster and the other volunteers keep staring at me instead of working.`},
  {t:`You fix the queue, the prices and the sign. Mada watches you work, a little surprised.`, eff:{rep:4}},
  {s:'mada', e:'smile', t:`You're actually useful. That's rare around here.`, do:G=>{G.aff.mada+= myRank()<=8?3:2;}},
  {goto:'fireworks'}
];
SCENES.val_mada=[{s:'mada', e:'smirk', t:`I got forty-one Valentine's cards this year. I'm giving mine to exactly one person. Happy Valentine's, {P}.`, eff:{rep:6}},{goto:'val_lock'}];
SCENES.end_mada=[
  {cast:[['mada','smile']]},
  {s:'mada', t:`Number one and number... well, you. We look good together. The whole terrace is staring.`},
  {s:'mada', e:'shy', t:`Let them. Dance with me.`},
  {end:'Top of the List', who:'mada', kind:'MADA · CANON ENDING (RARE)', sub:'You and Mada', text:`You won over the most wanted person at WidR, and you did it by getting to know her. Adam has fainted twice about it. Half the boys at school still haven't recovered.`}
];

// ----- GIANMARCINA -----
SCENES.conf_gian=[
  {cast:[['gian','smile']]},
  {t:`Gianmarcina is eating strawberries out of a paper bag.`},
  {s:'gian', t:`{P}! Want one? They're the good ones.`},
  {if:G=>canDate(G,'gian')?null:'fail_gian'},
  {s:'gian', e:'shy', t:`Can I tell you a secret? Even when I was an eraser, I liked you. You were the only one who ever said hi to me.`},
  {s:'gian', e:'blush', t:G=>G.gender==='f'?`And yes, I like girls too. And boys. I like strawberries most, but you're a close second. Okay, a close first.`:`I like strawberries most, but you're a close second. Okay. A close first.`},
  {s:'gian', t:`So... will you go out with me?`},
  {choice:[
    {t:`"Yes. Strawberries on me."`, then:[{cast:[['gian','happy']], fx:'sparkle'},{s:'gian',t:`YES! This is the best day since I became a person!`}], goto:'yes_gian'},
    {t:`"I'm sorry, Gianmarcina. I see you as a friend."`, goto:'no_gian'},
  ]},
];
SCENES.yes_gian=yesThen('gian');
SCENES.no_gian=[
  {cast:[['gian','sad']]},
  {s:'gian', t:`Oh. Okay. That's okay! I'm still new at feelings.`},
  {cast:[['gian','sad'],['josh','smile']]},
  {t:`Josh sits down next to her and starts explaining how strawberries aren't technically berries. She is horrified. Then fascinated. They talk for two hours.`},
  ...outThen('gian')
];
SCENES.fail_gian=[
  {s:'P', t:`Gianmarcina, I like you.`},
  {cast:[['gian','surprised']]},
  {s:'gian', e:'shy', t:G=>lateLine(G,`I've only been a person for a little while! I need to get to know you better first. Like, way more strawberry dates.`)},
  {goto:afterConf}
];
SCENES.fest_gian=[
  {bg:'cafeteria', cast:[['gian','grin']]},
  {s:'gian', t:`Welcome to the strawberry stall! Everything is strawberry. Even the napkins smell like strawberry. I did that.`},
  {t:`You help her sell out in forty minutes. She gives you the very last strawberry like it's a medal.`, eff:{aff:{gian:3}, rep:2}},
  {goto:'fireworks'}
];
SCENES.val_gian=[{s:'gian', t:`I made you strawberry chocolates! Some are just strawberries. Happy Valentine's Day, {P}!`, eff:{rep:3}},{goto:'val_lock'}];
SCENES.end_gian=[
  {cast:[['gian','happy']]},
  {s:'gian', t:`I've been a person for less than a year, and this is already the best night of my life. Dance with me?`},
  {end:'Strawberry Season', who:'gian', kind:'GIANMARCINA · CANON ENDING', sub:'You and Gianmarcina', text:`She still loves strawberries more than almost anything. Almost. Every Saturday you go strawberry picking, and she ranks every single one. You're always number one.`}
];

// ----- Adam's moment at the ball (plays unless you end up with Adam) -----
SCENES.adam_epi=[
  {bg:'sunset', cast:[['adam','sad']]},
  {t:`Later, you spot Adam alone at the edge of the terrace, holding Giuseppe. He's crying.`},
  {s:'adam', t:G=>G.flags.gian?`Everyone found someone tonight. Even Gianmarco found someone. Well. Became someone.`:`Everyone found someone tonight. It's fine. I've still got you, Giuseppe.`},
  {s:'adam', e:'sad', t:`You've seen every mistake I've ever made. You never once complained.`},
  {t:`A tear lands on the green apple eraser.`},
  {fx:'flash', t:`POOF.`},
  {fx:'sparkle', cast:[['adam','surprised'],['giuseppina','smile']], t:`Standing where the eraser was, there's a girl with green-apple hair and an apple clip.`},
  {s:'giuseppina', t:`Hi, Adam. It's me. Giuseppe. Giuseppina now. Please don't cry. I've been with you through every mistake, and I'm not going anywhere.`},
  {s:'adam', e:'happy', t:`...Giuseppina. Okay. Okay. Do you... want to dance?`},
  {cast:[['adam','happy'],['giuseppina','happy']], t:`They dance badly, and Adam doesn't stop smiling for the rest of the night.`},
];
