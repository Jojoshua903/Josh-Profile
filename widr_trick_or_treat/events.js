'use strict';
/* ---------- generic doorstep events ---------- */
const JOKES = [
  {t:'ghost', s:'What do ghosts eat for dinner? Spook-etti!'},
  {t:'knock', s:'Knock knock. Who’s there? Boo. Boo who? Don’t cry, it’s only Halloween!'},
  {t:'skeleton', s:'Why didn’t the skeleton go to the party? He had no BODY to go with.'},
];
const JOKE_NAMES = {ghost:'ghost puns', knock:'knock-knock jokes', skeleton:'skeleton jokes'};

const DOOR_EVENTS = {
  normal: {w: 5, icon: '🍬', async run(h) {
    await scene(h.host, pick(['Happy Halloween! Love the costume!', 'Ooh, scary! Here you go.', 'Take a few, sweetie!', 'Trick or treat? Treat, obviously.', 'Oh my, a real ' + S.costume.n.toLowerCase() + '! Help yourself.']), ['Thank you!']);
    give(ri(4, 7), 'std', h.host.name);
  }},
  fullsize: {w: 1.2, icon: '🌟', async run(h) {
    await scene(h.host, 'We do FULL-SIZE bars at this house. Don’t tell the neighbours.', ['WHAT. Thank you!!']);
    giveType('full', 2, h.host.name); ach('fullsize');
  }},
  raisins: {w: 1, icon: '🍇', async run(h) {
    await scene(h.host, 'Healthy is the new candy! Have some lovely raisins.', ['…thanks.']);
    giveType('raisin', 3, h.host.name); ach('raisin');
  }},
  dentist: {w: 0.7, icon: '🪥', async run(h) {
    await scene(Object.assign({}, h.host, {title: 'THE DENTIST'}), 'I’m a dentist! Here’s a toothbrush. You’ll thank me in twenty years.', ['Wow. Great. Thanks.']);
    toast('🪥 A toothbrush. Zero points. Maximum dental health.', 'weird'); ach('dentist');
  }},
  bowl: {w: 1.3, icon: '🥣', async run(h) {
    const c = await scene(Object.assign({}, h.host, {title: 'NOBODY HOME?'}), 'Nobody answers. There’s a bowl on the porch with a sign: <b>PLEASE TAKE ONE 🙏</b>', ['Take one', 'Grab a big handful']);
    if (c === 0) { giveType('choc', 1, 'the honesty bowl'); S.karma++; toast('Honest! +1 kindness', 'good'); return; }
    if (roll(4, 6.5)) { give(9, 'std', 'the honesty bowl'); S.karma--; return; }
    const j = RESIDENTS.find(r => r.id === 'julie');
    await scene(j, 'A doorbell camera blinks red. Julie steps out of the bushes. “Caught you. Put it back. And a bit more for the trouble.”', ['Sorry, Julie…']);
    takeCandy(5); addScare(10); S.karma--;
  }},
  jumpscare: {w: 1.3, icon: '😱', async run(h) {
    await scene(Object.assign({}, h.host, {name: '???', title: 'THE DOOR CREAKS OPEN'}), 'The door creaks open… nobody’s there… just a dark hallway…', ['Hello…?']);
    sfx('scare'); addScare(22, 'jump');
    await scene(h.host, 'BLAAARGH! 🧟 Hahaha, got you! Here, that’s for being brave.', ['My heart…']);
    give(6, 'std', h.host.name);
  }},
  dog: {w: 1, icon: '🐕', async run(h) {
    const c = await scene(Object.assign({}, h.host, {title: 'AND THEIR VERY LARGE DOG'}), 'WOOF WOOF! A huge dog bounds out of the door, straight at you!', ['Stay calm and let it sniff you', 'RUN!']);
    if (c === 0 && roll(1, 6)) { toast('🐕 The dog licks your hand. The owner is impressed.', 'good'); give(6, 'cookie', h.host.name); return; }
    if (c === 0) { addScare(15); dropCandy(3); return; }
    dropCandy(3); addScare(5);
  }},
  contest: {w: 1, icon: '🏆', async run(h) {
    const want = pick(['spooky', 'cute', 'dramatic']);
    const c = await scene(Object.assign({}, h.host, {title: 'COSTUME JUDGE'}), `We’re judging costumes tonight! Strike a pose. (Psst, the judge has a soft spot for <b>${want}</b>.)`, ['Spooky pose 👹', 'Cute pose 🥺', 'Dramatic pose 🎭']);
    const match = ['spooky', 'cute', 'dramatic'][c] === want;
    if (match || roll(2, 7)) { toast('🏆 WINNER! Best ' + S.costume.n.toLowerCase() + ' on the street.', 'good'); give(12, 'lolly', h.host.name); }
    else { toast('🏆 Honourable mention.', ''); give(3, 'lolly', h.host.name); }
  }},
  joke: {w: 1, icon: '😂', async run(h) {
    const t = pick(JOKES).t;
    const js = shuffle(JOKES);
    const c = await scene(h.host, `Tell me a joke first! I only laugh at <b>${JOKE_NAMES[t]}</b>.`, js.map(j => j.s));
    if (js[c].t === t) { toast('😂 They laugh so hard they snort.', 'good'); give(9, 'std', h.host.name); }
    else { toast('😐 Silence. A cricket chirps.', ''); give(2, 'sweet', h.host.name); }
  }},
  oldies: {w: 1, icon: '☕', async run(h) {
    const c = await scene(Object.assign({}, h.host, {title: 'LOVES A CHAT'}), 'Come in, come in! Have I told you about Halloween in 1974? It all started with a turnip…', ['Listen to the whole story (+10 min)', 'Politely say goodbye']);
    if (c === 0) { S.min += 10; S.karma++; give(10, 'cookie', h.host.name); toast('☕ Lovely story. Very long. Fresh cookies though! +1 kindness', 'good'); }
    else give(3, 'cookie', h.host.name);
  }},
  smashed: {w: 0.7, icon: '🎃', async run(h) {
    const c = await scene(h.host, 'Someone smashed our jack-o’-lantern… 😢 The little one inside is so sad.', ['Help carve a new one (+5 min)', 'Sorry, gotta go']);
    if (c === 0) { S.min += 5; S.karma += 2; give(6, 'std', h.host.name); toast('🎃 New pumpkin! +2 kindness', 'good'); }
  }},
  later: {w: 0.8, icon: '🕗', async run(h) {
    if (S.min < 120) { toast('🕗 Sign on the door: “BACK AT 20:00 · SPECIAL TREATS”. Come back later!', 'news'); h.done = false; h.timeless = true; return; }
    await scene(h.host, 'Told you! Special treats for anyone who came back.', ['Worth the wait!']);
    give(10, 'choc', h.host.name); giveType('full', 1, h.host.name);
  }},
  glow: {w: 0.8, icon: '🔦', async run(h) {
    await scene(h.host, 'We’re handing out glow gear instead of candy this year! Safety first.', ['Ooh, useful']);
    addItem(pick(['flash', 'skates', 'magnet', 'field'])); give(2, 'sweet', h.host.name);
  }},
  trade: {w: 0.6, icon: '🔄', async run(h) {
    const bad = (S.bag.raisin || 0) + (S.bag.apple || 0);
    if (!bad) { await scene(h.host, 'Candy swap house! Got any raisins or apples to swap? No? Have some sweets anyway.', ['Thanks!']); give(4, 'sweet', h.host.name); return; }
    const c = await scene(h.host, `Candy swap house! I’ll swap your ${bad} raisins and apples for chocolate.`, ['Deal!', 'I like my raisins']);
    if (c === 0) { S.bag.raisin = 0; S.bag.apple = 0; giveType('choc', bad, h.host.name); }
  }},
  party: {w: 0.8, icon: '🎉', async run(h) {
    await scene(Object.assign({}, h.host, {title: 'PARTY HOUSE'}), 'PARTY HOUSE! 🎉 Everyone’s in costume and the music is loud. Grab stuff on your way out!', ['Party!']);
    give(7, 'std', h.host.name); addItem(pick(Object.keys(ITEMS)));
  }},
  doorbell: {w: 0.7, icon: '💀', async run(h) {
    sfx('scare'); addScare(12, 'jump');
    await scene(Object.assign({}, h.host, {title: 'AND THEIR ANIMATRONIC SKELETON'}), 'You press the doorbell and a life-size skeleton SCREAMS and lurches at you. Then the owner walks out, laughing.', ['Not funny.']);
    give(5, 'std', h.host.name);
  }},
  teen: {w: 0.7, icon: '🙄', async run(h) {
    const c = await scene(Object.assign({}, h.host, {name: 'A teenager', title: 'ANSWERING THE DOOR'}), 'Aren’t you a bit old for this?', ['Never too old!', '*stares in ' + S.costume.n.toLowerCase() + '*']);
    if (roll(c === 0 ? 2 : 1, 5.5)) { toast('🙄 “Fair enough.” They hand over a fistful.', 'good'); give(6, 'std', 'a teenager'); }
    else { toast('🙄 One sweet. A single sweet.', ''); give(1, 'sweet', 'a teenager'); }
  }},
  mystery: {w: 0.8, icon: '🎁', async run(h) {
    await scene(h.host, 'There’s a box on the porch: <b>TAKE A MYSTERY</b>.', ['Open it…']);
    const r = Math.random() + (st(4) - 3) * 0.06;
    if (r > 0.65) { toast('🎁 JACKPOT!', 'good'); give(15, 'choc', 'a mystery box'); }
    else if (r > 0.4) addItem(pick(Object.keys(ITEMS)));
    else if (r > 0.2) { toast('🕷️ A spring-loaded spider!', 'bad'); sfx('scare'); addScare(15, 'jump'); }
    else giveType('raisin', 1, 'a mystery box');
  }},
  apple: {w: 0.6, icon: '🍎', async run(h) {
    if (hero.id === 'guiseppe') {
      await scene(h.host, 'Fresh apples from the orchard! Here you g— oh. Oh no. Is that… your cousin?', ['THAT’S-A MY COUSIN!']);
      toast('🍎 They feel terrible and hand over chocolate instead.', 'good'); give(9, 'choc', h.host.name); return;
    }
    await scene(h.host, 'Fresh apples from the orchard! Much better than candy.', ['Debatable. Thanks!']);
    giveType('apple', 2, h.host.name);
  }},
};

