'use strict';
/* =========================================================
   THE HALL OF LEGENDS · the hall (act3.html#legends)
   The Championship Colosseum, dreaming in marble and sunlight:
     wake-up pad · The Umpire · the Golden Dugout Bench ·
     four golden cup gates · fifteen marble rival statues
   Talk to the Umpire, press up at a statue (pick a tier) or at a
   gate (lock on bindings, then PLAY BALL).
   The fights themselves: zone/legends-fight.js.
   ========================================================= */
const LG_X = { pad: 243, ump: 247, bench: 251.5, gates: [256.5, 260.5, 264.5, 268.5], statue0: 273, step: 3 };
const lgSpot = tx => ({ x: tx * TILE + TILE / 2, y: 41 * TILE });
const lgNear = (o, reach = 26) => { const c = Player.center(); return !Player.dead && Math.abs(c.x - o.x) < reach && Math.abs(Player.y + Player.h - o.y) < 16; };

class LgUmpire {
  constructor(x, y) { Object.assign(this, { kind: 'umpire', x, y, t: 0, near: false, unmask: 0, gone: false }); }
  hover() { return this.y - 34 + Math.sin(this.t * 1.6) * 5; }
  head() { return { x: this.x, y: this.hover() - 96 }; }
  update(dt) { this.t += dt; this.near = lgNear(this, 30); }
  interact() { if (!Story.active) Story.umpireTalk(this); }
  draw() { drawUmpire(this.x, this.hover(), this.t, { unmask: this.unmask }); if (this.near && !Story.active) gxPrompt('THE UMPIRE', this.x, this.y - 168); }
}
class LgBench {   // the Golden Dugout Bench: sit to swap your stance and badges as often as you like
  constructor(x, y, rest) { Object.assign(this, { kind: 'lgbench', x, y, t: 0, near: false, gone: false, lgRest: !!rest }); }
  update(dt) { this.t += dt; this.near = lgNear(this, 34); }
  interact() {
    const P = Player; if (Story.active || P.sitting || P.sit > 0.01) return;
    P.sitDown(this, () => {
      P.hp = P.maxHp; HUD.hpPop = true; SFX.heal();
      try { benchRestFx(P); } catch (e) { logErr('legends: bench fx', e); }
      if (typeof pmOpen === 'function') pmOpen('crests');
    });
  }
  draw() { drawLgBench(this.x, this.y, this.t); if (this.near && !Player.sitting && !Story.active) gxPrompt('THE GOLDEN DUGOUT · SIT', this.x, this.y - 70); }
}
class LgFountain {   // the Hype fountain at the seventh-inning stretch
  constructor(x, y) { Object.assign(this, { kind: 'lgfountain', x, y, t: 0, near: false, gone: false, lgRest: true, cd: 0 }); }
  update(dt) { this.t += dt; this.cd = Math.max(0, this.cd - dt); this.near = lgNear(this, 30); }
  interact() {
    const P = Player; if (this.cd > 0) return;
    this.cd = 1; P.hype = P.hypeMax || 99; P.hp = P.maxHp; HUD.hpPop = true; SFX.heal();
    ring(this.x, this.y - 40, 8, 70, 0.4, FLAME, 6);
    pop(this.x, this.y - 80, 'HYPE REFILLED!', { size: 28, color: GOLD, burstColor: FLAME });
  }
  draw() { drawLgFountain(this.x, this.y, this.t); if (this.near && !Story.active) gxPrompt('HYPE FOUNTAIN', this.x, this.y - 96); }
}
class LgStatue {
  constructor(x, y, R) { Object.assign(this, { kind: 'lgstatue', x, y, R, t: Math.random() * 6, near: false, gone: false }); }
  update(dt) { this.t += dt; this.near = lgNear(this, 22); }
  interact() { if (Story.active) return; const why = lgRivalLock(this.R); if (why) { SFX.deny(); toast(why); return; } lgStatueMenu(this.R); }
  draw() {
    const locked = !!lgRivalLock(this.R);
    drawLgStatue(this.x, this.y, this.R, lgQ().rivals[this.R.k] || {}, this.t, locked);
    if (this.near && !Story.active) gxPrompt(locked ? 'A VEILED STATUE' : this.R.short.toUpperCase(), this.x, this.y - 112);
  }
}
class LgGate {
  constructor(x, y, C) { Object.assign(this, { kind: 'lggate', x, y, C, t: Math.random() * 6, near: false, gone: false }); }
  update(dt) { this.t += dt; this.near = lgNear(this, 26); }
  interact() { if (Story.active) return; const why = lgCupLock(this.C); if (why) { SFX.deny(); toast(why); return; } lgGateMenu(this.C); }
  draw() {
    drawLgGate(this.x, this.y, this.C, lgQ().cups[this.C.key], this.t, !!lgCupLock(this.C));
    if (this.near && !Story.active) gxPrompt(this.C.name, this.x, this.y - 186);
  }
}

