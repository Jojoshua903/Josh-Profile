'use strict';
/* =========================================================
   KEY BINDINGS (shared by the menu and every game page)
   Two keyboard slots + two controller slots per action.
   Saved in localStorage under 'ei_binds'.
   ========================================================= */
const Bindings = (() => {
  const ACTIONS = [
    ['left',   'Move left'],
    ['right',  'Move right'],
    ['up',     'Look up · interact'],
    ['down',   'Look down · aim down'],
    ['jump',   'Jump'],
    ['attack', 'Swing bat'],
    ['ball',   'Toss baseball'],
    ['dash',   'Dash'],
    ['heal',   'Heal (hold)'],
    ['swap',   'Swap baseball type'],
    ['gadget', 'Use gadget'],
    ['map',    'Map'],
  ];
  const DEFAULT_KEYS = {
    left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'], up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'],
    jump: ['Space', 'KeyZ'], attack: ['KeyJ', 'KeyX'], ball: ['KeyK', 'KeyC'], dash: ['ShiftLeft', 'KeyL'],
    heal: ['KeyH', 'KeyV'], swap: ['KeyQ', 'KeyB'], gadget: ['KeyE', 'KeyN'], map: ['Tab', 'KeyM'],
  };
  const PRESETS = {
    'Default': DEFAULT_KEYS,
    'Arrows + Z X C': {
      left: ['ArrowLeft', null], right: ['ArrowRight', null], up: ['ArrowUp', null], down: ['ArrowDown', null],
      jump: ['KeyZ', null], attack: ['KeyX', null], ball: ['KeyC', null], dash: ['ShiftLeft', null], heal: ['KeyV', null], swap: ['KeyA', null], gadget: ['KeyS', null], map: ['Tab', null],
    },
    'WASD + Arrows': {
      left: ['KeyA', null], right: ['KeyD', null], up: ['KeyW', null], down: ['KeyS', null],
      jump: ['Space', null], attack: ['ArrowLeft', null], ball: ['ArrowUp', null], dash: ['ArrowRight', null], heal: ['ArrowDown', null], swap: ['KeyQ', null], gadget: ['KeyE', null], map: ['Tab', null],
    },
  };
  // the Silksong layout: A jump · X swing · B heal · Y balls (and talk) · RT dash/sprint · RB toss · LT gadget · LB map
  const DEFAULT_PAD = {
    left: [14, null], right: [15, null], up: [12, null], down: [13, null],
    jump: [0, null], attack: [2, null], ball: [5, null], dash: [7, null], heal: [1, null], swap: [3, null], gadget: [6, null], map: [4, null],
  };
  // the layout before it: players who never touched it get moved to the new one
  const OLD_PAD = {
    left: [14, null], right: [15, null], up: [12, null], down: [13, null],
    jump: [0, null], attack: [2, null], ball: [3, null], dash: [1, 7], heal: [5, 4], swap: [6, null], gadget: [10, null], map: [8, null],
  };
  // keys the game uses for pause / tuning / menus
  const RESERVED_KEYS = ['Escape', 'KeyP', 'KeyT', 'Backquote', 'Enter', 'NumpadEnter'];
  const RESERVED_PAD = [8, 9];   // VIEW opens the inventory, MENU pauses

  const clone = o => JSON.parse(JSON.stringify(o));
  let keys = clone(DEFAULT_KEYS), pad = clone(DEFAULT_PAD);
  try {
    const s = JSON.parse(localStorage.getItem('ei_binds') || 'null');
    if (s && s.keys) ACTIONS.forEach(([a]) => { if (Array.isArray(s.keys[a])) keys[a] = s.keys[a].slice(0, 2); });
    if (s && s.pad) ACTIONS.forEach(([a]) => { if (Array.isArray(s.pad[a])) pad[a] = s.pad[a].slice(0, 2); });
    if (s && s.pad && JSON.stringify(pad) === JSON.stringify(OLD_PAD)) { pad = clone(DEFAULT_PAD); localStorage.setItem('ei_binds', JSON.stringify({ keys, pad })); }
  } catch (e) { logErr("keybinds.js:51", e); }
  const save = () => { try { localStorage.setItem('ei_binds', JSON.stringify({ keys, pad })); } catch (e) { logErr("keybinds.js:52", e); } };

  const KEY_NAMES = {
    Space: 'SPACE', Tab: 'TAB', Enter: 'ENTER', Backspace: 'BKSP', CapsLock: 'CAPS',
    ShiftLeft: 'L‑SHIFT', ShiftRight: 'R‑SHIFT', ControlLeft: 'L‑CTRL', ControlRight: 'R‑CTRL', AltLeft: 'L‑ALT', AltRight: 'R‑ALT',
    MetaLeft: 'L‑CMD', MetaRight: 'R‑CMD', ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓',
    Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backslash: '\\', BracketLeft: '[', BracketRight: ']', Minus: '-', Equal: '=',
  };
  const PAD_NAMES = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'SELECT', 'START', 'L3', 'R3', 'D‑UP', 'D‑DOWN', 'D‑LEFT', 'D‑RIGHT', 'HOME'];
  function keyName(code) {
    if (!code) return '—';
    if (KEY_NAMES[code]) return KEY_NAMES[code];
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Digit')) return code.slice(5);
    if (code.startsWith('Numpad')) return 'NUM ' + code.slice(6);
    return code.toUpperCase();
  }
  const padName = i => (i === null || i === undefined) ? '—' : (PAD_NAMES[i] || 'BTN ' + i);

  return {
    ACTIONS, PRESETS, RESERVED_KEYS, RESERVED_PAD,
    get keys() { return keys; }, get pad() { return pad; },
    keyName, padName,
    /** code → action map used by the game's input */
    keyMap() { const m = {}; ACTIONS.forEach(([a]) => keys[a].forEach(c => { if (c) m[c] = a; })); return m; },
    padMap() { const m = {}; ACTIONS.forEach(([a]) => pad[a].forEach(b => { if (b !== null && b !== undefined) m[b] = a; })); return m; },
    /** label for on-screen prompts, e.g. label('jump') → "SPACE" */
    label(a, device) {
      if (device === 'pad') return padName(pad[a].find(b => b !== null && b !== undefined));
      return keyName(keys[a].find(Boolean));
    },
    /** bind a key; returns the action it was taken from (or null) */
    setKey(a, slot, code) {
      let stolen = null;
      ACTIONS.forEach(([b]) => keys[b].forEach((c, i) => { if (c === code && !(b === a && i === slot)) { keys[b][i] = null; stolen = b; } }));
      keys[a][slot] = code; save(); return stolen;
    },
    setPad(a, slot, btn) {
      let stolen = null;
      ACTIONS.forEach(([b]) => pad[b].forEach((c, i) => { if (c === btn && !(b === a && i === slot)) { pad[b][i] = null; stolen = b; } }));
      pad[a][slot] = btn; save(); return stolen;
    },
    clearKey(a, slot) { keys[a][slot] = null; save(); },
    clearPad(a, slot) { pad[a][slot] = null; save(); },
    applyPreset(name) { keys = Object.assign(clone(DEFAULT_KEYS), clone(PRESETS[name])); save(); },
    resetKeys() { keys = clone(DEFAULT_KEYS); save(); },
    resetPad() { pad = clone(DEFAULT_PAD); save(); },
    unbound() { return ACTIONS.filter(([a]) => !keys[a].some(Boolean)).map(([, n]) => n); },
    actionName(a) { const f = ACTIONS.find(([x]) => x === a); return f ? f[1] : a; },
    /** fill every element with data-act="jump" etc. with the current key name */
    applyLabels(root = document) { root.querySelectorAll('[data-act]').forEach(el => { el.textContent = this.label(el.dataset.act); }); },
    /** replace {jump}-style tokens in a string */
    fmt(s, device) { return s.replace(/\{(\w+)\}/g, (_, a) => keys[a] ? this.label(a, device) : a); },
  };
})();
