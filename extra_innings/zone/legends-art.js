'use strict';
/* =========================================================
   THE HALL OF LEGENDS · art
   · The Umpire: a floating figure in a black-and-white striped
     suit, a glowing gold mask and fans of golden light. Under the
     mask (unmask 0..1): an older Nathan
   · marble statues of every rival, the four golden gates, the
     Golden Dugout Bench and the Hype fountain
   · the sky: sunlight, drifting clouds, gold columns, floating
     scoreboards and a crowd of golden shadow-fans
   Loaded after zone/legends-bosses.js on every story page.
   ========================================================= */
const LG_MARBLE = '#ece6d8', LG_SHADE = '#c9c1ae';

function drawUmpire(x, y, t, o = {}) {
  const u = clamp(o.unmask || 0, 0, 1);
  ctx.save(); ctx.lineJoin = 'round';
  // fans of golden light behind him
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const s of [-1, 1]) for (let k = 0; k < 5; k++) {
    const a = -Math.PI / 2 + s * (0.45 + k * 0.24) + Math.sin(t * 1.4 + k) * 0.05;
    ctx.fillStyle = `rgba(242,193,78,${0.11 - k * 0.015})`;
    ctx.beginPath(); ctx.moveTo(x, y - 52); ctx.arc(x, y - 52, 74 + k * 7, a - 0.13, a + 0.13); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  // the striped suit, tapering into wisps (he never touches the ground)
  ctx.beginPath(); ctx.moveTo(x - 17, y - 62); ctx.lineTo(x + 17, y - 62); ctx.lineTo(x + 11, y - 8); ctx.quadraticCurveTo(x, y + 6, x - 11, y - 8); ctx.closePath();
  ctx.save(); ctx.clip(); ctx.fillStyle = '#f3ead8'; ctx.fillRect(x - 20, y - 64, 40, 74);
  ctx.fillStyle = '#0d0b10'; for (let k = -18; k < 20; k += 8) ctx.fillRect(x + k, y - 64, 4, 74); ctx.restore();
  ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
  ctx.strokeStyle = 'rgba(13,11,16,.5)'; ctx.lineWidth = 2;
  for (let k = 0; k < 3; k++) { const wx = x - 6 + k * 6; ctx.beginPath(); ctx.moveTo(wx, y); ctx.quadraticCurveTo(wx + Math.sin(t * 3 + k) * 5, y + 10, wx + Math.sin(t * 2 + k) * 3, y + 18); ctx.stroke(); }
  ctx.fillStyle = GOLD; ctx.fillRect(x - 17, y - 40, 34, 3);   // a gold belt
  // arms: one raised, calling the play
  limb(x - 15, y - 56, 2.4 + Math.sin(t * 1.2) * 0.08, 20, '#0d0b10', 5);
  const [hx, hy] = limb(x + 15, y - 56, -0.9 + Math.sin(t * 1.6) * 0.1, 20, '#0d0b10', 5);
  ctx.fillStyle = BONE; ctx.beginPath(); ctx.arc(hx, hy, 3.5, 0, 7); ctx.fill();
  // the face under the mask: Nathan, years older
  const fy = y - 76;
  ctx.beginPath(); ctx.arc(x, fy, 12, 0, 7); inked('#e8c3a0', 3);
  if (u > 0) {
    ctx.save(); ctx.globalAlpha = u;
    ctx.fillStyle = '#9a948a'; ctx.fillRect(x - 12, fy - 6, 3, 7); ctx.fillRect(x + 9, fy - 6, 3, 7);   // grey at the temples
    ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(x - 4, fy - 1, 1.6, 2, 0, 0, 7); ctx.ellipse(x + 5, fy - 1, 1.6, 2, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x + 1, fy + 4, 4, 0.3, Math.PI - 0.3); ctx.stroke();
    ctx.fillStyle = 'rgba(90,70,60,.35)'; for (let k = 0; k < 7; k++) ctx.fillRect(x - 6 + k * 2, fy + 7 + (k % 2), 1, 1);   // stubble
    ctx.restore();
  }
  // the umpire's black cap; it turns red as he reveals himself
  ctx.beginPath(); ctx.moveTo(x - 12, fy - 4); ctx.quadraticCurveTo(x - 10, fy - 17, x + 1, fy - 17); ctx.quadraticCurveTo(x + 12, fy - 17, x + 12, fy - 5); ctx.lineTo(x + 20, fy - 3); ctx.lineTo(x + 12, fy - 1); ctx.closePath();
  inked(u > 0.5 ? '#e8361c' : '#16121c', 2.5);
  // the glowing gold mask, lowered as he unmasks
  ctx.save(); ctx.translate(x, fy + u * 26); ctx.globalAlpha = 1 - u * 0.25;
  ctx.shadowColor = GOLD; ctx.shadowBlur = 14 + Math.sin(t * 3) * 4;
  rr(-13, -10, 26, 21, 6); inked(GOLD, 2.5); ctx.shadowBlur = 0;
  ctx.fillStyle = INK; ctx.fillRect(-9, -3, 7, 2.5); ctx.fillRect(2, -3, 7, 2.5);
  ctx.strokeStyle = '#8a6a1a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-11, 5); ctx.lineTo(11, 5); ctx.moveTo(0, 1); ctx.lineTo(0, 11); ctx.stroke();
  ctx.restore();
  ctx.restore();
}

