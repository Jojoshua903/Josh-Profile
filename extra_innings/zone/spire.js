'use strict';
/* =========================================================
   THE SPIRE · the whole tower on one continuous sheet
   · every story page writes the shape of its own rooms into an
     atlas in localStorage ('ei_atlas_v1') when it loads: tile
     geometry (2 bits a tile), names, benches, bells and links
   · the pause-menu Tower view stacks every zone from that atlas,
     bottom to top, and inks it with the same rules as a zone sheet:
     a bought map = pencil sketch, rested-in rooms = ink, walked but
     unsaved rooms = wet graphite (needs the Quill)
   · floors you haven't loaded yet are fog: you can't have been there
   · drag to look around, scroll to zoom, ↑↓ to pick a floor,
     X / Enter frames it, X again opens the detailed chart (when the
     floor lives on this page), Z backs out to the whole tower
   Loaded after zone/map-live.js on every story page.
   ========================================================= */
const SP_KEY = 'ei_atlas_v1';
const SP = { zones: null, dirty: true, cx: 0, cy: 0, zm: 1, goal: null, focus: null, drag: null, lastZone: null, last: 0, broken: false, bounds: null };
const SP_GAP = 2, SP_M = 3, SP_MAX = 6;

/* ---------- the tower's ink: one palette per floor ---------- */
const SP_PAL = {
  z1:  { fill: '#261915', ink: '#C49A76', acc: '#FF8C42' },
  z2:  { fill: '#2B1810', ink: '#D18B66', acc: '#FF5722' },
  z3:  { fill: '#142329', ink: '#7AB8CC', acc: '#4DD0E1' },
  z4:  { fill: '#2B1218', ink: '#D47A8E', acc: '#FFD54F' },
  z5:  { fill: '#241F1C', ink: '#C7B8A1', acc: '#E0C088' },
  z6:  { fill: '#1F1430', ink: '#A985E0', acc: '#B388FF' },
  z7:  { fill: '#121B2E', ink: '#7A9AD6', acc: '#7C4DFF' },
  z8:  { fill: '#102833', ink: '#7AC5D8', acc: '#80DEEA' },
  z9:  { fill: '#291E12', ink: '#E6C27A', acc: '#FFD700' },
  z10: { fill: '#140A0E', ink: '#FF3B30', acc: '#FF3B30' },
  z11: { fill: '#0B0710', ink: '#F2C14E', acc: '#F2C14E' },
};
const spPal = z => SP_PAL[z] || { fill: '#1A171C', ink: '#8A8177', acc: '#C8A060' };
const spA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
const spDark = (hex, k) => { const n = parseInt(hex.slice(1), 16); return `rgb(${Math.round((n >> 16) * k)},${Math.round(((n >> 8) & 255) * k)},${Math.round((n & 255) * k)})`; };
const spBandKnown = Zn => !Zn.fog && (pmKnown(Zn.z) || Zn.z === 'z11' || !!Zn.layer);

/* ---------- the silhouette: one organic cross-section, floor by floor ----------
   Every floor gets its own recognisable cut-out; SP_GAP keeps them touching so the
   whole thing reads as a single mass rather than a stack of separate pages. */
