'use strict';
/* =========================================================
   SHOP & TOOLS POLISH · Silksong-style menus (every story page)
   Shops (Josh, Lars, Daniel, Reshman, the scalpers):
   · dark parchment cards with thin gold corner brackets and a
     soft inner glow on the one you're looking at
   · the shopkeeper's portrait sits top-right, breathing, with a
     prop (Josh's wrench belt, Lars's glowing hammer, Daniel's lit
     fuse, Reshman's candle); their line turns into a remark about
     whichever item you look at
   · hold to buy: keep J / Enter / the button / the mouse down for
     0.5s while a gold bar fills with a rising tick; let go early
     and nothing happens. Then a flash, a rain of bolts, and a gold
     OWNED stamp slaps down across the card
   · Lars's bat upgrades show the damage change (10 ➔ 14, +40%)
   · 18 slow motes rise behind the card: sparks at Lars's anvil,
     blue stars at Josh's bench, embers at Daniel's, violet at Reshman's
   Tools & Items:
   · slots colour-coded: flame red = attacking balls, gold =
     exploring & movement, sky blue = defensive gadgets
   · the big icon in the inspector floats on a slow sine, with a
     glow in the item's own colour
   · bottom-left: a live preview of the quick-swap wheel
   ========================================================= */
const SH = { lastSel: -1, opening: false, hold: null, keys: new Set(), ptr: false, quietUntil: 0, fresh: -1, motes: [], raf: 0 };
const SH_OK = ['Enter', 'Space', 'KeyJ'];

/* ---------- what each shopkeeper says about what you're looking at ---------- */
const SH_PEEK = {
  launcher: '"The launcher. Toss, smack, fly. Physics hates it. I love it."',
  core: '"Spite-Forged. I built it angry. It holds a third more Hype. Coincidence? No."',
  magnet: '"Magnets. Bolts come to you. Laziness, engineered."',
  split: '"Scatter-Ball. Hit it right at the top of the toss or it\'s just a ball. A sad ball."',
  machine: '"A pitching machine that fits in your pocket. Do NOT ask how."',
  overturret: '"Overclocked. It runs hot. It runs longer. It might void a warranty I never gave you."',
  radar: '"Radar. Beeps when secrets are near. Also when I\'m near. Ignore that one."',
  boom: '"BOOM BALLS! Cracked walls? Gone! Shields? Gone! My eyebrows? Long gone!"',
  bigboom: '"Bigger Bang! Forty percent more KABOOM! Science, baby!"',
  flash: '"Flashbang! Pop it up, everybody goes blind, you go to town!"',
  cluster: '"Cluster Fuse! One rocket becomes a party! A loud party!"',
  bat1: '"Rivets down the barrel. Ye\'ll feel it in yer wrists, slugger."',
  bat2: '"A titanium core. Hammered cold, the way me grandad did it."',
  bat3: '"Me masterwork. I\'ve only made two. The other one\'s a doorstop now."',
  buckshot: '"Heavier splinters. Knocks \'em back a proper distance."',
};
const SH_VOICE = {
  josh: s => `"${s.name}? Solid build. Mine, obviously."`,
  lars: s => `"${s.name}. Good steel. Don't waste it."`,
  daniel: s => `"${s.name}! Ooh, that one goes BANG. Probably!"`,
  reshman: s => `"…${s.name}. …blorp. Good price."`,
  scalpers: s => `"${s.name}. Psst. Real ones. Mostly."`,
};
function shPeek(V, s, D) {
  if (itemOwned(s, D)) return V.owned;
  const lock = s.locked && s.locked(D); if (lock) return lock;
  if (SH_PEEK[s.id]) return SH_PEEK[s.id];
  const f = SH_VOICE[Shop.v]; return f ? f(s) : null;
}
const shBuyable = (s, D) => !itemOwned(s, D) && !(s.locked && s.locked(D)) && D.bolts >= s.cost && D.ore >= (s.ore || 0) && !(s.stubs && stubsLeft() < s.stubs);

