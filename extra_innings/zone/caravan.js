'use strict';
/* =========================================================
   THE DUGOUT EXPRESS · the crew's caravan, parked in Base Camp
   A heavily modified stadium team bus by the camp gate: rusted
   steel plates, yellow school-bus panels, off-road tyres, blue
   nitro boosters (twin turbos once Renas has the capacitors),
   pennants and string lights on the roof rack. Renas leans on
   its bumper, Josh's table sits under the awning, Deniz has a
   deck chair on the roof (the layout is in zone/world.js).
   Before Renas joins the crew it's still under a tarp.
   Fast travel itself is Renas's scooter: zone/transit.js.
   ========================================================= */
const CV_LEN = 400, CV_H = 158;
const CV = { room: null, on: false, x: 0, floor: 0, len: CV_LEN, peekT: 7, peek: 0 };
const cvTurbo = () => Save.data.q.rivalry === 'renas';

function cvSync() {
  if (Zone.room === CV.room) return;
  CV.room = Zone.room;
  CV.on = PAGE.id === 'z1' && !!Zone.room && Zone.room.id === 'hub' && typeof CAMP !== 'undefined' && !!CAMP.bus;
  if (CV.on) { CV.x = CAMP.bus.x0 * TILE; CV.floor = CAMP.bus.floor * TILE; CV.len = (CAMP.bus.x1 - CAMP.bus.x0 - 4) * TILE; }
}
const _cvTick = PAGE.tick;
PAGE.tick = function (dt) {
  if (_cvTick) _cvTick.call(this, dt);
  cvSync();
  if (!CV.on || !Save.data.chase) return;
  CV.peekT -= dt; if (CV.peekT <= 0) { CV.peek = 2.6; CV.peekT = rand(9, 16); }
  CV.peek = Math.max(0, CV.peek - dt);
  if (Math.random() < 0.02) spawnParticle({ x: CV.x + CV.len + 6, y: CV.floor - 34, vx: rand(10, 30), vy: rand(-40, -15), life: 1.2, size: rand(3, 6), color: 'rgba(150,140,130,.35)', type: 'dot' });
};

