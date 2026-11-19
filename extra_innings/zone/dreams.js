'use strict';
/* =========================================================
   DREAM REMATCHES · Deniz's Astral Chamomile Tea
   Once King Deniz has moved into Base Camp, a soft cushion
   sits beside his tea lounge. Sip a cup there and Nathan's
   mind drifts to the Arena of Memories: a starry, dreamlike
   Championship Colosseum (act3.html), where four bosses fight
   at full speed with new tricks:
     Pyro-Lord Daniel · Crystal Sovereign Fionn ·
     Archmage Milo · Emperor Deniz
   Each win is an Astral Essence. Bring all four to Deniz for
   the Dreamwalker Badge and the secret trophy Lucid Dreamer.
   Dying in a dream just wakes you up at camp (it never counts
   as a death, not even in Sudden Death).
   Save: Save.data.q.dream = { daniel, fionn, milo, deniz, badge }.
   Uses the Colosseum machinery in zone/gauntlets.js.
   ========================================================= */
const DREAMS = [
  { k: 'daniel', name: 'PYRO-LORD DANIEL · UNLEASHED', short: 'Pyro-Lord Daniel', twist: 'Half the time, the floor is on fire. Watch for the glow, then get airborne.' },
  { k: 'fionn', name: 'CRYSTAL SOVEREIGN FIONN · AWAKENED', short: 'Crystal Sovereign Fionn', twist: 'No more geology lectures. Giant crystals shoot out of the walls.' },
  { k: 'milo', name: 'ARCHMAGE MILO · OVERCHARGED', short: 'Archmage Milo', twist: 'A raging storm. Three whirlwinds roam the arena while he casts.' },
  { k: 'deniz', name: 'EMPEROR DENIZ · THE UNBROKEN CROWN', short: 'Emperor Deniz', twist: 'Faster and tougher than ever, and the whole floor is frozen slick for the entire fight.' },
];
const dreamQ = () => { const q = Save.data.q; return q.dream = q.dream || {}; };
const essences = () => DREAMS.filter(d => dreamQ()[d.k]).length;
const dreamOpen = () => !!Save.data.denizDead;
if (typeof LOADOUT !== 'undefined' && !LOADOUT.some(b => b.id === 'dreamwalker'))
  LOADOUT.push({ id: 'dreamwalker', name: 'Dreamwalker Badge', cost: 2, desc: 'The Static Dash makes you untouchable by everything (spikes and hazards too), with a short grace after it ends.', from: 'Bring Deniz all 4 Astral Essences from the Dream Rematches' });
// the Dreamwalker Badge
let dwGrace = 0;
const dwOn = () => typeof Loadout !== 'undefined' && Loadout.pinned('dreamwalker') && Save.data.up.staticDash;
const _dwHurt = Player.hurt;
Player.hurt = function (dir) { if (dwOn() && (this.dashT > 0 || dwGrace > 0)) return; return _dwHurt.call(this, dir); };
const _dwSpikes = Player.hitSpikes;
Player.hitSpikes = function () { if (dwOn() && (this.dashT > 0 || dwGrace > 0)) return; return _dwSpikes.apply(this, arguments); };
const _dwTick = PAGE.tick;
PAGE.tick = function (dt) {
  if (_dwTick) _dwTick.call(this, dt);
  if (dwOn()) { if (Player.dashT > 0) dwGrace = 0.25; else dwGrace = Math.max(0, dwGrace - dt); }
};

/* =========================================================
   BASE CAMP (Zone 1): the cushion and the menu
   ========================================================= */
