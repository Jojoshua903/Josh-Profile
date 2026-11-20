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
const PENNANT_SVG = c => `<svg viewBox="0 0 30 50"><path d="M4 2 V48" stroke="#d9cfb8" stroke-width="2.5"/><path d="M5 4 L28 12 L5 22 Z" fill="${c}" stroke="#0d0b10" stroke-width="2"/></svg>`;
/* the equipment case: four compartment rows on the left, the parchment inspector on the right.
   Items that aren't in the Spire yet sit in their slot as a dark silhouette. */
const IV_SVG = (body, vb = '0 0 50 50') => `<svg viewBox="${vb}">${body}</svg>`;
const IV_K = 'stroke="#0d0b10"';
const IV_ART = {
  curve: IV_SVG(`<path d="M6 40 Q10 12 38 14" fill="none" stroke="#6fd3ff" stroke-width="3" stroke-dasharray="4 3" stroke-linecap="round"/><circle cx="38" cy="16" r="10" fill="#f3ead8" ${IV_K} stroke-width="3"/><path d="M33 9 Q36 16 33 23 M43 9 Q40 16 43 23" fill="none" stroke="#e8361c" stroke-width="1.8"/>`),
  splitter: IV_SVG(`<circle cx="18" cy="25" r="10" fill="#f3ead8" ${IV_K} stroke-width="3"/><path d="M30 25 L46 12 M30 25 L47 25 M30 25 L46 38" stroke="#f2c14e" stroke-width="3" stroke-linecap="round"/>`),
  flash: IV_SVG(`<circle cx="25" cy="30" r="10" fill="#f3ead8" ${IV_K} stroke-width="3"/><path d="M25 4 V12 M12 9 L16 15 M38 9 L34 15 M6 20 H13 M44 20 H37" stroke="#fff6c4" stroke-width="3" stroke-linecap="round"/>`),
  grapple: IV_SVG(`<path d="M8 44 Q22 30 30 14" fill="none" stroke="#d9cfb8" stroke-width="2.4" stroke-dasharray="3 2"/><path d="M30 14 L36 6 M30 14 L40 14 M30 14 L24 6" stroke="#9a9488" stroke-width="3.5" stroke-linecap="round"/><circle cx="8" cy="44" r="5" fill="#f3ead8" ${IV_K} stroke-width="2"/>`),
  machine: IV_SVG(`<rect x="12" y="10" width="22" height="16" rx="4" fill="#5a6a7a" ${IV_K} stroke-width="3"/><circle cx="36" cy="18" r="4" fill="#0d0b10"/><path d="M23 26 L12 46 M23 26 L34 46 M23 26 V46" stroke="#9a9488" stroke-width="3" stroke-linecap="round"/>`),
  gloves: IV_SVG(`<path d="M12 44 V20 Q12 14 16 14 V8 Q20 5 22 9 V6 Q26 3 28 7 V9 Q32 6 34 10 V24 Q40 20 42 24 L34 38 V44 Z" fill="#c9a36b" ${IV_K} stroke-width="3" stroke-linejoin="round"/><path d="M12 36 H34" stroke="#7a5a3a" stroke-width="3"/>`),
  cleats: IV_SVG(`<path d="M6 30 Q8 18 18 18 L24 22 Q36 22 44 30 V36 H6 Z" fill="#f3ead8" ${IV_K} stroke-width="3" stroke-linejoin="round"/><path d="M10 40 V36 M18 40 V36 M28 40 V36 M38 40 V36" stroke="#0d0b10" stroke-width="3"/><path d="M18 12 Q24 4 30 12" fill="none" stroke="#9be36a" stroke-width="3" stroke-linecap="round"/>`),
  glider: IV_SVG(`<path d="M8 8 V46" stroke="#d9cfb8" stroke-width="3"/><path d="M9 10 Q30 6 46 18 Q30 22 9 28 Z" fill="#f2c14e" ${IV_K} stroke-width="2.5"/>`),
  wristband: IV_SVG(`<rect x="10" y="17" width="30" height="16" rx="5" fill="#5a2a8a" ${IV_K} stroke-width="3"/><path d="M27 11 L20 25 L26 25 L22 39 L32 22 L26 22 Z" fill="#e2c8ff" ${IV_K} stroke-width="1.8" stroke-linejoin="round"/>`),
  bat: c => IV_SVG(`<path d="M12 44 L40 8" stroke="#0d0b10" stroke-width="12" stroke-linecap="round"/><path d="M12 44 L40 8" stroke="${c}" stroke-width="7" stroke-linecap="round"/><path d="M11 45 L17 38" stroke="#3a2a1a" stroke-width="7" stroke-linecap="round"/>`),
  uppercut: IV_SVG(`<path d="M25 46 V12" stroke="#9fe6ff" stroke-width="4" stroke-linecap="round"/><path d="M14 20 L25 6 L36 20" fill="none" stroke="#9fe6ff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 34 L20 28 L16 26 L22 20" fill="none" stroke="#f3ead8" stroke-width="2"/>`),
  heavy: IV_SVG(`<path d="M25 6 L40 14 V32 L25 44 L10 32 V14 Z" fill="#6a6058" ${IV_K} stroke-width="3"/><path d="M18 28 Q25 18 32 28 Q25 34 18 28 Z" fill="#f2c14e" ${IV_K} stroke-width="1.5"/><circle cx="21" cy="22" r="2" fill="#0d0b10"/><circle cx="29" cy="22" r="2" fill="#0d0b10"/>`),
  quill: IV_SVG(`<path d="M40 6 Q18 14 12 40 L16 42 Q24 20 40 6 Z" fill="#e6dfd0" ${IV_K} stroke-width="2.5"/><path d="M12 40 L8 46" stroke="#0d0b10" stroke-width="3" stroke-linecap="round"/><path d="M8 46 Q14 46 18 44" fill="none" stroke="#2a6a8a" stroke-width="2"/>`),
  compass: IV_SVG(`<circle cx="25" cy="25" r="17" fill="#c9a36b" ${IV_K} stroke-width="3"/><circle cx="25" cy="25" r="12" fill="#f3ead8"/><path d="M25 13 L29 25 L25 37 L21 25 Z" fill="#e8361c" ${IV_K} stroke-width="1.5"/>`),
  radar: IV_SVG(`<circle cx="25" cy="25" r="17" fill="#12302a" ${IV_K} stroke-width="3"/><circle cx="25" cy="25" r="10" fill="none" stroke="#3fb8a0" stroke-width="1.5"/><path d="M25 25 L38 15" stroke="#9be36a" stroke-width="2.5"/><circle cx="31" cy="31" r="2.5" fill="#f2c14e"/>`),
  magnet: IV_SVG(`<path d="M12 10 V28 Q12 42 25 42 Q38 42 38 28 V10 H30 V28 Q30 34 25 34 Q20 34 20 28 V10 Z" fill="#e8361c" ${IV_K} stroke-width="3" stroke-linejoin="round"/><path d="M12 10 H20 V16 H12 Z M30 10 H38 V16 H30 Z" fill="#d9cfb8"/>`),
  core: IV_SVG(`<circle cx="25" cy="25" r="16" fill="#3a1a2a" ${IV_K} stroke-width="3"/><circle cx="25" cy="25" r="9" fill="#e8361c"/><circle cx="25" cy="25" r="4" fill="#ffd9b0"/>`),
  bigboom: IV_SVG(`<path d="M25 4 L30 16 L44 12 L36 24 L46 34 L32 34 L28 46 L22 34 L8 38 L16 26 L6 16 L20 16 Z" fill="#ff8a2a" ${IV_K} stroke-width="2.5" stroke-linejoin="round"/><circle cx="25" cy="26" r="6" fill="#fff2c4"/>`),
  chalk: IV_SVG(`<path d="M14 18 Q12 44 25 44 Q38 44 36 18 Z" fill="#e6dfd0" ${IV_K} stroke-width="3"/><path d="M14 18 Q25 10 36 18" fill="none" ${IV_K} stroke-width="3"/><circle cx="25" cy="10" r="4" fill="#f3f3f3" opacity=".7"/>`),
  monocle: IV_SVG(`<circle cx="22" cy="22" r="13" fill="rgba(242,193,78,.2)" stroke="#f2c14e" stroke-width="4"/><path d="M32 32 Q38 40 34 46" fill="none" stroke="#d9cfb8" stroke-width="2"/>`),
  bark: IV_SVG(`<path d="M10 12 Q25 4 40 12 V30 Q25 46 10 30 Z" fill="#6a4a2a" ${IV_K} stroke-width="3"/><path d="M18 14 V34 M25 10 V40 M32 14 V34" stroke="#9be36a" stroke-width="2"/>`),
  seal: IV_SVG(`<circle cx="18" cy="18" r="10" fill="#c9a36b" ${IV_K} stroke-width="3"/><circle cx="18" cy="18" r="4" fill="#0d0b10"/><path d="M25 25 L42 42 M34 34 L30 38 M38 38 L34 42" stroke="#c9a36b" stroke-width="4" stroke-linecap="round"/>`),
  keycard: IV_SVG(`<rect x="8" y="12" width="34" height="24" rx="3" fill="#1a2a44" ${IV_K} stroke-width="3"/><rect x="12" y="18" width="10" height="8" fill="#f2c14e"/><path d="M26 20 H38 M26 26 H34" stroke="#6fd3ff" stroke-width="2"/>`),
  ticket: IV_SVG(`<path d="M6 14 H44 V20 A4 4 0 0 0 44 28 V36 H6 V28 A4 4 0 0 0 6 20 Z" fill="#f3ead8" ${IV_K} stroke-width="3"/><path d="M25 18 L27 23 L32 23 L28 26 L30 31 L25 28 L20 31 L22 26 L18 23 L23 23 Z" fill="#e8361c"/>`),
  sparebat: IV_SVG(`<path d="M12 44 L40 8" stroke="#0d0b10" stroke-width="11" stroke-linecap="round"/><path d="M12 44 L40 8" stroke="#c9a36b" stroke-width="6" stroke-linecap="round"/>`),
  book: IV_SVG(`<path d="M8 10 H24 Q25 12 26 10 H42 V40 H26 Q25 42 24 40 H8 Z" fill="#3a1a4a" ${IV_K} stroke-width="3"/><path d="M25 12 V40" stroke="#0d0b10" stroke-width="2"/><path d="M14 20 L18 26 L14 30 M36 20 L32 26 L36 30" fill="none" stroke="#b98bff" stroke-width="2"/>`),
  herb: IV_SVG(`<path d="M25 46 V20" stroke="#4a7a3a" stroke-width="3"/><path d="M25 26 Q12 24 10 12 Q22 12 25 26 Z M25 22 Q36 18 40 6 Q28 8 25 22 Z" fill="#9be36a" ${IV_K} stroke-width="2"/>`),
  board: IV_SVG(`<rect x="8" y="10" width="34" height="30" rx="2" fill="#2a5a3a" ${IV_K} stroke-width="3"/><rect x="18" y="18" width="14" height="14" fill="#0d0b10"/><path d="M12 16 H18 M32 34 H38 M12 34 V26 M38 16 V24" stroke="#f2c14e" stroke-width="2"/>`),
  stub: IV_SVG(`<path d="M4 14 H46 V21 A4 4 0 0 0 46 29 V36 H4 V29 A4 4 0 0 0 4 21 Z" fill="#f2c14e" ${IV_K} stroke-width="3"/><path d="M14 14 V36" stroke="#0d0b10" stroke-width="2" stroke-dasharray="2 2"/>`),
  pebble: IV_SVG(`<ellipse cx="25" cy="28" rx="17" ry="12" fill="#9a9488" ${IV_K} stroke-width="3"/><path d="M15 24 Q22 18 30 22" fill="none" stroke="#f3ead8" stroke-width="2.4"/>`),
  relic: IV_SVG(`<circle cx="25" cy="22" r="13" fill="#f3ead8" ${IV_K} stroke-width="3"/><path d="M18 12 Q22 22 18 32 M32 12 Q28 22 32 32" fill="none" stroke="#e8361c" stroke-width="1.8"/><path d="M14 40 H36" stroke="#c9a36b" stroke-width="4" stroke-linecap="round"/>`),
};
const IV_BAT = [['Wooden Bat', '#c9a36b'], ['Steel Bat', '#b8bcc4'], ['Titanium Bat', '#9fd8e8'], ['Tempered Titanium Bat', '#6fd3ff']];
const ivBat = () => { const D = Save.data; return D.up.maxBat ? ['Gilded Bat', '#f2c14e'] : IV_BAT[D.batLv || 0] || IV_BAT[0]; };
const ivCount = k => Object.keys(Save.data.q[k] || {}).length;
const ivGx = () => (typeof gx === 'function' ? gx() : {});
const ivPens = () => (typeof PENNANTS !== 'undefined' ? PENNANTS : ['fionn', 'milo', 'deniz', 'maya']);
const IV_PEN_COL = { fionn: '#9be36a', milo: '#6fd3ff', deniz: '#bfefff', maya: '#5fd6c0' };
const IV_PEN_WHO = { fionn: 'Fionn', milo: 'Milo', deniz: 'Deniz', maya: 'Coach Maya' };
const IV_SOON = { have: () => false, soon: true };   // a slot for something not in the Spire yet
// shape: 'd' diamond (throwables), 'c' circle (gadgets), 's' square (everything else)
const IV_ROWS = [
  { title: 'Active Tools & Specialty Balls', items: [
    { id: 'kinetic', shape: 'd', name: 'Kinetic Baseball', tags: ['Always in hand', '0 Hype'], have: () => ABIL.launch, mode: 0, art: () => TOOL_ART.kinetic,
      desc: 'Toss it, then smack it in a dead-straight line. Smack it mid-air to rocket yourself across big gaps, or hit far-off switches. One per jump, refilled when you land.', quote: ['JOSH', 'My own improved core. Bounces exactly the way I calculated. Mostly.'] },
    { id: 'boom', ball: true, shape: 'd', name: 'Explosive Baseball', tags: ['Specialty Ball', () => BOOM_COST + ' Hype'], have: () => ABIL.boom, mode: 1, art: () => TOOL_ART.boom,
      desc: 'Blows up on impact: a big shockwave that breaks shields and blows open cracked walls and floors. Smack it under your own feet for a high Rocket Jump.', quote: ['DANIEL', 'Caution is for people without fireworks! Don\'t keep it in your pocket.'] },
    { id: 'curve', ball: true, shape: 'd', name: 'Curveball', tags: ['Specialty Ball', '10 Hype'], have: () => !!Save.data.up.curve, mode: 3, art: () => IV_ART.curve,
      desc: 'Flies straight for 0.3 seconds, then breaks sharply 90 degrees: hold up or down to bend it that way. Hold neither and it hunts the nearest target. Slips behind shields and catcher masks, and trips the armoured switch in the Pump Room.', quote: ['COACH MAYA', 'Power wins games. Technique breaks defences.'] },
    { id: 'shock', ball: true, shape: 'd', name: 'Static Shock Ball', tags: ['Specialty Ball', () => SHOCK_COST + ' Hype'], have: shockOK, mode: 2, art: () => TOOL_ART.shock,
      desc: 'When it hits an enemy, lightning jumps to up to 3 more nearby and locks robots up for a second and a half.', quote: ['MILO', 'Careful touching it. My hair is STILL standing up.'] },
    { id: 'split', ball: true, shape: 'd', name: 'Scatter-Ball', tags: ['Specialty Ball', '20 Hype'], have: () => !!Save.data.up.split, mode: 4, art: () => IV_ART.splitter,
      lockText: 'Josh is building something. Ask him at his workbench once you\'re in Act II.',
      desc: 'Smack it right at the top of its toss (the sweet spot) and it splits mid-flight into three fast line drives in a fan. Deadly against drone swarms.', quote: ['JOSH', 'Three times the balls, zero times the warranty if you miss.'] },
    { id: 'flash', ball: true, shape: 'd', name: 'Flashbang Pop-Fly', tags: ['Specialty Ball', '25 Hype'], have: () => !!Save.data.up.flash, mode: 5, art: () => IV_ART.flash,
      lockText: 'Daniel could make one, with 2 Raw Titanium Ore and better powder from Act II.',
      desc: 'Smack it and it pops up at a slant, then bursts in a blinding magnesium flash after 0.4 seconds: every normal enemy on screen is stunned for 2.5 seconds, and bosses are dazzled mid-attack.', quote: ['DANIEL', 'Look at the birdie! …Wait, I told you to look AWAY!'] },
    { id: 'brew', gadget: true, shape: 'c', name: 'Chill Brew Thermos', tags: ['Utility Gadget', () => arsBrewMax() + ' sips per rest'], have: brewOwned, art: () => TOOL_ART.brew,
      status: () => `${Save.data.q.brew | 0} / ${arsBrewMax()} sips left`,
      desc: 'A quick sip of warm herbal tea: +2 temporary blue Shield Hearts, and enemy shots near you slow right down for 3 seconds. Refills on every bench rest.', quote: ['DENIZ', 'Breathe in, breathe out, and let the bad vibes slide off you, bro.'] },
    { id: 'grapple', gadget: true, shape: 'c', name: 'Fouled Grapple Line', tags: ['Utility Gadget', '1.5s cooldown'], have: () => !!Save.data.up.grapple, art: () => IV_ART.grapple,
      lockText: 'Lost somewhere in the Geode Caverns.',
      desc: 'Fires a baseball on a braided line up at a slant (hold up for steep). It hooks onto ceilings, walls and drones and reels you in fast across wide gaps. Press jump to let go early.', quote: ['RENAS', 'I use one to hang off the back of trucks. Works great.'] },
    { id: 'machine', gadget: true, shape: 'c', name: 'Pocket Pitching Machine', tags: ['Utility Gadget', '1 per rest'], have: () => !!Save.data.up.machine, art: () => IV_ART.machine,
      lockText: 'Josh is soldering one. Find him again up in the stadium.',
      status: () => (arsQ().mach > 0 ? 'Ready' : 'Used · rest to reload'),
      desc: 'Set it on the ground: for 8 seconds it fires fastballs at the nearest enemy while you focus on dodging.', quote: ['JOSH', 'A portable Pitch-O-Matic. Without the self-destruct button. I think.'] },
  ] },
  { title: 'Movement & Batting Relics', items: [
    { id: 'gloves', name: 'Batting Gloves', tags: ['Movement Relic', 'Wall-Jump'], have: () => ABIL.wall, art: () => IV_ART.gloves,
      desc: 'Grip a wall and kick off it. Chain wall-jumps to climb any shaft with two walls close enough together.', quote: ['LARS', 'Leather from me own apron. Don\'t sweat in \'em.'] },
    { id: 'cleats', name: 'Spring Cleats', tags: ['Movement Relic', 'Double Jump'], have: () => ABIL.double, art: () => IV_ART.cleats,
      desc: 'Jump again in mid-air. Refreshes every time you land, bounce off an enemy or grab a wall.', quote: ['FIONN', 'Bouncier than my excuses.'] },
    { id: 'glider', name: 'The Champion\'s Pennant', tags: ['Movement Relic', 'Glide'], have: () => !!Save.data.q.pennant, art: () => IV_ART.glider,
      lockText: 'Lars could stitch something out of old championship banners. Three of them.',
      desc: 'Hold jump while falling to glide. Open it inside an updraft to ride the column up fast.', quote: ['LARS', 'Banner up top, bus tarp underneath. Don\'t tell Renas.'] },
    { id: 'wristband', name: 'Static Wristband', tags: ['Movement Relic', 'Laser Dash'], have: () => !!Save.data.up.staticDash, art: () => IV_ART.wristband,
      desc: 'Your dash crackles with Milo\'s storm: you pass straight through laser grids and electric fences, and it zaps whatever you dash through.', quote: ['MILO', 'It tingles. That\'s normal. Probably.'] },
    { id: 'bat', name: () => ivBat()[0], tags: ['Batting Relic', () => (Save.data.up.maxBat ? 'Max' : 'Level ' + ((Save.data.batLv || 0) + 1) + ' / 4')], have: () => true, art: () => IV_ART.bat(ivBat()[1]),
      desc: 'Nathan\'s bat. Lars forges it up with Raw Titanium Ore: Wood, Steel, Titanium, Tempered Titanium. Each level hits harder. Win it all and it turns to gold.', quote: ['LARS', 'Hit it flat, hit it hard, don\'t come cryin\' if it dents.'] },
    { id: 'uppercut', name: 'Storm Uppercut', tags: ['Batting Relic', 'Up + Dash'], have: () => !!Save.data.up.uppercut, art: () => IV_ART.uppercut,
      desc: 'Hold up and press dash to launch straight up in a crackling uppercut that hits anything above you.', quote: ['MILO', 'Skyward. On purpose, this time.'] },
    { id: 'heavy', name: 'Heavy Swing Charm', tags: ['Batting Relic', 'Knockback'], have: () => !!Save.data.up.heavy, art: () => IV_ART.heavy,
      desc: 'Lars beat a lump of cat-iron into your bat. Big hits, bigger knockback.', quote: ['LARS', 'Rock and stone, slugger.'] },
    { id: 'quill', name: 'Ink Quill', tags: ['Map Relic', 'Live mapping'], have: () => !!Save.data.up.quill, art: () => IV_ART.quill,
      desc: 'Sketches each room in wet pencil as you explore. Rest on a bench to ink it for good. Strike out first and the wet rooms smudge away.', quote: ['RESHMAN', 'Pigeon feather. Very rare pigeon. …blorp.'] },
    { id: 'compass', name: 'Compass', tags: ['Map Relic'], have: () => !!Save.data.up.compass, art: () => IV_ART.compass,
      desc: 'Shows where you are on the map.', quote: ['RESHMAN', 'It never points at me. Nobody finds me.'] },
    { id: 'radar', name: 'Radar Scanner', tags: ['Map Relic'], have: () => !!Save.data.up.radar, art: () => IV_ART.radar,
      desc: 'Marks the collectibles you haven\'t picked up yet on the maps you own.', quote: ['JOSH', 'Beep means good. Two beeps means very good. Three beeps, run.'] },
    { id: 'magnet', name: () => (arsQ().found.magnet ? 'Magnet Cleats' : 'Magnet Module'), tags: ['Relic', 'Bolt magnet'], have: () => !!Save.data.up.magnet, art: () => IV_ART.magnet,
      lockText: 'Josh sells a magnet module. Rumour says there are magnet cleats in a side cave of the Deep Quarry, too.',
      desc: 'Dropped Scrap Bolts fly straight to you across wide gaps, so none get lost in spikes or pits.', quote: ['JOSH', 'Works on my machine.'] },
    { id: 'core', name: 'Spite-Forged Core', tags: ['Gear', 'Hype +33%'], have: () => !!Save.data.up.core, art: () => IV_ART.core,
      desc: 'A bigger Hype Orb. Store an extra heal for when things go sideways.', quote: ['LARS', 'Spite-forged. Don\'t ask what\'s inside.'] },
    { id: 'bigboom', name: 'Bigger Bang', tags: ['Gear', 'Blast +40%'], have: () => !!Save.data.up.bigboom, art: () => IV_ART.bigboom,
      desc: 'Double-packed gunpowder. Explosive Baseball blasts are 40% wider.', quote: ['DANIEL', 'BIGGER! Yes! That\'s the spirit!'] },
    { id: 'chalk', name: 'Chalk Pouches', tags: ['Relic', 'Hype +33% each'], have: () => arsChalk() > 0, count: () => `${arsChalk()} / 3`, frac: () => arsChalk() / 3, art: () => IV_ART.chalk,
      lockText: 'Three pouches of rosin chalk are hidden in the Spire: low, in the middle, and up where it\'s cold.',
      desc: 'Each pouch makes your Hype Orb 33% bigger. With all three you can store enough Hype to heal three times in a row.', quote: ['COACH MONFORT', 'Chalk up, grip it, HUSTLE!'] },
    { id: 'monocle', name: 'The Umpire\'s Monocle', tags: ['Relic', 'Always on'], have: () => !!Save.data.up.monocle, art: () => IV_ART.monocle,
      lockText: 'Someone dropped it among the trophies of the Gilded Stadium.',
      desc: 'Hidden breakable walls and floors shimmer faintly gold, and the boss bar shows exact HP numbers.', quote: ['THE UMPIRE', 'I see everything. That one was a ball, by the way.'] },
    { id: 'bark', name: 'Bark-Weave Padding', art: () => IV_ART.bark, ...IV_SOON },
  ] },
  { title: 'Keys, Pennants & Seals', items: [
    ...ivPens().map(k => ({ id: 'pen_' + k, name: (IV_PEN_WHO[k] || k) + '\'s Golden Pennant', tags: ['Key Relic', 'Pennant Gate'], have: () => !!Save.data.pennants[k],
      art: () => PENNANT_SVG(IV_PEN_COL[k] || '#f2c14e'), desc: `Won from ${IV_PEN_WHO[k] || k}. All ${ivPens().length} pennants together open the Pennant Gate to the stadium.`,
      quote: { fionn: ['FIONN', 'You noticed me. That\'s all I wanted.'], milo: ['MILO', 'Keep it away from my spellbooks.'], deniz: ['DENIZ', 'Hang it somewhere calm.'], maya: ['COACH MAYA', 'Earned on the beat. Don\'t lose the rhythm.'] }[k] || ['NATHAN', 'One more for the gate.'] })),
    { id: 'seal1', name: 'Stadium Seal Key', art: () => IV_ART.seal, ...IV_SOON },
    { id: 'seal2', name: 'Stadium Seal Key', art: () => IV_ART.seal, ...IV_SOON },
    { id: 'seal3', name: 'Stadium Seal Key', art: () => IV_ART.seal, ...IV_SOON },
    { id: 'keycard', name: 'VIP Signal Keycard', tags: ['Key Relic', 'Colosseum'], have: () => !!ivGx().coloOpen, art: () => IV_ART.keycard,
      desc: 'Coach Monfort let you into the VIP wing. The lift behind him drops into the Championship Colosseum under the locker room.', quote: ['COACH MONFORT', 'Players and coaches only. You count. Barely. HUSTLE!'] },
    { id: 'allstar', name: 'All-Star Ticket', tags: ['Key Relic', 'Colosseum'], have: () => typeof lgQ === 'function' && !!lgQ().ticket, art: () => IV_ART.ticket,
      desc: 'Real gold foil: "ADMIT ONE · THE HALL OF LEGENDS." Fall asleep with it on Deniz\'s tea cushion at Base Camp to dream your way into the Hall of Legends.', quote: ['COACH MONFORT', 'Sleep with a ticket under your pillow and you dream of the big leagues.'] },
    { id: 'spare', name: 'The Spare Bat', tags: ['Key Relic'], have: () => !!Save.data.spareBat, art: () => IV_ART.sparebat,
      desc: 'Plain wood, hidden away in Zone 1. It barely dents a robot, but the True Ending needs it in your hands.', quote: ['NATHAN', 'The one I started with. Feels right.'] },
  ] },
  { title: 'Materials & Tradable Relics', items: [
    { id: 'bolts', name: 'Scrap Bolts', tags: ['Currency'], have: () => true, count: () => Save.data.bolts || 0, art: () => BOLT_SVG,
      desc: 'Dropped by everything you smash. Spend them at Reshman\'s stalls, the Caravan and Lars\' forge. Strike out and they stay behind with your Foul Echo.', quote: ['RESHMAN', 'Shiny. …mine? No. Yours. Fine.'] },
    { id: 'ore', name: 'Raw Titanium Ore', tags: ['Material'], have: () => true, count: () => Save.data.ore || 0, art: () => ORE_SVG,
      sub: () => Object.keys(Save.data.ores || {}).length + ' found in total',
      desc: 'Glittering veins in the rock. Smack them loose and bring the ore to Lars to forge your bat up a level.', quote: ['LARS', 'Bring me ore, I\'ll bring ye pain. For the robots, I mean.'] },
    { id: 'pebbles', name: 'Lucky Pebbles', tags: ['Collectible'], have: () => true, count: () => `${pebblesFound()} / ${PEBBLE_TOTAL}`, frac: () => pebblesFound() / PEBBLE_TOTAL, art: () => IV_ART.pebble,
      desc: 'Little stones hidden all over the Spire. Hand every 10 to Fionn for a bat charm and +1 max HP. All 50 are needed for the True Ending.', quote: ['FIONN', 'Ten more! Okay, okay, I\'ll make you another one.'] },
    { id: 'books', name: 'Cursed Spellbooks', tags: ['Quest · Milo'], have: () => !!Save.data.q.milo, count: () => `${ivCount('books')} / 4`, frac: () => ivCount('books') / 4, art: () => IV_ART.book,
      desc: 'Milo\'s runaway spellbooks. Three clean hits seal each one. Seal all four for Milo\'s reward.', quote: ['MILO', 'They giggle. Books shouldn\'t giggle.'] },
    { id: 'herbs', name: 'Healing Herbs', tags: ['Quest'], have: () => ivCount('herbs') > 0, count: () => `${ivCount('herbs')} / ${(QUEST_SPOTS.herbs || []).length}`, frac: () => ivCount('herbs') / Math.max(1, (QUEST_SPOTS.herbs || []).length), art: () => IV_ART.herb,
      desc: 'Rare herbs growing in the strangest places: over lava, in a storm, frozen in ice.', quote: ['DENIZ', 'Pick them gently. They remember.'] },
    { id: 'boards', name: 'Scrap Motherboards', tags: ['Quest · Byte'], have: () => ivCount('boards') > 0, count: () => `${ivCount('boards')} / 3`, frac: () => ivCount('boards') / 3, art: () => IV_ART.board,
      desc: 'Pried out of gold-glowing elite enemies. Byte wants three.', quote: ['BYTE', '[PROGRESS: ACCEPTABLE. CONTINUE SMASHING]'] },
    { id: 'stubs', name: 'Golden Stubs', tags: ['Shadow Tickets'], have: () => stubsFound() > 0, count: () => stubsLeft(), sub: () => `${stubsFound()} / ${STUB_TOTAL} found`, art: () => IV_ART.stub,
      desc: 'Old ticket stubs, one hidden in every zone. Trade them for badges, or hand one to Reshman as a Shadow Ticket to fish your Foul Echo out of his puddle.', quote: ['RESHMAN', 'Ticket. Good. …blorp.'] },
    { id: 'relics', name: 'Vintage Memorabilia', tags: ['Tradable', 'The Archivist'], have: () => ARS_SPOTS.some(s => ARS_MEMO[s.look] && arsQ().found[s.id]),
      count: () => arsCarried().length, sub: () => `${ARS_SPOTS.filter(s => ARS_MEMO[s.look] && arsQ().found[s.id]).length} / 27 found · ${Object.keys(arsQ().sold).length} sold`, art: () => IV_ART.relic,
      lockText: '27 old sports relics are hidden all over the Spire.',
      desc: () => {
        const L = Object.keys(ARS_MEMO).map(k => `${ARS_MEMO[k].name}: ${ARS_SPOTS.filter(s => s.look === k && arsQ().found[s.id]).length}/${ARS_MEMO[k].total} (${ARS_MEMO[k].pay} each)`).join(' · ');
        const lore = arsLoreUnlocked();
        return `Sell them to the Archivist in the Trophy Vault, Gilded Stadium. ${L}.` + (lore.length ? '\n\nTHE RECORD:\n' + lore.join('\n\n') : '');
      },
      quote: ['ARCHIVIST', 'Every speck of dust in here is a match somebody lost.'] },
  ] },
];
const TB = { row: 0, col: 0, msg: '' };
const ivAt = () => { const R = IV_ROWS[TB.row]; TB.col = Math.min(TB.col, R.items.length - 1); return R.items[TB.col]; };
const ivVal = v => (typeof v === 'function' ? v() : v);
const ivSlotOf = it => (it.ball ? arsQ().balls.indexOf(it.id) : -1);
PM_VIEWS.tools = {
  hint: '<kbd>←</kbd><kbd>→</kbd><kbd>↑</kbd><kbd>↓</kbd> browse · <kbd>Enter</kbd> equip (on a bench) / take in hand / drink',
  render(body) {
    if (typeof arsAutofill === 'function') arsAutofill();
    const mode = arsMode(), T = ivAt(), have = T.have(), bench = atBench(), A = arsQ();
    const slot = (it, r, c) => {
      const on = it.have(), hand = on && it.mode !== undefined && it.mode === mode;
      const eq = on && ((it.ball && ivSlotOf(it) >= 0) || (it.gadget && A.gadget === it.id));
      return `<div class="iv-slot iv-${it.shape || 's'} ${on ? '' : 'locked'} ${it.soon ? 'soon' : ''} ${hand ? 'hand' : ''} ${eq ? 'eq' : ''} ${r === TB.row && c === TB.col ? 'sel' : ''}" data-r="${r}" data-c="${c}">
        <i>${it.art()}</i>${on && it.count !== undefined ? `<em>${pmEsc(it.count())}</em>` : ''}${eq && it.ball ? `<u>${ivSlotOf(it) + 1}</u>` : ''}</div>`;
    };
    const rows = IV_ROWS.map((R, r) => `<div class="iv-row"><h3><span>${['I', 'II', 'III', 'IV'][r]}</span> ${pmEsc(R.title)}</h3>
      <div class="iv-grid">${R.items.map((it, c) => slot(it, r, c)).join('')}</div></div>`).join('');
    // what the slots hold right now
    const nm = id => (id ? ARS_BALL[id].name : 'empty');
    const loadout = `<div class="iv-load"><span>Slot 1 · <b>${pmEsc(nm(A.balls[0]))}</b></span><span>Slot 2 · <b>${pmEsc(nm(A.balls[1]))}</b></span><span>Gadget · <b>${pmEsc(A.gadget ? ARS_GADGET[A.gadget].name : 'none')}</b></span></div>`;
    let status = '', act = '';
    if (have) {
      const si = ivSlotOf(T);
      if (T.ball) {
        status = si >= 0 ? `In slot ${si + 1}${mode === T.mode ? ' · in hand' : ''}` : 'Not in a slot';
        if (bench && si < 0) act = '<button class="pm-btn" data-use>Equip</button>';
        else if (si >= 0) act = `<button class="pm-btn ${mode === T.mode ? 'sel' : ''}" data-use ${mode !== T.mode ? '' : 'disabled'}>${mode === T.mode ? 'In hand' : 'Take in hand'}</button>`;
      } else if (T.mode === 0) {
        status = mode === 0 ? 'In hand' : 'Ready';
        act = `<button class="pm-btn ${mode === 0 ? 'sel' : ''}" data-use ${mode !== 0 ? '' : 'disabled'}>${mode === 0 ? 'In hand' : 'Take in hand'}</button>`;
      } else if (T.gadget) {
        const on = A.gadget === T.id;
        status = (T.status ? T.status() + ' · ' : '') + (on ? 'Equipped' : 'Not equipped');
        if (T.id === 'brew') act = `<button class="pm-btn" data-use ${Save.data.q.brew > 0 ? '' : 'disabled'}>Drink</button>`;
        if (bench && !on) act += '<button class="pm-btn" data-eq>Equip</button>';
      } else if (T.status) status = T.status();
    }
    const name = have ? ivVal(T.name) : '? ? ?';
    const tags = have ? (T.tags || []).map(t => `<span>${pmEsc(ivVal(t))}</span>`).join('') : `<span>${T.soon ? 'Not yet found' : 'Locked'}</span>`;
    const desc = have ? ivVal(T.desc) : T.lockText || (T.soon ? 'Something belongs in this slot. Nobody in the Spire has found it yet.' : 'Someone in the Spire has this.');
    const count = have && T.count !== undefined ? `<div class="iv-count">${pmEsc(T.count())}${T.sub ? `<small>${pmEsc(T.sub())}</small>` : ''}</div>` +
      (T.frac ? `<div class="pm-bar"><i style="width:${Math.round(100 * Math.min(1, T.frac()))}%"></i></div>` : '') : '';
    const benchNote = (T.ball || T.gadget) && have && !bench ? '<p class="pm-note">Sit on a Dugout Bench to change what\'s in your slots.</p>' : '';
    body.innerHTML = `<div class="pm-panel pm-orn iv-case">${rows}${loadout}</div>
      <div class="pm-panel iv-inspect">
        <div class="iv-art ${have ? '' : 'locked'}">${T.art()}</div>
        <h2>${pmEsc(name)}</h2><hr class="pm-rule">
        <div class="iv-tags">${tags}</div>${count}
        <p>${pmEsc(desc).replace(/\n/g, '<br>')}</p>
        ${have && T.quote ? `<blockquote><p>“${pmEsc(T.quote[1])}”</p><cite>— ${pmEsc(T.quote[0])}</cite></blockquote>` : ''}
        ${status ? `<div class="pm-kv"><span>Status</span><b>${pmEsc(status)}</b></div>` : ''}
        ${act}<p class="pm-msg">${pmEsc(TB.msg)}</p>${benchNote}
        ${T.mode !== undefined && have ? `<p class="pm-note">Tap ${pmEsc(Bindings.label('swap'))} to cycle your balls, hold it for the quick wheel. ${pmEsc(Bindings.label('gadget'))} uses your gadget.</p>` : ''}
      </div>`;
    body.querySelectorAll('[data-r]').forEach(el => {
      const r = +el.dataset.r, c = +el.dataset.c;
      el.addEventListener('mouseenter', () => { if (TB.row !== r || TB.col !== c) { TB.row = r; TB.col = c; TB.msg = ''; pmRender(); } });
      el.addEventListener('click', () => { TB.row = r; TB.col = c; this.ok(); });
    });
    const u = body.querySelector('[data-use]'); if (u) u.addEventListener('click', () => this.ok());
    const e = body.querySelector('[data-eq]'); if (e) e.addEventListener('click', () => { TB.msg = arsEquipGadget(ivAt().id); SFX.latch(); pmRender(); });
  },
  nav(dx, dy) {
    if (!dx && !dy) return;
    if (dx) { const n = IV_ROWS[TB.row].items.length; TB.col = (TB.col + dx + n) % n; }
    if (dy) { TB.row = (TB.row + dy + IV_ROWS.length) % IV_ROWS.length; TB.col = Math.min(TB.col, IV_ROWS[TB.row].items.length - 1); }
    TB.msg = ''; SFX.latch(); pmRender();
  },
  ok() {
    const T = ivAt(), bench = atBench(), A = arsQ();
    if (!T.have()) { SFX.deny(); TB.msg = T.soon ? 'Not found yet.' : 'Not unlocked yet.'; }
    else if (T.ball) {
      if (ivSlotOf(T) < 0) { if (bench) { TB.msg = arsEquipBall(T.id); SFX.latch(); SFX.buy(); } else { SFX.deny(); TB.msg = 'Sit on a Dugout Bench to put it in a slot.'; } }
      else if (setBallMode(T.mode)) { SFX.latch(); TB.msg = `${ivVal(T.name)} in hand.`; }
    } else if (T.mode === 0) { setBallMode(0); SFX.latch(); TB.msg = 'Kinetic Baseball in hand.'; }
    else if (T.gadget) {
      if (T.id === 'brew' && A.gadget === 'brew') TB.msg = drinkBrew();
      else if (A.gadget !== T.id) { if (bench) { TB.msg = arsEquipGadget(T.id); SFX.latch(); } else { SFX.deny(); TB.msg = 'Sit on a Dugout Bench to swap your gadget.'; } }
      else if (T.id === 'brew') TB.msg = drinkBrew();
      else TB.msg = `${ivVal(T.name)} is in your gadget slot. Press ${Bindings.label('gadget')} in play.`;
    } else { SFX.latch(); TB.msg = ''; }
    pmRender();
  },
};
