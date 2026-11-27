// Recruitment contracts: a third way to unlock heroes, next to the season pass and the slot
// machine. Each contract hero sends you three tasks; every match you finish (with any hero)
// counts towards them, and finishing all three recruits the hero for good. Saved locally.
// Three contracts are on offer at a time. Waiting (`waiting: true`) contracts stay sealed, and
// the next one in line arrives as soon as a slot is free (any contract finished), with goals of
// its own that fit the hero. They only count matches played after they arrive.

const KEY = 'supermaxx-contracts', SLOTS = 3;
const S = (() => { try { return { stats: {}, base: {}, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { stats: {}, base: {} }; } })();
S.base ||= {};
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };

// stat keys: played, wins, kills, dmg, heal, arch:<archetype>, mode:<mode>, map:<map id>, plus
// per-match counts from the hero's `cs` tally: air (eliminations while airborne), heads (headshot
// hits on heroes), ults (ultimates used) and towers (towers and cores you finished off)
export const CONTRACTS = [
  {
    hero: 'wellington', from: 'The Gourmet Guild', seal: '🍽️',
    pitch: 'Wanted: a team that knows how to look after its guests. Feed your friends and you shall be served.',
    tasks: [
      { stat: 'heal', n: 2000, label: 'Heal 2,000 health' },
      { stat: 'arch:support', n: 4, label: 'Play 4 matches as a support' },
      { stat: 'wins', n: 3, label: 'Win 3 matches' },
    ],
  },
  {
    hero: 'shepherd', from: 'The Highland Grazing Board', seal: '🐑',
    pitch: 'Wanted: someone who can keep a flock together and the wolves apart. References from sheep accepted.',
    tasks: [
      { stat: 'kills', n: 40, label: 'Get 40 eliminations' },
      { stat: 'arch:control', n: 4, label: 'Play 4 matches as a control hero' },
      { stat: 'mode:hill', n: 2, label: 'Play 2 Hill Rush matches' },
    ],
  },
  {
    hero: 'microwave', from: 'Kitchen Appliance Union, Local 1000', seal: '🔔',
    pitch: 'Wanted: a team tough enough to take the heat. Must tolerate humming. Ding.',
    tasks: [
      { stat: 'dmg', n: 10000, label: 'Deal 10,000 damage' },
      { stat: 'arch:tank', n: 4, label: 'Play 4 matches as a tank' },
      { stat: 'wins', n: 5, label: 'Win 5 matches' },
    ],
  },
  {
    hero: 'chef', from: 'The Solmare Grand Hotel Kitchen', seal: '👨‍🍳', waiting: true,
    pitch: 'Wanted: a brigade that can handle the heat. Our head chef is bored and the kitchen is, once again, on fire.',
    tasks: [
      { stat: 'ults', n: 10, label: 'Use your ultimate 10 times' },
      { stat: 'map:plaza', n: 2, label: 'Play 2 matches on Solmare Piazza' },
      { stat: 'dmg', n: 12000, label: 'Deal 12,000 damage' },
    ],
  },
  {
    hero: 'manspider', from: 'Longlegs & Associates, Chartered Accountants', seal: '🕷️', waiting: true,
    pitch: 'Wanted: a team for a mild-mannered spider with a day job. Must be comfortable with heights, ceilings and expense reports.',
    tasks: [
      { stat: 'heads', n: 60, label: 'Land 60 headshots' },
      { stat: 'towers', n: 3, label: 'Finish off 3 towers or cores' },
      { stat: 'wins', n: 4, label: 'Win 4 matches' },
    ],
  },
  {
    hero: 'owl', from: 'The Midnight Post Office', seal: '🦉', waiting: true,
    pitch: 'Wanted: a team that works nights. Our best courier wants a new route. Must not mind feathers.',
    tasks: [
      { stat: 'map:skyreach', n: 2, label: 'Play 2 matches on Skyreach Isles' },
      { stat: 'ults', n: 8, label: 'Use your ultimate 8 times' },
      { stat: 'wins', n: 3, label: 'Win 3 matches' },
    ],
  },
];
// the goals these contracts had before, so anyone who already recruited a hero keeps them
const LEGACY = {
  chef: [['dmg', 12000], ['arch:damage', 4], ['kills', 30]],
  manspider: [['played', 6], ['arch:control', 3], ['wins', 4]],
  owl: [['kills', 35], ['arch:damage', 4], ['wins', 4]],
};
for (const c of CONTRACTS) for (const t of c.tasks) t.hero = c.hero;
export const CONTRACT_HEROES = CONTRACTS.map(c => c.hero);
export const isContractHero = id => CONTRACT_HEROES.includes(id);
export const contractOf = id => CONTRACTS.find(c => c.hero === id);
// progress on a stat, counted from the moment this hero's contract opened
export const statOf = (key, hero) => Math.max(0, (S.stats[key] || 0) - ((hero && S.base[hero]?.[key]) || 0));
export const taskFrac = t => Math.min(1, statOf(t.stat, t.hero) / t.n);
export const taskDone = t => statOf(t.stat, t.hero) >= t.n;
export const tasksDone = id => contractUnlocked(id) ? contractOf(id)?.tasks.filter(taskDone).length || 0 : 0;
export const contractDone = id => { const c = contractOf(id); return !!c && (S.got.includes(id) || (contractUnlocked(id) && c.tasks.every(taskDone))); };
export const contractUnlocked = id => { const c = contractOf(id); return !!c && (!c.waiting || !!S.base[id]); };
export const openContracts = () => CONTRACTS.filter(c => contractUnlocked(c.hero) && !contractDone(c.hero)).length;
// heroes still waiting to be recruited, sealed contracts included (the main menu badge)
export const contractsLeft = () => CONTRACTS.filter(c => !contractDone(c.hero)).length;

