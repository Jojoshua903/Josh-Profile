'use strict';
/* =========================================================
   OUTFITS · Lars's dented locker on the back wall beside the
   Base Camp bench (the courtyard one). Six looks, each one
   recolours Nathan, adds accessories, can swap the bat and
   adds a little sound or trail. Choice: Save.data.q.outfit.
   Hooks into NATHAN_LOOK (game/render.js). Loaded on every
   story page after zone/pm-log.js.
   ========================================================= */
const OUTFIT_BASE = Object.assign({}, NATHAN_LOOK);
const tieDye = (() => { const g = ctx.createLinearGradient(-10, -36, 10, -12); ['#ff3b6a', '#ff9a2a', '#f2e04e', '#4adf8a', '#3aa0ff', '#b56aff'].forEach((c, i, a) => g.addColorStop(i / (a.length - 1), c)); return g; })();
const OUTFITS = [
  { id: 'rookie', name: 'Rookie Uniform', from: 'Your own kit', desc: 'The classic flame-red jersey, white pants and red cap. The standard bat.', have: () => true, look: {} },
  { id: 'mechanic', name: 'Dugout Mechanic', from: 'Buy out everything at Josh\'s Workbench', desc: 'A sleeveless blue work overall, soot on your cheeks and Josh\'s old welding goggles on your cap. Your bat is now a huge wrench that clangs on every swing.',
    have: D => { try { return vitems(VENDORS.josh).filter(s => s.tag !== 'QUEST' && s.tag !== 'SECRET' && s.tag !== 'ACT III').every(s => itemOwned(s, D)); } catch (e) { logErr('outfits: josh', e); return false; } },
    look: { shirt: '#2a5a9a', stripe: '#1a3a6a', sleeve: '#f3ead8', pants: '#2a5a9a', pants2: '#244e86', num: '#f2c14e' } },
  { id: 'mage', name: 'Storm Mage Cape', from: 'Seal all 4 of Milo\'s Cursed Spellbooks', desc: 'A far-too-big purple wizard cape and a crooked pointy hat over your kit. Purple sparks and little stars trail every jump and dash.',
    have: D => D.q.milo === 'done', look: { sleeve: '#4a2a8a' } },
  { id: 'zen', name: 'Zen Tie-Dye', from: 'Finish Deniz\'s herbal tea quest', desc: 'A tie-dye shirt, round hippie shades, a flower garland and beach sandals. Your running goes flip-flop and your swings glow turquoise and gold.',
    have: D => D.q.deniz === 'done', look: { shirt: tieDye, stripe: 'rgba(255,255,255,.35)', sleeve: '#f0cfa8', cap: '#f2e04e', pants: '#e9d9b4', pants2: '#d9c9a4', num: '#0d0b10' } },
  { id: 'geode', name: 'Geode Explorer', from: 'Find all 50 Lucky Pebbles for Fionn', desc: 'A beige explorer outfit, a miner\'s helmet with a real headlamp that lights up dark caves, and a backpack full of glittering stones. The bat is studded with glowing crystals.',
    have: () => pebblesFound() >= PEBBLE_TOTAL, look: { shirt: '#c8b48a', stripe: '#a8946a', sleeve: '#c8b48a', pants: '#8a7a5a', pants2: '#7a6a4a', num: '#5a4a2a' } },
  { id: 'shadow', name: 'Shadow MVP', from: 'Finish the game in Sudden Death mode', desc: 'Pitch black and gold. Your face is lost in the shadow under the cap, except for two glowing red eyes. Leaves a trail of shadow and flame behind every move.',
    have: D => (typeof Trophies !== 'undefined' && (Trophies.has('no_extra') || Trophies.has('undefeated'))) || (D.q.sudden && !D.shattered && Object.keys(D.q.endings || {}).length > 0),
    look: { shirt: '#0d0b10', stripe: '#f2c14e', cap: '#16121c', sleeve: '#0d0b10', pants: '#1a1420', pants2: '#120e18', num: '#f2c14e', skin: '#1a1420' } },
];
const outfitNow = () => OUTFITS.find(o => o.id === Save.data.q.outfit && o.have(Save.data)) || OUTFITS[0];

