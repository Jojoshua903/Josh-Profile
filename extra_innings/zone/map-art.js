'use strict';
/* =========================================================
   MAP ART: ink illustrations for the parchment map
   (landmark sketches, watercolour washes, rock hatching,
   bestiary doodles, ornate frame). All drawn with `g`.
   ========================================================= */
const MAP_TINT = { crash: '200,110,60', climb: '150,110,70', pipes: '70,140,140', alley: '120,70,150', server: '190,60,60', hub: '220,160,60', cellar: '140,100,60' };

function mapInk(g, lw = 1.3, a = 1) { g.strokeStyle = `rgba(58,38,22,${a})`; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round'; }
function wob(g, pts, close) {          // slightly shaky hand-drawn polyline
  g.beginPath();
  pts.forEach(([x, y], i) => { const jx = Math.sin(x * 1.7 + y) * 0.4, jy = Math.cos(y * 1.3 + x) * 0.4; i ? g.lineTo(x + jx, y + jy) : g.moveTo(x + jx, y + jy); });
  if (close) g.closePath();
}

/* watercolour wash + rock hatching for explored rooms */
function mapWashAndHatch(g, X, Y, s, V, rooms = ROOMS) {
  for (const rm of rooms) if (V[rm.id]) {
    const tint = rm.tint || MAP_TINT[rm.id] || '150,110,70';
    for (let ty = rm.y0; ty < rm.y0 + rm.th; ty++) for (let tx = rm.x0; tx < rm.x0 + rm.tw; tx++) {
      if (tileAt(tx, ty) === 1) continue;
      g.fillStyle = `rgba(${tint},${0.07 + mhash(tx, ty) * 0.08})`;
      g.fillRect(X(tx) - 0.3, Y(ty) - 0.3, s + 0.6, s + 0.6);
    }
  }
  // hatch solid rock that borders open space (gives walls weight, like an inked cave map)
  mapInk(g, 0.9, 0.38);
  g.beginPath();
  for (const rm of rooms) if (V[rm.id])
    for (let ty = rm.y0; ty < rm.y0 + rm.th; ty++) for (let tx = rm.x0; tx < rm.x0 + rm.tw; tx++) {
      if (tileAt(tx, ty) !== 1) continue;
      let near = false;
      for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2 && !near; dx++) { const t = tileAt(tx + dx, ty + dy); if (t !== 1) near = true; }
      if (!near) continue;
      const x = X(tx), y = Y(ty), h = mhash(tx, ty);
      if (h < 0.15) continue;
      g.moveTo(x + s * 0.1, y + s * 0.9); g.lineTo(x + s * 0.55, y + s * 0.2);
      if (h > 0.5) { g.moveTo(x + s * 0.45, y + s * 0.95); g.lineTo(x + s * 0.95, y + s * 0.3); }
    }
  g.stroke();
}

