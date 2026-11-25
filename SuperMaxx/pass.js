import { HEROES } from './heroes.js';
import { cfg, save } from './settings.js';

// Season pass: XP from matches (mostly from winning) climbs a 30-tier track of hero skins,
// cosmetics and three season heroes. Progress is saved locally.

export const SEASON = { n: 1, name: 'Golden Hour', tierXp: 150 };

// Skins override the hero palette (and the accent colour used for art and the view model).
export const SKINS = [
  { id: 'vanguard-deep', hero: 'vanguard', name: 'Deep Sea', color: 0x2a5bd7, palette: { main: 0x2a5bd7, trim: 0xbfe6ff, dark: 0x14254a } },
  { id: 'striker-night', hero: 'striker', name: 'Night Shift', color: 0x6fe8ff, palette: { main: 0x2b2d4f, trim: 0x6fe8ff, dark: 0x111226 } },
  { id: 'ember-sapphire', hero: 'ember', name: 'Sapphire Show', color: 0x3a66c8, palette: { main: 0x3a66c8, trim: 0xffd23c, dark: 0x1d2340 } },
  { id: 'warden-dawn', hero: 'warden', name: 'Dawn Vigil', color: 0xffa27a, palette: { main: 0xffa27a, trim: 0xffffff, dark: 0x8a4a6a, skin: 0x3a2a40 } },
  { id: 'thicket-autumn', hero: 'thicket', name: 'Autumn Harvest', color: 0xd9733a, palette: { main: 0xc8642e, trim: 0xffd23c, dark: 0x5a3020 } },
  { id: 'ratchet-brass', hero: 'ratchet', name: 'Brass Works', color: 0xd9a441, palette: { main: 0xd9a441, trim: 0x2fb39a, dark: 0x4a3520 } },
  { id: 'mirage-emerald', hero: 'mirage', name: 'Emerald Act', color: 0x2fbf7a, palette: { main: 0x1f6b4e, trim: 0xffffff, dark: 0x0f2a22 } },
  { id: 'avalanche-aurora', hero: 'avalanche', name: 'Aurora', color: 0x5be0b0, palette: { main: 0x3fc99a, trim: 0xb98cff, dark: 0x24304f } },
  { id: 'tempo-vapor', hero: 'tempo', name: 'Vaporwave', color: 0xff8fd0, palette: { main: 0xff8fd0, trim: 0x6fe8ff, dark: 0x3d2a6b } },
  { id: 'vanguard-coral', hero: 'vanguard', name: 'Coral Reef', color: 0xff7a6b, palette: { main: 0xff7a6b, trim: 0xfff0d6, dark: 0x3a2a4a } },
  { id: 'kestrel-storm', hero: 'kestrel', name: 'Stormchaser', color: 0x7a8cff, palette: { main: 0x3d4a6b, trim: 0x7af0ff, dark: 0x1d2340 } },
  { id: 'striker-bubble', hero: 'striker', name: 'Bubblegum', color: 0xff8fd0, palette: { main: 0xff8fd0, trim: 0x7af0ff, dark: 0x4a2a5c } },
  { id: 'ember-ash', hero: 'ember', name: 'Ash & Ember', color: 0xff5a36, palette: { main: 0x3a3a40, trim: 0xff5a36, dark: 0x1a1a1f } },
  { id: 'warden-eclipse', hero: 'warden', name: 'Eclipse', color: 0xff5a36, palette: { main: 0x1d2340, trim: 0xff5a36, dark: 0x0d1020 } },
  { id: 'thicket-frost', hero: 'thicket', name: 'Frostbloom', color: 0x9fd8e8, palette: { main: 0x9fd8e8, trim: 0xffffff, dark: 0x3d5a6a } },
  { id: 'ratchet-cobalt', hero: 'ratchet', name: 'Cobalt', color: 0x2f5bff, palette: { main: 0x2f5bff, trim: 0xffc93c, dark: 0x1d2340 } },
  { id: 'mirage-noir', hero: 'mirage', name: 'Velvet Noir', color: 0xff4f6b, palette: { main: 0x1d1d24, trim: 0xff4f6b, dark: 0x0a0a10 } },
  { id: 'avalanche-gold', hero: 'avalanche', name: 'Golden Hour', color: 0xffc93c, palette: { main: 0xffc93c, trim: 0xffffff, dark: 0x8a5a20 } },
  { id: 'croc-mardi', hero: 'croc', name: 'Mardi Gras', color: 0xa64fd9, palette: { main: 0x7a3fb0, trim: 0xffd23c, dark: 0x2f8a4a, skin: 0xc9a6ff } },
  { id: 'croc-albino', hero: 'croc', name: 'Albino Ghost', color: 0xf4efe6, palette: { main: 0xf0e8dc, trim: 0xff7a8a, dark: 0x8a7a6a, skin: 0xfff8ee } },
];

