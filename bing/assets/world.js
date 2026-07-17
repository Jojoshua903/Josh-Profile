/* ============================================================
   WIDR VALLEY — world.js
   Each AREA is its own tile grid with its OWN width/height, so maps
   can be far larger than one screen. script.js scrolls a camera to
   follow the player. Add a new area by pushing an object into
   WORLD.areas via build(); no engine changes needed.
   ============================================================ */

/* Tile codes:
   0 grass  1 path  2 water  3 tree  4 rock  5 wall/house
   6 tilled 7 sand  8 floor(interior)  9 shop-counter
   10 warp  11 farm-plot  12 ore-node  13 bush
   14 flower  15 snow  16 dark-rock(mines wall)  17 bridge  18 grave/deco
   19 ladder-down  20 treasure-chest  21 elevator */
const T = { GRASS:0, PATH:1, WATER:2, TREE:3, ROCK:4, WALL:5, TILLED:6,
            SAND:7, FLOOR:8, COUNTER:9, WARP:10, PLOT:11, ORE:12, BUSH:13,
            FLOWER:14, SNOW:15, DARKROCK:16, BRIDGE:17, DECO:18,
            LADDER:19, CHEST:20, ELEVATOR:21 };

const TILE = 32;

/* grid/helpers now take explicit dimensions ---------------------- */
function grid(cols, rows, base){
  const g = [];
  for(let y=0;y<rows;y++){ const row=[]; for(let x=0;x<cols;x++) row.push(base); g.push(row); }
  return g;
}
function borderG(g, tile){
  const rows=g.length, cols=g[0].length;
  for(let x=0;x<cols;x++){ g[0][x]=tile; g[rows-1][x]=tile; }
  for(let y=0;y<rows;y++){ g[y][0]=tile; g[y][cols-1]=tile; }
}
function rect(g, x0,y0,x1,y1, tile){
  for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++) if(g[y]&&g[y][x]!==undefined) g[y][x]=tile;
}
function scatterG(g, tile, n, onlyOn, avoid){
  const rows=g.length, cols=g[0].length;
  let placed=0, guard=0;
  onlyOn = onlyOn===undefined ? T.GRASS : onlyOn;
  while(placed<n && guard<n*60){
    guard++;
    const x=1+Math.floor(Math.random()*(cols-2));
    const y=1+Math.floor(Math.random()*(rows-2));
    if(g[y][x]===onlyOn && !(avoid&&avoid(x,y))){ g[y][x]=tile; placed++; }
  }
}

/* ---------- FARM (big: 40x32) ---------- */
function buildFarm(){
  const C=40, R=32;
  const g = grid(C,R,T.GRASS);
  borderG(g, T.TREE);
  // farmhouse (top-left) + porch
  rect(g, 2,2, 7,5, T.WALL);
  g[5][4] = T.FLOOR; g[5][5]=T.FLOOR; // door
  rect(g, 3,6, 6,6, T.PATH);          // porch path
  // building plots — flagged via interact, drawn as dirt clearings
  rect(g, 10,3, 15,7, T.PLOT);        // coop area
  rect(g, 17,3, 22,7, T.PLOT);        // barn area
  // big pond (fishing on farm)
  rect(g, 30,3, 37,9, T.WATER);
  // main tillable field (large)
  rect(g, 6,10, 30,26, T.PLOT);
  // decorative flowers along edges
  scatterG(g, T.FLOWER, 20, T.GRASS, (x,y)=>x>=6&&x<=30&&y>=10&&y<=26);
  scatterG(g, T.TREE, 16, T.GRASS, (x,y)=>x>=6&&x<=30&&y>=10&&y<=26);
  scatterG(g, T.ROCK, 12, T.GRASS, (x,y)=>x>=6&&x<=30&&y>=10&&y<=26);
  scatterG(g, T.BUSH, 8, T.GRASS, (x,y)=>x>=6&&x<=30&&y>=10&&y<=26);
  // warp to village (bottom center)
  g[R-1][20] = T.WARP;
  return {
    id:"farm", name:"Bing's Farm", music:"farm", cols:C, rows:R, tiles:g, tint:null,
    warps:[ { x:20, y:R-1, to:"village", tx:20, ty:1 } ],
    npcs:[],
    interact:[
      { x:4, y:5, kind:"bed", label:"Sleep" },
      { x:12, y:5, kind:"build", label:"Coop plot", building:"coop" },
      { x:19, y:5, kind:"build", label:"Barn plot", building:"barn" },
      { x:24, y:5, kind:"build", label:"Greenhouse plot", building:"greenhouse" },
      { x:26, y:5, kind:"ship", label:"Shipping Bin" },
    ],
  };
}

