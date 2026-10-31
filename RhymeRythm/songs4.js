'use strict';
// ===== Droomwolk (Martin-Broom heeft een Droom) =====
(() => {
  const LEAD = { bel: 2, ster: 1, schaap: 1 };
  LEVELS.push({
    id: 'droom', title: 'Droomwolk', who: 'Martin-Broom heeft een Droom', song: 'Slaap Zacht', color: '#b8c0ff', accent: '#ffd6e0',
    bpm: 84, beats: 48, key: 8, swing: .2,
    prog: [[0, 4, 7, 11], [5, 9, 12, 16], [2, 5, 9, 12], [7, 11, 14, 17]],
    drums: { k: 'x.......', s: '....x...', h: '..x...x.' }, bass: '1...5...', comp: 'pad', lead: 'triangle', leadVol: .08,
    mel: [[[0, 12, 3], [3, 11, 1], [4, 7, 4]], [[0, 9, 3], [3, 12, 1], [4, 16, 4]], [[0, 14, 3], [3, 12, 1], [4, 9, 4]], [[0, 11, 8]]],
    how: 'Martin-Broom is dreaming. Help the dream along without waking him up.<br>A <b>bubble</b> floats up from his head with a soft "bloop": <b>pop it</b> two beats later, at the top. A <b>sheep</b> goes "mèè": press as it jumps the fence, one beat later. A <b>shooting star</b> whistles down: catch it one beat later.',
    verdict: ['The dreamiest dream ever. Martin-Broom says he dreamt about you.', 'A nice dream, with a couple of bumps in the night.', 'Bubbles take two beats to rise. Sheep and stars take one.'],
    chart() {
      const c = [], add = (bar, off, k) => c.push({ b: bar * 4 + off, k, x: 300 + (c.length * 137) % 400 });
      add(1, 2, 'bel'); add(2, 2, 'bel'); add(3, 1, 'schaap'); add(3, 2, 'schaap'); add(3, 3, 'schaap');
      add(4, 2, 'bel'); add(4, 3, 'ster'); add(5, 1, 'schaap'); add(5, 2, 'bel'); add(5, 3, 'schaap');
      add(6, 1, 'ster'); add(6, 2, 'bel'); add(6, 3, 'ster'); add(7, 1, 'schaap'); add(7, 1.5, 'schaap'); add(7, 2, 'schaap'); add(7, 3, 'bel');
      add(8, 1, 'ster'); add(8, 2, 'bel'); add(8, 3, 'ster'); add(9, 2, 'bel'); add(9, 3, 'schaap'); add(10, 1, 'ster'); add(10, 2, 'bel'); add(10, 3, 'bel');
      return c;
    },
    cue(e, t, spb) {
      if (e.k === 'bel') A.tone(t - 2 * spb, fq(12), .15, 'sine', .2, fq(19));
      else if (e.k === 'schaap') A.voice(t - spb, fq(9), .18, .8, 'e', fq(7));
      else A.tone(t - spb, fq(36), spb * .9, 'sine', .08, fq(24));
    },
    hit(t, res, e) { A.tone(t, fq(e.k === 'ster' ? 31 : 24), .2, 'sine', .12); if (e.k === 'bel') A.nz(t, .04, .15, 'highpass', 5000); },
    miss(t) { A.tone(t, fq(12), .3, 'triangle', .06, fq(5)); },
    draw(P) {
      sky('#d9d4ff', '#ffe4ef'); dots('rgba(255,255,255,.4)', 26);
      for (let i = 0; i < 4; i++) { const x = (i * 260 + P.b * 6) % (W + 200) - 100; ell(x, 90 + (i % 2) * 40, 80, 24, '#fff', 3); }
      ell(300, 430, 260, 70, '#fff', 4); ell(160, 410, 90, 50, '#fff', 4); ell(440, 410, 110, 56, '#fff', 4);
      rr(600, 380, 260, 12, 4, '#fff', 3); [620, 700, 780, 840].forEach(x => ln(x, 392, x, 440, 5)); ln(560, 440, 900, 440, 4);
      const wake = P.ev.some(e => e.res === 'miss' && P.b >= e.b && P.b - e.b < .8);
      actor('martin', { x: 290, y: 360, rot: -1.25, eyes: wake ? 'open' : 'sleepy', mouth: wake ? 'wow' : 'smile', arms: .2 });
      const sheepDone = P.ev.filter(e => e.k === 'schaap' && hitOk(e) && P.b > e.hb).length;
      txt(`🐑 ${sheepDone}`, 860, 40, 26, INK, 'right');
      for (const e of P.ev) {
        const L = LEAD[e.k], k = (P.b - (e.b - L)) / L;
        if (k < 0) continue;        if (e.x == null) e.x = 300 + Math.round(e.b * 137) % 400;
        const done = hitOk(e) ? P.b - e.hb : e.res === 'miss' ? P.b - e.b : -1;
        if (done > .8) continue;
        if (e.k === 'bel') {
          const t = clamp(k, 0, 1), x = lerp(250, e.x, t), y = lerp(300, 110, ease(t));
          if (hitOk(e)) { for (let i = 0; i < 8; i++) circ(e.x + Math.cos(i) * done * 80, 110 + Math.sin(i) * done * 80, 4, '#fff', 2); txt(['🍉', '⭐', '🌙', '🎈'][e.x % 4], e.x, 110 - done * 40, 30, INK); }
          else if (e.res === 'miss') { circ(e.x, 110 - done * 80, 30 * (1 - done), 'rgba(255,255,255,.4)', 2); }
          else { circ(x, y, 22 + t * 12, 'rgba(255,255,255,.55)', 3); circ(x - 8, y - 8, 5, '#fff', 0); }
        } else if (e.k === 'schaap') {
          const t = clamp(k, 0, 1.4), x = lerp(560, 760, t) + (done > 0 ? done * 200 : 0), y = 420 - (hitOk(e) ? hop(Math.min(1, .5 + done)) * 80 : 0) - (!e.res ? hop(clamp((t - .7) / .6, 0, 1)) * 60 : 0);
          ell(x, y, 26, 18, '#fff', 3); circ(x + 22, y - 8, 10, INK, 0); ln(x - 12, y + 16, x - 12, y + 28, 4); ln(x + 12, y + 16, x + 12, y + 28, 4);
          if (e.res === 'miss') txt('bonk', x, y - 40, 20, INK, 'center', HAND, 400);
        } else {
          const t = clamp(k, 0, 1), x = lerp(900, 640, t), y = lerp(40, 200, t);
          if (!e.res) { ln(x, y, x + 60, y - 36, 4, '#f6b92b'); txt('★', x, y, 34, '#f6b92b'); }
          else if (hitOk(e)) txt('★', 640, 200 - done * 100, 34 + done * 30, '#f6b92b');
          else txt('★', 640 - done * 60, 200 + done * 260, 30, '#c9c4dc');
        }
        if (e.x == null) continue;
        if (e.k === 'bel') cueRing(P, e, e.x, 110, 2, '#8e7cf0', 70);
        else if (e.k === 'schaap') cueRing(P, e, 760, 360, 1, '#4d7cf0', 60);
        else cueRing(P, e, 640, 200, 1, '#f6b92b', 60);
      }
      if (wake) bubble('Hè? Wat?', 330, 220, 24);
      else if (Math.floor(P.b / 4) % 3 === 0) bubble('…ik had een droom…', 330, 220, 20);
    },
  });
})();

