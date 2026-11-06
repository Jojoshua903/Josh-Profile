'use strict';
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
let W = 0, H = 0, DPR = 1;
function resize(){DPR=Math.min(2,window.devicePixelRatio||1);W=innerWidth;H=innerHeight;cv.width=W*DPR;cv.height=H*DPR;cv.style.width=W+'px';cv.style.height=H+'px'}
addEventListener('resize', resize); resize();

/* ---------- map ---------- */
const T = 56; let grid, COLS, ROWS, MW, MH;
function buildMap(src){
  const w = src[0].length;
  const rows = src.map(h => {h = h.padEnd(w,'.').slice(0,w); return h + h.slice(0,-1).split('').reverse().join('')});
  grid = rows.concat(rows.slice(0,-1).reverse()).map(r => r.split(''));
  ROWS = grid.length; COLS = grid[0].length; MW = COLS*T; MH = ROWS*T;
}
const solid = ch => ch==='#'||ch==='c';
function tileAt(x,y){const c=Math.floor(x/T),r=Math.floor(y/T);if(c<0||r<0||c>=COLS||r>=ROWS)return'#';return grid[r][c]}
function hitsWall(x,y,rad,water){
  const c0=Math.floor((x-rad)/T),c1=Math.floor((x+rad)/T),r0=Math.floor((y-rad)/T),r1=Math.floor((y+rad)/T);
  for(let r=r0;r<=r1;r++)for(let c=c0;c<=c1;c++){
    const ch=(c<0||r<0||c>=COLS||r>=ROWS)?'#':grid[r][c];
    if(solid(ch)||(water&&ch==='w')){const nx=Math.max(c*T,Math.min(x,c*T+T)),ny=Math.max(r*T,Math.min(y,r*T+T));if((nx-x)**2+(ny-y)**2<rad*rad)return true}
  }
  return false;
}
function moveE(e,dx,dy){if(!hitsWall(e.x+dx,e.y,e.r,true))e.x+=dx;if(!hitsWall(e.x,e.y+dy,e.r,true))e.y+=dy}
function los(x1,y1,x2,y2){const d=Math.hypot(x2-x1,y2-y1),n=Math.ceil(d/18);for(let i=1;i<n;i++)if(solid(tileAt(x1+(x2-x1)*i/n,y1+(y2-y1)*i/n)))return false;return true}
const inBush = e => tileAt(e.x,e.y)==='b';
const dist = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
const rnd = (a,b) => a+Math.random()*(b-a);
const angDiff = (a,b) => {const d=a-b;return Math.atan2(Math.sin(d),Math.cos(d))};
function freeSpot(x,y){for(let r=0;r<500;r+=20)for(let k=0;k<12;k++){const a=k/12*6.283,px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;if(!hitsWall(px,py,32,true))return{x:px,y:py}}return{x,y}}

/* ---------- audio ---------- */
let AC = null;
function sfx(f,d,type='square',vol=.05,x,y){
  if(!AC)return; if(x!==undefined&&S&&Math.hypot(x-S.me.x,y-S.me.y)>750)return;
  const o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.setValueAtTime(f,AC.currentTime);
  o.frequency.exponentialRampToValueAtTime(Math.max(40,f*.6),AC.currentTime+d);
  g.gain.setValueAtTime(vol,AC.currentTime);g.gain.exponentialRampToValueAtTime(.0001,AC.currentTime+d);
  o.connect(g).connect(AC.destination);o.start();o.stop(AC.currentTime+d);
}

/* ---------- state ---------- */
let S = null, chosen = 0, running = false, MODE = 'gem';
// Poison gas never hurts itself; this is the "attacker" for gas damage and KO feed entries.
const GAS = {team:'gas',def:{name:'The Gas',superCost:1},kills:0,cubes:0,superC:0};
const maxHp = b => b.def.hp + (b.cubes||0)*400;
const ally = b => b.team===S.me.team;
const colOf = b => b===GAS?'#2e9e4a':b===S.me?'#3fbf5a':ally(b)?'#2f7dff':'#ff4b3e';
function makeB(def,team,slot,isPlayer){
  return {def,team,slot,isPlayer,x:0,y:0,r:def.r,hp:def.hp,ammo:3,reload:0,superC:0,gems:0,cubes:0,dead:0,out:false,lastHit:9,lastAtk:9,
    stun:0,invis:0,flash:0,atkCD:0,burst:0,burstT:0,burstAng:0,kx:0,ky:0,vx:0,vy:0,z:0,aim:team==='red'?Math.PI/2:-Math.PI/2,
    dash:null,leap:null,kills:0,slow:0,boost:0,moons:0,moonA:0,moonCD:0,ai:{cd:rnd(.5,1.5),sw:1,dir:Math.random()<.5?1:-1}};
}
function spawnPt(b){
  if(MODE==='showdown')return S.sdSpawn[b.slot];
  const col=[8,12,16][b.slot],row=b.team==='blue'?ROWS-2:1;return{x:col*T+T/2,y:row*T+T/2};
}
function spawn(b){const p=spawnPt(b);Object.assign(b,{x:p.x,y:p.y,hp:maxHp(b),ammo:3,dead:0,out:false,stun:0,kx:0,ky:0,dash:null,leap:null,invis:0,lastHit:9,z:0,burst:0,slow:0,boost:0,moons:0})}
const mapFor = m => m==='gem'?HALF:m==='knockout'?KO_HALF:SD_QUARTER;
function newGame(){
  buildMap(mapFor(MODE));
  S = {t:150,rt:0,B:[],P:[],FX:[],G:[],C:[],Z:[],crate:{},gas:null,gasTick:0,gemT:2,lead:null,cd:12,over:false,feed:[],shake:0,
    cam:{x:0,y:0},scale:1,camInit:false,toastT:rnd(10,16),toastHide:0,wins:{blue:0,red:0},round:1,inter:0,banner:null,after:null};
  // every brawler appears at most once per match
  const pool = BRAWLERS.filter((_,i)=>i!==chosen).sort(()=>Math.random()-.5);
  if(MODE==='showdown'){
    const off=rnd(0,6.283);S.sdSpawn=[];
    for(let i=0;i<10;i++){const a=off+i/10*6.283;S.sdSpawn.push(freeSpot(MW/2+Math.cos(a)*MW*.4,MH/2+Math.sin(a)*MH*.4))}
    [BRAWLERS[chosen],...pool.slice(0,9)].forEach((d,i)=>S.B.push(makeB(d,'s'+i,i,i===0)));
  } else {
    [BRAWLERS[chosen],pool[0],pool[1]].forEach((d,i)=>S.B.push(makeB(d,'blue',i,i===0)));
    pool.slice(2,5).forEach((d,i)=>S.B.push(makeB(d,'red',i,false)));
  }
  S.me = S.B[0]; S.B.forEach(spawn);
  if(MODE==='knockout')banner('ROUND 1','#ffc820',1.6);
  if(MODE==='showdown')banner('LAST ONE STANDING','#ffc820',1.8);
  document.getElementById('over').style.display='none';
  running = true;
}
function banner(text,col,dur,after){S.banner={text,col,t:dur,dur};S.inter=dur;S.after=after||null}
function resetRound(){
  buildMap(KO_HALF);S.P=[];S.Z=[];S.G=[];S.rt=0;S.gas=null;S.camInit=false;
  S.B.forEach(b=>{b.superC*=.5;spawn(b)});
}
const teamGems = t => S.B.reduce((s,b)=>s+(b.team===t?b.gems:0),0);
const alive = t => S.B.filter(b=>b.team===t&&!b.out).length;

