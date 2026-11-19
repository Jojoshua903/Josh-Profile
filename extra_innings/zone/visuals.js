/* =========================================================
   VISUALS · the Silksong-style layer
   · foreground silhouettes that zip past in front of the play plane
   · tilted light shafts, per-zone floating particles, a fogged far Spire
   · a soft red rim-glow behind Nathan
   · tapered crescent bat arcs, triangle hit-sparks, launch/dash ribbons
   · a cracked-baseball Hype orb, shattering health icons
   · spotlit benches (the camera eases in and the music softens while you sit)
   · quiet boss title cards, bottom-left, in serif
   "Flashy FX: Off" in Settings drops the blur, shafts and extra particles.
   Loaded on every game page after endings.js.
   ========================================================= */
const MOOD = {
  //      shaft colour     particle   foreground   far Spire  grade
  z1:  { beam: '255,150,70', p: 'dust',   fg: 'scrap',   spire: 1, grade: '40,50,70' },
  z2:  { beam: '255,120,40', p: 'ember',  fg: 'rock',    spire: 0, grade: '60,30,20' },
  z3:  { beam: '120,230,255', p: 'mist',  fg: 'pipes',   spire: 0, grade: '20,60,70' },
  z4:  { beam: '255,200,90', p: 'spark',  fg: 'chains',  spire: 0, grade: '80,20,24' },
  z5:  { beam: '255,220,140', p: 'gold',  fg: 'rail',    spire: 1, grade: '60,45,30' },
  z6:  { beam: '190,140,255', p: 'spore', fg: 'crystal', spire: 0, grade: '30,20,70' },
  z7:  { beam: '200,160,255', p: 'rain',  fg: 'grass',   spire: 1, grade: '20,25,60' },
  z8:  { beam: '200,245,255', p: 'snow',  fg: 'ice',     spire: 1, grade: '15,35,60' },
  z9:  { beam: '255,225,130', p: 'gold',  fg: 'rail',    spire: 1, grade: '50,20,70' },
  z10: { beam: '200,180,230', p: 'rain',  fg: null,      spire: 0, grade: '30,15,45' },
};
const V = { parts: [], tris: [], ribbon: [], benchZoom: false, duckT: 0, lastZ: null };
const vOn = () => typeof GFX === 'undefined' || GFX.on;
const vZone = () => { try { return PAGE.zoneHere(); } catch (e) { logErr("zone/visuals.js:28", e); return 'z1'; } };
const vScene = () => (typeof Scene !== 'undefined' && Scene.on) || (Story.intro && Story.intro.black > 0.5);
// a stable pseudo-random number per (seed, i)
const hash = (i, s) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };

/* ---------- Layer 4 & 5: a far, fogged Spire and a climb-tinted sky, over the existing backdrops ---------- */
const _vBg = Game.hooks && Game.hooks.background;
if (Game.hooks) Game.hooks.background = function (cx, cy) {
  if (_vBg) _vBg.apply(this, arguments); else drawBackground(cx, cy);
  const M = MOOD[vZone()]; if (!M || !M.spire) return;
  const fog = (Game.tilePal && Game.tilePal.fog) || '58,26,32';
  // the tower itself: one enormous, faint silhouette that barely moves
  const x = VW * 0.72 - ((cx * 0.03) % (VW * 1.6)), base = VH + 40 - cy * 0.01;
  ctx.save(); ctx.globalAlpha = 0.16; ctx.fillStyle = `rgb(${fog})`;
  ctx.beginPath(); ctx.moveTo(x - 120, base); ctx.lineTo(x - 70, base - VH * 0.6); ctx.lineTo(x - 40, base - VH * 0.62);
  ctx.lineTo(x - 22, base - VH * 1.1); ctx.lineTo(x, base - VH * 1.3); ctx.lineTo(x + 22, base - VH * 1.1);
  ctx.lineTo(x + 40, base - VH * 0.62); ctx.lineTo(x + 70, base - VH * 0.6); ctx.lineTo(x + 120, base); ctx.closePath(); ctx.fill();
  // ring-shaped stadium tiers far up the tower
  for (let k = 0; k < 3; k++) { const y = base - VH * (0.35 + k * 0.22); ctx.fillRect(x - 90 + k * 18, y, 180 - k * 36, 8); }
  ctx.restore();
};

/* ---------- Nathan's rim glow, behind him on the play plane ---------- */
const _vBack = Game.hooks && Game.hooks.back;
if (Game.hooks) Game.hooks.back = function (cam) {
  if (_vBack) _vBack.apply(this, arguments);
  const P = Player; if (P.dead || P.hidden) return;
  const c = P.center(), r = 46 + Math.sin(Game.time * 2.4) * 3;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(c.x, c.y, 6, c.x, c.y, r);
  g.addColorStop(0, 'rgba(232,54,28,.22)'); g.addColorStop(0.6, 'rgba(232,54,28,.08)'); g.addColorStop(1, 'rgba(232,54,28,0)');
  ctx.fillStyle = g; ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
  ctx.restore();
  // the launch / Static Dash ribbon
  if (V.ribbon.length > 1) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 1; i < V.ribbon.length; i++) {
      const a = V.ribbon[i - 1], b = V.ribbon[i], k = i / V.ribbon.length;
      ctx.strokeStyle = `rgba(${b.c},${0.55 * k * b.life})`; ctx.lineWidth = 1 + 9 * k * b.life;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.restore();
  }
};

