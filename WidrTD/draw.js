// ===== WIDR TD: art (chunky sticker / riso style) =====
const INK = '#22172b';
const PAL = {grass:'#c3e57e', grass2:'#a9d468', sand:'#ffd98c', sand2:'#f2b65c', water:'#5fd0d6', water2:'#3aa9b8', cream:'#fff6e3', coral:'#ff5a4e', sun:'#ffcc29', skin:'#ffd2a8', skin2:'#d9a074', skin3:'#8a5a3b'};

function rnd(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

// Fill + ink outline + offset hard shadow
function sticker(ctx, build, fill, sh = 4, lw = 3) {
  ctx.save(); ctx.translate(sh * .55, sh); ctx.beginPath(); build(); ctx.fillStyle = INK; ctx.fill(); ctx.restore();
  ctx.beginPath(); build(); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.stroke();
}
function shape(ctx, build, fill, lw = 3) {
  ctx.beginPath(); build(); if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.stroke(); }
}
const circ = (ctx, x, y, r) => () => ctx.arc(x, y, r, 0, Math.PI * 2);
const ell = (ctx, x, y, rx, ry, rot = 0) => () => ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);

// ---------- Background ----------
// Builds the static map art for a map (defaults to the loaded one)
function buildBackground(map = MAP) {
  const prev = MAP.id; if (map.id !== prev) loadMap(map.id);
  const T = map.theme;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), R = rnd(42 + map.id.length * 7);
  g.fillStyle = T.ground; g.fillRect(0, 0, W, H);
  // halftone patches
  for (let p = 0; p < 9; p++) {
    const cx = R() * W, cy = R() * H, rr = 60 + R() * 120;
    for (let x = cx - rr; x < cx + rr; x += 9) for (let y = cy - rr; y < cy + rr; y += 9) {
      const d = Math.hypot(x - cx, y - cy) / rr; if (d > 1) continue;
      g.fillStyle = T.ground2; g.beginPath(); g.arc(x + ((y / 9) % 2) * 4.5, y, 2.6 * (1 - d), 0, 7); g.fill();
    }
  }
  // ground texture: grass tufts, snow sparkles, quarry grit, stars, confetti
  g.strokeStyle = T.tuft; g.fillStyle = T.tuft; g.lineWidth = 2; g.lineCap = 'round';
  for (let i = 0; i < 140; i++) {
    const x = R() * W, y = R() * H;
    if (T.decor === 'island') { g.beginPath(); g.moveTo(x - 4, y); g.lineTo(x - 2, y - 6); g.moveTo(x, y); g.lineTo(x + 1, y - 8); g.moveTo(x + 4, y); g.lineTo(x + 4, y - 5); g.stroke(); }
    else if (T.decor === 'snow') { g.beginPath(); g.moveTo(x - 3, y); g.lineTo(x + 3, y); g.moveTo(x, y - 3); g.lineTo(x, y + 3); g.stroke(); }
    else if (T.decor === 'quarry') { g.beginPath(); g.arc(x, y, 1.5 + R() * 2, 0, 7); g.fill(); }
    else if (T.decor === 'space') { g.beginPath(); g.arc(x, y, .8 + R() * 1.4, 0, 7); g.fill(); }
    else { g.save(); g.translate(x, y); g.rotate(R() * 3); g.fillRect(-3, -1.5, 6, 3); g.restore(); }
  }
  // blockers
  for (const p of PONDS) drawBlocker(g, p, p.kind || T.block, R);
  (map.vents || []).forEach(v => drawBlocker(g, Object.assign({r: 24}, v), 'vent', R));
  // paths: all ink layers first so merging and crossing roads look like one road
  const line = (w, col, ox = 0, oy = 0, dash) => {
    for (const P of PATHS) {
      g.save(); g.translate(ox, oy); g.lineWidth = w; g.strokeStyle = col; g.lineJoin = 'round'; g.lineCap = 'round';
      if (dash) g.setLineDash(dash);
      g.beginPath(); P.pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); g.restore();
    }
  };
  if (map.tram) drawTramTrack(g, map.tram.y);
  line(PATH_W + 8, INK, 4, 6); line(PATH_W + 8, INK); line(PATH_W, T.path); line(PATH_W - 22, T.path2); line(PATH_W - 26, T.path);
  line(4, T.dash, 0, 0, [10, 14]);
  for (let i = 0; i < 70; i++) { const pi = i % PATHS.length, p = posAt(R() * PATHS[pi].len, pi); g.fillStyle = T.path2; g.beginPath(); g.arc(p.x + (R() - .5) * 34, p.y + (R() - .5) * 34, 1.5 + R() * 1.5, 0, 7); g.fill(); }
  // decor (kept off the road, blockers and gate)
  const free = (x, y, m) => SEGS.every(s => distToSeg(x, y, s) > PATH_W / 2 + m) && PONDS.every(p => Math.hypot(x - p.x, y - p.y) > p.r + m) && GATES.every(q => Math.hypot(x - q.x, y - q.y) > 80);
  for (let i = 0; i < 30; i++) {
    const x = 20 + R() * (W - 40), y = 20 + R() * (H - 40); if (!free(x, y, 26)) continue;
    drawDecor(g, T.decor, x, y, R());
  }
  // entries
  ENTRIES.forEach((e, i) => {
    if (ENTRIES.slice(0, i).some(o => Math.hypot(o.x - e.x, o.y - e.y) < 30)) return;
    g.save(); g.translate(e.x, e.y); g.rotate(e.ang);
    sticker(g, () => { g.arc(0, 0, 46, -Math.PI / 2, Math.PI / 2); g.closePath(); }, '#9a8a7a', 4);
    shape(g, () => { g.arc(-4, 0, 26, -Math.PI / 2, Math.PI / 2); g.closePath(); }, INK, 0);
    g.restore();
  });
  // exit gates (WIDR castle towers either side of the road)
  GATES.forEach((q, i) => {
    if (GATES.slice(0, i).some(o => Math.hypot(o.x - q.x, o.y - q.y) < 30)) return;
    const nx = -Math.sin(q.ang), ny = Math.cos(q.ang), off = PATH_W / 2 + 30;
    [[1, 'WIDR'], [-1, '64']].forEach(([sgn, label]) => {
      const bx = q.x + nx * off * sgn, by = q.y + ny * off * sgn;
      sticker(g, () => g.rect(bx - 30, by - 18, 60, 36), PAL.cream, 4);
      g.fillStyle = PAL.coral; g.fillRect(bx - 30, by - 18, 60, 8);
      g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(bx - 30, by - 18, 60, 36);
      g.font = '900 13px "Arial Rounded MT Bold", Futura, sans-serif'; g.fillStyle = INK; g.textAlign = 'center'; g.fillText(label, bx, by + 11);
    });
  });
  // map label sign
  g.save(); g.translate(map.sign[0], map.sign[1]); g.rotate(-.04);
  g.font = '900 17px "Arial Rounded MT Bold", Futura, sans-serif';
  const sw = g.measureText(map.name.toUpperCase()).width + 40;
  sticker(g, () => g.roundRect(-sw / 2, -20, sw, 38, 8), PAL.cream, 4);
  g.fillStyle = INK; g.textAlign = 'center'; g.fillText(map.name.toUpperCase(), 0, 6);
  g.restore();
  applyTint(g);
  if (map.id !== prev) loadMap(prev);
  return c;
}
function drawBlocker(g, p, kind, R) {
  switch (kind) {
    case 'water':
      sticker(g, () => g.ellipse(p.x, p.y, p.r + 6, p.r, 0, 0, 7), PAL.water, 5, 3.5);
      g.strokeStyle = '#fff'; g.lineWidth = 2.5;
      for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(p.x - 22 + k * 16, p.y - 14 + k * 12, 6, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
      shape(g, () => { g.moveTo(p.x + 18, p.y + 16); g.arc(p.x + 18, p.y + 16, 10, .5, Math.PI * 2.2); g.closePath(); }, '#6cc04a', 2);
      break;
    case 'rock': {
      const pts = []; for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2, rr = p.r * (.8 + R() * .25); pts.push([p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr * .85]); }
      sticker(g, () => { pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); }, '#bdb2a6', 5, 3.5);
      g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(p.x - p.r * .3, p.y - p.r * .3, p.r * .3, p.r * .15, -.5, 0, 7); g.fill();
      g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.moveTo(p.x - 4, p.y - p.r * .5); g.lineTo(p.x + 3, p.y); g.lineTo(p.x - 2, p.y + p.r * .4); g.stroke();
      sticker(g, () => g.ellipse(p.x + p.r * .9, p.y + p.r * .6, p.r * .3, p.r * .22, 0, 0, 7), '#a89c90', 2, 2.5);
      break;
    }
    case 'ice':
      sticker(g, () => g.ellipse(p.x, p.y, p.r + 6, p.r, 0, 0, 7), '#bfe9f9', 5, 3.5);
      g.strokeStyle = '#fff'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(p.x - p.r * .6, p.y - p.r * .2); g.lineTo(p.x - p.r * .2, p.y - p.r * .55); g.moveTo(p.x - p.r * .3, p.y + p.r * .1); g.lineTo(p.x + p.r * .2, p.y - p.r * .35); g.stroke();
      g.strokeStyle = 'rgba(34,23,43,.35)'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(p.x + p.r * .1, p.y + p.r * .1); g.lineTo(p.x + p.r * .5, p.y + p.r * .4); g.lineTo(p.x + p.r * .7, p.y + p.r * .1); g.stroke();
      break;
    case 'crater':
      sticker(g, () => g.ellipse(p.x, p.y, p.r + 4, p.r * .8, 0, 0, 7), '#cbbdf0', 4, 3.5);
      shape(g, () => g.ellipse(p.x + 3, p.y + 4, p.r * .7, p.r * .5, 0, 0, 7), '#b5a4e6', 2);
      g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.ellipse(p.x - p.r * .35, p.y - p.r * .45, p.r * .4, p.r * .1, -.2, 0, 7); g.fill();
      break;
    case 'speaker': {
      const s = p.r * 1.5;
      sticker(g, () => g.roundRect(p.x - s / 2, p.y - s * .62, s, s * 1.24, 8), '#3b2a52', 5, 3.5);
      shape(g, circ(g, p.x, p.y - s * .25, s * .2), '#a65cff', 2.5); shape(g, circ(g, p.x, p.y - s * .25, s * .07), '#fff', 1.5);
      shape(g, circ(g, p.x, p.y + s * .25, s * .3), '#a65cff', 2.5); shape(g, circ(g, p.x, p.y + s * .25, s * .11), '#fff', 1.5);
      break;
    }
    default: if (BLOCKER_ART[kind]) BLOCKER_ART[kind](g, p, R);
  }
}
function drawDecor(g, kind, x, y, t) {
  switch (kind) {
    case 'island':
      if (t < .45) {
        sticker(g, () => { g.arc(x - 8, y, 10, 0, 7); g.moveTo(x + 18, y); g.arc(x + 8, y - 2, 11, 0, 7); g.moveTo(x + 10, y - 10); g.arc(x, y - 8, 10, 0, 7); }, '#5fb84a', 3, 2.5);
        g.fillStyle = PAL.coral; [[-6, -4], [6, -10], [10, 2]].forEach(([a, b]) => { g.beginPath(); g.arc(x + a, y + b, 2.4, 0, 7); g.fill(); });
      } else if (t < .75) {
        for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; shape(g, circ(g, x + Math.cos(a) * 5, y + Math.sin(a) * 5, 4), k % 2 ? '#fff' : '#ffe3f1', 1.5); }
        shape(g, circ(g, x, y, 3.5), PAL.sun, 1.5);
      } else {
        sticker(g, () => g.ellipse(x, y, 14, 8, -.3, 0, 7), '#e9c48a', 3, 2.5);
        g.fillStyle = '#b8864a'; for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(x - 7 + k * 5, y - 1 + (k % 2) * 3, 1.4, 0, 7); g.fill(); }
      }
      break;
    case 'quarry':
      if (t < .4) { // TNT barrel
        sticker(g, () => g.roundRect(x - 9, y - 12, 18, 24, 4), '#e8334a', 3, 2.5);
        g.fillStyle = '#fff'; g.fillRect(x - 9, y - 4, 18, 5); g.fillStyle = INK; g.font = '900 6px sans-serif'; g.textAlign = 'center'; g.fillText('TNT', x, y + .5);
      } else if (t < .75) { // crate
        sticker(g, () => g.rect(x - 11, y - 11, 22, 22), '#d99a55', 3, 2.5);
        g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 11, y - 11); g.lineTo(x + 11, y + 11); g.moveTo(x + 11, y - 11); g.lineTo(x - 11, y + 11); g.stroke();
      } else { // cone
        sticker(g, () => { g.moveTo(x, y - 14); g.lineTo(x + 8, y + 8); g.lineTo(x - 8, y + 8); g.closePath(); }, '#ff8a1f', 3, 2.5);
        g.fillStyle = '#fff'; g.fillRect(x - 4, y - 3, 8, 3);
      }
      break;
    case 'snow':
      if (t < .5) { // snowy pine
        sticker(g, () => { g.moveTo(x, y - 22); g.lineTo(x + 14, y + 4); g.lineTo(x - 14, y + 4); g.closePath(); g.moveTo(x, y - 12); g.lineTo(x + 17, y + 14); g.lineTo(x - 17, y + 14); g.closePath(); }, '#4fa36b', 3, 2.5);
        shape(g, () => { g.moveTo(x, y - 22); g.lineTo(x + 6, y - 11); g.lineTo(x - 6, y - 11); g.closePath(); }, '#fff', 1.5);
      } else if (t < .75) { // snowman
        sticker(g, circ(g, x, y + 6, 10), '#fff', 3, 2.5); sticker(g, circ(g, x, y - 8, 7), '#fff', 2, 2.5);
        g.fillStyle = INK; g.beginPath(); g.arc(x - 2.5, y - 9, 1.2, 0, 7); g.arc(x + 2.5, y - 9, 1.2, 0, 7); g.fill();
        g.fillStyle = '#ff8a1f'; g.beginPath(); g.moveTo(x, y - 7); g.lineTo(x + 7, y - 6); g.lineTo(x, y - 5); g.fill();
      } else { // gelato cone stuck in the snow
        sticker(g, () => { g.moveTo(x - 7, y - 4); g.lineTo(x + 7, y - 4); g.lineTo(x, y + 14); g.closePath(); }, '#e9b06a', 2, 2.5);
        sticker(g, circ(g, x, y - 7, 8), '#ffb3d1', 2, 2.5);
      }
      break;
    case 'space':
      if (t < .4) { // star
        sticker(g, () => { for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? 4.5 : 11; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); }, PAL.sun, 2, 2.5);
      } else if (t < .75) { // radar dish
        sticker(g, () => g.rect(x - 2, y - 2, 4, 14), '#cdd6e4', 2, 2);
        sticker(g, () => { g.ellipse(x, y - 4, 12, 7, -.4, 0, Math.PI); g.closePath(); }, '#f6f8fc', 2, 2.5);
        shape(g, circ(g, x + 2, y - 9, 2.5), PAL.coral, 1.5);
      } else { // tiny ringed planet
        sticker(g, circ(g, x, y, 8), '#7fd6c9', 2, 2.5);
        g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y, 15, 4, -.3, 0, 7); g.stroke();
      }
      break;
    case 'stage':
      if (t < .4) { // spotlight pool
        g.fillStyle = 'rgba(255,240,150,.55)'; g.beginPath(); g.ellipse(x, y, 24, 12, 0, 0, 7); g.fill();
        sticker(g, () => g.roundRect(x - 6, y - 22, 12, 10, 3), '#3b2a52', 2, 2);
      } else if (t < .75) { // music note
        g.font = '900 26px sans-serif'; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = INK; g.strokeText('♪', x, y + 8); g.fillStyle = '#a65cff'; g.fillText('♪', x, y + 8);
      } else { // mic stand
        g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y - 10); g.lineTo(x, y + 12); g.moveTo(x - 8, y + 12); g.lineTo(x + 8, y + 12); g.stroke();
        sticker(g, () => g.ellipse(x, y - 14, 4.5, 6, 0, 0, 7), '#cdd6e4', 2, 2);
      }
      break;
    default: if (DECOR_ART[kind]) DECOR_ART[kind](g, x, y, t);
  }
}

