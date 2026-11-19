'use strict';
/* =========================================================
   BADGE LOADOUT · a pause-menu tab where Nathan pins badges to
   his jersey. Every badge costs Charm Notches:
     2 to start · +1 for every 2 of Monfort's time trials beaten
     · +2 more from Pip & Squeak (for bolts)
   Loaded after zone/gauntlets.js on every story page.
   ========================================================= */
const LOADOUT = [
  ...BADGES.map(b => ({ id: b.id, name: b.name, desc: b.desc, cost: b.id === 'laststand' ? 2 : 1, from: `Pip & Squeak's VIP stand · ${b.stubs} Golden Stub${b.stubs > 1 ? 's' : ''}` })),
  { id: 'pyro',  name: 'Pyro-Core Charm', cost: 2, desc: 'The 3rd hit of every combo bursts into a ring of flame.', from: 'The Foundry Conveyor Run (a gauntlet)' },
  { id: 'ace',   name: 'Air-Ace Badge',   cost: 2, desc: 'Out of baseballs in mid-air? A fresh one recharges after 0.9s.', from: 'The Crystal Zero-G Trial (a gauntlet)' },
  { id: 'crown', name: 'The MVP Crown',   cost: 3, desc: 'Double Hype from every hit, plus golden flames.', from: 'The Championship Colosseum · Gold Cup' },
];
const NOTCH_START = 2, NOTCH_SHOP = 2;
const NOTCH_SVG = '<svg viewBox="0 0 16 16"><path d="M8 1 L15 8 L8 15 L1 8 Z" fill="currentColor" stroke="#0d0b10" stroke-width="2"/></svg>';

const Loadout = {
  sel: 0,
  // first run on a save: carry over gauntlet prizes, then pin whatever you own while notches last
  ensure() {
    const q = Save.data.q;
    if (q.eq) return q.eq;
    const own = q.badges = q.badges || {}, g = q.gx || {};
    for (const k of ['pyro', 'ace', 'crown']) if (g[k]) own[k] = 1;
    q.eq = {};
    let free = this.notches();
    for (const b of LOADOUT) if (own[b.id] && b.cost <= free) { q.eq[b.id] = 1; free -= b.cost; }
    return q.eq;
  },
  owned(id) { return !!(Save.data.q.badges || {})[id]; },
  pinned(id) { return !!this.ensure()[id] && this.owned(id); },
  notches() { const q = Save.data.q; return NOTCH_START + Math.floor(Object.keys(q.trials || {}).length / 2) + Math.min(NOTCH_SHOP, q.notchBuy || 0); },
  used() { return LOADOUT.reduce((n, b) => n + (this.pinned(b.id) ? b.cost : 0), 0); },
  free() { return this.notches() - this.used(); },
  // a brand-new badge: pin it straight away if it fits
  gained(id) {
    const b = LOADOUT.find(x => x.id === id); if (!b) return;
    const eq = this.ensure();
    if (!eq[id] && b.cost <= this.free()) { eq[id] = 1; toast(`${b.name.toUpperCase()} · PINNED TO YOUR JERSEY`); }
    else if (!eq[id]) toast(`${b.name.toUpperCase()} · NO FREE NOTCHES · SWAP IT IN FROM PAUSE › BADGES`);
    applyUpgrades(); saveGame();
  },
  toggle(i) {
    const b = LOADOUT[i], eq = this.ensure(), say = t => { $('#badgeLine').textContent = t; };
    if (!b) return;
    if (!this.owned(b.id)) { SFX.deny(); say(`Not yours yet. ${b.from}.`); return; }
    if (eq[b.id]) { delete eq[b.id]; SFX.ui(); say(`${b.name} unpinned. ${this.free()} notch${this.free() === 1 ? '' : 'es'} free.`); }
    else if (b.cost > this.free()) { SFX.deny(); say(`${b.name} needs ${b.cost} notch${b.cost > 1 ? 'es' : ''}. Unpin something first (${this.free()} free).`); return; }
    else { eq[b.id] = 1; SFX.buy(); say(`${b.name} pinned!`); }
    applyUpgrades(); saveGame(); this.render();
  },
  move(d) { this.sel = (this.sel + d + LOADOUT.length) % LOADOUT.length; SFX.ui(); this.render(); },
  render() {
    const N = this.notches(), U = this.used();
    $('#badgeNotches').innerHTML = Array.from({ length: N }, (_, k) => `<i class="${k < U ? 'on' : ''}">${NOTCH_SVG}</i>`).join('') + `<span>${N - U} / ${N} FREE</span>`;
    $('#badgeList').innerHTML = LOADOUT.map((b, i) => {
      const own = this.owned(b.id), on = own && this.pinned(b.id);
      const pips = Array.from({ length: b.cost }, () => NOTCH_SVG).join('');
      return `<button class="item badge ${i === this.sel ? 'sel' : ''} ${on ? 'pinned' : ''} ${own ? '' : 'locked'}" data-i="${i}">
        <b>${own ? b.name : '???'}<span class="tag">${on ? 'PINNED' : own ? 'SPARE' : 'LOCKED'}</span></b><span class="cost">${pips}</span>
        <p>${own ? b.desc : 'Found at: ' + b.from}</p></button>`;
    }).join('');
    $$('#badgeList .item').forEach(el => {
      el.addEventListener('mouseenter', () => { this.sel = +el.dataset.i; $$('#badgeList .item').forEach((x, j) => x.classList.toggle('sel', j === this.sel)); });
      el.addEventListener('click', () => this.toggle(+el.dataset.i));
    });
    const s = $$('#badgeList .item')[this.sel]; if (s) s.scrollIntoView({ block: 'nearest' });
  },
  open() {
    this.ensure();
    const t = Object.keys(Save.data.q.trials || {}).length;
    $('#badgeLine').textContent = LOADOUT.some(b => this.owned(b.id))
      ? 'Pin badges to your jersey. Each one costs Charm Notches.'
      : 'No badges yet. Pip & Squeak sell them; the gauntlets hide the rest.';
    $('#badgeHow').textContent = `Notches: ${NOTCH_START} to start · +1 per 2 time trials (${t}/8 beaten) · Pip & Squeak sell ${NOTCH_SHOP} more (${Math.min(NOTCH_SHOP, Save.data.q.notchBuy || 0)}/${NOTCH_SHOP})`;
    this.render(); SFX.paper(); openModal('badges');
  },
};

