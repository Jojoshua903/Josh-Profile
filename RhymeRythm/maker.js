'use strict';
// ---------- Level Maker: pick a game, place cues on a grid, test, save, share ----------
const MAKER_GAMES = {   // kind, label, beats of warning, button, [auto follow-up offset, follow-up kind]
  stoep: [['slow', 'Één, twee…', 2], ['fast', 'Een-twee!', 1], ['big', 'Één, twee, drie', 3]],
  gras: [['vlinder', 'Butterfly', 2], ['bij', 'Bee', 1]],
  muur: [['bal', 'Ball', 1], ['appel', 'Apple', 2], ['ster', 'Gold star', 2]],
  pluk: [['wortel', 'Carrot', 1], ['reus', 'Giant beet', 2]],
  zurm: [['blad', 'Page', 1], ['eind', 'The end', 1]],
  raket: [['bout', 'Bolt', 1], ['paneel', 'Panel (×2)', 2, 'a', .5, 'paneel2'], ['start', 'Countdown', 3]],
  skelet: [['pose', 'Pose', 1], ['hoofd', 'Head pop', 2], ['grand', 'Grand pose', 3]],
  verhaal: [['blad', 'Page · A', 1, 'a'], ['draak', 'Dragon · B', 1, 'b'], ['groot', 'Big dragon · B', 2, 'b']],
  robot: [['tik', 'Tik · A', 4, 'a'], ['boem', 'Boem · B', 4, 'b']],
  fiets: [['eend', 'Duck', 1], ['oma', 'Oma', 2], ['brug', 'Bridge', 3]],  klomp: [['klomp', 'Copy stomp', 4]],  ssst: [['hoest', 'Cough', 1], ['giechel', 'Giggle', 1.5], ['snurk', 'Snore', 2], ['tring', 'Phone', 1]],  putdeksel: [['blub', 'Tentacle', 1], ['traag', 'Slow tentacle', 2]],  toon: [['klap', 'Slam', 1], ['traag', 'Slow slam', 2], ['licht', 'Maat’s blast', 4]],
  kegel: [['rol', 'Two steps', 2], ['snel', 'Quick steps', 1], ['gouden', 'Golden throw', 3]],
  toren: [['links', 'Left hand · A', 1, 'a'], ['rechts', 'Right hand · B', 1, 'b'], ['sprong', 'Jump · A', 2, 'a']],
  hoog: [['half', 'Quick kick', .5], ['kort', 'Kick', 1], ['hoog', 'High kick', 2]],
  pannenkoek: [['flip', 'Pancake (+catch)', 2, 'a', 2, 'vang']],
};
const kindDef = (game, k) => MAKER_GAMES[game].find(x => x[0] === k) || [k, k, 1];
const pairBlocks = (hits, game, b) => hits.some(x => { const d = kindDef(game, x[1]); return d[4] && x[0] === b - d[4]; });
const KIND_COL = ['#ef4a36', '#4d7cf0', '#f6b92b'];
let MK = null;
const newDef = () => ({ id: 'c' + Date.now().toString(36), name: 'Mijn level', game: 'stoep', bpm: 120, bars: 8, music: 'song', hits: [], scene: defaultScene(), song: defaultSong() });
const leadOf = (game, k) => kindDef(game, k)[2];
const badHit = (def, [b, k]) => b - leadOf(def.game, k) < .5 || b + (kindDef(def.game, k)[4] || 0) > def.bars * 4 - .5;

function buildCustom(def) {
  const src = LEVELS.find(l => l.id === def.game), drums = def.music === 'drums';
  const own = def.music === 'custom' && def.song ? songToLevel(def.song) : {};
  return Object.assign({}, src, {
    id: def.id, title: def.name || 'Mijn level', who: `Custom · ${src.who}`, song: def.music === 'custom' ? 'Your own song' : 'Custom mix', custom: true, def,
    bpm: def.bpm, beats: def.bars * 4, mel: drums ? null : src.mel, comp: drums ? null : src.comp,
    how: `${def.game === 'scene' ? sceneHow(def.scene || defaultScene()) : src.how}<br><i>Made in the Level Maker.</i>`,
    chart() {
      const c = [];
      def.hits.filter(h => !badHit(def, h)).forEach(([b, k], i, arr) => {
        const d = kindDef(def.game, k), btn = d[3] || 'a';
        const prev = arr[i - 1], start = !prev || Math.abs(prev[0] + d[2] - b) > .01;   // keepy-uppy: does Cas toss a fresh ball?
        c.push({ b, k, btn, start, y: 120 + Math.random() * 140, side: Math.random() < .5 ? 180 : 780 });
        if (d[4]) c.push({ b: b + d[4], k: d[5], btn });
      });
      const first = MAKER_GAMES[def.game][0];
      return c.length ? c : [{ b: 4 + first[2], k: first[0], btn: first[3] || 'a' }];
    },
  }, own);
}

