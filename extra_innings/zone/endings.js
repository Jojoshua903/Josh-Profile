/* =========================================================
   ENDINGS & SECRET ROUTES
   · five endings, tracked across saves in localStorage ('ei_endings')
     and shown as trophies on the main menu
   · the Renas Shortcut (a ceiling vent in the Turbine Hall → the Gale Gardens)
   · the Shadow Bypass (Reshman's one-way portals, Deep Quarry ⇄ Glacier Crown)
   · Coach Monfort's hidden Scoreboard on the Clipboard
   Loaded on every game page after polish.js; each part checks which page it's on.
   ========================================================= */
const ENDINGS = [
  { id: 'standard', name: 'Game, Set, Match' },
  { id: 'ego',      name: 'New Management' },
  { id: 'joke',     name: 'Works On My Machine' },
  { id: 'chill',    name: 'Eternal Chill' },
  { id: 'true',     name: 'Extra Innings' },
];
const ENDING_OF = { A: 'standard', B: 'true', EGO: 'ego', JOKE: 'joke', CHILL: 'chill' };
const readLS = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { logErr("zone/endings.js:18", e); return d; } };
const writeLS = (k, v) => { if (window.DEV_LOCK) return; try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { logErr("zone/endings.js:19", e); } };
const endingsFound = () => readLS('ei_endings', []);
function unlockEnding(id) {
  const D = Save.data, L = endingsFound();
  if (!L.includes(id)) { L.push(id); writeLS('ei_endings', L); }
  (D.q.endings = D.q.endings || {})[id] = 1;
  // the Scoreboard: clear time, plus the two challenge marks (they stick once earned)
  const R = readLS('ei_records', {}), t = D.time || 0;
  if (!R.best || t < R.best) R.best = t;
  if (t < 45 * 60) R.under45 = true;
  if (!(D.batLv > 0)) R.lowPct = true;
  writeLS('ei_records', R);
  D.q.cleared = D.q.cleared || t;
  saveGame();
}
const fmtTime = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
function completionPct() {
  const D = Save.data, q = D.q || {}, f = v => (v ? 1 : 0);
  const parts = [
    [8, (f(D.bossDead) + f(D.adamDead) + f(D.danielDead) + f(D.fionnDead) + f(D.miloDead) + f(D.denizDead) + f(D.evilAdamDead) + f(D.zennithDead)) / 8],
    [3, (f(D.josh) + f(D.lars) + f(D.chase)) / 3],
    [1, f(D.spareBat)],
    [5, Math.min(1, Object.keys(D.pebbles || {}).length / PEBBLE_TOTAL)],
    [2, Math.min(1, Object.keys(D.maps || {}).length / 9)],
    [2, (f(q.rivalry === 'josh' || q.rivalry === 'renas') + f(q.deniz === 'done')) / 2],
    [2, f(Object.keys(q.endings || {}).length > 0)],   // one save can only reach one ending, so any ending counts in full
  ];
  const w = parts.reduce((a, p) => a + p[0], 0);
  return Math.round(parts.reduce((a, p) => a + p[0] * p[1], 0) / w * 100);
}

/* ---------- the Scoreboard, hidden on the Clipboard until your first ending ---------- */
const _enEntries = Quests.entries;
Quests.entries = function () {
  const L = _enEntries.call(this), D = Save.data, q = D.q;
  if (!endingsFound().length && !q.cleared) return L;
  const R = readLS('ei_records', {}), got = endingsFound();
  L.push({ title: 'Scoreboard', who: 'Coach Monfort', done: !!(R.under45 && R.lowPct), reward: 'Gold stars by your trophies on the main menu',
    steps: [
      { txt: `Completion: ${completionPct()}%`, ok: completionPct() >= 100 },
      { txt: `This run: ${fmtTime(D.time || 0)}${q.cleared ? ` · cleared at ${fmtTime(q.cleared)}` : ''}${R.best ? ` · best clear ${fmtTime(R.best)}` : ''}`, ok: !!q.cleared },
      { txt: 'Speedrun: reach any ending in under 45:00', ok: !!R.under45 },
      { txt: 'Low-%: reach any ending without buying a single bat upgrade from Lars', ok: !!R.lowPct },
      { txt: `Endings found: ${got.length}/${ENDINGS.length} · ${ENDINGS.map(e => got.includes(e.id) ? e.name : '???').join(' · ')}`, ok: got.length >= ENDINGS.length },
    ] });
  return L;
};

/* ---------- a two-or-three-way choice inside a cutscene ---------- */
Story.choose = function (title, opts) {
  const was = this.skipping; this.skipping = false;   // a choice is never skipped, even in a scene you've seen
  return new Promise(r => { this.choice = { title, opts, sel: 0, age: 0, r: i => { this.skipping = was; r(i); } }; });
};
const _enUpdate = Story.update;
Story.update = function (dt) {
  const c = this.choice;
  if (c) {
    c.age += dt;
    const n = c.opts.length;
    if (Input.pressed('left') || Input.pressed('up')) { c.sel = (c.sel + n - 1) % n; SFX.ui(); }
    if (Input.pressed('right') || Input.pressed('down')) { c.sel = (c.sel + 1) % n; SFX.ui(); }
    if (c.age > 0.4 && (Input.pressed('jump') || Input.pressed('attack') || this.advancePressed)) { this.choice = null; SFX.blip(); c.r(c.sel); }
    this.advancePressed = false;
  }
  return _enUpdate.call(this, dt);
};
const _enDrawScreen = Story.drawScreen;
Story.drawScreen = function () {
  _enDrawScreen.call(this);
  const c = this.choice; if (!c) return;
  const k = Math.min(1, c.age / 0.25), y = VH * 0.62, bw = 260, gap = 24, tw = c.opts.length * bw + (c.opts.length - 1) * gap;
  ctx.save(); ctx.globalAlpha = k;
  ctx.fillStyle = 'rgba(8,5,12,.72)'; ctx.fillRect(0, y - 70, VW, 170);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `22px ${DISPLAY_FONT}`; ctx.fillStyle = GOLD; ctx.fillText(c.title, VW / 2, y - 36);
  c.opts.forEach((o, i) => {
    const x = VW / 2 - tw / 2 + i * (bw + gap), on = i === c.sel, lift = on ? Math.sin(Game.time * 6) * 2 : 0;
    rr(x, y - 4 + lift, bw, 52, 8); inked(on ? FLAME : '#2a2230', 3);
    ctx.font = `17px ${DISPLAY_FONT}`; ctx.fillStyle = on ? INK : BONE; ctx.fillText((on ? '▶ ' : '') + o, x + bw / 2, y + 22 + lift);
  });
  ctx.font = `12px ${DISPLAY_FONT}`; ctx.fillStyle = 'rgba(243,234,216,.6)';
  ctx.fillText(`◀ ▶ CHOOSE · ${Bindings.label('jump', Game.lastInput)} CONFIRM`, VW / 2, y + 78);
  ctx.restore();
};