/* ---------- Layer 1 (foreground) + light shafts + floating particles, drawn last on the world pass ---------- */
const _vTop = Game.hooks && Game.hooks.top;
if (Game.hooks) Game.hooks.top = function (cam) {
  if (_vTop) _vTop.apply(this, arguments);
  // impact shards (world space)
  for (const t of V.tris) {
    const k = t.life / t.max;
    ctx.save(); ctx.translate(t.x, t.y); ctx.rotate(t.a); ctx.globalAlpha = k;
    ctx.beginPath(); ctx.moveTo(t.s * 1.8, 0); ctx.lineTo(-t.s * 0.6, -t.s * 0.45); ctx.lineTo(-t.s * 0.6, t.s * 0.45); ctx.closePath();
    ctx.fillStyle = t.c; ctx.fill(); ctx.restore();
  }
  if (vScene()) return;
  const M = MOOD[vZone()]; if (!M) return;
  ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  if (vOn()) drawShafts(M, cam);
  drawMotes(M, cam);
  if (M.fg) drawForeground(M.fg, cam);
  ctx.restore();
};
function drawShafts(M, cam) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const span = VW * 1.8, t = Game.time;
  for (let k = 0; k < 3; k++) {
    const x = ((k * span / 3 + 140 - cam.x * 0.5) % span + span) % span - VW * 0.3, w = 70 + hash(k, 3) * 90, tilt = 0.32;
    const a = 0.05 + 0.025 * Math.sin(t * 0.6 + k * 2);
    const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, `rgba(${M.beam},${a * 1.6})`); g.addColorStop(1, `rgba(${M.beam},0)`);
    ctx.fillStyle = g; ctx.beginPath();
    ctx.moveTo(x, -10); ctx.lineTo(x + w, -10); ctx.lineTo(x + w * 2.2 + VH * tilt, VH); ctx.lineTo(x + VH * tilt - w * 0.4, VH); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

/* ---------- per-zone floating particles (screen space, with a little parallax) ---------- */
function spawnMote(kind, anywhere) {
  const p = { kind, x: rand(0, VW), y: anywhere ? rand(0, VH) : 0, s: rand(1, 2.6), d: rand(0.5, 1.3), ph: rand(0, 7), vx: 0, vy: 0 };
  switch (kind) {
    case 'dust':  p.vx = rand(-6, 6); p.vy = rand(-4, 6); p.spark = Math.random() < 0.18; if (p.spark) { p.vy = rand(-60, -30); p.y = anywhere ? p.y : VH; } break;
    case 'ember': p.vx = rand(-8, 8); p.vy = rand(-40, -18); if (!anywhere) p.y = VH; break;
    case 'mist':  p.vx = rand(-12, 12); p.vy = rand(-10, 10); break;
    case 'spark': p.vx = rand(-30, 30); p.vy = rand(-70, -30); if (!anywhere) p.y = VH; break;
    case 'gold':  p.vx = rand(-6, 6); p.vy = rand(8, 18); break;
    case 'spore': p.vx = rand(-6, 6); p.vy = rand(-8, -2); p.s = rand(1.6, 3.2); if (!anywhere) p.y = VH; break;
    case 'rain':  p.vx = -180; p.vy = rand(620, 820); p.s = rand(10, 18); p.spark = Math.random() < 0.06; break;
    case 'snow':  p.vx = rand(-30, 10); p.vy = rand(30, 60); p.s = rand(1.4, 3.2); break;
  }
  return p;
}
function drawMotes(M, cam) {
  const kind = M.p, want = !vOn() ? 18 : kind === 'rain' ? 90 : kind === 'snow' ? 70 : 46;
  if (V.lastZ !== kind) { V.parts.length = 0; V.lastZ = kind; }
  while (V.parts.length < want) V.parts.push(spawnMote(kind, true));
  if (V.parts.length > want) V.parts.length = want;
  const dt = 1 / 60, t = Game.time, ox = cam.x - (V.camX ?? cam.x), oy = cam.y - (V.camY ?? cam.y); V.camX = cam.x; V.camY = cam.y;
  ctx.save();
  for (let i = 0; i < V.parts.length; i++) {
    const p = V.parts[i];
    p.x += p.vx * dt - ox * 0.3 * p.d; p.y += p.vy * dt - oy * 0.3 * p.d;
    if (kind === 'snow' || kind === 'spore' || kind === 'mist') p.x += Math.sin(t * 1.3 + p.ph) * 0.4;
    if (p.x < -30) p.x += VW + 60; if (p.x > VW + 30) p.x -= VW + 60;
    if (p.y < -30 || p.y > VH + 30) { V.parts[i] = spawnMote(kind, false); if (V.parts[i].y === 0) V.parts[i].y = -10; continue; }
    const tw = 0.55 + 0.45 * Math.sin(t * 3 + p.ph);
    switch (kind) {
      case 'rain':
        if (p.spark && Math.sin(t * 40 + p.ph) > 0.6) { ctx.fillStyle = `rgba(220,190,255,${0.8 * tw})`; ctx.fillRect(p.x, p.y, 2, 2); }
        ctx.strokeStyle = `rgba(190,200,255,${0.22 * p.d})`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.vx * 0.02, p.y - p.s); ctx.stroke(); break;
      case 'snow': ctx.fillStyle = `rgba(240,250,255,${0.55 * p.d})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 7); ctx.fill(); break;
      case 'ember': case 'spark': ctx.fillStyle = kind === 'ember' ? `rgba(255,${130 + (p.ph * 12 | 0)},50,${0.7 * tw})` : `rgba(255,215,110,${0.8 * tw})`; ctx.fillRect(p.x, p.y, p.s, p.s); break;
      case 'spore': ctx.fillStyle = `rgba(200,150,255,${0.45 * tw})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 7); ctx.fill(); break;
      case 'mist': ctx.fillStyle = `rgba(140,235,255,${0.35 * tw})`; ctx.fillRect(p.x, p.y, p.s, p.s); break;
      case 'gold': ctx.fillStyle = `rgba(255,220,130,${0.45 * tw})`; ctx.fillRect(p.x, p.y, p.s, p.s); break;
      default: ctx.fillStyle = p.spark ? `rgba(255,150,60,${0.8 * tw})` : `rgba(220,210,190,${0.25 * tw})`; ctx.fillRect(p.x, p.y, p.s, p.s);
    }
  }
  ctx.restore();
}

