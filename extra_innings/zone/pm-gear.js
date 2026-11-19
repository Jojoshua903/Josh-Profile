'use strict';
/* =========================================================
   PAUSE MENU · tabs 2 & 3: Crests & Badges, Tools & Balls
   Loaded after zone/pausemenu.js.
   ========================================================= */
const CREST_ART = {
  rookie: c => `<path d="M30 76 L72 26" stroke="#0d0b10" stroke-width="13" stroke-linecap="round"/><path d="M30 76 L72 26" stroke="${c}" stroke-width="8" stroke-linecap="round"/><circle cx="34" cy="38" r="10" fill="#f3ead8" stroke="#0d0b10" stroke-width="3"/><path d="M29 31 Q33 38 29 45 M39 31 Q35 38 39 45" fill="none" stroke="#e8361c" stroke-width="1.8"/>`,
  slugger: c => `<path d="M50 84 L50 20" stroke="#0d0b10" stroke-width="17" stroke-linecap="round"/><path d="M50 84 L50 20" stroke="${c}" stroke-width="11" stroke-linecap="round"/><path d="M50 82 L50 64" stroke="#3a2a1a" stroke-width="7"/>${[0, 1, 2].map(k => `<path d="M${32 - k * 6} ${40 + k * 12} Q${24 - k * 6} ${32 + k * 12} ${30 - k * 6} ${24 + k * 12} M${68 + k * 6} ${40 + k * 12} Q${76 + k * 6} ${32 + k * 12} ${70 + k * 6} ${24 + k * 12}" fill="none" stroke="#ff5a1a" stroke-width="3" stroke-linecap="round"/>`).join('')}`,
  acrobat: c => `<path d="M34 72 L60 44" stroke="#0d0b10" stroke-width="11" stroke-linecap="round"/><path d="M34 72 L60 44" stroke="${c}" stroke-width="6" stroke-linecap="round"/><path d="M50 16 L62 32 L54 32 L54 42 L46 42 L46 32 L38 32 Z" fill="${c}" stroke="#0d0b10" stroke-width="2.5" stroke-linejoin="round"/><path d="M24 54 Q20 40 30 30 M76 54 Q80 40 70 30" fill="none" stroke="${c}" stroke-width="2.5" stroke-dasharray="4 4"/><circle cx="66" cy="64" r="7" fill="#f3ead8" stroke="#0d0b10" stroke-width="2.5"/>`,
  mvp: c => `<path d="M30 76 L70 36 M70 76 L30 36" stroke="#0d0b10" stroke-width="12" stroke-linecap="round"/><path d="M30 76 L70 36 M70 76 L30 36" stroke="#d9b77a" stroke-width="7" stroke-linecap="round"/><path d="M32 30 L36 14 L44 24 L50 10 L56 24 L64 14 L68 30 Z" fill="${c}" stroke="#0d0b10" stroke-width="2.5" stroke-linejoin="round"/>${[[22, 22], [80, 26], [18, 60], [82, 62]].map(([x, y]) => `<path d="M${x} ${y - 5} L${x + 1.5} ${y - 1.5} L${x + 5} ${y} L${x + 1.5} ${y + 1.5} L${x} ${y + 5} L${x - 1.5} ${y + 1.5} L${x - 5} ${y} L${x - 1.5} ${y - 1.5} Z" fill="#fff3c0"/>`).join('')}`,
};
const crestSVG = s => `<svg viewBox="0 0 100 100"><path d="M50 4 L92 18 L88 58 Q82 84 50 97 Q18 84 12 58 L8 18 Z" fill="#0b0a0d" stroke="#d9cfb8" stroke-width="3"/><path d="M50 11 L85 23 L81 57 Q76 78 50 89 Q24 78 19 57 L15 23 Z" fill="none" stroke="#b0362e" stroke-width="1.2" stroke-dasharray="3 3"/>${CREST_ART[s.id](s.color)}</svg>`;
const BADGE_COLS = ['#e8361c', '#f2c14e', '#6fd3ff', '#9be36a', '#d9b8ff', '#ff8a2a', '#8fd6f0', '#f3ead8'];
function badgeSVG(b) {
  const col = { pyro: '#ff5a1a', ace: '#6fd3ff', crown: '#f2c14e' }[b.id] || BADGE_COLS[[...b.id].reduce((n, ch) => n + ch.charCodeAt(0), 0) % BADGE_COLS.length];
  return `<svg viewBox="0 0 40 40"><path d="M20 2 L35 10 L35 28 L20 38 L5 28 L5 10 Z" fill="#121014" stroke="#d9cfb8" stroke-width="2"/><circle cx="20" cy="20" r="10" fill="${col}" stroke="#0d0b10" stroke-width="2.5"/><text x="20" y="24.5" text-anchor="middle" font-family="Georgia,serif" font-size="12" fill="#0d0b10">${pmEsc(b.name[0])}</text></svg>`;
}

