'use strict';
// ---------- Uitdagingen: replay songs with a twist ----------
// twists: noRings (no help circles), speed (tempo ×), dark (lights only flash on the beat), mirror (picture flipped),
//         noMiss (zero misses), clean (zero stray taps), min (score needed, default 62)
const TWISTS = {
  noRings: ['🙈', 'No help circles'], speed: ['⏩', 'Faster tempo'], dark: ['🌙', 'Lights out: the picture only flashes on the beat'],
  mirror: ['🪞', 'Mirror: the whole picture is flipped'], noMiss: ['💯', 'Not a single miss'], clean: ['🧹', 'No stray taps'],
};
const CHALLENGES = [
  { id: 'c_stoep', lv: 'stoep', name: 'Op Gehoor', noRings: true, line: 'Joep: “You don’t need circles. You’ve got ears!”' },
  { id: 'c_gras', lv: 'gras', name: 'Wakkere Cas', speed: 1.25, line: 'Cas: “Why is everything so fast today…”' },
  { id: 'c_fiets', lv: 'fiets', name: 'Geen Eend Gemist', noMiss: true, line: 'Luur: “Not one duck. Promise.”' },
  { id: 'c_muur', lv: 'muur', name: 'Muur in het Donker', dark: true, line: 'Luur: “Who turned off the street lights?”' },
  { id: 'c_pluk', lv: 'pluk', name: 'Spiegeltuin', mirror: true, line: 'Pluk: “Wortel… lettrow?”' },
  { id: 'c_zurm', lv: 'zurm', name: 'Snellezer', speed: 1.2, noRings: true, line: 'Zurm: “Speed reading! Don’t skip a page.”' },
  { id: 'c_raket', lv: 'raket', name: 'Nette Monteur', clean: true, min: 75, line: 'Fred: “A real engineer never taps twice.”' },
  { id: 'c_skelet', lv: 'skelet', name: 'Spookshow', dark: true, line: 'Skelet: “I glow in the dark. Sort of.”' },
  { id: 'c_klomp', lv: 'klomp', name: 'Blinde Klompen', noRings: true, min: 75, line: 'Joep: “Just listen to my stomps.”' },
  { id: 'c_toon', lv: 'toon', name: 'Boze Toon', speed: 1.15, line: 'Toon: “FASTER! My tentacles are FASTER!”' },
  { id: 'c_tuin', lv: 'tuin', name: 'Achterstevoren Tuin', mirror: true, line: 'Pieter: “The plants are on the wrong side!”' },
  { id: 'c_meloen', lv: 'meloen', name: 'Nachtmarkt', dark: true, line: 'Koen: “Soldiers work at night too.”' },
  { id: 'c_huil', lv: 'huil', name: 'Volle Maan', dark: true, noRings: true, line: 'Rolf: “Only the moon. And you.”' },
  { id: 'c_baas', lv: 'baas', name: 'Baas Superb', min: 88, line: 'De Baas: “Superb or nothing, earthling.”' },
  { id: 'c_kegel', lv: 'kegel', name: 'Turbo Kegelen', speed: 1.25, line: 'Skelet: “My head’s spinning faster than the ball!”' },
  { id: 'c_mega', lv: 'megamix', name: 'Megamix Zonder Hulp', noRings: true, line: 'Maat: “I’ll be watching. No help this time.”' },
];
let CHAL = null;   // the challenge being played (null for a normal song)
const chalLevel = c => LEVELS.find(l => l.id === c.lv);
const chalOpen = c => { const L = chalLevel(c); return L && (L.arcade || (SAVE.best[L.id] ?? -1) >= 62); };
const chalTwists = c => Object.keys(TWISTS).filter(k => c[k]).map(k => k === 'speed' ? `⏩ ${Math.round(c.speed * 100)}% speed` : TWISTS[k].join(' '));
const chalGoal = c => `Score ${c.min || 62}+${c.noMiss ? ', no misses' : ''}${c.clean ? ', no stray taps' : ''}`;
const today = () => new Date().toISOString().slice(0, 10);

