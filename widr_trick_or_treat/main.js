'use strict';
/* ---------- sound ---------- */
let AC = null, muted = false;
function sfx(type, f) {
  if (muted) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const T = {coin: [880, 1320, .1, 'square'], good: [520, 780, .14, 'triangle'], bad: [220, 140, .2, 'sawtooth'], win: [523, 1046, .35, 'triangle'],
      lose: [300, 110, .4, 'sawtooth'], tick: [f || 600, f || 600, .06, 'square'], knock: [170, 110, .07, 'square'], scare: [90, 700, .35, 'sawtooth'],
      news: [660, 990, .18, 'triangle'], power: [300, 1200, .3, 'sine']}[type] || [440, 440, .1, 'sine'];
    const o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime;
    o.type = T[3]; o.frequency.setValueAtTime(T[0], t); o.frequency.exponentialRampToValueAtTime(T[1], t + T[2]);
    g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + T[2] + 0.05);
    o.connect(g).connect(AC.destination); o.start(t); o.stop(t + T[2] + 0.06);
  } catch (e) {}
}

/* ---------- toasts, HUD ---------- */
function toast(msg, cls = '', ch = null, ms = 4500) {
  const box = document.getElementById('toasts');
  const t = el('div', 'toast ' + cls);
  if (ch) t.appendChild(avatar(ch, 68));
  t.appendChild(el('div', '', msg));
  box.prepend(t);
  while (box.children.length > 5) box.lastChild.remove();
  setTimeout(() => t.remove(), ms);
}
function news(ch, msg) { sfx('news'); toast(msg, 'news', ch, 7500); }
function floatText(txt) { if (S) S.floats.push({x: P.x, y: P.y - 34, txt, t: performance.now()}); }
function ach(id) {
  if (!S || S.ach.includes(id)) return;
  S.ach.push(id);
  const isNew = !SAVE.ach[id]; SAVE.ach[id] = 1; persist();
  toast(`🏅 ${isNew ? 'NEW ' : ''}Achievement: <b>${ACH[id][0]}</b>`, 'news');
}
const fmtClock = m => { const t = 18 * 60 + Math.floor(m); return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };
function updHUD() {
  if (!S) return;
  document.getElementById('clock').textContent = fmtClock(Math.min(S.min, 180));
  document.getElementById('nightFill').style.width = Math.min(100, S.min / 1.8) + '%';
  const sf = document.getElementById('scareFill'); sf.style.width = S.scare + '%'; sf.classList.toggle('hot', S.scare > 65);
  const bt = document.getElementById('bagTxt'); bt.textContent = `🎒 ${bagCount()}/${S.cap}`; bt.classList.toggle('full', bagCount() >= S.cap);
  document.getElementById('stashTxt').textContent = `🏠 ${countOf(S.stash)}`;
  document.getElementById('bagMix').innerHTML = Object.keys(CANDY).filter(k => S.bag[k]).map(k => `${CANDY[k].e}${S.bag[k]}`).join(' ') || '<span style="opacity:.5">empty bag</span>';
  document.getElementById('ptsTxt').textContent = points(S.bag) + points(S.stash);
  document.getElementById('hudName').innerHTML = `${hero.name} ${S.costume.e}${S.shield ? ` <span title="shield">🛡️${S.shield}</span>` : ''}${S.robinPower ? ' 💪' : ''}`;
  const ab = document.getElementById('abBtn');
  ab.textContent = `${hero.ab.icon} ${hero.ab.name} · ${S.charges}`;
  ab.disabled = S.charges <= 0;
  ab.title = hero.ab.desc + ' (Q)';
}
function renderItems() {
  const box = document.getElementById('items'); box.innerHTML = '';
  for (let i = 0; i < 4; i++) {
    const id = S.items[i];
    const s = el('div', 'slot' + (id ? '' : ' empty'), id ? `${ITEMS[id].e}<small>${i + 1}</small>` : '');
    if (id) { s.title = `${ITEMS[id].n}: ${ITEMS[id].d}`; s.onclick = () => useItem(i); }
    box.appendChild(s);
  }
}

/* ---------- canvas ---------- */
const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
let dpr = 1, cam = {x: 0, y: 0, z: 1};
function resize() {
  const st_ = document.getElementById('stage');
  dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = st_.clientWidth * dpr; cv.height = st_.clientHeight * dpr;
  if (window.R3D && R3D.ready) R3D.resize();
}
window.addEventListener('resize', resize);

