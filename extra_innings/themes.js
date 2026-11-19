'use strict';
/* =========================================================
   MENU THEMES — unlocked by major story events.
   Shared by the main menu (to apply) and game pages (to announce).
   ========================================================= */
const Themes = (() => {
  const LIST = [
    // ---- the seven Menu Styles (Silksong-style dioramas: scene = a full painted backdrop instead of the Spire) ----
    { id: 'dugout', name: 'The Dugout', how: 'Available from the start', hint: 'Available from the start', unlockText: 'A worn bench, one swinging stadium lamp. Home.',
      scene: 'dugout', music: 'camp',
      sky: ['#1a1020', '#4a2430', '#c8642a'], tower: '#1b1424', ground: '#0d0b10', win: '255,140,66', crown: '255,200,120',
      ember: [255, 140, 66], ember2: [243, 234, 216], glowShadow: '#ff8c42', flash: '255,200,120', flashes: false,
      css: { '--flame': '#ff3b30', '--ember': '#ff8c42', '--gold': '#f3ead8', '--storm': '#ff8c42', '--night': '#140c12', '--glow': 'rgba(255,140,66,.5)' } },
    { id: 'chill', name: 'Eternal Chill', how: 'Finish Deniz\'s tea quest, or find the hippie ending', hint: 'A king can only relax once the kettle is full.', unlockText: 'The ice throne melted into a sunny roof terrace. Peace and love.',
      scene: 'chill', music: 'reggae', fx: 'petals',
      sky: ['#4fb6d8', '#9fe0ef', '#ffe3a0'], tower: '#3a6a7a', ground: '#e6c88a', win: '255,213,79', crown: '255,213,79',
      ember: [255, 213, 79], ember2: [128, 222, 234], glowShadow: '#ffd54f', flash: '255,255,255', flashes: false,
      css: { '--flame': '#26b5c4', '--ember': '#ffd54f', '--gold': '#ffd54f', '--storm': '#80deea', '--night': '#123a44', '--glow': 'rgba(128,222,234,.55)' } },
    { id: 'sudden', name: 'Sudden Death', how: 'Reach any ending', hint: 'Only those who have seen an ending may look at the red moon.', unlockText: 'A blood moon over the empty infield. No extra innings.',
      scene: 'sudden', music: 'evil',
      sky: ['#09060d', '#1a0710', '#3a0a12'], tower: '#120810', ground: '#050307', win: '255,23,68', crown: '242,193,78',
      ember: [255, 23, 68], ember2: [242, 193, 78], glowShadow: '#ff1744', flash: '255,23,68', flashes: false,
      css: { '--flame': '#ff1744', '--ember': '#f2c14e', '--gold': '#f2c14e', '--storm': '#ff1744', '--night': '#09060d', '--glow': 'rgba(255,23,68,.55)' } },
    { id: 'machine', name: 'Works On My Machine', how: 'Let Josh hack the Gilded Stadium', hint: 'Have you tried turning the final boss off and on again?', unlockText: 'Everything is wireframe now. Josh says that\'s a feature.',
      scene: 'machine', music: 'server', fx: 'code',
      sky: ['#000308', '#00101a', '#001a14'], tower: '#00e5ff', ground: '#000000', win: '0,229,255', crown: '0,255,140',
      ember: [0, 229, 255], ember2: [0, 255, 140], glowShadow: '#00e5ff', flash: '0,229,255', flashes: false,
      css: { '--flame': '#00e5ff', '--ember': '#00ff8c', '--gold': '#00e5ff', '--storm': '#00ff8c', '--night': '#000308', '--glow': 'rgba(0,229,255,.5)' } },
    { id: 'horizon', name: 'The Zennith Horizon', how: 'Reach the True Ending, or conquer the Overtime Abyss', hint: 'Bring everyone home. Or go where no bench will save you.', unlockText: 'The tower is gone. Just a field at sunrise, and your friends.',
      scene: 'horizon', music: 'victory', fx: 'fluff',
      sky: ['#4fc3f7', '#a8e0f8', '#ffe8a8'], tower: '#2a5a1a', ground: '#3f7a2a', win: '255,215,0', crown: '255,215,0',
      ember: [255, 248, 220], ember2: [255, 215, 0], glowShadow: '#ffd700', flash: '255,255,255', flashes: false,
      css: { '--flame': '#e8361c', '--ember': '#ffd700', '--gold': '#ffd700', '--storm': '#4fc3f7', '--night': '#1a2a3a', '--glow': 'rgba(255,215,0,.55)' } },
    { id: 'spire', name: 'The Spire', how: 'Available from the start', unlockText: '',
      sky: ['#120c1a', '#2a1d33', '#4a1d1a'], tower: '#1b1424', ground: '#0d0b10', win: '255,138,42', crown: '242,193,78',
      ember: [255, 90, 42], ember2: [242, 193, 78], glowShadow: '#e8361c', flash: '111,211,255', flashes: true,
      css: { '--flame': '#e8361c', '--ember': '#ff8a2a', '--gold': '#f2c14e', '--storm': '#6fd3ff', '--night': '#15111c', '--glow': 'rgba(232,54,28,.55)' } },
    { id: 'geode', name: 'The Geode Caverns', how: 'Defeat Fionn, Keeper of Pebbles', unlockText: 'Violet and emerald crystals, floating gently. Every rock has a name.',
      sky: ['#0c0718', '#1a0f2e', '#0f2a22'], tower: '#1e1530', ground: '#08050f', win: '155,227,200', crown: '185,139,255',
      ember: [185, 139, 255], ember2: [155, 227, 200], glowShadow: '#b98bff', flash: '155,227,200', flashes: false, fx: 'shards',
      css: { '--flame': '#b98bff', '--ember': '#9be3c8', '--gold': '#9be36a', '--storm': '#9be3c8', '--night': '#0c0718', '--glow': 'rgba(185,139,255,.55)' } },
    { id: 'storm', name: 'The Storm Atrium', how: 'Defeat Milo the Storm-Wrecked', unlockText: 'Rain, wind and purple lightning. Totally on purpose.',
      sky: ['#0e0a1e', '#221a3a', '#14201a'], tower: '#16122a', ground: '#07060e', win: '217,184,255', crown: '111,211,255',
      ember: [217, 184, 255], ember2: [111, 211, 255], glowShadow: '#d9b8ff', flash: '217,184,255', flashes: true, fx: 'rain',
      css: { '--flame': '#9a6aff', '--ember': '#6fd3ff', '--gold': '#d9b8ff', '--storm': '#6fd3ff', '--night': '#0e0a1e', '--glow': 'rgba(154,106,255,.55)' } },
  ];
  // eight styles, each with its own diorama (scene), music and mood; the Spire is the classic tower
  const EXTRA = {
    geode: { scene: 'geode', music: 'geode', hint: 'The man who names the rocks must lose a match.' },
    storm: { scene: 'storm', music: 'storm', hint: 'Silence the one who cursed his own books.' },
    spire: { music: 'hush', hint: 'Available from the start' },
  };
  for (const t of LIST) Object.assign(t, EXTRA[t.id] || {});
  const ORDER = ['spire', 'dugout', 'geode', 'storm', 'chill', 'sudden', 'machine', 'horizon'];
  LIST.sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));
  const byId = id => LIST.find(t => t.id === id);
  const read = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { logErr("themes.js:54", e); return null; } };
  let state = read('ei_themes') || { current: 'dugout', seenMenu: ['dugout', 'spire'], seenGame: ['dugout', 'spire'] };
  state.seenMenu = state.seenMenu || ['spire']; state.seenGame = state.seenGame || ['spire'];
  for (const k of ['seenMenu', 'seenGame']) if (!state[k].includes('dugout')) state[k].push('dugout');   // a default, not news
  // the style you picked last, remembered on its own key as well
  try { const sel = localStorage.getItem('selectedMenuTheme'); if (sel && byId(sel)) state.current = sel; } catch (e) { logErr('themes.js: selectedMenuTheme', e); }
  const save = () => { if (window.DEV_LOCK) return; try { localStorage.setItem('ei_themes', JSON.stringify(state)); localStorage.setItem('selectedMenuTheme', state.current); } catch (e) { logErr("themes.js:57", e); } };

  function unlocked() {
    const z = read('ei_zone1') || {}, drills = read('mpz_drills') || {}, q = z.q || {}, ends = read('ei_endings') || [];
    const u = ['dugout', 'spire'];
    if (z.fionnDead) u.push('geode');
    if (z.miloDead) u.push('storm');
    if (q.deniz === 'done' || ends.includes('chill')) u.push('chill');
    if (ends.length || Object.keys(q.endings || {}).length) u.push('sudden');
    if (ends.includes('joke') || (q.endings || {}).joke) u.push('machine');
    if (z.trueEnding || q.abyss === 'done' || ends.includes('true')) u.push('horizon');
    return u;
  }
  return {
    LIST, byId, unlocked,
    get current() { const t = byId(state.current); return t && !t.future && unlocked().includes(t.id) ? t : LIST[0]; },
    set(id) { state.current = id; save(); },
    /** themes unlocked since the menu last looked (marks them seen) */
    newForMenu() { const n = unlocked().filter(id => !state.seenMenu.includes(id)); state.seenMenu = unlocked(); save(); return n.map(byId); },
    hasNewForMenu() { return unlocked().some(id => !state.seenMenu.includes(id)); },
    /** call from a game page right after a big event; returns newly unlocked themes */
    announce() {
      const n = unlocked().filter(id => !state.seenGame.includes(id));
      state.seenGame = unlocked(); save();
      return n.map(byId);
    },
  };
})();
