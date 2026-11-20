'use strict';
/* =========================================================
   ACT II STORY: the Grand Concourse · Pennant Gate ·
   Fionn · Milo · King Deniz (extends zone/story.js)
   ========================================================= */
const PENNANTS = ['fionn', 'milo', 'deniz', 'maya'];   // maya: Coach Maya, under the Deep Quarry (act/bullpen.js)
const pennantCount = () => PENNANTS.filter(k => Save.data.pennants[k]).length;
function pennantToast() {
  const n = pennantCount();
  const N = PENNANTS.length;
  setTimeout(() => toast(n >= N ? 'ALL FOUR GOLDEN PENNANTS · TAKE THEM TO THE PENNANT GATE' : `GOLDEN PENNANT ${n} / ${N} · THE GATE IN THE CONCOURSE NEEDS ${N - n} MORE`), 600);
}
Object.assign(Story, {
  concourseArrive() {
    return this.run(async () => {
      const D = Save.data, P = Player, nh = () => this.nathanHead(), g = A.gate;
      P.facing = 1;
      this.zoom = 1.35; this.zoomTo(1.3);
      await this.wait(0.6);
      await this.say('NATHAN', 'Whoa. It just keeps going UP.', nh);
      // pull out wide for the reveal
      this.zoomTo(1.0);
      this.camTarget = { x: g.x + g.w / 2, y: g.y + 40 }; await this.wait(1.4);
      Gate.hint = 4.5; SFX.unlock();
      for (let k = 0; k < 24; k++) spawnParticle({ x: g.x + rand(0, g.w), y: g.y + g.h - rand(0, 40), vx: rand(-10, 10), vy: rand(-90, -40), life: rand(1.4, 2.4), size: rand(2, 4), color: k % 2 ? GOLD : BONE, type: 'dot' });
      this.zoomTo(1.15);
      await this.say('NATHAN', 'A giant golden elevator… with FOUR empty pennant slots.', () => ({ x: g.x + g.w / 2, y: g.y - 20 }));
      this.zoomTo(1.0);
      this.camTarget = { x: 192 * TILE, y: 56 * TILE }; await this.wait(1.2);
      await this.say('NATHAN', 'Caves to the west, a storm up top, ice to the east. And the fourth slot has a raincloud on it… pointing DOWN.', nh);
      D.concourse = true; saveGame();
    }).then(() => toast('THE GRAND CONCOURSE · ▲ AT THE PENNANT GATE FOR A HINT'));
  },

  gateUse() {
    const D = Save.data;
    if (D.gateOpen) { if (!Act2.leaving) { Act2.leaving = true; SFX.gate(); SFX.unlock(); toast('GOING UP · THE PEAK OF THE SPIRE'); goToPage('act3.html#from-z5'); } return; }
    const fresh = PENNANTS.filter(k => D.pennants[k] && !D.slots[k]);
    if (!fresh.length) {
      Gate.hint = 6; SFX.ui();
      const left = PENNANTS.length - pennantCount();
      toast(left === PENNANTS.length ? 'FOUR EMPTY SLOTS · THE ENGRAVINGS POINT WEST, UP, EAST, AND DOWN UNDER THE DEEP QUARRY' : `${left} SLOT${left > 1 ? 'S' : ''} STILL EMPTY · FOLLOW THE GLOWING ARROWS`);
      return;
    }
    return this.run(async () => {
      const g = A.gate;
      this.camTarget = { x: g.x + g.w / 2, y: g.y + 50 }; this.zoomTo(1.22);
      for (const k of fresh) {
        await this.wait(0.5);
        D.slots[k] = 1; saveGame(); Gate.insert = 1; SFX.unlock();
        const i = PENNANTS.indexOf(k), sx = g.x + g.w / 2 + (i - 1.5) * 100;
        burst(sx, g.y + 34, 20, { colors: [GOLD, BONE, '#ff8a2a'], maxSpeed: 340 });
        this.impact(sx, g.y + 34, GOLD);
        pop(sx, g.y, `PENNANT ${PENNANTS.filter(p => D.slots[p]).length}/${PENNANTS.length}`, { size: 32 });
        await this.wait(0.6);
      }
    }).then(() => {
      if (PENNANTS.every(k => D.slots[k])) this.gateOpen();
      else { const left = PENNANTS.length - PENNANTS.filter(k => D.slots[k]).length; toast(`${left} MORE PENNANT${left === 1 ? '' : 'S'} TO GO`); }
    });
  },

  gateOpen() {
    return this.run(async () => {
      const D = Save.data, g = A.gate, nh = () => this.nathanHead();
      this.camTarget = { x: g.x + g.w / 2, y: g.y + 40 }; this.zoomTo(1.1);
      await this.wait(0.6);
      SFX.gate(); SFX.drill();
      for (let k = 0; k < 20; k++) {
        Gate.open = (k + 1) / 20; addShake(4 + k * 0.4); if (k % 4 === 0) SFX.clang();
        // light spilling out of the widening seam
        for (let j = 0; j < 3; j++) spawnParticle({ x: g.x + g.w / 2 + rand(-g.w * Gate.open / 2, g.w * Gate.open / 2), y: g.y + rand(0, g.h), vx: rand(-30, 30), vy: rand(-160, -60), life: rand(0.8, 1.4), size: rand(2, 4), color: j ? GOLD : BONE, type: 'dot' });
        this.zoomTo(1.1 + k * 0.008);
        await this.wait(0.09);
      }
      Game.flashWhite = 0.6; SFX.unlock(); SFX.confetti();
      this.impact(g.x + g.w / 2, g.y + g.h / 2, GOLD);
      for (let k = 0; k < 6; k++) ring(g.x + g.w / 2, g.y + g.h / 2, 20, 220 + k * 50, 0.6 + k * 0.12, k % 2 ? BONE : GOLD, 4);
      await this.wait(0.8);
      this.camTarget = null; this.zoomTo(1.25);
      await this.say('NATHAN', 'The path to the top of the Spire.', nh);
      this.zoomTo(1.36);
      await this.say('NATHAN', 'Evil Adam. Bottom of the ninth. Here I come.', nh);
      this.punch(0.07, 6);
      await this.title('UP TO THE PEAK', 'END OF ACT II', 2.8);
      D.gateOpen = true; D.act2Cleared = true; saveGame();
    }).then(() => {
      themeCheck(800);
      showCard('ACT II COMPLETE', 'THE PENNANT GATE OPENS', 'All four Golden Pennants are in. The elevator to the Spire\'s peak is open, and Evil Adam is waiting at the top. Step inside the gate when you\'re ready. Rest first. Spend your bolts.',
        [`pebbles ${pebblesFound()}/${PEBBLE_TOTAL}`, `<kbd>${Bindings.label('up')}</kbd> at the gate to ride up`]);
    });
  },

  /* ---------- Fionn, Keeper of Pebbles ---------- */
  fionnIntro(f) {
    return this.run(async () => {
      const P = Player, h = () => ({ x: f.x + f.w / 2, y: f.y - 14 }), nh = () => this.nathanHead(), v = { voice: 0.8 };
      setLock(A.fionnLock, true); SFX.gate(); this.punch(0.06, 8);
      this.camTarget = { x: (P.x + f.x) / 2 + 60, y: f.y - 30 }; this.zoomTo(1.18);
      f.facing = -1; P.facing = 1;
      await this.wait(0.8);
      await this.say('FIONN', 'Stop right there! Before you touch that pennant, you\'re going to learn the mineral composition of every boulder in this room.', h, v);
      await this.say('FIONN', 'Whether you asked or not!', h, v);
      await this.say('NATHAN', 'Fionn, it\'s me. Nathan. Your teammate? I came to get you out.', nh);
      await this.say('FIONN', 'Teammate or not, the rocks come first.', h, v);
      await this.say('NATHAN', 'Okay. Also I want the shiny flag.', nh);
      // pebbles rattle loose from the ceiling as he stamps
      this.zoomTo(1.32); SFX.slam(); this.punch(0.09, 10);
      for (let k = 0; k < 16; k++) spawnParticle({ x: f.x + rand(-260, 260), y: f.y - rand(160, 260), vx: rand(-20, 20), vy: rand(0, 80), grav: 900, life: 1.2, size: rand(3, 6), color: ['#8c7b6b', '#5a4a3a', '#9be36a'][k % 3], type: 'debris' });
      await this.say('FIONN', 'PENNANT. And it sits on a pedestal of ROCK. Respect the rock!', h, v);
    }).then(() => {
      BossBar.show('FIONN · KEEPER OF PEBBLES'); f.begin(); SFX.drill();
      setTimeout(() => toast('TIP · SMACK THE SMALL GREEN ROCKS BACK AT HIM'), 1600);
    });
  },
  fionnDefeat(f) {
    return this.run(async () => {
      const P = Player, D = Save.data, h = () => ({ x: f.x + f.w / 2, y: f.y - 6 }), nh = () => this.nathanHead(), v = { voice: 0.8 };
      BossBar.flash(); SFX.bossDie(); this.impact(f.x + f.w / 2, f.y + f.h / 2, '#9be36a');
      pop(f.x + f.w / 2, f.y - 30, 'ROCK BOTTOM!', { size: 46, life: 1.4 });
      this.camTarget = { x: (P.x + f.x) / 2, y: f.y - 20 }; this.zoomTo(1.28);
      await this.wait(1.2);
      await this.say('FIONN', '…You hit Kevin.', h, v);
      await this.say('NATHAN', 'Which one was Kevin?', nh);
      this.zoomTo(1.42); this.punch(0.08, 9); this.lines = 0.8; this.linesAt = h();
      await this.say('FIONN', 'THEY WERE ALL KEVIN.', h, v);
      this.zoomTo(1.22);
      await this.say('FIONN', 'Fine. Take the pennant. But you owe this Spire fifty Lucky Pebbles. I\'ll be at your camp. Counting.', h, v);
      SFX.poof(); burst(f.x + f.w / 2, f.y + 20, 28, { colors: ['#8c7b6b', '#5a4a3a', '#9be36a'], type: 'puff', maxSpeed: 240, minSize: 6, maxSize: 14, maxLife: 0.9, drag: 2 });
      f.dead = true; Zone.boss = null; BossBar.hide();
      dropBolts(f.x + f.w / 2, f.y + 10, f.bolts);
      setLock(A.fionnLock, false);
      // the pennant lifts off its pedestal
      Act2.pennant = { x: A.pedestal.x, y: A.pedestal.y, t: 0 };
      this.camTarget = { x: A.pedestal.x - 120, y: A.pedestal.y - 60 }; this.zoomTo(1.3);
      for (let k = 0; k < 20; k++) spawnParticle({ x: A.pedestal.x + rand(-30, 30), y: A.pedestal.y + rand(-20, 10), vx: rand(-20, 20), vy: rand(-140, -50), life: rand(0.8, 1.4), size: rand(2, 4), color: k % 2 ? GOLD : BONE, type: 'dot' });
      await this.wait(1.0);
      D.fionnDead = true; D.pennants.fionn = 1; saveGame(); Act2.pennant = null;
      SFX.unlock(); pop(P.x + 11, P.y - 30, 'GOLDEN PENNANT!', { size: 36 }); this.impact(P.x + 11, P.y + 10, GOLD);
      await this.wait(0.5);
    }).then(() => {
      themeCheck(800);
      showCard('GOLDEN PENNANT 1', 'NEW QUEST · 50 LUCKY PEBBLES', 'Fionn moved to Base Camp. Fifty Lucky Pebbles are hidden across every zone, including the ones you\'ve already cleared. Hand them to him 10 at a time for +1 max HP and a bat charm each batch.',
        [`${pebblesFound()} / ${PEBBLE_TOTAL} found`, 'Reshman now sells Pebble Pins'], pennantToast);
    });
  },

  /* ---------- Milo the Storm-Wrecked ---------- */
  miloIntro(m) {
    return this.run(async () => {
      const P = Player, h = () => ({ x: m.x + m.w / 2, y: m.y - 10 }), nh = () => this.nathanHead(), v = { voice: 1.2 };
      setLock(A.miloLock, true); SFX.gate(); this.punch(0.06, 8);
      this.camTarget = { x: (P.x + m.x) / 2 + 40, y: m.y + 60 }; this.zoomTo(1.16);
      P.facing = 1;
      await this.wait(0.8); SFX.thunder(); Game.flashWhite = 0.3;
      // lightning forks down behind him as he raises his arms
      this.zoomTo(1.3); this.impact(m.x + m.w / 2, m.y - 60, '#b98bff');
      for (let k = 0; k < 30; k++) spawnParticle({ x: m.x + m.w / 2 + rand(-300, 300), y: m.y - rand(100, 300), vx: -120, vy: rand(500, 700), life: 0.6, size: 2, color: 'rgba(170,200,255,.7)', type: 'dot' });
      await this.say('MILO', 'Behold my dark arcane might! THE STORM OBEYS ME!', h, v);
      this.zoomTo(1.45);
      await this.say('MILO', '(oh no, oh no, how do I turn it off?!)', h, { voice: 1.6, color: '#e6d6ff' });
      this.zoomTo(1.18);
      await this.say('NATHAN', 'Milo! It\'s me, Nathan. Same team since Little League, remember?', nh);
      await this.say('NATHAN', '…Did you summon a hurricane?', nh);
      SFX.thunder(); Game.flashWhite = 0.5; this.punch(0.09, 10);
      await this.say('MILO', 'ON PURPOSE. Totally on purpose. Now face my… uh… WRATH!', h, v);
    }).then(() => {
      BossBar.show('MILO · THE STORM-WRECKED'); m.begin(); SFX.drill();
      setTimeout(() => toast('TIP · BAT HIS OVERLOAD ORB BACK THREE TIMES IN A ROW'), 6500);
    });
  },
  miloDefeat(m) {
    return this.run(async () => {
      const P = Player, D = Save.data, h = () => ({ x: m.x + m.w / 2, y: m.y - 4 }), nh = () => this.nathanHead(), v = { voice: 1.2 };
      BossBar.flash(); SFX.bossDie(); this.impact(m.x + m.w / 2, m.y + m.h / 2, '#9fe6ff');
      pop(m.x + m.w / 2, m.y - 30, 'STORM\'S OVER!', { size: 46, life: 1.4 });
      this.camTarget = { x: (P.x + m.x) / 2, y: m.y }; this.zoomTo(1.26);
      await this.wait(1.4);
      await this.say('MILO', '…Okay. OKAY. It was an accident.', h, v);
      await this.say('MILO', 'I was trying to teleport everyone home, and I sneezed mid-spell.', h, v);
      await this.say('NATHAN', 'Can you turn it off?', nh);
      await this.say('MILO', 'No. But! I can put the storm in your dash. Hold still. This might tingle.', h, v);
      // a bolt arcs from Milo's staff into Nathan
      this.zoomTo(1.4); SFX.laserCharge();
      for (let k = 0; k < 14; k++) { const q = k / 14; spawnParticle({ x: lerp(m.x + m.w / 2, P.x + 11, q) + rand(-6, 6), y: lerp(m.y, P.y + 20, q) + rand(-10, 10), life: 0.5, size: 4, color: k % 2 ? '#9fe6ff' : BONE, type: 'spark' }); await this.wait(0.03); }
      SFX.thunder(); this.impact(P.x + 11, P.y + 20, '#9fe6ff');
      for (let k = 0; k < 18; k++) spawnParticle({ x: P.x + rand(0, P.w), y: P.y + rand(0, P.h), vx: rand(-200, 200), vy: rand(-200, 200), life: 0.5, size: 3, color: k % 2 ? '#9fe6ff' : '#ffffff', type: 'spark' });
      D.up.staticDash = true; saveGame();
      await this.wait(0.6);
      await this.say('MILO', 'See you at camp! I\'ll be the one with no eyebrows.', h, v);
      SFX.poof(); burst(m.x + m.w / 2, m.y + 20, 28, { colors: ['#4a3a8a', '#b98bff', '#e8e0ff'], type: 'puff', maxSpeed: 240, minSize: 6, maxSize: 14, maxLife: 0.9, drag: 2 });
      m.dead = true; Zone.boss = null; BossBar.hide();
      dropBolts(m.x + m.w / 2, m.y + 10, m.bolts);
      setLock(A.miloLock, false);
      D.miloDead = true; D.pennants.milo = 1; saveGame();
      SFX.unlock(); pop(P.x + 11, P.y - 30, 'GOLDEN PENNANT!', { size: 36 });
      await this.wait(0.5);
    }).then(() => {
      themeCheck(800);
      showCard('NEW ABILITY', 'STATIC DASH', 'Milo enchanted your dash with storm magic. While dashing you phase straight through red laser barriers and enemy bodies without taking damage. There are lasers guarding secrets in the Concourse, the Icicle Halls… and back in the Ventilation Shafts.',
        [`<kbd>${Bindings.label('dash')}</kbd> dash through lasers`, 'Golden Pennant 2'], pennantToast);
    });
  },

  /* ---------- King Deniz ---------- */
  denizIntro(d) {
    return this.run(async () => {
      const P = Player, h = () => ({ x: d.x + d.w / 2, y: d.y - 18 }), nh = () => this.nathanHead(), v = { voice: 0.7 };
      setLock(A.denizLock, true); SFX.gate(); this.punch(0.06, 8);
      this.camTarget = { x: (P.x + d.x) / 2, y: d.y - 10 }; this.zoomTo(1.16);
      P.facing = -1; d.facing = 1;
      // snow blows across the throne room
      const snow = k => { for (let j = 0; j < k; j++) spawnParticle({ x: d.x + rand(-420, 420), y: d.y - rand(80, 260), vx: rand(60, 140), vy: rand(20, 60), life: rand(1.5, 2.5), size: rand(2, 3.5), color: 'rgba(230,245,255,.85)', type: 'dot', drag: 0.2 }); };
      snow(30);
      await this.wait(0.9);
      await this.say('KING DENIZ', 'You climb into my court uninvited, peasant?', h, v);
      snow(20); this.zoomTo(1.34); SFX.slam(); this.punch(0.1, 12);
      ring(d.x + d.w / 2, d.y + d.h, 10, 260, 0.6, '#bfefff', 6);
      await this.say('KING DENIZ', 'There are no "pleases" in my kingdom. Kneel.', h, v);
      this.zoomTo(1.2);
      await this.say('NATHAN', 'Deniz?! It\'s me, Nathan! We had sleepovers!', nh);
      snow(20); this.impact(d.x + d.w / 2, d.y - 10, '#9fe6ff'); this.zoomTo(1.38);
      await this.say('KING DENIZ', 'The king has no friends. Only SUBJECTS.', h, v);
    }).then(() => {
      BossBar.show('KING DENIZ · THE GLACIER CROWN'); d.begin(); SFX.drill();
      setTimeout(() => toast('TIP · WHEN HE YELLS "KNEEL!", GET OFF THE GROUND · WALL-SLIDE OR BAT-LAUNCH'), 1800);
    });
  },
  denizDefeat(d) {
    return this.run(async () => {
      const P = Player, D = Save.data, h = () => ({ x: d.x + d.w / 2, y: d.y - 4 }), nh = () => this.nathanHead(), v = { voice: 0.7 };
      BossBar.flash(); SFX.bossDie(); BossBar.hide();
      this.camTarget = { x: (P.x + d.x) / 2, y: d.y }; this.zoomTo(1.25);
      this.impact(d.x + d.w / 2, d.y + d.h / 2, '#bfefff');
      await this.wait(1.0);
      // the ice crown cracks… and shatters
      this.zoomTo(1.42); SFX.crystal(); await this.wait(0.4); SFX.crystal(); this.punch(0.04, 4); await this.wait(0.4);
      SFX.bigCrack(); this.impact(d.x + d.w / 2, d.y - 14, '#9fe6ff');
      burst(d.x + d.w / 2, d.y - 14, 30, { colors: ['#bfefff', '#9fe6ff', BONE, GOLD], maxSpeed: 480, grav: 700, maxLife: 1.1, type: 'debris' });
      // he watches it shatter on the ice… a beat of silence… then the royal robe comes off
      await this.wait(0.9);
      capeFling(d); this.punch(0.05, 5); await this.wait(0.25);
      d.hippie = true; SFX.poof(); burst(d.x + d.w / 2, d.y + 10, 24, { colors: ['#ff4aa0', '#6fd3ff', '#7dff9a', GOLD], type: 'puff', maxSpeed: 200, minSize: 5, maxSize: 12, maxLife: 0.9, drag: 2 });
      // flower petals and good vibes
      for (let k = 0; k < 26; k++) spawnParticle({ x: d.x + d.w / 2 + rand(-50, 50), y: d.y + rand(-30, 30), vx: rand(-80, 80), vy: rand(-140, -40), vr: rand(-6, 6), grav: 90, life: rand(1.4, 2.2), size: rand(3, 5), color: ['#ff4aa0', '#7dff9a', GOLD, '#6fd3ff'][k % 4], type: 'debris', drag: 1 });
      await this.wait(0.8);
      this.zoomTo(1.3);
      await this.say('DENIZ', 'Whoa, man… why was I being so uptight?', h, v);
      await this.say('DENIZ', 'Bad vibes, bro. Take the pennant. Peace and love.', h, v);
      await this.say('NATHAN', '…Are you okay?', nh);
      await this.say('DENIZ', 'Never better. I\'m gonna go make tea at your camp. Like, a whole lounge. Come chill.', h, v);
      SFX.poof(); burst(d.x + d.w / 2, d.y + 20, 28, { colors: ['#ff8a2a', '#ff4aa0', '#bfefff'], type: 'puff', maxSpeed: 240, minSize: 6, maxSize: 14, maxLife: 0.9, drag: 2 });
      d.dead = true; Zone.boss = null;
      dropBolts(d.x + d.w / 2, d.y + 10, d.bolts);
      setLock(A.denizLock, false);
      D.denizDead = true; D.pennants.deniz = 1; saveGame();
      SFX.unlock(); pop(P.x + 11, P.y - 30, 'GOLDEN PENNANT!', { size: 36 });
      await this.wait(0.5);
    }).then(() => {
      themeCheck(800);
      showCard('GOLDEN PENNANT 3', 'THE BASE CAMP TEA LOUNGE', 'Deniz set up a rug and a kettle at Base Camp. Drink his herbal tea for a permanent buff: your Hype slowly refills over time, even when you\'re not fighting.',
        ['visit Deniz at Base Camp'], pennantToast);
    });
  },
});
