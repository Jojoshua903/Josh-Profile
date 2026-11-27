import { MAPS } from './data.js?v=20261129f';
import { ARCHETYPES } from './heroes.js?v=20261129f';
import { addTokens } from './slots.js?v=20261129f';

// Achievements: one-off feats ("Knock out an enemy with a ball that bounced first") and lifetime
// goals ("Play on every stage"). Each one unlocks once, for good; every 5 unlocked pays a slot
// machine token. Saved under a "supermaxx-" key, so it follows your account between devices.
// Feats unlock the moment they happen (feat); lifetime goals are counted with bump and checked
// at the end of every match (endMatch).

const KEY = 'supermaxx-achievements', PER_TOKEN = 5;
const S = (() => {
  try { const v = JSON.parse(localStorage.getItem(KEY) || '{}'); return { got: v.got || {}, c: v.c || {}, sets: v.sets || {} }; }
  catch { return { got: {}, c: {}, sets: {} }; }
})();
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };
const count = k => S.c[k] || 0, size = k => (S.sets[k] || []).length;

// group, id, icon, name, how to get it, and for lifetime goals: [current, needed]
export const ACH = [
  // ---- combat ----
  { g: 'Combat', id: 'first', icon: '🎯', name: 'First Blood', desc: 'Knock out an enemy hero', prog: () => [count('kills'), 1] },
  { g: 'Combat', id: 'double', icon: '✌️', name: 'Double Trouble', desc: 'Get a double kill' },
  { g: 'Combat', id: 'triple', icon: '🎩', name: 'Hat Trick', desc: 'Get a triple kill' },
  { g: 'Combat', id: 'maxxacre', icon: '💥', name: 'Maxxacre', desc: 'Knock out 5 heroes in one chain of kills' },
  { g: 'Combat', id: 'ten', icon: '🔟', name: 'Double Digits', desc: 'Knock out 10 heroes in one match' },
  { g: 'Combat', id: 'untouchable', icon: '😇', name: 'Untouchable', desc: 'Win with 5+ knockouts and without being knocked out' },
  { g: 'Combat', id: 'clutch', icon: '🧵', name: 'Hanging by a Thread', desc: 'Knock out an enemy while you’re under 10% health' },
  { g: 'Combat', id: 'bank', icon: '🎱', name: 'Bank Shot', desc: 'Knock out an enemy with one of Tilt’s balls after it bounces' },
  { g: 'Combat', id: 'heads', icon: '🤯', name: 'Headhunter', desc: 'Land 250 headshots', prog: () => [count('heads'), 250] },
  { g: 'Combat', id: 'k500', icon: '☠️', name: 'Five Hundred Club', desc: 'Knock out 500 heroes in total', prog: () => [count('kills'), 500] },
  { g: 'Combat', id: 'medic', icon: '✚', name: 'Field Medic', desc: 'Heal 2,000 in one match' },
  { g: 'Combat', id: 'towers', icon: '🏰', name: 'Tower Toppler', desc: 'Finish off 25 towers', prog: () => [count('towers'), 25] },
  // ---- modes ----
  { g: 'Modes', id: 'owngoal', icon: '🙃', name: 'Wrong Way', desc: 'Win a Smash Ball match where you scored an own goal' },
  { g: 'Modes', id: 'boot', icon: '👟', name: 'Golden Boot', desc: 'Score 3 goals in one Smash Ball match' },
  { g: 'Modes', id: 'survivor', icon: '👑', name: 'Last One Standing', desc: 'Win a Survivor match' },
  { g: 'Modes', id: 'potato', icon: '🥔', name: 'Hot Hands', desc: 'Win a Hot Potato match' },
  { g: 'Modes', id: 'flawless', icon: '⚔️', name: 'Flawless', desc: 'Win a duel without losing a round' },
  { g: 'Modes', id: 'raid', icon: '🐉', name: 'Giant Slayer', desc: 'Beat a Boss Raid' },
  { g: 'Modes', id: 'story', icon: '📖', name: 'Storyteller', desc: 'Clear 5 story missions', prog: () => [count('story'), 5] },
  { g: 'Modes', id: 'online', icon: '🌐', name: 'Party Time', desc: 'Win an online match' },
  { g: 'Modes', id: 'night', icon: '🌙', name: 'Night Owl', desc: 'Win 5 matches on night stages', prog: () => [count('nightWins'), 5] },
  { g: 'Modes', id: 'rankwin', icon: '🏅', name: 'Ranked Debut', desc: 'Win a ranked match' },
  { g: 'Modes', id: 'rankgold', icon: '🥇', name: 'Going for Gold', desc: 'Reach Gold in Ranked' },
  { g: 'Modes', id: 'ranklegend', icon: '👑', name: 'Maxx Legend', desc: 'Reach the top rank in Ranked' },
  // ---- the long game ----
  { g: 'Long game', id: 'm100', icon: '🎖️', name: 'Veteran', desc: 'Play 100 matches', prog: () => [count('matches'), 100] },
  { g: 'Long game', id: 'w50', icon: '🏆', name: 'Winner Winner', desc: 'Win 50 matches', prog: () => [count('wins'), 50] },
  { g: 'Long game', id: 'classes', icon: '🃏', name: 'Jack of All Trades', desc: 'Win with a hero from every class', prog: () => [size('archWins'), ARCHETYPES.length] },
  { g: 'Long game', id: 'heroes', icon: '🎭', name: 'Full House', desc: 'Play 15 different heroes', prog: () => [size('heroes'), 15] },
  { g: 'Long game', id: 'maps', icon: '🗺️', name: 'Globetrotter', desc: 'Play on every stage', prog: () => [MAPS.filter(m => (S.sets.maps || []).includes(m.id)).length, MAPS.length] },
  // ---- style ----
  { g: 'Style', id: 'showboat', icon: '💃', name: 'Showboat', desc: 'Emote within 3s of a knockout' },
  { g: 'Style', id: 'tagger', icon: '🎨', name: 'Tagger', desc: 'Spray 25 times', prog: () => [count('sprays'), 25] },
];

