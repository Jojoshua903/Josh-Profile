'use strict';
// ---------- Multiplayer: two players on one keyboard / one screen ----------
// Player 1 = button 'a' (F / left half), Player 2 = button 'b' (J / right half).
const MP = { versus: [], coop: [], party: [] };
const PCOL = { a: '#ef4a36', b: '#4d7cf0' };
const MP_HOW = '<b>Speler 1:</b> F (or tap the left half) · <b>Speler 2:</b> J (or tap the right half).<br>';
const mpScore = (ev, whiffs = 0) => {
  const sc = ev.filter(e => e.res && e.res !== 'skip');
  return sc.length ? Math.round(clamp(sc.reduce((a, e) => a + (PTS[e.res] || 0), 0) / sc.length - whiffs * 1.5, 0, 100)) : 0;
};

// Versus: both players play the same song side by side
function makeVersus(src) {
  return Object.assign({}, src, {
    id: 'vs_' + src.id, title: src.title, who: `Versus · ${src.who.replace(/^Arcade · /, '')}`, mp: 'versus', twoBtn: true, remix: false, arcade: false,
    how: MP_HOW + 'Same song, same cues, split screen. Whoever stays closest to the beat wins.<br><br>' + src.how,
    chart() { const c = src.chart(); return c.flatMap(e => [Object.assign({}, e, { btn: 'a' }), Object.assign({}, e, { btn: 'b' })]); },
    cue(e, t, spb) { if (e.btn === 'a' && src.cue) src.cue(e, t, spb); },
    hit(t, res, e, P) { if (src.hit) src.hit(t, res, e, P); else A.clap(t); },
    miss(t, e, P) { if (src.miss) src.miss(t, e, P); },
    draw(P) {
      sky('#fbf3e4', '#f3e6cf'); dots();
      [['a', 0, 'Speler 1'], ['b', 480, 'Speler 2']].forEach(([btn, x0, name]) => {
        const sub = Object.create(P); sub.ev = P.ev.filter(e => e.btn === btn); sub.last = P['last_' + btn] || null;
        g.save(); g.translate(x0 + 10, 128); g.scale(.479, .479); g.beginPath(); g.rect(0, 0, W, H); g.clip(); src.draw(sub); g.restore();
        rr(x0 + 10, 128, 460, 259, 12, null, 5);
        rr(x0 + 70, 40, 340, 64, 16, PCOL[btn], 4);
        txt(name, x0 + 240, 60, 22, '#fff');
        txt(`${sub.ev.filter(hitOk).length} hits · ${mpScore(sub.ev, P['w_' + btn])}%`, x0 + 240, 86, 16, '#fff', 'center', DISPLAY, 600);
        txt(btn === 'a' ? 'F' : 'J', x0 + 240, 430, 40, PCOL[btn]);
        const l = sub.last; if (l && P.b - l.b < .3) circ(x0 + 240, 430, 34, null, 5);
      });
    },
  });
}

// Co-op: the two-button games, one player per button
function makeCoop(src) {
  return Object.assign({}, src, {
    id: 'co_' + src.id, title: src.title, who: 'Co-op · 2 players', mp: 'coop', arcade: false,
    how: MP_HOW + `Work together: Speler 1 plays every <b>A</b> cue, Speler 2 every <b>B</b> cue.<br><br>${src.how}`,
  });
}

