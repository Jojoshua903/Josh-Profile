import { HEROES } from './heroes.js?v=20261126j';
import { cfg, save } from './settings.js?v=20261126j';
import { SLOT_HEROES, slotOwned, isSlotItem, setSkinGate } from './slots.js?v=20261126j';
import { sprayUrl } from './sprays.js?v=20261126j';
import { isContractHero, contractDone, tasksDone } from './contracts.js?v=20261126j';
export { isContractHero } from './contracts.js?v=20261126j';

// Season pass: XP from matches (mostly from winning) climbs a 30-tier track of hero skins,
// cosmetics and three season heroes. Progress is saved locally.

export const SEASON = { n: 1, name: 'Golden Hour', tierXp: 150 };

// Skins override the hero palette (and the accent colour used for art and the view model).
export const SKINS = [
  { id: 'vanguard-deep', hero: 'vanguard', name: 'Deep Sea', color: 0x2a5bd7, palette: { main: 0x2a5bd7, trim: 0xbfe6ff, dark: 0x14254a, finish: { metal: 0.15, rough: 0.4 } } },
  { id: 'striker-night', hero: 'striker', name: 'Night Shift', color: 0x6fe8ff, palette: { main: 0x2b2d4f, trim: 0x6fe8ff, dark: 0x111226, finish: { glow: 0.9 } } },
  { id: 'ember-sapphire', hero: 'ember', name: 'Sapphire Show', color: 0x3a66c8, palette: { main: 0x3a66c8, trim: 0xffd23c, dark: 0x1d2340, finish: { trimMetal: 0.35, trimRough: 0.25 } } },
  { id: 'warden-dawn', hero: 'warden', name: 'Dawn Vigil', color: 0xffa27a, palette: { main: 0xffa27a, trim: 0xffffff, dark: 0x8a4a6a, skin: 0x3a2a40, finish: { rough: 0.5, glow: 0.3 } } },
  { id: 'thicket-autumn', hero: 'thicket', name: 'Autumn Harvest', color: 0xd9733a, palette: { main: 0xc8642e, trim: 0xffd23c, dark: 0x5a3020, finish: { rough: 0.75 } } },
  { id: 'ratchet-brass', hero: 'ratchet', name: 'Brass Works', color: 0xd9a441, palette: { main: 0xd9a441, trim: 0x2fb39a, dark: 0x4a3520, finish: { metal: 0.35, rough: 0.3, trimMetal: 0.3 } } },
  { id: 'mirage-emerald', hero: 'mirage', name: 'Emerald Act', color: 0x2fbf7a, palette: { main: 0x1f6b4e, trim: 0xffffff, dark: 0x0f2a22, finish: { rough: 0.3, glow: 0.25 } } },
  { id: 'avalanche-aurora', hero: 'avalanche', name: 'Aurora', color: 0x5be0b0, palette: { main: 0x3fc99a, trim: 0xb98cff, dark: 0x24304f, finish: { glow: 0.7 } } },
  { id: 'tempo-vapor', hero: 'tempo', name: 'Vaporwave', color: 0xff8fd0, palette: { main: 0xff8fd0, trim: 0x6fe8ff, dark: 0x3d2a6b, finish: { glow: 0.85, rough: 0.35 } } },
  { id: 'vanguard-coral', hero: 'vanguard', name: 'Coral Reef', color: 0xff7a6b, palette: { main: 0xff7a6b, trim: 0xfff0d6, dark: 0x3a2a4a, finish: { rough: 0.35 } } },
  { id: 'kestrel-storm', hero: 'kestrel', name: 'Stormchaser', color: 0x7a8cff, palette: { main: 0x3d4a6b, trim: 0x7af0ff, dark: 0x1d2340, finish: { glow: 0.8 } } },
  { id: 'striker-bubble', hero: 'striker', name: 'Bubblegum', color: 0xff8fd0, palette: { main: 0xff8fd0, trim: 0x7af0ff, dark: 0x4a2a5c, finish: { rough: 0.2 } } },
  { id: 'ember-ash', hero: 'ember', name: 'Ash & Ember', color: 0xff5a36, palette: { main: 0x3a3a40, trim: 0xff5a36, dark: 0x1a1a1f, finish: { glow: 1.1, rough: 0.8 } } },
  { id: 'warden-eclipse', hero: 'warden', name: 'Eclipse', color: 0xff5a36, palette: { main: 0x1d2340, trim: 0xff5a36, dark: 0x0d1020, finish: { glow: 1.2, rough: 0.3 } } },
  { id: 'thicket-frost', hero: 'thicket', name: 'Frostbloom', color: 0x9fd8e8, palette: { main: 0x9fd8e8, trim: 0xffffff, dark: 0x3d5a6a, finish: { rough: 0.18, glow: 0.35 } } },
  { id: 'ratchet-cobalt', hero: 'ratchet', name: 'Cobalt', color: 0x2f5bff, palette: { main: 0x2f5bff, trim: 0xffc93c, dark: 0x1d2340, finish: { metal: 0.3, rough: 0.28, glow: 0.4 } } },
  { id: 'mirage-noir', hero: 'mirage', name: 'Velvet Noir', color: 0xff4f6b, palette: { main: 0x1d1d24, trim: 0xff4f6b, dark: 0x0a0a10, finish: { rough: 0.18, glow: 0.7 } } },
  { id: 'avalanche-gold', hero: 'avalanche', name: 'Golden Hour', color: 0xffc93c, palette: { main: 0xffc93c, trim: 0xffffff, dark: 0x8a5a20, finish: { metal: 0.38, rough: 0.22, trimMetal: 0.35, glow: 0.3 } } },
  { id: 'croc-mardi', hero: 'croc', name: 'Mardi Gras', color: 0xa64fd9, palette: { main: 0x7a3fb0, trim: 0xffd23c, dark: 0x2f8a4a, skin: 0xc9a6ff, finish: { glow: 0.55, rough: 0.4 } } },
  { id: 'croc-albino', hero: 'croc', name: 'Albino Ghost', color: 0xf4efe6, palette: { main: 0xf0e8dc, trim: 0xff7a8a, dark: 0x8a7a6a, skin: 0xfff8ee, finish: { rough: 0.3, glow: 0.2 } } },
  // ---- slot machine exclusives: louder finishes you can only win with mastery tokens ----
  { id: 'slime-magma', hero: 'slime', slot: true, name: 'Magma Gloop', color: 0xff6a2a, palette: { main: 0xff6a2a, trim: 0xffe14a, dark: 0x6a1a10, skin: 0xff7a3a, finish: { glow: 0.35 } } },
  { id: 'brawler-chrome', hero: 'brawler', slot: true, name: 'Chrome Champ', color: 0xd8dee8, palette: { main: 0xd8dee8, trim: 0xff4fa3, dark: 0x2a2f3c, finish: { metal: 0.75, rough: 0.18, trimMetal: 0.2 } } },
  { id: 'chipmunk-gold', hero: 'chipmunk', slot: true, name: 'Golden Acorn', color: 0xffc93c, palette: { main: 0xffc93c, trim: 0x8a4a1a, dark: 0x4a3010, finish: { metal: 0.7, rough: 0.22 } } },
  { id: 'vanguard-cosmos', hero: 'vanguard', slot: true, name: 'Cosmic Warden', color: 0x5a3ad8, palette: { main: 0x3a2a8a, trim: 0x7af0ff, dark: 0x120a3a, finish: { glow: 0.35 } } },
  { id: 'striker-glitch', hero: 'striker', slot: true, name: 'Glitch', color: 0x18e0f0, palette: { main: 0x18e0f0, trim: 0xff2a8a, dark: 0x111122, finish: { glow: 0.45, rough: 0.2 } } },
  { id: 'croc-gummy', hero: 'croc', slot: true, name: 'Gummy Gator', color: 0xff5fa0, palette: { main: 0xff5fa0, trim: 0xfff07a, dark: 0xc23b7a, skin: 0xffa0c8, finish: { rough: 0.08, glow: 0.18 } } },
  { id: 'cavalier-phantom', hero: 'cavalier', slot: true, name: 'Phantom Knight', color: 0x9fe8ff, palette: { main: 0x9fe8ff, trim: 0x5a3aff, dark: 0x1a2240, finish: { glow: 0.5, rough: 0.2 } } },
  { id: 'mirage-hologram', hero: 'mirage', slot: true, name: 'Hologram', color: 0x7af0ff, palette: { main: 0x7af0ff, trim: 0xff8fd0, dark: 0x2a2f5a, finish: { glow: 0.55, rough: 0.1 } } },
  { id: 'ember-supernova', hero: 'ember', slot: true, name: 'Supernova', color: 0xff7af0, palette: { main: 0x2a1a5a, trim: 0xff7af0, dark: 0x0d0820, finish: { glow: 0.8, rough: 0.25 } } },
  { id: 'warden-stained', hero: 'warden', slot: true, name: 'Stained Glass', color: 0x3a8ac8, palette: { main: 0x3a8ac8, trim: 0xffd23c, dark: 0x5a1a4a, finish: { glow: 0.5, rough: 0.12 } } },
  { id: 'thicket-sakura', hero: 'thicket', slot: true, name: 'Cherry Blossom', color: 0xffb3cf, palette: { main: 0xffb3cf, trim: 0x6a3a2a, dark: 0x3a2a30, finish: { rough: 0.45, glow: 0.2 } } },
  { id: 'ratchet-overclock', hero: 'ratchet', slot: true, name: 'Overclocked', color: 0x39ff9a, palette: { main: 0x1d1f2a, trim: 0x39ff9a, dark: 0x0a0c12, finish: { metal: 0.5, rough: 0.25, glow: 0.9 } } },
  { id: 'avalanche-volcanic', hero: 'avalanche', slot: true, name: 'Volcanic', color: 0xff6a2a, palette: { main: 0x3a2a2a, trim: 0xff6a2a, dark: 0x160c0c, finish: { glow: 1.0, rough: 0.85 } } },
  { id: 'tempo-clockwork', hero: 'tempo', slot: true, name: 'Clockwork', color: 0xc9a14a, palette: { main: 0xc9a14a, trim: 0x2a2f3c, dark: 0x4a3010, finish: { metal: 0.65, rough: 0.25, trimMetal: 0.4 } } },
  { id: 'kestrel-phoenix', hero: 'kestrel', slot: true, name: 'Phoenix', color: 0xff5a2a, palette: { main: 0xff5a2a, trim: 0xffe14a, dark: 0x6a1a10, finish: { glow: 0.6, rough: 0.3 } } },
  { id: 'elf-winter', hero: 'elf', slot: true, name: 'Winter Court', color: 0xbfe6ff, palette: { main: 0xdff4ff, trim: 0x7ab8ff, dark: 0x3a4a6a, skin: 0xeaf2ff, finish: { glow: 0.35, rough: 0.2 } } },
  { id: 'dancer-blackswan', hero: 'dancer', slot: true, name: 'Black Swan', color: 0xff2a5a, palette: { main: 0x1a1a24, trim: 0xff2a5a, dark: 0x0a0a10, finish: { rough: 0.15, glow: 0.4 } } },
  { id: 'mole-diamond', hero: 'mole', slot: true, name: 'Diamond Digger', color: 0x9fe8ff, palette: { main: 0x9fe8ff, trim: 0xffffff, dark: 0x2a3a5a, skin: 0x8a7a9a, finish: { metal: 0.4, rough: 0.12, glow: 0.3 } } },
  { id: 'medic-plague', hero: 'medic', slot: true, name: 'Plague Doctor', color: 0x6a4a8a, palette: { main: 0x2a2234, trim: 0xb98cff, dark: 0x120e18, finish: { rough: 0.7, glow: 0.4 } } },
  { id: 'spark-thunder', hero: 'spark', slot: true, name: 'Thunderhead', color: 0x7af0ff, palette: { main: 0x3a4a8a, trim: 0x7af0ff, dark: 0x101a3a, finish: { glow: 0.9, rough: 0.25 } } },
  { id: 'builder-marble', hero: 'builder', slot: true, name: 'Marble Mason', color: 0xf0ece4, palette: { main: 0xf0ece4, trim: 0xffc93c, dark: 0x6a6a72, finish: { rough: 0.15, trimMetal: 0.5, glow: 0.15 } } },
  // contract heroes: only in the machine once you've recruited them
  { id: 'wellington-truffle', hero: 'wellington', slot: true, name: 'Black Truffle', color: 0x2a1f1a, palette: { main: 0x2a1f1a, trim: 0xffd23c, dark: 0x120c08, skin: 0x3a2a20, finish: { rough: 0.25, trimMetal: 0.6, glow: 0.2 } } },
  { id: 'shepherd-tartan', hero: 'shepherd', slot: true, name: 'Royal Tartan', color: 0x2a4fb0, palette: { main: 0x2a4fb0, trim: 0xffd23c, dark: 0x6a1a2a, skin: 0xe8b996, finish: { rough: 0.6, trimMetal: 0.3 } } },
  { id: 'microwave-retro', hero: 'microwave', slot: true, name: 'Atomic Diner', color: 0x5ad8c8, palette: { main: 0x5ad8c8, trim: 0xff5a5a, dark: 0xf0ece4, skin: 0x5ad8c8, finish: { metal: 0.45, rough: 0.15, glow: 0.35 } } },
];

