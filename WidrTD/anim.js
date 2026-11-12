// ===== WIDR TD: hero animations and upgrade looks =====
// Every hero gets an attack animation that grows with its upgrades, and every tier adds a small visual
// piece (Bloons-style). Path 1 pieces take the colour of the equipped skin, so skins change with upgrades too.

// how each attack type moves: throw (lunge at the target), recoil (kick back), slam (hop and squash), cast (rise and glow)
const ANIM_STYLE = {
  fruit: 'throw', ball: 'throw', star: 'throw', pong: 'throw', plane: 'throw', kimchi: 'throw', digit: 'throw', vinyl: 'throw', feather: 'throw', nail: 'throw', bomb: 'throw',
  snipe: 'recoil', laser: 'recoil', revolver: 'recoil', boulder: 'recoil',
  pick: 'slam', stomp: 'slam', claw: 'slam', burrow: 'slam', kick: 'slam', sword: 'slam', frost: 'cast', joke: 'slam',
  storm: 'cast', chain: 'cast', goon: 'cast', drone: 'cast', vine: 'cast',
};
// where the head and body sit for heroes that aren't built like a person
const LOOK_ANCHOR = {
  thomas: {hy: -9, hr: 10, by: 2, bw: 17}, dih: {hy: -15, hr: 8.5, by: -4, bw: 7}, stormmoeder: {hy: -11, hr: 10, by: -4, bw: 13},
  a438: {hy: -9, hr: 11, by: -2, bw: 11}, janpool: {hy: -12, hr: 10, by: -4, bw: 13}, kayoyara: {hy: -10, hr: 9.5, by: -2, bw: 12},
  raaf: {hy: -9, hr: 10, by: -2, bw: 13}, guiseppe: {hy: -6, hr: 15, by: 4, bw: 17}, appster: {hy: -4, hr: 11, by: 6, bw: 12},
};
const lookAnchor = type => LOOK_ANCHOR[type] || {hy: -4, hr: 11, by: 6, bw: 12};
// first colour of the equipped skin, or the hero's own colour
function skinAccent(type) {
  const sk = typeof skinFor === 'function' ? skinFor(type) : {};
  for (const k in sk) if (typeof sk[k] === 'string' && sk[k][0] === '#') return sk[k];
  return TOWERS[type].color;
}
function tierOf(tiers, p) { return (tiers && tiers[p]) || 0; }