function solid(x, y) {
  if (x < 12 || y < 12 || x > W - 12 || y > H - 12) return true;
  return inHouse(x, y, 11);
}
function speed() {
  let s = 140 + st(0) * 22; const now = performance.now();
  if (now < S.boostUntil) s *= 1.55;
  if (S.robinPower) s *= 1.3;
  if (S.stormUntil > S.min && !['deniz', 'fionn'].includes(hero.id)) s *= hero.id === 'milo' ? 1.2 : 0.75;
  return s;
}
function nearHouse() {
  let best = null, bd = 40;
  for (const h of S.houses) { const d = Math.hypot(P.x - h.stand.x, P.y - h.stand.y); if (d < bd && !h.gone && (!h.done || h.kind === 'home')) { bd = d; best = h; } }
  return best;
}
const nearUfo = () => S.ufo && Math.hypot(P.x - S.ufo.x, P.y - S.ufo.y) < 60;
function interact() {
  if (!S || S.busy || S.modal || S.over) return;
  if (nearUfo()) return runBusy(ufoEncounter);
  const h = nearHouse(); if (h) knock(h);
}
function houseName(h) {
  if (h.kind === 'home') return 'your house 🏠';
  if (h.kind === 'haunted') return 'the HAUNTED HOUSE 👻';
  if (h.kind === 'res') return `${h.res.name}’s house`;
  return `${h.host.name}’s house`;
}

