'use strict';
// ---------- game flow ----------
const WIN = { perfect: .045, good: .09, barely: .15 };       // seconds either side of the beat
const PTS = { perfect: 100, good: 80, barely: 50, miss: 0 };
const CHAPTERS = [
  { name: 'De Stoep', blurb: 'Where it all begins: three brothers, one stoep, and something bubbling in the drain.', ids: ['stoep', 'gras', 'fiets', 'muur', 'pluk', 'remix1'] },
  { name: 'Toon de Demoon', blurb: 'The drain explodes. The whole street teams up against a red octopus demon.', ids: ['zurm', 'klomp', 'raket', 'ssst', 'skelet', 'putdeksel', 'toon', 'remix2', 'remix3'] },
  { name: 'De Baas van Sinterklaas', blurb: 'Sinterklaas never arrives. A mean alien has taken him, and the brothers need new friends to get him back.', ids: ['tuin', 'meloen', 'freak', 'bouw', 'droom', 'huil', 'baas', 'remix4'] },
  { name: 'De Grote Finale', blurb: 'One last show. Every game, every friend, one long song, and a finale on stage with the whole cast.', ids: ['megamix'] },
];
const ORDER = CHAPTERS.flatMap(c => c.ids);
const SONGS = ORDER.map(id => LEVELS.find(l => l.id === id));
const songNo = L => SONGS.slice(0, SONGS.indexOf(L) + 1).filter(x => !x.remix).length;
const chapterOf = L => CHAPTERS.findIndex(c => c.ids.includes(L.id));
const ARCADE = ['kegel', 'toren', 'hoog', 'pannenkoek'].map(id => LEVELS.find(l => l.id === id));
const ALL = SONGS.concat(ARCADE);
const $ = id => document.getElementById(id);
let mode = 'title', P = null, cur = SONGS[0], ST = null, CH = 0;
let SAVE = { best: {}, perfect: {}, seen: {}, endless: 0, vol: 100, lat: 0, hc: false, custom: [] };
try { Object.assign(SAVE, JSON.parse(localStorage.getItem('rr-save') || '{}')); } catch (e) {}
delete SAVE.unlockAll;
const save = () => { try { localStorage.setItem('rr-save', JSON.stringify(SAVE)); } catch (e) {} };
const applySettings = () => { VOL = SAVE.vol / 100; if (OUT) OUT.gain.value = .8 * VOL; document.body.classList.toggle('hc', SAVE.hc); };

const SCREENS = ['title', 'hub', 'select', 'intro', 'result', 'extras', 'maker', 'multi', 'albumOv'];
function show(id) {
  SCREENS.forEach(o => $(o).classList.toggle('on', o === id));
  $('quit').style.display = id === null && (mode === 'play' || mode === 'hangout') ? 'block' : 'none';
}
const rankOf = s => s >= 88 ? 'Superb' : s >= 62 ? 'Prima' : 'Try again';
const RANKCOL = { Superb: '#f6b92b', Prima: '#8fd3f0', 'Try again': '#f59ab5' };
const songIdx = L => SONGS.indexOf(L);
const unlocked = i => i === 0 || (SAVE.best[SONGS[i - 1].id] ?? -1) >= 62;
const medalCount = () => ALL.filter(L => (SAVE.best[L.id] ?? -1) >= 88).length;
const sceneFor = L => L.id === 'stoep' ? 'opening' : L.id;
const stopAll = () => { if (mode === 'dance') stopDance(); if (ac) newBus(); P = null; ST = null; };

function card(L, label, open) {
  const c = document.createElement('div');
  c.className = 'card' + (open ? '' : ' locked'); c.style.background = L.color;
  const r = SAVE.best[L.id] != null ? rankOf(SAVE.best[L.id]) : null;
  c.innerHTML = `<div class="disc" style="--c:${L.accent}"></div>
    ${r ? `<span class="stamp" style="background:${RANKCOL[r]}">${r}</span>` : ''}
    ${r === 'Superb' ? `<span class="medal">🏅${SAVE.perfect[L.id] ? '💿' : ''}</span>` : ''}
    <div class="no">${label}</div>
    <div class="nm">${L.title}<span class="who">${L.who}</span></div>`;
  if (open) c.onclick = () => openLevel(L);
  return c;
}

