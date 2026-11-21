'use strict';
/* =========================================================
   SMALL SECRETS · hand-placed per zone (every story page)
   Five kinds, each with a hint you can learn to read:
   · wall  — a cracked wall: hairline cracks and dust trickling
             out of it. 3 bat swings (or one Explosive Baseball)
             knock it in with a deep thud, a shake and the secret
             jingle; behind it a little vault with a chest
   · ledge — a fake ceiling: a patch of rock with a faint draught
             of dust that is really a hole. Bat-Launch, double
             jump or pogo up through it into a hidden alcove
   · bait  — a glinting chunk of Raw Titanium Ore on a pedestal.
             Take it and iron bars slam over every doorway: two
             waves of enemies, then the bars lift and it's yours
   · switch— a bullseye on the wall and a barred alcove with the
             loot in plain sight. Only a Curveball (blue rim) or a
             Static Shock Ball (yellow rim) trips it: come back later
   · lore  — a cracked wall hiding a quiet little room: Lars's
             cats asleep in the vents, Josh's first prototype,
             Daniel's firework stash, Reshman's drawing table, an
             old Team Zennith locker with a torn photo
   The room for each secret is picked by hand below; the exact
   tiles are found in that room's own rock when the page loads
   (a pocket only goes where the rock is solid and well inside
   the room, so it can never cut into a path or another room).
   A secret that finds no safe rock simply isn't there.
   Nothing new shows on the map (not even on Reshman's bought
   map) until you have actually stepped inside it.
   ========================================================= */
// side: which way the pocket faces from the floor (-1 left, 1 right, 0 either) · at: rough spot across the room (0…1)
const SEC_LIST = {
  'zone1.html': [
    { id: 'z1_pipes_wall', room: 'pipes', kind: 'wall', side: 1, at: 0.7, bolts: 150, big: true },
    { id: 'z1_climb_wall', room: 'climb', kind: 'wall', side: -1, at: 0.3, bolts: 60 },
    { id: 'z1_crash_ledge', room: 'crash', kind: 'ledge', at: 0.6, bolts: 50 },
    { id: 'z1_pipes_switch', room: 'pipes', kind: 'switch', needs: 'curve', side: -1, at: 0.25, bolts: 90 },
    { id: 'z1_josh_lore', room: 'climb', kind: 'lore', lore: 'josh', side: 1, at: 0.7 },
  ],
  'act1.html': [
    // The Deep Quarry (big zone)
    { id: 'z2_mouth_wall', room: 'q_mouth', kind: 'wall', side: -1, at: 0.4, bolts: 80 },
    { id: 'z2_rails_wall', room: 'q_rails', kind: 'wall', side: 1, at: 0.8, bolts: 90 },
    { id: 'z2_crystal_wall', room: 'q_crystal', kind: 'wall', side: -1, at: 0.2, bolts: 100 },
    { id: 'z2_shaft_ledge', room: 'q_shaft', kind: 'ledge', at: 0.5, bolts: 60 },
    { id: 'z2_crystal_bait', room: 'q_crystal', kind: 'bait', at: 0.6 },
    { id: 'z2_rails_switch', room: 'q_rails', kind: 'switch', needs: 'shock', side: 1, at: 0.35, bolts: 120 },
    // The Ventilation Shafts (small)
    { id: 'z3_intake_wall', room: 'v_intake', kind: 'wall', side: 0, at: 0.5, bolts: 150, big: true },
    { id: 'z3_cats_lore', room: 'v_turbine', kind: 'lore', lore: 'cats', side: 0, at: 0.5 },
    // The Pyrotechnic Foundry
    { id: 'z4_floor_lore', room: 'f_floor', kind: 'lore', lore: 'daniel', side: -1, at: 0.3 },
    { id: 'z4_fuse_ledge', room: 'f_fuse', kind: 'ledge', at: 0.5, bolts: 70 },
    // The Sunken Bullpen
    { id: 'z12_pump_wall', room: 'b_pump', kind: 'wall', side: 1, at: 0.7, bolts: 80 },
    { id: 'z12_tunnel_wall', room: 'b_tunnel', kind: 'wall', side: -1, at: 0.3, bolts: 80 },
    { id: 'z12_arches_bait', room: 'b_arches', kind: 'bait', at: 0.5 },
    { id: 'z12_glow_switch', room: 'b_glow', kind: 'switch', needs: 'curve', side: 0, at: 0.5, bolts: 100 },
    { id: 'z12_locks_ledge', room: 'b_locks', kind: 'ledge', at: 0.5, bolts: 60 },
  ],
  'act2.html': [
    // The Grand Concourse (big)
    { id: 'z5_hall_wall_l', room: 'c_hall', kind: 'wall', side: -1, at: 0.15, bolts: 100 },
    { id: 'z5_hall_wall_r', room: 'c_hall', kind: 'wall', side: 1, at: 0.85, bolts: 100 },
    { id: 'z5_hall_ledge', room: 'c_hall', kind: 'ledge', at: 0.5, bolts: 80 },
    // The Geode Caverns (big)
    { id: 'z6_fields_wall', room: 'g_fields', kind: 'wall', side: 0, at: 0.3, bolts: 100 },
    { id: 'z6_mouth_lore', room: 'g_mouth', kind: 'lore', lore: 'reshman', side: 0, at: 0.5 },
    { id: 'z6_fields_switch', room: 'g_fields', kind: 'switch', needs: 'curve', side: 0, at: 0.7, bolts: 130 },
    // The Storm Atrium
    { id: 'z7_gate_wall', room: 's_gate', kind: 'wall', side: 0, at: 0.5, bolts: 100 },
    // The Glacier Crown
    { id: 'z8_halls_wall', room: 'i_halls', kind: 'wall', side: 1, at: 0.7, bolts: 110 },
    { id: 'z8_steps_ledge', room: 'i_steps', kind: 'ledge', at: 0.5, bolts: 80 },
    { id: 'z8_halls_bait', room: 'i_halls', kind: 'bait', at: 0.35 },
  ],
  'act3.html': [
    // The Gilded Stadium (big)
    { id: 'z9_steps_wall', room: 't_steps', kind: 'wall', side: 0, at: 0.4, bolts: 120 },
    { id: 'z9_bleach_wall', room: 't_bleach', kind: 'wall', side: 1, at: 0.8, bolts: 120 },
    { id: 'z9_vault_ledge', room: 't_vault', kind: 'ledge', at: 0.5, bolts: 100 },
    { id: 'z9_bleach_bait', room: 't_bleach', kind: 'bait', at: 0.4 },
    { id: 'z9_lasers_switch', room: 't_lasers', kind: 'switch', needs: 'shock', side: 0, at: 0.5, bolts: 150 },
    { id: 'z9_locker_lore', room: 't_locker', kind: 'lore', lore: 'photo', side: 0, at: 0.5 },
  ],
};
const SEC = { list: [], ready: false, mask: new Set(), inRecord: false, prevAtk: 0, arena: null, hum: 0 };
const secQ = () => { const q = Save.data.q; q.secrets = q.secrets || {}; return q.secrets; };
const secS = id => { const Q = secQ(); return (Q[id] = Q[id] || {}); };
const secKey = (tx, ty) => ty * 4096 + tx;
const secHash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0; return h; };
const secSolid = (tx, ty) => tileAt(tx, ty) === 1;
const secAir = (tx, ty) => tileAt(tx, ty) === 0;

