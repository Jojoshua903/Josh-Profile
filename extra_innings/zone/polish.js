'use strict';
/* =========================================================
   RELEASE POLISH · signposting and save safety
   Loaded last on every story page.
   ========================================================= */

/* ---------- cracked walls glow once you own Explosive Baseballs ---------- */
const Signs = { crackHint: false };
(function () {
  const H = Game.hooks, o = H.front;
  H.front = function (cam) {
    if (o) o.call(H, cam);
    if (!Save.data.up.boom || typeof Breakables === 'undefined') return;
    const c = Player.center(), t = Game.time;
    for (const b of Breakables) {
      if (b.broken) continue;
      const bx = b.x + b.w / 2, by = b.y + b.h / 2, d = Math.hypot(c.x - bx, c.y - by);
      if (d > 420) continue;
      const a = (1 - d / 420) * (0.55 + Math.sin(t * 5) * 0.25);
      ctx.save(); ctx.globalAlpha = a;
      const g = ctx.createRadialGradient(bx, by, 0, bx, by, Math.max(b.w, b.h));
      g.addColorStop(0, 'rgba(255,138,42,.45)'); g.addColorStop(1, 'rgba(255,138,42,0)');
      ctx.fillStyle = g; ctx.fillRect(b.x - b.w / 2, b.y - b.h / 2, b.w * 2, b.h * 2);
      ctx.font = `16px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = EMBER;
      ctx.fillText('BOOM?', bx, b.y - 10 + Math.sin(t * 4) * 3);
      ctx.restore();
      if (Math.random() < 0.05 * a) spawnParticle({ x: b.x + rand(0, b.w), y: b.y + rand(0, b.h), vy: -40, life: 0.5, size: 2.5, color: EMBER, type: 'dot' });
      if (!Signs.crackHint && d < 220 && !Story.active) {
        Signs.crackHint = true;
        toast(`A CRACKED WALL · SWAP TO EXPLOSIVE BASEBALLS (${Bindings.label('swap')}), TOSS ONE, THEN SMACK IT`);
      }
    }
  };
})();

/* ---------- all four Golden Pennants: keep the goal on screen until the gate opens ---------- */
(function () {
  const H = Game.hooks, o = H.screen;
  H.screen = function (cam) {
    if (o) o.call(H, cam);
    const D = Save.data;
    if (PAGE.id !== 'z5' || Story.active || D.gateOpen || typeof pennantCount !== 'function' || pennantCount() < PENNANTS.length) return;
    const s = '★ ALL FOUR GOLDEN PENNANTS · TAKE THEM TO THE PENNANT GATE IN THE GRAND CONCOURSE';
    ctx.save(); ctx.font = `12px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(s).width + 26;
    ctx.globalAlpha = 0.85; ctx.fillStyle = 'rgba(8,5,12,.7)'; rr(VW / 2 - w / 2, 12, w, 24, 6); ctx.fill();
    ctx.strokeStyle = GOLD; ctx.lineWidth = 2; ctx.stroke();
    ctx.globalAlpha = 1; ctx.fillStyle = GOLD; ctx.fillText(s, VW / 2, 25);
    ctx.restore();
  };
})();

/* ---------- never lose progress when the tab closes ---------- */
addEventListener('pagehide', () => { if (started) saveGame(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && started) saveGame(); });

/* =========================================================
   SETTINGS · Master / Music / SFX & Voice sliders, Screen Shake
   ========================================================= */
const Shake = { k: 1 };
try { const v = localStorage.getItem('ei_shake'); if (v !== null) Shake.k = +v; } catch (e) { logErr("zone/polish.js:61", e); }
const _plShake = addShake, _plKick = addKick;
addShake = a => { if (Shake.k > 0) _plShake(a * Shake.k); };
addKick = (dx, dy, a) => { if (Shake.k > 0) _plKick(dx, dy, a * Shake.k); };
(function buildSettings() {
  const vr = $('#vol'), card = vr && vr.closest('.card'); if (!card) return;
  const lab = vr.closest('.row').querySelector('label'); if (lab) lab.textContent = 'Master';
  const sfx = document.createElement('div'); sfx.className = 'row';
  sfx.innerHTML = `<label>SFX &amp; Voice</label><input type="range" id="sfxVol" min="0" max="100" value="${Math.round(SFX.sfxVolume * 100)}">`;
  sfx.querySelector('input').addEventListener('input', e => { SFX.sfxVolume = e.target.value / 100; SFX.blip(); });
  const sh = document.createElement('div'); sh.className = 'row';
  sh.innerHTML = `<label>Screen Shake</label><span class="seg" id="shakeSeg">${[[1, '100%'], [0.5, '50%'], [0, 'Off']].map(([v, t]) => `<button data-k="${v}">${t}</button>`).join('')}</span>`;
  const mark = () => sh.querySelectorAll('button').forEach(b => b.classList.toggle('on', +b.dataset.k === Shake.k));
  sh.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    Shake.k = +b.dataset.k; try { localStorage.setItem('ei_shake', Shake.k); } catch (e) { logErr("zone/polish.js:75", e); }
    mark(); SFX.ui(); if (Shake.k) { Game.shake = 0; _plShake(8 * Shake.k); }
  }));
  mark();
  card.appendChild(sfx); card.appendChild(sh);
  const st = document.createElement('style');
  st.textContent = `.seg{display:inline-flex;gap:4px}.seg button{font:inherit;font-size:12px;padding:3px 9px;border:2px solid #0d0b10;border-radius:5px;background:#e9d9b4;color:#0d0b10;cursor:pointer}
.seg button.on{background:#f2c14e;box-shadow:inset 0 -2px 0 rgba(0,0,0,.25)}`;
  document.head.appendChild(st);
})();