// Cosmetics: slot machine sprays.
export const COS_TYPES = {
  spray: { label: 'Spray', icon: '🎨' },
};
export const COSMETICS = [
  // ---- sprays: slot machine only. Tag a wall or the floor with T during a match ----
  { id: 'sp-gg', type: 'spray', slot: true, name: 'Good Game', glyph: '🎮', text: 'GG!', a: 0xff8fd0, b: 0x9b5cff, shape: 'star' },
  { id: 'sp-splat', type: 'spray', slot: true, name: 'Splat', glyph: '🟢', text: 'SPLAT', a: 0x9dff6a, b: 0x3fa82e, shape: 'splat', ribbon: 0xff8fd0 },
  { id: 'sp-nuts', type: 'spray', slot: true, name: 'Nuts to You', glyph: '🐿️', text: 'NUTS!', a: 0xffd08a, b: 0xd9822b },
  { id: 'sp-maxx', type: 'spray', slot: true, name: 'Maxx Out', glyph: '⚡', text: 'MAXX', a: 0x6fe8ff, b: 0x2f5bff, shape: 'star', ribbon: 0xff5a36 },
  { id: 'sp-chomp', type: 'spray', slot: true, name: 'Chomp', glyph: '🐊', text: 'CHOMP', a: 0xb6e86a, b: 0x4f8a2a, ribbon: 0xff5fa0 },
  { id: 'sp-love', type: 'spray', slot: true, name: 'Love Letter', glyph: '💖', text: 'LOVE', a: 0xffd6e8, b: 0xff5fa0, ribbon: 0x6fe8ff },
  { id: 'sp-bye', type: 'spray', slot: true, name: 'Bye Bye', glyph: '👋', text: 'BYE!', a: 0xfff0b8, b: 0xffa23c, shape: 'splat', ribbon: 0x6fe8ff },
  { id: 'sp-crown', type: 'spray', slot: true, name: 'Number One', glyph: '👑', text: '#1', a: 0xfff3a0, b: 0xe0a100, shape: 'star', ribbon: 0xff5a36 },
];
export const cosById = id => COSMETICS.find(c => c.id === id);

