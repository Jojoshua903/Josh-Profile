// ---------- WALKING: the town map after school and on weekends ----------
// Walk with WASD / arrow keys, or click where you want to go. Walk up to a person or a door and
// press E / Space (or click it) to interact. Every visit uses one free slot; Reshman's tips and Home don't.
const PLACES=[
  {id:'field',  name:'School Field',    x:60,  y:50,  w:380, h:200, col:'#7fcf6e', who:'natan', icon:'⚾'},
  {id:'library',name:'Library',         x:520, y:50,  w:250, h:200, col:'#f3e3c8', who:'adam',  icon:'📚'},
  {id:'roof',   name:'School Rooftop',  x:790, y:50,  w:200, h:200, col:'#c9a0ff', who:'milo',  icon:'🎧'},
  {id:'pawsome',name:'Pawsome Café',    x:1070,y:50,  w:220, h:200, col:'#ffb3cf', who:'lars',  icon:'🐾', job:'cafe'},
  {id:'pancake',name:'Pancake Café',    x:1320,y:50,  w:230, h:200, col:'#ffd38a', who:'fionn', icon:'🥞', job:'pancake'},
  {id:'park',   name:'Park',            x:60,  y:360, w:380, h:200, col:'#9fdc8a', who:'gian',  icon:'🍓'},
  {id:'skate',  name:'Skate Park',      x:520, y:360, w:250, h:200, col:'#cfd8e6', who:'goon',  icon:'🛹'},
  {id:'mall',   name:'Boutique (outfits)',x:850,y:360, w:300, h:200, col:'#ffc94d', who:'mada',  icon:'👗', shop:'fit'},
  {id:'barber', name:'Barber',          x:1200,y:360, w:160, h:200, col:'#8ec5ff', icon:'💈', shop:'barber'},
  {id:'gym',    name:'Gym',             x:1390,y:360, w:160, h:200, col:'#e8706b', icon:'🏋️', shop:'gym'},
  {id:'skin',   name:'Skincare Shop',   x:60,  y:660, w:260, h:190, col:'#7fd6c2', icon:'🧴', shop:'skin'},
  {id:'twins',  name:"Neighbours' House",x:360,y:660, w:240, h:190, col:'#ffe0b0', icon:'👶', job:'babysit'},
  {id:'stadium',name:'Stadium',         x:650, y:660, w:380, h:190, col:'#bfe3ff', icon:'🏟️', job:'stadium', weekend:true},
  {id:'home',   name:'Home',            x:1090,y:660, w:200, h:190, col:'#fff0d1', icon:'🏠', home:true},
];
const MAP_NPC_SPOT={natan:'field',adam:'library',milo:'roof',lars:'pawsome',fionn:'pancake',gian:'park',goon:'skate',mada:'mall'};
function placeDoor(p){ return {x:p.x+p.w/2, y:p.y+p.h+8}; }
function npcPos(k){ const p=PLACES.find(q=>q.id===MAP_NPC_SPOT[k]); return {x:p.x+p.w/2-70, y:p.y+p.h-40}; }

// Everything you can interact with right now: [{kind,label,x,y,scene,free}]
function mapTargets(G){
  const t=[], wk=G.mapLabel==='Weekend';
  ROM.forEach(k=>{ if(!visible(G,k) || G.out.includes(k)) return; const p=npcPos(k); t.push({kind:'npc',k,label:'Talk to '+CHARS[k].name,x:p.x,y:p.y,scene:'talk_'+k}); });
  t.push({kind:'npc',k:'reshman',label:'Ask Reshman for ranking tips',x:1400,y:770,scene:'tip_reshman',free:true});
  PLACES.forEach(p=>{ const d=placeDoor(p);
    if(p.job && (!p.weekend||wk)) t.push({kind:'door',label:`Work at ${p.name}`,x:d.x+(p.who?50:0),y:d.y,scene:'job_'+p.job});
    if(p.job && p.weekend && !wk) t.push({kind:'door',label:`${p.name} (weekends only)`,x:d.x,y:d.y,scene:null});
    if(p.shop) t.push({kind:'door',label:`Shop: ${p.name}`,x:d.x+(p.who?50:0),y:d.y,scene:'buy_'+p.shop});
    if(p.home) t.push({kind:'door',label:'Go home (end the day)',x:d.x,y:d.y,scene:'map_home',free:true});
  });
  return t;
}

