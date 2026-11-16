// ==========================================================
// widrBridge.js — WIDR 64 console bridge: postMessage events
// and localStorage persistence (prefix: widr64_mansion_)
// ==========================================================
import { CONFIG } from './config.js';
import { STICKERS, getCharacter, stickerIdForHero } from './characters.js';
import { betterFrame } from './gallery.js';

const PREFIX = CONFIG.storagePrefix;
const memoryStore = new Map();

function storageGet(key, fallback) {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (raw === null) return memoryStore.has(key) ? memoryStore.get(key) : fallback;
    return JSON.parse(raw);
  } catch (e) {
    return memoryStore.has(key) ? memoryStore.get(key) : fallback;
  }
}

function storageSet(key, value) {
  memoryStore.set(key, value);
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (e) {
    /* storage unavailable (sandboxed iframe): memory fallback only */
  }
}

export const EVENTS = {
  GAME_READY: 'GAME_READY',
  CHARACTER_SELECTED: 'CHARACTER_SELECTED',
  SCORE_UPDATE: 'SCORE_UPDATE',
  GAME_COMPLETE: 'GAME_COMPLETE',
  STICKER_UNLOCKED: 'STICKER_UNLOCKED',
  PORTRAIT_FRAMED: 'PORTRAIT_FRAMED',
};

class Bridge {
  constructor() {
    this.listeners = new Map();
    this.lastScoreEmit = 0;
    this.data = {
      highScores: storageGet('highscores', {}),       // { heroId: { cash, rank, time } }
      cleared: storageGet('cleared', []),             // [heroId]
      stickers: storageGet('stickers', []),           // [stickerId]
      rescued: storageGet('rescued', []),             // [heroId]
      settings: storageGet('settings', { muted: false, crt: false }),
      lastHero: storageGet('last_hero', 'nathan'),
      files: storageGet('files', [null, null, null]),
      gallery: storageGet('gallery', {}),             // { bossId: { tier, hero, pulls, hits, time } }
    };
    window.addEventListener('message', (ev) => this.onParentMessage(ev));
  }

