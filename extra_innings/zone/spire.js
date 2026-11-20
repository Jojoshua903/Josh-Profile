'use strict';
/* =========================================================
   THE SPIRE · the whole tower on one continuous sheet
   · every story page writes the shape of its own rooms into an
     atlas in localStorage ('ei_atlas_v1') when it loads: tile
     geometry (2 bits a tile), names, benches, bells and links
   · the pause-menu Tower view lays every zone from that atlas out
     where it really is: zones on one page keep their place in that
     page's grid, and the pages are joined exit-to-entrance (with a
     gold marker on every doorway between two zones). It inks them
     with the same rules as a zone sheet:
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
const SP_M = 3, SP_MAX = 6;

/* ---------- the tower's ink: one palette per floor ---------- */
const SP_PAL = {
  z1:  { fill: '#261915', ink: '#C49A76', acc: '#FF8C42' },
  z2:  { fill: '#2B1810', ink: '#D18B66', acc: '#FF5722' },
  z3:  { fill: '#142329', ink: '#7AB8CC', acc: '#4DD0E1' },
  z4:  { fill: '#2B1218', ink: '#D47A8E', acc: '#FFD54F' },
  z5:  { fill: '#241F1C', ink: '#C7B8A1', acc: '#E0C088' },
  z6:  { fill: '#1F1430', ink: '#A985E0', acc: '#B388FF' },
  z7:  { fill: '#121B2E', ink: '#7A9AD6', acc: '#7C4DFF' },
  z12: { fill: '#0C1E20', ink: '#6FD8C4', acc: '#5FD6C0' },
  z8:  { fill: '#102833', ink: '#7AC5D8', acc: '#80DEEA' },
  z9:  { fill: '#291E12', ink: '#E6C27A', acc: '#FFD700' },
  z10: { fill: '#140A0E', ink: '#FF3B30', acc: '#FF3B30' },
  z11: { fill: '#0B0710', ink: '#F2C14E', acc: '#F2C14E' },
};
const spPal = z => SP_PAL[z] || { fill: '#1A171C', ink: '#8A8177', acc: '#C8A060' };
const spA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
const spDark = (hex, k) => { const n = parseInt(hex.slice(1), 16); return `rgb(${Math.round((n >> 16) * k)},${Math.round(((n >> 8) & 255) * k)},${Math.round((n & 255) * k)})`; };
const spBandKnown = Zn => !Zn.fog && (pmKnown(Zn.z) || Zn.z === 'z11' || !!Zn.layer);


/* ---------- the atlas ---------- */
function spLoad() {
  try { const A = JSON.parse(localStorage.getItem(SP_KEY) || 'null'); if (A && A.pages) return A; } catch (e) { /* corrupt: start over */ }
  return { pages: {} };
}
const spPage = () => (location.pathname.split('/').pop() || 'zone1.html');
const spB64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
const spUnB64 = s => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };

/* where each page joins the next one, in that page's own tiles, on the edge of the room you
   leave through. Both ends of a join share a key; the layout lays one end on top of the other.
   Fixed here (not recorded) so an atlas written before this existed lines up straight away. */
const SP_PORTALS = {
  'zone1.html': [{ key: 'z1-z2', x: 280, y: 62 }],                              // the chasm on the right of camp
  'act1.html':  [{ key: 'z1-z2', x: 0, y: 83 },                                 // ...out the left of the Quarry Mouth
                 { key: 'z4-z5', x: 837, y: 0 }],                               // the golden lift, up through the Foundry Core roof
  'act2.html':  [{ key: 'z4-z5', x: 127, y: 88 },                               // ...arriving in the Concourse floor
                 { key: 'z5-z9', x: 180, y: 76 }],                              // the Pennant Gate rises to the peak
  'act3.html':  [{ key: 'z5-z9', x: 5, y: 44 }],                                // ...to the bottom of the Golden Steps
};

