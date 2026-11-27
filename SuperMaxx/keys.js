import { cfg, save } from './settings.js?v=20261129f';

// Rebindable controls. cfg.binds holds only the keys a player changed; everything else uses the
// defaults below. Codes are KeyboardEvent.code values, so they don't change with the keyboard layout.

export const ACTIONS = [
  { id: 'fwd', label: 'Move forward', def: 'KeyW' },
  { id: 'back', label: 'Move back', def: 'KeyS' },
  { id: 'left', label: 'Move left', def: 'KeyA' },
  { id: 'right', label: 'Move right', def: 'KeyD' },
  { id: 'jump', label: 'Jump', def: 'Space' },
  { id: 'sprint', label: 'Sprint', def: 'ShiftLeft' },
  { id: 'q', label: 'Ability 1', def: 'KeyQ' },
  { id: 'ability', label: 'Ability 2', def: 'KeyE' },
  { id: 'ult', label: 'Ultimate', def: 'KeyF' },
  { id: 'reload', label: 'Reload', def: 'KeyR' },
  { id: 'spray', label: 'Spray', def: 'KeyT' },
  { id: 'emote', label: 'Emote wheel (hold)', def: 'KeyB' },
  { id: 'board', label: 'Scoreboard (hold)', def: 'Tab' },
];
// keys that always do the same thing and can't be taken
export const FIXED = [['Mouse', 'Aim'], ['Left click', 'Fire'], ['Right click', 'Zoom (hold)'], ['Esc', 'Pause'], ['F3', 'Performance']];
const RESERVED = new Set(['Escape', 'F3']);

export const kb = id => cfg.binds?.[id] || ACTIONS.find(a => a.id === id)?.def;
export const actionOf = code => ACTIONS.find(a => kb(a.id) === code)?.id;

// Set a key. If another action already used it, the two swap so nothing is left unbound.
export function rebind(id, code) {
  if (RESERVED.has(code)) return false;
  const old = kb(id), other = ACTIONS.find(a => a.id !== id && kb(a.id) === code);
  const b = { ...(cfg.binds || {}) };
  b[id] = code;
  if (other) b[other.id] = old;
  for (const a of ACTIONS) if (b[a.id] === a.def) delete b[a.id];          // only keep what differs from the default
  cfg.binds = b; save();
  return true;
}
export function resetBinds() { cfg.binds = {}; save(); }

const NAMES = { Space: 'Space', ShiftLeft: 'L-Shift', ShiftRight: 'R-Shift', ControlLeft: 'L-Ctrl', ControlRight: 'R-Ctrl', AltLeft: 'L-Alt', AltRight: 'R-Alt',
  MetaLeft: 'Cmd', MetaRight: 'R-Cmd', Tab: 'Tab', CapsLock: 'Caps', Enter: 'Enter', Backspace: 'Bksp', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
  Backquote: '`', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Backslash: '\\', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/' };
export function keyLabel(code) {
  if (!code) return '—';
  if (NAMES[code]) return NAMES[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return 'Num ' + code.slice(6);
  return code;
}

// Controller buttons for each action (pad.js presses the action's key for you). While a pad is in
// use, keyOf shows the button instead of the key, in that pad's own symbols.
export const PAD = { jump: 'a', reload: 'x', ult: 'y', emote: 'b', q: 'lb', ability: 'rb', sprint: 'ls', spray: 'up', board: 'back' };
const GLYPHS = {
  xbox: { a: 'A', b: 'B', x: 'X', y: 'Y', lb: 'LB', rb: 'RB', lt: 'LT', rt: 'RT', ls: 'L3', rs: 'R3', back: 'View', start: 'Menu', up: 'D-pad ↑', down: 'D-pad ↓', left: 'D-pad ←', right: 'D-pad →' },
  ps: { a: '✕', b: '○', x: '□', y: '△', lb: 'L1', rb: 'R1', lt: 'L2', rt: 'R2', ls: 'L3', rs: 'R3', back: 'Create', start: 'Options', up: 'D-pad ↑', down: 'D-pad ↓', left: 'D-pad ←', right: 'D-pad →' },
  switch: { a: 'B', b: 'A', x: 'Y', y: 'X', lb: 'L', rb: 'R', lt: 'ZL', rt: 'ZR', ls: 'L-stick', rs: 'R-stick', back: '−', start: '+', up: 'D-pad ↑', down: 'D-pad ↓', left: 'D-pad ←', right: 'D-pad →' },
};
let padOn = false, padKind = 'xbox';
export function setPadLabels(on, kind) { padOn = on; padKind = GLYPHS[kind] ? kind : 'xbox'; }
export const padGlyph = b => GLYPHS[padKind][b] || b;
export const keyOf = id => padOn && PAD[id] ? padGlyph(PAD[id]) : keyLabel(kb(id));
