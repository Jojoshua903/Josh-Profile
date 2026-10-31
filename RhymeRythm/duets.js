'use strict';
// Zurm drawing, shared with story scenes and the album
ART.zurm = (x, y, o = {}) => {
  const { s = 1, b = 0, mouth = 'smile', eyes = 'open' } = o;
  g.save(); g.translate(x, y); g.scale(s, s);
  for (let i = 5; i >= 0; i--) circ(-30 - i * 28 + Math.sin(i + b * 2) * 4, 70 - Math.abs(Math.sin(i * .9 + b)) * 12, 24 - i * 1.5, i % 2 ? '#8bd17c' : '#7bc96f', 4);
  ell(0, 70, 32, 26, '#8bd17c', 4);
  kid({ x: 0, y: 0, col: '#6a4a8a', skin: '#f6d0b0', hat: 'tuft', hair: '#3a2a50', legs: false, eyes, mouth, look: 1, ar: o.ar ?? .35, al: o.al ?? .1 });
  [-11, 11].forEach(dx => circ(dx, -44, 11, 'rgba(255,255,255,.25)', 3)); ln(-1, -44, 1, -44, 3);
  poly([[-4, -74], [-26, -88], [-26, -62]], '#ef4a36', 3); poly([[-4, -74], [18, -88], [18, -62]], '#ef4a36', 3);
  g.restore();
};

// two-button key caps along the bottom of duet levels
function keyCaps(P, aLabel, bLabel) {
  const l = recent(P, .25);
  const mp = P.L.mp;  [[mp ? 'Speler 1 · ' + aLabel : aLabel, 'A', mp ? 'F' : 'Spatie / J', 200, 'a'], [mp ? 'Speler 2 · ' + bLabel : bLabel, 'B', mp ? 'J' : 'K', 760, 'b']].forEach(([who, k, keys, x, btn]) => {
    const down = l && l.btn === btn;
    rr(x - 90, H - 74 + (down ? 3 : 0), 180, 40, 12, down ? '#f6b92b' : '#fff', 3);
    txt(`${k} · ${keys}`, x, H - 54 + (down ? 3 : 0), 16, INK); txt(who, x, H - 86, 14, INK, 'center', HAND, 400);
  });
}

