// Match history: your last 30 matches, newest first. Saved with the rest of your progress, so it
// follows your account between devices.

const KEY = 'supermaxx-history', MAX = 30;
let list = (() => { try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } })();
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {} };

// e: { mode, map, hero, win, place, players, kills, deaths, dmg, heal, online, score: [ours, theirs] }
export function recordHistory(e) {
  list.unshift({ t: Date.now(), ...e, dmg: Math.round(e.dmg || 0), heal: Math.round(e.heal || 0) });
  if (list.length > MAX) list.length = MAX;
  persist();
}
export const history = () => list;
