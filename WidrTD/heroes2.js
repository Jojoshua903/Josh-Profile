// ===== WIDR TD: Thomas (large bodyguard) and Jorn (middle school kid) =====

// ---------- Thomas: so big he takes up extra room, slows anything walking past and stomps the ground ----------
TOWERS.thomas = {
  name:'Thomas', from:'WIDR', role:'Big Bodyguard', cost:750, color:'#2e3a5a', size:1.45,
  blurb:'A LARGE hero: he takes up extra room, and enemies walking past him slow down because he is in the way. His stomps shake the ground and crack ice.',
  base:{range:95, rate:1.3, dmg:2, pierce:12, kind:'stomp', bulk:.2, bulkR:70},
  paths:[
    {name:'Ground Pound', ups:[
      {name:'Heavy Boots', cost:250, desc:'+1 damage and +4 pierce.', apply:s=>{s.dmg+=1; s.pierce+=4;}},
      {name:'Shockwave', cost:550, desc:'+25 range, and stomps knock enemies back.', apply:s=>{s.range+=25; s.knock=30;}},
      {name:'Seismic Slam', cost:2400, desc:'6 damage, +10 pierce, stuns for 0.6s.', apply:s=>{s.dmg=6; s.pierce+=10; s.stun=.6;}},
      {name:'Tectonic Stomp', cost:7000, desc:'15 damage, bigger knockback, triple vs bosses.', apply:s=>{s.dmg=15; s.knock=60; s.bossMult=3;}},
      {name:'Earth Shatterer', cost:36000, desc:'40 damage, +40 range, stuns for 1s.', apply:s=>{s.dmg=40; s.range+=40; s.stun=1;}},
    ]},
    {name:'Heavy Tech', ups:[
      {name:'Shoulder Cannon', cost:400, desc:'A shoulder cannon fires 4 shots a second for 1 damage. Can hit flyers.', apply:s=>{s.gun={dmg:1, rate:.25}; s.air=true;}},
      {name:'Tracer Rounds', cost:750, desc:'Cannon does 2 damage, and Thomas sees ghosts.', apply:s=>{s.gun=Object.assign({}, s.gun, {dmg:2}); s.camo=true;}},
      {name:'Gatling Rig', cost:2500, desc:'Cannon fires 10 shots a second for 3 damage.', apply:s=>{s.gun=Object.assign({}, s.gun, {dmg:3, rate:.1});}},
      {name:'Rocket Pods', cost:7500, desc:'Cannon fires rockets: 6 damage that explodes and cracks ice.', apply:s=>{s.gun=Object.assign({}, s.gun, {dmg:6, blast:40});}},
      {name:'Walking Arsenal', cost:38000, desc:'15 damage rockets, 16 a second, with bigger explosions.', apply:s=>{s.gun=Object.assign({}, s.gun, {dmg:15, rate:.06, blast:55});}},
    ]},
    {name:'Bodyguard', ups:[
      {name:'Earpiece', cost:300, desc:'Protects heroes within 140: Zennith\'s fireballs and lava vents can\'t knock them out.', apply:s=>{s.guard=140;}},
      {name:'Body Block', cost:650, desc:'Enemies walking past are slowed 40% in a bigger area.', apply:s=>{s.bulk=.4; s.bulkR=90;}},
      {name:'Lockdown', cost:2600, desc:'ABILITY: freezes every enemy on the map for 3 seconds (1.2 for bosses) with 20 damage, and wakes up heroes near Thomas.', apply:ab('lockdown','Lockdown','🛡',50)},
      {name:'Head of Security', cost:7000, desc:'Nearby heroes attack 25% faster with +10% range. Lockdown hits twice as hard and lasts longer.', apply:both(aura({rate:.25, range:.1}), abPow(2, .7))},
      {name:'Unstoppable', cost:34000, desc:'Protects heroes within 220, slows passing enemies 60%. Lockdown lasts twice as long.', apply:both(s=>{s.guard=220; s.bulk=.6; s.bulkR=110;}, abPow(3, .6))},
    ]},
  ]};