// ===== Duet: Verhaal & Zwaard (Zurm & Luur) =====
(() => {
  const ZX = 230, ZY = 300, TX = 680;
  LEVELS.push({
    id: 'verhaal', title: 'Verhaal & Zwaard', who: 'Duet · Zurm & Luur', song: 'Er Was Eens…', color: '#c9b6f2', accent: '#7bc96f',
    bpm: 104, beats: 56, key: 5, twoBtn: true,
    prog: [[0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14]],
    drums: { k: 'x...x.x.', s: '..x...x.', h: 'x.x.x.x.' }, bass: '1.5.8.5.', comp: 'arp',
    mel: [[[0, 12, 2], [2, 9, 2], [4, 7, 4]], [[0, 9, 2], [2, 12, 2], [4, 16, 4]], [[0, 14, 2], [2, 12, 2], [4, 9, 4]], [[0, 11, 3], [3, 14, 1], [4, 12, 4]]],
    how: 'Zurm reads a story, and Luur acts it out in a cardboard theatre. <b>Two buttons!</b><br><b>A (Spatie/J or tap left):</b> turn the page, one beat after the <b>"ting"</b>.<br><b>B (K or tap right):</b> Luur bonks the cardboard dragon, one beat after it <b>roars</b>.',
    verdict: ['A standing ovation from an audience of one worm. Zurm is writing a sequel.',
      'The dragon got a few nibbles in, but the story had a happy ending.',
      'A for pages after the "ting", B for the dragon after the roar. Keep your thumbs apart.'],
    chart() {
      const c = [], add = (bar, off, btn) => c.push({ b: bar * 4 + off, btn, k: btn === 'a' ? 'blad' : 'draak' });
      add(1, 3, 'a'); add(2, 3, 'a'); add(3, 3, 'b'); add(4, 3, 'b');
      add(5, 1, 'a'); add(5, 3, 'b'); add(6, 1, 'b'); add(6, 3, 'a');
      add(7, 1, 'a'); add(7, 2, 'b'); add(7, 3, 'a'); add(8, 1, 'b'); add(8, 1.5, 'b'); add(8, 3, 'a');
      add(9, 1, 'a'); add(9, 2, 'a'); add(9, 3, 'b'); add(10, 1, 'b'); add(10, 2, 'a'); add(10, 3, 'b');
      add(11, 1, 'a'); add(11, 1.5, 'b'); add(11, 3, 'a'); add(11, 3.5, 'b'); add(12, 1, 'b'); add(12, 2, 'b'); add(12, 3, 'a');
      c.push({ b: 13 * 4 + 3, btn: 'b', k: 'groot' });
      return c;
    },
    cue(e, t, spb) {
      if (e.k === 'blad') { A.tone(t - spb, fq(16), .14, 'sine', .12); A.tone(t - spb + .02, fq(23), .1, 'sine', .05); }
      else if (e.k === 'draak') { A.tone(t - spb, 120, .25, 'sawtooth', .14, 70, 900); }
      else [2, 1].forEach(d => A.tone(t - d * spb, 90, .35, 'sawtooth', .18, 55, 700));
    },
    hit(t, res, e) {
      if (e.btn === 'a') { A.nz(t, .13, .35, 'bandpass', 2500, 1, 6000); return; }
      A.kick(t, .5); A.nz(t, .08, .3, 'bandpass', 1200, 2); A.voice(t, fq(e.k === 'groot' ? 12 : 7), .14, .9, 'a');
      if (e.k === 'groot') A.crash(t, .25);
    },
    miss(t, e) { if (e.btn === 'b') A.tone(t, 200, .3, 'sawtooth', .08, 80, 900); else A.voice(t, fq(4), .25, .6, 'o', fq(-2)); },
    draw(P) {
      sky('#e9defb', '#fbf3e4'); dots();
      rr(-10, 420, W + 20, 130, 0, '#c99a6b', 4);
      const act = (btn, w = .4) => P.ev.find(e => e.btn === btn && hitOk(e) && P.b - e.hb >= 0 && P.b - e.hb < w);
      const missd = btn => P.ev.find(e => e.btn === btn && e.res === 'miss' && P.b >= e.b && P.b - e.b < 1);
      // Zurm with her book
      const flip = act('a', .35), torn = missd('a');
      ART.zurm(ZX, ZY, { b: P.b, eyes: torn ? 'x' : flip ? 'happy' : 'open', mouth: torn ? 'sad' : 'smile', ar: .5 });
      rr(ZX + 20, ZY - 30, 60, 46, 4, '#fffaf0', 3); rr(ZX + 80, ZY - 30, 60, 46, 4, '#fffaf0', 3);
      if (flip) { const k = (P.b - flip.hb) / .35, w = 60 * Math.cos(k * Math.PI); rr(ZX + 80 + Math.min(0, w), ZY - 30, Math.abs(w), 46, 4, '#fff3d6', 3); }
      if (Math.floor(P.b) % 4 === 0) bubble(['…en de ridder…', '…toen kwam de draak…', '…heel dapper…'][Math.floor(P.b / 4) % 3], ZX + 40, ZY - 160, 20);
      // cardboard theatre
      rr(TX - 190, 120, 380, 300, 10, '#d9a35b', 4); rr(TX - 160, 150, 320, 220, 6, '#2f6b8f', 4);
      poly([[TX - 160, 150], [TX - 90, 150], [TX - 140, 370], [TX - 160, 370]], '#ef4a36', 3);
      poly([[TX + 160, 150], [TX + 90, 150], [TX + 140, 370], [TX + 160, 370]], '#ef4a36', 3);
      // the dragon pops up from below the stage
      let dragon = null;
      for (const e of P.ev) {
        if (e.btn !== 'b') continue;
        const lead = e.k === 'groot' ? 2 : 1, k = (P.b - (e.b - lead)) / lead;
        if (k < 0) continue;
        if (hitOk(e)) { const f = P.b - e.hb; if (f < .6) dragon = { y: 0, rot: f * 3, fall: f * 300, big: e.k === 'groot' }; }
        else if (e.res === 'miss') { if (P.b - e.b < 1) dragon = { y: 0, chomp: 1, big: e.k === 'groot' }; }
        else dragon = { y: 1 - ease(k), big: e.k === 'groot' };
      }
      g.save(); g.beginPath(); g.rect(TX - 160, 150, 320, 220); g.clip();
      if (dragon) {
        const sz = dragon.big ? 1.5 : 1;
        g.save(); g.translate(TX + 70, 330 + dragon.y * 200 + (dragon.fall || 0)); g.rotate(dragon.rot || 0); g.scale(sz, sz);
        ell(0, -40, 46, 36, '#7bc96f', 4); poly([[-20, -70], [-10, -100], [0, -72]], '#f6b92b', 3); poly([[10, -72], [22, -100], [30, -70]], '#f6b92b', 3);
        circ(-14, -50, 8, '#fff', 3); circ(-12, -50, 3, INK, 0);
        rr(-60, -36 + (dragon.chomp ? 8 : 0), 40, 22, 6, '#7bc96f', 4); poly([[-56, -16], [-50, -6], [-44, -16]], '#fff', 2);
        rr(-30, -10, 60, 80, 10, '#7bc96f', 4);
        g.restore();
      }
      const bonk = act('b'), ouch = missd('b');
      bro('luur', { x: TX - 60, y: 290, eyes: ouch ? 'x' : bonk ? 'happy' : 'big', mouth: ouch ? 'sad' : bonk ? 'grin' : 'o', ar: bonk ? .2 : .9, al: .2, look: 1 });
      poly([[TX - 92, 254], [TX - 60, 220], [TX - 28, 254]], '#b9c2cf', 3);
      g.save(); g.translate(TX - 22, 260); g.rotate(bonk ? 1.6 : .2); rr(-5, -80, 10, 80, 3, '#d9a35b', 3); rr(-16, -6, 32, 8, 3, '#9b6b43', 3); g.restore();
      g.restore();
      if (bonk) txt(bonk.k === 'groot' ? 'VERSLAGEN!' : 'BOK!', TX + 70, 110, 30, '#ef4a36');
      // blue ring on the page corner for A, red ring on the dragon for B
      P.ev.forEach(e => e.btn === 'a' ? cueRing(P, e, ZX + 128, ZY + 6, 1, '#4d7cf0', 56) : cueRing(P, e, TX + 70, 260, e.k === 'groot' ? 2 : 1, '#ef4a36', e.k === 'groot' ? 110 : 70));
      keyCaps(P, 'Zurm turns the page', 'Luur bonks the dragon');
    },
  });
})();

