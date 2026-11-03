// ---------- ENGINE ----------
// Snapshot of this page's own HTML, taken before anything changes it, so the game can save a copy of itself.
const SOURCE='<!DOCTYPE html>\n'+document.documentElement.outerHTML;
const $=id=>document.getElementById(id);
const ROM=['natan','lars','adam','fionn','milo','mada','gian','goon'];
// Who will date you, by the gender you play. Everyone else says no kindly, even at 5 hearts.
const ACCEPT={m:{natan:1,lars:1,milo:1,mada:1,gian:1,goon:1}, f:{natan:1,lars:1,adam:1,fionn:1,milo:1,gian:1,goon:1}};
const accepts=(G,k)=>!!ACCEPT[G.gender][k];
const visible=(G,k)=>(k!=='gian'||G.flags.gian) && (k!=='goon'||G.flags.goon);
// Everyone else on the WidR Ranking (fixed scores). The player moves; they don't.
const NPC_RANK=[
  ['Mada',94],['Milo',90],['Reshman',87],['Natan',85],['Sanne',82],['Lars',79],['Daniel',77],
  ['Adam',75],['Gianmarcina',73,'gian'],['Goonseppe',70,'goon'],['Femke',71],['Fionn',68],['Josh',60],['Bram',52],['Jeroen',45]];
const CANON=[['natan','Home Run'],['lars',"The Cat's Out of the Bag"],['adam','Perfect Score'],['fionn','Gym Buddies'],['milo','Bass Drop'],['mada','Top of the List'],['gian','Strawberry Season'],['goon','Green Apple Era']];
const SAVE_KEY='widr_save3', END_KEY='widr_endings3', SET_KEY='widr_settings';
const SET=Object.assign({speed:'normal'},JSON.parse(localStorage.getItem(SET_KEY)||'{}'));
const SPEEDS={slow:[1,32],normal:[2,18],fast:[4,12],instant:[9999,1]};
let G, queue=[], typing=null, waiting=null, curBg='gate', pending=null;

// ----- genetics & charisma -----
const tri=()=>(Math.random()+Math.random())/2;
// Normal curve: boys average 5'9", about 1 in 7 reach 6'0", 6'5" is very rare.
function normH(mean,sd,lo,hi){ let u=0,v=0; while(!u)u=Math.random(); while(!v)v=Math.random(); return Math.max(lo,Math.min(hi,Math.round(mean+sd*Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)))); }
function rollGenes(gender){
  return {h: gender==='m' ? normH(69,2.8,60,77) : normH(65,2.6,60,72), looks: 2+Math.round(tri()*7), glow:0};
}
const fmtH=i=>`${Math.floor(i/12)}'${i%12}"`;
// Boys: height carries the most weight, then face. Girls: face matters, height doesn't. Glow-ups help both.
function charisma(g){
  const glow=Math.min(30,g.glow||0);
  if(g.gender==='m') return Math.round(45*(g.h-60)/17 + 3.5*g.looks + glow*0.67);
  return Math.round(7*g.looks + glow);
}
const cha=()=>charisma(Object.assign({gender:G.gender},G.gen));
const score=()=>(G.frozen && G.fscore!=null) ? G.fscore : G.rep+Math.round(cha()*0.25);
const hearts=k=>Math.min(5,Math.round(Math.max(0,G.aff[k])/2.4));

function newGame(name,gender,gen){
  G={P:name||(gender==='m'?'Robin':'Robin'), gender, gen, money:30, aff:{natan:0,lars:0,adam:0,fionn:0,milo:0,mada:0,gian:0,goon:0},
     flags:{}, ch:'', rep:28, lastRank:15, dating:[], out:[], friend:[], frozen:false, ret:null, tried:[], buys:{}};
  G.lastRank=myRank();
  $('cast').innerHTML=''; hideMenu(); jump('start');
}
function jump(id){ if(!SCENES[id]){ reportStuck('missing scene "'+id+'"'); return; } curScene=id; save(id); queue=SCENES[id].slice(); step(); }
let curScene='';
// If a scene runs out of steps without moving on, finish a pending ending or say where it got stuck.
function reportStuck(why){ const d=document.getElementById('widr-err')||document.body.appendChild(Object.assign(document.createElement('pre'),{id:'widr-err'})); d.style.cssText='position:fixed;left:8px;right:8px;top:8px;z-index:99;background:#fff;border:3px solid #e8364f;border-radius:10px;padding:10px;font:12px Menlo,monospace;white-space:pre-wrap;color:#2b2340'; d.textContent+='Game stuck: '+why+'\n'; }
const fmt=t=>t.replace(/\{P\}/g,G.P);

// ----- save / continue -----
function save(id){
  if(!G) return;
  const cast=[...$('cast').children].map(el=>[el.dataset.id,el.dataset.expr||'neutral',el.dataset.form||'']);
  try{localStorage.setItem(SAVE_KEY,JSON.stringify({id,G,bg:curBg,cast,when:Date.now()}));}catch(e){}
}
const getSave=()=>{try{return JSON.parse(localStorage.getItem(SAVE_KEY));}catch(e){return null;}};
function continueGame(){
  const s=getSave(); if(!s) return;
  G=s.G; hideMenu(); setBg(s.bg); curBg=s.bg; $('chapter').textContent=G.ch||'';
  $('cast').innerHTML=''; setCast(s.cast); jump(s.id);
}