/* faint sketch of the Spire looming in the empty sky above the zone */
function mapSpireSketch(g, X, Y, s) {
  const cx = X(70), base = Y(22), top = Y(1.5);
  g.save(); g.globalAlpha = 0.22;
  mapInk(g, 1.2);
  let w = s * 18, y = base;
  const tiers = 6, th = (base - top) / (tiers + 1);
  for (let i = 0; i < tiers; i++) {
    wob(g, [[cx - w / 2, y], [cx - w / 2, y - th], [cx + w / 2, y - th], [cx + w / 2, y]]); g.stroke();
    for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(cx - w / 2 + (w / 4) * k, y - th * 0.3); g.lineTo(cx - w / 2 + (w / 4) * k, y - th * 0.7); g.stroke(); }
    g.beginPath(); g.moveTo(cx - w / 2 - 4, y - th); g.lineTo(cx + w / 2 + 4, y - th); g.stroke();
    y -= th; w *= 0.78;
  }
  // stadium crown + floating trophies
  g.beginPath(); g.ellipse(cx, y - 2, w * 1.1, th * 0.35, 0, Math.PI, 0); g.stroke();
  for (const ox of [-1, 1]) {
    const tx = cx + ox * w * 1.6, ty = y - th * 0.3;
    wob(g, [[tx - 6, ty - 6], [tx + 6, ty - 6], [tx + 4, ty + 2], [tx, ty + 4], [tx - 4, ty + 2]], true); g.stroke();
    g.beginPath(); g.moveTo(tx, ty + 4); g.lineTo(tx, ty + 9); g.moveTo(tx - 4, ty + 9); g.lineTo(tx + 4, ty + 9); g.stroke();
  }
  // lightning
  wob(g, [[cx + w * 0.4, y - th * 0.9], [cx + w * 0.1, y - th * 0.3], [cx + w * 0.35, y - th * 0.35], [cx + w * 0.05, y + th * 0.4]]); g.stroke();
  g.restore();
  g.save(); g.translate(cx + s * 12, Y(12)); g.rotate(-0.05);
  g.font = 'italic 13px "Iowan Old Style", Palatino, Georgia, serif'; g.fillStyle = 'rgba(58,38,22,.5)'; g.textAlign = 'left';
  g.fillText('The Spire — up, up, up.', 0, 0); g.fillText('Evil Adam waits at the top.', 0, 16);
  g.restore();
}

