'use strict';
// ===== Arcade: Hoog Houden (Joep's keepy-uppy) =====
(() => {
  const GAP = { kort: 1, hoog: 2, half: .5 };
  const SEQS = ['kkkk', 'hhkk', 'kkhkk', 'khkkh', 'hkhkkh', 'kkkkhh', 'hkkhkkh'];
  const KIND = { k: 'kort', h: 'hoog', q: 'half' };
  const CAS = [215, 300], FOOT = [500, 392];
  LEVELS.push({
    id: 'hoog', title: 'Hoog Houden', who: 'Arcade · Joep op de Stoep', song: 'Niet Laten Vallen', color: '#7bc96f', accent: '#fff', arcade: true,
    bpm: 116, beats: 76, key: 0,
    prog: [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]],
    drums: { k: 'x...x...', s: '..x...x.', h: 'xxxxxxxx' }, bass: '1.8.5.8.', comp: 'stab',
    mel: [[[0, 7, 2], [2, 12, 2], [4, 16, 2], [6, 12, 2]], [[0, 14, 4], [4, 11, 4]], [[0, 12, 2], [2, 16, 2], [4, 19, 4]], [[0, 17, 2], [2, 14, 2], [4, 12, 4]]],
    how: 'Cas tosses the ball, Joep keeps it up. <b>Kick</b> every time it comes down to his foot.<br>The sound as it leaves tells you how long it’s up: a short <b>"whoop"</b> = one beat, a <b>low "whooo"</b> = two beats (with a little tick halfway).',
    verdict: ['The ball never touched the ground. Joep wants to go pro. Cas wants to sit down.', 'A few drops, but Joep counts it as a world record anyway.', 'Short whoop = one beat, low whooo = two. Kick when it lands on his foot.'],
    chart() {
      const c = []; let cursor = 4;
      SEQS.forEach(s => {
        let b = cursor;
        [...s].forEach((ch, i) => { b += GAP[KIND[ch]]; c.push({ b, k: KIND[ch], start: i === 0 }); });
        cursor = Math.ceil(b) + 3;
      });
      return c;
    },
    cue(e, t, spb) {
      const gap = GAP[e.k], tu = t - gap * spb;
      A.tone(tu, fq({ 2: 2, 1: 9, .5: 16 }[gap]), .14, 'triangle', .13, fq({ 2: 14, 1: 19, .5: 26 }[gap]));
      if (gap === 2) A.hat(t - spb, .14);
      if (e.start) A.voice(tu, fq(-5), .12, .7, 'o');
    },
    hit(t) { A.kick(t, .5); A.tone(t, fq(0), .05, 'square', .06); },
    miss(t) { A.tone(t, 220, .1, 'sine', .2, 130); A.tone(t + .2, 180, .1, 'sine', .14, 110); },
    draw(P) {
      sky('#bfe6f8', '#eaf7d8'); circ(840, 90, 44, '#ffe066', 4);
      g.beginPath(); g.moveTo(-10, 400); g.quadraticCurveTo(W / 2, 370, W + 10, 400); g.lineTo(W + 10, H); g.lineTo(-10, H); g.closePath(); paint('#7bc96f', 4);
      rr(780, 250, 14, 160, 3, '#fff', 3); rr(780, 250, 150, 14, 3, '#fff', 3);
      // which flight are we in?
      let fly = null, drop = null, streak = 0, kick = 0;
      for (const e of P.ev) {
        const gap = GAP[e.k], s0 = e.b - gap;
        if (!fly && P.b >= s0 && (P.b < e.b + .2) && !e.res) fly = { e, p: (P.b - s0) / gap };
        if (hitOk(e) && P.b >= e.hb && P.b - e.hb < .25) kick = 1;
        if (e.res === 'miss' && P.b >= e.b && P.b - e.b < 1.5) drop = (P.b - e.b) / 1.5;
        if (e.b <= P.b) streak = hitOk(e) ? (e.start ? 1 : streak + 1) : 0;
      }
      bro('cas', { x: 200, y: 336, ar: fly && fly.e.start && fly.p < .3 ? 1 : .35, eyes: drop != null ? 'open' : 'sleepy', mouth: 'smile' });
      bro('joep', { x: 480, y: 328, arms: kick ? .6 : .2, squash: kick ? -.2 : 0, rot: kick ? -.08 : 0, eyes: drop != null ? 'x' : 'open', mouth: drop != null ? 'sad' : 'grin' });
      bro('luur', { x: 690, y: 345, s: .85, arms: streak >= 4 ? .9 : .2, eyes: 'big', mouth: streak >= 4 ? 'grin' : 'o', look: -1 });
      if (streak >= 2) bubble(`${streak}!`, 690, 220, 26);
      let bx = CAS[0], by = CAS[1];
      if (fly) {
        const gap = GAP[fly.e.k], from = fly.e.start ? CAS : FOOT, p = clamp(fly.p, 0, 1.1);
        bx = lerp(from[0], FOOT[0], p); by = lerp(from[1], FOOT[1], p) - hop(Math.min(p, 1)) * gap * 170;
      } else if (drop != null) { bx = FOOT[0] + drop * 300; by = FOOT[1] + 8 - hop(drop * 2 % 1) * 40 * (1 - drop); }
      else if (P.ev.length && P.b > P.ev[P.ev.length - 1].b) { bx = FOOT[0] + 20; by = FOOT[1] + 6; }
      // shadow on the grass shows where and when the ball comes down
      if (fly || drop != null) { const up = clamp((FOOT[1] - by) / 400, 0, .75); ell(bx, FOOT[1] + 18, 18 * (1 - up), 5 * (1 - up), 'rgba(33,28,52,.25)', 0); }
      if (fly) cueRing(P, fly.e, FOOT[0], FOOT[1], GAP[fly.e.k], fly.e.k === 'hoog' ? '#4d7cf0' : fly.e.k === 'half' ? '#ef4a36' : '#f6b92b', 60);
      circ(bx, by, 16, '#fff', 4); poly([[bx - 6, by - 4], [bx + 6, by - 4], [bx, by + 6]], INK, 0);
      if (drop != null && drop < .6) bubble('Nee! Laag houden!', 480, 160, 22);
    },
  });
})();