/* ---------- finding a safe pocket in the room's rock ---------- */
function secInner(r, m = 2) { return { x0: r.x0 + m, x1: r.x0 + r.tw - 1 - m, y0: r.y0 + m, y1: r.y0 + r.th - 1 - m }; }
const secTaken = [];   // tile rects already used by another secret on this page
const secFree = (x0, y0, x1, y1) => !secTaken.some(R => x0 <= R[2] + 1 && x1 >= R[0] - 1 && y0 <= R[3] + 1 && y1 >= R[1] - 1);
function secAllSolid(x0, y0, x1, y1) { for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (!secSolid(tx, ty)) return false; return true; }
// a wall pocket: Nathan stands on (fx - dir, fy); the face is one column; the room behind it is W wide, 3 tall
function secFindWall(S, r, W) {
  const B = secInner(r), out = [];
  for (let fy = B.y0 + 4; fy <= B.y1; fy++) for (let tx = B.x0; tx <= B.x1; tx++) {
    if (!secSolid(tx, fy) || !secAir(tx, fy - 1) || !secAir(tx, fy - 2) || !secAir(tx, fy - 3)) continue;
    for (const dir of S.side ? [S.side] : [-1, 1]) {
      const fx = tx + dir, far = fx + dir * (W + 1);
      const x0 = Math.min(fx, far), x1 = Math.max(fx, far);
      if (x0 < B.x0 || x1 > B.x1 || fy - 4 < B.y0) continue;
      if (!secAllSolid(x0, fy - 4, x1, fy)) continue;
      if (!secFree(x0, fy - 4, x1, fy)) continue;
      out.push({ dir, fx, fy, x0, x1, stand: tx, score: Math.abs((tx - r.x0) / r.tw - (S.at ?? 0.5)) });
    }
  }
  if (!out.length) return null;
  out.sort((a, b) => a.score - b.score);
  const pick = out[secHash(S.id) % Math.min(4, out.length)];
  // face: rows fy-3..fy-1 at column fx · pocket: the W columns behind it, same rows
  const px0 = pick.dir > 0 ? pick.fx + 1 : pick.fx - W, px1 = pick.dir > 0 ? pick.fx + W : pick.fx - 1;
  return { dir: pick.dir, face: { tx: pick.fx, ty: pick.fy - 3, w: 1, h: 3 }, pocket: { tx: px0, ty: pick.fy - 3, w: px1 - px0 + 1, h: 3 }, floor: pick.fy, rect: [pick.x0, pick.fy - 4, pick.x1, pick.fy] };
}
// a ceiling alcove: a 2-wide hole in a ceiling 6–9 tiles over a floor, opening into a 5×3 pocket of rock
function secFindLedge(S, r) {
  const B = secInner(r), out = [];
  for (let fy = B.y0 + 10; fy <= B.y1; fy++) for (let tx = B.x0 + 2; tx <= B.x1 - 4; tx++) {
    if (!secSolid(tx, fy) || !secSolid(tx + 1, fy) || !secAir(tx, fy - 1) || !secAir(tx + 1, fy - 1)) continue;
    let cy = fy - 1; while (cy > B.y0 && secAir(tx, cy) && secAir(tx + 1, cy)) cy--;
    const d = fy - cy; if (d < 6 || d > 9 || !secSolid(tx, cy) || !secSolid(tx + 1, cy)) continue;
    const x0 = tx - 2, x1 = tx + 4, y0 = cy - 4;
    if (x0 < B.x0 || x1 > B.x1 || y0 < B.y0) continue;
    if (!secAllSolid(x0, y0, x1, cy)) continue;
    if (!secFree(x0, y0, x1, cy)) continue;
    out.push({ tx, cy, x0, x1, y0, score: Math.abs((tx - r.x0) / r.tw - (S.at ?? 0.5)) });
  }
  if (!out.length) return null;
  out.sort((a, b) => a.score - b.score);
  const p = out[secHash(S.id) % Math.min(4, out.length)];
  return { hole: { tx: p.tx, ty: p.cy, w: 2, h: 1 }, pocket: { tx: p.tx - 1, ty: p.cy - 3, w: 5, h: 3 }, floor: p.cy, rect: [p.x0, p.y0, p.x1, p.cy] };
}
// an open floor spot near `at` for a pedestal, 3 tiles wide with headroom
function secFindFloor(S, r) {
  const B = secInner(r, 3), out = [];
  for (let fy = B.y0 + 4; fy <= B.y1; fy++) for (let tx = B.x0; tx <= B.x1 - 2; tx++) {
    let ok = true;
    for (let k = 0; k < 3 && ok; k++) ok = secSolid(tx + k, fy) && secAir(tx + k, fy - 1) && secAir(tx + k, fy - 2) && secAir(tx + k, fy - 3);
    if (ok) out.push({ tx: tx + 1, fy, score: Math.abs((tx - r.x0) / r.tw - (S.at ?? 0.5)) + Math.abs((fy - r.y0) / r.th - 0.7) * 0.3 });
  }
  if (!out.length) return null;
  out.sort((a, b) => a.score - b.score);
  return out[0];
}
function secSetup() {
  if (SEC.ready || typeof ROOM === 'undefined' || typeof grid === 'undefined' || !grid) return;
  SEC.ready = true;
  const page = typeof spPage === 'function' ? spPage() : (location.pathname.split('/').pop() || 'zone1.html');
  for (const S0 of SEC_LIST[page] || []) {
    const r = ROOM[S0.room]; if (!r) continue;
    const S = Object.assign({}, S0), st = secS(S.id);
    let G = null;
    try {
      if (S.kind === 'wall' || S.kind === 'switch') G = secFindWall(S, r, 4);
      else if (S.kind === 'lore') G = secFindWall(S, r, 7);
      else if (S.kind === 'ledge') G = secFindLedge(S, r);
      else if (S.kind === 'bait') { const f = secFindFloor(S, r); if (f) G = { stand: f, rect: [f.tx - 1, f.fy - 3, f.tx + 1, f.fy] }; }
    } catch (e) { logErr('secrets: find ' + S.id, e); }
    if (!G) continue;
    Object.assign(S, G); S.r = r; secTaken.push(G.rect);
    // switch: the bullseye floats on the opposite side of the standing spot, 4 tiles up
    if (S.kind === 'switch') {
      let spot = null;
      for (const dx of [3, 2, 4, 1]) for (const up of [5, 4, 3]) if (!spot && secAir(S.face.tx - S.dir * dx, S.floor - up)) spot = [S.face.tx - S.dir * dx, S.floor - up];
      if (!spot) { secTaken.pop(); continue; }
      S.target = { x: (spot[0] + 0.5) * TILE, y: (spot[1] + 0.5) * TILE };
    }
    // re-open what this save already opened
    if (S.kind === 'switch') secCarve(S.pocket);                         // the barred alcove is visible from the start
    if ((S.kind === 'wall' || S.kind === 'lore') && st.open) { secCarve(S.pocket); secCarve(S.face); }
    if (S.kind === 'switch' && st.open) secCarve(S.face);
    if (S.kind === 'ledge') { secCarve(S.hole); if (st.found) secCarve(S.pocket); }
    SEC.list.push(S);
  }
  secRemask();
  if (Zone.room) secEnter(Zone.room);
}
function secCarve(R) { for (let ty = R.ty; ty < R.ty + R.h; ty++) for (let tx = R.tx; tx < R.tx + R.w; tx++) if (tx >= 0 && ty >= 0 && tx < LW && ty < LH) grid[ty * LW + tx] = 0; }
// what the map must not see yet: a fake ceiling's hole, and a barred alcove you haven't stepped into
function secRemask() {
  SEC.mask.clear();
  for (const S of SEC.list) {
    if (secS(S.id).found) continue;
    const add = R => { for (let ty = R.ty; ty < R.ty + R.h; ty++) for (let tx = R.tx; tx < R.tx + R.w; tx++) SEC.mask.add(secKey(tx, ty)); };
    if (S.kind === 'ledge') { add(S.hole); add(S.pocket); }
    if (S.kind === 'switch') { add(S.pocket); add(S.face); }
    if ((S.kind === 'wall' || S.kind === 'lore') && secS(S.id).open) { add(S.pocket); add(S.face); }
  }
}
// the map reads tiles only while it's drawing (in a menu) or while the tower atlas is written
const _secTileAt = tileAt;
tileAt = function (tx, ty) {
  if (SEC.mask.size && (SEC.inRecord || (typeof UI !== 'undefined' && UI.modal)) && SEC.mask.has(secKey(tx, ty))) return 1;
  return _secTileAt(tx, ty);
};
if (typeof spRecord === 'function') {
  const _secRec = spRecord;
  spRecord = function () { secSetup(); SEC.inRecord = true; try { return _secRec.apply(this, arguments); } finally { SEC.inRecord = false; } };
}
const secRect = R => ({ x: R.tx * TILE, y: R.ty * TILE, w: R.w * TILE, h: R.h * TILE });
function secFound(S, quiet) {
  const st = secS(S.id); if (st.found) return;
  st.found = 1; secRemask(); saveGame();
  if (typeof SP !== 'undefined') SP.dirty = true;
  if (!quiet) { SFX.unlock(); toast('SECRET FOUND · ' + (S.kind === 'lore' ? 'A QUIET LITTLE ROOM' : S.kind === 'ledge' ? 'A HIDDEN ALCOVE' : 'A HIDDEN VAULT')); }
}