/* ---------- the menu ---------- */
(function buildBadgeMenu() {
  const st = document.createElement('style');
  st.textContent = `#badgeNotches{display:flex;align-items:center;gap:5px;margin-top:6px}
#badgeNotches i{width:18px;height:18px;color:#fff8ea;display:block}#badgeNotches i.on{color:#f2c14e}#badgeNotches i svg,.item.badge .cost svg{width:100%;height:100%;display:block}
#badgeNotches span{font-family:var(--display);font-size:13px;letter-spacing:.1em;margin-left:6px}
.item.badge .cost{color:#a8452a;gap:3px}.item.badge .cost svg{width:16px;height:16px}
.item.badge.pinned{box-shadow:inset 0 0 0 3px #f2c14e}.item.badge.pinned .tag{background:#c08a1e}.item.badge.locked .tag{background:#7a6a5a}
#badgeHow{font-size:13px;opacity:.75;margin:0 0 10px}`;
  document.head.appendChild(st);
  const el = document.createElement('div'); el.id = 'badges'; el.className = 'overlay';
  el.innerHTML = `<div class="card shop-card quest-card"><header><div class="josh-face" style="background:#c08a1e"><svg viewBox="0 0 60 60"><path d="M14 10 H46 L50 34 L30 54 L10 34 Z" fill="#e8361c" stroke="#0d0b10" stroke-width="3.5" stroke-linejoin="round"/><circle cx="30" cy="30" r="10" fill="#f2c14e" stroke="#0d0b10" stroke-width="3"/></svg></div>
    <div><p class="eyebrow">NATHAN'S JERSEY · BADGES</p><p class="josh-line" id="badgeLine"></p><div id="badgeNotches"></div></div></header>
    <p id="badgeHow"></p><div id="badgeList"></div><p class="shop-hint"><kbd>↑</kbd><kbd>↓</kbd> choose · <kbd>Enter</kbd> pin / unpin · <kbd>Esc</kbd> close</p></div>`;
  document.body.appendChild(el);
  el.addEventListener('click', e => { if (e.target === el) closeModal(); });
  // a "Badges" button in the pause menu, right after the Quest Log
  const nav = $('#pause nav'), after = nav && (nav.querySelector('[data-p="quests"]') || nav.querySelector('[data-p="map"]'));
  if (nav && after) {
    const b = document.createElement('button'); b.className = 'pbtn'; b.dataset.p = 'badges'; b.textContent = 'Badges';
    after.after(b); pauseBtns.splice(pauseBtns.indexOf(after) + 1, 0, b);
    b.addEventListener('mouseenter', () => { pauseSel = pauseBtns.indexOf(b); markPause(); });
    b.addEventListener('click', () => pauseAction('badges'));
  }
})();
const _ldPauseAction = pauseAction;
pauseAction = function (a) { if (a === 'badges') { SFX.ui(); closeModal(); Loadout.open(); return; } return _ldPauseAction(a); };
// keyboard: runs before the generic menu keys so Enter pins instead of closing
addEventListener('keydown', e => {
  if (UI.modal !== 'badges' || e.repeat) return;
  const c = e.code;
  if (c === 'ArrowDown' || c === 'KeyS') Loadout.move(1);
  else if (c === 'ArrowUp' || c === 'KeyW') Loadout.move(-1);
  else if (c === 'Enter' || c === 'Space' || c === 'KeyJ') Loadout.toggle(Loadout.sel);
  else return;
  e.preventDefault(); e.stopImmediatePropagation();
}, true);
// controller: handle the menu presses, leave B (dash) for the generic "close"
const _ldPoll = Input.pollPad;
Input.pollPad = function () {
  _ldPoll.call(this);
  if (UI.modal !== 'badges') return;
  const B = this.buffered;
  if (B.has('down')) Loadout.move(1);
  if (B.has('up')) Loadout.move(-1);
  if (B.has('jump') || B.has('attack')) Loadout.toggle(Loadout.sel);
  for (const a of ['down', 'up', 'jump', 'attack', 'map']) B.delete(a);
};

