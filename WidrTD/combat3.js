// ===== WIDR TD: mechanics for the Wat in de Combat heroes =====
// area attacks that hit everything in range (see pulse() in game.js)
const PULSE_TYPE = {
  pick: {type: 'sharp', col: '#a0662b'}, frost: {type: 'cold', col: '#7fd6ff'}, joke: {type: 'magic', col: '#ff7ab6'}, stomp: {type: 'blast', col: '#c98a5a'},
  claw: {type: 'sharp', col: '#c98a4a'}, burrow: {type: 'sharp', col: '#ff8fb1'}, kick: {type: 'sharp', col: '#cfc8b8'}, sword: {type: 'sharp', col: '#bfefff'},
};
const HERO_TICK = {}, HERO_SIDE = {}, ABIL_EXTRA = {};

// forms (Kayo & Yara, A4-38) and wave scaling (Jan Pool) are applied on top of the normal stats
const _computeStats0 = computeStats;
computeStats = function (t) {
  const s = _computeStats0(t), F = TOWERS[t.type].forms;
  if (F) { const f = t.form || Object.keys(F)[0]; F[f](s); s.form = f; }
  if (s.waveScale) s.dmg += Math.floor((typeof G !== 'undefined' ? G.wave : 0) * s.waveScale);
  return s;
};
const _setupHazards0 = setupHazards;
setupHazards = function () { _setupHazards0(); G.goons = []; G.orbs = []; G.lastWave = -1; };
// burning: kimchi sets enemies on fire after a hit lands
const _damage0 = damage;
damage = function (e, amt, o = {}) {
  const hit = _damage0(e, amt, o);
  if (hit && o.burn && !e.dead) { e.burn = Math.max(e.burn || 0, o.burn); e.burnT = Math.max(e.burnT || 0, o.burnT || 3); e.burnSrc = o.src; e.burnSpread = e.burnSpread || o.burnSpread; }
  return hit;
};

function roadPlace(x, y) {
  if (!SEGS.some(s => distToSeg(x, y, s) < PATH_W / 2 - 4)) return false;
  if (DOORS.some(d => Math.hypot(d.x - x, d.y - y) < 40)) return false;
  return !G.towers.some(t => Math.hypot(t.x - x, t.y - y) < 18 * (heroSize(t.type, t) + 1));
}
function swapForm(t) {
  const d = TOWERS[t.type];
  if (!d.forms || !d.swap || G.paused) return;
  if (G.t < (t.swapAt || 0)) return;
  const keys = Object.keys(d.forms);
  t.form = keys[(keys.indexOf(t.form || keys[0]) + 1) % keys.length]; t.s = computeStats(t); t.swapAt = G.t + 1.5;
  G.fx.push({kind: 'ring', x: t.x, y: t.y, r: 34, t: 0, life: .35, col: d.color});
  addText(t.x, t.y - 36, t.form === 'kayo' ? 'KAYO!' : 'YARA!', '#fff', 15, 0); sfx('place');
  refreshInfo();
}
TOWERS.kayoyara.swap = true;
// Maat catches leaking enemies (bosses get through)
function angelSave(e, def) {
  if (def.boss) return false;
  const a = G.towers.find(t => t.s.saves && (t.savesLeft || 0) > 0 && t.disabledT <= 0);
  if (!a) return false;
  a.savesLeft--; e.dead = true;
  G.fx.push({kind: 'ring', x: e.x, y: e.y, r: 26, t: 0, life: .5, col: '#bfefff'});
  addText(Math.min(W - 40, e.x - 10), Math.min(H - 20, e.y - 10), 'SAVED', '#bfefff', 15, 0); sfx('clink');
  return true;
}

// ---------- Alexander's henchmen ----------
HERO_TICK.goon = (t, dt, mult) => {
  if (!G.running) return;
  if ((t.cd -= dt * mult) > 0) return;
  t.cd = t.s.rate;
  for (let i = 0; i < t.s.goonN; i++) spawnGoon(t, (Math.random() * PATHS.length) | 0, null, i * 18);
};
function spawnGoon(t, pi, d, back = 0, mult = 1) {
  const L = PATHS[pi].len;
  G.goons.push({src: t, pi, d: Math.min(L - 4, (d === null ? L - 12 : d) + back), hp: t.s.pierce, dmg: t.s.dmg * mult, hit: new Set(), x: 0, y: 0, seed: Math.random() * 9});
}
ABIL_EXTRA.crew = (t, P, L) => { const n = Math.round(12 * L); for (let i = 0; i < n; i++) { const pi = i % PATHS.length; spawnGoon(t, pi, PATHS[pi].len * (.35 + .6 * i / n), 0, P); } addText(W / 2, H / 2, 'HANDLANGERS!', '#fff', 36, -.05); };