/* ---------- the shopkeeper's prop next to the portrait ---------- */
const SH_PROP = {
  josh: '<svg viewBox="0 0 40 40"><rect x="4" y="22" width="32" height="8" rx="2" fill="#6b4a2a" stroke="#0d0b10" stroke-width="2"/><path d="M12 22 L10 8 Q10 4 14 5 L15 10 L18 6 Q21 8 19 12 L15 14 L16 22" fill="#b8bcc4" stroke="#0d0b10" stroke-width="2"/><rect x="24" y="12" width="6" height="10" fill="#4DD0E1" stroke="#0d0b10" stroke-width="2"/></svg>',
  lars: '<svg viewBox="0 0 40 40"><rect x="18" y="14" width="4" height="24" fill="#7a4a20" stroke="#0d0b10" stroke-width="2"/><rect x="6" y="4" width="28" height="12" rx="2" class="sh-glow" fill="#ff8a2a" stroke="#0d0b10" stroke-width="2"/></svg>',
  daniel: '<svg viewBox="0 0 40 40"><circle cx="18" cy="26" r="11" fill="#2a2a30" stroke="#0d0b10" stroke-width="2"/><path d="M24 17 Q30 10 28 5" fill="none" stroke="#c9a36b" stroke-width="2.5"/><circle cx="28" cy="5" r="3.5" class="sh-glow" fill="#ffd24a"/></svg>',
  reshman: '<svg viewBox="0 0 40 40"><rect x="15" y="16" width="10" height="20" fill="#e9dfc6" stroke="#0d0b10" stroke-width="2"/><path d="M20 5 Q25 11 20 15 Q15 11 20 5 Z" class="sh-glow" fill="#b98bff"/></svg>',
  scalpers: '<svg viewBox="0 0 40 40"><rect x="5" y="10" width="30" height="20" rx="2" fill="#F2C14E" stroke="#0d0b10" stroke-width="2" transform="rotate(-10 20 20)"/></svg>',
};
const SH_MOTE = { lars: ['#ff8a2a', '#ffd24a', 'spark'], josh: ['#8fd3ff', '#e8f7ff', 'star'], daniel: ['#ff4a3a', '#ffb02a', 'spark'], reshman: ['#b98bff', '#6f5aa8', 'dot'], scalpers: ['#F2C14E', '#fff3c8', 'dot'] };