function spShell(g, z, x0, y0, x1, y1, t) {
  const W = x1 - x0, H = y1 - y0, hx = v => x0 + v * W, hy = v => y0 + v * H;
  const rnd = (i, k) => mhash(i * 37 + 11, k * 53 + 7);
  g.beginPath();
  if (z === 'z1') {                              // the dugout: a broad low base, rocky underside, cellar bulge
    g.moveTo(hx(0.03), hy(0.02)); g.lineTo(hx(0.97), hy(0.02));
    g.lineTo(hx(0.97), hy(0.84));
    for (let i = 8; i >= 0; i--) g.lineTo(hx(0.03 + 0.94 * i / 8), hy(0.84 + (i % 2 ? 0.11 : 0.03) + rnd(i, 2) * 0.05));
    g.lineTo(hx(0.03), hy(0.84));
    g.lineTo(hx(0.03), hy(0.02));
    // the old cellar hangs off the bottom left
    g.moveTo(hx(0.09), hy(0.88)); g.lineTo(hx(0.30), hy(0.88)); g.lineTo(hx(0.28), hy(1.16)); g.lineTo(hx(0.12), hy(1.16)); g.closePath();
  } else if (z === 'z2') {                       // the quarry: a ragged cave with stalactites
    g.moveTo(hx(0.10), hy(0.06));
    for (let i = 0; i <= 6; i++) { const fx = 0.10 + 0.80 * i / 6; g.lineTo(hx(fx), hy(0.02 + (i % 2 ? 0.10 : 0.02))); }
    g.lineTo(hx(0.96), hy(0.90));
    for (let i = 6; i >= 0; i--) { const fx = 0.06 + 0.90 * i / 6; g.lineTo(hx(fx), hy(0.90 + (i % 2 ? 0.02 : 0.10))); }
    g.closePath();
    g.moveTo(hx(0.46), hy(0.02)); g.lineTo(hx(0.54), hy(0.02)); g.lineTo(hx(0.53), hy(0.30)); g.lineTo(hx(0.47), hy(0.30)); g.closePath();
  } else if (z === 'z3') {                       // the shafts: narrow, with pipes jutting out
    g.moveTo(hx(0.22), hy(0.02)); g.lineTo(hx(0.78), hy(0.02)); g.lineTo(hx(0.78), hy(0.96)); g.lineTo(hx(0.22), hy(0.96)); g.closePath();
    for (const [fy, side] of [[0.22, 1], [0.40, -1], [0.62, 1], [0.78, -1]]) {
      const px = side > 0 ? 0.78 : 0.22, pw = side > 0 ? 0.16 : -0.16;
      g.moveTo(hx(px), hy(fy)); g.lineTo(hx(px + pw), hy(fy)); g.lineTo(hx(px + pw), hy(fy + 0.06)); g.lineTo(hx(px), hy(fy + 0.06)); g.closePath();
    }
  } else if (z === 'z4') {                       // the foundry: an angular hall with two chimneys
    g.moveTo(hx(0.04), hy(0.16)); g.lineTo(hx(0.14), hy(0.04)); g.lineTo(hx(0.86), hy(0.04)); g.lineTo(hx(0.96), hy(0.16));
    g.lineTo(hx(0.96), hy(0.94)); g.lineTo(hx(0.04), hy(0.94)); g.closePath();
    g.moveTo(hx(0.18), hy(0.04)); g.lineTo(hx(0.27), hy(0.04)); g.lineTo(hx(0.27), hy(-0.22)); g.lineTo(hx(0.18), hy(-0.22)); g.closePath();
    g.moveTo(hx(0.73), hy(0.04)); g.lineTo(hx(0.82), hy(0.04)); g.lineTo(hx(0.82), hy(-0.16)); g.lineTo(hx(0.73), hy(-0.16)); g.closePath();
  } else if (z === 'z5') {                       // the concourse: a crossroads with wide arms
    g.moveTo(hx(0.00), hy(0.38)); g.lineTo(hx(0.30), hy(0.38)); g.lineTo(hx(0.30), hy(0.06)); g.lineTo(hx(0.70), hy(0.06)); g.lineTo(hx(0.70), hy(0.38));
    g.lineTo(hx(1.00), hy(0.38)); g.lineTo(hx(1.00), hy(0.72)); g.lineTo(hx(0.70), hy(0.72)); g.lineTo(hx(0.70), hy(0.96)); g.lineTo(hx(0.30), hy(0.96));
    g.lineTo(hx(0.30), hy(0.72)); g.lineTo(hx(0.00), hy(0.72)); g.closePath();
  } else if (z === 'z6') {                       // the geode: a cluster of crystals fanning left
    g.moveTo(hx(0.34), hy(0.04)); g.lineTo(hx(0.96), hy(0.04)); g.lineTo(hx(0.96), hy(0.94)); g.lineTo(hx(0.34), hy(0.94));
    for (let i = 0; i < 5; i++) { const fy = 0.94 - i * 0.19; g.lineTo(hx(0.34 - (i % 2 ? 0.26 : 0.14)), hy(fy - 0.09)); g.lineTo(hx(0.34), hy(fy - 0.12)); }
    g.closePath();
  } else if (z === 'z7') {                       // the storm atrium: a gothic point
    g.moveTo(hx(0.16), hy(0.94)); g.lineTo(hx(0.16), hy(0.34)); g.lineTo(hx(0.42), hy(0.34)); g.lineTo(hx(0.50), hy(-0.10)); g.lineTo(hx(0.58), hy(0.34));
    g.lineTo(hx(0.84), hy(0.34)); g.lineTo(hx(0.84), hy(0.94)); g.closePath();
  } else if (z === 'z8') {                       // the glacier: a jagged massif on the right
    g.moveTo(hx(0.04), hy(0.96)); g.lineTo(hx(0.04), hy(0.06)); g.lineTo(hx(0.62), hy(0.06));
    for (let i = 0; i < 4; i++) { const fy = 0.06 + i * 0.22; g.lineTo(hx(0.62 + (i % 2 ? 0.30 : 0.16)), hy(fy + 0.10)); g.lineTo(hx(0.62), hy(fy + 0.20)); }
    g.lineTo(hx(0.62), hy(0.96)); g.closePath();
  } else if (z === 'z9') {                       // the stadium: a wide crown dome
    g.moveTo(hx(0.02), hy(0.96)); g.lineTo(hx(0.02), hy(0.52));
    g.quadraticCurveTo(hx(0.10), hy(0.02), hx(0.50), hy(0.02));
    g.quadraticCurveTo(hx(0.90), hy(0.02), hx(0.98), hy(0.52));
    g.lineTo(hx(0.98), hy(0.96)); g.closePath();
    for (let i = 0; i < 3; i++) { const fy = 0.30 + i * 0.18; g.moveTo(hx(0.06 + i * 0.05), hy(fy)); g.lineTo(hx(0.94 - i * 0.05), hy(fy)); }
  } else if (z === 'z10') {                      // the core: a dark, pulsing circle under everything
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rr2 = Math.min(W, H) * 0.46 + Math.sin(t * 2) * Math.min(W, H) * 0.03;
    g.arc(cx, cy, rr2, 0, 7);
  } else {                                        // the abyss: a torn pocket
    g.moveTo(hx(0.10), hy(0.10)); g.lineTo(hx(0.90), hy(0.06)); g.lineTo(hx(0.94), hy(0.88)); g.lineTo(hx(0.52), hy(0.98)); g.lineTo(hx(0.08), hy(0.86)); g.closePath();
  }
}


/* ---------- the atlas ---------- */
function spLoad() {
  try { const A = JSON.parse(localStorage.getItem(SP_KEY) || 'null'); if (A && A.pages) return A; } catch (e) { /* corrupt: start over */ }
  return { pages: {} };
}
const spPage = () => (location.pathname.split('/').pop() || 'zone1.html');
const spB64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
const spUnB64 = s => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };

