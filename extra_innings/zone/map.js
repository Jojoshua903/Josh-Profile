'use strict';
/* =========================================================
   ZONE MAP: a hand-inked parchment chart (Silksong style).
   Explored rooms are traced from their real tile geometry;
   bought maps start as a pencil sketch; the Quill inks in what you explore.
   Each page supplies MAP_CFG (title, rooms, pins, notes…).
   ========================================================= */
const MapView = { cv: null, layer: null, s: 1, ox: 0, oy: 0, w: 0, h: 0, dpr: 1, t0: 0, rooms: [] };
const INKM = '#3a2616', PAPER = '#e9d9b4', PAPER_HI = '#f4e8cc';

function openMap() {
  const C = MAP_CFG.current();
  if (!C.hasMap()) { toast(C.noMap); return; }
  SFX.paper(); openModal('map');
  buildMapLayer();
  MapView.t0 = performance.now();
  requestAnimationFrame(mapFrame);
}

/* deterministic wobble so shared corners line up */
const mhash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };

// res > 1 draws the sheet sharper than the screen, so the pause-menu map can zoom in without blurring
function buildMapLayer(res) {
  const C = MAP_CFG.current(), rooms = C.rooms;
  const cv = $('#mapCanvas'), dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = cv.clientWidth || 1000, h = Math.round(w * 0.56);
  cv.style.height = h + 'px'; cv.width = w * dpr; cv.height = h * dpr;
  const RES = Math.max(1, Math.min(res || 1, 4096 / Math.max(1, cv.width)));
  const layer = document.createElement('canvas'); layer.width = Math.round(cv.width * RES); layer.height = Math.round(cv.height * RES);
  const g = layer.getContext('2d'); g.scale(dpr * RES, dpr * RES);
  // fit this zone's rooms onto the sheet
  const bx0 = Math.min(...rooms.map(r => r.x0)), by0 = Math.min(...rooms.map(r => r.y0));
  const BW = Math.max(...rooms.map(r => r.x0 + r.tw)) - bx0, BH = Math.max(...rooms.map(r => r.y0 + r.th)) - by0;
  const s = Math.min((w - 110) / BW, (h - 190) / BH);
  const ox = (w - BW * s) / 2 - bx0 * s, oy = 96 + ((h - 176) - BH * s) / 2 - by0 * s;
  Object.assign(MapView, { cv, layer, s, ox, oy, w, h, dpr, rooms, res: RES });
  const X = tx => ox + tx * s, Y = ty => oy + ty * s;
  const V = Save.data.visited, UP = Save.data.up;
  // what's on the sheet: Reshman's sketch of every main room; the Quill inks in
  // rooms you've explored (and adds secret ones you found)
  const shown = rooms.filter(rm => !rm.secret || (UP.quill && V[rm.id] && (!C.showSecret || C.showSecret(rm))));
  const CH = {}, INKD = {};
  for (const rm of shown) { CH[rm.id] = 1; if (UP.quill && V[rm.id]) INKD[rm.id] = 1; }
  MapView.shown = shown;

  /* ---- parchment ---- */
  g.fillStyle = PAPER; g.fillRect(0, 0, w, h);
  let seed = 11; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 7; i++) {
    const sx = r() * w, sy = r() * h, sr = 60 + r() * 180;
    const st = g.createRadialGradient(sx, sy, 0, sx, sy, sr);
    st.addColorStop(0, `rgba(150,105,55,${0.06 + r() * 0.08})`); st.addColorStop(1, 'rgba(150,105,55,0)');
    g.fillStyle = st; g.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
  }
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(90,60,30,${r() * 0.07})`; g.fillRect(r() * w, r() * h, 1 + r() * 1.5, 1 + r() * 1.5); }
  // fold creases
  for (const fx of [w / 3, (w * 2) / 3]) { g.fillStyle = 'rgba(255,248,230,.35)'; g.fillRect(fx, 0, 1.5, h); g.fillStyle = 'rgba(110,75,40,.12)'; g.fillRect(fx + 1.5, 0, 2, h); }
  g.fillStyle = 'rgba(255,248,230,.3)'; g.fillRect(0, h / 2, w, 1.5); g.fillStyle = 'rgba(110,75,40,.1)'; g.fillRect(0, h / 2 + 1.5, w, 2);
  // burnt edges
  const vg = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.72);
  vg.addColorStop(0, 'rgba(110,70,30,0)'); vg.addColorStop(1, 'rgba(110,70,30,.45)');
  g.fillStyle = vg; g.fillRect(0, 0, w, h);

  if (C.sketch) C.sketch(g, X, Y, s);

  /* ---- Reshman's rough pencil sketch (rooms not yet inked with the Quill) ---- */
  const roomEdges = list => {
    const out = [];
    for (const rm of list) for (let ty = rm.y0; ty < rm.y0 + rm.th; ty++) for (let tx = rm.x0; tx < rm.x0 + rm.tw; tx++) {
      if (tileAt(tx, ty) === 1) continue;
      if (tileAt(tx, ty - 1) === 1) out.push([tx, ty, tx + 1, ty]);
      if (tileAt(tx, ty + 1) === 1) out.push([tx, ty + 1, tx + 1, ty + 1]);
      if (tileAt(tx - 1, ty) === 1) out.push([tx, ty, tx, ty + 1]);
      if (tileAt(tx + 1, ty) === 1) out.push([tx + 1, ty, tx + 1, ty + 1]);
    }
    return out;
  };
  const sketch = shown.filter(rm => !INKD[rm.id]);
  g.fillStyle = 'rgba(244,232,204,.5)';
  for (const rm of sketch) for (let ty = rm.y0; ty < rm.y0 + rm.th; ty++) for (let tx = rm.x0; tx < rm.x0 + rm.tw; tx++)
    if (tileAt(tx, ty) !== 1) g.fillRect(X(tx) - 0.3, Y(ty) - 0.3, s + 0.6, s + 0.6);
  for (const rm of sketch) {                      // light pencil hatching over the whole room
    const x = X(rm.x0) + 3, y = Y(rm.y0) + 3, rw = rm.tw * s - 6, rh = rm.th * s - 6;
    g.save(); g.beginPath(); g.rect(x, y, rw, rh); g.clip();
    g.strokeStyle = 'rgba(58,38,22,.08)'; g.lineWidth = 1;
    for (let k = -rh; k < rw; k += 8) { g.beginPath(); g.moveTo(x + k, y + rh); g.lineTo(x + k + rh, y); g.stroke(); }
    g.restore();
  }
  g.strokeStyle = 'rgba(70,55,40,.5)'; g.lineWidth = Math.max(1, s * 0.22); g.lineCap = 'round'; g.beginPath();
  for (const [x0, y0, x1, y1] of roomEdges(sketch)) { g.moveTo(X(x0), Y(y0)); g.lineTo(X(x1), Y(y1)); }
  g.stroke();

  /* ---- inked rooms: explored with the Quill, real geometry ---- */
  const inked = shown.filter(rm => INKD[rm.id]);
  g.fillStyle = PAPER_HI;
  for (const rm of inked)
    for (let ty = rm.y0; ty < rm.y0 + rm.th; ty++) for (let tx = rm.x0; tx < rm.x0 + rm.tw; tx++)
      if (tileAt(tx, ty) !== 1) g.fillRect(X(tx) - 0.3, Y(ty) - 0.3, s + 0.6, s + 0.6);
  mapWashAndHatch(g, X, Y, s, INKD, rooms);
  // soft shadow under the ink
  const jit = (vx, vy) => [(mhash(vx, vy) - 0.5) * s * 0.45, (mhash(vy + 999, vx) - 0.5) * s * 0.45];
  const edges = roomEdges(inked);
  const strokeEdges = (lw, col, dx, dy) => {
    g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath();
    for (const [x0, y0, x1, y1] of edges) {
      const [ax, ay] = jit(x0, y0), [bx, by] = jit(x1, y1);
      g.moveTo(X(x0) + ax + dx, Y(y0) + ay + dy); g.lineTo(X(x1) + bx + dx, Y(y1) + by + dy);
    }
    g.stroke();
  };
  strokeEdges(Math.max(3, s * 0.9), 'rgba(120,80,40,.22)', 1.2, 1.6);
  strokeEdges(Math.max(1.6, s * 0.42), INKM, 0, 0);
  // platforms & spikes
  for (const rm of inked)
    for (let ty = rm.y0; ty < rm.y0 + rm.th; ty++) for (let tx = rm.x0; tx < rm.x0 + rm.tw; tx++) {
      const t = tileAt(tx, ty);
      if (t === 3) { g.strokeStyle = 'rgba(58,38,22,.75)'; g.lineWidth = Math.max(1, s * 0.25); g.beginPath(); g.moveTo(X(tx), Y(ty) + 0.5); g.lineTo(X(tx + 1), Y(ty) + 0.5); g.stroke(); }
      if (t === 2) {
        g.strokeStyle = '#8a2a1a'; g.lineWidth = Math.max(1, s * 0.22); g.beginPath();
        g.moveTo(X(tx), Y(ty + 1)); g.lineTo(X(tx) + s * 0.25, Y(ty) + s * 0.35); g.lineTo(X(tx) + s * 0.5, Y(ty + 1)); g.lineTo(X(tx) + s * 0.75, Y(ty) + s * 0.35); g.lineTo(X(tx + 1), Y(ty + 1)); g.stroke();
      }
    }

  if (C.landmarks) C.landmarks(g, X, Y, s, INKD);

  /* ---- labels ---- */
  for (const rm of shown) {
    const label = (C.labels && C.labels[rm.id]) || [0.5, 0.3];
    const lx = X(rm.x0 + rm.tw * label[0]), ly = Y(rm.y0 + rm.th * label[1]);
    g.font = `italic ${Math.max(12, Math.min(17, s * 3.2))}px "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 4; g.strokeStyle = 'rgba(244,232,204,.9)'; g.strokeText(rm.name, lx, ly);
    g.fillStyle = INKM; g.fillText(rm.name, lx, ly);
  }

  /* ---- pins & notes ---- */
  const pin = (x, y, fill, glyph) => {
    g.fillStyle = 'rgba(60,35,15,.3)'; g.beginPath(); g.ellipse(x + 1.5, y + 2, 7, 3, 0, 0, 7); g.fill();
    g.beginPath(); g.moveTo(x, y); g.lineTo(x - 5, y - 9); g.arc(x, y - 12, 6.5, Math.PI * 0.8, Math.PI * 0.2); g.closePath();
    g.fillStyle = fill; g.fill(); g.lineWidth = 1.8; g.strokeStyle = INKM; g.stroke();
    g.fillStyle = INKM; g.font = 'bold 8px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(glyph, x, y - 12);
  };
  const note = (text, x, y, size = 11, rot = -0.04) => {
    g.save(); g.translate(x, y); g.rotate(rot);
    g.font = `italic ${size}px "Iowan Old Style", Palatino, Georgia, serif`; g.textAlign = 'center'; g.fillStyle = 'rgba(58,38,22,.75)'; g.fillText(text, 0, 0); g.restore();
  };
  if (UP.pinBench) PAGE.benches.forEach((b, i) => { if (CH[b.room] && rooms.includes(ROOM[b.room])) pin(X(b.pos.x / TILE), Y(b.pos.y / TILE), '#f2c14e', 'B'); });
  if (C.pins) C.pins(pin, X, Y, V);
  if (C.notes) C.notes(note, g, X, Y, s, V);

  /* ---- title cartouche ---- */
  g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.font = `34px Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif`; g.fillStyle = INKM;
  g.fillText(C.title, 40, 58);
  const tw = g.measureText(C.title).width;
  g.strokeStyle = INKM; g.lineWidth = 1.6; g.beginPath(); g.moveTo(40, 68); g.bezierCurveTo(40 + tw * 0.3, 74, 40 + tw * 0.7, 62, 40 + tw, 68);
  g.moveTo(40 + tw, 68); g.arc(40 + tw + 5, 68, 5, Math.PI, Math.PI * 2.6); g.stroke();
  g.font = `italic 14px "Iowan Old Style", Palatino, Georgia, serif`; g.fillStyle = 'rgba(58,38,22,.8)';
  g.fillText(C.subtitle, 40, 88);

  /* ---- compass rose & tally ---- */
  const cx = w - 70, cy = 66, R = 30;
  g.strokeStyle = INKM; g.lineWidth = 1.4; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.stroke(); g.beginPath(); g.arc(cx, cy, R - 5, 0, 7); g.stroke();
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2 - Math.PI / 2;
    g.beginPath(); g.moveTo(cx + Math.cos(a) * (R + 8), cy + Math.sin(a) * (R + 8));
    g.lineTo(cx + Math.cos(a + 0.35) * 8, cy + Math.sin(a + 0.35) * 8); g.lineTo(cx, cy); g.closePath();
    g.fillStyle = k === 0 ? '#8a2a1a' : INKM; g.fill();
    g.beginPath(); g.moveTo(cx + Math.cos(a) * (R + 8), cy + Math.sin(a) * (R + 8));
    g.lineTo(cx + Math.cos(a - 0.35) * 8, cy + Math.sin(a - 0.35) * 8); g.lineTo(cx, cy); g.closePath();
    g.fillStyle = PAPER_HI; g.fill(); g.stroke();
  }
  g.font = 'bold 11px Georgia, serif'; g.textAlign = 'center'; g.fillStyle = INKM; g.fillText('N', cx, cy - R - 12);
  const tally = rooms.filter(rm => !rm.secret || V[rm.id]);
  const seen = tally.filter(rm => V[rm.id]).length;
  g.font = `italic 13px "Iowan Old Style", Palatino, Georgia, serif`; g.textAlign = 'right'; g.fillStyle = 'rgba(58,38,22,.8)';
  g.fillText(`${seen} of ${tally.length} areas explored`, w - 40, h - 22);
  // what's still missing from your kit
  const need = [!UP.quill && 'a Quill to ink in explored rooms', !UP.compass && 'a Compass to see yourself'].filter(Boolean);
  if (need.length) {
    g.textAlign = 'left'; g.fillStyle = 'rgba(58,38,22,.65)';
    g.fillText(`Pencil sketch · Reshman sells ${need.join(' and ')}`, 40, h - 22);
  }
  if (C.bestiary) C.bestiary(g, w, h, V);
  mapBorder(g, w, h);
}

