// ===== WIDR TD: art for the new heroes, enemies, maps and effects =====
// Plugs into draw.js through these lookup tables.
const HERO_ART = {}, HELD_ART = {}, ENEMY_ART = {}, BLOCKER_ART = {}, DECOR_ART = {}, PROJ_ART = {}, FX_ART = {};
const toonSkin = () => typeof Meta !== 'undefined' && Meta.p && Meta.p.equipped.toon;
const toonCols = () => ({toon_pumpkin: ['#d96a00', '#ff8a1f'], toon_robot: ['#6b7486', '#cdd6e4']})[toonSkin()];

// ---------- Heroes ----------
const body = (ctx, col, h = 12) => sticker(ctx, () => ctx.roundRect(-12, 6, 24, h, 4), col, 2, 2.5);
HERO_ART.lars = (ctx, SK) => {
  body(ctx, SK.tunic || '#6b8f3a');
  face(ctx, 0, -4, 11, PAL.skin, {ey: -2, noMouth: true});
  // big beard
  sticker(ctx, () => { ctx.moveTo(-11, -3); ctx.quadraticCurveTo(-13, 12, 0, 15); ctx.quadraticCurveTo(13, 12, 11, -3); ctx.quadraticCurveTo(0, 4, -11, -3); }, SK.beard || '#c9772b', 2, 2);
  shape(ctx, () => ctx.ellipse(0, 0, 3, 2, 0, 0, 7), '#f2a37a', 1.5);
  // mining helmet + lamp
  sticker(ctx, () => { ctx.arc(0, -10, 12, Math.PI, 0); ctx.closePath(); }, SK.helmet || '#ffcc29', 2, 2.5);
  shape(ctx, circ(ctx, 0, -17, 3.5), '#fff6c2', 1.5);
};
HELD_ART.lars = ctx => {
  ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(0, -8); ctx.stroke();
  sticker(ctx, () => { ctx.moveTo(-10, -6); ctx.quadraticCurveTo(0, -14, 10, -6); ctx.lineTo(0, -9); ctx.closePath(); }, '#cdd6e4', 1.5, 2);
};
HERO_ART.milo = (ctx, SK) => {
  body(ctx, SK.robe || '#3b56d9');
  ctx.fillStyle = PAL.sun; ctx.font = '900 7px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('⚡', 0, 16);
  shape(ctx, () => { for (const [a, b] of [[-11, -5], [-8, -10], [8, -10], [11, -5]]) { ctx.moveTo(a, b); ctx.arc(a, b, 4.5, 0, 7); } }, '#1d1720', 1.5); // messy hair
  face(ctx, 0, -3, 11, PAL.skin, {ey: -1});
  sticker(ctx, () => { ctx.moveTo(-14, -9); ctx.lineTo(14, -9); ctx.lineTo(4, -30); ctx.quadraticCurveTo(0, -33, -3, -28); ctx.closePath(); }, SK.hat || '#3b56d9', 2, 2.5);
  ctx.fillStyle = PAL.sun; ctx.beginPath(); ctx.arc(-2, -17, 2, 0, 7); ctx.arc(4, -23, 1.5, 0, 7); ctx.fill();
};
HELD_ART.milo = ctx => {
  ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(0, -8); ctx.stroke();
  sticker(ctx, circ(ctx, 0, -10, 5), PAL.sun, 1.5, 2);
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-1.5, -11.5, 1.5, 0, 7); ctx.fill();
};
HERO_ART.josh = (ctx, SK) => {
  body(ctx, SK.jacket || '#5a8f5c');
  shape(ctx, () => { ctx.arc(0, -5, 12.5, Math.PI * 1.02, Math.PI * 1.98); ctx.quadraticCurveTo(4, -10, -12.4, -6.5); ctx.closePath(); }, '#7a4a26', 2);
  face(ctx, 0, -3, 11, PAL.skin, {ey: -1});
  shape(ctx, () => { ctx.arc(0, -5, 12.5, Math.PI * 1.05, Math.PI * 1.6); ctx.quadraticCurveTo(-2, -12, -11, -7); ctx.closePath(); }, '#7a4a26', 0);
  glasses(ctx, 0, -4, 11);
  ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -3, 13, Math.PI * .9, Math.PI * 1.15); ctx.stroke();
  shape(ctx, circ(ctx, -13, 0, 2.5), PAL.coral, 1.5);
};
HELD_ART.josh = ctx => {
  sticker(ctx, () => ctx.roundRect(-8, -5, 16, 10, 4), '#3b3f4a', 1.5, 2);
  ctx.fillStyle = PAL.coral; ctx.beginPath(); ctx.arc(4, 0, 2, 0, 7); ctx.fill(); ctx.fillStyle = PAL.water; ctx.fillRect(-6, -1.5, 5, 3);
};
HERO_ART.reshman = (ctx, SK) => {
  body(ctx, SK.suit || '#2e2a3a');
  sticker(ctx, circ(ctx, 0, -4, 12), SK.mask || '#2e2a3a', 3, 2.5); // hooded head
  shape(ctx, () => ctx.roundRect(-9, -8, 18, 7, 3), '#8a5a3b', 1.5); // eye slit
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(-4, -4.5, 2.2, 1.8, 0, 0, 7); ctx.ellipse(4, -4.5, 2.2, 1.8, 0, 0, 7); ctx.fill();
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(-3.5, -4.5, 1, 0, 7); ctx.arc(4.5, -4.5, 1, 0, 7); ctx.fill();
  ctx.fillStyle = SK.band || '#e8334a'; ctx.fillRect(-12, -12, 24, 3);
  ctx.strokeStyle = SK.band || '#e8334a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(11, -11); ctx.quadraticCurveTo(18, -12, 20, -6); ctx.stroke();
};
function shuriken(ctx, r, col) {
  sticker(ctx, () => { for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, rr = k % 2 ? r * .35 : r; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); }, col, 1.5, 1.8);
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(0, 0, r * .18, 0, 7); ctx.fill();
}
HELD_ART.reshman = (ctx, s) => shuriken(ctx, 7, '#cdd6e4');
HERO_ART.fionn = (ctx, SK) => {
  body(ctx, SK.coat || '#b5d84a');
  ctx.fillStyle = '#3fa34d'; ctx.fillRect(-12, 6, 24, 4); // scarf
  sticker(ctx, () => ctx.ellipse(0, -7, 11, 15, 0, 0, 7), SK.egg || '#fff3d6', 3, 2.5); // egg head
  ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(-4, -6, 1.6, 2.4, 0, 0, 7); ctx.ellipse(4, -6, 1.6, 2.4, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(0, -1, 3.5, .3, Math.PI - .3); ctx.stroke();
  ctx.strokeStyle = 'rgba(34,23,43,.5)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-3, -20); ctx.lineTo(0, -17); ctx.lineTo(2, -20); ctx.lineTo(5, -17); ctx.stroke();
  ctx.fillStyle = 'rgba(255,90,78,.3)'; ctx.beginPath(); ctx.arc(-7, -1, 2.4, 0, 7); ctx.arc(7, -1, 2.4, 0, 7); ctx.fill();
};
HELD_ART.fionn = ctx => {
  ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 9); ctx.lineTo(0, -6); ctx.stroke();
  sticker(ctx, () => ctx.roundRect(-7, -10, 14, 6, 2), '#9aa3b5', 1.5, 2);
};
HERO_ART.deniz = (ctx, SK) => {
  body(ctx, SK.robe || '#bfe9f9');
  face(ctx, 0, -3, 11, PAL.skin2, {ey: -1});
  shape(ctx, () => { ctx.arc(0, -5, 12, Math.PI * 1.05, Math.PI * 1.95); ctx.quadraticCurveTo(0, -9, -11.6, -7); ctx.closePath(); }, '#4a2a1a', 2);
  sticker(ctx, () => { ctx.moveTo(-14, -9); ctx.lineTo(14, -9); ctx.lineTo(-2, -31); ctx.closePath(); }, SK.hat || '#7fd6ff', 2, 2.5);
  ctx.fillStyle = '#fff'; ctx.font = '900 9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('❄', 0, -13);
};
HELD_ART.deniz = ctx => {
  ctx.strokeStyle = '#cdebfa'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(0, -6); ctx.stroke();
  sticker(ctx, () => { ctx.moveTo(0, -16); ctx.lineTo(5, -8); ctx.lineTo(0, -3); ctx.lineTo(-5, -8); ctx.closePath(); }, '#9fe3ff', 1.5, 2);
};
HERO_ART.sichen = (ctx, SK) => {
  body(ctx, SK.suit || '#ff7ab6');
  shape(ctx, () => { ctx.moveTo(0, 8); ctx.lineTo(-5, 5.5); ctx.lineTo(-5, 10.5); ctx.closePath(); ctx.moveTo(0, 8); ctx.lineTo(5, 5.5); ctx.lineTo(5, 10.5); ctx.closePath(); }, SK.tie || INK, 1);
  // black frizzy hair
  shape(ctx, () => { for (let k = 0; k < 9; k++) { const a = Math.PI * (1.05 + k * .1), x = Math.cos(a) * 12, y = -4 + Math.sin(a) * 12; ctx.moveTo(x + 4, y); ctx.arc(x, y, 4, 0, 7); } }, '#141018', 1.5);
  face(ctx, 0, -2, 11, PAL.skin, {ey: -1});
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 2, 3.5, 0, Math.PI); ctx.fill(); // big grin
};
HELD_ART.sichen = ctx => {
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(0, -2); ctx.stroke();
  sticker(ctx, () => ctx.ellipse(0, -5, 4.5, 6, 0, 0, 7), '#cdd6e4', 1.5, 2);
};
HERO_ART.anna = (ctx, SK) => {
  body(ctx, SK.apron || '#4fb86b');
  shape(ctx, () => ctx.ellipse(0, 0, 14, 13, 0, 0, 7), '#7a4a26', 2); // straight brown hair
  face(ctx, 0, -3, 11, PAL.skin, {ey: -1});
  sticker(ctx, () => ctx.ellipse(0, -11, 17, 5, 0, 0, 7), SK.hat || '#f2d27a', 2, 2.5);
  sticker(ctx, () => { ctx.arc(0, -13, 9, Math.PI, 0); ctx.closePath(); }, SK.hat || '#f2d27a', 1.5, 2.5);
  for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; shape(ctx, circ(ctx, 8 + Math.cos(a) * 2.6, -15 + Math.sin(a) * 2.6, 2.2), '#ff7ab6', 1); }
  shape(ctx, circ(ctx, 8, -15, 1.6), PAL.sun, 1);
};
HELD_ART.anna = ctx => {
  sticker(ctx, () => ctx.roundRect(-6, -6, 12, 11, 3), '#5fb8ff', 1.5, 2);
  ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(6, -3); ctx.lineTo(12, -9); ctx.stroke();
};
// tier 4/5 glow and the main hero's crown + level
function heroExtras(ctx, x, y, sc, s, t) {
  if (!s) return;
  if (s.paradise) {
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
    const n = s.paradise === 5 ? 6 : 3;
    for (let k = 0; k < n; k++) {
      const a = t * 2 + k / n * Math.PI * 2;
      ctx.fillStyle = s.paradise === 5 ? `hsl(${(k * 60 + t * 120) % 360},90%,60%)` : PAL.sun;
      ctx.beginPath(); ctx.arc(Math.cos(a) * 26, 4 + Math.sin(a) * 12, 3, 0, 7); ctx.fill();
    }
    ctx.strokeStyle = s.paradise === 5 ? `hsl(${(t * 120) % 360},90%,60%)` : PAL.sun; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(0, 12, 27, 13, 0, 0, 7); ctx.stroke();
    ctx.restore();
  }
  if (s.heroLv) {
    ctx.save(); ctx.translate(x, y - 34 * sc);
    sticker(ctx, () => { ctx.moveTo(-8, 3); ctx.lineTo(-8, -5); ctx.lineTo(-4, -1); ctx.lineTo(0, -7); ctx.lineTo(4, -1); ctx.lineTo(8, -5); ctx.lineTo(8, 3); ctx.closePath(); }, PAL.sun, 1.5, 2);
    ctx.font = '900 9px "Arial Rounded MT Bold", sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = INK;
    ctx.strokeText(s.heroLv, 0, 13); ctx.fillStyle = '#fff'; ctx.fillText(s.heroLv, 0, 13);
    ctx.restore();
  }
}

