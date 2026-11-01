const ROUNDS = [
  {name:"Warm-Up Serve", sub:"Obscure multiple choice to loosen the wrist", pools:['mcO']},
  {name:"True or Ball?", sub:"Quick-fire true or false. 15 seconds each!", pools:['tf']},
  {name:"Trick Shots", sub:"Every question has spin on it. Read every word.", pools:['mcT']},
  {name:"Emoji Rally", sub:"Decode the emoji. Type your answer.", pools:['emoji']},
  {name:"Closest to the Net", sub:"Guess the number. Close counts!", pools:['num']},
  {name:"Order of Play", sub:"Tap four things into the right order", pools:['order']},
  {name:"Odd Ball Out", sub:"Find the one that doesn't belong", pools:['odd']},
  {name:"Write-In Wrist", sub:"No options. Just you and the keyboard.", pools:['typed']},
  {name:"Match Point", sub:"Every format, biggest money. Anything goes!", pools:['mcO','mcT','tf','num','emoji','typed','order','odd']}
];
const LENGTHS = {
  quick:    {label:'Quick',    rounds:[0,1,2,4,8], per:2, blurb:'5 rounds · 10 questions'},
  standard: {label:'Standard', rounds:[0,1,2,3,4,5,6,7,8], per:2, blurb:'9 rounds · 18 questions'},
  marathon: {label:'Marathon', rounds:[0,1,2,3,4,5,6,7,8], per:3, blurb:'9 rounds · 27 questions'}
};
const ROUND_INTROS = [
  "Shake out those wrists. We start with some properly obscure multiple choice.",
  "True or Ball? It's quick-fire: true or false, and only 15 seconds each. Don't think, just swing!",
  "Careful now. Every question this round has a trick in it.",
  "Emoji Rally! I show you little pictures and you tell me what they mean. Like texting my nephew.",
  "Closest to the Net! Guess the number. Close enough gets the full money, near-ish gets half.",
  "Order of Play! Four things, one right order. Get it perfect for the full money, half right for half.",
  "Odd Ball Out! Three belong together. One's the odd one. Like me at a tennis club.",
  "Write-In Wrist! No options to hide behind. Just type it in.",
  "MATCH POINT! Every kind of question, and the biggest money of the night."
];
const SAVE_KEY = 'hundredaire_save_v2', HS_KEY = 'hundredaire_scores_v2', META_KEY = 'hundredaire_meta_v1', SETUP_KEY = 'hundredaire_setup_v2';

const mem = {};
const store = {
  get(k, d){ try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }catch(e){ return k in mem ? mem[k] : d; } },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){ mem[k] = v; } },
  del(k){ try{ localStorage.removeItem(k); }catch(e){ delete mem[k]; } }
};
const $ = s => document.querySelector(s);
const screen = $('#screen');
const rnd = pickOne, shuffle = shuf, esc = escH;

let S = null, cur = null, timerId = null, typeId = null;
let meta = Object.assign({sound:true, jokes:0, ach:{}}, store.get(META_KEY, {}));
meta.ach = meta.ach || {};
if(!store.get(HS_KEY, null)){ const old = store.get('hundredaire_scores_v1', []); if(old.length) store.set(HS_KEY, old.map(h => ({name: h.name, money: h.money, date: h.date, mode: 'Classic', perfect: !!h.won}))); }

/* ---------- sound ---------- */
let actx = null;
function tone(f, d = .12, type = 'sine', vol = .18, when = 0){
  if(!meta.sound) return;
  try{
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const t = actx.currentTime + when, o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
    o.connect(g).connect(actx.destination); o.start(t); o.stop(t + d);
  }catch(e){}
}
const sfx = {
  ping(){ tone(1400, .06, 'sine', .2); tone(1100, .06, 'sine', .15, .14); },
  right(){ [523, 659, 784, 1046].forEach((f, i) => tone(f, .18, 'triangle', .16, i * .09)); },
  half(){ [523, 659].forEach((f, i) => tone(f, .18, 'triangle', .14, i * .1)); },
  wrong(){ tone(160, .4, 'sawtooth', .12); tone(120, .45, 'sawtooth', .1, .12); },
  tick(){ tone(900, .03, 'square', .05); },
  fanfare(){ [392, 523, 659, 784, 659, 784, 1046].forEach((f, i) => tone(f, .22, 'triangle', .15, i * .13)); },
  rimshot(){ tone(200, .08, 'square', .1); tone(1800, .15, 'triangle', .08, .12); },
  ach(){ [880, 1175, 1568].forEach((f, i) => tone(f, .15, 'sine', .14, i * .08)); }
};

