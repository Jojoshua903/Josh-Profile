'use strict';
/* =========================================================
   ART UPGRADE · breaking up the rectangles
   · every walkable edge gets an irregular, ink-outlined cap in the
     zone's own material (rust grates, quarry rock, crystal, moss, snow…)
   · wall and floor interiors get faint I-beams, brickwork or cracks,
     always darker than the cap so the floor line stays obvious
   · icicles hang off the Glacier Crown's ledges and ceilings
   · torn chain-link fencing joins the black foreground silhouettes
   · the Crash Site jumbotron idles with scanlines and a pulsing Zennith
     emblem; in every boss fight a hanging screen flickers to life
     (WARNING · STRIKE 1/2/3 · FINAL INNING · Evil Adam's smirk)
   · HUD 35% bigger (Hype lives in the orb from visuals.js, no bar),
     and lost hearts crack and shatter in three frames
   Loaded on every story page after dreams.js.
   ========================================================= */
const artZone = () => { try { return PAGE.zoneHere(); } catch (e) { logErr('zone/art.js: zone', e); return 'z1'; } };
const ART_CAP = 14;   // how deep the trim reaches into the top tile (the walk line itself never moves)

/* ---------- per-zone materials ---------- */
// cap(x, y, tx, ty, h, P) draws the trim body; inner(x, y, tx, ty, h) the faint interior details
const ART = {
  z1:  { cap: 'scrap',   inner: 'beam',   jag: 5 },
  z2:  { cap: 'rock',    inner: 'strata', jag: 7 },
  z3:  { cap: 'steel',   inner: 'beam',   jag: 1 },
  z4:  { cap: 'foundry', inner: 'beam',   jag: 2 },
  z5:  { cap: 'marble',  inner: 'brick',  jag: 1 },
  z6:  { cap: 'crystal', inner: 'strata', jag: 7 },
  z7:  { cap: 'moss',    inner: 'brick',  jag: 6 },
  z8:  { cap: 'snow',    inner: 'ice',    jag: 6 },
  z9:  { cap: 'marble',  inner: 'brick',  jag: 1 },
  z10: { cap: 'core',    inner: 'beam',   jag: 2 },
  z11: { cap: 'chalk',   inner: 'strata', jag: 4 },
  z12: { cap: 'moss',    inner: 'brick',  jag: 5 },
};
// the ragged lower edge of the cap, continuous from tile to tile
const artEdge = (gi, ty, jag) => ART_CAP - jag / 2 + (jag > 1 ? tileHash(gi, ty * 7 + 3) % jag : 0);
function capOutline(x, y, tx, ty, jag) {
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + TILE, y);
  for (let k = 4; k >= 0; k--) ctx.lineTo(x + k * 8, y + artEdge(tx * 4 + k, ty, jag));
  ctx.closePath();
}
function capEdgeInk(x, y, tx, ty, jag) {
  ctx.beginPath();
  for (let k = 0; k <= 4; k++) { const yy = y + artEdge(tx * 4 + k, ty, jag); if (k) ctx.lineTo(x + k * 8, yy); else ctx.moveTo(x, yy); }
  ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
}
const CAPS = {
  // rusted metal grates, broken up by runs of cracked concrete
  scrap(x, y, tx, ty, h) {
    if (tileHash(tx >> 2, ty) % 3) {
      ctx.fillStyle = '#5c3c30'; ctx.fill();
      ctx.fillStyle = '#2a1a16'; for (let i = 0; i < 5; i++) ctx.fillRect(x + 2 + i * 6.2, y + 5, 3, 6);
      ctx.fillStyle = '#9a5a32'; if (h % 3 === 0) ctx.fillRect(x + (h % 22), y + 4, 4, 2); if (h % 5 === 1) ctx.fillRect(x + 8 + (h % 13), y + 10, 3, 2);
    } else {
      ctx.fillStyle = '#4e4858'; ctx.fill();
      if (h % 2) { ctx.strokeStyle = 'rgba(13,11,16,.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + 6 + (h % 18), y + 3); ctx.lineTo(x + 10 + (h % 14), y + 8); ctx.lineTo(x + 7 + (h % 16), y + 13); ctx.stroke(); }
    }
  },
  rock(x, y, tx, ty, h, P) {
    ctx.fillStyle = P.top2; ctx.fill();
    ctx.fillStyle = 'rgba(255,220,180,.12)'; ctx.beginPath(); ctx.ellipse(x + 8 + (h % 14), y + 7, 5, 2.5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(13,11,16,.35)'; ctx.beginPath(); ctx.ellipse(x + 20 + (h % 8), y + 10, 3, 2, 0, 0, 7); ctx.fill();
  },
  steel(x, y, tx, ty, h) {
    ctx.fillStyle = '#4a5f6c'; ctx.fill();
    ctx.fillStyle = '#1a242c'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(x + 5 + i * 7.5, y + 9, 1.6, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#9ab0bd'; ctx.fillRect(x + 1, y + 5, 2, 2); ctx.fillRect(x + TILE - 3, y + 5, 2, 2);
  },
  foundry(x, y, tx, ty, h) {
    ctx.fillStyle = '#5a3424'; ctx.fill();
    if (tileHash(tx >> 1, ty) % 3 === 0) {
      ctx.save(); ctx.beginPath(); ctx.rect(x, y + 5, TILE, 6); ctx.clip();
      ctx.fillStyle = '#f2c14e'; ctx.fillRect(x, y + 5, TILE, 6); ctx.fillStyle = INK;
      for (let k = -8; k < TILE; k += 8) { ctx.beginPath(); ctx.moveTo(x + k, y + 11); ctx.lineTo(x + k + 4, y + 5); ctx.lineTo(x + k + 8, y + 5); ctx.lineTo(x + k + 4, y + 11); ctx.fill(); }
      ctx.restore();
    }
    const glow = 0.25 + 0.2 * Math.sin(Game.time * 2.4 + tx * 0.7);
    ctx.fillStyle = `rgba(255,120,40,${glow})`; ctx.fillRect(x, y + ART_CAP - 3, TILE, 2);
  },
  marble(x, y, tx, ty, h, P) {
    ctx.fillStyle = P.top2; ctx.fill();
    ctx.fillStyle = 'rgba(242,193,78,.85)'; ctx.fillRect(x, y + 7, TILE, 2);
    if (tx % 3 === 0) { ctx.fillStyle = 'rgba(13,11,16,.35)'; ctx.fillRect(x, y + 4, 1.5, ART_CAP - 4); }
  },
  // jagged purple crystal clusters, with a few spires on the ledge corners (never in the middle of a walkway)
  crystal(x, y, tx, ty, h, P, lf, rt) {
    ctx.fillStyle = P.top2; ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
    for (const [ox, w, c] of [[4 + (h % 6), 6, '#9a6ae0'], [16 + (h % 7), 7, '#b388ff'], [26, 4, '#7a4ac8']]) {
      ctx.beginPath(); ctx.moveTo(x + ox - w / 2, y + ART_CAP - 1); ctx.lineTo(x + ox, y + 4); ctx.lineTo(x + ox + w / 2, y + ART_CAP - 1); ctx.closePath();
      ctx.fillStyle = c; ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(240,225,255,.55)'; ctx.fillRect(x + ox - 0.5, y + 6, 1, 4);
    }
    for (const [open, cx, d] of [[lf, x + 3, -1], [rt, x + TILE - 3, 1]]) if (open) {
      ctx.lineWidth = 2;
      for (const [o, hh] of [[0, 13], [d * 5, 8]]) { ctx.beginPath(); ctx.moveTo(cx + o - 3, y); ctx.lineTo(cx + o + d * 2, y - hh); ctx.lineTo(cx + o + 3, y); ctx.closePath(); ctx.fillStyle = '#c9a8ff'; ctx.fill(); ctx.stroke(); }
    }
  },
  moss(x, y, tx, ty, h) {
    ctx.fillStyle = '#3e5a3a'; ctx.fill();
    ctx.strokeStyle = '#6a9a52'; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let k = 2; k < TILE; k += 5) { const yy = y + artEdge(tx * 4 + Math.round(k / 8), ty, 6) - 1, len = 3 + ((h >> (k % 7)) % 5); ctx.moveTo(x + k, yy); ctx.lineTo(x + k + Math.sin(Game.time * 1.4 + tx + k) * 1.2, yy + len); }
    ctx.stroke();
    ctx.fillStyle = '#86b866'; ctx.fillRect(x, y + 3, TILE, 2);
  },
  // snowdrifts: soft lumps that sit a hair above the walk line
  snow(x, y, tx, ty, h) {
    ctx.fillStyle = '#bcd8ee'; ctx.fill();
    ctx.fillStyle = '#eef8ff'; ctx.fillRect(x, y, TILE, 6);
    ctx.beginPath(); ctx.ellipse(x + 8 + (h % 10), y + 1, 9, 3 + (h % 2), 0, Math.PI, 0); ctx.ellipse(x + 24 - (h % 6), y + 1, 8, 2.5, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = 'rgba(120,170,210,.5)'; ctx.fillRect(x + (h % 20), y + 9, 6, 1.5);
  },
  core(x, y, tx, ty, h) {
    ctx.fillStyle = '#2a2040'; ctx.fill();
    const a = 0.45 + 0.3 * Math.sin(Game.time * 3 + tx * 0.5);
    ctx.fillStyle = `rgba(179,136,255,${a})`; ctx.fillRect(x, y + 6, TILE, 2);
    if (tx % 4 === 0) { ctx.fillStyle = `rgba(230,210,255,${a})`; ctx.fillRect(x + 2, y + 5, 4, 4); }
  },
  chalk(x, y, tx, ty, h, P) {
    ctx.fillStyle = P.top2; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(x, y + 5, TILE, 1.5);
  },
};
const INNERS = {
  // steel I-beams and rivets
  beam(x, y, tx, ty, h) {
    if (tx % 6 === 0) {
      ctx.fillStyle = 'rgba(0,0,0,.16)'; ctx.fillRect(x + 11, y, 10, TILE);
      ctx.fillStyle = 'rgba(255,255,255,.035)'; ctx.fillRect(x + 6, y, 3, TILE); ctx.fillRect(x + 23, y, 3, TILE);
    }
    if (ty % 5 === 0) { ctx.fillStyle = 'rgba(0,0,0,.13)'; ctx.fillRect(x, y + 12, TILE, 8); ctx.fillStyle = 'rgba(255,255,255,.04)'; ctx.fillRect(x, y + 12, TILE, 1.5); }
    if (h % 4 === 0) { ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.beginPath(); ctx.arc(x + 7.5, y + 16, 1.8, 0, 7); ctx.arc(x + 24.5, y + 16, 1.8, 0, 7); ctx.fill(); }
  },
  // faint, staggered brickwork
  brick(x, y, tx, ty) {
    ctx.fillStyle = 'rgba(0,0,0,.17)';
    ctx.fillRect(x, y + 15, TILE, 1.5); ctx.fillRect(x, y + TILE - 1.5, TILE, 1.5);
    const o = ty % 2 ? 0 : 16; ctx.fillRect(x + o, y, 1.5, 15); ctx.fillRect(x + (o + 16) % TILE, y + 16, 1.5, 15);
    ctx.fillStyle = 'rgba(255,255,255,.03)'; ctx.fillRect(x, y + 17, TILE, 1);
  },
  // rock strata and the odd diagonal crack
  strata(x, y, tx, ty, h) {
    if (ty % 3 === 0) { ctx.strokeStyle = 'rgba(0,0,0,.16)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y + 14 + Math.sin(tx * 0.9) * 3); ctx.lineTo(x + TILE, y + 14 + Math.sin(tx * 0.9 + 0.9) * 3); ctx.stroke(); }
    if (h % 13 === 0) { ctx.strokeStyle = 'rgba(0,0,0,.22)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + 4, y + 4); ctx.lineTo(x + 13, y + 15); ctx.lineTo(x + 11, y + 21); ctx.lineTo(x + 24, y + 30); ctx.stroke(); }
  },
  // cold layers and hairline cracks
  ice(x, y, tx, ty, h) {
    ctx.fillStyle = 'rgba(200,235,255,.045)'; if (ty % 2) ctx.fillRect(x, y + 10, TILE, 6);
    if (h % 11 === 0) { ctx.strokeStyle = 'rgba(220,245,255,.12)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x + 3, y + 26); ctx.lineTo(x + 16, y + 12); ctx.lineTo(x + 29, y + 8); ctx.stroke(); }
    if (h % 9 === 4) { ctx.strokeStyle = 'rgba(220,245,255,.1)'; ctx.beginPath(); ctx.arc(x + 20, y + 22, 2, 0, 7); ctx.stroke(); }
  },
};
function icicle(x, y, len, w) {
  ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x + w / 2, y); ctx.lineTo(x + 1, y + len); ctx.closePath();
  ctx.fillStyle = '#d8f0ff'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillRect(x - w / 4, y + 2, 1.5, len * 0.4);
}

/* ---------- the extra terrain pass, right after the base tiles ---------- */
const _artTiles = drawTiles;
drawTiles = function (cam) {
  _artTiles.apply(this, arguments);
  const S = ART[artZone()]; if (!S) return;
  const P = Game.tilePal || TILE_PAL, cap = CAPS[S.cap], inner = INNERS[S.inner];
  const x0 = Math.max(0, Math.floor(cam.x / TILE) - 1), x1 = Math.min(LW - 1, Math.ceil((cam.x + VW) / TILE) + 1);
  const y0 = Math.max(0, Math.floor(cam.y / TILE) - 1), y1 = Math.min(LH - 1, Math.ceil((cam.y + VH) / TILE) + 1);
  ctx.save(); ctx.lineJoin = 'round';
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (grid[ty * LW + tx] !== 1) continue;
    const x = tx * TILE, y = ty * TILE, h = tileHash(tx, ty);
    const up = tileAt(tx, ty - 1) !== 1, dn = tileAt(tx, ty + 1) !== 1, lf = tileAt(tx - 1, ty) !== 1, rt = tileAt(tx + 1, ty) !== 1;
    if (up) {
      capOutline(x, y, tx, ty, S.jag);
      cap(x, y, tx, ty, h, P, lf, rt);
      capEdgeInk(x, y, tx, ty, S.jag);
      ctx.fillStyle = INK; ctx.fillRect(x - 1, y - 2, TILE + 2, 3);
      if (lf) ctx.fillRect(x - 2, y - 1, 3, ART_CAP + 4);
      if (rt) ctx.fillRect(x + TILE - 1, y - 1, 3, ART_CAP + 4);
      if (S.cap === 'snow' && (lf || rt) && h % 2 === 0) icicle(lf ? x - 2 : x + TILE + 2, y + 3, 12 + (h % 9), 6);
    } else if (inner && !lf && !rt && !dn) inner(x, y, tx, ty, h);
    // thick icicles under the Glacier Crown's overhangs
    if (S.cap === 'snow' && dn && tileAt(tx, ty + 1) === 0 && h % 3 === 0) icicle(x + 8 + (h % 16), y + TILE, 10 + (h % 14), 6 + (h % 4));
  }
  ctx.restore();
};

/* the torn chain-link fencing now lives in zone/visuals.js with the rest of the edge
   silhouettes, so it gets the same blur, zone tint and 1.2x parallax as everything else */

/* ---------- the Crash Site jumbotron, idling: scanlines, a slow CRT roll and a dim Zennith emblem ---------- */
function zennithEmblem(cx, cy, r, color) {
  ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = r * 0.09; ctx.lineJoin = 'miter';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.78); ctx.lineTo(cx + r * 0.78, cy); ctx.lineTo(cx, cy + r * 0.78); ctx.lineTo(cx - r * 0.78, cy); ctx.closePath(); ctx.stroke();
  ctx.lineWidth = r * 0.14; ctx.beginPath(); ctx.moveTo(cx - r * 0.34, cy - r * 0.3); ctx.lineTo(cx + r * 0.34, cy - r * 0.3); ctx.lineTo(cx - r * 0.34, cy + r * 0.3); ctx.lineTo(cx + r * 0.34, cy + r * 0.3); ctx.stroke();
  ctx.restore();
}
function crtLines(x, y, w, h, a) {
  ctx.fillStyle = `rgba(0,0,0,${a})`; for (let yy = y; yy < y + h; yy += 4) ctx.fillRect(x, yy, w, 2);
  const roll = y + ((Game.time * 38) % (h + 40)) - 20;
  ctx.fillStyle = 'rgba(243,234,216,.035)'; ctx.fillRect(x, roll, w, 14);
}
if (typeof drawJumbotron === 'function' && typeof Z !== 'undefined' && Z.jumbo) {
  const _artJumbo = drawJumbotron;
  drawJumbotron = function (on, flicker) {
    _artJumbo.apply(this, arguments);
    if (on && flicker > 0.15) return;
    const j = Z.jumbo;
    ctx.save(); ctx.beginPath(); ctx.rect(j.x, j.y, j.w, j.h); ctx.clip();
    zennithEmblem(j.x + j.w / 2, j.y + j.h / 2, j.h * 0.34, `rgba(185,139,255,${0.07 + 0.05 * Math.sin(Game.time * 1.6)})`);
    crtLines(j.x, j.y, j.w, j.h, 0.22);
    ctx.restore();
  };
}

/* ---------- the boss screen: hangs at the top of the view in every boss fight ---------- */
const JB = { on: false, name: '', k: 1, since: 0, msg: '', until: 0, strikes: 0 };
const _artBShow = BossBar.show, _artBHide = BossBar.hide, _artBSet = BossBar.set;
BossBar.show = function (name) {
  const fresh = !JB.on, r = _artBShow.apply(this, arguments);
  if (fresh) Object.assign(JB, { on: true, since: Game.time, msg: 'WARNING', until: Game.time + 2.8, strikes: 0, k: 1 });
  const el = document.querySelector('#bossBar span'); JB.name = (el && el.textContent) || name || '';
  return r;
};
BossBar.hide = function () { JB.on = false; return _artBHide.apply(this, arguments); };
BossBar.set = function (k) { JB.k = k; return _artBSet.apply(this, arguments); };
const _artHurt = Player.hurt;
Player.hurt = function (dir) {
  const hp = this.hp, r = _artHurt.apply(this, arguments);
  if (JB.on && this.hp < hp) { JB.strikes++; const n = (JB.strikes - 1) % 3 + 1; JB.msg = n === 3 ? 'STRIKE 3!' : 'STRIKE ' + n; JB.until = Game.time + 1.6; }
  return r;
};
function drawBossScreen(cam) {
  if (!JB.on || !Zone.room) return;
  const W = 250, H = 104, R = Zone.room.px, vc = cam.x + VW / 2, rc = R.x + R.w / 2;
  const x = vc + (rc - vc) * 0.12 - W / 2, y = cam.y + 30, t = Game.time, age = t - JB.since;
  ctx.save(); ctx.lineJoin = 'round';
  // cables up into the dark, and the housing
  ctx.fillStyle = '#17121d'; ctx.fillRect(x + 34, y - 400, 6, 400); ctx.fillRect(x + W - 40, y - 400, 6, 400);
  rr(x - 8, y - 8, W + 16, H + 16, 6); inked('#2a2230', 4);
  ctx.beginPath(); ctx.rect(x, y, W, H); ctx.clip();
  // it boots with a stutter
  const dead = age < 0.9 && Math.sin(age * 60) > 0.2;
  ctx.fillStyle = dead ? '#050407' : '#160a1e'; ctx.fillRect(x, y, W, H);
  if (!dead) {
    const cx = x + W / 2, cy = y + H / 2;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const big = (txt, col, size) => { ctx.font = `${size}px ${DISPLAY_FONT}`; ctx.fillStyle = INK; ctx.fillText(txt, cx + 3, cy + 4); ctx.fillStyle = col; ctx.fillText(txt, cx, cy + 1); };
    if (t < JB.until && JB.msg) {
      if (JB.msg === 'WARNING') {
        ctx.fillStyle = Math.floor(t * 4) % 2 ? '#3a0a0a' : '#160a1e'; ctx.fillRect(x, y, W, H);
        ctx.fillStyle = '#f2c14e'; for (let k = -20; k < W; k += 22) { ctx.beginPath(); ctx.moveTo(x + k, y + 12); ctx.lineTo(x + k + 11, y); ctx.lineTo(x + k + 22, y); ctx.lineTo(x + k + 11, y + 12); ctx.fill(); ctx.beginPath(); ctx.moveTo(x + k, y + H); ctx.lineTo(x + k + 11, y + H - 12); ctx.lineTo(x + k + 22, y + H - 12); ctx.lineTo(x + k + 11, y + H); ctx.fill(); }
        big('WARNING', '#ff3b30', 46);
      } else {
        ctx.fillStyle = '#4a0e0e'; ctx.fillRect(x, y, W, H);
        big(JB.msg, BONE, 48);
        ctx.font = `12px ${DISPLAY_FONT}`; ctx.fillStyle = GOLD; ctx.fillText('● '.repeat((JB.strikes - 1) % 3 + 1).trim(), cx, y + H - 14);
      }
    } else if (JB.k < 0.25) {
      if (Math.floor(t * 3) % 2) big('FINAL INNING', GOLD, 38); else big('FINAL INNING', BONE, 38);
    } else if (/ADAM/i.test(JB.name)) {
      // Evil Adam's smirking silhouette
      ctx.fillStyle = '#060308'; ctx.beginPath(); ctx.ellipse(cx, y + H + 8, 70, 48, 0, Math.PI, 0); ctx.fill();
      ctx.beginPath(); ctx.arc(cx, y + 44, 26, 0, 7); ctx.fill();
      ctx.shadowColor = '#d9a8ff'; ctx.shadowBlur = 10; ctx.fillStyle = '#e6c8ff';
      ctx.beginPath(); ctx.ellipse(cx - 10, y + 40, 6, 2.4, 0.2, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(cx + 10, y + 40, 6, 2.4, -0.2, 0, 7); ctx.fill();
      ctx.shadowBlur = 0; ctx.strokeStyle = '#b98bff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(cx - 9, y + 54); ctx.quadraticCurveTo(cx + 2, y + 58, cx + 12, y + 50); ctx.stroke();
    } else {
      zennithEmblem(cx, cy - 10, 24, `rgba(185,139,255,${0.35 + 0.2 * Math.sin(t * 2)})`);
      ctx.font = `15px ${DISPLAY_FONT}`; ctx.fillStyle = BONE; ctx.fillText(JB.name.toUpperCase(), cx, y + H - 26);
      ctx.fillStyle = 'rgba(243,234,216,.18)'; ctx.fillRect(x + 40, y + H - 14, W - 80, 5);
      ctx.fillStyle = FLAME; ctx.fillRect(x + 40, y + H - 14, (W - 80) * Math.max(0, JB.k), 5);
    }
    crtLines(x, y, W, H, 0.3);
    ctx.fillStyle = `rgba(185,139,255,${0.04 + Math.random() * 0.05})`; ctx.fillRect(x, y, W, H);
  }
  ctx.restore();
}
if (Game.hooks) {
  const _artBehind = Game.hooks.behindTiles;
  Game.hooks.behindTiles = function (cam) { if (_artBehind) _artBehind.apply(this, arguments); drawBossScreen(cam); };
}

/* ---------- HUD: 35% bigger, a segmented Hype bar, hearts that crack and shatter ---------- */
(function buildArtHud() {
  const st = document.createElement('style');
  st.textContent = `
#hud{transform:scale(1.35);transform-origin:0 0}
.hype{height:12px;background:rgba(13,11,16,.8)}
.hype i{width:5px;top:-3px;bottom:-3px;background:#0d0b10;transform:translateX(-2px)}
.hype.ready{animation:hypeBlaze .55s ease-in-out infinite alternate}
@keyframes hypeBlaze{from{box-shadow:3px 3px 0 #0d0b10,0 0 0 2px rgba(232,54,28,.55)}to{box-shadow:3px 3px 0 #0d0b10,0 0 0 3px #ff3b30,0 0 16px #e8361c}}
.hp-crack{position:fixed;pointer-events:none;z-index:6}
.hp-crack svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.hp-crack .ck{animation:hpCk .5s steps(1,end) forwards}
.hp-crack .hl{animation:hpHl .5s steps(3,end) forwards}
.hp-crack .hr{animation:hpHr .5s steps(3,end) forwards}
@keyframes hpCk{0%{opacity:1}34%{opacity:0}100%{opacity:0}}
@keyframes hpHl{0%{opacity:0}33%{opacity:1;transform:translate(-2px,0) rotate(-6deg)}66%{opacity:1;transform:translate(-7px,4px) rotate(-22deg)}100%{opacity:0;transform:translate(-11px,12px) rotate(-40deg)}}
@keyframes hpHr{0%{opacity:0}33%{opacity:1;transform:translate(2px,0) rotate(6deg)}66%{opacity:1;transform:translate(7px,3px) rotate(20deg)}100%{opacity:0;transform:translate(12px,11px) rotate(38deg)}}`;
  document.head.appendChild(st);
  // frame 1: a crack runs through the ball · frames 2–3: the halves split and fall away
  const BALL = '<circle cx="15" cy="15" r="12" fill="#f3ead8" stroke="#0d0b10" stroke-width="3"/><path d="M7 7 Q12 15 7 23 M23 7 Q18 15 23 23" fill="none" stroke="#e8361c" stroke-width="2" stroke-dasharray="3 2"/>';
  const CRACK = 'M15 2 L12 9 L17 14 L13 20 L16 28';
  const half = (cls, clip) => `<svg viewBox="0 0 30 30" class="${cls}"><defs><clipPath id="${cls}C"><path d="${clip}"/></clipPath></defs><g clip-path="url(#${cls}C)">${BALL}</g><path d="${CRACK}" fill="none" stroke="#0d0b10" stroke-width="2"/></svg>`;
  function crack(svg) {
    const r = svg.getBoundingClientRect(); if (!r.width) return;
    const d = document.createElement('div'); d.className = 'hp-crack';
    d.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`;
    d.innerHTML = `<svg viewBox="0 0 30 30" class="ck">${BALL}<path d="${CRACK}" fill="none" stroke="#0d0b10" stroke-width="2.4" stroke-linejoin="round"/></svg>` +
      half('hl', 'M-5 -5 L15 -5 L15 2 L12 9 L17 14 L13 20 L16 28 L16 35 L-5 35 Z') + half('hr', 'M35 -5 L15 -5 L15 2 L12 9 L17 14 L13 20 L16 28 L16 35 L35 35 Z');
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 560);
  }
  let last = Player.hp;
  const watch = () => {
    const hp = Player.hp;
    if (hp < last) document.querySelectorAll('#hp svg').forEach((s, i) => { if (i >= hp && i < last) crack(s); });
    last = hp;
    requestAnimationFrame(watch);
  };
  requestAnimationFrame(watch);
})();
