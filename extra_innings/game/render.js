'use strict';
/* =========================================================
   RENDER: ink & cel-shaded white-box look
   ========================================================= */
const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
let DPR = 1, SCALE = 1, VW = 0, VH = VIEW_TILES_H * TILE;
const INK = '#0d0b10', BONE = '#f3ead8', FLAME = '#e8361c', EMBER = '#ff8a2a', GOLD = '#f2c14e';
// Nathan's colours and outfit hooks (zone/outfits.js swaps these; back/head/bat draw extras in his local space)
const NATHAN_LOOK = { shirt: FLAME, stripe: '#ff6a3d', cap: FLAME, sleeve: FLAME, pants: BONE, pants2: '#e7dcc6', skin: BONE, num: BONE, back: null, head: null, bat: null };
const DISPLAY_FONT = 'Impact, Haettenschweiler, "Arial Narrow Bold", "Franklin Gothic Heavy", sans-serif';
const SERIF_FONT = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';

// Performance Mode (localStorage 'ei_perf': 'auto' | 'on' | 'off'): when on, 1× pixels and no canvas shadow blur.
// 'auto' switches it on by itself if the game keeps running under ~45 fps (release.js watches the frame rate).
const PERFMODE = { pref: 'auto', low: false };
try { PERFMODE.pref = localStorage.getItem('ei_perf') || 'auto'; } catch (e) { /* no storage */ }
PERFMODE.low = PERFMODE.pref === 'on';
// shadowBlur is the slowest thing a 2D canvas does: in Performance Mode every glow on the game canvas is dropped
{
  const d = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'shadowBlur');
  if (d && d.set) Object.defineProperty(ctx, 'shadowBlur', { configurable: true, get() { return d.get.call(this); }, set(v) { d.set.call(this, PERFMODE.low ? 0 : v); } });
}
function setPerfLow(on) {
  if (PERFMODE.low === !!on) return;
  PERFMODE.low = !!on;
  resizeCanvas(); dispatchEvent(new Event('resize'));   // re-size the canvas (and drop the baked terrain, which keys on SCALE)
}

function resizeCanvas() {
  // capped at 1.5× (1× in Performance Mode): a 2× Retina screen would push 4× the pixels for little visible gain
  DPR = Math.min(window.devicePixelRatio || 1, PERFMODE.low ? 1 : 1.5);
  cv.width = Math.round(innerWidth * DPR); cv.height = Math.round(innerHeight * DPR);
  SCALE = cv.height / VH;
  VW = cv.width / SCALE;
}
addEventListener('resize', resizeCanvas);
resizeCanvas();

/* ---------- Deterministic background props ---------- */
let seed = 7;
const srand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const FAR = Array.from({ length: 14 }, (_, i) => ({ x: i * 260 + srand() * 120, w: 60 + srand() * 90, h: 380 + srand() * 520, tiers: 3 + (srand() * 4 | 0), lit: srand() }));
const MID = Array.from({ length: 18 }, (_, i) => ({ x: i * 220 + srand() * 80, w: 30 + srand() * 60, h: 160 + srand() * 300, kind: srand() < 0.4 ? 'crane' : 'stack' }));
const AMBIENT = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), s: rand(0.8, 2.4), v: rand(0.02, 0.07), ph: rand(0, 6), d: rand(0.3, 0.9) }));
const tileHash = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0;

/* ---------- Helpers ---------- */
const RCACHE = { k: '' };
// the world rectangle the camera currently shows (zoom included), grown by a margin
function viewRect(m = 0) {
  const c = Game.cam, z = Game.zoom || 1, F = Game.zoomF || { x: VW / 2, y: VH / 2 };
  const x0 = c.x - F.x * (1 - z) / z, y0 = c.y - F.y * (1 - z) / z;
  return { x0: x0 - m, y0: y0 - m, x1: x0 + VW / z + m, y1: y0 + VH / z + m };
}
function rr(x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function inked(fill, lw = 3) { ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke(); }
function starburst(r1, r2, n = 14) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * Math.PI * 2, r = i % 2 ? r2 : r1 * (0.85 + ((i * 37) % 7) / 30); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
  ctx.closePath();
}
function wrapText(text, maxW) {
  const words = text.split(' '), lines = []; let line = '';
  for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line); return lines;
}

/* ---------- Background ---------- */
function drawBackground(cx, cy) {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#110b18'); g.addColorStop(0.6, '#24182e'); g.addColorStop(1, '#3a1a20');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);

  // distant glow from the Gilded Stadium far above
  const glow = ctx.createRadialGradient(VW * 0.7, -VH * 0.2, 0, VW * 0.7, -VH * 0.2, VH * 1.1);
  glow.addColorStop(0, 'rgba(242,193,78,.22)'); glow.addColorStop(1, 'rgba(242,193,78,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, VW, VH);

  // far spires
  const fo = cx * 0.12, fy = cy * 0.08, span = 14 * 260;
  for (const t of FAR) {
    let x = ((t.x - fo) % span + span) % span - 200;
    const base = VH + 80 - fy;
    ctx.fillStyle = '#1b1325';
    let w = t.w, y = base;
    const th = t.h / t.tiers;
    for (let i = 0; i < t.tiers; i++) { ctx.fillRect(x - w / 2, y - th, w, th + 1); y -= th; w *= 0.78; }
    ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x, y - 60); ctx.lineTo(x + w / 2, y); ctx.fill();
    if (t.lit > 0.4) { ctx.fillStyle = `rgba(255,138,42,${0.25 + 0.2 * Math.sin(Game.time * 1.3 + t.x)})`; ctx.fillRect(x - 3, base - t.h * 0.55, 6, 10); ctx.fillRect(x - 3, base - t.h * 0.3, 6, 10); }
  }

  // light shafts
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 4; i++) {
    const sx = ((i * 520 - cx * 0.25) % 2080 + 2080) % 2080 - 300;
    const a = 0.05 + 0.025 * Math.sin(Game.time * 0.7 + i * 2);
    const lg = ctx.createLinearGradient(sx, 0, sx + 260, VH);
    lg.addColorStop(0, `rgba(242,193,78,${a})`); lg.addColorStop(1, 'rgba(242,193,78,0)');
    ctx.fillStyle = lg;
    ctx.beginPath(); ctx.moveTo(sx, -10); ctx.lineTo(sx + 90, -10); ctx.lineTo(sx + 330, VH); ctx.lineTo(sx + 170, VH); ctx.fill();
  }
  ctx.restore();

  // mid scrapyard silhouettes
  const mo = cx * 0.35, my = cy * 0.2, mspan = 18 * 220;
  for (const m of MID) {
    const x = ((m.x - mo) % mspan + mspan) % mspan - 150, base = VH + 140 - my;
    ctx.fillStyle = '#20172b';
    if (m.kind === 'crane') {
      ctx.fillRect(x, base - m.h, 10, m.h);
      ctx.fillRect(x - 70, base - m.h, 170, 8);
      ctx.fillRect(x + 80, base - m.h, 2, 60);
      ctx.fillRect(x + 72, base - m.h + 60, 18, 14);
    } else {
      let y = base;
      for (let i = 0; i < 4; i++) { const w = m.w * (1 - i * 0.15), h = m.h / 4; ctx.fillRect(x - w / 2 + (i % 2) * 8, y - h, w, h); y -= h; }
    }
  }

  // ambient embers
  for (const e of AMBIENT) {
    e.y -= e.v * 0.016 * (1 + e.d); if (e.y < -0.05) { e.y = 1.05; e.x = Math.random(); }
    const x = ((e.x * VW * 1.4 - cx * e.d * 0.3) % (VW * 1.4) + VW * 1.4) % (VW * 1.4) - VW * 0.2 + Math.sin(Game.time + e.ph) * 12;
    const a = 0.35 + 0.35 * Math.sin(Game.time * 3 + e.ph);
    ctx.fillStyle = `rgba(255,${120 + (e.ph * 15 | 0)},42,${a * e.d})`;
    ctx.beginPath(); ctx.arc(x, e.y * VH, e.s, 0, 7); ctx.fill();
  }
}