// ---------- screens ----------
function goScreen(name) {
  stopAll(); if (name !== 'chal') CHAL = null;
  if (name === 'hub') { mode = 'hub'; buildHub(); show('hub'); }
  else if (name === 'story') { mode = 'select'; buildGrid(); show('select'); }
  else if (name === 'arcade' || name === 'multi') openBrowse(name);
  else if (name === 'album') { mode = 'album'; buildAlbum(); show('albumOv'); }
  else if (name === 'extras') { mode = 'extras'; buildExtras(); show('extras'); }
  else if (name === 'chal') openChallenges();
  else if (name === 'maker') openMaker();
  else if (name === 'dance') startDance();
  else if (name === 'hang') { initAudio(); if (!OUT) newBus(); mode = 'hangout'; show(null); $('quit').style.display = 'block'; }
}
const quit = () => goScreen('hub');
function backTo(L) {
  if (!L) return quit();
  if (CHAL) return goScreen('chal');
  if (L.mp) return goScreen('multi');
  if (L.arcade || L.endless || (L.custom && mode === 'result' && false)) return goScreen('arcade');
  if (L.custom) { stopAll(); return openMaker(L.def); }
  CH = Math.max(0, chapterOf(L)); goScreen('story');
}

function buildHub() {
  const done = SONGS.filter(L => (SAVE.best[L.id] ?? -1) >= 62).length;
  $('hubStats').textContent = `✓ ${done}/${SONGS.length} songs · 🏅 ${medalCount()} medals`;
  const nextI = SONGS.findIndex((L, i) => unlocked(i) && (SAVE.best[L.id] ?? -1) < 62);
  const nxt = SONGS[nextI >= 0 ? nextI : 0];
  $('tStory').textContent = nextI >= 0 ? `Hoofdstuk ${chapterOf(nxt) + 1} · next up: ${nxt.title}` : 'Every song cleared. Go for medals!';
  $('tFaces').innerHTML = CHAPTERS.map((c, i) => `<span>${i + 1}. ${c.name}</span>`).join('');
  $('tAlbum').textContent = `${CHARS.filter(c => cleared(c.id)).length} of ${CHARS.length} characters met`;
  $('tChal').textContent = `${chalCount()}/${CHALLENGES.length} done · ${dailyChal() && !chalDone(dailyChal()) ? 'new daily challenge!' : 'daily challenge done'}`;
  document.querySelectorAll('.tile').forEach(t => t.onclick = () => { initAudio(); if (!OUT) newBus(); A.tone(ac.currentTime, fq(19), .06, 'triangle', .08); if (t.dataset.go === 'story') CH = chapterOf(nxt) < 0 ? 0 : chapterOf(nxt); goScreen(t.dataset.go); });
}
function buildGrid() {
  const tabs = $('chTabs'); tabs.innerHTML = '';
  CHAPTERS.forEach((c, i) => {
    const first = SONGS.indexOf(LEVELS.find(l => l.id === c.ids[0])), open = unlocked(first);
    const n = c.ids.filter(id => (SAVE.best[id] ?? -1) >= 62).length;
    const t = document.createElement('button'); t.className = 'tab' + (i === CH ? ' sel' : '') + (open ? '' : ' lock');
    t.innerHTML = `${open ? '' : '🔒 '}Hoofdstuk ${i + 1}: ${c.name}<small>${n}/${c.ids.length} cleared</small>`;
    if (open) t.onclick = () => { CH = i; buildGrid(); };
    tabs.appendChild(t);
  });
  $('chBlurb').textContent = CHAPTERS[CH].blurb;
  const grid = $('grid'); grid.innerHTML = '';
  CHAPTERS[CH].ids.forEach(id => { const L = LEVELS.find(l => l.id === id), i = SONGS.indexOf(L); grid.appendChild(card(L, L.id === 'megamix' ? '★' : L.remix ? 'R' : songNo(L), unlocked(i))); });
  $('medalCount').textContent = `🏅 ${medalCount()} of ${ALL.length} medals`;
}
function openBrowse(kind) {
  mode = kind === 'multi' ? 'multi' : 'arcade';
  const grid = $('mpGrid'); grid.innerHTML = '';
  const head = t => { const h = document.createElement('div'); h.className = 'ghead'; h.textContent = t; grid.appendChild(h); };
  if (kind === 'multi') {
    $('brTitle').textContent = 'Multiplayer'; $('brPill').textContent = '2 players · 1 device';
    $('brHint').textContent = 'Speler 1 = F or the left half of the screen · Speler 2 = J or the right half.';
    head('Party games'); MP.party.forEach(L => grid.appendChild(card(L, '★', true)));
    head('Versus · split screen'); MP.versus.forEach(L => grid.appendChild(card(L, 'VS', true)));
    head('Co-op · one button each'); MP.coop.forEach(L => grid.appendChild(card(L, '♥', true)));
  } else {
    $('brTitle').textContent = 'Arcade'; $('brPill').textContent = 'Always open';
    $('brHint').textContent = 'Quick minigames, the endless marathon, and every level you have built yourself.';
    head('Minigames'); ARCADE.forEach((L, i) => grid.appendChild(card(L, String.fromCharCode(65 + i), true)));
    const m = medalCount(), E = LEVELS.find(l => l.id === 'endless');
    head(`Stoep Marathon · best ${SAVE.endless || 0} jumps${m >= 3 ? '' : ` · 🔒 ${m}/3 medals`}`); grid.appendChild(card(E, '∞', m >= 3));
    head('Mijn levels'); (SAVE.custom || []).forEach(d => grid.appendChild(card(buildCustom(d), '✎', true)));
    if (!(SAVE.custom || []).length) { const p = document.createElement('p'); p.className = 'chblurb'; p.style.gridColumn = '1/-1'; p.textContent = 'Nothing yet. Make one in the Level Maker!'; grid.appendChild(p); }
  }
  show('multi');
}
function openLevel(L) {
  const sc = sceneFor(L);
  if (SCENES[sc] && !SAVE.seen[sc]) playStory(sc, () => openIntro(L));
  else openIntro(L);
}
function openIntro(L) {
  stopAll(); cur = L; mode = 'intro'; CHAL = null;
  $('iNo').textContent = L.custom ? 'Custom level' : L.arcade ? (L.twoBtn ? 'Arcade · two buttons' : 'Arcade') : L.endless ? 'Extra'
    : L.id === 'megamix' ? 'Hoofdstuk 4 · Megamix' : L.remix ? `Hoofdstuk ${chapterOf(L) + 1} · Remix` : ['toon', 'baas'].includes(L.id) ? `Hoofdstuk ${chapterOf(L) + 1} · Boss` : L.twoBtn ? 'Duet · two buttons' : `Hoofdstuk ${chapterOf(L) + 1} · Song ${songNo(L)}`;
  $('iTitle').textContent = L.title; $('iSong').textContent = `♪ ${L.song} · ${L.bpm} bpm`;
  $('iHow').innerHTML = L.how;
  $('practiceBtn').style.display = L.endless || L.mp ? 'none' : '';
  $('perfectBtn').style.display = (SAVE.best[L.id] ?? -1) >= 88 && !L.endless && !L.mp ? '' : 'none';
  if (L.mp) $('iNo').textContent = L.mp === 'coop' ? 'Co-op · 2 players' : 'Multiplayer · 2 players';
  show('intro');
}