// ===== Duet: Robot Repeat (Fred & Skelet) =====
(() => {
  const PATS = [
    [[0, 'a'], [1, 'a'], [2, 'a']], [[0, 'b'], [1, 'a'], [2, 'b'], [3, 'a']], [[0, 'a'], [1, 'a'], [1.5, 'a'], [2, 'b']],
    [[0, 'b'], [.5, 'b'], [1, 'a'], [3, 'a']], [[0, 'a'], [1.5, 'b'], [2, 'a'], [3, 'b']], [[0, 'b'], [1, 'b'], [2, 'a'], [2.5, 'a'], [3, 'b']],
    [[0, 'a'], [.5, 'a'], [1, 'a'], [2, 'b'], [3, 'b']]];
  const RX = 650;
  function robot(x, y, o) {
    const { up = 0, stomp = 0, zap = 0 } = o;
    g.save(); g.translate(x, y + stomp * 10);
    ln(-20, 60, -24, 120 - stomp * 10, 12); ln(20, 60, 24, 120, 12); rr(-44, 116, 40, 16, 4, '#9aa3b5', 3); rr(8, 116, 40, 16, 4, '#9aa3b5', 3);
    [-1, 1].forEach(sd => { const hy = 30 - up * 110; ln(sd * 46, -10, sd * 70, hy, 12); circ(sd * 70, hy, 12, '#f6b92b', 3); });
    rr(-50, -30, 100, 96, 14, '#9aa3b5', 4); rr(-30, -10, 60, 30, 6, '#4d7cf0', 3);
    rr(-40, -110, 80, 70, 14, '#b9c2cf', 4); ln(0, -110, 0, -134, 4); circ(0, -138, 7, zap ? '#ef4a36' : '#f6b92b', 3);
    rr(-28, -94, 56, 30, 6, INK, 0);
    if (zap) { txt('x  x', 0, -79, 18, '#ef4a36'); } else { circ(-13, -79, 6, '#8fd3f0', 0); circ(13, -79, 6, '#8fd3f0', 0); }
    g.restore();
  }
  LEVELS.push({
    id: 'robot', title: 'Robot Repeat', who: 'Duet · Fred & Skelet', song: 'Doe Mij Maar Na', color: '#b9c2cf', accent: '#f6b92b',
    bpm: 112, beats: 60, key: 7, swing: .25, twoBtn: true,
    prog: [[0, 3, 7, 10], [5, 8, 12, 15]],
    drums: { k: 'x..x..x.', s: '..x...x.', h: 'xxxxxxxx' }, bass: '1.81.5.8', comp: 'stab',
    mel: [[[0, 10, 2], [2, 12, 1], [3, 10, 1], [4, 7, 4]], [[0, 8, 2], [2, 7, 2], [4, 5, 4]]],
    how: 'Skelet thinks Fred’s new robot can’t dance. Skelet shows a move for one bar, then the robot <b>copies it</b> in the next bar, in exactly the same rhythm.<br><b>A (Spatie/J, tap left)</b> = the high <b>"tik"</b>. <b>B (K, tap right)</b> = the low <b>"boem"</b>.',
    verdict: ['A perfect copy. Skelet claims he taught the robot everything. Fred is taking notes.',
      'The robot mostly kept up. A couple of sparks, nothing a screwdriver can’t fix.',
      'Listen to the whole bar first, then play it back: tik is A, boem is B.'],
    chart() {
      const c = [];
      PATS.forEach((p, i) => { const call = 1 + i * 2; p.forEach(([off, btn]) => c.push({ b: (call + 1) * 4 + off, btn, k: btn === 'a' ? 'tik' : 'boem', call })); });
      return c;
    },
    cue(e, t, spb) {
      const tc = t - 4 * spb;
      if (e.btn === 'a') { A.tone(tc, 1400, .03, 'square', .09); A.nz(tc, .03, .22, 'bandpass', 3500, 4); }
      else { A.kick(tc, .7); A.tone(tc, fq(-12), .12, 'triangle', .14); }
    },
    hit(t, res, e) { if (e.btn === 'a') A.tone(t, fq(24), .06, 'square', .08); else { A.kick(t, .5); A.tone(t, fq(0), .12, 'square', .09, fq(-5)); } },
    miss(t) { A.nz(t, .2, .2, 'bandpass', 5000, 6); },
    draw(P) {
      sky('#dfe7ef', '#f3ece0');
      for (let x = 40; x < W; x += 40) for (let y = 40; y < 300; y += 40) circ(x, y, 3, 'rgba(33,28,52,.15)', 0);
      rr(-10, 420, W + 20, 130, 0, '#8d96a8', 4);
      const bar = Math.floor(P.b / 4), inBar = n => P.ev.filter(e => Math.floor(e.b / 4 + 1e-6) === n);
      const copying = inBar(bar).length > 0, calling = !copying && inBar(bar + 1).length > 0;   // read from the moves, so remixes work too
      // Skelet shows the move
      let pose = 0, step = 0;
      for (const e of P.ev) { const k = P.b - (e.b - 4); if (k >= 0 && k < .3) { if (e.btn === 'a') pose = 1; else step = 1; } }
      ART.skeleton(240, 280, { pose, step: step ? 1 : Math.sin(P.b * Math.PI) * .3, grin: calling ? 1 : 0 });
      // the robot copies the player
      const l = recent(P, .3), zap = P.ev.some(e => e.res === 'miss' && P.b >= e.b && P.b - e.b < .8);
      robot(RX, 290, { up: l && l.btn === 'a' ? 1 : 0, stomp: l && l.btn === 'b' ? 1 : 0, zap });
      kid({ x: 850, y: 355, s: .75, col: '#f4f1ea', skin: '#e8b48c', bob: Math.abs(Math.sin(P.b * Math.PI)) * 4, eyes: 'open', mouth: zap ? 'wow' : 'smile', ar: .5 });
      [-9, 9].forEach(dx => circ(850 + dx, 355 - 35, 7, 'rgba(143,211,240,.7)', 3)); rr(818, 330, 18, 26, 4, '#ef4a36', 3);
      if (calling) bubble(bar <= 1 ? 'Doe mij maar na!' : 'Kijk goed…', 300, 90, 24);
      if (copying) bubble('Jouw beurt, robot!', RX, 70, 24);
      if (zap) txt('BZZZT', RX + 90, 160, 26, '#ef4a36');
      // rhythm strip: Skelet's moves appear as he does them (A blue, B red), then the robot plays them back
      const pat = (copying ? inBar(bar) : inBar(bar + 1)).map(e => [e.b - Math.floor(e.b / 4 + 1e-6) * 4, e.btn]);
      if (calling || copying) {
        const x0 = 330, w = 300, y = 452, ph = P.b - bar * 4;
        rr(x0 - 24, y - 26, w + 48, 52, 16, '#fff', 3);
        for (let i = 0; i <= 4; i++) ln(x0 + i * w / 4, y - 12, x0 + i * w / 4, y + 12, 2, '#c9bfae');
        pat.forEach(([off, btn]) => {
          const mx = x0 + off / 4 * w, col = btn === 'a' ? '#4d7cf0' : '#ef4a36';
          if (calling) { if (ph >= off - .02) { circ(mx, y, 11, col, 3); txt(btn.toUpperCase(), mx, y + 1, 12, '#fff'); } return; }
          const e = P.ev.find(v => Math.abs(v.b - (bar * 4 + off)) < .01 && v.btn === btn);
          circ(mx, y, 11, e && hitOk(e) ? '#3fbf6f' : e && e.res === 'miss' ? '#9aa3b5' : '#fff', 3);
          txt(btn.toUpperCase(), mx, y + 1, 12, e && e.res ? '#fff' : col);
        });
        const px = x0 + clamp(ph, 0, 4) / 4 * w; ln(px, y - 20, px, y + 20, 4, calling ? INK : '#f6b92b');
      }
      keyCaps(P, 'tik = A', 'boem = B');
    },
  });
})();