/* ---------- styles ---------- */
(function () {
  const st = document.createElement('style');
  st.textContent = `
#shop .shop-card{position:relative;z-index:1;background:#0f0d13;color:#e9e1cf;border:1px solid rgba(197,160,89,.45);box-shadow:0 20px 60px rgba(0,0,0,.7),inset 0 0 60px rgba(197,160,89,.05);transform:none}
#shop .shop-card header{position:relative}
#shop .shop-card header > div:nth-child(2){order:1;flex:1}
#shop .shop-bolts{order:2;margin-left:0;color:#F2C14E}
#shop #shopFace{order:3;width:92px;height:92px;border:1px solid rgba(197,160,89,.6);box-shadow:0 0 0 4px #0f0d13,0 0 0 5px rgba(197,160,89,.3),0 8px 24px rgba(0,0,0,.6);transform:none;position:relative;animation:shBreath 3.2s ease-in-out infinite;overflow:visible}
#shop #shopFace > svg{width:100%;height:100%}
#shop #shopFace .sh-prop{position:absolute;left:-18px;bottom:-10px;width:40px;height:40px;animation:shProp 2.4s ease-in-out infinite}
#shop #shopFace .sh-prop svg{width:100%;height:100%}
#shop .sh-glow{animation:shGlow 1.1s ease-in-out infinite alternate}
#shop .eyebrow{color:#C5A059;letter-spacing:.24em}
#shop .josh-line{position:relative;background:#18141d;border:1px solid rgba(197,160,89,.3);border-radius:6px;padding:8px 12px;color:#f3ead8;font-family:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;transition:opacity .15s}
#shop .josh-line::after{content:"";position:absolute;right:-7px;top:50%;width:12px;height:12px;background:#18141d;border-right:1px solid rgba(197,160,89,.3);border-top:1px solid rgba(197,160,89,.3);transform:translateY(-50%) rotate(45deg)}
#shop .josh-line.pop{animation:shPop .22s ease}
#shop .item{position:relative;background:#141118;color:#e9e1cf;border:1px solid rgba(197,160,89,.14);box-shadow:none;border-radius:2px;overflow:hidden}
#shop .item::before{content:"";position:absolute;inset:3px;pointer-events:none;
  background:linear-gradient(#C5A059,#C5A059) left top/10px 1px,linear-gradient(#C5A059,#C5A059) left top/1px 10px,
  linear-gradient(#C5A059,#C5A059) right top/10px 1px,linear-gradient(#C5A059,#C5A059) right top/1px 10px,
  linear-gradient(#C5A059,#C5A059) left bottom/10px 1px,linear-gradient(#C5A059,#C5A059) left bottom/1px 10px,
  linear-gradient(#C5A059,#C5A059) right bottom/10px 1px,linear-gradient(#C5A059,#C5A059) right bottom/1px 10px;background-repeat:no-repeat;opacity:.55;transition:opacity .2s}
#shop .item.sel{transform:none;box-shadow:inset 0 0 22px rgba(242,193,78,.16),0 0 0 1px rgba(242,193,78,.5)}
#shop .item.sel::before{opacity:1}
#shop .item b{color:#FFF8EB}
#shop .item p{color:rgba(233,225,207,.75)}
#shop .item .cost{color:#F2C14E}
#shop .item.poor .cost{color:#ff6a5a}
#shop .item.owned{opacity:.7}
#shop .item.owned .cost{color:#9fd8a8}
#shop .item::after{content:"";position:absolute;left:0;bottom:0;height:3px;width:calc(var(--hold,0) * 100%);background:linear-gradient(90deg,#C5A059,#FFF3C8);box-shadow:0 0 10px rgba(242,193,78,.8)}
#shop .sh-stamp{position:absolute;right:76px;top:50%;transform:translateY(-50%) rotate(-12deg);border:2px solid #F2C14E;color:#F2C14E;font-family:"Cinzel","Trajan Pro",Palatino,Georgia,serif;font-size:15px;letter-spacing:.3em;padding:2px 10px 2px 14px;border-radius:3px;opacity:.85;pointer-events:none;box-shadow:inset 0 0 0 1px rgba(242,193,78,.35)}
#shop .item.fresh .sh-stamp{animation:shStamp .35s cubic-bezier(.2,1.6,.4,1)}
#shop .sh-cmp{grid-column:1/2;font-size:13px;color:#9fe6a8;font-family:ui-monospace,Menlo,Consolas,monospace}
#shop .sh-cmp i{font-style:normal;color:#6fe08a}
#shop .shop-hint{color:rgba(233,225,207,.7)}
#shop .shop-hint kbd{border-color:rgba(197,160,89,.5);color:#F2C14E}
#shop .sh-flash{position:absolute;inset:0;background:#FFF8EB;pointer-events:none;opacity:0;animation:shFlash .35s ease-out}
#shop .sh-motes{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0}
@keyframes shBreath{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-2px) scale(1.015)}}
@keyframes shProp{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(4deg) translateY(-1px)}}
@keyframes shGlow{from{opacity:.65;filter:drop-shadow(0 0 2px currentColor)}to{opacity:1;filter:drop-shadow(0 0 6px #ffd24a)}}
@keyframes shPop{from{opacity:.3;transform:translateY(3px)}to{opacity:1;transform:none}}
@keyframes shStamp{from{transform:translateY(-50%) rotate(-12deg) scale(2.2);opacity:0}to{transform:translateY(-50%) rotate(-12deg) scale(1);opacity:.85}}
@keyframes shFlash{from{opacity:.5}to{opacity:0}}
/* tools & items */
.iv-slot.cat-atk::before{border-color:rgba(255,59,48,.55)}
.iv-slot.cat-exp::before{border-color:rgba(242,193,78,.6)}
.iv-slot.cat-def::before{border-color:rgba(77,208,225,.6)}
.iv-slot.cat-atk:not(.locked)::before{box-shadow:inset 0 0 8px rgba(255,59,48,.25)}
.iv-slot.cat-exp:not(.locked)::before{box-shadow:inset 0 0 8px rgba(242,193,78,.25)}
.iv-slot.cat-def:not(.locked)::before{box-shadow:inset 0 0 8px rgba(77,208,225,.25)}
.iv-art{position:relative}
.iv-art::before{content:"";position:absolute;left:50%;top:50%;width:150px;height:150px;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle,var(--glow,rgba(230,215,170,.3)),transparent 65%);opacity:.55;animation:ivPulse 4s ease-in-out infinite;animation-delay:var(--ph,0s)}
.iv-art:not(.locked) svg{position:relative;animation:ivFloat 4s ease-in-out infinite;animation-delay:var(--ph,0s)}
.iv-art.locked::before{display:none}
@keyframes ivFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
@keyframes ivPulse{0%,100%{opacity:.4}50%{opacity:.65}}
.iv-wheel{display:flex;align-items:center;gap:14px;padding:10px 4px 4px}
.iv-wheel .w{position:relative;width:96px;height:96px;flex:none;border-radius:50%;background:radial-gradient(circle,rgba(20,17,24,.9) 30%,rgba(20,17,24,.6) 70%,transparent 72%);box-shadow:0 0 0 1px rgba(197,160,89,.35)}
.iv-wheel .w span{position:absolute;width:30px;height:30px;margin:-15px 0 0 -15px;border-radius:50%;background:#141118;border:1px solid rgba(197,160,89,.45);display:flex;align-items:center;justify-content:center}
.iv-wheel .w span svg{width:22px;height:22px}
.iv-wheel .w span.empty{border-style:dashed;opacity:.5}
.iv-wheel .w span.on{border-color:#FF3B30;box-shadow:0 0 8px rgba(255,59,48,.5)}
.iv-wheel small{font-size:12px;font-style:italic;color:var(--pm-dim);line-height:1.5}
.iv-wheel small b{font-style:normal;color:var(--pm-gold);font-variant:small-caps;letter-spacing:.08em}
`;
  document.head.appendChild(st);
})();