/* ---------- VILLAGE (big: 44x30) ---------- */
function buildVillage(){
  const C=44, R=30;
  const g = grid(C,R,T.GRASS);
  borderG(g, T.WALL);
  // plaza + roads
  rect(g, 20,1, 23,R-2, T.PATH);       // vertical main road
  rect(g, 1,14, C-2,15, T.PATH);       // horizontal road
  rect(g, 18,13, 25,16, T.PATH);       // central plaza
  // houses (each a filled wall block, door punched)
  const houses=[[3,3,7,6],[10,3,14,6],[30,3,34,6],[37,3,41,6],
                [3,20,7,23],[10,20,14,23],[30,20,34,23],[37,20,41,23]];
  for(const [x0,y0,x1,y1] of houses){ rect(g,x0,y0,x1,y1,T.WALL); g[y1][Math.floor((x0+x1)/2)]=T.FLOOR; }
  // fountain deco in plaza
  g[14][21]=T.WATER; g[14][22]=T.WATER; g[15][21]=T.WATER; g[15][22]=T.WATER;
  // shop building
  rect(g, 16,7, 19,9, T.COUNTER);
  // flowers around plaza
  scatterG(g, T.FLOWER, 24, T.GRASS);
  // edge warps
  g[1][20] = T.WARP;              // north -> farm
  g[14][C-1] = T.WARP;            // east -> forest
  g[R-1][21] = T.WARP;            // south -> beach
  g[14][0] = T.WARP;             // west -> mines entrance (mountain path)
  g[1][8] = T.WARP;              // NW -> mountain
  g[1][32] = T.WARP;             // NE -> Alfrink College
  return {
    id:"village", name:"Widr Village", music:"village", cols:C, rows:R, tiles:g, tint:null,
    warps:[
      { x:20, y:1, to:"farm", tx:20, ty:R-2 },
      { x:C-1, y:14, to:"forest", tx:1, ty:14 },
      { x:21, y:R-1, to:"beach", tx:21, ty:1 },
      { x:0, y:14, to:"mines", tx:31, ty:12 },
      { x:8, y:1, to:"mountain", tx:8, ty:R-2 },
      { x:32, y:1, to:"college", tx:18, ty:R-2 },
    ],
    npcs:[
      { id:"josh", x:5, y:8 }, { id:"nathan", x:12, y:8 },
      { id:"adam", x:32, y:8 }, { id:"fionn", x:39, y:8 },
      { id:"lors", x:21, y:12 },
    ],
    interact:[ { x:17, y:10, kind:"shop", label:"Market", shop:"general" },
               { x:26, y:9, kind:"kitchen", label:"Kitchen" },
               { x:26, y:11, kind:"craft", label:"Workbench" },
               { x:26, y:13, kind:"upgrade", label:"Blacksmith" },
               { x:14, y:10, kind:"shop", label:"Adventurer's Guild", shop:"adventurer" } ],
  };
}

/* ---------- FOREST (big: 40x30) ---------- */
function buildForest(){
  const C=40, R=30;
  const g = grid(C,R,T.GRASS);
  borderG(g, T.TREE);
  scatterG(g, T.TREE, 120);
  scatterG(g, T.BUSH, 40);
  scatterG(g, T.FLOWER, 30);
  scatterG(g, T.ROCK, 20);
  rect(g, 16,12, 22,17, T.WATER); // forest lake (fishing)
  rect(g, 18,17, 20,20, T.BRIDGE);
  g[14][0] = T.WARP; // west -> village
  g[6][34] = T.WARP; // NE -> hidden forest
  g[7][34]=T.GRASS; g[6][33]=T.GRASS; // clear around it
  return {
    id:"forest", name:"Whispering Forest", music:"forest", cols:C, rows:R, tiles:g, tint:"#0a3d0a22",
    warps:[ { x:0, y:14, to:"village", tx:C-2, ty:14 },
            { x:34, y:6, to:"hiddenforest", tx:6, ty:27 } ],
    npcs:[ { id:"reshman", x:8, y:6 }, { id:"daniel", x:30, y:22 } ],
    interact:[ { x:5, y:24, kind:"forage", label:"Forageables" } ],
  };
}

