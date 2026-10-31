'use strict';
// ===== Gieter Groei (Pieter met een Gieter) =====
(() => {
  const POTS = [180, 330, 480, 630, 780], LEAD = { knop: 1, henk: 2, snel: 1 };
  LEVELS.push({
    id: 'tuin', title: 'Gieter Groei', who: 'Pieter met een Gieter', song: 'Groei Maar Door', color: '#9fdc7c', accent: '#4d7cf0',
    bpm: 100, beats: 56, key: 5, swing: .25,
    prog: [[0, 4, 7], [2, 5, 9], [-3, 0, 4], [-5, -1, 2]],
    drums: { k: 'x..x....', s: '....x...', h: 'x.x.x.x.' }, bass: '1..5.1..', comp: 'arp', lead: 'sine', leadVol: .09,
    mel: [[[0, 12, 2], [2, 14, 1], [3, 16, 1], [4, 19, 4]], [[0, 17, 2], [2, 14, 2], [4, 10, 4]], [[0, 12, 2], [2, 9, 2], [4, 12, 4]], [[0, 14, 3], [3, 11, 1], [4, 7, 4]]],
    how: 'Pieter’s seeds pop up all over the garden. <b>Water them</b> the moment they’re ready.<br>A bud goes <b>"plop"</b>: water one beat later. Two quick high <b>"plip-plip"</b>s: water right after the second one. Two slow plops mean <b>Henk the sunflower</b>: water on the third beat.',
    verdict: ['The whole garden is in bloom, and Henk is taller than Janet. Pieter is speechless.', 'Mostly flowers, a few droopy ones. Pieter is talking to them right now.', 'Plop = one beat later. Plip-plip = right after the second plip. Plop-plop = Henk on the third.'],
    chart() {
      const c = [], add = (bar, off, k) => c.push({ b: bar * 4 + off, k, p: c.length % 5 });
      add(1, 1, 'knop'); add(1, 3, 'knop'); add(2, 1, 'knop'); add(2, 3, 'knop'); add(3, 3, 'henk');
      // every warning starts after the previous press, so there's always time to hear it
      add(4, 1, 'knop'); add(4, 3, 'snel'); add(5, 3, 'henk');
      add(6, 1, 'snel'); add(6, 3, 'knop'); add(7, 3, 'henk');
      add(8, 1, 'knop'); add(8, 2, 'knop'); add(8, 3, 'knop'); add(9, 1, 'snel'); add(9, 3, 'snel');
      add(10, 3, 'henk'); add(11, 1, 'snel'); add(11, 3, 'knop'); add(12, 3, 'henk');
      return c;
    },
    cue(e, t, spb) {
      if (e.k === 'knop') A.tone(t - spb, fq(7), .08, 'sine', .25, fq(14));
      else if (e.k === 'snel') [1, .5].forEach(d => A.tone(t - d * spb, fq(19), .05, 'sine', .2, fq(24)));
      else [2, 1].forEach(d => A.tone(t - d * spb, fq(0), .12, 'sine', .3, fq(7)));
    },
    hit(t, res, e) { A.nz(t, .25, .2, 'highpass', 4000, 1, 8000); A.tone(t, fq(e.k === 'henk' ? 24 : 19), .2, 'triangle', .07); },
    miss(t) { A.tone(t, fq(7), .4, 'triangle', .08, fq(0)); },
    draw(P) {
      sky('#cdeefb', '#f3fbe6'); circ(820, 90, 48, '#ffe066', 4);
      rr(-10, 380, W + 20, 170, 0, '#8a5a3b', 4); for (let x = 0; x < W; x += 40) ln(x, 400, x + 20, 400, 3, '#6e452c');
      const plant = POTS.map(() => ({ h: 0, bloom: 0, wilt: 0, henk: 0 }));
      const potOf = e => e.p ?? Math.round(e.b * 2) % 5;
      // stay at the pot being watered; only walk on once the pour is finished
      const pouring = P.ev.find(e => hitOk(e) && P.b - e.hb >= 0 && P.b - e.hb < .45);
      const next = P.ev.find(e => !e.res && e.b - P.b > -.15);
      const prev = P.ev.filter(e => e.res && P.b >= (e.hb ?? e.b)).pop();
      const target = pouring ? potOf(pouring) : next ? potOf(next) : prev ? potOf(prev) : 0, pour = pouring ? 1 - (P.b - pouring.hb) / .45 : 0;
      if (!DRAW_TUIN.x) DRAW_TUIN.x = POTS[0];
      DRAW_TUIN.x += (POTS[target] - DRAW_TUIN.x) * (pouring ? 0 : .25);
      for (const e of P.ev) {
        const p = plant[potOf(e)], L = LEAD[e.k], k = (P.b - (e.b - L)) / L;
        if (hitOk(e) && P.b >= e.hb) { p.h = Math.max(p.h, e.k === 'henk' ? 1 : .55); p.bloom = 1; p.henk = p.henk || e.k === 'henk'; }
        else if (e.res === 'miss' && P.b >= e.b) { p.wilt = 1; p.h = Math.max(p.h, .3); }
        else if (!e.res && k >= 0) p.h = Math.max(p.h, .15 + ease(k) * .15);
      }
      POTS.forEach((x, i) => {
        const p = plant[i], h = p.h * 220;
        if (h > 2) {
          g.save(); g.translate(x, 380); g.rotate(p.wilt && !p.bloom ? .5 : Math.sin(P.b * Math.PI / 2 + i) * .04);
          ln(0, 0, 0, -h, 6, '#3d8a3a'); ell(-14, -h * .4, 14, 6, '#5bb04a', 3, -.5); ell(14, -h * .6, 14, 6, '#5bb04a', 3, .5);
          if (p.bloom) {
            const c = p.henk ? '#f6b92b' : ['#ef4a36', '#f59ab5', '#8e44ad', '#fff'][i % 4], r = p.henk ? 34 : 16;
            for (let a = 0; a < 8; a++) ell(Math.cos(a * Math.PI / 4) * r, -h + Math.sin(a * Math.PI / 4) * r, r * .55, r * .3, c, 2, a * Math.PI / 4);
            circ(0, -h, r * .55, p.henk ? '#7a4a2a' : '#f6b92b', 3);
            if (p.henk) { circ(-8, -h - 4, 3, INK, 0); circ(8, -h - 4, 3, INK, 0); }
          } else circ(0, -h, 7, '#5bb04a', 3);
          g.restore();
        }
        rr(x - 30, 370, 60, 40, 6, '#c96a4a', 4);
      });
      // which pot is next: arrow + closing ring on the bud
      if (next && !pouring) {
        const nx = POTS[potOf(next)], ny = 380 - Math.max(plant[potOf(next)].h * 220, 20);
        poly([[nx - 12, 330 - 110], [nx + 12, 330 - 110], [nx, 330 - 92]], '#4d7cf0', 3);
        cueRing(P, next, nx, ny, LEAD[next.k], next.k === 'henk' ? '#f6b92b' : '#4d7cf0');
      }
      // Pieter stands so his can's spout is right above the target pot
      const SPOUT = 95, px = DRAW_TUIN.x - SPOUT, tilt = pour > 0;
      actor('pieter', { x: px, y: 300, ar: tilt ? .9 : .5, al: .2, eyes: 'happy', mouth: tilt ? 'wow' : 'smile', bob: tilt ? 0 : Math.abs(Math.sin(P.b * Math.PI)) * 4 });
      if (tilt) {
        const sx = px + SPOUT, sy = 238, ty = 380 - Math.max(plant[target].h * 220, 20);
        for (let i = 0; i < 7; i++) { const y0 = lerp(sy, ty, i / 7), y1 = lerp(sy, ty, (i + .6) / 7); ln(sx + Math.sin(i + P.b * 20) * 2, y0, sx + Math.sin(i + P.b * 20) * 2, y1, 4, '#4d7cf0'); }
        for (let i = -1; i <= 1; i++) circ(POTS[target] + i * 14, ty + 4, 3, '#8fd3f0', 0);
      }
      if (plant.some(p => p.henk)) bubble('Hoi Henk!', 480, 90, 22);
    },
  });
})();
const DRAW_TUIN = {};