// Recruited heroes are remembered, so changing a contract's goals never takes a hero away.
S.got ||= CONTRACTS.filter(c => contractUnlocked(c.hero) && (c.tasks.every(taskDone)
  || !!LEGACY[c.hero]?.every(([k, n]) => statOf(k, c.hero) >= n))).map(c => c.hero);
function remember() { for (const c of CONTRACTS) if (!S.got.includes(c.hero) && contractUnlocked(c.hero) && c.tasks.every(taskDone)) S.got.push(c.hero); }

// Fill any free slot with the next sealed contract, snapshotting the stats so far.
// Returns the heroes whose contracts just arrived.
function openNew() {
  remember();
  const opened = [];
  for (const c of CONTRACTS) {
    if (openContracts() >= SLOTS) break;
    if (c.waiting && !S.base[c.hero]) { S.base[c.hero] = { ...S.stats }; opened.push(c.hero); }
  }
  persist();
  return opened;
}
openNew();                                              // fill the slots for players coming from an older version

// After a match: add its numbers, and report what moved and which heroes were just recruited.
export function recordMatch({ win, kills = 0, dmg = 0, heal = 0, arch, mode, map, cs = {} }) {
  const was = Object.fromEntries(CONTRACTS.map(c => [c.hero, tasksDone(c.hero)]));
  const had = Object.fromEntries(CONTRACTS.map(c => [c.hero, contractDone(c.hero)]));
  const add = (k, n) => { if (n > 0) S.stats[k] = (S.stats[k] || 0) + Math.round(n); };
  add('played', 1); if (win) add('wins', 1);
  add('kills', kills); add('dmg', dmg); add('heal', heal);
  if (arch) add('arch:' + arch, 1);
  if (mode) add('mode:' + mode, 1);
  if (map) add('map:' + map, 1);
  for (const [k, n] of Object.entries(cs)) add(k, n);
  persist();
  const out = {
    recruited: CONTRACTS.filter(c => !had[c.hero] && contractDone(c.hero)).map(c => c.hero),
    progressed: CONTRACTS.filter(c => tasksDone(c.hero) > was[c.hero] && !contractDone(c.hero)).map(c => c.hero),
  };
  out.opened = openNew();
  return out;
}
