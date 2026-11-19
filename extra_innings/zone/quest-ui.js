'use strict';
/* =========================================================
   SIDE-QUEST UI · the Dugout Clipboard (quest log), Pip &
   Squeak's shop, portraits, the trial clock, and the
   Grounds-Keeper's flashbacks
   ========================================================= */
/* ---------- portraits for the new faces ---------- */
const _qPortrait = Story.portraitSprite;
Story.portraitSprite = function (who, t) {
  switch (who) {
    case 'MONFORT': drawVanceHead(2, -45, t); return true;
    case 'IMMANUEL': drawImmanuelHead(2, -45, t); return true;
    case 'PIP': drawPipHead(2, -45, t); return true;
    case 'SQUEAK': drawSqueakHead(2, -45, t); return true;
    case 'BYTE': drawByteBot(2, -45, t, { face: '^_^' }); return true;
    case 'GROUNDS-KEEPER': drawKeeperHead(2, -45, t); return true;
  }
  return _qPortrait.call(this, who, t);
};

/* ---------- Pip & Squeak's VIP concession stand ---------- */
FACES.scalpers = ['#5a3a24', '<svg viewBox="0 0 60 60"><path d="M14 58 L16 26 L44 26 L46 58 Z" fill="#9a7a4a" stroke="#0d0b10" stroke-width="3.5" stroke-linejoin="round"/><path d="M30 26 L33 44 L30 58 L27 44 Z" fill="#000"/><ellipse cx="30" cy="20" rx="12" ry="10" fill="#000"/><ellipse cx="30" cy="12" rx="18" ry="4" fill="#5a3a24" stroke="#0d0b10" stroke-width="2.5"/><rect x="20" y="2" width="20" height="10" fill="#5a3a24" stroke="#0d0b10" stroke-width="2.5"/><ellipse cx="25" cy="20" rx="2.5" ry="3.5" fill="#ffe8a0"/><ellipse cx="35" cy="20" rx="2.5" ry="3.5" fill="#ffe8a0"/><ellipse cx="28.5" cy="38" rx="1.4" ry="2.4" fill="#f3ead8"/><ellipse cx="31.5" cy="38" rx="1.4" ry="2.4" fill="#f3ead8"/></svg>'];
VENDORS.scalpers = {
  title: 'PIP & SQUEAK · VIP CONCESSIONS', face: 'scalpers',
  hello: () => ['"Step into my office. It\'s the coat."', '"Psst. Stubs? Badges? Questions? No questions."', '"Squeak says hi. Squeak, say hi." "…hi."'][(Math.random() * 3) | 0],
  poor: n => `"${n} more bolts? We don't take bolts, kid."`,
  poorStubs: n => `"${n} more Golden Stub${n > 1 ? 's' : ''}. We don't do IOUs. …Squeak does. Squeak's not in charge."`,
  owned: '"Already sold you that. No refunds. No receipts. No questions."',
  items: BADGES.map(b => ({ id: 'badge_' + b.id, name: b.name, cost: 0, stubs: b.stubs, desc: b.desc, line: b.line,
    owned: D => !!(D.q.badges || {})[b.id], grant: D => { (D.q.badges = D.q.badges || {})[b.id] = 1; } })),
};
/* ---------- Josh can take the capacitors too (Sibling Rivalry) ---------- */
const _qJoshItems = VENDORS.josh.items;
VENDORS.josh.items = () => {
  const q = Save.data.q, list = _qJoshItems.slice();
  if (q.rivalry === 'active' || q.rivalry === 'josh') list.push({
    id: 'caps_josh', name: 'Hand Over the Capacitors', cost: 0, tag: 'QUEST',
    desc: q.rivalry === 'josh' ? 'Done. Josh overclocked your baseballs. Renas is still sulking.' : `Give Josh the Overcharged Capacitors (${q.caps || 0}/5). He overclocks your baseballs. Renas gets nothing.`,
    line: '"FINALLY. Someone with taste."',
    owned: D => D.q.rivalry === 'josh',
    locked: D => (D.q.caps || 0) < 5 ? `"That's ${D.q.caps || 0}. I said FIVE. The vent drones have them."` : '',
    grant: () => {}, after: () => Story.rivalryGive('josh') });
  return list;
};

