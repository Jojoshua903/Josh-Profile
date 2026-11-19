'use strict';
/* =========================================================
   DIFFICULTY · the four ways to play (every story page)
   Spring Training · Major League · World Series · Sudden Death
   Set once on New Game (index.html → localStorage 'ei_newdiff'),
   then locked to the save: Save.data.q.diff, plus q.pace for
   Sudden Death ('major' or 'world' speed).
   · Spring Training: 7 hearts, +50% Hype, never more than one heart
     lost per hit, spikes and pits cost nothing, bosses 15% slower
   · Major League: the game as it was tuned
   · World Series: healing in a boss fight takes 0.2 s longer, 15% less
     Hype, bosses and enemies 20% faster, 0.7 s of i-frames;
     finishing it earns the gold World Series star
   · Sudden Death: one life (zone/trophies-game.js shatters the save),
     at Major League or World Series speed. Dreams and the Hall of
     Legends never shatter it (their own death handlers run first).
   Loaded after zone/benches.js, before the Hall of Legends.
   ========================================================= */
const DIFFS = {
  spring: { name: 'Spring Training', color: '#4CAF50', hp: 2, hype: 1.5, boss: 0.85, foe: 1, iframe: 0, heal: 0, gentle: true },
  major:  { name: 'Major League', color: '#FF3B30', hp: 0, hype: 1, boss: 1, foe: 1, iframe: 0, heal: 0 },
  world:  { name: 'World Series', color: '#FFD700', hp: 0, hype: 0.85, boss: 1.2, foe: 1.2, iframe: 0.7, heal: 0.2 },
};
const DF = { heal0: null };

// a brand-new save takes the difficulty picked on the title screen
(function () {
  const D = Save.data, q = D.q;
  if (ARRIVE === 'new') {
    let m = null; try { m = localStorage.getItem('ei_newdiff'); localStorage.removeItem('ei_newdiff'); } catch (e) { logErr('difficulty: read', e); }
    if (m === 'sudden-major' || m === 'sudden-world') { q.diff = 'sudden'; q.pace = m.slice(7); q.sudden = 1; }
    else if (DIFFS[m]) { q.diff = m; q.pace = null; q.sudden = 0; }
    saveGame();
  }
  if (!q.diff) q.diff = q.sudden ? 'sudden' : 'major';   // saves from before difficulties existed
})();
const diffKey = () => { const q = Save.data.q; return q.diff === 'sudden' ? (q.pace === 'world' ? 'world' : 'major') : DIFFS[q.diff] ? q.diff : 'major'; };
const diffNow = () => DIFFS[diffKey()];
const diffLabel = () => { const q = Save.data.q; return q.diff === 'sudden' ? `Sudden Death · ${DIFFS[diffKey()].name} speed` : diffNow().name; };

/* ---------- hearts ---------- */
const _dfApply = applyUpgrades;
applyUpgrades = function () {
  const hp0 = Player.hp, max0 = Player.maxHp;
  _dfApply.apply(this, arguments);
  const M = diffNow();
  DF.heal0 = TUNE.healTime;
  if (!M.hp) return;
  Player.bonusHp = (Player.bonusHp || 0) + M.hp;
  const want = 5 + Player.bonusHp;
  if (max0 !== undefined && Player.maxHp !== undefined && Player.maxHp !== want) { Player.maxHp = want; Player.hp = clamp(hp0 + Math.max(0, want - max0), 1, want); }
};

/* ---------- Hype ---------- */
const _dfHype = Player.gainHype;
Player.gainHype = function (n) { return _dfHype.call(this, n * diffNow().hype); };

/* ---------- getting hit ---------- */
// Spring Training: no hit takes more than one heart (the MVP stance's showboat tax is waived
// by hiding the stance for the length of the hit)
const _dfHurt = Player.hurt;
Player.hurt = function (dir) {
  const M = diffNow(), q = Save.data.q, hp0 = this.hp, sh0 = this.shield || 0, inv0 = this.invuln, st = q.stance;
  if (M.gentle && st === 'mvp') q.stance = 'spring-training';
  let r; try { r = _dfHurt.apply(this, arguments); } finally { if (q.stance === 'spring-training') q.stance = st; }
  if (M.iframe && inv0 <= 0 && (this.hp < hp0 || (this.shield || 0) < sh0) && this.invuln > M.iframe) this.invuln = M.iframe;
  return r;
};
// Spring Training: spikes, lava and pits just blink you back to safe ground
const _dfSpikes = Player.hitSpikes;
Player.hitSpikes = function () {
  if (!diffNow().gentle || OPT.god) return _dfSpikes.apply(this, arguments);
  const sh = this.shield; this.shield = 0; this.hp++;
  try { _dfSpikes.apply(this, arguments); } finally { this.shield = sh; }
};
if (typeof abHit === 'function') {
  const _dfAb = abHit;
  abHit = function () {
    const P = Player;
    if (!diffNow().gentle || OPT.god || P.dead || P.hazard || P.invuln > 0) return _dfAb.apply(this, arguments);
    const sh = P.shield, hp = P.hp; P.shield = 0; P.hp++;
    try { _dfAb.apply(this, arguments); } finally { P.shield = sh; if (!P.dead) P.hp = hp; }
  };
}