// ---------- Enemies ----------
ENEMY_ART.sprout = (ctx, e, r, fill) => {
  sticker(ctx, () => ctx.ellipse(0, 0, r, r * .85, 0, 0, 7), fill, 3, 2.5);
  sticker(ctx, () => ctx.ellipse(5, -r - 3, 6, 3, -.6, 0, 7), '#4fb83b', 1.5, 2);
  sticker(ctx, () => ctx.ellipse(-4, -r - 2, 5, 2.5, .6, 0, 7), '#4fb83b', 1.5, 2);
  eyes(ctx, 0, -1, r, e.ang);
};
ENEMY_ART.icegel = (ctx, e, r, fill) => {
  sticker(ctx, () => { ctx.arc(0, -2, r * .8, Math.PI, 0); ctx.lineTo(r * .8, 4); ctx.quadraticCurveTo(0, r, -r * .8, 4); ctx.closePath(); }, '#ffb3d1', 2, 2);
  eyes(ctx, 0, -2, r * .8, e.ang);
  ctx.fillStyle = 'rgba(191,233,249,.65)'; ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.roundRect(-r, -r, r * 2, r * 2, 4); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-r + 4, -r + 8); ctx.lineTo(-r + 8, -r + 4); ctx.stroke();
};
ENEMY_ART.crow = (ctx, e, r, fill, t) => {
  const flap = Math.sin(t * 14 + e.seed) * .6;
  for (const sx of [-1, 1]) sticker(ctx, () => { ctx.moveTo(sx * 4, 0); ctx.quadraticCurveTo(sx * r * 1.4, -r * (.6 + flap), sx * r * 1.8, r * .2); ctx.quadraticCurveTo(sx * r, r * .2, sx * 4, 4); }, '#3f3550', 2, 2);
  sticker(ctx, () => ctx.ellipse(0, 0, r * .75, r * .85, 0, 0, 7), fill, 3, 2.5);
  shape(ctx, () => { ctx.moveTo(-3, 2); ctx.lineTo(0, 8); ctx.lineTo(3, 2); ctx.closePath(); }, PAL.sun, 1.5);
  eyes(ctx, 0, -3, r * .8, e.ang, true);
};
ENEMY_ART.bot = (ctx, e, r, fill, t) => {
  ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(0, -r - 5); ctx.stroke();
  const sp = Math.cos(t * 30) * 12; ctx.fillStyle = 'rgba(34,23,43,.6)'; ctx.fillRect(-Math.abs(sp), -r - 7, Math.abs(sp) * 2, 3);
  sticker(ctx, () => ctx.roundRect(-r, -r * .8, r * 2, r * 1.6, 5), fill, 3, 2.5);
  ctx.fillStyle = INK; ctx.fillRect(-r * .6, -r * .3, r * 1.2, r * .5);
  ctx.fillStyle = PAL.coral; ctx.fillRect(-r * .45, -r * .2, r * .3, r * .3); ctx.fillRect(r * .15, -r * .2, r * .3, r * .3);
};
ENEMY_ART.medic = (ctx, e, r, fill) => {
  sticker(ctx, () => ctx.ellipse(0, 0, r, r * .9, 0, 0, 7), fill, 3, 2.5);
  ctx.fillStyle = '#e8334a'; ctx.fillRect(-2.5, r * .1, 5, 12); ctx.fillRect(-6, r * .1 + 3.5, 12, 5);
  sticker(ctx, () => { ctx.arc(0, -r * .55, r * .6, Math.PI, 0); ctx.closePath(); }, '#fff', 1.5, 2);
  ctx.fillStyle = '#e8334a'; ctx.fillRect(-1.5, -r * .95, 3, 6); ctx.fillRect(-3.5, -r * .85, 7, 2.5);
  eyes(ctx, 0, -r * .1, r * .8, e.ang);
};
ENEMY_ART.guard = (ctx, e, r, fill) => {
  sticker(ctx, () => ctx.ellipse(0, 0, r * 1.1, r * .85, 0, 0, 7), fill, 3, 2.5);
  eyes(ctx, 0, -3, r, e.ang, true);
  // shield faces the way the guard is walking
  ctx.save(); ctx.rotate(e.ang);
  sticker(ctx, () => { ctx.moveTo(r * .9, -r); ctx.quadraticCurveTo(r * 1.5, 0, r * .9, r); ctx.quadraticCurveTo(r * 1.15, 0, r * .9, -r); }, '#cdd6e4', 2, 2.5);
  ctx.restore();
};
ENEMY_ART.zennith = (ctx, e, r, fill, t) => {
  sticker(ctx, () => ctx.ellipse(0, 0, r, r * .9, 0, 0, 7), fill, 5, 3.5);
  shape(ctx, () => { ctx.moveTo(-r * .6, -r * .6); ctx.lineTo(-r * .9, -r * 1.4); ctx.lineTo(-r * .2, -r * .8); ctx.moveTo(r * .6, -r * .6); ctx.lineTo(r * .9, -r * 1.4); ctx.lineTo(r * .2, -r * .8); }, '#3b2a52', 3);
  sticker(ctx, () => { ctx.arc(0, -r * .5, r * .65, Math.PI, 0); ctx.closePath(); }, '#3b2a52', 2, 2.5); // pitcher's cap
  eyes(ctx, 0, -r * .05, r, e.ang, true);
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(r * .9, r * .3, 6, 0, 7); ctx.fill(); ctx.strokeStyle = PAL.coral; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = `rgba(255,${120 + Math.sin(t * 10) * 60},40,.5)`; ctx.beginPath(); ctx.arc(r * .9, r * .3, 10, 0, 7); ctx.fill();
};
ENEMY_ART.byte = (ctx, e, r, fill) => {
  const hot = e.phase2;
  for (const sx of [-1, 1]) sticker(ctx, () => ctx.roundRect(sx * r * 1.05 - 7, -r * .4, 14, r * .9, 4), hot ? '#e8334a' : '#6b7894', 2, 2.5);
  sticker(ctx, () => ctx.roundRect(-r, -r * .85, r * 2, r * 1.7, 8), hot ? '#c95a5a' : fill, 5, 3.5);
  ctx.fillStyle = INK; ctx.fillRect(-r * .65, -r * .45, r * 1.3, r * .45);
  ctx.fillStyle = hot ? PAL.sun : '#7fd6ff'; ctx.fillRect(-r * .5, -r * .35, r * .35, r * .25); ctx.fillRect(r * .15, -r * .35, r * .35, r * .25);
  ctx.fillStyle = INK; ctx.font = '900 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('BYTE', 0, r * .45);
};
ENEMY_ART.metaai = (ctx, e, r, fill, t) => {
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, 0, r * 1.5, r * .45, t, 0, 7); ctx.stroke();
  sticker(ctx, circ(ctx, 0, 0, r), fill, 5, 3.5);
  shape(ctx, () => ctx.ellipse(0, 0, r * .6, r * .4, 0, 0, 7), '#fff', 2.5);
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(Math.cos(e.ang) * 4, Math.sin(e.ang) * 3, r * .22, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r * .8, -2.4, -1.4); ctx.stroke();
};

