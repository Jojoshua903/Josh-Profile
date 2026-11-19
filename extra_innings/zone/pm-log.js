'use strict';
/* =========================================================
   PAUSE MENU · tabs 4 & 5: the Logbook (Dugout Roster +
   Scouting Report) and the Trophy Case
   Loaded after zone/pm-gear.js.
   ========================================================= */
const CREW_FACES = {
  fionn: ['#5a6a3a', '<svg viewBox="0 0 60 60"><circle cx="30" cy="33" r="17" fill="#f0cfa8" stroke="#0d0b10" stroke-width="4"/><path d="M12 28 Q12 10 30 10 Q48 10 48 28 Z" fill="#5aa03a" stroke="#0d0b10" stroke-width="4" stroke-linejoin="round"/><circle cx="30" cy="9" r="4" fill="#9be36a" stroke="#0d0b10" stroke-width="2.5"/><circle cx="23" cy="33" r="5" fill="#fff" stroke="#0d0b10" stroke-width="2.5"/><circle cx="37" cy="33" r="5" fill="#fff" stroke="#0d0b10" stroke-width="2.5"/><path d="M28 33 L32 33" stroke="#0d0b10" stroke-width="2"/><circle cx="23" cy="33" r="1.6" fill="#0d0b10"/><circle cx="37" cy="33" r="1.6" fill="#0d0b10"/><path d="M24 43 Q30 47 36 43" fill="none" stroke="#0d0b10" stroke-width="3" stroke-linecap="round"/></svg>'],
  milo: ['#3a4a8a', '<svg viewBox="0 0 60 60"><circle cx="30" cy="35" r="16" fill="#f3ead8" stroke="#0d0b10" stroke-width="4"/><path d="M10 34 L30 2 L50 34 Q40 26 30 27 Q20 26 10 34 Z" fill="#4a5ac8" stroke="#0d0b10" stroke-width="4" stroke-linejoin="round"/><path d="M33 8 L27 18 L33 18 L27 28" fill="none" stroke="#f2e04e" stroke-width="3" stroke-linejoin="round"/><path d="M22 36 L27 35 M33 35 L38 36" stroke="#0d0b10" stroke-width="3" stroke-linecap="round"/><path d="M25 44 Q30 41 35 44" fill="none" stroke="#0d0b10" stroke-width="3" stroke-linecap="round"/></svg>'],
  deniz: ['#2a6a8a', '<svg viewBox="0 0 60 60"><circle cx="30" cy="35" r="17" fill="#f0cfa8" stroke="#0d0b10" stroke-width="4"/><path d="M13 40 Q30 62 47 40 Q42 50 30 51 Q18 50 13 40 Z" fill="#e9eef2" stroke="#0d0b10" stroke-width="3"/><path d="M13 24 L16 8 L23 17 L30 4 L37 17 L44 8 L47 24 Z" fill="#bfefff" stroke="#0d0b10" stroke-width="3.5" stroke-linejoin="round"/><path d="M21 35 L27 36 M33 36 L39 35" stroke="#0d0b10" stroke-width="3.5" stroke-linecap="round"/><path d="M24 44 Q30 41 36 44" fill="none" stroke="#0d0b10" stroke-width="3" stroke-linecap="round"/></svg>'],
  adam: ['#3a7a3a', '<svg viewBox="0 0 60 60"><circle cx="30" cy="33" r="18" fill="#f3ead8" stroke="#0d0b10" stroke-width="4"/><path d="M12 28 Q14 12 30 12 Q46 12 48 28 Q40 22 30 22 Q20 22 12 28 Z" fill="#6a4a2a" stroke="#0d0b10" stroke-width="3.5" stroke-linejoin="round"/><rect x="11" y="24" width="38" height="6" fill="#f3ead8" stroke="#0d0b10" stroke-width="2.5"/><path d="M11 27 H49" stroke="#e8361c" stroke-width="2"/><path d="M21 35 L27 34 M33 34 L39 35" stroke="#0d0b10" stroke-width="3" stroke-linecap="round"/><path d="M23 43 Q30 48 37 42" fill="none" stroke="#0d0b10" stroke-width="3" stroke-linecap="round"/><circle cx="50" cy="48" r="7" fill="#d8f04a" stroke="#0d0b10" stroke-width="2.5"/></svg>'],
  monfort: ['#7a2a2a', '<svg viewBox="0 0 60 60"><circle cx="30" cy="34" r="17" fill="#e8c09a" stroke="#0d0b10" stroke-width="4"/><path d="M11 28 Q12 12 30 12 Q48 12 49 28 Z" fill="#e8361c" stroke="#0d0b10" stroke-width="4" stroke-linejoin="round"/><path d="M8 28 L52 28 L54 32 L8 31 Z" fill="#b02a14" stroke="#0d0b10" stroke-width="3" stroke-linejoin="round"/><path d="M21 36 L27 35 M33 35 L39 36" stroke="#0d0b10" stroke-width="3" stroke-linecap="round"/><path d="M21 43 Q30 38 39 43 Q30 46 21 43 Z" fill="#6a4a2a" stroke="#0d0b10" stroke-width="2.5"/><circle cx="44" cy="52" r="4" fill="#b8bcc4" stroke="#0d0b10" stroke-width="2"/></svg>'],
};
const crewFace = id => CREW_FACES[id] || FACES[id] || ['#333', ''];
const CREW = [
  { id: 'josh', name: 'Josh', role: 'Tech genius · the Workbench', have: D => D.josh, who: 'Josh', hint: 'Locked in a server room in the Scrapyard. Something big is guarding the door.',
    quote: '"Works on my machine."', bio: 'Builds gadgets out of scrap, spite and Base Camp coffee. Has never read a manual, mostly because Josh wrote all of them. Gave you the Kinetic Baseball for free, and will mention that often.' },
  { id: 'renas', name: 'Renas', role: 'Scooter courier · fast travel', have: D => D.chase, who: 'Renas', hint: 'A blur somewhere in the Ventilation Shafts. You\'ll have to catch up first.',
    quote: '"Where to, slowpoke?"', bio: 'Runs the only taxi service in the Spire: ring a call bell and Renas shows up. The scooter runs on drone motors borrowed from Josh. Josh does not know this.' },
  { id: 'reshman', name: 'Reshman', role: 'Cartographer · lurker', have: D => D.reshman || Object.keys(D.reshmanMet || {}).length > 0, who: 'Reshman', hint: 'In a dark corner. Always a dark corner.',
    quote: '"…blorp."', bio: 'Draws every map in the Spire from the shadows, then sells them back to you. Nobody has seen the whole of Reshman. Nobody wants to.' },
  { id: 'lars', name: 'Lars', role: 'Blacksmith · Lars\'s Anvil', have: D => D.lars, who: 'Lars', hint: 'Down in the Deep Quarry. Follow the sound of an anvil.',
    quote: '"Rock and stone!"', bio: 'Forges titanium into bat upgrades and taught you the Slugger Stance. Owns several cats, all of whom have gone missing at some point.' },
  { id: 'daniel', name: 'Daniel', role: 'Pyrotechnician · Fireworks Stand', have: D => D.danielDead, who: 'Daniel', hint: 'The Pyrotechnic Foundry. You\'ll hear it before you see it.',
    quote: '"Every bomb\'s got a lucky one in there somewhere!"', bio: 'Thinks every problem is a fuse problem. Lost the fight, gained a customer: now sells you the Explosive Baseballs that nearly flattened you.' },
  { id: 'fionn', name: 'Fionn', role: 'Geologist · Keeper of Pebbles', have: D => D.fionnDead, who: 'Fionn', hint: 'Deep in the Geode Caverns, talking to the rocks.',
    quote: '"Respect the rocks."', bio: 'Names every stone in the Spire and remembers all of them. Trades bat charms for Lucky Pebbles, ten at a time, and gets a little emotional about it.' },
  { id: 'milo', name: 'Milo', role: 'Storm mage · Static Dash', have: D => D.miloDead, who: 'Milo', hint: 'At the eye of the Storm Atrium. Bring an umbrella.',
    quote: '"Did anyone else feel that? No? Just me?"', bio: 'Accidentally cursed a stack of spellbooks and is very sorry about it. Gave you the Static Dash, and the Static Shock Ball that comes with it.' },
  { id: 'deniz', name: 'Deniz', role: 'Former king · tea brewer', have: D => D.denizDead, who: 'Deniz', hint: 'On the throne at the top of the Glacier Crown. Wear socks.',
    quote: '"KNEEL! …Or have some tea. Either is fine."', bio: 'Used to rule the Glacier Crown by shouting. Now brews herbal tea instead, and the Chill Brew thermos is always warm.' },
  { id: 'adam', name: 'Adam', role: 'Tennis rival · reluctant ally', have: D => D.adamDead, who: 'Adam', hint: 'Somewhere in Act I, with a racket and a grudge.',
    quote: '"Game. Set. …Fine, you win."', bio: 'Plays tennis in a baseball tower out of pure stubbornness. Beat him once and he\'ll grudgingly help when it counts.' },
  { id: 'monfort', name: 'Coach Monfort', role: 'Coach · time trials', have: D => D.q.vance, who: 'Monfort', hint: 'By the bench at Base Camp. He has opinions.',
    quote: '"Again! From the top!"', bio: 'Runs the time trials and hands out cleat upgrades. Has a whistle and is not afraid to use it.' },
];
const SCOUT = [
  ['Scuttler', 'Scrap Scuttler', 'Hit it from above. It never looks up.', 'Josh', '"I wrote the firmware for these. In my defence, it was 3am."'],
  ['Bot', 'Scrap Bot', 'A plain 3-hit combo does the job.', 'Josh', '"Version one. We don\'t talk about version one."'],
  ['Drone', 'Security Drone', 'Pogo it, or throw a Static Shock Ball.', 'Renas', '"Its motor is worth more than you are. Don\'t break the motor."'],
  ['StrayDrone', 'Stray Drone', 'Swing up as it dives.', 'Renas', '"This one\'s been out on its own too long. Weird little guy."'],
  ['BumperBot', 'Bumper Bot', 'Jump the charge, hit it from behind.', 'Josh', '"It doesn\'t have brakes. That was a design choice."'],
  ['MagmaTick', 'Magma Tick', 'Kill it fast, before it reaches you.', 'Lars', '"Nasty wee things. They get in yer boots."'],
  ['DrillMole', 'Drill Mole', 'Wait for it to surface, then hit it.', 'Lars', '"Ye can hear them coming. Listen for the rattle."'],
  ['CrystalHopper', 'Crystal Hopper', 'Hit it while it\'s in the air.', 'Fionn', '"Quartz. Her name is Penelope. She is just excited."'],
  ['GeodeCrab', 'Geode Crab', 'Explosive Baseballs crack the shell.', 'Fionn', '"This is Granite. His name is Hendrik. Do not hit him, he is sensitive."'],
  ['CrystalWisp', 'Crystal Wisp', 'A Kinetic Baseball knocks it out of the air.', 'Fionn', '"Amethyst. Floating amethyst. I have so many questions."'],
  ['StaticElemental', 'Static Elemental', 'Static Dash straight through it.', 'Milo', '"Okay, so that one might be my fault."'],
  ['WindGargoyle', 'Wind Gargoyle', 'Stay off to the side of its gust.', 'Fionn', '"Limestone. Her name is Margaret. She is having a very hard week."'],
  ['FrostSentinel', 'Frost Sentinel', 'Hit it from behind.', 'Deniz', '"My old guard. Very loyal. Very cold. Mostly cold."'],
  ['BlizzardBat', 'Blizzard Bat', 'Pogo it as it swoops past.', 'Deniz', '"They nest in my crown. Nested. It is gone now."'],
  ['GoldDrone', 'Gold Drone', 'Same as any drone, just shinier.', 'Josh', '"Gold-plated. Worse at flying. Typical."'],
  ['ShadowUmpire', 'Shadow Umpire', 'Wait for an opening and punish it.', 'Adam', '"I\'d argue the call. You can\'t argue with these."'],
  ['AutoServer', 'Auto-Server', 'Bat its serves straight back.', 'Adam', '"Finally, something with a decent serve."'],
];
const SCOUT_BOSSES = [
  ['bossDead', 'The Rogue Server', 'z1', 'Josh', '"I said it was fine. It was not fine."'],
  ['adamDead', 'Adam', null, 'Adam', '"You got lucky. …Rematch later."'],
  ['danielDead', 'Daniel', 'z4', 'Daniel', '"Whack the green one back! It\'s the lucky one!"'],
  ['fionnDead', 'Fionn', 'z6', 'Fionn', '"The small green boulders can be returned. With respect."'],
  ['miloDead', 'Milo', 'z7', 'Milo', '"Rally the orb back three times. Sorry. Sorry!"'],
  ['denizDead', 'King Deniz', 'z8', 'Deniz', '"Knock the crown off and I am just a man with cold ears."'],
  ['evilAdamDead', 'Evil Adam', 'z9', 'Adam', '"He blocks from the front. Make him serve, then send it back."'],
  ['zennithDead', 'The Zennith', 'z10', 'Nathan', '"…"', true],
];
const LB = { sub: 'roster', crew: 0, scout: 0 };
function crewQuests(c) {
  const out = [];
  if (typeof Quests !== 'undefined' && Quests.entries) try { for (const e of Quests.entries()) if (String(e.who).includes(c.who)) out.push(e); } catch (err) { logErr('logbook: quests', err); }
  return out;
}
function scoutList() {
  const D = Save.data, q = D.q, L = SCOUT.map(s => ({ k: s[0], name: s[1], weak: s[2], by: s[3], note: s[4], n: q.kills[s[0]] || 0, zone: q.killZone[s[0]] }));
  const B = SCOUT_BOSSES.filter(b => !b[5] || D[b[0]]).map(b => ({ boss: true, k: b[0], name: b[1], zone: b[2], by: b[3], note: b[4], n: D[b[0]] ? 1 : 0, weak: '' }));
  return L.concat(B);
}
PM_VIEWS.log = {
  get hint() { return `<kbd>↑</kbd><kbd>↓</kbd> choose · <kbd>K</kbd> ${LB.sub === 'roster' ? 'Scouting Report' : 'Dugout Roster'}`; },
  render(body) {
    const D = Save.data, sub = `<div class="pm-sub"><button class="pm-btn ${LB.sub === 'roster' ? 'sel' : ''}" data-sub="roster">The Dugout Roster</button><button class="pm-btn ${LB.sub === 'scout' ? 'sel' : ''}" data-sub="scout">Scouting Report</button></div>`;
    if (LB.sub === 'roster') {
      const c = CREW[LB.crew], have = !!c.have(D), [bg, svg] = crewFace(c.id), Q = have ? crewQuests(c) : [];
      body.innerHTML = `<div class="pm-panel pm-orn pm-roster">${sub}<div class="pm-rlist pm-scroll">${CREW.map((x, i) => { const h = !!x.have(D), f = crewFace(x.id);
          return `<div class="pm-rcard ${i === LB.crew ? 'sel' : ''} ${h ? '' : 'ghost'}" data-c="${i}"><span class="pm-face ${h ? '' : 'ghost'}" style="background:${f[0]}">${f[1]}</span><b>${h ? x.name : '???'}</b></div>`; }).join('')}</div>
          <p class="pm-note" style="margin-top:10px">${CREW.filter(x => x.have(D)).length} of ${CREW.length} in the dugout</p></div>
        <div class="pm-panel pm-orn pm-who pm-scroll"><div class="pm-whohead"><span class="pm-face ${have ? '' : 'ghost'}" style="background:${bg}">${svg}</span>
          <div><h3>${have ? pmEsc(c.role) : 'Not found yet'}</h3><h2>${have ? c.name : '? ? ?'}</h2>${have ? `<p class="pm-quote">${pmEsc(c.quote)}</p>` : `<p class="pm-dim" style="font-style:italic">Last seen: ${pmEsc(c.hint)}</p>`}</div></div>
          ${have ? `<p>${pmEsc(c.bio)}</p>` : ''}
          ${have ? `<hr class="pm-rule"><h3>Side quests</h3>${Q.length ? Q.map(e => `<div class="pm-qtitle">${pmEsc(e.title)} <span class="pm-dim pm-mono" style="font-size:13px">· ${e.done ? 'done' : 'in progress'}</span></div>
              <div class="pm-qlist">${e.steps.map(s => `<div class="${s.ok ? 'ok' : ''}">${pmEsc(s.txt)}</div>`).join('')}</div><p class="pm-note">Reward · ${pmEsc(e.reward)}</p>`).join('') : '<p class="pm-dim">No open requests. For now.</p>'}` : ''}</div>`;
    } else {
      const L = scoutList(), s = L[LB.scout] || L[0], got = s && s.n > 0;
      const card = (x, i) => `<div class="pm-scard ${x.boss ? 'boss' : ''} ${x.n ? '' : 'unk'} ${i === LB.scout ? 'sel' : ''}" data-s="${i}">${x.n ? `<span class="pm-n">×${x.n}</span>` : ''}<b>${x.n ? pmEsc(x.name) : '???'}</b><small>${x.n && x.zone && ZONES[x.zone] ? pmEsc(ZONES[x.zone].name) : x.n ? '' : 'Not beaten yet'}</small></div>`;
      const firstBoss = L.findIndex(x => x.boss);
      body.innerHTML = `<div class="pm-panel pm-orn pm-scout">${sub}<div class="pm-sgrid pm-scroll"><div class="pm-shead">Enemies</div>${L.slice(0, firstBoss).map(card).join('')}<div class="pm-shead">Bosses</div>${L.slice(firstBoss).map((x, j) => card(x, j + firstBoss)).join('')}</div></div>
        <div class="pm-panel pm-orn pm-inspect">${s ? `<h3>${s.boss ? 'Boss file' : 'Scouting card'}</h3><h2>${got ? pmEsc(s.name) : '? ? ?'}</h2>
          ${got ? `<div class="pm-kv"><span>${s.boss ? 'Beaten' : 'Defeated'}</span><b>${s.boss ? 'Yes' : s.n}</b>${s.zone && ZONES[s.zone] ? `<span>${s.boss ? 'Where' : 'First beaten'}</span><b>${pmEsc(ZONES[s.zone].name)}</b>` : ''}</div>
            ${s.weak ? `<h3>Weak spot</h3><p>${pmEsc(s.weak)}</p>` : ''}<div class="pm-crewnote"><small>A note from ${pmEsc(s.by)}</small>${pmEsc(s.note)}</div>`
            : '<p class="pm-dim">Beat one to fill in this card.</p>'}` : ''}
          <p class="pm-note" style="margin-top:auto">Enemies count from the moment this report was started.</p></div>`;
    }
    body.querySelectorAll('[data-sub]').forEach(b => b.addEventListener('click', () => { if (LB.sub !== b.dataset.sub) { LB.sub = b.dataset.sub; SFX.flip(); pmRender(); } }));
    body.querySelectorAll('[data-c]').forEach(el => el.addEventListener('click', () => { LB.crew = +el.dataset.c; SFX.latch(); pmRender(); }));
    body.querySelectorAll('[data-s]').forEach(el => el.addEventListener('click', () => { LB.scout = +el.dataset.s; SFX.latch(); pmRender(); }));
  },
  nav(dx, dy) {
    if (LB.sub === 'roster') { const d = dy * 2 + dx; LB.crew = clamp(LB.crew + d, 0, CREW.length - 1); }
    else { const n = scoutList().length; LB.scout = clamp(LB.scout + dx + dy * 4, 0, n - 1); }
    SFX.latch(); pmRender();
  },
  ok() { this.alt(); },
  alt() { LB.sub = LB.sub === 'roster' ? 'scout' : 'roster'; SFX.flip(); pmRender(); },
};