/* =========================================================
   CUTSCENES · anything you've already watched can be skipped
   (hold attack) · holding jump/attack fast-forwards any line
   ========================================================= */
const Seen = { set: new Set() };
try { Seen.set = new Set(JSON.parse(localStorage.getItem('ei_seen') || '[]')); } catch (e) { logErr("zone/polish.js:91", e); }
const sceneKey = fn => { const s = String(fn); let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36) + s.length; };
const _plRun = Story.run;
Story.run = function (fn, skippable) {
  const key = sceneKey(fn), seen = Seen.set.has(key);
  return _plRun.call(this, async () => {
    await fn();
    if (!Seen.set.has(key)) { Seen.set.add(key); try { localStorage.setItem('ei_seen', JSON.stringify([...Seen.set])); } catch (e) { logErr("zone/polish.js:98", e); } }
  }, skippable || seen);
};

/* =========================================================
   BOSS RUNBACKS · die to a boss and a "Retry" pad appears
   beside the bench: it drops you straight back at the arena door
   ========================================================= */
const Retry = { entry: null, room: null, pos: null, pending: false };
const _plEnter = enterRoom;
enterRoom = function (r) {
  _plEnter(r);
  if (Retry.pending) { if (r.id === Retry.benchRoom) spawnRetry(); else Retry.pending = false; }
  Retry.entry = { room: r.id, x: Player.x, y: Player.y };
};
const _plDie = Player.die;
Player.die = function () {
  const B = Zone.boss, E = Retry.entry;
  if (B && !B.dead && B.hp > 0 && E && Zone.room && E.room === Zone.room.id && !Gaunt.run) { Retry.room = E.room; Retry.pos = { x: E.x, y: E.y }; }
  else Retry.room = null;
  return _plDie.apply(this, arguments);
};
const _plResp = PAGE.onRespawn;
PAGE.onRespawn = () => {
  if (_plResp) _plResp();
  const i = Save.data[PAGE.benchKey] || 0, B = PAGE.benches[i] || PAGE.benches[0];
  Retry.pending = !!Retry.room; Retry.benchRoom = B.room; Retry.bench = B.pos;
};
function spawnRetry() {
  const b = Retry.bench, row = Math.round(b.y / TILE);
  let x = null;
  for (const dx of [2.5, -2.5, 4, -4]) { const px = b.x + dx * TILE; if (pointSolid(px, row * TILE + 4) && !pointSolid(px, row * TILE - 20)) { x = px; break; } }
  if (x === null) return;
  const room = Retry.room, pos = Retry.pos;
  NPCs.push(new GPost(x, row * TILE, { look: 'pad', label: 'RETRY THE BOSS', go: () => {
    Retry.pending = false; const R = ROOM[room].px;
    gxWarp(pos, room, pos.x < R.x + R.w / 2 ? 1 : -1);
  } }));
}