/* ---------- the bus (local coords: front bumper at 0, body runs to +len, floor at 0) ---------- */
function drawExpress(front, floor, side, o) {
  const L = o.len, H = CV_H, t = Game.time, lit = o.lit;
  ctx.save(); ctx.translate(front, floor); ctx.scale(side, 1); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(L / 2, 0, L * 0.56, 8, 0, 0, 7); ctx.fill();
  // the awning off the back (Josh's table sits under it)
  const a0 = L - 4, a1 = L + 124;
  ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(a1 - 4, -104); ctx.lineTo(a1 - 4, 0); ctx.stroke();
  for (let k = 0; k < 6; k++) {
    const x0 = a0 + (a1 - a0) * k / 6, x1 = a0 + (a1 - a0) * (k + 1) / 6;
    ctx.beginPath(); ctx.moveTo(x0, -140 + k * 6); ctx.lineTo(x1, -140 + (k + 1) * 6); ctx.lineTo(x1, -122 + (k + 1) * 6); ctx.quadraticCurveTo((x0 + x1) / 2, -114 + k * 6, x0, -122 + k * 6); ctx.closePath();
    ctx.fillStyle = k % 2 ? BONE : '#b8283c'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
  }
  // nitro boosters welded on the back (twin turbos once Renas has the capacitors)
  const boosters = o.turbo ? [[-126, 13], [-98, 13]] : [[-118, 10]];
  for (const [by, r] of boosters) {
    rr(L - 8, by - r, 34, r * 2, r); inked(o.turbo ? '#8a3a2a' : '#5c6470', 2.5);
    ctx.strokeStyle = INK; ctx.lineWidth = 1.5; for (const rx of [L + 4, L + 14]) { ctx.beginPath(); ctx.moveTo(rx, by - r); ctx.lineTo(rx, by + r); ctx.stroke(); }
    if (lit) {
      const f = 16 + Math.sin(t * 30 + by) * 5 + (o.turbo ? 8 : 0);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(L + 26, 0, L + 26 + f, 0); g.addColorStop(0, 'rgba(160,230,255,.95)'); g.addColorStop(1, 'rgba(111,211,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(L + 26, by - r * 0.7); ctx.lineTo(L + 26 + f, by); ctx.lineTo(L + 26, by + r * 0.7); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }
  ctx.fillStyle = INK; ctx.fillRect(L - 4, -40, 16, 6);                                     // exhaust pipe
  // lower hull: rusted steel plates
  rr(0, -80, L, 50, 6); inked('#4a3e36', 3);
  ctx.strokeStyle = 'rgba(13,11,16,.6)'; ctx.lineWidth = 1.5;
  for (let x = 46; x < L - 10; x += 46) { ctx.beginPath(); ctx.moveTo(x, -78); ctx.lineTo(x, -32); ctx.stroke(); }
  ctx.fillStyle = 'rgba(122,74,42,.55)'; [[60, -70, 26, 12], [190, -52, 34, 10], [L - 110, -72, 22, 14]].forEach(([x, y, w, h]) => { if (x + w < L) { ctx.beginPath(); ctx.ellipse(x, y, w / 2, h / 2, 0.2, 0, 7); ctx.fill(); } });
  ctx.fillStyle = INK; for (let x = 12; x < L - 6; x += 23) { ctx.beginPath(); ctx.arc(x, -74, 1.6, 0, 7); ctx.arc(x, -38, 1.6, 0, 7); ctx.fill(); }
  // upper body: yellow school-bus panels with a black stripe
  ctx.beginPath(); ctx.moveTo(14, -80); ctx.lineTo(6, -126); ctx.quadraticCurveTo(10, -H, 40, -H); ctx.lineTo(L - 10, -H); ctx.quadraticCurveTo(L, -H, L, -H + 10); ctx.lineTo(L, -80); ctx.closePath();
  inked(lit ? '#d9a521' : '#8a7340', 3);
  ctx.fillStyle = INK; ctx.fillRect(10, -90, L - 10, 6);
  ctx.strokeStyle = 'rgba(13,11,16,.35)'; ctx.lineWidth = 1.5;
  for (let x = 130; x < L - 20; x += 62) { ctx.beginPath(); ctx.moveTo(x, -H + 4); ctx.lineTo(x, -92); ctx.stroke(); }   // welded panel seams
  // windscreen, the cats asleep on the dashboard
  ctx.beginPath(); ctx.moveTo(12, -100); ctx.lineTo(9, -128); ctx.quadraticCurveTo(14, -146, 38, -146); ctx.lineTo(62, -146); ctx.lineTo(62, -100); ctx.closePath();
  const wg = ctx.createLinearGradient(0, -146, 0, -100); wg.addColorStop(0, lit ? '#2a4258' : '#1a2028'); wg.addColorStop(1, lit ? '#3a2a30' : '#15161c');
  ctx.fillStyle = wg; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
  if (lit) [[22, '#1a1414'], [48, '#c8781c']].forEach(([cx, c], k) => {
    const br = Math.sin(t * 1.6 + k) * 0.6;
    ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(cx, -104, 9, 5 + br, 0, Math.PI, 0); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx - 8, -105); ctx.lineTo(cx - 6, -111); ctx.lineTo(cx - 3, -106); ctx.moveTo(cx - 4, -106); ctx.lineTo(cx - 2, -111); ctx.lineTo(cx + 1, -106); ctx.fill();
  });
  // the folding side door (open, lit inside) and the passenger windows
  rr(74, -142, 44, 112, 3); ctx.fillStyle = INK; ctx.fill();
  if (lit) {
    const ig = ctx.createLinearGradient(0, -142, 0, -30); ig.addColorStop(0, 'rgba(255,190,110,.55)'); ig.addColorStop(1, 'rgba(255,150,80,.15)');
    ctx.fillStyle = ig; ctx.fillRect(78, -138, 36, 104); ctx.fillStyle = '#6b4a30'; ctx.fillRect(70, -34, 52, 5);
  }
  const pw = lit ? 5 : 22;
  for (const px of [74, 118 - pw]) { rr(px, -142, pw, 112, 2); inked(lit ? '#d9a521' : '#8a7340', 2); if (pw > 10) { rr(px + 4, -136, pw - 8, 40, 2); ctx.fillStyle = '#1c2a3a'; ctx.fill(); } }
  for (let x = 134; x + 44 < L - 26; x += 60) {
    rr(x, -144, 44, 36, 5); ctx.fillStyle = '#1c2a3a'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
    if (lit) { ctx.fillStyle = `rgba(255,190,110,${0.28 + Math.sin(t * 2 + x) * 0.04})`; ctx.fillRect(x + 3, -141, 38, 30); }
  }
  // bumper, grille and headlight
  rr(-8, -50, 18, 20, 3); inked('#8a8f99', 2.5);
  ctx.strokeStyle = INK; ctx.lineWidth = 1.5; for (let y = -76; y < -54; y += 5) { ctx.beginPath(); ctx.moveTo(2, y); ctx.lineTo(12, y); ctx.stroke(); }
  ctx.beginPath(); ctx.arc(6, -62, 6, 0, 7); inked(lit ? '#fff1b8' : '#5a5448', 2);
  if (lit) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const hg = ctx.createLinearGradient(6, 0, -120, 0); hg.addColorStop(0, 'rgba(255,230,150,.32)'); hg.addColorStop(1, 'rgba(255,230,150,0)');
    ctx.fillStyle = hg; ctx.beginPath(); ctx.moveTo(4, -66); ctx.lineTo(-120, -100); ctx.lineTo(-120, -10); ctx.lineTo(4, -58); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // roof rack, team pennants and string lights
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(30, -H - 6); ctx.lineTo(L - 16, -H - 6); ctx.stroke();
  for (let x = 30; x <= L - 16; x += 70) { ctx.beginPath(); ctx.moveTo(x, -H); ctx.lineTo(x, -H - 6); ctx.stroke(); }
  const PEN = ['#b8283c', GOLD, '#2e6fb0', BONE];
  for (let k = 0, x = 38; x < L - 30; x += 22, k++) {
    const sag = Math.sin((x - 30) / (L - 46) * Math.PI) * 6, y = -H - 6 + sag;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 14, y); ctx.lineTo(x + 7, y + 12 + Math.sin(t * 3 + k) * 1.5); ctx.closePath();
    ctx.fillStyle = lit ? PEN[k % 4] : '#5a5248'; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = INK; ctx.stroke();
  }
  for (let k = 0, x = 26; x < L - 8; x += 18, k++) {
    const y = -H + 2 + Math.sin((x - 26) / (L - 34) * Math.PI) * 4;
    if (lit) { const on = 0.6 + 0.4 * Math.sin(t * 4 + k * 1.3); ctx.fillStyle = [`rgba(242,193,78,${on})`, `rgba(255,106,160,${on})`, `rgba(111,211,255,${on})`][k % 3]; }
    else ctx.fillStyle = '#3a3440';
    ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 7); ctx.fill();
  }
  // oversized off-road tyres
  for (const wx of [52, L - 118, L - 62]) {
    ctx.save(); ctx.translate(wx, -24);
    ctx.beginPath(); ctx.arc(0, 0, 24, 0, 7); inked('#151218', 3);
    ctx.strokeStyle = '#2c2630'; ctx.lineWidth = 4; for (let a = 0; a < 8; a++) { ctx.beginPath(); ctx.moveTo(Math.cos(a * 0.785) * 18, Math.sin(a * 0.785) * 18); ctx.lineTo(Math.cos(a * 0.785) * 24, Math.sin(a * 0.785) * 24); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(0, 0, 9, 0, 7); inked('#8a8f99', 2); ctx.fillStyle = INK; ctx.fillRect(-2, -8, 4, 16);
    ctx.restore();
  }
  // Reshman's eyes under the chassis
  if (o.peek > 0) {
    const a = Math.min(1, o.peek * 2, (2.6 - o.peek) * 3), blink = Math.sin(t * 7) > 0.92 ? 0.15 : 1;
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = 'rgba(8,6,12,.85)'; ctx.fillRect(L * 0.38, -30, 60, 28);
    ctx.fillStyle = '#fff'; ctx.shadowColor = '#bff3ff'; ctx.shadowBlur = 8;
    for (const ex of [L * 0.38 + 22, L * 0.38 + 36]) { ctx.beginPath(); ctx.ellipse(ex, -14, 3.5, 4 * blink, 0, 0, 7); ctx.fill(); }
    ctx.restore();
  }
  // still under a tarp (Renas hasn't joined the crew yet)
  if (o.tarp) {
    ctx.beginPath(); ctx.moveTo(-4, -72); ctx.quadraticCurveTo(0, -H - 12, 44, -H - 10); ctx.lineTo(L - 10, -H - 8); ctx.quadraticCurveTo(L + 8, -H + 4, L + 4, -64);
    for (let x = L + 4; x > -4; x -= 40) ctx.quadraticCurveTo(x - 20, -54 + ((x / 40) % 2 ? 6 : -4), x - 40, -66);
    ctx.closePath(); inked('#5a5248', 3);
    ctx.strokeStyle = 'rgba(13,11,16,.35)'; ctx.lineWidth = 2;
    for (let x = 60; x < L; x += 90) { ctx.beginPath(); ctx.moveTo(x, -H - 6); ctx.quadraticCurveTo(x + 10, -110, x - 6, -70); ctx.stroke(); }
  }
  ctx.restore();
  if (o.peek > 0) {
    ctx.save(); ctx.globalAlpha = Math.min(1, o.peek * 2, (2.6 - o.peek) * 3) * 0.8;
    ctx.font = `italic 11px ${SERIF_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = '#bff3ff';
    ctx.fillText('…blorp', front + side * (L * 0.38 + 30), floor + 14); ctx.restore();
  }
}

(function wrapHooks() {
  const H = Game.hooks, back = H.behindTiles;
  H.behindTiles = function (cam) {
    if (back) back.call(H, cam);
    if (!CV.on) return;
    const D = Save.data;
    drawExpress(CV.x, CV.floor, 1, { len: CV.len, lit: !!D.chase, tarp: !D.chase, turbo: cvTurbo(), peek: CV.peek });
  };
})();
