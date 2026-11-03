// ---------- SOCIAL LIFE: calendar, confidant ranks, four stats, phone texts ----------

// ===== four social stats =====
const STATS={
  knowledge:{n:'Knowledge',lv:['Average','Learned','Scholarly','Encyclopedic','Brilliant']},
  guts:{n:'Guts',lv:['Hesitant','Bold','Daring','Fearless','Lionhearted']},
  charm:{n:'Charm',lv:['Plain','Likeable','Charming','Magnetic','Irresistible']},
  kindness:{n:'Kindness',lv:['Polite','Caring','Warm','Selfless','Angelic']},
};
const STAT_AT=[0,5,12,22,34];
const stPts=k=>{ G.st=G.st||{knowledge:0,guts:0,charm:0,kindness:0}; return G.st[k]; };
const stat=k=>{ const p=stPts(k); let l=1; STAT_AT.forEach((v,i)=>{ if(p>=v) l=i+1; }); return l; };
function addStat(k,n){ const before=stat(k); G.st[k]=stPts(k)+n; const after=stat(k);
  toast(after>before?`${STATS[k].n} up! Level ${after}: ${STATS[k].lv[after-1]}`:`${STATS[k].n} +${n}`, after>before); }
function toast(text,big){ if(window.HEADLESS) return;
  const d=document.createElement('div'); d.className='toast'+(big?' big':''); d.textContent=text; $('stage').appendChild(d);
  if(big) SFX.rankup(); else SFX.click(); setTimeout(()=>d.classList.add('out'),big?2200:1500); setTimeout(()=>d.remove(),big?2800:2000);
}

// ===== confidant ranks: harder people have more ranks =====
const CMAX={natan:8,lars:7,adam:8,fionn:8,milo:10,mada:10,gian:9,goon:9};
const needPts=r=>{ let s=0; for(let i=1;i<r;i++) s+=2+Math.floor(i/2); return s; };
const crOf=k=>{ G.cr=G.cr||{}; return G.cr[k]||1; };
// Romance needs the second-to-last rank (the last one if you're low on the WidR Ranking).
const crReq=k=>Math.min(CMAX[k], CMAX[k]-1+(rankMod()>0?1:0));
function rankBanner(k){ if(window.HEADLESS) return; const r=crOf(k);
  const d=document.createElement('div'); d.className='rankup'; d.innerHTML=`<small>★ Rank up ★</small><b style="color:${CHARS[k].color}">${CHARS[k].name}</b><span>Rank ${r} / ${CMAX[k]}</span><i>${'★'.repeat(r)}${'☆'.repeat(CMAX[k]-r)}</i>`;
  $('stage').appendChild(d); SFX.rankup(); setTimeout(()=>d.classList.add('out'),2400); setTimeout(()=>d.remove(),3000); }

// Rank stories. Lines starting with ">" are narration; others are spoken by the character.
// [req] = [stat, level] needed before this rank unlocks. choice options: [label, points, reply, req?]
const RANKS={};
const RK=(k,r,req,lines,choice)=>{ (RANKS[k]=RANKS[k]||{})[r]={req,lines,choice}; };
const romantic=(k,yes,no)=>G=>accepts(G,k)?yes:no;