// ---------- Jorn: a middle school kid with paper planes, spitballs and lunch money ----------
TOWERS.jorn = {
  name:'Jorn', from:'WIDR', role:'Middle School Kid', cost:300, color:'#3fa9f5',
  blurb:'Folds paper planes in class and throws them at anything that moves. Cheap to place, and his planes can hit flyers.',
  base:{range:140, rate:.75, dmg:1, pierce:2, kind:'plane', shots:1, spread:0, speed:430, air:true},
  paths:[
    {name:'Paper Planes', ups:[
      {name:'Folded Tight', cost:150, desc:'+2 pierce.', apply:s=>{s.pierce+=2;}},
      {name:'Stealth Fold', cost:400, desc:'Planes home in on enemies, and Jorn sees ghosts.', apply:s=>{s.homing=true; s.camo=true;}},
      {name:'Paper Squadron', cost:1800, desc:'Throws 3 planes at a time.', apply:s=>{s.shots=3; s.spread=.25;}},
      {name:'Origami Master', cost:6000, desc:'5 planes, 5 damage each, +4 pierce.', apply:s=>{s.shots=5; s.dmg=5; s.pierce+=4;}},
      {name:'Paper Air Force', cost:31000, desc:'8 planes, 14 damage each, 40% faster.', apply:s=>{s.shots=8; s.dmg=14; s.rate*=.6;}},
    ]},
    {name:'Spitballs', ups:[
      {name:'Spitballs', cost:200, desc:'Soggy planes slow enemies by 30%.', apply:s=>{s.slow=.3;}},
      {name:'Sticky Spitballs', cost:450, desc:'50% slow and +1 damage.', apply:s=>{s.slow=.5; s.dmg+=1;}},
      {name:'Pea Shooter', cost:2000, desc:'Throws 2.5x as fast, +1 damage.', apply:s=>{s.rate*=.4; s.dmg+=1;}},
      {name:'Gross-Out', cost:6500, desc:'+3 damage, stuns for 0.4s, triple vs armor.', apply:s=>{s.dmg+=3; s.stun=.4; s.armorMult=3;}},
      {name:'Detention for All', cost:33000, desc:'12 damage, stuns for 0.8s, triple vs bosses.', apply:s=>{s.dmg=12; s.stun=.8; s.bossMult=3;}},
    ]},
    {name:'Class Clown', ups:[
      {name:'Lunch Money', cost:250, desc:'+$40 at the end of every wave.', apply:s=>{s.income=(s.income||0)+40;}},
      {name:'Teacher\'s Pet', cost:600, desc:'Nearby heroes get +15% range.', apply:aura({range:.15})},
      {name:'Recess!', cost:2400, desc:'ABILITY: the whole class shows up and throws 36 paper planes from every side of the map.', apply:ab('recess','Recess!','✈️',45)},
      {name:'Student Council', cost:6500, desc:'+$200 per wave. Recess brings more planes that hit twice as hard.', apply:both(s=>{s.income=(s.income||0)+200;}, abPow(2, .7))},
      {name:'Principal Jorn', cost:30000, desc:'+$500 per wave, nearby heroes attack 30% faster with +20% range. Recess hits 3x as hard.', apply:both(s=>{s.income=(s.income||0)+500;}, aura({rate:.3, range:.2}), abPow(3, .6))},
    ]},
  ]};

['thomas', 'jorn'].forEach(k => TOWERS[k].paths.forEach(p => p.ups.forEach((u, i) => {
  if (i < 3) return;
  const f = u.apply; u.paradise = i + 1;
  u.apply = s => { f(s); s.paradise = Math.max(s.paradise || 0, i + 1); };
})));
CATEGORIES.find(c => c.id === 'tech').heroes.push('thomas'); TOWERS.thomas.cat = 'tech';
CATEGORIES.find(c => c.id === 'throw').heroes.push('jorn'); TOWERS.jorn.cat = 'throw';
TOWER_ORDER.length = 0;
CATEGORIES.forEach(c => c.heroes.forEach(k => TOWER_ORDER.push(k)));
TOWER_ORDER.forEach((k, i) => TOWERS[k].key = HERO_KEYS[i] || '');

