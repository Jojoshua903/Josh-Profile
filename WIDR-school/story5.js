// ---------- STORY PART 5: Goonseppe, female Lars, Adam's ending ----------

// Giuseppe becomes Goonseppe once Gianmarcina exists and Adam reaches 4 hearts.
const GS=ret=>({if:G=>{ if(G.flags.goon || !G.flags.gian || hearts('adam')<4) return null; G.gsRet=ret; return 'goon_born'; }});
['ch4','ch5','ch6','ch7','ch8'].forEach(id=>SCENES[id].unshift(GS(id)));

SCENES.goon_born=[
  {bg:'library', cast:[['adam','smile'],['gian','smile']]},
  {s:'adam', t:`Okay. Gianmarco became a person. That's fine. That's normal. Giuseppe, you're staying an eraser, right? Right?`},
  {s:'gian', e:'grin', t:`Ooh, I don't think he gets a say in it.`},
  {t:`Adam makes a mistake in his maths homework and reaches for Giuseppe. The moment the eraser touches the page—`},
  {fx:'flash', t:`POOF.`},
  {fx:'sparkle', cast:[['adam','surprised'],['goon','smile']], t:`A girl with green-apple hair and an apple clip is sitting on the desk, swinging her legs.`},
  {s:'goon', t:`Hey. I'm Goonseppe. Don't ask about the name, I picked it in a hurry.`},
  {s:'goon', e:'smirk', t:`I spent years cleaning up everyone's mistakes. Now I'd like to make a few of my own.`},
  {s:'adam', t:`GIUSEPPE?!`},
  {s:'goon', e:'smile', t:`Goonseppe. Relax, Adam. I'm still looking out for you. I'm just taller now.`},
  {t:`Goonseppe joins 5vb the next week. She's calm, a bit chaotic, and fiercely loyal to Adam.`, eff:{flag:'goon', aff:{goon:2}}},
  {goto:G=>G.gsRet}
];

HANG.goon=[`Goonseppe takes you to an arcade. She wins every claw machine and gives all the prizes away.`,`You and Goonseppe sit by the canal sharing green apples. She tells you which of Adam's mistakes were her favourites.`,`Goonseppe teaches you to skateboard. You fall a lot. She says falling is "just a mistake you haven't erased yet."`];
SCENES.hang_goon=[
  {cast:[['goon','happy']]},
  {t:G=>{ G.hang=G.hang||{}; const n=G.hang.goon||0; G.hang.goon=n+1; return HANG.goon[n%3]; }},
  {do:G=>{ G.aff.goon+=2; if(G.dating.includes('goon')) G.aff.goon+=1; }},
  {goto:'wk_after'}
];
// Adam won't warm up to you any more once you're dating Goonseppe.
SCENES.hang_adam=[
  {cast:[['adam','happy']]},
  {if:G=>G.flags.adam_mad?'hang_adam_mad':null},
  {t:G=>{ G.hang=G.hang||{}; const n=G.hang.adam||0; G.hang.adam=n+1; return HANG.adam[n%3]; }},
  {do:G=>{ G.aff.adam+=2; if(G.dating.includes('adam')) G.aff.adam+=1; }},
  {goto:'wk_after'}
];
SCENES.hang_adam_mad=[
  {expr:{adam:'angry'}, s:'adam', t:`I'm busy. With literally anything else.`},
  {goto:'wk_after'}
];

SCENES.ask_goon=[{goto:'conf_goon'}];
SCENES.conf_goon=[
  {cast:[['goon','smirk']]},
  {t:`Goonseppe is sitting on a wall, eating a green apple.`},
  {if:G=>canDate(G,'goon')?null:'fail_goon'},
  {s:'goon', t:`You know what's funny? For years my whole job was erasing things. I've never wanted to keep anything this much.`},
  {s:'goon', e:'shy', t:`I like you, {P}. Go out with me.`},
  {s:'goon', e:'neutral', t:`Just so you know: Adam won't take it well. I was his eraser for six years. He'll think you stole his best friend.`},
  {choice:[
    {t:`"I know. Yes anyway."`, then:[{cast:[['goon','happy']], fx:'sparkle'},{s:'goon',t:`Good. I'll handle Adam. Eventually. Probably.`}], goto:'yes_goon'},
    {t:`"I don't want to come between you and Adam."`, goto:'no_goon'},
  ]},
];
SCENES.yes_goon=[
  {cast:[['adam','angry']], do:G=>{ G.flags.adam_mad=true; G.dating=G.dating.filter(d=>d!=='adam'); if(!G.out.includes('adam')) G.out.push('adam'); }},
  {s:'adam', t:`You and GIUSEPPE?! She was MY eraser! She saw every mistake I ever made, and now she's out making them with YOU?`},
  {t:`Adam stops talking to you. You won't get any closer to him from now on.`},
  ...yesThen('goon')
];
SCENES.no_goon=[
  {cast:[['goon','sad']]},
  {s:'goon', t:`...That's fair. And honestly kind of sweet.`},
  {cast:[['goon','smile'],['adam','smile']]},
  {t:`She goes back to sitting next to Adam in class. They argue about maths. It's very loud and very happy.`},
  ...outThen('goon')
];
SCENES.fail_goon=[
  {s:'P', t:`Goonseppe, I like you.`},
  {cast:[['goon','surprised']]},
  {s:'goon', e:'neutral', t:G=>lateLine(G,`I'm not going to rush this. I spent six years watching people rush things and then erase them. Get to know me first.`)},
  {goto:afterConf}
];
SCENES.val_goon=[{s:'goon', t:`I didn't buy chocolates. I bought you an apple. It's a very good apple. Happy Valentine's Day, {P}.`, eff:{rep:3}},{goto:'val_lock'}];
SCENES.end_goon=[
  {cast:[['goon','happy']]},
  {s:'goon', t:`You know what my favourite mistake was? Falling for you. I'm keeping that one.`},
  {end:'Green Apple Era', who:'goon', kind:'GOONSEPPE · CANON ENDING', sub:'You and Goonseppe', text:`She still carries a green apple everywhere and still won't explain her name. Adam held a grudge for exactly one year. Then, at the end of 6 VWO, he finally gave you both a nod. Just one. It counted.`}
];

