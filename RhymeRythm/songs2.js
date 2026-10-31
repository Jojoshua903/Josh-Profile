'use strict';
// ===== Fietsbel (Joep & Cas on the bakfiets) =====
(() => {
  const BX = 300, SPEED = 150, ROAD = 420;
  const CALLS = { eend: [1], oma: [2, 1], brug: [3, 2, 1] };
  function bike(x, y, t, wob) {
    g.save(); g.translate(x, y); g.rotate(wob);
    [[-70, 0], [70, 0]].forEach(([wx]) => { circ(wx, 0, 30, '#fff', 4); for (let i = 0; i < 4; i++) { const a = t * 6 + i * Math.PI / 4; ln(wx + Math.cos(a) * 28, Math.sin(a) * 28, wx - Math.cos(a) * 28, -Math.sin(a) * 28, 2); } });
    rr(30, -70, 90, 50, 8, '#1f9e8f', 4);                      // the box up front
    ln(-70, 0, -10, -50, 5); ln(-10, -50, 70, 0, 5); ln(-10, -50, 30, -30, 5); ln(-20, -60, 0, -60, 6);
    ln(-70, 0, -30, -80, 5); ln(-40, -90, -18, -90, 6);
    circ(-22, -96, 6, '#f6b92b', 3);                            // the bell
    g.restore();
  }
  LEVELS.push({
    id: 'fiets', title: 'Fietsbel', who: 'Joep op de Stoep', song: 'Tring Tring!', color: '#ffd75e', accent: '#1f9e8f',
    bpm: 126, beats: 64, key: 2,
    prog: [[0, 4, 7], [5, 9, 12], [-3, 0, 4], [7, 11, 14]],
    drums: { k: 'x...x...', s: '..x...x.', h: 'xxxxxxxx' }, bass: '1.8.5.8.', comp: 'stab',
    mel: [[[0, 12, 1], [1, 14, 1], [2, 16, 2], [4, 19, 2], [6, 16, 2]], [[0, 17, 2], [2, 16, 2], [4, 12, 4]], [[0, 9, 2], [2, 12, 2], [4, 16, 4]], [[0, 14, 3], [3, 11, 1], [4, 7, 4]]],
    how: 'Joep is racing the bakfiets through town with Cas napping in the box. <b>Ring the bell</b> so everyone gets out of the way.<br>A <b>duck</b> quacks once: ring one beat later. An <b>oma</b> coughs twice: ring on the third. The <b>bridge</b> dings three times: ring on the fourth.',
    verdict: ['Not one duck was harmed. Joep rang that bell like a pro, and Cas never woke up.', 'A few close calls and one very annoyed oma, but you got there.', 'Count the warnings: one quack, two coughs, three dings, then ring.'],
    chart() {
      const c = [], add = (bar, off, k) => c.push({ b: bar * 4 + off, k });
      add(1, 2, 'eend'); add(2, 2, 'eend'); add(3, 3, 'oma'); add(4, 1, 'eend'); add(4, 3, 'eend');
      add(5, 3, 'oma'); add(6, 1, 'eend'); add(6, 2, 'eend'); add(6, 3, 'eend'); add(7, 3, 'brug');
      add(8, 1, 'eend'); add(8, 3, 'oma'); add(9, 1, 'eend'); add(9, 2, 'eend'); add(9, 2.5, 'eend'); add(10, 3, 'oma');
      add(11, 3, 'brug'); add(12, 1, 'eend'); add(12, 2, 'eend'); add(12, 3, 'oma'); add(13, 1, 'eend'); add(13, 1.5, 'eend'); add(13, 3, 'eend');
      add(14, 3, 'oma'); add(15, 3, 'brug');
      return c;
    },
    cue(e, t, spb) {
      if (e.k === 'eend') A.voice(t - spb, fq(14), .1, .9, 'a', fq(9));
      else if (e.k === 'oma') [2, 1].forEach(d => A.voice(t - d * spb, fq(-2), .12, .8, 'u'));
      else [3, 2, 1].forEach(d => A.tone(t - d * spb, fq(19), .3, 'triangle', .1));
    },
    hit(t) { A.tone(t, 2400, .08, 'sine', .14); A.tone(t + .09, 2400, .12, 'sine', .12); },
    miss(t) { A.kick(t, .4); A.voice(t, fq(4), .2, .8, 'e'); },
    draw(P) {
      sky('#bfe6f8', '#fff3db');
      // houses and canal scroll by
      const sc = P.b * SPEED;
      for (let i = -1; i < 9; i++) {
        const x = i * 140 - (sc * .4) % 140, c = ['#b5482f', '#e8a33d', '#3f7d73', '#c95b3c', '#6a4a8a'][(i + Math.floor(sc * .4 / 140) + 50) % 5];
        rr(x, 170, 130, 170, 0, c, 4); poly([[x + 20, 170], [x + 65, 120], [x + 110, 170]], c, 4); rr(x + 25, 200, 30, 36, 3, '#fdf6e6', 3); rr(x + 75, 200, 30, 36, 3, '#fdf6e6', 3);
      }
      rr(-10, 340, W + 20, 40, 0, '#5aa9c9', 4);
      for (let x = -(sc * .6) % 60; x < W; x += 60) ln(x, 360, x + 24, 360, 3, '#fff');
      rr(-10, 380, W + 20, 170, 0, '#c96a4a', 4);
      for (let x = -(sc % 80); x < W; x += 80) ln(x, 470, x + 40, 470, 5, '#fff');
      let ring = 0, crash = 0;
      for (const e of P.ev) {
        if (hitOk(e) && P.b - e.hb >= 0 && P.b - e.hb < .35) ring = 1;
        if (e.res === 'miss' && P.b >= e.b && P.b - e.b < .8) crash = 1;
        const dx = (e.b - P.b) * SPEED;
        let x = BX + 120 + dx, y = ROAD, gone = hitOk(e) ? clamp((P.b - e.hb) / .8, 0, 1) : 0;
        if (x < -100 || x > W + 140) continue;
        if (hitOk(e)) { x = BX + 120 + (e.b - e.hb) * SPEED; y -= hop(gone) * 140; x += gone * 120; if (gone >= 1) continue; }
        if (e.k === 'eend') { ell(x, y - 18, 22, 16, '#fff', 3); circ(x - 18, y - 36, 11, '#fff', 3); poly([[x - 28, y - 37], [x - 40, y - 33], [x - 28, y - 30]], '#f6b92b', 2); circ(x - 21, y - 39, 2, INK, 0); }
        else if (e.k === 'oma') { kid({ x, y: y - 66, s: .8, col: '#b07bd0', skin: '#f2cfae', hat: 'none', hair: '#ddd', eyes: gone ? 'x' : 'open', mouth: gone ? 'wow' : 'flat', arms: gone ? 1 : .1 }); circ(x, y - 66 - 70, 16, '#eee', 3); }
        else { rr(x - 20, y - 160, 16, 160, 3, '#9b6b43', 3); rr(x - 60, y - 160 - (gone ? 60 : 0), 120, 18, 4, '#ef4a36', 3); circ(x - 12, y - 170, 8, '#f6b92b', 3); }
      }
      const pedal = P.b * 2;
      bike(BX, ROAD - 30, pedal, crash ? Math.sin(P.b * 30) * .08 : 0);
      bro('cas', { x: BX + 75, y: ROAD - 130, s: .7, eyes: crash ? 'x' : 'sleepy', mouth: crash ? 'wow' : 'smile', legs: false });
      bro('joep', { x: BX - 30, y: ROAD - 170, s: .85, ar: ring ? 1 : .55, al: .55, bob: Math.abs(Math.sin(pedal * Math.PI)) * 4, mouth: ring ? 'wow' : 'grin' });
      // warning pips (one per quack/cough/ding, then the bell) and a ring closing on the bell
      const live = P.ev.find(e => !e.res && P.b >= e.b - CALLS[e.k][0] - .1 && P.b < e.b + .3);
      if (live) { const cs = CALLS[live.k]; callPips(BX - 20, 92, cs.length + 1, cs.filter(d => P.b >= live.b - d - .02).length + (P.b >= live.b - .05 ? 1 : 0), '#f6b92b'); }
      P.ev.forEach(e => cueRing(P, e, BX - 22, ROAD - 126, CALLS[e.k][0], '#f6b92b', 70));
      if (ring) txt('TRING!', BX - 20, ROAD - 300, 28, '#ef4a36');
      if (crash) bubble('Hé! Kijk uit!', BX + 220, 150, 24);
    },
  });
})();