/* ---------- combat ---------- */
function shot(b,ang,o){o.range*=RANGE;S.P.push(Object.assign({x:b.x+Math.cos(ang)*b.r*.8,y:b.y+Math.sin(ang)*b.r*.8,vx:Math.cos(ang)*o.spd,vy:Math.sin(ang)*o.spd,trav:0,team:b.team,src:b,hit:new Set(),bounce:0,spin:0},o))}
function lob(b,tx,ty,maxR,o){let dx=tx-b.x,dy=ty-b.y,d=Math.hypot(dx,dy);if(d>maxR){dx*=maxR/d;dy*=maxR/d;d=maxR}S.P.push(Object.assign({lob:true,sx:b.x,sy:b.y,tx:b.x+dx,ty:b.y+dy,x:b.x,y:b.y,h:0,t:0,dur:.45+d/1400,team:b.team,src:b},o))}
function boom(x,y,r,col){S.FX.push({type:'ring',x,y,r,t:0,life:.4,col})}
const power = src => 1+(src.cubes||0)*.1;
function damage(t,dmg,src,isSuper){
  if(t.dead||t.team===src.team)return;
  dmg*=power(src);
  t.hp-=dmg;t.lastHit=0;t.flash=.12;
  if(!isSuper)src.superC=Math.min(1,src.superC+dmg/src.def.superCost);
  S.FX.push({type:'num',x:t.x+rnd(-12,12),y:t.y-34,v:Math.round(dmg),t:0,life:.8,col:ally(t)?'#ff4b3e':src===GAS?'#b5f28a':'#ffffff'});
  if(t.isPlayer)S.shake=Math.max(S.shake,6);
  if(t.hp<=0)kill(t,src);
}
function kill(t,src){
  t.hp=0;src.kills++;
  if(MODE==='gem')t.dead=4;else{t.dead=Infinity;t.out=true}
  for(let i=0;i<t.gems;i++){const a=rnd(0,6.28),r=rnd(20,70);dropGem(t.x,t.y,t.x+Math.cos(a)*r,t.y+Math.sin(a)*r)}
  for(let i=0;i<t.cubes;i++){const a=rnd(0,6.28),r=rnd(20,60);dropCube(t.x,t.y,t.x+Math.cos(a)*r,t.y+Math.sin(a)*r)}
  t.gems=0;boom(t.x,t.y,70,t.def.color);
  S.feed.unshift({a:src.def.name,b:t.def.name,ca:colOf(src),cb:colOf(t),t:4});S.feed.length=Math.min(S.feed.length,4);
  sfx(160,.35,'sawtooth',.06,t.x,t.y);
}
function dropGem(x,y,tx,ty){if(hitsWall(tx,ty,12,true)){tx=x;ty=y}S.G.push({x,y,sx:x,sy:y,tx,ty,t:0})}
function dropCube(x,y,tx,ty){if(hitsWall(tx,ty,12,true)){tx=x;ty=y}S.C.push({x,y,sx:x,sy:y,tx,ty,t:0})}
function hitCrate(r,c,dmg){
  const k=r*1000+c;S.crate[k]=(S.crate[k]??2400)-dmg;
  S.FX.push({type:'crateHit',r,c,t:0,life:.12});
  if(S.crate[k]<=0){
    grid[r][c]='.';delete S.crate[k];
    for(let i=0;i<8;i++)S.FX.push({type:'chip',col:'#c98b4a',x:c*T+T/2,y:r*T+T/2,vx:rnd(-220,220),vy:rnd(-300,40),t:0,life:.7});
    dropCube(c*T+T/2,r*T+T/2,c*T+T/2,r*T+T/2);sfx(300,.2,'square',.05,c*T,r*T);
  }
}
function forTiles(x,y,r,fn){
  const c0=Math.floor((x-r)/T),c1=Math.floor((x+r)/T),r0=Math.floor((y-r)/T),r1=Math.floor((y+r)/T);
  for(let rr=r0;rr<=r1;rr++)for(let c=c0;c<=c1;c++){if(rr<0||c<0||rr>=ROWS||c>=COLS)continue;if(Math.hypot(c*T+T/2-x,rr*T+T/2-y)<r+T/2)fn(rr,c)}
}
function breakWalls(x,y,r){
  forTiles(x,y,r,(rr,c)=>{
    if(grid[rr][c]==='c')hitCrate(rr,c,1e9);
    else if(grid[rr][c]==='#'){grid[rr][c]='.';for(let i=0;i<7;i++)S.FX.push({type:'chip',x:c*T+T/2,y:rr*T+T/2,vx:rnd(-220,220),vy:rnd(-300,40),t:0,life:.7})}
  });
}
function explode(x,y,r,dmg,src,o={}){
  for(const e of S.B){
    if(e.dead||e.team===src.team)continue;
    if(Math.hypot(e.x-x,e.y-y)<r+e.r){
      damage(e,dmg,src,o.sup);if(o.stun)e.stun=o.stun;
      if(o.knock){const a=Math.atan2(e.y-y,e.x-x);e.kx+=Math.cos(a)*o.knock;e.ky+=Math.sin(a)*o.knock}
    }
  }
  if(o.breakW)breakWalls(x,y,r);else if(dmg>0)forTiles(x,y,r*.7,(rr,c)=>{if(grid[rr][c]==='c')hitCrate(rr,c,dmg*power(src))});
  boom(x,y,r,o.col||'#ffb02e');S.shake=Math.max(S.shake,o.sup?11:4);sfx(90,.25,'square',.06,x,y);
}
function fire(b,ang,tx,ty){
  const id=b.def.id;sfx(500+Math.random()*120,.06,'triangle',.035,b.x,b.y);
  if(id==='josh'){b.burst=3;b.burstT=0;b.burstAng=ang}
  else if(id==='nathan'){
    S.FX.push({type:'swing',x:b.x,y:b.y,a:ang,t:0,life:.2,r:b.def.range,col:'#ffffff'});
    for(const e of S.B){if(e.dead||e.team===b.team)continue;
      if(dist(b,e)<b.def.range+e.r&&Math.abs(angDiff(Math.atan2(e.y-b.y,e.x-b.x),ang))<1){damage(e,1500,b);e.kx+=Math.cos(ang)*440;e.ky+=Math.sin(ang)*440}}
    for(const k of[50,95,135]){const x=b.x+Math.cos(ang)*k,y=b.y+Math.sin(ang)*k;if(tileAt(x,y)==='c'){hitCrate(Math.floor(y/T),Math.floor(x/T),1500*power(b));break}}
  }
  else if(id==='daniel')lob(b,tx,ty,b.def.range,{kind:'c4',r:78,dmg:1100});
  else if(id==='reshman'){for(let i=-1;i<=1;i++)shot(b,ang+i*.2,{spd:850,range:520,dmg:520,r:9,kind:'shur'})}
  else if(id==='guiseppe')shot(b,ang,{spd:700,range:600,dmg:1150,r:13,splash:55,kind:'tom'});
  else if(id==='otis')shot(b,ang,{spd:650,range:760,dmg:720,r:12,bounce:2,kind:'cookie'});
  else if(id==='grumble'){for(let i=-2;i<=2;i++)shot(b,ang+i*.13+rnd(-.03,.03),{spd:900,range:330,dmg:400,r:8,kind:'claw'})}
  else if(id==='milo')shot(b,ang,{spd:1500,range:860,dmg:950,r:7,pierce:true,kind:'laser'});
  else if(id==='joep')shot(b,ang,{spd:800,range:400,dmg:820,r:22,pierce:true,kind:'wave'});
  else if(id==='cas')shot(b,ang,{spd:750,range:440,dmg:640,r:13,ret:true,kind:'pancake'});
  else if(id==='luur')shot(b,ang,{spd:600,range:620,dmg:1350,r:16,bounce:1,kind:'bowl'});
  else if(id==='toon'){shot(b,ang+.28,{spd:700,range:640,dmg:620,r:11,curve:-.9,kind:'moon'});shot(b,ang-.28,{spd:700,range:640,dmg:620,r:11,curve:.9,kind:'moon'})}
  else if(id==='maat')lob(b,tx,ty,b.def.range,{kind:'flask',r:72,dmg:950});
}
function healAround(x,y,r,src,amt){
  for(const a of S.B)if(!a.dead&&a.team===src.team&&Math.hypot(a.x-x,a.y-y)<r+a.r&&a.hp<maxHp(a)){
    a.hp=Math.min(maxHp(a),a.hp+amt);S.FX.push({type:'num',x:a.x,y:a.y-34,v:'+'+amt,t:0,life:.8,col:'#3fbf5a'});
  }
}
function superFire(b,ang,tx,ty){
  const id=b.def.id;sfx(240,.4,'sawtooth',.06,b.x,b.y);
  S.FX.push({type:'ring',x:b.x,y:b.y,r:55,t:0,life:.3,col:'#ffd23f'});
  if(id==='josh')shot(b,ang,{spd:620,range:1200,dmg:1900,r:20,homing:true,sup:true,kind:'bigstar'});
  else if(id==='nathan')shot(b,ang,{spd:1050,range:950,dmg:1700,r:24,pierce:true,breakW:true,knock:450,sup:true,kind:'homer'});
  else if(id==='daniel')lob(b,tx,ty,560*RANGE,{kind:'bigc4',r:150,dmg:1900,breakW:true,sup:true});
  else if(id==='reshman')b.dash={vx:Math.cos(ang)*1150,vy:Math.sin(ang)*1150,t:.28,hit:new Set()};
  else if(id==='guiseppe'){let dx=tx-b.x,dy=ty-b.y;const d=Math.hypot(dx,dy),m=380;if(d>m){dx*=m/d;dy*=m/d}b.leap={sx:b.x,sy:b.y,tx:b.x+dx,ty:b.y+dy,t:0,dur:.6}}
  else if(id==='otis')lob(b,tx,ty,620*RANGE,{kind:'well',r:0,dmg:0,sup:true});
  else if(id==='grumble'){S.FX.push({type:'ring',x:b.x,y:b.y,r:240,t:0,life:.55,col:'#ee6a4c'});explode(b.x,b.y,230,1300,b,{knock:420,breakW:true,sup:true,col:'#ee6a4c'})}
  else if(id==='milo'){
    for(const a of S.B)if(!a.dead&&a.team===b.team&&dist(a,b)<280){a.hp=Math.min(maxHp(a),a.hp+maxHp(a)*.5);S.FX.push({type:'num',x:a.x,y:a.y-34,v:'+HEAL',t:0,life:.9,col:'#3fbf5a'})}
    explode(b.x,b.y,280,700,b,{sup:true,col:'#3fbf5a'});
  }
  else if(id==='joep'){
    let dx=tx-b.x,dy=ty-b.y;const d=Math.hypot(dx,dy);if(d>320){dx*=320/d;dy*=320/d}
    let x=b.x+dx,y=b.y+dy;if(hitsWall(x,y,20,true)){x=b.x;y=b.y}
    S.Z.push({kind:'speaker',x,y,r:40,t:7,tick:.2,src:b,aim:b.aim});
  }
  else if(id==='cas')lob(b,tx,ty,600*RANGE,{kind:'syrup',r:0,dmg:0,sup:true});
  else if(id==='luur'){b.boost=4;b.ammo=3;healAround(b.x,b.y,1,b,Math.round(maxHp(b)*.35))}
  else if(id==='toon')b.moons=5;
  else if(id==='maat')lob(b,tx,ty,560*RANGE,{kind:'heal',r:0,dmg:0,sup:true});
}
function tryAtk(b,a,tx,ty){if(b.ammo>=1&&b.atkCD<=0&&!b.burst){b.ammo--;b.atkCD=.38;b.lastAtk=0;b.invis=0;b.aim=a;fire(b,a,tx,ty)}}
function trySup(b,a,tx,ty){if(b.superC>=1){b.superC=0;b.lastAtk=0;b.invis=0;b.aim=a;superFire(b,a,tx,ty)}}
function visibleTo(e,team){
  if(e.team===team)return true;
  const near=S.B.some(o=>!o.dead&&o.team===team&&dist(o,e)<(e.invis>0?70:150));
  if(e.invis>0)return near;
  if(inBush(e)&&e.lastAtk>.8)return near;
  return true;
}