/* ---------- things in the room ---------- */
class SecChest {
  constructor(S, x, y) { Object.assign(this, { kind: 'secchest', S, x, y, t: rand(0, 6), near: false, prompt: 'OPEN', gone: false, open: 0 }); }
  update(dt) {
    this.t += dt; if (this.open) { this.open += dt; if (this.open > 1.2) this.gone = true; return; }
    const c = Player.center();
    this.near = Math.abs(c.x - this.x) < 36 && Math.abs(Player.y + Player.h - this.y) < 26;
    if (Player.attackT > 0 && overlap(Player.hitbox(), { x: this.x - 16, y: this.y - 24, w: 32, h: 24 })) this.interact();
  }
  interact() {
    if (this.open) return;
    this.open = 0.01; const st = secS(this.S.id); st.chest = 1;
    const n = this.S.bolts || 60;
    SFX.unlock(); SFX.coin(); addShake(4); dropBolts(this.x, this.y - 16, n);
    pop(this.x, this.y - 40, n >= 150 ? 'BOLT CACHE!' : 'TREASURE!', { size: 30, color: GOLD });
    burst(this.x, this.y - 12, 22, { colors: [GOLD, '#fff3c8', BONE], maxSpeed: 360 });
    saveGame();
  }
  draw() {
    const x = this.x, y = this.y, o = Math.min(1, this.open * 4), big = this.S.big;
    ctx.save(); ctx.lineJoin = 'round'; ctx.globalAlpha = this.open > 0.8 ? Math.max(0, 1 - (this.open - 0.8) / 0.4) : 1;
    const w = big ? 40 : 30, h = big ? 22 : 18;
    rr(x - w / 2, y - h, w, h, 3); inked('#6b4a2a', 3);
    ctx.fillStyle = GOLD; ctx.fillRect(x - w / 2 + 3, y - h + 6, w - 6, 3); ctx.fillRect(x - 3, y - h + 4, 6, 8);
    ctx.save(); ctx.translate(x - w / 2, y - h); ctx.rotate(-o * 1.1);
    rr(0, -9, w, 10, 4); inked('#7a5532', 3); ctx.restore();
    if (!this.open) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(242,193,78,${0.12 + 0.08 * Math.sin(this.t * 3)})`; ctx.beginPath(); ctx.arc(x, y - h / 2, w * 0.9, 0, 7); ctx.fill(); }
    ctx.restore();
    if (this.near && !this.open) { ctx.font = `14px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = GOLD; ctx.fillText('▲ ' + Bindings.label('up', Game.lastInput) + ' · OPEN', x, y - 40 + Math.sin(Game.time * 4) * 2); }
  }
}
// a lore prop you can look at
class SecProp {
  constructor(S, kind, x, y, lines) { Object.assign(this, { kind: 'secprop', S, what: kind, x, y, lines, t: rand(0, 6), near: false, prompt: 'LOOK', gone: false }); }
  update(dt) { this.t += dt; const c = Player.center(); this.near = Math.abs(c.x - this.x) < 40 && Math.abs(Player.y + Player.h - this.y) < 26; }
  interact() {
    if (Story.active) return;
    const lines = this.lines, nh = () => Story.nathanHead();
    Story.run(async () => { for (const [who, txt] of lines) await Story.say(who, txt, nh); });
    if (this.what === 'stash' && !secS(this.S.id).chest) { secS(this.S.id).chest = 1; dropBolts(this.x, this.y - 20, 40); SFX.coin(); saveGame(); }
  }
  draw() {
    const x = this.x, y = this.y, t = this.t;
    ctx.save(); ctx.lineJoin = 'round';
    if (this.what === 'proto') {   // Josh's first launcher, duct tape and all
      rr(x - 22, y - 14, 44, 14, 3); inked('#5a5f68', 3);
      rr(x - 6, y - 30, 30, 12, 4); inked('#8a8f98', 3); ctx.fillStyle = '#c9a36b'; ctx.fillRect(x + 2, y - 28, 6, 8);
      ctx.fillStyle = `rgba(111,211,255,${0.5 + 0.4 * Math.sin(t * 6)})`; ctx.fillRect(x - 16, y - 10, 6, 4);
    } else if (this.what === 'stash') {   // a crate of fireworks
      rr(x - 20, y - 22, 40, 22, 2); inked('#8a5a3a', 3);
      for (let k = 0; k < 4; k++) { ctx.fillStyle = ['#e8361c', GOLD, '#ff4aa0', '#6fd3ff'][k]; ctx.fillRect(x - 16 + k * 9, y - 34, 6, 14); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(x - 16 + k * 9, y - 34, 6, 14); }
    } else if (this.what === 'table') {   // Reshman's drawing table, sketches pinned to the rock
      ctx.fillStyle = '#3a2d22'; ctx.fillRect(x - 24, y - 20, 48, 5); ctx.fillRect(x - 20, y - 15, 4, 15); ctx.fillRect(x + 16, y - 15, 4, 15);
      for (let k = 0; k < 3; k++) { ctx.save(); ctx.translate(x - 40 + k * 40, y - 64); ctx.rotate((k - 1) * 0.12); ctx.fillStyle = '#e9dfc6'; ctx.fillRect(-12, -14, 24, 28); ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.strokeRect(-12, -14, 24, 28);
        ctx.strokeStyle = 'rgba(30,20,40,.7)'; ctx.beginPath(); ctx.arc(0, -2, 6 + k, 0, 7); ctx.moveTo(-6, 8); ctx.lineTo(6, 8); ctx.stroke(); ctx.restore(); }
      ctx.fillStyle = `rgba(185,139,255,${0.5 + 0.3 * Math.sin(t * 4)})`; ctx.beginPath(); ctx.arc(x + 14, y - 26, 3, 0, 7); ctx.fill();
    } else if (this.what === 'photo') {   // a locker, door ajar, a torn photo taped inside
      rr(x - 16, y - 56, 32, 56, 2); inked('#4a5060', 3);
      ctx.fillStyle = '#2a2f38'; ctx.fillRect(x - 12, y - 52, 24, 48);
      ctx.save(); ctx.translate(x, y - 34); ctx.rotate(-0.06); ctx.fillStyle = '#e9dcc0'; ctx.fillRect(-9, -9, 18, 14);
      ctx.fillStyle = '#e8361c'; ctx.beginPath(); ctx.arc(-4, -3, 3, 0, 7); ctx.fill(); ctx.fillStyle = '#3d6ee0'; ctx.beginPath(); ctx.arc(4, -3, 3, 0, 7); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(1, -4); ctx.lineTo(-1, 0); ctx.lineTo(1, 5); ctx.stroke(); ctx.restore();
    }
    ctx.restore();
    if (this.near && !Story.active) { ctx.font = `14px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = GOLD; ctx.fillText('▲ ' + Bindings.label('up', Game.lastInput) + ' · LOOK', x, y - 70 + Math.sin(Game.time * 4) * 2); }
  }
}
const SEC_LORE = {
  josh: { prop: 'proto', lines: [['NATHAN', 'Is that… duct tape and a leaf blower?'], ['NATHAN', '"KINETIC LAUNCHER Mk.0 · DO NOT TURN ON · SERIOUSLY JOSH". In Josh\'s handwriting. To himself.']] },
  daniel: { prop: 'stash', lines: [['NATHAN', 'Daniel\'s secret stash. Labelled "DEFINITELY NOT FIREWORKS".'], ['NATHAN', 'He won\'t miss a few bolts from the bottom. …Probably.']] },
  reshman: { prop: 'table', lines: [['NATHAN', 'Reshman\'s drawing table. Maps… and sketches of things I\'ve never fought.'], ['NATHAN', 'A giant mascot. A pitching machine with eyes. "Maybe next season." …Blorp?']] },
  photo: { prop: 'photo', lines: [['NATHAN', 'An old Team Zennith locker. There\'s a photo taped inside.'], ['NATHAN', 'Me and Adam. Rookie year. Somebody tore it right down the middle… and taped it back together.']] },
};
// the bait: a chunk of ore glinting on a little stone pedestal
class SecPedestal {
  constructor(S) { Object.assign(this, { kind: 'secped', S, x: (S.stand.tx + 0.5) * TILE, y: S.stand.fy * TILE, t: rand(0, 6), gone: false }); }
  update(dt) {
    this.t += dt;
    if (SEC.arena) return;
    const c = Player.center();
    if (!Player.dead && Math.abs(c.x - this.x) < 26 && Math.abs(Player.y + Player.h - this.y) < 30) secArenaStart(this.S);
  }
  draw() {
    const x = this.x, y = this.y, t = this.t, taken = SEC.arena && SEC.arena.S === this.S;
    ctx.save(); ctx.lineJoin = 'round';
    rr(x - 14, y - 16, 28, 16, 2); inked('#5a5060', 3); rr(x - 18, y - 20, 36, 6, 2); inked('#6e6478', 3);
    if (!taken) {
      const by = y - 34 + Math.sin(t * 2.4) * 3;
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(x, by, 0, x, by, 30); g.addColorStop(0, 'rgba(160,230,255,.55)'); g.addColorStop(1, 'rgba(160,230,255,0)');
      ctx.fillStyle = g; ctx.fillRect(x - 30, by - 30, 60, 60); ctx.globalCompositeOperation = 'source-over';
      ctx.beginPath(); ctx.moveTo(x - 8, by + 6); ctx.lineTo(x - 10, by - 2); ctx.lineTo(x - 2, by - 9); ctx.lineTo(x + 8, by - 5); ctx.lineTo(x + 9, by + 5); ctx.closePath(); inked('#9fd8e8', 2.5);
      if (Math.sin(t * 5) > 0.92) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 2, by - 6, 2, 2); }
    }
    ctx.restore();
  }
}
// the switch: a painted bullseye, rimmed in the colour of the only ball that trips it
class SecTarget {
  constructor(S) { Object.assign(this, { kind: 'sectarget', S, x: S.target.x, y: S.target.y, t: 0, hit: 0, gone: false }); }
  update(dt) {
    this.t += dt; this.hit = Math.max(0, this.hit - dt);
    if (secS(this.S.id).open) return;
    for (const b of Balls) {
      if (b.dead || b.state !== 'shot' || b._secHit) continue;
      if (Math.hypot(b.x - this.x, b.y - this.y) > 22) continue;
      b._secHit = true;
      const good = this.S.needs === 'curve' ? b.kind === 'curve' : !!b.shock;
      if (good) { b.dead = true; secSwitchOpen(this.S); this.hit = 0.6; }
      else { SFX.clang(); this.hit = 0.25; pop(this.x, this.y - 26, this.S.needs === 'curve' ? 'NEEDS A CURVEBALL' : 'NEEDS A STATIC BALL', { size: 18, color: BONE, burst: false, vy: -40 }); }
    }
  }
  draw() {
    const x = this.x, y = this.y, open = secS(this.S.id).open, rim = this.S.needs === 'curve' ? '#6fd3ff' : '#ffd24a';
    ctx.save(); ctx.lineJoin = 'round';
    ctx.fillStyle = '#2a2230'; ctx.fillRect(x - 2, y + 16, 4, 14);
    for (const [r, c] of [[18, open ? '#4a4a50' : rim], [13, '#f3ead8'], [8, open ? '#6a6a70' : '#e8361c'], [3, '#f3ead8']]) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = c; ctx.fill(); }
    ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 18, 0, 7); ctx.stroke();
    if (!open) { ctx.strokeStyle = rim; ctx.globalAlpha = 0.35 + 0.25 * Math.sin(this.t * 3); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 23, 0, 7); ctx.stroke(); }
    ctx.restore();
  }
}

/* ---------- entering a room: breakables, chests, props ---------- */
function secEnter(r) {
  if (!SEC.ready) return;
  for (const S of SEC.list) {
    if (S.r !== r) continue;
    const st = secS(S.id);
    if ((S.kind === 'wall' || S.kind === 'lore') && !st.open && !Breakables.some(b => b.id === 'sec_' + S.id)) {
      const R = secRect(S.face);
      Breakables.push({ x: R.x, y: R.y, w: R.w, h: R.h, id: 'sec_' + S.id, secret: true, onBreak: () => secWallOpen(S) });
    }
    secSpawn(S);
  }
}
function secSpawn(S) {
  const st = secS(S.id), P = S.pocket;
  const has = k => NPCs.some(n => n.S === S && n.kind === k);
  const inner = (P && st.open) || S.kind === 'ledge' && st.found || S.kind === 'switch';
  if (P && inner && (S.kind === 'wall' || S.kind === 'switch' || S.kind === 'ledge') && !st.chest && !has('secchest')) {
    const cx = S.kind === 'ledge' ? (P.tx + 4.5) * TILE : (S.dir > 0 ? (P.tx + P.w - 1.5) : (P.tx + 1.5)) * TILE;
    NPCs.push(new SecChest(S, cx, (P.ty + P.h) * TILE));
  }
  if (S.kind === 'lore' && st.open && !has('secprop') && !has('cat')) {
    const L = S.lore, mid = (P.tx + P.w / 2) * TILE, fy = (P.ty + P.h) * TILE;
    if (L === 'cats') {
      const names = [['Biscuit', '#c9a36b'], ['Rivet', '#8a8f98'], ['Mochi', '#f3ead8']];
      names.forEach(([name, color], i) => {
        const c = new CampNPC('cat', mid + (i - 1) * 56, fy, { name, color, facing: i ? -1 : 1, reach: 24, prompt: 'PET', sleepy: true, S, secCat: true });
        const pet = c.interact.bind(c);
        c.interact = function () {
          const was = this.petT; pet();
          if (was > 0) return;
          const st2 = secS(S.id); st2.pets = st2.pets || {}; st2.pets[name] = 1; saveGame();
          if (Object.keys(st2.pets).length >= 3 && !st2.nap) {
            st2.nap = 1; saveGame();
            setTimeout(() => { toast('SECRET ACHIEVEMENT · NAP TIME'); if (typeof tGive === 'function') tGive('nap_time'); }, 900);
          }
        };
        NPCs.push(c);
      });
    } else if (SEC_LORE[L]) NPCs.push(new SecProp(S, SEC_LORE[L].prop, mid, fy, SEC_LORE[L].lines));
  }
  if (S.kind === 'bait' && !st.done && !has('secped')) NPCs.push(new SecPedestal(S));
  if (S.kind === 'switch' && !has('sectarget')) NPCs.push(new SecTarget(S));
}
const _secEnter = enterRoom;
enterRoom = function (r) {
  if (SEC.arena) secArenaEnd(false);
  const out = _secEnter.apply(this, arguments);
  try { secSetup(); secEnter(Zone.room || r); } catch (e) { logErr('secrets: enter', e); }
  return out;
};

/* ---------- opening things ---------- */
function secWallOpen(S) {
  const st = secS(S.id); if (st.open) return;
  st.open = 1; secCarve(S.pocket); secCarve(S.face); secRemask();
  for (let i = Breakables.length - 1; i >= 0; i--) if (Breakables[i].id === 'sec_' + S.id) Breakables.splice(i, 1);
  const R = secRect(S.face), cx = R.x + R.w / 2, cy = R.y + R.h / 2;
  SFX.bigCrack(); SFX.dirt(); addShake(12); addHitstop(0.08);
  setTimeout(() => SFX.unlock(), 250);
  for (let k = 0; k < 14; k++) spawnParticle({ x: cx + rand(-14, 14), y: cy + rand(-40, 40), vx: rand(-200, 200) + S.dir * 160, vy: rand(-320, -80), life: rand(0.5, 1), size: rand(5, 10), color: '#6a5a70', grav: 1500, type: 'debris', rot: rand(0, 6), vr: rand(-10, 10), drag: 0.4 });
  burst(cx, cy, 20, { colors: ['#a89cb0', '#6a5a70', '#f3ead8'], maxSpeed: 360 });
  saveGame(); secSpawn(S);
  if (typeof SP !== 'undefined') SP.dirty = true;
}
function secSwitchOpen(S) {
  const st = secS(S.id); if (st.open) return;
  st.open = 1; secCarve(S.face); secRemask();
  SFX.clang(); SFX.gate(); setTimeout(() => SFX.unlock(), 200); addShake(6);
  pop(S.target.x, S.target.y - 30, 'BULLSEYE!', { size: 30, color: GOLD });
  const R = secRect(S.face); burst(R.x + R.w / 2, R.y + R.h / 2, 16, { colors: ['#8a8f98', '#f3ead8'], maxSpeed: 260 });
  saveGame();
}

/* ---------- the bait arena ---------- */
function secArenaStart(S) {
  const r = S.r;
  if (Zone.boss && !Zone.boss.dead) return;
  // every doorway on the room's edge gets barred (never a tile Nathan is standing in)
  const gates = [], hb = Player.hurtbox();
  const tryGate = (tx, ty, ox, oy) => {
    if (!secAir(tx, ty) || !(secAir(tx + ox, ty + oy) || tileAt(tx + ox, ty + oy) === 3)) return;
    if (overlap(hb, { x: tx * TILE, y: ty * TILE, w: TILE, h: TILE })) return;
    gates.push([tx, ty]);
  };
  for (let ty = r.y0; ty < r.y0 + r.th; ty++) { tryGate(r.x0, ty, -1, 0); tryGate(r.x0 + r.tw - 1, ty, 1, 0); }
  for (let tx = r.x0; tx < r.x0 + r.tw; tx++) { tryGate(tx, r.y0, 0, -1); tryGate(tx, r.y0 + r.th - 1, 0, 1); }
  for (const [tx, ty] of gates) grid[ty * LW + tx] = 1;
  SEC.arena = { S, gates, wave: 0, foes: [], t: 0, next: 0.9, cap: 120 };
  SFX.gate(); SFX.slam(); addShake(10); toast('IT\'S A TRAP · SURVIVE TWO WAVES');
  if (typeof Music !== 'undefined' && Music.duck) Music.duck(0.5, 0.8);
}
function secArenaSpawn(A) {
  const r = A.S.r, B = secInner(r, 3), P = Player.center(), spots = [];
  for (let fy = B.y0 + 4; fy <= B.y1; fy++) for (let tx = B.x0; tx <= B.x1; tx++)
    if (secSolid(tx, fy) && secAir(tx, fy - 1) && secAir(tx, fy - 2) && Math.abs((tx + 0.5) * TILE - P.x) > 220) spots.push([tx, fy]);
  if (!spots.length) return;
  const n = A.wave === 1 ? 3 : 4;
  for (let k = 0; k < n; k++) {
    const [tx, fy] = spots[(secHash(A.S.id + A.wave + k) + k * 7919) % spots.length];
    let e;
    if (A.wave === 2 && k >= 2) e = new StrayDrone((tx + 0.5) * TILE, (fy - 4) * TILE);
    else e = new Scuttler((tx + 0.5) * TILE, fy * TILE);
    e.bolts = 2; e.secArena = true; Enemies.push(e); A.foes.push(e);
    burst((tx + 0.5) * TILE, fy * TILE - 20, 14, { colors: ['#ff4a3a', '#f3ead8'], maxSpeed: 280 });
  }
  SFX.summon();
}
function secArenaEnd(won) {
  const A = SEC.arena; if (!A) return;
  for (const [tx, ty] of A.gates) grid[ty * LW + tx] = 0;
  SEC.arena = null;
  if (won) {
    const st = secS(A.S.id); st.done = 1;
    Save.data.ore = (Save.data.ore || 0) + 1;
    SFX.gate(); setTimeout(() => SFX.unlock(), 200);
    const c = Player.center(); dropBolts(c.x, c.y - 30, 40);
    toast('+1 RAW TITANIUM ORE · THE BARS LIFT');
    for (let i = NPCs.length - 1; i >= 0; i--) if (NPCs[i].S === A.S && NPCs[i].kind === 'secped') NPCs[i].gone = true;
    saveGame();
  }
}
function secArenaTick(dt) {
  const A = SEC.arena; if (!A) return;
  A.t += dt;
  if (Player.dead || Zone.room !== A.S.r || A.t > A.cap) { secArenaEnd(false); return; }
  if (A.foes.some(e => !e.dead)) return;
  A.next -= dt; if (A.next > 0) return;
  if (A.wave >= 2) { secArenaEnd(true); return; }
  A.wave++; A.foes = []; A.next = 1; secArenaSpawn(A);
}

/* ---------- every frame: bat hits on cracked walls, stepping into secrets ---------- */
const _secTick = PAGE.tick;
PAGE.tick = function (dt) {
  if (_secTick) _secTick.call(this, dt);
  try {
    secSetup();
    if (!SEC.ready || !Zone.room) return;
    const P = Player, fresh = P.attackT > SEC.prevAtk + 0.01; SEC.prevAtk = P.attackT;
    const hb = fresh ? P.hitbox() : null, c = P.center();
    for (const S of SEC.list) {
      if (S.r !== Zone.room) continue;
      const st = secS(S.id);
      if ((S.kind === 'wall' || S.kind === 'lore') && !st.open && hb && overlap(hb, secRect(S.face))) {
        S.hits = (S.hits || 0) + 1;
        const R = secRect(S.face);
        SFX.dirt(); SFX.hit(false); addShake(3 + S.hits * 2);
        burst(R.x + R.w / 2, R.y + R.h / 2, 8 + S.hits * 4, { colors: ['#a89cb0', '#6a5a70'], maxSpeed: 220 });
        if (S.hits >= 3) secWallOpen(S);
      }
      // fake ceiling: the alcove opens the moment he rises into the hole
      if (S.kind === 'ledge' && !st.found) {
        const H = secRect(S.hole);
        if (overlap(P, { x: H.x, y: H.y, w: H.w, h: H.h + 2 * TILE }) && P.vy < 0 && grid[S.pocket.ty * LW + S.pocket.tx] !== 0) secCarve(S.pocket);
      }
      // stepping inside counts as discovering it (and puts it on the map)
      if (S.pocket && !st.found && (st.open || S.kind === 'ledge' || (S.kind === 'switch' && st.open))) {
        const R = secRect(S.pocket);
        if (c.x > R.x && c.x < R.x + R.w && c.y > R.y - TILE && c.y < R.y + R.h) { secFound(S); secSpawn(S); }
      }
      // the hint: dust trickling out of a cracked wall or a fake ceiling
      if (Math.random() < dt * 1.4) {
        if ((S.kind === 'wall' || S.kind === 'lore') && !st.open) { const R = secRect(S.face); spawnParticle({ x: R.x + (S.dir > 0 ? 2 : R.w - 2), y: R.y + rand(4, R.h - 4), vx: -S.dir * rand(4, 20), vy: rand(20, 60), life: 1.2, size: 2, color: 'rgba(200,190,170,.7)', type: 'dot' }); }
        if (S.kind === 'ledge' && !st.found) { const R = secRect(S.hole); spawnParticle({ x: R.x + rand(4, R.w - 4), y: R.y + R.h, vx: rand(-6, 6), vy: rand(30, 70), life: 1.4, size: 2, color: 'rgba(200,190,170,.6)', type: 'dot' }); }
      }
    }
    secArenaTick(dt);
  } catch (e) { logErr('secrets: tick', e); }
};

/* ---------- drawing: cracks, fake ceilings, bars ---------- */
function secDrawCracks(S) {
  const R = secRect(S.face), h = secHash(S.id), hits = S.hits || 0;
  ctx.save(); ctx.strokeStyle = `rgba(13,11,16,${0.55 + hits * 0.15})`; ctx.lineWidth = 1.5 + hits * 0.6; ctx.lineCap = 'round';
  for (let k = 0; k < 3 + hits * 2; k++) {
    let x = R.x + 6 + ((h >> (k * 3)) % (R.w - 12 || 1)), y = R.y + 8 + ((h >> (k * 4)) % (R.h - 16));
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let s = 0; s < 3; s++) { x += ((h >> (k + s)) % 13) - 6; y += 6 + ((h >> (s * 5 + k)) % 8); ctx.lineTo(x, y); }
    ctx.stroke();
  }
  // a loose wire hanging out of the seam
  ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 1.5; ctx.beginPath();
  const wx = S.dir > 0 ? R.x + 2 : R.x + R.w - 2; ctx.moveTo(wx, R.y + 10); ctx.quadraticCurveTo(wx - S.dir * 6, R.y + 18 + Math.sin(Game.time * 2) * 2, wx - S.dir * 3, R.y + 26); ctx.stroke();
  ctx.restore();
}
function secDrawFake(S) {
  const R = secRect(S.hole), Pp = Game.tilePal || TILE_PAL;
  ctx.save();
  for (let i = 0; i < S.hole.w; i++) {
    const x = R.x + i * TILE, y = R.y;
    ctx.fillStyle = Pp.b; ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x + 6, y + 10, 10, 3);
    ctx.fillStyle = INK; ctx.fillRect(x - 1, y + TILE - 1, TILE + 2, 3);
  }
  ctx.restore();
}
function secDrawBars(S) {
  const R = secRect(S.face);
  ctx.save();
  ctx.fillStyle = 'rgba(10,8,12,.92)'; ctx.fillRect(R.x, R.y, R.w, R.h);
  ctx.fillStyle = '#5a5f68'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
  for (let k = 0; k < 3; k++) { const x = R.x + 5 + k * 10; ctx.fillRect(x, R.y, 4, R.h); ctx.strokeRect(x, R.y, 4, R.h); }
  ctx.fillRect(R.x, R.y + 6, R.w, 4); ctx.strokeRect(R.x, R.y + 6, R.w, 4); ctx.fillRect(R.x, R.y + R.h - 10, R.w, 4); ctx.strokeRect(R.x, R.y + R.h - 10, R.w, 4);
  ctx.restore();
}
function secDrawGates() {
  const A = SEC.arena; if (!A) return;
  ctx.save(); ctx.fillStyle = '#4a4f58'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
  for (const [tx, ty] of A.gates) {
    const x = tx * TILE, y = ty * TILE;
    ctx.fillStyle = 'rgba(10,8,12,.85)'; ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = '#6a6f78';
    for (let k = 0; k < 3; k++) { ctx.fillRect(x + 4 + k * 10, y, 4, TILE); ctx.strokeRect(x + 4 + k * 10, y, 4, TILE); }
  }
  ctx.restore();
}
(function () {
  const H = Game.hooks;
  const oB = H.back; H.back = function (cam) {
    if (oB) oB.call(H, cam);
    try {
      if (!SEC.ready || !Zone.room) return;
      for (const S of SEC.list) {
        if (S.r !== Zone.room) continue;
        const st = secS(S.id);
        if ((S.kind === 'wall' || S.kind === 'lore') && !st.open) secDrawCracks(S);
        if (S.kind === 'switch' && !st.open) secDrawBars(S);
      }
      secDrawGates();
    } catch (e) { logErr('secrets: draw', e); }
  };
  const oF = H.front; H.front = function (cam) {
    if (oF) oF.call(H, cam);
    try { if (SEC.ready && Zone.room) for (const S of SEC.list) if (S.r === Zone.room && S.kind === 'ledge' && !secS(S.id).found) secDrawFake(S); } catch (e) { logErr('secrets: fake', e); }
  };
})();
