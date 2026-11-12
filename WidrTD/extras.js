// ===== WIDR TD: Raaf, hero voice lines, hero mastery, damage numbers =====

// ---------- Raaf, the raven ----------
TOWERS.raaf = {
  name:'Raaf', from:'WIDR', role:'Raven Support', cost:450, color:'#6b5aa8',
  blurb:'Throws razor feathers, collects shiny coins and makes nearby heroes hit harder. Sees ghosts and hits flyers.',
  base:{range:150, rate:.85, dmg:1, pierce:3, kind:'feather', shots:1, spread:0, speed:760, camo:true, air:true},
  paths:[
    {name:'Feather Storm', ups:[
      {name:'Sharp Quills', cost:200, desc:'+1 damage and +1 pierce.', apply:s=>{s.dmg+=1; s.pierce+=1;}},
      {name:'Twin Feathers', cost:450, desc:'Throws 2 feathers at a time.', apply:s=>{s.shots=2; s.spread=.14;}},
      {name:'Feather Storm', cost:2100, desc:'Throws 5 feathers at a time, 30% faster.', apply:s=>{s.shots=5; s.spread=.16; s.rate*=.7;}},
      {name:'Black Tempest', cost:6500, desc:'7 feathers, 6 damage each, +6 pierce.', apply:s=>{s.shots=7; s.dmg=6; s.pierce+=6;}},
      {name:'Nevermore Gale', cost:32000, desc:'10 feathers, 16 damage each, 40% faster.', apply:s=>{s.shots=10; s.dmg=16; s.rate*=.6;}},
    ]},
    {name:'Shiny Things', ups:[
      {name:'Magpie Eye', cost:250, desc:'+$1 for every enemy Raaf pops.', apply:s=>{s.bounty=1;}},
      {name:'Coin Snatcher', cost:600, desc:'Steals coins: +$70 at the end of every wave.', apply:s=>{s.income=(s.income||0)+70;}},
      {name:'Treasure Hoard', cost:2200, desc:'+$2 per pop and +$220 per wave in total.', apply:s=>{s.bounty=2; s.income=(s.income||0)+150;}},
      {name:'Dragon\'s Hoard', cost:6000, desc:'+$3 per pop and +$620 per wave in total.', apply:s=>{s.bounty=3; s.income=(s.income||0)+400;}},
      {name:'Raven King\'s Vault', cost:28000, desc:'+$5 per pop and +$1,820 per wave in total.', apply:s=>{s.bounty=5; s.income=(s.income||0)+1200;}},
    ]},
    {name:'Omen', ups:[
      {name:'Dark Omen', cost:300, desc:'Heroes near Raaf deal 15% more damage.', apply:aura({dmg:.15})},
      {name:'Watchful Eyes', cost:550, desc:'Nearby heroes see ghosts and get +10% range.', apply:aura({camo:true, range:.1})},
      {name:'Nevermore', cost:2600, desc:'ABILITY: marks every enemy on the map. Marked enemies take double damage for 8 seconds.', apply:ab('nevermore','Nevermore','🪶',45)},
      {name:'Harbinger', cost:7000, desc:'Nearby heroes deal 30% more damage. Nevermore lasts 50% longer.', apply:both(aura({dmg:.3}), abPow(2, .7))},
      {name:'Raven Lord', cost:34000, desc:'Nearby heroes deal 50% more damage in a bigger area. Nevermore lasts twice as long.', apply:both(aura({dmg:.5, r:170}), abPow(3, .6))},
    ]},
  ]};
TOWERS.raaf.paths.forEach(p => p.ups.forEach((u, i) => {
  if (i < 3) return;
  const f = u.apply; u.paradise = i + 1;
  u.apply = s => { f(s); s.paradise = Math.max(s.paradise || 0, i + 1); };
}));
CATEGORIES.find(c => c.id === 'support').heroes.push('raaf');
TOWERS.raaf.cat = 'support';
TOWER_ORDER.length = 0;
CATEGORIES.forEach(c => c.heroes.forEach(k => TOWER_ORDER.push(k)));
TOWER_ORDER.forEach((k, i) => TOWERS[k].key = HERO_KEYS[i] || '');

