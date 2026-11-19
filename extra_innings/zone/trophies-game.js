/* =========================================================
   TROPHIES IN-GAME · unlock tracking, the unlock banner,
   SUDDEN DEATH (one life: the save shatters) and the
   SHOT CLOCK (a stadium timer, top-right).
   Loaded on every game page after trophies.js.
   ========================================================= */
const TG = { pollT: 0, parry: 0, mvp: null, lastHp: -1, tauntT: 0, shattered: false, queue: [], showing: false };
const tMode = () => { const q = Save.data.q; return q.sudden ? 'Sudden Death' : q.shotClock ? 'Shot Clock' : 'Standard'; };
const BOSS_FLAGS = ['bossDead', 'adamDead', 'danielDead', 'fionnDead', 'miloDead', 'denizDead', 'evilAdamDead', 'zennithDead'];
const bossKills = D => BOSS_FLAGS.filter(k => D[k]).length;
const BENCH_TOTAL = 16;   // Zone 1: 3 · Act I: 6 · Act II: 5 · Act III: 2

/* ---------- a new save that asked for Sudden Death; a shattered save can't be loaded ---------- */
(function () {
  const D = Save.data, q = D.q;
  if (ARRIVE === 'new') {
    let m = null; try { m = localStorage.getItem('ei_newmode'); localStorage.removeItem('ei_newmode'); } catch (e) { logErr("zone/trophies-game.js:17", e); }
    if (m === 'sudden') { q.sudden = 1; D.shattered = false; saveGame(); }
  }
  if (q.sudden && D.shattered) { location.replace('index.html'); }
})();

