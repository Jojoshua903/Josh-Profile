// ---------- STORY PART 7: school-day events, funny and tense, spread across the calendar ----------
// Each event plays once, during a school day, before your free time. Lines starting with "[Stat N]" are locked until you have that stat.
const MVDM='Meneer van der Meijs';
const req=(k,n)=>G=>stat(k)<n;
const DAYEV=[];
const ev=(id,from,cond,steps,to)=>{ DAYEV.push({id,from,to:to||999,cond}); SCENES['ev_'+id]=[...steps,{goto:'cal_free'}]; };
const any=()=>true, has=f=>G=>!!G.flags[f], vis=k=>G=>visible(G,k)&&!G.out.includes(k);

// ===== FUNNY =====
ev('drill',3,any,[
  {bg:'classroom', cast:[['josh','neutral']]},
  {t:`Third period. ${MVDM} is halfway through a sentence about the subjunctive when the fire alarm goes off.`},
  {n:MVDM, t:`It's a drill! Calmly! Single file! Leave your bags! Josh, leave the bag.`},
  {s:'josh', e:'surprised', t:`Did you know fire needs three things? Heat, fuel, oxygen. Also, did you know the oldest fire extinguisher was a bucket? Also, is the drill timed? Because if it's timed I need to—`},
  {cast:[['adam','surprised'],['fionn','angry']]},
  {t:`Adam is the first one out of the door, holding his pencil case above his head like a newborn.`},
  {s:'adam', t:`Gianmarco and Giuseppe can't walk! Somebody has to think of the erasers!`},
  {s:'fionn', t:`I'm not scared. I'm walking fast because I'm efficient. There's a difference.`},
  {t:`Fionn is carrying the class goldfish. Nobody asked him to. He refuses to explain.`},
  {cast:[['reshman','smirk']]},
  {s:'reshman', t:`Out on the field, Reshman is giving everyone marks for evacuation style. Out of ten.`},
  {s:'reshman', t:`Adam: four. Too much panic. Fionn: seven, the fish adds drama. {P}? Let's see it.`},
  {choice:[
    {t:`Walk out like it's a fashion show`, eff:{rep:2}, then:[{s:'reshman', e:'happy', t:`NINE. Calm under pressure. That's ranking material.`}]},
    {t:`Go back and help Josh, who is still explaining fire to the empty classroom`, do:G=>addStat('kindness',1), then:[{s:'josh', e:'happy', t:`Oh! Thanks. I got stuck on oxygen. It's a really good element.`}]},
    {t:`"Reshman, why are YOU not in a line?"`, then:[{s:'reshman', e:'smirk', t:`Because the line is for people who aren't the line, {P}.`},{t:`Nobody, including Reshman, knows what that means.`}]},
  ]},
]);
ev('aim',6,any,[
  {bg:'field', cast:[['natan','grin'],['daniel','angry']]},
  {t:`Baseball practice. Natan winds up, throws, and hits Daniel squarely in the back. Daniel is not on the baseball field. Daniel is on the football pitch next to it.`},
  {s:'daniel', t:`That's the fourth time this week.`},
  {s:'natan', e:'shy', t:`Fifth. You didn't notice Tuesday.`},
  {s:'daniel', t:`How do you hit me from there? I'm forty metres away. There's a fence.`},
  {s:'natan', t:`It's honestly a gift at this point.`},
  {choice:[
    {t:`"Natan, aim at the glove. Not at Daniel. The glove."`, aff:{natan:1}, then:[{s:'natan', e:'happy', t:`Glove. Okay. Glove glove glove—`},{fx:'shake', t:`He hits Daniel.`},{s:'daniel', t:`I'm getting a helmet.`}]},
    {t:`Stand in front of Daniel as a human shield`, do:G=>addStat('guts',1), then:[{t:`Natan throws. It goes nowhere near you. It curves. It finds Daniel anyway.`},{s:'daniel', t:`Thank you for trying. It's a curse. I've accepted it.`}]},
    {t:`"Why is it always Daniel, though?"`, aff:{natan:1}, then:[{s:'natan', e:'blush', t:`It's not ALWAYS Daniel. Sometimes I aim at Lars's general direction and it goes to Daniel instead.`},{t:`He realises what he just said. He throws another ball to change the subject. It hits Daniel.`}]},
  ]},
]);
ev('group',10,any,[
  {bg:'classroom', cast:[['lars','smile'],['fionn','angry'],['josh','neutral']]},
  {n:MVDM, t:`Group project. Groups of four. I've chosen them, so there's no point looking at me like that, Fionn.`},
  {t:`You're with Lars, Fionn and Josh. Lars has already opened his laptop. There are fourteen slides. It's been ninety seconds.`},
  {s:'lars', t:`I took the liberty of making a plan. Colour-coded by role. {P}, you're pink. Pink means "presenter." Completely random choice.`},
  {s:'fionn', t:`I'm not doing anything. Group projects are a scam.`},
  {s:'josh', e:'happy', t:`Our topic is the Dutch water system! Did you know there are more bikes than people? That's not about water. Also the Afsluitdijk is 32 kilometres. Also I can't find my pen. Also—`},
  {choice:[
    {t:`[Knowledge 2] Actually organise it: research, slides, practice, done`, off:req('knowledge',2), eff:{rep:3}, aff:{lars:1,fionn:1}, then:[{s:'lars', e:'surprised', t:`That's... better than my plan. I'm recolouring everything. Out of respect.`}]},
    {t:`Let Lars run the whole thing`, aff:{lars:1}, then:[{s:'lars', e:'happy', t:`Excellent. Step one: meetings. Every day. With {P}. For research.`},{s:'fionn', t:`Why are the meetings only with {P}?`},{s:'lars', e:'neutral', t:`Efficiency.`}]},
    {t:`"Fionn, you're doing the poster. You're good at it and you know it."`, aff:{fionn:2}, then:[{s:'fionn', e:'blush', t:`...I'm not good at it. Shut up. What size?`}]},
  ]},
  {cast:[['fionn','shy']]},
  {t:`The next morning, the whole project is finished. Fionn did all of it at 3 a.m. He insists he "couldn't sleep anyway" and "was bored" and "it's bad, don't look at it." It's the best poster in the school.`},
]);
ev('inspect',20,vis('fionn'),[
  {bg:'living', cast:[['fionn','surprised']]},
  {music:'tense'},
  {t:`You're picking up a pancake at Fionn's family café when a woman with a clipboard walks in. Fionn goes white.`},
  {s:'fionn', t:`That's the health inspector. My parents are in Utrecht. I'm in charge. I'm going to be arrested. Officer Pim is going to have to arrest me AGAIN. Or for the first time. Depends how today goes.`},
  {n:'Inspector', t:`Fridge temperatures, please. And why is there a goldfish behind the till?`},
  {s:'fionn', e:'angry', t:`That's... the school's fish. I'm babysitting it. It's a long story. It's a fire drill story.`},
  {choice:[
    {t:`[Charm 2] Talk to the inspector while Fionn fixes the fridge`, off:req('charm',2), aff:{fionn:3}, then:[{t:`You talk about pancake history for six minutes straight. The inspector is charmed. The fridge reaches 4°C just in time.`},{n:'Inspector', t:`Passed. The fish has to go, though.`},{s:'fionn', e:'happy', t:`WE PASSED. I mean. Obviously. I'm always clean. ...Thank you. You were amazing. Don't repeat that.`}]},
    {t:`[Guts 2] Grab the goldfish bowl and casually walk out the back door`, off:req('guts',2), aff:{fionn:2}, then:[{t:`You sprint the goldfish to the next street. The inspection passes. You stand in the cold holding a fish for twenty minutes.`},{s:'fionn', e:'blush', t:`You saved Henk. The fish is called Henk now. Don't ask.`}]},
    {t:`Hide in the kitchen and pray`, aff:{fionn:1}, then:[{t:`Fionn survives on his own, barely. The café gets a "needs improvement" sticker.`},{s:'fionn', e:'sad', t:`It's fine. It's a sticker. I'll put a pancake sticker over it.`}]},
  ]},
]);
ev('seminar',36,any,[
  {bg:'cafeteria', cast:[['reshman','smirk'],['josh','neutral']]},
  {t:`Reshman has taken over a cafeteria table. There's a handwritten sign: "RANK UP OR SHUT UP. Seminar. €2."`},
  {s:'reshman', t:`Rule one. Never be seen running. Unless it's away from Fionn.`},
  {s:'reshman', t:`Rule two. Always carry one item that makes people ask questions. A book in Latin. A cool scar. A ferret.`},
  {s:'josh', t:`Fact check: there is no scientific evidence ferrets raise your ranking.`},
  {s:'reshman', t:`Josh, you're in the free trial. The free trial doesn't get to talk.`},
  {s:'reshman', t:`Rule three. Find out what someone loves, and know one thing about it. Just one. People remember the one thing.`},
  {choice:[
    {t:`Pay the €2`, req:G=>G.money>=2, do:G=>{G.money-=2; addStat('charm',2);}, then:[{s:'reshman', e:'happy', t:`Smart investment. Here's your certificate.`},{t:`The certificate is a napkin. It says "certified cool" in biro. Weirdly, you feel more confident.`}]},
    {t:`"Rule three is actually good advice."`, do:G=>addStat('knowledge',1), then:[{s:'reshman', e:'surprised', t:`They're ALL good advice. ...But yes. Rule three is the real one. The ferret was a joke.`},{s:'josh', t:`I wrote that down. Not the ferret.`}]},
    {t:`Leave before he charges you for listening`, then:[{s:'reshman', t:`You heard three rules for free! That's theft, {P}! I'm docking you on the ranking!`},{t:`He can't actually do that. You think.`}]},
  ]},
]);
ev('shield',58,vis('mada'),[
  {bg:'hallway', cast:[['mada','neutral']]},
  {t:`There is a queue outside the 6 VWO lockers. An actual queue. Seven boys, one with flowers, one with a guitar.`},
  {t:`At the front of it is Mada, looking at her phone like the queue doesn't exist. She spots you.`},
  {s:'mada', e:'smirk', t:`{P}. Come here. Pretend we're talking about something important.`},
  {s:'mada', t:`Say something serious. Anything. Quick, the guitar one's tuning.`},
  {choice:[
    {t:`"The quarterly figures are deeply concerning, Mada."`, aff:{mada:2}, then:[{s:'mada', e:'happy', t:`(Through her teeth) Perfect. Keep going.`},{t:`You invent an entire fake company. By the time you've "fired the board," the queue has given up. The guitar boy plays one sad chord and leaves.`}]},
    {t:`[Charm 3] Turn to the queue: "Sorry guys. Appointment only today."`, off:req('charm',3), aff:{mada:3}, eff:{rep:2}, then:[{t:`They actually leave. In order. One of them apologises.`},{s:'mada', e:'surprised', t:`...How did you do that? I've been trying for two years.`}]},
    {t:`"Why don't you just tell them no?"`, aff:{mada:1}, then:[{s:'mada', e:'sad', t:`I did. Last year. Then the ranking said I was "cold." I dropped to second for a week. Adam was so happy he made a cake.`},{t:`You can't tell if she's joking about the cake. Knowing Adam, she isn't.`}]},
  ]},
]);
ev('library',75,vis('milo'),[
  {bg:'library', cast:[['milo','neutral']]},
  {t:`The library during mock exams. Absolute silence. Somewhere, a pen clicks and three people glare.`},
  {t:`Milo is two tables away. His earbuds are in. His phone is on the table. Then his earbuds disconnect.`},
  {fx:'shake', t:`DUN. DUN-DUN. DUN. Full-volume phonk fills the library. The cowbell echoes off every bookshelf.`},
  {music:'phonk'},
  {s:'milo', e:'surprised', t:`...`},
  {t:`Milo is frozen. For the first time since you've known him, he looks completely uncool. The librarian is approaching at speed.`},
  {choice:[
    {t:`[Guts 2] Stand up: "Sorry! That's mine!" and dance a little`, off:req('guts',2), aff:{milo:3}, eff:{rep:-1}, then:[{t:`You get kicked out of the library. It's worth it.`},{s:'milo', e:'smile', t:`(Outside) You danced. To my song. Badly. ...That's the nicest thing anyone's done for me this year.`}]},
    {t:`Lunge across two tables and turn it off`, aff:{milo:2}, then:[{t:`You slide across a table, knock over a stack of encyclopedias, and silence the phone. The library is somehow louder now.`},{s:'milo', e:'shy', t:`That was the least subtle rescue in history. Thank you.`}]},
    {t:`Start nodding along to the beat`, aff:{milo:1}, then:[{t:`Two other people start nodding too. For three seconds the library has a vibe. Then the librarian pulls the plug.`},{s:'milo', e:'smirk', t:`See? Phonk unites people.`}]},
  ]},
]);
ev('pizza',30,vis('gian'),[
  {bg:'cafeteria', cast:[['gian','surprised'],['adam','neutral']]},
  {t:`It's pizza day in the cafeteria. Gianmarcina has never seen pizza before.`},
  {s:'gian', t:`Wait. Wait wait wait. It's bread... with a sauce... and you can put anything on it? ANYTHING?`},
  {s:'adam', e:'surprised', t:`Gianmarcina. No. I know where this is going. You were Italian once. Kind of. You were made in Italy. Respect that.`},
  {t:`She is already pulling strawberries out of her bag. She brought strawberries. She always has strawberries.`},
  {choice:[
    {t:`Hand her more strawberries`, aff:{gian:2}, then:[{s:'gian', e:'happy', t:`STRAWBERRY PIZZA. I'm a genius. I'm the first person to ever think of this.`},{s:'adam', e:'sad', t:`(Quietly) I've lost her. Six years in my pencil case and I've lost her.`}]},
    {t:`"Try it normal first. Then decide."`, aff:{gian:1,adam:1}, then:[{s:'gian', t:`(Chewing) Okay. Okay. This is good. This is VERY good.`},{s:'gian', e:'grin', t:`(Adds one strawberry) Now it's perfect.`},{s:'adam', t:`...I'll allow one.`}]},
  ]},
]);
ev('wrong',40,vis('goon'),[
  {bg:'classroom', cast:[['goon','smirk'],['adam','surprised']]},
  {n:MVDM, t:`Adam. Question four. What is seven times eight?`},
  {s:'adam', t:`Fifty-six, obvious— (Goonseppe kicks his chair) —SEVEN? Seven times eight is... fifty-sev— why did I say that?`},
  {s:'goon', t:`(Whispering) Mistakes are healthy, Adam. Be free.`},
  {n:MVDM, t:`...Are you feeling all right, Adam? Do you need the nurse?`},
  {s:'adam', e:'angry', t:`I need a NEW ERASER.`},
  {s:'goon', e:'happy', t:`Rude. Accurate, but rude.`},
  {choice:[
    {t:`Back Goonseppe up: "A wrong answer once a day keeps the burnout away."`, aff:{goon:2}, then:[{s:'goon', e:'grin', t:`See? {P} gets it. Write that on your fridge, next to the ranking.`},{s:'adam', e:'sad', t:`...How do you know about the fridge?`},{s:'goon', t:`I lived in your pencil case for six years. I know everything.`}]},
    {t:`Back Adam up: "Let the man multiply."`, aff:{adam:2}, then:[{s:'adam', e:'happy', t:`THANK you. Fifty-six. FIFTY-SIX.`},{n:MVDM, t:`Yes, Adam. We heard.`}]},
  ]},
]);
ev('valprep',96,any,[
  {bg:'hallway', cast:[['josh','happy'],['reshman','smirk']]},
  {t:`One week until Valentine's Day. Josh has made a spreadsheet. It's projected onto the wall of the hallway. Nobody knows where he got a projector.`},
  {s:'josh', t:`Column A: who gives chocolates. Column B: who receives them. Column C: probability of tears. I'm doing it for science, and also because I couldn't stop once I started.`},
  {s:'reshman', t:`And I'm taking bets. Current odds: Mada gets forty-two chocolates. Natan drops his, two to one. Lars gives a "statistically neutral" gift, evens.`},
  {s:'josh', t:G=>G.dating.length>1?`Interesting. {P}, your row is... flashing red. That's a formula I wrote for "this is going to be a disaster." I've never seen it trigger before.`:G.dating.length?`{P}, your row says "probably fine." That's the nicest thing my spreadsheet has ever said.`:`{P}, your row is blank. That means anything could happen. Or nothing. Mostly anything.`},
  {if:G=>G.dating.length>1?'ev_valprep_warn':null},
  {choice:[
    {t:`Put €3 on Natan dropping his chocolates`, req:G=>G.money>=3, do:G=>{G.money-=3; G.flags.bet_natan=true;}, then:[{s:'reshman', e:'happy', t:`A person of culture.`}]},
    {t:`Ask Josh to take your row off the wall`, then:[{s:'josh', e:'sad', t:`...Fine. But I'm keeping the formula.`}]},
  ]},
]);
SCENES.ev_valprep_warn=[
  {music:'tense'},
  {s:'reshman', e:'sad', t:`(Quietly, not joking now) {P}. Real talk. I see two names in your row. People talk. On Valentine's Day, people talk to EACH OTHER.`},
  {s:'reshman', t:`You've got one week to sort it out. After that, it sorts itself out. Loudly.`},
  {goto:'cal_free'}
];
ev('sports',162,any,[
  {bg:'field', cast:[['fionn','angry'],['natan','grin'],['daniel','smile']]},
  {t:`Spring Sports Day. You've been tied to Fionn's leg for the three-legged race.`},
  {s:'fionn', t:`Left leg first. No, MY left. Your left is my right. Why are you looking at me like that? FOCUS.`},
  {t:`Meanwhile, the relay has turned into a grudge match: Natan against Daniel.`},
  {s:'daniel', t:`No throwing in a relay, Natan.`},
  {s:'natan', t:`I'm not going to throw anything! (He's holding a baseball. Nobody knows why.)`},
  {choice:[
    {t:`[Guts 3] "Fionn, we're going to win this. Trust me."`, off:req('guts',3), aff:{fionn:3}, eff:{rep:3}, then:[{t:`You find a rhythm. You win by a metre. Fionn lifts you off the ground before he remembers to be embarrassed.`},{s:'fionn', e:'blush', t:`That was... we were... put me down. I'm putting YOU down. Same thing.`}]},
    {t:`Just try to survive`, aff:{fionn:1}, then:[{fx:'shake', t:`You fall in the first five metres. You fall again at ten. You cross the line last, still tied together, laughing so hard you can't stand up.`},{s:'fionn', e:'happy', t:`We were SO bad. ...Again next year?`}]},
  ]},
  {cast:[['natan','surprised'],['daniel','surprised']]},
  {t:`In the relay, Natan passes the baton perfectly. He's so shocked by it that he trips. Daniel stops to help him up. They both lose. The crowd cheers anyway.`},
]);

