'use strict';
/* =========================================================
   FOUL ECHO & CURVEBALL (every story page)
   · the Curveball (Coach Maya, act/bullpen.js): once you have it,
     the Curveball ball type (10 Hype, tagged in zone/arsenal.js) breaks 90°
     after 0.3s, or hunts a target. A curved ball carries `curve`, which slips past shields
     (Catcher Bot masks, the armoured switch in the Pump Room).
   · the Foul Echo: when Nathan strikes out, every Scrap Bolt he was
     carrying stays behind with a shadowy echo of him, and his Hype
     Orb cracks (a third smaller). Go back and beat the echo to get
     both back. Strike out again first and the old echo, and its
     bolts, are gone for good. Practice fights (dreams, the Legends
     Hall, gauntlets, the batting cage, the Abyss) never leave one.
   Loaded after zone/pennant.js; act/bullpen.js loads after this.
   ========================================================= */
const FE = { lostMsg: null, shown: false };
const feQ = () => Save.data.q;

/* ---------- the Curveball ---------- */
function feCurveTarget(b) {
  const sp = Math.hypot(b.vx, b.vy) || 1, dx = b.vx / sp, dy = b.vy / sp;
  let best = null, bd = 560;
  for (const e of Enemies) {
    if (e.dead || e.untargetable || e.type === 'orb' || e.type === 'crate') continue;
    if (e.type === 'switch' && e.kind !== 'curve') continue;
    const ex = e.x + e.w / 2 - b.x, ey = e.y + e.h / 2 - b.y, d = Math.hypot(ex, ey) || 1;
    if ((ex * dx + ey * dy) / d < 0.25) continue;   // only what's in front of the swing
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}
// the Curveball is its own ball type now (zone/arsenal.js tags it kind 'curve', 10 Hype):
// it flies straight for 0.3s, then breaks 90° the way you hold up or down. Hold neither and it
// hunts the nearest target in front instead. Every curveball carries `curve`, so it slips past shields.
const _feBallUpd = Ball.prototype.update;
Ball.prototype.update = function (dt) {
  if (this.state === 'shot' && this.kind === 'curve') {
    if (this.cvT === undefined) { this.cvT = 0.3; this.curve = true; this.life = Math.max(this.life, 0.95); }
    else if (this.cvT > 0) {
      this.cvT -= dt;
      if (this.cvT <= 0) {
        const up = Input.down('up'), dn = Input.down('down'), sp = Math.hypot(this.vx, this.vy) || 1, dx = this.vx / sp, dy = this.vy / sp;
        if (up || dn) {
          const want = up ? -1 : 1;
          let nx, ny;
          if (Math.abs(dy) > 0.8) { nx = Player.facing || 1; ny = 0; }        // already flying up or down: break sideways
          else { const a = [-dy, dx], b = [dy, -dx]; [nx, ny] = (a[1] * want > b[1] * want) ? a : b; }
          const v = Math.max(1100, sp); this.vx = nx * v; this.vy = ny * v; this.life = Math.max(this.life, 0.6);
          pop(this.x, this.y - 14, 'BREAK!', { size: 22, color: '#6fd3ff', burst: false, vy: -40 });
          burst(this.x, this.y, 10, { colors: ['#6fd3ff', '#bfefff'], maxSpeed: 260 });
        } else this.target = feCurveTarget(this);
      }
    } else if (this.target) {
      const T = !this.target.dead ? this.target : (this.target = feCurveTarget(this));
      if (T) {
        const sp = Math.hypot(this.vx, this.vy) || 1, want = Math.atan2(T.y + T.h / 2 - this.y, T.x + T.w / 2 - this.x), cur = Math.atan2(this.vy, this.vx);
        let da = want - cur; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
        const a = cur + clamp(da, -7 * dt, 7 * dt), v = Math.max(1100, sp * 0.995);
        this.vx = Math.cos(a) * v; this.vy = Math.sin(a) * v;
      }
    }
    // a swirl of water-blue mist
    const k = (this.cvSpin = (this.cvSpin || 0) + dt * 18);
    if (Math.random() < 0.85) spawnParticle({ x: this.x + Math.cos(k) * 9, y: this.y + Math.sin(k) * 9, vx: rand(-20, 20), vy: rand(-20, 20), life: 0.35, size: rand(2, 4), color: Math.random() < 0.5 ? '#6fd3ff' : '#bfefff', type: 'dot' });
  }
  return _feBallUpd.call(this, dt);
};

/* ---------- the Foul Echo ----------
   · strike out: every unspent bolt stays with an echo hovering over the
     last safe ledge, and the Hype Orb cracks (max Hype 66%) until you
     get it back. Spring Training: only half the bolts, the orb holds.
   · the echo floats defensively and lobs a slow dark curveball if you
     hang around. Two clean swings shatter it (pogo hits don't count, so
     you can bounce off it to reach high ledges). Parry the curveball
     back into it and that counts as a swing.
   · in the room next door the music dips: a crowd murmur and a bat
     tapping home plate. The pause map marks it with a cracked red ball.
   · Reshman at Base Camp fishes it out of his puddle for 25 bolts or
     one Golden Stub (a Shadow Ticket), so you can smash it safely.
   · Sudden Death and practice fights never leave one. */
const fePractice = () => (typeof DR !== 'undefined' && DR.on) || (typeof LG !== 'undefined' && LG.on) || (typeof Gaunt !== 'undefined' && Gaunt.run)
  || (typeof Cage !== 'undefined' && Cage.on) || (Zone.room && Zone.room.zone === 'z11') || (Save.data.q && Save.data.q.sudden);
const feSpring = () => typeof diffKey === 'function' && diffKey() === 'spring';
const feCracked = () => { const E = feQ() && feQ().echo; return !!E && E.cracked !== false; };
const FE_CAP = 0.66;
const _feDie = Player.die;
Player.die = function () {
  try {
    if (!fePractice() && Zone.room) {
      const D = Save.data, q = feQ(), old = q.echo, s = this.lastSafe || { x: this.x, y: this.y };
      const r = roomAt(s.x + this.w / 2, s.y + this.h / 2) || Zone.room;
      const spring = feSpring(), have = D.bolts || 0, drop = spring ? Math.floor(have / 2) : have;
      if (old) FE.lostMsg = old.bolts ? `YOUR OLD FOUL ECHO FADED · ${old.bolts} BOLTS GONE FOR GOOD` : 'YOUR OLD FOUL ECHO FADED';
      q.echo = spring && !drop ? null
        : { page: PAGE_FILE, room: r.id, roomName: r.name, x: s.x + this.w / 2, y: s.y + this.h, bolts: drop, cracked: !spring, at: Date.now() };
      D.bolts = have - drop; saveGame();
      applyUpgrades();
      const e = q.echo;
      FE.near = false;
      setTimeout(() => {
        if (FE.lostMsg) { toast(FE.lostMsg); FE.lostMsg = null; }
        if (e) setTimeout(() => toast(`YOUR FOUL ECHO WAITS IN ${e.roomName.toUpperCase()} · SHATTER IT TO GET ${e.bolts} BOLTS BACK${e.cracked ? ' AND MEND YOUR HYPE ORB' : ''}`), 1600);
      }, 2000);
    }
  } catch (err) { logErr('foul-echo: die', err); }
  return _feDie.apply(this, arguments);
};
// the cracked orb holds only 66% Hype
const _feApply = applyUpgrades;
applyUpgrades = function () {
  _feApply.apply(this, arguments);
  if (feCracked()) { Player.hypeMax = Math.round((Player.hypeMax || 99) * FE_CAP); Player.hype = Math.min(Player.hype || 0, Player.hypeMax); }
};
// the echo's pitch: slow, dark, and it bends toward you
class FeCurve extends Bolt {
  constructor(x, y, vx, vy) { super(x, y, vx, vy); this.r = 9; this.life = 5; }
  update(dt) {
    if (!this.friendly) {
      const c = Player.center(), a = Math.atan2(this.vy, this.vx), want = Math.atan2(c.y - this.y, c.x - this.x), sp = Math.hypot(this.vx, this.vy);
      const da = ((want - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI, na = a + clamp(da, -1.2 * dt, 1.2 * dt);
      this.vx = Math.cos(na) * sp; this.vy = Math.sin(na) * sp;
      if (Math.random() < 0.5) spawnParticle({ x: this.x, y: this.y, life: 0.4, size: rand(3, 6), color: 'rgba(30,18,44,.7)', type: 'puff', drag: 1 });
    }
    super.update(dt);
  }
}
class FoulEcho {
  constructor(E) {
    Object.assign(this, { type: 'echo', E, w: 26, h: 50, hp: 2, maxHp: 2, flash: 0, harmful: !E.tame, pogoable: true, givesHype: true, noCull: true,
      tame: !!E.tame, state: 'hover', t: 0, linger: 0, cool: 1.5, sink: 0, anim: rand(0, 6), facing: -1, hx: E.x, hy: E.y - 50 });
    this.x = E.x - this.w / 2; this.y = this.hy;
  }
  update(dt) {
    this.anim += dt; this.flash = Math.max(0, this.flash - dt); this.t -= dt; this.cool -= dt; this.sink = Math.max(0, this.sink - dt * 3);
    const P = Player, c = P.center(), cx = this.x + this.w / 2, cy = this.y + this.h / 2, d = Math.hypot(c.x - cx, c.y - cy);
    this.facing = sgn(c.x - cx) || this.facing;
    // defensive: it hovers over its ledge and leans away from you, never chases
    const away = d < 160 ? -this.facing * 40 : 0;
    this.x = approach(this.x, this.hx - this.w / 2 + away, 70 * dt);
    this.y = approach(this.y, this.hy + Math.sin(this.anim * 2) * 6 + this.sink * 18, 120 * dt);
    if (this.tame || P.dead) return;
    this.linger = d < 420 ? this.linger + dt : Math.max(0, this.linger - dt * 2);
    if (this.state === 'hover' && this.linger > 2.5 && this.cool <= 0) { this.state = 'wind'; this.t = 0.7; SFX.windup(); }
    else if (this.state === 'wind' && this.t <= 0) {
      Bolts.push(new FeCurve(cx + this.facing * 10, cy - 8, this.facing * 150, -110));
      SFX.toss && SFX.toss(); this.state = 'hover'; this.cool = rand(3, 4.2);
    }
    if (Math.random() < 0.3) spawnParticle({ x: this.x + rand(0, this.w), y: this.y + this.h, vx: rand(-20, 20), vy: rand(-60, -20), life: 0.7, size: rand(3, 6), color: 'rgba(60,40,90,.5)', type: 'puff', drag: 1 });
  }
  takeHit(dmg, kx, ky, src) {
    if (src === 'down') { this.sink = 1; this.flash = 0.06; return true; }   // a pogo: bounce, no crack
    this.hp -= 1; this.flash = 0.14; this.x += (kx || 0) * 14;
    if (this.state === 'wind') { this.state = 'hover'; this.cool = 1.6; }
    if (this.hp <= 0) { feReclaim(this); return true; }
    SFX.clang(); addShake(4); pop(this.x + this.w / 2, this.y - 6, 'CRACK!', { size: 30, color: '#e8361c' });
    return true;
  }
  draw() {
    const cx = this.x + this.w / 2, fy = this.y + this.h, t = this.anim;
    ctx.save(); ctx.translate(cx, fy); ctx.scale(this.facing, 1); ctx.lineJoin = 'round';
    ctx.globalAlpha = (this.tame ? 0.62 : 0.82) + Math.sin(t * 5) * 0.08;
    const col = this.flash > 0 ? '#ffffff' : '#2a1e3a';
    // a wisp instead of legs
    ctx.beginPath(); ctx.moveTo(-10, -18); ctx.quadraticCurveTo(-4 + Math.sin(t * 4) * 5, 4, 2, 6); ctx.quadraticCurveTo(8, -6, 10, -18); ctx.closePath(); inked(col, 2.5);
    rr(-11, -40, 22, 24, 6); inked(col, 2.5);
    ctx.beginPath(); ctx.arc(1, -48, 9, 0, 7); inked(col, 2.5);
    ctx.beginPath(); ctx.arc(1, -51, 9.5, Math.PI, 0); ctx.closePath(); inked('#140e1e', 2);   // the cap
    ctx.fillStyle = '#140e1e'; ctx.fillRect(4, -53, 10, 3);
    ctx.fillStyle = '#b388ff'; ctx.fillRect(4, -49, 3, 2.5);   // one glowing eye
    if (this.hp < this.maxHp) { ctx.strokeStyle = '#e8361c'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-6, -38); ctx.lineTo(0, -30); ctx.lineTo(-3, -24); ctx.lineTo(4, -18); ctx.stroke(); }
    // the shadow bat: raised to pitch, otherwise tapping the ground
    const ba = this.state === 'wind' ? -2.2 : -0.8 + Math.max(0, Math.sin(t * 4.5)) * 0.35;
    ctx.save(); ctx.translate(8, -32); ctx.rotate(ba); rr(-2, -30, 5, 30, 2); inked('#3a2a52', 2); ctx.restore();
    ctx.restore();
    const lbl = this.E.bolts ? this.E.bolts + ' BOLTS' : this.E.cracked !== false ? 'CRACKED ORB' : '';
    if (lbl) { ctx.save(); ctx.font = `12px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(179,136,255,.85)'; ctx.fillText(lbl, cx, this.y - 10); ctx.restore(); }
  }
}
function feReclaim(e) {
  const D = Save.data, q = feQ(), n = (q.echo && q.echo.bolts) || 0, mend = feCracked();
  e.dead = true; q.echo = null; FE.near = false; D.bolts = (D.bolts || 0) + n; saveGame(); applyUpgrades();
  if (mend) Player.hype = Player.hypeMax;   // the orb seals and fills to the brim
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
  burst(cx, cy, 30, { colors: ['#b388ff', '#2a1e3a', '#e8361c'], maxSpeed: 520, grav: 600 });
  // the shower: the bolts spray out and pour into Nathan (already counted, so none get lost in a pit)
  for (let i = 0; i < Math.min(60, n); i++) spawnParticle({ x: cx, y: cy, vx: rand(-260, 260), vy: rand(-560, -240), life: rand(0.7, 1.2), size: rand(4, 6), color: '#f2c14e', type: 'dot', grav: 900 });
  for (let i = 0; i < Math.min(6, Math.ceil(n / 10)); i++) setTimeout(() => { SFX.coin && SFX.coin(); }, 120 + i * 90);
  ring(cx, cy, 10, 120, 0.5, '#e8361c', 6); SFX.unlock(); addShake(8);
  pop(cx, cy - 30, n ? `+${n} BOLTS` : 'SHATTERED!', { size: 40, color: '#f2c14e' });
  toast(`FOUL ECHO SHATTERED · ${n} BOLTS BACK${mend ? ' · YOUR HYPE ORB IS WHOLE AND FULL AGAIN' : ''}`);
}
function feSpawn(r) {
  const E = feQ() && feQ().echo;
  if (!E || E.page !== PAGE_FILE || !r || E.room !== r.id) return;
  if (Enemies.some(e => e.type === 'echo' && !e.dead)) return;
  Enemies.push(new FoulEcho(E));
}
// is the echo in this room or right next door?
function feNear(r) {
  const E = feQ() && feQ().echo;
  if (!E || E.tame || E.page !== PAGE_FILE || !r) return false;
  if (E.room === r.id) return true;
  return typeof LINKS !== 'undefined' && LINKS.some(([a, b]) => (a === r.id && b === E.room) || (b === r.id && a === E.room));
}
const _feEnter = enterRoom;
enterRoom = function (r) {
  _feEnter(r);
  try { feSpawn(r); const was = FE.near; FE.near = feNear(r); if (FE.near && !was) FE.beat = 0; } catch (e) { logErr('foul-echo: spawn', e); }
};
if (Zone.room) { try { feSpawn(Zone.room); FE.near = feNear(Zone.room); } catch (e) { logErr('foul-echo: boot', e); } }

// the cue: the music dips, an echoing crowd murmurs, a bat taps home plate (tap-tap … tap-tap)
setInterval(() => {
  try {
    if (!FE.near || !feQ().echo || Player.dead || Story.active || (typeof UI !== 'undefined' && UI.modal) || document.hidden) return;
    const b = FE.beat = (FE.beat || 0) + 1;
    if (b % 14 === 1) { if (typeof Music !== 'undefined') Music.duck(0.55, 3.2); SFX.crowd(2.2); }
    if (b % 7 === 1) { SFX.tick(); setTimeout(() => SFX.tick(), 170); }
  } catch (e) { logErr('foul-echo: cue', e); }
}, 200);

/* ---------- Reshman's Shadow Retrieval (Base Camp) ---------- */
const feAtCamp = () => typeof NPCs !== 'undefined' && NPCs.some(n => n.kind === 'reshman' && n.zone === 'z1');
function feRetrieval(id, cost, stubs) {
  return { id, name: 'Shadow Retrieval' + (stubs ? ' · Ticket' : ''), cost, stubs, tag: 'ECHO',
    desc: (stubs ? 'Hand over a Golden Stub as a Shadow Ticket. ' : '') + 'Reshman reaches into his puddle and pulls your Foul Echo here, to Base Camp, where it can\'t hit back.',
    line: '"…blorp."', owned: () => false, grant: () => {}, after: feShadowPull };
}
function feShadowPull() {
  const E = feQ().echo, P = Player; if (!E || !Zone.room) return;
  const rs = NPCs.find(n => n.kind === 'reshman'), rh = () => rs ? rs.head() : Story.nathanHead();
  const c = P.center(), side = pointSolid(c.x + P.facing * 70, c.y) ? -P.facing : P.facing, hx = pointSolid(c.x + side * 70, c.y) ? c.x : c.x + side * 70;
  Story.run(async () => {
    await Story.say('RESHMAN', '…blorp.', rh);
    SFX.blorp(); if (rs) burst(rs.x, rs.y - 4, 18, { colors: ['#140e1e', '#6a4a8a'], maxSpeed: 260 });
    Object.assign(E, { page: PAGE_FILE, room: Zone.room.id, roomName: Zone.room.name, x: hx, y: P.y + P.h, tame: true });
    saveGame(); FE.near = false; feSpawn(Zone.room);
    await Story.say('RESHMAN', 'Found it sulking in a puddle. It\'s yours. Smash it. Gently.', rh);
  });
}
if (typeof VENDORS !== 'undefined' && VENDORS.reshman) {
  const V = VENDORS.reshman, _feStock = V.items;
  V.poorStubs = V.poorStubs || (n => '"…a Golden Stub. Shadow Ticket. You have none. …blorp."');
  V.items = function () {
    const list = (typeof _feStock === 'function' ? _feStock() : _feStock).slice(), E = feQ().echo;
    if (E && !E.tame && feAtCamp() && !(E.page === PAGE_FILE && Zone.room && E.room === Zone.room.id)) list.unshift(feRetrieval('fe_bolts', 25, 0), feRetrieval('fe_stub', 0, 1));
    return list;
  };
}

/* ---------- the pause map: a cracked flame-red baseball, pulsing ---------- */
function feMapIcon(g, x, y, t) {
  const p = (t * 0.8) % 1;
  g.save();
  g.strokeStyle = `rgba(232,54,28,${0.8 * (1 - p)})`; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 8 + p * 16, 0, 7); g.stroke();
  const s = 1 + Math.sin(t * 5) * 0.08;
  g.translate(x, y); g.scale(s, s);
  g.fillStyle = '#e8361c'; g.strokeStyle = '#3a1208'; g.lineWidth = 1.6; g.beginPath(); g.arc(0, 0, 7, 0, 7); g.fill(); g.stroke();
  g.strokeStyle = '#f3ead8'; g.lineWidth = 1; g.beginPath(); g.arc(-9, 0, 6, -0.8, 0.8); g.stroke(); g.beginPath(); g.arc(9, 0, 6, Math.PI - 0.8, Math.PI + 0.8); g.stroke();
  g.strokeStyle = '#140e1e'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-2, -7); g.lineTo(1, -2); g.lineTo(-1, 1); g.lineTo(2, 7); g.stroke();
  g.restore();
}
if (typeof pmDrawZone === 'function') {
  const _feMap = pmDrawZone;
  pmDrawZone = function (now) {
    const r = _feMap.apply(this, arguments);
    try {
      const E = feQ().echo, M = MapView, rm = E && ROOM[E.room];
      if (rm && E.page === PAGE_FILE && typeof ML !== 'undefined' && !ML.broken && M.rooms && M.rooms.includes(rm) && pmRoomZone(rm) === PM.zone && now - M.t0 > 450) {
        const g = M.cv.getContext('2d'), [x, y] = mlT(E.x / TILE, (E.y - 30) / TILE);
        g.save(); g.setTransform(M.dpr, 0, 0, M.dpr, 0, 0); feMapIcon(g, x, y, now / 1000); g.restore();
      }
    } catch (e) { logErr('foul-echo: map', e); }
    return r;
  };
}

// the cracked orb on the HUD
(function () {
  const st = document.createElement('style');
  st.textContent = '#hype.fe-cracked{filter:saturate(.55) brightness(.9);box-shadow:0 0 0 2px rgba(232,54,28,.55) inset}'
    + '#hype.fe-cracked::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(115deg,transparent 46%,rgba(232,54,28,.9) 47%,rgba(232,54,28,.9) 49%,transparent 50%),linear-gradient(65deg,transparent 60%,rgba(232,54,28,.7) 61%,rgba(232,54,28,.7) 62.5%,transparent 63.5%)}';
  document.head.appendChild(st);
  setInterval(() => {
    const el = document.getElementById('hype'); if (!el) return;
    const on = feCracked();
    if (el.classList.contains('fe-cracked') !== on) { el.classList.toggle('fe-cracked', on); if (getComputedStyle(el).position === 'static') el.style.position = 'relative'; }
  }, 500);
  // an echo left on another page: say where, once
  setTimeout(() => {
    const E = Save.data.q && Save.data.q.echo;
    if (E && E.page !== PAGE_FILE && !FE.shown) { FE.shown = true; toast(`YOUR FOUL ECHO STILL WAITS IN ${String(E.roomName || 'ANOTHER ZONE').toUpperCase()} · ${E.bolts} BOLTS`); }
  }, 4000);
})();