HERO_ART.raaf = (ctx, SK) => {
  const black = SK.feathers || '#2b2738', sheen = 'rgba(140,120,220,.45)';
  // tail feathers
  sticker(ctx, () => { ctx.moveTo(-4, 10); ctx.lineTo(-10, 19); ctx.lineTo(0, 15); ctx.lineTo(10, 19); ctx.lineTo(4, 10); ctx.closePath(); }, black, 1.5, 2.5);
  sticker(ctx, () => ctx.ellipse(0, 4, 13, 12, 0, 0, 7), black, 3, 2.5); // body
  // folded wings
  shape(ctx, () => { ctx.moveTo(-12, -1); ctx.quadraticCurveTo(-18, 8, -9, 15); ctx.quadraticCurveTo(-8, 6, -12, -1); }, black, 2);
  shape(ctx, () => { ctx.moveTo(12, -1); ctx.quadraticCurveTo(18, 8, 9, 15); ctx.quadraticCurveTo(8, 6, 12, -1); }, black, 2);
  ctx.fillStyle = sheen; ctx.beginPath(); ctx.ellipse(-4, 2, 4, 6, -.4, 0, 7); ctx.fill();
  sticker(ctx, circ(ctx, 0, -9, 10), black, 3, 2.5); // head
  // ruffled crest
  shape(ctx, () => { ctx.moveTo(-3, -18); ctx.lineTo(-1, -23); ctx.lineTo(1, -18); ctx.lineTo(4, -22); ctx.lineTo(5, -17); }, black, 2);
  // beak
  sticker(ctx, () => { ctx.moveTo(-4, -7); ctx.lineTo(4, -7); ctx.lineTo(0, 2); ctx.closePath(); }, SK.beak || '#4a4558', 1, 2);
  // eyes with a bright glint
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-4.5, -11, 3, 0, 7); ctx.arc(4.5, -11, 3, 0, 7); ctx.fill();
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(-4, -11, 1.7, 0, 7); ctx.arc(5, -11, 1.7, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-3.4, -11.6, .6, 0, 7); ctx.arc(5.6, -11.6, .6, 0, 7); ctx.fill();
};
function featherShape(ctx, len, col) {
  sticker(ctx, () => { ctx.moveTo(-len, 0); ctx.quadraticCurveTo(0, -len * .45, len, 0); ctx.quadraticCurveTo(0, len * .45, -len, 0); }, col, 1, 1.6);
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-len, 0); ctx.lineTo(len, 0); ctx.stroke();
}
HELD_ART.raaf = (ctx, s) => s && s.income ? (sticker(ctx, circ(ctx, 0, 0, 6), PAL.sun, 1.5, 2), ctx.fillStyle = '#c98a00', ctx.fillRect(-1, -3, 2, 6)) : featherShape(ctx, 8, '#4a4558');
PROJ_ART.feather = (ctx, p) => { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.vy, p.vx)); featherShape(ctx, 7 * (p.size || 1), p.src && p.src.s.dmg >= 6 ? '#6b5aa8' : '#2b2738'); ctx.restore(); };