// ===== Meloen Mars (Koen verkoopt Meloen) =====
(() => {
  const AIR = { meloen: 1, kokos: 1, ananas: 2 }, KX = 520;
  LEVELS.push({
    id: 'meloen', title: 'Meloen Mars', who: 'Koen verkoopt Meloen', song: 'Links Rechts Fruit', color: '#7bc96f', accent: '#ef4a36',
    bpm: 116, beats: 60, key: 10,
    prog: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7]],
    drums: { k: 'x...x...', s: 'x.x.xxx.', h: '........' }, bass: '1.5.1.5.', comp: 'stab', lead: 'square',
    mel: [[[0, 7, 1], [1, 7, 1], [2, 12, 2], [4, 7, 1], [5, 12, 1], [6, 16, 2]], [[0, 17, 2], [2, 16, 2], [4, 12, 4]],
          [[0, 14, 1], [1, 14, 1], [2, 19, 2], [4, 17, 2], [6, 14, 2]], [[0, 12, 4], [4, 7, 4]]],
    how: 'Koen runs his fruit stall like an army camp. He tosses fruit in the air and barks an order: <b>chop it</b> when it comes down to his hand.<br><b>"LINKS!"</b> = melon, one beat. <b>"Rechts-rechts!"</b> = coconut, one beat. <b>"HUP… TWEE!"</b> = pineapple, thrown high, two beats.',
    verdict: ['Perfect slices, perfect drill. Koen salutes you, then sells you a melon.', 'Sticky but successful. Koen says the stall has seen worse.', 'Chop when the fruit lands in his hand, not when he shouts.'],
    chart() {
      const c = [], add = (bar, off, k) => c.push({ b: bar * 4 + off, k });
      add(1, 1, 'meloen'); add(1, 3, 'meloen'); add(2, 1, 'meloen'); add(2, 3, 'kokos'); add(3, 2, 'ananas'); add(3, 3, 'meloen');
      add(4, 1, 'meloen'); add(4, 2, 'meloen'); add(4, 3, 'kokos'); add(5, 2, 'ananas'); add(5, 3.5, 'meloen');
      add(6, 1, 'kokos'); add(6, 2, 'meloen'); add(6, 3, 'meloen'); add(7, 2, 'ananas'); add(7, 3, 'kokos');
      add(8, 1, 'meloen'); add(8, 1.5, 'meloen'); add(8, 3, 'kokos'); add(9, 2, 'ananas'); add(9, 3, 'meloen'); add(9, 3.5, 'meloen');
      add(10, 1, 'kokos'); add(10, 2, 'kokos'); add(10, 3, 'meloen'); add(11, 2, 'ananas'); add(11, 3, 'meloen');
      add(12, 1, 'meloen'); add(12, 2, 'kokos'); add(12, 3, 'meloen'); add(13, 2, 'ananas'); add(14, 0, 'meloen'); add(14, 2, 'ananas');
      return c;
    },
    cue(e, t, spb) {
      if (e.k === 'meloen') A.voice(t - spb, fq(0), .14, 1, 'i');
      else if (e.k === 'kokos') { A.voice(t - spb, fq(5), .07, 1, 'e'); A.voice(t - .5 * spb, fq(5), .07, 1, 'e'); }
      else { A.voice(t - 2 * spb, fq(-2), .14, 1, 'u'); A.voice(t - spb, fq(3), .14, 1, 'e'); }
    },
    hit(t, res, e) { A.nz(t, .08, .35, 'bandpass', e.k === 'kokos' ? 3000 : 1200, 2); A.kick(t, .3); if (e.k === 'ananas') A.crash(t, .12); },
    miss(t) { A.kick(t, .5); A.tone(t, 180, .2, 'triangle', .1, 90); },
    draw(P) {
      sky('#fff1c4', '#fde0b0');
      for (let i = 0; i < 10; i++) poly([[i * 100, 60], [i * 100 + 50, 110], [i * 100 + 100, 60]], i % 2 ? '#ef4a36' : '#fff', 3);
      rr(-10, 56, W + 20, 10, 0, '#9b6b43', 3);
      rr(100, 360, 760, 70, 8, '#c8742c', 4); rr(-10, 430, W + 20, 120, 0, '#d8c6a6', 4);
      for (let i = 0; i < 9; i++) circ(150 + i * 30, 352 - (i % 2) * 8, 16, '#3d8a3a', 3);
      for (let i = 0; i < 6; i++) circ(700 + i * 24, 354, 11, '#7a4a2a', 3);
      rr(160, 290, 160, 40, 6, '#fff', 3); txt('MELOEN €2', 240, 310, 18, '#ef4a36');
      let chop = 0, bonk = 0, order = null;
      for (const e of P.ev) {
        const air = AIR[e.k], k = (P.b - (e.b - air)) / air;
        if (!e.res && k >= 0 && k < .35) order = { meloen: 'LINKS!', kokos: 'RECHTS-RECHTS!', ananas: 'HUP… TWEE!' }[e.k];
        if (hitOk(e) && P.b - e.hb >= 0 && P.b - e.hb < .3) chop = 1;
        if (e.res === 'miss' && P.b >= e.b && P.b - e.b < .8) bonk = 1;
        if (k < 0) continue;
        const col = { meloen: '#3d8a3a', kokos: '#7a4a2a', ananas: '#f6b92b' }[e.k], r = { meloen: 22, kokos: 14, ananas: 18 }[e.k];
        if (hitOk(e)) {
          const f = (P.b - e.hb) / .8; if (f > 1) continue;
          [-1, 1].forEach(sd => { g.save(); g.translate(KX + 60 + sd * f * 120, 250 + f * f * 200 - hop(f) * 60); g.rotate(sd * f * 4);
            g.beginPath(); g.arc(0, 0, r, sd < 0 ? Math.PI / 2 : -Math.PI / 2, sd < 0 ? Math.PI * 1.5 : Math.PI / 2); g.closePath(); paint(col, 3);
            if (e.k === 'meloen') { g.beginPath(); g.arc(0, 0, r - 5, sd < 0 ? Math.PI / 2 : -Math.PI / 2, sd < 0 ? Math.PI * 1.5 : Math.PI / 2); paint('#ef4a36', 0); }
            g.restore(); });
        } else if (e.res === 'miss') { const f = P.b - e.b; if (f > 1) continue; // the fruit drops past his hand and bounces off the stall
          const fy = f < .5 ? 250 + (f / .5) ** 2 * 110 : 360 - hop((f - .5) / .5) * 40;
          circ(KX + 60 + f * 70, Math.min(fy, 360) - r, r, col, 3); }
        else { const t = clamp(k, 0, 1.1); const x = lerp(KX - 40, KX + 60, t), y = 250 - hop(t) * (air === 2 ? 240 : 140);
          if (e.k === 'ananas') { ell(x, y, 14, r, col, 3); poly([[x - 8, y - r], [x, y - r - 20], [x + 8, y - r]], '#3d8a3a', 2); } else circ(x, y, r, col, 3); }
        cueRing(P, e, KX + 60, 250, air, e.k === 'ananas' ? '#f6b92b' : '#ef4a36', 60);
      }
      actor('koen', { x: KX, y: 290, ar: chop ? .1 : .9, al: .3, eyes: bonk ? 'x' : 'open', mouth: order ? 'wow' : bonk ? 'sad' : chop ? 'grin' : 'flat' });
      if (order) bubble(order, KX - 140, 140, 24);
      if (chop) txt('HAK!', KX + 120, 200, 28, '#ef4a36');
      if (bonk) bubble('Au, mijn helm!', KX + 140, 140, 22);
      actor('pluk', { x: 860, y: 375, s: .8, eyes: 'happy', mouth: 'grin', arms: chop ? 1 : .2 });
    },
  });
})();