function openMap(){
  const wrap=document.createElement('div'); wrap.id='walkmap';
  wrap.style.cssText='position:absolute;inset:0;z-index:9;background:#d9f0c8';
  const cv=document.createElement('canvas'); cv.width=1600; cv.height=900; cv.style.cssText='width:100%;height:100%;display:block;touch-action:none';
  wrap.appendChild(cv); $('stage').appendChild(wrap); $('box').style.visibility='hidden'; $('cast').innerHTML=''; $('chapter').textContent=G.mapLabel;
  const ctx=cv.getContext('2d'), targets=mapTargets(G);
  if(!G.mapPos) G.mapPos={x:1190,y:870};
  const P=G.mapPos, keys={}; let goal=null, pend=null, near=null, last=0, raf=0, bump=0;
  const toC=e=>{ const r=cv.getBoundingClientRect(); return [(e.clientX-r.left)/r.width*1600,(e.clientY-r.top)/r.height*900]; };
  function use(tg){ if(!tg.scene){ bump=1.2; return; }
    cancelAnimationFrame(raf); cleanup(); wrap.remove(); $('box').style.visibility='visible';
    if(!tg.free) G.mapSlotsUsing=true; jump(tg.scene); }
  function frame(ts){ if(!wrap.isConnected || !G){ cleanup(); return; } const dt=Math.min(.05,(ts-(last||ts))/1000); last=ts; bump=Math.max(0,bump-dt);
    let vx=0,vy=0; if(keys.a||keys.arrowleft)vx--; if(keys.d||keys.arrowright)vx++; if(keys.w||keys.arrowup)vy--; if(keys.s||keys.arrowdown)vy++;
    if(vx||vy){ goal=null; pend=null; } else if(goal){ const dx=goal.x-P.x, dy=goal.y-P.y, d=Math.hypot(dx,dy); if(d<8){ goal=null; if(pend){ const t=pend; pend=null; return use(t); } } else { vx=dx/d; vy=dy/d; } }
    const m=Math.hypot(vx,vy)||1; P.x=Math.max(30,Math.min(1570,P.x+vx/m*420*dt)); P.y=Math.max(30,Math.min(880,P.y+vy/m*420*dt));
    near=null; let best=90; targets.forEach(t=>{ const d=Math.hypot(t.x-P.x,t.y-P.y); if(d<best){best=d;near=t;} });
    draw(); raf=requestAnimationFrame(frame); }
  function draw(){
    ctx.fillStyle='#d9f0c8'; ctx.fillRect(0,0,1600,900);
    ctx.fillStyle='#e9dcc7'; [[0,270,1600,70],[0,580,1600,60],[470,0,40,900],[1030,0,30,660],[1300,580,30,320]].forEach(r=>ctx.fillRect(...r));
    ctx.strokeStyle='#fff';ctx.lineWidth=4;ctx.setLineDash([24,18]);ctx.beginPath();ctx.moveTo(0,305);ctx.lineTo(1600,305);ctx.moveTo(0,610);ctx.lineTo(1600,610);ctx.stroke();ctx.setLineDash([]);
    PLACES.forEach(p=>{ rr(ctx,p.x,p.y,p.w,p.h,16,p.col); rr(ctx,p.x-6,p.y-6,p.w+12,40,12,shade(p.col,-.15));
      txt(ctx,p.icon,p.x+p.w/2,p.y+p.h/2+10,64); txt(ctx,p.name,p.x+p.w/2,p.y+14,24,'#2b2340');
      const d=placeDoor(p); rr(ctx,d.x-22,p.y+p.h-36,44,36,6,'#8c5a3c'); });
    [[455,240],[1010,240],[455,560],[1180,560],[1320,860],[1560,860],[30,320],[640,320]].forEach(([x,y])=>{ ctx.fillStyle='#5fb85a';ctx.lineWidth=4;ctx.strokeStyle='#2b2340';ctx.beginPath();ctx.arc(x,y,24,0,7);ctx.fill();ctx.stroke(); });
    targets.filter(t=>t.kind==='npc').forEach(t=>{ const c=CHARS[t.k]; chibi(ctx,t.x,t.y,c.hair,c.tc,.8,c.skin);
      txt(ctx,c.name+(G.dating.includes(t.k)?' 💘':''),t.x,t.y+60,20); });
    chibi(ctx,P.x,P.y,G.gender==='m'?'#3b2a1e':'#7a4a2a','#ff6f9f',.9); txt(ctx,'You',P.x,P.y+62,20,'#ff6f9f');
    rr(ctx,20,800,560,80,20,'#fff8ee'); txt(ctx,`${G.mapLabel} · ${G.mapSlots} visit${G.mapSlots===1?'':'s'} left · €${G.money}`,300,840,28);
    if(near){ rr(ctx,P.x-230,P.y-120,460,56,18,'#fff'); txt(ctx,(bump>0&&!near.scene)?'Closed today. Come back at the weekend!':`Press E or click: ${near.label}`,P.x,P.y-92,22); }
    txt(ctx,'Walk: WASD / arrow keys, or click anywhere',1300,880-6,20,'#5c5175');
  }
  cv.onpointerdown=e=>{ e.stopPropagation(); const [x,y]=toC(e);
    const hit=targets.find(t=>Math.hypot(t.x-x,t.y-y)<70);
    if(hit){ if(Math.hypot(hit.x-P.x,hit.y-P.y)<90) return use(hit); goal={x:hit.x,y:hit.y+ (hit.kind==='npc'?0:10)}; pend=hit; }
    else { goal={x,y}; pend=null; } };
  const kd=e=>{ if(!document.getElementById('walkmap')||overlayOpen2()) return; const k=e.key.toLowerCase(); keys[k]=true;
    if((k==='e'||k===' '||k==='enter') && near){ e.preventDefault(); e.stopPropagation(); use(near); } };
  const ku=e=>{ keys[e.key.toLowerCase()]=false; };
  document.addEventListener('keydown',kd,true); document.addEventListener('keyup',ku,true);
  const cleanup=()=>{ document.removeEventListener('keydown',kd,true); document.removeEventListener('keyup',ku,true); };
  raf=requestAnimationFrame(frame);
}
const overlayOpen2=()=>['panel','pause','rankboard','mini','journal'].some(id=>{ const el=document.getElementById(id); return el && getComputedStyle(el).display!=='none'; });