/* ---------- World: grid, labels, tiles ---------- */
// Tile colours; story pages swap this per zone via Game.tilePal
const TILE_PAL = { a: '#251d30', b: '#211a2b', top: '#5a4a6e', top2: '#3c3049', side: '#30263c', plank: '#8a5a3a', plankHi: '#a8734c', spike: '#d9cfbd', vein: null, crystal: null, rivet: null };
function drawWorldBack(cam) {
  const x0 = Math.floor(cam.x / TILE) - 1, x1 = Math.ceil((cam.x + VW) / TILE) + 1;
  const y0 = Math.floor(cam.y / TILE) - 1, y1 = Math.ceil((cam.y + VH) / TILE) + 1;
  // measuring grid (it's a test room)
  ctx.lineWidth = 1;
  for (let tx = x0; tx <= x1; tx++) {
    ctx.strokeStyle = tx % 4 === 0 ? 'rgba(243,234,216,.06)' : 'rgba(243,234,216,.025)';
    ctx.beginPath(); ctx.moveTo(tx * TILE, y0 * TILE); ctx.lineTo(tx * TILE, y1 * TILE); ctx.stroke();
  }
  for (let ty = y0; ty <= y1; ty++) {
    ctx.strokeStyle = ty % 4 === 0 ? 'rgba(243,234,216,.06)' : 'rgba(243,234,216,.025)';
    ctx.beginPath(); ctx.moveTo(x0 * TILE, ty * TILE); ctx.lineTo(x1 * TILE, ty * TILE); ctx.stroke();
  }
  // chalk section labels
  ctx.font = `48px ${DISPLAY_FONT}`; ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(243,234,216,.07)';
  for (const l of LEVEL.labels) ctx.fillText(l.text, l.x, l.y);
}

function drawTiles(cam) {
  const x0 = Math.max(0, Math.floor(cam.x / TILE) - 1), x1 = Math.min(LW - 1, Math.ceil((cam.x + VW) / TILE) + 1);
  const y0 = Math.max(0, Math.floor(cam.y / TILE) - 1), y1 = Math.min(LH - 1, Math.ceil((cam.y + VH) / TILE) + 1);
  const P = Game.tilePal || TILE_PAL;
  const pulse = 0.55 + 0.35 * Math.sin(Game.time * 2.2);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const t = grid[ty * LW + tx]; if (!t) continue;
    const x = tx * TILE, y = ty * TILE;
    if (t === 1) {
      const h = tileHash(tx, ty);
      ctx.fillStyle = h % 5 === 0 ? P.a : P.b; ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = 'rgba(0,0,0,.18)';
      if (h % 3 === 0) ctx.fillRect(x + 4 + (h % 9), y + 8 + (h % 11), 10, 3);
      if (h % 7 === 1) ctx.fillRect(x + 16, y + 20, 8, 2);
      const up = tileAt(tx, ty - 1) !== 1, dn = tileAt(tx, ty + 1) !== 1, lf = tileAt(tx - 1, ty) !== 1, rt = tileAt(tx + 1, ty) !== 1;
      // glowing magma veins (Deep Quarry)
      if (P.vein && h % 9 === 2) {
        ctx.strokeStyle = P.vein.replace('A', (pulse * (0.6 + (h % 4) * 0.1)).toFixed(2)); ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(x, y + 6 + (h % 14)); ctx.lineTo(x + 12, y + 14 + (h % 9)); ctx.lineTo(x + 20, y + 8 + (h % 7)); ctx.lineTo(x + TILE, y + 18 + (h % 10)); ctx.stroke();
      }
      // riveted steel (Ventilation Shafts / Foundry)
      if (P.rivet) { ctx.fillStyle = P.rivet; for (const [rx, ry] of [[5, 5], [27, 5], [5, 27], [27, 27]]) ctx.fillRect(x + rx - 1.5, y + ry - 1.5, 3, 3); ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(x, y + TILE - 2, TILE, 2); }
      if (up) { ctx.fillStyle = P.top; ctx.fillRect(x, y, TILE, 5); ctx.fillStyle = P.top2; ctx.fillRect(x, y + 5, TILE, 3); }
      if (lf) { ctx.fillStyle = P.side; ctx.fillRect(x, y, 4, TILE); }
      if (rt) { ctx.fillStyle = P.side; ctx.fillRect(x + TILE - 4, y, 4, TILE); }
      ctx.fillStyle = INK;
      if (up) ctx.fillRect(x - 1, y - 2, TILE + 2, 3);
      if (dn) ctx.fillRect(x - 1, y + TILE - 1, TILE + 2, 3);
      if (lf) ctx.fillRect(x - 2, y - 1, 3, TILE + 2);
      if (rt) ctx.fillRect(x + TILE - 1, y - 1, 3, TILE + 2);
      // crystal clusters sprouting from open faces
      if (P.crystal && (up || dn) && h % 17 === 3) {
        const cy = up ? y : y + TILE, s = up ? -1 : 1;
        ctx.fillStyle = P.crystal; ctx.strokeStyle = INK; ctx.lineWidth = 2;
        for (const [ox, hh, w] of [[8, 14, 5], [15, 22, 6], [23, 11, 5]]) {
          ctx.beginPath(); ctx.moveTo(x + ox - w, cy); ctx.lineTo(x + ox, cy + s * hh); ctx.lineTo(x + ox + w, cy); ctx.closePath(); ctx.fill(); ctx.stroke();
        }
      }
    } else if (t === 2) {
      ctx.beginPath();
      for (let i = 0; i < 3; i++) { const sx = x + i * 10.67; ctx.moveTo(sx, y + TILE); ctx.lineTo(sx + 5.3, y + 10 + (i === 1 ? -3 : 0)); ctx.lineTo(sx + 10.67, y + TILE); }
      ctx.closePath(); ctx.fillStyle = P.spike; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
      ctx.fillStyle = FLAME;
      for (let i = 0; i < 3; i++) { const sx = x + i * 10.67 + 5.3, sy = y + 10 + (i === 1 ? -3 : 0); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - 2, sy + 5); ctx.lineTo(sx + 2, sy + 5); ctx.fill(); }
    } else if (t === 3) {
      ctx.fillStyle = P.plank; ctx.fillRect(x, y, TILE, 9);
      ctx.fillStyle = P.plankHi; ctx.fillRect(x, y, TILE, 3);
      ctx.fillStyle = INK; ctx.fillRect(x, y - 1, TILE, 2); ctx.fillRect(x, y + 8, TILE, 2);
      if (tileAt(tx - 1, ty) !== 3) ctx.fillRect(x - 1, y - 1, 3, 11);
      if (tileAt(tx + 1, ty) !== 3) ctx.fillRect(x + TILE - 2, y - 1, 3, 11);
      ctx.fillRect(x + 15, y + 2, 2, 6);
    }
  }
}

