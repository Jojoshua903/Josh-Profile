'use strict';
// ===== Level 3: Muur Mysterie (Luur op de Muur) =====
(() => {
  const AIR = { bal: 1, appel: 2, ster: 2 };
  const HAND_X = 522, HAND_Y = 196;
  function wall() {
    rr(-10, 300, W + 20, 250, 0, '#c4553b', 4);
    for (let r = 0; r < 8; r++) {
      const y = 300 + r * 32, off = (r % 2) * 40;
      ln(0, y, W, y, 3, 'rgba(33,28,52,.45)');
      for (let x = -off; x < W; x += 80) ln(x, y, x, y + 32, 3, 'rgba(33,28,52,.45)');
    }
    rr(-10, 288, W + 20, 20, 4, '#e0d2b8', 4);
  }
  function thing(k, x, y, rot) {
    g.save(); g.translate(x, y); g.rotate(rot);
    if (k === 'bal') { circ(0, 0, 16, '#fff', 4); g.beginPath(); g.arc(0, 0, 16, -.6, .6); paint(null, 0); ln(-8, -13, 8, 13, 3, '#ef4a36'); }
    else if (k === 'appel') { circ(0, 0, 18, '#7bc96f', 4); ln(0, -18, 4, -28, 4); ell(10, -26, 7, 4, '#3d8a3a', 3, -.5); }
    else { poly([...Array(10)].map((_, i) => { const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? 11 : 26; return [Math.cos(a) * r, Math.sin(a) * r]; }), '#f6b92b', 4); }
    g.restore();
  }
  LEVELS.push({
    id: 'muur', title: 'Muur Mysterie', who: 'Luur op de Muur', song: 'Wat Is Dát?', color: '#4d7cf0', accent: '#8fd3f0',
    bpm: 108, beats: 64, key: 2,
    prog: [[0, 3, 7], [5, 9, 12], [3, 7, 10], [5, 9, 12]],
    drums: { k: 'x..x..x.', s: '..x...x.', h: 'x.x.x.x.' }, bass: '1.85.1.5', comp: 'arp',
    mel: [[[0, 7, 1], [1, 10, 1], [2, 12, 2], [6, 10, 2]], [[0, 14, 2], [2, 12, 2], [4, 9, 4]],
          [[0, 10, 1], [1, 12, 1], [2, 15, 2], [4, 14, 2], [6, 12, 2]], [[0, 14, 6]]],
    how: 'Somebody behind the wall keeps tossing things up to Luur. <b>Catch</b> them when they reach his hands.<br>A <b>ball</b> goes "pok" and lands one beat later. An <b>apple</b> flies high and takes two.',
    verdict: ['Luur caught everything and now has a jar full of mysteries. He has questions about all of them.',
      'Most of it landed in the jar. A couple of things are still rolling down the street.',
      'Watch the arc: the ball takes one beat, the apple takes two. Press when it touches his hands.'],
    chart() {
      const c = [], add = (bar, off, k = 'bal') => c.push({ b: bar * 4 + off, k, side: Math.random() < .5 ? 180 : 780 });
      add(1, 1); add(1, 3); add(2, 1); add(2, 3);
      add(3, 2, 'appel'); add(4, 1); add(4, 3); add(5, 2, 'appel'); add(5, 3);
      add(6, 1.5); add(6, 3); add(7, 2, 'appel'); add(8, 1); add(8, 2); add(8, 3);
      add(9, 2, 'appel'); add(10, 1.5); add(10, 3); add(11, 1); add(11, 2); add(11, 3);
      add(12, 2, 'appel'); add(12, 3.5); add(13, 1); add(13, 2); add(13, 3); add(14, 2, 'appel');
      add(15, 2, 'ster');
      return c;
    },
    cue(e, t, spb) {
      const air = AIR[e.k] * spb;
      if (e.k === 'bal') A.tone(t - air, fq(0), .12, 'square', .1, fq(12));
      else { A.tone(t - air, fq(-5), .22, 'square', .1, fq(9)); A.hat(t - spb, .12); }
      if (e.k === 'ster') { A.tone(t - air, fq(24), .6, 'sine', .08); A.tone(t - spb, fq(28), .4, 'sine', .07); }
    },
    hit(t, res, e) {
      A.tone(t, fq(e.k === 'bal' ? 19 : 24), .09, 'square', .09); A.clap(t, .2);
      if (e.k === 'ster') { [0, 4, 7, 12].forEach((n, i) => A.tone(t + i * .06, fq(24 + n), .3, 'sine', .08)); A.crash(t); }
    },
    miss(t) { A.kick(t, .4); A.tone(t, 160, .22, 'triangle', .1, 60); },
    draw(P) {
      sky('#8fd3f0', '#fdeccb');
      const moon = Math.sin(P.b * .05) * 6;
      [[90, 120], [300, 60], [700, 100], [880, 170]].forEach(([x, y], i) => txt('✦', x, y + moon * (i % 2 ? 1 : -1), 22, '#fff'));
      ell(760, 230, 120, 70, '#9cc7a0', 4); ell(200, 250, 160, 80, '#88b98d', 4);
      wall();
      // the jar of collected mysteries
      const caught = P.ev.filter(e => hitOk(e) && P.b - e.hb > .5);
      rr(612, 226, 60, 66, 14, 'rgba(255,255,255,.6)', 4); rr(616, 214, 52, 14, 4, '#c8742c', 4);
      caught.slice(-12).forEach((e, i) => circ(628 + (i % 3) * 14, 280 - Math.floor(i / 3) * 14, 6, e.k === 'bal' ? '#fff' : e.k === 'appel' ? '#7bc96f' : '#f6b92b', 2));
      // reach for whatever is coming
      let reach = 0, oops = 0, wow = 0;
      for (const e of P.ev) {
        const dt = e.b - P.b;
        if (!e.res && dt > -.2 && dt < .6) reach = Math.max(reach, 1 - Math.abs(dt) / .6);
        if (e.res === 'miss' && P.b - e.b < 1 && P.b >= e.b) oops = 1;
        if (hitOk(e) && P.b - e.hb >= 0 && P.b - e.hb < .6) wow = e.k === 'ster' ? 2 : 1;
      }
      const beat = Math.abs(Math.sin(P.b * Math.PI));
      bro('luur', { x: 480, y: 244, bob: beat * 4, ar: .4 + reach * .5 + (wow ? .3 : 0), al: wow ? .7 : .1, look: 1,
        eyes: oops ? 'x' : wow ? 'happy' : 'big', mouth: oops ? 'sad' : wow ? 'grin' : 'o' });
      if (wow === 2) bubble('Een STER?!', 400, 110, 30);
      else if (wow) bubble(['Oeh!', 'Wat is dát?', 'Hebbes!'][Math.floor(P.b) % 3], 400, 120, 26);
      if (oops) bubble('Hé!', 400, 120, 28);
      P.ev.forEach(e => cueRing(P, e, HAND_X, HAND_Y, AIR[e.k], e.k === 'ster' ? '#f6b92b' : '#4d7cf0', 64));
      for (const e of P.ev) {
        const air = AIR[e.k], k = (P.b - (e.b - air)) / air;
        if (k < 0) continue;
        let x, y, rot = P.b * 4;
        if (hitOk(e)) { const f = (P.b - e.hb) / .5; if (f > 1) continue; x = lerp(HAND_X, 640, ease(f)); y = lerp(HAND_Y, 250, ease(f)) - hop(f) * 50; }
        else if (e.res === 'miss') { const f = P.b - e.b; if (f > 1.5) continue; x = HAND_X + 60 + f * 120; y = HAND_Y + f * f * 300; }
        else {
          const t = clamp(k, 0, 1.2); x = lerp(e.side, HAND_X, t); y = lerp(560, HAND_Y, t) - hop(t) * (air === 1 ? 150 : 300);
          if (y > 290 && t < .5) { if (t > .05) txt('!', e.side, 270, 30, '#ef4a36'); continue; }   // still behind the wall: show where it'll pop up
        }
        thing(e.k, x, y, rot);
      }
    },
  });
})();

