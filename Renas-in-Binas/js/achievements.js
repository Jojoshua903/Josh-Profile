import { $, toast, banner } from './core.js?v=20261112i';
import { sfx } from './audio.js?v=20261112i';

// ACHIEVEMENTS. Most of them are read straight from the save (bosses beaten, gears found, play time...),
// so they also work for old saves. A few are moments (a quick boss fight, a fast planet): main.js calls
// unlockAch() for those. Unlocked achievements live in save.ach as { id: play time when unlocked }.
const STORY = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], PARK = [12, 13, 14];
const n = (arr, f) => arr.filter(f).length;
const bosses = (s) => n(STORY, (i) => s.cleared[i]);
const gears = (s) => Object.keys(s.rares || {}).length;
const firstTry = (s) => n(STORY.concat(11), (i) => s.cleared[i] && s.tries[i] === 1);
const god = (s) => s.god || { hall: {}, pan: {} };
// the finish time. Saves from before the speedrun achievements have no finaleTime: then the total play time is used,
// which is always at least the finish time, so an old save can earn them but never too easily
const finT = (s) => (s.finaleTime !== undefined ? s.finaleTime : s.finale ? s.time || 0 : undefined);
// any sign that you have played: older saves may not have the 'visited' mark yet
const started = (s) => !!((s.w.milo && s.w.milo.visited) || s.unlocked > 0 || s.finale || (s.cleared || []).some(Boolean) || Object.keys(s.rares || {}).length);
const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

// [id, icon, English name, Dutch name, English description, Dutch description, test(save), progress(save) -> [have, need]]
export const ACH = [
  ['start', '🚀', 'Lift-off', 'Lancering', 'Land on your first planet', 'Land op je eerste planeet', started],
  ['boss1', '⚡', 'First core', 'Eerste kern', 'Beat your first boss', 'Versla je eerste baas', (s) => bosses(s) >= 1],
  ['half', '🌗', 'Halfway there', 'Halverwege', 'Beat 6 story bosses', 'Versla 6 verhaalbazen', (s) => bosses(s) >= 6, (s) => [bosses(s), 6]],
  ['allboss', '👾', 'Boss hunter', 'Bazenjager', 'Beat all 11 story bosses', 'Versla alle 11 verhaalbazen', (s) => bosses(s) >= 11, (s) => [bosses(s), 11]],
  ['finale', '🏁', 'Captain Rênas', 'Kapitein Rênas', 'Finish the story', 'Speel het verhaal uit', (s) => !!s.finale],
  ['speed60', '⏱️', 'Speedrunner', 'Speedrunner', 'Finish the story in under 2 hours of play (conversations don\'t count)', 'Speel het verhaal uit in minder dan 2 uur speeltijd (gesprekken tellen niet mee)', (s) => !!s.finale && finT(s) < 7200],
  ['speed30', '⚡', 'Lightning run', 'Bliksemrun', 'Finish the story in under 1 hour of play (conversations don\'t count)', 'Speel het verhaal uit in minder dan 1 uur speeltijd (gesprekken tellen niet mee)', (s) => !!s.finale && finT(s) < 3600],
  ['bossfast', '💨', 'Quick fight', 'Snel klaar', 'Beat a boss within 60 seconds', 'Versla een baas binnen 60 seconden', () => false],
  ['planetfast', '🛸', 'Rocket speed', 'Raketvaart', 'Beat a planet’s boss within 5 minutes of landing', 'Versla de baas van een planeet binnen 5 minuten na het landen', () => false],
  ['try1', '🎯', 'First try!', 'In één keer!', 'Beat a boss on your first try', 'Versla een baas in één poging', (s) => firstTry(s) >= 1],
  ['try5', '🥇', 'Untouchable', 'Onverslaanbaar', 'Beat 5 bosses on your first try', 'Versla 5 bazen in één poging', (s) => firstTry(s) >= 5, (s) => [firstTry(s), 5]],
  ['gear25', '⚙️', 'Gear collector', 'Tandwielverzamelaar', 'Find 25 golden gears', 'Vind 25 gouden tandwielen', (s) => gears(s) >= 25, (s) => [gears(s), 25]],
  ['gearall', '🌟', 'Every last gear', 'Alle tandwielen', 'Find all 60 golden gears', 'Vind alle 60 gouden tandwielen', (s) => gears(s) >= 60, (s) => [gears(s), 60]],
  ['bolts', '🔩', 'Bolt millionaire', 'Boutenmiljonair', 'Have 500 bolts', 'Heb 500 bouten', (s) => (s.coins || 0) >= 500, (s) => [Math.min(500, s.coins || 0), 500]],
  ['park', '🤸', 'Parkour king', 'Parkourkoning', 'Clear all 3 parkour planets', 'Haal alle 3 parkourplaneten', (s) => n(PARK, (i) => s.cleared[i]) >= 3, (s) => [n(PARK, (i) => s.cleared[i]), 3]],
  ['nofall', '🦶', 'Sure-footed', 'Vaste voeten', 'Clear a parkour planet without falling once', 'Haal een parkourplaneet zonder één keer te vallen', (s) => PARK.some((i) => s.cleared[i] && s.tries[i] === 1)],
  ['werk', '🏭', 'Golden worker', 'Gouden werker', 'Beat Tandwieltron on the bonus planet', 'Versla Tandwieltron op de bonusplaneet', (s) => !!s.cleared[11]],
  ['trophy', '🏆', 'Golden Rênas', 'Gouden Rênas', 'Open the Gouden Kluis', 'Open de Gouden Kluis', (s) => !!s.trophy],
  ['temple', '🏛️', 'Pilgrim', 'Pelgrim', 'Visit De Sterrentempel', 'Bezoek De Sterrentempel', (s) => !!((s.w.tempel && s.w.tempel.visited) || Object.keys(god(s).hall || {}).length || Object.keys(god(s).pan || {}).length)],
  ['radiant', '✨', 'Radiant', 'Stralend', 'Beat a hologram on Stralend', 'Versla een hologram op Stralend', (s) => Object.values(god(s).hall).some((v) => v >= 3)],
  ['pantheon', '🚪', 'Through the door', 'Door de deur', 'Clear a pantheon', 'Haal een pantheon', (s) => Object.values(god(s).pan).some((p) => p && p.done)],
  ['galaxy', '🌌', 'Radiant captain', 'Stralende kapitein', 'Clear the Pantheon of the Galaxy', 'Haal het Pantheon van de Melkweg', (s) => !!(god(s).pan[3] && god(s).pan[3].done)],
  ['crown', '👑', 'Not a scratch', 'Geen schrammetje', 'Clear a pantheon without getting hit', 'Haal een pantheon zonder één klap', (s) => Object.values(god(s).pan).some((p) => p && p.nohit)],
  ['oei', '🤕', 'Oei!', 'Oei!', 'Say “oei!” 50 times', 'Zeg 50 keer “oei!”', (s) => (s.deaths || 0) >= 50, (s) => [Math.min(50, s.deaths || 0), 50]],
];

