'use strict';
/* =========================================================
   DIALOGUE · the house style (every story page)
   · a wide ink band (#0B0D13 at 85%) along the bottom of the screen
     that fades out at both sides, with thin gold lines top and bottom
   · the speaker's comic portrait on the left, which bobs up on
     every new line
   · typewriter text in ivory: SHOUTED words in flame red,
     *actions* in grey italics
   · a voice blip per character: heavy and low for Lars, digital for
     Josh, a wet "blorp" for Reshman; everyone else keeps their pitch
   Replaces Story.drawDialogue (zone/story.js). Loaded before zone/perf.js.
   ========================================================= */
const DLG = { last: null, bornAt: 0 };
const DLG_INK = '11,13,19', DLG_GOLD = '#C5A059', DLG_IVORY = '#FFF8EB', DLG_GREY = '#9E9689', DLG_RED = '#FF3B30';
const DLG_NAME_FONT = '"Cinzel", "Trajan Pro", "Playfair Display", ' + SERIF_FONT;

Story.drawDialogue = function () {
  const b = this.bubble; if (!b) { DLG.last = null; return; }
  if (DLG.last !== b) { DLG.last = b; DLG.bornAt = Game.time; }
  const age = Game.time - DLG.bornAt, col = this.tagColors[b.who] || FLAME;
  const L = this.letterbox, e = L * L * (3 - 2 * L), floor = VH - this.barH() * e - 14;
  const F = b.font || `18px ${SERIF_FONT}`;
  ctx.save();
  ctx.font = F;
  const textW = Math.min(640, VW * 0.52), lines = wrapText(b.text, textW), lh = 25;
  const h = Math.max(118, lines.length * lh + 64), y0 = floor - h;
  const k = Math.min(1, b.age / 0.2), ease = 1 - Math.pow(1 - k, 3);
  ctx.globalAlpha = ease;
  ctx.translate(0, (1 - ease) * 10);   // rises 10 px as it fades in

  // the band, fading out at both sides
  const g = ctx.createLinearGradient(0, 0, VW, 0);
  g.addColorStop(0, `rgba(${DLG_INK},0)`); g.addColorStop(0.16, `rgba(${DLG_INK},.85)`);
  g.addColorStop(0.84, `rgba(${DLG_INK},.85)`); g.addColorStop(1, `rgba(${DLG_INK},0)`);
  ctx.fillStyle = g; ctx.fillRect(0, y0, VW, h);
  const v = ctx.createLinearGradient(0, y0, 0, y0 + h);
  v.addColorStop(0, 'rgba(197,160,89,.06)'); v.addColorStop(0.5, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.25)');
  ctx.fillStyle = v; ctx.fillRect(VW * 0.1, y0, VW * 0.8, h);
  // gold lines, breathing slowly, with a red-centred diamond on the top one
  const breathe = 0.6 + 0.25 * Math.sin(Game.time * 1.05);
  for (const yy of [y0, y0 + h]) {
    const lg = ctx.createLinearGradient(0, 0, VW, 0);
    lg.addColorStop(0.06, 'rgba(197,160,89,0)'); lg.addColorStop(0.3, `rgba(197,160,89,${breathe})`);
    lg.addColorStop(0.7, `rgba(197,160,89,${breathe})`); lg.addColorStop(0.94, 'rgba(197,160,89,0)');
    ctx.fillStyle = lg; ctx.fillRect(0, yy - 0.5, VW, 1.2);
  }
  ctx.save(); ctx.translate(VW / 2, y0); ctx.rotate(Math.PI / 4);
  ctx.fillStyle = `rgb(${DLG_INK})`; ctx.fillRect(-5, -5, 10, 10);
  ctx.strokeStyle = DLG_GOLD; ctx.lineWidth = 1.4; ctx.strokeRect(-5, -5, 10, 10);
  ctx.fillStyle = DLG_RED; ctx.fillRect(-1.6, -1.6, 3.2, 3.2);
  ctx.restore();

  // the portrait: a hop on every new line, a slight bob while the line types out
  const px = Math.max(70, (VW - textW) / 2 - 78), pr = 42;
  const hop = -11 * Math.exp(-age * 7) * Math.cos(age * 16);
  const talk = b.shown < b.text.length ? Math.sin(Game.time * 22) * 1.3 : 0;
  const py = y0 + h / 2 + hop + talk;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const halo = ctx.createRadialGradient(px, py, pr * 0.5, px, py, pr * 1.9);
  halo.addColorStop(0, hexA(col === '#000000' ? '#5a4a6a' : col, 0.35)); halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo; ctx.fillRect(px - pr * 2, py - pr * 2, pr * 4, pr * 4);
  ctx.restore();
  this.drawPortrait(b.who, px, py, pr, Game.time);
  ctx.beginPath(); ctx.arc(px, py, pr + 5, 0, 7); ctx.lineWidth = 1.2; ctx.strokeStyle = `rgba(197,160,89,${0.55 + 0.2 * breathe})`; ctx.stroke();
  if (b.fresh && b.age < 0.35) { ctx.beginPath(); ctx.arc(px, py, pr + (b.age / 0.35) * 18, 0, 7); ctx.lineWidth = 2; ctx.strokeStyle = `rgba(255,248,235,${1 - b.age / 0.35})`; ctx.stroke(); }

  // the name, in tracked serif capitals
  const tx = px + pr + 34;
  ctx.textBaseline = 'top'; ctx.textAlign = 'left';
  ctx.font = `600 14px ${DLG_NAME_FONT}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
  ctx.fillStyle = DLG_GOLD; ctx.shadowColor = 'rgba(197,160,89,.45)'; ctx.shadowBlur = 8;
  ctx.fillText(b.who, tx, y0 + 16);
  const nw = ctx.measureText(b.who).width;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  ctx.shadowBlur = 0;
  ctx.fillStyle = hexA(col === '#000000' ? '#9E9689' : col, 0.9); ctx.fillRect(tx, y0 + 35, Math.min(nw, 40), 1.5);

  // the line, word by word, typed out
  let left = Math.floor(b.shown), wi = 0, inAct = false, caretX = tx, caretY = y0 + 44;
  ctx.shadowColor = 'rgba(197,160,89,.28)'; ctx.shadowBlur = 6;
  lines.forEach((l, li) => {
    let x = tx;
    const y = y0 + 44 + li * lh;
    for (const word of l.split(' ')) {
      if (left <= 0) return;
      const vis = word.slice(0, left), bare = word.replace(/[^A-Za-z]/g, '');
      const shout = !b.plain && bare.length >= 2 && bare === bare.toUpperCase() && !NOT_SHOUTS.includes(bare);
      if (word.startsWith('*')) inAct = true;
      const act = inAct;
      if (/\*[.,!?…]*$/.test(word) && (word.length > 1 || !word.startsWith('*'))) inAct = false;
      ctx.font = act ? `italic ${F}` : F;
      ctx.fillStyle = act ? DLG_GREY : shout ? DLG_RED : DLG_IVORY;
      const j = shout ? Math.sin(Game.time * 47 + wi * 2.3) * 0.9 : 0;
      ctx.fillText(vis, x + j, y + Math.cos(Game.time * 41 + wi) * Math.abs(j));
      caretX = x + ctx.measureText(vis).width + 2; caretY = y;
      ctx.font = F; x += ctx.measureText(word + ' ').width; left -= word.length + 1; wi++;
    }
  });
  ctx.shadowBlur = 0;
  if (b.shown < b.text.length && Math.sin(Game.time * 11) > -0.15) { ctx.fillStyle = 'rgba(197,160,89,.85)'; ctx.fillRect(caretX, caretY + 2, 1.5, 18); }
  // waiting for you: a small gold diamond, bobbing, at the right end of the band
  if (b.shown >= b.text.length) {
    const bob = Math.abs(Math.sin(Game.time * 4)) * 4, ax = Math.min(VW - 70, tx + textW + 20), ay = y0 + h - 26 + bob;
    ctx.save(); ctx.translate(ax, ay); ctx.rotate(Math.PI / 4);
    ctx.strokeStyle = DLG_GOLD; ctx.lineWidth = 1.5; ctx.strokeRect(-5, -5, 10, 10);
    ctx.fillStyle = DLG_RED; ctx.fillRect(-2, -2, 4, 4);
    ctx.restore();
  }
  ctx.restore();
};

/* the character voices (Josh, Lars, Fionn, Deniz, Reshman) now live in game/audio.js, next to the other sounds */