/* ---------- Props: benches & signs ---------- */
function drawBench(b, active, near) {
  ctx.save(); ctx.translate(b.x, b.y);
  ctx.lineJoin = 'round';
  // the back layer: backrest, frame, seat and legs (story pages swap in zone-themed materials)
  if (Game.drawBenchBody) Game.drawBenchBody(b, active);
  else {
    rr(-30, -40, 60, 8, 2); inked('#8a5a3a', 3);             // backrest
    rr(-34, -22, 68, 9, 2); inked('#a8734c', 3);              // seat
    ctx.fillStyle = INK; ctx.fillRect(-28, -14, 5, 14); ctx.fillRect(23, -14, 5, 14); ctx.fillRect(-26, -32, 4, 12); ctx.fillRect(22, -32, 4, 12);
    ctx.font = `11px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = BONE;
    ctx.fillText('DUGOUT', 0, -36);
  }
  // a quiet prompt that fades in above the backrest: a white keycap and REST in serif
  b.promptA = approach(b.promptA || 0, near ? 1 : 0, 1 / 60 * 5);
  if (b.promptA > 0.01) {
    const key = Bindings.label('up', Game.lastInput), py = -152 + (1 - b.promptA) * 6;   // well clear of the spotlight cone, the bat and the bench text
    ctx.globalAlpha = b.promptA; ctx.textBaseline = 'middle';
    ctx.font = `bold 12px ${SERIF_FONT}`; const kw = Math.max(20, ctx.measureText(key).width + 12);
    ctx.font = `15px ${SERIF_FONT}`; const tw = ctx.measureText('REST').width, x0 = -(kw + 8 + tw) / 2;
    rr(x0, py - 10, kw, 20, 4); ctx.fillStyle = 'rgba(13,11,16,.6)'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#f3ead8'; ctx.stroke();
    ctx.textAlign = 'center'; ctx.font = `bold 12px ${SERIF_FONT}`; ctx.fillStyle = '#f3ead8'; ctx.fillText(key, x0 + kw / 2, py + 1);
    ctx.textAlign = 'left'; ctx.font = `15px ${SERIF_FONT}`; if ('letterSpacing' in ctx) ctx.letterSpacing = '3px';
    ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = 6; ctx.fillText('REST', x0 + kw + 8, py + 1); ctx.shadowBlur = 0;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
function drawSign(s, near) {
  ctx.save(); ctx.translate(s.x, s.y);
  ctx.fillStyle = INK; ctx.fillRect(-3, -34, 6, 34);
  rr(-16, -50, 32, 22, 3); inked(near ? GOLD : '#c9a36b', 3);
  ctx.font = `18px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = INK; ctx.fillText('!', 0, -39);
  ctx.restore();
}
function drawBubble(s) {
  ctx.save();
  ctx.font = `14px ${SERIF_FONT}`;
  const lines = wrapText(Bindings.fmt(s.text, Game.lastInput), 250), lh = 18;
  const w = Math.min(276, Math.max(...lines.map(l => ctx.measureText(l).width)) + 26), h = lines.length * lh + 20;
  const bx = clamp(s.x - w / 2, Game.cam.x + 10, Game.cam.x + VW - w - 10), by = s.y - 66 - h;
  ctx.translate(0, Math.sin(Game.time * 2) * 2);
  ctx.fillStyle = 'rgba(0,0,0,.45)'; rr(bx + 6, by + 6, w, h, 4); ctx.fill();
  rr(bx, by, w, h, 4); inked(BONE, 3);
  ctx.beginPath(); ctx.moveTo(s.x - 9, by + h - 1); ctx.lineTo(s.x, by + h + 12); ctx.lineTo(s.x + 9, by + h - 1); ctx.fillStyle = BONE; ctx.fill();
  ctx.beginPath(); ctx.moveTo(s.x - 9, by + h); ctx.lineTo(s.x, by + h + 12); ctx.lineTo(s.x + 9, by + h); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
  ctx.fillStyle = INK; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  lines.forEach((l, i) => ctx.fillText(l, bx + 13, by + 10 + i * lh));
  ctx.restore();
}

/* ---------- Enemies ---------- */
function drawBot(e) {
  const shake = e.state === 'windup' ? rand(-2, 2) : 0;
  ctx.save(); ctx.translate(e.x + e.w / 2 + shake, e.y + e.h); ctx.scale(e.dir, 1);
  ctx.lineJoin = 'round';
  // treads
  rr(-20, -12, 40, 12, 6); inked('#2b2733', 3);
  for (let i = 0; i < 4; i++) { const tx = -14 + ((i * 10 + e.anim * 30) % 40) - 2; if (tx < 16) { ctx.fillStyle = '#6b6f7a'; ctx.beginPath(); ctx.arc(tx, -6, 2.5, 0, 7); ctx.fill(); } }
  // body
  rr(-17, -32, 34, 22, 4); inked(e.flash > 0 ? '#ffffff' : '#7d727a', 3);
  ctx.fillStyle = '#5b5260'; ctx.fillRect(-14, -18, 20, 3); ctx.fillStyle = '#a0522d'; ctx.fillRect(-12, -28, 6, 5);
  // eye
  const angry = e.state === 'windup' || e.state === 'charge';
  ctx.beginPath(); ctx.arc(8, -24, 6, 0, 7); inked(angry ? FLAME : GOLD, 2.5);
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(10, -24, 2.5, 0, 7); ctx.fill();
  if (angry) { ctx.fillStyle = INK; ctx.fillRect(2, -33, 12, 3); }
  // antenna
  ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-8, -32); ctx.lineTo(-11, -42); ctx.stroke();
  ctx.fillStyle = Math.sin(Game.time * 8) > 0 ? FLAME : '#5b1a10'; ctx.beginPath(); ctx.arc(-11, -43, 3, 0, 7); ctx.fill();
  if (e.state === 'stun') { ctx.font = `14px ${DISPLAY_FONT}`; ctx.fillStyle = GOLD; ctx.textAlign = 'center'; ctx.fillText('?!', 0, -48); }
  ctx.restore();
}
function drawDrone(e) {
  ctx.save(); ctx.translate(e.x + e.w / 2, e.y + e.h / 2); ctx.rotate(clamp(e.vx / 600, -0.35, 0.35));
  // propeller
  const s = Math.cos(e.phase * 45);
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(0, -18); ctx.stroke();
  ctx.fillStyle = 'rgba(243,234,216,.75)'; ctx.fillRect(-18 * Math.abs(s), -21, 36 * Math.abs(s), 4);
  // legs
  ctx.beginPath(); ctx.moveTo(-8, 8); ctx.lineTo(-12, 16); ctx.moveTo(8, 8); ctx.lineTo(12, 16); ctx.stroke();
  // body
  ctx.beginPath(); ctx.ellipse(0, 0, 16, 12, 0, 0, 7); inked(e.flash > 0 ? '#ffffff' : '#3b4f66', 3);
  // eye
  const pdx = Player.x + Player.w / 2 - (e.x + e.w / 2), pdy = Player.y + Player.h / 2 - (e.y + e.h / 2), pd = Math.hypot(pdx, pdy) || 1;
  if (e.windup) { ctx.shadowColor = '#b98bff'; ctx.shadowBlur = 20; }
  ctx.beginPath(); ctx.arc(0, 0, 7, 0, 7); inked(e.windup ? (e.red ? '#ffd0c8' : '#e6d6ff') : e.red ? '#ff4a3a' : (e.engaged ? '#b98bff' : '#6fd3ff'), 2.5);
  ctx.shadowBlur = 0;
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(pdx / pd * 3, pdy / pd * 3, 2.5, 0, 7); ctx.fill();
  ctx.restore();
}
function drawDummy(e) {
  ctx.save(); ctx.translate(e.x + e.w / 2, e.y + e.h); ctx.rotate(e.a * 0.08);
  ctx.fillStyle = INK; ctx.fillRect(-3, -20, 6, 20);
  ctx.beginPath(); ctx.ellipse(0, -32, 15, 18, 0, 0, 7); inked(e.flash > 0 ? '#ffffff' : '#c9a36b', 3);
  ctx.lineWidth = 2.5; ctx.strokeStyle = FLAME; ctx.beginPath(); ctx.arc(0, -32, 9, 0, 7); ctx.stroke();
  ctx.fillStyle = FLAME; ctx.beginPath(); ctx.arc(0, -32, 3.5, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -55, 8, 0, 7); inked(e.flash > 0 ? '#ffffff' : '#b8915c', 3);
  ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-4, -57); ctx.lineTo(-1, -54); ctx.moveTo(-1, -57); ctx.lineTo(-4, -54); ctx.moveTo(1, -57); ctx.lineTo(4, -54); ctx.moveTo(4, -57); ctx.lineTo(1, -54); ctx.stroke();
  ctx.restore();
  if (e.total > 0 && Math.hypot(Player.x - e.x, Player.y - e.y) < 220) {
    ctx.font = `12px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(243,234,216,.6)';
    ctx.fillText('DMG ' + e.total, e.x + e.w / 2, e.y + e.h + 16);
  }
}
function drawOrb(e) {
  const cx = e.x + 15, cy = e.y + 15, f = e.flash / 0.25;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 40 + f * 20);
  g.addColorStop(0, `rgba(242,193,78,${0.45 + f * 0.4})`); g.addColorStop(1, 'rgba(242,193,78,0)');
  ctx.fillStyle = g; ctx.fillRect(cx - 60, cy - 60, 120, 120);
  ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy - 13); ctx.lineTo(cx, cy - 40); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, 12 + f * 3, 0, 7); inked(f > 0 ? '#fff5d6' : GOLD, 3);
  ctx.strokeStyle = 'rgba(13,11,16,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 6, Game.time * 3, Game.time * 3 + 4); ctx.stroke();
}
function drawBolt(b) {
  const col = b.friendly ? '255,138,42' : b.crystal ? '140,230,255' : b.red ? '255,70,50' : '185,139,255';
  const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 18);
  g.addColorStop(0, `rgba(${col},.9)`); g.addColorStop(1, `rgba(${col},0)`);
  ctx.fillStyle = g; ctx.fillRect(b.x - 18, b.y - 18, 36, 36);
  ctx.beginPath(); ctx.arc(b.x, b.y, 5 + Math.sin(b.t * 30), 0, 7); inked('#ffffff', 2);
}
function drawBall(b) {
  const tc = b.boom ? '232,54,28' : '255,138,42';
  if (b.state === 'shot' && b.trail.length > 1) {
    ctx.lineCap = 'round';
    for (let i = 1; i < b.trail.length; i++) {
      ctx.strokeStyle = `rgba(${tc},${i / b.trail.length})`; ctx.lineWidth = (2 + i * 0.9) * (b.boom ? 1.6 : 1);
      ctx.beginPath(); ctx.moveTo(b.trail[i - 1].x, b.trail[i - 1].y); ctx.lineTo(b.trail[i].x, b.trail[i].y); ctx.stroke();
    }
  }
  if (b.boom) {
    const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 22);
    g.addColorStop(0, 'rgba(255,138,42,.55)'); g.addColorStop(1, 'rgba(255,138,42,0)');
    ctx.fillStyle = g; ctx.fillRect(b.x - 22, b.y - 22, 44, 44);
    if (Math.random() < 0.5) spawnParticle({ x: b.x + rand(-3, 3), y: b.y - 8, vx: rand(-30, 30), vy: rand(-90, -30), life: 0.25, size: rand(1.5, 3), color: Math.random() < 0.5 ? GOLD : EMBER, type: 'dot' });
  }
  ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.spin);
  if (b.state === 'toss') {
    const c = Player.center(), near = Math.hypot(b.x - c.x, b.y - c.y) < TUNE.connectRange;
    ctx.strokeStyle = near ? `rgba(242,193,78,${0.6 + 0.4 * Math.sin(Game.time * 30)})` : 'rgba(243,234,216,.25)';
    ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 13, 0, 7); ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(0, 0, b.r, 0, 7); inked(b.boom ? '#2b2228' : BONE, 2.5);
  ctx.strokeStyle = b.boom ? EMBER : FLAME; ctx.lineWidth = 1.5; ctx.setLineDash([2, 2]);
  ctx.beginPath(); ctx.arc(-6, 0, 5, -0.9, 0.9); ctx.stroke(); ctx.beginPath(); ctx.arc(6, 0, 5, Math.PI - 0.9, Math.PI + 0.9); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

/* ---------- Nathan ---------- */
function batAngle(P) {
  const p = P.attackT > 0 ? 1 - P.attackT / P.attackDur : 1;
  const e = 1 - Math.pow(1 - p, 3);
  if (P.attackT > 0) {
    switch (P.attackType) {
      case 'up': return lerp(0.5, -3.4, e);
      case 'down': return lerp(-0.7, 3.1, e);
      case 'launch': return lerp(-2.7, 0.7, e);
      default:
        if (P.comboIdx === 2) return lerp(1.1, -2.0, e);
        if (P.comboIdx === 3) return lerp(-3.3, 1.5, e);
        return lerp(-2.4, 0.9, e);
    }
  }
  if (P.healT > 0) return -1.57 + Math.sin(Game.time * 40) * 0.05;
  if (P.sliding) return -2.6;
  if (!P.onGround) return -2.0 + clamp(P.vy / 1500, -0.4, 0.4);
  return -2.25 + Math.sin(P.runPhase) * 0.12;
}
function drawSlash(P) {
  if (P.attackT <= 0 || P.attackType === 'launch') return;
  const p = 1 - P.attackT / P.attackDur; if (p > 0.8) return;
  const heavy = P.comboIdx === 3;
  let a0, a1;
  switch (P.attackType) {
    case 'up': a0 = 0.3; a1 = -3.3; break;
    case 'down': a0 = -0.5; a1 = 3.0; break;
    default: if (P.comboIdx === 2) { a0 = 1.0; a1 = -1.9; } else if (heavy) { a0 = -3.2; a1 = 1.4; } else { a0 = -2.3; a1 = 0.85; }
  }
  const cur = lerp(a0, a1, Math.min(1, (1 - Math.pow(1 - p, 3)) * 1.05));
  const r1 = TUNE.batReach * (heavy ? 0.95 : 0.82), r0 = r1 * 0.45, alpha = 1 - p / 0.8;
  ctx.save();
  ctx.translate(P.x + P.w / 2, P.y + P.h / 2 - 6);
  ctx.scale(P.facing, 1);
  const ccw = a1 < a0;
  ctx.beginPath(); ctx.arc(0, 0, r1, a0, cur, ccw); ctx.arc(0, 0, r0, cur, a0, !ccw); ctx.closePath();
  ctx.globalAlpha = alpha * 0.9; ctx.fillStyle = heavy ? GOLD : BONE; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = heavy ? FLAME : INK; ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, r1 + 4, a0, cur, ccw); ctx.strokeStyle = heavy ? FLAME : EMBER; ctx.lineWidth = 3; ctx.stroke();
  ctx.restore();
}
function limb(x, y, ang, len, col, w) {
  const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK; ctx.lineWidth = w + 5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
  return [ex, ey];
}
/* ---------- Sitting on a bench: he settles down over a beat, then slumps content ---------- */
// hard cel-shadow tone used on Nathan's cap, chin, back and back arm
const CEL = 'rgba(13,11,16,.26)';
// bat details in bat space (handle at 0, tip at `len`): black grip tape, plus a red stripe near the tip
function batTrim(len, stripe) {
  ctx.strokeStyle = INK; ctx.lineWidth = 1.2;
  ctx.beginPath(); for (const gx of [1, 3.6, 6.2, 8.8]) { ctx.moveTo(gx, -2.3); ctx.lineTo(gx + 2, 2.3); } ctx.stroke();
  if (stripe) { const sx = len * 0.78, hw = 2 + (sx + 2) / (len + 2) * 2.4; ctx.fillStyle = FLAME; ctx.fillRect(sx, -hw + 0.8, 2.2, hw * 2 - 1.6); }
}
function drawNathanSeated(P) {
  const px = P.x + P.w / 2, py = P.y + P.h;
  if (P.invuln > 0 && Math.floor(Game.time * 18) % 2 === 0) ctx.globalAlpha = 0.35;
  const k = clamp(P.sit, 0, 1), e = k * k * (3 - 2 * k);
  // a slow 2-second breath: chest and shoulders rise and fall
  const br = Math.sin(Game.time * Math.PI) * e, breathe = br * 0.8;
  const hop = Math.sin(Math.PI * k) * 5;                                       // a small hop up onto the seat
  const land = Math.sin(Math.PI * clamp((k - 0.62) / 0.38, 0, 1)) * 0.07;     // squash as he settles
  const sh = 1 - hop / 16;
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.beginPath(); ctx.ellipse(px, py, (14 + e * 5) * sh, 3 * sh, 0, 0, 7); ctx.fill();
  ctx.save();
  ctx.translate(px, py - hop);
  ctx.scale(P.facing, 1 - land + Math.sin(k * Math.PI) * 0.04);
  ctx.lineJoin = 'round';
  const hipY = lerp(-15, -25, e) + breathe * 0.3, hipX = lerp(0, -3, e);
  ctx.save(); ctx.translate(hipX, hipY);
  // legs tuck up early, then the shins swing down until the boots find the floor
  const le = clamp(k / 0.55, 0, 1) ** 0.8;
  const thighA = lerp(Math.PI / 2, Math.PI / 2 - 0.95, le), shinA = lerp(Math.PI / 2, Math.PI / 2 - 0.05, le);
  const thighL = lerp(7.5, 12, le), shinL = lerp(7.5, 16, le);
  let [kx, ky] = limb(-2, 0, thighA, thighL, NATHAN_LOOK.pants2, 5);
  let [fx, fy] = limb(kx, ky, shinA, shinL, NATHAN_LOOK.pants2, 5);
  ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(fx + 2, fy, 5.5, 3, 0, 0, 7); ctx.fill();
  const [kx2, ky2] = limb(3, -1, thighA + 0.12, thighL, NATHAN_LOOK.pants, 5);
  const [fx2, fy2] = limb(kx2, ky2, shinA + 0.06, shinL, NATHAN_LOOK.pants, 5);
  ctx.beginPath(); ctx.ellipse(fx2 + 2, fy2, 5.5, 3, 0, 0, 7); ctx.fill();
  // the upper body leans back ~7° against the backrest, and rises a touch with each breath
  ctx.rotate(lerp(0, -0.12, e)); ctx.scale(1, 1 + br * 0.025); ctx.translate(0, -br * 0.6);
  // torso, the seven, and one arm draped back along the bench
  rr(-10, -22, 20, 22, 6); inked(NATHAN_LOOK.shirt, 3);
  ctx.fillStyle = INK; ctx.fillRect(-10, -3, 20, 3);
  ctx.fillStyle = NATHAN_LOOK.stripe; ctx.fillRect(-6, -19, 3, 10);
  ctx.font = `10px ${DISPLAY_FONT}`; ctx.fillStyle = NATHAN_LOOK.num; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("7", 3, -12);
  limb(-5, -18, Math.PI / 2 + 0.9, 10, NATHAN_LOOK.sleeve, 4);
  // head + cap, the brim tugged down over his eyes
  ctx.beginPath(); ctx.arc(2, -31, 10, 0, 7); inked(NATHAN_LOOK.skin, 3);
  ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(4, -26); ctx.quadraticCurveTo(7.5, -23.5, 11, -27); ctx.stroke();   // small smile
  const tug = e * 3;
  ctx.save(); ctx.translate(2, -31); ctx.rotate(e * 0.14); ctx.translate(-2, 31 + tug);
  ctx.beginPath(); ctx.moveTo(-9, -32); ctx.quadraticCurveTo(-8, -44, 3, -44); ctx.quadraticCurveTo(13, -44, 12, -33); ctx.lineTo(18, -32); ctx.quadraticCurveTo(15, -36, 11, -35);
  ctx.closePath(); inked(NATHAN_LOOK.cap, 3);
  ctx.restore();
  if (e < 0.6) { ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(4, -32 + tug); ctx.lineTo(9.5, -32.5 + tug); ctx.stroke(); }   // eyes, until the brim covers them
  if (NATHAN_LOOK.head) NATHAN_LOOK.head(P, -31, false);
  // the bat, laid across his knees
  if (!P.noBat) {
    ctx.save(); ctx.translate(0, -7); ctx.rotate(-0.14);
    ctx.beginPath(); ctx.moveTo(-4, -2); ctx.lineTo(25, -3.5); ctx.quadraticCurveTo(30, 0, 25, 3.5); ctx.lineTo(-4, 2); ctx.closePath();
    inked(P.batLook === 'max' ? '#ff6a2a' : P.batLook === 'wood' ? '#d9b77a' : '#c9a36b', 2.5);
    if (P.batLook === 'max') { ctx.fillStyle = GOLD; ctx.fillRect(14, -2, 8, 4); }
    ctx.fillStyle = INK; ctx.fillRect(-6, -3, 4, 6);
    if (P.batLook !== 'wood') batTrim(25, P.batLook !== 'max');
    ctx.restore();
    // one hand resting loosely on the handle
    const [hx2, hy2] = limb(4, -18, 2.05, 11, NATHAN_LOOK.sleeve, 4);
    ctx.beginPath(); ctx.arc(hx2, hy2, 3, 0, 7); inked(NATHAN_LOOK.skin, 2);
  }
  ctx.restore();
  ctx.restore();
  ctx.globalAlpha = 1;
}
function drawNathan(P) {
  // seated on a bench: hand off to the sitting pose
  if (P.sit > 0.001) { drawNathanSeated(P); return; }
  const px = P.x + P.w / 2, py = P.y + P.h;
  if (P.invuln > 0 && Math.floor(Game.time * 18) % 2 === 0) ctx.globalAlpha = 0.35;

  if (P.healT > 0) {
    const k = P.healT / TUNE.healTime;
    const g = ctx.createRadialGradient(px, py - 22, 0, px, py - 22, 30 + k * 60);
    g.addColorStop(0, `rgba(232,54,28,${0.3 + k * 0.5})`); g.addColorStop(1, 'rgba(232,54,28,0)');
    ctx.fillStyle = g; ctx.fillRect(px - 100, py - 120, 200, 200);
  }
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(px, py, 14 * P.sx, 3, 0, 0, 7); ctx.fill();

  ctx.save();
  ctx.translate(px, py); ctx.scale(P.facing * P.sx, P.sy);
  if (P.lie) { ctx.translate(22 * P.lie, 0); ctx.rotate(-P.lie * Math.PI / 2); }
  ctx.lineJoin = 'round';
  const moving = P.onGround && Math.abs(P.vx) > 20;
  const run = moving ? Math.sin(P.runPhase) : 0;
  let back, front;
  if (P.dashT > 0) { back = 2.4; front = 0.8; }
  else if (!P.onGround) { back = P.vy < 0 ? 2.2 : 1.9; front = P.vy < 0 ? 0.9 : 1.3; if (P.sliding) { back = 1.9; front = 1.2; } }
  else { back = Math.PI / 2 + run * 0.75; front = Math.PI / 2 - run * 0.75; }
  const bob = moving ? Math.abs(Math.cos(P.runPhase)) * -2 : 0;
  ctx.translate(0, bob);
  if (NATHAN_LOOK.back) NATHAN_LOOK.back(P, run);   // capes, backpacks… (outfits, zone/outfits.js)

  // legs
  let [ex, ey] = limb(-3, -15, back, 15, NATHAN_LOOK.pants2, 5); ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(ex + 2, ey, 5, 3, 0, 0, 7); ctx.fill();
  [ex, ey] = limb(3, -15, front, 15, NATHAN_LOOK.pants, 5); ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(ex + 2, ey, 5, 3, 0, 0, 7); ctx.fill();

  // torso
  rr(-10, -35, 20, 22, 6); inked(NATHAN_LOOK.shirt, 3);
  // 2-tone cel shading: one hard shadow along the back and the hem (no gradients)
  ctx.save(); rr(-8.5, -33.5, 17, 19, 5); ctx.clip(); ctx.fillStyle = CEL; ctx.fillRect(-10, -35, 4, 22); ctx.fillRect(-10, -21, 20, 4); ctx.restore();
  ctx.fillStyle = INK; ctx.fillRect(-10, -17, 20, 3);
  ctx.fillStyle = GOLD; ctx.fillRect(1, -17.5, 5, 4); ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.strokeRect(1, -17.5, 5, 4);   // belt buckle
  ctx.fillStyle = NATHAN_LOOK.stripe; ctx.fillRect(-6, -32, 3, 10);
  ctx.font = `10px ${DISPLAY_FONT}`; ctx.fillStyle = NATHAN_LOOK.num; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("7", 3, -25);

  // back arm, in shadow
  const backA = Math.PI / 2 + 0.4 + run * 0.4;
  limb(-4, -31, backA, 11, NATHAN_LOOK.sleeve, 4);
  ctx.strokeStyle = CEL; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-4, -31); ctx.lineTo(-4 + Math.cos(backA) * 11, -31 + Math.sin(backA) * 11); ctx.stroke();

  // the cap's loose back strap: a 2-frame flutter standing still, streaming out when he moves
  const wind = clamp(Math.abs(P.vx) / 320 + (P.onGround ? 0 : 0.5) + (P.dashT > 0 ? 0.8 : 0), 0, 1.6);
  const fl = (Math.floor(Game.time * 5) % 2 ? 1 : -1) * (0.8 + wind * 0.6) + Math.sin(Game.time * 15) * wind * 1.5;
  ctx.beginPath(); ctx.moveTo(-7, -51);
  ctx.quadraticCurveTo(-13 - wind * 4, -51 + fl * 0.6, -17 - wind * 8, -47 + fl * 1.5 - wind * 3);
  ctx.lineTo(-15 - wind * 7, -43.5 + fl * 1.2 - wind * 2);
  ctx.quadraticCurveTo(-11 - wind * 3, -46 + fl * 0.5, -7, -46);
  ctx.closePath(); inked(NATHAN_LOOK.cap, 2);

  // head + cap
  ctx.beginPath(); ctx.arc(2, -44, 10, 0, 7); inked(NATHAN_LOOK.skin, 3);
  ctx.save(); ctx.beginPath(); ctx.arc(2, -44, 8.6, 0, 7); ctx.clip();
  ctx.fillStyle = CEL; ctx.fillRect(-9, -46, 22, 3.5);                                     // under the brim
  ctx.beginPath(); ctx.ellipse(1, -34.6, 9, 2.6, 0, 0, 7); ctx.fill();                     // under the chin
  ctx.restore();
  const capPath = () => { ctx.beginPath(); ctx.moveTo(-9, -45); ctx.quadraticCurveTo(-8, -57, 3, -57); ctx.quadraticCurveTo(13, -57, 12, -46); ctx.lineTo(18, -45); ctx.quadraticCurveTo(15, -49, 11, -48); ctx.closePath(); };
  capPath(); inked(NATHAN_LOOK.cap, 3);
  ctx.save(); capPath(); ctx.clip(); ctx.fillStyle = CEL; ctx.fillRect(-10, -49.5, 30, 6); ctx.restore();   // the underside of the cap
  capPath(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
  // face
  ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  const hurt = P.invuln > 0.8 || P.dead;
  ctx.beginPath();
  if (hurt) { ctx.moveTo(5, -45); ctx.lineTo(9, -42); ctx.moveTo(9, -45); ctx.lineTo(5, -42); }
  else { ctx.moveTo(5, -44); ctx.lineTo(9, -45); }
  ctx.stroke();
  ctx.beginPath();
  if (P.healT > 0 || P.attackT > 0 || hurt) { ctx.ellipse(8, -38, 2.5, 2.2, 0, 0, 7); ctx.fillStyle = INK; ctx.fill(); }
  else { ctx.moveTo(4, -38); ctx.quadraticCurveTo(7, -36, 10, -39); ctx.stroke(); }
  if (NATHAN_LOOK.head) NATHAN_LOOK.head(P, -44, hurt);   // hats, goggles, shades…

  // bat arm + bat
  const ang = P.noBat ? 1.4 : batAngle(P);
  const [hx, hy] = limb(3, -30, ang, 10, NATHAN_LOOK.sleeve, 4);
  // athletic wristband just above the grip
  ctx.save(); ctx.translate(3 + Math.cos(ang) * 7.2, -30 + Math.sin(ang) * 7.2); ctx.rotate(ang);
  rr(-1.8, -3.6, 3.6, 7.2, 1); inked(BONE, 1.5); ctx.fillStyle = FLAME; ctx.fillRect(-0.5, -3, 1.1, 6); ctx.restore();
  if (!P.noBat) {
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang);
  // an outfit can swap the bat for its own (a wrench, a crystal bat…); it returns true if it drew one
  if (!(NATHAN_LOOK.bat && NATHAN_LOOK.bat(P))) {
  // batLook: 'max' = Adam's golden core fused in (blazing) · 'wood' = the plain Spare Bat
  if (P.batLook === 'max') { const g = ctx.createRadialGradient(24, 0, 0, 24, 0, 26); g.addColorStop(0, `rgba(255,90,40,${0.45 + Math.sin(Game.time * 9) * 0.12})`); g.addColorStop(1, 'rgba(255,90,40,0)'); ctx.fillStyle = g; ctx.fillRect(-2, -26, 52, 52); }
  ctx.beginPath(); ctx.moveTo(-2, -2); ctx.lineTo(30, -4.5); ctx.quadraticCurveTo(35, 0, 30, 4.5); ctx.lineTo(-2, 2); ctx.closePath();
  inked(P.launched || P.attackType === 'launch' && P.attackT > 0 ? '#ff7b3a' : P.batLook === 'max' ? '#ff6a2a' : P.batLook === 'wood' ? '#d9b77a' : '#c9a36b', 2.5);
  if (P.batLook === 'max') { ctx.fillStyle = GOLD; ctx.fillRect(18, -2, 9, 4); }
  ctx.fillStyle = INK; ctx.fillRect(-4, -3, 4, 6);
  // grip tape on the handle and a thin flame-red stripe near the tip (the plain Spare Bat stays plain)
  if (P.batLook !== 'wood') batTrim(30, P.batLook !== 'max');
  }
  ctx.restore();
  }

  ctx.restore();
  ctx.globalAlpha = 1;
  // purr shield: a soft bubble with two little cat ears
  if (P.shield > 0) {
    const cy = py - 24, r = 32 + Math.sin(Game.time * 4) * 1.5;
    ctx.save();
    ctx.strokeStyle = `rgba(159,230,255,${0.55 + Math.sin(Game.time * 6) * 0.15})`; ctx.lineWidth = 2.5;
    ctx.fillStyle = 'rgba(159,230,255,.08)';
    ctx.beginPath(); ctx.arc(px, cy, r, 0, 7); ctx.fill(); ctx.stroke();
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(px + s * 12, cy - r + 3); ctx.lineTo(px + s * 19, cy - r - 9); ctx.lineTo(px + s * 23, cy - r + 7); ctx.stroke(); }
    ctx.restore();
  }
}
function drawAfterimage(a) {
  const k = a.life / a.max;
  ctx.save(); ctx.globalAlpha = k * 0.45; ctx.fillStyle = a.color;
  ctx.translate(a.x + Player.w / 2, a.y + Player.h);
  rr(-10, -35, 20, 24, 6); ctx.fill();
  ctx.beginPath(); ctx.arc(2 * a.facing, -44, 10, 0, 7); ctx.fill();
  ctx.fillRect(-6, -14, 12, 14);
  ctx.restore();
}

/* ---------- Particles & pops ---------- */
function drawParticles() {
  const V = viewRect(40);
  for (const p of Game.particles) {
    if (p.x < V.x0 || p.x > V.x1 || p.y < V.y0 || p.y > V.y1) continue;   // off-screen: don't touch the canvas
    const k = p.life / p.max;
    ctx.globalAlpha = Math.max(0, Math.min(1, k * 1.4));
    switch (p.type) {
      case 'spark':
        ctx.strokeStyle = p.color; ctx.lineWidth = p.size; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); ctx.stroke(); break;
      case 'ring':
        ctx.strokeStyle = p.color; ctx.lineWidth = p.size * k + 1;
        ctx.beginPath(); ctx.arc(p.x, p.y, lerp(p.r1, p.r0, k), 0, 7); ctx.stroke(); break;
      case 'puff':
        ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1.6 - k), 0, 7); ctx.fill(); break;
      case 'debris':
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(-p.size / 2, -p.size / 2, p.size, p.size); ctx.restore(); break;
      default:
        ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.4 + k * 0.6), 0, 7); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}
function drawPops() {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  for (const p of Game.pops) {
    const t = p.t / p.life;
    const s = p.t < 0.14 ? easeOutBack(p.t / 0.14) * 1.15 : t > 0.75 ? 1 - (t - 0.75) * 2.5 : 1;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(s, s);
    ctx.globalAlpha = t > 0.8 ? (1 - t) * 5 : 1;
    ctx.font = `${p.size}px ${DISPLAY_FONT}`;
    if (p.burst) {
      const w = ctx.measureText(p.text).width;
      ctx.save(); ctx.scale((w * 0.5 + p.size * 0.35) / p.size, 1);
      starburst(p.size * 0.85, p.size * 0.55); ctx.fillStyle = p.burstColor; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
      ctx.restore();
    }
    ctx.lineWidth = p.size * 0.2; ctx.strokeStyle = INK;
    ctx.strokeText(p.text, 3, 3); ctx.strokeText(p.text, 0, 0);
    ctx.fillStyle = p.color; ctx.fillText(p.text, 0, 0);
    ctx.restore();
  }
}

/* ---------- Debug ---------- */
function drawDebug() {
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#6fd3ff'; const hb = Player.hurtbox(); ctx.strokeRect(hb.x, hb.y, hb.w, hb.h);
  ctx.strokeStyle = '#ffffff'; ctx.strokeRect(Player.x, Player.y, Player.w, Player.h);
  if (Player.attackT > 0 && Player.attackType !== 'launch') { const a = Player.hitbox(); ctx.fillStyle = 'rgba(232,54,28,.3)'; ctx.fillRect(a.x, a.y, a.w, a.h); ctx.strokeStyle = FLAME; ctx.strokeRect(a.x, a.y, a.w, a.h); }
  ctx.strokeStyle = GOLD; for (const e of Enemies) if (!e.dead) ctx.strokeRect(e.x, e.y, e.w, e.h);
  ctx.strokeStyle = 'rgba(242,193,78,.5)'; const c = Player.center(); ctx.beginPath(); ctx.arc(c.x, c.y, TUNE.connectRange, 0, 7); ctx.stroke();
  ctx.fillStyle = 'rgba(111,211,255,.5)'; ctx.fillRect(Player.lastSafe.x, Player.lastSafe.y, Player.w, Player.h);
}

/* ---------- Frame ---------- */
function render() {
  const cam = Game.cam;
  const [kx, ky] = kickOffset();
  const shx = (Game.shake > 0.1 ? rand(-Game.shake, Game.shake) : 0) + kx, shy = (Game.shake > 0.1 ? rand(-Game.shake, Game.shake) : 0) + ky;
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  const H = Game.hooks || {};
  if (H.background) H.background(cam.x, cam.y); else drawBackground(cam.x, cam.y);

  // world space, zoomed about a focal point (cutscenes push the camera in around the characters, not the screen centre)
  const z = Game.zoom || 1, F = Game.zoomF || { x: VW / 2, y: VH / 2 };
  ctx.setTransform(SCALE * z, 0, 0, SCALE * z, ((-cam.x + shx) * z + F.x * (1 - z)) * SCALE, ((-cam.y + shy) * z + F.y * (1 - z)) * SCALE);
  if (!H.noGrid) drawWorldBack(cam);
  if (H.behindTiles) H.behindTiles(cam);
  drawTiles(cam);
  if (H.back) H.back(cam);

  const prompts = typeof Story === 'undefined' || !Story.active;   // no "REST" / "READ" prompts over a cutscene
  for (const s of LEVEL.signs) drawSign(s, s.near && prompts);
  LEVEL.benches.forEach((b, i) => drawBench(b, i === Game.checkpoint, prompts && b.near && !(Player.sitting || Player.sit > 0.4)));
  const V = viewRect(320), boss = typeof Zone !== 'undefined' ? Zone.boss : null;
  for (const e of Enemies) {
    if (e.dead) continue;
    // plain enemies well off-screen are skipped; bosses always draw (their attacks reach far past their box)
    if (e !== boss && e.type !== 'boss' && e.type !== 'twin' && !e.noCull && (e.x + e.w < V.x0 || e.x > V.x1 || e.y + e.h < V.y0 || e.y > V.y1)) continue;
    if (e.draw) e.draw(); else if (e.type === 'bot') drawBot(e); else if (e.type === 'drone') drawDrone(e); else if (e.type === 'dummy') drawDummy(e); else drawOrb(e);
  }
  for (const a of Game.afterimages) drawAfterimage(a);
  if (!Player.dead && !Player.hidden) { drawSlash(Player); drawNathan(Player); }
  for (const b of Balls) if (!b.dead) drawBall(b);
  for (const b of Bolts) if (!b.dead) { if (b.draw) b.draw(); else drawBolt(b); }
  drawParticles();
  if (H.front) H.front(cam);
  for (const s of LEVEL.signs) if (s.near) drawBubble(s);
  drawPops();
  if (H.top) H.top(cam);
  if (OPT.boxes) drawDebug();

  // screen-space overlays
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  // the fog and the vignette are built once per screen size and fog colour, not every frame
  const fogC = (Game.tilePal && Game.tilePal.fog) || '58,26,32', rk = VW + '|' + VH + '|' + fogC;
  if (RCACHE.k !== rk) {
    RCACHE.k = rk;
    RCACHE.fog = ctx.createLinearGradient(0, VH * 0.7, 0, VH);
    RCACHE.fog.addColorStop(0, `rgba(${fogC},0)`); RCACHE.fog.addColorStop(1, `rgba(${fogC},.35)`);
    RCACHE.vg = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.35, VW / 2, VH / 2, VH * 0.95);
    RCACHE.vg.addColorStop(0, 'rgba(0,0,0,0)'); RCACHE.vg.addColorStop(1, 'rgba(5,3,8,.7)');
  }
  ctx.fillStyle = RCACHE.fog; ctx.fillRect(0, VH * 0.7, VW, VH * 0.3);
  ctx.fillStyle = RCACHE.vg; ctx.fillRect(0, 0, VW, VH);
  const low = Player.hp === 1 && !Player.dead ? 0.25 + 0.15 * Math.sin(Game.time * 6) : 0;
  if (Game.flashRed > 0 || low > 0) {
    const a = Math.max(Game.flashRed, low);
    const rg = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.3, VW / 2, VH / 2, VH);
    rg.addColorStop(0, 'rgba(232,54,28,0)'); rg.addColorStop(1, `rgba(232,54,28,${a})`);
    ctx.fillStyle = rg; ctx.fillRect(0, 0, VW, VH);
  }
  if (Game.flashWhite > 0) { ctx.fillStyle = `rgba(255,240,220,${Game.flashWhite * 0.5})`; ctx.fillRect(0, 0, VW, VH); }
  if (Game.fade > 0.001) { ctx.fillStyle = `rgba(13,11,16,${Game.fade})`; ctx.fillRect(0, 0, VW, VH); }
  if (H.screen) H.screen();
}