// ===== Huil naar de Maan (Rolf de Alpha Wolf) =====
(() => {
  const CALL = { huil: 2, kort: 1, maan: 3 };
  LEVELS.push({
    id: 'huil', title: 'Huil naar de Maan', who: 'Rolf de Alpha Wolf', song: 'Auuu Blues', color: '#9aa3b5', accent: '#f6b92b',
    bpm: 92, beats: 60, key: 9,
    prog: [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-5, -1, 2]],
    drums: { k: 'x...x.x.', s: '..x...x.', h: 'x.x.x.x.' }, bass: '1..58..5', comp: 'pad', lead: 'sawtooth', leadVol: .04,
    mel: [[[0, 12, 2], [2, 15, 2], [4, 16, 4]], [[0, 12, 3], [3, 15, 1], [4, 19, 4]], [[0, 17, 2], [2, 14, 2], [4, 10, 4]], [[0, 11, 4], [4, 14, 4]]],
    how: 'Rolf only lets you into his pack if you can keep up with his howls. Rolf howls, the brothers answer: <b>howl</b> on the beat after him.<br>A <b>long "auuu"</b> = answer two beats after it starts. Two <b>quick yips</b> = answer right after the second. Three <b>rising howls</b> = the big full-moon howl.',
    verdict: ['Rolf wipes away a single tear. "Welcome to the pack." Then he flexes, to hide it.', 'Rolf grunts approvingly. You are… acceptable cubs.', 'Answer one beat after Rolf finishes. Count the yips.'],
    chart() {
      const c = [], add = (bar, off, k) => c.push({ b: bar * 4 + off, k });
      add(1, 2, 'huil'); add(2, 2, 'huil'); add(3, 1, 'kort'); add(3, 3, 'kort'); add(4, 2, 'huil'); add(5, 1, 'kort'); add(5, 2, 'kort'); add(5, 3, 'kort');
      add(6, 3, 'maan'); add(7, 2, 'huil'); add(8, 1, 'kort'); add(8, 3, 'huil'); add(9, 1, 'kort'); add(9, 2, 'kort'); add(9, 3.5, 'kort');
      add(10, 3, 'maan'); add(11, 2, 'huil'); add(12, 1, 'kort'); add(12, 2, 'kort'); add(12, 3, 'kort'); add(13, 3, 'maan');
      return c;
    },
    cue(e, t, spb) {
      if (e.k === 'huil') A.voice(t - 2 * spb, fq(0), spb * .95, .9, 'u', fq(7));
      else if (e.k === 'kort') [1, .5].forEach(d => A.voice(t - d * spb, fq(12), .07, .9, 'a'));
      else [3, 2, 1].forEach((d, i) => A.voice(t - d * spb, fq(i * 4), spb * .8, .9, 'u', fq(i * 4 + 5)));
    },
    hit(t, res, e) { A.voice(t, fq(e.k === 'maan' ? 12 : 7), e.k === 'kort' ? .12 : .35, .8, 'u', fq(e.k === 'maan' ? 19 : 12)); },
    miss(t) { A.voice(t, fq(4), .15, .6, 'e'); },
    draw(P) {
      sky('#ffc4d6', '#ffe9c7'); circ(720, 130, 90, '#fff8d6', 4); circ(690, 110, 14, '#f3e7b3', 0); circ(750, 160, 10, '#f3e7b3', 0);
      g.beginPath(); g.moveTo(-10, 420); g.quadraticCurveTo(300, 330, 620, 400); g.lineTo(W + 10, 380); g.lineTo(W + 10, H); g.lineTo(-10, H); g.closePath(); paint('#7a8f6a', 4);
      poly([[600, 400], [660, 300], [800, 290], [860, 400]], '#9aa3b5', 4);
      let rolf = 0, pack = 0, bad = 0;
      for (const e of P.ev) {
        const L = CALL[e.k], k = P.b - (e.b - L);
        if (!e.res && k >= 0 && k < L) rolf = 1;
        if (hitOk(e) && P.b - e.hb >= 0 && P.b - e.hb < .6) pack = e.k === 'maan' ? 2 : 1;
        if (e.res === 'miss' && P.b >= e.b && P.b - e.b < .8) bad = 1;
      }
      actor('rolf', { x: 730, y: 220, ar: rolf ? .7 : .3, al: rolf ? .7 : .3, mouth: rolf ? 'wow' : 'grin', look: -1, rot: rolf ? -.15 : 0 });
      if (rolf) bubble('AUUU!', 650, 70, 26);
      const ears = (x, y, s) => { poly([[x - 24 * s, y - 64 * s], [x - 14 * s, y - 92 * s], [x - 4 * s, y - 72 * s]], '#7d8597', 3); poly([[x + 24 * s, y - 64 * s], [x + 14 * s, y - 92 * s], [x + 4 * s, y - 72 * s]], '#7d8597', 3); };
      [['cas', 150, 345], ['joep', 260, 330], ['luur', 370, 350]].forEach(([n, x, y], i) => {
        const s = n === 'luur' ? .85 : .95;
        bro(n, { x, y, s, rot: pack ? -.2 : 0, arms: pack === 2 ? 1 : .2, mouth: pack ? 'wow' : bad ? 'sad' : 'smile', eyes: bad ? 'x' : pack ? 'happy' : n === 'cas' ? 'sleepy' : 'open' });
        ears(x, y, s);
      });
      if (pack) bubble(pack === 2 ? 'AUUUUUUU!' : 'Auuu!', 260, 150, pack === 2 ? 32 : 24);
      if (bad) bubble('Kef?', 260, 150, 24);
      // one pip per howl/yip from Rolf, then the brothers' answer; ring closes on Joep
      const SND = { huil: [2], kort: [1, .5], maan: [3, 2, 1] };
      const live = P.ev.find(e => !e.res && P.b >= e.b - CALL[e.k] - .1 && P.b < e.b + .3);
      if (live && !pack) callPips(260, 100, SND[live.k].length + 1, SND[live.k].filter(d => P.b >= live.b - d - .02).length + (P.b >= live.b - .05 ? 1 : 0), '#f6b92b');
      P.ev.forEach(e => cueRing(P, e, 260, 240, Math.min(CALL[e.k], 2), e.k === 'maan' ? '#f6b92b' : '#7d8597', 80));
    },
  });
})();