/* =========================================================
   MAP PINS · click the map (or press Swap while it's open) to drop
   a pin; click / Swap on a pin again to change it, then remove it
   ========================================================= */
const PIN_KINDS = [
  { g: '✕', c: '#e8361c', t: 'break this later' },
  { g: '⚡', c: '#b98bff', t: 'laser / locked door' },
  { g: '?', c: '#2c6e6a', t: 'secret up there' },
  { g: '★', c: '#c08a1e', t: 'come back here' },
];
const myPins = () => { const q = Save.data.q; return (q.pins = q.pins || []); };
function pinAt(tx, ty) {
  const L = myPins(), here = L.findIndex(p => p.page === PAGE.id && Math.hypot(p.x - tx, p.y - ty) < 2.2);
  if (here >= 0) { const p = L[here]; if (p.k + 1 >= PIN_KINDS.length) { L.splice(here, 1); SFX.paper(); } else { p.k++; SFX.ui(); } }
  else { L.push({ page: PAGE.id, x: Math.round(tx * 2) / 2, y: Math.round(ty * 2) / 2, k: 0 }); SFX.blip(); }
  saveGame();
}
const _plMapFrame = mapFrame;
mapFrame = function (now) {
  _plMapFrame(now);
  const M = MapView; if (UI.modal !== 'map' || !M.cv || (now - M.t0) / 1000 < 0.55) return;
  const g = M.cv.getContext('2d'); g.setTransform(M.dpr, 0, 0, M.dpr, 0, 0);
  const inSheet = p => M.rooms.some(r => p.x >= r.x0 && p.x <= r.x0 + r.tw && p.y >= r.y0 && p.y <= r.y0 + r.th);
  for (const p of myPins()) {
    if (p.page !== PAGE.id || !inSheet(p)) continue;
    const K = PIN_KINDS[p.k] || PIN_KINDS[0], x = M.ox + p.x * M.s, y = M.oy + p.y * M.s;
    g.save();
    g.beginPath(); g.moveTo(x, y); g.lineTo(x - 7, y - 13); g.arc(x, y - 17, 8, Math.PI * 0.8, Math.PI * 2.2); g.closePath();
    g.fillStyle = K.c; g.fill(); g.lineWidth = 2; g.strokeStyle = INKM; g.stroke();
    g.fillStyle = '#fff8ea'; g.font = 'bold 10px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(K.g, x, y - 17);
    g.restore();
  }
};
(function hookMap() {
  const cv = $('#mapCanvas'); if (!cv) return;
  cv.addEventListener('click', e => {
    if (UI.modal !== 'map') return;
    const M = MapView, r = cv.getBoundingClientRect();
    const tx = (e.clientX - r.left - M.ox) / M.s, ty = (e.clientY - r.top - M.oy) / M.s;
    if (!M.rooms.some(rm => tx >= rm.x0 && tx <= rm.x0 + rm.tw && ty >= rm.y0 && ty <= rm.y0 + rm.th)) return;
    pinAt(tx, ty);
  });
  const leg = $('.map-legend');
  if (leg) { const s = document.createElement('span'); s.className = 'pin-hint'; s.innerHTML = `<b style="color:#e8361c">✕ ⚡ ? ★</b> click the map or press <kbd data-act="swap">${Bindings.label('swap')}</kbd> to pin`; leg.insertBefore(s, leg.querySelector('.close-hint')); }
})();
const dropPinHere = () => { if (!Zone.room) return; const c = Player.center(); pinAt(c.x / TILE, (Player.y + Player.h) / TILE - 0.5); };
addEventListener('keydown', e => { if (UI.modal === 'map' && !e.repeat && KEYMAP[e.code] === 'swap') { e.preventDefault(); dropPinHere(); } });
const _plPoll = Input.pollPad;
Input.pollPad = function () { _plPoll.call(this); if (UI.modal === 'map' && this.buffered.has('swap')) { this.buffered.delete('swap'); dropPinHere(); } };

