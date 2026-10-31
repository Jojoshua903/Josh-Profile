'use strict';
// ===== Level 5: Bladzijde Beat (Zurm de Boekenwurm) =====
(() => {
  const ZX = 300, ZY = 330;
  function shelf() {
    rr(-10, 0, W + 20, 420, 0, '#f3dfc0', 0);
    const cols = ['#ef4a36', '#4d7cf0', '#f6b92b', '#1f9e8f', '#f59ab5', '#6a4a8a', '#c8742c'];
    for (let r = 0; r < 3; r++) {
      const y = 40 + r * 120;
      rr(-10, y + 96, W + 20, 14, 0, '#9b6b43', 4);
      for (let x = 10, i = r * 5; x < W; i++) {
        const w = 22 + (i * 7) % 18, h = 70 + (i * 13) % 26;
        rr(x, y + 96 - h, w, h, 3, cols[i % cols.length], 3); x += w + 3;
      }
    }
    rr(-10, 420, W + 20, 130, 0, '#c99a6b', 4);
  }
  LEVELS.push({
    id: 'zurm', title: 'Bladzijde Beat', who: 'Zurm de Boekenwurm', song: 'Nog Één Hoofdstuk', color: '#f59ab5', accent: '#7bc96f',
    bpm: 100, beats: 56, key: 9, swing: .2,
    prog: [[0, 3, 7], [8, 12, 15], [3, 7, 10], [10, 14, 17]],
    drums: { k: 'x...x.x.', s: '..x...x.', h: 'x.x.x.x.' }, bass: '1..1.5..', comp: 'pad', lead: 'triangle', leadVol: .07,
    mel: [[[0, 12, 2], [2, 15, 2], [4, 14, 2], [6, 12, 2]], [[0, 12, 3], [3, 10, 1], [4, 8, 4]],
          [[0, 10, 2], [2, 12, 2], [4, 15, 4]], [[0, 14, 2], [2, 12, 2], [4, 10, 4]]],
    how: 'Zurm reads faster than anyone. Help her <b>turn the page</b>. The page corner goes <b>"ting"</b>, and you flip <b>one beat later</b>.<br>Careful: most flips land <b>between</b> the drum beats.',
    verdict: ['Three books finished before tea. Zurm wants to know what you are reading next.',
      'A smooth read with a couple of crumpled pages. Zurm forgives you.',
      'The "ting" is your count-in: flip exactly one beat after it, even when that falls between the drums.'],
    chart() {
      const c = [], add = (bar, offs, k = 'blad') => offs.forEach(o => c.push({ b: bar * 4 + o, k }));
      [1, 2, 3].forEach(b => add(b, [1.5, 3.5])); add(4, [1.5, 2.5, 3.5]);
      add(5, [1.5, 3.5]); add(6, [1.5, 3.5]); add(7, [1.5, 2, 3.5]); add(8, [1.5, 2.5, 3, 3.5]);
      add(9, [1.5, 3.5]); add(10, [1.5, 3.5]); add(11, [1.5, 2.5, 3.5]); add(12, [1.5, 2, 2.5, 3.5]);
      add(13, [3.5], 'eind');
      return c;
    },
    cue(e, t, spb) {
      A.tone(t - spb, fq(e.k === 'eind' ? 19 : 16), .14, 'sine', .12); A.tone(t - spb + .02, fq(23), .1, 'sine', .05);
    },
    hit(t, res, e) {
      A.nz(t, .13, .35, 'bandpass', 2500, 1, 6000); A.tone(t, fq(28), .05, 'sine', .05);
      if (e.k === 'eind') { A.kick(t); A.tone(t, fq(12), .4, 'triangle', .1); A.voice(t + .1, fq(16), .3, .8, 'e'); }
    },
    miss(t) { A.voice(t, fq(4), .28, .7, 'o', fq(-2)); A.nz(t, .2, .2, 'lowpass', 900); },
    draw(P) {
      shelf();
      // lectern + book
      rr(560, 330, 40, 110, 4, '#9b6b43', 4); poly([[440, 340], [720, 340], [740, 300], [420, 300]], '#b07b4f', 4);
      const pages = P.ev.filter(e => hitOk(e)).length;
      const flip = P.ev.find(e => hitOk(e) && P.b - e.hb >= 0 && P.b - e.hb < .35);
      const tear = P.ev.find(e => e.res === 'miss' && P.b >= e.b && P.b - e.b < .8);
      const next = P.ev.find(e => !e.res && e.b - P.b < 1 && e.b - P.b > 0);
      const closed = P.ev.some(e => e.k === 'eind' && hitOk(e) && P.b - e.hb > .35);
      if (closed) { rr(500, 210, 160, 100, 8, '#ef4a36', 4); txt('EINDE', 580, 260, 26, '#fff'); }
      else {
        rr(440, 190, 140, 120, 6, '#fffaf0', 4); rr(580, 190, 140, 120, 6, '#fffaf0', 4);
        for (let l = 0; l < 6; l++) { ln(456, 214 + l * 16, 560 - (l % 3) * 12, 214 + l * 16, 3, 'rgba(33,28,52,.3)'); ln(596, 214 + l * 16, 704 - (l * 7) % 30, 214 + l * 16, 3, 'rgba(33,28,52,.3)'); }
        if (next) { const k = 1 - (next.b - P.b); poly([[720, 310], [720 - 30 * k, 310], [720, 310 - 30 * k]], '#f6e4c0', 3); cueRing(P, next, 708, 298, 1, '#6a4a8a', 52); }
        if (flip) { const k = (P.b - flip.hb) / .35, w = 140 * Math.cos(k * Math.PI); rr(580 + Math.min(0, w), 190, Math.abs(w), 120, 6, '#fff3d6', 4); }
        txt(`p. ${pages * 2 + 1}`, 650, 296, 14, 'rgba(33,28,52,.6)', 'center', HAND, 400);
      }
      if (tear) { txt('kreukel!', 580, 160, 30, '#ef4a36', 'center', HAND, 400); }
      // Zurm: girl on top, worm below
      const beat = Math.abs(Math.sin(P.b * Math.PI)), wig = Math.sin(P.b * Math.PI);
      for (let i = 6; i >= 0; i--) circ(ZX - 30 - i * 30 + Math.sin(i + P.b * 2) * 4, ZY + 70 - Math.abs(Math.sin(i * .9 + wig)) * 14, 26 - i * 1.5, i % 2 ? '#8bd17c' : '#7bc96f', 4);
      circ(ZX - 30 - 7 * 30, ZY + 70, 12, '#7bc96f', 4);
      ell(ZX, ZY + 70, 34, 28, '#8bd17c', 4);
      kid({ x: ZX, y: ZY - beat * 5, col: '#6a4a8a', skin: '#f6d0b0', hat: 'tuft', hair: '#3a2a50', legs: false,
        eyes: tear ? 'x' : flip ? 'happy' : 'open', mouth: tear ? 'sad' : flip ? 'grin' : 'smile', look: 1, ar: flip ? .7 : .35, al: .1 });
      const hy = ZY - 44 - beat * 5;
      [-11, 11].forEach(dx => circ(ZX + dx, hy, 11, 'rgba(255,255,255,.25)', 3)); ln(ZX - 1, hy, ZX + 1, hy, 3);
      poly([[ZX - 4, hy - 30], [ZX - 26, hy - 44], [ZX - 26, hy - 18]], '#ef4a36', 3); poly([[ZX - 4, hy - 30], [ZX + 18, hy - 44], [ZX + 18, hy - 18]], '#ef4a36', 3);
      if (closed) bubble('Nog één?', ZX + 30, ZY - 150, 28);
      else if (Math.floor(P.b) % 4 === 0 && !tear) bubble(['…en toen…', 'Oh!', 'Spannend…'][Math.floor(P.b / 4) % 3], ZX + 40, ZY - 150, 22);
    },
  });
})();