const heroSize = (k, t) => (t && t.form && TOWERS[k].formSize && TOWERS[k].formSize[t.form]) || (TOWERS[k] && TOWERS[k].size) || 1;
// is this hero inside a Thomas bodyguard zone?
const guarded = t => G.towers.some(o => o.s.guard && Math.hypot(o.x - t.x, o.y - t.y) <= o.s.guard);
function thomasTick(t, dt, mult) {
  const s = t.s;
  // he's in the way: ground enemies near him slow down (half as much for bosses)
  for (const e of G.enemies) {
    if (e.dead || e.pi === 'air' || Math.hypot(e.x - t.x, e.y - t.y) > s.bulkR) continue;
    const sl = ENEMIES[e.type].boss ? s.bulk * .5 : s.bulk;
    if (e.slow <= sl) { e.slow = sl; e.slowT = Math.max(e.slowT, .2); }
  }
  if (!s.gun) return;
  if ((t.gunCd = (t.gunCd || 0) - dt * mult) > 0) return;
  const [e] = pickTargets(t, 1);
  if (!e) { t.gunCd = .1; return; }
  const sz = heroSize(t.type), gx = t.x + 13 * sz, gy = t.y - 20 * sz;
  t.gunAng = Math.atan2(e.y - gy, e.x - gx);
  if (s.gun.blast) {
    for (const o of G.enemies) if (!o.dead && Math.hypot(o.x - e.x, o.y - e.y) <= s.gun.blast) damage(o, s.gun.dmg, {src: t, type: 'blast'});
    G.fx.push({kind: 'boom', x: e.x, y: e.y, r: s.gun.blast * .7, t: 0, life: .22, col: PAL.coral});
  } else damage(e, s.gun.dmg, {src: t});
  G.fx.push({kind: 'tracer', x: gx, y: gy, x2: e.x, y2: e.y, t: 0, life: .08, col: s.gun.blast ? '#ff8a1f' : PAL.sun});
  t.gunCd = s.gun.rate;
}