// ---------- story ----------
function playStory(scene, then) { ST = { scene, i: 0, t0: performance.now() / 1000, then }; mode = 'story'; show(null); }
function storyNext() {
  ST.i++; ST.t0 = performance.now() / 1000;
  if (ST.i >= SCENES[ST.scene].length) { SAVE.seen[ST.scene] = true; save(); const f = ST.then; ST = null; f(); }
}

// ---------- playing ----------
const now = () => ac.currentTime - (ac.outputLatency || ac.baseLatency || 0) - SAVE.lat / 1000;
const beatNow = () => (now() - P.t0) / P.spb;

function play(L, opt = {}) {
  initAudio(); newBus();
  let ev = L.chart().map(c => Object.assign({ res: null }, c)).sort((a, b) => a.b - b.b);
  let beats = L.beats;
  if (opt.practice) {            // just the opening phrases of the song
    const first = ev[0].b; ev = ev.filter(e => e.b < first + 14);
    beats = Math.ceil((ev[ev.length - 1].b + 2) / 4) * 4;
  }
  const chal = !opt.practice && !opt.perfect ? CHAL : null;
  const spb = 60 / (L.bpm * (chal && chal.speed || 1)), t0 = ac.currentTime + .5;
  P = { L, spb, t0, ev, beats, b: -1, last: null, shake: 0, whiffs: 0, misses: 0, done: false,
    practice: !!opt.practice, perfect: !!opt.perfect, chal, bar: 0, cueAt: 0, song: Object.assign({}, L, { beats }) };
  mode = 'play'; show(null); schedule();
}
// schedule music and cues a few beats ahead instead of all at once
function schedule() {
  const ahead = Math.max(P.b, 0) + 8, bars = Math.ceil(P.beats / 4);
  while (P.bar < bars && P.bar * 4 < ahead) { scheduleSong(P.song, P.t0, P.spb, P.bar, P.bar + 1); P.bar++; }
  while (P.cueAt < P.ev.length && P.ev[P.cueAt].b < ahead) { const e = P.ev[P.cueAt++]; if (P.L.cue) P.L.cue(e, P.t0 + e.b * P.spb, P.spb); }
}

