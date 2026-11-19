'use strict';
/* =========================================================
   BOSS REMATCHES · no five-line chat on the second try
   The first time you meet a boss, its full intro plays. From then
   on (Save.data.q.bossIntroSeen[id]) the door slams, the fight
   starts at once, Nathan keeps moving, and the boss throws one
   line over its head in a floating bubble.
   Dream Rematches and the Hall of Legends get a 1-second shout
   instead (and every Hall boss shouts or quips, every time).
   Loaded after the Hall of Legends files on every story page.
   ========================================================= */
const REMATCH = {
  server:  { voice: { pitch: 0.5, color: '#ff4a3a' },  line: 'ERROR 409: RE-ENGAGING INTRUDER.' },
  adam:    { voice: { pitch: 1.1, color: '#3d6ee0' },  line: 'Back for another round? Let\'s keep it quick, Nathan.' },
  renas:   { voice: { pitch: 1.7, color: '#ff8a2a' },  line: 'You actually came back? Good luck catching me this time!' },
  daniel:  { voice: { pitch: 1.4, color: '#ff4aa0' },  line: 'Ooh, an encore! Let\'s light the big ones!' },
  fionn:   { voice: { pitch: 0.8, color: '#9be36a' },  line: 'Ah, you returned. Shall we skip the lecture and go straight to the minerals?' },
  milo:    { voice: { pitch: 1.2, color: '#b98bff' },  line: 'The storm does not repeat itself… strike fast!' },
  deniz:   { voice: { pitch: 0.7, color: '#9fe6ff' },  line: 'You dare return to my court? Kneel.' },
  evil:    { voice: { pitch: 0.62, color: '#d9b8ff' }, line: 'No timeouts, Nathan. Let\'s finish this.' },
  zennith: { voice: { pitch: 0.45, color: '#7a1f6e' }, line: 'You cannot outrun your own shadow.' },
};
// dream bosses and the Hall's own legends: one short shout (checked in this order)
const REMATCH_SHOUTS = [
  [/PYRO-LORD/, 'daniel', 'MAXIMUM FUSE!'],
  [/CRYSTAL SOVEREIGN/, 'fionn', 'UNYIELDING STONE!'],
  [/ARCHMAGE/, 'milo', 'UNLEASH THE TEMPEST!'],
  [/EMPEROR DENIZ/, 'deniz', 'ETERNAL WINTER!'],
  [/MONFORT/, 'monfort', 'ON THE CLOCK!'],
  [/PIP|SQUEAK/, 'twins', 'DOUBLE TROUBLE!'],
  [/PRIME ADAM/, 'prime', 'MATCH POINT!'],
];
// in the Hall, the classic bosses use their rematch line (Evil Adam and Prime Adam before plain Adam)
const REMATCH_HALL = [[/ROGUE SERVER/, 'server'], [/EVIL ADAM/, 'evil'], [/\bADAM\b/, 'adam'], [/DANIEL/, 'daniel'], [/FIONN/, 'fionn'], [/MILO/, 'milo'], [/DENIZ/, 'deniz'], [/ZENNITH/, 'zennith']];
Object.assign(VOICES, Object.fromEntries(Object.entries(REMATCH).map(([k, v]) => ['rm_' + k, v.voice])), {
  rm_monfort: { pitch: 0.9, color: '#f2c14e' }, rm_twins: { pitch: 1.8, color: '#c8b8ff' }, rm_prime: { pitch: 1.05, color: '#ffd700' },
});

const rmSeen = id => { const q = Save.data.q; q.bossIntroSeen = q.bossIntroSeen || {}; return !!q.bossIntroSeen[id]; };
const rmMark = id => { const q = Save.data.q; q.bossIntroSeen = q.bossIntroSeen || {}; if (!q.bossIntroSeen[id]) { q.bossIntroSeen[id] = 1; saveGame(); } };
// a floating line over a boss: no pause, no text box
function rmBark(id, text, at, shout) {
  const where = at || atThing(Zone.boss);
  setTimeout(() => Bark.say('rm_' + id, text, where, { dur: shout ? 1.1 : 2.6, cooldown: 1 }), shout ? 120 : 250);
}
// play the full intro the first time; afterwards run `fast` (which starts the fight) and bark
function rmWrapIntro(name, id, fast) {
  if (typeof Story[name] !== 'function') return;
  const full = Story[name];
  Story[name] = function (b) {
    if (rmSeen(id) && !Story.active) {
      try { const at = fast.call(this, b); rmBark(id, REMATCH[id].line, at || atThing(b)); }
      catch (e) { logErr('boss-rematch: ' + id, e); return full.apply(this, arguments); }
      return Promise.resolve();
    }
    const r = full.apply(this, arguments);
    return r && r.then ? r.then(v => { rmMark(id); return v; }) : (rmMark(id), r);
  };
}