// ===== Party: Touwtrekken (tug of war) =====
(() => {
  const CALLS = { trek: [2, 1], snel: [1, .5], heave: [3, 2, 1] };
  LEVELS.push({
    id: 'touw', title: 'Touwtrekken', who: 'Party · Broers vs. de rest', song: 'Trekken Maar!', color: '#c8742c', accent: '#7bc96f', mp: 'versus', twoBtn: true,
    bpm: 120, beats: 64, key: 7,
    prog: [[0, 4, 7], [5, 9, 12], [0, 4, 7], [7, 11, 14]],
    drums: { k: 'x...x...', s: '..x...x.', h: 'xxxxxxxx' }, bass: '1.8.1.8.', comp: 'stab',
    mel: [[[0, 7, 2], [2, 12, 2], [4, 7, 4]], [[0, 9, 2], [2, 12, 2], [4, 17, 4]], [[0, 12, 2], [2, 7, 2], [4, 4, 4]], [[0, 11, 3], [3, 14, 1], [4, 7, 4]]],
    how: MP_HOW + 'Fred blows the whistle, both teams pull. <b>Two whistles = pull on the third beat.</b> Quick whistles = pull right after. Three whistles = the big heave.<br>Every good pull drags the rope your way. Whoever has the flag on their side at the end wins, and the losers go in the mud.',
    verdict: ['', '', ''],
    chart() {
      const c = [], add = (bar, off, k) => ['a', 'b'].forEach(btn => c.push({ b: bar * 4 + off, k, btn }));
      [1, 2, 3].forEach(b => add(b, 3, 'trek')); add(4, 3, 'snel'); add(5, 1, 'snel'); add(5, 3, 'trek');
      add(6, 3, 'snel'); add(7, 3, 'heave'); add(8, 1, 'snel'); add(8, 3, 'snel'); add(9, 3, 'trek'); add(10, 1, 'snel'); add(10, 3, 'snel');
      add(11, 3, 'heave'); add(12, 1, 'snel'); add(12, 3, 'trek'); add(13, 1, 'snel'); add(13, 3, 'snel'); add(14, 3, 'trek'); add(15, 3, 'heave');
      return c;
    },
    cue(e, t, spb) { if (e.btn === 'a') CALLS[e.k].forEach(d => A.tone(t - d * spb, 2300, .07, 'sine', .14, 2000)); },
    hit(t, res, e) { A.kick(t, .4); A.voice(t, fq(e.btn === 'a' ? 7 : 2), .14, .8, 'u'); },
    miss(t) { A.nz(t, .1, .1, 'lowpass', 400); },
    rope(P) {
      let s = 0;
      P.ev.forEach(e => { if (hitOk(e) && P.b >= e.hb) s += (e.btn === 'a' ? -1 : 1) * PTS[e.res] / 100 * ease((P.b - e.hb) / .35); });
      return s;
    },
    winner(P) { const s = this.rope(P); return Math.abs(s) < .05 ? null : s < 0 ? 'a' : 'b'; },
    draw(P) {
      sky('#bfe6f8', '#eaf7d8');
      rr(-10, 380, W + 20, 170, 0, '#7bc96f', 4); ell(480, 420, 120, 26, '#7a5236', 4); ell(470, 415, 60, 10, '#8f6444', 0);
      const off = clamp(this.rope(P) * 14, -260, 260), end = Math.max(0, P.b - P.beats), win = end ? this.winner(P) : null;
      const pullA = P.ev.some(e => e.btn === 'a' && hitOk(e) && P.b - e.hb < .3), pullB = P.ev.some(e => e.btn === 'b' && hitOk(e) && P.b - e.hb < .3);
      const slideA = win === 'b' ? Math.min(end * 120, 200) : 0, slideB = win === 'a' ? Math.min(end * 120, 200) : 0;
      ln(40 + off + slideA, 330, 920 + off - slideB, 330, 7, '#c8a46a'); ln(40 + off + slideA, 330, 920 + off - slideB, 330, 2);
      poly([[480 + off, 330], [470 + off, 370], [490 + off, 370]], '#ef4a36', 3);
      ln(480, 300, 480, 380, 3, 'rgba(33,28,52,.4)');
      // team Speler 1: the brothers
      [['cas', 120], ['luur', 205], ['joep', 290]].forEach(([n, x], i) => bro(n, { x: x + off + slideA, y: 300 + (slideA ? Math.min(slideA, 60) * .3 : 0), s: .85, rot: pullA ? .3 : .15, ar: .5, al: .5, eyes: win === 'b' ? 'x' : pullA ? 'happy' : 'open', mouth: win === 'a' ? 'grin' : pullA ? 'wow' : 'flat' }));
      // team Speler 2: Pluk, Fred and Skelet
      actor('pluk', { x: 670 + off - slideB, y: 318, s: .85, rot: pullB ? -.3 : -.15, ar: .5, al: .5, eyes: win === 'a' ? 'x' : 'big', mouth: pullB ? 'wow' : 'grin' });
      actor('fred', { x: 760 + off - slideB, y: 310, s: .85, rot: pullB ? -.3 : -.15, ar: .5, al: .5, eyes: 'open', mouth: pullB ? 'wow' : 'smile' });
      actor('skelet', { x: 850 + off - slideB, y: 300, s: .85, rot: pullB ? -.3 : -.15, arms: .5 });
      // the referee's whistle
      if (P.ev.some(e => e.btn === 'a' && !e.res && CALLS[e.k].some(d => { const k = P.b - (e.b - d); return k >= 0 && k < .3; }))) bubble('Fwiet!', 480, 210, 26);
      // whistle pips over the referee spot, and a ring on each team's front hands
      const live = P.ev.find(e => e.btn === 'a' && !e.res && P.b >= e.b - CALLS[e.k][0] - .1 && P.b < e.b + .3);
      if (live) { const cs = CALLS[live.k]; callPips(480, 260, cs.length + 1, cs.filter(d => P.b >= live.b - d - .02).length + (P.b >= live.b - .05 ? 1 : 0), '#f6b92b'); }
      P.ev.forEach(e => cueRing(P, e, (e.btn === 'a' ? 330 + slideA : 630 - slideB) + off, 330, CALLS[e.k][0], PCOL[e.btn], 60));
      rr(30, 30, 230, 52, 14, PCOL.a, 4); txt('Speler 1 · Broers', 145, 56, 18, '#fff');
      rr(W - 260, 30, 230, 52, 14, PCOL.b, 4); txt('Speler 2 · De rest', W - 145, 56, 18, '#fff');
      if (win) bubble(win === 'a' ? 'De broers winnen!' : 'De rest wint!', 480, 120, 30);
      else if (end) bubble('Gelijkspel!', 480, 120, 30);
    },
  });
})();

