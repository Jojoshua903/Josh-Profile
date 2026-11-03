// ---------- PRESENTATION: crossfading backgrounds, chapter cards, special scenes (CGs), phone, calendar cards ----------
function setBg(name){
  const host=$('bg'), layer=document.createElement('div');
  layer.className='bgl'; layer.innerHTML=BG[name](); host.appendChild(layer);
  requestAnimationFrame(()=>requestAnimationFrame(()=>layer.classList.add('on')));
  const old=[...host.children].filter(l=>l!==layer); setTimeout(()=>old.forEach(l=>l.remove()),700);
}
function chapterCard(text){
  const d=document.createElement('div'); d.className='chcard'; d.innerHTML=`<div><small>${text.split('·')[0].trim()}</small><b>${(text.split('·')[1]||'').trim()}</b></div>`;
  $('stage').appendChild(d); SFX.whoosh(); setTimeout(()=>d.classList.add('out'),1700); setTimeout(()=>d.remove(),2400);
}
// Generic overlay that waits for a click, then continues the story.
function waitOverlay(cls,html,onClose){
  const d=document.createElement('div'); d.className='ovl '+cls; d.innerHTML=html; $('stage').appendChild(d);
  waiting=null; $('next').style.visibility='hidden';
  setTimeout(()=>{ d.onclick=e=>{ if(e.target.closest('[data-reply]')) return; e.stopPropagation(); close(); }; },350);
  const close=()=>{ d.classList.add('out'); setTimeout(()=>d.remove(),300); if(onClose) onClose(); else step(); };
  return {el:d, close};
}

// ----- special scenes (CGs) -----
const nest=(id,expr,form,x,y,w)=>portrait(id,expr,form).replace('<svg ',`<svg x="${x}" y="${y}" width="${w}" height="${w*5/3}" `);
function cgFx(kind){
  let s='';
  if(kind==='hearts') for(let i=0;i<26;i++) s+=`<text x="${(i*151)%1600}" y="${(i*97)%800+60}" font-size="${30+(i%4)*14}" fill="#ff6f9f" opacity=".75">♥</text>`;
  if(kind==='sparkle') for(let i=0;i<34;i++) s+=`<text x="${(i*131)%1600}" y="${(i*83)%860+30}" font-size="${24+(i%3)*16}" fill="${['#ffc94d','#fff','#ff9fc2'][i%3]}" opacity=".9">✦</text>`;
  if(kind==='lights') for(let i=0;i<40;i++) s+=`<circle cx="${(i*41)%1600}" cy="${60+Math.sin(i*.6)*30}" r="9" fill="${['#ffe38a','#ff9fc2','#8ec5ff','#7fd6c2'][i%4]}" opacity=".95"/>`;
  if(kind==='sirens') s+=`<rect width="800" height="900" fill="#e8364f" opacity=".22"/><rect x="800" width="800" height="900" fill="#2a4dff" opacity=".22"/>`;
  if(kind==='flash') s+=`<radialGradient id="cgf"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><rect width="1600" height="900" fill="url(#cgf)"/>`;
  if(kind==='phones') for(let i=0;i<8;i++) s+=`<rect x="${100+i*190}" y="${640+(i%2)*40}" width="80" height="140" rx="12" fill="#2b2340"/><rect x="${108+i*190}" y="${650+(i%2)*40}" width="64" height="110" rx="6" fill="#fff" opacity=".85"/>`;
  return s;
}
const CG={};
const cg=(id,o)=>{ CG[id]=o; };
// o = {bg, chars:[[id,expr,form,x,w]], fx, title, line}
function cgSvg(o,G){
  const chars=(typeof o.chars==='function'?o.chars(G):o.chars).map(c=>nest(c[0],c[1],c[2]||(c[0]==='lars'&&G&&G.flags&&G.flags.lars_girl?'girl':''),c[3],c[4]||60,c[5]||520)).join('');
  const bg=BG[o.bg]().replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'');
  return `<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">${bg}<rect width="1600" height="900" fill="#2b2340" opacity=".12"/>${cgFx(o.fx)}${chars}
    <rect x="0" y="770" width="1600" height="130" fill="#2b2340" opacity=".72"/><text x="800" y="828" font-family="Chalkboard SE,Marker Felt,cursive" font-size="50" text-anchor="middle" fill="#fff">${o.title}</text>
    <text x="800" y="872" font-family="Avenir Next,Trebuchet MS,sans-serif" font-size="26" text-anchor="middle" fill="#ffd3e2">${o.line||''}</text></svg>`;
}
function showCG(id){
  const o=CG[id]; if(!o) return step();
  const got=JSON.parse(localStorage.getItem('widr_cg2')||'[]'); if(!got.includes(id)){ got.push(id); localStorage.setItem('widr_cg2',JSON.stringify(got)); }
  SFX.sparkle();
  waitOverlay('cg',`<div class="cgimg">${cgSvg(o,G).replace(/\{P\}/g,G.P)}</div><div class="tapnote">Click to continue</div>`);
}
const CONF_LINES={natan:`"The person I look for in the stands is you."`,lars:`"No strategy. Just asking."`,adam:`"This one is named {P}."`,fionn:`"It's not like I like you or anything... I do."`,milo:`"I don't do soft. But I want to try. With you."`,mada:`"You're the first person who got to know me first."`,gian:`"You were the only one who ever said hi to me."`,goon:`"I've never wanted to keep anything this much."`};
const END_TITLES={natan:'Home Run',lars:"The Cat's Out of the Bag",adam:'Perfect Score',fionn:'Gym Buddies',milo:'Bass Drop',mada:'Top of the List',gian:'Strawberry Season',goon:'Green Apple Era'};
Object.keys(CONF_LINES).forEach(k=>{
  cg('conf_'+k,{bg:'sunset',fx:'hearts',chars:G=>[[k,'blush','',540]],title:`${CHARS[k].name} asks you out`,line:CONF_LINES[k]});
  cg('end_'+k,{bg:'sunset',fx:'lights',chars:G=>[[k,'happy','',540]],title:END_TITLES[k],line:`You and ${CHARS[k].name} at the End-of-Year Ball`});
});
cg('lars_poof',{bg:'catcafe',fx:'sparkle',chars:[['lars','surprised','girl',540]],title:'The complicated part',line:'Lars, after one cat got too close'});
cg('lars_forever',{bg:'sunset',fx:'sparkle',chars:[['lars','happy','girl',540]],title:'It stays',line:'"It\'s me. I think it\'s been me for a while."'});
cg('scandal',{bg:'hallway',fx:'phones',chars:G=>{ const d=(G.cgPair||['natan','lars']); return [[d[0],'angry','',300],[d[1],'angry','',780]]; },title:"Valentine's Day Scandal",line:'Somebody is definitely filming this.'});
cg('chase',{bg:'night',fx:'sirens',chars:[['fionn','angry','',360],['officer','neutral','',760]],title:'Fionn vs. The Law',line:'"I JUST HAD FEELINGS! LOUDLY!"'});
cg('gian_born',{bg:'classroom',fx:'flash',chars:[['adam','surprised','',300],['gian','smile','',780]],title:'Gianmarco?!',line:'"I think I used to be an eraser."'});
cg('goon_born',{bg:'library',fx:'flash',chars:[['adam','surprised','',300],['goon','smirk','',780]],title:'Goonseppe',line:'"Don\'t ask about the name."'});
cg('trophy',{bg:'field',fx:'sparkle',chars:[['natan','happy','',260],['daniel','grin','',780]],title:'Winter Champions',line:'WidR wins its first winter trophy in years'});