// ===== Klompendans (Luur copies Joep's clog dance) =====
(() => {
  const PATS = [[0, 1, 2], [0, 1, 2, 3], [0, .5, 1, 2], [0, 1, 1.5, 2, 3], [0, 2, 2.5, 3], [0, .5, 1, 1.5, 2], [0, 1, 2, 2.5, 3, 3.5]];
  function clogs(x, y, s, stomp) { [-1, 1].forEach(sd => ell(x + sd * 19 * s, y + 66 * s - stomp * 4, 17 * s, 9 * s, '#f6c32b', 3)); }
  LEVELS.push({
    id: 'klomp', title: 'Klompendans', who: 'Luur op de Muur', song: 'Klik Klak Klompen', color: '#f6c32b', accent: '#ef4a36',
    bpm: 112, beats: 64, key: 7,
    prog: [[0, 4, 7], [7, 11, 14], [5, 9, 12], [0, 4, 7]],
    drums: { k: 'x...x...', s: '....x...', h: 'x.x.x.x.' }, bass: '1.5.1.5.', comp: 'arp', swing: .15,
    mel: [[[0, 12, 2], [2, 16, 2], [4, 19, 4]], [[0, 19, 2], [2, 17, 2], [4, 14, 4]], [[0, 17, 2], [2, 16, 2], [4, 12, 4]], [[0, 16, 2], [2, 14, 2], [4, 12, 4]]],
    how: 'Joep is teaching Luur the clog dance. Joep stomps a rhythm for one bar, and then Luur <b>copies it exactly</b> in the next bar.<br>Listen to the whole bar first, then play it back.',
    verdict: ['Klik, klak, perfect. Luur now wants to know how clogs are made.', 'Mostly in step. One or two clogs went flying.', 'Wait for Joep to finish his bar, then copy the same rhythm in the next one.'],
    chart() {
      const c = [];
      PATS.forEach((p, i) => { const call = 1 + i * 2; p.forEach(off => c.push({ b: (call + 1) * 4 + off, k: 'klomp', call })); });
      return c;
    },
    cue(e, t, spb) { const tc = t - 4 * spb; A.tone(tc, 900, .04, 'square', .09); A.nz(tc, .04, .3, 'bandpass', 1800, 3); },
    hit(t) { A.tone(t, 1100, .04, 'square', .09); A.nz(t, .04, .3, 'bandpass', 2200, 3); },
    miss(t) { A.nz(t, .2, .12, 'lowpass', 400); },
    draw(P) {
      sky('#bfe6f8', '#fff3db');
      // windmill
      rr(720, 150, 90, 260, 10, '#c95b3c', 4); poly([[700, 150], [765, 90], [830, 150]], '#7f3b2c', 4);
      g.save(); g.translate(765, 150); g.rotate(P.b * Math.PI / 4);
      for (let i = 0; i < 4; i++) { g.rotate(Math.PI / 2); rr(-10, -150, 20, 140, 4, '#fff', 3); }
      g.restore(); circ(765, 150, 12, '#9b6b43', 3);
      rr(-10, 410, W + 20, 140, 0, '#7bc96f', 4);
      for (let i = 0; i < 14; i++) { const x = 20 + i * 48, c = ['#ef4a36', '#f6b92b', '#f59ab5'][i % 3]; ln(x, 470, x, 440, 3, '#3d8a3a'); poly([[x - 8, 440], [x, 424], [x + 8, 440], [x, 450]], c, 2); }
      // which bar is Joep's and which is Luur's comes from the stomps themselves, so this also works inside remixes
      const bar = Math.floor(P.b / 4), inBar = n => P.ev.filter(e => Math.floor(e.b / 4 + 1e-6) === n);
      const copying = inBar(bar).length > 0, calling = !copying && inBar(bar + 1).length > 0;
      let jStomp = 0;
      for (const e of P.ev) { const k = P.b - (e.b - 4); if (k >= 0 && k < .2) jStomp = 1; }
      const l = recent(P, .2), lStomp = l ? 1 : 0, oops = P.ev.some(e => e.res === 'miss' && P.b >= e.b && P.b - e.b < .6);
      bro('joep', { x: 300, y: 330 - jStomp * 10, squash: jStomp * .3, arms: jStomp ? .8 : .3, mouth: calling ? 'wow' : 'grin' }); clogs(300, 330, 1, jStomp);
      bro('luur', { x: 520, y: 336 - lStomp * 10, s: .92, squash: lStomp * .3, arms: lStomp ? .8 : .2, eyes: oops ? 'x' : copying ? 'big' : 'open', mouth: oops ? 'sad' : 'o', look: -1 }); clogs(520, 336, .92, lStomp);
      if (calling) bubble('Kijk goed!', 300, 160, 24);
      if (copying) bubble('Nu jij, Luur!', 520, 170, 24);
      if (oops) txt('klets!', 600, 260, 28, '#ef4a36', 'center', HAND, 400);
      // rhythm strip: Joep's stomps appear as he makes them, then Luur plays them back under the playhead
      const pat = (copying ? inBar(bar) : inBar(bar + 1)).map(e => e.b - Math.floor(e.b / 4 + 1e-6) * 4);
      if (calling || copying) {
        const x0 = 330, w = 300, y = 70, ph = P.b - bar * 4;
        rr(x0 - 24, y - 28, w + 48, 56, 16, '#fff', 3);
        for (let i = 0; i <= 4; i++) ln(x0 + i * w / 4, y - 14, x0 + i * w / 4, y + 14, 2, '#c9bfae');
        pat.forEach(off => {
          const mx = x0 + off / 4 * w;
          if (calling) { if (ph >= off - .02) circ(mx, y, 11, '#f6c32b', 3); return; }
          const e = P.ev.find(v => Math.abs(v.b - (bar * 4 + off)) < .01);
          circ(mx, y, 11, e && hitOk(e) ? '#3fbf6f' : e && e.res === 'miss' ? '#ef4a36' : '#fff', 3);
        });
        ln(x0 + clamp(ph, 0, 4) / 4 * w, y - 22, x0 + clamp(ph, 0, 4) / 4 * w, y + 22, 4, calling ? '#9b6b43' : '#ef4a36');
        txt(calling ? 'Joep' : 'Luur', x0 - 50, y + 2, 18, INK, 'right');
      }
    },
  });
})();

