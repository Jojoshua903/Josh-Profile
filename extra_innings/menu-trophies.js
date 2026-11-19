/* =========================================================
   MAIN MENU · the Trophy Case, the Sudden Death toggle on
   New Game, and what a shattered Sudden Death save looks like.
   ========================================================= */
(function () {
  Trophies.reconcile();
  const readSave = () => { try { return JSON.parse(localStorage.getItem('ei_zone1') || 'null'); } catch (e) { logErr("menu-trophies.js:7", e); return null; } };
  const S = readSave(), sudden = !!(S && S.q && S.q.sudden), shattered = sudden && !!S.shattered;
  const anyEnding = () => { let L = []; try { L = JSON.parse(localStorage.getItem('ei_endings') || '[]') || []; } catch (e) { logErr("menu-trophies.js:9", e); } return L.length > 0 || TROPHIES.some(t => t.secret && Trophies.has(t.id)); };
  QUOTES.trophies = ['"Polish them yourself. I\'m busy."', 'Coach Monfort'];

  /* ---------- styles ---------- */
  const st = document.createElement('style');
  st.textContent = `
/* the Trophy Case, in the house style: dark glass, thin gold, serif, compact plaques grouped by category */
.panel.trophy-mode{width:min(1120px,95vw);height:min(calc(100vh - 120px),780px);max-height:none;display:flex;flex-direction:column;overflow:hidden;padding:30px 38px 26px}
.panel.trophy-mode #panelBody{display:flex;flex-direction:column;flex:1;min-height:0}
.tc-head{flex:none;text-align:center}
.tc-head h2{margin-top:2px}
.tc-prog{display:flex;align-items:center;justify-content:center;gap:14px;margin:0 auto 14px;width:min(520px,90%);font-family:var(--sk-mono,monospace);font-size:13px;color:#FFF8EB}
.tc-prog em{font-style:normal;color:#9E9689}
.tc-bar{flex:1;height:2px;background:rgba(158,150,137,.25);position:relative}
.tc-bar i{display:block;height:100%;background:#C5A059;box-shadow:0 0 8px rgba(197,160,89,.8)}
.tc-bar i::after{content:"";position:absolute;top:-4px;width:8px;height:8px;margin-left:-4px;left:var(--p);transform:rotate(45deg);background:#C5A059;box-shadow:0 0 8px rgba(197,160,89,.9)}
.tc-pills{display:flex;justify-content:center;gap:26px;flex-wrap:wrap;margin-bottom:16px}
.tc-pills button{position:relative;font-family:var(--sk-serif,Georgia,serif);font-size:12px;letter-spacing:.16em;text-transform:uppercase;padding:4px 2px 12px;border:0;background:none;color:#8E867B;transition:color .2s,text-shadow .2s}
.tc-pills button small{font-family:var(--sk-mono,monospace);font-size:10px;letter-spacing:0;margin-left:6px;color:#6f685f}
.tc-pills button:hover{color:#FFF8EB}
.tc-pills button.on{color:#FFF8EB;text-shadow:0 0 10px rgba(197,160,89,.5)}
.tc-pills button.on small{color:#C5A059}
.tc-pills button.on::after{content:"";position:absolute;left:50%;bottom:0;width:6px;height:6px;margin-left:-3px;transform:rotate(45deg);background:#C5A059;box-shadow:0 0 6px rgba(197,160,89,.9)}
.tc-body{flex:1;min-height:0;display:grid;grid-template-columns:1fr 300px;gap:26px}
.tc-grid{overflow:auto;padding:2px 10px 10px 2px;scrollbar-width:thin;scrollbar-color:rgba(197,160,89,.4) transparent}
.tc-sec{display:flex;align-items:center;gap:12px;margin:14px 0 10px;font-family:var(--sk-serif,Georgia,serif);font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#C5A059}
.tc-sec:first-child{margin-top:2px}
.tc-sec::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,rgba(197,160,89,.45),transparent)}
.tc-sec small{font-family:var(--sk-mono,monospace);letter-spacing:0;color:#9E9689}
.tc-row{display:grid;grid-template-columns:repeat(auto-fill,minmax(74px,1fr));gap:10px}
.tc-plq{position:relative;aspect-ratio:1;display:flex;align-items:center;justify-content:center;padding:17%;overflow:hidden;cursor:pointer;
  background:radial-gradient(circle at 50% 40%,rgba(255,248,235,.05),rgba(12,14,20,.6));border:1px solid rgba(158,150,137,.2);transition:border-color .2s,box-shadow .2s,transform .2s}
.tc-plq svg{width:100%;height:100%}
.tc-plq.locked svg{filter:brightness(0) opacity(.5)}
.tc-plq .q{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:var(--sk-serif,Georgia,serif);font-size:22px;color:rgba(158,150,137,.45)}
.tc-plq.got{border-color:rgba(197,160,89,.55);background:radial-gradient(circle at 50% 42%,rgba(197,160,89,.2),rgba(12,14,20,.6) 70%);box-shadow:0 0 14px -6px rgba(197,160,89,.9)}
.tc-plq.got::after{content:"";position:absolute;inset:-40%;background:linear-gradient(115deg,transparent 42%,rgba(255,248,235,.2) 50%,transparent 58%);transform:translateX(-60%);transition:transform .7s}
.tc-plq.got:hover::after,.tc-plq.sel.got::after{transform:translateX(60%)}
.tc-plq:hover,.tc-plq.sel{transform:translateY(-2px);border-color:#C5A059}
.tc-plq.sel{box-shadow:inset 0 0 0 1px #C5A059,0 0 20px -4px rgba(197,160,89,.9)}
.tc-plq.sel::before{content:"";position:absolute;top:3px;left:50%;width:6px;height:6px;margin-left:-3px;transform:rotate(45deg);background:#FF3B30}
.tc-insp{display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px;padding:8px 6px 4px;border-left:1px solid rgba(197,160,89,.18);padding-left:26px;overflow:auto}
.tc-insp .big{position:relative;width:170px;aspect-ratio:1;padding:22%;border-radius:50%;background:radial-gradient(circle,rgba(197,160,89,.18),rgba(12,14,20,.4) 68%);box-shadow:0 0 0 1px rgba(197,160,89,.55),0 0 0 7px rgba(12,14,20,.9),0 0 0 8px rgba(197,160,89,.25)}
.tc-insp .big.got{box-shadow:0 0 0 1px #C5A059,0 0 0 7px rgba(12,14,20,.9),0 0 0 8px rgba(197,160,89,.45),0 0 40px rgba(197,160,89,.35)}
.tc-insp .big.got::before{content:"";position:absolute;inset:-18%;border-radius:50%;background:repeating-conic-gradient(rgba(197,160,89,.13) 0 6deg,transparent 6deg 24deg);animation:tcSpin 30s linear infinite;z-index:-1}
@keyframes tcSpin{to{transform:rotate(360deg)}}
.tc-insp .big.locked svg{filter:brightness(0) opacity(.5)}
.tc-insp .big svg{width:100%;height:100%}
.tc-insp .cat{margin-top:10px;font-family:var(--sk-serif,Georgia,serif);font-size:10px;letter-spacing:.26em;text-transform:uppercase;color:#C5A059}
.tc-insp h3{font-family:var(--sk-serif,Georgia,serif);font-weight:600;font-size:21px;letter-spacing:.08em;line-height:1.2;color:#FFF8EB;text-shadow:0 0 12px rgba(197,160,89,.4)}
.tc-insp .big.locked ~ h3{color:#9E9689;text-shadow:none}
.tc-insp p{font-style:italic;font-size:14px;line-height:1.5;color:#9E9689}
.tc-insp .when{margin-top:auto;width:100%;padding-top:12px;border-top:1px solid rgba(197,160,89,.18);font-family:var(--sk-mono,monospace);font-size:11px;line-height:1.6;color:#FFF8EB;opacity:.8}
.tc-insp .when.no{color:#6f685f}
.tc-keys{flex:none;text-align:center;margin-top:10px;font-family:var(--sk-serif,Georgia,serif);font-size:11px;letter-spacing:.14em;color:#6f685f}
body.sudden #menu{background:radial-gradient(ellipse at 70% 40%,rgba(120,10,18,.55),rgba(10,2,4,.2) 60%),linear-gradient(180deg,rgba(60,6,10,.5),rgba(20,4,6,.6))}
body.sudden .logo-main{text-shadow:6px 6px 0 var(--ink),10px 10px 0 #ffd700,0 0 60px rgba(180,10,20,.75)}
.sd-row{display:flex;align-items:center;justify-content:center;gap:14px;margin-top:16px;font-size:15px}
.sd-row.locked{opacity:.5}
.slot.shattered{opacity:.7;filter:grayscale(.6)}
.slot.shattered .slot-n svg{width:34px;height:34px}
@media (max-width:820px){.tc-body{grid-template-columns:1fr}.tc-insp{display:none}}`;
  document.head.appendChild(st);
  if (sudden) document.body.classList.add('sudden');

  /* ---------- menu labels for a Sudden Death / shattered save ---------- */
  const meta = document.querySelector('[data-action="continue"] .mi-meta');
  if (meta && shattered) meta.textContent = 'Save shattered · Sudden Death';
  else if (meta && sudden) meta.textContent += ' · Sudden Death';
  const tm = document.querySelector('[data-action="trophies"] .mi-meta');
  const count = () => TROPHIES.filter(t => Trophies.has(t.id)).length;
  if (tm) tm.textContent = `${count()} / ${TROPHIES.length} unlocked`;

  /* ---------- every panel but the Trophy Case uses the normal comic card ---------- */
  const _open = openPanel;
  openPanel = function (html, after) { $('#panel').classList.remove('trophy-mode'); TC.open = false; return _open(html, after); };

  /* ---------- the Trophy Case ---------- */
  const TC = { cat: 'all', sel: 0, open: false };
  const catName = c => (TROPHY_CATS.find(x => x[0] === c) || [, ''])[1];
  const listOf = cat => TROPHY_CATS.filter(([c]) => c !== 'all').flatMap(([c]) => TROPHIES.filter(t => t.cat === c && (cat === 'all' || cat === c)));
  const gotIn = c => TROPHIES.filter(t => (c === 'all' || t.cat === c) && Trophies.has(t.id)).length;
  const allIn = c => TROPHIES.filter(t => c === 'all' || t.cat === c).length;
  function inspector(T) {
    if (!T) return '';
    const got = Trophies.all()[T.id], hidden = T.secret && !got;
    const when = got ? `Earned ${new Date(got.at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}<br>${new Date(got.at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} · ${got.mode} mode` : 'Not yet earned';
    return `<div class="big ${got ? 'got' : 'locked'}">${T.icon}</div>
      <div class="cat">${catName(T.cat)}${T.secret ? ' · Secret' : ''}</div>
      <h3>${hidden ? '???' : T.name}</h3>
      <p>${hidden ? (T.hint || 'A secret ending.') : T.info}</p>
      <div class="when ${got ? '' : 'no'}">${when}</div>`;
  }
  function pick(i) {
    TC.sel = i;
    $$('#tcGrid .tc-plq').forEach(x => x.classList.toggle('sel', +x.dataset.i === i));
    $('#tcInsp').innerHTML = inspector(listOf(TC.cat)[i]);
  }
  function render() {
    const list = listOf(TC.cat), A = Trophies.all();
    TC.sel = Math.max(0, Math.min(TC.sel, list.length - 1));
    const plq = (t, i) => { const got = !!A[t.id];
      return `<button class="tc-plq ${got ? 'got' : 'locked'} ${i === TC.sel ? 'sel' : ''}" data-i="${i}" aria-label="${got || !t.secret ? t.name : 'Secret trophy'}">${t.icon}${!got && t.secret ? '<span class="q">?</span>' : ''}</button>`; };
    // grouped by category, each with its own count
    let i = 0, html = '';
    for (const [c, l] of TROPHY_CATS) {
      if (c === 'all' || (TC.cat !== 'all' && TC.cat !== c)) continue;
      const items = TROPHIES.filter(t => t.cat === c); if (!items.length) continue;
      html += `<div class="tc-sec">${l} <small>${gotIn(c)} / ${items.length}</small></div><div class="tc-row">${items.map(t => plq(t, i++)).join('')}</div>`;
    }
    $('#tcGrid').innerHTML = html;
    $('#tcInsp').innerHTML = inspector(list[TC.sel]);
    $$('#tcGrid .tc-plq').forEach(b => {
      const k = +b.dataset.i;
      b.addEventListener('mouseenter', () => pick(k));
      b.addEventListener('click', () => { Sfx.tick(); pick(k); });
    });
    $$('#tcPills button').forEach(b => b.classList.toggle('on', b.dataset.c === TC.cat));
  }
  ACTIONS.trophies = () => {
    const n = count(), pct = Math.round(n / TROPHIES.length * 100);
    _open(`<div class="tc-head"><h2>Trophy Case<small>"Polish them yourself. I'm busy." · Coach Monfort</small></h2><div class="rule"></div>
      <div class="tc-prog"><span>${n} / ${TROPHIES.length}</span><div class="tc-bar"><i style="width:${pct}%;--p:${pct}%"></i></div><em>${pct}%</em></div>
      <div class="tc-pills" id="tcPills">${TROPHY_CATS.map(([c, l]) => `<button data-c="${c}">${l}<small>${gotIn(c)}/${allIn(c)}</small></button>`).join('')}</div></div>
      <div class="tc-body"><div class="tc-grid" id="tcGrid"></div><aside class="tc-insp" id="tcInsp"></aside></div>
      <p class="tc-keys">Arrows · browse   ·   [ / ] · category</p>`, () => {
      $('#panel').classList.add('trophy-mode'); TC.open = true; TC.sel = 0;
      $$('#tcPills button').forEach(b => b.addEventListener('click', () => { Sfx.tick(); TC.cat = b.dataset.c; TC.sel = 0; render(); $('#tcGrid').scrollTop = 0; }));
      render();
    });
  };
  // arrows move through the case (up and down go to the plaque straight above or below); [ and ] switch category
  addEventListener('keydown', e => {
    if (!TC.open || !$('#panelWrap').classList.contains('open') || !$('#tcGrid')) return;
    if (e.key === '[' || e.key === ']') {
      const cats = TROPHY_CATS.map(c => c[0]), k = (cats.indexOf(TC.cat) + (e.key === ']' ? 1 : -1) + cats.length) % cats.length;
      e.preventDefault(); TC.cat = cats[k]; TC.sel = 0; Sfx.tick(); render(); $('#tcGrid').scrollTop = 0; return;
    }
    const k = { ArrowRight: 'r', d: 'r', D: 'r', ArrowLeft: 'l', a: 'l', A: 'l', ArrowDown: 'd', s: 'd', S: 'd', ArrowUp: 'u', w: 'u', W: 'u' }[e.key];
    if (!k) return;
    e.preventDefault();
    const els = $$('#tcGrid .tc-plq'); if (!els.length) return;
    let next = TC.sel;
    if (k === 'r') next = Math.min(els.length - 1, TC.sel + 1);
    else if (k === 'l') next = Math.max(0, TC.sel - 1);
    else {
      const cur = els[TC.sel].getBoundingClientRect(), cx = cur.left + cur.width / 2;
      let best = null, bd = Infinity;
      for (const el of els) {
        const r = el.getBoundingClientRect(), dy = k === 'd' ? r.top - cur.top : cur.top - r.top;
        if (dy < cur.height * 0.5) continue;
        const d = dy * 4 + Math.abs(r.left + r.width / 2 - cx);
        if (d < bd) { bd = d; best = +el.dataset.i; }
      }
      if (best !== null) next = best;
    }
    if (next === TC.sel) return;
    Sfx.tick(); pick(next);
    const el = $('#tcGrid .tc-plq.sel'); if (el) el.scrollIntoView({ block: 'nearest' });
  });

  /* ---------- New Game: Sudden Death, once you've reached any ending ---------- */
  const _new = ACTIONS.new;
  ACTIONS.new = () => {
    try { localStorage.removeItem('ei_newmode'); } catch (e) { logErr("menu-trophies.js:113", e); }
    _new();
    const box = $('#panelBody .confirm'), btns = box && box.querySelector('.btns'); if (!btns) return;
    const ok = anyEnding(), row = document.createElement('div'); row.className = 'sd-row' + (ok ? '' : ' locked');
    row.innerHTML = ok
      ? `<b style="font-family:var(--display);letter-spacing:.1em">SUDDEN DEATH</b><button class="toggle" id="sdToggle"></button><span style="opacity:.65;font-style:italic">One life. Die once and the save shatters.</span>`
      : `<b style="font-family:var(--display);letter-spacing:.1em">SUDDEN DEATH 🔒</b><span style="opacity:.65;font-style:italic">Reach any ending to unlock.</span>`;
    btns.before(row);
    const t = row.querySelector('#sdToggle');
    if (t) t.addEventListener('click', () => {
      t.classList.toggle('on'); Sfx.tick();
      try { t.classList.contains('on') ? localStorage.setItem('ei_newmode', 'sudden') : localStorage.removeItem('ei_newmode'); } catch (e) { logErr("menu-trophies.js:124", e); }
    });
  };

  /* ---------- a shattered save can't be continued or loaded ---------- */
  const shatteredPanel = () => _open(`<div class="confirm"><h2>The Save Shattered<small>Sudden Death: one life, and it was spent.</small></h2><div class="rule"></div>
    <div style="display:flex;justify-content:center">${CRACKED}</div>
    <p style="font-size:15px;text-align:center;margin-top:10px">${S ? `${Math.floor((S.time || 0) / 60)} minutes played · ${S.deaths || 1} strikeout. It counted.` : ''}</p>
    <div class="btns"><button class="btn" onclick="closePanel()">Back</button><button class="btn primary" onclick="ACTIONS.new()">Start a New Climb</button></div></div>`);
  const CRACKED = '<svg viewBox="0 0 100 100" width="120" height="120"><circle cx="50" cy="50" r="40" fill="#e9dcc0" stroke="#0d0b10" stroke-width="5"/><path d="M28 22 Q40 50 28 78 M72 22 Q60 50 72 78" fill="none" stroke="#e8361c" stroke-width="3" stroke-dasharray="5 4"/><path d="M50 10 L44 30 L56 42 L46 58 L58 72 L52 90" fill="none" stroke="#0d0b10" stroke-width="4" stroke-linejoin="round"/><path d="M56 42 L74 36 M46 58 L26 62" fill="none" stroke="#0d0b10" stroke-width="3"/></svg>';
  const _cont = ACTIONS.continue;
  ACTIONS.continue = () => shattered ? shatteredPanel() : _cont();
  const _load = ACTIONS.load;
  ACTIONS.load = () => {
    _load();
    if (!shattered) { if (sudden) { const p = $('#panelBody .slot p'); if (p) p.textContent += ' · Sudden Death'; } return; }
    const s = $('#panelBody .slot'); if (!s) return;
    s.classList.add('shattered'); s.setAttribute('onclick', '');
    s.querySelector('.slot-n').innerHTML = CRACKED.replace('width="120" height="120"', '');
    s.querySelector('b').textContent = 'Shattered Save'; s.querySelector('p').textContent = 'Sudden Death · this file can\'t be loaded again';
    s.querySelector('.pct').textContent = '✕';
    s.onclick = e => { e.preventDefault(); shatteredPanel(); };
  };
})();
