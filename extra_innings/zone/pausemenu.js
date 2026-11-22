'use strict';
/* =========================================================
   PAUSE MENU · the shell and the Map tab
   P opens it on the last tab, Tab / M on the map (Esc and Start are the system pause: zone/menu-keys.js).
   Q / E or L1 / R1 flip tabs, 1–5 jump straight to one.
   The old pause card lives on as OPTIONS (settings, the quest
   clipboard, start over, quit). Tabs 2–5 live in
   zone/pm-gear.js and zone/pm-log.js. Loaded after zone/kit.js.
   ========================================================= */
const PM = { tab: 'map', slowT: 0, slowAcc: 0, raf: 0, mapMode: 'tower', zone: null, pin: null, mouse: null, built: false, dashed: [], towerSegs: [], padL: false, padR: false, R: {} };
const PM_SLOW = 0.3;
const PM_TABS = [['map', 'Map'], ['crests', 'Crests & Badges'], ['tools', 'Tools & Balls'], ['log', 'Logbook'], ['trophies', 'Trophies']];
const PM_ZONES = [['z1', 0, '#c8641e'], ['z12', 210, '#3fb8a0'], ['z2', 420, '#b8432a'], ['z3', 840, '#6f97a8'], ['z4', 1260, '#e8561c'], ['z5', 1700, '#d9b26a'],
  ['z6', 2150, '#8a4fd0'], ['z7', 2600, '#5a7aa8'], ['z8', 3050, '#8fd6f0'], ['z9', 3500, '#f2c14e'], ['z10', 3920, '#d9c8ff']];
const PM_PINS = [['ball', 'Red Baseball', 'Cracked wall · needs an Explosive Baseball'], ['bolt', 'Purple Lightning', 'Red laser barrier · needs the Static Dash'],
  ['star', 'Gold Star', 'Lucky Pebble or hard-to-reach treasure'], ['skull', 'Black Skull', 'Tough boss or combat gauntlet']];
const PM_PIN_SVG = {
  ball: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#f3ead8" stroke="#0d0b10" stroke-width="2"/><path d="M7 5 Q10 12 7 19 M17 5 Q14 12 17 19" fill="none" stroke="#e8361c" stroke-width="1.6" stroke-dasharray="2 1.5"/></svg>',
  bolt: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#5a2a8a" stroke="#0d0b10" stroke-width="2"/><path d="M13 3 L7 13 L11 13 L9 21 L17 10 L13 10 Z" fill="#e2c8ff" stroke="#0d0b10" stroke-width="1.2" stroke-linejoin="round"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="M12 2 L14.8 8.6 L22 9.3 L16.6 14 L18.2 21 L12 17.3 L5.8 21 L7.4 14 L2 9.3 L9.2 8.6 Z" fill="#f2c14e" stroke="#0d0b10" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  skull: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.5" fill="#0d0b10" stroke="#d9cfb8" stroke-width="1.2"/><path d="M6.5 11 Q6.5 5 12 5 Q17.5 5 17.5 11 Q17.5 14 15.5 15 L15.5 18 L8.5 18 L8.5 15 Q6.5 14 6.5 11 Z" fill="#f3ead8"/><circle cx="9.6" cy="11" r="1.8" fill="#0d0b10"/><circle cx="14.4" cy="11" r="1.8" fill="#0d0b10"/><path d="M10.5 18 V16 M13.5 18 V16" stroke="#0d0b10" stroke-width="1"/></svg>',
};
const pmEsc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const pmRGBA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

