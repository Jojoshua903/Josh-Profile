/* =========================================================
   MAIN MENU · the four difficulties on New Game
   Spring Training · Major League · World Series · Sudden Death,
   as four upright sports cards. The pick goes to the game through
   localStorage 'ei_newdiff' (read by zone/difficulty.js) and, for
   Sudden Death, the old 'ei_newmode' flag too.
   The save slot shows its difficulty as a coloured ribbon, plus the
   gold star once World Series is cleared; the World Series Badge
   sits under the logo once any save has earned it.
   Loaded after menu-trophies.js.
   ========================================================= */
(function () {
  const readSave = () => { try { return JSON.parse(localStorage.getItem('ei_zone1') || 'null'); } catch (e) { logErr('menu-difficulty: read', e); return null; } };
  const anyEnding = () => { let L = []; try { L = JSON.parse(localStorage.getItem('ei_endings') || '[]') || []; } catch (e) { logErr('menu-difficulty: endings', e); } return L.length > 0 || TROPHIES.some(t => t.secret && Trophies.has(t.id)); };
  const BALL = (extra = '', fill = '#f3ead8') => `<circle cx="50" cy="54" r="30" fill="${fill}" stroke="#0d0b10" stroke-width="5"/><path d="M32 32 Q42 54 32 76 M68 32 Q58 54 68 76" fill="none" stroke="#e8361c" stroke-width="3" stroke-dasharray="5 4"/>${extra}`;
  const CARDS = [
    { k: 'spring', name: 'Spring Training', sub: 'Easy · Story', color: '#4CAF50', blurb: 'For players who want to explore the Spire with extra protection.',
      rules: ['7 hearts', '+50% Hype', 'Max 1 heart per hit', 'Spikes & pits cost nothing', 'Bosses 15% slower'],
      icon: BALL(`<g transform="translate(70 26)"><circle cx="-6" cy="0" r="7" fill="#4CAF50" stroke="#0d0b10" stroke-width="2.5"/><circle cx="6" cy="0" r="7" fill="#4CAF50" stroke="#0d0b10" stroke-width="2.5"/><circle cx="0" cy="-8" r="7" fill="#4CAF50" stroke="#0d0b10" stroke-width="2.5"/><path d="M0 4 Q2 12 -2 18" fill="none" stroke="#0d0b10" stroke-width="3"/></g>`) },
    { k: 'major', name: 'Major League', sub: 'Normal', color: '#FF3B30', tag: 'RECOMMENDED', blurb: 'The original challenge of the Spire.',
      rules: ['5 hearts', 'Standard Hype', 'Bosses at full speed', 'The intended balance'],
      icon: BALL() },
    { k: 'world', name: 'World Series', sub: 'Hard · Veteran', color: '#FFD700', blurb: 'Faster bosses, less rest. Only for seasoned sluggers.',
      rules: ['Healing in a boss fight +0.2 s', '15% less Hype', 'Bosses & enemies 20% faster', '0.7 s of i-frames', 'Earns the gold star'],
      icon: BALL(`<path d="M30 40 Q22 18 40 8 Q38 22 50 26 Q52 10 66 4 Q62 22 74 30 Q80 20 78 12 Q92 30 76 46" fill="#ff8a2a" stroke="#0d0b10" stroke-width="3"/><path d="M40 36 Q38 26 46 20 Q46 30 56 32 Q58 24 64 20 Q64 32 70 38" fill="#ffd700"/>`) },
    { k: 'sudden', name: 'Sudden Death', sub: 'Hardcore · One life', color: '#FF1744', blurb: 'One life. Die once and the save shatters.',
      rules: ['Strike out once: the save is gone', 'Pick your speed below', 'Dreams & the Hall of Legends are safe'],
      icon: `<circle cx="50" cy="52" r="32" fill="#e9dcc0" stroke="#0d0b10" stroke-width="5"/><path d="M34 46 Q34 36 42 38 Q46 44 40 50 Z M66 46 Q66 36 58 38 Q54 44 60 50 Z" fill="#0d0b10"/><path d="M50 54 L46 62 H54 Z" fill="#0d0b10"/><path d="M38 70 V76 M44 71 V78 M50 71 V78 M56 71 V78 M62 70 V76" stroke="#0d0b10" stroke-width="3"/><path d="M50 20 L46 34 L54 40" fill="none" stroke="#FF1744" stroke-width="3"/>` },
  ];
  const DF_NAMES = { spring: ['Spring Training', '#4CAF50'], major: ['Major League', '#FF3B30'], world: ['World Series', '#FFD700'], sudden: ['Sudden Death', '#FF1744'] };
  const ST = { sel: 1, pace: 'major', open: false };

  const st = document.createElement('style');
  st.textContent = `
.panel.diff-mode{width:min(1120px,96vw)}
.df-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:16px 0 6px}
.df-card{position:relative;display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center;padding:16px 12px 14px;background:var(--bone);border:4px solid var(--ink);box-shadow:0 0 0 4px var(--c) inset;cursor:pointer;transition:transform .18s,box-shadow .18s;min-height:360px;font:inherit;color:var(--ink)}
.df-card:hover,.df-card.sel{transform:translate(-3px,-5px);box-shadow:0 0 0 4px var(--c) inset,6px 8px 0 var(--c)}
.df-card.sel{outline:3px solid var(--ink);outline-offset:3px}
.df-card svg{width:84px;height:84px}
.df-card b{font-family:var(--display);font-size:22px;letter-spacing:.04em;text-transform:uppercase;font-weight:normal}
.df-card small{font-size:11px;letter-spacing:.2em;text-transform:uppercase;opacity:.6}
.df-card ul{list-style:none;padding:0;margin:4px 0 0;font-size:13px;line-height:1.5}
.df-card ul li::before{content:"· ";color:var(--c);font-weight:bold}
.df-card p{margin-top:auto;font-style:italic;font-size:13px;opacity:.8;border-top:2px dashed rgba(13,11,16,.2);padding-top:8px}
.df-tag{position:absolute;top:-12px;left:50%;transform:translateX(-50%) rotate(-3deg);background:var(--c);color:#fff;font-family:var(--display);font-size:12px;letter-spacing:.14em;padding:3px 10px;border:3px solid var(--ink)}
.df-card.sudden{background:#141018;color:#f3ead8;background-image:linear-gradient(115deg,transparent 46%,rgba(255,23,68,.5) 47%,transparent 49%),linear-gradient(60deg,transparent 70%,rgba(255,23,68,.4) 71%,transparent 72%)}
.df-card.locked{cursor:not-allowed;filter:grayscale(.4)}
.df-card.locked svg{opacity:.35}
.df-lock{font-size:13px;font-style:italic;opacity:.85}
.df-pace{display:flex;gap:6px;margin-top:6px}
.df-pace button{font:inherit;font-size:12px;padding:4px 8px;border:2px solid #f3ead8;background:none;color:#f3ead8;cursor:pointer}
.df-pace button.on{background:#FF1744;border-color:#FF1744}
.df-ribbon{display:inline-block;margin-left:8px;padding:1px 8px;font-family:var(--display);font-size:11px;letter-spacing:.12em;color:#fff;border:2px solid var(--ink);vertical-align:middle;font-style:normal}
.df-star{color:#ffd700;-webkit-text-stroke:1px var(--ink);margin-left:6px;font-size:18px}
.ws-badge{display:inline-flex;align-items:center;gap:8px;margin-top:10px;padding:4px 12px 4px 6px;background:#1e1630;border:3px solid #ffd700;color:#ffd700;font-family:var(--display);font-size:13px;letter-spacing:.12em;box-shadow:0 0 18px rgba(255,215,0,.35);transform:rotate(-2deg)}
.ws-badge svg{width:26px;height:26px}
@media (max-width:860px){.df-grid{grid-template-columns:repeat(2,1fr)}.df-card{min-height:0}}`;
  document.head.appendChild(st);

  // other panels go back to the normal width
  const _open = openPanel;
  openPanel = function (html, after) { $('#panel').classList.remove('diff-mode'); ST.open = false; return _open(html, after); };

  function cardHtml(C, i) {
    const locked = C.k === 'sudden' && !anyEnding();
    return `<button class="df-card ${C.k === 'sudden' ? 'sudden' : ''} ${locked ? 'locked' : ''} ${i === ST.sel ? 'sel' : ''}" data-i="${i}" style="--c:${C.color}">
      ${C.tag ? `<span class="df-tag">${C.tag}</span>` : ''}
      <svg viewBox="0 0 100 100">${C.icon}</svg>
      <b>${C.name}${locked ? ' 🔒' : ''}</b><small>${C.sub}</small>
      ${locked ? '<span class="df-lock">Finish the game once to unlock.</span>' : `<ul>${C.rules.map(r => `<li>${r}</li>`).join('')}</ul>`}
      ${C.k === 'sudden' && !locked ? `<div class="df-pace"><button data-p="major" class="${ST.pace === 'major' ? 'on' : ''}">Major League speed</button><button data-p="world" class="${ST.pace === 'world' ? 'on' : ''}">World Series speed</button></div>` : ''}
      <p>${C.blurb}</p></button>`;
  }
  function render() {
    $('#dfGrid').innerHTML = CARDS.map(cardHtml).join('');
    $$('#dfGrid .df-card').forEach(b => b.addEventListener('click', e => {
      const p = e.target.closest('[data-p]'), i = +b.dataset.i;
      if (b.classList.contains('locked')) { Sfx.back ? Sfx.back() : null; return; }
      if (p) ST.pace = p.dataset.p;
      ST.sel = i; Sfx.tick(); render();
    }));
    const C = CARDS[ST.sel];
    $('#dfGo').textContent = C.k === 'sudden' ? 'Play Ball! · One Life' : 'Play Ball!';
  }
  function start() {
    const C = CARDS[ST.sel], key = C.k === 'sudden' ? 'sudden-' + ST.pace : C.k;
    try {
      localStorage.setItem('ei_newdiff', key);
      if (C.k === 'sudden') localStorage.setItem('ei_newmode', 'sudden'); else localStorage.removeItem('ei_newmode');
    } catch (e) { logErr('menu-difficulty: store', e); }
    bootGame('the Scrapyard Dugout', 'zone1.html#new');
  }
  ACTIONS.new = () => {
    try { localStorage.removeItem('ei_newmode'); localStorage.removeItem('ei_newdiff'); } catch (e) { logErr('menu-difficulty: clear', e); }
    ST.sel = 1; ST.pace = 'major';
    openPanel(`<div class="confirm"><h2>Step Up to the Plate?<small>A new climb up The Spire begins in the Scrapyard Dugout. The difficulty stays with this save.</small></h2><div class="rule"></div>
      <div class="df-grid" id="dfGrid"></div>
      <div class="btns"><button class="btn" onclick="closePanel()">Not yet</button><button class="btn primary" id="dfGo">Play Ball!</button></div></div>`, () => {
      $('#panel').classList.add('diff-mode'); ST.open = true; ST.at = performance.now();
      $('#dfGo').addEventListener('click', start);
      render();
    });
  };
  addEventListener('keydown', e => {
    if (!ST.open || e.repeat || performance.now() - (ST.at || 0) < 250 || !$('#panelWrap').classList.contains('open') || !$('#dfGrid')) return;
    const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (d) {
      e.preventDefault(); let i = ST.sel;
      for (let n = 0; n < CARDS.length; n++) { i = (i + d + CARDS.length) % CARDS.length; if (!(CARDS[i].k === 'sudden' && !anyEnding())) break; }
      ST.sel = i; Sfx.tick(); render();
    } else if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && CARDS[ST.sel].k === 'sudden') { e.preventDefault(); ST.pace = ST.pace === 'major' ? 'world' : 'major'; Sfx.tick(); render(); }
    else if (e.key === 'Enter') { e.preventDefault(); start(); }
  });

  /* ---------- what difficulty a save is on ---------- */
  const S = readSave(), q = S && S.q;
  const saveDiff = () => !q ? null : q.diff || (q.sudden ? 'sudden' : 'major');
  const ribbon = () => {
    const k = saveDiff(); if (!k || !DF_NAMES[k]) return '';
    const [n, c] = DF_NAMES[k], pace = k === 'sudden' ? (q.pace === 'world' ? ' · WS speed' : '') : '';
    return `<span class="df-ribbon" style="background:${c}${k === 'world' ? ';color:#0d0b10' : ''}">${n.toUpperCase()}${pace}</span>${q.wsStar ? '<span class="df-star" title="World Series cleared">★</span>' : ''}`;
  };
  const meta = document.querySelector('[data-action="continue"] .mi-meta');
  if (meta && q && saveDiff() !== 'sudden') meta.textContent += ' · ' + DF_NAMES[saveDiff()][0] + (q.wsStar ? ' ★' : '');
  const _load = ACTIONS.load;
  ACTIONS.load = () => {
    _load();
    const s = $('#panelBody .slot'); if (!s || !q) return;
    const b = s.querySelector('b'); if (b) b.insertAdjacentHTML('beforeend', ribbon());
  };

  /* ---------- the World Series Badge under the logo ---------- */
  let ws = false; try { ws = localStorage.getItem('ei_ws_badge') === '1'; } catch (e) { logErr('menu-difficulty: badge', e); }
  if (ws) {
    const logo = document.querySelector('#menu .logo'); if (logo) logo.insertAdjacentHTML('beforeend',
      '<div class="ws-badge"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" fill="#6a3aa8" stroke="#ffd700" stroke-width="8"/><path d="M50 18 L59 40 L82 40 L64 54 L71 77 L50 63 L29 77 L36 54 L18 40 L41 40 Z" fill="#ffd700" stroke="#0d0b10" stroke-width="3"/></svg>WORLD SERIES BADGE</div>');
  }
})();
