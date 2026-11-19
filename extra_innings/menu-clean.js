/* =========================================================
   MAIN MENU · the clean Silksong structure
   PLAY · (HALL OF LEGENDS, once a save holds the VIP ticket) ·
   OPTIONS · EXTRAS · QUIT
   · EXTRAS: one window with three tabs: Trophies, The Dugout
     (the friends you've met, with portrait and bio) and Credits
     (a slow roll with the victory music)
   · the ‹ Menu Style › box is gone: themes live under
     Options → Themes, where the window turns see-through and
     slides down so the backdrop changes live behind it
   · only the five ending cups at the bottom, each with a small
     floating label on hover ("???" while locked)
   · QUIT closes the window, or goes back to the title screen
   Loaded last on index.html.
   ========================================================= */
(function () {
  const readSave = () => { try { return JSON.parse(localStorage.getItem('ei_zone1') || 'null'); } catch (e) { logErr('menu-clean: read', e); return null; } };
  const st = document.createElement('style');
  st.textContent = `
#stylePick{display:none!important}
#menu .menu-list{gap:14px}
#menu .mi{padding:10px 86px}
/* the cups: no box, a floating label on hover */
.silk-cups .trophies i{position:relative}
.silk-cups .trophies i::after{content:attr(data-n);position:absolute;left:50%;bottom:calc(100% + 10px);transform:translate(-50%,4px);white-space:nowrap;pointer-events:none;
  font-family:var(--sk-serif,Georgia,serif);font-style:normal;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#FFF8EB;text-shadow:0 0 10px rgba(197,160,89,.7);opacity:0;transition:opacity .2s,transform .2s}
.silk-cups .trophies i.locked::after{color:#9E9689;text-shadow:none}
.silk-cups .trophies i:hover::after{opacity:1;transform:translate(-50%,0)}
/* Extras */
.ex-tabs{margin:0 0 6px}
.panel.ex-mode{width:min(980px,95vw)}
.dg-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:18px;margin-top:8px}
.dg-card{display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center;padding:18px 12px 16px;border:1px solid rgba(197,160,89,.22);background:rgba(255,248,235,.03)}
.dg-card .dg-face{width:72px;height:72px;border-radius:50%;display:grid;place-items:center;font-family:var(--sk-serif,Georgia,serif);font-size:30px;color:#FFF8EB;
  background:radial-gradient(circle at 35% 30%,rgba(255,248,235,.35),var(--c) 55%,#0B0D13);box-shadow:0 0 0 1px rgba(197,160,89,.7),0 0 0 5px rgba(12,14,20,.9),0 0 0 6px rgba(197,160,89,.3),0 0 18px -4px var(--c)}
.dg-card b{font-family:var(--sk-serif,Georgia,serif);font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#FFF8EB}
.dg-card small{font-family:var(--sk-serif,Georgia,serif);font-size:10px;letter-spacing:.2em;color:#C5A059}
.dg-card p{font-style:italic;font-size:13px;line-height:1.45;color:#9E9689}
.dg-card em{font-style:normal;font-size:12px;color:#FFF8EB;opacity:.75}
.dg-card.locked .dg-face{background:#14161f;color:#5a5650;box-shadow:0 0 0 1px rgba(158,150,137,.4)}
.dg-card.locked b,.dg-card.locked p{color:#5a5650}
.dg-count{text-align:center;font-family:var(--sk-mono,monospace);font-size:13px;color:#9E9689}
.cr-view{position:relative;height:min(52vh,460px);overflow:hidden;-webkit-mask-image:linear-gradient(transparent,#000 14%,#000 86%,transparent);mask-image:linear-gradient(transparent,#000 14%,#000 86%,transparent)}
.cr-roll{position:absolute;left:0;right:0;top:100%;text-align:center;animation:crRoll 42s linear infinite}
.cr-roll h3{font-family:var(--sk-serif,Georgia,serif);font-weight:600;font-size:30px;letter-spacing:.14em;color:#FFF8EB;text-shadow:0 0 16px rgba(197,160,89,.5);margin-bottom:28px}
.cr-roll h4{font-family:var(--sk-serif,Georgia,serif);font-size:11px;letter-spacing:.26em;color:#C5A059;margin-top:22px}
.cr-roll p{font-size:18px;color:#FFF8EB;margin-top:4px}
.cr-roll i{display:block;width:6px;height:6px;margin:26px auto 0;background:#C5A059;transform:rotate(45deg);opacity:.6}
.cr-view:hover .cr-roll{animation-play-state:paused}
@keyframes crRoll{to{transform:translateY(calc(-100% - min(52vh,460px)))}}
.cr-note{text-align:center;font-style:italic;font-size:13px;color:#9E9689;margin-top:10px}
/* Options → Themes: see-through, lowered, so the menu backdrop shows live */
/* the style cards under Options → Themes */
#themePane .theme{background:rgba(255,248,235,.03);color:#FFF8EB;border:1px solid rgba(197,160,89,.25);box-shadow:none;transform:none;transition:border-color .2s,box-shadow .2s}
#themePane .theme:not(.locked):hover{transform:none;border-color:#C5A059;box-shadow:0 0 18px -6px rgba(197,160,89,.8)}
#themePane .theme.on{outline:0;border-color:#C5A059;box-shadow:inset 0 0 0 1px #C5A059,0 0 22px -6px rgba(197,160,89,.9)}
#themePane .themes{grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px}
#themePane .theme{padding:8px 8px 12px;gap:8px}
#themePane .tsw{position:relative;height:auto;aspect-ratio:16/9;border:1px solid rgba(197,160,89,.35);background:#07060a}
#themePane .tsw canvas{position:absolute;inset:0;width:100%;height:100%;display:block;transition:transform .4s ease}
#themePane .theme:not(.locked):hover .tsw canvas{transform:scale(1.06)}
#themePane .theme.locked .tsw canvas{filter:brightness(.13) grayscale(1) contrast(1.4)}
#themePane .tsw b{z-index:1;font-size:20px;opacity:.7}
#themePane .tsw .teq{position:absolute;left:6px;bottom:6px;top:auto;width:auto;height:auto;border:0;border-radius:0;z-index:1;font-style:normal;font-family:var(--sk-serif,Georgia,serif);font-size:10px;letter-spacing:.18em;color:#0B0D13;background:#C5A059;padding:2px 7px}
#themePane .tsw em{border:1px solid rgba(0,0,0,.6)}
#themePane .theme strong{font-family:var(--sk-serif,Georgia,serif);font-weight:600;font-size:14px;letter-spacing:.12em}
#themePane .theme small{font-style:italic;color:#9E9689}
#themePane .theme.locked strong{color:#5a5650}
#themePane .theme-intro{text-align:center;color:#9E9689;opacity:1}
#themePane .theme-intro b{font-family:var(--sk-mono,monospace);font-weight:normal;color:#FFF8EB}
/* a window open: the cups step aside, and the window stops above the control bar */
body.silk-panel .silk-cups{opacity:0;pointer-events:none;transition:opacity .2s}
.silk-cups{transition:opacity .2s}
.panel-wrap{padding:28px 0 72px;box-sizing:border-box}
.panel{max-height:calc(100vh - 120px)}
.panel .row{padding:12px 0}
.panel .ei-rowbtns .btn{font-size:12px;padding:7px 18px}
.panel .ei-rowbtns{gap:12px;justify-content:flex-start}
.ei-save-note{font-style:italic;color:#9E9689;text-align:center;margin:4px 0 14px}
body.theme-peek .panel-wrap{background:rgba(11,13,19,.08);-webkit-backdrop-filter:none;backdrop-filter:none}
body.theme-peek #panel{background-color:rgba(12,14,20,.42);-webkit-backdrop-filter:blur(1px);backdrop-filter:blur(1px);transform:translateY(24vh)!important;max-height:58vh;transition:transform .35s ease,background-color .35s ease}
#panel{transition:transform .35s ease,background-color .35s ease}`;
  document.head.appendChild(st);

  /* ---------- the menu style picker: gone from the title screen ---------- */
  if (typeof msStep === 'function') msStep = function () {};   // ← → / Q E / LB RB no longer flip styles behind your back

  /* ---------- the cups' labels ---------- */
  document.querySelectorAll('#menuTrophies i').forEach(i => {
    const t = i.getAttribute('title') || '', locked = !i.classList.contains('on');
    i.dataset.n = locked ? '???' : t; i.classList.toggle('locked', locked); i.removeAttribute('title');
  });

  /* ---------- EXTRAS ---------- */
  const FRIENDS = [
    ['Nathan', 'HERO', '#e8361c', 'Loud, cocky, flame-red. Keeps a spare bat under his pillow.', () => true],
    ['Adam', 'RIVAL', '#3d6ee0', '"Match point!" Honorable duels on the climb.', D => D.adamDead],
    ['Josh', 'TECH VENDOR', '#2bb673', 'Builds upgrades out of pure spite. Works on his machine.', D => D.josh],
    ['Renas', 'FAST TRAVEL', '#c8561c', 'Scooter of stolen drone parts. Calls you slowpoke.', D => D.renasMet],
    ['Reshman', 'MAP SCOUT', '#2a2230', 'Jittery shadow-blob in dark corners. …blorp.', D => D.reshman || Object.keys(D.reshmanMet || {}).length],
    ['Lars', 'BLACKSMITH', '#a0622d', 'Two cats, Pebble and Grit, and one beer. Rock and stone!', D => D.lars],
    ['Daniel', 'PYROMANIAC', '#ff8a2a', '"Improves" fireworks. Always has a lucky bomb.', D => D.danielDead],
    ['Fionn', 'GEOLOGIST', '#8c7b6b', 'Names every rock he throws. Wants 50 Lucky Pebbles.', D => D.fionnDead],
    ['Milo', 'STORM MAGE', '#6a5acd', 'Fried hair, summoned storm. Taught you the Static Dash.', D => D.miloDead],
    ['Deniz', 'TEA MASTER', '#6fd3ff', 'Was an ice king. Now a chill hippie with a thermos.', D => D.denizDead],
    ['Evil Adam', 'THE VILLAIN', '#7a1f6e', 'Snapped after one catastrophic loss. It\'s complicated.', D => D.evilAdamDead],
    ['Coach Monfort', 'BASE CAMP COACH', '#f2c14e', 'Whistle, clipboard, no indoor voice. HUSTLE!', D => D.q && D.q.legends && D.q.legends.ticket],
  ];
  const CREDITS = [
    ['', 'EXTRA INNINGS'], ['an Ibrahim Interactive production', ''], ['CREATED, WRITTEN & BUILT BY', 'Ibrahim Interactive'],
    ['GAME DIRECTOR', 'You'], ['LEAD HERO', 'Nathan "MVP" — #7'], ['THE RIVAL', 'Adam'], ['THE VILLAIN', 'Evil Adam (it\'s complicated)'],
    ['ENGINEERING (SPITE)', 'Josh'], ['LOGISTICS & SCOOTERS', 'Renas'], ['CARTOGRAPHY', 'Reshman (…blorp)'], ['METALLURGY & CATS', 'Lars, Pebble & Grit'],
    ['PYROTECHNICS', 'Daniel (unlicensed)'], ['GEOLOGY', 'Fionn & every named rock'], ['WEATHER', 'Milo'], ['CLIMATE CONTROL', 'Deniz'],
    ['COACHING (LOUDLY)', 'Coach Monfort'], ['OFFICIATING', 'The Umpire'], ['CHOIR & DRUMS', 'The Gilded Stadium Crowd'], ['SPECIAL THANKS', 'The Spare Bat'], ['', 'THANKS FOR PLAYING'],
  ];
  const TABS = [['trophies', 'Trophies'], ['dugout', 'The Dugout'], ['credits', 'Credits']];
  const tabBar = on => `<div class="tabs ex-tabs">${TABS.map(([k, l]) => `<button class="tab ${k === on ? 'on' : ''}" data-ex="${k}">${l}</button>`).join('')}</div>`;
  const trophiesOf = ACTIONS.trophies;
  let music = false;
  const backToMenuMusic = () => { if (!music) return; music = false; try { if (typeof Music !== 'undefined') Music.force((typeof TH !== 'undefined' && TH.music) || 'hush'); } catch (e) { logErr('menu-clean: music', e); } };
  function wireTabs() {
    document.querySelectorAll('#panelBody [data-ex]').forEach(b => b.addEventListener('click', () => { if (b.classList.contains('on')) return; Sfx.tick(); ACTIONS.extras(b.dataset.ex); }));
  }
  ACTIONS.extras = (tab = 'trophies') => {
    backToMenuMusic();
    const P = $('#panel'); P.classList.remove('silk-banners', 'diff-mode', 'ex-mode');
    if (tab === 'trophies' && typeof trophiesOf === 'function') {
      trophiesOf();
      const head = $('#panelBody .tc-head'); if (head) head.insertAdjacentHTML('afterbegin', tabBar('trophies'));
      wireTabs(); return;
    }
    if (tab === 'dugout') {
      const D = readSave() || { q: {} }; D.q = D.q || {};
      const met = FRIENDS.filter(f => { try { return !!f[4](D); } catch (e) { return false; } }).length;
      openPanel(`${tabBar('dugout')}<h2>The Dugout<small>Everyone you rescue (or beat) ends up here.</small></h2><div class="rule"></div>
        <p class="dg-count">${met} / ${FRIENDS.length} in the dugout</p>
        <div class="dg-grid">${FRIENDS.map(([n, r, c, d, has]) => { let on = false; try { on = !!has(D); } catch (e) { /* */ }
          return on ? `<div class="dg-card" style="--c:${c}"><div class="dg-face">${n[0]}</div><b>${n}</b><small>${r}</small><p>${d}</p>${n === 'Nathan' && D.q.outfit ? `<em>Wearing: ${String(D.q.outfit).replace(/(^|-)\w/g, s => s.toUpperCase()).replace(/-/g, ' ')}</em>` : ''}</div>`
            : `<div class="dg-card locked"><div class="dg-face">?</div><b>???</b><small>NOT MET YET</small><p>Keep climbing.</p></div>`; }).join('')}</div>`,
        () => { P.classList.add('ex-mode'); wireTabs(); });
      return;
    }
    // credits: a slow roll, with the victory theme
    openPanel(`${tabBar('credits')}<h2>Credits<small>Extra Innings · an Ibrahim Interactive production</small></h2><div class="rule"></div>
      <div class="cr-view"><div class="cr-roll">${CREDITS.map(([a, b], i) => i === 0 ? `<h3>${b}</h3>` : !a && b ? `<i></i><h3 style="margin-top:28px">${b}</h3>` : !b ? `<h4>${a}</h4>` : `<h4>${a}</h4><p>${b}</p>`).join('')}</div></div>
      <p class="cr-note">The full roll, with the cast at Base Camp, plays after every ending. Hover to pause.</p>`, () => {
      P.classList.add('ex-mode'); wireTabs();
      try { if (typeof Music !== 'undefined' && SFX.audio()) { Music.force('victory'); music = true; } } catch (e) { logErr('menu-clean: credits music', e); }
    });
  };
  const _op = openPanel;
  openPanel = function () { $("#panel").classList.remove("ex-mode"); return _op.apply(this, arguments); };
  ACTIONS.trophies = () => ACTIONS.extras('trophies');
  ACTIONS.credits = () => ACTIONS.extras('credits');
  QUOTES.extras = QUOTES.extras || ['"Rock and stone! Grab a beer."', 'Lars'];

  /* ---------- QUIT: close the window, or back to the title screen ---------- */
  ACTIONS.quit = () => openPanel(`<div class="confirm"><h2>Forfeit the Match?<small>Your friends are still trapped in The Spire.</small></h2><div class="rule"></div>
    <div class="btns"><button class="btn primary" onclick="closePanel()">Keep Climbing</button><button class="btn" id="forfeit">Quit</button></div></div>`, () => {
    $('#forfeit').onclick = () => {
      closePanel();
      try { window.close(); } catch (e) { /* */ }
      setTimeout(() => { if (!window.closed) location.href = 'index.html'; }, 250);   // a tab the game didn't open can't close itself
    };
  });

  /* ---------- Options → Themes: peek at the backdrop ---------- */
  const wrap = $('#panelWrap');
  const peekCheck = () => {
    const on = wrap.classList.contains('open') && !!document.querySelector('#panelBody .tab.on[data-t="themes"]');
    document.body.classList.toggle('theme-peek', on);
    if (!wrap.classList.contains('open') || !document.querySelector('#panelBody [data-ex="credits"].on')) backToMenuMusic();
  };
  new MutationObserver(peekCheck).observe(wrap, { attributes: true, subtree: true, childList: true, attributeFilter: ['class'] });
})();
