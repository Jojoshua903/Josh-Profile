// Progress is kept in the browser, per planet, so you can close the tab and continue later.
const EMPTY = { got: [], crates: [], milo: false, guide: false, boss: false, ability: null, cp: null, coins: 0, rare: 0 };
const cache = {};
// bump a planet's version when its layout changes, so old saves don't point at cookies that moved
const VERSION = { berg: 2 };
let wiped = false;

export function getSave(planet = 'mistmaan') {
  if (cache[planet]) return cache[planet];
  const KEY = `${planet}-save-v${VERSION[planet] || 1}`;
  let save;
  try { save = { ...EMPTY, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
  catch (e) { save = { ...EMPTY }; }
  const gotSet = new Set(save.got);
  const persist = () => {
    if (wiped) return;            // after a reset nothing may write the old progress back
    save.got = [...gotSet];
    try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) {}
  };
  return (cache[planet] = { save, gotSet, persist, wipe: wipeAll });
}

// Start the whole game over: every planet, and which planet you were on. Your look & feel stay.
export function wipeAll() {
  wiped = true;
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (/-save-v\d+$/.test(k) || k === 'current-planet') localStorage.removeItem(k);
    }
  } catch (e) {}
}
