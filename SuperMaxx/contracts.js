// Recruitment contracts: a third way to unlock heroes, next to the season pass and the slot
// machine. Each contract hero sends you three tasks; every match you finish (with any hero)
// counts towards them, and finishing all three recruits the hero for good. Saved locally.

const KEY = 'supermaxx-contracts';
const S = (() => { try { return { stats: {}, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { stats: {} }; } })();
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
];
export const CONTRACT_HEROES = CONTRACTS.map(c => c.hero);
export const isContractHero = id => CONTRACT_HEROES.includes(id);
export const contractOf = id => CONTRACTS.find(c => c.hero === id);
export const statOf = key => S.stats[key] || 0;
export const taskFrac = t => Math.min(1, statOf(t.stat) / t.n);
export const taskDone = t => statOf(t.stat) >= t.n;
export const tasksDone = id => contractOf(id)?.tasks.filter(taskDone).length || 0;
export const contractDone = id => { const c = contractOf(id); return !!c && c.tasks.every(taskDone); };
export const openContracts = () => CONTRACTS.filter(c => !contractDone(c.hero)).length;

// After a match: add its numbers, and report what moved and which heroes were just recruited.
export function recordMatch({ win, kills = 0, dmg = 0, heal = 0, arch, mode }) {
  const was = Object.fromEntries(CONTRACTS.map(c => [c.hero, tasksDone(c.hero)]));
  const add = (k, n) => { if (n > 0) S.stats[k] = (S.stats[k] || 0) + Math.round(n); };
  add('played', 1); if (win) add('wins', 1);
  add('kills', kills); add('dmg', dmg); add('heal', heal);
  if (arch) add('arch:' + arch, 1);
  if (mode) add('mode:' + mode, 1);
  persist();
  return {
    recruited: CONTRACTS.filter(c => was[c.hero] < c.tasks.length && contractDone(c.hero)).map(c => c.hero),
    progressed: CONTRACTS.filter(c => tasksDone(c.hero) > was[c.hero] && !contractDone(c.hero)).map(c => c.hero),
  };
}