// ===== Level 6: Raket Ritme (Janet en Fred bouwen een Raket) =====
(() => {
  const FRED = [300, 405], WR = [598, 210], RX = 720, GROUND = 470;
  const AIR = { bout: 1, paneel: 2, paneel2: 2.5, start: 3 };
  LEVELS.push({
    id: 'raket', title: 'Raket Ritme', who: 'Janet & Fred bouwen een Raket', song: 'Aftellen', color: '#8fd3f0', accent: '#ef4a36',
    bpm: 116, beats: 64, key: 4,
    prog: [[0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14]],
    drums: { k: 'x...x.x.', s: '..x...x.', h: 'xxxxxxxx' }, bass: '1.15.8.5', comp: 'stab',
    mel: [[[0, 7, 2], [2, 11, 2], [4, 12, 2], [6, 11, 1], [7, 7, 1]], [[0, 9, 4], [4, 12, 2], [6, 16, 2]],
          [[0, 12, 2], [2, 9, 2], [4, 5, 2], [6, 9, 2]], [[0, 11, 3], [3, 14, 1], [4, 19, 4]]],
    how: 'Fred tosses rocket parts up to his very tall daughter Janet. <b>Bolt it on</b> when the part reaches her wrench.<br><b>"Hup!"</b> = a bolt, one beat. <b>"Hu-up!"</b> = a panel, two beats, then a second clank right after. Last of all, a <b>countdown</b>: launch on zero.',
    verdict: ['Lift-off! Janet is already sketching a bigger one, and Fred is looking for a taller ladder.',
      'It flew. Slightly sideways, but it flew. Fred calls that "a successful test".',
      'Each "hup" is one beat before the clank. For panels, clank twice: on the beat and right after.'],
    chart() {
      const c = [], add = (bar, off, k = 'bout') => c.push({ b: bar * 4 + off, k });
      const pan = bar => { add(bar, 2, 'paneel'); add(bar, 2.5, 'paneel2'); };
      add(1, 1); add(1, 3); add(2, 1); add(2, 3); add(3, 1); add(3, 2); add(3, 3); pan(4);
      add(5, 1); add(5, 3); add(6, 1); add(6, 2); add(6, 3); pan(7);
      add(8, 1); add(8, 1.5); add(8, 3); pan(9); add(10, 1); add(10, 2); add(10, 3);
      add(11, 1.5); add(11, 3); pan(12); add(13, 1); add(13, 2); add(13, 3); add(14, 1);
      add(15, 2, 'start');
      return c;
    },
    cue(e, t, spb) {
      if (e.k === 'bout') A.voice(t - spb, fq(7), .1, .9, 'u');
      else if (e.k === 'paneel') { A.voice(t - 2 * spb, fq(4), .12, .9, 'u'); A.voice(t - 1.5 * spb, fq(9), .14, .9, 'u'); }
      else if (e.k === 'start') [3, 2, 1].forEach((d, i) => { A.voice(t - d * spb, fq(12 - i * 2), .2, .9, ['i', 'e', 'e'][i]); A.tone(t - d * spb, fq(24), .08, 'square', .06); });
    },
    hit(t, res, e) {
      if (e.k === 'start') { A.kick(t); A.crash(t, .3); A.nz(t, 2, .3, 'lowpass', 300, 1, 3000); return; }
      A.tone(t, fq(e.k === 'bout' ? 31 : 26), .12, 'square', .08); A.nz(t, .06, .3, 'bandpass', 4000, 3); A.tone(t, fq(19), .05, 'triangle', .1);
    },
    miss(t, e) { if (e.k === 'start') A.nz(t, .8, .2, 'lowpass', 1200, 1, 200); else A.tone(t, 500, .3, 'square', .04, 120); },
    draw(P) {
      sky('#bfe6f8', '#fff3db');
      for (let i = 0; i < 4; i++) ell(120 + i * 260, 110 + (i % 2) * 40, 60, 18, '#fff', 3);
      rr(-10, GROUND, W + 20, 90, 0, '#9fcf7f', 4);
      // gantry
      ln(830, GROUND, 830, 120, 8); for (let y = 140; y < GROUND; y += 40) ln(800, y, 830, y + 20, 4);
      const built = P.ev.filter(e => hitOk(e) && e.k !== 'start' && P.b > e.hb).length;
      const go = P.ev.find(e => e.k === 'start' && hitOk(e));
      const fizz = P.ev.find(e => e.k === 'start' && e.res === 'miss');
      const lift = go ? Math.pow(Math.max(0, P.b - go.hb), 2) * 40 : 0;
      // rocket grows with every part
      const hgt = 70 + Math.min(built, 34) * 8, top = GROUND - hgt - lift;
      if (lift) for (let i = 0; i < 4; i++) poly([[RX - 26, top + hgt], [RX + 26, top + hgt], [RX + (Math.random() - .5) * 20, top + hgt + 60 + Math.random() * 60]], i % 2 ? '#f6b92b' : '#ef4a36', 3);
      rr(RX - 36, top, 72, hgt, 10, '#fff', 4);
      poly([[RX - 36, top + 4], [RX, top - 50], [RX + 36, top + 4]], '#ef4a36', 4);
      poly([[RX - 36, top + hgt - 40], [RX - 62, top + hgt], [RX - 36, top + hgt]], '#4d7cf0', 4);
      poly([[RX + 36, top + hgt - 40], [RX + 62, top + hgt], [RX + 36, top + hgt]], '#4d7cf0', 4);
      circ(RX, top + 40, 14, '#8fd3f0', 4);
      for (let y = top + 70; y < top + hgt - 10; y += 24) ln(RX - 34, y, RX + 34, y, 2, 'rgba(33,28,52,.3)');
      if (fizz && P.b > fizz.b) txt('pfffff…', RX, GROUND - 40, 28, INK, 'center', HAND, 400);
      // Janet: comically tall
      let clank = 0, sad = 0, wind = 0;
      for (const e of P.ev) {
        if (hitOk(e) && P.b - e.hb >= 0 && P.b - e.hb < .3) clank = 1;
        if (e.res === 'miss' && P.b >= e.b && P.b - e.b < 1) sad = 1;
        const dt = e.b - P.b; if (!e.res && dt > 0 && dt < .5) wind = Math.max(wind, 1 - dt * 2);
      }
      const beat = Math.abs(Math.sin(P.b * Math.PI)), jx = 540, jy = 200 - beat * 3;
      ln(jx - 12, jy + 30, jx - 16, GROUND - 4, 10); ln(jx + 12, jy + 30, jx + 16, GROUND - 4, 10);
      ell(jx - 22, GROUND, 14, 7, INK, 0); ell(jx + 22, GROUND, 14, 7, INK, 0);
      kid({ x: jx, y: jy, col: '#f6b92b', skin: '#c98c63', hat: 'tuft', hair: '#2a1b12', legs: false,
        ar: .55 + wind * .3 - clank * .3, al: .1, eyes: sad ? 'x' : clank ? 'happy' : 'open', mouth: sad ? 'sad' : clank ? 'grin' : 'smile', look: 1 });
      g.save(); g.translate(jx + 44, jy - 20); g.rotate(-.6 - wind * .6 + clank * 1.1); rr(-4, -40, 8, 44, 3, '#9aa3b5', 3); circ(0, -44, 10, '#9aa3b5', 3); g.restore();
      if (clank) txt('KLANK!', WR[0] + 70, WR[1] - 30, 28, '#ef4a36');
      // Fred: small inventor dad with goggles
      const toss = P.ev.some(e => { const k = P.b - (e.b - AIR[e.k]); return e.k !== 'start' && e.k !== 'paneel2' && k >= 0 && k < .3; });
      kid({ x: FRED[0], y: FRED[1], s: .8, col: '#f4f1ea', skin: '#e8b48c', hat: 'none', bob: beat * 4, arms: toss ? .95 : .2, eyes: 'open', mouth: toss ? 'wow' : 'smile' });
      const fh = FRED[1] - 44 * .8;
      [-9, 9].forEach(dx => circ(FRED[0] + dx, fh - 2, 7, 'rgba(143,211,240,.7)', 3)); ln(FRED[0] - 24, fh - 2, FRED[0] + 24, fh - 2, 3);
      ell(FRED[0], fh + 12, 12, 4, '#8a8a8a', 2);
      const count = P.ev.find(e => e.k === 'start' && !e.res && e.b - P.b <= 3 && e.b - P.b > 0);
      if (count) bubble(['3…', '2…', '1…'][clamp(3 - Math.ceil(count.b - P.b), 0, 2)], FRED[0], FRED[1] - 120, 32);
      else if (toss) bubble('Hup!', FRED[0], FRED[1] - 120, 26);
      if (go && P.b - go.hb < 3) bubble('LANCERING!', 420, 90, 34);
      // parts in the air; caught parts slide onto the rocket, missed ones drop
      P.ev.forEach(e => cueRing(P, e, e.k === 'start' ? RX : WR[0] + 40, e.k === 'start' ? top + 40 : WR[1], AIR[e.k] === 2.5 ? 2.5 : AIR[e.k], e.k === 'start' ? '#ef4a36' : e.k === 'bout' ? '#4d7cf0' : '#ef4a36', 60));
      for (const e of P.ev) {
        if (e.k === 'start') continue;
        const air = AIR[e.k], k = (P.b - (e.b - air)) / air;
        if (k < 0) continue;
        let x, y, rot = P.b * 6;
        if (hitOk(e)) { const f = (P.b - e.hb) / .35; if (f > 1) continue; x = lerp(WR[0] + 40, RX - 30, ease(f)); y = lerp(WR[1], top + hgt * .5, ease(f)); rot = 0; }
        else if (e.res === 'miss') { const f = P.b - e.b; if (f > 1) continue; x = WR[0] + 40 + f * 60; y = WR[1] + f * f * 260; }
        else { if (k > 1.3) continue; x = lerp(FRED[0] + 30, WR[0] + 40, k); y = lerp(FRED[1] - 30, WR[1], k) - hop(Math.min(k, 1)) * (air > 1 ? 220 : 110); }
        g.save(); g.translate(x, y); g.rotate(rot);
        if (e.k === 'bout') { rr(-6, -12, 12, 24, 3, '#9aa3b5', 3); rr(-10, -14, 20, 8, 2, '#9aa3b5', 3); }
        else { rr(-22, -14, 44, 28, 4, e.k === 'paneel' ? '#ef4a36' : '#4d7cf0', 4); }
        g.restore();
      }
    },
  });
})();
