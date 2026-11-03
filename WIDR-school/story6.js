// ---------- STORY PART 6: playable tournament & ice skating ----------
SCENES.act_tour=[
  {bg:'field', cast:[['natan','grin'],['daniel','smile'],['fionn','angry']]},
  {t:`You join the winter sports tournament with Natan and Daniel. Fionn shows up with a giant sign that says "GO {P}" and then claims it says "GO TEAM."`},
  {s:'fionn', t:`It's a team sign! Your name is just... part of the team!`},
  {s:'natan', e:'happy', t:`Final inning, {P}! We need five runs. You're up to bat!`},
  {mini:'batting'},
  {if:G=>G.mini.win?'tour_win':'tour_lose'}
];
SCENES.tour_win=[
  {fx:'flash', cast:[['natan','happy'],['daniel','grin'],['fionn','happy']], t:`WidR wins its first winter trophy in years! The whole school saw it.`, eff:{rep:12, aff:{natan:2, fionn:1}}},
  {s:'daniel', t:`Okay, that was actually amazing. Football next?`},
  {s:'fionn', e:'blush', t:`I was cheering for the TEAM. ...Mostly for you.`},
  {goto:actDone}
];
SCENES.tour_lose=[
  {cast:[['natan','sad'],['daniel','smile']], t:`WidR loses by a hair. The crowd still cheers for you.`, eff:{rep:4, aff:{natan:1}}},
  {s:'natan', e:'smile', t:`Hey. You stepped up when it counted. Next year, we take it.`},
  {goto:actDone}
];
(()=>{
  const ice=SCENES.ice, i=ice.findIndex(s=>s.s==='josh');
  ice.splice(i+1,0,
    {t:`Your turn on the ice. Fionn is somewhere out there, unable to stop.`},
    {mini:'skate'},
    {do:G=>{ applyEff({rep:Math.round(G.mini.pct*6)}); }},
    {cast:[['josh','happy']], s:'josh', t:G=>G.mini.pct>.6?`That was beautiful. You skated like a well-timed train.`:`You fell over a lot. But stylishly. Mostly.`});
})();
SCENES.hang_adam_mad=[
  {expr:{adam:'angry'}, s:'adam', t:`I'm busy. With literally anything else.`},
  {goto:'map_after'}
];