// ----- ranking -----
function rankList(){
  return NPC_RANK.filter(r=>!r[2]||G.flags[r[2]]).map(([n,s])=>({n,s})).concat([{n:G.P,s:score(),me:true}]).sort((a,b)=>b.s-a.s || (a.me?1:-1));
}
function myRank(){ return rankList().findIndex(r=>r.me)+1; }
function tier(i){ return i<=3?['Top tier','t1']:i<=6?['Very popular','t2']:i<=10?['Known','t3']:['Unknown','t4']; }
// Lower = easier for people to say yes. Being high on the ranking makes you "desirable".
function rankMod(){ const r=myRank(); return r<=3?-3:r<=6?-2:r<=10?0:2; }
let rbWait=null;
function showRank(title,note){
  const rb=$('rankboard'), list=rankList(), r=myRank(), d=G.lastRank-r;
  const delta = d>0?`<span style="color:#2e9e5b">▲ Up ${d} place${d>1?'s':''}</span>` : d<0?`<span style="color:#e8364f">▼ Down ${-d} place${d<-1?'s':''}</span>`:'No change';
  rb.innerHTML=`<div class="sheet"><h3>${title||'The WidR Ranking'}</h3>
    <div class="why">Who the school thinks is the "best" catch. The higher you are, the more people want to date you. Your charisma (${cha()}) counts too. ${G.frozen?'<b>Final rankings are locked. No more climbing.</b>':'You can still climb.'}</div>
    <ol>${list.map((x,i)=>{const [tn,tc]=tier(i+1);return `<li class="${x.me?'me':''}"><span class="n">#${i+1}</span><span>${x.me?x.n+' (you)':x.n}</span><span class="tier ${tc}">${tn}</span><span>${x.s}</span></li>`;}).join('')}</ol>
    ${note!==false?`<div class="delta">You: #${r} of ${list.length} · ${delta}</div>`:''}
    <div class="tap">Click to close</div></div>`;
  rb.style.display='flex'; if(note!==false) G.lastRank=r;
}
$('rankboard').onclick=e=>{ e.stopPropagation(); $('rankboard').style.display='none'; if(rbWait){const f=rbWait;rbWait=null;f();} };

// ----- cast -----
function setCast(list){
  const pos={1:[50],2:[30,70],3:[19,50,81]}[list.length]||[];
  const keep=new Set(list.map(x=>x[0]));
  [...$('cast').children].forEach(el=>{if(!keep.has(el.dataset.id)) el.remove();});
  list.forEach((x,i)=>{
    const [id,expr='neutral',form]=x;
    let el=$('cast').querySelector(`[data-id="${id}"]`);
    if(!el){el=document.createElement('div');el.className='char enter';el.dataset.id=id;el.dataset.form='';$('cast').appendChild(el);}
    el.style.left=pos[i]+'%';
    if(x.length>2) el.dataset.form=form||'';
    if(id==='lars' && G.flags.lars_girl && x.length<3) el.dataset.form='girl';
    el.dataset.expr=expr; el.innerHTML=portrait(id,expr,el.dataset.form);
  });
}
function setExpr(id,expr,form){
  const el=$('cast').querySelector(`[data-id="${id}"]`); if(!el) return;
  if(form!==undefined) el.dataset.form=form;
  if(expr) el.dataset.expr=expr;
  el.innerHTML=portrait(id,el.dataset.expr,el.dataset.form);
}
function applyEff(o){
  if(o.aff) for(const k in o.aff){ if(k==='adam' && G.flags.adam_mad && o.aff[k]>0) continue; G.aff[k]+=o.aff[k]; }
  if(o.flag) [].concat(o.flag).forEach(f=>G.flags[f]=true);
  // Ranking gains shrink with low charisma: 40% at 0, 100% at 100. Penalties always hit in full.
  if(o.rep && (!G.frozen || o.force)){
    const d = o.rep>0 ? Math.max(1,Math.round(o.rep*(0.4+0.6*cha()/100))) : o.rep;
    G.rep=Math.max(0,Math.min(99,G.rep+d));
  }
  if(o.money) G.money=Math.max(0,G.money+o.money);
}
function fx(kind){
  const f=$('fx'), stg=$('stage');
  if(kind==='flash'){f.className='';void f.offsetWidth;f.className='flash';SFX.poof();}
  if(kind==='shake'){stg.classList.remove('shake');void stg.offsetWidth;stg.classList.add('shake');SFX.thud();}
  if(kind==='siren'){f.className='';void f.offsetWidth;f.className='siren';SFX.siren();}
  if(kind==='sparkle'){f.className='sparkle';f.innerHTML='';SFX.sparkle();
    for(let i=0;i<14;i++){const s=document.createElement('span');s.textContent=['✦','♥','✧','❀'][i%4];
      s.style.left=(10+Math.random()*80)+'%';s.style.top=(10+Math.random()*60)+'%';s.style.color=['#ff6f9f','#ffc94d','#7fd6c2'][i%3];s.style.animationDelay=(i*.06)+'s';f.appendChild(s);}
    setTimeout(()=>{f.innerHTML='';},2000);}
}
function step(){
  while(queue.length){
    const s=queue.shift();
    if(s.music){ G.musLock=curScene; playMood(s.music); }
    if(s.bg){ if(s.bg!==curBg) setBg(s.bg); curBg=s.bg; }
    if(s.ch!==undefined){ G.ch=s.ch; $('chapter').textContent=s.ch; if(/^Chapter/.test(s.ch)) chapterCard(s.ch); }
    if(s.cast) setCast(typeof s.cast==='function'?s.cast(G):s.cast);
    if((s.bg||s.cast) && G.musLock!==curScene) playMood(moodForBg(curBg,[...$('cast').children].map(el=>[el.dataset.id])));
    if(s.expr) for(const k in s.expr){ const v=[].concat(s.expr[k]); setExpr(k,v[0],v[1]); }
    if(s.eff) applyEff(s.eff);
    if(s.fx) fx(s.fx);
    if(s.do) s.do(G);
    if(s.cg){ return showCG(s.cg); }
    if(s.daycard){ const sk=G.calSkip; G.calSkip=null; return showDayCard(G,sk); }
    if(s.phone){ const m=pickText(G); if(m){ return showPhone(m); } continue; }
    if(s.rank){ rbWait=()=>step(); showRank(s.rank===true?null:s.rank); return; }
    if(s.mini){ return startMini(s.mini); }
    if(s.map){ return openMap(); }
    if(s.goto){ return jump(typeof s.goto==='function'?s.goto(G):s.goto); }
    if(s.if){ const r=s.if(G); if(r) return jump(r); continue; }
    if(s.end){
      // Hard rule: endings only exist at the End-of-Year Ball.
      if(!G.final){ console.warn('ending blocked before the ball',s.end); continue; }
      // Whoever you end up with, Adam has his own moment unless he's the one with you.
      if(s.who!=='adam' && !G.flags.adam_epi){ G.flags.adam_epi=true; G.endWho=s.who; G.pendingEnd=s; queue=SCENES.adam_epi.slice(); continue; }
      return ending(s);
    }
    if(s.choice){ return showChoice(typeof s.choice==='function'?s.choice(G):s.choice); }
    if(s.t!==undefined){ return say(s); }
  }
  // Ran out of steps: finish an ending that was waiting on Adam's scene, otherwise report where it got stuck.
  if(G && G.pendingEnd){ const e=G.pendingEnd; G.pendingEnd=null; return ending(e); }
  if(G) reportStuck('scene "'+curScene+'" has no next step');
}
function say(s){
  let name='';
  const txtRaw=typeof s.t==='function'?s.t(G):s.t;
  if(s.s==='P') name=G.P;
  else if(s.s && CHARS[s.s]) name=CHARS[s.s].name;
  else if(s.n) name=s.n;
  if(s.s && CHARS[s.s] && s.e) setExpr(s.s,s.e);
  [...$('cast').children].forEach(el=>{
    el.classList.toggle('dim', !!(s.s && s.s!=='P' && el.dataset.id!==s.s && CHARS[s.s]));
    el.classList.remove('talk','enter');
    if(el.dataset.id===s.s){void el.offsetWidth;el.classList.add('talk');}
  });
  $('name').textContent=name;
  $('name').style.background= s.s==='P' ? '#ff6f9f' : (CHARS[s.s]?CHARS[s.s].color:'#7a6e8f');
  const txt=fmt(txtRaw), el=$('text');
  el.className = (!s.s && !s.n) ? 'narr' : '';
  el.textContent=''; $('next').style.visibility='hidden';
  const [per,ms]=SPEEDS[SET.speed]||SPEEDS.normal;
  let i=0; clearInterval(typing);
  const vp=s.s==='P'?VOICE_PITCH.P:s.s&&VOICE_PITCH[s.s]?VOICE_PITCH[s.s]:s.n?360:0;
  typing=setInterval(()=>{ i+=per; el.textContent=txt.slice(0,i); if(vp && /\w/.test(txt[i-1]||'')) SFX.blip(vp); if(i>=txt.length){clearInterval(typing);typing=null;$('next').style.visibility='visible';}},ms);
  waiting=()=>{ if(typing){clearInterval(typing);typing=null;el.textContent=txt;$('next').style.visibility='visible';return;} waiting=null; step(); };
}
function showChoice(opts){
  const box=$('choices'); box.innerHTML=''; waiting=null; $('next').style.visibility='hidden';
  opts.filter(o=>!o.req||o.req(G)).forEach(o=>{
    const b=document.createElement('button'); b.textContent=fmt(typeof o.t==='function'?o.t(G):o.t);
    if(o.off && o.off(G)){ b.disabled=true; b.style.opacity=.45; b.style.pointerEvents='none'; }
    b.onclick=e=>{ e.stopPropagation(); box.innerHTML=""; SFX.click(); applyEff(o); if(o.eff) applyEff(o.eff); if(o.do) o.do(G);
      const extra=(o.then||[]).slice(); if(o.goto) extra.push({goto:o.goto});
      queue=extra.concat(queue); step(); };
    box.appendChild(b);
  });
}
const overlayOpen=()=>['menu','panel','pause','rankboard'].some(id=>getComputedStyle($(id)).display!=='none') || $('journal').classList.contains('open') || !!document.querySelector('#stage > .ovl');
$('box').onclick=()=>{ if(waiting && !overlayOpen()) waiting(); };
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){ if($('panel').style.display==='block') return closePanel(); if(G && $('menu').style.display!=='grid') return togglePause(); }
  if((e.key===' '||e.key==='Enter') && waiting && !overlayOpen() && document.activeElement.tagName!=='INPUT'){e.preventDefault();waiting();}
});

function ending(s){
  localStorage.removeItem(SAVE_KEY);
  const found=JSON.parse(localStorage.getItem(END_KEY)||'[]'); if(!found.includes(s.end)){found.push(s.end);localStorage.setItem(END_KEY,JSON.stringify(found));}
  const text=typeof s.text==='function'?s.text(G):s.text;
  const c=document.createElement('div'); c.className='card';
  c.innerHTML=`<div class="tag">${s.kind||'ENDING'}</div><h1>${s.end}</h1><h2>${fmt(s.sub||'')}</h2><p>${fmt(text||'')}</p>
    ${G.epiNote?'<p class="sub">'+G.epiNote+'</p>':''}
    <p class="sub">Final WidR Ranking: #${myRank()} · Charisma ${cha()} · Storylines completed: ${found.filter(f=>CANON.some(c=>c[1]===f)).length}/8</p>
    <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center"><button class="big" id="again">Back to menu</button></div>`;
  $('stage').appendChild(c);
  c.querySelector('#again').onclick=()=>{c.remove();title();};
}
// ----- notebook: full-screen menu that slides in, three tabs -----
let nbTab='conf';
const nbOpen=()=>$('journal').classList.contains('open');
function closeNotebook(){ const j=$('journal'); if(!nbOpen()) return; j.classList.remove('open'); j.classList.add('closing'); SFX.whoosh(); setTimeout(()=>{ j.classList.remove('closing'); j.style.display='none'; },380); }
function journal(){
  const j=$('journal');
  if(nbOpen()) return closeNotebook();
  j.style.display='block'; renderNotebook(); void j.offsetWidth; j.classList.add('open'); SFX.whoosh();
}
function renderNotebook(){
  const j=$('journal'), d=dayDate(G.calDay||0), ev=nextEvent(G.calDay||0), c=cha();
  const tabs=[['conf','Confidants'],['stats','Stats'],['me','You']];
  let body='';
  if(nbTab==='conf') body=`<div class="nbconf">${ROM.filter(k=>visible(G,k)).map(k=>{
      const r=crOf(k), mx=CMAX[k], nxt=r<mx?needPts(r+1):null, R=nxt&&RANKS[k][r+1], pct=r>=mx?100:Math.min(100,Math.round(Math.max(0,G.aff[k]-needPts(r))/(nxt-needPts(r))*100));
      const tag=G.dating.includes(k)?'<em class="t love">Dating 💘</em>':G.out.includes(k)?'<em class="t">Moved on</em>':!accepts(G,k)?'<em class="t">Friend</em>':'';
      const hint=r>=mx?'Max rank':G.aff[k]>=nxt?(R.req&&stat(R.req[0])<R.req[1]?`🔒 Needs ${STATS[R.req[0]].n} ${R.req[1]}`:'★ Ready! Go talk to them'):'Spend time together';
      return `<div class="nbc" style="--c:${CHARS[k].color}"><div class="nbpic">${portrait(k,'smile',k==='lars'&&G.flags.lars_girl?'girl':'')}</div>
        <div class="nbi"><b>${CHARS[k].name}</b>${tag}<div class="nbstars">${'★'.repeat(r)}<span>${'★'.repeat(mx-r)}</span></div>
        <div class="nbbar"><i style="width:${pct}%"></i></div><small>Rank ${r}/${mx} · ${hint}</small></div></div>`; }).join('')}</div>`;
  if(nbTab==='stats') body=`<div class="nbstats">${Object.keys(STATS).map((k,i)=>{ const l=stat(k), p=stPts(k), lo=STAT_AT[l-1], hi=STAT_AT[l], pct=hi==null?100:Math.round((p-lo)/(hi-lo)*100);
      return `<div class="nbs" style="--d:${i*.07}s"><div class="nbsn">${STATS[k].n}</div><div class="nbsl">Lv ${l} · ${STATS[k].lv[l-1]}</div>
        <div class="nbseg">${[1,2,3,4,5].map(n=>`<i class="${n<l?'on':n===l?'cur':''}">${n===l?`<u style="width:${pct}%"></u>`:''}</i>`).join('')}</div>
        <small>${hi==null?'Maxed out!':`${hi-p} more to ${STATS[k].lv[l]}`}</small></div>`; }).join('')}
      <p class="nbtip">Library = Knowledge · Park, gym, spicy pancakes = Guts · Glow-ups, mirror = Charm · Cat shelter, café, babysitting = Kindness</p></div>`;
  if(nbTab==='me') body=`<div class="nbme">
      <div class="nbbig"><small>WidR Ranking</small><b>#${myRank()}</b></div>
      <div class="nbbig"><small>Charisma</small><b>${c}</b><div class="nbbar"><i style="width:${c}%"></i></div></div>
      <div class="nbbig"><small>Money</small><b>€${G.money}</b></div>
      <div class="nbline"><span>Height ${fmtH(G.gen.h)}${G.gender==='f'?' (doesn\'t matter)':''}</span><span>Looks ${G.gen.looks}/10</span><span>Glow-up ${Math.min(30,G.gen.glow)}/30</span></div>
      ${G.dating.length>1?`<div class="nbwarn">You're dating ${G.dating.length} people. Valentine's Day is coming…</div>`:''}</div>`;
  j.innerHTML=`<div class="nbslash"></div><div class="nbwrap">
    <div class="nbhead"><div class="nbtitle"><small>${G.P}'s</small>Notebook</div>
      <div class="nbdate"><b>${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}</b>${ev?`<span>★ ${ev.name} in ${ev.day-(G.calDay||0)} days</span>`:''}</div>
      <button class="nbx" data-nb="close">✕</button></div>
    <div class="nbtabs">${tabs.map(([id,n])=>`<button data-tab="${id}" class="${nbTab===id?'on':''}">${n}</button>`).join('')}<span class="nbkeys">← → switch tabs · Esc closes</span></div>
    <div class="nbbody" key="${nbTab}">${body}</div></div>`;
}
$('journal').onclick=e=>{ e.stopPropagation(); const t=e.target.closest('[data-tab]'); if(t){ nbTab=t.dataset.tab; SFX.click(); return renderNotebook(); }
  if(e.target.closest('[data-nb="close"]') || e.target===$('journal') || e.target.classList.contains('nbslash')) closeNotebook(); };