function press(btn = 'a') {
  if (!P || P.done) return;
  const b = beatNow();
  let bestE = null, bd = 1e9;
  for (const e of P.ev) {
    const eb = e.btn || 'a'; if (e.res || (eb !== 'any' && eb !== btn)) continue;
    const d = (b - e.b) * P.spb;
    if (Math.abs(d) < Math.abs(bd)) { bd = d; bestE = e; }
  }
  let res = 'whiff';
  if (bestE && Math.abs(bd) <= WIN.barely) {
    const ad = Math.abs(bd);
    res = ad <= WIN.perfect ? 'perfect' : ad <= WIN.good ? 'good' : 'barely';
    bestE.res = res; bestE.hb = b; bestE.off = bd;
  }
  P.last = { res, b, e: res === 'whiff' ? null : bestE, btn };
  P['last_' + btn] = P.last;
  if (res === 'whiff') P['w_' + btn] = (P['w_' + btn] || 0) + 1;
  // the song's star reacts to hot streaks
  P.streak = res === 'perfect' || res === 'good' ? (P.streak || 0) + 1 : 0;
  const st = PERSONA[STAR[P.L.id] || STAR[P.L.def && P.L.def.game]];
  if (st && st.streak && P.streak > 0 && P.streak % 8 === 0) P.cheer = { who: st.name, line: st.streak[(P.streak / 8 - 1) % st.streak.length], b };
  if (res === 'whiff') { P.whiffs++; A.whiff(ac.currentTime); }
  else if (P.L.hit) P.L.hit(ac.currentTime, res, bestE, P);
  else A.clap(ac.currentTime);
  if (P.perfect && (res === 'whiff' || res === 'barely')) failPerfect();
}
function failPerfect() { P.done = true; newBus(); A.tone(ac.currentTime, 300, .5, 'sawtooth', .08, 80, 900); results({ failed: true }); }

function finish() {
  P.done = true;
  const L = P.L, hits = P.ev.filter(hitOk).length;
  if (L.endless) { if (hits > (SAVE.endless || 0)) { SAVE.endless = hits; save(); } return results({ endless: hits }); }
  if (L.mp) {
    const s1 = mpScore(P.ev.filter(e => e.btn === 'a'), P.w_a || 0), s2 = mpScore(P.ev.filter(e => e.btn === 'b'), P.w_b || 0);
    const w = L.winner ? L.winner(P) : s1 === s2 ? null : s1 > s2 ? 'a' : 'b';
    return results({ mp: { s1, s2, w } });
  }
  const scored = P.ev.filter(e => e.res !== 'skip');     // cues that never got a chance don't count
  let s = scored.reduce((a, e) => a + (PTS[e.res] || 0), 0) / Math.max(1, scored.length);
  s = Math.round(clamp(s - P.whiffs * 1.5, 0, 100));
  if (P.practice) return results({ practice: hits / Math.max(1, scored.length) });
  if (P.chal) return results({ s, hits, chal: P.chal, pass: chalResult(P.chal, s) });
  if (P.perfect) { SAVE.perfect[L.id] = true; save(); return results({ perfectWin: true }); }
  const firstClear = (SAVE.best[L.id] ?? -1) < 62 && s >= 62;
  if (SAVE.best[L.id] == null || s > SAVE.best[L.id]) { SAVE.best[L.id] = s; save(); }
  results({ s, hits, firstClear });
}