// ---------- Hero voice lines ----------
// place · up (upgrade) · para (tier 4/5) · ability · boss (a boss shows up) · win
const VOICE = { // shown as speech bubbles
  guiseppe: {place:['Fresh fruit, coming up!', 'Ciao! Who ordered fruit?'], up:['Crunchier than ever!', 'Now that\'s a good apple.'], para:['I am the Big Apple now!'], ability:['It\'s raining fruit salad!'], boss:['That one looks rotten to the core.'], win:['Delizioso!']},
  julie: {place:['Agent Julie, on the case.', 'Nobody gets past me.'], up:['New evidence, new gear.', 'Sharper than ever.'], para:['The case of the century!'], ability:['Interpol! Hands where I can see them!'], boss:['Suspect spotted. A big one.'], win:['Case closed.']},
  daniel: {place:['Charges set.', 'Stand back. This gets loud.'], up:['Bigger boom. Nice.', 'More payload.'], para:['Total demolition!'], ability:['Airstrike inbound!'], boss:['Now that needs a lot of explosives.'], win:['Demolition run complete.']},
  otis: {place:['Woof! Otis in orbit!', 'Ready for launch!'], up:['Good boy upgrade!', 'Wag wag!'], para:['To infinity and bark!'], ability:['Awooooo!'], boss:['Grrr. Big bad thing!'], win:['Woof woof! We did it!']},
  nathan: {place:['Batter up!', 'Let\'s play ball.'], up:['Fresh bat, fresh swing.', 'Warming up the arm.'], para:['Hall of fame, baby!'], ability:['Seventh inning stretch, everybody!'], boss:['Big hitter on the mound.'], win:['That\'s a home run!']},
  chemmy: {place:['Welcome to the Hundredaire!', 'Who wants to win a hundred?'], up:['Topspin, activated.', 'A brand new paddle!'], para:['Ping pong legend!'], ability:['Lightning round!'], boss:['Our next contestant looks huge.'], win:['And that\'s the jackpot!']},
  lars: {place:['Dig, dig, dig!', 'There\'s gold in these hills.'], up:['A sharper pick!', 'Stronger beard, stronger swing.'], para:['King under the mountain!'], ability:['Cave in!'], boss:['That rock has legs!'], win:['Drinks are on me!']},
  milo: {place:['Feel the static!', 'Shocking, isn\'t it?'], up:['More volts!', 'A new spell for the book.'], para:['God of thunder!'], ability:['Lightning storm!'], boss:['I\'ll zap that one twice.'], win:['Electrifying!']},
  josh: {place:['Drones online.', 'It\'s launch day!'], up:['New firmware installed.', 'Upgrading the fleet.'], para:['The swarm is ready.'], ability:['Drone strike, go go go!'], boss:['Big target on the radar.'], win:['Mission accomplished.']},
  reshman: {place:['The shadows are ready.', 'Silent. Deadly.'], up:['Sharper stars.', 'Training complete.'], para:['The way of the blob.'], ability:['Shadow clones!'], boss:['A worthy opponent.'], win:['Ninja vanish.']},
  fionn: {place:['Rock and roll!', 'An egg-cellent spot.'], up:['Bigger boulders!', 'Science says yes.'], para:['Continental drift!'], ability:['Earthquake!'], boss:['That\'s a hard egg to crack.'], win:['Egg-cellent work, team!']},
  deniz: {place:['Chill out.', 'Stay frosty.'], up:['Colder. Much colder.', 'More snow in the globe.'], para:['Eternal winter!'], ability:['Big freeze!'], boss:['Let\'s put that one on ice.'], win:['An ice cold victory.']},
  sichen: {place:['Is this thing on?', 'Tough crowd tonight.'], up:['New material!', 'Okay, this one\'s a banger.'], para:['My Netflix special is coming!'], ability:['Time for the roast!'], boss:['Wow, look at the size of this guy!'], win:['Thank you, good night!']},
  anna: {place:['Let\'s get growing.', 'Mind the vines.'], up:['Sharper thorns!', 'Fresh compost.'], para:['Behold, the world tree!'], ability:['Bloom!'], boss:['Feed me that one.'], win:['Everything\'s coming up roses.']},
  ratjetoe: {place:['Wrench ready.', 'I can fix that.'], up:['Tightened a few bolts.', 'Fresh out of the workshop.'], para:['Rocket riveter online!'], ability:['Overclock!'], boss:['That thing needs a permanent repair.'], win:['Good as new.']},
  raaf: {place:['Caw! Raaf is watching.', 'Nevermore. I mean, hello.'], up:['Ooh, shiny!', 'More feathers, more fear.'], para:['Bow to the raven lord!'], ability:['Nevermore!'], boss:['A dark omen.'], win:['Caw caw! Victory!']},
};
const PREFS = {voice: store.get('widrtd_voice') !== 'off', dmg: store.get('widrtd_dmgnums') !== 'off'};
function setPref(k, v) { PREFS[k] = v; store.set({voice: 'widrtd_voice', dmg: 'widrtd_dmgnums'}[k], v ? 'on' : 'off'); }
let sayUntil = 0;
// t = the hero talking, or null to let a hero on the map react (main hero first)
function heroSay(t, kind) {
  if (!PREFS.voice || !G.started) return;
  if (!t) { const pool = G.towers.filter(x => VOICE[x.type]); t = pool.find(x => x.main) || pool[(Math.random() * pool.length) | 0]; }
  if (!t || !VOICE[t.type]) return;
  const big = kind === 'ability' || kind === 'boss' || kind === 'win' || kind === 'para';
  if (!big && (G.t < sayUntil || (kind === 'up' && Math.random() < .5))) return;
  const lines = VOICE[t.type][kind]; if (!lines) return;
  const txt = lines[(Math.random() * lines.length) | 0];
  sayUntil = G.t + 2.5;
  G.fx = G.fx.filter(f => !(f.kind === 'speech' && f.src === t));
  G.fx.push({kind: 'speech', src: t, x: t.x, y: t.y - 40, txt, t: 0, life: 2.6, col: TOWERS[t.type].color});
}
FX_ART.speech = (ctx, f, k) => {
  ctx.globalAlpha = k > .8 ? (1 - k) * 5 : Math.min(1, k * 10);
  const x = f.src ? f.src.x : f.x, y = (f.src ? f.src.y - 40 : f.y) - Math.min(1, k * 8) * 4;
  ctx.font = '800 12px "Arial Rounded MT Bold", Futura, sans-serif';
  const w = Math.min(220, ctx.measureText(f.txt).width + 16), h = 22, bx = Math.max(4, Math.min(W - w - 4, x - w / 2)), by = Math.max(4, y - h);
  sticker(ctx, () => { ctx.roundRect(bx, by, w, h, 10); ctx.moveTo(x - 5, by + h - 1); ctx.lineTo(x, by + h + 7); ctx.lineTo(x + 5, by + h - 1); }, '#fff', 2, 2.5);
  ctx.fillStyle = f.col; ctx.fillRect(bx + 6, by + 5, 3, h - 10);
  ctx.fillStyle = INK; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(f.txt, bx + 12, by + h / 2 + 1, w - 16); ctx.textBaseline = 'alphabetic';
};