/* =========================================================
   READABILITY · dim the busiest backdrops (Foundry, Storm Atrium)
   ========================================================= */
(function () {
  const H = Game.hooks, o = H.background;
  H.background = function (cx, cy) {
    if (o) o.call(H, cx, cy); else drawBackground(cx, cy);
    const z = PAGE.zoneHere();
    if (z === 'z4' || z === 'z7') { ctx.fillStyle = z === 'z4' ? 'rgba(14,6,4,.32)' : 'rgba(8,6,20,.3)'; ctx.fillRect(0, 0, VW, VH); }
  };
})();

/* =========================================================
   SIGNPOSTS · a "Next Up" goal on the Clipboard, and clues to
   the True Ending (the Clipboard, the Grounds-Keeper, Reshman)
   ========================================================= */
function nextGoal() {
  const D = Save.data, P = D.pennants || {}, got = k => !!P[k];
  if (!D.adamDead) return ['Beat Adam, your rival, in the Deep Quarry', 'Zone 2'];
  if (!D.chase) return ['Chase Renas through the wind tunnel in the Ventilation Shafts', 'Zone 3'];
  if (!D.danielDead) return ['Track down Daniel in the Pyrotechnic Foundry', 'Zone 4'];
  if (!D.up.boom) return ['Ring a Scooter Call Bell, ride back to Base Camp and visit Daniel\'s fireworks stand', 'Base Camp'];
  if (!D.walls.f_core) return ['Blow open the cracked wall behind Big Bertha (the Foundry Core) with an Explosive Baseball: a golden lift is behind it', 'Zone 4'];
  if (!D.concourse) return ['Ride the golden lift in the Foundry Core up to the Grand Concourse', 'Zone 4'];
  if (!(got('fionn') && got('milo') && got('deniz') && got('maya'))) return [`Win the four Golden Pennants: Geode Caverns ${got('fionn') ? '✓' : '·'} · Storm Atrium ${got('milo') ? '✓' : '·'} · Glacier Crown ${got('deniz') ? '✓' : '·'} · Sunken Bullpen ${got('maya') ? '✓' : '·'} (blow open the cracked floor of the Quarry Mouth)`, 'Act II'];
  if (!D.gateOpen) return ['Take all four pennants to the Pennant Gate in the Grand Concourse', 'Zone 5'];
  if (!D.adamAssist) return ['Climb the Gilded Stadium. Somebody is moping in the Grand Locker Room', 'Zone 9'];
  if (!D.evilAdamDead) return ['Face Evil Adam on the Grand Championship Court', 'Zone 9'];
  if (!D.zennithDead) return trueEndingReady() ? ['Something stirs beneath the Championship Court…', 'Zone 9'] : ['The story isn\'t over. Check "The Whole Story" below', 'Everywhere'];
  return null;
}
const _plEntries = Quests.entries;
Quests.entries = function () {
  const L = _plEntries.call(this), D = Save.data, q = D.q, G = nextGoal();
  if (G && (D.lars || D.adamDead)) L.unshift({ title: 'Next Up', who: G[1], done: false, reward: 'The main story', steps: [{ txt: G[0], ok: false }] });
  if ((q.keeper || 0) >= 1 || D.evilAdamDead || D.trueEnding) {
    const C = trueEndingChecks();
    L.push({ title: 'The Whole Story', who: '???', done: !!D.trueEnding, reward: D.trueEnding ? 'You saw how it really ends.' : 'A true champion finishes what he started.',
      steps: C.map(([t, ok]) => ({ txt: t, ok })) });
  }
  return L;
};
// the Grounds-Keeper, once he's shown you all three memories
if (Story.keeperTalk) {
  const _plKeeper = Story.keeperTalk;
  Story.keeperTalk = function (n) {
    if ((Save.data.q.keeper || 0) < 3 || Save.data.trueEnding) return _plKeeper.call(this, n);
    return this.run(async () => {
      const h = () => n.head(), nh = () => this.nathanHead();
      Player.facing = sgn(n.x - Player.x) || 1; this.camTarget = { x: (Player.x + n.x) / 2, y: n.y - 90 }; this.zoomTo(1.15); n.stop = true;
      await this.say('GROUNDS-KEEPER', '…', h, { voice: 0.4 });
      await this.say('NATHAN', '(He turns his broom over. Three words are scratched into the handle.)', nh, { color: '#e6d6ff' });
      await this.say('NATHAN', '(EVERY FRIEND. FIFTY STONES. THE FIRST BAT.)', nh, { color: '#e6d6ff' });
      await this.say('NATHAN', '(…The first bat. Didn\'t I drop something back at the Crash Site?)', nh, { color: '#e6d6ff' });
      toast('CLUE ADDED TO THE CLIPBOARD · "THE WHOLE STORY"');
    }).then(() => { n.stop = false; n.lift = 0; });
  };
}
// Reshman mumbles hints while you shop
if (typeof VENDORS !== 'undefined' && VENDORS.reshman) {
  const V = VENDORS.reshman, h0 = V.hello;
  V.hello = D => {
    const hints = [];
    if (!D.spareBat && D.danielDead) hints.push('"The floorboards at the Crash Site creak. Something wooden is down there. …blorp."');
    if (D.fionnDead && pebblesFound() < PEBBLE_TOTAL) hints.push(`"Fionn's pebbles. ${PEBBLE_TOTAL - pebblesFound()} still out there. I count everything. I hide everywhere. Same spots, sometimes."`);
    if (D.evilAdamDead && !trueEndingReady()) hints.push('"The Court is quiet. Too quiet. Somebody hasn\'t finished collecting. …It\'s you."');
    return hints.length && Math.random() < 0.5 ? hints[(Math.random() * hints.length) | 0] : h0(D);
  };
}

