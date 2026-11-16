// ==========================================================
// gallery.js — the Portrait Gallery: every portrait ghost you catch
// is hung in a gold, silver or bronze frame depending on how cleanly
// you caught it. Best frames are kept across runs.
// ==========================================================

// in the order you meet them — Grumbleclaw first
export const GALLERY = [
  { id: 'grumbleclaw', name: 'GRUMBLECLAW', title: 'the Goon of the Banquet', room: 'Dining Room' },
  { id: 'patchnotes', name: 'PROFESSOR PATCHNOTES', title: 'the Midnight Coder', room: 'Study' },
  { id: 'sonata', name: 'MADAME SONATA', title: 'the Phantom Soprano', room: 'Conservatory' },
  { id: 'pip', name: 'PIXEL PIP', title: 'the Cartridge Kid', room: 'Nursery' },
  { id: 'snoozewell', name: 'LORD SNOOZEWELL', title: 'the Sleeping Squire', room: 'Master Bedroom' },
  { id: 'boilerbeard', name: 'BOILERBEARD', title: 'the Stoker Below', room: 'Boiler Room' },
  { id: 'varnish', name: 'MASTER VARNISH', title: 'the Ghost Painter', room: 'Ballroom' },
];

export const TIERS = {
  gold: { label: 'GOLD', rank: 3, frame: '#e8b830', dark: '#5a3a0a', css: '#ffd23a', bonus: 5000 },
  silver: { label: 'SILVER', rank: 2, frame: '#b8c4d0', dark: '#3a4450', css: '#d8e2ec', bonus: 2000 },
  bronze: { label: 'BRONZE', rank: 1, frame: '#b0703a', dark: '#3a2010', css: '#e09a5a', bonus: 0 },
};

// How cleanly was it caught?
//   GOLD    one tug-of-war from start to finish, and hit at most once
//   SILVER  caught within two tugs, hit three times or fewer
//   BRONZE  anything else
export function gradeCapture(pulls, hits) {
  if (pulls <= 1 && hits <= 1) return 'gold';
  if (pulls <= 2 && hits <= 3) return 'silver';
  return 'bronze';
}

export const GRADE_RULES = 'GOLD: one tug, hit at most once · SILVER: two tugs or fewer, hit 3× or fewer · BRONZE: any catch';

// is `a` a better result than `b`? (higher tier, then fewer hits, then fewer tugs)
export function betterFrame(a, b) {
  if (!b) return true;
  const ra = TIERS[a.tier].rank;
  const rb = TIERS[b.tier].rank;
  if (ra !== rb) return ra > rb;
  if (a.hits !== b.hits) return a.hits < b.hits;
  return a.pulls < b.pulls;
}
