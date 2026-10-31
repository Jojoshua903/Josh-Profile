'use strict';
// ===== Grote Finale: the whole cast on one stage (only played inside the Megamix) =====
(() => {
  const CALLS = { hey: [1], tel: [3, 2, 1], slot: [4, 3, 2, 1] };
  const BACK = [['pieter', 70], ['koen', 175], ['annemiek', 280], ['baas', 385], ['sint', 480], ['kouw', 585], ['martin', 690], ['rolf', 795], ['janet', 900]];
  const FRONT = [['pluk', 90], ['cas', 205], ['zurm', 330], ['joep', 480], ['luur', 630], ['fred', 750], ['skelet', 865]];
  const COLS = ['#ef4a36', '#f6b92b', '#4d7cf0', '#f59ab5', '#7bc96f', '#8e44ad'];
  function burst(x, y, f, n, r, seed) {
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + seed;
      circ(x + Math.cos(a) * f * r, y + Math.sin(a) * f * r + f * f * 40, Math.max(6 * (1 - f / 1.6), .5), COLS[(i + seed * 3 | 0) % COLS.length], 0); }
  }
  LEVELS.push({
    id: 'finale', title: 'Grote Finale', who: 'Everyone', song: 'Allemaal Samen', color: '#ef4a36', accent: '#f6b92b', hidden: true,
    bpm: 120, beats: 36, key: 5, prog: [[0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14]],
    drums: { k: 'x.x.x.x.', s: '..x...x.', h: 'xxxxxxxx', c: '....x..x' }, bass: '18181818', comp: 'stab',
    how: 'Maat’s bell <b>dings</b>: everyone jumps one beat later. Joep counts <b>"één, twee, drie"</b>: strike a pose on four. And at the very end the whole cast counts down from four.',
    verdict: ['What a show.', 'A great show.', 'Listen for the bell and the counts.'],
    chart: () => [[3, 'hey'], [5, 'hey'], [7, 'hey'], [11, 'tel'], [13, 'hey'], [14, 'hey'], [15, 'hey'], [19, 'tel'], [21, 'hey'], [22, 'hey'], [26, 'tel'], [31, 'slot']].map(([b, k]) => ({ b, k })),
    cue(e, t, spb) {
      if (e.k === 'hey') { A.tone(t - spb, fq(24), .4, 'sine', .14); A.tone(t - spb, fq(31), .3, 'sine', .07); return; }
      CALLS[e.k].forEach((d, i) => A.voice(t - d * spb, fq((e.k === 'slot' ? [0, 2, 4, 7] : [7, 9, 12])[i]), .16, .9, e.k === 'slot' ? 'a' : i === 2 ? 'i' : 'e'));
      if (e.k === 'slot') A.tone(t - 4 * spb, fq(0), 4 * spb, 'sawtooth', .04, fq(12), 2400);
    },
    hit(t, res, e) {
      if (e.k === 'hey') { A.clap(t, .4); A.voice(t, fq(12), .12, .8, 'e'); return; }
      A.kick(t); A.crash(t, e.k === 'slot' ? .4 : .2);
      [0, 4, 7, 12, 16, 19].slice(0, e.k === 'slot' ? 6 : 4).forEach((n, i) => A.tone(t + i * .05, fq(5 + n), e.k === 'slot' ? 1.2 : .4, 'triangle', .07));
    },
    miss(t) { A.voice(t, fq(4), .2, .6, 'o', fq(-1)); },
    draw(P) {
      const t = P.b, beat = Math.abs(Math.sin(t * Math.PI));
      const fin = P.ev.find(e => e.k === 'slot'), won = fin && hitOk(fin), wk = won ? P.b - fin.hb : -1;
      sky(won ? '#ffe9b0' : '#ffc4e1', '#fff3db');
      // sweeping spotlights
      for (let i = 0; i < 4; i++) { g.save(); g.translate(120 + i * 240, -10); g.rotate(Math.sin(t * .8 + i * 1.7) * .5); g.globalAlpha = .2;
        poly([[-18, 0], [18, 0], [130, 540], [-130, 540]], COLS[i], 0); g.restore(); }
      // light bunting
      for (let i = 0; i < 24; i++) { const x = 20 + i * 40, y = 96 + Math.sin(i * .9) * 10; circ(x, y, 6, (i + Math.floor(t)) % 3 ? COLS[i % 6] : '#fff', 2); }
      rr(-10, 400, W + 20, 150, 0, '#7f3b2c', 4); rr(20, 382, 920, 30, 8, '#c8742c', 4);
      // what's happening right now
      let jump = 0, pose = 0, oops = 0, said = null; const fire = [];
      for (const e of P.ev) {
        if (hitOk(e)) { const f = P.b - e.hb; if (f >= 0 && f < .5) { if (e.k === 'hey') jump = hop(f / .5); else pose = 1; } if (e.k !== 'hey' && f >= 0 && f < 1.6) fire.push([e, f]); }
        if (e.res === 'miss' && P.b >= e.b && P.b - e.b < .7) oops = 1;
        if (!e.res && e.k !== 'hey') CALLS[e.k].forEach((d, i) => { const k = P.b - (e.b - d); if (k >= 0 && k < .5) said = e.k === 'slot' ? ['Vier!', 'Drie!', 'Twee!', 'Eén!'][i] : ['Eén!', 'Twee!', 'Drie!'][i]; });
      }
      const party = won ? 1 : 0;
      const mood = (o, i) => Object.assign(o, { bob: beat * 5 + jump * 38 + party * Math.abs(Math.sin(t * 4 + i)) * 20, arms: pose || party ? 1 : .3 + jump * .6,
        eyes: oops ? 'x' : pose || jump || party ? 'happy' : 'open', mouth: pose || jump || party ? 'wow' : 'grin' });
      // Maat floats down halfway through the finale, holding the bell
      const my = lerp(-140, 150, ease(clamp((P.b - 12) / 8, 0, 1)));
      actor('maat', { x: 480, y: my, bob: Math.sin(t * 2) * 6 });
      const bellX = my > 60 ? 540 : 110, bellY = my > 60 ? my - 10 : 150;
      const ding = P.ev.some(e => e.k === 'hey' && !e.res && P.b - (e.b - 1) >= 0 && P.b - (e.b - 1) < .3);
      g.save(); g.translate(bellX, bellY); g.rotate(ding ? Math.sin(t * 40) * .4 : 0);
      poly([[-16, 14], [-12, -10], [12, -10], [16, 14]], '#f6b92b', 3); circ(0, -14, 5, '#f6b92b', 3); circ(0, 18, 5, '#9b6b43', 2); g.restore();
      if (ding) txt('DING!', bellX + 40, bellY - 20, 20, '#f6b92b');
      BACK.forEach(([n, x], i) => actor(n, mood({ x, y: 300, s: n === 'baas' ? .55 : n === 'janet' ? .62 : .72 }, i)));
      FRONT.forEach(([n, x], i) => actor(n, mood({ x, y: n === 'zurm' ? 330 : 350, s: n === 'joep' ? 1 : .85 }, i + 9)));
      // fireworks for every pose, a sky full of them for the last hit
      fire.forEach(([e, f]) => burst(200 + (e.b * 137) % 560, 170, f, 14, 130, e.b));
      if (won) { for (let k = 0; k < 5; k++) { const f = (wk + k * .35) % 1.6; burst(140 + k * 170, 140 + (k % 2) * 60, f, 16, 150, k); }
        for (let i = 0; i < 30; i++) rr((i * 67 + wk * 70) % W, (i * 41 + wk * 160) % 400, 8, 12, 2, COLS[i % 6], 0); }
      // banner, calls, cues
      rr(250, 18, 460, 60, 22, won ? '#f6b92b' : '#ef4a36', 4); txt(won ? 'RHYME RHYTHM!' : 'GROTE FINALE', 480, 49, won ? 34 : 28, '#fff');
      if (said) bubble(said, 480, 196, 30);
      if (jump > .3) txt('HÉ!', 480, 236, 34, '#ef4a36');
      if (oops) bubble('Oeps!', 760, 190, 24);
      if (won) bubble(wk < 2 ? 'Bedankt voor het spelen!' : 'Tot de volgende keer!', 480, 196, 26);
      const live = P.ev.find(e => !e.res && e.k !== 'hey' && P.b >= e.b - CALLS[e.k][0] - .1 && P.b < e.b + .3);
      if (live) { const cs = CALLS[live.k]; callPips(480, 128, cs.length + 1, cs.filter(d => P.b >= live.b - d - .02).length + (P.b >= live.b - .05 ? 1 : 0), '#ef4a36'); }
      P.ev.forEach(e => e.k === 'hey' ? cueRing(P, e, bellX, bellY, 1, '#f6b92b', 60) : cueRing(P, e, 480, 270, CALLS[e.k][0], '#ef4a36', e.k === 'slot' ? 170 : 110));
    },
  });
})();