function results(o) {
  const L = P.L, i = songIdx(L), whiffs = P.whiffs, total = P.ev.filter(e => e.res !== 'skip').length;
  setTimeout(() => {
    mode = 'result';
    $('rNo').textContent = L.title;
    let rank, col, say, score, next = null;
    if (o.mp) {
      const { s1, s2, w } = o.mp;
      if (L.mp === 'coop') { const t = Math.round((s1 + s2) / 2), r = rankOf(t); rank = `Samen: ${r}!`; col = RANKCOL[r]; say = r === 'Superb' ? 'Perfect teamwork. The boys could learn something from you two.' : r === 'Prima' ? 'Good teamwork. A few crossed wires, nothing serious.' : 'Talk it through and try again: who takes which cue?'; }
      else { rank = w ? `Speler ${w === 'a' ? 1 : 2} wint!` : 'Gelijkspel!'; col = w ? PCOL[w] : '#f6b92b'; say = w ? 'A well-earned win. Shake hands, then ask for a rematch.' : 'Dead even. Clearly you need a rematch.'; }
      score = `Speler 1: ${s1}%  ·  Speler 2: ${s2}%` + (L.points ? `  ·  points ${L.points(P).a}–${L.points(P).b}` : '');
    }
    else if (o.endless != null) { rank = `${o.endless} jumps`; col = '#f6b92b'; score = `Best: ${SAVE.endless}`; say = o.endless >= 40 ? 'The street has never seen stamina like it.' : 'Joep is still counting. Have another go.'; }
    else if (o.practice != null) {
      const ok = o.practice >= .7; rank = ok ? 'Klaar!' : 'Nog eens…'; col = ok ? '#8fd3f0' : '#f59ab5';
      score = `Practice: ${Math.round(o.practice * total)} of ${total} on the beat`;
      say = ok ? 'You’ve got it. Ready when you are.' : 'Take it slow. Listen to the cue, then count to the hit.';
      next = ['Play for real ▸', () => play(L)];
    } else if (o.chal) {
      rank = o.pass ? 'Gehaald!' : 'Nog niet…'; col = o.pass ? '#7bc96f' : '#f59ab5';
      score = `${o.s} / 100 · ${o.hits} of ${total} on the beat${P.misses ? ` · ${P.misses} misses` : ''}${whiffs ? ` · ${whiffs} stray taps` : ''} · goal: ${chalGoal(o.chal)}`;
      say = o.pass ? 'Challenge beaten. That twist didn’t stand a chance.' : 'Not this time. You already know the song; trust your ears.';
    } else if (o.failed) { rank = 'Not perfect'; col = '#f59ab5'; score = 'Perfect run ends on any miss, stray tap or “bijna”.'; say = 'So close. Perfect is a high bar, even for me.'; }
    else if (o.perfectWin) { rank = 'PERFECT!'; col = '#f6b92b'; score = '💿 Gold record earned'; say = 'Not one beat out of place. Even I am impressed.'; }
    else {
      const r = rankOf(o.s); rank = r + (r === 'Try again' ? '…' : '!'); col = RANKCOL[r];
      score = `${o.s} / 100 · ${o.hits} of ${total} on the beat${whiffs ? ` · ${whiffs} stray taps` : ''}`;
      say = L.verdict[r === 'Superb' ? 0 : r === 'Prima' ? 1 : 2];
      if (r === 'Superb') score += ' · 🏅 medal';
      const ending = { toon: 'ending', baas: 'ending2', megamix: 'ending3' }[L.id];
      if (ending && o.firstClear && !SAVE.seen[ending]) next = ['Ending ▸', () => playStory(ending, () => backTo(SONGS[i + 1] || L))];
      else if (i >= 0 && i < SONGS.length - 1 && unlocked(i + 1)) next = ['Next ▸', () => openLevel(SONGS[i + 1])];
    }
    $('rank').textContent = rank; $('rank').style.color = col; $('score').textContent = score; $('rSay').textContent = say;
    const st = PERSONA[STAR[L.id] || STAR[L.def && L.def.game]];
    const ri = o.s != null ? (rankOf(o.s) === 'Superb' ? 0 : rankOf(o.s) === 'Prima' ? 1 : 2) : o.perfectWin ? 0 : o.failed ? 2 : null;
    $('rStar').textContent = st && st.after && ri != null ? `${st.name}: “${st.after[ri]}”` : '';
    if (st && ri != null) { const k = STAR[L.id] || STAR[L.def && L.def.game]; setTimeout(() => talk(k), 250); }
    if (L.custom) next = ['Edit level ▸', () => openMaker(L.def)];
    if (L.mp) next = null;
    if (o.chal) next = null;
    $('nextBtn').style.display = next ? '' : 'none';
    if (next) { $('nextBtn').textContent = next[0]; $('nextBtn').onclick = next[1]; }
    $('retryBtn').onclick = () => o.chal ? openChal(o.chal) : o.practice != null ? play(L, { practice: true }) : o.failed || o.perfectWin ? play(L, { perfect: true }) : openIntro(L);
    $('menuBtn').textContent = o.chal ? '◂ Uitdagingen' : L.mp ? '◂ Multiplayer' : L.arcade || L.endless || L.custom ? '◂ Arcade' : '◂ Songs';
    $('menuBtn').onclick = () => o.chal ? goScreen('chal') : L.custom ? goScreen('arcade') : backTo(L);
    show('result');
  }, o.failed ? 500 : 900);
}

