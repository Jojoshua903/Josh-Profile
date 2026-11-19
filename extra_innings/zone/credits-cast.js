'use strict';
/* =========================================================
   CREDITS · the cast roll call (act3.html)
   While the names roll up after any of the five endings, little
   scenes from Base Camp fade in beside them, one after another,
   left and right:
   Lars petting his cats · Deniz pouring tea · Fionn studying a
   stone · Josh at his server · Reshman in a corner, "…blorp"
   Wraps drawScene (act3/story.js); the scroll runs 0 → 1.
   ========================================================= */
const CAST_ROLL = [
  { at: 0.06, side: -1, cap: 'Lars, off the clock', draw: t => {
      drawLars(0, 0, 1, t, { lamp: false });
      drawCat(26, 0, -1, t, { color: '#e08a3a', scale: 0.9 });
      drawCat(44, 0, -1, t + 1.3, { color: '#2b2228', scale: 0.9, sleep: true });
      // a little heart rising off the petted cat
      const p = (t * 0.6) % 1; ctx.globalAlpha *= 1 - p; ctx.fillStyle = '#FF3B30';
      ctx.beginPath(); const hx = 26, hy = -30 - p * 26; ctx.arc(hx - 2, hy, 2.4, 0, 7); ctx.arc(hx + 2, hy, 2.4, 0, 7); ctx.moveTo(hx - 4.4, hy + 0.8); ctx.lineTo(hx, hy + 5.5); ctx.lineTo(hx + 4.4, hy + 0.8); ctx.fill();
    } },
  { at: 0.24, side: 1, cap: 'Deniz, pouring the good tea', draw: t => {
      drawDeniz(0, 0, -1, t, { hippie: true });
      // the teapot, tipping, and a thin stream into a cup
      const tip = 0.35 + Math.sin(t * 1.2) * 0.12;
      ctx.save(); ctx.translate(-20, -30); ctx.rotate(-tip);
      ctx.beginPath(); ctx.ellipse(0, 0, 8, 6, 0, 0, 7); inked('#c8561c', 1.6);
      ctx.beginPath(); ctx.moveTo(-8, -1); ctx.lineTo(-15, -5); ctx.lineWidth = 2.4; ctx.strokeStyle = '#0d0b10'; ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = 'rgba(190,140,70,.9)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-33, -32); ctx.quadraticCurveTo(-36, -22, -35, -12); ctx.stroke();
      ctx.beginPath(); ctx.rect(-40, -12, 10, 8); inked('#f3ead8', 1.4);
      ctx.globalAlpha *= 0.5; ctx.strokeStyle = '#f3ead8'; ctx.lineWidth = 1;
      for (let k = 0; k < 2; k++) { ctx.beginPath(); ctx.moveTo(-37 + k * 4, -14); ctx.quadraticCurveTo(-39 + k * 4 + Math.sin(t * 3 + k) * 2, -20, -36 + k * 4, -26); ctx.stroke(); }
    } },
  { at: 0.42, side: -1, cap: 'Fionn, and a rock named Gerald', draw: t => {
      drawFionn(0, 0, 1, t, {});
      const bob = Math.sin(t * 1.6) * 1.5;
      ctx.beginPath(); ctx.moveTo(14, -40 + bob); ctx.lineTo(22, -44 + bob); ctx.lineTo(27, -39 + bob); ctx.lineTo(24, -33 + bob); ctx.lineTo(16, -33 + bob); ctx.closePath(); inked('#8c7b6b', 1.6);
      ctx.font = `10px ${SERIF_FONT}`; ctx.fillStyle = '#C5A059'; ctx.textAlign = 'center';
      if (Math.sin(t * 0.9) > 0) ctx.fillText('?', 22, -50 + bob);
    } },
  { at: 0.60, side: 1, cap: 'Josh, keeping the server humming', draw: t => {
      rr(-46, -34, 30, 34, 3); inked('#2a2a32', 2);
      for (let k = 0; k < 3; k++) { ctx.fillStyle = Math.sin(t * 3 + k * 1.7) > 0 ? '#50dc78' : '#1f5a3a'; ctx.fillRect(-41 + k * 8, -28, 4, 2.5); }
      ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(-43, -20, 24, 3); ctx.fillRect(-43, -13, 24, 3);
      const j = CAST_ROLL.josh || (CAST_ROLL.josh = new Josh(0, 0));
      Object.assign(j, { x: -11, y: -46, facing: -1, vx: 0, phase: t, near: false, shop: false }); j.draw();
    } },
  { at: 0.78, side: 1, corner: true, cap: '…blorp.', draw: t => {
      ctx.beginPath(); ctx.ellipse(0, -14, 15, 14, 0, 0, 7); ctx.fillStyle = '#000'; ctx.fill();
      if (Math.sin(t * 1.7) > -0.9) { ctx.fillStyle = '#f3ead8'; ctx.beginPath(); ctx.ellipse(-5, -16, 2.6, 3.4, 0, 0, 7); ctx.ellipse(5, -16, 2.6, 3.4, 0, 0, 7); ctx.fill(); }
    } },
];
CAST_ROLL.len = 0.2;   // each scene's share of the scroll (they overlap a little)
(function () {
  if (typeof drawScene !== 'function') return;
  const _ds = drawScene;
  drawScene = function () {
    _ds.apply(this, arguments);
    const S = Scene; if (S.on !== 'credits') return;
    const t = Game.time;
    for (const c of CAST_ROLL) {
      if (!c.draw) continue;
      const k = (S.scroll - c.at) / CAST_ROLL.len; if (k <= 0 || k >= 1) continue;
      const a = Math.min(1, k * 5, (1 - k) * 5);
      const x = c.corner ? VW - 90 : c.side < 0 ? VW * 0.16 : VW * 0.84, y = c.corner ? VH - 70 : VH * 0.7;
      ctx.save(); ctx.globalAlpha = a;
      // a pool of warm light on the ground
      const g = ctx.createRadialGradient(x, y, 4, x, y, 130); g.addColorStop(0, 'rgba(197,160,89,.22)'); g.addColorStop(1, 'rgba(197,160,89,0)');
      ctx.fillStyle = g; ctx.fillRect(x - 130, y - 130, 260, 160);
      ctx.translate(x, y + (1 - a) * 10); ctx.scale(c.corner ? 1.6 : 2.2, c.corner ? 1.6 : 2.2); ctx.lineJoin = 'round';
      try { c.draw(t); } catch (e) { logErr('credits-cast: ' + c.cap, e); c.draw = null; }
      ctx.restore();
      ctx.save(); ctx.globalAlpha = a * 0.9; ctx.font = `italic 14px ${SERIF_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = c.corner ? '#9E9689' : '#C5A059';
      ctx.fillText(c.cap, c.corner ? x - 40 : x, y + (c.corner ? -50 : 24));
      ctx.restore();
    }
  };
})();