// The track: tier -> rewards. Skins and heroes are spread over all 30 tiers (every tier also has
// a cosmetic); Tempo comes early, Kestrel mid-season and Cavalier is the tier 30 finale.
const MAIN = {
  1: ['skin', 'vanguard-deep'], 2: ['skin', 'striker-night'], 3: ['skin', 'croc-mardi'], 4: ['skin', 'ember-sapphire'],
  5: ['hero', 'tempo'], 6: ['skin', 'warden-dawn'], 7: ['skin', 'thicket-autumn'], 9: ['skin', 'ratchet-brass'],
  10: ['skin', 'mirage-emerald'], 11: ['skin', 'tempo-vapor'], 12: ['skin', 'avalanche-aurora'], 14: ['skin', 'vanguard-coral'],
  15: ['hero', 'kestrel'], 16: ['skin', 'kestrel-storm'], 17: ['skin', 'striker-bubble'], 19: ['skin', 'ember-ash'],
  20: ['skin', 'croc-albino'], 21: ['skin', 'warden-eclipse'], 22: ['skin', 'thicket-frost'], 24: ['skin', 'ratchet-cobalt'],
  26: ['skin', 'mirage-noir'], 28: ['skin', 'avalanche-gold'], 30: ['hero', 'cavalier'],
};
const COS_TIER = {};                                 // no pass cosmetics this season
export const TRACK = [
  ...Object.entries(MAIN).map(([tier, [type, id]]) => ({ tier: +tier, type, id })),
  ...Object.entries(COS_TIER).map(([id, tier]) => ({ tier, type: cosById(id).type, id, cos: true })),
].sort((a, b) => a.tier - b.tier || (a.cos ? 1 : 0) - (b.cos ? 1 : 0));
// The pass stays 30 tiers long; tiers with nothing on them yet show as open slots.
export const MAX_TIER = 30;

