/* ---------- the studio floor: question + turns ---------- */
const OPENERS = ["Here's your question!", "Ready? Ball's in the air!", "Eyes on the ball…", "Serving now!", "Concentrate, here it comes.", "Lovely. Next serve!"];

function questionScreen(){
  stopTimer(); setScene('board');
  const ri = S.rounds[S.pos], R = ROUNDS[ri], q = buildQ(S.plan[S.pos]), val = S.values[S.pos];
  cur = {q, val, turn: 0, answers: {}, advice: {}, done: false, active: false, ui: {}};
  S.players.filter(p => !p.human).forEach(p => cur.answers[p.id] = aiAnswer(p.key, q));
  saveGame(true); updateTop();
  const inRound = S.rounds.slice(0, S.pos).filter(r => r === ri).length + 1, perRound = S.rounds.filter(r => r === ri).length;
  const order = LENGTHS[S.length].rounds, rNum = order.indexOf(ri);
  const tree = order.map((x, i) => { const first = S.rounds.indexOf(x); return `<li class="${i < rNum ? 'done' : i === rNum ? 'now' : ''}"><span>${ROUNDS[x].name}</span><b>$${S.values[first]}</b></li>`; }).reverse().join('');
  stage.innerHTML = `
    <div class="set">
      <div class="host booth"><div class="host-say"><span class="who">CHEMMY</span><span id="hostText"></span></div>
        <div class="hostfig">${AVB('chemmy')}<div class="lectern"><span>CHEMMY</span></div></div></div>
      <div class="screenwrap"><div class="truss-cables"></div>
        <div class="qcard" id="qcard">
          <div class="qmeta"><span>${R.name} · Q${inRound}/${perRound}</span><span class="fmt">${POOL_LABEL[q.pool]}</span><span class="val">$${val}</span></div>
          ${q.emoji ? `<div class="emoji">${q.emoji}</div>` : ''}
          <div class="qtext">${esc(q.prompt)}</div>
          <div class="ring" id="timer"><svg viewBox="0 0 44 44"><circle class="trk" cx="22" cy="22" r="19"/><circle class="prog" cx="22" cy="22" r="19" pathLength="100"/></svg><span class="tnum" id="tnum"></span></div>
          <div class="curtain hidden" id="curtain"></div>
        </div></div>
      <aside class="tower">
        <div class="onair">● ON AIR</div>
        <div class="applause" id="applause">APPLAUSE</div>
        <ol class="tree">${tree}</ol>
      </aside>
      <div class="podiums" style="--n:${S.players.length}">${S.players.map(podium).join('')}</div>
      <div class="desk">
        <div class="deskhead"><span class="whoturn" id="whoTurn"></span><span class="deskled" id="deskLed"></span></div>
        <div id="inputBox"></div>
        <div id="advice" class="advice hidden"></div>
        <div class="controls">
          <button class="life" id="lSmash"><span class="ic">🏓</span>Chemmy's Smash</button>
          <button class="life" id="lEgg"><span class="ic">${S.ai ? '🥚' : '🙋'}</span>${S.ai ? 'Ask the Egg' : 'Ask the Audience'}</button>
          <button class="life" id="lTime" title="Stops the clock for this turn"><span class="ic">⏸</span>Timeout</button>
          <button class="bigbtn next hidden" id="nextBtn">Next ▶</button>
        </div>
      </div>
    </div>`;
  $('#lSmash').onclick = useSmash; $('#lEgg').onclick = useEgg; $('#lTime').onclick = useTimeout;
  $('#nextBtn').onclick = next;
  startTurn();
}
function podium(p){
  return `<div class="podium ${p.human ? 'you' : ''}" id="p-${p.id}" style="--accent:${lookOf(p).shirt}"><div class="bubble" id="b-${p.id}"></div>
    <div class="avwrap">${avatarBare(p)}</div>
    <div class="base"><div class="nm">${esc(p.name)}</div><div class="money" id="m-${p.id}">$${p.money}</div><div class="atag" id="t-${p.id}"></div></div></div>`;
}
const activePlayer = () => humans()[cur.turn];