/* ---------- BEACH (big: 40x26) ---------- */
function buildBeach(){
  const C=40, R=26;
  const g = grid(C,R,T.SAND);
  borderG(g, T.WALL);
  rect(g, 0,16, C-1,R-1, T.WATER);       // ocean band
  for(let x=0;x<C;x++){ g[R-1][x]=T.WATER; g[R-2][x]=T.WATER; }
  rect(g, 5,15, 8,17, T.BRIDGE);         // pier
  scatterG(g, T.BUSH, 8, T.SAND, (x,y)=>y>=16);
  scatterG(g, T.ROCK, 10, T.SAND, (x,y)=>y>=16);
  g[1][21] = T.WARP; // north -> village
  g[4][C-1] = T.WARP; // east -> river
  return {
    id:"beach", name:"Riverbend Beach", music:"beach", cols:C, rows:R, tiles:g, tint:"#1a6fa022",
    warps:[ { x:21, y:1, to:"village", tx:21, ty:R-2 },
            { x:C-1, y:4, to:"river", tx:1, ty:4 } ],
    npcs:[ { id:"milo", x:12, y:10 } ],
    interact:[ { x:30, y:8, kind:"shop", label:"Fish Shop", shop:"fish" } ],
  };
}

/* ---------- MOUNTAIN (big: 36x30) — gateway to nowhere-fancy, foraging + view ---------- */
function buildMountain(){
  const C=36, R=30;
  const g = grid(C,R,T.GRASS);
  borderG(g, T.ROCK);
  scatterG(g, T.ROCK, 70);
  scatterG(g, T.TREE, 40);
  scatterG(g, T.BUSH, 25);
  rect(g, 14,4, 20,9, T.WATER);  // mountain lake
  rect(g, 2,2, 6,2, T.SNOW);
  scatterG(g, T.SNOW, 30, T.GRASS, (x,y)=>y>10);
  g[R-1][8] = T.WARP; // south -> village
  g[1][30] = T.WARP;  // NE -> desert
  g[20][20] = T.WARP; // -> secret cave
  g[2][6] = T.WARP;   // -> volcano
  // keep warp landing spots clear
  g[20][4]=T.GRASS; g[23][6]=T.GRASS; g[1][8]=T.GRASS; g[2][30]=T.GRASS;
  return {
    id:"mountain", name:"Widr Mountains", music:"forest", cols:C, rows:R, tiles:g, tint:"#88aacc18",
    warps:[ { x:8, y:R-1, to:"village", tx:8, ty:1 },
            { x:30, y:1, to:"desert", tx:2, ty:14 },
            { x:20, y:20, to:"cave", tx:4, ty:20 },
            { x:6, y:2, to:"volcano", tx:6, ty:23 } ],
    npcs:[],
    interact:[],
  };
}

/* ---------- DESERT (big: 38x26) — hot, cacti, secret ---------- */
function buildDesert(){
  const C=38, R=26;
  const g = grid(C,R,T.SAND);
  borderG(g, T.ROCK);
  scatterG(g, T.ROCK, 30, T.SAND);
  scatterG(g, T.BUSH, 18, T.SAND);       // cacti stand-in
  rect(g, 16,10, 21,14, T.WATER);        // oasis
  g[14][0] = T.WARP; // west -> mountain
  g[2][19] = T.WARP;  // -> castle
  g[20][2] = T.WARP;  // -> ancient ruins
  // clear landing spots
  g[14][2]=T.SAND; g[4][19]=T.SAND; g[20][4]=T.SAND;
  return {
    id:"desert", name:"Kaasvet Desert", music:"mines", cols:C, rows:R, tiles:g, tint:"#c9930033",
    warps:[ { x:0, y:14, to:"mountain", tx:30, ty:2 },
            { x:19, y:2, to:"castle", tx:20, ty:27 },
            { x:2, y:20, to:"ruins", tx:20, ty:25 } ],
    npcs:[],
    interact:[ { x:30, y:6, kind:"shop", label:"Traveling Merchant", shop:"merchant" } ],
  };
}