// ---------- Map pieces ----------
BLOCKER_ART.vent = (g, p) => {
  sticker(g, () => g.ellipse(p.x, p.y, p.r + 4, p.r * .8, 0, 0, 7), '#5a4a40', 3, 3);
  g.fillStyle = '#ff6a1f'; g.beginPath(); g.ellipse(p.x, p.y, p.r * .6, p.r * .4, 0, 0, 7); g.fill();
  g.fillStyle = PAL.sun; g.beginPath(); g.ellipse(p.x, p.y, p.r * .3, p.r * .2, 0, 0, 7); g.fill();
};
BLOCKER_ART.pillar = (g, p) => {
  sticker(g, circ(g, p.x, p.y, p.r), '#fbf6ee', 5, 3.5);
  g.strokeStyle = 'rgba(34,23,43,.25)'; g.lineWidth = 2;
  for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; g.beginPath(); g.moveTo(p.x + Math.cos(a) * p.r * .4, p.y + Math.sin(a) * p.r * .4); g.lineTo(p.x + Math.cos(a) * p.r * .9, p.y + Math.sin(a) * p.r * .9); g.stroke(); }
  shape(g, circ(g, p.x, p.y, p.r * .35), '#ffd166', 2);
};
BLOCKER_ART.tires = (g, p) => {
  for (const [dx, dy] of [[-p.r * .45, p.r * .3], [p.r * .45, p.r * .3], [0, -p.r * .4]]) {
    sticker(g, circ(g, p.x + dx, p.y + dy, p.r * .55), '#4a4458', 3, 3);
    shape(g, circ(g, p.x + dx, p.y + dy, p.r * .25), '#cdeaa0', 2);
  }
  g.fillStyle = PAL.coral; g.fillRect(p.x - p.r * .7, p.y + p.r * .25, p.r * 1.4, 3);
};
BLOCKER_ART.podium = (g, p, R) => {
  const s = p.r * 1.5, L = 'ABCD'[Math.floor(p.x + p.y) % 4], cols = {A: '#ff5a4e', B: '#3fc1c9', C: '#ffcc29', D: '#a65cff'};
  sticker(g, () => g.roundRect(p.x - s / 2, p.y - s * .5, s, s, 8), cols[L], 5, 3.5);
  sticker(g, () => g.roundRect(p.x - s * .32, p.y - s * .3, s * .64, s * .45, 5), '#fff', 2, 2.5);
  g.font = `900 ${Math.round(s * .35)}px "Arial Rounded MT Bold", sans-serif`; g.fillStyle = INK; g.textAlign = 'center'; g.fillText(L, p.x, p.y + s * .05);
};
DECOR_ART.town = (g, x, y, t) => {
  if (t < .4) { // street lamp
    g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y + 12); g.lineTo(x, y - 14); g.stroke();
    sticker(g, circ(g, x, y - 16, 6), '#fff6c2', 2, 2.5);
  } else if (t < .75) { // flower box
    sticker(g, () => g.rect(x - 14, y - 4, 28, 10), '#c9772b', 2, 2.5);
    [-8, 0, 8].forEach((dx, i) => shape(g, circ(g, x + dx, y - 7, 4), ['#ff7ab6', '#ffcc29', '#ff5a4e'][i], 1.5));
  } else { // red mailbox
    sticker(g, () => g.roundRect(x - 8, y - 12, 16, 22, 4), '#e8334a', 2, 2.5);
    g.fillStyle = INK; g.fillRect(x - 5, y - 6, 10, 2.5);
  }
};
DECOR_ART.hotel = (g, x, y, t) => {
  if (t < .4) { // potted plant
    sticker(g, () => g.rect(x - 8, y, 16, 12), '#c9772b', 2, 2.5);
    sticker(g, () => { g.arc(x - 5, y - 4, 7, 0, 7); g.moveTo(x + 12, y - 4); g.arc(x + 5, y - 4, 7, 0, 7); g.moveTo(x + 6, y - 11); g.arc(x, y - 11, 6, 0, 7); }, '#4fb86b', 2, 2.5);
  } else if (t < .75) { // luggage cart
    sticker(g, () => g.rect(x - 14, y - 4, 28, 6), '#ffd166', 2, 2.5);
    sticker(g, () => g.roundRect(x - 10, y - 16, 10, 12, 2), '#3fc1c9', 1.5, 2); sticker(g, () => g.roundRect(x + 1, y - 13, 9, 9, 2), '#ff7ab6', 1.5, 2);
  } else { // rug
    sticker(g, () => g.roundRect(x - 18, y - 10, 36, 20, 4), '#a65cff', 2, 2.5);
    g.strokeStyle = PAL.sun; g.lineWidth = 2; g.strokeRect(x - 13, y - 6, 26, 12);
  }
};
DECOR_ART.race = (g, x, y, t) => {
  if (t < .4) { // chequered flag
    g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.moveTo(x - 8, y + 12); g.lineTo(x - 8, y - 16); g.stroke();
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { g.fillStyle = (i + j) % 2 ? INK : '#fff'; g.fillRect(x - 8 + i * 5, y - 16 + j * 5, 5, 5); }
    g.strokeStyle = INK; g.lineWidth = 1.5; g.strokeRect(x - 8, y - 16, 20, 15);
  } else if (t < .75) { // cone
    sticker(g, () => { g.moveTo(x, y - 12); g.lineTo(x + 7, y + 8); g.lineTo(x - 7, y + 8); g.closePath(); }, '#ff8a1f', 2, 2.5);
  } else { // tyre
    sticker(g, circ(g, x, y, 10), '#4a4458', 2, 2.5); shape(g, circ(g, x, y, 4), '#cdeaa0', 1.5);
  }
};
DECOR_ART.studio = (g, x, y, t) => {
  if (t < .4) { // camera
    sticker(g, () => g.roundRect(x - 12, y - 8, 20, 14, 3), '#3b3f4a', 2, 2.5);
    sticker(g, circ(g, x + 11, y - 1, 5), '#9fc3ea', 1.5, 2);
  } else if (t < .75) { // star on the floor
    sticker(g, () => { for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? 5 : 12; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); }, PAL.sun, 2, 2.5);
  } else { // $ sign
    g.font = '900 24px "Arial Rounded MT Bold", sans-serif'; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = INK; g.strokeText('$', x, y + 8); g.fillStyle = '#7be36b'; g.fillText('$', x, y + 8);
  }
};
function drawTramTrack(g, y) {
  g.fillStyle = '#b8a48e'; for (let x = 0; x < W; x += 16) g.fillRect(x, y - 16, 8, 32);
  g.strokeStyle = INK; g.lineWidth = 4; for (const dy of [-9, 9]) { g.beginPath(); g.moveTo(0, y + dy); g.lineTo(W, y + dy); g.stroke(); }
  g.strokeStyle = '#cdd6e4'; g.lineWidth = 2; for (const dy of [-9, 9]) { g.beginPath(); g.moveTo(0, y + dy); g.lineTo(W, y + dy); g.stroke(); }
}
// map recolours from the Trophy Store
function applyTint(g) {
  const tint = typeof Meta !== 'undefined' && Meta.p ? Meta.p.equipped.tint : null;
  if (!tint) return;
  g.save();
  if (tint === 'tint_night') { g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgba(90,100,190,.55)'; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'screen'; g.fillStyle = 'rgba(255,230,140,.08)'; g.fillRect(0, 0, W, H); }
  if (tint === 'tint_autumn') { g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgba(255,170,90,.55)'; g.fillRect(0, 0, W, H); }
  if (tint === 'tint_neon') { g.globalCompositeOperation = 'hue'; g.fillStyle = 'rgba(255,0,200,.55)'; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'saturation'; g.fillStyle = 'rgba(255,0,0,.6)'; g.fillRect(0, 0, W, H); }
  if (TINTS[tint]) TINTS[tint](g);
  g.restore();
}

// ---------- Live map hazards, drones and vines (drawn every frame) ----------
function drawHazards(ctx, t) {
  for (const dr of DOORS) {
    ctx.save(); ctx.translate(dr.x, dr.y); ctx.rotate(dr.ang + Math.PI / 2);
    const shut = dr.closed;
    sticker(ctx, () => ctx.roundRect(-PATH_W / 2 - 6, -5, PATH_W + 12, 10, 4), shut ? '#e8334a' : 'rgba(123,227,107,.0)', shut ? 3 : 0, shut ? 3 : 0);
    if (!shut) { ctx.strokeStyle = '#7be36b'; ctx.lineWidth = 3; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(-PATH_W / 2, 0); ctx.lineTo(PATH_W / 2, 0); ctx.stroke(); ctx.setLineDash([]); }
    for (const sx of [-1, 1]) sticker(ctx, () => ctx.rect(sx * (PATH_W / 2 + 6) - 5, -9, 10, 18), '#cdd6e4', 2, 2.5);
    ctx.restore();
  }
  if (G.tram && G.tram.x > -200) {
    const y = MAP.tram.y, x = G.tram.x;
    sticker(ctx, () => ctx.roundRect(x - 130, y - 20, 130, 40, 10), '#ffcc29', 5, 3.5);
    ctx.fillStyle = '#9fe3ff'; for (let i = 0; i < 4; i++) { ctx.fillRect(x - 120 + i * 30, y - 12, 22, 14); }
    ctx.strokeStyle = INK; ctx.lineWidth = 2; for (let i = 0; i < 4; i++) ctx.strokeRect(x - 120 + i * 30, y - 12, 22, 14);
    ctx.fillStyle = PAL.coral; ctx.fillRect(x - 130, y + 8, 130, 5);
  }
  if (MAP.vents) MAP.vents.forEach((v, i) => {
    const warn = G.ventT !== undefined && G.ventT < 1.6 && G.running;
    if (warn) { ctx.strokeStyle = `rgba(255,106,31,${.4 + Math.sin(t * 20) * .3})`; ctx.lineWidth = 3; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.arc(v.x, v.y, 100, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
    ctx.fillStyle = 'rgba(120,110,110,.35)'; for (let k = 0; k < 3; k++) { const yy = v.y - 14 - ((t * 20 + k * 12) % 36); ctx.beginPath(); ctx.arc(v.x + Math.sin(t * 2 + k) * 4, yy, 4 + k, 0, 7); ctx.fill(); }
  });
}
function drawPatch(ctx, p, t) {
  const r = p.r * (p.src && p.src.boostT > 0 ? 2 : 1), a = Math.min(1, (p.dur - p.t) / 1.5);
  ctx.save(); ctx.globalAlpha = Math.max(.25, a);
  sticker(ctx, () => ctx.ellipse(p.x, p.y, r, r * .7, 0, 0, 7), '#4fb86b', 2, 2.5);
  ctx.strokeStyle = '#2f7a3a'; ctx.lineWidth = 2;
  for (let k = 0; k < 6; k++) { const ang = k / 6 * Math.PI * 2 + t * .5; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.quadraticCurveTo(p.x + Math.cos(ang) * r * .6, p.y + Math.sin(ang + 1) * r * .3, p.x + Math.cos(ang) * r * .9, p.y + Math.sin(ang) * r * .6); ctx.stroke(); }
  ctx.fillStyle = '#ff7ab6'; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(p.x + Math.cos(k * 2.1) * r * .5, p.y + Math.sin(k * 2.1) * r * .35, 2.5, 0, 7); ctx.fill(); }
  ctx.restore();
}
function drawDrone(ctx, x, y, t) {
  ctx.fillStyle = 'rgba(34,23,43,.18)'; ctx.beginPath(); ctx.ellipse(x, y + 14, 8, 3, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 8, y - 6); ctx.lineTo(x + 8, y + 2); ctx.moveTo(x + 8, y - 6); ctx.lineTo(x - 8, y + 2); ctx.stroke();
  for (const [dx, dy] of [[-8, -6], [8, -6], [-8, 2], [8, 2]]) { ctx.fillStyle = 'rgba(205,214,228,.8)'; ctx.beginPath(); ctx.ellipse(x + dx, y + dy, 5 * Math.abs(Math.cos(t * 30)), 2, 0, 0, 7); ctx.fill(); }
  sticker(ctx, () => ctx.roundRect(x - 4, y - 5, 8, 6, 2), '#5a8f5c', 1.5, 2);
  ctx.fillStyle = PAL.coral; ctx.beginPath(); ctx.arc(x, y - 2, 1.4, 0, 7); ctx.fill();
}

// ---------- Projectiles & effects ----------
PROJ_ART.star = (ctx, p) => { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.spin * 2); shuriken(ctx, 6 * (p.size || 1), p.col || '#cdd6e4'); ctx.restore(); };
PROJ_ART.boulder = (ctx, p) => {
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.spin);
  sticker(ctx, () => { for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2, rr = p.size * (k % 2 ? 9 : 11); ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); }, '#a89c90', 3, 2.5);
  ctx.strokeStyle = 'rgba(34,23,43,.4)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-4, -3); ctx.lineTo(2, 1); ctx.lineTo(-1, 5); ctx.stroke();
  ctx.restore();
};
FX_ART.bolt = (ctx, f) => {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const path = () => { ctx.beginPath(); f.pts.forEach((q, i) => { if (!i) return ctx.moveTo(q.x, q.y); const a = f.pts[i - 1]; const mx = (a.x + q.x) / 2 + (Math.random() - .5) * 18, my = (a.y + q.y) / 2 + (Math.random() - .5) * 18; ctx.lineTo(mx, my); ctx.lineTo(q.x, q.y); }); };
  path(); ctx.strokeStyle = INK; ctx.lineWidth = 7; ctx.stroke(); ctx.strokeStyle = PAL.sun; ctx.lineWidth = 4; ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
};
FX_ART.fireball = (ctx, f, k) => {
  const x = f.x + (f.x2 - f.x) * Math.min(1, k * 2), y = f.y + (f.y2 - f.y) * Math.min(1, k * 2) - Math.sin(Math.min(1, k * 2) * Math.PI) * 60;
  sticker(ctx, circ(ctx, x, y, 8), '#ff6a1f', 2, 2); ctx.fillStyle = PAL.sun; ctx.beginPath(); ctx.arc(x - 2, y - 2, 3.5, 0, 7); ctx.fill();
};
FX_ART.fruitbit = (ctx, f) => { ctx.translate(f.x, f.y); sticker(ctx, circ(ctx, 0, 0, f.s * .6), f.col, 1.5, 1.5); ctx.fillStyle = '#3d8a2e'; ctx.fillRect(-1, -f.s * .6 - 3, 2, 3); };
FX_ART.splat = (ctx, f, k) => {
  const r = f.r * (.5 + k * .8);
  ctx.fillStyle = f.col; ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.beginPath();
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, rr = r * (i % 2 ? .65 : 1) * (1 + Math.sin(i * 7) * .15); ctx.lineTo(f.x + Math.cos(a) * rr, f.y + Math.sin(a) * rr); }
  ctx.closePath(); ctx.fill(); ctx.stroke();
};
FX_ART.note = (ctx, f, k) => {
  ctx.translate(f.x + Math.sin(k * 8) * 6, f.y - k * 40); ctx.font = `900 ${f.size}px sans-serif`; ctx.textAlign = 'center';
  ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.strokeText(f.txt, 0, 0); ctx.fillStyle = f.col; ctx.fillText(f.txt, 0, 0);
};
FX_ART.smoke = (ctx, f, k) => { ctx.fillStyle = 'rgba(120,110,110,.6)'; ctx.beginPath(); ctx.arc(f.x, f.y - k * 30, f.r * (.6 + k), 0, 7); ctx.fill(); };