// ---------- De Stormmoeder's storm orbs ----------
HERO_TICK.storm = (t, dt, mult) => {
  if ((t.cd -= dt * mult) > 0) return;
  const tg = pickTargets(t, t.s.shots);
  if (!tg.length) { t.cd = .1; return; }
  const sz = heroSize(t.type, t);
  tg.forEach(e => G.orbs.push({src: t, x: t.x, y: t.y - 20 * sz, tgt: e, tx: e.x, ty: e.y, spin: 0}));
  t.ang = Math.atan2(tg[0].y - t.y, tg[0].x - t.x); t.cd = t.s.rate; sfx('zap');
};
function orbBurst(o) {
  const t = o.src, s = t.s;
  explode(o.x, o.y, s.radius, {pierce: s.pierce, dmg: s.dmg, bossMult: s.bossMult, stun: s.stun}, t);
  for (const e of G.enemies) if (!e.dead && Math.hypot(e.x - o.x, e.y - o.y) <= s.radius) {
    if (s.slow) { e.slow = Math.max(e.slow, s.slow); e.slowT = 1.5; }
    if (s.knock && !ENEMIES[e.type].boss && e.pi !== 'air') e.d = Math.max(0, e.d - s.knock);
  }
  if (s.chains) { const first = G.enemies.find(e => !e.dead && Math.hypot(e.x - o.x, e.y - o.y) <= s.radius + 40); if (first) chainBolt(t, first, o.x, o.y); }
  G.fx.push({kind: 'boom', x: o.x, y: o.y, r: s.radius, t: 0, life: .35, col: '#b48cff'}); sfx('boom');
}
ABIL_EXTRA.stormcall = (t, P, L, live) => {
  live().forEach((e, i) => { damage(e, 30 * P, {pierceArmor: true, src: t, type: 'magic'}); e.stun = Math.max(e.stun, (ENEMIES[e.type].boss ? .7 : 2) * L); if (i < 14) G.fx.push({kind: 'bolt', pts: [{x: e.x + 30, y: -10}, {x: e.x - 10, y: e.y * .5}, {x: e.x, y: e.y}], t: 0, life: .3}); });
  G.fx.push({kind: 'flash', t: 0, life: .5, col: 'rgba(120,80,200,.4)'}); G.shake = .7;
};

// ---------- Dean's revolver ----------
HERO_TICK.revolver = (t, dt, mult) => {
  const s = t.s;
  if (t.ammo === undefined || t.ammo > s.ammo) t.ammo = s.ammo;
  if (t.reloadT > 0) { if ((t.reloadT -= dt * mult) <= 0) { t.ammo = s.ammo; sfx('clink'); } return; }
  if ((t.cd -= dt * mult) > 0) return;
  const tg = pickTargets(t, s.shots);
  if (!tg.length) { t.cd = .05; if (t.ammo < s.ammo && !G.enemies.length) { t.reloadT = s.reload; } return; }
  t.ang = Math.atan2(tg[0].y - t.y, tg[0].x - t.x);
  const hx = t.x + Math.cos(t.ang) * 20, hy = t.y + Math.sin(t.ang) * 14 - 2;
  tg.forEach(e => { damage(e, s.dmg, {src: t, stun: s.stun, slow: s.slow, bossMult: s.bossMult}); G.fx.push({kind: 'tracer', x: hx, y: hy, x2: e.x, y2: e.y, t: 0, life: .08, col: PAL.sun}); });
  sfx('snipe'); t.cd = s.rate;
  if (--t.ammo <= 0) { t.reloadT = s.reload; addText(t.x, t.y - 34, 'RELOAD', '#fff', 12, 0); }
};
ABIL_EXTRA.highnoon = (t, P, L, live) => {
  live().sort((a, b) => b.hp - a.hp).slice(0, Math.round(12 * L)).forEach((e, i) => setTimeout(() => { if (G.over || e.dead) return;
    damage(e, t.s.dmg * 10 * P, {pierceArmor: true, src: t, bossMult: t.s.bossMult}); G.fx.push({kind: 'tracer', x: t.x, y: t.y - 10, x2: e.x, y2: e.y, t: 0, life: .15, col: PAL.sun}); sfx('snipe'); }, i * 80));
  addText(W / 2, H / 2, 'HIGH NOON', PAL.sun, 38, -.05);
};