// write this page's rooms into the atlas (the live grid, so walls you've broken stay open)
function spRecord() {
  if (typeof ROOMS === 'undefined' || typeof grid === 'undefined' || !grid) return;
  const list = [], ids = new Set();
  const add = rm => { if (rm && rm.id && !ids.has(rm.id) && rm.tw > 0 && rm.th > 0 && rm.x0 !== undefined) { ids.add(rm.id); list.push(rm); } };
  ROOMS.forEach(add);
  if (typeof MAP_CFG !== 'undefined') for (const k in MAP_CFG) { const C = MAP_CFG[k]; if (C && Array.isArray(C.rooms)) C.rooms.forEach(add); }
  const rooms = [];
  for (const rm of list) {
    let z = null; try { z = pmRoomZone(rm); } catch (e) { /* unknown room */ }
    if (!z) continue;
    const n = rm.tw * rm.th, u = new Uint8Array(Math.ceil(n / 4));
    for (let i = 0; i < n; i++) {
      const t = tileAt(rm.x0 + i % rm.tw, rm.y0 + ((i / rm.tw) | 0)), c = t === 1 ? 1 : t === 2 ? 2 : t === 3 ? 3 : 0;
      u[i >> 2] |= c << ((i & 3) * 2);
    }
    rooms.push({ id: rm.id, zone: z, name: rm.name || '', secret: !!rm.secret, x0: rm.x0, y0: rm.y0, tw: rm.tw, th: rm.th, t: spB64(u) });
  }
  if (!rooms.length) return;
  const benches = [];
  try { (PAGE.benches || []).forEach(b => { if (b && b.pos) benches.push({ room: b.room, x: b.pos.x / TILE, y: b.pos.y / TILE }); }); } catch (e) { /* none */ }
  const bells = [];
  try {
    if (typeof A !== 'undefined' && A && A.bells) for (const z in A.bells) { const b = A.bells[z]; if (b && b.pos) bells.push({ z, room: b.room, x: b.pos.x / TILE, y: b.pos.y / TILE }); }
    if (typeof Z !== 'undefined' && Z && Z.bell) bells.push({ z: 'z1', room: 'hub', x: Z.bell.x / TILE, y: Z.bell.y / TILE });
  } catch (e) { /* none */ }
  const links = typeof LINKS !== 'undefined' && Array.isArray(LINKS) ? LINKS.filter(l => Array.isArray(l) && l.length >= 2).map(l => [l[0], l[1]]) : [];
  const AT = spLoad();
  AT.pages[spPage()] = { rooms, benches, bells, links, at: Date.now() };
  try { localStorage.setItem(SP_KEY, JSON.stringify(AT)); } catch (e) { logErr('spire: save atlas', e); }
  return AT;
}
setTimeout(() => { try { spRecord(); } catch (e) { logErr('spire: record', e); } }, 600);

/* ---------- laying the tower out ---------- */
function spBuild() {
  const AT = spRecord() || spLoad(), D = Save.data, q = D.q;
  // merge every page; this page last so its rooms win
  const byId = {}, benches = [], bells = [], links = [], here = spPage();
  const order = Object.keys(AT.pages).filter(p => p !== here).concat(AT.pages[here] ? [here] : []);
  for (const p of order) {
    const P = AT.pages[p];
    (P.rooms || []).forEach(r => { byId[r.id] = r; });
    benches.push(...(P.benches || [])); bells.push(...(P.bells || [])); links.push(...(P.links || []));
  }
  const floors = pmTowerZones().map(r => r[0]);
  if (q.abyss) floors.unshift('z11');   // the Abyss sits under the Dugout
  if (floors.includes('z10')) { floors.splice(floors.indexOf('z10'), 1); floors.unshift('z10'); }   // the Core hangs under the whole tower
  const zones = [];
  let yc = 0, minX = Infinity, maxX = -Infinity;
  for (const z of floors) {
    const rooms = Object.values(byId).filter(r => r.zone === z);
    let Zn;
    if (rooms.length) {
      const bx0 = Math.min(...rooms.map(r => r.x0)), by0 = Math.min(...rooms.map(r => r.y0));
      const bw = Math.max(...rooms.map(r => r.x0 + r.tw)) - bx0, bh = Math.max(...rooms.map(r => r.y0 + r.th)) - by0;
      Zn = { z, rooms, bx0, by0, bw, bh };
    } else Zn = { z, rooms: [], bx0: 0, by0: 0, bw: 220, bh: 60, fog: true };
    Zn.ox = -Zn.bw / 2 - Zn.bx0; Zn.oy = (yc - Zn.bh) - Zn.by0;
    Zn.sx0 = -Zn.bw / 2; Zn.sy0 = yc - Zn.bh;       // spire-space rect of the floor
    yc = Zn.sy0 - SP_GAP;
    minX = Math.min(minX, Zn.sx0); maxX = Math.max(maxX, Zn.sx0 + Zn.bw);
    zones.push(Zn);
  }
  // frame only the part of the tower you have actually reached; the rest is mist
  const kb = zones.filter(spBandKnown);
  if (kb.length) {
    SP.bounds = {
      x0: Math.min(...kb.map(Zn => Zn.sx0)) - 40, x1: Math.max(...kb.map(Zn => Zn.sx0 + Zn.bw)) + 40,
      y0: Math.min(...kb.map(Zn => Zn.sy0)) - 130, y1: Math.max(...kb.map(Zn => Zn.sy0 + Zn.bh)) + 26,
    };
  } else SP.bounds = { x0: minX - 20, x1: maxX + 20, y0: yc, y1: SP_GAP };
  SP.benches = benches; SP.bells = bells; SP.links = links; SP.byId = byId;
  for (const Zn of zones) if (!Zn.fog) spPaint(Zn);
  SP.zones = zones; SP.dirty = false;
  return zones;
}