/* ---------- Layer 1 · foreground silhouettes, Silksong rules ----------
   1. they live only along the screen's edges, never over the play space;
   2. soft blur (3px) and a very dark tint of the zone's own colour, never pure black;
   3. a gentle 1.2× parallax — enough depth, never a flash;
   4. thin organic shapes (cables, mesh, icicles, arches) you can see past.
   Boss arenas switch the layer off, and Options has a Foreground Depth toggle.
   The blurred, tinted sprites are baked once per kind/variant, so the per-frame
   cost is a handful of drawImage calls (a full-screen blur every frame is not). */
// dark zone tints: they sit a shade above the near-black walls, so the shape reads
// without ever becoming a flat black bar (the game's back walls are ~rgb(13,11,16))
const FG_TINT = { z1: '40,25,17', z2: '39,23,16', z3: '18,35,42', z4: '44,20,26', z5: '38,32,27', z6: '27,19,42', z7: '19,27,44', z8: '16,34,42', z9: '44,32,19', z10: '21,14,21', z11: '16,12,21' };
const FG = { cache: new Map() };
function fgDepth() { return !(typeof Save !== 'undefined' && Save.data && Save.data.opt && Save.data.opt.fg === 0); }
function fgBoss() { try { return !!(typeof Zone !== 'undefined' && Zone.boss); } catch (e) { return false; }
}
const FG_W = 220, FG_HT = 120, FG_HB = 150;
function fgSprite(kind, edge, v, tint) {
  const key = kind + '|' + edge + '|' + v + '|' + tint;
  const hit = FG.cache.get(key); if (hit) return hit;
  const H = edge === 'top' ? FG_HT : FG_HB;
  const raw = document.createElement('canvas'); raw.width = FG_W; raw.height = H;
  const r = raw.getContext('2d');
  r.filter = 'blur(3px)';              // one-off: the blur is baked into the sprite
  fgShape(r, kind, edge, v, FG_W, H);
  r.filter = 'none';
  const out = document.createElement('canvas'); out.width = FG_W; out.height = H;
  const g = out.getContext('2d');
  g.drawImage(raw, 0, 0);
  g.globalCompositeOperation = 'source-in';    // tint whatever the blur left behind
  g.fillStyle = 'rgb(' + tint + ')'; g.fillRect(0, 0, FG_W, H);
  // the blur thins the alpha, so stack the shape a couple of times: a solid body with
  // the 3px soft edge kept on the outside
  g.globalCompositeOperation = 'source-over';
  g.drawImage(out, 0, 0); g.drawImage(out, 0, 0);
  // feather the sides so neighbouring pieces melt into each other instead of
  // meeting in a straight seam
  g.globalCompositeOperation = 'destination-in';
  const gr = g.createLinearGradient(0, 0, FG_W, 0);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.17, 'rgba(0,0,0,1)');
  gr.addColorStop(0.83, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, FG_W, H);
  g.globalCompositeOperation = 'source-over';
  FG.cache.set(key, out);
  return out;
}
function fgShape(g, kind, edge, v, W, H) {
  const top = edge === 'top', r = n => hash(v * 37 + n, kind.length * 11 + n);
  g.fillStyle = '#fff'; g.strokeStyle = '#fff'; g.lineCap = 'round'; g.lineJoin = 'round';
  const blade = (x, yb, h, w) => { g.beginPath(); g.moveTo(x - w, yb); g.quadraticCurveTo(x - w * 0.2, yb - h * 0.6, x + r(x) * 3, yb - h); g.quadraticCurveTo(x + w * 0.7, yb - h * 0.5, x + w, yb); g.closePath(); g.fill(); };
  switch (kind) {
    case 'scrap':          // Zone 1 · sagging power lines above, torn chain-link and weeds below
      if (top) {
        for (let k = 0; k < 3; k++) {   // three separate lines, well apart so they stay lines
          const y0 = 4 + k * 19 + r(k) * 5, sag = 24 + r(9 + k) * 16;
          g.lineWidth = 2.4 - k * 0.35;
          g.beginPath(); g.moveTo(-8, y0); g.quadraticCurveTo(W * 0.5, y0 + sag, W + 8, y0 + 3); g.stroke();
        }
        for (let k = 0; k < 3; k++) { const x = 40 + r(20 + k) * (W - 80), len = 16 + r(30 + k) * 26; g.lineWidth = 1.3; g.beginPath(); g.moveTo(x, 30 + r(40 + k) * 22); g.quadraticCurveTo(x + 4, len + 20, x + 1, len + 34); g.stroke(); }
      } else {
        const y0 = H * 0.52, span = H - y0;    // only the bottom half of the sprite is fence
        g.lineWidth = 1.1; g.beginPath();
        for (let x = -span; x < W + span; x += 13) { g.moveTo(x, H); g.lineTo(x + span, y0); g.moveTo(x, y0); g.lineTo(x + span, H); }
        g.stroke();
        g.lineWidth = 2.2; g.beginPath(); g.moveTo(-8, y0 + 5); g.quadraticCurveTo(W * 0.5, y0 - 4, W + 8, y0 + 7); g.stroke();   // the bent top rail
        for (let k = 0; k < 7; k++) blade(16 + k * (W - 32) / 6 + r(k) * 10, H - 2, 20 + r(9 + k) * 30, 5);
      }
      break;
    case 'rock':           // Zone 2 · thin stalactites above, slim stalagmites and mine beams below
      if (top) {
        for (let k = 0; k < 3; k++) { const x = 30 + k * (W - 60) / 2 + r(k) * 14, w = 7 + r(9 + k) * 7, h = 40 + r(19 + k) * 44; g.beginPath(); g.moveTo(x - w, 0); g.lineTo(x + w, 0); g.lineTo(x + w * 0.2, h); g.closePath(); g.fill(); }
      } else {
        for (let k = 0; k < 3; k++) { const x = 24 + k * (W - 48) / 2 + r(k) * 16, w = 9 + r(9 + k) * 8, h = 46 + r(19 + k) * 52; g.beginPath(); g.moveTo(x - w, H); g.lineTo(x + w, H); g.lineTo(x + w * 0.15, H - h); g.closePath(); g.fill(); }
        g.lineWidth = 4; g.beginPath(); g.moveTo(6, H - 90); g.lineTo(6, H); g.moveTo(W - 6, H - 72); g.lineTo(W - 6, H); g.stroke();
      }
      break;
    case 'pipes':          // Zone 3 · slim pipe runs and vent grilles in the top corners
      if (top) {
        g.lineWidth = 6; g.beginPath(); g.moveTo(-4, 16 + r(1) * 8); g.lineTo(W * 0.42, 14); g.quadraticCurveTo(W * 0.55, 14, W * 0.55, 30); g.lineTo(W * 0.55, 54); g.stroke();
        g.lineWidth = 3; g.beginPath(); g.moveTo(-4, 44 + r(2) * 10); g.lineTo(W * 0.8, 40); g.stroke();
        g.lineWidth = 2; g.beginPath(); for (let k = 0; k < 7; k++) { const x = W * 0.6 + k * 9; g.moveTo(x, 18); g.lineTo(x, 52); } g.stroke();   // a vent grille
      } else {
        g.lineWidth = 5; g.beginPath(); g.moveTo(-4, H - 20); g.lineTo(W * 0.5, H - 24); g.quadraticCurveTo(W * 0.62, H - 24, W * 0.62, H - 40); g.stroke();
        g.lineWidth = 2.4; g.beginPath(); for (let k = 0; k < 6; k++) { const x = W * 0.66 + k * 10; g.moveTo(x, H - 12); g.lineTo(x, H - 56); } g.stroke();
      }
      break;
    case 'chains':         // Zone 4 · heavy chains overhead, a thin gear ring in the bottom corners
      if (top) {
        for (let k = 0; k < 2; k++) { const x = 40 + k * 90 + r(k) * 20, len = 52 + r(9 + k) * 40; g.lineWidth = 2; for (let y = 0; y < len; y += 11) { g.beginPath(); g.ellipse(x + Math.sin(y * 0.09) * 3, y + 5, 3.4, 5.4, 0, 0, 7); g.stroke(); } g.beginPath(); g.arc(x, len + 6, 5, 0, 7); g.stroke(); }
      } else {
        const cx = W * 0.2, cy = H - 26, R = 34;
        g.lineWidth = 5; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.stroke();
        g.lineWidth = 3; g.beginPath(); for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; g.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); g.lineTo(cx + Math.cos(a) * (R + 9), cy + Math.sin(a) * (R + 9)); } g.stroke();
        g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, R * 0.45, 0, 7); g.stroke();
        g.lineWidth = 4; g.beginPath(); g.moveTo(W * 0.66, H - 74); g.lineTo(W * 0.66, H); g.stroke();
      }
      break;
    case 'rail':           // Zones 5 & 9 · stadium floodlights above, VIP railings below
      if (top) {
        for (let k = 0; k < 2; k++) { const x = 30 + k * 96 + r(k) * 18;
          g.lineWidth = 3; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 22); g.lineTo(x + 26, 30); g.stroke();
          g.beginPath(); g.moveTo(x + 18, 22); g.lineTo(x + 18, 40); g.lineTo(x + 44, 44); g.lineTo(x + 44, 26); g.closePath(); g.fill();   // the lamp head
        }
      } else {
        g.lineWidth = 5; g.beginPath(); g.moveTo(-4, H - 54); g.lineTo(W + 4, H - 58); g.stroke();
        g.lineWidth = 2.6; g.beginPath(); for (let k = 0; k < 12; k++) { const x = 8 + k * (W - 16) / 11; g.moveTo(x, H - 54); g.lineTo(x, H); } g.stroke();
        g.lineWidth = 3; g.beginPath(); g.moveTo(-4, H - 92); g.lineTo(W + 4, H - 96); g.stroke();
      }
      break;
    case 'crystal':        // Zone 6 · slim hex crystals rising from the bottom corners
      if (top) {
        for (let k = 0; k < 2; k++) { const x = 60 + k * 90, len = 34 + r(k) * 26; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 6, 0); g.lineTo(x - 6, len - 8); g.lineTo(x, len); g.lineTo(x + 6, len - 8); g.lineTo(x + 6, 0); g.stroke(); }
      } else {
        for (let k = 0; k < 3; k++) {
          const x = 22 + k * (W - 44) / 2 + r(k) * 12, h = 54 + r(9 + k) * 46, w = 8 + r(19 + k) * 5, sk = (k - 1) * 0.22 + (r(29 + k) - 0.5) * 0.18;
          g.save(); g.translate(x, H); g.rotate(sk); g.lineWidth = 2.2;
          g.beginPath(); g.moveTo(-w, 0); g.lineTo(-w, -h * 0.72); g.lineTo(0, -h); g.lineTo(w, -h * 0.72); g.lineTo(w, 0); g.stroke();
          g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -h * 0.86); g.stroke();
          g.restore();
        }
      }
      break;
    case 'grass':          // Zone 7 · gothic arches and a torn banner above, thin grass below
      if (top) {
        g.lineWidth = 2.6; g.beginPath(); g.moveTo(10, 6); g.quadraticCurveTo(W * 0.5, -26, W - 10, 6); g.stroke();
        g.lineWidth = 2; g.beginPath(); for (let k = 0; k < 3; k++) { const x = 44 + k * 56; g.moveTo(x, 6); g.lineTo(x + 20, 34); g.lineTo(x + 40, 6); } g.stroke();
        const bx = W * 0.58, bw = 34, bh = 54 + r(4) * 18;
        g.beginPath(); g.moveTo(bx, 10); g.lineTo(bx + bw, 12); g.lineTo(bx + bw - 4, 10 + bh * 0.7); g.lineTo(bx + bw - 12, 10 + bh * 0.55); g.lineTo(bx + bw - 6, 12 + bh); g.lineTo(bx + 4, 10 + bh); g.lineTo(bx + 8, 10 + bh * 0.6); g.lineTo(bx, 10); g.closePath(); g.fill();
      } else {
        for (let k = 0; k < 9; k++) blade(8 + k * (W - 16) / 8 + r(k) * 6, H - 2, 26 + r(9 + k) * 40, 5);
      }
      break;
    case 'ice':            // Zone 8 · thin icicles above, soft snow dunes below
      if (top) {
        for (let k = 0; k < 5; k++) { const x = 24 + k * (W - 48) / 4 + r(k) * 10, w = 4 + r(9 + k) * 4, h = 34 + r(19 + k) * 56; g.beginPath(); g.moveTo(x - w, 0); g.lineTo(x + w, 0); g.lineTo(x + w * 0.3, h); g.closePath(); g.fill(); }
      } else {
        g.beginPath(); g.moveTo(-6, H); g.quadraticCurveTo(W * 0.22, H - 46, W * 0.5, H - 18); g.quadraticCurveTo(W * 0.78, H - 44, W + 6, H); g.closePath(); g.fill();
        g.lineWidth = 2; g.beginPath(); g.moveTo(-6, H - 24); g.quadraticCurveTo(W * 0.3, H - 62, W * 0.62, H - 40); g.stroke();
      }
      break;
    default:
      g.lineWidth = 3; g.beginPath(); g.moveTo(-4, 8); g.lineTo(W + 4, 8); g.stroke();
  }
}
function drawForeground(kind, cam) {
  if (!kind || !fgDepth() || fgBoss()) return;
  const z = vZone(), tint = FG_TINT[z] || '30,20,30', t = Game.time;
  // this hook paints in screen space (0..VW, 0..VH), so the edges are 0 and VH
  const par = 1.2, topH = Math.round(VH * 0.14), botH = Math.round(VH * 0.18);
  const gap = Math.max(190, VW * 0.4), off = cam.x * par;
  const first = Math.floor(off / gap) - 1;
  const yTop = -Math.round(VH * 0.02), yBot = VH + Math.round(VH * 0.02);
  ctx.save(); ctx.globalAlpha = 0.92;
  for (let i = first; i < first + Math.ceil(VW / gap) + 3; i++) {
    const x = i * gap - off + hash(i, 1) * gap * 0.5;
    const v = Math.abs(i) % 6;
    const top = fgSprite(kind, 'top', v, tint), wT = FG_W * (topH / top.height);
    ctx.save(); ctx.translate(x + wT / 2, yTop); ctx.rotate(Math.sin(t * 0.55 + i * 1.9) * 0.008);
    ctx.drawImage(top, -wT / 2, 0, wT, topH); ctx.restore();
    if (hash(i, 4) > 0.18) {
      const bot = fgSprite(kind, 'bottom', (v + 3) % 6, tint), wB = FG_W * (botH / bot.height);
      ctx.drawImage(bot, x + gap * 0.34, yBot - botH, wB, botH);
    }
  }
  // a slim pillar at each edge of the room, no wider than a thumb, with a few brackets
  const pw = Math.max(4, Math.round(VW * 0.008));
  ctx.fillStyle = 'rgb(' + tint + ')'; ctx.globalAlpha = 0.7;
  for (const dir of [1, -1]) {
    const bx = dir > 0 ? 0 : VW - pw;
    ctx.fillRect(bx, 0, pw, VH);
    for (let k = 0; k < 5; k++) {
      const y = (k * VH / 7 + ((cam.y * 0.06) % (VH / 7))) % VH;   // the brackets slide as you climb
      ctx.fillRect(dir > 0 ? 0 : VW - pw * 2.8, y, pw * 2.8, 3);
    }
  }
  ctx.restore();
}