// ---------- Art ----------
HERO_ART.thomas = (ctx, SK, t) => {
  const suit = SK.suit || '#2e3a5a';
  // broad shoulders and a big torso
  sticker(ctx, () => ctx.roundRect(-17, 2, 34, 17, 8), suit, 2.5, 2.5);
  shape(ctx, () => { ctx.moveTo(-5, 3); ctx.lineTo(0, 12); ctx.lineTo(5, 3); ctx.closePath(); }, '#fff', 1.5); // shirt
  shape(ctx, () => { ctx.moveTo(-1.5, 4); ctx.lineTo(1.5, 4); ctx.lineTo(2, 11); ctx.lineTo(0, 13); ctx.lineTo(-2, 11); ctx.closePath(); }, SK.tie || '#22172b', 1);
  // arms crossed in front
  sticker(ctx, () => ctx.roundRect(-15, 10, 30, 7, 3.5), suit, 1, 2.5);
  shape(ctx, circ(ctx, -12, 13.5, 3), PAL.skin2, 1.5); shape(ctx, circ(ctx, 12, 13.5, 3), PAL.skin2, 1.5);
  // thick neck and a small buzzcut head
  shape(ctx, () => ctx.roundRect(-6, -2, 12, 6, 2), PAL.skin2, 2);
  face(ctx, 0, -9, 10, PAL.skin2, {ey: -1});
  shape(ctx, () => { ctx.arc(0, -10, 10.4, Math.PI * 1.08, Math.PI * 1.92); ctx.closePath(); }, '#3a2a22', 1.5);
  // sunglasses
  shape(ctx, () => { ctx.roundRect(-8.5, -12, 7.5, 4.5, 2); ctx.roundRect(1, -12, 7.5, 4.5, 2); }, '#14101a', 1.5);
  ctx.strokeStyle = '#14101a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-1, -10); ctx.lineTo(1, -10); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(-7.5, -11.4, 2, 1.2); ctx.fillRect(2, -11.4, 2, 1.2);
  // earpiece with a coiled cord
  shape(ctx, circ(ctx, 10, -8, 1.8), '#cdd6e4', 1);
  ctx.strokeStyle = '#cdd6e4'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(10, -6); ctx.quadraticCurveTo(12, -1, 9, 3); ctx.stroke();
};
HELD_ART.thomas = (ctx, s) => {
  if (!s || !s.gun) return;
  // a shoulder cannon (drawn at the hand position, so pull it up to the shoulder)
  ctx.save(); ctx.translate(-4, -18);
  sticker(ctx, () => ctx.roundRect(-6, -4, 14, 8, 3), s.gun.blast ? PAL.coral : '#5d6577', 1.5, 2);
  ctx.fillStyle = INK; ctx.fillRect(7, -2.5, 6, 2); ctx.fillRect(7, .5, 6, 2);
  ctx.fillStyle = PAL.coral; ctx.beginPath(); ctx.arc(-2, 0, 1.4, 0, 7); ctx.fill();
  ctx.restore();
};
HERO_ART.jorn = (ctx, SK) => {
  // hoodie and backpack straps
  sticker(ctx, () => ctx.roundRect(-10, 6, 20, 11, 4), SK.hoodie || '#3fa9f5', 2, 2.5);
  ctx.fillStyle = SK.pack || '#2f6fe0'; ctx.fillRect(-8, 6, 3, 10); ctx.fillRect(5, 6, 3, 10);
  ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.strokeRect(-8, 6, 3, 10); ctx.strokeRect(5, 6, 3, 10);
  face(ctx, 0, -3, 10.5, PAL.skin, {ey: -1});
  // messy hair
  shape(ctx, () => { ctx.moveTo(-11, -4); ctx.lineTo(-10, -10); ctx.lineTo(-7, -9); ctx.lineTo(-5, -14); ctx.lineTo(-2, -11); ctx.lineTo(1, -15); ctx.lineTo(3, -11); ctx.lineTo(7, -14); ctx.lineTo(8, -9); ctx.lineTo(11, -10); ctx.lineTo(11, -4); ctx.quadraticCurveTo(0, -9, -11, -4); }, SK.hair || '#c9772b', 1.8);
  // braces grin
  ctx.fillStyle = '#cdd6e4'; ctx.fillRect(-3, 1.5, 6, 1.2);
  // band-aid on the cheek
  ctx.save(); ctx.translate(7, 0); ctx.rotate(-.5); ctx.fillStyle = '#f2c79a'; ctx.fillRect(-3, -1.2, 6, 2.4); ctx.restore();
};
function paperPlane(ctx, sz, col) {
  sticker(ctx, () => { ctx.moveTo(8 * sz, 0); ctx.lineTo(-6 * sz, -5 * sz); ctx.lineTo(-3 * sz, 0); ctx.lineTo(-6 * sz, 5 * sz); ctx.closePath(); }, col, 1, 1.4);
  ctx.strokeStyle = 'rgba(34,23,43,.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(8 * sz, 0); ctx.lineTo(-3 * sz, 0); ctx.stroke();
}
HELD_ART.jorn = (ctx, s) => paperPlane(ctx, .9, s && s.slow ? '#c7f0b5' : '#fff');
PROJ_ART.plane = (ctx, p) => {
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.vy, p.vx) + Math.sin(p.spin * .5) * .15);
  paperPlane(ctx, p.size || 1, p.col || (p.src && p.src.s.slow ? '#c7f0b5' : '#fff'));
  ctx.restore();
};

// voice lines (speech bubbles only)
VOICE.thomas = {place:['Thomas. Security.', 'Nobody gets past the big guy.'], up:['Heavier.', 'Upgraded. Still large.'], para:['I am the wall.'], ability:['Lockdown! Nobody move!'], boss:['That one is almost my size.'], win:['Area secured.']};
VOICE.jorn = {place:['Is this on the test?', 'Recess already?'], up:['Sick, new stuff!', 'This is way better than homework.'], para:['Who\'s the class clown now?'], ability:['Recess! Everybody throw!'], boss:['Whoa, that\'s huge! Can I film it?'], win:['Best school day ever!']};
