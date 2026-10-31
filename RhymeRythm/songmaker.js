'use strict';
// ---------- Song composer + scenario builder for the Level Maker ----------
ACTORS.maat = o => at(o, () => { g.scale(.55, .55); ART.maat(0, -40, 1); });

const CHORDS = {
  vrolijk: ['Happy · I–IV–V–IV', false, [[0, 4, 7], [5, 9, 12], [7, 11, 14], [5, 9, 12]]],
  pop: ['Pop · I–V–vi–IV', false, [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]]],
  chill: ['Chill · maj7 jazz', false, [[0, 4, 7, 11], [9, 12, 16, 19], [2, 5, 9, 12], [7, 11, 14, 17]]],
  droevig: ['Sad · i–VI–III–VII', true, [[0, 3, 7], [8, 12, 15], [3, 7, 10], [10, 14, 17]]],
  spannend: ['Tense · i–iv–V–i', true, [[0, 3, 7], [5, 8, 12], [7, 11, 14], [0, 3, 7]]],
  spooky: ['Spooky · i–♭II', true, [[0, 3, 7], [1, 5, 8], [0, 3, 7], [-1, 3, 6]]],
};
const SCALE = { major: [0, 2, 4, 5, 7, 9, 11, 12], minor: [0, 2, 3, 5, 7, 8, 10, 12] };
const KEYS = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const DRUM_ROWS = [['k', 'Kick'], ['s', 'Snare'], ['h', 'Hi-hat'], ['c', 'Clap']];
const BEATS = [
  { k: 'x...x...', s: '..x...x.', h: 'x.x.x.x.', c: '........' }, { k: 'x..x..x.', s: '..x...x.', h: 'xxxxxxxx', c: '........' },
  { k: 'x.x.x.x.', s: '..x...x.', h: '.x.x.x.x', c: '......x.' }, { k: 'x.....x.', s: '....x...', h: 'x.xxx.xx', c: '........' },
  { k: 'x..xx...', s: '..x...x.', h: 'xxxxxxxx', c: '..x...x.' },
];
const defaultSong = () => ({ key: 0, prog: 'vrolijk', comp: 'stab', lead: 'square', swing: 0, drums: Object.assign({}, BEATS[0]), bass: '1.1.5.8.',
  mel: [[0, 4], [2, 2], [4, 0], [6, 2], [8, 4], [10, 4], [12, 4]] });

function songToLevel(s) {
  const [, minor, prog] = CHORDS[s.prog] || CHORDS.vrolijk, sc = SCALE[minor ? 'minor' : 'major'];
  const bar = half => s.mel.filter(([st]) => (st >= 8) === half).map(([st, d]) => [st % 8, sc[d], 1]);
  return { key: s.key, prog, drums: s.drums, bass: s.bass, comp: s.comp === 'none' ? null : s.comp, lead: s.lead, leadVol: s.lead === 'sine' || s.lead === 'triangle' ? .08 : .05,
    swing: s.swing, mel: [bar(false), bar(true)] };
}
function sanitizeSong(s) {
  const d = defaultSong(); if (!s || typeof s !== 'object') return d;
  const pat = p => typeof p === 'string' && /^[x.]{8}$/.test(p) ? p : '........';
  return { key: clamp(Math.round(+s.key) || 0, 0, 11), prog: CHORDS[s.prog] ? s.prog : d.prog, comp: ['stab', 'pad', 'arp', 'none'].includes(s.comp) ? s.comp : d.comp,
    lead: ['square', 'triangle', 'sawtooth', 'sine'].includes(s.lead) ? s.lead : d.lead, swing: clamp(+s.swing || 0, 0, .4),
    drums: { k: pat(s.drums && s.drums.k), s: pat(s.drums && s.drums.s), h: pat(s.drums && s.drums.h), c: pat(s.drums && s.drums.c) },
    bass: typeof s.bass === 'string' && /^[.158]{8}$/.test(s.bass) ? s.bass : d.bass,
    mel: (Array.isArray(s.mel) ? s.mel : []).filter(m => Array.isArray(m) && m[0] >= 0 && m[0] < 16 && m[1] >= 0 && m[1] < 8).map(m => [m[0] | 0, m[1] | 0]).slice(0, 64) };
}