function startTurn(){
  const p = activePlayer(), q = cur.q, multi = humans().length > 1;
  cur.ui = {}; cur.left = TIME_FOR[q.kind]; cur.frozen = false; cur.active = false;
  document.querySelectorAll('.podium').forEach(el => el.classList.toggle('turn', el.id === 'p-' + p.id));
  $('#lSmash').disabled = !p.life.smash || q.kind === 'tf';
  $('#lSmash').title = q.kind === 'tf' ? "No smashing true or false. That'd be cheating." : "A hint from Chemmy";
  $('#lEgg').disabled = !p.life.egg; $('#lTime').disabled = !p.life.time;
  $('#timer').classList.remove('frozen', 'low'); $('#timer .prog').style.strokeDashoffset = 0; $('#tnum').textContent = cur.left;
  $('#advice').classList.add('hidden');
  $('#inputBox').innerHTML = '';
  $('#whoTurn').innerHTML = `<span class="dot" style="background:${lookOf(p).shirt}"></span>${esc(p.name)}'s desk`;
  $('#deskLed').textContent = '$' + p.money;
  const begin = () => {
    $('#curtain').classList.add('hidden');
    renderInput(q, $('#inputBox'), submitTurn, cur.ui);
    Anim.inputs($('#inputBox'));
    cur.active = true; sfx.ping(); startTimer();
    chemmySay((multi ? `${p.name}, you're up! ` : '') + rnd(OPENERS) + (q.pool === 'mcT' && S.rounds[S.pos] === 8 ? ' (Psst… read it carefully.)' : ''));
    if(cur.turn === 0 && Math.random() < .45) setTimeout(() => aiChatter(cur), 1400);
  };
  if(multi){
    const c = $('#curtain');
    c.innerHTML = `<div class="ctn">${avatar(p)}<div class="lbl">Pass the device to</div><div class="cname">${esc(p.name)}</div>
      <p>Everyone else, eyes off the screen!</p><button class="bigbtn ylw" id="readyBtn">I'm ready, serve it! ▶</button></div>`;
    c.classList.remove('hidden');
    $('#readyBtn').onclick = begin; setTimeout(() => $('#readyBtn') && $('#readyBtn').focus({preventScroll: true}), 50);
    chemmySay(`Pass it over to ${p.name}!`);
  } else begin();
}
function startTimer(){
  stopTimer();
  const total = TIME_FOR[cur.q.kind], bar = $('#timer .prog'), ring = $('#timer'), num = $('#tnum'); let last = total;
  timerId = setInterval(() => {
    if(!cur || cur.frozen || !cur.active) return;
    cur.left = Math.max(0, cur.left - .1);
    bar.style.strokeDashoffset = 100 - cur.left / total * 100;
    ring.classList.toggle('low', cur.left <= 5);
    const s = Math.ceil(cur.left); num.textContent = s;
    if(s !== last && s <= 5 && s > 0) sfx.tick(); last = s;
    if(cur.left <= 0){ const part = cur.ui.partial ? cur.ui.partial() : null; submitTurn(part === null || part === undefined ? -1 : part, true); }
  }, 100);
}
function submitTurn(ans, timedOut){
  if(!cur || !cur.active) return;
  cur.active = false; stopTimer();
  const p = activePlayer();
  cur.answers[p.id] = ans;
  if(timedOut && ans === -1) toast(`⏱ Time's up for ${esc(p.name)}!`);
  const t = $('#t-' + p.id); if(t) t.innerHTML = '🔒 Locked in';
  document.querySelectorAll('#inputBox button, #inputBox input').forEach(el => el.disabled = true);
  ['lSmash', 'lEgg', 'lTime'].forEach(id => $('#' + id).disabled = true);
  sfx.ping();
  cur.turn++;
  const me = cur;
  setTimeout(() => { if(cur !== me || !S) return; cur.turn < humans().length ? startTurn() : reveal(); }, 550);
}

/* ---------- contestants muttering while you think ---------- */
function aiChatter(me){
  if(cur !== me || !cur.active) return;
  const ais = S.players.filter(p => !p.human && LINES[p.key + 'Think']);
  if(!ais.length) return;
  const p = rnd(ais), b = $('#b-' + p.id); if(!b) return;
  const line = rnd(LINES[p.key + 'Think']);
  b.innerHTML = esc(line); b.classList.add('show');
  if(p.key === 'sichen') countJoke(line);
  setTimeout(() => { if(cur === me && !cur.done) b.classList.remove('show'); }, 4500);
}