/* ---------- Settings · Foreground Depth On / Off ----------
   Sits with the other switches (Screen Shake, Flashy FX) in the settings card. */
(function buildFgToggle() {
  const vr = document.querySelector('#vol'), card = vr && vr.closest('.card');
  if (!card) return;
  const row = document.createElement('div'); row.className = 'row';
  row.innerHTML = '<label>Foreground Depth</label><span class="seg">' +
    [[1, 'On'], [0, 'Off']].map(([v, t]) => `<button data-k="${v}">${t}</button>`).join('') + '</span>';
  const mark = () => row.querySelectorAll('button').forEach(b => b.classList.toggle('on', fgDepth() === (b.dataset.k === '1')));
  row.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    const D = Save.data; D.opt = D.opt || {}; D.opt.fg = b.dataset.k === '1' ? 1 : 0;
    try { saveGame(); } catch (e) { logErr('zone/visuals.js:fg', e); }
    mark(); SFX.ui();
  }));
  mark();
  card.appendChild(row);
})();

/* ---------- a gentle per-zone colour grade (screen space, under the HUD) ---------- */
const _vScreen = Game.hooks && Game.hooks.screen;
if (Game.hooks) Game.hooks.screen = function () {
  const M = MOOD[vZone()];
  if (M && !vScene()) {
    ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = `rgba(${M.grade},.35)`; ctx.fillRect(0, 0, VW, VH); ctx.restore();
  }
  if (_vScreen) _vScreen.apply(this, arguments);
};