/* ---------- extras drawn in Nathan's local space (facing right, feet at 0,0) ---------- */
const OUTFIT_BACK = {
  mage(P, run) {
    const flap = Math.sin(Game.time * 9) * 3 + (P.onGround ? Math.abs(P.vx) / 60 : 6) + (P.dashT > 0 ? 10 : 0);
    ctx.beginPath(); ctx.moveTo(-6, -36); ctx.quadraticCurveTo(-22 - flap, -20, -26 - flap * 1.4, 2 + run * 2); ctx.lineTo(-6, -2); ctx.closePath(); inked('#5a2aa8', 2.5);
    ctx.fillStyle = '#f2c14e'; ctx.fillRect(-18 - flap, -14, 2, 2); ctx.fillRect(-13 - flap * 0.6, -24, 2, 2);
  },
  geode() {
    rr(-17, -34, 9, 17, 3); inked('#7a5a3a', 2.5);
    for (const [x, y, c] of [[-14, -36, '#b388ff'], [-11, -37, '#64e6aa'], [-16, -38, '#9fe6ff']]) { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x + 2, y); ctx.lineTo(x, y + 2); ctx.lineTo(x - 2, y); ctx.closePath(); ctx.fill(); }
  },
};
const OUTFIT_HEAD = {
  mechanic(P, hy) {
    ctx.fillStyle = 'rgba(40,30,30,.45)'; ctx.beginPath(); ctx.ellipse(10, hy + 5, 3, 1.6, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(-1, hy + 3, 2.5, 1.4, 0, 0, 7); ctx.fill();
    rr(-1, hy - 13, 14, 5, 2); inked('#3a3340', 1.8);
    ctx.fillStyle = '#6fd3ff'; ctx.beginPath(); ctx.arc(3, hy - 10.5, 2, 0, 7); ctx.arc(9, hy - 10.5, 2, 0, 7); ctx.fill();
  },
  mage(P, hy) {
    ctx.beginPath(); ctx.moveTo(-10, hy - 4); ctx.lineTo(14, hy - 6); ctx.quadraticCurveTo(4, hy - 18, -6, hy - 34); ctx.quadraticCurveTo(-4, hy - 18, -10, hy - 4); ctx.closePath(); inked('#5a2aa8', 2.5);
    ctx.fillStyle = '#f2c14e'; ctx.beginPath(); ctx.arc(-6, hy - 34, 2.2, 0, 7); ctx.fill(); ctx.fillRect(0, hy - 16, 2, 2); ctx.fillRect(4, hy - 10, 2, 2);
  },
  zen(P, hy) {
    ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.fillStyle = 'rgba(20,20,30,.85)';
    for (const x of [4, 10]) { ctx.beginPath(); ctx.arc(x, hy, 2.6, 0, 7); ctx.fill(); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(6.6, hy); ctx.lineTo(7.4, hy); ctx.stroke();
    for (let k = 0; k < 5; k++) { ctx.fillStyle = ['#ff6a9a', '#f2e04e', '#ff9a2a', '#9be36a', '#b56aff'][k]; ctx.beginPath(); ctx.arc(-6 + k * 4, hy + 12 + Math.abs(k - 2) * -0.8, 2.4, 0, 7); ctx.fill(); }
  },
  geode(P, hy) {
    ctx.beginPath(); ctx.moveTo(-10, hy - 2); ctx.quadraticCurveTo(-9, hy - 15, 3, hy - 15); ctx.quadraticCurveTo(15, hy - 15, 14, hy - 2); ctx.closePath(); inked('#f2c14e', 2.5);
    ctx.fillStyle = INK; ctx.fillRect(-11, hy - 3, 27, 3);
    rr(10, hy - 12, 6, 6, 2); inked('#fff3c0', 1.5);
    // the headlamp: a real beam
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(14, 0, 150, 0); g.addColorStop(0, 'rgba(255,240,180,.42)'); g.addColorStop(1, 'rgba(255,240,180,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(15, hy - 10); ctx.lineTo(150, hy - 44); ctx.lineTo(150, hy + 30); ctx.closePath(); ctx.fill();
    ctx.restore();
  },
  shadow(P, hy) {
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.beginPath(); ctx.arc(2, hy, 10, 0, 7); ctx.fill();
    ctx.save(); ctx.shadowColor = '#ff1a1a'; ctx.shadowBlur = 8; ctx.fillStyle = '#ff3a2a';
    ctx.beginPath(); ctx.ellipse(5, hy, 1.8, 1.2, 0, 0, 7); ctx.ellipse(10, hy - 0.5, 1.8, 1.2, 0, 0, 7); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#f2c14e'; ctx.fillRect(-4, hy - 12, 10, 2);
  },
};
const OUTFIT_BAT = {
  mechanic() {
    ctx.beginPath(); ctx.moveTo(-3, -2.5); ctx.lineTo(24, -2.5); ctx.lineTo(24, 2.5); ctx.lineTo(-3, 2.5); ctx.closePath(); inked('#9aa0aa', 2.5);
    ctx.beginPath(); ctx.arc(30, 0, 8, 0.7, Math.PI * 2 - 0.7); ctx.lineTo(30, 0); ctx.closePath(); inked('#b8bcc4', 2.5);
    ctx.fillStyle = INK; ctx.fillRect(-4, -3, 5, 6); return true;
  },
  geode(P) {
    ctx.beginPath(); ctx.moveTo(-2, -2); ctx.lineTo(30, -4.5); ctx.quadraticCurveTo(35, 0, 30, 4.5); ctx.lineTo(-2, 2); ctx.closePath(); inked('#c9a36b', 2.5);
    const glow = 0.6 + Math.sin(Game.time * 4) * 0.25;
    ctx.save(); ctx.shadowBlur = 10;
    for (const [x, c] of [[12, '#b388ff'], [19, '#64e6aa'], [26, '#b388ff']]) { ctx.shadowColor = c; ctx.fillStyle = c; ctx.globalAlpha = glow; ctx.beginPath(); ctx.moveTo(x, -7); ctx.lineTo(x + 3, -2); ctx.lineTo(x, 2); ctx.lineTo(x - 3, -2); ctx.closePath(); ctx.fill(); }
    ctx.restore(); ctx.fillStyle = INK; ctx.fillRect(-4, -3, 4, 6); return true;
  },
  shadow() {
    ctx.beginPath(); ctx.moveTo(-2, -2); ctx.lineTo(30, -4.5); ctx.quadraticCurveTo(35, 0, 30, 4.5); ctx.lineTo(-2, 2); ctx.closePath(); inked('#1a1420', 2.5);
    ctx.fillStyle = GOLD; ctx.fillRect(16, -2, 2, 4); ctx.fillRect(22, -2.5, 2, 5); ctx.fillStyle = INK; ctx.fillRect(-4, -3, 4, 6); return true;
  },
};
function applyOutfit() {
  const o = outfitNow();
  Object.assign(NATHAN_LOOK, OUTFIT_BASE, o.look, {
    back: OUTFIT_BACK[o.id] || null,
    head: OUTFIT_HEAD[o.id] || null,
    // the Spare Bat and Lars's max bat always show as themselves
    bat: OUTFIT_BAT[o.id] ? (P => P.batLook !== 'wood' && P.batLook !== 'max' && OUTFIT_BAT[o.id](P)) : null,
  });
}

/* ---------- sounds & trails ---------- */
const _ofSwing = SFX.swing;
SFX.swing = function (n) { _ofSwing.call(this, n); if (outfitNow().id === 'mechanic') SFX.clang(); };
const _ofStep = SFX.step;
SFX.step = function () { _ofStep.call(this); if (outfitNow().id === 'zen') SFX.blip(); };
const _ofTick = PAGE.tick;
let ofAir = false;
PAGE.tick = function (dt) {
  if (_ofTick) _ofTick.call(this, dt);
  const P = Player, id = outfitNow().id;
  if (P.dead || Story.active) return;
  const c = P.center(), jumped = ofAir === false && !P.onGround && P.vy < -300;
  ofAir = !P.onGround;
  if (id === 'mage' && (P.dashT > 0 || jumped) && Math.random() < 0.9)
    for (let k = 0; k < (jumped ? 8 : 2); k++) spawnParticle({ x: c.x + rand(-10, 10), y: c.y + rand(-14, 14), vx: rand(-60, 60), vy: rand(-80, 40), life: rand(0.3, 0.6), size: rand(2, 3.5), color: Math.random() < 0.6 ? '#b388ff' : '#f2e04e', type: Math.random() < 0.5 ? 'spark' : 'dot' });
  if (id === 'zen' && P.attackT > 0 && P.attackType !== 'launch' && Math.random() < 0.7) {
    const hb = P.hitbox(); spawnParticle({ x: hb.x + rand(0, hb.w), y: hb.y + rand(0, hb.h), vx: rand(-40, 40), vy: rand(-60, 20), life: rand(0.25, 0.45), size: rand(2.5, 4), color: Math.random() < 0.5 ? '#40e0d0' : '#f2c14e', type: 'dot' });
  }
  if (id === 'shadow' && (Math.abs(P.vx) > 40 || !P.onGround || P.attackT > 0) && Math.random() < 0.6)
    spawnParticle({ x: P.x + rand(0, P.w), y: P.y + rand(10, P.h), vx: -P.facing * rand(20, 60), vy: rand(-60, -10), life: rand(0.3, 0.55), size: rand(3, 6), color: Math.random() < 0.65 ? 'rgba(20,10,24,.8)' : (Math.random() < 0.5 ? '#ff3a1a' : '#f2c14e'), type: 'dot' });
};

/* ---------- the locker ---------- */
const LOCKER_X = 143;   // on the back wall just left of the camp bench
class OutfitLocker {
  constructor(x, y) { Object.assign(this, { kind: 'locker', x, y, t: 0, near: false, gone: false }); }
  update(dt) { this.t += dt; const c = Player.center(); this.near = !Player.dead && Math.abs(c.x - this.x) < 26 && Math.abs(Player.y + Player.h - this.y) < 20; }
  interact() { if (!Story.active) Locker.open(); }
  draw() {
    const x = this.x, y = this.y;
    ctx.save(); ctx.lineJoin = 'round';
    rr(x - 17, y - 78, 34, 78, 3); inked('#5a6a7a', 3);
    ctx.fillStyle = '#4a5866'; ctx.beginPath(); ctx.moveTo(x - 8, y - 40); ctx.lineTo(x + 2, y - 34); ctx.lineTo(x - 4, y - 28); ctx.closePath(); ctx.fill();   // the dent
    ctx.strokeStyle = INK; ctx.lineWidth = 1.5; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x - 10, y - 70 + k * 4); ctx.lineTo(x + 10, y - 70 + k * 4); ctx.stroke(); }
    ctx.fillStyle = GOLD; ctx.fillRect(x + 9, y - 44, 3, 9);
    ctx.font = `9px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = BONE; ctx.fillText('NATHAN', x, y - 56);
    ctx.restore();
    if (this.near && !Story.active) gxPrompt('OUTFITS', x, y - 96);
  }
}
const Locker = {
  sel: 0,
  open() { this.sel = Math.max(0, OUTFITS.indexOf(outfitNow())); this.render(); SFX.paper(); openModal('locker'); },
  render() {
    const D = Save.data, cur = outfitNow().id;
    $('#lockerList').innerHTML = OUTFITS.map((o, i) => { const own = o.have(D);
      return `<button class="item ${i === this.sel ? 'sel' : ''} ${o.id === cur ? 'owned' : ''} ${own ? '' : 'locked'}" data-i="${i}"><b>${own ? o.name : '???'}<span class="tag">${o.id === cur ? 'WEARING' : own ? 'READY' : 'LOCKED'}</span></b><span class="cost"></span><p>${own ? o.desc : 'Unlock: ' + o.from + '.'}</p></button>`; }).join('');
    $$('#lockerList .item').forEach(b => {
      b.addEventListener('mouseenter', () => { this.sel = +b.dataset.i; $$('#lockerList .item').forEach((x, j) => x.classList.toggle('sel', j === this.sel)); });
      b.addEventListener('click', () => this.wear(+b.dataset.i));
    });
    const s = $$('#lockerList .item')[this.sel]; if (s) s.scrollIntoView({ block: 'nearest' });
  },
  wear(i) {
    const o = OUTFITS[i], D = Save.data;
    if (!o.have(D)) { SFX.deny(); $('#lockerLine').textContent = `"Locked tight. ${o.from}, then we'll talk." · Lars`; return; }
    D.q.outfit = o.id; applyOutfit(); saveGame(); SFX.latch ? SFX.latch() : SFX.buy();
    $('#lockerLine').textContent = o.id === 'rookie' ? '"Back to basics. Good lad."' : `"${o.name}. Suits ye. Mostly."`;
    this.render();
  },
  move(d) { this.sel = (this.sel + d + OUTFITS.length) % OUTFITS.length; SFX.ui(); this.render(); },
};
(function buildLocker() {
  const el = document.createElement('div'); el.id = 'locker'; el.className = 'overlay';
  el.innerHTML = `<div class="card shop-card quest-card"><header><div class="josh-face" style="background:#5a6a7a"><svg viewBox="0 0 60 60"><rect x="16" y="6" width="28" height="50" rx="3" fill="#7a8a9a" stroke="#0d0b10" stroke-width="3.5"/><path d="M21 13 H39 M21 17 H39 M21 21 H39" stroke="#0d0b10" stroke-width="2"/><rect x="37" y="30" width="3" height="8" fill="#f2c14e"/></svg></div>
    <div><p class="eyebrow">THE LOCKER · OUTFITS</p><p class="josh-line" id="lockerLine">"Found this in the scrap. Dents are free." · Lars</p></div></header>
    <div id="lockerList"></div><p class="shop-hint"><kbd>↑</kbd><kbd>↓</kbd> choose · <kbd>Enter</kbd> wear · <kbd>Esc</kbd> close</p></div>`;
  document.body.appendChild(el);
  el.addEventListener('click', e => { if (e.target === el) closeModal(); });
})();
addEventListener('keydown', e => {
  if (UI.modal !== 'locker' || e.repeat) return;
  const c = e.code;
  if (c === 'ArrowDown' || c === 'KeyS') Locker.move(1);
  else if (c === 'ArrowUp' || c === 'KeyW') Locker.move(-1);
  else if (c === 'Enter' || c === 'Space' || c === 'KeyJ') Locker.wear(Locker.sel);
  else return;
  e.preventDefault(); e.stopImmediatePropagation();
}, true);
const _ofPoll = Input.pollPad;
Input.pollPad = function () {
  _ofPoll.call(this);
  if (UI.modal !== 'locker') return;
  const B = this.buffered;
  if (B.has('down')) Locker.move(1); if (B.has('up')) Locker.move(-1);
  if (B.has('jump') || B.has('attack')) Locker.wear(Locker.sel);
  for (const a of ['down', 'up', 'jump', 'attack', 'map']) B.delete(a);
};
// the locker lives in Base Camp, against the back wall just left of the courtyard bench
Gaunt.add({ id: 'locker', page: 'z1', enter(r) { if (r.id === 'hub') NPCs.push(new OutfitLocker(GX_T(LOCKER_X, 62).x, 62 * TILE)); } });
if (PAGE.id === 'z1' && Zone.room && Zone.room.id === 'hub') NPCs.push(new OutfitLocker(GX_T(LOCKER_X, 62).x, 62 * TILE));
applyOutfit();