/* ---------- small "press up" posts: vents and portals ---------- */
class EPost {
  constructor(x, y, label, act, look) { Object.assign(this, { kind: 'epost', x, y, label, act, look, t: rand(0, 6), near: false, gone: false, prompt: label }); }
  update(dt) {
    this.t += dt; const c = Player.center();
    this.near = Math.abs(c.x - this.x) < 44 && Math.abs(Player.y + Player.h - this.y) < 30;
  }
  interact() { this.act(); }
  draw() {
    const t = this.t, x = this.x, y = this.y;
    ctx.save(); ctx.lineJoin = 'round';
    if (this.look === 'portal') {
      // a Shadow Portal: an inky oval with violet sparks swirling inward
      const g = ctx.createRadialGradient(x, y - 40, 4, x, y - 40, 46); g.addColorStop(0, '#000'); g.addColorStop(0.7, 'rgba(40,10,60,.95)'); g.addColorStop(1, 'rgba(122,31,110,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y - 40, 30 + Math.sin(t * 3) * 2, 42, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = '#d9b8ff'; ctx.lineWidth = 2; ctx.globalAlpha = 0.6 + Math.sin(t * 5) * 0.2;
      ctx.beginPath(); ctx.ellipse(x, y - 40, 30, 42, 0, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
      for (let k = 0; k < 6; k++) { const a = t * 2 + k, r = 34 - ((t * 20 + k * 6) % 30); ctx.fillStyle = '#d9b8ff'; ctx.fillRect(x + Math.cos(a) * r - 1, y - 40 + Math.sin(a) * r * 1.3 - 1, 3, 3); }
      // his eyes, peeking out of the dark
      if (Math.sin(t * 0.9) > 0.3) { ctx.fillStyle = '#f3ead8'; ctx.shadowColor = '#f3ead8'; ctx.shadowBlur = 10; for (const ox of [-5, 5]) { ctx.beginPath(); ctx.ellipse(x + ox, y - 46, 2.4, 3.6, 0, 0, 7); ctx.fill(); } ctx.shadowBlur = 0; }
    } else {
      // a maintenance vent grate in the wall
      rr(x - 26, y - 52, 52, 40, 4); inked('#2a2f38', 3);
      ctx.fillStyle = 'rgba(160,200,230,.35)'; for (let k = 0; k < 4; k++) ctx.fillRect(x - 20, y - 46 + k * 9, 40, 3);
      for (let k = 0; k < 5; k++) { const p = (t * 0.8 + k / 5) % 1; ctx.fillStyle = `rgba(220,235,245,${0.5 * (1 - p)})`; ctx.fillRect(x - 18 + k * 9, y - 52 - p * 30, 2, 6); }
    }
    ctx.restore();
    if (this.near) {
      ctx.font = `14px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = GOLD;
      ctx.fillText('▲ ' + Bindings.label('up', Game.lastInput) + ' · ' + this.prompt, x, y - 96 + Math.sin(Game.time * 4) * 2);
    }
  }
}
const travel = url => { if (Story.active || Game.fadeTarget === 1) return; SFX.poof(); SFX.gate(); goToPage(url); };
const resheyMet = () => Object.keys(Save.data.reshmanMet || {}).filter(z => z !== 'hub').length;

/* ---------- Reshman at Base Camp: the Shadow Bypass ---------- */
class ShadowReshman extends ReshmanVendor {
  constructor(x, y) { super(x, y, 'hub'); this.vendor = null; this.met = true; }
  interact() {
    if (Story.active) return;
    const D = Save.data, n = this, h = () => n.head(), v = { voice: 1.9, color: '#9be36a' };
    n.startled = 0.4;
    const S = Story;
    S.run(async () => {
      Player.facing = sgn(n.x - Player.x) || 1; S.twoShot(Player, n, 1.3);
      await S.say('RESHMAN', '…blorp. You found me. Four times. Nobody finds me four times.', h, v);
      await S.say('NATHAN', 'You hide in the same kind of corner every time, buddy.', () => S.nathanHead());
      n.startled = 0.6; SFX.staticBuzz(0.4);
      await S.say('RESHMAN', 'Rude. …But fine. I have tunnels. Dark ones. Behind the Spark Falls in the Deep Quarry, and on the Frozen Steps up top.', h, v);
      await S.say('RESHMAN', 'Step in one, come out the other. One way each. Don\'t tell the dwarf. …blorp.', h, v);
      D.q.shadow = 1; saveGame();
    }).then(() => {
      n.gone = true; SFX.poof();
      showCard('SECRET ROUTE', 'THE SHADOW BYPASS', 'Reshman opened his Shadow Portals: one behind the Spark Falls in the Deep Quarry, one on the Frozen Steps of the Glacier Crown. Each one warps you straight to the other, skipping the Grand Concourse.',
        ['Zone 2 ⇄ Zone 8', `<kbd>${Bindings.label('up')}</kbd> at a portal`]);
    });
  }
  draw() {
    const nr = this.near; this.near = false; super.draw(); this.near = nr;   // skip the base class's "MAPS" prompt
    if (this.near) { ctx.font = `14px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = GOLD; ctx.fillText('▲ ' + Bindings.label('up', Game.lastInput) + ' · …BLORP?', this.x, this.y - 54 + Math.sin(Game.time * 4) * 2); }
  }
}

/* ---------- the Glitch Core, left in the Rogue Server's arena ---------- */
class GlitchCore {
  constructor(x, y) { Object.assign(this, { kind: 'glitch', x, y, t: 0, near: false, gone: false }); }
  update(dt) {
    this.t += dt; if (this.gone) return;
    const c = Player.center();
    if (Math.abs(c.x - this.x) < 26 && Math.abs(c.y - (this.y - 20)) < 34) {
      this.gone = true; Save.data.q.glitch = 1; saveGame();
      SFX.staticBuzz(0.5); SFX.crystal(); burst(this.x, this.y - 20, 18, { colors: ['#50dc78', '#1ad8ff', '#ff2a8a'], maxSpeed: 320 });
      showCard('SECRET ITEM', 'GLITCH CORE', 'A cube of corrupted code, still warm from the Rogue Server. It flickers between three colours and none of them are real. Josh would know what to do with this. Probably something irresponsible.', ['Josh\'s Workbench']);
    }
  }
  draw() {
    if (this.gone) return;
    const t = this.t, x = this.x, y = this.y - 22 + Math.sin(t * 2.4) * 4, j = Math.sin(t * 37) > 0.8 ? rand(-3, 3) : 0;
    ctx.save(); ctx.translate(x + j, y); ctx.rotate(t * 0.8);
    ['#ff2a8a', '#1ad8ff', '#50dc78'].forEach((c, k) => { ctx.globalAlpha = 0.75; ctx.fillStyle = c; ctx.fillRect(-8 + (k - 1) * 2, -8 + (k - 1) * -1, 16, 16); });
    ctx.globalAlpha = 1; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(-8, -8, 16, 16);
    ctx.restore();
  }
}

/* ---------- Josh's Workbench: the Reality Patch ---------- */
if (typeof VENDORS !== 'undefined' && VENDORS.josh) {
  const _enJoshItems = VENDORS.josh.items;
  VENDORS.josh.items = () => {
    const D = Save.data, q = D.q, list = vitems({ items: _enJoshItems }).slice();
    if (q.glitch) list.push({
      id: 'reality_patch', name: 'Reality Patch', cost: 0, tag: 'SECRET',
      desc: q.patch ? 'Installed. Next time you face Evil Adam, Josh can "fix" him remotely. You\'ll get the choice.' : 'Josh plugs the Glitch Core into his laptop and writes a patch for the Spire itself. Probably fine.',
      line: '"Deploying to prod on a Friday. What could go wrong."',
      owned: D => !!D.q.patch,
      locked: D => D.q.rivalry !== 'josh' ? '"A Glitch Core? Cool. I\'d need serious power to run it, though. Like five overcharged capacitors. Which SOMEONE gave to my sister."' : '',
      grant: D => { D.q.patch = 1; },
      after: () => showCard('SECRET UPGRADE', 'REALITY PATCH', 'Josh hacked the Spire\'s reality engine from his laptop. When you walk onto the Grand Championship Court, you can let him take it from there.', ['Zone 9 · the Championship Court']) });
    return list;
  };
}

/* ---------- Deniz's tea: three cups fill the thermos ---------- */
if (Story.denizTea) {
  const _enTea = Story.denizTea;
  Story.denizTea = function (n) {
    return _enTea.call(this, n).then(() => {
      const q = Save.data.q; if (q.deniz !== 'done' || q.thermos) return;
      q.cups = (q.cups || 0) + 1; saveGame();
      if (q.cups < 3) toast(`CUP ${q.cups}/3 · "ONE MORE, BRO. THE GOOD STUFF SETTLES ON THE THIRD."`);
      else toast('DENIZ FILLS A THERMOS · HEAD STRAIGHT FOR THE CHAMPIONSHIP COURT BEFORE IT COOLS');
    });
  };
}

/* ---------- placing the new things in rooms ---------- */
const _enEnterRoom = enterRoom;
enterRoom = function (r) { _enEnterRoom.apply(this, arguments); enPlace(r); };
function enPlace(r) {
  const D = Save.data, q = D.q, id = r && r.id;
  // Zone 1 page
  if (typeof Z !== 'undefined' && Z.workbench) {
    if (id === 'hub' && !q.shadow && resheyMet() >= 4) NPCs.push(new ShadowReshman(131 * TILE, 65 * TILE));   // in the dark nook under the camp's floor grate
    if (id === 'server' && D.bossDead && !q.glitch) NPCs.push(new GlitchCore(184 * TILE, 41 * TILE));
  }
  // Act I page: the Turbine Hall vent pocket, and the Quarry's Shadow Portal
  if (typeof ROOM !== 'undefined' && ROOM.v_turbine) {
    if (id === 'q_falls' && q.shadow) NPCs.push(new EPost(224 * TILE, 65 * TILE, 'SHADOW PORTAL · GLACIER CROWN', () => travel('act2.html#shadow-z8'), 'portal'));
  }
  // Act II page: the way back out of the vent, and the Glacier's Shadow Portal
  if (typeof ROOM !== 'undefined' && ROOM.s_gusts) {
    if (id === 's_gusts' && q.vent) NPCs.push(new EPost(123 * TILE, 21 * TILE, 'VENT · BACK TO THE SHAFTS', () => travel('act1.html#from-vent')));
    if (id === 'i_steps' && q.shadow) NPCs.push(new EPost(266 * TILE, 87 * TILE, 'SHADOW PORTAL · DEEP QUARRY', () => travel('act1.html#shadow-z2'), 'portal'));
  }
};

/* ---------- the Renas Shortcut: squeeze into the Turbine Hall's ceiling vent ---------- */
const _enTick = PAGE.tick;
PAGE.tick = function (dt) {
  if (_enTick) _enTick.apply(this, arguments);
  const P = Player, D = Save.data;
  if (typeof ROOM !== 'undefined' && ROOM.v_turbine && Zone.room && Zone.room.id === 'v_turbine' && !P.dead && !Story.active) {
    const cx = P.x + P.w / 2;
    if (P.y < 3.4 * TILE && cx > 652 * TILE && cx < 656 * TILE && Game.fadeTarget !== 1) {
      if (!D.q.vent) { D.q.vent = 1; toast('SECRET ROUTE · THE RENAS SHORTCUT'); }
      travel('act2.html#from-vent');
    }
  }
};
// the vent's grille and a faint draught, so sharp eyes can spot it
const _enDrawP = drawParticles;
drawParticles = function () {
  _enDrawP();
  if (typeof ROOM !== 'undefined' && ROOM.v_turbine && Zone.room && Zone.room.id === 'v_turbine') {
    const x = 652 * TILE, y = 1 * TILE, t = Game.time;
    ctx.fillStyle = 'rgba(10,12,18,.85)'; ctx.fillRect(x, y, 4 * TILE, 3 * TILE);
    ctx.strokeStyle = 'rgba(160,200,230,.5)'; ctx.lineWidth = 2;
    for (let k = 1; k < 8; k++) { ctx.beginPath(); ctx.moveTo(x + k * 16, y); ctx.lineTo(x + k * 16, y + 3 * TILE); ctx.stroke(); }
    for (let k = 0; k < 6; k++) { const p = (t * 0.5 + k / 6) % 1; ctx.fillStyle = `rgba(220,235,245,${0.35 * (1 - p)})`; ctx.fillRect(x + 10 + k * 20, y + 3 * TILE + p * 120, 2, 8); }
  }
  if (END.draw) END.draw();
};

/* =========================================================
   ACT III · the three new endings
   ========================================================= */
const END = { draw: null };
if (typeof Act3 !== 'undefined') {
  // arriving at the Stadium with three fresh cups: the thermos comes along. Otherwise it's gone cold.
  (function () {
    const q = Save.data.q;
    if (q.deniz === 'done' && (q.cups || 0) >= 3 && !q.thermos) { q.thermos = 1; setTimeout(() => toast('DENIZ\'S THERMOS IS STILL WARM'), 1800); }
    q.cups = 0; saveGame();
  })();

  // pick the ending's road as you walk onto the court
  const _enIntro = Story.evilIntro;
  Story.evilIntro = function (b) {
    const D = Save.data, q = D.q, arms = [];
    if (q.patch) arms.push(['Let Josh run the patch', 'joke']);
    if (q.thermos) arms.push(['Offer him some tea', 'chill']);
    if (!arms.length || D.evilAdamDead) return _enIntro.call(this, b);
    let pick = 'fight';
    const S = this;
    return this.run(async () => {
      const P = Player, h = () => ({ x: b.x + b.w / 2, y: b.y - 16 }), v = { voice: 0.62, color: '#e6d6ff' };
      setLock(A.courtLock, true); SFX.gate(); S.zoomTo(1.18);
      S.camTarget = { x: (P.x + b.x) / 2 + 40, y: b.y - 40 }; P.facing = 1; b.facing = -1;
      await S.wait(0.7);
      await S.say('EVIL ADAM', 'Always swinging for the fences, Nathan. Always playing the hero.', h, v);
      const i = await S.choose('MATCH POINT', [...arms.map(a => a[0]), 'Swing for the fences']);
      pick = i < arms.length ? arms[i][1] : 'fight';
      if (pick === 'joke') await S.jokeEnding(b);
      else if (pick === 'chill') await S.chillEnding(b);
    }).then(() => {
      if (pick === 'fight') return _enIntro.call(S, b);   // the normal intro and fight, straight after the choice
      endCard(pick.toUpperCase());
    });
  };

  // the court floor's deleted patch and the 404 box, drawn in world space
  END.draw = () => {
    const S = END.joke; if (!S) return;
    const t = Game.time;
    if (S.void > 0) {
      const w = S.void * 7 * TILE, x = S.x - w / 2, y = A.courtFloor;
      ctx.fillStyle = '#000'; ctx.fillRect(x, y, w, 4 * TILE);
      ctx.fillStyle = 'rgba(80,220,120,.6)';
      for (let k = 0; k < 14; k++) ctx.fillRect(x + ((k * 53 + t * 140) % Math.max(1, w)), y + (k * 17) % (4 * TILE), 10 + (k % 3) * 6, 2);
    }
    if (S.fall) { S.fall.vy += 1400 / 60; S.fall.y += S.fall.vy / 60; S.fall.r += 0.08; if (S.fall.y < A.courtFloor + 900) { ctx.save(); ctx.translate(S.fall.x, S.fall.y); ctx.rotate(S.fall.r); drawCastMember('evil', 0, 0, -1, t, { pose: 'idle' }); ctx.restore(); } }
    if (S.box > 0) {
      // a big green wireframe cube, slowly turning, with the error message
      const cx = S.x, cy = A.courtFloor - 200, s = 90 * S.box, a = t * 0.7;
      const P = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]].map(([x, y, z]) => {
        const X = x * Math.cos(a) - z * Math.sin(a), Z2 = x * Math.sin(a) + z * Math.cos(a), Y = y * Math.cos(0.45) - Z2 * Math.sin(0.45);
        return [cx + X * s, cy + Y * s];
      });
      ctx.save(); ctx.strokeStyle = '#50dc78'; ctx.lineWidth = 3; ctx.shadowColor = '#50dc78'; ctx.shadowBlur = 14;
      for (const [i, j] of [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]) { ctx.beginPath(); ctx.moveTo(P[i][0], P[i][1]); ctx.lineTo(P[j][0], P[j][1]); ctx.stroke(); }
      ctx.shadowBlur = 0; ctx.font = `${Math.round(26 * S.box)}px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = '#50dc78';
      ctx.fillText('404: BOSS_NOT_FOUND', cx + (Math.sin(t * 31) > 0.85 ? rand(-4, 4) : 0), cy + s + 46);
      ctx.restore();
    }
  };
  const fallInCrew = async function (portal) {
    const josh = new Actor('josh', portal.x, A.courtFloor, { facing: 1 });
    NPCs.push(josh); josh.walkTo = portal.x + 80; await this.wait(0.6);
    return josh;
  };
  const markWin = b => {
    const D = Save.data;
    BossBar.hide(); Zone.boss = null; b.gone = true; setLock(A.courtLock, false);
    D.evilAdamDead = true; D.where = 'z9'; saveGame(); themeCheck(800);
  };

  Object.assign(Story, {
    /* ---------- Ending 3 · "Works On My Machine" ---------- */
    async jokeEnding(b) {
      const P = Player, D = Save.data, nh = () => this.nathanHead(), h = () => ({ x: b.x + b.w / 2, y: b.y - 16 }), v = { voice: 0.62, color: '#e6d6ff' };
      await this.say('EVIL ADAM', 'You know what happens when the MVP misses? Everyone l—', h, v);
      SFX.staticBuzz(0.8); Game.flashWhite = 0.2; this.punch(0.05, 6);
      END.joke = { x: b.x + b.w / 2, void: 0, box: 0, fall: null };
      for (let k = 0; k < 3; k++) { b.x += rand(-10, 10); SFX.staticBuzz(0.15); await this.wait(0.18); }
      await this.say('EVIL ADAM', '…Why is my racket buffering?', h, v);
      // the floor under him simply stops existing
      SFX.bigCrack(); await this.tween(END.joke, 'void', 1, 0.45);
      END.joke.fall = { x: b.x + b.w / 2, y: A.courtFloor, vy: -200, r: 0 }; b.gone = true;
      await this.say('EVIL ADAM', 'NOT LIKE THIIIIIS—', () => ({ x: END.joke.fall.x, y: Math.min(END.joke.fall.y, A.courtFloor + 60) - 70 }), v);
      SFX.crystal(); this.camTarget = { x: END.joke.x, y: A.courtFloor - 160 }; this.zoomTo(1.0);
      await this.tween(END.joke, 'box', 1, 0.8);
      await this.wait(0.6);
      this.camTarget = { x: P.x + 60, y: P.y - 20 }; this.zoomTo(1.35);
      await this.say('NATHAN', '…Did the floor just delete itself?', nh);
      markWin(b); END.joke.fall = null;
      const portal = { x: ROOM.t_court.px.x + 5 * TILE, y: A.courtFloor - 50, open: 0 }; Act3.portal = portal;
      SFX.summon(); await this.tween(portal, 'open', 1, 0.5);
      const josh = await fallInCrew.call(this, portal);
      this.twoShot(P, josh, 1.3);
      await this.say('JOSH', '*sip* Hotfix deployed. Boss removed. Floor… also removed. Known issue.', () => josh.head(), { voice: 1.3 });
      await this.say('NATHAN', 'Josh. I trained for this. There was going to be a whole fight.', nh);
      await this.say('JOSH', 'Works on my machine.', () => josh.head(), { voice: 1.3 });
      await this.say('JOSH', 'Everyone\'s already home. I teleported them during the loading screen. Come on.', () => josh.head(), { voice: 1.3 });
      Scene.white = 0; await this.tween(Scene, 'white', 1, 0.7);
      josh.gone = true; Act3.portal = null; END.joke = null;
      Object.assign(Scene, { on: 'hood', mode: 'JOKE', t: 0, lie: 0, lookBat: 0, smirk: 0, ballT: -1 }); SFX.music('victory');
      await this.tween(Scene, 'white', 0, 1.2);
      await this.title('WORKS ON MY MACHINE', 'THE NEIGHBORHOOD FIELD · SUSPICIOUSLY EARLY', 2.8);
      if (D.adamDead) await this.say('ADAM', 'I remember falling into a void. And a giant green box. Was that… a dream?', () => fieldHead('adam'), { voice: 1.05 });
      await this.say('JOSH', 'Sure. A dream. Let\'s go with that.', () => fieldHead('josh'), { voice: 1.3 });
      await this.say('NATHAN', '(Somewhere, a server is still running the Spire. I\'m not going to ask.)', () => fieldHead('nathan'), { color: '#e6d6ff' });
      await this.credits();
      D.q.endJoke = 1; saveGame();
    },

    /* ---------- Ending 4 · "Eternal Chill" ---------- */
    async chillEnding(b) {
      const P = Player, D = Save.data, nh = () => this.nathanHead(), h = () => ({ x: b.x + b.w / 2, y: b.y - 16 }), v = { voice: 0.62, color: '#e6d6ff' };
      this.camTarget = { x: P.x + 50, y: P.y - 20 }; this.zoomTo(1.4);
      await this.say('NATHAN', 'Hang on. Before we do this…', nh);
      // the thermos
      SFX.toss(); pop(P.x + P.w / 2, P.y - 30, 'THERMOS OF ULTIMATE CHILL', { size: 28, color: '#9fe6ff', burstColor: '#2a4a66' });
      const steam = n => { for (let k = 0; k < n; k++) spawnParticle({ x: P.x + P.w / 2 + P.facing * 16 + rand(-6, 6), y: P.y + 4, vx: rand(-10, 10), vy: rand(-50, -25), life: rand(1.2, 1.8), size: rand(6, 11), color: 'rgba(243,234,216,.35)', type: 'puff', drag: 1 }); };
      steam(10);
      await this.say('NATHAN', 'You want some tea? Deniz made it. Mint and chamomile.', nh);
      this.camTarget = { x: b.x + b.w / 2, y: b.y - 30 }; this.zoomTo(1.3);
      await this.say('EVIL ADAM', '…Tea. You walked up the entire Spire to offer me TEA.', h, v);
      // the calm rolls across the court in soft blue rings
      this.camTarget = { x: (P.x + b.x) / 2 + 40, y: b.y - 40 }; this.zoomTo(1.1);
      for (let k = 0; k < 5; k++) { ring(P.x + P.w / 2, P.y + P.h / 2, 10, 240 + k * 120, 1.0 + k * 0.2, '#9fe6ff', 5); SFX.heal(); steam(6); await this.wait(0.35); }
      // and the Cursed Trophies can't stand good vibes
      for (const [k, tr] of (Act3.trophies || []).entries()) {
        SFX.crystal(); SFX.hit(true); burst(tr.x, tr.y, 26, { colors: ['#9fe6ff', GOLD, BONE], maxSpeed: 520, grav: 900, type: 'debris' });
        this.impact(tr.x, tr.y, '#9fe6ff'); await this.wait(0.22 + k * 0.04);
      }
      if (typeof shockwave === 'function') shockwave(b.x + b.w / 2, b.y + b.h / 2);
      b.racketGone = true; b.normal = true; SFX.poof(); Game.flashWhite = 0.4;
      for (let k = 0; k < 24; k++) spawnParticle({ x: b.x + rand(0, b.w), y: b.y + rand(0, b.h), vx: rand(-60, 60), vy: rand(-200, -60), life: rand(0.8, 1.5), size: rand(4, 9), color: k % 3 ? 'rgba(122,31,110,.6)' : 'rgba(159,230,255,.6)', type: 'puff', drag: 1 });
      markWin(b);
      const adam = new Actor('adam', b.x + b.w / 2, A.courtFloor, { facing: -1, o: { pose: 'kneel' } }); NPCs.push(adam);
      await this.wait(0.8);
      await this.say('ADAM', '…I took off the cape. Why was I wearing a cape. It\'s so warm in here.', () => adam.head(), { voice: 1.05 });
      const deniz = new Actor('deniz', ROOM.t_court.px.x + 4 * TILE, A.courtFloor, { facing: 1, speed: 110 }); NPCs.push(deniz);
      deniz.walkTo = P.x - 40; this.twoShot(deniz, adam, 1.0);
      await this.say('DENIZ', 'Duuude. You actually brought it. Respect.', () => deniz.head(), { voice: 0.7 });
      adam.o.pose = 'idle'; deniz.o.sit = true;
      await this.say('DENIZ', 'Sit, sit. Everybody sit. Who\'s hungry? I brought skewers.', () => deniz.head(), { voice: 0.7 });
      Scene.white = 0; await this.tween(Scene, 'white', 1, 0.9);
      adam.gone = true; deniz.gone = true;
      Object.assign(Scene, { on: 'hood', mode: 'CHILL', t: 0, lie: 0, lookBat: 0, smirk: 0, ballT: -1 }); SFX.music('reggae');
      await this.tween(Scene, 'white', 0, 1.4);
      await this.title('ETERNAL CHILL', 'THE ROOF OF THE SPIRE · GOLDEN HOUR', 2.8);
      await this.say('DENIZ', 'Peace, love, and medium-rare. That\'s the whole philosophy, man.', () => fieldHead('deniz'), { voice: 0.7 });
      await this.say('ADAM', 'Rematch tomorrow? …No rush. Whenever.', () => fieldHead('adam'), { voice: 1.05 });
      await this.say('NATHAN', '(Best game I never played.)', () => fieldHead('nathan'), { color: '#e6f6ff' });
      await this.credits();
      D.q.thermos = 0; D.q.endChill = 1; saveGame();
    },

    /* ---------- Ending 2 · "New Management" ---------- */
    async egoEnding(b) {
      const P = Player, D = Save.data, nh = () => this.nathanHead();
      const adam = new Actor('adam', b.x + b.w / 2, A.courtFloor, { facing: -1, o: { pose: 'kneel' } }); b.gone = true; NPCs.push(adam);
      this.camTarget = { x: P.x + 40, y: P.y - 20 }; this.zoomTo(1.45);
      await this.say('NATHAN', '(Nobody\'s coming. Nobody would see.)', nh, { color: '#e6d6ff' });
      // the four trophies pour themselves into him
      SFX.music(null); SFX.thunder();
      for (let n = 0; n < 6; n++) {
        for (const tr of Act3.trophies || []) for (let k = 0; k < 5; k++) {
          const dx = P.x + P.w / 2 - tr.x, dy = P.y + P.h / 2 - tr.y;
          spawnParticle({ x: tr.x, y: tr.y, vx: dx * rand(1.6, 2.2), vy: dy * rand(1.6, 2.2), life: 0.5, size: rand(3, 6), color: k % 2 ? '#ff2a1a' : GOLD, type: 'spark' });
        }
        SFX.hit(true); addShake(6); await this.wait(0.2);
      }
      this.impact(P.x + P.w / 2, P.y + P.h / 2, '#ff2a1a'); Game.flashRed = 0.7; SFX.bigCrack();
      ring(P.x + P.w / 2, P.y + P.h / 2, 10, 220, 0.8, '#ff2a1a', 8);
      await this.say('ADAM', 'Nathan…? Your eyes are doing the thing mine were doing.', () => adam.head(), { voice: 1.05 });
      await this.say('NATHAN', 'Undefeated. Forever. That\'s how it ends.', nh, { color: '#ff9a8a' });
      Scene.white = 0; await this.tween(Scene, 'white', 1, 1.2);
      adam.gone = true;
      Object.assign(Scene, { on: 'hood', mode: 'EGO', t: 0, lie: 0, lookBat: 0, smirk: 0, ballT: -1 });
      await this.tween(Scene, 'white', 0, 1.6);
      await this.title('NEW MANAGEMENT', 'THE GILDED STADIUM · EVERY SEASON, FOREVER', 3.2);
      await this.say('NATHAN', 'Permanent MVP of the Spire. Undisputed.', () => scr(VW / 2, VH * 0.42), { color: '#ff9a8a' });
      await this.say('NATHAN', '…Anybody? Rematch? No?', () => scr(VW / 2, VH * 0.42), { color: '#ff9a8a' });
      await this.wait(1.2);
      await this.credits();
      // hide the standard-ending flag so the defeat scene doesn't also show its card; restored right after
      END.heldA = !!D.endingA; D.endingA = false; D.q.endEgo = 1; saveGame();
    },
  });

  // the trophies' offer, after Evil Adam falls, if you didn't bring your friends along
  const _enEndingA = Story.endingA;
  let egoPicked = false;
  Story.endingA = async function (b) {
    egoPicked = false;
    if (!trueEndingChecks()[0][1]) {
      await this.wait(0.6);
      await this.say('NATHAN', '…The trophies. They\'re whispering. "Keep it. Never lose again."', () => this.nathanHead(), { color: '#e6d6ff' });
      const i = await this.choose('THE CURSED TROPHIES OFFER THEIR POWER', ['Drop the bat', 'Keep swinging']);
      if (i === 1) { egoPicked = true; return this.egoEnding(b); }
    }
    return _enEndingA.call(this, b);
  };
  const _enDefeat = Story.evilAdamDefeat;
  Story.evilAdamDefeat = function (b) {
    return _enDefeat.call(this, b).then(() => {
      if (!egoPicked) return;
      egoPicked = false; Save.data.endingA = END.heldA; saveGame(); endCard('EGO');
    });
  };

  // the end card: record every ending, and dress the card for the new ones
  const CARDS = {
    EGO: ['BAD ENDING', 'NEW MANAGEMENT', 'Nathan kept the Cursed Trophies and the Spire with them. He is undefeated forever, on a throne, in an empty stadium. <b>Nobody came. Maybe bring your friends next time.</b>'],
    JOKE: ['JOKE ENDING', 'WORKS ON MY MACHINE', 'Josh patched the final boss out of existence. Everyone is home early. The Spire is still running on his laptop somewhere. <b>It works on his machine.</b>'],
    CHILL: ['PEACE ENDING', 'ETERNAL CHILL', 'Not a single swing. One thermos of Deniz\'s tea, and the Cursed Trophies shattered from pure good vibes. Barbecue on the roof of the Spire until sunrise.'],
  };
  const _enEndCard = endCard;
  endCard = function (mode) {
    unlockEnding(ENDING_OF[mode] || 'standard');
    const C = CARDS[mode];
    _enEndCard(C ? 'A' : mode);
    const card = $('#end');
    if (C) {
      card.querySelector('.eyebrow').textContent = C[0]; card.querySelector('h1').textContent = C[1]; card.querySelector('.lede').innerHTML = C[2];
      if (mode === 'EGO') SFX.music(null);
    }
    // the five trophies, lit for every ending you've ever seen
    let row = $('#endTrophies');
    if (!row) { row = document.createElement('div'); row.id = 'endTrophies'; row.style.cssText = 'display:flex;gap:10px;justify-content:center;margin:10px 0 4px;font:12px var(--display, sans-serif);letter-spacing:.06em'; $('#endStats').after(row); }
    const got = endingsFound();
    row.innerHTML = ENDINGS.map(e => `<span title="${got.includes(e.id) ? e.name : '???'}" style="color:${got.includes(e.id) ? '#f2c14e' : 'rgba(243,234,216,.25)'};font-size:22px">🏆</span>`).join('') +
      `<span style="align-self:center;opacity:.7;margin-left:6px">${got.length}/${ENDINGS.length} ENDINGS</span>`;
  };

  // the rooftop barbecue and the empty throne room, drawn behind the last lines and the credits
  const _enHood = drawHood;
  drawHood = function (S) {
    if (S.mode === 'CHILL') return drawRoof(S);
    if (S.mode === 'EGO') return drawThrone(S);
    return _enHood(S);
  };
  function drawRoof(S) {
    const t = Game.time, gy = fieldY();
    const g = ctx.createLinearGradient(0, 0, 0, gy); g.addColorStop(0, '#2a1f4a'); g.addColorStop(0.55, '#e0704a'); g.addColorStop(1, '#ffc07a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
    // we're above the clouds up here
    ctx.fillStyle = 'rgba(255,236,214,.55)';
    for (let k = 0; k < 9; k++) { const x = ((k * 211 + t * 8) % (VW + 300)) - 150; ctx.beginPath(); ctx.ellipse(x, gy - 30 + (k % 3) * 14, 120 + (k % 4) * 30, 22, 0, 0, 7); ctx.fill(); }
    // the roof deck and its railing
    ctx.fillStyle = '#5a3f2a'; ctx.fillRect(0, gy - 6, VW, VH - gy + 6);
    ctx.fillStyle = '#7a5a3a'; for (let x = 0; x < VW; x += 46) ctx.fillRect(x, gy - 6, 3, VH);
    ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, gy - 60); ctx.lineTo(VW, gy - 60); ctx.stroke();
    for (let x = 20; x < VW; x += 60) { ctx.beginPath(); ctx.moveTo(x, gy - 60); ctx.lineTo(x, gy - 6); ctx.stroke(); }
    // string lights
    for (let k = 0; k < 28; k++) {
      const x = k / 27 * VW, y = 60 + Math.sin(k / 27 * Math.PI) * 50;
      ctx.fillStyle = ['#f2c14e', '#ff8a2a', '#9fe6ff', '#9be36a'][k % 4]; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 2 + k);
      ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // the grill, smoking happily
    const gx = VW / 2 + 230 * FIELD_S;
    rr(gx - 40, gy - 70, 80, 36, 6); inked('#2a2228', 3);
    ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(gx - 30, gy - 34); ctx.lineTo(gx - 36, gy - 4); ctx.moveTo(gx + 30, gy - 34); ctx.lineTo(gx + 36, gy - 4); ctx.stroke();
    for (let k = 0; k < 5; k++) { ctx.fillStyle = k % 2 ? '#ff8a2a' : '#f2c14e'; const fh = 8 + Math.abs(Math.sin(t * 9 + k)) * 10; ctx.beginPath(); ctx.moveTo(gx - 30 + k * 15, gy - 70); ctx.lineTo(gx - 24 + k * 15, gy - 70 - fh); ctx.lineTo(gx - 18 + k * 15, gy - 70); ctx.fill(); }
    for (let k = 0; k < 6; k++) { const p = (t * 0.25 + k / 6) % 1; ctx.fillStyle = `rgba(243,234,216,${0.35 * (1 - p)})`; ctx.beginPath(); ctx.arc(gx + Math.sin(p * 6 + k) * 14, gy - 80 - p * 160, 10 + p * 18, 0, 7); ctx.fill(); }
    // the crew, hanging out
    ctx.save(); ctx.translate(VW / 2, gy); ctx.scale(FIELD_S, FIELD_S);
    for (const [kind, ox, o] of fieldCrew()) {
      const f = ox < 0 ? 1 : -1, oo = Object.assign({}, o);
      if (kind === 'nathan') drawCastMember('nathan', ox, 0, -1, t, Object.assign(oo, { bat: 'wood' }));
      else if (kind === 'deniz') drawCastMember('deniz', ox, 0, -1, t, Object.assign(oo, { sit: true }));
      else drawCastMember(kind, ox, 0, f, t, oo);
    }
    if (!Save.data.denizDead) drawCastMember('deniz', 160, 0, -1, t, { sit: true });
    ctx.restore();
  }
  function drawThrone(S) {
    const t = Game.time, cx = VW / 2, fy = VH * 0.74;
    const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#0d0306'); g.addColorStop(0.6, '#4a0a12'); g.addColorStop(1, '#1a0508');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
    // rows and rows of empty seats
    for (let r = 0; r < 7; r++) {
      const y = VH * 0.12 + r * 30;
      ctx.fillStyle = `rgba(30,8,12,${0.9 - r * 0.07})`; ctx.fillRect(0, y, VW, 22);
      ctx.fillStyle = 'rgba(90,24,30,.55)'; for (let x = (r % 2) * 14; x < VW; x += 28) ctx.fillRect(x, y + 5, 16, 11);
    }
    ctx.fillStyle = '#240a0e'; ctx.fillRect(0, fy + 20, VW, VH - fy); ctx.fillStyle = 'rgba(242,193,78,.35)'; ctx.fillRect(0, fy + 20, VW, 3);
    // the red glow, the steps, the throne
    const rg = ctx.createRadialGradient(cx, fy - 80, 20, cx, fy - 80, 320); rg.addColorStop(0, `rgba(255,60,30,${0.4 + Math.sin(t * 2) * 0.06})`); rg.addColorStop(1, 'rgba(255,60,30,0)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, VW, VH);
    rr(cx - 170, fy + 2, 340, 22, 3); inked('#3a1416', 3); rr(cx - 120, fy - 18, 240, 22, 3); inked('#4a1a1c', 3);
    ctx.beginPath(); ctx.moveTo(cx - 60, fy - 18); ctx.lineTo(cx - 60, fy - 190); ctx.lineTo(cx - 30, fy - 160); ctx.lineTo(cx, fy - 230); ctx.lineTo(cx + 30, fy - 160); ctx.lineTo(cx + 60, fy - 190); ctx.lineTo(cx + 60, fy - 18); ctx.closePath(); inked('#8a6a1a', 4);
    rr(cx - 46, fy - 150, 92, 120, 6); inked('#5a0c10', 3);
    // Nathan, in dark flame-red armour
    ctx.save(); ctx.translate(cx, fy - 18); ctx.scale(FIELD_S * 1.1, FIELD_S * 1.1);
    drawCastMember('nathan', 0, 0, 1, t, { bat: 'max' });
    rr(-17, -40, 11, 9, 3); inked('#8a1010', 2); rr(6, -40, 11, 9, 3); inked('#8a1010', 2); rr(-9, -33, 18, 15, 3); inked('#5a0a0a', 2);
    ctx.fillStyle = '#ff3a1a'; ctx.shadowColor = '#ff3a1a'; ctx.shadowBlur = 8; ctx.fillRect(1, -50, 3, 2); ctx.fillRect(6, -50, 3, 2);
    ctx.restore();
    // the four trophies, orbiting their new owner
    for (let k = 0; k < 4; k++) {
      const a = t * 0.5 + k * Math.PI / 2, x = cx + Math.cos(a) * 230, y = fy - 140 + Math.sin(a) * 40;
      ctx.save(); ctx.shadowColor = '#ff2a1a'; ctx.shadowBlur = 20; drawTrophy(x, y, 1, t + k, {}); ctx.restore();
    }
  }
}

// the page's first room was entered before this file loaded: place things there now
if (typeof Zone !== 'undefined' && Zone.room) enPlace(Zone.room);
// saves that reached an ending before trophies existed still get theirs
(function backfill() {
  const D = Save.data, L = endingsFound(), add = id => { if (!L.includes(id)) L.push(id); };
  if (D.endingA) add('standard'); if (D.trueEnding) add('true');
  for (const [k, id] of [['endEgo', 'ego'], ['endJoke', 'joke'], ['endChill', 'chill']]) if (D.q && D.q[k]) add(id);
  writeLS('ei_endings', L);
})();