/* ---------- update ---------- */
let stuckT = 0;
function update(dt) {
  const now = performance.now();
  S.min += dt * 0.55;
  S.evAt.forEach((at, i) => { if (!S.evDone[i] && S.min >= at) { S.evDone[i] = true; NIGHT_EVENTS[i].fn(); } });
  if (S.min >= 180) { endNight('time'); return; }
  chaosTick(); whisperTick(dt);
  if (S.over) return;

  // fright drifts down, unless it’s dark
  if (S.darkUntil > S.min || S.blackUntil > S.min) { if (!S.items.includes('flash') && !S.robinPower) S.scare = Math.min(99, S.scare + dt * 0.5 * (1.35 - st(1) * 0.1)); }
  else S.scare = Math.max(0, S.scare - dt * 0.5);
  if (S.darkUntil > 0 && S.darkUntil <= S.min && !S.darkDone) { S.darkDone = true; ach('dark'); toast('💡 The lights flicker back on. Zennith is gone.', 'good'); }

  // movement
  let mx = 0, my = 0;
  if (keys.has('arrowleft') || keys.has('a')) mx--;
  if (keys.has('arrowright') || keys.has('d')) mx++;
  if (keys.has('arrowup') || keys.has('w')) my--;
  if (keys.has('arrowdown') || keys.has('s')) my++;
  if (mx || my) P.target = null;
  else if (P.target) {
    const dx = P.target.x - P.x, dy = P.target.y - P.y, d = Math.hypot(dx, dy);
    if (d < 6) { const th = P.targetHouse, tu = P.targetUfo; P.target = null; P.targetHouse = null; P.targetUfo = false; if (th) knock(th); else if (tu && nearUfo()) runBusy(ufoEncounter); }
    else { mx = dx / d; my = dy / d; }
  }
  if (now < S.scrambleUntil) { mx = -mx; my = -my; }
  const len = Math.hypot(mx, my);
  if (len) {
    mx /= len; my /= len; const sp = speed() * dt;
    const ox = P.x, oy = P.y;
    if (!solid(P.x + mx * sp, P.y)) P.x += mx * sp;
    if (!solid(P.x, P.y + my * sp)) P.y += my * sp;
    if (mx) P.face = mx < 0 ? -1 : 1;
    P.walk += dt * 10;
    if (P.target && Math.hypot(P.x - ox, P.y - oy) < 0.3) { stuckT += dt; if (stuckT > 0.4) { P.target = null; P.targetHouse = null; stuckT = 0; } } else stuckT = 0;
  }

  // street candy
  if (Math.random() < dt / 9 && S.pickups.length < 22) { const p = roadPoint(); S.pickups.push({x: p.x, y: p.y, t: pickType('std')}); }
  const magnet = now < S.magnetUntil, byte = now < S.byteUntil;
  if (byte && S.byte) {
    let tgt = null, bd = 260;
    for (const p of S.pickups) { const d = Math.hypot(p.x - S.byte.x, p.y - S.byte.y); if (d < bd) { bd = d; tgt = p; } }
    const tx = tgt ? tgt.x : P.x - 34, ty = tgt ? tgt.y : P.y + 6, d = Math.hypot(tx - S.byte.x, ty - S.byte.y) || 1;
    if (d > 4) { S.byte.x += (tx - S.byte.x) / d * 230 * dt; S.byte.y += (ty - S.byte.y) / d * 230 * dt; }
  }
  for (const p of S.pickups) {
    const d = Math.hypot(p.x - P.x, p.y - P.y);
    if (magnet && d < 240) { p.x += (P.x - p.x) / d * 300 * dt; p.y += (P.y - p.y) / d * 300 * dt; }
    const bdist = byte && S.byte ? Math.hypot(p.x - S.byte.x, p.y - S.byte.y) : 1e9;
    if ((d < 22 || bdist < 20) && bagCount() < S.cap) { if (addPieces(p.t, 1)) { p.dead = true; S.got++; sfx('tick', 900); updHUD(); } }
  }
  S.pickups = S.pickups.filter(p => !p.dead);

  // friends
  for (const f of S.friends) {
    const dx = f.tx - f.x, dy = f.ty - f.y, d = Math.hypot(dx, dy);
    if (d < 4) nextNode(f); else { f.x += dx / d * 55 * dt; f.y += dy / d * 55 * dt; }
    if (!f.met && Math.hypot(f.x - P.x, f.y - P.y) < 30 && !S.busy) { f.met = true; S.met++; runBusy(() => ENCOUNTERS[f.ch.id](f.ch)); return; }
  }

  // pests
  let heart = 1e9;
  for (const h of S.hazards) {
    if (h.type === 'house' && (S.min > h.until || h.returning)) {
      // living houses walk back to their plot, but only settle when you're out of the way
      h.returning = true;
      const dx = h.ox - h.x, dy = h.oy - h.y, d = Math.hypot(dx, dy);
      if (d < 6 && Math.hypot(P.x - h.ox, P.y - h.oy) > 150) { h.dead = true; h.house.gone = false; continue; }
      if (d >= 6) { h.x += dx / d * 140 * dt; h.y += dy / d * 140 * dt; }
      continue;
    }
    if (S.min > h.until) {
      h.dead = true;
      if (h.type === 'fox' && h.loot) toast(`🦊 Anker Vos runs off laughing with ${h.loot} of your candies. HAHAHA.`, 'bad', ANKER);
      continue;
    }
    const rad = h.rad || 26, pd = Math.hypot(P.x - h.x, P.y - h.y);
    if (h.type === 'house') heart = Math.min(heart, pd);
    if (h.type === 'pumpkin') {
      if (now >= h.frozen) { h.x += h.vx * dt; h.y += h.vy * dt; }
      if (h.x < -80 || h.x > W + 80 || h.y < -80 || h.y > H + 80) h.dead = true;
      else if (pd < rad && !S.busy) contact(h);
      continue;
    }
    if (now < h.frozen || now < h.stun || h.sp === 0) { if (h.type === 'reshman' && pd < 28 && !S.busy) contact(h); continue; }
    const dx = P.x - h.x, dy = P.y - h.y, d = Math.hypot(dx, dy) || 1;
    let vx = dx / d, vy = dy / d;
    if (now < h.flee) { vx = -vx; vy = -vy; }
    if (h.type === 'meta') { vx += Math.sin(now / 380) * 0.5; vy += Math.cos(now / 450) * 0.5; }
    if (h.type === 'bats') { vx += Math.sin(now / 160 + h.x) * 1.1; vy += Math.cos(now / 190 + h.y) * 1.1; }
    if (h.type === 'house') { vx += Math.sin(now / 700) * 0.25; }
    h.x = clamp(h.x + vx * h.sp * dt, 20, W - 20); h.y = clamp(h.y + vy * h.sp * dt, 20, H - 20);
    if (d < rad && now >= h.flee && !S.busy) contact(h);
  }
  S.hazards = S.hazards.filter(h => !h.dead);
  S.heart = heart;
  if (heart < 320) { S.beatT = (S.beatT || 0) - dt; if (S.beatT <= 0) { S.beatT = 0.25 + heart / 500; sfx('knock'); } }

  // prompt
  const pr = document.getElementById('prompt'), h = nearHouse();
  if (nearUfo()) { pr.textContent = '👽 E · Approach the UFO'; pr.classList.add('show'); }
  else if (h) { pr.textContent = h.kind === 'dark' ? `🌑 ${houseName(h)} · lights off` : h.kind === 'home' ? '🏠 E · Go inside (stash candy)' : `🚪 E · Knock at ${houseName(h)}`; pr.classList.add('show'); }
  else pr.classList.remove('show');

  if ((S.hudT = (S.hudT || 0) + dt) > 0.25) { S.hudT = 0; updHUD(); }
}

