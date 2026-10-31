'use strict';
// ===== Arcade: Kegel Kop (Skelet bowls with his own head) =====
(() => {
  const STEPS = { rol: [2, 1], snel: [1, .5], gouden: [3, 2, 1] };
  const PINS = [[0, 0], [-1, 1], [1, 1], [-2, 2], [0, 2], [2, 2], [-3, 3], [-1, 3], [1, 3], [3, 3]];
  function skull(x, y, s, rot) {
    g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
    circ(0, 0, 28, '#fbf7ee', 4); ell(-10, -4, 7, 8, INK, 0); ell(10, -4, 7, 8, INK, 0); poly([[0, 6], [-4, 12], [4, 12]], INK, 0);
    g.restore();
  }
  LEVELS.push({
    id: 'kegel', title: 'Kegel Kop', who: 'Arcade · Skelet met Pret', song: 'Strike!', color: '#f59ab5', accent: '#fbf7ee', arcade: true,
    bpm: 108, beats: 56, key: 3, swing: .3,
    prog: [[0, 4, 7, 10], [5, 9, 12, 15], [7, 11, 14, 17], [5, 9, 12, 15]],
    drums: { k: 'x...x..x', s: '..x...x.', h: 'x.xxx.xx' }, bass: '1.3.5.8.', comp: 'stab',
    mel: [[[0, 12, 2], [2, 15, 1], [3, 16, 1], [4, 19, 4]], [[0, 17, 2], [2, 15, 2], [4, 12, 4]], [[0, 19, 2], [2, 22, 2], [4, 19, 4]], [[0, 17, 3], [3, 15, 1], [4, 12, 4]]],
    how: 'Skelet has no bowling ball, so he uses his head. Of course he does. He takes run-up steps, and you <b>let go</b> on the beat after them.<br><b>Two slow steps</b> = normal throw. <b>Two quick steps</b> = hurry. <b>Three steps</b> = the golden throw.',
    verdict: ['Strike after strike. Skelet is already ordering a trophy for his own head.', 'A decent game. Some pins are still standing, and so is Skelet. Mostly.', 'Let go on the beat right after the last step. His head will thank you.'],
    chart() {
      const c = [], add = (bar, off, k) => c.push({ b: bar * 4 + off, k });
      add(1, 3, 'rol'); add(2, 3, 'rol'); add(3, 3, 'rol'); add(4, 1, 'snel'); add(4, 3, 'rol'); add(5, 3, 'snel'); add(6, 1, 'snel'); add(6, 3, 'snel');
      add(7, 3, 'rol'); add(8, 1, 'snel'); add(8, 3, 'rol'); add(9, 1, 'snel'); add(9, 3, 'snel'); add(10, 3, 'rol'); add(11, 1, 'snel'); add(11, 3, 'rol');
      add(12, 1, 'snel'); add(12, 3, 'snel'); add(13, 3, 'gouden');
      return c;
    },
    cue(e, t, spb) { STEPS[e.k].forEach(d => { A.nz(t - d * spb, .06, .3, 'lowpass', 420); A.tone(t - d * spb, 95, .05, 'sine', .25); }); },
    hit(t, res, e, P) {
      const r = 1.4 * P.spb; A.voice(t, fq(7), .12, .8, 'a'); A.nz(t, r, .12, 'lowpass', 260);
      A.crash(t + r, e.k === 'gouden' ? .3 : .18); for (let i = 0; i < 6; i++) A.tone(t + r + i * .02, 1300 - i * 90, .03, 'square', .06);
    },
    miss(t) { A.nz(t, .7, .12, 'lowpass', 200); },
    draw(P) {
      sky('#ffd6e4', '#ffeede');
      for (let i = 0; i < 8; i++) rr(i * 130 - 20, 40, 90, 40, 8, ['#f6b92b', '#8fd3f0', '#7bc96f', '#ef4a36'][i % 4], 3);
      poly([[300, 540], [660, 540], [520, 130], [440, 130]], '#e8b27a', 4);
      poly([[270, 540], [300, 540], [440, 130], [430, 130]], '#9b6b43', 3); poly([[660, 540], [690, 540], [530, 130], [520, 130]], '#9b6b43', 3);
      let roll = null, pinsDown = 0, gutter = null, approach = 0, gold = false;
      for (const e of P.ev) {
        const st = STEPS[e.k][0], k = (P.b - (e.b - st)) / st;
        if (!e.res && k >= 0 && k <= 1) approach = k;
        if (hitOk(e)) { const f = P.b - e.hb; if (f >= 0 && f < 1.4) roll = { f: f / 1.4, gold: e.k === 'gouden' }; if (f >= 1.4 && f < 2.4) { pinsDown = (f - 1.4); gold = e.k === 'gouden'; } }
        if (e.res === 'miss') { const f = P.b - e.b; if (f >= 0 && f < 1.4) gutter = f / 1.4; }
      }
      // pins
      PINS.forEach(([px, py], i) => {
        let x = 480 + px * 12, y = 150 + py * 10, rot = 0;
        if (pinsDown) { x += px * pinsDown * 90 + (i % 2 ? 30 : -30) * pinsDown; y -= hop(pinsDown) * 60; rot = pinsDown * 8 * (i % 2 ? 1 : -1); }
        g.save(); g.translate(x, y); g.rotate(rot); ell(0, 0, 6, 14, gold ? '#f6b92b' : '#fff', 3); rr(-6, -6, 12, 3, 1, '#ef4a36', 0); g.restore();
      });
      if (pinsDown && pinsDown < .8) txt(gold ? 'GOUDEN STRIKE!' : 'STRIKE!', 480, 96, 34, '#ef4a36');
      // Skelet runs up, head goes rolling
      const away = roll || gutter != null;
      g.save(); g.translate(480, 380 - approach * 30); g.scale(.8, .8);
      ART.skeleton(0, 0, { pose: roll && roll.f < .2 ? .2 : 0, step: approach ? Math.sin(approach * Math.PI * 4) : 0, grin: 1, head: away ? [0, -4000] : null });
      g.restore();
      if (roll) { const f = ease(roll.f); skull(480 + Math.sin(f * 6) * 4, lerp(470, 165, f), lerp(.9, .35, f), f * 30); }
      if (gutter != null) { const f = ease(gutter); skull(lerp(480, 410, f), lerp(470, 200, f), lerp(.9, .4, f), f * 20); if (gutter > .3) bubble('Goot! Mijn hoofd!', 640, 300, 22); }
      if (away && !gutter) bubble(roll && roll.gold ? 'Gouden kop!' : 'Rol, hoofd, rol!', 650, 300, 22);
      // step pips, then the throw; a ring closes on the foul line
      const live = P.ev.find(e => !e.res && P.b >= e.b - STEPS[e.k][0] - .1 && P.b < e.b + .3);
      if (live) { const ss = STEPS[live.k]; callPips(480, 500, ss.length + 1, ss.filter(d => P.b >= live.b - d - .02).length + (P.b >= live.b - .05 ? 1 : 0), live.k === 'gouden' ? '#f6b92b' : '#ef4a36'); }
      P.ev.forEach(e => cueRing(P, e, 480, 450, STEPS[e.k][0], e.k === 'gouden' ? '#f6b92b' : '#ef4a36', 70));
    },
  });
})();

