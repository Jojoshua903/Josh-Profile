'use strict';
// ===== Level 7: Skelet Shuffle (Skelet met Pret) =====
(() => {
  const SX = 480, SY = 300, BONE = '#fbf7ee';
  function skeleton(x, y, o) {
    const { pose = 0, head = null, fall = 0, step = 0, grin = 1 } = o;
    g.save(); g.translate(x, y);
    if (fall > 0) {   // a sad little pile of bones
      [[-40, 120, .3], [-10, 128, -.4], [20, 118, .9], [40, 126, -.2], [0, 110, 1.4]].forEach(([bx, by, r]) => { g.save(); g.translate(bx, by); g.rotate(r); rr(-22, -5, 44, 10, 5, BONE, 3); g.restore(); });
      circ(-60, 112, 26, BONE, 4); circ(-69, 108, 6, INK, 0); circ(-53, 108, 6, INK, 0);
      g.restore(); return;
    }
    ln(-14, 60, -20 - step * 10, 130, 7); ln(14, 60, 20 - step * 10, 130, 7);
    ell(-24 - step * 10, 134, 14, 6, BONE, 3); ell(24 - step * 10, 134, 14, 6, BONE, 3);
    ell(0, 56, 22, 10, BONE, 3);
    ln(0, -10, 0, 50, 6);
    for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(0, 4 + i * 11, 26 - i * 3, 6, 0, Math.PI * .1, Math.PI * .9); g.lineWidth = 5; g.strokeStyle = INK; g.stroke(); }
    [[-1], [1]].forEach(([sd]) => {
      const ex = sd * (34 + pose * 10), ey = 10 - pose * 50, hx = sd * (40 + pose * 20), hy = 40 - pose * 110;
      ln(sd * 16, -6, ex, ey, 6); ln(ex, ey, hx, hy, 6); circ(hx, hy, 7, BONE, 3);
    });
    const hp = head || [0, -42];
    g.save(); g.translate(hp[0], hp[1]); g.rotate(head ? hp[2] || 0 : 0);
    circ(0, 0, 30, BONE, 4); rr(-16, 16, 32, 16, 6, BONE, 4);
    ell(-11, -2, 8, 9, INK, 0); ell(11, -2, 8, 9, INK, 0); poly([[0, 8], [-4, 14], [4, 14]], INK, 0);
    for (let i = -2; i <= 2; i++) ln(i * 6, 18, i * 6, 30, 2);
    if (grin) { circ(-11, -2, 2.5, '#f6b92b', 0); circ(11, -2, 2.5, '#f6b92b', 0); }
    rr(-26, -34, 52, 10, 4, INK, 0); rr(-16, -58, 32, 26, 4, INK, 0);    // little top hat
    rr(-16, -42, 32, 6, 0, '#ef4a36', 0);
    g.restore();
    g.restore();
  }
  ART.skeleton = skeleton;
  LEVELS.push({
    id: 'skelet', title: 'Skelet Shuffle', who: 'Skelet met Pret', song: 'Botten Boogie', color: '#fbf7ee', accent: '#6a4a8a',
    bpm: 132, beats: 64, key: 0, swing: .3,
    prog: [[0, 3, 7], [5, 8, 12], [7, 11, 14], [0, 3, 7]],
    drums: { k: 'x...x...', s: '..x...x.', h: 'x.xxx.xx' }, bass: '1.3.5.8.', comp: 'stab',
    mel: [[[0, 12, 1], [1, 15, 1], [2, 19, 2], [4, 18, 1], [5, 19, 1], [6, 15, 2]], [[0, 17, 2], [2, 20, 2], [4, 17, 2], [6, 12, 2]],
          [[0, 14, 1], [1, 17, 1], [2, 19, 2], [4, 23, 2], [6, 19, 2]], [[0, 24, 2], [2, 19, 2], [4, 15, 4]]],
    how: "Skelet is not exactly one of the good guys, but he sure can dance. When his bones go <b>\"tik-tik\"</b>, <b>strike the pose</b> on the next beat.<br>When his <b>head pops off</b> (\"boing!\"), it lands back on two beats later. Press to catch it.",
    verdict: ['Skelet bows so low his skull rolls off. He will absolutely take credit for your timing.',
      'A decent boogie. Skelet only lost a few small bones, nothing important.',
      'Pose one beat after the "tik-tik". The head takes two beats to come down.'],
    chart() {
      const c = [], add = (bar, off, k = 'pose') => c.push({ b: bar * 4 + off, k });
      add(1, 3); add(2, 3); add(3, 1); add(3, 3); add(4, 3, 'hoofd');
      add(5, 1); add(5, 3); add(6, 3, 'hoofd'); add(7, 1); add(7, 3); add(8, 3, 'hoofd');
      add(9, 1); add(9, 3); add(10, 1); add(10, 3, 'hoofd'); add(11, 1); add(11, 3);
      add(12, 1, 'hoofd'); add(12, 3, 'hoofd'); add(13, 1); add(13, 3); add(14, 3, 'hoofd');
      add(15, 3, 'grand');
      return c;
    },
    cue(e, t, spb) {
      const tik = d => { A.tone(t - d * spb, 1400, .03, 'square', .08); A.nz(t - d * spb, .03, .2, 'bandpass', 3500, 4); };
      if (e.k === 'pose') { tik(1); tik(.5); }
      else if (e.k === 'grand') { tik(3); tik(2); tik(1); tik(.5); }
      else A.tone(t - 2 * spb, fq(0), .3, 'triangle', .14, fq(24));
    },
    hit(t, res, e) {
      A.clap(t, .35); A.tone(t, fq(e.k === 'hoofd' ? 7 : 12), .08, 'square', .08);
      if (e.k === 'grand') { A.crash(t, .3); A.voice(t, fq(7), .4, 1, 'a', fq(12)); }
    },
    miss(t) { [0, .05, .1, .16].forEach((d, i) => A.tone(t + d, 900 - i * 150, .04, 'square', .07)); },
    draw(P) {
      sky('#fbe3ef', '#f8c9a8');
      for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(i * 120 - 60, 0); g.lineTo(i * 120 - 30, 0); g.lineTo(SX + (i - 4) * 30, 420); paint('rgba(255,255,255,.25)', 0); }
      rr(-10, -10, 120, 450, 0, '#c43b3b', 4); rr(W - 110, -10, 120, 450, 0, '#c43b3b', 4);
      for (let x = 20; x < 110; x += 30) { ln(x, 0, x, 440, 3, 'rgba(33,28,52,.3)'); ln(W - x, 0, W - x, 440, 3, 'rgba(33,28,52,.3)'); }
      rr(-10, 430, W + 20, 120, 0, '#9b6b43', 4);
      ell(SX, 440, 150, 22, 'rgba(255,240,180,.8)', 0);
      let pose = 0, head = null, fall = 0, say = null, bright = 0;
      for (const e of P.ev) {
        if (hitOk(e) && P.b - e.hb >= 0 && P.b - e.hb < .6) { pose = e.k === 'hoofd' ? .3 : 1 - (P.b - e.hb); say = e.k === 'grand' ? 'TA-DAAA!' : e.k === 'pose' ? ['Pret!', 'Kijk mij!', 'Yeah!'][Math.floor(e.b) % 3] : null; bright = 1; }
        if (e.res === 'miss' && P.b >= e.b && P.b - e.b < 1.2) fall = 1;
        if (e.k === 'hoofd' && !e.res) {
          const k = (P.b - (e.b - 2)) / 2;
          if (k >= 0) head = [lerp(0, 0, k) + Math.sin(k * Math.PI) * 90, -42 - hop(Math.min(k, 1)) * 230, k * 9];
        }
      }
      if (P.ev.some(e => e.k === 'grand' && hitOk(e) && P.b > e.hb)) { pose = 1; say = 'TA-DAAA!'; }
      // the "tik-tik" you hear is now also something you see: his bones rattle
      const TIKS = { pose: [1, .5], grand: [3, 2, 1, .5] };
      let rattle = 0;
      P.ev.forEach(e => (TIKS[e.k] || []).forEach(d => { const k = P.b - (e.b - d); if (!e.res && k >= 0 && k < .22) rattle = 1; }));
      const step = Math.sin(P.b * Math.PI), shake = rattle ? Math.sin(P.b * 90) * 6 : 0;
      skeleton(SX + shake, SY - Math.abs(step) * 8, { pose, head, fall, step, grin: bright });
      if (rattle) { txt('tik!', SX - 120, SY + 20, 26, INK, 'center', HAND, 400); txt('tik!', SX + 120, SY - 10, 22, INK, 'center', HAND, 400); }
      P.ev.forEach(e => cueRing(P, e, SX, e.k === 'hoofd' ? SY - 42 : SY + 20, e.k === 'hoofd' ? 2 : e.k === 'grand' ? 3 : 1, e.k === 'hoofd' ? '#4d7cf0' : '#ef4a36', 80));
      if (say) bubble(say, SX + 140, SY - 120, 30);
      if (fall) bubble('Oei, mijn botten!', SX + 150, SY - 40, 24);
      // the brothers watching from the front row
      const bp = Math.abs(Math.sin(P.b * Math.PI));
      bro('cas', { x: 200, y: 520, s: .9, bob: bp * 4, arms: bright ? .7 : 0, eyes: 'sleepy' });
      bro('joep', { x: 760, y: 515, s: .95, bob: bp * 10, arms: bright ? 1 : .2, mouth: 'grin' });
      bro('luur', { x: 860, y: 525, s: .8, bob: bp * 6, eyes: 'big', mouth: fall ? 'wow' : 'o', look: -1 });
    },
  });
})();