// ----- scenes that drive the map -----
SCENES.map_open=[{map:true}];
SCENES.map_after=[{do:G=>{ G.mapSlots--; }},{if:G=>G.mapSlots>0?'map_open':'map_leave'}];
SCENES.map_home=[{bg:'night', cast:[]},{t:`You head home early. Tomorrow's another day.`},{goto:'map_leave'}];
SCENES.map_leave=[{do:G=>{ G.mapPos=null; }},{goto:G=>G.mapNext}];
// After school (2 visits) and weekends (3 visits). Each runs once, then continues to `next`.
const AS=(n,next)=>({if:G=>{ if(G.flags['as'+n]) return null; G.flags['as'+n]=true; G.mapNext=next; G.mapSlots=2; G.mapLabel='After school'; return 'map_intro'; }});
SCENES.map_intro=[{bg:'town', cast:[]},{t:G=>G.mapLabel==='Weekend'?`It's the weekend! Walk around town: work a shift, shop for a glow-up, or find someone to talk to. You have ${G.mapSlots} visits.`:`School's out. Walk around and find someone to talk to, or pick up a shift. You have ${G.mapSlots} visits before dinner.`},{goto:'map_open'}];
SCENES.weekend=[{do:G=>{ G.mapNext=G.wkNext; G.mapSlots=3; G.mapLabel='Weekend'; }},{goto:'map_intro'}];
[['ch3',1],['ch4',2],['ice',3],['ch7',4]].forEach(([id,n])=>SCENES[id].unshift(AS(n,id)));