/* ---------- boss and enemy tempo: every enemy's clock runs at the difficulty's speed ---------- */
function dfWrap(e) {
  if (!e || e._df || typeof e.update !== 'function') return;
  e._df = 1;
  const raw = e.update;
  e.update = function (dt) { const M = diffNow(), k = this.type === 'boss' ? M.boss : M.foe; arguments[0] = dt * k; return raw.apply(this, arguments); };
}
const _dfPush = Enemies.push;
Enemies.push = function () { for (const e of arguments) dfWrap(e); return _dfPush.apply(this, arguments); };
for (const e of Enemies) dfWrap(e);

/* ---------- per frame: World Series healing, and the gold star ---------- */
const _dfTick = PAGE.tick;
PAGE.tick = function (dt) {
  if (_dfTick) _dfTick.apply(this, arguments);
  const M = diffNow(), q = Save.data.q;
  if (DF.heal0 !== null) TUNE.healTime = DF.heal0 + (M.heal && Zone.boss && !Zone.boss.dead ? M.heal : 0);
  // what the title screen's save banner shows: hearts and completion (written with the next save)
  DF.slotT = (DF.slotT || 0) - dt;
  if (DF.slotT <= 0 && !(typeof LG !== 'undefined' && LG.on) && !Player.dead) {
    DF.slotT = 2;
    q.lastHp = Player.hp; q.lastMax = Player.maxHp;
    if (typeof completionPct === 'function') q.lastPct = completionPct();
  }
  if (diffKey() === 'world' && !q.wsStar && Object.keys(q.endings || {}).length) {
    q.wsStar = 1; saveGame();
    try { localStorage.setItem('ei_ws_badge', '1'); } catch (e) { logErr('difficulty: badge', e); }
    setTimeout(() => toast('WORLD SERIES CLEARED · A GOLD STAR FOR THIS SAVE · THE WORLD SERIES BADGE IS ON THE TITLE SCREEN'), 2500);
  }
};
if (typeof TCHECK !== 'undefined') TCHECK.world_series = D => !!D.q.wsStar;

/* ---------- the options card: the difficulty (locked), and an assist tip if you're stuck ---------- */
const DF_TIPS = {
  boss: ['Watch the windup, not the boss. Every big attack has a tell. Count it, then dodge, then swing.', 'Pogo off the boss (down + attack in the air) to stay out of reach of ground attacks.', 'Heal between attack strings, not during them. Back off to the far wall first.', 'Most thrown things can be batted back. A deflected shot hurts more than a swing.', 'Swap your stance and badges on a bench. Acrobat gives you reach in the air; Slugger hits harder.'],
  roam: ['Stuck on a jump? Dash, then double jump at the very top of the dash.', 'Reshman sells the map of each zone. Look for him in dark corners.', 'Cracked walls break. Explosive Baseballs break the thick ones.', 'The pause menu\'s quest log lists who needs what, and where.', 'Lars at Base Camp upgrades your bat. Josh sells the rest.'],
};
(function buildDiffOption() {
  const vr = document.getElementById('vol'), card = vr && vr.closest('.card'); if (!card) return;
  const row = document.createElement('div'); row.className = 'row';
  row.innerHTML = `<label>Difficulty</label><span class="seg"><button class="on" disabled style="border-color:${diffNow().color}">${diffLabel()}</button><button id="dfTip">Stuck? Assist tip</button></span>`;
  card.appendChild(row);
  row.querySelector('#dfTip').addEventListener('click', () => {
    const L = Zone.boss && !Zone.boss.dead ? DF_TIPS.boss : DF_TIPS.roam;
    toast('ASSIST · ' + L[(Math.random() * L.length) | 0].toUpperCase()); SFX.ui();
  });
  row.title = 'A save keeps the difficulty it started on, so the World Series star stays earned.';
})();