/* ---------- helpers ---------- */
function toast(msg){ const t = $('#toast'); t.innerHTML = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2800); }
function saveMeta(){ store.set(META_KEY, meta); }
function bestScore(){ const hs = store.get(HS_KEY, []); return hs.length ? hs[0].money : 0; }
const humans = () => S.players.filter(p => p.human);
const avatar = p => p.key ? AV[p.key] : drawAvatar(p.look || defaultLook(+p.id.slice(1) || 0));
const roundOf = pos => S.rounds[Math.min(pos, S.rounds.length - 1)];
function updateTop(){
  const live = S ? Math.max(...humans().map(p => p.money)) : 0;
  $('#bestChip b').textContent = '$' + Math.max(bestScore(), live);
  $('#jokeChip b').textContent = meta.jokes;
  $('#soundBtn').textContent = meta.sound ? '🔊 Sound' : '🔇 Muted';
  ['#saveBtn', '#quitBtn', '#roundChip'].forEach(id => $(id).classList.toggle('hidden', !S));
  if(S){ $('#roundChip b').textContent = `Q${Math.min(S.pos + 1, S.plan.length)}/${S.plan.length}`; }
}
function unlock(id){
  if(meta.ach[id]) return;
  meta.ach[id] = Date.now(); saveMeta();
  const a = ACHIEVEMENTS.find(x => x.id === id);
  const un = unlocksFor(id);
  setTimeout(() => { sfx.ach(); toast(`${a.ic} Achievement unlocked: <b>${a.n}</b>${un.length ? `<br>🎁 New look: ${esc(un.join(', '))}` : ''}`); }, 600);
}
function countJoke(text){
  if(!/airplane/i.test(text)) return;
  meta.jokes++; saveMeta(); updateTop(); sfx.rimshot();
  if(meta.jokes >= 25) unlock('jokes');
}
function chemmySay(text, el = $('#hostText')){
  clearInterval(typeId); if(!el) return;
  const host = el.closest('.host'), av = host && host.querySelector('.av');
  if(av) av.classList.add('talking');
  const stop = () => { clearInterval(typeId); if(av) av.classList.remove('talking'); };
  // Reserve the full line's space up front so the layout below doesn't jump while typing
  el.innerHTML = '<span class="ghost"></span><span class="typed"></span>';
  const ghost = el.firstChild, typed = el.lastChild; ghost.textContent = text;
  let i = 0;
  typeId = setInterval(() => { i += 2; typed.textContent = text.slice(0, i); if(i >= text.length) stop(); }, 16);
  el.onclick = () => { stop(); typed.textContent = text; };
}
function saveGame(silent){
  if(!S) return;
  S.savedAt = Date.now(); store.set(SAVE_KEY, S);
  if(!silent) toast("💾 Saved! Chemmy put your game in the trophy cabinet.");
}
function confetti(n = 80){
  const cols = ['#E2412B', '#F2B230', '#1E8C84', '#F49AA8', '#24345C'];
  for(let i = 0; i < n; i++){
    const c = document.createElement('div'); c.className = 'confetti';
    c.style.left = Math.random() * 100 + 'vw'; c.style.background = rnd(cols);
    c.style.animationDuration = (2 + Math.random() * 2.5) + 's'; c.style.animationDelay = Math.random() * .8 + 's';
    document.body.appendChild(c); setTimeout(() => c.remove(), 5500);
  }
}
function stopTimer(){ clearInterval(timerId); timerId = null; }