/* ---------- render ---------- */
function rr(g, x, y, w, h, r) { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); }
function drawHouse(g, h, reveal) {
  g.fillStyle = 'rgba(29,26,47,.14)'; rr(g, h.x + 6, h.y + 8, h.w, h.h, 10); g.fill();
  g.fillStyle = h.color; g.lineWidth = 3; g.strokeStyle = INK; rr(g, h.x, h.y, h.w, h.h, 10); g.fill(); g.stroke();
  g.fillStyle = h.roof; rr(g, h.x + 9, h.y + 9, h.w - 18, h.h - 18, 6); g.fill();
  g.globalAlpha = 0.25; g.strokeStyle = '#fff'; g.lineWidth = 2;
  for (let i = 1; i < 5; i++) { g.beginPath(); g.moveTo(h.x + 9, h.y + 9 + i * (h.h - 18) / 5); g.lineTo(h.x + h.w - 9, h.y + 9 + i * (h.h - 18) / 5); g.stroke(); }
  g.globalAlpha = 1;
  // door
  const dy = h.dir === 'bottom' ? h.y + h.h - 6 : h.y - 2;
  g.fillStyle = h.done && h.kind !== 'home' ? '#bdb5a8' : '#7a4a24'; g.lineWidth = 2.5; g.strokeStyle = INK;
  rr(g, h.cx - 12, dy, 24, 8, 3); g.fill(); g.stroke();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const avail = !h.done && h.kind !== 'dark';
  if (avail && h.kind !== 'home') {
    const pg = g.createRadialGradient(h.door.x, h.door.y, 2, h.door.x, h.door.y, 46);
    pg.addColorStop(0, 'rgba(255,214,90,.55)'); pg.addColorStop(1, 'rgba(255,214,90,0)');
    g.fillStyle = pg; g.fillRect(h.door.x - 46, h.door.y - 46, 92, 92);
    g.font = '16px serif'; g.fillText('🎃', h.cx + 26, h.door.y + (h.dir === 'bottom' ? 10 : -10));
  }
  // roof sign
  let sign = null;
  if (h.kind === 'home') sign = '🏠';
  else if (h.kind === 'haunted') sign = '👻';
  else if (h.kind === 'dark') sign = '🌑';
  else if (h.done) sign = '✔️';
  else if (h.rumor) sign = '🌟';
  else if (h.kind === 'res') sign = h.res.icon;
  else if (reveal) sign = h.mimic ? '👹' : DOOR_EVENTS[h.event].icon;
  else sign = '❔';
  g.font = (h.kind === 'home' || h.kind === 'haunted' ? 34 : 26) + 'px serif';
  g.globalAlpha = h.done && h.kind !== 'home' ? 0.6 : 1;
  g.fillText(sign, h.cx, h.y + h.h / 2);
  g.globalAlpha = 1;
  // name tag for special houses
  if ((h.kind === 'res' || h.kind === 'haunted' || h.kind === 'home') && !(h.done && h.kind !== 'home')) {
    const label = h.kind === 'res' ? h.res.name : h.kind === 'home' ? 'HOME' : 'HAUNTED';
    g.font = 'bold 11px ' + 'Menlo, monospace';
    const w = g.measureText(label).width + 12, ty = h.dir === 'bottom' ? h.y - 8 : h.y + h.h + 8;
    g.fillStyle = '#fff'; g.strokeStyle = INK; g.lineWidth = 2; rr(g, h.cx - w / 2, ty - 8, w, 16, 8); g.fill(); g.stroke();
    g.fillStyle = INK; g.fillText(label, h.cx, ty + 0.5);
  }
}
function tag(g, x, y, txt) {
  g.font = 'bold 10px Menlo, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const w = g.measureText(txt).width + 10;
  g.fillStyle = 'rgba(255,255,255,.9)'; rr(g, x - w / 2, y - 7, w, 14, 7); g.fill();
  g.fillStyle = INK; g.fillText(txt, x, y + 0.5);
}