// ===== Ssst! (Zurm keeps the library quiet) =====
(() => {
  const NOISE = { hoest: [1], giechel: [1.5, 1.25, 1], snurk: [2], tring: [1, .5] };
  const WHO = { hoest: 'skelet', giechel: 'pluk', snurk: 'cas', tring: 'fred' };
  const SEAT = { skelet: 260, pluk: 410, cas: 560, fred: 700 };
  LEVELS.push({
    id: 'ssst', title: 'Ssst!', who: 'Zurm de Boekenwurm', song: 'Stilte Graag', color: '#e9defb', accent: '#6a4a8a',
    bpm: 96, beats: 56, key: 5, swing: .2,
    prog: [[0, 4, 7, 11], [9, 12, 16, 19], [2, 5, 9, 12], [7, 11, 14, 17]],
    drums: { k: 'x.....x.', s: '....x...', h: 'x.x.x.x.' }, bass: '1..5..8.', comp: 'pad', lead: 'triangle', leadVol: .06,
    mel: [[[0, 12, 3], [4, 11, 4]], [[0, 9, 3], [4, 12, 4]], [[0, 14, 3], [4, 12, 4]], [[0, 11, 6]]],
    how: 'Zurm runs the library, and her friends are terrible at being quiet. <b>Shush them</b> on the beat right after they make a noise.<br>Skelet <b>coughs</b>, Pluk <b>giggles</b>, Cas <b>snores</b> (a long one), and Fred’s phone goes <b>tring-tring</b>. Every noise ends one beat before your "Ssst!" (Fred’s phone is the quick one: half a beat).',
    verdict: ['Total silence. You could hear a bookmark drop. Zurm is delighted.', 'Mostly quiet, apart from one snore that echoed down the history aisle.', 'Shush right after the noise stops: one beat after a cough, giggle or snore.'],
    chart() {
      const c = [], add = (bar, off, k) => c.push({ b: bar * 4 + off, k });
      add(1, 3, 'hoest'); add(2, 3, 'giechel'); add(3, 3, 'hoest'); add(4, 3, 'snurk');
      add(5, 1, 'hoest'); add(5, 3, 'giechel'); add(6, 3, 'tring'); add(7, 1, 'hoest'); add(7, 3, 'snurk');
      add(8, 1, 'giechel'); add(8, 3, 'tring'); add(9, 1, 'hoest'); add(9, 2, 'hoest'); add(9, 3, 'giechel');
      add(10, 3, 'snurk'); add(11, 1, 'tring'); add(11, 3, 'giechel'); add(12, 1, 'hoest'); add(12, 3, 'tring'); add(13, 3, 'snurk');
      return c;
    },
    cue(e, t, spb) {
      const n = NOISE[e.k];
      if (e.k === 'hoest') A.nz(t - spb, .12, .3, 'bandpass', 600, 1.5);
      else if (e.k === 'giechel') n.forEach((d, i) => A.voice(t - d * spb, fq(19 + i * 2), .06, .8, 'i'));
      else if (e.k === 'snurk') A.tone(t - 2 * spb, 70, spb * .95, 'sawtooth', .12, 55, 400);
      else n.forEach(d => { A.tone(t - d * spb, 1800, .08, 'square', .06); A.tone(t - d * spb + .04, 1500, .06, 'square', .05); });
    },
    hit(t) { A.nz(t, .22, .3, 'highpass', 5000, 1, 3000); },
    miss(t, e) { if (e.k === 'giechel') [0, .1, .2].forEach(d => A.voice(t + d, fq(21), .07, .9, 'a')); else A.voice(t, fq(0), .2, .7, 'o'); },
    draw(P) {
      bgRoom('#f3e6ff');
      for (let r = 0; r < 2; r++) for (let x = 20; x < W - 20; x += 26) rr(x, 40 + r * 110, 22, 80 - (x * 7) % 24, 3, ['#ef4a36', '#4d7cf0', '#f6b92b', '#1f9e8f', '#f59ab5'][(x / 26 + r) % 5 | 0], 2);
      rr(180, 330, 600, 24, 6, '#9b6b43', 4); ln(200, 354, 200, 430, 6); ln(760, 354, 760, 430, 6);
      const loud = {}, hushed = {}, ruined = {};
      for (const e of P.ev) {
        const who = WHO[e.k], start = e.b - Math.max(...NOISE[e.k]);
        if (!e.res && P.b >= start && P.b < e.b) loud[who] = 1;
        if (hitOk(e) && P.b - e.hb >= 0 && P.b - e.hb < 1) hushed[who] = 1;
        if (e.res === 'miss' && P.b >= e.b && P.b - e.b < 1.2) ruined[who] = 1;
      }
      const sh = (who, x) => (loud[who] || ruined[who]) ? Math.sin(P.b * 40) * 3 : 0;
      g.save(); g.translate(SEAT.skelet + sh('skelet'), 290); g.scale(.55, .55); ART.skeleton(0, 0, { pose: loud.skelet ? .4 : 0, grin: hushed.skelet ? 0 : 1 }); g.restore();
      actor('pluk', { x: SEAT.pluk + sh('pluk'), y: 280, eyes: hushed.pluk ? 'sleepy' : 'happy', mouth: loud.pluk || ruined.pluk ? 'grin' : 'flat', legs: false });
      if (loud.cas || ruined.cas) { bro('cas', { x: SEAT.cas, y: 300, rot: .6, eyes: 'sleepy', mouth: 'o', legs: false }); txt('Z Z Z', SEAT.cas + 30, 200, 26, INK, 'center', HAND, 400); }
      else bro('cas', { x: SEAT.cas, y: 270, eyes: hushed.cas ? 'open' : 'sleepy', mouth: 'flat', legs: false });
      actor('fred', { x: SEAT.fred, y: 300, ar: loud.fred || ruined.fred ? .9 : .2, mouth: hushed.fred ? 'flat' : 'wow' });
      if (loud.fred || ruined.fred) { rr(SEAT.fred + 26, 200, 18, 30, 4, '#3a3354', 3); txt('♪', SEAT.fred + 54, 196, 20, INK); }
      Object.keys(ruined).forEach(w => bubble(w === 'pluk' ? 'HIHIHI!' : w === 'cas' ? 'SNURK' : w === 'fred' ? 'Hallo?' : 'KUCH!', SEAT[w], 150, 22));
      Object.keys(hushed).forEach(w => txt('…', SEAT[w], 190, 30, INK));
      P.ev.forEach(e => cueRing(P, e, SEAT[WHO[e.k]], 215, Math.max(...NOISE[e.k]), '#6a4a8a', 70));
      // Zurm at the desk
      const sss = P.ev.some(e => hitOk(e) && P.b - e.hb >= 0 && P.b - e.hb < .4), sad = Object.keys(ruined).length;
      rr(800, 360, 150, 70, 8, '#b07b4f', 4);
      ART.zurm(880, 320, { b: P.b, ar: sss ? 1 : .3, mouth: sss ? 'o' : sad ? 'sad' : 'smile', eyes: sad ? 'x' : 'open' });
      if (sss) bubble('Ssst!', 860, 150, 30);
    },
  });
})();