/* ---------- painting one floor (once per opening) ---------- */
function spPaint(Zn) {
  const D = Save.data, q = D.q, UP = D.up, V = D.visited, lost = q.lostWet || {};
  const m = SP_M, W = Zn.bw + m * 2, H = Zn.bh + m * 2;
  const s = Math.max(2, Math.min(8, 6000 / W, 6000 / H));   // crisp when you scroll in
  // the floor's own tile grid, rebuilt from the atlas
  const T = new Uint8Array(Zn.bw * Zn.bh).fill(1);
  for (const r of Zn.rooms) {
    const u = spUnB64(r.t);
    for (let i = 0, n = r.tw * r.th; i < n; i++) {
      const tx = r.x0 + i % r.tw - Zn.bx0, ty = r.y0 + ((i / r.tw) | 0) - Zn.by0;
      if (tx >= 0 && ty >= 0 && tx < Zn.bw && ty < Zn.bh) T[ty * Zn.bw + tx] = (u[i >> 2] >> ((i & 3) * 2)) & 3;
    }
  }
  const at = (tx, ty) => { tx -= Zn.bx0; ty -= Zn.by0; return tx < 0 || ty < 0 || tx >= Zn.bw || ty >= Zn.bh ? 1 : T[ty * Zn.bw + tx]; };
  const X = tx => (tx - Zn.bx0 + m) * s, Y = ty => (ty - Zn.by0 + m) * s;
  // who's on the sheet
  const inked = [], wet = [], sketch = [];
  for (const r of Zn.rooms) {
    const isInk = UP.quill && V[r.id] && q.inked[r.id], isWet = UP.quill && V[r.id] && !q.inked[r.id] && !lost[r.id];
    if (r.secret && !isInk && !isWet) continue;
    if (isInk) inked.push(r); else if (isWet) wet.push(r); else if (D.maps[Zn.z]) sketch.push(r);
  }
  Zn.shown = inked.concat(wet, sketch); Zn.inked = inked;
  Zn.fogged = !Zn.shown.length;
  const L = document.createElement('canvas'); L.width = Math.ceil(W * s); L.height = Math.ceil(H * s);
  const g = L.getContext('2d');
  const pal = spPal(Zn.z); Zn.pal = pal;
  /* the sheet itself is transparent: the floor's dark plate in the tower shows through */
  const openCells = (list, fill) => {
    g.fillStyle = fill;
    for (const r of list) for (let ty = r.y0; ty < r.y0 + r.th; ty++) for (let tx = r.x0; tx < r.x0 + r.tw; tx++)
      if (at(tx, ty) !== 1) g.fillRect(X(tx) - 0.3, Y(ty) - 0.3, s + 0.6, s + 0.6);
  };
  const edgesOf = list => {
    const out = [];
    for (const r of list) for (let ty = r.y0; ty < r.y0 + r.th; ty++) for (let tx = r.x0; tx < r.x0 + r.tw; tx++) {
      if (at(tx, ty) === 1) continue;
      if (at(tx, ty - 1) === 1) out.push([tx, ty, tx + 1, ty]);
      if (at(tx, ty + 1) === 1) out.push([tx, ty + 1, tx + 1, ty + 1]);
      if (at(tx - 1, ty) === 1) out.push([tx, ty, tx, ty + 1]);
      if (at(tx + 1, ty) === 1) out.push([tx + 1, ty, tx + 1, ty + 1]);
    }
    return out;
  };
  /* Reshman's pencil sketch */
  if (sketch.length) {
    /* Reshman's bought map: no fill at all, just a very fine dotted line */
    g.save();
    g.setLineDash([Math.max(1.4, s * 0.55), Math.max(1.4, s * 0.8)]);
    g.strokeStyle = '#6E655F'; g.lineWidth = Math.max(0.8, s * 0.16); g.lineCap = 'butt'; g.beginPath();
    for (const [x0, y0, x1, y1] of edgesOf(sketch)) { g.moveTo(X(x0), Y(y0)); g.lineTo(X(x1), Y(y1)); }
    g.stroke(); g.restore();
  }
  /* wet graphite: walked, not yet saved at a bench */
  if (wet.length) {
    /* wet graphite: walked here, not yet rested on a bench */
    openCells(wet, 'rgba(200,190,175,.18)');
    g.save(); g.strokeStyle = 'rgba(200,190,175,.18)'; g.lineWidth = Math.max(1, s * 0.2);
    for (const r of wet) {
      const x = X(r.x0) + 2, y = Y(r.y0) + 2, rw = r.tw * s - 4, rh = r.th * s - 4;
      g.save(); g.beginPath(); g.rect(x, y, rw, rh); g.clip();
      g.beginPath(); for (let k = -rh; k < rw; k += 7) { g.moveTo(x + k, y + rh); g.lineTo(x + k + rh, y); } g.stroke();
      g.restore();
    }
    g.restore();
    g.strokeStyle = 'rgba(216,208,192,.55)'; g.lineWidth = Math.max(1, s * 0.22); g.lineCap = 'round'; g.beginPath();
    for (const [x0, y0, x1, y1] of edgesOf(wet)) {
      const j = (mhash(x0, y0) - 0.5) * s * 0.5, hz = y0 === y1;
      g.moveTo(X(x0) + (hz ? 0 : j), Y(y0) + (hz ? j : 0)); g.lineTo(X(x1) + (hz ? 0 : j), Y(y1) + (hz ? j : 0));
    }
    g.stroke();
  }
  /* ink */
  if (inked.length) {
    openCells(inked, pal.fill);
    const jit = (vx, vy) => [(mhash(vx, vy) - 0.5) * s * 0.45, (mhash(vy + 999, vx) - 0.5) * s * 0.45];
    const edges = edgesOf(inked);
    const stroke = (lw, col, dx, dy) => {
      g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath();
      for (const [x0, y0, x1, y1] of edges) { const [ax, ay] = jit(x0, y0), [bx, by] = jit(x1, y1); g.moveTo(X(x0) + ax + dx, Y(y0) + ay + dy); g.lineTo(X(x1) + bx + dx, Y(y1) + by + dy); }
      g.stroke();
    };
    stroke(Math.max(2.4, s * 0.7), 'rgba(0,0,0,.5)', 1.4, 1.8);
    stroke(Math.max(1.2, s * 0.3), spA(pal.ink, 0.9), 0, 0);
    for (const r of inked) for (let ty = r.y0; ty < r.y0 + r.th; ty++) for (let tx = r.x0; tx < r.x0 + r.tw; tx++) {
      const t = at(tx, ty);
      if (t === 3) { g.strokeStyle = spA(pal.ink, 0.45); g.lineWidth = Math.max(1, s * 0.25); g.beginPath(); g.moveTo(X(tx), Y(ty) + 0.5); g.lineTo(X(tx + 1), Y(ty) + 0.5); g.stroke(); }
      else if (t === 2) {
        g.strokeStyle = spA(pal.acc, 0.65); g.lineWidth = Math.max(1, s * 0.22); g.beginPath();
        g.moveTo(X(tx), Y(ty + 1)); g.lineTo(X(tx) + s * 0.25, Y(ty) + s * 0.35); g.lineTo(X(tx) + s * 0.5, Y(ty + 1)); g.lineTo(X(tx) + s * 0.75, Y(ty) + s * 0.35); g.lineTo(X(tx + 1), Y(ty + 1)); g.stroke();
      }
    }
  }
  Zn.layer = L;
}