function render() {
  if (window.R3D && R3D.ready) return R3D.render();
  const cw = cv.width / dpr, chh = cv.height / dpr, now = performance.now(), t = now / 1000;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#d9cfa8'; ctx.fillRect(0, 0, cw, chh);
  if (!S) return;
  const z = clamp(Math.min(cw / 980, chh / 680), 0.5, 1.3);
  const vw = cw / z, vh = chh / z;
  cam.x = vw >= W ? (W - vw) / 2 : clamp(P.x - vw / 2, 0, W - vw);
  cam.y = vh >= H ? (H - vh) / 2 : clamp(P.y - vh / 2, 0, H - vh);
  cam.z = z;
  ctx.save(); ctx.scale(z, z); ctx.translate(-cam.x, -cam.y);
  // lawns
  ctx.fillStyle = '#e4ebc6'; ctx.fillRect(0, 0, W, H);
  // sidewalks + roads
  ctx.fillStyle = '#f1e8d6';
  HY.forEach(y => ctx.fillRect(0, y - 50, W, 100)); VX.forEach(x => ctx.fillRect(x - 50, 0, 100, H));
  ctx.fillStyle = '#d3cabd';
  HY.forEach(y => ctx.fillRect(0, y - 40, W, 80)); VX.forEach(x => ctx.fillRect(x - 40, 0, 80, H));
  ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3; ctx.setLineDash([18, 16]);
  HY.forEach(y => { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); });
  VX.forEach(x => { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); });
  ctx.setLineDash([]);
  // trees
  for (const tr of S.trees) { circ(ctx, tr.x + 3, tr.y + 4, tr.r, 'rgba(29,26,47,.12)', null); circ(ctx, tr.x, tr.y, tr.r, tr.c, INK, 2.5); circ(ctx, tr.x - tr.r * 0.3, tr.y - tr.r * 0.3, tr.r * 0.35, 'rgba(255,255,255,.25)', null); }
  // lamps
  VX.forEach(x => HY.forEach(y => { circ(ctx, x + 46, y - 46, 5, '#ffd23f'); const lg = ctx.createRadialGradient(x + 46, y - 46, 2, x + 46, y - 46, 60); lg.addColorStop(0, 'rgba(255,220,120,.35)'); lg.addColorStop(1, 'rgba(255,220,120,0)'); ctx.fillStyle = lg; ctx.fillRect(x - 14, y - 106, 120, 120); }));
  // houses
  const reveal = now < S.revealUntil;
  for (const h of S.houses) if (!h.gone) drawHouse(ctx, h, reveal || (hero.id === 'josh' && Math.hypot(h.cx - P.x, h.door.y - P.y) < 240));
  // ufo
  if (S.ufo) {
    const u = S.ufo, b = Math.sin(t * 2) * 4;
    const bg = ctx.createRadialGradient(u.x, u.y + 20, 5, u.x, u.y + 20, 70); bg.addColorStop(0, 'rgba(127,255,127,.45)'); bg.addColorStop(1, 'rgba(127,255,127,0)');
    ctx.fillStyle = bg; ctx.fillRect(u.x - 70, u.y - 50, 140, 140);
    ell(ctx, u.x, u.y + b, 42, 13, '#c9d6e0'); ell(ctx, u.x, u.y - 8 + b, 18, 13, '#7fff7f');
    for (let i = 0; i < 5; i++) circ(ctx, u.x - 30 + i * 15, u.y + 3 + b, 3, (Math.floor(t * 4) + i) % 2 ? '#ffd23f' : '#ff3b5c', null);
    tag(ctx, u.x, u.y - 34, 'TOON’S UFO');
  }
  // street candy
  ctx.font = '17px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const p of S.pickups) ctx.fillText(CANDY[p.t].e, p.x, p.y + Math.sin(t * 3 + p.x) * 2);
  // characters, depth sorted
  const actors = [];
  S.friends.forEach(f => actors.push({y: f.y, d: () => { drawChar(ctx, f.x, f.y, f.ch, {t, icon: true}); if (!f.met) tag(ctx, f.x, f.y + 28, f.ch.name); else tag(ctx, f.x, f.y + 28, '✓ ' + f.ch.name); }}));
  S.hazards.forEach(h => actors.push({y: h.y, d: () => {
    const fr = now < h.frozen;
    drawChar(ctx, h.x, h.y, h.ch, {t, s: h.type === 'house' ? 3.2 : h.type === 'zennith' ? 1.35 : h.type === 'pumpkin' ? 1.6 : 1.1, alpha: h.type === 'reshman' ? 0.7 + Math.sin(t * 4) * 0.2 : 1});
    if (fr) { ctx.fillStyle = 'rgba(127,216,255,.45)'; rr(ctx, h.x - 18, h.y - 30, 36, 50, 8); ctx.fill(); }
    tag(ctx, h.x, h.y + 30, h.ch.name + (h.loot ? ` 🍬${h.loot}` : ''));
  }}));
  if (now < S.byteUntil && S.byte) actors.push({y: S.byte.y, d: () => drawChar(ctx, S.byte.x, S.byte.y, BYTE, {t, s: 0.8})});
  actors.push({y: P.y, d: () => {
    const ghost = now < S.ghostUntil;
    if (S.shield) { ctx.strokeStyle = 'rgba(60,141,255,.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(P.x, P.y - 2, 26, 0, Math.PI * 2); ctx.stroke(); }
    if (S.robinPower) { ctx.strokeStyle = 'rgba(255,194,31,.8)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(P.x, P.y - 2, 30 + Math.sin(t * 8) * 3, 0, Math.PI * 2); ctx.stroke(); }
    drawChar(ctx, P.x, P.y - Math.abs(Math.sin(P.walk)) * 2.5, hero, {t, s: S.robinPower ? 1.35 : 1.15, costume: S.costume.e, alpha: ghost ? 0.45 : 1});
    tag(ctx, P.x, P.y + 32, 'YOU');
  }});
  actors.sort((a, b) => a.y - b.y).forEach(a => a.d());
  // blast ring
  if (S.blastFx && now - S.blastFx.t < 500) {
    const k = (now - S.blastFx.t) / 500;
    ctx.strokeStyle = `rgba(255,122,31,${1 - k})`; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(S.blastFx.x, S.blastFx.y, S.blastFx.r * k, 0, Math.PI * 2); ctx.stroke();
  }
  // floating text
  S.floats = S.floats.filter(f => now - f.t < 1200);
  for (const f of S.floats) { const k = (now - f.t) / 1200; ctx.globalAlpha = 1 - k; ctx.font = 'bold 18px Futura, sans-serif'; ctx.fillStyle = '#ff7a1f'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.strokeText(f.txt, f.x, f.y - k * 40); ctx.fillText(f.txt, f.x, f.y - k * 40); }
  ctx.globalAlpha = 1;
  ctx.restore();

  // dusk tint deepens over the night
  ctx.fillStyle = `rgba(120,80,200,${0.02 + 0.16 * Math.min(1, S.min / 180)})`; ctx.fillRect(0, 0, cw, chh);
  const px = (P.x - cam.x) * z, py = (P.y - cam.y) * z;
  // storm
  if (S.stormUntil > S.min) {
    ctx.strokeStyle = 'rgba(60,90,160,.35)'; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let i = 0; i < 90; i++) { const rx = (i * 137 + t * 600) % cw, ry = (i * 251 + t * 900) % chh; ctx.moveTo(rx, ry); ctx.lineTo(rx - 6, ry + 16); }
    ctx.stroke();
    if (Math.sin(t * 1.7) > 0.985) { ctx.fillStyle = 'rgba(255,255,230,.5)'; ctx.fillRect(0, 0, cw, chh); }
  }
  // Zennith darkness
  if (S.darkUntil > S.min || S.blackUntil > S.min) {
    const r = (S.items.includes('flash') ? 230 : 150) * z;
    const dg = ctx.createRadialGradient(px, py, r * 0.4, px, py, r * 1.6);
    dg.addColorStop(0, 'rgba(26,16,48,0)'); dg.addColorStop(1, 'rgba(26,16,48,.86)');
    ctx.fillStyle = dg; ctx.fillRect(0, 0, cw, chh);
  }
  // fright flash
  if (S.flash && now - S.flash < 260) { ctx.fillStyle = `rgba(255,59,92,${0.3 * (1 - (now - S.flash) / 260)})`; ctx.fillRect(0, 0, cw, chh); }
  if (now < S.scrambleUntil) { ctx.fillStyle = 'rgba(8,102,255,.08)'; ctx.fillRect(0, 0, cw, chh); }
}