// ===== Putdeksel Mep (Janet whacks Toon's tentacles) =====
(() => {
  const DRAINS = [260, 480, 700], LEAD = { blub: 1, traag: 2 };
  LEVELS.push({
    id: 'putdeksel', title: 'Putdeksel Mep', who: 'Janet & Fred', song: 'Blub Blub Bonk', color: '#f59ab5', accent: '#e8362f',
    bpm: 130, beats: 64, key: 9,
    prog: [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-5, -1, 2]],
    drums: { k: 'x..x..x.', s: '..x...x.', h: 'xxxxxxxx' }, bass: '18181818', comp: 'stab',
    mel: [[[0, 12, 2], [2, 15, 2], [4, 14, 2], [6, 12, 2]], [[0, 8, 2], [2, 12, 2], [4, 15, 4]], [[0, 10, 2], [2, 14, 2], [4, 17, 4]], [[0, 16, 3], [3, 14, 1], [4, 11, 4]]],
    how: 'Toon’s little tentacles are popping out of every drain on the street. Janet is tall enough to reach all three. <b>Bonk</b> each tentacle when it’s all the way up.<br>A <b>blub</b> means it pops up one beat later. A slow <b>blub… blub</b> means two beats.',
    verdict: ['Every drain sealed. Fred has started inventing a tentacle-proof drain cover.', 'Most of them got bonked. A couple are still waving from the drains.', 'Bonk one beat after a single blub, two beats after a double one.'],
    chart() {
      const c = [], add = (bar, off, k = 'blub') => c.push({ b: bar * 4 + off, k, d: c.length % 3 === 1 ? 0 : c.length % 3 === 2 ? 2 : 1 });
      add(1, 1); add(1, 3); add(2, 1); add(2, 3); add(3, 1); add(3, 2); add(3, 3); add(4, 3, 'traag');
      add(5, 1); add(5, 2); add(5, 3); add(6, 1); add(6, 1.5); add(6, 3); add(7, 3, 'traag'); add(8, 1); add(8, 2); add(8, 3);
      add(9, 1); add(9, 2); add(9, 3); add(10, 3, 'traag'); add(11, 1); add(11, 2); add(11, 2.5); add(11, 3);
      add(12, 1); add(12, 2); add(12, 3); add(13, 3, 'traag'); add(14, 1); add(14, 2); add(14, 3); add(15, 3, 'traag');
      return c;
    },
    cue(e, t, spb) {
      if (e.k === 'blub') A.tone(t - spb, 110, .14, 'sine', .3, 260);
      else [2, 1].forEach(d => A.tone(t - d * spb, 80, .2, 'sine', .3, 180));
    },
    hit(t) { A.kick(t, .5); A.tone(t, 500, .08, 'square', .07, 200); A.nz(t, .05, .25, 'bandpass', 2500, 2); },
    miss(t) { A.voice(t, fq(-7), .2, .8, 'u', fq(-2)); },
    draw(P) {
      bgStoep('#ffd6e4', '#fbe9cc');
      DRAINS.forEach(x => drain(x, 470, 0));
      let target = 1, bonk = null, wave = {};
      const next = P.ev.find(e => !e.res && e.b - P.b > -0.15); if (next) target = next.d;
      for (const e of P.ev) {
        const x = DRAINS[e.d], L = LEAD[e.k], k = (P.b - (e.b - L)) / L;
        if (k < 0) continue;
        let h = 0, squash = 0;
        if (hitOk(e)) { const f = P.b - e.hb; if (f > .6) continue; h = (1 - f / .6) * 90; squash = 1; if (f < .3) bonk = x; }
        else if (e.res === 'miss') { const f = P.b - e.b; if (f > 1.2) continue; h = 90 + Math.sin(P.b * 12) * 8; wave[x] = 1; }
        else h = ease(Math.min(k, 1)) * 90;
        g.beginPath(); g.moveTo(x, 470); g.quadraticCurveTo(x - 20 + Math.sin(P.b * 8 + x) * 10, 470 - h * .6, x + Math.sin(P.b * 6 + x) * 12, 470 - h);
        g.lineCap = 'round'; g.lineWidth = 24; g.strokeStyle = INK; g.stroke(); g.lineWidth = 16; g.strokeStyle = '#e8362f'; g.stroke();
        if (squash) txt('★', x + 20, 470 - h - 20, 22, '#f6b92b');
      }
      // Janet leans over the target drain with her mallet
      const jx = lerp(DRAINS[0], DRAINS[2], target / 2) * .4 + 480 * .6;
      ART.janet(jx, 520, { ar: bonk ? .1 : .9, al: .3, eyes: Object.keys(wave).length ? 'x' : 'open', mouth: bonk ? 'grin' : 'smile', look: (DRAINS[target] - jx) / 200 });
      const mx = bonk || DRAINS[target];
      g.save(); g.translate(jx + 40, 160); g.rotate(Math.atan2(mx - jx - 40, 270) * -1 + (bonk ? 0 : -.6));
      rr(-4, 0, 8, 260, 3, '#9b6b43', 3); rr(-26, 250, 52, 30, 6, '#ef4a36', 4); g.restore();
      P.ev.forEach(e => cueRing(P, e, DRAINS[e.d], 380, LEAD[e.k], '#e8362f', 60));
      if (bonk) txt('BONK!', bonk, 330, 30, '#ef4a36');
      Object.keys(wave).forEach(x => bubble('Blub blub!', +x, 330, 20));
      // Fred keeps count from the side
      const n = P.ev.filter(e => hitOk(e) && P.b > e.hb).length;
      actor('fred', { x: 870, y: 345, arms: bonk ? .9 : .3, mouth: 'grin' });
      rr(820, 200, 100, 50, 8, '#fff', 3); txt(`${n}`, 870, 225, 26, INK);
    },
  });
})();