function mapFrame(now) {
  if (UI.modal !== 'map') return;
  const M = MapView, g = M.cv.getContext('2d'), t = (now - M.t0) / 1000;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, M.cv.width, M.cv.height);
  // unroll from the centre
  const k = Math.min(1, t / 0.55), e = 1 - Math.pow(1 - k, 3);
  const half = (M.cv.width / 2) * e;
  g.save(); g.beginPath(); g.rect(M.cv.width / 2 - half, 0, half * 2, M.cv.height); g.clip();
  g.drawImage(M.layer, 0, 0, M.cv.width, M.cv.height);
  g.restore();
  // Nathan's marker
  if (k >= 1 && Save.data.up.compass && Zone.room && M.rooms.includes(Zone.room) && M.shown.includes(Zone.room)) {
    g.setTransform(M.dpr, 0, 0, M.dpr, 0, 0);
    const c = Player.center();
    const x = M.ox + (c.x / TILE) * M.s, y = M.oy + ((Player.y + Player.h) / TILE) * M.s - 6;
    const pulse = (t * 1.4) % 1;
    g.strokeStyle = `rgba(232,54,28,${1 - pulse})`; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 6 + pulse * 16, 0, 7); g.stroke();
    g.beginPath(); g.arc(x, y, 7, Math.PI, 0); g.lineTo(x + 12, y + 1); g.lineTo(x - 7, y + 1); g.closePath();
    g.fillStyle = '#e8361c'; g.fill(); g.lineWidth = 2; g.strokeStyle = INKM; g.stroke();
    g.fillStyle = '#f3ead8'; g.beginPath(); g.arc(x, y + 6, 5, 0, Math.PI); g.fill(); g.stroke();
  }
  requestAnimationFrame(mapFrame);
}
addEventListener('resize', () => { if (UI.modal === 'map') buildMapLayer(); });