/* ---------- camera ---------- */
const spScr = (x, y, w, h) => [(x - SP.cx) * SP.zm + w / 2, (y - SP.cy) * SP.zm + h / 2];
function spFitZoom(w, h) { const B = SP.bounds; return Math.min((h - 70) / (B.y1 - B.y0), (w - 108) / (B.x1 - B.x0)); }
function spClamp(w, h) {
  const B = SP.bounds; if (!B) return;
  SP.zm = clamp(SP.zm, spFitZoom(w, h) * 0.85, SP_MAX);
  SP.cx = clamp(SP.cx, B.x0, B.x1); SP.cy = clamp(SP.cy, B.y0, B.y1);
}
function spGoalAll(w, h) { const B = SP.bounds; SP.goal = { cx: (B.x0 + B.x1) / 2 - 40 / spFitZoom(w, h), cy: (B.y0 + B.y1) / 2, zm: spFitZoom(w, h) }; SP.focus = null; }
function spGoalZone(z, w, h) {
  const Zn = (SP.zones || []).find(o => o.z === z); if (!Zn) return false;
  const zm = clamp(Math.min((w - 300) / (Zn.bw + 10), (h - 110) / (Zn.bh + 10)), spFitZoom(w, h), SP_MAX);
  SP.goal = { cx: Zn.sx0 + Zn.bw / 2, cy: Zn.sy0 + Zn.bh / 2, zm }; SP.focus = z;
  return true;
}
const spSize = () => { const cv = $('#pmTowerCv'); return cv ? [cv.clientWidth, cv.clientHeight] : [0, 0]; };
const spActive = () => !SP.broken && !!(SP.zones && SP.zones.length);   // the mist handles empty floors, so the sheet always draws

/* ---------- the frame ---------- */
const _spDrawTower = pmDrawTower;
pmDrawTower = function (now) {
  if (SP.broken) return _spDrawTower.apply(this, arguments);
  try {
    const cv = $('#pmTowerCv'); if (!cv) return;
    if (SP.dirty || !SP.zones) {
      spBuild();
      const [w0, h0] = [cv.clientWidth, cv.clientHeight];
      if (SP.openFocus && spGoalZone(SP.openFocus, w0, h0)) { Object.assign(SP, SP.goal); }
      else { spGoalAll(w0, h0); Object.assign(SP, SP.goal); }
      SP.openFocus = null; SP.goal = null; SP.lastZone = PM.zone;
    }
    if (!spActive()) return _spDrawTower.apply(this, arguments);
    spFrame(now, cv);
  } catch (e) { logErr('spire: draw', e); SP.broken = true; return _spDrawTower.apply(this, arguments); }
};