/* =========================================================
   GLOW & SHOCKWAVE · Canvas-2D stand-ins for bloom and a
   chromatic-aberration pass. "Flashy FX" in Settings turns
   both off; Screen Shake: Off also kills the shockwave.
   ========================================================= */
const GFX = { on: true, t: 0, dur: 0.32, x: 0, y: 0, lastShatter: 0 };
try { const v = localStorage.getItem('ei_fx'); if (v !== null) GFX.on = v === '1'; } catch (e) { logErr("zone/polish.js:264", e); }
// additive halo over sparks, rings and embers (skips debris and smoke)
const _plDrawParticles = drawParticles;
drawParticles = function () {
  _plDrawParticles();
  if (!GFX.on) return;
  ctx.globalCompositeOperation = 'lighter';
  let n = 0;
  const V = viewRect(60);
  for (const p of Game.particles) {
    if (p.type === 'debris' || p.type === 'puff') continue;
    if (p.x < V.x0 || p.x > V.x1 || p.y < V.y0 || p.y > V.y1) continue;   // off-screen halos cost a gradient each
    if (++n > 220) break;
    const k = Math.max(0, Math.min(1, p.life / p.max));
    ctx.globalAlpha = 0.16 * k;
    if (p.type === 'ring') {
      ctx.strokeStyle = p.color; ctx.lineWidth = (p.size * k + 1) * 3;
      ctx.beginPath(); ctx.arc(p.x, p.y, lerp(p.r1, p.r0, k), 0, 7); ctx.stroke();
    } else {
      ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 2.6 + 4, 0, 7); ctx.fill();
    }
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
};
function shockwave(wx, wy) {
  if (!GFX.on || Shake.k === 0) return;
  GFX.t = GFX.dur; GFX.at = performance.now(); GFX.x = wx; GFX.y = wy;
}
const fxBuf = document.createElement('canvas'), fxTint = document.createElement('canvas');
const fxB = fxBuf.getContext('2d'), fxT = fxTint.getContext('2d');
function tinted(color) {
  fxT.globalCompositeOperation = 'copy'; fxT.drawImage(fxBuf, 0, 0);
  fxT.globalCompositeOperation = 'multiply'; fxT.fillStyle = color; fxT.fillRect(0, 0, fxTint.width, fxTint.height);
  return fxTint;
}
const _plRender = render;
render = function () {
  _plRender();
  if (typeof Act3 !== 'undefined' && Act3.shatter > GFX.lastShatter + 0.5) shockwave(Player.x + Player.w / 2, Player.y);
  if (typeof Act3 !== 'undefined') GFX.lastShatter = Act3.shatter;
  if (GFX.t <= 0) return;
  GFX.t = Math.max(0, GFX.dur - (performance.now() - GFX.at) / 1000);   // wall-clock, so it lasts the same at 60 or 144 Hz
  const k = GFX.t / GFX.dur, W = cv.width, Hh = cv.height;
  if (fxBuf.width !== W || fxBuf.height !== Hh) { fxBuf.width = fxTint.width = W; fxBuf.height = fxTint.height = Hh; }
  fxB.globalCompositeOperation = 'copy'; fxB.drawImage(cv, 0, 0);
  const off = 7 * k * DPR;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.55 * k;
  ctx.drawImage(tinted('#ff2a1a'), off, 0);   // red fringe right
  ctx.drawImage(tinted('#1ad8ff'), -off, 0);  // cyan fringe left
  // the ring itself, centred on the hit in screen space
  const cam = Game.cam, sx = (GFX.x - cam.x) * SCALE, sy = (GFX.y - cam.y) * SCALE;
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.5 * k;
  ctx.strokeStyle = BONE; ctx.lineWidth = 12 * k * SCALE;
  ctx.beginPath(); ctx.arc(sx, sy, (1 - k) * VH * 0.85 * SCALE + 8, 0, 7); ctx.stroke();
  ctx.restore();
};
// the home-run swing gets the wave (fires with Nathan's bark)
if (typeof Bark !== 'undefined') {
  const _plSay = Bark.say;
  Bark.say = function (who, text, at, o) {
    if (text === 'OUT OF THE PARK!') shockwave(Player.x + Player.w / 2 + Player.facing * 40, Player.y + Player.h / 2);
    return _plSay.apply(this, arguments);
  };
}

