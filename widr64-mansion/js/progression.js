// ==========================================================
// progression.js — what carries over between runs:
//  • the BANK: treasure you bring home, spent in the Workshop
//  • WORKSHOP upgrades: capped boosts to suction, light, vest, magnet, luck
//  • HERO LEVELS: each hero earns XP and small perks up to level 10
//  • PLAYER LEVEL: all XP combined; rewards treasure and unlocks heroes
//  • HERO UNLOCKS: start with Nathan; rescue teammates or level up to free more
// Everything is capped so skill still matters more than grinding.
// ==========================================================
import { CHARACTERS } from './characters.js';

// Workshop: five levels each, prices climb steeply
export const UPGRADE_COSTS = [15000, 35000, 70000, 120000, 200000];
export const UPGRADES = [
  { id: 'suction', icon: '🌀', name: 'Turbo Motor', text: 'Stronger pull in the tug-of-war', per: '+5% suction', max: 5 },
  { id: 'lens', icon: '🔦', name: 'Wide Lens', text: 'Wider beam that recharges faster', per: '+4% beam · −5% recharge', max: 5 },
  { id: 'vest', icon: '🦺', name: 'Padded Vest', text: 'Take more hits before fainting', per: '+6 max HP', max: 5 },
  { id: 'magnet', icon: '🧲', name: 'Treasure Magnet', text: 'Coins and gems fly to you from further away', per: '+25% pickup range', max: 5 },
  { id: 'luck', icon: '🍀', name: 'Lucky Charm', text: 'More treasure from ghosts and furniture', per: '+4% loot', max: 5 },
];

// hero levels: cumulative XP needed for each level (index = level)
const HERO_XP = [0, 0, 200, 600, 1200, 2000, 3000, 4200, 5600, 7200, 9000];
export const HERO_MAX = 10;
export const HERO_PERKS = {
  2: { text: '+5 max HP', hp: 5 },
  3: { text: '+4% suction', suction: 0.04 },
  4: { text: '5% faster light recharge', recharge: 0.05 },
  5: { text: '+5 max HP', hp: 5 },
  6: { text: '+4% suction', suction: 0.04 },
  7: { text: '+3% walking speed', speed: 0.03 },
  8: { text: '+5% beam width', beam: 0.05 },
  9: { text: '+5 max HP', hp: 5 },
  10: { text: 'Golden Poltergust + mastery sticker', golden: true },
};

// player level: all XP from every hero combined
export const PLAYER_MAX = 20;
const playerNeed = (lv) => 250 * lv * (lv - 1); // cumulative XP for level lv
// heroes join through their quests in the mansion, so levels pay out treasure
export const PLAYER_REWARDS = {
  2: { cash: 10000 },
  3: { cash: 15000 },
  4: { cash: 20000 },
  5: { cash: 25000 },
  6: { discount: 0.1, text: '10% off in the Workshop' },
  7: { cash: 35000 },
  8: { cash: 50000 },
  9: { cash: 45000 },
  10: { cash: 60000, sticker: 'veteran' },
  12: { cash: 75000 },
  14: { cash: 90000 },
  15: { cash: 100000 },
  16: { cash: 120000 },
  20: { cash: 250000, sticker: 'legend' },
};

function levelFrom(xp, table, max) {
  let lv = 1;
  for (let l = 2; l <= max; l++) if (xp >= table(l)) lv = l;
  const cur = table(lv);
  const next = lv >= max ? cur : table(lv + 1);
  return { level: lv, into: xp - cur, need: Math.max(1, next - cur), max: lv >= max };
}
export const heroLevelInfo = (xp) => levelFrom(xp, (l) => HERO_XP[l], HERO_MAX);
export const playerLevelInfo = (xp) => levelFrom(xp, playerNeed, PLAYER_MAX);

export class Progress {
  constructor(bridge) {
    this.bridge = bridge;
    const saved = bridge.getProgress();
    this.data = saved || this.migrate();
    this.data.upgrades = this.data.upgrades || {};
    this.data.heroXP = this.data.heroXP || {};
    this.data.unlocked = this.data.unlocked || ['nathan'];
    if (!this.data.unlocked.includes('nathan')) this.data.unlocked.unshift('nathan');
    if (!saved) this.save();
  }

  // first launch with this system: anyone you've already played with stays open
  migrate() {
    const d = this.bridge.data;
    const known = new Set(['nathan', d.lastHero, ...(d.rescued || []), ...(d.cleared || []), ...Object.keys(d.highScores || {})]);
    for (const f of d.files || []) {
      if (!f) continue;
      known.add(f.hero);
      if (f.checkpoint) known.add(f.checkpoint.hero);
      (f.rescued || []).forEach((id) => known.add(id));
    }
    const unlocked = CHARACTERS.map((c) => c.id).filter((id) => known.has(id));
    return { bank: 0, upgrades: {}, heroXP: {}, playerXP: 0, unlocked };
  }

  save() {
    this.bridge.saveProgress(this.data);
  }

  get bank() {
    return this.data.bank || 0;
  }

  // --- unlocks
  isUnlocked(id) {
    return this.data.unlocked.includes(id);
  }