function openMaker(def) {
  MK = def ? JSON.parse(JSON.stringify(def)) : newDef();
  MK.scene = sanitizeScene(MK.scene); MK.song = sanitizeSong(MK.song);
  mode = 'maker'; renderMaker(); show('maker');
}
function renderMaker() {
  $('mkName').value = MK.name; $('mkGame').value = MK.game; $('mkBpm').value = MK.bpm; $('mkBpmV').textContent = MK.bpm + ' bpm';
  $('mkBars').value = MK.bars; $('mkMusic').value = MK.music;
  renderComposer(); renderGrid(); renderList();
}
function renderGrid() {
  const kinds = MAKER_GAMES[MK.game], cols = MK.bars * 8, el = $('mgrid');
  el.style.gridTemplateColumns = `130px repeat(${cols}, 22px)`; el.innerHTML = '';
  const cell = (cls, html = '') => { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; el.appendChild(d); return d; };
  cell('mlab', 'beat →');
  for (let c = 0; c < cols; c++) cell('mhead' + (c % 8 === 0 ? ' bar' : ''), c % 8 === 0 ? `<b>${c / 8 + 1}</b>` : c % 2 === 0 ? '·' : '');
  kinds.forEach(([k, label, lead], ri) => {
    cell('mlab', `<span style="background:${KIND_COL[ri]}"></span>${label}<small>${lead}-beat warning</small>`);
    for (let c = 0; c < cols; c++) {
      const b = c / 2, h = MK.hits.find(x => x[0] === b), mine = h && h[1] === k;
      const blocked = pairBlocks(MK.hits, MK.game, b);
      const d = cell('mcell' + (c % 2 === 0 ? ' beat' : '') + (c % 8 === 0 ? ' bar' : '') + (c < 8 ? ' intro' : '') + (blocked ? ' occ' : '') + (h && !mine ? ' occ' : ''));
      if (mine) { d.classList.add('on'); d.style.background = KIND_COL[ri]; if (badHit(MK, h)) d.classList.add('bad'); }
      d.title = `Beat ${Math.floor(b) + 1}${b % 1 ? '½' : ''}: ${label}`;
      d.onclick = () => toggleHit(b, k);
    }
  });
  const bad = MK.hits.filter(h => badHit(MK, h)).length, n = MK.hits.length;
  $('mkInfo').textContent = `${n} cue${n === 1 ? '' : 's'} · ${(MK.bars * 4 * 60 / MK.bpm).toFixed(0)} seconds` +
    (bad ? ` · ${bad} too early for their warning sound (red), these get skipped` : '');
}
function toggleHit(b, k) {
  if (pairBlocks(MK.hits, MK.game, b)) return;
  const i = MK.hits.findIndex(x => x[0] === b);
  if (i >= 0 && MK.hits[i][1] === k) MK.hits.splice(i, 1);
  else if (i >= 0) MK.hits[i][1] = k;
  else MK.hits.push([b, k]);
  const d = kindDef(MK.game, k);
  if (d[4] && MK.hits.some(x => x[0] === b && x[1] === k)) MK.hits = MK.hits.filter(x => x[0] !== b + d[4]);
  MK.hits.sort((a, c) => a[0] - c[0]);
  if (ac) { initAudio(); if (!OUT) newBus(); A.tone(ac.currentTime, fq(12 + MAKER_GAMES[MK.game].findIndex(x => x[0] === k) * 4), .06, 'square', .06); }
  renderGrid();
}
function autoFill() {
  const kinds = MAKER_GAMES[MK.game]; MK.hits = [];
  for (let bar = 1; bar < MK.bars; bar++) {
    const offs = Math.random() < .5 ? [3] : Math.random() < .5 ? [1, 3] : [1, 2, 3];
    offs.forEach(o => {
      const opts = kinds.filter(([k, , lead]) => !['licht', 'start', 'grand', 'eind', 'gouden', 'groot'].includes(k) && (lead <= 1 || o === 3));
      if (!opts.length) return;
      const [k] = opts[Math.floor(Math.random() * opts.length)];
      if (!MK.hits.some(x => Math.abs(x[0] - (bar * 4 + o)) < 1 || pairBlocks([[bar * 4 + o, k]], MK.game, x[0]) || pairBlocks(MK.hits, MK.game, bar * 4 + o))) MK.hits.push([bar * 4 + o, k]);
    });
  }
  renderGrid();
}
function saveCustom() {
  SAVE.custom = (SAVE.custom || []).filter(d => d.id !== MK.id); SAVE.custom.push(JSON.parse(JSON.stringify(MK))); save(); renderList();
  $('mkInfo').textContent = `Saved “${MK.name}”.`;
}
function renderList() {
  const list = $('mkList'); list.innerHTML = '';
  (SAVE.custom || []).forEach(d => {
    const row = document.createElement('div'); row.className = 'mrow';
    row.innerHTML = `<b>${d.name.replace(/</g, '&lt;')}</b><span class="tiny" style="margin:0 8px">${LEVELS.find(l => l.id === d.game).title} · ${d.bpm} bpm</span>`;
    [['▸ Play', () => openIntro(buildCustom(d))], ['Edit', () => openMaker(d)], ['✕', () => { SAVE.custom = SAVE.custom.filter(x => x.id !== d.id); save(); renderList(); }]].forEach(([t, f]) => {
      const b = document.createElement('button'); b.className = 'btn alt small'; b.textContent = t; b.onclick = f; row.appendChild(b);
    });
    list.appendChild(row);
  });
  if (!list.children.length) list.innerHTML = '<p class="tiny">No saved levels yet.</p>';
}
const shareCode = d => 'RR1:' + btoa(unescape(encodeURIComponent(JSON.stringify({ n: d.name, g: d.game, t: d.bpm, b: d.bars, m: d.music, h: d.hits,
  sc: d.game === 'scene' ? d.scene : undefined, so: d.music === 'custom' ? d.song : undefined }))));