/* ---------- the shop: portrait, cards, remarks ---------- */
const _shOpen = openShop;
openShop = function (v) {
  SH.opening = true;
  const r = _shOpen.apply(this, arguments);
  SH.opening = false; SH.lastSel = Shop.sel; SH.fresh = -1;
  try {
    const f = $('#shopFace');
    if (f && SH_PROP[Shop.v] && !f.querySelector('.sh-prop')) f.insertAdjacentHTML('beforeend', `<span class="sh-prop">${SH_PROP[Shop.v]}</span>`);
    const hint = $('#shop .shop-hint'); if (hint) hint.innerHTML = '<kbd>↑</kbd><kbd>↓</kbd> choose · hold <kbd>J</kbd> buy · <kbd>Esc</kbd> leave';
    shMotesStart();
  } catch (e) { logErr('zone/shop-silk.js:open', e); }
  return r;
};
function shSay(t) { const el = $('#joshLine'); if (!el || !t) return; el.textContent = t; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
const _shRender = renderShop;
renderShop = function () {
  const r = _shRender.apply(this, arguments);
  try { shDecorate(); } catch (e) { logErr('zone/shop-silk.js:render', e); }
  return r;
};
const SH_BAT = [1, 1.4, 1.8, 2.2];
function shDecorate() {
  const V = VENDORS[Shop.v], D = Save.data, list = vitems(V);
  $$('#shopItems .item').forEach(old => {
    // fresh listeners: hover remarks and press-and-hold buying
    const b = old.cloneNode(true); old.replaceWith(b);
    const i = +b.dataset.i, s = list[i]; if (!s) return;
    if (itemOwned(s, D)) { b.insertAdjacentHTML('beforeend', '<span class="sh-stamp">OWNED</span>'); if (i === SH.fresh) b.classList.add('fresh'); }
    const m = /^bat([123])$/.exec(s.id);
    if (m && !itemOwned(s, D)) {
      const lv = +m[1], cur = Math.round(10 * SH_BAT[D.batLv || 0]), nxt = Math.round(10 * SH_BAT[lv]);
      b.querySelector('p').insertAdjacentHTML('afterend', `<div class="sh-cmp">Damage ${cur} ➔ ${nxt} <i>▲ +${Math.round(100 * (nxt - cur) / cur)}%</i></div>`);
    }
    b.addEventListener('mouseenter', () => { if (Shop.sel !== i) { Shop.sel = i; $$('#shopItems .item').forEach((x, j) => x.classList.toggle('sel', j === i)); shRemark(); } });
    b.addEventListener('pointerdown', e => { e.preventDefault(); Shop.sel = i; SH.ptr = true; $$('#shopItems .item').forEach((x, j) => x.classList.toggle('sel', j === i)); buy(i); });
    const up = () => { SH.ptr = false; };
    b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up);
  });
  SH.fresh = -1;
  if (!SH.opening && Shop.sel !== SH.lastSel) shRemark();
}
function shRemark() {
  SH.lastSel = Shop.sel;
  if (performance.now() < SH.quietUntil) return;
  const V = VENDORS[Shop.v], s = vitems(V)[Shop.sel]; if (!s) return;
  shSay(shPeek(V, s, Save.data));
}