/* ---------- crescent bat arcs: taper to a razor point, gone in a blink ---------- */
drawSlash = function (P) {
  if (P.attackT <= 0 || P.attackType === 'launch') return;
  const p = 1 - P.attackT / P.attackDur; if (p > 0.7) return;
  const heavy = P.comboIdx === 3;
  let a0, a1;
  switch (P.attackType) {
    case 'up': a0 = 0.3; a1 = -3.3; break;
    case 'down': a0 = -0.5; a1 = 3.0; break;
    default: if (P.comboIdx === 2) { a0 = 1.0; a1 = -1.9; } else if (heavy) { a0 = -3.2; a1 = 1.4; } else { a0 = -2.3; a1 = 0.85; }
  }
  const D = Save.data, staticOn = D.up && D.up.staticDash && P.dashT > 0;
  const [fill, edge] = staticOn ? ['#b46bff', '#f0dcff'] : D.up && D.up.maxBat ? ['#f2c14e', '#fff2c4'] : ['#e8361c', '#ffd9b0'];
  const head = lerp(a0, a1, Math.min(1, (1 - Math.pow(1 - p, 3)) * 1.08));
  const tail = lerp(a0, head, Math.min(1, p * 1.6));   // the back of the arc chases the front: it thins out and vanishes
  const r1 = TUNE.batReach * (heavy ? 0.98 : 0.86), thick = r1 * (heavy ? 0.42 : 0.32), alpha = 1 - p / 0.7;
  ctx.save();
  ctx.translate(P.x + P.w / 2, P.y + P.h / 2 - 6); ctx.scale(P.facing, 1);
  const N = 18; ctx.beginPath();
  for (let i = 0; i <= N; i++) { const u = i / N, a = lerp(tail, head, u); ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); }
  for (let i = N; i >= 0; i--) { const u = i / N, a = lerp(tail, head, u), r = r1 - thick * Math.pow(Math.sin(Math.PI * u), 0.8) * (0.4 + 0.6 * u); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
  ctx.closePath();
  ctx.globalAlpha = alpha * 0.95; ctx.fillStyle = fill; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.globalAlpha = alpha * 0.7; ctx.stroke();
  // a bright cutting edge along the outside
  ctx.globalAlpha = alpha; ctx.strokeStyle = edge; ctx.lineWidth = heavy ? 3 : 2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0, 0, r1 - 1, tail + (head - tail) * 0.25, head, head < tail); ctx.stroke();
  ctx.restore();
};