// ===== Boss: De Baas van Sinterklaas =====
(() => {
  const UX = 700, UY = 120, MX = 300, MY = 290, LEAD = { pew: 1, straal: 2, vrij: 3 };
  LEVELS.push({
    id: 'baas', title: 'De Baas van Sinterklaas', who: 'Boss · the whole crew', song: 'Pepernoten Protocol', color: '#4a2a6a', accent: '#9bc59d',
    bpm: 136, beats: 68, key: 1,
    prog: [[0, 3, 7], [3, 7, 10], [-2, 2, 5], [1, 5, 8]],
    drums: { k: 'x.xx..x.', s: '..x...x.', h: 'xxxxxxxx' }, bass: '18188181', comp: 'arp', lead: 'square',
    mel: [[[0, 12, 1], [1, 15, 1], [2, 19, 2], [4, 17, 1], [5, 15, 1], [6, 12, 2]], [[0, 15, 2], [2, 19, 2], [4, 22, 4]],
          [[0, 14, 1], [1, 17, 1], [2, 21, 2], [4, 19, 2], [6, 14, 2]], [[0, 13, 3], [3, 17, 1], [4, 20, 4]]],
    how: 'De Baas fires lasers from his saucer. Kouw built a giant mirror, and Joep aims it. <b>Reflect</b> each shot right back.<br>A <b>"pew"</b> = reflect one beat later. A <b>charging hum</b> = the big beam, two beats. At the end, everyone chants <b>"Sin-ter-klaas!"</b>: press on the beat after to burst the bubble and free him.',
    verdict: ['Sinterklaas is free, De Baas is gone, and there are pepernoten for everyone. Even Maat came to watch.', 'You did it, with a few scorch marks on the mirror.', 'Reflect one beat after "pew", two after the hum, and one after the chant.'],
    chart() {
      const c = [], add = (bar, off, k = 'pew') => c.push({ b: bar * 4 + off, k });
      add(1, 1); add(1, 3); add(2, 1); add(2, 2); add(2, 3); add(3, 2, 'straal'); add(4, 1); add(4, 3); add(4, 3.5);
      add(5, 2, 'straal'); add(6, 1); add(6, 1.5); add(6, 3); add(7, 1); add(7, 2); add(7, 3); add(8, 2, 'straal');
      add(9, 1); add(9, 2); add(9, 3); add(10, 1); add(10, 3); add(10, 3.5); add(11, 2, 'straal'); add(12, 1); add(12, 2); add(12, 3);
      add(13, 2, 'straal'); add(14, 1); add(14, 2); add(16, 0, 'vrij');
      return c;
    },
    cue(e, t, spb) {
      if (e.k === 'pew') A.tone(t - spb, 1800, .12, 'square', .07, 400);
      else if (e.k === 'straal') A.tone(t - 2 * spb, 80, 2 * spb * .95, 'sawtooth', .08, 400, 1200);
      else [3, 2, 1].forEach((d, i) => { [0, 4, 7].forEach(n => A.voice(t - d * spb, fq([7, 4, 0][i] + n), .2, .35, ['i', 'e', 'a'][i])); });
    },
    hit(t, res, e) {
      if (e.k === 'vrij') { A.crash(t, .35); A.kick(t); [0, 4, 7, 12, 16].forEach((n, i) => A.tone(t + i * .06, fq(13 + n), .4, 'triangle', .07)); return; }
      A.tone(t, 900, .1, 'square', .07, 2400); A.nz(t, .06, .2, 'bandpass', 3000, 2);
    },
    miss(t) { A.kick(t); A.nz(t, .3, .2, 'lowpass', 700); },
    draw(P) {
      const fin = P.ev.find(e => e.k === 'vrij'), won = fin && hitOk(fin), wk = won ? P.b - fin.hb : 0;
      sky(won ? '#ffe9b0' : '#ffb8a0', won ? '#fff3db' : '#ffd6e4');
      for (let i = 0; i < 8; i++) { const x = i * 130 - 20; rr(x, 380 - (i % 3) * 30, 120, 200, 0, ['#b5482f', '#7f3b2c', '#c95b3c'][i % 3], 4); poly([[x, 380 - (i % 3) * 30], [x + 60, 330 - (i % 3) * 30], [x + 120, 380 - (i % 3) * 30]], '#5a2a20', 4); }
      rr(80, 360, 30, 50, 3, '#7f3b2c', 3);                                      // chimney for Sint later
      const hits = P.ev.filter(e => hitOk(e) && e.k !== 'vrij').length, tot = P.ev.length - 1;
      rr(620, 24, 260, 18, 9, '#fff', 3); rr(620, 24, 260 * (won ? 0 : 1 - hits / tot), 18, 9, '#9bc59d', 0); rr(620, 24, 260, 18, 9, null, 3); txt('DE BAAS', 610, 34, 16, INK, 'right');
      const ux = UX + (won ? wk * 300 : Math.sin(P.b * .8) * 40), uy = UY - (won ? wk * 120 : 0);
      // Sinterklaas in his bubble
      const sy = won ? Math.min(uy + 150 + wk * 60, 300) : uy + 150, sx = won ? lerp(ux, 520, clamp(wk / 2, 0, 1)) : ux;
      actor('sint', { x: sx, y: sy, s: .7, ar: won ? 1 : .2, al: won ? 1 : .2, look: -1 });
      if (!won) { circ(ux, uy + 140, 70, 'rgba(155,245,157,.25)', 3); circ(ux - 25, uy + 110, 10, 'rgba(255,255,255,.7)', 0); }
      ART.ufo(ux, uy, 0);
      if (wk < 3) { g.save(); g.translate(ux, uy - 40); g.scale(.5, .5); ACTORS.baas({ x: 0, y: 0, eyes: won ? 'x' : 'open', mouth: won ? 'sad' : 'grin' }); g.restore(); }
      // lasers
      let flash = 0, scorch = 0;
      for (const e of P.ev) {
        if (e.k === 'vrij') continue;
        const L = LEAD[e.k], k = (P.b - (e.b - L)) / L;
        if (k < 0) continue;        if (e.x == null) e.x = 300 + Math.round(e.b * 137) % 400;
        if (!e.res && e.k === 'straal') { g.save(); g.globalAlpha = .3 + k * .5; circ(ux - 60, uy + 10, 10 + k * 20, '#9bf59d', 3); g.restore(); }
        if (!e.res && e.k === 'pew' && k <= 1.1) { const t = clamp(k, 0, 1); circ(lerp(ux - 60, MX + 30, t), lerp(uy + 10, MY - 30, t), 8, '#ef4a36', 3); }
        if (hitOk(e) && P.b - e.hb < .3) { flash = 1; ln(MX + 30, MY - 30, ux - 40, uy, e.k === 'straal' ? 16 : 6, e.k === 'straal' ? '#9bf59d' : '#ef4a36'); }
        if (e.res === 'miss' && P.b >= e.b && P.b - e.b < .6) scorch = 1;
      }
      // the crew on the rooftop
      actor('rolf', { x: 90, y: 300, s: .8, arms: won ? 1 : .2, mouth: won ? 'wow' : 'grin' });
      actor('annemiek', { x: 180, y: 330, s: .8, arms: won ? 1 : .5, eyes: scorch ? 'x' : 'big' });
      bro('joep', { x: 260, y: 320, ar: .8, al: .5, eyes: scorch ? 'x' : 'open', mouth: flash ? 'wow' : 'grin' });
      actor('kouw', { x: 400, y: 330, s: .7, arms: flash ? .9 : .4 });
      g.save(); g.translate(MX + 30, MY - 30); g.rotate(-.5); ell(0, 0, 18, 44, '#dff3fb', 5); ell(-4, -8, 5, 18, '#fff', 0); g.restore();
      if (flash) txt('ZING!', MX + 100, MY - 110, 28, '#ef4a36');
      P.ev.forEach(e => e.k === 'vrij' ? cueRing(P, e, ux, uy + 140, 3, '#9bc59d', 120) : cueRing(P, e, MX + 30, MY - 30, LEAD[e.k], e.k === 'straal' ? '#3fbf6f' : '#ef4a36', 70));
      if (fin && !won && P.b > fin.b - 3.1 && P.b < fin.b + .3) callPips(260, 100, 4, clamp(Math.floor(P.b - (fin.b - 3) + .05) + 1, 0, 4), '#9bc59d');
      if (scorch) bubble('Heet!', 260, 170, 24);
      if (fin && !won && P.b > fin.b - 3 && P.b < fin.b + .2) bubble(['Sin-', 'ter-', 'KLAAS!'][clamp(Math.floor(P.b - (fin.b - 3)), 0, 2)], 260, 160, 30);
      if (won) { bubble(wk < 2 ? 'Dank je wel, kinderen!' : 'Pepernoten voor iedereen!', 520, 150, 24); for (let i = 0; i < 14; i++) circ((i * 71 + wk * 90) % W, (i * 37 + wk * 140) % 380, 6, '#c8742c', 2); }
    },
  });
})();

