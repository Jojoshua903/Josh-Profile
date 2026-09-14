/* ===================== OVERWORLD (multi-map regio) ===================== */
const STARTERS = ["Fionn","Daniel","Marlin Miami"];  // Grass / Fire / Water
const TILE=40, VC=15, VR=11;
let CUR=null, WMAP=null, wkeysBound=false, wraf=null, playerHop=0;
/* vloeiende beweging (Pokémon-stijl): vaste stap-duur, sub-tegel glijden */
let poffx=0, poffy=0, stepT=0, stepDx=0, stepDy=0, lastFrame=0, pendingEnc=null, pendingEncDouble=false, lastDir=null, encCD=0;
const STEP_MS=165;
const HELD={up:0,down:0,left:0,right:0};
function resetMove(){ poffx=0; poffy=0; stepT=0; stepDx=0; stepDy=0; pendingEnc=null; pendingEncDouble=false; }
let DLG={open:false, closable:false};
const MAPCACHE={};

/* regio-ketting: town -> route -> stad(gym) -> route -> stad(gym) ... -> league */
const GYM_ORDER=['goeij','deboer','hugens','abdullah','duiven','doremalen','deroode','vark'];
const REGION=[
 {id:'town',kind:'town',name:'Widr Town'},
 {id:'route1',kind:'route',name:'Route 1',rival:true},
 {id:'city1',kind:'city',name:'Grasdorp',gym:'goeij'},
 {id:'route2',kind:'route',name:'Route 2'},
 {id:'city2',kind:'city',name:'Vechtstad',gym:'deboer'},
 {id:'route3',kind:'route',name:'Route 3'},
 {id:'city3',kind:'city',name:'Baguetteburg',gym:'hugens'},
 {id:'route4',kind:'route',name:'Route 4'},
 {id:'grot1',kind:'cave',name:'Duistere Grot'},
 {id:'city4',kind:'city',name:'Rotsstad',gym:'abdullah'},
 {id:'route5',kind:'route',name:'Route 5'},
 {id:'city5',kind:'city',name:'Windstad',gym:'duiven'},
 {id:'route6',kind:'route',name:'Route 6'},
 {id:'bos1',kind:'forest',name:'Fluisterwoud'},
 {id:'city6',kind:'city',name:'Chemdorp',gym:'doremalen'},
 {id:'route7',kind:'route',name:'Route 7'},
 {id:'grot2',kind:'cave',name:'Kristalgrot'},
 {id:'city7',kind:'city',name:'Formulestad',gym:'deroode'},
 {id:'route8',kind:'route',name:'Route 8'},
 {id:'city8',kind:'city',name:'Zwartgatstad',gym:'vark'},
 {id:'route9',kind:'route',name:'Victory Road'},
 {id:'league',kind:'league',name:'Widr League'}
];

/* ---- map builders ---- */
function grid(w,h,fill){ const g=[]; for(let y=0;y<h;y++){ const r=[]; for(let x=0;x<w;x++) r.push(fill); g.push(r);} return g; }
function border(g){ const h=g.length,w=g[0].length; for(let x=0;x<w;x++){g[0][x]='T';g[h-1][x]='T';} for(let y=0;y<h;y++){g[y][0]='T';g[y][w-1]='T';} }
function rectFill(g,x0,y0,w,h,ch){ for(let y=y0;y<y0+h;y++) for(let x=x0;x<x0+w;x++) if(g[y]&&g[y][x]!==undefined) g[y][x]=ch; }
/* markeer de deur-tegel van een gebouw als 'D' (in te lopen) */
function setDoor(g,b){ const dx=b.x+Math.floor(b.w/2), dy=b.y+b.h-1; if(g[dy]&&g[dy][dx]!==undefined) g[dy][dx]='D'; b.door={x:dx,y:dy}; }

function buildMap(def){
  if(def.kind==='town') return buildTown(def);
  if(def.kind==='route') return buildRoute(def);
  if(def.kind==='city') return buildCity(def);
  if(def.kind==='forest') return buildForest(def);
  if(def.kind==='cave') return buildCave(def);
  return buildLeague(def);
}
/* BOS: bijna volledig hoog gras — je wordt door battles gedwongen. Bomen als hindernis. */
function buildForest(def){
  const w=15,h=21, g=grid(w,h,'.'); border(g);
  const sx=7,nx=7;
  rectFill(g,1,1,w-2,h-2,'G');   // alles gras
  [[3,3,2,2],[10,5,3,3],[2,9,2,3],[11,10,3,3],[4,13,3,2],[2,16,2,2],[10,16,3,3],[9,7,2,2],[5,18,2,2]]
    .forEach(r=>rectFill(g,r[0],r[1],r[2],r[3],'T'));
  g[0][nx]='N'; g[h-1][sx]='S';
  const items=placeItems(g,def.id,[{x:3,y:6,kind:'superbal',n:1,label:'Superbal'},{x:13,y:13,kind:'xp',n:1,label:'Snoepje'},{x:12,y:4,kind:'money',n:500,label:'munten'},{x:8,y:9,kind:'potion',n:2,label:'Drankje'}]);
  const raw=ROUTE_TRAINERS[def.id]||[];
  const npcs=raw.map(mkFoeNpc);
  return {tiles:g,buildings:[],npcs,exitN:nx,exitS:sx,w,h,name:def.name,mapid:def.id,items,bg:'#1f3d1a',encRate:0.26,pool:null};
}
/* GROT: groot donker doolhof met cave-floor ('c'), zijgangen, items en hoge encounter-kans. */
function buildCave(def){
  const w=19,h=25, g=grid(w,h,'H'); // rots overal
  const sx=9,nx=9;
  // hoofdgang van ingang naar uitgang
  carvePathCh(g,[[9,23],[9,19],[4,19],[4,14],[14,14],[14,9],[6,9],[6,4],[9,4],[9,1]],'c');
  // zijgangen naar item-nissen
  [ [[4,19],[2,19],[2,22]], [[9,19],[12,19],[12,22]], [[14,14],[17,14],[17,11]],
    [[6,9],[2,9],[2,6]], [[14,9],[17,9],[17,6]] ].forEach(b=>carvePathCh(g,b,'c'));
  // open grotkamers (sfeer + extra encounter-ruimte)
  rectFill(g,3,15,4,3,'c'); rectFill(g,11,10,4,3,'c'); rectFill(g,7,5,3,3,'c'); rectFill(g,2,20,3,3,'c'); rectFill(g,11,20,3,3,'c');
  // items neerleggen (alleen als nog niet opgeraapt)
  const baseItems=[
    {x:2,y:22,kind:'superbal',n:2,label:'Superbal'}, {x:12,y:22,kind:'money',n:600,label:'munten'},
    {x:17,y:11,kind:'widrball',n:5,label:'Widrball'}, {x:2,y:6,kind:'superbal',n:1,label:'Superbal'},
    {x:17,y:6,kind:'money',n:900,label:'munten'}, {x:6,y:16,kind:'xp',n:1,label:'Snoepje'},
    {x:13,y:11,kind:'hyperbal',n:1,label:'Hyperbal'}, {x:8,y:6,kind:'superpotion',n:1,label:'Super Drankje'} ];
  if(def.id==='grot1') baseItems.push({x:7,y:6,kind:'hm',hm:'smash',n:1,label:'HM Krachtsmash'});
  // fossiel diep in de grot verstopt (per grot een ander fossiel)
  const CAVE_FOSSIL={grot1:'fossil_bot', grot2:'fossil_amber'};
  if(CAVE_FOSSIL[def.id]) baseItems.push({x:9,y:5,kind:CAVE_FOSSIL[def.id],n:1,label:'Fossiel'});
  if(def.id==='grot2') baseItems.push({x:8,y:7,kind:'fossil_vuur',n:1,label:'Vuurfossiel'});   // lava-lijn Zenith→Bing→Casper
  const items=placeItems(g,def.id,baseItems);
  g[0][nx]='N'; g[h-1][sx]='S';
  const raw=ROUTE_TRAINERS[def.id]||[];
  const npcs=raw.map(mkFoeNpc);
  return {tiles:g,buildings:[],npcs,exitN:nx,exitS:sx,w,h,name:def.name,mapid:def.id,items,bg:'#14121c',encRate:0.34,pool:null};
}
function buildTown(def){
  const w=13,h=13, g=grid(w,h,'.'); border(g);
  const exN=6; g[0][exN]='N'; for(let y=1;y<h-1;y++) g[y][exN]='P';
  // decoratie (weg bij de deuren en het pad)
  g[3][3]='T'; g[4][10]='T'; g[11][3]='T';
  const buildings=[
    {kind:'lab',x:8,y:2,w:3,h:3},
    {kind:'home',x:2,y:8,w:3,h:2},
    {kind:'mart',x:9,y:8,w:3,h:2}
  ];
  buildings.filter(b=>b.kind==='lab'||b.kind==='home'||b.kind==='mart').forEach(b=>setDoor(g,b));
  scatterDeco(g,def.id);
  return {tiles:g,buildings,npcs:[],exitN:exN,exitS:null,w,h,name:def.name,pool:null};
}
/* pad-carve: garandeert een beloopbare 'P'-corridor langs de waypoints */
function carveSeg(g,x0,y0,x1,y1,ch){
  ch=ch||'P'; let x=x0,y=y0;
  const put=()=>{ const c=g[y]&&g[y][x]; if(c!==undefined&&c!=='N'&&c!=='S') g[y][x]=ch; };
  put();
  while(x!==x1){ x+=x1>x?1:-1; put(); }
  while(y!==y1){ y+=y1>y?1:-1; put(); }
}
function carvePath(g,pts,ch){ for(let i=0;i<pts.length-1;i++) carveSeg(g,pts[i][0],pts[i][1],pts[i+1][0],pts[i+1][1],ch); }
function carvePathCh(g,pts,ch){ carvePath(g,pts,ch); }
/* strooit decoratie op lege grond ('.') zodat geen enkele map leeg aanvoelt.
   Beloopbaar (bloemen/plassen) mag overal; blokkers alleen waar ze niks afsluiten. */
/* welke sfeer-decoratie past bij welk biome — géén groene heggen/bloemen in woestijn of sneeuw */
const DECO_BY_BIOME={
  grassland:{flower:true,  puddle:true,  block:['R','e','k','L','s']},
  meadow:   {flower:true,  puddle:true,  block:['R','e','k']},
  forest:   {flower:true,  puddle:true,  block:['R','e','R']},
  beach:    {flower:false, puddle:true,  block:['R']},
  swamp:    {flower:false, puddle:true,  block:['R']},
  desert:   {flower:false, puddle:false, block:['R']},
  snow:     {flower:false, puddle:false, block:['R']},
  mountain: {flower:false, puddle:false, block:['R']},
  urban:    {flower:false, puddle:false, block:['L','k','s','R']},
  night:    {flower:false, puddle:false, block:['R','L']}
};
function scatterDeco(g,idstr){
  const biome=(typeof BIOME_OF!=='undefined'&&BIOME_OF[idstr])||'grassland';
  const D=DECO_BY_BIOME[biome]||DECO_BY_BIOME.grassland;
  let seed=0; for(let i=0;i<(idstr||'x').length;i++) seed+=idstr.charCodeAt(i);
  const H=g.length, W=g[0].length;
  const openAt=(x,y)=>{ const t=(g[y]||[])[x]; return t==='.'||t==='P'||t==='G'||t==='f'||t==='p'; };
  for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){
    if(g[y][x]!=='.') continue;
    const r=hash(x*2+seed, y*3+seed*2);
    if(r<0.18){ if(D.flower) g[y][x]='f'; }
    else if(r<0.225){ if(D.puddle) g[y][x]='p'; }
    else if(r<0.265){
      let open=0, nearDoor=false;
      for(const d of [[0,1],[0,-1],[1,0],[-1,0]]){ if(openAt(x+d[0],y+d[1])) open++; const t=(g[y+d[1]]||[])[x+d[0]]; if(t==='D'||t==='N'||t==='S') nearDoor=true; }
      if(open>=3 && !nearDoor && D.block.length){ const pk=hash(x+seed,y+seed*3); g[y][x]= D.block[Math.floor(pk*D.block.length)%D.block.length]; }
    }
  }
}
/* leg veld-items ('i') neer op beloopbare grond; onthoudt de onderliggende tegel */
function placeItems(g,mapid,list){
  const items={};
  (list||[]).forEach(d=>{ const id=mapid+':'+d.x+','+d.y; const row=g[d.y];
    if(!itemsPicked.has(id) && row && row[d.x]!==undefined && '.GPc'.includes(row[d.x])){
      items[d.x+','+d.y]=Object.assign({id,under:row[d.x]},d); row[d.x]='i';
    }
  });
  return items;
}
const ROUTE_ITEMS={
  route1:[{x:3,y:4,kind:'widrball',n:3,label:'Widrball'}],
  route2:[{x:11,y:3,kind:'superbal',n:1,label:'Superbal'},{x:4,y:9,kind:'xp',n:1,label:'Snoepje'},{x:11,y:6,kind:'potion',n:2,label:'Drankje'},{x:4,y:14,kind:'hm',hm:'cut',n:1,label:'HM Klief'}],
  route3:[{x:16,y:10,kind:'money',n:400,label:'munten'}],
  route4:[{x:3,y:16,kind:'superbal',n:1,label:'Superbal'},{x:2,y:6,kind:'widrball',n:5,label:'Widrball'},{x:14,y:9,kind:'hm',hm:'surf',n:1,label:'HM Surf'},{x:14,y:4,kind:'hyperbal',n:3,label:'Hyperbal'},{x:8,y:9,kind:'money',n:2000,label:'munten'}],
  route5:[{x:5,y:11,kind:'potion',n:1,label:'Drankje'},{x:8,y:9,kind:'hm',hm:'fly',n:1,label:'HM Vlucht'},{x:10,y:5,kind:'xp',n:1,label:'Snoepje'},{x:12,y:3,kind:'hyperbal',n:2,label:'Hyperbal'}],
  route6:[{x:10,y:6,kind:'superbal',n:2,label:'Superbal'},{x:13,y:8,kind:'superpotion',n:2,label:'Super Drankje'}],
  route7:[{x:4,y:4,kind:'money',n:700,label:'munten'},{x:14,y:15,kind:'hyperbal',n:1,label:'Hyperbal'},{x:14,y:4,kind:'herbal',n:1,label:'Kruidenzalf'}],
  route8:[{x:4,y:16,kind:'xp',n:1,label:'Snoepje'},{x:8,y:4,kind:'hyperbal',n:2,label:'Hyperbal'}],
  route9:[{x:16,y:10,kind:'hyperbal',n:1,label:'Hyperbal'},{x:3,y:6,kind:'money',n:1500,label:'munten'},{x:14,y:14,kind:'herbal',n:2,label:'Kruidenzalf'}]
};
/* per-route layouts: eigen sfeer, afmeting, richting, water/obstakels, trainer-posities */
const ROUTE_SPEC={
  route1:{w:15,h:17,bg:'#3a6b2a',sx:7,nx:9,
    path:[[7,15],[7,10],[9,10],[9,1]],
    grass:[[2,9,4,6],[10,3,4,6],[2,3,4,4]],
    choke:[[1,8,13,1]],
    trees:[[6,7],[7,7],[11,11],[12,11],[2,14],[13,5]],
    b:[['house',10,12,{who:'Boer Bram',lines:['Welkom op m\'n boerderijtje! De wilde widrmon blijven m\'n gewassen vertrappen. 🌾'],gift:{kind:'potion',n:3,label:'Drankje'},after:'Kom gerust nog eens langs! 👋'}]],
    crops:[[10,15,3,1]], fences:[[9,15],[13,14],[13,15]],
    signs:[{x:6,y:14,text:'🌱 Route 1 — Widr Town ligt in het zuiden. Hoog gras zit vol wilde widrmon!'}],
    slots:[{x:9,y:6,dir:'down',range:2},{x:11,y:6,dir:'left',range:3}]},
  route2:{w:15,h:21,bg:'#274f22',sx:4,nx:11,
    fill:'T',                                   // dicht bos rondom
    path:[[4,19],[4,8],[11,8],[11,1]],          // L-vorm: langs de westrand omhoog, dan oost naar de uitgang
    pockets:[[3,8,3,12],[3,7,9,3],[10,1,3,8]],  // brede open corridor door het bos (L)
    pgrass:[[3,14,3,2],[10,4,3,2],[5,7,4,2]],   // grasblokken dwars over de corridor (verplichte encounters)
    signs:[{x:4,y:16,text:'🌲 Route 2 — Fluisterbos. Het pad slingert langs de westrand en buigt oost naar boven.'}],
    slots:[{x:4,y:12,dir:'down',range:3},{x:11,y:4,dir:'down',range:2}]},
  route3:{w:21,h:15,bg:'#5f7a2e',sx:3,nx:18,
    path:[[3,13],[3,8],[10,8],[10,4],[18,4],[18,1]],
    grass:[[5,9,4,4],[12,5,5,4],[14,9,5,4],[5,3,4,4]],
    high:[[14,10,3,3]], sand:[[6,11,3,3]], choke:[[7,1,1,13]],
    monument:[19,2],
    signs:[{x:4,y:13,text:'🏜️ Route 3 — Woestijnpas. Neem water mee; het is hier droog en heet.'}],
    trees:[[1,5],[8,3],[8,4],[13,2],[7,12],[17,8],[18,9],[11,10,4,2]],
    slots:[{x:10,y:6,dir:'down',range:2},{x:14,y:4,dir:'left',range:3}]},
  route4:{w:17,h:19,bg:'#37693a',sx:8,nx:8,
    water:[[4,5,9,9]],                          // grote lagune in het midden
    open:[[8,9]],                               // eilandje in de lagune — alleen met Surf te bereiken
    path:[[8,17],[8,15],[2,15],[2,3],[8,3],[8,1]],
    paths:[[[8,15],[15,15],[15,3],[8,3]]],      // de lus loopt links én rechts om het water heen
    sand:[[1,14,15,3],[1,2,15,2]],              // stranden onder en boven
    pgrass:[[1,9,3,4],[13,6,3,4],[5,15,4,2],[5,2,4,2]],   // grasblokken op de oevers
    trees:[[1,8],[15,10],[6,2],[11,16],[1,12],[15,5]],
    signs:[{x:6,y:16,text:'🏖️ Route 4 — Lagune. Loop links of rechts om het water; het eiland haal je met Surf.'}],
    slots:[{x:3,y:10,dir:'down',range:2},{x:14,y:7,dir:'down',range:2}]},
  route5:{w:19,h:17,bg:'#4d7a3a',sx:9,nx:9,
    fill:'#',                                   // rotsberg
    // VIER brede niveaus (3 rijen elk), gescheiden door dunne rotswanden met versprongen openingen
    pockets:[[1,13,17,3],[1,9,17,3],[1,5,17,3],[1,1,17,3]],
    path:[[9,15],[9,13],[4,13],[4,9],[14,9],[14,5],[4,5],[4,3],[9,3],[9,1]],   // opening x4 → x14 → x4 (dwingt je het niveau over te steken)
    ledges:[[10,12,'v'],[6,8,'v'],[10,4,'v']],  // one-way richels op de wanden: hop een niveau omlaag
    pgrass:[[3,11,3,3],[13,7,3,3],[3,3,3,3],[8,13,4,2],[9,10,4,2],[6,5,3,2]],  // brede grasblokken: elke opening (verplicht) + velden per niveau
    deco:[[2,14,'T'],[16,14,'T'],[12,14,'T'],[2,10,'T'],[16,10,'T'],[8,10,'T'],[2,6,'T'],[16,6,'T'],[10,6,'T'],[2,2,'T'],[16,2,'T']],
    signs:[{x:8,y:14,text:'🏔️ Route 5 — Bergpas. Zoek per niveau de opening omhoog; spring van de richels om snel te zakken.'}],
    slots:[{x:11,y:9,dir:'left',range:3}]},
  route6:{w:15,h:21,bg:'#264a20',sx:7,nx:4,
    fill:'T',                                   // dicht naaldbos
    path:[[7,19],[7,16],[4,16],[4,1]],          // U-vorm: onderlangs naar de westarm, dan omhoog naar de uitgang
    paths:[[[7,16],[10,16],[10,5]]],            // oostarm loopt dood (maar loont)
    pockets:[[3,1,3,17],[3,15,9,3],[9,5,3,12]],
    pgrass:[[3,10,3,2],[6,15,3,2],[9,9,3,2]],   // grasblokken op elke arm/de onderbalk
    open:[[13,8]], obs:[[12,8,'x']],            // klief het boompje voor de nis-buit
    signs:[{x:9,y:17,text:'🌲 Route 6 — Wolvenwoud. De westarm leidt naar boven; de oostarm loopt dood.'}],
    slots:[{x:4,y:8,dir:'down',range:3},{x:10,y:10,dir:'up',range:2}]},
  route7:{w:19,h:19,bg:'#33684a',sx:9,nx:9,
    water:[[1,9,17,2]], bridge:[[9,9,1,2]], mud:[[2,7,3,2]],
    path:[[9,17],[9,1]],
    grass:[[3,12,5,5],[12,3,5,5],[3,3,5,5],[12,12,5,5]],
    high:[[12,3,4,4]], choke:[[1,5,17,1,'J']],
    signs:[{x:8,y:15,text:'🐊 Route 7 — Moeras. De modder vertraagt; blijf op de brug boven het water.'}],
    trees:[[6,6],[12,14],[2,7],[16,13]],
    slots:[{x:9,y:14,dir:'down',range:2},{x:11,y:5,dir:'left',range:2}]},
  route8:{w:13,h:21,bg:'#2b4526',sx:6,nx:6,
    fill:'#',                                   // duistere rotskloof
    path:[[6,19],[6,16],[2,16],[2,10],[10,10],[10,4],[6,4],[6,1]],   // S-bocht via de zijkanten
    pockets:[[1,15,11,3],[1,10,3,6],[1,9,11,3],[9,4,3,6],[1,3,11,3]], // drie brede banden + zijlinks
    pgrass:[[4,15,4,2],[1,11,3,2],[4,9,4,2],[9,6,3,2],[4,3,4,2]],     // grasblokken op de banden + verplicht in de links
    signs:[{x:8,y:17,text:'🌙 Route 8 — Nachtkloof. Slinger via de zijkanten omhoog; het is hier pikdonker.'}],
    slots:[{x:7,y:16,dir:'left',range:3},{x:8,y:10,dir:'right',range:2}]},
  route9:{w:19,h:21,bg:'#48483a',sx:9,nx:9,
    path:[[9,19],[9,14],[4,14],[4,8],[14,8],[14,4],[9,4],[9,1]],
    grass:[[10,15,4,4],[15,8,3,5],[3,5,3,4]],
    high:[[10,15,4,4]], sand:[[15,4,3,3]], choke:[[1,11,17,1]],
    open:[[14,14],[14,15]], obs:[[14,16,'o']],   // afgesloten rotsnis: smash het rotsblok voor de buit
    signs:[{x:8,y:18,text:'❄️ Route 9 — Victory Road. Alleen de sterksten bereiken de top. Kleed je warm aan!'}],
    trees:[[2,3,3,3],[12,12,5,5],[2,17,3,3],[15,15,3,4],[11,2,3,3],[2,10,2,4],[6,6,3,2]],
    slots:[{x:4,y:12,dir:'down',range:2},{x:11,y:9,dir:'up',range:2}]}
};
function buildRoute(def){
  const S=ROUTE_SPEC[def.id]||{w:13,h:17,sx:6,nx:6,path:[[6,15],[6,1]],grass:[[2,2,3,3],[8,3,3,4],[2,9,3,4],[8,10,3,3]],trees:[]};
  const w=S.w,h=S.h, g=grid(w,h,'.'); border(g);
  (S.trees||[]).forEach(r=> r.length===4?rectFill(g,r[0],r[1],r[2],r[3],'T'):(g[r[1]]&&g[r[1]][r[0]]!==undefined&&(g[r[1]][r[0]]='T')));
  (S.water||[]).forEach(r=> rectFill(g,r[0],r[1],r[2],r[3],'W'));
  (S.grass||[]).forEach(r=> rectFill(g,r[0],r[1],r[2],r[3],'G'));
  (S.sand||[]).forEach(r=> rectFill(g,r[0],r[1],r[2],r[3],'z'));
  (S.mud||[]).forEach(r=> rectFill(g,r[0],r[1],r[2],r[3],'u'));
  (S.high||[]).forEach(r=> rectFill(g,r[0],r[1],r[2],r[3],'J'));
  if(S.fill) rectFill(g,1,1,w-2,h-2,S.fill);                        // hele binnenkant vullen (bv. rotswand) — de weg wordt er daarna doorheen gesneden
  (S.cliffs||[]).forEach(r=> rectFill(g,r[0],r[1],r[2],r[3],'#'));   // extra rotswanden
  carvePath(g,S.path);                       // hoofdcorridor — snijdt altijd een beloopbare weg door de vulling
  (S.paths||[]).forEach(p=>carvePath(g,p));  // extra vertakkingen/aftakkingen
  (S.bridge||[]).forEach(r=> rectFill(g,r[0],r[1],r[2],r[3],'b'));
  (S.choke||[]).forEach(r=> rectFill(g,r[0],r[1],r[2],r[3], r[4]||'G'));
  (S.pockets||[]).forEach(r=> rectFill(g,r[0],r[1],r[2],r[3],'.'));  // open plekjes uit de vulling gehakt (ná de weg)
  (S.pgrass||[]).forEach(r=> rectFill(g,r[0],r[1],r[2],r[3],'G'));   // grasvelden langs de weg (encounters, overleven de vulling)
  (S.deco||[]).forEach(d=>{ if(g[d[1]]&&g[d[1]][d[0]]!==undefined && g[d[1]][d[0]]!=='P' && g[d[1]][d[0]]!=='N' && g[d[1]][d[0]]!=='S') g[d[1]][d[0]]=d[2]; });
  (S.open||[]).forEach(o=>{ if(g[o[1]]&&g[o[1]][o[0]]!==undefined) g[o[1]][o[0]]='.'; });   // uitgehakte nis/plateau-vloer
  (S.obs||[]).forEach(o=>{ const c=g[o[1]]&&g[o[1]][o[0]]; if(c!==undefined && c!=='P'&&c!=='N'&&c!=='S'&&c!=='b') g[o[1]][o[0]]=o[2]; });
  const canSet=(x,yy,overPath)=>{ const row=g[yy]; if(!row||row[x]===undefined) return false; const c=row[x]; if(c==='N'||c==='S'||c==='D') return false; return overPath||c!=='P'; };
  (S.stairs||[]).forEach(([x,yy])=>{ if(canSet(x,yy,true)) g[yy][x]='/'; });                 // trappen (beloopbaar) — mogen ook op het pad
  (S.ledges||[]).forEach(([x,yy,d])=>{ if(canSet(x,yy,false)) g[yy][x]=d; });                 // one-way ledges — nooit op het hoofdpad
  (S.crops||[]).forEach(r=>{ for(let yy=r[1];yy<r[1]+r[3];yy++) for(let x=r[0];x<r[0]+r[2];x++) if(canSet(x,yy,false)) g[yy][x]=','; });
  (S.fences||[]).forEach(([x,yy])=>{ if(canSet(x,yy,false)) g[yy][x]='='; });
  if(S.monument && canSet(S.monument[0],S.monument[1],false)) g[S.monument[1]][S.monument[0]]='q';
  const signs={};
  (S.signs||[]).forEach(s=>{ if(canSet(s.x,s.y,false)){ g[s.y][s.x]='g'; signs[s.x+','+s.y]=s.text; } });
  const buildings=(S.b||[]).map(([kind,x,yy,extra])=>{ const sz=CITY_SIZE[kind]||[3,2]; return Object.assign({kind,x,y:yy,w:sz[0],h:sz[1]}, extra||{}); });
  buildings.forEach(b=>setDoor(g,b));
  const items=placeItems(g,def.id,ROUTE_ITEMS[def.id]);
  g[0][S.nx]='N'; g[h-1][S.sx]='S';
  const raw=ROUTE_TRAINERS[def.id]||[];
  const npcs=raw.map((t,i)=>{ const sl=(S.slots&&S.slots[i])||{}; return mkFoeNpc(Object.assign({},t,{x:sl.x!=null?sl.x:t.x, y:sl.y!=null?sl.y:t.y, dir:sl.dir||t.dir, range:sl.range||t.range})); });
  scatterDeco(g,def.id);
  return {tiles:g,buildings,npcs,exitN:S.nx,exitS:S.sx,w,h,name:def.name,mapid:def.id,items,signs,bg:S.bg,pool:null};
}
/* per-stad layouts: eigen afmeting, gebouw-opstelling, decoratie (bomen/water/fonteinen) en sfeer */
const CITY_SIZE={gym:[4,4],center:[3,3],mart:[3,2],house:[3,2],base:[3,3],museum:[4,3],cafe:[3,2]};
const CITY_SPEC={
 city1:{w:15,h:15,bg:'#3a6b2a',sx:7,nx:7,
   b:[['gym',9,2],['center',2,2],['mart',2,11],['house',11,11]],
   trees:[[5,6],[13,7],[1,11],[6,12]], water:[[5,9,2,2]], bridge:[[5,10,2,1]],
   paths:[[[7,14],[7,1]],[[2,8],[13,8]]]},
 city2:{w:17,h:15,bg:'#6b5a3a',sx:8,nx:8,
   b:[['gym',11,2],['center',2,2],['mart',2,11],['house',13,11]],
   trees:[[5,6],[14,8],[6,11]],
   paths:[[[8,14],[8,1]],[[2,9],[15,9]]]},
 city3:{w:17,h:16,bg:'#7a6a3a',sx:8,nx:8,
   b:[['gym',11,2],['center',2,2],['mart',2,12],['house',12,12],['museum',11,7]],
   water:[[4,7,3,3]], bridge:[[5,7,1,3]], trees:[[6,5]],
   paths:[[[8,15],[8,1]],[[2,10],[15,10]]]},
 city4:{w:15,h:15,bg:'#5a5040',sx:7,nx:7,
   b:[['gym',9,2],['center',2,2],['mart',2,11],['house',11,11]],
   trees:[[5,6],[6,6],[12,7],[6,10],[1,8]], sand:[[11,6,3,3]],
   paths:[[[7,14],[7,1]],[[2,9],[12,9]]]},
 city5:{w:19,h:15,bg:'#3a6a6a',sx:9,nx:9,
   b:[['gym',13,2],['center',2,2],['mart',2,11],['house',15,11],['cafe',11,11]],
   trees:[[7,6],[11,10],[16,6]],
   paths:[[[9,14],[9,1]],[[2,9],[17,9]]]},
 city6:{w:15,h:15,bg:'#3a4a5a',sx:7,nx:7,
   b:[['gym',9,2],['center',2,3],['mart',10,11],['house',2,11]],
   water:[[4,7,3,2]], bridge:[[5,7,1,2]], trees:[[12,7]],
   paths:[[[7,14],[7,1]],[[2,9],[13,9]]]},
 city7:{w:17,h:15,bg:'#2a2a3a',sx:8,nx:8,
   b:[['gym',11,2],['center',2,2],['mart',2,11],['house',13,11],['cafe',5,11]],
   trees:[[5,6],[14,8]],
   paths:[[[8,14],[8,1]],[[2,9],[15,9]]]},
 city8:{w:17,h:17,bg:'#14121c',sx:8,nx:8,
   b:[['gym',11,2],['center',2,2],['mart',2,13],['house',13,13],['base',11,8]],
   trees:[[5,6],[6,13]],
   paths:[[[8,15],[8,1]],[[2,11],[15,11]]]}
};
/* ambient stadsbewoners: hints, eenmalige cadeautjes en filler-praatjes (zoals gewone Pokémon-NPC's).
   Ze verschijnen alleen als hun tegel open grond is ('.'/'f'/'p') — nooit op een pad, gebouw of water. */