// ---------- render loop ----------
const JUDGE = { perfect: ['Perfect!', '#1f9e8f'], good: ['Goed', '#4d7cf0'], barely: ['Bijna…', '#c98a00'], miss: ['Mis!', '#ef4a36'] };
function frame() {
  requestAnimationFrame(frame);
  g.setTransform(VIEW, 0, 0, VIEW, 0, 0);
  if (mode === 'play' && P) drawPlay();
  else if (mode === 'story' && ST) drawStory(ST.scene, ST.i, performance.now() / 1000 - ST.t0);
  else if (mode === 'hangout') drawHangout(performance.now() / 1000);
  else if (mode === 'dance') drawDance();
  else drawTitleScene(performance.now() / 1000);
}
function drawPlay() {
  const b = beatNow(); P.b = b;
  if (!P.done) schedule();
  for (const e of P.ev) if (!e.res && (b - e.b) * P.spb > WIN.barely) {
    e.res = 'miss'; P.misses++; P.shake = .5; P.last = { res: 'miss', b, e };
    if (P.L.miss) P.L.miss(ac.currentTime, e, P);
    if (!P.done && P.perfect) failPerfect();
    if (!P.done && P.L.lives && P.misses >= P.L.lives) { newBus(); finish(); }
  }
  g.save();
  if (P.shake > 0) { g.translate((Math.random() - .5) * P.shake * 18, (Math.random() - .5) * P.shake * 18); P.shake = Math.max(0, P.shake - .04); }
  if (P.chal) chalBefore(P.chal);
  P.L.draw(P);
  if (P.chal) { g.setTransform(VIEW, 0, 0, VIEW, 0, 0); chalAfter(P.chal, b); }
  g.restore();
  const r = recent(P, .9);
  if (r && JUDGE[r.res]) {
    const [s, c] = JUDGE[r.res], k = (b - r.b) / .9;
    g.globalAlpha = 1 - k; txt(s, W - 24, 36 - k * 14, SAVE.hc ? 38 : 30, c, 'right'); g.globalAlpha = 1;
  }
  if (P.practice) { rr(W / 2 - 70, 14, 140, 34, 17, '#fff', 3); txt('PRACTICE', W / 2, 32, 16, INK); }
  if (P.perfect) { rr(W / 2 - 80, 14, 160, 34, 17, '#f6b92b', 3); txt('★ PERFECT RUN', W / 2, 32, 16, INK); }
  if (P.chal) { rr(W / 2 - 130, 14, 260, 34, 17, '#ff9f6b', 3); txt('🎯 ' + P.chal.name, W / 2, 32, 16, INK); }
  if (P.L.lives) for (let i = 0; i < P.L.lives; i++) txt(i < P.L.lives - P.misses ? '♥' : '♡', W / 2 - 40 + i * 40, 34, 34, '#ef4a36');
  if (P.L.endless) txt(`${P.ev.filter(hitOk).length}`, 40, 40, 34, INK, 'left');
  if (P.cheer && b - P.cheer.b < 2) { g.globalAlpha = clamp(2 - (b - P.cheer.b), 0, 1); bubble(`${P.cheer.who}: ${P.cheer.line}`, 230, 100, 22); g.globalAlpha = 1; }
  rr(24, H - 22, W - 48, 8, 4, 'rgba(255,255,255,.6)', 2);
  if (!P.L.endless) rr(24, H - 22, (W - 48) * clamp(b / P.beats, 0, 1), 8, 4, INK, 0);
  if (!P.done && b > P.beats + 1.5) finish();
}