/* ---------- input ---------- */
const keys = {}; const mouse = {x:0,y:0,down:false}; let superReq = false, superAim = false;
// E: hold to aim the Super, release to fire. Space / right click: instant Super.
addEventListener('keydown',e=>{const k=e.key.toLowerCase();keys[k]=true;if(!running)return;
  if(k==='e'){e.preventDefault();superAim=true}
  else if(k===' '||k==='q'){e.preventDefault();superReq=true}});
addEventListener('keyup',e=>{const k=e.key.toLowerCase();keys[k]=false;if(k==='e'&&superAim){superAim=false;if(running)superReq=true}});
cv.addEventListener('mousemove',e=>{mouse.x=e.clientX;mouse.y=e.clientY});
cv.addEventListener('mousedown',e=>{if(e.button===2)superReq=true;else mouse.down=true});
addEventListener('mouseup',e=>{if(e.button===0)mouse.down=false});
addEventListener('blur',()=>{mouse.down=false;superAim=false;for(const k in keys)keys[k]=false});
cv.addEventListener('contextmenu',e=>e.preventDefault());
const mouseWorld = () => ({x:mouse.x/S.scale+S.cam.x,y:mouse.y/S.scale+S.cam.y});

function walk(b,mx,my,dt){const m=Math.hypot(mx,my);if(m<.01)return;mx/=m;my/=m;const sp=b.def.spd*(b.slow>0?.55:1)*(b.boost>0?1.45:1);b.vx=mx*sp;b.vy=my*sp;moveE(b,mx*sp*dt,my*sp*dt)}
function playerCtl(b,dt){
  let mx=0,my=0;
  if(keys.w||keys.arrowup)my--;if(keys.s||keys.arrowdown)my++;if(keys.a||keys.arrowleft)mx--;if(keys.d||keys.arrowright)mx++;
  walk(b,mx,my,dt);
  const m=mouseWorld();b.aim=Math.atan2(m.y-b.y,m.x-b.x);
  if(mouse.down)tryAtk(b,b.aim,m.x,m.y);
  if(superReq){superReq=false;trySup(b,b.aim,m.x,m.y)}
}

