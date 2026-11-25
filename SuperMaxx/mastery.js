// Hero mastery: every hero earns its own XP from the matches you play with it.
// Ten levels, four ranks. Rank shows as a badge on the hero tile and in the hero panel;
// gold heroes get a gold tile frame, diamond (level 10) an animated one. Saved locally.

const KEY = 'supermaxx-mastery';
const state = (() => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } })();
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} };

// XP needed to reach each level (index = level - 1); level 1 is free
export const LEVELS = [0, 250, 600, 1050, 1600, 2250, 3000, 3850, 4800, 5850];
export const MAX_LEVEL = LEVELS.length;
export const RANKS = [
  { from: 1, name: 'Bronze', color: '#c98a55' }, { from: 4, name: 'Silver', color: '#b8c4d0' },
  { from: 7, name: 'Gold', color: '#ffc93c' }, { from: 10, name: 'Diamond', color: '#7af0ff' },
];
export const rankOf = level => [...RANKS].reverse().find(r => level >= r.from);

export function masteryOf(id, xp = state[id] || 0) {
  let level = 1; while (level < MAX_LEVEL && xp >= LEVELS[level]) level++;
  const max = level >= MAX_LEVEL, into = xp - LEVELS[level - 1], need = max ? 1 : LEVELS[level] - LEVELS[level - 1];
  return { xp, level, max, into, need, frac: max ? 1 : into / need, rank: rankOf(level) };
}

// Match payout: playing, winning, eliminations and damage all count.
export function gainMastery(id, { win, kills = 0, dmg = 0, tutorial }) {
  if (tutorial) return null;
  const parts = [['Played', 80]];
  if (win) parts.push(['Win', 100]);
  if (kills) parts.push(['Eliminations', kills * 20]);
  const d = Math.min(240, Math.round(dmg / 40)); if (d) parts.push(['Damage', d]);
  const gained = parts.reduce((a, [, v]) => a + v, 0);
  const before = masteryOf(id);
  state[id] = (state[id] || 0) + gained; persist();
  const after = masteryOf(id);
  return { gained, parts, before, after, levelUp: after.level > before.level, rankUp: after.rank.name !== before.rank.name };
}