function spFrame(now, cv) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2), w = cv.clientWidth, h = cv.clientHeight;
  if (!w || !h) return;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const g = cv.getContext('2d'), D = Save.data, q = D.q, t = now / 1000;
  const dt = Math.min(0.05, (now - (SP.last || now)) / 1000); SP.last = now;
  // picking another floor with the arrows glides over to it
  if (PM.zone !== SP.lastZone) { SP.lastZone = PM.zone; if (SP.focus) spGoalZone(PM.zone, w, h); }
  if (SP.goal && !SP.drag) {
    const k = 1 - Math.exp(-dt * 7), G = SP.goal;
    SP.cx = lerp(SP.cx, G.cx, k); SP.cy = lerp(SP.cy, G.cy, k); SP.zm = lerp(SP.zm, G.zm, k);
    if (Math.abs(SP.cx - G.cx) < 0.05 && Math.abs(SP.cy - G.cy) < 0.05 && Math.abs(SP.zm - G.zm) < 0.002) SP.goal = null;
  }
  spClamp(w, h);
  const zm = SP.zm, S = (x, y) => spScr(x, y, w, h);
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  // dark parchment behind the tower
  const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#0B0A0E'); bg.addColorStop(1, '#08070A');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 90; i++) {   // grain, so the plate reads as paper and not as flat black
    const gx = ((i * 137.5 - SP.cx * zm * 0.08) % w + w) % w, gy = ((i * 71.3 - SP.cy * zm * 0.08) % h + h) % h;
    g.fillStyle = `rgba(214,203,182,${0.012 + 0.02 * mhash(i, 5)})`; g.fillRect(gx, gy, 1.5, 1.5);
  }
  const zs = SP.zones;
  // the lift shafts that join one floor to the next, so the tower is one mass
  for (let i = 0; i < zs.length - 1; i++) {
    const A = zs[i], B = zs[i + 1];
    if (!spBandKnown(A) || !spBandKnown(B)) continue;
    const [ax, ay] = S(A.sx0 + A.bw * 0.76, A.sy0), [bx, by] = S(B.sx0 + B.bw * 0.70, B.sy0 + B.bh);
    const wA = Math.max(3, 10 * zm), wB = wA * 0.85;
    g.beginPath(); g.moveTo(ax - wA, ay); g.lineTo(bx - wB, by); g.lineTo(bx + wB, by); g.lineTo(ax + wA, ay); g.closePath();
    g.fillStyle = spDark(spPal(A.z).fill, 0.55); g.fill();
    g.strokeStyle = spA(spPal(A.z).ink, 0.3); g.lineWidth = 1; g.stroke();
  }
  PM.towerSegs = [];
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  for (const Zn of zs) {
    const [x0, y0] = S(Zn.sx0 - SP_M, Zn.sy0 - SP_M), [x1, y1] = S(Zn.sx0 + Zn.bw + SP_M, Zn.sy0 + Zn.bh + SP_M);
    const on = Zn.z === PM.zone;
    PM.towerSegs.push({ z: Zn.z, x0, x1, y0, y1 });
    if (x1 < -220 || x0 > w + 220 || y1 < -80 || y0 > h + 80) continue;
    if (!spBandKnown(Zn)) continue;             // floors you have never reached stay in the mist
    const pal = spPal(Zn.z);
    /* the floor's own cut-out, in its own ink */
    g.save();
    spShell(g, Zn.z, x0, y0, x1, y1, t);
    g.fillStyle = spDark(pal.fill, 0.78); g.fill();
    if (Zn.z === 'z10') { g.shadowColor = spA(pal.acc, 0.85); g.shadowBlur = 16 + Math.sin(t * 2) * 8; g.fill(); g.shadowBlur = 0; }
    g.lineWidth = on ? 1.9 : 1.2; g.strokeStyle = spA(pal.ink, on ? 0.95 : 0.62);
    if (on) { g.shadowColor = spA(pal.ink, 0.55); g.shadowBlur = 12; }
    g.stroke(); g.restore();
    /* the rooms, inked or sketched, live on the plate */
    if (Zn.layer && !Zn.fogged) {
      g.drawImage(Zn.layer, x0, y0, x1 - x0, y1 - y0);
    } else {
      g.font = `italic ${clamp(zm * 9, 11, 20)}px "Iowan Old Style", Palatino, Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = spA(pal.ink, 0.45); g.fillText('uncharted', (x0 + x1) / 2, (y0 + y1) / 2);
    }
    /* the floor's name floats over the plate at overview and slips away as you zoom in */
    const Zi = ZONES[Zn.z] || { name: 'The Overtime Abyss', sub: 'Secret' };
    const fit = spFitZoom(w, h), nameA = clamp(1 - (zm - fit * 1.15) / Math.max(0.0001, fit * 0.8), 0, 1);
    if (nameA > 0.02) {
      const tall = (y1 - y0) > 150;
      const cxb = (x0 + x1) / 2, cyb = tall ? (y0 + y1) / 2 : y0 - 16;
      g.save(); g.globalAlpha = nameA; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `italic ${clamp(13 + zm * 2.6, 14, 26)}px "Iowan Old Style", Palatino, Georgia, serif`;
      g.lineWidth = 4; g.strokeStyle = 'rgba(8,7,10,.85)'; g.strokeText(Zi.name, cxb, cyb);
      g.fillStyle = on ? '#F3EAD8' : 'rgba(233,226,208,.78)'; g.fillText(Zi.name, cxb, cyb);
      const pct = q.zonePct && q.zonePct[Zn.z], alt = (PM_ZONES.find(r => r[0] === Zn.z) || [0, null])[1];
      g.font = `${clamp(9 + zm, 10, 13)}px "Iowan Old Style", Palatino, Georgia, serif`; g.fillStyle = spA(pal.acc, on ? 0.95 : 0.55);
      g.fillText([Zi.sub.split(' · ')[0], alt !== null ? `${alt} m` : '', pct !== undefined ? `${pct}%` : ''].filter(Boolean).join(' · '), cxb, cyb + clamp(13, zm * 7, 22));
      g.restore();
    }
    if (on) {   // gold corner brackets round the chosen floor
      g.strokeStyle = '#EFE6D2'; g.lineWidth = 1.6; const c = 14, p = 6;
      for (const [cx, cy, sx, sy] of [[x0 - p, y0 - p, 1, 1], [x1 + p, y0 - p, -1, 1], [x0 - p, y1 + p, 1, -1], [x1 + p, y1 + p, -1, -1]]) { g.beginPath(); g.moveTo(cx + sx * c, cy); g.lineTo(cx, cy); g.lineTo(cx, cy + sy * c); g.stroke(); }
    }
  }
  /* ---- the altitude ruler, fading into the mist above the act you are in ---- */
  const yAtAlt = a => {
    const pts = [];
    for (const Zn of zs) { const alt = (PM_ZONES.find(r => r[0] === Zn.z) || [0, null])[1]; if (alt === null || !spBandKnown(Zn)) continue; pts.push([alt, S(0, Zn.sy0 + Zn.bh)[1]]); }
    if (!pts.length) return null;
    for (let i = 0; i < pts.length - 1; i++) if (a >= pts[i][0] && a <= pts[i + 1][0]) return lerp(pts[i][1], pts[i + 1][1], (a - pts[i][0]) / (pts[i + 1][0] - pts[i][0]));
    // above or below what you have charted: keep the same scale instead of jumping to another one
    const [a0, y0] = pts[pts.length - 2] || pts[pts.length - 1], [a1, y1] = pts[pts.length - 1];
    return a1 === a0 ? y1 : y1 + (a - a1) * ((y1 - y0) / (a1 - a0));
  };
  // with only one floor charted there is nothing to interpolate between: fall back to the sheet's own span
  const yAlt = a => { const v = yAtAlt(a); return v === null ? lerp(S(0, SP.bounds.y1)[1], S(0, SP.bounds.y0)[1], a / 3500) : v; };

  const rulerX = 74, ry0 = yAlt(0), ry1 = yAlt(3500);
  if (Math.abs(ry1 - ry0) > 8) {
    g.strokeStyle = 'rgba(214,203,182,.22)'; g.lineWidth = 1; g.beginPath(); g.moveTo(rulerX, ry0); g.lineTo(rulerX, ry1); g.stroke();
    g.font = 'italic 10px "Iowan Old Style", Palatino, Georgia, serif'; g.textAlign = 'right'; g.textBaseline = 'middle';
    for (let a = 0; a <= 3500; a += 250) {
      const y = yAlt(a); if (y < -20 || y > h + 20) continue;
      const big = a % 500 === 0;
      g.strokeStyle = big ? 'rgba(214,203,182,.55)' : 'rgba(214,203,182,.22)';
      g.beginPath(); g.moveTo(rulerX, y); g.lineTo(rulerX + (big ? 8 : 4), y); g.stroke();
      if (big) { g.fillStyle = 'rgba(233,226,208,.5)'; g.fillText(a.toLocaleString('en-US') + ' m', rulerX - 8, y); }
    }
    g.save(); g.translate(22, (ry0 + ry1) / 2); g.rotate(-Math.PI / 2); g.textAlign = 'center'; g.fillStyle = 'rgba(214,203,182,.5)'; g.font = 'italic 10px "Iowan Old Style", Palatino, Georgia, serif'; g.fillText('altitude', 0, 0); g.restore();
  }
  // the mist: everything above the highest floor you have reached is still a rumour
  const topKnown = zs.filter(spBandKnown).reduce((m, Zn) => Math.min(m, S(Zn.sx0, Zn.sy0)[1]), h);
  const mistBot = topKnown + 30, mistTop = topKnown - 260;
  const mg = g.createLinearGradient(0, mistTop, 0, mistBot);
  mg.addColorStop(0, 'rgba(11,10,14,1)'); mg.addColorStop(0.6, 'rgba(11,10,14,.9)'); mg.addColorStop(1, 'rgba(11,10,14,0)');
  g.fillStyle = mg; g.fillRect(0, 0, w, Math.max(0, mistBot));
  for (let i = 0; i < 7; i++) {
    const bx = (mhash(i, 11) * w + Math.sin(t * 0.15 + i) * 40 + w) % w, by = mistBot - 40 - mhash(i, 13) * 200;
    const br = 90 + mhash(i, 17) * 150, rg = g.createRadialGradient(bx, by, 0, bx, by, br);
    rg.addColorStop(0, 'rgba(214,203,182,.035)'); rg.addColorStop(1, 'rgba(214,203,182,0)');
    g.fillStyle = rg; g.beginPath(); g.arc(bx, by, br, 0, 7); g.fill();
  }
  spIcons(g, w, h, now);
  // the parchment sits in the frame
  const sh = 40;
  for (const [ax, ay, bx, by, rx, ry, rw, rh] of [[0, 0, 0, sh, 0, 0, w, sh], [0, h, 0, h - sh, 0, h - sh, w, sh], [0, 0, sh, 0, 0, 0, sh, h], [w, 0, w - sh, 0, w - sh, 0, sh, h]]) {
    const gr = g.createLinearGradient(ax, ay, bx, by); gr.addColorStop(0, 'rgba(5,4,6,.8)'); gr.addColorStop(1, 'rgba(5,4,6,0)'); g.fillStyle = gr; g.fillRect(rx, ry, rw, rh);
  }
  g.font = 'italic 12px "Iowan Old Style", Palatino, Georgia, serif'; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillStyle = 'rgba(233,226,208,.7)';
  g.fillText(SP.focus ? 'The Spire · ' + ((ZONES[SP.focus] || {}).name || 'The Overtime Abyss') : 'The Spire · all floors', 16, h - 14);
}

// bosses, benches, bells, room names, your pins and Nathan, in screen space so they stay crisp
function spIcons(g, w, h, now) {
  const D = Save.data, q = D.q, zm = SP.zm, S = (x, y) => spScr(x, y, w, h);
  const zoneOf = {}; for (const Zn of SP.zones) zoneOf[Zn.z] = Zn;
  const shownZone = id => { const r = SP.byId[id]; if (!r) return null; const Zn = zoneOf[r.zone]; return Zn && Zn.shown && Zn.shown.includes(r) ? Zn : null; };
  const mi = clamp((zm - 0.9) / 0.8, 0, 1);
  if (mi > 0) {
    for (const B of SP.benches) { const Zn = shownZone(B.room); if (Zn && (D.up.pinBench || q.inked[B.room])) { const [x, y] = S(B.x + Zn.ox, B.y + Zn.oy); mlBench(g, x, y, mi); } }
    for (const B of SP.bells) { const Zn = zoneOf[B.z]; if (Zn && Zn.shown && D.bells[B.z] && (D.up.pinBell || q.inked[B.room])) { const [x, y] = S(B.x + Zn.ox, B.y + Zn.oy); mlBell(g, x, y, mi); } }
    for (const id in ML_BOSS) { const Zn = shownZone(id); if (Zn) { const r = SP.byId[id], [x, y] = S(r.x0 + r.tw / 2 + Zn.ox, r.y0 + r.th * 0.62 + Zn.oy); mlBoss(g, x, y, !!D[ML_BOSS[id]], id === 's_fountain', mi); } }
  }
  // room names once you're close
  const na = clamp((zm - 2.2) / 0.8, 0, 1);
  if (na > 0) {
    g.font = `italic ${clamp(zm * 2.4, 11, 16)}px "Iowan Old Style", Palatino, Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const Zn of SP.zones) for (const r of Zn.shown || []) {
      if (!r.name) continue;
      const [x, y] = S(r.x0 + r.tw / 2 + Zn.ox, r.y0 + r.th * 0.3 + Zn.oy);
      if (x < -100 || x > w + 100 || y < -20 || y > h + 20) continue;
      g.globalAlpha = na; g.lineWidth = 4; g.strokeStyle = 'rgba(244,232,204,.9)'; g.strokeText(r.name, x, y); g.fillStyle = INKM; g.fillText(r.name, x, y);
    }
    g.globalAlpha = 1;
  }
  // your pins, on every floor
  if (q.pins && !Array.isArray(q.pins)) for (const Zn of SP.zones) for (const p of (q.pins[Zn.z] || [])) { if (Zn.fog) continue; const [x, y] = S(p.x + Zn.ox, p.y + Zn.oy); pmDrawPin(g, x, y, p.t); }
  // Nathan, if you carry the Compass
  const hz = PAGE.zoneHere(), Zn = zoneOf[hz];
  if (D.up.compass && Zn && !Zn.fog && Zone.room) {
    const c = Player.center(), [x, y] = S(c.x / TILE + Zn.ox, (Player.y + Player.h) / TILE + Zn.oy), pulse = ((now / 1000) * 0.6) % 1;
    g.strokeStyle = `rgba(242,193,78,${0.85 * (1 - pulse)})`; g.lineWidth = 2; g.beginPath(); g.arc(x, y - 6, 9 + pulse * 18, 0, 7); g.stroke();
    pmCap(g, x, y - 6, 1.05);
  }
}