/* ---------- bots ---------- */
function steer(b,dx,dy,dt){
  if(Math.hypot(dx,dy)<8)return;
  const base=Math.atan2(dy,dx);
  for(const off of[0,.5,-.5,1,-1,1.6,-1.6,2.4,-2.4]){
    const a=base+off*b.ai.dir;
    if(!hitsWall(b.x+Math.cos(a)*30,b.y+Math.sin(a)*30,b.r,true)){walk(b,Math.cos(a),Math.sin(a),dt);return}
  }
}
const SUPER_RANGE={josh:720,nathan:560,daniel:440,reshman:300,guiseppe:360,otis:490,grumble:200,milo:260,joep:400,cas:470,luur:480,toon:220,maat:440};
const SUPER_NO_LOS=['daniel','guiseppe','otis','grumble','milo','joep','cas','luur','toon','maat'];
// Enemy bot difficulty, chosen before each match. Teammate bots always play on Normal.
const DIFF={
  easy:  {label:'Easy',  noise:75,cdMin:.85,cdMax:1.6,lead:.15,supDelay:3, reload:1,   notice:.75},
  normal:{label:'Normal',noise:28,cdMin:.35,cdMax:.9, lead:.7, supDelay:.6,reload:1,   notice:1},
  hard:  {label:'Hard',  noise:12,cdMin:.22,cdMax:.55,lead:.9, supDelay:0, reload:1,   notice:1.15},
  insane:{label:'Insane',noise:4, cdMin:.14,cdMax:.32,lead:1,  supDelay:0, reload:1.25,notice:1.3}
};
let difficulty='normal';
const diffOf=b=>ally(b)?DIFF.normal:DIFF[difficulty];
function strafeGoal(b,foe,fd){
  const pref=b.def.range*.7,ang=Math.atan2(foe.y-b.y,foe.x-b.x),toward=fd>pref?1:-.6,s=b.ai.dir;
  return[b.x+Math.cos(ang)*toward*100-Math.sin(ang)*s*70,b.y+Math.sin(ang)*toward*100+Math.cos(ang)*s*70];
}
function nearestCrate(b){
  let best=null,bd=1e9;
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)if(grid[r][c]==='c'){const x=c*T+T/2,y=r*T+T/2,d=Math.hypot(x-b.x,y-b.y);if(d<bd){bd=d;best={x,y,d}}}
  return best;
}
function aiCtl(b,dt){
  const a=b.ai,d=b.def,D=diffOf(b);a.cd-=dt;a.sw-=dt;if(a.sw<=0){a.dir*=-1;a.sw=rnd(.7,1.8)}
  let foe=null,fd=1e9;
  for(const e of S.B){if(e.dead||e.team===b.team||!visibleTo(e,b.team))continue;const k=dist(b,e);if(k<fd){fd=k;foe=e}}
  const notice=Math.max(d.range*1.3,420)*D.notice;
  let gx,gy,crate=null;
  if(S.gas!==null&&Math.hypot(b.x-MW/2,b.y-MH/2)>S.gas-90){gx=MW/2;gy=MH/2}
  else if(MODE==='gem'){
    const home=spawnPt(b),myG=teamGems(b.team);
    if(b.hp<maxHp(b)*.33&&fd<700){gx=home.x;gy=home.y}
    else if(b.gems>0&&(myG>=10||b.gems>=4)){gx=home.x;gy=home.y+(MH/2-home.y)*.3}
    else{
      let gem=null,gd=1e9;for(const g of S.G){const k=Math.hypot(g.tx-b.x,g.ty-b.y);if(k<gd){gd=k;gem=g}}
      if(foe&&fd<notice&&!(gem&&gd<120))[gx,gy]=strafeGoal(b,foe,fd);
      else if(gem){gx=gem.tx;gy=gem.ty}
      else{gx=MW/2+(b.slot-1)*150;gy=MH/2+(b.team==='blue'?170:-170)}
    }
  }
  else if(b.hp<maxHp(b)*.33&&foe&&fd<600){
    if(MODE==='knockout'){const h=spawnPt(b);gx=h.x;gy=h.y}else{gx=b.x-(foe.x-b.x);gy=b.y-(foe.y-b.y)}
  }
  else if(foe&&fd<notice*(MODE==='knockout'?2.2:1.2))[gx,gy]=strafeGoal(b,foe,fd);
  else if(MODE==='showdown'){
    let cube=null,cd=700;for(const q of S.C){const k=Math.hypot(q.tx-b.x,q.ty-b.y);if(k<cd){cd=k;cube=q}}
    if(cube){gx=cube.tx;gy=cube.ty}
    else if((crate=nearestCrate(b))&&crate.d<1500){const ang=Math.atan2(b.y-crate.y,b.x-crate.x),st=Math.max(70,Math.min(d.range*.6,240));gx=crate.x+Math.cos(ang)*st;gy=crate.y+Math.sin(ang)*st}
    else{gx=MW/2+Math.cos(b.slot)*220;gy=MH/2+Math.sin(b.slot)*220}
  }
  else{gx=MW/2+(b.slot-1)*150;gy=MH/2}
  steer(b,gx-b.x,gy-b.y,dt);
  if(foe&&fd<notice*1.6){
    const tl=d.pspd>0?fd/d.pspd:.3;
    const px=foe.x+foe.vx*tl*D.lead+rnd(-D.noise,D.noise),py=foe.y+foe.vy*tl*D.lead+rnd(-D.noise,D.noise);
    const ang=Math.atan2(py-b.y,px-b.x);b.aim=ang;
    const overWalls=d.id==='daniel'||d.id==='maat';
    if(a.cd<=0&&fd<d.range*.95+foe.r&&(overWalls||los(b.x,b.y,foe.x,foe.y))){tryAtk(b,ang,px,py);a.cd=rnd(D.cdMin,D.cdMax)}
    if(b.superC>=1)a.supWait=(a.supWait||0)+dt;
    if(b.superC>=1&&a.supWait>=D.supDelay&&fd<SUPER_RANGE[d.id]&&(SUPER_NO_LOS.includes(d.id)||los(b.x,b.y,foe.x,foe.y))){trySup(b,ang,px,py);a.supWait=0}
  }
  else if(crate&&crate.d<d.range*.9&&a.cd<=0){
    const ang=Math.atan2(crate.y-b.y,crate.x-b.x);tryAtk(b,ang,crate.x,crate.y);a.cd=rnd(D.cdMin,D.cdMax)+.25;
  }
}

