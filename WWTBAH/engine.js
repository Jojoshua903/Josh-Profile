// Question engine: turns pool entries into playable questions of different kinds.
const POOLS = {
  mcO: QUESTIONS.map((q, i) => i).filter(i => QUESTIONS[i].t === 'o'),
  mcT: QUESTIONS.map((q, i) => i).filter(i => QUESTIONS[i].t === 't'),
  tf: TF.map((q, i) => i), num: NUM.map((q, i) => i), emoji: EMOJI.map((q, i) => i),
  typed: TYPED.map((q, i) => i), order: ORDER.map((q, i) => i), odd: ODD.map((q, i) => i)
};
const POOL_LABEL = {mcO:'Multiple choice', mcT:'Trick question', tf:'True or false', num:'Closest guess', emoji:'Emoji puzzle', typed:'Type the answer', order:'Put in order', odd:'Odd one out'};

const shuf = a => { a = a.slice(); for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pickOne = a => a[Math.floor(Math.random() * a.length)];
const escH = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function norm(s){
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ').replace(/[^a-z0-9 ]/g, ' ').replace(/^\s*(the|a|an)\s+/, '').replace(/\s+/g, '');
}
function lev(a, b){
  const m = a.length, n = b.length; if(!m) return n; if(!n) return m;
  let prev = Array.from({length: n + 1}, (_, j) => j);
  for(let i = 1; i <= m; i++){
    const cur = [i];
    for(let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
function textMatch(input, accepted){
  const x = norm(input); if(!x) return false;
  return accepted.some(a => {
    const y = norm(a);
    if(x === y) return true;
    const tol = y.length >= 12 ? 2 : y.length >= 5 ? 1 : 0;
    if(lev(x, y) <= tol) return true;
    return y.length >= 8 && x.includes(y);
  });
}
const fmtNum = n => (Math.abs(n) >= 1000 ? Math.round(n).toLocaleString() : (Math.round(n * 1000) / 1000).toString());

// Build a playable question from a plan reference
function buildQ(ref){
  const {pool, id} = ref;
  if(pool === 'mcO' || pool === 'mcT'){
    const s = QUESTIONS[id], opts = shuf([s.c, ...s.w]);
    return {kind:'choice', pool, trick: pool === 'mcT', prompt: s.q, fact: s.f, opts, ci: opts.indexOf(s.c)};
  }
  if(pool === 'odd'){
    const s = ODD[id], opts = shuf([s.c, ...s.w]);
    return {kind:'choice', pool, prompt: s.q, fact: s.f, opts, ci: opts.indexOf(s.c)};
  }
  if(pool === 'tf'){
    const s = TF[id];
    return {kind:'tf', pool, prompt: s.q, fact: s.f, opts:['True','False'], ci: s.a ? 0 : 1};
  }
  if(pool === 'num'){ const s = NUM[id]; return {kind:'num', pool, prompt: s.q, fact: s.f, a: s.a, tol: s.tol}; }
  if(pool === 'emoji'){
    const s = EMOJI[id];
    return {kind:'text', pool, emoji: s.e, prompt: `What does this spell out? (${s.h})`, fact: `It's “${s.a[0]}”!`, answers: s.a, bad: s.bad};
  }
  if(pool === 'typed'){ const s = TYPED[id]; return {kind:'text', pool, prompt: s.q, fact: s.f, answers: s.a, bad: s.bad}; }
  if(pool === 'order'){ const s = ORDER[id]; return {kind:'order', pool, prompt: s.q, fact: s.f, items: s.items, shown: shuf(s.items)}; }
}

const TIME_FOR = {choice: 25, tf: 15, num: 30, text: 40, order: 45};

// 1 = full, .5 = half, 0 = nothing
function grade(q, ans){
  if(ans === null || ans === undefined || ans === -1) return 0;
  if(q.kind === 'choice' || q.kind === 'tf') return ans === q.ci ? 1 : 0;
  if(q.kind === 'num'){ const d = Math.abs(+ans - q.a); return isNaN(d) ? 0 : d <= q.tol ? 1 : d <= q.tol * 2.5 ? .5 : 0; }
  if(q.kind === 'text') return textMatch(ans, q.answers) ? 1 : 0;
  if(q.kind === 'order'){ const right = ans.filter((x, i) => x === q.items[i]).length; return right === 4 ? 1 : right >= 2 ? .5 : 0; }
  return 0;
}
function describe(q, ans){
  if(ans === null || ans === undefined || ans === -1 || ans === '') return '⏱ No answer';
  if(q.kind === 'tf') return q.opts[ans];
  if(q.kind === 'choice') return `${'ABCD'[ans]}: ${q.opts[ans]}`;
  if(q.kind === 'num') return fmtNum(+ans);
  if(q.kind === 'text') return `“${ans}”`;
  if(q.kind === 'order') return ans.map((x, i) => `${i + 1}. ${x}`).join('  ');
}
function correctText(q){
  if(q.kind === 'tf') return q.opts[q.ci];
  if(q.kind === 'choice') return `${'ABCD'[q.ci]}: ${q.opts[q.ci]}`;
  if(q.kind === 'num') return fmtNum(q.a);
  if(q.kind === 'text') return q.answers[0];
  if(q.kind === 'order') return q.items.map((x, i) => `${i + 1}. ${x}`).join(' · ');
}

// AI answers
const AI_ACC = {
  sichen: {mcO:.6, mcT:.35, tf:.65, num:.4, emoji:.55, typed:.45, order:.3, odd:.55},
  fyon:   {mcO:.5, mcT:.7,  tf:.55, num:.5, emoji:.4,  typed:.55, order:.4, odd:.6},
  crowd:  {mcO:.7, mcT:.55, tf:.75, num:.6, emoji:.65, typed:.65, order:.5, odd:.7}
};
function aiAnswer(who, q, boost = 0){
  const ok = Math.random() < (AI_ACC[who][q.pool] || .5) + boost;
  if(q.kind === 'choice' || q.kind === 'tf'){
    if(ok) return q.ci;
    return pickOne(q.opts.map((_, i) => i).filter(i => i !== q.ci));
  }
  if(q.kind === 'num'){
    const off = ok ? (Math.random() * 2 - 1) * q.tol : (Math.random() < .5 ? -1 : 1) * q.tol * (1.5 + Math.random() * 3);
    const v = q.a + off;
    return q.a % 1 ? Math.round(v * 10) / 10 : Math.round(v);
  }
  if(q.kind === 'text') return ok ? q.answers[0] : pickOne(q.bad);
  if(q.kind === 'order'){
    if(ok) return q.items.slice();
    let s; do { s = shuf(q.items); } while(s.every((x, i) => x === q.items[i]));
    return s;
  }
}

// Chemmy's Smash lifeline: returns {say, apply(ui)} or null if unavailable for this kind
function smashHint(q){
  if(q.kind === 'tf') return null;
  if(q.kind === 'choice'){
    const gone = shuf(q.opts.map((_, i) => i).filter(i => i !== q.ci)).slice(0, 2);
    return {say: "SMASH! Two wrong answers, gone. Like my opponents in the '89 regionals.", gone};
  }
  if(q.kind === 'num'){
    const w = q.tol * 6, lo = q.a - Math.random() * w, hi = lo + w;
    const r = v => q.a % 1 ? Math.round(v * 10) / 10 : Math.round(v);
    return {say: `SMASH! It's somewhere between ${fmtNum(r(Math.max(0, lo)))} and ${fmtNum(r(hi))}.`};
  }
  if(q.kind === 'text'){
    const a = q.answers[0];
    return {say: `SMASH! It starts with “${a[0].toUpperCase()}” and has ${a.replace(/[^A-Za-z0-9]/g, '').length} letters and numbers in it.`};
  }
  if(q.kind === 'order') return {say: `SMASH! I'll give you number one: “${q.items[0]}”.`, first: q.items[0]};
}

// Renders the answer UI for one player's turn. Calls submit(ans) once.
function renderInput(q, box, submit, ui){
  ui.removed = ui.removed || [];
  if(q.kind === 'choice' || q.kind === 'tf'){
    box.innerHTML = `<div class="answers ${q.kind === 'tf' ? 'tf' : ''}">${q.opts.map((a, i) =>
      `<button class="ans" data-i="${i}" ${ui.removed.includes(i) ? 'disabled' : ''}><span class="k">${q.kind === 'tf' ? (i ? '✗' : '✓') : 'ABCD'[i]}</span><span>${escH(a)}</span></button>`).join('')}</div>`;
    box.querySelectorAll('.ans').forEach(b => {
      if(ui.removed.includes(+b.dataset.i)) b.classList.add('gone');
      b.onclick = () => submit(+b.dataset.i);
    });
    ui.key = k => { const m = q.kind === 'tf' ? {t:0, f:1, '1':0, '2':1} : {a:0, b:1, c:2, d:3, '1':0, '2':1, '3':2, '4':3}; if(k in m && m[k] < q.opts.length && !ui.removed.includes(m[k])) submit(m[k]); };
    ui.applySmash = h => { ui.removed = h.gone; h.gone.forEach(i => { const b = box.querySelector(`.ans[data-i="${i}"]`); b.classList.add('gone'); b.disabled = true; }); };
  }
  else if(q.kind === 'num' || q.kind === 'text'){
    const isNum = q.kind === 'num';
    box.innerHTML = `<div class="typebox">
      <input id="ansIn" class="name big" ${isNum ? 'type="number" step="any" inputmode="decimal" placeholder="Your best guess"' : 'type="text" autocomplete="off" placeholder="Type your answer"'}>
      <button class="bigbtn red lock" id="lockBtn">Lock it in 🔒</button></div>
      ${isNum ? '<div class="note">Spot on (or close) = full money · near-ish = half</div>' : '<div class="note">Spelling doesn’t have to be perfect. Chemmy is generous.</div>'}`;
    const inp = box.querySelector('#ansIn');
    const go = () => { const v = inp.value.trim(); if(!v) { inp.focus(); inp.classList.add('nudge'); setTimeout(() => inp.classList.remove('nudge'), 400); return; } submit(isNum ? parseFloat(v) : v); };
    box.querySelector('#lockBtn').onclick = go;
    inp.onkeydown = e => { if(e.key === 'Enter') go(); };
    setTimeout(() => inp.focus(), 50);
    ui.key = null; ui.applySmash = () => {};
    ui.partial = () => { const v = inp.value.trim(); return v ? (isNum ? parseFloat(v) : v) : null; };
  }
  else if(q.kind === 'order'){
    let seq = ui.first ? [ui.first] : [];
    const draw = () => {
      box.innerHTML = `<div class="orderbox">${q.shown.map(it => {
        const n = seq.indexOf(it);
        return `<button class="ord ${n >= 0 ? 'on' : ''}" data-it="${escH(it)}"><span class="k">${n >= 0 ? n + 1 : '·'}</span><span>${escH(it)}</span></button>`;
      }).join('')}</div>
      <div class="controls" style="margin-top:12px"><button class="life" id="ordReset">↺ Reset</button><span class="note" style="margin:0">Tap the items in order: 1, 2, 3, 4</span>
      <button class="bigbtn red lock" id="lockBtn" ${seq.length === 4 ? '' : 'disabled'} style="margin-left:auto">Lock it in 🔒</button></div>`;
      box.querySelectorAll('.ord').forEach(b => b.onclick = () => {
        const it = b.dataset.it, n = seq.indexOf(it);
        if(n >= 0){ if(!(ui.first && it === ui.first)) seq.splice(n, 1); } else if(seq.length < 4) seq.push(it);
        if(typeof sfx !== 'undefined') sfx.tick(); draw();
      });
      box.querySelector('#ordReset').onclick = () => { seq = ui.first ? [ui.first] : []; draw(); };
      box.querySelector('#lockBtn').onclick = () => { if(seq.length === 4) submit(seq.slice()); };
    };
    draw();
    ui.key = null;
    ui.applySmash = h => { ui.first = h.first; seq = [h.first, ...seq.filter(x => x !== h.first)].slice(0, 4); draw(); };
    ui.partial = () => seq.length === 4 ? seq.slice() : null;
  }
}

// Shows the correct answer state after everyone has played
function renderReveal(q, box, ansByMe){
  if(q.kind === 'choice' || q.kind === 'tf'){
    box.querySelectorAll('.ans').forEach(b => {
      const i = +b.dataset.i; b.disabled = true;
      if(i === q.ci) b.classList.add('right'); else if(i === ansByMe) b.classList.add('wrong');
    });
    if(!box.querySelector('.ans')) box.innerHTML = `<div class="reveal">✅ ${escH(correctText(q))}</div>`;
  } else {
    box.innerHTML = `<div class="reveal"><span class="lbl" style="color:var(--teal-d)">The answer</span><br>${escH(correctText(q))}</div>`;
  }
}
