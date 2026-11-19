'use strict';
/* =========================================================
   THE HALL OF LEGENDS · core (every story page)
   · Coach Monfort digs up the VIP All-Star Ticket (after the
     Dreamwalker Badge, or once Evil Adam is beaten)
   · sleep with it on Deniz's cushion → act3.html#legends
   · the data: 15 rival statues × 3 tiers, 4 cups, 4 bindings
   · the shared menu, the binding switches, the Golden Umpire
     outfit and the quest-log entry
   The hall itself lives in zone/legends-hall.js (act3 only).
   Save: Save.data.q.legends = { ticket, met, fame, outfit,
     rivals: { k: { rookie, allstar, grand } }, cups: { key: { done, b, all } }, seen }
   Loaded after zone/benches.js on every story page.
   ========================================================= */
const LG = { on: false, F: null, binds: null, snap: null, gate: null, lastBinds: {} };
const lgQ = () => { const q = Save.data.q, L = q.legends = q.legends || {}; L.rivals = L.rivals || {}; L.cups = L.cups || {}; L.seen = L.seen || {}; return L; };
const lgTicketReady = () => { const D = Save.data, d = D.q.dream; return !!((d && d.badge) || D.evilAdamDead || D.zennithDead); };

const LG_RIVALS = [
  { k: 'server', short: 'The Rogue Server', bar: 'THE ROGUE SERVER · REBOOTED', color: '#ff4a3a', shape: 'server', quote: 'BEEP. GRUDGE.EXE IS RUNNING.' },
  { k: 'adam', short: 'Adam', bar: 'ADAM · THE RIVAL', color: '#3f7a2a', hat: 'band', prop: 'racket', quote: 'A rematch? I was hoping you\'d ask.' },
  { k: 'daniel', short: 'Daniel', bar: 'DANIEL · THE PYROMANIAC', color: '#8a1c3a', hat: 'goggles', prop: 'rocket', quote: 'Fireworks. Indoors. Again.' },
  { k: 'fionn', short: 'Fionn', bar: 'FIONN · THE GEOLOGIST', color: '#7a6a4a', hat: 'helmet', prop: 'pick', quote: 'Did you know marble is just tired limestone?' },
  { k: 'milo', short: 'Milo', bar: 'MILO · THE STORM MAGE', color: '#4a3a8a', hat: 'wizard', prop: 'staff', quote: 'The storm remembers you.' },
  { k: 'deniz', short: 'King Deniz', bar: 'KING DENIZ · THE CROWN', color: '#2a6a8a', hat: 'crown', prop: 'scepter', quote: 'Peace and love. And also: kneel.' },
  { k: 'evil', short: 'Evil Adam', bar: 'EVIL ADAM · THE SHADOW SET', color: '#7a1f6e', hat: 'horns', prop: 'racket', quote: 'Love-forty, MVP.' },
  { k: 'zennith', short: 'Zennith', bar: 'ZENNITH · THE UNFORGIVING', color: '#b98bff', shape: 'giant', prop: 'bat', quote: 'Swing. And miss. Like last time.' },
  { k: 'pyro', base: 'daniel', dream: true, short: 'Pyro-Lord Daniel', color: '#ff6a1a', hat: 'goggles', prop: 'rocket', aura: '255,106,26', quote: 'THE FLOOR IS LAVA. LITERALLY.' },
  { k: 'crystal', base: 'fionn', dream: true, short: 'Crystal Sovereign Fionn', color: '#b388ff', hat: 'helmet', prop: 'pick', aura: '179,136,255', quote: 'No lecture. Only crystals.' },
  { k: 'arch', base: 'milo', dream: true, short: 'Archmage Milo', color: '#6fd3ff', hat: 'wizard', prop: 'staff', aura: '111,211,255', quote: 'Three storms. One of you.' },
  { k: 'emperor', base: 'deniz', dream: true, short: 'Emperor Deniz', color: '#bfefff', hat: 'crown', prop: 'scepter', aura: '191,239,255', quote: 'Mind the floor, little brother. It\'s ice.' },
  { k: 'monfort', isNew: true, short: 'Coach Monfort', bar: 'COACH MONFORT · HUSTLE!', color: '#3f8a4a', hat: 'visor', prop: 'watch', quote: 'Broken stopwatch. Never wrong. HUSTLE!' },
  { k: 'twins', isNew: true, short: 'Pip & Squeak', bar: 'PIP & SQUEAK · THE SHADOW ACROBATS', color: '#9a7a4a', shape: 'twins', quote: 'Two tickets, one show. No refunds.' },
  { k: 'prime', isNew: true, short: 'Prime Adam', bar: 'PRIME ADAM · AT HIS PEAK', color: '#f2c14e', hat: 'band', prop: 'racket', aura: '242,193,78', sp: 1.35, quote: 'No curse. No shadow. Just me, at my best.' },
];
const LG_RIVAL = {}; LG_RIVALS.forEach(r => { LG_RIVAL[r.k] = r; });
const LG_TIERS = {
  rookie:  { name: 'ROOKIE',     medal: 'BRONZE', color: '#d08a4a', hp: 1,   sp: 1,   desc: 'The boss exactly as you met them in the story.' },
  allstar: { name: 'ALL-STAR',   medal: 'SILVER', color: '#c9ccd4', hp: 1.3, sp: 1.2, desc: '+30% HP, faster attacks, and every hit costs you 2 HP.' },
  grand:   { name: 'GRAND SLAM', medal: 'GOLD',   color: '#f2c14e', hp: 1.3, sp: 1.2, desc: 'All-Star speed and toughness, and one hit and you\'re out. Win it for a golden wreath on the statue.' },
};
const LG_TIER_ORDER = ['rookie', 'allstar', 'grand'];
const LG_CUPS = {
  minor:   { key: 'minor',   name: 'THE MINOR LEAGUE CUP', title: 'the Minor League Cup', color: '#d08a4a', list: ['server', 'adam', 'daniel', 'monfort'] },
  major:   { key: 'major',   name: 'THE MAJOR LEAGUE CUP', title: 'the Major League Cup', color: '#c9ccd4', list: ['fionn', 'milo', 'deniz', 'pyro', 'twins'] },
  world:   { key: 'world',   name: 'THE WORLD SERIES CUP', title: 'the World Series Cup', color: '#f2c14e', list: ['crystal', 'arch', 'emperor', 'evil', 'prime'] },
  zennith: { key: 'zennith', name: 'THE ZENNITH ALL-STAR PANTHEON', title: 'the Zennith All-Star Pantheon', color: '#d9b8ff',
    list: ['server', 'adam', 'daniel', 'fionn', 'milo', 'deniz', 'pyro', 'crystal', 'arch', 'emperor', 'monfort', 'twins', 'evil', 'prime', 'zennith'] },
};
const LG_CUP_ORDER = ['minor', 'major', 'world', 'zennith'];
const LG_BINDS = [
  { id: 'wood',    name: 'Wooden Bat',   short: 'WOOD BAT',  desc: 'Your bat hits as softly as it did back in Zone 1.' },
  { id: 'nobadge', name: 'No Badges',    short: 'NO BADGES', desc: 'Every badge on your jersey is switched off.' },
  { id: 'cap',     name: 'Rookie Cap',   short: '4 HP',      desc: 'Your max HP drops to 4.' },
  { id: 'hype',    name: 'Empty Dugout', short: '1 CHARGE',  desc: 'The Hype orb holds a single heal\'s worth.' },
];
// why a statue is still covered ('' = open)
function lgRivalLock(R) {
  const D = Save.data, L = lgQ();
  if (R.k === 'zennith' && !D.zennithDead && !(L.cups.world && L.cups.world.done)) return 'BEAT ZENNITH IN THE SPIRE, OR WIN THE WORLD SERIES CUP';
  if (R.dream && !(typeof dreamQ === 'function' && dreamQ()[R.base])) return 'WIN THIS DREAM AT DENIZ\'S TEA CUSHION FIRST';
  if (R.isNew && !L.seen[R.k]) return 'BEAT THEM IN A TOURNAMENT TO CARVE THIS STATUE';
  return '';
}
function lgCupLock(C) {
  const i = LG_CUP_ORDER.indexOf(C.key), prev = LG_CUP_ORDER[i - 1], c = prev && lgQ().cups[prev];
  return prev && !(c && c.done) ? `WIN ${LG_CUPS[prev].name} FIRST` : '';
}
// the Golden Dugout: one gold shield at each rest stop for every 8 All-Star (or Grand Slam) wins
function lgStarWins() { let n = 0; const R = lgQ().rivals; for (const k in R) n += (R[k].allstar ? 1 : 0) + (R[k].grand ? 1 : 0); return n; }
const lgShields = () => Math.floor(lgStarWins() / 8);