/* ---------- white-and-red triangle shards the moment a swing connects ---------- */
const _vBurst = burst;
burst = function (x, y, n, opts = {}) {
  const r = _vBurst.apply(this, arguments);
  const c = opts.colors;
  if (opts.type === 'spark' && opts.angle !== undefined && c && c[0] === '#f3ead8' && c[2] === '#ff8a2a') {
    const k = n > 10 ? 9 : 6;
    for (let i = 0; i < k; i++) {
      const a = opts.angle + rand(-1.1, 1.1), s = rand(260, 560);
      V.tris.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, a, s: rand(4, 8), life: 0.16, max: 0.16, c: i % 3 ? '#ffffff' : FLAME });
    }
  }
  return r;
};

/* ---------- per-frame bookkeeping: shards, ribbon, bench mood ---------- */
const _vTick = PAGE.tick;
PAGE.tick = function (dt) {
  if (_vTick) _vTick.apply(this, arguments);
  for (let i = V.tris.length - 1; i >= 0; i--) { const t = V.tris[i]; t.life -= dt; t.x += t.vx * dt; t.y += t.vy * dt; t.vx *= 0.9; t.vy *= 0.9; if (t.life <= 0) V.tris.splice(i, 1); }
  const P = Player, D = Save.data, c = P.center();
  const trailing = !P.dead && (P.launched || P.launchT > 0 || (P.dashT > 0 && D.up && D.up.staticDash));
  if (trailing) V.ribbon.push({ x: c.x, y: c.y, life: 1, c: P.dashT > 0 && D.up.staticDash ? '180,107,255' : '255,110,40' });
  for (const r of V.ribbon) r.life -= dt * 4;
  while (V.ribbon.length && (V.ribbon[0].life <= 0 || V.ribbon.length > 18)) V.ribbon.shift();
  // sitting on a bench: ease the camera in a little and soften the music
  const sat = (P.sitting || P.sit > 0.5) && !Story.active;
  if (sat !== V.benchZoom) { V.benchZoom = sat; if (!Story.active) Story.zoomTarget = sat ? 1.14 : null; }
  if (sat) { V.duckT -= dt; if (V.duckT <= 0 && typeof Music !== 'undefined') { V.duckT = 0.25; Music.duck(0.6, 0.4); } }
};