// --- Natan (8) ---
RK('natan',2,null,[`>Natan drags you behind the gym to a dented practice net.`,`This is my secret spot. Only Lars knows about it. And now you, I guess.`]);
RK('natan',3,null,[`I'm failing chemistry. Like, properly failing. If I fail, I'm off the team.`],[[`[Knowledge 2] "Let's study. I'll explain it like baseball."`,3,`"Electrons are... runners on base? Oh. OH. That actually makes sense!"`,['knowledge',2]],[`"You'll figure it out."`,1,`"Yeah... hopefully."`]]);
RK('natan',4,null,[`>Natan's quieter than usual. His dad missed another game.`,`It's fine. He's busy. He's always busy.`],[[`[Kindness 2] Sit with him and say nothing`,3,`After a long time, he leans his shoulder against yours. "Thanks for staying."`,['kindness',2]],[`"Want to throw some balls?"`,2,`He laughs. "Yeah. That actually helps."`]]);
RK('natan',5,null,[`Can I ask you something weird? Is it normal to get nervous around your best friend?`,`Like, Lars. Sometimes I can't even look at him.`],[[`"That doesn't sound like just a friend thing."`,2,`He goes completely red. "...Oh no."`],[`"Everyone gets nervous sometimes."`,1,`"Right. Totally normal. Yep."`]]);
RK('natan',6,['guts',2],[`A university scout watched me play. They want me to try out. It's in another city.`,`What if I go and everyone forgets about me?`],[[`[Guts 2] "Go. We'll be loud enough that you can hear us from there."`,3,`"...You really think so?" He grins. "Okay. I'm going."`,['guts',2]],[`"Maybe stay where you're happy?"`,1,`"Maybe. I don't know."`]]);
RK('natan',7,null,[`>Natan hands you a battered cap.`,`My lucky cap. I always lose it, so you hold onto it. That way I always know where it is.`]);
RK('natan',8,null,[romantic('natan',`I always look for someone in the stands. Lately... it's you. I just wanted you to know.`,`You're my best friend, {P}. Seriously. Whatever happens, you're in my corner and I'm in yours.`)]);
// --- Lars (7) ---
RK('lars',2,null,[`Did you know cats spend 70% of their lives asleep? Goals.`,`>He reads you cat facts for twenty minutes. Some of them are definitely made up.`]);
RK('lars',3,null,[`>Lars drops a notebook. Pages of graphs. One is labelled "{P}: probability of saying hi today."`,`That's... a school project. Statistics. Of people. Normal people.`],[[`"What's the probability today?"`,2,`"...One hundred percent. You just did." He smiles before he can stop himself.`],[`Pretend you didn't see it`,2,`He looks so relieved it's almost funny.`]]);
RK('lars',4,['kindness',2],[`My parents don't know. About the cat thing. They'd make it a big deal.`],[[`[Kindness 2] "It's yours to share when you're ready. Nobody else's."`,3,`"...Thank you. I really needed someone to say that."`,['kindness',2]],[`"Maybe they'd understand?"`,1,`"Maybe. Not yet."`]]);
RK('lars',5,null,[`>It rains. A soaked stray cat runs straight for Lars.`,`>You step in front of him just in time and scoop the cat up yourself.`,`...You just saved me from a very confusing afternoon. I owe you. Statistically, forever.`]);
RK('lars',6,null,[`Hypothetically. If I stayed like that. The other way. Would people still like me?`],[[`"The people who matter would like you either way."`,3,`He doesn't answer. But he doesn't let go of your sleeve for a while.`],[`"Why, are you thinking about it?"`,1,`"No. Yes. Ask me later."`]]);
RK('lars',7,null,[`{P}, I have to tell you someth— the cats need feeding. Never mind. Genius move. Ignore me.`,`>He runs inside. You're fairly sure the cats were already fed.`]);
// --- Adam (8): deep conversations need Knowledge ---
RK('adam',2,null,[`Rematch. Table tennis. Loser buys strawberry milk.`,`>You lose. You buy the strawberry milk. He shares it anyway.`]);
RK('adam',3,null,[`My parents have my ranking pinned on the fridge. Next to my sister's. She's always number one.`],[[`"You're not in a race with Mada."`,2,`"Tell that to the fridge." But he's smiling.`],[`"Fourth is still amazing."`,2,`"...Thanks. Nobody says that."`]]);
RK('adam',4,['knowledge',2],[`Do you think mistakes are bad? Like, objectively?`],[[`[Knowledge 2] "Every scientist ever would say mistakes are how you learn."`,3,`"Exactly! That's why Giuseppe is important. He's a scientist."`,['knowledge',2]],[`"Depends on the mistake."`,1,`"Hm. Fair."`]]);
RK('adam',5,['knowledge',3],[`Can I tell you a secret? I don't want to be a doctor like my parents want.`,`I want to be a sports journalist. Write about table tennis like it's a thriller.`],[[`[Knowledge 3] "Show me something you've written."`,3,`>He hands you three pages about a table tennis final. It's genuinely gripping.`,['knowledge',3]],[`"You'd be great at that."`,2,`"You think so? Really?"`]]);
RK('adam',6,null,[`You know why I name my erasers? My grandpa gave me the first ones. He said "everyone deserves a name, even the small things."`,`>He holds up Giuseppe very carefully.`]);
RK('adam',7,['knowledge',4],[`I wrote a university application essay. About mistakes. Would you read it?`],[[`[Knowledge 4] Read it properly and give real notes`,3,`"These notes are... really good. You actually get me."`,['knowledge',4]],[`"It's perfect!"`,1,`"It can't be perfect. There's a typo in line one." He laughs.`]]);
RK('adam',8,null,[romantic('adam',`I used to think I'd need to be top three to be worth anything. You made me stop thinking that. So... thank you. And maybe more than thank you.`,`You're my best friend, {P}. Gianmarco and Giuseppe agree. It was a unanimous vote.`)]);
// --- Fionn (8) ---
RK('fionn',2,null,[`This is my grandma's pancake recipe. Don't tell anyone. If you tell anyone, I'll... make you more pancakes. Angrily.`]);
RK('fionn',3,['kindness',2],[`>Fionn's quiet. Some older boys made a comment about him earlier.`,`Whatever. I don't care. I'm used to it.`],[[`[Kindness 2] "You don't have to be used to it. They were wrong."`,3,`He looks away fast. "...Okay. Thanks. Shut up."`,['kindness',2]],[`"Want me to go yell at them?"`,2,`"HA. Yes. No. ...Maybe."`]]);
RK('fionn',4,['guts',2],[`I'm going to the gym. Not because of what they said. Just because. Are you coming or not?`],[[`[Guts 2] "Race you there."`,3,`You both arrive out of breath and laughing.`,['guts',2]],[`"Next time?"`,1,`"Fine. Your loss."`]]);
RK('fionn',5,null,[`>His team lost the derby. Fionn is blinking very fast.`,`I'm NOT crying. It's onions. I was cutting onions. In my mind.`],[[`Hand him a tissue without a word`,2,`"...Thanks. The onions were really strong."`],[`"It's okay to cry about football."`,2,`"It's NOT okay. ...It's a little okay."`]]);
RK('fionn',6,null,[`>Fionn's made a full dinner. Three courses.`,`These were leftovers! I didn't make this for you! I just happened to make your favourite. By accident. Three times.`]);
RK('fionn',7,null,[`>Fionn's grandma pinches your cheek and calls you "Fionn's special friend."`,`OMA! Stop! ...She likes you. That's rare. She hates everyone. Including me.`]);
RK('fionn',8,null,[romantic('fionn',`I've been trying to say this for weeks. It's not like I... okay. It IS like I. You know what I mean. Don't make me say it yet.`,`You're my best friend. If anyone ever bothers you, I'll chase them down the street. In socks. I've practised.`)]);
// --- Milo (10): needs Charm and Guts ---
RK('milo',2,null,[`I don't usually let people hear the unfinished stuff. Here.`,`>It's a slow beat with a sad piano sample. It's beautiful.`]);
RK('milo',3,['charm',2],[`Your style's getting better. Who's dressing you?`],[[`[Charm 2] "Me. I've been paying attention to you."`,3,`He smirks. "Good answer."`,['charm',2]],[`"Uh... my mum?"`,0,`"...We'll fix that."`]]);
RK('milo',4,null,[`My parents want me to study law. They think music is a hobby.`],[[`"It's not a hobby if it's who you are."`,3,`He stares at you for a second. "...Yeah."`],[`"Law pays well, though."`,0,`"Wow. Okay."`]]);
RK('milo',5,['guts',2],[`There's an open mic tonight. I'm not going. Obviously.`],[[`[Guts 2] Sign him up anyway`,3,`"You did NOT." You did. He goes. He's incredible.`,['guts',2]],[`"Maybe next time."`,1,`"There's always a next time. That's the problem."`]]);
RK('milo',6,null,[`>Daniel waves at Milo across the street. Milo waves back, then stares at his shoes.`,`Don't say it. ...Thanks for not saying it.`]);
RK('milo',7,['charm',3],[`Style me for the photoshoot. The music club is doing album covers.`],[[`[Charm 3] Put him in something bold`,3,`The photo comes out amazing. He sets it as his phone background. "Don't tell anyone."`,['charm',3]],[`Keep it safe and simple`,1,`"Safe. Boring. But fine."`]]);
RK('milo',8,null,[`>Milo plays his own song at the open mic. The whole room goes quiet, then erupts.`,`I looked for you in the crowd the whole time. Weird, right?`]);
RK('milo',9,['guts',3],[`I'm scared of being soft. If I'm soft, people can hurt me.`],[[`[Guts 3] "Then be soft with me. I'm not going anywhere."`,3,`He takes his earbuds out completely. For the first time, there's no music.`,['guts',3]],[`"You're not soft."`,1,`"...Right. Of course not."`]]);
RK('milo',10,null,[romantic('milo',`I used to spend every day looking at someone who'd never look back. Now I mostly look at you. I don't know what that means yet. But I like it.`,`You're the only person who really gets me. That's rarer than good taste.`)]);
// --- Mada (10): only opens up to people with Charm ---
RK('mada',2,['charm',2],[`You're the first person this week who hasn't asked for my number or my ranking. What do you want?`],[[`[Charm 2] "Just to hang out. You seem interesting."`,3,`"...Interesting. Not 'pretty'. I'll take it."`,['charm',2]],[`"Your number?"`,0,`"Wow. You were doing so well."`]]);
RK('mada',3,null,[`>A boy from 6 VWO blocks Mada's path and won't move.`,`I deal with this every day. It's fine. Let's go.`],[[`Walk her somewhere quieter`,2,`"Thanks. I'm not used to people noticing."`],[`Tell him to back off`,2,`He leaves. Mada raises an eyebrow. "Bold."`]]);
RK('mada',4,['charm',3],[`>Mada shows you a sketchbook full of dress designs.`,`Nobody knows about this. Everyone thinks I just look good. I want to make things that look good.`],[[`[Charm 3] Point out your favourite design and say exactly why`,3,`"...You actually looked. Properly. Okay. You're dangerous."`,['charm',3]],[`"These are nice."`,1,`"Nice." She closes the book.`]]);
RK('mada',5,null,[`Adam thinks I'm perfect. I'm not. I just never let anyone see the mistakes.`],[[`"Adam would love you more if he saw them."`,2,`She thinks about that for a long time.`],[`"You kind of are perfect, though."`,0,`"That's exactly the problem."`]]);
RK('mada',6,['kindness',3],[`>Mada's sitting alone. She's been crying.`,`Being number one means everyone's waiting for you to fall.`],[[`[Kindness 3] "I'm not waiting. I'm just here."`,3,`She rests her head on your shoulder for a while. Nobody else gets to see this.`,['kindness',3]],[`"You won't fall."`,1,`"Everyone falls."`]]);
RK('mada',7,['charm',4],[`My parents' gala is on Saturday. I need someone who won't embarrass me.`],[[`[Charm 4] "I'll be the best-dressed person there."`,3,`You are. Mada can't stop smiling all night.`,['charm',4]],[`"I don't own a suit."`,0,`"Then you're not coming."`]]);
RK('mada',8,null,[`>For the first time, Mada meets you without makeup, in a hoodie.`,`This is the real me. Don't tell anyone. They'd lose their minds.`]);
RK('mada',9,['guts',3],[`>The same boy from 6 VWO shows up again, louder this time.`],[[`[Guts 3] Step in front of Mada and tell him to leave. Now.`,3,`He goes. Mada stares at you. "Nobody's ever done that for me."`,['guts',3]],[`Pull her away`,1,`"Thanks. Let's go."`]]);
RK('mada',10,null,[romantic('mada',`Everyone wants the girl at the top of the list. You wanted me before you knew I'd let you. That's why it's you.`,`You're the only person at WidR I trust. Don't let it go to your head.`)]);
// --- Gianmarcina (9) ---
RK('gian',2,null,[`Teach me to ride a bike! I've only had legs for a few weeks!`,`>She crashes into a hedge three times, then rides perfectly and screams with joy.`]);
RK('gian',3,null,[`What are dreams? Like, the sleeping kind. Last night I dreamt I was a strawberry. Is that normal?`],[[`"For you? Probably."`,2,`"Good! I want to be normal!"`],[`"Dreams are your brain playing."`,2,`"My brain is so fun."`]]);
RK('gian',4,['kindness',2],[`What if I turn back into an eraser one day?`],[[`[Kindness 2] "Then I'll carry you everywhere. But I don't think you will."`,3,`She hugs you so hard you lose your breath.`,['kindness',2]],[`"That would be weird."`,0,`"...Yeah. Super weird."`]]);
RK('gian',5,null,[`>You take Gianmarcina strawberry picking. She eats more than she picks. Much more.`,`This is the best day of my whole life. Which is only a few weeks long. But still.`]);
RK('gian',6,null,[`I wrote my first poem. It's about strawberries. And a little bit about you.`],[[`"Read it to me."`,3,`It's terrible. It's the best poem you've ever heard.`],[`"Only a little bit?"`,2,`"...Maybe a medium bit."`]]);
RK('gian',7,['guts',2],[`The drama club is holding auditions. I want to try, but I'm scared.`],[[`[Guts 2] "Let's audition together."`,3,`You both get in. She cries with happiness.`,['guts',2]],[`"You'll be great."`,1,`She doesn't go. Maybe next time.`]]);
RK('gian',8,null,[`>Gianmarcina finds Adam and thanks him for six years in the pencil case. He cries. She cries. You cry a little.`]);
RK('gian',9,null,[romantic('gian',`Being a person is hard, but you make it the best thing ever. I think I like you more than strawberries. That's a big deal.`,`You're my favourite person. Tied with strawberries. Okay, ahead of strawberries.`)]);
// --- Goonseppe (9) ---
RK('goon',2,null,[`Skate lesson. Rule one: fall a lot. Rule two: see rule one.`,`>You fall a lot. She's an excellent teacher.`]);
RK('goon',3,null,[`Fine. The name. "Goon" because I was always the muscle cleaning up everyone's mess. "Seppe" from Giuseppe. Happy?`]);
RK('goon',4,['guts',2],[`Drop in on the half-pipe. I dare you.`],[[`[Guts 2] Drop in`,3,`You land it. Barely. She whoops louder than anyone at the park.`,['guts',2]],[`"Absolutely not."`,1,`"Coward. Respectfully."`]]);
RK('goon',5,null,[`I worry about Adam. He thinks if he stops working for one second, everything falls apart.`],[[`"That's why he needs you."`,2,`"...Yeah. He does."`],[`"He'll be fine."`,1,`"I hope so."`]]);
RK('goon',6,['kindness',2],[`I hid his textbooks again and now he's not talking to me. How do people apologise?`],[[`[Kindness 2] Help her write a proper apology`,3,`Adam reads it, laughs, and hugs her. She gives you a thumbs-up over his shoulder.`,['kindness',2]],[`"Just say sorry."`,1,`"Easy for you to say."`]]);
RK('goon',7,null,[`>Goonseppe shows you a temporary apple tattoo on her wrist.`,`It's so I don't forget where I came from. Also it looks cool.`]);
RK('goon',8,['guts',3],[`Midnight skate. Empty park. You in?`],[[`[Guts 3] "Obviously."`,3,`The park is silent except for your wheels and her laughing.`,['guts',3]],[`"It's a school night."`,1,`"Boring. Fine."`]]);
RK('goon',9,null,[romantic('goon',`For six years I erased other people's mistakes. You're the first thing I've ever wanted to keep.`,`You're my person. Not like Adam's my person. Differently. Both important.`)]);

