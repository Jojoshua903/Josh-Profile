'use strict';
const TEAM = {blue:'#2f7dff', red:'#ff4b3e'}, INK = '#1d1a2f';

function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
function star(x,y,n,ro,ri,rot=0){ctx.beginPath();for(let i=0;i<n*2;i++){const r=i%2?ri:ro,a=rot+i*Math.PI/n-Math.PI/2;ctx.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r)}ctx.closePath()}
function gemShape(x,y,s){ctx.beginPath();ctx.moveTo(x,y-s);ctx.lineTo(x+s*.8,y-s*.25);ctx.lineTo(x,y+s);ctx.lineTo(x-s*.8,y-s*.25);ctx.closePath()}
function drawGem(x,y,s){gemShape(x,y,s);ctx.fillStyle='#b05cff';ctx.fill();ctx.lineWidth=2.5;ctx.strokeStyle=INK;ctx.stroke();ctx.fillStyle='rgba(255,255,255,.55)';ctx.beginPath();ctx.moveTo(x,y-s*.75);ctx.lineTo(x+s*.35,y-s*.25);ctx.lineTo(x,y-s*.05);ctx.closePath();ctx.fill()}
function label(txt,x,y,size,fill,stroke=INK,lw=4){ctx.font=`900 ${size}px "Arial Black","Trebuchet MS",sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';ctx.lineWidth=lw;ctx.strokeStyle=stroke;ctx.strokeText(txt,x,y);ctx.fillStyle=fill;ctx.fillText(txt,x,y)}

function render(){
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.fillStyle='#8fd9e6';ctx.fillRect(0,0,W,H);
  const s=S.scale,shx=S.shake?rnd(-S.shake,S.shake):0,shy=S.shake?rnd(-S.shake,S.shake):0,time=performance.now()/1000;
  ctx.setTransform(DPR*s,0,0,DPR*s,(-S.cam.x*s+shx)*DPR,(-S.cam.y*s+shy)*DPR);
  const c0=Math.max(0,Math.floor(S.cam.x/T)-1),c1=Math.min(COLS-1,Math.ceil((S.cam.x+W/s)/T)),r0=Math.max(0,Math.floor(S.cam.y/T)-1),r1=Math.min(ROWS-1,Math.ceil((S.cam.y+H/s)/T)+1);

  // floor, base zones, water
  ctx.fillStyle='#f6dfab';ctx.fillRect(0,0,MW,MH);
  for(let r=r0;r<=r1;r++)for(let c=c0;c<=c1;c++){
    const x=c*T,y=r*T,ch=grid[r][c];
    if((r+c)%2){ctx.fillStyle='#f0d59a';ctx.fillRect(x,y,T,T)}
    if(ch==='w'){ctx.fillStyle='#4fc9de';ctx.fillRect(x,y,T,T);ctx.strokeStyle='rgba(255,255,255,.6)';ctx.lineWidth=3;ctx.beginPath();const o=Math.sin(time*2+c+r)*5;ctx.moveTo(x+8,y+T/2+o);ctx.quadraticCurveTo(x+T/2,y+T/2-8+o,x+T-8,y+T/2+o);ctx.stroke()}
  }
  if(MODE!=='showdown'){
    ctx.fillStyle='rgba(47,125,255,.13)';ctx.fillRect(0,MH-T*3,MW,T*3);
    ctx.fillStyle='rgba(255,75,62,.12)';ctx.fillRect(0,0,MW,T*3);
  }

  // gem mine
  if(MODE==='gem'){
    ctx.beginPath();ctx.arc(MW/2,MH/2,40,0,7);ctx.fillStyle='#4a2c6b';ctx.fill();ctx.lineWidth=5;ctx.strokeStyle=INK;ctx.stroke();
    ctx.beginPath();ctx.arc(MW/2,MH/2,26,0,7);ctx.fillStyle='#6e45a0';ctx.fill();
    drawGem(MW/2,MH/2-2+Math.sin(time*3)*2,10);
  }

  // walls and power cube boxes (row order for a little depth)
  const flashing=new Set(S.FX.filter(f=>f.type==='crateHit').map(f=>f.r*1000+f.c));
  for(let r=r0;r<=r1;r++)for(let c=c0;c<=c1;c++){
    const x=c*T,y=r*T,ch=grid[r][c];
    if(ch==='#'){
      ctx.fillStyle='#a5452a';ctx.fillRect(x,y+2,T,T-2);
      ctx.fillStyle='#ec8a5c';ctx.fillRect(x,y-10,T,T-4);
      ctx.strokeStyle=INK;ctx.lineWidth=2.5;ctx.strokeRect(x,y-10,T,T+10);
      ctx.fillStyle='rgba(255,255,255,.28)';ctx.fillRect(x+6,y-5,T-12,5);
      ctx.fillStyle='rgba(0,0,0,.12)';ctx.fillRect(x+T/2-1,y+8,2,T-26);
    }
    else if(ch==='c'){
      const hit=flashing.has(r*1000+c),hp=(S.crate[r*1000+c]??2400)/2400,i=4;
      ctx.fillStyle='#8a5a2b';ctx.fillRect(x+i,y+2,T-i*2,T-i-2);
      ctx.fillStyle=hit?'#fff':'#d79b55';ctx.fillRect(x+i,y-8,T-i*2,T-i-4);
      ctx.strokeStyle=INK;ctx.lineWidth=2.5;ctx.strokeRect(x+i,y-8,T-i*2,T-i+6);
      ctx.strokeStyle='#8a5a2b';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x+i+4,y-4);ctx.lineTo(x+T-i-4,y+T-i-12);ctx.moveTo(x+T-i-4,y-4);ctx.lineTo(x+i+4,y+T-i-12);ctx.stroke();
      drawCube(x+T/2,y+T/2-14,8);
      if(hp<1){rr(x+8,y+T-14,T-16,7,3);ctx.fillStyle=INK;ctx.fill();rr(x+9,y+T-13,(T-18)*Math.max(0,hp),5,2);ctx.fillStyle='#7be36b';ctx.fill()}
    }
  }

  // zones: gravity wells, syrup, healing labs, speakers
  for(const z of S.Z){
    const fade=Math.min(1,z.t*2);
    if(z.kind==='syrup'){
      ctx.globalAlpha=.7*fade;ctx.fillStyle='#d98a1e';ctx.beginPath();
      for(let i=0;i<16;i++){const a=i/16*6.283,r=z.r*(.9+.1*Math.sin(i*2.7+time));ctx.lineTo(z.x+Math.cos(a)*r,z.y+Math.sin(a)*r)}
      ctx.closePath();ctx.fill();ctx.globalAlpha=.5*fade;ctx.fillStyle='#ffd27a';ctx.beginPath();ctx.ellipse(z.x-30,z.y-30,30,14,-.5,0,7);ctx.fill();
    }
    else if(z.kind==='heal'){
      ctx.globalAlpha=(.22+.06*Math.sin(time*6))*fade;ctx.fillStyle='#3fbf5a';ctx.beginPath();ctx.arc(z.x,z.y,z.r,0,7);ctx.fill();
      ctx.globalAlpha=.8*fade;ctx.strokeStyle='#3fbf5a';ctx.lineWidth=4;ctx.setLineDash([14,10]);ctx.stroke();ctx.setLineDash([]);
      for(let i=0;i<5;i++){const a=i*1.257+time*.6,r=z.r*.55,x=z.x+Math.cos(a)*r,y=z.y+Math.sin(a)*r-((time*30+i*20)%40);ctx.fillStyle='#fff';ctx.fillRect(x-7,y-2.5,14,5);ctx.fillRect(x-2.5,y-7,5,14)}
    }
    else if(z.kind==='speaker'){
      ctx.globalAlpha=fade;ctx.save();ctx.translate(z.x,z.y);
      ctx.fillStyle='rgba(0,0,0,.2)';ctx.beginPath();ctx.ellipse(0,22,26,9,0,0,7);ctx.fill();
      rr(-22,-28,44,52,8);ctx.fillStyle=colOf(z.src);ctx.fill();ctx.lineWidth=3;ctx.strokeStyle=INK;ctx.stroke();
      const pump=1+.12*Math.max(0,Math.sin(time*14));
      ctx.beginPath();ctx.arc(0,4,13*pump,0,7);ctx.fillStyle=INK;ctx.fill();ctx.beginPath();ctx.arc(0,4,5,0,7);ctx.fillStyle='#ffb4d9';ctx.fill();
      ctx.beginPath();ctx.arc(0,-18,5,0,7);ctx.fillStyle=INK;ctx.fill();
      ctx.restore();
    }
    else{
      ctx.save();ctx.translate(z.x,z.y);ctx.rotate(time*4);
      ctx.globalAlpha=.25+.1*Math.sin(time*10);ctx.fillStyle='#6c3fd6';ctx.beginPath();ctx.arc(0,0,z.r,0,7);ctx.fill();
      ctx.globalAlpha=.9;ctx.strokeStyle='#fff';ctx.lineWidth=3;
      for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(0,0,z.r*(.35+i*.22),i*2,i*2+2.2);ctx.stroke()}
      ctx.restore();
    }
    ctx.globalAlpha=1;
  }

  // loose gems
  for(const g of S.G){const bob=g.t<.4?Math.sin(g.t/.4*Math.PI)*30:Math.sin(time*4+g.tx)*2;ctx.fillStyle='rgba(0,0,0,.15)';ctx.beginPath();ctx.ellipse(g.x,g.y+10,9,4,0,0,7);ctx.fill();drawGem(g.x,g.y-bob,10)}
  // loose power cubes
  for(const g of S.C){const bob=g.t<.4?Math.sin(g.t/.4*Math.PI)*36:Math.sin(time*4+g.tx)*3;ctx.fillStyle='rgba(0,0,0,.15)';ctx.beginPath();ctx.ellipse(g.x,g.y+12,11,4,0,0,7);ctx.fill();drawCube(g.x,g.y-bob,12)}

  // aim guide
  const me=S.me,view=S.view||me;
  if(!me.dead&&running&&!(S.inter>0)&&superAim)drawSuperAim(me,time);
  else if(!me.dead&&running&&!(S.inter>0)){
    const d=me.def,m=mouseWorld();ctx.save();
    ctx.globalAlpha=.32;ctx.fillStyle=me.superC>=1?'#ffd23f':'#ffffff';ctx.strokeStyle=INK;
    if(d.id==='daniel'||d.id==='maat'){let dx=m.x-me.x,dy=m.y-me.y,k=Math.hypot(dx,dy);if(k>d.range){dx*=d.range/k;dy*=d.range/k}ctx.beginPath();ctx.arc(me.x+dx,me.y+dy,75,0,7);ctx.fill()}
    else if(d.id==='nathan'){ctx.beginPath();ctx.moveTo(me.x,me.y);ctx.arc(me.x,me.y,d.range,me.aim-1,me.aim+1);ctx.closePath();ctx.fill()}
    else if(d.id==='toon'){ctx.beginPath();ctx.moveTo(me.x,me.y);ctx.arc(me.x,me.y,d.range,me.aim-.3,me.aim+.3);ctx.closePath();ctx.fill()}
    else{ctx.translate(me.x,me.y);ctx.rotate(me.aim);const wd=d.id==='grumble'||d.id==='reshman'||d.id==='joep'?40:d.id==='luur'?32:18;rr(me.r,-wd/2,d.range-me.r,wd,wd/2);ctx.fill()}
    ctx.restore();ctx.globalAlpha=1;
  }

  // brawlers
  const vis=S.B.filter(b=>!b.dead&&visibleTo(b,me.team)).sort((a,b)=>a.y-b.y);
  for(const b of vis)drawBrawler(b,time);

  // projectiles
  for(const p of S.P)drawProj(p,time);

  // bushes on top
  for(let r=r0;r<=r1;r++)for(let c=c0;c<=c1;c++)if(grid[r][c]==='b'){
    const x=c*T+T/2,y=r*T+T/2,near=!view.dead&&Math.hypot(view.x-x,view.y-y)<110;
    ctx.globalAlpha=near?.45:1;
    for(const [ox,oy,rad,col] of [[-12,8,18,'#2f8f43'],[12,8,18,'#2f8f43'],[0,-6,21,'#47b85a'],[-14,-10,13,'#5fcf6d'],[14,-8,14,'#5fcf6d']]){
      ctx.beginPath();ctx.arc(x+ox,y+oy,rad,0,7);ctx.fillStyle=col;ctx.fill();ctx.lineWidth=2.5;ctx.strokeStyle='#1f5e2c';ctx.stroke();
    }
    ctx.globalAlpha=1;
  }

  // poison gas: everything outside the safe circle
  if(S.gas!==null){
    ctx.save();ctx.beginPath();ctx.rect(-200,-200,MW+400,MH+400);ctx.arc(MW/2,MH/2,S.gas,0,7,true);
    ctx.fillStyle='rgba(76,201,92,.42)';ctx.fill();ctx.clip();
    ctx.fillStyle='rgba(40,140,60,.35)';
    for(let i=0;i<40;i++){const a=i*2.4+time*.15,rad=S.gas+30+((i*53)%260),bx=MW/2+Math.cos(a)*rad,by=MH/2+Math.sin(a)*rad;ctx.beginPath();ctx.arc(bx,by,26+(i%5)*8+Math.sin(time*2+i)*5,0,7);ctx.fill()}
    ctx.restore();
    ctx.beginPath();ctx.arc(MW/2,MH/2,S.gas,0,7);ctx.strokeStyle='#1f7a35';ctx.lineWidth=6;ctx.setLineDash([22,14]);ctx.lineDashOffset=-time*30;ctx.stroke();ctx.setLineDash([]);
  }
  for(const f of S.FX){
    const k=f.t/f.life;
    if(f.type==='ring'){ctx.globalAlpha=1-k;ctx.lineWidth=8*(1-k)+2;ctx.strokeStyle=f.col;ctx.beginPath();ctx.arc(f.x,f.y,f.r*(.4+.6*k),0,7);ctx.stroke();ctx.globalAlpha=(1-k)*.25;ctx.fillStyle=f.col;ctx.fill()}
    else if(f.type==='swing'){ctx.globalAlpha=(1-k)*.8;ctx.fillStyle=f.col;ctx.beginPath();ctx.moveTo(f.x,f.y);ctx.arc(f.x,f.y,f.r,f.a-1+k*.4,f.a+1-k*.4);ctx.closePath();ctx.fill()}
    else if(f.type==='ghost'){ctx.globalAlpha=(1-k)*.5;ctx.fillStyle=f.col;ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,7);ctx.fill()}
    else if(f.type==='chip'){ctx.globalAlpha=1-k;ctx.fillStyle=f.col||'#ec8a5c';ctx.fillRect(f.x-5,f.y-5,10,10);ctx.strokeStyle=INK;ctx.lineWidth=1.5;ctx.strokeRect(f.x-5,f.y-5,10,10)}
    ctx.globalAlpha=1;
  }
  for(const f of S.FX)if(f.type==='num'){const k=f.t/f.life;ctx.globalAlpha=1-k*k;label(String(f.v),f.x,f.y-k*34,18+(1-k)*6,f.col);ctx.globalAlpha=1}
}

// Super aim preview while E is held: shape matches each brawler's Super
const SUPER_AIM={josh:{line:960},nathan:{line:760,w:50},reshman:{line:322,w:52},
  daniel:{circle:150,reach:448},guiseppe:{circle:130,reach:380},otis:{circle:180,reach:496},grumble:{self:230},milo:{self:280},
  joep:{circle:40,reach:320},cas:{circle:160,reach:480},luur:{self:45},toon:{self:95},maat:{circle:170,reach:448}};
SUPER_AIM.josh.w=44;
function drawSuperAim(me,time){
  const g=SUPER_AIM[me.def.id],m=mouseWorld(),ready=me.superC>=1;
  ctx.save();ctx.globalAlpha=ready?.42+.08*Math.sin(time*10):.18;
  ctx.fillStyle=ready?'#ffd23f':'#9a96ad';ctx.strokeStyle=INK;ctx.lineWidth=3;ctx.setLineDash([10,8]);
  if(g.line){ctx.translate(me.x,me.y);ctx.rotate(me.aim);rr(me.r,-g.w/2,g.line-me.r,g.w,g.w/2);ctx.fill();ctx.stroke()}
  else if(g.circle){let dx=m.x-me.x,dy=m.y-me.y;const k=Math.hypot(dx,dy);if(k>g.reach){dx*=g.reach/k;dy*=g.reach/k}
    ctx.beginPath();ctx.moveTo(me.x,me.y);ctx.lineTo(me.x+dx,me.y+dy);ctx.stroke();
    ctx.beginPath();ctx.arc(me.x+dx,me.y+dy,g.circle,0,7);ctx.fill();ctx.stroke()}
  else{ctx.beginPath();ctx.arc(me.x,me.y,g.self,0,7);ctx.fill();ctx.stroke()}
  ctx.restore();
  label(ready?'RELEASE E TO FIRE':'SUPER NOT CHARGED',me.x,me.y+me.r+26,12,ready?'#ffd23f':'#fff',INK,3.5);
}

function drawBrawler(b,time){
  const d=b.def,z=b.z||0,y=b.y-z,hidden=b.invis>0||(inBush(b)&&b.lastAtk>.8);
  ctx.globalAlpha=hidden?.5:1;
  ctx.fillStyle='rgba(0,0,0,.2)';ctx.beginPath();ctx.ellipse(b.x,b.y+b.r*.75,b.r*(1-z/250),b.r*.4,0,0,7);ctx.fill();
  const col=colOf(b);
  ctx.beginPath();ctx.arc(b.x,y,b.r+5,0,7);ctx.fillStyle=col;ctx.fill();ctx.lineWidth=3;ctx.strokeStyle=INK;ctx.stroke();
  ctx.beginPath();ctx.arc(b.x,y,b.r,0,7);ctx.fillStyle=b.flash>0?'#ffffff':d.color;ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.arc(b.x,y+b.r*.25,b.r*.9,.15*Math.PI,.85*Math.PI);ctx.strokeStyle='rgba(0,0,0,.15)';ctx.lineWidth=5;ctx.stroke();
  // facing nub
  const nx=b.x+Math.cos(b.aim)*(b.r+6),ny=y+Math.sin(b.aim)*(b.r+6);
  ctx.beginPath();ctx.arc(nx,ny,6,0,7);ctx.fillStyle='#fff';ctx.fill();ctx.lineWidth=2.5;ctx.strokeStyle=INK;ctx.stroke();
  ctx.font=`${Math.round(b.r*1.15)}px "Apple Color Emoji","Segoe UI Emoji",sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(d.emoji,b.x,y+2);
  // hp + name
  const bw=60,bx=b.x-bw/2,by=y-b.r-22;
  rr(bx-2,by-2,bw+4,12,6);ctx.fillStyle=INK;ctx.fill();
  rr(bx,by,Math.max(0,bw*b.hp/maxHp(b)),8,4);ctx.fillStyle=col;ctx.fill();
  label(b.isPlayer?'YOU':d.name,b.x,by-12,12,'#fff',INK,3.5);
  if(b.gems>0){drawGem(b.x+bw/2+12,by+2,8);label(String(b.gems),b.x+bw/2+26,by+3,13,'#fff',INK,3.5)}
  if(b.cubes>0){drawCube(b.x-bw/2-13,by+3,7);label(String(b.cubes),b.x-bw/2-27,by+3,13,'#fff',INK,3.5)}
  if(b.superC>=1&&!b.isPlayer){ctx.beginPath();ctx.arc(b.x,y,b.r+10+Math.sin(time*8)*2,0,7);ctx.strokeStyle='rgba(255,210,63,.8)';ctx.lineWidth=3;ctx.stroke()}
  if(b.stun>0)for(let i=0;i<3;i++){const a=time*5+i*2.1;ctx.fillStyle='#ffd23f';star(b.x+Math.cos(a)*b.r,y-b.r-4+Math.sin(a)*5,5,6,3);ctx.fill()}
  if(b.slow>0){ctx.fillStyle='#d98a1e';for(let i=0;i<3;i++){const dx=(i-1)*12,dy=b.r*.6+((time*40+i*9)%14);ctx.beginPath();ctx.ellipse(b.x+dx,y+dy,4,6,0,0,7);ctx.fill()}}
  if(b.moons>0)for(let i=0;i<3;i++){
    const a=b.moonA+i*2.094,mx=b.x+Math.cos(a)*95,my=y+Math.sin(a)*95;
    ctx.globalAlpha=.25;ctx.strokeStyle='#5b5f9e';ctx.lineWidth=2;ctx.beginPath();ctx.arc(b.x,y,95,0,7);ctx.stroke();ctx.globalAlpha=hidden?.5:1;
    drawCrescent(mx,my,16,a+Math.PI/2);
  }
  ctx.globalAlpha=1;
}

