'use strict';
/* ---------- character drawing (shared by map, HUD and modals) ---------- */
function circ(g, x, y, r, fill, stroke = INK, lw = 2.5) {
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.lineWidth = lw; g.strokeStyle = stroke; g.stroke(); }
}
function ell(g, x, y, rx, ry, fill, stroke = INK, lw = 2.5) {
  g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.lineWidth = lw; g.strokeStyle = stroke; g.stroke(); }
}
function eyes(g, y, dx = 4, r = 1.9, col = INK) {
  g.fillStyle = col; [-dx, dx].forEach(x => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); });
}
function smile(g, y, w = 4, cry = false) {
  g.beginPath(); g.lineWidth = 1.8; g.strokeStyle = INK;
  if (cry) { g.arc(0, y + 3, w * 0.8, Math.PI * 1.15, Math.PI * 1.85); } else g.arc(0, y - 1, w, Math.PI * 0.15, Math.PI * 0.85);
  g.stroke();
}

function drawChar(g, x, y, ch, o = {}) {
  const s = o.s || 1, t = o.t || 0;
  g.save(); g.translate(x, y); g.scale(s, s);
  if (o.alpha != null) g.globalAlpha = o.alpha;
  if (!o.noShadow) ell(g, 0, 17, 13, 4.5, 'rgba(29,26,47,.18)', null);
  const k = ch.kind || 'person';
  if (k === 'person') {
    const w = ch.wide || 1;
    // body
    g.beginPath(); g.ellipse(0, 7, 12 * w, 11, 0, 0, Math.PI * 2);
    g.fillStyle = ch.shirt || ch.color; g.fill(); g.lineWidth = 2.5; g.strokeStyle = INK; g.stroke();
    if (ch.shirt && ch.shirt !== ch.color) { g.fillStyle = ch.color; g.fillRect(-3, 0, 6, 12); }
    if (ch.gloves) { circ(g, -12 * w, 8, 4, ch.gloves); circ(g, 12 * w, 8, 4, ch.gloves); }
    // head
    circ(g, 0, -10, 10.5, ch.skin || '#ffd7b0');
    if (ch.hair) { g.beginPath(); g.arc(0, -11, 10.6, Math.PI * 1.05, Math.PI * 1.95); g.closePath(); g.fillStyle = ch.hair; g.fill(); g.stroke(); }
    if (ch.bun) circ(g, 0, -23, 4.5, ch.hair);
    if (ch.beard) { g.beginPath(); g.moveTo(-8, -7); g.quadraticCurveTo(0, 10, 8, -7); g.closePath(); g.fillStyle = ch.beard; g.fill(); g.stroke(); }
    eyes(g, -10);
    if (ch.glasses) { g.lineWidth = 1.5; g.strokeStyle = INK; [-4, 4].forEach(ex => { g.beginPath(); g.arc(ex, -10, 3.4, 0, Math.PI * 2); g.stroke(); }); }
    if (!ch.beard) smile(g, -5, 3.6, ch.cry);
    if (ch.cry) { g.fillStyle = '#7fd8ff'; g.beginPath(); g.arc(-6, -6 + (t * 20 % 6), 1.6, 0, Math.PI * 2); g.fill(); }
    if (ch.cap) { g.beginPath(); g.arc(0, -12, 10.8, Math.PI, 0); g.closePath(); g.fillStyle = ch.cap; g.fill(); g.stroke(); g.fillRect(-2, -14, 13, 3); g.strokeRect(-2, -14, 13, 3); }
    if (ch.band) { g.fillStyle = ch.band; g.fillRect(-10.5, -17, 21, 3.5); }
    if (ch.wizard) { g.beginPath(); g.moveTo(-12, -16); g.lineTo(12, -16); g.lineTo(2, -38); g.closePath(); g.fillStyle = ch.wizard; g.fill(); g.stroke(); }
    if (ch.headphones) { g.lineWidth = 2.5; g.strokeStyle = INK; g.beginPath(); g.arc(0, -11, 12, Math.PI, 0); g.stroke(); circ(g, -11.5, -9, 3.5, INK, null); circ(g, 11.5, -9, 3.5, INK, null); }
  } else if (k === 'apple') {
    circ(g, 0, -1, 15, ch.color);
    g.beginPath(); g.moveTo(1, -15); g.lineTo(3, -22); g.lineWidth = 2.5; g.strokeStyle = '#6b3f1f'; g.stroke();
    ell(g, 8, -20, 6, 2.5, '#3ccf6e', INK, 1.5);
    eyes(g, -5, 5);
    g.fillStyle = '#2a1a0a'; g.beginPath(); g.ellipse(-4, 2, 5.5, 2.4, 0.35, 0, Math.PI * 2); g.ellipse(4, 2, 5.5, 2.4, -0.35, 0, Math.PI * 2); g.fill();
    circ(g, -5, -9, 2.5, 'rgba(255,255,255,.6)', null);
  } else if (k === 'worm') {
    for (let i = 3; i >= 0; i--) circ(g, Math.sin(t * 4 + i) * 2 + (i - 1.5) * 5, 10 - i * 7, 7 - i * 0.3, '#ff9ab0');
    circ(g, 0, -19, 9, '#ff9ab0');
    eyes(g, -20, 3.5, 1.6); smile(g, -15, 3.5);
  } else if (k === 'round') {
    circ(g, 0, 0, 15, ch.color);
    eyes(g, -3, 4.5); smile(g, 3, 4.5);
    circ(g, -9, 3, 2.5, '#ff9a8a', null); circ(g, 9, 3, 2.5, '#ff9a8a', null);
  } else if (k === 'rat') {
    ell(g, 0, 7, 11, 10, ch.color);
    g.fillStyle = '#ffd23f'; g.fillRect(-6, 0, 3, 3); g.fillRect(3, 0, 3, 3);
    circ(g, -9, -18, 5, '#a8a8b8'); circ(g, 9, -18, 5, '#a8a8b8');
    circ(g, 0, -10, 10, '#a8a8b8'); eyes(g, -11, 4); circ(g, 0, -4, 2.4, '#ff7ccf', null);
    g.lineWidth = 3; g.strokeStyle = '#9a9aa8'; g.beginPath(); g.moveTo(12, 8); g.lineTo(19, -2); g.stroke();
  } else if (k === 'fox') {
    g.beginPath(); g.moveTo(-13, -4); g.lineTo(-10, -22); g.lineTo(-3, -12); g.lineTo(3, -12); g.lineTo(10, -22); g.lineTo(13, -4); g.lineTo(0, 10); g.closePath();
    g.fillStyle = '#ff7a1f'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = INK; g.stroke();
    g.beginPath(); g.moveTo(-6, 0); g.lineTo(0, 10); g.lineTo(6, 0); g.closePath(); g.fillStyle = '#fff'; g.fill();
    eyes(g, -6, 5); circ(g, 0, 8, 2, INK, null);
    g.fillStyle = '#ff4f6a'; g.fillRect(-1.5, 10, 3, 4 + Math.abs(Math.sin(t * 8)) * 3);
    ell(g, 13, 10, 8, 4, '#ff7a1f');
  } else if (k === 'meta') {
    g.lineWidth = 7; const gr = g.createLinearGradient(-14, 0, 14, 0); gr.addColorStop(0, '#0866ff'); gr.addColorStop(1, '#c23bff');
    g.strokeStyle = gr; g.beginPath(); g.arc(0, -4 + Math.sin(t * 3) * 2, 12, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#ff3b5c'; g.fillRect(-7, -8, 5, 2.5); g.fillRect(2, -8, 5, 2.5);
  } else if (k === 'zennith') {
    g.globalAlpha *= 0.92;
    g.beginPath(); g.moveTo(-12, 16); g.quadraticCurveTo(-16, -30, 0, -36); g.quadraticCurveTo(16, -30, 12, 16); g.closePath();
    g.fillStyle = '#1a1030'; g.fill(); g.lineWidth = 2; g.strokeStyle = '#8a5cff'; g.stroke();
    g.fillStyle = '#e8d8ff'; g.shadowColor = '#c8a8ff'; g.shadowBlur = 8;
    g.beginPath(); g.ellipse(-5, -20, 2.4, 3.5, 0, 0, Math.PI * 2); g.ellipse(5, -20, 2.4, 3.5, 0, 0, Math.PI * 2); g.fill(); g.shadowBlur = 0;
  } else if (k === 'blob') {
    g.beginPath(); g.moveTo(-12, 12); g.quadraticCurveTo(-14, -14, 0, -14); g.quadraticCurveTo(14, -14, 12, 12); g.quadraticCurveTo(0, 8, -12, 12);
    g.fillStyle = '#2a2238'; g.fill(); g.lineWidth = 2; g.strokeStyle = '#8a5cff'; g.stroke();
    circ(g, -4, -6, 2, 'rgba(255,255,255,.7)', null);
  } else if (k === 'alien') {
    ell(g, 0, 8, 9, 9, '#3ccf6e');
    ell(g, 0, -10, 13, 11, '#7fff7f');
    g.fillStyle = INK; g.beginPath(); g.ellipse(-5, -10, 3.5, 5, -0.4, 0, Math.PI * 2); g.ellipse(5, -10, 3.5, 5, 0.4, 0, Math.PI * 2); g.fill();
    g.lineWidth = 2; g.strokeStyle = INK; g.beginPath(); g.moveTo(-4, -20); g.lineTo(-7, -27); g.moveTo(4, -20); g.lineTo(7, -27); g.stroke();
    circ(g, -7, -28, 2, '#ff3b5c', null); circ(g, 7, -28, 2, '#ff3b5c', null);
  } else if (k === 'robot') {
    g.fillStyle = '#c9d6e0'; g.fillRect(-10, -12, 20, 22); g.lineWidth = 2.5; g.strokeStyle = INK; g.strokeRect(-10, -12, 20, 22);
    g.fillStyle = '#00e5ff'; g.fillRect(-6, -6, 4, 4); g.fillRect(2, -6, 4, 4);
    g.beginPath(); g.moveTo(0, -12); g.lineTo(0, -19); g.stroke(); circ(g, 0, -20, 2.5, (t * 3 % 1) < .5 ? '#ff3b3b' : '#ffd23f', null);
  } else if (k === 'house') {
    [-9, -3, 3, 9].forEach((lx, i) => { g.lineWidth = 3; g.strokeStyle = INK; g.beginPath(); g.moveTo(lx, 8); g.lineTo(lx + Math.sin(t * 10 + i) * 3, 18); g.stroke(); });
    g.fillStyle = ch.color || '#ffd6a5'; g.fillRect(-14, -8, 28, 18); g.lineWidth = 2.5; g.strokeStyle = INK; g.strokeRect(-14, -8, 28, 18);
    g.beginPath(); g.moveTo(-17, -8); g.lineTo(0, -24); g.lineTo(17, -8); g.closePath(); g.fillStyle = ch.roof || '#8a5cff'; g.fill(); g.stroke();
    g.fillStyle = '#ffd23f'; g.shadowColor = '#ff3b3b'; g.shadowBlur = 6;
    g.beginPath(); g.arc(-6, -2, 3, 0, Math.PI * 2); g.arc(6, -2, 3, 0, Math.PI * 2); g.fill(); g.shadowBlur = 0;
    g.fillStyle = INK; g.fillRect(-8, 4, 16, 5);
    g.fillStyle = '#fff'; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-8 + i * 4, 4); g.lineTo(-6 + i * 4, 7); g.lineTo(-4 + i * 4, 4); g.fill(); }
  } else if (k === 'bats') {
    g.font = '13px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let i = 0; i < 5; i++) { const a = t * 3 + i * 1.26; g.fillText('🦇', Math.cos(a) * 11, -6 + Math.sin(a * 1.3) * 9); }
  } else if (k === 'bigpumpkin') {
    circ(g, 0, -2, 17, '#ff7a1f');
    g.lineWidth = 1.5; g.strokeStyle = 'rgba(29,26,47,.4)'; [-7, 0, 7].forEach(x => { g.beginPath(); g.ellipse(x, -2, 5, 16, 0, 0, Math.PI * 2); g.stroke(); });
    g.fillStyle = '#ffd23f';
    [-6, 6].forEach(x => { g.beginPath(); g.moveTo(x - 4, -4); g.lineTo(x, -10); g.lineTo(x + 4, -4); g.closePath(); g.fill(); });
    g.beginPath(); g.moveTo(-9, 4); g.lineTo(-4, 8); g.lineTo(0, 4); g.lineTo(4, 8); g.lineTo(9, 4); g.lineTo(5, 11); g.lineTo(-5, 11); g.closePath(); g.fill();
    g.fillStyle = '#3c7a2a'; g.fillRect(-2, -23, 4, 6);
  } else if (k === 'sheet') {
    g.beginPath(); g.moveTo(-14, 14); g.quadraticCurveTo(-16, -24, 0, -24); g.quadraticCurveTo(16, -24, 14, 14);
    for (let i = 0; i < 4; i++) g.lineTo(14 - (i + 0.5) * 7, 10 + (i % 2) * 6);
    g.closePath(); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = INK; g.stroke();
    g.fillStyle = INK; g.beginPath(); g.ellipse(-5, -8, 2.5, 4, 0, 0, Math.PI * 2); g.ellipse(5, -8, 2.5, 4, 0, 0, Math.PI * 2); g.fill();
  }
  if (o.costume) { g.font = '15px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(o.costume, 13, -20); }
  if (o.icon && ch.icon) { g.font = '12px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch.icon, -15, 4); }
  g.restore();
}

function avatar(ch, size = 96, bg = null, costume = null) {
  const c = document.createElement('canvas'); c.width = size; c.height = size;
  const g = c.getContext('2d');
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, size, size); }
  const sc = size / 50, tall = ch.wizard || ch.kind === 'zennith';
  drawChar(g, size / 2, size / 2 + (tall ? 12 : 6) * sc, ch, {s: sc * (tall ? 0.8 : 1), noShadow: true, costume});
  return c;
}