/* ---------- update ---------- */
function updB(b,dt){
  if(b.dead>0){b.dead-=dt;if(b.dead<=0)spawn(b);return}
  b.lastHit+=dt;b.lastAtk+=dt;b.stun-=dt;b.invis-=dt;b.flash-=dt;b.atkCD-=dt;
  b.slow-=dt;b.boost-=dt;b.moonCD-=dt;
  if(b.moons>0){
    b.moons-=dt;b.moonA+=dt*4;
    for(let i=0;i<3;i++){const a=b.moonA+i*2.094,mx=b.x+Math.cos(a)*95,my=b.y+Math.sin(a)*95;
      for(const e of S.B)if(!e.dead&&e.team!==b.team&&e.moonCD<=0&&Math.hypot(e.x-mx,e.y-my)<e.r+16){damage(e,520,b,true);e.moonCD=.45}}
  }
  if(b.boost>0&&Math.random()<.4)S.FX.push({type:'ghost',x:b.x,y:b.y,r:b.r,t:0,life:.2,col:b.def.color});
  if(b.ammo<3){b.reload+=dt*(b.boost>0?2:1)*(b.isPlayer?1:diffOf(b).reload);if(b.reload>=b.def.reload){b.ammo++;b.reload=0}}else b.reload=0;
  if(b.lastHit>3&&b.lastAtk>3&&b.hp<maxHp(b))b.hp=Math.min(maxHp(b),b.hp+maxHp(b)*.14*dt);
  if(b.burst>0){b.burstT-=dt;if(b.burstT<=0){shot(b,b.burstAng+rnd(-.04,.04),{spd:950,range:650,dmg:430,r:8,kind:'bolt'});b.burst--;b.burstT=.08}}
  if(Math.abs(b.kx)+Math.abs(b.ky)>5){moveE(b,b.kx*dt,b.ky*dt);const f=Math.exp(-7*dt);b.kx*=f;b.ky*=f}
  b.vx=0;b.vy=0;
  if(b.dash){
    const d=b.dash;moveE(b,d.vx*dt,d.vy*dt);
    for(const e of S.B)if(!e.dead&&e.team!==b.team&&!d.hit.has(e)&&dist(e,b)<e.r+b.r+12){d.hit.add(e);damage(e,1100,b,true)}
    S.FX.push({type:'ghost',x:b.x,y:b.y,r:b.r,t:0,life:.25,col:b.def.color});
    d.t-=dt;if(d.t<=0){b.dash=null;b.invis=2.5}return;
  }
  if(b.leap){
    const l=b.leap;l.t+=dt;const k=Math.min(1,l.t/l.dur);
    b.x=l.sx+(l.tx-l.sx)*k;b.y=l.sy+(l.ty-l.sy)*k;b.z=Math.sin(Math.PI*k)*110;
    if(k>=1){b.leap=null;b.z=0;if(hitsWall(b.x,b.y,b.r,true))unstick(b,l);explode(b.x,b.y,130,1400,b,{stun:1.1,sup:true,col:'#ff6b6e'})}
    return;
  }
  if(b.stun>0)return;
  if(b.isPlayer)playerCtl(b,dt);else aiCtl(b,dt);
}
function unstick(b,l){for(let k=1;k>=0;k-=.05){const x=l.sx+(l.tx-l.sx)*k,y=l.sy+(l.ty-l.sy)*k;if(!hitsWall(x,y,b.r,true)){b.x=x;b.y=y;return}}b.x=l.sx;b.y=l.sy}

