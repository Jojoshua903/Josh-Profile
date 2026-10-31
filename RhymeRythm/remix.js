'use strict';
// Remixes: one song, the scene keeps switching between earlier mini-games.
function makeRemix(def) {
  const src = id => LEVELS.find(l => l.id === id);
  let start = 0;
  const segs = def.segs.map(s => { const o = Object.assign({}, s, { from: start, to: start + s.len }); start += s.len; return o; });
  return Object.assign({}, def, {
    beats: start, remix: true,
    chart() {
      const out = [];
      // ev entries: [offset, kind, extra props]; two-button games pick their own button, one-button games take any button
      segs.forEach((s, si) => s.ev.forEach(([off, k, x]) => {
        const e = Object.assign({ b: s.from + off, k: k || s.k, src: s.src, seg: si, y: 120 + Math.random() * 140, side: Math.random() < .5 ? 180 : 780 }, x || {});
        if (!e.btn && def.twoBtn) e.btn = src(s.src).twoBtn ? (kindDef(s.src, e.k)[3] || 'a') : 'any';
        out.push(e);
      }));
      return out;
    },
    cue(e, t, spb) { const L = src(e.src); if (L.cue) L.cue(e, t, spb); },
    hit(t, res, e, P) { const L = src(e.src); if (L.hit) L.hit(t, res, e, P); else A.clap(t); },
    miss(t, e, P) { const L = src(e.src); if (L.miss) L.miss(t, e, P); },
    draw(P) {
      let idx = segs.findIndex(s => P.b < s.to); if (idx < 0) idx = segs.length - 1;
      const s = segs[idx], L = src(s.src), sub = Object.create(P);
      sub.ev = P.ev.filter(e => e.seg === idx);
      CAST = s.cast || {};
      try { L.draw(sub); } finally { CAST = {}; }
      if (s.cast && P.b - s.from < 2.5) { rr(W - 300, 64, 280, 34, 17, '#fff', 3); txt(s.swapLine || 'Rollen omgedraaid!', W - 160, 81, 16, INK, 'center', HAND, 400); }
      const into = P.b - s.from;
      if (idx > 0 && into < .45) {            // iris wipe into the new scene
        g.beginPath(); g.rect(0, 0, W, H); g.arc(W / 2, H / 2, ease(into / .45) * 640, 0, Math.PI * 2, true);
        g.fillStyle = L.color; g.fill('evenodd');
      }
      if (into < 2) { rr(20, 18, 250, 40, 20, L.color, 3); txt(L.title, 145, 39, 18, INK); }
    },
  });
}

LEVELS.push(makeRemix({
  id: 'remix1', title: 'Remix 1', who: 'Stoep · Gras · Muur · Pluk', song: 'Alles Door Elkaar', color: '#f6b92b', accent: '#ef4a36',
  bpm: 120, key: 0,
  prog: [[0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14]],
  drums: { k: 'x...x...', s: '..x...x.', h: 'xxxxxxxx' }, bass: '1.8.5.8.', comp: 'stab',
  mel: [[[0, 7, 2], [2, 12, 2], [4, 11, 2], [6, 7, 2]], [[0, 9, 4], [4, 12, 2], [6, 16, 2]], [[0, 12, 2], [2, 9, 2], [4, 5, 4]], [[0, 11, 2], [2, 14, 2], [4, 19, 4]]],
  how: 'Everything from the first four songs, on one beat. The scene switches every few bars, so listen for <b>each game’s own cue</b>: Joep’s count, the butterfly chime, the ball’s "pok", the carrot’s "pip".',
  verdict: ['You switched games like it was nothing. The brothers want you on the team.',
    'A few scene changes caught you out, but you kept the groove.',
    'Each scene keeps its own rules. Reset your ears at every switch.'],
  segs: [
    { src: 'stoep', len: 16, ev: [[3, 'slow'], [7, 'slow'], [11, 'fast'], [15, 'fast']] },
    { src: 'gras', len: 16, ev: [[3, 'vlinder'], [6, 'bij'], [7, 'bij'], [10, 'vlinder'], [13, 'bij'], [13.5, 'bij'], [15, 'bij']] },
    { src: 'muur', len: 16, ev: [[3, 'bal'], [5, 'bal'], [7, 'appel'], [9, 'bal'], [10, 'bal'], [11, 'bal'], [14, 'appel']] },
    { src: 'pluk', len: 16, k: 'wortel', ev: [[3], [4], [5], [7], [8, 'reus'], [11], [11.5], [12], [13], [15, 'reus']] },
    { src: 'stoep', len: 8, ev: [[3, 'fast'], [7, 'big']] },
    { src: 'muur', len: 8, ev: [[3, 'bal'], [6, 'ster']] },
  ],
}));