// story scenes for the new songs
SCENES.fiets = [{ cap: 'Joep has a plan to get around town faster: borrow the neighbours’ bakfiets. Cas has a plan too: sleep in the front box.', draw(t) {
  bgStoep(); bro('cas', { x: 560, y: 360, s: .8, eyes: 'sleepy', rot: .3 }); bro('joep', { x: 360, y: 320, arms: 1, mouth: 'wow' });
  rr(500, 380, 140, 70, 8, '#1f9e8f', 4); bubble('Tring tring, Cas!', 360, 170, 24); txt('z z', 600, 290 - (t * 10) % 16, 22, INK, 'center', HAND, 400); } }];
SCENES.klomp = [{ cap: 'Luur found a pair of wooden clogs in the shed and has one question: how do you dance in these? Joep, of course, knows.', draw(t) {
  sky('#bfe6f8', '#fff3db'); rr(-10, 410, W + 20, 140, 0, '#7bc96f', 4); bro('joep', { x: 360, y: 330, arms: Math.abs(Math.sin(t * 3)), mouth: 'grin' });
  bro('luur', { x: 600, y: 340, s: .9, eyes: 'big', mouth: 'wow' }); [-1, 1].forEach(s => ell(600 + s * 18, 400, 16, 9, '#f6c32b', 3)); bubble('Hoe dan?!', 600, 180, 24); } }];