// ---------- Appster's beat drop ----------
HERO_SIDE.appster = (t, dt) => {
  const s = t.s;
  if ((t.beatT = (t.beatT === undefined ? s.beat : t.beatT) - dt) > 0) return;
  t.beatT = s.beat;
  if (!G.running) return;
  for (const o of G.towers) if (o !== t && Math.hypot(o.x - t.x, o.y - t.y) <= s.dropR) o.dropT = s.dropDur;
  for (const e of G.enemies) if (!e.dead && Math.hypot(e.x - t.x, e.y - t.y) <= s.dropR) { damage(e, s.dropDmg, {src: t, type: 'magic'}); if (s.dropStun) e.stun = Math.max(e.stun, ENEMIES[e.type].boss ? s.dropStun * .25 : s.dropStun); }
  G.fx.push({kind: 'ring', x: t.x, y: t.y, r: s.dropR, t: 0, life: .45, col: '#ff7ab6'});
  G.fx.push({kind: 'note', x: t.x, y: t.y - 30, txt: '♫', size: 20, col: '#a65cff', t: 0, life: .8});
};
ABIL_EXTRA.livemix = (t, P, L) => { G.towers.forEach(o => { if (Math.hypot(o.x - t.x, o.y - t.y) <= 220) { o.overT = 8 * L; o.cd = 0; } }); G.fx.push({kind: 'ring', x: t.x, y: t.y, r: 220, t: 0, life: .6, col: '#ff7ab6'}); };

// ---------- other abilities ----------
ABIL_EXTRA.tunnel = (t, P, L, live) => {
  live().filter(e => e.pi !== 'air' && !ENEMIES[e.type].boss).forEach(e => { e.d = Math.max(0, e.d - 250 * L); e.stun = Math.max(e.stun, 1); damage(e, 10 * P, {pierceArmor: true, src: t, type: 'magic'}); G.fx.push({kind: 'smoke', x: e.x, y: e.y, r: 10, t: 0, life: .8}); });
};
ABIL_EXTRA.inperking = (t, P, L, live) => {
  const god = t.form === 'o9';
  live().forEach(e => { e.stun = Math.max(e.stun, (ENEMIES[e.type].boss ? 1 : 3) * L); damage(e, (god ? 60 : 10) * P, {pierceArmor: true, src: t, type: 'magic'}); });
  if (god) { G.fx.push({kind: 'beam', x: t.x, y: -20, x2: t.x, y2: H + 20, w: 60, t: 0, life: .5, col: '#fff3b0'}); addText(W / 2, H / 2, 'GODSTRAAL', '#fff3b0', 40, -.05); }
  G.fx.push({kind: 'flash', t: 0, life: .5, col: god ? 'rgba(255,243,176,.5)' : 'rgba(20,16,24,.35)'});
};
ABIL_EXTRA.feast = (t, P, L, live) => { live().forEach(e => { e.burn = Math.max(e.burn || 0, 10 * P); e.burnT = 6 * L; e.burnSrc = t; }); addText(W / 2, H / 2, 'KIMCHI FEAST!', '#e8334a', 36, -.05); };
ABIL_EXTRA.heaven = (t, P, L, live) => {
  const n = Math.round(25 * P); G.lives += n; addText(W / 2, 60, `+${n} LIVES`, '#7be36b', 28, 0);
  live().forEach(e => damage(e, 25 * P, {pierceArmor: true, src: t, type: 'magic'}));
  G.fx.push({kind: 'flash', t: 0, life: .6, col: 'rgba(255,248,214,.55)'}); updateHud();
};
ABIL_EXTRA.pi = (t, P, L, live) => { const n = 3.14 * Math.max(1, G.wave) * P; live().forEach(e => damage(e, n, {pierceArmor: true, src: t, type: 'magic'})); addText(W / 2, H / 2, `π × ${Math.max(1, G.wave)} = ${Math.round(n)}`, '#b8d8a0', 34, -.05); };