/* ---------- Pip & Squeak: badges pin themselves, and two notches for sale ---------- */
if (typeof VENDORS !== 'undefined' && VENDORS.scalpers) {
  const V = VENDORS.scalpers;
  for (const it of V.items) if (it.id.startsWith('badge_')) { const g0 = it.grant, id = it.id.slice(6); it.grant = D => { g0(D); Loadout.gained(id); }; }
  const notch = (n, cost, line) => ({ id: 'notch' + n, name: `Charm Notch ${n === 1 ? 'I' : 'II'}`, cost, tag: 'NOTCH',
    desc: 'Squeak stitches one more notch into your jersey: room for another badge.', line,
    owned: D => (D.q.notchBuy || 0) >= n,
    locked: D => n > 1 && (D.q.notchBuy || 0) < n - 1 ? '"One notch at a time. Squeak\'s hands get tired."' : '',
    grant: D => { Loadout.ensure(); D.q.notchBuy = n; } });
  V.items.push(notch(1, 450, '"Hand-stitched. By Squeak. Don\'t ask what with."'), notch(2, 900, '"Last one. Any more and the jersey\'s just holes."'));
  V.poor = n => `"${n} more bolts. Badges are stubs, notches are bolts. Squeak made the rules."`;
}

/* ---------- Monfort's time trials pay out notches ---------- */
const _ldFinish = Quests.finishTrial;
Quests.finishTrial = function (z) {
  const before = Loadout.notches();
  const r = _ldFinish.call(this, z);
  if (Loadout.notches() > before) setTimeout(() => { SFX.unlock(); toast('+1 CHARM NOTCH · ROOM FOR ANOTHER BADGE (PAUSE › BADGES)'); }, 1400);
  return r;
};

/* ---------- the Clipboard tracks Fionn's pebbles too ---------- */
const _ldEntries = Quests.entries;
Quests.entries = function () {
  const L = _ldEntries.call(this), D = Save.data, n = pebblesFound(), ch = D.charms || 0;
  if (D.fionnDead || n > 0) L.push({ title: 'Keeper of Pebbles', who: 'Fionn', done: ch >= CHARMS.length && n >= PEBBLE_TOTAL, reward: 'Five bat charms, each with +1 max HP',
    steps: [{ txt: `Find Lucky Pebbles hidden in every zone (${n}/${PEBBLE_TOTAL})`, ok: n >= PEBBLE_TOTAL },
      { txt: D.fionnDead ? `Hand them to Fionn at Base Camp, 10 per charm (${D.pebblesGiven || 0} handed in)` : 'Somebody who really likes rocks would want these', ok: ch >= CHARMS.length },
      ...CHARMS.map((c, i) => ({ txt: `${c.name}: ${c.desc}`, ok: ch > i }))] });
  return L;
};

Loadout.ensure(); applyUpgrades();