/* ---------- lifelines ---------- */
function useSmash(){
  const p = activePlayer(); if(!cur.active || !p.life.smash) return;
  const h = smashHint(cur.q); if(!h) return;
  p.life.smash = false; p.used++; $('#lSmash').disabled = true;
  cur.ui.applySmash(h); chemmySay(h.say); sfx.ping(); saveGame(true);
}
function useEgg(){
  const p = activePlayer(); if(!cur.active || !p.life.egg) return;
  p.life.egg = false; p.used++; $('#lEgg').disabled = true;
  const q = cur.q, fromFyon = S.ai, adv = fromFyon ? cur.answers.fyon : aiAnswer('crowd', q);
  cur.advice[p.id] = {ans: adv, fyon: fromFyon};
  let txt;
  if(fromFyon){
    const removed = (cur.ui.removed || []).includes(adv);
    txt = removed ? `I'd have said <b>${esc(describe(q, adv))}</b>, but Chemmy's after smashing that one. Sure pick one of the others.`
      : rnd([`Ah, I'd go with <b>${esc(describe(q, adv))}</b>. But don't quote me, I've a yolk for a brain.`,
             `<b>${esc(describe(q, adv))}</b>, I'd say. I can feel it in me shell.`,
             `Hmm… <b>${esc(describe(q, adv))}</b>? I'm about 60% sure, which is high for an egg.`]);
    const b = $('#b-fyon'); if(b){ b.innerHTML = txt; b.classList.add('show'); }
  } else txt = `The studio audience mostly shouted <b>${esc(describe(q, adv))}</b>. Then someone shouted "PING!" for no reason.`;
  const box = $('#advice');
  box.innerHTML = `${fromFyon ? AV.fyon : '<span class="crowd">👥</span>'}<div>${txt}</div>`;
  box.classList.remove('hidden'); sfx.ping(); saveGame(true);
}
function useTimeout(){
  const p = activePlayer(); if(!cur.active || !p.life.time) return;
  p.life.time = false; p.used++; $('#lTime').disabled = true;
  cur.frozen = true; $('#timer').classList.add('frozen'); $('#tnum').textContent = '⏸';
  chemmySay("TIMEOUT! Clock's frozen for this turn. Take a sip of water, have a think.");
  sfx.ping(); saveGame(true);
}