LEVELS.push(makeRemix({
  id: 'remix2', title: 'Remix 2', who: 'Every game · Finale', song: 'Het Hele Verhaal', color: '#6a4a8a', accent: '#f6b92b',
  bpm: 132, key: 2,
  prog: [[0, 4, 7], [-3, 0, 4], [5, 9, 12], [7, 11, 14]],
  drums: { k: 'x..xx...', s: '..x...x.', h: 'xxxxxxxx' }, bass: '18181818', comp: 'arp', lead: 'square',
  mel: [[[0, 12, 1], [1, 14, 1], [2, 16, 2], [4, 19, 2], [6, 16, 2]], [[0, 9, 2], [2, 12, 2], [4, 16, 4]], [[0, 17, 2], [2, 16, 2], [4, 14, 4]], [[0, 19, 3], [3, 14, 1], [4, 12, 4]]],
  how: 'All eight original games, back to back, at 132 bpm. Each scene lasts three bars and then the next one comes in. This is the real finale.',
  verdict: ['That was the whole story in one song, and you didn’t drop a beat. Rhyme Rhythm champion.',
    'The whole gang made it through. A few scuffs, a lot of style.',
    'It’s a marathon. Practise the songs that trip you up, then come back.'],
  segs: [
    { src: 'stoep', len: 12, ev: [[3, 'slow'], [6, 'fast'], [7, 'fast'], [11, 'slow']] },
    { src: 'gras', len: 12, ev: [[3, 'bij'], [5, 'vlinder'], [7, 'bij'], [7.5, 'bij'], [9, 'vlinder'], [11, 'bij']] },
    { src: 'muur', len: 12, ev: [[3, 'bal'], [4, 'bal'], [6, 'appel'], [8, 'bal'], [8.5, 'bal'], [11, 'appel']] },
    { src: 'pluk', len: 12, k: 'wortel', ev: [[3], [4], [4.5], [5], [7, 'reus'], [9], [10], [11]] },
    { src: 'zurm', len: 12, k: 'blad', ev: [[3.5], [5.5], [6.5], [7.5], [9.5], [10.5]] },
    { src: 'raket', len: 12, ev: [[3, 'bout'], [4, 'bout'], [6, 'paneel'], [6.5, 'paneel2'], [9, 'bout'], [10, 'bout'], [11, 'bout']] },
    { src: 'skelet', len: 12, ev: [[3, 'pose'], [5, 'pose'], [8, 'hoofd'], [11, 'pose']] },
    { src: 'toon', len: 12, ev: [[3, 'klap'], [4, 'klap'], [6, 'traag'], [8, 'klap'], [8.5, 'klap'], [11, 'traag']] },
    { src: 'stoep', len: 8, ev: [[3, 'fast'], [7, 'big']] },
  ],
}));

// Endless Stoep Marathon: three lives, the counting gets busier the longer you last.
(() => {
  const S = LEVELS.find(l => l.id === 'stoep');
  const BARS = [[[3, 'slow']], [[3, 'fast']], [[2, 'slow']], [[1, 'fast'], [3, 'fast']], [[1, 'fast'], [2.5, 'fast']]];
  LEVELS.push(Object.assign({}, S, {
    id: 'endless', title: 'Stoep Marathon', who: 'Endless · Joep op de Stoep', song: 'Tot Je Erbij Neervalt', hidden: true,
    bpm: 126, beats: 400, lives: 3, endless: true,
    how: 'Joep keeps counting until you mess up <b>three times</b>. Same rules as Stoep Stomp, but the patterns get busier the longer you last.',
    verdict: ['', '', ''],
    chart() {
      const c = [];
      for (let bar = 1; bar < 100; bar++) {
        const lvl = Math.min(BARS.length, 2 + Math.floor(bar / 8));
        BARS[Math.floor(Math.random() * lvl)].forEach(([off, k]) => c.push({ b: bar * 4 + off, k }));
      }
      return c;
    },
  }));
})();