/* ---------- the unlock banner ---------- */
(function () {
  const st = document.createElement('style');
  st.textContent = `#trophyToast{position:fixed;top:64px;right:22px;z-index:40;display:flex;gap:12px;align-items:center;padding:10px 16px 10px 10px;background:linear-gradient(90deg,rgba(20,23,34,.96),rgba(20,23,34,.86));border:1px solid rgba(255,215,0,.55);box-shadow:0 0 24px rgba(255,215,0,.25);color:#f3ead8;transform:translateX(130%);transition:transform .45s cubic-bezier(.2,.9,.2,1);pointer-events:none;font-family:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif}
#trophyToast.show{transform:none}
#trophyToast .ic{width:48px;height:48px;filter:drop-shadow(0 0 6px rgba(255,215,0,.6))}
#trophyToast .ic svg{width:100%;height:100%}
#trophyToast small{display:block;font-size:11px;letter-spacing:.22em;color:#ffd700;text-transform:uppercase}
#trophyToast b{display:block;font-size:19px;font-weight:600}
#shotClock{position:fixed;top:16px;right:22px;z-index:6;pointer-events:none;font-family:"SF Mono",Menlo,Consolas,monospace;font-size:22px;letter-spacing:.08em;color:#ffd27a;background:rgba(10,8,14,.72);border:1px solid rgba(255,210,122,.35);padding:4px 12px 3px;text-shadow:0 0 8px rgba(255,180,60,.6);display:none}
#shotClock small{display:block;font-size:9px;letter-spacing:.3em;opacity:.6;text-align:right}
#shotClock.warn{color:#ff3a1a;border-color:rgba(255,58,26,.6);text-shadow:0 0 10px rgba(255,58,26,.8);animation:scWarn 1s steps(2) infinite}
#shotClock.over{color:rgba(243,234,216,.45);text-shadow:none}
@keyframes scWarn{50%{opacity:.6}}
#jumbo{position:fixed;top:14px;left:50%;z-index:7;width:300px;margin-left:-150px;display:flex;gap:10px;align-items:center;padding:8px;background:#0d0b10;border:3px solid #2a2230;box-shadow:0 0 0 2px #7a1f6e,0 0 30px rgba(122,31,110,.6);color:#e6d6ff;font-family:Impact,sans-serif;letter-spacing:.04em;transform:translateY(-140%);transition:transform .35s;pointer-events:none}
#jumbo.show{transform:none}
#jumbo .face{width:56px;height:56px;flex:none;background:repeating-linear-gradient(0deg,rgba(255,255,255,.06) 0 2px,transparent 2px 4px),#2a1238}
#jumbo p{font-size:15px;line-height:1.1}#jumbo small{display:block;font-size:10px;letter-spacing:.25em;color:#d9b8ff;opacity:.7}
#shatter{position:fixed;inset:0;z-index:60;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:radial-gradient(circle at 50% 45%,rgba(90,8,14,.92),rgba(8,2,4,.98));color:#f3ead8;font-family:"Iowan Old Style",Palatino,Georgia,serif;opacity:0;transition:opacity 1.2s}
#shatter.show{opacity:1}
#shatter svg{width:160px;height:160px;animation:shatterIn 1.4s cubic-bezier(.2,.9,.2,1)}
#shatter h1{font-size:44px;font-weight:600;letter-spacing:.04em;color:#ffd700}
#shatter p{opacity:.75;font-style:italic}
#shatter button{margin-top:10px;font:inherit;font-size:16px;padding:10px 22px;background:none;color:#f3ead8;border:1px solid rgba(255,215,0,.6);cursor:pointer;pointer-events:auto}
@keyframes shatterIn{0%{transform:scale(1.4) rotate(-10deg);filter:brightness(3)}100%{transform:none}}`;
  document.head.appendChild(st);
  for (const [id, html] of [['trophyToast', '<div class="ic"></div><div><small>Trophy unlocked</small><b></b></div>'], ['shotClock', '<span></span><small>SHOT CLOCK</small>'], ['jumbo', '<div class="face"></div><div><small>JUMBOTRON · EVIL ADAM</small><p></p></div>']]) {
    const el = document.createElement('div'); el.id = id; el.innerHTML = html; document.body.appendChild(el);
  }
  // a little Evil Adam on the jumbotron
  document.querySelector('#jumbo .face').innerHTML = '<svg viewBox="0 0 56 56"><circle cx="28" cy="30" r="16" fill="#d9c8e8" stroke="#0d0b10" stroke-width="3"/><path d="M12 24 Q14 8 30 10 Q44 10 46 22 L36 18 L28 24 L20 18 Z" fill="#2a1238" stroke="#0d0b10" stroke-width="3"/><path d="M20 30 L26 32 M36 30 L30 32" stroke="#7a1f6e" stroke-width="3" stroke-linecap="round"/><path d="M20 40 Q28 36 36 40" fill="none" stroke="#0d0b10" stroke-width="3" stroke-linecap="round"/></svg>';
})();
function tShow() {
  if (TG.showing || !TG.queue.length) return;
  const T = TG.queue.shift(), el = document.getElementById('trophyToast');
  TG.showing = true;
  el.querySelector('.ic').innerHTML = T.icon; el.querySelector('b').textContent = T.name;
  el.classList.add('show'); SFX.bell ? SFX.bell() : SFX.blip();
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => { TG.showing = false; tShow(); }, 500); }, 3600);
}
function tGive(id) {
  const T = TROPHIES.find(t => t.id === id); if (!T) return;
  if (Trophies.unlock(id, tMode()) && !TG.silent) { TG.queue.push(T); tShow(); }
}

/* ---------- what each trophy checks against the save ---------- */
const TCHECK = {
  play_ball: D => D.bossDead,
  josh_launch: D => D.josh && D.up.launcher,
  warm_up: D => D.adamDead,
  slowpoke: D => D.chase,
  lucky_one: D => D.danielDead,
  sedimentary: D => D.fionnDead,
  storm_obeys: D => D.miloDead,
  bad_vibes: D => D.denizDead,
  blorp: D => ['z1', 'z2', 'z3', 'z4', 'z5', 'z6', 'z7', 'z8', 'z9'].every(z => (D.reshmanMet || {})[z]),
  rock_stone: D => D.batLv >= 3,
  cat_herder: D => D.q.cats === 'done',
  pebbles: D => Object.keys(D.pebbles || {}).length >= PEBBLE_TOTAL,
  damage_control: D => D.q.milo === 'done',
  spite_powered: D => { try { return vitems(VENDORS.josh).filter(s => s.tag !== 'QUEST' && s.tag !== 'SECRET').every(s => itemOwned(s, D)); } catch (e) { logErr("zone/trophies-game.js:83", e); return false; } },
  benchwarmer: D => Object.keys(D.q.rested || {}).length >= BENCH_TOTAL,
  grand_slam: D => !!(D.q.gx && D.q.gx.cups && D.q.gx.cups.gold),
  shot_clock: D => D.q.shotClock && D.q.clockClear !== undefined && D.q.clockClear < 2 * 3600,
  lightning: D => typeof completionPct === 'function' && completionPct() >= 100 && D.time < 4 * 3600,
  no_extra: D => D.q.sudden && !D.shattered && Object.keys(D.q.endings || {}).length > 0,
  undefeated: D => D.q.sudden && !D.shattered && D.trueEnding,
  bunt_god: D => D.q.abyss === 'done',
  king_cage: D => !!(D.q.cage && D.q.cage.prize),
  lucid_dreamer: D => !!(D.q.dream && D.q.dream.badge),
};
function tPoll(silent) {
  TG.silent = !!silent;
  const D = Save.data, q = D.q;
  if (Object.keys(q.endings || {}).length && q.clockClear === undefined) { q.clockClear = q.clock || 0; saveGame(); }
  for (const [id, f] of Object.entries(TCHECK)) if (!Trophies.has(id)) { let ok = false; try { ok = f(D); } catch (e) { logErr("zone/trophies-game.js:96", e); } if (ok) tGive(id); }
  // endings (shared across saves)
  let L = []; try { L = JSON.parse(localStorage.getItem('ei_endings') || '[]') || []; } catch (e) { logErr("zone/trophies-game.js:98", e); }
  for (const e of [...L, ...Object.keys(q.endings || {})]) if (ENDING_TROPHY[e] && !Trophies.has(ENDING_TROPHY[e])) tGive(ENDING_TROPHY[e]);
}