document.addEventListener('keydown',e=>{ if(!nbOpen()){ if((e.key==='n'||e.key==='N') && G && !overlayOpen() && document.activeElement.tagName!=='INPUT'){ e.preventDefault(); journal(); } return; } e.stopImmediatePropagation(); const order=['conf','stats','me'];
  if(e.key==='ArrowRight'||e.key==='ArrowLeft'){ e.preventDefault(); e.stopPropagation(); nbTab=order[(order.indexOf(nbTab)+(e.key==='ArrowRight'?1:2))%3]; SFX.click(); renderNotebook(); }
  else if(e.key==='Escape'||e.key==='n'||e.key==='N'){ e.preventDefault(); e.stopPropagation(); closeNotebook(); }
  else if(e.key===' '||e.key==='Enter'){ e.preventDefault(); e.stopPropagation(); } },true);
$('jbtn').onclick=e=>{e.stopPropagation(); if(G) journal();};
$('rbtn').onclick=e=>{e.stopPropagation(); if(G) showRank(null,false);};
$('tbtn').onclick=e=>{e.stopPropagation(); togglePause();};

// ----- pause menu -----
function togglePause(){
  const p=$('pause');
  if(p.style.display==='flex'){p.style.display='none';return;}
  p.innerHTML=`<div class="sheet"><h3>Paused</h3>
    <button class="mbtn primary" data-a="resume">Resume <small>Esc</small></button>
    <button class="mbtn" data-a="settings">Settings <small>Text speed</small></button>
    <button class="mbtn" data-a="share">Share the game <small>Download or copy</small></button>
    <button class="mbtn mint" data-a="quit">Save &amp; quit to menu <small>Progress is kept</small></button></div>`;
  p.style.display='flex';
  p.onclick=e=>{e.stopPropagation(); const a=e.target.closest('[data-a]'); if(!a){ if(e.target===p) p.style.display='none'; return;}
    const k=a.dataset.a;
    if(k==='resume') p.style.display='none';
    if(k==='settings') openPanel('settings');
    if(k==='share') openPanel('share');
    if(k==='quit'){ p.style.display='none'; title(); }
  };
}