// ---------- runs every frame ----------
function extrasUpdate(dt) {
  G.goons = G.goons || []; G.orbs = G.orbs || [];
  // things that happen once per wave: Maat's catches and lives, Jan Pool's wave bonus
  if (G.lastWave !== G.wave) {
    const first = G.lastWave === undefined || G.lastWave < 0;
    G.lastWave = G.wave;
    for (const t of G.towers) {
      if (t.s.saves) { t.savesLeft = t.s.saves; if (t.s.regen && !first && !G.over) { G.lives += t.s.regen; addText(t.x, t.y - 40, `+${t.s.regen} ❤`, '#7be36b', 14, 0); } }
      if (t.s.waveScale) t.s = computeStats(t);
    }
  }
  for (const t of G.towers) {
    if (t.dropT > 0) t.dropT -= dt;
    if (t.s.saves && t.savesLeft === undefined) t.savesLeft = t.s.saves;
    // A4-38 breaks out of containment
    if (t.type === 'a438' && t.form !== 'o9' && t.pops >= t.s.breakAt) {
      t.form = 'o9'; t.s = computeStats(t);
      G.fx.push({kind: 'boom', x: t.x, y: t.y, r: 120, t: 0, life: .8, col: '#fff3b0'}); G.fx.push({kind: 'flash', t: 0, life: .5, col: 'rgba(255,243,176,.45)'});
      addText(t.x, t.y - 60, 'Ø9-38 AWAKENS', '#fff3b0', 20, 0); G.shake = .6; sfx('ability');
      if (G.sel === t) refreshInfo();
    }
  }
  // henchmen walk backwards up the road
  for (const g of G.goons) {
    if (!G.towers.includes(g.src)) { g.dead = true; continue; }
    const s = g.src.s;
    g.d -= s.goonSpd * dt;
    const p = posAt(g.d, g.pi); g.x = p.x; g.y = p.y; g.ang = p.ang;
    for (const e of G.enemies) {
      if (e.dead || e.pi === 'air' || g.hit.has(e.id) || (ENEMIES[e.type].camo && !s.camo)) continue;
      if (Math.hypot(e.x - g.x, e.y - g.y) < ENEMIES[e.type].r + 10) {
        g.hit.add(e.id); damage(e, g.dmg, {src: g.src, stun: s.stun, slow: s.slow, bossMult: s.bossMult});
        G.fx.push({kind: 'text', x: g.x, y: g.y - 14, txt: ['POW', 'BAM', 'WHACK'][(Math.random() * 3) | 0], col: '#fff', size: 11, rot: 0, t: 0, life: .4});
        if (--g.hp <= 0) break;
      }
    }
    if (g.hp <= 0 || g.d <= 0) { g.dead = true; G.fx.push({kind: 'smoke', x: g.x, y: g.y, r: 10, t: 0, life: .6}); }
  }
  G.goons = G.goons.filter(g => !g.dead);
  // storm orbs drift towards their target
  for (const o of G.orbs) {
    if (o.tgt && !o.tgt.dead) { o.tx = o.tgt.x; o.ty = o.tgt.y; }
    const dx = o.tx - o.x, dy = o.ty - o.y, d = Math.hypot(dx, dy), step = 300 * dt;
    o.spin += dt * 6;
    if (d <= step + 6) { o.x = o.tx; o.y = o.ty; o.dead = true; if (G.towers.includes(o.src)) orbBurst(o); }
    else { o.x += dx / d * step; o.y += dy / d * step; }
  }
  G.orbs = G.orbs.filter(o => !o.dead);
  // burning enemies
  for (const e of G.enemies) {
    if (!(e.burnT > 0)) continue;
    if (e.dead) {
      if (e.burnSpread && !e.spreadDone) { e.spreadDone = true; for (const o of G.enemies) if (!o.dead && o !== e && Math.hypot(o.x - e.x, o.y - e.y) < 55) { o.burn = Math.max(o.burn || 0, e.burn); o.burnT = 3; o.burnSrc = e.burnSrc; } }
      continue;
    }
    e.burnT -= dt; e.burnAcc = (e.burnAcc || 0) + e.burn * dt;
    if (e.burnAcc >= 1) { const n = Math.floor(e.burnAcc); e.burnAcc -= n; damage(e, n, {pierceArmor: true, type: 'magic', src: G.towers.includes(e.burnSrc) ? e.burnSrc : null}); }
    if (e.burnT <= 0) e.burn = 0;
  }
}