// ===== Level 8 (Boss): Toon de Demoon, with Maat met Zinkfosfaat =====
(() => {
  const SHIELD = [270, 300], TX = 760, TY = 250;
  const WIND = { klap: 1, traag: 2, licht: 4 };
  function toon(P, hurt, gone) {
    if (gone >= 1) return;
    const s = 1 - gone, wob = Math.sin(P.b * Math.PI) * 6;
    g.save(); g.translate(TX + gone * 300, TY - gone * 200); g.rotate(gone * 8); g.scale(s, s);
    for (let i = 0; i < 6; i++) {   // idle tentacles under the body
      const a = -.2 + i * .25, ex = Math.cos(a) * 120 + Math.sin(P.b * 2 + i) * 14, ey = 130 + Math.sin(P.b * 3 + i) * 12;
      g.beginPath(); g.moveTo(-60 + i * 24, 40); g.quadraticCurveTo(-60 + i * 24 + ex * .3, ey, -40 + i * 30 + ex * .2, ey + 40);
      g.lineWidth = 26; g.strokeStyle = INK; g.lineCap = 'round'; g.stroke(); g.lineWidth = 18; g.strokeStyle = '#e8362f'; g.stroke();
    }
    poly([[-60, -70], [-80, -140], [-30, -90]], '#ffd75e', 4); poly([[60, -70], [80, -140], [30, -90]], '#ffd75e', 4);
    ell(0, -10 + wob, 110, 100, hurt ? '#ff7a6a' : '#e8362f', 5);
    [[-38, -30], [38, -30]].forEach(([ex, ey]) => { circ(ex, ey + wob, 22, '#fff8d0', 4); circ(ex - 4, ey + 4 + wob, 9, INK, 0); });
    ln(-62, -60 + wob, -18, -46 + wob, 7); ln(62, -60 + wob, 18, -46 + wob, 7);
    g.beginPath(); g.arc(0, 40 + wob, 34, hurt ? Math.PI * 1.15 : .15, hurt ? -Math.PI * .15 : Math.PI - .15); g.lineWidth = 6; g.strokeStyle = INK; g.stroke();
    g.restore();
  }
  function maat(x, y, glow) {
    g.save(); g.translate(x, y);
    const gr = g.createRadialGradient(0, 0, 10, 0, 0, 160); gr.addColorStop(0, `rgba(255,248,200,${.9 * glow})`); gr.addColorStop(1, 'rgba(255,248,200,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 160, 0, 7); g.fill();
    ell(-70, 0, 60, 26, '#fff', 4, -.5); ell(70, 0, 60, 26, '#fff', 4, .5); ell(-66, 20, 46, 18, '#fff', 4, -.3); ell(66, 20, 46, 18, '#fff', 4, .3);
    g.restore();
    kid({ x, y: y + 20, col: '#fffbea', skin: '#f2cfae', hat: 'none', arms: .9, eyes: 'happy', mouth: 'smile', legs: false });
    ell(x, y - 70, 32, 9, null, 0); g.lineWidth = 6; g.strokeStyle = '#f6b92b'; g.stroke();
  }
  ART.toon = toon; ART.maat = maat; ART.TOON_AT = [TX, TY];
  LEVELS.push({
    id: 'toon', title: 'Toon de Demoon', who: 'Boss · Maat met Zinkfosfaat', song: 'Tentakel Tango', color: '#e8362f', accent: '#ffd75e',
    bpm: 140, beats: 68, key: 2,
    prog: [[0, 3, 7], [-2, 2, 5], [-4, 0, 3], [-5, -1, 2]],
    drums: { k: 'x..x..x.', s: '..x...x.', h: 'xxxxxxxx' }, bass: '18181818', comp: 'arp', lead: 'square',
    mel: [[[0, 12, 2], [2, 10, 1], [3, 12, 1], [4, 15, 2], [6, 14, 2]], [[0, 10, 2], [2, 9, 2], [4, 7, 4]],
          [[0, 8, 2], [2, 10, 2], [4, 12, 4]], [[0, 13, 3], [3, 9, 1], [4, 13, 4]]],
    how: 'Toon de Demoon wants the stoep. Joep holds up a bin lid. <b>Block</b> each tentacle as it slams down.<br><b>Blub</b> = slam one beat later. A <b>deep growl, twice</b> = a big, slow slam two beats later.<br>And if you hear bells… someone powerful is coming. Press on the beat after them.',
    verdict: ['Toon is back in the sea, sulking. Maat met Zinkfosfaat nods once, which is a lot coming from a guardian angel.',
      'The boys are safe, a little dented. Maat had your back the whole time.',
      'Block on the slam, not the blub. Growl-growl means wait two beats. Maat believes in you.'],
    chart() {
      const c = [], add = (bar, offs, k = 'klap') => offs.forEach(o => c.push({ b: bar * 4 + o, k }));
      add(1, [1, 3]); add(2, [1, 3]); add(3, [1, 2, 3]); add(4, [2], 'traag');
      add(5, [1, 3]); add(6, [1, 1.5, 3]); add(7, [2], 'traag'); add(8, [1, 2, 3, 3.5]);
      add(9, [1, 3, 3.5]); add(10, [2], 'traag'); add(11, [1, 2, 3]); add(12, [1, 2, 3]);
      add(13, [2], 'traag'); add(14, [1, 3]); add(16, [0], 'licht');
      return c;
    },
    cue(e, t, spb) {
      if (e.k === 'klap') { A.tone(t - spb, 90, .18, 'sine', .35, 240); A.nz(t - spb, .1, .1, 'lowpass', 500); }
      else if (e.k === 'traag') [2, 1].forEach(d => A.tone(t - d * spb, 62, .3, 'sawtooth', .16, 90, 500));
      else {
        [2, 6, 9, 14].forEach(n => A.voice(t - 4 * spb, fq(n), 2.2 * spb, .35, 'a'));
        [2, 1].forEach(d => A.tone(t - d * spb, fq(26), .6, 'sine', .16));
      }
    },
    hit(t, res, e) {
      if (e.k === 'licht') { A.crash(t, .35); A.kick(t); [2, 6, 9, 14, 18].forEach(n => A.tone(t, fq(n + 12), 1.6, 'triangle', .06)); A.nz(t, 1.2, .25, 'bandpass', 400, 1, 6000); return; }
      A.kick(t, .6); A.tone(t, fq(e.k === 'traag' ? 14 : 21), .15, 'square', .07); A.nz(t, .12, .3, 'bandpass', 3000, 2);
    },
    miss(t) { A.kick(t); A.tone(t, 180, .3, 'sawtooth', .08, 60, 800); },
    draw(P) {
      const fin = P.ev.find(e => e.k === 'licht'), won = fin && hitOk(fin), wonK = won ? P.b - fin.hb : 0;
      sky(won ? '#fff1c4' : '#ffc9bd', won ? '#ffe4a8' : '#f59ab5'); dots('rgba(255,255,255,.25)', 22);
      rr(-10, 410, W + 20, 140, 0, '#d8c6a6', 4); rr(-10, 400, W + 20, 14, 4, '#b8a586', 4);
      const blocked = P.ev.filter(e => hitOk(e) && e.k !== 'licht').length, total = P.ev.length - 1;
      rr(620, 24, 260, 18, 9, '#fff', 3); rr(620, 24, 260 * (1 - blocked / total) * (won ? 0 : 1), 18, 9, '#e8362f', 0); rr(620, 24, 260, 18, 9, null, 3);
      txt('TOON', 610, 34, 18, INK, 'right');
      let block = 0, ouch = 0, hurt = 0;
      for (const e of P.ev) {
        if (hitOk(e) && P.b - e.hb >= 0 && P.b - e.hb < .4) { block = 1; hurt = 1; }
        if (e.res === 'miss' && P.b >= e.b && P.b - e.b < 1) ouch = 1;
      }
      toon(P, hurt, won ? clamp(wonK / 2.5, 0, 1) : 0);
      // striking tentacles
      for (const e of P.ev) {
        if (e.k === 'licht') continue;
        const w = WIND[e.k], k = (P.b - (e.b - w)) / w;
        let after = hitOk(e) ? P.b - e.hb : e.res === 'miss' ? P.b - e.b : -1;
        if (k < 0 || after > .6) continue;
        let tipX, tipY;
        if (after >= 0) { const r = ease(after / .6); tipX = lerp(SHIELD[0] + 40, TX - 80, r); tipY = lerp(SHIELD[1], TY + 60, r) - hop(r) * 80; }
        else if (k < .75) { const r = k / .75; tipX = lerp(TX - 100, SHIELD[0] + 180, r); tipY = lerp(TY + 60, 60, r); }
        else { const r = (k - .75) / .25; tipX = lerp(SHIELD[0] + 180, SHIELD[0] + 40, r * r); tipY = lerp(60, SHIELD[1], r * r); }
        const thick = e.k === 'traag' ? 34 : 24;
        g.beginPath(); g.moveTo(TX - 70, TY + 50); g.quadraticCurveTo((TX + tipX) / 2, Math.min(tipY, TY) - 120, tipX, tipY);
        g.lineCap = 'round'; g.lineWidth = thick + 8; g.strokeStyle = INK; g.stroke(); g.lineWidth = thick; g.strokeStyle = '#e8362f'; g.stroke();
        for (let i = 1; i < 4; i++) circ(lerp(TX - 70, tipX, i / 4), lerp(TY + 30, tipY, i / 4) - 30, 5, '#ffd0c8', 2);
      }
      // rings on the bin lid for each slam, and on Maat for the final blast
      P.ev.forEach(e => e.k === 'licht' ? cueRing(P, e, 430, 150, 2, '#f6b92b', 120) : cueRing(P, e, SHIELD[0], SHIELD[1] - 40, WIND[e.k], e.k === 'traag' ? '#8e44ad' : '#e8362f', 70));
      // the brothers on their stoep
      const bp = Math.abs(Math.sin(P.b * Math.PI));
      bro('cas', { x: 130, y: 335, s: .95, bob: bp * 3, eyes: ouch ? 'x' : won ? 'happy' : 'open', mouth: ouch ? 'sad' : won ? 'grin' : 'flat', arms: won ? 1 : 0 });
      bro('luur', { x: 60, y: 345, s: .85, bob: bp * 5, eyes: won ? 'happy' : 'big', mouth: ouch ? 'wow' : won ? 'grin' : 'o', arms: won ? 1 : .1 });
      bro('joep', { x: 220, y: 330, bob: bp * 6, ar: .7 + block * .3, al: won ? 1 : .1, eyes: ouch ? 'x' : 'open', mouth: ouch ? 'sad' : 'grin', rot: ouch ? -.25 : 0 });
      g.save(); g.translate(SHIELD[0], SHIELD[1] - 40 + (block ? -8 : 0)); g.rotate(block ? -.3 : 0);
      ell(0, 0, 18, 46, '#b9c2cf', 5); ell(0, 0, 6, 18, '#9aa3b5', 3); g.restore();
      if (block) txt('BONK!', SHIELD[0] + 80, SHIELD[1] - 130, 30, INK);
      if (ouch) bubble('Au!', 220, 180, 26);
      // Maat met Zinkfosfaat descends for the last beats
      if (fin) {
        const arrive = clamp((P.b - (fin.b - 6)) / 4, 0, 1);
        if (arrive > 0) {
          const my = lerp(-140, 150, ease(arrive)), mx = 430;
          if (won && wonK < 2.5) {
            g.save(); g.globalAlpha = clamp(1 - wonK / 2.5, 0, 1);
            poly([[mx, my], [TX - 40, TY - 60], [TX + 40, TY + 60]], 'rgba(255,230,120,.85)', 0); g.restore();
          }
          maat(mx, my + Math.sin(P.b * 2) * 6, arrive);
          if (!won && fin.res !== 'miss' && P.b > fin.b - 3) bubble('Niet mijn jongens.', mx, my - 140, 26);
          if (won) bubble(wonK < 2 ? 'ZINKFOSFAAT!' : 'Opgeruimd.', mx, my - 140, 30);
          if (won && wonK < 2.5) txt('NEEEE!', TX + 60, TY - 160, 36, '#e8362f');
        }
      }
    },
  });
})();