/* ---------- the bindings (No Badges works on every page; the rest in zone/legends-hall.js) ---------- */
const lgBind = id => !!(LG.binds && LG.binds[id]);
const _lgBadgesOn = badgesOn;
badgesOn = function () { return lgBind('nobadge') ? {} : _lgBadgesOn.apply(this, arguments); };
if (typeof Loadout !== 'undefined') {
  const _lgPinned = Loadout.pinned;
  Loadout.pinned = function (id) { return lgBind('nobadge') ? false : _lgPinned.apply(this, arguments); };
}

/* ---------- the menu: one card for statues and gates (same look as the Dream menu) ---------- */
const LgMenu = {
  sel: 0, cfg: null,
  open(cfg) { this.cfg = cfg; this.sel = 0; this.render(); SFX.paper(); openModal('lgMenu'); },
  rows() { return this.cfg ? this.cfg.rows() : []; },
  render() {
    const C = this.cfg; if (!C) return;
    $('#lgEyebrow').textContent = C.eyebrow; $('#lgLine').textContent = C.line || '';
    $('#lgFace').style.background = C.color || '#5a4320';
    const rows = this.rows();
    $('#lgList').innerHTML = rows.map((r, i) => `<button class="item ${i === this.sel ? 'sel' : ''} ${r.done ? 'owned' : ''}" data-i="${i}" ${r.locked ? 'style="opacity:.55"' : ''}><b>${r.title}<span class="tag">${r.tag || ''}</span></b><span class="cost">${r.cost || ''}</span><p>${r.desc || ''}</p></button>`).join('')
      + (C.footer ? `<p class="qreward">${C.footer()}</p>` : '');
    $('#lgHint').innerHTML = C.hint || '<kbd>↑</kbd><kbd>↓</kbd> choose · <kbd>Enter</kbd> pick · <kbd>Esc</kbd> step back';
    $$('#lgList .item').forEach(b => {
      b.addEventListener('mouseenter', () => { this.sel = +b.dataset.i; $$('#lgList .item').forEach((x, j) => x.classList.toggle('sel', j === this.sel)); });
      b.addEventListener('click', () => this.pick(+b.dataset.i));
    });
  },
  move(d) { const n = this.rows().length; if (!n) return; this.sel = (this.sel + d + n) % n; SFX.ui(); this.render(); },
  pick(i) {
    const r = this.rows()[i]; if (!r) return;
    if (r.locked) { SFX.deny(); return; }
    if (r.act() === 'keep') { SFX.ui(); this.render(); }
  },
};
(function buildLgMenu() {
  const el = document.createElement('div'); el.id = 'lgMenu'; el.className = 'overlay';
  el.innerHTML = `<div class="card shop-card quest-card"><header><div class="josh-face" id="lgFace"><svg viewBox="0 0 60 60"><rect x="14" y="18" width="32" height="24" rx="5" fill="#f2c14e" stroke="#0d0b10" stroke-width="3.5"/><path d="M20 27 H28 M32 27 H40" stroke="#0d0b10" stroke-width="3.5"/><path d="M16 36 H44" stroke="#8a6a1a" stroke-width="2"/></svg></div>
    <div><p class="eyebrow" id="lgEyebrow"></p><p class="josh-line" id="lgLine"></p></div></header>
    <div id="lgList"></div><p class="shop-hint" id="lgHint"></p></div>`;
  document.body.appendChild(el);
  el.addEventListener('click', e => { if (e.target === el) closeModal(); });
})();
addEventListener('keydown', e => {
  if (UI.modal !== 'lgMenu' || e.repeat) return;
  const c = e.code;
  if (c === 'ArrowDown' || c === 'KeyS') LgMenu.move(1);
  else if (c === 'ArrowUp' || c === 'KeyW') LgMenu.move(-1);
  else if (c === 'Enter' || c === 'Space' || c === 'KeyJ') LgMenu.pick(LgMenu.sel);
  else return;
  e.preventDefault(); e.stopImmediatePropagation();
}, true);
const _lgPoll = Input.pollPad;
Input.pollPad = function () {
  _lgPoll.call(this);
  if (UI.modal !== 'lgMenu') return;
  const B = this.buffered;
  if (B.has('down')) LgMenu.move(1); if (B.has('up')) LgMenu.move(-1);
  if (B.has('jump') || B.has('attack')) LgMenu.pick(LgMenu.sel);
  for (const a of ['down', 'up', 'jump', 'attack', 'map']) B.delete(a);
};