/* ---------- loop + input ---------- */
let last = performance.now();
function frame(t) {
  const dt = Math.min(0.05, (t - last) / 1000); last = t;
  if (S && !S.over && !S.modal && !S.busy && document.getElementById('game').classList.contains('show')) update(dt);
  if (document.getElementById('game').classList.contains('show')) render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (keyHook) { keyHook(e); return; }
  const k = e.key.toLowerCase();
  if (k === 'm') { muted = !muted; toast(muted ? '🔇 Sound off' : '🔊 Sound on', ''); return; }
  if (!S || S.over || !document.getElementById('game').classList.contains('show')) return;
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  keys.add(k);
  if (k === 'e' || k === 'enter' || k === ' ') interact();
  if (k === 'q') useAbility();
  if (['1', '2', '3', '4'].includes(k)) useItem(+k - 1);
});
window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => keys.clear());
cv.addEventListener('pointerdown', e => {
  const r = cv.getBoundingClientRect();
  worldClick(cam.x + (e.clientX - r.left) / cam.z, cam.y + (e.clientY - r.top) / cam.z);
});
function worldClick(wx, wy, hitHouse, hitUfo) {
  if (!S || S.over || S.modal || S.busy) return;
  P.targetHouse = null; P.targetUfo = false;
  if (S.ufo && (hitUfo || Math.hypot(wx - S.ufo.x, wy - S.ufo.y) < 60)) { P.target = {x: S.ufo.x, y: S.ufo.y + 30}; P.targetUfo = true; return; }
  const h = (hitHouse && !hitHouse.gone ? hitHouse : null) || S.houses.find(h => !h.gone && wx > h.x - 6 && wx < h.x + h.w + 6 && wy > h.y - 6 && wy < h.y + h.h + 6);
  if (h) { P.target = {x: h.stand.x, y: h.stand.y}; if (!h.done || h.kind === 'home') P.targetHouse = h; return; }
  P.target = {x: wx, y: wy};
}
document.getElementById('prompt').onclick = interact;
document.getElementById('abBtn').onclick = useAbility;