function updP(dt){
  for(let i=S.P.length-1;i>=0;i--){
    const p=S.P[i];let dead=false;p.spin+=dt*14;
    if(p.lob){
      p.t+=dt;const k=Math.min(1,p.t/p.dur);
      p.x=p.sx+(p.tx-p.sx)*k;p.y=p.sy+(p.ty-p.sy)*k;p.h=Math.sin(Math.PI*k)*(90+p.dur*60);
      if(k>=1){
        if(p.kind==='well'){S.Z.push({kind:'well',x:p.x,y:p.y,r:180,t:3,tick:0,src:p.src});sfx(120,.6,'sine',.07,p.x,p.y)}
        else if(p.kind==='syrup'){S.Z.push({kind:'syrup',x:p.x,y:p.y,r:160,t:4,tick:0,src:p.src});sfx(180,.4,'sine',.07,p.x,p.y)}
        else if(p.kind==='heal'){S.Z.push({kind:'heal',x:p.x,y:p.y,r:170,t:5,tick:0,src:p.src});sfx(520,.5,'sine',.06,p.x,p.y)}
        else{explode(p.x,p.y,p.r,p.dmg,p.src,{breakW:p.breakW,sup:p.sup,col:p.kind==='bigc4'?'#ff4b3e':p.kind==='flask'?'#7be36b':'#ffb02e'});if(p.kind==='flask')healAround(p.x,p.y,p.r+20,p.src,400)}
        dead=true;
      }
    } else {
      if(p.homing){
        let best=null,bd=500;
        for(const e of S.B){if(e.dead||e.team===p.team||!visibleTo(e,p.team))continue;const d=Math.hypot(e.x-p.x,e.y-p.y);if(d<bd){bd=d;best=e}}
        if(best){const cur=Math.atan2(p.vy,p.vx),da=angDiff(Math.atan2(best.y-p.y,best.x-p.x),cur),na=cur+Math.max(-3.5*dt,Math.min(3.5*dt,da)),sp=Math.hypot(p.vx,p.vy);p.vx=Math.cos(na)*sp;p.vy=Math.sin(na)*sp}
      }
      if(p.curve){const a=Math.atan2(p.vy,p.vx)+p.curve*dt,sp=Math.hypot(p.vx,p.vy);p.vx=Math.cos(a)*sp;p.vy=Math.sin(a)*sp}
      if(p.ret&&!p.back&&p.trav>p.range){p.back=true;p.trav=0;p.hit.clear()}
      if(p.back){
        const a=Math.atan2(p.src.y-p.y,p.src.x-p.x),sp=Math.hypot(p.vx,p.vy);p.vx=Math.cos(a)*sp;p.vy=Math.sin(a)*sp;
        if(p.src.dead||Math.hypot(p.src.x-p.x,p.src.y-p.y)<p.src.r||p.trav>1400){S.P.splice(i,1);continue}
      }
      const nx=p.x+p.vx*dt,ny=p.y+p.vy*dt;p.trav+=Math.hypot(p.vx,p.vy)*dt;
      const tile=tileAt(nx,ny);
      if(nx<0||ny<0||nx>MW||ny>MH)dead=true;
      else if(solid(tile)&&!p.back){
        if(tile==='c'&&!p.breakW&&!p.splash)hitCrate(Math.floor(ny/T),Math.floor(nx/T),p.dmg*power(p.src));
        if(p.ret){p.back=true;p.trav=0;p.hit.clear()}
        else if(p.bounce>0){
          const bx=solid(tileAt(nx,p.y)),by=solid(tileAt(p.x,ny));
          if(bx)p.vx*=-1;if(by)p.vy*=-1;if(!bx&&!by){p.vx*=-1;p.vy*=-1}
          p.bounce--;p.hit.clear();sfx(700,.04,'sine',.03,p.x,p.y);
        }
        else if(p.breakW){breakWalls(nx,ny,20);p.x=nx;p.y=ny}
        else dead=true;
      } else {p.x=nx;p.y=ny}
      if(!dead)for(const e of S.B){
        if(e.dead||e.team===p.team||p.hit.has(e)||e.z>30)continue;
        if(Math.hypot(e.x-p.x,e.y-p.y)<p.r+e.r){
          p.hit.add(e);if(p.splash){dead=true;break}
          damage(e,p.dmg,p.src,p.sup);
          if(p.knock){const a=Math.atan2(p.vy,p.vx);e.kx+=Math.cos(a)*p.knock;e.ky+=Math.sin(a)*p.knock}
          if(!p.pierce){dead=true;break}
        }
      }
      if(p.trav>p.range&&!p.ret)dead=true;
      if(dead&&p.splash)explode(p.x,p.y,p.splash,p.dmg,p.src,{col:'#ff6b6e'});
    }
    if(dead)S.P.splice(i,1);
  }
}

