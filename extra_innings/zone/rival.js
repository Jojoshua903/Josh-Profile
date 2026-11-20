'use strict';
/* =========================================================
   ADAPTIVE RIVAL · invisible boss balance (every story page)
   · try #1 is sharp: the first breather after the intro is short,
     the breathers between attacks are 15% shorter (never under
     0.4s), bosses have 15% more HP, and standing under a boss
     swinging for 2s gets you shoved off by a shockwave (no damage)
   · every death in a boss arena (q.rival[boss], max 8) quietly adds:
       +0.04s to each breather after an attack
       +0.03s to each wind-up (the attack itself stays as fast)
       Adam repeats his Smash less often (−10% a loss, never after 4)
       Nathan's hurtbox shrinks 1px a side (max 4): every gap in a
         projectile rain is 2px wider
       the bat's hitbox grows 2px (max 14): parries and sweet spots
       +2% Hype per bat hit (max +15%)
       max HP −1.5% (max −10%), so the bar never looks smaller
   · boss speed never changes and the help itself is never shown; the
     boss bar only says which attempt this is (q.tries, no cap; Dream
     Rematches and the Hall count on their own),
     and the count goes back to 0 the moment the boss falls
   · off in Dream Rematches and the Hall of Legends; World Series
     stops helping after 4 losses; Spring Training skips the sharper try #1
   ========================================================= */