const CITY_NPCS={
 city1:[
   {x:4,y:7,pal:'student',dir:'right',name:'Kind',lines:['Hoog gras zit vol widrmon! Loop erdoorheen om ze te vinden. 🌿','Wist je dat sommige moves op meerdere tegenstanders raken in dubbelgevechten?']},
   {x:10,y:10,pal:'mom',dir:'left',name:'Mevrouw Bram',gift:{kind:'potion',n:3,label:'Drankje'},after:'Rust goed uit in het Widr Center! 💚',lines:['Je ziet er moe uit — hier, neem wat Drankjes mee. 🎁']}],
 city2:[
   {x:5,y:7,pal:'student',dir:'down',name:'Wandelaar',lines:['Op Route 2 ligt de veldkunst Klief 🌿 — hak er kleine boompjes mee weg.','Leer Klief in het Center aan een Plant-type widrmon; dan kan die \'m ook in gevecht gebruiken!']},
   {x:12,y:7,pal:'clerk',dir:'left',name:'Coach',lines:['Type-voordeel is alles. Water klopt Vuur, Vuur klopt Plant, Plant klopt Water. 🔁','Een verslagen team? Loop terug naar een Center en heal gratis. 💚']}],
 city3:[
   {x:5,y:4,pal:'student',dir:'down',name:'Bakker',gift:{kind:'superbal',n:2,label:'Superbal'},after:'Vang er een paar voor mij! 🥐',lines:['Verse baguettes! En hier, een paar Superballen om sterkere widrmon te vangen. 🎁']},
   {x:9,y:12,pal:'clerk',dir:'up',name:'Visser',lines:['Diep water steek je alleen over met Surf 🌊 — die veldkunst ligt op Route 4. Er is zelfs een eilandje met buit!','Leer Surf in het Center aan een Water-type widrmon.']}],
 city4:[
   {x:5,y:3,pal:'guard',dir:'down',name:'Mijnwerker',lines:['Rotsblokken versperren soms een nis. Met Krachtsmash 💥 sla je ze kapot!','Leer Krachtsmash in het Center aan een Vecht-type widrmon.']},
   {x:8,y:10,pal:'student',dir:'up',name:'Geoloog',lines:['Steen-types zijn zwak tegen Water en Plant, maar sterk tegen Vuur en Vlieg. 🪨']}],
 city5:[
   {x:5,y:4,pal:'student',dir:'right',name:'Piloot',lines:['Met Vlucht ✈️ reis je in één tel naar elke stad die je al bezocht hebt!','Vlucht ligt op Route 5 — leer \'m in het Center aan een Vlieg-type widrmon.']},
   {x:12,y:7,pal:'mom',dir:'left',name:'Oma Wind',gift:{kind:'superpotion',n:1,label:'Super Drankje'},after:'De wind staat gunstig vandaag. 🍃',lines:['Zo’n jonge trainer! Neem een Super Drankje van me aan. 🎁']}],
 city6:[
   {x:3,y:7,pal:'clerk',dir:'right',name:'Chemicus',lines:['Gif-types zetten je tegenstander aan het aftellen — elke beurt schade. ☠️','Staal en Steen zijn immuun voor Gif. Onthoud dat!']},
   {x:8,y:10,pal:'student',dir:'up',name:'Leerling',lines:['Als je team vol zit (4), gaan nieuwe vangsten naar de PC in het Center. 🖥️']}],
 city7:[
   {x:5,y:4,pal:'student',dir:'down',name:'Rekenwonder',lines:['STAB = Same Type Attack Bonus: 1,5× schade als de move hetzelfde type is als je widrmon. 🔢'],},
   {x:12,y:7,pal:'clerk',dir:'left',name:'Statisticus',gift:{kind:'hyperbal',n:1,label:'Hyperbal'},after:'De kansen staan in jouw voordeel. 📈',lines:['Voor de laatste gyms heb je betere ballen nodig — hier, een Hyperbal! 🎁']}],
 city8:[
   {x:5,y:4,pal:'grunt',dir:'down',name:'Ex-grunt',lines:['Team Widr is verslagen… ik ben ermee gestopt. Succes bij de League, trainer. 🏆'],},
   {x:9,y:13,pal:'boss',dir:'up',name:'Zwarte Ridder',lines:['Duister-types vrezen Kevers, Spoken en Fee. Hou daar rekening mee tegen de laatste gym. 🌑']}]
};
function buildCity(def){
  const S=CITY_SPEC[def.id]||CITY_SPEC.city1;
  const w=S.w,h=S.h, g=grid(w,h,'.'); border(g);
  (S.trees||[]).forEach(r=> r.length===4?rectFill(g,r[0],r[1],r[2],r[3],'T'):(g[r[1]]&&g[r[1]][r[0]]!==undefined&&(g[r[1]][r[0]]='T')));
  (S.water||[]).forEach(r=> rectFill(g,r[0],r[1],r[2],r[3],'W'));
  (S.sand||[]).forEach(r=> rectFill(g,r[0],r[1],r[2],r[3],'z'));
  (S.high||[]).forEach(r=> rectFill(g,r[0],r[1],r[2],r[3],'J'));
  (S.paths||[]).forEach(p=>carvePath(g,p));
  (S.bridge||[]).forEach(r=> rectFill(g,r[0],r[1],r[2],r[3],'b'));
  (S.deco||[]).forEach(d=>{ if(g[d[1]]&&g[d[1]][d[0]]!==undefined && g[d[1]][d[0]]!=='P' && g[d[1]][d[0]]!=='N' && g[d[1]][d[0]]!=='S' && g[d[1]][d[0]]!=='D') g[d[1]][d[0]]=d[2]; });
  g[0][S.nx]='N'; g[h-1][S.sx]='S';
  const t=TRAINERS.find(x=>x.id===def.gym);
  const buildings=S.b.map(([kind,x,y])=>{ const sz=CITY_SIZE[kind]||[3,3]; const b={kind,x,y,w:sz[0],h:sz[1]}; if(kind==='gym'){ b.gym=def.gym; b.color=TYPE_META[t.type].c; } return b; });
  buildings.filter(b=>b.kind==='gym'||b.kind==='center'||b.kind==='base'||b.kind==='mart'||b.kind==='museum'||b.kind==='cafe').forEach(b=>setDoor(g,b));
  const npcs=[];
  (CITY_NPCS[def.id]||[]).forEach((c,i)=>{
    const row=g[c.y]; if(!row||row[c.x]===undefined) return;
    if(row[c.x]!=='.') return;   // alleen op open grond (vóór decoratie) — nooit op pad/gebouw/water/boom
    npcs.push({kind:'npc', x:c.x, y:c.y, dir:c.dir||'down', pal:c.pal||'student',
      name:c.name||'Inwoner', lines:c.lines||['...'], gift:c.gift||null, after:c.after, gid:def.id+':'+i});
  });
  scatterDeco(g,def.id);
  return {tiles:g,buildings,npcs,exitN:S.nx,exitS:S.sx,w,h,name:def.name,bg:S.bg,pool:null};
}
function buildLeague(def){
  const w=13,h=11, g=grid(w,h,'.'); border(g);
  const exS=6; g[h-1][exS]='S'; for(let y=1;y<h-1;y++) g[y][6]='P';
  const buildings=[ {kind:'hall',x:4,y:2,w:5,h:3} ];
  buildings.forEach(b=>setDoor(g,b));
  const npcs=[{kind:'guard', x:8, y:6, dir:'left', pal:PAL.guard}];   // bewaker bij de ingang van de hal
  return {tiles:g,buildings,npcs,exitN:null,exitS:exS,w,h,name:def.name,pool:null};
}
/* de League Hal: een echte, beloopbare zaal met de Elite Four + Champion als characters (Gen-stijl) */
function leagueFoe(id,x,y,dir){
  const t=TRAINERS.find(z=>z.id===id);
  const base=(t.role==='Champion')?PAL.boss:PAL.leader;
  const pal=Object.assign({},base,{shirt:TYPE_META[t.type].c});
  return mkFoeNpc({id, cls:t.name, e:t.e, x, y, dir:dir||'down', range:5, team:t.team, lvl:trainerLevel(t), role:t.role, pal, taunt:t.flavor});
}
function buildLeagueHall(){
  const w=13,h=25, g=grid(w,h,'F');
  for(let x=0;x<w;x++){ g[0][x]='H'; g[1][x]='H'; g[h-1][x]='H'; }
  for(let y=0;y<h;y++){ g[y][0]='H'; g[y][w-1]='H'; }
  g[h-1][6]='X';                                  // uitgang onderaan
  for(let y=3;y<=22;y++) g[y][6]='r';             // rode loper door de zaal
  [[2,3,'V'],[10,3,'V'],[2,22,'V'],[10,22,'V']].forEach(([x,y,c])=>{ g[y][x]=c; });   // planten in de hoeken
  [[2,7],[10,7],[2,11],[10,11],[2,15],[10,15],[2,19],[10,19]].forEach(([x,y])=>{ g[y][x]='K'; });  // zuilen langs de zijkant
  const npcs=[];
  const e=TRAINERS.filter(t=>t.role==='Elite').sort((a,b)=>a.order-b.order);
  const champT=TRAINERS.find(t=>t.role==='Champion');
  [19,15,11,7].forEach((yy,i)=>{ if(e[i]) npcs.push(leagueFoe(e[i].id,6,yy,'down')); });   // 4 Elite Four op de corridor
  if(champT) npcs.push(leagueFoe(champT.id,6,4,'down'));                                    // Champion bovenaan
  return {tiles:g,buildings:[],npcs,exitN:null,exitS:null,w,h,name:'Widr League',interior:true};
}
function loadMap(){
  const def=REGION[WORLD_STATE.mi];
  if(!MAPCACHE[def.id]) MAPCACHE[def.id]=buildMap(def);
  CUR=MAPCACHE[def.id]; WMAP=CUR.tiles;
  CURBIOME = mkBiome(BIOME_OF[def.id]);   // sfeer/biome van deze regio (grond, gras, bomen, water)
  if(CURBIOME.bg && def.kind!=='cave') CUR.bg = CURBIOME.bg;   // rand-achtergrond meekleuren (grotten blijven donker)
  if((def.kind==='town'||def.kind==='city'||def.kind==='league') && typeof visited!=='undefined') visited.add(WORLD_STATE.mi);  // bezocht → later naartoe vliegen
  syncDynamicNpcs();   // legendaries verschijnen/verdwijnen op basis van voortgang
  // veiligheid: opgeslagen positie buiten de (nieuwe) mapgrootte of op een obstakel → terug naar de ingang
  const tx=WORLD_STATE.x, ty=WORLD_STATE.y, tt=tileAt(tx,ty);
  if(tx<1||ty<1||tx>CUR.w-2||ty>CUR.h-2||tt==='T'||tt==='W'||tt==='H'||tt==='#'||tt==='g'||tt==='='||tt==='q'){
    WORLD_STATE.x=CUR.exitS!=null?CUR.exitS:Math.floor(CUR.w/2);
    WORLD_STATE.y=CUR.h-2;
  }
}