// Cosmetics: titles and banners show on your player card, tracers recolour your shots,
// elimination effects play on whoever you knock out, gliders are your Survivor canopy.
export const COS_TYPES = {
  title: { label: 'Title', icon: '🏷️' }, banner: { label: 'Banner', icon: '🚩' }, tracer: { label: 'Tracer', icon: '✨' },
  killfx: { label: 'Elimination effect', icon: '💥' }, glider: { label: 'Glider', icon: '🪂' },
};
export const COSMETICS = [
  { id: 't-rookie', type: 'title', name: 'Rookie Maxxer' }, { id: 't-hillhog', type: 'title', name: 'Hill Hog' },
  { id: 't-duelist', type: 'title', name: 'Duelist' }, { id: 't-showoff', type: 'title', name: 'Showstopper' },
  { id: 't-storm', type: 'title', name: 'Storm Chaser' }, { id: 't-sharp', type: 'title', name: 'Pixel Perfect' },
  { id: 't-golden', type: 'title', name: 'Golden Hour Hero' }, { id: 't-legend', type: 'title', name: 'Legend of Maxx' },
  { id: 'b-sunburst', type: 'banner', name: 'Sunburst', a: 0xffc93c, b: 0xff5a36, pattern: 'rays' },
  { id: 'b-waves', type: 'banner', name: 'Harbour Waves', a: 0x2fb39a, b: 0x2a5bd7, pattern: 'waves' },
  { id: 'b-checker', type: 'banner', name: 'Pit Lane', a: 0x1d2340, b: 0xfff3c4, pattern: 'checker' },
  { id: 'b-confetti', type: 'banner', name: 'Confetti', a: 0xff4fa3, b: 0xfff0d6, pattern: 'dots' },
  { id: 'b-circuit', type: 'banner', name: 'Circuit', a: 0x3ccf9a, b: 0x1d2340, pattern: 'grid' },
  { id: 'b-blossom', type: 'banner', name: 'Blossom', a: 0xffffff, b: 0xe98aa6, pattern: 'dots' },
  { id: 'b-goldleaf', type: 'banner', name: 'Gold Leaf', a: 0xffe08a, b: 0xd9a441, pattern: 'rays' },
  { id: 'tr-pink', type: 'tracer', name: 'Hot Pink', color: 0xff4fa3 }, { id: 'tr-lime', type: 'tracer', name: 'Laser Lime', color: 0x9dff3c },
  { id: 'tr-ice', type: 'tracer', name: 'Glacier', color: 0x9fe8ff }, { id: 'tr-void', type: 'tracer', name: 'Void', color: 0x8a3cff },
  { id: 'tr-gold', type: 'tracer', name: 'Gilded', color: 0xffd23c }, { id: 'tr-rainbow', type: 'tracer', name: 'Rainbow', color: 'rainbow' },
  { id: 'k-confetti', type: 'killfx', name: 'Party Popper', fx: 'confetti', glyph: '🎉' }, { id: 'k-hearts', type: 'killfx', name: 'Smitten', fx: 'hearts', glyph: '💖' },
  { id: 'k-lightning', type: 'killfx', name: 'Thunderclap', fx: 'lightning', glyph: '⚡' }, { id: 'k-coins', type: 'killfx', name: 'Jackpot', fx: 'coins', glyph: '🪙' },
  { id: 'k-fireworks', type: 'killfx', name: 'Grand Finale', fx: 'fireworks', glyph: '🎆' },
  { id: 'g-sunset', type: 'glider', name: 'Sunset', a: 0xff8a3c, b: 0xffd23c }, { id: 'g-checker', type: 'glider', name: 'Chequered', a: 0x1d2340, b: 0xffffff },
  { id: 'g-neon', type: 'glider', name: 'Neon Nights', a: 0x18e0f0, b: 0xff4fa3 }, { id: 'g-golden', type: 'glider', name: 'Golden Wing', a: 0xffc93c, b: 0xffffff, glow: true },
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
const COS_TIER = {
  't-rookie': 1, 'b-sunburst': 2, 't-hillhog': 3, 'tr-pink': 4, 'b-waves': 5, 't-duelist': 6, 'tr-lime': 7, 'b-checker': 8,
  't-showoff': 9, 'k-confetti': 10, 'b-confetti': 11, 'tr-ice': 12, 't-storm': 13, 'k-hearts': 14, 'b-circuit': 15,
  'g-sunset': 16, 't-sharp': 17, 'tr-void': 18, 'k-lightning': 19, 't-golden': 20, 'g-checker': 21, 'b-blossom': 22,
  'k-coins': 23, 'tr-gold': 24, 'g-neon': 25, 'g-golden': 26, 'tr-rainbow': 27, 'b-goldleaf': 28, 'k-fireworks': 29, 't-legend': 30,
};
export const TRACK = [
  ...Object.entries(MAIN).map(([tier, [type, id]]) => ({ tier: +tier, type, id })),
  ...Object.entries(COS_TIER).map(([id, tier]) => ({ tier, type: cosById(id).type, id, cos: true })),
].sort((a, b) => a.tier - b.tier || (a.cos ? 1 : 0) - (b.cos ? 1 : 0));
export const MAX_TIER = Math.max(...TRACK.map(r => r.tier));

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
export const heroOwned = id => tier() >= heroTier(id);
export const skinOwned = id => tier() >= skinTier(id);
export const skinsFor = heroId => SKINS.filter(s => s.hero === heroId);
export const skinById = id => SKINS.find(s => s.id === id);

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
export const cosOwned = id => !!cosById(id) && tier() >= cosTier(id);
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
  const get = t => { const c = cosById(ids[t]); return c && c.type === t ? c : null; };
  const tr = get('tracer'), k = get('killfx'), g = get('glider');
  return { tracer: tr ? tr.color : null, killfx: k ? k.fx : null, glider: g ? { a: g.a, b: g.b, glow: !!g.glow } : null,
    title: get('title')?.name || '', banner: get('banner') };
}