/* landmark vignettes inside explored rooms */
function mapLandmarks(g, X, Y, s, V) {
  const D = Save.data;
  if (V.crash) {
    // jumbotron
    const jx = X(15), jy = Y(46.5), jw = 13 * s, jh = 6 * s;
    mapInk(g, 1.3); wob(g, [[jx, jy], [jx + jw, jy], [jx + jw, jy + jh], [jx, jy + jh]], true);
    g.fillStyle = 'rgba(40,25,40,.22)'; g.fill(); g.stroke();
    mapInk(g, 0.7, 0.5); for (let k = 1; k < 6; k++) { g.beginPath(); g.moveTo(jx + 3, jy + (jh / 6) * k); g.lineTo(jx + jw - 3, jy + (jh / 6) * k); g.stroke(); }
    mapInk(g, 1.2); g.beginPath(); g.moveTo(jx + jw * 0.25, jy); g.lineTo(jx + jw * 0.25, jy - s * 1.5); g.moveTo(jx + jw * 0.75, jy); g.lineTo(jx + jw * 0.75, jy - s * 1.5); g.stroke();
    g.beginPath(); g.arc(jx + jw / 2, jy + jh * 0.45, s * 0.9, 0, 7); g.stroke();                 // Evil Adam's silhouette
    g.fillStyle = 'rgba(58,38,22,.8)'; g.fillRect(jx + jw / 2 - s * 0.5, jy + jh * 0.4, s * 0.3, 1.2); g.fillRect(jx + jw / 2 + s * 0.2, jy + jh * 0.4, s * 0.3, 1.2);
    // bleacher pile with the cracked baseball
    mapInk(g, 1.1);
    for (let k = 0; k < 3; k++) { wob(g, [[X(3 + k * 0.6), Y(61 - k)], [X(9 - k * 0.6), Y(61 - k)]]); g.stroke(); }
    const bx = X(6), by = Y(57.5); g.beginPath(); g.arc(bx, by, s * 0.9, 0, 7); g.fillStyle = '#f4e8cc'; g.fill(); g.stroke();
    mapInk(g, 0.8, 0.8); g.beginPath(); g.moveTo(bx - 1, by - s * 0.8); g.lineTo(bx + 1, by - 1); g.lineTo(bx - 1, by + s * 0.7); g.stroke();
  }
  if (V.climb) {
    // stacked stadium seats on the back wall
    mapInk(g, 1, 0.75);
    for (let k = 0; k < 6; k++) {
      const y = Y(42 - k * 2.2), x0 = X(42 + k * 1.2), x1 = X(52 - k * 0.4);
      wob(g, [[x0, y], [x1, y]]); g.stroke();
      for (let x = x0 + s; x < x1 - s * 0.5; x += s * 1.4) { g.beginPath(); g.arc(x, y - s * 0.35, s * 0.35, Math.PI, 0); g.stroke(); }
    }
    // a floodlight tower
    const fx = X(58), fy = Y(24.5);
    mapInk(g, 1.2); g.beginPath(); g.moveTo(fx, fy + s * 6); g.lineTo(fx, fy); g.stroke();
    wob(g, [[fx - s * 1.8, fy - s * 1.2], [fx + s * 1.8, fy - s * 1.2], [fx + s * 1.8, fy], [fx - s * 1.8, fy]], true); g.stroke();
    for (let k = -1; k <= 1; k++) { g.beginPath(); g.arc(fx + k * s * 1.1, fy - s * 0.6, s * 0.35, 0, 7); g.stroke(); }
    mapInk(g, 0.7, 0.35); for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(fx + k * s * 0.6, fy); g.lineTo(fx + k * s * 2, fy + s * 5); g.stroke(); }
  }
  if (V.pipes) {
    // ceiling pipe runs with joints and a valve wheel
    mapInk(g, 1.1);
    const y1 = Y(23.6), y2 = Y(24.6);
    wob(g, [[X(90), y1], [X(138), y1]]); g.stroke(); wob(g, [[X(90), y2], [X(138), y2]]); g.stroke();
    for (let x = 92; x < 138; x += 7) { g.beginPath(); g.moveTo(X(x), y1 - 1.5); g.lineTo(X(x), y2 + 1.5); g.stroke(); }
    const vx = X(118), vy = Y(26.5);
    g.beginPath(); g.moveTo(vx, y2); g.lineTo(vx, vy - s * 0.9); g.stroke();
    g.beginPath(); g.arc(vx, vy, s * 0.9, 0, 7); g.stroke();
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 4; g.beginPath(); g.moveTo(vx + Math.cos(a) * s * 0.9, vy + Math.sin(a) * s * 0.9); g.lineTo(vx - Math.cos(a) * s * 0.9, vy - Math.sin(a) * s * 0.9); g.stroke(); }
    // drips
    g.fillStyle = 'rgba(70,140,140,.6)';
    for (const dx of [99, 106, 127, 133]) { g.beginPath(); g.moveTo(X(dx), Y(25.2)); g.quadraticCurveTo(X(dx) + 2, Y(26), X(dx), Y(26.3)); g.quadraticCurveTo(X(dx) - 2, Y(26), X(dx), Y(25.2)); g.fill(); }
  }
  if (V.alley) {
    // neon signs, bins, and two eyes in the dark
    const sign = (tx, ty, text, rot) => {
      g.save(); g.translate(X(tx), Y(ty)); g.rotate(rot); mapInk(g, 1.2);
      g.font = `bold ${Math.max(9, s * 2)}px Georgia, serif`; const tw = g.measureText(text).width + 8;
      wob(g, [[-tw / 2, -s * 1.3], [tw / 2, -s * 1.3], [tw / 2, s * 1.1], [-tw / 2, s * 1.1]], true); g.fillStyle = 'rgba(120,70,150,.18)'; g.fill(); g.stroke();
      g.fillStyle = 'rgba(58,38,22,.85)'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 0, 0);
      g.restore();
    };
    sign(134, 9, 'OPEN', -0.06); sign(150, 6, 'EAT', 0.08);
    mapInk(g, 1.1);
    for (const bx of [132, 142]) { wob(g, [[X(bx), Y(21)], [X(bx) + s * 0.2, Y(19)], [X(bx + 1.6) - s * 0.2, Y(19)], [X(bx + 1.6), Y(21)]]); g.stroke(); g.beginPath(); g.moveTo(X(bx) - 1, Y(19)); g.lineTo(X(bx + 1.6) + 1, Y(19)); g.stroke(); }
    const ex = X(123), ey = Y(19.5);
    g.fillStyle = 'rgba(20,12,20,.55)'; g.beginPath(); g.ellipse(ex, ey, s * 2.4, s * 1.6, 0, 0, 7); g.fill();
    g.fillStyle = '#f4e8cc'; g.beginPath(); g.ellipse(ex - s * 0.5, ey, 1.4, 2.4, 0, 0, 7); g.ellipse(ex + s * 0.5, ey, 1.4, 2.4, 0, 0, 7); g.fill();
  }
  if (V.server) {
    // the server tower (crossed out once scrapped)
    const cx = X(180), by = Y(41), w = s * 5, h = s * 7;
    mapInk(g, 1.2);
    wob(g, [[cx - w * 0.7, by], [cx - w * 0.4, by - h * 0.6], [cx + w * 0.4, by - h * 0.6], [cx + w * 0.7, by]]); g.fillStyle = 'rgba(190,60,60,.12)'; g.fill(); g.stroke();
    for (const [ox, oy, mw, mh] of [[-0.35, 0.72, 0.4, 0.22], [0.05, 0.7, 0.38, 0.2], [-0.2, 0.95, 0.45, 0.25]]) {
      const mx = cx + ox * w, my = by - oy * h;
      wob(g, [[mx, my], [mx + mw * w, my], [mx + mw * w, my + mh * h], [mx, my + mh * h]], true); g.fillStyle = '#f4e8cc'; g.fill(); g.stroke();
      g.fillStyle = 'rgba(58,38,22,.8)'; g.font = `${Math.max(7, s * 1.3)}px Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(D.bossDead ? '× ×' : '> <', mx + mw * w / 2, my + mh * h / 2);
    }
    mapInk(g, 0.9, 0.7); for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(cx - w * 0.3 + k * w * 0.2, by - h * 0.95); g.bezierCurveTo(cx - w * 0.5 + k * w * 0.3, Y(28), cx + k * w * 0.1, Y(26), cx - w * 0.6 + k * w * 0.4, Y(23.4)); g.stroke(); }
    if (D.bossDead) { mapInk(g, 2.2, 0.75); g.strokeStyle = 'rgba(138,42,26,.75)'; g.beginPath(); g.moveTo(cx - w * 0.8, by - h * 1.05); g.lineTo(cx + w * 0.8, by + 2); g.moveTo(cx + w * 0.8, by - h * 1.05); g.lineTo(cx - w * 0.8, by + 2); g.stroke(); }
  }
  if (V.hub) {
    // tent, campfire with smoke, Josh's workbench
    const tx = X(90), ty = Y(62);
    mapInk(g, 1.2); wob(g, [[tx - s * 3, ty], [tx, ty - s * 3.6], [tx + s * 3, ty]], true); g.fillStyle = 'rgba(220,160,60,.18)'; g.fill(); g.stroke();
    g.beginPath(); g.moveTo(tx, ty - s * 3.6); g.lineTo(tx, ty); g.moveTo(tx, ty - s * 3.6); g.lineTo(tx - s * 0.4, ty - s * 4.4); g.stroke();
    const fx = X(107.5), fy = Y(62);
    g.beginPath(); g.moveTo(fx - s * 1.2, fy); g.lineTo(fx + s * 1.2, fy - s * 0.5); g.moveTo(fx + s * 1.2, fy); g.lineTo(fx - s * 1.2, fy - s * 0.5); g.stroke();
    g.fillStyle = 'rgba(232,90,30,.55)'; g.beginPath(); g.moveTo(fx - s * 0.7, fy - s * 0.4); g.quadraticCurveTo(fx, fy - s * 3, fx + s * 0.7, fy - s * 0.4); g.fill(); g.stroke();
    mapInk(g, 0.8, 0.45); g.beginPath(); g.moveTo(fx, fy - s * 2.6);
    for (let k = 0; k < 5; k++) g.quadraticCurveTo(fx + (k % 2 ? s : -s), fy - s * (3.2 + k * 0.8), fx + (k % 2 ? -s * 0.3 : s * 0.3), fy - s * (3.6 + k * 0.8));
    g.stroke();
    if (D.josh) { const wx = X(114), wy = Y(62); mapInk(g, 1.1); g.beginPath(); g.moveTo(wx - s * 1.6, wy - s); g.lineTo(wx + s * 1.6, wy - s); g.moveTo(wx - s * 1.3, wy - s); g.lineTo(wx - s * 1.3, wy); g.moveTo(wx + s * 1.3, wy - s); g.lineTo(wx + s * 1.3, wy); g.stroke();
      wob(g, [[wx - s * 1.2, wy - s * 1.1], [wx - s * 0.2, wy - s * 1.1], [wx - s * 0.2, wy - s * 1.9], [wx - s * 1.2, wy - s * 1.9]], true); g.stroke(); }
    // broken rope bridge over the chasm
    mapInk(g, 1, 0.85);
    g.beginPath(); g.moveTo(X(172), Y(61.6)); g.quadraticCurveTo(X(174), Y(63.2), X(175), Y(64)); g.stroke();
    g.beginPath(); g.moveTo(X(188), Y(61.6)); g.quadraticCurveTo(X(186), Y(63.2), X(185.5), Y(64)); g.stroke();
    for (const [px, py] of [[173, 62.4], [174.2, 63.2], [186.8, 62.4], [186, 63.3]]) { g.beginPath(); g.moveTo(X(px) - 2, Y(py)); g.lineTo(X(px) + 2, Y(py) + 1); g.stroke(); }
    // pickaxe at the exit to the Deep Quarry
    const qx = X(197), qy = Y(59);
    mapInk(g, 1.3); g.beginPath(); g.moveTo(qx - s * 1.2, qy + s * 1.2); g.lineTo(qx + s * 0.8, qy - s * 0.8); g.stroke();
    g.beginPath(); g.moveTo(qx - s * 0.4, qy - s * 1.4); g.quadraticCurveTo(qx + s * 1, qy - s * 1.4, qx + s * 1.6, qy - s * 0.2); g.stroke();
  }
}

/* little bestiary doodles in the margin for enemies you've met */
function mapBestiary(g, w, h, V) {
  const seen = [];
  if (V.pipes || V.alley || V.hub) seen.push('scuttler');
  if (V.pipes || V.hub || V.server) seen.push('drone');
  if (V.pipes || V.hub) seen.push('bumper');
  if (!seen.length) return;
  const x0 = 46, y0 = h - 74;
  g.save();
  g.font = 'italic 12px "Iowan Old Style", Palatino, Georgia, serif'; g.fillStyle = 'rgba(58,38,22,.75)'; g.textAlign = 'left';
  g.fillText('Things that bite —', x0, y0 - 22);
  seen.forEach((k, i) => {
    const x = x0 + 18 + i * 92, y = y0;
    mapInk(g, 1.2);
    if (k === 'scuttler') {
      wob(g, [[x - 9, y - 4], [x + 9, y - 4], [x + 9, y + 3], [x - 9, y + 3]], true); g.fillStyle = 'rgba(190,60,50,.25)'; g.fill(); g.stroke();
      for (const sx of [-1, 1]) for (const k2 of [0, 1]) { g.beginPath(); g.moveTo(x + sx * (3 + k2 * 4), y + 3); g.lineTo(x + sx * (8 + k2 * 4), y - 1); g.lineTo(x + sx * (10 + k2 * 4), y + 9); g.stroke(); }
    } else if (k === 'drone') {
      g.beginPath(); g.ellipse(x, y, 9, 6.5, 0, 0, 7); g.fillStyle = 'rgba(70,90,120,.25)'; g.fill(); g.stroke();
      g.beginPath(); g.arc(x, y, 3, 0, 7); g.stroke(); g.beginPath(); g.moveTo(x, y - 6.5); g.lineTo(x, y - 10); g.moveTo(x - 9, y - 10); g.lineTo(x + 9, y - 10); g.stroke();
    } else {
      wob(g, [[x - 11, y - 8], [x + 8, y - 8], [x + 8, y + 5], [x - 11, y + 5]], true); g.fillStyle = 'rgba(95,107,78,.28)'; g.fill(); g.stroke();
      g.beginPath(); g.moveTo(x + 11, y - 10); g.lineTo(x + 11, y + 6); g.stroke();
      g.beginPath(); g.arc(x - 6, y + 8, 3, 0, 7); g.arc(x + 4, y + 8, 3, 0, 7); g.stroke();
    }
    g.fillStyle = 'rgba(58,38,22,.75)'; g.font = 'italic 11px "Iowan Old Style", Palatino, Georgia, serif'; g.textAlign = 'left';
    g.fillText({ scuttler: 'scuttler · lunges', drone: 'drone · hit it back', bumper: 'bumper · go behind' }[k], x - 14, y + 26);
  });
  g.restore();
}

/* ornate double border, corner curls, baseball seal, quill & inkpot */
function mapBorder(g, w, h) {
  mapInk(g, 2.2, 0.85); g.strokeRect(14, 14, w - 28, h - 28);
  mapInk(g, 0.9, 0.7); g.strokeRect(21, 21, w - 42, h - 42);
  mapInk(g, 1.4, 0.85);
  for (const [cx, cy, sx, sy] of [[21, 21, 1, 1], [w - 21, 21, -1, 1], [21, h - 21, 1, -1], [w - 21, h - 21, -1, -1]]) {
    g.beginPath(); g.moveTo(cx, cy + sy * 26); g.bezierCurveTo(cx + sx * 4, cy + sy * 8, cx + sx * 8, cy + sy * 4, cx + sx * 26, cy);
    g.moveTo(cx + sx * 6, cy + sy * 6); g.arc(cx + sx * 10, cy + sy * 10, 4, 0, 7); g.stroke();
  }
  // baseball seal at the top
  const bx = w / 2, by = 18;
  g.beginPath(); g.arc(bx, by, 12, 0, 7); g.fillStyle = PAPER_HI; g.fill(); g.lineWidth = 1.8; g.stroke();
  g.strokeStyle = 'rgba(138,42,26,.85)'; g.lineWidth = 1.2; g.setLineDash([2, 2]);
  g.beginPath(); g.arc(bx - 11, by, 8, -0.9, 0.9); g.stroke(); g.beginPath(); g.arc(bx + 11, by, 8, Math.PI - 0.9, Math.PI + 0.9); g.stroke(); g.setLineDash([]);
  // quill & inkpot, bottom right
  const qx = w - 150, qy = h - 46;
  mapInk(g, 1.3);
  wob(g, [[qx - 10, qy], [qx - 12, qy - 12], [qx + 12, qy - 12], [qx + 10, qy]], true); g.fillStyle = 'rgba(30,20,30,.6)'; g.fill(); g.stroke();
  g.beginPath(); g.ellipse(qx, qy - 12, 12, 3, 0, 0, 7); g.stroke();
  g.beginPath(); g.moveTo(qx + 2, qy - 13); g.bezierCurveTo(qx + 20, qy - 40, qx + 40, qy - 60, qx + 62, qy - 74); g.stroke();
  g.beginPath(); g.moveTo(qx + 18, qy - 32);
  for (let k = 0; k < 7; k++) { const t = k / 7; g.quadraticCurveTo(qx + 22 + t * 40 - 10, qy - 34 - t * 44 - 6, qx + 24 + t * 40, qy - 38 - t * 44); }
  g.stroke();
  g.fillStyle = 'rgba(58,38,22,.6)'; g.font = 'italic 12px "Iowan Old Style", Palatino, Georgia, serif'; g.textAlign = 'right';
  g.fillText('— R.', qx - 20, qy - 2);
}