/* ---------- reveal ---------- */
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function reveal(){
  cur.done = true;
  const q = cur.q, val = cur.val, hs = humans();
  document.querySelectorAll('.podium').forEach(el => el.classList.remove('turn'));
  $('#curtain').classList.add('hidden');
  $('#whoTurn').innerHTML = '🎬 The answer is…';
  const box = $('#inputBox');
  if(q.kind === 'choice' || q.kind === 'tf') renderInput(q, box, () => {}, {removed: []});
  renderReveal(q, box, hs.length === 1 ? cur.answers[hs[0].id] : -1);

  const res = {};
  S.players.forEach(p => {
    const ans = cur.answers[p.id], g = grade(q, ans), earned = g === 1 ? val : g === .5 ? Math.floor(val / 2) : 0;
    res[p.id] = {ans, g, earned};
    p.money += earned; if(g === 1) p.full++;
    if(!p.human) return;
    p.prevStreak = p.streak || 0; p.streak = g === 1 ? p.prevStreak + 1 : 0;
    if(q.pool === 'mcT'){ p.st.trickN++; if(g === 1) p.st.trickR++; }
    if(q.pool === 'emoji' && g === 1) p.st.emoji++;
    if(q.kind === 'order' && g === 1) p.st.orderFull++;
    if(q.kind === 'num' && Math.abs(+ans - q.a) < 1e-9){ p.st.bull++; unlock('bullseye'); }
    const adv = cur.advice[p.id];
    if(adv && adv.fyon && g === 1 && same(adv.ans, ans)){ p.st.egg++; unlock('eggadvice'); }
  });
  if(res.jacques && res.jacques.g < 1 && hs.some(p => res[p.id].g === 1)) unlock('blinded');
  const tag = (p, r) => {
    const t = $('#t-' + p.id); if(!t) return;
    const ic = r.g === 1 ? '✅' : r.g === .5 ? '🌗' : '❌';
    t.innerHTML = `<span class="res ${r.g === 1 ? 'ok' : r.g ? 'half' : 'no'}">${ic} ${esc(describe(q, r.ans))}${r.earned ? ` <b>+$${r.earned}</b>` : ''}</span>`;
    if(r.earned) flashMoney(p);
  };
  hs.forEach(p => tag(p, res[p.id]));
  if(hs.length === 1) $('#deskLed').textContent = '$' + hs[0].money;

  const best = Math.max(...hs.map(p => res[p.id].g));
  if(best === 1){ sfx.right(); applause(); } else best ? sfx.half() : sfx.wrong();
  let line;
  if(hs.length === 1){
    const r = res[hs[0].id];
    line = r.ans === -1 ? rnd(LINES.chemmyTimeout) : r.g === 1 ? rnd(LINES.chemmyRight) : r.g ? rnd(LINES.chemmyHalf) : rnd(LINES.chemmyWrong);
    const p0 = hs[0];
    if(p0.streak >= 3) line = rnd(LINES.chemmyStreak).replace('{n}', p0.streak) + ' ' + line;
    else if(p0.streak === 0 && p0.prevStreak >= 3) line = rnd(LINES.chemmyStreakEnd).replace('{n}', p0.prevStreak) + ' ' + line;
  } else {
    const n = hs.filter(p => res[p.id].g === 1).length;
    line = n === hs.length ? "Everyone got it! What a rally!" : n === 0 ? "Nobody got it! Into the net, the lot of ya." : `${n} of ${hs.length} got it! ${rnd(LINES.chemmyRight)}`;
  }
  chemmySay(`${line} ${q.kind === 'choice' || q.kind === 'tf' ? '' : 'The answer: ' + correctText(q) + '. '}${q.fact}`);

  const me = cur;
  S.players.filter(p => !p.human).forEach((p, i) => setTimeout(() => {
    if(cur !== me || !$('#b-' + p.id)) return;
    const r = res[p.id]; tag(p, r);
    const line = rnd(LINES[p.key + (r.g === 1 ? 'Right' : 'Wrong')]);
    const b = $('#b-' + p.id); b.innerHTML = esc(line); b.classList.add('show');
    if(p.key === 'sichen') countJoke(line);
  }, 500 + i * 650));

  S.pos++;
  if(S.pos >= S.plan.length) hs.forEach(p => { if(p.full === S.plan.length){ p.money += 1; p.perfect = true; } });
  saveGame(true); updateTop();
  setTimeout(() => {
    if(cur !== me) return;
    const nb = $('#nextBtn'); if(!nb) return;
    nb.textContent = S.pos >= S.plan.length ? 'Final results 🏆' : (S.rounds[S.pos] !== S.rounds[S.pos - 1] ? 'Next round ▶' : 'Next question ▶');
    nb.classList.remove('hidden'); nb.focus({preventScroll: true});
  }, 1800);
}
function flashMoney(p){
  const el = $('#m-' + p.id), pd = $('#p-' + p.id); if(!el) return;
  Anim.count(el, 0, p.money);
  Anim.jump(pd.querySelector('.avwrap'));
  pd.classList.remove('lit'); void pd.offsetWidth; pd.classList.add('lit');
}
function next(){ sfx.ping(); resume(); }