// ----- phone texts -----
function showPhone(msg){
  const c=CHARS[msg.from], bubbles=msg.lines.map(l=>`<div class="bub">${l.replace(/\{P\}/g,G.P)}</div>`).join('');
  const replies=(msg.replies||[]).map((r,i)=>`<button data-reply="${i}">${r[0]}</button>`).join('');
  SFX.buzz();
  const o=waitOverlay('phone',`<div class="ph"><div class="phtop"><span style="background:${c.color}">${c.name[0]}</span><b>${c.name}</b></div><div class="phmsgs">${bubbles}</div>
    <div class="phrep">${replies||'<small>Click to put your phone away</small>'}</div></div>`);
  o.el.querySelectorAll('[data-reply]').forEach(b=>b.onclick=e=>{ e.stopPropagation(); const r=msg.replies[+b.dataset.reply];
    G.aff[msg.from]+=r[1]; const box=o.el.querySelector('.phmsgs'); box.insertAdjacentHTML('beforeend',`<div class="bub me">${r[0]}</div>${r[2]?`<div class="bub">${r[2]}</div>`:''}`);
    o.el.querySelector('.phrep').innerHTML='<small>Click to put your phone away</small>'; SFX.click(); });
}

// ----- calendar day card -----
const DAY0=new Date(2026,10,2);
const dayDate=n=>{ const d=new Date(DAY0); d.setDate(d.getDate()+n); return d; };
const DOW=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'], MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function showDayCard(G,skipped){
  const d=dayDate(G.calDay), ev=nextEvent(G.calDay), w=['☀️','⛅','🌧️','❄️','☁️'][(G.calDay*7)%5], left=ev?ev.day-G.calDay:0;
  let strip=''; for(let i=-1;i<6;i++){ const n=G.calDay+i, dd=dayDate(n), isEv=EVENTS.some(e=>e.day===n);
    strip+=`<div class="cd ${i===0?'now':''} ${isEv?'ev':''}"><small>${DOW[dd.getDay()]}</small><b>${dd.getDate()}</b>${isEv?'<i>★</i>':''}</div>`; }
  SFX.whoosh();
  waitOverlay('daycard',`<div class="dc"><div class="dcw">${w}</div><div class="dcd"><small>${DOW[d.getDay()]==='Sat'?'Saturday':'After school'}</small><b>${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}</b></div>
    ${skipped?`<div class="dcs">${skipped}</div>`:''}<div class="strip">${strip}</div>
    ${ev?`<div class="dcn">★ ${ev.name} in ${left} day${left===1?'':'s'}</div>`:''}<div class="tapnote">Click to start the day</div></div>`);
}
