// ---------- MINI-GAMES: jobs, tournament, ice skating ----------
// Each game: title, how-to, duration, pay rule, and init/update/draw/input handlers on a 1600x900 canvas.
const MINI_FONT='"Chalkboard SE","Marker Felt","Trebuchet MS",cursive';
const rnd=(a,b)=>a+Math.random()*(b-a);
function rr(ctx,x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke!==false){ctx.lineWidth=5;ctx.strokeStyle='#2b2340';ctx.stroke();}}
function txt(ctx,s,x,y,size,col,align){ctx.font=`${size}px ${MINI_FONT}`;ctx.fillStyle=col||'#2b2340';ctx.textAlign=align||'center';ctx.textBaseline='middle';ctx.fillText(s,x,y);}
function chibi(ctx,x,y,hair,shirt,sc=1,face='#f4d3bd'){
  ctx.save();ctx.translate(x,y);ctx.scale(sc,sc);ctx.lineWidth=4;ctx.strokeStyle='#2b2340';
  ctx.fillStyle=shirt;ctx.beginPath();ctx.roundRect(-26,0,52,54,14);ctx.fill();ctx.stroke();
  ctx.fillStyle=face;ctx.beginPath();ctx.arc(0,-22,30,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.fillStyle=hair;ctx.beginPath();ctx.arc(0,-30,31,Math.PI*1.02,Math.PI*1.98);ctx.lineTo(28,-22);ctx.quadraticCurveTo(0,-40,-28,-22);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#2b2340';ctx.beginPath();ctx.ellipse(-10,-18,4,6,0,0,7);ctx.ellipse(10,-18,4,6,0,0,7);ctx.fill();
  ctx.restore();
}
const pay=(base,pct)=>Math.round(base*(0.4+0.6*Math.max(0,Math.min(1,pct))));

const MINIS={
  pancake:{ title:"Fionn's Pancake Café", how:'Click a pancake when it turns golden to flip it, then click again when the second side is golden to serve it. Burnt ones are wasted!', dur:30, base:35,
    init(g){ g.spots=[450,800,1150].map(x=>({x,y:500,side:1,t:0,rate:rnd(.22,.34),q1:0,flash:0})); g.served=0; g.quality=0; g.msg=''; },
    qual(t){ return t<.4?.1:t<.55?.5:t<.85?1:t<1.05?.6:.1; },
    update(g,dt){ g.spots.forEach(p=>{ p.t+=p.rate*dt; p.flash=Math.max(0,p.flash-dt); if(p.t>1.3){ p.side=1;p.t=0;p.rate=rnd(.22,.36);p.flash=.6;g.msg='Burnt! Fionn sighs very loudly.'; } }); },
    click(g,x,y){ g.spots.forEach(p=>{ if(Math.hypot(x-p.x,y-p.y)<130){ const q=this.qual(p.t);
      if(p.side===1){ p.q1=q; p.side=2; p.t=0; g.msg=q>=1?'Perfect flip!':q>=.6?'Bit dark, but okay.':'Too early...'; }
      else { g.served++; g.quality+=(p.q1+q)/2; p.side=1; p.t=0; p.rate=rnd(.22,.36); g.msg=((p.q1+q)/2)>=.9?'"That one\'s actually perfect. Not that I care." — Fionn':'Served!'; } } }); },
    draw(g,ctx){
      ctx.fillStyle='#fff0d1';ctx.fillRect(0,0,1600,900);
      rr(ctx,250,330,1100,360,30,'#3a3340');
      g.spots.forEach(p=>{ const t=Math.min(p.t,1.3), c=t<.55?[248,232,190]:t<.85?[226,170,80]:t<1.05?[170,105,45]:[70,45,30];
        const col=`rgb(${c.join(',')})`; ctx.fillStyle=col;ctx.lineWidth=5;ctx.strokeStyle='#2b2340';ctx.beginPath();ctx.ellipse(p.x,p.y,120,100,0,0,7);ctx.fill();ctx.stroke();
        ctx.beginPath();ctx.arc(p.x,p.y-150,34,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.min(1,t/1.3));ctx.lineWidth=10;ctx.strokeStyle=t>=.55&&t<.85?'#2e9e5b':t>=.85?'#e8364f':'#c9bfdc';ctx.stroke();
        txt(ctx,p.side===1?'side 1':'side 2',p.x,p.y-150,20);
        if(p.flash>0) txt(ctx,'🔥',p.x,p.y,80); });
      chibi(ctx,1450,240,'#16131a','#2e9e5b',1.3,'#f8dfcf');
      txt(ctx,`Served: ${g.served}`,250,120,48,'#2b2340','left'); txt(ctx,g.msg,800,790,32);
    },
    score(g){ return Math.min(1,g.quality/7); },
    result(g){ return `You served ${g.served} pancakes.`; } },

  cafe:{ title:'Pawsome Café', how:'Customers will ask for a drink. Click the right one before they get impatient. Don\'t click the cats. Lars is serious.', dur:30, base:35,
    D:[['Latte','☕','#c49a6c'],['Tea','🍵','#7fd6c2'],['Cocoa','🍫','#8c5a3c']],
    init(g){ g.ok=0; g.miss=0; g.msg=''; g.cats=[]; this.next(g); },
    next(g){ g.order={d:Math.floor(Math.random()*3), t:0, lim:Math.max(2.2,4.6-g.ok*.2), hair:['#5a3a22','#e8b04a','#1b1612','#c4622d','#8a5a34'][Math.floor(Math.random()*5)]}; },
    update(g,dt){ g.order.t+=dt; if(g.order.t>g.order.lim){ g.miss++; g.msg='They left. Grumpily.'; this.next(g); }
      if(Math.random()<dt*.5) g.cats.push({x:-80,y:rnd(560,620),v:rnd(120,220),c:['#ffb36b','#fff','#6b6b7a','#2b2340'][Math.floor(Math.random()*4)]});
      g.cats.forEach(c=>c.x+=c.v*dt); g.cats=g.cats.filter(c=>c.x<1700); },
    click(g,x,y){
      for(const c of g.cats) if(Math.hypot(x-c.x,y-c.y)<60){ g.miss++; g.msg='"NOT THE CATS." — Lars, from very far away'; return; }
      this.D.forEach((d,i)=>{ const bx=350+i*350; if(x>bx-140&&x<bx+140&&y>700&&y<860){ if(i===g.order.d){g.ok++;g.msg='Perfect!';} else {g.miss++;g.msg='Wrong drink!';} this.next(g); } }); },
    draw(g,ctx){
      ctx.fillStyle='#ffe8f0';ctx.fillRect(0,0,1600,900); rr(ctx,0,520,1600,140,0,'#f7cba0');
      chibi(ctx,800,330,g.order.hair,'#8ec5ff',1.6);
      rr(ctx,900,90,300,150,30,'#fff'); txt(ctx,this.D[g.order.d][1],1050,150,80); txt(ctx,this.D[g.order.d][0],1050,215,28);
      const left=1-g.order.t/g.order.lim; rr(ctx,600,470,400,24,12,'#fff'); rr(ctx,600,470,400*Math.max(0,left),24,12,left>.4?'#2e9e5b':'#e8364f',false);
      g.cats.forEach(c=>{ctx.fillStyle=c.c;ctx.lineWidth=4;ctx.strokeStyle='#2b2340';ctx.beginPath();ctx.ellipse(c.x,c.y,46,28,0,0,7);ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(c.x+38,c.y-26,24,0,7);ctx.fill();ctx.stroke();});
      this.D.forEach((d,i)=>{ const bx=350+i*350; rr(ctx,bx-140,700,280,160,24,d[2]); txt(ctx,d[1]+' '+d[0],bx,780,40,'#fff'); });
      chibi(ctx,1480,300,'#8a5a34','#ffffff',1.2,'#f7dcc8'); txt(ctx,'Lars',1480,400,24);
      txt(ctx,`Served: ${g.ok}   Missed: ${g.miss}`,60,60,40,'#2b2340','left'); txt(ctx,g.msg,800,660,30);
    },
    score(g){ return (g.ok/Math.max(1,g.ok+g.miss))*Math.min(1,g.ok/10); },
    result(g){ return `You served ${g.ok} drinks and missed ${g.miss}.`; } },

  babysit:{ title:'Babysitting the Twins', how:'The twins run around the living room. Click a twin to carry them back to the play mat before they reach the cookie jar, the paint or the stairs!', dur:45, base:45,
    init(g){ g.kids=[0,1].map(i=>({x:800+i*60,y:480,vx:0,vy:0,c:i?'#ff9fc2':'#8ec5ff'})); g.mess=0; g.saves=0; g.msg='';
      g.haz=[[60,60,300,220,'🍪 Cookie jar'],[1240,60,300,220,'🎨 Paint'],[1240,620,300,220,'🪜 Stairs'],[60,620,300,220,'🐠 Fishbowl']]; },
    update(g,dt){ const sp=150+g.t*5;
      g.kids.forEach(k=>{ if(Math.random()<dt*1.2){ const a=rnd(0,7); k.vx=Math.cos(a)*sp; k.vy=Math.sin(a)*sp; }
        k.x=Math.max(40,Math.min(1560,k.x+k.vx*dt)); k.y=Math.max(40,Math.min(860,k.y+k.vy*dt));
        g.haz.forEach(h=>{ if(k.x>h[0]&&k.x<h[0]+h[2]&&k.y>h[1]&&k.y<h[1]+h[3]){ g.mess++; g.msg=`Oh no! ${h[4]}!`; k.x=800;k.y=480; } }); }); },
    click(g,x,y){ g.kids.forEach(k=>{ if(Math.hypot(x-k.x,y-k.y)<75){ k.x=rnd(720,880); k.y=rnd(430,530); g.saves++; g.msg='Got you!'; } }); },
    draw(g,ctx){
      ctx.fillStyle='#fff4e0';ctx.fillRect(0,0,1600,900);
      g.haz.forEach(h=>{ rr(ctx,h[0],h[1],h[2],h[3],20,'#ffd3e2'); txt(ctx,h[4],h[0]+h[2]/2,h[1]+h[3]/2,30); });
      rr(ctx,600,340,400,280,40,'#bfe6ff'); txt(ctx,'Play mat',800,380,26);
      g.kids.forEach(k=>chibi(ctx,k.x,k.y,'#c4622d',k.c,.9));
      txt(ctx,`Messes: ${g.mess}   Saves: ${g.saves}`,800,880-18,32); txt(ctx,g.msg,800,300,30);
    },
    score(g){ return Math.max(0,1-g.mess/10); },
    result(g){ return `${g.mess} mess${g.mess===1?'':'es'} and ${g.saves} rescues.`; } },

  stadium:{ title:'Stadium Snack Stand', how:'Big match, big crowd. Move your tray with the mouse (or arrow keys) to catch falling snacks. Avoid the stinky socks!', dur:60, base:70,
    init(g){ g.x=800; g.items=[]; g.caught=0; g.good=0; g.socks=0; g.msg=''; },
    update(g,dt){
      if(g.keys.ArrowLeft) g.x-=900*dt; if(g.keys.ArrowRight) g.x+=900*dt; if(g.mx!=null) g.x+= (g.mx-g.x)*Math.min(1,dt*14); g.x=Math.max(120,Math.min(1480,g.x));
      if(Math.random()<dt*(1.4+g.t*.03)){ const bad=Math.random()<.18; g.items.push({x:rnd(80,1520),y:-40,v:rnd(260,460)+g.t*4,e:bad?'🧦':['🌭','🥤','🍿','🧇'][Math.floor(Math.random()*4)],bad}); if(!bad) g.good++; }
      g.items.forEach(it=>{ it.y+=it.v*dt; if(!it.done && it.y>760&&it.y<820&&Math.abs(it.x-g.x)<120){ it.done=true; if(it.bad){g.socks++;g.caught=Math.max(0,g.caught-2);g.msg='Ew. A sock.';} else {g.caught++;g.msg='Nice catch!';} } });
      g.items=g.items.filter(it=>!it.done&&it.y<960); },
    draw(g,ctx){
      ctx.fillStyle='#bfe3ff';ctx.fillRect(0,0,1600,900); for(let i=0;i<6;i++) rr(ctx,i*280-20,120+((i*37)%40),260,200,10,['#ff9fc2','#ffc94d','#7fd6c2'][i%3]);
      rr(ctx,0,840,1600,60,0,'#7fcf6e');
      g.items.forEach(it=>txt(ctx,it.e,it.x,it.y,64));
      rr(ctx,g.x-120,790,240,34,16,'#c49a6c');
      txt(ctx,`Caught: ${g.caught}`,60,60,42,'#2b2340','left'); txt(ctx,g.msg,800,60,32);
    },
    score(g){ return Math.min(1,g.caught/Math.max(10,g.good*.85)); },
    result(g){ return `You caught ${g.caught} snacks (and ${g.socks} sock${g.socks===1?'':'s'}).`; } },

  batting:{ title:'Winter Tournament: Final Inning', how:'The rival school\'s ace is pitching. Click (or press Space) to swing when the ball reaches the glowing zone. 8 pitches. Score 5 runs to win!', dur:999, base:0,
    init(g){ g.pitch=0; g.pts=0; g.ball=null; g.wait=1.2; g.msg='Get ready...'; g.swing=0; g.log=[]; },
    update(g,dt){ g.swing=Math.max(0,g.swing-dt);
      if(!g.ball){ g.wait-=dt; if(g.wait<=0){ if(g.pitch>=8){ g.over=true; return; } g.ball={x:1300,v:rnd(900,1500),done:false}; g.pitch++; } return; }
      g.ball.x-=g.ball.v*dt;
      if(g.ball.x<250 && !g.ball.done){ g.ball.done=true; g.msg='Strike!'; g.log.push('✖'); }
      if(g.ball.x<150 || g.ball.hitT>0.9){ g.ball=null; g.wait=1.1; }
      if(g.ball&&g.ball.hit){ g.ball.hitT=(g.ball.hitT||0)+dt; } },
    click(g){ if(!g.ball||g.ball.done) return; g.swing=.25; const d=Math.abs(g.ball.x-425);
      if(d<25){ g.pts+=2; g.msg='HOME RUN!'; g.log.push('★'); g.ball.done=true; g.ball.hit=true; }
      else if(d<65){ g.pts+=1; g.msg='Base hit!'; g.log.push('●'); g.ball.done=true; g.ball.hit=true; }
      else { g.msg=g.ball.x>425?'Too early!':'Too late!'; g.log.push('✖'); g.ball.done=true; } },
    draw(g,ctx){
      ctx.fillStyle='#ffd9a8';ctx.fillRect(0,0,1600,900); rr(ctx,0,520,1600,380,0,'#7fcf6e');
      ctx.fillStyle='rgba(255,201,77,.45)';ctx.beginPath();ctx.ellipse(425,560,65,90,0,0,7);ctx.fill(); ctx.fillStyle='rgba(46,158,91,.5)';ctx.beginPath();ctx.ellipse(425,560,25,70,0,0,7);ctx.fill();
      chibi(ctx,1350,520,'#1b1612','#d2343f',1.4,'#c99a6e'); txt(ctx,'Rival ace',1350,640,26);
      chibi(ctx,300,520,'#3b2a1e','#2c3e78',1.4);
      ctx.save();ctx.translate(330,500);ctx.rotate(g.swing>0?-0.2:-1.6);ctx.fillStyle='#c49a6c';ctx.lineWidth=4;ctx.strokeStyle='#2b2340';ctx.beginPath();ctx.roundRect(0,-10,150,20,10);ctx.fill();ctx.stroke();ctx.restore();
      if(g.ball){ const y=g.ball.hit?560-(g.ball.hitT||0)*900:560, x=g.ball.hit?g.ball.x+(g.ball.hitT||0)*1400:g.ball.x; ctx.fillStyle='#fff';ctx.lineWidth=4;ctx.strokeStyle='#2b2340';ctx.beginPath();ctx.arc(x,y,18,0,7);ctx.fill();ctx.stroke(); }
      txt(ctx,`Runs: ${g.pts} / 5   Pitch ${Math.min(g.pitch,8)} of 8`,60,60,40,'#2b2340','left'); txt(ctx,g.log.join(' '),60,120,40,'#2b2340','left'); txt(ctx,g.msg,800,300,56);
    },
    score(g){ return Math.min(1,g.pts/8); }, win(g){ return g.pts>=5; },
    result(g){ return g.pts>=5?`You scored ${g.pts} runs. WidR WINS!`:`You scored ${g.pts} runs. So close.`; } },

  skate:{ title:'Ice Skating', how:'Glide around the rink and collect the stars. Steer with the mouse or arrow keys. Watch out for Fionn, he cannot stop.', dur:30, base:0,
    init(g){ g.p={x:800,y:600,vx:0,vy:0}; g.f={x:500,y:350,vx:260,vy:180}; g.stars=[]; g.got=0; g.fall=0; g.falls=0; g.msg=''; },
    inRink(x,y){ return ((x-800)/690)**2+((y-470)/330)**2<1; },
    update(g,dt){ const p=g.p;
      if(g.fall>0){ g.fall-=dt; p.vx*=.9; p.vy*=.9; }
      else { let ax=0,ay=0; if(g.keys.ArrowLeft)ax-=1; if(g.keys.ArrowRight)ax+=1; if(g.keys.ArrowUp)ay-=1; if(g.keys.ArrowDown)ay+=1;
        if(!ax&&!ay&&g.mx!=null){ const dx=g.mx-p.x, dy=g.my-p.y, d=Math.hypot(dx,dy); if(d>20){ax=dx/d;ay=dy/d;} }
        p.vx+=ax*900*dt; p.vy+=ay*900*dt; }
      p.vx*=Math.pow(.55,dt); p.vy*=Math.pow(.55,dt); const sp=Math.hypot(p.vx,p.vy); if(sp>620){p.vx*=620/sp;p.vy*=620/sp;}
      p.x+=p.vx*dt; p.y+=p.vy*dt; if(!this.inRink(p.x,p.y)){ p.x-=p.vx*dt*1.5; p.y-=p.vy*dt*1.5; p.vx*=-.6; p.vy*=-.6; }
      const f=g.f; f.x+=f.vx*dt; f.y+=f.vy*dt; if(!this.inRink(f.x,f.y)){ f.x-=f.vx*dt*2; f.y-=f.vy*dt*2; f.vx=-f.vx+rnd(-60,60); f.vy=-f.vy+rnd(-60,60); }
      if(g.fall<=0 && Math.hypot(p.x-f.x,p.y-f.y)<80){ g.fall=1.4; g.falls++; g.msg='"THE ICE IS RIGGED!" — Fionn, crashing into you'; }
      while(g.stars.length<3){ let x,y; do{ x=rnd(160,1440); y=rnd(170,770);}while(!this.inRink(x,y)); g.stars.push({x,y}); }
      g.stars=g.stars.filter(s=>{ if(Math.hypot(s.x-p.x,s.y-p.y)<55){ g.got++; g.msg='✦'; return false; } return true; }); },
    draw(g,ctx){
      ctx.fillStyle='#dff1ff';ctx.fillRect(0,0,1600,900);
      ctx.fillStyle='#e9f7ff';ctx.lineWidth=6;ctx.strokeStyle='#2b2340';ctx.beginPath();ctx.ellipse(800,470,690,330,0,0,7);ctx.fill();ctx.stroke();
      ctx.strokeStyle='#a9d6f5';ctx.lineWidth=4;for(let i=0;i<4;i++){ctx.beginPath();ctx.ellipse(800,470,560-i*120,250-i*55,0,0,7);ctx.stroke();}
      g.stars.forEach(s=>txt(ctx,'⭐',s.x,s.y,56));
      chibi(ctx,g.f.x,g.f.y,'#16131a','#2e9e5b',1.05,'#f8dfcf'); txt(ctx,'Fionn',g.f.x,g.f.y+70,22);
      ctx.save(); if(g.fall>0){ctx.translate(g.p.x,g.p.y);ctx.rotate(1.4);ctx.translate(-g.p.x,-g.p.y);} chibi(ctx,g.p.x,g.p.y,'#3b2a1e','#ff6f9f',1.05); ctx.restore();
      txt(ctx,`Stars: ${g.got}   Falls: ${g.falls}`,60,60,40,'#2b2340','left'); txt(ctx,g.msg,800,860,30);
    },
    score(g){ return Math.min(1,g.got/14); },
    result(g){ return `You collected ${g.got} stars and fell ${g.falls} time${g.falls===1?'':'s'}.`; } },
};

// Called by the story: {mini:'pancake'} → plays, then stores G.mini = {pct, pay, win, text} and continues.
function startMini(kind){
  const M=MINIS[kind], wrap=document.createElement('div');
  wrap.id='mini'; wrap.style.cssText='position:absolute;inset:0;z-index:13;background:#fff8ee;display:flex;align-items:center;justify-content:center';
  const cv=document.createElement('canvas'); cv.width=1600; cv.height=900; cv.style.cssText='width:100%;height:100%;display:block;touch-action:none';
  wrap.appendChild(cv); $('stage').appendChild(wrap); const ctx=cv.getContext('2d');
  const g={t:0,keys:{},mx:null,my:null}; M.init(g); let state='intro', last=0, raf=0;
  const toCanvas=e=>{ const r=cv.getBoundingClientRect(); return [(e.clientX-r.left)/r.width*1600,(e.clientY-r.top)/r.height*900]; };
  const finish=()=>{ state='done'; cancelAnimationFrame(raf);
    const pct=M.score(g), win=M.win?M.win(g):pct>=.5, money=M.base?pay(M.base,pct):0;
    G.mini={pct,win,pay:money,text:M.result(g)}; drawCard(); };
  const btn={x:600,y:640,w:400,h:110};
  function drawCard(){
    ctx.fillStyle='#fff8ee';ctx.fillRect(0,0,1600,900);
    rr(ctx,200,90,1200,720,40,'#fff');
    if(state==='intro'){ txt(ctx,M.title,800,200,70,'#ff6f9f'); wrapText(M.how,800,330,1000,40);
      txt(ctx,M.dur<900?`Time: ${M.dur} seconds`+(M.base?` · Pay: up to €${M.base}`:''):'',800,530,34,'#7a6e8f'); }
    else { txt(ctx,'Done!',800,200,80,'#ff6f9f'); txt(ctx,G.mini.text,800,320,40);
      const stars=Math.round(G.mini.pct*5); txt(ctx,'★'.repeat(stars)+'☆'.repeat(5-stars),800,420,70,'#ffc94d');
      if(M.base) txt(ctx,`You earned €${G.mini.pay}`,800,520,50,'#2e9e5b'); }
    rr(ctx,btn.x,btn.y,btn.w,btn.h,30,'#ff6f9f'); txt(ctx,state==='intro'?'Start':'Continue',800,btn.y+btn.h/2,48,'#fff');
  }
  function wrapText(s,x,y,maxW,size){ ctx.font=`${size}px ${MINI_FONT}`; const words=s.split(' '); let line='', yy=y;
    for(const w of words){ const t=line?line+' '+w:w; if(ctx.measureText(t).width>maxW){ txt(ctx,line,x,yy,size); line=w; yy+=size*1.35; } else line=t; } txt(ctx,line,x,yy,size); }
  function loop(ts){ if(!wrap.isConnected || !G) return; const dt=Math.min(.05,(ts-(last||ts))/1000); last=ts; g.t+=dt;
    M.update(g,dt); M.draw(g,ctx);
    if(M.dur<900){ const left=Math.max(0,M.dur-g.t); rr(ctx,1240,30,320,60,30,'#fff'); txt(ctx,`⏱ ${left.toFixed(0)}s`,1400,60,38); if(left<=0) return finish(); }
    if(g.over) return finish();
    raf=requestAnimationFrame(loop); }
  const inBtn=(x,y)=>x>btn.x&&x<btn.x+btn.w&&y>btn.y&&y<btn.y+btn.h;
  cv.onpointerdown=e=>{ e.stopPropagation(); const [x,y]=toCanvas(e);
    if(state==='intro'){ if(inBtn(x,y)){ state='play'; g.t=0; last=0; raf=requestAnimationFrame(loop); } return; }
    if(state==='done'){ if(inBtn(x,y)){ cleanup(); wrap.remove(); step(); } return; }
    if(M.click) M.click(g,x,y); };
  cv.onpointermove=e=>{ const [x,y]=toCanvas(e); g.mx=x; g.my=y; };
  const kd=e=>{ if(!document.getElementById('mini')) return; g.keys[e.key]=true; if(state==='play'&&(e.key===' '||e.key==='Enter')){ e.preventDefault(); e.stopPropagation(); if(M.click) M.click(g,g.mx||0,g.my||0); } };
  const ku=e=>{ g.keys[e.key]=false; };
  document.addEventListener('keydown',kd,true); document.addEventListener('keyup',ku,true);
  const cleanup=()=>{ document.removeEventListener('keydown',kd,true); document.removeEventListener('keyup',ku,true); };
  drawCard();
}
// For the automatic tester: pretend to play.
function fakeMini(kind){ const M=MINIS[kind], pct=Math.random(); G.mini={pct,win:pct>=.5,pay:M.base?pay(M.base,pct):0,text:'(test)'}; }