// ---------- input & wiring ----------
const A_KEYS = ['Space', 'Enter', 'KeyJ', 'KeyF'], B_KEYS = ['KeyK', 'KeyL'];
const P1_KEYS = ['KeyF', 'KeyD', 'KeyS', 'KeyA', 'Space'], P2_KEYS = ['KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Enter'];
function escape_() {
  if (mode === 'story' && ST) { const f = ST.then; ST = null; return f(); }
  if (mode === 'play' || mode === 'intro' || mode === 'result') return backTo(cur);
  if (mode !== 'title' && mode !== 'hub') quit();
}
addEventListener('keydown', e => {
  if (e.repeat) return;
  if (e.code === 'Escape') return escape_();
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
  if (mode === 'play' && P && P.L.mp) {          // two players share the keyboard
    const p = P1_KEYS.includes(e.code) ? 'a' : P2_KEYS.includes(e.code) ? 'b' : null;
    if (p) { e.preventDefault(); press(p); }
    return;
  }
  const isA = A_KEYS.includes(e.code), isB = B_KEYS.includes(e.code);
  if (mode === 'intro' && e.code === 'KeyP' && !cur.endless && !cur.mp && !CHAL) { play(cur, { practice: true }); return; }
  if (e.code === 'KeyH' && (mode === 'play' || mode === 'intro')) { setRings(SAVE.rings === false); return; }
  if (!isA && !isB) return;
  e.preventDefault();
  if (mode === 'play') press(isB && P.L.twoBtn ? 'b' : 'a');
  else if (mode === 'dance') dancePose();
  else if (mode === 'story') storyNext();
  else if (mode === 'title') { initAudio(); quit(); }
  else if (mode === 'intro') play(cur);
  else if (mode === 'result') CHAL ? openChal(CHAL) : openIntro(cur);
});
cv.addEventListener('pointerdown', e => {
  e.preventDefault();
  const r = cv.getBoundingClientRect();
  if (mode === 'story') storyNext();
  if (mode === 'dance') danceDown(e);
  if (mode === 'hangout') hangTap((e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H, performance.now() / 1000);
  if (mode !== 'play') return;
  press(P.L.twoBtn && e.clientX - r.left > r.width / 2 ? 'b' : 'a');
});
document.querySelectorAll('[data-back]').forEach(b => b.onclick = quit);
$('dzPose').onclick = dancePose; $('dzClear').onclick = () => { DZ.chars = []; dzSave(); }; $('dzBack').onclick = quit;
wireMaker();
$('startBtn').onclick = () => { initAudio(); quit(); };
$('goBtn').onclick = e => { e.stopPropagation(); play(cur); };
$('practiceBtn').onclick = e => { e.stopPropagation(); play(cur, { practice: true }); };
$('perfectBtn').onclick = e => { e.stopPropagation(); play(cur, { perfect: true }); };
$('quit').onclick = e => { e.stopPropagation(); mode === 'play' ? backTo(cur) : quit(); };
const bindRange = (id, key, unit) => { $(id).value = SAVE[key]; $(id + 'v').textContent = SAVE[key] + unit; $(id).oninput = e => { SAVE[key] = +e.target.value; $(id + 'v').textContent = SAVE[key] + unit; applySettings(); save(); }; };
bindRange('vol', 'vol', '%'); bindRange('lat', 'lat', ' ms');
$('hc').checked = SAVE.hc; $('hc').onchange = e => { SAVE.hc = e.target.checked; applySettings(); save(); };
const setRings = on => { SAVE.rings = on; $('rings').checked = on; $('iRings').checked = on; save(); };
setRings(SAVE.rings !== false);
$('rings').onchange = e => setRings(e.target.checked); $('iRings').onchange = e => setRings(e.target.checked);
$('resetBtn').onclick = () => {
  if (!confirm('Wipe all scores, medals and story progress?')) return;
  Object.assign(SAVE, { best: {}, perfect: {}, seen: {}, endless: 0 }); save(); buildExtras();
};
applySettings();
addEventListener('resize', fit);
fit(); requestAnimationFrame(frame);