/* ---------- the Dugout Clipboard ---------- */
const CLIP_SVG = '<svg viewBox="0 0 60 60"><rect x="12" y="8" width="36" height="46" rx="3" fill="#8a5a3a" stroke="#0d0b10" stroke-width="3.5"/><rect x="17" y="15" width="26" height="34" fill="#f3ead8" stroke="#0d0b10" stroke-width="2"/><rect x="23" y="4" width="14" height="8" rx="2" fill="#b8bcc4" stroke="#0d0b10" stroke-width="2.5"/><path d="M21 23 l2 2 l4 -5 M21 32 l2 2 l4 -5" stroke="#e8361c" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M30 23 H39 M30 32 H39 M21 41 H39" stroke="#0d0b10" stroke-width="2" stroke-linecap="round"/></svg>';
(function buildQuestLog() {
  const el = document.createElement('div'); el.id = 'quests'; el.className = 'overlay';
  el.innerHTML = `<div class="card shop-card quest-card"><header><div class="josh-face" style="background:#8a5a3a">${CLIP_SVG}</div>
    <div><p class="eyebrow">THE DUGOUT CLIPBOARD</p><p class="josh-line" id="questLine">Side quests from around the Spire.</p></div></header>
    <div id="questList"></div><p class="shop-hint"><kbd>Esc</kbd> close · open any time from the pause menu</p></div>`;
  document.body.appendChild(el);
  el.addEventListener('click', e => { if (e.target === el) closeModal(); });
  // a "Quest Log" button in the pause menu, right after Map
  const nav = $('#pause nav'), mapBtn = nav && nav.querySelector('[data-p="map"]');
  if (nav && mapBtn) {
    const b = document.createElement('button'); b.className = 'pbtn'; b.dataset.p = 'quests'; b.textContent = 'Quest Log';
    mapBtn.after(b); pauseBtns.splice(pauseBtns.indexOf(mapBtn) + 1, 0, b);
    b.addEventListener('mouseenter', () => { pauseSel = pauseBtns.indexOf(b); markPause(); });
    b.addEventListener('click', () => pauseAction('quests'));
  }
})();
const _qPauseAction = pauseAction;
pauseAction = function (a) { if (a === 'quests') { SFX.ui(); closeModal(); Quests.openLog(); return; } return _qPauseAction(a); };
addEventListener('keydown', e => { if (UI.modal === 'quests' && performance.now() - (Quests.openedAt || 0) > 250 && ['Enter', 'Space', 'KeyJ'].includes(e.code)) { e.preventDefault(); closeModal(); } });