/* ---------- Tab 2 · Crests & Badges ---------- */
const CB = { focus: 'crest', crest: 0, badge: 0, msg: '' };
PM_VIEWS.crests = {
  hint: '<kbd>←</kbd><kbd>→</kbd> stance · <kbd>↓</kbd> badges · <kbd>Enter</kbd> equip',
  render(body) {
    const D = Save.data, bench = atBench(), s = STANCES[CB.crest], have = s.have(D), on = stanceNow().id === s.id;
    const L = typeof LOADOUT !== 'undefined' ? LOADOUT : [], LD = typeof Loadout !== 'undefined' ? Loadout : null;
    const N = LD ? LD.notches() : 0, U = LD ? LD.used() : 0, b = L[CB.badge];
    const banner = bench ? '<div class="pm-banner">ON THE BENCH · swap your stance and badges freely</div>'
      : '<div class="pm-banner lock">VIEW ONLY · sit on a Dugout Bench to change your stance or badges</div>';
    body.innerHTML = `<div class="pm-panel pm-orn pm-crest ${CB.focus === 'crest' ? 'focus' : ''}"><h3>Batting Stance</h3>${banner}
        <div class="pm-emblem ${have ? '' : 'locked'}" style="--glow:${s.glow}"><span class="pm-arrow l" data-cr="-1">‹</span>${crestSVG(s)}<span class="pm-arrow r" data-cr="1">›</span></div>
        <div class="pm-dots">${STANCES.map((x, i) => `<i class="${i === CB.crest ? 'on' : ''} ${x.have(D) ? '' : 'lock'}"></i>`).join('')}</div>
        <h2>${have ? s.name : '? ? ?'}</h2><p class="pm-gold" style="font-style:italic;margin-bottom:6px">${have ? s.tag : 'Locked'}</p>
        <p style="max-width:330px">${have ? s.desc : 'Unlocked by: ' + s.from + '.'}</p>
        ${have ? `<div class="pm-kv">${s.stats.map(([k, v]) => `<span>${k}</span><b>${v}</b>`).join('')}</div>` : ''}
        <button class="pm-btn ${on ? 'sel' : ''}" data-equip ${have && !on && bench ? '' : 'disabled'}>${on ? 'In use' : 'Use this stance'}</button>
        <p class="pm-msg">${CB.focus === 'crest' ? pmEsc(CB.msg) : ''}</p></div>
      <div class="pm-panel pm-orn pm-badges"><h3>Badges &amp; Notches</h3>
        <div class="pm-notches">${Array.from({ length: N }, (_, k) => `<i class="${k < U ? 'on' : ''}"></i>`).join('')}<span>${N - U} / ${N} FREE</span></div>
        <div class="pm-bgrid pm-scroll">${L.map((x, i) => { const own = LD.owned(x.id), pin = own && LD.pinned(x.id);
          return `<div class="pm-badge ${CB.focus === 'badge' && i === CB.badge ? 'sel' : ''} ${pin ? 'pinned' : ''} ${own ? '' : 'locked'}" data-b="${i}">${badgeSVG(x)}<b>${own ? pmEsc(x.name) : '???'}</b></div>`; }).join('')}</div>
        <div class="pm-info">${b ? `<span class="pm-cost">${Array.from({ length: b.cost }, () => '<i></i>').join('')}</span><b>${LD.owned(b.id) ? pmEsc(b.name) : '???'}</b>
          <p class="pm-dim" style="margin:4px 0">${LD.owned(b.id) ? pmEsc(b.desc) : 'Found at: ' + pmEsc(b.from)}</p>
          <p class="pm-note">${b.cost} notch${b.cost > 1 ? 'es' : ''} · ${LD.pinned(b.id) ? 'pinned to your jersey' : LD.owned(b.id) ? 'spare' : 'not found yet'}</p>` : '<p class="pm-dim">No badges yet.</p>'}
          <p class="pm-msg">${CB.focus === 'badge' ? pmEsc(CB.msg) : ''}</p></div></div>`;
    body.querySelectorAll('[data-cr]').forEach(a => a.addEventListener('click', () => { CB.focus = 'crest'; this.nav(+a.dataset.cr, 0); }));
    const eq = body.querySelector('[data-equip]'); if (eq) eq.addEventListener('click', () => { CB.focus = 'crest'; this.ok(); });
    body.querySelectorAll('[data-b]').forEach(el => {
      el.addEventListener('mouseenter', () => { const i = +el.dataset.b; if (CB.focus !== 'badge' || CB.badge !== i) { CB.focus = 'badge'; CB.badge = i; CB.msg = ''; pmRender(); } });
      el.addEventListener('click', () => { CB.focus = 'badge'; CB.badge = +el.dataset.b; this.ok(); });
    });
  },
  nav(dx, dy) {
    const n = typeof LOADOUT !== 'undefined' ? LOADOUT.length : 0;
    CB.msg = '';
    if (CB.focus === 'crest') {
      if (dx) CB.crest = (CB.crest + dx + STANCES.length) % STANCES.length;
      if (dy > 0 && n) CB.focus = 'badge';
    } else {
      if (dx) CB.badge = clamp(CB.badge + dx, 0, n - 1);
      if (dy) { const j = CB.badge + dy * 3; if (j < 0) CB.focus = 'crest'; else CB.badge = clamp(j, 0, n - 1); }
    }
    SFX.latch(); pmRender();
  },
  ok() {
    if (CB.focus === 'crest') CB.msg = setStance(STANCES[CB.crest].id);
    else if (typeof Loadout !== 'undefined') {
      if (!atBench()) { SFX.deny(); CB.msg = 'Sit on a Dugout Bench to swap badges.'; }
      else { Loadout.toggle(CB.badge); SFX.latch(); const el = $('#badgeLine'); CB.msg = el ? el.textContent : ''; }
    }
    pmRender();
  },
};
const _cbOpen = pmReallyOpen;
pmReallyOpen = function () { CB.crest = Math.max(0, STANCES.indexOf(stanceNow())); CB.msg = ''; TB.msg = ''; return _cbOpen(); };