// ===== Megamix: every minigame, one long song, and the grand finale =====
LEVELS.push(makeRemix({
  id: 'megamix', title: 'Megamix', who: 'Every game · the grand finale', song: 'Alles Op Eén Stoep', color: '#ffd75e', accent: '#ef4a36', twoBtn: true,
  bpm: 120, key: 0,
  prog: [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]],
  drums: { k: 'x...x...', s: '..x...x.', h: 'xxxxxxxx' }, bass: '1.8.5.8.', comp: 'stab',
  mel: [[[0, 12, 2], [2, 16, 2], [4, 19, 3], [7, 16, 1]], [[0, 19, 2], [2, 23, 2], [4, 21, 4]], [[0, 21, 2], [2, 19, 2], [4, 16, 2], [6, 12, 2]], [[0, 14, 3], [3, 16, 1], [4, 19, 4]]],
  // the song builds: a key lift, a busier groove, then the big finale in a new key
  sections: [
    { bar: 18, key: 2, comp: 'arp', drums: { k: 'x...x.x.', s: '..x...x.', h: 'xxxxxxxx', c: '......x.' } },
    { bar: 34, key: 4, comp: 'stab', bass: '18181818', drums: { k: 'x.x.x.x.', s: '..x...x.', h: 'xxxxxxxx', c: '......x.' } },
    { bar: 50, key: 5, comp: 'pad', bass: '1...5...', mel: null, drums: { k: 'x.......', s: '......xx', h: 'x.x.x.x.' } },
    { bar: 51, key: 5, comp: 'stab', bass: '18181818', lead: 'sawtooth', leadVol: .055, prog: [[0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14]],
      drums: { k: 'x.x.x.x.', s: '..x...x.', h: 'xxxxxxxx', c: '....x..x' },
      mel: [[[0, 19, 3], [3, 19, 1], [4, 24, 4]], [[0, 24, 2], [2, 23, 2], [4, 21, 2], [6, 19, 2]], [[0, 17, 3], [3, 19, 1], [4, 21, 4]], [[0, 23, 2], [2, 24, 2], [4, 26, 4]]] },
  ],
  how: 'Every minigame in the game, one after another on one long song, ending with the <b>Grote Finale</b> on stage with the whole cast.<br>Each scene keeps its own cues. In <b>Torenklimmer, Verhaal & Zwaard and Robot Repeat</b> use <b>A</b> and <b>B</b> like normal; in every other scene <b>either button</b> works.',
  verdict: ['Every game, every friend, every beat. The whole street is chanting your name, and Maat is smiling.',
    'A huge show with a few wobbles. The crowd still went wild.',
    'It’s a long one. Reset your ears at every scene change, and save some energy for the finale.'],
  segs: [
    { src: 'stoep', len: 8, ev: [[3, 'slow'], [7, 'fast']] },
    { src: 'gras', len: 8, ev: [[3, 'vlinder'], [6, 'bij'], [7, 'bij']] },
    { src: 'fiets', len: 8, ev: [[2, 'eend'], [4, 'eend'], [7, 'oma']] },
    { src: 'muur', len: 8, ev: [[2, 'bal'], [4, 'bal'], [7, 'appel']] },
    { src: 'pluk', len: 8, k: 'wortel', ev: [[2], [3], [4], [7, 'reus']] },
    { src: 'zurm', len: 8, k: 'blad', ev: [[1.5], [3.5], [5.5], [7.5]] },
    { src: 'klomp', len: 8, ev: [[4, 'klomp'], [5, 'klomp'], [6, 'klomp']] },
    { src: 'raket', len: 8, ev: [[2, 'bout'], [3, 'bout'], [6, 'paneel'], [6.5, 'paneel2']] },
    { src: 'ssst', len: 8, ev: [[2, 'hoest'], [4, 'giechel'], [7, 'snurk']] },
    { src: 'skelet', len: 8, ev: [[2, 'pose'], [4, 'pose'], [7, 'hoofd']] },
    { src: 'putdeksel', len: 8, ev: [[2, 'blub', { d: 0 }], [3, 'blub', { d: 2 }], [4, 'blub', { d: 1 }], [7, 'traag', { d: 1 }]] },
    { src: 'toon', len: 8, ev: [[2, 'klap'], [3, 'klap'], [6, 'traag']] },
    { src: 'tuin', len: 8, ev: [[2, 'knop', { p: 0 }], [4, 'snel', { p: 2 }], [7, 'henk', { p: 4 }]] },
    { src: 'meloen', len: 8, ev: [[2, 'meloen'], [4, 'kokos'], [7, 'ananas']] },
    { src: 'freak', len: 8, ev: [[2, 'pose', { f: 0 }], [4, 'pose', { f: 2 }], [7, 'gek', { f: 4 }]] },
    { src: 'bouw', len: 8, ev: [[4, 'rij0'], [4.5, 'rij'], [5, 'rij'], [5.5, 'rij'], [6, 'rij'], [6.5, 'rij']] },
    { src: 'droom', len: 8, ev: [[3, 'bel'], [5, 'schaap'], [7, 'ster']] },
    { src: 'huil', len: 8, ev: [[3, 'huil'], [7, 'maan']] },
    { src: 'kegel', len: 8, ev: [[3, 'rol'], [7, 'snel']] },
    { src: 'toren', len: 8, ev: [[2, 'links'], [3, 'rechts'], [4, 'links'], [7, 'sprong']] },
    { src: 'hoog', len: 8, ev: [[3, 'kort', { start: true }], [4, 'kort'], [6, 'hoog']] },
    { src: 'pannenkoek', len: 8, ev: [[3, 'flip', { big: true }], [5, 'vang', { big: true }]] },
    { src: 'verhaal', len: 8, ev: [[2, 'blad'], [4, 'draak'], [5, 'blad'], [7, 'draak']] },
    { src: 'robot', len: 8, ev: [[4, 'tik'], [5, 'boem'], [6, 'tik'], [7, 'boem']] },
    { src: 'baas', len: 8, ev: [[2, 'pew'], [3, 'pew'], [6, 'straal']] },
    { src: 'finale', len: 36, ev: [[3, 'hey'], [5, 'hey'], [7, 'hey'], [11, 'tel'], [13, 'hey'], [14, 'hey'], [15, 'hey'], [19, 'tel'], [21, 'hey'], [22, 'hey'], [26, 'tel'], [31, 'slot']] },
  ],
}));