// ===== Remix 4: Pepernoten Mix (the chapter 3 games) =====
LEVELS.push(makeRemix({
  id: 'remix4', title: 'Pepernoten Mix', who: 'Remix · chapter 3', song: 'Alle Nieuwe Vrienden', color: '#c8742c', accent: '#d62828',
  bpm: 112, key: 7,
  prog: [[0, 4, 7], [-3, 0, 4], [5, 9, 12], [7, 11, 14]],
  drums: { k: 'x..x.x..', s: '..x...x.', h: 'xxxxxxxx' }, bass: '1.85.8.5', comp: 'stab', swing: .1,
  mel: [[[0, 12, 1], [1, 14, 1], [2, 16, 2], [4, 19, 2], [6, 16, 2]], [[0, 12, 2], [2, 9, 2], [4, 12, 4]], [[0, 17, 2], [2, 16, 2], [4, 14, 4]], [[0, 19, 3], [3, 14, 1], [4, 12, 4]]],
  how: 'All six new friends, one song. Watering, chopping, photos, nails, dreams and howls: every scene keeps its own cues.',
  verdict: ['Every new friend, every beat. Sinterklaas is writing your name in his big book.', 'A great party with a few wrong notes.', 'Each scene has its own cue. Listen fresh at every switch.'],
  segs: [
    { src: 'tuin', len: 12, ev: [[3, 'knop'], [5, 'snel'], [8, 'henk'], [10, 'knop'], [11, 'knop']] },
    { src: 'meloen', len: 12, ev: [[3, 'meloen'], [5, 'kokos'], [7, 'ananas'], [9, 'meloen'], [9.5, 'meloen'], [11, 'kokos']] },
    { src: 'freak', len: 12, ev: [[3, 'pose'], [5, 'pose'], [7, 'gek'], [9, 'pose'], [11, 'gek']] },
    { src: 'bouw', len: 12, ev: [[3, 'spijker'], [4, 'spijker'], [6, 'rij0'], [6.5, 'rij'], [7, 'rij'], [7.5, 'rij'], [8, 'rij'], [8.5, 'rij'], [11, 'spijker']] },
    { src: 'droom', len: 12, ev: [[3, 'bel'], [5, 'schaap'], [6, 'schaap'], [8, 'bel'], [9, 'ster'], [11, 'schaap']] },
    { src: 'huil', len: 12, ev: [[3, 'huil'], [5, 'kort'], [7, 'huil'], [9, 'kort'], [11, 'maan']] },
  ],
}));

