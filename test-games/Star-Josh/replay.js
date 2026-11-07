// Replay value: stage ranks, hidden tokens, trophies, skins, daily challenge and modifiers.
export const TOKENS_PER_STAGE = 3;

// Rank from a 0..110 point total: damage taken, kill ratio, tokens found.
export function stageRank({ dmg, kills, spawned, tokens }) {
  let pts = dmg <= 0 ? 40 : dmg < 30 ? 25 : dmg < 60 ? 12 : 0;
  pts += Math.min(1, spawned ? kills / spawned : 1) * 40;
  pts += tokens * 10;
  return pts >= 90 ? 'S' : pts >= 70 ? 'A' : pts >= 50 ? 'B' : pts >= 30 ? 'C' : 'D';
}
export const RANK_ORDER = ['D', 'C', 'B', 'A', 'S'];
export const betterRank = (a, b) => (RANK_ORDER.indexOf(a) > RANK_ORDER.indexOf(b) ? a : b);
export const RANK_COLOR = { S: '#ffd23f', A: '#ff5a1f', B: '#2f5bff', C: '#2a9d8f', D: '#8a90a3' };

export const MODIFIERS = {
  glass: { name: 'GLASS CANNON', desc: 'Deal double damage. Take double damage.', mul: 1.5 },
  turbo: { name: 'TURBO', desc: 'Everything is faster, including enemy shots.', mul: 1.4 },
  chaos: { name: 'META CHAOS', desc: 'Meta AI never shuts up. Enemies are tougher.', mul: 1.3 },
  onehit: { name: 'ONE HIT', desc: 'Your shield is 1. One hit and you are out.', mul: 3 },
};
export const modMul = mods => mods.reduce((m, k) => m * (MODIFIERS[k] ? MODIFIERS[k].mul : 1), 1);

export const SKINS = {
  classic: { name: 'CLASSIC', how: 'Default look' },
  gold: { name: 'GOLD', how: 'Beat the story with this fighter' },
  glitch: { name: 'GLITCH', how: 'Clear Boss Rush with this fighter' },
};

// Seeded RNG so everyone gets the same daily challenge.
export function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export function dailyChallenge(rosterIds) {
  const key = todayKey(), r = rng(+key.replaceAll('-', ''));
  const mode = ['endless', 'score', 'obstacle', 'endless', 'score', 'obstacle'][Math.floor(r() * 6)];
  const keys = Object.keys(MODIFIERS).filter(k => k !== 'onehit' || r() < 0.3);
  const mod = keys[Math.floor(r() * keys.length)];
  const hero = rosterIds[Math.floor(r() * rosterIds.length)];
  return { key, mode, mods: [mod], hero };
}

const st = (P, k) => (P.stats || {})[k] || 0;
const count = o => Object.values(o || {}).length;
const sRanks = P => Object.values(P.ranks || {}).filter(r => r === 'S').length;
const tokensFound = P => Object.values(P.tokens || {}).reduce((s, a) => s + a.filter(Boolean).length, 0);
const skinCount = P => Object.values(P.skins || {}).reduce((s, a) => s + a.length, 0);
const mb = (P, m) => (P.modeBest || {})[m];

