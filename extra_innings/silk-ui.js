/* =========================================================
   SILK UI · one window style for the whole game
   The title screen's panels (.panel) and every in-game window
   (.overlay .card: Josh's Workbench, Renas's scooter, the Clipboard,
   badges, outfits, dreams, the Hall of Legends menu, the end card)
   · straight, dark parchment glass (#0C0E14 at 92%) with a blur,
     one thin matt-gold line (40%) and a filigree curl in each corner
   · ivory serif titles with a gold glow, the character subtitles in
     grey italics, a tapered gold rule with a diamond in the middle
   · a free-standing ✕ that glows gold on hover
   · floating serif tabs, the active one ivory with a diamond under it
   · sliders: a 2 px rail that fills gold up to a small diamond, which
     grows while you drag it; values in an ivory number font
   · switches: ◆ ON (gold, glowing) or ◇ OFF (grey)
   · buttons: dark and see-through, a thin gold edge, little
     filigree arrows on both sides on hover
   The pause menu keeps its own frameless look (pausemenu.css).
   Loaded last on index.html and on every game page.
   ========================================================= */
(function () {
  const GOLD = '#C5A059', RED = '#FF3B30';
  const svg = s => `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" ' + s + '</svg>')}")`;
  // one corner curl (top-left), mirrored into the other three corners
  const CORNER = t => svg(`viewBox="0 0 30 30"><g transform="${t}"><g fill="none" stroke="${GOLD}" stroke-width="1.2" stroke-linecap="round"><path d="M1 29 V10 Q1 1 10 1 H29"/><path d="M5 20 Q5 5 20 5"/><path d="M9 14 Q9 9 14 9"/></g><path d="M14 11 L17 14 L14 17 L11 14Z" fill="${RED}"/></g>`);
  const TL = CORNER(''), TR = CORNER('translate(30 0) scale(-1 1)'), BL = CORNER('translate(0 30) scale(1 -1)'), BR = CORNER('translate(30 30) scale(-1 -1)');
  // a thin rule, thickest in the middle, tapering to points, with a diamond at its heart
  const RULE = svg(`viewBox="0 0 420 14" preserveAspectRatio="none"><path d="M2 7 L196 5.6 L196 8.4Z M418 7 L224 5.6 L224 8.4Z" fill="${GOLD}"/><path d="M210 1 L216 7 L210 13 L204 7Z" fill="#0C0E14" stroke="${GOLD}" stroke-width="1.2"/><path d="M210 5 L212 7 L210 9 L208 7Z" fill="${RED}"/>`);
  const DIAMOND = svg(`viewBox="0 0 20 20"><path d="M10 1 L19 10 L10 19 L1 10Z" fill="${GOLD}" stroke="#FFF8EB" stroke-width="1"/><path d="M10 6 L14 10 L10 14 L6 10Z" fill="#FFF8EB" opacity=".55"/>`);
  const DIA_OFF = svg(`viewBox="0 0 20 20"><path d="M10 2 L18 10 L10 18 L2 10Z" fill="none" stroke="#8E867B" stroke-width="1.5"/>`);
  const DIA_ON = svg(`viewBox="0 0 20 20"><path d="M10 2 L18 10 L10 18 L2 10Z" fill="${GOLD}" stroke="#FFF8EB" stroke-width="1"/>`);
  const ARROW = svg(`viewBox="0 0 22 12"><g fill="none" stroke="${GOLD}" stroke-width="1.2" stroke-linecap="round"><path d="M1 6 H14"/><path d="M4 2 Q8 6 4 10"/></g><path d="M14 2 L18 6 L14 10 L12 6Z" fill="${GOLD}"/>`);
  const ARROW_L = svg(`viewBox="0 0 22 12"><g transform="translate(22 0) scale(-1 1)"><g fill="none" stroke="${GOLD}" stroke-width="1.2" stroke-linecap="round"><path d="M1 6 H14"/><path d="M4 2 Q8 6 4 10"/></g><path d="M14 2 L18 6 L14 10 L12 6Z" fill="${GOLD}"/></g>`);

  const P = '.panel', C = '.overlay .card';   // the two shared window classes
  const both = sel => sel.split(',').map(s => `${P} ${s.trim()},${C} ${s.trim()}`).join(',');
  const st = document.createElement('style');
  st.id = 'silkUi';
  st.textContent = `
:root{--sk-ink:#0C0E14;--sk-ivory:#FFF8EB;--sk-grey:#9E9689;--sk-dim:#8E867B;--sk-gold:${GOLD};--sk-red:${RED};
  --sk-serif:"Cinzel","Trajan Pro","Playfair Display","Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;
  --sk-body:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;
  --sk-mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace}
@keyframes skIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}

/* ---- 1 · the window ---- */
${P},${C}{transform:none;color:var(--sk-ivory);font-family:var(--sk-body);box-shadow:0 24px 60px rgba(0,0,0,.55);border:1px solid rgba(197,160,89,.4);border-radius:0;
  background:${TL} left 7px top 7px/30px no-repeat,${TR} right 7px top 7px/30px no-repeat,${BL} left 7px bottom 7px/30px no-repeat,${BR} right 7px bottom 7px/30px no-repeat,rgba(12,14,20,.92);
  -webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);scrollbar-width:thin;scrollbar-color:rgba(197,160,89,.4) transparent}
${P}{padding:40px 52px 44px}
${P}::before,${P}::after{content:none}
${C}{animation:skIn .2s ease-out both;padding:32px 40px}
.overlay{background:rgba(6,7,11,.55)}

/* ---- 2 · titles, subtitles, the rule ---- */
${P} h2,${C} h1{font-family:var(--sk-serif);font-weight:600;text-transform:uppercase;letter-spacing:.12em;line-height:1.1;color:var(--sk-ivory);text-shadow:0 0 16px rgba(197,160,89,.4);-webkit-text-stroke:0;text-align:center}
${P} h2{font-size:clamp(26px,3.2vw,36px)}
${C} h1{font-size:clamp(30px,4.2vw,44px)}
${P} h2 small{font-family:var(--sk-body);font-weight:normal;font-style:italic;text-transform:none;letter-spacing:.02em;font-size:15px;color:var(--sk-grey);opacity:1;text-shadow:none;margin-top:8px}
${C} .eyebrow{font-family:var(--sk-serif);font-weight:600;font-size:18px;letter-spacing:.14em;color:var(--sk-ivory);text-shadow:0 0 14px rgba(197,160,89,.4)}
${C} .josh-line,${C} .lede,${C} .pad{font-family:var(--sk-body);font-style:italic;color:var(--sk-grey);opacity:1}
${P} .rule{height:14px;width:min(420px,84%);margin:12px auto 22px;transform:none;background:${RULE} center/100% 14px no-repeat;animation:none}
${C} header{position:relative;padding-bottom:18px}
${C} header::after{content:"";position:absolute;left:8%;right:8%;bottom:0;height:14px;background:${RULE} center/100% 14px no-repeat}
${C} .josh-face{border:1px solid rgba(197,160,89,.7);box-shadow:0 0 0 3px rgba(12,14,20,.9),0 0 0 4px rgba(197,160,89,.35);transform:none;border-radius:50%;overflow:hidden}
${C} .shop-bolts{font-family:var(--sk-mono);font-size:18px;color:var(--sk-ivory)}
${both('kbd')}{font-family:var(--sk-mono);font-style:normal;background:none;border:1px solid rgba(197,160,89,.6);border-radius:3px;color:var(--sk-ivory);box-shadow:none;padding:0 5px}
${C} .shop-hint{font-family:var(--sk-body);font-style:italic;color:var(--sk-grey);opacity:1;text-align:center;margin-top:10px}

/* the ✕ */
.panel-close{border:0;background:none;color:var(--sk-grey);font-family:var(--sk-serif);font-size:22px;width:34px;height:34px;border-radius:0;transition:color .2s,text-shadow .2s;transform:none}
.panel-close:hover{background:none;color:var(--sk-gold);text-shadow:0 0 12px rgba(197,160,89,.9);transform:none}

/* ---- 3 · tabs ---- */
.tabs{justify-content:center;gap:22px;margin-bottom:20px}
.tab{position:relative;border:0;background:none;padding:6px 6px 14px;font-family:var(--sk-serif);font-size:14px;letter-spacing:.14em;text-transform:uppercase;color:var(--sk-dim);box-shadow:none;transition:color .2s,text-shadow .2s}
.tab:hover{color:var(--sk-ivory)}
.tab.on{background:none;color:var(--sk-ivory);text-shadow:0 0 12px rgba(197,160,89,.5);border:0}
.tab.on::after{content:"";position:absolute;left:50%;bottom:0;width:8px;height:8px;margin-left:-4px;transform:rotate(45deg);background:var(--sk-gold);box-shadow:0 0 8px rgba(197,160,89,.9)}

/* ---- 4 · rows, sliders, switches, buttons ---- */
${both('.row')}{border-bottom:1px solid rgba(197,160,89,.14)}
${both('.row label')}{font-family:var(--sk-serif);font-size:14px;letter-spacing:.1em;text-transform:uppercase;color:var(--sk-ivory)}
${both('.row output,output')}{font-family:var(--sk-mono);font-size:14px;color:var(--sk-ivory)}
input[type=range]{-webkit-appearance:none;appearance:none;height:18px;background:transparent;transform:none;accent-color:${GOLD};cursor:pointer}
input[type=range]:focus{outline:none}
input[type=range]::-webkit-slider-runnable-track{height:2px;border:0;background:linear-gradient(90deg,${GOLD} var(--p,50%),rgba(158,150,137,.28) var(--p,50%))}
input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:14px;height:14px;margin-top:-6px;border:0;border-radius:0;background:${DIAMOND} center/contain no-repeat;transition:width .15s,height .15s,margin .15s,filter .15s}
input[type=range]:hover::-webkit-slider-thumb{filter:drop-shadow(0 0 5px rgba(197,160,89,.9))}
input[type=range]:active::-webkit-slider-thumb{width:20px;height:20px;margin-top:-9px;filter:drop-shadow(0 0 8px rgba(255,248,235,.9))}
input[type=range]::-moz-range-track{height:2px;border:0;background:rgba(158,150,137,.28)}
input[type=range]::-moz-range-progress{height:2px;background:${GOLD}}
input[type=range]::-moz-range-thumb{width:14px;height:14px;border:0;border-radius:0;background:${DIAMOND} center/contain no-repeat}
input[type=range]:active::-moz-range-thumb{width:20px;height:20px}

.toggle{width:auto;min-width:72px;height:auto;border:0;background:none;display:inline-flex;align-items:center;gap:8px;padding:2px 0;font-family:var(--sk-serif);font-size:13px;letter-spacing:.14em;color:var(--sk-grey);box-shadow:none}
.toggle::before{content:"";width:14px;height:14px;background:${DIA_OFF} center/contain no-repeat;transition:filter .2s}
.toggle::after{content:"OFF";position:static;width:auto;height:auto;background:none;transition:none}
.toggle.on{background:none;color:var(--sk-ivory)}
.toggle.on::before{background-image:${DIA_ON};filter:drop-shadow(0 0 6px rgba(197,160,89,.95))}
.toggle.on::after{content:"ON";left:auto;background:none}
input[type=checkbox]{-webkit-appearance:none;appearance:none;width:13px;height:13px;margin:0 6px 0 0;vertical-align:-1px;background:${DIA_OFF} center/contain no-repeat;cursor:pointer}
input[type=checkbox]:checked{background-image:${DIA_ON};filter:drop-shadow(0 0 5px rgba(197,160,89,.95))}

${both('.btn')}{position:relative;font-family:var(--sk-serif);font-size:15px;letter-spacing:.14em;text-transform:uppercase;padding:9px 26px;color:var(--sk-ivory);background:rgba(12,14,20,.35);border:1px solid rgba(197,160,89,.55);border-radius:0;box-shadow:none;transform:none;text-shadow:none;transition:border-color .2s,background .2s,text-shadow .2s}
${both('.btn::before,.btn::after')}{content:"";position:absolute;top:50%;width:22px;height:12px;margin-top:-6px;opacity:0;transition:opacity .2s,transform .2s;pointer-events:none}
${both('.btn::before')}{right:100%;margin-right:6px;background:${ARROW} center/contain no-repeat;transform:translateX(-6px)}
${both('.btn::after')}{left:100%;margin-left:6px;background:${ARROW_L} center/contain no-repeat;transform:translateX(6px)}
${both('.btn:hover,.btn:focus-visible,.btn.sel')}{transform:none;box-shadow:none;outline:none;border-color:var(--sk-gold);background:rgba(197,160,89,.1);text-shadow:0 0 10px rgba(197,160,89,.6)}
${both('.btn:hover::before,.btn:hover::after,.btn:focus-visible::before,.btn:focus-visible::after,.btn.sel::before,.btn.sel::after')}{opacity:1;transform:none}
${both('.btn.primary')}{background:rgba(12,14,20,.35);color:var(--sk-ivory);border-color:rgba(255,59,48,.65)}
${both('.btn.primary:hover,.btn.primary:focus-visible')}{border-color:var(--sk-red);background:rgba(255,59,48,.12)}
${both('.btns')}{justify-content:center;gap:56px}
${both('.seg button')}{font-family:var(--sk-serif);font-size:12px;letter-spacing:.1em;padding:4px 10px;background:none;color:var(--sk-dim);border:1px solid rgba(197,160,89,.28);border-radius:0}
${both('.seg button.on')}{color:var(--sk-ivory);border-color:var(--sk-gold);background:rgba(197,160,89,.12)}

/* ---- 5 · what sits inside the in-game windows ---- */
${C} .item,${C} .stop,${C} .end-stats div{background:rgba(255,248,235,.03);color:var(--sk-ivory);border:1px solid rgba(197,160,89,.22);border-radius:0;box-shadow:none;transform:none;transition:border-color .15s,background .15s,box-shadow .15s}
${C} .item.sel,${C} .stop.sel:not([disabled]),${C} .item:hover,${C} .stop:not([disabled]):hover{transform:none;border-color:var(--sk-gold);background:rgba(197,160,89,.08);box-shadow:inset 2px 0 0 var(--sk-gold),0 0 18px -6px rgba(197,160,89,.7)}
${C} .item b,${C} .stop b,${C} .end-stats b{font-family:var(--sk-serif);font-weight:600;font-size:17px;letter-spacing:.08em;color:var(--sk-ivory)}
${C} .end-stats b{font-family:var(--sk-mono);font-weight:normal;font-size:24px}
${C} .item p,${C} .stop small,${C} .end-stats small{color:var(--sk-grey);opacity:1}
${C} .end-stats small{font-family:var(--sk-serif)}
${C} .item .cost{font-family:var(--sk-mono);font-size:16px;color:var(--sk-ivory)}
${C} .item .tag{font-family:var(--sk-serif);letter-spacing:.14em;background:none;color:var(--sk-gold);border:1px solid rgba(197,160,89,.6)}
${C} .item.owned .cost{color:#8fd0a8}
${C} .item.poor .cost{color:var(--sk-red)}
${C} .item.badge .cost{color:var(--sk-gold)}
${C} .item.badge.pinned{box-shadow:inset 0 0 0 1px var(--sk-gold),0 0 16px -4px rgba(197,160,89,.8)}
${C} .item.quest .tag{background:none}
${C} .qstep.ok{color:#8fd0a8;text-decoration-color:rgba(143,208,168,.45)}
${C} .qreward{font-family:var(--sk-serif);color:var(--sk-gold)}
${C} .stop .stop-n{font-family:var(--sk-serif);color:var(--sk-gold)}
${C} .stop.here{background:rgba(197,160,89,.06)}
${C} #badgeNotches span{font-family:var(--sk-serif)}
${C} a{color:var(--sk-gold)}
`;
  document.head.appendChild(st);

  /* the slider rail fills gold up to the diamond (Chrome and Safari need the value as a CSS variable) */
  const paint = r => { const lo = +r.min || 0, hi = r.max === '' ? 100 : +r.max, v = +r.value; r.style.setProperty('--p', (hi > lo ? (v - lo) / (hi - lo) * 100 : 0) + '%'); };
  const paintAll = () => document.querySelectorAll('input[type=range]').forEach(paint);
  document.addEventListener('input', e => { if (e.target && e.target.type === 'range') paint(e.target); }, true);
  document.addEventListener('change', e => { if (e.target && e.target.type === 'range') paint(e.target); }, true);
  paintAll(); setInterval(paintAll, 400);   // sliders that appear later, or are set from code
})();