/* ---------- input ---------- */
const spOnTower = e => e.target && e.target.id === 'pmTowerCv' && UI.modal === 'pmenu' && PM.mapMode === 'tower' && spActive();
addEventListener('wheel', e => {
  if (!spOnTower(e)) return;
  e.preventDefault(); e.stopPropagation();
  const cv = e.target, r = cv.getBoundingClientRect(), w = cv.clientWidth, h = cv.clientHeight, sx = e.clientX - r.left, sy = e.clientY - r.top;
  const px = SP.cx + (sx - w / 2) / SP.zm, py = SP.cy + (sy - h / 2) / SP.zm;
  SP.goal = null;
  SP.zm = clamp(SP.zm * Math.exp(-e.deltaY * 0.0016), spFitZoom(w, h) * 0.85, SP_MAX);
  SP.cx = px - (sx - w / 2) / SP.zm; SP.cy = py - (sy - h / 2) / SP.zm;
  if (SP.zm <= spFitZoom(w, h) * 1.02) SP.focus = null;
  spClamp(w, h);
}, { capture: true, passive: false });
addEventListener('pointerdown', e => {
  if (!spOnTower(e) || e.button !== 0) return;
  SP.drag = { x: e.clientX, y: e.clientY, cx: SP.cx, cy: SP.cy, moved: false }; SP.goal = null;
}, true);
addEventListener('pointermove', e => {
  const d = SP.drag; if (!d) return;
  if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 4) d.moved = true;
  SP.cx = d.cx - (e.clientX - d.x) / SP.zm; SP.cy = d.cy - (e.clientY - d.y) / SP.zm;
  const [w, h] = spSize(); spClamp(w, h);
});
addEventListener('pointerup', () => { if (SP.drag) { SP.justDragged = SP.drag.moved; SP.drag = null; } });
// a drag shouldn't count as clicking a floor
addEventListener('click', e => { if (SP.justDragged && e.target && e.target.id === 'pmTowerCv') { e.stopPropagation(); } SP.justDragged = false; }, true);