// fill the hall with its furniture (called on entering the Colosseum while dreaming)
function lgBuildHall() {
  NPCs.push(new GPost(lgSpot(LG_X.pad).x, 41 * TILE, { look: 'pad', label: 'WAKE UP · BACK TO BASE CAMP', go: () => lgWake() }));
  NPCs.push(new LgUmpire(lgSpot(LG_X.ump).x, 41 * TILE));
  NPCs.push(new LgBench(lgSpot(LG_X.bench).x, 41 * TILE));
  LG_CUP_ORDER.forEach((k, i) => NPCs.push(new LgGate(lgSpot(LG_X.gates[i]).x, 41 * TILE, LG_CUPS[k])));
  LG_RIVALS.forEach((R, i) => NPCs.push(new LgStatue(lgSpot(LG_X.statue0 + i * LG_X.step).x, 41 * TILE, R)));
}
function lgWake() {
  const q = Save.data.q;
  LG.on = false; q.dreamWoke = 'YOU WAKE UP ON THE CUSHION · THE VIP TICKET IS STILL WARM'; saveGame();
  goToPage('zone1.html#from-dream');
}

/* ---------- the menus ---------- */
function lgStatueMenu(R) {
  LgMenu.open({
    eyebrow: 'THE HALL OF RIVALS · ' + R.short.toUpperCase(), line: `"${R.quote}"`, color: R.color,
    rows: () => {
      const st = lgQ().rivals[R.k] || {};
      return LG_TIER_ORDER.map((k, i) => {
        const T = LG_TIERS[k], prev = LG_TIER_ORDER[i - 1], locked = !!(prev && !st[prev]);
        return { title: T.name, tag: st[k] ? 'BEATEN ✦' : T.medal, cost: locked ? 'LOCKED' : st[k] ? 'REMATCH' : 'FIGHT',
          desc: locked ? `Win the ${LG_TIERS[prev].name} match first.` : T.desc, done: !!st[k], locked,
          act: () => lgFight({ kind: 'rival', k: R.k, tier: k, name: `${R.short.toUpperCase()} · ${T.name}`, color: T.color, list: [R.k], binds: {} }) };
      });
    },
    footer: () => `All-Star &amp; Grand Slam wins: ${lgStarWins()} · every 8 adds a golden shield at the tournament rest stops (now ${lgShields()})`,
    hint: '<kbd>↑</kbd><kbd>↓</kbd> choose · <kbd>Enter</kbd> step up to the plate · <kbd>Esc</kbd> step back',
  });
}
function lgGateMenu(C) {
  const B = LG.lastBinds[C.key] = LG.lastBinds[C.key] || {};
  LgMenu.open({
    eyebrow: C.name, color: C.color,
    line: C.list.map(k => LG_RIVAL[k].short).join(' → '),
    rows: () => LG_BINDS.map(b => ({ title: `Foul Ball · ${b.name}`, tag: B[b.id] ? 'LOCKED ON' : 'OFF', cost: B[b.id] ? '⛓' : '○', desc: b.desc, done: !!B[b.id], act: () => { B[b.id] = !B[b.id]; SFX.latch ? SFX.latch() : SFX.ui(); return 'keep'; } }))
      .concat([{ title: 'PLAY BALL', tag: `${C.list.length} BOSSES`, cost: 'START', desc: `One after another, with a rest stop halfway.${LG_BINDS.some(b => B[b.id]) ? ' Bindings: ' + LG_BINDS.filter(b => B[b.id]).map(b => b.name).join(', ') + '.' : ''}`,
        act: () => lgFight({ kind: 'cup', key: C.key, tier: 'rookie', name: C.name, color: C.color, list: C.list.slice(), binds: Object.assign({}, B) }) }]),
    footer: () => { const c = lgQ().cups[C.key]; return c && c.done ? `Won${c.all ? ' with all four bindings · a golden crown on the cup' : c.b ? ' · bindings cleared: ' + (LG_BINDS.filter(b => c.b[b.id]).map(b => b.name).join(', ') || 'none') : ''}` : 'Not won yet · each binding you clear adds a golden link to the gate'; },
    hint: '<kbd>↑</kbd><kbd>↓</kbd> choose · <kbd>Enter</kbd> lock a binding / play ball · <kbd>Esc</kbd> step back',
  });
}