// ---------- chapter 3 story ----------
Object.assign(SCENES, {
  tuin: [
    { cap: 'November. Sinterklaas’s steamboat should arrive any day now. The whole town waits at the harbour… but the boat never comes.', draw(t) {
      sky('#bfe6f8', '#fff3db'); rr(-10, 360, W + 20, 200, 0, '#5aa9c9', 4); for (let x = -(t * 30) % 60; x < W; x += 60) ln(x, 400, x + 24, 400, 3, '#fff');
      bro('joep', { x: 300, y: 300, arms: .2, mouth: 'flat' }); bro('cas', { x: 420, y: 305, eyes: 'open', mouth: 'flat' }); bro('luur', { x: 540, y: 315, s: .9, mouth: 'o', look: 1 }); bubble('Waar blijft hij?', 420, 150, 24); } },
    { cap: 'Instead, a flying saucer hovers over the rooftops. A cold voice crackles through every radio: “Sinterklaas belongs to ME now. — De Baas.”', draw(t) {
      bgStoep('#d9c8ff', '#ffd6e4'); ART.ufo(600, 120 + Math.sin(t * 2) * 8, 1); g.save(); g.translate(600, 70); g.scale(.4, .4); ACTORS.baas({ x: 0, y: 0, mouth: 'grin' }); g.restore();
      bro('luur', { x: 260, y: 340, s: .9, eyes: 'big', mouth: 'wow', look: 1 }); bubble('Een UFO?!', 260, 180, 26); } },
    { cap: 'The brothers will need help. First stop: Pieter met een Gieter, the gardener, who saw something strange land in his vegetable patch.', draw(t) {
      bgGrass(); actor('pieter', { x: 520, y: 330, ar: .8, mouth: 'wow' }); bro('joep', { x: 300, y: 330, arms: .6 }); ell(700, 420, 50, 12, '#5b4636', 3); bubble('Daar landde iets!', 520, 150, 24); } },
  ],
  meloen: [{ cap: 'Koen verkoopt Meloen sells fruit at the market, but he used to be in the army. Nobody knows strategy like Koen. He’ll help… after drill practice.', draw(t) {
    sky('#fff1c4', '#fde0b0'); rr(100, 360, 760, 70, 8, '#c8742c', 4); actor('koen', { x: 480, y: 290, ar: 1, mouth: 'wow' }); bro('cas', { x: 260, y: 330, eyes: 'sleepy' }); bubble('IN DE RIJ!', 480, 120, 28); } }],
  freak: [{ cap: 'Annemiek the Freak, Joep’s girlfriend (he turns bright red when anyone says that), wants in. Her weird faces might confuse an alien.', draw(t) {
    sky('#f6e0ff', '#ffd9ec'); actor('annemiek', { x: 560, y: 320, al: 1, ar: .2, rot: Math.sin(t * 3) * .1, eyes: 'x', mouth: 'wow' });
    bro('joep', { x: 330, y: 330, mouth: 'smile', eyes: 'happy' }); ell(311, 300, 8, 5, '#ef4a36', 0); ell(349, 300, 8, 5, '#ef4a36', 0); txt('♥', 440, 180 + Math.sin(t * 3) * 6, 40, '#ef4a36'); } }],
  bouw: [{ cap: 'To reach a spaceship, you need a very tall tower. Luckily Kouw aan de Bouw, half man, half spider, all builder, has six legs and never stops working.', draw(t) {
    sky('#d8f0ff', '#fff3db'); for (let y = 100; y < 420; y += 80) ln(300, y, 700, y, 5, '#9aa3b5'); ln(300, 60, 300, 420, 6, '#9aa3b5'); ln(700, 60, 700, 420, 6, '#9aa3b5');
    actor('kouw', { x: 500, y: 250, ar: Math.abs(Math.sin(t * 6)), mouth: 'grin' }); bubble('Even een torentje bouwen!', 500, 90, 22); } }],
  droom: [{ cap: 'Martin-Broom dreamt about exactly where the saucer hides. Unfortunately he can only remember it if he falls asleep again.', draw(t) {
    sky('#d9d4ff', '#ffe4ef'); ell(480, 420, 260, 70, '#fff', 4); actor('martin', { x: 480, y: 350, rot: -1.25 }); bro('luur', { x: 760, y: 340, s: .9, mouth: 'o' }); bubble('Sssst, hij droomt!', 760, 180, 22); } }],
  huil: [{ cap: 'The tower is nearly finished, but the crew needs muscle. Rolf de Alpha Wolf will help, if the brothers can out-howl his pack.', draw(t) {
    sky('#ffc4d6', '#ffe9c7'); circ(720, 130, 80, '#fff8d6', 4); actor('rolf', { x: 640, y: 300, ar: 1, al: 1, mouth: 'wow' }); bro('joep', { x: 300, y: 330, mouth: 'flat' }); bubble('Laat je huil horen, welp!', 640, 110, 22); } }],
  baas: [{ cap: 'Under the full moon, the whole crew climbs Kouw’s tower to the rooftops. The saucer opens. De Baas van Sinterklaas is waiting.', draw(t) {
    sky('#ffb8a0', '#ffd6e4'); ART.ufo(620, 130 + Math.sin(t * 2) * 6, .6); actor('sint', { x: 620, y: 290, s: .7 }); circ(620, 270, 70, 'rgba(155,245,157,.25)', 3);
    g.save(); g.translate(620, 90); g.scale(.45, .45); ACTORS.baas({ x: 0, y: 0, mouth: 'grin' }); g.restore();
    bro('joep', { x: 220, y: 330, ar: 1, mouth: 'wow' }); actor('rolf', { x: 110, y: 310, s: .8 }); actor('annemiek', { x: 330, y: 340, s: .85 }); } }],
  ending2: [
    { cap: 'The bubble bursts, and Sinterklaas floats gently down onto the roof. De Baas zooms off into space, sulking.', draw(t) {
      sky('#ffe9b0', '#fff3db'); actor('sint', { x: 480, y: 300, ar: 1, al: 1 }); ART.ufo(820 + t * 40, 80 - t * 10, 0); } },
    { cap: 'Sinterklaas hands out pepernoten to everyone. And for De Baas he leaves one small present on the roof, just in case he ever comes back.', draw(t) {
      bgStoep('#ffd6a8', '#fff3db'); actor('sint', { x: 480, y: 300 }); const bp = Math.abs(Math.sin(t * 4));
      [['joep', 120], ['annemiek', 220], ['pieter', 320], ['koen', 640], ['kouw', 760], ['rolf', 870]].forEach(([n, x]) => actor(n, { x, y: 330, s: .8, bob: bp * 8, arms: bp }));
      rr(450, 380, 60, 44, 6, '#d62828', 4); ln(480, 380, 480, 424, 4, '#f6b92b'); ln(450, 402, 510, 402, 4, '#f6b92b'); } },
    { cap: 'Somewhere far away, a small alien opens a small present. For the first time in his life, De Baas smiles. (Remix 4 is unlocked.)', draw(t) {
      sky('#d9d4ff', '#ffe4ef'); dots('rgba(255,255,255,.5)', 24); ART.ufo(480, 360, 0);
      g.save(); g.translate(480, 300); g.scale(.6, .6); ACTORS.baas({ x: 0, y: 0, mouth: 'grin', ar: 1 }); g.restore(); rr(530, 300, 40, 30, 4, '#d62828', 3); } },
  ],
});
Object.assign(STAR, { tuin: 'pieter', meloen: 'koen', freak: 'annemiek', bouw: 'kouw', droom: 'martin', huil: 'rolf', baas: 'joep', remix4: 'annemiek' });