// ---------- Heroes ----------
function face(ctx, x, y, r, skin, opts = {}) {
  sticker(ctx, circ(ctx, x, y, r), skin, 3, 2.5);
  const ey = y + (opts.ey || 0);
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.ellipse(x - r * .35, ey, r * .1, r * .16, 0, 0, 7); ctx.ellipse(x + r * .35, ey, r * .1, r * .16, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x - r * .32, ey - r * .06, r * .04, 0, 7); ctx.arc(x + r * .38, ey - r * .06, r * .04, 0, 7); ctx.fill();
  if (!opts.noMouth) { ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y + r * .3, r * .22, .2, Math.PI - .2); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,90,78,.35)'; ctx.beginPath(); ctx.arc(x - r * .6, y + r * .25, r * .14, 0, 7); ctx.arc(x + r * .6, y + r * .25, r * .14, 0, 7); ctx.fill();
}
function glasses(ctx, x, y, r) {
  ctx.strokeStyle = INK; ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.arc(x - r * .36, y, r * .25, 0, 7); ctx.moveTo(x + r * .61, y); ctx.arc(x + r * .36, y, r * .25, 0, 7); ctx.moveTo(x - r * .11, y); ctx.lineTo(x + r * .11, y); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(x - r * .36, y, r * .23, 0, 7); ctx.arc(x + r * .36, y, r * .23, 0, 7); ctx.fill();
}
function heldItem(ctx, type, s, tiers) {
  // drawn at origin, already rotated to aim
  switch (type) {
    case 'guiseppe': {
      const col = s && s.fruit === 'melon' ? '#3fa34d' : s && s.fruit === 'lemon' ? '#ffe03a' : '#ff4d3d';
      sticker(ctx, circ(ctx, 0, 0, s && s.fruit === 'melon' ? 9 : 6), col, 2, 2); break;
    }
    case 'julie':
      sticker(ctx, () => { ctx.ellipse(0, 2, 6, 7, 0, 0, 7); ctx.moveTo(4, -4); ctx.ellipse(0, -4, 4, 5, 0, 0, 7); }, s && s.golden ? '#ffcc29' : '#b5d84a', 2, 2);
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(2, -13); ctx.stroke(); break;
    case 'daniel':
      sticker(ctx, circ(ctx, 0, 0, 7.5), '#3a3a48', 2, 2);
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(4, -5); ctx.quadraticCurveTo(8, -10, 11, -8); ctx.stroke();
      ctx.fillStyle = PAL.sun; ctx.beginPath(); ctx.arc(11, -8, 2.6, 0, 7); ctx.fill(); break;
    case 'otis':
      sticker(ctx, () => ctx.roundRect(-4, -5, 18, 10, 3), '#e8f4ff', 2, 2);
      ctx.fillStyle = PAL.water; ctx.fillRect(10, -2.5, 5, 5); break;
    case 'nathan': // baseball bat
      sticker(ctx, () => { ctx.moveTo(-2, -2.5); ctx.lineTo(8, -3); ctx.quadraticCurveTo(20, -6, 21, 0); ctx.quadraticCurveTo(20, 6, 8, 3); ctx.lineTo(-2, 2.5); ctx.closePath(); }, '#d9a25b', 2, 2);
      ctx.fillStyle = INK; ctx.fillRect(-3, -3, 4, 6); break;
    case 'chemmy': // table tennis paddle
      sticker(ctx, () => ctx.roundRect(-2, 4, 4, 9, 2), '#b07a3e', 1.5, 2);
      sticker(ctx, circ(ctx, 0, -1, 7.5), skinFor('chemmy').paddle || '#e8222f', 2, 2);
      ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.arc(-2.5, -3.5, 2.5, 0, 7); ctx.fill(); break;
    default: if (HELD_ART[type]) HELD_ART[type](ctx, s);
  }
}
function drawHero(ctx, type, x, y, sc = 1, ang = 0, s = null, tiers = [0, 0], t = 0) {
  const def = TOWERS[type];
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
  // pad
  const SK = skinFor(type), gold = goldPads();
  sticker(ctx, () => ctx.ellipse(0, 12, 22, 10, 0, 0, 7), gold ? (gold === 'pads_rainbow' ? `hsl(${(t * 80) % 360},85%,62%)` : '#ffcc29') : def.color, 3, 2.5);
  if (gold) { ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.ellipse(8, 13, 5, 2, 0, 0, 7); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(-6, 9, 9, 3, 0, 0, 7); ctx.fill();
  const bob = Math.sin(t * 4) * 1.2;
  ctx.translate(0, bob);
  // held item orbiting toward aim
  const hx = Math.cos(ang) * 20, hy = Math.sin(ang) * 14 + 2;
  const behind = Math.sin(ang) < -0.2;
  const item = () => { ctx.save(); ctx.translate(hx, hy); ctx.rotate(type === 'otis' || type === 'nathan' ? ang : 0); heldItem(ctx, type, s, tiers); ctx.restore(); };
  if (behind) item();
  switch (type) {
    case 'guiseppe': { // a proper apple
      sticker(ctx, () => { ctx.moveTo(0, -13); ctx.bezierCurveTo(-7, -20, -21, -15, -18, 0); ctx.bezierCurveTo(-16, 13, -7, 18, 0, 14); ctx.bezierCurveTo(7, 18, 16, 13, 18, 0); ctx.bezierCurveTo(21, -15, 7, -20, 0, -13); ctx.closePath(); }, SK.body || '#e8262b', 3, 2.5);
      ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(-10, -7, 3, 5.5, .5, 0, 7); ctx.fill();
      ctx.fillStyle = SK.shade || 'rgba(140,10,20,.35)'; ctx.beginPath(); ctx.ellipse(8, 7, 7, 5, -.4, 0, 7); ctx.fill();
      ctx.strokeStyle = '#5a3418'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, -13); ctx.quadraticCurveTo(1, -19, 4, -23); ctx.stroke();
      sticker(ctx, () => ctx.ellipse(10, -20, 7, 3.5, -.45, 0, 7), '#4fb83b', 1.5, 2);
      ctx.strokeStyle = '#2f7a24'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(5, -18); ctx.lineTo(15, -22); ctx.stroke();
      // face on the apple
      ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(-5.5, -3, 1.9, 2.8, 0, 0, 7); ctx.ellipse(5.5, -3, 1.9, 2.8, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-5, -4, .8, 0, 7); ctx.arc(6, -4, .8, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,170,160,.6)'; ctx.beginPath(); ctx.arc(-10, 3, 2.6, 0, 7); ctx.arc(10, 3, 2.6, 0, 7); ctx.fill();
      shape(ctx, () => { ctx.moveTo(0, 2); ctx.quadraticCurveTo(-5, -1, -9, 4); ctx.quadraticCurveTo(-4, 6, 0, 4); ctx.quadraticCurveTo(4, 6, 9, 4); ctx.quadraticCurveTo(5, -1, 0, 2); }, '#4a2a1a', 1.5);
      ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(0, 6, 3.5, .3, Math.PI - .3); ctx.stroke();
      break;
    }
    case 'julie': {
      shape(ctx, () => { ctx.ellipse(0, -2, 15, 16, 0, 0, 7); }, '#ffe066', 2.5); // hair back
      sticker(ctx, () => ctx.roundRect(-11, 8, 22, 10, 4), SK.coat || '#b07a3e', 2, 2.5); // coat
      face(ctx, 0, -2, 11, PAL.skin, {ey: -1});
      glasses(ctx, 0, -2, 11);
      shape(ctx, () => { ctx.moveTo(-12, -6); ctx.quadraticCurveTo(-4, -16, 10, -8); ctx.quadraticCurveTo(12, -14, 0, -15); ctx.closePath(); }, '#ffe066', 2);
      // deerstalker
      sticker(ctx, () => { ctx.ellipse(0, -13, 13, 7, 0, Math.PI, 0); ctx.lineTo(16, -11); ctx.lineTo(-16, -11); ctx.closePath(); }, SK.hat || '#9c6b3a', 2, 2.5);
      ctx.strokeStyle = SK.band || '#6b4424'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-8, -17); ctx.lineTo(-6, -12); ctx.moveTo(0, -20); ctx.lineTo(0, -12); ctx.moveTo(8, -17); ctx.lineTo(6, -12); ctx.stroke();
      break;
    }
    case 'daniel': {
      sticker(ctx, () => ctx.roundRect(-12, 6, 24, 12, 4), SK.vest || '#5b6b3a', 2, 2.5); // army vest
      ctx.fillStyle = SK.stripe || PAL.sun; ctx.fillRect(-12, 10, 24, 3);
      face(ctx, 0, -3, 12, PAL.skin2, {ey: 0});
      // black fringe
      shape(ctx, () => { ctx.moveTo(-13, -2); ctx.quadraticCurveTo(-14, -17, 0, -17); ctx.quadraticCurveTo(14, -17, 13, -4); ctx.lineTo(8, -7); ctx.lineTo(4, -4); ctx.lineTo(-1, -8); ctx.lineTo(-5, -4); ctx.lineTo(-9, -7); ctx.closePath(); }, '#15121a', 2);
      // goggles strap
      ctx.strokeStyle = SK.strap || PAL.coral; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -3, 12.5, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
      break;
    }
    case 'otis': { // space dog
      sticker(ctx, () => ctx.roundRect(-12, 6, 24, 13, 5), '#f2f6ff', 2, 2.5); // suit
      ctx.fillStyle = PAL.coral; ctx.fillRect(-3, 9, 6, 6);
      ctx.fillStyle = PAL.sun; ctx.beginPath(); ctx.arc(0, 12, 1.6, 0, 7); ctx.fill();
      sticker(ctx, circ(ctx, 0, -4, 15), '#e6f7ff', 3, 2.5); // helmet
      // floppy ears behind the head
      shape(ctx, () => ctx.ellipse(-9, -2, 4, 8, .35, 0, 7), SK.ear || '#8a5a2b', 2);
      shape(ctx, () => ctx.ellipse(9, -2, 4, 8, -.35, 0, 7), SK.ear || '#8a5a2b', 2);
      shape(ctx, () => ctx.ellipse(0, -5, 8.5, 8, 0, 0, 7), SK.fur || '#e0a35e', 2); // head
      ctx.fillStyle = SK.patch || '#fff1d8'; ctx.beginPath(); ctx.ellipse(-3.5, -9, 3, 2.5, 0, 0, 7); ctx.fill(); // eye patch
      shape(ctx, () => ctx.ellipse(0, -1, 5, 3.8, 0, 0, 7), '#fff1d8', 1.5); // snout
      ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(0, -2.6, 2.3, 1.6, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(-3.5, -8, 1.5, 0, 7); ctx.arc(3.5, -8, 1.5, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-3.1, -8.5, .6, 0, 7); ctx.arc(3.9, -8.5, .6, 0, 7); ctx.fill();
      shape(ctx, () => ctx.ellipse(1.2, 2.8, 1.8, 2.4, 0, 0, Math.PI), '#ff7b9c', 1.2); // tongue
      ctx.fillStyle = 'rgba(95,208,214,.25)'; ctx.beginPath(); ctx.arc(0, -4, 13, 0, 7); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -4, 13, 0, 7); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(-6, -11, 4, 2, -.6, 0, 7); ctx.fill();
      ctx.strokeStyle = INK; ctx.beginPath(); ctx.moveTo(8, -17); ctx.lineTo(11, -24); ctx.stroke();
      shape(ctx, circ(ctx, 11, -25, 3), PAL.coral, 1.5);
      break;
    }
    case 'nathan': {
      sticker(ctx, () => ctx.roundRect(-12, 6, 24, 12, 4), SK.jersey || '#fff', 2, 2.5); // jersey
      ctx.fillStyle = SK.stripe || '#2f6fe0'; ctx.fillRect(-11, 9, 22, 2.5);
      ctx.font = '900 6px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = SK.stripe || '#2f6fe0'; ctx.fillText('1', 0, 17);
      // brown curls poking out
      for (const [cx, cy] of [[-12, -4], [-11, 2], [12, -4], [11, 2], [-8, -12], [8, -12]]) shape(ctx, circ(ctx, cx, cy, 4.2), '#7a4a26', 1.8);
      face(ctx, 0, -2, 11, PAL.skin, {ey: -1});
      // baseball cap
      sticker(ctx, () => { ctx.arc(0, -9, 11.5, Math.PI, 0); ctx.closePath(); }, SK.cap || '#2f6fe0', 2, 2.5);
      sticker(ctx, () => ctx.ellipse(7, -9, 10, 3, .1, 0, 7), SK.brim || '#2a5bc0', 1.5, 2);
      ctx.fillStyle = '#fff'; ctx.font = '900 7px sans-serif'; ctx.fillText('W', -1, -12);
      break;
    }
    case 'chemmy': {
      sticker(ctx, () => ctx.roundRect(-12, 6, 24, 12, 4), SK.polo || '#ff8a1f', 2, 2.5); // polo
      shape(ctx, () => { ctx.moveTo(0, 8); ctx.lineTo(-6, 5); ctx.lineTo(-6, 11); ctx.closePath(); ctx.moveTo(0, 8); ctx.lineTo(6, 5); ctx.lineTo(6, 11); ctx.closePath(); }, SK.tie || '#e8222f', 1.5); // host bow tie
      face(ctx, 0, -3, 12, PAL.skin2, {ey: -1});
      shape(ctx, () => { ctx.arc(0, -5, 12.5, Math.PI * 1.02, Math.PI * 1.98); ctx.quadraticCurveTo(6, -13, 0, -12); ctx.quadraticCurveTo(-6, -13, -12.4, -6.5); ctx.closePath(); }, '#1d1720', 2); // hair
      ctx.fillStyle = '#fff'; ctx.fillRect(-12, -11, 24, 3.5); // sweatband
      ctx.fillStyle = '#ff8a1f'; ctx.fillRect(-12, -10, 24, 1.4);
      ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.strokeRect(-12, -11, 24, 3.5);
      break;
    }
    default: if (HERO_ART[type]) HERO_ART[type](ctx, SK, t, s);
  }
  if (!behind) item();
  ctx.restore();
  // tier pips, one colour per path, shown as e.g. 3-2-0
  const pips = [];
  tiers.forEach((n, p) => { for (let i = 0; i < n; i++) pips.push(PATH_COLS[p]); });
  pips.forEach((col, i) => shape(ctx, circ(ctx, x + (i - (pips.length - 1) / 2) * 7, y + 26 * sc, 3), col, 1.5));
  heroExtras(ctx, x, y, sc, s, t);
}
const PATH_COLS = ['#ffcc29', '#5fd0d6', '#ff5a4e'];