// ===== Level 4: Pluk Plukt (Pluk de Rukkende Uk) =====
(() => {
  const PX = 330, SPEED = 170, GROUND = 400;   // px the garden scrolls per beat
  LEVELS.push({
    id: 'pluk', title: 'Pluk Plukt', who: 'Pluk de Rukkende Uk', song: 'Hup Hup Wortel', color: '#f6b92b', accent: '#ef4a36',
    bpm: 124, beats: 64, key: 7,
    prog: [[0, 4, 7], [0, 4, 7], [5, 9, 12], [7, 11, 14]],
    drums: { k: 'x.x.x.x.', s: '..x...x.', h: '.x.x.x.x' }, bass: '1.8.1.8.', comp: 'stab',
    mel: [[[0, 12, 1], [1, 11, 1], [2, 12, 1], [3, 7, 1], [4, 4, 2], [6, 7, 2]], [[0, 9, 2], [2, 7, 2], [4, 4, 4]],
          [[0, 9, 1], [1, 12, 1], [2, 9, 1], [3, 5, 1], [4, 9, 2], [6, 12, 2]], [[0, 11, 2], [2, 14, 2], [4, 11, 2], [6, 7, 2]]],
    how: 'Tiny Pluk is strong for a toddler. Carrots slide past Pluk’s little hands. Each one goes <b>"pip!"</b> a beat early: <b>yank</b> it when it arrives.<br>The <b>giant beet</b> rumbles twice first. Give it everything.',
    verdict: ['A mountain of carrots, and Pluk is not even out of breath. Dinner is sorted for a week.',
      'Pretty good haul. A few carrots are still in the ground, waving at Pluk.',
      'Wait for the carrot to reach his hands; the "pip" is one beat early.'],
    chart() {
      const c = [], add = (bar, off, k = 'wortel') => c.push({ b: bar * 4 + off, k });
      [[1, 0], [1, 2], [2, 0], [2, 2], [3, 0], [3, 1], [3, 2]].forEach(a => add(...a)); add(4, 0, 'reus');
      [[5, 0], [5, 1], [5, 2], [5, 3], [6, 0], [6, 1.5], [6, 3], [7, 0], [7, 2], [7, 2.5], [7, 3]].forEach(a => add(...a)); add(8, 0, 'reus');
      [[9, 0], [9, 1], [9, 1.5], [9, 2], [10, 0], [10, 2], [10, 3], [11, 0], [11, 1], [11, 2], [11, 3]].forEach(a => add(...a)); add(12, 0, 'reus');
      [[13, 0], [13, 1], [13, 2], [14, 0], [14, 1], [14, 2], [14, 3]].forEach(a => add(...a)); add(15, 0, 'reus');
      return c;
    },
    cue(e, t, spb) {
      if (e.k === 'reus') { A.tone(t - 2 * spb, 70, .3, 'sawtooth', .16, 50, 400); A.tone(t - spb, 70, .3, 'sawtooth', .16, 50, 400); }
      else A.tone(t - spb, fq(24), .06, 'square', .07, fq(31));
    },
    hit(t, res, e) {
      A.tone(t, fq(7), .1, 'square', .1, fq(19)); A.nz(t, .06, .25, 'bandpass', 2000, 2);
      A.voice(t, fq(e.k === 'reus' ? 7 : 16), e.k === 'reus' ? .3 : .12, .9, 'u');
      if (e.k === 'reus') { A.kick(t); A.crash(t, .2); }
    },
    miss(t) { A.tone(t, 300, .25, 'triangle', .08, 150); },
    draw(P) {
      sky('#ffe3a3', '#fff6df');
      circ(800, 110, 60, '#ffb347', 4);
      // fence + soil
      for (let x = (-(P.b * SPEED * .4) % 60) - 60; x < W + 60; x += 60) { rr(x, 270, 18, 120, 4, '#fff', 3); }
      rr(-10, 300, W + 20, 18, 0, '#fff', 3);
      rr(-10, GROUND, W + 20, 160, 0, '#8a5a3b', 4);
      for (let x = (-(P.b * SPEED) % 90); x < W + 90; x += 90) ell(x, GROUND + 60, 20, 6, '#6e452c', 0);
      // basket of loot
      const got = P.ev.filter(e => hitOk(e) && P.b - e.hb > .6).length;
      rr(110, 330, 110, 70, 12, '#d9a35b', 4);
      for (let i = 0; i < Math.min(got, 14); i++) ell(125 + (i % 6) * 15, 330 - Math.floor(i / 6) * 10, 6, 16, '#ff8a2b', 2, .6);
      txt(got, 165, 372, 28, '#fff');
      let yank = 0, sad = 0, big = 0, tug = 0;
      for (const e of P.ev) {
        const dt = e.b - P.b;
        if (!e.res && dt > 0 && dt < .5) tug = Math.max(tug, 1 - dt * 2);
        if (hitOk(e) && P.b - e.hb >= 0 && P.b - e.hb < .5) { yank = 1 - (P.b - e.hb) * 2; big = e.k === 'reus'; }
        if (e.res === 'miss' && P.b >= e.b && P.b - e.b < 1) sad = 1;
      }
      // the produce
      for (const e of P.ev) {
        const dt = e.b - P.b, reus = e.k === 'reus', sz = reus ? 2.2 : 1;
        if (dt > 6) continue;
        let x = PX + 20 + dt * SPEED, y = GROUND;
        if (hitOk(e)) {
          const f = (P.b - e.hb) / .6; if (f > 1) continue;
          x = lerp(PX + 20 + (e.b - e.hb) * SPEED, 165, ease(f)); y = lerp(GROUND - 60, 320, ease(f)) - hop(f) * (reus ? 260 : 160);
        } else if (x < -60) continue;
        const peek = !e.res && dt < 1 ? 1 : 0, wig = peek ? Math.sin(P.b * 30) * .2 : 0;
        g.save(); g.translate(x, y); g.scale(sz, sz); g.rotate(wig);
        for (let l = -1; l <= 1; l++) ell(l * 7, -18 - Math.abs(l) * -4 - peek * 6, 5, 14, '#3d8a3a', 3, l * .4);
        if (hitOk(e)) poly([[-11, -6], [11, -6], [0, 40]], reus ? '#b4325a' : '#ff8a2b', 3);
        else ell(0, -2, 12, 6, reus ? '#b4325a' : '#ff8a2b', 3);
        g.restore();
      }
      // the yank spot, right under Pluk's hands
      g.save(); g.setLineDash([6, 6]); ell(PX + 20, GROUND + 4, 30, 9, 'rgba(255,255,255,.35)', 3); g.restore();
      P.ev.forEach(e => cueRing(P, e, PX + 20, GROUND - 14, e.k === 'reus' ? 2 : 1, e.k === 'reus' ? '#b4325a' : '#ff8a2b', 54));
      const beat = Math.abs(Math.sin(P.b * Math.PI));
      actor('pluk', { x: PX, y: GROUND - 60 + 18,
        bob: beat * 6, squash: tug * .6 - yank * .3, arms: yank ? .9 + (big ? .3 : 0) : .05 + tug * .2,
        eyes: sad ? 'x' : yank ? 'happy' : 'big', mouth: sad ? 'sad' : yank ? 'grin' : 'o', rot: -yank * .15 });
      if (yank > .4) bubble(big ? 'HUUUP!' : 'Hup!', PX + 20, GROUND - 190, big ? 34 : 24);
      if (sad) bubble('Nee!', PX + 20, GROUND - 190, 24);
    },
  });
})();