/* ---------- The Umpire ---------- */
const UMP_V = { voice: 0.62, color: '#ffd27a' };
Story.umpireTalk = function (n) {
  return this.run(async () => {
    const Q = lgQ(), h = () => n.head(), nh = () => this.nathanHead();
    const cups = LG_CUP_ORDER.filter(k => Q.cups[k] && Q.cups[k].done).length, next = LG_CUP_ORDER.find(k => !(Q.cups[k] && Q.cups[k].done));
    this.camTarget = { x: (Player.x + n.x) / 2, y: n.y - 90 }; this.zoomTo(1.25);
    if (Q.fame) { await this.say('OLDER NATHAN', 'Still here? Good. Play for fun now, kid. That was always the point.', h, UMP_V); return; }
    await this.say('UMPIRE', cups ? `${cups} of 4 cups. The crowd is starting to whisper your name.` : 'The gates are open, rookie. The Minor League Cup is waiting.', h, UMP_V);
    if (next) await this.say('UMPIRE', `Next up: ${LG_CUPS[next].title}. ${next === 'zennith' ? 'Every rival. In a row. Ending with the one you fear.' : 'Lock on a Foul Ball or two if you want the cup to shine.'}`, h, UMP_V);
    await this.say('UMPIRE', `All-Star wins: ${lgStarWins()}. Every eight earns you a golden shield at the rest stops.`, h, UMP_V);
    await this.say('NATHAN', 'Who are you, really?', nh);
    await this.say('UMPIRE', 'Win the last cup and I\'ll tell you.', h, UMP_V);
  });
};
Story.umpireIntro = function () {
  const n = NPCs.find(o => o.kind === 'umpire'); if (!n) return;
  return this.run(async () => {
    const h = () => n.head(), nh = () => this.nathanHead();
    await this.title('THE HALL OF LEGENDS', 'High above the Spire', 3);
    this.camTarget = { x: n.x, y: n.y - 110 }; this.zoomTo(1.2);
    SFX.crowd(1.4);
    await this.say('UMPIRE', 'Welcome, Nathan. Welcome to the Hall of Legends.', h, UMP_V);
    await this.say('NATHAN', 'Wait. Marble, clouds, a guy in a gold mask… Am I dreaming?', nh);
    await this.say('UMPIRE', 'Everyone you\'ve faced is carved in marble down this hall. Step up to a statue to replay the match: Rookie, All-Star or Grand Slam.', h, UMP_V);
    await this.say('UMPIRE', 'Four gates, four cups. The Spire was only the qualifying round. Win all four and you\'re the Grand Slam Champion of all time.', h, UMP_V);
    await this.say('UMPIRE', 'Nothing you lose here is real. Strike out and I call time: you\'re back at the gate, nothing lost.', h, UMP_V);
    await this.say('UMPIRE', 'The Golden Dugout is open between innings. Swap your stance and badges as often as you like. Play ball.', h, UMP_V);
    lgQ().met = 1; saveGame();
  });
};
// the Hall of Fame: after the Zennith All-Star Pantheon, the mask comes off
Story.hallOfFame = function () {
  const n = NPCs.find(o => o.kind === 'umpire');
  return this.run(async () => {
    const Q = lgQ(), nh = () => this.nathanHead();
    if (!n) { Q.fame = 1; saveGame(); return; }
    const h = () => n.head();
    await this.title('THE HALL OF FAME', 'Fifteen in a row', 3);
    this.camTarget = { x: (Player.x + n.x) / 2, y: n.y - 100 }; this.zoomTo(1.35);
    SFX.crowd(2);
    await this.say('UMPIRE', 'Fifteen rivals. Even him. Even at full strength.', h, UMP_V);
    await this.say('NATHAN', 'You said you\'d tell me who you are.', nh);
    SFX.chime(); await this.tween(n, 'unmask', 1, 2.2);
    this.punch(0.1, 6); Game.flashWhite = 0.4;
    await this.say('NATHAN', '…That\'s my face. Older. But that\'s me.', nh);
    await this.say('OLDER NATHAN', 'Took me years to stop swinging at that one lost game. I replayed it every night.', h, UMP_V);
    await this.say('OLDER NATHAN', 'You lost a game. You never lost yourself. And you made peace with it a lot sooner than I did.', h, UMP_V);
    await this.say('OLDER NATHAN', 'That\'s what makes a champion. Not the cup. Getting back up to the plate.', h, UMP_V);
    await this.say('NATHAN', 'So… I\'m going to be okay?', nh);
    await this.say('OLDER NATHAN', 'Better than okay, MVP. Now go home. Your team\'s waiting.', h, UMP_V);
    Story.impact(n.x, n.y - 80, GOLD); SFX.confetti();
    Q.fame = 1; saveGame();
    if (typeof tGive === 'function') try { tGive('hall_of_fame'); } catch (e) { /* no such trophy */ }
  });
};