/* ---------- residents ---------- */
const GAME_OPTS = { kayoyara: {what: 'EGGS', sym: '🥚', loseMsg: 'EGGED!'} };
const RES_MIX = { chemmy: 'choc', ati: 'cookie', lyra: 'lolly', isa: 'lolly', ratjetoe: 'std', brothers: 'choc', yassin: 'choc', daniel: 'choc' };

async function residentVisit(h) {
  const r = h.res;
  if (r.id === 'gianmarco') { await scene(r, r.intro, ['Grazie!']); give(12, 'choc', r.name); S.karma++; return; }
  if (r.id === 'guiseppe') return guiseppeGamble(r);
  const c = await scene(r, r.intro, ['Let’s do it!', 'Skip it, just a treat please']);
  if (c === 1) { await scene(r, r.id === 'ati' ? 'Hmph. Fine. ONE.' : 'Boring! Here you go.', ['Thanks']); give(2, 'sweet', r.name); return; }
  const res = await challenge(r, r.game, GAME_OPTS[r.id] || {});
  if (r.game === 'ladder') {
    if (res.win) { give(res.candy, 'choc', r.name); if (res.top) ach('hundred'); }
    else toast('🎤 Chemmy: “Oooh, so close! You leave with… nothing!”', 'bad', r);
    return;
  }
  if (r.game === 'catch') { give(Math.max(1, res.score || 0), 'std', r.name); return; }
  if (res.win) {
    give(r.reward, RES_MIX[r.id] || 'std', r.name);
    if (r.id === 'ati') { ach('ati'); toast('🩴 Ati nods. Barely. That counts.', 'good', r); }
    if (r.id === 'brothers') ach('rhythm');
    if (r.id === 'julie') { ach('detective'); toast('🔍 Julie: “Good eye. I could use you on the force.”', 'good', r); }
  } else {
    if (r.loseScare) addScare(r.loseScare);
    if (r.id === 'ati') toast('🩴 THWACK! Ati’s slipper always finds its target.', 'bad', r);
    else if (r.id === 'daniel') toast('💥 Confetti bomb! You’re glittery for life.', 'bad', r);
    else if (r.id === 'kayoyara') toast('🥚 Kayo & Yara cackle as you drip yolk.', 'bad', r);
    give(1, 'sweet', r.name);
  }
}