// ===== Annemiek's Freakshow (Annemiek the Freak) =====
(() => {
  const WOB = { pose: [1, .5], gek: [1.5, 1, .5], kus: [2] };
  LEVELS.push({
    id: 'freak', title: 'Freakshow', who: 'Annemiek the Freak', song: 'Raar Is Leuk', color: '#c77dff', accent: '#f59ab5',
    bpm: 104, beats: 60, key: 4, swing: .3,
    prog: [[0, 3, 7], [5, 8, 12], [7, 11, 14], [0, 3, 7]],
    drums: { k: 'x..x..x.', s: '..x...x.', h: 'xxxxxxxx', c: '......x.' }, bass: '1.8.3.5.', comp: 'stab', lead: 'sawtooth', leadVol: .04,
    mel: [[[0, 12, 1], [1, 15, 1], [2, 12, 1], [3, 19, 1], [4, 17, 2], [6, 15, 2]], [[0, 17, 2], [2, 20, 1], [3, 17, 1], [4, 12, 4]],
          [[0, 14, 1], [1, 18, 1], [2, 21, 2], [4, 19, 2], [6, 14, 2]], [[0, 15, 2], [2, 12, 2], [4, 7, 4]]],
    how: 'Joep’s girlfriend Annemiek pulls the weirdest faces in town, and Joep has to photograph every one. <b>Snap the photo</b> right when she freezes.<br><b>Boing-boing</b> = freeze one beat after the first boing. <b>Wobble-wobble-wobble</b> = freeze right after the third. A slow <b>whistle</b> = the grand finale, two beats.',
    verdict: ['A whole album of perfectly weird photos. Annemiek is framing them. Joep is blushing.', 'Some blurry shots, but the weirdness shines through.', 'Snap on the beat right after the last boing or wobble.'],
    chart() {
      const c = [], add = (bar, off, k) => c.push({ b: bar * 4 + off, k, f: c.length % 5 });
      add(1, 2, 'pose'); add(2, 2, 'pose'); add(3, 2, 'gek'); add(4, 1, 'pose'); add(4, 3, 'pose');
      add(5, 2, 'gek'); add(6, 1, 'pose'); add(6, 2, 'pose'); add(6, 3, 'pose'); add(7, 2, 'gek'); add(7, 3.5, 'pose');
      add(8, 1, 'pose'); add(8, 3, 'gek'); add(9, 1, 'pose'); add(9, 2, 'pose'); add(9, 3, 'pose'); add(10, 2, 'pose'); add(10, 3, 'pose');
      add(11, 1, 'gek'); add(11, 3, 'gek'); add(12, 1, 'pose'); add(12, 2, 'pose'); add(12, 3, 'pose'); add(13, 3, 'kus');
      return c;
    },
    cue(e, t, spb) {
      if (e.k === 'pose') WOB.pose.forEach((d, i) => A.tone(t - d * spb, fq(12 + i * 7), .1, 'triangle', .14, fq(5 + i * 7)));
      else if (e.k === 'gek') WOB.gek.forEach((d, i) => A.tone(t - d * spb, fq(19 - i * 3), .1, 'sawtooth', .05, fq(24 - i * 3), 1600));
      else A.tone(t - 2 * spb, fq(24), 2 * spb * .9, 'sine', .1, fq(36));
    },
    hit(t, res, e) { A.nz(t, .05, .4, 'highpass', 6000); A.tone(t + .03, 3000, .03, 'square', .04); if (e.k === 'kus') [0, 4, 7, 12].forEach((n, i) => A.tone(t + i * .05, fq(24 + n), .2, 'sine', .07)); },
    miss(t) { A.voice(t, fq(9), .2, .7, 'e', fq(2)); },
    draw(P) {
      sky('#f6e0ff', '#ffd9ec'); dots('rgba(142,68,173,.12)', 20);
      rr(-10, 400, W + 20, 150, 0, '#6a4a8a', 4); ell(560, 410, 200, 26, '#f6b92b', 0); ell(560, 410, 150, 18, '#ffe58a', 0);
      for (let i = 0; i < 6; i++) ln(400 + i * 60, 0, 520 + i * 20, 400, 10, 'rgba(255,255,255,.25)');
      let wob = 0, freeze = null, flash = 0, blur = 0;
      for (const e of P.ev) {
        const lead = WOB[e.k][0], k = P.b - (e.b - lead);
        if (!e.res && k >= 0) wob = 1;
        if (hitOk(e) && P.b - e.hb >= 0 && P.b - e.hb < .5) { freeze = e; flash = 1 - (P.b - e.hb) * 2; }
        if (e.res === 'miss' && P.b >= e.b && P.b - e.b < .6) blur = 1;
      }
      const t = P.b, f = freeze ? (freeze.f ?? Math.round(freeze.b * 2) % 5) : 0, poses = [[1, .1, .2], [.1, 1, -.2], [1, 1, 0], [-.2, .6, .35], [.6, -.2, -.35]];
      const [pal, par, prot] = freeze ? poses[f] : [Math.abs(Math.sin(t * 6)), Math.abs(Math.cos(t * 6)), wob ? Math.sin(t * 14) * .2 : Math.sin(t * Math.PI) * .05];
      actor('annemiek', { x: 560 + (wob && !freeze ? Math.sin(t * 20) * 6 : 0), y: 320, al: pal, ar: par, rot: prot, squash: freeze ? 0 : Math.sin(t * 10) * .15,
        eyes: freeze ? ['x', 'big', 'happy', 'big', 'x'][f] : 'big', mouth: freeze ? ['wow', 'grin', 'o', 'grin', 'wow'][f] : 'grin', look: Math.sin(t * 3) });
      // Joep with his camera
      const snap = !!freeze && flash > .5;
      bro('joep', { x: 180, y: 340, ar: .55, al: .55, mouth: snap ? 'grin' : 'smile', eyes: 'open' });
      rr(196, 262, 50, 36, 6, '#3a3354', 3); circ(221, 280, 10, '#8fd3f0', 3); rr(204, 256, 14, 8, 2, '#3a3354', 2);
      if (flash > 0) { g.save(); g.globalAlpha = flash * .8; g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.restore(); }
      if (blur) bubble('Wazig!', 560, 120, 24);
      // one pip per boing/wobble, then the snap; a ring closes on the camera lens
      const live = P.ev.find(e => !e.res && P.b >= e.b - WOB[e.k][0] - .1 && P.b < e.b + .3);
      if (live) { const ws = WOB[live.k]; callPips(221, 200, ws.length + 1, ws.filter(d => P.b >= live.b - d - .02).length + (P.b >= live.b - .05 ? 1 : 0), '#c77dff'); }
      P.ev.forEach(e => cueRing(P, e, 221, 280, WOB[e.k][0], e.k === 'kus' ? '#ef4a36' : '#c77dff', 60));
      // the photo strip
      const shots = P.ev.filter(e => hitOk(e) && P.b > e.hb + .4).slice(-8);
      shots.forEach((e, i) => { g.save(); g.translate(40 + i * 46, 470); g.rotate((i % 2 ? 1 : -1) * .1); rr(-18, -22, 36, 44, 3, '#fff', 3); rr(-13, -17, 26, 26, 2, '#c77dff', 0); circ(0, -6, 7, '#f6d0b0', 0); g.restore(); });
      if (freeze && freeze.k === 'kus') { txt('♥', 400, 200, 60, '#ef4a36'); bubble('Mijn Joep!', 560, 120, 26); }
    },
  });
})();