function drawCube(x,y,s){
  ctx.lineWidth=2;ctx.strokeStyle=INK;
  ctx.beginPath();ctx.moveTo(x,y-s);ctx.lineTo(x+s,y-s*.5);ctx.lineTo(x,y);ctx.lineTo(x-s,y-s*.5);ctx.closePath();ctx.fillStyle='#b8ff8a';ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.moveTo(x-s,y-s*.5);ctx.lineTo(x,y);ctx.lineTo(x,y+s);ctx.lineTo(x-s,y+s*.5);ctx.closePath();ctx.fillStyle='#5fcf4d';ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.moveTo(x+s,y-s*.5);ctx.lineTo(x,y);ctx.lineTo(x,y+s);ctx.lineTo(x+s,y+s*.5);ctx.closePath();ctx.fillStyle='#2f9e3e';ctx.fill();ctx.stroke();
}

function drawCrescent(x,y,r,rot){
  ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.beginPath();ctx.arc(0,0,r,0,7);ctx.arc(r*.35,-r*.2,r*.65,0,7,true);
  ctx.fillStyle='#fff3a0';ctx.fill('evenodd');ctx.lineWidth=2.5;ctx.strokeStyle=INK;ctx.stroke();ctx.restore();
}

function drawProj(p,time){
  ctx.lineWidth=2.5;ctx.strokeStyle=INK;
  if(p.lob){
    ctx.fillStyle='rgba(0,0,0,.18)';ctx.beginPath();ctx.ellipse(p.x,p.y,12,5,0,0,7);ctx.fill();
    const ZR={well:[180,'#6c3fd6'],syrup:[160,'#d98a1e'],heal:[170,'#3fbf5a'],flask:[p.r,'#3fbf5a']}[p.kind]||[p.r,'#ff4b3e'];
    ctx.globalAlpha=.25;ctx.strokeStyle=ZR[1];ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.tx,p.ty,ZR[0],0,7);ctx.stroke();ctx.globalAlpha=1;ctx.strokeStyle=INK;ctx.lineWidth=2.5;
    const y=p.y-p.h;
    if(p.kind==='well'||p.kind==='syrup'){ctx.beginPath();ctx.arc(p.x,y,14,0,7);ctx.fillStyle=ZR[1];ctx.fill();ctx.stroke()}
    else if(p.kind==='flask'||p.kind==='heal'){const s=p.kind==='heal'?1.4:1;ctx.save();ctx.translate(p.x,y);ctx.rotate(p.t*9);ctx.beginPath();ctx.arc(0,4*s,10*s,0,7);ctx.fillStyle='#7be36b';ctx.fill();ctx.stroke();ctx.fillStyle='#e8f7ff';ctx.fillRect(-4*s,-12*s,8*s,9*s);ctx.strokeRect(-4*s,-12*s,8*s,9*s);ctx.restore()}
    else{const sz=p.kind==='bigc4'?26:16;ctx.save();ctx.translate(p.x,y);ctx.rotate(p.t*8);rr(-sz/2,-sz*.35,sz,sz*.7,3);ctx.fillStyle='#e23b3b';ctx.fill();ctx.stroke();ctx.fillStyle='#ffd23f';ctx.fillRect(-sz*.25,-3,sz*.5,6);ctx.restore()}
    return;
  }
  const a=Math.atan2(p.vy,p.vx);
  switch(p.kind){
    case 'bolt':star(p.x,p.y,5,11,5,p.spin);ctx.fillStyle='#ffd23f';ctx.fill();ctx.stroke();break;
    case 'bigstar':ctx.globalAlpha=.35;ctx.fillStyle='#fff3a0';ctx.beginPath();ctx.arc(p.x,p.y,32,0,7);ctx.fill();ctx.globalAlpha=1;star(p.x,p.y,5,24,11,p.spin);ctx.fillStyle='#ffd23f';ctx.fill();ctx.stroke();break;
    case 'shur':star(p.x,p.y,4,12,4,p.spin*1.5);ctx.fillStyle='#d6d9ea';ctx.fill();ctx.stroke();break;
    case 'tom':ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,7);ctx.fillStyle='#ff4b3e';ctx.fill();ctx.stroke();star(p.x,p.y-p.r+2,5,6,2);ctx.fillStyle='#3fbf5a';ctx.fill();break;
    case 'cookie':ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,7);ctx.fillStyle='#d9a066';ctx.fill();ctx.stroke();ctx.fillStyle='#5a3418';for(let i=0;i<4;i++){const q=p.spin*.4+i*1.6;ctx.beginPath();ctx.arc(p.x+Math.cos(q)*5,p.y+Math.sin(q)*5,2.2,0,7);ctx.fill()}break;
    case 'claw':ctx.save();ctx.translate(p.x,p.y);ctx.rotate(a);ctx.beginPath();ctx.moveTo(10,0);ctx.lineTo(-7,-7);ctx.lineTo(-3,0);ctx.lineTo(-7,7);ctx.closePath();ctx.fillStyle='#ff8a3d';ctx.fill();ctx.stroke();ctx.restore();break;
    case 'laser':ctx.lineCap='round';ctx.strokeStyle=INK;ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(p.x-Math.cos(a)*40,p.y-Math.sin(a)*40);ctx.lineTo(p.x,p.y);ctx.stroke();ctx.strokeStyle='#c9a8ff';ctx.lineWidth=5;ctx.stroke();ctx.lineCap='butt';break;
    case 'homer':ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,7);ctx.fillStyle='#fff';ctx.fill();ctx.lineWidth=3;ctx.stroke();ctx.strokeStyle='#e23b3b';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(p.x-p.r*1.1,p.y,p.r*.8,-.9+p.spin*0,.9);ctx.stroke();ctx.beginPath();ctx.arc(p.x+p.r*1.1,p.y,p.r*.8,Math.PI-.9,Math.PI+.9);ctx.stroke();break;
    case 'wave':{const g=1+Math.min(1,p.trav/p.range)*.8;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(a);ctx.lineCap='round';
      for(let i=0;i<3;i++){ctx.globalAlpha=1-i*.3;ctx.strokeStyle=INK;ctx.lineWidth=8;ctx.beginPath();ctx.arc(-i*12,0,p.r*g,-.9,.9);ctx.stroke();ctx.strokeStyle='#ffb4d9';ctx.lineWidth=4;ctx.stroke()}
      ctx.restore();ctx.globalAlpha=1;ctx.lineCap='butt';break}
    case 'pancake':ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.spin*1.4);ctx.beginPath();ctx.ellipse(0,0,p.r+3,p.r-2,0,0,7);ctx.fillStyle='#e9a94e';ctx.fill();ctx.stroke();ctx.beginPath();ctx.ellipse(-2,-1,p.r*.55,p.r*.35,0,0,7);ctx.fillStyle='#ffe18a';ctx.fill();ctx.restore();break;
    case 'bowl':ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,7);ctx.fillStyle='#2a3f8f';ctx.fill();ctx.lineWidth=3;ctx.stroke();ctx.fillStyle=INK;for(let i=0;i<3;i++){const q=p.spin*.7+i*.5;ctx.beginPath();ctx.arc(p.x+Math.cos(q)*6,p.y+Math.sin(q)*6,2.6,0,7);ctx.fill()}break;
    case 'moon':drawCrescent(p.x,p.y,p.r+2,a);break;
    case 'note':ctx.font='900 24px "Arial Black",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=4;ctx.strokeStyle=INK;ctx.strokeText('♪',p.x,p.y);ctx.fillStyle='#ffb4d9';ctx.fillText('♪',p.x,p.y);break;
  }
}