function loadCode(s) {
  try {
    const o = JSON.parse(decodeURIComponent(escape(atob(s.trim().replace(/^RR1:/, '')))));
    if (!MAKER_GAMES[o.g]) throw 0;
    const kinds = MAKER_GAMES[o.g].map(k => k[0]);
    return { id: 'c' + Date.now().toString(36), name: String(o.n || 'Gedeeld level').slice(0, 40), game: o.g, bpm: clamp(+o.t || 120, 70, 170),
      bars: [4, 8, 12, 16].includes(+o.b) ? +o.b : 8, music: ['drums', 'custom'].includes(o.m) ? o.m : 'song',
      scene: sanitizeScene(o.sc), song: sanitizeSong(o.so),
      hits: (o.h || []).filter(h => Array.isArray(h) && isFinite(h[0]) && kinds.includes(h[1])).map(h => [Math.round(h[0] * 2) / 2, h[1]]) };
  } catch (e) { return null; }
}

function wireMaker() {
  $('mkName').oninput = e => { MK.name = e.target.value.slice(0, 40); };
  $('mkGame').innerHTML = Object.keys(MAKER_GAMES).sort((a, b) => (a === 'scene') - (b === 'scene')).map(id => `<option value="${id}">${id === 'scene' ? '✦ Own scenario (pick place & characters)' : LEVELS.find(l => l.id === id).title}</option>`).join('');
  $('mkGame').onchange = e => { MK.game = e.target.value; MK.hits = []; renderComposer(); renderGrid(); };
  $('mkBpm').oninput = e => { MK.bpm = +e.target.value; $('mkBpmV').textContent = MK.bpm + ' bpm'; renderGrid(); };
  $('mkBars').onchange = e => { MK.bars = +e.target.value; MK.hits = MK.hits.filter(h => h[0] < MK.bars * 4); renderGrid(); };
  $('mkMusic').onchange = e => { MK.music = e.target.value; renderComposer(); };
  $('mkTest').onclick = () => { initAudio(); play(buildCustom(MK)); };
  $('mkSave').onclick = saveCustom;
  $('mkAuto').onclick = autoFill;
  $('mkClear').onclick = () => { MK.hits = []; renderGrid(); };
  $('mkNew').onclick = () => openMaker();
  $('mkShare').onclick = () => { $('mkCode').value = shareCode(MK); $('mkCode').select(); try { navigator.clipboard.writeText($('mkCode').value); $('mkInfo').textContent = 'Share code copied.'; } catch (e) {} };
  $('mkLoad').onclick = () => { const d = loadCode($('mkCode').value); if (d) { MK = d; renderMaker(); $('mkInfo').textContent = `Loaded “${d.name}”.`; } else $('mkInfo').textContent = 'That share code didn’t work.'; };
  $('mkBack').onclick = quit;
}