// ===== TENSE =====
ev('list',24,vis('fionn'),[
  {bg:'hallway', cast:[['josh','surprised']]},
  {music:'tense'},
  {t:`Everyone in the hallway is looking at their phone. Then at you. Then at their phone.`},
  {s:'josh', t:`Someone made a fake account. "WidR's REAL Ranking." It's... it's mean, {P}. It's really mean.`},
  {t:`You scroll. Number 15 is you, with a nasty comment about your face. Number 14 is Fionn. Under his name it just says "pancake boy, eat less."`},
  {cast:[['fionn','neutral']]},
  {t:`Fionn walks past. He's seen it. You can tell, because he's smiling too wide and talking too loudly to nobody.`},
  {s:'fionn', t:`Ha! Fake ranking! Who cares. It's funny. It's actually funny. I'm laughing.`},
  {t:`He isn't laughing.`},
  {choice:[
    {t:`[Kindness 2] Follow him out to the bike sheds`, off:req('kindness',2), aff:{fionn:4}, then:[
      {bg:'rain', cast:[['fionn','sad']]},
      {s:'fionn', t:`Don't. Don't do the nice voice. I'll cry if you do the nice voice.`},
      {s:'P', t:`Then cry. I'll stand here so nobody sees.`},
      {t:`He does. For about a minute. Then he wipes his face on his sleeve and asks if you want pancakes, because he doesn't know what else to say. You say yes.`}]},
    {t:`[Guts 2] Find out who made the account`, off:req('guts',2), aff:{fionn:2}, eff:{rep:2}, then:[
      {cast:[['reshman','angry']]},
      {s:'reshman', t:`I already know who it is. Kid from 6 VWO. I was waiting for someone to care enough to go with me.`},
      {t:`You and Reshman find him at the lockers. You don't shout. You just say his full name, loudly, in front of everyone. The account is deleted by lunch.`},
      {cast:[['fionn','shy']]},
      {s:'fionn', t:`...You didn't have to do that. (Pause.) Thanks. Really.`}]},
    {t:`Pretend you didn't see it either`, aff:{fionn:-1}, then:[{t:`It's easier. It doesn't feel easier. Fionn doesn't come to the café that week.`}]},
  ]},
]);
ev('stray',72,G=>visible(G,'lars')&&!G.flags.lars_girl,[
  {bg:'hallway', cast:[['lars','neutral']]},
  {music:'tense'},
  {t:`Change of classes. The hallway is packed. Someone has left the side door open, and a small grey cat trots in, very pleased with itself.`},
  {t:G=>G.flags.g_cafe?`Lars sees it. You see Lars see it. You both know exactly what happens if it touches him.`:`Lars sees it and goes rigid. He presses himself against the lockers like the cat is a bomb.`},
  {s:'lars', e:'surprised', t:`{P}. Hypothetically. If a cat were to approach me in front of two hundred people, what would a genius do?`},
  {t:`The cat locks eyes with Lars. It starts walking toward him. Faster. People are pulling out phones for the cute cat.`},
  {choice:[
    {t:`[Guts 2] Dive and scoop up the cat`, off:req('guts',2), aff:{lars:3}, then:[{fx:'shake', t:`You land on your knees, cat in your arms, an inch from Lars's shoes. The hallway applauds the "cat rescue."`},{s:'lars', e:'shy', t:`(Barely audible) That was the most heroic thing I have ever seen. I'm going to need a minute.`},{do:G=>{G.flags.lars_known=true;}, t:`He doesn't say why. He doesn't need to.`}]},
    {t:`[Charm 2] "EVERYONE LOOK, IS THAT MADA?" and point the other way`, off:req('charm',2), aff:{lars:2}, then:[{t:`Two hundred heads turn. Lars slides into the boys' toilets. The cat follows him in. There is a muffled POOF.`},{t:`Three minutes later he comes out, slightly damp, completely normal, and says nothing about it for the rest of the day.`},{do:G=>{G.flags.lars_known=true;}, t:`Mada wasn't even there. Somehow she hears about it and is annoyed.`}]},
    {t:`Freeze`, aff:{lars:-1}, then:[
      {t:`The cat jumps into Lars's arms.`},
      {fx:'flash', expr:{lars:['surprised','girl']}, t:`POOF.`},
      {cast:[['lars','surprised','girl'],['josh','surprised']]},
      {s:'josh', t:`...I'm going to pretend my brain didn't process that. Did you know the brain filters out ninety percent of what it sees? I'm using all ninety.`},
      {t:`Luckily, most people were filming the cat, not Lars. By the time anyone looks up, Lars has run around the corner. Ten minutes later he's back, a boy again, and won't look at you.`},
      {cast:[['lars','sad','']]},
      {s:'lars', e:'sad', t:`...You just stood there.`},
      {do:G=>{G.flags.lars_known=true;}, t:`He's right. You did.`}]},
  ]},
  {cast:[]},
]);
ev('locked',80,G=>lockPick(G)!=null,[
  {bg:'gym', cast:[]},
  {t:`After PE, you go back to the storage room for a ball you forgot. Someone follows you in. The heavy door swings shut behind you both.`},
  {fx:'shake', t:`Click.`},
  {if:G=>'ev_locked_'+lockPick(G)}
]);
const lockPick=G=>{ const c=ROM.filter(k=>visible(G,k)&&!G.out.includes(k)); if(!c.length) return null; return c.reduce((a,b)=>G.aff[b]>G.aff[a]?b:a); };
const LOCK={
  natan:[`It's locked. From the outside. Okay. Okay okay okay. I'm calm. I'm a pitcher. Pitchers are calm.`,`You know the worst part? If Lars were here he'd have a plan in four seconds.`,`(He goes quiet) ...You're a good person to be stuck with, though. Honestly.`],
  lars:[`Locked. Fascinating. The probability of this happening by accident is low. I want it on record that I didn't plan this.`,`(Ten minutes later) I didn't plan this. I need you to really believe that.`,`(Quietly) ...Although if I had planned it, it would have been a very good plan.`],
  adam:[`I have a chemistry test in forty minutes. I can't miss it. Gianmarco, Giuseppe, think.`,`(He starts doing the periodic table out loud to calm down.)`,`...Thanks for not telling me to calm down. Everyone always tells me to calm down.`],
  fionn:[`Great. GREAT. Stuck in a cupboard. With you. Not that that's bad. I mean it's bad. The cupboard part.`,`(He's sitting on a pile of mats with his arms crossed.) If you tell anyone I got scared, I'll deny it.`,`...I wasn't scared. I was... it was nice. The talking. Shut up.`],
  milo:[`(He takes one earbud out.) Locked in a cupboard. This is very unflattering lighting.`,`(He shares the other earbud. It's the soft piano track, not phonk.)`,`Don't tell anyone I played you this one. It's... for emergencies.`],
  mada:[`I'm going to be late for student council. I'm never late. Everyone will think something happened.`,`(Then, quieter) ...It's actually nice. Nobody can find me in here.`,`Five more minutes. Then we yell for help. Five.`],
  gian:[`Ooh! Is this a game? Is this what humans call "an adventure"?`,`(She offers you a strawberry. She has an emergency strawberry.)`,`I'm not scared, because you're here. That's how it works, right?`],
  goon:[`Relax. I've been stuck in a pencil case for six years. This is a mansion.`,`(She picks the lock with a hairclip in about forty seconds.)`,`...I could have done that immediately. I wanted to see what you'd say first. You passed.`],
};
Object.keys(LOCK).forEach(k=>{ SCENES['ev_locked_'+k]=[
  {music:'tense', cast:[[k,'surprised']]},
  {s:k, t:LOCK[k][0]},
  {choice:[
    {t:`[Guts 3] Climb up to the tiny window and squeeze through`, off:req('guts',3), aff:{[k]:2}, eff:{rep:1}, then:[{t:`You get stuck halfway for a humiliating minute. Then you're out, round the front, and opening the door like a hero with gym-mat dust in your hair.`},{s:k, e:'happy', t:k==='fionn'?`...My hero. That's sarcastic. Mostly.`:`You actually did it. That was amazing.`}]},
    {t:`Sit down and wait it out together`, aff:{[k]:3}, then:[{s:k, e:'smile', t:LOCK[k][1]},{s:k, e:'shy', t:LOCK[k][2]},{t:`Forty minutes later, the caretaker opens the door and looks at you both for a long time. "I'm not asking," he says.`}]},
    {t:`Bang on the door and yell`, aff:{[k]:1}, then:[{t:`Reshman lets you out within a minute. He looks between you two and very slowly takes out his phone.`},{s:'reshman', t:`Don't worry. I'm not posting it. I'm just... making a note. For the ranking.`}]},
  ]},
  {goto:'cal_free'}
]; });
ev('rumour',110,vis('natan'),[
  {bg:'cafeteria', cast:[['natan','sad']]},
  {music:'tense'},
  {t:`Natan sits at a different table at lunch. He doesn't wave. When you sit down, he gets up.`},
  {s:'natan', t:`Daniel told me what you said. About me only being on the team because nobody else wanted third base.`},
  {s:'P', t:`I never said that.`},
  {s:'natan', t:`Someone heard you. In the hallway. That's what they said.`},
  {t:`You've never said that in your life. But it's spreading, and Natan looks like he hasn't slept.`},
  {choice:[
    {t:`[Charm 3] Stay calm, look him in the eye, and explain`, off:req('charm',3), aff:{natan:3}, then:[{t:`You don't get defensive. You just tell him the truth, slowly, until he believes it.`},{s:'natan', e:'sad', t:`...Yeah. Yeah, that doesn't sound like you at all. I'm sorry. I'm just stressed about the spring tournament.`},{t:`It turns out a 6 VWO student started it to get Natan off his game before the spring tournament. Daniel apologises to both of you. Natan forgives him immediately, because he's Natan.`}]},
    {t:`[Guts 3] March over to Daniel and find out who started it`, off:req('guts',3), aff:{natan:2}, eff:{rep:2}, then:[{cast:[['daniel','surprised'],['natan','neutral']]},{s:'daniel', t:`I didn't hear it myself! Someone from 6 VWO told me. ...Oh. Oh no. Their team plays ours next week.`},{s:'natan', e:'angry', t:`They wanted us to fight. ...I'm so stupid. Sorry, {P}.`}]},
    {t:`"If you believe that, I don't know what to tell you."`, aff:{natan:-2}, then:[{s:'natan', e:'sad', t:`...Right. Okay.`},{t:`It takes him two weeks to talk to you again. Even then, it's not quite the same.`}]},
  ]},
]);
ev('exam',204,vis('adam'),[
  {bg:'classroom', cast:[['adam','sad']]},
  {music:'tense'},
  {t:`Final exams. Chemistry in ten minutes. Adam is at his desk, very pale, staring at nothing. His hands are shaking so much that Giuseppe keeps rolling off the table.`},
  {s:'adam', t:`I can't remember anything. Anything. Avogadro's number. My own address. Gone.`},
  {s:'adam', t:`If I'm not top three my parents are going to put my result on the fridge anyway, under Mada's, so everyone who comes over can compare.`},
  {choice:[
    {t:`[Knowledge 3] Quiz him on three easy questions, fast, to get him going`, off:req('knowledge',3), aff:{adam:3}, then:[{t:`He gets the first one wrong. The second one right. The third one before you finish asking. Colour comes back into his face.`},{s:'adam', e:'smile', t:`Six point oh two times ten to the twenty-three. I'm back. I'm BACK.`}]},
    {t:`[Kindness 3] "Breathe with me. In for four. Out for four."`, off:req('kindness',3), aff:{adam:3}, then:[{t:`It takes almost all ten minutes. Then his hands stop shaking. He picks up Giuseppe and puts him in his pocket for luck.`},{s:'adam', t:`...Thank you. Nobody's ever done that for me. Not even Mada.`}]},
    {t:`"You'll be fine. You always are."`, aff:{adam:1}, then:[{s:'adam', e:'sad', t:`That's what everyone says. That's kind of the problem.`},{t:`He passes. Fourth again. He doesn't talk much for the rest of the day.`}]},
  ]},
]);