// one new challenge a day: a random cleared song with two random twists, the same for everyone that day
function dailyChal() {
  let h = 0; for (const ch of today()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => (h = (h * 1103515245 + 12345) >>> 0) / 4294967296;
  const pool = ALL.filter(L => L.id !== 'megamix' && (L.arcade || (SAVE.best[L.id] ?? -1) >= 62));
  if (!pool.length) return null;
  const L = pool[Math.floor(rnd() * pool.length)];
  const opts = [{ noRings: true }, { speed: 1.2 }, { dark: true }, { mirror: true }, { clean: true }];
  const a = Math.floor(rnd() * opts.length), b = (a + 1 + Math.floor(rnd() * (opts.length - 1))) % opts.length;
  return Object.assign({ id: 'daily_' + today(), lv: L.id, name: 'Uitdaging van de Dag', daily: true, line: 'Maat: “A new one tomorrow. Same time, same stoep.”' }, opts[a], opts[b]);
}
const chalDone = c => c.daily ? !!(SAVE.daily || {})[today()] : !!(SAVE.chal || {})[c.id];
const chalCount = () => CHALLENGES.filter(chalDone).length;

function chalCard(c) {
  const L = chalLevel(c), open = chalOpen(c), done = chalDone(c), el = document.createElement('div');
  el.className = 'card' + (open ? '' : ' locked'); el.style.background = c.daily ? '#ffd75e' : L.color;
  el.innerHTML = `<div class="disc" style="--c:${L.accent}"></div>
    ${done ? '<span class="stamp" style="background:#7bc96f">✓ Gehaald</span>' : ''}
    <div class="no">${Object.keys(TWISTS).filter(k => c[k]).map(k => TWISTS[k][0]).join('')}</div>
    <div class="nm">${c.name}<span class="who">${L.title} · ${chalGoal(c)}</span></div>`;
  if (open) el.onclick = () => openChal(c);
  return el;
}
function openChallenges() {
  mode = 'chal';
  $('brTitle').textContent = 'Uitdagingen'; $('brPill').textContent = `${chalCount()}/${CHALLENGES.length} gehaald`;
  $('brHint').textContent = 'Songs you know, with a twist. Clear a song in the story to open its challenge. A new daily challenge every day.';
  const grid = $('mpGrid'); grid.innerHTML = '';
  const head = t => { const h = document.createElement('div'); h.className = 'ghead'; h.textContent = t; grid.appendChild(h); };
  const d = dailyChal();
  head(`Vandaag · ${Object.keys(SAVE.daily || {}).length} days done`);
  if (d) grid.appendChild(chalCard(d));
  else { const p = document.createElement('p'); p.className = 'chblurb'; p.style.gridColumn = '1/-1'; p.textContent = 'Clear your first song to unlock the daily challenge.'; grid.appendChild(p); }
  head('Uitdagingen'); CHALLENGES.forEach(c => grid.appendChild(chalCard(c)));
  show('multi');
}
function openChal(c) {
  openLevel(chalLevel(c));
  // openLevel may play a story scene first; set the challenge once the intro sheet is up
  const apply = () => {
    if (mode === 'story') return setTimeout(apply, 100);
    if (mode !== 'intro') return;
    CHAL = c;
    $('iNo').textContent = c.daily ? 'Uitdaging van de Dag' : 'Uitdaging';
    $('iTitle').textContent = `${c.name} · ${cur.title}`;
    $('iHow').innerHTML = `<b>${chalTwists(c).join(' · ')}</b><br>Goal: <b>${chalGoal(c)}</b>.<br><i>${c.line}</i><br><br>${cur.how}`;
    $('practiceBtn').style.display = 'none'; $('perfectBtn').style.display = 'none';
  };
  apply();
}
// called from finish(): did the run beat the challenge?
function chalResult(c, s) {
  const pass = s >= (c.min || 62) && (!c.noMiss || P.misses === 0) && (!c.clean || P.whiffs === 0);
  if (pass) { if (c.daily) (SAVE.daily = SAVE.daily || {})[today()] = true; else (SAVE.chal = SAVE.chal || {})[c.id] = true; save(); }
  return pass;
}
// lights out and mirror, drawn around the level picture
function chalBefore(c) { if (c.mirror) { g.translate(W, 0); g.scale(-1, 1); } }
function chalAfter(c, b) {
  if (!c.dark) return;
  const f = b - Math.floor(b), lit = Math.max(0, 1 - f * 3.5);
  g.fillStyle = `rgba(20,16,40,${.93 - .75 * lit})`; g.fillRect(0, 0, W, H);
}