/* ---------- Tab 5 · Trophies ---------- */
const TR = { cat: 'all', sel: 0 };
const TR_CATS = [['all', 'All'], ['story', 'Story'], ['explore', 'Exploration'], ['combat', 'Skill & Gauntlets'], ['hardcore', 'Hardcore & Endings']];
const CUP_SVG = '<svg viewBox="0 0 30 30"><path d="M8 4 H22 V10 Q22 18 15 19 Q8 18 8 10 Z" fill="#f2c14e" stroke="#0d0b10" stroke-width="2"/><path d="M8 7 Q3 7 4 11 Q5 14 9 14 M22 7 Q27 7 26 11 Q25 14 21 14" fill="none" stroke="#0d0b10" stroke-width="2"/><path d="M13 19 L12 24 H18 L17 19" fill="#f2c14e" stroke="#0d0b10" stroke-width="2"/><rect x="9" y="24" width="12" height="3" fill="#7a5a2a" stroke="#0d0b10" stroke-width="1.5"/></svg>';
const trList = () => TROPHIES.filter(t => TR.cat === 'all' || t.cat === TR.cat);
PM_VIEWS.trophies = {
  hint: '<kbd>←</kbd><kbd>→</kbd><kbd>↑</kbd><kbd>↓</kbd> browse · <kbd>K</kbd> filter',
  render(body) {
    const D = Save.data, q = D.q, A = Trophies.all(), got = TROPHIES.filter(t => A[t.id]).length, L = trList();
    TR.sel = clamp(TR.sel, 0, Math.max(0, L.length - 1));
    const t = L[TR.sel], own = t && A[t.id], ends = q.endings || {};
    const ENDS = ['standard', 'ego', 'joke', 'chill', 'true'];
    let rec = '';
    if (q.shotClock && typeof fmtClock === 'function') rec = `<span>Shot Clock run</span><b>${fmtClock(q.clock || 0)}</b>` + (q.clockClear !== undefined ? `<span>Clock at your first ending</span><b>${fmtClock(q.clockClear)}</b>` : '');
    body.innerHTML = `<div class="pm-panel pm-orn pm-tcase"><div class="pm-trow"><h3 style="margin:0">Trophy Case</h3><span class="pm-count">${got} of ${TROPHIES.length} found</span>
          <span class="pm-cups" title="Endings reached on this save">${ENDS.map(e => `<span class="${ends[e] ? 'on' : 'off'}">${CUP_SVG}</span>`).join('')}</span></div>
        <div class="pm-filters">${TR_CATS.map(([id, n]) => `<button class="pm-btn ${TR.cat === id ? 'sel' : ''}" data-cat="${id}">${n}</button>`).join('')}</div>
        <div class="pm-tgrid pm-scroll">${L.map((x, i) => { const g = !!A[x.id], hide = x.secret && !g;
          return `<div class="pm-plaque ${g ? 'got' : 'lock'} ${i === TR.sel ? 'sel' : ''}" data-tr="${i}">${x.icon}<small>${hide ? '???' : pmEsc(x.name)}</small></div>`; }).join('')}</div></div>
      <div class="pm-panel pm-orn pm-tinsp">${t ? `<h3>${pmEsc((TR_CATS.find(c => c[0] === t.cat) || ['', ''])[1])}</h3>
        <div class="pm-ticon ${own ? '' : 'lock'}">${t.icon}</div>
        <h2>${t.secret && !own ? '? ? ?' : pmEsc(t.name)}</h2>
        <p class="${own ? '' : 'pm-dim'}" style="font-style:${t.secret && !own ? 'italic' : 'normal'}">${t.secret && !own ? pmEsc(t.hint || 'A secret.') : pmEsc(t.info)}</p>
        <div class="pm-kv">${own ? `<span>Unlocked</span><b>${new Date(own.at).toLocaleDateString()}</b><span>Mode</span><b>${pmEsc(own.mode)}</b>` : '<span>Status</span><b>Locked</b>'}${rec}</div>` : ''}</div>`;
    body.querySelectorAll('[data-cat]').forEach(b => b.addEventListener('click', () => { TR.cat = b.dataset.cat; TR.sel = 0; SFX.flip(); pmRender(); }));
    body.querySelectorAll('[data-tr]').forEach(el => {
      el.addEventListener('mouseenter', () => { const i = +el.dataset.tr; if (TR.sel !== i) { TR.sel = i; pmRender(); } });
      el.addEventListener('click', () => { TR.sel = +el.dataset.tr; SFX.latch(); pmRender(); });
    });
  },
  nav(dx, dy) { TR.sel = clamp(TR.sel + dx + dy * 4, 0, trList().length - 1); SFX.latch(); pmRender(); },
  ok() { SFX.latch(); },
  alt() { const i = TR_CATS.findIndex(c => c[0] === TR.cat); TR.cat = TR_CATS[(i + 1) % TR_CATS.length][0]; TR.sel = 0; SFX.flip(); pmRender(); },
};