// ===== Arcade: Torenklimmer (Luur climbs to see what's up there) — two buttons =====
(() => {
  const STEP = { links: 70, rechts: 70, sprong: 150, top: 150 };
  const HX = { links: 420, rechts: 540, sprong: 480, top: 480 };
  let WORLD = null;                 // ideal height before each event, rebuilt per chart
  LEVELS.push({
    id: 'toren', title: 'Torenklimmer', who: 'Arcade · Luur op de Muur', song: 'Steeds Hoger', color: '#8fd3f0', accent: '#4d7cf0', arcade: true, twoBtn: true,
    bpm: 100, beats: 56, key: 9,
    prog: [[0, 3, 7], [-4, 0, 3], [3, 7, 10], [-2, 2, 5]],
    drums: { k: 'x...x...', s: '..x...x.', h: 'x.x.x.x.' }, bass: '1.5.8.5.', comp: 'arp',
    mel: [[[0, 12, 2], [2, 15, 2], [4, 19, 4]], [[0, 15, 2], [2, 12, 2], [4, 8, 4]], [[0, 10, 2], [2, 15, 2], [4, 19, 4]], [[0, 17, 3], [3, 14, 1], [4, 12, 4]]],
    how: 'Luur wants to know what’s at the top of the old church tower. A handhold glints <b>one beat</b> before he grabs it.<br><b>A (Spatie/J, tap left)</b> = left hand, low "ting". <b>B (K, tap right)</b> = right hand, high "ting".<br>A <b>double ting</b> means jump: press <b>A</b> two beats later.',
    verdict: ['All the way to the top! Luur found a pigeon, a lost kite and a single white feather.', 'He made it up, with a few scary slips. Don’t tell his mum.', 'Low ting = A, high ting = B, one beat later. Double ting = jump on A.'],
    chart() {
      const c = [], add = (bar, off, k) => c.push({ b: bar * 4 + off, k, btn: k === 'rechts' ? 'b' : 'a' });
      [[1, 1, 'links'], [1, 3, 'rechts'], [2, 1, 'links'], [2, 3, 'rechts'], [3, 1, 'links'], [3, 2, 'rechts'], [3, 3, 'links'], [4, 3, 'sprong'],
        [5, 1, 'rechts'], [5, 2, 'links'], [5, 3, 'rechts'], [6, 1, 'links'], [6, 1.5, 'rechts'], [6, 3, 'links'], [7, 1, 'rechts'], [7, 3, 'sprong'],
        [8, 1, 'links'], [8, 2, 'rechts'], [8, 3, 'links'], [8, 3.5, 'rechts'], [9, 1, 'links'], [9, 2, 'links'], [9, 3, 'rechts'], [10, 3, 'sprong'],
        [11, 1, 'rechts'], [11, 1.5, 'links'], [11, 2, 'rechts'], [11, 3, 'links'], [12, 1, 'links'], [12, 2, 'rechts'], [12, 3, 'links'], [12, 3.5, 'rechts'], [13, 3, 'top']]
        .forEach(a => add(...a));
      return c;
    },
    cue(e, t, spb) {
      if (e.k === 'links') A.tone(t - spb, fq(19), .12, 'sine', .14);
      else if (e.k === 'rechts') A.tone(t - spb, fq(26), .12, 'sine', .14);
      else [2, 1].forEach(d => { A.tone(t - d * spb, fq(19), .1, 'sine', .12); A.tone(t - d * spb + .07, fq(26), .1, 'sine', .12); });
    },
    hit(t, res, e) {
      if (e.k === 'sprong' || e.k === 'top') { A.tone(t, fq(7), .25, 'triangle', .1, fq(19)); if (e.k === 'top') A.crash(t, .25); return; }
      A.tone(t, fq(e.btn === 'a' ? 7 : 12), .06, 'square', .08); A.nz(t, .05, .2, 'bandpass', 2500, 2);
    },
    miss(t) { A.voice(t, fq(16), .3, .7, 'o', fq(7)); },
    draw(P) {
      if (!WORLD || WORLD.ev !== P.ev) { let h = 0; WORLD = { ev: P.ev, at: new Map() }; P.ev.forEach(e => { WORLD.at.set(e, h); h += STEP[e.k]; }); WORLD.total = h; }
      let climbed = 0;
      P.ev.forEach(e => { if (P.b >= e.b) climbed += STEP[e.k] * ease((P.b - e.b) / .4); });
      const prog = clamp(climbed / WORLD.total, 0, 1);
      sky(prog > .8 ? '#ffd9a8' : '#8fd3f0', prog > .5 ? '#fff3db' : '#dff3fb');
      for (let i = 0; i < 5; i++) ell((i * 230 + 60) % W, 80 + i * 70 + climbed * .3 % 400, 60, 20, '#fff', 3);
      // tower wall scrolls as he climbs
      rr(330, -10, 300, H + 20, 0, '#c9a27a', 4);
      for (let y = (climbed % 40) - 40; y < H; y += 40) { ln(330, y, 630, y, 3, 'rgba(33,28,52,.35)'); for (let x = 330 + ((Math.floor((y - climbed) / 40) % 2) ? 40 : 0); x < 630; x += 80) ln(x, y, x, y + 40, 3, 'rgba(33,28,52,.35)'); }
      const groundY = 420 + climbed; if (groundY < H + 20) rr(-10, groundY, W + 20, 200, 0, '#7bc96f', 4);
      const roofY = 210 - (WORLD.total - climbed) - 40;
      if (roofY > -200) { poly([[310, roofY], [480, roofY - 150], [650, roofY]], '#3f7d73', 4); ln(480, roofY - 150, 480, roofY - 200, 5); poly([[480, roofY - 200], [520, roofY - 188], [480, roofY - 176]], '#ef4a36', 3); }
      // holds
      let last = null, slip = 0; const rings = [];
      for (const e of P.ev) {
        const y = 210 + (climbed - WORLD.at.get(e)) - (e.k === 'sprong' || e.k === 'top' ? 80 : 0);
        if (y < -40 || y > H + 40) continue;
        const near = !e.res && e.b - P.b < 1 && e.b - P.b > -0.2;
        rr(HX[e.k] - 20, y - 8, 40, 16, 6, near ? '#fff3a0' : '#8a6a4a', 3);
        if (near) txt('✦', HX[e.k] + 26, y - 14, 18, '#f6b92b');
        if (!e.res) rings.push([e, HX[e.k], y]);
        if (hitOk(e) && e.hb <= P.b) last = e;
        if (e.res === 'miss' && P.b - e.b < .8 && P.b >= e.b) slip = 1;
      }
      const side = last ? last.k : 'links', fresh = last && P.b - last.hb < .4;
      bro('luur', { x: 480 + (slip ? Math.sin(P.b * 30) * 6 : 0), y: 330 + slip * 20, al: side === 'links' || side === 'sprong' || side === 'top' ? 1 : .55, ar: side === 'rechts' || side === 'sprong' || side === 'top' ? 1 : .55,
        eyes: slip ? 'x' : fresh ? 'happy' : 'big', mouth: slip ? 'wow' : fresh ? 'grin' : 'o', look: Math.sin(P.b) });
      if (slip) bubble('Oei oei oei!', 600, 200, 22);
      // rings on the holds, blue for A and red for B, with the button letter
      rings.forEach(([e, x, y]) => { const jump = e.k === 'sprong' || e.k === 'top', col = e.btn === 'b' ? '#ef4a36' : '#4d7cf0';
        cueRing(P, e, x, y, jump ? 2 : 1, col, 50); if (e.b - P.b < (jump ? 2 : 1)) txt(e.btn.toUpperCase(), x + (e.btn === 'b' ? 40 : -40), y + 2, 18, col); });
      const top = P.ev.find(e => e.k === 'top' && hitOk(e));
      if (top) { bubble('Wat een uitzicht!', 600, 150, 26); ART.feather(700 + Math.sin(P.b) * 20, 120 + Math.sin(P.b * .7) * 10, .4); }
      keyCaps(P, 'left hand', 'right hand');
    },
  });
})();