/* ---------- MINES (procedural, 34x24 per floor) ---------- */
function buildMines(floor){
  floor = floor||1;
  const C=34, R=24;
  const g = grid(C,R,T.DARKROCK);
  rect(g, 2,2, C-3, R-3, T.FLOOR);       // walkable cavern
  borderG(g, T.WALL);

  const isBoss = floor%10===0;                     // every 10th floor: boss arena
  const isTreasure = !isBoss && (floor%7===0 || Math.random()<0.18);
  const hasSecret = !isBoss && Math.random()<0.25; // walled secret room, bomb to open

  if(isBoss){
    // open arena, no rubble, boss spawns in engine
    rect(g, 2,2, C-3, R-3, T.FLOOR);
  } else {
    // rubble walls for maze feel (kept off the main corridor row 12)
    for(let i=0;i<14;i++){ const x=3+Math.floor(Math.random()*(C-6)), y=3+Math.floor(Math.random()*(R-6)); if(g[y][x]===T.FLOOR && y!==12 && y!==3) g[y][x]=T.DARKROCK; }
  }
  // guaranteed horizontal corridor keeps the level traversable
  rect(g, 2,12, C-3, 12, T.FLOOR);

  // ore nodes (denser deeper)
  const oreCount = 12 + Math.floor(floor/5);
  for(let i=0;i<oreCount;i++){ const x=2+Math.floor(Math.random()*(C-4)), y=2+Math.floor(Math.random()*(R-4)); if(g[y][x]===T.FLOOR) g[y][x]=T.ORE; }

  // treasure room: a small walled chamber with a chest, reachable
  if(isTreasure){
    rect(g, 24,3, 30,7, T.DARKROCK);   // walls
    rect(g, 25,4, 29,6, T.FLOOR);      // interior
    g[6][27]=T.FLOOR;                  // doorway down
    g[5][27]=T.CHEST;                  // the chest
  }
  // secret room: fully enclosed by darkrock; only reachable by bombing in
  if(hasSecret){
    rect(g, 4,16, 9,20, T.DARKROCK);
    rect(g, 5,17, 8,19, T.FLOOR);
    g[18][6]=T.CHEST;                  // hidden reward
  }

  // carve a clear corridor to the exit warp and clear the entry spot
  rect(g, 30,12, 32,12, T.FLOOR);
  rect(g, 2,2, 4,4, T.FLOOR);            // entry drop zone always open
  g[12][C-1] = T.WARP; // east -> village (exit)
  g[3][3] = T.ELEVATOR;                  // elevator at entry (fast-travel)
  // ladder down (not on boss floors until boss is cleared — engine gates it)
  g[R-4][C-4] = T.LADDER;
  rect(g, C-6,R-4, C-4,R-4, T.FLOOR);    // path to ladder
  rect(g, C-4,12, C-4,R-4, T.FLOOR);

  return {
    id:"mines", name: isBoss? `Widr Mines — Boss Floor ${floor}` : `Widr Mines — Floor ${floor}`,
    music:"mines", cols:C, rows:R, tiles:g, tint:"#00000055",
    warps:[ { x:C-1, y:12, to:"village", tx:1, ty:14 } ],
    npcs: floor===1 ? [{ id:"metaai", x:16, y:12 }] : [],
    interact:[ { x:3, y:3, kind:"elevator", label:"Elevator" } ],
    isMine:true, floor, isBoss, bossCleared:false,
  };
}

/* ============================================================
   EXTRA AREAS — River, Marketplace, Alfrink College, Secret Cave,
   Castle, Festival Grounds, Hidden Forest, Volcano, Ancient Ruins.
   Each has unique music, decorations, an NPC and/or a one-time
   collectible (kind:"collect") and a hidden secret (kind:"secret").
   ============================================================ */

