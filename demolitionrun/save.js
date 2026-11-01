// Persistent save: chapter progress, the latest checkpoint and player settings.
const KEY = 'daniel-demolition-save-v1';
const DEFAULTS = () => ({
  version: 1,
  progress: { unlocked: 1, ranks: {}, endings: [], ach: [], totals: {} },
  checkpoint: null,
  settings: { sens: 1, vol: .8, fov: 75, invert: false, shake: true },
});

let data = DEFAULTS();
try {
  const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
  if (raw && raw.version === 1) data = { ...DEFAULTS(), ...raw, progress: { ...DEFAULTS().progress, ...raw.progress }, settings: { ...DEFAULTS().settings, ...raw.settings } };
} catch (err) { /* no storage or corrupt save: start fresh */ }

function write() { try { localStorage.setItem(KEY, JSON.stringify(data)); return true; } catch (err) { return false; } }

const RANK_ORDER = 'FDCBAS';
export const Save = {
  get settings() { return data.settings; },
  get progress() { return data.progress; },
  get checkpoint() { return data.checkpoint; },
  setSetting(k, v) { data.settings[k] = v; write(); },
  storeCheckpoint(cp) { data.checkpoint = { ...cp, savedAt: Date.now() }; return write(); },
  clearCheckpoint() { data.checkpoint = null; write(); },
  completeLevel(id, rank, ending, total) {
    const p = data.progress;
    p.unlocked = Math.min(total, Math.max(p.unlocked, id + 1));
    if (RANK_ORDER.indexOf(rank) > RANK_ORDER.indexOf(p.ranks[id] || 'F')) p.ranks[id] = rank;
    if (ending && !p.endings.includes(ending)) p.endings.push(ending);
    if (ending === 'X' || ending === 'Z') p.lastEnding = ending; // the mask choice is the one later chapters remember
    write();
  },
  get lastEnding() { return data.progress.lastEnding || data.progress.endings.filter(e => e === 'X' || e === 'Z').pop() || null; },
  // achievements and lifetime stats, kept across every playthrough
  award(id) { const a = data.progress.ach ||= []; if (a.includes(id)) return false; a.push(id); write(); return true; },
  addTotal(k, n = 1) { const t = data.progress.totals ||= {}; t[k] = (t[k] || 0) + n; write(); return t[k]; },
  wipe() { data = DEFAULTS(); write(); },
};