// ----- jobs: now real mini-games -----
const JOBS={
  cafe:   {bg:'catcafe', who:'lars',  intro:[['lars','smile'],`Apron on. Coffee machine on. Me, very far from the cats. Let's go.`]},
  pancake:{bg:'living',  who:'fionn', intro:[['fionn','grin'],`The lunch rush is starting! Don't burn anything. I'm watching. Not because I care.`]},
  babysit:{bg:'living',  who:null,    intro:null, narr:`The neighbours hand you the twins, a list of rules, and a look of pure relief.`},
  stadium:{bg:'field',   who:null,    intro:null, narr:`It's match day at the stadium. The snack stand is short-staffed, and the crowd is huge.`},
};
Object.keys(JOBS).forEach(k=>{ const J=JOBS[k];
  SCENES['job_'+k]=[
    {bg:J.bg, cast:J.intro?[J.intro[0]]:[]},
    J.intro?{s:J.who,t:J.intro[1]}:{t:J.narr},
    {mini:k},
    {do:G=>{ G.money+=G.mini.pay; if(J.who) G.aff[J.who]+= G.mini.pct>.6?2:1; }},
    {t:G=>`${G.mini.text} You earned €${G.mini.pay}. (You now have €${G.money}.)`},
    J.who?{s:J.who,t:G=>G.mini.pct>.7?(J.who==='lars'?`That was statistically excellent. Same time next week?`:`That was... actually really good. Don't let it go to your head.`):(J.who==='lars'?`Not bad. The cats survived. That's what matters.`:`We'll work on it. I'll teach you. Not because I want to hang out.`)}:{t:` `},
    {goto:'map_after'}
  ];
});
// ----- glow-up shops on the map -----
SHOP.forEach(it=>{
  SCENES['buy_'+it.k]=[
    {bg:'town', cast:[]},
    {if:G=>(G.buys[it.k]||0)>=it.max?'buy_max':G.gen.glow>=30?'buy_max':G.money<it.p?'buy_broke':null},
    {do:G=>{ const before=cha(); G.money-=it.p; G.buys[it.k]=(G.buys[it.k]||0)+1; G.gen.glow=Math.min(30,G.gen.glow+it.g(G)); G.lastCha=[before,cha()]; }},
    {fx:'sparkle', t:G=>`${it.n}: done. Charisma ${G.lastCha[0]} → ${G.lastCha[1]}. (€${G.money} left.)`},
    {goto:'map_after'}
  ];
});
SCENES.buy_broke=[{t:G=>`You can't afford that yet. You have €${G.money}. Pick up a shift first.`},{goto:'map_open'}];
SCENES.buy_max=[{t:`You've already done as much of that as you can. Try something else.`},{goto:'map_open'}];
SCENES.tip_reshman=[
  {bg:'town', cast:[['reshman','smirk']]},
  {s:'reshman', t:G=>`You're #${myRank()} right now, {P}. Charisma ${cha()}.`},
  {s:'reshman', t:G=>G.frozen?`Rankings are locked, so now it's all about who actually knows you.`:cha()<45?`Real talk: get a haircut, hit the gym, buy some decent clothes. Charisma makes everything you do count for more.`:`Big moments move the ranking: festivals, tournaments, the school play. Don't skip them.`},
  {goto:'map_open'}
];