/* ---------- Story colours ---------- */
if (Story.tagColors) { Story.tagColors.UMPIRE = '#c9a33a'; Story.tagColors['OLDER NATHAN'] = '#e8361c'; }

/* =========================================================
   BASE CAMP: the ticket, and sleeping with it
   ========================================================= */
const _lgVance = Story.vanceTalk;
Story.vanceTalk = function (n) {
  const L = lgQ();
  if (PAGE.id !== 'z1' || L.ticket || !lgTicketReady()) return _lgVance.apply(this, arguments);
  return this.run(async () => {
    const h = () => n.head(), nh = () => this.nathanHead();
    Player.facing = sgn(n.x - Player.x) || 1; this.camTarget = { x: (Player.x + n.x) / 2, y: n.y - 70 }; this.zoomTo(1.3);
    await this.say('MONFORT', 'NATHAN! Over here. Look what I dug out from under home plate at the Gilded Stadium.', h, VANCE_V);
    this.punch(0.08, 6); SFX.chime();
    await this.say('MONFORT', 'VIP All-Star Ticket. Real gold foil. "ADMIT ONE · THE HALL OF LEGENDS."', h, VANCE_V);
    await this.say('NATHAN', 'Never heard of it.', nh);
    await this.say('MONFORT', 'Neither have I, and I\'ve scouted every stadium there is. Every sport. Probably.', h, VANCE_V);
    await this.say('NATHAN', 'It\'s warm. Like it\'s… humming.', nh);
    await this.say('MONFORT', 'Old scout trick: sleep with a ticket under your pillow and you dream of the big leagues. Try Deniz\'s cushion. HUSTLE!', h, VANCE_V);
    L.ticket = 1; saveGame();
    showCard('COACH MONFORT', 'VIP ALL-STAR TICKET', 'An ancient golden ticket from under home plate. Fall asleep with it on Deniz\'s tea cushion at Base Camp to wake up in the Hall of Legends.', ['rest on the cushion · "Sleep with the ticket"']);
  });
};
// a nudge, once per visit, when Monfort has something for you
if (PAGE.id === 'z1') Gaunt.add({ id: 'lgcamp', page: 'z1', enter(r) {
  if (r.id === 'hub' && lgTicketReady() && !lgQ().ticket && !LG.hinted) { LG.hinted = true; setTimeout(() => toast('COACH MONFORT DUG SOMETHING UP · GO SAY HI'), 1400); }
} });
// one more row on the cushion's menu
if (typeof Dream !== 'undefined') {
  const _lgRows = Dream.rows;
  Dream.rows = function () { const L = _lgRows.call(this); if (lgQ().ticket) L.push({ kind: 'legends' }); return L; };
  Dream.render = function () {
    const rows = this.rows();
    $('#dreamList').innerHTML = rows.map((r, i) => r.kind === 'legends'
      ? `<button class="item ${i === this.sel ? 'sel' : ''}" data-i="${i}"><b>Sleep with the VIP All-Star Ticket<span class="tag">HALL OF LEGENDS</span></b><span class="cost">SLEEP</span><p>Wake up in a marble stadium above the clouds. Nothing you lose there is real.</p></button>`
      : r.kind === 'turnin'
      ? `<button class="item ${i === this.sel ? 'sel' : ''}" data-i="${i}"><b>Hand over the 4 Astral Essences<span class="tag">DENIZ</span></b><span class="cost">✦✦✦✦</span><p>Deniz brews them into the Dreamwalker Badge.</p></button>`
      : `<button class="item ${i === this.sel ? 'sel' : ''} ${r.done ? 'owned' : ''}" data-i="${i}"><b>${r.d.short}<span class="tag">${r.done ? 'ESSENCE ✦' : 'DREAM'}</span></b><span class="cost">${r.done ? 'REMATCH' : 'DRINK'}</span><p>${r.d.twist}</p></button>`).join('')
      + `<p class="qreward">Astral Essences: ${essences()} / ${DREAMS.length}${dreamQ().badge ? ' · Dreamwalker Badge earned' : ''}</p>`;
    $$('#dreamList .item').forEach(b => {
      b.addEventListener('mouseenter', () => { this.sel = +b.dataset.i; $$('#dreamList .item').forEach((x, j) => x.classList.toggle('sel', j === this.sel)); });
      b.addEventListener('click', () => this.pick(+b.dataset.i));
    });
  };
  const _lgPick = Dream.pick;
  Dream.pick = function (i) {
    const r = this.rows()[i];
    if (!r || r.kind !== 'legends') return _lgPick.apply(this, arguments);
    closeModal(); SFX.blorp(); Game.flashWhite = 0.3;
    const q = Save.data.q; q.legendsPrev = !!(q.pages && q.pages['act3.html']); saveGame();
    toast('YOU TUCK THE VIP TICKET UNDER YOUR PILLOW… AND DRIFT OFF');
    setTimeout(() => goToPage('act3.html#legends'), 700);
  };
}

