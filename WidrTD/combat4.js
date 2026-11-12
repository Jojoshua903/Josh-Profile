// ===== WIDR TD: art for the Wat in de Combat heroes =====
function catHead(ctx, x, y, r, fur, dark) {
  shape(ctx, () => { ctx.moveTo(x - r * .95, y - r * .2); ctx.lineTo(x - r * .75, y - r * 1.25); ctx.lineTo(x - r * .2, y - r * .8); ctx.closePath(); ctx.moveTo(x + r * .95, y - r * .2); ctx.lineTo(x + r * .75, y - r * 1.25); ctx.lineTo(x + r * .2, y - r * .8); ctx.closePath(); }, fur, 2);
  sticker(ctx, circ(ctx, x, y, r), fur, 2.5, 2.5);
  ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.ellipse(x - r * .38, y - r * .1, r * .2, r * .24, 0, 0, 7); ctx.ellipse(x + r * .38, y - r * .1, r * .2, r * .24, 0, 0, 7); ctx.fill();
  ctx.fillStyle = INK; ctx.fillRect(x - r * .42, y - r * .3, r * .1, r * .4); ctx.fillRect(x + r * .34, y - r * .3, r * .1, r * .4);
  ctx.fillStyle = '#f27a9a'; ctx.beginPath(); ctx.moveTo(x - 2, y + r * .2); ctx.lineTo(x + 2, y + r * .2); ctx.lineTo(x, y + r * .38); ctx.fill();
  ctx.strokeStyle = dark; ctx.lineWidth = 1; ctx.beginPath();
  ctx.moveTo(x - r * .3, y + r * .35); ctx.lineTo(x - r * 1.1, y + r * .25); ctx.moveTo(x + r * .3, y + r * .35); ctx.lineTo(x + r * 1.1, y + r * .25); ctx.stroke();
}
HERO_ART.kayoyara = (ctx, SK, t, s) => {
  const kayo = s && s.form === 'kayo', top = kayo ? (SK.kayo || '#6a4430') : (SK.yara || '#c98a4a'), low = kayo ? (SK.yara || '#c98a4a') : (SK.kayo || '#6a4430');
  // long trenchcoat with a belt
  sticker(ctx, () => { ctx.moveTo(-11, -2); ctx.lineTo(11, -2); ctx.lineTo(14, 19); ctx.lineTo(-14, 19); ctx.closePath(); }, SK.coat || '#c8a874', 2.5, 2.5);
  ctx.fillStyle = '#8a6a44'; ctx.fillRect(-13, 9, 26, 3); ctx.fillStyle = PAL.sun; ctx.fillRect(-2, 9, 4, 3);
  shape(ctx, () => { ctx.moveTo(-8, -2); ctx.lineTo(0, 7); ctx.lineTo(8, -2); }, '#a8884f', 1.5);
  // the bottom cat peeks out between the buttons
  ctx.fillStyle = low; ctx.beginPath(); ctx.arc(0, 15, 3.2, 0, 7); ctx.fill(); ctx.fillStyle = '#ffd23f'; ctx.fillRect(-2, 14, 1.4, 1.4); ctx.fillRect(.8, 14, 1.4, 1.4);
  catHead(ctx, 0, -10, 9.5, top, kayo ? '#2a1a10' : '#6a4024');
};
HERO_ART.dih = (ctx, SK, t) => {
  // a dirt hole in the road with the worm rising out of it
  shape(ctx, () => ctx.ellipse(0, 12, 15, 6, 0, 0, 7), '#5e3c24', 2);
  ctx.fillStyle = '#2a1a10'; ctx.beginPath(); ctx.ellipse(0, 12, 10, 3.5, 0, 0, 7); ctx.fill();
  const pink = SK.worm || '#ff8fb1', w = Math.sin(t * 5) * 2;
  for (let i = 0; i < 4; i++) sticker(ctx, circ(ctx, Math.sin(i * 1.3 + t * 4) * 2.5, 9 - i * 6, 7 - i * .4), i % 2 ? pink : (SK.worm2 || '#ffb3c8'), 1, 2);
  sticker(ctx, circ(ctx, w, -15, 8.5), pink, 2, 2.5);
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(w - 3, -17, 2.6, 0, 7); ctx.arc(w + 3, -17, 2.6, 0, 7); ctx.fill();
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(w - 2.5, -17, 1.3, 0, 7); ctx.arc(w + 3.5, -17, 1.3, 0, 7); ctx.fill();
  ctx.strokeStyle = '#a03a5a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(w, -13, 3, .2, Math.PI - .2); ctx.stroke();
};
HERO_ART.alexander = (ctx, SK) => {
  body(ctx, SK.suit || '#1d1d22', 13);
  shape(ctx, () => { ctx.moveTo(-3, 6); ctx.lineTo(0, 13); ctx.lineTo(3, 6); ctx.closePath(); }, '#f4f4f4', 1);
  ctx.fillStyle = '#b81a25'; ctx.fillRect(-1, 7, 2, 6);
  ctx.fillStyle = '#e8334a'; ctx.beginPath(); ctx.arc(-8, 9, 1.8, 0, 7); ctx.fill(); // rose
  face(ctx, 0, -3, 11, PAL.skin, {ey: -1});
  shape(ctx, () => { ctx.moveTo(-6, 2); ctx.quadraticCurveTo(0, -1, 6, 2); ctx.quadraticCurveTo(0, 4, -6, 2); }, '#3a2a22', 1); // moustache
  // fedora
  sticker(ctx, () => ctx.ellipse(0, -10, 15, 3.5, 0, 0, 7), SK.hat || '#2b2b33', 2, 2.5);
  sticker(ctx, () => { ctx.moveTo(-9, -10); ctx.lineTo(-7, -20); ctx.quadraticCurveTo(0, -17, 7, -20); ctx.lineTo(9, -10); ctx.closePath(); }, SK.hat || '#2b2b33', 2, 2.5);
  ctx.fillStyle = '#b81a25'; ctx.fillRect(-8.5, -13, 17, 2.5);
};
HELD_ART.alexander = (ctx) => { sticker(ctx, () => ctx.roundRect(-7, -5, 14, 10, 2), '#6b4224', 1.5, 2); ctx.fillStyle = PAL.sun; ctx.fillRect(-2, -6.5, 4, 2); ctx.fillRect(-1, -1, 2, 2); };
HERO_ART.stormmoeder = (ctx, SK, t) => {
  const pur = SK.scales || '#3a2458', flap = Math.sin(t * 3) * 3;
  // wings
  shape(ctx, () => { ctx.moveTo(-8, -4); ctx.lineTo(-30, -18 - flap); ctx.lineTo(-24, -6); ctx.lineTo(-32, 2 - flap * .5); ctx.lineTo(-20, 4); ctx.lineTo(-24, 12); ctx.lineTo(-8, 8); ctx.closePath(); }, (SK.wings || '#5a3a88'), 2.5);
  shape(ctx, () => { ctx.moveTo(8, -4); ctx.lineTo(30, -18 - flap); ctx.lineTo(24, -6); ctx.lineTo(32, 2 - flap * .5); ctx.lineTo(20, 4); ctx.lineTo(24, 12); ctx.lineTo(8, 8); ctx.closePath(); }, (SK.wings || '#5a3a88'), 2.5);
  sticker(ctx, () => ctx.ellipse(0, 6, 13, 12, 0, 0, 7), pur, 3, 2.5);
  ctx.fillStyle = (SK.belly || '#7a5aa8'); ctx.beginPath(); ctx.ellipse(0, 9, 7, 7, 0, 0, 7); ctx.fill();
  // head with horns
  shape(ctx, () => { ctx.moveTo(-6, -16); ctx.lineTo(-11, -27); ctx.lineTo(-3, -18); ctx.moveTo(6, -16); ctx.lineTo(11, -27); ctx.lineTo(3, -18); }, (SK.horns || '#d8d0f0'), 1.5);
  sticker(ctx, () => ctx.ellipse(0, -11, 10, 8.5, 0, 0, 7), pur, 2.5, 2.5);
  sticker(ctx, () => ctx.ellipse(0, -6, 6, 4, 0, 0, 7), pur, 1, 2);
  ctx.fillStyle = '#fff'; ctx.shadowColor = '#c7b8ff'; ctx.shadowBlur = 6;
  ctx.beginPath(); ctx.ellipse(-4, -13, 2.6, 1.6, -.3, 0, 7); ctx.ellipse(4, -13, 2.6, 1.6, .3, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
  // crackling lightning
  if (Math.sin(t * 9) > .6) { ctx.strokeStyle = '#ffe03a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-14, -20); ctx.lineTo(-10, -14); ctx.lineTo(-15, -12); ctx.lineTo(-11, -6); ctx.stroke(); }
};
// A4-38 as in Wat in de Combat: a square white head with one big eye, a thin back leg and a thick kicking front leg.
// Ø9-38 (true form): a black square head with a gold rim, a gold Ø behind it, one huge eye and gold legs.
function a4Leg(ctx, hx, hy, th, sh, w, col, back) {
  const kx = hx + Math.sin(th) * 7, ky = hy + Math.cos(th) * 7, fx = kx + Math.sin(sh) * 7, fy = ky + Math.cos(sh) * 7;
  ctx.strokeStyle = INK; ctx.lineWidth = w + 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.lineTo(fx + (back ? -4 : 4), fy); ctx.stroke();
  ctx.strokeStyle = col; ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.lineTo(fx + (back ? -4 : 4), fy); ctx.stroke();
}
HERO_ART.a438 = (ctx, SK, t, s) => {
  const look = Math.sin(t * .7) > .85 ? -1.5 : 0, blink = (t % 4.3) < .12;
  if (s && s.form === 'o9') {
    const gold = SK.gold || '#e0b33a', gold2 = SK.gold2 || '#a8821e', blk = SK.body || '#141018', eye = SK.eye2 || '#9b5cf0';
    // the Ø behind his head
    ctx.strokeStyle = gold2; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, -8, 17, 0, 7); ctx.moveTo(-14, 9); ctx.lineTo(14, -25); ctx.stroke();
    a4Leg(ctx, -6, 6, .15, 0, 3, gold2, true);
    a4Leg(ctx, 6, 6, -.15, 0, 4, gold, false);
    sticker(ctx, () => ctx.rect(-13, -21, 26, 27), blk, 3, 2.5);
    ctx.strokeStyle = gold; ctx.lineWidth = 1.6; ctx.strokeRect(-12, -20, 24, 25);
    ctx.fillStyle = '#e8e0ff'; for (const [dx, dy] of [[-8, -15], [-9, -4], [-3, -17]]) { ctx.beginPath(); ctx.arc(dx, dy, 1.4, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#fff'; ctx.shadowColor = '#c58bff'; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(3, -9, 6.2, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = eye; ctx.beginPath(); ctx.ellipse(3.6 + look, -9, 3.3, 3.7, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#141018'; ctx.beginPath(); ctx.ellipse(3.6 + look, -9, 1.5, 2.1, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(1.4 + look, -12, 1.4, 1.4);
    ctx.fillStyle = '#e8e0ff'; ctx.fillRect(0, 0, 7, 1); ctx.fillRect(-1, 1, 1, 1); ctx.fillRect(7, 1, 1, 1);
    return;
  }
  const head = SK.head || '#f4f1ea', shade = SK.shade || '#cfc8b8', leg = SK.leg || '#2a2a33', leg2 = SK.leg2 || '#18181e', eye = SK.eye || '#141018', glow = SK.glow || '#c58bff';
  a4Leg(ctx, -5, 4, .1, 0, 2, leg2, true);
  sticker(ctx, () => ctx.rect(-11, -17, 22, 22), head, 3, 2.5);
  ctx.fillStyle = shade; ctx.fillRect(-10, 1, 20, 3); ctx.fillRect(7, -16, 3, 20);
  if (blink) { ctx.fillStyle = eye; ctx.fillRect(1, -9, 8, 1.4); }
  else {
    const ex = 4 + look;
    ctx.strokeStyle = glow; ctx.lineWidth = 1.2; ctx.globalAlpha = .55 + Math.sin(t * 3) * .3;
    ctx.beginPath(); ctx.arc(ex + .5, -8.5, 6.6, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillStyle = eye; ctx.beginPath(); ctx.arc(ex, -9, 4.6, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(ex - 1, -12, 2, 2);
  }
  // small sad mouth
  ctx.fillStyle = eye; ctx.fillRect(1, -1, 1, 1); ctx.fillRect(2, -2, 4, 1); ctx.fillRect(6, -1, 1, 1);
  a4Leg(ctx, 6, 4, -.25, .1, 4.2, leg, false);
};
HERO_ART.kimchi = (ctx, SK) => {
  body(ctx, SK.jacket || '#f7f7f4', 12);
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(-3, 10, 1, 0, 7); ctx.arc(-3, 14, 1, 0, 7); ctx.arc(3, 10, 1, 0, 7); ctx.arc(3, 14, 1, 0, 7); ctx.fill();
  ctx.fillStyle = '#e8334a'; ctx.fillRect(-12, 6, 24, 2.5); // scarf
  face(ctx, 0, -2, 10.5, PAL.skin, {ey: -1});
  shape(ctx, () => { ctx.arc(0, -4, 11, Math.PI * 1.05, Math.PI * 1.95); ctx.closePath(); }, '#1d1720', 1.5);
  // tall chef hat
  sticker(ctx, () => ctx.roundRect(-8, -16, 16, 6, 2), '#fff', 1.5, 2.5);
  sticker(ctx, () => { ctx.arc(-5, -20, 5, 0, 7); ctx.moveTo(10, -21); ctx.arc(5, -21, 5, 0, 7); ctx.moveTo(5, -25); ctx.arc(0, -25, 5, 0, 7); }, '#fff', 2, 2.5);
};
HELD_ART.kimchi = (ctx) => { sticker(ctx, () => ctx.roundRect(-3, -3, 13, 7, 1.5), '#cdd6e4', 1.5, 2); ctx.fillStyle = '#5e3c24'; ctx.fillRect(-9, -1.5, 7, 3); };
HERO_ART.dean = (ctx, SK) => {
  body(ctx, SK.shirt || '#7a4f2e', 12);
  ctx.fillStyle = '#5a381e'; ctx.fillRect(-12, 6, 6, 12); ctx.fillRect(6, 6, 6, 12); // vest
  shape(ctx, circ(ctx, -9, 10, 2), PAL.sun, 1); // sheriff... outlaw star
  face(ctx, 0, -2, 10.5, PAL.skin2, {ey: -1});
  shape(ctx, () => { ctx.moveTo(-10, 2); ctx.lineTo(10, 2); ctx.lineTo(0, 9); ctx.closePath(); }, SK.bandana || '#b81a25', 1.5);
  // cowboy hat
  sticker(ctx, () => { ctx.moveTo(-18, -8); ctx.quadraticCurveTo(0, -3, 18, -8); ctx.quadraticCurveTo(0, -11, -18, -8); }, SK.hat || '#8a5a2b', 2, 2.5);
  sticker(ctx, () => { ctx.moveTo(-8, -9); ctx.lineTo(-7, -19); ctx.quadraticCurveTo(0, -15, 7, -19); ctx.lineTo(8, -9); ctx.closePath(); }, SK.hat || '#8a5a2b', 2, 2.5);
  ctx.fillStyle = '#3a2416'; ctx.fillRect(-7.5, -11.5, 15, 2);
};
HELD_ART.dean = (ctx) => { sticker(ctx, () => ctx.roundRect(-3, -3, 12, 5, 1.5), '#6b6f7a', 1.5, 2); ctx.fillStyle = '#6b4224'; ctx.fillRect(-5, -1, 4, 7); ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(1, 0, 2, 0, 7); ctx.fill(); };
HERO_ART.maat = (ctx, SK, t) => {
  // wings
  const f = Math.sin(t * 3) * 2;
  shape(ctx, () => { ctx.moveTo(-6, 0); ctx.quadraticCurveTo(-26, -14 - f, -22, 8); ctx.quadraticCurveTo(-14, 4, -6, 10); ctx.closePath(); }, '#fff', 2);
  shape(ctx, () => { ctx.moveTo(6, 0); ctx.quadraticCurveTo(26, -14 - f, 22, 8); ctx.quadraticCurveTo(14, 4, 6, 10); ctx.closePath(); }, '#fff', 2);
  sticker(ctx, () => { ctx.moveTo(-9, 4); ctx.lineTo(9, 4); ctx.lineTo(13, 19); ctx.lineTo(-13, 19); ctx.closePath(); }, SK.robe || '#f4f6fa', 2.5, 2.5);
  ctx.fillStyle = SK.trim || '#c9a26b'; ctx.fillRect(-13, 16, 26, 3);
  face(ctx, 0, -4, 10, PAL.skin, {ey: -1});
  shape(ctx, () => { ctx.arc(0, -6, 10.6, Math.PI * .95, Math.PI * 2.05); ctx.lineTo(10, 4); ctx.lineTo(8, -2); ctx.lineTo(-8, -2); ctx.lineTo(-10, 4); ctx.closePath(); }, SK.hair || '#f2d27a', 1.5);
  face(ctx, 0, -3, 7.5, PAL.skin, {ey: -1});
  ctx.strokeStyle = PAL.sun; ctx.lineWidth = 2.5; ctx.shadowColor = '#fff3b0'; ctx.shadowBlur = 6;
  ctx.beginPath(); ctx.ellipse(0, -19, 8, 2.5, 0, 0, 7); ctx.stroke(); ctx.shadowBlur = 0;
};
HELD_ART.maat = (ctx) => {
  sticker(ctx, () => { ctx.moveTo(0, -14); ctx.lineTo(3, -2); ctx.lineTo(0, 2); ctx.lineTo(-3, -2); ctx.closePath(); }, '#bfefff', 1.5, 2);
  ctx.fillStyle = '#c9a26b'; ctx.fillRect(-5, 2, 10, 2); ctx.fillRect(-1, 4, 2, 5);
};
HERO_ART.janpool = (ctx, SK) => {
  ctx.fillStyle = INK; ctx.fillRect(-7, 13, 4, 6); ctx.fillRect(3, 13, 4, 6);
  sticker(ctx, () => ctx.roundRect(-13, -18, 26, 33, 5), SK.case || '#3a3f4a', 3, 2.5);
  sticker(ctx, () => ctx.roundRect(-10, -15, 20, 11, 2), SK.screen || '#b8d8a0', 1, 2);
  // a face on the little screen
  ctx.fillStyle = '#26402a'; ctx.fillRect(-6, -12, 3, 3); ctx.fillRect(3, -12, 3, 3); ctx.fillRect(-4, -7, 8, 1.5);
  const keys = ['#cdd6e4', '#cdd6e4', '#ff9f1a'];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) { ctx.fillStyle = c === 2 ? keys[2] : keys[0]; ctx.fillRect(-9 + c * 6.5, -1 + r * 5, 5, 3.5); }
  // a little temple-guardian headdress
  shape(ctx, () => { ctx.moveTo(-10, -18); ctx.lineTo(-6, -25); ctx.lineTo(-2, -19); ctx.lineTo(0, -27); ctx.lineTo(2, -19); ctx.lineTo(6, -25); ctx.lineTo(10, -18); ctx.closePath(); }, PAL.sun, 1.5);
};
HERO_ART.appster = (ctx, SK, t) => {
  const fur = SK.fur || '#9aa0ab';
  body(ctx, fur, 12);
  ctx.fillStyle = SK.shirt || '#ff7ab6'; ctx.fillRect(-10, 8, 20, 6); ctx.fillStyle = '#fff'; ctx.font = '900 6px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('DJ', 0, 13.5);
  // tail
  ctx.strokeStyle = fur; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(10, 16); ctx.quadraticCurveTo(22, 12, 18, 2); ctx.stroke();
  sticker(ctx, circ(ctx, -12, -4, 5), fur, 1.5, 2.5); sticker(ctx, circ(ctx, 12, -4, 5), fur, 1.5, 2.5);
  sticker(ctx, circ(ctx, 0, -4, 11), fur, 3, 2.5);
  sticker(ctx, () => ctx.ellipse(0, -1, 7.5, 6, 0, 0, 7), '#d8d2c4', 1, 2);
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(-3.5, -6, 1.7, 0, 7); ctx.arc(3.5, -6, 1.7, 0, 7); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(0, 0, 3, .2, Math.PI - .2); ctx.stroke();
  // headphones bopping to the beat
  const b = Math.abs(Math.sin(t * 6)) * 1.2;
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -6, 13, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  sticker(ctx, () => ctx.roundRect(-16, -9 - b, 6, 9, 2), SK.phones || '#e8334a', 1.5, 2); sticker(ctx, () => ctx.roundRect(10, -9 - b, 6, 9, 2), SK.phones || '#e8334a', 1.5, 2);
};
HELD_ART.appster = (ctx, s) => { sticker(ctx, circ(ctx, 0, 0, 7), '#1d1d22', 1.5, 2); ctx.fillStyle = '#ff7ab6'; ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, 7); ctx.fill(); };

// projectiles
PROJ_ART.kimchi = (ctx, p) => { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.spin); sticker(ctx, () => ctx.roundRect(-4, -5, 8, 10, 2), '#e8334a', 1, 1.6); ctx.fillStyle = '#fff'; ctx.fillRect(-4, -6, 8, 2.5); ctx.restore(); };
PROJ_ART.digit = (ctx, p) => {
  p.dg = p.dg === undefined ? (Math.random() * 10) | 0 : p.dg;
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.sin(p.spin) * .4);
  ctx.font = `900 ${14 * (p.size || 1)}px "Arial Rounded MT Bold", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.strokeText(p.dg, 0, 0); ctx.fillStyle = '#b8d8a0'; ctx.fillText(p.dg, 0, 0);
  ctx.textBaseline = 'alphabetic'; ctx.restore();
};
PROJ_ART.vinyl = (ctx, p) => { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.spin); sticker(ctx, circ(ctx, 0, 0, 6), '#1d1d22', 1, 1.5); ctx.fillStyle = '#ff7ab6'; ctx.beginPath(); ctx.arc(0, 0, 2, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, 4, 0, 2); ctx.stroke(); ctx.restore(); };

// henchmen, storm orbs, flames and small hero status markers
function extrasDraw(ctx) {
  for (const g of G.goons || []) {
    ctx.save(); ctx.translate(g.x, g.y - 6); const step = Math.sin(G.t * 12 + g.seed) * 2;
    ctx.fillStyle = INK; ctx.fillRect(-4, 4, 3, 6 + step); ctx.fillRect(1, 4, 3, 6 - step);
    sticker(ctx, () => ctx.roundRect(-6, -4, 12, 10, 3), '#1d1d22', 1.5, 2);
    shape(ctx, circ(ctx, 0, -8, 5), PAL.skin, 1.5);
    shape(ctx, () => ctx.roundRect(-4.5, -10, 9, 2.5, 1), '#14101a', 1); // sunglasses
    ctx.restore();
  }
  for (const o of G.orbs || []) {
    ctx.save(); ctx.translate(o.x, o.y);
    ctx.fillStyle = 'rgba(180,140,255,.35)'; ctx.beginPath(); ctx.arc(0, 0, 13, 0, 7); ctx.fill();
    sticker(ctx, circ(ctx, 0, 0, 8), '#5a3a88', 1, 2);
    ctx.strokeStyle = '#ffe03a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(Math.cos(o.spin) * 6, Math.sin(o.spin) * 6); ctx.lineTo(0, 0); ctx.lineTo(Math.cos(o.spin + 2.4) * 6, Math.sin(o.spin + 2.4) * 6); ctx.stroke();
    ctx.restore();
  }
  for (const e of G.enemies) if (e.burnT > 0 && !e.dead) {
    const r = ENEMIES[e.type].r, f = Math.sin(G.t * 20 + e.seed) * 2;
    ctx.fillStyle = 'rgba(255,120,30,.85)'; ctx.beginPath(); ctx.moveTo(e.x - r * .5, e.y - r * .4); ctx.quadraticCurveTo(e.x, e.y - r - 12 - f, e.x + r * .5, e.y - r * .4); ctx.fill();
    ctx.fillStyle = 'rgba(255,220,60,.9)'; ctx.beginPath(); ctx.moveTo(e.x - r * .25, e.y - r * .4); ctx.quadraticCurveTo(e.x, e.y - r - 4 + f, e.x + r * .25, e.y - r * .4); ctx.fill();
  }
  ctx.font = '900 10px sans-serif'; ctx.textAlign = 'center';
  for (const t of G.towers) {
    const sz = heroSize(t.type, t);
    if (t.type === 'dean' && t.s.ammo) {
      const n = t.s.ammo, a = t.reloadT > 0 ? 0 : (t.ammo === undefined ? n : t.ammo);
      for (let i = 0; i < n; i++) { ctx.fillStyle = i < a ? PAL.sun : 'rgba(34,23,43,.35)'; ctx.fillRect(t.x - n * 2 + i * 4, t.y - 34, 3, 5); }
    }
    if (t.s.saves) { ctx.fillStyle = INK; ctx.fillText(`🛡${t.savesLeft || 0}`, t.x, t.y - 30 * sz); }
    if (t.type === 'a438' && t.form !== 'o9' && t.s.breakAt) {
      const k = Math.min(1, t.pops / t.s.breakAt);
      ctx.strokeStyle = 'rgba(34,23,43,.25)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(t.x, t.y - 4, 24, 0, 7); ctx.stroke();
      ctx.strokeStyle = '#e0b33a'; ctx.beginPath(); ctx.arc(t.x, t.y - 4, 24, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); ctx.stroke();
    }
  }
}

// speech-bubble lines
Object.assign(VOICE, {
  kayoyara: {place:['Two cats? No, one very normal person.', 'Meow. I mean, hello.'], up:['Purr.', 'Sharper claws!'], para:['Two cats, one legend!'], ability:['Wissel!'], boss:['Big mouse alert!'], win:['Nobody suspected a thing.']},
  dih: {place:['Wiggle wiggle.', 'Down I go!'], up:['Bigger mouth!', 'Deeper tunnels.'], para:['Behold the sandworm!'], ability:['Ondergronds!'], boss:['Too big to swallow? We\'ll see.'], win:['Back to the dirt.']},
  alexander: {place:['I have a little job for you.', 'Nice road. Be a shame if something happened to it.'], up:['Business is good.', 'The family grows.'], para:['I am the Godfather.'], ability:['Boys! Handle it.'], boss:['Make him an offer he can\'t refuse.'], win:['It\'s just business.']},
  stormmoeder: {place:['The storm has arrived.', 'Feel the thunder.'], up:['The clouds gather.', 'Stronger winds.'], para:['I AM the storm.'], ability:['Storm Call!'], boss:['A worthy prey.'], win:['The storm passes.']},
  a438: {place:['...', 'Containment holding.'], up:['The seal weakens.', 'Paper sharpens.'], para:['Ø9-38 is free.'], ability:['Inperking.'], boss:['A lesser god.'], win:['Order is restored.']},
  kimchi: {place:['Something spicy for you!', 'Order up!'], up:['Extra gochugaru!', 'Sharper knives.'], para:['Michelin star cuisine!'], ability:['Kimchi feast for everyone!'], boss:['That one needs more spice.'], win:['Dinner is served!']},
  dean: {place:['This town ain\'t big enough.', 'Howdy.'], up:['New iron.', 'Faster on the draw.'], para:['Fastest in the west!'], ability:['It\'s high noon.'], boss:['Wanted: dead or alive.'], win:['Yeehaw!']},
  maat: {place:['I\'ll watch over you.', 'Nobody gets through.'], up:['The crystal shines brighter.', 'Blessed.'], para:['Sword of light!'], ability:['Heavenly light!'], boss:['Stay behind me.'], win:['Everyone is safe.']},
  janpool: {place:['Calculating.', 'Solve my riddle.'], up:['More digits!', 'Recalculating.'], para:['Infinity achieved.'], ability:['Pi!'], boss:['That one does not compute.'], win:['Q.E.D.']},
  appster: {place:['You\'re listening to WIDR radio!', 'Drop the beat!'], up:['Turn it up!', 'Fresh vinyl.'], para:['Number one hit!'], ability:['Live mix, let\'s go!'], boss:['Big guest in the studio!'], win:['That\'s a wrap, folks!']},
});