// ----- play one unseen event on some school days -----
function pickEvent(G){
  const d=G.calDay, wk=dayDate(d).getDay(); if(wk===0||wk===6) return null;
  G.evSeen=G.evSeen||[];
  const e=DAYEV.slice().sort((a,b)=>a.from-b.from).find(x=>!G.evSeen.includes(x.id) && d>=x.from && d<=x.to && x.cond(G));
  if(!e || Math.random()>.45) return null;
  G.evSeen.push(e.id); return 'ev_'+e.id;
}
SCENES.cal_day2.unshift({if:G=>pickEvent(G)});

// ===== extra beats inside the big chapters =====
(()=>{
  // Christmas party: Secret Santa goes wrong
  const c5=SCENES.ch5, i5=c5.findIndex(s=>s.rank);
  c5.splice(i5,0,
    {cast:[['josh','happy'],['adam','smile'],['natan','grin']]},
    {t:`Secret Santa time. Josh pulled four names and panicked, so he bought everyone the same gift: a pocket train timetable.`},
    {s:'josh', t:`It's useful! It's laminated! Did you know the 7:42 to Utrecht is the most reliable train in Rankingland? Now you all know. That's the gift. The knowledge.`},
    {s:'adam', e:'shy', t:`I got you an eraser, {P}. I named it already. Sorry. It's called Gerard. You can change it. Please don't change it.`},
    {cast:[['natan','surprised'],['fionn','angry']]},
    {t:`Natan tosses his present across the room to Lars. It's a perfect throw. It's a perfect throw at the lamp.`},
    {fx:'shake', t:`CRASH.`},
    {s:'fionn', t:`THAT WAS MY MUM'S LAMP. FROM ITALY. SHE CARRIED IT ON A PLANE. ON HER LAP.`},
    {s:'natan', e:'sad', t:`I'm so sorry. I was aiming for Lars. I mean the present was aiming for Lars. For Christmas reasons.`},
    {choice:[
      {t:`Help Fionn glue the lamp back together`, aff:{fionn:2}, then:[{t:`It takes an hour. The lamp now leans slightly to the left. Fionn tells his mum it was "always like that." She believes him. She doesn't believe him.`},{s:'fionn', e:'shy', t:`You stayed and glued a lamp with me instead of partying. You're... weird. Thank you, weirdo.`}]},
      {t:`Cover for Natan: "The lamp jumped."`, aff:{natan:2}, then:[{s:'fionn', t:`The lamp. Jumped.`},{s:'natan', e:'happy', t:`It did! I saw it. It was depressed. It's the holidays.`},{t:`Fionn chases you both around the sofa twice, then gives up and offers everyone more pancakes.`}]},
    ]},
    {cast:[['reshman','smirk'],['daniel','smile']]}
  );
  // Valentine's Day: Natan's chocolates (skipped if you're dating Natan or Lars, it would be a different story)
  const VD=G=>G.dating.length>=2?'val_caught':G.dating.length===1?'val_one':'val_none';
  const c7=SCENES.ch7, i7=c7.findIndex(s=>s.if && /dating\.length>=2/.test(s.if.toString()));
  c7.splice(i7,0,{if:G=>G.dating.includes('natan')||G.dating.includes('lars')?null:G.flags.bet_natan?'vd_bet':'vd_choc'});
  const intro=[{cast:[['natan','shy'],['reshman','smirk']]},
    {t:`Natan walks into school holding a box of chocolates very carefully with both hands. He sees Lars at the end of the hallway.`}];
  SCENES.vd_choc=[...intro,
    {fx:'shake', t:`He trips over absolutely nothing. The chocolates fly. Daniel, walking past, catches the box without looking.`},
    {s:'reshman', t:`And the chocolates go to... Daniel. Of course. Unbelievable.`},
    {cast:[]},{if:VD}];
  SCENES.vd_bet=[...intro,
    {fx:'shake', t:`He trips over absolutely nothing. The chocolates fly everywhere.`},
    {s:'reshman', e:'sad', t:`(Handing you €9) I hate that you were right. I hate it. Take your money.`},
    {do:G=>{G.money+=9; G.flags.bet_natan=false;}, t:`Natan gathers the chocolates off the floor, blows on each one, and gives them to Lars anyway. Lars eats one immediately. "Five-second rule," he says. "Statistically fine."`},
    {cast:[]},{if:VD}];
  // The ball: Meneer van der Meijs on the dance floor
  const c8=SCENES.ch8, i8=c8.findIndex(s=>s.do && /final=true/.test(s.do.toString()));
  c8.splice(i8,0,
    {t:`The DJ's laptop crashes. Reshman takes over "temporarily." He only has one playlist. It's called "RANKING ANTHEMS."`},
    {t:`${MVDM} walks onto the dance floor. The terrace goes silent. He does the robot. He does it well. Too well. Nobody will ever recover from this.`},
    {s:'josh', e:'surprised', t:`I'm going to remember this when I'm eighty.`}
  );
})();
