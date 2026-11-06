// Roster from joshibrahim.nl (characters.js / WIDR 64 index). Pixel sprites drawn facing right,
// origin at feet centre, sprite spans roughly x -6..6, y -18..0.
const INK = '#1d1a2f', SKIN = '#ffd7b0';

const ROSTER = [
  {id:'nathan', name:'Nathan', title:'Baseball Slugger', color:'#ff3b3b', shirt:'#ffffff', pants:'#ff3b3b', head:'cap', hat:'#ff3b3b', prop:'bat',
   desc:'The main character. A big-swinging slugger who never backs down from a pitch.'},
  {id:'ash', name:'Ash', title:'Little Pitcher', color:'#3c8dff', shirt:'#3c8dff', hair:'#5a3416', head:'capback', hat:'#3c8dff', prop:'glove', small:true,
   desc:'Nathan’s little brother. Small, quick, and throws a fastball faster than a kart.'},
  {id:'ati', name:'Ati', title:'The Strict Mom', color:'#d94fd0', shirt:'#d94fd0', hair:'#3a2216', head:'bun', prop:'slipper', brows:'angry',
   desc:'Nobody wins an argument with Ati. Her slipper always finds its target.'},
  {id:'daniel', name:'Daniel', title:'Demolition Bomber', color:'#ff7a1f', shirt:'#ff7a1f', head:'hardhat', hat:'#ffd23f', prop:'bomb', brows:'angry',
   desc:'Demolition expert. If it’s in his way, it’s coming down.'},
  {id:'dean', name:'Dean', title:'Breakdancer Gamer', color:'#8a5cff', shirt:'#8a5cff', head:'beanie', hat:'#1fb5a6', prop:'phones',
   desc:'Breakdancer by day, top-ranked gamer by night. Perfect reflexes, smooth moves.'},
  {id:'deniz', name:'Deniz', title:'Ice Wizard', color:'#7fd8ff', shirt:'#4fa8e8', hair:'#eaf6ff', head:'wizard', hat:'#2f7bff', band:'#bff3ff', prop:'icestaff', robe:true,
   desc:'A frost wizard who never slips. Icy roads feel like normal tarmac to him.'},
  {id:'dih', name:'Dih', title:'Cheeky Worm', color:'#ff9ab0', body:'worm',
   desc:'A cheeky little worm with a big grin. Light as a feather and impossible to pin down.'},
  {id:'enno', name:'Enno', title:'The Mathematician', color:'#1fb5a6', shirt:'#1fb5a6', hair:'#8a7a6a', head:'messy', prop:'glasses', bowtie:true,
   desc:'Calculates the perfect line in his head. Every corner is just geometry.'},
  {id:'fionn', name:'Fionn', title:'Irish Geologist', color:'#2f9a46', shirt:'#2f9a46', head:'flatcap', hat:'#6b7a4a', beard:'#e0661f', prop:'rock',
   desc:'An Irish geologist who knows every rock by name, and how hard each one hits.'},
  {id:'guiseppe', name:'Guiseppe', title:'Sentient Apple', color:'#e0201f', body:'apple',
   desc:'A sentient apple with a magnificent mustache. He has his own video game, and he’ll remind you.'},
  {id:'adam', name:'Adam', title:'Tennis Ace', color:'#8fd400', shirt:'#ffffff', hair:'#7a4a24', head:'headband', hat:'#2fbf71', prop:'racket',
   desc:'A tennis ace with a lightning backhand. He can return anything, even cannonballs.'},
  {id:'josh', name:'Josh', title:'Tech Whiz', color:'#607d8b', shirt:'#607d8b', hair:'#2a1a0a', head:'messy', prop:'drone', glasses:true,
   desc:'Tech whiz who never goes anywhere without his drone. Renas’s big brother.'},
  {id:'lars', name:'Lars', title:'Dwarf Miner', color:'#8b5a2b', shirt:'#8b5a2b', head:'minehat', hat:'#d9a441', beard:'#5a3416', prop:'pick', wide:true, small:true, brows:'angry',
   desc:'A stout dwarf miner. Short, wide and as solid as the mountains he digs through.'},
  {id:'meta', name:'Meta AI', title:'The Meddling Chatbot', color:'#0866ff', body:'ring',
   desc:'A chatbot that butts into everything nobody asked it about. The recurring villain.'},
  {id:'milo', name:'Milo', title:'Lightning Wizard', color:'#ffd23f', shirt:'#5a3dff', hair:'#ffe066', head:'wizard', hat:'#3a2a8a', band:'#ffd23f', prop:'boltstaff', robe:true, brows:'angry',
   desc:'A storm-calling wizard. Fastest top speed around, a little wild in the corners.'},
  {id:'renas', name:'Renas', title:'Gadget Kid', color:'#ffb02e', shirt:'#ffb02e', hair:'#2a1a0a', head:'propeller', prop:'backpack', small:true,
   desc:'Josh’s little brother. His backpack is full of half-finished inventions.'},
  {id:'reshman', name:'Reshman', title:'Mysterious Ninja', color:'#2a2238', shirt:'#2a2238', pants:'#2a2238', head:'ninja', hat:'#2a2238', band:'#e8202a', small:true,
   desc:'The Shadow from Demolition Run. Nobody is quite sure who he is.'},
  {id:'robin', name:'Robin', title:'Big Crybaby', color:'#b388ff', shirt:'#b388ff', hair:'#c8915a', head:'short', tears:true,
   desc:'The Big Crybaby. Every spike is a personal tragedy.'},
  {id:'thomas', name:'Thomas', title:'“The Rounder”', color:'#ffc48a', shirt:'#ffc48a', hair:'#3a2216', head:'short', wide:true,
   desc:'“The Rounder.” Round, steady, and rolls with it.'},
  {id:'yassin', name:'Yassin', title:'The Kickboxer', color:'#e8202a', shirt:'#1d1a2f', pants:'#e8202a', hair:'#1a1008', head:'short', prop:'gloves', brows:'angry',
   desc:'The Kickboxer. Fast feet, faster hands.'},
  {id:'oela', name:'Oela', title:'The Footballer', color:'#1fa04a', shirt:'#1fa04a', pants:'#ffffff', hair:'#1a1008', head:'short', prop:'ball',
   desc:'The Footballer. Treats every platform like a pitch.'},
  {id:'casper', name:'Casper', title:'The Car Expert', color:'#e0201f', shirt:'#e0201f', hair:'#f2e2a0', head:'capback', hat:'#1d1a2f', prop:'wrench',
   desc:'The Car Expert. Knows what’s under every hood.'},
  {id:'zennith', name:'Zennith', title:'The Living Dark', color:'#1a1030', body:'blob',
   desc:'The Living Dark. A shadow with eyes.'},
  {id:'ankervos', name:'Anker Vos', title:'The Annoying Fox', color:'#ff7a1f', body:'fox',
   desc:'The Annoying Fox. Will not stop talking.'}
];