// Some ranks open story doors: Milo has to share his music and trust you before he can say yes.
const RANK_FLAGS={milo:{2:'phonk',6:'milo_trust'}};
// Build rank scenes
Object.keys(RANKS).forEach(k=>Object.keys(RANKS[k]).forEach(r=>{
  const R=RANKS[k][r]; r=+r;
  const steps=R.lines.map(l=>typeof l==='function'?{s:k,t:l}:l[0]==='>'?{t:l.slice(1)}:{s:k,t:l});
  if(R.choice) steps.push({choice:R.choice.map(([label,pts,reply,req])=>({t:label, off:req?G=>stat(req[0])<req[1]:null,
    do:G=>{G.aff[k]+=pts;}, then:[{expr:{[k]:pts>=2?'happy':pts===1?'smile':'neutral'}}, /^"[^"]*"$/.test(reply)?{s:k,t:reply.slice(1,-1)}:{t:reply}]}))});
  SCENES[`rank_${k}_${r}`]=[{bg:'town', cast:[[k,'smile']]}, ...steps, {do:G=>{ G.cr=G.cr||{}; G.cr[k]=r; const f=(RANK_FLAGS[k]||{})[r]; if(f){ G.flags[f]=true; if(f==='milo_trust') G.flags.milo_called=false; } rankBanner(k); }}, {goto:'map_after'}];
}));
// Talking to someone: rank up if you've built enough connection (and have the stat it needs), otherwise small talk.
Object.keys(TALKS).forEach(k=>{
  SCENES['talk_small_'+k]=SCENES['talk_'+k].filter(s=>!(s.cast));
  SCENES['talk_small_'+k].unshift({cast:[[k,'smile']]});
  SCENES['talk_'+k]=[
    {bg:'town', cast:[[k,'smile']]},
    {if:G=>k==='adam'&&G.flags.adam_mad?'hang_adam_mad':null},
    {if:G=>{ const r=crOf(k)+1; if(r>CMAX[k] || G.aff[k]<needPts(r)) return null; const R=RANKS[k][r];
      if(R.req && stat(R.req[0])<R.req[1]){ G.gate=`${CHARS[k].name} seems close to opening up, but you'll need more ${STATS[R.req[0]].n} (level ${R.req[1]}) first.`; return 'talk_gate_'+k; }
      return `rank_${k}_${r}`; }},
    {goto:'talk_small_'+k}
  ];
  SCENES['talk_gate_'+k]=[{t:G=>G.gate},{goto:'talk_small_'+k}];
});

// ===== stat training on the map =====
const TRAIN={
  study:   {label:'Study at the library (Knowledge)', at:'library', dx:70, dy:30, stat:'knowledge', n:3, line:`You study until the librarian turns the lights off. Your brain feels bigger.`},
  workout: {label:'Run laps in the park (Guts)',       at:'park',    dx:70, dy:30, stat:'guts',      n:3, line:`You run until your legs give up. Then one more lap, out of spite.`},
  spicy:   {label:'Spicy Pancake Challenge, €5 (Guts)',at:'pancake', dx:110, dy:30, stat:'guts',      n:4, cost:5, line:`Fionn's "Volcano Stack." You finish it. Fionn salutes you in silence.`},
  shelter: {label:'Volunteer at the cat shelter (Kindness)', at:'pawsome', dx:110, dy:30, stat:'kindness', n:3, line:`You spend the afternoon cleaning litter trays and cuddling old cats nobody adopts.`},
  mirror:  {label:'Practise small talk in the mirror (Charm)', at:'home', dx:-80, dy:0, stat:'charm', n:2, line:`"Hey. Hi. Hello. Nice weather." By the end, you almost believe yourself.`},
};
Object.keys(TRAIN).forEach(k=>{ const T=TRAIN[k];
  SCENES['train_'+k]=[{bg:'town', cast:[]},
    {if:G=>T.cost&&G.money<T.cost?'buy_broke':null},
    {do:G=>{ if(T.cost) G.money-=T.cost; addStat(T.stat,T.n); }},
    {t:T.line},{goto:'map_after'}];
});
const _mapTargets=mapTargets;
mapTargets=function(G){
  const t=_mapTargets(G);
  Object.keys(TRAIN).forEach(k=>{ const T=TRAIN[k], p=PLACES.find(q=>q.id===T.at), d=placeDoor(p); t.push({kind:'door',label:T.label,x:d.x+T.dx,y:d.y+T.dy,scene:'train_'+k}); });
  return t;
};
// glow-ups also raise Charm; the gym raises Guts; jobs build Kindness or Guts
SHOP.forEach(it=>{ const sc=SCENES['buy_'+it.k], i=sc.findIndex(s=>s.fx==='sparkle'); sc.splice(i+1,0,{do:G=>addStat(it.k==='gym'?'guts':'charm',3)}); });
[['cafe','kindness',1],['pancake','guts',1],['babysit','kindness',2],['stadium','guts',2]].forEach(([j,s,n])=>{ const sc=SCENES['job_'+j], i=sc.findIndex(x=>x.mini); sc.splice(i+2,0,{do:G=>addStat(s,n)}); });

// ===== Fionn: turning him down safely takes Guts =====
(()=>{ const c=SCENES.conf_fionn.find(s=>Array.isArray(s.choice));
  c.choice.push({t:`[Guts 3] "Fionn. Sit down. I care about you, but not like that. Please hear me out."`, off:G=>stat('guts')<3, goto:'no_fionn_safe'}); })();
SCENES.no_fionn_safe=[
  {cast:[['fionn','surprised']]},
  {s:'fionn', t:`...`},
  {s:'fionn', e:'sad', t:`You actually said it straight. To my face. No running.`},
  {s:'fionn', e:'shy', t:`...Okay. That's fair. I'm not going to chase you down the street. Probably. I'll go eat pancakes about it.`},
  {t:`For once, Fionn handles it calmly. Officer Pim has a quiet night.`},
  ...outThen('fionn')
];

// ===== phone texts =====
const TEXTS=[
  {from:'natan', lines:[`yo did u see that catch at practice`,`ok it was mine. i'm bragging`], replies:[[`"Legendary."`,1,`ur the best`],[`"Saw it. Average."`,0,`WOW`]]},
  {from:'natan', lines:[`do u think lars is mad at me`,`he only replied "k"`], replies:[[`"Lars says 'k' to everyone."`,1,`ok true. thx`],[`"Ask him."`,1,`...brave. ok`]]},
  {from:'lars', lines:[`Statistically, you should bring an umbrella tomorrow.`,`Not that I checked your route. I checked everyone's route.`], replies:[[`"Thanks, weather boy."`,1,`☂️`]]},
  {from:'lars', lines:[`A cat sat on my keyboard and sent you this: jjjjjjjjj`], replies:[[`"Tell the cat hi."`,1,`The cat says hi. I say hi too. Unrelated.`]]},
  {from:'adam', lines:[`Giuseppe wants to know if you finished the maths homework.`,`I want to know too. For Giuseppe.`], replies:[[`"Done. Want answers?"`,0,`NO. Learning is sacred.`],[`"Not yet. Study together?"`,1,`Yes!! Library at 4.`]]},
  {from:'adam', lines:[`table tennis result: me 11, josh 2. josh says it doesn't count. it counts.`], replies:[[`"It counts."`,1,`THANK you.`]]},
  {from:'fionn', lines:[`the ref is BLIND`,`not texting u because i want to talk to u. just needed to tell SOMEONE`], replies:[[`"BLIND. Totally."`,1,`finally someone with sense`],[`"Calm down lol"`,0,`no`]]},
  {from:'fionn', lines:[`made too many pancakes. not for u. they're just there. if u want them.`], replies:[[`"On my way."`,1,`...ok. hurry. not that i care`]]},
  {from:'milo', lines:[`🎧 [voice memo · 0:41]`,`don't comment`], replies:[[`"That was incredible."`,1,`...thx`],[`"Is that a new one?"`,1,`maybe`]]},
  {from:'milo', lines:[`rate this fit 1-10`,`📷`], replies:[[`"11."`,1,`correct`],[`"7."`,0,`blocked. jk. 7 is fair. rude but fair`]]},
  {from:'mada', lines:[`who gave you my number`], replies:[[`"You did. At the café."`,1,`oh right. hi then.`],[`"Adam."`,0,`I'm going to kill him.`]]},
  {from:'mada', lines:[`help. two dresses. which one.`,`📷 📷`], replies:[[`"The second. Not close."`,1,`you have taste. annoying.`]]},
  {from:'gian', lines:[`🍓🍓🍓🍓🍓🍓🍓`,`that's how many I ate today`], replies:[[`"Only seven?"`,1,`I'M PACING MYSELF`]]},
  {from:'gian', lines:[`how do people know when they have a crush? asking for a strawberry`], replies:[[`"Your heart goes fast around them."`,1,`...oh no. oh no`]]},
  {from:'goon', lines:[`hid adam's calculator. he's using his fingers. this is the best day of my life`], replies:[[`"Give it back. ...Eventually."`,1,`eventually 😈`]]},
  {from:'goon', lines:[`skate park. now. bring snacks.`], replies:[[`"Coming."`,1,`🛹`]]},
];
function pickText(G){
  const pool=TEXTS.filter(m=>visible(G,m.from) && !G.out.includes(m.from)); if(!pool.length) return null;
  G.textN=G.textN||{}; pool.sort((a,b)=>(G.textN[TEXTS.indexOf(a)]||0)-(G.textN[TEXTS.indexOf(b)]||0)+Math.random()-.5);
  const m=pool[0]; G.textN[TEXTS.indexOf(m)]=(G.textN[TEXTS.indexOf(m)]||0)+1; return m;
}

// ===== the calendar =====
const EVENTS=[
  {id:'ch3', day:14,  name:'the Festival Pitch'},
  {id:'ch4', day:32,  name:'the Winter Lights Festival'},
  {id:'ch5', day:46,  name:"the Christmas Party at Fionn's"},
  {id:'ch6', day:70,  name:'the start of Winter Term'},
  {id:'ice', day:88,  name:'Ice Skating'},
  {id:'ch7', day:102, name:"Valentine's Day"},
  {id:'ch8', day:235, name:'the End-of-Year Ball'},
];
const nextEvent=n=>EVENTS.find(e=>e.day>n);
// Sundays are rest days; the Christmas break and the long spring are mostly skipped.
function isOpen(n){
  if(n%7===6) return false;
  if(n>=47 && n<=69) return n===52||n===61;
  if(n>=103 && n<=234) return (n>=119&&n<=125)||(n>=161&&n<=167)||(n>=203&&n<=209);
  return true;
}
function skipNote(from,to){
  if(from<47 && to>=47 && to<=69) return 'The Christmas break begins.';
  if(from<=52 && to>=61) return 'Christmas comes and goes. Happy New Year!';
  if(from<103 && to>=119) return 'Weeks pass. February turns into March.';
  if(from<=125 && to>=161) return 'Weeks pass. Spring arrives.';
  if(from<=167 && to>=203) return 'Weeks pass. Exams are coming.';
  return null;
}
const CALSTEP=id=>({_cal:1, if:G=>{ const ev=EVENTS.find(e=>e.id===id); if(G.calDay==null) G.calDay=0; if(G.calDay>=ev.day) return null; G.calTarget=id; return 'cal_next'; }});
SCENES.cal_next=[
  {do:G=>{ const ev=EVENTS.find(e=>e.id===G.calTarget); let n=G.calDay+1; while(n<ev.day && !isOpen(n)) n++; G.calSkip=skipNote(G.calDay,n); G.calDay=Math.min(n,ev.day); }},
  {if:G=>G.calDay>=EVENTS.find(e=>e.id===G.calTarget).day?G.calTarget:null},
  {goto:'cal_day'}
];
SCENES.cal_day=[
  {bg:'town', cast:[]},
  {daycard:true},
  {if:G=>{ if(!G.flags.gian && hearts('adam')>=3){ G.gcRet='cal_day2'; return 'gian_born'; }
           if(G.flags.gian && !G.flags.goon && hearts('adam')>=4){ G.gsRet='cal_day2'; return 'goon_born'; } return null; }},
  {goto:'cal_day2'}
];
SCENES.cal_day2=[{if:G=>Math.random()<.35?'cal_phone':null},{goto:'cal_free'}];
SCENES.cal_phone=[{phone:true},{goto:'cal_free'}];
SCENES.cal_free=[{do:G=>{ const sat=dayDate(G.calDay).getDay()===6; G.mapSlots=sat?2:1; G.mapLabel=sat?'Weekend':'After school'; G.mapNext='cal_next'; }},{goto:G=>G.flags.mapSeen?'map_open':(G.flags.mapSeen=true,'map_intro')}];

// Replace the old fixed after-school/weekend sessions with the calendar.
['ch3','ch4','ch5','ch6','ice','ch7','ch8'].forEach(id=>{
  SCENES[id]=SCENES[id].filter(s=>!(s.if && /'wk'\+n|'as'\+n/.test(s.if.toString())));
  SCENES[id].unshift(CALSTEP(id));
});
// the repeat-year path restarts the calendar from winter term
(()=>{ const r=SCENES.repeat_year, i=r.findIndex(s=>s.goto==='ch6'); r.splice(i,0,{do:G=>{ G.calDay=EVENTS.find(e=>e.id==='ch6').day-14; }}); })();

// ===== special scenes at big moments =====
(()=>{
  const at=(id,pred,stepObj,after)=>{ const sc=SCENES[id]; if(!sc) return; const i=sc.findIndex(pred); if(i>=0) sc.splice(after?i+1:i,0,stepObj); };
  ROM.forEach(k=>{ if(SCENES['yes_'+k]) SCENES['yes_'+k].unshift({cg:'conf_'+k}); at('end_'+k,s=>s.end,{cg:'end_'+k}); });
  at('club_lars',s=>s.expr&&s.expr.lars&&[].concat(s.expr.lars)[1]==='girl',{cg:'lars_poof'},true);
  at('end_lars',s=>s.do&&String(s.do).includes('lars_girl'),{cg:'lars_forever'},true);
  at('val_caught',s=>s.fx==='shake',{do:G=>{G.cgPair=G.dating.slice(0,2);}, cg:'scandal'},true);
  at('no_fionn_chase',s=>s.fx==='siren',{cg:'chase'},true);
  at('gian_born',s=>s.fx==='sparkle',{cg:'gian_born'},true);
  at('goon_born',s=>s.fx==='sparkle',{cg:'goon_born'},true);
  at('tour_win',s=>s.fx==='flash',{cg:'trophy'},true);
  // music cues
  [['val_caught','tense'],['no_fionn_chase','tense'],['fireworks','festival'],['ch8','tender']].forEach(([id,m])=>SCENES[id]&&SCENES[id].unshift({music:m}));
  ROM.forEach(k=>SCENES['conf_'+k]&&SCENES['conf_'+k].unshift({music:'tender'}));
})();
