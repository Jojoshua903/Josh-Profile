'use strict';
// ===== Level 1: Stoep Stomp (Joep op de Stoep) =====
(() => {
  const CALLS = { slow: [2, 1], fast: [1, .5], big: [3, 2, 1] };
  const WORDS = { slow: ['Één!', 'Twee!'], fast: ['Een-', 'twee!'], big: ['Één!', 'Twee!', 'DRIE…'] };
  const HOUSES = [['#b5482f', 70], ['#e8a33d', 60], ['#7f3b2c', 80], ['#3f7d73', 64], ['#c95b3c', 72], ['#9b5b3b', 66], ['#d9873a', 74], ['#6a4a8a', 60]];
  function houses() {
    let x = -20;
    HOUSES.forEach(([c, w], i) => {
      const hgt = 230 + (i % 3) * 30, top = 400 - hgt, ww = w * 1.8;
      poly([[x, 400], [x, top + 30], [x + ww * .2, top + 30], [x + ww * .2, top + 10], [x + ww * .4, top + 10], [x + ww * .4, top - 10],
        [x + ww * .6, top - 10], [x + ww * .6, top + 10], [x + ww * .8, top + 10], [x + ww * .8, top + 30], [x + ww, top + 30], [x + ww, 400]], c, 4);
      for (let r = 0; r < 3; r++) for (let k = 0; k < 2; k++) rr(x + ww * (.2 + k * .38), top + 50 + r * 62, ww * .22, 40, 4, '#fdf6e6', 3);
      x += ww;
    });
  }
  LEVELS.push({
    id: 'stoep', title: 'Stoep Stomp', who: 'Joep op de Stoep', song: 'Één Twee Stoep!', color: '#ef4a36', accent: '#f6b92b',
    bpm: 118, beats: 64, key: 0,
    prog: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [5, 9, 12]],
    drums: { k: 'x...x...', s: '..x...x.', h: 'xxxxxxxx' }, bass: '1.1.5.8.', comp: 'stab',
    mel: [[[0, 7, 2], [2, 9, 2], [4, 7, 1], [5, 4, 1], [6, 0, 2]], [[0, 5, 3], [3, 9, 1], [4, 12, 2], [6, 9, 2]],
          [[0, 11, 2], [2, 7, 2], [4, 14, 2], [6, 11, 2]], [[0, 12, 4], [4, 9, 2], [6, 5, 2]]],
    how: 'Joep counts in, his brothers jump. When Joep shouts <b>"Één, twee!"</b>, press on <b>three</b>.<br>When he rushes it (<b>"een-twee!"</b>), the jump comes right after.',
    verdict: ['The whole street is clapping. Joep is already shouting the next song.',
      'Solid stomping. The stoep survived, and so did your ankles.',
      'Joep counts to two, you jump on three. Listen for "één, twee", then go.'],
    chart() {
      const c = [], add = (bar, off, k) => c.push({ b: bar * 4 + off, k });
      [1, 2, 3, 4].forEach(b => add(b, 3, 'slow'));
      add(5, 3, 'fast'); add(6, 3, 'slow'); add(7, 3, 'fast'); add(8, 1, 'fast'); add(8, 3, 'fast');
      [9, 10].forEach(b => { add(b, 1, 'fast'); add(b, 3, 'fast'); });
      add(11, 3, 'slow'); add(12, 3, 'slow'); add(13, 1, 'fast'); add(13, 3, 'fast'); add(14, 3, 'slow');
      add(15, 3, 'big');
      return c;
    },
    cue(e, t, spb) {
      const pitch = { slow: [7, 4], fast: [9, 7], big: [4, 7, 12] }[e.k];
      CALLS[e.k].forEach((d, i) => A.voice(t - d * spb, fq(pitch[i]), e.k === 'fast' ? .1 : .17, .9, i === 2 ? 'i' : 'e'));
    },
    hit(t, res, e) {
      A.kick(t); A.clap(t); A.voice(t, fq(e.k === 'big' ? 16 : 12), .2, 1, 'u');
      if (e.k === 'big') A.crash(t, .25);
    },
    miss(t) { A.tone(t, 240, .35, 'sawtooth', .07, 90, 1200); },
    draw(P) {
      sky('#a9def5', '#f9e7c6'); circ(820, 90, 46, '#ffd75e', 4);
      houses();
      rr(-10, 400, W + 20, 160, 0, '#d8c6a6', 4);
      for (let x = -40; x < W + 40; x += 64) ln(x, 400, x - 40, 540, 3, 'rgba(33,28,52,.3)');
      ln(0, 470, W, 470, 3, 'rgba(33,28,52,.3)');
      rr(-10, 392, W + 20, 14, 4, '#b8a586', 4);
      // who is calling, and who is jumping
      let say = null, armUp = 0, jump = 0, trip = 0, crouch = 0, shout = null;
      for (const e of P.ev) {
        CALLS[e.k].forEach((d, i) => { const k = P.b - (e.b - d); if (k >= 0 && k < .45) { say = WORDS[e.k][i]; armUp = 1 - k * 1.5; } });
        const dt = e.b - P.b;
        if (!e.res && dt > 0 && dt < 1) crouch = Math.max(crouch, (1 - dt) * .6);
        if (hitOk(e) && P.b - e.hb >= 0 && P.b - e.hb < 1) { jump = hop((P.b - e.hb) / .9) * (e.k === 'big' ? 170 : 110); shout = e.k === 'big' ? 'STOEEEP!' : 'STOEP!'; }
        if (e.res === 'miss' && P.b - e.b >= 0 && P.b - e.b < 1.2) trip = 1;
      }
      const w = recent(P, .5);
      if (w && w.res === 'whiff') jump = Math.max(jump, hop((P.b - w.b) / .5) * 30);
      const beat = Math.abs(Math.sin(P.b * Math.PI));
      bro('joep', { x: 210, y: 330, bob: beat * 8, ar: clamp(armUp, 0, 1) * 1.1, al: .15, mouth: say ? 'wow' : 'grin' });
      if (say) bubble(say, 250, 210, 30);
      // count pips over Joep + a ring at the brothers' feet that closes on the jump
      const live = P.ev.find(e => !e.res && P.b >= e.b - CALLS[e.k][0] - .2 && P.b <= e.b + .2);
      if (live) {
        const n = CALLS[live.k].length, done = CALLS[live.k].filter(d => P.b >= live.b - d).length;
        callPips(210, 150, n + 1, done, '#ef4a36');
        cueRing(P, live, 640, 398, CALLS[live.k][0], '#ef4a36', 110);
      }
      const jy = -jump, sq = jump > 0 ? -.3 : crouch;
      bro('cas', { x: 560, y: 330 + jy, bob: 0, squash: sq, arms: jump > 0 ? .9 : .1, rot: trip * .5, eyes: trip ? 'x' : jump ? 'happy' : 'sleepy', mouth: trip ? 'sad' : jump ? 'grin' : 'smile' });
      bro('luur', { x: 720, y: 340 + jy * 1.1, s: .9, squash: sq, arms: jump > 0 ? 1 : .2, rot: -trip * .5, eyes: trip ? 'x' : 'big', mouth: trip ? 'sad' : jump ? 'grin' : 'o', look: -1 });
      if (shout && jump > 20) bubble(shout, 640, 150 + jy * .3, 34);
      if (trip) txt('oef!', 640, 250, 34, '#ef4a36', 'center', HAND, 400);
    },
  });
})();