/* =========================================================
   SETTINGS · Flashy FX toggle + Export / Import save file
   ========================================================= */
(function buildSaveTools() {
  const vr = $('#vol'), card = vr && vr.closest('.card'); if (!card) return;
  const fx = document.createElement('div'); fx.className = 'row';
  fx.innerHTML = `<label>Flashy FX</label><span class="seg">${[[1, 'On'], [0, 'Off']].map(([v, t]) => `<button data-k="${v}">${t}</button>`).join('')}</span>`;
  const mark = () => fx.querySelectorAll('button').forEach(b => b.classList.toggle('on', +b.dataset.k === +GFX.on));
  fx.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    GFX.on = b.dataset.k === '1'; try { localStorage.setItem('ei_fx', GFX.on ? '1' : '0'); } catch (e) { logErr("zone/polish.js:337", e); }
    mark(); SFX.ui();
  }));
  mark();
  const sv = document.createElement('div'); sv.className = 'row';
  sv.innerHTML = `<label>Save File</label><span class="seg"><button data-a="exp">Export</button><button data-a="imp">Import</button></span><input type="file" accept=".json,application/json" hidden>`;
  const file = sv.querySelector('input');
  sv.querySelector('[data-a=exp]').addEventListener('click', () => {
    saveGame(); SFX.ui();
    const blob = new Blob([JSON.stringify({ game: 'extra-innings', v: 1, at: new Date().toISOString(), data: Save.data }, null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `extra-innings-save-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('SAVE EXPORTED');
  });
  sv.querySelector('[data-a=imp]').addEventListener('click', () => { SFX.ui(); file.value = ''; file.click(); });
  file.addEventListener('change', () => {
    const f = file.files && file.files[0]; if (!f) return;
    f.text().then(txt => {
      let o; try { o = JSON.parse(txt); } catch (e) { logErr("zone/polish.js:357", e); toast('THAT FILE ISN\'T A SAVE'); return; }
      const d = o && o.game === 'extra-innings' ? o.data : o;
      if (!d || typeof d !== 'object' || Array.isArray(d) || !('where' in d || 'q' in d)) { toast('THAT FILE ISN\'T A SAVE'); return; }
      if (!confirm('Replace your current save with this file? This can\'t be undone (export first if unsure).')) return;
      Save.data = d; saveGame();   // set before reload so the pagehide save writes the import, not the old run
      location.reload();
    });
  });
  card.appendChild(fx); card.appendChild(sv);
})();