/* ---------- the overlay ---------- */
(function pmBuild() {
  // thin thread-like filigree (Silksong style): a long divider, a short needle ornament and a pointer
  const B = '#d9cfb8', R = '#b0362e';
  const svgUrl = svg => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  const fade = (id, x1, x2) => `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="0" x2="${x2}" y2="0"><stop offset="0" stop-color="${B}" stop-opacity="0"/><stop offset="1" stop-color="${B}"/></linearGradient>`;
  const fili = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="24" viewBox="0 0 640 24"><defs>${fade('l', 10, 282)}${fade('r', 630, 358)}</defs>` +
    '<path d="M10 12 H282" stroke="url(#l)" stroke-width="1"/><path d="M358 12 H630" stroke="url(#r)" stroke-width="1"/>' +
    `<g fill="none" stroke="${B}" stroke-width="1.1" stroke-linecap="round">` +
    '<path d="M282 12 C292 12 296 4 304 5 C310 6 309 12 304 12"/><path d="M282 12 C292 12 296 20 304 19 C310 18 309 12 304 12"/>' +
    '<path d="M358 12 C348 12 344 4 336 5 C330 6 331 12 336 12"/><path d="M358 12 C348 12 344 20 336 19 C330 18 331 12 336 12"/>' +
    '<path d="M250 12 l-7 -3.5 M250 12 l-7 3.5 M390 12 l7 -3.5 M390 12 l7 3.5" stroke-width=".8"/></g>' +
    `<path d="M320 3 L327 12 L320 21 L313 12 Z" fill="none" stroke="${B}" stroke-width="1.1"/><path d="M320 7.5 L323.5 12 L320 16.5 L316.5 12 Z" fill="${R}"/></svg>`;
  const needle = `<svg xmlns="http://www.w3.org/2000/svg" width="86" height="12" viewBox="0 0 86 12"><defs>${fade('a', 2, 43)}${fade('b', 84, 43)}</defs>` +
    '<path d="M2 6 H38" stroke="url(#a)" stroke-width="1"/><path d="M48 6 H84" stroke="url(#b)" stroke-width="1"/>' +
    `<path d="M31 6 q4 -4 7 -1.2 M55 6 q-4 -4 -7 -1.2 M31 6 q4 4 7 1.2 M55 6 q-4 4 -7 1.2" fill="none" stroke="${B}" stroke-width=".9"/><path d="M43 1.5 L47 6 L43 10.5 L39 6 Z" fill="${B}"/></svg>`;
  const point = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="9" viewBox="0 0 12 9"><path d="M0 4.5 H4" stroke="${B}" stroke-width=".8"/><path d="M4 4.5 L8.5 1.2 L12 4.5 L8.5 7.8 Z" fill="${B}"/></svg>`;
  const st = document.createElement('style');
  st.textContent = `:root{--pm-fili-img:${svgUrl(fili)};--pm-needle:${svgUrl(needle)};--pm-point:${svgUrl(point)};--pm-point-img:${svgUrl(point)}}.pm-fili{background-image:var(--pm-fili-img)}`;
  document.head.appendChild(st);
  const el = document.createElement('div'); el.id = 'pmenu'; el.className = 'overlay';
  el.innerHTML = `<div class="pm-frame">
    <nav class="pm-tabs"><span class="pm-bumper" data-step="-1">‹ Q</span>${PM_TABS.map(([id, n]) => `<span class="pm-tab" data-tab="${id}">${n}</span>`).join('')}<span class="pm-bumper" data-step="1">E ›</span></nav>
    <div class="pm-fili"></div>
    <section class="pm-body" id="pmBody"></section>
    <div class="pm-fili"></div>
    <footer class="pm-foot"><span id="pmHint"></span><span class="pm-sp"></span><span class="pm-clock" id="pmClock"></span>
      <button class="pm-btn" data-act="options">Options</button><button class="pm-btn red" data-act="resume">Resume</button></footer></div>`;
  document.body.appendChild(el);
  el.addEventListener('click', e => {
    if (e.target === el) { closeModal(); return; }
    const t = e.target.closest('[data-tab]'); if (t) { pmSetTab(t.dataset.tab); return; }
    const s = e.target.closest('[data-step]'); if (s) { pmTabStep(+s.dataset.step); return; }
    const a = e.target.closest('[data-act]');
    if (a && a.dataset.act === 'resume') closeModal();
    if (a && a.dataset.act === 'options') pmOptions();
  });
  // the old pause card is now the Options screen
  const pc = $('#pause .pause-card');
  if (pc) { const h = pc.querySelector('h1'), ey = pc.querySelector('.eyebrow'); if (h) h.textContent = 'Options'; if (ey) ey.textContent = 'Catch your breath'; }
})();

/* ---------- opening: the world slows to a stop first ---------- */
function pmOpen(tab, instant) {
  if (UI.modal || PM.slowT > 0 || !started || Story.active) return;
  if (tab) PM.tab = tab;
  if (tab === 'map' || PM.tab === 'map') {
    const z = PAGE.zoneHere(); PM.zone = z;
    PM.mapMode = MAP_CFG[z] && MAP_CFG[z].hasMap() ? 'zone' : 'tower';
  }
  SFX.glove();
  if (instant) { pmReallyOpen(); return; }
  Input.enabled = false; Input.clear();
  PM.slowT = PM_SLOW; PM.slowAcc = 0;
  $('#pmenu').classList.add('show', 'pm-pre');
}
function pmReallyOpen() {
  PM.slowT = 0;
  const el = $('#pmenu');
  if (UI.modal) { el.classList.remove('show', 'pm-pre'); return; }
  el.classList.remove('pm-pre');
  openModal('pmenu'); pmRender();
}
const _pmStep = step;
step = function (dt) {
  if (PM.slowT <= 0) return _pmStep(dt);
  // run fewer and fewer simulation steps until the world stands still
  PM.slowT -= dt;
  PM.slowAcc += Math.max(0, PM.slowT / PM_SLOW);
  if (PM.slowAcc >= 1) { PM.slowAcc -= 1; _pmStep(dt); }
  if (PM.slowT <= 0) pmReallyOpen();
};
function pmOptions() { closeModal(); openModal('pause'); pauseSel = 0; markPause(); SFX.flip(); }
setPaused = function (p) { if (p) pmOpen(); else closeModal(); };
openMap = function () { if (UI.modal === 'pmenu') pmSetTab('map'); else pmOpen('map'); };
const _pmPause = pauseAction;
pauseAction = function (a) {
  if (a === 'map') { closeModal(); pmOpen('map', true); return; }
  if (a === 'badges') { closeModal(); pmOpen('crests', true); return; }
  if (a === 'resume') { closeModal(); return; }
  return _pmPause(a);
};