Object.assign(Quests, {
  // every quest the player has discovered, with a checklist
  entries() {
    const D = Save.data, q = D.q, S = QUEST_SPOTS, L = [], tick = (txt, ok) => ({ txt, ok: !!ok });
    if (q.vance) {
      const steps = Object.keys(S.trials).filter(z => D.seenZones[z] || z === 'z1' || (q.trials || {})[z]).map(z => {
        const best = (q.best || {})[z], par = (q.par || {})[z];
        return tick(`${ZONES[z].name}${par ? ` · par ${par}s` : ''}${best !== undefined ? ` · best ${best.toFixed(2)}s` : ''}`, (q.trials || {})[z]);
      });
      const c = q.cleats || 0;
      L.push({ title: 'The Training Montage', who: 'Coach Monfort', done: c >= CLEATS.length, steps, reward: c >= CLEATS.length ? 'All four cleat upgrades earned' : `Every 2 trials beaten: a cleat upgrade (${c}/${CLEATS.length}) · tell Monfort at Base Camp` });
    }
    if (q.immanuel) {
      const goals = this.count('goals');
      L.push({ title: 'Set Piece', who: 'Immanuel', done: q.immanuel === 'done',
        steps: [...S.goals.map(g => tick(`Bury a shot in the training goal, ${g.where} (${goals}/${GOAL_TOTAL})`, (q.goals || {})[g.id])), tick('Tell Immanuel at Base Camp', q.immanuel === 'done')],
        reward: q.immanuel === 'done' ? 'Winger Boots: 8% faster, for good' : 'Swing your bat at the ball sat in each goal' });
    }
    if (q.byte) L.push({ title: 'Hardware Upgrade', who: 'Byte', done: q.byte === 'fixed',
      steps: [tick(`Scrap Motherboards from gold-glowing elite enemies (${Math.min(3, this.count('boards'))}/3)`, this.count('boards') >= 3), tick('Bring them to Byte in the Turbine Hall', q.byte === 'fixed')], reward: 'Byte follows you, hoovers up bolts and zaps flyers' });
    if (q.scalpers) L.push({ title: 'VIP Access', who: 'Pip & Squeak', done: BADGES.every(b => (q.badges || {})[b.id]),
      steps: [tick(`Golden Stubs found (${stubsFound()}/${STUB_TOTAL})`, stubsFound() >= STUB_TOTAL), ...BADGES.map(b => tick(`${b.name} (${b.stubs} stub${b.stubs > 1 ? 's' : ''})`, (q.badges || {})[b.id]))], reward: 'Trade stubs for badges in the Grand Concourse' });
    if (q.cats) L.push({ title: 'The Great Cat Round-Up', who: 'Lars', done: q.cats === 'done',
      steps: S.cats.map(c => tick(`${c.id}, ${c.where}`, (q.catsFound || {})[c.id] || q.cats === 'done')), reward: 'The Heavy Swing charm' });
    if (q.rivalry) L.push({ title: 'Sibling Rivalry', who: 'Josh & Renas', done: q.rivalry === 'josh' || q.rivalry === 'renas',
      steps: [tick(`Overcharged Capacitors from the Ventilation Shaft drones (${q.rivalry === 'active' ? q.caps || 0 : 5}/5)`, q.rivalry !== 'active' || (q.caps || 0) >= 5), tick(q.rivalry === 'josh' ? 'Gave them to Josh' : q.rivalry === 'renas' ? 'Gave them to Renas' : 'Give them to Josh (workbench) or Renas (by the bell)', q.rivalry !== 'active')],
      reward: q.rivalry === 'josh' ? 'Overclocked Baseballs' : q.rivalry === 'renas' ? 'Nitro drop-offs' : 'Josh: bigger baseball blasts · Renas: nitro drop-offs' });
    if (q.milo) L.push({ title: 'Damage Control', who: 'Milo', done: q.milo === 'done',
      steps: [...S.books.map(b => tick(`Cursed spellbook in ${b.where}`, (q.books || {})[b.id])), tick('Tell Milo', q.milo === 'done')], reward: 'Storm Uppercut' });
    if (q.deniz) L.push({ title: 'Ultimate Chill', who: 'Deniz', done: q.deniz === 'done',
      steps: [...S.herbs.map(h => tick(`${h.name}, ${h.where}`, (q.herbs || {})[h.id])), tick('Bring them to Deniz', q.deniz === 'done')], reward: 'A Blue Shield Heart every time you rest at Base Camp' });
    if (q.keeper) L.push({ title: 'The Grounds-Keeper', who: '…', done: q.keeper >= 3, steps: [0, 1, 2].map(i => tick(`Memory ${i + 1}`, q.keeper > i)), reward: 'He remembers something you don\'t' });
    return L;
  },
  openLog() {
    const L = this.entries();
    $('#questLine').textContent = L.length ? `${L.filter(e => e.done).length} of ${L.length} side quests complete.` : 'Nothing pinned yet. Talk to people around Base Camp.';
    $('#questList').innerHTML = L.length ? L.map(e => `<div class="item quest ${e.done ? 'owned' : ''}">
      <b>${e.title}<span class="tag">${e.who}</span></b><span class="cost">${e.done ? 'DONE' : 'ACTIVE'}</span>
      <p>${e.steps.map(s => `<span class="qstep ${s.ok ? 'ok' : ''}">${s.ok ? '✓' : '○'} ${s.txt}</span>`).join('')}<span class="qreward">★ ${e.reward}</span></p></div>`).join('')
      : '<p class="lede">The clipboard is empty. Coach Monfort, by the bench, looks like he has opinions.</p>';
    SFX.paper(); openModal('quests'); this.openedAt = performance.now();
  },

  /* ---------- screen overlays ---------- */
  drawScreen() {
    if (this.trial && !Story.active) {
      const T2 = this.trial, over = T2.t > T2.par, w = 250, x = VW / 2 - w / 2, y = 70;
      ctx.save(); ctx.fillStyle = 'rgba(8,5,12,.72)'; rr(x, y, w, 46, 6); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = over ? FLAME : '#9be36a'; ctx.stroke();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `11px ${DISPLAY_FONT}`; ctx.fillStyle = GOLD; ctx.fillText('COACH MONFORT\'S TIME TRIAL · PAR ' + T2.par + 's', VW / 2, y + 12);
      ctx.font = `22px ${DISPLAY_FONT}`; ctx.fillStyle = over ? FLAME : BONE; ctx.fillText(T2.t.toFixed(2) + 's', VW / 2, y + 32);
      ctx.restore();
    }
    if (this.boostT > 0 && !Story.active) {
      ctx.save(); ctx.fillStyle = 'rgba(8,5,12,.6)'; ctx.fillRect(VW / 2 - 60, VH - 40, 120, 10); ctx.fillStyle = '#ff8a2a'; ctx.fillRect(VW / 2 - 58, VH - 38, 116 * this.boostT / 6, 6); ctx.restore();
    }
    if (this.flash) drawKeeperFlash(this.flash);
  },
});

