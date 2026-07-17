/* ============================================================
   WIDR VALLEY — script.js  (main engine)
   Wires up state, rendering, input, farming, NPCs, dialogue,
   shop, inventory, quests, achievements, day/night, weather,
   save/load. Kept in one engine file; all CONTENT is in data.js.
   ============================================================ */
(() => {
"use strict";

const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const D  = window.DATA;
const W  = window.WORLD;
const A  = window.AudioMgr;
const T  = window.WORLD_T;

const SAVE_KEY = "widr-valley-save-v2";

/* ============================================================
   STATE
   ============================================================ */
let S = null;          // the whole savable game state
let anim = 0;          // animation frame counter
let keys = {};         // held keys
let toolCooldown = 0;

function freshState(farmName, shirt){
  W.build();
  const s = {
    farmName, shirt,
    money: 500,
    energy: 270, maxEnergy: 270,
    hp: 100, maxHp: 100,     // combat health (separate from labor energy)
    mana: 50, maxMana: 50,   // for magic staff / spells
    armor: null,             // equipped armor item id
    spell: "fireball",       // selected staff spell
    day: 1, season: 0, year: 1,
    minutes: 6*60,           // 6:00 AM
    weather: "Sunny",
    area: "farm",
    px: 20*W.tile, py: 15*W.tile, dir: "down",
    hotbarIndex: 0,
    inventory: [
      { id:"hoe", n:1 }, { id:"wateringcan", n:1 }, { id:"axe", n:1 },
      { id:"pickaxe", n:1 }, { id:"sword", n:1 }, { id:"rod", n:1 },
      { id:"parsnip_seed", n:15 }, { id:"potato_seed", n:8 }, { id:"hp_potion", n:2 }, null, null, null,
      null,null,null,null,null,null,null,null,null,null,null,null,
    ],
    crops: {},               // "area:x,y" -> { crop, stage, watered, dead }
    removed: {},             // "area:x,y" -> true (chopped trees / mined rocks)
    placed: {},              // "area:x,y" -> { id, emoji } (sprinklers/scarecrows/paths)
    weeds: {},               // "area:x,y" -> true (weeds on tilled soil)
    soilFert: {},            // "area:x,y" -> fertilizer tier applied pre-planting
    bombs: {},               // "area:x,y" -> true (armed bombs)
    maxFloorReached: 1,      // deepest mine floor (for the elevator)
    craftables: {},          // crafted placeable objects held: id -> count
    skills: Object.fromEntries(D.SKILLS.map(k=>[k, {xp:0, lvl:1}])),
    perks: [],               // unlocked talent ids
    toolTier: { hoe:0, wateringcan:0, axe:0, pickaxe:0, sword:0 },
    buildings: [],           // { type, emoji, area, x, y }
    animals: [],             // { type, name, hearts, product }
    friendship: {},          // npcId -> points (100 = 1 heart)
    npcUnlocks: {},          // npcId -> [heart levels already unlocked]
    knownRecipes: [],        // recipes learned from villagers
    talkedToday: {},
    lastAction: null,        // most recent notable deed (for NPC reactions)
    collected: {},           // "area:item" -> true (one-time collectibles)
    activeQuests: D.QUESTS.slice(0,4).map(q=>q.id),
    completedQuests: [],
    achievements: [],
    stats: { harvest:0, chop:0, mine:0, fish:0, legend:0, cook:0,
             earn:0, teased:0, stayedLate:0, kills:0, forage:0,
             deepest:1, upgrades:0, collectibles:0, secrets:0, events:0, goldCrops:0,
             bosses:0, chests:0, spells:0, dodges:0, gifts:0, cutscenes:0 },
    visited: { farm:true },
    buffs: [],               // {stat, amount, label, until(min)}
    muted: false,
    tutorialSeen: false,     // has the welcome guide been shown
    objectiveStep: 0,        // index into OBJECTIVES (early-game guidance)
  };
  return s;
}

/* ============================================================
   CANVAS + RENDER
   ============================================================ */
const cv = $("#game-canvas");
const cx = cv.getContext("2d");
cx.imageSmoothingEnabled = false;

/* fullscreen: match canvas backing store to the viewport (device pixels
   kept 1:1 for crisp pixel art). Re-run on load and window resize. */
function resizeCanvas(){
  cv.width = window.innerWidth;
  cv.height = window.innerHeight;
  cx.imageSmoothingEnabled = false;
  rainDrops = []; // regenerate weather particles for new size
}
window.addEventListener("resize", resizeCanvas);

const TILE_COLORS = {
  [T.GRASS]:"#4a7c3a", [T.PATH]:"#b89b6e", [T.WATER]:"#2b6cb0",
  [T.TREE]:"#2f5c2a", [T.ROCK]:"#7a7a86", [T.WALL]:"#6b4a3a",
  [T.TILLED]:"#6b4a2a", [T.SAND]:"#d9c48a", [T.FLOOR]:"#3a3a44",
  [T.COUNTER]:"#8a5a2a", [T.WARP]:"#f4c430", [T.PLOT]:"#5a7c3a",
  [T.ORE]:"#5a5a66", [T.BUSH]:"#3a6c2a", [T.FLOWER]:"#4a7c3a",
  [T.SNOW]:"#e8eef5", [T.DARKROCK]:"#2a2a34", [T.BRIDGE]:"#9a6a3a",
  [T.DECO]:"#5a5a66", [T.LADDER]:"#3a3a44", [T.CHEST]:"#3a3a44", [T.ELEVATOR]:"#3a3a44",
};

function area(){ return W.areas[S.area]; }
/* active-area dimensions (maps vary in size) */
function AC(){ return area().cols; }
function AR(){ return area().rows; }

/* camera follows player, clamped to map bounds */
const cam = { x:0, y:0 };
function updateCamera(){
  const mapW = AC()*W.tile, mapH = AR()*W.tile;
  let tx = S.px + 16 - cv.width/2;
  let ty = S.py + 16 - cv.height/2;
  // clamp so we never scroll past edges (unless map smaller than viewport)
  cam.x = mapW <= cv.width  ? (mapW - cv.width)/2  : Math.max(0, Math.min(tx, mapW - cv.width));
  cam.y = mapH <= cv.height ? (mapH - cv.height)/2 : Math.max(0, Math.min(ty, mapH - cv.height));
}

function draw(){
  const a = area();
  updateCamera();
  cx.clearRect(0,0,cv.width,cv.height);

  cx.save();
  cx.translate(-Math.round(cam.x), -Math.round(cam.y));

  // only draw tiles within the visible window (+1 margin)
  const x0 = Math.max(0, Math.floor(cam.x/W.tile)-1);
  const y0 = Math.max(0, Math.floor(cam.y/W.tile)-1);
  const x1 = Math.min(a.cols-1, Math.ceil((cam.x+cv.width)/W.tile)+1);
  const y1 = Math.min(a.rows-1, Math.ceil((cam.y+cv.height)/W.tile)+1);

  for(let y=y0;y<=y1;y++){
    for(let x=x0;x<=x1;x++){
      const t = a.tiles[y][x];
      const removed = S.removed[key(x,y)];
      // base ground under removable props
      if([T.TREE,T.ROCK,T.ORE,T.BUSH].includes(t)){
        cx.fillStyle = a.isMine ? TILE_COLORS[T.FLOOR] : TILE_COLORS[T.GRASS];
        if(a.id==="beach"||a.id==="desert") cx.fillStyle=TILE_COLORS[T.SAND];
        cx.fillRect(x*W.tile, y*W.tile, W.tile, W.tile);
      } else {
        cx.fillStyle = TILE_COLORS[t] || "#000";
        cx.fillRect(x*W.tile, y*W.tile, W.tile, W.tile);
      }
      if(t===T.PLOT){ cx.strokeStyle="rgba(0,0,0,.15)"; cx.strokeRect(x*W.tile,y*W.tile,W.tile,W.tile); }
      if(t===T.TREE && !removed) drawTree(x,y);
      if(t===T.ROCK && !removed) drawRock(x,y);
      if(t===T.BUSH && !removed) drawBush(x,y);
      if(t===T.ORE && !removed) drawOre(x,y);
      if(t===T.FLOWER) drawEmoji("🌷", x, y, 0.8);
      if(t===T.TILLED){
        const tk=`${a.id}:${x},${y}`;
        if(S.soilFert && S.soilFert[tk]){ cx.fillStyle="rgba(120,80,40,.35)"; cx.fillRect(x*W.tile,y*W.tile,W.tile,W.tile); }
        if(S.weeds && S.weeds[tk]) drawEmoji("🌱", x, y, 0.8); // weed sprite
      }
      if(t===T.WARP) drawWarp(x,y);
      if(t===T.COUNTER) drawEmoji("🛒", x, y);
      if(t===T.LADDER) drawEmoji("🪜", x, y, 1.0);
      if(t===T.ELEVATOR) drawEmoji("🛗", x, y, 1.0);
      if(t===T.CHEST && !S.removed[key(x,y)]) drawEmoji("🎁", x, y, 1.0);
      if(S.bombs && S.bombs[`${a.id}:${x},${y}`]) drawEmoji("💣", x, y, 1.0);
    }
  }

  // crops
  for(const k in S.crops){
    const [ar, coord] = k.split(":");
    if(ar!==S.area) continue;
    const [cxp,cyp] = coord.split(",").map(Number);
    drawCrop(cxp,cyp, S.crops[k]);
  }

  // placed farm objects (sprinklers/scarecrows/buildings)
  for(const k in (S.placed||{})){
    const [ar, coord] = k.split(":");
    if(ar!==S.area) continue;
    const [ox,oy] = coord.split(",").map(Number);
    drawEmoji(S.placed[k].emoji, ox, oy, 1.0);
  }

  // buildings on farm
  if(S.buildings) for(const b of S.buildings){
    if(b.area===S.area) drawEmoji(b.emoji, b.x, b.y, 1.4);
  }

  // NPCs (placed by their daily schedule)
  for(const spawn of npcsInArea(a.id)){
    const npc = D.NPCS[spawn.id];
    // gentle idle bob so villagers feel alive
    const bob = Math.sin(anim*0.08 + spawn.x)*2;
    cx.font = `${Math.floor(W.tile*1.1)}px serif`; cx.textAlign="center"; cx.textBaseline="middle";
    cx.fillText(npc.emoji, spawn.x*W.tile+W.tile/2, spawn.y*W.tile+W.tile/2+bob);
    // birthday hat + heart cue
    if(isBirthday(spawn.id)) cx.fillText("🎉", spawn.x*W.tile+W.tile/2+10, spawn.y*W.tile+4+bob);
    else if(!S.talkedToday[spawn.id]) { cx.font="12px serif"; cx.fillText("💬", spawn.x*W.tile+W.tile/2+12, spawn.y*W.tile+6+bob); }
  }

  // interact markers
  for(const it of (a.interact||[])){
    const icons={ shop:"🏪", kitchen:"🍳", craft:"🔨", bed:"🚪",
                  upgrade:"⚒️", ship:"📦", build:"🏗️", forage:"🧺",
                  secret:"✨" };
    // collectibles show their item until picked up, then vanish
    if(it.kind==="collect"){
      if(!(S.collected && S.collected[`${a.id}:${it.item}`])) drawEmoji(D.ITEMS[it.item].emoji, it.x, it.y, 1.0);
    } else if(icons[it.kind]) drawEmoji(icons[it.kind], it.x, it.y);
  }

  // enemies (mines only)
  for(const e of enemies){
    drawEmoji(e.hurt>0?"💥":e.emoji, e.x, e.y+16, e.scale||1.0, true);
    if(e.boss){ // boss health bar
      const w=48, ratio=Math.max(0,e.hp/e.maxhp);
      cx.fillStyle="#000"; cx.fillRect(e.x-w/2, e.y-14, w, 5);
      cx.fillStyle="#e05050"; cx.fillRect(e.x-w/2, e.y-14, w*ratio, 5);
    }
  }

  // projectiles (arrows / magic)
  for(const p of projectiles) drawEmoji(p.emoji, p.x, p.y, 0.8, true);

  // player
  drawPlayer();

  cx.restore();

  // overlays in SCREEN space (not affected by camera)
  drawLighting(a);
  drawWeather();
  if(S.hurtFlash>0){ cx.fillStyle=`rgba(220,40,40,${S.hurtFlash*0.03})`; cx.fillRect(0,0,cv.width,cv.height); }
}

function drawEmoji(ch, tx, ty, scale=1, pixel=false){
  cx.font = `${Math.floor(W.tile*scale)}px serif`;
  cx.textAlign = "center"; cx.textBaseline = "middle";
  const px = pixel ? tx : tx*W.tile + W.tile/2;
  const py = pixel ? ty : ty*W.tile + W.tile/2;
  cx.fillText(ch, px, py);
}
function drawTree(x,y){ drawEmoji("🌳", x, y, 1.3); }
function drawRock(x,y){ drawEmoji("🪨", x, y, 1.0); }
function drawBush(x,y){ drawEmoji("🌿", x, y, 1.0); }
function drawOre(x,y){ drawEmoji("💠", x, y, 1.0); }
function drawWarp(x,y){
  cx.save(); cx.globalAlpha = 0.5 + 0.3*Math.sin(anim*0.1);
  cx.fillStyle = "#f4c430"; cx.fillRect(x*W.tile+8,y*W.tile+8,W.tile-16,W.tile-16);
  cx.restore();
  drawEmoji("➡️", x, y, 0.8);
}
function drawCrop(x,y,c){
  if(c.dead){ drawEmoji("🥀", x, y, 0.9); return; }
  const cropDef = D.CROPS[c.crop];
  const ratio = c.stage / cropDef.stages;
  if(!c.watered){ /* dry soil already tilled color */ }
  else { cx.fillStyle="rgba(43,108,176,.25)"; cx.fillRect(x*W.tile,y*W.tile,W.tile,W.tile); }
  if(c.fert){ cx.fillStyle="rgba(120,80,40,.25)"; cx.fillRect(x*W.tile,y*W.tile,W.tile,W.tile); }
  if(ratio < 0.34) drawEmoji("🌱", x, y, 0.7);
  else if(ratio < 0.75) drawEmoji("🌿", x, y, 0.9);
  else if(c.stage < cropDef.stages) drawEmoji("🌾", x, y, 1.0);
  else { drawEmoji(D.ITEMS[cropDef.yield].emoji, x, y, 1.1); if(c.fert){ cx.font="10px serif"; cx.fillText("✨", x*W.tile+W.tile-6, y*W.tile+6); } }
}
function drawPlayer(){
  const bob = Math.sin(anim*0.3)* (isMoving()?2:0);
  cx.save();
  // body
  cx.fillStyle = S.shirt || "#3aa655";
  cx.fillRect(S.px+8, S.py+14+bob, 16, 12);
  // head
  cx.fillStyle = "#f0c090";
  cx.fillRect(S.px+10, S.py+4+bob, 12, 12);
  // hat
  cx.fillStyle = "#8a5a2a";
  cx.fillRect(S.px+8, S.py+2+bob, 16, 5);
  // direction eyes
  cx.fillStyle="#000";
  const ex = S.dir==="left"?11 : S.dir==="right"?17 : 13;
  cx.fillRect(S.px+ex, S.py+8+bob, 2,2); cx.fillRect(S.px+ex+4, S.py+8+bob, 2,2);
  cx.restore();
  // dodge trail
  if(S.iframes && performance.now() < S.iframes){ cx.globalAlpha=0.35; cx.fillStyle="#8be9fd"; cx.fillRect(S.px+8,S.py+14,16,12); cx.globalAlpha=1; }
  // block shield in facing direction
  if(S.blocking){
    const d=dirVector(); cx.font="16px serif"; cx.textAlign="center"; cx.textBaseline="middle";
    cx.fillText("🛡️", S.px+16+d.x*14, S.py+16+d.y*14);
  }
  // attack flash
  if(S.attackAnim>0){
    const d=dirVector(); cx.globalAlpha=S.attackAnim/8; cx.font="18px serif"; cx.textAlign="center"; cx.textBaseline="middle";
    cx.fillText("✦", S.px+16+d.x*18, S.py+16+d.y*18); cx.globalAlpha=1;
  }
}

function drawLighting(a){
  // time-based darkness
  let dark = 0;
  const m = S.minutes;
  if(m < 6*60) dark = 0.5;
  else if(m < 8*60) dark = 0.5 * (1 - (m-6*60)/120);
  else if(m > 18*60 && m < 20*60) dark = 0.4 * ((m-18*60)/120);
  else if(m >= 20*60) dark = Math.min(0.65, 0.4 + (m-20*60)/1200);
  if(a.tint){
    cx.fillStyle = a.tint; cx.fillRect(0,0,cv.width,cv.height);
  }
  if(dark>0){
    cx.fillStyle = `rgba(10,10,40,${dark})`;
    cx.fillRect(0,0,cv.width,cv.height);
  }
  if(a.id==="mines"){ cx.fillStyle="rgba(0,0,0,.35)"; cx.fillRect(0,0,cv.width,cv.height); }
}

let rainDrops = [];
function drawWeather(){
  if(S.weather==="Rain" || S.weather==="Storm"){
    if(rainDrops.length===0) for(let i=0;i<80;i++) rainDrops.push({x:Math.random()*cv.width,y:Math.random()*cv.height,s:4+Math.random()*4});
    cx.strokeStyle = S.weather==="Storm" ? "rgba(180,180,255,.6)" : "rgba(150,180,255,.5)";
    cx.lineWidth=1;
    for(const d of rainDrops){
      cx.beginPath(); cx.moveTo(d.x,d.y); cx.lineTo(d.x-2,d.y+8); cx.stroke();
      d.y += d.s; if(d.y>cv.height){ d.y=-8; d.x=Math.random()*cv.width; }
    }
    if(S.weather==="Storm" && Math.random()<0.01){ cx.fillStyle="rgba(255,255,255,.3)"; cx.fillRect(0,0,cv.width,cv.height); }
  } else if(S.weather==="Snow"){
    if(rainDrops.length===0) for(let i=0;i<60;i++) rainDrops.push({x:Math.random()*cv.width,y:Math.random()*cv.height,s:1+Math.random()*2});
    cx.fillStyle="rgba(255,255,255,.8)";
    for(const d of rainDrops){ cx.fillRect(d.x,d.y,2,2); d.y+=d.s; d.x+=Math.sin(d.y*0.05); if(d.y>cv.height){d.y=-4;d.x=Math.random()*cv.width;} }
  } else if(S.weather==="Fog"){
    cx.fillStyle="rgba(200,200,210,.25)"; cx.fillRect(0,0,cv.width,cv.height);
  } else rainDrops = [];
}

/* ============================================================
   HELPERS
   ============================================================ */
function key(x,y){ return `${S.area}:${x},${y}`; }
function tileAt(x,y){ const a=area(); return (a.tiles[y]&&a.tiles[y][x]!==undefined)?a.tiles[y][x]:T.WALL; }
function playerTile(){ return { x: Math.round(S.px/W.tile), y: Math.round(S.py/W.tile) }; }
function facingTile(){
  const p = playerTile();
  if(S.dir==="up") return {x:p.x, y:p.y-1};
  if(S.dir==="down") return {x:p.x, y:p.y+1};
  if(S.dir==="left") return {x:p.x-1, y:p.y};
  return {x:p.x+1, y:p.y};
}
function isMoving(){ return keys["w"]||keys["a"]||keys["s"]||keys["d"]||keys["arrowup"]||keys["arrowdown"]||keys["arrowleft"]||keys["arrowright"]; }

function solid(x,y){
  const t = tileAt(x,y);
  if([T.WATER,T.WALL,T.COUNTER,T.DARKROCK].includes(t)) return true;
  if([T.TREE,T.ROCK,T.ORE].includes(t) && !S.removed[key(x,y)]) return true;
  if(t===T.CHEST && !S.removed[key(x,y)]) return true; // interact from adjacent
  // placed buildings block movement
  if(S.buildings && S.buildings.some(b=>b.area===S.area && x>=b.x-1 && x<=b.x+1 && y>=b.y-1 && y<=b.y+1)) return true;
  return false;
}

/* ---------- inventory ops ----------
   Slots optionally carry a quality `q` (0=Normal..3=Iridium). Items
   only stack with a matching quality so gold crops stay distinct.    */
function held(){ return S.inventory[S.hotbarIndex]; }
function findItem(id){ return S.inventory.find(s=>s&&s.id===id); }
function countItem(id){ return S.inventory.filter(s=>s&&s.id===id).reduce((a,s)=>a+s.n,0); }
function addItem(id, n=1, q=0){
  const def = D.ITEMS[id]; if(!def) return false;
  // stack into existing (same id AND same quality)
  for(const slot of S.inventory){
    if(slot && slot.id===id && (slot.q||0)===q && slot.n < def.stack){
      const room = def.stack - slot.n; const put = Math.min(room, n);
      slot.n += put; n -= put; if(n<=0) return true;
    }
  }
  // new slots
  for(let i=0;i<S.inventory.length;i++){
    if(!S.inventory[i]){ const put=Math.min(def.stack,n); S.inventory[i]= q? {id,n:put,q} : {id,n:put}; n-=put; if(n<=0) return true; }
  }
  return n<=0;
}
function removeItem(id, n=1){
  for(let i=0;i<S.inventory.length;i++){
    const slot=S.inventory[i];
    if(slot && slot.id===id){ const take=Math.min(slot.n,n); slot.n-=take; n-=take; if(slot.n<=0) S.inventory[i]=null; if(n<=0) return true; }
  }
  return n<=0;
}

/* ---------- skills / xp / talents ---------- */
function gainXp(skill, amount){
  const sk = S.skills[skill]; if(!sk) return;
  sk.xp += amount;
  let need = sk.lvl*100;
  while(sk.xp >= need && sk.lvl < 100){
    sk.xp -= need; sk.lvl++; A.sfx("levelup"); toast(`${skill} up! Lv.${sk.lvl}`);
    recordAction("levelup");
    unlockTalents(skill);
    need = sk.lvl*100;
  }
}
function unlockTalents(skill){
  const tree = D.TALENTS[skill]||[];
  for(const t of tree){
    if(S.skills[skill].lvl >= t.lvl && !S.perks.includes(t.id)){
      S.perks.push(t.id);
      progressQuest("talent",1);
      toast(`🎓 Perk unlocked: ${t.name} — ${t.desc}`);
    }
  }
}
function hasPerk(id){ return S.perks && S.perks.includes(id); }
function toolPower(tool){ return 1 + (S.toolTier && S.toolTier[tool] || 0); }

/* ---------- energy ---------- */
function useEnergy(n){
  // defender/tool tiers reduce cost slightly
  S.energy = Math.max(0, S.energy - n);
  if(S.energy < 40 && S.lastAction!=="broke") recordAction("broke");
  if(S.energy<=0){ toast("Exhausted! Bing passes out..."); passOut(); }
  updateHud();
}

/* ============================================================
   TIME / DAY / WEATHER
   ============================================================ */
function tickTime(){
  S.minutes += 1;
  if(S.minutes >= 26*60){ /* 2 AM hard cap */ S.stats.stayedLate=(S.stats.stayedLate||0)+1; passOut(); return; }
  if(S.minutes === 24*60+120){ /* handled above */ }
  if(S.minutes >= 24*60 && S.minutes < 24*60+2){ S.stats.stayedLate=(S.stats.stayedLate||0)+1; checkAchievements(); }
  // slow passive mana + slight HP regen outside combat
  if(S.mana < S.maxMana) S.mana = Math.min(S.maxMana, S.mana+1);
  if(S.area!=="mines" && S.hp < S.maxHp) S.hp = Math.min(S.maxHp, S.hp+1);
  updateHud();
}
function rollWeather(){
  const seasonName = D.SEASONS[S.season];
  const table = seasonName==="Winter"
    ? ["Sunny","Snow","Snow","Fog","Sunny"]
    : seasonName==="Summer"
    ? ["Sunny","Sunny","Heatwave","Rain","Storm"]
    : ["Sunny","Rain","Sunny","Fog","Rain"];
  S.weather = table[Math.floor(Math.random()*table.length)];
  rainDrops = [];
}

/* sleep / new day */
function passOut(){ sleep(true); }
function sleep(fainted){
  A.sfx("sleep");
  const fade = ensureFade(); fade.classList.add("on");
  setTimeout(()=>{
    // advance day
    S.day++;
    if(S.day > D.DAYS_PER_SEASON){ S.day=1; S.season=(S.season+1)%4; if(S.season===0) S.year++; }
    S.minutes = 6*60;
    S.energy = fainted ? Math.floor(S.maxEnergy*0.5) : S.maxEnergy;
    S.hp = S.maxHp; S.mana = S.maxMana;   // a night's rest fully heals
    S.talkedToday = {};
    S.lastAction = null;
    growCrops();
    produceAnimals();
    rollWeather();
    // rain waters crops
    if(S.weather==="Rain"||S.weather==="Storm") for(const k in S.crops) if(!S.crops[k].dead) S.crops[k].watered=true;
    save();
    fade.classList.remove("on");
    updateHud();
    toast(fainted ? "You woke up at home. That was rough." : `Day ${S.day} — ${D.SEASONS[S.season]}`);
    if(S._crowAte){ S._crowAte=false; setTimeout(()=>toast("🐦 A crow ate an unprotected crop! Build scarecrows."), 500); }
    rollRandomEvent();
    checkAchievements();
  }, 900);
}

/* random overnight events — surprises that greet you each morning */
const RANDOM_EVENTS = [
  { chance:0.10, run:()=>{ addItem("gem",1); return "🛸 A UFO buzzed the farm overnight and dropped a Widr Gem!"; } },
  { chance:0.08, run:()=>{ addItem("stone",10); addItem("iron",2); return "☄️ A meteor struck the fields! You salvaged stone and iron."; } },
  { chance:0.10, run:()=>{ for(const k in S.crops) if(!S.crops[k].dead) S.crops[k].watered=true; return "🧚 A fairy watered every crop for you last night."; } },
  { chance:0.08, run:()=>{ S.money+=300; return "💰 A mysterious traveler left 300g on your porch."; } },
  { chance:0.06, run:()=>{ addItem("egg",3); return "🐔 Escaped chickens roosted here and left 3 eggs behind."; } },
  { chance:0.05, run:()=>{ addItem("berry",5); return "🧺 A hidden merchant left a basket of wild berries."; } },
];
function rollRandomEvent(){
  for(const ev of RANDOM_EVENTS){
    if(Math.random() < ev.chance){
      const msg = ev.run();
      S.stats.events = (S.stats.events||0)+1;
      setTimeout(()=>{ toast(msg); A.sfx("quest"); }, 700);
      return; // at most one event per morning
    }
  }
}
function ensureFade(){
  let f = $("#fade"); if(!f){ f=document.createElement("div"); f.id="fade"; $("#game-screen").appendChild(f);} return f;
}

/* crops grow / die overnight */
function growCrops(){
  const seasonName = D.SEASONS[S.season];
  const hasGreenhouse = (S.buildings||[]).some(b=>b.type==="greenhouse");
  // sprinklers auto-water adjacent crops before growth
  for(const pk in (S.placed||{})){
    const obj = S.placed[pk];
    if(obj.id==="sprinkler"||obj.id==="quality_sprinkler"){
      const [pa, coord] = pk.split(":"); const [sx,sy]=coord.split(",").map(Number);
      const r = obj.id==="quality_sprinkler"?2:1;
      const extra = hasPerk("engineer")?1:0;
      for(let dy=-(r+extra);dy<=(r+extra);dy++) for(let dx=-(r+extra);dx<=(r+extra);dx++){
        const wk=`${pa}:${sx+dx},${sy+dy}`;
        if(S.crops[wk]&&!S.crops[wk].dead) S.crops[wk].watered=true;
      }
    }
  }
  for(const k in S.crops){
    const c = S.crops[k]; if(c.dead) continue;
    const def = D.CROPS[c.crop];
    const inSeason = def.seasons.includes(seasonName) || (hasGreenhouse && k.startsWith("farm:"));
    if(!inSeason){ c.dead = true; continue; }
    if(c.watered && c.stage < def.stages){
      c.stage++;
      c.careScore = (c.careScore||0)+1;   // watered day counts toward quality
      // agriculturist: extra growth tick sometimes
      if(hasPerk("agriculturist") && Math.random()<0.2 && c.stage<def.stages) c.stage++;
      c.watered=false;
    } else if(!c.watered){ c.watered=false; }
  }
  // crows: each night a crow may eat an unprotected growing crop.
  // scarecrows within radius 4 prevent it.
  const crops = Object.keys(S.crops).filter(k=>!S.crops[k].dead && k.startsWith("farm:"));
  if(crops.length && Math.random()<0.25){
    const victim = crops[Math.floor(Math.random()*crops.length)];
    const [ , coord] = victim.split(":"); const [vx,vy]=coord.split(",").map(Number);
    let guarded=false;
    for(const pk in (S.placed||{})){
      if(S.placed[pk].id!=="scarecrow") continue;
      const [pa, pc]=pk.split(":"); if(pa!=="farm") continue;
      const [sx,sy]=pc.split(",").map(Number);
      if(Math.abs(sx-vx)<=4 && Math.abs(sy-vy)<=4){ guarded=true; break; }
    }
    if(!guarded){ delete S.crops[victim]; S._crowAte=true; }
  }
  // weeds spread onto empty tilled soil overnight (must be cleared)
  if(!S.weeds) S.weeds={};
  const a = W.areas.farm;
  if(a){
    let tries=6;
    while(tries-->0){
      const x=1+Math.floor(Math.random()*(a.cols-2)), y=1+Math.floor(Math.random()*(a.rows-2));
      const wk=`farm:${x},${y}`;
      if(a.tiles[y][x]===T.TILLED && !S.crops[wk] && !S.weeds[wk]){ S.weeds[wk]=true; }
    }
  }
}
function produceAnimals(){
  // each owned animal drops its product daily into the coop/barn (inventory)
  for(const a of (S.animals||[])){
    const def = D.ANIMALS[a.type];
    if(!def) continue;
    // happier animals (fed by existing) always produce here; simplified
    addItem(def.product, 1);
    a.hearts = Math.min(1000, (a.hearts||0)+10);
  }
}

/* ============================================================
   FARMING ACTIONS
   ============================================================ */
function useToolOnFacing(){
  const f = facingTile();
  const t = tileAt(f.x, f.y);
  const item = held();
  const cropK = key(f.x, f.y);

  // harvest ready crop (any tool / hand)
  if(S.crops[cropK] && !S.crops[cropK].dead){
    const c = S.crops[cropK]; const def = D.CROPS[c.crop];
    if(c.stage >= def.stages){
      let qty = 1;
      if(hasPerk("green_thumb") && Math.random()<0.25) qty++;
      if(hasPerk("giant_grower") && Math.random()<0.1){ qty+=2; toast("A GIANT crop!"); }
      const q = cropQuality(c);
      addItem(def.yield, qty, q); A.sfx("harvest");
      S.stats.harvest+=qty; gainXp("Farming", 12);
      recordAction("harvest");
      if(q>=2) S.stats.goldCrops=(S.stats.goldCrops||0)+qty;
      progressQuest("harvest",1);
      if(def.regrow){ c.stage = def.stages - def.regrow; if(c.stage<1) c.stage=1; c.careScore=0; c.fert=c.fert||0; } else { delete S.crops[cropK]; }
      const qName = q>0 ? ` (${D.QUALITY[q].name}${D.QUALITY[q].star})` : "";
      toast(`Harvested ${qty}× ${D.ITEMS[def.yield].name}${qName}!`);
      checkAchievements(); return;
    }
  }
  if(S.crops[cropK] && S.crops[cropK].dead && item && item.id==="scythe"){ delete S.crops[cropK]; toast("Cleared dead crop."); return; }

  // clear weeds with hoe or scythe
  if(S.weeds && S.weeds[cropK] && item && (item.id==="hoe"||item.id==="scythe")){
    delete S.weeds[cropK]; A.sfx("chop"); useEnergy(1);
    if(Math.random()<0.5) addItem("fiber",1);
    gainXp("Farming",1); toast("Pulled weeds."); return;
  }

  if(!item){ return; }

  // apply fertilizer to tilled soil (works with or without a planted crop)
  if(D.ITEMS[item.id] && D.ITEMS[item.id].type==="fertilizer"){
    if(t===T.TILLED){
      const tier = D.ITEMS[item.id].tier;
      if(S.crops[cropK]){ S.crops[cropK].fert = Math.max(S.crops[cropK].fert||0, tier); }
      else { if(!S.soilFert) S.soilFert={}; S.soilFert[cropK]=tier; } // remembered for next planting
      removeItem(item.id,1); A.sfx("plant");
      toast(`Fertilized soil (${D.ITEMS[item.id].name}).`); refreshHotbar(); return;
    } else { toast("Fertilizer goes on tilled soil."); A.sfx("error"); return; }
  }

  switch(item.id){
    case "hoe":
      if(t===T.PLOT || t===T.GRASS || t===T.SAND){
        area().tiles[f.y][f.x] = T.TILLED; A.sfx("till"); useEnergy(Math.max(1,3-toolPower("hoe"))); gainXp("Farming",2);
      } else A.sfx("error");
      break;
    case "wateringcan": {
      const r = toolPower("wateringcan"); // radius grows with tier
      if(t===T.TILLED || t===T.WATER){
        A.sfx("water"); useEnergy(1);
        // water facing tile + surrounding based on tier
        for(let dy=-(r-1);dy<=(r-1);dy++) for(let dx=-(r-1);dx<=(r-1);dx++){
          const wk=key(f.x+dx,f.y+dy);
          if(S.crops[wk]&&!S.crops[wk].dead) S.crops[wk].watered=true;
        }
        if(S.crops[cropK]&&!S.crops[cropK].dead) S.crops[cropK].watered=true;
        toast(r>1?"Watered an area.":"Watered.");
      } else A.sfx("error");
      break;
    }
    case "axe":
      if(t===T.TREE && !S.removed[cropK]){
        S.removed[cropK]=true;
        let w = 2+Math.floor(Math.random()*3)+ (toolPower("axe")-1);
        if(hasPerk("lumberjack")) w+=1;
        addItem("wood", w); A.sfx("chop"); useEnergy(Math.max(1,3-toolPower("axe"))); S.stats.chop+=w;
        gainXp("Foraging",4); progressQuest("chop",w); toast(`Chopped ${w} wood!`); checkAchievements();
      } else if(t===T.BUSH && !S.removed[cropK]){ forageBush(cropK); }
      else A.sfx("error");
      break;
    case "pickaxe":
      if(t===T.ROCK && !S.removed[cropK]){
        S.removed[cropK]=true;
        let st = 1+Math.floor(Math.random()*2)+(toolPower("pickaxe")-1);
        addItem("stone", st); if(Math.random()<0.2) addItem("coal",1);
        A.sfx("mine"); useEnergy(Math.max(1,3-toolPower("pickaxe"))); S.stats.mine+=st; gainXp("Mining",4); toast(`Mined ${st} stone!`); checkAchievements();
      }
      else if(t===T.ORE && !S.removed[cropK]){ mineOre(cropK); }
      else A.sfx("error");
      break;
    case "sword":
      useWeapon("sword"); break;
    case "rod":
      if(t===T.WATER) startFishing(); else A.sfx("error");
      break;
    default:
      // weapons (club/dagger/bow/staff)
      if(D.ITEMS[item.id] && D.ITEMS[item.id].type==="weapon"){ useWeapon(item.id); break; }
      // potions
      if(D.ITEMS[item.id] && D.ITEMS[item.id].type==="potion"){ drinkPotion(item.id); break; }
      // armor -> equip
      if(D.ITEMS[item.id] && D.ITEMS[item.id].type==="armor"){ equipArmor(item.id); break; }
      // planting seeds
      if(item.type==="seed" || (D.ITEMS[item.id]&&D.ITEMS[item.id].type==="seed")){
        plantSeed(f, cropK, item.id);
      } else if(t===T.BUSH && !S.removed[cropK]){ forageBush(cropK); }
  }
  updateHud(); refreshHotbar();
}

/* crop quality from accumulated care: watering streak + fertilizer +
   farming skill. Returns 0..3 (Normal/Silver/Gold/Iridium). */
function cropQuality(c){
  const fert = c.fert||0;               // 0..3 fertilizer tier
  const care = c.careScore||0;          // +1 per day watered
  const stages = D.CROPS[c.crop].stages;
  const wateredRatio = stages? Math.min(1, care/stages) : 0;
  const farmLvl = S.skills.Farming.lvl;
  // base score 0..1
  let score = wateredRatio*0.5 + (fert/3)*0.35 + Math.min(0.15, farmLvl/300);
  score += (Math.random()-0.5)*0.15;    // a little luck
  if(score >= 0.9) return 3;
  if(score >= 0.7) return 2;
  if(score >= 0.45) return 1;
  return 0;
}

/* forage a bush -> season-appropriate item */
function forageBush(cropK){
  S.removed[cropK]=true;
  const table = D.FORAGE[D.SEASONS[S.season]] || ["fiber"];
  const id = table[Math.floor(Math.random()*table.length)];
  let qty = 1;
  if(hasPerk("gatherer") && Math.random()<0.3) qty++;
  addItem(id, qty);
  S.stats.forage=(S.stats.forage||0)+qty;
  gainXp("Foraging",5); progressQuest("forage",qty);
  A.sfx("harvest"); toast(`Foraged ${qty}× ${D.ITEMS[id].name}!`); checkAchievements();
}

function plantSeed(f, cropK, seedId){
  const t = tileAt(f.x,f.y);
  const def = D.ITEMS[seedId];
  if(t!==T.TILLED){ toast("Till the soil first (hoe)."); A.sfx("error"); return; }
  if(S.crops[cropK]){ toast("Already planted here."); return; }
  const cropId = def.crop;
  const seasonName = D.SEASONS[S.season];
  const hasGreenhouse = (S.buildings||[]).some(b=>b.type==="greenhouse");
  if(!D.CROPS[cropId].seasons.includes(seasonName) && !(hasGreenhouse && S.area==="farm")){ toast(`${def.name} won't grow in ${seasonName}.`); A.sfx("error"); return; }
  S.crops[cropK] = { crop:cropId, stage:0, watered:false, dead:false, careScore:0, fert:(S.soilFert&&S.soilFert[cropK])||0 };
  if(S.soilFert) delete S.soilFert[cropK];
  removeItem(seedId,1); A.sfx("plant"); gainXp("Farming",1);
  toast(`Planted ${def.name}.`);
}

function mineOre(cropK){
  S.removed[cropK]=true; A.sfx("mine"); useEnergy(Math.max(1,3-toolPower("pickaxe"))); gainXp("Mining",6); S.stats.mine++; recordAction("mine");
  const floor = area().floor||1;
  const roll = Math.random();
  let ore = "copper";
  const gemChance = hasPerk("geologist")?0.14:0.08;
  if(roll>1-gemChance) ore="gem";
  else if(floor>=15 && roll>0.86) ore="iridium";
  else if(roll>0.8) ore="gold";
  else if(roll>0.55) ore="iron";
  let qty = 1 + (hasPerk("miner")?1:0);
  if((ore==="coal"||ore==="iridium") && hasPerk("prospector")) qty*=2;
  addItem(ore,qty);
  if(ore==="copper") progressQuest("mine_copper",qty);
  toast(`Found ${qty}× ${D.ITEMS[ore].name}!`);
  checkAchievements();
}

/* descend via ladder tile — boss floors gate the ladder until cleared */
function tryDescendLadder(){
  const a = area();
  if(a.isBoss && !a.bossCleared){ toast("A boss blocks the way down! Defeat it first."); A.sfx("error"); return; }
  descendMine();
}
/* clear per-floor mine state so floors don't share removed/chest/bomb flags */
function clearMineTileState(){
  for(const k in S.removed) if(k.startsWith("mines:")) delete S.removed[k];
  for(const k in (S.bombs||{})) if(k.startsWith("mines:")) delete S.bombs[k];
}
function descendMine(){
  clearMineTileState();
  W.regenMine();
  S.px = 3*W.tile; S.py = 3*W.tile;   // land on the open entry zone
  spawnEnemies();
  S.stats.deepest = Math.max(S.stats.deepest||0, W.areas.mines.floor);
  S.maxFloorReached = Math.max(S.maxFloorReached||1, W.areas.mines.floor);
  if(W.areas.mines.floor>=5) progressQuest("mine_floor5",1);
  toast(`Descended to floor ${W.areas.mines.floor}` + (area().isBoss?" — BOSS!":""));
  checkAchievements();
}

/* elevator: fast-travel to any multiple-of-5 floor already reached */
function openElevator(){
  const maxF = S.maxFloorReached||1;
  S.paused = true;
  const ov = $("#shop-overlay"); ov.classList.remove("hidden");
  $("#shop-title").textContent = "🛗 Mine Elevator";
  const buy = $("#shop-buy"); buy.innerHTML = `<div class="desc" style="margin-bottom:8px">Deepest reached: floor ${maxF}. Jump to any checkpoint:</div>`;
  const sell = $("#shop-sell"); sell.innerHTML = "";
  // checkpoints every 5 floors up to reached, plus floor 1
  const floors=[1];
  for(let fl=5; fl<=maxF; fl+=5) floors.push(fl);
  if(!floors.includes(maxF)) floors.push(maxF);
  for(const fl of floors){
    const row=document.createElement("div"); row.className="shop-item";
    row.innerHTML=`<span>🛗 Floor ${fl}${fl%10===0?" (Boss)":""}</span><span class="price">Go</span>`;
    row.onclick=()=>{ closeShop(); elevatorTo(fl); };
    buy.appendChild(row);
  }
}
function elevatorTo(fl){
  clearMineTileState();
  W.regenMineTo(fl);
  S.area="mines"; S.px=3*W.tile; S.py=3*W.tile;
  warpLock={x:3,y:3};
  spawnEnemies();
  A.playMusic("mines");
  toast(`Elevator → floor ${fl}` + (area().isBoss?" — BOSS!":""));
}

/* open a treasure/secret chest for depth-scaled loot */
function openChest(f){
  const ck = key(f.x,f.y);
  S.removed[ck]=true;
  const floor = area().floor||1;
  A.sfx("levelup"); S.stats.chests=(S.stats.chests||0)+1;
  const gold = 100 + floor*20 + Math.floor(Math.random()*200);
  S.money += gold;
  const loot = [];
  loot.push(`${gold}g`);
  // depth-scaled item rolls
  const pool = floor>=50 ? ["iridium","gem","prismatic"] : floor>=20 ? ["gold","iridium","gem"] : ["iron","gold","coal"];
  const n = 1 + Math.floor(Math.random()*2);
  for(let i=0;i<n;i++){ const id=pool[Math.floor(Math.random()*pool.length)]; addItem(id,1); loot.push(D.ITEMS[id].name); }
  if(Math.random()<0.4){ addItem("bomb",2); loot.push("2× Bomb"); }
  showDialogue("🎁 Treasure!", `You open the chest: ${loot.join(", ")}.`);
  checkAchievements();
}

/* plant a bomb — explodes after a moment, clears rock in a radius and
   damages nearby enemies (used to reach secret rooms and mine fast). */
function placeBomb(f){
  const bk = key(f.x, f.y);
  if(!S.bombs) S.bombs = {};
  if(S.bombs[bk]) { toast("Already a bomb here."); return; }
  removeItem("bomb",1); S.bombs[bk]=true;
  A.sfx("mine"); toast("💣 Bomb placed! Stand back...");
  refreshHotbar();
  const bx=f.x, by=f.y, barea=S.area;
  setTimeout(()=>detonateBomb(barea,bx,by), 1400);
}
function detonateBomb(barea, bx, by){
  if(barea!==S.area) { delete S.bombs[`${barea}:${bx},${by}`]; return; }
  delete S.bombs[`${barea}:${bx},${by}`];
  A.sfx("hit");
  const a = area();
  const R=2;
  for(let dy=-R;dy<=R;dy++) for(let dx=-R;dx<=R;dx++){
    const x=bx+dx, y=by+dy;
    if(x<1||y<1||x>=a.cols-1||y>=a.rows-1) continue;
    const t=a.tiles[y][x];
    if(t===T.DARKROCK){ a.tiles[y][x]=T.FLOOR; }           // blast through rock walls
    else if(t===T.ORE && !S.removed[`${barea}:${x},${y}`]){ S.removed[`${barea}:${x},${y}`]=true; addItem("stone",1); }
  }
  // damage enemies in blast
  const cx0=(bx+0.5)*W.tile, cy0=(by+0.5)*W.tile;
  for(const e of enemies){ if(Math.hypot(e.x-cx0,e.y-cy0) < W.tile*R){ e.hp-=4; e.hurt=6; } }
  enemies = enemies.filter(e=>{ if(e.hp<=0){ gainXp("Combat", e.xp||8); S.stats.kills++; if(e.boss) onBossDefeated(); return false; } return true; });
  // player takes blast damage if too close
  if(Math.hypot((S.px+16)-cx0,(S.py+16)-cy0) < W.tile*1.5){ useEnergy(10); toast("The blast singed you! -10 energy"); }
  toast("💥 BOOM!");
  checkAchievements();
}

/* ---------- fishing minigame (timing bar) ---------- */
let fishing = null;
function startFishing(){
  if(fishing) return;
  toast("Cast! Wait for a bite...");
  A.sfx("water");
  const wait = 800 + Math.random()*2000;
  fishing = { phase:"wait" };
  setTimeout(()=>{
    if(!fishing) return;
    fishing.phase="bite"; toast("BITE! Press Space!");
    A.sfx("fish");
    const catchWindow = 900 + (hasPerk("angler")?500:0); // wider catch window
    fishing.deadline = performance.now()+catchWindow;
  }, wait);
}
function reelFish(){
  if(!fishing) return false;
  if(fishing.phase==="wait"){ toast("Too early — line's still out."); fishing=null; return true; }
  if(fishing.phase==="bite"){
    const ok = performance.now() < fishing.deadline;
    fishing=null;
    if(ok){
      const luck = getBuff("fishLuck");
      const legendBonus = hasPerk("legend_hunter")?0.04:0;
      const legend = Math.random() < (0.02 + luck*0.03 + legendBonus);
      if(legend){ addItem("legend_fish",1); S.stats.legend++; recordAction("legend"); toast("THE RIVERBEND LEGEND! Milo will lose it."); }
      else { addItem("fish",1); S.stats.fish++; recordAction("fish"); progressQuest("fish",1); toast("Caught a fish!"); }
      gainXp("Fishing", legend?50:8);
      A.sfx("levelup"); checkAchievements();
    } else toast("It got away. Classic.");
    return true;
  }
  return false;
}

/* ============================================================
   COMBAT (mines)
   ============================================================ */
let enemies = [];
const ENEMY_TYPES = [
  { emoji:"🟢", name:"Slime", hp:2, dmg:5, xp:6 },
  { emoji:"💀", name:"Skeleton", hp:4, dmg:10, xp:12 },
  { emoji:"🦇", name:"Bat", hp:2, dmg:6, xp:8 },
  { emoji:"👻", name:"Ghost", hp:3, dmg:8, xp:10 },
  { emoji:"🕷️", name:"Spider", hp:3, dmg:7, xp:9 },
];
const BOSS_TYPES = [
  { emoji:"👹", name:"Cave Ogre" }, { emoji:"🐲", name:"Rock Wyrm" },
  { emoji:"👾", name:"Meta Anomaly" }, { emoji:"🦂", name:"Iridium Scorpion" },
];
function spawnEnemies(){
  enemies = [];
  if(S.area!=="mines") return;
  const a = area();
  const floor = a.floor||1;
  if(a.isBoss && !a.bossCleared){
    // one big boss scaled by depth
    const b = BOSS_TYPES[Math.floor((floor/10-1)) % BOSS_TYPES.length];
    const hp = 20 + floor*3;
    enemies.push({ emoji:b.emoji, name:b.name, hp, maxhp:hp, dmg:12+Math.floor(floor/5), xp:100+floor*4,
                   x:(a.cols/2|0)*W.tile, y:(a.rows/2|0)*W.tile, hurt:0, boss:true, scale:1.6 });
    toast(`⚔️ ${b.name} guards floor ${floor}!`);
    return;
  }
  const n = 2 + Math.floor(Math.random()*3) + Math.floor(floor/20); // more/deeper
  for(let i=0;i<n;i++){
    const t = ENEMY_TYPES[Math.floor(Math.random()*ENEMY_TYPES.length)];
    const scale = 1 + Math.min(1, floor/100); // deeper = tougher
    enemies.push({ ...t, hp:Math.ceil(t.hp*scale), dmg:Math.round(t.dmg*(1+floor/60)), x:(3+Math.floor(Math.random()*(AC()-6)))*W.tile, y:(3+Math.floor(Math.random()*(AR()-6)))*W.tile, hurt:0 });
  }
}
function onBossDefeated(){
  const a = area();
  a.bossCleared = true;
  recordAction("boss");
  const floor = a.floor||1;
  const reward = 500 + floor*30;
  S.money += reward;
  addItem("prismatic",1); addItem("gem",2);
  S.stats.bosses = (S.stats.bosses||0)+1;
  A.sfx("levelup");
  showDialogue("🏆 Boss defeated!", `You slayed the floor ${floor} boss! Reward: ${reward}g, a Prismatic Shard, and 2 gems. The ladder down is open.`);
  checkAchievements();
}
/* ---------- weapons: melee swing, ranged/magic projectiles ---------- */
let projectiles = [];       // {x,y,vx,vy,dmg,crit,life,emoji,fromPlayer}
let weaponCooldown = 0;     // timestamp until which we can't attack

function useWeapon(id){
  const w = D.WEAPONS[id] || D.WEAPONS.sword;
  const now = performance.now();
  if(now < weaponCooldown){ return; }
  weaponCooldown = now + w.speed;

  if(w.kind==="magic"){
    if((S.mana||0) < (w.mana||0)){ toast("Out of mana! Drink a Mana Potion 🔵."); A.sfx("error"); return; }
    S.mana -= w.mana||0;
    castStaff(w);
    updateHud(); return;
  }
  if(w.kind==="ranged"){ fireProjectile(w); return; }
  meleeSwing(id, w);
}

function meleeSwing(id, w){
  A.sfx("hit"); useEnergy(1);
  S.attackAnim = 8; // for a little swing flash
  const px=S.px+16, py=S.py+16;
  const reach = W.tile*(w.reach||1.4);
  const critChance = (w.crit||0.2) + (hasPerk("brute")?0.15:0);
  const dmgBonus = hasPerk("fighter")?0.1:0;
  const tierBonus = id==="sword" ? toolPower("sword") : 1; // sword still upgrades at blacksmith
  let hit=false;
  for(const e of enemies){
    const d = Math.hypot(e.x-px, e.y-py);
    if(d < reach){
      const crit = Math.random()<critChance;
      let dmg = (w.dmg||2) * tierBonus * (crit?2:1) * (1+dmgBonus);
      damageEnemy(e, dmg, crit);
      // knockback
      const kb=(w.knockback||8), a=Math.atan2(e.y-py, e.x-px);
      e.x += Math.cos(a)*kb; e.y += Math.sin(a)*kb;
      hit=true;
    }
  }
  cleanupDeadEnemies();
  if(hit) checkAchievements();
}

function fireProjectile(w){
  A.sfx("hit"); useEnergy(1);
  const dir = dirVector();
  projectiles.push({ x:S.px+16, y:S.py+16, vx:dir.x*w.projSpeed, vy:dir.y*w.projSpeed,
                     dmg:w.dmg, crit:Math.random()<(w.crit||0.2), life:60, emoji:w.proj||"•", fromPlayer:true });
}

function castStaff(w){
  A.sfx("levelup");
  S.stats.spells = (S.stats.spells||0)+1;
  const sp = D.SPELLS[S.spell] || D.SPELLS.fireball;
  if(sp.heal){ S.hp=Math.min(S.maxHp, S.hp+sp.heal); toast(`${sp.emoji} ${sp.name}! +${sp.heal} HP`); return; }
  if(sp.radius){
    const px=S.px+16, py=S.py+16;
    for(const e of enemies){ if(Math.hypot(e.x-px,e.y-py) < W.tile*3) damageEnemy(e, sp.dmg*(1+ (hasPerk("fighter")?0.1:0)), false); }
    cleanupDeadEnemies(); toast(`${sp.emoji} ${sp.name}!`); return;
  }
  // default: fire a magic projectile
  const dir = dirVector();
  projectiles.push({ x:S.px+16, y:S.py+16, vx:dir.x*(w.projSpeed||6), vy:dir.y*(w.projSpeed||6),
                     dmg:sp.dmg||w.dmg, crit:Math.random()<(w.crit||0.2), life:70, emoji:sp.emoji||"🔥", fromPlayer:true });
}

function dirVector(){
  if(S.dir==="up") return {x:0,y:-1};
  if(S.dir==="down") return {x:0,y:1};
  if(S.dir==="left") return {x:-1,y:0};
  return {x:1,y:0};
}
function cycleSpell(){
  const ids = Object.keys(D.SPELLS);
  const i = ids.indexOf(S.spell);
  S.spell = ids[(i+1)%ids.length];
  const sp = D.SPELLS[S.spell];
  toast(`Spell: ${sp.emoji} ${sp.name} (${sp.mana} mana) — cast with the 🪄 Staff`);
}

function damageEnemy(e, dmg, crit){
  e.hp -= dmg; e.hurt=6;
  if(crit) toast("Critical hit!");
}
function cleanupDeadEnemies(){
  enemies = enemies.filter(e=>{
    if(e.hp<=0){
      gainXp("Combat", e.xp||8); S.stats.kills++; progressQuest("kill",1);
      if(hasPerk("berserker")) S.energy=Math.min(S.maxEnergy,S.energy+5);
      if(e.boss) onBossDefeated();
      return false;
    }
    return true;
  });
}

/* ---------- dodge roll & blocking ---------- */
function dodgeRoll(){
  const now = performance.now();
  if(S.dodgeCd && now < S.dodgeCd) return;
  if(S.energy<3){ toast("Too tired to dodge."); return; }
  useEnergy(3);
  S.dodgeCd = now + 700;
  S.iframes = now + 400;        // invulnerable window
  const dir = dirVector();
  S.px += dir.x*W.tile*2.2; S.py += dir.y*W.tile*2.2; // quick burst
  // clamp inside map
  S.px = Math.max(0, Math.min(S.px, (AC()-1)*W.tile));
  S.py = Math.max(0, Math.min(S.py, (AR()-1)*W.tile));
  S.stats.dodges = (S.stats.dodges||0)+1;
  A.sfx("water"); checkAchievements();
}

/* ---------- potions & armor ---------- */
function drinkPotion(id){
  const def = D.ITEMS[id]; if(!def) return;
  removeItem(id,1);
  if(def.heal) S.hp = Math.min(S.maxHp, S.hp + def.heal);
  if(def.mana) S.mana = Math.min(S.maxMana, S.mana + def.mana);
  A.sfx("coin"); toast(`Drank ${def.name}.`); updateHud(); refreshHotbar();
}
function equipArmor(id){
  S.armor = (S.armor===id) ? null : id;
  toast(S.armor ? `Equipped ${D.ITEMS[id].name}.` : "Removed armor.");
  A.sfx("levelup"); updateHud();
}
function armorDef(){ return (S.armor && D.ITEMS[S.armor]) ? (D.ITEMS[S.armor].def||0) : 0; }

/* player takes a hit: dodge i-frames negate, block halves, armor subtracts */
function playerTakeDamage(raw){
  const now = performance.now();
  if(S.iframes && now < S.iframes) return; // dodged
  let dmg = raw - armorDef();
  if(S.blocking){ dmg = Math.max(1, Math.round(dmg*0.35)); useEnergy(1); }
  if(hasPerk("defender")) dmg = Math.round(dmg*0.75);
  dmg = Math.max(1, dmg);
  S.hp -= dmg;
  S.hurtFlash = 8;
  if(S.hp <= 0){ playerDown(); }
  updateHud();
  return dmg;
}
function playerDown(){
  S.hp = Math.floor(S.maxHp*0.5);
  toast("You were knocked out! Dragged back to the surface...");
  A.sfx("error");
  // eject from the mines to the village
  clearMineTileState(); W.regenMineTo(1);
  S.area="village"; S.px=2*W.tile; S.py=14*W.tile; warpLock={x:2,y:14};
  enemies=[]; projectiles=[];
  A.playMusic("village");
}

function swingSword(){ useWeapon("sword"); } // back-compat
function updateEnemies(){
  // decay timers regardless of area
  if(S.attackAnim>0) S.attackAnim--;
  if(S.hurtFlash>0) S.hurtFlash--;
  updateProjectiles();
  if(S.area!=="mines"){ enemies=[]; return; }
  const px=S.px+16, py=S.py+16;
  for(const e of enemies){
    if(e.hurt>0) e.hurt--;
    // drift toward player (bosses faster)
    const spd = e.boss ? 0.9 : 0.6;
    const dx=px-e.x, dy=py-e.y, d=Math.hypot(dx,dy)||1;
    e.x += (dx/d)*spd; e.y += (dy/d)*spd;
    if(d < W.tile*0.8 && anim%30===0){ playerTakeDamage(e.dmg); }
  }
}
function updateProjectiles(){
  for(const p of projectiles){
    p.x += p.vx; p.y += p.vy; p.life--;
    if(p.fromPlayer){
      for(const e of enemies){
        if(Math.hypot(e.x-p.x, e.y-p.y) < W.tile*0.7){
          damageEnemy(e, p.dmg*(p.crit?2:1), p.crit); p.life=0; break;
        }
      }
    }
  }
  if(projectiles.some(p=>p.life<=0)){ cleanupDeadEnemies(); }
  projectiles = projectiles.filter(p=>p.life>0 && p.x>-40 && p.y>-40 && p.x<AC()*W.tile+40 && p.y<AR()*W.tile+40);
}

/* ============================================================
   NPCS / DIALOGUE
   ============================================================ */
let lastLine = {};
let dialogueQueue = [];
function talkToNPC(id){
  const npc = D.NPCS[id];
  A.sfx("talk");
  progressQuest(`talk:${id}`,1);
  S.friendship[id] = (S.friendship[id]||0);

  // delivery side quests: hand over the held item if this NPC wants it
  if(tryDeliver(id)) return;

  const before = heartCount(id);
  let line;
  if(!S.talkedToday[id]){
    S.talkedToday[id] = true;
    S.friendship[id] += 5; // small daily bump for talking
    if(isBirthday(id)){
      line = `🎉 It's my birthday! You remembered? (Gifts today mean double.)`;
    } else if(npc.teasing && Math.random()<0.5){
      S.stats.teased++;
      line = pick(npc.nickname, id+"_nick") + " " + bingReaction(id);
    } else {
      line = pickDialogue(id);
    }
  } else {
    // already chatted today — still keep it fresh with contextual chatter
    line = pickDialogue(id);
  }
  showDialogue(npc.name, line);
  checkHeartMilestones(id, before);
  checkAchievements();
}

/* ---------- layered dialogue selector ----------
   Assembles a weighted candidate pool from context (weather, season,
   festival, recent player actions, friendship) plus the NPC's own
   lines, with rare lines and jokes sprinkled in. The no-repeat `pick`
   keeps consecutive lines from matching.                              */
function pickDialogue(id){
  const npc = D.NPCS[id];
  const D2 = D.DIALOGUE;
  const hc = heartCount(id);
  const roll = Math.random();

  // rare line (small chance, feels special)
  if(roll < 0.06) return pick(D2.rare, "rare");
  // react to the player's most recent notable action
  if(S.lastAction && D2.action[S.lastAction] && Math.random()<0.35){
    const l = pick(D2.action[S.lastAction], "act_"+S.lastAction);
    return l;
  }
  // festival day
  if(isFestivalToday() && Math.random()<0.6) return pick(D2.festival, "fest");
  // weather / season flavor
  if(Math.random()<0.3){ const w=D2.weather[S.weather]; if(w) return pick(w, "wx_"+S.weather); }
  if(Math.random()<0.25){ const s=D2.season[D.SEASONS[S.season]]; if(s) return pick(s, "ssn_"+S.season); }
  // occasional joke
  if(Math.random()<0.12) return pick(D2.jokes, "joke");
  // friendship-warmed pool: warmer lines at higher hearts
  const base = (hc>=6 && npc.warmLines) ? npc.warmLines : npc.lines;
  return pick(base, id);
}
function isFestivalToday(){
  // simple festival calendar: one per season on day 14
  return S.day===14;
}
/* remember the player's latest notable deed so villagers can react */
function recordAction(tag){ S.lastAction = tag; }

/* fire cutscene / recipe / gift / secret unlocks when a heart level is
   first reached. Called after any friendship change. */
function checkHeartMilestones(id, beforeHearts){
  const now = heartCount(id);
  if(now <= beforeHearts) return;
  const table = D.NPC_HEARTS[id]; if(!table) return;
  if(!S.npcUnlocks) S.npcUnlocks = {};
  const got = S.npcUnlocks[id] || (S.npcUnlocks[id]=[]);
  const npc = D.NPCS[id];
  for(let h=beforeHearts+1; h<=now; h++){
    const u = table[h]; if(!u || got.includes(h)) continue;
    got.push(h);
    let extra = "";
    if(u.gift){ for(const it in u.gift){ addItem(it, u.gift[it]); } extra += " (received a gift!)"; }
    if(u.recipe && !((S.knownRecipes||[]).includes(u.recipe))){ S.knownRecipes=(S.knownRecipes||[]); S.knownRecipes.push(u.recipe); extra += ` (learned recipe: ${D.ITEMS[u.recipe]?D.ITEMS[u.recipe].name:u.recipe}!)`; }
    if(u.secret){ S.stats.secrets=(S.stats.secrets||0)+1; }
    S.stats.cutscenes = (S.stats.cutscenes||0)+1;
    const body = u.cutscene || u.secret || u.line || "Your friendship deepens.";
    // queue as a dialogue after the current one
    setTimeout(()=>{ showDialogue(`${npc.emoji} ${npc.name} — ${h}♥`, body + extra); A.sfx("levelup"); }, 60);
  }
}
function bingReaction(id){
  const hearts = heartCount(id);
  if(hearts>=4) return "(Bing sighs. 'We're past this, man.')";
  if(hearts>=2) return "(Bing rolls his eyes but half-smiles.)";
  return "(Bing turns red. 'It's just BING!')";
}
function pick(arr, memoKey){
  if(!arr||!arr.length) return "...";
  if(arr.length===1) return arr[0];
  let idx, guard=0;
  do { idx=Math.floor(Math.random()*arr.length); guard++; } while(idx===lastLine[memoKey] && guard<8);
  lastLine[memoKey]=idx; return arr[idx];
}
function heartCount(id){ return Math.floor((S.friendship[id]||0)/100); }

/* ---------- NPC daily schedules ----------
   Which time bucket are we in, and where is each villager right now?  */
function timeBucket(){
  const h = Math.floor(S.minutes/60)%24;
  if(h < 10) return "morning";
  if(h < 17) return "day";
  if(h < 22) return "evening";
  return "night";
}
function isBirthday(id){
  const npc = D.NPCS[id]; if(!npc||!npc.birthday) return false;
  return npc.birthday === `${D.SEASONS[S.season]} ${S.day}`;
}
/* returns [{id,x,y}] for NPCs currently scheduled into `areaId` */
function npcsInArea(areaId){
  const bucket = timeBucket();
  const out = [];
  for(const id in D.NPCS){
    const sched = D.NPC_SCHEDULE[id];
    let spot;
    if(sched && sched[bucket]) spot = sched[bucket];
    else { // fall back to the NPC's static spawn in its home area
      const home = W.areas[D.NPCS[id].home];
      const st = home && home.npcs && home.npcs.find(n=>n.id===id);
      if(st) spot = { area:D.NPCS[id].home, x:st.x, y:st.y };
    }
    if(spot && spot.area===areaId) out.push({ id, x:spot.x, y:spot.y });
  }
  return out;
}

function giveGift(id){
  const item = held();
  if(!item || D.ITEMS[item.id].type==="tool"){ toast("Select a giftable item first."); return; }
  const npc = D.NPCS[id];
  const before = heartCount(id);
  let tier="neutral";
  if(npc.likes.includes(item.id)) tier="love";
  else if(D.ITEMS[item.id].type==="crop"||D.ITEMS[item.id].type==="food") tier="like";
  if(npc.dislikes.includes(item.id)) tier="dislike";
  let pts = { love:80, like:40, neutral:15, dislike:-20 }[tier];
  const bday = isBirthday(id);
  if(bday && tier!=="dislike") pts *= 2; // birthday gifts count double
  S.friendship[id] = Math.max(0, (S.friendship[id]||0)+pts);
  removeItem(item.id,1);
  showDialogue(npc.name, (bday && tier!=="dislike" ? "On my birthday?! " : "") + pick(D.GIFT[tier], id+"_gift"));
  toast(`${tier==='dislike'?'−':'+'}${Math.abs(pts)} friendship with ${npc.name}${bday?' 🎉':''}`);
  S.stats.gifts = (S.stats.gifts||0)+1;
  checkHeartMilestones(id, before);
  refreshHotbar(); checkAchievements();
}

/* deliver an item for an active NPC side quest (talk while holding it) */
function tryDeliver(id){
  const item = held();
  if(!item) return false;
  const before = heartCount(id);
  for(const qid of S.activeQuests){
    const q = D.QUESTS.find(x=>x.id===qid);
    if(!q || q.npc!==id) continue;
    const m = /^deliver:(.+)$/.exec(q.goal.key);
    if(m && m[1]===item.id){
      const need = q.goal.count - (q._prog||0);
      const give = Math.min(need, item.n);
      removeItem(item.id, give);
      q._prog = (q._prog||0) + give;
      A.sfx("quest");
      if(q._prog >= q.goal.count){ showDialogue(D.NPCS[id].name, `Perfect — that's everything for "${q.title}". Thank you!`); completeQuest(q); }
      else { showDialogue(D.NPCS[id].name, `Thanks! ${q._prog}/${q.goal.count} so far.`); }
      checkHeartMilestones(id, before);
      refreshHotbar(); return true;
    }
  }
  return false;
}

/* dialogue box */
function showDialogue(name, text){
  const box=$("#dialogue-box");
  $("#dialogue-name").textContent = name;
  $("#dialogue-text").textContent = text;
  box.classList.remove("hidden");
  S.paused = true;
}
function closeDialogue(){ $("#dialogue-box").classList.add("hidden"); S.paused=false; }

/* ============================================================
   QUESTS
   ============================================================ */
function progressQuest(key, amount){
  for(const qid of S.activeQuests){
    const q = D.QUESTS.find(x=>x.id===qid); if(!q) continue;
    if(q.goal.key===key){
      q._prog = (q._prog||0)+amount;
      if(q._prog >= q.goal.count) completeQuest(q);
    }
  }
}
function completeQuest(q){
  if(S.completedQuests.includes(q.id)) return;
  S.completedQuests.push(q.id);
  S.activeQuests = S.activeQuests.filter(id=>id!==q.id);
  const r = q.reward||{};
  if(r.money){ S.money += r.money; S.stats.earn += 0; }
  if(r.items) for(const id in r.items){ if(r.items[id]>0) addItem(id, r.items[id]); }
  if(r.friendship) for(const id in r.friendship) S.friendship[id]=(S.friendship[id]||0)+r.friendship[id]*100/2;
  A.sfx("quest");
  toast(`Quest complete: ${q.title}! +${r.money||0}g`);
  // unlock next available quest
  const next = D.QUESTS.find(x=>!S.activeQuests.includes(x.id)&&!S.completedQuests.includes(x.id));
  if(next) S.activeQuests.push(next.id);
  updateHud(); checkAchievements();
}
function checkHeartQuests(){
  for(const id in S.friendship){
    if(heartCount(id)>=2) progressQuest("heart2",1);
    if(heartCount(id)>=5) progressQuest("heart5",1);
  }
}

/* ============================================================
   ACHIEVEMENTS
   ============================================================ */
function checkAchievements(){
  checkHeartQuests();
  for(const a of D.ACHIEVEMENTS){
    if(S.achievements.includes(a.id)) continue;
    try { if(a.check(S)){ S.achievements.push(a.id); A.sfx("levelup"); toast(`🏆 Achievement: ${a.name}`); } }
    catch(e){}
  }
}

/* ============================================================
   BUFFS (from cooked food)
   ============================================================ */
function getBuff(stat){
  let total=0;
  for(const b of S.buffs) if(b.stat===stat && b.until>S.minutes) total+=b.amount;
  return total;
}
function eatFood(id){
  const def = D.ITEMS[id]; if(!def||def.type!=="food") return;
  removeItem(id,1);
  if(def.buff){
    if(def.buff.stat==="energy"){ S.energy=Math.min(S.maxEnergy,S.energy+def.buff.amount); }
    else S.buffs.push({...def.buff, until:S.minutes+ 8*60});
    toast(`Ate ${def.name}: ${def.buff.label}`);
  }
  A.sfx("coin"); updateHud(); refreshHotbar();
}

/* ============================================================
   INTERACTIONS (space near shop/kitchen/bed/npc)
   ============================================================ */
function interact(){
  // fishing reel takes priority
  if(reelFish()) return;

  const a = area();
  const f = facingTile();
  const p = playerTile();

  // NPC adjacent? (use current scheduled positions)
  for(const spawn of npcsInArea(a.id)){
    if(Math.abs(spawn.x-p.x)<=1 && Math.abs(spawn.y-p.y)<=1){
      talkToNPC(spawn.id); return;
    }
  }
  // interactables
  for(const it of (a.interact||[])){
    if(Math.abs(it.x-f.x)<=1 && Math.abs(it.y-f.y)<=1 || (Math.abs(it.x-p.x)<=1 && Math.abs(it.y-p.y)<=1)){
      if(it.kind==="bed"){ confirmSleep(); return; }
      if(it.kind==="shop"){ openShop(it.shop); return; }
      if(it.kind==="kitchen"){ openMenu("cooking"); return; }
      if(it.kind==="craft"){ openMenu("crafting"); return; }
      if(it.kind==="upgrade"){ openMenu("upgrade"); return; }
      if(it.kind==="build"){ openBuild(it.building, it); return; }
      if(it.kind==="ship"){ openMenu("animals"); return; }
      if(it.kind==="forage"){ toast("Chop bushes 🌿 with any tool to forage."); return; }
      if(it.kind==="secret"){ showDialogue("🔍 Secret", it.secretText||"You found... something."); S.stats.secrets=(S.stats.secrets||0)+1; checkAchievements(); return; }
      if(it.kind==="collect"){ collectItem(it); return; }
      if(it.kind==="elevator"){ openElevator(); return; }
    }
  }
  // mine tile interactions (ladder / chest) on the facing tile
  const ft = tileAt(f.x, f.y);
  if(ft===T.LADDER){ tryDescendLadder(); return; }
  if(ft===T.CHEST && !S.removed[key(f.x,f.y)]){ openChest(f); return; }
  // bomb: holding a bomb + Space plants it and detonates shortly
  const bh = held();
  if(bh && bh.id==="bomb"){ placeBomb(f); return; }
  // place a craftable if one is armed for placement
  if(S.placingId && S.craftables && S.craftables[S.placingId]){ placeObject(S.placingId, f); return; }
  // otherwise use tool
  useToolOnFacing();
}
function confirmSleep(){
  showDialogue("Bing's Bed", "Sleep until morning? (This saves your game.) — press Space to sleep, Esc to cancel.");
  S.pendingSleep = true;
}

/* one-time area collectible */
function collectItem(it){
  const ckey = `${area().id}:${it.item}`;
  if(!S.collected) S.collected = {};
  if(S.collected[ckey]){ toast("You've already taken this."); return; }
  S.collected[ckey] = true;
  addItem(it.item, 1);
  S.stats.collectibles = (S.stats.collectibles||0)+1;
  A.sfx("levelup");
  showDialogue("✨ Collectible", it.secretText || `You found a ${D.ITEMS[it.item].name}!`);
  checkAchievements();
}

/* place a crafted object (sprinkler/scarecrow/etc.) on the facing tile */
function placeObject(id, f){
  const def = D.CRAFT[id]; if(!def) return;
  const pk = key(f.x, f.y);
  const t = tileAt(f.x,f.y);
  if([T.WATER,T.WALL,T.COUNTER,T.TREE,T.ROCK,T.ORE,T.DARKROCK].includes(t)){ toast("Can't place there."); A.sfx("error"); return; }
  if(S.placed[pk]){ toast("Something's already here."); return; }
  S.placed[pk] = { id, emoji:def.emoji };
  S.craftables[id]--; if(S.craftables[id]<=0){ delete S.craftables[id]; S.placingId=null; }
  if(id==="sprinkler"||id==="quality_sprinkler") progressQuest("place_sprinkler",1);
  A.sfx("plant"); toast(`Placed ${def.name}.` + (S.craftables[id]?` (${S.craftables[id]} left — Space to place more)`:""));
  checkAchievements();
}

/* ============================================================
   SHOP
   ============================================================ */
const SHOP_STOCK = {
  general: ["parsnip_seed","cauli_seed","potato_seed","kale_seed","strawberry_seed",
            "melon_seed","tomato_seed","blueberry_seed","pumpkin_seed","cranberry_seed","wheat_seed",
            "fertilizer","quality_fertilizer","hp_potion","mana_potion"],
  fish:    ["rod","fish","fish_stew"],
  merchant:["gem","iridium","strawberry_seed","blueberry_seed","cranberry_seed","quality_sprinkler","deluxe_fertilizer","bomb"],
  adventurer:["club","dagger","bow","staff","leather_armor","iron_armor","gold_armor","hp_potion","mana_potion","mega_potion","bomb"],
};
const SHOP_NAMES = { general:"Widr Marketplace", fish:"Riverbend Fish Shop", merchant:"Traveling Merchant", adventurer:"Adventurer's Guild" };
let dailyPriceMod = 1;
function openShop(which){
  S.paused = true;
  const ov = $("#shop-overlay"); ov.classList.remove("hidden");
  $("#shop-title").textContent = SHOP_NAMES[which]||"Shop";
  dailyPriceMod = 0.85 + (S.day % 5) * 0.06; // fluctuating daily prices
  const merchantMod = which==="merchant"?1.4:1;
  const buy = $("#shop-buy"); buy.innerHTML="";
  for(const id of (SHOP_STOCK[which]||[])){
    const def = D.ITEMS[id]; if(!def) continue;
    const price = Math.round((def.price||50) * dailyPriceMod * merchantMod);
    const row=document.createElement("div"); row.className="shop-item";
    row.innerHTML=`<span>${def.emoji} ${def.name}</span><span class="price">${price}g</span>`;
    row.onclick=()=>{ if(S.money>=price){ S.money-=price; addItem(id,1); A.sfx("coin"); openShop(which); updateHud(); } else { toast("Not enough gold."); A.sfx("error"); } };
    buy.appendChild(row);
  }
  const sell = $("#shop-sell"); sell.innerHTML="";
  S.inventory.forEach((slot,i)=>{
    if(!slot) return; const def=D.ITEMS[slot.id];
    if(def.type==="tool") return;
    let mult = 0.75;
    if(hasPerk("tiller") && def.type==="crop") mult += 0.10;
    if(hasPerk("fisher") && (slot.id==="fish"||slot.id==="legend_fish")) mult += 0.25;
    const q = slot.q||0;
    const qMult = D.QUALITY[q] ? D.QUALITY[q].mult : 1;
    const price = Math.round((def.price||1)*mult*qMult);
    const qLabel = q>0 ? ` ${D.QUALITY[q].star}` : "";
    const row=document.createElement("div"); row.className="shop-item";
    row.innerHTML=`<span>${def.emoji} ${def.name}${qLabel} ×${slot.n}</span><span class="price">+${price}g</span>`;
    row.onclick=()=>{ slot.n--; if(slot.n<=0) S.inventory[i]=null; S.money+=price; S.stats.earn+=price; progressQuest("earn",price); A.sfx("coin"); openShop(which); updateHud(); checkAchievements(); };
    sell.appendChild(row);
  });
}
function closeShop(){ $("#shop-overlay").classList.add("hidden"); S.paused=false; refreshHotbar(); }

/* ============================================================
   MENU (inventory / skills / quests / social / etc.)
   ============================================================ */
function openMenu(focus){
  S.paused = true;
  $("#menu-overlay").classList.remove("hidden");
  if(focus==="cooking"||focus==="crafting"){ switchTab("inventory"); renderCookCraft(focus); }
  else if(focus==="upgrade"){ switchTab("inventory"); renderUpgrade(); }
  else if(focus==="animals"){ switchTab("inventory"); renderAnimalShop(); }
  else renderTab(currentTab);
}
function closeMenu(){ $("#menu-overlay").classList.add("hidden"); S.paused=false; refreshHotbar(); }
let currentTab="inventory";
function switchTab(name){
  currentTab=name;
  $$(".tab").forEach(t=>t.classList.toggle("active", t.dataset.tab===name));
  $$(".tab-panel").forEach(p=>p.classList.add("hidden"));
  $(`#tab-${name}`).classList.remove("hidden");
  renderTab(name);
}

function renderTab(name){
  if(name==="inventory") renderInventory();
  if(name==="skills") renderSkills();
  if(name==="quests") renderQuests();
  if(name==="social") renderSocial();
  if(name==="achievements") renderAchievements();
  if(name==="map") renderMap();
  if(name==="settings") renderSettings();
}

let invFilter="";
function renderInventory(extraHtml=""){
  const panel=$("#tab-inventory");
  panel.innerHTML = `<input class="inv-search" placeholder="Search items..." value="${invFilter}"/>`
    + extraHtml + `<div class="inv-grid"></div>`;
  const search=panel.querySelector(".inv-search");
  search.oninput=e=>{ invFilter=e.target.value.toLowerCase(); renderInventory(extraHtml); panel.querySelector(".inv-search").focus(); };
  const grid=panel.querySelector(".inv-grid");
  S.inventory.forEach((slot,i)=>{
    const div=document.createElement("div");
    div.className="inv-slot"+(slot?"":" empty");
    div.draggable = !!slot;
    div.dataset.index=i;
    if(slot){
      const def=D.ITEMS[slot.id];
      if(invFilter && !def.name.toLowerCase().includes(invFilter)){ div.style.opacity=.15; }
      div.innerHTML=`${def.emoji}<span class="count">${slot.n>1?slot.n:""}</span>${slot.q?`<span style="position:absolute;top:1px;left:3px;font-size:10px">${D.QUALITY[slot.q].star}</span>`:""}`;
      div.title=def.name + (slot.q?` (${D.QUALITY[slot.q].name})`:"");
      div.onclick=()=>{ if(def.type==="food"){ eatFood(slot.id); renderInventory(extraHtml);} };
    }
    // drag-drop reorder
    div.addEventListener("dragstart",e=>e.dataTransfer.setData("i",i));
    div.addEventListener("dragover",e=>{e.preventDefault(); div.classList.add("drag-over");});
    div.addEventListener("dragleave",()=>div.classList.remove("drag-over"));
    div.addEventListener("drop",e=>{
      e.preventDefault(); div.classList.remove("drag-over");
      const from=+e.dataTransfer.getData("i");
      const tmp=S.inventory[from]; S.inventory[from]=S.inventory[i]; S.inventory[i]=tmp;
      renderInventory(extraHtml); refreshHotbar();
    });
    grid.appendChild(div);
  });
}

function renderCookCraft(mode){
  const list = mode==="cooking" ? D.RECIPES : D.CRAFT;
  let html = `<h3 style="color:var(--accent);margin-bottom:10px">${mode==="cooking"?"🍳 Cooking":"🔨 Crafting"}</h3>`;
  // owned craftables ready to place
  if(mode==="crafting"){
    const owned = Object.entries(S.craftables||{}).filter(([k,v])=>v>0);
    if(owned.length){
      html += `<div class="list-item"><h4>Ready to place</h4><div class="desc">Click Place, close menu, face a spot and press Space.</div>`;
      for(const [id,n] of owned){
        html += `<button class="menu-btn" data-place="${id}" style="margin:4px 4px 0 0;font-size:12px;padding:5px 10px">${D.CRAFT[id].emoji} ${D.CRAFT[id].name} ×${n}</button>`;
      }
      html += `</div>`;
    }
  }
  for(const id in list){
    const rec = list[id];
    const needs = rec.needs;
    const outName = mode==="cooking" ? D.ITEMS[rec.out].name : rec.name;
    const canMake = Object.entries(needs).every(([k,v])=>v===0||countItem(k)>=v);
    const needStr = Object.entries(needs).filter(([k,v])=>v>0).map(([k,v])=>`${D.ITEMS[k].emoji}${v}`).join(" ");
    html += `<div class="list-item ${canMake?'':'done'}">
      <h4>${mode==="cooking"?D.ITEMS[rec.out].emoji:rec.emoji} ${outName}</h4>
      <div class="desc">Needs: ${needStr||"—"}</div>
      <button class="menu-btn" data-make="${id}" data-mode="${mode}" ${canMake?"":"disabled"} style="margin-top:6px;font-size:13px;padding:6px 12px">Make</button>
    </div>`;
  }
  renderInventory(html);
  $$("[data-make]").forEach(b=>b.onclick=()=>doMake(b.dataset.mode,b.dataset.make));
  $$("[data-place]").forEach(b=>b.onclick=()=>{ S.placingId=b.dataset.place; closeMenu(); toast(`Placing ${D.CRAFT[b.dataset.place].name} — face a tile and press Space.`); });
}
function doMake(mode,id){
  const rec = mode==="cooking"? D.RECIPES[id] : D.CRAFT[id];
  for(const k in rec.needs){ if(rec.needs[k]>0) removeItem(k, rec.needs[k]); }
  if(mode==="cooking"){
    // chef perk: chance to keep ingredients (already spent; refund)
    addItem(rec.out,1); S.stats.cook++; gainXp("Cooking",10); progressQuest("cook",1);
    toast(`Cooked ${D.ITEMS[rec.out].name}!`);
  } else if(rec.gives){
    // crafting that yields an inventory item (e.g. bombs)
    gainXp("Crafting",8);
    addItem(rec.gives,1);
    toast(`Crafted ${rec.name}!`);
  } else {
    gainXp("Crafting",8);
    S.craftables[id] = (S.craftables[id]||0)+1;
    toast(`Crafted ${rec.name}! Hold it on the hotbar? It's in your craftables — go place it.`);
  }
  A.sfx("levelup"); renderCookCraft(mode); refreshHotbar(); checkAchievements();
}

/* ---------- Blacksmith: tool upgrades ---------- */
function renderUpgrade(){
  let html = `<h3 style="color:var(--accent);margin-bottom:10px">⚒️ Blacksmith — Tool Upgrades</h3>`;
  const disc = hasPerk("blacksmith_disc")?0.8:1;
  for(const tool in D.TOOL_TIERS){
    const tiers = D.TOOL_TIERS[tool];
    const cur = S.toolTier[tool]||0;
    const next = tiers[cur+1];
    const curName = tiers[cur].name;
    if(!next){
      html += `<div class="list-item done"><h4>${D.ITEMS[tool].emoji} ${curName}</h4><div class="desc">Max tier reached.</div></div>`;
      continue;
    }
    const cost = next.cost||{};
    const money = Math.round((cost.money||0)*disc);
    const oreEntries = Object.entries(cost).filter(([k])=>k!=="money");
    const oreStr = oreEntries.map(([k,v])=>`${D.ITEMS[k].emoji}${v}`).join(" ");
    const canAfford = S.money>=money && oreEntries.every(([k,v])=>countItem(k)>=v);
    html += `<div class="list-item ${canAfford?'':'done'}">
      <h4>${D.ITEMS[tool].emoji} ${curName} → ${next.name}</h4>
      <div class="desc">Cost: ${money}g ${oreStr}</div>
      <button class="menu-btn" data-up="${tool}" ${canAfford?'':'disabled'} style="margin-top:6px;font-size:13px;padding:6px 12px">Upgrade</button>
    </div>`;
  }
  renderInventory(html);
  $$("[data-up]").forEach(b=>b.onclick=()=>doUpgrade(b.dataset.up));
}
function doUpgrade(tool){
  const tiers=D.TOOL_TIERS[tool]; const cur=S.toolTier[tool]||0; const next=tiers[cur+1]; if(!next) return;
  const disc=hasPerk("blacksmith_disc")?0.8:1;
  const cost=next.cost||{}; const money=Math.round((cost.money||0)*disc);
  for(const k in cost){ if(k==="money") continue; removeItem(k,cost[k]); }
  S.money-=money;
  S.toolTier[tool]=cur+1;
  S.stats.upgrades=(S.stats.upgrades||0)+1;
  progressQuest("upgrade",1);
  A.sfx("levelup"); toast(`Upgraded to ${next.name}!`);
  renderUpgrade(); updateHud(); checkAchievements();
}

/* ---------- Animal shop (need a building first) ---------- */
function renderAnimalShop(){
  let html = `<h3 style="color:var(--accent);margin-bottom:10px">📦 Shipping & Animals</h3>`;
  const haveCoop = (S.buildings||[]).some(b=>b.type==="coop");
  const haveBarn = (S.buildings||[]).some(b=>b.type==="barn");
  html += `<div class="list-item"><div class="desc">Build a Coop or Barn on your farm (walk onto the plot markers 🏗️) to house animals. Coop: ${haveCoop?'✓ built':'not built'} · Barn: ${haveBarn?'✓ built':'not built'}</div></div>`;
  for(const id in D.ANIMALS){
    const a=D.ANIMALS[id];
    const canBuy = (a.building==="coop"&&haveCoop)||(a.building==="barn"&&haveBarn);
    const afford = S.money>=a.price && canBuy;
    html += `<div class="list-item ${afford?'':'done'}">
      <h4>${a.emoji} ${a.name}</h4>
      <div class="desc">${a.price}g · needs ${a.building} · produces ${D.ITEMS[a.product].emoji} ${D.ITEMS[a.product].name} daily</div>
      <button class="menu-btn" data-animal="${id}" ${afford?'':'disabled'} style="margin-top:6px;font-size:13px;padding:6px 12px">${canBuy?'Buy':'Need '+a.building}</button>
    </div>`;
  }
  renderInventory(html);
  $$("[data-animal]").forEach(b=>b.onclick=()=>buyAnimal(b.dataset.animal));
}
function buyAnimal(id){
  const a=D.ANIMALS[id]; if(S.money<a.price) return;
  S.money-=a.price;
  S.animals.push({ type:id, name:a.name, hearts:0, product:a.product });
  progressQuest("buy_animal",1);
  A.sfx("coin"); toast(`Bought a ${a.name}! It'll produce daily.`);
  renderAnimalShop(); updateHud(); checkAchievements();
}

/* ---------- Build a coop/barn on a farm plot ---------- */
function openBuild(type, spot){
  const def=D.BUILDINGS[type]; if(!def) return;
  if((S.buildings||[]).some(b=>b.type===type && b.x===spot.x)){ toast("Already built here."); return; }
  const cost=def.cost;
  const afford = S.money>=(cost.money||0) && Object.entries(cost).filter(([k])=>k!=="money").every(([k,v])=>countItem(k)>=v);
  const costStr = `${cost.money}g ` + Object.entries(cost).filter(([k])=>k!=="money").map(([k,v])=>`${D.ITEMS[k].emoji}${v}`).join(" ");
  if(!afford){ showDialogue("Build "+def.name, `Not enough materials. Needs ${costStr}.`); return; }
  showDialogue("Build "+def.name, `Build a ${def.name} here for ${costStr}? Press Space to confirm.`);
  S.pendingBuild = { type, spot };
}
function doBuild(){
  const pb=S.pendingBuild; if(!pb) return; S.pendingBuild=null;
  const def=D.BUILDINGS[pb.type]; const cost=def.cost;
  S.money-=(cost.money||0);
  for(const k in cost){ if(k==="money") continue; removeItem(k,cost[k]); }
  S.buildings.push({ type:pb.type, emoji:def.emoji, area:"farm", x:pb.spot.x, y:pb.spot.y-1 });
  progressQuest("build",1);
  recordAction("building");
  A.sfx("levelup"); toast(`Built a ${def.name}!`);
  checkAchievements();
}

function renderSkills(){
  const panel=$("#tab-skills"); panel.innerHTML="<h3 style='color:var(--accent);margin-bottom:12px'>Skills & Talents</h3>";
  for(const name of D.SKILLS){
    const sk=S.skills[name]; const pct=Math.min(100,(sk.xp/(sk.lvl*100))*100);
    const row=document.createElement("div"); row.className="skill-row";
    row.innerHTML=`<span class="name">${name}</span>
      <span class="skill-bar"><div style="width:${pct}%"></div></span>
      <span class="skill-lvl">Lv.${sk.lvl}</span>`;
    panel.appendChild(row);
    // talent perks for this skill
    const tree=D.TALENTS[name]||[];
    if(tree.length){
      const tdiv=document.createElement("div"); tdiv.style.cssText="margin:2px 0 12px 100px;display:flex;flex-wrap:wrap;gap:6px";
      for(const t of tree){
        const got=S.perks.includes(t.id);
        const locked=sk.lvl<t.lvl;
        const chip=document.createElement("span");
        chip.style.cssText=`font-size:11px;padding:3px 8px;border-radius:6px;border:2px solid var(--border);${got?'background:var(--accent);color:#000':locked?'opacity:.4':'background:var(--panel-light)'}`;
        chip.textContent=`${got?'✓':locked?'🔒 Lv'+t.lvl:'•'} ${t.name}`;
        chip.title=t.desc;
        tdiv.appendChild(chip);
      }
      panel.appendChild(tdiv);
    }
  }
}
function renderQuests(){
  const panel=$("#tab-quests"); panel.innerHTML="<h3 style='color:var(--accent);margin-bottom:12px'>Quests</h3>";
  for(const qid of S.activeQuests){
    const q=D.QUESTS.find(x=>x.id===qid); if(!q) continue;
    const prog=q._prog||0;
    const div=document.createElement("div"); div.className="list-item";
    div.innerHTML=`<h4>${q.title} <span style="font-size:11px;color:var(--text-dim)">[${q.type}]</span></h4>
      <div class="desc">${q.desc}</div>
      <div class="desc">Progress: ${Math.min(prog,q.goal.count)}/${q.goal.count}</div>`;
    panel.appendChild(div);
  }
  for(const qid of S.completedQuests){
    const q=D.QUESTS.find(x=>x.id===qid); if(!q) continue;
    const div=document.createElement("div"); div.className="list-item done";
    div.innerHTML=`<h4>✓ ${q.title}</h4>`;
    panel.appendChild(div);
  }
}
function renderSocial(){
  const panel=$("#tab-social"); panel.innerHTML="<h3 style='color:var(--accent);margin-bottom:12px'>Villagers</h3>";
  const bucket = timeBucket();
  for(const id in D.NPCS){
    const npc=D.NPCS[id]; const h=heartCount(id);
    const hearts="❤".repeat(h)+`<span class="empty">${"❤".repeat(Math.max(0,10-h))}</span>`;
    // where are they right now, and what's the next heart reward
    const sched = D.NPC_SCHEDULE[id] && D.NPC_SCHEDULE[id][bucket];
    const whereName = sched ? (W.areas[sched.area]?W.areas[sched.area].name:sched.area) : npc.home;
    const table = D.NPC_HEARTS[id]||{};
    let nextU="";
    for(const lvl of [2,4,6,8,10]){ if(h<lvl && table[lvl]){ const u=table[lvl]; const kind=u.recipe?"recipe":u.gift?"gift":u.cutscene?"cutscene":u.secret?"secret":"chat"; nextU=`Next at ${lvl}♥: ${kind}`; break; } }
    const likes = npc.likes.map(k=>D.ITEMS[k]?D.ITEMS[k].emoji:"").join("");
    const div=document.createElement("div"); div.className="list-item";
    div.innerHTML=`<h4>${npc.emoji} ${npc.name}${isBirthday(id)?" 🎉":""}</h4>
      <div class="hearts">${hearts}</div>
      <div class="desc">${npc.role}</div>
      <div class="desc">📍 Now at: ${whereName} · 🎂 ${npc.birthday}</div>
      <div class="desc">Likes: ${likes||"—"} · ${npc.teasing?"Teases you with 'Boer Bing'":"Respects the name Bing"}</div>
      ${nextU?`<div class="desc" style="color:var(--accent)">${nextU}</div>`:`<div class="desc" style="color:var(--accent)">Maxed — best friends! 💛</div>`}`;
    panel.appendChild(div);
  }
}
function renderAchievements(){
  const panel=$("#tab-achievements");
  panel.innerHTML=`<h3 style='color:var(--accent);margin-bottom:12px'>Achievements (${S.achievements.length}/${D.ACHIEVEMENTS.length})</h3>`;
  for(const a of D.ACHIEVEMENTS){
    const got=S.achievements.includes(a.id);
    const div=document.createElement("div"); div.className="list-item"+(got?"":" done");
    div.innerHTML=`<h4>${got?"🏆":"🔒"} ${a.name}</h4><div class="desc">${a.desc}</div>`;
    panel.appendChild(div);
  }
}
function renderMap(){
  const panel=$("#tab-map");
  const nodes=["farm","village","forest","beach","mountain","desert","river","market","college","cave","castle","festival","hiddenforest","volcano","ruins","mines"];
  panel.innerHTML="<h3 style='color:var(--accent);margin-bottom:12px'>World Map</h3><div class='map-grid'></div>";
  const g=panel.querySelector(".map-grid");
  for(const id of nodes){
    const a=W.areas[id];
    const div=document.createElement("div"); div.className="map-node"+(id===S.area?" current":"");
    div.textContent=a.name;
    g.appendChild(div);
  }
}
function renderSettings(){
  const panel=$("#tab-settings");
  panel.innerHTML=`<h3 style='color:var(--accent);margin-bottom:12px'>Settings</h3>
    <div class="setting-row"><span>Sound</span><button class="menu-btn" id="set-mute">${S.muted?"Unmute":"Mute"}</button></div>
    <div class="setting-row"><span>Save game now</span><button class="menu-btn" id="set-save">Save</button></div>
    <div class="setting-row"><span>Export save (JSON file)</span><button class="menu-btn" id="set-export">Download</button></div>
    <div class="setting-row"><span>Import save (JSON file)</span><button class="menu-btn secondary" id="set-import">Upload</button></div>
    <div class="setting-row"><span>Return to title</span><button class="menu-btn secondary" id="set-title">Title</button></div>
    <div class="setting-row"><span style="color:var(--danger)">Delete save</span><button class="menu-btn" id="set-delete" style="background:var(--danger)">Delete</button></div>
    <input type="file" id="set-import-file" accept="application/json" hidden/>`;
  $("#set-mute").onclick=()=>{ S.muted=A.toggleMute(); renderSettings(); };
  $("#set-save").onclick=()=>{ save(); toast("Saved."); };
  $("#set-export").onclick=exportSave;
  $("#set-import").onclick=()=>$("#set-import-file").click();
  $("#set-import-file").onchange=importSaveFile;
  $("#set-title").onclick=()=>location.reload();
  $("#set-delete").onclick=()=>{ if(confirm("Delete your save permanently?")){ localStorage.removeItem(SAVE_KEY); location.reload(); } };
}

/* ============================================================
   HUD / HOTBAR
   ============================================================ */
function updateHud(){
  $("#hud-day").textContent = `${D.SEASONS[S.season]} ${S.day} (Yr ${S.year})`;
  const h24 = Math.floor(S.minutes/60)%24, m=S.minutes%60;
  const ampm = h24>=12?"PM":"AM"; let h12=h24%12; if(h12===0) h12=12;
  $("#hud-time").textContent = `${h12}:${String(m).padStart(2,"0")} ${ampm}`;
  $("#hud-weather").textContent = weatherIcon(S.weather)+" "+S.weather;
  $("#hud-money").textContent = `g ${S.money.toLocaleString()}`;
  const pct=(S.energy/S.maxEnergy)*100;
  $("#energy-fill").style.width=pct+"%";
  $("#energy-text").textContent=`${S.energy}/${S.maxEnergy}`;
  $("#hp-fill").style.width = ((S.hp/S.maxHp)*100)+"%";
  $("#hp-text").textContent = `❤️ ${Math.max(0,Math.ceil(S.hp))}/${S.maxHp}`;
  $("#mana-fill").style.width = ((S.mana/S.maxMana)*100)+"%";
  $("#mana-text").textContent = `🔵 ${Math.max(0,Math.ceil(S.mana))}/${S.maxMana}`;
  $("#location-name").textContent = area().name + (area().isMine?` · Floor ${area().floor}`:"");
}
function weatherIcon(w){ return {Sunny:"☀️",Rain:"🌧️",Storm:"⛈️",Snow:"❄️",Fog:"🌫️",Heatwave:"🔥"}[w]||""; }

function refreshHotbar(){
  const bar=$("#hotbar"); bar.innerHTML="";
  for(let i=0;i<10;i++){
    const slot=S.inventory[i];
    const div=document.createElement("div");
    div.className="hotbar-slot"+(i===S.hotbarIndex?" active":"");
    const keyNum = i===9?0:i+1;
    div.innerHTML=`<span class="key">${keyNum}</span>`;
    if(slot){ const def=D.ITEMS[slot.id]; div.innerHTML+=`${def.emoji}<span class="count">${slot.n>1?slot.n:""}</span>`; div.title=def.name; }
    div.onclick=()=>{ S.hotbarIndex=i; refreshHotbar(); };
    bar.appendChild(div);
  }
}

/* ---------- toast ---------- */
function toast(msg){
  const c=$("#toast-container");
  const t=document.createElement("div"); t.className="toast"; t.textContent=msg;
  c.appendChild(t);
  setTimeout(()=>t.remove(), 2600);
}

/* ============================================================
   MOVEMENT + WARP
   ============================================================ */
function tryMove(){
  if(S.paused) return;
  const spd = 2.4 + getBuff("moveSpeed")*0.6;
  let dx=0, dy=0;
  if(keys["w"]||keys["arrowup"]){ dy=-spd; S.dir="up"; }
  else if(keys["s"]||keys["arrowdown"]){ dy=spd; S.dir="down"; }
  else if(keys["a"]||keys["arrowleft"]){ dx=-spd; S.dir="left"; }
  else if(keys["d"]||keys["arrowright"]){ dx=spd; S.dir="right"; }
  if(dx===0&&dy===0) return;

  const nx=S.px+dx, ny=S.py+dy;
  // collision uses the tile under the player's feet (center-bottom of sprite)
  const tx=Math.floor((nx+16)/W.tile), ty=Math.floor((ny+20)/W.tile);
  if(tx>=0 && ty>=0 && tx<AC() && ty<AR() && !solid(tx,ty)){ S.px=nx; S.py=ny; }

  // warp check — but not while standing on the tile we just warped onto
  const ptile=playerTile();
  if(warpLock){
    if(ptile.x!==warpLock.x || ptile.y!==warpLock.y) warpLock=null; // stepped off
    else return;
  }
  for(const wp of area().warps){
    if(ptile.x===wp.x && ptile.y===wp.y){ doWarp(wp); return; }
  }
}
let warpLock = null;
function doWarp(wp){
  // entering the mines from outside always starts at floor 1
  if(wp.to==="mines" && S.area!=="mines"){ clearMineTileState(); W.regenMineTo(1); }
  S.area = wp.to;
  S.px = wp.tx*W.tile; S.py = wp.ty*W.tile;
  warpLock = { x: wp.tx, y: wp.ty }; // don't instantly re-warp on arrival tile
  S.visited[wp.to]=true;
  A.playMusic(area().music);
  if(area().isMine) spawnEnemies(); else enemies=[];
  toast(area().name);
  checkAchievements();
}

/* ============================================================
   SAVE / LOAD
   ============================================================ */
function save(){
  try {
    const payload = { S, world:{ areas:serializeAreas(), mineFloor: W._mineFloor||1 } };
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  } catch(e){ console.warn("save failed", e); }
}
function serializeAreas(){
  // only tiles change (tilled soil, removed props are in S.removed). Save tiles for farm/village where hoe changes them.
  const out={};
  for(const id in W.areas) out[id]=W.areas[id].tiles;
  return out;
}
function load(){
  try {
    const raw=localStorage.getItem(SAVE_KEY); if(!raw) return false;
    const payload=JSON.parse(raw);
    W.build();
    S=payload.S;
    // backfill any fields missing from older v2 saves so nothing crashes
    S.perks = S.perks||[];
    S.toolTier = S.toolTier||{ hoe:0, wateringcan:0, axe:0, pickaxe:0, sword:0 };
    S.craftables = S.craftables||{};
    S.placed = S.placed||{};
    S.weeds = S.weeds||{};
    S.soilFert = S.soilFert||{};
    S.bombs = S.bombs||{};
    S.maxFloorReached = S.maxFloorReached||1;
    if(S.hp===undefined){ S.hp=100; S.maxHp=100; }
    if(S.mana===undefined){ S.mana=50; S.maxMana=50; }
    if(S.spell===undefined) S.spell="fireball";
    if(S.armor===undefined) S.armor=null;
    if(S.npcUnlocks===undefined) S.npcUnlocks={};
    if(S.knownRecipes===undefined) S.knownRecipes=[];
    if(S.objectiveStep===undefined) S.objectiveStep = OBJECTIVES.length-1; // existing saves skip the intro checklist
    if(S.tutorialSeen===undefined) S.tutorialSeen = true;
    S.buildings = S.buildings||[];
    S.animals = S.animals||[];
    S.collected = S.collected||{};
    S.stats = Object.assign({ harvest:0,chop:0,mine:0,fish:0,legend:0,cook:0,earn:0,teased:0,stayedLate:0,kills:0,forage:0,deepest:1,upgrades:0,collectibles:0,secrets:0,events:0,goldCrops:0,bosses:0,chests:0 }, S.stats||{});
    // restore tile mutations (only when dimensions match, to protect map integrity)
    if(payload.world&&payload.world.areas){
      if(payload.world.mineFloor){ W.regenMineTo(payload.world.mineFloor); }
      for(const id in payload.world.areas){
        const saved=payload.world.areas[id], area=W.areas[id];
        if(area && saved && saved.length===area.rows && saved[0].length===area.cols){
          area.tiles=saved;
        }
      }
    }
    S.muted=!!S.muted; A.muted=S.muted;
    return true;
  } catch(e){ console.warn("load failed",e); return false; }
}
function exportSave(){
  save();
  const raw=localStorage.getItem(SAVE_KEY)||"{}";
  const blob=new Blob([raw],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a"); a.href=url; a.download=`widr-valley-save-${Date.now()}.json`;
  a.click(); URL.revokeObjectURL(url); toast("Save downloaded.");
}
function importSaveFile(e){
  const file=e.target.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=()=>{ try{ localStorage.setItem(SAVE_KEY, reader.result); toast("Save imported."); location.reload(); }catch(err){ toast("Invalid save file."); } };
  reader.readAsText(file);
}

/* ============================================================
   INPUT
   ============================================================ */
window.addEventListener("keydown", e=>{
  const k=e.key.toLowerCase();
  keys[k]=true;
  A.init(); A.resume();

  if($("#game-screen").classList.contains("hidden")) return;

  // tutorial overlay captures keys: arrows/space page through, Esc closes
  if(!$("#tutorial-overlay").classList.contains("hidden")){
    if(k==="arrowright"||k===" "||k==="enter"){ if(tutStep>=TUTORIAL.length-1) closeTutorial(); else renderTutStep(tutStep+1); }
    else if(k==="arrowleft"){ renderTutStep(tutStep-1); }
    else if(k==="escape"){ closeTutorial(); }
    e.preventDefault(); return;
  }

  if(!$("#dialogue-box").classList.contains("hidden")){
    if(k===" "||k==="enter"){
      if(S.pendingSleep){ S.pendingSleep=false; closeDialogue(); sleep(false); return; }
      if(S.pendingBuild){ closeDialogue(); doBuild(); return; }
      closeDialogue();
    }
    if(k==="escape"){ S.pendingSleep=false; S.pendingBuild=null; closeDialogue(); }
    e.preventDefault(); return;
  }

  // menu/shop toggles
  if(k==="e"){ if($("#menu-overlay").classList.contains("hidden")) openMenu(); else closeMenu(); e.preventDefault(); return; }
  if(k==="escape"){ if(!$("#menu-overlay").classList.contains("hidden")) closeMenu(); if(!$("#shop-overlay").classList.contains("hidden")) closeShop(); return; }
  if(!$("#menu-overlay").classList.contains("hidden")||!$("#shop-overlay").classList.contains("hidden")) return;

  // hotbar select
  if(/^[0-9]$/.test(k)){ S.hotbarIndex = k==="0"?9:parseInt(k)-1; refreshHotbar(); return; }

  if(k===" "){ interact(); e.preventDefault(); return; }
  if(k==="g"){ // gift to adjacent npc
    const p=playerTile();
    for(const spawn of npcsInArea(area().id)){ if(Math.abs(spawn.x-p.x)<=1&&Math.abs(spawn.y-p.y)<=1){ giveGift(spawn.id); return; } }
    toast("No one nearby to gift.");
  }
  if(k==="q"){ confirmSleep(); }
  if(k==="m"){ S.muted=A.toggleMute(); toast(S.muted?"Muted":"Unmuted"); }
  if(k==="shift"){ dodgeRoll(); e.preventDefault(); }
  if(k==="c"){ S.blocking = true; }
  if(k==="f"){ cycleSpell(); }
});
window.addEventListener("keyup", e=>{
  const k=e.key.toLowerCase();
  keys[k]=false;
  if(k==="c" && S){ S.blocking=false; }
});

// mouse: click dialogue to advance, click hotbar handled in refreshHotbar
$("#dialogue-box").addEventListener("click", ()=>{
  if(S.pendingSleep){ S.pendingSleep=false; closeDialogue(); sleep(false); return; }
  if(S.pendingBuild){ closeDialogue(); doBuild(); return; }
  closeDialogue();
});

/* menu tab clicks */
$$(".tab").forEach(t=>t.onclick=()=>switchTab(t.dataset.tab));
$("#menu-close").onclick=closeMenu;
$("#shop-close").onclick=closeShop;

/* ============================================================
   MAIN LOOP
   ============================================================ */
let timeAccum=0;
function loop(ts){
  anim++;
  if(S && !S.hidden){
    if(!S.paused){
      tryMove();
      updateEnemies();
      // time passes ~ 1 in-game min every ~700ms
      timeAccum++;
      if(timeAccum >= 42){ timeAccum=0; tickTime(); }
      // refresh the guidance banner a few times a second
      if(anim % 20 === 0) updateObjective();
    }
    draw();
  }
  requestAnimationFrame(loop);
}

/* ============================================================
   BOOT / SCREENS
   ============================================================ */
function startGame(){
  $("#title-screen").classList.add("hidden");
  $("#create-screen").classList.add("hidden");
  $("#game-screen").classList.remove("hidden");
  stopTitleBg();
  resizeCanvas();
  A.init(); A.resume(); A.muted=S.muted; A.playMusic(area().music);
  if(area().isMine) spawnEnemies();
  refreshHotbar(); updateHud();
  checkAchievements();
  updateObjective();
  if(!S.tutorialSeen){ openTutorial(0); }
  else toast("Welcome back to Bing's Barn!");
}

/* ============================================================
   TITLE SCREEN BACKGROUND — animated parallax farm at sunset
   ============================================================ */
let titleRAF = null;
function startTitleBg(){
  const tc = $("#title-bg"); if(!tc) return;
  const tx = tc.getContext("2d");
  let stars = [];
  function size(){
    tc.width = window.innerWidth; tc.height = window.innerHeight;
    stars = [];
    for(let i=0;i<80;i++) stars.push({ x:Math.random()*tc.width, y:Math.random()*tc.height*0.55, r:Math.random()*1.6+0.4, tw:Math.random()*Math.PI*2 });
  }
  size();
  const onResize = ()=>size();
  window.addEventListener("resize", onResize);
  tc._onResize = onResize;

  let t = 0;
  function frame(){
    t += 0.01;
    const w = tc.width, h = tc.height;
    tx.clearRect(0,0,w,h);

    // sky gradient
    const sky = tx.createLinearGradient(0,0,0,h);
    sky.addColorStop(0,"#2a1a4a"); sky.addColorStop(.4,"#5a2a6a");
    sky.addColorStop(.72,"#c25a5a"); sky.addColorStop(1,"#f4a460");
    tx.fillStyle = sky; tx.fillRect(0,0,w,h);

    // stars (twinkle, fade near horizon)
    for(const s of stars){
      const a = 0.5 + 0.5*Math.sin(t*3 + s.tw);
      tx.fillStyle = `rgba(255,255,255,${a*0.8})`;
      tx.fillRect(s.x, s.y, s.r, s.r);
    }

    // sun sinking toward horizon
    const sunX = w*0.5, sunY = h*0.55 + Math.sin(t*0.3)*6;
    const g = tx.createRadialGradient(sunX,sunY,0,sunX,sunY,120);
    g.addColorStop(0,"rgba(255,240,180,.95)"); g.addColorStop(.5,"rgba(255,180,90,.6)"); g.addColorStop(1,"rgba(255,140,60,0)");
    tx.fillStyle = g; tx.beginPath(); tx.arc(sunX,sunY,120,0,Math.PI*2); tx.fill();
    tx.fillStyle = "#ffe9a8"; tx.beginPath(); tx.arc(sunX,sunY,46,0,Math.PI*2); tx.fill();

    // parallax hills
    drawHill(tx, w, h, h*0.66, "#5a3a5a", t*8, 60);
    drawHill(tx, w, h, h*0.74, "#3a6a3a", t*14, 80);
    drawHill(tx, w, h, h*0.84, "#2f5c2a", t*22, 100);

    // little barn silhouette on the front hill
    const bx = w*0.72, by = h*0.80;
    tx.fillStyle = "#3a2a2a";
    tx.fillRect(bx, by, 70, 46);
    tx.beginPath(); tx.moveTo(bx-6,by); tx.lineTo(bx+35,by-26); tx.lineTo(bx+76,by); tx.closePath(); tx.fill();
    tx.fillStyle = "#1a1414"; tx.fillRect(bx+28, by+16, 16, 30); // door

    // drifting clouds
    for(let i=0;i<4;i++){
      const cx2 = ((t*20 + i*260) % (w+240)) - 120;
      const cy2 = h*0.2 + i*36;
      tx.fillStyle = "rgba(255,220,200,.18)";
      tx.beginPath(); tx.ellipse(cx2, cy2, 70, 20, 0, 0, Math.PI*2); tx.fill();
    }

    titleRAF = requestAnimationFrame(frame);
  }
  frame();
}
function drawHill(tx, w, h, base, color, phase, amp){
  tx.fillStyle = color;
  tx.beginPath();
  tx.moveTo(0, h);
  for(let x=0;x<=w;x+=12){
    const y = base + Math.sin((x*0.006) + phase*0.02) * amp*0.15;
    tx.lineTo(x, y);
  }
  tx.lineTo(w, h); tx.closePath(); tx.fill();
}
function stopTitleBg(){
  if(titleRAF){ cancelAnimationFrame(titleRAF); titleRAF=null; }
  const tc = $("#title-bg"); if(tc && tc._onResize){ window.removeEventListener("resize", tc._onResize); }
}

/* ============================================================
   TUTORIAL (welcome guide) + OBJECTIVE BANNER (early-game guidance)
   ============================================================ */
const TUTORIAL = [
  { title:"Welcome to Bing's Barn 🚜",
    body:`You're <b>Bing</b> — a farmer who really does NOT want to be called "Boer Bing."<br><br>
      Your goal: build a thriving farm, meet the villagers, explore the valley, and get rich.
      There's no rush — play at your own pace.<br><br>
      <b>The golden rule:</b> follow the 🎯 <b>objective</b> at the top-left. It always tells you what to do next.` },
  { title:"Moving around 🕹️",
    body:`Walk with <span class="key-chip">W A S D</span> or the <span class="key-chip">Arrow keys</span>.<br><br>
      Yellow glowing tiles <span class="key-chip">➡️</span> are <b>exits</b> — step on one to travel to a new area.
      Your farm's exit (bottom edge) leads to Widr Village.` },
  { title:"Your tools 🛠️",
    body:`The bar at the bottom is your <b>hotbar</b>. Pick a slot with number keys
      <span class="key-chip">1</span>–<span class="key-chip">0</span>, then press <span class="key-chip">Space</span> to use it on the tile you're facing.<br>
      <ul>
        <li><b>Hoe ⛏️</b> — till dirt so you can plant</li>
        <li><b>Seeds 🌱</b> — plant on tilled soil</li>
        <li><b>Watering Can 🪣</b> — water crops daily (refill at any water)</li>
        <li><b>Axe 🪓 / Pickaxe ⚒️</b> — chop trees / break rocks</li>
      </ul>` },
  { title:"The daily loop ☀️🌙",
    body:`Crops grow overnight <b>only if watered</b>. Time passes as you play; when you're tired,
      go home and <b>sleep</b> (walk to your farmhouse door 🚪 and press <span class="key-chip">Space</span>, or press <span class="key-chip">Q</span>).<br><br>
      Sleeping saves your game, advances the day, and grows your watered crops.
      Watch your <b>energy bar</b> — actions cost energy.` },
  { title:"Combat ⚔️",
    body:`Down in the <b>Mines</b> you'll fight monsters. Buy weapons & armor at the <b>Adventurer's Guild</b> in the village.<br>
      <ul>
        <li>Hold a weapon and press <span class="key-chip">Space</span> to attack (facing direction)</li>
        <li><b>Sword/Club/Dagger</b> melee · <b>Bow</b> fires arrows · <b>Staff</b> casts magic (uses 🔵 mana)</li>
        <li><span class="key-chip">Shift</span> dodge roll (brief invulnerability) · hold <span class="key-chip">C</span> to block</li>
        <li><span class="key-chip">F</span> switches your staff spell · drink ❤️/🔵 potions from the hotbar</li>
      </ul>
      Watch your <b>❤️ health</b> — if it hits zero you're dragged back to the village. Sleep fully heals you.` },
  { title:"Menus & help 📖",
    body:`Press <span class="key-chip">E</span> to open your menu: inventory, skills & talents, quests, villagers, achievements, world map, and settings.<br><br>
      Other keys: <span class="key-chip">G</span> gift an item to a nearby villager · <span class="key-chip">M</span> mute music.<br><br>
      Stuck? Click the <span class="key-chip">?</span> button (top-right) to reopen this guide anytime. Now go grow something!` },
];
let tutStep = 0;
function openTutorial(step){
  S.paused = true;
  tutStep = step||0;
  $("#tutorial-overlay").classList.remove("hidden");
  renderTutStep(tutStep);
}
function renderTutStep(step){
  tutStep = Math.max(0, Math.min(TUTORIAL.length-1, step));
  const t = TUTORIAL[tutStep];
  $("#tut-title").textContent = t.title;
  $("#tut-body").innerHTML = t.body;
  $("#tut-prev").style.visibility = tutStep===0 ? "hidden" : "visible";
  $("#tut-next").textContent = tutStep>=TUTORIAL.length-1 ? "Let's go! ✓" : "Next ▶";
  $("#tut-dots").innerHTML = TUTORIAL.map((_,i)=>`<span class="dot${i===tutStep?' on':''}"></span>`).join("");
}
function closeTutorial(){
  $("#tutorial-overlay").classList.add("hidden");
  S.paused = false;
  S.tutorialSeen = true;
  save();
}

/* Early-game objectives — a guided checklist that advances as you act.
   `done(s)` returns true once the step is complete; `text` is shown in
   the 🎯 banner. After the list is exhausted, the banner shows the
   current quest so there's always a next thing to do.                 */
const OBJECTIVES = [
  { text:"Select your Hoe (press 1) and till the soil — press Space facing the dirt field",
    done:s=>tilledCount()>=1 },
  { text:"Select Parsnip Seeds (press 7) and plant them on tilled soil",
    done:s=>Object.keys(s.crops).length>=1 },
  { text:"Select your Watering Can (press 2) and water your crops",
    done:s=>Object.values(s.crops).some(c=>c.watered) },
  { text:"Go home and sleep to pass the day (walk to the farmhouse door 🚪, press Space — or press Q)",
    done:s=>s.day>=2 },
  { text:"Water your crops again, then keep sleeping until they're ready to harvest",
    done:s=>s.stats.harvest>=1 },
  { text:"Head south to Widr Village (step on the ➡️ exit at the bottom of your farm)",
    done:s=>s.visited && s.visited.village },
  { text:"Sell crops & buy seeds at the Market 🏪, and say hi to the villagers (walk up, press Space)",
    done:s=>s.stats.earn>=100 || Object.keys(s.talkedToday||{}).length>=1 },
  { text:"You've got the basics! Follow your Quests (press E) and explore the valley.",
    done:s=>false }, // final resting step
];
function tilledCount(){
  // count tilled tiles on the farm (cheap: scan farm grid)
  const a = W.areas.farm; if(!a) return 0;
  let n=0; for(let y=0;y<a.rows;y++) for(let x=0;x<a.cols;x++) if(a.tiles[y][x]===T.TILLED) n++;
  return n;
}
function updateObjective(){
  if(!S) return;
  const banner = $("#objective-banner");
  if(!banner) return;
  // advance past any completed steps
  let advanced=false;
  while(S.objectiveStep < OBJECTIVES.length-1 && OBJECTIVES[S.objectiveStep].done(S)){
    S.objectiveStep++; advanced=true;
  }
  const obj = OBJECTIVES[S.objectiveStep];
  let text = obj.text;
  // once the intro checklist is done, surface the current quest instead
  if(S.objectiveStep >= OBJECTIVES.length-1 && S.activeQuests && S.activeQuests.length){
    const q = D.QUESTS.find(x=>x.id===S.activeQuests[0]);
    if(q){ const p=q._prog||0; text = `Quest: ${q.title} — ${q.desc} (${Math.min(p,q.goal.count)}/${q.goal.count})`; }
  }
  $("#objective-text").textContent = text;
  banner.classList.remove("hidden");
  if(advanced){ banner.classList.remove("pulse"); void banner.offsetWidth; banner.classList.add("pulse"); A.sfx("quest"); }
}

function boot(){
  const hasSave = !!localStorage.getItem(SAVE_KEY);
  $("#btn-continue").disabled = !hasSave;
  $("#help-btn").onclick = ()=>openTutorial(0);
  $("#tut-prev").onclick = ()=>renderTutStep(tutStep-1);
  $("#tut-next").onclick = ()=>{ if(tutStep>=TUTORIAL.length-1) closeTutorial(); else renderTutStep(tutStep+1); };

  $("#btn-continue").onclick=()=>{ if(load()){ startGame(); } };
  $("#btn-new").onclick=()=>{ $("#title-screen").classList.add("hidden"); $("#create-screen").classList.remove("hidden"); };
  $("#btn-import").onclick=()=>$("#import-file").click();
  $("#import-file").onchange=importSaveFile;

  $("#btn-back").onclick=()=>{ $("#create-screen").classList.add("hidden"); $("#title-screen").classList.remove("hidden"); };
  $("#btn-start").onclick=()=>{
    const name=$("#farm-name").value.trim()||"Kaasvet Acres";
    const shirt=$("#shirt-color").value;
    S=freshState(name, shirt);
    save();
    startGame();
  };

  startTitleBg();
  requestAnimationFrame(loop);
}

boot();
})();