/* ---------- Tab 3 · Tools & Balls ---------- */
const TOOL_ART = {
  kinetic: '<svg viewBox="0 0 50 50"><circle cx="25" cy="25" r="17" fill="#f3ead8" stroke="#0d0b10" stroke-width="3.5"/><path d="M16 12 Q22 25 16 38 M34 12 Q28 25 34 38" fill="none" stroke="#e8361c" stroke-width="2.4" stroke-dasharray="3 2"/><path d="M4 20 L10 22 M3 28 L9 28 M5 35 L11 33" stroke="#6fd3ff" stroke-width="2.5" stroke-linecap="round"/></svg>',
  boom: '<svg viewBox="0 0 50 50"><circle cx="24" cy="28" r="16" fill="#2b2228" stroke="#0d0b10" stroke-width="3.5"/><path d="M15 17 Q20 28 15 39 M33 17 Q28 28 33 39" fill="none" stroke="#ff8a2a" stroke-width="2.2" stroke-dasharray="3 2"/><path d="M34 14 Q40 6 44 8" fill="none" stroke="#c9a36b" stroke-width="3"/><circle cx="45" cy="7" r="3.5" fill="#ffd27a"/></svg>',
  shock: '<svg viewBox="0 0 50 50"><circle cx="25" cy="25" r="17" fill="#1a2a44" stroke="#0d0b10" stroke-width="3.5"/><path d="M27 10 L18 27 L25 27 L21 40 L33 22 L26 22 Z" fill="#9fe6ff" stroke="#0d0b10" stroke-width="2" stroke-linejoin="round"/><path d="M4 12 L9 16 M46 38 L41 34 M44 10 L40 15" stroke="#9fe6ff" stroke-width="2.4" stroke-linecap="round"/></svg>',
  brew: '<svg viewBox="0 0 50 50"><rect x="15" y="12" width="20" height="33" rx="5" fill="#5aa0b8" stroke="#0d0b10" stroke-width="3"/><rect x="17" y="5" width="16" height="8" rx="2" fill="#2a6a8a" stroke="#0d0b10" stroke-width="2.5"/><path d="M15 24 H35" stroke="#0d0b10" stroke-width="2"/><path d="M22 30 Q25 26 28 30 Q25 36 22 30 Z" fill="#9be36a" stroke="#0d0b10" stroke-width="1.5"/><path d="M38 10 Q41 6 38 2 M43 12 Q46 8 43 4" fill="none" stroke="#f3ead8" stroke-width="2" stroke-linecap="round"/></svg>',
};
const TOOLS = [
  { id: 'kinetic', name: 'Kinetic Baseball', from: 'Josh', cost: () => 'Free', have: () => ABIL.launch, mode: 0, keys: () => [Bindings.label('ball'), Bindings.label('attack')],
    desc: 'Toss it, then smack it mid-air to rocket yourself across big gaps. One per jump, refilled when you land.' },
  { id: 'boom', name: 'Explosive Baseball', from: 'Daniel', cost: () => BOOM_COST + ' Hype', have: () => ABIL.boom, mode: 1, keys: () => [Bindings.label('swap')],
    desc: 'Blows up on impact: splash damage that ignores shields, and it opens cracked walls and floors.' },
  { id: 'shock', name: 'Static Shock Ball', from: 'Milo', cost: () => SHOCK_COST + ' Hype', have: shockOK, mode: 2, keys: () => [Bindings.label('swap')],
    desc: 'Smack it into a crowd: it zaps from enemy to enemy (up to 4) and locks robots up for a second and a half.' },
  { id: 'brew', name: 'Chill Brew Thermos', from: 'Deniz', cost: () => 'Once per rest', have: brewOwned, keys: () => ['Bench'],
    desc: 'Deniz\'s herbal tea in a refillable thermos. Drink it on a Dugout Bench for +2 temporary blue Shield Hearts. Refills every rest.' },
];
const TB = { sel: 0, msg: '' };
const WHEEL_POS = [[50, 9], [91, 50], [50, 91], [9, 50]];
const PENNANT_SVG = c => `<svg viewBox="0 0 30 50"><path d="M4 2 V48" stroke="#d9cfb8" stroke-width="2.5"/><path d="M5 4 L28 12 L5 22 Z" fill="${c}" stroke="#0d0b10" stroke-width="2"/></svg>`;
PM_VIEWS.tools = {
  hint: '<kbd>←</kbd><kbd>→</kbd> choose · <kbd>Enter</kbd> take in hand / drink',
  render(body) {
    const D = Save.data, T = TOOLS[TB.sel], have = T.have(), mode = ballMode(), q = D.q;
    const pens = typeof PENNANTS !== 'undefined' ? PENNANTS : ['fionn', 'milo', 'deniz'], penN = pens.filter(k => D.pennants[k]).length;
    const peb = pebblesFound(), oreFound = Object.keys(D.ores || {}).length;
    const act = T.id === 'brew' ? `<button class="pm-btn" data-use ${have && q.brew && atBench() ? '' : 'disabled'}>${q.brew ? 'Drink' : 'Empty'}</button>`
      : `<button class="pm-btn ${have && mode === T.mode ? 'sel' : ''}" data-use ${have && mode !== T.mode ? '' : 'disabled'}>${mode === T.mode && have ? 'In hand' : 'Take in hand'}</button>`;
    const status = T.id === 'brew' ? (!have ? 'Not yet' : q.brew ? (atBench() ? 'Full · drink it now' : 'Full · drink it on a bench') : 'Empty · refills when you rest') : (!have ? 'Not yet' : mode === T.mode ? 'In hand' : 'Ready');
    body.innerHTML = `<div class="pm-panel pm-orn pm-tools"><div class="pm-toolstop">
        <div class="pm-wheel"><div class="pm-hub">${TOOL_ART[['kinetic', 'boom', 'shock'][mode]]}<span>${BALL_NAMES[mode]}</span></div>
          ${TOOLS.map((x, i) => `<div class="pm-slot ${i === TB.sel ? 'sel' : ''} ${x.have() ? '' : 'locked'} ${x.mode === mode && x.have() ? 'hand' : ''}" data-t="${i}" style="left:${WHEEL_POS[i][0]}%;top:${WHEEL_POS[i][1]}%">${TOOL_ART[x.id]}<kbd>${pmEsc(x.keys()[0] || '')}</kbd></div>`).join('')}</div>
        <div class="pm-tooldesc"><h3>Balls &amp; Tools</h3><h2>${have ? T.name : '? ? ?'}</h2><p class="pm-gold" style="font-style:italic">${have ? 'From ' + T.from : 'Someone in the Spire has this'}</p>
          <div class="pm-kv"><span>Cost</span><b>${have ? T.cost() : '—'}</b><span>Controls</span><b>${have ? T.keys().map(pmEsc).join(' + ') : '—'}</b><span>Status</span><b>${status}</b></div>
          <p>${have ? T.desc : 'Not unlocked yet.'}</p>${act}<p class="pm-msg">${pmEsc(TB.msg)}</p>
          <p class="pm-note">${pmEsc(Bindings.label('swap'))} cycles your ball types in play.</p></div></div>
      <hr class="pm-rule"><h3>Key Items &amp; Collectibles</h3>
      <div class="pm-case">
        <div class="pm-cell"><div>${pens.map((k, i) => PENNANT_SVG(D.pennants[k] ? ['#9be36a', '#6fd3ff', '#bfefff'][i] : '#2a2d3a')).join('')}</div><b>Golden Pennants</b><span class="pm-big">${penN} / 3</span></div>
        <div class="pm-cell">${ORE_SVG}<b>Raw Titanium Ore</b><span class="pm-big">${D.ore}</span><span class="pm-note">${oreFound} found in total</span></div>
        <div class="pm-cell"><svg viewBox="0 0 40 30"><ellipse cx="20" cy="18" rx="15" ry="10" fill="#9a9488" stroke="#0d0b10" stroke-width="2.5"/><path d="M12 14 Q18 10 24 13" fill="none" stroke="#f3ead8" stroke-width="2"/></svg><b>Lucky Pebbles</b><span class="pm-big">${peb} / ${PEBBLE_TOTAL}</span><div class="pm-bar" style="width:80%"><i style="width:${100 * peb / PEBBLE_TOTAL}%"></i></div></div>
        <div class="pm-cell">${BOLT_SVG}<b>Scrap Bolts</b><span class="pm-big">${D.bolts}</span></div>
        <div class="pm-cell ${D.spareBat ? 'gold' : 'dark'}"><svg viewBox="0 0 30 60"><path d="M15 4 L15 56" stroke="#0d0b10" stroke-width="10" stroke-linecap="round"/><path d="M15 4 L15 56" stroke="#c9a36b" stroke-width="6" stroke-linecap="round"/><path d="M15 44 L15 56" stroke="#7a5a3a" stroke-width="6"/></svg><b>${D.spareBat ? 'The Spare Bat' : '&nbsp;'}</b><span class="pm-note">${D.spareBat ? 'Plain wood. The one you started with.' : ''}</span></div>
      </div></div>`;
    body.querySelectorAll('[data-t]').forEach(el => {
      el.addEventListener('mouseenter', () => { const i = +el.dataset.t; if (TB.sel !== i) { TB.sel = i; TB.msg = ''; pmRender(); } });
      el.addEventListener('click', () => { TB.sel = +el.dataset.t; this.ok(); });
    });
    const u = body.querySelector('[data-use]'); if (u) u.addEventListener('click', () => this.ok());
  },
  nav(dx, dy) { const d = dx || dy; if (!d) return; TB.sel = (TB.sel + d + TOOLS.length) % TOOLS.length; TB.msg = ''; SFX.latch(); pmRender(); },
  ok() {
    const T = TOOLS[TB.sel];
    if (!T.have()) { SFX.deny(); TB.msg = 'Not unlocked yet.'; }
    else if (T.id === 'brew') TB.msg = drinkBrew();
    else if (setBallMode(T.mode)) { SFX.latch(); TB.msg = `${T.name} in hand.`; }
    pmRender();
  },
};