// ----- main menu -----
function hideMenu(){ $('menu').style.display='none'; closePanel(); $('hud').style.visibility='visible'; }
function title(){
  clearInterval(typing); waiting=null; queue=[]; ['walkmap','mini'].forEach(id=>{const el=document.getElementById(id); if(el) el.remove();}); $('box').style.visibility='visible';
  G=null; $('choices').innerHTML=''; $('journal').style.display='none'; $('journal').classList.remove('open','closing'); $('rankboard').style.display='none'; $('pause').style.display='none';
  document.querySelectorAll('.card').forEach(c=>c.remove());
  document.querySelectorAll('#stage > .ovl, .toast, .rankup, .chcard').forEach(el=>el.remove()); playMood('menu');
  $('chapter').textContent=''; if(curBg!=='gate'||!$('bg').children.length) setBg('gate'); curBg='gate'; $('cast').innerHTML='';
  $('name').textContent=''; $('text').textContent=''; $('hud').style.visibility='hidden';
  const sv=getSave(), found=JSON.parse(localStorage.getItem(END_KEY)||'[]');
  const done=CANON.filter(c=>found.includes(c[1])).length;
  const m=$('menu');
  m.innerHTML=`<div class="hero">
      <div class="logo"><div class="k">A Rankingland Story</div><h1>WidR<br>School</h1><div class="s">5vb VWO · Eight hearts · One ranking</div></div>
      <div class="lineup">${['fionn','lars','mada','natan','adam','milo'].map(k=>`<div data-p="${k}" title="${CHARS[k].name}">${portrait(k,'smile')}</div>`).join('')}</div>
    </div>
    <div class="side">
      ${sv?`<button class="mbtn primary" data-a="continue">Continue <small>${sv.G.P} · ${sv.G.ch||'Chapter 1'}</small></button>`:''}
      <button class="mbtn ${sv?'':'primary'}" data-a="new">New Game <small>${sv?'Overwrites save':'Start your first day'}</small></button>
      <button class="mbtn" data-a="chars">Characters <small>Meet 5vb</small></button>
      <button class="mbtn" data-a="ends">Endings <small>${done}/8 found</small></button>
      <button class="mbtn" data-a="mem">Memories <small>${JSON.parse(localStorage.getItem('widr_cg2')||'[]').length}/${Object.keys(CG).length} special scenes</small></button>
      <button class="mbtn" data-a="how">How to Play</button>
      <button class="mbtn" data-a="settings">Settings</button>
      <button class="mbtn mint" data-a="share">Share the Game <small>Download / copy</small></button>
      <div class="foot">Your progress saves automatically at every scene.</div>
    </div>`;
  m.style.display='grid';
  m.onclick=e=>{ const p=e.target.closest('[data-p]'); if(p) return openPanel('chars',p.dataset.p);
    const a=e.target.closest('[data-a]'); if(!a) return; const k=a.dataset.a;
    if(k==='continue') return continueGame();
    openPanel(k);
  };
}