/* ---------- tabs ---------- */
function pmSetTab(id) {
  if (PM.tab === id) return;
  PM.tab = id; PM.R = {}; SFX.flip();
  if (id === 'map' && !PM.zone) PM.zone = PAGE.zoneHere();
  pmRender();
}
function pmTabStep(d) { const i = PM_TABS.findIndex(t => t[0] === PM.tab); pmSetTab(PM_TABS[(i + d + PM_TABS.length) % PM_TABS.length][0]); }
const PM_VIEWS = {};   // filled in per tab: { render(body), nav(dx, dy), ok(), alt(), hint }
function pmRender() {
  if (UI.modal !== 'pmenu') return;
  $$('.pm-tab').forEach(t => t.classList.toggle('on', t.dataset.tab === PM.tab));
  const body = $('#pmBody'), V = PM_VIEWS[PM.tab];
  // keep every scrolled list where it was
  const keep = $$('#pmBody .pm-scroll').map(s => s.scrollTop);
  // the zone map canvas is borrowed from the old map sheet: hand it back before the body is rebuilt
  const mc = $('#mapCanvas'), sheet = $('#map .map-sheet');
  if (mc && sheet && mc.parentNode !== sheet) sheet.prepend(mc);
  // a broken page shows what went wrong instead of an empty sheet
  try { if (V) V.render(body); else throw new Error('no page for tab "' + PM.tab + '"'); }
  catch (e) {
    if (typeof logErr === 'function') logErr('pausemenu: render ' + PM.tab, e); else console.error(e);
    body.innerHTML = `<div class="pm-panel" style="flex:1;align-items:center;justify-content:center;text-align:center"><h2>This page tore</h2>
      <p style="max-width:560px">${pmEsc(String(e && e.message || e))}</p><p class="pm-note">Press Q / E for another tab. Console: <code>EI_ERRORS_DUMP()</code></p></div>`;
  }
  try {
    $$('#pmBody .pm-scroll').forEach((s, i) => { if (keep[i] !== undefined) s.scrollTop = keep[i]; });
    const sel = $('#pmBody .pm-scroll .sel'); if (sel) sel.scrollIntoView({ block: 'nearest' });
  } catch (e) { logErr('pausemenu: scroll', e); }
  let hint = ''; try { hint = V && V.hint ? V.hint : ''; } catch (e) { logErr('pausemenu: hint', e); }
  $('#pmHint').innerHTML = '<kbd>Q</kbd><kbd>E</kbd> tabs · ' + hint + ' · <kbd>Esc</kbd> resume';
  try {
    const q = Save.data.q;
    $('#pmClock').textContent = q.shotClock && typeof fmtClock === 'function' ? 'Shot clock · ' + fmtClock(q.clock || 0) : 'Played · ' + pmTime(Save.data.time || 0);
  } catch (e) { logErr('pausemenu: clock', e); }
}
const pmTime = s => { const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return `${h}h ${String(m).padStart(2, '0')}m`; };

/* ---------- input ---------- */
addEventListener('keydown', e => {
  if (UI.modal !== 'pmenu') return;
  const c = e.code, V = PM_VIEWS[PM.tab];
  let used = true;
  if (c === 'KeyQ' || c === 'PageUp') { if (!e.repeat) pmTabStep(-1); }
  else if (c === 'KeyE' || c === 'PageDown') { if (!e.repeat) pmTabStep(1); }
  else if (/^Digit[1-5]$/.test(c)) pmSetTab(PM_TABS[+c.slice(5) - 1][0]);
  else if (c === 'Escape' || c === 'KeyP') closeModal();
  else if (KEYMAP[c] === 'map') { if (!e.repeat) { if (PM.tab === 'map') closeModal(); else pmSetTab('map'); } }
  else if (c === 'ArrowLeft' || c === 'KeyA') V && V.nav(-1, 0);
  else if (c === 'ArrowRight' || c === 'KeyD') V && V.nav(1, 0);
  else if (c === 'ArrowUp' || c === 'KeyW') V && V.nav(0, -1);
  else if (c === 'ArrowDown' || c === 'KeyS') V && V.nav(0, 1);
  else if (c === 'Enter' || c === 'Space' || c === 'KeyJ') { if (!e.repeat) V && V.ok(); }
  else if (c === 'KeyK' || c === 'KeyZ') { if (!e.repeat && V && V.alt) V.alt(); }
  else used = false;
  if (used) { e.preventDefault(); e.stopImmediatePropagation(); }
}, true);
const _pmPoll = Input.pollPad;
Input.pollPad = function () {
  _pmPoll.call(this);
  if (UI.modal !== 'pmenu') return;
  const B = this.buffered, V = PM_VIEWS[PM.tab];
  const pads = navigator.getGamepads ? navigator.getGamepads() : [], p = pads && [...pads].find(Boolean);
  // pad buttons read raw here (Silksong menu rules): B backs out, Y is the extra action,
  // LB/RB and LT/RT flip tabs, whatever button is bound to the map toggles the map
  const prev = PM.padPrev || [], now = p ? p.buttons.map(b => !!b.pressed) : [];
  const fresh = i => now[i] && !prev[i];
  const padHit = a => (Bindings.pad[a] || []).some(i => i !== null && fresh(i));
  const kb = a => B.has(a) && !padHit(a);   // the same action, but from the keyboard
  const mapOn = i => (Bindings.pad.map || []).includes(i);
  PM.padPrev = now;
  if (p) {
    const trig = PM.tab !== 'map';   // on the map the triggers zoom (zone/map-live.js)
    if ((fresh(4) && !mapOn(4)) || (trig && fresh(6) && !mapOn(6))) pmTabStep(-1);
    if ((fresh(5) && !mapOn(5)) || (trig && fresh(7) && !mapOn(7))) pmTabStep(1);
  }
  if (V) {
    if (B.has('left')) V.nav(-1, 0); if (B.has('right')) V.nav(1, 0);
    if (B.has('up')) V.nav(0, -1); if (B.has('down')) V.nav(0, 1);
    if (B.has('jump') || B.has('attack')) V.ok();
    if ((kb('ball') || fresh(3)) && V.alt) V.alt();
  }
  if (kb('dash') || fresh(1)) closeModal();
  else if (B.has('map')) { if (PM.tab === 'map') closeModal(); else pmSetTab('map'); }
  B.clear();
};
addEventListener('padpause', () => { if (UI.modal === 'pmenu') closeModal(); });

/* =========================================================
   TAB 1 · THE MAP
   ========================================================= */