/* ---------- start / end ---------- */
let selHero = HEROES[0], selCostume = COSTUMES[0];
function show(id) { document.querySelectorAll('.screen').forEach(s => s.classList.toggle('show', s.id === id)); }

function startNight() {
  hero = selHero;
  S = {min: 0, bag: {}, stash: {}, cap: 60 + (hero.id === 'lars' ? 30 : 0), scare: 0, karma: 0, shield: hero.id === 'adam' ? 1 : 0,
    items: [], charges: hero.ab.n, bonus: [0, 0, 0, 0, 0], costume: selCostume, hazards: [], pickups: [], friends: [], floats: [], ach: [],
    stats: {won: 0, lost: 0}, got: 0, met: 0, boostUntil: 0, ghostUntil: 0, revealUntil: 0, magnetUntil: 0, scrambleUntil: 0, byteUntil: 0,
    stormUntil: -1, rushUntil: -1, darkUntil: -1, blackUntil: -1, fogUntil: -1, shakeUntil: 0, nextChaos: rnd(7, 13), pity: false, ufo: null, busy: false, modal: false, over: false,
    evAt: NIGHT_EVENTS.map(e => rnd(e.at[0], e.at[1])), evDone: []};
  buildMap();
  P = {x: S.home.stand.x, y: S.home.stand.y, target: null, walk: 0, face: 1};
  for (let i = 0; i < 18; i++) { const p = roadPoint(); S.pickups.push({x: p.x, y: p.y, t: pickType('std')}); }
  spawnFriends();
  if (hero.id === 'niek') S.items.push('flash');
  if (hero.id === 'casper') S.items.push('skates');
  if (hero.id === 'renas') S.items.push(pick(['skates', 'magnet', 'snack', 'map']));
  document.getElementById('toasts').innerHTML = '';
  show('game'); resize();
  if (window.R3D && R3D.ready) R3D.build();
  const hav = document.getElementById('hudAv'); hav.getContext('2d').clearRect(0, 0, 96, 96); hav.getContext('2d').drawImage(avatar(hero, 96, null, S.costume.e), 0, 0);
  updHUD(); renderItems();
  news(RESIDENTS.find(r => r.id === 'ati'), `18:00. Bag on your shoulder, ${S.costume.n.toLowerCase()} costume on. Knock on doors, meet friends, beat challenges, and be home by 21:00.`);
}

function endNight(reason) {
  if (!S || S.over) return;
  S.over = true; closeMeta(false);
  document.getElementById('prompt').classList.remove('show');
  setTimeout(() => { if (S.modal) modalClose(); showEnd(reason); }, 500);
}
function showEnd(reason) {
  const atHome = reason === 'home' || Math.hypot(P.x - S.home.stand.x, P.y - S.home.stand.y) < 90;
  const bag = Object.assign({}, S.bag); let note = '', title = 'The night is over';
  if (reason === 'faint') {
    for (const k in bag) bag[k] = Math.floor(bag[k] * 0.7);
    note = '😵 You fainted from fright. Robin carried you home, crying the whole way, and dropped 30% of your bag.'; title = 'Too spooky!'; ach('faint');
  } else if (!atHome) {
    for (const k in bag) bag[k] = Math.floor(bag[k] * 0.75);
    note = '🩴 You weren’t home by 21:00. Ati was waiting at the door and took 25% of your bag.'; title = 'Late again!';
  } else {
    if (S.min >= 165) { ach('home'); note = '🏠 Home on time. Ati nods approvingly. Barely.'; } else note = '🏠 You called it a night early. Smart and safe.';
    title = 'Home safe!';
  }
  const final = Object.assign({}, S.stash);
  for (const k in bag) final[k] = (final[k] || 0) + bag[k];
  const pts = points(final), visited = S.houses.filter(h => h.done && h.kind !== 'home').length;
  if (pts >= 250) ach('baron');
  if (visited >= 20) ach('street');
  if (S.karma >= 5) ach('kind');
  const prevBest = SAVE.best[hero.id] || 0; SAVE.best[hero.id] = Math.max(prevBest, pts); persist();
  const rank = pts < 40 ? 'Porch Rookie' : pts < 100 ? 'Doorbell Ringer' : pts < 170 ? 'Sugar Scout' : pts < 250 ? 'Candy Baron' : pts < 360 ? 'Hundredaire of Halloween' : 'WIDR 64 Legend';
  const card = document.getElementById('endCard'); card.innerHTML = '';
  const top = el('div', 'end-top'); top.appendChild(avatar(hero, 180, '#fff', S.costume.e));
  top.appendChild(el('div', '', `<div style="font-family:var(--mono);font-size:11px;letter-spacing:.16em">${fmtClock(Math.min(180, S.min))} · ${hero.name.toUpperCase()} THE ${S.costume.n.toUpperCase()}</div><h2>${title}</h2><div class="rank">${rank}</div>`));
  card.appendChild(top);
  const body = el('div', 'end-body');
  const rows = Object.keys(CANDY).filter(k => final[k]).map(k => `<div><span>${CANDY[k].e} ${CANDY[k].n}</span><b>${final[k]} × ${CANDY[k].pts}</b></div>`).join('') || '<div><span>Nothing. Not even raisins.</span></div>';
  body.appendChild(el('div', '', `<h4>FINAL HAUL</h4><div class="score">${pts}</div><div style="font-family:var(--mono);font-size:11px;margin:2px 0 10px">${pts > prevBest ? '★ NEW BEST FOR ' + hero.name.toUpperCase() : 'BEST AS ' + hero.name.toUpperCase() + ': ' + prevBest}</div><div class="rows">${rows}</div><p style="font-size:13px;line-height:1.4">${note}</p>`));
  const achHtml = S.ach.length ? S.ach.map(id => `<div>🏅 <b>${ACH[id][0]}</b> · ${ACH[id][1]}</div>`).join('') : '<div style="background:#fff">No achievements this night. Next time!</div>';
  body.appendChild(el('div', '', `<h4>THE NIGHT IN NUMBERS</h4><div class="rows">
    <div><span>Houses visited</span><b>${visited} / ${S.houses.length - 1}</b></div>
    <div><span>Challenges won / lost</span><b>${S.stats.won} / ${S.stats.lost}</b></div>
    <div><span>Friends met</span><b>${S.met} / ${S.friends.length}</b></div>
    <div><span>Kindness</span><b>${S.karma}</b></div>
    <div><span>Peak fright</span><b>${Math.round(S.peak || 0)}%</b></div></div>
    <h4 style="margin-top:14px">ACHIEVEMENTS TONIGHT</h4><div class="newach">${achHtml}</div>`));
  card.appendChild(body);
  const btns = el('div', 'end-btns');
  const again = el('button', 'btn primary', `▶ Another night as ${hero.name}`); again.onclick = startNight;
  const other = el('button', 'btn', '👥 Pick another character'); other.onclick = () => { buildTitle(); show('title'); };
  btns.append(again, other); card.appendChild(btns);
  show('end'); sfx('win');
}