// ----- panels -----
const PROFILES={
  natan:['17','Third base for the WidR Rankers. Curly hair, three different laughs, and terrible aim, but only at Daniel.'],
  lars:['16','Loves cats but can\'t touch them, for reasons. Always has a plan. White shirts, skinny jeans, sharp blue eyes.'],
  adam:['16','Top of the class, and happiest at the table tennis table. Owner of Gianmarco (strawberry) and Giuseppe (green apple).'],
  fionn:['16','Says he doesn\'t care. Cares about everything. Watches every match, makes the best pancakes in Rankingland.'],
  milo:['17','Best-dressed boy at WidR. Phonk every single day. Very hard to impress.'],
  mada:['17','Adam\'s sister, in 6 VWO. Number one on the WidR Ranking. Half the boys at school are in love with her. Very hard to get.'],
  gian:['16','??? Unlock her by getting close to Adam.'],
  goon:['16','??? Get even closer to Adam to find out.'],
  daniel:['17','Baseball in spring, football all year. From Afghanistan. Somehow always in the way of Natan\'s throws.'],
  josh:['16','Calm, clever and organised, until his ADHD kicks in and he talks about five things at once.'],
  reshman:['17','Your tour guide. Self-declared coolest guy at WidR, and he knows exactly how the ranking works.'],
};
function closePanel(){ $('panel').style.display='none'; }
function genesCard(p){
  const c=charisma(Object.assign({gender:p.gender},p.gen));
  const bar=(v,max)=>`<div style="height:12px;border:2px solid #2b2340;border-radius:99px;overflow:hidden;background:#fff;margin:.2em 0 .6em"><div style="height:100%;width:${Math.round(v/max*100)}%;background:linear-gradient(90deg,#7fd6c2,#ff6f9f)"></div></div>`;
  return `<h2>Your Genetics</h2><p>Rankingland rolled the dice, ${p.name||'Robin'}. You can't change your height or your face, but you can work on everything else.</p>
    <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:4%">
      <div><b>Height: ${fmtH(p.gen.h)}</b>${p.gender==='m'?' <small>(matters a lot)</small>':' <small>(doesn\'t matter for you)</small>'}${bar(p.gen.h-60,p.gender==='m'?17:12)}
        <b>Looks: ${p.gen.looks}/10</b>${p.gender==='f'?' <small>(matters)</small>':' <small>(matters)</small>'}${bar(p.gen.looks,10)}</div>
      <div><b>Charisma: ${c}/100</b>${bar(c,100)}
        <small>Charisma raises your WidR Ranking and speeds up how fast you climb. Boost it with glow-ups: barber, gym, skincare, new clothes. You'll need money from a part-time job.</small></div>
    </div>
    <p><b>Starting money:</b> €30</p>
    <button class="pbtn" data-a="go">Start the first day</button>`;
}
function openPanel(kind,focus){
  const P=$('panel'); let h='<button class="x" data-a="close">Close ✕</button>';
  if(kind==='new'){
    h+=`<h2>New Game</h2><p>What's your name? Everyone at WidR will call you this.</p>
      <input class="nm" id="nm" maxlength="16" placeholder="Your name" value="">
      <p><b>Who are you playing as?</b></p>
      <div class="seg" id="gsel"><button data-g="m" class="on">Boy</button><button data-g="f">Girl</button></div>
      <p class="sub" id="gnote" style="color:#7a6e8f"></p>
      <div><button class="pbtn" data-a="roll">Roll my genetics</button></div>
      ${getSave()?'<p style="color:#e8364f">Starting a new game replaces your current save.</p>':''}`;
  }
  if(kind==='genes'){ h+=genesCard(pending); }
  if(kind==='chars'){
    h+=`<h2>Characters</h2><div class="profiles">${Object.keys(PROFILES).map(k=>{const [age,txt]=PROFILES[k], rom=ROM.includes(k);
      return `<div class="prof" ${focus===k?'style="outline:4px solid #ff6f9f"':''}><div class="pic" style="background:${CHARS[k].color}22">${(k==='gian'||k==='goon')?'<div style="height:100%;display:flex;align-items:center;justify-content:center;font-family:var(--display);font-size:3em">?</div>':portrait(k,'smile')}</div>
      <div class="inf"><b style="color:${CHARS[k].color}">${(k==='gian'||k==='goon')?'???':CHARS[k].name}</b><span class="tg" style="background:${rom?'#ffd3e2':'#eee'}">${rom?'Romance':'Friend'}</span><span class="tg">${age}</span><p>${txt}</p></div></div>`;}).join('')}</div>`;
  }
  if(kind==='ends'){
    const found=JSON.parse(localStorage.getItem(END_KEY)||'[]');
    h+=`<h2>Endings</h2><p>Each romance has one canon storyline. The game only ends when you finish one at the End-of-Year Ball.</p>
      <div class="ends" style="grid-template-columns:repeat(8,minmax(0,1fr))">${CANON.map(([k,n])=>{const ok=found.includes(n);
        return `<div class="endc ${ok?'':'lock'}"><div class="pic">${portrait(k,ok?'happy':'neutral')}</div><div class="inf"><b>${ok?n:'???'}</b><small>${ok?CHARS[k].name:'Not found yet'}</small></div></div>`;}).join('')}</div>`;
  }
  if(kind==='how'){
    h+=`<h2>How to Play</h2><ul class="rules">
      <li><b>Click or press Space</b> to continue dialogue. Press <b>Esc</b> to pause.</li>
      <li><b>Boy or girl:</b> you choose at the start. Who can date you depends on it. Some people will always say no, even at 5 hearts.</li>
      <li><b>Genetics:</b> your height and looks are random. Height matters a lot for boys; for girls, it's your face. You can't change either.</li>
      <li><b>Charisma:</b> boost it on weekends with glow-ups (barber, gym, skincare, clothes). They cost money, so take part-time jobs.</li>
      <li><b>The calendar:</b> the year runs day by day from Monday 2 November. After school you get one free visit around town, Saturdays get two, and Sundays are rest days. Big events (festival, Christmas, Valentine's, the ball) happen on fixed dates, so plan ahead.</li>
      <li><b>Confidants:</b> every romance option has ranks (★). Spend time with them to build connection, then talk to them again to unlock their next story. Harder people have more ranks: Lars has 7, Milo and Mada have 10. Nobody will date you before their second-to-last rank (their last rank if you're low on the ranking).</li>
      <li><b>Four stats:</b> Knowledge (study at the library), Guts (the park, the gym, the spicy pancake challenge), Charm (glow-ups, mirror practice), Kindness (the cat shelter, the café, babysitting). Some ranks and choices are locked until a stat is high enough. Mada only opens up to Charm. Adam's deep conversations need Knowledge. Turning Fionn down calmly takes Guts.</li>
      <li><b>Phone:</b> people text you. Replying well counts as connection too.</li>
      <li><b>Connections:</b> nobody falls for you by accident. Check ranks and stats in the <b>Notebook</b>.</li>
      <li><b>The WidR Ranking:</b> the school's list of "best catches." It isn't easy to climb, and how fast you climb depends on your charisma. The higher you are, the easier it is for someone to say yes. Some people only date the top of the list.</li>
      <li><b>The ranking locks on Valentine's Day.</b> Leave it too late and some people are out of reach.</li>
      <li><b>Asking someone out:</b> a yes means you start dating and the story keeps going. If they say no, try again later. If <i>you</i> say no, something happens, and the story carries on.</li>
      <li><b>Dating two people at once?</b> Valentine's Day will find out. So will the ranking.</li>
      <li>The game only ends when you finish a canon storyline at the End-of-Year Ball.</li></ul>`;
  }
  if(kind==='settings'){
    h+=`<h2>Settings</h2><p><b>Text speed</b></p><div class="seg" id="spd">${Object.keys(SPEEDS).map(k=>`<button data-s="${k}" class="${SET.speed===k?'on':''}">${k[0].toUpperCase()+k.slice(1)}</button>`).join('')}</div>
      <p><b>Music</b> <input type="range" id="vmus" min="0" max="1" step="0.05" value="${SET.music}" style="width:60%;vertical-align:middle"></p>
      <p><b>Sound effects &amp; voices</b> <input type="range" id="vsfx" min="0" max="1" step="0.05" value="${SET.sfxv}" style="width:60%;vertical-align:middle"></p>
      <p><b>Progress</b></p><button class="pbtn ghost" data-a="wipe">Erase save &amp; endings</button><div class="msg" id="msg"></div>`;
  }
  if(kind==='mem'){
    const got=JSON.parse(localStorage.getItem('widr_cg2')||'[]');
    h+=`<h2>Memories</h2><p>Special scenes you've unlocked. Click one to view it.</p><div class="mems">${Object.keys(CG).map(id=>got.includes(id)
      ?`<div class="mem" data-cg="${id}">${cgSvg(CG[id],{P:'You',flags:{},dating:[]}).replace(/\{P\}/g,'you')}</div>`
      :`<div class="mem lock"><span>?</span></div>`).join('')}</div>`;
  }
  if(kind==='share'){
    h+=`<h2>Share the Game</h2>
      <p>The whole game is one HTML file. Save it, then send it to anyone. They just double-click it to play, no internet needed.</p>
      <button class="pbtn" data-a="dl">Download WidR_School.html</button>
      <button class="pbtn alt" data-a="copy">Copy the game code</button>
      <button class="pbtn ghost" data-a="show">Show the code</button>
      <div class="msg" id="msg"></div>
      <p><b>If the download doesn't start</b> (some previews block downloads):</p>
      <ol><li>Click <b>Copy the game code</b>.</li>
      <li>Open <b>TextEdit</b>, choose <b>Format › Make Plain Text</b>, and paste.</li>
      <li>Save it as <b>WidR_School.html</b>. Double-click to play.</li></ol>
      <p><b>Want a link?</b> Drag that file onto <b>app.netlify.com/drop</b>, or upload it to <b>itch.io</b> as an HTML game.</p>
      <textarea id="code" readonly style="display:none"></textarea>`;
  }
  P.innerHTML=h; P.style.display='block'; P.scrollTop=0;
  const msg=t=>{const m=P.querySelector('#msg'); if(m) m.textContent=t;};
  let gsel='m';
  const gnote=()=>{const n=P.querySelector('#gnote'); if(n) n.textContent= gsel==='m'
    ? 'Boy route: Natan, Lars, Milo, Mada and two secret girls can date you. Adam and Fionn only see you as a friend.'
    : 'Girl route: Natan, Lars, Adam, Fionn, Milo and two secret girls can date you. Mada only dates boys.';};
  if(kind==='new'){ const i=P.querySelector('#nm'); setTimeout(()=>i.focus(),50); gnote(); }
  P.querySelectorAll('#vmus,#vsfx').forEach(r=>r.oninput=()=>{ SET[r.id==='vmus'?'music':'sfxv']=+r.value; localStorage.setItem(SET_KEY,JSON.stringify(SET)); setVolumes(); if(r.id==='vsfx') SFX.click(); });
  P.onclick=e=>{ e.stopPropagation();
    const mm=e.target.closest('[data-cg]'); if(mm){ const big=document.createElement('div'); big.className='ovl cg'; big.style.zIndex=40; big.innerHTML=`<div class="cgimg">${mm.innerHTML}</div><div class="tapnote">Click to close</div>`; big.onclick=()=>big.remove(); $('stage').appendChild(big); return; }
    const sp=e.target.closest('[data-s]'); if(sp){ SET.speed=sp.dataset.s; localStorage.setItem(SET_KEY,JSON.stringify(SET)); P.querySelectorAll('#spd button').forEach(b=>b.classList.toggle('on',b===sp)); return; }
    const gs=e.target.closest('[data-g]'); if(gs){ gsel=gs.dataset.g; P.querySelectorAll('#gsel button').forEach(b=>b.classList.toggle('on',b===gs)); gnote(); return; }
    const a=e.target.closest('[data-a]'); if(!a) return; const k=a.dataset.a;
    if(k==='close') return closePanel();
    if(k==='roll'){ pending={name:P.querySelector('#nm').value.trim(), gender:gsel, gen:rollGenes(gsel)}; return openPanel('genes'); }
    if(k==='go'){ const p=pending; pending=null; return newGame(p.name,p.gender,p.gen); }
    if(k==='wipe'){ if(confirm('Erase your save and all endings found?')){ localStorage.removeItem(SAVE_KEY); localStorage.removeItem(END_KEY); localStorage.removeItem('widr_cg2'); msg('Erased.'); if(!G) setTimeout(title,400);} return; }
    if(k==='dl'){
      try{ const url=URL.createObjectURL(new Blob([SOURCE],{type:'text/html'}));
        const l=document.createElement('a'); l.href=url; l.download='WidR_School.html'; document.body.appendChild(l); l.click(); l.remove();
        setTimeout(()=>URL.revokeObjectURL(url),4000);
        msg('Download started. If nothing appeared, this preview blocks downloads. Use "Copy the game code" instead.');
      }catch(err){ msg('Downloads are blocked here. Use "Copy the game code" instead.'); }
      return;
    }
    if(k==='show'||k==='copy'){
      const ta=P.querySelector('#code'); ta.value=SOURCE; ta.style.display='block';
      if(k==='show'){ ta.focus(); ta.select(); msg('Code shown below. Press Cmd+A then Cmd+C to copy it.'); return; }
      const fallback=()=>{ ta.focus(); ta.select(); let ok=false; try{ok=document.execCommand('copy');}catch(e){}
        msg(ok?'Copied! Now paste it into TextEdit (plain text) and save as WidR_School.html.':'Your browser blocked copying here. The code is selected below. Press Cmd+C.'); };
      if(navigator.clipboard && navigator.clipboard.writeText)
        navigator.clipboard.writeText(SOURCE).then(()=>msg('Copied! Now paste it into TextEdit (plain text) and save as WidR_School.html.'),fallback);
      else fallback();
    }
  };
}