/* ---------- RIVER (42x24) — fishing paradise, pearls ---------- */
function buildRiver(){
  const C=42, R=24;
  const g = grid(C,R,T.GRASS);
  borderG(g, T.TREE);
  rect(g, 0,9, C-1,14, T.WATER);          // wide river across the map
  rect(g, 18,9, 21,14, T.BRIDGE);         // crossing
  scatterG(g, T.BUSH, 20);
  scatterG(g, T.FLOWER, 24);
  scatterG(g, T.ROCK, 10);
  g[4][0] = T.WARP;   // west -> beach
  g[4][C-1] = T.WARP; // east -> marketplace
  return {
    id:"river", name:"Riverbend River", music:"river", cols:C, rows:R, tiles:g, tint:"#2b6cb022",
    warps:[ { x:0, y:4, to:"beach", tx:38, ty:4 },
            { x:C-1, y:4, to:"market", tx:1, ty:12 } ],
    npcs:[ { id:"milo", x:24, y:5 } ],
    interact:[ { x:6, y:16, kind:"collect", item:"pearl", label:"Glinting shallows",
                 secretText:"A river pearl! Milo says these only appear at dawn." } ],
  };
}

/* ---------- MARKETPLACE (40x26) — stalls, merchants ---------- */
function buildMarket(){
  const C=40, R=26;
  const g = grid(C,R,T.PATH);
  borderG(g, T.WALL);
  // stall rows (counters)
  for(let sx=4; sx<C-4; sx+=6){ rect(g, sx,5, sx+2,6, T.COUNTER); rect(g, sx,16, sx+2,17, T.COUNTER); }
  scatterG(g, T.FLOWER, 16, T.PATH);
  g[12][0] = T.WARP;   // west -> river
  g[12][C-1] = T.WARP; // east -> festival grounds
  return {
    id:"market", name:"Widr Marketplace", music:"market", cols:C, rows:R, tiles:g, tint:null,
    warps:[ { x:0, y:12, to:"river", tx:40, ty:4 },
            { x:C-1, y:12, to:"festival", tx:1, ty:12 } ],
    npcs:[ { id:"adam", x:10, y:9 }, { id:"lors", x:26, y:13 } ],
    interact:[ { x:8, y:5, kind:"shop", label:"Seed Stall", shop:"general" },
               { x:20, y:16, kind:"shop", label:"Curio Merchant", shop:"merchant" },
               { x:32, y:5, kind:"shop", label:"Fish Monger", shop:"fish" } ],
  };
}

/* ---------- ALFRINK COLLEGE (38x28) — school, diploma secret ---------- */
function buildCollege(){
  const C=38, R=28;
  const g = grid(C,R,T.FLOOR);
  borderG(g, T.WALL);
  // classroom desks (counters) in rows
  for(let ry=6; ry<R-6; ry+=5){ for(let rx=5; rx<C-5; rx+=4){ g[ry][rx]=T.COUNTER; } }
  rect(g, 16,2, 21,3, T.COUNTER);  // teacher's desk
  g[R-1][18] = T.WARP; // south -> village
  return {
    id:"college", name:"Alfrink College", music:"college", cols:C, rows:R, tiles:g, tint:"#88664422",
    warps:[ { x:18, y:R-1, to:"village", tx:20, ty:2 } ],
    npcs:[ { id:"fionn", x:18, y:5 }, { id:"nathan", x:10, y:12 } ],
    interact:[ { x:30, y:22, kind:"collect", item:"diploma", label:"Dusty cabinet",
                 secretText:"An Alfrink Diploma. 'Wiskunde tia', it reads. Congratulations?" },
               { x:6, y:22, kind:"secret", label:"Scratched desk",
                 secretText:"Carved into the desk: 'sybau'. A student was here. A legend was born." } ],
  };
}