/* ---------- hold to buy ---------- */
addEventListener('keydown', e => { if (SH_OK.includes(e.code)) SH.keys.add(e.code); }, true);
addEventListener('keyup', e => { SH.keys.delete(e.code); }, true);
addEventListener('blur', () => { SH.keys.clear(); SH.ptr = false; });
const shPadHeld = () => { const ps = navigator.getGamepads ? navigator.getGamepads() : []; for (const p of ps) if (p && [0, 1, 2, 3].some(k => p.buttons[k] && p.buttons[k].pressed)) return true; return false; };
const shHeld = src => (src === 'key' ? SH.keys.size > 0 : src === 'pad' ? shPadHeld() : SH.ptr);
const _shBuy = buy;
buy = function (i) {
  const V = VENDORS[Shop.v], s = vitems(V)[i], D = Save.data;
  // just bought it and still holding the button (key repeat): stay quiet until it is let go
  if (SH.after && (SH.keys.size || SH.ptr || shPadHeld())) return;
  SH.after = false;
  if (!s || UI.modal !== 'shop' || !shBuyable(s, D)) { SH.quietUntil = performance.now() + 1800; return _shBuy.apply(this, arguments); }
  if (SH.hold) return;
  const src = SH.keys.size ? 'key' : SH.ptr ? 'ptr' : shPadHeld() ? 'pad' : null;
  if (!src) return _shBuy.apply(this, arguments);   // called from somewhere that can't hold: just buy
  SH.hold = { i, src, t0: performance.now(), tick: 0 };
  SFX.ui();
  const step = () => {
    const H = SH.hold; if (!H) return;
    const el = $(`#shopItems .item[data-i="${H.i}"]`);
    const p = Math.min(1, (performance.now() - H.t0) / 500);
    if (!shHeld(H.src) || Shop.sel !== H.i || UI.modal !== 'shop') { if (el) el.style.setProperty('--hold', 0); SH.hold = null; return; }
    if (el) el.style.setProperty('--hold', p);
    if (p - H.tick > 0.2) { H.tick = p; try { SFX.tick(); } catch (e) { /* */ } }
    if (p >= 1) { SH.hold = null; shComplete(H.i); return; }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};
function shComplete(i) {
  const b0 = Save.data.bolts;
  SH.fresh = i; SH.quietUntil = performance.now() + 2500; SH.after = true;
  _shBuy(i);
  if (Save.data.bolts >= b0 && !itemOwned(vitems(VENDORS[Shop.v])[i] || {}, Save.data)) return;
  // the payoff: a flash and a rain of bolts
  const card = $('#shop .shop-card');
  if (card) { const f = document.createElement('div'); f.className = 'sh-flash'; card.appendChild(f); setTimeout(() => f.remove(), 400); }
  for (let k = 0; k < 6; k++) setTimeout(() => { try { SFX.coin(); } catch (e) { /* */ } }, 60 + k * 55);
}

/* ---------- motes rising behind the card ---------- */
function shMotesStart() {
  const ov = $('#shop'); if (!ov) return;
  let cv = ov.querySelector('.sh-motes');
  if (!cv) { cv = document.createElement('canvas'); cv.className = 'sh-motes'; ov.insertBefore(cv, ov.firstChild); }
  const [c1, c2, kind] = SH_MOTE[Shop.v] || SH_MOTE.josh;
  SH.motes = Array.from({ length: 18 }, () => ({ x: Math.random(), y: Math.random(), v: 0.015 + Math.random() * 0.03, s: 1 + Math.random() * 2.2, w: Math.random() * 6.28, c: Math.random() < 0.6 ? c1 : c2 }));
  cancelAnimationFrame(SH.raf);
  let last = performance.now();
  const draw = now => {
    if (UI.modal !== 'shop') return;
    SH.raf = requestAnimationFrame(draw);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const W = cv.clientWidth, Hh = cv.clientHeight;
    if (cv.width !== W || cv.height !== Hh) { cv.width = W; cv.height = Hh; }
    const g = cv.getContext('2d'); g.clearRect(0, 0, W, Hh);
    for (const m of SH.motes) {
      m.y -= m.v * dt; m.w += dt; if (m.y < -0.05) { m.y = 1.05; m.x = Math.random(); }
      const x = (m.x + Math.sin(m.w) * 0.01) * W, y = m.y * Hh, a = Math.min(1, m.y * 3) * Math.min(1, (1.05 - m.y) * 4) * 0.7;
      g.globalAlpha = a; g.fillStyle = m.c;
      if (kind === 'star') { g.fillRect(x - m.s, y - 0.5, m.s * 2, 1); g.fillRect(x - 0.5, y - m.s, 1, m.s * 2); }
      else if (kind === 'spark') { g.beginPath(); g.arc(x, y, m.s * 0.7, 0, 7); g.fill(); g.globalAlpha = a * 0.3; g.beginPath(); g.arc(x, y, m.s * 2.2, 0, 7); g.fill(); }
      else { g.beginPath(); g.arc(x, y, m.s * 0.9, 0, 7); g.fill(); }
    }
    g.globalAlpha = 1;
  };
  SH.raf = requestAnimationFrame(draw);
}

/* ---------- Tools & Items: colour codes, floating icon, wheel preview ---------- */
const IV_CAT = {
  atk: ['boom', 'curve', 'shock', 'split', 'flash', 'kinetic', 'machine'],
  exp: ['grapple', 'magnet', 'gloves', 'cleats', 'glider', 'wristband', 'quill', 'compass', 'radar', 'monocle'],
  def: ['brew', 'bark'],
};
const IV_GLOW = { shock: 'rgba(111,211,255,.55)', boom: 'rgba(255,138,42,.55)', curve: 'rgba(77,208,225,.45)', split: 'rgba(255,90,70,.5)', flash: 'rgba(255,240,180,.6)',
  glider: 'rgba(242,193,78,.55)', brew: 'rgba(77,208,225,.5)', grapple: 'rgba(242,193,78,.45)', magnet: 'rgba(255,80,80,.45)', machine: 'rgba(255,138,42,.45)',
  bolts: 'rgba(200,200,210,.4)', ore: 'rgba(159,216,232,.45)', pebbles: 'rgba(155,227,106,.45)', stubs: 'rgba(242,193,78,.55)', relics: 'rgba(242,193,78,.45)', kinetic: 'rgba(243,234,216,.4)' };
const ivCatOf = id => (IV_CAT.atk.includes(id) ? 'atk' : IV_CAT.exp.includes(id) ? 'exp' : IV_CAT.def.includes(id) ? 'def' : '');
const ivItem = id => { for (const R of IV_ROWS) for (const it of R.items) if (it.id === id) return it; return null; };
if (typeof PM_VIEWS !== 'undefined' && PM_VIEWS.tools) {
  const _ivRender = PM_VIEWS.tools.render;
  PM_VIEWS.tools.render = function (body) {
    const r = _ivRender.apply(this, arguments);
    try { ivDecorate(body); } catch (e) { logErr('zone/shop-silk.js:tools', e); }
    return r;
  };
}
function ivDecorate(body) {
  body.querySelectorAll('.iv-slot[data-r]').forEach(el => {
    const it = IV_ROWS[+el.dataset.r].items[+el.dataset.c], c = it && ivCatOf(it.id);
    if (c) el.classList.add('cat-' + c);
  });
  const T = ivAt(), art = body.querySelector('.iv-art');
  if (art && T) {
    art.style.setProperty('--glow', IV_GLOW[T.id] || (/^pen/.test(T.id) ? 'rgba(242,193,78,.55)' : 'rgba(230,215,170,.3)'));
    art.style.setProperty('--ph', -((performance.now() / 1000) % 4) + 's');   // keeps floating smoothly across re-renders
  }
  // the quick-swap wheel as it will look in play: up Kinetic, right slot 1, left slot 2, down gadget
  const box = body.querySelector('.iv-case'); if (!box || typeof arsQ !== 'function') return;
  const A = arsQ(), mode = arsMode();
  const icon = id => { const it = id && ivItem(id); return it ? it.art() : ''; };
  const spot = (x, y, id, on) => `<span class="${id ? '' : 'empty'} ${on ? 'on' : ''}" style="left:${x}%;top:${y}%">${icon(id)}</span>`;
  const b0 = A.balls[0], b1 = A.balls[1];
  const modeOf = id => (id && ARS_BALL[id] ? ARS_BALL[id].mode : -1);
  box.insertAdjacentHTML('beforeend', `<div class="iv-wheel"><div class="w">
      ${spot(50, 16, 'kinetic', mode === 0)}${spot(84, 50, b0, b0 && modeOf(b0) === mode)}${spot(16, 50, b1, b1 && modeOf(b1) === mode)}${spot(50, 84, A.gadget, false)}
    </div><small><b>Quick-Swap Wheel</b><br>Hold ${pmEsc(Bindings.label('swap'))} in play: up for the Kinetic ball, right for slot 1, left for slot 2, down for your gadget.</small></div>`);
}