(function () {
  const REST = /^(idle|perch|rest|recover|blizzRest|float|hover)$/;
  const WIND = /Wind$|Hold$|^(hold|crouch|charge)$/;
  const PUNISH = /stun|daz|kneel|beaten|wait|off|recover|blizzard|final|hop|fade|shatter/;
  const q = () => { const Q = Save.data.q; Q.rival = Q.rival || {}; return Q.rival; };
  const tries = () => { const Q = Save.data.q; Q.tries = Q.tries || {}; return Q.tries; };
  const tryKey = B => idOf(B) + (exempt() ? (typeof LG !== 'undefined' && LG.on ? '@hall' : '@dream') : '');
  const idOf = B => (B && B.constructor && B.constructor.name) || 'boss';
  const exempt = () => (typeof DR !== 'undefined' && DR.on) || (typeof LG !== 'undefined' && LG.on) || !!(Zone.room && Zone.room.dream);
  const diff = () => { try { return diffKey(); } catch (e) { return 'major'; } };
  const barOn = () => { const b = document.getElementById('bossBar'); return !!(b && b.classList.contains('show')); };
  // how many losses count right now (0 when the system is off)
  function losses(B) {
    if (!B || exempt()) return 0;
    const n = Math.min(8, q()[idOf(B)] || 0);
    return diff() === 'world' ? Math.min(4, n) : n;
  }
  const inFight = () => { const B = Zone.boss; return !!(B && !B.dead && barOn() && B.state !== 'wait' && B.state !== 'beaten' && B.hp > 0); };

  /* ---------- a boss enters the arena ---------- */
  function rig(B) {
    if (!B || B._rival) return;
    B._rival = { L: losses(B), first: true, spam: 0, cd: 0, swung: 0 };
    const R = B._rival, sharp = !exempt() && diff() !== 'spring';
    // HP: +15% on every honest try, then −1.5% per loss (capped at −10%)
    if (!exempt() && B.maxHp > 0 && B.hp >= B.maxHp) {
      const k = (sharp ? 1.15 : 1) * (1 - Math.min(0.1, 0.015 * R.L));
      B.maxHp = Math.round(B.maxHp * k); B.hp = B.maxHp;
    }
    const raw = B.update;
    B.update = function (dt) {
      const s0 = this.state, t0 = this.t;
      const r = raw.apply(this, arguments);
      try { after(this, s0, t0, dt, sharp); } catch (e) { logErr('zone/rival.js:update', e); }
      return r;
    };
  }
  // after each boss frame: a freshly set timer gets its invisible nudge, and the anti-spam watch
  function after(B, s0, t0, dt, sharp) {
    const R = B._rival; if (!R || exempt()) return;
    // the intro is over: the boss goes for you almost at once (the first breather is capped at 0.5s)
    if (R.first && B.state !== 'wait' && s0 !== undefined) { R.first = false; if (sharp && REST.test(B.state) && B.t > 0.5) B.t = 0.5; }
    const fresh = typeof B.t === 'number' && typeof t0 === 'number' && B.t > t0 + 0.05 && (B.state !== s0 || t0 <= 0.05);
    if (fresh) {
      if (REST.test(B.state)) {
        if (sharp) B.t = Math.max(Math.min(B.t, 0.4), B.t * 0.85);
        B.t += 0.04 * R.L;
      } else if (WIND.test(B.state)) B.t += 0.03 * R.L;
    }
    // standing under the boss, swinging for 2s: a shockwave shoves Nathan back (no damage)
    const P = Player; R.cd -= dt;
    if (P.dead || PUNISH.test(String(B.state)) || !barOn()) { R.spam = 0; return; }
    if (P.attackT > 0) R.swung = 0.45; else R.swung -= dt;
    const bx = B.x + B.w / 2, px = P.x + P.w / 2;
    const close = Math.abs(bx - px) < B.w / 2 + 56 && P.y < B.y + B.h + 10 && P.y + P.h > B.y - 30;
    R.spam = close && R.swung > 0 ? R.spam + dt : Math.max(0, R.spam - dt * 2);
    if (R.spam > 2 && R.cd <= 0) {
      R.spam = 0; R.cd = 3;
      const dir = sgn(px - bx) || 1;
      P.vx = dir * 420; P.vy = -340; P.recoilT = 0.18; P.attackT = 0;
      SFX.from(bx); SFX.slam(); SFX.from(null); addShake(8);
      try { ring(bx, B.y + B.h - 10, 10, 140, 0.35, '#f3ead8', 5); } catch (e) { /* no ring helper on this page */ }
    }
  }
  const _show = BossBar.show;
  BossBar.show = function () { const r = _show.apply(this, arguments); try { rig(Zone.boss); attemptLabel(); } catch (e) { logErr('zone/rival.js:show', e); } return r; };
  // "ATTEMPT 3" in small gold caps on the right, just above the boss bar
  function attemptLabel() {
    const bar = document.getElementById('bossBar'), B = Zone.boss; if (!bar || !B) return;
    let el = bar.querySelector('.rv-try');
    if (!el) { el = document.createElement('em'); el.className = 'rv-try'; bar.appendChild(el); }
    el.textContent = 'ATTEMPT ' + ((tries()[tryKey(B)] || 0) + 1);
  }
  const rvSt = document.createElement('style');
  rvSt.textContent = '#bossBar .rv-try{position:absolute;right:2px;top:-2px;font-style:normal;font-size:11px;font-family:"Cinzel","Trajan Pro",Palatino,Georgia,serif;letter-spacing:.22em;color:#C5A059;text-shadow:1px 1px 0 #0d0b10}';
  document.head.appendChild(rvSt);

  /* ---------- a loss, and a win ---------- */
  const _die = Player.die;
  Player.die = function () {
    try {
      const B = Zone.boss;
      if (inFight()) {
        const T = tries(), k = tryKey(B); T[k] = (T[k] || 0) + 1;
        if (!exempt()) { const Q = q(), id = idOf(B); Q[id] = Math.min(8, (Q[id] || 0) + 1); }
        try { saveGame(); } catch (e) { /* the page may block saving (dev mode) */ }
      }
    } catch (e) { logErr('zone/rival.js:die', e); }
    return _die.apply(this, arguments);
  };
  setInterval(() => {
    const B = typeof Zone !== 'undefined' && Zone.boss;
    if (B && B._rival && !B._rival.won && (B.state === 'beaten' || B.dead || B.hp <= 0)) { B._rival.won = true; tries()[tryKey(B)] = 0; if (!exempt()) q()[idOf(B)] = 0; }
  }, 300);

  /* ---------- Nathan, quietly sharper ---------- */
  const help = () => (inFight() ? Zone.boss._rival ? Zone.boss._rival.L : 0 : 0);
  const _hit = Player.hitbox;
  Player.hitbox = function () {
    const b = _hit.apply(this, arguments), L = help();
    if (!L || !b) return b;
    const g = Math.min(14, 2 * L) / 2;
    return { x: b.x - g, y: b.y - g, w: b.w + g * 2, h: b.h + g * 2 };
  };
  const _hurt = Player.hurtbox;
  Player.hurtbox = function () {
    const b = _hurt.apply(this, arguments), L = help();
    if (!L || !b) return b;
    const s = Math.min(4, L);
    return { x: b.x + s, y: b.y + s, w: Math.max(4, b.w - s * 2), h: Math.max(4, b.h - s * 2) };
  };
  const _gain = Player.gainHype;
  Player.gainHype = function (n) {
    const L = help();
    if (L && n >= 1) arguments[0] = n * (1 + Math.min(0.15, 0.02 * L));
    return _gain.apply(this, arguments);
  };

  /* ---------- fairer picks: Adam's Smash ---------- */
  if (typeof Adam === 'function' && Adam.prototype.pick) {
    const _pick = Adam.prototype.pick, KEYS = ['state', 't', 'vx', 'vy', 'pose', 'mark', 'last', 'facing'];
    Adam.prototype.pick = function () {
      const R = this._rival, L = R ? R.L : 0, prev = this.last;
      if (!L || prev !== 'smash') return _pick.apply(this, arguments);
      // a second Smash in a row stays possible on try #1; each loss makes it 10% rarer, and after 4 it never happens
      const allow = L < 4 && Math.random() > 0.1 * L;
      const snap = {}; KEYS.forEach(k => { snap[k] = this[k]; });
      let r;
      for (let i = 0; i < 6; i++) {
        r = _pick.apply(this, arguments);
        if (allow || this.last !== 'smash') break;
        KEYS.forEach(k => { this[k] = snap[k]; });
      }
      return r;
    };
  }
})();