// ---------- saved progress ----------
const KEY = 'supermaxx-pass';
const state = (() => { try { return { xp: 0, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { xp: 0 }; } })();
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} };

export const passXp = () => state.xp;
export const tierOf = xp => Math.min(MAX_TIER, Math.floor(xp / SEASON.tierXp));
export const tier = () => tierOf(state.xp);
export function tierProgress(xp = state.xp) {
  const t = tierOf(xp);
  if (t >= MAX_TIER) return { tier: t, into: SEASON.tierXp, need: SEASON.tierXp, frac: 1 };
  const into = xp - t * SEASON.tierXp;
  return { tier: t, into, need: SEASON.tierXp, frac: into / SEASON.tierXp };
}

const heroReward = id => TRACK.find(r => r.type === 'hero' && r.id === id);
const skinReward = id => TRACK.find(r => r.type === 'skin' && r.id === id);
export const heroTier = id => heroReward(id)?.tier || 0;           // 0 = in the base roster
export const skinTier = id => skinReward(id)?.tier || 0;
export const heroOwned = id => isContractHero(id) ? contractDone(id) : SLOT_HEROES.includes(id) ? slotOwned(id) : tier() >= heroTier(id);
// A skin only counts once you have its hero; until then pass skins wait for you and slot skins stay out of the machine.
export const skinOwned = id => heroOwned(skinById(id)?.hero) && (isSlotItem(id) ? slotOwned(id) : tier() >= skinTier(id));
const skinHeroName = id => HEROES.find(h => h.id === skinById(id)?.hero)?.callsign || 'its hero';
const needsHero = id => !heroOwned(skinById(id)?.hero);
// What a locked hero or skin is waiting on, for tiles and chips: the slot machine or a pass tier.
export const lockShort = (id, skin) => skin && needsHero(id) ? 'Hero' : !skin && isContractHero(id) ? `📜 ${tasksDone(id)}/3` : isSlotItem(id) ? '🎰' : `T${skin ? skinTier(id) : heroTier(id)}`;
export const lockLong = (id, skin) => skin && needsHero(id) ? `Unlock ${skinHeroName(id)} first, then ${isSlotItem(id) ? 'win it from the slot machine' : `season pass tier ${skinTier(id)}`}`
  : !skin && isContractHero(id) ? `Recruitment contract · ${tasksDone(id)} of 3 tasks done` : isSlotItem(id) ? 'Slot machine prize' : `Season pass · tier ${skin ? skinTier(id) : heroTier(id)}`;
