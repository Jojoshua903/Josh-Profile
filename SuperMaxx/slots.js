// Mastery tokens and the slot machine. A token drops every time one of your heroes ranks up
// in mastery (Bronze → Silver → Gold → Diamond). One token buys one spin, and every spin wins
// something you don't own yet: a slot-exclusive hero, skin, spray or emote. Daily challenges
// (daily.js) pay a token too. Saved locally.

const KEY = 'supermaxx-slots';
const S = (() => { try { return { tokens: 0, owned: [], spins: 0, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { tokens: 0, owned: [], spins: 0 }; } })();
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };

export const SLOT_HEROES = ['slime', 'brawler', 'chipmunk', 'elf', 'dancer', 'mole', 'medic', 'spark', 'builder'];
export const SLOT_SKINS = ['slime-magma', 'brawler-chrome', 'chipmunk-gold', 'vanguard-cosmos', 'striker-glitch', 'croc-gummy', 'cavalier-phantom', 'mirage-hologram',
  'ember-supernova', 'warden-stained', 'thicket-sakura', 'ratchet-overclock', 'avalanche-volcanic', 'tempo-clockwork', 'kestrel-phoenix', 'elf-winter', 'dancer-blackswan', 'mole-diamond',
  'medic-plague', 'spark-thunder', 'builder-marble', 'wellington-truffle', 'shepherd-tartan', 'microwave-retro', 'chef-noir', 'manspider-tarantula'];
export const SLOT_SPRAYS = ['sp-gg', 'sp-splat', 'sp-nuts', 'sp-maxx', 'sp-chomp', 'sp-love', 'sp-bye', 'sp-crown'];
// emotes you don't start with (see emotes.js); the free four are always yours
export const SLOT_EMOTES = ['cheer', 'dance', 'taunt', 'bow', 'clap', 'flex', 'facepalm', 'nap', 'kiss', 'drums'];
// heroes are the jackpot: rarer than skins, which are rarer than sprays and emotes
const WEIGHT = { hero: 1, skin: 2, spray: 3, emote: 3 };

export const tokens = () => S.tokens;
export const spins = () => S.spins;
export function addTokens(n) { if (n > 0) { S.tokens += n; persist(); } }
export const slotOwned = id => S.owned.includes(id);
export const isSlotItem = id => SLOT_HEROES.includes(id) || SLOT_SKINS.includes(id) || SLOT_SPRAYS.includes(id) || SLOT_EMOTES.includes(id);
export const emoteOwned = id => !SLOT_EMOTES.includes(id) || slotOwned(id);
// Skins only join the pool once you have their hero. pass.js knows who you own, so it plugs that check in here.
let skinReady = () => true;
export const setSkinGate = f => { skinReady = f; };

export function prizes() {
  const all = [...SLOT_HEROES.map(id => ({ id, kind: 'hero' })), ...SLOT_SKINS.map(id => ({ id, kind: 'skin' })), ...SLOT_SPRAYS.map(id => ({ id, kind: 'spray' })), ...SLOT_EMOTES.map(id => ({ id, kind: 'emote' }))]
    .map(p => ({ ...p, owned: slotOwned(p.id), locked: p.kind === 'skin' && !slotOwned(p.id) && !skinReady(p.id) }));
  const left = all.filter(p => !p.owned && !p.locked), total = left.reduce((a, p) => a + WEIGHT[p.kind], 0);
  return all.map(p => ({ ...p, odds: p.owned || p.locked || !total ? 0 : WEIGHT[p.kind] / total }));
}

// Spend a token and win something new. Returns the prize, or null with no tokens / nothing left.
export function spin() {
  const left = prizes().filter(p => !p.owned && !p.locked);
  if (S.tokens < 1 || !left.length) return null;
  let r = Math.random() * left.reduce((a, p) => a + p.odds, 0), pick = left[left.length - 1];
  for (const p of left) { if ((r -= p.odds) <= 0) { pick = p; break; } }
  S.tokens--; S.spins++; S.owned.push(pick.id); persist();
  return pick;
}