// Gas closes in as a shrinking circle around the map centre.
function gasRadius(){
  const R0=Math.hypot(MW,MH)/2+60;
  if(MODE==='showdown'){const t=S.rt-20;return t<=0?null:Math.max(170,R0-(R0-170)*t/110)}
  if(MODE==='knockout'){const t=S.rt-30;return t<=0?null:Math.max(110,R0-(R0-110)*t/40)}
  return null;
}
function updateCamera(dt){
  S.scale=Math.max(.55,Math.min(1.1,Math.min(W/1150,H/820)));
  const vw=W/S.scale,vh=H/S.scale;
  S.view=S.me.out?(S.B.find(b=>ally(b)&&!b.out)||S.me):S.me;
  let cx=S.view.x-vw/2,cy=S.view.y-vh/2;
  cx=vw>MW?(MW-vw)/2:Math.max(0,Math.min(MW-vw,cx));
  cy=vh>MH?(MH-vh)/2:Math.max(-60,Math.min(MH-vh+90,cy));
  if(!S.camInit){S.cam.x=cx;S.cam.y=cy;S.camInit=true}
  const k=Math.min(1,dt*8);S.cam.x+=(cx-S.cam.x)*k;S.cam.y+=(cy-S.cam.y)*k;
}
function updFX(dt){
  for(let i=S.FX.length-1;i>=0;i--){const f=S.FX[i];f.t+=dt;if(f.type==='chip'){f.x+=f.vx*dt;f.y+=f.vy*dt;f.vy+=900*dt}if(f.t>f.life)S.FX.splice(i,1)}
  for(const f of S.feed)f.t-=dt;S.feed=S.feed.filter(f=>f.t>0);
  S.shake=Math.max(0,S.shake-30*dt);
}

function update(dt){
  updateCamera(dt);
  if(S.banner){S.banner.t-=dt;if(S.banner.t<=0)S.banner=null}
  if(S.inter>0){
    S.inter-=dt;updFX(dt);
    if(S.inter<=0&&S.after){const f=S.after;S.after=null;f()}
    return;
  }
  S.rt+=dt;

  for(const b of S.B)updB(b,dt);
  updP(dt);

  for(let i=S.Z.length-1;i>=0;i--){
    const z=S.Z[i];z.t-=dt;z.tick-=dt;
    const foes=S.B.filter(e=>!e.dead&&e.team!==z.src.team),inZ=e=>Math.hypot(e.x-z.x,e.y-z.y)<z.r;
    if(z.kind==='well')for(const e of foes){const d=Math.hypot(e.x-z.x,e.y-z.y);if(d<z.r&&d>8)moveE(e,(z.x-e.x)/d*240*dt,(z.y-e.y)/d*240*dt)}
    if(z.kind==='syrup')for(const e of foes)if(inZ(e))e.slow=.3;
    if(z.tick<=0){
      if(z.kind==='speaker'){
        z.tick=.45;let best=null,bd=560*RANGE;
        for(const e of foes){if(!visibleTo(e,z.src.team))continue;const d=Math.hypot(e.x-z.x,e.y-z.y);if(d<bd&&los(z.x,z.y,e.x,e.y)){bd=d;best=e}}
        if(best){const a=Math.atan2(best.y-z.y,best.x-z.x);z.aim=a;shot({x:z.x,y:z.y,r:20,team:z.src.team},a,{spd:800,range:560,dmg:380,r:9,sup:true,kind:'note',src:z.src});sfx(660+Math.random()*300,.08,'sine',.03,z.x,z.y)}
      }
      else if(z.kind==='heal'){z.tick=.5;for(const a of S.B)if(!a.dead&&a.team===z.src.team&&inZ(a))a.hp=Math.min(maxHp(a),a.hp+maxHp(a)*.07)}
      else{z.tick=.3;for(const e of foes)if(inZ(e))damage(e,z.kind==='syrup'?120:170,z.src,true)}
    }
    if(z.t<=0)S.Z.splice(i,1);
  }

  // poison gas
  const prevGas=S.gas;S.gas=gasRadius();
  if(prevGas===null&&S.gas!==null){S.gasWarn=3;sfx(140,.8,'sawtooth',.05)}
  S.gasWarn=(S.gasWarn||0)-dt;
  if(S.gas!==null){S.gasTick-=dt;if(S.gasTick<=0){S.gasTick=.5;
    for(const b of S.B)if(!b.dead&&Math.hypot(b.x-MW/2,b.y-MH/2)>S.gas)damage(b,MODE==='showdown'?450:600,GAS,true)}}

  if(MODE==='gem'){
    S.gemT-=dt;
    if(S.gemT<=0&&S.G.length<30){S.gemT=7;const a=rnd(0,6.28),r=rnd(25,85);dropGem(MW/2,MH/2,MW/2+Math.cos(a)*r,MH/2+Math.sin(a)*r);S.FX.push({type:'ring',x:MW/2,y:MH/2,r:40,t:0,life:.4,col:'#b05cff'})}
  }
  for(let i=S.G.length-1;i>=0;i--){
    const g=S.G[i];g.t+=dt;const q=Math.min(1,g.t/.4);g.x=g.sx+(g.tx-g.sx)*q;g.y=g.sy+(g.ty-g.sy)*q;
    if(q<1)continue;
    for(const b of S.B)if(!b.dead&&!b.leap&&Math.hypot(b.x-g.x,b.y-g.y)<b.r+14){b.gems++;S.G.splice(i,1);if(ally(b))sfx(1300,.09,'sine',.05);break}
  }
  for(let i=S.C.length-1;i>=0;i--){
    const g=S.C[i];g.t+=dt;const q=Math.min(1,g.t/.4);g.x=g.sx+(g.tx-g.sx)*q;g.y=g.sy+(g.ty-g.sy)*q;
    if(q<1)continue;
    for(const b of S.B)if(!b.dead&&!b.leap&&Math.hypot(b.x-g.x,b.y-g.y)<b.r+16){
      b.cubes++;b.hp+=400;S.C.splice(i,1);
      S.FX.push({type:'num',x:b.x,y:b.y-40,v:'+POWER',t:0,life:.9,col:'#7be36b'});
      if(b===S.me)sfx(900,.15,'triangle',.06);break;
    }
  }

  updFX(dt);

  // Meta AI interruptions
  S.toastT-=dt;S.toastHide-=dt;const tEl=document.getElementById('toast');
  if(S.toastT<=0){S.toastT=rnd(22,38);S.toastHide=4.5;tEl.innerHTML='<b>META AI</b>'+META_AI[Math.floor(Math.random()*META_AI.length)];tEl.style.display='block';tEl.style.animation='none';void tEl.offsetWidth;tEl.style.animation=''}
  if(S.toastHide<=0)tEl.style.display='none';

  if(MODE==='gem'){
    const bg=teamGems('blue'),rg=teamGems('red');
    const lead=bg>=10&&bg>rg?'blue':rg>=10&&rg>bg?'red':null;
    if(lead!==S.lead){S.lead=lead;S.cd=12}
    if(lead){const before=Math.ceil(S.cd);S.cd-=dt;if(Math.ceil(S.cd)<before)sfx(lead==='blue'?880:330,.12,'square',.05);if(S.cd<=0)return end(lead)}
    S.t-=dt;if(S.t<=0)return end(bg>rg?'blue':rg>bg?'red':'draw');
  }
  else if(MODE==='knockout'){
    const ab=alive('blue'),ar=alive('red');
    if(ab===0||ar===0||S.rt>110){
      const hpf=t=>S.B.filter(b=>b.team===t&&!b.out).reduce((s,b)=>s+b.hp/maxHp(b),0);
      const w=ab===0&&ar===0?'draw':ab===0?'red':ar===0?'blue':hpf('blue')>hpf('red')?'blue':'red';
      if(w!=='draw')S.wins[w]++;
      const done=S.wins.blue>=2||S.wins.red>=2||S.round>=5;
      const txt=w==='draw'?'ROUND DRAW':w==='blue'?'ROUND WON!':'ROUND LOST';
      sfx(w==='blue'?700:220,.4,'triangle',.07);
      banner(txt,w==='blue'?'#ffc820':w==='red'?'#ff4b3e':'#ffffff',2.2,done
        ?()=>end(S.wins.blue>S.wins.red?'blue':S.wins.red>S.wins.blue?'red':'draw')
        :()=>{S.round++;resetRound();banner('ROUND '+S.round,'#ffc820',1.4)});
    }
  }
  else{
    const others=S.B.filter(b=>!b.out&&b!==S.me).length;
    if(S.me.out)return end('sd',others+1);
    if(others===0)return end('sd',1);
  }
}