/* ---------- benches sit under a tall, angled cone of warm stadium light ---------- */
const _vBench = drawBench;
drawBench = function (b, active, near) {
  // sitting here brightens the beam by 20% and sets golden dust drifting down through it
  const P = Player, here = (P.sitting || P.sit > 0.5) && Math.abs(P.x + P.w / 2 - b.x) < 30;
  b.lit = approach(b.lit || 0, here ? 1 : 0, 1 / 60 * 1.8);
  const lx = b.x - 46, ly = b.y - 270;   // the lamp hangs up and to the left
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const a = ((active ? 0.16 : 0.08) + 0.02 * Math.sin(Game.time * 1.7 + b.x)) * (1 + 0.2 * b.lit);
  const g = ctx.createLinearGradient(0, ly, 0, b.y);
  g.addColorStop(0, `rgba(255,214,150,${a})`); g.addColorStop(1, `rgba(255,214,150,${a * 0.35})`);
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(lx - 14, ly + 10); ctx.lineTo(lx + 14, ly + 10); ctx.lineTo(b.x + 88, b.y); ctx.lineTo(b.x - 70, b.y); ctx.closePath(); ctx.fill();
  const pool = ctx.createRadialGradient(b.x, b.y, 4, b.x, b.y, 90); pool.addColorStop(0, `rgba(255,214,150,${a * 1.4})`); pool.addColorStop(1, 'rgba(255,214,150,0)');
  ctx.fillStyle = pool; ctx.beginPath(); ctx.ellipse(b.x, b.y, 90, 16, 0, 0, 7); ctx.fill();
  if (b.lit > 0.02) {
    b.motes = b.motes || Array.from({ length: 18 }, (_, i) => ({ u: hash(i, 41), v: hash(i, 42), s: 1 + hash(i, 43) * 1.8, ph: hash(i, 44) * 7 }));
    for (const m of b.motes) {
      m.v = (m.v + 1 / 60 * 0.05 * (0.6 + m.s * 0.3)) % 1;                 // drifting slowly down the beam
      const y = lerp(ly + 20, b.y - 6, m.v), half = lerp(16, 78, m.v), x = lerp(lx, b.x + 9, m.v) + (m.u - 0.5) * 2 * half + Math.sin(Game.time * 0.8 + m.ph) * 6;
      ctx.fillStyle = `rgba(255,220,140,${0.55 * b.lit * Math.sin(Math.PI * m.v)})`; ctx.fillRect(x, y, m.s, m.s);
    }
  }
  ctx.restore();
  // the lamp itself
  ctx.save(); ctx.fillStyle = INK; ctx.fillRect(lx - 2, ly - 20, 4, 28); rr(lx - 14, ly + 4, 28, 10, 3); inked('#3a3340', 2);
  ctx.fillStyle = `rgba(255,230,180,${0.8 + 0.1 * Math.sin(Game.time * 5) + 0.1 * b.lit})`; ctx.fillRect(lx - 9, ly + 13, 18, 3); ctx.restore();
  return _vBench.apply(this, arguments);
};