  // --- outbound -------------------------------------------------
  emit(type, payload = {}) {
    const message = {
      source: 'widr64-mansion',
      type,
      payload,
      timestamp: Date.now(),
    };
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(message, '*');
      }
    } catch (e) {
      /* cross-origin parent may refuse; ignore */
    }
    if (CONFIG.debug) console.log('[WIDR64]', type, payload);
  }

  ready() {
    this.emit(EVENTS.GAME_READY, {
      title: 'WIDR 64 Mansion',
      version: '1.0.0',
      cleared: this.data.cleared.slice(),
      stickers: this.data.stickers.slice(),
    });
  }

  characterSelected(heroId) {
    const hero = getCharacter(heroId);
    this.data.lastHero = heroId;
    storageSet('last_hero', heroId);
    this.emit(EVENTS.CHARACTER_SELECTED, { id: hero.id, name: hero.name, role: hero.role });
  }

  // Throttled so the parent console isn't spammed each coin
  scoreUpdate(cash, rank, ghosts, force = false) {
    const now = performance.now();
    if (!force && now - this.lastScoreEmit < 500) return;
    this.lastScoreEmit = now;
    this.emit(EVENTS.SCORE_UPDATE, { cash, rank, ghosts });
  }

  // --- persistence --------------------------------------------------
  submitResult({ heroId, cash, rank, time, ghosts, rescuedId }) {
    const prev = this.data.highScores[heroId];
    const isNewBest = !prev || cash > prev.cash;
    if (isNewBest) {
      this.data.highScores[heroId] = { cash, rank, time: Math.round(time) };
      storageSet('highscores', this.data.highScores);
    }
    if (!this.data.cleared.includes(heroId)) {
      this.data.cleared.push(heroId);
      storageSet('cleared', this.data.cleared);
    }
    if (rescuedId && !this.data.rescued.includes(rescuedId)) {
      this.data.rescued.push(rescuedId);
      storageSet('rescued', this.data.rescued);
    }
    this.emit(EVENTS.GAME_COMPLETE, {
      hero: heroId, cash, rank, time: Math.round(time), ghosts, rescued: rescuedId || null, newBest: isNewBest,
    });
    return isNewBest;
  }

  // progression (bank, workshop, levels, unlocks) — null until first saved
  getProgress() {
    return storageGet('progress', null);
  }

  saveProgress(p) {
    storageSet('progress', p);
  }

  unlockSticker(id) {
    if (this.data.stickers.includes(id)) return false;
    this.data.stickers.push(id);
    storageSet('stickers', this.data.stickers);
    this.emit(EVENTS.STICKER_UNLOCKED, { id, label: this.stickerLabel(id) });
    return true;
  }

  stickerLabel(id) {
    if (STICKERS[id]) return `${STICKERS[id].emoji} ${STICKERS[id].label}`;
    if (id.startsWith('clear_')) {
      const hero = getCharacter(id.slice(6));
      return `⭐ Cleared as ${hero.name}`;
    }
    return id;
  }

  allStickerIds() {
    return Object.keys(STICKERS);
  }

  heroClearSticker(heroId) {
    return stickerIdForHero(heroId);
  }

  isCleared(heroId) {
    return this.data.cleared.includes(heroId);
  }

  bestFor(heroId) {
    return this.data.highScores[heroId] || null;
  }

  bestOverall() {
    let best = null;
    for (const [id, s] of Object.entries(this.data.highScores)) {
      if (!best || s.cash > best.cash) best = { id, ...s };
    }
    return best;
  }

  // --- save files (Data 1-3 on the portrait gallery) -------------------
  getFile(i) {
    return this.data.files[i] || null;
  }

  writeFile(i, file) {
    this.data.files[i] = file;
    storageSet('files', this.data.files);
  }

  copyFile(from, to) {
    const src = this.data.files[from];
    if (!src || from === to) return false;
    this.writeFile(to, JSON.parse(JSON.stringify(src)));
    return true;
  }

  eraseFile(i) {
    this.writeFile(i, null);
  }

  // merge a finished run into a save file
  recordRunInFile(i, { heroId, cash, rank, rescuedId }) {
    const order = ['C', 'B', 'A', 'S'];
    const f = this.data.files[i] || { hero: heroId, bestCash: 0, bestRank: null, clears: 0, totalCash: 0, rescued: [], created: Date.now() };
    f.hero = heroId;
    f.clears += 1;
    f.totalCash += cash;
    if (cash > f.bestCash) f.bestCash = cash;
    if (!f.bestRank || order.indexOf(rank) > order.indexOf(f.bestRank)) f.bestRank = rank;
    if (rescuedId && !f.rescued.includes(rescuedId)) f.rescued.push(rescuedId);
    f.lastPlayed = Date.now();
    f.checkpoint = null; // the run is over: the next pick starts a fresh mansion
    this.writeFile(i, f);
    return f;
  }

  // mid-run save after each area boss (the bigger mansion is a long trip)
  saveCheckpoint(i, cp) {
    const f = this.data.files[i] || { hero: cp.hero, bestCash: 0, bestRank: null, clears: 0, totalCash: 0, rescued: [], created: Date.now() };
    f.hero = cp.hero;
    f.checkpoint = cp;
    f.lastPlayed = Date.now();
    this.writeFile(i, f);
    return f;
  }

  // --- portrait gallery: best frame per portrait ghost -----------------
  getFrame(bossId) {
    return this.data.gallery[bossId] || null;
  }

  // returns true if this beats the frame already on the wall
  recordFrame(bossId, entry, label) {
    const prev = this.data.gallery[bossId] || null;
    const isNewBest = betterFrame(entry, prev);
    if (isNewBest) {
      this.data.gallery[bossId] = { ...entry, time: Date.now() };
      storageSet('gallery', this.data.gallery);
    }
    this.emit(EVENTS.PORTRAIT_FRAMED, {
      id: bossId, name: label, tier: entry.tier, hero: entry.hero, pulls: entry.pulls, hits: entry.hits,
      newBest: isNewBest, best: this.data.gallery[bossId].tier,
    });
    return isNewBest;
  }

  setSetting(key, value) {
    this.data.settings[key] = value;
    storageSet('settings', this.data.settings);
  }

  getSetting(key, fallback) {
    return key in this.data.settings ? this.data.settings[key] : fallback;
  }

  // --- inbound (parent console may control the game) -------------
  on(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(fn);
  }

  onParentMessage(ev) {
    const msg = ev.data;
    if (!msg || typeof msg !== 'object' || msg.source === 'widr64-mansion') return;
    const type = msg.type;
    if (!type) return;
    const fns = this.listeners.get(type);
    if (fns) fns.forEach((fn) => fn(msg.payload || {}));
  }
}

export const WidrBridge = new Bridge();