/* ---- interieurs (gebouwen inlopen) ---- */
let INSIDE=null;
const INT_NAME={lab:'Widr Lab',center:'Widr Center',gym:'Gym',hall:'League Hall',home:'Thuis',base:'Team Widr-basis',mart:'Pokémart',museum:'Fossielmuseum',cafe:'Widr Café',house:'Huisje'};
/* meubels per interieur — tiles: K=kast/schap, C=balie, M=machine, V=plant, A=tafel, r=tapijt(loopbaar), B=bed */
const INT_PROPS={
  center:[[2,2,'K'],[3,2,'K'],[11,2,'K'],[12,2,'K'],[5,3,'M'],[9,3,'M'],[1,8,'V'],[13,8,'V'],[2,7,'A'],[12,7,'A']],
  lab:[[2,2,'K'],[3,2,'K'],[4,2,'K'],[10,2,'K'],[11,2,'K'],[12,2,'K'],[5,3,'M'],[9,3,'M'],[2,7,'A'],[3,7,'A'],[11,7,'A'],[12,7,'A'],[1,5,'V'],[13,5,'V']],
  gym:[[1,2,'K'],[13,2,'K'],[3,3,'V'],[11,3,'V'],[5,6,'r'],[6,6,'r'],[7,6,'r'],[8,6,'r'],[9,6,'r'],[5,7,'r'],[6,7,'r'],[7,7,'r'],[8,7,'r'],[9,7,'r'],[2,8,'A'],[12,8,'A']],
  mart:[[2,2,'K'],[3,2,'K'],[4,2,'K'],[10,2,'K'],[11,2,'K'],[12,2,'K'],[5,3,'C'],[6,3,'C'],[8,3,'C'],[9,3,'C'],[2,6,'K'],[3,6,'K'],[11,6,'K'],[12,6,'K'],[1,8,'V'],[13,8,'V']],
  home:[[2,3,'B'],[3,3,'B'],[11,3,'A'],[12,3,'A'],[1,7,'V'],[13,7,'V'],[6,7,'r'],[7,7,'r'],[8,7,'r']],
  house:[[2,3,'B'],[3,3,'B'],[11,3,'A'],[12,3,'A'],[1,7,'V'],[13,7,'V'],[6,8,'r'],[7,8,'r'],[8,8,'r']],
  hall:[[2,2,'V'],[12,2,'V'],[4,3,'K'],[10,3,'K'],[5,6,'r'],[6,6,'r'],[7,6,'r'],[8,6,'r'],[9,6,'r'],[5,7,'r'],[6,7,'r'],[7,7,'r'],[8,7,'r'],[9,7,'r'],[2,8,'A'],[12,8,'A']],
  base:[[2,2,'M'],[3,2,'M'],[11,2,'M'],[12,2,'M'],[1,6,'K'],[2,6,'K'],[12,6,'K'],[13,6,'K'],[5,8,'A'],[9,8,'A']],
  museum:[[2,2,'A'],[3,2,'A'],[5,2,'A'],[6,2,'A'],[8,2,'A'],[9,2,'A'],[11,2,'A'],[12,2,'A'],[1,6,'V'],[13,6,'V'],[2,8,'K'],[12,8,'K']],
  cafe:[[2,2,'C'],[3,2,'C'],[4,2,'C'],[1,5,'A'],[2,5,'A'],[12,5,'A'],[13,5,'A'],[1,8,'A'],[2,8,'A'],[12,8,'A'],[13,8,'A'],[6,6,'V'],[8,6,'V'],[11,2,'K'],[12,2,'K']]
};
/* elke gymleider een eigen look (haar/huid/broek + accessoire); shirt blijft hun type-kleur als hint */
const GYM_PAL={
  goeij:   {skin:'#f0c9a4',hair:'#6b4a2a',pants:'#3a3550',glasses:true},              // studieplein-juf, bril
  deboer:  {skin:'#e6ad7c',hair:'#241a12',pants:'#1e1e1e',longhair:true},             // sportlerares, staart
  hugens:  {skin:'#efc9a2',hair:'#141414',pants:'#40332a',hat:'#111'},                // Frans, baret
  abdullah:{skin:'#c6874f',hair:'#201509',pants:'#5a4a2e',hat:'#7a5a34'},             // aardrijkskunde, ontdekkershoed
  duiven:  {skin:'#f2d3b3',hair:'#d8d2c4',pants:'#556677'},                           // global perspectives, lichtgrijs haar
  doremalen:{skin:'#ecc49a',hair:'#8a8f96',pants:'#333',glasses:true},               // scheikunde, grijzend + bril
  deroode: {skin:'#f0c6a2',hair:'#7a1f3a',pants:'#2a2436',glasses:true},             // wiskunde, roodbruin haar + bril
  vark:    {skin:'#d9b48f',hair:'#0e0e16',pants:'#0e0e14',shades:true}               // natuurkunde, duister + zonnebril
};
function buildInterior(b){
  if(b.kind==='hall') return buildLeagueHall();
  const w=15,h=11, g=grid(w,h,'F');
  for(let x=0;x<w;x++){ g[0][x]='H'; g[1][x]='H'; g[h-1][x]='H'; }
  for(let y=0;y<h;y++){ g[y][0]='H'; g[y][w-1]='H'; }
  const ex=Math.floor(w/2); g[h-1][ex]='X';           // uitgang onderaan
  const cx=Math.floor(w/2);
  const npcs=[];
  if(b.kind==='center')   npcs.push({kind:'nurse', x:cx,y:3,pal:PAL.nurse});
  else if(b.kind==='lab') npcs.push({kind:'rector',x:cx,y:3,pal:PAL.rector});
  else if(b.kind==='hall')npcs.push({kind:'guard', x:cx,y:3,pal:PAL.guard});
  else if(b.kind==='gym'){ const t=TRAINERS.find(x=>x.id===b.gym);
    npcs.push({kind:'gymleader',x:cx,y:3,pal:Object.assign({},PAL.leader,GYM_PAL[b.gym]||{},{shirt:TYPE_META[t.type].c}),gym:b.gym,e:t.e}); }
  else if(b.kind==='home'){ npcs.push({kind:'mom',x:cx,y:4,pal:PAL.mom}); }
  else if(b.kind==='house'){ npcs.push({kind:'npc',x:cx,y:4,pal:'clerk',name:b.who||'Bewoner',lines:b.lines||['Welkom! Kom gerust even uitrusten. 😊'],gift:b.gift||null,after:b.after||'Veel plezier op je reis! 👋',gid:'house_'+b.x+'_'+b.y}); }
  else if(b.kind==='mart'){ npcs.push({kind:'clerk',x:cx,y:3,pal:PAL.clerk}); }
  else if(b.kind==='cafe'){ npcs.push({kind:'barista',x:cx,y:3,pal:PAL.clerk}); }
  else if(b.kind==='museum'){ npcs.push({kind:'scientist',x:cx,y:3,pal:PAL.rector}); }
  else if(b.kind==='base'){
    [ mkFoeNpc({id:'b_g1',cls:'Team Widr Grunt',e:'👿',x:4,y:6,team:['Slechte Meiden','Stalker'],lvl:34,role:'Grunt',pal:'grunt',taunt:'De basis is verboden terrein!'}),
      mkFoeNpc({id:'b_g2',cls:'Team Widr Grunt',e:'👿',x:10,y:6,team:['Evil Jax','Hammed'],lvl:34,role:'Grunt',pal:'grunt',taunt:'Je komt niet bij de baas!'}),
      bossFoe('vanduin',6,3,'Dus jij bent die lastige trainer. Team Widr maakt de gc kapot — en jou ook! 😈'),
      bossFoe('provoost',8,3,'Ik ben de échte macht achter Team Widr. Verdwijn! 🦹‍♀️')
    ].filter(f=>!beaten.has(f.id)).forEach(f=>npcs.push(f));
    if(beaten.has('vanduin') && beaten.has('provoost') && !beaten.has('b_druk')){
      npcs.push(mkFoeNpc({id:'b_druk', cls:'Ontketende Druk', e:'🐲', x:7, y:2, team:['Druk'], lvl:46, role:'Evil', pal:'boss', taunt:'⚡ De legende die Team Widr wilde ketenen breekt los! DRUK toont zijn ware kracht — versla hem, dan kun je hem later in de grot vangen!'}));
    }
  }
  (INT_PROPS[b.kind]||[]).forEach(([x,y,ch])=>{
    if(g[y]&&g[y][x]==='F' && !npcs.some(n=>n.x===x&&n.y===y)) g[y][x]=ch;
  });
  return {tiles:g,buildings:[],npcs,exitN:null,exitS:null,w,h,name:INT_NAME[b.kind]||'Binnen',interior:true};
}
function enterBuilding(b){
  if(b.kind==='hall'){
    const bc=(typeof badgeCount==='function'?badgeCount():0);
    if(bc<8){ showDialogue('League-bewaker 🛡️', `Stop! Je hebt ${bc}/8 badges. Kom terug als je alle 8 gym-badges hebt — dan mag je de Elite Four uitdagen.`, []); return; }
  }
  resetMove();
  INSIDE={retMi:WORLD_STATE.mi, retX:WORLD_STATE.x, retY:WORLD_STATE.y};
  CUR=buildInterior(b); WMAP=CUR.tiles;
  WORLD_STATE.x=Math.floor(CUR.w/2); WORLD_STATE.y=CUR.h-2; WORLD_STATE.face='up';
  setMapLabel();
}
function exitBuilding(){
  if(!INSIDE) return;
  resetMove();
  const ret=INSIDE; INSIDE=null;
  WORLD_STATE.mi=ret.retMi; loadMap();
  WORLD_STATE.x=ret.retX; WORLD_STATE.y=ret.retY; WORLD_STATE.face='down';
  setMapLabel(); updateMoney(); saveProgress();
}

/* ---- queries ---- */
function tileAt(x,y){ return (WMAP&&WMAP[y]&&WMAP[y][x]!==undefined)?WMAP[y][x]:'T'; }
function npcAt(x,y){ return CUR?CUR.npcs.find(n=>n.x===x&&n.y===y && !(n.kind==='foe'&&n.team&&beaten.has(n.id)) && !(n.kind==='legend'&&caught.has(n.sp))):null; }
function inBuilding(x,y){ return CUR&&CUR.buildings.some(b=>x>=b.x&&x<b.x+b.w&&y>=b.y&&y<b.y+b.h && !(b.door&&b.door.x===x&&b.door.y===y)); }
const LEDGE_DIR={v:[0,1], '>':[1,0], '<':[-1,0]};   // one-way ledges: spring omlaag/rechts/links
function walkable(x,y){ const t=tileAt(x,y);
  if(t==='W') return canHM('surf') && !inBuilding(x,y) && !npcAt(x,y);   // diep water: alleen met Surf
  return !'TWHBKCMVAReLksxov<>#g=q'.includes(t)&&!inBuilding(x,y)&&!npcAt(x,y);  // trees/water/rots/kliffen/ledges/bordjes/hek blokkeren; '/'(trap) en ','(gewas) zijn beloopbaar
}
/* ---- veldkunsten (HM's): echte moves, aangeleerd aan een geschikte widrmon (Gen 1-4 stijl) ---- */
const HM_GATE={cut:1, smash:2, surf:3, fly:2};        // aantal badges vóór gebruik op de map
const HM_NAME={cut:'Klief 🌿', smash:'Krachtsmash 💥', surf:'Surf 🌊', fly:'Vlucht ✈️'};
const HM_MOVE={cut:'HM_Cut', smash:'HM_Smash', surf:'HM_Surf', fly:'HM_Fly'};  // welke move hoort bij welke veldkunst
const HM_TYPE={cut:'Grass', smash:'Fighting', surf:'Water', fly:'Flying'};      // welk type de move mag leren
const HM_TYPE_NL={Grass:'Plant', Fighting:'Vecht', Water:'Water', Flying:'Vlieg'};
function hasHM(k){ return typeof hms!=='undefined' && hms.has(k); }
function partyKnowsHM(k){ return typeof party!=='undefined' && party.some(m=>(m.moves||[]).includes(HM_MOVE[k])); }
function hmBlock(k){   // null = bruikbaar, anders een reden (Nederlands)
  if(!hasHM(k)) return `je hebt ${HM_NAME[k]} nog niet gevonden`;
  if((typeof badgeCount==='function'?badgeCount():0) < (HM_GATE[k]||0)) return `${HM_NAME[k]} werkt pas na ${HM_GATE[k]} badge(s) 🏅`;
  if(!partyKnowsHM(k)){ const mv=moveByKey(HM_MOVE[k]); return `geen widrmon in je team kent ${mv?mv.n:HM_NAME[k]} — leer 'm aan in het Widr Center`; }
  return null;
}
function canHM(k){ return !hmBlock(k); }

/* ---- palettes ---- */
const PAL={
  akker:{skin:'#f4c9a0',hair:'#5b3a1e',longhair:true,shirt:'#e3350d',pants:'#33384a'},
  keeren:{skin:'#f4c9a0',hair:'#2a2320',shirt:'#2a75bb',pants:'#33384a',hat:'#e3350d'},
  rector:{skin:'#efc39a',hair:'#cfcfcf',shirt:'#ffffff',pants:'#4a4a55',glasses:true},
  rival:{skin:'#f4c9a0',hair:'#141414',shirt:'#222',pants:'#333',shades:true},
  nurse:{skin:'#f4c9a0',hair:'#ff7aa8',longhair:true,shirt:'#ffd1e0',pants:'#ffffff',hat:'#ff5d8f'},
  leader:{skin:'#efc39a',hair:'#3a2a1a',shirt:'#888',pants:'#333'},
  guard:{skin:'#efc39a',hair:'#1a1a1a',shirt:'#6f35fc',pants:'#222',hat:'#151321'},
  student:{skin:'#f0c49a',hair:'#3a2a1a',shirt:'#4a90d9',pants:'#2a3550'},
  grunt:{skin:'#e9bd93',hair:'#0d0d0d',shirt:'#6a1b6a',pants:'#1a1a1a',hat:'#3a0d3a'},
  boss:{skin:'#e9bd93',hair:'#12121a',shirt:'#2a0d3a',pants:'#151321',shades:true},
  mom:{skin:'#f2c39a',hair:'#7a4a2a',longhair:true,shirt:'#e88bb0',pants:'#5a5a6a'},
  clerk:{skin:'#f0c49a',hair:'#2a2320',shirt:'#2a9d5a',pants:'#2a2320',hat:'#1f7a44'}
};
function playerPal(){ return (player&&player.id==='akker')?PAL.akker:PAL.keeren; }

/* ---- render helpers ---- */
function hash(x,y){ let h=(x*73856093)^(y*19349663); h=Math.imul(h^(h>>>13),1274126177); return ((h>>>0)%1000)/1000; }
const FLOWCOL=['#ff5d73','#ffd23f','#ff9f45','#c58bff','#ffffff'];
/* ===== BIOMES: elke regio krijgt eigen sfeer (weide, bos, woestijn, sneeuw, berg, moeras, kust, stad, nacht) =====
   Elke biome hertint grond, gras, pad, water én de boom-vorm. Meadow = de originele groene look (default). */