/* ---------- SECRET CAVE (30x22) — crystals, hidden ---------- */
function buildCave(){
  const C=30, R=22;
  const g = grid(C,R,T.DARKROCK);
  rect(g, 2,2, C-3,R-3, T.FLOOR);
  borderG(g, T.WALL);
  scatterG(g, T.ORE, 16, T.FLOOR);
  rect(g, 12,8, 17,12, T.WATER);   // glowing pool
  g[R-1][4] = T.WARP; // south -> mountain
  g[20][4]=T.FLOOR; g[19][4]=T.FLOOR; // landing/return path clear
  return {
    id:"cave", name:"Secret Cave", music:"cave", cols:C, rows:R, tiles:g, tint:"#00224466",
    warps:[ { x:4, y:R-1, to:"mountain", tx:20, ty:20 } ],
    npcs:[],
    interact:[ { x:22, y:5, kind:"collect", item:"crystal", label:"Crystal formation",
                 secretText:"A Cave Crystal hums in your hand. Meta AI would want to study this." },
               { x:14, y:14, kind:"secret", label:"Still pool",
                 secretText:"Your reflection winks first. You decide not to think about it." } ],
  };
}

/* ---------- CASTLE (40x30) — throne, crown ---------- */
function buildCastle(){
  const C=40, R=30;
  const g = grid(C,R,T.FLOOR);
  borderG(g, T.WALL);
  // pillars
  for(let px=6; px<C-6; px+=6){ for(let py=6; py<R-6; py+=6){ g[py][px]=T.WALL; } }
  rect(g, 17,3, 22,4, T.COUNTER);  // throne dais
  rect(g, 1,1, C-2,2, T.PATH);     // red carpet-ish top
  rect(g, 18,4, 21,R-3, T.PATH);   // carpet to throne
  g[R-1][20] = T.WARP; // south -> desert
  return {
    id:"castle", name:"Kaasvet Castle", music:"castle", cols:C, rows:R, tiles:g, tint:"#44228844",
    warps:[ { x:20, y:R-1, to:"desert", tx:19, ty:2 } ],
    npcs:[ { id:"josh", x:19, y:6 } ],
    interact:[ { x:19, y:4, kind:"collect", item:"crown", label:"The throne",
                 secretText:"You lift the Widr Crown. Josh sighs: 'Fine. King Bing. Happy now?'" } ],
  };
}

/* ---------- FESTIVAL GROUNDS (42x26) — stage, lights, ribbon ---------- */
function buildFestival(){
  const C=42, R=26;
  const g = grid(C,R,T.GRASS);
  borderG(g, T.WALL);
  rect(g, 16,3, 25,7, T.FLOOR);     // stage
  rect(g, 4,12, C-5,20, T.PATH);    // dance floor
  scatterG(g, T.FLOWER, 40, T.GRASS);
  g[12][0] = T.WARP; // west -> marketplace
  return {
    id:"festival", name:"Festival Grounds", music:"festival", cols:C, rows:R, tiles:g, tint:"#ff88cc18",
    warps:[ { x:0, y:12, to:"market", tx:38, ty:12 } ],
    npcs:[ { id:"reshman", x:20, y:9 }, { id:"daniel", x:30, y:15 } ],
    interact:[ { x:20, y:5, kind:"collect", item:"ribbon", label:"Prize table",
                 secretText:"You win a Festival Ribbon! Adam spams 47 congratulation stickers." },
               { x:8, y:16, kind:"secret", label:"Speaker stack",
                 secretText:"'Brr brr Deniz' blares out. Nobody knows who queued it." } ],
  };
}

/* ---------- HIDDEN FOREST (40x30) — dense, orchid ---------- */
function buildHiddenForest(){
  const C=40, R=30;
  const g = grid(C,R,T.GRASS);
  borderG(g, T.TREE);
  scatterG(g, T.TREE, 180);
  scatterG(g, T.BUSH, 60);
  scatterG(g, T.FLOWER, 50);
  rect(g, 18,13, 21,16, T.WATER);
  g[R-1][6] = T.WARP; // south -> forest
  g[27][6]=T.GRASS; g[26][6]=T.GRASS; // clear landing/return path
  return {
    id:"hiddenforest", name:"Hidden Forest", music:"forest", cols:C, rows:R, tiles:g, tint:"#03260366",
    warps:[ { x:6, y:R-1, to:"forest", tx:34, ty:6 } ],
    npcs:[],
    interact:[ { x:30, y:6, kind:"collect", item:"orchid", label:"Shaft of light",
                 secretText:"A Hidden Orchid blooms where the light lands. It smells like rain." },
               { x:10, y:20, kind:"secret", label:"Old shrine",
                 secretText:"A mossy shrine. Offerings of 4 potjes pindakaas. Someone's been here." } ],
  };
}