let api = null, queue = [], qT = 0;
export function initAch(a) { api = a; }
const has = (s, id) => !!(s.ach && s.ach[id] !== undefined);
function grant(s, id, loud) {
  if (has(s, id)) return;
  s.ach = s.ach || {}; s.ach[id] = Math.round(s.time || 0);
  api.persist();
  if (loud) queue.push(id);
}
// check every achievement against the save. loud = the player is playing, so show a banner
export function checkAch(loud, dt = 0) {
  const s = api.save(); if (!s) return;
  s.w = s.w || {}; s.cleared = s.cleared || []; s.tries = s.tries || [];   // very old saves can miss these
  for (const a of ACH) if (!has(s, a[0])) { let ok = false; try { ok = a[6](s); } catch (e) { ok = false; } if (ok) grant(s, a[0], loud); }
  qT -= dt;
  if (queue.length && qT <= 0) {   // one at a time, so a few at once don't pile up on screen
    const a = ACH.find((x) => x[0] === queue.shift()), nl = api.nl();
    if (a) { sfx.rare(); banner(nl ? 'PRESTATIE!' : 'ACHIEVEMENT!', `${a[1]} ${nl ? a[3] : a[2]}`, '#ffd23a'); toast(`🏆 ${nl ? a[5] : a[4]}`, 2600); }
    qT = 3;
  }
}
export function unlockAch(id) { const s = api.save(); if (s) grant(s, id, true); }

export function buildAchPanel() {
  checkAch(false);   // an old save gets everything it already earned before the list is drawn
  const s = api.save(), nl = api.nl(), list = $('achList');
  list.innerHTML = '';
  const got = ACH.filter((a) => has(s, a[0])).length;
  $('achSum').innerHTML = `<b>${got} / ${ACH.length}</b> ${nl ? 'behaald' : 'unlocked'} · ⏱ ${nl ? 'speeltijd' : 'play time'} ${mmss(s.time || 0)}`
    + (s.finaleTime !== undefined ? ` · 🏁 ${nl ? 'uitgespeeld in' : 'finished in'} <b>${mmss(s.finaleTime)}</b>` : '');
  for (const a of ACH) {
    const on = has(s, a[0]);
    const el = document.createElement('div'); el.className = 'ach' + (on ? '' : ' off');
    let extra = on ? `<small class="when">✅ ${nl ? 'behaald op' : 'unlocked at'} ${mmss(s.ach[a[0]])}</small>` : '';
    if (!on && a[7]) { const [h, need] = a[7](s); extra = `<div class="bar"><i style="width:${Math.min(100, (h / need) * 100)}%"></i></div><small class="when">${h} / ${need}</small>`; }
    el.innerHTML = `<span class="ic">${a[1]}</span><span class="tx"><b>${nl ? a[3] : a[2]}</b><small>${nl ? a[5] : a[4]}</small>${extra}</span>`;
    list.appendChild(el);
  }
}