/* ---------- title screen ---------- */
function buildTitle() {
  const grid = document.getElementById('heroGrid'); grid.innerHTML = '';
  HEROES.forEach(h => {
    const c = el('div', 'hcard' + (h === selHero ? ' sel' : ''));
    c.appendChild(avatar(h, 144));
    c.appendChild(el('b', '', h.name)); c.appendChild(el('small', '', h.title));
    if (SAVE.best[h.id]) c.appendChild(el('span', 'best', '★' + SAVE.best[h.id]));
    c.onclick = () => { selHero = h; buildTitle(); };
    grid.appendChild(c);
  });
  const hc = document.getElementById('heroCard'); hc.innerHTML = '';
  const top = el('div', 'top'); top.appendChild(avatar(selHero, 168, selHero.color + '33', selCostume.e));
  top.appendChild(el('div', '', `<h3>${selHero.name}</h3><div class="t">${selHero.title.toUpperCase()}</div>`));
  hc.appendChild(top);
  hc.appendChild(el('p', '', selHero.desc));
  const labels = ['SPEED', 'COURAGE', 'CHARM', 'BRAINS', 'LUCK'];
  hc.appendChild(el('div', 'stats', labels.map((l, i) => `<span>${l}</span><div class="bar">${[1, 2, 3, 4, 5, 6].map(n => `<i class="${n <= selHero.stats[i] + (selCostume.s === i ? 1 : 0) ? 'on' : ''}"></i>`).join('')}</div>`).join('')));
  hc.appendChild(el('div', 'abil', `<b>${selHero.ab.icon} ${selHero.ab.name}</b> ×${selHero.ab.n} · ${selHero.ab.desc}<br><b>Perk:</b> ${selHero.passive}`));
  const cs = document.getElementById('costumes'); cs.innerHTML = '';
  COSTUMES.forEach(c => { const b = el('div', 'cos' + (c === selCostume ? ' sel' : ''), `${c.e}<small>${c.d}</small>`); b.title = c.n; b.onclick = () => { selCostume = c; buildTitle(); }; cs.appendChild(b); });
  const shelf = document.getElementById('achShelf');
  shelf.innerHTML = Object.entries(ACH).map(([id, a]) => `<span class="a ${SAVE.ach[id] ? 'got' : ''}" title="${a[1]}">🏅 ${a[0]}</span>`).join('');
  if (window.R3D && R3D.ready) R3D.setPreview(selHero, selCostume);
}
document.getElementById('startBtn').onclick = startNight;
buildTitle();