// ---------- story: before the Megamix, and the grand ending ----------
Object.assign(SCENES, {
  megamix: [
    { cap: 'Toon is gone, Sinterklaas is home, and the street has never been this full of friends. Joep has one more idea: the biggest concert the stoep has ever seen.', draw(t) {
      bgStoep('#ffd6e4', '#fff3db'); bro('joep', { x: 480, y: 330, arms: Math.abs(Math.sin(t * 3)), mouth: 'wow' });
      bro('cas', { x: 300, y: 340, eyes: 'sleepy' }); bro('luur', { x: 650, y: 345, s: .9, eyes: 'big', mouth: 'o' }); bubble('Iedereen doet mee!', 480, 150, 26); } },
    { cap: 'Every game they ever played, back to back, on one long song. And somewhere above the rooftops, someone with wings is getting ready to come and watch.', draw(t) {
      sky('#ffc4e1', '#fff3db'); rr(-10, 400, W + 20, 150, 0, '#7f3b2c', 4); rr(20, 382, 920, 30, 8, '#c8742c', 4);
      [['pieter', 160], ['annemiek', 300], ['pluk', 420], ['skelet', 560], ['rolf', 700], ['fred', 820]].forEach(([n, x], i) => actor(n, { x, y: 340, s: .8, bob: Math.abs(Math.sin(t * 3 + i)) * 10 }));
      ART.feather(480 + Math.sin(t) * 40, 90 + Math.sin(t * .7) * 10, .5); } },
  ],
  ending3: [
    { cap: 'The last firework fades. The whole street is still cheering. Maat met Zinkfosfaat lands on the stoep, for the first time ever where everyone can see.', draw(t) {
      sky('#ffe9b0', '#fff3db'); bgStoep('#ffe9b0', '#fff3db'); actor('maat', { x: 480, y: 220 + Math.sin(t * 2) * 6 });
      bro('joep', { x: 300, y: 340, mouth: 'wow', eyes: 'big' }); bro('cas', { x: 200, y: 345, eyes: 'open', mouth: 'wow' }); bro('luur', { x: 660, y: 350, s: .9, eyes: 'big', mouth: 'wow' }); } },
    { cap: '“Goed gedaan, jongens,” says Maat. “I was always watching. This time I just wanted a better seat.” Then Cas falls asleep on the stoep, and that is the end. Bedankt voor het spelen!', draw(t) {
      bgStoep('#ffd6a8', '#fff3db'); actor('maat', { x: 600, y: 230 }); bro('cas', { x: 360, y: 360, rot: .5, eyes: 'sleepy' }); bro('joep', { x: 220, y: 330, arms: 1, mouth: 'grin' });
      txt('z z z', 400, 250 - (t * 10) % 16, 22, INK, 'center', HAND, 400); bubble('Goed gedaan, jongens.', 600, 110, 24); } },
  ],
});
Object.assign(STAR, { megamix: 'joep' });