// ----- female Lars: canonically gorgeous -----
(()=>{
  const cl=SCENES.club_lars, i=cl.findIndex(s=>typeof s.t==='string'&&s.t.startsWith('Where Lars was standing'));
  cl[i]={expr:{lars:['surprised','girl']}, fx:'sparkle', t:`Where Lars was standing, there's now a girl with the same blue eyes, longer curls, the same white shirt and skinny jeans. She is, honestly, stunning.`};
  cl.splice(i+1,0,{t:`Two customers forget they were drinking coffee. One cat stops mid-yawn.`});
  const el=SCENES.end_lars, j=el.findIndex(s=>s.s==='lars'&&typeof s.t==='string'&&s.t.startsWith(`It's me.`));
  el.splice(j+1,0,{t:`Across the terrace, people start to stare. By the end of the night, three people have asked who the "new girl" is. Lars just smirks. Statistically, she was always going to be gorgeous.`});
  const e=el.find(s=>s.end);
  e.text=`Lars is still Lars, still in white shirts and skinny jeans, and now one of the best-looking people at WidR. She can finally hold every cat at Pawsome Café. Natan cried happy tears and called it "the best plot twist in WidR history." Her genius moves continue, but now they're all out in the open.`;
})();

// ----- Adam's moment at the ball (plays unless you end up with Adam) -----
SCENES.adam_epi=[
  {bg:'sunset', cast:[['adam','sad']]},
  {t:`Later, you spot Adam alone at the edge of the terrace. He's crying.`},
  {if:G=>G.endWho==='goon'?'epi_mad':G.flags.goon?'epi_goon':'epi_poof'}
];
SCENES.epi_poof=[
  {s:'adam', t:G=>G.flags.gian?`Everyone found someone tonight. Even Gianmarco found someone. Well. Became someone.`:`Everyone found someone tonight. It's fine. I've still got you, Giuseppe.`},
  {s:'adam', e:'sad', t:`You've seen every mistake I've ever made. You never once complained.`},
  {t:`A tear lands on the green apple eraser.`},
  {fx:'flash', t:`POOF.`},
  {fx:'sparkle', cast:[['adam','surprised'],['goon','smile']], do:G=>{G.flags.goon=true;}, t:`Standing where the eraser was, there's a girl with green-apple hair and an apple clip.`},
  {s:'goon', t:`Hey, Adam. It's me. Goonseppe. Don't ask about the name. Please don't cry. I've been with you through every mistake, and I'm not going anywhere.`},
  {s:'adam', e:'happy', t:`...Goonseppe. Okay. Okay. Do you... want to dance?`},
  {cast:[['adam','happy'],['goon','happy']], do:G=>{G.epiNote=`And somewhere on the terrace, Adam finally stopped crying. Goonseppe made sure of it.`;}, t:`They dance badly, and Adam doesn't stop smiling for the rest of the night.`},
];
SCENES.epi_goon=[
  {s:'adam', t:`Everyone found someone. It's fine. It's totally fine.`},
  {cast:[['adam','sad'],['goon','smile']]},
  {s:'goon', t:`Adam. I've been looking for you all night. You think I'd let you cry alone at a ball?`},
  {s:'adam', e:'happy', t:`...Goonseppe. Do you want to dance?`},
  {cast:[['adam','happy'],['goon','happy']], do:G=>{G.epiNote=`Adam and Goonseppe danced until the DJ went home. He says it was the best mistake he's ever made.`;}, t:`They dance badly, and Adam doesn't stop smiling for the rest of the night.`},
];
SCENES.epi_mad=[
  {s:'adam', e:'angry', t:`You took Giuseppe. My eraser. My best friend. And now you're dancing with her.`},
  {if:G=>G.flags.gian && G.endWho!=='gian' && !G.dating.includes('gian')?'epi_mad_gian':'epi_mad_josh'}
];
SCENES.epi_mad_gian=[
  {cast:[['adam','sad'],['gian','smile']]},
  {s:'gian', t:`Hey. Strawberry? You look like you need one. Or twelve.`},
  {s:'adam', e:'shy', t:`...Gianmarcina. You came back for me?`},
  {cast:[['adam','happy'],['gian','happy']], do:G=>{G.epiNote=`Adam is still mad at you. But Gianmarcina sat with him all night, and by the end he was laughing.`;}, t:`She sits with him for the rest of the night, feeding him strawberries until he laughs.`},
];
SCENES.epi_mad_josh=[
  {cast:[['adam','sad'],['josh','smile']]},
  {s:'josh', t:`Adam. Fun fact: erasers are made of rubber, and rubber bounces back. So will you.`},
  {s:'adam', e:'smile', t:`...That's the worst fact you've ever told me. Thanks, Josh.`},
  {do:G=>{G.epiNote=`Adam is still mad at you. Josh stayed with him all night, and by the end he was smiling again.`;}, t:`Josh stays with him all night, telling him the worst facts he knows.`},
];