function head(b,x,y,r){
  ctx.globalAlpha=b.out?.35:1;
  ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fillStyle=b.def.color;ctx.fill();ctx.lineWidth=3;ctx.strokeStyle=INK;ctx.stroke();
  ctx.font=`${Math.round(r*1.1)}px "Apple Color Emoji","Segoe UI Emoji",sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(b.def.emoji,x,y+1);
  if(b.out){ctx.globalAlpha=1;ctx.strokeStyle='#ff4b3e';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x-r*.7,y-r*.7);ctx.lineTo(x+r*.7,y+r*.7);ctx.moveTo(x+r*.7,y-r*.7);ctx.lineTo(x-r*.7,y+r*.7);ctx.stroke()}
  ctx.globalAlpha=1;
}
function hud(){
  ctx.setTransform(DPR,0,0,DPR,0,0);
  const cx=W/2,me=S.me;
  if(MODE==='gem'){
    const bg=teamGems('blue'),rg=teamGems('red');
    rr(cx-160,12,124,48,16);ctx.fillStyle=TEAM.blue;ctx.fill();ctx.lineWidth=4;ctx.strokeStyle=INK;ctx.stroke();
    drawGem(cx-128,36,12);label(String(bg),cx-82,37,28,'#fff');
    rr(cx+36,12,124,48,16);ctx.fillStyle=TEAM.red;ctx.fill();ctx.stroke();
    drawGem(cx+68,36,12);label(String(rg),cx+114,37,28,'#fff');
    rr(cx-32,16,64,40,12);ctx.fillStyle='#fff';ctx.fill();ctx.stroke();
    const t=Math.max(0,Math.ceil(S.t));label(`${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`,cx,37,17,INK,'#fff',0);
    if(S.lead){
      const n=Math.ceil(S.cd),pulse=1+(S.cd%1)*.25;
      label(S.lead==='blue'?'YOUR TEAM WINS IN':'ENEMIES WIN IN',cx,80,14,'#fff');
      label(String(n),cx,118,44*pulse,S.lead==='blue'?'#ffc820':'#ff4b3e',INK,6);
    }
  }
  else if(MODE==='knockout'){
    for(const [team,side] of [['blue',-1],['red',1]]){
      const x0=cx+side*42+(side<0?-124:0);
      rr(x0,12,124,48,16);ctx.fillStyle=TEAM[team];ctx.fill();ctx.lineWidth=4;ctx.strokeStyle=INK;ctx.stroke();
      S.B.filter(b=>b.team===team).forEach((b,i)=>head(b,x0+24+i*38,36,15));
      for(let i=0;i<2;i++){const px=cx+side*(56+i*22);star(px,74,5,10,4.5);ctx.fillStyle=S.wins[team]>i?'#ffc820':'rgba(29,26,47,.35)';ctx.fill();ctx.lineWidth=2;ctx.strokeStyle=INK;ctx.stroke()}
    }
    rr(cx-34,16,68,40,12);ctx.fillStyle='#fff';ctx.fill();ctx.lineWidth=4;ctx.stroke();
    label('R'+S.round,cx,37,17,INK,'#fff',0);
  }
  else{
    const left=S.B.filter(b=>!b.out).length;
    rr(cx-110,12,220,48,16);ctx.fillStyle=INK;ctx.fill();ctx.lineWidth=4;ctx.strokeStyle=INK;ctx.stroke();
    ctx.font='22px "Apple Color Emoji","Segoe UI Emoji",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('💀',cx-80,37);
    label(`${left} BRAWLERS LEFT`,cx+14,37,15,'#fff',INK,0);
  }
  if(S.gas!==null&&S.gasWarn>0)label('THE GAS IS CLOSING IN!',cx,MODE==='knockout'?104:84,18,'#7be36b',INK,5);
  const dcol={easy:'#3fbf5a',normal:'#2f7dff',hard:'#ff9a2e',insane:'#ff4b3e'}[difficulty],dx=MODE==='showdown'?cx+128:cx+176;
  rr(dx,22,82,28,10);ctx.fillStyle=dcol;ctx.fill();ctx.lineWidth=3;ctx.strokeStyle=INK;ctx.stroke();
  label(DIFF[difficulty].label.toUpperCase(),dx+41,37,11,'#fff',INK,3);
  // kill feed
  S.feed.forEach((f,i)=>{const y=24+i*30;ctx.globalAlpha=Math.min(1,f.t);rr(14,y-12,310,26,10);ctx.fillStyle='rgba(255,255,255,.9)';ctx.fill();ctx.lineWidth=2.5;ctx.strokeStyle=INK;ctx.stroke();
    ctx.font='800 12px "Trebuchet MS",sans-serif';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillStyle=f.ca;ctx.fillText(f.a,24,y+1);const w=ctx.measureText(f.a).width;ctx.fillStyle=INK;ctx.fillText(' KO\'d ',24+w,y+1);const w2=ctx.measureText(' KO\'d ').width;ctx.fillStyle=f.cb;ctx.fillText(f.b,24+w+w2,y+1);ctx.globalAlpha=1});
  // round / match banner
  if(S.banner){const b=S.banner,k=1-b.t/b.dur,sc=k<.15?.6+k/.15*.4:1;ctx.globalAlpha=Math.min(1,b.t*3);label(b.text,cx,H*.38,Math.round(64*sc),b.col,INK,8);ctx.globalAlpha=1}
  if(me.out&&MODE==='knockout'){ctx.fillStyle='rgba(255,244,220,.25)';ctx.fillRect(0,0,W,H);label('KNOCKED OUT',cx,H-150,30,'#ff4b3e',INK,6);label('spectating your team',cx,H-116,16,'#fff');return}
  // ammo
  const by=H-100,aw=58;
  rr(cx-aw*1.5-10,by-6,aw*3+20,30,12);ctx.fillStyle='rgba(29,26,47,.85)';ctx.fill();
  for(let i=0;i<3;i++){const x=cx-aw*1.5+i*aw+2;rr(x,by,aw-4,18,6);ctx.fillStyle='#4a4560';ctx.fill();
    const fill=i<me.ammo?1:i===me.ammo?me.reload/me.def.reload:0;if(fill>0){rr(x,by,(aw-4)*fill,18,6);ctx.fillStyle=fill>=1?'#ff9a2e':'#b5733a';ctx.fill()}}
  // super button
  const sx=cx+aw*1.5+60,sy=by+8,rad=34;
  ctx.beginPath();ctx.arc(sx,sy,rad,0,7);ctx.fillStyle=me.superC>=1?'#ffd23f':'rgba(29,26,47,.85)';ctx.fill();ctx.lineWidth=4;ctx.strokeStyle=INK;ctx.stroke();
  ctx.beginPath();ctx.arc(sx,sy,rad-7,-Math.PI/2,-Math.PI/2+me.superC*Math.PI*2);ctx.strokeStyle='#ffd23f';ctx.lineWidth=7;ctx.stroke();
  ctx.font='26px "Apple Color Emoji","Segoe UI Emoji",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(me.def.emoji,sx,sy+1);
  if(me.superC>=1)label('SUPER!',sx,sy-rad-10,13,'#ffd23f');
  // gems / power cubes carried
  if(me.gems>0){drawGem(cx-aw*1.5-50,by+9,13);label(String(me.gems),cx-aw*1.5-26,by+10,20,'#fff')}
  if(me.cubes>0){drawCube(cx-aw*1.5-52,by+8,12);label(String(me.cubes),cx-aw*1.5-26,by+10,20,'#fff')}
  // health
  label(`${Math.ceil(me.hp)} / ${maxHp(me)}`,cx,by-20,13,'#fff',INK,3.5);
  if(me.dead>0&&MODE==='gem'){ctx.fillStyle='rgba(255,244,220,.35)';ctx.fillRect(0,0,W,H);label('KNOCKED OUT',cx,H/2-30,40,'#ff4b3e',INK,6);label(`back in ${Math.ceil(me.dead)}`,cx,H/2+16,20,'#fff')}
}

let last=performance.now();
function loop(now){
  const dt=Math.min(.05,(now-last)/1000);last=now;
  if(S){if(running&&!S.over)update(dt);render();hud()}
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
