import { addTokens } from './slots.js?v=20261127j';
import { ARCHETYPES } from './heroes.js?v=20261127j';

// Daily challenges: three small goals a day, the same for everyone on a given date. Finish all
// three and you get a mastery token for the slot machine. Progress counts across every match
// that day (practice and training don't count). A new set arrives at local midnight.

const KEY = 'supermaxx-daily';
const MODE_NAME = { lane: 'Lane Breaker', survivor: 'Survivor', hill: 'Hill Rush', cart: 'Payload', potato: 'Hot Potato', duel: 'Duel' };
// each kind: how to describe it, the goal, and what a match adds toward it
const KINDS = [
  { id: 'play', text: n => `Play ${n} matches`, goals: [2, 3], add: m => 1 },
  { id: 'win', text: n => n > 1 ? `Win ${n} matches` : 'Win a match', goals: [1, 2], add: m => (m.win ? 1 : 0) },
  { id: 'kills', text: n => `Get ${n} eliminations`, goals: [6, 10, 15], add: m => m.kills },
  { id: 'dmg', text: n => `Deal ${n.toLocaleString()} damage`, goals: [2500, 4000, 6000], add: m => m.dmg },
  { id: 'mode', text: (n, v) => `Play a match of ${MODE_NAME[v]}`, goals: [1], vary: ['lane', 'survivor', 'hill', 'cart', 'potato'], add: (m, v) => (m.mode === v ? 1 : 0) },
  { id: 'arch', text: (n, v) => `Play ${n} matches as a ${ARCHETYPES.find(a => a.id === v).name}`, goals: [2], vary: ARCHETYPES.map(a => a.id), add: (m, v) => (m.arch === v ? 1 : 0) },
];

const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
// a small seeded random so everyone gets the same three on the same day
function rng(seed) { let h = 2166136261; for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296; }
function roll(day) {
  const r = rng(day), pool = [...KINDS], out = [];
  while (out.length < 3) {
    const k = pool.splice(Math.floor(r() * pool.length), 1)[0];
    out.push({ id: k.id, goal: k.goals[Math.floor(r() * k.goals.length)], v: k.vary ? k.vary[Math.floor(r() * k.vary.length)] : null, n: 0 });
  }
  return out;
}

let S = (() => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } })();
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };
function fresh() { if (!S || S.day !== today()) { S = { day: today(), list: roll(today()), paid: false }; persist(); } return S; }

const kindOf = c => KINDS.find(k => k.id === c.id);
const describe = c => ({ ...c, text: kindOf(c).text(c.goal, c.v), done: c.n >= c.goal });
export function dailies() { const D = fresh(); return { list: D.list.map(describe), paid: D.paid }; }
export function resetsIn() { const d = new Date(), m = new Date(d); m.setHours(24, 0, 0, 0); const s = (m - d) / 1000; return s > 3600 ? `${Math.floor(s / 3600)}h ${Math.floor(s % 3600 / 60)}m` : `${Math.ceil(s / 60)}m`; }

// After a match: count it toward today's three. Returns what just finished and whether the token paid out.
export function recordDaily(m) {
  const D = fresh(), done = [];
  for (const c of D.list) {
    if (c.n >= c.goal) continue;
    c.n = Math.min(c.goal, c.n + Math.round(kindOf(c).add(m, c.v) || 0));
    if (c.n >= c.goal) done.push(describe(c));
  }
  let token = false;
  if (!D.paid && D.list.every(c => c.n >= c.goal)) { D.paid = true; token = true; addTokens(1); }
  persist();
  return { done, token };
}