// pieces drawn in the hero's own coordinates; front = after the hero, otherwise behind
function upgradeLook(ctx, type, tiers, time, front) {
  if (!tiers || !(tiers[0] || tiers[1] || tiers[2])) return;
  const A = lookAnchor(type), acc = skinAccent(type), [p0, p1, p2] = [0, 1, 2].map(p => tierOf(tiers, p));
  const gold = '#ffcc29', teal = PATH_COLS[1], coral = PATH_COLS[2];
  if (!front) {
    if (p0 >= 5) { // spinning light rays
      ctx.save(); ctx.translate(0, A.hy + 4); ctx.rotate(time * .8);
      for (let i = 0; i < 8; i++) { ctx.rotate(Math.PI / 4); ctx.fillStyle = i % 2 ? 'rgba(255,204,41,.35)' : 'rgba(255,255,255,.3)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-4, -30); ctx.lineTo(4, -30); ctx.closePath(); ctx.fill(); }
      ctx.restore();
    }
    if (p2 >= 5) { // rune circle on the ground
      ctx.save(); ctx.translate(0, 12); ctx.scale(1, .42); ctx.rotate(-time);
      ctx.strokeStyle = coral; ctx.lineWidth = 2.5; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.arc(0, 0, 30, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
    }
    if (p2 >= 4) { // cape
      const fl = Math.sin(time * 5) * 2;
      shape(ctx, () => { ctx.moveTo(-A.bw + 2, A.by); ctx.lineTo(A.bw - 2, A.by); ctx.quadraticCurveTo(A.bw + 5, A.by + 10, A.bw + 3 + fl, A.by + 15); ctx.lineTo(-A.bw - 3 + fl, A.by + 15); ctx.quadraticCurveTo(-A.bw - 5, A.by + 10, -A.bw + 2, A.by); ctx.closePath(); }, coral, 2);
    }
    if (p1 >= 4) { // jetpack with a flickering flame
      shape(ctx, () => { ctx.roundRect(-A.bw + 1, A.by - 2, 7, 13, 3); ctx.roundRect(A.bw - 8, A.by - 2, 7, 13, 3); }, '#8f9aa8', 2);
      ctx.fillStyle = Math.sin(time * 30) > 0 ? '#ff8a1f' : PAL.sun;
      ctx.beginPath(); ctx.moveTo(-A.bw + 2, A.by + 11); ctx.lineTo(-A.bw + 4.5, A.by + 16 + Math.sin(time * 25) * 2); ctx.lineTo(-A.bw + 7, A.by + 11); ctx.moveTo(A.bw - 7, A.by + 11); ctx.lineTo(A.bw - 4.5, A.by + 16 + Math.cos(time * 25) * 2); ctx.lineTo(A.bw - 2, A.by + 11); ctx.fill();
    }
  }
  if (p1 >= 5) { // two gems orbiting the hero, drawn behind or in front depending on where they are
    for (let i = 0; i < 2; i++) {
      const a = time * 2 + i * Math.PI, inFront = Math.sin(a) > 0;
      if (inFront !== front) continue;
      const gx = Math.cos(a) * (A.bw + 10), gy = A.by + Math.sin(a) * 6;
      shape(ctx, () => { ctx.moveTo(gx, gy - 5); ctx.lineTo(gx + 4, gy); ctx.lineTo(gx, gy + 5); ctx.lineTo(gx - 4, gy); ctx.closePath(); }, teal, 1.5);
    }
  }
  if (!front) return;
  // ---- path 1: skin-coloured gear that gets heavier ----
  if (p0 >= 1) shape(ctx, () => { ctx.roundRect(-A.bw - 1.5, A.by + 5, 4, 4, 1); ctx.roundRect(A.bw - 2.5, A.by + 5, 4, 4, 1); }, acc, 1.5); // wristbands
  if (p0 >= 2) { // shoulder pads
    const pad = p0 >= 5 ? gold : '#cdd6e4';
    shape(ctx, () => { ctx.ellipse(-A.bw + 1, A.by + 1, 5, 3.5, -.3, 0, 7); ctx.moveTo(A.bw + 4, A.by + 1); ctx.ellipse(A.bw - 1, A.by + 1, 5, 3.5, .3, 0, 7); }, pad, 1.8);
    ctx.fillStyle = acc; ctx.fillRect(-A.bw - 1, A.by, 4, 1.5); ctx.fillRect(A.bw - 3, A.by, 4, 1.5);
  }
  if (p0 >= 3) { // headband with tails
    const y = A.hy - A.hr * .45, fl = Math.sin(time * 6) * 1.5;
    shape(ctx, () => ctx.roundRect(-A.hr, y - 1.6, A.hr * 2, 3.2, 1.5), acc, 1.3);
    shape(ctx, () => { ctx.moveTo(A.hr - 1, y); ctx.lineTo(A.hr + 6, y - 3 + fl); ctx.lineTo(A.hr + 5, y + 2 + fl); ctx.closePath(); }, acc, 1.2);
  }
  if (p0 >= 4) { // gold star emblem on the chest
    const cy = A.by + 6;
    shape(ctx, () => { for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? 1.6 : 3.8; ctx.lineTo(Math.cos(a) * r, cy + Math.sin(a) * r); } ctx.closePath(); }, gold, 1.2);
  }
  // ---- path 2: gadgets ----
  if (p1 >= 1) shape(ctx, circ(ctx, -A.bw + 5, A.by + 4, 2), teal, 1.2); // badge
  if (p1 >= 2) { shape(ctx, () => ctx.roundRect(-A.bw + 1, A.by + 9, A.bw * 2 - 2, 3, 1), '#3a2a22', 1.2); shape(ctx, () => ctx.roundRect(-2, A.by + 8.5, 4, 4, 1), gold, 1); } // belt
  if (p1 >= 3) { // goggles on the forehead
    const y = A.hy - A.hr * .78;
    shape(ctx, () => { ctx.roundRect(-A.hr * .75, y - 2.5, A.hr * .65, 5, 2.5); ctx.roundRect(A.hr * .1, y - 2.5, A.hr * .65, 5, 2.5); }, teal, 1.3);
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(-A.hr * .6, y - 1.5, 2, 1.2); ctx.fillRect(A.hr * .25, y - 1.5, 2, 1.2);
  }
  // ---- path 3: flair ----
  if (p2 >= 1) shape(ctx, () => ctx.roundRect(-A.bw + 3, A.by - 1.5, A.bw * 2 - 6, 3.5, 1.5), coral, 1.2); // scarf
  if (p2 >= 2) { const fl = Math.sin(time * 7) * 2; shape(ctx, () => { ctx.moveTo(A.bw - 5, A.by); ctx.lineTo(A.bw + 3, A.by + 5 + fl); ctx.lineTo(A.bw - 1, A.by + 7 + fl); ctx.closePath(); }, coral, 1.2); } // scarf tail
  if (p2 >= 3) { // feather on top of the head
    const top = A.hy - A.hr - 1, sw = Math.sin(time * 3) * .15;
    ctx.save(); ctx.translate(A.hr * .35, top + 3); ctx.rotate(.35 + sw);
    shape(ctx, () => { ctx.moveTo(0, 0); ctx.quadraticCurveTo(-5, -7, 0, -13); ctx.quadraticCurveTo(4, -7, 0, 0); }, coral, 1.2);
    ctx.restore();
  }
}

// a placed hero with its attack animation, idle breathing and upgrade pieces
function drawHeroAnimated(ctx, t) {
  const type = t.type, s = t.s, tiers = t.tiers, total = tiers[0] + tiers[1] + tiers[2], time = G.t + t.id;
  const sz = heroSize(type, t) * (1 + Math.min(total, 7) * .012); // a little bigger with every tier
  const style = ANIM_STYLE[s.kind] || 'throw', ca = Math.cos(t.ang), sa = Math.sin(t.ang);
  const k = Math.min(1, Math.max(0, (G.t - (t.atkT === undefined ? -9 : t.atkT)) / .22));
  const punch = k < 1 ? Math.sin(k * Math.PI) : 0, power = 1 + tiers[0] * .35 + (s.paradise ? .5 : 0);
  let dx = 0, dy = 0, sx = 1, sy = 1;
  if (style === 'throw') { dx = ca * punch * 2.5 * power; dy = sa * punch * 1.6 * power; sx = 1 + punch * .05; sy = 1 - punch * .05; }
  else if (style === 'recoil') { dx = -ca * punch * 2.2 * power; dy = -sa * punch * 1.4 * power; sx = 1 - punch * .04; }
  else if (style === 'slam') { const up = k < .45 ? Math.sin(k / .45 * Math.PI / 2) : 0, sq = k >= .45 && k < 1 ? Math.sin((k - .45) / .55 * Math.PI) : 0; dy = -up * 3 * power; sx = 1 + sq * .14; sy = 1 - sq * .16; }
  else { dy = -punch * 2 * power; sy = 1 + punch * .07; }
  // breathing gets livelier the more it's upgraded
  sy *= 1 + Math.sin(time * (2 + total * .3)) * .012 * (1 + total * .15);
  const bob = Math.sin(time * 4) * 1.2, feet = t.y + 12 * sz;
  ctx.save();
  ctx.translate(t.x + dx, feet + dy); ctx.scale(sx, sy); ctx.translate(-t.x, -feet);
  ctx.save(); ctx.translate(t.x, t.y); ctx.scale(sz, sz); ctx.translate(0, bob); upgradeLook(ctx, type, tiers, time, false); ctx.restore();
  drawHero(ctx, type, t.x, t.y, sz, t.ang, s, tiers, time);
  ctx.save(); ctx.translate(t.x, t.y); ctx.scale(sz, sz); ctx.translate(0, bob); upgradeLook(ctx, type, tiers, time, true); ctx.restore();
  ctx.restore();
  // muzzle flash once a path reaches tier 3
  const top = Math.max(...tiers);
  if (punch > .4 && top >= 3 && (style === 'throw' || style === 'recoil')) {
    const p = tiers.indexOf(top), hx = t.x + ca * 22 * sz + dx, hy = t.y + sa * 15 * sz + dy, r = (3 + top) * punch;
    ctx.fillStyle = PATH_COLS[p]; ctx.globalAlpha = .85;
    ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? r * .45 : r; ctx.lineTo(hx + Math.cos(a) * rr, hy + Math.sin(a) * rr); } ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
  }
  // slams leave a dust ring
  if (style === 'slam' && k > .45 && k < .75) { ctx.strokeStyle = 'rgba(120,90,60,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(t.x, feet, 18 * sz * (k + .3), 6 * sz * (k + .3), 0, 0, 7); ctx.stroke(); }
}

// a portrait that shows the upgrade pieces too (used in the skill tree)
function lookPortrait(type, size, tiers, tower) {
  const c = document.createElement('canvas');
  c.width = size * DPR; c.height = size * DPR; c.style.width = c.style.height = size + 'px';
  const g = c.getContext('2d'), sc = 1.15 * size / 64 / Math.max(1, heroSize(type, tower) * .75);
  g.scale(DPR, DPR);
  const s = computeStats({type, tiers, form: tower && tower.form});
  g.save(); g.translate(size / 2, size / 2 + 2); g.scale(sc, sc); upgradeLook(g, type, tiers, 0, false); g.restore();
  drawHero(g, type, size / 2, size / 2 + 2, sc, Math.PI * .25, s, tiers, 0);
  g.save(); g.translate(size / 2, size / 2 + 2); g.scale(sc, sc); upgradeLook(g, type, tiers, 0, true); g.restore();
  return c;
}

// notice when a hero attacks (its cooldown jumps back up) so the animation can play
const _extrasUpdate0 = extrasUpdate;
extrasUpdate = function (dt) {
  _extrasUpdate0(dt);
  for (const t of G.towers) {
    const cd = t.cd || 0;
    if (cd > (t.prevCd === undefined ? cd : t.prevCd) + .005) t.atkT = G.t;
    t.prevCd = cd;
  }
};