// X / Enter / double-click: frame the floor first, then open its detailed chart if it lives on this page
const _spZoomIn = pmZoomIn;
pmZoomIn = function () {
  if (PM.mapMode !== 'tower' || !spActive()) return _spZoomIn.apply(this, arguments);
  const z = PM.zone, Zn = SP.zones.find(o => o.z === z), [w, h] = spSize();
  if (!Zn || Zn.fog || Zn.fogged || (SP.focus === z && MAP_CFG[z])) return _spZoomIn.apply(this, arguments);
  if (SP.focus === z) { SFX.deny(); PM.msg = 'That floor\'s full chart unfolds when you\'re there. Scroll in to read this one.'; pmRenderMapSide(); return; }
  spGoalZone(z, w, h); SFX.paper();
};
// Z: from a floor back out to the whole tower
const _spZoomStep = mlZoomStep;
mlZoomStep = function (d) {
  if (PM.mapMode === 'tower' && spActive()) {
    if (d > 0) pmZoomIn();
    else if (SP.focus || SP.zm > spFitZoom(...spSize()) * 1.05) { const [w, h] = spSize(); spGoalAll(w, h); SFX.paper(); }
    return;
  }
  return _spZoomStep.apply(this, arguments);
};
// zooming out of a zone sheet lands on that floor of the Spire
const _spToTower = mlToTower;
mlToTower = function () { SP.openFocus = PM.zone; SP.dirty = true; return _spToTower.apply(this, arguments); };

// a fresh sheet every time the tower is opened; let the memory go when the menu closes
const _spRender = PM_VIEWS.map.render;
PM_VIEWS.map.render = function (body) {
  if (PM.mapMode === 'tower' && !$('#pmTowerCv')) SP.dirty = true;
  const r = _spRender.apply(this, arguments);
  if (PM.mapMode === 'tower' && !SP.broken) {
    const note = body.querySelector('.pm-mapbar .pm-note');
    if (note) note.textContent = 'The whole Spire on one sheet · drag to look around · scroll or Z / X to zoom · double-click a floor to frame it.';
  }
  return r;
};
const _spClose = closeModal;
closeModal = function () {
  if (UI.modal === 'pmenu') { SP.zones = null; SP.dirty = true; SP.focus = null; SP.drag = null; }
  return _spClose.apply(this, arguments);
};