/* ---------- VOLCANO (34x26) — lava, obsidian, danger ---------- */
function buildVolcano(){
  const C=34, R=26;
  const g = grid(C,R,T.DARKROCK);
  rect(g, 2,2, C-3,R-3, T.FLOOR);
  borderG(g, T.WALL);
  rect(g, 12,10, 21,15, T.WATER);   // lava lake (WATER tile = impassable)
  scatterG(g, T.ROCK, 20, T.FLOOR);
  scatterG(g, T.ORE, 14, T.FLOOR);
  g[R-1][6] = T.WARP; // south -> mountain
  g[23][6]=T.FLOOR; g[22][6]=T.FLOOR; // landing/return path clear
  return {
    id:"volcano", name:"Widr Volcano", music:"volcano", cols:C, rows:R, tiles:g, tint:"#ff330044",
    warps:[ { x:6, y:R-1, to:"mountain", tx:6, ty:2 } ],
    npcs:[],
    interact:[ { x:26, y:6, kind:"collect", item:"obsidian", label:"Cooled lava flow",
                 secretText:"An Obsidian Shard, still warm. Sharp enough to make a very rude blade." } ],
  };
}

/* ---------- ANCIENT RUINS (40x28) — relics, lore ---------- */
function buildRuins(){
  const C=40, R=28;
  const g = grid(C,R,T.SAND);
  borderG(g, T.WALL);
  // broken pillars
  for(let px=5; px<C-5; px+=5){ g[6][px]=T.ROCK; g[R-7][px]=T.ROCK; }
  rect(g, 17,12, 22,15, T.FLOOR);   // central plaza
  scatterG(g, T.ROCK, 16, T.SAND);
  g[R-1][20] = T.WARP; // south -> desert
  g[25][20]=T.SAND; g[24][20]=T.SAND; // landing/return path clear
  return {
    id:"ruins", name:"Ancient Ruins", music:"ruins", cols:C, rows:R, tiles:g, tint:"#77552233",
    warps:[ { x:20, y:R-1, to:"desert", tx:2, ty:20 } ],
    npcs:[ { id:"metaai", x:20, y:13 } ],
    interact:[ { x:8, y:8, kind:"collect", item:"relic", label:"Buried altar",
                 secretText:"An Ancient Relic. Inscribed: 'cake is cake'. The founders were philosophers." },
               { x:32, y:20, kind:"secret", label:"Cracked mural",
                 secretText:"The mural shows a farmer who hates his nickname. History rhymes." },
               { x:20, y:6, kind:"collect", item:"sticker", label:"Sealed vault",
                 secretText:"Adam's Legendary Sticker, sealed away for millennia. It is load-bearing no more." } ],
  };
}

const WORLD = {
  tile: TILE, T,
  areas: {},
  areaCount: 17,
  _mineFloor: 1,
  build(){
    this.areas.farm     = buildFarm();
    this.areas.village  = buildVillage();
    this.areas.forest   = buildForest();
    this.areas.beach    = buildBeach();
    this.areas.mountain = buildMountain();
    this.areas.desert   = buildDesert();
    this.areas.river        = buildRiver();
    this.areas.market       = buildMarket();
    this.areas.college      = buildCollege();
    this.areas.cave         = buildCave();
    this.areas.castle       = buildCastle();
    this.areas.festival     = buildFestival();
    this.areas.hiddenforest = buildHiddenForest();
    this.areas.volcano      = buildVolcano();
    this.areas.ruins        = buildRuins();
    this._mineFloor = 1;
    this.areas.mines    = buildMines(1);
  },
  regenMine(){
    this._mineFloor = (this._mineFloor||1)+1;
    this.areas.mines = buildMines(this._mineFloor);
  },
  regenMineTo(floor){
    this._mineFloor = floor||1;
    this.areas.mines = buildMines(this._mineFloor);
  },
};

window.WORLD = WORLD;
window.WORLD_T = T;