const CUSHION_X = 162;
class DreamCushion {
  constructor(x, y) { Object.assign(this, { kind: 'cushion', x, y, t: 0, near: false, gone: false }); }
  update(dt) { this.t += dt; const c = Player.center(); this.near = !Player.dead && Math.abs(c.x - this.x) < 24 && Math.abs(Player.y + Player.h - this.y) < 20; }
  interact() { if (!Story.active) Dream.open(); }
  draw() {
    const x = this.x, y = this.y, t = this.t;
    ctx.save(); ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.ellipse(x, y - 7, 22, 8, 0, 0, 7); inked('#6a3a9a', 2.5);
    ctx.fillStyle = '#f2c14e'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(x + s * 20, y - 8, 2.5, 0, 7); ctx.fill(); }
    // a little cup of violet tea, and its steam
    rr(x + 24, y - 12, 10, 12, 2); inked('#f3ead8', 2); ctx.fillStyle = '#b388ff'; ctx.fillRect(x + 25.5, y - 11, 7, 3);
    ctx.strokeStyle = 'rgba(179,136,255,.7)'; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let s = 0; s < 8; s++) { const yy = y - 16 - s * 4, xx = x + 29 + Math.sin(t * 2 + s * 0.7) * 2.5; s ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke();
    for (let k = 0; k < 3; k++) { const a = t * 0.8 + k * 2.1; ctx.fillStyle = `rgba(217,184,255,${0.4 + 0.3 * Math.sin(t * 3 + k)})`; ctx.fillRect(x + Math.cos(a) * 26, y - 34 + Math.sin(a) * 8, 2, 2); }
    ctx.restore();
    if (this.near && !Story.active) gxPrompt('ASTRAL TEA', x, y - 60);
  }
}
const Dream = {
  sel: 0,
  rows() {
    const q = dreamQ(), L = DREAMS.map(d => ({ kind: 'boss', d, done: !!q[d.k] }));
    if (essences() >= DREAMS.length && !q.badge) L.push({ kind: 'turnin' });
    return L;
  },
  open() {
    if (!dreamOpen()) return;
    this.sel = 0; this.render(); SFX.paper(); openModal('dream');
    $('#dreamLine').textContent = essences() >= DREAMS.length ? (dreamQ().badge ? '"You walk in dreams now, little brother. Peace and love."' : '"All four essences… bring them here, bro."') : '"Astral Chamomile. One sip and your mind goes for a walk. The bosses there… they don\'t hold back."';
  },
  render() {
    const rows = this.rows();
    $('#dreamList').innerHTML = rows.map((r, i) => r.kind === 'turnin'
      ? `<button class="item ${i === this.sel ? 'sel' : ''}" data-i="${i}"><b>Hand over the 4 Astral Essences<span class="tag">DENIZ</span></b><span class="cost">✦✦✦✦</span><p>Deniz brews them into the Dreamwalker Badge.</p></button>`
      : `<button class="item ${i === this.sel ? 'sel' : ''} ${r.done ? 'owned' : ''}" data-i="${i}"><b>${r.d.short}<span class="tag">${r.done ? 'ESSENCE ✦' : 'DREAM'}</span></b><span class="cost">${r.done ? 'REMATCH' : 'DRINK'}</span><p>${r.d.twist}</p></button>`).join('')
      + `<p class="qreward">Astral Essences: ${essences()} / ${DREAMS.length}${dreamQ().badge ? ' · Dreamwalker Badge earned' : ''}</p>`;
    $$('#dreamList .item').forEach(b => {
      b.addEventListener('mouseenter', () => { this.sel = +b.dataset.i; $$('#dreamList .item').forEach((x, j) => x.classList.toggle('sel', j === this.sel)); });
      b.addEventListener('click', () => this.pick(+b.dataset.i));
    });
  },
  move(d) { const n = this.rows().length; this.sel = (this.sel + d + n) % n; SFX.ui(); this.render(); },
  pick(i) {
    const r = this.rows()[i]; if (!r) return;
    const q = dreamQ();
    if (r.kind === 'turnin') {
      q.badge = 1; (Save.data.q.badges = Save.data.q.badges || {}).dreamwalker = 1;
      if (typeof Loadout !== 'undefined') Loadout.gained('dreamwalker');
      if (typeof tGive === 'function') tGive('lucid_dreamer');
      applyUpgrades(); saveGame(); closeModal(); SFX.unlock();
      showCard('ASTRAL ESSENCES ×4', 'DREAMWALKER BADGE', 'Deniz stirs the four essences into a tiny violet badge. Pin it, and your Static Dash makes you untouchable by everything: attacks, spikes and hazards, with a short grace after.', ['badge · 2 notches']);
      return;
    }
    // drift off
    closeModal(); SFX.blorp(); Game.flashWhite = 0.2;
    const qq = Save.data.q; qq.dreamPrev = !!qq.pages['act3.html']; qq.dreamFrom = 'z1';
    toast('YOU SIP THE ASTRAL CHAMOMILE TEA… AND DRIFT OFF');
    setTimeout(() => goToPage('act3.html#dream-' + r.d.k), 700);
  },
};
(function buildDreamMenu() {
  const el = document.createElement('div'); el.id = 'dream'; el.className = 'overlay';
  el.innerHTML = `<div class="card shop-card quest-card"><header><div class="josh-face" style="background:#4a2a7a"><svg viewBox="0 0 60 60"><path d="M16 22 H44 L40 48 H20 Z" fill="#f3ead8" stroke="#0d0b10" stroke-width="3.5" stroke-linejoin="round"/><path d="M18 27 H42" stroke="#b388ff" stroke-width="5"/><path d="M44 28 Q54 30 46 40" fill="none" stroke="#0d0b10" stroke-width="3"/><path d="M26 16 Q22 10 27 5 M34 16 Q30 10 35 5" fill="none" stroke="#d9b8ff" stroke-width="2.5" stroke-linecap="round"/></svg></div>
    <div><p class="eyebrow">DENIZ'S TENT · DREAM REMATCHES</p><p class="josh-line" id="dreamLine"></p></div></header>
    <div id="dreamList"></div><p class="shop-hint"><kbd>↑</kbd><kbd>↓</kbd> choose · <kbd>Enter</kbd> drink · <kbd>Esc</kbd> stay awake</p></div>`;
  document.body.appendChild(el);
  el.addEventListener('click', e => { if (e.target === el) closeModal(); });
})();
addEventListener('keydown', e => {
  if (UI.modal !== 'dream' || e.repeat) return;
  const c = e.code;
  if (c === 'ArrowDown' || c === 'KeyS') Dream.move(1);
  else if (c === 'ArrowUp' || c === 'KeyW') Dream.move(-1);
  else if (c === 'Enter' || c === 'Space' || c === 'KeyJ') Dream.pick(Dream.sel);
  else return;
  e.preventDefault(); e.stopImmediatePropagation();
}, true);
const _drPoll = Input.pollPad;
Input.pollPad = function () {
  _drPoll.call(this);
  if (UI.modal !== 'dream') return;
  const B = this.buffered;
  if (B.has('down')) Dream.move(1); if (B.has('up')) Dream.move(-1);
  if (B.has('jump') || B.has('attack')) Dream.pick(Dream.sel);
  for (const a of ['down', 'up', 'jump', 'attack', 'map']) B.delete(a);
};
const cushionAt = () => ({ x: GX_T(CUSHION_X, 62).x, y: 62 * TILE });
Gaunt.add({ id: 'dreamcamp', page: 'z1', enter(r) { if (r.id === 'hub' && dreamOpen()) { const p = cushionAt(); NPCs.push(new DreamCushion(p.x, p.y)); } } });
if (PAGE.id === 'z1') {
  if (Zone.room && Zone.room.id === 'hub' && dreamOpen()) { const p = cushionAt(); NPCs.push(new DreamCushion(p.x, p.y)); }
  // waking up from a dream: back on the cushion
  if (ARRIVE === 'from-dream') {
    const p = cushionAt();
    Player.reset({ x: p.x - 30, y: p.y }, true); Player.facing = 1; enterRoom(ROOM.hub); snapCamera();
    setTimeout(() => toast(Save.data.q.dreamWoke || 'YOU WAKE UP ON THE CUSHION · THE TEA HAS GONE COLD'), 600);
    Save.data.q.dreamWoke = null;
  }
}