// write this page's rooms into the atlas (the live grid, so walls you've broken stay open)
function spRecord() {
  if (typeof ROOMS === 'undefined' || typeof grid === 'undefined' || !grid) return;
  const list = [], ids = new Set();
  const add = rm => { if (rm && rm.id && !rm.dream && !ids.has(rm.id) && rm.tw > 0 && rm.th > 0 && rm.x0 !== undefined) { ids.add(rm.id); list.push(rm); } };
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

/* ---------- laying the tower out ----------
   One world sheet: every page keeps its own tile grid (so zones on the same page sit
   exactly where they are in the game), and the pages are slid together so each exit
   lands on the entrance it leads to. A page that would sit on top of one already
   placed is lifted clear, and the join is drawn as a dashed passage instead. */
function spCell(r, tx, ty) {
  if (tx < r.x0 || ty < r.y0 || tx >= r.x0 + r.tw || ty >= r.y0 + r.th) return 1;
  if (!r.u) r.u = spUnB64(r.t);
  const i = (ty - r.y0) * r.tw + (tx - r.x0);
  return (r.u[i >> 2] >> ((i & 3) * 2)) & 3;
}
// the doorway between two rooms that touch (tile coords): the middle of the open run on their shared edge
function spDoor(a, b) {
  const vert = a.x0 + a.tw === b.x0 || b.x0 + b.tw === a.x0, horz = a.y0 + a.th === b.y0 || b.y0 + b.th === a.y0;
  if (vert) {
    const ex = a.x0 + a.tw === b.x0 ? b.x0 : a.x0, y0 = Math.max(a.y0, b.y0), y1 = Math.min(a.y0 + a.th, b.y0 + b.th);
    if (y1 <= y0) return null;
    const [L, R] = a.x0 < b.x0 ? [a, b] : [b, a], open = [];
    for (let ty = y0; ty < y1; ty++) if (spCell(L, ex - 1, ty) !== 1 && spCell(R, ex, ty) !== 1) open.push(ty);
    return { x: ex, y: open.length ? (open[0] + open[open.length - 1] + 1) / 2 : (y0 + y1) / 2 };
  }
  if (horz) {
    const ey = a.y0 + a.th === b.y0 ? b.y0 : a.y0, x0 = Math.max(a.x0, b.x0), x1 = Math.min(a.x0 + a.tw, b.x0 + b.tw);
    if (x1 <= x0) return null;
    const [T, B] = a.y0 < b.y0 ? [a, b] : [b, a], open = [];
    for (let tx = x0; tx < x1; tx++) if (spCell(T, tx, ey - 1) !== 1 && spCell(B, tx, ey) !== 1) open.push(tx);
    return { x: open.length ? (open[0] + open[open.length - 1] + 1) / 2 : (x0 + x1) / 2, y: ey };
  }
  return null;
}
function spBuild() {
  const AT = spRecord() || spLoad(), D = Save.data, q = D.q;
  // merge every page; this page last so its rooms win
  const byId = {}, benches = [], bells = [], links = [], here = spPage();
  const order = Object.keys(AT.pages).filter(p => p !== here).concat(AT.pages[here] ? [here] : []);
  for (const p of order) {
    const P = AT.pages[p];
    (P.rooms || []).forEach(r => { r.page = p; byId[r.id] = r; });
    benches.push(...(P.benches || [])); bells.push(...(P.bells || [])); links.push(...(P.links || []));
  }
  // where each page sits on the world sheet
  const pages = [...new Set(Object.values(byId).map(r => r.page))];
  const off = {}, placed = [], joins = [];
  // secret rooms you haven't found don't take up space yet, so they can't push a page away from its door
  const rectsOf = p => { const all = Object.values(byId).filter(r => r.page === p), real = all.filter(r => !r.secret || D.visited[r.id]); return real.length ? real : all; };
  const hits = (p, o) => rectsOf(p).some(r => placed.some(s => r.x0 + o.x < s.x1 && r.x0 + r.tw + o.x > s.x0 && r.y0 + o.y < s.y1 && r.y0 + r.th + o.y > s.y0));
  const put = (p, o) => { off[p] = o; for (const r of rectsOf(p)) placed.push({ x0: r.x0 + o.x, y0: r.y0 + o.y, x1: r.x0 + r.tw + o.x, y1: r.y0 + r.th + o.y }); };
  const top = () => placed.reduce((m, s) => Math.min(m, s.y0), 0);
  const first = pages.includes('zone1.html') ? 'zone1.html' : pages[0];
  if (first) put(first, { x: 0, y: 0 });
  for (let grew = true; grew;) {
    grew = false;
    for (const p of pages) {
      if (off[p]) continue;
      for (const pt of (SP_PORTALS[p] || [])) {
        const src = pages.find(o => off[o] && (SP_PORTALS[o] || []).some(m => m.key === pt.key));
        if (!src) continue;
        const m = SP_PORTALS[src].find(k => k.key === pt.key), wx = m.x + off[src].x, wy = m.y + off[src].y;
        let o = { x: wx - pt.x, y: wy - pt.y }, lifted = false;
        // a page that would cover rooms already on the sheet climbs until it's clear
        for (let k = 0; k < 400 && hits(p, o); k++) { o.y -= 2; lifted = true; }
        put(p, o);
        joins.push({ key: pt.key, x: wx, y: wy, x2: pt.x + o.x, y2: pt.y + o.y, lifted });
        grew = true; break;
      }
    }
  }
  // pages with no known way in yet (a dev warp, an old atlas): parked above everything, side by side
  let park = 0;
  for (const p of pages) if (!off[p]) { const rs = rectsOf(p), x0 = Math.min(...rs.map(r => r.x0)), y1 = Math.max(...rs.map(r => r.y0 + r.th)); put(p, { x: park - x0, y: top() - 30 - y1 }); park += Math.max(...rs.map(r => r.x0 + r.tw)) - x0 + 30; }
  // the doorways between zones that share a page
  for (const [a, b] of links) {
    const ra = byId[a], rb = byId[b];
    if (!ra || !rb || ra.zone === rb.zone || ra.page !== rb.page) continue;
    const d = spDoor(ra, rb); if (!d) continue;
    const o = off[ra.page]; joins.push({ key: ra.zone + '-' + rb.zone, za: ra.zone, zb: rb.zone, x: d.x + o.x, y: d.y + o.y, x2: d.x + o.x, y2: d.y + o.y, lifted: false });
  }
  for (const J of joins) if (!J.za) { const [za, zb] = J.key.split('-'); J.za = za; J.zb = zb; }
  const floors = pmTowerZones().map(r => r[0]);
  if (q.abyss) floors.unshift('z11');   // the Abyss sits under the stadium
  const zones = [];
  let fogX = 0;
  const fogY = top() - 120;
  for (const z of floors) {
    const rooms = Object.values(byId).filter(r => r.zone === z);
    let Zn;
    if (rooms.length) {
      const bx0 = Math.min(...rooms.map(r => r.x0)), by0 = Math.min(...rooms.map(r => r.y0));
      const bw = Math.max(...rooms.map(r => r.x0 + r.tw)) - bx0, bh = Math.max(...rooms.map(r => r.y0 + r.th)) - by0;
      const o = off[rooms[0].page];
      Zn = { z, rooms, bx0, by0, bw, bh, ox: o.x, oy: o.y };
    } else { Zn = { z, rooms: [], bx0: 0, by0: 0, bw: 220, bh: 60, fog: true, ox: fogX, oy: fogY }; fogX += 240; }
    Zn.sx0 = Zn.bx0 + Zn.ox; Zn.sy0 = Zn.by0 + Zn.oy;   // world-sheet rect of the zone
    zones.push(Zn);
  }
  // frame only the part of the tower you have actually reached; the rest is mist
  const kb = zones.filter(spBandKnown);
  if (kb.length) {
    SP.bounds = {
      x0: Math.min(...kb.map(Zn => Zn.sx0)) - 40, x1: Math.max(...kb.map(Zn => Zn.sx0 + Zn.bw)) + 40,
      y0: Math.min(...kb.map(Zn => Zn.sy0)) - 130, y1: Math.max(...kb.map(Zn => Zn.sy0 + Zn.bh)) + 26,
    };
  } else SP.bounds = { x0: -20, x1: 260, y0: fogY - 20, y1: 80 };
  SP.benches = benches; SP.bells = bells; SP.links = links; SP.byId = byId; SP.joins = joins;
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
  PM.towerSegs = [];
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  const rectOf = (Zn, pad) => { const [x0, y0] = S(Zn.sx0 - pad, Zn.sy0 - pad), [x1, y1] = S(Zn.sx0 + Zn.bw + pad, Zn.sy0 + Zn.bh + pad); return [x0, y0, x1, y1]; };
  const roomRect = (Zn, r, pad) => { const [x0, y0] = S(r.x0 + Zn.ox - pad, r.y0 + Zn.oy - pad), [x1, y1] = S(r.x0 + r.tw + Zn.ox + pad, r.y0 + r.th + Zn.oy + pad); return [x0, y0, x1, y1]; };
  const live = Zn => spBandKnown(Zn) && !Zn.fogged && Zn.layer;
  /* pass 1: a dark plate under every room you know, in that zone's own colour (all plates first, so a
     neighbouring zone's plate never paints over rooms that were already drawn) */
  for (const Zn of zs) {
    const [x0, y0, x1, y1] = rectOf(Zn, SP_M);
    if (Zn.shown && Zn.shown.length) for (const r of Zn.shown) { const [a, b, c, d] = roomRect(Zn, r, 0); PM.towerSegs.push({ z: Zn.z, x0: a, x1: c, y0: b, y1: d }); }
    else PM.towerSegs.push({ z: Zn.z, x0, x1, y0, y1 });
    if (!live(Zn) || x1 < -220 || x0 > w + 220 || y1 < -80 || y0 > h + 80) continue;
    const pal = spPal(Zn.z), on = Zn.z === PM.zone;
    g.save(); g.fillStyle = spDark(pal.fill, 0.78);
    if (Zn.z === 'z10') { g.shadowColor = spA(pal.acc, 0.85); g.shadowBlur = 16 + Math.sin(t * 2) * 8; }
    else if (on) { g.shadowColor = spA(pal.ink, 0.55); g.shadowBlur = 12; }
    for (const r of Zn.shown) { const [a, b, c, d] = roomRect(Zn, r, 1); g.fillRect(a, b, c - a, d - b); }
    g.restore();
  }
  /* pass 2: the rooms themselves, inked or sketched */
  for (const Zn of zs) {
    if (!spBandKnown(Zn)) continue;             // zones you have never reached stay in the mist
    const [x0, y0, x1, y1] = rectOf(Zn, SP_M);
    if (x1 < -220 || x0 > w + 220 || y1 < -80 || y0 > h + 80) continue;
    if (live(Zn)) g.drawImage(Zn.layer, x0, y0, x1 - x0, y1 - y0);
    else {
      g.font = `italic ${clamp(zm * 9, 11, 20)}px "Iowan Old Style", Palatino, Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = spA(spPal(Zn.z).ink, 0.45); g.fillText('uncharted', (x0 + x1) / 2, (y0 + y1) / 2);
    }
  }
  /* pass 3: where one zone's exit meets the next zone's entrance */
  const zoneOf = {}; for (const Zn of zs) zoneOf[Zn.z] = Zn;
  const jr = clamp(zm * 1.4, 3.5, 7);
  for (const J of SP.joins || []) {
    const A = zoneOf[J.za], B = zoneOf[J.zb];
    if (!A || !B || !live(A) || !live(B)) continue;
    const [ax, ay] = S(J.x, J.y), [bx, by] = S(J.x2, J.y2);
    if (Math.max(ax, bx) < -40 || Math.min(ax, bx) > w + 40 || Math.max(ay, by) < -40 || Math.min(ay, by) > h + 40) continue;
    if (J.lifted) {   // the pages couldn't touch: a dotted lift line from door to door
      g.save(); g.setLineDash([4, 4]); g.lineDashOffset = -t * 12; g.strokeStyle = 'rgba(242,193,78,.6)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke(); g.restore();
    }
    for (const [x, y, Zx] of J.lifted ? [[ax, ay, A], [bx, by, B]] : [[ax, ay, B]]) {
      g.beginPath(); g.arc(x, y, jr, 0, 7); g.fillStyle = 'rgba(10,8,12,.9)'; g.fill();
      g.lineWidth = 1.6; g.strokeStyle = 'rgba(242,193,78,.95)'; g.stroke();
      g.beginPath(); g.arc(x, y, jr * 0.45, 0, 7); g.fillStyle = spPal(Zx.z).acc; g.fill();
    }
  }
  /* pass 4: each zone's name floats over it at overview and slips away as you zoom in */
  for (const Zn of zs) {
    if (!spBandKnown(Zn)) continue;
    const [x0, y0, x1, y1] = rectOf(Zn, SP_M), on = Zn.z === PM.zone, pal = spPal(Zn.z);
    if (x1 < -220 || x0 > w + 220 || y1 < -80 || y0 > h + 80) continue;
    // centred on the rooms you know, not on the zone's bounding box (zones on one page interlock)
    const list = Zn.shown && Zn.shown.length ? Zn.shown : Zn.rooms;
    let ax = 0, ay = 0, an = 0;
    for (const r of list) { const k = r.tw * r.th; ax += (r.x0 + r.tw / 2 + Zn.ox) * k; ay += (r.y0 + r.th / 2 + Zn.oy) * k; an += k; }
    const [mx, my] = an ? S(ax / an, ay / an) : [(x0 + x1) / 2, (y0 + y1) / 2];
    const Zi = ZONES[Zn.z] || { name: 'The Overtime Abyss', sub: 'Secret' };
    const fit = spFitZoom(w, h), nameA = clamp(1 - (zm - fit * 1.15) / Math.max(0.0001, fit * 0.8), 0, 1);
    if (nameA > 0.02) {
      g.save(); g.globalAlpha = nameA; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `italic ${clamp(13 + zm * 2.6, 14, 26)}px "Iowan Old Style", Palatino, Georgia, serif`;
      g.lineWidth = 4; g.strokeStyle = 'rgba(8,7,10,.85)'; g.strokeText(Zi.name, mx, my);
      g.fillStyle = on ? '#F3EAD8' : 'rgba(233,226,208,.78)'; g.fillText(Zi.name, mx, my);
      const pct = q.zonePct && q.zonePct[Zn.z];
      g.font = `${clamp(9 + zm, 10, 13)}px "Iowan Old Style", Palatino, Georgia, serif`; g.fillStyle = spA(pal.acc, on ? 0.95 : 0.55);
      g.fillText([Zi.sub.split(' · ')[0], pct !== undefined ? `${pct}%` : ''].filter(Boolean).join(' · '), mx, my + clamp(13, zm * 7, 22));
      g.restore();
    }
    if (on) {   // gold corner brackets round the chosen zone
      g.strokeStyle = '#EFE6D2'; g.lineWidth = 1.6; const c = 14, p = 6;
      for (const [cx, cy, sx, sy] of [[x0 - p, y0 - p, 1, 1], [x1 + p, y0 - p, -1, 1], [x0 - p, y1 + p, 1, -1], [x1 + p, y1 + p, -1, -1]]) { g.beginPath(); g.moveTo(cx + sx * c, cy); g.lineTo(cx, cy); g.lineTo(cx, cy + sy * c); g.stroke(); }
    }
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
