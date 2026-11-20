'use strict';
/* =========================================================
   VOICE BARKS · 1–2 second catchphrases: a pitched synth babble
   plus a comic caption bubble (no recorded voice acting).
   Loaded after zone/badges.js on every story page.
   ========================================================= */
const VOICES = {
  nathan:  { pitch: 1.3,  color: '#f2c14e' },
  josh:    { pitch: 1.1,  color: '#6fd3ff' },
  lars:    { pitch: 0.6,  color: '#ff8a2a' },
  deniz:   { pitch: 0.78, color: '#9fe6ff' },
  reshman: { pitch: 1.9,  color: '#9be36a' },
};
const Bark = {
  list: [], cd: {},
  // who: a VOICES key · at: () => {x, y} in world space, or null for voice only
  say(who, text, at, o = {}) {
    const now = Game.time, key = who + text, V = VOICES[who] || VOICES.nathan;
    if ((this.cd[key] || -99) > now - (o.cooldown || 4)) return false;
    this.cd[key] = now;
    const words = text.split(/\s+/).length;
    SFX.babble(V.pitch, Math.max(2, Math.min(7, Math.round(words * 1.6))), /!$/.test(text), who);
    if (at) { this.list = this.list.filter(b => b.who !== who); this.list.push({ who, text, at, t: 0, life: o.dur || 1.6, color: V.color }); }
    return true;
  },
  update(dt) { for (const b of this.list) b.t += dt; this.list = this.list.filter(b => b.t < b.life); },
  draw() {
    for (const b of this.list) {
      const p = b.at(); if (!p) continue;
      const k = Math.min(1, b.t / 0.1), fade = Math.min(1, (b.life - b.t) / 0.25), y = p.y - 14 - k * 6;
      ctx.save(); ctx.globalAlpha = fade; ctx.font = `15px ${DISPLAY_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const w = ctx.measureText(b.text).width + 20, h = 26, s = 0.7 + 0.3 * k;
      ctx.translate(p.x, y); ctx.scale(s, s);
      ctx.beginPath(); ctx.moveTo(-6, h / 2 - 1); ctx.lineTo(0, h / 2 + 9); ctx.lineTo(7, h / 2 - 1); ctx.closePath(); inked('#fff8ea', 2.5);
      rr(-w / 2, -h / 2, w, h, 7); inked('#fff8ea', 2.5);
      ctx.fillStyle = '#fff8ea'; ctx.fillRect(-6, h / 2 - 4, 13, 4);
      ctx.fillStyle = INK; ctx.fillText(b.text, 0, 1);
      ctx.fillStyle = b.color; ctx.fillRect(-w / 2 + 4, -h / 2 + 3, 4, h - 6);
      ctx.restore();
    }
  },
};
const atPlayer = () => (Player.dead ? null : { x: Player.x + Player.w / 2, y: Player.y - 8 });
const atThing = o => () => (o && !o.gone && !o.dead ? { x: (o.w ? o.x + o.w / 2 : o.x), y: (o.h ? o.y : o.y - 44) - 4 } : null);

/* ---------- Nathan ---------- */
// "Play ball!": every boss fight, and waking up at a bench
const _bkBoss = BossBar.show;
BossBar.show = function (name) { const r = _bkBoss.apply(this, arguments); setTimeout(() => Bark.say('nathan', 'PLAY BALL!', atPlayer, { cooldown: 3 }), 350); return r; };
const _bkRespawn = PAGE.onRespawn;
PAGE.onRespawn = () => { if (_bkRespawn) _bkRespawn(); setTimeout(() => Bark.say('nathan', 'PLAY BALL!', atPlayer, { cooldown: 30 }), 700); };
// "Out of the park!": finishing an enemy with the 3rd hit of a combo
const _bkDie = onEnemyDie;
onEnemyDie = function (e) {
  _bkDie(e);
  if (Player.comboIdx === 3 && Player.attackT > 0 && Math.random() < 0.6) Bark.say('nathan', 'OUT OF THE PARK!', atPlayer, { cooldown: 7 });
};
// "MVP baby!": the heal already shouts it in comic letters, so this is just the voice
const _bkHeal = Player.doHeal;
Player.doHeal = function () { const r = _bkHeal.apply(this, arguments); Bark.say('nathan', 'MVP BABY!', null, { cooldown: 1 }); return r; };

/* ---------- the shops: Josh, Lars, Reshman ---------- */
const barkHello = (v, who, line, odds) => {
  const V = VENDORS[v]; if (!V) return;
  const h = V.hello;
  V.hello = D => { const t = Math.random() < odds ? line : h(D); Bark.say(who, t.replace(/["“”]/g, ''), null, { cooldown: 0 }); return t; };
};
barkHello('josh', 'josh', '"Works on my machine."', 0.4);
barkHello('lars', 'lars', '"Rock and stone!"', 0.45);
barkHello('reshman', 'reshman', '"…blorp."', 0.3);
const _bkBuy = buy;
buy = function (i) {
  const v = Shop.v, b0 = Save.data.bolts, o0 = Save.data.ore;
  _bkBuy(i);
  if (v === 'lars' && (Save.data.bolts < b0 || Save.data.ore < o0)) setTimeout(() => {
    if (UI.modal === 'shop' && Shop.v === 'lars') { $('#joshLine').textContent = '"Is that all? …Rock and stone!"'; Bark.say('lars', 'Is that all? Rock and stone!', null, { cooldown: 0 }); }
  }, 1300);
  if (v === 'josh' && Save.data.bolts < b0 && Math.random() < 0.5) setTimeout(() => {
    if (UI.modal === 'shop' && Shop.v === 'josh') { $('#joshLine').textContent = '"Installed. Works on my machine."'; Bark.say('josh', 'Works on my machine.', null, { cooldown: 0 }); }
  }, 1300);
};

/* ---------- Deniz ---------- */
if (typeof Deniz === 'function') {
  const _bkBegin = Deniz.prototype.begin;
  Deniz.prototype.begin = function () { const r = _bkBegin.apply(this, arguments); if (this.say) this.say('KNEEL.', 1.4); Bark.say('deniz', 'KNEEL.', null, { cooldown: 2 }); return r; };
}
if (Story.denizDefeat) {
  const _bkDeniz = Story.denizDefeat;
  Story.denizDefeat = function (b) { setTimeout(() => Bark.say('deniz', 'Whoa, man...', atThing(b), { dur: 2.2, cooldown: 2 }), 900); return _bkDeniz.apply(this, arguments); };
}

/* ---------- every frame: Reshman jumps when you swing near him ---------- */
const _bkUpdate = PAGE.update;
PAGE.update = dt => {
  if (_bkUpdate) _bkUpdate(dt);
  for (const n of NPCs) if (n.kind === 'reshman' && !n.gone) {
    const c = Player.center();
    if (Player.attackT > 0 && !n.swatT && Math.hypot(c.x - n.x, c.y - (n.y - 20)) < 90) { n.startled = 0.6; n.swatT = 1.2; SFX.blorp(); }
    n.swatT = Math.max(0, (n.swatT || 0) - dt);
    if (n.startled > (n.lastStartled || 0) + 0.05) {
      pop(n.x, n.y - 58, 'BLORP!', { size: 30, color: '#9be36a', burstColor: '#2a5a3a' });
      Bark.say('reshman', '...blorp.', atThing(n), { cooldown: 1.5 });
    }
    n.lastStartled = n.startled;
  }
};
const _bkTick = PAGE.tick;
PAGE.tick = dt => { if (_bkTick) _bkTick(dt); Bark.update(dt); };
(function () {
  const H = Game.hooks, o = H.top;
  H.top = function (cam) { if (o) o.call(H, cam); Bark.draw(); };
})();