// ---------- Ratjetoe ----------
HERO_ART.ratjetoe = (ctx, SK) => {
  body(ctx, SK.overalls || '#3b5fc4');
  ctx.fillStyle = PAL.sun; ctx.beginPath(); ctx.arc(-6, 10, 1.6, 0, 7); ctx.arc(6, 10, 1.6, 0, 7); ctx.fill(); // overall buttons
  // tail
  ctx.strokeStyle = '#f2a3b5'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(10, 14); ctx.quadraticCurveTo(22, 16, 19, 4); ctx.stroke();
  const fur = SK.fur || '#9aa0ad';
  // round ears
  sticker(ctx, circ(ctx, -11, -13, 6), fur, 2, 2.5); sticker(ctx, circ(ctx, 11, -13, 6), fur, 2, 2.5);
  shape(ctx, circ(ctx, -11, -13, 3), '#f2a3b5', 0); shape(ctx, circ(ctx, 11, -13, 3), '#f2a3b5', 0);
  sticker(ctx, () => ctx.ellipse(0, -3, 11, 10, 0, 0, 7), fur, 3, 2.5); // head
  sticker(ctx, () => ctx.ellipse(0, 2, 6, 4.5, 0, 0, 7), '#c9ced8', 1, 2); // snout
  shape(ctx, circ(ctx, 0, 0, 2), '#f27a9a', 1.2); // nose
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(-4.5, -5, 1.7, 0, 7); ctx.arc(4.5, -5, 1.7, 0, 7); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-3, 2); ctx.lineTo(-11, 0); ctx.moveTo(-3, 3); ctx.lineTo(-11, 4); ctx.moveTo(3, 2); ctx.lineTo(11, 0); ctx.moveTo(3, 3); ctx.lineTo(11, 4); ctx.stroke();
  // red cap with the brim forward
  sticker(ctx, () => { ctx.arc(0, -10, 10, Math.PI, 0); ctx.closePath(); }, SK.cap || '#e8334a', 2, 2.5);
  sticker(ctx, () => ctx.roundRect(-2, -12, 14, 4, 2), SK.cap || '#e8334a', 1, 2);
};
HELD_ART.ratjetoe = (ctx, s) => {
  if (s && s.kind === 'nail' && s.shots > 1) { // nail gun once Rivet Storm is bought
    sticker(ctx, () => ctx.roundRect(-6, -5, 16, 9, 3), '#ff8a1f', 1.5, 2);
    ctx.fillStyle = INK; ctx.fillRect(9, -2, 4, 3); ctx.fillRect(-4, 3, 4, 6);
    return;
  }
  // wrench
  ctx.strokeStyle = '#9aa3b5'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 9); ctx.lineTo(0, -5); ctx.stroke();
  sticker(ctx, () => { ctx.arc(0, -8, 5.5, Math.PI * .65, Math.PI * 2.35); ctx.lineTo(1.5, -11); ctx.lineTo(-1.5, -11); ctx.closePath(); }, '#cdd6e4', 1.5, 2);
};
PROJ_ART.nail = (ctx, p) => {
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.vy, p.vx));
  ctx.fillStyle = INK; ctx.fillRect(-6, -2, 12, 4);
  ctx.fillStyle = '#cdd6e4'; ctx.fillRect(-5, -1, 10, 2);
  ctx.fillStyle = INK; ctx.fillRect(-7, -3.5, 2.5, 7);
  ctx.restore();
};
function drawSentry(ctx, x, y, ang, t, laser) {
  ctx.save(); ctx.translate(x, y);
  sticker(ctx, () => { ctx.moveTo(-7, 6); ctx.lineTo(7, 6); ctx.lineTo(3, -1); ctx.lineTo(-3, -1); ctx.closePath(); }, '#5d6577', 1.5, 2);
  ctx.rotate(ang);
  sticker(ctx, () => ctx.roundRect(-5, -5, 10, 8, 3), laser ? PAL.coral : '#9aa3b5', 1.5, 2);
  ctx.fillStyle = INK; ctx.fillRect(4, -2.5, 6, 3);
  ctx.fillStyle = laser ? '#ffe03a' : PAL.water; ctx.beginPath(); ctx.arc(-1, -1, 1.6 + Math.sin(t * 8) * .4, 0, 7); ctx.fill();
  ctx.restore();
}
FX_ART.confetti = (ctx, f) => { ctx.translate(f.x, f.y); ctx.rotate(f.rot); ctx.fillStyle = f.col; ctx.fillRect(-f.s * .5, -f.s * .25, f.s, f.s * .5); };
FX_ART.star = (ctx, f, k) => {
  ctx.translate(f.x, f.y); ctx.rotate(f.rot); const r = f.s * (1 - k * .4);
  sticker(ctx, () => { for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? r * .45 : r; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); }, f.col, 1, 1.5);
};
const TINTS = {
  tint_retro: g => { g.globalCompositeOperation = 'saturation'; g.fillStyle = '#888'; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgba(155,188,15,.85)'; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'source-over'; g.fillStyle = 'rgba(15,56,15,.12)'; for (let y = 0; y < H; y += 4) g.fillRect(0, y, W, 1); },
  tint_candy: g => { g.globalCompositeOperation = 'hue'; g.fillStyle = 'rgba(255,120,200,.5)'; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'screen'; g.fillStyle = 'rgba(255,190,230,.25)'; g.fillRect(0, 0, W, H); },
};
