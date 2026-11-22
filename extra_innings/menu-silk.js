/* =========================================================
   MAIN MENU · the Silksong house style
   · no hard boxes: text floats over a soft ink haze (#0B0D13 at 85%)
     that fades out at the edges
   · ivory (#FFF8EB) active text with a faint gold glow, parchment
     grey (#9E9689) when idle, matt gold (#C5A059) filigree and flame
     red (#FF3B30) accents
   · serif titles with 0.12em tracking, monospace for numbers
   · a centred floating menu; a pair of filigree curls slides out
     beside the selected word
   · a filigree rule with a stitched diamond under the title
   · the five ending cups in a row at the bottom
   · a control bar that switches to gamepad buttons when a pad is used
   · panels fade in over 0.2 s and rise 10 px; ornaments breathe
   Loaded last on index.html.
   ========================================================= */
(function () {
  const SERIF = '"Cinzel", "Trajan Pro", "Playfair Display", "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';
  const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
  // one curl, drawn facing right; the left one is mirrored
  const CURL = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 24"><g fill="none" stroke="#C5A059" stroke-width="1.6" stroke-linecap="round"><path d="M2 12 H34 Q46 12 48 6 Q50 1 45 1 Q40 1 41 6 Q42 10 47 10"/><path d="M34 12 Q46 12 50 18 Q53 23 58 20"/><path d="M14 12 Q20 6 26 12"/></g><path d="M60 12 l3 -3 l3 3 l-3 3z" fill="#FF3B30" transform="translate(-4 0)"/></svg>')}")`;
  const FILI = '<svg class="silk-fili" viewBox="0 0 420 30" aria-hidden="true"><g fill="none" stroke="#C5A059" stroke-width="1.4" stroke-linecap="round"><path d="M10 15 Q105 4 190 15"/><path d="M230 15 Q315 4 410 15"/><path d="M40 17 Q120 24 186 17"/><path d="M234 17 Q300 24 380 17"/><path d="M186 15 q-8 -9 -16 -2 M234 15 q8 -9 16 -2"/></g><path d="M210 4 L221 15 L210 26 L199 15 Z" fill="#0B0D13" stroke="#C5A059" stroke-width="1.6"/><path d="M204 11 l4 2 M204 19 l4 -2 M216 11 l-4 2 M216 19 l-4 -2" stroke="#FF3B30" stroke-width="1.4" stroke-linecap="round"/></svg>';

  const st = document.createElement('style');
  st.textContent = `
:root{--silk-ink:#0B0D13;--silk-ivory:#FFF8EB;--silk-grey:#9E9689;--silk-gold:#C5A059;--silk-red:#FF3B30;--silk-serif:${SERIF};--silk-mono:${MONO}}
@keyframes silkBreathe{0%,100%{opacity:.62}50%{opacity:1}}
@keyframes silkIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}

/* ---- the menu: one centred column ---- */
#menu{justify-content:center}
#menu .menu-left{flex:0 1 auto;width:100%;align-items:center;gap:3.2vh}
#menu .menu-right,#menu .hype-meter,#menu .quote-card{display:none!important}
#menu::before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse 46% 62% at 50% 46%,rgba(11,13,19,.85),rgba(11,13,19,.55) 55%,rgba(11,13,19,0) 100%)}
#menu .logo.small{text-align:center;position:relative}
#menu .logo.small .logo-top{font-family:var(--silk-serif);font-size:clamp(14px,1.5vw,20px);letter-spacing:.9em;padding-left:.9em;color:var(--silk-grey)}
#menu .logo.small .logo-main{font-family:var(--silk-serif);font-weight:600;letter-spacing:.12em;padding-left:.12em;font-size:clamp(52px,7vw,104px);transform:none;-webkit-text-stroke:0;
  background:linear-gradient(180deg,#FFF8EB 0%,#F1E2C2 38%,#C5A059 62%,#8C6A32 100%);-webkit-background-clip:text;background-clip:text;color:transparent;
  text-shadow:none;filter:drop-shadow(0 2px 0 rgba(0,0,0,.6)) drop-shadow(0 0 22px rgba(197,160,89,.28))}
#menu .logo.small .logo-main::after{display:none}
.silk-fili{display:block;width:min(420px,70vw);height:30px;margin:10px auto 0;animation:silkBreathe 6s ease-in-out infinite}

/* ---- floating menu words ---- */
#menu .menu-list{align-items:center;max-width:none;gap:4px}
#menu .mi{display:flex;flex-direction:column;align-items:center;padding:6px 74px;text-align:center;background:none}
#menu .mi::before,#menu .mi::after{content:"";position:absolute;inset:auto;top:50%;width:56px;height:22px;margin-top:-17px;background:${CURL} center/contain no-repeat;box-shadow:none;opacity:0;transition:transform .3s cubic-bezier(.2,.9,.2,1),opacity .25s;z-index:0}
#menu .mi::before{right:calc(50% + var(--half,90px));transform:translateX(18px) scaleX(-1)}
#menu .mi::after{left:calc(50% + var(--half,90px));transform:translateX(-18px)}
#menu .mi.sel::before{opacity:1;transform:translateX(0) scaleX(-1)}
#menu .mi.sel::after{opacity:1;transform:translateX(0)}
#menu .mi-num{display:none}
#menu .mi-label{font-family:var(--silk-serif);font-size:clamp(20px,2.1vw,28px);letter-spacing:.12em;text-transform:uppercase;color:var(--silk-grey);transition:color .2s,text-shadow .2s;transform:none!important}
#menu .mi.sel .mi-label{color:var(--silk-ivory);text-shadow:0 0 14px rgba(197,160,89,.55),0 0 2px rgba(255,248,235,.6)}
#menu .mi-meta{font-family:var(--silk-serif);font-style:italic;font-size:12px;letter-spacing:.06em;color:var(--silk-grey);height:0;opacity:0;transform:none;transition:opacity .2s,height .2s}
#menu .mi.sel .mi-meta{height:16px;opacity:.85;color:var(--silk-gold)}
#menu .mi.danger.sel .mi-label{color:#ffd9d4}

/* ---- the five ending cups ---- */
.silk-cups{position:absolute;left:0;right:0;bottom:64px;display:flex;justify-content:center;align-items:flex-end;gap:22px;pointer-events:auto}
.silk-cups .trophies{display:flex;align-items:flex-end;gap:22px}
.silk-cups .trophies svg{width:30px;height:30px}
.silk-cups .trophies i{cursor:help;display:block}
.silk-cups .trophies i.on svg{filter:drop-shadow(0 0 8px rgba(242,193,78,.75))}
.silk-cups .trophies b{font-family:var(--silk-mono);font-weight:400;font-size:12px;color:var(--silk-grey);margin-left:4px}

/* ---- the control bar ---- */
#menu .menu-foot{left:0;right:0;bottom:22px;justify-content:center;gap:28px;font-family:var(--silk-serif);font-size:12px;letter-spacing:.12em;color:var(--silk-grey)}
.silk-bar{position:fixed;left:0;right:0;bottom:18px;z-index:30;display:none;justify-content:center;gap:28px;font-family:var(--silk-serif);font-size:12px;letter-spacing:.12em;color:var(--silk-grey);pointer-events:none}
.panel-wrap.open ~ .silk-bar,body.silk-panel .silk-bar{display:flex}
body.silk-panel #menu .menu-foot{visibility:hidden}
.silk-key{display:inline-block;min-width:22px;padding:1px 6px;margin-right:6px;font-family:var(--silk-mono);font-size:11px;color:var(--silk-ivory);border:1px solid rgba(197,160,89,.7);border-radius:4px;text-align:center}
.silk-key.pad{border-radius:50%;min-width:20px;padding:1px 4px}
#menu .menu-foot .ver{position:absolute;right:4vw;bottom:0;font-family:var(--silk-serif);opacity:.4}

/* ---- the panels themselves: silk-ui.js (one style shared with the game) ---- */
.panel-wrap{background:rgba(11,13,19,.6)}
#panel.silk-in{animation:silkIn .2s ease-out both}

/* ---- the difficulty cards, in the same style ---- */
.df-card{background:linear-gradient(180deg,rgba(255,248,235,.05),rgba(11,13,19,0));color:var(--silk-ivory);border:0;border-top:2px solid var(--c);box-shadow:none}
.df-card:hover,.df-card.sel{box-shadow:0 -1px 24px -6px var(--c);transform:translateY(-4px)}
.df-card.sel{outline:1px solid var(--c);outline-offset:4px}
.df-card b{font-family:var(--silk-serif);letter-spacing:.12em;font-size:18px}
.df-card small,.df-card p{color:var(--silk-grey)}
.df-card p{border-top:1px solid rgba(197,160,89,.25)}
.df-tag{border:0;font-family:var(--silk-serif);transform:translateX(-50%)}
`;
  document.head.appendChild(st);
  document.body.classList.add('silk');

  /* ---------- title ornament, cups, control bar ---------- */
  const logo = document.querySelector('#menu .logo.small');
  if (logo && !logo.querySelector('.silk-fili')) logo.insertAdjacentHTML('beforeend', FILI);
  const cups = document.getElementById('menuTrophies');
  if (cups) { const row = document.createElement('div'); row.className = 'silk-cups'; row.appendChild(cups); document.getElementById('menu').appendChild(row); }
  // each word's curls sit just outside the word itself
  const fit = () => document.querySelectorAll('#menu .mi').forEach(m => { const l = m.querySelector('.mi-label'); if (l && l.offsetWidth) m.style.setProperty('--half', Math.round(l.offsetWidth / 2 + 14) + 'px'); });
  addEventListener('resize', fit); setTimeout(fit, 50); setTimeout(fit, 900);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);

  const KEYS = { nav: ['W/S', 'Navigate'], ok: ['Enter', 'Select'], tab: ['Q/E', 'Tab'], back: ['Esc', 'Back'] };
  // pad names follow the controller in hand (pad.js): A/B on Xbox, ✕/○ on PlayStation, B/A on Nintendo
  const PADK_N = i => (typeof padN === 'function' ? padN(i) : ['A', 'B', 'X', 'Y', 'LB', 'RB'][i]);
  const padk = () => ({ nav: ['✚', 'Navigate'], ok: [PADK_N(0), 'Select'], tab: [PADK_N(4) + '/' + PADK_N(5), 'Tab'], back: [PADK_N(1), 'Back'] });
  let padMode = false;
  const barHtml = () => Object.keys(KEYS).map(k => { const [key, what] = (padMode ? padk() : KEYS)[k]; return `<span><span class="silk-key ${padMode && key.length === 1 ? 'pad' : ''}">${key}</span>${what}</span>`; }).join('');
  const foot = document.querySelector('#menu .menu-foot'), ver = foot && foot.querySelector('.ver');
  const bar = document.createElement('div'); bar.className = 'silk-bar'; document.body.appendChild(bar);
  const drawBars = () => {
    if (foot) { foot.innerHTML = barHtml(); if (ver) foot.appendChild(ver); }
    bar.innerHTML = barHtml();
  };
  drawBars();
  const setPad = on => { if (padMode === on) return; padMode = on; drawBars(); };
  addEventListener('keydown', () => setPad(false), true);
  addEventListener('mousemove', () => setPad(false), { passive: true });
  addEventListener('gamepadconnected', () => setPad(true));
  (function watchPad() {
    const p = navigator.getGamepads ? [...navigator.getGamepads()].find(Boolean) : null;
    if (p && (p.buttons.some(b => b.pressed) || p.axes.some(a => Math.abs(a) > 0.5))) setPad(true);
    requestAnimationFrame(watchPad);
  })();
  // the control bar sits under every open panel too
  const wrap = document.getElementById('panelWrap');
  if (wrap) new MutationObserver(() => document.body.classList.toggle('silk-panel', wrap.classList.contains('open'))).observe(wrap, { attributes: true, attributeFilter: ['class'] });

  /* ---------- soft transitions: fade out in 0.15 s, fade in while rising 10 px ---------- */
  const _open = openPanel;
  openPanel = function (html, after) {
    const r = _open.apply(this, arguments);
    try {
      gsap.killTweensOf('#panel'); gsap.killTweensOf('#panelBody > *');
      gsap.set('#panel', { clearProps: 'transform,opacity' }); gsap.set('#panelBody > *', { clearProps: 'transform,opacity' });
      const p = document.getElementById('panel'); p.classList.remove('silk-in'); void p.offsetWidth; p.classList.add('silk-in');
    } catch (e) { logErr('menu-silk: open', e); }
    return r;
  };
  closePanel = function () {
    try { Sfx.back(); } catch (e) { /* no sound */ }
    gsap.killTweensOf('#panel');
    gsap.to('#panel', { opacity: 0, y: 6, duration: 0.15, ease: 'power1.in', onComplete: () => { wrap.classList.remove('open'); gsap.set('#panel', { clearProps: 'transform,opacity' }); } });
  };
  // Q / E (and LB / RB) flip between tabs inside a panel
  const flipTab = d => {
    const tabs = [...document.querySelectorAll('#panelBody .tab')]; if (!tabs.length) return false;
    const i = Math.max(0, tabs.findIndex(t => t.classList.contains('on')));
    tabs[(i + d + tabs.length) % tabs.length].click(); return true;
  };
  addEventListener('keydown', e => {
    if (!wrap || !wrap.classList.contains('open') || e.repeat) return;
    const d = ({ q: -1, Q: -1, e: 1, E: 1 })[e.key]; if (!d) return;
    if (flipTab(d)) { e.preventDefault(); try { Sfx.tick(); } catch (x) { /* */ } }
  });
  let padPrev = {};
  (function padTabs() {
    const p = navigator.getGamepads ? [...navigator.getGamepads()].find(Boolean) : null;
    if (p && wrap && wrap.classList.contains('open')) {
      for (const [i, d] of [[4, -1], [5, 1]]) { const on = p.buttons[i] && p.buttons[i].pressed; if (on && !padPrev[i]) flipTab(d); padPrev[i] = on; }
    }
    requestAnimationFrame(padTabs);
  })();
})();

