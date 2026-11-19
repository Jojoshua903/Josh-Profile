'use strict';
/* =========================================================
   TUTORIAL · floating key icons in the Crash Site (Zone 1 only)
   Soft, gold-edged key caps drift in the background of the first
   room: move, jump, swing, pogo and dash, with a few words each.
   They follow your bindings (keyboard or pad) and fade out after
   your first fifteen minutes of play.
   Loaded on zone1.html, after zone/main.js.
   ========================================================= */
const TUT = [
  // tile column, tile row (the key caps' baseline), the actions, the words under them
  { tx: 4,  row: 55, keys: ['left', 'right'], txt: 'move' },
  { tx: 12, row: 55, keys: ['jump'], txt: 'jump · hold for height' },
  { tx: 20, row: 55, keys: ['attack'], txt: 'swing' },
  { tx: 28, row: 55, keys: ['down', '+', 'attack'], txt: 'in the air: pogo' },
  { tx: 36, row: 55, keys: ['dash'], txt: 'dash' },
];
function tutCap(label, x, y, a) {
  ctx.font = `600 13px ui-monospace, "SF Mono", Menlo, monospace`;
  const w = Math.max(28, ctx.measureText(label).width + 16), h = 26;
  ctx.globalAlpha = a * 0.55; ctx.fillStyle = 'rgba(11,13,19,.85)'; rr(x, y - h, w, h, 4); ctx.fill();
  ctx.globalAlpha = a; ctx.lineWidth = 1.2; ctx.strokeStyle = '#C5A059'; rr(x, y - h, w, h, 4); ctx.stroke();
  ctx.fillStyle = '#FFF8EB'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, x + w / 2, y - h / 2 + 1);
  return w;
}
(function () {
  if (PAGE.id !== 'z1' || !Game.hooks) return;
  const H = Game.hooks, _back = H.back;
  H.back = function (cam) {
    if (_back) _back.apply(this, arguments);
    const D = Save.data, r = Zone.room;
    if (!r || r.id !== 'crash' || (D.time || 0) > 900 || Story.active) return;
    const fade = clamp(1 - ((D.time || 0) - 600) / 300, 0, 1) * 0.75;
    if (fade <= 0.01) return;
    const dev = Game.lastInput, t = Game.time;
    ctx.save();
    for (let i = 0; i < TUT.length; i++) {
      const s = TUT[i], y0 = s.row * TILE + Math.sin(t * 1.3 + i * 1.7) * 4;
      let x = Math.min(s.tx * TILE, r.px.x + r.px.w - 5 * TILE);
      const labels = s.keys.map(k => k === '+' ? '+' : Bindings.label(k, dev));
      // centre the row of caps on its column
      ctx.font = `600 13px ui-monospace, "SF Mono", Menlo, monospace`;
      const total = labels.reduce((n, l) => n + (l === '+' ? 18 : Math.max(28, ctx.measureText(l).width + 16) + 6), -6);
      x -= total / 2;
      for (const l of labels) {
        if (l === '+') { ctx.globalAlpha = fade; ctx.fillStyle = '#9E9689'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('+', x + 6, y0 - 12); x += 18; continue; }
        x += tutCap(l, x, y0, fade) + 6;
      }
      ctx.globalAlpha = fade * 0.9; ctx.font = `italic 13px ${SERIF_FONT}`; ctx.fillStyle = '#C5A059'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(s.txt, s.tx * TILE, y0 + 8);
    }
    ctx.restore();
  };
})();