// ----- after-school conversations: three per person, each with a choice -----
const TALKS={
  natan:[
    [`Natan's practising pitches against the fence. "Hey! Catch!"`, [[`Catch it one-handed`,2,`"WHOA. Okay, you're joining the team. I'm not asking."`],[`Duck`,0,`"...Fair. My aim is a crime."`],[`Ask him to teach you`,2,`"Really? Okay! Stance first. No, other foot. Perfect!"`]]],
    [`Natan's lying in the grass, staring at the sky. "Do you ever think about what comes after school?"`, [[`"Honestly? All the time."`,2,`"Right?! I want to play baseball forever. Or teach it."`],[`"Not really. Now's good."`,1,`"Ha. Yeah. Now's pretty good."`]]],
    [`Natan's clearly waiting for someone. He perks up when he sees you. "Oh, hey! I thought you were Lars."`, [[`"Disappointed?"`,1,`"No! No. You're... honestly, better company today."`],[`"You talk about Lars a lot."`,2,`He goes red. "Do I? ...Maybe I do."`]]],
  ],
  lars:[
    [`Lars is reading outside Pawsome Café, keeping a careful two metres from the window cats.`, [[`"What are you reading?"`,2,`"Probability theory. It's romantic, actually. Everything's a maybe."`],[`Sit down and read with him`,2,`He doesn't say anything. He just moves his bag so you fit.`]]],
    [`"{P}! What are the odds. I definitely didn't check when you finish class."`, [[`"You checked."`,1,`"I estimated. It's different."`],[`"Lucky me, then."`,2,`His ears go pink. "...Statistically, yes."`]]],
    [`Lars is crouched near a kitten, hands in his pockets, almost touching it.`, [[`"You really love them, huh?"`,2,`"More than almost anything. Almost."`],[`Pick up the kitten so he can see it close up`,2,`He leans in. Closer than he needs to. To the kitten. Obviously.`]]],
  ],
  adam:[
    [`Adam's in the library, quizzing Giuseppe on capital cities. Giuseppe is not answering.`, [[`"Quiz me instead"`,2,`"Finally, a worthy opponent!"`],[`"Want to play table tennis instead?"`,2,`"Oh, you're going DOWN."`]]],
    [`Adam looks stressed. "Mock exams next week. My parents want top three."`, [[`"You'll smash it. And if not, you're still you."`,2,`He smiles properly for the first time today.`],[`"Let's make a study plan together."`,2,`"A plan? With colour-coding? You get me."`]]],
    [`Adam's watching a match on his phone. "This keeper is a disgrace."`, [[`Watch it with him`,2,`You both groan at exactly the same moment. Twice.`],[`"Isn't that the same keeper Fionn loves?"`,1,`"Don't tell Fionn I said that. He'll hold a funeral."`]]],
  ],
  fionn:[
    [`Fionn's wiping tables at the pancake café. "We're closed. ...For you we're open. Sit."`, [[`"Thanks, Fionn."`,2,`"Don't thank me! Eat!"`],[`Help him wipe the tables`,2,`"You're doing it wrong. ...You're doing it fine. Keep going."`]]],
    [`Fionn's furious at his phone. "They benched our best striker. BENCHED!"`, [[`Get angry with him`,2,`"FINALLY someone understands!"`],[`"Breathe. It's one match."`,1,`He stares at you. "One match? ONE MATCH?" Then he breathes. "...Fine. One match."`]]],
    [`Fionn's in his gym gear. "I'm NOT going to the gym. I'm just... dressed like this."`, [[`"Want company?"`,2,`"...If you're going anyway. I guess. Whatever. Yes."`],[`"You look good, Fionn."`,2,`He walks straight into a door.`]]],
  ],
  milo:[
    [`Milo's on the rooftop, earbuds in. He takes one out. "You want to hear something new?"`, [[`"Always."`,2,`It's incredible. He watches your face the whole time.`],[`"Is it phonk?"`,1,`"It's always phonk."`]]],
    [`Milo's adjusting his coat in a window reflection. "Be honest. Too much?"`, [[`"Never too much. It's perfect."`,2,`"I knew it. But thanks."`],[`"Maybe lose the scarf."`,1,`He thinks about it for a long time. He keeps the scarf.`]]],
    [`Milo's watching the football pitch again. Daniel's there.`, [[`Stand next to him and say nothing`,2,`"...Thanks for not making it a thing."`],[`"Want to get out of here?"`,2,`He blinks. "...Yeah. Actually. Yeah."`]]],
  ],
  mada:[
    [`Mada's in the boutique, holding up two jackets. "Which one?"`, [[`Pick the bolder one`,2,`"Good. You have taste. Rare."`],[`"Either. You'd look good in a bin bag."`,0,`"Everyone says that. Try harder."`]]],
    [`Three boys are trying to talk to Mada. She looks bored. She spots you. "Oh, thank god. Walk with me."`, [[`Walk with her`,2,`"You're the only person who doesn't stare. I like that."`],[`"Busy day?"`,1,`"Every day is a busy day when you're number one."`]]],
    [`Mada's sitting alone for once. "Don't tell anyone, but being #1 is exhausting."`, [[`"Then just be Mada for a bit."`,3,`She actually smiles. Not the ranking smile. A real one.`],[`"I'd love to be #1."`,0,`"You say that now."`]]],
  ],
  gian:[
    [`Gianmarcina's at the strawberry stand in the park. "Strawberry? It's the best one. They're all the best one."`, [[`Eat it`,2,`"YES. You get it."`],[`"Do you eat anything else?"`,1,`"...Strawberry ice cream?"`]]],
    [`"I'm still learning how to be a person. What's your favourite thing about it?"`, [[`"Days like this."`,2,`"Days like this," she repeats, like she's saving it.`],[`"Food."`,2,`"FOOD. Correct."`]]],
    [`Gianmarcina's trying to skip stones. They sink. All of them.`, [[`Teach her`,2,`On her fifth try, it skips twice. She screams with joy.`],[`Laugh`,0,`"Hey! I've only had arms for a few weeks!"`]]],
  ],
  goon:[
    [`Goonseppe's at the skate park, failing a kickflip on purpose. "Mistakes are fun when you don't have to erase them."`, [[`Try one too`,2,`You both fall. She laughs so hard she has to sit down.`],[`"Why 'Goonseppe'?"`,1,`"Classified."`]]],
    [`"Adam's been studying too hard. I keep hiding his textbooks."`, [[`"Good. He needs a break."`,2,`"See? You get it."`],[`"He might fail, though."`,1,`"He won't. I know every mistake he's ever made. He's ready."`]]],
    [`Goonseppe's eating a green apple on the half-pipe. "Want half?"`, [[`Take half`,2,`It's a very good apple.`],[`"I prefer strawberries."`,0,`"Ugh. You and Gianmarcina."`]]],
  ],
};
Object.keys(TALKS).forEach(k=>{
  SCENES['talk_'+k]=[
    {bg:'town', cast:[[k,'smile']]},
    {if:G=>k==='adam'&&G.flags.adam_mad?'hang_adam_mad':null},
    {do:G=>{ G.talkN=G.talkN||{}; G.curTalk=TALKS[k][(G.talkN[k]||0)%3]; G.talkN[k]=(G.talkN[k]||0)+1; }},
    {t:G=>G.curTalk[0]},
    {choice:G=>G.curTalk[1].map(([label,gain,reply])=>({t:label, do:G=>{ G.aff[k]+= gain + (G.dating.includes(k)?1:0) - (k==='mada'&&myRank()>6&&gain>0?1:0); },
      then:[{expr:{[k]:gain>=2?'happy':gain===1?'smile':'neutral'}},reply[0]==='"'?{s:k,t:reply.slice(1,reply.lastIndexOf('"'))+reply.slice(reply.lastIndexOf('"')+1)}:{t:reply}]}))},
    {goto:'map_after'}
  ];
});
