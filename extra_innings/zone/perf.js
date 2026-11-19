'use strict';
/* =========================================================
   PERFORMANCE · the terrain is drawn once, not every frame
   · the tile pass (base tiles + the art.js caps and interiors) is
     baked into 16×16-tile chunks and blitted as images
   · a chunk is baked on the main canvas at the start of a frame
     (render() repaints the whole screen right after) and copied out
   · each chunk keeps a snapshot of its tiles plus a 1-tile ring, so
     a wall that breaks or a gate that closes re-bakes just that chunk
   · the cache drops itself on a new room, zone palette or resize
   · `PERF.off = true` in the console draws tiles live again
   Loaded after zone/benches.js, before dev.js, on every story page.
   ========================================================= */
const PERF = { off: false, chunks: new Map(), key: '', CH: 16, MAX: 14, baked: 0 };
const _perfTiles = drawTiles;

function perfKey() {
  let z = ''; try { z = PAGE.zoneHere(); } catch (e) { /* no zone yet */ }
  return [LW, LH, SCALE.toFixed(3), z, Game.tilePal ? Object.values(Game.tilePal).join() : '-'].join('|');
}
// the tiles a chunk depends on: its own plus one ring around it (edges, caps and icicles look at neighbours)
function perfSnap(cx, cy) {
  const C = PERF.CH, x0 = cx * C - 1, y0 = cy * C - 1, n = C + 2, s = new Uint8Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const tx = x0 + i, ty = y0 + j;
    s[j * n + i] = tx < 0 || ty < 0 || tx >= LW || ty >= LH ? 255 : grid[ty * LW + tx];
  }
  return s;
}
const perfSame = (a, b) => { if (a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; };

// bake one chunk: draw it at the top-left of the real canvas, then copy it out
function perfBake(cx, cy, snap) {
  const C = PERF.CH, W = C * TILE, k = Math.min(SCALE, 2);   // chunk bitmaps stop at 2× to keep memory sane
  const dw = Math.ceil(W * SCALE), bw = Math.ceil(W * k);
  if (dw > cv.width || dw > cv.height) return null;   // a tiny window: draw live instead
  let ch = PERF.chunks.get(cx + ',' + cy);
  if (!ch) {
    if (PERF.chunks.size >= PERF.MAX) perfEvict(cx, cy);
    const c = document.createElement('canvas'); c.width = bw; c.height = bw;
    ch = { c, g: c.getContext('2d'), cx, cy };
    PERF.chunks.set(cx + ',' + cy, ch);
  } else if (ch.c.width !== bw) { ch.c.width = ch.c.height = bw; }
  const wx = cx * W, wy = cy * W;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, dw, dw);
  ctx.setTransform(SCALE, 0, 0, SCALE, -wx * SCALE, -wy * SCALE);
  ctx.beginPath(); ctx.rect(wx, wy, W, W); ctx.clip();
  try { _perfTiles.call(this, { x: wx, y: wy }); } catch (e) { logErr('perf: bake', e); }
  ctx.restore();
  ch.g.setTransform(1, 0, 0, 1, 0, 0); ch.g.clearRect(0, 0, bw, bw);
  ch.g.imageSmoothingQuality = 'high';
  ch.g.drawImage(cv, 0, 0, dw, dw, 0, 0, bw, bw);
  ch.snap = snap; PERF.baked++;
  return ch;
}
// drop the chunks furthest from the one we need
function perfEvict(cx, cy) {
  let far = null, fd = -1;
  for (const [id, ch] of PERF.chunks) { const d = Math.abs(ch.cx - cx) + Math.abs(ch.cy - cy); if (d > fd) { fd = d; far = id; } }
  if (far) PERF.chunks.delete(far);
}

// which chunks the camera can see this frame (zoom and its focal point included, plus a tile for shake)
function perfView() {
  const cam = Game.cam, z = Game.zoom || 1, F = Game.zoomF || { x: VW / 2, y: VH / 2 };
  const x0 = cam.x - F.x * (1 - z) / z - TILE, x1 = cam.x + (VW - F.x * (1 - z)) / z + TILE;
  const y0 = cam.y - F.y * (1 - z) / z - TILE, y1 = cam.y + (VH - F.y * (1 - z)) / z + TILE;
  const W = PERF.CH * TILE;
  return [Math.max(0, Math.floor(x0 / W)), Math.min(Math.ceil(LW / PERF.CH) - 1, Math.floor(x1 / W)),
          Math.max(0, Math.floor(y0 / W)), Math.min(Math.ceil(LH / PERF.CH) - 1, Math.floor(y1 / W))];
}

// before the frame is painted: make sure every visible chunk is baked and current
const _perfRender = render;
render = function () {
  if (!PERF.off && typeof grid !== 'undefined' && grid && LW) {
    try {
      const key = perfKey();
      if (key !== PERF.key || PERF.grid !== grid) { PERF.chunks.clear(); PERF.key = key; PERF.grid = grid; }
      const [a, b, c, d] = perfView();
      PERF.view = [a, b, c, d];
      for (let cy = c; cy <= d; cy++) for (let cx = a; cx <= b; cx++) {
        const ch = PERF.chunks.get(cx + ',' + cy), snap = perfSnap(cx, cy);
        if (!ch || !ch.snap || !perfSame(ch.snap, snap)) perfBake(cx, cy, snap);
      }
    } catch (e) { logErr('perf: prepare', e); PERF.view = null; }
  } else PERF.view = null;
  return _perfRender.apply(this, arguments);
};

// the tile pass itself: blit the chunks, snapped to whole device pixels so there are no seams
drawTiles = function (cam) {
  const V = PERF.view;
  if (PERF.off || !V) return _perfTiles.apply(this, arguments);
  const m = ctx.getTransform(), W = PERF.CH * TILE;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = true;
  for (let cy = V[2]; cy <= V[3]; cy++) for (let cx = V[0]; cx <= V[1]; cx++) {
    const ch = PERF.chunks.get(cx + ',' + cy);
    const x0 = Math.round(m.a * cx * W + m.e), x1 = Math.round(m.a * (cx + 1) * W + m.e);
    const y0 = Math.round(m.d * cy * W + m.f), y1 = Math.round(m.d * (cy + 1) * W + m.f);
    if (ch) ctx.drawImage(ch.c, x0, y0, x1 - x0, y1 - y0);
    else {   // not baked (tiny window): draw this one live
      ctx.save(); ctx.setTransform(m); ctx.beginPath(); ctx.rect(cx * W, cy * W, W, W); ctx.clip();
      _perfTiles.call(this, { x: cx * W, y: cy * W }); ctx.restore();
    }
  }
  ctx.restore();
};