// ===== Arcade: Pannenkoek Flip (Pluk flips them very high) =====
(() => {
  const PAN = [478, 300], PLATE = [362, 330];
  const FLIPS = [5, 9, 13, 16, 17, 21, 24, 25.5, 28, 29, 33, 36, 37, 40, 41.5, 45, 48, 49, 52.5, 53];
  LEVELS.push({
    id: 'pannenkoek', title: 'Pannenkoek Flip', who: 'Arcade · Pluk de Rukkende Uk', song: 'Stapel Stapel', color: '#f6c86b', accent: '#c8742c', arcade: true,
    bpm: 112, beats: 60, key: 5,
    prog: [[0, 4, 7], [5, 9, 12], [2, 5, 9], [7, 11, 14]],
    drums: { k: 'x..x..x.', s: '..x...x.', h: 'x.x.x.x.' }, bass: '1.5.8.5.', comp: 'arp', swing: .2,
    mel: [[[0, 12, 1], [1, 14, 1], [2, 16, 2], [4, 12, 4]], [[0, 17, 2], [2, 16, 2], [4, 14, 4]], [[0, 14, 2], [2, 17, 2], [4, 21, 4]], [[0, 19, 3], [3, 17, 1], [4, 16, 4]]],
    how: 'Pluk is making pancakes and flips them way too high. A pancake sizzles, then goes <b>"pop"</b>: <b>flip</b> it one beat later.<br>It comes back down <b>two beats after the flip</b>. Press again to <b>catch it</b> on the plate.',
    verdict: ['A tower of pancakes taller than Pluk. Everyone on the street is invited.', 'A tasty stack, plus one or two on the ceiling.', 'Flip one beat after the pop, then count two and catch.'],
    chart() {
      const c = [];
      FLIPS.forEach(b => { c.push({ b, k: 'flip' }); c.push({ b: b + 2, k: 'vang' }); });
      c.push({ b: 57, k: 'flip', big: true }); c.push({ b: 59, k: 'vang', big: true });
      return c;
    },
    cue(e, t, spb) {
      if (e.k !== 'flip') return;
      A.nz(t - 2 * spb, spb * 1.4, .05, 'highpass', 3000); A.tone(t - spb, fq(24), .04, 'sine', .16); A.tone(t - spb + .07, fq(28), .04, 'sine', .1);
    },
    hit(t, res, e, P) {
      if (e.k === 'flip') { A.nz(t, .1, .25, 'bandpass', 800, 1); A.tone(t, fq(12), 1.8 * P.spb, 'sine', .03, fq(24)); }
      else { A.tone(t, fq(19), .08, 'triangle', .12); A.clap(t, .15); if (e.big) A.crash(t, .25); }
    },
    miss(t, e, P) {
      if (e.k === 'flip') { A.nz(t, .5, .15, 'highpass', 2000); const v = P.ev.find(x => x.k === 'vang' && x.b === e.b + 2 && x.btn === e.btn && !x.res); if (v) v.res = 'skip'; }
      else A.nz(t, .15, .4, 'lowpass', 500);
    },
    draw(P) {
      sky('#fff4dc', '#ffe8c2');
      for (let x = 0; x < W; x += 60) for (let y = 0; y < 260; y += 60) rr(x + 4, y + 4, 52, 52, 4, (x + y) % 120 ? '#fff' : '#d8f0ec', 2);
      rr(-10, 400, W + 20, 150, 0, '#c8742c', 4); rr(400, 330, 160, 80, 6, '#3a3354', 4); circ(478, 336, 22, '#ef4a36', 0);
      rr(390, 362, 70, 40, 6, '#9b6b43', 4);
      const stack = P.ev.filter(e => e.k === 'vang' && hitOk(e) && P.b >= e.hb).length;
      let flipped = 0, caught = 0, burnt = 0, splat = 0;
      for (const e of P.ev) {
        if (e.k === 'flip') {
          const v = P.ev.find(x => x.k === 'vang' && x.b === e.b + 2 && x.btn === e.btn);
          if (!e.res && P.b >= e.b - 2) {               // cooking in the pan
            const k = clamp((P.b - (e.b - 2)) / 2, 0, 1), pop = e.b - P.b < 1;
            ell(PAN[0], PAN[1] - 4 - (pop ? Math.abs(Math.sin(P.b * 20)) * 4 : 0), 34, 9, k > .5 ? '#f2b35a' : '#f8deaa', 3);
            if (pop) for (let i = 0; i < 3; i++) circ(PAN[0] - 14 + i * 14, PAN[1] - 10, 3, '#fff', 2);
          } else if (e.res === 'miss' && P.b - e.b < 1) { burnt = 1; ell(PAN[0], PAN[1] - 4, 34, 9, '#3a2a20', 3); }
          else if (hitOk(e) && v && (!v.res || (v.res === 'miss' && P.b - v.b < .2))) {   // in the air
            const p = clamp((P.b - e.hb) / (v.b - e.hb), 0, 1.1), x = lerp(PAN[0], PLATE[0], p), y = lerp(PAN[1], PLATE[1] - stack * 7, p) - hop(Math.min(p, 1)) * (e.big ? 330 : 260);
            g.save(); g.translate(x, y); g.rotate(p * Math.PI * (e.big ? 6 : 4)); ell(0, 0, e.big ? 48 : 34, 9, '#f2b35a', 3); g.restore();
          }
          if (hitOk(e) && P.b - e.hb < .25) flipped = 1;
        } else {
          if (hitOk(e) && P.b - e.hb < .3) caught = 1;
          if (e.res === 'miss' && P.b - e.b < 1) splat = 1;
        }
      }
      // Pluk on the stool: pan in one hand, plate in the other
      actor('pluk', { x: 425, y: 314, ar: flipped ? 1 : .55, al: caught ? .7 : .45, squash: flipped ? -.25 : 0, eyes: burnt || splat ? 'x' : flipped || caught ? 'happy' : 'big', mouth: burnt || splat ? 'sad' : 'grin' });
      ln(456, 300, PAN[0] + 30, PAN[1] + 2, 6); ell(PAN[0], PAN[1] + 4, 38, 9, '#3a3354', 3);
      ell(PLATE[0], PLATE[1] + 6, 40, 8, '#fff', 3);
      for (let i = 0; i < Math.min(stack, 14); i++) ell(PLATE[0] + Math.sin(i * 2) * 3, PLATE[1] - i * 7, 32, 7, i % 2 ? '#f2b35a' : '#e9a548', 2);
      if (stack) txt(`${stack}`, PLATE[0] - 60, PLATE[1] - 20, 26, INK);
      if (burnt) { for (let i = 0; i < 3; i++) circ(PAN[0] + i * 10, PAN[1] - 40 - i * 18, 10 + i * 4, 'rgba(90,90,100,.5)', 0); bubble('Aangebrand!', 600, 200, 22); }
      if (splat) { ell(520, 470, 40, 8, '#f2b35a', 3); bubble('Plof!', 600, 200, 24); }
      if (caught && !splat) bubble(['Hup!', 'Lekker!', 'Nog één!'][stack % 3], 300, 190, 22);
      // flip ring on the pan, catch ring on top of the stack (only once the pancake is actually in the air)
      P.ev.forEach(e => {
        if (e.k === 'flip') return cueRing(P, e, PAN[0], PAN[1] - 6, 1, '#ef4a36', 56);
        const f = P.ev.find(x => x.k === 'flip' && x.b === e.b - 2 && x.btn === e.btn);
        if (f && hitOk(f)) cueRing(P, e, PLATE[0], PLATE[1] - stack * 7 - 6, 2, '#4d7cf0', 70);
      });
    },
  });
})();