/* ---------- the Grounds-Keeper's memories of the Zennith Incident ---------- */
function drawKeeperFlash(f) {
  const t = f.t, a = Math.min(1, t / 0.6, (6.2 - t) / 0.6);
  if (a <= 0) return;
  const hash = n => { const s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s); };
  ctx.save(); ctx.globalAlpha = a; ctx.translate(rand(-1, 1), rand(-0.8, 0.8));
  const bg = ctx.createLinearGradient(0, 0, 0, VH); bg.addColorStop(0, '#120a10'); bg.addColorStop(1, '#3a2418');
  ctx.fillStyle = bg; ctx.fillRect(-4, -4, VW + 8, VH + 8);
  const cx = VW / 2, cy = VH * 0.46;
  // rain on every memory
  ctx.strokeStyle = 'rgba(200,190,220,.25)'; ctx.lineWidth = 1.5;
  for (let k = 0; k < 70; k++) { const x = (hash(k) * VW + t * 60) % VW, y = (hash(k + 99) * VH + t * 700) % VH; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 18); ctx.stroke(); }
  if (f.n === 0) {   // the scoreboard
    rr(cx - 230, cy - 120, 460, 220, 6); inked('#141c16', 6);
    const cell = (lbl, val, x, y, col) => { ctx.font = `14px ${DISPLAY_FONT}`; ctx.fillStyle = 'rgba(243,226,190,.6)'; ctx.fillText(lbl, x, y - 26); ctx.font = `44px ${DISPLAY_FONT}`; ctx.fillStyle = col; ctx.fillText(val, x, y + 8); };
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    cell('HOME', '3', cx - 140, cy - 40, '#ffd27a'); cell('AWAY', '4', cx - 40, cy - 40, '#ffd27a'); cell('INN', '9▼', cx + 70, cy - 40, '#ff8a6a'); cell('OUTS', '●●○', cx + 170, cy - 40, '#ff8a6a');
    ctx.font = `14px ${DISPLAY_FONT}`; ctx.fillStyle = 'rgba(243,226,190,.6)'; ctx.fillText('BALLS  ●●○', cx - 90, cy + 50); ctx.fillText('STRIKES  ●●', cx + 90, cy + 50);
    for (let k = 0; k < 18; k++) { ctx.fillStyle = `rgba(255,230,160,${0.4 + 0.5 * hash(k + Math.floor(t * 3))})`; ctx.beginPath(); ctx.arc(cx - 215 + k * 25.3, cy - 108, 4, 0, 7); ctx.fill(); }
  } else if (f.n === 1) {   // the swing
    ctx.fillStyle = '#2a2014'; ctx.beginPath(); ctx.ellipse(cx, VH * 0.98, VW * 0.6, VH * 0.2, 0, 0, 7); ctx.fill();
    ctx.filter = 'sepia(1) brightness(0.6) contrast(1.3)';
    ctx.save(); ctx.translate(cx - 60, VH * 0.86); ctx.scale(3, 3);
    const P = Object.assign({}, Player, { x: -Player.w / 2, y: -Player.h, facing: 1, lie: 0, invuln: 0, healT: 0, dashT: 0, vx: 0, vy: 0, onGround: true, sx: 1, sy: 1, dead: false, shield: 0, noBat: false,
      attackT: t > 2.2 && t < 2.6 ? 0.1 : 0, attackDur: 0.2, attackType: 'fwd', comboIdx: 3, batLook: 'wood' });
    drawNathan(P);
    ctx.restore(); ctx.filter = 'none';
    if (t > 1.6 && t < 2.8) { const k = (t - 1.6) / 1.2, x = lerp(VW + 20, cx - 160, k); ctx.fillStyle = 'rgba(243,230,200,.9)'; ctx.beginPath(); ctx.arc(x, VH * 0.7, 6, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(243,230,200,.25)'; ctx.fillRect(x, VH * 0.7 - 2, 80, 4); }
    if (t > 2.8) { ctx.font = `64px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = `rgba(255,138,106,${Math.min(1, (t - 2.8) * 2)})`; ctx.fillText('STRIKE THREE', cx, VH * 0.3); }
  } else {   // the trophy
    const crack = Math.max(0, Math.min(1, (t - 2.4) / 1.2));
    ctx.save(); ctx.translate(cx, cy + 40); ctx.lineJoin = 'round';
    rr(-60, 60, 120, 40, 4); inked('#3a2a1a', 4);
    ctx.beginPath(); ctx.moveTo(-50, -80); ctx.lineTo(50, -80); ctx.quadraticCurveTo(46, 0, 10, 14); ctx.lineTo(16, 60); ctx.lineTo(-16, 60); ctx.lineTo(-10, 14); ctx.quadraticCurveTo(-46, 0, -50, -80); ctx.closePath(); inked('#b8923a', 4);
    ctx.lineWidth = 6; ctx.strokeStyle = '#b8923a'; ctx.beginPath(); ctx.arc(-58, -50, 22, -1.6, 1.6, true); ctx.moveTo(58, -72); ctx.arc(58, -50, 22, -1.6, 1.6); ctx.stroke();
    if (crack > 0) {
      ctx.strokeStyle = '#d9b8ff'; ctx.lineWidth = 3; ctx.shadowColor = '#b98bff'; ctx.shadowBlur = 20;
      ctx.beginPath(); ctx.moveTo(0, -80); ctx.lineTo(-8, -50 * crack - 30); ctx.lineTo(6, -20 * crack); ctx.lineTo(-4, 40 * crack); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-8, -50); ctx.lineTo(-30 * crack, -40); ctx.moveTo(6, -20); ctx.lineTo(30 * crack, -10); ctx.stroke();
    }
    ctx.restore();
    // the bat coming down
    if (t > 1.4) { const k = Math.min(1, (t - 1.4) / 1), ang = lerp(-2.2, -0.2, 1 - Math.pow(1 - k, 3)); ctx.save(); ctx.translate(cx + 200, cy - 140); ctx.rotate(ang); ctx.fillStyle = '#c9a36b'; ctx.strokeStyle = INK; ctx.lineWidth = 4; rr(-10, 0, 20, 220, 10); ctx.fill(); ctx.stroke(); ctx.restore(); }
    if (t > 2.4 && t < 2.7) { ctx.fillStyle = `rgba(217,184,255,${(2.7 - t) * 3})`; ctx.fillRect(0, 0, VW, VH); }
  }
  // film: sepia wash, scratches, vignette, caption
  ctx.fillStyle = 'rgba(120,78,36,.22)'; ctx.fillRect(-4, -4, VW + 8, VH + 8);
  ctx.strokeStyle = 'rgba(240,225,190,.22)'; ctx.lineWidth = 1;
  for (let k = 0; k < 3; k++) { const sx = hash(Math.floor(t * 9) + k * 13) * VW; ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx + 3, VH); ctx.stroke(); }
  const vg = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.2, VW / 2, VH / 2, VH * 0.85); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(10,5,2,.92)');
  ctx.fillStyle = vg; ctx.fillRect(-4, -4, VW + 8, VH + 8);
  const cap = ['Bottom of the ninth. Two outs. Two strikes. Rain.', 'One swing to win it all. He swung for the fences.', 'He didn\'t lose the game. He broke it.'][f.n], n = Math.floor(Math.max(0, (t - 0.5) * 28));
  ctx.font = `italic 20px ${SERIF_FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = 'rgba(243,226,190,.9)';
  ctx.fillText(cap.slice(0, n), 60, VH * 0.86);
  ctx.font = `12px ${DISPLAY_FONT}`; ctx.fillStyle = 'rgba(242,193,78,.75)'; ctx.fillText(`THE ZENNITH INCIDENT · MEMORY ${f.n + 1} OF 3`, 60, VH * 0.86 - 28);
  ctx.restore();
}