// ---------- scenarios: your own place, characters and action ----------
const SETTINGS = {
  stoep: ['The stoep', () => bgStoep()],
  gras: ['The grass', () => bgGrass()],
  bieb: ['The library', () => { bgRoom('#f3e6ff'); for (let x = 20; x < W - 20; x += 26) rr(x, 60, 22, 80 - (x * 7) % 24, 3, ['#ef4a36', '#4d7cf0', '#f6b92b', '#1f9e8f'][(x / 26 | 0) % 4], 2); }],
  keuken: ['The kitchen', () => { sky('#fff4dc', '#ffe8c2'); for (let x = 0; x < W; x += 60) for (let y = 0; y < 260; y += 60) rr(x + 4, y + 4, 52, 52, 4, (x + y) % 120 ? '#fff' : '#d8f0ec', 2); rr(-10, 400, W + 20, 150, 0, '#c8742c', 4); }],
  muur: ['The wall', () => { sky('#8fd3f0', '#fdeccb'); rr(-10, 300, W + 20, 250, 0, '#c4553b', 4); for (let r = 0; r < 8; r++) ln(0, 300 + r * 32, W, 300 + r * 32, 3, 'rgba(33,28,52,.4)'); }],
  disco: ['The disco', () => { sky('#ecdcff', '#ffd3e6'); for (let i = 0; i < 12; i++) rr(i * 80, 400, 80, 150, 0, ['#ef4a36', '#f6b92b', '#1f9e8f', '#4d7cf0'][i % 4], 3); circ(480, 70, 34, '#c9d3e0', 4); }],
  kermis: ['The fair', () => { sky('#bfe6f8', '#fff3db'); for (let i = 0; i < 8; i++) poly([[i * 120, 260], [i * 120 + 60, 120], [i * 120 + 120, 260]], i % 2 ? '#ef4a36' : '#fff', 3); rr(-10, 400, W + 20, 150, 0, '#d9c7a8', 4); }],
};
const CAST_NAMES = { joep: 'Joep', cas: 'Cas', luur: 'Luur', pluk: 'Pluk', zurm: 'Zurm', janet: 'Janet', fred: 'Fred', skelet: 'Skelet', toon: 'Toon', maat: 'Maat' };
const ACTIONS = { spring: 'jumps', klap: 'claps', pose: 'strikes a pose', vang: 'catches the ball', mep: 'bonks the mole', dans: 'dances' };
const SC_CALLS = { een: [1], twee: [2, 1], drie: [3, 2, 1], half: [1, .5] };
const defaultScene = () => ({ setting: 'stoep', star: 'joep', caller: 'luur', action: 'spring', call: 'Hup!', shout: 'Ja!' });
function sanitizeScene(s) {
  const d = defaultScene(); if (!s || typeof s !== 'object') return d;
  return { setting: SETTINGS[s.setting] ? s.setting : d.setting, star: CAST_NAMES[s.star] ? s.star : d.star,
    caller: s.caller === 'none' || CAST_NAMES[s.caller] ? s.caller : d.caller, action: ACTIONS[s.action] ? s.action : d.action,
    call: String(s.call || d.call).slice(0, 16), shout: String(s.shout || d.shout).slice(0, 16) };
}
const sceneHow = s => {
  const who = s.caller === 'none' ? 'A woodblock ticks' : `${CAST_NAMES[s.caller]} calls out`;
  return `${who}, and ${CAST_NAMES[s.star]} ${ACTIONS[s.action]}. Press on the beat after the call.<br>A single <b>"${s.call}"</b> = one beat later. A <b>count to two or three</b> = press on the next number. A <b>quick double call</b> = press right after the second one.`;
};
const sceneOf = P => (P.L.def && P.L.def.scene) || defaultScene();
const voiceOf = n => (PERSONA[n] && PERSONA[n].voice) || [7, 'a'];