const BIOME_DEFAULT={
  g1:'#79c95f', g2a:'rgba(255,255,255,.05)', g2b:'rgba(0,0,0,.04)',
  blade:'#5aa848', bladeStyle:'grass', flower:true,
  tall1:'#48ad42', tall2:'#3f9a3a',
  highBg:'#2f6b2a', high1:'#37913a', high2:'#2f7d2c',
  path1:'#d8c48c', pathSpeck:'rgba(120,90,40,.14)', pathEdge:'rgba(150,120,60,.4)',
  trunk:'#6b3f1d', trunkShade:'#4f2d13', foliage:'#236e2c', foliageMid:'#2f8f3a', foliageTop:'#45ac4d',
  treeStyle:'leaf',
  water:'#3f7cc4', waterDeep:'rgba(30,70,130,.45)', waterCrest:'rgba(255,255,255,.55)',
  bg:'#3a6b2a'
};
const BIOMES={
  meadow:{},
  grassland:{g1:'#7fce63', bg:'#3a6b2a'},
  forest:{g1:'#5f9c48', g2b:'rgba(0,0,0,.07)', blade:'#4d8a3c', tall1:'#3f9a3a', tall2:'#2f7d2c',
    highBg:'#254f22', high1:'#347f31', high2:'#286a24',
    path1:'#b79a6a', foliage:'#1c5a24', foliageMid:'#256e2c', foliageTop:'#357f36', bg:'#1f3d1a'},
  desert:{g1:'#e3cf94', g2a:'rgba(255,255,255,.10)', g2b:'rgba(150,120,60,.12)', blade:'#c9b06a', bladeStyle:'dune', flower:false,
    tall1:'#cdb96e', tall2:'#b8a052', highBg:'#b89a55', high1:'#cdb96e', high2:'#a98f48',
    path1:'#cbb06a', pathSpeck:'rgba(150,120,50,.2)', trunk:'#8a6a3a',
    foliage:'#4e7a3a', foliageMid:'#5f9445', foliageTop:'#6fa050', treeStyle:'cactus', water:'#4ba5c4', bg:'#c9a86a'},
  snow:{g1:'#e8eef5', g2a:'rgba(255,255,255,.4)', g2b:'rgba(150,175,205,.12)', blade:'#c2d2e2', bladeStyle:'sparkle', flower:false,
    tall1:'#d2e2ee', tall2:'#bcd3e2', highBg:'#c2d4e0', high1:'#dbeaf2', high2:'#bcd3e2',
    path1:'#cfd8e2', pathSpeck:'rgba(150,170,190,.18)', trunk:'#5b4636',
    foliage:'#2e5a3e', foliageMid:'#3a6b4a', foliageTop:'#eaf2f8', treeStyle:'snowpine',
    water:'#8fc0dc', waterDeep:'rgba(120,160,200,.4)', waterCrest:'rgba(255,255,255,.7)', bg:'#c8d6e2'},
  mountain:{g1:'#b7ac97', g2a:'rgba(255,255,255,.06)', g2b:'rgba(60,50,40,.10)', blade:'#9a9078', bladeStyle:'pebble', flower:false,
    tall1:'#94a06c', tall2:'#7f8c58', highBg:'#6a6a52', high1:'#94a06c', high2:'#7f8c58',
    path1:'#a89a80', pathSpeck:'rgba(80,70,55,.2)', trunk:'#5b4636',
    foliage:'#1f5a34', foliageMid:'#2a6b40', foliageTop:'#357f4a', treeStyle:'pine', water:'#5a8fb8', bg:'#8a8070'},
  swamp:{g1:'#5a6a3f', g2a:'rgba(120,140,90,.08)', g2b:'rgba(0,0,0,.12)', blade:'#4a5a33', bladeStyle:'grass', flower:false,
    tall1:'#4f6a3a', tall2:'#3f5a2c', highBg:'#2e3f22', high1:'#43602f', high2:'#33482a',
    path1:'#7a7048', pathSpeck:'rgba(50,45,25,.2)', trunk:'#4a3a28',
    foliage:'#2a4a2c', foliageMid:'#35592f', foliageTop:'#456a3a', treeStyle:'dead',
    water:'#4a6a4a', waterDeep:'rgba(30,60,40,.5)', waterCrest:'rgba(180,200,150,.4)', bg:'#2b3a26'},
  beach:{g1:'#ecd9a6', g2a:'rgba(255,255,255,.12)', g2b:'rgba(150,120,60,.10)', blade:'#cbb478', bladeStyle:'dune', flower:false,
    tall1:'#9ec27a', tall2:'#8ab36a', highBg:'#7a9858', high1:'#9ec27a', high2:'#8ab36a',
    path1:'#e0c98f', trunk:'#8a6a3a', foliage:'#2e7d44', foliageMid:'#3f9a53', foliageTop:'#55b06a', treeStyle:'palm',
    water:'#3fb0d0', waterDeep:'rgba(30,120,150,.4)', waterCrest:'rgba(255,255,255,.6)', bg:'#3a6a6a'},
  urban:{g1:'#9aa0a8', g2a:'rgba(255,255,255,.06)', g2b:'rgba(0,0,0,.07)', blade:'#8a9098', bladeStyle:'none', flower:false,
    tall1:'#6f9a5a', tall2:'#5f8a4a', highBg:'#4a5a3a', high1:'#5f8a4a', high2:'#4f7a3a',
    path1:'#b8b0a4', pathSpeck:'rgba(0,0,0,.08)', trunk:'#6b4a2d',
    foliage:'#2e7d34', foliageMid:'#3f9a43', foliageTop:'#55b055', treeStyle:'leaf', water:'#4a86c0', bg:'#5a5a62'},
  night:{g1:'#3a3a52', g2a:'rgba(120,120,200,.06)', g2b:'rgba(0,0,0,.16)', blade:'#4a4a68', bladeStyle:'sparkle', flower:false,
    tall1:'#3a4a5a', tall2:'#2f3a4a', highBg:'#26263a', high1:'#3a4a5a', high2:'#2f3a4a',
    path1:'#5a5a72', pathSpeck:'rgba(0,0,0,.22)', trunk:'#2a2a3a',
    foliage:'#1a2a3a', foliageMid:'#26384a', foliageTop:'#35506a', treeStyle:'pine',
    water:'#2a3a6a', waterDeep:'rgba(20,20,60,.5)', waterCrest:'rgba(150,150,220,.45)', bg:'#1a1a2a'}
};
const BIOME_OF={
  town:'grassland', route1:'grassland', city1:'grassland',
  route2:'forest', city2:'urban',
  route3:'desert', city3:'grassland',
  route4:'beach', grot1:'mountain', city4:'mountain',
  route5:'mountain', city5:'beach',
  route6:'forest', bos1:'forest', city6:'swamp',
  route7:'swamp', grot2:'mountain', city7:'night',
  route8:'night', city8:'night',
  route9:'snow', league:'night'
};
function mkBiome(name){ return Object.assign({}, BIOME_DEFAULT, BIOMES[name]||{}); }
let CURBIOME=null;
function drawFlower(ctx,cx,cy,seed){ const c=FLOWCOL[Math.floor(seed*FLOWCOL.length)%FLOWCOL.length]; ctx.fillStyle=c; for(let a=0;a<5;a++){ const ang=a/5*Math.PI*2; ctx.beginPath(); ctx.arc(cx+Math.cos(ang)*3,cy+Math.sin(ang)*3,2.1,0,7); ctx.fill(); } ctx.fillStyle='#ffe15a'; ctx.beginPath(); ctx.arc(cx,cy,1.7,0,7); ctx.fill(); }
function drawGround(ctx,px,py,x,y){
  const B=CURBIOME||BIOME_DEFAULT;
  ctx.fillStyle=B.g1; ctx.fillRect(px,py,TILE,TILE);
  ctx.fillStyle=((x+y)%2===0)?B.g2a:B.g2b; ctx.fillRect(px,py,TILE,TILE);
  const st=B.bladeStyle;
  if(st==='grass'){
    ctx.strokeStyle=B.blade; ctx.lineWidth=2;
    for(let k=0;k<3;k++){ const r=hash(x*4+k,y*7),bx=px+5+r*30,by=py+30+hash(x+k,y)*7; ctx.beginPath(); ctx.moveTo(bx,by); ctx.lineTo(bx-2,by-6); ctx.moveTo(bx,by); ctx.lineTo(bx+2,by-6); ctx.stroke(); }
  } else if(st==='pebble'){
    ctx.fillStyle=B.blade; for(let k=0;k<3;k++){ const r=hash(x*4+k,y*7); ctx.beginPath(); ctx.arc(px+6+r*28,py+9+hash(x+k,y)*24,1.8+r*1.6,0,7); ctx.fill(); }
  } else if(st==='dune'){
    ctx.strokeStyle=B.blade; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(px+3,py+13+Math.sin(x)*2); ctx.quadraticCurveTo(px+TILE/2,py+9,px+TILE-3,py+13); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px+4,py+26+Math.cos(y)*2); ctx.quadraticCurveTo(px+TILE/2,py+22,px+TILE-4,py+26); ctx.stroke();
  } else if(st==='sparkle'){
    ctx.fillStyle=B.blade; for(let k=0;k<4;k++){ const r=hash(x*5+k,y*3); if(r<0.5){ ctx.fillRect(px+5+hash(x+k,y)*30,py+6+r*56,1.6,1.6);} }
    const fr2=hash(x*9,y*11); if(fr2<0.22){ ctx.fillStyle='rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(px+9+fr2*90,py+12+fr2*70,1.5,0,7); ctx.fill(); }
  } else if(st==='ember'){
    ctx.fillStyle=B.blade; for(let k=0;k<3;k++){ const r=hash(x*4+k,y*7); ctx.beginPath(); ctx.arc(px+6+r*28,py+10+hash(x+k,y)*24,2,0,7); ctx.fill(); }
    const er=hash(x*7,y*13); if(er<0.16){ ctx.fillStyle='rgba(255,140,50,.7)'; ctx.beginPath(); ctx.arc(px+10+er*110,py+18,1.6,0,7); ctx.fill(); }
  }
  if(B.flower){ const fr=hash(x*13,y*17); if(fr<0.08) drawFlower(ctx,px+10+hash(x,y)*20,py+12+hash(y,x)*16,fr); }
}
function drawPath(ctx,px,py,x,y){
  const B=CURBIOME||BIOME_DEFAULT;
  ctx.fillStyle=B.path1; ctx.fillRect(px,py,TILE,TILE);
  ctx.fillStyle=B.pathSpeck; for(let k=0;k<5;k++) ctx.fillRect(px+hash(x*5+k,y)*34,py+hash(x,y*5+k)*34,3,3);
  ctx.strokeStyle=B.pathEdge||'rgba(150,120,60,.4)'; ctx.lineWidth=1;
  if(tileAt(x,y-1)!=='P'){ctx.beginPath();ctx.moveTo(px,py+1);ctx.lineTo(px+TILE,py+1);ctx.stroke();}
  if(tileAt(x,y+1)!=='P'){ctx.beginPath();ctx.moveTo(px,py+TILE-1);ctx.lineTo(px+TILE,py+TILE-1);ctx.stroke();}
}
function drawExit(ctx,px,py,north){ ctx.fillStyle='#d8c48c'; ctx.fillRect(px,py,TILE,TILE); ctx.fillStyle='#151321'; ctx.font='bold 16px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(north?'▲':'▼',px+TILE/2,py+TILE/2); }
function drawWater(ctx,px,py,x,y,time){
  const B=CURBIOME||BIOME_DEFAULT;
  ctx.fillStyle=B.water; ctx.fillRect(px,py,TILE,TILE);
  ctx.fillStyle=B.waterDeep; ctx.fillRect(px,py+TILE*0.55,TILE,TILE*0.45);
  ctx.strokeStyle=B.waterCrest; ctx.lineWidth=2;
  for(let k=0;k<2;k++){ const wy=py+11+k*15+Math.sin(time*1.6+x*0.7+k*1.3)*2.2; ctx.beginPath(); ctx.moveTo(px+5,wy); ctx.quadraticCurveTo(px+TILE/2,wy-3.5,px+TILE-5,wy); ctx.stroke(); }
}
function drawCaveFloor(ctx,px,py,x,y){
  ctx.fillStyle=((x+y)%2===0)?'#3a3548':'#332f42'; ctx.fillRect(px,py,TILE,TILE);
  ctx.fillStyle='rgba(0,0,0,.22)'; for(let k=0;k<3;k++){ const r=hash(x*3+k,y*5); ctx.fillRect(px+4+r*30,py+6+hash(x,y*2+k)*28,3,2); }
  ctx.strokeStyle='rgba(0,0,0,.3)'; ctx.lineWidth=1; ctx.strokeRect(px+.5,py+.5,TILE-1,TILE-1);
}
function drawItem(ctx,px,py,x,y,time){
  const it=CUR&&CUR.items&&CUR.items[x+','+y]; const under=it?it.under:'.';
  if(under==='c') drawCaveFloor(ctx,px,py,x,y);
  else if(under==='G') drawTallGrass(ctx,px,py,x,y,time);
  else if(under==='J') drawHighGrass(ctx,px,py,x,y,time);
  else if(under==='z') drawSand(ctx,px,py,x,y);
  else if(under==='u') drawMud(ctx,px,py,x,y);
  else if(under==='P') drawPath(ctx,px,py,x,y);
  else drawGround(ctx,px,py,x,y);
  const cy=py+TILE/2+Math.sin(time*2.4+x)*1.6;
  ctx.fillStyle='rgba(255,220,120,.3)'; ctx.beginPath(); ctx.arc(px+TILE/2,cy,12,0,7); ctx.fill();
  ctx.fillStyle='#ffd94a'; ctx.strokeStyle='#151321'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.arc(px+TILE/2,cy,7,0,7); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#e3350d'; ctx.fillRect(px+TILE/2-7,cy-1,14,2);
  ctx.fillStyle='#151321'; ctx.beginPath(); ctx.arc(px+TILE/2,cy,2.2,0,7); ctx.fill();
}
function drawTallGrass(ctx,px,py,x,y,time){
  const B=CURBIOME||BIOME_DEFAULT;
  drawGround(ctx,px,py,x,y);
  const sway=Math.sin(time*2+x*0.7)*2.2;
  for(let k=0;k<5;k++){ const bx=px+6+k*7,hh=15+hash(x+k,y)*9; ctx.fillStyle=k%2?B.tall1:B.tall2;
    ctx.beginPath(); ctx.moveTo(bx,py+TILE); ctx.quadraticCurveTo(bx+sway,py+TILE-hh/2,bx+sway*1.6,py+TILE-hh); ctx.lineTo(bx+3+sway*1.6,py+TILE-hh+2); ctx.quadraticCurveTo(bx+3+sway,py+TILE-hh/2,bx+4,py+TILE); ctx.closePath(); ctx.fill(); }
}
function drawHighGrass(ctx,px,py,x,y,time){
  const B=CURBIOME||BIOME_DEFAULT;
  // donkerder, dichter en hoger gras — hier gebeuren dubbelgevechten
  ctx.fillStyle=B.highBg; ctx.fillRect(px,py,TILE,TILE);
  ctx.fillStyle=((x+y)%2===0)?'rgba(0,0,0,.06)':'rgba(255,255,255,.04)'; ctx.fillRect(px,py,TILE,TILE);
  const sway=Math.sin(time*1.7+x*0.6)*2.6;
  for(let k=0;k<7;k++){ const bx=px+3+k*5.4,hh=24+hash(x*3+k,y)*12; ctx.fillStyle=k%2?B.high2:B.high1;
    ctx.beginPath(); ctx.moveTo(bx,py+TILE); ctx.quadraticCurveTo(bx+sway,py+TILE-hh/2,bx+sway*1.7,py+TILE-hh); ctx.lineTo(bx+2.6+sway*1.7,py+TILE-hh+2); ctx.quadraticCurveTo(bx+2.6+sway,py+TILE-hh/2,bx+3.4,py+TILE); ctx.closePath(); ctx.fill(); }
}
function drawSand(ctx,px,py,x,y){
  ctx.fillStyle='#e6d09a'; ctx.fillRect(px,py,TILE,TILE);
  ctx.fillStyle=((x+y)%2===0)?'rgba(255,255,255,.10)':'rgba(150,120,60,.10)'; ctx.fillRect(px,py,TILE,TILE);
  ctx.fillStyle='rgba(160,130,70,.35)'; for(let k=0;k<6;k++) ctx.fillRect(px+hash(x*7+k,y)*34,py+hash(x,y*7+k)*34,2,2);
  ctx.strokeStyle='rgba(180,150,90,.25)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(px+3,py+13+Math.sin(x)*2); ctx.quadraticCurveTo(px+TILE/2,py+9,px+TILE-3,py+13); ctx.stroke();
}
function drawMud(ctx,px,py,x,y){
  ctx.fillStyle='#6e5636'; ctx.fillRect(px,py,TILE,TILE);
  ctx.fillStyle='rgba(40,28,14,.4)'; for(let k=0;k<4;k++){ const r=hash(x*5+k,y*3); ctx.beginPath(); ctx.arc(px+6+r*26,py+8+hash(x,y*4+k)*24,3+r*2,0,7); ctx.fill(); }
  ctx.fillStyle='rgba(120,150,170,.25)'; ctx.beginPath(); ctx.ellipse(px+TILE*0.55,py+TILE*0.6,9,5,0,0,7); ctx.fill(); // glinsterende plas
}
function drawBridge(ctx,px,py,x,y,time){
  drawWater(ctx,px,py,x,y,time);
  const vert = (tileAt(x-1,y)==='W'||tileAt(x+1,y)==='W');   // water opzij → je steekt verticaal over
  ctx.strokeStyle='#5b3a1e'; ctx.lineWidth=1.5;
  if(vert){
    ctx.fillStyle='#9c6b3a'; ctx.fillRect(px+4,py,TILE-8,TILE);                    // dek (water zichtbaar links/rechts)
    for(let k=0;k<5;k++){ const lx=px+6+k*7; ctx.beginPath(); ctx.moveTo(lx,py); ctx.lineTo(lx,py+TILE); ctx.stroke(); }  // verticale planken
    ctx.fillStyle='#7a4f28'; ctx.fillRect(px+3,py,3,TILE); ctx.fillRect(px+TILE-6,py,3,TILE);  // randbalken links/rechts
  } else {
    ctx.fillStyle='#9c6b3a'; ctx.fillRect(px,py+4,TILE,TILE-8);                    // dek (water boven/onder)
    for(let k=0;k<5;k++){ const ly=py+6+k*7; ctx.beginPath(); ctx.moveTo(px,ly); ctx.lineTo(px+TILE,ly); ctx.stroke(); }  // horizontale planken
    ctx.fillStyle='#7a4f28'; ctx.fillRect(px,py+3,TILE,3); ctx.fillRect(px,py+TILE-6,TILE,3);  // randbalken boven/onder
  }
}
/* --- decoratie-tegels (meer variatie in elke route/stad) --- */
function drawFlowers(ctx,px,py,x,y){ drawGround(ctx,px,py,x,y); const cx=px+TILE/2,cy=py+TILE/2; for(let k=0;k<5;k++){ const a=k/5*6.28+hash(x,y)*6; const fx=cx+Math.cos(a)*10, fy=cy+Math.sin(a)*9; drawFlower(ctx,fx,fy,hash(x+k,y*2+k)); } }
function drawRock(ctx,px,py,x,y){ drawGround(ctx,px,py,x,y); ctx.fillStyle='rgba(0,0,0,.16)'; ctx.beginPath(); ctx.ellipse(px+TILE/2+2,py+TILE-7,13,5,0,0,7); ctx.fill(); ctx.fillStyle='#8b8b95'; ctx.beginPath(); ctx.moveTo(px+7,py+TILE-6); ctx.lineTo(px+12,py+13); ctx.lineTo(px+26,py+11); ctx.lineTo(px+TILE-5,py+TILE-6); ctx.closePath(); ctx.fill(); ctx.fillStyle='#b6b6c0'; ctx.beginPath(); ctx.moveTo(px+12,py+13); ctx.lineTo(px+20,py+15); ctx.lineTo(px+26,py+11); ctx.closePath(); ctx.fill(); ctx.strokeStyle='#5a5a63'; ctx.lineWidth=1.5; ctx.stroke(); }
function drawHedge(ctx,px,py,x,y){ drawGround(ctx,px,py,x,y); ctx.fillStyle='rgba(0,0,0,.14)'; ctx.fillRect(px+4,py+TILE-6,TILE-8,4); ctx.fillStyle='#2e7d34'; ctx.fillRect(px+3,py+8,TILE-6,TILE-12); ctx.fillStyle='#3f9a43'; for(let i=0;i<4;i++)for(let j=0;j<3;j++){ ctx.beginPath(); ctx.arc(px+8+i*7,py+13+j*7,4,0,7); ctx.fill(); } ctx.strokeStyle='#1f5a24'; ctx.lineWidth=1.5; ctx.strokeRect(px+3,py+8,TILE-6,TILE-12); }
function drawLamp(ctx,px,py,x,y,time){ drawGround(ctx,px,py,x,y); const cx=px+TILE/2; ctx.strokeStyle='#3a3630'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(cx,py+TILE-4); ctx.lineTo(cx,py+9); ctx.stroke(); const glow=0.5+0.25*Math.sin(time*3+x); ctx.fillStyle=`rgba(255,220,120,${glow})`; ctx.beginPath(); ctx.arc(cx,py+8,7,0,7); ctx.fill(); ctx.fillStyle='#ffe89a'; ctx.beginPath(); ctx.arc(cx,py+8,4,0,7); ctx.fill(); ctx.strokeStyle='#3a3630'; ctx.lineWidth=1.5; ctx.stroke(); }
function drawBench(ctx,px,py,x,y){ drawGround(ctx,px,py,x,y); ctx.fillStyle='rgba(0,0,0,.15)'; ctx.fillRect(px+5,py+TILE-7,TILE-10,4); ctx.fillStyle='#a9743e'; ctx.fillRect(px+6,py+18,TILE-12,5); ctx.fillRect(px+6,py+12,TILE-12,4); ctx.fillStyle='#7a4f28'; ctx.fillRect(px+8,py+23,3,8); ctx.fillRect(px+TILE-11,py+23,3,8); ctx.strokeStyle='#5b3a1e'; ctx.lineWidth=1; ctx.strokeRect(px+6,py+18,TILE-12,5); }
function drawSign(ctx,px,py,x,y){ drawGround(ctx,px,py,x,y); ctx.fillStyle='#7a4f28'; ctx.fillRect(px+TILE/2-2,py+18,4,14); ctx.fillStyle='#c79a5b'; ctx.fillRect(px+8,py+8,TILE-16,14); ctx.strokeStyle='#5b3a1e'; ctx.lineWidth=1.5; ctx.strokeRect(px+8,py+8,TILE-16,14); ctx.strokeStyle='#8a6a3a'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(px+11,py+13); ctx.lineTo(px+TILE-11,py+13); ctx.moveTo(px+11,py+17); ctx.lineTo(px+TILE-13,py+17); ctx.stroke(); }
function drawPuddle(ctx,px,py,x,y,time){ drawGround(ctx,px,py,x,y); ctx.fillStyle='rgba(90,140,170,.5)'; ctx.beginPath(); ctx.ellipse(px+TILE/2,py+TILE/2+2,12,7,0,0,7); ctx.fill(); ctx.fillStyle='rgba(200,225,240,.4)'; ctx.beginPath(); ctx.ellipse(px+TILE/2-3,py+TILE/2,5,2.5,0,0,7); ctx.fill(); }
/* --- veldkunst-obstakels: kliefbaar boompje ('x') en smashbaar rotsblok ('o') --- */
function drawCutTree(ctx,px,py,x,y){
  drawGround(ctx,px,py,x,y);
  const cx=px+TILE/2;
  ctx.fillStyle='rgba(0,0,0,.16)'; ctx.beginPath(); ctx.ellipse(cx+2,py+TILE-6,11,5,0,0,7); ctx.fill();
  ctx.fillStyle='#6b3f1d'; ctx.fillRect(cx-3,py+TILE-15,6,11);                 // stam
  ctx.fillStyle='#2e7d34'; ctx.beginPath(); ctx.arc(cx,py+15,11,0,7); ctx.fill();  // kruin
  ctx.fillStyle='#3f9a43'; for(let i=0;i<5;i++){ const a=i/5*6.28; ctx.beginPath(); ctx.arc(cx+Math.cos(a)*6,py+15+Math.sin(a)*6,4.5,0,7); ctx.fill(); }
  ctx.fillStyle='rgba(255,255,255,.30)'; ctx.beginPath(); ctx.arc(cx-3,py+11,2.4,0,7); ctx.fill();
  ctx.strokeStyle='#1f5a24'; ctx.lineWidth=1.4; ctx.beginPath(); ctx.arc(cx,py+15,11,0,7); ctx.stroke();
}
function drawBoulder(ctx,px,py,x,y){
  drawGround(ctx,px,py,x,y);
  ctx.fillStyle='rgba(0,0,0,.20)'; ctx.beginPath(); ctx.ellipse(px+TILE/2+2,py+TILE-6,15,6,0,0,7); ctx.fill();
  ctx.fillStyle='#7f7f8a'; ctx.beginPath(); ctx.moveTo(px+6,py+TILE-6); ctx.lineTo(px+9,py+11); ctx.lineTo(px+20,py+6); ctx.lineTo(px+TILE-7,py+12); ctx.lineTo(px+TILE-5,py+TILE-6); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#a6a6b0'; ctx.beginPath(); ctx.moveTo(px+9,py+11); ctx.lineTo(px+20,py+6); ctx.lineTo(px+23,py+17); ctx.lineTo(px+12,py+19); ctx.closePath(); ctx.fill();
  ctx.strokeStyle='#54545d'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(px+17,py+8); ctx.lineTo(px+19,py+20); ctx.lineTo(px+13,py+TILE-8); ctx.stroke();
}
/* --- structuur-tegels: ledges, kliffen, trappen, bordjes, hek, gewas, monument --- */
function drawLedge(ctx,px,py,x,y,dir){
  drawGround(ctx,px,py,x,y);
  ctx.fillStyle='#9c7b4a';
  if(dir==='v'){
    ctx.fillRect(px,py+TILE-12,TILE,12); ctx.fillStyle='#7a5f38'; ctx.fillRect(px,py+TILE-12,TILE,3);
    ctx.fillStyle='rgba(0,0,0,.28)'; ctx.fillRect(px,py+TILE-3,TILE,3);
    ctx.fillStyle='rgba(255,255,255,.55)'; ctx.beginPath(); ctx.moveTo(px+TILE/2-5,py+TILE-9); ctx.lineTo(px+TILE/2+5,py+TILE-9); ctx.lineTo(px+TILE/2,py+TILE-4); ctx.closePath(); ctx.fill();
  } else if(dir==='>'){
    ctx.fillRect(px+TILE-12,py,12,TILE); ctx.fillStyle='#7a5f38'; ctx.fillRect(px+TILE-12,py,3,TILE);
    ctx.fillStyle='rgba(0,0,0,.28)'; ctx.fillRect(px+TILE-3,py,3,TILE);
    ctx.fillStyle='rgba(255,255,255,.55)'; ctx.beginPath(); ctx.moveTo(px+TILE-9,py+TILE/2-5); ctx.lineTo(px+TILE-9,py+TILE/2+5); ctx.lineTo(px+TILE-4,py+TILE/2); ctx.closePath(); ctx.fill();
  } else {
    ctx.fillRect(px,py,12,TILE); ctx.fillStyle='#7a5f38'; ctx.fillRect(px+9,py,3,TILE);
    ctx.fillStyle='rgba(0,0,0,.28)'; ctx.fillRect(px,py,3,TILE);
    ctx.fillStyle='rgba(255,255,255,.55)'; ctx.beginPath(); ctx.moveTo(px+9,py+TILE/2-5); ctx.lineTo(px+9,py+TILE/2+5); ctx.lineTo(px+4,py+TILE/2); ctx.closePath(); ctx.fill();
  }
}
function drawCliff(ctx,px,py,x,y){
  const C=(xx,yy)=>tileAt(xx,yy)==='#';
  const up=C(x,y-1), down=C(x,y+1), left=C(x-1,y), right=C(x+1,y);
  // rots-massa (geen per-tegel kader → aangrenzende kliffen vloeien in elkaar over)
  ctx.fillStyle='#6a5a48'; ctx.fillRect(px,py,TILE,TILE);
  ctx.fillStyle='rgba(0,0,0,.09)'; for(let i=0;i<TILE;i+=10){ if((((x*7)+i)>>3)%2===0) ctx.fillRect(px+i,py,5,TILE); }   // verticale schakering
  ctx.fillStyle='rgba(0,0,0,.20)'; for(let k=0;k<2;k++){ const r=hash(x*3+k,y*5); ctx.fillRect(px+5+r*24,py+7+hash(x,y+k)*22,3,7); }  // scheuren
  if(!up){ ctx.fillStyle='#8c7c63'; ctx.fillRect(px,py,TILE,7); ctx.fillStyle='rgba(255,255,255,.20)'; ctx.fillRect(px,py,TILE,2); }   // verlichte bovenrichel
  if(!down){ ctx.fillStyle='rgba(0,0,0,.20)'; ctx.fillRect(px,py+TILE-12,TILE,12); ctx.fillStyle='rgba(0,0,0,.34)'; ctx.fillRect(px,py+TILE-5,TILE,5); }  // wandvoet/overhang-schaduw
  if(!left){ ctx.fillStyle='rgba(0,0,0,.14)'; ctx.fillRect(px,py,4,TILE); }
  if(!right){ ctx.fillStyle='rgba(255,255,255,.07)'; ctx.fillRect(px+TILE-3,py,3,TILE); }
}
function drawStairs(ctx,px,py,x,y){
  ctx.fillStyle='#b7a892'; ctx.fillRect(px,py,TILE,TILE);
  ctx.fillStyle='#8f8069'; for(let i=0;i<4;i++) ctx.fillRect(px+3,py+4+i*9,TILE-6,5);          // treden
  ctx.fillStyle='rgba(255,255,255,.28)'; for(let i=0;i<4;i++) ctx.fillRect(px+3,py+4+i*9,TILE-6,1.5);
  ctx.fillStyle='#8a4b32'; ctx.fillRect(px+2,py,3,TILE); ctx.fillRect(px+TILE-5,py,3,TILE);     // roodbruine leuningen
}
function drawSignpost(ctx,px,py,x,y){
  drawGround(ctx,px,py,x,y);
  ctx.fillStyle='#6b3f1d'; ctx.fillRect(px+TILE/2-2,py+18,4,16);                                // paal
  ctx.fillStyle='#c79a5b'; ctx.fillRect(px+5,py+6,TILE-10,16);                                  // bord
  ctx.strokeStyle='#5b3a1e'; ctx.lineWidth=2; ctx.strokeRect(px+5,py+6,TILE-10,16);
  ctx.strokeStyle='#7a5230'; ctx.lineWidth=1; for(let i=0;i<3;i++){ ctx.beginPath(); ctx.moveTo(px+9,py+10+i*4); ctx.lineTo(px+TILE-9,py+10+i*4); ctx.stroke(); }
}
function drawFence(ctx,px,py,x,y){
  drawGround(ctx,px,py,x,y);
  ctx.fillStyle='#efe7d2'; ctx.strokeStyle='#b7a887'; ctx.lineWidth=1;
  ctx.fillRect(px+1,py+17,TILE-2,4); ctx.strokeRect(px+1,py+17,TILE-2,4);                        // dwarslat
  for(let i=0;i<3;i++){ const fx=px+5+i*11; ctx.beginPath(); ctx.moveTo(fx,py+12); ctx.lineTo(fx+3,py+8); ctx.lineTo(fx+6,py+12); ctx.lineTo(fx+6,py+27); ctx.lineTo(fx,py+27); ctx.closePath(); ctx.fill(); ctx.stroke(); }
}
function drawCrop(ctx,px,py,x,y){
  ctx.fillStyle='#7a5636'; ctx.fillRect(px,py,TILE,TILE);
  ctx.fillStyle='#5f4128'; for(let i=0;i<4;i++) ctx.fillRect(px+2,py+4+i*9,TILE-4,3);            // omgeploegde rijen
  ctx.fillStyle='#4a9a3e'; for(let i=0;i<4;i++){ const r=hash(x+i*3,y*2); if(r<0.75) ctx.fillRect(px+6+(i%2)*9+r*12,py+2+i*9,2,4); }
}
function drawMonument(ctx,px,py,x,y){
  drawGround(ctx,px,py,x,y);
  ctx.fillStyle='rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(px+TILE/2,py+TILE-5,14,5,0,0,7); ctx.fill();
  ctx.fillStyle='#9a9aa2'; ctx.fillRect(px+8,py+7,TILE-16,TILE-10);                              // steen
  ctx.fillStyle='#b6b6be'; ctx.fillRect(px+8,py+7,TILE-16,4);
  ctx.fillStyle='#3a6bd0'; ctx.fillRect(px+13,py+13,TILE-26,12);                                 // blauw paneel
  ctx.strokeStyle='#5a5a63'; ctx.lineWidth=1.5; ctx.strokeRect(px+8,py+7,TILE-16,TILE-10);
}
/* interieur-tegels */
function drawFloor(ctx,px,py,x,y){
  ctx.fillStyle=((x+y)%2===0)?'#d8b985':'#cca871'; ctx.fillRect(px,py,TILE,TILE);
  ctx.strokeStyle='rgba(90,60,20,.18)'; ctx.lineWidth=1; ctx.strokeRect(px+.5,py+.5,TILE-1,TILE-1);
}
function drawWall(ctx,px,py,x,y){
  ctx.fillStyle='#6b4a86'; ctx.fillRect(px,py,TILE,TILE);
  ctx.fillStyle='rgba(255,255,255,.10)'; ctx.fillRect(px,py,TILE,TILE*0.5);
  ctx.strokeStyle='rgba(0,0,0,.22)'; ctx.lineWidth=1;
  ctx.strokeRect(px+.5,py+.5,TILE-1,TILE-1);
  ctx.beginPath(); ctx.moveTo(px,py+TILE*0.5); ctx.lineTo(px+TILE,py+TILE*0.5); ctx.stroke();
}
function drawInDoor(ctx,px,py){
  ctx.fillStyle='#3a2b18'; ctx.fillRect(px+5,py+3,TILE-10,TILE-3);
  ctx.strokeStyle='#151321'; ctx.lineWidth=2; ctx.strokeRect(px+5,py+3,TILE-10,TILE-3);
  ctx.fillStyle='#ffcb05'; ctx.font='bold 15px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('▼',px+TILE/2,py+TILE/2+2);
}
function drawBed(ctx,px,py){
  ctx.fillStyle='#3a6bd0'; ctx.fillRect(px+3,py+6,TILE-6,TILE-9);          // deken
  ctx.fillStyle='#eef3ff'; ctx.fillRect(px+3,py+2,TILE-6,7);               // kussen
  ctx.strokeStyle='#151321'; ctx.lineWidth=2; ctx.strokeRect(px+3,py+2,TILE-6,TILE-5);
  ctx.strokeStyle='rgba(255,255,255,.4)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(px+3,py+9); ctx.lineTo(px+TILE-3,py+9); ctx.stroke();
}
function drawCounter(ctx,px,py){
  ctx.fillStyle='#b9895a'; ctx.fillRect(px,py+13,TILE,TILE-13);
  ctx.fillStyle='#d9a870'; ctx.fillRect(px,py+13,TILE,5);
  ctx.strokeStyle='#151321'; ctx.lineWidth=2; ctx.strokeRect(px,py+13,TILE,TILE-13);
}
function drawShelf(ctx,px,py){
  ctx.fillStyle='#8a5a2a'; ctx.fillRect(px+2,py+2,TILE-4,TILE-6);
  ctx.strokeStyle='#151321'; ctx.lineWidth=2; ctx.strokeRect(px+2,py+2,TILE-4,TILE-6);
  ctx.strokeStyle='#5b3a1e'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(px+2,py+15); ctx.lineTo(px+TILE-2,py+15); ctx.moveTo(px+2,py+25); ctx.lineTo(px+TILE-2,py+25); ctx.stroke();
  const cols=['#e3350d','#4a90d9','#3fae4a','#ffcb05'];
  for(let i=0;i<4;i++){ ctx.fillStyle=cols[i%4]; ctx.fillRect(px+5+(i%2)*16,py+6+Math.floor(i/2)*10,7,7); }
}
function drawMachine(ctx,px,py){
  ctx.fillStyle='#c9cfdd'; ctx.fillRect(px+4,py+4,TILE-8,TILE-8);
  ctx.strokeStyle='#151321'; ctx.lineWidth=2; ctx.strokeRect(px+4,py+4,TILE-8,TILE-8);
  ctx.fillStyle='#7fe3a0'; ctx.fillRect(px+9,py+9,TILE-18,9);
  ctx.fillStyle='#e3350d'; ctx.beginPath(); ctx.arc(px+12,py+27,2.4,0,7); ctx.fill();
  ctx.fillStyle='#4a90d9'; ctx.beginPath(); ctx.arc(px+TILE-12,py+27,2.4,0,7); ctx.fill();
}
function drawPlant(ctx,px,py){
  ctx.fillStyle='#a9713e'; ctx.fillRect(px+11,py+25,TILE-22,9);
  ctx.strokeStyle='#151321'; ctx.lineWidth=1.5; ctx.strokeRect(px+11,py+25,TILE-22,9);
  ctx.fillStyle='#2f8f3a'; ctx.beginPath(); ctx.arc(px+TILE/2,py+16,10,0,7); ctx.arc(px+TILE/2-7,py+22,7,0,7); ctx.arc(px+TILE/2+7,py+22,7,0,7); ctx.fill();
}
function drawTable(ctx,px,py){
  ctx.fillStyle='#a9713e'; ctx.fillRect(px+3,py+13,TILE-6,7);
  ctx.fillStyle='#7a4a22'; ctx.fillRect(px+5,py+20,4,10); ctx.fillRect(px+TILE-9,py+20,4,10);
  ctx.strokeStyle='#151321'; ctx.lineWidth=1.5; ctx.strokeRect(px+3,py+13,TILE-6,7);
}
function drawRug(ctx,px,py,x,y){
  ctx.fillStyle=((x+y)%2===0)?'#c0392b':'#a83226'; ctx.fillRect(px+1,py+1,TILE-2,TILE-2);
  ctx.strokeStyle='#ffcb05'; ctx.lineWidth=2; ctx.strokeRect(px+3.5,py+3.5,TILE-7,TILE-7);
}
function drawTree(ctx,px,py){
  const B=CURBIOME||BIOME_DEFAULT, cx=px+TILE/2;
  ctx.fillStyle='rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(cx+3,py+TILE-4,14,6,0,0,7); ctx.fill();
  const st=B.treeStyle;
  if(st==='pine'||st==='snowpine'){ drawPineTree(ctx,px,py,B,st==='snowpine'); return; }
  if(st==='cactus'){ drawCactus(ctx,px,py,B); return; }
  if(st==='palm'){ drawPalm(ctx,px,py,B); return; }
  if(st==='dead'){ drawDeadTree(ctx,px,py,B); return; }
  // loofboom (biome-getint)
  ctx.fillStyle=B.trunk; ctx.fillRect(cx-4,py+TILE-22,8,18);
  ctx.fillStyle=B.trunkShade; ctx.fillRect(cx+1,py+TILE-22,3,18);
  ctx.strokeStyle='rgba(0,0,0,.25)'; ctx.lineWidth=1; ctx.strokeRect(cx-4,py+TILE-22,8,18);
  ctx.fillStyle=B.foliage; ctx.beginPath(); ctx.arc(cx,py+19,15,0,7); ctx.arc(cx-11,py+25,10,0,7); ctx.arc(cx+11,py+25,10,0,7); ctx.fill();
  ctx.fillStyle=B.foliageMid; ctx.beginPath(); ctx.arc(cx,py+15,14,0,7); ctx.arc(cx-10,py+21,9,0,7); ctx.arc(cx+10,py+21,9,0,7); ctx.fill();
  ctx.fillStyle=B.foliageTop; ctx.beginPath(); ctx.arc(cx-4,py+11,9,0,7); ctx.arc(cx+6,py+13,7,0,7); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.22)'; ctx.beginPath(); ctx.arc(cx-6,py+9,5,0,7); ctx.fill();
}
function drawPineTree(ctx,px,py,B,snow){
  const cx=px+TILE/2;
  ctx.fillStyle=B.trunk; ctx.fillRect(cx-3,py+TILE-11,6,9);
  ctx.fillStyle=B.foliage;
  [[py+8,10],[py+16,13],[py+24,16]].forEach(([ty,w])=>{ ctx.beginPath(); ctx.moveTo(cx,ty-8); ctx.lineTo(cx-w,ty+7); ctx.lineTo(cx+w,ty+7); ctx.closePath(); ctx.fill(); });
  ctx.fillStyle=B.foliageMid;
  [[py+12,8],[py+20,11]].forEach(([ty,w])=>{ ctx.beginPath(); ctx.moveTo(cx,ty-6); ctx.lineTo(cx-w,ty+6); ctx.lineTo(cx+w,ty+6); ctx.closePath(); ctx.fill(); });
  if(snow){ ctx.fillStyle='rgba(255,255,255,.92)';
    [[py+8,10],[py+16,13],[py+24,16]].forEach(([ty,w])=>{ ctx.beginPath(); ctx.moveTo(cx,ty-8); ctx.lineTo(cx-w*0.55,ty-1); ctx.lineTo(cx+w*0.55,ty-1); ctx.closePath(); ctx.fill(); }); }
}
function drawCactus(ctx,px,py,B){
  const cx=px+TILE/2;
  ctx.fillStyle=B.foliage;
  ctx.fillRect(cx-4,py+9,8,TILE-13);                                  // stam
  ctx.fillRect(cx-12,py+18,7,4); ctx.fillRect(cx-12,py+13,4,9);       // linkerarm
  ctx.fillRect(cx+5,py+22,7,4); ctx.fillRect(cx+8,py+16,4,10);        // rechterarm
  ctx.fillStyle=B.foliageMid; ctx.fillRect(cx-2,py+9,3,TILE-13);
  ctx.fillStyle='rgba(0,0,0,.2)'; ctx.fillRect(cx+2,py+9,2,TILE-13);
  ctx.strokeStyle='rgba(255,255,255,.4)'; ctx.lineWidth=1;
  for(let i=0;i<4;i++){ const yy=py+13+i*6; ctx.beginPath(); ctx.moveTo(cx-4,yy); ctx.lineTo(cx-6,yy-1); ctx.moveTo(cx+4,yy); ctx.lineTo(cx+6,yy-1); ctx.stroke(); }
}
function drawPalm(ctx,px,py,B){
  const cx=px+TILE/2;
  ctx.strokeStyle=B.trunk; ctx.lineWidth=5; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(cx-3,py+TILE-4); ctx.quadraticCurveTo(cx-6,py+18,cx+2,py+9); ctx.stroke();
  ctx.strokeStyle=B.foliage; ctx.lineWidth=3;
  for(let i=0;i<6;i++){ const a=Math.PI + i/5*Math.PI; const ex=cx+2+Math.cos(a)*15, ey=py+9+Math.sin(a)*8-2; ctx.beginPath(); ctx.moveTo(cx+2,py+9); ctx.quadraticCurveTo((cx+2+ex)/2, ey-5, ex, ey); ctx.stroke(); }
  ctx.lineCap='butt';
  ctx.fillStyle=B.foliageTop; ctx.beginPath(); ctx.arc(cx+2,py+9,3,0,7); ctx.fill();
  ctx.fillStyle='#6b3f1d'; ctx.beginPath(); ctx.arc(cx+5,py+12,2.2,0,7); ctx.fill();   // kokosnoot
}
function drawDeadTree(ctx,px,py,B){
  const cx=px+TILE/2;
  ctx.strokeStyle=B.trunk; ctx.lineCap='round'; ctx.lineWidth=4;
  ctx.beginPath(); ctx.moveTo(cx,py+TILE-4); ctx.lineTo(cx,py+10); ctx.stroke();
  ctx.lineWidth=2.5;
  ctx.beginPath();
  ctx.moveTo(cx,py+19); ctx.lineTo(cx-10,py+11); ctx.lineTo(cx-13,py+5);
  ctx.moveTo(cx,py+15); ctx.lineTo(cx+10,py+8); ctx.lineTo(cx+12,py+3);
  ctx.moveTo(cx,py+23); ctx.lineTo(cx+7,py+19);
  ctx.stroke(); ctx.lineCap='butt';
}
/* gebouwen */
function bShadow(ctx,px,py,w,h){ ctx.fillStyle='rgba(0,0,0,.16)'; ctx.beginPath(); ctx.ellipse(px+w/2,py+h-4,w/2-4,7,0,0,7); ctx.fill(); }
function shadeHex(hex,amt){ const n=parseInt(hex.slice(1),16); const c=v=>Math.max(0,Math.min(255,v)); const r=c((n>>16)+amt),g=c(((n>>8)&255)+amt),bl=c((n&255)+amt); return '#'+(1<<24|r<<16|g<<8|bl).toString(16).slice(1); }
function drawBuilding(ctx,b,camx,camy){
  const px=(b.x-camx)*TILE, py=(b.y-camy)*TILE, w=b.w*TILE, h=b.h*TILE;
  bShadow(ctx,px,py,w,h);
  ctx.lineWidth=2; ctx.lineJoin='round'; ctx.textAlign='center'; ctx.textBaseline='middle';
  const PAL2={
    gym:{wall:'#e7d9bd',wall2:'#d1bf99',roof:b.color||'#c0392b',trim:'#151321'},
    center:{wall:'#f7f2ea',wall2:'#e7ddcb',roof:'#e3350d',trim:'#a81f08'},
    mart:{wall:'#e8f0f8',wall2:'#cbdcef',roof:'#2f7dd0',trim:'#1b5798'},
    cafe:{wall:'#f4e8cd',wall2:'#e5d1a4',roof:'#9a5a2a',trim:'#653a16'},
    house:{wall:'#f2e7ce',wall2:'#e2d0a8',roof:'#5a8fd0',trim:'#37659f'},
    home:{wall:'#f2e7ce',wall2:'#e2d0a8',roof:'#e08a3c',trim:'#a85e1e'},
    lab:{wall:'#e0e5e3',wall2:'#c4cec9',roof:'#8390a0',trim:'#3f4a55'},
    hall:{wall:'#efe6c4',wall2:'#ddcf98',roof:'#7a5cc0',trim:'#4f3a8e'},
    base:{wall:'#302c40',wall2:'#201c2e',roof:'#5b2a6b',trim:'#9a5ab0'},
    museum:{wall:'#ede7d7',wall2:'#dad2bb',roof:'#b3a887',trim:'#786f5b'}
  };
  const p=PAL2[b.kind]||{wall:'#efe6d0',wall2:'#ded2b6',roof:'#c0392b',trim:'#151321'};
  const dark=(b.kind==='base');
  const peakH=Math.round(h*0.30);
  const fL=px+3, fR=px+w-3, fT=py+peakH+2, fB=py+h-3;   // platte 2D-gevel
  const cx=(fL+fR)/2, wallH=fB-fT, fw=fR-fL;
  ctx.strokeStyle=p.trim;
  // ---- DAK (per type de vorm) ----
  const roofType=(b.kind==='center')?'curve':(b.kind==='lab')?'dome':(b.kind==='mart'||b.kind==='cafe')?'flat':(b.kind==='base')?'jagged':(b.kind==='hall'||b.kind==='museum')?'pediment':'pitch';
  const roofPath=(ox,oy)=>{ ctx.beginPath();
    if(roofType==='pitch'){ ctx.moveTo(fL-2+ox,fT+2+oy); ctx.lineTo(cx+ox,fT-peakH+oy); ctx.lineTo(fR+2+ox,fT+2+oy); ctx.closePath(); }
    else if(roofType==='curve'){ ctx.moveTo(fL-1+ox,fT+2+oy); ctx.quadraticCurveTo(cx+ox,fT-peakH-4+oy,fR+1+ox,fT+2+oy); ctx.closePath(); }
    else if(roofType==='dome'){ ctx.moveTo(fL+ox,fT+2+oy); ctx.arc(cx+ox,fT+2+oy,fw/2,Math.PI,2*Math.PI); ctx.closePath(); }
    else if(roofType==='flat'){ ctx.rect(fL-3+ox,fT-9+oy,fw+6,11); }
    else if(roofType==='jagged'){ const n=Math.max(3,b.w*2); ctx.moveTo(fL-2+ox,fT+2+oy); for(let i=0;i<n;i++){ ctx.lineTo(fL+(i+0.5)/n*fw+ox,fT-peakH+oy); ctx.lineTo(fL+(i+1)/n*fw+ox,fT+2+oy); } ctx.closePath(); }
    else { ctx.rect(fL-3+ox,fT-7+oy,fw+6,9); ctx.moveTo(fL-3+ox,fT-7+oy); ctx.lineTo(cx+ox,fT-peakH+oy); ctx.lineTo(fR+3+ox,fT-7+oy); ctx.closePath(); }
  };
  ctx.fillStyle=p.roof; ctx.strokeStyle=p.trim; roofPath(0,0); ctx.fill(); ctx.stroke();                      // dak (2D)
  if(roofType==='pitch'||roofType==='pediment'){ ctx.strokeStyle='rgba(255,255,255,.25)'; ctx.beginPath(); ctx.moveTo(fL+2,fT); ctx.lineTo(cx,fT-peakH+3); ctx.stroke(); }
  if(roofType==='dome'){ ctx.fillStyle='rgba(255,255,255,.3)'; ctx.beginPath(); ctx.arc(cx-fw*0.18,fT-fw*0.26,4,0,7); ctx.fill(); }
  // ---- voorgevel ----
  let g=ctx.createLinearGradient(0,fT,0,fB); g.addColorStop(0,p.wall); g.addColorStop(1,p.wall2);
  ctx.fillStyle=g; ctx.strokeStyle=p.trim; ctx.fillRect(fL,fT,fw,wallH); ctx.strokeRect(fL,fT,fw,wallH);
  ctx.fillStyle=shadeHex(p.roof,-18); ctx.fillRect(fL,fT,fw,4);   // dakrand/lijst
  // ---- zuilen (hall/museum) op de gevel ----
  if(b.kind==='hall'||b.kind==='museum'){
    const cols=b.w; for(let i=0;i<cols;i++){ const xx=fL+8+i*(fw-16)/(cols-1); ctx.fillStyle='rgba(255,255,255,.6)'; ctx.fillRect(xx-3,fT+6,6,wallH-8); ctx.strokeStyle=p.trim; ctx.strokeRect(xx-3,fT+6,6,wallH-8); }
  }
  // ---- luifel (mart/cafe) ----
  if(b.kind==='mart'||b.kind==='cafe'){
    const ay=fT+5, ah=9, stripe=(b.kind==='cafe')?'#c0392b':'#2f7dd0';
    for(let i=0;i*9<fw;i++){ ctx.fillStyle=i%2?stripe:'#f6f1ea'; ctx.fillRect(fL+i*9,ay,Math.min(9,fw-i*9),ah); }
    ctx.strokeStyle=p.trim; ctx.strokeRect(fL,ay,fw,ah);
  }
  // ---- schoorsteen + rook op het dak (house/home) ----
  if(b.kind==='house'||b.kind==='home'){
    const chx=fR-16, chy=fT-peakH+5; ctx.fillStyle=p.trim; ctx.fillRect(chx,chy,7,peakH);
    ctx.fillStyle='rgba(235,235,235,.5)'; for(let i=0;i<3;i++){ ctx.beginPath(); ctx.arc(chx+3+i*2,chy-2-i*5,2.4+i,0,7); ctx.fill(); }
  }
  // ---- ramen ----
  const glass=dark?'#8ce6ff':'#bfe7ff';
  const awn=(b.kind==='mart'||b.kind==='cafe');
  const winW=Math.round(Math.min(20,fw*0.22)), winH=Math.round(Math.min(20,wallH*0.4));
  const winY=fT+(awn?18:9);
  const drawWin=(wx)=>{
    ctx.fillStyle=glass; ctx.fillRect(wx,winY,winW,winH);
    ctx.fillStyle='rgba(255,255,255,.4)'; ctx.beginPath(); ctx.moveTo(wx+2,winY+winH-3); ctx.lineTo(wx+winW-3,winY+2); ctx.lineTo(wx+winW-3,winY+winH*0.45); ctx.lineTo(wx+winW*0.42,winY+winH-3); ctx.closePath(); ctx.fill();
    ctx.strokeStyle=p.trim; ctx.strokeRect(wx,winY,winW,winH);
    ctx.beginPath(); ctx.moveTo(wx+winW/2,winY); ctx.lineTo(wx+winW/2,winY+winH); ctx.moveTo(wx,winY+winH/2); ctx.lineTo(wx+winW,winY+winH/2); ctx.stroke();
    ctx.fillStyle=p.trim; ctx.fillRect(wx-1,winY+winH,winW+2,2);
  };
  const inset=Math.max(7,Math.round(fw*0.1));
  if(winY+winH<fB-6 && b.kind!=='hall' && b.kind!=='museum'){ drawWin(fL+inset); drawWin(fR-inset-winW); }
  // ---- deur ----
  const dw=Math.min(24,fw*0.3), dh=Math.min(30,wallH*0.55), dx=cx-dw/2, dy=fB-dh;
  const glassDoor=(b.kind==='center'||b.kind==='mart'||b.kind==='lab'||b.kind==='hall'||b.kind==='museum');
  if(glassDoor){ ctx.fillStyle=dark?'#2a3550':'#bfe7ff'; ctx.fillRect(dx,dy,dw,dh); ctx.strokeStyle=p.trim; ctx.strokeRect(dx,dy,dw,dh); ctx.beginPath(); ctx.moveTo(cx,dy); ctx.lineTo(cx,dy+dh); ctx.stroke(); }
  else { ctx.fillStyle=dark?'#1a1626':'#6b431f'; ctx.fillRect(dx,dy,dw,dh); ctx.strokeStyle=p.trim; ctx.strokeRect(dx,dy,dw,dh); ctx.beginPath(); ctx.arc(cx,dy,dw/2,Math.PI,0); ctx.stroke(); ctx.fillStyle='#e9c96a'; ctx.beginPath(); ctx.arc(dx+dw-5,dy+dh/2,1.8,0,7); ctx.fill(); }
  // ---- emblemen / borden / 3D-toppers ----
  ctx.textAlign='center'; ctx.textBaseline='middle';
  if(b.kind==='center'){ const cy=fT-peakH*0.35; ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(cx,cy,7,0,7); ctx.fill(); ctx.strokeStyle='#e3350d'; ctx.stroke(); ctx.fillStyle='#e3350d'; ctx.fillRect(cx-4,cy-1.5,8,3); ctx.fillRect(cx-1.5,cy-4,3,8); }
  else if(b.kind==='gym'){ ctx.fillStyle='#fff'; ctx.fillRect(cx-17,fT+7,34,12); ctx.strokeStyle=p.trim; ctx.strokeRect(cx-17,fT+7,34,12); ctx.fillStyle='#151321'; ctx.font='bold 9px Arial'; ctx.fillText('GYM',cx,fT+13.5);
    ctx.strokeStyle=p.trim; ctx.beginPath(); ctx.moveTo(cx,fT-peakH); ctx.lineTo(cx,fT-peakH-16); ctx.stroke(); ctx.fillStyle=p.roof; ctx.beginPath(); ctx.moveTo(cx,fT-peakH-16); ctx.lineTo(cx+14,fT-peakH-13); ctx.lineTo(cx,fT-peakH-10); ctx.closePath(); ctx.fill();
    if(beaten.has(b.gym)){ ctx.font='15px serif'; ctx.fillText('🏅',fR-10,fT+13); } }
  else if(b.kind==='mart'){ ctx.fillStyle='#fff'; ctx.fillRect(cx-16,fT-3,32,8); ctx.strokeStyle=p.trim; ctx.strokeRect(cx-16,fT-3,32,8); ctx.fillStyle='#1b5798'; ctx.font='bold 8px Arial'; ctx.fillText('MART',cx,fT+1); }
  else if(b.kind==='cafe'){ ctx.font='12px serif'; ctx.fillText('☕',cx,fT-1); }
  else if(b.kind==='lab'){ ctx.fillStyle='#151321'; ctx.font='bold 8px Arial'; ctx.fillText('WIDR LAB',cx,fT+11); }
  else if(b.kind==='hall'){ ctx.fillStyle='#f2e15a'; ctx.font='bold 9px Arial'; ctx.fillText('LEAGUE',cx,fT-peakH*0.45); }
  else if(b.kind==='museum'){ ctx.font='12px serif'; ctx.fillText('🦴',cx,fT-peakH*0.45); }
  else if(b.kind==='base'){ ctx.strokeStyle=p.trim; ctx.beginPath(); ctx.moveTo(cx,fT-peakH); ctx.lineTo(cx,fT-peakH-13); ctx.stroke(); ctx.fillStyle='#e3350d'; ctx.beginPath(); ctx.arc(cx,fT-peakH-14,2.6,0,7); ctx.fill(); ctx.font='13px serif'; ctx.fillText('😈',cx,fT+12); }
}
/* trainer-sprite (getekend, geen emoji) — met kijkrichting */
function drawTrainer(ctx,px,py,pal,time,isPlayer,dir){
  dir=dir||'down';
  if(typeof pal==='string') pal=PAL[pal];
  if(!pal) pal=PAL.student;
  const cx=px+TILE/2;
  const bob=isPlayer?(-playerHop*6):Math.sin(time*2.4+px*0.3)*1.1;
  const b=py+TILE-3+bob;   // voeten
  const ink='#20161f';
  const box=(x,y,w,h,fill)=>{ ctx.fillStyle=fill; ctx.fillRect(x,y,w,h); ctx.strokeStyle=ink; ctx.lineWidth=1; ctx.strokeRect(x+0.5,y+0.5,Math.max(0,w-1),Math.max(0,h-1)); };
  const shade=(x,y,w,h)=>{ ctx.fillStyle='rgba(0,0,0,.16)'; ctx.fillRect(x,y,w,h); };
  const foot=(x,y,w)=>{ ctx.fillStyle=ink; ctx.beginPath(); ctx.ellipse(x,y,w,2.1,0,0,7); ctx.fill(); };
  // grondschaduw
  ctx.fillStyle='rgba(0,0,0,.26)'; ctx.beginPath(); ctx.ellipse(cx,py+TILE-4,10,4,0,0,7); ctx.fill();

  if(dir==='left'||dir==='right'){
    // ---- profiel ---- (teken als 'rechts', spiegel voor 'links')
    ctx.save(); if(dir==='left'){ ctx.translate(cx,0); ctx.scale(-1,1); ctx.translate(-cx,0); }
    box(cx-4,b-9,4,9,pal.pants); box(cx+1,b-9,4,9,pal.pants);            // benen
    foot(cx-2,b-1,3); foot(cx+4,b-1,3.4);                                // schoenen (voorste iets vooruit)
    box(cx-5,b-22,11,14,pal.shirt); shade(cx-5,b-22,3,14);              // lijf (gedraaid, smaller)
    box(cx+2,b-20,3,11,pal.shirt); ctx.fillStyle=pal.skin; ctx.fillRect(cx+2,b-10,3,3);  // arm vooraan
    ctx.fillStyle=pal.skin; ctx.beginPath(); ctx.arc(cx,b-27,7,0,7); ctx.fill(); ctx.strokeStyle=ink; ctx.lineWidth=1; ctx.stroke();  // hoofd
    ctx.fillStyle=pal.skin; ctx.beginPath(); ctx.arc(cx+6.7,b-25.5,1.5,0,7); ctx.fill();  // subtiel neusje
    ctx.fillStyle=pal.hair; ctx.beginPath(); ctx.arc(cx,b-29,7.7,Math.PI*0.72,Math.PI*2.05); ctx.fill(); ctx.fillRect(cx-8,b-31,12,5);  // haar achter+kruin
    if(pal.longhair) ctx.fillRect(cx-8,b-31,4,13);
    ctx.fillStyle=ink; ctx.fillRect(cx+2.8,b-28,1.9,2.4);               // één oog
    if(pal.shades){ ctx.fillStyle=ink; ctx.fillRect(cx+1,b-29,8,3.4); }
    else if(pal.glasses){ ctx.strokeStyle=ink; ctx.lineWidth=1; ctx.strokeRect(cx+1.6,b-29,4,3.2); }
    if(pal.hat){ ctx.fillStyle=pal.hat; ctx.fillRect(cx-8,b-34,15,4); ctx.fillRect(cx+2,b-37,9,4); }  // pet met klep vooruit
    ctx.restore();
  } else {
    const up = dir==='up';
    box(cx-6,b-9,4,9,pal.pants); box(cx+2,b-9,4,9,pal.pants);           // benen
    foot(cx-4,b-1,3.2); foot(cx+4,b-1,3.2);                             // schoenen
    box(cx-8,b-22,16,14,pal.shirt); shade(cx+3,b-22,5,14);              // lijf
    if(up){ ctx.strokeStyle='rgba(0,0,0,.22)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(cx,b-21); ctx.lineTo(cx,b-9); ctx.stroke(); }  // rugnaad
    box(cx-11,b-21,3,11,pal.shirt); box(cx+8,b-21,3,11,pal.shirt);      // armen
    ctx.fillStyle=pal.skin; ctx.fillRect(cx-11,b-11,3,3); ctx.fillRect(cx+8,b-11,3,3);  // handen
    ctx.fillStyle=pal.skin; ctx.beginPath(); ctx.arc(cx,b-27,7,0,7); ctx.fill(); ctx.strokeStyle=ink; ctx.lineWidth=1; ctx.stroke();  // hoofd
    ctx.fillStyle=pal.hair;
    if(up){ ctx.beginPath(); ctx.arc(cx,b-27,7.5,0,Math.PI*2); ctx.fill(); if(pal.longhair) ctx.fillRect(cx-7.6,b-30,15,13); }  // achterhoofd: vol haar
    else { ctx.beginPath(); ctx.arc(cx,b-29,7.7,Math.PI*0.98,Math.PI*2.02); ctx.fill(); ctx.fillRect(cx-7.5,b-31,15,5); if(pal.longhair){ ctx.fillRect(cx-7.6,b-31,3,12); ctx.fillRect(cx+4.6,b-31,3,12); } }
    if(!up){
      ctx.fillStyle=ink; ctx.fillRect(cx-3.2,b-27,1.9,2.4); ctx.fillRect(cx+1.3,b-27,1.9,2.4);   // twee ogen
      ctx.fillStyle='rgba(0,0,0,.3)'; ctx.fillRect(cx-1.2,b-23.5,2.6,1);                          // mond
      if(pal.shades){ ctx.fillStyle=ink; ctx.fillRect(cx-6,b-28,12,3.4); }
      else if(pal.glasses){ ctx.strokeStyle=ink; ctx.lineWidth=1; ctx.strokeRect(cx-4.5,b-28.5,3.6,3.2); ctx.strokeRect(cx+1,b-28.5,3.6,3.2); ctx.beginPath(); ctx.moveTo(cx-0.9,b-27); ctx.lineTo(cx+1,b-27); ctx.stroke(); }
    }
    if(pal.hat){ ctx.fillStyle=pal.hat; ctx.fillRect(cx-8,b-34,16,4); if(!up) ctx.fillRect(cx-4,b-37,8,4); }
  }
}
/* echte mon-afbeelding op de kaart (voor legendaries) — async geladen, cache per naam */
const _fieldImg={};
function fieldSprite(name){
  if(!name) return null;
  if(name in _fieldImg) return _fieldImg[name];
  const bare=(typeof IMG!=='undefined'&&IMG[name])||(monSlug(name)+'.png');
  const im=new Image();
  im.onerror=function(){ im.onerror=null; im.src=bare; };   // val terug naar root als images/ ontbreekt
  im.src='images/'+bare;
  _fieldImg[name]=im; return im;
}
function drawNpc(ctx,n,px,py,time){
  if(n.kind==='legend'){
    const cx=px+TILE/2, pulse=0.5+0.5*Math.sin(time*3);
    ctx.save();
    ctx.fillStyle='rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(cx,py+TILE-4,13,5,0,0,7); ctx.fill();   // schaduw
    const im=fieldSprite(n.sp||n.name);
    if(im && im.complete && im.naturalWidth){
      const box=TILE+14, sc=Math.min(box/im.naturalWidth, box/im.naturalHeight), dw=im.naturalWidth*sc, dh=im.naturalHeight*sc;
      ctx.drawImage(im, cx-dw/2, py+TILE-3-dh, dw, dh);
    } else {
      ctx.font='27px serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(n.e||'✨', cx, py+TILE/2);
    }
    // subtiele sprankels rondom (geen cirkel-achtergrond)
    ctx.fillStyle='#fff'; ctx.globalAlpha=0.5+pulse*0.4; ctx.font='11px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    for(let i=0;i<3;i++){ const a=time*2+i*2.1; ctx.fillText('✦', cx+Math.cos(a)*16, py+TILE/2+Math.sin(a)*13); }
    ctx.restore();
    return;
  }
  drawTrainer(ctx,px,py,n.pal,time,false,n.dir||'down');
  if(n._alert){
    ctx.font='bold 26px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.strokeStyle='#151321'; ctx.lineWidth=4; ctx.strokeText('!',px+TILE/2,py-4);
    ctx.fillStyle='#ffcb05'; ctx.fillText('!',px+TILE/2,py-4);
  }
}

/* ---- render ---- */
function draw(){
  const cv=document.getElementById('worldcanvas'); if(!cv||!CUR) return;
  const ctx=cv.getContext('2d'); const time=performance.now()/1000;
  const fx=WORLD_STATE.x+poffx, fy=WORLD_STATE.y+poffy;
  let camfx=Math.max(0,Math.min(Math.max(0,CUR.w-VC), fx-(VC-1)/2));
  let camfy=Math.max(0,Math.min(Math.max(0,CUR.h-VR), fy-(VR-1)/2));
  const cami=Math.floor(camfx), camj=Math.floor(camfy);
  const offX=Math.round((camfx-cami)*TILE), offY=Math.round((camfy-camj)*TILE);
  ctx.clearRect(0,0,cv.width,cv.height);
  // achtergrond buiten map
  ctx.fillStyle=CUR.interior?'#241a30':(CUR.bg||'#3a6b2a'); ctx.fillRect(0,0,cv.width,cv.height);
  for(let sy=0;sy<=VR;sy++) for(let sx=0;sx<=VC;sx++){
    const mx=cami+sx,my=camj+sy; if(mx<0||my<0||mx>=CUR.w||my>=CUR.h) continue;
    const t=tileAt(mx,my),px=sx*TILE-offX,py=sy*TILE-offY;
    if(t==='P') drawPath(ctx,px,py,mx,my);
    else if(t==='G') drawTallGrass(ctx,px,py,mx,my,time);
    else if(t==='J') drawHighGrass(ctx,px,py,mx,my,time);
    else if(t==='z') drawSand(ctx,px,py,mx,my);
    else if(t==='u') drawMud(ctx,px,py,mx,my);
    else if(t==='b') drawBridge(ctx,px,py,mx,my,time);
    else if(t==='f') drawFlowers(ctx,px,py,mx,my);
    else if(t==='p') drawPuddle(ctx,px,py,mx,my,time);
    else if(t==='R') drawRock(ctx,px,py,mx,my);
    else if(t==='e') drawHedge(ctx,px,py,mx,my);
    else if(t==='L') drawLamp(ctx,px,py,mx,my,time);
    else if(t==='k') drawBench(ctx,px,py,mx,my);
    else if(t==='s') drawSign(ctx,px,py,mx,my);
    else if(t==='W') drawWater(ctx,px,py,mx,my,time);
    else if(t==='c') drawCaveFloor(ctx,px,py,mx,my);
    else if(t==='x') drawCutTree(ctx,px,py,mx,my);
    else if(t==='o') drawBoulder(ctx,px,py,mx,my);
    else if(t==='v') drawLedge(ctx,px,py,mx,my,'v');
    else if(t==='>') drawLedge(ctx,px,py,mx,my,'>');
    else if(t==='<') drawLedge(ctx,px,py,mx,my,'<');
    else if(t==='#') drawCliff(ctx,px,py,mx,my);
    else if(t==='/') drawStairs(ctx,px,py,mx,my);
    else if(t==='g') drawSignpost(ctx,px,py,mx,my);
    else if(t==='=') drawFence(ctx,px,py,mx,my);
    else if(t===',') drawCrop(ctx,px,py,mx,my);
    else if(t==='q') drawMonument(ctx,px,py,mx,my);
    else if(t==='i') drawItem(ctx,px,py,mx,my,time);
    else if(t==='N') drawExit(ctx,px,py,true);
    else if(t==='S') drawExit(ctx,px,py,false);
    else if(t==='F') drawFloor(ctx,px,py,mx,my);
    else if(t==='H') drawWall(ctx,px,py,mx,my);
    else if(t==='X') drawInDoor(ctx,px,py);
    else if(t==='B') { drawFloor(ctx,px,py,mx,my); drawBed(ctx,px,py); }
    else if(t==='C') { drawFloor(ctx,px,py,mx,my); drawCounter(ctx,px,py); }
    else if(t==='K') { drawFloor(ctx,px,py,mx,my); drawShelf(ctx,px,py); }
    else if(t==='M') { drawFloor(ctx,px,py,mx,my); drawMachine(ctx,px,py); }
    else if(t==='V') { drawFloor(ctx,px,py,mx,my); drawPlant(ctx,px,py); }
    else if(t==='A') { drawFloor(ctx,px,py,mx,my); drawTable(ctx,px,py); }
    else if(t==='r') { drawFloor(ctx,px,py,mx,my); drawRug(ctx,px,py,mx,my); }
    else drawGround(ctx,px,py,mx,my);
  }
  const objs=[];
  for(let sy=0;sy<=VR;sy++) for(let sx=0;sx<=VC;sx++){ const mx=cami+sx,my=camj+sy; if(tileAt(mx,my)==='T') objs.push({y:my,fn:()=>drawTree(ctx,sx*TILE-offX,sy*TILE-offY)}); }
  CUR.buildings.forEach(b=>objs.push({y:b.y+b.h-1,fn:()=>drawBuilding(ctx,b,camfx,camfy)}));
  CUR.npcs.forEach(n=>{ if(n.kind==='foe'&&n.team&&beaten.has(n.id))return; if(n.kind==='legend'&&caught.has(n.sp))return; const sx=n.x-cami,sy=n.y-camj; if(sx<-1||sy<-1||sx>VC+1||sy>VR+1)return; objs.push({y:n.y,fn:()=>drawNpc(ctx,n,sx*TILE-offX,sy*TILE-offY,time)}); });
  const psx=(fx-cami)*TILE-offX, psy=(fy-camj)*TILE-offY;
  objs.push({y:WORLD_STATE.y+0.5,fn:()=>{
    if(tileAt(WORLD_STATE.x,WORLD_STATE.y)==='W'){   // surfen: golfje onder de speler
      ctx.fillStyle='rgba(255,255,255,.7)'; ctx.beginPath(); ctx.ellipse(psx+TILE/2,psy+TILE-5,15,6,0,0,7); ctx.fill();
      ctx.fillStyle='rgba(150,205,255,.6)'; ctx.beginPath(); ctx.ellipse(psx+TILE/2,psy+TILE-3,11,4,0,0,7); ctx.fill();
    }
    drawTrainer(ctx,psx,psy,playerPal(),time,true,WORLD_STATE.face||'down');
  }});
  objs.sort((a,b)=>a.y-b.y).forEach(o=>o.fn());
  if(playerHop>0.01) playerHop*=0.8; else playerHop=0;
}
function worldLoop(){
  if(!document.getElementById('screen-world').classList.contains('active')){ wraf=null; lastFrame=0; return; }
  const now=performance.now(); const dt=lastFrame?Math.min(80,now-lastFrame):16; lastFrame=now;
  if(stepT>0){
    stepT-=dt;
    if(stepT<=0){ stepT=0; poffx=0; poffy=0; if(pendingEnc){ const s=pendingEnc, dbl=pendingEncDouble; pendingEnc=null; pendingEncDouble=false; if(dbl) startWildDouble(s, randomWild()); else startWildBattle(s); } }
    else { const r=stepT/STEP_MS; poffx=-stepDx*r; poffy=-stepDy*r; }
  }
  if(stepT<=0 && !DLG.open && !STORY_LOCK){
    const dir = (lastDir&&HELD[lastDir]) ? lastDir : (HELD.up?'up':HELD.down?'down':HELD.left?'left':HELD.right?'right':null);
    if(dir){ const m={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[dir]; tryStep(m[0],m[1]); }
  }
  draw();
  wraf=requestAnimationFrame(worldLoop);
}
function startWorldLoop(){ if(!wraf) worldLoop(); }

/* ---- beweging ---- */
function enterWorld(){
  if(!starterChosen && !INSIDE){ if(!player) pickPlayer('keeren'); renderStarterGrid(); go('starter'); return; }
  STORY_LOCK=false; encCD=6;   // ~6 stappen rust voordat je weer iets tegenkomt
  if(INSIDE){ WORLD_STATE.mi=INSIDE.retMi; WORLD_STATE.x=INSIDE.retX; WORLD_STATE.y=INSIDE.retY; WORLD_STATE.face='down'; INSIDE=null; }
  WORLD_STATE.started=true; if(WORLD_STATE.mi===undefined) WORLD_STATE.mi=0;
  go('world'); loadMap(); updatePartyCount(); updateMoney(); bindWorldKeys(); startWorldLoop();
  setMapLabel();
}
function setMapLabel(){ const el=document.getElementById('map-label'); if(el) el.textContent=CUR?CUR.name:''; }
function updatePartyCount(){ const el=document.getElementById('party-count'); if(el) el.textContent=party.length; }
function updateMoney(){ const el=document.getElementById('w-money'); if(el) el.textContent='🪙 '+money; }
const FACE={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
function changeMap(dir){
  const cur=REGION[WORLD_STATE.mi];
  // gym-gate: je mag een gym-stad niet vooruit verlaten voordat je de gym hebt verslagen
  if(dir>0 && cur && cur.kind==='city' && cur.gym && !beaten.has(cur.gym)){
    const t=TRAINERS.find(x=>x.id===cur.gym);
    const nm=t?t.name:'de gymleider';
    toast('🚧 De weg is geblokkeerd!');
    showDialogue('Wachter 🚧', `Ho! Je komt hier niet langs zonder de badge van ${nm}. Versla eerst de gym van ${cur.name} en kom dan terug. 🏅`, []);
    return;
  }
  const ni=WORLD_STATE.mi+dir; if(ni<0||ni>=REGION.length) return;
  resetMove();
  WORLD_STATE.mi=ni; loadMap();
  if(dir>0){ WORLD_STATE.x=CUR.exitS!=null?CUR.exitS:Math.floor(CUR.w/2); WORLD_STATE.y=CUR.h-2; WORLD_STATE.face='up'; }
  else { WORLD_STATE.x=CUR.exitN!=null?CUR.exitN:Math.floor(CUR.w/2); WORLD_STATE.y=1; WORLD_STATE.face='down'; }
  setMapLabel(); toast(CUR.name); saveProgress();
}
function tryStep(dx,dy){
  if(stepT>0||DLG.open||STORY_LOCK) return false;
  if(!document.getElementById('screen-world').classList.contains('active')) return false;
  WORLD_STATE.face = dx<0?'left':dx>0?'right':dy<0?'up':'down';
  const nx=WORLD_STATE.x+dx, ny=WORLD_STATE.y+dy;
  const t=tileAt(nx,ny);
  if(t==='N'){ changeMap(1); return true; }
  if(t==='S'){ changeMap(-1); return true; }
  if(t==='D'){ const b=CUR.buildings.find(bb=>bb.door&&bb.door.x===nx&&bb.door.y===ny); if(b){ enterBuilding(b);} return true; }
  if(t==='X'){ exitBuilding(); return true; }
  const n=npcAt(nx,ny);
  if(n){ interact(n); return true; }
  // leesbaar bordje / monument: toon tekst en blokkeer
  if(t==='g'||t==='q'){ showSignText(nx,ny,t); return false; }
  // one-way ledge: alleen springen in de richel-richting, anders geblokkeerd
  const LED=LEDGE_DIR[t];
  if(LED){
    if(dx===LED[0] && dy===LED[1]){
      const lx=nx+LED[0], ly=ny+LED[1];
      if(walkable(lx,ly)){
        WORLD_STATE.x=lx; WORLD_STATE.y=ly;
        stepDx=2*LED[0]; stepDy=2*LED[1]; stepT=Math.round(STEP_MS*1.35); poffx=-2*LED[0]; poffy=-2*LED[1]; playerHop=1.8;
        saveProgress(); return true;   // schone sprong (geen encounter)
      }
    }
    return false;   // verkeerde kant op → de richel blokkeert
  }
  // veldkunst-obstakels: klein boompje ('x') kliefbaar, rotsblok ('o') smashbaar
  if(t==='x'||t==='o'){
    const k = t==='x' ? 'cut' : 'smash';
    const why=hmBlock(k);
    if(why){ toast(`${t==='x'?'🌿 Een boompje':'🪨 Een rotsblok'} verspert de weg — ${why}.`); return false; }
    WMAP[ny][nx]='.'; toast(`${HM_NAME[k]}! ✨ De weg is vrij.`);   // opgeruimd (blijft weg deze sessie)
    // val door naar de gewone beweging hieronder (tegel is nu '.')
  } else if(t==='W'){
    const why=hmBlock('surf');
    if(why){ toast(`🌊 Diep water — ${why}.`); return false; }
    // met Surf laat walkable('W') je door → beweging gaat gewoon verder
  }
  if(!walkable(nx,ny)) return false;
  if(t==='i') pickupItem(nx,ny);   // veld-item oprapen (tegel wordt cave-floor)
  // start de glij-animatie naar de nieuwe tegel
  WORLD_STATE.x=nx; WORLD_STATE.y=ny;
  stepDx=dx; stepDy=dy; stepT=STEP_MS; poffx=-dx; poffy=-dy; playerHop=1;
  saveProgress(); checkSight();
  if(!STORY_LOCK){
    if(encCD>0){ encCD--; }   // rustpauze na een gevecht: geen encounter zolang de teller loopt
    else if(t==='J' && Math.random()<((CUR.encRate||0.16)+0.14)){ pendingEnc=randomWild(); pendingEncDouble=true; }   // hoog gras → dubbelgevecht, hogere kans
    else if((t==='G'||t==='c') && Math.random()<(CUR.encRate||0.16)){ pendingEnc=randomWild(); pendingEncDouble=false; }
  }
  return true;
}
function worldMove(dx,dy){ tryStep(dx,dy); }   // on-screen d-pad: één stap
/* Vlucht/Teleport: snel naar een al bezochte stad/dorp (na genoeg badges) */
function flyMenu(){
  if(DLG.open||STORY_LOCK) return;
  if(typeof INSIDE!=='undefined' && INSIDE){ toast('Ga eerst naar buiten om te vliegen. ✈️'); return; }
  const why=hmBlock('fly'); if(why){ toast(`✈️ ${why}.`); return; }
  const dests=[...visited].filter(mi=>REGION[mi]&&mi!==WORLD_STATE.mi).sort((a,b)=>a-b);
  if(!dests.length){ toast('Nog geen andere bezochte plek om naartoe te vliegen.'); return; }
  const btns=dests.map(mi=>({label:`${REGION[mi].name}`, fn:()=>{ closeDialogue(); flyTo(mi); }}));
  btns.push({label:'Annuleer',fn:closeDialogue});
  showDialogue('Vlucht ✈️','Waar wil je heen? (alleen al bezochte steden)', btns);
}
function flyTo(mi){
  resetMove(); WORLD_STATE.mi=mi; loadMap();
  WORLD_STATE.x=CUR.exitS!=null?CUR.exitS:Math.floor(CUR.w/2); WORLD_STATE.y=CUR.h-2; WORLD_STATE.face='up';
  encCD=6; setMapLabel(); toast(`✈️ Aangekomen in ${CUR.name}!`); saveProgress();
}
function pickupItem(x,y){
  const it=CUR.items&&CUR.items[x+','+y];
  if(WMAP[y]&&WMAP[y][x]!==undefined) WMAP[y][x]=(it&&it.under)||'.';
  if(!it) return;
  if(it.kind==='money'){ money+=it.n; if(typeof updateMoney==='function') updateMoney(); toast(`💰 Je vond ${it.n} munten!`); }
  else if(it.kind==='xp'){ const lead=party[0]; if(lead && typeof gainXp==='function'){ toast(`🍬 Snoepje! ${lead.sp} kreeg een flinke dosis ervaring!`); gainXp([{pIdx:0}], (typeof xpNeed==='function'?xpNeed(lead.lvl):40)+5); } }
  else if(it.kind==='hm'){ hms.add(it.hm); toast(`✨ Veldkunst gevonden: ${HM_NAME[it.hm]||it.hm}! Leer 'm in het Widr Center aan een ${HM_TYPE_NL[HM_TYPE[it.hm]]}-type widrmon.`); }
  else { bag[it.kind]=(bag[it.kind]||0)+it.n; toast(`🎒 Je vond ${it.n}× ${it.label}!`); }
  itemsPicked.add(it.id); delete CUR.items[x+','+y]; saveProgress();
}
function showSignText(x,y,t){
  if(DLG.open) return;
  const txt=(CUR.signs&&CUR.signs[x+','+y]) || (t==='q'
    ? 'Een oud stenen monument. De vervaagde inscriptie luidt: "Hier rustten de eerste widrmon-trainers. Reis met respect."'
    : 'Een houten wegwijzer. De tekst is onleesbaar geworden.');
  showDialogue(t==='q'?'🗿 Monument':'🪧 Wegwijzer', txt, []);
}
function worldInteract(){
  if(DLG.open){ if(DLG.closable){ closeDialogue(); DLG._closedAt=Date.now(); } return; }
  if(DLG._closedAt && Date.now()-DLG._closedAt<250) return;   // voorkom dat één toets de dialoog meteen heropent
  if(STORY_LOCK) return;
  const [dx,dy]=FACE[WORLD_STATE.face]||[0,1];
  const fx=WORLD_STATE.x+dx, fy=WORLD_STATE.y+dy;
  const ft=tileAt(fx,fy);
  if(ft==='D'){ const b=CUR.buildings.find(bb=>bb.door&&bb.door.x===fx&&bb.door.y===fy); if(b){ enterBuilding(b); return; } }
  if(ft==='g'||ft==='q'){ showSignText(fx,fy,ft); return; }
  if(ft==='X'){ exitBuilding(); return; }
  const n=npcAt(fx,fy);
  if(n) interact(n);
}
function openRelearn(){
  const btns=party.map((p,i)=>({label:`${byName(p.sp).e} ${p.sp} Lv${p.lvl}`, fn:()=>{ closeDialogue(); relearnPick(i); }}));
  btns.push({label:'Terug',fn:closeDialogue});
  showDialogue('Move-herlener 📚','Welke widrmon wil je een move (her)leren?', btns);
}
function relearnPick(i){
  const p=party[i]; if(!p){ closeDialogue(); return; }
  const cur=new Set(p.moves||[]);
  const opts=learnsetOf(p.sp).filter(o=>o.lvl<=p.lvl && !cur.has(o.key));
  if(!opts.length){ showDialogue('Move-herlener 📚', `${p.sp} kent al elke move die 'ie op Lv ${p.lvl} kan leren! Level up voor meer.`, [{label:'Terug',fn:()=>{ closeDialogue(); openRelearn(); }}]); return; }
  const btns=opts.map(o=>({label:`${o.mv.e||''} ${o.mv.n} · ${o.mv.cat==='status'?'STATUS':'PWR '+o.mv.p}`, fn:()=>{ closeDialogue(); LEARN_QUEUE.push({pIdx:i,key:o.key}); processLearnQueue(); }}));
  btns.push({label:'Terug',fn:()=>{ closeDialogue(); openRelearn(); }});
  showDialogue(`${p.sp} — leerbare moves`, 'Kies een move om te leren (bij 4 moves kies je wat je vervangt):', btns);
}
/* ---- veldkunst (HM) aanleren, Gen 1-4 stijl: een geschikte widrmon leert de move ---- */
function openTeachHM(){
  const owned=['cut','smash','surf','fly'].filter(k=>hasHM(k));
  if(!owned.length){ showDialogue('Veldkunst-meester 📘','Je hebt nog geen veldkunsten (HM\'s) gevonden. Zoek ze op de routes en in grotten!',[{label:'Terug',fn:closeDialogue}]); return; }
  const btns=owned.map(k=>{ const mv=moveByKey(HM_MOVE[k]); return {label:`${HM_NAME[k]} — leert ${mv.n}`, fn:()=>{ closeDialogue(); teachHMPick(k); }}; });
  btns.push({label:'Terug',fn:closeDialogue});
  showDialogue('Veldkunst aanleren 📘','Welke veldkunst wil je een widrmon leren? (alleen het juiste type kan \'m leren)', btns);
}
function teachHMPick(k){
  const mvKey=HM_MOVE[k], mv=moveByKey(mvKey), tp=HM_TYPE[k];
  const compat=party.map((p,i)=>({p,i})).filter(o=>{ const sp=byName(o.p.sp); return sp&&sp.t&&sp.t.includes(tp); });
  if(!compat.length){ showDialogue('Veldkunst aanleren 📘', `Geen enkele widrmon in je team is een ${HM_TYPE_NL[tp]}-type — alleen die kunnen ${mv.n} leren. Vang er eerst eentje!`, [{label:'Terug',fn:()=>{ closeDialogue(); openTeachHM(); }}]); return; }
  const btns=compat.map(o=>{ const knows=(o.p.moves||[]).includes(mvKey); return {label:`${byName(o.p.sp).e} ${o.p.sp} Lv${o.p.lvl}${knows?' ✓ kent al':''}`, fn:()=>{ closeDialogue(); teachHMTo(o.i,k); }}; });
  btns.push({label:'Terug',fn:()=>{ closeDialogue(); openTeachHM(); }});
  showDialogue(`${mv.n} aanleren`, `Welke ${HM_TYPE_NL[tp]}-type widrmon leert ${mv.n}?`, btns);
}
function teachHMTo(i,k){
  const p=party[i]; if(!p){ return; } const mvKey=HM_MOVE[k], mv=moveByKey(mvKey);
  if(!Array.isArray(p.moves)) p.moves=[];
  if(p.moves.includes(mvKey)){ toast(`${p.sp} kent ${mv.n} al.`); return; }
  if(p.moves.length<4){ p.moves.push(mvKey); saveProgress(); toast(`${p.sp} leerde ${mv.n}! ✨`); }
  else { LEARN_QUEUE.push({pIdx:i, key:mvKey}); processLearnQueue(); }   // 4 moves → replace-UI
}
function interact(n){
  if(n.kind==='legend'){
    showDialogue(n.name+' ✨', n.taunt||'Een machtige aanwezigheid...', [
      {label:'Uitdagen! ⚔️',cls:'go',fn:()=>{ closeDialogue(); startLegendBattle(n.sp, n.lvl); }},
      {label:'Nog niet',fn:closeDialogue}
    ]);
    return;
  }
  if(n.kind==='foe'){
    if(n.team && !beaten.has(n.id)){ foeDialogue(n); }
    else showDialogue(n.name, n.role==='Rival'?'Volgende keer pak ik je! 😤':(n.role==='Evil'||n.role==='Grunt')?'…Team Widr trekt zich terug.':'Goed gespeeld, trainer. 👍', []);
    return;
  }
  if(n.kind==='npc'){
    const gid=n.gift?('gift:'+n.gid):null;
    if(n.gift && gid && typeof itemsPicked!=='undefined' && !itemsPicked.has(gid)){
      if(n.gift.kind==='money'){ money+=n.gift.n; if(typeof updateMoney==='function') updateMoney(); }
      else { bag[n.gift.kind]=(bag[n.gift.kind]||0)+n.gift.n; }
      itemsPicked.add(gid); saveProgress();
      showDialogue(n.name, `${(n.lines&&n.lines[0])||'Hier, voor jou!'}  🎁 Je kreeg ${n.gift.n}× ${n.gift.label}!`, []);
      return;
    }
    const line = (n.gift && gid && itemsPicked.has(gid)) ? (n.after||'Veel succes op je reis! 👋')
                 : (n.lines[Math.floor(Math.random()*n.lines.length)]);
    showDialogue(n.name, line, []);
    return;
  }
  if(n.kind==='mom'){ healParty(); showDialogue('Mama', 'Vergeet niet naar De Rector te gaan, lieverd! 💚 (Ik heb je uitgerust.)', []); return; }
  if(n.kind==='clerk'){ openShop(); return; }
  if(n.kind==='barista'){ healParty(); showDialogue('Barista ☕', 'Welkom in het Widr Café! Een kopje op het huis — je team is weer helemaal opgefrist. 💚 Chill hier zoveel je wil.', []); return; }
  if(n.kind==='rector'){
    if(!starterChosen){
      showDialogue('De Rector', 'Ah, daar ben je! Elke trainer begint met één widrmon-partner. Kies wijs — dit wordt je maatje. 🔬', STARTERS.map(s=>({label:`${byName(s).e} ${s}`,cls:'go',fn:()=>{ closeDialogue(); chooseStarterInLab(s); }})));
    } else { healParty(); showDialogue('De Rector', 'Je team is helemaal fit. 💚 Loop naar het noorden, Route 1 in, en versla alle 8 gyms voor de League!', []); }
  }
  else if(n.kind==='nurse'){ healParty(); showDialogue('Zuster', 'Welkom bij het Widr Center! Je widrmon zijn weer helemaal opgeknapt. 💚', [ {label:'🖥️ PC (opslag)',cls:'go',fn:()=>{ closeDialogue(); openPC(); }}, {label:'📘 Veldkunst (HM) aanleren',fn:()=>{ closeDialogue(); openTeachHM(); }}, {label:'📚 Move-herlener',fn:()=>{ closeDialogue(); openRelearn(); }}, {label:'Bedankt!',fn:closeDialogue} ]); }
  else if(n.kind==='scientist'){ openMuseum(); }
  else if(n.kind==='guard'){
    const badges=GYM_ORDER.filter(id=>beaten.has(id)).length;
    if(badges<8){ showDialogue('League-bewaker 🛡️', `Stop! Je hebt ${badges}/8 badges. Versla eerst alle 8 gyms — dan open ik de deur naar de Elite Four.`, []); }
    else showDialogue('League-bewaker 🛡️', 'Alle 8 badges! De League Hall is open. 👑 Loop naar binnen (▲ door de deur) en versla de vier Elite Four op een rij, en daarna de Champion!', []);
  }
  else if(n.kind==='gymleader'){
    const t=TRAINERS.find(x=>x.id===n.gym), done=beaten.has(t.id);
    showDialogue(t.name+' • '+t.type+'-gym', `${t.flavor} ${done?'(al verslagen — revanche kan)':''}`, [ {label:'Uitdagen! ⚔️',cls:'go',fn:()=>{ closeDialogue(); challenge(t.id); }}, {label:'Nee',fn:closeDialogue} ]);
  }
}
function chooseStarterInLab(name){
  caught.add(name); party=[{sp:name,lvl:5,xp:0,moves:defaultMoveKeys(name,5)}]; starterChosen=true; saveProgress();
  const cb=document.getElementById('continue-btn'); if(cb) cb.style.display='';
  updatePartyCount();
  setTimeout(()=>showDialogue('De Rector', `Uitstekende keuze! ${name} is nu je partner. 🎉 Ga naar buiten (▼) en loop naar het noorden, Route 1 in. Let op: loop je in de zichtlijn van een trainer, dan dagen ze je uit — ontwijken kan soms!`, []), 200);
}
/* Per-zone wilde widrmon. Legendaries/mythical (Druk, Isis, Aasta) spawnen nooit wild. */
const WILD_POOLS={
  route1:["Otis","Claire","Adam","Serveerster","Jenna","Marlin Miami","Claudio"],
  route2:["Nathan","Renas","Josh","Milo","Fionn","Devin","Claudio"],
  route3:["Reshman","Kim Chi","Young Fyon","Prei","Sanne Vosters"],
  route4:["Dean","Yassin","Fluharthy","Intratuin Potplant","Daniel","Ash"],
  grot1:["Dean","Otis","Yassin","Reshman","Intratuin Potplant"],
  route5:["Lars","Robin","Johan","Marlin Miami"],
  route6:["Fionn","Young Fyon","Kim Chi","Prei","Reshman","Thomas"],
  bos1:["Fionn","Young Fyon","Kim Chi","Prei","Devin","Reshman"],
  route7:["Jake","Sonia Nevermind","Carol","Lars","Thomas","Marloes"],
  grot2:["Deniz","Meta AI","Dynant","De Kapper","Reshman","Claire","Niek"],
  route8:["Evil Adam","Evil Jax","Slechte Meiden","Hammed","Stalker","Adma Jr"],
  route9:["Fluharthy","Dynant","Meta AI","De Kapper","Kayo & Yara","Deniz","Dean","Niek"]
};
function randomWild(){
  const id=(REGION[WORLD_STATE.mi||0]||{}).id;
  const pool=WILD_POOLS[id] || MON.filter(m=>!m.rarity).map(m=>m.n);
  return pool[Math.floor(Math.random()*pool.length)];
}
function wildLevel(){ const mi=WORLD_STATE.mi||0; const base=2+Math.round(mi*1.4); return Math.max(2, base-1+Math.floor(Math.random()*3)); }

/* ===== LEGENDARY & MYTHICAL set-pieces: vaste, respawnende encounters (vangbaar) ===== */
function badgeCount(){ return (typeof GYM_ORDER!=='undefined'?GYM_ORDER:[]).filter(id=>beaten.has(id)).length; }
const LEGEND_SPOTS={
  grot1:[
    {id:'set_ionnyx', sp:'Ionnyx', x:12,y:11, lvl:30, e:'🌈', glow:'#c04bff', gate:()=>badgeCount()>=2,
     taunt:'🌈 Een verblindende regenboog flakkert tussen de rotsen — de kleuren lijken te bewegen… <b>IONNYX</b> verschijnt! (Psychic — signature: Chroma Claw)'}
  ],
  grot2:[
    {id:'leg_druk', sp:'Druk', x:12,y:11, lvl:44, e:'🐲', glow:'#7a4fd0', gate:()=>beaten.has('b_druk'),
     taunt:'⚡ Dezelfde energie die je in de Team Widr-basis versloeg pulseert weer… <b>DRUK</b> is terug — vang hem deze keer! (Dragon/Electric-legende)'},
    {id:'leg_isis', sp:'Isis', x:4,y:16, lvl:54, e:'🔮', glow:'#6a4fb0', gate:()=>beaten.has('ploeg'),
     taunt:'🔮 Een oog opent zich in het duister. <b>ISIS</b>, de psychische legende, meet zich met de nieuwe Champion.'}
  ],
  bos1:[
    {id:'leg_aasta', sp:'Aasta', x:7,y:10, lvl:52, e:'🧚', glow:'#ff8fbf', gate:()=>beaten.has('ploeg'),
     taunt:'✨ Een mythische gloed daalt tussen de bomen… <b>AASTA</b> laat zich eindelijk zien.'}
  ]
};
/* zet legendaries live neer/weg op basis van voortgang (los van de map-cache) */
function syncDynamicNpcs(){
  if(!CUR||!CUR.mapid) return;
  (LEGEND_SPOTS[CUR.mapid]||[]).forEach(s=>{
    const exists=CUR.npcs.some(n=>n.id===s.id);
    const show=s.gate() && !caught.has(s.sp);
    if(show && !exists){ CUR.npcs.push({kind:'legend', id:s.id, sp:s.sp, name:byName(s.sp).n, x:s.x, y:s.y, lvl:s.lvl, e:s.e, glow:s.glow, taunt:s.taunt}); }
    else if(!show && exists){ CUR.npcs=CUR.npcs.filter(n=>n.id!==s.id); }
  });
}
function startLegendBattle(sp,lvl){
  if(party.length===0) return;
  pendingBattle={kind:'wild'};
  const pSpecs=party.slice(0,3).map((p,i)=>({sp:p.sp,lvl:p.lvl,pIdx:i}));
  buildBattle(pSpecs,[{sp,lvl:lvl||45}], {wild:true, species:sp, legend:true});
}

/* ===================== VERHAAL: trainers in de wereld ===================== */
let STORY_LOCK=false;
/* trainers per route — je moet langs ze; lopen ze in hun zichtlijn dan dagen ze je uit */
const ROUTE_TRAINERS={
 route1:[
   {id:'r1_rival',cls:'Meneer de Vleij',e:'😎',x:7,y:8,dir:'left',range:3,team:['Josh','Adam'],lvl:5,role:'Rival',pal:'rival',taunt:'Zo, jij hebt ook net een starter? Kom op, laat maar zien wat je kan! 😎'},
   {id:'r1_a',cls:'Scholier Tim',e:'🎒',x:8,y:12,dir:'left',range:2,team:['Otis'],lvl:4,role:'Route',pal:'student',taunt:'Nieuw op Route 1? Ik test je meteen even!'}
 ],
 route2:[
   {id:'r2_a',cls:'Scholier Lot',e:'🎒',x:7,y:4,dir:'left',range:3,team:['Renas','Milo'],lvl:10,role:'Route',pal:'student',taunt:'Je komt hier niet zomaar langs!'},
   {id:'r2_b',cls:'Scholier Sam',e:'🎒',x:5,y:12,dir:'right',range:3,team:['Fionn','Devin'],lvl:10,role:'Route',pal:'student',taunt:'Twee widrmon tegen jou — kom maar op!'}
 ],
 route3:[
   {id:'r3_a',cls:'Scholier Nina',e:'🎒',x:8,y:5,dir:'left',range:3,team:['Kim Chi','Prei'],lvl:14,role:'Route',pal:'student',taunt:'Frans-huiswerk af? Vecht dan met mij!'},
   {id:'r3_b',cls:'Scholier Bram',e:'🎒',x:5,y:11,dir:'right',range:3,team:['Young Fyon','Reshman'],lvl:14,role:'Route',pal:'student',taunt:'Halt! Trainerkeuring!'}
 ],
 route4:[
   {id:'r4_a',cls:'Scholier Dave',e:'🎒',x:7,y:4,dir:'left',range:4,team:['Dean','Yassin'],lvl:18,role:'Route',pal:'student',taunt:'Rotsvast team, kijk maar!'},
   {id:'r4_b',cls:'Scholier Roos',e:'🎒',x:5,y:12,dir:'right',range:3,team:['Fluharthy','Intratuin Potplant'],lvl:18,role:'Route',pal:'student',taunt:'Jij komt er niet langs!'}
 ],
 route5:[
   {id:'r5_rival',cls:'Meneer de Vleij',e:'😎',x:7,y:7,dir:'left',range:4,team:['Dean','Milo','Robin'],lvl:23,role:'Rival',pal:'rival',taunt:'Weer wij twee. Ik ben sterker geworden — jij ook? 😏'},
   {id:'r5_a',cls:'Scholier Kaj',e:'🎒',x:5,y:12,dir:'right',range:3,team:['Lars','Johan'],lvl:22,role:'Route',pal:'student',taunt:'Windkracht 10, kom maar!'}
 ],
 route6:[
   {id:'r6_a',cls:'Scholier Fem',e:'🎒',x:8,y:5,dir:'left',range:3,team:['Fionn','Kim Chi','Prei'],lvl:26,role:'Route',pal:'student',taunt:'Chemie-lokaal ontsnapt? Vecht!'},
   {id:'r6_b',cls:'Scholier Tijn',e:'🎒',x:5,y:11,dir:'right',range:3,team:['Young Fyon','Reshman'],lvl:26,role:'Route',pal:'student',taunt:'Ik laat je niet door!'}
 ],
 route7:[
   {id:'r7_g1',cls:'Team Widr Grunt',e:'👿',x:7,y:5,dir:'left',range:4,team:['Slechte Meiden','Stalker'],lvl:29,role:'Grunt',pal:'grunt',taunt:'Team Widr neemt de gc over! Wegwezen jij!'},
   {id:'r7_g2',cls:'Team Widr Grunt',e:'👿',x:5,y:12,dir:'right',range:4,team:['Evil Jax','Hammed'],lvl:29,role:'Grunt',pal:'grunt',taunt:'Niemand komt langs Team Widr!'}
 ],
 route8:[
   {id:'r8_g1',cls:'Team Widr Grunt',e:'👿',x:8,y:4,dir:'left',range:4,team:['Evil Adam','Adma Jr'],lvl:33,role:'Grunt',pal:'grunt',taunt:'De baas wacht in de basis — maar jij komt er niet!'},
   {id:'r8_g2',cls:'Team Widr Grunt',e:'👿',x:5,y:11,dir:'right',range:4,team:['Kayo & Yara','Slechte Meiden'],lvl:33,role:'Grunt',pal:'grunt',taunt:'Terug! Dit is Team Widr-gebied!'},
   {id:'r8_gate',cls:'Team Widr Bewaker',e:'🦹',x:6,y:10,dir:'up',range:3,team:['Evil Adam','Stalker','Slechte Meiden'],lvl:35,role:'Grunt',pal:'grunt',taunt:'HALT. Voorbij dit punt ligt onze basis. Niemand komt erlangs zonder mij te verslaan!'}
 ],
 route9:[
   {id:'r9_a',cls:'Ace Trainer Vera',e:'🏆',x:7,y:5,dir:'left',range:4,team:['Claire','Dynant','De Kapper'],lvl:40,role:'Route',pal:'boss',taunt:'Victory Road. Alleen de sterksten komen langs mij.'},
   {id:'r9_b',cls:'Ace Trainer Rens',e:'🏆',x:5,y:12,dir:'right',range:4,team:['Fluharthy','Meta AI','Deniz'],lvl:40,role:'Route',pal:'boss',taunt:'Bewijs dat je de League verdient!'}
 ]
};
/* maak een NPC-object voor een wereldtrainer */
function mkFoeNpc(t){ return Object.assign({kind:'foe', name:t.cls, pal:PAL[t.pal]||PAL.student, _alert:false}, t); }
/* trainer-object uit TRAINERS omzetten naar wereld-baas */
function bossFoe(id,x,y,taunt){
  const t=TRAINERS.find(z=>z.id===id);
  return mkFoeNpc({id, cls:t.name, e:t.e, x, y, team:t.team, lvl:trainerLevel(t), role:'Evil', pal:'boss', taunt});
}
/* ziet trainer n de speler? (zichtlijn in kijkrichting, geblokkeerd door muren/bomen/gebouwen) */
function trainerSees(n){
  if(!n.team || beaten.has(n.id)) return false;
  const [dx,dy]=FACE[n.dir]||[0,1];
  for(let s=1;s<=(n.range||3);s++){
    const tx=n.x+dx*s, ty=n.y+dy*s, t=tileAt(tx,ty);
    if(t==='T'||t==='W'||t==='H'||inBuilding(tx,ty)) return false;   // zicht geblokkeerd
    if(WORLD_STATE.x===tx && WORLD_STATE.y===ty) return true;
    const other=npcAt(tx,ty); if(other&&other!==n) return false;    // andere npc blokkeert
  }
  return false;
}
function checkSight(){
  if(STORY_LOCK||DLG.open||!CUR) return;
  const seer=CUR.npcs.find(trainerSees);
  if(seer) triggerFoe(seer);
}
function triggerFoe(n){
  STORY_LOCK=true; n._alert=true;
  setTimeout(()=>{ n._alert=false; foeDialogue(n); }, 480);
}
function foeDialogue(n){
  showDialogue(n.name, n.taunt||'Kom op, vechten!', [
    {label:'Vechten! ⚔️',cls:'go',fn:()=>{ closeDialogue(); startTrainerBattle(n); }}
  ]);
}
function startWildBattle(species){
  if(party.length===0) return;
  pendingBattle={kind:'wild'};
  const pSpecs=party.slice(0,3).map((p,i)=>({sp:p.sp,lvl:p.lvl,pIdx:i}));
  buildBattle(pSpecs, [{sp:species,lvl:wildLevel()}], {wild:true, species});
}
function startWildDouble(a,b){
  if(party.length===0) return;
  pendingBattle={kind:'wild'};
  const pSpecs=party.slice(0,3).map((p,i)=>({sp:p.sp,lvl:p.lvl,pIdx:i}));
  buildBattle(pSpecs, [{sp:a,lvl:wildLevel()},{sp:b,lvl:wildLevel()}], {wild:true, species:a, double:true});
  toast('🌾🌾 Dubbelgevecht! Twee wilde widrmon!');
}
function worldHeal(){ healParty(); toast('Je team is weer helemaal fit! 💚'); }

/* ---- dialoog ---- */
function showDialogue(who,msg,btns){
  DLG.open=true; DLG.closable=(!btns||btns.length===0);
  document.getElementById('dlg-who').textContent=who;
  document.getElementById('dlg-msg').textContent=msg;
  const br=document.getElementById('dlg-btns');
  br.innerHTML=(btns||[]).map((b,i)=>`<button class="dbtn ${b.cls||''}" data-i="${i}">${b.label}</button>`).join('');
  Array.from(br.children).forEach((el,i)=>el.onclick=()=>btns[i].fn());
  const cont=document.getElementById('dlg-cont');
  cont.style.display=DLG.closable?'block':'none';
  cont.onclick=DLG.closable?(()=>closeDialogue()):null;
  document.getElementById('dialogue').classList.add('open');
}
function closeDialogue(){ DLG.open=false; document.getElementById('dialogue').classList.remove('open'); }
function openPartyMenu(){
  if(party.length===0){ showDialogue('Je team','Je hebt nog geen widrmon. Ga het gras in! 🌿',[]); return; }
  showDialogue(`Je team (${party.length}/${PARTY_MAX})`, party.map(p=>{const m=byName(p.sp);return `${m.e} ${m.n} Lv${p.lvl}`;}).join('  •  '), []);
}

/* ---- starter ---- */
function newAdventure(){
  if(starterChosen && !confirm('Je hebt al een save. Een nieuw avontuur wist je voortgang. Doorgaan?')) return;
  resetProgress(); if(!player) pickPlayer('keeren');
  starterChosen=false; STORY_LOCK=false; INSIDE=null;
  WORLD_STATE={mi:0, x:6, y:9, face:'up', started:true};
  go('world'); loadMap(); bindWorldKeys(); startWorldLoop(); updatePartyCount(); setMapLabel();
  const home=CUR.buildings.find(b=>b.kind==='home');
  if(home){ WORLD_STATE.x=home.door.x; WORLD_STATE.y=home.door.y+1; WORLD_STATE.face='up'; enterBuilding(home); }
  const nm=player?player.name.replace('Mevrouw ','').replace('Meneer ',''):'trainer';
  setTimeout(()=>showDialogue('Mama', `Goedemorgen, ${nm}! 🌞 Vandaag begint je avontuur als widrmon-trainer. De Rector wacht in het Widr Lab even verderop — ga snel je eerste widrmon halen! Loop naar beneden (▼) om je kamer uit te gaan.`, []), 350);
}
function renderStarterGrid(){
  document.getElementById('starter-grid').innerHTML=STARTERS.map(n=>{ const m=byName(n);
    return `<div class="starter-card" onclick="chooseStarter('${n.replace(/'/g,"\\'")}')">
      <div class="savatar" style="background:${typeGrad(m.t)}">${monImg(m,'90%')}</div>
      <div class="sbody"><div class="sn">${m.n}</div><div class="badges" style="margin-top:6px">${m.t.map(tbadge).join('')}</div>
      <div style="font-size:11px;color:#5b3a1e;margin-top:6px">🧬 <b>${ABILITIES[m.ability].name}</b></div>
      <div style="font-size:12px;color:#4a3b12;margin-top:6px">${m.dex}</div></div></div>`; }).join('');
}
function chooseStarter(name){
  caught.add(name); party=[{sp:name,lvl:5,xp:0,moves:defaultMoveKeys(name,5)}]; starterChosen=true;
  WORLD_STATE={mi:0,x:6,y:9,face:'up',started:true};
  MAPCACHE.town=null; saveProgress();
  const cb=document.getElementById('continue-btn'); if(cb) cb.style.display='';
  enterWorld();
  setTimeout(()=>showDialogue('De Rector', `Een uitstekende keuze! ${name} is nu je partner. 🎉 Loop naar het noorden, Route 1 in, en vang meer widrmon. Versla alle 8 gyms voor de League!`, []), 250);
}

/* ---- toast ---- */
function toast(msg){
  const t=document.createElement('div'); t.textContent=msg;
  t.style.cssText='position:fixed;left:50%;top:76px;transform:translateX(-50%);background:#151321;color:#fff;font-weight:bold;padding:10px 18px;border:3px solid #ffcb05;border-radius:12px;z-index:99;box-shadow:4px 4px 0 rgba(0,0,0,.4);';
  document.body.appendChild(t);
  setTimeout(()=>{ t.style.transition='opacity .4s'; t.style.opacity='0'; setTimeout(()=>t.remove(),400); },1500);
}

/* ---- keyboard ---- */
function bindWorldKeys(){
  if(wkeysBound) return; wkeysBound=true;
  const K2D={arrowup:'up',w:'up',arrowdown:'down',s:'down',arrowleft:'left',a:'left',arrowright:'right',d:'right'};
  const D2M={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
  document.addEventListener('keydown',e=>{
    if(!document.getElementById('screen-world').classList.contains('active')) return;
    const k=e.key.toLowerCase();
    if(['arrowup','w','arrowdown','s','arrowleft','a','arrowright','d',' ','enter'].includes(k)) e.preventDefault();
    if(k===' '||k==='enter'){ worldInteract(); return; }
    const dir=K2D[k]; if(!dir) return;
    HELD[dir]=1; lastDir=dir;
    if(stepT<=0){ const m=D2M[dir]; tryStep(m[0],m[1]); }   // directe reactie op eerste tik
  });
  document.addEventListener('keyup',e=>{
    const dir=K2D[e.key.toLowerCase()]; if(dir) HELD[dir]=0;
  });
}