/* ---------- event-based trophies ---------- */
// Untouchable: ten parries in one stretch of air
const _tPop = pop;
pop = function (x, y, text) {
  if (text === 'PARRY!' && !Player.onGround) { TG.parry++; if (TG.parry >= 10) tGive('untouchable'); }
  return _tPop.apply(this, arguments);
};
// Benchwarmer: every bench you actually rest at
const _tRest = PAGE.onRest;
PAGE.onRest = function (i) {
  const q = Save.data.q; (q.rested = q.rested || {})[PAGE.id + ':' + i] = 1; saveGame();
  if (_tRest) return _tRest.apply(this, arguments);
};

/* ---------- Sudden Death: no respawn. The save shatters. ---------- */
const _tRespawn = respawnAtBench;
respawnAtBench = function () {
  const D = Save.data;
  if (!D.q.sudden) return _tRespawn.apply(this, arguments);
  if (TG.shattered) return;
  TG.shattered = true; D.shattered = true; D.deaths++; saveGame();
  Input.enabled = false; SFX.music(null); SFX.bigCrack ? SFX.bigCrack() : SFX.boom();
  const el = document.createElement('div'); el.id = 'shatter';
  el.innerHTML = `${CRACKED_BALL}<h1>SUDDEN DEATH</h1><p>One life, and it's spent. This save file has shattered.</p>
    <p style="font-style:normal;font-size:14px;opacity:.6">${fmtTime(D.time || 0)} played · ${bossKills(D)} bosses beaten · ${Object.keys(D.pebbles || {}).length}/${PEBBLE_TOTAL} pebbles</p>
    <button id="shatterGo">Back to the Dugout</button>`;
  document.body.appendChild(el); requestAnimationFrame(() => el.classList.add('show'));
  el.querySelector('#shatterGo').onclick = () => { location.href = 'index.html'; };
};
const CRACKED_BALL = '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#e9dcc0" stroke="#0d0b10" stroke-width="5"/><path d="M28 22 Q40 50 28 78 M72 22 Q60 50 72 78" fill="none" stroke="#e8361c" stroke-width="3" stroke-dasharray="5 4"/><path d="M50 10 L44 30 L56 42 L46 58 L58 72 L52 90" fill="none" stroke="#0d0b10" stroke-width="4" stroke-linejoin="round"/><path d="M56 42 L74 36 M46 58 L26 62" fill="none" stroke="#0d0b10" stroke-width="3"/></svg>';