// ===== Party: Pingpong Duel (Joep vs. Skelet) =====
(() => {
  const RALLIES = [[1, 1, 1, 1], [1, 1, 1, 1, 1, 1], [2, 1, 1, 2, 1], [1, 1, 2, 1, 1], [1, 2, 1, 1, 2, 1], [1, 1, 1, 1, 1, 1, 1, 1], [2, 2, 1, 1, 1, 2, 1], [1, 2, 1, 2, 1, 2, 1]];
  const EV = []; let cur = 4;
  RALLIES.forEach((gaps, r) => {
    let b = cur + 2, who = r % 2 ? 'b' : 'a';
    EV.push({ b, btn: who, k: 'serve', gap: 0, rally: r });
    gaps.forEach(gp => { b += gp; who = who === 'a' ? 'b' : 'a'; EV.push({ b, btn: who, k: gp === .5 ? 'smash' : gp === 2 ? 'lob' : 'tik', gap: gp, rally: r }); });
    cur = Math.ceil(b) + 2;
  });
  const X = { a: 230, b: 730 };
  LEVELS.push({
    id: 'pingpong', title: 'Pingpong Duel', who: 'Party · Joep vs. Skelet', song: 'Tik Tak Tok', color: '#1f9e8f', accent: '#fff', mp: 'versus', twoBtn: true,
    bpm: 104, beats: Math.ceil((EV[EV.length - 1].b + 3) / 4) * 4, key: 2,
    prog: [[0, 4, 7], [-3, 0, 4], [5, 9, 12], [7, 11, 14]],
    drums: { k: 'x...x...', s: '....x...', h: 'x.x.x.x.' }, bass: '1..5..8.', comp: 'arp',
    mel: [[[0, 12, 2], [2, 16, 2], [4, 19, 4]], [[0, 16, 2], [2, 12, 2], [4, 9, 4]], [[0, 17, 2], [2, 16, 2], [4, 14, 4]], [[0, 14, 4], [4, 19, 4]]],
    how: MP_HOW + 'Joep (Speler 1) and Skelet (Speler 2) take turns. The server hits after the count <b>"één, twee"</b>. After that, hit the ball when it reaches you: it bounces on the table <b>halfway</b>, so the "tok" tells you when it arrives.<br>Normal tok = one beat. Low tok = lob, two beats: wait for it. Miss and your opponent gets the point.',
    verdict: ['', '', ''],
    chart() { return EV.map(e => Object.assign({}, e)); },
    cue(e, t, spb) {
      if (e.k === 'serve') { A.voice(t - 2 * spb, fq(7), .14, .8, 'e'); A.voice(t - spb, fq(4), .14, .8, 'e'); return; }
      A.tone(t - e.gap / 2 * spb, { smash: 1700, tik: 1100, lob: 650 }[e.k], .04, 'square', .1);
    },
    hit(t, res, e) { A.tone(t, e && e.k === 'smash' ? 1500 : 900, .03, 'square', .12); A.nz(t, .03, .2, 'bandpass', 3000, 3); },
    miss(t, e, P) { A.tone(t, 300, .3, 'sawtooth', .06, 120, 900); P.ev.forEach(x => { if (x.rally === e.rally && x.b > e.b && !x.res) x.res = 'skip'; }); },
    points(P) {
      const p = { a: 0, b: 0 };
      P.ev.forEach(e => { if (e.res === 'miss' && P.b >= e.b) p[e.btn === 'a' ? 'b' : 'a']++; });
      return p;
    },
    winner(P) { const p = this.points(P); return p.a === p.b ? null : p.a > p.b ? 'a' : 'b'; },
    draw(P) {
      sky('#d8f0ec', '#fbf3e4');
      rr(-10, 420, W + 20, 130, 0, '#c99a6b', 4);
      poly([[260, 330], [700, 330], [760, 380], [200, 380]], '#1f9e8f', 4); ln(480, 330, 480, 380, 3, '#fff'); ln(230, 355, 730, 355, 2, '#fff');
      rr(476, 300, 8, 34, 2, '#fff', 3); ln(270, 380, 270, 440, 6); ln(690, 380, 690, 440, 6);
      const pts = this.points(P);
      rr(W / 2 - 150, 24, 300, 60, 16, '#fff', 4);
      txt(`${pts.a}`, W / 2 - 90, 55, 36, PCOL.a); txt('—', W / 2, 55, 30, INK); txt(`${pts.b}`, W / 2 + 90, 55, 36, PCOL.b);
      txt('Speler 1 · Joep', 120, 40, 16, PCOL.a); txt('Speler 2 · Skelet', W - 120, 40, 16, PCOL.b);
      // ball: find the flight in progress
      let ball = null, lastMiss = null;
      for (let i = 0; i < P.ev.length; i++) {
        const e = P.ev[i];
        if (e.res === 'miss' && P.b >= e.b && P.b - e.b < 1) lastMiss = e;
        if (e.res || ball) continue;
        if (e.k === 'serve') { if (e.b - P.b < 3) ball = [X[e.btn] + (e.btn === 'a' ? 30 : -30), 270 - Math.abs(Math.sin(P.b * Math.PI)) * 40]; continue; }
        const prev = P.ev[i - 1], start = e.b - e.gap;
        if (prev && prev.rally === e.rally && hitOk(prev) && P.b >= start) {
          const t = clamp((P.b - start) / e.gap, 0, 1.2), x = lerp(X[prev.btn], X[e.btn], t);
          const h = { smash: 20, tik: 70, lob: 170 }[e.k];
          ball = [x, 320 - (t < .5 ? hop(t * 2) * h : hop((t - .5) * 2) * h * .8) - (1 - Math.min(t, 1)) * 10];
        }
      }
      if (lastMiss) { const k = P.b - lastMiss.b; ball = [X[lastMiss.btn] + (lastMiss.btn === 'a' ? -1 : 1) * k * 300, 300 + k * k * 200]; bubble('Punt!', lastMiss.btn === 'a' ? 730 : 230, 160, 28); }
      const swing = btn => { const l = P['last_' + btn]; return l && P.b - l.b < .25; };
      bro('joep', { x: 140, y: 330, ar: swing('a') ? 1 : .4, eyes: lastMiss && lastMiss.btn === 'a' ? 'x' : 'open', mouth: 'grin' });
      g.save(); g.translate(192, swing('a') ? 240 : 290); g.rotate(swing('a') ? -1 : -.3); ell(0, 0, 18, 22, PCOL.a, 4); rr(-4, 18, 8, 24, 3, '#9b6b43', 3); g.restore();
      g.save(); g.translate(830, 300); g.scale(.8, .8); ART.skeleton(0, 0, { pose: swing('b') ? 1 : .3, grin: 1 }); g.restore();
      g.save(); g.translate(768, swing('b') ? 240 : 290); g.rotate(swing('b') ? 1 : .3); ell(0, 0, 18, 22, PCOL.b, 4); rr(-4, 18, 8, 24, 3, '#9b6b43', 3); g.restore();
      if (ball) circ(ball[0], ball[1], 9, '#fff', 3);
      P.ev.forEach(e => cueRing(P, e, X[e.btn] + (e.btn === 'a' ? -30 : 30), 290, e.k === 'serve' ? 2 : Math.max(e.gap, 1), PCOL[e.btn], 56));
      const done = P.b > P.beats; if (done) { const w = this.winner(P); bubble(w ? (w === 'a' ? 'Joep wint!' : 'Skelet wint!') : 'Gelijk!', 480, 170, 30); }
    },
  });
})();

MP.party = ['touw', 'pingpong'].map(id => LEVELS.find(l => l.id === id));
MP.versus = ['stoep', 'gras', 'fiets', 'muur', 'pluk', 'zurm', 'klomp', 'raket', 'ssst', 'skelet', 'putdeksel', 'toon', 'tuin', 'meloen', 'freak', 'bouw', 'droom', 'huil', 'baas', 'kegel', 'hoog', 'pannenkoek'].map(id => { const v = makeVersus(LEVELS.find(l => l.id === id)); LEVELS.push(v); return v; });
MP.coop = ['verhaal', 'robot', 'toren'].map(id => { const c = makeCoop(LEVELS.find(l => l.id === id)); LEVELS.push(c); return c; });