async function guiseppeGamble(r) {
  const c = await scene(r, r.intro + '<br><br>One apple is <b>golden</b> (×3), one is normal (×1) and one has a <b>worm</b> (×0).', ['Take the safe 8', 'Left apple 🍎', 'Middle apple 🍎', 'Right apple 🍎']);
  if (c === 0) { give(8, 'std', r.name); return; }
  const out = shuffle(['gold', 'norm', 'worm'])[c - 1];
  if (out === 'gold') { toast('🍏✨ GOLDEN APPLE! “It’s-a jackpot!”', 'good', r); give(24, 'choc', r.name); }
  else if (out === 'norm') give(8, 'std', r.name);
  else { toast('🪱 A worm pops out… it winks at you. Is that… Dih?', 'bad', r); }
}

async function hauntedHouse(h) {
  const c = await scene(GOONPOSTER, 'Welcome to my HAUNTED HOUSE. Three rooms, each scarier than the last. Make it through and my treasure chest is yours. Chicken out whenever you like… 👻', ['Enter… 😬', 'Nope. Nope nope nope.']);
  if (c) { h.done = false; h.timeless = true; return; }
  const stages = [
    ['dodge', {what: 'BATS', sym: '🦇', bg: '#efe6ff', loseMsg: 'BATTED!'}, 'Room 1 · The Bat Attic'],
    ['simon', {symbols: ['🕯️', '💀', '🕷️', '🪦'], rounds: [5, 6]}, 'Room 2 · The Séance'],
    ['riddle', {}, 'Room 3 · The Riddle Crypt'],
  ];
  let bank = 0;
  for (let i = 0; i < stages.length; i++) {
    const [g, o, name] = stages[i];
    addScare(8);
    const res = await challenge(Object.assign({}, GOONPOSTER, {title: name.toUpperCase()}), g, o);
    if (!res.win) { addScare(22); toast(`👻 Goonposter chases you out of ${name.split('· ')[1]}!` + (bank ? ` You keep 🍬${bank}.` : ''), 'bad', GOONPOSTER); if (bank) give(bank, 'std', 'the haunted house'); return; }
    bank += 15;
    if (i < stages.length - 1) {
      const k = await scene(GOONPOSTER, `You survived ${name.split('· ')[1]}. 🍬${bank} in the bank. Deeper?`, ['Deeper…', 'Take the candy and RUN']);
      if (k) { give(bank, 'std', 'the haunted house'); return; }
    }
  }
  give(bank + 20, 'choc', 'Goonposter'); giveType('full', 1, 'Goonposter'); ach('haunted');
  toast('👻 GOONBUSTER! The treasure chest was full of chocolate.', 'good', GOONPOSTER);
}