let listeners = [];
export const onAchievement = fn => { listeners.push(fn); };
export const achGot = id => !!S.got[id];
export const achCount = () => Object.keys(S.got).length;
export const achWhen = id => S.got[id] || 0;
export const achProgress = a => a.prog ? a.prog() : null;
export const nextToken = () => PER_TOKEN - (achCount() % PER_TOKEN);
export const PER_ACH_TOKEN = PER_TOKEN;

function unlock(id) {
  const a = ACH.find(x => x.id === id);
  if (!a || S.got[id]) return false;
  S.got[id] = Date.now();
  const token = achCount() % PER_TOKEN === 0;
  if (token) addTokens(1);
  persist();
  listeners.forEach(fn => fn(a, token));
  return true;
}
// unlock any lifetime goal that's now complete
function check() { for (const a of ACH) if (a.prog && !S.got[a.id]) { const [c, n] = a.prog(); if (c >= n) unlock(a.id); } }

export function feat(id) { unlock(id); }
export function bump(k, n = 1) { S.c[k] = count(k) + n; persist(); }
const addTo = (k, v) => { const s = S.sets[k] ||= []; if (v && !s.includes(v)) s.push(v); };

// m: { win, mode, map, night, online, hero, arch, kills, deaths, heal, goals, ownGoal, shutout }
export function endMatch(m) {
  S.c.matches = count('matches') + 1;
  if (m.heads) S.c.heads = count('heads') + m.heads;           // headshots are tallied in the match and saved once at the end
  if (m.win) S.c.wins = count('wins') + 1;
  if (m.win && m.night) S.c.nightWins = count('nightWins') + 1;
  addTo('heroes', m.hero); addTo('maps', m.map);
  if (m.win) addTo('archWins', m.arch);
  persist();
  if (m.kills >= 10) unlock('ten');
  if (m.win && m.kills >= 5 && m.deaths === 0) unlock('untouchable');
  if ((m.heal || 0) >= 2000) unlock('medic');
  if (m.mode === 'ball' && m.goals >= 3) unlock('boot');
  if (m.mode === 'ball' && m.win && m.ownGoal) unlock('owngoal');
  if (m.win && m.mode === 'survivor') unlock('survivor');
  if (m.win && m.mode === 'potato') unlock('potato');
  if (m.win && m.mode === 'raid') unlock('raid');
  if (m.win && m.mode === 'duel' && m.shutout) unlock('flawless');
  if (m.win && m.online) unlock('online');
  check();
}
// lifetime counters that can finish mid-match (headshots, towers, sprays) get checked as they go
export function bumpAndCheck(k, n = 1) { bump(k, n); check(); }
export function setStory(n) { if (n > count('story')) { S.c.story = n; persist(); check(); } }