// ---------- new friends on the dance floor ----------
DANCERS.push(['pieter', 'Pieter'], ['koen', 'Koen'], ['annemiek', 'Annemiek'], ['kouw', 'Kouw'], ['martin', 'Martin-Broom'], ['rolf', 'Rolf'], ['baas', 'De Baas'], ['sint', 'Sinterklaas']);
const DANCE2 = {
  pieter: (b, f, beat, up) => ({ bob: up * 8, ar: .3 + up * .6, al: .2, rot: Math.sin(b * Math.PI / 2) * .06 }),
  koen: (b, f, beat) => ({ bob: f < .2 ? 10 : 0, al: beat % 2 ? 1 : 0, ar: .2, rot: 0, mouth: 'flat' }),
  annemiek: (b, f, beat, up) => ({ rot: Math.sin(b * Math.PI * 2) * .25, al: Math.abs(Math.sin(b * 6)), ar: Math.abs(Math.cos(b * 6)), bob: up * 16, squash: Math.sin(b * 8) * .2, eyes: beat % 4 === 3 ? 'x' : 'big' }),
  kouw: (b, f, beat, up) => ({ bob: up * 6, al: beat % 3 === 0 ? 1 : .3, ar: beat % 3 === 1 ? 1 : .3, rot: Math.sin(b * Math.PI) * .08 }),
  martin: (b, f, beat, up) => ({ rot: Math.sin(b * Math.PI / 4) * .25, bob: Math.sin(b * Math.PI / 2) * 6 + 6, arms: .2 + Math.abs(Math.sin(b * Math.PI / 4)) * .4 }),
  rolf: (b, f, beat, up) => ({ bob: up * 10, arms: beat % 4 === 3 ? 1 : .5, squash: f < .15 ? .3 : 0, mouth: beat % 4 === 3 ? 'wow' : 'grin' }),
  baas: (b, f, beat, up) => ({ bob: 10 + up * 6, arms: beat % 2 ? .8 : .1, mouth: beat % 8 === 7 ? 'grin' : 'sad' }),
  sint: (b, f, beat, up) => ({ bob: up * 6, ar: .4 + up * .5, al: .1, rot: Math.sin(b * Math.PI / 2) * .05 }),
};