/* ---------- friends wandering the street ---------- */
const ENCOUNTERS = {
  robin: async f => {
    const c = await scene(f, '*sniff* I tripped and my candy fell in a puddle… 😭', [{label: 'Give him 5 candy', disabled: bagCount() < 5}, 'Give him a hug', 'Walk on']);
    if (c === 0) { takeCandy(5, true); S.karma += 2; S.shield++; toast('Robin cheers up so hard he glows. He’ll protect you once. (+1 shield, +2 kindness)', 'good', f); }
    else if (c === 1) { S.karma++; toast('Robin hugs back. Very, very hard. +1 kindness', 'good', f); }
  },
  thomas: async f => {
    const h = rumorHouse();
    await scene(f, h ? 'Psst. I just rolled past a house giving out FULL-SIZE bars. I’ll mark it on your map. 🌟' : 'I rolled the whole street already. Nothing left to tell you! Have a mint.', ['Thanks, Thomas!']);
    if (!h) give(2, 'sweet', 'Thomas');
  },
  niek: async f => {
    const c = await scene(f, 'Page 212 of the Scout Manual: Halloween Preparedness. I packed spares! Pick one.', ['🔦 Flashlight (halves fright)', '🛡️ Force field (+1 shield)', '🗺️ Street map']);
    addItem(['flash', 'field', 'map'][c]);
  },
  dih: async f => {
    const c = await scene(f, 'Hehe. Got any gummy worms? Asking for… a friend. 😉', [{label: 'Give him 2 candy', disabled: bagCount() < 2}, 'Sorry, Dih']);
    if (c === 0) { takeCandy(2, true); S.bonus[4]++; S.karma++; toast('🪱 Dih winks. You feel luckier. (+1 luck)', 'good', f); }
    else toast('🪱 Dih winks anyway.', '', f);
  },
  casper: async f => {
    await scene(f, 'Hold still. Your sneakers are badly tuned. Tyre pressure, alignment… there. Way faster.', ['Vroom!']);
    S.bonus[0]++; toast('🔧 Casper tuned your shoes. +1 speed for the night.', 'good', f);
  },
  lars: async f => {
    await scene(f, 'That bag? Pathetic. Here. A proper miner’s sack.', ['It’s enormous']);
    S.cap += 25; toast('⛏️ Bag size +25', 'good', f); updHUD();
  },
  renas: async f => {
    await scene(f, 'Want to test one of my inventions? It’s mostly safe!', ['Mostly?']);
    addItem(pick(Object.keys(ITEMS)));
  },
  ash: async f => {
    const c = await scene(f, 'Bet you can’t hit my fastball! Three pitches. Hit two and I’ll give you my chocolate.', ['You’re on!', 'Maybe later']);
    if (c) return;
    const r = await challenge(f, 'timing', {sym: '⚾', verb: 'SWING!', good: 'HIT!', bad: 'STRIKE!'});
    if (r.win) give(8, 'choc', 'Ash');
  },
  nathan: async f => {
    const c = await scene(f, 'Home Run Derby, right here on the street. Hit two out of three and I’ll split my haul.', ['Batter up!', 'No thanks']);
    if (c) return;
    const r = await challenge(f, 'timing', {sym: '⚾', verb: 'SWING!', good: 'HOME RUN!', bad: 'MISS!'});
    if (r.win) give(9, 'std', 'Nathan');
  },
  dean: async f => {
    const c = await scene(f, 'Dance-off. Right now. Winner takes candy.', ['Let’s dance', 'I don’t dance']);
    if (c) return;
    const r = await challenge(f, 'rhythm', {short: true});
    if (r.win) give(10, 'lolly', 'Dean');
  },
  adam: async f => {
    await scene(f, 'Anyone throws anything at you tonight, I’ll smash it right back. Here’s my spare racket.', ['Thanks, Adam!']);
    S.shield += 2; toast('🎾 +2 shield', 'good', f); updHUD();
  },
  fionn: async f => {
    await scene(f, 'Did ye know jack-o’-lanterns started in Ireland? Carved turnips! Here, take my lucky rock. It’s gneiss.', ['…was that a rock pun?']);
    S.bonus[4]++; toast('🪨 Lucky rock: +1 luck', 'good', f);
  },
  milo: async f => {
    await scene(f, 'Feel that static? Here, borrow a bit of lightning. ⚡', ['Bzzzt!']);
    S.boostUntil = performance.now() + 20000; toast('⚡ 20s speed boost', 'good', f);
  },
  deniz: async f => {
    await scene(f, 'Things look scary out here. Let me cool everything down. ❄️', ['Brrr, thanks']);
    freezeAll(20000); addScare(-20); toast('❄️ Pests frozen, fright down', 'good', f);
  },
  josh: async f => {
    await scene(f, 'Launching drone. Scanning every porch on the street… done. Check your map.', ['Nice tech!']);
    S.revealUntil = performance.now() + 45000; toast('🛸 Houses revealed for 45s', 'good', f);
  },
  thomasFallback: null,
};