/* =========================================================
   PLAY · three tournament banners (Continue, New and Load in one)
   · a save: its difficulty ribbon on top, the zone's silhouette,
     hearts as baseballs, time played and completion
   · an empty slot: a dashed banner, NEW TOURNAMENT
   · a shattered Sudden Death save: a torn banner, a cracked ball,
     a red glow
   HALL OF LEGENDS · straight into the dream, once Coach Monfort
   has handed over the VIP ticket
   THEMES · the Themes tab of Settings
   ========================================================= */
(function () {
  const readSave = () => { try { return JSON.parse(localStorage.getItem('ei_zone1') || 'null'); } catch (e) { logErr('menu-silk: read', e); return null; } };
  const DIFF = { spring: ['Spring Training', '#4CAF50'], major: ['Major League', '#FF3B30'], world: ['World Series', '#FFD700'], sudden: ['Sudden Death', '#FF1744'] };
  const fmtT = s => { s = Math.floor(s || 0); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`; };
  const ZI = {   // one silhouette per zone, 100×60, filled in gold
    z1: '<path d="M8 56 L20 30 L30 40 L42 18 L54 38 L64 26 L78 44 L92 56Z"/><circle cx="70" cy="16" r="8" fill="none" stroke="currentColor" stroke-width="4" stroke-dasharray="4 3"/>',
    z2: '<path d="M4 56 L18 22 L34 36 L50 8 L66 34 L82 20 L96 56Z"/><path d="M40 40 l18 -12 M50 26 l12 10" stroke="#0B0D13" stroke-width="4"/>',
    z3: '<rect x="20" y="10" width="60" height="44" rx="4"/><g stroke="#0B0D13" stroke-width="4"><path d="M50 32 L36 18 M50 32 L66 20 M50 32 L50 50"/></g><circle cx="50" cy="32" r="4" fill="#0B0D13"/>',
    z4: '<path d="M50 4 Q72 26 62 40 Q74 34 72 22 Q90 44 72 56 H28 Q10 44 28 22 Q26 34 38 40 Q28 26 50 4Z"/>',
    z5: '<path d="M6 56 V24 H94 V56 H82 V36 Q76 28 70 36 V56 H58 V36 Q50 26 42 36 V56 H30 V36 Q24 28 18 36 V56Z"/><path d="M2 24 L50 6 L98 24Z"/>',
    z6: '<path d="M50 4 L66 24 L58 56 H42 L34 24Z"/><path d="M20 24 L30 34 L26 56 H14 L10 34Z M80 24 L90 34 L86 56 H74 L70 34Z"/>',
    z7: '<path d="M30 30 Q14 30 16 18 Q20 6 36 10 Q44 0 58 6 Q74 2 78 16 Q90 18 86 30Z"/><path d="M52 30 L40 46 H50 L44 60 L62 40 H52 L58 30Z"/>',
    z8: '<path d="M2 56 L30 14 L42 30 L58 6 L98 56Z"/><path d="M50 18 L58 6 L66 18 L58 22Z M24 24 L30 14 L36 24Z" fill="#0B0D13" opacity=".35"/>',
    z9: '<path d="M4 50 Q50 34 96 50 V56 H4Z"/><path d="M10 46 V22 Q50 8 90 22 V46 Q50 32 10 46Z" opacity=".75"/><path d="M20 22 V8 M80 22 V8 M50 15 V2" stroke="currentColor" stroke-width="3"/>',
    z10: '<path d="M50 2 L74 30 L50 58 L26 30Z"/><path d="M50 14 L64 30 L50 46 L36 30Z" fill="#0B0D13"/><circle cx="50" cy="30" r="5"/>',
    z12: '<path d="M6 56 H94 V50 Q78 44 64 50 Q50 56 36 50 Q22 44 6 50Z"/><path d="M18 44 V24 Q50 4 82 24 V44 H74 V28 Q50 14 26 28 V44Z"/><path d="M50 22 Q46 30 50 34 Q54 30 50 22Z"/>',
  };
  const BALL = (on, crack) => `<svg viewBox="0 0 24 24" class="sb-ball ${on ? 'on' : ''}"><circle cx="12" cy="12" r="9.5"/><path d="M7 5 Q10 12 7 19 M17 5 Q14 12 17 19" fill="none"/>${crack ? '<path class="crk" d="M12 2 L10 8 L14 12 L11 17 L13 22" fill="none"/>' : ''}</svg>`;
  const CRACKED = '<svg viewBox="0 0 100 100" class="sb-crack"><circle cx="50" cy="50" r="38" fill="#2a1416" stroke="#FF3B30" stroke-width="3"/><path d="M30 24 Q40 50 30 76 M70 24 Q60 50 70 76" fill="none" stroke="#FF3B30" stroke-width="2.5" stroke-dasharray="5 4"/><path d="M50 8 L44 30 L56 42 L46 58 L58 72 L52 92" fill="none" stroke="#FFF8EB" stroke-width="3.5" stroke-linejoin="round"/><path d="M56 42 L76 36 M46 58 L24 62" fill="none" stroke="#FFF8EB" stroke-width="2.5"/></svg>';
  const ROMAN = ['I', 'II', 'III'];

  QUOTES.play = ['"Three banners. All of them mine. Obviously."', 'Nathan'];
  QUOTES.legends = ['"Play ball. I\'ll be watching."', 'The Umpire'];
  QUOTES.themes = ['"I reskinned the menu. You\'re welcome."', 'Josh'];
  { const S = readSave(), m = document.querySelector('[data-action="play"] .mi-meta');
    if (m && S) { const s = savedSpot(); m.textContent = S.q && S.q.sudden && S.shattered ? 'A banner lies torn · Sudden Death' : `${s.zone} · ${s.title}`; } }

  const st = document.createElement('style');
  st.textContent = `
.panel.silk-banners{width:min(980px,96vw)}
.sb-row{display:grid;grid-template-columns:repeat(3,1fr);gap:26px;margin:18px 0 4px;align-items:start}
.sb{position:relative;display:flex;flex-direction:column;align-items:center;gap:10px;padding:34px 16px 46px;min-height:400px;font:inherit;color:var(--silk-ivory);cursor:pointer;border:0;text-align:center;
  background:linear-gradient(180deg,rgba(197,160,89,.16),rgba(197,160,89,.05) 70%,rgba(197,160,89,.1));
  clip-path:polygon(0 0,100% 0,100% calc(100% - 26px),50% 100%,0 calc(100% - 26px));transition:transform .2s ease-out,filter .2s}
.sb::before{content:"";position:absolute;inset:4px 4px 0;clip-path:polygon(0 0,100% 0,100% calc(100% - 24px),50% 100%,0 calc(100% - 24px));border-top:1px solid var(--silk-gold);
  background:linear-gradient(180deg,rgba(11,13,19,.92),rgba(20,22,32,.92));z-index:-1}
.sb{isolation:isolate}
.sb:hover,.sb.sel{transform:translateY(-6px);filter:drop-shadow(0 0 14px rgba(197,160,89,.45))}
.sb-rod{position:absolute;top:0;left:-6px;right:-6px;height:4px;background:linear-gradient(90deg,transparent,var(--silk-gold) 10%,var(--silk-gold) 90%,transparent)}
.sb-n{font-family:var(--silk-serif);font-size:13px;letter-spacing:.4em;color:var(--silk-gold);padding-left:.4em}
.sb-rib{position:absolute;top:10px;left:50%;transform:translateX(-50%);padding:2px 14px;font-family:var(--silk-serif);font-size:10px;letter-spacing:.18em;color:#fff;white-space:nowrap;clip-path:polygon(0 0,100% 0,94% 50%,100% 100%,0 100%,6% 50%)}
.sb-icon{width:120px;height:72px;color:var(--silk-gold);fill:currentColor;margin-top:16px;filter:drop-shadow(0 0 8px rgba(197,160,89,.35))}
.sb b{font-family:var(--silk-serif);font-weight:600;font-size:18px;letter-spacing:.12em;text-transform:uppercase;line-height:1.25}
.sb small{font-family:var(--silk-serif);font-style:italic;font-size:12px;color:var(--silk-grey)}
.sb-hp{display:flex;flex-wrap:wrap;justify-content:center;gap:3px;max-width:180px}
.sb-ball{width:16px;height:16px}
.sb-ball circle{fill:rgba(158,150,137,.18);stroke:rgba(158,150,137,.6);stroke-width:1.5}
.sb-ball path{stroke:rgba(158,150,137,.6);stroke-width:1.3;stroke-dasharray:2 1.6}
.sb-ball.on circle{fill:#FFF8EB;stroke:#C5A059}
.sb-ball.on path{stroke:#FF3B30}
.sb-ball .crk{stroke:#0B0D13;stroke-dasharray:none;stroke-width:1.6}
.sb-stats{display:flex;gap:18px;margin-top:auto;font-family:var(--silk-mono);font-size:14px;color:var(--silk-ivory)}
.sb-stats span{display:flex;flex-direction:column;align-items:center;gap:2px}
.sb-stats em{font-family:var(--silk-serif);font-style:normal;font-size:9px;letter-spacing:.2em;color:var(--silk-grey)}
.sb-star{color:#FFD700;text-shadow:0 0 8px rgba(255,215,0,.6)}
.sb.empty{background:none}
.sb.empty::before{background:rgba(11,13,19,.5);border:1px dashed rgba(197,160,89,.55);border-bottom:0}
.sb.empty .sb-plus{margin-top:70px;width:54px;height:54px;border:1px dashed var(--silk-gold);border-radius:50%;display:grid;place-items:center;font-family:var(--silk-serif);font-size:30px;color:var(--silk-gold);animation:silkBreathe 4s ease-in-out infinite}
.sb.empty b{color:var(--silk-grey)}.sb.empty:hover b,.sb.empty.sel b{color:var(--silk-ivory)}
.sb.torn{clip-path:polygon(0 0,100% 0,100% 58%,88% 66%,96% 74%,80% 86%,62% 80%,50% 96%,36% 82%,20% 90%,8% 76%,0 82%);filter:drop-shadow(0 0 16px rgba(255,59,48,.45))}
.sb.torn::before{clip-path:none;inset:4px;background:linear-gradient(180deg,rgba(40,10,14,.95),rgba(11,13,19,.95));border-color:#FF3B30}
.sb.torn .sb-rod{background:linear-gradient(90deg,transparent,#FF3B30 10%,#FF3B30 90%,transparent)}
.sb.torn:hover,.sb.torn.sel{filter:drop-shadow(0 0 24px rgba(255,59,48,.7))}
.sb-crack{width:90px;height:90px;margin-top:18px}
.sb.torn b{color:#ffd9d4}
.sb-col{display:flex;flex-direction:column;align-items:stretch;gap:10px}
.sb-del,.sb-del-gap{height:28px}
.sb-del{align-self:center;padding:0 14px;font-family:var(--silk-serif);font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--silk-grey);background:none;border:1px solid rgba(158,150,137,.3);cursor:pointer;transition:color .2s,border-color .2s}
.sb-del:hover,.sb-del:focus-visible{color:#FF3B30;border-color:rgba(255,59,48,.65)}
.sb-hint{margin-top:10px;text-align:center;font-family:var(--silk-serif);font-style:italic;font-size:12px;color:var(--silk-grey)}
.sb-acts{display:flex;justify-content:center;gap:8px}
.sb-ico:hover,.sb-ico:focus-visible{color:var(--silk-gold);border-color:rgba(197,160,89,.7)}
.sb-badge{position:absolute;top:12px;left:14px;width:40px;height:40px;display:grid;place-items:center;color:var(--silk-gold);border:1px solid var(--silk-gold);border-radius:50%;background:rgba(11,13,19,.85);box-shadow:0 0 10px rgba(197,160,89,.35)}
.sb-icons{display:grid;grid-template-columns:repeat(8,1fr);gap:10px;margin:18px auto 6px;max-width:520px}
.sb-icopt{aspect-ratio:1;display:grid;place-items:center;color:var(--silk-ivory,#E6DFD0);background:rgba(11,13,19,.6);border:1px solid rgba(158,150,137,.3);border-radius:50%;cursor:pointer;transition:transform .15s,border-color .15s,box-shadow .15s}
.sb-icopt:hover,.sb-icopt:focus-visible{transform:translateY(-3px);border-color:var(--silk-gold);outline:none}
.sb-icopt.on{border-color:var(--silk-gold);box-shadow:0 0 12px rgba(197,160,89,.5)}
.sb-badge svg,.sb-icopt svg,.sb-ico svg{fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.sb-badge svg{width:24px;height:24px}
.sb-icopt svg{width:60%;height:60%}
.sb-icopt:hover,.sb-icopt:focus-visible,.sb-icopt.on{color:var(--silk-gold)}
.sb-ico svg{width:13px;height:13px;vertical-align:-2px}
.sb-icname{min-height:20px;margin:4px 0 0;text-align:center;font-family:var(--silk-serif);font-style:italic;font-size:14px;color:var(--silk-gold)}
@media (max-width:560px){.sb-icons{grid-template-columns:repeat(4,1fr)}}
.lg-door{display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center}
.lg-door svg{width:120px;height:120px;filter:drop-shadow(0 0 14px rgba(255,215,0,.45));animation:silkBreathe 5s ease-in-out infinite}
.lg-door p{font-family:var(--silk-serif);font-style:italic;color:var(--silk-grey);max-width:520px}
.lg-door .lg-stat{font-family:var(--silk-mono);font-style:normal;color:var(--silk-ivory)}
@media (max-width:820px){.sb-row{grid-template-columns:1fr}.sb{min-height:0}}`;
  document.head.appendChild(st);

  /* ---------- three save slots ----------
     The game only ever reads and writes 'ei_zone1' (the slot being played). Each slot keeps its own
     copy in 'ei_slot_0..2'; 'ei_slot_active' says which one 'ei_zone1' belongs to. Coming back to the
     menu copies the played save into its slot, picking another slot swaps it in. Trophies, endings
     and settings stay shared between slots. */
  const SK = i => 'ei_slot_' + i, ACT = 'ei_slot_active';
  const LS = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { logErr('menu-silk: slot read', e); return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { logErr('menu-silk: slot write', e); } },
    del: k => { try { localStorage.removeItem(k); } catch (e) { logErr('menu-silk: slot delete', e); } },
  };
  let active = +(LS.get(ACT) || 0);
  {
    const cur = LS.get('ei_zone1');
    if (LS.get(ACT) === null) LS.set(ACT, '0');                 // an old single save becomes slot I
    if (cur) LS.set(SK(active), cur);
    else if (LS.get(SK(active))) LS.set('ei_zone1', LS.get(SK(active)));
  }
  const readSlot = i => { try { return JSON.parse(LS.get(SK(i)) || 'null'); } catch (e) { logErr('menu-silk: slot parse', e); return null; } };
  function activate(i) {
    if (i === active) return;
    const cur = LS.get('ei_zone1'); if (cur) LS.set(SK(active), cur);
    const s = LS.get(SK(i)); if (s) LS.set('ei_zone1', s); else LS.del('ei_zone1');
    active = i; LS.set(ACT, String(i));
  }
  function deleteSlot(i) {
    LS.del(SK(i)); setIcon(i, null);
    if (i === active) LS.del('ei_zone1');
    const m = document.querySelector('[data-action="play"] .mi-meta'), S = readSave();
    if (m && !S) m.textContent = 'No climb yet';
  }
  // a badge per slot so you can tell your saves apart (kept beside the saves, never inside them)
  // hand-drawn line badges (24×24, gold ink), one for each corner of the game
  const ICONS = {
    ball:    ['Baseball', '<circle cx="12" cy="12" r="9"/><path d="M7 5.5c2 2 2 11 0 13M17 5.5c-2 2-2 11 0 13"/><path d="M6.6 9h1.6M6.6 15h1.6M15.8 9h1.6M15.8 15h1.6"/>'],
    bat:     ['The Spare Bat', '<path d="M4.5 19.5l2-2M6 18l9.5-11.5a2.6 2.6 0 0 1 3.9 3.4L8 19.5z"/><circle cx="4" cy="20" r="1"/>'],
    cap:     ['Nathan\'s Cap', '<path d="M4 15a8 8 0 0 1 16 0z"/><path d="M4 15h17.5c.6 0 .8 1.2 0 1.6L15 18"/><path d="M12 7v-1"/>'],
    glove:   ['Glove', '<path d="M7 20v-7L5 9.5a1.5 1.5 0 0 1 2.6-1.5L9 10V5a1.5 1.5 0 0 1 3 0v4-5a1.5 1.5 0 0 1 3 0v5-3a1.5 1.5 0 0 1 3 0v8c0 4-3 6-6 6z"/>'],
    plate:   ['Home Plate', '<path d="M5 6h14v7l-7 6-7-6z"/><path d="M8 9h8"/>'],
    diamond: ['The Diamond', '<path d="M12 3l9 9-9 9-9-9z"/><circle cx="12" cy="12" r="2"/><path d="M12 3v2M21 12h-2M12 21v-2M3 12h2"/>'],
    trophy:  ['Trophy', '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4"/><path d="M12 13v4M8.5 20h7M10 17h4v3h-4z"/>'],
    spire:   ['The Spire', '<path d="M12 2l3 7h-6zM9 9h6l1.5 12h-9z"/><path d="M9.6 14h4.8M9 18h6"/>'],
    bell:    ['Renas\'s Bell', '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0M12 3v2"/>'],
    wrench:  ['Josh\'s Wrench', '<path d="M14.5 4.5a4 4 0 0 0 5 5L10 19a2.1 2.1 0 0 1-3-3l9.5-9.5a4 4 0 0 1-2-2z"/><circle cx="8.5" cy="17.5" r=".6"/>'],
    rocket:  ['KA-BOOM', '<path d="M12 3c3 2 4 6 3 11H9C8 9 9 5 12 3z"/><path d="M9 14l-2 3h3M15 14l2 3h-3M11 17l1 4 1-4"/><circle cx="12" cy="9" r="1.4"/>'],
    teapot:  ['Deniz\'s Tea', '<path d="M5 11h12v3a6 6 0 0 1-12 0z"/><path d="M17 12h1.5a2 2 0 0 1 0 4H16.5M5 13l-2.5-2.5M9 11a2 2 0 0 1 4 0M11 6c-1-1 1-2 0-3"/>'],
    cat:     ['Lars\'s Cat', '<path d="M5 9L4 3l4.5 3.5h7L20 3l-1 6c1 1.5 1 3 1 4a8 5.5 0 0 1-16 0c0-1 0-2.5 1-4z"/><path d="M9 12.5v.5M15 12.5v.5M11 15.5l1 .7 1-.7"/>'],
    drone:   ['Byte', '<circle cx="12" cy="13" r="6"/><rect x="9" y="11" width="6" height="3.6" rx="1.5"/><path d="M12 7V4.5M7.5 4.5h9"/>'],
    fire:    ['Campfire', '<path d="M12 3c1 3 5 5 5 9.5A5 5 0 0 1 7 12.5c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-8.5z"/><path d="M5 21l14-3M19 21L5 18"/>'],
    crown:   ['World Series', '<path d="M4 18L3 7l5 4 4-6 4 6 5-4-1 11z"/><path d="M4 21h16"/><circle cx="12" cy="13" r="1.2"/>'],
  };
  const ICON_IDS = Object.keys(ICONS);
  const iconSvg = id => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[id][1]}</svg>`;
  const ICON_KEY = 'ei_slot_icons';
  const icons = () => { try { return JSON.parse(LS.get(ICON_KEY) || '{}') || {}; } catch (e) { return {}; } };
  const iconOf = i => { const id = icons()[i]; return ICONS[id] ? id : null; };   // older emoji picks just fall away
  function setIcon(i, ic) { const m = icons(); if (ic) m[i] = ic; else delete m[i]; LS.set(ICON_KEY, JSON.stringify(m)); }
  // a new game always lands in the slot it was started from, never on top of another save
  let pendingNew = null;
  const _boot = bootGame;
  bootGame = function (where, url) {
    if (typeof url === 'string' && /#new$/.test(url) && pendingNew !== null) { activate(pendingNew); LS.del('ei_zone1'); LS.del(SK(pendingNew)); setIcon(pendingNew, null); }
    pendingNew = null;
    return _boot.apply(this, arguments);
  };
  const spotOf = z => { const s = SPOTS[z] || SPOTS.z1; return { title: s[0], name: 'the ' + s[0].replace(/^The /, ''), zone: s[1], short: (SPOTS[z] ? z : 'z1').toUpperCase(), url: s[2] }; };

  const PB = { open: false, sel: 0, at: 0 };
  function saveBanner(S, n) {
    const q = S.q || {}, sp = spotOf(S.where), k = q.diff || (q.sudden ? 'sudden' : 'major'), [dn, dc] = DIFF[k] || DIFF.major;
    if (q.sudden && S.shattered) return `<button class="sb torn" data-go="torn" data-i="${n}"><i class="sb-rod"></i><span class="sb-rib" style="background:#FF1744">SUDDEN DEATH</span>
      ${CRACKED}<span class="sb-n">${ROMAN[n]}</span><b>Shattered</b><small>${sp.title} · one life, spent</small>
      <div class="sb-stats"><span>${fmtT(S.time)}<em>PLAYED</em></span><span>${S.deaths || 1}<em>STRIKEOUT</em></span></div></button>`;
    const max = Math.max(1, Math.min(14, q.lastMax || (k === 'spring' ? 7 : 5))), hp = Math.min(max, q.lastHp === undefined ? max : q.lastHp);
    const pace = k === 'sudden' && q.pace === 'world' ? ' · WS SPEED' : '';
    return `<button class="sb" data-go="cont" data-i="${n}"><i class="sb-rod"></i><span class="sb-rib" style="background:${dc}${k === 'world' ? ';color:#0B0D13' : ''}">${dn.toUpperCase()}${pace}</span>
      <svg class="sb-icon" viewBox="0 0 100 60">${ZI[S.where] || ZI.z1}</svg>
      <span class="sb-n">${ROMAN[n]}</span><b>${sp.title}</b><small>Act ${actOf(sp.short)} · ${sp.zone}${q.wsStar ? ' · <span class="sb-star">★</span>' : ''}</small>
      <div class="sb-hp">${Array.from({ length: max }, (_, i) => BALL(i < hp)).join('')}</div>
      <div class="sb-stats"><span>${fmtT(S.time)}<em>PLAYED</em></span><span>${q.lastPct === undefined ? '—' : q.lastPct + '%'}<em>COMPLETE</em></span></div></button>`;
  }
  const emptyBanner = n => `<button class="sb empty" data-go="new" data-i="${n}"><i class="sb-rod"></i><span class="sb-plus">+</span><span class="sb-n">${ROMAN[n]}</span><b>New Tournament</b><small>Start a new climb up the Spire</small></button>`;
  const slotCol = n => {
    const S = readSlot(n), ic = S && iconOf(n);
    let banner = S ? saveBanner(S, n) : emptyBanner(n);
    if (ic) banner = banner.replace('<i class="sb-rod"></i>', `<i class="sb-rod"></i><span class="sb-badge">${iconSvg(ic)}</span>`);
    const acts = S ? `<div class="sb-acts"><button class="sb-del sb-ico" data-ico="${n}">${ic ? iconSvg(ic) : '◇'} Icon</button><button class="sb-del" data-del="${n}">✕ Delete save</button></div>` : '<span class="sb-del-gap"></span>';
    return `<div class="sb-col">${banner}${acts}</div>`;
  };
  function askIcon(i) {
    const S = readSlot(i); if (!S) return;
    const cur = iconOf(i);
    Sfx.tick();
    openPanel(`<div class="confirm"><h2>Banner ${ROMAN[i]} · Pick an Icon<small>Stitched onto the banner so you know which climb is which.</small></h2><div class="rule"></div>
      <div class="sb-icons" id="sbIcons">${ICON_IDS.map(c => `<button class="sb-icopt ${c === cur ? 'on' : ''}" data-c="${c}" title="${ICONS[c][0]}" aria-label="${ICONS[c][0]}">${iconSvg(c)}</button>`).join('')}</div>
      <p class="sb-icname" id="sbIcName">${cur ? ICONS[cur][0] : '&nbsp;'}</p>
      <div class="btns"><button class="btn" id="sbIcoBack">Back</button><button class="btn" id="sbIcoNone">No icon</button></div></div>`, () => {
      const nm = $('#sbIcName'), say = c => { nm.textContent = ICONS[c][0]; };
      document.querySelectorAll('#sbIcons .sb-icopt').forEach(b => {
        b.addEventListener('click', () => { setIcon(i, b.dataset.c); Sfx.select(); ACTIONS.play(i); });
        b.addEventListener('mouseenter', () => say(b.dataset.c)); b.addEventListener('focus', () => say(b.dataset.c));
      });
      $('#sbIcoNone').addEventListener('click', () => { setIcon(i, null); Sfx.back(); ACTIONS.play(i); });
      $('#sbIcoBack').addEventListener('click', () => { Sfx.back(); ACTIONS.play(i); });
      const on = $('#sbIcons .sb-icopt.on') || $('#sbIcons .sb-icopt'); if (on) on.focus();
    });
  }

  function playSlot(i) {
    const S = readSlot(i); if (!S) { newSlot(i); return; }
    activate(i); const sp = spotOf(S.where); bootGame(sp.name, sp.url);
  }
  function newSlot(i) { ACTIONS.new(); pendingNew = i; }   // set after: the new-game panel doesn't touch it
  function askDelete(i) {
    const S = readSlot(i); if (!S) return;
    const sp = spotOf(S.where);
    Sfx.back();
    openPanel(`<div class="confirm"><h2>Tear Down Banner ${ROMAN[i]}?<small>This save is gone for good. Trophies, endings and settings stay.</small></h2><div class="rule"></div>
      <p style="font-size:15px;text-align:center">${S.shattered ? 'Shattered' : sp.title} · ${sp.zone} · ${fmtT(S.time)} played</p>
      <div class="btns"><button class="btn" id="sbKeep">Keep it</button><button class="btn primary" id="sbTear">Delete Save</button></div></div>`, () => {
      $('#sbKeep').addEventListener('click', () => { Sfx.back(); ACTIONS.play(); });
      $('#sbTear').addEventListener('click', () => { deleteSlot(i); Sfx.select(); ACTIONS.play(i); });
      $('#sbKeep').focus();
    });
  }
  const GO = { cont: playSlot, new: newSlot, torn: askDelete };
  function mark() { document.querySelectorAll('#sbRow .sb').forEach((b, i) => b.classList.toggle('sel', i === PB.sel)); }
  ACTIONS.play = (sel) => {
    pendingNew = null;
    openPanel(`<h2>Choose Your Banner<small>Three tournaments hang in the dugout. Pick one and climb.</small></h2><div class="rule"></div>
      <div class="sb-row" id="sbRow">${[0, 1, 2].map(slotCol).join('')}</div>
      <p class="sb-hint"><kbd>Enter</kbd> play · <kbd>I</kbd> icon · <kbd>Del</kbd> delete the selected save</p>`, () => {
      $('#panel').classList.add('silk-banners'); PB.open = true; PB.sel = typeof sel === 'number' ? sel : active; PB.at = performance.now();
      document.querySelectorAll('#sbRow .sb').forEach((b, i) => {
        b.addEventListener('click', () => { Sfx.select(); GO[b.dataset.go](+b.dataset.i); });
        b.addEventListener('mouseenter', () => { PB.sel = i; mark(); });
      });
      document.querySelectorAll('#sbRow .sb-del[data-del]').forEach(b => b.addEventListener('click', () => askDelete(+b.dataset.del)));
      document.querySelectorAll('#sbRow .sb-ico').forEach(b => b.addEventListener('click', () => askIcon(+b.dataset.ico)));
      mark();
    });
  };
  ACTIONS.load = ACTIONS.play;
  const _op = openPanel;
  openPanel = function () { $('#panel').classList.remove('silk-banners'); PB.open = false; return _op.apply(this, arguments); };
  addEventListener('keydown', e => {
    if (!PB.open || e.repeat || performance.now() - PB.at < 250 || !$('#panelWrap').classList.contains('open') || !$('#sbRow')) return;
    const d = { ArrowRight: 1, ArrowLeft: -1, d: 1, D: 1, a: -1, A: -1 }[e.key];
    if (d) { e.preventDefault(); PB.sel = (PB.sel + d + 3) % 3; Sfx.tick(); mark(); }
    else if (e.key === 'Enter') { e.preventDefault(); const b = document.querySelectorAll('#sbRow .sb')[PB.sel]; if (b) b.click(); }
    else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); if (readSlot(PB.sel)) askDelete(PB.sel); }
    else if (e.key === 'i' || e.key === 'I') { e.preventDefault(); if (readSlot(PB.sel)) askIcon(PB.sel); }
  });

  /* ---------- Hall of Legends: sleep with the ticket ---------- */
  const DOOR = '<svg viewBox="0 0 100 100"><path d="M18 92 V40 Q50 4 82 40 V92Z" fill="#14161f" stroke="#C5A059" stroke-width="3"/><path d="M28 92 V44 Q50 18 72 44 V92" fill="none" stroke="#C5A059" stroke-width="1.5"/><rect x="34" y="52" width="32" height="18" rx="2" fill="#FFD700" stroke="#0B0D13" stroke-width="2" transform="rotate(-8 50 61)"/><path d="M38 61 H62" stroke="#0B0D13" stroke-width="1.5" stroke-dasharray="3 2" transform="rotate(-8 50 61)"/><circle cx="50" cy="28" r="4" fill="#FF3B30"/></svg>';
  ACTIONS.legends = () => {
    const S = readSave(), q = S && S.q, L = (q && q.legends) || {};
    let body, go = false;
    if (!S) body = 'There is no climb yet. Start a tournament, and one day Coach Monfort might dig up something for you.';
    else if (q.sudden && S.shattered) body = 'Your banner is torn. The Hall only opens its doors to a save that still breathes.';
    else if (!L.ticket) body = 'The doors are shut. Rumour says Coach Monfort keeps a golden VIP ticket buried under home plate at Base Camp… for players who have proven themselves.';
    else if (!q.pages) body = 'Continue your save once, then come back. The Umpire needs to know where to send you home.';
    else { go = true; body = 'The VIP ticket is under your pillow. Close your eyes, and wake up among marble statues and the rivals you\'ve already beaten.'; }
    const fame = Object.values(L.rivals || {}).reduce((n, r) => n + ['rookie', 'allstar', 'grand'].filter(t => r && r[t]).length, 0);
    openPanel(`<div class="confirm lg-door"><h2>The Hall of Legends<small>Rematches above the clouds</small></h2><div class="rule"></div>${DOOR}
      <p>${body}</p>${go && fame ? `<p class="lg-stat">${fame} rematch${fame === 1 ? '' : 'es'} won in the Hall</p>` : ''}
      <div class="btns"><button class="btn" onclick="closePanel()">Back</button>${go ? '<button class="btn primary" id="lgGo">Sleep with the Ticket</button>' : ''}</div></div>`, () => {
      const b = $('#lgGo'); if (!b) return;
      b.addEventListener('click', () => {
        const D = readSave(); if (!D || !D.q || !D.q.pages) return;
        D.q.legendsPrev = !!D.q.pages['act3.html']; D.q.pages['act3.html'] = 1; D.q.arrive = 'act3.html#legends';
        try { localStorage.setItem('ei_zone1', JSON.stringify(D)); } catch (e) { logErr('menu-silk: legends', e); return; }
        bootGame('the Hall of Legends', 'act3.html#legends');
      });
    });
  };

  /* ---------- Themes: Settings, opened on its Themes tab ---------- */
  ACTIONS.themes = () => { ACTIONS.options(); const t = document.querySelector('#panelBody .tab[data-t="themes"]'); if (t) t.click(); };
})();