const ACCESSORIES = [
  {id:'none', name:'None'}, {id:'crown', name:'Crown'}, {id:'party', name:'Party hat'},
  {id:'halo', name:'Halo'}, {id:'horns', name:'Horns'}, {id:'flower', name:'Flower'}
];
const TINTS = [null, '#ff3b3b', '#ffb02e', '#3ccf6e', '#2f7bff', '#d94fd0', '#1d1a2f'];
const TRAILS = [{id:'none', name:'None'}, {id:'spark', name:'Sparkle'}, {id:'fire', name:'Fire'}, {id:'heart', name:'Hearts'}];

function drawChar(ctx, look, x, y, facing, t, state){
  const c = ROSTER.find(r => r.id === look.char) || ROSTER[0];
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(facing < 0 ? -1 : 1, 1);
  const r = (a, b, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(a, b, w, h); };
  const run = state === 'run' ? Math.floor(t / 5) % 2 : 0;
  const air = state === 'air';
  const shirt = look.tint || c.shirt || c.color;
  let headTop = -18;

  if (c.body === 'apple'){
    const red = look.tint || '#e0201f';
    r(-6,-12,12,11,red); r(-5,-13,10,1,red); r(-5,-1,10,1,red); r(-7,-10,1,7,red); r(6,-10,1,7,red);
    r(-4,-11,2,2,'#ff8a80');
    r(0,-16,1,3,'#6b3f1f'); r(1,-16,3,2,'#3ccf6e');
    r(0,-9,1,2,INK); r(3,-9,1,2,INK);
    r(-1,-6,3,1,'#2a1a0a'); r(2,-6,3,1,'#2a1a0a'); r(-2,-5,2,1,'#2a1a0a'); r(4,-5,2,1,'#2a1a0a');
    r(-3, 0, 2, run ? 0 : 1, INK); r(2, 0, 2, 1, INK);
    headTop = -16;
  } else if (c.body === 'worm'){
    const pink = look.tint || '#ff9ab0';
    for (let i = 0; i < 4; i++){ const ox = Math.round(Math.sin(t/6 + i)*1); r(-4+ox,-4-i*4,8,4,pink); r(-4+ox,-4-i*4,8,1,'#ff7a9a'); }
    r(-5,-22,10,7,pink); r(1,-20,1,2,INK); r(4,-19,2,1,INK); r(0,-17,5,1,INK); r(-3,-18,2,1,'#ff6f8f');
    headTop = -22;
  } else if (c.body === 'ring'){
    const bob = Math.round(Math.sin(t/8)*1);
    const blue = look.tint || '#0866ff';
    ctx.translate(0, bob);
    r(-6,-15,12,2,blue); r(-6,-5,12,2,'#c23bff'); r(-7,-13,2,8,blue); r(5,-13,2,8,'#c23bff');
    r(-2,-11,2,1,'#ff3b5c'); r(2,-11,2,1,'#ff3b5c'); r(-1,-8,4,1,'#ff3b5c');
    headTop = -15;
  } else if (c.body === 'blob'){
    const dark = look.tint || '#1a1030';
    const w = Math.round(Math.sin(t/7));
    r(-6,-13,12,13,dark); r(-5,-15,10,2,dark); r(-7,-9,1,8,dark); r(6,-9,1,8,dark);
    r(-6+w,0,3,1,dark); r(3-w,0,3,1,dark);
    r(-2,-10,2,2,'#c27bff'); r(2,-10,2,2,'#c27bff');
    headTop = -15;
  } else if (c.body === 'fox'){
    const o = look.tint || '#ff7a1f';
    r(-5,-9,9,6,o); r(-5,-6,6,3,'#ffffff');
    r(-6,-10,3,4,o); r(-8,-12,3,4,o); r(-8,-12,2,2,'#ffffff');
    r(1,-15,7,6,o); r(1,-17,2,2,o); r(5,-17,2,2,o); r(2,-16,1,1,INK); r(6,-16,1,1,INK);
    r(6,-11,3,2,'#ffffff'); r(8,-11,1,1,INK); r(5,-13,1,1,INK);
    r(-4,-3,2,3-run,INK); r(2,-3,2,2+run,INK);
    headTop = -17;
  } else {
    const sm = c.small ? 1 : 0, wd = c.wide ? 1 : 0;
    const pants = c.pants || '#3a3550';
    // legs
    if (air){ r(-4,-5,3,3,pants); r(1,-5,3,4,pants); r(-4,-2,3,1,INK); r(1,-1,3,1,INK); }
    else { r(-4,-4,3,4-run,pants); r(1,-4,3,3+run,pants); r(-4,-1-run,3,1,INK); r(1,-1,3,1,INK); }
    // torso
    const ty = -10 + sm;
    if (c.robe){ r(-5,ty,10,7,shirt); r(-6,ty+4,12,3,shirt); }
    else r(-5-wd,ty,10+wd*2,6,shirt);
    if (c.bowtie) r(-1,ty,3,1,'#ff3b3b');
    if (c.id === 'nathan'){ r(-1,ty+2,2,3,'#ff3b3b'); }
    if (c.id === 'oela'){ r(-1,ty+1,3,3,'#ffffff'); }
    // arms
    const armY = air ? ty-1 : ty+1;
    r(-6-wd,armY,1,4,shirt); r(5+wd,armY,1,4,shirt);
    r(-6-wd,armY+4,1,1,SKIN); r(5+wd,armY+4,1,1,SKIN);
    // head
    const hy = -17 + sm;
    r(-4,hy,8,7,SKIN);
    r(1,hy+3,1,2,INK); r(3,hy+3,1,2,INK);
    if (c.brows === 'angry'){ r(0,hy+2,2,1,INK); r(3,hy+2,1,1,INK); }
    r(1,hy+6,3,1,'#c2604a');
    if (c.glasses || c.prop === 'glasses'){ r(0,hy+3,2,2,'rgba(29,26,47,.35)'); r(3,hy+3,2,2,'rgba(29,26,47,.35)'); r(0,hy+2,5,1,INK); }
    if (c.beard){ r(-3,hy+5,8,4,c.beard); r(0,hy+6,3,1,'#c2604a'); }
    if (c.tears){ const k = Math.floor(t/4)%4; r(2,hy+5+k,1,1,'#66ccff'); r(4,hy+6+(k+2)%4,1,1,'#66ccff'); }
    headTop = hy;
    // headgear
    const H = c.hat || '#333', hair = c.hair || '#3a2216';
    switch (c.head){
      case 'cap': r(-4,hy-1,8,3,H); r(3,hy+1,4,1,H); headTop = hy-1; break;
      case 'capback': r(-4,hy-1,8,3,H); r(-6,hy+1,3,1,H); r(-4,hy+2,1,2,hair); headTop = hy-1; break;
      case 'bun': r(-4,hy-1,8,3,hair); r(-4,hy+2,2,3,hair); r(-3,hy-4,4,3,hair); r(-2,hy-3,2,1,'#ff7ccf'); headTop = hy-4; break;
      case 'hardhat': r(-5,hy-1,10,3,H); r(-1,hy-2,2,1,H); r(-6,hy+1,12,1,'#ffc21f'); headTop = hy-2; break;
      case 'beanie': r(-4,hy-2,8,4,H); r(-4,hy+1,8,1,'#16877c'); r(-1,hy-3,2,1,'#ffffff'); headTop = hy-3; break;
      case 'wizard': r(-6,hy,12,1,H); r(-4,hy-2,8,2,H); r(-3,hy-4,6,2,H); r(-2,hy-6,4,2,H); r(-1,hy-8,2,2,H); r(-4,hy-1,8,1,c.band); r(-4,hy+1,2,3,hair); headTop = hy-8; break;
      case 'messy': r(-4,hy-1,8,3,hair); r(-5,hy,1,3,hair); r(-3,hy-2,2,1,hair); r(1,hy-2,2,1,hair); r(4,hy,1,1,hair); headTop = hy-2; break;
      case 'flatcap': r(-4,hy-1,8,3,H); r(2,hy+1,4,1,H); headTop = hy-1; break;
      case 'headband': r(-4,hy-1,8,2,hair); r(-4,hy+1,8,1,H); r(-6,hy+1,2,2,H); headTop = hy-1; break;
      case 'minehat': r(-5,hy-1,10,3,H); r(2,hy,3,2,INK); r(4,hy,1,1,'#fff6a0'); headTop = hy-1; break;
      case 'propeller': r(-4,hy-1,4,3,'#ff3b3b'); r(0,hy-1,4,3,'#2f7bff'); r(0,hy-3,1,2,INK);
        { const p = Math.floor(t/2)%2; r(p ? -3 : -1,hy-4,p ? 7 : 3,1,'#ff3b3b'); } headTop = hy-4; break;
      case 'ninja': r(-4,hy-1,8,4,H); r(-4,hy+5,8,3,H); r(-4,hy+1,8,1,c.band); r(-6,hy+1,2,1,c.band); r(-7,hy+2,2,1,c.band); headTop = hy-1; break;
      case 'short': default: r(-4,hy-1,8,3,hair); r(-4,hy+2,1,2,hair); headTop = hy-1;
    }
    // props
    switch (c.prop){
      case 'bat': r(-7,ty-4,2,9,'#c8915a'); break;
      case 'glove': r(6,armY+3,3,3,'#9a5a2b'); break;
      case 'slipper': r(6,armY-2,2,4,'#ff7ccf'); break;
      case 'bomb': r(6,armY+2,4,4,'#2a2a33'); r(8,armY,1,2,'#c8915a'); if ((t>>2)%2) r(8,armY-1,1,1,'#ffd23f'); break;
      case 'phones': r(-5,hy+2,1,3,INK); r(4,hy+2,1,3,INK); r(-5,hy+1,10,1,INK); break;
      case 'icestaff': r(7,ty-5,1,10,'#dfe6ee'); r(6,ty-8,3,3,'#bff3ff'); break;
      case 'boltstaff': r(7,ty-5,1,10,'#8b5a2b'); r(6,ty-8,3,3,(t>>1)%2 ? '#fff27a' : '#ffd23f'); break;
      case 'rock': r(6,armY+2,3,3,'#8a8178'); break;
      case 'racket': r(7,armY+1,1,4,INK); r(6,armY-3,3,4,'#2fbf71'); r(7,armY-2,1,2,'#ffffff'); break;
      case 'drone': { const dy = Math.round(Math.sin(t/7)*1.5); r(-3,hy-7+dy,6,2,'#2a2f3a'); r(-6,hy-8+dy,3,1,'#c9d6e0'); r(3,hy-8+dy,3,1,'#c9d6e0'); if ((t>>3)%2) r(0,hy-6+dy,1,1,'#ff3b3b'); } break;
      case 'pick': r(-8,ty-3,1,8,'#a8794a'); r(-10,ty-4,5,1,'#9a9aa8'); break;
      case 'backpack': r(-8,ty,3,6,'#9a9aa8'); r(-7,ty-3,1,3,INK); if ((t>>3)%2) r(-7,ty-4,1,1,'#ff3b3b'); break;
      case 'gloves': r(-7-wd,armY+3,3,3,'#e8202a'); r(5+wd,armY+3,3,3,'#e8202a'); break;
      case 'ball': r(6,-3,3,3,'#ffffff'); r(7,-2,1,1,INK); break;
      case 'wrench': r(6,armY,1,5,'#9a9aa8'); r(5,armY-1,3,1,'#9a9aa8'); break;
    }
  }

  // accessory on top
  const at = headTop;
  switch (look.acc){
    case 'crown': r(-3,at-3,7,2,'#ffc21f'); r(-3,at-4,1,1,'#ffc21f'); r(0,at-5,1,2,'#ffc21f'); r(3,at-4,1,1,'#ffc21f'); r(0,at-3,1,1,'#ff3b3b'); break;
    case 'party': r(-2,at-2,5,2,'#ff3b9a'); r(-1,at-4,3,2,'#ffd23f'); r(0,at-6,1,2,'#3ccf6e'); r(0,at-7,1,1,'#ffffff'); break;
    case 'halo': r(-3,at-5,7,1,'#ffe066'); r(-4,at-4,1,1,'#ffe066'); r(4,at-4,1,1,'#ffe066'); break;
    case 'horns': r(-4,at-2,2,2,'#e8202a'); r(-5,at-4,1,2,'#e8202a'); r(3,at-2,2,2,'#e8202a'); r(5,at-4,1,2,'#e8202a'); break;
    case 'flower': r(2,at-3,3,3,'#ff7ccf'); r(3,at-2,1,1,'#ffd23f'); break;
  }
  ctx.restore();
}