/* ---------- strange visitors ---------- */
async function reshmanTrade() {
  const c = await scene(RESHMAN, 'A small, faceless shadow appears out of nowhere. It says nothing. It holds out a mystery box… and points at your bag. <b>(6 candy)</b>', [{label: 'Trade 6 candy', disabled: bagCount() < 6}, 'Back away slowly']);
  if (c) { toast('🥷 The shadow melts into the dark.', 'weird', RESHMAN); return; }
  takeCandy(6, true); ach('shadow');
  const r = Math.random() + (st(4) - 3) * 0.05;
  if (r > 0.45) { toast('🥷 The box is FULL of chocolate.', 'good', RESHMAN); give(20, 'choc', 'Reshman'); }
  else if (r > 0.15) { addItem(pick(Object.keys(ITEMS))); give(5, 'std', 'Reshman'); }
  else { giveType('raisin', 1, 'Reshman'); toast('🥷 One raisin. The shadow is gone.', 'bad', RESHMAN); }
}

async function ufoEncounter() {
  const c = await scene(TOON, 'BLEEP. I am Toon. I came to Earth to steal ALL the candy in the neighbourhood. Unless… you beat me in a rhythm battle. Nobody beats me.', ['Bring it on, alien', 'Not tonight']);
  if (c) return;
  const res = await challenge(TOON, 'rhythm', {boss: true});
  S.ufo = null;
  if (res.win) { give(30, 'choc', 'Toon'); giveType('full', 1, 'Toon'); ach('toon'); toast('👽 Toon flies off, defeated. Candy rains from the UFO!', 'good', TOON); }
  else { addScare(18); takeCandy(6); toast('👽 Toon beams up 6 of your candies. BLEEP BLOOP.', 'bad', TOON); }
}

