import { addTokens } from './slots.js?v=20261128w';

// Player level: every match (and every story mission) earns player XP, whatever the season pass
// is doing. Each level takes more XP than the one before, and every level-up pays one token for
// the slot machine. Saved locally.
//   XP for level L → L+1:  200 + 100·L + 10·L²   (310 for the first, ~2,200 at level 10, ~6,200 at 20)

const KEY = 'supermaxx-level';
const S = (() => { try { return { xp: 0, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { xp: 0 }; } })();
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };

export const needFor = L => 200 + 100 * L + 10 * L * L;
// level, XP into it and XP needed for the next one, from total XP
export function levelOf(xp = S.xp) {
  let L = 1, left = xp;
  while (left >= needFor(L)) { left -= needFor(L); L++; }
  return { level: L, into: left, need: needFor(L), frac: left / needFor(L), xp };
}
export const playerLevel = () => levelOf();

// Add XP. Returns what changed, for the results screen; level-ups pay their tokens here.
export function addPlayerXp(n) {
  const before = levelOf();
  S.xp += Math.max(0, Math.round(n)); persist();
  const after = levelOf(), ups = after.level - before.level;
  if (ups > 0) addTokens(ups);
  return { gained: Math.round(n), before, after, ups };
}
// Story missions: a clear pays more, and a better medal more again
export const storyXp = (win, medal = 0) => win ? 150 + medal * 50 : 40;