// ===== Level 2: Gras Groove (Cas in 't Gras) =====
(() => {
  const LEAD = { vlinder: 2, bij: 1 };
  LEVELS.push({
    id: 'gras', title: 'Gras Groove', who: "Cas in 't Gras", song: 'Lekker Liggen', color: '#7bc96f', accent: '#f59ab5',
    bpm: 90, beats: 48, key: 5, swing: .34,
    prog: [[0, 4, 7, 11], [2, 5, 9, 12], [4, 7, 11, 14], [5, 9, 12, 16]],
    drums: { k: 'x.....x.', s: '....x...', h: 'x.x.x.xx' }, bass: '1..5..8.', comp: 'pad', lead: 'triangle', leadVol: .07,
    mel: [[[0, 7, 3], [4, 4, 4]], [[0, 9, 2], [2, 7, 2], [4, 5, 4]], [[0, 11, 3], [4, 7, 4]], [[0, 12, 6]]],
    how: "Cas is napping. Bugs keep landing on his nose. Press to <b>blow them away</b> right as they land.<br>A <b>butterfly</b> chimes and drifts in for two beats. A <b>bee</b> buzzes and arrives one beat later.",
    verdict: ['Not a single bug touched him. Cas slept through the whole thing, which is the highest compliment.',
      'A few tickles, but Cas calls it a good nap.',
      'Cas sneezed so hard he woke up. Wait for the bug to arrive before you blow.'],
    chart() {
      const c = [], add = (bar, off, k) => c.push({ b: bar * 4 + off, k, y: 120 + Math.random() * 140 });
      add(1, 2, 'vlinder'); add(2, 2, 'vlinder'); add(3, 0, 'vlinder'); add(3, 2, 'vlinder');
      add(4, 3, 'bij'); add(5, 3, 'bij'); add(6, 1, 'vlinder'); add(6, 3, 'bij');
      add(7, 2, 'bij'); add(7, 2.5, 'bij'); add(8, 2, 'bij'); add(8, 2.5, 'bij');
      add(9, 0, 'vlinder'); add(9, 2, 'bij'); add(9, 2.5, 'bij'); add(9, 3, 'bij');
      add(10, 1, 'vlinder'); add(10, 3, 'bij');
      add(11, 0, 'vlinder'); add(11, 2, 'vlinder');
      return c;
    },
    cue(e, t, spb) {
      if (e.k === 'vlinder') { A.tone(t - 2 * spb, fq(19), .35, 'sine', .14); A.tone(t - 2 * spb + .07, fq(24), .35, 'sine', .11); A.tone(t - spb, fq(21), .2, 'sine', .06); }
      else A.tone(t - spb, 170, spb * .8, 'sawtooth', .06, 230, 900);
    },
    hit(t) { A.nz(t, .28, .35, 'bandpass', 700, 1.2, 2600); A.voice(t, fq(-5), .15, .5, 'u'); },
    miss(t) { A.voice(t, fq(14), .09, .9, 'a'); A.voice(t + .13, fq(7), .28, .9, 'u'); },
    draw(P) {
      sky('#9bd9f2', '#e9f7d9');
      circ(130, 100, 52, '#ffe066', 4);
      [[300, 80], [620, 120], [860, 70]].forEach(([x, y], i) => { const dx = Math.sin(P.b * .1 + i) * 20; ell(x + dx, y, 70, 24, '#fff', 3); ell(x + dx + 30, y - 14, 36, 22, '#fff', 3); });
      g.beginPath(); g.moveTo(-10, 380); g.quadraticCurveTo(W / 2, 300, W + 10, 380); g.lineTo(W + 10, H + 10); g.lineTo(-10, H + 10); g.closePath(); paint('#7bc96f', 4);
      for (let i = 0; i < 40; i++) { const x = (i * 97) % W, y = 400 + (i * 53) % 120, sw = Math.sin(P.b * Math.PI / 2 + i) * 4; ln(x, y, x + sw, y - 16, 3, '#3d8a3a'); }
      [[120, 470, '#f59ab5'], [820, 450, '#fff'], [700, 500, '#f6b92b'], [260, 500, '#fff']].forEach(([x, y, c]) => { ln(x, y, x, y - 30, 3); circ(x, y - 34, 9, c, 3); circ(x, y - 34, 3, '#f6b92b', 0); });
      // Cas lying on his back
      const cx = 470, cy = 390, s = 1.25, fx = cx - 44 * s, fy = cy;
      let blow = 0, sneeze = 0;
      for (const e of P.ev) {
        if (hitOk(e) && P.b - e.hb >= 0 && P.b - e.hb < .4) blow = 1;
        if (e.res === 'miss' && P.b - e.b >= 0 && P.b - e.b < 1) sneeze = 1;
      }
      const breathe = Math.sin(P.b * Math.PI / 2) * 3;
      bro('cas', { x: cx, y: cy + breathe * .3, s, rot: -Math.PI / 2, arms: .25, eyes: sneeze ? 'x' : 'sleepy', mouth: blow || sneeze ? 'o' : 'smile' });
      if (blow) for (let i = 0; i < 3; i++) ln(fx - 4 + i * 4, fy - 40 - i * 12, fx + 30 + i * 14, fy - 90 - i * 18, 3, 'rgba(33,28,52,.5)');
      if (sneeze) bubble('HATSJOE!', fx + 40, fy - 140, 32);
      else if (!blow && Math.floor(P.b / 2) % 2 === 0) txt('z z z', fx + 40, fy - 120 - (P.b % 2) * 8, 26, INK, 'left', HAND, 400);
      // bugs
      P.ev.forEach(e => cueRing(P, e, fx + 4, fy - 52, LEAD[e.k], e.k === 'vlinder' ? '#f59ab5' : '#f6b92b', 60));
      for (const e of P.ev) {
        const L = LEAD[e.k], k = (P.b - (e.b - L)) / L;
        if (k < 0) continue;
        let x, y, rot = 0;
        if (hitOk(e)) {
          const f = (P.b - e.hb); if (f > 2) continue;
          x = fx + f * 260; y = fy - 60 - f * 220; rot = f * 8;
        } else if (e.res === 'miss') {
          if (P.b - e.b > 1.5) continue; x = fx + 4; y = fy - 52;
        } else {
          const t = clamp(k, 0, 1);
          x = lerp(W + 40, fx + 4, t); y = lerp(e.y, fy - 52, t) - Math.sin(t * Math.PI) * (e.k === 'vlinder' ? 80 : 20) + (e.k === 'bij' ? Math.sin(P.b * 40) * 3 : 0);
        }
        g.save(); g.translate(x, y); g.rotate(rot);
        if (e.k === 'vlinder') {
          const fl = Math.abs(Math.sin(P.b * 10)) * .8 + .2;
          ell(-12, -6, 14 * fl, 18, '#f59ab5', 3, -.4); ell(12, -6, 14 * fl, 18, '#f59ab5', 3, .4); ell(0, 0, 4, 14, INK, 0);
        } else {
          ell(0, -12, 9, 7, 'rgba(255,255,255,.85)', 3); ell(0, 0, 14, 10, '#f6c32b', 3); ln(-3, -9, -3, 9, 4); ln(5, -8, 5, 8, 4);
        }
        g.restore();
      }
    },
  });
})();