async function homeVisit() {
  const me = Object.assign({}, hero, {name: 'Home sweet home', title: 'YOUR HOUSE · STASH'});
  const late = S.min >= 165;
  const c = await scene(me, `Stash: <b>${countOf(S.stash)}</b> pieces · Bag: <b>${bagCount()}/${S.cap}</b>.<br>Candy in the stash is safe from foxes, aliens and frights.${late ? '<br><br>📞 It’s nearly nine. Ati will check.' : ''}`, ['Stash my bag', 'End the night here', 'Head back out']);
  if (c === 0) stashBag();
  if (c === 1) { stashBag(); endNight('home'); }
}

/* ---------- night-wide events ---------- */
const NIGHT_EVENTS = [
  {at: [18, 35], fn: () => { spawnHazard('fox'); news(ANKER, 'Anker Vos is loose on the street! He yaps, he cheats, and he steals candy. Keep moving!'); }},
  {at: [30, 60], fn: () => { spawnHazard('meta'); news(META, 'Meta AI has entered the chat. Nobody asked it to. Avoid it.'); }},
  {at: [45, 70], fn: () => { S.stormUntil = S.min + 20; news(MILO_NPC, 'Milo is practising his storm spells. Thunderstorm! Slower walking, but neighbours give extra out of pity.'); }},
  {at: [40, 95], fn: () => { S.byteUntil = performance.now() + 40000; S.byte = {x: P.x - 30, y: P.y}; news(BYTE, 'Byte the robot sidekick is following you! He grabs street candy for 40s. BEEP.'); }},
  {at: [60, 85], fn: () => { S.rushUntil = S.min + 12; news({name: 'CANDY RUSH', title: '', color: '#ffc21f', kind: 'round'}, 'CANDY RUSH! Every door gives DOUBLE for the next 12 minutes!'); }},
  {at: [70, 100], fn: () => { spawnHazard('reshman'); news(RESHMAN, 'A strange shadow was seen near you. It wants to trade.'); }},
  {at: [90, 92], fn: () => { S.ufo = {x: 1500, y: 425}; news(TOON, 'A UFO has landed in the park on the east side! Toon wants a rhythm battle.'); }},
  {at: [100, 125], fn: () => { const h = rumorHouse(); if (h) news({name: 'RUMOUR', title: '', color: '#ffc21f', kind: 'round'}, 'Rumour going round: one house is handing out FULL-SIZE bars. It’s marked with a 🌟.'); }},
  {at: [118, 135], fn: () => { S.darkUntil = S.min + 16; spawnHazard('zennith'); news(ZENNITH, 'The street lights flicker out. Zennith, the Living Dark, is here. Don’t let it touch you.'); }},
  {at: [130, 150], fn: () => { spawnHazard('fox', true); news(ANKER, 'Anker Vos is BACK and even more annoying. HAHAHAHA!'); }},
  {at: [145, 160], fn: () => { spawnHazard('meta'); news(META, 'Meta AI has some more suggestions for you. Run.'); }},
  {at: [160, 161], fn: () => { news(RESIDENTS.find(r => r.id === 'ati'), '📞 Phone call from Ati: “Be home by 21:00. I am not asking.” Not home = she takes 25% of your bag.'); }},
];
