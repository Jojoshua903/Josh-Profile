'use strict';
/* ---------- modal, scenes and the challenge wrapper ---------- */
let keyHook = null;

function accentFor(ch) {
  const c = (ch.color || '#ffc21f').replace('#', '');
  const r = parseInt(c.substr(0, 2), 16), g = parseInt(c.substr(2, 2), 16), b = parseInt(c.substr(4, 2), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.42 ? ch.color : '#e6dcff';
}
function modalOpen(ch) {
  const root = document.getElementById('modalRoot');
  root.innerHTML = '';
  const m = el('div', 'modal'); m.style.setProperty('--accent', accentFor(ch));
  const head = el('div', 'mhead'); head.appendChild(avatar(ch, 128));
  head.appendChild(el('div', '', `<h3>${ch.name}</h3><div class="t">${ch.title || ''}</div>`));
  const body = el('div', 'mbody');
  m.append(head, body); root.appendChild(m); root.classList.add('show');
  S.modal = true;
  return {m, body};
}
function modalClose() {
  const root = document.getElementById('modalRoot');
  root.classList.remove('show'); root.innerHTML = ''; keyHook = null; S.modal = false;
  keys.clear();
}

// choices: array of strings or {label, disabled}
function scene(ch, text, choices = ['OK']) {
  return new Promise(res => {
    const {body} = modalOpen(ch);
    body.appendChild(el('div', 'bubble', text));
    const cw = el('div', 'choices');
    const finish = i => { modalClose(); res(i); };
    choices.forEach((c, i) => {
      const o = typeof c === 'string' ? {label: c} : c;
      const b = el('button', 'btn' + (i === 0 ? ' primary' : ''), `<span style="font-family:var(--mono);opacity:.6">${i + 1}</span> ${o.label}`);
      if (o.disabled) b.disabled = true;
      b.onclick = () => finish(i);
      cw.appendChild(b);
    });
    body.appendChild(cw);
    keyHook = e => { const n = parseInt(e.key); if (n >= 1 && n <= choices.length) { const o = choices[n - 1]; if (!(o && o.disabled)) finish(n - 1); } };
  });
}

function challenge(ch, game, opts = {}) {
  return new Promise(res => {
    const {m, body} = modalOpen(ch);
    const G = GAMES[game];
    body.appendChild(el('div', 'how', G.how(opts)));
    const area = el('div', 'cbody'); body.appendChild(area);
    let over = false, cleanup = null;
    const done = (win, extra = {}) => {
      if (over) return; over = true; keyHook = null;
      try { cleanup && cleanup(); } catch (e) {}
      sfx(win ? 'win' : 'lose');
      m.appendChild(el('div', 'result ' + (win ? 'win' : 'lose'), `<span>${extra.msg || (win ? 'NAILED IT!' : 'NOPE!')}</span>`));
      S.stats[win ? 'won' : 'lost']++;
      setTimeout(() => { modalClose(); res(Object.assign({win}, extra)); }, 1150);
    };
    if (hero.ab.kind === 'autowin' && S.charges > 0) {
      const b = el('button', 'btn abwin', `${hero.ab.icon} ${hero.ab.name.toUpperCase()} · instant win (${S.charges} left)`);
      b.onclick = () => { if (over) return; S.charges--; updHUD(); done(true, Object.assign({msg: hero.ab.name.toUpperCase() + '!'}, G.autoExtra ? G.autoExtra(opts) : {})); };
      body.appendChild(b);
    }
    cleanup = G.run(area, done, opts) || null;
  });
}

function timerBar(parent, secs, onEnd) {
  const t = el('div', 'timer', '<i></i>'); parent.prepend(t);
  const bar = t.firstChild, start = performance.now(); let alive = true;
  (function f() {
    if (!alive) return;
    const p = 1 - (performance.now() - start) / (secs * 1000);
    bar.style.width = Math.max(0, p * 100) + '%';
    if (p <= 0) { alive = false; onEnd(); return; }
    requestAnimationFrame(f);
  })();
  return {stop() { alive = false; }};
}
function lev(a, b) {
  const m = []; for (let i = 0; i <= a.length; i++) m[i] = [i];
  for (let j = 1; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return m[a.length][b.length];
}

// multiple-choice factory used by trivia, riddles and Ati's manners test
function mcq(pool, n, secs, label) {
  return {
    how: () => `${n} ${label} · GET ALL ${n} RIGHT · KEYS A-D`,
    run(a, done) {
      const qs = shuffle(pool).slice(0, n); let i = 0, tm = null;
      const ans = ok => { tm && tm.stop(); keyHook = null; if (!ok) return done(false, {msg: 'WRONG!'}); i++; sfx('good'); if (i >= n) done(true); else render(); };
      const render = () => {
        a.innerHTML = ''; const q = qs[i];
        a.appendChild(el('div', 'qtext', `${i + 1}/${n} · ${q.q}`));
        const opts = shuffle([q.a, ...shuffle(q.w).slice(0, 3)]);
        const grid = el('div', 'qopts');
        opts.forEach((o, k) => { const b = el('button', 'btn', `<b>${'ABCD'[k]}:</b> ${o}`); b.onclick = () => ans(o === q.a); grid.appendChild(b); });
        a.appendChild(grid);
        tm = timerBar(a, secs + bonus(), () => ans(false));
        keyHook = e => { const k = 'abcd'.indexOf(e.key.toLowerCase()); if (k >= 0 && k < opts.length) ans(opts[k] === q.a); };
      };
      render();
      return () => tm && tm.stop();
    }
  };
}

/* ---------- mini-games ---------- */
const GAMES = {
  trivia: mcq(QUIZ, 2, 12, 'WIDR LORE QUESTIONS'),
  riddle: mcq(RIDDLES, 2, 14, 'RIDDLES'),
  manners: mcq(MANNERS, 2, 10, 'MANNERS QUESTIONS'),

  ladder: {
    how: () => '4 QUESTIONS · EACH DOUBLES THE PRIZE · TOAST IS NEVER CORRECT',
    autoExtra: () => ({candy: 48, top: true}),
    run(a, done) {
      const prizes = [6, 12, 24, 48], qs = shuffle(QUIZ).slice(0, 4); let step = 0, bank = 0, tm = null;
      const answer = ok => {
        tm && tm.stop(); keyHook = null;
        if (!ok) return done(false, {candy: 0, msg: 'WRONG!'});
        bank = prizes[step]; step++; sfx('good');
        if (step >= 4) return done(true, {candy: bank, top: true, msg: 'HUNDREDAIRE!'});
        a.innerHTML = '';
        a.appendChild(el('div', 'bigtxt', `🍬 ${bank}`));
        a.appendChild(el('div', 'qtext', `Correct! Walk away with ${bank}, or risk it for ${prizes[step]}?`));
        const c = el('div', 'choices');
        const go = el('button', 'btn primary', `Go for 🍬${prizes[step]}`); go.onclick = render;
        const wa = el('button', 'btn', `Walk away with 🍬${bank}`); wa.onclick = () => done(true, {candy: bank, msg: 'WALKED AWAY'});
        c.append(go, wa); a.appendChild(c);
        keyHook = e => { if (e.key === '1') render(); if (e.key === '2') wa.onclick(); };
      };
      const render = () => {
        a.innerHTML = '';
        const lad = el('div', 'ladder');
        prizes.forEach((p, i) => lad.appendChild(el('span', i < step ? 'done' : i === step ? 'on' : '', `🍬${p}`)));
        a.appendChild(lad);
        const q = qs[step];
        a.appendChild(el('div', 'qtext', q.q));
        const opts = shuffle([q.a, ...shuffle(q.w).slice(0, 2)]); opts.push('Toast');
        const grid = el('div', 'qopts');
        opts.forEach((o, i) => { const b = el('button', 'btn', `<b>${'ABCD'[i]}:</b> ${o}`); b.onclick = () => answer(o === q.a); grid.appendChild(b); });
        a.appendChild(grid);
        tm = timerBar(a, 12 + bonus(), () => answer(false));
        keyHook = e => { const k = 'abcd'.indexOf(e.key.toLowerCase()); if (k >= 0) answer(opts[k] === q.a); };
      };
      render();
      return () => tm && tm.stop();
    }
  },

  math: {
    how: () => 'SOLVE 5 SUMS BEFORE TIME RUNS OUT · TYPE THE ANSWER',
    run(a, done) {
      let n = 0, cur, alive = true;
      const gen = () => {
        const t = ri(0, 2);
        if (t === 0) { const x = ri(4, 40), y = ri(3, 30); return [`${x} + ${y}`, x + y]; }
        if (t === 1) { const x = ri(20, 60), y = ri(2, 19); return [`${x} − ${y}`, x - y]; }
        const x = ri(2, 9), y = ri(2, 9); return [`${x} × ${y}`, x * y];
      };
      const prog = el('div', 'how'), big = el('div', 'bigtxt'), inp = el('input', 'inp');
      inp.inputMode = 'numeric'; inp.autocomplete = 'off'; a.append(prog, big, inp);
      const next = () => { cur = gen(); big.textContent = cur[0] + ' = ?'; prog.textContent = `SUM ${n + 1} OF 5`; inp.value = ''; inp.focus(); };
      const check = () => {
        if (!alive) return;
        if (parseInt(inp.value) === cur[1]) { n++; sfx('good'); if (n >= 5) { alive = false; tm.stop(); done(true); } else next(); }
      };
      inp.oninput = check;
      inp.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter' && parseInt(inp.value) !== cur[1]) { inp.value = ''; sfx('bad'); } };
      const tm = timerBar(a, 18 + bonus(), () => { alive = false; done(false, {msg: 'TIME!'}); });
      next(); setTimeout(() => inp.focus(), 60);
      return () => { alive = false; tm.stop(); };
    }
  },

  rhythm: {
    how: () => 'HIT NOTES ON THE LINE · ← ↓ ↑ → OR D F J K OR TAP LANES',
    run(a, done, o) {
      const N = o.short ? 10 : o.boss ? 30 : 18, gap = o.boss ? 300 : 430, speed = o.boss ? 340 : 250;
      const need = Math.ceil(N * (hero.id === 'dean' ? 0.55 : 0.7));
      const cv = el('canvas', 'gcan'); cv.width = 340; cv.height = 300; a.appendChild(cv);
      const info = el('div', 'how'); a.appendChild(info);
      const g = cv.getContext('2d'), lw = 85, hitY = 255;
      const t0 = performance.now() + 900, notes = [];
      for (let i = 0; i < N; i++) notes.push({lane: ri(0, 3), t: t0 + i * gap + (Math.random() < 0.25 ? gap / 2 : 0)});
      notes.sort((p, q) => p.t - q.t);
      let hits = 0, alive = true; const flash = [0, 0, 0, 0];
      const cols = ['#ff3b5c', '#3c8dff', '#8fd400', '#ffc21f'], arrows = ['←', '↓', '↑', '→'];
      const press = l => {
        const now = performance.now(); flash[l] = now; let best = null, bd = 1e9;
        for (const n of notes) { if (n.hit || n.miss || n.lane !== l) continue; const d = Math.abs(now - n.t); if (d < bd) { bd = d; best = n; } }
        if (best && bd < 140) { best.hit = true; hits++; sfx('tick', 330 + l * 110); }
      };
      const map = {ArrowLeft: 0, ArrowDown: 1, ArrowUp: 2, ArrowRight: 3, d: 0, f: 1, j: 2, k: 3};
      keyHook = e => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; if (k in map) { e.preventDefault(); press(map[k]); } };
      cv.onpointerdown = e => { const r = cv.getBoundingClientRect(); press(clamp(Math.floor((e.clientX - r.left) / r.width * 4), 0, 3)); };
      const loop = () => {
        if (!alive) return;
        const now = performance.now();
        for (let l = 0; l < 4; l++) { g.fillStyle = now - flash[l] < 120 ? '#fff0b0' : (l % 2 ? '#ffffff' : '#fbf4e6'); g.fillRect(l * lw, 0, lw, 300); }
        g.fillStyle = INK; g.fillRect(0, hitY - 2, 340, 4);
        g.font = 'bold 20px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        for (let l = 0; l < 4; l++) { g.fillStyle = 'rgba(29,26,47,.4)'; g.fillText(arrows[l], l * lw + lw / 2, 282); }
        for (const n of notes) {
          if (n.hit || n.miss) continue;
          if (now - n.t > 140) { n.miss = true; continue; }
          const y = hitY - (n.t - now) / 1000 * speed;
          if (y > -20) circ(g, n.lane * lw + lw / 2, y, 15, cols[n.lane]);
        }
        info.textContent = `HITS ${hits}/${N} · NEED ${need}`;
        if (now > notes[notes.length - 1].t + 300) { alive = false; done(hits >= need, {score: hits, msg: `${hits}/${N}`}); return; }
        requestAnimationFrame(loop);
      };
      loop();
      return () => { alive = false; };
    }
  },

  timing: {
    how: () => 'STOP THE MARKER IN THE GREEN · SPACE OR TAP · SCORE 2 OF 3',
    run(a, done, o) {
      let kick = 0, goals = 0, pos = 0, dir = 1, alive = true, zone = [0, 0];
      const easy = hero.id === 'oela' || o.easy;
      const met = el('div', 'meter'), z = el('div', 'zone'), mk = el('div', 'mk'); met.append(z, mk);
      const info = el('div', 'bigtxt', `${o.sym || '⚽'} 0 / 0`);
      const btn = el('button', 'btn primary big', o.verb || 'KICK!'); btn.style.marginTop = '12px';
      a.append(info, met, btn);
      const setZone = () => { const w = (easy ? 24 : 17) - kick * 2; zone[0] = rnd(6, 94 - w); zone[1] = zone[0] + w; z.style.left = zone[0] + '%'; z.style.width = w + '%'; };
      setZone();
      let last = performance.now();
      const loop = t => {
        if (!alive) return;
        const dt = Math.min(0.05, (t - last) / 1000); last = t;
        pos += dir * (95 + kick * 30) * dt;
        if (pos > 100) { pos = 100; dir = -1; } if (pos < 0) { pos = 0; dir = 1; }
        mk.style.left = `calc(${pos}% - 3px)`;
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
      const shoot = () => {
        if (!alive) return;
        const ok = pos >= zone[0] && pos <= zone[1]; ok ? (goals++, sfx('good')) : sfx('bad'); kick++;
        info.textContent = `${ok ? (o.good || 'GOAL!') : (o.bad || 'SAVED!')} ${o.sym || '⚽'} ${goals} / ${kick}`;
        if (goals >= 2) { alive = false; return done(true); }
        if (kick - goals >= 2) { alive = false; return done(false); }
        setZone();
      };
      btn.onclick = shoot;
      keyHook = e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); shoot(); } };
      return () => { alive = false; };
    }
  },

  mash: {
    how: () => 'MASH SPACE OR TAP THE BUTTON · 5 SECONDS FROM YOUR FIRST PRESS',
    run(a, done, o) {
      const target = o.target || (hero.id === 'yassin' ? 24 : 32);
      let n = 0, started = false, end = 0, alive = true;
      const t = el('div', 'timer', '<i></i>'), big = el('div', 'bigtxt', `0 / ${target}`), b = el('button', 'btn primary mashbtn', o.label || '💪 PUSH-UP!');
      a.append(t, big, b); const bar = t.firstChild;
      const tick = () => {
        if (!alive) return;
        const left = end - performance.now(); bar.style.width = Math.max(0, left / 50) + '%';
        if (left <= 0) { alive = false; return done(false, {msg: 'TOO SLOW!'}); }
        requestAnimationFrame(tick);
      };
      const hit = () => {
        if (!alive) return;
        if (!started) { started = true; end = performance.now() + 5000; tick(); }
        n++; big.textContent = `${n} / ${target}`;
        if (n >= target) { alive = false; done(true, {msg: 'BEAST MODE!'}); }
      };
      b.onpointerdown = e => { e.preventDefault(); hit(); };
      keyHook = e => { if (e.key === ' ' && !e.repeat) { e.preventDefault(); hit(); } };
      return () => { alive = false; };
    }
  },

  simon: {
    how: () => 'WATCH THE LINEUP · REPEAT IT IN ORDER · KEYS 1-4 OR TAP',
    run(a, done, o) {
      const sy = o.symbols || ['🧛', '🧟', '🧙', '👻'], rounds = o.rounds || [4, 5];
      const info = el('div', 'how', 'WATCH…'), pads = el('div', 'pads'); a.append(info, pads);
      const btns = sy.map(s => { const b = el('button', 'pad', s); pads.appendChild(b); return b; });
      let alive = true, r = 0, seq = [], input = [], accepting = false;
      const flash = async i => { btns[i].classList.add('lit'); sfx('tick', 300 + i * 90); await sleep(380); btns[i].classList.remove('lit'); await sleep(150); };
      const play = async () => {
        accepting = false; info.textContent = `ROUND ${r + 1} · WATCH…`;
        seq = Array.from({length: rounds[r]}, () => ri(0, sy.length - 1)); input = [];
        await sleep(550);
        for (const i of seq) { if (!alive) return; await flash(i); }
        info.textContent = `ROUND ${r + 1} · YOUR TURN (${seq.length})`; accepting = true;
      };
      btns.forEach((b, i) => b.onclick = () => {
        if (!accepting || !alive) return;
        b.classList.add('lit'); setTimeout(() => b.classList.remove('lit'), 150);
        input.push(i); const k = input.length - 1;
        if (input[k] !== seq[k]) { alive = false; return done(false, {msg: 'WRONG ONE!'}); }
        sfx('tick', 300 + i * 90);
        if (input.length === seq.length) { r++; if (r >= rounds.length) { alive = false; done(true); } else play(); }
      });
      keyHook = e => { const n = parseInt(e.key); if (n >= 1 && n <= sy.length) btns[n - 1].click(); };
      play();
      return () => { alive = false; };
    }
  },

  typing: {
    how: () => 'MEMORISE THE MESSAGE · THEN TYPE IT + ENTER',
    run(a, done) {
      const msg = pick(TRANSMISSIONS);
      const big = el('div', 'bigtxt', msg); big.style.fontSize = '24px';
      const inp = el('input', 'inp'); inp.placeholder = 'message incoming…'; inp.autocomplete = 'off'; inp.disabled = true;
      a.append(big, inp);
      let tm = null, alive = true;
      const to = setTimeout(() => {
        if (!alive) return;
        big.textContent = '▮▮▮ ▮▮ ▮▮▮▮▮ ▮▮'; inp.disabled = false; inp.placeholder = 'type the message'; inp.focus();
        tm = timerBar(a, 12 + bonus(), () => { alive = false; done(false, {msg: 'SIGNAL LOST'}); });
      }, 2000 + msg.length * 60);
      inp.onkeydown = e => {
        e.stopPropagation();
        if (e.key === 'Enter' && alive) {
          const norm = s => s.toUpperCase().replace(/[^A-Z]/g, '');
          const ok = lev(norm(inp.value), norm(msg)) <= 1;
          alive = false; tm && tm.stop(); done(ok, {msg: ok ? 'DECODED!' : 'GARBLED!'});
        }
      };
      return () => { alive = false; clearTimeout(to); tm && tm.stop(); };
    }
  },

  shell: {
    how: () => 'KEEP YOUR EYE ON THE HAT WITH THE CANDY',
    run(a, done) {
      const wrap = el('div', 'cups'); a.appendChild(wrap);
      const info = el('div', 'how', 'WATCH CLOSELY…'); a.appendChild(info);
      const W = a.clientWidth || 480, slots = [0, 1, 2].map(i => W / 2 - 150 + i * 105);
      const marker = el('div', '', '🍬'); marker.style.cssText = 'position:absolute;top:66px;font-size:34px;transition:opacity .2s'; wrap.appendChild(marker);
      const pos = [0, 1, 2];
      const cups = [0, 1, 2].map(i => { const c = el('button', 'cup', '🎩'); c.style.left = slots[i] + 'px'; c.style.transition = 'left .2s ease-in-out, transform .3s'; wrap.appendChild(c); return c; });
      const prize = ri(0, 2); let alive = true, ready = false;
      const lift = (i, up) => { cups[i].style.transform = up ? 'translateY(-36px)' : ''; };
      marker.style.left = (slots[pos[prize]] + 28) + 'px';
      (async () => {
        lift(prize, true); await sleep(1000); lift(prize, false); await sleep(400); marker.style.opacity = 0;
        const swaps = ri(7, 10);
        for (let s = 0; s < swaps; s++) {
          if (!alive) return;
          const x = ri(0, 2); let y = ri(0, 2); if (y === x) y = (x + 1) % 3;
          [pos[x], pos[y]] = [pos[y], pos[x]];
          cups[x].style.left = slots[pos[x]] + 'px'; cups[y].style.left = slots[pos[y]] + 'px';
          await sleep(Math.max(230, 360 - s * 14));
        }
        ready = true; info.textContent = 'WHICH HAT? (1, 2, 3 FROM LEFT OR TAP)';
      })();
      const choose = i => {
        if (!ready || !alive) return; alive = false;
        marker.style.left = (slots[pos[prize]] + 28) + 'px'; marker.style.opacity = 1;
        lift(i, true); if (i !== prize) lift(prize, true);
        setTimeout(() => done(i === prize, {msg: i === prize ? 'FOUND IT!' : 'HEHEHE!'}), 700);
      };
      cups.forEach((c, i) => c.onclick = () => choose(i));
      keyHook = e => { const n = parseInt(e.key); if (n >= 1 && n <= 3) choose(pos.indexOf(n - 1)); };
      return () => { alive = false; };
    }
  },

  reaction: {
    how: () => 'TAP (OR SPACE) WHEN THE CRYSTAL TURNS ICY BLUE · WIN 2 OF 3',
    run(a, done) {
      const info = el('div', 'how', 'ROUND 1/3'), pad = el('div', 'react', '💎 wait for it…'); a.append(info, pad);
      let round = 0, wins = 0, state = 'wait', goAt = 0, alive = true, to = null;
      const lim = 440 + (st(3) - 3) * 30;
      const resolve = (ok, txt) => {
        clearTimeout(to); state = 'done'; round++; if (ok) wins++;
        pad.classList.remove('go'); pad.textContent = txt; sfx(ok ? 'good' : 'bad');
        info.textContent = `ROUND ${Math.min(round + 1, 3)}/3 · ${wins} WON`;
        if (wins >= 2) { alive = false; return setTimeout(() => done(true), 450); }
        if (round - wins >= 2) { alive = false; return setTimeout(() => done(false), 450); }
        setTimeout(() => alive && arm(), 900);
      };
      const arm = () => {
        state = 'wait'; pad.textContent = '💎 wait for it…';
        to = setTimeout(() => {
          if (!alive) return;
          state = 'go'; goAt = performance.now(); pad.classList.add('go'); pad.textContent = '❄️ NOW!';
          to = setTimeout(() => { if (state === 'go') resolve(false, 'MELTED! 💧'); }, lim);
        }, rnd(1200, 3200));
      };
      const tap = () => { if (!alive) return; if (state === 'wait') resolve(false, 'TOO EARLY! 🥶'); else if (state === 'go') resolve(true, `${Math.round(performance.now() - goAt)} ms!`); };
      pad.onpointerdown = tap;
      keyHook = e => { if (e.key === ' ') { e.preventDefault(); tap(); } };
      arm();
      return () => { alive = false; clearTimeout(to); };
    }
  },

  pairs: {
    how: () => 'MATCH ALL 6 PAIRS BEFORE THE SPELL FADES',
    run(a, done) {
      const sy = shuffle(['🎃', '👻', '🦇', '🕸️', '🍬', '🧙', '🍭', '🕯️']).slice(0, 6);
      const grid = el('div', 'cards'); a.appendChild(grid);
      let open = [], matched = 0, lock = false, alive = true;
      shuffle([...sy, ...sy]).forEach(s => {
        const c = el('button', 'mc', s);
        c.onclick = () => {
          if (lock || !alive || c.classList.contains('up') || c.classList.contains('gone')) return;
          c.classList.add('up'); open.push(c);
          if (open.length < 2) return;
          const [p, q] = open;
          if (p.textContent === q.textContent) {
            p.classList.replace('up', 'gone'); q.classList.replace('up', 'gone'); open = []; matched++; sfx('good');
            if (matched === 6) { alive = false; tm.stop(); done(true); }
          } else { lock = true; setTimeout(() => { p.classList.remove('up'); q.classList.remove('up'); open = []; lock = false; }, 600); }
        };
        grid.appendChild(c);
      });
      const tm = timerBar(a, 40 + bonus(), () => { alive = false; done(false, {msg: 'SPELL FADED'}); });
      return () => { alive = false; tm.stop(); };
    }
  },

  catch: {
    how: () => 'CATCH CANDY · DODGE SPACE ROCKS (−3) · MOUSE OR ← →',
    autoExtra: () => ({score: 14}),
    run(a, done) {
      const cv = el('canvas', 'gcan'); cv.width = 340; cv.height = 280; a.appendChild(cv);
      const info = el('div', 'how'); a.appendChild(info);
      const g = cv.getContext('2d'), DUR = 12000;
      let px = 170, score = 0, alive = true, objs = [], last = performance.now(), start = last, spawn = 0;
      cv.onpointermove = e => { const r = cv.getBoundingClientRect(); px = (e.clientX - r.left) / r.width * 340; };
      cv.onpointerdown = cv.onpointermove;
      keyHook = e => {
        if (e.key === 'ArrowLeft' || e.key === 'a') { px -= 30; e.preventDefault(); }
        if (e.key === 'ArrowRight' || e.key === 'd') { px += 30; e.preventDefault(); }
      };
      const loop = t => {
        if (!alive) return;
        const dt = Math.min(0.05, (t - last) / 1000); last = t; spawn -= dt;
        if (spawn <= 0) { spawn = rnd(0.25, 0.5); const rock = Math.random() < 0.3; objs.push({x: rnd(15, 325), y: -20, v: rnd(120, 210) + (t - start) / 90, e: rock ? '☄️' : pick(['🍬', '🍫', '🍭', '🍪']), rock}); }
        px = clamp(px, 25, 315);
        const gr = g.createLinearGradient(0, 0, 0, 280); gr.addColorStop(0, '#e6dcff'); gr.addColorStop(1, '#fff3df');
        g.fillStyle = gr; g.fillRect(0, 0, 340, 280);
        g.font = '22px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        for (const o of objs) {
          o.y += o.v * dt; g.fillText(o.e, o.x, o.y);
          if (!o.dead && o.y > 238 && o.y < 270 && Math.abs(o.x - px) < 32) { o.dead = true; if (o.rock) { score = Math.max(0, score - 3); sfx('bad'); } else { score++; sfx('tick'); } }
        }
        objs = objs.filter(o => !o.dead && o.y < 300);
        g.font = '34px serif'; g.fillText('🎒', px, 255);
        const left = DUR - (t - start);
        info.textContent = `CAUGHT ${score} · ${Math.max(0, Math.ceil(left / 1000))}s · NEED 8`;
        if (left <= 0) { alive = false; return done(score >= 8, {score, msg: `${score} CAUGHT`}); }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
      return () => { alive = false; };
    }
  },

  dodge: {
    how: o => `DODGE THE ${o.what || 'EGGS'} · MOUSE OR ← → · SURVIVE 9 SECONDS · 3 LIVES`,
    run(a, done, o) {
      const cv = el('canvas', 'gcan'); cv.width = 340; cv.height = 280; a.appendChild(cv);
      const info = el('div', 'how'); a.appendChild(info);
      const g = cv.getContext('2d'), DUR = 9000, sym = o.sym || '🥚';
      let px = 170, lives = 3, alive = true, objs = [], last = performance.now(), start = last, spawn = 0, hurt = 0;
      const held = new Set();
      cv.onpointermove = e => { const r = cv.getBoundingClientRect(); px = (e.clientX - r.left) / r.width * 340; };
      cv.onpointerdown = cv.onpointermove;
      keyHook = e => { if (e.key.startsWith('Arrow')) e.preventDefault(); held.add(e.key); };
      const ku = e => held.delete(e.key); window.addEventListener('keyup', ku);
      const loop = t => {
        if (!alive) return;
        const dt = Math.min(0.05, (t - last) / 1000); last = t; spawn -= dt;
        if (held.has('ArrowLeft') || held.has('a')) px -= 260 * dt;
        if (held.has('ArrowRight') || held.has('d')) px += 260 * dt;
        px = clamp(px, 16, 324);
        const el2 = (t - start) / 1000;
        if (spawn <= 0) { spawn = Math.max(0.16, 0.5 - el2 * 0.04); objs.push({x: rnd(10, 330), y: -16, v: rnd(160, 240) + el2 * 18}); }
        g.fillStyle = o.bg || '#fff8ec'; g.fillRect(0, 0, 340, 280);
        g.font = '22px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        for (const ob of objs) {
          ob.y += ob.v * dt; g.fillText(sym, ob.x, ob.y);
          if (!ob.dead && Math.abs(ob.y - 248) < 16 && Math.abs(ob.x - px) < 18 && t > hurt) { ob.dead = true; lives--; hurt = t + 600; sfx('bad'); }
        }
        objs = objs.filter(ob => !ob.dead && ob.y < 300);
        drawChar(g, px, 246, hero, {s: 0.75, alpha: t < hurt && (t / 80 | 0) % 2 ? 0.35 : 1});
        const left = DUR - (t - start);
        info.textContent = `${'❤️'.repeat(Math.max(0, lives))} · ${Math.max(0, Math.ceil(left / 1000))}s`;
        if (lives <= 0) { alive = false; return done(false, {msg: o.loseMsg || 'SPLAT!'}); }
        if (left <= 0) { alive = false; return done(true, {msg: 'SURVIVED!'}); }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
      return () => { alive = false; window.removeEventListener('keyup', ku); };
    }
  },

  whack: {
    how: () => 'TAP THE LOOSE BOLTS 🔩 BEFORE THEY POP · KEYS 1-9 · NEED 9',
    run(a, done) {
      const info = el('div', 'how'), grid = el('div', 'grid9'); a.append(info, grid);
      const holes = [...Array(9)].map(() => { const h = el('button', 'hole', ''); grid.appendChild(h); return h; });
      let hits = 0, alive = true; const start = performance.now(), DUR = 12000, need = 9, active = new Map();
      const hit = i => {
        if (!alive || !active.has(i)) return;
        clearTimeout(active.get(i)); active.delete(i);
        holes[i].textContent = '✨'; setTimeout(() => { if (!active.has(i)) holes[i].textContent = ''; }, 200);
        hits++; sfx('tick');
        if (hits >= need) { alive = false; done(true, {msg: 'ALL TIGHT!'}); }
      };
      holes.forEach((h, i) => h.onpointerdown = () => hit(i));
      const pop = () => {
        if (!alive) return;
        const free = [...Array(9).keys()].filter(i => !active.has(i));
        if (free.length) { const i = pick(free); holes[i].textContent = '🔩'; active.set(i, setTimeout(() => { active.delete(i); holes[i].textContent = ''; }, 900)); }
        const left = DUR - (performance.now() - start);
        info.textContent = `TIGHTENED ${hits}/${need} · ${Math.max(0, Math.ceil(left / 1000))}s`;
        if (left <= 0) { alive = false; return done(false, {msg: 'IT FELL APART'}); }
        setTimeout(pop, rnd(380, 620));
      };
      keyHook = e => { const n = parseInt(e.key); if (n >= 1 && n <= 9) hit(n - 1); };
      pop();
      return () => { alive = false; active.forEach(t => clearTimeout(t)); };
    }
  },

  wires: {
    how: () => 'READ THE CLUE · CUT EXACTLY ONE WIRE',
    run(a, done) {
      const p = pick(WIRES);
      a.appendChild(el('div', 'qtext', '🧾 ' + p.clue));
      const wrap = el('div', 'wires'); a.appendChild(wrap);
      let alive = true;
      const cut = (w, c) => {
        if (!alive) return; alive = false; tm.stop();
        w.style.background = `linear-gradient(90deg,${WIRECOL[c]} 46%,transparent 46% 54%,${WIRECOL[c]} 54%)`;
        done(c === p.a, {msg: c === p.a ? 'DEFUSED!' : '💥 BOOM!'});
      };
      p.w.forEach((c, i) => { const w = el('div', 'wire'); w.style.background = WIRECOL[c]; w.onclick = () => cut(w, c); wrap.appendChild(w); });
      keyHook = e => { const n = parseInt(e.key); if (n >= 1 && n <= 4) cut(wrap.children[n - 1], p.w[n - 1]); };
      const tm = timerBar(a, 9 + bonus(), () => { alive = false; done(false, {msg: '💥 BOOM!'}); });
      return () => { alive = false; tm.stop(); };
    }
  },
};
