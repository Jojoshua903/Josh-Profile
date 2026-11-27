import { addTokens } from './slots.js?v=20261129f';
import { DIFFICULTY } from './data.js?v=20261129f';

// Ranked: a ladder of rank points (RP) earned in ranked matches. Each match rolls a random mode and
// stage, both teams draft with bans, and the bots get sharper the higher you climb. Ranked matches
// don't give player level or season pass XP; they climb this ladder instead, and reaching a rank
// for the first time pays its reward for good (legendary skins, tokens and the hero Bigmouth).
// Saved under a "supermaxx-" key, so it follows your account between devices.

const KEY = 'supermaxx-ranked';
export const DIV = 100;                                   // RP per division
export const RANKS = [
  { id: 'bronze', name: 'Bronze', icon: '🥉', color: 0xc9804a },
  { id: 'silver', name: 'Silver', icon: '🥈', color: 0xa8b8cc },
  { id: 'gold', name: 'Gold', icon: '🥇', color: 0xf0b428 },
  { id: 'platinum', name: 'Platinum', icon: '💠', color: 0x3fc9b8 },
  { id: 'diamond', name: 'Diamond', icon: '💎', color: 0x5a8cff },
  { id: 'master', name: 'Master', icon: '🔮', color: 0xa64fe0 },
  { id: 'legend', name: 'Maxx Legend', icon: '👑', color: 0xff3f8a },   // the top: no divisions, RP keeps counting
];
const DIVS = ['III', 'II', 'I'], LEGEND_AT = (RANKS.length - 1) * 3 * DIV;

// what each rank pays the first time you reach it
export const RANK_REWARDS = [
  { rank: 1, type: 'tokens', n: 2, label: '2 slot machine tokens' },
  { rank: 2, type: 'skin', id: 'vanguard-sovereign', label: 'Legendary skin: Bulwark · Sunken Sovereign' },
  { rank: 3, type: 'hero', id: 'hippo', label: 'New hero: Bigmouth, the river-bank brawler' },
  { rank: 4, type: 'skin', id: 'ember-supernova', label: 'Legendary skin: Cinder · Supernova' },
  { rank: 5, type: 'skin', id: 'hippo-riverking', label: 'Legendary skin: Bigmouth · River King' },
  { rank: 6, type: 'skin', id: 'striker-champion', label: 'Legendary skin: Zip · Maxx Champion', bonus: 5 },
];
export const RANKED_ITEMS = RANK_REWARDS.filter(r => r.id).map(r => r.id);

const S = (() => {
  try { const v = JSON.parse(localStorage.getItem(KEY) || '{}'); return { rp: v.rp || 0, best: v.best || 0, got: v.got || [], w: v.w || 0, l: v.l || 0, streak: v.streak || 0, hist: v.hist || [] }; }
  catch { return { rp: 0, best: 0, got: [], w: 0, l: 0, streak: 0, hist: [] }; }
})();
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };

export const rankIndex = rp => Math.min(RANKS.length - 1, Math.floor(rp / (3 * DIV)));
export function rankOf(rp = S.rp) {
  const i = rankIndex(rp), R = RANKS[i];
  if (i === RANKS.length - 1) return { ...R, i, div: '', label: R.name, into: rp - LEGEND_AT, need: 0, frac: 1, rp };
  const d = Math.floor((rp - i * 3 * DIV) / DIV), into = rp - (i * 3 + d) * DIV;
  return { ...R, i, div: DIVS[d], label: `${R.name} ${DIVS[d]}`, into, need: DIV, frac: into / DIV, rp };
}
export const ranked = () => ({ ...S, rank: rankOf(S.rp), bestRank: rankOf(S.best) });
export const rankedOwns = id => S.got.includes(id);
export const isRankedItem = id => RANKED_ITEMS.includes(id);
export const rewardFor = id => RANK_REWARDS.find(r => r.id === id);
export const rankedLock = id => { const r = rewardFor(id); return r ? `Ranked reward · reach ${RANKS[r.rank].name} in Ranked` : ''; };

// How sharp the bots are: Rookie at the bottom of Bronze, past Veteran at the top. Smoothly blended.
export function botSkill(rp = S.rp) {
  const k = Math.min(1.25, rp / LEGEND_AT), E = DIFFICULTY.easy, H = DIFFICULTY.hard;
  const mix = (a, b) => a + (b - a) * k;
  return { label: rankOf(rp).label, aimErr: Math.max(0.015, mix(E.aimErr, H.aimErr)), turn: mix(E.turn, H.turn), react: Math.max(0.14, mix(E.react, H.react)), fireCone: Math.max(0.04, mix(E.fireCone, H.fireCone)) };
}
export const botDiffKey = (rp = S.rp) => rp < 300 ? 'easy' : rp < 900 ? 'normal' : 'hard';

// Points for a result. Wins: 22 plus up to +8 for playing well and up to +9 for a win streak.
// Losses: -16, softened by up to 6 for playing well. Leaving early is always -20.
export function rpFor({ win, kills = 0, deaths = 0, assists = 0, left = false }) {
  const perf = Math.max(-3, Math.min(8, Math.round((kills + assists * 0.5 - deaths) * 1.2)));
  if (left) return -20;
  if (win) return 22 + Math.max(0, perf) + Math.min(9, Math.max(0, S.streak) * 3);
  return -Math.max(10, 16 - Math.max(0, perf));
}

// Apply a match: returns everything the results screen needs.
export function recordRanked(res) {
  const before = S.rp, b = rankOf(before), wasBest = S.best;
  let delta = rpFor(res);
  let after = Math.max(0, before + delta);
  // rank protection: a loss can take you down to the bottom of your rank, but only a loss from
  // right at the bottom drops you into the rank below
  const floor = b.i * 3 * DIV;
  let saved = false;
  if (delta < 0 && after < floor && before > floor) { after = floor; saved = true; }
  delta = after - before;
  S.rp = after; S.best = Math.max(S.best, after);
  if (res.win) { S.w++; S.streak = Math.max(0, S.streak) + 1; } else { S.l++; S.streak = Math.min(0, S.streak) - 1; }
  S.hist.unshift({ t: Date.now(), win: !!res.win, d: delta, mode: res.mode, map: res.map, hero: res.hero });
  if (S.hist.length > 20) S.hist.length = 20;
  // first time reaching a rank: pay out
  const unlocked = [];
  for (const r of RANK_REWARDS) {
    const key = r.id || 'rank' + r.rank;
    if (rankIndex(S.best) >= r.rank && !S.got.includes(key)) {
      S.got.push(key); unlocked.push(r);
      if (r.type === 'tokens') addTokens(r.n);
      if (r.bonus) addTokens(r.bonus);
    }
  }
  persist();
  const a = rankOf(after);
  return { before: b, after: a, delta, unlocked, promoted: a.i > b.i || (a.i === b.i && a.div !== b.div && delta > 0), demoted: a.i < b.i || (a.i === b.i && a.div !== b.div && delta < 0),
    saved, newBest: after > wasBest && rankOf(wasBest).label !== a.label, streak: S.streak };
}