/* ---------- the story bosses ---------- */
rmWrapIntro('adamIntro', 'adam', a => {
  setLock(A.adamLock, true); SFX.gate(); a.facing = -1;
  BossBar.show('ADAM · THE RIVAL'); a.begin(); SFX.drill();
  pop(a.x + a.w / 2, a.y - 40, 'MATCH START!', { size: 44 });
  return () => (a.dead ? null : { x: a.x + a.w / 2, y: a.y - 18 });
});
rmWrapIntro('danielIntro', 'daniel', d => {
  setLock(A.danielLock, true); SFX.gate();
  BossBar.show('DANIEL · THE PYROMANIAC'); d.begin(); SFX.firework();
  return () => (d.dead ? null : { x: d.fx, y: d.fy - 62 });
});
rmWrapIntro('fionnIntro', 'fionn', f => {
  setLock(A.fionnLock, true); SFX.gate(); f.facing = -1;
  BossBar.show('FIONN · KEEPER OF PEBBLES'); f.begin(); SFX.drill();
  return () => (f.dead ? null : { x: f.x + f.w / 2, y: f.y - 14 });
});
rmWrapIntro('miloIntro', 'milo', m => {
  setLock(A.miloLock, true); SFX.gate(); SFX.thunder(); Game.flashWhite = 0.3;
  BossBar.show('MILO · THE STORM-WRECKED'); m.begin(); SFX.drill();
  return () => (m.dead ? null : { x: m.x + m.w / 2, y: m.y - 10 });
});
rmWrapIntro('denizIntro', 'deniz', d => {
  setLock(A.denizLock, true); SFX.gate(); d.facing = 1;
  BossBar.show('KING DENIZ · THE GLACIER CROWN'); d.begin(); SFX.drill();
  return () => (d.dead ? null : { x: d.x + d.w / 2, y: d.y - 18 });
});
rmWrapIntro('evilIntro', 'evil', b => {
  setLock(A.courtLock, true); SFX.gate(); b.facing = -1;
  BossBar.show('EVIL ADAM · MATCH POINT'); b.begin(); SFX.drill(); SFX.crowd(2.4);
  return () => (b.dead ? null : { x: b.x + b.w / 2, y: b.y - 16 });
});
// Zennith already remembers its first meeting (Save.data.coreSeen)
if (typeof Story.coreReveal === 'function') {
  const _full = Story.coreReveal;
  Story.coreReveal = function (z) {
    if (!Save.data.coreSeen || Story.active) return _full.apply(this, arguments);
    try {
      SFX.musicAuto(); BossBar.show('ZENNITH · THE UNFORGIVING'); z.begin(); SFX.drill();
      rmBark('zennith', REMATCH.zennith.line, () => (z.dead ? null : { x: z.x + z.w / 2, y: z.y - 10 }));
    } catch (e) { logErr('boss-rematch: zennith', e); return _full.apply(this, arguments); }
    return Promise.resolve();
  };
}
// the Rogue Server never had a talking intro: it just gets its line on a rerun
if (typeof startBoss === 'function') {
  const _sb = startBoss;
  startBoss = function () {
    const again = rmSeen('server'), r = _sb.apply(this, arguments);
    if (again) rmBark('server', REMATCH.server.line, atThing(Zone.boss)); else rmMark('server');
    return r;
  };
}
// Renas: the chase restarts without a scene already, so he just taunts
if (typeof startChase === 'function') {
  const _sc = startChase;
  startChase = function () {
    const again = rmSeen('renas'), r = _sc.apply(this, arguments);
    if (again) rmBark('renas', REMATCH.renas.line, () => (Act.renas ? { x: Act.renas.x, y: Act.renas.y - 66 } : null)); else rmMark('renas');
    return r;
  };
}

/* ---------- Dream Rematches and the Hall of Legends: a shout as the bar drops in ---------- */
(function () {
  const _show = BossBar.show;
  BossBar.show = function (name) {
    const r = _show.apply(this, arguments);
    const dream = typeof DR !== 'undefined' && DR.on, hall = typeof LG !== 'undefined' && LG.on;
    if (!dream && !hall) return r;
    const txt = String(name || '').toUpperCase();
    const s = REMATCH_SHOUTS.find(([re]) => re.test(txt));
    if (s) { setTimeout(() => rmBark(s[1], s[2], atThing(Zone.boss), true), 60); return r; }
    if (hall) { const h = REMATCH_HALL.find(([re]) => re.test(txt)); if (h) setTimeout(() => rmBark(h[1], REMATCH[h[1]].line, atThing(Zone.boss)), 60); }
    return r;
  };
})();