MAKER_GAMES.scene = [['een', 'One call', 1], ['twee', 'Count of two', 2], ['drie', 'Count of three', 3], ['half', 'Quick double call', 1]];
LEVELS.push({
  id: 'scene', title: 'Own scenario', who: 'Your story', song: 'Custom', color: '#fff', accent: '#ef4a36', hidden: true,
  bpm: 120, beats: 32, key: 0, prog: CHORDS.vrolijk[2], drums: BEATS[0], bass: '1.1.5.8.', comp: 'stab',
  how: sceneHow(defaultScene()), verdict: ['Your story, your rhythm, perfectly played.', 'A good show. Take a bow.', 'Listen for the call, then count to the beat after it.'],
  chart: () => [],
  cue(e, t, spb) {
    const s = this.def ? this.def.scene : defaultScene();
    SC_CALLS[e.k].forEach((d, i) => {
      if (s.caller === 'none') { A.tone(t - d * spb, 1200 + i * 200, .04, 'square', .1); return; }
      const [base, vow] = voiceOf(s.caller); A.voice(t - d * spb, fq(base + [0, 3, 5][i]), e.k === 'half' ? .08 : .14, .9, vow);
    });
  },
  hit(t, res, e, P) {
    const s = sceneOf(P), [base] = voiceOf(s.star);
    ({ spring: () => { A.kick(t, .5); A.voice(t, fq(base + 12), .12, .8, 'a'); }, klap: () => A.clap(t, .4), pose: () => { A.clap(t, .3); A.tone(t, fq(24), .1, 'square', .06); },
      vang: () => A.tone(t, fq(19), .08, 'square', .09), mep: () => { A.kick(t, .5); A.nz(t, .06, .3, 'bandpass', 2000, 2); }, dans: () => { A.tone(t, fq(12), .06, 'square', .07); A.hat(t, .15); } })[s.action]();
  },
  miss(t, e, P) { const [base] = voiceOf(sceneOf(P).star); A.voice(t, fq(base), .25, .7, 'o', fq(base - 5)); },
  draw(P) {
    const s = sceneOf(P), CX = 270, SX = 610, Y = 330;
    SETTINGS[s.setting][1]();
    let act = null, miss = null, said = null, lead = null;
    for (const e of P.ev) {
      SC_CALLS[e.k].forEach((d, i) => { const k = P.b - (e.b - d); if (k >= 0 && k < .4) said = SC_CALLS[e.k].length > 1 && e.k !== 'half' ? ['Één!', 'Twee!', 'Drie!'][i] : s.call; });
      if (hitOk(e) && P.b - e.hb >= 0 && P.b - e.hb < .6) act = (P.b - e.hb) / .6;
      if (e.res === 'miss' && P.b >= e.b && P.b - e.b < 1) miss = (P.b - e.b);
      const L = SC_CALLS[e.k][0], k = (P.b - (e.b - L)) / L;
      if (!e.res && k >= 0 && k <= 1.2 && !lead) lead = { e, k };
    }
    const beat = Math.abs(Math.sin(P.b * Math.PI));
    if (s.caller !== 'none') actor(s.caller, { x: CX, y: Y, bob: beat * 4, ar: said ? 1 : .3, al: .2, mouth: said ? 'wow' : miss != null ? 'sad' : 'smile', eyes: 'open', look: 1 });
    else { rr(CX - 40, Y + 10, 80, 30, 8, '#9b6b43', 4); if (said) txt('tok!', CX, Y - 20, 26, INK, 'center', HAND, 400); }
    if (said && s.caller !== 'none') bubble(said, CX, 170, 26);
    const st = { x: SX, y: Y, eyes: miss != null ? 'x' : act != null ? 'happy' : 'open', mouth: miss != null ? 'sad' : act != null ? 'grin' : 'smile', look: -1 };
    if (act != null) {
      if (s.action === 'spring') st.bob = hop(act) * 110, st.arms = 1;
      else if (s.action === 'klap' || s.action === 'pose') st.arms = 1, st.squash = s.action === 'pose' ? -.25 : 0;
      else if (s.action === 'dans') st.al = act < .5 ? 1 : .2, st.ar = act < .5 ? .2 : 1, st.rot = Math.sin(act * Math.PI) * .2;
      else if (s.action === 'mep') st.ar = act < .3 ? .1 : .9;
      else st.arms = .8;
    } else st.bob = beat * 4, st.arms = lead && s.action === 'vang' ? .6 : .2;
    // props
    if (s.action === 'vang') {
      let bx = null, by = null;
      if (lead) { const k = clamp(lead.k, 0, 1); bx = lerp(CX + 30, SX - 20, k); by = lerp(Y - 40, Y - 30, k) - hop(k) * 140 * SC_CALLS[lead.e.k][0]; }
      else if (act != null && act < .7) { bx = SX - 20; by = Y - 30; }
      else if (miss != null && miss < 1) { bx = SX + 40 + miss * 200; by = Y - 30 + miss * miss * 300; }
      if (bx != null) circ(bx, by, 13, '#fff', 4);
    }
    if (s.action === 'mep') {
      ell(SX + 90, 410, 40, 10, '#5b4636', 4);
      const up = lead ? ease(clamp(lead.k, 0, 1)) : miss != null && miss < 1 ? 1 : act != null && act < .5 ? 1 - act * 2 : 0;
      if (up > .02) { g.save(); g.beginPath(); g.rect(SX + 40, 300, 100, 110); g.clip(); ell(SX + 90, 410 - up * 50, 26, 30, '#9b6b43', 4); circ(SX + 80, 400 - up * 50, 4, INK, 0); circ(SX + 100, 400 - up * 50, 4, INK, 0); g.restore(); }
      g.save(); g.translate(SX + 40, Y - 20); g.rotate(act != null && act < .3 ? 1.2 : .2); rr(-4, -60, 8, 60, 3, '#9b6b43', 3); rr(-18, -76, 36, 22, 5, '#ef4a36', 3); g.restore();
      if (miss != null && miss < 1) bubble('Hihi!', SX + 90, 300, 20);
    }
    actor(s.star, st);
    if (act != null && act < .8) {
      bubble(s.shout, SX, 150, 26);
      if (s.action === 'klap') txt('KLAP!', SX + 90, 230, 26, '#ef4a36');
      if (s.action === 'pose') for (let i = 0; i < 5; i++) txt('✦', SX + Math.cos(i * 1.3) * 80, 220 + Math.sin(i * 1.3) * 50, 20, '#f6b92b');
    }
    if (miss != null && miss < .8) txt('oei…', SX + 70, 230, 26, '#ef4a36', 'center', HAND, 400);
    // count pips over the caller, and a ring where the action lands
    if (lead) { const cs = SC_CALLS[lead.e.k]; callPips(CX, 110, cs.length + 1, cs.filter(d => P.b >= lead.e.b - d - .02).length + (P.b >= lead.e.b - .05 ? 1 : 0)); }
    const [rx, ry] = s.action === 'vang' ? [SX - 20, Y - 30] : s.action === 'mep' ? [SX + 90, 370] : [SX, Y - 60];
    P.ev.forEach(e => cueRing(P, e, rx, ry, SC_CALLS[e.k][0], '#ef4a36', 70));
  },
});

