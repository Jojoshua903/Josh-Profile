// Character unlocks. Four fighters start unlocked; the rest are earned.
export const STARTERS = ['nathan', 'ash', 'josh', 'fionn'];

// key: lifetime stat in P.stats, goal: amount needed.
export const UNLOCKS = {
  renas: { key: 'clear1', goal: 1, text: 'Clear Stage 1, Hometown. Josh\'s little brother wants in.' },
  robin: { key: 'robinSaved', goal: 1, text: 'Save Robin from the drone on his tail in Stage 1.' },
  adam: { key: 'deflects', goal: 25, text: 'Return 25 enemy shots with barrel rolls. Like cannonballs.' },
  thomas: { key: 'rings', goal: 30, text: 'Fly through 30 rings. He likes round things.' },
  daniel: { key: 'drones', goal: 150, text: 'Blow up 150 Meta AI drones.' },
  deniz: { key: 'rocks', goal: 40, text: 'Smash 40 asteroids in the Junk Belt.' },
  lars: { key: 'clear2', goal: 1, text: 'Clear Stage 2, the Junk Belt. There\'s ore out there.' },
  milo: { key: 'specials', goal: 15, text: 'Use 15 specials. Milo loves a big flashy move.' },
  guiseppe: { key: 'golds', goal: 8, text: 'Collect 8 gold rings. Bonus stage energy.' },
  dean: { key: 'bestRun', goal: 25000, text: 'Score 25,000 points in a single run.' },
  enno: { key: 'bestRun', goal: 50000, text: 'Score 50,000 points in a single run. Do the math.' },
  dih: { key: 'downs', goal: 5, text: 'Get shot down 5 times. He finds it hilarious.' },
  reshman: { key: 'hardClears', goal: 1, text: 'Clear any stage on Hard. He was watching. He always is.' },
  ati: { key: 'wins', goal: 1, text: 'Beat Meta AI. Then she has the final word.' },
  yassin: { key: 'clear3', goal: 1, text: 'Clear Stage 3, the Tulip Polders. He\'ll karate-chop his way in.' },
  niffo: { key: 'tokensFound', goal: 5, text: 'Find 5 hidden Meta tokens. Niffo only deals in rare curios.' },
  femi: { key: 'runBest', goal: 1500, text: 'Fly 1,500 m in Obstacle Run. She only plays with fast people.' },
  bastiaan: { key: 'clear4', goal: 1, text: 'Clear Stage 4, the Feed. Somebody has to grade the algorithm.' },
  marloes: { key: 'evilAdam', goal: 1, text: 'Defeat Evil Adam in The Mirror before he flies off. He was guarding her crystals.' },
};
export const isUnlocked = (P, id) => STARTERS.includes(id) || (P.chars || []).includes(id);
export function progressOf(P, id) {
  const u = UNLOCKS[id]; if (!u) return null;
  const v = Math.min(u.goal, (P.stats || {})[u.key] || 0);
  return { ...u, v, pct: v / u.goal };
}
// Returns ids newly unlocked by the current stats.
export function checkUnlocks(P) {
  P.chars = P.chars || [];
  const fresh = [];
  for (const [id, u] of Object.entries(UNLOCKS)) {
    if (!P.chars.includes(id) && ((P.stats || {})[u.key] || 0) >= u.goal) { P.chars.push(id); fresh.push(id); }
  }
  return fresh;
}