// ===== Kouw Bouwt (Kouw aan de Bouw) =====
(() => {
  LEVELS.push({
    id: 'bouw', title: 'Kouw Bouwt', who: 'Kouw aan de Bouw', song: 'Zes Poten Funk', color: '#ffd60a', accent: '#f77f00',
    bpm: 120, beats: 64, key: 2,
    prog: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [5, 9, 12]],
    drums: { k: 'x.x.x.x.', s: '..x...x.', h: '.x.x.x.x', c: '...x...x' }, bass: '1.18.5.1', comp: 'stab', lead: 'square',
    mel: [[[0, 7, 1], [1, 9, 1], [2, 12, 1], [3, 9, 1], [4, 7, 2], [6, 4, 2]], [[0, 5, 2], [2, 9, 2], [4, 12, 4]],
          [[0, 11, 1], [1, 14, 1], [2, 19, 2], [4, 14, 2], [6, 11, 2]], [[0, 12, 3], [3, 9, 1], [4, 5, 4]]],
    how: 'Kouw has six legs and a lot of nails. A nail <b>"ding"s</b> into place: <b>hammer</b> it one beat later.<br>When you hear the <b>rattle</b>, a whole row of six nails appears: hammer all six, half a beat apart, starting two beats after the rattle.',
    verdict: ['A perfectly straight wall, built in record time. Kouw is already building a second one.', 'The wall is standing. A little wobbly, but standing.', 'Ding = one beat. Rattle = wait two beats, then six quick hammers.'],
    chart() {
      const c = [], add = (bar, off, k = 'spijker') => c.push({ b: bar * 4 + off, k });
      const row = (bar, off) => { for (let i = 0; i < 6; i++) c.push({ b: bar * 4 + off + i * .5, k: i ? 'rij' : 'rij0' }); };
      add(1, 1); add(1, 3); add(2, 1); add(2, 2); add(2, 3); row(3, 2); add(5, 1); add(5, 3);
      add(6, 1); add(6, 2); add(6, 2.5); add(6, 3); row(7, 2); add(9, 1); add(9, 2); add(9, 3); add(10, 1); add(10, 1.5); add(10, 3);
      row(11, 2); add(13, 1); add(13, 2); add(13, 3); row(14, 2);
      return c;
    },
    cue(e, t, spb) {
      if (e.k === 'spijker') A.tone(t - spb, fq(24), .06, 'triangle', .14);
      else if (e.k === 'rij0') { for (let i = 0; i < 6; i++) A.nz(t - 2 * spb + i * .03, .03, .15, 'bandpass', 4000, 3); A.tone(t - 2 * spb, fq(31), .1, 'triangle', .08); }
    },
    hit(t, res, e) { A.tone(t, e.k === 'spijker' ? 600 : 700 + (e.b % 3) * 60, .04, 'square', .1); A.nz(t, .04, .3, 'bandpass', 2500, 2); },
    miss(t) { A.tone(t, 900, .1, 'sine', .08, 300); },
    draw(P) {
      sky('#d8f0ff', '#fff3db');
      for (let x = 120; x < 900; x += 160) { ln(x, 60, x, 420, 6, '#9aa3b5'); } for (let y = 100; y < 420; y += 80) ln(100, y, 880, y, 5, '#9aa3b5');
      rr(-10, 420, W + 20, 130, 0, '#c9b28a', 4);
      // the wall grows a brick per nail
      const done = P.ev.filter(e => hitOk(e) && P.b > e.hb).length, perRow = 10;
      for (let i = 0; i < done; i++) { const r = Math.floor(i / perRow), c = i % perRow; rr(150 + c * 64 + (r % 2) * 32, 388 - r * 30, 62, 28, 3, '#d4683d', 3); }
      // beam with nails: each nail keeps its own spot, sinks when hammered, bends when missed
      const rowShown = e => P.ev.some(r => r.k === 'rij0' && r.b <= e.b && e.b - r.b < 3 && P.b >= r.b - 2);
      const slot = e => { if (e.k === 'spijker') return P.ev.indexOf(e) % 6; const r = P.ev.filter(v => v.k === 'rij0' && v.b <= e.b + .01).pop(); return r ? Math.round((e.b - r.b) * 2) : 0; };
      rr(300, 300, 360, 22, 4, '#9b6b43', 4);
      P.ev.forEach(e => {
        const x = 330 + slot(e) * 56;
        if (!e.res && (e.k === 'spijker' ? e.b - P.b < 1 : rowShown(e))) { ln(x, 300, x, 270, 4); rr(x - 8, 264, 16, 6, 2, '#9aa3b5', 2); }
        else if (hitOk(e) && P.b - e.hb >= 0 && P.b - e.hb < .5) rr(x - 8, 294, 16, 6, 2, '#9aa3b5', 2);
        else if (e.res === 'miss' && P.b - e.b >= 0 && P.b - e.b < .6) { ln(x, 300, x + 4, 284, 4); ln(x + 4, 284, x + 18, 280, 4); }
      });
      const whack = P.ev.some(e => hitOk(e) && P.b - e.hb >= 0 && P.b - e.hb < .2), oops = P.ev.some(e => e.res === 'miss' && P.b >= e.b && P.b - e.b < .6);
      actor('kouw', { x: 480, y: 200, ar: whack ? .1 : .8, al: .5, mouth: oops ? 'sad' : whack ? 'grin' : 'smile', eyes: oops ? 'x' : 'open' });
      P.ev.forEach(e => (e.k === 'spijker' || rowShown(e)) && cueRing(P, e, 330 + slot(e) * 56, 262, 1, '#f77f00', 44));
      if (whack) txt('TOK!', 600, 150, 26, '#f77f00');
      if (oops) bubble('Au, mijn derde duim!', 640, 120, 20);
      txt(`${done} stenen`, 860, 470, 20, INK, 'right');
    },
  });
})();