// ---------- composer + scenario panels ----------
function opt(list, val) { return Object.entries(list).map(([k, v]) => `<option value="${k}"${k == val ? ' selected' : ''}>${Array.isArray(v) ? v[0] : v}</option>`).join(''); }
function renderComposer() {
  $('sceneBox').style.display = MK.game === 'scene' ? '' : 'none';
  $('songBox').style.display = MK.music === 'custom' ? '' : 'none';
  if (MK.game === 'scene') renderScene();
  if (MK.music === 'custom') renderSong();
}
function renderScene() {
  const s = MK.scene, people = Object.fromEntries(Object.entries(CAST_NAMES));
  $('sceneBox').innerHTML = `<h4>Your scenario</h4><div class="mkbar">
    <label>Place <select data-f="setting">${opt(Object.fromEntries(Object.entries(SETTINGS).map(([k, v]) => [k, v[0]])), s.setting)}</select></label>
    <label>Star (you) <select data-f="star">${opt(people, s.star)}</select></label>
    <label>Gives the cues <select data-f="caller">${opt(Object.assign({ none: 'Nobody (woodblock)' }, people), s.caller)}</select></label>
    <label>Action <select data-f="action">${opt(Object.fromEntries(Object.entries(ACTIONS).map(([k, v]) => [k, `${k[0].toUpperCase() + k.slice(1)} · ${v}`])), s.action)}</select></label>
    <label>Call word <input data-f="call" maxlength="16" value="${s.call.replace(/"/g, '&quot;')}"></label>
    <label>Shout on hit <input data-f="shout" maxlength="16" value="${s.shout.replace(/"/g, '&quot;')}"></label></div>`;
  $('sceneBox').querySelectorAll('[data-f]').forEach(el => { el.oninput = el.onchange = () => { MK.scene[el.dataset.f] = el.value; }; });
}
function renderSong() {
  const s = MK.song, box = $('songBox');
  const row = (label, cells) => `<div class="sgrow"><span>${label}</span>${cells}</div>`;
  const drumRows = DRUM_ROWS.map(([k, n]) => row(n, [...s.drums[k]].map((c, i) => `<button class="sgc${c === 'x' ? ' on' : ''}${i % 2 ? '' : ' beat'}" data-d="${k}" data-i="${i}"></button>`).join(''))).join('');
  const bassRow = row('Bass', [...s.bass].map((c, i) => `<button class="sgc bass${c !== '.' ? ' on' : ''}${i % 2 ? '' : ' beat'}" data-b="${i}">${c === '.' ? '' : c}</button>`).join(''));
  const melRows = [7, 6, 5, 4, 3, 2, 1, 0].map(d => row(d === 7 ? 'Melody ↑' : d === 0 ? '↓' : '', [...Array(16)].map((_, i) => `<button class="sgc mel${s.mel.some(m => m[0] === i && m[1] === d) ? ' on' : ''}${i % 2 ? '' : ' beat'}${i === 8 ? ' bar' : ''}" data-m="${i}" data-deg="${d}"></button>`).join(''))).join('');
  box.innerHTML = `<h4>Your song</h4><div class="mkbar">
    <label>Key <select data-s="key">${KEYS.map((k, i) => `<option value="${i}"${i === s.key ? ' selected' : ''}>${k}</option>`).join('')}</select></label>
    <label>Chords <select data-s="prog">${opt(CHORDS, s.prog)}</select></label>
    <label>Chord style <select data-s="comp">${opt({ stab: 'Stabs', pad: 'Pad', arp: 'Arpeggio', none: 'None' }, s.comp)}</select></label>
    <label>Lead <select data-s="lead">${opt({ square: 'Chiptune', triangle: 'Flute', sawtooth: 'Buzzy', sine: 'Soft' }, s.lead)}</select></label>
    <label>Swing <input type="range" data-s="swing" min="0" max="0.4" step="0.05" value="${s.swing}"></label></div>
    <div class="sgwrap">${drumRows}${bassRow}<div style="height:8px"></div>${melRows}</div>
    <div class="row" style="margin-top:10px"><button class="btn small" id="sgPlay">▸ Preview</button><button class="btn alt small" id="sgStop">■ Stop</button>
    <button class="btn alt small" id="sgRand">🎲 Random beat</button><button class="btn alt small" id="sgMel">🎲 Random tune</button></div>`;
  box.querySelectorAll('[data-s]').forEach(el => el.onchange = el.oninput = () => { s[el.dataset.s] = el.dataset.s === 'key' || el.dataset.s === 'swing' ? +el.value : el.value; });
  box.querySelectorAll('[data-d]').forEach(el => el.onclick = () => { const k = el.dataset.d, i = +el.dataset.i, p = [...s.drums[k]]; p[i] = p[i] === 'x' ? '.' : 'x'; s.drums[k] = p.join(''); tick(k === 'k' ? 200 : k === 's' ? 900 : 4000); renderSong(); });
  box.querySelectorAll('[data-b]').forEach(el => el.onclick = () => { const i = +el.dataset.b, p = [...s.bass], cyc = ['.', '1', '5', '8']; p[i] = cyc[(cyc.indexOf(p[i]) + 1) % 4]; s.bass = p.join(''); tick(150); renderSong(); });
  box.querySelectorAll('[data-m]').forEach(el => el.onclick = () => {
    const st = +el.dataset.m, d = +el.dataset.deg, i = s.mel.findIndex(m => m[0] === st && m[1] === d);
    if (i >= 0) s.mel.splice(i, 1); else { s.mel = s.mel.filter(m => m[0] !== st); s.mel.push([st, d]); notePreview(d); }
    renderSong();
  });
  $('sgPlay').onclick = previewSong; $('sgStop').onclick = () => { if (ac) newBus(); };
  $('sgRand').onclick = () => { s.drums = Object.assign({}, BEATS[Math.floor(Math.random() * BEATS.length)]); s.bass = ['1.1.5.8.', '1..5..8.', '18181818', '1.5.8.5.', '1.3.5.8.'.replace(/3/g, '5')][Math.floor(Math.random() * 5)]; renderSong(); };
  $('sgMel').onclick = () => { s.mel = []; let d = 4; for (let st = 0; st < 16; st += Math.random() < .3 ? 1 : 2) { d = clamp(d + Math.floor(Math.random() * 5) - 2, 0, 7); s.mel.push([st, d]); } renderSong(); };
}
function tick(f) { initAudio(); if (!OUT) newBus(); A.tone(ac.currentTime, f, .05, 'square', .06); }
function notePreview(d) { initAudio(); if (!OUT) newBus(); const [, minor] = CHORDS[MK.song.prog]; A.tone(ac.currentTime, fq(MK.song.key + 12 + SCALE[minor ? 'minor' : 'major'][d]), .2, MK.song.lead, .08); }
function previewSong() {
  initAudio(); newBus();
  const L = Object.assign({ beats: 16, intro: 0 }, songToLevel(MK.song));
  for (let b = 0; b < 4; b++) scheduleSong(L, ac.currentTime + .1, 60 / MK.bpm, b, b + 1);
}