// test returns [current, goal].
export const TROPHIES = [
  ['first', '🛫', 'FIRST FLIGHT', 'Clear Stage 1.', P => [st(P, 'clear1'), 1]],
  ['rescue', '🫂', 'BROUGHT HIM HOME', 'Rescue the kidnapped kid in The Feed.', P => [st(P, 'rescues'), 1]],
  ['robin', '🧸', 'NOT ON MY WATCH', 'Save Robin from the drone on his tail.', P => [st(P, 'robinSaved'), 1]],
  ['story', '🏆', 'LOGGED OFF', 'Beat Meta AI and finish the story.', P => [st(P, 'wins'), 1]],
  ['story3', '🎬', 'DIRECTOR\'S CUT', 'Finish the story with 3 different fighters.', P => [count(P.winners), 3]],
  ['hardwin', '🔥', 'HARD MODE HERO', 'Finish the story on Hard.', P => [st(P, 'hardWins'), 1]],
  ['flawless', '🛡️', 'UNTOUCHABLE', 'Clear a story stage without taking any damage.', P => [st(P, 'flawless'), 1]],
  ['srank', '⭐', 'S-TIER', 'Get an S rank on any stage.', P => [sRanks(P), 1]],
  ['allS', '🌟', 'PERFECTIONIST', 'Get an S rank on all 6 stages.', P => [sRanks(P), 6]],
  ['tok6', '🪙', 'TOKEN HUNTER', 'Find 6 hidden Meta tokens.', P => [tokensFound(P), 6]],
  ['tok18', '💰', 'FOUND THEM ALL', 'Find all 18 hidden Meta tokens.', P => [tokensFound(P), 18]],
  ['roster10', '👥', 'SQUAD GOALS', 'Unlock 10 fighters.', P => [4 + (P.chars || []).length, 10]],
  ['roster18', '🎉', 'FULL GROUP CHAT', 'Unlock all 23 fighters.', P => [4 + (P.chars || []).length, 23]],
  ['evilAdam', '😈', 'EVIL TWIN', 'Defeat Evil Adam.', P => [st(P, 'evilAdam'), 1]],
  ['drones', '💥', 'DRONE DEMOLISHER', 'Destroy 500 drones.', P => [st(P, 'drones'), 500]],
  ['deflect', '🎾', 'RETURN TO SENDER', 'Return 100 shots with barrel rolls.', P => [st(P, 'deflects'), 100]],
  ['specials', '⚡', 'SPECIAL DELIVERY', 'Use 50 specials.', P => [st(P, 'specials'), 50]],
  ['wave12', '🌊', 'STILL STANDING', 'Reach wave 12 in Endless.', P => [(mb(P, 'endless') || {}).wave || 0, 12]],
  ['wave24', '🌀', 'NEVER ENDING', 'Reach wave 24 in Endless.', P => [(mb(P, 'endless') || {}).wave || 0, 24]],
  ['rush', '👑', 'BOSS OF BOSSES', 'Clear Boss Rush.', P => [(mb(P, 'bossrush') || {}).cleared ? 1 : 0, 1]],
  ['rushfast', '⏱️', 'SPEEDRUNNER', 'Clear Boss Rush in under 6:00.', P => [(mb(P, 'bossrush') || {}).cleared && mb(P, 'bossrush').time < 360 ? 1 : 0, 1]],
  ['run1k', '🧱', 'DODGE MASTER', 'Fly 1,000 m in Obstacle Run.', P => [Math.floor((mb(P, 'obstacle') || {}).dist || 0), 1000]],
  ['run3k', '🚀', 'NO BRAKES', 'Fly 3,000 m in Obstacle Run.', P => [Math.floor((mb(P, 'obstacle') || {}).dist || 0), 3000]],
  ['score100', '📈', 'SIX FIGURES', 'Score 100,000 in Score Attack.', P => [(mb(P, 'score') || {}).score || 0, 100000]],
  ['combo8', '🔗', 'MAX COMBO', 'Reach a ×8 combo in Score Attack.', P => [(mb(P, 'score') || {}).combo || 0, 8]],
  ['daily1', '📅', 'DAILY DOSE', 'Play a daily challenge.', P => [(P.daily || {}).played || 0, 1]],
  ['streak5', '🗓️', 'ON A ROLL', 'Play the daily challenge 5 days in a row.', P => [(P.daily || {}).streak || 0, 5]],
  ['skin', '✨', 'DRESSED TO KILL', 'Earn any gold or glitch skin.', P => [skinCount(P), 1]],
  ['onehit', '💀', 'ONE AND DONE', 'Score 20,000 with the One Hit modifier.', P => [st(P, 'onehitBest'), 20000]],
  ['secret1', '🌀', 'OFF THE MAP', 'Fly through a secret gate and take a hidden route.', P => [count(P.secrets), 1]],
  ['secret3', '🗺️', 'CARTOGRAPHER', 'Discover all 3 secret routes.', P => [count(P.secrets), 3]],
  ['trueEnd', '👁️', 'ROOT ACCESS', 'Take all 3 secret routes in one run and see the true ending.', P => [st(P, 'trueEnd'), 1]],
  ['arena6', '🛩️', 'ALL-RANGE MODE', 'Reach wave 6 in Arena.', P => [(mb(P, 'arena') || {}).wave || 0, 6]],
  ['side1', '📖', 'SIDE QUEST', 'Finish a side story.', P => [count(P.sides), 1]],
  ['side10', '📚', 'BOOKWORM', 'Finish 10 side stories.', P => [count(P.sides), 10]],
  ['sideAll', '🏛️', 'THE WHOLE SAGA', 'Finish every side story.', P => [count(P.sides), 23]],
  ['shop1', '🦦', 'VALUED CUSTOMER', 'Buy something from Niffo.', P => [st(P, 'purchases'), 1]],
  ['shop10', '💸', 'NIFFO\'S FAVOURITE', 'Buy 10 things from Niffo.', P => [st(P, 'purchases'), 10]],
  ['coop', '👥', 'SQUAD UP', 'Clear a story stage or side story with 2 players.', P => [st(P, 'coopClears'), 1]],
  ['trio5', '🔺', 'TRIPLE THREAT', 'Beat the first boss in Triple Threat (wave 5).', P => [(mb(P, 'trio') || {}).wave || 0, 5]],
  ['trio15', '☠️', 'THREE\'S A CROWD', 'Reach wave 15 in Triple Threat.', P => [(mb(P, 'trio') || {}).wave || 0, 15]],
];
export const trophyProgress = (P, t) => { const [v, g] = t[4](P); return { v: Math.min(v, g), g, done: v >= g }; };
export function checkTrophies(P) {
  P.trophies = P.trophies || []; const fresh = [];
  for (const t of TROPHIES) if (!P.trophies.includes(t[0]) && trophyProgress(P, t).done) { P.trophies.push(t[0]); fresh.push(t); }
  return fresh;
}
export const summary = P => ({ sRanks: sRanks(P), tokens: tokensFound(P), skins: skinCount(P), trophies: (P.trophies || []).length });