/* ---------- quiet boss title cards: darkened edges, serif name, bottom-left ---------- */
Story.drawBossCard = function (c) {
  const t = c.t, inK = clamp(t / 0.6, 0, 1), out = clamp((3.6 - t) / 0.8, 0, 1), k = Math.min(inK, out);
  ctx.save();
  const vg = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.25, VW / 2, VH / 2, VH * 0.9);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(4,2,6,${0.75 * k})`);
  ctx.fillStyle = vg; ctx.fillRect(0, 0, VW, VH);
  const x = 64, y = VH - 92;
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  if (c.epithet) {
    ctx.globalAlpha = k * clamp((t - 0.2) / 0.5, 0, 1); ctx.font = `italic 17px ${SERIF_FONT}`; ctx.fillStyle = 'rgba(243,234,216,.75)';
    ctx.fillText(c.epithet.charAt(0) + c.epithet.slice(1).toLowerCase(), x + 2, y - 44);
  }
  ctx.globalAlpha = k; ctx.font = `600 50px ${SERIF_FONT}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${Math.round(2 + (1 - inK) * 10)}px`;
  ctx.fillStyle = BONE; ctx.fillText(c.title, x, y);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  // a fine rule underneath, drawing outward
  const w = Math.min(ctx.measureText(c.title).width + 40, VW - x - 40) * clamp((t - 0.1) / 0.7, 0, 1);
  ctx.fillStyle = FLAME; ctx.fillRect(x, y + 16, w, 2);
  ctx.restore();
};

/* ---------- the Hype orb: a cracked baseball that fills with liquid flame ---------- */
(function buildOrb() {
  const port = document.querySelector('.hud-portrait'), hype = document.getElementById('hype'); if (!port || !hype) return;
  port.classList.add('orb'); hype.classList.add('as-orb');
  port.innerHTML = `<svg viewBox="0 0 64 64" aria-label="Hype">
    <defs><clipPath id="orbClip"><circle cx="32" cy="32" r="27"/></clipPath>
      <linearGradient id="orbFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb04a"/><stop offset=".5" stop-color="#e8361c"/><stop offset="1" stop-color="#7a1010"/></linearGradient></defs>
    <circle cx="32" cy="32" r="27" fill="#16101a"/>
    <g clip-path="url(#orbClip)"><g id="orbLiquid"><path id="orbWave" d="" fill="url(#orbFill)"/></g><g id="orbTicks"></g></g>
    <path d="M14 18 Q24 32 14 46 M50 18 Q40 32 50 46" fill="none" stroke="#f3ead8" stroke-opacity=".55" stroke-width="2" stroke-dasharray="3 3"/>
    <path d="M30 6 L34 16 L28 24 L33 31" fill="none" stroke="#0d0b10" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="32" cy="32" r="27" fill="none" stroke="#0d0b10" stroke-width="4"/>
    <circle cx="24" cy="20" r="6" fill="#fff" fill-opacity=".12"/>
  </svg>`;
  const st = document.createElement('style');
  st.textContent = `.hud-portrait.orb{width:68px;height:68px;border:0;background:none;box-shadow:none;transform:none;border-radius:50%;filter:drop-shadow(3px 3px 0 #0d0b10)}
.hud-portrait.orb.ready{animation:orbReady .7s ease-in-out infinite alternate}
.hud-portrait.orb.full{animation:orbFull 1.1s ease-in-out infinite alternate}
@keyframes orbFull{from{filter:drop-shadow(0 0 6px #f2c14e) drop-shadow(0 0 14px rgba(242,193,78,.6))}to{filter:drop-shadow(0 0 14px #fff3c0) drop-shadow(0 0 30px rgba(242,193,78,.9))}}
@keyframes orbReady{from{filter:drop-shadow(3px 3px 0 #0d0b10) drop-shadow(0 0 0 rgba(255,120,40,0))}to{filter:drop-shadow(3px 3px 0 #0d0b10) drop-shadow(0 0 10px rgba(255,120,40,.9))}}
.hype.as-orb{display:none}
.hp svg.shatter{animation:hpShatter .45s ease-out}
@keyframes hpShatter{0%{transform:scale(1.25) rotate(0);filter:brightness(2) drop-shadow(2px 2px 0 #0d0b10)}40%{transform:scale(1.1) rotate(-14deg);clip-path:polygon(0 0,55% 0,40% 50%,60% 100%,0 100%)}100%{transform:scale(.8) rotate(0);opacity:.28}}`;
  document.head.appendChild(st);
  const wave = document.getElementById('orbWave'), ticks = document.getElementById('orbTicks');
  let shown = -1, max = -1, lastHp = Player.hp;
  const frame = () => {
    const P = Player, m = P.hypeMax || 99, h = clamp(P.hype || 0, 0, m), cost = TUNE.healCost || 33;
    shown = shown < 0 ? h : shown + (h - shown) * 0.18;
    const lvl = 59 - 54 * (shown / m), tt = performance.now() / 1000, amp = shown > 0.5 && shown < m - 0.5 ? 2.2 : 0;
    let d = `M0 64 L0 ${lvl}`;
    for (let x = 0; x <= 64; x += 4) d += ` L${x} ${(lvl + Math.sin(tt * 3 + x * 0.2) * amp).toFixed(1)}`;
    wave.setAttribute('d', d + ' L64 64 Z');
    if (m !== max) { max = m; let s = ''; for (let k = cost; k < m; k += cost) { const y = 59 - 54 * k / m; s += `<line x1="6" x2="58" y1="${y}" y2="${y}" stroke="#0d0b10" stroke-opacity=".5" stroke-width="1.5" stroke-dasharray="4 3"/>`; } ticks.innerHTML = s; }
    port.classList.toggle('ready', h >= cost && h < m - 0.5);
    port.classList.toggle('full', h >= m - 0.5);   // a full orb blazes
    // a health icon cracks apart the moment it's lost
    if (P.hp < lastHp) document.querySelectorAll('#hp svg').forEach((s, i) => { if (i >= P.hp && i < lastHp) { s.classList.remove('shatter'); void s.getBoundingClientRect(); s.classList.add('shatter'); } });
    lastHp = P.hp;
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
})();