// ---------- Damage numbers (hits on each enemy are added up every 0.3s) ----------
function damageNumber(e) {
  if (!PREFS.dmg || G.fx.length > 420) return;
  const n = e.dAcc, txt = n >= 10 ? Math.round(n).toLocaleString() : String(+n.toFixed(1));
  const col = e.dBoss ? PAL.sun : n >= 25 ? PAL.coral : n >= 8 ? '#ffb340' : '#fff';
  G.fx.push({kind: 'text', x: e.x + (Math.random() - .5) * 18, y: e.y - ENEMIES[e.type].r - 4, txt, col, size: Math.min(24, 11 + Math.log2(1 + n) * 1.6), rot: 0, t: 0, life: .7});
}

// ---------- Hero mastery: each hero levels up from what it does in your games ----------
const MASTERY_XP = [0, 150, 400, 800, 1400, 2200, 3300, 4700, 6500, 9000];
const MASTERY_RANK = lv => lv >= 10 ? {name: 'Diamond', col: '#7fe3ff'} : lv >= 7 ? {name: 'Gold', col: '#ffcc29'} : lv >= 4 ? {name: 'Silver', col: '#cdd6e4'} : {name: 'Bronze', col: '#d9925b'};
const mastery = () => (Meta.p.mastery = Meta.p.mastery || {});
const masteryXP = type => mastery()[type] || 0;
const masteryLevel = type => MASTERY_XP.filter(x => masteryXP(type) >= x).length;
// every mastery level knocks 1% off that hero's placement price (9% at level 10)
const masteryDisc = type => (masteryLevel(type) - 1) * .01;
const heroCost = type => Math.round(price(TOWERS[type].cost) * (1 - masteryDisc(type)) / 5) * 5;
function masteryGain(type, n) {
  if (G.mode === 'sandbox' || !n) return;
  const before = masteryLevel(type);
  mastery()[type] = masteryXP(type) + Math.round(n);
  const after = masteryLevel(type);
  if (after > before) notify(`⭐ ${TOWERS[type].name} MASTERY ${after}`, `${MASTERY_RANK(after).name} rank · ${TOWERS[type].name} now costs ${after - 1}% less to place.`);
}
// pops since the last wave + 10 for being on the map
function masteryWave() { for (const t of G.towers) { masteryGain(t.type, (t.pops - (t.mb || 0)) + 10); t.mb = t.pops; } Meta.save(); }
function masteryEnd(won) {
  const seen = new Set();
  for (const t of G.towers) { masteryGain(t.type, (t.pops - (t.mb || 0)) + (seen.has(t.type) ? 0 : won ? 150 : 30)); t.mb = t.pops; seen.add(t.type); }
  Meta.save();
}
const masteryBadge = type => { const lv = masteryLevel(type), r = MASTERY_RANK(lv); return `<span class="mst" style="--m:${r.col}" title="${r.name} mastery ${lv}">★${lv}</span>`; };