/* =========================================================
   THE ARENA OF MEMORIES (act3.html): the Colosseum, dreaming
   ========================================================= */
const DR = { on: false, k: null, fx: null, t: 0, ice: null };
function dreamWake(msg) {
  const q = Save.data.q;
  DR.on = false; q.dreamWoke = msg;
  if (DR.ice) { Object.assign(TUNE, DR.ice); DR.ice = null; }
  goToPage('zone1.html#from-dream');
}
if (PAGE.id === 'z9' && typeof COLO !== 'undefined' && ARRIVE.startsWith('dream-')) {
  const k = ARRIVE.slice(6), D = DREAMS.find(d => d.k === k), q = Save.data.q;
  // a dream isn't a visit: if you'd never climbed this high, the page stays locked afterwards
  if (!q.dreamPrev) delete q.pages['act3.html'];
  if (D) {
    DR.on = true; DR.k = k;
    const p = GX_T(250, 41);
    Player.reset({ x: p.x, y: p.y }, true); Player.facing = 1; Player.hp = Player.maxHp;
    enterRoom(ROOM.t_colo); snapCamera(); Game.fade = 1; Game.fadeTarget = 0;
    COLO.F = { cup: { key: 'dream', name: 'THE ARENA OF MEMORIES', color: '#b388ff', list: [k] }, i: 0, st: 'next', t: 2.4, boss: null };
    Gaunt.start(COLO); SFX.music('anthem');
    toast(`A DREAM · ${D.short.toUpperCase()} · NO HOLDING BACK`);
    if (k === 'deniz') { DR.ice = { groundAccel: TUNE.groundAccel, groundDecel: TUNE.groundDecel }; TUNE.groundAccel *= 0.45; TUNE.groundDecel *= 0.12; }
  }
}
if (PAGE.id === 'z9' && typeof COLO !== 'undefined') {
  // dream bosses: tougher and faster on top of the Colosseum's own boost
  const _drSpawn = COLO.spawn;
  COLO.spawn = function (k) {
    _drSpawn.call(this, k);
    const F = this.F, b = F && F.boss;
    if (!DR.on || !b) return;
    b.hp *= 1.35; b.maxHp *= 1.35;
    const raw = b.update; b.update = function (dt) { return raw.call(this, dt * (/Wind|Hold|Warn|warn|Aim|aim/.test(this.state || '') ? 1 : 1.22)); };
    BossBar.show(DREAMS.find(d => d.k === k).name);
    DR.fx = { t: 0, phase: 'calm', pt: 4, spears: [], winds: k === 'milo' ? [0, 1, 2].map(i => ({ x: (262 + i * 18) * TILE, dir: i % 2 ? -1 : 1, t: i })) : [] };
  };
  const _drWon = COLO.won;
  COLO.won = function () {
    if (!DR.on) return _drWon.call(this);
    const k = DR.k, q = dreamQ(), first = !q[k];
    this.F = null; Gaunt.stop(); DR.fx = null;
    q[k] = 1; saveGame();
    SFX.confetti(); Story.impact(Player.x + Player.w / 2, Player.y + Player.h, '#b388ff');
    pop(Player.x + Player.w / 2, Player.y - 50, first ? 'ASTRAL ESSENCE!' : 'DREAM CONQUERED!', { size: 46, color: '#d9b8ff', burstColor: '#4a2a7a' });
    setTimeout(() => dreamWake(first ? `ASTRAL ESSENCE ${essences()} / ${DREAMS.length} · YOU WAKE UP SMILING` : 'YOU WAKE UP · STILL THE CHAMP, EVEN IN YOUR DREAMS'), 2200);
  };
  // falling in a dream: you wake up. Never a death, never a shattered save.
  const _drRespawn = respawnAtBench;
  respawnAtBench = function () { if (DR.on) { Game.respawnT = 0; return dreamWake('YOU JOLT AWAKE · JUST A BAD DREAM'); } return _drRespawn.apply(this, arguments); };
  // the twists
  Gaunt.add({
    id: 'dream', page: 'z9',
    update(dt) {
      if (!DR.on || !DR.fx || !COLO.F || COLO.F.st !== 'fight' || Zone.room.id !== 't_colo') return;
      const F = DR.fx, P = Player, r = ROOM.t_colo.px, floor = 41 * TILE;
      F.t += dt;
      if (DR.k === 'daniel') {   // the floor is lava, on and off
        F.pt -= dt;
        if (F.pt <= 0) { F.phase = F.phase === 'calm' ? 'warn' : F.phase === 'warn' ? 'fire' : 'calm'; F.pt = F.phase === 'warn' ? 1.0 : F.phase === 'fire' ? 2.6 : 3.4; if (F.phase === 'warn') SFX.fuse(); if (F.phase === 'fire') SFX.boom(); }
        if (F.phase === 'fire') {
          if (Math.random() < 0.9) spawnParticle({ x: r.x + rand(0, r.w), y: floor - 2, vx: rand(-20, 20), vy: rand(-260, -90), life: rand(0.3, 0.6), size: rand(3, 6), color: Math.random() < 0.5 ? EMBER : FLAME, type: 'dot' });
          if (P.onGround && P.y + P.h >= floor - 2) P.hurt(sgn(P.vx) || 1);
        }
      }
      if (DR.k === 'fionn') {    // crystal spears from the walls
        F.pt -= dt;
        if (F.pt <= 0) { F.pt = 2.0; const left = Math.random() < 0.5, y = floor - rand(18, 110); F.spears.push({ x: left ? r.x + 8 : r.x + r.w - 8, y, dir: left ? 1 : -1, warn: 0.65 }); SFX.crystal(); }
        for (const s of F.spears) {
          if (s.warn > 0) { s.warn -= dt; continue; }
          s.x += s.dir * 1100 * dt;
          if (overlap({ x: s.x - 30, y: s.y - 6, w: 60, h: 12 }, P.hurtbox())) P.hurt(s.dir);
        }
        F.spears = F.spears.filter(s => s.x > r.x - 80 && s.x < r.x + r.w + 80);
      }
      if (DR.k === 'milo') {     // three whirlwinds roam the floor
        for (const w of F.winds) {
          w.t += dt; w.x += w.dir * 190 * dt;
          if (w.x < r.x + 60 || w.x > r.x + r.w - 60) w.dir *= -1;
          const box = { x: w.x - 22, y: floor - 130, w: 44, h: 130 };
          if (overlap(box, P.hurtbox())) { P.vx += sgn(w.x - (P.x + P.w / 2)) * 40; P.hurt(sgn(P.x + P.w / 2 - w.x) || 1); }
        }
      }
    },
    draw_behindTiles() {
      if (!DR.on || Zone.room.id !== 't_colo') return;
      const r = ROOM.t_colo.px, t = Game.time;
      ctx.save();
      // the night sky of a dream, over the stands
      const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h); g.addColorStop(0, 'rgba(14,8,40,.92)'); g.addColorStop(1, 'rgba(60,30,110,.65)');
      ctx.fillStyle = g; ctx.fillRect(r.x, r.y, r.w, r.h);
      for (let i = 0; i < 120; i++) { const x = r.x + (i * 97.3) % r.w, y = r.y + (i * 53.7) % (r.h * 0.8); ctx.fillStyle = `rgba(255,250,230,${0.3 + 0.6 * Math.abs(Math.sin(t * 1.3 + i))})`; ctx.fillRect(x, y, 2, 2); }
      ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 3; k++) { ctx.strokeStyle = `rgba(${['179,136,255', '111,211,255', '100,230,170'][k]},.12)`; ctx.lineWidth = 40; ctx.beginPath(); for (let x = r.x; x <= r.x + r.w; x += 40) { const y = r.y + 80 + k * 50 + Math.sin(x * 0.004 + t * 0.6 + k) * 30; x === r.x ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); }
      ctx.restore();
    },
    draw_top() {
      if (!DR.on || !DR.fx || Zone.room.id !== 't_colo') return;
      const F = DR.fx, r = ROOM.t_colo.px, floor = 41 * TILE, t = Game.time;
      ctx.save();
      if (DR.k === 'daniel' && F.phase !== 'calm') {
        const a = F.phase === 'warn' ? 0.25 + 0.2 * Math.sin(t * 20) : 0.55;
        const g = ctx.createLinearGradient(0, floor - 26, 0, floor); g.addColorStop(0, 'rgba(255,90,40,0)'); g.addColorStop(1, `rgba(255,90,40,${a})`);
        ctx.fillStyle = g; ctx.fillRect(r.x, floor - 26, r.w, 26);
        if (F.phase === 'warn') { ctx.font = `16px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = EMBER; ctx.fillText('THE FLOOR IS HEATING UP · JUMP!', Player.x + Player.w / 2, Player.y - 70); }
      }
      for (const s of F.spears || []) {
        if (s.warn > 0) { ctx.strokeStyle = `rgba(185,139,255,${0.4 + 0.4 * Math.sin(t * 25)})`; ctx.lineWidth = 2; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.moveTo(r.x, s.y); ctx.lineTo(r.x + r.w, s.y); ctx.stroke(); ctx.setLineDash([]); continue; }
        ctx.save(); ctx.translate(s.x, s.y); ctx.scale(s.dir, 1); ctx.shadowColor = '#b98bff'; ctx.shadowBlur = 16;
        ctx.beginPath(); ctx.moveTo(32, 0); ctx.lineTo(4, -8); ctx.lineTo(-30, -4); ctx.lineTo(-30, 4); ctx.lineTo(4, 8); ctx.closePath(); inked('#c9a8ff', 2.5); ctx.restore();
      }
      for (const w of F.winds || []) {
        for (let k = 0; k < 7; k++) { const y = floor - k * 18, rad = 10 + k * 4, a = t * 9 + k; ctx.strokeStyle = `rgba(200,210,255,${0.55 - k * 0.05})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(w.x + Math.sin(a) * 4, y, rad, 5, 0, 0, 7); ctx.stroke(); }
      }
      ctx.restore();
    },
    draw_screen() {
      if (!DR.on) return;
      ctx.save();
      const vg = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.3, VW / 2, VH / 2, VH * 0.9); vg.addColorStop(0, 'rgba(60,20,120,0)'); vg.addColorStop(1, 'rgba(60,20,120,.55)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, VW, VH);
      ctx.font = `italic 13px ${SERIF_FONT}`; ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(217,184,255,.8)'; ctx.fillText('…you are dreaming', VW - 24, VH - 24);
      ctx.restore();
    },
  });
}