function end(w,rank){
  S.over=true;running=false;document.getElementById('toast').style.display='none';
  const h=document.getElementById('res'),me=S.me,D=DIFF[difficulty].label.toUpperCase(),ko=`${me.kills} KO${me.kills===1?'':'S'}`;
  let sub;
  if(MODE==='showdown'){
    h.textContent=rank===1?'#1 VICTORY!':'RANK #'+rank;
    h.style.color=rank===1?'#ffc820':rank<=4?'#2f7dff':'#ff4b3e';
    sub=`SHOWDOWN · ${me.def.name} · ${ko} · ${me.cubes} POWER CUBE${me.cubes===1?'':'S'} · ${D} BOTS`;
    w=rank<=4?'blue':'red';
  } else {
    h.textContent=w==='blue'?'VICTORY!':w==='red'?'DEFEAT':'DRAW';
    h.style.color=w==='blue'?'#ffc820':w==='red'?'#ff4b3e':'#ffffff';
    sub=MODE==='gem'
      ?`GEM GRAB · ${me.def.name} · ${ko} · BLUE ${teamGems('blue')} vs RED ${teamGems('red')} GEMS · ${D} BOTS`
      :`KNOCKOUT · ${me.def.name} · ${ko} · ROUNDS ${S.wins.blue} - ${S.wins.red} · ${D} BOTS`;
  }
  document.getElementById('resSub').textContent=sub;
  document.getElementById('over').style.display='grid';
  sfx(w==='blue'?660:200,.6,'triangle',.08);
}

/* ---------- menu ---------- */
function buildMenu(){
  const g=document.getElementById('grid');g.innerHTML='';
  BRAWLERS.forEach((d,i)=>{
    const c=document.createElement('button');c.className='card'+(i===chosen?' sel':'');
    c.innerHTML=`<span class="from">${d.from}</span><div class="av" style="background:${d.color}">${d.emoji}</div><b>${d.name}</b><i>${d.role}</i>
      <div class="stat" title="Health"><div style="width:${Math.round(d.hp/7000*100)}%"></div></div>
      <p><em>Attack:</em> ${d.atk}<br><em>Super:</em> ${d.sup}</p>`;
    c.onclick=()=>{chosen=i;buildMenu()};
    c.ondblclick=start;
    g.appendChild(c);
  });
}
function start(){
  if(!AC){try{AC=new (window.AudioContext||window.webkitAudioContext)()}catch(e){}}
  document.getElementById('menu').style.display='none';newGame();
}
document.getElementById('play').onclick=start;
document.getElementById('again').onclick=newGame;
document.getElementById('change').onclick=()=>{document.getElementById('over').style.display='none';document.getElementById('menu').style.display='flex';S=null;running=false};
function save(k,v){try{localStorage.setItem(k,v)}catch(e){}}
function load(k){try{return localStorage.getItem(k)}catch(e){return null}}
function buildDiff(){
  for(const el of document.querySelectorAll('.diff')){
    el.innerHTML='<span>ENEMY BOTS</span>'+Object.keys(DIFF).map(k=>`<button data-d="${k}" class="${k===difficulty?'on':''}">${DIFF[k].label}</button>`).join('');
    el.querySelectorAll('button').forEach(btn=>btn.onclick=()=>{difficulty=btn.dataset.d;save('widbs-diff',difficulty);buildDiff()});
  }
}
function buildModes(){
  for(const el of document.querySelectorAll('.modes')){
    el.innerHTML=Object.keys(MODES).map(k=>`<button data-m="${k}" class="${k===MODE?'on':''}"><span>${MODES[k].emoji}</span>${MODES[k].label}</button>`).join('');
    el.querySelectorAll('button').forEach(btn=>btn.onclick=()=>{MODE=btn.dataset.m;save('widbs-mode',MODE);buildModes()});
  }
  document.getElementById('modeSub').innerHTML=`<span class="g">${MODES[MODE].label.toUpperCase()}</span> · ${MODES[MODE].desc}`;
}
{const d=load('widbs-diff');if(DIFF[d])difficulty=d;const m=load('widbs-mode');if(MODES[m])MODE=m}
buildDiff();
buildModes();
buildMenu();