  unlockHero(id) {
    if (this.isUnlocked(id)) return false;
    this.data.unlocked.push(id);
    return true;
  }

  // (heroes now join through quests; see entities/Quests.js questHint)

  // --- workshop
  upgradeLevel(id) {
    return this.data.upgrades[id] || 0;
  }

  discount() {
    const lv = this.playerLevel().level;
    return lv >= 6 ? PLAYER_REWARDS[6].discount : 0;
  }

  cost(id) {
    const u = UPGRADES.find((x) => x.id === id);
    const lv = this.upgradeLevel(id);
    if (!u || lv >= u.max) return null;
    return Math.round((UPGRADE_COSTS[lv] * (1 - this.discount())) / 500) * 500;
  }

  buy(id) {
    const c = this.cost(id);
    if (c === null || this.bank < c) return false;
    this.data.bank -= c;
    this.data.upgrades[id] = this.upgradeLevel(id) + 1;
    this.save();
    return true;
  }

  // --- levels
  heroXP(id) {
    return this.data.heroXP[id] || 0;
  }

  heroLevel(id) {
    return heroLevelInfo(this.heroXP(id));
  }

  playerLevel() {
    return playerLevelInfo(this.data.playerXP || 0);
  }

  // the hero's stats for a run: base + hero-level perks + workshop upgrades
  buildStats(char) {
    const s = { ...char.stats };
    const lv = this.heroLevel(char.id).level;
    let hp = 0;
    let suction = 0;
    let recharge = 0;
    let speed = 0;
    let beam = 0;
    for (let l = 2; l <= lv; l++) {
      const p = HERO_PERKS[l];
      hp += p.hp || 0;
      suction += p.suction || 0;
      recharge += p.recharge || 0;
      speed += p.speed || 0;
      beam += p.beam || 0;
    }
    const U = (id) => this.upgradeLevel(id);
    suction += U('suction') * 0.05;
    beam += U('lens') * 0.04;
    recharge += U('lens') * 0.05;
    hp += U('vest') * 6;
    s.maxHp = char.stats.maxHp + hp;
    s.suction = char.stats.suction * (1 + suction);
    s.beamWidth = char.stats.beamWidth * (1 + beam);
    s.stunRecharge = char.stats.stunRecharge * (1 - recharge);
    s.speed = char.stats.speed * (1 + speed);
    s.magnet = 1 + U('magnet') * 0.25;
    s.luck = char.stats.luck * (1 + U('luck') * 0.04);
    s.golden = lv >= HERO_MAX;
    return s;
  }

  // a summary of what the hero's level gives, for the select screen
  perkSummary(id) {
    const lv = this.heroLevel(id).level;
    const got = [];
    for (let l = 2; l <= lv; l++) got.push(HERO_PERKS[l].text);
    const next = lv < HERO_MAX ? `LV ${lv + 1}: ${HERO_PERKS[lv + 1].text}` : 'MASTERED';
    return { got, next };
  }

  // ---------------------------------------------------------------
  // end of a run: bank the treasure, hand out XP, level-ups and rewards
  // rate: share of the treasure that makes it home (all of it unless you faint)
  award({ heroId, cash, success, ghosts, bosses, rooms, rescuedId, rate = success ? 1 : 0.5 }) {
    const report = { bank: 0, heroXP: 0, heroUps: [], playerUps: [], rewards: [], unlocked: [], stickers: [], halved: rate < 1 && cash > 0 };
    report.bank = Math.max(0, Math.round(cash * rate));
    this.data.bank = this.bank + report.bank;

    const xp = ghosts * 15 + bosses * 150 + rooms * 25 + (success ? 500 : 0);
    report.heroXP = xp;
    const h0 = this.heroLevel(heroId).level;
    this.data.heroXP[heroId] = this.heroXP(heroId) + xp;
    const h1 = this.heroLevel(heroId).level;
    for (let l = h0 + 1; l <= h1; l++) report.heroUps.push({ level: l, text: HERO_PERKS[l].text });
    if (h1 >= HERO_MAX && h0 < HERO_MAX) report.stickers.push('hero_master');

    const p0 = this.playerLevel().level;
    this.data.playerXP = (this.data.playerXP || 0) + xp;
    const p1 = this.playerLevel().level;
    for (let l = p0 + 1; l <= p1; l++) {
      report.playerUps.push(l);
      const r = PLAYER_REWARDS[l];
      if (!r) continue;
      if (r.cash) {
        this.data.bank += r.cash;
        report.rewards.push(`LV ${l}: +$${r.cash.toLocaleString('en-US')} treasure`);
      }
      if (r.discount) report.rewards.push(`LV ${l}: ${r.text}`);
      if (r.sticker) report.stickers.push(r.sticker);
    }
    // the rescued teammate becomes playable
    if (success && rescuedId && this.unlockHero(rescuedId)) report.unlocked.unshift(rescuedId);
    this.save();
    report.hero = { before: h0, after: h1, info: this.heroLevel(heroId) };
    report.player = { before: p0, after: p1, info: this.playerLevel() };
    report.total = this.bank;
    return report;
  }
}
