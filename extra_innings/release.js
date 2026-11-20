/* =========================================================
   RELEASE · the things a public build needs (every page)
   · a black-and-gold loading screen between pages: a spinning
     baseball and a tip from the cast, so a page change never
     flashes white
   · fullscreen: a button on the title screen and in both
     Options screens (F11 is left to the browser: its fullscreen survives page changes)
   · save backup: Export downloads every Extra Innings key from
     localStorage as one .json file; Import puts one back
   · Web Audio wakes up on the very first click, key or tap
   · back on the title screen after an ending: the new cup glows,
     with a line saying what it unlocked
   Loaded in the <head> of every page, so the arrival cover is up
   before anything is drawn; the rest waits for the page.
   ========================================================= */
(function () {
  // [who, line, aside]: the aside (Reshman's translations) sits outside the quote marks
  const TIPS = [
    ['Josh', "If the gravity feels weird in the next room, no it doesn't. That's a feature."],
    ['Josh', "Reminder: you can bat your own Kinetic Baseballs mid-air to launch higher. Try not to break my physics engine."],
    ['Josh', "I rewired your Hype Orb out of pure spite. Hit enemies to charge it; hold Heal when you're in trouble."],
    ['Josh', "If you see a red laser grid, don't walk into it. Wait until you have Static Dash—or don't, I'm not your dad."],
    ['Fionn', "A pebble has dignity, symmetry, and a name. A rock is just an unorganized boulder. Please learn the difference."],
    ['Fionn', "If you spot any of my 50 Lucky Pebbles tucked into high ledges, bring them back! Reginald misses his brothers."],
    ['Fionn', "Downward bat-swings let you pogo off spikes and armored shells. Sedimentary, really."],
    ['Fionn', "The Geode Caverns are acoustically sensitive. Try not to yell too loudly while swinging that metal bat."],
    ['Lars', "Raw Titanium Ore doesn't forge itself. Bring me what you find and I'll put some actual weight behind that swing."],
    ['Lars', "If you see my cats wandering around the upper shafts, tell them dinner is at six. And don't scare them."],
    ['Lars', "Good steel beats fancy footwork. Rest at a Dugout Bench before you walk into something ugly."],
    ['Lars', "Quit mashing the swing button. Time your third hit—that's where the real knockback lives."],
    ['Deniz', "Take a deep breath, bro. The Spire isn't going anywhere. Unless Milo starts another hurricane."],
    ['Deniz', "Swing by my tea lounge in Base Camp whenever the climb gets too heavy. A warm cup fixes bad vibes."],
    ['Deniz', "Even a frozen crown melts eventually, man. Don't let Evil Adam get inside your head."],
    ['Deniz', "Hold Jump while falling with the Champion's Pennant to catch the updrafts. Just go with the flow."],
    ['Daniel', "See a wall with glowing orange cracks? Hit an Explosive Baseball right into it! Boom—instant doorway!"],
    ['Daniel', "Pro tip: if someone throws a giant green bomb at you, swing as hard as you can! What's the worst that could happen?"],
    ['Daniel', "Safety goggles are optional, maximum blast radius is mandatory."],
    ['Renas', "No free rides! Keep some Scrap Bolts in your pocket if you want to unlock my Express Scooter Stops."],
    ['Renas', "If you're still walking everywhere on foot, that's honestly embarrassing. Ring the brass bell."],
    ['Milo', "Beware my Cursed Spellbooks! Seal them away before their static magic overloads the upper spire!"],
    ['Reshman', "…blorp.", "Translation: check the dark corners of every new zone for cheap map sketches."],
    ['Reshman', "…blorp.", "Translation: rooms drawn in wet pencil vanish if you fall before resting at a Dugout Bench."],
  ];
  // the card stays up at least CARD_MIN ms so it can be read, and HOLD ms more once the page has loaded
  const KEY = 'ei_transit', CARD_MIN = 1600, HOLD = 300;
  let arriving = false;
  try { const t = +sessionStorage.getItem(KEY); sessionStorage.removeItem(KEY); arriving = t > 0 && Date.now() - t < 15000; } catch (e) { /* no session storage */ }
  // a scooter ride (zone/transit.js) brings its own tunnel: no loading cover on top of it
  try { const r = JSON.parse(sessionStorage.getItem('ei_ride') || 'null'); if (r && Date.now() - r.at < 15000) arriving = false; } catch (e) { /* */ }

  const st = document.createElement('style');
  st.textContent = `
html.ei-arrive{background:#0B0A0E}
html.ei-arrive::before{content:"";position:fixed;inset:0;z-index:2147483646;background:#0B0A0E}
#eiTransit{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:#0B0A0E;color:#FFF8EB;opacity:0;pointer-events:none;transition:opacity .4s ease}
#eiTransit.show{opacity:1;pointer-events:auto}
#eiTransit .tr-spin{position:absolute;right:38px;bottom:34px;width:30px;height:30px;animation:eiSpin 1.1s linear infinite;filter:drop-shadow(0 0 8px rgba(197,160,89,.5))}
#eiTransit .tr-card{display:flex;flex-direction:column;align-items:center;gap:14px;opacity:0;transform:translateY(6px);transition:opacity .45s ease,transform .6s ease}
#eiTransit .tr-card.on{opacity:1;transform:none}
#eiTransit .tr-act{font-family:"Cinzel","Trajan Pro",Palatino,Georgia,serif;font-variant:small-caps;font-size:15px;letter-spacing:.42em;color:#C5A059}
#eiTransit h2{margin:0;font-family:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;font-weight:normal;font-size:clamp(34px,5vw,64px);letter-spacing:.06em;color:#FFF8EB;text-shadow:0 0 30px rgba(197,160,89,.22);text-align:center}
#eiTransit .tr-rule{width:min(360px,64vw);height:18px}
#eiTransit .tr-rule svg{width:100%;height:100%;display:block}
#eiTransit p{margin:4px 0 0;max-width:min(560px,86vw);text-align:center;font-family:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;font-style:italic;font-size:17px;line-height:1.5;color:rgba(255,248,235,.82)}
#eiTransit p .tr-aside{font-style:normal;font-size:15px;color:rgba(255,248,235,.62)}
#eiTransit p small{display:block;margin-top:6px;font-family:"Cinzel","Trajan Pro",Palatino,Georgia,serif;font-style:normal;font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:#C5A059}
@keyframes eiSpin{to{transform:rotate(360deg)}}
#eiFullBtn{position:fixed;top:18px;right:22px;z-index:25;font-family:"Cinzel","Trajan Pro",Palatino,Georgia,serif;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#9E9689;background:rgba(12,14,20,.5);border:1px solid rgba(197,160,89,.45);padding:6px 12px;cursor:pointer;transition:color .2s,border-color .2s,text-shadow .2s}
#eiFullBtn:hover{color:#FFF8EB;border-color:#C5A059;text-shadow:0 0 10px rgba(197,160,89,.6)}
#eiFullBtn kbd,.ei-k{font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:11px;border:1px solid rgba(197,160,89,.6);border-radius:3px;padding:0 4px;margin-right:6px;color:#FFF8EB}
.ei-rowbtns{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
.silk-cups i.fresh svg{animation:eiCup 1.4s ease-in-out infinite}
@keyframes eiCup{0%,100%{filter:drop-shadow(0 0 6px rgba(242,193,78,.6))}50%{filter:drop-shadow(0 0 22px rgba(255,215,0,1)) brightness(1.3)}}
.ei-cupnote{position:absolute;left:0;right:0;bottom:104px;text-align:center;font-family:"Iowan Old Style",Palatino,Georgia,serif;font-style:italic;font-size:14px;color:#C5A059;text-shadow:0 0 10px rgba(197,160,89,.5);animation:eiNote 6s ease forwards;pointer-events:none}
@keyframes eiNote{0%{opacity:0}10%{opacity:1}80%{opacity:1}100%{opacity:0}}`;
  document.head.appendChild(st);
  if (arriving) document.documentElement.classList.add('ei-arrive');

  // a small white-and-gold baseball spinning in the corner, the way Silksong turns its little needle
  const BALL = '<svg class="tr-spin" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="40" fill="#FFF8EB" stroke="#C5A059" stroke-width="5"/><path d="M26 26 Q42 50 26 74 M74 26 Q58 50 74 74" fill="none" stroke="#C5A059" stroke-width="5" stroke-dasharray="7 5"/></svg>';
  // a gold filigree rule: two hairlines curling into a diamond
  const RULE = '<svg viewBox="0 0 360 18" aria-hidden="true"><defs><linearGradient id="eiRuleG" x1="0" x2="1"><stop offset="0" stop-color="#C5A059" stop-opacity="0"/><stop offset=".5" stop-color="#F2D489"/><stop offset="1" stop-color="#C5A059" stop-opacity="0"/></linearGradient></defs>'
    + '<path d="M8 9 H150 M210 9 H352" stroke="url(#eiRuleG)" stroke-width="1"/>'
    + '<path d="M150 9 C158 9 160 3 166 3 C171 3 171 9 168 9 M210 9 C202 9 200 15 194 15 C189 15 189 9 192 9" fill="none" stroke="#C5A059" stroke-width="1.1"/>'
    + '<path d="M180 2 L187 9 L180 16 L173 9 Z" fill="none" stroke="#F2D489" stroke-width="1.2"/><circle cx="180" cy="9" r="1.8" fill="#F2D489"/></svg>';
  // which act a zone belongs to, for the small caps line over the zone name
  const ACT = { z1: 'Prologue', z2: 'Act I', z3: 'Act I', z4: 'Act I', z12: 'Act I', z5: 'Act II', z6: 'Act II', z7: 'Act II', z8: 'Act II', z9: 'Act III', z10: 'Act IV' };
  let cover = null;
  function makeCover() {
    if (cover) return cover;
    cover = document.createElement('div'); cover.id = 'eiTransit';
    cover.innerHTML = `${BALL}<div class="tr-card"></div>`;
    document.body.appendChild(cover);
    return cover;
  }
  // the title card for the page we just arrived on: ACT · zone name · filigree · a line from the cast
  function fillCard() {
    const card = cover && cover.querySelector('.tr-card'); if (!card) return;
    let z = null;
    try { if (typeof Zone !== 'undefined' && Zone.room && Zone.room.zone) z = Zone.room.zone; } catch (e) { /* */ }
    let name = 'Extra Innings';
    try { if (z && typeof ZONES !== 'undefined' && ZONES[z]) name = ZONES[z].name; } catch (e) { /* */ }
    // never the same line twice in a row
    let i = (Math.random() * TIPS.length) | 0;
    try { const last = +sessionStorage.getItem('ei_tip'); if (i === last) i = (i + 1 + ((Math.random() * (TIPS.length - 1)) | 0)) % TIPS.length; sessionStorage.setItem('ei_tip', String(i)); } catch (e) { /* */ }
    const [who, line, aside] = TIPS[i];
    card.innerHTML = `${z && ACT[z] ? `<span class="tr-act">${ACT[z]}</span>` : ''}<h2>${name}</h2><div class="tr-rule">${RULE}</div><p>"${line}"${aside ? ` <span class="tr-aside">(${aside})</span>` : ''}<small>${who}</small></p>`;
    void card.offsetWidth; card.classList.add('on');
  }
  // leaving: just black and the spinning ball, so the next page's card fades up out of the same black
  window.EIRelease = { cover: () => { makeCover(); void cover.offsetWidth; cover.classList.add('show'); } };
  // any page change inside the game shows the cover on the next page
  addEventListener('pagehide', () => { try { sessionStorage.setItem(KEY, String(Date.now())); } catch (e) { /* */ } });

  /* ---------- Web Audio: wake it on the first gesture (and again if a browser suspends it) ---------- */
  const wake = () => { try { if (window.SFX && typeof SFX.ensure === 'function') SFX.ensure(); } catch (e) { /* */ } };
  for (const ev of ['pointerdown', 'keydown', 'touchstart']) addEventListener(ev, wake, { capture: true, passive: true });

  /* ---------- fullscreen ---------- */
  const isFull = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
  // Browsers drop fullscreen on every page change (each zone is its own page). Remember that the player
  // wanted it, and switch it back on with the first key or click on the next page (browsers only allow
  // fullscreen from a real key press or click, so it can't come back by itself).
  const FS_KEY = 'ei_fs_wanted';
  const fsWanted = v => { try { if (v === undefined) return sessionStorage.getItem(FS_KEY) === '1'; v ? sessionStorage.setItem(FS_KEY, '1') : sessionStorage.removeItem(FS_KEY); } catch (e) { /* */ } return false; };
  let leaving = false;
  addEventListener('beforeunload', () => { leaving = true; });
  addEventListener('pagehide', () => { leaving = true; });
  function enterFull() {
    const el = document.documentElement;
    try { const r = (el.requestFullscreen || el.webkitRequestFullscreen).call(el); if (r && r.catch) r.catch(() => {}); } catch (e) { /* */ }
  }
  function toggleFull() {
    const d = document;
    try {
      if (isFull()) { fsWanted(false); (d.exitFullscreen || d.webkitExitFullscreen).call(d); }
      else { fsWanted(true); enterFull(); }
    } catch (e) { /* the browser said no (an iframe without permission, for one) */ }
  }
  if (fsWanted() && !isFull()) {
    const back = e => {
      if (e.type === 'keydown' && (e.key === 'Escape' || e.key === 'F11')) return;   // Esc can't grant fullscreen; F11 is the browser's own
      for (const ev of ['keydown', 'pointerdown']) removeEventListener(ev, back, true);
      if (!isFull() && fsWanted()) enterFull();
    };
    for (const ev of ['keydown', 'pointerdown']) addEventListener(ev, back, true);
  }
  // leaving fullscreen on purpose (Esc, the browser's own button) stops it coming back; a page change doesn't
  const fsLeft = () => { if (!isFull() && !leaving) setTimeout(() => { if (!leaving && !isFull()) fsWanted(false); }, 200); };
  document.addEventListener('fullscreenchange', fsLeft);
  document.addEventListener('webkitfullscreenchange', fsLeft);
  // F11 is not caught: the browser's own fullscreen stays on from zone to zone
  const fullLabel = () => isFull() ? 'Exit fullscreen' : 'Fullscreen';
  document.addEventListener('fullscreenchange', () => document.querySelectorAll('[data-ei-full]').forEach(b => { b.innerHTML = fullLabel(); }));
  document.addEventListener('webkitfullscreenchange', () => document.querySelectorAll('[data-ei-full]').forEach(b => { b.innerHTML = fullLabel(); }));

  /* ---------- save backup ---------- */
  const OURS = k => /^(ei_|mpz_)/.test(k) && !/^ei_(dev_carry|newdiff|newmode)$/.test(k) || k === 'selectedMenuTheme';
  function exportSave() {
    try { if (typeof saveGame === 'function' && !window.DEV_LOCK) saveGame(); } catch (e) { /* */ }
    const data = {};
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (OURS(k)) data[k] = localStorage.getItem(k); }
    if (!data.ei_zone1) { alert('There is no save to export yet. Start a climb first.'); return; }
    const blob = new Blob([JSON.stringify({ game: 'extra-innings', version: '0.9.0', at: new Date().toISOString(), data }, null, 1)], { type: 'application/json' });
    const a = document.createElement('a'), d = new Date();
    a.href = URL.createObjectURL(blob); a.download = `extra-innings-save-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  function importSave() {
    if (window.DEV_LOCK) { alert('Dev mode is on: importing is switched off. Reload the page first.'); return; }
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = () => {
      const f = inp.files && inp.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        let J = null; try { J = JSON.parse(rd.result); } catch (e) { /* */ }
        if (!J || J.game !== 'extra-innings' || !J.data || typeof J.data !== 'object' || !J.data.ei_zone1) { alert('That file isn\'t an Extra Innings save.'); return; }
        if (!confirm(`Load the save from ${J.at ? new Date(J.at).toLocaleString() : 'this file'}? It replaces your current save, trophies and settings.`)) return;
        try {
          const old = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (OURS(k)) old.push(k); }
          old.forEach(k => localStorage.removeItem(k));
          for (const [k, v] of Object.entries(J.data)) if (OURS(k) && typeof v === 'string') localStorage.setItem(k, v);
        } catch (e) { alert('The save could not be written: ' + e.message); return; }
        // a running game must not write its old save over the imported one
        try { if (typeof PAGE_BLOCKED !== 'undefined') PAGE_BLOCKED = true; } catch (e) { /* */ }
        location.href = 'index.html';
      };
      rd.readAsText(f);
    };
    inp.click();
  }
  window.EIRelease.exportSave = exportSave; window.EIRelease.importSave = importSave; window.EIRelease.fullscreen = toggleFull;

  function bindRows(root) {
    root.querySelectorAll('[data-ei-full]').forEach(b => { b.innerHTML = fullLabel(); b.title = 'Tip: the browser\'s own F11 stays fullscreen from zone to zone'; b.onclick = toggleFull; });
    root.querySelectorAll('[data-ei-exp]').forEach(b => { b.onclick = exportSave; });
    root.querySelectorAll('[data-ei-imp]').forEach(b => { b.onclick = importSave; });
  }

  /* ---------- the title screen's newly won cup ---------- */
  const ENDS = [['standard', 'Game, Set, Match'], ['ego', 'New Management'], ['joke', 'Works On My Machine'], ['chill', 'Eternal Chill'], ['true', 'Extra Innings']];
  function freshCups() {
    const el = document.getElementById('menuTrophies'); if (!el) return;
    const read = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
    const L = read('ei_endings') || [], z = read('ei_zone1') || {};
    if (z.endingA && !L.includes('standard')) L.push('standard');
    if (z.trueEnding && !L.includes('true')) L.push('true');
    const seen = read('ei_seen_endings');
    if (!Array.isArray(seen)) { try { localStorage.setItem('ei_seen_endings', JSON.stringify(L)); } catch (e) { /* */ } return; }   // first run of this build: nothing is "new"
    const fresh = L.filter(k => !seen.includes(k)); if (!fresh.length) return;
    const cups = el.querySelectorAll('i');
    fresh.forEach(k => { const i = ENDS.findIndex(e => e[0] === k); if (cups[i]) cups[i].classList.add('fresh'); });
    const names = fresh.map(k => (ENDS.find(e => e[0] === k) || [k, k])[1]).join(' · ');
    const note = document.createElement('div'); note.className = 'ei-cupnote';
    note.textContent = `A new trophy lights up · ${names}` + (seen.length === 0 ? ' · Sudden Death is now unlocked' : '');
    (el.closest('.silk-cups') || el.parentElement).appendChild(note);
    try { localStorage.setItem('ei_seen_endings', JSON.stringify(L)); } catch (e) { /* */ }
  }

  /* ---------- Performance Mode: Auto / On / Off ---------- */
  const PERF_KEY = 'ei_perf';
  const perfPref = () => { try { return localStorage.getItem(PERF_KEY) || 'auto'; } catch (e) { return 'auto'; } };
  function perfRow(btnClass) {
    const p = perfPref();
    return `<div class="row"><label>Performance</label><span class="ei-rowbtns seg" data-ei-perf>${[['auto', 'Auto'], ['on', 'On'], ['off', 'Off']].map(([k, l]) => `<button class="${btnClass} ${p === k ? 'on' : ''}" data-v="${k}">${l}</button>`).join('')}</span><span></span></div>`;
  }
  function bindPerf(root) {
    root.querySelectorAll('[data-ei-perf] button').forEach(b => b.addEventListener('click', () => {
      const v = b.dataset.v;
      try { localStorage.setItem(PERF_KEY, v); } catch (e) { /* */ }
      b.parentElement.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      if (typeof PERFMODE !== 'undefined') { PERFMODE.pref = v; if (v !== 'auto') setPerfLow(v === 'on'); }
    }));
  }
  // Auto: if the game keeps running below ~45 fps for a few seconds, drop to 1× pixels and no shadow blur
  function watchFrames() {
    if (typeof PERFMODE === 'undefined') return;
    let last = 0, sum = 0, n = 0, t0 = 0;
    (function tick(now) {
      requestAnimationFrame(tick);
      const dt = last ? now - last : 0; last = now;
      if (PERFMODE.pref !== 'auto' || PERFMODE.low) return;
      if (!document.body.classList.contains('playing') || dt <= 0 || dt > 250) { sum = n = 0; t0 = now; return; }   // paused, menus, tab switches
      sum += dt; n++;
      if (now - t0 < 4000) return;
      if (n > 30 && sum / n > 22) {
        setPerfLow(true);
        if (typeof toast === 'function') toast('PERFORMANCE MODE ON · SHARPER FRAMES, FEWER GLOWS · OPTIONS TO CHANGE');
      }
      sum = n = 0; t0 = now;
    })(0);
  }

  /* ---------- once the page is built ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    // arriving: swap the bare cover for the real one with its title card; once loaded, hold, then crossfade
    if (arriving) {
      makeCover(); cover.style.transition = 'none'; cover.classList.add('show');
      document.documentElement.classList.remove('ei-arrive');
      fillCard();
      const cardAt = performance.now();
      const lift = () => setTimeout(() => { cover.style.transition = ''; cover.classList.remove('show'); }, Math.max(HOLD, CARD_MIN - (performance.now() - cardAt)));
      if (document.readyState === 'complete') lift(); else addEventListener('load', lift, { once: true });
    }
    // leaving through a door, a warp or a dream: the cover fades up while the old page fades out
    if (typeof goToPage === 'function') {
      const _go = goToPage;
      goToPage = function () { const r = _go.apply(this, arguments); if (!window.EI_RIDE) window.EIRelease.cover(); return r; };
    }
    // the title screen
    if (document.getElementById('menu') && typeof ACTIONS !== 'undefined') {
      const b = document.createElement('button'); b.id = 'eiFullBtn'; b.setAttribute('data-ei-full', ''); document.body.appendChild(b); bindRows(document);
      const _opt = ACTIONS.options;
      ACTIONS.options = function () {
        const r = _opt.apply(this, arguments);
        const body = document.getElementById('panelBody'), video = body && body.querySelector('[data-pane="video"]');
        if (video) video.insertAdjacentHTML('beforeend', '<div class="row"><label>Fullscreen</label><span class="ei-rowbtns"><button class="btn" data-ei-full></button></span><span></span></div>' + perfRow(''));
        // the save backup gets its own tab (AUDIO | VIDEO | CONTROLS | THEMES | SAVE) instead of hanging under every pane
        const tabs = body && body.querySelector('.tabs');
        if (tabs) {
          tabs.insertAdjacentHTML('beforeend', '<button class="tab" data-t="save">Save</button>');
          const last = body.querySelector('[data-pane="themes"]') || body.lastElementChild;
          last.insertAdjacentHTML('afterend', `<div data-pane="save" hidden>
            <p class="ei-save-note">Keep a copy of your climb: your save, trophies, themes and settings in one small file.</p>
            <div class="row"><label>Export</label><span class="ei-rowbtns"><button class="btn" data-ei-exp>Download save</button></span><span></span></div>
            <div class="row"><label>Import</label><span class="ei-rowbtns"><button class="btn" data-ei-imp>Load from file</button></span><span></span></div></div>`);
          const t = tabs.querySelector('[data-t="save"]');
          t.onclick = () => {
            Sfx.tick();
            body.querySelectorAll('.tab').forEach(x => x.classList.toggle('on', x === t));
            body.querySelectorAll('[data-pane]').forEach(p => { p.hidden = p.dataset.pane !== 'save'; });
          };
        }
        if (body) { bindRows(body); bindPerf(body); }
        return r;
      };
      freshCups();
    }
    // in the game: the Options card
    const pc = document.querySelector('#pause .pause-card');
    if (pc && document.getElementById('vol')) {
      pc.insertAdjacentHTML('beforeend', `<div class="row"><label>Screen</label><span class="ei-rowbtns"><button class="pm-btn" data-ei-full></button></span></div>
        <div class="row"><label>Save backup</label><span class="ei-rowbtns"><button class="pm-btn" data-ei-exp>Export save</button><button class="pm-btn" data-ei-imp>Import save</button></span></div>${perfRow('pm-btn')}`);
      bindRows(pc); bindPerf(pc);
    }
    watchFrames();
  });
})();