SCENES.ssst = [{ cap: 'To learn more about Toon, everyone heads to the library. Zurm sets one rule: total silence. Nobody manages it.', draw(t) {
  bgRoom('#f3e6ff'); ART.zurm(700, 320, { b: t * 2, ar: 1, mouth: 'o' }); actor('pluk', { x: 300, y: 330, eyes: 'happy', mouth: 'grin' });
  bro('cas', { x: 450, y: 330, eyes: 'sleepy' }); bubble('Ssst!', 700, 150, 30); } }];
SCENES.putdeksel = [{ cap: 'After the dance-off, the brothers clapped for Skelet. Nobody had ever clapped for Skelet before. He switched sides on the spot, and warned them: Toon is testing every drain in town.', draw(t) {
  bgStoep('#ffd6e4', '#fbe9cc'); g.save(); g.translate(300, 300); g.scale(.8, .8); ART.skeleton(0, 0, { pose: .6, grin: 1 }); g.restore();
  ART.janet(560, 470, { ar: .7 }); actor('fred', { x: 680, y: 345, arms: .6 }); drain(820, 470, 1);
  txt('♥', 300, 140 + Math.sin(t * 3) * 8, 44, '#ef4a36'); bubble('Toon zit in de putten!', 330, 200, 22); } }];
delete SCENES.verhaal; delete SCENES.robot;
Object.assign(STAR, { fiets: 'joep', klomp: 'luur', ssst: 'zurm', putdeksel: 'janet' });