/* ---------- end: the winners' podium ---------- */
function endScreen(){
  stopTimer(); cur = null; setScene('end');
  const hs = humans(), all = S.players.slice().sort((a, b) => b.money - a.money);
  const top = all[0].money, topHuman = hs.slice().sort((a, b) => b.money - a.money)[0];
  const winners = all.filter(p => p.money === top), humanWon = winners.some(p => p.human);
  const anyPerfect = hs.some(p => p.perfect);
  const ai = k => S.players.find(x => x.key === k);

  if(!S.recorded){
    const board = store.get(HS_KEY, []);
    hs.forEach(p => board.push({name: p.name, money: p.money, date: Date.now(), mode: LENGTHS[S.length].label, party: hs.length > 1, perfect: !!p.perfect}));
    board.sort((a, b) => b.money - a.money || a.date - b.date); board.splice(10);
    store.set(HS_KEY, board); S.recorded = true;
    if(anyPerfect) unlock('perfect');
    if(humanWon && top > 0) unlock('winner');
    if(S.ai && hs.some(p => p.money > ai('sichen').money && p.money > ai('fyon').money)) unlock('beatai');
    if(S.jq && hs.some(p => p.money > ai('jacques').money)) unlock('beatjacques');
    if(hs.some(p => p.st.trickN > 0 && p.st.trickR === p.st.trickN)) unlock('trick');
    if(hs.some(p => p.st.emoji >= 3)) unlock('emoji');
    if(hs.some(p => p.st.orderFull >= 2)) unlock('order');
    if(hs.some(p => p.used === 0)) unlock('nolife');
    if(hs.length >= 3) unlock('party');
    if(S.length === 'marathon') unlock('marathon');
  }
  const solo = hs.length === 1, you = topHuman.money;
  const headline = anyPerfect ? "A PERFECT GAME! HUNDREDAIRE!"
    : winners.length > 1 ? "A tie at the top!"
    : winners[0].human ? (solo ? "You won the night!" : `${winners[0].name} wins!`)
    : `${winners[0].name} takes the crown!`;
  const words = anyPerfect
    ? "Every single one right! I've seen a lot of perfect games and I played most of them. Here's my final dollar. One hundred dollars, hundredaire!"
    : winners.length > 1 ? `Level at the top on $${top}. In table tennis we'd play deuce, but the studio's booked.`
    : winners[0].human ? `${winners[0].name} wins with $${top}! Not quite a hundredaire, but enough for a very nice paddle.`
    : `${winners[0].name} wins it with $${top}. ${solo ? 'You' : 'The humans'} will be back. Practise the footwork!`;
  const quips = [
    S.ai && ['sichen', `Great game! One more for the road: ${JOKE}`],
    S.ai && ['fyon', humanWon ? "Fair play to ya. I'm egg-static for ya, honest." : "Ah sure look, I'll be back next week. If I don't get poached."],
    S.jq && ['jacques', humanWon ? "Magnifique. You may look directly at me, just zis once." : "Of course I am still ze tallest winner in ze room. Au revoir!"]
  ].filter(Boolean);
  stage.innerHTML = `
    <div class="wide">
      <div class="bigscreen">
        <div class="lbl">Final results · ${LENGTHS[S.length].label} game</div>
        <div class="roundbig">${esc(headline)}</div>
        <div class="cheque">
          <div class="row"><small>The Ping Pong Palace Bank · Pay to the order of</small><small>${new Date().toLocaleDateString()}</small></div>
          <div class="row" style="margin:8px 0 10px"><b class="payee">${esc(topHuman.name)}</b><span class="amt">$${you}.00</span></div>
          <div class="row"><small>${topHuman.full}/${S.plan.length} fully correct · lifelines used: ${topHuman.used}</small><span class="sig">Chemmy</span></div>
        </div>
        ${!solo ? `<table class="hs mini">${hs.slice().sort((a, b) => b.money - a.money).map(p => `<tr><td><span class="dot" style="background:${lookOf(p).shirt}"></span><b>${esc(p.name)}</b></td><td class="tiny">${p.full}/${S.plan.length} right · ${p.st.trickR}/${p.st.trickN} tricks · ${p.used} lifelines</td><td class="r">$${p.money}</td></tr>`).join('')}</table>` : ''}
      </div>
      <div class="host centrehost"><div class="hostfig">${AVB('chemmy')}<div class="lectern"><span>CHEMMY</span></div></div>
        <div class="host-say"><span class="who">CHEMMY</span><span id="hostText"></span></div></div>
      ${lineup(all, {final: true})}
      ${quips.length ? `<div class="quips">${quips.map(([k, t]) => `<div class="quip">${AV[k]}<div><b>${k.toUpperCase()}</b>${esc(t)}</div></div>`).join('')}</div>` : ''}
      <div class="endbtns"><button class="bigbtn red" id="againBtn">Play again</button><button class="bigbtn ylw" id="homeBtn">Main menu</button></div>
    </div>`;
  chemmySay(words); if(S.ai) countJoke(JOKE);
  store.del(SAVE_KEY);
  if(humanWon || anyPerfect){ sfx.fanfare(); confetti(anyPerfect ? 160 : 90); applause(); } else sfx.wrong();
  const setup = store.get(SETUP_KEY, null);
  $('#againBtn').onclick = () => setup ? newGame(setup) : titleScreen();
  $('#homeBtn').onclick = titleScreen;
  updateTop();
}

/* ---------- keyboard ---------- */
document.addEventListener('keydown', e => {
  if(!cur || e.target.tagName === 'INPUT') return;
  const k = e.key.toLowerCase();
  if(cur.active && cur.ui.key){ cur.ui.key(k); return; }
  if(cur.done && k === 'enter' && $('#nextBtn') && !$('#nextBtn').classList.contains('hidden')){ e.preventDefault(); next(); }
});

// Safety net: if a question ever fails to build or render, skip it rather than freezing the show
const _questionScreen = questionScreen;
questionScreen = function(){
  try{ _questionScreen(); }
  catch(e){
    console.error(e); stopTimer();
    toast("⚠️ That question clipped the net. Chemmy's serving the next one!");
    if(S){ S.pos++; saveGame(true); setTimeout(resume, 900); }
  }
};