/* ---------- title + setup ---------- */
function titleScreen(){
  S = null; cur = null; stopTimer(); updateTop();
  const save = store.get(SAVE_KEY, null), hs = store.get(HS_KEY, []);
  const setup = Object.assign({n:1, names:['','','',''], ai:true, jacques:true, length:'standard', looks:[]}, store.get(SETUP_KEY, {}));
  setup.looks = [0,1,2,3].map(i => sanitizeLook((setup.looks || [])[i] || defaultLook(i)));
  const achCount = ACHIEVEMENTS.filter(a => meta.ach[a.id]).length;
  screen.innerHTML = `
    <div class="marquee">
      <div class="hero-cast"><div class="hc hc-s">${AV.sichen}</div><div class="hc hc-c">${AV.chemmy}</div><div class="hc hc-f">${AV.fyon}</div><div class="hc hc-j">${AV.jacques}</div></div>
      <div class="pre">Live from the Ping Pong Palace</div>
      <h1><span class="h1a">Who wants to be a</span><span class="h1b">Hundred<em>$</em>aire</span><span class="h1q">?</span></h1>
      <div class="tag">Up to 4 players · 7 kinds of question · ${Object.values(POOLS).reduce((a, p) => a + p.length, 0)} questions · up to $100 in real pretend money</div>
    </div>
    <div class="title-grid">
      <div class="card">
        <h2>Set up tonight's show</h2>
        <label class="lbl">How many human players?</label>
        <div class="seg" id="segN">${[1,2,3,4].map(n => `<button data-n="${n}" class="${setup.n === n ? 'on' : ''}">${n === 1 ? 'Solo' : n + ' players'}</button>`).join('')}</div>
        <div id="nameBox"></div>
        <label class="lbl">Game length</label>
        <div class="seg" id="segL">${Object.entries(LENGTHS).map(([k, L]) => `<button data-l="${k}" class="${setup.length === k ? 'on' : ''}">${L.label}<small>${L.blurb}</small></button>`).join('')}</div>
        <label class="toggle"><input type="checkbox" id="aiTog" ${setup.ai ? 'checked' : ''}><span></span>Include Sichen & Fyon as AI contestants</label>
        <label class="toggle"><input type="checkbox" id="jqTog" ${setup.jacques ? 'checked' : ''}><span></span>Include Jacques as an AI contestant</label>
        <button class="bigbtn" id="newBtn">▶ Start the show</button>
        <button class="bigbtn ylw" id="contBtn" ${save ? '' : 'disabled'}>⟲ Continue saved game</button>
        <div class="savemeta">${save ? `${esc(save.players.filter(p => p.human).map(p => p.name).join(', '))} · Q${save.pos + 1} of ${save.plan.length} · saved ${new Date(save.savedAt).toLocaleString()}` : 'No saved game yet'}</div>
      </div>
      <div class="card">
        <h2>Tonight's cast</h2>
        <div class="cast">
          <div class="cast-row">${AV.chemmy}<div><b>Chemmy, your host</b><p>Retired table tennis champion. Will tell you about the 1987 Regional Final whether you ask or not.</p></div></div>
          <div class="cast-row">${AV.sichen}<div><b>Sichen</b><p>The jokester. Has exactly one joke. It's about an airplane. You'll hear it.</p></div></div>
          <div class="cast-row">${AV.fyon}<div><b>Fyon</b><p>From Mullingar, with an egg for a head. Weirdly good at trick questions. Fragile under pressure.</p></div></div>
          <div class="cast-row">${AV.jacques}<div><b>Jacques</b><p>Two metres tall, with glasses so shiny the studio lights bounce off them. Great at guessing numbers.</p></div></div>
        </div>
        <h2 style="margin-top:18px">🏆 High scores</h2>
        ${hs.length ? `<table class="hs">${hs.map((h, i) => `<tr><td class="n">${i + 1}</td><td><b>${esc(h.name)}</b>${h.perfect ? ' 👑' : ''}<br><span class="tiny">${esc(h.mode || '')}${h.party ? ' · party' : ''} · ${new Date(h.date).toLocaleDateString()}</span></td><td class="r">$${h.money}</td></tr>`).join('')}</table>` : `<p class="empty">Nobody's made the board yet. Be the first!</p>`}
      </div>
    </div>
    <div class="card" style="margin-top:20px">
      <h2>Achievements <span class="tiny">${achCount}/${ACHIEVEMENTS.length} unlocked</span></h2>
      <div class="achs">${ACHIEVEMENTS.map(a => { const un = unlocksFor(a.id); return `<div class="ach ${meta.ach[a.id] ? 'got' : ''}" title="${esc(a.d)}"><span class="ic">${meta.ach[a.id] ? a.ic : '🔒'}</span><b>${a.n}</b><small>${a.d}</small>${un.length ? `<em class="unl">${meta.ach[a.id] ? '✨ Unlocked' : '🎁 Unlocks'}: ${esc(un.join(', '))}</em>` : ''}</div>`; }).join('')}</div>
    </div>
    <div class="card how" style="margin-top:20px">
      <h2>How to play</h2>
      <div class="howgrid">
        <div><b>🔤 Multiple choice & odd one out</b>Pick A–D (or press the key).</div>
        <div><b>✓✗ True or Ball?</b>True or false, 15 seconds. Press T or F.</div>
        <div><b>🎯 Closest guess</b>Type a number. Close = full money, near-ish = half.</div>
        <div><b>🤩 Emoji & write-in</b>Type the answer. Small typos are forgiven.</div>
        <div><b>📋 Order of play</b>Tap four items in order. All right = full, half right = half.</div>
        <div><b>👥 Party mode</b>Everyone answers in turn. Pass the device when told, and no peeking!</div>
        <div><b>🏓 Lifelines</b>Each player gets Chemmy's Smash (a hint), Ask the Egg (or the Audience) and a Timeout, once each.</div>
        <div><b>💯 The $100</b>Questions pay up to $99. A perfect game earns Chemmy's final dollar.</div>
      </div>
    </div>`;

  const st = setup;
  const drawNames = () => {
    $('#nameBox').innerHTML = Array.from({length: st.n}, (_, i) =>
      `<div class="pname"><button class="mini-av" data-c="${i}" title="Customise your contestant">${drawAvatar(st.looks[i])}<span>🎨</span></button><input class="name" data-i="${i}" maxlength="16" placeholder="Player ${i + 1} name" value="${esc(st.names[i] || '')}"><button class="tbtn alt" data-c="${i}">Customise</button></div>`).join('');
    document.querySelectorAll('#nameBox [data-c]').forEach(b => b.onclick = () => {
      const i = +b.dataset.c;
      openCreator(st.looks[i], (st.names[i] || '').trim() || `Player ${i + 1}`, L => { st.looks[i] = L; store.set(SETUP_KEY, st); drawNames(); sfx.ach(); });
    });
    document.querySelectorAll('#nameBox input').forEach(inp => {
      inp.oninput = () => { st.names[+inp.dataset.i] = inp.value; };
      inp.onkeydown = e => { if(e.key === 'Enter') $('#newBtn').click(); };
    });
  };
  drawNames();
  document.querySelectorAll('#segN button').forEach(b => b.onclick = () => {
    st.n = +b.dataset.n; document.querySelectorAll('#segN button').forEach(x => x.classList.toggle('on', x === b)); drawNames(); sfx.tick();
  });
  document.querySelectorAll('#segL button').forEach(b => b.onclick = () => {
    st.length = b.dataset.l; document.querySelectorAll('#segL button').forEach(x => x.classList.toggle('on', x === b)); sfx.tick();
  });
  $('#aiTog').onchange = e => { st.ai = e.target.checked; };
  $('#jqTog').onchange = e => { st.jacques = e.target.checked; };
  $('#newBtn').onclick = () => {
    if(save && !confirm('Starting a new game will overwrite your saved game. Carry on?')) return;
    store.set(SETUP_KEY, st); newGame(st);
  };
  $('#contBtn').onclick = () => {
    S = store.get(SAVE_KEY, null);
    if(S){ sfx.ping(); toast(`Welcome back!`); resume(); }
  };
}

/* ---------- new game ---------- */
function buildPlan(L){
  const left = {}; Object.keys(POOLS).forEach(k => left[k] = shuffle(POOLS[k]));
  const plan = [], rounds = [];
  L.rounds.forEach(ri => {
    for(let k = 0; k < L.per; k++){
      const choices = ROUNDS[ri].pools.filter(p => left[p].length);
      const pool = ROUNDS[ri].pools.length > 1 ? rnd(choices) : choices[0];
      plan.push({pool, id: left[pool].pop()}); rounds.push(ri);
    }
  });
  return {plan, rounds};
}
function buildValues(L){
  const R = L.rounds.length, sumW = R * (R + 1) / 2, vals = [];
  L.rounds.forEach((_, j) => { const v = Math.max(1, Math.round(99 * (j + 1) / (L.per * sumW))); for(let k = 0; k < L.per; k++) vals.push(v); });
  const diff = 99 - vals.reduce((a, b) => a + b, 0);
  vals[vals.length - 1] = Math.max(1, vals[vals.length - 1] + diff);
  return vals;
}
function newGame(st){
  const L = LENGTHS[st.length], {plan, rounds} = buildPlan(L);
  const players = [];
  for(let i = 0; i < st.n; i++){
    players.push({id:'p' + i, name: (st.names[i] || '').trim() || (st.n === 1 ? 'Mystery Guest' : `Player ${i + 1}`), human:true, key:null, col: PLAYER_COLORS[i], look: (st.looks && st.looks[i]) || defaultLook(i)});
  }
  if(st.ai){ players.push({id:'sichen', name:'Sichen', human:false, key:'sichen'}); players.push({id:'fyon', name:'Fyon', human:false, key:'fyon'}); }
  if(st.jacques) players.push({id:'jacques', name:'Jacques', human:false, key:'jacques'});
  players.forEach(p => Object.assign(p, {money:0, full:0, life:{smash:true, egg:true, time:true}, used:0, st:{trickR:0, trickN:0, emoji:0, orderFull:0, bull:0, egg:0}}));
  S = {v:2, length: st.length, ai: st.ai, jq: !!st.jacques, players, plan, rounds, values: buildValues(L), pos:0, savedAt: Date.now()};
  saveGame(true); sfx.fanfare(); resume();
}
function resume(){
  updateTop();
  if(S.pos >= S.plan.length) return endScreen();
  if(S.pos === 0 || S.rounds[S.pos] !== S.rounds[S.pos - 1]) roundScreen(); else questionScreen();
}

/* ---------- round intro ---------- */
function roundScreen(){
  stopTimer();
  const ri = S.rounds[S.pos], R = ROUNDS[ri], L = LENGTHS[S.length];
  const order = L.rounds, num = order.indexOf(ri) + 1, val = S.values[S.pos];
  const hs = humans(), names = hs.map(p => p.name);
  const nameList = names.length === 1 ? names[0] : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
  const intro = S.pos === 0
    ? `Welcome, welcome, WELCOME to Who Wants To Be A Hundredaire! I'm Chemmy, three-time regional table tennis champion and full-time host. Tonight: ${nameList}${S.ai ? ', up against Sichen and Fyon' : ''}${S.jq ? (S.ai ? ', and the very tall Jacques. Sunglasses are under your seats' : ', up against the very tall Jacques. Sunglasses are under your seats') : ''}! ${S.plan.length} questions, and a perfect game wins the full one hundred dollars. ${ROUND_INTROS[ri]}`
    : (Math.random() < .45 ? rnd(CHEMMY_STORIES) + ' Anyway! ' : '') + ROUND_INTROS[ri];
  const ad = S.pos > 0 && Math.random() < .5 ? rnd(ADS) : null;
  screen.innerHTML = `
    ${ad ? `<div class="ad"><div class="adtag">📺 A word from our sponsors</div><div class="adt">${ad.t}</div><p>${ad.b}</p><small>${ad.s}</small></div>` : ''}
    <div class="card center">
      <div class="lbl">Round ${num} of ${order.length}</div>
      <div class="roundbig">${R.name}</div>
      <div class="roundsub">${R.sub} · <b>$${val}</b>${ri === 8 ? '+' : ''} per question</div>
      <div class="ladder">${order.map((x, i) => `<div class="rung ${i < num - 1 ? 'done' : i === num - 1 ? 'now' : ''}">${ROUNDS[x].name}</div>`).join('')}</div>
      ${standings()}
      <div class="host" style="text-align:left">${AV.chemmy}<div class="host-say"><span class="who">CHEMMY:</span><span id="hostText"></span></div></div>
      ${S.pos === 0 && S.ai ? `<div class="host" style="text-align:left">${AV.sichen}<div class="host-say"><span class="who" style="color:var(--teal)">SICHEN:</span>${JOKE}</div></div>` : ''}
      <button class="bigbtn red" id="goBtn" style="max-width:340px;margin:16px auto 0">Serve it up! ▶</button>
    </div>`;
  chemmySay(intro);
  if(S.pos === 0 && S.ai) setTimeout(() => countJoke(JOKE), 400);
  $('#goBtn').onclick = () => { sfx.ping(); questionScreen(); };
  $('#goBtn').focus();
}
function standings(final){
  const list = S.players.slice().sort((a, b) => b.money - a.money);
  const medals = ['🥇', '🥈', '🥉'];
  return `<div class="stand" style="grid-template-columns:repeat(${Math.min(list.length, 3)},minmax(0,1fr))">${list.map((p, i) =>
    `<div class="s ${i === 0 && p.money > 0 ? 'first' : ''}">${avatar(p)}<b>${esc(p.name)}</b><div class="m">$${p.money}</div>${final ? `<div class="medal">${medals[i] || '🎗️'}</div>` : ''}</div>`).join('')}</div>`;
}

/* ---------- top bar ---------- */
$('#saveBtn').onclick = () => saveGame(false);
$('#soundBtn').onclick = () => { meta.sound = !meta.sound; saveMeta(); updateTop(); sfx.ping(); };
$('#quitBtn').onclick = () => { saveGame(true); toast("Game saved. Continue it from the main menu."); titleScreen(); };