const css = c => '#' + c.toString(16).padStart(6, '0');
export function bannerCss(c) {
  if (!c) return '';
  const a = css(c.a), b = css(c.b);
  return {
    rays: `background:repeating-conic-gradient(from 0deg at 18% 120%, ${a} 0 7deg, ${b} 7deg 14deg)`,
    waves: `background:radial-gradient(circle at 50% 100%, ${a} 0 42%, transparent 43%) 0 0/34px 18px, ${b}`,
    checker: `background:conic-gradient(${a} 25%, ${b} 0 50%, ${a} 0 75%, ${b} 0) 0 0/22px 22px`,
    dots: `background:radial-gradient(${a} 26%, transparent 28%) 0 0/16px 16px, ${b}`,
    grid: `background:linear-gradient(${a} 2px, transparent 2px) 0 0/18px 18px, linear-gradient(90deg, ${a} 2px, transparent 2px) 0 0/18px 18px, ${b}`,
  }[c.pattern];
}
// Little preview art for a cosmetic (pass track, end screen).
export function cosArt(c) {
  if (c.type === 'title') return `<div class="ca ca-title"><span>${c.name}</span></div>`;
  if (c.type === 'banner') return `<div class="ca ca-banner" style="${bannerCss(c)}"></div>`;
  if (c.type === 'tracer') return `<div class="ca ca-tracer" style="--c:${c.color === 'rainbow' ? 'linear-gradient(90deg,#ff4f4f,#ffd23c,#3ccf9a,#2f8bff,#b98cff)' : css(c.color)}"><i></i><i></i><i></i></div>`;
  if (c.type === 'killfx') return `<div class="ca ca-fx"><span>${c.glyph}</span></div>`;
  return `<div class="ca ca-glider" style="--a:${css(c.a)};--b:${css(c.b)}"><i></i></div>`;
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