export { isSlotItem };
export const skinsFor = heroId => SKINS.filter(s => s.hero === heroId);
export const skinById = id => SKINS.find(s => s.id === id);
setSkinGate(id => heroOwned(skinById(id)?.hero));

// A hero def wearing a skin. With no id, uses whatever the player has equipped (if owned).
export function dressed(def, skinId = cfg.skins?.[def.id]) {
  const s = skinId && skinById(skinId);
  if (!s || s.hero !== def.id || !skinOwned(s.id)) return def;
  return { ...def, skinId: s.id, skinName: s.name, color: s.color, palette: { ...def.palette, ...s.palette } };
}
export function equip(heroId, skinId) {
  cfg.skins = { ...(cfg.skins || {}) };
  if (skinId) cfg.skins[heroId] = skinId; else delete cfg.skins[heroId];
  save();
}

export function rewardInfo(r) {
  if (r.type === 'hero') { const h = HEROES.find(x => x.id === r.id); return { title: h.callsign, sub: 'New hero', def: h }; }
  if (r.cos) { const c = cosById(r.id); return { title: c.name, sub: COS_TYPES[c.type].label, cos: c, glyph: c.glyph || COS_TYPES[c.type].icon }; }
  const s = skinById(r.id), h = HEROES.find(x => x.id === s.hero);
  return { title: s.name, sub: `${h.callsign} skin`, def: dressedAny(h, s) };
}