const pmRoomZone = rm => rm.zone || PAGE.zoneOf(rm.id);
function pmZoneRooms(z) { const C = MAP_CFG[z]; return C ? C.rooms.filter(rm => !rm.dream && pmRoomZone(rm) === z) : []; }
// side-quest pieces that live in this zone's rooms: [done, total]
function pmZoneQuests(z, rooms) {
  if (typeof QUEST_SPOTS === 'undefined') return [0, 0];
  const q = Save.data.q, S = QUEST_SPOTS, ids = new Set(rooms.map(rm => rm.id)), has = (k, id) => !!(q[k] || {})[id];
  let done = 0, total = 0;
  const add = ok => { total++; if (ok) done++; };
  for (const s of S.stubs || []) if (ids.has(s.room)) add(has('stubs', s.id));
  for (const s of S.goals || []) if (ids.has(s.room)) add(has('goals', s.id));
  for (const s of S.books || []) if (ids.has(s.room)) add(has('books', s.id));
  for (const s of S.herbs || []) if (ids.has(s.room)) add(has('herbs', s.id));
  for (const s of S.cats || []) if (ids.has(s.room)) add(q.cats === 'done' || has('catsFound', s.id));
  for (const s of S.elites || []) if (ids.has(s.room)) add(has('boards', s.id));
  const tr = S.trials && S.trials[z]; if (tr && ids.has(tr.room)) add(has('trials', z));
  return [done, total];
}
function pmZonePct(z) {
  const D = Save.data, q = D.q;
  if (MAP_CFG[z]) {
    const all = pmZoneRooms(z), list = all.filter(rm => !rm.secret || D.visited[rm.id]);
    const [qd, qt] = pmZoneQuests(z, all);
    if (list.length) q.zonePct[z] = Math.round(100 * (list.filter(rm => D.visited[rm.id]).length + qd) / (list.length + qt));
  }
  return q.zonePct[z];
}
const pmKnown = z => { const D = Save.data; return z === 'z1' || !!(D.seenZones[z] || D.maps[z] || D.bells[z]) || z === PAGE.zoneHere(); };
function pmTowerZones() {
  const D = Save.data;
  return PM_ZONES.filter(([z]) => z !== 'z10' || D.coreOpen || D.zennithDead || PAGE.zoneHere() === 'z10');
}
function pmInked() {
  const D = Save.data, out = {};
  for (const k in D.visited) if (D.visited[k] && D.q.inked[k]) out[k] = D.visited[k];
  return out;
}
function pmBuildZone() {
  const z = PM.zone, C = MAP_CFG[z], cv = $('#mapCanvas'), host = $('#pmMapHost');
  if (!C || !cv || !host) return;
  // fit the sheet into the host before the map code measures it
  const hw = host.clientWidth, hh = host.clientHeight;
  cv.style.width = Math.floor(Math.min(hw, hh / 0.56)) + 'px';
  const D = Save.data, V = D.visited, cur = MAP_CFG.current;
  MAP_CFG.current = () => C; D.visited = pmInked();   // only rooms you've rested since are inked
  try { buildMapLayer(); } catch (e) { logErr('pausemenu: build map', e); } finally { MAP_CFG.current = cur; D.visited = V; }
  // unexplored rooms behind an open door: dashed outlines
  const inZ = pmZoneRooms(z), byId = {}; inZ.forEach(rm => { byId[rm.id] = rm; });
  const seen = new Set(), out = [];
  if (typeof LINKS !== 'undefined') for (const [a, b] of LINKS) {
    for (const [from, to] of [[a, b], [b, a]]) if (V[from] && byId[to] && !V[to] && !byId[to].secret && !seen.has(to)) { seen.add(to); out.push(byId[to]); }
  }
  PM.dashed = out; PM.built = true; MapView.t0 = performance.now();
}
function pmMapFrame(now) {
  if (UI.modal !== 'pmenu' || PM.tab !== 'map') { PM.raf = 0; return; }
  PM.raf = requestAnimationFrame(pmMapFrame);
  try { if (PM.mapMode === 'tower') pmDrawTower(now); else if (PM.built) pmDrawZone(now); }
  catch (e) { logErr('pausemenu: map frame', e); }
}
// Nathan's map marker: a flame-red baseball cap, brim to the right
function pmCap(g, x, y, s) {
  g.save(); g.translate(x, y); g.scale(s, s); g.lineJoin = 'round';
  g.beginPath(); g.moveTo(-8, 3); g.quadraticCurveTo(-8, -8, 0, -8); g.quadraticCurveTo(8, -8, 8, 2); g.lineTo(14, 3); g.quadraticCurveTo(12, 0, 8, -0.5); g.lineTo(8, 3); g.closePath();
  g.fillStyle = '#e8361c'; g.fill(); g.lineWidth = 2; g.strokeStyle = '#0d0b10'; g.stroke();
  g.fillStyle = 'rgba(13,11,16,.3)'; g.fillRect(-7, 0, 15, 3);
  g.fillStyle = '#f3ead8'; g.beginPath(); g.arc(0, -8, 1.8, 0, 7); g.fill();
  g.restore();
}
function pmDrawPin(g, x, y, t) {
  g.save(); g.translate(x, y);
  g.fillStyle = 'rgba(40,25,10,.35)'; g.beginPath(); g.ellipse(1.5, 1.5, 6, 2.4, 0, 0, 7); g.fill();
  g.strokeStyle = '#3a3340'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -9); g.stroke();
  g.translate(0, -17); g.lineJoin = 'round';
  if (t === 'ball') {
    g.fillStyle = '#f3ead8'; g.strokeStyle = '#0d0b10'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 8, 0, 7); g.fill(); g.stroke();
    g.strokeStyle = '#e8361c'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-4, -6); g.quadraticCurveTo(-1, 0, -4, 6); g.moveTo(4, -6); g.quadraticCurveTo(1, 0, 4, 6); g.stroke();
  } else if (t === 'bolt') {
    g.fillStyle = '#5a2a8a'; g.strokeStyle = '#0d0b10'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 9, 0, 7); g.fill(); g.stroke();
    g.fillStyle = '#e2c8ff'; g.beginPath(); g.moveTo(1, -8); g.lineTo(-4, 1); g.lineTo(0, 1); g.lineTo(-2, 8); g.lineTo(5, -2); g.lineTo(1, -2); g.closePath(); g.fill();
  } else if (t === 'star') {
    g.fillStyle = '#f2c14e'; g.strokeStyle = '#0d0b10'; g.lineWidth = 1.8; g.beginPath();
    for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 4 : 9.5; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    g.closePath(); g.fill(); g.stroke();
  } else {
    g.fillStyle = '#0d0b10'; g.strokeStyle = '#d9cfb8'; g.lineWidth = 1.2; g.beginPath(); g.arc(0, 0, 9.5, 0, 7); g.fill(); g.stroke();
    g.fillStyle = '#f3ead8'; g.beginPath(); g.arc(0, -1.5, 5.5, Math.PI, 0); g.lineTo(5.5, 1); g.lineTo(3, 2.5); g.lineTo(3, 5.5); g.lineTo(-3, 5.5); g.lineTo(-3, 2.5); g.lineTo(-5.5, 1); g.closePath(); g.fill();
    g.fillStyle = '#0d0b10'; g.beginPath(); g.arc(-2.2, -1, 1.5, 0, 7); g.arc(2.2, -1, 1.5, 0, 7); g.fill();
  }
  g.restore();
}
function pmDrawZone(now) {
  const M = MapView, g = M.cv.getContext('2d'), t = (now - M.t0) / 1000, z = PM.zone, col = (PM_ZONES.find(r => r[0] === z) || [0, 0, '#c8a060'])[2];
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, M.cv.width, M.cv.height);
  const k = Math.min(1, t / 0.45), half = (M.cv.width / 2) * (1 - Math.pow(1 - k, 3));
  g.save(); g.beginPath(); g.rect(M.cv.width / 2 - half, 0, half * 2, M.cv.height); g.clip();
  g.drawImage(M.layer, 0, 0);
  // each zone's own colour washed into the parchment
  g.globalCompositeOperation = 'multiply'; g.fillStyle = pmRGBA(col, 0.3); g.fillRect(0, 0, M.cv.width, M.cv.height);
  g.globalCompositeOperation = 'source-over';
  g.setTransform(M.dpr, 0, 0, M.dpr, 0, 0);
  const X = tx => M.ox + tx * M.s, Y = ty => M.oy + ty * M.s;
  g.setLineDash([6, 5]); g.strokeStyle = 'rgba(58,38,22,.75)'; g.lineWidth = 1.6;
  for (const rm of PM.dashed) g.strokeRect(X(rm.x0) + 2, Y(rm.y0) + 2, rm.tw * M.s - 4, rm.th * M.s - 4);
  g.setLineDash([]);
  for (const p of (Save.data.q.pins[z] || [])) pmDrawPin(g, X(p.x), Y(p.y), p.t);
  if (PM.pin && PM.mouse) { g.globalAlpha = 0.55; pmDrawPin(g, PM.mouse.x, PM.mouse.y, PM.pin); g.globalAlpha = 1; }
  if (k >= 1 && Save.data.up.compass && z === PAGE.zoneHere() && Zone.room && M.rooms.includes(Zone.room) && M.shown.includes(Zone.room)) {
    const c = Player.center(), x = M.ox + (c.x / TILE) * M.s, y = M.oy + ((Player.y + Player.h) / TILE) * M.s - 6, pulse = (t * 1.4) % 1;
    g.strokeStyle = `rgba(255,59,48,${1 - pulse})`; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 6 + pulse * 16, 0, 7); g.stroke();
    g.beginPath(); g.arc(x, y, 7, Math.PI, 0); g.lineTo(x + 12, y + 1); g.lineTo(x - 7, y + 1); g.closePath();
    g.fillStyle = '#e8361c'; g.fill(); g.lineWidth = 2; g.strokeStyle = INKM; g.stroke();
  }
  g.restore();
}
function pmDrawTower(now) {
  const cv = $('#pmTowerCv'); if (!cv) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2), w = cv.clientWidth, h = cv.clientHeight;
  if (!w || !h) return;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const g = cv.getContext('2d'), t = now / 1000, D = Save.data, here = PAGE.zoneHere();
  g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
  const list = pmTowerZones(), top = 44, bot = h - 34, maxAlt = list[list.length - 1][1] + 440;
  const yOf = a => bot - (a / maxAlt) * (bot - top), cx = w * 0.55;
  const widthAt = a => lerp(Math.min(380, w * 0.5), Math.min(170, w * 0.22), a / maxAlt);
  // sky, motes
  const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#1a1d2c'); sky.addColorStop(1, '#0b0c12'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 60; i++) { const x = (mhash(i, 3) * w + t * 4 * (1 + mhash(i, 9))) % w, y = mhash(i, 7) * h; g.fillStyle = `rgba(217,207,184,${0.08 + 0.12 * mhash(i, 1)})`; g.fillRect(x, y, 1.5, 1.5); }
  // altitude meter
  g.strokeStyle = 'rgba(217,207,184,.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(66, top); g.lineTo(66, bot); g.stroke();
  g.font = 'italic 10px "Iowan Old Style", Palatino, Georgia, serif'; g.textAlign = 'right'; g.textBaseline = 'middle';
  for (let a = 0; a <= maxAlt; a += 250) {
    const y = yOf(a), big = a % 500 === 0;
    g.strokeStyle = big ? 'rgba(217,207,184,.8)' : 'rgba(217,207,184,.35)'; g.beginPath(); g.moveTo(66, y); g.lineTo(big ? 76 : 71, y); g.stroke();
    if (big) { g.fillStyle = 'rgba(233,226,208,.6)'; g.fillText(a.toLocaleString('en-US') + ' m', 60, y); }
  }
  g.save(); g.translate(22, (top + bot) / 2); g.rotate(-Math.PI / 2); g.textAlign = 'center'; g.fillStyle = 'rgba(217,207,184,.7)'; g.font = 'italic 10px "Iowan Old Style", Palatino, Georgia, serif'; g.fillText('altitude', 0, 0); g.restore();
  // ground
  g.fillStyle = '#07080b'; g.beginPath(); g.moveTo(cx - widthAt(0) * 0.8, bot); g.quadraticCurveTo(cx, bot - 14, cx + widthAt(0) * 0.8, bot); g.lineTo(w, h); g.lineTo(0, h); g.closePath(); g.fill();
  PM.towerSegs = [];
  list.forEach(([z, alt, col], i) => {
    const a1 = i + 1 < list.length ? list[i + 1][1] : alt + 420, y0 = yOf(alt), y1 = yOf(a1) + 3, w0 = widthAt(alt), w1 = widthAt(a1);
    const known = pmKnown(z), sel = z === PM.zone, cur = z === here;
    g.beginPath(); g.moveTo(cx - w0 / 2, y0); g.lineTo(cx - w1 / 2, y1); g.lineTo(cx + w1 / 2, y1); g.lineTo(cx + w0 / 2, y0); g.closePath();
    if (known) { const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, pmRGBA(col, 0.38)); gr.addColorStop(1, pmRGBA(col, 0.8)); g.fillStyle = gr; }
    else g.fillStyle = '#161925';
    g.fill();
    g.save(); g.clip();
    for (let k = 0; k < 14; k++) {   // lit windows
      const fx = mhash(k, i * 5 + 1), fy = mhash(i * 7 + 3, k);
      const on = known && (Math.sin(t * 1.3 + k * 1.7 + i) > -0.6);
      g.fillStyle = on ? 'rgba(255,236,180,.55)' : 'rgba(0,0,0,.25)';
      g.fillRect(cx - w0 / 2 + fx * w0, y1 + 6 + fy * (y0 - y1 - 12), 3, 5);
    }
    g.restore();
    g.lineWidth = sel ? 2.5 : 1; g.strokeStyle = sel ? '#d9cfb8' : 'rgba(217,207,184,.45)';
    if (sel) { g.shadowColor = 'rgba(217,207,184,.8)'; g.shadowBlur = 14; }
    g.stroke(); g.shadowBlur = 0;
    const my = (y0 + y1) / 2;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const name = known ? ZONES[z].name : '? ? ?';
    g.font = `${known ? 'bold ' : 'italic '}15px "Iowan Old Style", Palatino, Georgia, serif`;
    if (known) {
      // a notched serif banner hung across the floor
      const bw = g.measureText(name).width + 30, bh = 22;
      g.beginPath(); g.moveTo(cx - bw / 2 - 9, my - bh / 2); g.lineTo(cx + bw / 2 + 9, my - bh / 2); g.lineTo(cx + bw / 2 + 1, my); g.lineTo(cx + bw / 2 + 9, my + bh / 2);
      g.lineTo(cx - bw / 2 - 9, my + bh / 2); g.lineTo(cx - bw / 2 - 1, my); g.closePath();
      g.fillStyle = 'rgba(10,8,12,.8)'; g.fill(); g.strokeStyle = sel ? 'rgba(217,207,184,.9)' : 'rgba(217,207,184,.45)'; g.lineWidth = 1; g.stroke();
    }
    g.fillStyle = known ? '#f3ead8' : 'rgba(233,226,208,.3)';
    g.fillText(name, cx, my + 1);
    const pct = known ? pmZonePct(z) : undefined;
    g.textAlign = 'left'; g.font = 'italic 11px "Iowan Old Style", Palatino, Georgia, serif'; g.fillStyle = 'rgba(217,207,184,.9)';
    g.fillText(pct !== undefined ? pct + '%' : known ? '—' : '', cx + w0 / 2 + 12, my);
    if (cur) {
      // Nathan's red cap, with a slow golden ring
      const px = cx - w0 / 2 - 24, pulse = (t * 0.6) % 1;
      g.strokeStyle = `rgba(242,193,78,${0.85 * (1 - pulse)})`; g.lineWidth = 1.6; g.beginPath(); g.arc(px, my, 8 + pulse * 15, 0, 7); g.stroke();
      pmCap(g, px, my, 1);
      g.textAlign = 'right'; g.font = 'italic 10px "Iowan Old Style", Palatino, Georgia, serif'; g.fillStyle = 'rgba(217,207,184,.8)'; g.fillText('Nathan', px - 16, my);
    }
    PM.towerSegs.push({ z, x0: cx - w0 / 2, x1: cx + w0 / 2, y0: y1, y1: y0 });
  });
  // the Overtime Abyss: a pocket hanging off the stadium
  if (D.q.abyss && D.q.abyss !== undefined) {
    const s9 = PM.towerSegs.find(s => s.z === 'z9');
    if (s9) {
      const x = s9.x1 + 54, y = s9.y0 + 10, ww = 86, hh = s9.y1 - s9.y0 - 14;
      g.strokeStyle = 'rgba(242,193,78,.8)'; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(s9.x1, y + hh / 2); g.lineTo(x, y + hh / 2); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#050507'; g.fillRect(x, y, ww, hh); g.strokeStyle = PM.zone === 'z11' ? '#d9cfb8' : 'rgba(242,193,78,.6)'; g.lineWidth = PM.zone === 'z11' ? 2.5 : 1; g.strokeRect(x, y, ww, hh);
      g.fillStyle = '#f2c14e'; g.font = 'italic 11px "Iowan Old Style", Palatino, Georgia, serif'; g.textAlign = 'center'; g.fillText('Overtime Abyss', x + ww / 2, y + hh / 2);
      PM.towerSegs.push({ z: 'z11', x0: x, x1: x + ww, y0: y, y1: y + hh });
    }
  }
  // the spire's crown
  const tz = list[list.length - 1], ya = yOf(tz[1] + 420) + 3;
  g.strokeStyle = '#d9cfb8'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, ya); g.lineTo(cx, ya - 26); g.stroke();
  g.fillStyle = '#b0362e'; g.beginPath(); g.arc(cx, ya - 28, 3 + Math.sin(t * 3) * 0.8, 0, 7); g.fill();
}
function pmTowerHit(e) {
  const cv = $('#pmTowerCv'), r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  return PM.towerSegs.find(s => x >= s.x0 - 6 && x <= s.x1 + 6 && y >= s.y0 && y <= s.y1);
}
function pmZoomIn() {
  const z = PM.zone, C = MAP_CFG[z];
  if (!pmKnown(z) && z !== 'z11') { SFX.deny(); PM.msg = 'Nobody has charted that part of the tower yet.'; pmRenderMapSide(); return; }
  if (!C) { SFX.deny(); PM.msg = 'That floor of the Spire is somewhere else. Its map unfolds when you\'re there.'; pmRenderMapSide(); return; }
  PM.mapMode = 'zone'; PM.msg = ''; SFX.paper(); pmRender();
}
function pmMapCoords(e) {
  const M = MapView, r = M.cv.getBoundingClientRect(), x = (e.clientX - r.left) * (M.w / r.width), y = (e.clientY - r.top) * (M.h / r.height);
  return { x, y, tx: (x - M.ox) / M.s, ty: (y - M.oy) / M.s };
}
function pmMapClick(e) {
  if (PM.mapMode !== 'zone' || !PM.built) return;
  const q = Save.data.q, z = PM.zone, list = q.pins[z] = q.pins[z] || [], p = pmMapCoords(e), M = MapView;
  // click an existing pin to pull it out
  const hit = list.findIndex(o => Math.hypot(M.ox + o.x * M.s - p.x, M.oy + o.y * M.s - 17 - p.y) < 12);
  if (hit >= 0) { list.splice(hit, 1); SFX.latch(); saveGame(); pmRenderMapSide(); return; }
  if (!PM.pin) { PM.msg = 'Pick a pin on the right, then click the map.'; pmRenderMapSide(); return; }
  list.push({ x: +p.tx.toFixed(2), y: +p.ty.toFixed(2), t: PM.pin }); SFX.latch(); saveGame(); pmRenderMapSide();
}
function pmRenderMapSide() {
  const side = $('#pmMapSide'); if (!side) return;
  const D = Save.data, z = PM.zone, C = MAP_CFG[z], known = pmKnown(z) || z === 'z11', Z = ZONES[z] || { name: 'The Overtime Abyss', sub: 'Secret · Below the Grand Locker Room' };
  const pct = known ? pmZonePct(z) : undefined, alt = (PM_ZONES.find(r => r[0] === z) || [0, null])[1];
  const wet = C ? pmZoneRooms(z).filter(rm => D.visited[rm.id] && !D.q.inked[rm.id]).length : 0;
  const pins = (D.q.pins[z] || []).length;
  side.innerHTML = `<h3>${PM.mapMode === 'tower' ? 'The Tower of Zennith' : 'Zone Detail'}</h3>
    <h2>${known ? pmEsc(Z.name) : '? ? ?'}</h2><p class="pm-dim" style="font-style:italic">${known ? pmEsc(Z.sub) : 'Uncharted'}</p>
    <div class="pm-kv"><span>Complete</span><b>${pct !== undefined ? pct + '%' : '—'}</b>${alt !== null && alt !== undefined ? `<span>Altitude</span><b>${alt.toLocaleString('en-US')} m</b>` : ''}
      <span>Reshman's map</span><b>${C && C.hasMap() ? 'Yes' : 'No'}</b><span>Quill · Compass</span><b>${D.up.quill ? 'yes' : 'no'} · ${D.up.compass ? 'yes' : 'no'}</b></div>
    <div class="pm-bar"><i style="width:${pct || 0}%"></i></div>
    ${C && !C.hasMap() ? `<p class="pm-note">${pmEsc(C.noMap)}</p>` : ''}
    ${wet ? `<p class="pm-note">${wet} explored area${wet > 1 ? 's' : ''} still in wet pencil. The ink sets when you rest on a Dugout Bench.</p>` : ''}
    <hr class="pm-rule"><h3>Your pins${pins ? ` · ${pins} here` : ''}</h3>
    <div class="pm-pins">${PM_PINS.map(([id, n, d]) => `<button class="pm-pin ${PM.pin === id ? 'on' : ''}" data-pin="${id}" title="${pmEsc(d)}">${PM_PIN_SVG[id]}<span>${n}</span></button>`).join('')}</div>
    <p class="pm-note">${PM.pin ? pmEsc(PM_PINS.find(p => p[0] === PM.pin)[2]) + '. Click the zone map to place it. Click a pin to remove it.' : 'Pick a pin, then click the zone map to mark a secret.'}</p>
    <p class="pm-msg">${pmEsc(PM.msg || '')}</p>`;
  side.querySelectorAll('[data-pin]').forEach(b => b.addEventListener('click', () => {
    PM.pin = PM.pin === b.dataset.pin ? null : b.dataset.pin; SFX.latch();
    if (PM.pin && PM.mapMode === 'tower' && MAP_CFG[PM.zone]) { pmZoomIn(); return; }
    pmRenderMapSide();
  }));
}
function pmPageZones() { return PM_ZONES.map(r => r[0]).concat('z11').filter(z => MAP_CFG[z] && (pmKnown(z) || (z === 'z11' && Save.data.q.abyss))); }
PM_VIEWS.map = {
  hint: '<kbd>↑</kbd><kbd>↓</kbd> zone · <kbd>Enter</kbd> zoom · <kbd>K</kbd> tower / zone',
  render(body) {
    PM.built = false; PM.msg = PM.msg || '';
    if (!PM.zone) PM.zone = PAGE.zoneHere();
    const C = MAP_CFG[PM.zone], zoneOK = PM.mapMode === 'zone' && C;
    body.innerHTML = `<div class="pm-panel pm-orn pm-mapcol"><div class="pm-mapbar">
        <button class="pm-btn ${PM.mapMode === 'tower' ? 'sel' : ''}" data-mode="tower">Tower</button><button class="pm-btn ${PM.mapMode === 'zone' ? 'sel' : ''}" data-mode="zone">Zone</button>
        <span class="pm-sp"></span><span class="pm-note">${PM.mapMode === 'tower' ? 'All of the Spire, bottom to top. Double-click a floor to zoom in.' : 'Rooms ink in fully once you rest on a bench. Dashed outlines: doors you haven\'t been through.'}</span></div>
      <div class="pm-maphost" id="pmMapHost"></div></div><div class="pm-panel pm-orn pm-side pm-scroll" id="pmMapSide"></div>`;
    const host = $('#pmMapHost');
    if (PM.mapMode === 'tower') {
      const cv = document.createElement('canvas'); cv.id = 'pmTowerCv'; host.appendChild(cv);
      cv.addEventListener('mousemove', e => { const s = pmTowerHit(e); cv.style.cursor = s ? 'pointer' : 'default'; });
      cv.addEventListener('click', e => { const s = pmTowerHit(e); if (s && s.z !== PM.zone) { PM.zone = s.z; PM.msg = ''; SFX.latch(); pmRenderMapSide(); } });
      cv.addEventListener('dblclick', e => { const s = pmTowerHit(e); if (s) { PM.zone = s.z; pmZoomIn(); } });
    } else if (zoneOK && C.hasMap()) {
      const cv = $('#mapCanvas'); host.appendChild(cv);
      if (!cv.dataset.pm) {
        cv.dataset.pm = 1;
        cv.addEventListener('click', e => { if (UI.modal === 'pmenu') pmMapClick(e); });
        cv.addEventListener('mousemove', e => { if (UI.modal === 'pmenu' && PM.built) { const p = pmMapCoords(e); PM.mouse = { x: p.x, y: p.y }; } });
        cv.addEventListener('mouseleave', () => { PM.mouse = null; });
      }
      requestAnimationFrame(() => { if (UI.modal === 'pmenu' && PM.tab === 'map' && PM.mapMode === 'zone') pmBuildZone(); });
    } else {
      host.innerHTML = `<div class="pm-blind"><b>${pmKnown(PM.zone) ? 'Blind map' : 'Uncharted'}</b>${C ? pmEsc(C.noMap || '') : 'That floor of the Spire is somewhere else. Its map unfolds when you\'re there.'}<br><br><span class="pm-note">Reshman hides in a dark corner of every zone. Find him, and he\'ll sell you his sketch. …blorp.</span></div>`;
    }
    body.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => { if (b.dataset.mode === 'zone') pmZoomIn(); else { PM.mapMode = 'tower'; SFX.paper(); pmRender(); } }));
    pmRenderMapSide();
    if (!PM.raf) PM.raf = requestAnimationFrame(pmMapFrame);
  },
  nav(dx, dy) {
    if (PM.mapMode === 'tower') {
      const L = pmTowerZones().map(r => r[0]).concat(Save.data.q.abyss ? ['z11'] : []), i = Math.max(0, L.indexOf(PM.zone));
      const j = clamp(i + (dy ? -dy : dx), 0, L.length - 1); if (j !== i) { PM.zone = L[j]; PM.msg = ''; SFX.latch(); pmRenderMapSide(); }
    } else if (dy) {
      const L = pmPageZones(), i = L.indexOf(PM.zone), j = clamp(i - dy, 0, L.length - 1);
      if (i >= 0 && j !== i) { PM.zone = L[j]; SFX.paper(); pmRender(); }
    } else if (dx) {
      const ids = [null, ...PM_PINS.map(p => p[0])], i = ids.indexOf(PM.pin);
      PM.pin = ids[(i + dx + ids.length) % ids.length]; SFX.latch(); pmRenderMapSide();
    }
  },
  ok() { if (PM.mapMode === 'tower') pmZoomIn(); else { PM.mapMode = 'tower'; SFX.paper(); pmRender(); } },
  alt() { this.ok(); },
};
addEventListener('resize', () => { if (UI.modal === 'pmenu' && PM.tab === 'map') pmRender(); });