/* ---------- marble statues ---------- */
function lgFigure(x, y, R, t) {   // feet at (x, y), facing right, in marble
  const M = LG_MARBLE, S = LG_SHADE;
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (R.aura) { const g = ctx.createRadialGradient(x, y - 30, 4, x, y - 30, 46); g.addColorStop(0, `rgba(${R.aura},.28)`); g.addColorStop(1, `rgba(${R.aura},0)`); ctx.fillStyle = g; ctx.fillRect(x - 46, y - 76, 92, 92); }
  if (R.shape === 'server') {
    ctx.beginPath(); ctx.moveTo(x - 26, y); ctx.quadraticCurveTo(x - 20, y - 34, x - 14, y - 44); ctx.lineTo(x + 14, y - 44); ctx.quadraticCurveTo(x + 20, y - 34, x + 26, y); ctx.closePath(); inked(M, 2.5);
    for (const [mx, my, mw] of [[-16, -60, 16], [2, -58, 15], [-8, -76, 18]]) { rr(x + mx, y + my, mw, 13, 2); inked(S, 2); ctx.fillStyle = INK; ctx.fillRect(x + mx + 4, y + my + 5, 2, 2); ctx.fillRect(x + mx + mw - 6, y + my + 5, 2, 2); }
  } else if (R.shape === 'giant') {
    ctx.beginPath(); ctx.moveTo(x - 16, y - 50); ctx.quadraticCurveTo(x - 24, y - 20, x - 14, y); ctx.lineTo(x + 14, y); ctx.quadraticCurveTo(x + 24, y - 20, x + 16, y - 50); ctx.closePath(); inked(S, 2.5);
    ctx.beginPath(); ctx.arc(x, y - 60, 12, 0, 7); inked(M, 2.5);
    ctx.beginPath(); ctx.moveTo(x - 12, y - 62); ctx.quadraticCurveTo(x - 10, y - 75, x + 2, y - 75); ctx.quadraticCurveTo(x + 13, y - 75, x + 12, y - 63); ctx.lineTo(x + 22, y - 61); ctx.lineTo(x + 12, y - 59); ctx.closePath(); inked(S, 2);
    ctx.save(); ctx.translate(x + 12, y - 38); ctx.rotate(-0.8); rr(0, -3, 40, 6, 3); inked(M, 2); ctx.restore();
  } else if (R.shape === 'twins') {
    for (const [ox, h, k] of [[-11, 1, 0], [12, 0.8, 1]]) {
      const fx = x + ox, top = y - 52 * h;
      ctx.beginPath(); ctx.ellipse(fx, y - 30 * h, 8 * h + 2, 18 * h, 0, 0, 7); inked(M, 2.5);
      ctx.beginPath(); ctx.arc(fx, top, 8 * h + 1, 0, 7); inked(M, 2.5);
      if (!k) { ctx.beginPath(); ctx.ellipse(fx, top - 6, 12, 2.5, 0, 0, 7); inked(S, 2); rr(fx - 6, top - 13, 12, 7, 2); inked(S, 2); }
      else { rr(fx + 4, top + 2, 9, 6, 1); inked(S, 1.5); }
    }
  } else {
    limb(x - 4, y - 22, Math.PI / 2 + 0.15, 22, M, 7); limb(x + 4, y - 22, Math.PI / 2 - 0.25, 22, M, 7);
    rr(x - 11, y - 50, 22, 30, 7); inked(M, 2.5);
    const [ax, ay] = limb(x + 9, y - 46, -0.9, 18, M, 6);
    limb(x - 9, y - 46, Math.PI - 0.6, 16, M, 6);
    const hy = y - 60;
    ctx.beginPath(); ctx.arc(x, hy, 11, 0, 7); inked(M, 2.5);
    switch (R.hat) {
      case 'band': ctx.fillStyle = S; ctx.fillRect(x - 11, hy - 6, 22, 4); break;
      case 'goggles': rr(x - 9, hy - 9, 18, 6, 3); inked(S, 2); break;
      case 'helmet': ctx.beginPath(); ctx.arc(x, hy - 3, 12, Math.PI, 0); ctx.closePath(); inked(S, 2); break;
      case 'wizard': ctx.beginPath(); ctx.moveTo(x - 13, hy - 4); ctx.lineTo(x + 13, hy - 6); ctx.lineTo(x - 2, hy - 34); ctx.closePath(); inked(S, 2); break;
      case 'crown': ctx.beginPath(); ctx.moveTo(x - 10, hy - 6); ctx.lineTo(x - 10, hy - 16); ctx.lineTo(x - 5, hy - 10); ctx.lineTo(x, hy - 18); ctx.lineTo(x + 5, hy - 10); ctx.lineTo(x + 10, hy - 16); ctx.lineTo(x + 10, hy - 6); ctx.closePath(); inked(S, 2); break;
      case 'horns': for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + s * 6, hy - 8); ctx.quadraticCurveTo(x + s * 14, hy - 16, x + s * 10, hy - 22); ctx.lineTo(x + s * 4, hy - 9); ctx.closePath(); inked(S, 2); } break;
      case 'visor': ctx.beginPath(); ctx.moveTo(x - 11, hy - 5); ctx.quadraticCurveTo(x, hy - 12, x + 11, hy - 5); ctx.lineTo(x + 20, hy - 1); ctx.lineTo(x + 6, hy - 2); ctx.closePath(); inked(S, 2); break;
    }
    ctx.save(); ctx.translate(ax, ay);
    switch (R.prop) {
      case 'racket': ctx.rotate(-0.9); ctx.fillStyle = S; ctx.fillRect(-2, -14, 4, 14); ctx.beginPath(); ctx.ellipse(0, -22, 7, 10, 0, 0, 7); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = 1.5; ctx.strokeStyle = S; ctx.stroke(); break;
      case 'rocket': ctx.rotate(-0.5); rr(-4, -22, 8, 22, 3); inked(S, 2); ctx.beginPath(); ctx.moveTo(-4, -22); ctx.lineTo(0, -30); ctx.lineTo(4, -22); ctx.closePath(); inked(M, 2); break;
      case 'pick': ctx.rotate(-0.6); ctx.fillStyle = S; ctx.fillRect(-2, -24, 4, 24); ctx.beginPath(); ctx.moveTo(-12, -22); ctx.quadraticCurveTo(0, -30, 12, -22); ctx.lineTo(0, -25); ctx.closePath(); inked(M, 2); break;
      case 'staff': ctx.fillStyle = S; ctx.fillRect(-2, -30, 4, 40); ctx.beginPath(); ctx.arc(0, -32, 5, 0, 7); inked(M, 2); break;
      case 'scepter': ctx.fillStyle = S; ctx.fillRect(-2, -20, 4, 26); ctx.beginPath(); ctx.arc(0, -22, 6, 0, 7); inked(S, 2); break;
      case 'watch': ctx.beginPath(); ctx.arc(4, -4, 9, 0, 7); inked(M, 2.5); ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(4, -4); ctx.lineTo(8, -8); ctx.stroke(); break;
      case 'bat': ctx.rotate(-0.8); rr(0, -3, 34, 6, 3); inked(M, 2); break;
    }
    ctx.restore();
  }
  ctx.restore();
}
// a plinth, the figure (or a veil if it's still locked), tier pips and the Grand Slam wreath
function drawLgStatue(x, y, R, st, t, locked) {
  ctx.save(); ctx.lineJoin = 'round';
  rr(x - 30, y - 24, 60, 24, 3); inked(LG_MARBLE, 3);
  ctx.fillStyle = 'rgba(242,193,78,.9)'; ctx.fillRect(x - 30, y - 24, 60, 3);
  ctx.fillStyle = INK; ctx.font = `9px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(locked ? '? ? ?' : R.short.toUpperCase(), x, y - 14, 56);
  LG_TIER_ORDER.forEach((k, i) => { ctx.beginPath(); ctx.arc(x - 12 + i * 12, y - 5, 3.2, 0, 7); ctx.fillStyle = st[k] ? LG_TIERS[k].color : 'rgba(13,11,16,.25)'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = INK; ctx.stroke(); });
  if (locked) {   // a veil over the statue that isn't carved yet
    ctx.beginPath(); ctx.moveTo(x - 22, y - 24); ctx.quadraticCurveTo(x - 26, y - 70, x, y - 92); ctx.quadraticCurveTo(x + 26, y - 70, x + 22, y - 24); ctx.closePath(); inked('#5a4a6e', 2.5);
    ctx.strokeStyle = 'rgba(243,234,216,.25)'; ctx.lineWidth = 1.5; for (const o of [-8, 0, 8]) { ctx.beginPath(); ctx.moveTo(x + o, y - 82 + Math.abs(o)); ctx.lineTo(x + o * 1.6, y - 26); ctx.stroke(); }
  } else {
    lgFigure(x, y - 24, R, t);
    if (st.grand) {   // the golden wreath
      ctx.save(); ctx.shadowColor = GOLD; ctx.shadowBlur = 10; ctx.strokeStyle = GOLD; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y - 60, 30, Math.PI * 0.75, Math.PI * 2.25); ctx.stroke();
      ctx.fillStyle = GOLD;
      for (let k = 0; k < 9; k++) { const a = Math.PI * 0.75 + k * (Math.PI * 1.5 / 8); ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * 30, y - 60 + Math.sin(a) * 30, 5, 2.4, a + 1.2, 0, 7); ctx.fill(); }
      ctx.restore();
    }
  }
  ctx.restore();
}
// a tall golden gate: the cup on top, the four bindings as chain links, a crown for all four at once
function drawLgGate(x, y, C, c, t, locked) {
  ctx.save(); ctx.lineJoin = 'round';
  const top = y - 150, col = locked ? '#8a8f99' : C.color;
  if (!locked) { const g = ctx.createRadialGradient(x, y - 70, 6, x, y - 70, 90); g.addColorStop(0, `rgba(255,240,200,${0.22 + 0.06 * Math.sin(t * 2)})`); g.addColorStop(1, 'rgba(255,240,200,0)'); ctx.fillStyle = g; ctx.fillRect(x - 90, y - 160, 180, 170); }
  ctx.fillStyle = 'rgba(13,11,16,.35)'; ctx.beginPath(); ctx.moveTo(x - 30, y); ctx.lineTo(x - 30, top + 40); ctx.arc(x, top + 40, 30, Math.PI, 0); ctx.lineTo(x + 30, y); ctx.closePath(); ctx.fill();
  for (const s of [-1, 1]) { rr(x + s * 38 - 7, top + 20, 14, y - top - 20, 3); inked(LG_MARBLE, 2.5); rr(x + s * 38 - 10, top + 14, 20, 8, 2); inked(col, 2); }
  ctx.beginPath(); ctx.arc(x, top + 40, 40, Math.PI, 0); ctx.lineWidth = 9; ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = 6; ctx.strokeStyle = col; ctx.stroke();
  // the cup
  const cy = top - 6 + Math.sin(t * 2) * 2;
  ctx.beginPath(); ctx.moveTo(x - 13, cy - 26); ctx.lineTo(x + 13, cy - 26); ctx.quadraticCurveTo(x + 12, cy - 8, x, cy - 5); ctx.quadraticCurveTo(x - 12, cy - 8, x - 13, cy - 26); ctx.closePath(); inked(col, 2.5);
  rr(x - 8, cy - 2, 16, 5, 2); inked(col, 2);
  if (c && c.all) { ctx.fillStyle = GOLD; ctx.beginPath(); ctx.moveTo(x - 9, cy - 30); ctx.lineTo(x - 9, cy - 38); ctx.lineTo(x - 4, cy - 33); ctx.lineTo(x, cy - 40); ctx.lineTo(x + 4, cy - 33); ctx.lineTo(x + 9, cy - 38); ctx.lineTo(x + 9, cy - 30); ctx.closePath(); ctx.fill(); }
  // the four binding links
  LG_BINDS.forEach((B, i) => { const on = c && c.b && c.b[B.id]; ctx.beginPath(); ctx.ellipse(x - 18 + i * 12, top + 56, 4.5, 6.5, 0, 0, 7); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = 2; ctx.strokeStyle = on ? GOLD : 'rgba(243,234,216,.35)'; ctx.stroke(); });
  if (c && c.done) { ctx.fillStyle = GOLD; ctx.font = `11px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillText('★ WON ★', x, top + 76); }
  if (locked) { ctx.strokeStyle = '#5a5f6a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - 28, top + 60); ctx.lineTo(x + 28, y - 20); ctx.moveTo(x + 28, top + 60); ctx.lineTo(x - 28, y - 20); ctx.stroke(); }
  ctx.font = `10px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = locked ? 'rgba(243,234,216,.5)' : BONE;
  ctx.fillText(C.name.replace('THE ', ''), x, y - 6, 92);
  ctx.restore();
}
function drawLgBench(x, y, t) {
  ctx.save(); ctx.lineJoin = 'round';
  const g = ctx.createRadialGradient(x, y - 20, 4, x, y - 20, 80); g.addColorStop(0, 'rgba(242,193,78,.25)'); g.addColorStop(1, 'rgba(242,193,78,0)'); ctx.fillStyle = g; ctx.fillRect(x - 80, y - 100, 160, 110);
  ctx.fillStyle = INK; ctx.fillRect(x - 30, y - 14, 5, 14); ctx.fillRect(x + 25, y - 14, 5, 14);
  rr(x - 36, y - 20, 72, 8, 3); inked(GOLD, 2.5);
  rr(x - 36, y - 40, 72, 7, 3); inked('#c9a33a', 2.5);
  ctx.fillStyle = INK; ctx.fillRect(x - 32, y - 34, 4, 15); ctx.fillRect(x + 28, y - 34, 4, 15);
  ctx.fillStyle = '#fff3c0'; for (let k = 0; k < 3; k++) { const a = t * 1.5 + k * 2.1; ctx.fillRect(x + Math.cos(a) * 40, y - 52 + Math.sin(a) * 6, 2, 2); }
  ctx.restore();
}
function drawLgFountain(x, y, t) {
  ctx.save(); ctx.lineJoin = 'round';
  rr(x - 30, y - 18, 60, 18, 4); inked(LG_MARBLE, 3);
  rr(x - 5, y - 44, 10, 26, 2); inked(LG_MARBLE, 2.5);
  ctx.beginPath(); ctx.ellipse(x, y - 46, 16, 5, 0, 0, 7); inked(LG_SHADE, 2.5);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,140,60,.75)'; ctx.lineWidth = 3;
  for (const s of [-1, 1]) for (let k = 0; k < 2; k++) { const r = 14 + k * 8; ctx.beginPath(); ctx.moveTo(x, y - 50); ctx.quadraticCurveTo(x + s * r, y - 72 - k * 6 + Math.sin(t * 4 + k) * 2, x + s * (r + 6), y - 18); ctx.stroke(); }
  ctx.restore();
  ctx.fillStyle = 'rgba(232,54,28,.75)'; ctx.fillRect(x - 26, y - 16, 52, 5);
  ctx.restore();
}

/* ---------- the sky over the Hall ---------- */
const LG_CLOUDS = Array.from({ length: 14 }, (_, i) => ({ u: (i * 0.137 + 0.05) % 1, v: 0.08 + ((i * 0.31) % 0.7), s: 0.6 + ((i * 0.53) % 0.8), sp: 6 + (i % 4) * 4 }));
function drawLgSky() {
  const r = ROOM.t_colo.px, t = Game.time, fy = 41 * TILE;
  ctx.save();
  const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h); g.addColorStop(0, '#8fc7ef'); g.addColorStop(0.55, '#f6dfb0'); g.addColorStop(1, '#f2c98a');
  ctx.fillStyle = g; ctx.fillRect(r.x, r.y, r.w, r.h);
  // the sun, low and enormous, and its rays
  const sx = r.x + r.w * 0.62, sy = r.y + 3 * TILE;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const sg = ctx.createRadialGradient(sx, sy, 10, sx, sy, 320); sg.addColorStop(0, 'rgba(255,250,220,.9)'); sg.addColorStop(0.2, 'rgba(255,230,160,.35)'); sg.addColorStop(1, 'rgba(255,230,160,0)');
  ctx.fillStyle = sg; ctx.fillRect(sx - 320, sy - 320, 640, 640);
  ctx.fillStyle = 'rgba(255,240,190,.06)';
  for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI + t * 0.03; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(a) * 900 - 30, sy + Math.sin(a) * 900); ctx.lineTo(sx + Math.cos(a) * 900 + 30, sy + Math.sin(a) * 900); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  // drifting clouds
  for (const c of LG_CLOUDS) {
    const x = r.x + ((c.u * r.w + t * c.sp) % (r.w + 300)) - 150, y = r.y + c.v * r.h, w = 120 * c.s;
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.beginPath(); ctx.ellipse(x, y, w, w * 0.26, 0, 0, 7); ctx.ellipse(x - w * 0.4, y + 6, w * 0.5, w * 0.22, 0, 0, 7); ctx.ellipse(x + w * 0.35, y - 6, w * 0.55, w * 0.28, 0, 0, 7); ctx.fill();
  }
  // gold-capped marble columns
  for (let cx = r.x + 4 * TILE; cx < r.x + r.w - 2 * TILE; cx += 9 * TILE) {
    ctx.fillStyle = 'rgba(236,230,216,.85)'; ctx.fillRect(cx - 14, r.y + 4 * TILE, 28, fy - r.y - 4 * TILE);
    ctx.fillStyle = 'rgba(180,170,150,.5)'; for (let k = -8; k <= 8; k += 8) ctx.fillRect(cx + k - 1, r.y + 4 * TILE, 2, fy - r.y - 4 * TILE);
    ctx.fillStyle = 'rgba(242,193,78,.95)'; ctx.fillRect(cx - 20, r.y + 4 * TILE - 10, 40, 10); ctx.fillRect(cx - 18, fy - 8, 36, 8);
  }
  // the crowd of golden shadow-fans in the high stands
  for (let row = 0; row < 2; row++) {
    const y = r.y + 6 * TILE + row * 26;
    ctx.fillStyle = 'rgba(120,90,40,.25)'; ctx.fillRect(r.x + TILE, y - 10, r.w - 2 * TILE, 22);
    for (let x = r.x + 2 * TILE + row * 11; x < r.x + r.w - 2 * TILE; x += 22) {
      const bob = Math.abs(Math.sin(t * (LG.F ? 7 : 2) + x * 0.13 + row)) * (LG.F ? 4 : 1.5);
      ctx.fillStyle = `rgba(242,193,78,${0.45 + 0.15 * Math.sin(x * 0.7)})`; ctx.beginPath(); ctx.arc(x, y - bob, 6, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,250,220,.8)'; ctx.fillRect(x - 3, y - bob - 1, 2, 2); ctx.fillRect(x + 1, y - bob - 1, 2, 2);
    }
  }
  // floating scoreboards
  const boards = [['HALL OF LEGENDS', 0.22], [`CUPS ${LG_CUP_ORDER.filter(k => lgQ().cups[k] && lgQ().cups[k].done).length} / 4`, 0.5], [`ALL-STARS ${lgStarWins()}`, 0.8]];
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const [txt, u] of boards) {
    const bx = r.x + r.w * u, by = r.y + 2.2 * TILE + Math.sin(t * 0.8 + u * 9) * 8, w = 150;
    ctx.fillStyle = 'rgba(13,11,16,.12)'; ctx.fillRect(bx - w / 2 + 6, by + 24, w - 12, 6);
    rr(bx - w / 2, by - 18, w, 36, 4); inked('#1e1a14', 3);
    ctx.strokeStyle = GOLD; ctx.lineWidth = 1.5; ctx.strokeRect(bx - w / 2 + 4, by - 14, w - 8, 28);
    ctx.font = `14px ${DISPLAY_FONT}`; ctx.fillStyle = '#ffd27a'; ctx.fillText(txt, bx, by + 1);
  }
  ctx.restore();
}