// ---------- cosmetics ----------
export const cosTier = id => COS_TIER[id] || 0;
export const cosOwned = id => { const c = cosById(id); return !!c && (c.slot ? slotOwned(id) : tier() >= cosTier(id)); };
// What a locked cosmetic is waiting on.
export const cosLock = id => cosById(id)?.slot ? 'Slot machine' : `Tier ${cosTier(id)}`;
export const equippedCos = () => cfg.cos || {};
export function equipCos(type, id) {
  cfg.cos = { ...(cfg.cos || {}) };
  if (id && cosOwned(id)) cfg.cos[type] = id; else delete cfg.cos[type];
  save();
}
// The ids you're wearing right now (only ones you own), as sent to other players.
export function myCosIds() {
  const out = {};
  for (const [type, id] of Object.entries(equippedCos())) if (cosOwned(id) && cosById(id)?.type === type) out[type] = id;
  return out;
}
// Resolve ids (yours or another player's) into what the game needs.
export function resolveCos(ids = {}) {
  return {};                                         // nothing in a match depends on cosmetics any more
}

const css = c => '#' + c.toString(16).padStart(6, '0');
// Little preview art for a cosmetic (pass track, end screen).
export function cosArt(c) {
  if (c.type === 'spray') return `<div class="ca ca-spray"><img src="${sprayUrl(c)}" alt=""></div>`;
  return "";
}
// Preview a skin regardless of ownership (for the pass track).
export const dressedAny = (h, s) => ({ ...h, skinId: s.id, color: s.color, palette: { ...h.palette, ...s.palette } });
// Online: other players show the skin they picked, whatever we own.
export function wear(def, skinId) { const s = skinId && skinById(skinId); return s && s.hero === def.id ? dressedAny(def, s) : def; }

// ---------- earning ----------
export function matchXp({ mode, win, kills, place, players }) {
  const parts = [];
  if (mode === 'survivor') parts.push(win ? ['Maxx out', 250] : [`Placed #${place}`, 40 + Math.max(0, players - place) * 12]);
  else if (mode === 'duel') parts.push(win ? ['Duel won', 220] : ['Duel lost', 70]);
  else parts.push(win ? ['Victory', 200] : ['Defeat', 60]);
  if (kills) parts.push([`${kills} kill${kills > 1 ? 's' : ''}`, kills * 15]);
  return parts;
}
export function award(parts) {
  const before = state.xp, gained = parts.reduce((s, [, v]) => s + v, 0);
  state.xp = Math.min(MAX_TIER * SEASON.tierXp, state.xp + gained);
  persist();
  const t0 = tierOf(before), t1 = tierOf(state.xp);
  return { before, after: state.xp, gained, parts, t0, t1, unlocked: TRACK.filter(r => r.tier > t0 && r.tier <= t1) };
}