/* =========================================================
   THE GOLDEN UMPIRE outfit (win all four cups)
   ========================================================= */
if (typeof OUTFITS !== 'undefined' && !OUTFITS.some(o => o.id === 'umpire')) {
  OUTFITS.push({ id: 'umpire', name: 'The Golden Umpire', from: 'Win all four cups in the Hall of Legends',
    desc: 'A crisp black-and-white striped umpire\'s uniform with a glowing gold half-mask. Your bat becomes a gleaming golden flagpole.',
    have: D => !!(D.q.legends && D.q.legends.outfit),
    look: { shirt: '#f3ead8', stripe: '#0d0b10', sleeve: '#0d0b10', cap: '#0d0b10', pants: '#1a1420', pants2: '#120e18', num: '#f2c14e' } });
  OUTFIT_HEAD.umpire = function (P, hy) {
    ctx.save(); ctx.shadowColor = GOLD; ctx.shadowBlur = 8;
    rr(0, hy - 3.5, 15, 6, 2.5); inked(GOLD, 1.5); ctx.restore();
    ctx.fillStyle = INK; ctx.fillRect(3, hy - 1.5, 3.5, 1.8); ctx.fillRect(9, hy - 1.5, 3.5, 1.8);
    ctx.fillStyle = GOLD; ctx.fillRect(-4, hy - 12, 12, 2);   // a gold band on the cap
  };
  OUTFIT_BAT.umpire = function () {
    ctx.save(); ctx.shadowColor = GOLD; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.moveTo(-3, -1.8); ctx.lineTo(36, -1.8); ctx.lineTo(36, 1.8); ctx.lineTo(-3, 1.8); ctx.closePath(); inked(GOLD, 2);
    ctx.beginPath(); ctx.arc(37.5, 0, 3, 0, 7); inked('#fff3c0', 1.5); ctx.restore();
    const flap = Math.sin(Game.time * 9) * 2;
    ctx.beginPath(); ctx.moveTo(31, -2); ctx.lineTo(19, -15 + flap); ctx.lineTo(31, -13); ctx.closePath(); inked('#f3ead8', 1.5);
    ctx.fillStyle = INK; ctx.fillRect(25, -11 + flap * 0.4, 3, 3);
    ctx.fillStyle = INK; ctx.fillRect(-4, -3, 4, 6); return true;
  };
  try { applyOutfit(); } catch (e) { logErr('legends: outfit', e); }
}

/* ---------- the quest log ---------- */
if (typeof Quests !== 'undefined' && Quests.entries) {
  const _lgEntries = Quests.entries;
  Quests.entries = function () {
    const L = _lgEntries.call(this), Q = lgQ();
    if (!Q.ticket) return L;
    const tick = (txt, ok) => ({ txt, ok: !!ok }), cups = LG_CUP_ORDER.filter(k => Q.cups[k] && Q.cups[k].done).length;
    L.push({ title: 'The Hall of Legends', who: 'The Umpire', done: !!Q.outfit, reward: 'The Golden Umpire outfit, and the truth about the Umpire',
      steps: [tick('Sleep with the VIP All-Star Ticket on Deniz\'s cushion', Q.met)].concat(LG_CUP_ORDER.map(k => tick('Win ' + LG_CUPS[k].title, Q.cups[k] && Q.cups[k].done)),
        [tick(`All-Star and Grand Slam wins: ${lgStarWins()} / 30`, lgStarWins() >= 30), tick(`Cups won: ${cups} / 4`, cups >= 4)]) });
    return L;
  };
}
