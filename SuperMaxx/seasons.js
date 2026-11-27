// When each season opens. Shared by the hero list (so a season's heroes only appear once it's live)
// and the season pass.

// Season 2 opened at local midnight on Friday 27 November 2026. Add ?season=2 to the URL to preview it early.
const PREVIEW = (() => { try { return +new URLSearchParams(location.search).get('season') || 0; } catch { return 0; } })();
export const SEASONS = [
  { n: 1, name: 'Golden Hour', tierXp: 150, start: 0, icon: '🌅', blurb: 'Sunsets, fireworks and the first three season heroes.' },
  { n: 2, name: 'Insert Coin', tierXp: 375, start: +new Date(2026, 10, 27), icon: '🕹️', blurb: 'A neon arcade season: pinball, claw machines and an 8-bit knight.' },
];
export const seasonLive = s => PREVIEW ? s.n <= PREVIEW : Date.now() >= s.start;
export const SEASON = SEASONS.filter(seasonLive).pop();                 // the one running now (fixed for this visit)
export const NEXT_SEASON = SEASONS.find(s => !seasonLive(s)) || null;
export const seasonStartLabel = s => new Date(s.start).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
