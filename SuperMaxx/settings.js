// Player settings, persisted to localStorage.

const KEY = 'supermaxx';
const DEFAULTS = {
  hero: 'vanguard', map: 'plaza', diff: 'normal',
  sens: 1, invertY: false, fov: 90, padSens: 1, padInvert: false, aimAssist: true, padRumble: true,
  volume: 0.8, music: 0.6, sfx: 1, perf: false, tutorialDone: false, quality: 'high', shadows: true, dmgNumbers: true, voiceLines: true, screenShake: true, hitStop: true, idleReload: true, objPins: true, speedLines: true, deathFade: true, killIcons: true, castCues: true, outlines: true, xhStyle: 'cross', xhColor: 'white', xhSize: 1, xhThick: 2, xhGap: 0, xhDot: false, xhOutline: true, xhAlpha: 1, skins: {}, cos: {}, name: '',
};

function load() {
  try {
    const raw = localStorage.getItem(KEY) || localStorage.getItem('lanebreakers') || '{}';
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { return { ...DEFAULTS }; }
}

export const cfg = load();
export function save() { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch {} }
export function resetSettings() {
  const keep = { hero: cfg.hero, map: cfg.map, skins: cfg.skins, cos: cfg.cos, name: cfg.name };
  Object.assign(cfg, DEFAULTS, keep); save();
}

export const QUALITY = {
  low: { label: 'Low', ratio: 0.75 },
  medium: { label: 'Medium', ratio: 1 },
  high: { label: 'High', ratio: 1.25 },
  ultra: { label: 'Ultra', ratio: 2 },
};

// Apply render settings. Toggling shadows mid-match needs every material recompiled.
export function applyGraphics(renderer, scene) {
  renderer.setPixelRatio(Math.min(QUALITY[cfg.quality].ratio, devicePixelRatio));
  if (renderer.shadowMap.enabled !== cfg.shadows) {
    renderer.shadowMap.enabled = cfg.shadows;
    scene?.traverse(o => { if (o.material) [].concat(o.material).forEach(m => { m.needsUpdate = true; }); });
  }
}
