// Player settings and saved progress (persisted in localStorage).
const KEY = 'squad_vs_meta_v1';
export const DEFAULTS = {
  master: 8, music: 6, sfx: 8,
  difficulty: 'normal', invertY: false, meta: 'normal', reticle: true,
  textSpeed: 'normal', autoAdvance: true, cutscenes: 'play',
  quality: 'high', shake: true, fps: false,
};
export const SCHEMA = [
  ['AUDIO'],
  { k: 'master', label: 'Master volume', type: 'range' },
  { k: 'music', label: 'Music', type: 'range' },
  { k: 'sfx', label: 'Sound effects', type: 'range' },
  ['GAMEPLAY'],
  { k: 'difficulty', label: 'Difficulty', opts: [['easy', 'Easy'], ['normal', 'Normal'], ['hard', 'Hard']],
    hint: { easy: 'Softer hits, fewer enemy shots, weaker drones.', normal: 'The way the squad intended.', hard: 'Faster shots, tougher drones, hits hurt more.' } },
  { k: 'invertY', label: 'Invert vertical flight', opts: [[false, 'Off'], [true, 'On']], hint: { true: 'Up arrow dives, like a flight stick.' } },
  { k: 'meta', label: 'Meta AI interruptions', opts: [['off', 'Off'], ['rare', 'Rare'], ['normal', 'Normal'], ['chaos', 'Chaos']],
    hint: { off: 'Meta AI only speaks during the story.', chaos: 'It will not stop talking. You were warned.' } },
  { k: 'reticle', label: 'Aim reticle', opts: [[true, 'On'], [false, 'Off']] },
  ['STORY'],
  { k: 'textSpeed', label: 'Text speed', opts: [['slow', 'Slow'], ['normal', 'Normal'], ['fast', 'Fast'], ['instant', 'Instant']] },
  { k: 'autoAdvance', label: 'Auto-advance dialogue', opts: [[true, 'On'], [false, 'Off']], hint: { false: 'Press Enter or click for each line.' } },
  { k: 'cutscenes', label: 'Cutscenes', opts: [['play', 'Play'], ['skip', 'Skip all']] },
  ['DISPLAY'],
  { k: 'quality', label: 'Graphics quality', opts: [['low', 'Low'], ['medium', 'Medium'], ['high', 'High']], hint: { low: 'Best for older laptops.' } },
  { k: 'shake', label: 'Screen shake', opts: [[true, 'On'], [false, 'Off']] },
  { k: 'fps', label: 'Show FPS', opts: [[false, 'Off'], [true, 'On']] },
];
export const DIFF = {
  easy: { dmg: 0.6, fire: 0.65, hp: 0.8, speed: 0.9 },
  normal: { dmg: 1, fire: 1, hp: 1, speed: 1 },
  hard: { dmg: 1.4, fire: 1, hp: 1.3, speed: 1.18 },
};
export const META_FREQ = { off: 0, rare: 2.2, normal: 1, chaos: 0.4 };
export const TEXT_CPS = { slow: 28, normal: 48, fast: 95, instant: 9999 };

function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } }
const saved = load();
export const S = { ...DEFAULTS, ...(saved.settings || {}) };
export const P = { unlocked: 1, best: 0, lastHero: null, lastStage: 0, clears: 0, chars: [], stats: {}, ...(saved.progress || {}) };
export function persist() { try { localStorage.setItem(KEY, JSON.stringify({ settings: S, progress: P })); } catch { /* storage unavailable */ } }
export function resetProgress() { Object.assign(P, { unlocked: 1, best: 0, lastHero: null, lastStage: 0, clears: 0, chars: [], stats: {} }); persist(); }
export function restoreDefaults() { Object.assign(S, DEFAULTS); persist(); }