/* ---------- Sudden Death look: spikes around the Hype orb ---------- */
(function () {
  if (!Save.data.q.sudden) return;
  const svg = document.querySelector('.hud-portrait.orb svg'); if (!svg) return;
  svg.style.overflow = 'visible';
  let d = ''; for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, b = a + Math.PI / 16, c = a + Math.PI / 8; d += `M${32 + Math.cos(a) * 28} ${32 + Math.sin(a) * 28} L${32 + Math.cos(b) * 37} ${32 + Math.sin(b) * 37} L${32 + Math.cos(c) * 28} ${32 + Math.sin(c) * 28} `; }
  svg.insertAdjacentHTML('afterbegin', `<path d="${d}" fill="#c9a33a" stroke="#0d0b10" stroke-width="2" stroke-linejoin="round"/>`);
})();
const TAUNTS = ['One more hit, MVP. Just one.', 'Match point. Mine.', 'The crowd wants a strikeout.', 'Careful. There\'s no extra inning for you.', 'Look at that HP. Adorable.'];
function jumboTaunt() {
  const el = document.getElementById('jumbo'); if (!el) return;
  el.querySelector('p').textContent = TAUNTS[(Math.random() * TAUNTS.length) | 0];
  el.classList.add('show'); SFX.staticBuzz && SFX.staticBuzz(0.25);
  setTimeout(() => el.classList.remove('show'), 3200);
}

/* ---------- the Shot Clock (time only runs during play: not in cutscenes or loading) ---------- */
const fmtClock = s => { const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = Math.floor(s % 60), cs = Math.floor(s * 100 % 100), p = n => String(n).padStart(2, '0'); return (h ? h + ':' : '') + p(m) + ':' + p(x) + '.' + p(cs); };
(function buildShotClockSetting() {
  const vr = document.getElementById('vol'), card = vr && vr.closest('.card'); if (!card) return;
  const row = document.createElement('div'); row.className = 'row';
  row.innerHTML = `<label>Shot Clock</label><span class="seg">${[[1, 'On'], [0, 'Off']].map(([v, t]) => `<button data-k="${v}">${t}</button>`).join('')}</span>`;
  const mark = () => row.querySelectorAll('button').forEach(b => b.classList.toggle('on', +b.dataset.k === (Save.data.q.shotClock ? 1 : 0)));
  row.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { Save.data.q.shotClock = +b.dataset.k; saveGame(); mark(); SFX.ui(); }));
  mark(); card.appendChild(row);
})();

/* ---------- per-frame ---------- */
const _tTick = PAGE.tick;
PAGE.tick = function (dt) {
  if (_tTick) _tTick.apply(this, arguments);
  const D = Save.data, q = D.q, P = Player;
  if (!Story.active && !P.dead && Game.fade < 0.5) q.clock = (q.clock || 0) + dt;
  if (P.onGround) TG.parry = 0;
  // MVP Baby: a boss fight from first blow to the kill without losing a point of HP
  const B = Zone.boss;
  if (B && B.state !== 'wait' && !TG.mvp) TG.mvp = { kills: bossKills(D), clean: true, grace: 3 };
  if (TG.mvp) {
    if (TG.lastHp >= 0 && P.hp < TG.lastHp) TG.mvp.clean = false;
    if (bossKills(D) > TG.mvp.kills) { if (TG.mvp.clean) tGive('mvp_baby'); TG.mvp = null; }
    else if (!B && !Story.active && (TG.mvp.grace -= dt) <= 0) TG.mvp = null;
  }
  // Sequence Breaker: standing in the Storm Atrium with no Explosive Baseballs
  if (Zone.room && Zone.room.zone === 'z7' && !D.up.boom && !D.abil.boom) tGive('seq_break');
  // Sudden Death: Evil Adam mocks you at 1 HP
  TG.tauntT -= dt;
  if (q.sudden && P.hp === 1 && TG.lastHp > 1 && TG.tauntT <= 0) { TG.tauntT = 25; jumboTaunt(); }
  TG.lastHp = P.hp;
  if ((TG.pollT -= dt) <= 0) { TG.pollT = 0.5; tPoll(false); }
  // the clock readout
  const el = document.getElementById('shotClock');
  if (el) {
    const on = !!q.shotClock && !(typeof Scene !== 'undefined' && Scene.on);
    el.style.display = on ? 'block' : 'none';
    if (on) {
      const s = q.clock || 0, cleared = q.clockClear !== undefined;
      el.firstChild.textContent = fmtClock(cleared ? q.clockClear : s);
      el.classList.toggle('warn', !cleared && s > 2 * 3600 - 600 && s < 2 * 3600);
      el.classList.toggle('over', !cleared && s >= 2 * 3600);
    }
  }
};
Trophies.reconcile();
// progress made before trophies existed unlocks quietly on load; only new ones get the banner
tPoll(true); TG.silent = false;