// ---------- Enemies ----------
function eyes(ctx, x, y, r, dir, angry) {
  const lx = Math.cos(dir) * r * .12, ly = Math.sin(dir) * r * .12;
  for (const sx of [-1, 1]) {
    shape(ctx, circ(ctx, x + sx * r * .32, y, r * .24), '#fff', 1.6);
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x + sx * r * .32 + lx, y + ly, r * .11, 0, 7); ctx.fill();
  }
  if (angry) { ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x - r * .55, y - r * .32); ctx.lineTo(x - r * .12, y - r * .18); ctx.moveTo(x + r * .55, y - r * .32); ctx.lineTo(x + r * .12, y - r * .18); ctx.stroke(); }
}
function drawEnemy(ctx, e, t) {
  const d = ENEMIES[e.type], r = d.r, x = e.x, y = e.y;
  const squash = 1 + Math.sin(t * 10 + e.seed) * .06;
  ctx.save();
  if (d.camo) { ctx.globalAlpha = e.revealed ? .9 : .55; }
  if (d.fly) { ctx.fillStyle = 'rgba(34,23,43,.18)'; ctx.beginPath(); ctx.ellipse(x, y + 16, r * .9, r * .35, 0, 0, 7); ctx.fill(); }
  ctx.translate(x, y - (d.fly ? 12 + Math.sin(t * 6 + e.seed) * 3 : 0)); ctx.scale(1 / squash, squash);
  const fill = e.flash > 0 ? '#fff' : d.color;
  switch (d.shape) {
    case 'blob': sticker(ctx, () => ctx.ellipse(0, 0, r, r * .85, 0, 0, 7), fill, 3, 2.5);
      ctx.fillStyle = '#c03a30'; [[-5, 4], [4, -5], [6, 5]].forEach(([a, b]) => { ctx.beginPath(); ctx.arc(a, b, 1.8, 0, 7); ctx.fill(); });
      eyes(ctx, 0, -2, r, e.ang); break;
    case 'drip': sticker(ctx, () => { ctx.arc(0, -2, r, Math.PI, 0); ctx.lineTo(r, 4); ctx.quadraticCurveTo(r * .6, r, r * .3, 5); ctx.quadraticCurveTo(0, r * 1.1, -r * .4, 5); ctx.quadraticCurveTo(-r * .8, r * .9, -r, 4); ctx.closePath(); }, fill, 3, 2.5);
      shape(ctx, circ(ctx, 0, -r - 2, 3), PAL.coral, 1.5); eyes(ctx, 0, -2, r, e.ang); break;
    case 'bull': sticker(ctx, () => ctx.ellipse(0, 0, r * 1.1, r * .85, 0, 0, 7), fill, 3, 2.5);
      shape(ctx, () => { ctx.moveTo(-r * .7, -r * .5); ctx.quadraticCurveTo(-r * 1.3, -r, -r * 1.1, -r * 1.3); ctx.moveTo(r * .7, -r * .5); ctx.quadraticCurveTo(r * 1.3, -r, r * 1.1, -r * 1.3); }, null, 3);
      shape(ctx, () => ctx.ellipse(0, r * .35, r * .5, r * .3, 0, 0, 7), '#f2b88a', 2); eyes(ctx, 0, -3, r, e.ang, true); break;
    case 'crab':
      for (const sx of [-1, 1]) sticker(ctx, () => { ctx.arc(sx * r * 1.15, -r * .35, r * .42, 0, 7); }, '#ff6a2a', 2, 2.5);
      sticker(ctx, () => ctx.ellipse(0, 0, r, r * .8, 0, 0, 7), fill, 3, 2.5);
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 6, r * .7, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 12, r * .7, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke();
      eyes(ctx, 0, -r * .45, r, e.ang); break;
    case 'ghost': sticker(ctx, () => { ctx.arc(0, -2, r, Math.PI, 0); ctx.lineTo(r, r * .8); for (let k = 0; k < 4; k++) ctx.lineTo(r - (k + .5) * r * .5, r * (k % 2 ? .8 : .4)); ctx.lineTo(-r, r * .8); ctx.closePath(); }, fill, 0, 2.5);
      ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(-4, -3, 2.4, 3.5, 0, 0, 7); ctx.ellipse(4, -3, 2.4, 3.5, 0, 0, 7); ctx.fill();
      ctx.font = '900 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('♪', r * .9, -r * .8); break;
    case 'brute': sticker(ctx, () => ctx.roundRect(-r, -r * .9, r * 2, r * 1.8, r * .5), fill, 4, 3);
      shape(ctx, () => { ctx.moveTo(-r * .5, r * .35); ctx.lineTo(-r * .3, r * .6); ctx.lineTo(-r * .1, r * .35); ctx.lineTo(r * .1, r * .6); ctx.lineTo(r * .3, r * .35); ctx.lineTo(r * .5, r * .6); }, null, 2.5);
      eyes(ctx, 0, -r * .2, r, e.ang, true); break;
    case 'toro': sticker(ctx, () => ctx.ellipse(0, 0, r * 1.1, r * .9, 0, 0, 7), fill, 5, 3.5);
      shape(ctx, () => { ctx.moveTo(-r * .7, -r * .55); ctx.quadraticCurveTo(-r * 1.5, -r * .9, -r * 1.3, -r * 1.5); ctx.quadraticCurveTo(-r * 1.1, -r, -r * .4, -r * .8); ctx.moveTo(r * .7, -r * .55); ctx.quadraticCurveTo(r * 1.5, -r * .9, r * 1.3, -r * 1.5); ctx.quadraticCurveTo(r * 1.1, -r, r * .4, -r * .8); }, '#fff2d6', 3);
      shape(ctx, () => ctx.ellipse(0, r * .38, r * .55, r * .32, 0, 0, 7), '#d99a6a', 2.5);
      ctx.strokeStyle = PAL.sun; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(0, r * .62, r * .18, 0, Math.PI); ctx.stroke();
      eyes(ctx, 0, -r * .15, r, e.ang, true); break;
    case 'king':
      for (const sx of [-1, 1]) sticker(ctx, () => { ctx.ellipse(sx * r * 1.15, -r * .1, r * .45, r * .32, sx * .4, 0, 7); }, '#2f8a57', 3, 3);
      sticker(ctx, () => ctx.ellipse(0, 0, r, r * .85, 0, 0, 7), fill, 5, 3.5);
      shape(ctx, () => { ctx.moveTo(-r * .55, -r * .7); ctx.lineTo(-r * .55, -r * 1.25); ctx.lineTo(-r * .27, -r * .95); ctx.lineTo(0, -r * 1.35); ctx.lineTo(r * .27, -r * .95); ctx.lineTo(r * .55, -r * 1.25); ctx.lineTo(r * .55, -r * .7); ctx.closePath(); }, PAL.sun, 2.5);
      shape(ctx, circ(ctx, 0, -r * .95, 3.5), PAL.coral, 1.5);
      eyes(ctx, 0, -r * .15, r, e.ang, true);
      shape(ctx, () => { ctx.moveTo(-r * .4, r * .35); ctx.quadraticCurveTo(0, r * .15, r * .4, r * .35); }, null, 3); break;
    case 'octo':
      for (let k = 0; k < 6; k++) { const a = Math.PI * .15 + k * Math.PI * .14, w = Math.sin(t * 5 + k) * 6;
        sticker(ctx, () => { ctx.moveTo(Math.cos(a) * r * .5, Math.sin(a) * r * .3); ctx.quadraticCurveTo(Math.cos(a) * r * 1.2 + w, Math.sin(a) * r * 1.1, Math.cos(a) * r * 1.4 + w, Math.sin(a) * r * 1.3); ctx.quadraticCurveTo(Math.cos(a) * r * .9, Math.sin(a) * r * .9, Math.cos(a + .3) * r * .4, Math.sin(a + .3) * r * .3); }, (toonCols() ? toonCols()[0] : '#c41f37'), 2, 2.5); }
      sticker(ctx, () => ctx.ellipse(0, -r * .15, r, r * .85, 0, 0, 7), toonCols() && e.flash <= 0 ? toonCols()[1] : fill, 5, 3.5);
      shape(ctx, () => { ctx.moveTo(-r * .6, -r * .8); ctx.quadraticCurveTo(-r * .9, -r * 1.4, -r * .3, -r * 1.3); ctx.moveTo(r * .6, -r * .8); ctx.quadraticCurveTo(r * .9, -r * 1.4, r * .3, -r * 1.3); }, null, 3.5);
      ctx.fillStyle = PAL.sun; ctx.beginPath(); ctx.arc(r * .45, -r * .75, r * .2, .6, Math.PI * 1.6); ctx.arc(r * .55, -r * .82, r * .15, Math.PI * 1.6, .6, true); ctx.fill();
      eyes(ctx, 0, -r * .2, r, e.ang, true);
      shape(ctx, () => { ctx.moveTo(-r * .35, r * .25); ctx.lineTo(-r * .15, r * .4); ctx.lineTo(0, r * .25); ctx.lineTo(r * .15, r * .4); ctx.lineTo(r * .35, r * .25); }, null, 2.5); break;
    default: if (ENEMY_ART[d.shape]) ENEMY_ART[d.shape](ctx, e, r, fill, t);
  }
  ctx.restore();
  if (e.stun > 0) { ctx.fillStyle = PAL.sun; ctx.font = '900 11px sans-serif'; ctx.textAlign = 'center'; for (let k = 0; k < 3; k++) { const a = t * 6 + k * 2.1; ctx.fillText('★', x + Math.cos(a) * r, y - r - 4 + Math.sin(a) * 4); } }
  if (e.shieldT > 0) { ctx.strokeStyle = 'rgba(95,184,255,.9)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, r + 10, 0, 7); ctx.stroke(); ctx.fillStyle = 'rgba(95,184,255,.18)'; ctx.fill(); }
  if (e.slow > 0) { ctx.strokeStyle = 'rgba(63,193,201,.8)'; ctx.lineWidth = 3; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(x, y, r + 5, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
  if (e.hp < e.maxHp && e.maxHp > 2) {
    const bw = d.boss ? 70 : r * 2, by = y - r - (d.boss ? 22 : 10);
    ctx.fillStyle = INK; ctx.fillRect(x - bw / 2 - 2, by - 2, bw + 4, 8);
    ctx.fillStyle = d.boss ? PAL.coral : '#7be36b'; ctx.fillRect(x - bw / 2, by, bw * e.hp / e.maxHp, 4);
  }
}

// ---------- Projectiles & FX ----------
const FRUITS = ['#ff4d3d', '#ff9f1a', '#b5d84a', '#a64dff'];
function drawProjectile(ctx, p) {
  if (p.kind === 'fruit') {
    const col = p.fruit === 'melon' ? '#3fa34d' : p.fruit === 'lemon' ? '#ffe03a' : p.col;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.spin);
    sticker(ctx, circ(ctx, 0, 0, 6 * (p.size || 1)), col, 2, 2);
    ctx.fillStyle = '#3d8a2e'; ctx.fillRect(-1, -6 * (p.size || 1) - 3, 2.5, 4);
    ctx.restore();
  } else if (p.kind === 'bomb') {
    const k = p.t / p.dur, lift = Math.sin(k * Math.PI) * 50;
    ctx.fillStyle = 'rgba(34,23,43,.25)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, 7, 3, 0, 0, 7); ctx.fill();
    sticker(ctx, circ(ctx, p.x, p.y - lift, p.nuke ? 10 : 7), p.nuke ? '#ffcc29' : '#3a3a48', 2, 2);
  } else if (p.kind === 'ball') {
    const r = 5 * p.size;
    if (p.hr) { ctx.fillStyle = 'rgba(255,204,41,.45)'; ctx.beginPath(); ctx.arc(p.x, p.y, r + 7, 0, 7); ctx.fill(); }
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.spin);
    sticker(ctx, circ(ctx, 0, 0, r), '#fff', 2, 2);
    ctx.strokeStyle = '#e8222f'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(-r * 1.1, 0, r * .8, -.9, .9); ctx.stroke(); ctx.beginPath(); ctx.arc(r * 1.1, 0, r * .8, Math.PI - .9, Math.PI + .9); ctx.stroke();
    ctx.restore();
  } else if (p.kind === 'pong') {
    p.trail.forEach((q, i) => { ctx.fillStyle = `rgba(255,138,31,${(i + 1) / 14})`; ctx.beginPath(); ctx.arc(q.x, q.y, 2 + i * .4, 0, 7); ctx.fill(); });
    sticker(ctx, circ(ctx, p.x, p.y, 4.5), '#fff8ec', 2, 2);
    ctx.fillStyle = '#ff8a1f'; ctx.beginPath(); ctx.arc(p.x - 1, p.y - 1, 1.6, 0, 7); ctx.fill();
  } else if (PROJ_ART[p.kind]) PROJ_ART[p.kind](ctx, p);
}
function drawFx(ctx, f) {
  const k = f.t / f.life;
  ctx.save(); ctx.globalAlpha = Math.max(0, 1 - k);
  switch (f.kind) {
    case 'flash': ctx.fillStyle = f.col; ctx.fillRect(-20, -20, W + 40, H + 40); break;
    case 'boom': {
      const r = f.r * (0.4 + k * .8);
      ctx.fillStyle = k < .3 ? '#fff' : f.col || PAL.sun; ctx.strokeStyle = INK; ctx.lineWidth = 3;
      ctx.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, rr = i % 2 ? r * .65 : r; ctx.lineTo(f.x + Math.cos(a) * rr, f.y + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); ctx.stroke();
      break; }
    case 'ring': ctx.strokeStyle = f.col; ctx.lineWidth = 6 * (1 - k) + 1; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (.2 + k * .8), 0, 7); ctx.stroke();
      ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (.2 + k * .8) + 4, 0, 7); ctx.stroke(); break;
    case 'beam': ctx.lineCap = 'round';
      ctx.strokeStyle = INK; ctx.lineWidth = f.w + 6; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x2, f.y2); ctx.stroke();
      ctx.strokeStyle = f.col; ctx.lineWidth = f.w; ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = f.w * .35; ctx.stroke(); break;
    case 'tracer': ctx.strokeStyle = f.col; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x2, f.y2); ctx.stroke(); break;
    case 'bit': ctx.fillStyle = f.col; ctx.translate(f.x, f.y); ctx.rotate(f.rot); ctx.fillRect(-f.s / 2, -f.s / 2, f.s, f.s); ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.strokeRect(-f.s / 2, -f.s / 2, f.s, f.s); break;
    case 'text': ctx.translate(f.x, f.y - k * 24); ctx.rotate(f.rot); ctx.font = `900 ${f.size}px "Arial Rounded MT Bold", Futura, sans-serif`; ctx.textAlign = 'center';
      ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.strokeText(f.txt, 0, 0); ctx.fillStyle = f.col; ctx.fillText(f.txt, 0, 0); break;
    case 'hole': ctx.translate(f.x, f.y); ctx.rotate(k * 8);
      for (let i = 0; i < 3; i++) { ctx.strokeStyle = i % 2 ? '#3b2a52' : '#a65cff'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, f.r * (1 - k) * (1 - i * .25), i, i + 4); ctx.stroke(); }
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(0, 0, 14 * (1 - k * .5), 0, 7); ctx.fill(); break;
    default: if (FX_ART[f.kind]) FX_ART[f.kind](ctx, f, k);
  }
  ctx.restore();
}
