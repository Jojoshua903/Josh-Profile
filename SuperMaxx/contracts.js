// Recruitment contracts: a third way to unlock heroes, next to the season pass and the slot
// machine. Each contract hero sends you three tasks; every match you finish (with any hero)
// counts towards them, and finishing all three recruits the hero for good. Saved locally.
// Second-wave contracts (`after`) stay sealed until that many first-wave contracts are done (one
// new contract per finished one, so three are on offer at a time),
// and only count matches played after they open.

const KEY = 'supermaxx-contracts';
const S = (() => { try { return { stats: {}, base: {}, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { stats: {}, base: {} }; } })();
S.base ||= {};
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };

// stat keys: played, wins, kills, dmg, heal, arch:<archetype>, mode:<mode>
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
    hero: 'chef', from: 'The Solmare Grand Hotel Kitchen', seal: '👨‍🍳', after: 1,
    pitch: 'Wanted: a brigade that can handle the heat. Our head chef is bored and the kitchen is, once again, on fire.',
    tasks: [
      { stat: 'dmg', n: 12000, label: 'Deal 12,000 damage' },
      { stat: 'arch:damage', n: 4, label: 'Play 4 matches as a damage hero' },
      { stat: 'kills', n: 30, label: 'Get 30 eliminations' },
    ],
  },
  {
    hero: 'manspider', from: 'Longlegs & Associates, Chartered Accountants', seal: '🕷️', after: 2,
    pitch: 'Wanted: a team for a mild-mannered spider with a day job. Must be comfortable with heights, ceilings and expense reports.',
    tasks: [
      { stat: 'played', n: 6, label: 'Play 6 matches' },
      { stat: 'arch:control', n: 3, label: 'Play 3 matches as a control hero' },
      { stat: 'wins', n: 4, label: 'Win 4 matches' },
    ],
  },
];
for (const c of CONTRACTS) for (const t of c.tasks) t.hero = c.hero;
export const CONTRACT_HEROES = CONTRACTS.map(c => c.hero);
export const isContractHero = id => CONTRACT_HEROES.includes(id);
export const contractOf = id => CONTRACTS.find(c => c.hero === id);
// progress on a stat, counted from the moment this hero's contract opened
export const statOf = (key, hero) => Math.max(0, (S.stats[key] || 0) - ((hero && S.base[hero]?.[key]) || 0));
export const taskFrac = t => Math.min(1, statOf(t.stat, t.hero) / t.n);
export const taskDone = t => statOf(t.stat, t.hero) >= t.n;
export const tasksDone = id => contractUnlocked(id) ? contractOf(id)?.tasks.filter(taskDone).length || 0 : 0;
export const contractDone = id => { const c = contractOf(id); return !!c && contractUnlocked(id) && c.tasks.every(taskDone); };
// how many first-wave contracts are finished, and whether a contract has been offered yet
const firstDone = () => CONTRACTS.filter(c => !c.after && c.tasks.every(taskDone)).length;
export const contractUnlocked = id => { const c = contractOf(id); return !!c && (!c.after || !!S.base[id]); };
export const openContracts = () => CONTRACTS.filter(c => contractUnlocked(c.hero) && !contractDone(c.hero)).length;
// heroes still waiting to be recruited, sealed contracts included (the main menu badge)
export const contractsLeft = () => CONTRACTS.filter(c => !contractDone(c.hero)).length;

// Open any second-wave contract whose condition is met, snapshotting the stats so far.
// Returns the heroes whose contracts just opened.
function openNew() {
  const n = firstDone(), opened = [];
  for (const c of CONTRACTS) if (c.after && !S.base[c.hero] && n >= c.after) { S.base[c.hero] = { ...S.stats }; opened.push(c.hero); }
  if (opened.length) persist();
  return opened;
}
openNew();                                              // players who already finished one before this update

// After a match: add its numbers, and report what moved and which heroes were just recruited.
export function recordMatch({ win, kills = 0, dmg = 0, heal = 0, arch, mode }) {
  const was = Object.fromEntries(CONTRACTS.map(c => [c.hero, tasksDone(c.hero)]));
  const add = (k, n) => { if (n > 0) S.stats[k] = (S.stats[k] || 0) + Math.round(n); };
  add('played', 1); if (win) add('wins', 1);
  add('kills', kills); add('dmg', dmg); add('heal', heal);
  if (arch) add('arch:' + arch, 1);
  if (mode) add('mode:' + mode, 1);
  persist();
  const out = {
    recruited: CONTRACTS.filter(c => was[c.hero] < c.tasks.length && contractDone(c.hero)).map(c => c.hero),
    progressed: CONTRACTS.filter(c => tasksDone(c.hero) > was[c.hero] && !contractDone(c.hero)).map(c => c.hero),
  };
  out.opened = openNew();
  return out;
}
